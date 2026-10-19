/**
 * Dairy counter on the shared POS: milk, dahi and lassi sold loose by litre
 * or kg (the engine weighs by amount or by weight), the evening rate from
 * 3 pm when the shop has one, and the bulk rate once a line reaches the
 * bulk quantity (hotels, tea stalls).
 */

import { createElement } from 'react';
import { CakeSlice, Droplets, Milk, Snowflake, Sunset } from 'lucide-react';
import { formatPKR } from '@core/lib/format';
import { productEmoji } from '@modules/inventory/products/lib/productEmoji';
import { useComboBundles, useProductCatalog, type PosIndustryConfig, type PosItem } from '@modules/pos/engine';
import type { DairyProduct } from '../api/products.api';
import { useDairyProfiles } from '../hooks/useDairyProfiles';
import { DAIRY_KEYS, slotNow } from '../lib/meta';
import { isMilkType } from '../lib/productTypes';

const CULTURED = new Set(['DAHI', 'YOGURT', 'LASSI', 'BUTTER_MILK']);
const FATS = new Set(['MAKHAN', 'BUTTER', 'DESI_GHEE', 'CREAM', 'MALAI']);
const SWEET = new Set(['KHOA', 'MAWA', 'KHEER', 'RABRI', 'KULFI', 'SWEETS', 'ICE_CREAM', 'PANEER', 'CHEESE']);

/** Rate of one base unit right now: the slot rate when set, else the product price. */
function rateNow(p: DairyProduct | undefined, price: number) {
  const slot = p && (slotNow() === 'EVENING' ? p.eveningPrice : p.morningPrice);
  return slot && slot > 0 ? slot : price;
}

function useDairyCatalog() {
  const profiles = useDairyProfiles();
  const catalog = useProductCatalog((it): PosItem => {
    const p = profiles.get(it.id);
    if (!p) return it;
    const price = rateNow(p, it.price);
    const evening = slotNow() === 'EVENING' && !!p.eveningPrice && p.eveningPrice !== it.price;
    return {
      ...it,
      price,
      rank: p.isFeatured ? 0 : isMilkType(p.productType) ? 1 : 2,
      badges: [
        ...(evening ? [{ label: 'Shaam rate', tone: 'warning' as const, icon: Sunset }] : []),
        ...(p.requiresRefrigeration ? [{ label: 'Fridge', tone: 'info' as const, icon: Snowflake }] : []),
      ],
      subline: p.bulkPrice && p.minBulkQty ? `${p.minBulkQty}+ ${it.unit} par ${formatPKR(p.bulkPrice)}` : undefined,
      meta: { profile: p },
    };
  }, [profiles]);
  return { ...catalog, refreshKeys: [...catalog.refreshKeys, DAIRY_KEYS.profiles] };
}

const kind = (i: PosItem) => (i.meta?.profile as DairyProduct | undefined)?.productType ?? '';

export const dairyPos: PosIndustryConfig = {
  id: 'dairy',
  label: 'Dairy',
  useCatalog: useDairyCatalog,
  useBundles: useComboBundles,
  quickKeys: true,
  filters: [
    { id: 'milk', label: 'Doodh', icon: Milk, match: (i) => isMilkType(kind(i)) },
    { id: 'dahi', label: 'Dahi / lassi', icon: Droplets, match: (i) => CULTURED.has(kind(i)) },
    { id: 'fat', label: 'Makhan / ghee', icon: Droplets, match: (i) => FATS.has(kind(i)) },
    { id: 'sweet', label: 'Mithai / khoya', icon: CakeSlice, match: (i) => SWEET.has(kind(i)) },
  ],
  repriceLine: (line, item) => {
    const p = item.meta?.profile as DairyProduct | undefined;
    if (!p?.bulkPrice || !p.minBulkQty) return undefined;
    const bulk = p.bulkPrice * line.conversionRate;
    const normal = rateNow(p, item.price) * line.conversionRate;
    if (line.baseQuantity >= p.minBulkQty) return bulk;
    // Back under the bulk quantity: only undo the bulk rate, never a rate typed by hand.
    return Math.abs(line.unitPrice - bulk) < 0.005 ? normal : undefined;
  },
  cardFallback: (item) => createElement('span', { className: 'text-4xl' }, productEmoji(item.name, item.categoryName)),
  voiceAliases: {
    doodh: 'doodh milk', milk: 'doodh milk', dahi: 'dahi yogurt', yogurt: 'dahi yogurt', lassi: 'lassi', makhan: 'makhan butter',
    butter: 'makhan butter', ghee: 'desi ghee', khoya: 'khoya khoa', malai: 'malai cream', paneer: 'paneer', kheer: 'kheer',
  },
  searchHint: 'Doodh, dahi, lassi… ya barcode scan karein',
};
