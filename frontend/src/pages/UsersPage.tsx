import React, { useState, useEffect } from 'react';
import { useAppSelector, useAppDispatch } from '../hooks/redux';
import { addNotification } from '../store/slices/uiSlice';
import firebaseService from '../services/firebaseService';
import UserFormModal from '../components/UserFormModal';
import ClaimsManagementModal from '../components/ClaimsManagementModal';
import type { User, Hospital } from '../types';
import {
  UsersIcon,
  PlusIcon,
  MagnifyingGlassIcon,
  PencilIcon,
  TrashIcon,
  ShieldCheckIcon,
} from '@heroicons/react/24/outline';

const UsersPage: React.FC = () => {
  const dispatch = useAppDispatch();
  const { user } = useAppSelector(state => state.auth);
  const [users, setUsers] = useState<User[]>([]);
  const [loading, setLoading] = useState(true);
  const [searchTerm, setSearchTerm] = useState('');
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [editingUser, setEditingUser] = useState<User | null>(null);
  const [claimsModalOpen, setClaimsModalOpen] = useState(false);
  const [claimsUser, setClaimsUser] = useState<User | null>(null);
  const [hospitals, setHospitals] = useState<Hospital[]>([]);

  useEffect(() => {
    if (!user) return;
    setLoading(true);
    // SUPER_ADMIN stays realtime; others use API for snappier loads
    if (user.role === 'SUPER_ADMIN') {
      const unsubscribe = firebaseService.streamUsers(undefined, (result) => {
        setUsers(result.data);
        setLoading(false);
      });
      return () => unsubscribe && unsubscribe();
    }
    (async () => {
      try {
        const result = await firebaseService.getUsers(user.hospitalId);
        setUsers(result.data);
      } catch (error) {
        console.error('Error loading users:', error);
        dispatch(addNotification({ type: 'error', message: 'Failed to load users' }));
      } finally {
        setLoading(false);
      }
    })();
  }, [user?.hospitalId, user?.role]);

  // Load hospitals for hospital name mapping
  useEffect(() => {
    if (!user) return;
    const loadHospitals = async () => {
      try {
        const result = await firebaseService.getHospitals();
        setHospitals(result.data);
      } catch (error) {
        console.error('Error loading hospitals:', error);
      }
    };
    loadHospitals();
  }, [user]);

  // Helper function to get hospital name from ID
  const getHospitalName = (hospitalId: string): string => {
    if (!hospitalId) return 'No hospital assigned';
    const hospital = hospitals.find(h => h.id === hospitalId);
    return hospital ? hospital.name : hospitalId;
  };

  const loadUsers = async () => {
    try {
      setLoading(true);
      const result = await firebaseService.getUsers(user?.hospitalId);
      setUsers(result.data);
    } catch (error) {
      console.error('Error loading users:', error);
      dispatch(addNotification({
        type: 'error',
        message: 'Failed to load users'
      }));
    } finally {
      setLoading(false);
    }
  };

  const handleEdit = (user: User) => {
    setEditingUser(user);
    setIsModalOpen(true);
  };

  const handleDelete = async (user: User) => {
    if (window.confirm(`Are you sure you want to delete "${user.fullName}"?`)) {
      try {
        await firebaseService.deleteUser(user.id);
        dispatch(addNotification({
          type: 'success',
          message: 'User deleted successfully'
        }));
        loadUsers();
      } catch (error) {
        console.error('Error deleting user:', error);
        dispatch(addNotification({
          type: 'error',
          message: 'Failed to delete user'
        }));
      }
    }
  };

  const handleModalClose = () => {
    setIsModalOpen(false);
    setEditingUser(null);
  };

  const handleModalSuccess = async () => {
    await loadUsers();
  };

  const handleClaimsManagement = (user: User) => {
    setClaimsUser(user);
    setClaimsModalOpen(true);
  };

  const handleClaimsModalClose = () => {
    setClaimsModalOpen(false);
    setClaimsUser(null);
  };

  const filteredUsers = users.filter(user =>
    user.fullName.toLowerCase().includes(searchTerm.toLowerCase()) ||
    user.email.toLowerCase().includes(searchTerm.toLowerCase()) ||
    user.username.toLowerCase().includes(searchTerm.toLowerCase()) ||
    user.role.toLowerCase().includes(searchTerm.toLowerCase())
  );

  return (
    <div className="min-h-screen bg-gradient-to-br from-blue-50 via-white to-indigo-50">
      {/* Animated Background Elements */}
      <div className="absolute inset-0 overflow-hidden pointer-events-none">
        <div className="absolute -top-40 -right-40 w-80 h-80 bg-gradient-to-br from-primary-200/30 to-blue-300/30 rounded-full blur-3xl animate-float"></div>
        <div className="absolute -bottom-40 -left-40 w-80 h-80 bg-gradient-to-br from-indigo-200/30 to-purple-300/30 rounded-full blur-3xl animate-float" style={{ animationDelay: '2s' }}></div>
        <div className="absolute top-1/2 left-1/2 transform -translate-x-1/2 -translate-y-1/2 w-96 h-96 bg-gradient-to-br from-cyan-200/20 to-blue-300/20 rounded-full blur-3xl animate-float" style={{ animationDelay: '4s' }}></div>
      </div>

      <div className="relative z-10 p-6">
        {/* Header */}
        <div className="mb-8">
          <div className="flex items-center justify-between">
            <div className="flex items-center space-x-4">
              <div className="p-3 bg-gradient-to-br from-primary-500 to-primary-600 rounded-2xl shadow-lg">
                <UsersIcon className="h-8 w-8 text-white" />
              </div>
              <div>
                <h1 className="text-3xl font-bold gradient-text">
                  User Management
                </h1>
                <p className="mt-3 text-lg text-gray-600">
                  Manage user accounts and permissions
                </p>
              </div>
            </div>
            <div className="flex items-center gap-3">
              <button 
                onClick={() => setIsModalOpen(true)}
                className="group relative overflow-hidden bg-gradient-to-r from-primary-600 to-primary-700 hover:from-primary-700 hover:to-primary-800 text-white font-bold py-3 px-6 rounded-2xl shadow-2xl hover:shadow-3xl transition-all duration-300 transform hover:-translate-y-1 hover:scale-105"
              >
                <div className="absolute inset-0 bg-gradient-to-r from-white/20 to-transparent rounded-2xl opacity-0 group-hover:opacity-100 transition-opacity duration-300"></div>
                <span className="relative z-10 flex items-center">
                  <PlusIcon className="h-5 w-5 mr-2" />
                  New User
                </span>
              </button>
              <div className="flex gap-2">
                <button
                  className="group relative overflow-hidden bg-gradient-to-r from-gray-700 to-gray-800 hover:from-gray-800 hover:to-black text-white font-bold py-3 px-5 rounded-2xl shadow-xl hover:shadow-2xl transition-all duration-300 transform hover:-translate-y-1 hover:scale-105"
                  onClick={async () => {
                    try {
                      const { exportToCSV } = await import('../services/exportService');
                      exportToCSV('users', filteredUsers);
                      dispatch(addNotification({
                        type: 'success',
                        message: 'Users exported to CSV successfully'
                      }));
                    } catch (error) {
                      console.error('Export error:', error);
                      dispatch(addNotification({
                        type: 'error',
                        message: 'Failed to export users'
                      }));
                    }
                  }}
                >
                  CSV
                </button>
                <button
                  className="group relative overflow-hidden bg-gradient-to-r from-green-600 to-green-700 hover:from-green-700 hover:to-green-800 text-white font-bold py-3 px-5 rounded-2xl shadow-xl hover:shadow-2xl transition-all duration-300 transform hover:-translate-y-1 hover:scale-105"
                  onClick={async () => {
                    try {
                      const { exportToExcel } = await import('../services/exportService');
                      exportToExcel('users', filteredUsers);
                      dispatch(addNotification({
                        type: 'success',
                        message: 'Users exported to Excel successfully'
                      }));
                    } catch (error) {
                      console.error('Export error:', error);
                      dispatch(addNotification({
                        type: 'error',
                        message: 'Failed to export users'
                      }));
                    }
                  }}
                >
                  Excel
                </button>
                <button
                  className="group relative overflow-hidden bg-gradient-to-r from-red-600 to-red-700 hover:from-red-700 hover:to-red-800 text-white font-bold py-3 px-5 rounded-2xl shadow-xl hover:shadow-2xl transition-all duration-300 transform hover:-translate-y-1 hover:scale-105"
                  onClick={async () => {
                    try {
                      const { exportToPDF } = await import('../services/exportService');
                      exportToPDF('users', filteredUsers, 'User Report');
                      dispatch(addNotification({
                        type: 'success',
                        message: 'Users exported to PDF successfully'
                      }));
                    } catch (error) {
                      console.error('Export error:', error);
                      dispatch(addNotification({
                        type: 'error',
                        message: 'Failed to export users'
                      }));
                    }
                  }}
                >
                  PDF
                </button>
              </div>
            </div>
          </div>
        </div>

        {/* Search Bar */}
        <div className="mb-6">
          <div className="relative max-w-md">
            <div className="absolute inset-y-0 left-0 pl-3 flex items-center pointer-events-none">
              <MagnifyingGlassIcon className="h-5 w-5 text-gray-400" />
            </div>
            <input
              type="text"
              placeholder="Search users..."
              value={searchTerm}
              onChange={(e) => setSearchTerm(e.target.value)}
              className="block w-full pl-10 pr-3 py-3 border border-gray-300 rounded-xl leading-5 bg-white placeholder-gray-500 focus:outline-none focus:placeholder-gray-400 focus:ring-2 focus:ring-primary-500 focus:border-primary-500 transition-all duration-200"
            />
          </div>
        </div>

        {/* Users List */}
        {loading ? (
          <div className="flex justify-center items-center py-12">
            <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-primary-600"></div>
          </div>
        ) : filteredUsers.length === 0 ? (
          <div className="text-center py-12">
            <UsersIcon className="mx-auto h-12 w-12 text-gray-400" />
            <h3 className="mt-2 text-sm font-medium text-gray-900">No users found</h3>
            <p className="mt-1 text-sm text-gray-500">
              {searchTerm ? 'Try adjusting your search terms.' : 'Get started by creating a new user.'}
            </p>
            {!searchTerm && (
              <div className="mt-6">
                <button 
                  onClick={() => setIsModalOpen(true)}
                  className="bg-gradient-to-r from-primary-600 to-primary-700 hover:from-primary-700 hover:to-primary-800 text-white font-bold py-3 px-6 rounded-2xl shadow-lg hover:shadow-xl transition-all duration-300 transform hover:-translate-y-1"
                >
                  New User
                </button>
              </div>
            )}
          </div>
        ) : (
          <div className="grid gap-6">
            {filteredUsers.map((user) => (
              <div key={user.id} className="group relative bg-white/80 backdrop-blur-sm rounded-2xl shadow-lg hover:shadow-2xl transition-all duration-300 transform hover:-translate-y-1 border border-white/20">
                <div className="p-6">
                  <div className="flex items-start justify-between">
                    <div className="flex-1">
                      <div className="flex items-center space-x-3">
                        <div className="p-2 bg-gradient-to-br from-primary-100 to-primary-200 rounded-xl">
                          <UsersIcon className="h-6 w-6 text-primary-600" />
                        </div>
                        <div>
                          <h3 className="text-lg font-semibold text-gray-900 group-hover:text-primary-600 transition-colors">
                            {user.fullName}
                          </h3>
                          <p className="text-sm text-gray-600">@{user.username}</p>
                        </div>
                      </div>
                      <div className="mt-4 grid grid-cols-1 md:grid-cols-3 gap-4">
                        <div>
                          <p className="text-sm font-medium text-gray-500">Email</p>
                          <p className="text-sm text-gray-900">{user.email}</p>
                        </div>
                        <div>
                          <p className="text-sm font-medium text-gray-500">Role</p>
                          <span className={`inline-flex px-2 py-1 text-xs font-semibold rounded-full ${
                            user.role === 'SUPER_ADMIN' ? 'bg-purple-100 text-purple-800' :
                            user.role === 'ADMIN' ? 'bg-blue-100 text-blue-800' :
                            user.role === 'HCW' ? 'bg-green-100 text-green-800' :
                            'bg-gray-100 text-gray-800'
                          }`}>
                            {user.role}
                          </span>
                        </div>
                        <div>
                          <p className="text-sm font-medium text-gray-500">Status</p>
                          <span className={`inline-flex px-2 py-1 text-xs font-semibold rounded-full ${
                            user.isActive ? 'bg-green-100 text-green-800' : 'bg-red-100 text-red-800'
                          }`}>
                            {user.isActive ? 'Active' : 'Inactive'}
                          </span>
                        </div>
                      </div>
                      <div className="mt-3">
                        <p className="text-sm font-medium text-gray-500">Hospital</p>
                        <p className="text-sm text-gray-900">{getHospitalName(user.hospitalId || '')}</p>
                      </div>
                    </div>
                    <div className="flex items-center space-x-3">
                      {/* Only SUPER_ADMIN can manage claims */}
                      {user?.role === 'SUPER_ADMIN' && (
                        <button 
                          onClick={() => handleClaimsManagement(user)}
                          className="p-2 rounded-xl bg-purple-50 hover:bg-purple-100 text-purple-600 hover:text-purple-700 transition-all duration-200 transform hover:scale-110" 
                          title="Manage claims"
                        >
                          <ShieldCheckIcon className="h-5 w-5" />
                        </button>
                      )}
                      
                      {/* All users can edit (but only their own data or if they have permission) */}
                      <button 
                        onClick={() => handleEdit(user)}
                        className="p-2 rounded-xl bg-blue-50 hover:bg-blue-100 text-blue-600 hover:text-blue-700 transition-all duration-200 transform hover:scale-110" 
                        title="Edit user"
                      >
                        <PencilIcon className="h-5 w-5" />
                      </button>
                      
                      {/* Only SUPER_ADMIN and ADMIN can delete users */}
                      {(user?.role === 'SUPER_ADMIN' || user?.role === 'ADMIN') && (
                        <button 
                          onClick={() => handleDelete(user)}
                          className="p-2 rounded-xl bg-red-50 hover:bg-red-100 text-red-600 hover:text-red-700 transition-all duration-200 transform hover:scale-110" 
                          title="Delete user"
                        >
                          <TrashIcon className="h-5 w-5" />
                        </button>
                      )}
                    </div>
                  </div>
                </div>
              </div>
            ))}
          </div>
        )}
      </div>

      {/* User Form Modal */}
      <UserFormModal
        isOpen={isModalOpen}
        onClose={handleModalClose}
        onSuccess={handleModalSuccess}
        editingUser={editingUser}
      />

      {/* Claims Management Modal */}
      <ClaimsManagementModal
        isOpen={claimsModalOpen}
        onClose={handleClaimsModalClose}
        user={claimsUser}
        hospitals={hospitals}
      />
    </div>
  );
};

export default UsersPage;