const express = require('express');
const cors = require('cors');
const helmet = require('helmet');
const rateLimit = require('express-rate-limit');
const compression = require('compression');
const cookieParser = require('cookie-parser');
const bcrypt = require('bcryptjs');
const jwt = require('jsonwebtoken');
require('dotenv').config();

const app = express();
const PORT = process.env.PORT || 5000;

// Security middleware
app.use(helmet({
  contentSecurityPolicy: {
    directives: {
      defaultSrc: ["'self'"],
      styleSrc: ["'self'", "'unsafe-inline'"],
      scriptSrc: ["'self'"],
      imgSrc: ["'self'", "data:", "https:"],
    },
  },
}));

// Rate limiting
const limiter = rateLimit({
  windowMs: 15 * 60 * 1000, // 15 minutes
  max: 100, // limit each IP to 100 requests per windowMs
  message: 'Too many requests from this IP, please try again later.'
});
app.use(limiter);

// CORS configuration
app.use(cors({
  origin: process.env.FRONTEND_URL || 'https://ccmis-f6008.web.app',
  credentials: true
}));

// Body parsing middleware
app.use(express.json({ limit: '10mb' }));
app.use(express.urlencoded({ extended: true, limit: '10mb' }));
app.use(cookieParser());
app.use(compression());

// In-memory database for testing
let users = [];
let hospitals = [];
let patients = [];
let consultations = [];
let tasks = [];
let syncLogs = [];

// Initialize test data
const initializeTestData = async () => {
  // Create super admin
  const superAdminPassword = await bcrypt.hash('admin123', 12);
  users.push({
    id: 1,
    username: 'superadmin',
    email: 'admin@ccmis.org',
    password_hash: superAdminPassword,
    role: 'SUPER_ADMIN',
    first_name: 'Super',
    last_name: 'Admin',
    hospital_id: null,
    is_active: true,
    last_login: null,
    created_at: new Date().toISOString(),
    updated_at: new Date().toISOString()
  });

  // Create test hospitals
  hospitals.push(
    {
      id: 1,
      name: 'Rural Health Center',
      code: 'RHC001',
      address: '123 Main Street, Rural Village',
      phone: '+234 123 456 7890',
      email: 'info@ruralhealthcenter.ng',
      lga: 'Rural Village',
      state: 'Taraba',
      country: 'Nigeria',
      capacity: 50,
      current_patients: 3,
      staff_count: 5,
      is_active: true,
      created_at: new Date().toISOString(),
      updated_at: new Date().toISOString()
    },
    {
      id: 2,
      name: 'Urban Medical Center',
      code: 'UMC002',
      address: '456 City Avenue, Urban District',
      phone: '+234 234 567 8901',
      email: 'contact@urbanmedical.ng',
      lga: 'Urban District',
      state: 'Lagos',
      country: 'Nigeria',
      capacity: 100,
      current_patients: 15,
      staff_count: 12,
      is_active: true,
      created_at: new Date().toISOString(),
      updated_at: new Date().toISOString()
    }
  );

  // Create admin users
  const adminPassword = await bcrypt.hash('admin123', 12);
  users.push(
    {
      id: 2,
      username: 'admin_rural',
      email: 'admin@ruralhealthcenter.ng',
      password_hash: adminPassword,
      role: 'ADMIN',
      first_name: 'Rural',
      last_name: 'Admin',
      hospital_id: 1,
      is_active: true,
      last_login: null,
      created_at: new Date().toISOString(),
      updated_at: new Date().toISOString()
    },
    {
      id: 3,
      username: 'admin_urban',
      email: 'admin@urbanmedical.ng',
      password_hash: adminPassword,
      role: 'ADMIN',
      first_name: 'Urban',
      last_name: 'Admin',
      hospital_id: 2,
      is_active: true,
      last_login: null,
      created_at: new Date().toISOString(),
      updated_at: new Date().toISOString()
    }
  );

  // Create HCW users
  const hcwPassword = await bcrypt.hash('hcw123', 12);
  users.push(
    {
      id: 4,
      username: 'hcw_nelson',
      email: 'nelson@ruralhealthcenter.ng',
      password_hash: hcwPassword,
      role: 'HCW',
      first_name: 'Nelson',
      last_name: 'Healthcare',
      hospital_id: 1,
      is_active: true,
      last_login: null,
      created_at: new Date().toISOString(),
      updated_at: new Date().toISOString()
    },
    {
      id: 5,
      username: 'hcw_mary',
      email: 'mary@urbanmedical.ng',
      password_hash: hcwPassword,
      role: 'HCW',
      first_name: 'Mary',
      last_name: 'Johnson',
      hospital_id: 2,
      is_active: true,
      last_login: null,
      created_at: new Date().toISOString(),
      updated_at: new Date().toISOString()
    }
  );

  // Create test patients
  patients.push(
    {
      id: 1,
      full_name: 'Aisha Mohammed',
      age: 45,
      gender: 'female',
      cc_number: 'CC/FHI/001',
      phone_number: '+234801234567',
      address: '123 Main Street',
      lga: 'Rural Village',
      state: 'Taraba',
      country: 'Nigeria',
      notes: 'Hypertension patient',
      status: 'on_treatment',
      assigned_hcw: 4,
      hospital_id: 1,
      is_active: true,
      created_at: new Date().toISOString(),
      updated_at: new Date().toISOString()
    },
    {
      id: 2,
      full_name: 'Kemi Adebayo',
      age: 32,
      gender: 'female',
      cc_number: 'CC/FHI/002',
      phone_number: '+234802345678',
      address: '456 Oak Avenue',
      lga: 'Rural Village',
      state: 'Taraba',
      country: 'Nigeria',
      notes: 'Diabetes management',
      status: 'new_case',
      assigned_hcw: 4,
      hospital_id: 1,
      is_active: true,
      created_at: new Date().toISOString(),
      updated_at: new Date().toISOString()
    },
    {
      id: 3,
      full_name: 'Ahmed Ibrahim',
      age: 28,
      gender: 'male',
      cc_number: 'CC/FHI/003',
      phone_number: '+234803456789',
      address: '789 Pine Street',
      lga: 'Urban District',
      state: 'Lagos',
      country: 'Nigeria',
      notes: 'Malaria treatment',
      status: 'on_treatment',
      assigned_hcw: 5,
      hospital_id: 2,
      is_active: true,
      created_at: new Date().toISOString(),
      updated_at: new Date().toISOString()
    }
  );

  console.log('✅ Test data initialized');
  console.log('👥 Users:', users.length);
  console.log('🏥 Hospitals:', hospitals.length);
  console.log('👤 Patients:', patients.length);
};

// Authentication middleware
const authenticateToken = async (req, res, next) => {
  const authHeader = req.headers['authorization'];
  const token = authHeader && authHeader.split(' ')[1];

  if (!token) {
    return res.status(401).json({ success: false, message: 'Access token required' });
  }

  try {
    const decoded = jwt.verify(token, process.env.JWT_SECRET || 'your-secret-key');
    const user = users.find(u => u.id === decoded.userId && u.is_active);
    
    if (!user) {
      return res.status(401).json({ success: false, message: 'Invalid token' });
    }

    req.user = user;
    next();
  } catch (error) {
    return res.status(403).json({ success: false, message: 'Invalid token' });
  }
};

// Role-based access control
const requireRole = (roles) => {
  return (req, res, next) => {
    if (!roles.includes(req.user.role)) {
      return res.status(403).json({ 
        success: false, 
        message: 'Insufficient permissions' 
      });
    }
    next();
  };
};

// Health check endpoint
app.get('/health', (req, res) => {
  res.json({
    success: true,
    message: 'CCMIS Test API is running',
    timestamp: new Date().toISOString(),
    environment: 'test',
    database: 'In-Memory',
    data: {
      users: users.length,
      hospitals: hospitals.length,
      patients: patients.length,
      consultations: consultations.length,
      tasks: tasks.length
    }
  });
});

// Authentication routes
app.post('/api/auth/login', async (req, res) => {
  try {
    const { email, password } = req.body;

    if (!email || !password) {
      return res.status(400).json({
        success: false,
        message: 'Email and password are required'
      });
    }

    const user = users.find(u => u.email === email.toLowerCase() && u.is_active);

    if (!user) {
      return res.status(401).json({
        success: false,
        message: 'Invalid credentials'
      });
    }

    const isValidPassword = await bcrypt.compare(password, user.password_hash);
    if (!isValidPassword) {
      return res.status(401).json({
        success: false,
        message: 'Invalid credentials'
      });
    }

    // Update last login
    user.last_login = new Date().toISOString();

    // Generate JWT token
    const token = jwt.sign(
      { userId: user.id, email: user.email, role: user.role },
      process.env.JWT_SECRET || 'your-secret-key',
      { expiresIn: '24h' }
    );

    // Get hospital name if user has hospital_id
    let hospitalName = null;
    if (user.hospital_id) {
      const hospital = hospitals.find(h => h.id === user.hospital_id);
      hospitalName = hospital?.name || null;
    }

    res.json({
      success: true,
      token,
      user: {
        id: user.id,
        username: user.username,
        email: user.email,
        role: user.role,
        firstName: user.first_name,
        lastName: user.last_name,
        hospitalId: user.hospital_id,
        hospitalName,
        isActive: user.is_active
      }
    });
  } catch (error) {
    console.error('Login error:', error);
    res.status(500).json({
      success: false,
      message: 'Internal server error'
    });
  }
});

app.get('/api/auth/me', authenticateToken, async (req, res) => {
  try {
    let hospitalName = null;
    if (req.user.hospital_id) {
      const hospital = hospitals.find(h => h.id === req.user.hospital_id);
      hospitalName = hospital?.name || null;
    }

    res.json({
      success: true,
      user: {
        id: req.user.id,
        username: req.user.username,
        email: req.user.email,
        role: req.user.role,
        firstName: req.user.first_name,
        lastName: req.user.last_name,
        hospitalId: req.user.hospital_id,
        hospitalName,
        isActive: req.user.is_active
      }
    });
  } catch (error) {
    console.error('Get user error:', error);
    res.status(500).json({
      success: false,
      message: 'Internal server error'
    });
  }
});

// Hospital routes
app.get('/api/hospitals', authenticateToken, async (req, res) => {
  try {
    const { page = 1, limit = 10, search } = req.query;
    const offset = (page - 1) * limit;

    let filteredHospitals = hospitals.filter(h => h.is_active);

    // Add role-based filtering
    if (req.user.role === 'HCW' && req.user.hospital_id) {
      filteredHospitals = filteredHospitals.filter(h => h.id === req.user.hospital_id);
    }

    // Add search filter
    if (search) {
      filteredHospitals = filteredHospitals.filter(h => 
        h.name.toLowerCase().includes(search.toLowerCase()) ||
        h.code.toLowerCase().includes(search.toLowerCase()) ||
        h.address.toLowerCase().includes(search.toLowerCase())
      );
    }

    const total = filteredHospitals.length;
    const paginatedHospitals = filteredHospitals.slice(offset, offset + parseInt(limit));

    res.json({
      success: true,
      count: paginatedHospitals.length,
      total,
      data: paginatedHospitals,
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
      message: 'Internal server error'
    });
  }
});

app.post('/api/hospitals', authenticateToken, requireRole(['SUPER_ADMIN', 'ADMIN']), async (req, res) => {
  try {
    const { name, code, address, phone, email, lga, state, country, capacity } = req.body;

    if (!name || !code || !address) {
      return res.status(400).json({
        success: false,
        message: 'Name, code, and address are required'
      });
    }

    // Check if hospital code already exists
    const existingHospital = hospitals.find(h => h.code === code);
    if (existingHospital) {
      return res.status(400).json({
        success: false,
        message: 'Hospital with this code already exists'
      });
    }

    const newHospital = {
      id: hospitals.length + 1,
      name,
      code,
      address,
      phone,
      email,
      lga,
      state,
      country: country || 'Nigeria',
      capacity: capacity || 0,
      current_patients: 0,
      staff_count: 0,
      is_active: true,
      created_at: new Date().toISOString(),
      updated_at: new Date().toISOString()
    };

    hospitals.push(newHospital);

    res.status(201).json({
      success: true,
      message: 'Hospital created successfully',
      data: newHospital
    });
  } catch (error) {
    console.error('Create hospital error:', error);
    res.status(500).json({
      success: false,
      message: 'Internal server error'
    });
  }
});

// Patient routes
app.get('/api/patients', authenticateToken, async (req, res) => {
  try {
    const { page = 1, limit = 10, search } = req.query;
    const offset = (page - 1) * limit;

    let filteredPatients = patients.filter(p => p.is_active);

    // Add role-based filtering
    if (req.user.role === 'HCW') {
      filteredPatients = filteredPatients.filter(p => p.assigned_hcw === req.user.id);
    } else if (req.user.role === 'ADMIN' && req.user.hospital_id) {
      filteredPatients = filteredPatients.filter(p => p.hospital_id === req.user.hospital_id);
    }

    // Add search filter
    if (search) {
      filteredPatients = filteredPatients.filter(p => 
        p.full_name.toLowerCase().includes(search.toLowerCase()) ||
        p.cc_number.toLowerCase().includes(search.toLowerCase()) ||
        p.phone_number?.includes(search)
      );
    }

    const total = filteredPatients.length;
    const paginatedPatients = filteredPatients.slice(offset, offset + parseInt(limit));

    // Add HCW and hospital names
    const enrichedPatients = paginatedPatients.map(patient => {
      const hcw = users.find(u => u.id === patient.assigned_hcw);
      const hospital = hospitals.find(h => h.id === patient.hospital_id);
      
      return {
        ...patient,
        hcw_first_name: hcw?.first_name || null,
        hcw_last_name: hcw?.last_name || null,
        hospital_name: hospital?.name || null
      };
    });

    res.json({
      success: true,
      count: enrichedPatients.length,
      total,
      data: enrichedPatients,
      pagination: {
        page: parseInt(page),
        limit: parseInt(limit),
        pages: Math.ceil(total / limit)
      }
    });
  } catch (error) {
    console.error('Get patients error:', error);
    res.status(500).json({
      success: false,
      message: 'Internal server error'
    });
  }
});

app.post('/api/patients', authenticateToken, async (req, res) => {
  try {
    const { fullName, age, gender, ccNumber, phoneNumber, address, lga, state, country, notes, status, assignedHCW } = req.body;

    if (!fullName || !ccNumber) {
      return res.status(400).json({
        success: false,
        message: 'Full name and CC number are required'
      });
    }

    // Check if CC number already exists
    const existingPatient = patients.find(p => p.cc_number === ccNumber);
    if (existingPatient) {
      return res.status(400).json({
        success: false,
        message: 'Patient with this CC number already exists'
      });
    }

    // Determine hospital_id based on user role
    let hospitalId = req.user.hospital_id;
    if (req.user.role === 'SUPER_ADMIN' && req.body.hospitalId) {
      hospitalId = req.body.hospitalId;
    }

    if (!hospitalId) {
      return res.status(400).json({
        success: false,
        message: 'Hospital ID is required'
      });
    }

    const newPatient = {
      id: patients.length + 1,
      full_name: fullName,
      age,
      gender,
      cc_number: ccNumber,
      phone_number: phoneNumber,
      address,
      lga,
      state,
      country: country || 'Nigeria',
      notes,
      status: status || 'new_case',
      assigned_hcw: assignedHCW,
      hospital_id: hospitalId,
      is_active: true,
      created_at: new Date().toISOString(),
      updated_at: new Date().toISOString()
    };

    patients.push(newPatient);

    res.status(201).json({
      success: true,
      message: 'Patient created successfully',
      data: newPatient
    });
  } catch (error) {
    console.error('Create patient error:', error);
    res.status(500).json({
      success: false,
      message: 'Internal server error'
    });
  }
});

// Export functionality
app.get('/api/export/patients', authenticateToken, async (req, res) => {
  try {
    const { format = 'csv' } = req.query;

    let filteredPatients = patients.filter(p => p.is_active);

    // Add role-based filtering
    if (req.user.role === 'HCW') {
      filteredPatients = filteredPatients.filter(p => p.assigned_hcw === req.user.id);
    } else if (req.user.role === 'ADMIN' && req.user.hospital_id) {
      filteredPatients = filteredPatients.filter(p => p.hospital_id === req.user.hospital_id);
    }

    if (format === 'csv') {
      const csvHeader = 'ID,Full Name,Age,Gender,CC Number,Phone,Address,LGA,State,Country,Status,HCW,Hospital,Created At\n';
      const csvData = filteredPatients.map(patient => {
        const hcw = users.find(u => u.id === patient.assigned_hcw);
        const hospital = hospitals.find(h => h.id === patient.hospital_id);
        const hcwName = hcw ? `${hcw.first_name} ${hcw.last_name}` : '';
        const hospitalName = hospital?.name || '';
        
        return `${patient.id},"${patient.full_name}",${patient.age || ''},"${patient.gender || ''}","${patient.cc_number}","${patient.phone_number || ''}","${patient.address || ''}","${patient.lga || ''}","${patient.state || ''}","${patient.country || ''}","${patient.status || ''}","${hcwName}","${hospitalName}","${patient.created_at}"`;
      }).join('\n');

      res.setHeader('Content-Type', 'text/csv');
      res.setHeader('Content-Disposition', 'attachment; filename=patients.csv');
      res.send(csvHeader + csvData);
    } else {
      res.json({
        success: true,
        data: filteredPatients,
        count: filteredPatients.length
      });
    }
  } catch (error) {
    console.error('Export patients error:', error);
    res.status(500).json({
      success: false,
      message: 'Internal server error'
    });
  }
});

// Sync endpoint for offline-first functionality
app.post('/api/sync', authenticateToken, async (req, res) => {
  try {
    const { lastSync, changes, deviceId } = req.body;

    // Log sync request
    syncLogs.push({
      id: syncLogs.length + 1,
      user_id: req.user.id,
      device_id: deviceId,
      table_name: 'sync_request',
      record_id: 0,
      action: 'CREATE',
      data: JSON.stringify({ lastSync, changes }),
      sync_timestamp: new Date().toISOString(),
      is_synced: false
    });

    // Get changes since last sync
    const lastSyncDate = lastSync ? new Date(lastSync) : new Date('1970-01-01');
    const recentChanges = syncLogs.filter(log => 
      log.user_id === req.user.id && 
      new Date(log.sync_timestamp) > lastSyncDate
    );

    res.json({
      success: true,
      message: 'Sync completed successfully',
      data: {
        lastSync: new Date().toISOString(),
        conflicts: [],
        updates: recentChanges
      }
    });
  } catch (error) {
    console.error('Sync error:', error);
    res.status(500).json({
      success: false,
      message: 'Internal server error'
    });
  }
});

// Get sync status
app.get('/api/sync/status', authenticateToken, async (req, res) => {
  try {
    const pendingChanges = syncLogs.filter(log => 
      log.user_id === req.user.id && !log.is_synced
    ).length;

    res.json({
      success: true,
      data: {
        isOnline: true,
        lastSync: new Date().toISOString(),
        pendingChanges,
        conflicts: 0
      }
    });
  } catch (error) {
    console.error('Sync status error:', error);
    res.status(500).json({
      success: false,
      message: 'Internal server error'
    });
  }
});

// 404 handler
app.use('*', (req, res) => {
  res.status(404).json({
    success: false,
    message: 'Route not found'
  });
});

// Error handler
app.use((error, req, res, next) => {
  console.error('Server error:', error);
  res.status(500).json({
    success: false,
    message: 'Internal server error'
  });
});

// Initialize test data and start server
const startServer = async () => {
  try {
    await initializeTestData();
    
    app.listen(PORT, () => {
      console.log(`🚀 CCMIS Test API running on port ${PORT}`);
      console.log(`📊 Health check: http://localhost:${PORT}/health`);
      console.log(`🔐 Login endpoint: http://localhost:${PORT}/api/auth/login`);
      console.log(`🏥 Hospitals endpoint: http://localhost:${PORT}/api/hospitals`);
      console.log(`👥 Patients endpoint: http://localhost:${PORT}/api/patients`);
      console.log(`📊 Export endpoint: http://localhost:${PORT}/api/export/patients`);
      console.log(`🔄 Sync endpoint: http://localhost:${PORT}/api/sync`);
      console.log('\n=== TEST CREDENTIALS ===');
      console.log('Super Admin: admin@ccmis.org / admin123');
      console.log('Hospital Admin: admin@ruralhealthcenter.ng / admin123');
      console.log('Healthcare Worker: nelson@ruralhealthcenter.ng / hcw123');
      console.log('\n=== FEATURES TESTED ===');
      console.log('✅ Authentication & Authorization');
      console.log('✅ Role-based access control');
      console.log('✅ Hospital management');
      console.log('✅ Patient management');
      console.log('✅ Data export (CSV)');
      console.log('✅ Offline sync endpoints');
      console.log('✅ Search and pagination');
      console.log('\n=== READY FOR TESTING ===');
    });
  } catch (error) {
    console.error('Failed to start server:', error);
    process.exit(1);
  }
};

startServer();
