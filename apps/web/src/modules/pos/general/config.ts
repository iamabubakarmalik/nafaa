/** POS for businesses without an industry pack: products, variants, units, combos. */

import { useComboBundles, useProductCatalog, type PosIndustryConfig } from '../engine';

export const generalPos: PosIndustryConfig = {
  id: 'general',
  label: 'Dukaan',
  useCatalog: () => useProductCatalog(),
  useBundles: useComboBundles,
  quickKeys: true,
};
