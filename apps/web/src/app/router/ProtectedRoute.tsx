import { useEffect, useRef } from 'react';
import { Navigate, Outlet } from 'react-router-dom';
import { useAuthStore } from '@core/stores/auth.store';
import { authApi } from '@modules/auth/api/auth.api';

/* ════════════════════════════════════════════════════════════
   PROTECTED ROUTE — OFFLINE-FIRST
   ────────────────────────────────────────────────────────────
   • Offline ho to persisted session pe bharosa — koi /me call nahi
   • Network error (server down / flaky) → logout NAHI
   • Sirf ASLI 401 (invalid/expired session) → logout
   ════════════════════════════════════════════════════════════ */
export const ProtectedRoute = () => {
  const isAuthenticated = useAuthStore((s) => s.isAuthenticated);
  const setUser = useAuthStore((s) => s.setUser);
  const logout = useAuthStore((s) => s.logout);
  const hydratedRef = useRef(false);

  useEffect(() => {
    if (!isAuthenticated || hydratedRef.current) return;
    hydratedRef.current = true;

    // Offline — cached session se chalao, server verify baad me
    if (!navigator.onLine) {
      console.log('[auth] Offline — using cached session');
      return;
    }

    authApi
      .me()
      .then(({ user, tenant }) => {
        setUser(user, tenant);
      })
      .catch(async (err: any) => {
        const status = err?.response?.status;

        // Network error / server down / 5xx — session rakho, logout nahi
        if (!status || status === 0 || status >= 500 || status === 408) {
          console.warn('[auth] /me failed (network/server) — keeping session. Status:', status);
          return;
        }

        // Sirf asli auth failure pe logout
        if (status === 401 || status === 403) {
          console.warn('[auth] Session invalid (401/403) — logout');
          await logout();
        }
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
