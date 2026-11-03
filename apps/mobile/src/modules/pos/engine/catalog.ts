/**
 * What the counter sells: products from the phone's database (instant
 * search, branch stock with pending bills taken off), categories, combos
 * and quick keys (saved for offline use), and the items sold most on this
 * phone.
 */

import { useMemo } from 'react';
import { useQuery } from '@tanstack/react-query';
import type { ComboInput } from '@nafaa/core/pos';
import { offline, useApiQuery, useOfflineList, useProductSearch, type ProductRow } from '@/core/offline';
import { topRecent, type PosQuickKey } from './usePos';

export interface PosCombo extends ComboInput {
  barcode?: string | null;
  sku?: string | null;
  featured?: boolean;
  savingsPct?: number;
}

interface ServerCombo {
  id: string; name: string; comboPrice: number | string; imageUrl?: string | null; sku?: string | null; barcode?: string | null;
  isFeatured?: boolean; savingsAmount?: number | string | null; savingsPercentage?: number | string | null; sellable?: boolean;
  items: Array<{ productId: string; variantId?: string | null; quantity: number | string; originalPrice?: number | string | null; unit?: { conversionRate?: number | string | null } | null }>;
}

/** Active combos on sale now; parts in base units (a "1 dozen" part takes 12 pieces at the per-piece price). */
export function useCombos(enabled = true): PosCombo[] {
  const q = useApiQuery<ServerCombo[]>('/retail/combos', { status: 'ACTIVE' }, { enabled, staleTime: 60_000 });
  return useMemo(() => (Array.isArray(q.data) ? q.data : []).filter((c) => c.sellable !== false).map((c) => ({
    id: c.id,
    name: c.name,
    price: Number(c.comboPrice) || 0,
    image: c.imageUrl ?? undefined,
    sku: c.sku,
    barcode: c.barcode,
    featured: !!c.isFeatured,
    savings: Number(c.savingsAmount || 0),
    savingsPct: Number(c.savingsPercentage || 0),
    items: (c.items ?? []).map((i) => {
      const rate = Number(i.unit?.conversionRate) || 1;
      return { productId: i.productId, variantId: i.variantId ?? null, quantity: Number(i.quantity) * rate, originalPrice: (Number(i.originalPrice) || 0) / rate };
    }),
  })), [q.data]);
}

/** Active quick keys for this branch, in their order, grouped. */
export function useQuickKeys(shopId: string | null, enabled = true) {
  const q = useApiQuery<PosQuickKey[]>('/retail/quick-keys', shopId ? { shopId } : undefined, { enabled, staleTime: 60_000 });
  return useMemo(() => {
    const keys = (Array.isArray(q.data) ? q.data : []).filter((k) => k.isActive).sort((a, b) => a.position - b.position);
    const groups = new Map<string, PosQuickKey[]>();
    for (const k of keys) {
      const g = k.group || '';
      groups.set(g, [...(groups.get(g) ?? []), k]);
    }
    return { keys, groups: [...groups.entries()], loading: q.isLoading };
  }, [q.data, q.isLoading]);
}

export interface PosCategory { id: string; name: string; color?: string | null }

export function useCategories(): PosCategory[] {
  const { data = [] } = useOfflineList<{ id: string; name: string; color?: string | null; isActive?: boolean }>('category');
  return useMemo(() => data.filter((c) => c.isActive !== false), [data]);
}

/** Counter search: exact code first, then names; featured first when nothing is typed. */
export function useCatalog(query: string, categoryId: string | null, limit = 120) {
  return useProductSearch({ query: query.trim() || undefined, categoryId: categoryId || undefined, featuredFirst: true, limit });
}

/** Items sold most on this phone (featured fill the rest when there are few). */
export function useRecentItems(shopId: string | null, tick: number) {
  return useQuery({
    queryKey: ['offline', 'pos', 'recent', shopId, tick],
    queryFn: async () => {
      const ids = topRecent(12);
      const rows = await Promise.all(ids.map((id) => offline.products.get(id, shopId)));
      return rows.filter((p): p is NonNullable<typeof p> => !!p && p.isActive) as ProductRow[];
    },
    networkMode: 'always',
    staleTime: Infinity,
  });
}
