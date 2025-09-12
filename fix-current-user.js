const admin = require('firebase-admin');

// Initialize Firebase Admin SDK
const serviceAccount = require('./service-account-key.json');
admin.initializeApp({
  credential: admin.credential.cert(serviceAccount),
  projectId: 'ccmis-f6008'
});

const db = admin.firestore();

async function fixCurrentUser() {
  try {
    console.log('🔧 Fixing current user permissions...');
    
    // Get the current user's email from the console logs
    // You'll need to replace this with the actual email of the user you're logged in as
    const userEmail = 'admin@ccmis.com'; // Change this to the actual user email
    
    console.log(`Looking for user: ${userEmail}`);
    
    // Find the user in Firestore
    const usersSnapshot = await db.collection('users').where('email', '==', userEmail).get();
    
    if (usersSnapshot.empty) {
      console.log('❌ User not found in Firestore');
      return;
    }
    
    const userDoc = usersSnapshot.docs[0];
    const userData = userDoc.data();
    const firestoreUserId = userDoc.id;
    
    console.log(`Found user in Firestore: ${userData.fullName} (${userData.role})`);
    
    // Check if Firebase Auth user exists
    let firebaseUser;
    try {
      firebaseUser = await admin.auth().getUserByEmail(userEmail);
      console.log(`✅ Firebase Auth user exists: ${firebaseUser.uid}`);
    } catch (error) {
      console.log(`❌ Firebase Auth user doesn't exist, creating...`);
      firebaseUser = await admin.auth().createUser({
        email: userEmail,
        displayName: userData.fullName,
        password: 'TempPassword123!' // Temporary password
      });
      console.log(`✅ Created Firebase Auth user: ${firebaseUser.uid}`);
    }
    
    // Set custom claims
    await admin.auth().setCustomUserClaims(firebaseUser.uid, {
      role: userData.role || 'SUPER_ADMIN',
      hospitalId: userData.hospitalId || null
    });
    
    console.log(`✅ Set custom claims: role=${userData.role}, hospitalId=${userData.hospitalId}`);
    
    // Update Firestore document with Firebase Auth UID
    await db.collection('users').doc(firestoreUserId).update({
      uid: firebaseUser.uid,
      updatedAt: admin.firestore.FieldValue.serverTimestamp()
    });
    
    console.log(`✅ Updated Firestore document with Firebase UID`);
    
    console.log('🎉 User permissions fixed successfully!');
    console.log('Please refresh the application and try again.');
    
  } catch (error) {
    console.error('❌ Error fixing user permissions:', error);
  }
}

// Run the fix
fixCurrentUser().then(() => {
  console.log('Done!');
  process.exit(0);
}).catch((error) => {
  console.error('Failed:', error);
  process.exit(1);
});
