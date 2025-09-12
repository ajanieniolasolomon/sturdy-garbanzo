const Hospital = require('../models/Hospital');
const User = require('../models/User');
const Patient = require('../models/Patient');

// @desc    Get all hospitals
// @route   GET /api/hospitals
// @access  Private (Admin, Super Admin)
const getHospitals = async (req, res) => {
  try {
    const { page = 1, limit = 10, search, state, lga } = req.query;
    const query = { isActive: true };

    // Add search filter
    if (search) {
      query.$or = [
        { name: { $regex: search, $options: 'i' } },
        { address: { $regex: search, $options: 'i' } },
        { lga: { $regex: search, $options: 'i' } },
        { state: { $regex: search, $options: 'i' } }
      ];
    }

    // Add location filters
    if (state) query.state = { $regex: state, $options: 'i' };
    if (lga) query.lga = { $regex: lga, $options: 'i' };

    const hospitals = await Hospital.find(query)
      .select('-__v')
      .sort({ name: 1 })
      .limit(limit * 1)
      .skip((page - 1) * limit);

    const total = await Hospital.countDocuments(query);

    res.status(200).json({
      success: true,
      count: hospitals.length,
      total,
      data: hospitals,
      pagination: {
        page: parseInt(page),
        limit: parseInt(limit),
        pages: Math.ceil(total / limit)
      }
    });
  } catch (error) {
    console.error('Get hospitals error:', error);
    res.status(500).json({
      success: false,
      message: 'Server error retrieving hospitals'
    });
  }
};

// @desc    Get single hospital
// @route   GET /api/hospitals/:id
// @access  Private
const getHospital = async (req, res) => {
  try {
    const hospital = await Hospital.findById(req.params.id);

    if (!hospital) {
      return res.status(404).json({
        success: false,
        message: 'Hospital not found'
      });
    }

    // Get hospital statistics
    const stats = await getHospitalStats(hospital._id);

    res.status(200).json({
      success: true,
      data: {
        ...hospital.toObject(),
        stats
      }
    });
  } catch (error) {
    console.error('Get hospital error:', error);
    res.status(500).json({
      success: false,
      message: 'Server error retrieving hospital'
    });
  }
};

// @desc    Create new hospital
// @route   POST /api/hospitals
// @access  Private (Super Admin)
const createHospital = async (req, res) => {
  try {
    // Check if hospital code already exists
    if (req.body.code) {
      const existingHospital = await Hospital.findOne({
        code: req.body.code.toUpperCase()
      });

      if (existingHospital) {
        return res.status(400).json({
          success: false,
          message: 'Hospital with this code already exists'
        });
      }
    }

    const hospital = await Hospital.create(req.body);

    res.status(201).json({
      success: true,
      message: 'Hospital created successfully',
      data: hospital
    });
  } catch (error) {
    console.error('Create hospital error:', error);
    
    if (error.code === 11000) {
      return res.status(400).json({
        success: false,
        message: 'Hospital with this name or code already exists'
      });
    }

    res.status(500).json({
      success: false,
      message: 'Server error creating hospital'
    });
  }
};

// @desc    Update hospital
// @route   PUT /api/hospitals/:id
// @access  Private (Super Admin)
const updateHospital = async (req, res) => {
  try {
    const hospital = await Hospital.findByIdAndUpdate(
      req.params.id,
      req.body,
      {
        new: true,
        runValidators: true
      }
    );

    if (!hospital) {
      return res.status(404).json({
        success: false,
        message: 'Hospital not found'
      });
    }

    res.status(200).json({
      success: true,
      message: 'Hospital updated successfully',
      data: hospital
    });
  } catch (error) {
    console.error('Update hospital error:', error);
    res.status(500).json({
      success: false,
      message: 'Server error updating hospital'
    });
  }
};

// @desc    Delete hospital
// @route   DELETE /api/hospitals/:id
// @access  Private (Super Admin)
const deleteHospital = async (req, res) => {
  try {
    const hospital = await Hospital.findById(req.params.id);

    if (!hospital) {
      return res.status(404).json({
        success: false,
        message: 'Hospital not found'
      });
    }

    // Check if hospital has users or patients
    const userCount = await User.countDocuments({ hospitalId: hospital._id, isActive: true });
    const patientCount = await Patient.countDocuments({ hospitalId: hospital._id, isActive: true });

    if (userCount > 0 || patientCount > 0) {
      return res.status(400).json({
        success: false,
        message: `Cannot delete hospital. It has ${userCount} active users and ${patientCount} active patients.`
      });
    }

    // Soft delete - set isActive to false
    hospital.isActive = false;
    await hospital.save();

    res.status(200).json({
      success: true,
      message: 'Hospital deleted successfully'
    });
  } catch (error) {
    console.error('Delete hospital error:', error);
    res.status(500).json({
      success: false,
      message: 'Server error deleting hospital'
    });
  }
};

// @desc    Get hospital statistics
// @route   GET /api/hospitals/:id/stats
// @access  Private
const getHospitalStatsEndpoint = async (req, res) => {
  try {
    const hospitalId = req.params.id;
    const stats = await getHospitalStats(hospitalId);

    res.status(200).json({
      success: true,
      data: stats
    });
  } catch (error) {
    console.error('Get hospital stats error:', error);
    res.status(500).json({
      success: false,
      message: 'Server error retrieving hospital statistics'
    });
  }
};

// Helper function to get hospital statistics
const getHospitalStats = async (hospitalId) => {
  try {
    const [
      totalUsers,
      activeUsers,
      totalPatients,
      activePatients,
      newPatients,
      onTreatmentPatients,
      completedConsultations,
      pendingTasks
    ] = await Promise.all([
      User.countDocuments({ hospitalId }),
      User.countDocuments({ hospitalId, isActive: true }),
      Patient.countDocuments({ hospitalId }),
      Patient.countDocuments({ hospitalId, isActive: true }),
      Patient.countDocuments({ hospitalId, status: 'new_case' }),
      Patient.countDocuments({ hospitalId, status: 'on_treatment' }),
      require('../models/Consultation').countDocuments({ hospitalId, status: 'COMPLETED' }),
      require('../models/Task').countDocuments({ hospitalId, status: 'PENDING' })
    ]);

    return {
      users: {
        total: totalUsers,
        active: activeUsers
      },
      patients: {
        total: totalPatients,
        active: activePatients,
        newCases: newPatients,
        onTreatment: onTreatmentPatients
      },
      consultations: {
        completed: completedConsultations
      },
      tasks: {
        pending: pendingTasks
      }
    };
  } catch (error) {
    console.error('Get hospital stats helper error:', error);
    return {};
  }
};

// @desc    Get hospital users
// @route   GET /api/hospitals/:id/users
// @access  Private
const getHospitalUsers = async (req, res) => {
  try {
    const { page = 1, limit = 10, role } = req.query;
    const query = { hospitalId: req.params.id, isActive: true };

    if (role) {
      query.role = role;
    }

    const users = await User.find(query)
      .select('-password -__v')
      .sort({ firstName: 1, lastName: 1 })
      .limit(limit * 1)
      .skip((page - 1) * limit);

    const total = await User.countDocuments(query);

    res.status(200).json({
      success: true,
      count: users.length,
      total,
      data: users,
      pagination: {
        page: parseInt(page),
        limit: parseInt(limit),
        pages: Math.ceil(total / limit)
      }
    });
  } catch (error) {
    console.error('Get hospital users error:', error);
    res.status(500).json({
      success: false,
      message: 'Server error retrieving hospital users'
    });
  }
};

module.exports = {
  getHospitals,
  getHospital,
  createHospital,
  updateHospital,
  deleteHospital,
  getHospitalStats: getHospitalStatsEndpoint,
  getHospitalUsers
};
