import { useEffect } from 'react';
import { Navigate, Outlet } from 'react-router-dom';
import { useQuery } from '@tanstack/react-query';
import { useAuthStore } from '@/store/auth.store';
import { adminAuthApi } from '@/api/admin-auth.api';

/** Signed-in pages. Refreshes the admin's profile and permissions once per load. */
export const ProtectedRoute = () => {
  const isAuthenticated = useAuthStore((s) => s.isAuthenticated);
  const setUser = useAuthStore((s) => s.setUser);
  const me = useQuery({ queryKey: ['admin', 'me'], queryFn: adminAuthApi.me, enabled: isAuthenticated, staleTime: 5 * 60_000 });
  useEffect(() => { if (me.data) setUser(me.data); }, [me.data, setUser]);
  if (!isAuthenticated) return <Navigate to="/login" replace />;
  return <Outlet />;
};

export const PublicOnlyRoute = () => {
  const isAuthenticated = useAuthStore((s) => s.isAuthenticated);
  if (isAuthenticated) return <Navigate to="/dashboard" replace />;
  return <Outlet />;
};
