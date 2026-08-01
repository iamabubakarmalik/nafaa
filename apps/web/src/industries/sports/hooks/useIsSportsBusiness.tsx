import { useAuthStore } from '@core/stores/auth.store';

export function useIsSportsBusiness(): boolean {
  const tenant = useAuthStore((s) => s.tenant);
  const type = ((tenant as any)?.businessType ?? '').toUpperCase();
  const features = (tenant as any)?.businessFeatures ?? {};
  return type.includes('SPORTS') || type.includes('GYM') || type.includes('CRICKET') ||
    features.sportsMode === true;
}
