import { useAuthStore } from '@/store/auth.store';

export function useIsGymBusiness(): boolean {
  const tenant = useAuthStore((s) => s.tenant);
  const type = ((tenant as any)?.businessType ?? '').toUpperCase();
  const features = (tenant as any)?.businessFeatures ?? {};

  const isGymType =
    type.includes('GYM') ||
    type.includes('FITNESS') ||
    type.includes('HEALTH_CLUB') ||
    type.includes('CROSSFIT') ||
    type.includes('YOGA') ||
    type.includes('MARTIAL_ARTS');

  const hasGymFeature =
    features.gymMode === true ||
    features.memberships === true ||
    features.attendance === true;

  return isGymType || hasGymFeature;
}
