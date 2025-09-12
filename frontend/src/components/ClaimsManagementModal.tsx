import React, { useState } from 'react';
import { useAppSelector, useAppDispatch } from '../hooks/redux';
import { addNotification } from '../store/slices/uiSlice';
import { getFunctions, httpsCallable } from 'firebase/functions';
import { getAuth } from 'firebase/auth';
import type { User, Hospital } from '../types';
import { XMarkIcon, ShieldCheckIcon } from '@heroicons/react/24/outline';

interface ClaimsManagementModalProps {
  isOpen: boolean;
  onClose: () => void;
  user: User | null;
  hospitals: Hospital[];
}

const ClaimsManagementModal: React.FC<ClaimsManagementModalProps> = ({
  isOpen,
  onClose,
  user,
  hospitals
}) => {
  const dispatch = useAppDispatch();
  const { user: currentUser } = useAppSelector(state => state.auth);
  const [loading, setLoading] = useState(false);
  const [role, setRole] = useState<'SUPER_ADMIN' | 'ADMIN' | 'HCW'>(user?.role as 'SUPER_ADMIN' | 'ADMIN' | 'HCW' || 'HCW');
  const [hospitalId, setHospitalId] = useState(user?.hospitalId || '');

  const functions = getFunctions();
  const setUserClaims = httpsCallable(functions, 'setUserClaims');

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!user || !currentUser) return;

    setLoading(true);
    try {
      await setUserClaims({
        uid: user.id,
        role,
        hospitalId: hospitalId || null
      });

      dispatch(addNotification({
        type: 'success',
        message: `Claims updated successfully for ${user.fullName}`
      }));

      // Force token refresh to get updated claims
      await getAuth().currentUser?.getIdToken(true);
      
      onClose();
    } catch (error: any) {
      console.error('Error updating claims:', error);
      dispatch(addNotification({
        type: 'error',
        message: error.message || 'Failed to update user claims'
      }));
    } finally {
      setLoading(false);
    }
  };

  if (!isOpen || !user) return null;

  return (
    <div className="fixed inset-0 z-50 overflow-y-auto">
      <div className="flex min-h-screen items-center justify-center p-4">
        <div className="fixed inset-0 bg-black/50 backdrop-blur-sm" onClick={onClose}></div>
        
        <div className="relative bg-white rounded-2xl shadow-2xl max-w-md w-full mx-4">
          {/* Header */}
          <div className="flex items-center justify-between p-6 border-b border-gray-200">
            <div className="flex items-center space-x-3">
              <div className="p-2 bg-gradient-to-br from-purple-100 to-purple-200 rounded-xl">
                <ShieldCheckIcon className="h-6 w-6 text-purple-600" />
              </div>
              <div>
                <h3 className="text-lg font-semibold text-gray-900">
                  Manage Claims
                </h3>
                <p className="text-sm text-gray-600">
                  Update user permissions and hospital assignment
                </p>
              </div>
            </div>
            <button
              onClick={onClose}
              className="p-2 rounded-xl hover:bg-gray-100 transition-colors"
            >
              <XMarkIcon className="h-5 w-5 text-gray-500" />
            </button>
          </div>

          {/* Form */}
          <form onSubmit={handleSubmit} className="p-6 space-y-6">
            {/* User Info */}
            <div className="bg-gray-50 rounded-xl p-4">
              <h4 className="font-medium text-gray-900 mb-2">User</h4>
              <p className="text-sm text-gray-600">{user.fullName}</p>
              <p className="text-sm text-gray-500">{user.email}</p>
            </div>

            {/* Role Selection */}
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-2">
                Role
              </label>
              <select
                value={role}
                onChange={(e) => setRole(e.target.value as 'SUPER_ADMIN' | 'ADMIN' | 'HCW')}
                className="w-full px-3 py-2 border border-gray-300 rounded-xl focus:outline-none focus:ring-2 focus:ring-primary-500 focus:border-primary-500"
                required
              >
                <option value="HCW">Healthcare Worker</option>
                <option value="ADMIN">Admin</option>
                <option value="SUPER_ADMIN">Super Admin</option>
              </select>
            </div>

            {/* Hospital Assignment */}
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-2">
                Hospital Assignment
              </label>
              <select
                value={hospitalId}
                onChange={(e) => setHospitalId(e.target.value)}
                className="w-full px-3 py-2 border border-gray-300 rounded-xl focus:outline-none focus:ring-2 focus:ring-primary-500 focus:border-primary-500"
              >
                <option value="">No hospital assigned</option>
                {hospitals.map((hospital) => (
                  <option key={hospital.id} value={hospital.id}>
                    {hospital.name}
                  </option>
                ))}
              </select>
            </div>

            {/* Actions */}
            <div className="flex justify-end space-x-3 pt-4">
              <button
                type="button"
                onClick={onClose}
                className="px-4 py-2 text-sm font-medium text-gray-700 bg-gray-100 hover:bg-gray-200 rounded-xl transition-colors"
              >
                Cancel
              </button>
              <button
                type="submit"
                disabled={loading}
                className="px-4 py-2 text-sm font-medium text-white bg-gradient-to-r from-purple-600 to-purple-700 hover:from-purple-700 hover:to-purple-800 rounded-xl transition-all duration-200 disabled:opacity-50 disabled:cursor-not-allowed"
              >
                {loading ? 'Updating...' : 'Update Claims'}
              </button>
            </div>
          </form>
        </div>
      </div>
    </div>
  );
};

export default ClaimsManagementModal;
