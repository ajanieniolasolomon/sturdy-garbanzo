import * as admin from 'firebase-admin';
import * as functions from 'firebase-functions';

const db = admin.firestore();

// Fix existing user documents
export const fixUserDocuments = functions.https.onRequest(async (req, res) => {
  try {
    console.log('🔧 Fixing user documents...');
    
    // Get all users
    const usersSnapshot = await db.collection('users').get();
    
    if (usersSnapshot.empty) {
      res.json({ success: true, message: 'No users found in Firestore' });
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
    const users = [];
    
    verifySnapshot.forEach((doc) => {
      const userData = doc.data();
      users.push({
        email: userData.email,
        fullName: userData.fullName,
        role: userData.role
      });
      console.log(`User: ${userData.email} - fullName: ${userData.fullName} - role: ${userData.role}`);
    });
    
    res.json({ 
      success: true, 
      message: `Updated ${updateCount} user documents`,
      users: users
    });
    
  } catch (error) {
    console.error('❌ Error fixing user documents:', error);
    res.status(500).json({ 
      success: false, 
      message: 'Failed to fix user documents',
      error: error.message 
    });
  }
});
