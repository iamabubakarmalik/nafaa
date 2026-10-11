/** Retail POS: full catalog offline, multi-unit packs, weights, combos and quick keys. */

import { useComboBundles, useProductCatalog, type PosIndustryConfig } from '@modules/pos/engine';

export const retailPos: PosIndustryConfig = {
  id: 'retail',
  label: 'Retail',
  useCatalog: () => useProductCatalog(),
  useBundles: useComboBundles,
  quickKeys: true,
};
