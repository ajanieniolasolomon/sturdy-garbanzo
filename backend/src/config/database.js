const { Pool } = require('pg');
require('dotenv').config();

// PostgreSQL connection configuration
const pool = new Pool({
  user: process.env.DB_USER || 'postgres',
  host: process.env.DB_HOST || 'localhost',
  database: process.env.DB_NAME || 'ccmis',
  password: process.env.DB_PASSWORD || 'password',
  port: process.env.DB_PORT || 5432,
  ssl: process.env.NODE_ENV === 'production' ? { rejectUnauthorized: false } : false,
  max: 20, // Maximum number of clients in the pool
  idleTimeoutMillis: 30000, // Close idle clients after 30 seconds
  connectionTimeoutMillis: 2000, // Return an error after 2 seconds if connection could not be established
});

// Test the connection
pool.on('connect', () => {
  console.log('✅ Connected to PostgreSQL database');
});

pool.on('error', (err) => {
  console.error('❌ PostgreSQL connection error:', err);
  process.exit(-1);
});

// Initialize database tables
const initializeDatabase = async () => {
  try {
    const client = await pool.connect();
    
    // Create users table
    await client.query(`
      CREATE TABLE IF NOT EXISTS users (
        id SERIAL PRIMARY KEY,
        username VARCHAR(50) UNIQUE NOT NULL,
        email VARCHAR(100) UNIQUE NOT NULL,
        password_hash VARCHAR(255) NOT NULL,
        role VARCHAR(20) NOT NULL CHECK (role IN ('HCW', 'ADMIN', 'SUPER_ADMIN')),
        first_name VARCHAR(50) NOT NULL,
        last_name VARCHAR(50) NOT NULL,
        hospital_id INTEGER REFERENCES hospitals(id),
        is_active BOOLEAN DEFAULT true,
        last_login TIMESTAMP,
        created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
        updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
      )
    `);

    // Create hospitals table
    await client.query(`
      CREATE TABLE IF NOT EXISTS hospitals (
        id SERIAL PRIMARY KEY,
        name VARCHAR(100) NOT NULL,
        code VARCHAR(20) UNIQUE NOT NULL,
        address TEXT NOT NULL,
        phone VARCHAR(20),
        email VARCHAR(100),
        lga VARCHAR(50),
        state VARCHAR(50),
        country VARCHAR(50) DEFAULT 'Nigeria',
        capacity INTEGER DEFAULT 0,
        current_patients INTEGER DEFAULT 0,
        staff_count INTEGER DEFAULT 0,
        is_active BOOLEAN DEFAULT true,
        created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
        updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
      )
    `);

    // Create patients table
    await client.query(`
      CREATE TABLE IF NOT EXISTS patients (
        id SERIAL PRIMARY KEY,
        full_name VARCHAR(100) NOT NULL,
        age INTEGER,
        gender VARCHAR(10) CHECK (gender IN ('male', 'female', 'other')),
        cc_number VARCHAR(50) UNIQUE NOT NULL,
        phone_number VARCHAR(20),
        address TEXT,
        lga VARCHAR(50),
        state VARCHAR(50),
        country VARCHAR(50) DEFAULT 'Nigeria',
        notes TEXT,
        status VARCHAR(20) DEFAULT 'new_case' CHECK (status IN ('new_case', 'on_treatment', 'completed', 'discharged')),
        assigned_hcw INTEGER REFERENCES users(id),
        hospital_id INTEGER REFERENCES hospitals(id) NOT NULL,
        is_active BOOLEAN DEFAULT true,
        created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
        updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
      )
    `);

    // Create consultations table
    await client.query(`
      CREATE TABLE IF NOT EXISTS consultations (
        id SERIAL PRIMARY KEY,
        patient_id INTEGER REFERENCES patients(id) NOT NULL,
        hcw_id INTEGER REFERENCES users(id) NOT NULL,
        hospital_id INTEGER REFERENCES hospitals(id) NOT NULL,
        consultation_type VARCHAR(50) NOT NULL,
        diagnosis TEXT,
        treatment_plan TEXT,
        notes TEXT,
        status VARCHAR(20) DEFAULT 'scheduled' CHECK (status IN ('scheduled', 'in_progress', 'completed', 'cancelled')),
        consultation_date TIMESTAMP NOT NULL,
        created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
        updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
      )
    `);

    // Create tasks table
    await client.query(`
      CREATE TABLE IF NOT EXISTS tasks (
        id SERIAL PRIMARY KEY,
        patient_id INTEGER REFERENCES patients(id) NOT NULL,
        hcw_id INTEGER REFERENCES users(id) NOT NULL,
        hospital_id INTEGER REFERENCES hospitals(id) NOT NULL,
        title VARCHAR(100) NOT NULL,
        description TEXT,
        priority VARCHAR(10) DEFAULT 'medium' CHECK (priority IN ('low', 'medium', 'high', 'urgent')),
        status VARCHAR(20) DEFAULT 'pending' CHECK (status IN ('pending', 'in_progress', 'completed', 'cancelled')),
        due_date TIMESTAMP,
        completed_at TIMESTAMP,
        created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
        updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
      )
    `);

    // Create sync_logs table for offline-first functionality
    await client.query(`
      CREATE TABLE IF NOT EXISTS sync_logs (
        id SERIAL PRIMARY KEY,
        user_id INTEGER REFERENCES users(id) NOT NULL,
        device_id VARCHAR(100) NOT NULL,
        table_name VARCHAR(50) NOT NULL,
        record_id INTEGER NOT NULL,
        action VARCHAR(10) NOT NULL CHECK (action IN ('CREATE', 'UPDATE', 'DELETE')),
        data JSONB,
        sync_timestamp TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
        is_synced BOOLEAN DEFAULT false
      )
    `);

    // Create indexes for better performance
    await client.query(`
      CREATE INDEX IF NOT EXISTS idx_users_hospital_id ON users(hospital_id);
      CREATE INDEX IF NOT EXISTS idx_users_role ON users(role);
      CREATE INDEX IF NOT EXISTS idx_patients_hospital_id ON patients(hospital_id);
      CREATE INDEX IF NOT EXISTS idx_patients_assigned_hcw ON patients(assigned_hcw);
      CREATE INDEX IF NOT EXISTS idx_consultations_patient_id ON consultations(patient_id);
      CREATE INDEX IF NOT EXISTS idx_consultations_hcw_id ON consultations(hcw_id);
      CREATE INDEX IF NOT EXISTS idx_tasks_patient_id ON tasks(patient_id);
      CREATE INDEX IF NOT EXISTS idx_tasks_hcw_id ON tasks(hcw_id);
      CREATE INDEX IF NOT EXISTS idx_sync_logs_user_id ON sync_logs(user_id);
      CREATE INDEX IF NOT EXISTS idx_sync_logs_device_id ON sync_logs(device_id);
    `);

    // Create triggers for updated_at timestamps
    await client.query(`
      CREATE OR REPLACE FUNCTION update_updated_at_column()
      RETURNS TRIGGER AS $$
      BEGIN
        NEW.updated_at = CURRENT_TIMESTAMP;
        RETURN NEW;
      END;
      $$ language 'plpgsql';
    `);

    await client.query(`
      CREATE TRIGGER update_users_updated_at BEFORE UPDATE ON users
        FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();
    `);

    await client.query(`
      CREATE TRIGGER update_hospitals_updated_at BEFORE UPDATE ON hospitals
        FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();
    `);

    await client.query(`
      CREATE TRIGGER update_patients_updated_at BEFORE UPDATE ON patients
        FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();
    `);

    await client.query(`
      CREATE TRIGGER update_consultations_updated_at BEFORE UPDATE ON consultations
        FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();
    `);

    await client.query(`
      CREATE TRIGGER update_tasks_updated_at BEFORE UPDATE ON tasks
        FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();
    `);

    client.release();
    console.log('✅ Database tables and indexes created successfully');
  } catch (error) {
    console.error('❌ Database initialization error:', error);
    throw error;
  }
};

module.exports = {
  pool,
  initializeDatabase
};