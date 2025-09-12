const jwt = require('jsonwebtoken');
const User = require('../models/User');

// Offline authentication middleware
const offlineAuth = async (req, res, next) => {
  try {
    let token;
    
    // Check for token in headers
    if (req.headers.authorization && req.headers.authorization.startsWith('Bearer')) {
      token = req.headers.authorization.split(' ')[1];
    }
    
    // Check for offline token in headers
    if (req.headers['x-offline-token']) {
      token = req.headers['x-offline-token'];
    }
    
    if (!token) {
      return res.status(401).json({
        success: false,
        message: 'Access denied. No token provided.'
      });
    }
    
    try {
      // Verify the token
      const decoded = jwt.verify(token, process.env.JWT_SECRET);
      
      // Get user from database
      const user = await User.findById(decoded.id).select('+offlineSession.syncToken');
      
      if (!user) {
        return res.status(401).json({
          success: false,
          message: 'Invalid token. User not found.'
        });
      }
      
      if (!user.isActive) {
        return res.status(401).json({
          success: false,
          message: 'Account is deactivated.'
        });
      }
      
      // Check if this is an offline session
      if (req.headers['x-offline-token']) {
        // Validate offline session
        if (!user.validateOfflineSession(token)) {
          return res.status(401).json({
            success: false,
            message: 'Offline session expired. Please login again when online.'
          });
        }
        
        // Update last sync time
        user.offlineSession.lastSync = new Date();
        await user.save();
      }
      
      // Attach user to request
      req.user = user;
      next();
      
    } catch (error) {
      if (error.name === 'JsonWebTokenError') {
        return res.status(401).json({
          success: false,
          message: 'Invalid token.'
        });
      } else if (error.name === 'TokenExpiredError') {
        return res.status(401).json({
          success: false,
          message: 'Token expired.'
        });
      } else {
        throw error;
      }
    }
    
  } catch (error) {
    console.error('Offline auth error:', error);
    res.status(500).json({
      success: false,
      message: 'Server error during authentication.'
    });
  }
};

// Hospital access control middleware
const hospitalAccess = (req, res, next) => {
  try {
    const user = req.user;
    const hospitalId = req.params.hospitalId || req.body.hospitalId || req.query.hospitalId;
    
    if (!hospitalId) {
      return res.status(400).json({
        success: false,
        message: 'Hospital ID is required.'
      });
    }
    
    // Check if user can access this hospital
    if (!user.canAccessHospital(hospitalId)) {
      return res.status(403).json({
        success: false,
        message: 'Access denied. You can only access data from your assigned hospital.'
      });
    }
    
    next();
  } catch (error) {
    console.error('Hospital access error:', error);
    res.status(500).json({
      success: false,
      message: 'Server error during hospital access check.'
    });
  }
};

// Permission-based access control
const requirePermission = (permission) => {
  return (req, res, next) => {
    try {
      const user = req.user;
      
      // SUPER_ADMIN has all permissions
      if (user.role === 'SUPER_ADMIN') {
        return next();
      }
      
      // Check specific permission
      if (!user.permissions[permission]) {
        return res.status(403).json({
          success: false,
          message: `Access denied. You don't have permission to ${permission.replace('can', '').toLowerCase()}.`
        });
      }
      
      next();
    } catch (error) {
      console.error('Permission check error:', error);
      res.status(500).json({
        success: false,
        message: 'Server error during permission check.'
      });
    }
  };
};

// Role-based access control
const requireRole = (...roles) => {
  return (req, res, next) => {
    try {
      const user = req.user;
      
      if (!roles.includes(user.role)) {
        return res.status(403).json({
          success: false,
          message: `Access denied. Required role: ${roles.join(' or ')}`
        });
      }
      
      next();
    } catch (error) {
      console.error('Role check error:', error);
      res.status(500).json({
        success: false,
        message: 'Server error during role check.'
      });
    }
  };
};

module.exports = {
  offlineAuth,
  hospitalAccess,
  requirePermission,
  requireRole
};
