import { Navigate, Outlet, useLocation } from 'react-router-dom';
import { useQuery } from '@tanstack/react-query';
import { Sparkles } from 'lucide-react';
import { onboardingApi } from '@modules/onboarding/api/onboarding.api';
import { useAuthStore } from '@core/stores/auth.store';

/**
 * OnboardingGate — BLOCKS render until onboarding state is known.
 *
 * Flow:
 *  - Not authenticated → let ProtectedRoute handle
 *  - On /onboarding: if already completed → redirect to /dashboard (prevents loop)
 *  - On /verify-email: always allow
 *  - While loading → show spinner (don't render Outlet)
 *  - If incomplete + not on /onboarding → <Navigate> (synchronous, blocks render)
 *  - If complete → render Outlet
 *
 * Key fix: NO useEffect — useEffect runs AFTER render, causing flicker.
 * We use synchronous <Navigate> which is React-Router idiomatic.
 */
export default function OnboardingGate() {
  const location = useLocation();
  const { isAuthenticated, user } = useAuthStore();

  const isOnboardingRoute = location.pathname === '/onboarding';
  const isVerifyRoute = location.pathname === '/verify-email';

  // Always allow verify-email route (needed before login checks)
  if (isVerifyRoute) {
    return <Outlet />;
  }

  // Not authenticated — let ProtectedRoute handle it
  if (!isAuthenticated || !user) {
    return <Outlet />;
  }

  // Fetch onboarding — enabled on ALL protected routes (including /onboarding)
  // so we can decide whether to redirect completed users away from /onboarding.
  const { data: progress, isLoading, isError } = useQuery({
    queryKey: ['onboarding'],
    queryFn: onboardingApi.get,
    enabled: isAuthenticated,
    retry: 1,
    staleTime: 30_000,
    refetchOnWindowFocus: false,
    refetchOnMount: 'always',
  });

  // Loading state — BLOCK rendering, show spinner
  if (isLoading) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-gradient-to-br from-slate-50 to-violet-50">
        <div className="text-center">
          <Sparkles className="h-12 w-12 text-violet-600 animate-pulse mx-auto" />
          <p className="mt-3 text-sm font-bold text-slate-600">Setting up your shop...</p>
        </div>
      </div>
    );
  }

  // Error state — let user proceed (don't lock them out of the app)
  if (isError || !progress) {
    return <Outlet />;
  }

  // ═══ CASE 1: User is on /onboarding ═══
  if (isOnboardingRoute) {
    // Already completed → send them to dashboard (prevents loop for existing users)
    if (progress.isCompleted) {
      return <Navigate to="/dashboard" replace />;
    }
    // Still onboarding — let OnboardingPage render
    return <Outlet />;
  }

  // ═══ CASE 2: User is on any other protected route ═══
  // Not completed → force onboarding
  if (!progress.isCompleted) {
    return <Navigate to="/onboarding" replace />;
  }

  // Completed → render protected app
  return <Outlet />;
}
