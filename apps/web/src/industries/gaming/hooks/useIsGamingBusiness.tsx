import { useAuthStore } from '@core/stores/auth.store';

export function useIsGamingBusiness(): boolean {
  const tenant = useAuthStore((s) => s.tenant);
  const type = ((tenant as any)?.businessType ?? '').toUpperCase();
  const features = (tenant as any)?.businessFeatures ?? {};

  const isGamingType =
    type.includes('GAMING') || type.includes('GAME') ||
    type.includes('CYBER') || type.includes('ESPORT');

  const hasFeature =
    features.gamingMode === true ||
    features.gamingCafe === true ||
    features.gamingRentals === true;

  return isGamingType || hasFeature;
}
