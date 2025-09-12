const jwt = require('jsonwebtoken');
const User = require('../models/User');

// Protect routes - require authentication
const protect = async (req, res, next) => {
  try {
    let token;

    // Get token from header
    if (req.headers.authorization && req.headers.authorization.startsWith('Bearer')) {
      token = req.headers.authorization.split(' ')[1];
    }
    // Get token from cookie
    else if (req.cookies.token) {
      token = req.cookies.token;
    }

    // Check if token exists
    if (!token) {
      return res.status(401).json({
        success: false,
        message: 'Access denied. No token provided.'
      });
    }

    try {
      // Verify token
      const decoded = jwt.verify(token, process.env.JWT_SECRET);
      
      // Get user from token
      const user = await User.findById(decoded.id).select('+password');
      
      if (!user) {
        return res.status(401).json({
          success: false,
          message: 'Token is valid but user no longer exists'
        });
      }

      // Check if user is active
      if (!user.isActive) {
      return res.status(401).json({
        success: false,
          message: 'User account has been deactivated'
      });
    }

      // Grant access to protected route
    req.user = user;
    next();
  } catch (error) {
      return res.status(401).json({
        success: false,
        message: 'Invalid token'
      });
    }
  } catch (error) {
    return res.status(500).json({
      success: false,
      message: 'Server error during authentication'
    });
  }
};

// Grant access to specific roles
const authorize = (...roles) => {
  return (req, res, next) => {
    if (!roles.includes(req.user.role)) {
      return res.status(403).json({
        success: false,
        message: `User role ${req.user.role} is not authorized to access this route`
      });
    }
    next();
  };
};

// Check if user can access hospital data
const checkHospitalAccess = (req, res, next) => {
  const user = req.user;
  const hospitalId = req.params.hospitalId || req.body.hospitalId;

  // Super admin can access all hospitals
  if (user.role === 'SUPER_ADMIN') {
    return next();
  }

  // Admin and HCW can only access their own hospital
  if (user.hospitalId.toString() !== hospitalId) {
    return res.status(403).json({
      success: false,
      message: 'Access denied. You can only access data from your assigned hospital.'
    });
  }

  next();
};

// Check if user can access patient data
const checkPatientAccess = async (req, res, next) => {
  try {
    const user = req.user;
    const patientId = req.params.patientId || req.body.patientId;

    // Super admin can access all patients
    if (user.role === 'SUPER_ADMIN') {
      return next();
    }

    // Get patient to check hospital assignment
    const Patient = require('../models/Patient');
    const patient = await Patient.findById(patientId);

    if (!patient) {
      return res.status(404).json({
        success: false,
        message: 'Patient not found'
      });
    }

    // Admin can access all patients in their hospital
    if (user.role === 'ADMIN' && user.hospitalId.toString() === patient.hospitalId.toString()) {
      return next();
    }

    // HCW can only access patients assigned to them
    if (user.role === 'HCW' && user._id.toString() === patient.assignedHCW.toString()) {
      return next();
    }

    return res.status(403).json({
      success: false,
      message: 'Access denied. You can only access patients assigned to you.'
    });
  } catch (error) {
    return res.status(500).json({
      success: false,
      message: 'Server error during patient access check'
    });
  }
};

module.exports = {
  protect,
  authorize,
  checkHospitalAccess,
  checkPatientAccess
};