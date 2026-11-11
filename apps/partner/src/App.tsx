/**
 * Partner portal routes.
 *  - Signed out: /login and /apply.
 *  - Signed in but not active (under review, suspended, rejected): the status
 *    screen and the profile only.
 *  - Active: the full app inside AppShell. The statement page has no shell so
 *    it prints cleanly.
 */

import { Suspense, lazy, useEffect } from 'react';
import { BrowserRouter, Navigate, Outlet, Route, Routes } from 'react-router-dom';
import { MutationCache, QueryCache, QueryClient, QueryClientProvider } from '@tanstack/react-query';
import { Toaster } from 'sonner';
import { isNetworkError, statusOf } from '@/api/client';
import { usePartnerTheme } from '@/design/theme';
import { useAuthStore } from '@/store/auth.store';
import { startOutbox } from '@/offline/outbox';
import { useMe } from '@/modules/auth/useMe';
import { PageSkeleton } from '@/ui/QueryState';
import AppShell from '@/shell/AppShell';
import LoginPage from '@/modules/auth/LoginPage';
import ApplyPage from '@/modules/auth/ApplyPage';
import PendingLayout from '@/modules/auth/PendingLayout';
import StatusPage from '@/modules/auth/StatusPage';

const DashboardPage = lazy(() => import('@/modules/dashboard/DashboardPage'));
const NewVisitPage = lazy(() => import('@/modules/visit/NewVisitPage'));
const LeadsPage = lazy(() => import('@/modules/leads/LeadsPage'));
const LeadDetailPage = lazy(() => import('@/modules/leads/LeadDetailPage'));
const SharePage = lazy(() => import('@/modules/share/SharePage'));
const EarningsPage = lazy(() => import('@/modules/earnings/EarningsPage'));
const StatementPage = lazy(() => import('@/modules/earnings/StatementPage'));
const KitPage = lazy(() => import('@/modules/kit/KitPage'));
const TeamPage = lazy(() => import('@/modules/team/TeamPage'));
const ProfilePage = lazy(() => import('@/modules/profile/ProfilePage'));

/** A 403 means the account is no longer active: re-read the profile so the status screen shows. */
const onError = (e: unknown) => { if (statusOf(e) === 403) void queryClient.invalidateQueries({ queryKey: ['me'] }); };

const queryClient = new QueryClient({
  queryCache: new QueryCache({ onError }),
  mutationCache: new MutationCache({ onError }),
  defaultOptions: {
    queries: {
      staleTime: 30_000,
      refetchOnWindowFocus: true,
      retry: (count, e) => (isNetworkError(e) || (statusOf(e) ?? 0) >= 500 ? count < 2 : false),
    },
  },
});

function PublicOnly() {
  const token = useAuthStore((s) => s.accessToken);
  return token ? <Navigate to="/" replace /> : <Outlet />;
}

/** Signed-in gate: picks the active app or the status screen from the partner's status. */
function SignedIn() {
  const token = useAuthStore((s) => s.accessToken);
  const me = useAuthStore((s) => s.me);
  const q = useMe();
  if (!token) return <Navigate to="/login" replace />;
  if (!me) return q.isError ? <Navigate to="/login" replace /> : <div className="p-4"><PageSkeleton /></div>;
  return me.status === 'ACTIVE' ? <ActiveRoutes manager={me.isManager} /> : <PendingRoutes />;
}

function PendingRoutes() {
  return (
    <Routes>
      <Route element={<PendingLayout />}>
        <Route index element={<StatusPage />} />
        <Route path="profile" element={<ProfilePage />} />
        <Route path="*" element={<Navigate to="/" replace />} />
      </Route>
    </Routes>
  );
}

function ActiveRoutes({ manager }: { manager: boolean }) {
  return (
    <Routes>
      <Route path="statement/:month" element={<Suspense fallback={<PageSkeleton />}><StatementPage /></Suspense>} />
      <Route element={<AppShell />}>
        <Route index element={<DashboardPage />} />
        <Route path="visit/new" element={<NewVisitPage />} />
        <Route path="leads" element={<LeadsPage />} />
        <Route path="leads/:id" element={<LeadDetailPage />} />
        <Route path="share" element={<SharePage />} />
        <Route path="earnings" element={<EarningsPage />} />
        <Route path="kit" element={<KitPage />} />
        {manager && <Route path="team" element={<TeamPage />} />}
        <Route path="profile" element={<ProfilePage />} />
        <Route path="*" element={<Navigate to="/" replace />} />
      </Route>
    </Routes>
  );
}

export default function App() {
  usePartnerTheme();
  useEffect(() => { startOutbox(); }, []);
  return (
    <QueryClientProvider client={queryClient}>
      <BrowserRouter>
        <Routes>
          <Route element={<PublicOnly />}>
            <Route path="/login" element={<LoginPage />} />
            <Route path="/apply" element={<ApplyPage />} />
          </Route>
          <Route path="/*" element={<SignedIn />} />
        </Routes>
      </BrowserRouter>
      <Toaster position="top-center" richColors closeButton />
    </QueryClientProvider>
  );
}
