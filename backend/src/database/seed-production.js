const { pool } = require('../config/database');
const bcrypt = require('bcryptjs');

const seedDatabase = async () => {
  try {
    console.log('🌱 Starting database seeding...');

    // Create super admin user
    const superAdminPassword = await bcrypt.hash('admin123', 12);
    const superAdminResult = await pool.query(
      `INSERT INTO users (username, email, password_hash, role, first_name, last_name, is_active)
       VALUES ($1, $2, $3, $4, $5, $6, $7)
       ON CONFLICT (email) DO NOTHING
       RETURNING id`,
      ['superadmin', 'admin@ccmis.org', superAdminPassword, 'SUPER_ADMIN', 'Super', 'Admin', true]
    );

    let superAdminId = superAdminResult.rows[0]?.id;
    if (!superAdminId) {
      const existingSuperAdmin = await pool.query(
        'SELECT id FROM users WHERE email = $1',
        ['admin@ccmis.org']
      );
      superAdminId = existingSuperAdmin.rows[0].id;
    }

    // Create sample hospitals
    const hospitals = [
      {
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
        staffCount: 5
      },
      {
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
        staffCount: 12
      },
      {
        name: 'Community Health Center',
        code: 'CHC003',
        address: '789 Community Road, Village Center',
        phone: '+234 345 678 9012',
        email: 'info@communityhealth.ng',
        lga: 'Village Center',
        state: 'Taraba',
        country: 'Nigeria',
        capacity: 30,
        currentPatients: 8,
        staffCount: 4
      }
    ];

    const hospitalIds = [];
    for (const hospital of hospitals) {
      const result = await pool.query(
        `INSERT INTO hospitals (name, code, address, phone, email, lga, state, country, capacity, current_patients, staff_count)
         VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, $10, $11)
         ON CONFLICT (code) DO NOTHING
         RETURNING id`,
        [hospital.name, hospital.code, hospital.address, hospital.phone, hospital.email, 
         hospital.lga, hospital.state, hospital.country, hospital.capacity, 
         hospital.currentPatients, hospital.staffCount]
      );
      
      if (result.rows[0]) {
        hospitalIds.push(result.rows[0].id);
      } else {
        // Get existing hospital ID
        const existingHospital = await pool.query(
          'SELECT id FROM hospitals WHERE code = $1',
          [hospital.code]
        );
        hospitalIds.push(existingHospital.rows[0].id);
      }
    }

    // Create admin users for each hospital
    const adminUsers = [
      {
        username: 'admin_rural',
        email: 'admin@ruralhealthcenter.ng',
        password: 'admin123',
        role: 'ADMIN',
        firstName: 'Rural',
        lastName: 'Admin',
        hospitalId: hospitalIds[0]
      },
      {
        username: 'admin_urban',
        email: 'admin@urbanmedical.ng',
        password: 'admin123',
        role: 'ADMIN',
        firstName: 'Urban',
        lastName: 'Admin',
        hospitalId: hospitalIds[1]
      },
      {
        username: 'admin_community',
        email: 'admin@communityhealth.ng',
        password: 'admin123',
        role: 'ADMIN',
        firstName: 'Community',
        lastName: 'Admin',
        hospitalId: hospitalIds[2]
      }
    ];

    const adminIds = [];
    for (const admin of adminUsers) {
      const hashedPassword = await bcrypt.hash(admin.password, 12);
      const result = await pool.query(
        `INSERT INTO users (username, email, password_hash, role, first_name, last_name, hospital_id, is_active)
         VALUES ($1, $2, $3, $4, $5, $6, $7, $8)
         ON CONFLICT (email) DO NOTHING
         RETURNING id`,
        [admin.username, admin.email, hashedPassword, admin.role, admin.firstName, 
         admin.lastName, admin.hospitalId, true]
      );
      
      if (result.rows[0]) {
        adminIds.push(result.rows[0].id);
      } else {
        // Get existing admin ID
        const existingAdmin = await pool.query(
          'SELECT id FROM users WHERE email = $1',
          [admin.email]
        );
        adminIds.push(existingAdmin.rows[0].id);
      }
    }

    // Create HCW users
    const hcwUsers = [
      {
        username: 'hcw_nelson',
        email: 'nelson@ruralhealthcenter.ng',
        password: 'hcw123',
        role: 'HCW',
        firstName: 'Nelson',
        lastName: 'Healthcare',
        hospitalId: hospitalIds[0]
      },
      {
        username: 'hcw_mary',
        email: 'mary@urbanmedical.ng',
        password: 'hcw123',
        role: 'HCW',
        firstName: 'Mary',
        lastName: 'Johnson',
        hospitalId: hospitalIds[1]
      },
      {
        username: 'hcw_john',
        email: 'john@communityhealth.ng',
        password: 'hcw123',
        role: 'HCW',
        firstName: 'John',
        lastName: 'Smith',
        hospitalId: hospitalIds[2]
      }
    ];

    const hcwIds = [];
    for (const hcw of hcwUsers) {
      const hashedPassword = await bcrypt.hash(hcw.password, 12);
      const result = await pool.query(
        `INSERT INTO users (username, email, password_hash, role, first_name, last_name, hospital_id, is_active)
         VALUES ($1, $2, $3, $4, $5, $6, $7, $8)
         ON CONFLICT (email) DO NOTHING
         RETURNING id`,
        [hcw.username, hcw.email, hashedPassword, hcw.role, hcw.firstName, 
         hcw.lastName, hcw.hospitalId, true]
      );
      
      if (result.rows[0]) {
        hcwIds.push(result.rows[0].id);
      } else {
        // Get existing HCW ID
        const existingHCW = await pool.query(
          'SELECT id FROM users WHERE email = $1',
          [hcw.email]
        );
        hcwIds.push(existingHCW.rows[0].id);
      }
    }

    // Create sample patients
    const patients = [
      {
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
        assignedHCW: hcwIds[0],
        hospitalId: hospitalIds[0]
      },
      {
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
        assignedHCW: hcwIds[0],
        hospitalId: hospitalIds[0]
      },
      {
        fullName: 'Ahmed Ibrahim',
        age: 28,
        gender: 'male',
        ccNumber: 'CC/FHI/003',
        phoneNumber: '+234803456789',
        address: '789 Pine Street',
        lga: 'Urban District',
        state: 'Lagos',
        country: 'Nigeria',
        notes: 'Malaria treatment',
        status: 'on_treatment',
        assignedHCW: hcwIds[1],
        hospitalId: hospitalIds[1]
      },
      {
        fullName: 'Fatima Usman',
        age: 35,
        gender: 'female',
        ccNumber: 'CC/FHI/004',
        phoneNumber: '+234804567890',
        address: '321 Elm Street',
        lga: 'Village Center',
        state: 'Taraba',
        country: 'Nigeria',
        notes: 'Prenatal care',
        status: 'on_treatment',
        assignedHCW: hcwIds[2],
        hospitalId: hospitalIds[2]
      }
    ];

    for (const patient of patients) {
      await pool.query(
        `INSERT INTO patients (full_name, age, gender, cc_number, phone_number, address, lga, state, country, notes, status, assigned_hcw, hospital_id)
         VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, $10, $11, $12, $13)
         ON CONFLICT (cc_number) DO NOTHING`,
        [patient.fullName, patient.age, patient.gender, patient.ccNumber, patient.phoneNumber,
         patient.address, patient.lga, patient.state, patient.country, patient.notes,
         patient.status, patient.assignedHCW, patient.hospitalId]
      );
    }

    // Create sample consultations
    const consultations = [
      {
        patientId: 1,
        hcwId: hcwIds[0],
        hospitalId: hospitalIds[0],
        consultationType: 'Follow-up',
        diagnosis: 'Hypertension',
        treatmentPlan: 'Continue medication, monitor blood pressure',
        notes: 'Patient responding well to treatment',
        status: 'completed',
        consultationDate: new Date()
      },
      {
        patientId: 2,
        hcwId: hcwIds[0],
        hospitalId: hospitalIds[0],
        consultationType: 'Initial',
        diagnosis: 'Type 2 Diabetes',
        treatmentPlan: 'Diet modification, medication, regular monitoring',
        notes: 'New patient, needs education on diabetes management',
        status: 'scheduled',
        consultationDate: new Date(Date.now() + 24 * 60 * 60 * 1000) // Tomorrow
      }
    ];

    for (const consultation of consultations) {
      await pool.query(
        `INSERT INTO consultations (patient_id, hcw_id, hospital_id, consultation_type, diagnosis, treatment_plan, notes, status, consultation_date)
         VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9)
         ON CONFLICT DO NOTHING`,
        [consultation.patientId, consultation.hcwId, consultation.hospitalId,
         consultation.consultationType, consultation.diagnosis, consultation.treatmentPlan,
         consultation.notes, consultation.status, consultation.consultationDate]
      );
    }

    // Create sample tasks
    const tasks = [
      {
        patientId: 1,
        hcwId: hcwIds[0],
        hospitalId: hospitalIds[0],
        title: 'Blood pressure check',
        description: 'Monitor blood pressure daily',
        priority: 'high',
        status: 'pending',
        dueDate: new Date(Date.now() + 7 * 24 * 60 * 60 * 1000) // Next week
      },
      {
        patientId: 2,
        hcwId: hcwIds[0],
        hospitalId: hospitalIds[0],
        title: 'Diabetes education',
        description: 'Provide diabetes management education',
        priority: 'medium',
        status: 'pending',
        dueDate: new Date(Date.now() + 3 * 24 * 60 * 60 * 1000) // 3 days
      }
    ];

    for (const task of tasks) {
      await pool.query(
        `INSERT INTO tasks (patient_id, hcw_id, hospital_id, title, description, priority, status, due_date)
         VALUES ($1, $2, $3, $4, $5, $6, $7, $8)
         ON CONFLICT DO NOTHING`,
        [task.patientId, task.hcwId, task.hospitalId, task.title, task.description,
         task.priority, task.status, task.dueDate]
      );
    }

    console.log('✅ Database seeded successfully!');
    console.log('\n=== DEMO CREDENTIALS ===');
    console.log('Super Admin:');
    console.log('  Email: admin@ccmis.org');
    console.log('  Password: admin123');
    console.log('\nHospital Admins:');
    console.log('  Rural Health Center: admin@ruralhealthcenter.ng / admin123');
    console.log('  Urban Medical Center: admin@urbanmedical.ng / admin123');
    console.log('  Community Health Center: admin@communityhealth.ng / admin123');
    console.log('\nHealthcare Workers:');
    console.log('  Nelson: nelson@ruralhealthcenter.ng / hcw123');
    console.log('  Mary: mary@urbanmedical.ng / hcw123');
    console.log('  John: john@communityhealth.ng / hcw123');
    console.log('\n=== PRODUCTION READY ===');

  } catch (error) {
    console.error('❌ Database seeding error:', error);
    throw error;
  }
};

// Run seeding if called directly
if (require.main === module) {
  seedDatabase()
    .then(() => {
      console.log('🎉 Seeding completed successfully!');
      process.exit(0);
    })
    .catch((error) => {
      console.error('💥 Seeding failed:', error);
      process.exit(1);
    });
}

module.exports = { seedDatabase };
