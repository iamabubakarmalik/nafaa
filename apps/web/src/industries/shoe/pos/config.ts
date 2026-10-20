/**
 * Shoe counter on the shared POS engine: the full catalog with Gents /
 * Ladies / Bachay, Sale (below MRP), New and Bridal filters; the size
 * picker for articles with sizes; scanning a pair's barcode puts that exact
 * size on the bill; older size products whose pairs sat on the product row
 * are moved to their sizes once, before the size picker.
 */

import { useMemo } from 'react';
import { useQuery } from '@tanstack/react-query';
import { toast } from 'sonner';
import { BadgePercent, Sparkles } from 'lucide-react';
import { formatPKR } from '@core/lib/format';
import { shopParam } from '@core/lib/shopScope';
import { useAuthStore } from '@core/stores/auth.store';
import { productsApi, type Product } from '@modules/inventory/products/api/products.api';
import { useComboBundles, useProductCatalog, type PosFilter, type PosIndustryConfig, type PosItem } from '@modules/pos/engine';
import { shoeProductsApi } from '../api/products.api';
import { KIDS, META_KEY, genderLabel, typeLabel, type ShoeMeta } from '../components/meta';

function useShoeCatalog() {
  const metaQ = useQuery({ queryKey: [META_KEY], queryFn: shoeProductsApi.meta, staleTime: 5 * 60_000, retry: 1 });
  const byId = useMemo(() => new Map<string, ShoeMeta>((metaQ.data?.items ?? []).map((m) => [m.productId, m])), [metaQ.data]);
  const catalog = useProductCatalog((it): PosItem => {
    const m = byId.get(it.id);
    if (!m) return it;
    return {
      ...it,
      badges: [
        ...(it.badges ?? []),
        ...(m.onSale ? [{ label: `Sale ${m.offPct}%`, tone: 'danger' as const, icon: BadgePercent }] : []),
        ...(m.isNewArrival ? [{ label: 'Naya', tone: 'info' as const, icon: Sparkles }] : []),
      ],
      subline: [m.onSale && m.mrp ? `MRP ${formatPKR(m.mrp)}` : null, genderLabel(m.gender) !== '—' ? genderLabel(m.gender) : null, m.categoryType ? typeLabel(m.categoryType) : null].filter(Boolean).join(' · ') || it.subline,
      searchText: [it.searchText, m.modelCode, m.season, m.categoryType ? typeLabel(m.categoryType) : null].filter(Boolean).join(' '),
      rank: m.onSale || m.isNewArrival ? 0 : 1,
      meta: { ...(it.meta ?? {}), shoe: m },
    };
  }, [byId]);
  return { ...catalog, refreshKeys: [...catalog.refreshKeys, META_KEY] };
}

const meta = (i: PosItem) => i.meta?.shoe as ShoeMeta | undefined;
const filters: PosFilter[] = [
  { id: 'men', label: 'Gents', match: (i) => meta(i)?.gender === 'MEN' },
  { id: 'women', label: 'Ladies', match: (i) => meta(i)?.gender === 'WOMEN' },
  { id: 'kids', label: 'Bachay', match: (i) => KIDS.includes(meta(i)?.gender ?? '') },
  { id: 'sale', label: 'Sale', icon: BadgePercent, match: (i) => !!meta(i)?.onSale },
  { id: 'new', label: 'Naya maal', icon: Sparkles, match: (i) => !!meta(i)?.isNewArrival },
  { id: 'bridal', label: 'Bridal', match: (i) => !!meta(i)?.isBridal },
];

/** Size products checked this session for pairs kept on the product row. */
const splitChecked = new Set<string>();

export const shoePos: PosIndustryConfig = {
  id: 'shoe',
  label: 'Shoes',
  useCatalog: useShoeCatalog,
  useBundles: useComboBundles,
  quickKeys: true,
  filters,
  searchHint: 'Naam, article number ya joron ka barcode scan karein',
  receiptFooter: 'Size badalne (exchange) ke liye yeh bill aur dabba saath laayein.',
  beforeAdd: (item, opts, api) => {
    if (!item.hasVariants || opts.variant || splitChecked.has(item.id)) return 'continue';
    // Older size products kept their pairs on the product row; the server moves them once when exact.
    splitChecked.add(item.id);
    void shoeProductsApi.splitVariantStock(item.id).catch(() => undefined).finally(() => api.addItem(item, opts));
    return 'handled';
  },
  scan: async (code, api) => {
    // Product barcodes are found by the engine; a size barcode is looked up here.
    if (api.findItemByCode(code) || !navigator.onLine || code.length < 3) return false;
    try {
      const shopId = shopParam(useAuthStore.getState().currentShopId);
      const hit = await productsApi.byBarcode(code, shopId) as Product & { matchedVariant?: { id: string; name: string; price: number; stock: number } };
      if (!hit.matchedVariant) return false;
      const item = api.itemById(hit.id);
      if (!item) { toast.error(`${hit.name} is branch ke catalog me nahi`); return true; }
      const v = hit.matchedVariant;
      api.addItem(item, { variant: { id: v.id, name: v.name, price: v.price, stock: hit.shopStock ?? v.stock } });
      return true;
    } catch {
      return false;
    }
  },
};
