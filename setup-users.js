// Simple script to create user documents in Firestore
// This will be run in the browser console

const createUserDocuments = async () => {
  try {
    console.log('Creating user documents...');
    
    // Import Firebase functions
    const { getFirestore, doc, setDoc, serverTimestamp } = await import('https://www.gstatic.com/firebasejs/10.7.1/firebase-firestore.js');
    const { getAuth } = await import('https://www.gstatic.com/firebasejs/10.7.1/firebase-auth.js');
    
    // Get Firebase instances
    const auth = getAuth();
    const db = getFirestore();
    
    // Create user documents for existing auth users
    const users = [
      {
        uid: 'SmqdIaKg9zMYVficaXae7FAHCaD3',
        email: 'admin@ccmis.org',
        fullName: 'Super Admin',
        role: 'SUPER_ADMIN',
        hospitalId: null
      },
      {
        uid: 'XJlvxDi2b3MU8jk2HggBuhoc9922',
        email: 'nelson@ruralhealthcenter.ng',
        fullName: 'Nelson Healthcare',
        role: 'HCW',
        hospitalId: 'hospital_001'
      },
      {
        uid: 'anXBuby7J1QkuBzdhosiKwrFy9t1',
        email: 'admin@ruralhealthcenter.ng',
        fullName: 'Hospital Admin',
        role: 'ADMIN',
        hospitalId: 'hospital_001'
      }
    ];
    
    // Create hospital document first
    await setDoc(doc(db, 'hospitals', 'hospital_001'), {
      name: 'Rural Health Center',
      address: '123 Health Street, Rural City',
      phone: '+234-123-456-7890',
      email: 'admin@ruralhealthcenter.ng',
      isActive: true,
      createdAt: serverTimestamp(),
      updatedAt: serverTimestamp()
    });
    console.log('✅ Created hospital document');
    
    // Create user documents
    for (const user of users) {
      await setDoc(doc(db, 'users', user.uid), {
        email: user.email,
        fullName: user.fullName,
        role: user.role,
        hospitalId: user.hospitalId,
        isActive: true,
        createdAt: serverTimestamp(),
        updatedAt: serverTimestamp()
      });
      console.log(`✅ Created user document for ${user.email} with role ${user.role}`);
    }
    
    console.log('All user documents created successfully!');
    return true;
  } catch (error) {
    console.error('Error creating user documents:', error);
    return false;
  }
};

// Run the function
createUserDocuments();
