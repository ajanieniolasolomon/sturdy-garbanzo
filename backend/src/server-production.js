const express = require('express');
const cors = require('cors');
const helmet = require('helmet');
const rateLimit = require('express-rate-limit');
const compression = require('compression');
const cookieParser = require('cookie-parser');
const { pool, initializeDatabase } = require('./config/database');
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

// Authentication middleware
const authenticateToken = async (req, res, next) => {
  const authHeader = req.headers['authorization'];
  const token = authHeader && authHeader.split(' ')[1];

  if (!token) {
    return res.status(401).json({ success: false, message: 'Access token required' });
  }

  try {
    const decoded = jwt.verify(token, process.env.JWT_SECRET || 'your-secret-key');
    
    // Get user from database
    const result = await pool.query(
      'SELECT id, username, email, role, first_name, last_name, hospital_id, is_active FROM users WHERE id = $1 AND is_active = true',
      [decoded.userId]
    );

    if (result.rows.length === 0) {
      return res.status(401).json({ success: false, message: 'Invalid token' });
    }

    req.user = result.rows[0];
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
    message: 'CCMIS Production API is running',
    timestamp: new Date().toISOString(),
    environment: process.env.NODE_ENV || 'development',
    database: 'PostgreSQL'
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

    // Get user from database
    const result = await pool.query(
      'SELECT id, username, email, password_hash, role, first_name, last_name, hospital_id, is_active FROM users WHERE email = $1 AND is_active = true',
      [email.toLowerCase()]
    );

    if (result.rows.length === 0) {
      return res.status(401).json({
        success: false,
        message: 'Invalid credentials'
      });
    }

    const user = result.rows[0];

    // Verify password
    const isValidPassword = await bcrypt.compare(password, user.password_hash);
    if (!isValidPassword) {
      return res.status(401).json({
        success: false,
        message: 'Invalid credentials'
      });
    }

    // Update last login
    await pool.query(
      'UPDATE users SET last_login = CURRENT_TIMESTAMP WHERE id = $1',
      [user.id]
    );

    // Generate JWT token
    const token = jwt.sign(
      { userId: user.id, email: user.email, role: user.role },
      process.env.JWT_SECRET || 'your-secret-key',
      { expiresIn: '24h' }
    );

    // Get hospital name if user has hospital_id
    let hospitalName = null;
    if (user.hospital_id) {
      const hospitalResult = await pool.query(
        'SELECT name FROM hospitals WHERE id = $1',
        [user.hospital_id]
      );
      hospitalName = hospitalResult.rows[0]?.name || null;
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

app.post('/api/auth/register', authenticateToken, requireRole(['SUPER_ADMIN', 'ADMIN']), async (req, res) => {
  try {
    const { username, email, password, role, firstName, lastName, hospitalId } = req.body;

    // Validate required fields
    if (!username || !email || !password || !role || !firstName || !lastName) {
      return res.status(400).json({
        success: false,
        message: 'All required fields must be provided'
      });
    }

    // Validate role
    if (!['HCW', 'ADMIN', 'SUPER_ADMIN'].includes(role)) {
      return res.status(400).json({
        success: false,
        message: 'Invalid role'
      });
    }

    // Check if user already exists
    const existingUser = await pool.query(
      'SELECT id FROM users WHERE email = $1 OR username = $2',
      [email.toLowerCase(), username]
    );

    if (existingUser.rows.length > 0) {
      return res.status(400).json({
        success: false,
        message: 'User with this email or username already exists'
      });
    }

    // Hash password
    const saltRounds = 12;
    const passwordHash = await bcrypt.hash(password, saltRounds);

    // Create user
    const result = await pool.query(
      `INSERT INTO users (username, email, password_hash, role, first_name, last_name, hospital_id)
       VALUES ($1, $2, $3, $4, $5, $6, $7)
       RETURNING id, username, email, role, first_name, last_name, hospital_id, is_active`,
      [username, email.toLowerCase(), passwordHash, role, firstName, lastName, hospitalId]
    );

    const newUser = result.rows[0];

    // Get hospital name if hospital_id is provided
    let hospitalName = null;
    if (newUser.hospital_id) {
      const hospitalResult = await pool.query(
        'SELECT name FROM hospitals WHERE id = $1',
        [newUser.hospital_id]
      );
      hospitalName = hospitalResult.rows[0]?.name || null;
    }

    res.status(201).json({
      success: true,
      message: 'User created successfully',
      user: {
        id: newUser.id,
        username: newUser.username,
        email: newUser.email,
        role: newUser.role,
        firstName: newUser.first_name,
        lastName: newUser.last_name,
        hospitalId: newUser.hospital_id,
        hospitalName,
        isActive: newUser.is_active
      }
    });
  } catch (error) {
    console.error('Registration error:', error);
    res.status(500).json({
      success: false,
      message: 'Internal server error'
    });
  }
});

app.get('/api/auth/me', authenticateToken, async (req, res) => {
  try {
    // Get hospital name if user has hospital_id
    let hospitalName = null;
    if (req.user.hospital_id) {
      const hospitalResult = await pool.query(
        'SELECT name FROM hospitals WHERE id = $1',
        [req.user.hospital_id]
      );
      hospitalName = hospitalResult.rows[0]?.name || null;
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

    let query = 'SELECT * FROM hospitals WHERE is_active = true';
    let queryParams = [];
    let paramCount = 0;

    // Add search filter
    if (search) {
      paramCount++;
      query += ` AND (name ILIKE $${paramCount} OR code ILIKE $${paramCount} OR address ILIKE $${paramCount})`;
      queryParams.push(`%${search}%`);
    }

    // Add role-based filtering
    if (req.user.role === 'HCW' && req.user.hospital_id) {
      paramCount++;
      query += ` AND id = $${paramCount}`;
      queryParams.push(req.user.hospital_id);
    }

    // Add pagination
    paramCount++;
    query += ` ORDER BY created_at DESC LIMIT $${paramCount}`;
    queryParams.push(limit);

    paramCount++;
    query += ` OFFSET $${paramCount}`;
    queryParams.push(offset);

    const result = await pool.query(query, queryParams);

    // Get total count
    let countQuery = 'SELECT COUNT(*) FROM hospitals WHERE is_active = true';
    let countParams = [];
    let countParamCount = 0;

    if (search) {
      countParamCount++;
      countQuery += ` AND (name ILIKE $${countParamCount} OR code ILIKE $${countParamCount} OR address ILIKE $${countParamCount})`;
      countParams.push(`%${search}%`);
    }

    if (req.user.role === 'HCW' && req.user.hospital_id) {
      countParamCount++;
      countQuery += ` AND id = $${countParamCount}`;
      countParams.push(req.user.hospital_id);
    }

    const countResult = await pool.query(countQuery, countParams);
    const total = parseInt(countResult.rows[0].count);

    res.json({
      success: true,
      count: result.rows.length,
      total,
      data: result.rows,
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
    const existingHospital = await pool.query(
      'SELECT id FROM hospitals WHERE code = $1',
      [code]
    );

    if (existingHospital.rows.length > 0) {
      return res.status(400).json({
        success: false,
        message: 'Hospital with this code already exists'
      });
    }

    const result = await pool.query(
      `INSERT INTO hospitals (name, code, address, phone, email, lga, state, country, capacity)
       VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9)
       RETURNING *`,
      [name, code, address, phone, email, lga, state, country || 'Nigeria', capacity || 0]
    );

    res.status(201).json({
      success: true,
      message: 'Hospital created successfully',
      data: result.rows[0]
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

    let query = `
      SELECT p.*, u.first_name as hcw_first_name, u.last_name as hcw_last_name, h.name as hospital_name
      FROM patients p
      LEFT JOIN users u ON p.assigned_hcw = u.id
      LEFT JOIN hospitals h ON p.hospital_id = h.id
      WHERE p.is_active = true
    `;
    let queryParams = [];
    let paramCount = 0;

    // Add role-based filtering
    if (req.user.role === 'HCW') {
      paramCount++;
      query += ` AND p.assigned_hcw = $${paramCount}`;
      queryParams.push(req.user.id);
    } else if (req.user.role === 'ADMIN' && req.user.hospital_id) {
      paramCount++;
      query += ` AND p.hospital_id = $${paramCount}`;
      queryParams.push(req.user.hospital_id);
    }

    // Add search filter
    if (search) {
      paramCount++;
      query += ` AND (p.full_name ILIKE $${paramCount} OR p.cc_number ILIKE $${paramCount} OR p.phone_number ILIKE $${paramCount})`;
      queryParams.push(`%${search}%`);
    }

    // Add pagination
    paramCount++;
    query += ` ORDER BY p.created_at DESC LIMIT $${paramCount}`;
    queryParams.push(limit);

    paramCount++;
    query += ` OFFSET $${paramCount}`;
    queryParams.push(offset);

    const result = await pool.query(query, queryParams);

    // Get total count
    let countQuery = 'SELECT COUNT(*) FROM patients p WHERE p.is_active = true';
    let countParams = [];
    let countParamCount = 0;

    if (req.user.role === 'HCW') {
      countParamCount++;
      countQuery += ` AND p.assigned_hcw = $${countParamCount}`;
      countParams.push(req.user.id);
    } else if (req.user.role === 'ADMIN' && req.user.hospital_id) {
      countParamCount++;
      countQuery += ` AND p.hospital_id = $${countParamCount}`;
      countParams.push(req.user.hospital_id);
    }

    if (search) {
      countParamCount++;
      countQuery += ` AND (p.full_name ILIKE $${countParamCount} OR p.cc_number ILIKE $${countParamCount} OR p.phone_number ILIKE $${countParamCount})`;
      countParams.push(`%${search}%`);
    }

    const countResult = await pool.query(countQuery, countParams);
    const total = parseInt(countResult.rows[0].count);

    res.json({
      success: true,
      count: result.rows.length,
      total,
      data: result.rows,
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
    const existingPatient = await pool.query(
      'SELECT id FROM patients WHERE cc_number = $1',
      [ccNumber]
    );

    if (existingPatient.rows.length > 0) {
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

    const result = await pool.query(
      `INSERT INTO patients (full_name, age, gender, cc_number, phone_number, address, lga, state, country, notes, status, assigned_hcw, hospital_id)
       VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, $10, $11, $12, $13)
       RETURNING *`,
      [fullName, age, gender, ccNumber, phoneNumber, address, lga, state, country || 'Nigeria', notes, status || 'new_case', assignedHCW, hospitalId]
    );

    res.status(201).json({
      success: true,
      message: 'Patient created successfully',
      data: result.rows[0]
    });
  } catch (error) {
    console.error('Create patient error:', error);
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
    await pool.query(
      'INSERT INTO sync_logs (user_id, device_id, table_name, record_id, action, data) VALUES ($1, $2, $3, $4, $5, $6)',
      [req.user.id, deviceId, 'sync_request', 0, 'CREATE', JSON.stringify({ lastSync, changes })]
    );

    // Get changes since last sync
    let syncQuery = `
      SELECT * FROM sync_logs 
      WHERE user_id = $1 AND sync_timestamp > $2
      ORDER BY sync_timestamp ASC
    `;
    let syncParams = [req.user.id, lastSync || '1970-01-01'];

    const syncResult = await pool.query(syncQuery, syncParams);

    res.json({
      success: true,
      message: 'Sync completed successfully',
      data: {
        lastSync: new Date().toISOString(),
        conflicts: [],
        updates: syncResult.rows
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
    const result = await pool.query(
      'SELECT COUNT(*) as pending_changes FROM sync_logs WHERE user_id = $1 AND is_synced = false',
      [req.user.id]
    );

    res.json({
      success: true,
      data: {
        isOnline: true,
        lastSync: new Date().toISOString(),
        pendingChanges: parseInt(result.rows[0].pending_changes),
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

// Initialize database and start server
const startServer = async () => {
  try {
    await initializeDatabase();
    
    app.listen(PORT, () => {
      console.log(`🚀 CCMIS Production API running on port ${PORT}`);
      console.log(`📊 Health check: http://localhost:${PORT}/health`);
      console.log(`🔐 Login endpoint: http://localhost:${PORT}/api/auth/login`);
      console.log(`🏥 Hospitals endpoint: http://localhost:${PORT}/api/hospitals`);
      console.log(`👥 Patients endpoint: http://localhost:${PORT}/api/patients`);
      console.log(`🔄 Sync endpoint: http://localhost:${PORT}/api/sync`);
      console.log('=== PRODUCTION READY ===');
    });
  } catch (error) {
    console.error('Failed to start server:', error);
    process.exit(1);
  }
};

startServer();
