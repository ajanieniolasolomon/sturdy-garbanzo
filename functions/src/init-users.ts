import * as admin from 'firebase-admin';
import * as functions from 'firebase-functions';

// Use existing Firebase Admin instance

const db = admin.firestore();

// Create initial users and data
export const initializeSystem = functions.https.onRequest(async (req, res) => {
  try {
    // Create Super Admin user
    const superAdminUser = await admin.auth().createUser({
      email: 'admin@ccmis.org',
      password: 'admin123',
      displayName: 'Super Admin',
      emailVerified: true
    });

    // Create Hospital Admin user
    const hospitalAdminUser = await admin.auth().createUser({
      email: 'admin@ruralhealthcenter.ng',
      password: 'admin123',
      displayName: 'Hospital Admin',
      emailVerified: true
    });

    // Create Healthcare Worker user
    const hcwUser = await admin.auth().createUser({
      email: 'nelson@ruralhealthcenter.ng',
      password: 'hcw123',
      displayName: 'Nelson Healthcare',
      emailVerified: true
    });

    // Create sample hospital
    const hospitalRef = await db.collection('hospitals').add({
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
      staffCount: 5,
      isActive: true,
      createdAt: admin.firestore.FieldValue.serverTimestamp(),
      updatedAt: admin.firestore.FieldValue.serverTimestamp()
    });

    // Create user documents in Firestore
    await db.collection('users').doc(superAdminUser.uid).set({
      id: superAdminUser.uid,
      email: 'admin@ccmis.org',
      username: 'admin@ccmis.org',
      fullName: 'Super Admin',
      role: 'SUPER_ADMIN',
      hospitalId: null,
      hospitalName: null,
      isActive: true,
      createdAt: admin.firestore.FieldValue.serverTimestamp(),
      updatedAt: admin.firestore.FieldValue.serverTimestamp()
    });

    await db.collection('users').doc(hospitalAdminUser.uid).set({
      id: hospitalAdminUser.uid,
      email: 'admin@ruralhealthcenter.ng',
      username: 'admin@ruralhealthcenter.ng',
      fullName: 'Hospital Admin',
      role: 'ADMIN',
      hospitalId: hospitalRef.id,
      hospitalName: 'Rural Health Center',
      isActive: true,
      createdAt: admin.firestore.FieldValue.serverTimestamp(),
      updatedAt: admin.firestore.FieldValue.serverTimestamp()
    });

    await db.collection('users').doc(hcwUser.uid).set({
      id: hcwUser.uid,
      email: 'nelson@ruralhealthcenter.ng',
      username: 'nelson@ruralhealthcenter.ng',
      fullName: 'Nelson Healthcare',
      role: 'HCW',
      hospitalId: hospitalRef.id,
      hospitalName: 'Rural Health Center',
      isActive: true,
      createdAt: admin.firestore.FieldValue.serverTimestamp(),
      updatedAt: admin.firestore.FieldValue.serverTimestamp()
    });

    // Create sample patients
    const patients = [
      {
        fullName: 'John Doe',
        age: 35,
        gender: 'Male',
        ccNumber: 'CC001',
        phoneNumber: '+234 801 234 5678',
        address: '123 Village Road',
        lga: 'Rural Village',
        state: 'Taraba',
        country: 'Nigeria',
        notes: 'Regular checkup',
        status: 'new_case',
        assignedHCW: hcwUser.uid,
        hospitalId: hospitalRef.id,
        hospitalName: 'Rural Health Center',
        photos: [],
        documents: [],
        isActive: true,
        createdAt: admin.firestore.FieldValue.serverTimestamp(),
        updatedAt: admin.firestore.FieldValue.serverTimestamp()
      },
      {
        fullName: 'Mary Johnson',
        age: 28,
        gender: 'Female',
        ccNumber: 'CC002',
        phoneNumber: '+234 802 345 6789',
        address: '456 Community Street',
        lga: 'Rural Village',
        state: 'Taraba',
        country: 'Nigeria',
        notes: 'Prenatal care',
        status: 'on_treatment',
        assignedHCW: hcwUser.uid,
        hospitalId: hospitalRef.id,
        hospitalName: 'Rural Health Center',
        photos: [],
        documents: [],
        isActive: true,
        createdAt: admin.firestore.FieldValue.serverTimestamp(),
        updatedAt: admin.firestore.FieldValue.serverTimestamp()
      }
    ];

    for (const patient of patients) {
      await db.collection('patients').add(patient);
    }

    res.json({
      success: true,
      message: 'System initialized successfully',
      data: {
        users: {
          superAdmin: superAdminUser.uid,
          hospitalAdmin: hospitalAdminUser.uid,
          hcw: hcwUser.uid
        },
        hospital: hospitalRef.id,
        patients: patients.length
      }
    });

  } catch (error) {
    console.error('Initialization error:', error);
    res.status(500).json({
      success: false,
      message: 'Failed to initialize system',
      error: error instanceof Error ? error.message : 'Unknown error'
    });
  }
});
