import { useAuthStore } from '@core/stores/auth.store';

export function useIsElectronicsBusiness(): boolean {
  const tenant = useAuthStore((s) => s.tenant);
  const type = ((tenant as any)?.businessType ?? '').toUpperCase();
  const features = (tenant as any)?.businessFeatures ?? {};

  const isElectronicsType =
    type.includes('ELECTRONICS') ||
    type.includes('GADGET') ||
    type.includes('MOBILE') ||
    type.includes('TECH');

  const hasFeature =
    features.electronicsMode === true ||
    features.serialTracking === true ||
    features.warrantyClaims === true;

  return isElectronicsType || hasFeature;
}
