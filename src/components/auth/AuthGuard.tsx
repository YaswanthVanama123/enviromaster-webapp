import React from 'react';
import { Navigate, Outlet, useLocation } from 'react-router-dom';
import { useAuthContext } from './AuthProvider';
import { Spinner } from '../atoms/Spinner';

interface AuthGuardProps {
  requireAdmin?: boolean;
  children?: React.ReactNode;
}

export function AuthGuard({ requireAdmin = false, children }: AuthGuardProps) {
  const { isAuthenticated, isAdmin, loading } = useAuthContext();
  const location = useLocation();

  if (loading) {
    return (
      <div className="em-auth-loading">
        <Spinner size="lg" />
        <p className="em-auth-loading__text">Loading...</p>
      </div>
    );
  }

  if (!isAuthenticated) {
    return (
      <Navigate
        to="/"
        state={{ from: location, message: 'Please log in to continue', reason: 'unauthorized' }}
        replace
      />
    );
  }

  if (requireAdmin && !isAdmin) {
    return (
      <Navigate
        to="/"
        state={{ message: 'Admin access required' }}
        replace
      />
    );
  }

  return children ? <>{children}</> : <Outlet />;
}

export default AuthGuard;
