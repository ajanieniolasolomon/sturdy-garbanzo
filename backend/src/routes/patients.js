const express = require('express');
const { body, validationResult, query } = require('express-validator');
const Patient = require('../models/Patient');
const { logger } = require('../utils/logger');
const { authenticateHospital } = require('../middleware/auth');
  const { offlineAuth, hospitalAccess, requirePermission } = require('../middleware/offlineAuth');

const router = express.Router();

// Validation middleware
const validatePatient = [
  body('fullName').trim().isLength({ min: 1, max: 100 }).withMessage('Full name is required and must be less than 100 characters'),
  body('age').isInt({ min: 0, max: 150 }).withMessage('Age must be between 0 and 150'),
  body('gender').isIn(['male', 'female', 'other']).withMessage('Gender must be male, female, or other'),
  body('phoneNumber').optional().matches(/^\+?[\d\s\-\(\)]+$/).withMessage('Please enter a valid phone number'),
  body('ccNumber').trim().isLength({ min: 1, max: 30 }).withMessage('CC Number is required and must be less than 30 characters'),
  body('ccNumber').matches(/^[A-Z0-9\/\-]+$/).withMessage('CC Number can only contain uppercase letters, numbers, slashes, and hyphens'),
  body('address').trim().isLength({ min: 1, max: 200 }).withMessage('Address is required and cannot exceed 200 characters'),
  body('lga').trim().isLength({ min: 1, max: 50 }).withMessage('LGA is required and cannot exceed 50 characters'),
  body('state').trim().isLength({ min: 1, max: 50 }).withMessage('State is required and cannot exceed 50 characters'),
  body('country').isIn(['Nigeria', 'Refugee', 'Others']).withMessage('Country must be Nigeria, Refugee, or Others'),
  body('isActive').optional().isBoolean().withMessage('isActive must be a boolean'),
  body('status').optional().isIn(['active', 'inactive', 'deceased', 'transferred', 'removed']).withMessage('Invalid status')
];

const validateSearch = [
  query('search').optional().trim().isLength({ min: 1 }).withMessage('Search term must not be empty'),
  query('status').optional().isIn(['active', 'inactive', 'deceased', 'transferred', 'removed']).withMessage('Invalid status'),
  query('country').optional().isIn(['Nigeria', 'Refugee', 'Others']).withMessage('Invalid country'),
  query('state').optional().trim().isLength({ min: 1 }).withMessage('State filter must not be empty'),
  query('lga').optional().trim().isLength({ min: 1 }).withMessage('LGA filter must not be empty'),
  query('page').optional().isInt({ min: 1 }).withMessage('Page must be a positive integer'),
  query('limit').optional().isInt({ min: 1, max: 100 }).withMessage('Limit must be between 1 and 100'),
  query('sort').optional().isIn(['fullName', 'createdAt', 'updatedAt', 'age', 'country', 'state', 'lga']).withMessage('Invalid sort field')
];

// GET /api/patients - Get all patients for hospital
router.get('/', authenticateHospital, validateSearch, async (req, res) => {
  try {
    const errors = validationResult(req);
    if (!errors.isEmpty()) {
      return res.status(400).json({
        success: false,
        errors: errors.array()
      });
    }

    const { search, status, country, state, lga, page = 1, limit = 20, sort = 'fullName' } = req.query;
    const hospitalId = req.user.hospitalId;
    
    const options = {
      status,
      country,
      state,
      lga,
      search,
      sort: { [sort]: 1 },
      limit: parseInt(limit),
      skip: (parseInt(page) - 1) * parseInt(limit)
    };

    const patients = await Patient.findByHospital(hospitalId, options);
    const total = await Patient.countDocuments({ hospitalId, isActive: true, status: { $ne: 'removed' } });

    logger.info(`Retrieved ${patients.length} patients for hospital ${hospitalId}`);

    res.json({
      success: true,
      data: patients,
      pagination: {
        page: parseInt(page),
        limit: parseInt(limit),
        total,
        pages: Math.ceil(total / parseInt(limit))
      }
    });
  } catch (error) {
    logger.error('Error retrieving patients:', error);
    res.status(500).json({
      success: false,
      message: 'Internal server error'
    });
  }
});

// GET /api/patients/removed - Get removed patients
router.get('/removed', authenticateHospital, validateSearch, async (req, res) => {
  try {
    const errors = validationResult(req);
    if (!errors.isEmpty()) {
      return res.status(400).json({
        success: false,
        errors: errors.array()
      });
    }

    const { search, page = 1, limit = 20, sort = 'updatedAt' } = req.query;
    const hospitalId = req.user.hospitalId;
    
    const options = {
      search,
      sort: { [sort]: -1 },
      limit: parseInt(limit),
      skip: (parseInt(page) - 1) * parseInt(limit)
    };

    const patients = await Patient.findRemovedPatients(hospitalId, options);
    const total = await Patient.countDocuments({ hospitalId, status: 'removed' });

    logger.info(`Retrieved ${patients.length} removed patients for hospital ${hospitalId}`);

    res.json({
      success: true,
      data: patients,
      pagination: {
        page: parseInt(page),
        limit: parseInt(limit),
        total,
        pages: Math.ceil(total / parseInt(limit))
      }
    });
  } catch (error) {
    logger.error('Error retrieving removed patients:', error);
    res.status(500).json({
      success: false,
      message: 'Internal server error'
    });
  }
});

// GET /api/patients/stats/location - Get location statistics
router.get('/stats/location', authenticateHospital, async (req, res) => {
  try {
    const hospitalId = req.user.hospitalId;
    
    const locationStats = await Patient.getLocationStats(hospitalId);
    const countryDistribution = await Patient.getCountryDistribution(hospitalId);

    logger.info(`Retrieved location stats for hospital ${hospitalId}`);

    res.json({
      success: true,
      data: {
        locationStats,
        countryDistribution
      }
    });
  } catch (error) {
    logger.error('Error retrieving location stats:', error);
    res.status(500).json({
      success: false,
      message: 'Internal server error'
    });
  }
});

// GET /api/patients/:id - Get patient by ID
router.get('/:id', authenticateHospital, async (req, res) => {
  try {
    const { id } = req.params;
    const hospitalId = req.user.hospitalId;

    const patient = await Patient.findOne({ _id: id, hospitalId })
      .populate('lastConsultation')
      .exec();

    if (!patient) {
      return res.status(404).json({
        success: false,
        message: 'Patient not found'
      });
    }

    logger.info(`Retrieved patient ${id} for hospital ${hospitalId}`);

    res.json({
      success: true,
      data: patient
    });
  } catch (error) {
    logger.error('Error retrieving patient:', error);
    res.status(500).json({
      success: false,
      message: 'Internal server error'
    });
  }
});

// POST /api/patients - Create new patient
router.post('/', authenticateHospital, validatePatient, async (req, res) => {
  try {
    const errors = validationResult(req);
    if (!errors.isEmpty()) {
      return res.status(400).json({
        success: false,
        errors: errors.array()
      });
    }

    const hospitalId = req.user.hospitalId;
    const patientData = {
      ...req.body,
      hospitalId
    };

    const patient = new Patient(patientData);
    await patient.save();

    // Emit real-time notification
    const io = req.app.get('io');
    io.to(`hospital-${hospitalId}`).emit('patient:created', {
      type: 'patient:created',
      data: patient.getSummary(),
      timestamp: new Date()
    });

    logger.info(`Created patient ${patient._id} for hospital ${hospitalId}`);

    res.status(201).json({
      success: true,
      message: 'Patient created successfully',
      data: patient
    });
  } catch (error) {
    logger.error('Error creating patient:', error);
    
    if (error.code === 11000) {
      return res.status(400).json({
        success: false,
        message: 'Patient with this CC Number already exists'
      });
    }

    res.status(500).json({
      success: false,
      message: 'Internal server error'
    });
  }
});

// PUT /api/patients/:id - Update patient
router.put('/:id', authenticateHospital, validatePatient, async (req, res) => {
  try {
    const errors = validationResult(req);
    if (!errors.isEmpty()) {
      return res.status(400).json({
        success: false,
        errors: errors.array()
      });
    }

    const { id } = req.params;
    const hospitalId = req.user.hospitalId;

    const patient = await Patient.findOne({ _id: id, hospitalId });
    if (!patient) {
      return res.status(404).json({
        success: false,
        message: 'Patient not found'
      });
    }

    // Update patient data
    Object.assign(patient, req.body);
    await patient.save();

    // Emit real-time notification
    const io = req.app.get('io');
    io.to(`hospital-${hospitalId}`).emit('patient:updated', {
      type: 'patient:updated',
      data: patient.getSummary(),
      timestamp: new Date()
    });

    logger.info(`Updated patient ${id} for hospital ${hospitalId}`);

    res.json({
      success: true,
      message: 'Patient updated successfully',
      data: patient
    });
  } catch (error) {
    logger.error('Error updating patient:', error);
    res.status(500).json({
      success: false,
      message: 'Internal server error'
    });
  }
});

// DELETE /api/patients/:id - Complete system removal
router.delete('/:id', authenticateHospital, async (req, res) => {
  try {
    const { id } = req.params;
    const hospitalId = req.user.hospitalId;

    const patient = await Patient.findOne({ _id: id, hospitalId });
    if (!patient) {
      return res.status(404).json({
        success: false,
        message: 'Patient not found'
      });
    }

    // Complete system removal
    await patient.completeSystemRemoval();

    // Emit real-time notification
    const io = req.app.get('io');
    io.to(`hospital-${hospitalId}`).emit('patient:removed', {
      type: 'patient:removed',
      data: { id: patient._id, patientId: patient.patientId, fullName: patient.fullName },
      timestamp: new Date()
    });

    logger.info(`Patient ${id} completely removed from system for hospital ${hospitalId}`);

    res.json({
      success: true,
      message: 'Patient completely removed from system'
    });
  } catch (error) {
    logger.error('Error removing patient:', error);
    res.status(500).json({
      success: false,
      message: 'Internal server error'
    });
  }
});

// PATCH /api/patients/:id/restore - Restore removed patient
router.patch('/:id/restore', authenticateHospital, async (req, res) => {
  try {
    const { id } = req.params;
    const hospitalId = req.user.hospitalId;

    const patient = await Patient.findOne({ _id: id, hospitalId, status: 'removed' });
    if (!patient) {
      return res.status(404).json({
        success: false,
        message: 'Removed patient not found'
      });
    }

    await patient.restorePatient();

    // Emit real-time notification
    const io = req.app.get('io');
    io.to(`hospital-${hospitalId}`).emit('patient:restored', {
      type: 'patient:restored',
      data: patient.getSummary(),
      timestamp: new Date()
    });

    logger.info(`Restored patient ${id} for hospital ${hospitalId}`);

    res.json({
      success: true,
      message: 'Patient restored successfully',
      data: patient
    });
  } catch (error) {
    logger.error('Error restoring patient:', error);
    res.status(500).json({
      success: false,
      message: 'Internal server error'
    });
  }
});

// DELETE /api/patients/cleanup/removed - Permanently delete old removed patients
router.delete('/cleanup/removed', authenticateHospital, async (req, res) => {
  try {
    const { daysOld = 30 } = req.query;
    const hospitalId = req.user.hospitalId;

    const deletedCount = await Patient.permanentlyDeleteRemoved(hospitalId, parseInt(daysOld));

    logger.info(`Permanently deleted ${deletedCount} removed patients older than ${daysOld} days for hospital ${hospitalId}`);

    res.json({
      success: true,
      message: `Permanently deleted ${deletedCount} removed patients older than ${daysOld} days`,
      deletedCount
    });
  } catch (error) {
    logger.error('Error cleaning up removed patients:', error);
    res.status(500).json({
      success: false,
      message: 'Internal server error'
    });
  }
});

// GET /api/patients/:id/consultations - Get patient consultations
router.get('/:id/consultations', authenticateHospital, async (req, res) => {
  try {
    const { id } = req.params;
    const hospitalId = req.user.hospitalId;

    const patient = await Patient.findOne({ _id: id, hospitalId });
    if (!patient) {
      return res.status(404).json({
        success: false,
        message: 'Patient not found'
      });
    }

    // This would typically populate consultations from a separate collection
    // For now, return patient with consultation info
    res.json({
      success: true,
      data: {
        patient: patient.getSummary(),
        consultations: [] // Would be populated from Consultation model
      }
    });
  } catch (error) {
    logger.error('Error retrieving patient consultations:', error);
    res.status(500).json({
      success: false,
      message: 'Internal server error'
    });
  }
});

// Route to update patient statuses based on time in system
router.post('/update-statuses', authenticateToken, async (req, res) => {
  try {
    const now = new Date();
    const oneMonthAgo = new Date(now);
    oneMonthAgo.setMonth(oneMonthAgo.getMonth() - 1);

    // Find patients who should be updated to 'on_treatment'
    const patientsToUpdate = await Patient.find({
      status: 'new_case',
      createdAt: { $lte: oneMonthAgo }
    });

    // Update their status
    for (const patient of patientsToUpdate) {
      patient.status = 'on_treatment';
      await patient.save();
    }

    res.json({
      success: true,
      message: `Updated ${patientsToUpdate.length} patients to 'on_treatment' status`,
      updatedCount: patientsToUpdate.length
    });
  } catch (error) {
    console.error('Error updating patient statuses:', error);
    res.status(500).json({ success: false, message: 'Error updating patient statuses' });
  }
});

// Route to manually set patient status
router.patch('/:id/status', authenticateToken, validateObjectId, async (req, res) => {
  try {
    const { status } = req.body;
    const { id } = req.params;

    const patient = await Patient.findById(id);
    if (!patient) {
      return res.status(404).json({ success: false, message: 'Patient not found' });
    }

    // Validate the new status
    const validStatuses = ['dead', 'stopped', 'loss_to_follow_up', 'restarted', 'transferred_out', 'transferred_in'];
    if (!validStatuses.includes(status)) {
      return res.status(400).json({ 
        success: false, 
        message: 'Invalid status. Only manual statuses are allowed.' 
      });
    }

    // Update the status
    patient.status = status;
    await patient.save();

    res.json({
      success: true,
      message: 'Patient status updated successfully',
      patient: {
        id: patient._id,
        fullName: patient.fullName,
        status: patient.status,
        updatedAt: patient.updatedAt
      }
    });
  } catch (error) {
    console.error('Error updating patient status:', error);
    res.status(500).json({ success: false, message: 'Error updating patient status' });
  }
});

module.exports = router;
