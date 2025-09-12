import React, { useState, useEffect } from 'react';
import { useAppDispatch } from '../hooks/redux';
import { addNotification } from '../store/slices/uiSlice';
import firebaseService from '../services/firebaseService';
import HospitalFormModal from '../components/HospitalFormModal';
import type { Hospital } from '../types';
import {
  BuildingOfficeIcon,
  PlusIcon,
  MagnifyingGlassIcon,
  PencilIcon,
  TrashIcon,
} from '@heroicons/react/24/outline';

const HospitalsPage: React.FC = () => {
  const dispatch = useAppDispatch();
  const [hospitals, setHospitals] = useState<Hospital[]>([]);
  const [loading, setLoading] = useState(true);
  const [searchTerm, setSearchTerm] = useState('');
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [editingHospital, setEditingHospital] = useState<Hospital | null>(null);

  useEffect(() => {
    setLoading(true);
    const unsubscribe = firebaseService.streamHospitals((result) => {
      setHospitals(result.data);
      setLoading(false);
    });
    return () => unsubscribe && unsubscribe();
  }, []);

  const loadHospitals = async () => {
    try {
      setLoading(true);
      const result = await firebaseService.getHospitals();
      setHospitals(result.data);
    } catch (error) {
      console.error('Error loading hospitals:', error);
      dispatch(addNotification({
        type: 'error',
        message: 'Failed to load hospitals'
      }));
    } finally {
      setLoading(false);
    }
  };

  const handleEdit = (hospital: Hospital) => {
    setEditingHospital(hospital);
    setIsModalOpen(true);
  };

  const handleDelete = async (hospital: Hospital) => {
    if (window.confirm(`Are you sure you want to delete ${hospital.name}?`)) {
      try {
        await firebaseService.deleteHospital(hospital.id);
        dispatch(addNotification({
          type: 'success',
          message: 'Hospital deleted successfully'
        }));
        loadHospitals();
      } catch (error) {
        console.error('Error deleting hospital:', error);
        dispatch(addNotification({
          type: 'error',
          message: 'Failed to delete hospital'
        }));
      }
    }
  };

  const handleModalClose = () => {
    setIsModalOpen(false);
    setEditingHospital(null);
  };

  const handleModalSuccess = () => {
    // No-op: realtime stream updates list
  };

  const filteredHospitals = hospitals.filter(hospital =>
    hospital.name.toLowerCase().includes(searchTerm.toLowerCase()) ||
    hospital.address.toLowerCase().includes(searchTerm.toLowerCase()) ||
    hospital.lga.toLowerCase().includes(searchTerm.toLowerCase()) ||
    hospital.state.toLowerCase().includes(searchTerm.toLowerCase())
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
                <BuildingOfficeIcon className="h-8 w-8 text-white" />
              </div>
              <div>
                <h1 className="text-3xl font-bold gradient-text">
                  Hospital Management
                </h1>
                <p className="mt-3 text-lg text-gray-600">
                  Manage healthcare facilities and their information
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
                  New Hospital
                </span>
              </button>
              <div className="flex gap-2">
                <button
                  className="group relative overflow-hidden bg-gradient-to-r from-gray-700 to-gray-800 hover:from-gray-800 hover:to-black text-white font-bold py-3 px-5 rounded-2xl shadow-xl hover:shadow-2xl transition-all duration-300 transform hover:-translate-y-1 hover:scale-105"
                  onClick={async () => {
                    try {
                      const { exportToCSV } = await import('../services/exportService');
                      exportToCSV('hospitals', filteredHospitals);
                      dispatch(addNotification({
                        type: 'success',
                        message: 'Hospitals exported to CSV successfully'
                      }));
                    } catch (error) {
                      console.error('Export error:', error);
                      dispatch(addNotification({
                        type: 'error',
                        message: 'Failed to export hospitals'
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
                      exportToExcel('hospitals', filteredHospitals);
                      dispatch(addNotification({
                        type: 'success',
                        message: 'Hospitals exported to Excel successfully'
                      }));
                    } catch (error) {
                      console.error('Export error:', error);
                      dispatch(addNotification({
                        type: 'error',
                        message: 'Failed to export hospitals'
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
                      exportToPDF('hospitals', filteredHospitals, 'Hospital Report');
                      dispatch(addNotification({
                        type: 'success',
                        message: 'Hospitals exported to PDF successfully'
                      }));
                    } catch (error) {
                      console.error('Export error:', error);
                      dispatch(addNotification({
                        type: 'error',
                        message: 'Failed to export hospitals'
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
              placeholder="Search hospitals..."
              value={searchTerm}
              onChange={(e) => setSearchTerm(e.target.value)}
              className="block w-full pl-10 pr-3 py-3 border border-gray-300 rounded-xl leading-5 bg-white placeholder-gray-500 focus:outline-none focus:placeholder-gray-400 focus:ring-2 focus:ring-primary-500 focus:border-primary-500 transition-all duration-200"
            />
          </div>
        </div>

        {/* Hospitals List */}
        {loading ? (
          <div className="flex justify-center items-center py-12">
            <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-primary-600"></div>
          </div>
        ) : filteredHospitals.length === 0 ? (
          <div className="text-center py-12">
            <BuildingOfficeIcon className="mx-auto h-12 w-12 text-gray-400" />
            <h3 className="mt-2 text-sm font-medium text-gray-900">No hospitals found</h3>
            <p className="mt-1 text-sm text-gray-500">
              {searchTerm ? 'Try adjusting your search terms.' : 'Get started by creating a new hospital.'}
            </p>
            {!searchTerm && (
              <div className="mt-6">
                <button 
                  onClick={() => setIsModalOpen(true)}
                  className="bg-gradient-to-r from-primary-600 to-primary-700 hover:from-primary-700 hover:to-primary-800 text-white font-bold py-3 px-6 rounded-2xl shadow-lg hover:shadow-xl transition-all duration-300 transform hover:-translate-y-1"
                >
                  New Hospital
                </button>
              </div>
            )}
          </div>
        ) : (
          <div className="grid gap-6">
            {filteredHospitals.map((hospital) => (
              <div key={hospital.id} className="group relative bg-white/80 backdrop-blur-sm rounded-2xl shadow-lg hover:shadow-2xl transition-all duration-300 transform hover:-translate-y-1 border border-white/20">
                <div className="p-6">
                  <div className="flex items-start justify-between">
                    <div className="flex-1">
                      <div className="flex items-center space-x-3">
                        <div className="p-2 bg-gradient-to-br from-primary-100 to-primary-200 rounded-xl">
                          <BuildingOfficeIcon className="h-6 w-6 text-primary-600" />
                        </div>
                        <div>
                          <h3 className="text-lg font-semibold text-gray-900 group-hover:text-primary-600 transition-colors">
                            {hospital.name}
                          </h3>
                          <p className="text-sm text-gray-600">{hospital.lga}, {hospital.state}</p>
                        </div>
                      </div>
                      <div className="mt-4 grid grid-cols-1 md:grid-cols-2 gap-4">
                        <div>
                          <p className="text-sm font-medium text-gray-500">Address</p>
                          <p className="text-sm text-gray-900">{hospital.address}</p>
                        </div>
                        {hospital.phoneNumber && (
                          <div>
                            <p className="text-sm font-medium text-gray-500">Phone</p>
                            <p className="text-sm text-gray-900">{hospital.phoneNumber}</p>
                          </div>
                        )}
                        {hospital.email && (
                          <div>
                            <p className="text-sm font-medium text-gray-500">Email</p>
                            <p className="text-sm text-gray-900">{hospital.email}</p>
                          </div>
                        )}
                        {hospital.capacity && (
                          <div>
                            <p className="text-sm font-medium text-gray-500">Capacity</p>
                            <p className="text-sm text-gray-900">{hospital.capacity} beds</p>
                          </div>
                        )}
                      </div>
                      {hospital.specialties && hospital.specialties.length > 0 && (
                        <div className="mt-3">
                          <p className="text-sm font-medium text-gray-500">Specialties</p>
                          <div className="flex flex-wrap gap-1 mt-1">
                            {hospital.specialties.map((specialty, index) => (
                              <span key={index} className="inline-flex px-2 py-1 text-xs font-medium bg-blue-100 text-blue-800 rounded-full">
                                {specialty}
                              </span>
                            ))}
                          </div>
                        </div>
                      )}
                    </div>
                    <div className="flex items-center space-x-3">
                      <button 
                        onClick={() => handleEdit(hospital)}
                        className="p-2 rounded-xl bg-blue-50 hover:bg-blue-100 text-blue-600 hover:text-blue-700 transition-all duration-200 transform hover:scale-110" 
                        title="Edit hospital"
                      >
                        <PencilIcon className="h-5 w-5" />
                      </button>
                      <button 
                        onClick={() => handleDelete(hospital)}
                        className="p-2 rounded-xl bg-red-50 hover:bg-red-100 text-red-600 hover:text-red-700 transition-all duration-200 transform hover:scale-110" 
                        title="Delete hospital"
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

      {/* Hospital Form Modal */}
      <HospitalFormModal
        isOpen={isModalOpen}
        onClose={handleModalClose}
        onSuccess={handleModalSuccess}
        editingHospital={editingHospital}
      />
    </div>
  );
};

export default HospitalsPage;