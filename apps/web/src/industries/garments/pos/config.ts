/**
 * Garments POS on the shared engine: the full catalog with gender, garment
 * type and Sale/New marks; filter chips for Gents, Ladies, Bachay, Sale and
 * unstitched fabric; scanning a size/colour barcode puts that exact variant
 * on the bill; pieces kept on hold for a customer are pointed out before
 * they are sold to someone else; and older variant products whose units sat
 * on the product row are moved to their sizes once, before the size picker.
 */

import { useMemo } from 'react';
import { useQuery } from '@tanstack/react-query';
import { toast } from 'sonner';
import { BadgePercent, Bookmark, Ruler, Sparkles } from 'lucide-react';
import { shopParam } from '@core/lib/shopScope';
import { useAuthStore } from '@core/stores/auth.store';
import { productsApi, type Product } from '@modules/inventory/products/api/products.api';
import { useComboBundles, useProductCatalog, type PosFilter, type PosIndustryConfig, type PosItem } from '@modules/pos/engine';
import { garmentProductsApi, type GarmentMeta } from '../api/products.api';
import { reservationsApi } from '../api/reservations.api';
import { HOLD_KEY, META_KEY, garmentLabel, genderLabel } from '../components/meta';

const KIDS = ['BOYS', 'GIRLS', 'KIDS', 'BABY'];

function useGarmentsCatalog() {
  const metaQ = useQuery({ queryKey: [META_KEY], queryFn: garmentProductsApi.meta, staleTime: 5 * 60_000, retry: 1 });
  const holdsQ = useQuery({ queryKey: [HOLD_KEY, 'pos'], queryFn: () => reservationsApi.page({ view: 'active', limit: 100 }), staleTime: 60_000, retry: 1 });
  const byId = useMemo(() => new Map<string, GarmentMeta>((metaQ.data?.items ?? []).map((m) => [m.productId, m])), [metaQ.data]);
  const held = useMemo(() => {
    const m = new Map<string, number>();
    for (const r of holdsQ.data?.items ?? []) m.set(r.productId, (m.get(r.productId) ?? 0) + r.quantity);
    return m;
  }, [holdsQ.data]);

  const catalog = useProductCatalog((it): PosItem => {
    const g = byId.get(it.id);
    const onHold = held.get(it.id) ?? 0;
    return {
      ...it,
      badges: [
        ...(g?.isOnSale ? [{ label: 'Sale', tone: 'danger' as const, icon: BadgePercent }] : []),
        ...(g?.isNewArrival ? [{ label: 'Naya', tone: 'info' as const, icon: Sparkles }] : []),
        ...(g?.isFabricOnly ? [{ label: it.unit, tone: 'neutral' as const, icon: Ruler }] : []),
        ...(onHold ? [{ label: `${onHold} hold`, tone: 'warning' as const, icon: Bookmark }] : []),
      ],
      subline: g ? [genderLabel(g.gender) !== '—' ? genderLabel(g.gender) : null, g.categoryType && g.categoryType !== 'FABRIC' ? garmentLabel(g.categoryType) : null].filter(Boolean).join(' · ') || undefined : undefined,
      searchText: [it.searchText, g?.styleCode, g?.categoryType ? garmentLabel(g.categoryType) : null].filter(Boolean).join(' '),
      rank: g?.isOnSale || g?.isNewArrival ? 0 : 1,
      meta: { garment: g, onHold },
    };
  }, [byId, held]);
  return { ...catalog, refreshKeys: [...catalog.refreshKeys, META_KEY, HOLD_KEY] };
}

const meta = (i: PosItem) => i.meta?.garment as GarmentMeta | undefined;
const filters: PosFilter[] = [
  { id: 'men', label: 'Gents', match: (i) => meta(i)?.gender === 'MEN' },
  { id: 'women', label: 'Ladies', match: (i) => meta(i)?.gender === 'WOMEN' },
  { id: 'kids', label: 'Bachay', match: (i) => KIDS.includes(meta(i)?.gender ?? '') },
  { id: 'sale', label: 'Sale', icon: BadgePercent, match: (i) => !!meta(i)?.isOnSale },
  { id: 'new', label: 'Naya maal', icon: Sparkles, match: (i) => !!meta(i)?.isNewArrival },
  { id: 'fabric', label: 'Unstitched', icon: Ruler, match: (i) => !!meta(i)?.isFabricOnly },
];

/** Variant products checked this session for units kept on the product row. */
const splitChecked = new Set<string>();

export const garmentsPos: PosIndustryConfig = {
  id: 'garments',
  label: 'Garments',
  useCatalog: useGarmentsCatalog,
  useBundles: useComboBundles,
  quickKeys: true,
  filters,
  searchHint: 'Naam, article code ya size ka barcode scan karein',
  receiptFooter: 'Badalne (exchange) ke liye yeh bill saath laayein.',
  beforeAdd: (item, opts, api) => {
    const onHold = Number(item.meta?.onHold ?? 0);
    if (onHold && !opts.confirmed?.includes('hold')) {
      toast.warning(`${item.name}: ${onHold} piece customer ke liye hold par hain — hold wala piece na dein`, { duration: 4000 });
    }
    // Older variant products kept their units on the product row; the server
    // moves them to the sizes once (only when the numbers are exact).
    if (item.hasVariants && !opts.variant && !splitChecked.has(item.id)) {
      splitChecked.add(item.id);
      void garmentProductsApi.splitVariantStock(item.id).catch(() => undefined).finally(() => api.addItem(item, { ...opts, confirmed: [...(opts.confirmed ?? []), 'hold'] }));
      return 'handled';
    }
    return 'continue';
  },
  scan: async (code, api) => {
    // Product barcodes are found by the engine; a size/colour barcode is looked up here.
    if (api.findItemByCode(code) || !navigator.onLine || code.length < 3) return false;
    try {
      const shopId = shopParam(useAuthStore.getState().currentShopId);
      const hit = await productsApi.byBarcode(code, shopId) as Product & { matchedVariant?: { id: string; name: string; price: number; stock: number } };
      if (!hit.matchedVariant) return false;
      const item = api.itemById(hit.id);
      if (!item) { toast.error(`${hit.name} is branch ke catalog me nahi`); return true; }
      const v = hit.matchedVariant;
      // Branch stock of the variant when the server sends it.
      api.addItem(item, { variant: { id: v.id, name: v.name, price: v.price, stock: hit.shopStock ?? v.stock } });
      return true;
    } catch {
      return false;
    }
  },
};
