/** POS for businesses without an industry pack: products, variants, units, combos. */

import { useComboBundles, useProductCatalog, type PosIndustryConfig } from '../engine';
import { t } from '@core/i18n';

export const generalPos: PosIndustryConfig = {
  id: 'general',
  label: t('Dukaan'),
  useCatalog: () => useProductCatalog(),
  useBundles: useComboBundles,
  quickKeys: true,
};
