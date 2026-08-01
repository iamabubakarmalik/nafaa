import { useAuthStore } from '@core/stores/auth.store';

export function useIsOpticalBusiness(): boolean {
  const tenant = useAuthStore((s) => s.tenant);
  const type = ((tenant as any)?.businessType ?? '').toUpperCase();
  const features = (tenant as any)?.businessFeatures ?? {};

  const isOpticalType =
    type.includes('OPTICAL') || type.includes('EYEWEAR') ||
    type.includes('OPTOMETRY') || type.includes('OPTICIAN');

  const hasFeature =
    features.opticalMode === true ||
    features.prescriptions === true ||
    features.eyeTests === true;

  return isOpticalType || hasFeature;
}
