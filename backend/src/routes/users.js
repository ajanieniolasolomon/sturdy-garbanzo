const express = require('express');
const { body, query, validationResult } = require('express-validator');
const User = require('../models/User');
const Hospital = require('../models/Hospital');
const { authorize, enforceHospitalAccess, auditLog } = require('../middleware/auth');
const { logger } = require('../utils/logger');

const router = express.Router();

// Validation rules
const validateUser = [
  body('username')
    .trim()
    .notEmpty()
    .withMessage('Username is required')
    .isLength({ min: 3, max: 50 })
    .withMessage('Username must be between 3 and 50 characters')
    .matches(/^[a-zA-Z0-9_]+$/)
    .withMessage('Username can only contain letters, numbers, and underscores'),
  body('email')
    .trim()
    .isEmail()
    .normalizeEmail()
    .withMessage('Please provide a valid email'),
  body('firstName')
    .trim()
    .notEmpty()
    .withMessage('First name is required')
    .isLength({ max: 50 })
    .withMessage('First name cannot exceed 50 characters'),
  body('lastName')
    .trim()
    .notEmpty()
    .withMessage('Last name is required')
    .isLength({ max: 50 })
    .withMessage('Last name cannot exceed 50 characters'),
  body('role')
    .optional()
    .isIn(['HCW', 'ADMIN', 'SUPER_ADMIN'])
    .withMessage('Role must be HCW, ADMIN, or SUPER_ADMIN'),
  body('hospitalId')
    .optional()
    .isMongoId()
    .withMessage('Invalid hospital ID'),
  body('password')
    .optional()
    .isLength({ min: 6 })
    .withMessage('Password must be at least 6 characters')
    .matches(/^(?=.*[a-z])(?=.*[A-Z])(?=.*\d)/)
    .withMessage('Password must contain at least one lowercase letter, one uppercase letter, and one number')
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
  query('role')
    .optional()
    .isIn(['HCW', 'ADMIN', 'SUPER_ADMIN'])
    .withMessage('Invalid role filter'),
  query('isActive')
    .optional()
    .isBoolean()
    .withMessage('isActive must be a boolean'),
  query('sort')
    .optional()
    .isIn(['firstName', '-firstName', 'lastName', '-lastName', 'username', '-username', 'role', '-role', 'createdAt', '-createdAt', 'lastLogin', '-lastLogin'])
    .withMessage('Invalid sort field')
];

// GET /api/users - Get all users (hospital-filtered)
router.get('/', enforceHospitalAccess, authorize('ADMIN', 'SUPER_ADMIN'), validateSearch, async (req, res) => {
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
      role,
      isActive = true,
      sort = 'firstName'
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
      role,
      isActive: isActive === 'true'
    };

    const result = await User.getByHospital(req.hospitalId, options);

    res.json({
      success: true,
      data: result
    });

  } catch (error) {
    logger.error('Get users error:', error);
    res.status(500).json({
      success: false,
      message: 'Failed to retrieve users'
    });
  }
});

// GET /api/users/stats - Get user role statistics
router.get('/stats', enforceHospitalAccess, authorize('ADMIN', 'SUPER_ADMIN'), async (req, res) => {
  try {
    const stats = await User.getRoleStats(req.hospitalId);

    res.json({
      success: true,
      data: stats
    });

  } catch (error) {
    logger.error('Get user stats error:', error);
    res.status(500).json({
      success: false,
      message: 'Failed to retrieve user statistics'
    });
  }
});

// GET /api/users/:id - Get user by ID
router.get('/:id', enforceHospitalAccess, async (req, res) => {
  try {
    // Regular users can only view their own profile, admins can view any user in their hospital
    if (req.user.role !== 'ADMIN' && req.user.role !== 'SUPER_ADMIN' && 
        req.params.id !== req.userId.toString()) {
      return res.status(403).json({
        success: false,
        message: 'You can only view your own profile'
      });
    }

    const user = await User.findOne({
      _id: req.params.id,
      ...(req.user.role !== 'SUPER_ADMIN' && { hospitalId: req.hospitalId }),
      isActive: true
    }).populate('hospitalId', 'name code type');

    if (!user) {
      return res.status(404).json({
        success: false,
        message: 'User not found'
      });
    }

    res.json({
      success: true,
      data: { user: user.getSummary() }
    });

  } catch (error) {
    logger.error('Get user error:', error);
    res.status(500).json({
      success: false,
      message: 'Failed to retrieve user'
    });
  }
});

// POST /api/users - Create new user
router.post('/', authorize('ADMIN', 'SUPER_ADMIN'), validateUser, auditLog('USER_CREATE'), async (req, res) => {
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

    const { username, email, password, firstName, lastName, role = 'HCW', hospitalId } = req.body;

    // Use current user's hospital if not super admin and hospitalId not provided
    let targetHospitalId = hospitalId;
    if (req.user.role !== 'SUPER_ADMIN') {
      targetHospitalId = req.hospitalId;
    } else if (!hospitalId) {
      return res.status(400).json({
        success: false,
        message: 'Hospital ID is required for super admin'
      });
    }

    // Check if user already exists
    const existingUser = await User.findOne({
      $or: [
        { username },
        { email }
      ]
    });

    if (existingUser) {
      return res.status(409).json({
        success: false,
        message: 'User with this username or email already exists'
      });
    }

    // Verify hospital exists
    const hospital = await Hospital.findById(targetHospitalId);
    if (!hospital || !hospital.isActive) {
      return res.status(400).json({
        success: false,
        message: 'Invalid hospital ID'
      });
    }

    // Only super admin can create super admin users
    if (role === 'SUPER_ADMIN' && req.user.role !== 'SUPER_ADMIN') {
      return res.status(403).json({
        success: false,
        message: 'Only super admin can create super admin users'
      });
    }

    // Create new user
    const user = new User({
      username,
      email,
      password: password || 'TempPassword123!', // Temporary password if not provided
      firstName,
      lastName,
      hospitalId: targetHospitalId,
      role
    });

    await user.save();

    // Update hospital statistics
    await hospital.updateStatistics();

    logger.info(`New user created: ${user.username}`, {
      userId: user._id,
      hospitalId: user.hospitalId,
      role: user.role,
      createdBy: req.userId
    });

    res.status(201).json({
      success: true,
      message: 'User created successfully',
      data: {
        user: user.getSummary(),
        ...(password ? {} : { tempPassword: 'TempPassword123!' })
      }
    });

  } catch (error) {
    logger.error('Create user error:', error);

    if (error.code === 11000) {
      return res.status(409).json({
        success: false,
        message: 'User with this username or email already exists'
      });
    }

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
      message: 'Failed to create user'
    });
  }
});

// PUT /api/users/:id - Update user
router.put('/:id', validateUser, auditLog('USER_UPDATE'), async (req, res) => {
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

    // Find user
    const user = await User.findOne({
      _id: req.params.id,
      ...(req.user.role !== 'SUPER_ADMIN' && { hospitalId: req.hospitalId }),
      isActive: true
    });

    if (!user) {
      return res.status(404).json({
        success: false,
        message: 'User not found'
      });
    }

    // Check permissions
    const canUpdate = req.user.role === 'SUPER_ADMIN' || 
                     req.user.role === 'ADMIN' || 
                     req.params.id === req.userId.toString();

    if (!canUpdate) {
      return res.status(403).json({
        success: false,
        message: 'You can only update your own profile'
      });
    }

    // Regular users can't change their role or hospital
    if (req.user.role !== 'ADMIN' && req.user.role !== 'SUPER_ADMIN') {
      delete req.body.role;
      delete req.body.hospitalId;
    }

    // Only super admin can change super admin role or assign super admin role
    if (req.body.role === 'SUPER_ADMIN' && req.user.role !== 'SUPER_ADMIN') {
      return res.status(403).json({
        success: false,
        message: 'Only super admin can assign super admin role'
      });
    }

    if (user.role === 'SUPER_ADMIN' && req.user.role !== 'SUPER_ADMIN') {
      return res.status(403).json({
        success: false,
        message: 'Only super admin can modify super admin users'
      });
    }

    // Verify hospital if being changed
    if (req.body.hospitalId && req.body.hospitalId !== user.hospitalId.toString()) {
      const hospital = await Hospital.findById(req.body.hospitalId);
      if (!hospital || !hospital.isActive) {
        return res.status(400).json({
          success: false,
          message: 'Invalid hospital ID'
        });
      }
    }

    // Update user
    const { password, ...updateData } = req.body;
    Object.assign(user, updateData);

    // Update password if provided
    if (password) {
      user.password = password; // Will be hashed by pre-save middleware
    }

    await user.save();

    logger.info(`User updated: ${user.username}`, {
      userId: user._id,
      updatedBy: req.userId,
      changes: Object.keys(updateData)
    });

    res.json({
      success: true,
      message: 'User updated successfully',
      data: { user: user.getSummary() }
    });

  } catch (error) {
    logger.error('Update user error:', error);

    if (error.code === 11000) {
      return res.status(409).json({
        success: false,
        message: 'Username or email already exists'
      });
    }

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
      message: 'Failed to update user'
    });
  }
});

// PATCH /api/users/:id/status - Update user active status
router.patch('/:id/status', authorize('ADMIN', 'SUPER_ADMIN'), [
  body('isActive')
    .notEmpty()
    .withMessage('isActive is required')
    .isBoolean()
    .withMessage('isActive must be a boolean')
], auditLog('USER_STATUS_UPDATE'), async (req, res) => {
  try {
    const errors = validationResult(req);
    if (!errors.isEmpty()) {
      return res.status(400).json({
        success: false,
        message: 'Validation error',
        errors: errors.array()
      });
    }

    const user = await User.findOne({
      _id: req.params.id,
      ...(req.user.role !== 'SUPER_ADMIN' && { hospitalId: req.hospitalId })
    });

    if (!user) {
      return res.status(404).json({
        success: false,
        message: 'User not found'
      });
    }

    // Can't deactivate yourself
    if (req.params.id === req.userId.toString() && !req.body.isActive) {
      return res.status(400).json({
        success: false,
        message: 'You cannot deactivate your own account'
      });
    }

    // Only super admin can modify super admin users
    if (user.role === 'SUPER_ADMIN' && req.user.role !== 'SUPER_ADMIN') {
      return res.status(403).json({
        success: false,
        message: 'Only super admin can modify super admin users'
      });
    }

    const oldStatus = user.isActive;
    user.isActive = req.body.isActive;
    
    // Clear refresh token if deactivating
    if (!req.body.isActive) {
      user.refreshToken = null;
    }

    await user.save();

    logger.info(`User status updated: ${user.username}`, {
      userId: user._id,
      oldStatus,
      newStatus: req.body.isActive,
      updatedBy: req.userId
    });

    res.json({
      success: true,
      message: `User ${req.body.isActive ? 'activated' : 'deactivated'} successfully`,
      data: { 
        user: user.getSummary()
      }
    });

  } catch (error) {
    logger.error('Update user status error:', error);
    res.status(500).json({
      success: false,
      message: 'Failed to update user status'
    });
  }
});

// PATCH /api/users/:id/role - Update user role
router.patch('/:id/role', authorize('ADMIN', 'SUPER_ADMIN'), [
  body('role')
    .notEmpty()
    .withMessage('Role is required')
    .isIn(['HCW', 'ADMIN', 'SUPER_ADMIN'])
    .withMessage('Invalid role')
], auditLog('USER_ROLE_UPDATE'), async (req, res) => {
  try {
    const errors = validationResult(req);
    if (!errors.isEmpty()) {
      return res.status(400).json({
        success: false,
        message: 'Validation error',
        errors: errors.array()
      });
    }

    const user = await User.findOne({
      _id: req.params.id,
      ...(req.user.role !== 'SUPER_ADMIN' && { hospitalId: req.hospitalId }),
      isActive: true
    });

    if (!user) {
      return res.status(404).json({
        success: false,
        message: 'User not found'
      });
    }

    // Only super admin can assign or modify super admin role
    if (req.body.role === 'SUPER_ADMIN' && req.user.role !== 'SUPER_ADMIN') {
      return res.status(403).json({
        success: false,
        message: 'Only super admin can assign super admin role'
      });
    }

    if (user.role === 'SUPER_ADMIN' && req.user.role !== 'SUPER_ADMIN') {
      return res.status(403).json({
        success: false,
        message: 'Only super admin can modify super admin users'
      });
    }

    const oldRole = user.role;
    user.role = req.body.role;
    
    // Clear refresh token to force re-login with new permissions
    user.refreshToken = null;
    
    await user.save();

    logger.info(`User role updated: ${user.username}`, {
      userId: user._id,
      oldRole,
      newRole: req.body.role,
      updatedBy: req.userId
    });

    res.json({
      success: true,
      message: 'User role updated successfully',
      data: { 
        user: user.getSummary()
      }
    });

  } catch (error) {
    logger.error('Update user role error:', error);
    res.status(500).json({
      success: false,
      message: 'Failed to update user role'
    });
  }
});

// DELETE /api/users/:id - Soft delete user
router.delete('/:id', authorize('ADMIN', 'SUPER_ADMIN'), auditLog('USER_DELETE'), async (req, res) => {
  try {
    const user = await User.findOne({
      _id: req.params.id,
      ...(req.user.role !== 'SUPER_ADMIN' && { hospitalId: req.hospitalId }),
      isActive: true
    });

    if (!user) {
      return res.status(404).json({
        success: false,
        message: 'User not found'
      });
    }

    // Can't delete yourself
    if (req.params.id === req.userId.toString()) {
      return res.status(400).json({
        success: false,
        message: 'You cannot delete your own account'
      });
    }

    // Only super admin can delete super admin users
    if (user.role === 'SUPER_ADMIN' && req.user.role !== 'SUPER_ADMIN') {
      return res.status(403).json({
        success: false,
        message: 'Only super admin can delete super admin users'
      });
    }

    // Soft delete
    user.isActive = false;
    user.refreshToken = null;
    await user.save();

    logger.info(`User deleted: ${user.username}`, {
      userId: user._id,
      deletedBy: req.userId,
      hospitalId: user.hospitalId
    });

    res.json({
      success: true,
      message: 'User deleted successfully'
    });

  } catch (error) {
    logger.error('Delete user error:', error);
    res.status(500).json({
      success: false,
      message: 'Failed to delete user'
    });
  }
});

// POST /api/users/:id/reset-password - Reset user password (admin only)
router.post('/:id/reset-password', authorize('ADMIN', 'SUPER_ADMIN'), auditLog('USER_PASSWORD_RESET'), async (req, res) => {
  try {
    const user = await User.findOne({
      _id: req.params.id,
      ...(req.user.role !== 'SUPER_ADMIN' && { hospitalId: req.hospitalId }),
      isActive: true
    });

    if (!user) {
      return res.status(404).json({
        success: false,
        message: 'User not found'
      });
    }

    // Only super admin can reset super admin passwords
    if (user.role === 'SUPER_ADMIN' && req.user.role !== 'SUPER_ADMIN') {
      return res.status(403).json({
        success: false,
        message: 'Only super admin can reset super admin passwords'
      });
    }

    // Generate temporary password
    const tempPassword = 'TempPass' + Math.random().toString(36).slice(-8) + '!';
    
    user.password = tempPassword; // Will be hashed by pre-save middleware
    user.refreshToken = null; // Invalidate all sessions
    await user.save();

    logger.info(`Password reset for user: ${user.username}`, {
      userId: user._id,
      resetBy: req.userId
    });

    res.json({
      success: true,
      message: 'Password reset successfully',
      data: {
        tempPassword
      }
    });

  } catch (error) {
    logger.error('Reset user password error:', error);
    res.status(500).json({
      success: false,
      message: 'Failed to reset password'
    });
  }
});

module.exports = router;
