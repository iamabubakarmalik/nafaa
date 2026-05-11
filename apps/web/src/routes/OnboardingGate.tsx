import { useEffect } from 'react';
import { Navigate, Outlet, useLocation, useNavigate } from 'react-router-dom';
import { useQuery } from '@tanstack/react-query';
import { onboardingApi } from '@/api/onboarding.api';
import { useAuthStore } from '@/store/auth.store';

export default function OnboardingGate() {
  const navigate = useNavigate();
  const location = useLocation();
  const { isAuthenticated } = useAuthStore();

  const { data: progress, isLoading } = useQuery({
    queryKey: ['onboarding'],
    queryFn: onboardingApi.get,
    enabled: isAuthenticated,
    retry: false,
  });

  useEffect(() => {
    if (!isLoading && progress && !progress.isCompleted && location.pathname !== '/onboarding') {
      navigate('/onboarding', { replace: true });
    }
  }, [progress, isLoading, location.pathname, navigate]);

  return <Outlet />;
}
