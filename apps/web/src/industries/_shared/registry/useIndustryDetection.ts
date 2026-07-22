import { useMemo } from 'react';
import { useAuthStore } from '@core/stores/auth.store';
import { useCurrentIndustry, useAllIndustryPacks } from './useCurrentIndustry';
import type { IndustryPack } from '../types/industry-pack';

/**
 * Rich industry detection helper — everything a component might ask about
 * the active industry in one call.
 *
 *   const {
 *     pack,           // the active IndustryPack (or undefined)
 *     id,             // 'hotel' | 'carpet' | ... | undefined
 *     is,             // { hotel: bool, carpet: bool, ... }
 *     hasSlot,        // (path) => bool — is this slot filled?
 *     getSlot,        // (path) => ComponentType | undefined
 *   } = useIndustryDetection();
 *
 * Prefer this over ad-hoc `businessType.includes(...)` checks scattered
 * across pages — it makes future migrations trivial.
 */
export function useIndustryDetection() {
  const pack = useCurrentIndustry();
  const allPacks = useAllIndustryPacks();
  const tenant = useAuthStore((s) => s.tenant);

  return useMemo(() => {
    const id = pack?.id;

    // Boolean flags per registered pack, so callers can do `is.hotel`, `is.carpet`
    const is: Record<string, boolean> = {};
    for (const p of allPacks) {
      is[p.id.replace(/-/g, '_')] = id === p.id;
    }

    const hasSlot = (path: (p: IndustryPack) => unknown | undefined): boolean => {
      if (!pack) return false;
      return Boolean(path(pack));
    };

    function getSlot<T>(path: (p: IndustryPack) => T | undefined): T | undefined {
      if (!pack) return undefined;
      return path(pack);
    }

    return {
      pack,
      id,
      is,
      tenant,
      allPacks,
      hasSlot,
      getSlot,
    };
  }, [pack, allPacks, tenant]);
}
