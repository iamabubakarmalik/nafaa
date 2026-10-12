/**
 * Default catalog sources for the POS engine: the offline product store
 * (works without internet, full catalog) and the shared combos.
 */

import { useMemo } from 'react';
import { useQuery } from '@tanstack/react-query';
import { offlineProductsApi } from '@core/lib/offline/offlineProducts';
import type { Product } from '@modules/inventory/products/api/products.api';
import { combosApi, type ProductCombo } from '../api/combos.api';
import type { PosBundle, PosItem } from './types';

export const PRODUCTS_KEY = 'products-for-pos';

/** Branch stock when the API sends it, otherwise the product's own stock. */
export const stockOf = (p: Product & { shopStock?: number | null }) => Number(p.shopStock ?? p.stock ?? 0);

/** Product → counter item with the common fields filled. */
export function toPosItem(p: Product): PosItem {
  const cat = (p as Product & { category?: { id: string; name: string; color?: string | null } }).category;
  return {
    id: p.id,
    product: p,
    name: p.name,
    price: Number(p.price || 0),
    stock: stockOf(p),
    unit: p.unit || 'pcs',
    image: p.images?.find((i) => i.isPrimary)?.url ?? p.images?.[0]?.url,
    categoryId: p.categoryId ?? cat?.id ?? null,
    categoryName: cat?.name,
    categoryColor: cat?.color,
    featured: !!p.isFeatured,
    lowStock: Number(p.lowStockAlert ?? 0) || undefined,
    hasVariants: !!(p as Product & { hasVariants?: boolean }).hasVariants,
  };
}

/**
 * All active products from the offline store. `decorate` adds industry
 * fields (badges, rank) to each item.
 */
export function useProductCatalog(decorate?: (item: PosItem) => PosItem, deps: unknown[] = []) {
  const { data, isLoading } = useQuery({
    queryKey: [PRODUCTS_KEY],
    // The offline layer reads the local store and pages itself, so a high limit costs nothing extra.
    queryFn: () => offlineProductsApi.list({ page: 1, limit: 100_000 }),
    staleTime: 30_000,
  });
  const items = useMemo(() => {
    const list = ((data?.items ?? []) as Product[]).filter((p) => p.isActive !== false && !(p as { isRawMaterial?: boolean }).isRawMaterial).map(toPosItem);
    return decorate ? list.map(decorate) : list;
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [data, ...deps]);
  return { items, loading: isLoading, refreshKeys: [PRODUCTS_KEY, 'pos-combos'] };
}

/** Active combos as POS bundles. */
export function useComboBundles(): PosBundle[] {
  const { data = [] } = useQuery({
    queryKey: ['pos-combos'],
    queryFn: () => combosApi.list({ status: 'ACTIVE' }).catch(() => [] as ProductCombo[]),
    staleTime: 60_000,
  });
  // Only combos on sale now; parts go to checkout in base units, so a
  // "1 dozen" part takes 12 pieces off stock at the per-piece price.
  return useMemo(() => (data as ProductCombo[]).filter((c) => c.sellable !== false).map((c) => ({
    id: c.id,
    name: c.name,
    price: Number(c.comboPrice),
    image: c.imageUrl ?? undefined,
    sku: c.sku,
    barcode: c.barcode,
    featured: c.isFeatured,
    savings: Number(c.savingsAmount || 0),
    savingsPct: Number(c.savingsPercentage || 0),
    items: c.items.map((i) => {
      const rate = Number(i.unit?.conversionRate) || 1;
      return { productId: i.productId, variantId: i.variantId ?? null, quantity: Number(i.quantity) * rate, originalPrice: (Number(i.originalPrice) || 0) / rate };
    }),
  })), [data]);
}
