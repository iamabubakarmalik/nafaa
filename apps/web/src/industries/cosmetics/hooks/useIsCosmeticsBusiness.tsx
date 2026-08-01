import { useAuthStore } from '@core/stores/auth.store';

export function useIsCosmeticsBusiness(): boolean {
  const tenant = useAuthStore((s) => s.tenant);
  const type = ((tenant as any)?.businessType ?? '').toUpperCase();
  const features = (tenant as any)?.businessFeatures ?? {};

  const isCosmeticsType =
    type.includes('COSMETIC') || type.includes('BEAUTY') ||
    type.includes('MAKEUP') || type.includes('SKINCARE') ||
    type.includes('FRAGRANCE') || type.includes('PERFUME');

  const hasFeature =
    features.cosmeticsMode === true ||
    features.batchTracking === true ||
    features.loyaltyProgram === true;

  return isCosmeticsType || hasFeature;
}
