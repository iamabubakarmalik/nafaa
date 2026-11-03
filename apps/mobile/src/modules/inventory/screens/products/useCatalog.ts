/**
 * Products list state (same as the web useCatalog): filters, paged products
 * from the server (or the phone when offline), whole-catalog totals and
 * facets, the chosen sort, and the current selection. The sort is kept on
 * the phone.
 */

import { useInfiniteQuery, useQuery } from '@tanstack/react-query';
import { useMemo, useState } from 'react';
import { kv } from '@/core/storage/kv';
import { useDebouncedValue } from '@/design';
import { catalogApi, type CatalogFilters, type CatalogSort, type CatalogStock } from '../../api/catalog';
import { INV } from '../../lib/shared';

const PREF_KEY = 'nafaa.inv.products-prefs';
const EMPTY: Omit<CatalogFilters, 'sort'> = { stock: 'all', active: 'active' };

export function useCatalog(initial?: Pick<CatalogFilters, 'categoryId' | 'brandId' | 'tagId' | 'noCost' | 'stock'>) {
  const [sort, setSortRaw] = useState<CatalogSort>(() => kv.get<{ sort?: CatalogSort }>(PREF_KEY, {}).sort ?? 'name');
  const [f, setF] = useState<Omit<CatalogFilters, 'sort' | 'search'>>(() => ({ ...EMPTY, ...initial }));
  const [search, setSearch] = useState('');
  const query = useDebouncedValue(search, 250);
  const [selected, setSelected] = useState<Set<string>>(new Set());

  const filters: CatalogFilters = { ...f, search: query, sort };
  const list = useInfiniteQuery({
    queryKey: [INV, 'catalog', filters],
    queryFn: ({ pageParam }) => catalogApi.list(filters, pageParam, 40),
    initialPageParam: 1,
    getNextPageParam: (last) => (last.hasMore ? last.page + 1 : undefined),
    placeholderData: (prev) => prev,
  });
  const first = list.data?.pages[0];
  const items = useMemo(() => list.data?.pages.flatMap((p) => p.items) ?? [], [list.data]);

  const set = <K extends keyof typeof f>(key: K, value: (typeof f)[K]) => { setF((cur) => ({ ...cur, [key]: value })); setSelected(new Set()); };
  const hasFilters = !!query || f.stock !== 'all' || f.active !== 'active' || !!f.categoryId || !!f.brandId || !!f.featured
    || !!f.tagId || !!f.condition || !!f.etype || !!f.serial || !!f.kind || !!f.kindOf || !!f.noCost;
  const moreFilters = [f.active !== 'active', !!f.categoryId, !!f.brandId, !!f.featured, !!f.tagId, !!f.condition, !!f.etype, !!f.serial, !!f.kind, !!f.kindOf, !!f.noCost].filter(Boolean).length;

  return {
    filters, f, set, search, setSearch, sort,
    setSort: (s: CatalogSort) => { setSortRaw(s); kv.set(PREF_KEY, { sort: s }); },
    setStock: (s: CatalogStock) => set('stock', s),
    clear: () => { setF(EMPTY); setSearch(''); setSelected(new Set()); },
    hasFilters, moreFilters,
    data: first, items, count: first?.count ?? 0, offline: !!first?.offline,
    loading: list.isLoading, fetching: list.isFetching, refetching: list.isRefetching && !list.isFetchingNextPage, error: list.error,
    hasMore: !!list.hasNextPage, loadMore: () => { if (list.hasNextPage && !list.isFetchingNextPage) void list.fetchNextPage(); },
    loadingMore: list.isFetchingNextPage,
    refetch: list.refetch,
    selected, setSelected,
    toggle: (id: string) => setSelected((cur) => { const n = new Set(cur); if (n.has(id)) n.delete(id); else n.add(id); return n; }),
  };
}

export function useCatalogAnalytics(enabled: boolean) {
  return useQuery({ queryKey: [INV, 'catalog-analytics'], queryFn: catalogApi.analytics, enabled, staleTime: 60_000 });
}

/** Every product for the filter (export and print), page by page. */
export async function fetchAllProducts(f: CatalogFilters, max = 5000) {
  const out = [];
  let page = 1;
  let stats;
  for (;;) {
    const r = await catalogApi.list(f, page, 200);
    stats ??= r.stats;
    out.push(...r.items);
    if (!r.hasMore || out.length >= max) break;
    page++;
  }
  return { items: out, stats };
}
