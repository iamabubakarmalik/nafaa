/**
 * Furniture counter on the shared POS engine: showroom stock with colour /
 * fabric variants, marks for display pieces and fitting, and filters by
 * room (Sofa, Bed room, Dining…). Paid like any bill (cash, card, split,
 * udhaar). After a bill with furniture on it the counter offers to book
 * the delivery.
 */

import { BadgeCheck, BedDouble, Hammer, LampDesk, Sofa, UtensilsCrossed } from 'lucide-react';
import { useProductCatalog, type PosFilter, type PosIndustryConfig, type PosItem, type PosSavedSale } from '@modules/pos/engine';
import { queryClient } from '@core/lib/queryClient';
import type { FurnitureProductProfile } from '../api/products.api';
import { useFurnitureProfiles } from '../hooks/useFurnitureProfiles';
import { CONDITIONS, FURNITURE_KEYS, categoryGroup, categoryLabel, sizeText } from '../lib/meta';

/** Receives each saved bill that carried furniture; FurniturePosPage sets it while the counter is open. */
export const furnitureSaleListener: { current: ((sale: PosSavedSale) => void) | null } = { current: null };

function decorate(profiles: Map<string, FurnitureProductProfile>) {
  return (it: PosItem): PosItem => {
    const p = profiles.get(it.id);
    if (!p) return { ...it, rank: 2 };
    const cond = p.conditionType !== 'BRAND_NEW' ? CONDITIONS[p.conditionType] : undefined;
    return {
      ...it,
      rank: p.isFeatured ? 0 : 1,
      badges: [
        ...(cond ? [{ label: cond.label, tone: 'warning' as const, icon: BadgeCheck }] : []),
        ...(p.requiresAssembly ? [{ label: 'Fitting', tone: 'info' as const, icon: Hammer }] : []),
      ],
      subline: [p.woodType || null, p.polishType || p.colorName || null, sizeText(p) || null].filter(Boolean).join(' · ') || (p.categoryType ? categoryLabel(p.categoryType) : undefined),
      searchText: [it.searchText, p.woodType, p.polishType, p.colorName, p.upholsteryFabric, p.categoryType ? categoryLabel(p.categoryType) : null, p.modelNumber].filter(Boolean).join(' '),
      meta: { ...it.meta, group: categoryGroup(p.categoryType), used: !!cond, furniture: true },
    };
  };
}

function useFurnitureCatalog() {
  const profiles = useFurnitureProfiles();
  const catalog = useProductCatalog(decorate(profiles), [profiles]);
  return { ...catalog, refreshKeys: [...catalog.refreshKeys, FURNITURE_KEYS.profiles] };
}

const filters: PosFilter[] = [
  { id: 'sofa', label: 'Sofa', icon: Sofa, match: (i) => i.meta?.group === 'sofa' },
  { id: 'bed', label: 'Bed room', icon: BedDouble, match: (i) => i.meta?.group === 'bed' },
  { id: 'dining', label: 'Dining', icon: UtensilsCrossed, match: (i) => i.meta?.group === 'dining' },
  { id: 'living', label: 'Living', match: (i) => i.meta?.group === 'living' },
  { id: 'office', label: 'Office', icon: LampDesk, match: (i) => i.meta?.group === 'office' },
  { id: 'display', label: 'Display piece', icon: BadgeCheck, match: (i) => !!i.meta?.used },
];

export const furniturePos: PosIndustryConfig = {
  id: 'furniture',
  label: 'Furniture',
  useCatalog: useFurnitureCatalog,
  quickKeys: true,
  filters,
  searchHint: 'Naam, lakri, rang ya barcode',
  receiptFooter: 'Delivery aur fitting ke charges alag bill par. Furniture le jane ke baad wapsi dukaan ki shart par.',
  onSale: (sale) => {
    queryClient.invalidateQueries({ queryKey: [FURNITURE_KEYS.profiles] });
    if (furnitureSaleListener.current && sale.items?.some((l) => !!l.productId)) furnitureSaleListener.current(sale);
  },
  voiceAliases: { almari: 'wardrobe almari', palang: 'bed', kursi: 'chair', mez: 'table' },
};
