import React, { useState, useEffect } from 'react';
import { useAppSelector, useAppDispatch } from '../hooks/redux';
import { addNotification } from '../store/slices/uiSlice';
import firebaseService from '../services/firebaseService';
import PatientFormModal from '../components/PatientFormModal';
import type { Patient, User } from '../types';
import {
  UserGroupIcon,
  PlusIcon,
  MagnifyingGlassIcon,
  PencilIcon,
  TrashIcon,
} from '@heroicons/react/24/outline';

const PatientsPage: React.FC = () => {
  const dispatch = useAppDispatch();
  const { user } = useAppSelector(state => state.auth);
  const [patients, setPatients] = useState<Patient[]>([]);
  const [loading, setLoading] = useState(true);
  const [searchTerm, setSearchTerm] = useState('');
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [editingPatient, setEditingPatient] = useState<Patient | null>(null);
  const [users, setUsers] = useState<User[]>([]);

  useEffect(() => {
    if (!user) return;
    setLoading(true);
    
    const loadPatients = async () => {
      try {
        console.log('🔴 Loading patients for user:', user?.role, user?.id);
        const result = await firebaseService.getPatients(user?.hospitalId, user?.role === 'HCW' ? user?.id : undefined);
        setPatients(result.data);
        setLoading(false);
      } catch (error) {
        console.error('🔴 Error loading patients:', error);
        setLoading(false);
      }
    };
    
    loadPatients();
  }, [user?.hospitalId, user?.role, user?.id, user?.username]);

  // Load users for HCW name mapping
  useEffect(() => {
    if (!user) return;
    if (user.role !== 'SUPER_ADMIN' && user.role !== 'ADMIN') {
      // HCW cannot list users due to rules; skip fetching users
      setUsers([]);
      return;
    }
    const loadUsers = async () => {
      try {
        const result = await firebaseService.getUsers(user?.hospitalId);
        setUsers(result.data);
      } catch (error) {
        console.error('Error loading users:', error);
      }
    };
    loadUsers();
  }, [user?.hospitalId, user?.role]);

  // Helper function to get HCW name from ID
  const getHcwName = (hcwId: string): string => {
    if (!hcwId) return 'Not assigned';
    const hcw = users.find(u => u.id === hcwId || u.username === hcwId);
    return hcw ? hcw.fullName : hcwId;
  };

  const loadPatients = async () => {
    try {
      setLoading(true);
      const result = await firebaseService.getPatients(user?.hospitalId, user?.role === 'HCW' ? user?.id : undefined);
      setPatients(result.data);
    } catch (error) {
      console.error('Error loading patients:', error);
      dispatch(addNotification({
        type: 'error',
        message: 'Failed to load patients'
      }));
    } finally {
      setLoading(false);
    }
  };

  const handleEdit = (patient: Patient) => {
    setEditingPatient(patient);
    setIsModalOpen(true);
  };

  const handleDelete = async (patient: Patient) => {
    if (window.confirm(`Are you sure you want to delete "${patient.fullName}"?`)) {
      try {
        await firebaseService.deletePatient(patient.id);
        dispatch(addNotification({
          type: 'success',
          message: 'Patient deleted successfully'
        }));
        loadPatients();
      } catch (error) {
        console.error('Error deleting patient:', error);
        dispatch(addNotification({
          type: 'error',
          message: 'Failed to delete patient'
        }));
      }
    }
  };

  const handleModalClose = () => {
    setIsModalOpen(false);
    setEditingPatient(null);
  };

  const handleModalSuccess = async () => {
    await loadPatients();
  };

  const filteredPatients = patients.filter(patient =>
    patient.fullName.toLowerCase().includes(searchTerm.toLowerCase()) ||
    patient.ccNumber.toLowerCase().includes(searchTerm.toLowerCase()) ||
    (patient.phoneNumber && patient.phoneNumber.toLowerCase().includes(searchTerm.toLowerCase()))
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
                <UserGroupIcon className="h-8 w-8 text-white" />
              </div>
              <div>
                <h1 className="text-3xl font-bold gradient-text">
                  Patient Management
                </h1>
                <p className="mt-3 text-lg text-gray-600">
                  Manage patient records and medical information
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
                  New Patient
                </span>
              </button>
              <div className="flex gap-2">
                <button
                  className="group relative overflow-hidden bg-gradient-to-r from-gray-700 to-gray-800 hover:from-gray-800 hover:to-black text-white font-bold py-3 px-5 rounded-2xl shadow-xl hover:shadow-2xl transition-all duration-300 transform hover:-translate-y-1 hover:scale-105"
                  onClick={async () => {
                    try {
                      const { exportToCSV } = await import('../services/exportService');
                      const rows = filteredPatients.map(p => ({
                        FullName: p.fullName,
                        CCNumber: p.ccNumber,
                        Status: p.status,
                        AssignedHCW: getHcwName(p.assignedHCW || ''),
                        Phone: p.phoneNumber || '',
                        Gender: p.gender,
                        Age: p.age || '',
                      }));
                      exportToCSV('patients', rows);
                      dispatch(addNotification({
                        type: 'success',
                        message: 'Patients exported to CSV successfully'
                      }));
                    } catch (error) {
                      console.error('Export error:', error);
                      dispatch(addNotification({
                        type: 'error',
                        message: 'Failed to export patients'
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
                      const rows = filteredPatients.map(p => ({
                        FullName: p.fullName,
                        CCNumber: p.ccNumber,
                        Status: p.status,
                        AssignedHCW: getHcwName(p.assignedHCW || ''),
                        Phone: p.phoneNumber || '',
                        Gender: p.gender,
                        Age: p.age || '',
                      }));
                      exportToExcel('patients', rows);
                      dispatch(addNotification({
                        type: 'success',
                        message: 'Patients exported to Excel successfully'
                      }));
                    } catch (error) {
                      console.error('Export error:', error);
                      dispatch(addNotification({
                        type: 'error',
                        message: 'Failed to export patients'
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
                      const rows = filteredPatients.map(p => ({
                        FullName: p.fullName,
                        CCNumber: p.ccNumber,
                        Status: p.status,
                        AssignedHCW: getHcwName(p.assignedHCW || ''),
                        Phone: p.phoneNumber || '',
                        Gender: p.gender,
                        Age: p.age || '',
                      }));
                      exportToPDF('patients', rows, 'Patient Report');
                      dispatch(addNotification({
                        type: 'success',
                        message: 'Patients exported to PDF successfully'
                      }));
                    } catch (error) {
                      console.error('Export error:', error);
                      dispatch(addNotification({
                        type: 'error',
                        message: 'Failed to export patients'
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
              placeholder="Search patients..."
              value={searchTerm}
              onChange={(e) => setSearchTerm(e.target.value)}
              className="block w-full pl-10 pr-3 py-3 border border-gray-300 rounded-xl leading-5 bg-white placeholder-gray-500 focus:outline-none focus:placeholder-gray-400 focus:ring-2 focus:ring-primary-500 focus:border-primary-500 transition-all duration-200"
            />
          </div>
        </div>

        {/* Patients List */}
        {loading ? (
          <div className="flex justify-center items-center py-12">
            <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-primary-600"></div>
          </div>
        ) : filteredPatients.length === 0 ? (
          <div className="text-center py-12">
            <UserGroupIcon className="mx-auto h-12 w-12 text-gray-400" />
            <h3 className="mt-2 text-sm font-medium text-gray-900">No patients found</h3>
            <p className="mt-1 text-sm text-gray-500">
              {searchTerm ? 'Try adjusting your search terms.' : 'Get started by creating a new patient.'}
            </p>
            {!searchTerm && (
              <div className="mt-6">
                <button 
                  onClick={() => setIsModalOpen(true)}
                  className="bg-gradient-to-r from-primary-600 to-primary-700 hover:from-primary-700 hover:to-primary-800 text-white font-bold py-3 px-6 rounded-2xl shadow-lg hover:shadow-xl transition-all duration-300 transform hover:-translate-y-1"
                >
                  New Patient
                </button>
              </div>
            )}
          </div>
        ) : (
          <div className="grid gap-6">
            {filteredPatients.map((patient) => (
              <div key={patient.id} className="group relative bg-white/80 backdrop-blur-sm rounded-2xl shadow-lg hover:shadow-2xl transition-all duration-300 transform hover:-translate-y-1 border border-white/20">
                <div className="p-6">
                  <div className="flex items-start justify-between">
                    <div className="flex-1">
                      <div className="flex items-center space-x-3">
                        <div className="p-2 bg-gradient-to-br from-primary-100 to-primary-200 rounded-xl">
                          <UserGroupIcon className="h-6 w-6 text-primary-600" />
                        </div>
                        <div>
                          <h3 className="text-lg font-semibold text-gray-900 group-hover:text-primary-600 transition-colors">
                            {patient.fullName}
                          </h3>
                          <p className="text-sm text-gray-600">CC: {patient.ccNumber}</p>
                        </div>
                      </div>
                      <div className="mt-4 grid grid-cols-1 md:grid-cols-3 gap-4">
                        <div>
                          <p className="text-sm font-medium text-gray-500">Age & Gender</p>
                          <p className="text-sm text-gray-900">{patient.age} years, {patient.gender}</p>
                        </div>
                        {patient.phoneNumber && (
                          <div>
                            <p className="text-sm font-medium text-gray-500">Phone</p>
                            <p className="text-sm text-gray-900">{patient.phoneNumber}</p>
                          </div>
                        )}
                        <div>
                          <p className="text-sm font-medium text-gray-500">Status</p>
                          <span className={`inline-flex px-2 py-1 text-xs font-semibold rounded-full ${
                            patient.status === 'new_case' ? 'bg-blue-100 text-blue-800' :
                            patient.status === 'on_treatment' ? 'bg-yellow-100 text-yellow-800' :
                            patient.status === 'completed' ? 'bg-green-100 text-green-800' :
                            'bg-gray-100 text-gray-800'
                          }`}>
                            {patient.status.replace('_', ' ').toUpperCase()}
                          </span>
                        </div>
                      </div>
                      {patient.address && (
                        <div className="mt-3">
                          <p className="text-sm font-medium text-gray-500">Address</p>
                          <p className="text-sm text-gray-900">{patient.address}</p>
                        </div>
                      )}
                      <div className="mt-3">
                        <p className="text-sm font-medium text-gray-500">Assigned HCW</p>
                        <p className="text-sm text-gray-900">{getHcwName(patient.assignedHCW || '')}</p>
                      </div>
                    </div>
                    <div className="flex items-center space-x-3">
                      <button 
                        onClick={() => handleEdit(patient)}
                        className="p-2 rounded-xl bg-blue-50 hover:bg-blue-100 text-blue-600 hover:text-blue-700 transition-all duration-200 transform hover:scale-110" 
                        title="Edit patient"
                      >
                        <PencilIcon className="h-5 w-5" />
                      </button>
                      <button 
                        onClick={() => handleDelete(patient)}
                        className="p-2 rounded-xl bg-red-50 hover:bg-red-100 text-red-600 hover:text-red-700 transition-all duration-200 transform hover:scale-110" 
                        title="Delete patient"
                      >
                        <TrashIcon className="h-5 w-5" />
                      </button>
                    </div>
                  </div>
                </div>
              </div>
            ))}
          </div>
        )}
      </div>

      {/* Patient Form Modal */}
      <PatientFormModal
        isOpen={isModalOpen}
        onClose={handleModalClose}
        onSuccess={handleModalSuccess}
        editingPatient={editingPatient}
      />
    </div>
  );
};

export default PatientsPage;