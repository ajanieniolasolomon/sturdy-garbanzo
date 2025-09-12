const mongoose = require('mongoose');
const bcrypt = require('bcryptjs');
require('dotenv').config();

// Import models
const User = require('../models/User');
const Hospital = require('../models/Hospital');
const Patient = require('../models/Patient');
const Consultation = require('../models/Consultation');
const Task = require('../models/Task');

// Connect to database
const connectDB = async () => {
  try {
    const mongoURI = process.argv[2] === 'test' ? process.env.MONGODB_TEST_URI : process.env.MONGODB_URI;
    await mongoose.connect(mongoURI);
    console.log('MongoDB Connected');
  } catch (error) {
    console.error('Database connection error:', error);
    process.exit(1);
  }
};

// Clear database
const clearDatabase = async () => {
  try {
    await User.deleteMany({});
    await Hospital.deleteMany({});
    await Patient.deleteMany({});
    await Consultation.deleteMany({});
    await Task.deleteMany({});
    console.log('Database cleared');
  } catch (error) {
    console.error('Error clearing database:', error);
  }
};

// Seed database
const seedDatabase = async () => {
  try {
    // Create hospitals
    const hospitals = await Hospital.create([
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
        currentPatients: 0,
        staffCount: 0
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
        currentPatients: 0,
        staffCount: 0
      },
      {
        name: 'Refugee Health Clinic',
        code: 'RHC003',
        address: '789 Refugee Camp, Border Area',
        phone: '+234 345 678 9012',
        email: 'clinic@refugeehealth.ng',
        lga: 'Border Area',
        state: 'Borno',
        country: 'Refugee',
        capacity: 30,
        currentPatients: 0,
        staffCount: 0
      }
    ]);

    console.log('Hospitals created:', hospitals.length);

    // Create users
    const users = await User.create([
      {
        username: 'superadmin',
        email: 'admin@ccmis.org',
        password: 'Admin123!',
        role: 'SUPER_ADMIN',
        firstName: 'Super',
        lastName: 'Admin',
        isActive: true
      },
      {
        username: 'hospitaladmin1',
        email: 'admin@ruralhealthcenter.ng',
        password: 'Admin123!',
        role: 'ADMIN',
        hospitalId: hospitals[0]._id,
        firstName: 'Hospital',
        lastName: 'Admin',
        isActive: true
      },
      {
        username: 'hcw001',
        email: 'hcw1@ruralhealthcenter.ng',
        password: 'Hcw123!',
        role: 'HCW',
        hospitalId: hospitals[0]._id,
        firstName: 'John',
        lastName: 'Doe',
        isActive: true
      },
      {
        username: 'hcw002',
        email: 'hcw2@ruralhealthcenter.ng',
        password: 'Hcw123!',
        role: 'HCW',
        hospitalId: hospitals[0]._id,
        firstName: 'Jane',
        lastName: 'Smith',
        isActive: true
      },
      {
        username: 'hospitaladmin2',
        email: 'admin@urbanmedical.ng',
        password: 'Admin123!',
        role: 'ADMIN',
        hospitalId: hospitals[1]._id,
        firstName: 'Urban',
        lastName: 'Admin',
        isActive: true
      },
      {
        username: 'hcw003',
        email: 'hcw1@urbanmedical.ng',
        password: 'Hcw123!',
        role: 'HCW',
        hospitalId: hospitals[1]._id,
        firstName: 'Ahmed',
        lastName: 'Hassan',
        isActive: true
      }
    ]);

    console.log('Users created:', users.length);

    // Create patients
    const patients = await Patient.create([
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
        assignedHCW: users[2]._id, // hcw001
        hospitalId: hospitals[0]._id
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
        assignedHCW: users[3]._id, // hcw002
        hospitalId: hospitals[0]._id
      },
      {
        fullName: 'Oluwaseun Johnson',
        age: 28,
        gender: 'male',
        ccNumber: 'CC/FHI/003',
        phoneNumber: '+234803456789',
        address: '789 Pine Road',
        lga: 'Urban District',
        state: 'Lagos',
        country: 'Nigeria',
        notes: 'Refugee patient',
        status: 'new_case',
        assignedHCW: users[5]._id, // hcw003
        hospitalId: hospitals[1]._id
      },
      {
        fullName: 'Fatima Al-Hassan',
        age: 35,
        gender: 'female',
        ccNumber: 'CC/FHI/004',
        phoneNumber: '+234804567890',
        address: '321 Refugee Camp',
        lga: 'Border Area',
        state: 'Borno',
        country: 'Refugee',
        notes: 'Prenatal care',
        status: 'on_treatment',
        assignedHCW: users[2]._id, // hcw001
        hospitalId: hospitals[0]._id
      }
    ]);

    console.log('Patients created:', patients.length);

    // Create consultations
    const consultations = await Consultation.create([
      {
        hospitalId: hospitals[0]._id,
        patientId: patients[0]._id,
        userId: users[2]._id,
        consultationDate: new Date(),
        type: 'INITIAL',
        status: 'COMPLETED',
        chiefComplaint: 'Fever and cough for 3 days',
        historyOfPresentIllness: 'Patient reports fever, cough, and fatigue for the past 3 days. No chest pain or shortness of breath.',
        symptoms: [
          { name: 'Fever', severity: 'MODERATE', duration: '3 days', notes: 'Temperature up to 38.5°C' },
          { name: 'Cough', severity: 'MILD', duration: '3 days', notes: 'Dry cough, worse at night' },
          { name: 'Fatigue', severity: 'MILD', duration: '3 days', notes: 'General weakness' }
        ],
        vitalSigns: {
          temperature: 38.2,
          heartRate: 95,
          bloodPressure: { systolic: 120, diastolic: 80 },
          respiratoryRate: 18
        },
        physicalExamination: {
          general: 'Patient appears tired but alert',
          systems: [
            { system: 'RESPIRATORY', findings: 'Clear lung fields, no wheezing' },
            { system: 'CARDIOVASCULAR', findings: 'Regular heart rate and rhythm' }
          ]
        },
        diagnosis: {
          primary: 'Upper respiratory tract infection',
          secondary: [],
          differential: ['Common cold', 'Influenza']
        },
        treatment: {
          plan: 'Supportive care with rest and fluids',
          medications: [
            {
              name: 'Paracetamol',
              dosage: '500mg',
              frequency: '3 times daily',
              duration: '5 days',
              instructions: 'Take with food'
            }
          ],
          procedures: []
        },
        followUp: {
          required: true,
          date: new Date(Date.now() + 7 * 24 * 60 * 60 * 1000),
          instructions: 'Return if symptoms worsen or persist beyond 7 days'
        },
        referral: {
          required: false
        },
        notes: 'Patient advised to return if symptoms worsen',
        syncStatus: 'SYNCED'
      },
      {
        hospitalId: hospitals[0]._id,
        patientId: patients[1]._id,
        userId: users[3]._id,
        consultationDate: new Date(Date.now() - 2 * 24 * 60 * 60 * 1000),
        type: 'FOLLOW_UP',
        status: 'COMPLETED',
        chiefComplaint: 'Shortness of breath and wheezing',
        historyOfPresentIllness: 'Known asthmatic patient presenting with increased shortness of breath and wheezing for 2 days.',
        symptoms: [
          { name: 'Shortness of breath', severity: 'SEVERE', duration: '2 days', notes: 'Worse with exertion' },
          { name: 'Wheezing', severity: 'MODERATE', duration: '2 days', notes: 'Audible wheezing' }
        ],
        vitalSigns: {
          heartRate: 110,
          bloodPressure: { systolic: 130, diastolic: 85 },
          respiratoryRate: 24,
          oxygenSaturation: 92
        },
        physicalExamination: {
          general: 'Patient in mild respiratory distress',
          systems: [
            { system: 'RESPIRATORY', findings: 'Widespread wheezing, prolonged expiration' },
            { system: 'CARDIOVASCULAR', findings: 'Tachycardia, no murmurs' }
          ]
        },
        diagnosis: {
          primary: 'Asthma exacerbation',
          secondary: [],
          differential: ['COPD exacerbation', 'Pneumonia']
        },
        treatment: {
          plan: 'Bronchodilator therapy and monitoring',
          medications: [
            {
              name: 'Salbutamol',
              dosage: '100mcg',
              frequency: '2 puffs as needed',
              duration: 'Ongoing',
              instructions: 'Use inhaler when experiencing symptoms'
            }
          ],
          procedures: []
        },
        followUp: {
          required: true,
          date: new Date(Date.now() + 14 * 24 * 60 * 60 * 1000),
          instructions: 'Follow-up in 2 weeks to assess asthma control'
        },
        referral: {
          required: false
        },
        notes: 'Patient responded well to treatment',
        syncStatus: 'SYNCED'
      }
    ]);

    console.log('Consultations created:', consultations.length);

    // Create tasks
    const tasks = await Task.create([
      {
        hospitalId: hospitals[0]._id,
        patientId: patients[0]._id,
        userId: users[2]._id,
        title: 'Follow-up consultation',
        description: 'Schedule follow-up appointment for Aisha Mohammed',
        priority: 'MEDIUM',
        status: 'PENDING',
        dueDate: new Date(Date.now() + 7 * 24 * 60 * 60 * 1000)
      },
      {
        hospitalId: hospitals[0]._id,
        patientId: patients[1]._id,
        userId: users[3]._id,
        title: 'Asthma management review',
        description: 'Review asthma management plan for Kemi Adebayo',
        priority: 'HIGH',
        status: 'PENDING',
        dueDate: new Date(Date.now() + 14 * 24 * 60 * 60 * 1000)
      },
      {
        hospitalId: hospitals[1]._id,
        patientId: patients[2]._id,
        userId: users[5]._id,
        title: 'Initial assessment',
        description: 'Complete initial assessment for Oluwaseun Johnson',
        priority: 'HIGH',
        status: 'IN_PROGRESS',
        dueDate: new Date(Date.now() + 3 * 24 * 60 * 60 * 1000)
      }
    ]);

    console.log('Tasks created:', tasks.length);

    // Update hospital statistics
    for (const hospital of hospitals) {
      await hospital.updatePatientCount();
      await hospital.updateStaffCount();
    }

    console.log('Database seeded successfully!');
    console.log('\n=== SEEDED DATA ===');
    console.log(`Hospitals: ${hospitals.length}`);
    console.log(`Users: ${users.length}`);
    console.log(`Patients: ${patients.length}`);
    console.log(`Consultations: ${consultations.length}`);
    console.log(`Tasks: ${tasks.length}`);
    
    console.log('\n=== LOGIN CREDENTIALS ===');
    console.log('Super Admin: admin@ccmis.org / Admin123!');
    console.log('Hospital Admin: admin@ruralhealthcenter.ng / Admin123!');
    console.log('HCW: hcw1@ruralhealthcenter.ng / Hcw123!');

  } catch (error) {
    console.error('Error seeding database:', error);
  }
};

// Main execution
const main = async () => {
  await connectDB();
  
  if (process.argv[2] === 'clear') {
    await clearDatabase();
  } else {
    await clearDatabase(); // Clear first, then seed
    await seedDatabase();
  }
  
  process.exit(0);
};

main();