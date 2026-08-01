import { useAuthStore } from '@core/stores/auth.store';

export function useIsFurnitureBusiness(): boolean {
  const tenant = useAuthStore((s) => s.tenant);
  const type = ((tenant as any)?.businessType ?? '').toUpperCase();
  const features = (tenant as any)?.businessFeatures ?? {};

  const isFurnitureType =
    type.includes('FURNITURE') || type.includes('INTERIOR') || type.includes('CARPENTRY');

  const hasFeature =
    features.furnitureMode === true ||
    features.customOrders === true ||
    features.showroom === true;

  return isFurnitureType || hasFeature;
}
