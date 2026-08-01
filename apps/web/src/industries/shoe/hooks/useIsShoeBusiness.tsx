import { useAuthStore } from '@core/stores/auth.store';

export function useIsShoeBusiness(): boolean {
  const tenant = useAuthStore((s) => s.tenant);
  const type = ((tenant as any)?.businessType ?? '').toUpperCase();
  const features = (tenant as any)?.businessFeatures ?? {};

  const isShoeType =
    type.includes('SHOE') || type.includes('FOOTWEAR');

  const hasFeature =
    features.shoeMode === true ||
    features.sizeVariants === true;

  return isShoeType || hasFeature;
}
