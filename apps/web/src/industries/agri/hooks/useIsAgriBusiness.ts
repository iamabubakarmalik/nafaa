import { useAuthStore } from '@core/stores/auth.store';

export function useIsAgriBusiness(): boolean {
  const tenant = useAuthStore((s) => s.tenant);
  const type = ((tenant as any)?.businessType ?? '').toUpperCase();
  const features = (tenant as any)?.businessFeatures ?? {};

  const isAgriType =
    type.includes('AGRI') ||
    type.includes('FARM') ||
    type.includes('SEED') ||
    type.includes('FERTILIZER') ||
    type.includes('FEED') ||
    type.includes('PESTICIDE') ||
    type.includes('CROP');

  const hasAgriFeature =
    features.agriMode === true ||
    features.farmers === true ||
    features.subsidies === true;

  return isAgriType || hasAgriFeature;
}
