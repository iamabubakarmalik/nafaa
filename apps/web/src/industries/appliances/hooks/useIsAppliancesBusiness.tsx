import { useAuthStore } from '@core/stores/auth.store';

export function useIsAppliancesBusiness(): boolean {
  const tenant = useAuthStore((s) => s.tenant);
  const type = ((tenant as any)?.businessType ?? '').toUpperCase();
  const features = (tenant as any)?.businessFeatures ?? {};

  const isAppliancesType =
    type.includes('APPLIANCE') ||
    type.includes('HOME_APPLIANCE') ||
    type.includes('ELECTRONICS_STORE') ||
    type.includes('WHITE_GOODS');

  const hasFeature =
    features.appliancesMode === true ||
    features.installations === true ||
    features.amcContracts === true;

  return isAppliancesType || hasFeature;
}
