/**
 * Cosmetics counter on the shared POS engine: brand under every name,
 * shades as variants, and expiry batches sold earliest first by the engine.
 * Deals (combos) have their own tab.
 */

import { CalendarClock, Palette } from 'lucide-react';
import { useComboBundles, useProductCatalog, type PosFilter, type PosIndustryConfig, type PosItem } from '@modules/pos/engine';
import { t } from '@core/i18n';

function useCosmeticsCatalog() {
  return useProductCatalog((it): PosItem => {
    const brand = it.product.brand?.name;
    return brand ? { ...it, subline: brand, searchText: [it.searchText, brand].filter(Boolean).join(' '), meta: { ...it.meta, brand } } : it;
  });
}

const filters: PosFilter[] = [
  { id: 'shades', label: t('Shade wale'), icon: Palette, match: (i) => !!i.hasVariants },
  { id: 'expiry', label: t('Expiry wale'), icon: CalendarClock, match: (i) => !!i.product.expiryTracked },
];

export const cosmeticsPos: PosIndustryConfig = {
  id: 'cosmetics',
  label: t('Cosmetics'),
  useCatalog: useCosmeticsCatalog,
  useBundles: useComboBundles,
  quickKeys: true,
  filters,
  searchHint: t('Naam, brand, shade ya barcode…'),
  // i18n-ignore: printed on the bill, which follows the shop's language.
  receiptFooter: 'Khula hua cosmetics wapas nahi hota. Shukriya!',
  voiceAliases: { lipstick: 'lipstick', foundation: 'foundation', cream: 'cream', perfume: 'perfume fragrance', shampoo: 'shampoo', nail: 'nail polish' },
};
