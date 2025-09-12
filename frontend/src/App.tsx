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
import UsersPage from './pages/UsersPage';
import ConsultationsPage from './pages/ConsultationsPage';
import TasksPage from './pages/TasksPage';
import Layout from './components/Layout';
import NotificationContainer from './components/NotificationContainer';
import RoleProtectedRoute from './components/RoleProtectedRoute';

// Auth wrapper component
const AuthWrapper: React.FC<{ children: React.ReactNode }> = ({ children }) => {
  const dispatch = useAppDispatch();
  const { isAuthenticated, isLoading } = useAppSelector(state => state.auth);

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

  if (!isAuthenticated) {
    return <LoginPage />;
  }

  return <>{children}</>;
};

// Protected route component
const ProtectedRoute: React.FC<{ children: React.ReactNode }> = ({ children }) => {
  const { isAuthenticated } = useAppSelector(state => state.auth);
  
  if (!isAuthenticated) {
    return <Navigate to="/login" replace />;
  }
  
  return <>{children}</>;
};

// Main App component
const AppContent: React.FC = () => {
  return (
    <Router>
      <NotificationContainer />
      <Routes>
        <Route path="/setup" element={<SetupPage />} />
        <Route path="/login" element={<LoginPage />} />
        <Route
          path="/*"
          element={
            <ProtectedRoute>
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
            </ProtectedRoute>
          }
        />
      </Routes>
    </Router>
  );
};

const App: React.FC = () => {
  return (
    <Provider store={store}>
      <AuthWrapper>
        <AppContent />
      </AuthWrapper>
    </Provider>
  );
};

export default App;