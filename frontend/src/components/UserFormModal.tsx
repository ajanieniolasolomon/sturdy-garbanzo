import React, { useState, useEffect } from 'react';
import { useAppSelector, useAppDispatch } from '../hooks/redux';
import { addNotification } from '../store/slices/uiSlice';
import firebaseService from '../services/firebaseService';
import validationService from '../services/validationService';
import type { User, UserForm } from '../types';
import { XMarkIcon } from '@heroicons/react/24/outline';

interface UserFormModalProps {
  isOpen: boolean;
  onClose: () => void;
  onSuccess: () => void;
  editingUser?: User | null;
}

const UserFormModal: React.FC<UserFormModalProps> = ({
  isOpen,
  onClose,
  onSuccess,
  editingUser
}) => {
  const dispatch = useAppDispatch();
  const { user: currentUser } = useAppSelector(state => state.auth);
  const [loading, setLoading] = useState(false);
  const [hospitals, setHospitals] = useState<any[]>([]);
  const [errors, setErrors] = useState<Record<string, string>>({});

  const [formData, setFormData] = useState<UserForm>({
    username: '',
    email: '',
    fullName: '',
    role: 'HCW',
    hospitalId: '',
    password: '',
  });

  useEffect(() => {
    if (isOpen) {
      loadHospitals();
      if (editingUser) {
        setFormData({
          username: editingUser.username,
          email: editingUser.email,
          fullName: editingUser.fullName,
          role: editingUser.role,
          hospitalId: editingUser.hospitalId || '',
          password: '', // Don't pre-fill password
        });
      } else {
        setFormData({
          username: '',
          email: '',
          fullName: '',
          role: 'HCW',
          hospitalId: currentUser?.hospitalId || '',
          password: '',
        });
      }
    }
  }, [isOpen, editingUser, currentUser?.hospitalId]);

  const loadHospitals = async () => {
    try {
      const result = await firebaseService.getHospitals();
      setHospitals(result.data);
    } catch (error) {
      console.error('Error loading hospitals:', error);
    }
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    
    // Validate form - use different rules for create vs edit
    const validationRules = editingUser 
      ? validationService.getUserUpdateValidationRules() // Password optional for updates
      : validationService.getUserValidationRules(); // Password required for new users
    
    const validation = validationService.validateForm(
      formData,
      validationRules
    );

    if (!validation.isValid) {
      setErrors(validation.errors);
      return;
    }

    try {
      setLoading(true);

      if (editingUser) {
        // Prepare update data - only include password if provided
        const updateData: any = {
          username: formData.username,
          email: formData.email,
          fullName: formData.fullName,
          role: formData.role,
          hospitalId: formData.hospitalId || undefined,
        };
        
        // Only include password if it's provided (not empty)
        if (formData.password && formData.password.trim()) {
          updateData.password = formData.password;
        }
        
        // Update existing user
        await firebaseService.updateUser(editingUser.id, updateData);
        dispatch(addNotification({
          type: 'success',
          message: 'User updated successfully'
        }));
      } else {
        // Create new user using firebaseService (includes custom claims)
        await firebaseService.createUser({
          username: formData.username,
          email: formData.email,
          fullName: formData.fullName,
          role: formData.role,
          hospitalId: formData.hospitalId || undefined,
          password: formData.password || '',
        });

        dispatch(addNotification({
          type: 'success',
          message: 'User created successfully with proper permissions'
        }));
      }

      onSuccess();
      onClose();
    } catch (error) {
      console.error('Error saving user:', error);
      dispatch(addNotification({
        type: 'error',
        message: 'Failed to save user'
      }));
    } finally {
      setLoading(false);
    }
  };

  const handleClose = () => {
    setFormData({
      username: '',
      email: '',
      fullName: '',
      role: 'HCW',
      hospitalId: '',
      password: '',
    });
    setErrors({});
    onClose();
  };

  const handleInputChange = (e: React.ChangeEvent<HTMLInputElement | HTMLSelectElement>) => {
    const { name, value } = e.target;
    setFormData(prev => ({ ...prev, [name]: value }));
    
    // Clear error when user starts typing
    if (errors[name]) {
      setErrors(prev => ({ ...prev, [name]: '' }));
    }
  };

  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50 p-4">
      <div className="bg-white rounded-2xl shadow-2xl w-full max-w-2xl max-h-[90vh] overflow-y-auto">
        {/* Header */}
        <div className="flex items-center justify-between p-6 border-b border-gray-200">
          <h2 className="text-2xl font-bold text-gray-900">
            {editingUser ? 'Edit User' : 'Create New User'}
          </h2>
          <button
            onClick={handleClose}
            className="p-2 hover:bg-gray-100 rounded-full transition-colors"
          >
            <XMarkIcon className="h-6 w-6 text-gray-500" />
          </button>
        </div>

        {/* Form */}
        <form onSubmit={handleSubmit} className="p-6 space-y-6">
          <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
            {/* Username */}
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-2">
                Username *
              </label>
              <input
                type="text"
                required
                name="username"
                value={formData.username}
                onChange={handleInputChange}
                className={`w-full px-4 py-3 border rounded-xl focus:ring-2 focus:ring-primary-500 focus:border-primary-500 transition-colors ${
                  errors.username ? 'border-red-500' : 'border-gray-300'
                }`}
                placeholder="Enter username"
              />
              {errors.username && (
                <p className="mt-1 text-sm text-red-600">{errors.username}</p>
              )}
            </div>

            {/* Email */}
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-2">
                Email *
              </label>
              <input
                type="email"
                required
                name="email"
                value={formData.email}
                onChange={handleInputChange}
                className={`w-full px-4 py-3 border rounded-xl focus:ring-2 focus:ring-primary-500 focus:border-primary-500 transition-colors ${
                  errors.email ? 'border-red-500' : 'border-gray-300'
                }`}
                placeholder="Enter email address"
              />
              {errors.email && (
                <p className="mt-1 text-sm text-red-600">{errors.email}</p>
              )}
            </div>

            {/* Full Name */}
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-2">
                Full Name *
              </label>
              <input
                type="text"
                required
                name="fullName"
                value={formData.fullName}
                onChange={handleInputChange}
                className={`w-full px-4 py-3 border rounded-xl focus:ring-2 focus:ring-primary-500 focus:border-primary-500 transition-colors ${
                  errors.fullName ? 'border-red-500' : 'border-gray-300'
                }`}
                placeholder="Enter full name"
              />
              {errors.fullName && (
                <p className="mt-1 text-sm text-red-600">{errors.fullName}</p>
              )}
            </div>

            {/* Role */}
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-2">
                Role *
              </label>
              <select
                required
                name="role"
                value={formData.role}
                onChange={handleInputChange}
                className={`w-full px-4 py-3 border rounded-xl focus:ring-2 focus:ring-primary-500 focus:border-primary-500 transition-colors ${
                  errors.role ? 'border-red-500' : 'border-gray-300'
                }`}
              >
                <option value="HCW">Healthcare Worker (HCW)</option>
                <option value="ADMIN">Administrator (ADMIN)</option>
                {currentUser?.role === 'SUPER_ADMIN' && (
                  <option value="SUPER_ADMIN">Super Administrator (SUPER_ADMIN)</option>
                )}
              </select>
            </div>

            {/* Hospital */}
            <div className="md:col-span-2">
              <label className="block text-sm font-medium text-gray-700 mb-2">
                Hospital
              </label>
              <select
                name="hospitalId"
                value={formData.hospitalId}
                onChange={handleInputChange}
                className="w-full px-4 py-3 border border-gray-300 rounded-xl focus:ring-2 focus:ring-primary-500 focus:border-primary-500 transition-colors"
              >
                <option value="">Select a hospital</option>
                {hospitals.map((hospital) => (
                  <option key={hospital.id} value={hospital.id}>
                    {hospital.name} - {hospital.lga}, {hospital.state}
                  </option>
                ))}
              </select>
            </div>

            {/* Password */}
            <div className="md:col-span-2">
              <label className="block text-sm font-medium text-gray-700 mb-2">
                Password {editingUser ? '(Optional - leave blank to keep current password)' : '*'}
              </label>
              <input
                type="password"
                required={!editingUser} // Only required for new users
                name="password"
                value={formData.password}
                onChange={handleInputChange}
                className={`w-full px-4 py-3 border rounded-xl focus:ring-2 focus:ring-primary-500 focus:border-primary-500 transition-colors ${
                  errors.password ? 'border-red-500' : 'border-gray-300'
                }`}
                placeholder={editingUser ? "Enter new password (leave blank to keep current)" : "Enter password (minimum 6 characters)"}
                minLength={editingUser ? 0 : 6} // No minimum for updates if empty
              />
              {errors.password && (
                <p className="mt-1 text-sm text-red-600">{errors.password}</p>
              )}
              <p className="mt-1 text-sm text-gray-500">
                {editingUser 
                  ? "Leave blank to keep current password, or enter new password (minimum 6 characters)"
                  : "Password must be at least 6 characters long"
                }
              </p>
            </div>
          </div>

          {/* Form Actions */}
          <div className="flex justify-end space-x-4 pt-6 border-t border-gray-200">
            <button
              type="button"
              onClick={handleClose}
              className="px-6 py-3 border border-gray-300 text-gray-700 rounded-xl hover:bg-gray-50 transition-colors font-medium"
            >
              Cancel
            </button>
            <button
              type="submit"
              disabled={loading}
              className="px-6 py-3 bg-gradient-to-r from-primary-600 to-primary-700 text-white rounded-xl hover:from-primary-700 hover:to-primary-800 transition-all duration-200 font-medium disabled:opacity-50 disabled:cursor-not-allowed"
            >
              {loading ? (
                <div className="flex items-center">
                  <div className="animate-spin rounded-full h-4 w-4 border-b-2 border-white mr-2"></div>
                  {editingUser ? 'Updating...' : 'Creating...'}
                </div>
              ) : (
                editingUser ? 'Update User' : 'Create User'
              )}
            </button>
          </div>
        </form>
      </div>
    </div>
  );
};

export default UserFormModal;