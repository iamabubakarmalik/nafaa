/**
 * Products page state: filters, paged products from the server, whole-catalog
 * totals and facets, the chosen view, and the current selection.
 */

import { useEffect, useMemo, useState } from 'react';
import { useInfiniteQuery, useQuery, useQueryClient } from '@tanstack/react-query';
import { forceRefreshProducts } from '@core/lib/offline/offlineProducts';
import { catalogApi, type CatalogFilters, type CatalogSort, type CatalogStock } from './api';

export const CATALOG_KEY = 'product-catalog';
const PREF_KEY = 'nafaa-products';

type View = 'grid' | 'table';
interface Prefs { view: View; sort: CatalogSort }

function readPrefs(): Prefs {
  try { return { view: 'grid', sort: 'name', ...JSON.parse(localStorage.getItem(PREF_KEY) || '{}') }; } catch { return { view: 'grid', sort: 'name' }; }
}

const EMPTY: Omit<CatalogFilters, 'sort'> = { stock: 'all', active: 'active' };

/** `initial` sets the first filters, e.g. from a link like /products?categoryId=… */
export function useCatalog(initial?: Pick<CatalogFilters, 'categoryId' | 'brandId' | 'tagId'>) {
  const qc = useQueryClient();
  const saved = useMemo(readPrefs, []);
  const [view, setView] = useState<View>(saved.view);
  const [sort, setSort] = useState<CatalogSort>(saved.sort);
  const [f, setF] = useState<Omit<CatalogFilters, 'sort' | 'search'>>(() => ({ ...EMPTY, ...initial }));
  const [search, setSearch] = useState('');
  const [query, setQuery] = useState('');
  const [selected, setSelected] = useState<Set<string>>(new Set());
  useEffect(() => { const t = setTimeout(() => setQuery(search), 250); return () => clearTimeout(t); }, [search]);
  useEffect(() => { try { localStorage.setItem(PREF_KEY, JSON.stringify({ view, sort })); } catch { /* storage blocked */ } }, [view, sort]);

  const filters: CatalogFilters = { ...f, search: query, sort };
  const list = useInfiniteQuery({
    queryKey: [CATALOG_KEY, 'list', filters],
    queryFn: ({ pageParam }) => catalogApi.list(filters, pageParam, 48),
    initialPageParam: 1,
    getNextPageParam: (last) => (last.hasMore ? last.page + 1 : undefined),
    placeholderData: (prev) => prev,
  });
  const first = list.data?.pages[0];
  const items = useMemo(() => list.data?.pages.flatMap((p) => p.items) ?? [], [list.data]);

  const set = <K extends keyof typeof f>(key: K, value: (typeof f)[K]) => { setF((cur) => ({ ...cur, [key]: value })); setSelected(new Set()); };
  const hasFilters = !!query || f.stock !== 'all' || f.active !== 'active' || !!f.categoryId || !!f.brandId || !!f.featured
    || !!f.tagId || !!f.condition || !!f.etype || !!f.serial || !!f.kind;

  return {
    filters, f, set, search, setSearch, sort, setSort, view, setView,
    setStock: (s: CatalogStock) => set('stock', s),
    clear: () => { setF(EMPTY); setSearch(''); setSelected(new Set()); },
    hasFilters,
    data: first, items, count: first?.count ?? 0, offline: !!first?.offline,
    loading: list.isLoading, fetching: list.isFetching, error: list.error,
    hasMore: !!list.hasNextPage, loadMore: () => list.fetchNextPage(), loadingMore: list.isFetchingNextPage,
    selected, setSelected,
    toggle: (id: string) => setSelected((cur) => { const n = new Set(cur); if (n.has(id)) n.delete(id); else n.add(id); return n; }),
    /** Refetch the page and every other place that shows products. */
    refresh: async () => {
      ['products', 'product', 'products-for-pos', 'retail-products', 'bakery-all-products', 'electronics-products-list', 'dashboard-lists']
        .forEach((k) => qc.invalidateQueries({ queryKey: [k] }));
      await qc.invalidateQueries({ queryKey: [CATALOG_KEY] });
      void forceRefreshProducts().catch(() => undefined);
    },
  };
}

export function useCatalogAnalytics(enabled: boolean) {
  return useQuery({ queryKey: [CATALOG_KEY, 'analytics'], queryFn: catalogApi.analytics, enabled, staleTime: 60_000 });
}
