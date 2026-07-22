import { useMemo } from 'react';
import { useCurrentIndustry } from '@industries/_shared/registry/useCurrentIndustry';
import { getIndustryKhataPresets, type IndustryKhataPresets } from './khata-presets';

/**
 * Returns industry-specific Khata presets:
 *   • WhatsApp reminder templates (polite / firm / urgent / industry-specific)
 *   • Credit term presets (EMI plans, layaway, wedding advance, etc.)
 *   • Quick payment note suggestions
 */
export function useIndustryKhataPresets() {
  const industry = useCurrentIndustry();

  return useMemo(() => {
    const presets: IndustryKhataPresets = getIndustryKhataPresets(industry?.id);
    return {
      ...presets,
      industryId: industry?.id ?? null,
      industryName: industry?.name ?? 'General',
      industryEmoji: industry?.emoji ?? '🏪',
      industryColor: industry?.themeColor ?? '#3b82f6',
    };
  }, [industry]);
}
