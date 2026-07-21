import { useAuthStore } from '@/store/auth.store';

export function useIsBakeryBusiness(): boolean {
  const tenant = useAuthStore((s) => s.tenant);
  const type = ((tenant as any)?.businessType ?? '').toUpperCase();
  const features = (tenant as any)?.businessFeatures ?? {};

  const isBakeryType =
    type.includes('BAKERY') ||
    type.includes('CAKE') ||
    type.includes('PATISSERIE') ||
    type.includes('SWEETS') ||
    type.includes('CONFECTIONERY') ||
    type.includes('DESSERT');

  const hasBakeryFeature =
    features.bakeryMode === true ||
    features.customCakes === true ||
    features.production === true;

  return isBakeryType || hasBakeryFeature;
}
