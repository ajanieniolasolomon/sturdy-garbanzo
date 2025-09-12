// Script to fix existing user documents in Firestore
const admin = require('firebase-admin');

// Initialize Firebase Admin
const serviceAccount = require('./serviceAccountKey.json');
admin.initializeApp({
  credential: admin.credential.cert(serviceAccount)
});

const db = admin.firestore();

async function fixUserDocuments() {
  try {
    console.log('🔧 Fixing user documents...');
    
    // Get all users
    const usersSnapshot = await db.collection('users').get();
    
    if (usersSnapshot.empty) {
      console.log('No users found in Firestore');
      return;
    }
    
    const batch = db.batch();
    let updateCount = 0;
    
    usersSnapshot.forEach((doc) => {
      const userData = doc.data();
      
      // Check if user has firstName/lastName instead of fullName
      if (userData.firstName && userData.lastName && !userData.fullName) {
        const fullName = `${userData.firstName} ${userData.lastName}`;
        
        // Update the document
        batch.update(doc.ref, {
          fullName: fullName,
          // Remove firstName and lastName
          firstName: admin.firestore.FieldValue.delete(),
          lastName: admin.firestore.FieldValue.delete()
        });
        
        updateCount++;
        console.log(`Updating user: ${userData.email} -> fullName: ${fullName}`);
      }
    });
    
    if (updateCount > 0) {
      await batch.commit();
      console.log(`✅ Updated ${updateCount} user documents`);
    } else {
      console.log('✅ No user documents need updating');
    }
    
    // Verify the fix
    console.log('\n🔍 Verifying user documents...');
    const verifySnapshot = await db.collection('users').get();
    
    verifySnapshot.forEach((doc) => {
      const userData = doc.data();
      console.log(`User: ${userData.email} - fullName: ${userData.fullName} - role: ${userData.role}`);
    });
    
  } catch (error) {
    console.error('❌ Error fixing user documents:', error);
  }
}

// Run the fix
fixUserDocuments().then(() => {
  console.log('✅ User document fix completed');
  process.exit(0);
}).catch((error) => {
  console.error('❌ Fix failed:', error);
  process.exit(1);
});
