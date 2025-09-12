// User Creation Service for CCMIS
import { 
  createUserWithEmailAndPassword,
  updateProfile
} from 'firebase/auth';
import { 
  doc, 
  setDoc, 
  serverTimestamp 
} from 'firebase/firestore';
import { auth, db } from '../config/firebase';
import type { User } from '../types';

export interface CreateUserParams {
  email: string;
  password: string;
  fullName: string;
  username: string;
  role: 'SUPER_ADMIN' | 'ADMIN' | 'HCW';
  hospitalId?: string;
  phone?: string;
}

export interface CreateUserResult {
  success: boolean;
  user?: User;
  error?: string;
}

class UserCreationService {
  async createUser(params: CreateUserParams): Promise<CreateUserResult> {
    try {
      // 1. Create user in Firebase Authentication
      const userCredential = await createUserWithEmailAndPassword(
        auth,
        params.email,
        params.password
      );

      const firebaseUser = userCredential.user;

      // 2. Update the user's display name
      await updateProfile(firebaseUser, {
        displayName: params.fullName
      });

      // 3. Set custom claims for proper permissions
      const { getFunctions, httpsCallable } = await import('firebase/functions');
      const functions = getFunctions();
      const setUserClaims = httpsCallable(functions, 'setUserClaims');
      
      const claimsResult = await setUserClaims({
        uid: firebaseUser.uid,
        role: params.role,
        hospitalId: params.hospitalId || null
      });
      
      console.log('✅ Custom claims set:', claimsResult.data);
      
      // Force token refresh so new claims take effect immediately
      await firebaseUser.getIdToken(true);

      // 4. Create user document in Firestore
      const userData: Omit<User, 'id'> = {
        email: params.email,
        fullName: params.fullName,
        username: params.username,
        role: params.role,
        hospitalId: params.hospitalId || undefined,
        isActive: true,
        createdAt: serverTimestamp() as any,
        updatedAt: serverTimestamp() as any,
      };

      const userDocRef = doc(db, 'users', firebaseUser.uid);
      await setDoc(userDocRef, userData);

      // 5. Return the created user
      const createdUser: User = {
        id: firebaseUser.uid,
        ...userData,
        createdAt: new Date().toISOString(),
        updatedAt: new Date().toISOString()
      };

      return {
        success: true,
        user: createdUser
      };

    } catch (error: any) {
      console.error('Create user error:', error);
      
      let errorMessage = 'Failed to create user';
      
      if (error.code === 'auth/email-already-in-use') {
        errorMessage = 'Email is already in use';
      } else if (error.code === 'auth/weak-password') {
        errorMessage = 'Password is too weak';
      } else if (error.code === 'auth/invalid-email') {
        errorMessage = 'Invalid email address';
      } else if (error.message) {
        errorMessage = error.message;
      }

      return {
        success: false,
        error: errorMessage
      };
    }
  }

  async createSuperAdmin(): Promise<CreateUserResult> {
    return this.createUser({
      email: 'admin@ccmis.org',
      password: 'admin123',
      fullName: 'Super Administrator',
      username: 'superadmin',
      role: 'SUPER_ADMIN'
    });
  }

  async createHospitalAdmin(hospitalId: string, params: {
    email: string;
    password: string;
    fullName: string;
    username: string;
    phone?: string;
  }): Promise<CreateUserResult> {
    return this.createUser({
      ...params,
      role: 'ADMIN',
      hospitalId
    });
  }

  async createHCW(hospitalId: string, params: {
    email: string;
    password: string;
    fullName: string;
    username: string;
    phone?: string;
  }): Promise<CreateUserResult> {
    return this.createUser({
      ...params,
      role: 'HCW',
      hospitalId
    });
  }
}

// Create singleton instance
const userCreationService = new UserCreationService();
export default userCreationService;
