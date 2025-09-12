import React, { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { useAppSelector } from '../hooks/redux';
import firebaseService from '../services/firebaseService';
import {
  BuildingOfficeIcon,
  UserGroupIcon,
  UsersIcon,
  ClipboardDocumentListIcon,
  CheckCircleIcon,
  PlusIcon,
  CalendarIcon,
  UserPlusIcon,
} from '@heroicons/react/24/outline';

const Dashboard: React.FC = () => {
  const navigate = useNavigate();
  const { user } = useAppSelector(state => state.auth);
  const [stats, setStats] = useState({
    hospitals: 0,
    patients: 0,
    users: 0,
    consultations: 0,
    tasks: 0,
  });
  const [loading, setLoading] = useState(true);
  const [followups, setFollowups] = useState<{ title: string; dueDate: string; patientName?: string; id: string }[]>([]);
  const buildHorizon = (days: number) => {
    const today = new Date();
    const slots: { date: string; count: number }[] = [];
    for (let i = 0; i < days; i++) {
      const d = new Date(today);
      d.setDate(today.getDate() + i);
      slots.push({ date: d.toISOString().split('T')[0], count: 0 });
    }
    followups.forEach(f => {
      const key = (f.dueDate || '').toString().split('T')[0];
      const slot = slots.find(s => s.date === key);
      if (slot) slot.count += 1;
    });
    return slots;
  };

  const loadDataWithAPI = async () => {
    try {
      console.log('🔴 Loading dashboard data with API calls for user:', user?.role, user?.id);
      // Fetch without hospital constraints; apply the same UI filtering logic locally
      const [patients, users, consultations, tasks] = await Promise.all([
        firebaseService.getPatients(user?.hospitalId, user?.role === 'HCW' ? user?.id : undefined),
        (user?.role === 'HCW' ? Promise.resolve({ data: [], total: 0, success: true }) : firebaseService.getUsers(user?.hospitalId)),
        firebaseService.getConsultations(undefined, user?.hospitalId, user?.role === 'HCW' ? user?.id : undefined),
        firebaseService.getTasks(user?.hospitalId, user?.role === 'HCW' ? user?.id : undefined),
      ]);

      // Apply the same filtering logic as PatientsPage
      let filteredPatients = patients.data;
      if (user?.role === 'HCW') {
        filteredPatients = patients.data; // already filtered server-side by assignedHCW
        console.log('🔴 HCW filtered patients:', filteredPatients.length, 'out of', patients.data.length);
      } else if (user?.role === 'ADMIN') {
        filteredPatients = patients.data.filter(p => p.hospitalId === user.hospitalId);
      }

      // Apply similar filtering for consultations and tasks
      let filteredConsultations = consultations.data;
      let filteredTasks = tasks.data;
      
      if (user?.role === 'HCW') {
        filteredConsultations = consultations.data.filter(c => c.hcwId === user.id);
        filteredTasks = tasks.data.filter(t => t.assignedTo === user.id);
        console.log('🔴 HCW filtered consultations:', filteredConsultations.length);
        console.log('🔴 HCW filtered tasks:', filteredTasks.length);
      }

      setStats({
        hospitals: user?.hospitalId ? 1 : 0,
        patients: filteredPatients.length,
        users: users.total,
        consultations: filteredConsultations.length,
        tasks: filteredTasks.length,
      });
      const fu = filteredTasks
        .filter(t => t.status !== 'completed')
        .filter(t => (t.title || '').toLowerCase().startsWith('follow-up:'))
        .map(t => ({ id: t.id, title: t.title, dueDate: t.dueDate || '', patientName: t.patientName }));
      setFollowups(fu.sort((a,b) => new Date(a.dueDate).getTime() - new Date(b.dueDate).getTime()).slice(0, 10));
      setLoading(false);
    } catch (error) {
      console.error('🔴 API fallback error:', error);
      setLoading(false);
    }
  };

  useEffect(() => {
    if (!user) {
      setLoading(false);
      return;
    }

    setLoading(true);
    const unsubscribes: (() => void)[] = [];

    if (user.role === 'SUPER_ADMIN') {
      // Super admin sees all data with real-time streams
      unsubscribes.push(
        firebaseService.streamHospitals((result) => {
          setStats(prev => ({ ...prev, hospitals: result.total }));
          setLoading(false);
        })
      );
      
      unsubscribes.push(
        firebaseService.streamPatients(undefined, (result) => {
          setStats(prev => ({ ...prev, patients: result.total }));
        })
      );
      
      unsubscribes.push(
        firebaseService.streamUsers(undefined, (result) => {
          setStats(prev => ({ ...prev, users: result.total }));
        })
      );
      
      unsubscribes.push(
        firebaseService.streamConsultations(undefined, undefined, (result) => {
          setStats(prev => ({ ...prev, consultations: result.total }));
        })
      );
      
      unsubscribes.push(
        firebaseService.streamTasks(undefined, undefined, undefined, (result) => {
          setStats(prev => ({ ...prev, tasks: result.total }));
        })
      );
    } else if (user.hospitalId) {
      // Hospital admin/HCW sees hospital-specific data - use API calls for better performance
      console.log('🔴 Loading HCW dashboard with API calls');
      loadDataWithAPI();
    } else {
      setStats({
        hospitals: 0,
        patients: 0,
        users: 0,
        consultations: 0,
        tasks: 0,
      });
      setLoading(false);
    }

    // Cleanup function
    return () => {
      unsubscribes.forEach(unsubscribe => unsubscribe());
    };
  }, [user]);

  if (loading) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-gray-50">
        <div className="text-center">
          <div className="animate-spin rounded-full h-16 w-16 border-b-2 border-primary-600 mx-auto"></div>
          <p className="mt-4 text-gray-600">Loading dashboard...</p>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-gradient-to-br from-gray-50 via-blue-50 to-indigo-50 relative overflow-hidden">
      {/* Animated background elements */}
      <div className="absolute inset-0 overflow-hidden pointer-events-none">
        <div className="absolute top-20 right-20 w-32 h-32 bg-gradient-to-r from-primary-200 to-primary-300 rounded-full mix-blend-multiply filter blur-xl opacity-60 animate-float"></div>
        <div className="absolute bottom-20 left-20 w-40 h-40 bg-gradient-to-r from-indigo-200 to-indigo-300 rounded-full mix-blend-multiply filter blur-xl opacity-60 animate-float" style={{animationDelay: '3s'}}></div>
        <div className="absolute top-1/2 left-1/2 transform -translate-x-1/2 -translate-y-1/2 w-24 h-24 bg-gradient-to-r from-blue-200 to-blue-300 rounded-full mix-blend-multiply filter blur-xl opacity-60 animate-float" style={{animationDelay: '6s'}}></div>
      </div>

      {/* Header */}
      <div className="relative z-10 bg-white/90 backdrop-blur-lg shadow-2xl border-b border-white/30">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="py-10">
            <div className="md:flex md:items-center md:justify-between">
              <div className="flex-1 min-w-0 animate-slide-up">
                <h1 className="text-4xl font-black leading-7 gradient-text sm:text-5xl sm:truncate">
                  Chronic Care Management
                </h1>
                <h2 className="text-2xl font-bold text-gray-700 mt-2">Dashboard</h2>
                <p className="mt-3 text-lg text-gray-600">
                  Welcome back, <span className="font-bold text-primary-700">{user?.fullName}</span>
                </p>
                <p className="mt-1 text-sm text-gray-500">
                  Monitor and manage your healthcare system efficiently
                </p>
              </div>
              <div className="mt-6 md:mt-0 animate-fade-in" style={{animationDelay: '0.3s'}}>
                <div className="flex items-center space-x-3 bg-green-50/80 backdrop-blur-sm rounded-2xl px-6 py-4 border border-green-200/50">
                  <div className="h-4 w-4 bg-green-400 rounded-full animate-pulse shadow-lg"></div>
                  <div>
                    <span className="text-sm font-bold text-green-800">System Online</span>
                    <p className="text-xs text-green-600">All services operational</p>
                  </div>
                </div>
              </div>
            </div>
          </div>
        </div>
      </div>

      {/* Main Content */}
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
        {/* Stats Grid */}
        <div className="relative z-10 grid grid-cols-1 gap-8 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-5 mb-12">
          <div className="group bg-white/90 backdrop-blur-lg rounded-3xl shadow-2xl border border-white/30 p-8 hover:shadow-3xl transition-all duration-500 transform hover:-translate-y-2 hover:scale-105 animate-scale-in">
            <div className="flex items-center">
              <div className="flex-shrink-0">
                <div className="p-5 rounded-3xl bg-gradient-to-br from-primary-500 via-primary-600 to-primary-700 shadow-2xl group-hover:shadow-primary-500/25 group-hover:shadow-2xl transition-all duration-300">
                  <BuildingOfficeIcon className="h-10 w-10 text-white" />
                </div>
              </div>
              <div className="ml-6 w-0 flex-1">
                <dl>
                  <dt className="text-sm font-bold text-gray-600 truncate uppercase tracking-wide">Hospitals</dt>
                  <dd className="text-4xl font-black text-gray-900 mt-1">{stats.hospitals}</dd>
                  <dd className="text-xs text-gray-500 mt-1">Active facilities</dd>
                </dl>
              </div>
            </div>
          </div>

          <div className="group bg-white/90 backdrop-blur-lg rounded-3xl shadow-2xl border border-white/30 p-8 hover:shadow-3xl transition-all duration-500 transform hover:-translate-y-2 hover:scale-105 animate-scale-in" style={{animationDelay: '0.1s'}}>
            <div className="flex items-center">
              <div className="flex-shrink-0">
                <div className="p-5 rounded-3xl bg-gradient-to-br from-green-500 via-green-600 to-green-700 shadow-2xl group-hover:shadow-green-500/25 group-hover:shadow-2xl transition-all duration-300">
                  <UserGroupIcon className="h-10 w-10 text-white" />
                </div>
              </div>
              <div className="ml-6 w-0 flex-1">
                <dl>
                  <dt className="text-sm font-bold text-gray-600 truncate uppercase tracking-wide">Patients</dt>
                  <dd className="text-4xl font-black text-gray-900 mt-1">{stats.patients}</dd>
                  <dd className="text-xs text-gray-500 mt-1">Under care</dd>
                </dl>
              </div>
            </div>
          </div>

          <div className="group bg-white/90 backdrop-blur-lg rounded-3xl shadow-2xl border border-white/30 p-8 hover:shadow-3xl transition-all duration-500 transform hover:-translate-y-2 hover:scale-105 animate-scale-in" style={{animationDelay: '0.2s'}}>
            <div className="flex items-center">
              <div className="flex-shrink-0">
                <div className="p-5 rounded-3xl bg-gradient-to-br from-yellow-500 via-yellow-600 to-yellow-700 shadow-2xl group-hover:shadow-yellow-500/25 group-hover:shadow-2xl transition-all duration-300">
                  <UsersIcon className="h-10 w-10 text-white" />
                </div>
              </div>
              <div className="ml-6 w-0 flex-1">
                <dl>
                  <dt className="text-sm font-bold text-gray-600 truncate uppercase tracking-wide">Healthcare Workers</dt>
                  <dd className="text-4xl font-black text-gray-900 mt-1">{stats.users}</dd>
                  <dd className="text-xs text-gray-500 mt-1">Active staff</dd>
                </dl>
              </div>
            </div>
          </div>

          <div className="group bg-white/90 backdrop-blur-lg rounded-3xl shadow-2xl border border-white/30 p-8 hover:shadow-3xl transition-all duration-500 transform hover:-translate-y-2 hover:scale-105 animate-scale-in" style={{animationDelay: '0.3s'}}>
            <div className="flex items-center">
              <div className="flex-shrink-0">
                <div className="p-5 rounded-3xl bg-gradient-to-br from-blue-500 via-blue-600 to-blue-700 shadow-2xl group-hover:shadow-blue-500/25 group-hover:shadow-2xl transition-all duration-300">
                  <ClipboardDocumentListIcon className="h-10 w-10 text-white" />
                </div>
              </div>
              <div className="ml-6 w-0 flex-1">
                <dl>
                  <dt className="text-sm font-bold text-gray-600 truncate uppercase tracking-wide">Consultations</dt>
                  <dd className="text-4xl font-black text-gray-900 mt-1">{stats.consultations}</dd>
                  <dd className="text-xs text-gray-500 mt-1">Completed sessions</dd>
                </dl>
              </div>
            </div>
          </div>

          <div className="group bg-white/90 backdrop-blur-lg rounded-3xl shadow-2xl border border-white/30 p-8 hover:shadow-3xl transition-all duration-500 transform hover:-translate-y-2 hover:scale-105 animate-scale-in" style={{animationDelay: '0.4s'}}>
            <div className="flex items-center">
              <div className="flex-shrink-0">
                <div className="p-5 rounded-3xl bg-gradient-to-br from-red-500 via-red-600 to-red-700 shadow-2xl group-hover:shadow-red-500/25 group-hover:shadow-2xl transition-all duration-300">
                  <CheckCircleIcon className="h-10 w-10 text-white" />
                </div>
              </div>
              <div className="ml-6 w-0 flex-1">
                <dl>
                  <dt className="text-sm font-bold text-gray-600 truncate uppercase tracking-wide">Care Tasks</dt>
                  <dd className="text-4xl font-black text-gray-900 mt-1">{stats.tasks}</dd>
                  <dd className="text-xs text-gray-500 mt-1">Pending items</dd>
                </dl>
              </div>
            </div>
          </div>
        </div>

        {/* Quick Actions */}
        <div className="bg-white/80 backdrop-blur-sm rounded-2xl shadow-lg border border-white/20 mb-8">
          <div className="px-8 py-6 border-b border-gray-200/50">
            <h3 className="text-xl font-bold text-gray-900">Quick Actions</h3>
            <p className="mt-1 text-sm text-gray-600">Common tasks to get you started</p>
          </div>
          <div className="p-8">
            <div className="grid grid-cols-1 gap-4 sm:grid-cols-2 lg:grid-cols-4">
              <button 
                onClick={() => navigate('/patients')}
                className="group relative overflow-hidden bg-gradient-to-r from-primary-600 to-primary-700 hover:from-primary-700 hover:to-primary-800 text-white font-semibold py-4 px-6 rounded-xl shadow-lg hover:shadow-xl transition-all duration-300 transform hover:-translate-y-1"
              >
                <div className="flex items-center justify-center">
                  <PlusIcon className="h-5 w-5 mr-2" />
                  Add Patient
                </div>
                <div className="absolute inset-0 bg-white/20 transform scale-x-0 group-hover:scale-x-100 transition-transform duration-300 origin-left"></div>
              </button>
              <button 
                onClick={() => navigate('/consultations')}
                className="group relative overflow-hidden bg-gradient-to-r from-green-600 to-green-700 hover:from-green-700 hover:to-green-800 text-white font-semibold py-4 px-6 rounded-xl shadow-lg hover:shadow-xl transition-all duration-300 transform hover:-translate-y-1"
              >
                <div className="flex items-center justify-center">
                  <CalendarIcon className="h-5 w-5 mr-2" />
                  Schedule Consultation
                </div>
                <div className="absolute inset-0 bg-white/20 transform scale-x-0 group-hover:scale-x-100 transition-transform duration-300 origin-left"></div>
              </button>
              <button 
                onClick={() => navigate('/tasks')}
                className="group relative overflow-hidden bg-gradient-to-r from-yellow-600 to-yellow-700 hover:from-yellow-700 hover:to-yellow-800 text-white font-semibold py-4 px-6 rounded-xl shadow-lg hover:shadow-xl transition-all duration-300 transform hover:-translate-y-1"
              >
                <div className="flex items-center justify-center">
                  <CheckCircleIcon className="h-5 w-5 mr-2" />
                  Create Task
                </div>
                <div className="absolute inset-0 bg-white/20 transform scale-x-0 group-hover:scale-x-100 transition-transform duration-300 origin-left"></div>
              </button>
              <button 
                onClick={() => navigate('/users')}
                className="group relative overflow-hidden bg-gradient-to-r from-gray-600 to-gray-700 hover:from-gray-700 hover:to-gray-800 text-white font-semibold py-4 px-6 rounded-xl shadow-lg hover:shadow-xl transition-all duration-300 transform hover:-translate-y-1"
              >
                <div className="flex items-center justify-center">
                  <UserPlusIcon className="h-5 w-5 mr-2" />
                  Add Healthcare Worker
                </div>
                <div className="absolute inset-0 bg-white/20 transform scale-x-0 group-hover:scale-x-100 transition-transform duration-300 origin-left"></div>
              </button>
            </div>
          </div>
        </div>

        {/* System Status */}
        <div className="bg-white/80 backdrop-blur-sm rounded-2xl shadow-lg border border-white/20">
          <div className="px-8 py-6 border-b border-gray-200/50">
            <h3 className="text-xl font-bold text-gray-900">System Status</h3>
            <p className="mt-1 text-sm text-gray-600">Current system health and performance</p>
          </div>
          <div className="p-8">
            <div className="flex items-center justify-between">
              <div className="flex items-center">
                <div className="flex-shrink-0">
                  <div className="h-4 w-4 bg-green-400 rounded-full animate-pulse shadow-lg"></div>
                </div>
                <div className="ml-4">
                  <p className="text-lg font-semibold text-gray-900">System Online</p>
                  <p className="text-sm text-gray-600">
                    CCMIS is ready for chronic care management. All systems operational.
                  </p>
                </div>
              </div>
              <div className="text-right">
                <div className="text-2xl font-bold text-green-600">100%</div>
                <div className="text-xs text-gray-500">Uptime</div>
              </div>
            </div>
          </div>
        </div>

        {/* Follow-ups (Next 10) */}
        <div className="mt-8 bg-white/80 backdrop-blur-sm rounded-2xl shadow-lg border border-white/20">
          <div className="px-8 py-6 border-b border-gray-200/50 flex items-center justify-between">
            <div>
              <h3 className="text-xl font-bold text-gray-900">Upcoming Follow-ups</h3>
              <p className="mt-1 text-sm text-gray-600">Next appointments from tasks</p>
            </div>
            <button onClick={() => navigate('/tasks')} className="text-primary-700 font-semibold hover:underline">View all</button>
          </div>
          <div className="p-6">
            {followups.length === 0 ? (
              <p className="text-sm text-gray-600">No upcoming follow-ups.</p>
            ) : (
              <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
                {followups.map(f => (
                  <div key={f.id} className="border border-gray-200 rounded-xl p-4">
                    <div className="text-sm text-gray-500">Due</div>
                    <div className="text-lg font-semibold">{f.dueDate ? new Date(f.dueDate).toLocaleDateString() : '-'}</div>
                    <div className="mt-1 font-medium">{f.patientName || f.title.replace(/^Follow-up:\\s*/i,'')}</div>
                    <div className="text-xs text-gray-500 truncate">{f.title}</div>
                  </div>
                ))}
              </div>
            )}
          </div>
        </div>

        {/* Follow-ups Calendar (7 / 30 days) */}
        <div className="mt-8 grid grid-cols-1 lg:grid-cols-2 gap-6">
          {[7, 30].map(windowDays => {
            const horizon = buildHorizon(windowDays);
            return (
              <div key={windowDays} className="bg-white/80 backdrop-blur-sm rounded-2xl shadow-lg border border-white/20">
                <div className="px-8 py-6 border-b border-gray-200/50 flex items-center justify-between">
                  <div>
                    <h3 className="text-xl font-bold text-gray-900">Follow-ups (Next {windowDays} days)</h3>
                    <p className="mt-1 text-sm text-gray-600">Count of pending follow-ups per day</p>
                  </div>
                </div>
                <div className="p-6">
                  <div className="grid grid-cols-7 gap-2">
                    {horizon.map((slot) => (
                      <button key={slot.date} className="text-center border border-gray-200 rounded-lg p-2 hover:bg-gray-50 focus:outline-none focus:ring-2 focus:ring-primary-500" onClick={() => navigate(`/tasks?due=${slot.date}`)}>
                        <div className="text-[10px] text-gray-500">{new Date(slot.date).toLocaleDateString(undefined,{ month:'short', day:'numeric'})}</div>
                        <div className={`mt-1 text-sm font-bold ${slot.count>0?'text-primary-700':'text-gray-400'}`}>{slot.count}</div>
                      </button>
                    ))}
                  </div>
                </div>
              </div>
            );
          })}
        </div>
      </div>
    </div>
  );
};

export default Dashboard;