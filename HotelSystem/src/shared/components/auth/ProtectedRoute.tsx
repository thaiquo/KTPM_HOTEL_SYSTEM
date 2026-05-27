import React from 'react';
import { Navigate, Outlet, useLocation } from 'react-router-dom';
import { useAuth } from '../../../contexts/AuthContext';
import { getManagementHomeByRole, normalizeRole } from '../../lib/roleRoute';

interface ProtectedRouteProps {
  allowedRoles?: string[];
}

/**
 * ProtectedRoute:
 * - loading=false guaranteed by AuthLoader in App.tsx before this renders
 * - If not authenticated → redirect to /login with current path as redirect param
 * - If authenticated but wrong role → redirect to their own dashboard
 */
const ProtectedRoute: React.FC<ProtectedRouteProps> = ({ allowedRoles }) => {
  const { user, loading, isAuthenticated } = useAuth();
  const location = useLocation();

  // AuthLoader at App level should prevent loading=true from reaching here,
  // but guard defensively just in case.
  if (loading) return null;

  if (!isAuthenticated) {
    const redirectTo = `${location.pathname}${location.search}`;
    return <Navigate to={`/login?redirect=${encodeURIComponent(redirectTo)}`} replace />;
  }

  if (allowedRoles && user) {
    const normalizedRole = normalizeRole(user.role);
    if (!allowedRoles.includes(normalizedRole)) {
      // Redirect to the correct home for their role instead of always '/'
      const correctHome = getManagementHomeByRole(user.role);
      return <Navigate to={correctHome} replace />;
    }
  }

  return <Outlet />;
};

export default ProtectedRoute;
