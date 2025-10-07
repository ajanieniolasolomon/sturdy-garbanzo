import {
  signInWithEmailAndPassword,
  signOut,
  onAuthStateChanged,
  type User as FirebaseUser
} from 'firebase/auth';
import {
  doc,
  getDoc,
  collection,
  query,
  where,
  orderBy,
  getDocs,
  setDoc,
  updateDoc,
  serverTimestamp,
  onSnapshot
} from 'firebase/firestore';
import { auth, db } from '../config/firebase';
import type {
  User,
  Hospital,
  Patient,
  Consultation,
  Task,
  ApiResponse,
  LoginForm,
  PatientForm,
  UserForm,
  HospitalForm,
  ConsultationForm,
  TaskForm
} from '../types';
import { getFunctions, httpsCallable } from 'firebase/functions';

class FirebaseService {
  private listeners: { [key: string]: () => void } = {};

  constructor() {
    // Firebase service initialized
  }

  // Authentication methods
  async login(credentials: LoginForm): Promise<User> {
    try {
      const userCredential = await signInWithEmailAndPassword(
        auth,
        credentials.email,
        credentials.password
      );

      // Get user data from Firestore
      const userDoc = await getDoc(doc(db, 'users', userCredential.user.uid));
      if (!userDoc.exists()) {
        throw new Error('User data not found');
      }

      const userData = userDoc.data() as User;
      return { ...userData, id: userCredential.user.uid };
    } catch (error) {
      console.error('Login error:', error);
      throw error;
    }
  }

  async logout(): Promise<void> {
    try {
      await signOut(auth);
    } catch (error) {
      console.error('Logout error:', error);
      throw error;
    }
  }

  onAuthStateChanged(callback: (user: User | null) => void): () => void {
    return onAuthStateChanged(auth, async (firebaseUser: FirebaseUser | null) => {
      try {
        if (firebaseUser) {
          try {
            // First, try to get the user document
            const userDoc = await getDoc(doc(db, 'users', firebaseUser.uid));
            if (userDoc.exists()) {
              const userData = userDoc.data() as User;
              callback({ ...userData, id: firebaseUser.uid });
            } else {
              console.warn('User document not found for:', firebaseUser.email);
              callback(null);
            }
          } catch (error: any) {
            console.error('Auth state change error:', error);
            // If there's a permissions error, it might be because claims aren't set up yet
            // Let's try to create a basic user object from Firebase Auth data
            if ((error as any).code === 'permission-denied' || (error as any).message?.includes('Missing or insufficient permissions')) {
              console.warn('Permissions error - user may need claims setup. Creating basic user object.');
              // Create a minimal user object from Firebase Auth data
              const basicUser: User = {
                id: firebaseUser.uid,
                email: firebaseUser.email || '',
                fullName: firebaseUser.displayName || firebaseUser.email?.split('@')[0] || 'Unknown User',
                username: firebaseUser.email?.split('@')[0] || 'unknown',
                role: 'HCW', // Default role
                hospitalId: undefined as string | undefined,
                isActive: true,
                createdAt: new Date().toISOString(),
                updatedAt: new Date().toISOString()
              };
              callback(basicUser);
            } else {
              callback(null);
            }
          }
        } else {
          callback(null);
        }
      } catch (error) {
        console.error('Critical auth state change error:', error);
        callback(null);
      }
    });
  }

  // Hospital methods
  streamHospitals(callback: (response: ApiResponse<Hospital>) => void): () => void {
    const q = query(
      collection(db, 'hospitals'),
      where('isActive', '==', true),
      orderBy('createdAt', 'desc')
    );
    return onSnapshot(q, (snapshot) => {
      const hospitals = snapshot.docs.map(doc => ({ id: doc.id, ...doc.data() })) as Hospital[];
      callback({ data: hospitals, total: hospitals.length, success: true });
    });
  }
  async getHospitals(): Promise<ApiResponse<Hospital>> {
    try {
      const q = query(
        collection(db, 'hospitals'),
        where('isActive', '==', true),
        orderBy('createdAt', 'desc')
      );
      const querySnapshot = await getDocs(q);
      const hospitals = querySnapshot.docs.map(doc => ({
        id: doc.id,
        ...doc.data()
      })) as Hospital[];
      
      return { data: hospitals, total: hospitals.length, success: true };
    } catch (error) {
      console.error('Get hospitals error:', error);
      throw error;
    }
  }

  async createHospital(hospitalData: HospitalForm): Promise<Hospital> {
    try {
      const newHospital: Omit<Hospital, 'id'> = {
        ...hospitalData,
        capacity: typeof hospitalData.capacity === 'string' ? parseInt(hospitalData.capacity) || 0 : hospitalData.capacity,
        isActive: true,
        createdAt: serverTimestamp() as any,
        updatedAt: serverTimestamp() as any,
      };
      
      const docRef = doc(collection(db, 'hospitals'));
      const docId = docRef.id;
      await setDoc(docRef, { ...newHospital, id: docId });
      
      return {
        id: docId,
        ...newHospital,
        createdAt: new Date().toISOString(),
        updatedAt: new Date().toISOString()
      } as Hospital;
    } catch (error) {
      console.error('Create hospital error:', error);
      throw error;
    }
  }

  async updateHospital(id: string, hospitalData: Partial<HospitalForm>): Promise<void> {
    try {
      const docRef = doc(db, 'hospitals', id);
      await updateDoc(docRef, {
        ...hospitalData,
        updatedAt: serverTimestamp()
      });
    } catch (error) {
      console.error('Update hospital error:', error);
      throw error;
    }
  }

  async deleteHospital(id: string): Promise<void> {
    try {
      const docRef = doc(db, 'hospitals', id);
      await updateDoc(docRef, {
        isActive: false,
        updatedAt: serverTimestamp()
      });
    } catch (error) {
      console.error('Delete hospital error:', error);
      throw error;
    }
  }

  // Patient methods
  async getPatients(): Promise<ApiResponse<Patient>> {
    try {
      let q = query(
        collection(db, 'patients'),
  
      );
      
      // if (hospitalId) {
      //   q = query(q, where('hospitalId', '==', hospitalId));
      // }
      // if (assignedHCW) {
      //   q = query(q, where('assignedHCW', '==', assignedHCW));
      // }
      
      const querySnapshot = await getDocs(q);
      const patients = querySnapshot.docs.map(doc => ({
        id: doc.id,
        ...doc.data()
      })) as Patient[];
      console.log(patients)
      return { data: patients, total: patients.length, success: true };
    } catch (error) {
      console.error('Get patients error:', error);
      throw error;
    }
  }

  streamPatients(
    hospitalId: string | undefined,
    callback: (response: ApiResponse<Patient>) => void
  ): () => void {
    let qRef = query(
      collection(db, 'patients'),
      where('isActive', '==', true),
      orderBy('createdAt', 'desc')
    );
    if (hospitalId) {
      qRef = query(qRef, where('hospitalId', '==', hospitalId));
    }
    // Subscribe to Firestore (online/offline persistence) and also reflect local cache change notifications
    const unsubscribeFirestore = onSnapshot(qRef, (snapshot) => {
      const patients = snapshot.docs.map(doc => ({ id: doc.id, ...doc.data() })) as Patient[];
      callback({ data: patients, total: patients.length, success: true });
    });

    // Additionally, poll local cache briefly to surface queued creates immediately if Firestore snapshot hasn't updated yet
    const cacheKey = 'ccmis_cache_patients';
    const cacheInterval = window.setInterval(() => {
      try {
        const cachedRaw = localStorage.getItem(cacheKey);
        if (!cachedRaw) return;
        const cached = JSON.parse(cachedRaw) as any[];
        const filtered = hospitalId ? cached.filter(p => p.hospitalId === hospitalId && p.isActive !== false) : cached;
        if (Array.isArray(filtered) && filtered.length > 0) {
          callback({ data: filtered as Patient[], total: filtered.length, success: true });
        }
      } catch (_) {
        // ignore
      }
    }, 1500);

    return () => {
      unsubscribeFirestore();
      window.clearInterval(cacheInterval);
    };
  }

  async createPatient(patientData: PatientForm & { hospitalId: string }) {

  //  console.log("Creating patient with data:", patientData, "by user:", userId);
    try {
      const newPatient: Omit<Patient, 'id'> = {
        ...patientData,
        age: typeof patientData.age === 'string' ? parseInt(patientData.age) || 0 : patientData.age,
        isActive: true,
        createdAt: serverTimestamp() as any,
        updatedAt: serverTimestamp() as any,
      };
      
      const docRef = doc(collection(db, 'patients'));
      const docId = docRef.id;
      
      await setDoc(docRef, { ...newPatient, id: docId });
      
      return {
        id: docId,
        ...newPatient,
        createdAt: new Date().toISOString(),
        updatedAt: new Date().toISOString()
      } as Patient;
    } catch (error) {
      console.error('Create patient error:', error);
      throw error;
    }
  }

  async updatePatient(id: string, patientData: Partial<PatientForm>): Promise<void> {
    console.log('🔴 Updating patient:', id);
    try {
      // Clean the data by removing undefined, null, and empty string values
      const cleanedData: Record<string, any> = {};
      
      Object.entries(patientData).forEach(([key, value]) => {
        // Keep values that are not undefined, null, or empty strings
        // But allow 0 and false as valid values
        if (value !== undefined && value !== null) {
          // For strings, exclude empty strings, but allow 0 and false
          if (typeof value === 'string' && value === '') {
            // Skip empty strings
            return;
          }
          cleanedData[key] = value;
        }
      });

      // Add updatedAt timestamp
      cleanedData.updatedAt = serverTimestamp();

      console.log('🔵 Cleaned update data:', cleanedData);

      const docRef = doc(db, 'patients', id);
      await updateDoc(docRef, cleanedData);
    } catch (error) {
      console.error('Update patient error:', error);
      throw error;
    }
  }

  async deletePatient(id: string): Promise<void> {
    try {
      const docRef = doc(db, 'patients', id);
      await updateDoc(docRef, {
        isActive: false,
        updatedAt: serverTimestamp()
      });
    } catch (error) {
      console.error('Delete patient error:', error);
      throw error;
    }
  }

  // User methods
  async getUsers(hospitalId?: string): Promise<ApiResponse<User>> {
    try {
      let q = query(
        collection(db, 'users'),
        where('isActive', '==', true),
        orderBy('createdAt', 'desc')
      );
      
      if (hospitalId) {
        q = query(q, where('hospitalId', '==', hospitalId));
      }
      
      const querySnapshot = await getDocs(q);
      const users = querySnapshot.docs.map(doc => ({
        id: doc.id,
        ...doc.data()
      })) as User[];
      
      return { data: users, total: users.length, success: true };
    } catch (error) {
      console.error('Get users error:', error);
      throw error;
    }
  }

  streamUsers(
    hospitalId: string | undefined,
    callback: (response: ApiResponse<User>) => void
  ): () => void {
    let qRef = query(
      collection(db, 'users'),
      where('isActive', '==', true),
      orderBy('createdAt', 'desc')
    );
    if (hospitalId) {
      qRef = query(qRef, where('hospitalId', '==', hospitalId));
    }
    return onSnapshot(qRef, (snapshot) => {
      const users = snapshot.docs.map(doc => ({ id: doc.id, ...doc.data() })) as User[];
      callback({ data: users, total: users.length, success: true });
    });
  }

  async createUser(userData: UserForm & { hospitalId?: string }) {

     try {
    const functions = getFunctions();
    const createUserFn = httpsCallable(functions, "createUser");

    const result = await createUserFn(userData);

    console.log("✅ User created via Cloud Function:", result.data);
    return result.data;
  } catch (error) {
    console.error("❌ Error creating user:", error);
    throw error;
  }

  }

  async updateUser(id: string, userData: Partial<UserForm>): Promise<void> {
    try {
      const docRef = doc(db, 'users', id);
      await updateDoc(docRef, {
        ...userData,
        updatedAt: serverTimestamp()
      });
    } catch (error) {
      console.error('Update user error:', error);
      throw error;
    }
  }

  async deleteUser(id: string): Promise<void> {
    try {
      const docRef = doc(db, 'users', id);
      await updateDoc(docRef, {
        isActive: false,
        updatedAt: serverTimestamp()
      });
    } catch (error) {
      console.error('Delete user error:', error);
      throw error;
    }
  }

  // Consultation methods
  async getConsultations(patientId?: string, hospitalId?: string, hcwId?: string): Promise<ApiResponse<Consultation>> {
    try {
      let q = query(
        collection(db, 'consultations'),
        where('isActive', '==', true),
        orderBy('consultationDate', 'desc')
      );
      
      if (patientId) {
        q = query(q, where('patientId', '==', patientId));
      }
      
      if (hospitalId) {
        q = query(q, where('hospitalId', '==', hospitalId));
      }
      if (hcwId) {
        q = query(q, where('hcwId', '==', hcwId));
      }
      
      const querySnapshot = await getDocs(q);
      const consultations = querySnapshot.docs.map(doc => ({
        id: doc.id,
        ...doc.data()
      })) as Consultation[];
      
      return { data: consultations, total: consultations.length, success: true };
    } catch (error) {
      console.error('Get consultations error:', error);
      throw error;
    }
  }

  streamConsultations(
    patientId: string | undefined,
    hospitalId: string | undefined,
    callback: (response: ApiResponse<Consultation>) => void
  ): () => void {
    let qRef = query(
      collection(db, 'consultations'),
      where('isActive', '==', true),
      orderBy('consultationDate', 'desc')
    );
    if (patientId) {
      qRef = query(qRef, where('patientId', '==', patientId));
    }
    if (hospitalId) {
      qRef = query(qRef, where('hospitalId', '==', hospitalId));
    }
    const unsubscribeFirestore = onSnapshot(qRef, (snapshot) => {
      const consultations = snapshot.docs.map(doc => ({ id: doc.id, ...doc.data() })) as Consultation[];
      callback({ data: consultations, total: consultations.length, success: true });
    });

    const cacheKey = 'ccmis_cache_consultations';
    const cacheInterval = window.setInterval(() => {
      try {
        const cachedRaw = localStorage.getItem(cacheKey);
        if (!cachedRaw) return;
        const cached = JSON.parse(cachedRaw) as any[];
        let filtered = cached.filter(c => c.isActive !== false);
        if (patientId) filtered = filtered.filter(c => c.patientId === patientId);
        if (hospitalId) filtered = filtered.filter(c => c.hospitalId === hospitalId);
        if (Array.isArray(filtered) && filtered.length > 0) {
          callback({ data: filtered as Consultation[], total: filtered.length, success: true });
        }
      } catch (_) {
        // ignore
      }
    }, 1500);

    return () => {
      unsubscribeFirestore();
      window.clearInterval(cacheInterval);
    };
  }

  async createConsultation(consultationData: ConsultationForm & { 
    patientName: string; 
    hcwId: string; 
    hcwName: string; 
    hospitalId: string; 
  }): Promise<Consultation> {
    try {
      const vitals = {
        temperatureC: (consultationData as any).temperatureC !== '' ? Number((consultationData as any).temperatureC) : undefined,
        pulseBpm: (consultationData as any).pulseBpm !== '' ? Number((consultationData as any).pulseBpm) : undefined,
        respirationRate: (consultationData as any).respirationRate !== '' ? Number((consultationData as any).respirationRate) : undefined,
        bpSystolic: (consultationData as any).bpSystolic !== '' ? Number((consultationData as any).bpSystolic) : undefined,
        bpDiastolic: (consultationData as any).bpDiastolic !== '' ? Number((consultationData as any).bpDiastolic) : undefined,
      };
      const weightKg = (consultationData as any).weightKg !== '' ? Number((consultationData as any).weightKg) : undefined;
      const heightCm = (consultationData as any).heightCm !== '' ? Number((consultationData as any).heightCm) : undefined;
      const newConsultation: Omit<Consultation, 'id'> = {
        ...consultationData,
        vitals,
        weightKg,
        heightCm,
        isActive: true,
        createdAt: serverTimestamp() as any,
        updatedAt: serverTimestamp() as any,
      };
      
      const docRef = doc(collection(db, 'consultations'));
      const docId = docRef.id;
      await setDoc(docRef, { ...newConsultation, id: docId });
      
      // Auto-create a follow-up task if followUpDate provided
      if ((consultationData as any).followUpDate) {
        const followupTask: any = {
          title: `Follow-up: ${consultationData.patientName}`,
          description: consultationData.diagnosis ? `Diagnosis: ${consultationData.diagnosis}` : 'Follow-up visit',
          priority: 'medium',
          status: 'pending',
          dueDate: (consultationData as any).followUpDate,
          assignedTo: consultationData.hcwId,
          assignedToName: consultationData.hcwName,
          hospitalId: consultationData.hospitalId,
          patientId: consultationData.patientId,
          patientName: consultationData.patientName,
          isActive: true,
          createdAt: serverTimestamp() as any,
          updatedAt: serverTimestamp() as any,
        };
        const taskRef = doc(collection(db, 'tasks'));
        await setDoc(taskRef, { ...followupTask, id: taskRef.id });
      }

      // If patient seen today, auto-complete any follow-up task due today
      try {
        const today = new Date(consultationData.consultationDate).toISOString().split('T')[0];
        await this.completeFollowupTasksForDate(consultationData.patientId, consultationData.hospitalId, today);
      } catch (_) {}

      return {
        id: docId,
        ...newConsultation,
        createdAt: new Date().toISOString(),
        updatedAt: new Date().toISOString()
      } as Consultation;
    } catch (error) {
      console.error('Create consultation error:', error);
      throw error;
    }
  }

  async updateConsultation(id: string, consultationData: Partial<ConsultationForm>): Promise<void> {
    try {
      const vitals = {
        temperatureC: (consultationData as any).temperatureC !== '' ? Number((consultationData as any).temperatureC) : undefined,
        pulseBpm: (consultationData as any).pulseBpm !== '' ? Number((consultationData as any).pulseBpm) : undefined,
        respirationRate: (consultationData as any).respirationRate !== '' ? Number((consultationData as any).respirationRate) : undefined,
        bpSystolic: (consultationData as any).bpSystolic !== '' ? Number((consultationData as any).bpSystolic) : undefined,
        bpDiastolic: (consultationData as any).bpDiastolic !== '' ? Number((consultationData as any).bpDiastolic) : undefined,
      };
      const weightKg = (consultationData as any).weightKg !== '' ? Number((consultationData as any).weightKg) : undefined;
      const heightCm = (consultationData as any).heightCm !== '' ? Number((consultationData as any).heightCm) : undefined;
      const payload: any = {
        ...consultationData,
        ...(Object.values(vitals).some(v => v !== undefined) ? { vitals } : {}),
        ...(weightKg !== undefined ? { weightKg } : {}),
        ...(heightCm !== undefined ? { heightCm } : {}),
        updatedAt: serverTimestamp()
      };
      const docRef = doc(db, 'consultations', id);
      await updateDoc(docRef, payload);
      // If consultationDate is provided/changed, complete follow-up tasks for that date
      if ((consultationData as any).consultationDate && (consultationData as any).patientId && (consultationData as any).hospitalId) {
        const dateStr = new Date((consultationData as any).consultationDate).toISOString().split('T')[0];
        await this.completeFollowupTasksForDate((consultationData as any).patientId, (consultationData as any).hospitalId, dateStr);
      }
    } catch (error) {
      console.error('Update consultation error:', error);
      throw error;
    }
  }

  private async completeFollowupTasksForDate(patientId: string, hospitalId: string, dateYYYYMMDD: string): Promise<void> {
    try {
      // Query tasks for patient and due date
      const qRef = query(
        collection(db, 'tasks'),
        where('isActive', '==', true),
        where('patientId', '==', patientId),
        where('hospitalId', '==', hospitalId),
        where('status', '==', 'pending')
      );
      const snap = await getDocs(qRef);
      const toComplete = snap.docs
        .map(d => ({ id: d.id, ...d.data() } as any))
        .filter(t => (t.dueDate || '').toString().split('T')[0] === dateYYYYMMDD);
      for (const t of toComplete) {
        const taskDocRef = doc(db, 'tasks', t.id);
        await updateDoc(taskDocRef, { status: 'completed', updatedAt: serverTimestamp() });
      }
    } catch (e) {
      console.warn('Auto-complete follow-up tasks failed:', e);
    }
  }

  async deleteConsultation(id: string): Promise<void> {
    try {
      const docRef = doc(db, 'consultations', id);
      await updateDoc(docRef, {
        isActive: false,
        updatedAt: serverTimestamp()
      });
    } catch (error) {
      console.error('Delete consultation error:', error);
      throw error;
    }
  }

  // Task methods
  async getTasks(hospitalId?: string, assignedTo?: string, status?: string): Promise<ApiResponse<Task>> {
    try {
      let q = query(
        collection(db, 'tasks'),
        where('isActive', '==', true),
        orderBy('dueDate', 'asc')
      );
      
      if (hospitalId) {
        q = query(q, where('hospitalId', '==', hospitalId));
      }
      
      if (assignedTo) {
        q = query(q, where('assignedTo', '==', assignedTo));
      }
      
      if (status) {
        q = query(q, where('status', '==', status));
      }
      
      const querySnapshot = await getDocs(q);
      const tasks = querySnapshot.docs.map(doc => ({
        id: doc.id,
        ...doc.data()
      })) as Task[];
      console.log('tasks', tasks);
      return { data: tasks, total: tasks.length, success: true };
    } catch (error) {
      console.error('Get tasks error:', error);
      throw error;
    }
  }

  streamTasks(
    hospitalId: string | undefined,
    assignedTo: string | undefined,
    status: string | undefined,
    callback: (response: ApiResponse<Task>) => void
  ): () => void {
    let qRef = query(
      collection(db, 'tasks'),
      where('isActive', '==', true),
      orderBy('dueDate', 'asc')
    );
    if (hospitalId) {
      qRef = query(qRef, where('hospitalId', '==', hospitalId));
    }
    if (assignedTo) {
      qRef = query(qRef, where('assignedTo', '==', assignedTo));
    }
    if (status) {
      qRef = query(qRef, where('status', '==', status));
    }
    const unsubscribeFirestore = onSnapshot(qRef, (snapshot) => {
      const tasks = snapshot.docs.map(doc => ({ id: doc.id, ...doc.data() })) as Task[];
      callback({ data: tasks, total: tasks.length, success: true });
    });

    const cacheKey = 'ccmis_cache_tasks';
    const cacheInterval = window.setInterval(() => {
      try {
        const cachedRaw = localStorage.getItem(cacheKey);
        if (!cachedRaw) return;
        const cached = JSON.parse(cachedRaw) as any[];
        let filtered = cached.filter(t => t.isActive !== false);
        if (hospitalId) filtered = filtered.filter(t => t.hospitalId === hospitalId);
        if (assignedTo) filtered = filtered.filter(t => t.assignedTo === assignedTo);
        if (status) filtered = filtered.filter(t => t.status === status);
        if (Array.isArray(filtered) && filtered.length > 0) {
          callback({ data: filtered as Task[], total: filtered.length, success: true });
        }
      } catch (_) {
        // ignore
      }
    }, 1500);

    return () => {
      unsubscribeFirestore();
      window.clearInterval(cacheInterval);
    };
  }

  async createTask(taskData: TaskForm & { 
    assignedToName: string; 
    hospitalId: string; 
    patientName?: string; 
  }): Promise<Task> {
    try {
      const newTask: Omit<Task, 'id'> = {
        ...taskData,
        isActive: true,
        status: 'pending',
        createdAt: serverTimestamp() as any,
        updatedAt: serverTimestamp() as any,
      };
      
      const docRef = doc(collection(db, 'tasks'));
      const docId = docRef.id;
      await setDoc(docRef, { ...newTask, id: docId });
      
      return {
        id: docId,
        ...newTask,
        createdAt: new Date().toISOString(),
        updatedAt: new Date().toISOString()
      } as Task;
    } catch (error) {
      console.error('Create task error:', error);
      throw error;
    }
  }

  async updateTask(id: string, taskData: Partial<TaskForm & { assignedToName?: string }>): Promise<void> {
    console.log('🔴 Updating task:', id);
    console.log('🔵 Task data:', taskData);
    try {
      const docRef = doc(db, 'tasks', id);
      await updateDoc(docRef, {
        ...taskData,
        updatedAt: serverTimestamp()
      });
    } catch (error) {
      console.error('Update task error:', error);
      throw error;
    }
  }

  async deleteTask(id: string): Promise<void> {
    try {
      const docRef = doc(db, 'tasks', id);
      await updateDoc(docRef, {
        isActive: false,
        updatedAt: serverTimestamp()
      });
    } catch (error) {
      console.error('Delete task error:', error);
      throw error;
    }
  }


  // Cleanup
  cleanup(): void {
    Object.values(this.listeners).forEach(unsubscribe => unsubscribe());
    this.listeners = {};
  }
}

// Create singleton instance
const firebaseService = new FirebaseService();
export default firebaseService;
