import { Navigate, Outlet, useLocation } from 'react-router-dom';
import { useCustomerAuthStore } from '@stores/customerAuth.store';

export function CustomerProtectedRoute() {
  const isAuth = useCustomerAuthStore((s) => s.isAuthenticated);
  const location = useLocation();
  if (!isAuth) return <Navigate to="/login" state={{ from: location }} replace />;
  return <Outlet />;
}
