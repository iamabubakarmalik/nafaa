import { useContext } from 'react';
import { IndustryContext } from './IndustryProvider';
import type { IndustryPack } from '../types/industry-pack';

/**
 * Access the currently active industry pack.
 *
 * Returns `undefined` if:
 *   • No pack matches the current tenant
 *   • IndustryProvider is not mounted
 *   • Tenant is not loaded yet
 *
 * Example:
 *   const industry = useCurrentIndustry();
 *   const PosModeBar = industry?.pos?.modeBar;
 *   return PosModeBar ? <PosModeBar /> : null;
 */
export function useCurrentIndustry(): IndustryPack | undefined {
  return useContext(IndustryContext).industry;
}

/**
 * Access all registered industry packs. Useful for:
 *   • Onboarding industry pickers
 *   • Admin panels
 *   • Debug tools
 */
export function useAllIndustryPacks(): IndustryPack[] {
  return useContext(IndustryContext).allPacks;
}

/**
 * Check if the current tenant is on a specific industry.
 * Convenience for scattered checks — prefer `useCurrentIndustry()` when possible.
 *
 *   const isHotel = useIsIndustry('hotel');
 */
export function useIsIndustry(id: string): boolean {
  const industry = useCurrentIndustry();
  return industry?.id === id;
}
