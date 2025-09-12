import React, { useState, useEffect } from 'react';
import { useAppDispatch } from '../hooks/redux';
import { addNotification } from '../store/slices/uiSlice';
import firebaseService from '../services/firebaseService';
import validationService from '../services/validationService';
import type { Hospital, HospitalForm } from '../types';
import {
  XMarkIcon,
  BuildingOfficeIcon,
  MapPinIcon,
  PhoneIcon,
  ExclamationTriangleIcon,
} from '@heroicons/react/24/outline';

interface HospitalFormModalProps {
  isOpen: boolean;
  onClose: () => void;
  onSuccess: () => void;
  editingHospital?: Hospital | null;
}

const HospitalFormModal: React.FC<HospitalFormModalProps> = ({
  isOpen,
  onClose,
  onSuccess,
  editingHospital
}) => {
  const dispatch = useAppDispatch();
  const [loading, setLoading] = useState(false);
  const [errors, setErrors] = useState<Record<string, string>>({});


  const [formData, setFormData] = useState<HospitalForm>({
    name: '',
    address: '',
    lga: '',
    city: '',
    state: '',
    country: 'Nigeria',
    phone: '',
    email: '',
    website: '',
    description: '',
    capacity: '',
    specialties: [],
  });

  useEffect(() => {
    if (isOpen) {
      if (editingHospital) {
        setFormData({
          name: editingHospital.name,
          address: editingHospital.address,
          lga: editingHospital.lga,
          city: editingHospital.city,
          state: editingHospital.state,
          country: editingHospital.country,
          phone: editingHospital.phone || '',
          email: editingHospital.email || '',
          website: editingHospital.website || '',
          description: editingHospital.description || '',
          capacity: editingHospital.capacity?.toString() || '',
          specialties: editingHospital.specialties || [],
        });
      } else {
        resetForm();
      }
    }
  }, [isOpen, editingHospital?.id]); // Only depend on the ID, not the entire object

  const resetForm = () => {
    setFormData({
      name: '',
      address: '',
      lga: '',
      city: '',
      state: '',
      country: 'Nigeria',
      phone: '',
      email: '',
      website: '',
      description: '',
      capacity: '',
      specialties: [],
    });
    setErrors({});
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    
    // Validate form
    const validation = validationService.validateForm(
      formData,
      validationService.getHospitalValidationRules()
    );

    if (!validation.isValid) {
      setErrors(validation.errors);
      return;
    }

    try {
      setLoading(true);
      
      // Convert string values back to appropriate types
      const hospitalData = {
        ...formData,
        capacity: parseInt(formData.capacity?.toString() || '0') || 0,
      };
      
      if (editingHospital) {
        console.log('🔴 Updating hospital:', editingHospital.id, hospitalData);
        await firebaseService.updateHospital(editingHospital.id, hospitalData);
        console.log('🔴 Hospital update successful');
        dispatch(addNotification({
          type: 'success',
          message: 'Hospital updated successfully'
        }));
      } else {
        console.log('🔴 Creating hospital:', hospitalData);
        await firebaseService.createHospital(hospitalData);
        console.log('🔴 Hospital creation successful');
        dispatch(addNotification({
          type: 'success',
          message: 'Hospital created successfully'
        }));
      }
      
      onSuccess();
      onClose();
      resetForm();
    } catch (error: any) {
      console.error('Error saving hospital:', error);
      dispatch(addNotification({
        type: 'error',
        message: 'Failed to save hospital'
      }));
    } finally {
      setLoading(false);
    }
  };

  const handleInputChange = (e: React.ChangeEvent<HTMLInputElement | HTMLTextAreaElement | HTMLSelectElement>) => {
    const { name, value } = e.target;
    setFormData(prev => ({ 
      ...prev, 
      [name]: name === 'capacity' ? (value === '' ? '' : parseInt(value) || '') : value 
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
              {editingHospital ? 'Edit Hospital' : 'Create New Hospital'}
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
              {/* Hospital Name */}
              <div className="md:col-span-2">
                <label className="block text-sm font-medium text-gray-700 mb-2">
                  Hospital Name *
                </label>
                <div className="relative">
                  <input
                    type="text"
                    name="name"
                    value={formData.name}
                    onChange={handleInputChange}
                    className={`w-full px-4 py-3 pl-10 border rounded-xl focus:ring-2 focus:ring-primary-500 focus:border-primary-500 transition-colors ${
                      errors.name ? 'border-red-500' : 'border-gray-300'
                    }`}
                    placeholder="Enter hospital name"
                  />
                  <BuildingOfficeIcon className="absolute left-3 top-3.5 h-5 w-5 text-gray-400" />
                </div>
                {errors.name && (
                  <p className="mt-1 text-sm text-red-600 flex items-center">
                    <ExclamationTriangleIcon className="h-4 w-4 mr-1" />
                    {errors.name}
                  </p>
                )}
              </div>

              {/* Address */}
              <div className="md:col-span-2">
                <label className="block text-sm font-medium text-gray-700 mb-2">
                  Address *
                </label>
                <div className="relative">
                  <input
                    type="text"
                    name="address"
                    value={formData.address}
                    onChange={handleInputChange}
                    className={`w-full px-4 py-3 pl-10 border rounded-xl focus:ring-2 focus:ring-primary-500 focus:border-primary-500 transition-colors ${
                      errors.address ? 'border-red-500' : 'border-gray-300'
                    }`}
                    placeholder="Enter hospital address"
                  />
                  <MapPinIcon className="absolute left-3 top-3.5 h-5 w-5 text-gray-400" />
                </div>
                {errors.address && (
                  <p className="mt-1 text-sm text-red-600 flex items-center">
                    <ExclamationTriangleIcon className="h-4 w-4 mr-1" />
                    {errors.address}
                  </p>
                )}
              </div>

              {/* City */}
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-2">
                  City *
                </label>
                <input
                  type="text"
                  name="city"
                  value={formData.city}
                  onChange={handleInputChange}
                  className={`w-full px-4 py-3 border rounded-xl focus:ring-2 focus:ring-primary-500 focus:border-primary-500 transition-colors ${
                    errors.city ? 'border-red-500' : 'border-gray-300'
                  }`}
                  placeholder="Enter city"
                />
                {errors.city && (
                  <p className="mt-1 text-sm text-red-600 flex items-center">
                    <ExclamationTriangleIcon className="h-4 w-4 mr-1" />
                    {errors.city}
                  </p>
                )}
              </div>

              {/* LGA */}
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-2">
                  LGA *
                </label>
                <input
                  type="text"
                  name="lga"
                  value={formData.lga}
                  onChange={handleInputChange}
                  className={`w-full px-4 py-3 border rounded-xl focus:ring-2 focus:ring-primary-500 focus:border-primary-500 transition-colors ${
                    errors.lga ? 'border-red-500' : 'border-gray-300'
                  }`}
                  placeholder="Enter LGA (Local Government Area)"
                />
                {errors.lga && (
                  <p className="mt-1 text-sm text-red-600 flex items-center">
                    <ExclamationTriangleIcon className="h-4 w-4 mr-1" />
                    {errors.lga}
                  </p>
                )}
              </div>

              {/* State */}
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-2">
                  State *
                </label>
                <input
                  type="text"
                  name="state"
                  value={formData.state}
                  onChange={handleInputChange}
                  className={`w-full px-4 py-3 border rounded-xl focus:ring-2 focus:ring-primary-500 focus:border-primary-500 transition-colors ${
                    errors.state ? 'border-red-500' : 'border-gray-300'
                  }`}
                  placeholder="Enter state"
                />
                {errors.state && (
                  <p className="mt-1 text-sm text-red-600 flex items-center">
                    <ExclamationTriangleIcon className="h-4 w-4 mr-1" />
                    {errors.state}
                  </p>
                )}
              </div>

              {/* Country */}
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-2">
                  Country
                </label>
                <input
                  type="text"
                  name="country"
                  value={formData.country}
                  onChange={handleInputChange}
                  className="w-full px-4 py-3 border border-gray-300 rounded-xl focus:ring-2 focus:ring-primary-500 focus:border-primary-500 transition-colors"
                  placeholder="Enter country"
                />
              </div>

              {/* Capacity */}
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-2">
                  Bed Capacity
                </label>
                <input
                  type="number"
                  name="capacity"
                  value={formData.capacity}
                  onChange={handleInputChange}
                  min="0"
                  step="1"
                  className="w-full px-4 py-3 border border-gray-300 rounded-xl focus:ring-2 focus:ring-primary-500 focus:border-primary-500 transition-colors"
                  placeholder="Enter bed capacity"
                  style={{ WebkitAppearance: 'none', MozAppearance: 'textfield' }}
                />
              </div>

              {/* Phone */}
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-2">
                  Phone Number
                </label>
                <div className="relative">
                  <input
                    type="tel"
                    name="phone"
                    value={formData.phone}
                    onChange={handleInputChange}
                    className="w-full px-4 py-3 pl-10 border border-gray-300 rounded-xl focus:ring-2 focus:ring-primary-500 focus:border-primary-500 transition-colors"
                    placeholder="Enter phone number"
                  />
                  <PhoneIcon className="absolute left-3 top-3.5 h-5 w-5 text-gray-400" />
                </div>
              </div>

              {/* Email */}
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-2">
                  Email
                </label>
                <input
                  type="email"
                  name="email"
                  value={formData.email}
                  onChange={handleInputChange}
                  className="w-full px-4 py-3 border border-gray-300 rounded-xl focus:ring-2 focus:ring-primary-500 focus:border-primary-500 transition-colors"
                  placeholder="Enter email address"
                />
              </div>

              {/* Website */}
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-2">
                  Website
                </label>
                <input
                  type="url"
                  name="website"
                  value={formData.website}
                  onChange={handleInputChange}
                  className="w-full px-4 py-3 border border-gray-300 rounded-xl focus:ring-2 focus:ring-primary-500 focus:border-primary-500 transition-colors"
                  placeholder="Enter website URL"
                />
              </div>
            </div>

            {/* Description */}
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-2">
                Description
              </label>
              <textarea
                name="description"
                value={formData.description}
                onChange={handleInputChange}
                rows={3}
                className="w-full px-4 py-3 border border-gray-300 rounded-xl focus:ring-2 focus:ring-primary-500 focus:border-primary-500 transition-colors resize-none"
                placeholder="Enter hospital description"
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
                    {editingHospital ? 'Updating...' : 'Creating...'}
                  </div>
                ) : (
                  editingHospital ? 'Update Hospital' : 'Create Hospital'
                )}
              </button>
            </div>
          </form>
        </div>
      </div>
    </div>
  );
};

export default HospitalFormModal;
