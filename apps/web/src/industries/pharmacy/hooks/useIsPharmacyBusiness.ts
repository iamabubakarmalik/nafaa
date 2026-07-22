import { useAuthStore } from '@core/stores/auth.store';

export function useIsPharmacyBusiness(): boolean {
  const tenant = useAuthStore((s) => s.tenant);
  const type = ((tenant as any)?.businessType ?? '').toUpperCase();
  const features = (tenant as any)?.businessFeatures ?? {};

  const isPharmacyType =
    type.includes('PHARMACY') ||
    type.includes('MEDICAL') ||
    type.includes('CHEMIST') ||
    type.includes('DRUG');

  const hasPharmacyFeature =
    features.prescriptions === true ||
    features.pharmacyMode === true ||
    features.expiryTracking === true;

  return isPharmacyType || hasPharmacyFeature;
}
