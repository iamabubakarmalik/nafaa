import { useMemo } from 'react';
import { useCurrentIndustry } from '@industries/_shared/registry/useCurrentIndustry';
import { getIndustryPresets, type IndustryPresets } from './industry-presets';
import { industryIdentity } from '@/design-system';

/**
 * Returns industry-specific Category / Brand / Tag presets based on the
 * currently active industry pack. Falls back to generic if no industry matches.
 *
 * Usage:
 *   const { categories, brands, tags, industryId, industryName } = useIndustryPresets();
 */
export function useIndustryPresets() {
  const industry = useCurrentIndustry();

  return useMemo(() => {
    const presets: IndustryPresets = getIndustryPresets(industry?.id);
    return {
      ...presets,
      industryId: industry?.id ?? null,
      industryName: industry?.name ?? 'General',
      industryEmoji: industry?.emoji ?? '🏪',
      industryColor: industryIdentity(industry?.id).color,
    };
  }, [industry]);
}
