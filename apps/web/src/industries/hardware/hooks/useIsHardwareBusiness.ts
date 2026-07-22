import { useAuthStore } from '@core/stores/auth.store';

export function useIsHardwareBusiness(): boolean {
  const tenant = useAuthStore((s) => s.tenant);
  const type = ((tenant as any)?.businessType ?? '').toUpperCase();
  const features = (tenant as any)?.businessFeatures ?? {};

  const isHardwareType =
    type.includes('HARDWARE') ||
    type.includes('BUILDING') ||
    type.includes('CONSTRUCTION') ||
    type.includes('CEMENT') ||
    type.includes('STEEL') ||
    type.includes('SANITARY') ||
    type.includes('PLUMBING') ||
    type.includes('TILES') ||
    type.includes('PAINT');

  const hasHardwareFeature =
    features.hardwareMode === true ||
    features.creditAccounts === true ||
    features.deliveries === true;

  return isHardwareType || hasHardwareFeature;
}
