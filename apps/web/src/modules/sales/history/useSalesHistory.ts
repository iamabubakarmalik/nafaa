/**
 * Sales history state: filters, paged bills from the server, totals for the
 * whole filter, analytics, and bills still waiting offline on this device.
 */

import { useEffect, useMemo, useState } from 'react';
import { useInfiniteQuery, useQuery } from '@tanstack/react-query';
import { useBusinessDayStart } from '@core/lib/business-day';
import { getPendingAsSales, type PaymentMethod } from '@modules/sales/sales/api/sales.api';
import { salesHistoryApi, type HistoryFilters, type HistorySale, type HistorySort, type HistoryStatus } from './api';
import { presetRange, type DatePreset } from '@core/lib/dateRange';

export const HISTORY_KEY = 'sales-history';
const PREF_KEY = 'nafaa-sales-history';

function readPrefs(): { preset: DatePreset; sort: HistorySort } {
  try { return { preset: 'today', sort: 'new', ...JSON.parse(localStorage.getItem(PREF_KEY) || '{}') }; } catch { return { preset: 'today', sort: 'new' }; }
}

export function useSalesHistory() {
  const startHour = useBusinessDayStart();
  const saved = useMemo(readPrefs, []);
  const [preset, setPreset] = useState<DatePreset>(saved.preset);
  const [custom, setCustom] = useState({ from: '', to: '' });
  const [method, setMethod] = useState<PaymentMethod | undefined>();
  const [status, setStatus] = useState<HistoryStatus>('all');
  const [staffId, setStaffId] = useState<string | undefined>();
  const [source, setSource] = useState<string | undefined>();
  const [sort, setSort] = useState<HistorySort>(saved.sort);
  const [search, setSearch] = useState('');
  const [query, setQuery] = useState('');
  useEffect(() => { const t = setTimeout(() => setQuery(search), 300); return () => clearTimeout(t); }, [search]);
  useEffect(() => { try { localStorage.setItem(PREF_KEY, JSON.stringify({ preset: preset === 'custom' ? 'today' : preset, sort })); } catch { /* */ } }, [preset, sort]);

  const range = presetRange(preset, startHour, custom);
  const filters: HistoryFilters = { ...range, method, status, staffId, source, search: query, sort };

  const list = useInfiniteQuery({
    queryKey: [HISTORY_KEY, 'list', filters],
    queryFn: ({ pageParam }) => salesHistoryApi.list(filters, pageParam, 50),
    initialPageParam: 1,
    getNextPageParam: (last) => (last.hasMore ? last.page + 1 : undefined),
    placeholderData: (prev) => prev,
    refetchInterval: 60_000,
  });

  // Offline bills only matter when today is in range and no narrowing filter is on.
  const today = presetRange('today', startHour).to;
  const showPending = range.to === today && !method && !staffId && !source && !query && (status === 'all' || status === 'active');
  const { data: pending = [] } = useQuery({
    queryKey: [HISTORY_KEY, 'pending'],
    queryFn: async () => (await getPendingAsSales()).map((s): HistorySale => ({
      id: s.id, saleNumber: s.saleNumber, soldAt: s.soldAt, status: 'COMPLETED', source: 'POS', sourceRef: null,
      subtotal: s.subtotal, discount: s.discount, total: s.total, paidAmount: s.paidAmount, creditAmount: s.creditAmount,
      changeAmount: s.changeAmount, refundedAmount: 0, paymentMethod: s.paymentMethod, costOfGoods: s.costOfGoods ?? 0,
      receivedByName: s.receivedByName ?? null, staff: s.createdBy?.fullName ?? null,
      customer: s.customer ? { id: s.customer.id, name: s.customer.name, phone: s.customer.phone ?? null } : null,
      shop: s.shop ? { id: s.shop.id, name: s.shop.name } : null,
      items: (s.items ?? []).map((it: any) => ({
        id: it.id, productId: it.productId ?? null, name: it.product?.name ?? 'Item', variant: null, unit: it.product?.unit ?? 'pcs',
        barcode: null, quantity: Number(it.quantity), returnedQty: 0, price: Number(it.price ?? 0), total: Number(it.total ?? 0),
      })),
      pending: true,
    })),
    enabled: showPending,
    refetchInterval: 15_000,
  });

  const sales = useMemo(() => {
    const server = list.data?.pages.flatMap((p) => p.items) ?? [];
    return showPending ? [...pending, ...server] : server;
  }, [list.data, pending, showPending]);

  const first = list.data?.pages[0];

  return {
    preset, setPreset, custom, setCustom, method, setMethod, status, setStatus, staffId, setStaffId, source, setSource,
    sort, setSort, search, setSearch, filters, range, startHour,
    sales, stats: first?.stats, count: first?.count ?? 0, pendingCount: showPending ? pending.length : 0,
    loading: list.isLoading, fetching: list.isFetching, hasMore: !!list.hasNextPage, loadMore: () => list.fetchNextPage(),
    loadingMore: list.isFetchingNextPage, refetch: list.refetch,
    clear: () => { setMethod(undefined); setStatus('all'); setStaffId(undefined); setSource(undefined); setSearch(''); },
    hasFilters: !!method || status !== 'all' || !!staffId || !!source || !!query,
  };
}

export function useSalesAnalytics(filters: HistoryFilters, enabled: boolean) {
  return useQuery({
    queryKey: [HISTORY_KEY, 'analytics', filters],
    queryFn: () => salesHistoryApi.analytics(filters),
    enabled,
    staleTime: 60_000,
    placeholderData: (prev) => prev,
  });
}
