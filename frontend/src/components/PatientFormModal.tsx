import React, { useState, useEffect } from 'react';
import { useAppSelector, useAppDispatch } from '../hooks/redux';
import { addNotification } from '../store/slices/uiSlice';
import firebaseService from '../services/firebaseService';
// import validationService from '../services/validationService';
import type { Patient, PatientForm, Hospital, User } from '../types';
import {
  XMarkIcon,
  UserIcon,
  ExclamationTriangleIcon,
} from '@heroicons/react/24/outline';

interface PatientFormModalProps {
  isOpen: boolean;
  onClose: () => void;
  onSuccess: () => void;
  editingPatient?: Patient | null;
}

const PatientFormModal: React.FC<PatientFormModalProps> = ({
  isOpen,
  onClose,
  onSuccess,
  editingPatient
}) => {
  const dispatch = useAppDispatch();
  const { user } = useAppSelector(state => state.auth);
  const [loading, setLoading] = useState(false);
  const [errors, setErrors] = useState<Record<string, string>>({});
  const [hospitals, setHospitals] = useState<Hospital[]>([]);
  const [selectedHospitalId, setSelectedHospitalId] = useState<string>('');
  const [hcwUsers, setHcwUsers] = useState<User[]>([]);

 

  const [formData, setFormData] = useState<PatientForm>({
    fullName: '',
    ccNumber: '',
    age: '',
    gender: 'Male',
    address: '',
    phone: '',
    emergencyContact: '',
    medicalHistory: '',
    allergies: '',
    currentMedications: '',
    assignedHCW: '',
    country: 'Nigeria',
    nationality: 'Nigerian',
    status: 'new_case',
    note: '',
    patient_local_id: '',
  });

  useEffect(() => {
    if (isOpen) {
      if (editingPatient) {
        setFormData({
          fullName: editingPatient.fullName,
          ccNumber: editingPatient.ccNumber,
          age: editingPatient.age?.toString() || '',
          gender: editingPatient.gender,
          address: editingPatient.address || '',
          phone: editingPatient.phone || '',
          emergencyContact: editingPatient.emergencyContact || '',
          medicalHistory: editingPatient.medicalHistory || '',
          allergies: editingPatient.allergies || '',
          currentMedications: editingPatient.currentMedications || '',
          assignedHCW: editingPatient.assignedHCW || '',
          country: editingPatient.country || 'Nigeria',
          nationality: editingPatient.nationality || 'Nigerian',
          status: editingPatient.status as any,
          note: editingPatient.note || editingPatient.notes || '',
          patient_local_id: editingPatient.patient_local_id || '',
        });
        setSelectedHospitalId(editingPatient.hospitalId);
      } else {
        resetForm();
        setSelectedHospitalId(user?.hospitalId || '');
      }
    }
  }, [isOpen, editingPatient, user?.hospitalId]);

  // Load hospitals for admin/superadmin users
  useEffect(() => {
    if (isOpen && (user?.role === 'ADMIN' || user?.role === 'SUPER_ADMIN')) {
      const loadHospitals = async () => {
        try {
          const result = await firebaseService.getHospitals();
          setHospitals(result.data);
        } catch (error) {
          console.error('Error loading hospitals:', error);
        }
      };
      loadHospitals();
    }
  }, [isOpen, user?.role]);

  // Load HCW users for assignment
  useEffect(() => {
    if (isOpen) {
      const loadHcwUsers = async () => {
        try {
          const result = await firebaseService.getUsers(selectedHospitalId || user?.hospitalId);
          const hcwUsers = result.data.filter(u => u.role === 'HCW');
          setHcwUsers(hcwUsers);
        } catch (error) {
          console.error('Error loading HCW users:', error);
        }
      };
      loadHcwUsers();
    }
  }, [isOpen, selectedHospitalId, user?.hospitalId]);

  const resetForm = () => {
    setFormData({
      fullName: '',
      ccNumber: '',
      age: 0,
      gender: 'Male',
      address: '',
      phone: '',
      emergencyContact: '',
      medicalHistory: '',
      allergies: '',
      currentMedications: '',
      assignedHCW: user?.role === 'HCW' ? (user?.id || '') : '',
      country: 'Nigeria',
      nationality: 'Nigerian',
      status: 'new_case',
      note: '',
      patient_local_id: '',
    });
    setErrors({});
  };

  const handleSubmit = async (e: React.FormEvent) => {

    e.preventDefault();
    
    // Validate form
    // const validation = validationService.validateForm(
    //   formData,
    //   validationService.getPatientValidationRules()
    // );

    // if (!validation.isValid) {
    //   setErrors(validation.errors);
    //   return;
    // }
    console.log('🔴 Submitting patient2:', formData);
    try {
      setLoading(true);
      
      // Convert string values back to appropriate types
      const patientData = {
        ...formData,
        age: parseInt(formData.age?.toString() || '0') || 0,
      };
      
      if (editingPatient) {
        // Ensure hospitalId persists/updates when Admin/SuperAdmin assigns
        const updateData = {
          ...patientData,
          hospitalId: selectedHospitalId || editingPatient.hospitalId || user?.hospitalId || '',
        };
        
        // Add debugging log
        console.log('🔴 Update data before sending:', updateData);
        
        await firebaseService.updatePatient(editingPatient.id, updateData);
        dispatch(addNotification({
          type: 'success',
          message: 'Patient updated successfully'
        }));
      } else {
        await firebaseService.createPatient({
          ...patientData,
          hospitalId: selectedHospitalId || user?.hospitalId || '',
        });
        dispatch(addNotification({
          type: 'success',
          message: 'Patient created successfully'
        }));
      }
      
      onSuccess();
      onClose();
      resetForm();
    } catch (error) {
      console.error('Error saving patient:', error);
      dispatch(addNotification({
        type: 'error',
        message: 'Failed to save patient'
      }));
    } finally {
      setLoading(false);
    }
  };

  const handleInputChange = (e: React.ChangeEvent<HTMLInputElement | HTMLTextAreaElement | HTMLSelectElement>) => {
    const { name, value } = e.target;
    setFormData(prev => ({ 
      ...prev, 
      [name]: name === 'age' ? (value === '' ? '' : parseInt(value) || '') : value 
    }));
    
    // Clear error when user starts typing
    if (errors[name]) {
      setErrors(prev => ({ ...prev, [name]: '' }));
    }
  };

  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 z-50 overflow-y-auto">
      <div className="flex min-h-screen items-center justify-center p-4">
        <div className="fixed inset-0 bg-gray-500 bg-opacity-75 transition-opacity" onClick={onClose} />
        
        <div className="relative bg-white rounded-2xl shadow-2xl w-full max-w-4xl max-h-[90vh] overflow-y-auto">
          <div className="flex items-center justify-between p-6 border-b border-gray-200">
            <h3 className="text-2xl font-bold text-gray-900">
              {editingPatient ? 'Edit Patient' : 'Create New Patient'}
            </h3>
            <button
              onClick={onClose}
              className="text-gray-400 hover:text-gray-600 transition-colors"
            >
              <XMarkIcon className="h-6 w-6" />
            </button>
          </div>

          <form onSubmit={handleSubmit} className="p-6 space-y-6">
            <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
              {/* Full Name */}
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-2">
                  Full Name *
                </label>
                <div className="relative">
                  <input
                    type="text"
                    name="fullName"
                    value={formData.fullName}
                    onChange={handleInputChange}
                    className={`w-full px-4 py-3 pl-10 border rounded-xl focus:ring-2 focus:ring-primary-500 focus:border-primary-500 transition-colors ${
                      errors.fullName ? 'border-red-500' : 'border-gray-300'
                    }`}
                    placeholder="Enter patient's full name"
                  />
                  <UserIcon className="absolute left-3 top-3.5 h-5 w-5 text-gray-400" />
                </div>
                {errors.fullName && (
                  <p className="mt-1 text-sm text-red-600 flex items-center">
                    <ExclamationTriangleIcon className="h-4 w-4 mr-1" />
                    {errors.fullName}
                  </p>
                )}
              </div>

              {/* CC Number */}
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-2">
                  CC Number *
                </label>
                <input
                  type="text"
                  name="ccNumber"
                  value={formData.ccNumber}
                  onChange={handleInputChange}
                  className={`w-full px-4 py-3 border rounded-xl focus:ring-2 focus:ring-primary-500 focus:border-primary-500 transition-colors ${
                    errors.ccNumber ? 'border-red-500' : 'border-gray-300'
                  }`}
                  placeholder="Enter CC number"
                />
                {errors.ccNumber && (
                  <p className="mt-1 text-sm text-red-600 flex items-center">
                    <ExclamationTriangleIcon className="h-4 w-4 mr-1" />
                    {errors.ccNumber}
                  </p>
                )}
              </div>

              {/* Age */}
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-2">
                  Age *
                </label>
                <input
                  type="number"
                  name="age"
                  value={formData.age}
                  onChange={handleInputChange}
                  min="0"
                  max="150"
                  step="1"
                  className={`w-full px-4 py-3 border rounded-xl focus:ring-2 focus:ring-primary-500 focus:border-primary-500 transition-colors ${
                    errors.age ? 'border-red-500' : 'border-gray-300'
                  }`}
                  placeholder="Enter age"
                  style={{ WebkitAppearance: 'none', MozAppearance: 'textfield' }}
                />
                {errors.age && (
                  <p className="mt-1 text-sm text-red-600 flex items-center">
                    <ExclamationTriangleIcon className="h-4 w-4 mr-1" />
                    {errors.age}
                  </p>
                )}
              </div>

              {/* Gender */}
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-2">
                  Gender *
                </label>
                <select
                  name="gender"
                  value={formData.gender}
                  onChange={handleInputChange}
                  className={`w-full px-4 py-3 border rounded-xl focus:ring-2 focus:ring-primary-500 focus:border-primary-500 transition-colors ${
                    errors.gender ? 'border-red-500' : 'border-gray-300'
                  }`}
                >
                  <option value="">Select gender</option>
                  <option value="Male">Male</option>
                  <option value="Female">Female</option>
                </select>
                {errors.gender && (
                  <p className="mt-1 text-sm text-red-600 flex items-center">
                    <ExclamationTriangleIcon className="h-4 w-4 mr-1" />
                    {errors.gender}
                  </p>
                )}
              </div>

              {/* Nationality */}
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-2">
                  Nationality *
                </label>
                <select
                  name="nationality"
                  value={formData.nationality}
                  onChange={handleInputChange}
                  className="w-full px-4 py-3 border border-gray-300 rounded-xl focus:ring-2 focus:ring-primary-500 focus:border-primary-500 transition-colors"
                >
                  <option value="Nigerian">Nigerian</option>
                  <option value="Refugee">Refugee</option>
                  <option value="Others">Others</option>
                </select>
              </div>

              {/* Hospital Assignment - Only for Admin/SuperAdmin */}
              {(user?.role === 'ADMIN' || user?.role === 'SUPER_ADMIN') && (
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-2">
                    Assign to Hospital *
                  </label>
                  <select
                    value={selectedHospitalId}
                    onChange={(e) => setSelectedHospitalId(e.target.value)}
                    className="w-full px-4 py-3 border border-gray-300 rounded-xl focus:ring-2 focus:ring-primary-500 focus:border-primary-500 transition-colors"
                  >
                    <option value="">Select Hospital</option>
                    {hospitals.map((hospital) => (
                      <option key={hospital.id} value={hospital.id}>
                        {hospital.name}
                      </option>
                    ))}
                  </select>
                </div>
              )}

              {/* HCW Assignment - Only show for Admin/SuperAdmin */}
              {user?.role === 'ADMIN' || user?.role === 'SUPER_ADMIN' ? (
                <div>
                  <label className="block text.sm font-medium text-gray-700 mb-2">
                    Assign to Healthcare Worker
                  </label>
                  <select
                    name="assignedHCW"
                    value={formData.assignedHCW}
                    onChange={handleInputChange}
                    className="w-full px-4 py-3 border border-gray-300 rounded-xl focus:ring-2 focus:ring-primary-500 focus:border-primary-500 transition-colors"
                  >
                    <option value="">Select Healthcare Worker</option>
                    {hcwUsers.map((hcw) => (
                      <option key={hcw.id} value={hcw.id}>
                        {hcw.fullName}
                      </option>
                    ))}
                  </select>
                </div>
              ) : (
                /* For HCW users, automatically assign to themselves */
                <input type="hidden" name="assignedHCW" value={user?.id || ''} />
              )}

              {/* Phone */}
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-2">
                  Phone Number
                </label>
                <input
                  type="tel"
                  name="phone"
                  value={formData.phone}
                  onChange={handleInputChange}
                  className="w-full px-4 py-3 border border-gray-300 rounded-xl focus:ring-2 focus:ring-primary-500 focus:border-primary-500 transition-colors"
                  placeholder="Enter phone number"
                />
              </div>

              {/* Emergency Contact */}
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-2">
                  Emergency Contact
                </label>
                <input
                  type="text"
                  name="emergencyContact"
                  value={formData.emergencyContact}
                  onChange={handleInputChange}
                  className="w-full px-4 py-3 border border-gray-300 rounded-xl focus:ring-2 focus:ring-primary-500 focus:border-primary-500 transition-colors"
                  placeholder="Enter emergency contact"
                />
              </div>

              {/* Status */}
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-2">
                  Status
                </label>
                <select
                  name="status"
                  value={formData.status}
                  onChange={handleInputChange}
                  className="w-full px-4 py-3 border border-gray-300 rounded-xl focus:ring-2 focus:ring-primary-500 focus:border-primary-500 transition-colors"
                >
                  <option value="new_case">New Case</option>
                  <option value="transferred_in">Transferred In</option>
                  <option value="transferred_out">Transferred Out</option>
                  <option value="loss_to_follow_up">Loss to Follow-Up</option>
                  <option value="dead">Dead</option>
                  <option value="stopped">Stopped</option>
                  <option value="on_treatment">On Treatment</option>
                  <option value="On Treatment">On Treatment (New)</option>
                </select>
              </div>
            </div>

            {/* Address */}
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-2">
                Address
              </label>
              <textarea
                name="address"
                value={formData.address}
                onChange={handleInputChange}
                rows={3}
                className="w-full px-4 py-3 border border-gray-300 rounded-xl focus:ring-2 focus:ring-primary-500 focus:border-primary-500 transition-colors resize-none"
                placeholder="Enter patient's address"
              />
            </div>

            {/* Medical History */}
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-2">
                Medical History
              </label>
              <textarea
                name="medicalHistory"
                value={formData.medicalHistory}
                onChange={handleInputChange}
                rows={3}
                className="w-full px-4 py-3 border border-gray-300 rounded-xl focus:ring-2 focus:ring-primary-500 focus:border-primary-500 transition-colors resize-none"
                placeholder="Enter medical history"
              />
            </div>

            {/* Allergies */}
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-2">
                Allergies
              </label>
              <textarea
                name="allergies"
                value={formData.allergies}
                onChange={handleInputChange}
                rows={2}
                className="w-full px-4 py-3 border border-gray-300 rounded-xl focus:ring-2 focus:ring-primary-500 focus:border-primary-500 transition-colors resize-none"
                placeholder="Enter known allergies"
              />
            </div>

            {/* Current Medications */}
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-2">
                Current Medications
              </label>
              <textarea
                name="currentMedications"
                value={formData.currentMedications}
                onChange={handleInputChange}
                rows={2}
                className="w-full px-4 py-3 border border-gray-300 rounded-xl focus:ring-2 focus:ring-primary-500 focus:border-primary-500 transition-colors resize-none"
                placeholder="Enter current medications"
              />
            </div>

            {/* Note */}
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-2">
                Note
              </label>
              <textarea
                name="note"
                value={formData.note}
                onChange={handleInputChange}
                rows={3}
                className="w-full px-4 py-3 border border-gray-300 rounded-xl focus:ring-2 focus:ring-primary-500 focus:border-primary-500 transition-colors resize-none"
                placeholder="Enter additional notes about the patient"
              />
            </div>

            {/* Patient Local ID */}
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-2">
                Patient Local ID
              </label>
              <input
                type="text"
                name="patient_local_id"
                value={formData.patient_local_id}
                onChange={handleInputChange}
                className="w-full px-4 py-3 border border-gray-300 rounded-xl focus:ring-2 focus:ring-primary-500 focus:border-primary-500 transition-colors"
                placeholder="Enter patient local ID"
              />
            </div>

            {/* Form Actions */}
            <div className="flex justify-end space-x-4 pt-6 border-t border-gray-200">
              <button
                type="button"
                onClick={onClose}
                className="px-6 py-3 text-gray-700 bg-gray-100 hover:bg-gray-200 rounded-xl font-medium transition-colors"
              >
                Cancel
              </button>
              <button
                type="submit"
                disabled={loading}
                className="px-6 py-3 bg-gradient-to-r from-primary-600 to-primary-700 hover:from-primary-700 hover:to-primary-800 text-white rounded-xl font-medium transition-all duration-300 transform hover:-translate-y-1 hover:scale-105 disabled:opacity-50 disabled:transform-none"
              >
                {loading ? (
                  <div className="flex items-center">
                    <div className="animate-spin rounded-full h-4 w-4 border-b-2 border-white mr-2"></div>
                    {editingPatient ? 'Updating...' : 'Creating...'}
                  </div>
                ) : (
                  editingPatient ? 'Update Patient' : 'Create Patient'
                )}
              </button>
            </div>
          </form>
        </div>
      </div>
    </div>
  );
};

export default PatientFormModal;
