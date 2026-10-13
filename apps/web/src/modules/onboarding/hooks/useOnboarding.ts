import { useQuery } from '@tanstack/react-query';
import { onboardingApi } from '../api/onboarding.api';

export function useOnboardingOptions() {
  return useQuery({
    queryKey: ['onboarding-options'],
    queryFn: onboardingApi.getOptions,
    staleTime: 10 * 60 * 1000,
    retry: 1,
  });
}

export function useOnboardingProgress() {
  return useQuery({
    queryKey: ['onboarding'],
    queryFn: onboardingApi.get,
    refetchOnWindowFocus: false,
    retry: 1,
  });
}
