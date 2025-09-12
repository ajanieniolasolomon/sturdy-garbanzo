const admin = require('firebase-admin');

// Initialize Firebase Admin
const serviceAccount = require('./serviceAccountKey.json');
admin.initializeApp({
  credential: admin.credential.cert(serviceAccount)
});

const db = admin.firestore();

async function createSuperAdmin() {
  try {
    // Create user in Firebase Auth
    const userRecord = await admin.auth().createUser({
      email: 'admin@ccmis.org',
      password: 'admin123',
      displayName: 'Super Admin'
    });

    console.log('User created:', userRecord.uid);

    // Create user document in Firestore
    await db.collection('users').doc(userRecord.uid).set({
      username: 'admin',
      email: 'admin@ccmis.org',
      fullName: 'Super Admin',
      role: 'SUPER_ADMIN',
      isActive: true,
      createdAt: admin.firestore.FieldValue.serverTimestamp(),
      updatedAt: admin.firestore.FieldValue.serverTimestamp()
    });

    console.log('Super admin user created successfully!');
    console.log('Email: admin@ccmis.org');
    console.log('Password: admin123');
  } catch (error) {
    console.error('Error creating super admin:', error);
  }
}

createSuperAdmin();
