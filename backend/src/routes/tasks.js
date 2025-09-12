const express = require('express');
const { body, query, validationResult } = require('express-validator');
const Task = require('../models/Task');
const Patient = require('../models/Patient');
const Consultation = require('../models/Consultation');
const User = require('../models/User');
const { authorize, enforceHospitalAccess, auditLog } = require('../middleware/auth');
const { logger } = require('../utils/logger');

const router = express.Router();

// Validation rules
const validateTask = [
  body('patientId')
    .notEmpty()
    .withMessage('Patient ID is required')
    .isMongoId()
    .withMessage('Invalid patient ID'),
  body('assignedToId')
    .notEmpty()
    .withMessage('Assigned user ID is required')
    .isMongoId()
    .withMessage('Invalid assigned user ID'),
  body('consultationId')
    .optional()
    .isMongoId()
    .withMessage('Invalid consultation ID'),
  body('title')
    .notEmpty()
    .withMessage('Task title is required')
    .isLength({ max: 200 })
    .withMessage('Task title cannot exceed 200 characters'),
  body('description')
    .notEmpty()
    .withMessage('Task description is required')
    .isLength({ max: 1000 })
    .withMessage('Task description cannot exceed 1000 characters'),
  body('type')
    .notEmpty()
    .withMessage('Task type is required')
    .isIn(['FOLLOW_UP', 'MEDICATION_REMINDER', 'APPOINTMENT', 'LAB_RESULT', 'REFERRAL', 'GENERAL', 'EMERGENCY'])
    .withMessage('Invalid task type'),
  body('priority')
    .optional()
    .isIn(['LOW', 'MEDIUM', 'HIGH', 'URGENT'])
    .withMessage('Invalid priority'),
  body('dueDate')
    .notEmpty()
    .withMessage('Due date is required')
    .isISO8601()
    .withMessage('Invalid due date format'),
  body('estimatedDuration')
    .optional()
    .isInt({ min: 1, max: 1440 })
    .withMessage('Estimated duration must be between 1 and 1440 minutes'),
  body('category')
    .optional()
    .isLength({ max: 50 })
    .withMessage('Category cannot exceed 50 characters'),
  body('tags')
    .optional()
    .isArray()
    .withMessage('Tags must be an array'),
  body('tags.*')
    .if(body('tags').exists())
    .isLength({ max: 30 })
    .withMessage('Each tag cannot exceed 30 characters'),
  body('recurrence.enabled')
    .optional()
    .isBoolean()
    .withMessage('Recurrence enabled must be a boolean'),
  body('recurrence.pattern')
    .if(body('recurrence.enabled').equals(true))
    .notEmpty()
    .withMessage('Recurrence pattern is required when recurrence is enabled')
    .isIn(['DAILY', 'WEEKLY', 'MONTHLY', 'YEARLY'])
    .withMessage('Invalid recurrence pattern'),
  body('recurrence.interval')
    .if(body('recurrence.enabled').equals(true))
    .optional()
    .isInt({ min: 1 })
    .withMessage('Recurrence interval must be at least 1')
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
    .isIn(['PENDING', 'IN_PROGRESS', 'COMPLETED', 'CANCELLED', 'OVERDUE'])
    .withMessage('Invalid status filter'),
  query('priority')
    .optional()
    .isIn(['LOW', 'MEDIUM', 'HIGH', 'URGENT'])
    .withMessage('Invalid priority filter'),
  query('type')
    .optional()
    .isIn(['FOLLOW_UP', 'MEDICATION_REMINDER', 'APPOINTMENT', 'LAB_RESULT', 'REFERRAL', 'GENERAL', 'EMERGENCY'])
    .withMessage('Invalid type filter'),
  query('assignedToId')
    .optional()
    .isMongoId()
    .withMessage('Invalid assigned user ID'),
  query('patientId')
    .optional()
    .isMongoId()
    .withMessage('Invalid patient ID'),
  query('overdue')
    .optional()
    .isBoolean()
    .withMessage('Overdue must be a boolean'),
  query('sort')
    .optional()
    .isIn(['dueDate', '-dueDate', 'priority', '-priority', 'status', 'createdAt', '-createdAt'])
    .withMessage('Invalid sort field')
];

// GET /api/tasks - Get all tasks
router.get('/', enforceHospitalAccess, validateSearch, async (req, res) => {
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
      priority,
      type,
      assignedToId,
      patientId,
      overdue,
      sort = 'dueDate'
    } = req.query;

    // Build sort object
    const sortObj = {};
    if (sort.startsWith('-')) {
      sortObj[sort.substring(1)] = -1;
    } else {
      sortObj[sort] = 1;
    }

    const options = {
      page: parseInt(page),
      limit: parseInt(limit),
      sort: sortObj,
      status,
      priority,
      type,
      assignedToId,
      patientId,
      overdue: overdue === 'true'
    };

    const result = await Task.getByHospital(req.hospitalId, options);

    res.json({
      success: true,
      data: result
    });

  } catch (error) {
    logger.error('Get tasks error:', error);
    res.status(500).json({
      success: false,
      message: 'Failed to retrieve tasks'
    });
  }
});

// GET /api/tasks/stats - Get task statistics
router.get('/stats', enforceHospitalAccess, [
  query('assignedToId')
    .optional()
    .isMongoId()
    .withMessage('Invalid assigned user ID'),
  query('startDate')
    .optional()
    .isISO8601()
    .withMessage('Invalid start date format'),
  query('endDate')
    .optional()
    .isISO8601()
    .withMessage('Invalid end date format')
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

    const { assignedToId, startDate, endDate } = req.query;
    const stats = await Task.getStats(req.hospitalId, { assignedToId, startDate, endDate });

    res.json({
      success: true,
      data: stats
    });

  } catch (error) {
    logger.error('Get task stats error:', error);
    res.status(500).json({
      success: false,
      message: 'Failed to retrieve task statistics'
    });
  }
});

// GET /api/tasks/my - Get tasks assigned to current user
router.get('/my', enforceHospitalAccess, validateSearch, async (req, res) => {
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
      page = 1,
      limit = 10,
      status,
      priority,
      type,
      overdue,
      sort = 'dueDate'
    } = req.query;

    // Build sort object
    const sortObj = {};
    if (sort.startsWith('-')) {
      sortObj[sort.substring(1)] = -1;
    } else {
      sortObj[sort] = 1;
    }

    const options = {
      page: parseInt(page),
      limit: parseInt(limit),
      sort: sortObj,
      status,
      priority,
      type,
      assignedToId: req.userId,
      overdue: overdue === 'true'
    };

    const result = await Task.getByHospital(req.hospitalId, options);

    res.json({
      success: true,
      data: result
    });

  } catch (error) {
    logger.error('Get my tasks error:', error);
    res.status(500).json({
      success: false,
      message: 'Failed to retrieve your tasks'
    });
  }
});

// GET /api/tasks/:id - Get task by ID
router.get('/:id', enforceHospitalAccess, async (req, res) => {
  try {
    const task = await Task.findOne({
      _id: req.params.id,
      hospitalId: req.hospitalId,
      isActive: true
    })
    .populate('patientId', 'fullName age gender ccNumber phoneNumber')
    .populate('assignedToId', 'firstName lastName role')
    .populate('createdById', 'firstName lastName')
    .populate('consultationId', 'consultationId type status consultationDate');

    if (!task) {
      return res.status(404).json({
        success: false,
        message: 'Task not found'
      });
    }

    res.json({
      success: true,
      data: { task }
    });

  } catch (error) {
    logger.error('Get task error:', error);
    res.status(500).json({
      success: false,
      message: 'Failed to retrieve task'
    });
  }
});

// POST /api/tasks - Create new task
router.post('/', enforceHospitalAccess, validateTask, auditLog('TASK_CREATE'), async (req, res) => {
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

    // Verify patient exists and belongs to the same hospital
    const patient = await Patient.findOne({
      _id: req.body.patientId,
      hospitalId: req.hospitalId,
      isActive: true
    });

    if (!patient) {
      return res.status(404).json({
        success: false,
        message: 'Patient not found'
      });
    }

    // Verify assigned user exists and belongs to the same hospital
    const assignedUser = await User.findOne({
      _id: req.body.assignedToId,
      hospitalId: req.hospitalId,
      isActive: true
    });

    if (!assignedUser) {
      return res.status(404).json({
        success: false,
        message: 'Assigned user not found'
      });
    }

    // Verify consultation exists if provided
    if (req.body.consultationId) {
      const consultation = await Consultation.findOne({
        _id: req.body.consultationId,
        hospitalId: req.hospitalId,
        isActive: true
      });

      if (!consultation) {
        return res.status(404).json({
          success: false,
          message: 'Consultation not found'
        });
      }
    }

    // Create task
    const task = new Task({
      ...req.body,
      hospitalId: req.hospitalId,
      createdById: req.userId
    });

    await task.save();

    // Populate related data for response
    await task.populate([
      { path: 'patientId', select: 'fullName age gender ccNumber' },
      { path: 'assignedToId', select: 'firstName lastName role' },
      { path: 'createdById', select: 'firstName lastName' }
    ]);

    logger.info(`Task created: ${task.taskId}`, {
      taskId: task._id,
      patientId: task.patientId._id,
      assignedToId: task.assignedToId._id,
      createdById: req.userId,
      hospitalId: req.hospitalId
    });

    res.status(201).json({
      success: true,
      message: 'Task created successfully',
      data: { task }
    });

  } catch (error) {
    logger.error('Create task error:', error);

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
      message: 'Failed to create task'
    });
  }
});

// PUT /api/tasks/:id - Update task
router.put('/:id', enforceHospitalAccess, validateTask, auditLog('TASK_UPDATE'), async (req, res) => {
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

    // Find task
    const task = await Task.findOne({
      _id: req.params.id,
      hospitalId: req.hospitalId,
      isActive: true
    });

    if (!task) {
      return res.status(404).json({
        success: false,
        message: 'Task not found'
      });
    }

    // Check if user can update (assigned user, creator, or admin)
    if (req.user.role !== 'ADMIN' && req.user.role !== 'SUPER_ADMIN' && 
        task.assignedToId.toString() !== req.userId.toString() &&
        task.createdById.toString() !== req.userId.toString()) {
      return res.status(403).json({
        success: false,
        message: 'You can only update tasks assigned to you or created by you'
      });
    }

    // Verify patient if being changed
    if (req.body.patientId && req.body.patientId !== task.patientId.toString()) {
      const patient = await Patient.findOne({
        _id: req.body.patientId,
        hospitalId: req.hospitalId,
        isActive: true
      });

      if (!patient) {
        return res.status(404).json({
          success: false,
          message: 'Patient not found'
        });
      }
    }

    // Verify assigned user if being changed
    if (req.body.assignedToId && req.body.assignedToId !== task.assignedToId.toString()) {
      const assignedUser = await User.findOne({
        _id: req.body.assignedToId,
        hospitalId: req.hospitalId,
        isActive: true
      });

      if (!assignedUser) {
        return res.status(404).json({
          success: false,
          message: 'Assigned user not found'
        });
      }
    }

    // Update task
    Object.assign(task, req.body);
    task.syncStatus = 'PENDING';
    await task.save();

    // Populate related data for response
    await task.populate([
      { path: 'patientId', select: 'fullName age gender ccNumber' },
      { path: 'assignedToId', select: 'firstName lastName role' },
      { path: 'createdById', select: 'firstName lastName' }
    ]);

    logger.info(`Task updated: ${task.taskId}`, {
      taskId: task._id,
      updatedBy: req.userId,
      hospitalId: req.hospitalId
    });

    res.json({
      success: true,
      message: 'Task updated successfully',
      data: { task }
    });

  } catch (error) {
    logger.error('Update task error:', error);

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
      message: 'Failed to update task'
    });
  }
});

// PATCH /api/tasks/:id/status - Update task status
router.patch('/:id/status', enforceHospitalAccess, [
  body('status')
    .notEmpty()
    .withMessage('Status is required')
    .isIn(['PENDING', 'IN_PROGRESS', 'COMPLETED', 'CANCELLED', 'OVERDUE'])
    .withMessage('Invalid status'),
  body('actualDuration')
    .optional()
    .isInt({ min: 1 })
    .withMessage('Actual duration must be a positive integer')
], auditLog('TASK_STATUS_UPDATE'), async (req, res) => {
  try {
    const errors = validationResult(req);
    if (!errors.isEmpty()) {
      return res.status(400).json({
        success: false,
        message: 'Validation error',
        errors: errors.array()
      });
    }

    const task = await Task.findOne({
      _id: req.params.id,
      hospitalId: req.hospitalId,
      isActive: true
    });

    if (!task) {
      return res.status(404).json({
        success: false,
        message: 'Task not found'
      });
    }

    // Check if user can update status (assigned user, creator, or admin)
    if (req.user.role !== 'ADMIN' && req.user.role !== 'SUPER_ADMIN' && 
        task.assignedToId.toString() !== req.userId.toString() &&
        task.createdById.toString() !== req.userId.toString()) {
      return res.status(403).json({
        success: false,
        message: 'You can only update tasks assigned to you or created by you'
      });
    }

    const oldStatus = task.status;
    
    // If marking as completed, use the helper method
    if (req.body.status === 'COMPLETED') {
      await task.markCompleted(req.body.actualDuration);
    } else {
      task.status = req.body.status;
      task.syncStatus = 'PENDING';
      if (req.body.actualDuration) {
        task.actualDuration = req.body.actualDuration;
      }
      await task.save();
    }

    logger.info(`Task status updated: ${task.taskId}`, {
      taskId: task._id,
      oldStatus,
      newStatus: req.body.status,
      updatedBy: req.userId
    });

    res.json({
      success: true,
      message: 'Task status updated successfully',
      data: { 
        task: task.getSummary()
      }
    });

  } catch (error) {
    logger.error('Update task status error:', error);
    res.status(500).json({
      success: false,
      message: 'Failed to update task status'
    });
  }
});

// POST /api/tasks/:id/comments - Add comment to task
router.post('/:id/comments', enforceHospitalAccess, [
  body('comment')
    .notEmpty()
    .withMessage('Comment is required')
    .isLength({ max: 500 })
    .withMessage('Comment cannot exceed 500 characters')
], auditLog('TASK_COMMENT_ADD'), async (req, res) => {
  try {
    const errors = validationResult(req);
    if (!errors.isEmpty()) {
      return res.status(400).json({
        success: false,
        message: 'Validation error',
        errors: errors.array()
      });
    }

    const task = await Task.findOne({
      _id: req.params.id,
      hospitalId: req.hospitalId,
      isActive: true
    });

    if (!task) {
      return res.status(404).json({
        success: false,
        message: 'Task not found'
      });
    }

    // Add comment using the helper method
    await task.addComment(req.userId, req.body.comment);

    // Get the updated task with populated comments
    const updatedTask = await Task.findById(task._id)
      .populate('comments.userId', 'firstName lastName');

    res.json({
      success: true,
      message: 'Comment added successfully',
      data: { 
        comments: updatedTask.comments
      }
    });

  } catch (error) {
    logger.error('Add task comment error:', error);
    res.status(500).json({
      success: false,
      message: 'Failed to add comment'
    });
  }
});

// DELETE /api/tasks/:id - Soft delete task
router.delete('/:id', enforceHospitalAccess, authorize('ADMIN', 'SUPER_ADMIN'), auditLog('TASK_DELETE'), async (req, res) => {
  try {
    const task = await Task.findOne({
      _id: req.params.id,
      hospitalId: req.hospitalId,
      isActive: true
    });

    if (!task) {
      return res.status(404).json({
        success: false,
        message: 'Task not found'
      });
    }

    // Soft delete
    task.isActive = false;
    task.syncStatus = 'PENDING';
    await task.save();

    logger.info(`Task deleted: ${task.taskId}`, {
      taskId: task._id,
      deletedBy: req.userId,
      hospitalId: req.hospitalId
    });

    res.json({
      success: true,
      message: 'Task deleted successfully'
    });

  } catch (error) {
    logger.error('Delete task error:', error);
    res.status(500).json({
      success: false,
      message: 'Failed to delete task'
    });
  }
});

// GET /api/tasks/patient/:patientId - Get tasks for a specific patient
router.get('/patient/:patientId', enforceHospitalAccess, async (req, res) => {
  try {
    // Verify patient exists and belongs to the same hospital
    const patient = await Patient.findOne({
      _id: req.params.patientId,
      hospitalId: req.hospitalId,
      isActive: true
    });

    if (!patient) {
      return res.status(404).json({
        success: false,
        message: 'Patient not found'
      });
    }

    const tasks = await Task.find({
      patientId: req.params.patientId,
      hospitalId: req.hospitalId,
      isActive: true
    })
    .sort({ dueDate: 1 })
    .populate('assignedToId', 'firstName lastName')
    .populate('createdById', 'firstName lastName')
    .limit(50); // Limit to recent 50 tasks

    res.json({
      success: true,
      data: {
        patient: patient.getSummary(),
        tasks
      }
    });

  } catch (error) {
    logger.error('Get patient tasks error:', error);
    res.status(500).json({
      success: false,
      message: 'Failed to retrieve patient tasks'
    });
  }
});

module.exports = router;
