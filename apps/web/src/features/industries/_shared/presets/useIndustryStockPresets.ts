import { useMemo } from 'react';
import { useCurrentIndustry } from '@/features/industries/_shared/registry/useCurrentIndustry';
import { getIndustryStockPresets, type IndustryStockPresets } from './stock-presets';

/**
 * Returns industry-specific Stock Management presets:
 *   • Damage reasons (industry-specific like carpet cutting waste, mobile screen crack)
 *   • Transfer purposes (warehouse→shop, wedding stock, karigar repair)
 *   • Restock urgency rules (industry-specific thresholds)
 *   • Supplier WhatsApp reminder templates
 *   • Quick adjustment reason suggestions
 */
export function useIndustryStockPresets() {
  const industry = useCurrentIndustry();

  return useMemo(() => {
    const presets: IndustryStockPresets = getIndustryStockPresets(industry?.id);
    return {
      ...presets,
      industryId: industry?.id ?? null,
      industryName: industry?.name ?? 'General',
      industryEmoji: industry?.emoji ?? '🏪',
      industryColor: industry?.themeColor ?? '#3b82f6',
    };
  }, [industry]);
}
