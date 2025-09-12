// Script to create a custom super admin user
// Run this in the Firebase Functions directory

const admin = require('firebase-admin');

// Initialize Firebase Admin
admin.initializeApp({
  projectId: 'ccmis-f6008'
});

async function createCustomSuperAdmin() {
  try {
    console.log('Creating custom super admin...');
    
    // Get user input (you can modify these values)
    const email = 'your-email@example.com';  // Change this to your email
    const password = 'your-password123';     // Change this to your password
    const fullName = 'Your Name';            // Change this to your name
    
    // Create user in Authentication
    const userRecord = await admin.auth().createUser({
      email: email,
      password: password,
      displayName: fullName
    });
    
    console.log('✅ User created in Authentication:', userRecord.uid);
    
    // Create user document in Firestore
    const userDoc = {
      email: email,
      fullName: fullName,
      role: 'SUPER_ADMIN',
      hospitalId: null,
      isActive: true,
      createdAt: admin.firestore.FieldValue.serverTimestamp(),
      updatedAt: admin.firestore.FieldValue.serverTimestamp()
    };
    
    await admin.firestore().collection('users').doc(userRecord.uid).set(userDoc);
    console.log('✅ User document created in Firestore');
    
    console.log('\n🎉 Custom Super Admin created successfully!');
    console.log('Email:', email);
    console.log('Password:', password);
    console.log('Role: SUPER_ADMIN');
    console.log('UID:', userRecord.uid);
    
    process.exit(0);
  } catch (error) {
    console.error('Error creating custom super admin:', error);
    process.exit(1);
  }
}

createCustomSuperAdmin();
