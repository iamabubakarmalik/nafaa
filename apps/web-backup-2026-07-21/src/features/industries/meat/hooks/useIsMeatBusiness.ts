import { useAuthStore } from '@/store/auth.store';

export function useIsMeatBusiness(): boolean {
  const tenant = useAuthStore((s) => s.tenant);
  const type = ((tenant as any)?.businessType ?? '').toUpperCase();
  const features = (tenant as any)?.businessFeatures ?? {};

  const isMeatType =
    type.includes('MEAT') ||
    type.includes('BUTCHER') ||
    type.includes('HALAL') ||
    type.includes('POULTRY') ||
    type.includes('SLAUGHTERHOUSE');

  const hasMeatFeature =
    features.meatMode === true ||
    features.halal === true ||
    features.qurbani === true;

  return isMeatType || hasMeatFeature;
}
