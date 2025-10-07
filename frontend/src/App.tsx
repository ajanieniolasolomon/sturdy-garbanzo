import React, { useEffect } from 'react';
import { BrowserRouter as Router, Routes, Route, Navigate } from 'react-router-dom';
import { Provider } from 'react-redux';
import { store } from './store';
import { useAppDispatch, useAppSelector } from './hooks/redux';
import { setUser } from './store/slices/authSlice';
import firebaseService from './services/firebaseService';
import type { User } from './types';

// Components
import LoginPage from './pages/LoginPage';
import SetupPage from './pages/SetupPage';
import Dashboard from './pages/Dashboard';
import HospitalsPage from './pages/HospitalsPage';
import PatientsPage from './pages/PatientsPage';
import PatientDetailPage from './pages/PatientDetailPage.tsx';
import UsersPage from './pages/UsersPage';
import ConsultationsPage from './pages/ConsultationsPage';
import TasksPage from './pages/TasksPage';
import Layout from './components/Layout';
import NotificationContainer from './components/NotificationContainer';
import RoleProtectedRoute from './components/RoleProtectedRoute';

// Auth initialization component
const AuthInitializer: React.FC<{ children: React.ReactNode }> = ({ children }) => {
  const dispatch = useAppDispatch();
  const { isLoading } = useAppSelector(state => state.auth);

  useEffect(() => {
    const unsubscribe = firebaseService.onAuthStateChanged((user: User | null) => {
      dispatch(setUser(user));
    });

    return () => unsubscribe();
  }, [dispatch]);

  if (isLoading) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-gray-50">
        <div className="text-center">
          <div className="animate-spin rounded-full h-16 w-16 border-b-2 border-blue-600 mx-auto"></div>
          <p className="mt-4 text-gray-600">Loading...</p>
        </div>
      </div>
    );
  }

  return <>{children}</>;
};


// Main App component
const AppContent: React.FC = () => {
  const { isAuthenticated } = useAppSelector(state => state.auth);

  return (
    <Router>
      <NotificationContainer />
      <Routes>
        <Route path="/setup" element={<SetupPage />} />
        <Route 
          path="/login" 
          element={
            isAuthenticated ? <Navigate to="/" replace /> : <LoginPage />
          } 
        />
        {isAuthenticated ? (
          <Route
            path="/*"
            element={
              <Layout>
                <Routes>
                  <Route path="/" element={<Dashboard />} />
                  <Route 
                    path="/hospitals" 
                    element={
                      <RoleProtectedRoute allowedRoles={['SUPER_ADMIN', 'ADMIN']}>
                        <HospitalsPage />
                      </RoleProtectedRoute>
                    } 
                  />
                  <Route path="/patients" element={<PatientsPage />} />
                  <Route path="/patients/:id" element={<PatientDetailPage />} />
                  <Route 
                    path="/users" 
                    element={
                      <RoleProtectedRoute allowedRoles={['SUPER_ADMIN', 'ADMIN']}>
                        <UsersPage />
                      </RoleProtectedRoute>
                    } 
                  />
                  <Route path="/consultations" element={<ConsultationsPage />} />
                  <Route path="/tasks" element={<TasksPage />} />
                  <Route path="*" element={<Navigate to="/" replace />} />
                </Routes>
              </Layout>
            }
          />
        ) : (
          <Route path="*" element={<Navigate to="/login" replace />} />
        )}
      </Routes>
    </Router>
  );
};

const App: React.FC = () => {
  return (
    <Provider store={store}>
      <AuthInitializer>
        <AppContent />
      </AuthInitializer>
    </Provider>
  );
};

export default App;