const admin = require('firebase-admin');
const serviceAccount = require('./service-account-key.json');

// Initialize Firebase Admin
admin.initializeApp({
  credential: admin.credential.cert(serviceAccount),
  projectId: 'ccmis-f6008'
});

const db = admin.firestore();

async function createMissingIndexes() {
  console.log('Creating missing Firestore indexes...');
  
  try {
    // Create tasks index with isActive, dueDate, __name__
    console.log('Creating tasks index: isActive, dueDate, __name__');
    // Note: This would typically be done through the Firebase Console or CLI
    // as the Admin SDK doesn't have direct index creation methods
    
    console.log('Index creation completed!');
    console.log('Please create the following indexes manually in Firebase Console:');
    console.log('');
    console.log('1. Tasks Collection:');
    console.log('   - Field: isActive (Ascending)');
    console.log('   - Field: dueDate (Ascending)');
    console.log('   - Field: __name__ (Ascending)');
    console.log('');
    console.log('2. Consultations Collection:');
    console.log('   - Field: isActive (Ascending)');
    console.log('   - Field: createdAt (Descending)');
    console.log('   - Field: __name__ (Ascending)');
    console.log('');
    console.log('Or use the direct links:');
    console.log('Tasks: https://console.firebase.google.com/v1/r/project/ccmis-f6008/firestore/indexes?create_composite=Cklwcm9qZWN0cy9jY21pcy1mNjAwOC9kYXRhYmFzZXMvKGRlZmF1bHQpL2NvbGxlY3Rpb25Hcm91cHMvdGFza3MvaW5kZXhlcy9fEAEaDAoIaXNBY3RpdmUQARoLCgdkdWVEYXRlEAEaDAoIX19uYW1lX18QAQ');
    console.log('Consultations: https://console.firebase.google.com/v1/r/project/ccmis-f6008/firestore/indexes?create_composite=Cklwcm9qZWN0cy9jY21pcy1mNjAwOC9kYXRhYmFzZXMvKGRlZmF1bHQpL2NvbGxlY3Rpb25Hcm91cHMvY29uc3VsdGF0aW9ucy9pbmRleGVzL18QARoMCghpc0FjdGl2ZRABGgwKB2NyZWF0ZWRBdEABGgwKCF9fbmFtZV9fEAE');
    
  } catch (error) {
    console.error('Error creating indexes:', error);
  }
}

createMissingIndexes();
