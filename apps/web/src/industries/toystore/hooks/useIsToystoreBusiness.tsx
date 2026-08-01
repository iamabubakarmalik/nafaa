import { useAuthStore } from '@core/stores/auth.store';

export function useIsToystoreBusiness(): boolean {
  const tenant = useAuthStore((s) => s.tenant);
  const type = ((tenant as any)?.businessType ?? '').toUpperCase();
  const features = (tenant as any)?.businessFeatures ?? {};

  const isToyType =
    type.includes('TOY') || type.includes('KIDS') || type.includes('CHILDREN');

  const hasFeature =
    features.toystoreMode === true ||
    features.birthdayReminders === true;

  return isToyType || hasFeature;
}
