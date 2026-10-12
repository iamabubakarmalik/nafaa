/**
 * Customer directory state shared by the customers and khata pages:
 * filters, paged customers from the server, whole-list totals, view and
 * selection, and one refresh for everything that shows customers.
 */

import { useEffect, useMemo, useState } from 'react';
import { useInfiniteQuery, useQueryClient } from '@tanstack/react-query';
import { directoryApi, type DirectoryFilters } from './api';

export const DIRECTORY_KEY = 'customer-directory';

type View = 'grid' | 'table';

export function useDirectory(initial: Omit<DirectoryFilters, 'search'>, prefKey: string) {
  const qc = useQueryClient();
  const saved = useMemo(() => {
    try { return JSON.parse(localStorage.getItem(prefKey) || '{}') as { view?: View; sort?: DirectoryFilters['sort'] }; } catch { return {}; }
  }, [prefKey]);
  const [view, setView] = useState<View>(saved.view ?? 'grid');
  const [f, setF] = useState<Omit<DirectoryFilters, 'search'>>({ ...initial, sort: saved.sort ?? initial.sort });
  const [search, setSearch] = useState('');
  const [query, setQuery] = useState('');
  const [selected, setSelected] = useState<Set<string>>(new Set());
  useEffect(() => { const t = setTimeout(() => setQuery(search), 250); return () => clearTimeout(t); }, [search]);
  useEffect(() => { try { localStorage.setItem(prefKey, JSON.stringify({ view, sort: f.sort })); } catch { /* storage blocked */ } }, [view, f.sort, prefKey]);

  const filters: DirectoryFilters = { ...f, search: query };
  const list = useInfiniteQuery({
    queryKey: [DIRECTORY_KEY, filters],
    queryFn: ({ pageParam }) => directoryApi.list(filters, pageParam, 48),
    initialPageParam: 1,
    getNextPageParam: (last) => (last.hasMore ? last.page + 1 : undefined),
    placeholderData: (prev) => prev,
  });
  const first = list.data?.pages[0];
  const items = useMemo(() => list.data?.pages.flatMap((p) => p.items) ?? [], [list.data]);

  const set = <K extends keyof typeof f>(key: K, value: (typeof f)[K]) => { setF((cur) => ({ ...cur, [key]: value })); setSelected(new Set()); };
  const hasFilters = !!query || f.type !== initial.type || f.activity !== initial.activity || f.status !== initial.status
    || !!f.city || !!f.birthday || !!f.aging || (f.scope ?? 'branch') !== (initial.scope ?? 'branch');

  return {
    filters, f, set, search, setSearch, view, setView, hasFilters,
    clear: () => { setF({ ...initial, sort: f.sort }); setSearch(''); setSelected(new Set()); },
    data: first, items, count: first?.count ?? 0,
    loading: list.isLoading, fetching: list.isFetching, error: list.error,
    hasMore: !!list.hasNextPage, loadMore: () => list.fetchNextPage(), loadingMore: list.isFetchingNextPage,
    selected, setSelected,
    toggle: (id: string) => setSelected((cur) => { const n = new Set(cur); if (n.has(id)) n.delete(id); else n.add(id); return n; }),
    refresh: () => ['customers', 'customers-stats', 'customer', 'customers-for-pos', 'customer-insights', 'customer-ledger', 'khata-customers', 'khata-ledger', DIRECTORY_KEY]
      .forEach((k) => qc.invalidateQueries({ queryKey: [k] })),
  };
}
