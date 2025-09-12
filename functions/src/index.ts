import * as functions from 'firebase-functions';
import * as admin from 'firebase-admin';
import express from 'express';
import cors from 'cors';

admin.initializeApp();
const db = admin.firestore();

const app = express();
app.use(cors({ origin: true }));
app.use(express.json());

// Health check
app.get('/health', (req, res) => {
  res.json({ 
    status: 'OK', 
    timestamp: new Date().toISOString(),
    service: 'CCMIS Firebase Functions'
  });
});

// Patient routes
app.get('/patients', async (req, res) => {
  try {
    const { hospitalId, search, country, state, lga } = req.query;
    let query = db.collection('patients').where('isActive', '==', true);
    
    if (hospitalId) {
      query = query.where('hospitalId', '==', hospitalId);
    }
    
    if (country) {
      query = query.where('country', '==', country);
    }
    
    if (state) {
      query = query.where('state', '==', state);
    }
    
    if (lga) {
      query = query.where('lga', '==', lga);
    }
    
    const snapshot = await query.get();
    let patients = snapshot.docs.map(doc => ({
      id: doc.id,
      ...doc.data()
    }));
    
    // Client-side search for text fields
    if (search) {
      const searchLower = (search as string).toLowerCase();
      patients = patients.filter((patient: any) => 
        patient.fullName?.toLowerCase().includes(searchLower) ||
        patient.ccNumber?.toLowerCase().includes(searchLower) ||
        patient.notes?.toLowerCase().includes(searchLower)
      );
    }
    
    res.json({
      success: true,
      data: patients,
      total: patients.length
    });
  } catch (error) {
    res.status(500).json({
      success: false,
      message: 'Error fetching patients',
      error: (error as Error).message
    });
  }
});

app.post('/patients', async (req, res) => {
  try {
    const patientData = {
      ...req.body,
      createdAt: admin.firestore.FieldValue.serverTimestamp(),
      updatedAt: admin.firestore.FieldValue.serverTimestamp(),
      isActive: true
    };
    
    const docRef = await db.collection('patients').add(patientData);
    
    res.json({
      success: true,
      message: 'Patient created successfully',
      data: { id: docRef.id, ...patientData }
    });
  } catch (error) {
    res.status(500).json({
      success: false,
      message: 'Error creating patient',
      error: (error as Error).message
    });
  }
});

// Export the Express app as a Cloud Function
export const api = functions.https.onRequest(app);

// Import and export the initialization function
export { initializeSystem } from './init-users';
export { fixUserDocuments } from './fix-users';
export { createUserDocuments } from './create-user-docs';

// Callable function to set custom claims (SUPER_ADMIN only)
export const setUserClaims = functions.https.onCall(async (data, context) => {
  try {
    // ✅ 1. Verify caller is authenticated
    if (!context.auth) {
      throw new functions.https.HttpsError('unauthenticated', 'You must be signed in to set claims');
    }

    // ✅ 2. Check if caller is a SUPER_ADMIN
    const callerClaims = context.auth.token;
    if (callerClaims.role !== 'SUPER_ADMIN') {
      throw new functions.https.HttpsError('permission-denied', 'Only SUPER_ADMIN can assign roles');
    }

    // ✅ 3. Extract and validate input
    const { uid, email, role, hospitalId } = data || {};
    
    if (!uid && !email) {
      throw new functions.https.HttpsError('invalid-argument', 'uid or email is required');
    }
    if (!role) {
      throw new functions.https.HttpsError('invalid-argument', 'role is required');
    }
    if (!['SUPER_ADMIN', 'ADMIN', 'HCW'].includes(role)) {
      throw new functions.https.HttpsError('invalid-argument', 'Invalid role. Must be SUPER_ADMIN, ADMIN, or HCW');
    }

    // ✅ 4. Get target UID
    let targetUid = uid as string;
    if (!targetUid && email) {
      try {
        const user = await admin.auth().getUserByEmail(email as string);
        targetUid = user.uid;
      } catch (error) {
        throw new functions.https.HttpsError('not-found', `User with email ${email} not found`);
      }
    }

    // ✅ 5. Set custom claims
    await admin.auth().setCustomUserClaims(targetUid, {
      role,
      hospitalId: hospitalId ?? null,
    });

    console.log(`✅ Claims set for ${targetUid}: role=${role}, hospitalId=${hospitalId}`);

    // ✅ 6. Return success
    return { 
      success: true, 
      message: `Claims set for ${targetUid}`,
      uid: targetUid, 
      role, 
      hospitalId: hospitalId ?? null 
    };

  } catch (error) {
    console.error('❌ Error in setUserClaims:', error);
    if (error instanceof functions.https.HttpsError) {
      throw error;
    }
    throw new functions.https.HttpsError('internal', 'Internal server error');
  }
});

// One-time setup function to initialize claims for all existing users
export const setupAllUserClaims = functions.https.onCall(async (data, context) => {
  // Allow this to run without authentication for initial setup
  // In production, you might want to add a secret key check
  
  try {
    console.log('Setting up custom claims for all existing users...');
    
    // Get all users from Firestore
    const usersSnapshot = await db.collection('users').get();
    const results = [];
    
    for (const doc of usersSnapshot.docs) {
      const userData = doc.data();
      const uid = doc.id;
      
      console.log(`Setting claims for user: ${userData.email} (${userData.role})`);
      
      try {
        // Set custom claims based on user data in Firestore
        await admin.auth().setCustomUserClaims(uid, {
          role: userData.role || 'HCW',
          hospitalId: userData.hospitalId || null
        });
        
        results.push({
          email: userData.email,
          uid: uid,
          role: userData.role,
          hospitalId: userData.hospitalId,
          status: 'success'
        });
        
        console.log(`✅ Claims set for ${userData.email}: role=${userData.role}, hospitalId=${userData.hospitalId}`);
      } catch (error) {
        console.error(`❌ Error setting claims for ${userData.email}:`, error);
        results.push({
          email: userData.email,
          uid: uid,
          role: userData.role,
          hospitalId: userData.hospitalId,
          status: 'error',
          error: error.message
        });
      }
    }
    
    console.log('🎉 Claims setup completed!');
    return { 
      success: true, 
      message: 'All user claims have been set up successfully!',
      results: results
    };
    
  } catch (error) {
    console.error('❌ Error in setupAllUserClaims:', error);
    throw new functions.https.HttpsError('internal', 'Failed to setup user claims: ' + error.message);
  }
});

// Function to create Firebase Auth users for existing Firestore users
export const createAuthUsersForFirestoreUsers = functions.https.onCall(async (data, context) => {
  try {
    console.log('Creating Firebase Auth users for existing Firestore users...');
    
    // Get all users from Firestore
    const usersSnapshot = await db.collection('users').get();
    const results = [];
    
    for (const doc of usersSnapshot.docs) {
      const userData = doc.data();
      const firestoreUserId = doc.id;
      
      console.log(`Processing user: ${userData.email}`);
      
      try {
        // Check if Firebase Auth user already exists
        let firebaseUser;
        try {
          firebaseUser = await admin.auth().getUserByEmail(userData.email);
          console.log(`✅ Firebase Auth user already exists for ${userData.email}`);
        } catch (error) {
          // User doesn't exist, create them
          console.log(`Creating Firebase Auth user for ${userData.email}`);
          firebaseUser = await admin.auth().createUser({
            email: userData.email,
            displayName: userData.fullName,
            password: 'TempPassword123!' // Temporary password
          });
          console.log(`✅ Created Firebase Auth user for ${userData.email}`);
        }
        
        // Set custom claims
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
        
        console.log(`✅ Processed ${userData.email}: Firebase UID = ${firebaseUser.uid}`);
      } catch (error) {
        console.error(`❌ Error processing ${userData.email}:`, error);
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
    
    console.log('🎉 Auth user creation completed!');
    return { 
      success: true, 
      message: 'All Firebase Auth users have been created successfully!',
      results: results
    };
    
  } catch (error) {
    console.error('❌ Error in createAuthUsersForFirestoreUsers:', error);
    throw new functions.https.HttpsError('internal', 'Failed to create auth users: ' + error.message);
  }
});
// Create user with Auth + Firestore
export const createUser = functions.https.onCall(async (data, context) => {
  try {
    // ✅ Verify caller is authenticated
    if (!context.auth) {
      throw new functions.https.HttpsError(
        "unauthenticated",
        "You must be signed in to create a user"
      );
    }

    // ✅ Only allow SUPER_ADMIN and ADMIN to create users
    const callerClaims = context.auth.token;
    if (!["SUPER_ADMIN", "ADMIN"].includes(callerClaims.role)) {
      throw new functions.https.HttpsError(
        "permission-denied",
        "You do not have permission to create users"
      );
    }

    const { email, password, fullName, role, hospitalId, username } = data;

    if (!email || !password || !fullName || !role) {
      throw new functions.https.HttpsError(
        "invalid-argument",
        "Missing required fields: email, password, fullName, role"
      );
    }

    // ✅ Create Firebase Auth user
    const userRecord = await admin.auth().createUser({
      email,
      password,
      displayName: fullName,
    });

    // ✅ Assign custom claims
    await admin.auth().setCustomUserClaims(userRecord.uid, {
      role,
      hospitalId: hospitalId || null,
    });

    // ✅ Save user in Firestore with UID as document ID
    const newUser = {
      uid: userRecord.uid,
      id: userRecord.uid,
      username,
      email,
      fullName,
      role,
      hospitalId: hospitalId || null,
      isActive: true,
      createdAt: admin.firestore.FieldValue.serverTimestamp(),
      updatedAt: admin.firestore.FieldValue.serverTimestamp(),
    };

    await db.collection("users").doc(userRecord.uid).set(newUser);

    console.log(`✅ User created: ${userRecord.uid} (${email})`);

    return {
      success: true,
      uid: userRecord.uid,
      firestoreId: userRecord.uid, // same as doc ID
      email,
      role,
    };
  } catch (error: any) {
    console.error("❌ Error in createUser:", error);
    throw new functions.https.HttpsError(
      "internal",
      error.message || "Failed to create user"
    );
  }
});

