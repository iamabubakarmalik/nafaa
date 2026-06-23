import { Navigate, Outlet, useLocation } from 'react-router-dom';
import { useQuery } from '@tanstack/react-query';
import { Sparkles } from 'lucide-react';
import { onboardingApi } from '@/api/onboarding.api';
import { useAuthStore } from '@/store/auth.store';

/**
 * OnboardingGate — BLOCKS render until onboarding state is known.
 *
 * Flow:
 *  - While loading → show spinner (don't render Outlet)
 *  - If incomplete + not on /onboarding → Navigate (synchronous, blocks render)
 *  - If complete → render Outlet
 *
 * Key fix: NO useEffect — useEffect runs AFTER render, causing flicker.
 * We use synchronous <Navigate> which is React-Router idiomatic.
 */
export default function OnboardingGate() {
  const location = useLocation();
  const { isAuthenticated, user } = useAuthStore();

  // Skip gate if not authenticated or already on onboarding page
  const isOnboardingRoute = location.pathname === '/onboarding';
  const isVerifyRoute = location.pathname === '/verify-email';

  const { data: progress, isLoading, isError } = useQuery({
    queryKey: ['onboarding'],
    queryFn: onboardingApi.get,
    enabled: isAuthenticated && !isOnboardingRoute && !isVerifyRoute,
    retry: 1,
    staleTime: 30_000, // Cache for 30s — but always fresh on session change
    refetchOnWindowFocus: false,
    refetchOnMount: 'always', // Re-check on every mount
  });

  // Skip gate for these routes
  if (isOnboardingRoute || isVerifyRoute) {
    return <Outlet />;
  }

  // Not authenticated — let ProtectedRoute handle it
  if (!isAuthenticated || !user) {
    return <Outlet />;
  }

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

  // Error state — let user proceed (don't block)
  if (isError || !progress) {
    return <Outlet />;
  }

  // CRITICAL: Synchronously redirect during render (no flash of dashboard)
  if (!progress.isCompleted) {
    return <Navigate to="/onboarding" replace />;
  }

  // Onboarding complete → render protected app
  return <Outlet />;
}
