import { Outlet, Navigate } from 'react-router-dom';
import { Plane } from 'lucide-react';
import { useAuth } from '../../context/AuthContext';
import { LoadingPage } from '..';

export function AuthLayout() {
  const { isAuthenticated, isLoading } = useAuth();

  if (isLoading) {
    return <LoadingPage />;
  }

  if (isAuthenticated) {
    return <Navigate to="/dashboard" replace />;
  }

  return (
    <div className="auth-layout">
      <div className="auth-container">
        <div className="auth-header">
          <div className="auth-logo">
            <Plane size={32} />
          </div>
          <h1 className="auth-title">Avio Letovi</h1>
          <p className="auth-subtitle">
            Platforma za upravljanje avio letovima
          </p>
        </div>
        <Outlet />
      </div>
    </div>
  );
}
