import { useAuthStore } from '@core/stores/auth.store';

export function useIsRestaurantBusiness(): boolean {
  const tenant = useAuthStore((s) => s.tenant);
  const type = ((tenant as any)?.businessType ?? '').toUpperCase();
  const features = (tenant as any)?.businessFeatures ?? {};

  const isRestaurantType =
    type.includes('RESTAURANT') ||
    type.includes('CAFE') ||
    type.includes('BAKERY') ||
    type.includes('FOOD') ||
    type.includes('FAST_FOOD') ||
    type.includes('DINE');

  const hasRestaurantFeature =
    features.restaurantMode === true ||
    features.kot === true ||
    features.tables === true;

  return isRestaurantType || hasRestaurantFeature;
}
