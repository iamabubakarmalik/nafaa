import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import { onboardingApi, type OnboardingProgress } from '../api/onboarding.api';
import { toast } from 'sonner';

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

export function useStepMutation(step: number) {
  const queryClient = useQueryClient();

  const stepMap: Record<number, (body: any) => Promise<OnboardingProgress>> = {
    1: onboardingApi.step1,
    2: onboardingApi.step2,
    3: onboardingApi.step3,
    4: onboardingApi.step4,
    5: onboardingApi.step5,
    6: onboardingApi.step6,
    7: onboardingApi.step7,
    8: onboardingApi.step8,
  };

  return useMutation<OnboardingProgress, any, any>({
    mutationFn: (body: any) => {
      const fn = stepMap[step];
      if (!fn) return Promise.reject(new Error(`Invalid step ${step}`));
      return fn(body);
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['onboarding'] });
      queryClient.invalidateQueries({ queryKey: ['business-config'] });
    },
    onError: (e: any) => {
      const msg = e?.response?.data?.message;
      const flat = Array.isArray(msg) ? msg[0] : msg;
      // Don't show toast for "already completed" — page handles redirect
      if (typeof flat === 'string' && flat.toLowerCase().includes('already completed')) {
        return;
      }
      toast.error(flat || 'Save fail ho gaya');
    },
  });
}

export function useSkipStep() {
  const queryClient = useQueryClient();
  return useMutation<OnboardingProgress, any, number>({
    mutationFn: (step: number) => onboardingApi.skip(step),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['onboarding'] });
      toast.info('Step skipped');
    },
    onError: (e: any) => {
      const msg = e?.response?.data?.message;
      const flat = Array.isArray(msg) ? msg[0] : msg;
      if (typeof flat === 'string' && flat.toLowerCase().includes('already completed')) return;
      toast.error(flat || 'Skip fail ho gaya');
    },
  });
}

export function useCompleteOnboarding() {
  const queryClient = useQueryClient();
  return useMutation<OnboardingProgress>({
    mutationFn: onboardingApi.complete,
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['onboarding'] });
    },
  });
}
