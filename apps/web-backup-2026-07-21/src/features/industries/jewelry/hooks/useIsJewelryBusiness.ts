import { useAuthStore } from '@/store/auth.store';

export function useIsJewelryBusiness(): boolean {
  const tenant = useAuthStore((s) => s.tenant);
  const type = ((tenant as any)?.businessType ?? '').toUpperCase();
  const features = (tenant as any)?.businessFeatures ?? {};

  const isJewelryType =
    type.includes('JEWELRY') ||
    type.includes('JEWELLERY') ||
    type.includes('ZARGAR') ||
    type.includes('SUNAR') ||
    type.includes('GOLD') ||
    type.includes('BULLION');

  const hasJewelryFeature =
    features.jewelryMode === true ||
    features.metalRates === true ||
    features.hallmark === true;

  return isJewelryType || hasJewelryFeature;
}
