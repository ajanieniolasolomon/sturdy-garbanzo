const admin = require('firebase-admin');

// Initialize Firebase Admin
const serviceAccount = require('./functions/serviceAccountKey.json');
admin.initializeApp({
  credential: admin.credential.cert(serviceAccount),
  projectId: 'ccmis-f6008'
});

async function createUsers() {
  try {
    console.log('Creating default users...');
    
    // Create SUPER_ADMIN
    const superAdminUser = await admin.auth().createUser({
      email: 'superadmin@ccmis.com',
      password: 'admin123',
      displayName: 'Super Admin'
    });
    console.log('✅ SUPER_ADMIN created:', superAdminUser.uid);
    
    // Create ADMIN
    const adminUser = await admin.auth().createUser({
      email: 'admin@ccmis.com',
      password: 'admin123',
      displayName: 'Admin'
    });
    console.log('✅ ADMIN created:', adminUser.uid);
    
    // Create HCW
    const hcwUser = await admin.auth().createUser({
      email: 'hcw@ccmis.com',
      password: 'admin123',
      displayName: 'Health Care Worker'
    });
    console.log('✅ HCW created:', hcwUser.uid);
    
    console.log('All users created successfully!');
    process.exit(0);
  } catch (error) {
    console.error('Error creating users:', error);
    process.exit(1);
  }
}

createUsers();
