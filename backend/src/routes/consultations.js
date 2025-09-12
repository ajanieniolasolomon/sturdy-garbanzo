const express = require('express');
const { body, query, validationResult } = require('express-validator');
const Consultation = require('../models/Consultation');
const Patient = require('../models/Patient');
const User = require('../models/User');
const { authorize, enforceHospitalAccess, auditLog } = require('../middleware/auth');
const { logger } = require('../utils/logger');

const router = express.Router();

// Validation rules
const validateConsultation = [
  body('patientId')
    .notEmpty()
    .withMessage('Patient ID is required')
    .isMongoId()
    .withMessage('Invalid patient ID'),
  body('consultationDate')
    .notEmpty()
    .withMessage('Consultation date is required')
    .isISO8601()
    .withMessage('Invalid consultation date format'),
  body('type')
    .notEmpty()
    .withMessage('Consultation type is required')
    .isIn(['INITIAL', 'FOLLOW_UP', 'EMERGENCY', 'ROUTINE_CHECK', 'SPECIALIST'])
    .withMessage('Invalid consultation type'),
  body('status')
    .optional()
    .isIn(['SCHEDULED', 'IN_PROGRESS', 'COMPLETED', 'CANCELLED', 'NO_SHOW'])
    .withMessage('Invalid consultation status'),
  body('chiefComplaint')
    .notEmpty()
    .withMessage('Chief complaint is required')
    .isLength({ max: 500 })
    .withMessage('Chief complaint cannot exceed 500 characters'),
  body('historyOfPresentIllness')
    .optional()
    .isLength({ max: 1000 })
    .withMessage('History of present illness cannot exceed 1000 characters'),
  body('symptoms')
    .optional()
    .isArray()
    .withMessage('Symptoms must be an array'),
  body('symptoms.*.name')
    .if(body('symptoms').exists())
    .notEmpty()
    .withMessage('Symptom name is required')
    .isLength({ max: 100 })
    .withMessage('Symptom name cannot exceed 100 characters'),
  body('vitalSigns.bloodPressure.systolic')
    .optional()
    .isInt({ min: 50, max: 300 })
    .withMessage('Systolic BP must be between 50 and 300'),
  body('vitalSigns.bloodPressure.diastolic')
    .optional()
    .isInt({ min: 30, max: 200 })
    .withMessage('Diastolic BP must be between 30 and 200'),
  body('vitalSigns.heartRate')
    .optional()
    .isInt({ min: 30, max: 250 })
    .withMessage('Heart rate must be between 30 and 250'),
  body('vitalSigns.temperature')
    .optional()
    .isFloat({ min: 30, max: 45 })
    .withMessage('Temperature must be between 30 and 45°C'),
  body('diagnosis.primary')
    .notEmpty()
    .withMessage('Primary diagnosis is required')
    .isLength({ max: 200 })
    .withMessage('Primary diagnosis cannot exceed 200 characters'),
  body('treatment.plan')
    .notEmpty()
    .withMessage('Treatment plan is required')
    .isLength({ max: 1000 })
    .withMessage('Treatment plan cannot exceed 1000 characters')
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
    .isIn(['SCHEDULED', 'IN_PROGRESS', 'COMPLETED', 'CANCELLED', 'NO_SHOW'])
    .withMessage('Invalid status filter'),
  query('type')
    .optional()
    .isIn(['INITIAL', 'FOLLOW_UP', 'EMERGENCY', 'ROUTINE_CHECK', 'SPECIALIST'])
    .withMessage('Invalid type filter'),
  query('patientId')
    .optional()
    .isMongoId()
    .withMessage('Invalid patient ID'),
  query('userId')
    .optional()
    .isMongoId()
    .withMessage('Invalid user ID'),
  query('startDate')
    .optional()
    .isISO8601()
    .withMessage('Invalid start date format'),
  query('endDate')
    .optional()
    .isISO8601()
    .withMessage('Invalid end date format'),
  query('sort')
    .optional()
    .isIn(['consultationDate', '-consultationDate', 'status', 'type', 'createdAt', '-createdAt'])
    .withMessage('Invalid sort field')
];

// GET /api/consultations - Get all consultations
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
      type,
      patientId,
      userId,
      startDate,
      endDate,
      sort = '-consultationDate'
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
      type,
      patientId,
      userId,
      startDate,
      endDate
    };

    const result = await Consultation.getByHospital(req.hospitalId, options);

    res.json({
      success: true,
      data: result
    });

  } catch (error) {
    logger.error('Get consultations error:', error);
    res.status(500).json({
      success: false,
      message: 'Failed to retrieve consultations'
    });
  }
});

// GET /api/consultations/stats - Get consultation statistics
router.get('/stats', enforceHospitalAccess, [
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

    const { startDate, endDate } = req.query;
    const stats = await Consultation.getStats(req.hospitalId, { startDate, endDate });

    res.json({
      success: true,
      data: stats
    });

  } catch (error) {
    logger.error('Get consultation stats error:', error);
    res.status(500).json({
      success: false,
      message: 'Failed to retrieve consultation statistics'
    });
  }
});

// GET /api/consultations/:id - Get consultation by ID
router.get('/:id', enforceHospitalAccess, async (req, res) => {
  try {
    const consultation = await Consultation.findOne({
      _id: req.params.id,
      hospitalId: req.hospitalId,
      isActive: true
    })
    .populate('patientId', 'fullName age gender ccNumber phoneNumber')
    .populate('userId', 'firstName lastName role');

    if (!consultation) {
      return res.status(404).json({
        success: false,
        message: 'Consultation not found'
      });
    }

    res.json({
      success: true,
      data: { consultation }
    });

  } catch (error) {
    logger.error('Get consultation error:', error);
    res.status(500).json({
      success: false,
      message: 'Failed to retrieve consultation'
    });
  }
});

// POST /api/consultations - Create new consultation
router.post('/', enforceHospitalAccess, validateConsultation, auditLog('CONSULTATION_CREATE'), async (req, res) => {
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

    // Create consultation
    const consultation = new Consultation({
      ...req.body,
      hospitalId: req.hospitalId,
      userId: req.userId
    });

    await consultation.save();

    // Populate related data for response
    await consultation.populate([
      { path: 'patientId', select: 'fullName age gender ccNumber' },
      { path: 'userId', select: 'firstName lastName' }
    ]);

    logger.info(`Consultation created: ${consultation.consultationId}`, {
      consultationId: consultation._id,
      patientId: consultation.patientId._id,
      userId: req.userId,
      hospitalId: req.hospitalId
    });

    res.status(201).json({
      success: true,
      message: 'Consultation created successfully',
      data: { consultation }
    });

  } catch (error) {
    logger.error('Create consultation error:', error);

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
      message: 'Failed to create consultation'
    });
  }
});

// PUT /api/consultations/:id - Update consultation
router.put('/:id', enforceHospitalAccess, validateConsultation, auditLog('CONSULTATION_UPDATE'), async (req, res) => {
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

    // Find consultation
    const consultation = await Consultation.findOne({
      _id: req.params.id,
      hospitalId: req.hospitalId,
      isActive: true
    });

    if (!consultation) {
      return res.status(404).json({
        success: false,
        message: 'Consultation not found'
      });
    }

    // Check if user can update (only the assigned user or admin)
    if (req.user.role !== 'ADMIN' && req.user.role !== 'SUPER_ADMIN' && 
        consultation.userId.toString() !== req.userId.toString()) {
      return res.status(403).json({
        success: false,
        message: 'You can only update your own consultations'
      });
    }

    // If patient is being changed, verify it exists and belongs to same hospital
    if (req.body.patientId && req.body.patientId !== consultation.patientId.toString()) {
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

    // Update consultation
    Object.assign(consultation, req.body);
    consultation.syncStatus = 'PENDING';
    await consultation.save();

    // Populate related data for response
    await consultation.populate([
      { path: 'patientId', select: 'fullName age gender ccNumber' },
      { path: 'userId', select: 'firstName lastName' }
    ]);

    logger.info(`Consultation updated: ${consultation.consultationId}`, {
      consultationId: consultation._id,
      updatedBy: req.userId,
      hospitalId: req.hospitalId
    });

    res.json({
      success: true,
      message: 'Consultation updated successfully',
      data: { consultation }
    });

  } catch (error) {
    logger.error('Update consultation error:', error);

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
      message: 'Failed to update consultation'
    });
  }
});

// PATCH /api/consultations/:id/status - Update consultation status
router.patch('/:id/status', enforceHospitalAccess, [
  body('status')
    .notEmpty()
    .withMessage('Status is required')
    .isIn(['SCHEDULED', 'IN_PROGRESS', 'COMPLETED', 'CANCELLED', 'NO_SHOW'])
    .withMessage('Invalid status')
], auditLog('CONSULTATION_STATUS_UPDATE'), async (req, res) => {
  try {
    const errors = validationResult(req);
    if (!errors.isEmpty()) {
      return res.status(400).json({
        success: false,
        message: 'Validation error',
        errors: errors.array()
      });
    }

    const consultation = await Consultation.findOne({
      _id: req.params.id,
      hospitalId: req.hospitalId,
      isActive: true
    });

    if (!consultation) {
      return res.status(404).json({
        success: false,
        message: 'Consultation not found'
      });
    }

    // Check if user can update status
    if (req.user.role !== 'ADMIN' && req.user.role !== 'SUPER_ADMIN' && 
        consultation.userId.toString() !== req.userId.toString()) {
      return res.status(403).json({
        success: false,
        message: 'You can only update your own consultations'
      });
    }

    const oldStatus = consultation.status;
    consultation.status = req.body.status;
    consultation.syncStatus = 'PENDING';

    // If marking as completed, use the helper method
    if (req.body.status === 'COMPLETED') {
      await consultation.markCompleted();
    } else {
      await consultation.save();
    }

    logger.info(`Consultation status updated: ${consultation.consultationId}`, {
      consultationId: consultation._id,
      oldStatus,
      newStatus: req.body.status,
      updatedBy: req.userId
    });

    res.json({
      success: true,
      message: 'Consultation status updated successfully',
      data: { 
        consultation: consultation.getSummary()
      }
    });

  } catch (error) {
    logger.error('Update consultation status error:', error);
    res.status(500).json({
      success: false,
      message: 'Failed to update consultation status'
    });
  }
});

// DELETE /api/consultations/:id - Soft delete consultation
router.delete('/:id', enforceHospitalAccess, authorize('ADMIN', 'SUPER_ADMIN'), auditLog('CONSULTATION_DELETE'), async (req, res) => {
  try {
    const consultation = await Consultation.findOne({
      _id: req.params.id,
      hospitalId: req.hospitalId,
      isActive: true
    });

    if (!consultation) {
      return res.status(404).json({
        success: false,
        message: 'Consultation not found'
      });
    }

    // Soft delete
    consultation.isActive = false;
    consultation.syncStatus = 'PENDING';
    await consultation.save();

    logger.info(`Consultation deleted: ${consultation.consultationId}`, {
      consultationId: consultation._id,
      deletedBy: req.userId,
      hospitalId: req.hospitalId
    });

    res.json({
      success: true,
      message: 'Consultation deleted successfully'
    });

  } catch (error) {
    logger.error('Delete consultation error:', error);
    res.status(500).json({
      success: false,
      message: 'Failed to delete consultation'
    });
  }
});

// GET /api/consultations/patient/:patientId - Get consultations for a specific patient
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

    const consultations = await Consultation.find({
      patientId: req.params.patientId,
      hospitalId: req.hospitalId,
      isActive: true
    })
    .sort({ consultationDate: -1 })
    .populate('userId', 'firstName lastName')
    .limit(50); // Limit to recent 50 consultations

    res.json({
      success: true,
      data: {
        patient: patient.getSummary(),
        consultations
      }
    });

  } catch (error) {
    logger.error('Get patient consultations error:', error);
    res.status(500).json({
      success: false,
      message: 'Failed to retrieve patient consultations'
    });
  }
});

module.exports = router;
