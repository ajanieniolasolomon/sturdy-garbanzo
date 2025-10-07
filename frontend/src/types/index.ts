// Production-ready types for CCMIS Firebase system

export interface User {
  id: string;
  uid?: string;
  username: string;
  email: string;
  fullName: string;
  role: 'SUPER_ADMIN' | 'ADMIN' | 'HCW';
  hospitalId?: string;
  hospitalName?: string;
  isActive: boolean;
  createdAt: string;
  updatedAt: string;
}

export interface Hospital {
  id: string;
  name: string;
  address: string;
  city?: string;
  lga: string;
  state: string;
  country?: string;
  phone?: string;
  phoneNumber?: string;
  email?: string;
  website?: string;
  description?: string;
  capacity?: number;
  specialties?: string[];
  isActive: boolean;
  createdAt: string;
  updatedAt: string;
}

export interface Patient {
  id: string;
  fullName: string;
  ccNumber: string;
  phone?: string;
  phoneNumber?: string;
  age?: number;
  gender: 'Male' | 'Female';
  address?: string;
  lga?: string;
  state?: string;
  country: string;
  nationality: 'Nigerian' | 'Refugee' | 'Others';
  note?: string;
  notes?: string; // Keep for backward compatibility
  status: 'new_case' | 'transferred_in' | 'transferred_out' | 'loss_to_follow_up' | 'dead' | 'stopped' | 'on_treatment' | 'On Treatment';
  assignedHCW?: string;
  emergencyContact?: string;
  medicalHistory?: string;
  allergies?: string;
  currentMedications?: string;
  hospitalId: string;
  patient_local_id?: string;
  isActive?: boolean;
  createdAt: string;
  updatedAt: string;
}

export interface Consultation {
  id: string;
  patientId: string;
  patientName: string;
  hcwId: string;
  hcwName: string;
  hospitalId: string;
  consultationType: 'Initial' | 'Follow-up' | 'Emergency';
  chiefComplaint: string;
  diagnosis?: string;
  treatment?: string;
  treatmentPlan?: string;
  notes?: string;
  status: 'scheduled' | 'in_progress' | 'completed' | 'cancelled';
  consultationDate: string;
  followUpDate?: string;
  weightKg?: number;
  heightCm?: number;
  vitals?: {
    temperatureC?: number;
    pulseBpm?: number;
    respirationRate?: number;
    bpSystolic?: number;
    bpDiastolic?: number;
  };
  isActive: boolean;
  createdAt: string;
  updatedAt: string;
}

export interface Task {
  id: string;
  title: string;
  description?: string;
  priority: 'low' | 'medium' | 'high' | 'urgent';
  status: 'pending' | 'in_progress' | 'completed' | 'cancelled';
  dueDate?: string;
  completedAt?: string;
  assignedTo: string;
  assignedToName: string;
  hospitalId: string;
  patientId?: string;
  patientName?: string;
  isActive?: boolean;
  createdAt: string;
  updatedAt: string;
}

// API Response types
export interface ApiResponse<T> {
  data: T[];
  total: number;
  success: boolean;
  message?: string;
}

// Auth types
export interface AuthState {
  user: User | null;
  isAuthenticated: boolean;
  isLoading: boolean;
  error: string | null;
}

// UI types
export interface UIState {
  notifications: Notification[];
  isLoading: boolean;
  theme: 'light' | 'dark';
}

export interface Notification {
  id: string;
  type: 'success' | 'error' | 'warning' | 'info';
  message: string;
  timestamp: string;
}

// Form types
export interface LoginForm {
  email: string;
  password: string;
}

export interface PatientForm {
  fullName: string;
  ccNumber: string;
  phone?: string;
  phoneNumber?: string;
  age?: number | string;
  gender: 'Male' | 'Female';
  address?: string;
  lga?: string;
  state?: string;
  country: string;
  nationality: 'Nigerian' | 'Refugee' | 'Others';
  note?: string;
  notes?: string; // Keep for backward compatibility
  status: 'new_case' | 'transferred_in' | 'transferred_out' | 'loss_to_follow_up' | 'dead' | 'stopped' | 'on_treatment' | 'On Treatment';
  assignedHCW?: string;
  emergencyContact?: string;
  medicalHistory?: string;
  allergies?: string;
  currentMedications?: string;
  patient_local_id?: string;
}

export interface UserForm {
  username: string;
  email: string;
  fullName: string;
  role: 'SUPER_ADMIN' | 'ADMIN' | 'HCW';
  hospitalId?: string;
  password?: string;
}

export interface HospitalForm {
  name: string;
  address: string;
  city?: string;
  lga: string;
  state: string;
  country?: string;
  phone?: string;
  phoneNumber?: string;
  email?: string;
  website?: string;
  description?: string;
  capacity?: number | string;
  specialties?: string[];
}

export interface ConsultationForm {
  patientId: string;
  consultationType: 'Initial' | 'Follow-up' | 'Emergency';
  chiefComplaint: string;
  diagnosis?: string;
  treatment?: string;
  treatmentPlan?: string;
  notes?: string;
  status: 'scheduled' | 'in_progress' | 'completed' | 'cancelled';
  consultationDate: string;
  followUpDate?: string;
  weightKg?: number | string;
  heightCm?: number | string;
  temperatureC?: number | string;
  pulseBpm?: number | string;
  respirationRate?: number | string;
  bpSystolic?: number | string;
  bpDiastolic?: number | string;
}

export interface TaskForm {
  title: string;
  description?: string;
  priority: 'low' | 'medium' | 'high' | 'urgent';
  dueDate?: string;
  assignedTo: string;
  patientId?: string;
  patientName?: string;
}
