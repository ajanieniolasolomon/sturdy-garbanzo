const admin = require('firebase-admin');

// Initialize Firebase Admin
const serviceAccount = {
  "type": "service_account",
  "project_id": "ccmis-f6008",
  "private_key_id": "your-private-key-id",
  "private_key": "your-private-key",
  "client_email": "firebase-adminsdk-xxxxx@ccmis-f6008.iam.gserviceaccount.com",
  "client_id": "your-client-id",
  "auth_uri": "https://accounts.google.com/o/oauth2/auth",
  "token_uri": "https://oauth2.googleapis.com/token",
  "auth_provider_x509_cert_url": "https://www.googleapis.com/oauth2/v1/certs",
  "client_x509_cert_url": "https://www.googleapis.com/robot/v1/metadata/x509/firebase-adminsdk-xxxxx%40ccmis-f6008.iam.gserviceaccount.com"
};

// For now, let's use the default credentials
admin.initializeApp({
  projectId: 'ccmis-f6008'
});

const db = admin.firestore();

async function checkAndCreateAdmin() {
  try {
    console.log('🔍 Checking for admin user...');
    
    // Check if admin user exists
    const adminDoc = await db.collection('users').doc('admin@ccmis.org').get();
    
    if (adminDoc.exists) {
      console.log('✅ Admin user already exists');
      console.log('Admin data:', adminDoc.data());
    } else {
      console.log('❌ Admin user not found, creating...');
      
      // Create admin user
      await db.collection('users').doc('admin@ccmis.org').set({
        id: 'admin@ccmis.org',
        username: 'admin',
        email: 'admin@ccmis.org',
        role: 'SUPER_ADMIN',
        hospitalId: null,
        isActive: true,
        createdAt: new Date().toISOString(),
        updatedAt: new Date().toISOString()
      });
      
      console.log('✅ Admin user created successfully');
    }
    
    // Check if there are any hospitals
    const hospitalsSnapshot = await db.collection('hospitals').get();
    console.log(`📊 Found ${hospitalsSnapshot.size} hospitals`);
    
    if (hospitalsSnapshot.size === 0) {
      console.log('🏥 Creating sample hospital...');
      await db.collection('hospitals').add({
        name: 'BPRM FHI Taraba State',
        address: 'Taraba State, Nigeria',
        lga: 'Jalingo',
        state: 'Taraba',
        phoneNumber: '+234-xxx-xxx-xxxx',
        email: 'info@bprm-fhi-taraba.org',
        isActive: true,
        createdAt: new Date().toISOString(),
        updatedAt: new Date().toISOString()
      });
      console.log('✅ Sample hospital created');
    }
    
  } catch (error) {
    console.error('❌ Error:', error);
  } finally {
    process.exit(0);
  }
}

checkAndCreateAdmin();
