const admin = require('firebase-admin');
require('dotenv').config();

// Initialize Firebase Admin SDK
let firebaseApp;

try {
  // Check if Firebase is already initialized
  if (admin.apps.length === 0) {
    // For production, use service account key
    if (process.env.FIREBASE_SERVICE_ACCOUNT_KEY) {
      const serviceAccount = JSON.parse(process.env.FIREBASE_SERVICE_ACCOUNT_KEY);
      firebaseApp = admin.initializeApp({
        credential: admin.credential.cert(serviceAccount),
        databaseURL: process.env.FIREBASE_DATABASE_URL
      });
    } else {
      // For development, use default credentials
      firebaseApp = admin.initializeApp({
        projectId: process.env.FIREBASE_PROJECT_ID || 'ccmis-f6008'
      });
    }
  } else {
    firebaseApp = admin.app();
  }

  console.log('✅ Firebase Admin SDK initialized');
} catch (error) {
  console.error('❌ Firebase initialization error:', error);
  throw error;
}

// Get Firestore instance
const db = admin.firestore();

// Get Auth instance
const auth = admin.auth();

// Firestore collections
const collections = {
  users: db.collection('users'),
  hospitals: db.collection('hospitals'),
  patients: db.collection('patients'),
  consultations: db.collection('consultations'),
  tasks: db.collection('tasks'),
  syncLogs: db.collection('syncLogs')
};

// Helper functions for Firestore operations
const firestoreHelpers = {
  // Create document with auto-generated ID
  async create(collection, data) {
    try {
      const docRef = await collection.add({
        ...data,
        createdAt: admin.firestore.FieldValue.serverTimestamp(),
        updatedAt: admin.firestore.FieldValue.serverTimestamp()
      });
      return { id: docRef.id, ...data };
    } catch (error) {
      console.error(`Error creating document in ${collection.id}:`, error);
      throw error;
    }
  },

  // Get document by ID
  async getById(collection, id) {
    try {
      const doc = await collection.doc(id).get();
      if (doc.exists) {
        return { id: doc.id, ...doc.data() };
      }
      return null;
    } catch (error) {
      console.error(`Error getting document from ${collection.id}:`, error);
      throw error;
    }
  },

  // Update document
  async update(collection, id, data) {
    try {
      await collection.doc(id).update({
        ...data,
        updatedAt: admin.firestore.FieldValue.serverTimestamp()
      });
      return { id, ...data };
    } catch (error) {
      console.error(`Error updating document in ${collection.id}:`, error);
      throw error;
    }
  },

  // Delete document (soft delete)
  async delete(collection, id) {
    try {
      await collection.doc(id).update({
        isActive: false,
        deletedAt: admin.firestore.FieldValue.serverTimestamp(),
        updatedAt: admin.firestore.FieldValue.serverTimestamp()
      });
      return { id, isActive: false };
    } catch (error) {
      console.error(`Error deleting document from ${collection.id}:`, error);
      throw error;
    }
  },

  // Query documents with filters
  async query(collection, filters = [], orderBy = null, limit = null) {
    try {
      let query = collection.where('isActive', '==', true);

      // Apply filters
      filters.forEach(filter => {
        query = query.where(filter.field, filter.operator, filter.value);
      });

      // Apply ordering
      if (orderBy) {
        query = query.orderBy(orderBy.field, orderBy.direction || 'asc');
      }

      // Apply limit
      if (limit) {
        query = query.limit(limit);
      }

      const snapshot = await query.get();
      const results = [];
      snapshot.forEach(doc => {
        results.push({ id: doc.id, ...doc.data() });
      });

      return results;
    } catch (error) {
      console.error(`Error querying ${collection.id}:`, error);
      throw error;
    }
  },

  // Get all documents
  async getAll(collection) {
    try {
      const snapshot = await collection.where('isActive', '==', true).get();
      const results = [];
      snapshot.forEach(doc => {
        results.push({ id: doc.id, ...doc.data() });
      });
      return results;
    } catch (error) {
      console.error(`Error getting all documents from ${collection.id}:`, error);
      throw error;
    }
  },

  // Batch operations
  async batchCreate(collection, dataArray) {
    try {
      const batch = db.batch();
      const results = [];

      dataArray.forEach(data => {
        const docRef = collection.doc();
        batch.set(docRef, {
          ...data,
          createdAt: admin.firestore.FieldValue.serverTimestamp(),
          updatedAt: admin.firestore.FieldValue.serverTimestamp()
        });
        results.push({ id: docRef.id, ...data });
      });

      await batch.commit();
      return results;
    } catch (error) {
      console.error(`Error batch creating in ${collection.id}:`, error);
      throw error;
    }
  }
};

// Initialize Firestore with sample data
const initializeFirestore = async () => {
  try {
    console.log('🌱 Initializing Firestore with sample data...');

    // Check if data already exists
    const usersSnapshot = await collections.users.limit(1).get();
    if (!usersSnapshot.empty) {
      console.log('✅ Firestore already has data');
      return;
    }

    // Create sample users
    const sampleUsers = [
      {
        username: 'superadmin',
        email: 'admin@ccmis.org',
        role: 'SUPER_ADMIN',
        firstName: 'Super',
        lastName: 'Admin',
        hospitalId: null,
        isActive: true,
        lastLogin: null
      },
      {
        username: 'admin_rural',
        email: 'admin@ruralhealthcenter.ng',
        role: 'ADMIN',
        firstName: 'Rural',
        lastName: 'Admin',
        hospitalId: 'hospital_1',
        isActive: true,
        lastLogin: null
      },
      {
        username: 'hcw_nelson',
        email: 'nelson@ruralhealthcenter.ng',
        role: 'HCW',
        firstName: 'Nelson',
        lastName: 'Healthcare',
        hospitalId: 'hospital_1',
        isActive: true,
        lastLogin: null
      }
    ];

    const createdUsers = await firestoreHelpers.batchCreate(collections.users, sampleUsers);

    // Create sample hospitals
    const sampleHospitals = [
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
        staffCount: 5,
        isActive: true
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
        staffCount: 12,
        isActive: true
      }
    ];

    const createdHospitals = await firestoreHelpers.batchCreate(collections.hospitals, sampleHospitals);

    // Create sample patients
    const samplePatients = [
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
        assignedHCW: createdUsers[2].id, // Nelson
        hospitalId: createdHospitals[0].id, // Rural Health Center
        isActive: true
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
        assignedHCW: createdUsers[2].id, // Nelson
        hospitalId: createdHospitals[0].id, // Rural Health Center
        isActive: true
      }
    ];

    await firestoreHelpers.batchCreate(collections.patients, samplePatients);

    console.log('✅ Firestore initialized with sample data');
    console.log('👥 Users created:', createdUsers.length);
    console.log('🏥 Hospitals created:', createdHospitals.length);
    console.log('👤 Patients created:', samplePatients.length);

  } catch (error) {
    console.error('❌ Firestore initialization error:', error);
    throw error;
  }
};

module.exports = {
  admin,
  db,
  auth,
  collections,
  firestoreHelpers,
  initializeFirestore
};
