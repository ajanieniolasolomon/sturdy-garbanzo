import React, { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { useAppDispatch } from '../hooks/redux';
import { addNotification } from '../store/slices/uiSlice';
import userCreationService from '../services/userCreationService';
import {
  ShieldCheckIcon,
  UserPlusIcon,
  CheckCircleIcon,
  ExclamationTriangleIcon,
} from '@heroicons/react/24/outline';

const SetupPage: React.FC = () => {
  const navigate = useNavigate();
  const dispatch = useAppDispatch();
  const [isCreating, setIsCreating] = useState(false);
  const [isComplete, setIsComplete] = useState(false);

  const handleCreateSuperAdmin = async () => {
    try {
      setIsCreating(true);
      
      const result = await userCreationService.createSuperAdmin();
      
      if (result.success) {
        setIsComplete(true);
        dispatch(addNotification({
          type: 'success',
          message: 'Super admin created successfully! You can now login.'
        }));
        
        // Redirect to login after 2 seconds
        setTimeout(() => {
          navigate('/login');
        }, 2000);
      } else {
        dispatch(addNotification({
          type: 'error',
          message: result.error || 'Failed to create super admin'
        }));
      }
    } catch (error) {
      console.error('Setup error:', error);
      dispatch(addNotification({
        type: 'error',
        message: 'An unexpected error occurred during setup'
      }));
    } finally {
      setIsCreating(false);
    }
  };

  if (isComplete) {
    return (
      <div className="min-h-screen bg-gradient-to-br from-green-50 via-blue-50 to-indigo-50 flex items-center justify-center p-4">
        <div className="max-w-md w-full">
          <div className="bg-white rounded-2xl shadow-2xl p-8 text-center">
            <div className="w-16 h-16 bg-green-100 rounded-full flex items-center justify-center mx-auto mb-6">
              <CheckCircleIcon className="w-8 h-8 text-green-600" />
            </div>
            <h2 className="text-2xl font-bold text-gray-900 mb-4">
              Setup Complete!
            </h2>
            <p className="text-gray-600 mb-6">
              Super admin account has been created successfully. You will be redirected to the login page.
            </p>
            <div className="bg-green-50 rounded-lg p-4 mb-6">
              <p className="text-sm text-green-800 font-medium">
                Login Credentials:
              </p>
              <p className="text-sm text-green-700 mt-1">
                Email: admin@ccmis.org<br />
                Password: admin123
              </p>
            </div>
            <div className="animate-spin rounded-full h-6 w-6 border-b-2 border-blue-600 mx-auto"></div>
          </div>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-gradient-to-br from-blue-50 via-indigo-50 to-purple-50 flex items-center justify-center p-4">
      <div className="max-w-md w-full">
        <div className="bg-white rounded-2xl shadow-2xl p-8">
          <div className="text-center mb-8">
            <div className="w-16 h-16 bg-blue-100 rounded-full flex items-center justify-center mx-auto mb-4">
              <ShieldCheckIcon className="w-8 h-8 text-blue-600" />
            </div>
            <h1 className="text-3xl font-bold text-gray-900 mb-2">
              CCMIS Setup
            </h1>
            <p className="text-gray-600">
              Create your super administrator account to get started
            </p>
          </div>

          <div className="space-y-6">
            <div className="bg-blue-50 rounded-lg p-4">
              <div className="flex items-start">
                <UserPlusIcon className="w-5 h-5 text-blue-600 mt-0.5 mr-3" />
                <div>
                  <h3 className="font-medium text-blue-900">Super Administrator</h3>
                  <p className="text-sm text-blue-700 mt-1">
                    This account will have full access to manage hospitals, users, and system settings.
                  </p>
                </div>
              </div>
            </div>

            <div className="bg-yellow-50 rounded-lg p-4">
              <div className="flex items-start">
                <ExclamationTriangleIcon className="w-5 h-5 text-yellow-600 mt-0.5 mr-3" />
                <div>
                  <h3 className="font-medium text-yellow-900">Important</h3>
                  <p className="text-sm text-yellow-700 mt-1">
                    Make sure to change the default password after your first login for security.
                  </p>
                </div>
              </div>
            </div>

            <div className="bg-gray-50 rounded-lg p-4">
              <h3 className="font-medium text-gray-900 mb-2">Default Credentials</h3>
              <div className="space-y-2 text-sm">
                <div className="flex justify-between">
                  <span className="text-gray-600">Email:</span>
                  <span className="font-mono text-gray-900">admin@ccmis.org</span>
                </div>
                <div className="flex justify-between">
                  <span className="text-gray-600">Password:</span>
                  <span className="font-mono text-gray-900">admin123</span>
                </div>
              </div>
            </div>

            <button
              onClick={handleCreateSuperAdmin}
              disabled={isCreating}
              className="w-full bg-gradient-to-r from-blue-600 to-indigo-600 hover:from-blue-700 hover:to-indigo-700 disabled:from-gray-400 disabled:to-gray-500 text-white font-bold py-3 px-6 rounded-xl shadow-lg hover:shadow-xl transition-all duration-300 transform hover:-translate-y-1 disabled:transform-none disabled:cursor-not-allowed"
            >
              {isCreating ? (
                <div className="flex items-center justify-center">
                  <div className="animate-spin rounded-full h-5 w-5 border-b-2 border-white mr-2"></div>
                  Creating Super Admin...
                </div>
              ) : (
                'Create Super Administrator'
              )}
            </button>
          </div>

          <div className="mt-8 text-center">
            <p className="text-xs text-gray-500">
              By proceeding, you agree to create the initial administrator account for CCMIS.
            </p>
          </div>
        </div>
      </div>
    </div>
  );
};

export default SetupPage;
