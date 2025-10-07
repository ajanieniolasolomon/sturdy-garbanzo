const { body, param, query, validationResult } = require('express-validator');

// Handle validation errors
const handleValidationErrors = (req, res, next) => {
  const errors = validationResult(req);
  if (!errors.isEmpty()) {
    return res.status(400).json({
      success: false,
      message: 'Validation error',
      errors: errors.array().map(error => ({
        field: error.path,
        message: error.msg,
        value: error.value
      }))
    });
  }
  next();
};

// User validation rules
const validateUser = [
  body('username')
    .trim()
    .isLength({ min: 3, max: 30 })
    .withMessage('Username must be between 3 and 30 characters')
    .matches(/^[a-zA-Z0-9_]+$/)
    .withMessage('Username can only contain letters, numbers, and underscores'),
  
  body('email')
    .isEmail()
    .withMessage('Please provide a valid email address')
    .normalizeEmail(),
  
  body('password')
    .isLength({ min: 8 })
    .withMessage('Password must be at least 8 characters long')
    .matches(/^(?=.*[a-z])(?=.*[A-Z])(?=.*\d)(?=.*[@$!%*?&])[A-Za-z\d@$!%*?&]/)
    .withMessage('Password must contain at least one uppercase letter, one lowercase letter, one number, and one special character'),
  
  body('role')
    .isIn(['HCW', 'ADMIN', 'SUPER_ADMIN'])
    .withMessage('Role must be HCW, ADMIN, or SUPER_ADMIN'),
  
  body('firstName')
    .trim()
    .isLength({ min: 1, max: 50 })
    .withMessage('First name must be between 1 and 50 characters'),
  
  body('lastName')
    .trim()
    .isLength({ min: 1, max: 50 })
    .withMessage('Last name must be between 1 and 50 characters'),
  
  body('hospitalId')
    .optional()
    .isMongoId()
    .withMessage('Hospital ID must be a valid MongoDB ObjectId'),
  
  handleValidationErrors
];

// Hospital validation rules
const validateHospital = [
  body('name')
    .trim()
    .isLength({ min: 1, max: 100 })
    .withMessage('Hospital name must be between 1 and 100 characters'),
  
  body('code')
    .optional()
    .trim()
    .isLength({ max: 20 })
    .withMessage('Hospital code cannot exceed 20 characters')
    .matches(/^[A-Z0-9_]+$/)
    .withMessage('Hospital code can only contain uppercase letters, numbers, and underscores'),
  
  body('address')
    .trim()
    .isLength({ min: 1, max: 200 })
    .withMessage('Address must be between 1 and 200 characters'),
  
  body('phone')
    .optional()
    .matches(/^[\+]?[1-9][\d]{0,15}$/)
    .withMessage('Please provide a valid phone number'),
  
  body('email')
    .optional()
    .isEmail()
    .withMessage('Please provide a valid email address')
    .normalizeEmail(),
  
  body('lga')
    .trim()
    .isLength({ min: 1, max: 50 })
    .withMessage('LGA must be between 1 and 50 characters'),
  
  body('state')
    .trim()
    .isLength({ min: 1, max: 50 })
    .withMessage('State must be between 1 and 50 characters'),
  
  body('country')
    .isIn(['Nigeria', 'Refugee', 'Others'])
    .withMessage('Country must be Nigeria, Refugee, or Others'),
  
  body('capacity')
    .optional()
    .isInt({ min: 0 })
    .withMessage('Capacity must be a non-negative integer'),
  
  handleValidationErrors
];

// Patient validation rules
const validatePatient = [
  body('fullName')
    .trim()
    .isLength({ min: 1, max: 100 })
    .withMessage('Full name must be between 1 and 100 characters'),
  
  body('age')
    .isInt({ min: 0, max: 150 })
    .withMessage('Age must be between 0 and 150'),
  
  body('gender')
    .isIn(['male', 'female', 'other'])
    .withMessage('Gender must be male, female, or other'),
  
  body('ccNumber')
    .trim()
    .isLength({ min: 1, max: 50 })
    .withMessage('CC Number must be between 1 and 50 characters')
    .matches(/^[A-Z0-9/_-]+$/)
    .withMessage('CC Number can only contain uppercase letters, numbers, and special characters'),
  
  body('phoneNumber')
    .optional()
    .matches(/^[\+]?[1-9][\d]{0,15}$/)
    .withMessage('Please provide a valid phone number'),
  
  body('address')
    .trim()
    .isLength({ min: 1, max: 200 })
    .withMessage('Address must be between 1 and 200 characters'),
  
  body('lga')
    .trim()
    .isLength({ min: 1, max: 50 })
    .withMessage('LGA must be between 1 and 50 characters'),
  
  body('state')
    .trim()
    .isLength({ min: 1, max: 50 })
    .withMessage('State must be between 1 and 50 characters'),
  
  body('country')
    .isIn(['Nigeria', 'Refugee', 'Others'])
    .withMessage('Country must be Nigeria, Refugee, or Others'),
  
  body('assignedHCW')
    .isMongoId()
    .withMessage('Assigned HCW must be a valid MongoDB ObjectId'),
  
  body('hospitalId')
    .isMongoId()
    .withMessage('Hospital ID must be a valid MongoDB ObjectId'),
  
  body('note')
    .optional()
    .trim()
    .isLength({ max: 1000 })
    .withMessage('Note cannot exceed 1000 characters'),
  
  body('patient_local_id')
    .optional()
    .trim()
    .isLength({ max: 100 })
    .withMessage('Patient local ID cannot exceed 100 characters'),
  
  body('status')
    .optional()
    .isIn(['new_case', 'on_treatment', 'dead', 'stopped', 'loss_to_follow_up', 'restarted', 'transferred_out', 'transferred_in', 'On Treatment'])
    .withMessage('Status must be a valid status value'),
  
  handleValidationErrors
];

// Consultation validation rules
const validateConsultation = [
  body('patientId')
    .isMongoId()
    .withMessage('Patient ID must be a valid MongoDB ObjectId'),
  
  body('type')
    .isIn(['INITIAL', 'FOLLOW_UP', 'EMERGENCY', 'ROUTINE_CHECK', 'SPECIALIST'])
    .withMessage('Consultation type must be INITIAL, FOLLOW_UP, EMERGENCY, ROUTINE_CHECK, or SPECIALIST'),
  
  body('chiefComplaint')
    .trim()
    .isLength({ min: 1, max: 500 })
    .withMessage('Chief complaint must be between 1 and 500 characters'),
  
  body('diagnosis.primary')
    .trim()
    .isLength({ min: 1, max: 200 })
    .withMessage('Primary diagnosis must be between 1 and 200 characters'),
  
  body('treatment.plan')
    .trim()
    .isLength({ min: 1, max: 1000 })
    .withMessage('Treatment plan must be between 1 and 1000 characters'),
  
  handleValidationErrors
];

// Task validation rules
const validateTask = [
  body('title')
    .trim()
    .isLength({ min: 1, max: 100 })
    .withMessage('Task title must be between 1 and 100 characters'),
  
  body('description')
    .trim()
    .isLength({ min: 1, max: 1000 })
    .withMessage('Task description must be between 1 and 1000 characters'),
  
  body('priority')
    .isIn(['LOW', 'MEDIUM', 'HIGH', 'URGENT'])
    .withMessage('Priority must be LOW, MEDIUM, HIGH, or URGENT'),
  
  body('dueDate')
    .isISO8601()
    .withMessage('Due date must be a valid date')
    .custom((value) => {
      if (new Date(value) <= new Date()) {
        throw new Error('Due date must be in the future');
      }
      return true;
    }),
  
  body('patientId')
    .optional()
    .isMongoId()
    .withMessage('Patient ID must be a valid MongoDB ObjectId'),
  
  handleValidationErrors
];

// MongoDB ObjectId validation
const validateObjectId = (paramName) => [
  param(paramName)
    .isMongoId()
    .withMessage(`${paramName} must be a valid MongoDB ObjectId`),
  handleValidationErrors
];

// Pagination validation
const validatePagination = [
  query('page')
    .optional()
    .isInt({ min: 1 })
    .withMessage('Page must be a positive integer'),
  
  query('limit')
    .optional()
    .isInt({ min: 1, max: 100 })
    .withMessage('Limit must be between 1 and 100'),
  
  handleValidationErrors
];

module.exports = {
  handleValidationErrors,
  validateUser,
  validateHospital,
  validatePatient,
  validateConsultation,
  validateTask,
  validateObjectId,
  validatePagination
};
