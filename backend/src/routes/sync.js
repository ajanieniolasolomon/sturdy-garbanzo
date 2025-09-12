const express = require('express');
const { body, query, validationResult } = require('express-validator');
const SyncQueue = require('../models/SyncQueue');
const Patient = require('../models/Patient');
const Consultation = require('../models/Consultation');
const Task = require('../models/Task');
const User = require('../models/User');
const { authorize, enforceHospitalAccess, auditLog } = require('../middleware/auth');
const { logger } = require('../utils/logger');

const router = express.Router();

// Validation rules
const validateSyncItem = [
  body('entityType')
    .notEmpty()
    .withMessage('Entity type is required')
    .isIn(['PATIENT', 'CONSULTATION', 'TASK', 'USER', 'HOSPITAL'])
    .withMessage('Invalid entity type'),
  body('entityId')
    .notEmpty()
    .withMessage('Entity ID is required'),
  body('operation')
    .notEmpty()
    .withMessage('Operation is required')
    .isIn(['CREATE', 'UPDATE', 'DELETE'])
    .withMessage('Invalid operation'),
  body('data')
    .notEmpty()
    .withMessage('Data is required'),
  body('priority')
    .optional()
    .isIn(['LOW', 'MEDIUM', 'HIGH', 'URGENT'])
    .withMessage('Invalid priority'),
  body('metadata.clientVersion')
    .optional()
    .isLength({ max: 20 })
    .withMessage('Client version cannot exceed 20 characters'),
  body('metadata.deviceId')
    .optional()
    .isLength({ max: 100 })
    .withMessage('Device ID cannot exceed 100 characters')
];

const validateSearch = [
  query('page')
    .optional()
    .isInt({ min: 1 })
    .withMessage('Page must be a positive integer'),
  query('limit')
    .optional()
    .isInt({ min: 1, max: 100 })
    .withMessage('Limit must be between 1 and 100'),
  query('status')
    .optional()
    .isIn(['PENDING', 'PROCESSING', 'COMPLETED', 'FAILED', 'CONFLICT'])
    .withMessage('Invalid status filter'),
  query('entityType')
    .optional()
    .isIn(['PATIENT', 'CONSULTATION', 'TASK', 'USER', 'HOSPITAL'])
    .withMessage('Invalid entity type filter'),
  query('operation')
    .optional()
    .isIn(['CREATE', 'UPDATE', 'DELETE'])
    .withMessage('Invalid operation filter'),
  query('priority')
    .optional()
    .isIn(['LOW', 'MEDIUM', 'HIGH', 'URGENT'])
    .withMessage('Invalid priority filter'),
  query('userId')
    .optional()
    .isMongoId()
    .withMessage('Invalid user ID')
];

// GET /api/sync/queue - Get sync queue items
router.get('/queue', enforceHospitalAccess, validateSearch, async (req, res) => {
  try {
    // Check validation errors
    const errors = validationResult(req);
    if (!errors.isEmpty()) {
      return res.status(400).json({
        success: false,
        message: 'Validation error',
        errors: errors.array()
      });
    }

    const {
      page = 1,
      limit = 10,
      status,
      entityType,
      operation,
      priority,
      userId
    } = req.query;

    const filter = {
      hospitalId: req.hospitalId,
      isActive: true
    };

    if (status) filter.status = status;
    if (entityType) filter.entityType = entityType;
    if (operation) filter.operation = operation;
    if (priority) filter.priority = priority;
    if (userId) filter.userId = userId;

    const skip = (page - 1) * limit;

    const [items, total] = await Promise.all([
      SyncQueue.find(filter)
        .sort({ priority: -1, createdAt: 1 })
        .skip(skip)
        .limit(parseInt(limit))
        .populate('userId', 'firstName lastName')
        .lean(),
      SyncQueue.countDocuments(filter)
    ]);

    res.json({
      success: true,
      data: {
        items,
        pagination: {
          page: parseInt(page),
          limit: parseInt(limit),
          total,
          pages: Math.ceil(total / limit)
        }
      }
    });

  } catch (error) {
    logger.error('Get sync queue error:', error);
    res.status(500).json({
      success: false,
      message: 'Failed to retrieve sync queue'
    });
  }
});

// GET /api/sync/pending - Get pending sync items for processing
router.get('/pending', enforceHospitalAccess, [
  query('limit')
    .optional()
    .isInt({ min: 1, max: 50 })
    .withMessage('Limit must be between 1 and 50'),
  query('entityType')
    .optional()
    .isIn(['PATIENT', 'CONSULTATION', 'TASK', 'USER', 'HOSPITAL'])
    .withMessage('Invalid entity type filter'),
  query('priority')
    .optional()
    .isIn(['LOW', 'MEDIUM', 'HIGH', 'URGENT'])
    .withMessage('Invalid priority filter')
], async (req, res) => {
  try {
    const errors = validationResult(req);
    if (!errors.isEmpty()) {
      return res.status(400).json({
        success: false,
        message: 'Validation error',
        errors: errors.array()
      });
    }

    const {
      limit = 10,
      entityType,
      priority,
      userId
    } = req.query;

    const options = {
      limit: parseInt(limit),
      entityType,
      priority,
      userId
    };

    const items = await SyncQueue.getPending(req.hospitalId, options);

    res.json({
      success: true,
      data: { items }
    });

  } catch (error) {
    logger.error('Get pending sync items error:', error);
    res.status(500).json({
      success: false,
      message: 'Failed to retrieve pending sync items'
    });
  }
});

// GET /api/sync/stats - Get sync statistics
router.get('/stats', enforceHospitalAccess, [
  query('userId')
    .optional()
    .isMongoId()
    .withMessage('Invalid user ID'),
  query('entityType')
    .optional()
    .isIn(['PATIENT', 'CONSULTATION', 'TASK', 'USER', 'HOSPITAL'])
    .withMessage('Invalid entity type filter')
], async (req, res) => {
  try {
    const errors = validationResult(req);
    if (!errors.isEmpty()) {
      return res.status(400).json({
        success: false,
        message: 'Validation error',
        errors: errors.array()
      });
    }

    const { userId, entityType } = req.query;
    const stats = await SyncQueue.getStats(req.hospitalId, { userId, entityType });

    res.json({
      success: true,
      data: stats
    });

  } catch (error) {
    logger.error('Get sync stats error:', error);
    res.status(500).json({
      success: false,
      message: 'Failed to retrieve sync statistics'
    });
  }
});

// POST /api/sync/queue - Add item to sync queue
router.post('/queue', enforceHospitalAccess, validateSyncItem, auditLog('SYNC_QUEUE_ADD'), async (req, res) => {
  try {
    // Check validation errors
    const errors = validationResult(req);
    if (!errors.isEmpty()) {
      return res.status(400).json({
        success: false,
        message: 'Validation error',
        errors: errors.array()
      });
    }

    const {
      entityType,
      entityId,
      operation,
      data,
      priority = 'MEDIUM',
      metadata = {}
    } = req.body;

    // Add request metadata
    const syncMetadata = {
      ...metadata,
      userAgent: req.get('User-Agent'),
      ipAddress: req.ip,
      timestamp: new Date()
    };

    // Create sync queue item
    const syncItem = new SyncQueue({
      hospitalId: req.hospitalId,
      userId: req.userId,
      entityType,
      entityId,
      operation,
      data,
      priority,
      metadata: syncMetadata
    });

    await syncItem.save();

    logger.info(`Sync item queued: ${entityType} ${operation}`, {
      queueId: syncItem.queueId,
      entityType,
      entityId,
      operation,
      userId: req.userId,
      hospitalId: req.hospitalId
    });

    res.status(201).json({
      success: true,
      message: 'Item added to sync queue successfully',
      data: { syncItem: syncItem.getSummary() }
    });

  } catch (error) {
    logger.error('Add to sync queue error:', error);

    if (error.name === 'ValidationError') {
      return res.status(400).json({
        success: false,
        message: 'Validation error',
        errors: Object.values(error.errors).map(err => ({
          field: err.path,
          message: err.message
        }))
      });
    }

    res.status(500).json({
      success: false,
      message: 'Failed to add item to sync queue'
    });
  }
});

// POST /api/sync/batch - Add multiple items to sync queue
router.post('/batch', enforceHospitalAccess, [
  body('items')
    .isArray({ min: 1, max: 50 })
    .withMessage('Items must be an array with 1-50 items'),
  body('items.*.entityType')
    .notEmpty()
    .withMessage('Entity type is required for each item')
    .isIn(['PATIENT', 'CONSULTATION', 'TASK', 'USER', 'HOSPITAL'])
    .withMessage('Invalid entity type'),
  body('items.*.entityId')
    .notEmpty()
    .withMessage('Entity ID is required for each item'),
  body('items.*.operation')
    .notEmpty()
    .withMessage('Operation is required for each item')
    .isIn(['CREATE', 'UPDATE', 'DELETE'])
    .withMessage('Invalid operation'),
  body('items.*.data')
    .notEmpty()
    .withMessage('Data is required for each item')
], auditLog('SYNC_BATCH_ADD'), async (req, res) => {
  try {
    const errors = validationResult(req);
    if (!errors.isEmpty()) {
      return res.status(400).json({
        success: false,
        message: 'Validation error',
        errors: errors.array()
      });
    }

    const { items } = req.body;
    const syncItems = [];

    // Create all sync items
    for (const item of items) {
      const syncItem = new SyncQueue({
        hospitalId: req.hospitalId,
        userId: req.userId,
        entityType: item.entityType,
        entityId: item.entityId,
        operation: item.operation,
        data: item.data,
        priority: item.priority || 'MEDIUM',
        metadata: {
          ...item.metadata,
          userAgent: req.get('User-Agent'),
          ipAddress: req.ip,
          timestamp: new Date()
        }
      });

      syncItems.push(syncItem);
    }

    // Save all items
    await SyncQueue.insertMany(syncItems);

    logger.info(`Batch sync items queued: ${items.length} items`, {
      count: items.length,
      userId: req.userId,
      hospitalId: req.hospitalId
    });

    res.status(201).json({
      success: true,
      message: `${items.length} items added to sync queue successfully`,
      data: { 
        count: items.length,
        items: syncItems.map(item => item.getSummary())
      }
    });

  } catch (error) {
    logger.error('Batch add to sync queue error:', error);
    res.status(500).json({
      success: false,
      message: 'Failed to add items to sync queue'
    });
  }
});

// POST /api/sync/process - Process sync queue items (admin only)
router.post('/process', enforceHospitalAccess, authorize('ADMIN', 'SUPER_ADMIN'), [
  body('limit')
    .optional()
    .isInt({ min: 1, max: 100 })
    .withMessage('Limit must be between 1 and 100')
], auditLog('SYNC_PROCESS'), async (req, res) => {
  try {
    const errors = validationResult(req);
    if (!errors.isEmpty()) {
      return res.status(400).json({
        success: false,
        message: 'Validation error',
        errors: errors.array()
      });
    }

    const { limit = 10 } = req.body;
    const processed = [];
    const failed = [];

    // Get pending items
    const items = await SyncQueue.getPending(req.hospitalId, { limit });

    for (const item of items) {
      try {
        const startTime = Date.now();

        // Mark as processing
        item.status = 'PROCESSING';
        await item.save();

        // Process the item based on entity type and operation
        await processSyncItem(item);

        // Mark as completed
        const processTime = Date.now() - startTime;
        await item.markCompleted(processTime);
        processed.push(item.getSummary());

      } catch (error) {
        logger.error(`Sync processing error for item ${item.queueId}:`, error);
        await item.markFailed(error);
        failed.push({
          item: item.getSummary(),
          error: error.message
        });
      }
    }

    logger.info(`Sync processing completed: ${processed.length} processed, ${failed.length} failed`, {
      processed: processed.length,
      failed: failed.length,
      hospitalId: req.hospitalId,
      processedBy: req.userId
    });

    res.json({
      success: true,
      message: `Sync processing completed: ${processed.length} processed, ${failed.length} failed`,
      data: {
        processed,
        failed,
        summary: {
          totalProcessed: processed.length,
          totalFailed: failed.length
        }
      }
    });

  } catch (error) {
    logger.error('Sync process error:', error);
    res.status(500).json({
      success: false,
      message: 'Failed to process sync queue'
    });
  }
});

// PATCH /api/sync/:id/status - Update sync item status
router.patch('/:id/status', enforceHospitalAccess, authorize('ADMIN', 'SUPER_ADMIN'), [
  body('status')
    .notEmpty()
    .withMessage('Status is required')
    .isIn(['PENDING', 'PROCESSING', 'COMPLETED', 'FAILED', 'CONFLICT'])
    .withMessage('Invalid status')
], auditLog('SYNC_STATUS_UPDATE'), async (req, res) => {
  try {
    const errors = validationResult(req);
    if (!errors.isEmpty()) {
      return res.status(400).json({
        success: false,
        message: 'Validation error',
        errors: errors.array()
      });
    }

    const syncItem = await SyncQueue.findOne({
      _id: req.params.id,
      hospitalId: req.hospitalId,
      isActive: true
    });

    if (!syncItem) {
      return res.status(404).json({
        success: false,
        message: 'Sync item not found'
      });
    }

    const oldStatus = syncItem.status;
    
    if (req.body.status === 'COMPLETED') {
      await syncItem.markCompleted();
    } else if (req.body.status === 'FAILED') {
      await syncItem.markFailed({ message: 'Manually marked as failed' });
    } else {
      syncItem.status = req.body.status;
      await syncItem.save();
    }

    logger.info(`Sync item status updated: ${syncItem.queueId}`, {
      queueId: syncItem.queueId,
      oldStatus,
      newStatus: req.body.status,
      updatedBy: req.userId
    });

    res.json({
      success: true,
      message: 'Sync item status updated successfully',
      data: { syncItem: syncItem.getSummary() }
    });

  } catch (error) {
    logger.error('Update sync status error:', error);
    res.status(500).json({
      success: false,
      message: 'Failed to update sync item status'
    });
  }
});

// POST /api/sync/:id/resolve-conflict - Resolve sync conflict
router.post('/:id/resolve-conflict', enforceHospitalAccess, authorize('ADMIN', 'SUPER_ADMIN'), [
  body('strategy')
    .notEmpty()
    .withMessage('Resolution strategy is required')
    .isIn(['SERVER_WINS', 'CLIENT_WINS', 'MERGE', 'MANUAL'])
    .withMessage('Invalid resolution strategy'),
  body('resolution')
    .if(body('strategy').equals('MANUAL'))
    .notEmpty()
    .withMessage('Resolution data is required for manual strategy')
], auditLog('SYNC_CONFLICT_RESOLVE'), async (req, res) => {
  try {
    const errors = validationResult(req);
    if (!errors.isEmpty()) {
      return res.status(400).json({
        success: false,
        message: 'Validation error',
        errors: errors.array()
      });
    }

    const syncItem = await SyncQueue.findOne({
      _id: req.params.id,
      hospitalId: req.hospitalId,
      status: 'CONFLICT',
      isActive: true
    });

    if (!syncItem) {
      return res.status(404).json({
        success: false,
        message: 'Sync conflict not found'
      });
    }

    const { strategy, resolution } = req.body;
    let resolvedData;

    switch (strategy) {
      case 'SERVER_WINS':
        // Keep server data, ignore client changes
        resolvedData = syncItem.originalData;
        break;
      case 'CLIENT_WINS':
        // Use client data
        resolvedData = syncItem.data;
        break;
      case 'MERGE':
        // Merge server and client data (simple merge)
        resolvedData = { ...syncItem.originalData, ...syncItem.data };
        break;
      case 'MANUAL':
        // Use manually provided resolution
        resolvedData = resolution;
        break;
    }

    await syncItem.resolveConflict(resolvedData, req.userId, strategy);

    logger.info(`Sync conflict resolved: ${syncItem.queueId}`, {
      queueId: syncItem.queueId,
      strategy,
      resolvedBy: req.userId
    });

    res.json({
      success: true,
      message: 'Sync conflict resolved successfully',
      data: { syncItem: syncItem.getSummary() }
    });

  } catch (error) {
    logger.error('Resolve sync conflict error:', error);
    res.status(500).json({
      success: false,
      message: 'Failed to resolve sync conflict'
    });
  }
});

// DELETE /api/sync/cleanup - Cleanup old completed sync items
router.delete('/cleanup', authorize('ADMIN', 'SUPER_ADMIN'), [
  body('daysOld')
    .optional()
    .isInt({ min: 1, max: 365 })
    .withMessage('Days old must be between 1 and 365')
], auditLog('SYNC_CLEANUP'), async (req, res) => {
  try {
    const errors = validationResult(req);
    if (!errors.isEmpty()) {
      return res.status(400).json({
        success: false,
        message: 'Validation error',
        errors: errors.array()
      });
    }

    const { daysOld = 30 } = req.body;
    const deletedCount = await SyncQueue.cleanup(daysOld);

    logger.info(`Sync cleanup completed: ${deletedCount} items removed`, {
      deletedCount,
      daysOld,
      cleanedBy: req.userId
    });

    res.json({
      success: true,
      message: `Cleanup completed: ${deletedCount} old sync items removed`,
      data: { deletedCount }
    });

  } catch (error) {
    logger.error('Sync cleanup error:', error);
    res.status(500).json({
      success: false,
      message: 'Failed to cleanup sync queue'
    });
  }
});

// Helper function to process sync items
async function processSyncItem(item) {
  const { entityType, operation, data, entityId } = item;
  
  let Model;
  switch (entityType) {
    case 'PATIENT':
      Model = Patient;
      break;
    case 'CONSULTATION':
      Model = Consultation;
      break;
    case 'TASK':
      Model = Task;
      break;
    case 'USER':
      Model = User;
      break;
    default:
      throw new Error(`Unsupported entity type: ${entityType}`);
  }

  switch (operation) {
    case 'CREATE':
      const newEntity = new Model(data);
      await newEntity.save();
      break;
      
    case 'UPDATE':
      const existingEntity = await Model.findById(entityId);
      if (!existingEntity) {
        throw new Error(`${entityType} not found for update`);
      }
      
      // Check for conflicts by comparing timestamps
      if (existingEntity.updatedAt > new Date(data.updatedAt)) {
        // Server data is newer, mark as conflict
        await item.markConflict(existingEntity.toObject());
        return;
      }
      
      Object.assign(existingEntity, data);
      await existingEntity.save();
      break;
      
    case 'DELETE':
      const entityToDelete = await Model.findById(entityId);
      if (!entityToDelete) {
        // Already deleted, consider it successful
        return;
      }
      
      if (entityToDelete.isActive !== undefined) {
        // Soft delete
        entityToDelete.isActive = false;
        await entityToDelete.save();
      } else {
        // Hard delete
        await Model.findByIdAndDelete(entityId);
      }
      break;
      
    default:
      throw new Error(`Unsupported operation: ${operation}`);
  }
}

module.exports = router;
