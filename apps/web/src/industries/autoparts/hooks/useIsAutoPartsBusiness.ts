import { useAuthStore } from '@core/stores/auth.store';

export function useIsAutoPartsBusiness(): boolean {
  const tenant = useAuthStore((s) => s.tenant);
  const type = ((tenant as any)?.businessType ?? '').toUpperCase();
  const features = (tenant as any)?.businessFeatures ?? {};

  const isAutoPartsType =
    type.includes('AUTO') ||
    type.includes('WORKSHOP') ||
    type.includes('GARAGE') ||
    type.includes('MECHANIC') ||
    type.includes('SPARE') ||
    type.includes('MOTOR') ||
    type.includes('VEHICLE') ||
    type.includes('CAR');

  const hasAutoPartsFeature =
    features.autoPartsMode === true ||
    features.workshopMode === true ||
    features.vehicleMode === true;

  return isAutoPartsType || hasAutoPartsFeature;
}
