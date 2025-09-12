const admin = require('firebase-admin');
const serviceAccount = require('./service-account-key.json');

// Initialize Firebase Admin
admin.initializeApp({
  credential: admin.credential.cert(serviceAccount),
  projectId: 'ccmis-f6008'
});

async function setUserPasswords() {
  console.log('🔐 Setting passwords for all users...');
  
  const users = [
    { email: 'admin@ccmis.org', password: 'admin123', role: 'SUPER_ADMIN' },
    { email: 'admin@ruralhealthcenter.ng', password: 'admin123', role: 'ADMIN' },
    { email: 'nelson@ruralhealthcenter.ng', password: 'nelson123', role: 'HCW' }
  ];
  
  try {
    for (const userInfo of users) {
      try {
        console.log(`\n👤 Setting password for: ${userInfo.email}`);
        
        // Get the user by email
        const user = await admin.auth().getUserByEmail(userInfo.email);
        
        // Update the user's password
        await admin.auth().updateUser(user.uid, {
          password: userInfo.password
        });
        
        console.log(`✅ Password set for ${userInfo.email}: ${userInfo.password}`);
        
        // Also ensure custom claims are set
        await admin.auth().setCustomUserClaims(user.uid, {
          role: userInfo.role,
          hospitalId: userInfo.role === 'SUPER_ADMIN' ? null : 'EjdZ83bwDF6eznzgkAsd'
        });
        
        console.log(`✅ Custom claims set for ${userInfo.email}: role=${userInfo.role}`);
        
      } catch (error) {
        console.error(`❌ Error updating ${userInfo.email}:`, error.message);
      }
    }
    
    console.log('\n🎉 All passwords and claims updated!');
    console.log('\n🔑 Login Credentials:');
    console.log('SUPER_ADMIN: admin@ccmis.org / admin123');
    console.log('ADMIN: admin@ruralhealthcenter.ng / admin123');
    console.log('HCW: nelson@ruralhealthcenter.ng / nelson123');
    
  } catch (error) {
    console.error('❌ Fatal error:', error);
  }
}

// Run the script
setUserPasswords().then(() => {
  console.log('\n🏁 Script completed');
  process.exit(0);
}).catch(error => {
  console.error('❌ Script failed:', error);
  process.exit(1);
});
