import { useEffect, useRef } from 'react';
import { Navigate, Outlet } from 'react-router-dom';
import { useAuthStore } from '@/store/auth.store';
import { authApi } from '@/api/auth.api';

export const ProtectedRoute = () => {
  const isAuthenticated = useAuthStore((s) => s.isAuthenticated);
  const setUser = useAuthStore((s) => s.setUser);
  const logout = useAuthStore((s) => s.logout);
  const hydratedRef = useRef(false);

  useEffect(() => {
    if (!isAuthenticated || hydratedRef.current) return;
    hydratedRef.current = true;

    authApi
      .me()
      .then(({ user, tenant }) => {
        setUser(user, tenant);
      })
      .catch(async () => {
        await logout();
      });
  }, [isAuthenticated, setUser, logout]);

  if (!isAuthenticated) return <Navigate to="/login" replace />;
  return <Outlet />;
};

export const PublicOnlyRoute = () => {
  const isAuthenticated = useAuthStore((s) => s.isAuthenticated);
  if (isAuthenticated) return <Navigate to="/dashboard" replace />;
  return <Outlet />;
};
