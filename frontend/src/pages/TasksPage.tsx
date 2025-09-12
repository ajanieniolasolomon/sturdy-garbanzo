import React, { useState, useEffect } from 'react';
import { useAppSelector, useAppDispatch } from '../hooks/redux';
import { addNotification } from '../store/slices/uiSlice';
import firebaseService from '../services/firebaseService';
import TaskFormModal from '../components/TaskFormModal';
import type { Task } from '../types';
import {
  CheckCircleIcon,
  PlusIcon,
  MagnifyingGlassIcon,
  PencilIcon,
  TrashIcon,
} from '@heroicons/react/24/outline';

const TasksPage: React.FC = () => {
  const dispatch = useAppDispatch();
  const { user } = useAppSelector(state => state.auth);
  const [tasks, setTasks] = useState<Task[]>([]);
  const [loading, setLoading] = useState(true);
  const [searchTerm, setSearchTerm] = useState('');
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [editingTask, setEditingTask] = useState<Task | null>(null);

  const fetchTasks = async () => {
    try {
      console.log('🔴 Loading tasks for user:', user?.role, user?.id);
      const result = await firebaseService.getTasks(user?.hospitalId);
      let filtered = result.data;
      // HCW should see only tasks assigned to them
      if (user?.role === 'HCW') {
        filtered = result.data.filter(t => t.assignedTo === user.id);
        console.log('🔴 HCW filtered tasks:', filtered.length, 'out of', result.data.length);
      }
      setTasks(filtered);
    } catch (error) {
      console.error('Error loading tasks:', error);
      dispatch(addNotification({ type: 'error', message: 'Failed to load tasks' }));
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    if (!user) return;
    setLoading(true);
    fetchTasks();
  }, [user?.hospitalId, user?.role, user?.id]);

  // removed old loadTasks (replaced by fetchTasks)

  const handleEdit = (task: Task) => {
    setEditingTask(task);
    setIsModalOpen(true);
  };

  const handleDelete = async (task: Task) => {
    if (window.confirm(`Are you sure you want to delete "${task.title}"?`)) {
      try {
        await firebaseService.deleteTask(task.id);
        dispatch(addNotification({
          type: 'success',
          message: 'Task deleted successfully'
        }));
        setLoading(true);
        await fetchTasks();
      } catch (error) {
        console.error('Error deleting task:', error);
        dispatch(addNotification({
          type: 'error',
          message: 'Failed to delete task'
        }));
      }
    }
  };

  const handleModalClose = () => {
    setIsModalOpen(false);
    setEditingTask(null);
  };

  const handleModalSuccess = async () => {
    setLoading(true);
    await fetchTasks();
  };

  const filteredTasks = tasks.filter(task =>
    task.title.toLowerCase().includes(searchTerm.toLowerCase()) ||
    (task.description && task.description.toLowerCase().includes(searchTerm.toLowerCase())) ||
    task.assignedToName.toLowerCase().includes(searchTerm.toLowerCase())
  );

  const getStatusColor = (status: string) => {
    switch (status) {
      case 'pending': return 'bg-yellow-100 text-yellow-800';
      case 'in_progress': return 'bg-blue-100 text-blue-800';
      case 'completed': return 'bg-green-100 text-green-800';
      case 'cancelled': return 'bg-red-100 text-red-800';
      default: return 'bg-gray-100 text-gray-800';
    }
  };

  const getPriorityColor = (priority: string) => {
    switch (priority) {
      case 'urgent': return 'bg-red-100 text-red-800';
      case 'high': return 'bg-orange-100 text-orange-800';
      case 'medium': return 'bg-yellow-100 text-yellow-800';
      case 'low': return 'bg-green-100 text-green-800';
      default: return 'bg-gray-100 text-gray-800';
    }
  };

  if (loading) {
    return (
      <div className="min-h-screen bg-gradient-to-br from-gray-50 via-blue-50 to-indigo-50 flex items-center justify-center">
        <div className="bg-white/90 backdrop-blur-lg rounded-3xl shadow-2xl p-12">
          <div className="flex flex-col items-center">
            <div className="animate-spin rounded-full h-16 w-16 border-4 border-primary-200 border-t-primary-600 mb-4"></div>
            <p className="text-lg font-semibold text-gray-700">Loading tasks...</p>
          </div>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-gradient-to-br from-gray-50 via-blue-50 to-indigo-50 relative overflow-hidden">
      {/* Animated background elements */}
      <div className="absolute inset-0 overflow-hidden pointer-events-none">
        <div className="absolute top-20 right-20 w-32 h-32 bg-gradient-to-r from-primary-200 to-primary-300 rounded-full mix-blend-multiply filter blur-xl opacity-60 animate-float"></div>
        <div className="absolute bottom-20 left-20 w-40 h-40 bg-gradient-to-r from-green-200 to-green-300 rounded-full mix-blend-multiply filter blur-xl opacity-60 animate-float" style={{animationDelay: '3s'}}></div>
      </div>

      <div className="relative z-10 max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8 space-y-8">
        {/* Header */}
        <div className="flex justify-between items-center animate-slide-up">
          <div>
            <h1 className="text-4xl font-black gradient-text">Tasks</h1>
            <p className="mt-3 text-lg text-gray-600">
              Manage tasks and assignments
            </p>
          </div>
          <div className="flex items-center gap-3">
                  <button 
                    onClick={() => setIsModalOpen(true)}
                    className="group relative overflow-hidden bg-gradient-to-r from-primary-600 to-primary-700 hover:from-primary-700 hover:to-primary-800 text-white font-bold py-3 px-6 rounded-2xl shadow-2xl hover:shadow-3xl transition-all duration-300 transform hover:-translate-y-1 hover:scale-105"
                  >
                    <div className="absolute inset-0 bg-gradient-to-r from-white/20 to-transparent rounded-2xl opacity-0 group-hover:opacity-100 transition-opacity duration-300"></div>
                    <span className="relative z-10 flex items-center">
                      <PlusIcon className="h-5 w-5 mr-2" />
                      New Task
                    </span>
                  </button>
            <div className="flex gap-2">
              <button
                className="group relative overflow-hidden bg-gradient-to-r from-gray-700 to-gray-800 hover:from-gray-800 hover:to-black text-white font-bold py-3 px-5 rounded-2xl shadow-xl hover:shadow-2xl transition-all duration-300 transform hover:-translate-y-1 hover:scale-105"
                onClick={async () => {
                  try {
                    const { exportToCSV } = await import('../services/exportService');
                    const rows = filteredTasks.map(t => ({
                      Title: t.title,
                      Status: t.status,
                      Priority: t.priority,
                      Assignee: t.assignedToName,
                      DueDate: t.dueDate ? new Date(t.dueDate).toLocaleDateString() : ''
                    }));
                    exportToCSV('tasks', rows);
                  } catch (e) { console.error('Export CSV failed', e); }
                }}
                title="Export CSV"
              >CSV</button>
              <button
                className="group relative overflow-hidden bg-gradient-to-r from-emerald-600 to-emerald-700 hover:from-emerald-700 hover:to-emerald-800 text-white font-bold py-3 px-5 rounded-2xl shadow-xl hover:shadow-2xl transition-all duration-300 transform hover:-translate-y-1 hover:scale-105"
                onClick={async () => {
                  try {
                    const { exportToExcel } = await import('../services/exportService');
                    const rows = filteredTasks.map(t => ({
                      Title: t.title,
                      Status: t.status,
                      Priority: t.priority,
                      Assignee: t.assignedToName,
                      DueDate: t.dueDate ? new Date(t.dueDate).toLocaleDateString() : ''
                    }));
                    exportToExcel('tasks', rows);
                  } catch (e) { console.error('Export Excel failed', e); }
                }}
                title="Export Excel"
              >Excel</button>
              <button
                className="group relative overflow-hidden bg-gradient-to-r from-rose-600 to-rose-700 hover:from-rose-700 hover:to-rose-800 text-white font-bold py-3 px-5 rounded-2xl shadow-xl hover:shadow-2xl transition-all duration-300 transform hover:-translate-y-1 hover:scale-105"
                onClick={async () => {
                  try {
                    const { exportToPDF } = await import('../services/exportService');
                    const rows = filteredTasks.map(t => ({
                      Title: t.title,
                      Status: t.status,
                      Priority: t.priority,
                      Assignee: t.assignedToName,
                      DueDate: t.dueDate ? new Date(t.dueDate).toLocaleDateString() : ''
                    }));
                    exportToPDF('tasks', rows, 'Tasks Report');
                  } catch (e) { console.error('Export PDF failed', e); }
                }}
                title="Export PDF"
              >PDF</button>
            </div>
          </div>
        </div>

        {/* Search */}
        <div className="relative animate-fade-in" style={{animationDelay: '0.2s'}}>
          <div className="absolute inset-y-0 left-0 pl-4 flex items-center pointer-events-none">
            <MagnifyingGlassIcon className="h-6 w-6 text-gray-400" />
          </div>
          <input
            type="text"
            placeholder="Search tasks by title, description, or assignee..."
            value={searchTerm}
            onChange={(e) => setSearchTerm(e.target.value)}
            className="w-full px-5 py-4 pl-12 border border-gray-200 rounded-2xl focus:outline-none focus:ring-2 focus:ring-primary-500 focus:border-transparent transition-all duration-300 bg-white/70 backdrop-blur-sm hover:bg-white/90 focus:bg-white shadow-lg hover:shadow-xl"
          />
        </div>

        {/* Tasks List */}
        <div className="bg-white/90 backdrop-blur-lg rounded-3xl shadow-2xl border border-white/30 overflow-hidden animate-scale-in" style={{animationDelay: '0.4s'}}>
          <div className="px-8 py-6 border-b border-gray-200/50 bg-gradient-to-r from-gray-50 to-gray-100">
            <h3 className="text-xl font-bold text-gray-900">Task Board</h3>
            <p className="text-sm text-gray-600 mt-1">{filteredTasks.length} tasks found</p>
          </div>
          <div className="divide-y divide-gray-100">
            {filteredTasks.map((task, index) => (
              <div key={task.id} className="group hover:bg-gradient-to-r hover:from-blue-50/50 hover:to-indigo-50/50 transition-all duration-300 px-8 py-6 animate-slide-up" style={{animationDelay: `${index * 0.06}s`}}>
                <div className="flex items-center justify-between">
                  <div className="flex items-center">
                    <div className="flex-shrink-0">
                      <div className="h-12 w-12 rounded-2xl bg-gradient-to-br from-blue-500 to-blue-600 flex items-center justify-center shadow-lg group-hover:shadow-xl transition-all duration-300">
                        <CheckCircleIcon className="h-6 w-6 text-white" />
                      </div>
                    </div>
                    <div className="ml-6">
                      <div className="flex items-center flex-wrap gap-2">
                        <p className="text-lg font-bold text-gray-900">
                          {task.title}
                        </p>
                        <span className={`inline-flex items-center px-3 py-1 rounded-full text-xs font-bold ${getStatusColor(task.status)}`}>
                          {task.status.replace('_', ' ')}
                        </span>
                        <span className={`inline-flex items-center px-3 py-1 rounded-full text-xs font-bold ${getPriorityColor(task.priority)}`}>
                          {task.priority}
                        </span>
                      </div>
                      <div className="mt-2 text-sm text-gray-600">
                        <span className="font-medium">Assigned to: {task.assignedToName}</span>
                        {task.dueDate && (
                          <span className="ml-4">Due: {new Date(task.dueDate).toLocaleDateString()}</span>
                        )}
                      </div>
                      {task.description && (
                        <div className="mt-1 text-sm text-gray-500">
                          {task.description}
                        </div>
                      )}
                    </div>
                  </div>
                  <div className="flex items-center space-x-3">
                    <button 
                      onClick={() => handleEdit(task)}
                      className="p-2 rounded-xl bg-blue-50 hover:bg-blue-100 text-blue-600 hover:text-blue-700 transition-all duration-200 transform hover:scale-110" 
                      title="Edit task"
                    >
                      <PencilIcon className="h-5 w-5" />
                    </button>
                    <button 
                      onClick={() => handleDelete(task)}
                      className="p-2 rounded-xl bg-red-50 hover:bg-red-100 text-red-600 hover:text-red-700 transition-all duration-200 transform hover:scale-110" 
                      title="Delete task"
                    >
                      <TrashIcon className="h-5 w-5" />
                    </button>
                  </div>
                </div>
              </div>
            ))}
          </div>
        </div>

        {filteredTasks.length === 0 && (
          <div className="text-center py-16 animate-fade-in">
            <div className="bg-white/90 backdrop-blur-lg rounded-3xl shadow-2xl p-12 border border-white/30">
              <div className="h-20 w-20 mx-auto rounded-3xl bg-gradient-to-br from-gray-200 to-gray-300 flex items-center justify-center mb-6">
                <CheckCircleIcon className="h-10 w-10 text-gray-500" />
              </div>
              <h3 className="text-xl font-bold text-gray-900 mb-2">No tasks found</h3>
              <p className="text-gray-600 mb-6">
                {searchTerm ? 'Try adjusting your search terms.' : 'Get started by creating a new task.'}
              </p>
              {!searchTerm && (
                <button onClick={() => setIsModalOpen(true)} className="bg-gradient-to-r from-primary-600 to-primary-700 hover:from-primary-700 hover:to-primary-800 text-white font-bold py-3 px-6 rounded-2xl shadow-lg hover:shadow-xl transition-all duration-300 transform hover:-translate-y-1">
                  New Task
                </button>
              )}
            </div>
          </div>
        )}
      </div>

      {/* Task Form Modal */}
      <TaskFormModal
        isOpen={isModalOpen}
        onClose={handleModalClose}
        onSuccess={handleModalSuccess}
        editingTask={editingTask}
      />
    </div>
  );
};

export default TasksPage;
