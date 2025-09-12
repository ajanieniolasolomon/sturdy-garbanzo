const express = require('express');
const cors = require('cors');
const helmet = require('helmet');
const morgan = require('morgan');
const compression = require('compression');
const cookieParser = require('cookie-parser');
const rateLimit = require('express-rate-limit');
const path = require('path');
require('dotenv').config();

const app = express();

// Trust proxy for rate limiting
app.set('trust proxy', 1);

// Security middleware
app.use(helmet());

// Rate limiting
const limiter = rateLimit({
  windowMs: 15 * 60 * 1000, // 15 minutes
  max: 100, // limit each IP to 100 requests per windowMs
  message: {
    success: false,
    message: 'Too many requests from this IP, please try again later.'
  },
});

app.use('/api/', limiter);

// CORS configuration
app.use(cors({
  origin: ['http://localhost:3000', 'https://ccmis-f6008.web.app'],
  credentials: true
}));

// Body parsing middleware
app.use(express.json({ limit: '10mb' }));
app.use(express.urlencoded({ extended: true, limit: '10mb' }));

// Cookie parser
app.use(cookieParser());

// Compression middleware
app.use(compression());

// Logging middleware
app.use(morgan('dev'));

// Health check endpoint
app.get('/health', (req, res) => {
  res.status(200).json({
    success: true,
    message: 'CCMIS API is running',
    timestamp: new Date().toISOString(),
    environment: process.env.NODE_ENV || 'development'
  });
});

// Mock data for testing
const mockHospitals = [
  {
    _id: '1',
    name: 'Rural Health Center',
    code: 'RHC001',
    address: '123 Main Street, Rural Village',
    phone: '+234 123 456 7890',
    email: 'info@ruralhealthcenter.ng',
    lga: 'Rural Village',
    state: 'Taraba',
    country: 'Nigeria',
    capacity: 50,
    currentPatients: 3,
    staffCount: 5,
    isActive: true,
    createdAt: new Date().toISOString(),
    updatedAt: new Date().toISOString()
  },
  {
    _id: '2',
    name: 'Urban Medical Center',
    code: 'UMC002',
    address: '456 City Avenue, Urban District',
    phone: '+234 234 567 8901',
    email: 'contact@urbanmedical.ng',
    lga: 'Urban District',
    state: 'Lagos',
    country: 'Nigeria',
    capacity: 100,
    currentPatients: 15,
    staffCount: 12,
    isActive: true,
    createdAt: new Date().toISOString(),
    updatedAt: new Date().toISOString()
  }
];

const mockUsers = [
  {
    _id: '1',
    username: 'superadmin',
    email: 'admin@ccmis.org',
    role: 'SUPER_ADMIN',
    firstName: 'Super',
    lastName: 'Admin',
    hospitalId: null,
    isActive: true,
    lastLogin: new Date().toISOString()
  },
  {
    _id: '2',
    username: 'hospitaladmin1',
    email: 'admin@ruralhealthcenter.ng',
    role: 'ADMIN',
    firstName: 'Hospital',
    lastName: 'Admin',
    hospitalId: '1',
    hospitalName: { name: 'Rural Health Center' },
    isActive: true,
    lastLogin: new Date().toISOString()
  },
  {
    _id: '3',
    username: 'hcw001',
    email: 'hcw1@ruralhealthcenter.ng',
    role: 'HCW',
    firstName: 'John',
    lastName: 'Doe',
    hospitalId: '1',
    hospitalName: { name: 'Rural Health Center' },
    isActive: true,
    lastLogin: new Date().toISOString()
  }
];

// Mock authentication middleware
const mockAuth = (req, res, next) => {
  // For demo purposes, set a mock user
  req.user = mockUsers[0]; // Super admin
  next();
};

// API Routes

// Auth routes
app.post('/api/auth/login', (req, res) => {
  const { email, password } = req.body;
  
  // Mock login - accept any email/password for demo
  const user = mockUsers.find(u => u.email === email) || mockUsers[0];
  
  res.json({
    success: true,
    token: 'mock-jwt-token',
    user: {
      id: user._id,
      username: user.username,
      email: user.email,
      role: user.role,
      firstName: user.firstName,
      lastName: user.lastName,
      hospitalId: user.hospitalId,
      hospitalName: user.hospitalName,
      isActive: user.isActive,
      lastLogin: user.lastLogin
    }
  });
});

app.post('/api/auth/register', (req, res) => {
  const { username, email, password, role, firstName, lastName, hospitalId } = req.body;
  
  // Mock registration
  const newUser = {
    _id: (mockUsers.length + 1).toString(),
    username,
    email,
    role: role || 'HCW',
    firstName,
    lastName,
    hospitalId,
    hospitalName: hospitalId ? mockHospitals.find(h => h._id === hospitalId) : null,
    isActive: true,
    lastLogin: new Date().toISOString()
  };
  
  mockUsers.push(newUser);
  
  res.status(201).json({
    success: true,
    token: 'mock-jwt-token',
    user: {
      id: newUser._id,
      username: newUser.username,
      email: newUser.email,
      role: newUser.role,
      firstName: newUser.firstName,
      lastName: newUser.lastName,
      hospitalId: newUser.hospitalId,
      hospitalName: newUser.hospitalName,
      isActive: newUser.isActive,
      lastLogin: newUser.lastLogin
    }
  });
});

app.get('/api/auth/me', mockAuth, (req, res) => {
  res.json({
    success: true,
    user: {
      id: req.user._id,
      username: req.user.username,
      email: req.user.email,
      role: req.user.role,
      firstName: req.user.firstName,
      lastName: req.user.lastName,
      hospitalId: req.user.hospitalId,
      hospitalName: req.user.hospitalName,
      isActive: req.user.isActive,
      lastLogin: req.user.lastLogin
    }
  });
});

// Hospital routes
app.get('/api/hospitals', mockAuth, (req, res) => {
  const { page = 1, limit = 10, search } = req.query;
  
  let filteredHospitals = mockHospitals;
  
  if (search) {
    filteredHospitals = mockHospitals.filter(h => 
      h.name.toLowerCase().includes(search.toLowerCase()) ||
      h.address.toLowerCase().includes(search.toLowerCase()) ||
      h.lga.toLowerCase().includes(search.toLowerCase()) ||
      h.state.toLowerCase().includes(search.toLowerCase())
    );
  }
  
  const startIndex = (page - 1) * limit;
  const endIndex = startIndex + parseInt(limit);
  const paginatedHospitals = filteredHospitals.slice(startIndex, endIndex);
  
  res.json({
    success: true,
    count: paginatedHospitals.length,
    total: filteredHospitals.length,
    data: paginatedHospitals,
    pagination: {
      page: parseInt(page),
      limit: parseInt(limit),
      pages: Math.ceil(filteredHospitals.length / limit)
    }
  });
});

app.get('/api/hospitals/:id', mockAuth, (req, res) => {
  const hospital = mockHospitals.find(h => h._id === req.params.id);
  
  if (!hospital) {
    return res.status(404).json({
      success: false,
      message: 'Hospital not found'
    });
  }
  
  res.json({
    success: true,
    data: hospital
  });
});

app.post('/api/hospitals', mockAuth, (req, res) => {
  const newHospital = {
    _id: (mockHospitals.length + 1).toString(),
    ...req.body,
    isActive: true,
    currentPatients: 0,
    staffCount: 0,
    createdAt: new Date().toISOString(),
    updatedAt: new Date().toISOString()
  };
  
  mockHospitals.push(newHospital);
  
  res.status(201).json({
    success: true,
    message: 'Hospital created successfully',
    data: newHospital
  });
});

app.put('/api/hospitals/:id', mockAuth, (req, res) => {
  const hospitalIndex = mockHospitals.findIndex(h => h._id === req.params.id);
  
  if (hospitalIndex === -1) {
    return res.status(404).json({
      success: false,
      message: 'Hospital not found'
    });
  }
  
  mockHospitals[hospitalIndex] = {
    ...mockHospitals[hospitalIndex],
    ...req.body,
    updatedAt: new Date().toISOString()
  };
  
  res.json({
    success: true,
    message: 'Hospital updated successfully',
    data: mockHospitals[hospitalIndex]
  });
});

app.delete('/api/hospitals/:id', mockAuth, (req, res) => {
  const hospitalIndex = mockHospitals.findIndex(h => h._id === req.params.id);
  
  if (hospitalIndex === -1) {
    return res.status(404).json({
      success: false,
      message: 'Hospital not found'
    });
  }
  
  mockHospitals[hospitalIndex].isActive = false;
  
  res.json({
    success: true,
    message: 'Hospital deleted successfully'
  });
});

// Patient routes (for offline-first functionality)
app.get('/api/patients', mockAuth, (req, res) => {
  const { page = 1, limit = 10, search, hospitalId } = req.query;
  
  // Mock patients data
  const mockPatients = [
    {
      _id: '1',
      fullName: 'Aisha Mohammed',
      age: 45,
      gender: 'female',
      ccNumber: 'CC/FHI/001',
      phoneNumber: '+234801234567',
      address: '123 Main Street',
      lga: 'Rural Village',
      state: 'Taraba',
      country: 'Nigeria',
      notes: 'Hypertension patient',
      status: 'on_treatment',
      assignedHCW: '3',
      hospitalId: '1',
      isActive: true,
      createdAt: new Date().toISOString(),
      updatedAt: new Date().toISOString()
    },
    {
      _id: '2',
      fullName: 'Kemi Adebayo',
      age: 32,
      gender: 'female',
      ccNumber: 'CC/FHI/002',
      phoneNumber: '+234802345678',
      address: '456 Oak Avenue',
      lga: 'Rural Village',
      state: 'Taraba',
      country: 'Nigeria',
      notes: 'Diabetes management',
      status: 'new_case',
      assignedHCW: '3',
      hospitalId: '1',
      isActive: true,
      createdAt: new Date().toISOString(),
      updatedAt: new Date().toISOString()
    }
  ];
  
  let filteredPatients = mockPatients;
  
  // Filter by hospital if user is not super admin
  if (req.user.role !== 'SUPER_ADMIN' && req.user.hospitalId) {
    filteredPatients = mockPatients.filter(p => p.hospitalId === req.user.hospitalId);
  }
  
  // Filter by assigned HCW if user is HCW
  if (req.user.role === 'HCW') {
    filteredPatients = filteredPatients.filter(p => p.assignedHCW === req.user._id);
  }
  
  if (search) {
    filteredPatients = filteredPatients.filter(p => 
      p.fullName.toLowerCase().includes(search.toLowerCase()) ||
      p.ccNumber.toLowerCase().includes(search.toLowerCase()) ||
      p.phoneNumber?.includes(search)
    );
  }
  
  const startIndex = (page - 1) * limit;
  const endIndex = startIndex + parseInt(limit);
  const paginatedPatients = filteredPatients.slice(startIndex, endIndex);
  
  res.json({
    success: true,
    count: paginatedPatients.length,
    total: filteredPatients.length,
    data: paginatedPatients,
    pagination: {
      page: parseInt(page),
      limit: parseInt(limit),
      pages: Math.ceil(filteredPatients.length / limit)
    }
  });
});

app.post('/api/patients', mockAuth, (req, res) => {
  const newPatient = {
    _id: (Date.now()).toString(),
    ...req.body,
    isActive: true,
    createdAt: new Date().toISOString(),
    updatedAt: new Date().toISOString()
  };
  
  res.status(201).json({
    success: true,
    message: 'Patient created successfully',
    data: newPatient
  });
});

// Sync endpoint for offline-first functionality
app.post('/api/sync', mockAuth, (req, res) => {
  const { lastSync, changes } = req.body;
  
  // Mock sync response
  res.json({
    success: true,
    message: 'Sync completed successfully',
    data: {
      lastSync: new Date().toISOString(),
      conflicts: [],
      updates: {
        hospitals: [],
        patients: [],
        users: [],
        consultations: [],
        tasks: []
      }
    }
  });
});

// Get sync status
app.get('/api/sync/status', mockAuth, (req, res) => {
  res.json({
    success: true,
    data: {
      isOnline: true,
      lastSync: new Date().toISOString(),
      pendingChanges: 0,
      conflicts: 0
    }
  });
});

// 404 handler
app.use('*', (req, res) => {
  res.status(404).json({
    success: false,
    message: `Route ${req.originalUrl} not found`
  });
});

// Global error handler
app.use((err, req, res, next) => {
  console.error('Error:', err);
  res.status(err.statusCode || 500).json({
    success: false,
    message: err.message || 'Server Error'
  });
});

const PORT = process.env.PORT || 5000;

app.listen(PORT, () => {
  console.log(`🚀 CCMIS Backend API running on port ${PORT}`);
  console.log(`📊 Health check: http://localhost:${PORT}/health`);
  console.log(`🔐 Login endpoint: http://localhost:${PORT}/api/auth/login`);
  console.log(`🏥 Hospitals endpoint: http://localhost:${PORT}/api/hospitals`);
  console.log('\n=== DEMO CREDENTIALS ===');
  console.log('Email: admin@ccmis.org');
  console.log('Password: any password (demo mode)');
});

module.exports = app;
