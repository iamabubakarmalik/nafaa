/**
 * Customer directory state: whole-list search, filters and sort done by the
 * server (so counts and totals cover every customer), a page at a time.
 * With no internet and nothing loaded before, the phone's own copy is used;
 * customers saved on the phone and not sent yet show on top.
 */

import { useInfiniteQuery } from '@tanstack/react-query';
import { useMemo, useState } from 'react';
import { useOnlineStatus } from '@/core/net';
import { useCustomerSearch } from '@/core/offline';
import { usePendingCustomers } from './usePending';
import { useDebouncedValue } from '@/design';
import { customersApi, type DirectoryCustomer, type DirectoryFilters, type DirectoryPage } from '../api/customers';
import { buildLocalDirectory, rowToDirectory } from './localDirectory';

export const DIRECTORY_KEY = 'customers-directory';

export function useDirectory(initial: Partial<DirectoryFilters> = {}) {
  const online = useOnlineStatus();
  const [f, setF] = useState<DirectoryFilters>({ status: 'active', type: 'all', activity: 'all', sort: 'recent', ...initial });
  const [search, setSearch] = useState('');
  const query = useDebouncedValue(search.trim(), 250);
  const filters: DirectoryFilters = { ...f, search: query || undefined };

  const list = useInfiniteQuery({
    queryKey: [DIRECTORY_KEY, filters],
    queryFn: ({ pageParam }) => customersApi.directory(filters, pageParam, 40),
    initialPageParam: 1,
    getNextPageParam: (last: DirectoryPage) => (last.hasMore ? last.page + 1 : undefined),
    placeholderData: (prev) => prev,
  });
  const first = list.data?.pages[0];
  const useLocal = !first && (!online || !!list.error);

  const mirror = useCustomerSearch({ query: query || undefined, limit: useLocal ? 5000 : 40 });
  const local = useMemo(() => (useLocal ? buildLocalDirectory(mirror.data ?? [], filters, 1, 5000) : null),
    [useLocal, mirror.data, filters]); // eslint-disable-line react-hooks/exhaustive-deps

  // Customers made on this phone and not on the server yet.
  const pendingAll = usePendingCustomers();
  const pendingRows = useMemo<DirectoryCustomer[]>(() => {
    if (useLocal || f.type === 'vip' || f.type === 'advance' || f.type === 'overLimit' || f.status === 'inactive') return [];
    const q = query.toLowerCase();
    return pendingAll.filter((c) => !q || c.name.toLowerCase().includes(q) || (c.phone ?? '').includes(q)).map(rowToDirectory);
  }, [useLocal, pendingAll, f.type, f.status, query]);

  const server = useMemo(() => list.data?.pages.flatMap((p) => p.items) ?? [], [list.data]);
  const items = useMemo(() => {
    const body = local ? local.items : server;
    const ids = new Set(body.map((c) => c.id));
    return [...pendingRows.filter((c) => !ids.has(c.id)), ...body];
  }, [local, server, pendingRows]);
  const data = first ?? local ?? undefined;

  const set = <K extends keyof DirectoryFilters>(k: K, v: DirectoryFilters[K]) => setF((x) => ({ ...x, [k]: v }));
  const hasFilters = f.activity !== 'all' || !!f.city || !!f.birthday || f.status !== 'active' || f.scope === 'all' || !!query || !!f.aging;
  return {
    f, set, search, setSearch, filters, items, data, offline: !!local, listQuery: list,
    loading: list.isLoading && !useLocal, error: !first && !useLocal ? list.error : null, refreshing: list.isRefetching && !list.isFetchingNextPage,
    refetch: list.refetch, hasMore: !!list.hasNextPage, loadingMore: list.isFetchingNextPage,
    loadMore: () => { if (list.hasNextPage && !list.isFetchingNextPage) void list.fetchNextPage(); },
    hasFilters, count: data?.count ?? 0,
    clear: () => { setF((x) => ({ ...x, activity: 'all', city: undefined, birthday: undefined, status: 'active', scope: undefined, aging: undefined })); setSearch(''); },
  };
}
