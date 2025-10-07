import React, { useState, useEffect } from 'react';
import { useAppSelector, useAppDispatch } from '../hooks/redux';
import { addNotification } from '../store/slices/uiSlice';
import firebaseService from '../services/firebaseService';
import validationService from '../services/validationService';
import type { Task, TaskForm, User, Patient } from '../types';
import {
  XMarkIcon,
  CalendarIcon,
  ExclamationTriangleIcon,
} from '@heroicons/react/24/outline';

interface TaskFormModalProps {
  isOpen: boolean;
  onClose: () => void;
  onSuccess: () => void;
  editingTask?: Task | null;
}

const TaskFormModal: React.FC<TaskFormModalProps> = ({
  isOpen,
  onClose,
  onSuccess,
  editingTask
}) => {
  const dispatch = useAppDispatch();
  const { user } = useAppSelector(state => state.auth);
  const [users, setUsers] = useState<User[]>([]);
  const [patients, setPatients] = useState<Patient[]>([]);
  const [loading, setLoading] = useState(false);
  const [errors, setErrors] = useState<Record<string, string>>({});

  const [formData, setFormData] = useState<TaskForm>({
    title: '',
    description: '',
    priority: 'medium',
    assignedTo: '',
    dueDate: '',
    patientId: '',
    patientName: '',
  });

  useEffect(() => {
    if (isOpen) {
      loadUsers();
      loadPatients();
      if (editingTask) {
        setFormData({
          title: editingTask.title,
          description: editingTask.description || '',
          priority: editingTask.priority,
          assignedTo: editingTask.assignedTo,
          dueDate: editingTask.dueDate ? editingTask.dueDate.split('T')[0] : '',
          patientId: editingTask.patientId || '',
          patientName: editingTask.patientName || '',
        });
      } else {
        resetForm();
      }
    }
  }, [isOpen, editingTask]);

  const loadUsers = async () => {
    try {
      const result = await firebaseService.getUsers(user?.hospitalId);
      setUsers(result.data);
    } catch (error) {
      console.error('Error loading users:', error);
    }
  };

  const loadPatients = async () => {
    try {
      const result = await firebaseService.getPatients();
      setPatients(result.data);
    } catch (error) {
      console.error('Error loading patients for task modal:', error);
    }
  };

  const resetForm = () => {
    setFormData({
      title: '',
      description: '',
      priority: 'medium',
      assignedTo: '',
      dueDate: '',
      patientId: '',
      patientName: '',
    });
    setErrors({});
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    
    // Validate form
  if(!editingTask) {
    const validation = validationService.validateForm(
      formData,
      validationService.getTaskValidationRules()
    );

    if (!validation.isValid) {
      setErrors(validation.errors);
      return;
    }
  }


    try {
      setLoading(true);
      
      const assignedUser = users.find(u => u.id === formData.assignedTo);
      
      if (editingTask) {
        console.log('🔴 Updating task:', editingTask.id);
        const assignedUser = users.find(u => u.id === formData.assignedTo);
        await firebaseService.updateTask(editingTask.id, {
          ...formData,
          assignedToName: assignedUser?.fullName || editingTask.assignedToName,
        });
        dispatch(addNotification({
          type: 'success',
          message: 'Task updated successfully'
        }));
      } else {
        await firebaseService.createTask({
          ...formData,
          assignedToName: assignedUser?.fullName || '',
          hospitalId: user?.hospitalId || '',
        });
        dispatch(addNotification({
          type: 'success',
          message: 'Task created successfully'
        }));
      }
      
      onSuccess();
      onClose();
      resetForm();
    } catch (error) {
      console.error('Error saving task:', error);
      dispatch(addNotification({
        type: 'error',
        message: 'Failed to save task'
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
        
        <div className="relative bg-white rounded-2xl shadow-2xl w-full max-w-2xl">
          <div className="flex items-center justify-between p-6 border-b border-gray-200">
            <h3 className="text-2xl font-bold text-gray-900">
              {editingTask ? 'Edit Task' : 'Create New Task'}
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
              {/* Title */}
              <div className="md:col-span-2">
                <label className="block text-sm font-medium text-gray-700 mb-2">
                  Task Title *
                </label>
                <input
                  type="text"
                  name="title"
                  value={formData.title}
                  onChange={handleInputChange}
                  className={`w-full px-4 py-3 border rounded-xl focus:ring-2 focus:ring-primary-500 focus:border-primary-500 transition-colors ${
                    errors.title ? 'border-red-500' : 'border-gray-300'
                  }`}
                  placeholder="Enter task title"
                />
                {errors.title && (
                  <p className="mt-1 text-sm text-red-600 flex items-center">
                    <ExclamationTriangleIcon className="h-4 w-4 mr-1" />
                    {errors.title}
                  </p>
                )}
              </div>

              {/* Priority */}
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-2">
                  Priority *
                </label>
                <select
                  name="priority"
                  value={formData.priority}
                  onChange={handleInputChange}
                  className="w-full px-4 py-3 border border-gray-300 rounded-xl focus:ring-2 focus:ring-primary-500 focus:border-primary-500 transition-colors"
                >
                  <option value="low">Low</option>
                  <option value="medium">Medium</option>
                  <option value="high">High</option>
                  <option value="urgent">Urgent</option>
                </select>
              </div>

              {/* Assigned To */}
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-2">
                  Assign To *
                </label>
                <select
                  name="assignedTo"
                  value={formData.assignedTo}
                  onChange={handleInputChange}
                  className={`w-full px-4 py-3 border rounded-xl focus:ring-2 focus:ring-primary-500 focus:border-primary-500 transition-colors ${
                    errors.assignedTo ? 'border-red-500' : 'border-gray-300'
                  }`}
                >
                  <option value="">Select user</option>
                  {users.map((user) => (
                    <option key={user.id} value={user.id}>
                      {user.fullName} ({user.role})
                    </option>
                  ))}
                </select>
                {errors.assignedTo && (
                  <p className="mt-1 text-sm text-red-600 flex items-center">
                    <ExclamationTriangleIcon className="h-4 w-4 mr-1" />
                    {errors.assignedTo}
                  </p>
                )}
              </div>

              {/* Due Date */}
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-2">
                  Due Date *
                </label>
                <div className="relative">
                  <input
                    type="date"
                    name="dueDate"
                    value={formData.dueDate}
                    onChange={handleInputChange}
                    className={`w-full px-4 py-3 border rounded-xl focus:ring-2 focus:ring-primary-500 focus:border-primary-500 transition-colors ${
                      errors.dueDate ? 'border-red-500' : 'border-gray-300'
                    }`}
                  />
                  <CalendarIcon className="absolute right-3 top-3.5 h-5 w-5 text-gray-400" />
                </div>
                {errors.dueDate && (
                  <p className="mt-1 text-sm text-red-600 flex items-center">
                    <ExclamationTriangleIcon className="h-4 w-4 mr-1" />
                    {errors.dueDate}
                  </p>
                )}
              </div>

              {/* Patient (Optional) */}
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-2">
                  Related Patient (Optional)
                </label>
                <select
                  name="patientId"
                  value={formData.patientId}
                  onChange={(e) => {
                    const selected = patients.find(p => p.id === e.target.value);
                    setFormData(prev => ({ ...prev, patientId: e.target.value, patientName: selected?.fullName || '' }));
                  }}
                  className="w-full px-4 py-3 border border-gray-300 rounded-xl focus:ring-2 focus:ring-primary-500 focus:border-primary-500 transition-colors"
                >
                  <option value="">Select patient</option>
                  {patients.map(p => (
                    <option key={p.id} value={p.id}>{p.fullName} (CC: {p.ccNumber})</option>
                  ))}
                </select>
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
                rows={4}
                className="w-full px-4 py-3 border border-gray-300 rounded-xl focus:ring-2 focus:ring-primary-500 focus:border-primary-500 transition-colors resize-none"
                placeholder="Enter task description"
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
                    {editingTask ? 'Updating...' : 'Creating...'}
                  </div>
                ) : (
                  editingTask ? 'Update Task' : 'Create Task'
                )}
              </button>
            </div>
          </form>
        </div>
      </div>
    </div>
  );
};

export default TaskFormModal;
