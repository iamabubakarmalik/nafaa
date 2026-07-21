import { ReactNode, useEffect } from 'react';
import { useNavigate, useLocation } from 'react-router-dom';
import { useOnboardingProgress } from '../hooks/useOnboarding';

/**
 * Wraps the entire authenticated app. If onboarding is not complete,
 * force redirect to /onboarding. Also handles the reverse: if already
 * completed and user visits /onboarding, redirect to dashboard.
 */
export function OnboardingGuard({ children }: { children: ReactNode }) {
  const navigate = useNavigate();
  const location = useLocation();
  const { data: progress, isLoading } = useOnboardingProgress();

  const isOnboardingRoute = location.pathname.startsWith('/onboarding');

  useEffect(() => {
    if (isLoading || !progress) return;

    if (!progress.isCompleted && !isOnboardingRoute) {
      navigate('/onboarding', { replace: true });
    } else if (progress.isCompleted && isOnboardingRoute) {
      navigate('/dashboard', { replace: true });
    }
  }, [progress, isLoading, isOnboardingRoute, navigate]);

  if (isLoading) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-gradient-to-br from-slate-50 to-violet-50">
        <div className="text-center">
          <div className="h-14 w-14 rounded-full border-4 border-violet-200 border-t-violet-600 animate-spin mx-auto" />
          <p className="mt-4 text-sm font-bold text-slate-600">Loading your workspace...</p>
        </div>
      </div>
    );
  }

  return <>{children}</>;
}
