const admin = require('firebase-admin');
const serviceAccount = require('./service-account-key.json');

// Initialize Firebase Admin
admin.initializeApp({
  credential: admin.credential.cert(serviceAccount),
  projectId: 'ccmis-f6008'
});

const db = admin.firestore();

async function fixAllUserPermissions() {
  console.log('🔧 Starting to fix all user permissions...');
  
  try {
    // Get all users from Firestore
    const usersSnapshot = await db.collection('users').get();
    console.log(`📊 Found ${usersSnapshot.docs.length} users in Firestore`);
    
    const results = [];
    
    for (const doc of usersSnapshot.docs) {
      const userData = doc.data();
      const firestoreUserId = doc.id;
      
      console.log(`\n👤 Processing user: ${userData.email} (${userData.role})`);
      
      try {
        // Check if Firebase Auth user already exists
        let firebaseUser;
        try {
          firebaseUser = await admin.auth().getUserByEmail(userData.email);
          console.log(`✅ Firebase Auth user already exists for ${userData.email}`);
        } catch (error) {
          // User doesn't exist, create them
          console.log(`🆕 Creating Firebase Auth user for ${userData.email}`);
          firebaseUser = await admin.auth().createUser({
            email: userData.email,
            displayName: userData.fullName,
            password: 'TempPassword123!' // Temporary password
          });
          console.log(`✅ Created Firebase Auth user for ${userData.email}`);
        }
        
        // Set custom claims
        console.log(`🔐 Setting custom claims for ${userData.email}: role=${userData.role}, hospitalId=${userData.hospitalId}`);
        await admin.auth().setCustomUserClaims(firebaseUser.uid, {
          role: userData.role || 'HCW',
          hospitalId: userData.hospitalId || null
        });
        
        // Update Firestore document with Firebase Auth UID
        await db.collection('users').doc(firestoreUserId).update({
          uid: firebaseUser.uid,
          updatedAt: admin.firestore.FieldValue.serverTimestamp()
        });
        
        results.push({
          email: userData.email,
          firestoreId: firestoreUserId,
          firebaseUid: firebaseUser.uid,
          role: userData.role,
          hospitalId: userData.hospitalId,
          status: 'success'
        });
        
        console.log(`✅ Successfully processed ${userData.email}: Firebase UID = ${firebaseUser.uid}`);
        
      } catch (error) {
        console.error(`❌ Error processing ${userData.email}:`, error.message);
        results.push({
          email: userData.email,
          firestoreId: firestoreUserId,
          role: userData.role,
          hospitalId: userData.hospitalId,
          status: 'error',
          error: error.message
        });
      }
    }
    
    console.log('\n🎉 Permission fix completed!');
    console.log('\n📊 Results Summary:');
    const successful = results.filter(r => r.status === 'success');
    const failed = results.filter(r => r.status === 'error');
    
    console.log(`✅ Successful: ${successful.length}`);
    console.log(`❌ Failed: ${failed.length}`);
    
    if (failed.length > 0) {
      console.log('\n❌ Failed users:');
      failed.forEach(f => console.log(`  - ${f.email}: ${f.error}`));
    }
    
    console.log('\n🔑 Test Credentials:');
    successful.forEach(s => {
      console.log(`  - ${s.email} (${s.role}): TempPassword123!`);
    });
    
    console.log('\n✨ All users should now have proper permissions!');
    console.log('🌐 You can now test the application at: https://ccmis-f6008.web.app');
    
  } catch (error) {
    console.error('❌ Fatal error:', error);
  }
}

// Run the fix
fixAllUserPermissions().then(() => {
  console.log('\n🏁 Script completed');
  process.exit(0);
}).catch(error => {
  console.error('❌ Script failed:', error);
  process.exit(1);
});
