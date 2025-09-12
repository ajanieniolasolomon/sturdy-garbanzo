const express = require('express');
const {
  getHospitals,
  getHospital,
  createHospital,
  updateHospital,
  deleteHospital,
  getHospitalStats,
  getHospitalUsers
} = require('../controllers/hospitalController');
const { protect, authorize, checkHospitalAccess } = require('../middleware/auth');
const { validateHospital, validateObjectId, validatePagination } = require('../middleware/validation');

const router = express.Router();

// All routes are protected
router.use(protect);

// Get all hospitals (Admin, Super Admin)
router.get('/', authorize('ADMIN', 'SUPER_ADMIN'), validatePagination, getHospitals);

// Get hospital statistics (Admin, Super Admin)
router.get('/:id/stats', authorize('ADMIN', 'SUPER_ADMIN'), validateObjectId('id'), getHospitalStats);

// Get hospital users (Admin, Super Admin)
router.get('/:id/users', authorize('ADMIN', 'SUPER_ADMIN'), validateObjectId('id'), validatePagination, getHospitalUsers);

// Get single hospital
router.get('/:id', validateObjectId('id'), getHospital);

// Create hospital (Super Admin only)
router.post('/', authorize('SUPER_ADMIN'), validateHospital, createHospital);

// Update hospital (Super Admin only)
router.put('/:id', authorize('SUPER_ADMIN'), validateObjectId('id'), validateHospital, updateHospital);

// Delete hospital (Super Admin only)
router.delete('/:id', authorize('SUPER_ADMIN'), validateObjectId('id'), deleteHospital);

module.exports = router;