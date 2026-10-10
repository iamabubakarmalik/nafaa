import { useMemo } from 'react';
import { useCurrentIndustry } from '@industries/_shared/registry/useCurrentIndustry';
import { getIndustryExpensePresets, type IndustryExpensePresets } from './expense-presets';
import { industryIdentity } from '@/design-system';

/**
 * Returns industry-specific expense category presets based on the
 * currently active industry pack. Falls back to generic common expenses.
 */
export function useIndustryExpensePresets() {
  const industry = useCurrentIndustry();

  return useMemo(() => {
    const presets: IndustryExpensePresets = getIndustryExpensePresets(industry?.id);
    return {
      ...presets,
      industryId: industry?.id ?? null,
      industryName: industry?.name ?? 'General',
      industryEmoji: industry?.emoji ?? '🏪',
      industryColor: industryIdentity(industry?.id).color,
    };
  }, [industry]);
}
