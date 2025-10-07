import React, { useState, useEffect } from 'react';
import { useAppSelector, useAppDispatch } from '../hooks/redux';
import { addNotification } from '../store/slices/uiSlice';
import firebaseService from '../services/firebaseService';
import validationService from '../services/validationService';
import type { Consultation, ConsultationForm, Patient, User } from '../types';
import {
  XMarkIcon,
  CalendarIcon,
  ExclamationTriangleIcon,
} from '@heroicons/react/24/outline';

interface ConsultationFormModalProps {
  isOpen: boolean;
  onClose: () => void;
  onSuccess: () => void;
  editingConsultation?: Consultation | null;
}

const ConsultationFormModal: React.FC<ConsultationFormModalProps> = ({
  isOpen,
  onClose,
  onSuccess,
  editingConsultation
}) => {
  const dispatch = useAppDispatch();
  const { user } = useAppSelector(state => state.auth);
  const [patients, setPatients] = useState<Patient[]>([]);
  const [users, setUsers] = useState<User[]>([]);
  const [loading, setLoading] = useState(false);
  const [errors, setErrors] = useState<Record<string, string>>({});

  const [formData, setFormData] = useState<ConsultationForm>({
    patientId: '',
    consultationType: 'Initial',
    chiefComplaint: '',
    diagnosis: '',
    treatment: '',
    notes: '',
    status: 'scheduled',
    consultationDate: '',
    followUpDate: '',
    weightKg: '',
    heightCm: '',
    temperatureC: '',
    pulseBpm: '',
    respirationRate: '',
    bpSystolic: '',
    bpDiastolic: '',
  });

  useEffect(() => {
    if (isOpen) {
      loadData();
      if (editingConsultation) {
        setFormData({
          patientId: editingConsultation.patientId,
          consultationType: editingConsultation.consultationType,
          chiefComplaint: editingConsultation.chiefComplaint,
          diagnosis: editingConsultation.diagnosis || '',
          treatment: editingConsultation.treatment || '',
          notes: editingConsultation.notes || '',
          status: editingConsultation.status,
          consultationDate: editingConsultation.consultationDate ? editingConsultation.consultationDate.split('T')[0] : '',
          followUpDate: editingConsultation.followUpDate ? editingConsultation.followUpDate.split('T')[0] : '',
          weightKg: editingConsultation.weightKg?.toString() || '',
          heightCm: editingConsultation.heightCm?.toString() || '',
          temperatureC: editingConsultation.vitals?.temperatureC?.toString() || '',
          pulseBpm: editingConsultation.vitals?.pulseBpm?.toString() || '',
          respirationRate: editingConsultation.vitals?.respirationRate?.toString() || '',
          bpSystolic: editingConsultation.vitals?.bpSystolic?.toString() || '',
          bpDiastolic: editingConsultation.vitals?.bpDiastolic?.toString() || '',
        });
      } else {
        resetForm();
      }
    }
  }, [isOpen, editingConsultation]);

  const loadData = async () => {
    try {
      const [patientsResult, usersResult] = await Promise.all([
        firebaseService.getPatients(),
        firebaseService.getUsers(user?.hospitalId)
      ]);
      setPatients(patientsResult.data);
      setUsers(usersResult.data);
    } catch (error) {
      console.error('Error loading data:', error);
    }
  };

  const resetForm = () => {
    setFormData({
      patientId: '',
      consultationType: 'Initial',
      chiefComplaint: '',
      diagnosis: '',
      treatment: '',
      notes: '',
      status: 'scheduled',
      consultationDate: '',
      followUpDate: '',
      weightKg: '',
      heightCm: '',
      temperatureC: '',
      pulseBpm: '',
      respirationRate: '',
      bpSystolic: '',
      bpDiastolic: '',
    });
    setErrors({});
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    
    // Validate form
    const validation = validationService.validateForm(
      formData,
      validationService.getConsultationValidationRules()
    );

    if (!validation.isValid) {
      setErrors(validation.errors);
      return;
    }

    try {
      setLoading(true);
      
      const patient = patients.find(p => p.id === formData.patientId);
      const hcw = users.find(u => u.id === user?.id);
      
      const prepared = {
        ...formData,
        weightKg: formData.weightKg === '' ? undefined : Number(formData.weightKg),
        heightCm: formData.heightCm === '' ? undefined : Number(formData.heightCm),
        temperatureC: formData.temperatureC === '' ? undefined : Number(formData.temperatureC),
        pulseBpm: formData.pulseBpm === '' ? undefined : Number(formData.pulseBpm),
        respirationRate: formData.respirationRate === '' ? undefined : Number(formData.respirationRate),
        bpSystolic: formData.bpSystolic === '' ? undefined : Number(formData.bpSystolic),
        bpDiastolic: formData.bpDiastolic === '' ? undefined : Number(formData.bpDiastolic),
      } as any;

      if (editingConsultation) {
        await firebaseService.updateConsultation(editingConsultation.id, prepared);
        dispatch(addNotification({
          type: 'success',
          message: 'Consultation updated successfully'
        }));
      } else {
        const consultationData = {
          ...prepared,
          patientName: patient?.fullName || '',
          hcwId: user?.id || '',
          hcwName: hcw?.fullName || '',
          hospitalId: user?.hospitalId || '',
        };
        console.log('🔴 Creating consultation:', consultationData);
        await firebaseService.createConsultation(consultationData);
        console.log('🔴 Consultation created successfully');
        dispatch(addNotification({
          type: 'success',
          message: 'Consultation created successfully'
        }));
      }
      
      onSuccess();
      onClose();
      resetForm();
    } catch (error) {
      console.error('Error saving consultation:', error);
      dispatch(addNotification({
        type: 'error',
        message: 'Failed to save consultation'
      }));
    } finally {
      setLoading(false);
    }
  };

  const handleInputChange = (e: React.ChangeEvent<HTMLInputElement | HTMLTextAreaElement | HTMLSelectElement>) => {
    const { name, value } = e.target;
    setFormData(prev => ({ ...prev, [name]: value }));
    
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
        
        <div className="relative bg-white rounded-2xl shadow-2xl w-full max-w-4xl">
          <div className="flex items-center justify-between p-6 border-b border-gray-200">
            <h3 className="text-2xl font-bold text-gray-900">
              {editingConsultation ? 'Edit Consultation' : 'Create New Consultation'}
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
              {/* Patient Selection */}
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-2">
                  Patient *
                </label>
                <select
                  name="patientId"
                  value={formData.patientId}
                  onChange={handleInputChange}
                  className={`w-full px-4 py-3 border rounded-xl focus:ring-2 focus:ring-primary-500 focus:border-primary-500 transition-colors ${
                    errors.patientId ? 'border-red-500' : 'border-gray-300'
                  }`}
                >
                  <option value="">Select patient</option>
                  {patients.map((patient) => (
                    <option key={patient.id} value={patient.id}>
                      {patient.fullName} (CC: {patient.ccNumber})
                    </option>
                  ))}
                </select>
                {errors.patientId && (
                  <p className="mt-1 text-sm text-red-600 flex items-center">
                    <ExclamationTriangleIcon className="h-4 w-4 mr-1" />
                    {errors.patientId}
                  </p>
                )}
              </div>

              {/* Consultation Type */}
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-2">
                  Consultation Type *
                </label>
                <select
                  name="consultationType"
                  value={formData.consultationType}
                  onChange={handleInputChange}
                  className={`w-full px-4 py-3 border rounded-xl focus:ring-2 focus:ring-primary-500 focus:border-primary-500 transition-colors ${
                    errors.consultationType ? 'border-red-500' : 'border-gray-300'
                  }`}
                >
                  <option value="">Select type</option>
                  <option value="initial">Initial Consultation</option>
                  <option value="follow_up">Follow-up</option>
                  <option value="emergency">Emergency</option>
                  <option value="routine">Routine Check</option>
                  <option value="specialist">Specialist Referral</option>
                </select>
                {errors.consultationType && (
                  <p className="mt-1 text-sm text-red-600 flex items-center">
                    <ExclamationTriangleIcon className="h-4 w-4 mr-1" />
                    {errors.consultationType}
                  </p>
                )}
              </div>

              {/* Consultation Date */}
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-2">
                  Consultation Date *
                </label>
                <div className="relative">
                  <input
                    type="date"
                    name="consultationDate"
                    value={formData.consultationDate}
                    onChange={handleInputChange}
                    className={`w-full px-4 py-3 border rounded-xl focus:ring-2 focus:ring-primary-500 focus:border-primary-500 transition-colors ${
                      errors.consultationDate ? 'border-red-500' : 'border-gray-300'
                    }`}
                    onClick={(e) => (e.currentTarget as HTMLInputElement).showPicker?.()}
                  />
                  <button type="button" onClick={() => (document.querySelector('input[name=consultationDate]') as HTMLInputElement)?.showPicker?.()} className="absolute right-2 top-2 p-1 rounded hover:bg-gray-100 focus:outline-none focus:ring-2 focus:ring-primary-500">
                    <CalendarIcon className="h-5 w-5 text-gray-500" />
                  </button>
                </div>
                {errors.consultationDate && (
                  <p className="mt-1 text-sm text-red-600 flex items-center">
                    <ExclamationTriangleIcon className="h-4 w-4 mr-1" />
                    {errors.consultationDate}
                  </p>
                )}
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
                  <option value="scheduled">Scheduled</option>
                  <option value="in_progress">In Progress</option>
                  <option value="completed">Completed</option>
                  <option value="cancelled">Cancelled</option>
                </select>
              </div>
              {/* Follow-up Date */}
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-2">
                  Follow-up Date
                </label>
                <div className="relative">
                  <input
                    type="date"
                    name="followUpDate"
                    value={formData.followUpDate}
                    onChange={handleInputChange}
                    className="w-full px-4 py-3 border border-gray-300 rounded-xl focus:ring-2 focus:ring-primary-500 focus:border-primary-500 transition-colors"
                    onClick={(e) => (e.currentTarget as HTMLInputElement).showPicker?.()}
                  />
                  <button type="button" onClick={() => (document.querySelector('input[name=followUpDate]') as HTMLInputElement)?.showPicker?.()} className="absolute right-2 top-2 p-1 rounded hover:bg-gray-100 focus:outline-none focus:ring-2 focus:ring-primary-500">
                    <CalendarIcon className="h-5 w-5 text-gray-500" />
                  </button>
                </div>
              </div>
            </div>

            {/* Vitals and Measurements */}
            <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-2">Weight (kg)</label>
                <input type="number" name="weightKg" value={formData.weightKg as any} onChange={handleInputChange} className="w-full px-4 py-3 border border-gray-300 rounded-xl focus:ring-2 focus:ring-primary-500 focus:border-primary-500 transition-colors" step="0.1" min="0" />
              </div>
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-2">Height (cm)</label>
                <input type="number" name="heightCm" value={formData.heightCm as any} onChange={handleInputChange} className="w-full px-4 py-3 border border-gray-300 rounded-xl focus:ring-2 focus:ring-primary-500 focus:border-primary-500 transition-colors" step="0.1" min="0" />
              </div>
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-2">Temperature (°C)</label>
                <input type="number" name="temperatureC" value={formData.temperatureC as any} onChange={handleInputChange} className="w-full px-4 py-3 border border-gray-300 rounded-xl focus:ring-2 focus:ring-primary-500 focus:border-primary-500 transition-colors" step="0.1" />
              </div>
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-2">Pulse (bpm)</label>
                <input type="number" name="pulseBpm" value={formData.pulseBpm as any} onChange={handleInputChange} className="w-full px-4 py-3 border border-gray-300 rounded-xl focus:ring-2 focus:ring-primary-500 focus:border-primary-500 transition-colors" />
              </div>
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-2">Respiration (rpm)</label>
                <input type="number" name="respirationRate" value={formData.respirationRate as any} onChange={handleInputChange} className="w-full px-4 py-3 border border-gray-300 rounded-xl focus:ring-2 focus:ring-primary-500 focus:border-primary-500 transition-colors" />
              </div>
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-2">Blood Pressure (mmHg)</label>
                <div className="flex gap-2">
                  <input type="number" name="bpSystolic" value={formData.bpSystolic as any} onChange={handleInputChange} className="w-full px-4 py-3 border border-gray-300 rounded-xl focus:ring-2 focus:ring-primary-500 focus:border-primary-500 transition-colors" placeholder="Systolic" />
                  <input type="number" name="bpDiastolic" value={formData.bpDiastolic as any} onChange={handleInputChange} className="w-full px-4 py-3 border border-gray-300 rounded-xl focus:ring-2 focus:ring-primary-500 focus:border-primary-500 transition-colors" placeholder="Diastolic" />
                </div>
              </div>
            </div>

            {/* Chief Complaint */}
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-2">
                Chief Complaint *
              </label>
              <textarea
                name="chiefComplaint"
                value={formData.chiefComplaint}
                onChange={handleInputChange}
                rows={3}
                className={`w-full px-4 py-3 border rounded-xl focus:ring-2 focus:ring-primary-500 focus:border-primary-500 transition-colors resize-none ${
                  errors.chiefComplaint ? 'border-red-500' : 'border-gray-300'
                }`}
                placeholder="Describe the main reason for consultation"
              />
              {errors.chiefComplaint && (
                <p className="mt-1 text-sm text-red-600 flex items-center">
                  <ExclamationTriangleIcon className="h-4 w-4 mr-1" />
                  {errors.chiefComplaint}
                </p>
              )}
            </div>

            {/* Diagnosis */}
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-2">
                Diagnosis
              </label>
              <textarea
                name="diagnosis"
                value={formData.diagnosis}
                onChange={handleInputChange}
                rows={3}
                className="w-full px-4 py-3 border border-gray-300 rounded-xl focus:ring-2 focus:ring-primary-500 focus:border-primary-500 transition-colors resize-none"
                placeholder="Enter diagnosis"
              />
            </div>

            {/* Treatment */}
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-2">
                Treatment Plan
              </label>
              <textarea
                name="treatment"
                value={formData.treatment}
                onChange={handleInputChange}
                rows={3}
                className="w-full px-4 py-3 border border-gray-300 rounded-xl focus:ring-2 focus:ring-primary-500 focus:border-primary-500 transition-colors resize-none"
                placeholder="Enter treatment plan"
              />
            </div>

            {/* Notes */}
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-2">
                Additional Notes
              </label>
              <textarea
                name="notes"
                value={formData.notes}
                onChange={handleInputChange}
                rows={4}
                className="w-full px-4 py-3 border border-gray-300 rounded-xl focus:ring-2 focus:ring-primary-500 focus:border-primary-500 transition-colors resize-none"
                placeholder="Enter any additional notes"
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
                    {editingConsultation ? 'Updating...' : 'Creating...'}
                  </div>
                ) : (
                  editingConsultation ? 'Update Consultation' : 'Create Consultation'
                )}
              </button>
            </div>
          </form>
        </div>
      </div>
    </div>
  );
};

export default ConsultationFormModal;
