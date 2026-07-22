import { useAuthStore } from '@core/stores/auth.store';

export function useIsServiceBusiness(): boolean {
  const tenant = useAuthStore((s) => s.tenant);
  const type = ((tenant as any)?.businessType ?? '').toUpperCase();
  const features = (tenant as any)?.businessFeatures ?? {};

  const isServiceType =
    type.includes('SERVICE') ||
    type.includes('REPAIR') ||
    type.includes('ELECTRICIAN') ||
    type.includes('PLUMBER') ||
    type.includes('TECHNICIAN') ||
    type.includes('AC_') ||
    type.includes('WORKSHOP') ||
    type.includes('MAINTENANCE') ||
    type.includes('CLEANING') ||
    type.includes('PEST') ||
    type.includes('HVAC') ||
    type.includes('CCTV') ||
    type.includes('SOLAR');

  const hasServiceFeature =
    features.serviceMode === true ||
    features.jobDispatch === true ||
    features.amc === true;

  return isServiceType || hasServiceFeature;
}
