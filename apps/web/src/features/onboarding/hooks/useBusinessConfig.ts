import { useQuery } from '@tanstack/react-query';
import { onboardingApi } from '../api/onboarding.api';

export function useBusinessConfig() {
  return useQuery({
    queryKey: ['business-config'],
    queryFn: onboardingApi.getBusinessConfig,
    staleTime: 5 * 60 * 1000,
  });
}
