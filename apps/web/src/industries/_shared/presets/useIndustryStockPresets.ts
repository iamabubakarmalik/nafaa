import { useMemo } from 'react';
import { useCurrentIndustry } from '@industries/_shared/registry/useCurrentIndustry';
import { getIndustryStockPresets, type IndustryStockPresets } from './stock-presets';
import { industryIdentity } from '@/design-system';
import { t } from '@core/i18n';

/** Stock presets for the current industry, with its name, emoji and colour. */
export function useIndustryStockPresets() {
  const industry = useCurrentIndustry();

  return useMemo(() => {
    const presets: IndustryStockPresets = getIndustryStockPresets(industry?.id);
    return {
      ...presets,
      industryId: industry?.id ?? null,
      industryName: industry?.name ?? t('General'),
      industryEmoji: industry?.emoji ?? '🏪',
      industryColor: industryIdentity(industry?.id).color,
    };
  }, [industry]);
}
