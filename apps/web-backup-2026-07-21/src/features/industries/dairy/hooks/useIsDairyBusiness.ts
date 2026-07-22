import { useAuthStore } from '@/store/auth.store';

export function useIsDairyBusiness(): boolean {
  const tenant = useAuthStore((s) => s.tenant);
  const type = ((tenant as any)?.businessType ?? '').toUpperCase();
  const features = (tenant as any)?.businessFeatures ?? {};

  const isDairyType =
    type.includes('DAIRY') ||
    type.includes('MILK') ||
    type.includes('DODHI') ||
    type.includes('GAWALA');

  const hasDairyFeature =
    features.dairyMode === true ||
    features.milkRouteDelivery === true;

  return isDairyType || hasDairyFeature;
}
