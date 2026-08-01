import { useAuthStore } from '@core/stores/auth.store';

export function useIsFloristBusiness(): boolean {
  const tenant = useAuthStore((s) => s.tenant);
  const type = ((tenant as any)?.businessType ?? '').toUpperCase();
  const features = (tenant as any)?.businessFeatures ?? {};

  const isFloristType =
    type.includes('FLORIST') || type.includes('FLOWER') ||
    type.includes('BOUQUET') || type.includes('WEDDING_DECOR');

  const hasFeature =
    features.floristMode === true ||
    features.weddingContracts === true ||
    features.floralSubscriptions === true;

  return isFloristType || hasFeature;
}
