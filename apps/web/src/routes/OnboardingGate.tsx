import { useEffect } from 'react';
import { Navigate, Outlet, useLocation, useNavigate } from 'react-router-dom';
import { useQuery } from '@tanstack/react-query';
import { Sparkles } from 'lucide-react';
import { onboardingApi } from '@/api/onboarding.api';
import { useAuthStore } from '@/store/auth.store';

/**
 * OnboardingGate — sits between ProtectedRoute and AppShell.
 *
 * Behavior:
 * - If onboarding incomplete → force redirect to /onboarding
 * - If already on /onboarding → let it render (no infinite loop)
 * - Shows loading state while checking progress
 * - Critical: must check BEFORE rendering protected layout
 */
export default function OnboardingGate() {
  const navigate = useNavigate();
  const location = useLocation();
  const { isAuthenticated } = useAuthStore();

  const { data: progress, isLoading, isError } = useQuery({
    queryKey: ['onboarding'],
    queryFn: onboardingApi.get,
    enabled: isAuthenticated,
    retry: 1,
    staleTime: 0, // Always fresh — we need accurate state
    refetchOnWindowFocus: false,
  });

  const isOnboardingRoute = location.pathname === '/onboarding';

  useEffect(() => {
    if (isLoading || isError) return;
    if (!progress) return;

    // Incomplete onboarding + not on onboarding page → redirect
    if (!progress.isCompleted && !isOnboardingRoute) {
      navigate('/onboarding', { replace: true });
    }
  }, [progress, isLoading, isError, isOnboardingRoute, navigate]);

  // Loading state — show spinner while checking
  if (isLoading) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-gradient-to-br from-slate-50 to-violet-50">
        <div className="text-center">
          <Sparkles className="h-12 w-12 text-violet-600 animate-pulse mx-auto" />
          <p className="mt-3 text-sm font-bold text-slate-600">Loading...</p>
        </div>
      </div>
    );
  }

  // Block render if onboarding incomplete and not on onboarding page
  if (progress && !progress.isCompleted && !isOnboardingRoute) {
    return <Navigate to="/onboarding" replace />;
  }

  return <Outlet />;
}
