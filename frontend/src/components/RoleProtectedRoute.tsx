import React from 'react';
import { Navigate } from 'react-router-dom';
import { useAppSelector } from '../hooks/redux';

interface RoleProtectedRouteProps {
  children: React.ReactNode;
  allowedRoles: ('SUPER_ADMIN' | 'ADMIN' | 'HCW')[];
  fallbackPath?: string;
}

const RoleProtectedRoute: React.FC<RoleProtectedRouteProps> = ({
  children,
  allowedRoles,
  fallbackPath = '/'
}) => {
  const { user } = useAppSelector(state => state.auth);

  // If user is not authenticated, redirect to login
  if (!user) {
    return <Navigate to="/login" replace />;
  }

  // If user role is not in allowed roles, redirect to fallback
  if (!allowedRoles.includes(user.role)) {
    return <Navigate to={fallbackPath} replace />;
  }

  return <>{children}</>;
};

export default RoleProtectedRoute;
