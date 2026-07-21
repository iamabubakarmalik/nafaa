import { useEffect, useRef } from 'react';
import { onboardingApi } from '../api/onboarding.api';

/**
 * Track time user spends on onboarding, save every 30 seconds
 */
export function useOnboardingTimer(enabled: boolean) {
  const startRef = useRef(Date.now());
  const savedRef = useRef(0);

  useEffect(() => {
    if (!enabled) return;

    startRef.current = Date.now();
    const interval = setInterval(() => {
      const elapsed = Math.floor((Date.now() - startRef.current) / 1000);
      const delta = elapsed - savedRef.current;
      if (delta >= 30) {
        onboardingApi.recordTime(delta).catch(() => {});
        savedRef.current = elapsed;
      }
    }, 30_000);

    return () => {
      clearInterval(interval);
      // Save final time on unmount
      const elapsed = Math.floor((Date.now() - startRef.current) / 1000);
      const delta = elapsed - savedRef.current;
      if (delta > 0) onboardingApi.recordTime(delta).catch(() => {});
    };
  }, [enabled]);
}
