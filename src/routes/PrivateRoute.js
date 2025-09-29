import React from 'react';
import { Navigate, useLocation } from 'react-router-dom';
import { useAuth } from '../contexts/AuthContext';

const PrivateRoute = ({ children, requiredRole }) => {
  const { user, loading, isGlobalAdmin, isAdmin } = useAuth();
  const location = useLocation();

  // Responsive pro-level loading UI
  if (loading) {
    return (
      <div className="flex items-center justify-center min-h-screen bg-gray-50">
        <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-blue-600"></div>
      </div>
    );
  }

  // If not authenticated, redirect to login with return state
  if (!user) {
    return <Navigate to="/login" replace state={{ from: location }} />;
  }

  // If role restriction is applied, enforce it
  if (requiredRole) {
    const hasAccess =
      (requiredRole === 'GlobalAdmin' && isGlobalAdmin) ||
      (requiredRole === 'Admin' && isAdmin) ||
      (Array.isArray(requiredRole) && requiredRole.includes(user.role));

    if (!hasAccess) {
      return (
        <div className="flex flex-col items-center justify-center min-h-screen bg-gray-50 text-center p-6">
          <h1 className="text-2xl font-semibold text-gray-800 mb-2">Access Denied</h1>
          <p className="text-gray-600 mb-4">You do not have permission to view this page.</p>
          <a href="/" className="px-4 py-2 bg-blue-600 text-white rounded-lg shadow hover:bg-blue-700 transition">
            Go Home
          </a>
        </div>
      );
    }
  }

  return children;
};

export default PrivateRoute;