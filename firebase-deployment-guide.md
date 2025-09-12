# 🔥 CCMIS Firebase Deployment Guide

## Why Firebase is Perfect for CCMIS

✅ **Native NoSQL Support** - Firebase Firestore is document-based like MongoDB  
✅ **Real-time Sync** - Built-in real-time updates (perfect for offline-first)  
✅ **Authentication** - Built-in user management with JWT  
✅ **Hosting** - Free static hosting for React frontend  
✅ **Cloud Functions** - Serverless backend (replaces Node.js server)  
✅ **Offline Support** - Native offline capabilities  
✅ **Free Tier** - Generous free limits for small-medium projects  

---

## 🚀 Firebase Setup & Deployment

### Step 1: Create Firebase Project

1. Go to [Firebase Console](https://console.firebase.google.com/)
2. Click "Create a project"
3. Name: `ccmis-healthcare`
4. Enable Google Analytics (optional)
5. Create project

### Step 2: Install Firebase CLI

```bash
npm install -g firebase-tools
firebase login
```

### Step 3: Initialize Firebase in Your Project

```bash
cd CCMIS-New
firebase init
```

Select these services:
- ✅ **Firestore** (Database)
- ✅ **Authentication** 
- ✅ **Hosting**
- ✅ **Functions** (Backend API)

### Step 4: Configure Firebase Services

#### 4.1 Firestore Database
```bash
# Choose "Start in test mode" for development
# Rules will be configured later
```

#### 4.2 Authentication
```bash
# Enable Email/Password authentication
# Enable Anonymous authentication (for offline)
```

#### 4.3 Hosting
```bash
# Public directory: frontend/dist
# Single-page app: Yes
# Overwrite index.html: No
```

#### 4.4 Functions
```bash
# Language: JavaScript
# ESLint: Yes
# Install dependencies: Yes
```

---

## 🔧 Backend Migration to Firebase Functions

### Step 5: Convert Node.js Backend to Cloud Functions

Create `functions/src/index.js`:

```javascript
const functions = require('firebase-functions');
const admin = require('firebase-admin');
const express = require('express');
const cors = require('cors');

admin.initializeApp();
const db = admin.firestore();

const app = express();
app.use(cors({ origin: true }));
app.use(express.json());

// Health check
app.get('/health', (req, res) => {
  res.json({ status: 'OK', timestamp: new Date().toISOString() });
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
      const searchLower = search.toLowerCase();
      patients = patients.filter(patient => 
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
      error: error.message
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
      error: error.message
    });
  }
});

// Export the Express app as a Cloud Function
exports.api = functions.https.onRequest(app);
```

### Step 6: Update Frontend for Firebase

#### 6.1 Install Firebase SDK
```bash
cd frontend
npm install firebase
```

#### 6.2 Create Firebase Config
Create `frontend/src/lib/firebase.ts`:

```typescript
import { initializeApp } from 'firebase/app';
import { getFirestore, connectFirestoreEmulator } from 'firebase/firestore';
import { getAuth, connectAuthEmulator } from 'firebase/auth';
import { getFunctions, connectFunctionsEmulator } from 'firebase/functions';

const firebaseConfig = {
  apiKey: "your-api-key",
  authDomain: "ccmis-healthcare.firebaseapp.com",
  projectId: "ccmis-healthcare",
  storageBucket: "ccmis-healthcare.appspot.com",
  messagingSenderId: "123456789",
  appId: "your-app-id"
};

const app = initializeApp(firebaseConfig);
export const db = getFirestore(app);
export const auth = getAuth(app);
export const functions = getFunctions(app);

// Connect to emulators in development
if (import.meta.env.DEV) {
  connectFirestoreEmulator(db, 'localhost', 8080);
  connectAuthEmulator(auth, 'http://localhost:9099');
  connectFunctionsEmulator(functions, 'localhost', 5001);
}

export default app;
```

#### 6.3 Update API Configuration
Update `frontend/src/config/api.ts`:

```typescript
import { functions } from '../lib/firebase';
import { httpsCallable } from 'firebase/functions';

const isDevelopment = import.meta.env.DEV;
const isProduction = import.meta.env.PROD;

export const API_BASE_URL = isProduction 
  ? 'https://us-central1-ccmis-healthcare.cloudfunctions.net/api'  // Replace with your region
  : 'http://localhost:5001/ccmis-healthcare/us-central1/api';

export const config = {
  API_BASE_URL,
  isDevelopment,
  isProduction
};

export default config;
```

---

## 🔐 Security Rules

### Step 7: Configure Firestore Security Rules

Create `firestore.rules`:

```javascript
rules_version = '2';
service cloud.firestore {
  match /databases/{database}/documents {
    // Users can only access their hospital's data
    match /patients/{patientId} {
      allow read, write: if request.auth != null 
        && request.auth.token.hospitalId == resource.data.hospitalId;
      allow create: if request.auth != null 
        && request.auth.token.hospitalId == request.resource.data.hospitalId;
    }
    
    match /consultations/{consultationId} {
      allow read, write: if request.auth != null 
        && request.auth.token.hospitalId == resource.data.hospitalId;
      allow create: if request.auth != null 
        && request.auth.token.hospitalId == request.resource.data.hospitalId;
    }
    
    match /tasks/{taskId} {
      allow read, write: if request.auth != null 
        && request.auth.token.hospitalId == resource.data.hospitalId;
      allow create: if request.auth != null 
        && request.auth.token.hospitalId == request.resource.data.hospitalId;
    }
    
    // Hospitals collection
    match /hospitals/{hospitalId} {
      allow read: if request.auth != null 
        && (request.auth.token.hospitalId == hospitalId || request.auth.token.role == 'SUPER_ADMIN');
    }
    
    // Users collection
    match /users/{userId} {
      allow read, write: if request.auth != null 
        && (request.auth.uid == userId || request.auth.token.role in ['ADMIN', 'SUPER_ADMIN']);
    }
  }
}
```

### Step 8: Configure Authentication

Create `auth.js` in functions:

```javascript
const admin = require('firebase-admin');

// Custom token creation for offline access
exports.createOfflineToken = functions.https.onCall(async (data, context) => {
  if (!context.auth) {
    throw new functions.https.HttpsError('unauthenticated', 'User must be authenticated');
  }
  
  const { hospitalId, role } = data;
  
  const customToken = await admin.auth().createCustomToken(context.auth.uid, {
    hospitalId,
    role,
    offlineAccess: true
  });
  
  return { customToken };
});

// Validate offline session
exports.validateOfflineSession = functions.https.onCall(async (data, context) => {
  if (!context.auth) {
    throw new functions.https.HttpsError('unauthenticated', 'User must be authenticated');
  }
  
  const { offlineToken } = data;
  
  try {
    const decodedToken = await admin.auth().verifyIdToken(offlineToken);
    return { 
      isValid: true, 
      user: decodedToken,
      hospitalId: decodedToken.hospitalId 
    };
  } catch (error) {
    return { isValid: false, error: error.message };
  }
});
```

---

## 📱 Offline-First Implementation

### Step 9: Update Frontend for Firebase Offline

Update `frontend/src/lib/offlineAuth.ts`:

```typescript
import { auth, db } from './firebase';
import { signInWithEmailAndPassword, signInWithCustomToken } from 'firebase/auth';
import { doc, getDoc, setDoc, onSnapshot } from 'firebase/firestore';

export class OfflineAuthService {
  private session: any = null;

  async initializeOfflineSession(): Promise<boolean> {
    const storedSession = localStorage.getItem('offlineSession');
    if (storedSession) {
      this.session = JSON.parse(storedSession);
      return await this.validateOfflineSession();
    }
    return false;
  }

  async login(email: string, password: string): Promise<boolean> {
    try {
      const userCredential = await signInWithEmailAndPassword(auth, email, password);
      const user = userCredential.user;
      
      // Get user data from Firestore
      const userDoc = await getDoc(doc(db, 'users', user.uid));
      const userData = userDoc.data();
      
      if (userData?.role === 'HCW') {
        // Create offline token for HCW users
        const customToken = await this.createOfflineToken(user.uid, userData);
        
        this.session = {
          userId: user.uid,
          hospitalId: userData.hospitalId,
          role: userData.role,
          offlineToken: customToken,
          lastSync: new Date().toISOString(),
          isActive: true
        };
        
        localStorage.setItem('offlineSession', JSON.stringify(this.session));
        return true;
      }
      
      return true;
    } catch (error) {
      console.error('Login error:', error);
      return false;
    }
  }

  async validateOfflineSession(): Promise<boolean> {
    if (!this.session) return false;
    
    try {
      // Try to sign in with custom token
      await signInWithCustomToken(auth, this.session.offlineToken);
      return true;
    } catch (error) {
      console.error('Offline session validation failed:', error);
      await this.logout();
      return false;
    }
  }

  async syncHospitalData(): Promise<boolean> {
    if (!this.session || !navigator.onLine) return false;
    
    try {
      // Firestore automatically handles offline sync
      // Just update the last sync timestamp
      this.session.lastSync = new Date().toISOString();
      localStorage.setItem('offlineSession', JSON.stringify(this.session));
      return true;
    } catch (error) {
      console.error('Sync error:', error);
      return false;
    }
  }

  private async createOfflineToken(uid: string, userData: any): Promise<string> {
    // This would call your Cloud Function to create a custom token
    const response = await fetch('/api/createOfflineToken', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ hospitalId: userData.hospitalId, role: userData.role })
    });
    
    const data = await response.json();
    return data.customToken;
  }

  async logout(): Promise<void> {
    this.session = null;
    localStorage.removeItem('offlineSession');
    await auth.signOut();
  }

  isOfflineLoggedIn(): boolean {
    return this.session?.isActive === true;
  }

  canAccessHospital(hospitalId: string): boolean {
    if (!this.session) return false;
    if (this.session.role === 'SUPER_ADMIN') return true;
    return this.session.hospitalId === hospitalId;
  }
}

export const offlineAuth = new OfflineAuthService();
```

---

## 🚀 Deployment Commands

### Step 10: Deploy to Firebase

```bash
# Build frontend
cd frontend
npm run build

# Deploy everything
cd ..
firebase deploy

# Deploy specific services
firebase deploy --only hosting    # Frontend only
firebase deploy --only functions  # Backend only
firebase deploy --only firestore  # Database rules only
```

### Step 11: Environment Configuration

Create `functions/.env`:

```bash
NODE_ENV=production
FIREBASE_PROJECT_ID=ccmis-healthcare
```

---

## 📊 Firebase vs cPanel Comparison

| Feature | Firebase | cPanel |
|---------|----------|---------|
| **Database** | ✅ Firestore (NoSQL) | ❌ MySQL (SQL) |
| **Real-time Sync** | ✅ Built-in | ❌ Manual setup |
| **Offline Support** | ✅ Native | ❌ Complex |
| **Authentication** | ✅ Built-in | ❌ Manual JWT |
| **Hosting** | ✅ Free & Fast | ✅ Included |
| **Scaling** | ✅ Automatic | ❌ Manual |
| **Cost** | ✅ Free tier | ✅ Fixed cost |
| **Setup Time** | ✅ 30 minutes | ❌ 2-3 hours |

---

## 🎯 Benefits of Firebase for CCMIS

1. **Perfect Database Match** - Firestore is document-based like MongoDB
2. **Real-time Updates** - Automatic sync across devices
3. **Offline-First** - Built-in offline capabilities
4. **Authentication** - Secure user management
5. **Scalability** - Handles growth automatically
6. **Cost-Effective** - Free tier covers small-medium usage
7. **Modern Stack** - Latest web technologies
8. **Easy Deployment** - One command deployment

---

## 🔧 Migration Steps Summary

1. ✅ Create Firebase project
2. ✅ Install Firebase CLI
3. ✅ Initialize Firebase services
4. ✅ Convert Node.js backend to Cloud Functions
5. ✅ Update frontend for Firebase
6. ✅ Configure security rules
7. ✅ Implement offline authentication
8. ✅ Deploy to Firebase

**Result**: A modern, scalable, offline-first healthcare management system! 🏥✨

---

## 📞 Support

- **Firebase Docs**: [firebase.google.com/docs](https://firebase.google.com/docs)
- **Firebase Console**: [console.firebase.google.com](https://console.firebase.google.com)
- **Community**: [Firebase Discord](https://discord.gg/firebase)

**Your CCMIS system will be much better on Firebase! 🚀**
