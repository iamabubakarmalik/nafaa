import { useAuthStore } from '@core/stores/auth.store';

export function useIsGarmentsBusiness(): boolean {
  const tenant = useAuthStore((s) => s.tenant);
  const type = ((tenant as any)?.businessType ?? '').toUpperCase();
  const features = (tenant as any)?.businessFeatures ?? {};

  const isGarmentsType =
    type.includes('GARMENT') ||
    type.includes('CLOTHING') ||
    type.includes('BOUTIQUE') ||
    type.includes('APPAREL') ||
    type.includes('TAILOR') ||
    type.includes('FASHION');

  const hasGarmentsFeature =
    features.garmentsMode === true ||
    features.tailoring === true ||
    features.measurements === true;

  return isGarmentsType || hasGarmentsFeature;
}
