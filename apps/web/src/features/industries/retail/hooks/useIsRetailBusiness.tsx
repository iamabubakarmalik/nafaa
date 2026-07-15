import { useAuthStore } from '@/store/auth.store';

/**
 * Detects whether the current tenant is a retail-type business.
 * Used to conditionally show retail-specific features (POS quick keys,
 * multi-unit selectors, combos tab, etc.)
 */
export function useIsRetailBusiness(): boolean {
  const tenant = useAuthStore((s) => s.tenant);
  const type = ((tenant as any)?.businessType ?? '').toUpperCase();
  const features = (tenant as any)?.businessFeatures ?? {};

  // Explicit business type match
  const isRetailType =
    type.includes('RETAIL') ||
    type.includes('KIRYANA') ||
    type.includes('GENERAL') ||
    type.includes('SUPERMARKET') ||
    type.includes('GROCERY');

  // Or feature flag opt-in
  const hasRetailFeature =
    features.multiUnit === true ||
    features.combos === true ||
    features.retailMode === true;

  return isRetailType || hasRetailFeature;
}