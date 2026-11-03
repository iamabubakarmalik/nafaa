/**
 * Sales history state: filters, a page at a time from the server with totals
 * for the whole filter, bills still waiting on this phone on top, and the
 * phone's own copy (last 30 days) when there is no internet and nothing
 * was loaded before.
 */

import { useInfiniteQuery } from '@tanstack/react-query';
import { useMemo, useState } from 'react';
import { businessDayKey } from '@/core/format';
import { useOnlineStatus } from '@/core/net';
import { useSalesHistory as useMirrorSales } from '@/core/offline';
import { useDebouncedValue } from '@/design';
import { rowToHistorySale, salesHistoryApi, type BillTier, type HistoryFilters, type HistorySale, type HistorySort, type HistoryStats, type HistoryStatus } from '../api/history';
import { usePeriod, type PeriodPreset } from './period';

export const HISTORY_KEY = 'sales-history';

const EMPTY_STATS: HistoryStats = {
  bills: 0, voided: 0, creditCount: 0, total: 0, paid: 0, credit: 0, discount: 0, change: 0, refunded: 0, cogs: 0, profit: 0, margin: 0, average: 0, lines: 0, qty: 0, best: null,
};

/** Totals for the phone's copy of the bills (no cost, so no profit). */
function localStats(rows: HistorySale[]): HistoryStats {
  const live = rows.filter((s) => s.status !== 'VOIDED');
  const total = live.reduce((a, s) => a + s.total, 0);
  const best = live.reduce<HistorySale | null>((b, s) => (!b || s.total > b.total ? s : b), null);
  return {
    ...EMPTY_STATS,
    bills: live.length, voided: rows.length - live.length, creditCount: live.filter((s) => s.creditAmount > 0).length,
    total, paid: live.reduce((a, s) => a + s.paidAmount, 0), credit: live.reduce((a, s) => a + s.creditAmount, 0),
    discount: live.reduce((a, s) => a + s.discount, 0), change: live.reduce((a, s) => a + s.changeAmount, 0),
    average: live.length ? total / live.length : 0, qty: live.reduce((a, s) => a + s.items.reduce((q, i) => q + i.quantity, 0), 0),
    lines: live.reduce((a, s) => a + s.items.length, 0),
    best: best ? { id: best.id, saleNumber: best.saleNumber, total: best.total, soldAt: best.soldAt } : null,
  };
}

function matches(s: HistorySale, f: HistoryFilters, startHour: number): boolean {
  const day = businessDayKey(s.soldAt, startHour);
  if (f.from !== 'all' && day < f.from) return false;
  if (day > f.to) return false;
  if (f.method && !(s.payments?.length ? s.payments.some((p) => p.method === f.method) : s.paymentMethod === f.method)) return false;
  if (f.customerId && s.customer?.id !== f.customerId) return false;
  if (f.status === 'active' && s.status === 'VOIDED') return false;
  if (f.status === 'credit' && !(s.creditAmount > 0 && s.status !== 'VOIDED')) return false;
  if (f.status === 'returned' && !(s.status === 'PARTIALLY_RETURNED' || s.status === 'FULLY_RETURNED')) return false;
  if (f.status === 'voided' && s.status !== 'VOIDED') return false;
  const q = f.search?.trim().toLowerCase();
  if (q && !(s.saleNumber.toLowerCase().includes(q) || (s.customer?.name ?? '').toLowerCase().includes(q) || s.items.some((i) => i.name.toLowerCase().includes(q)))) return false;
  return true;
}

const SORT: Record<HistorySort, (a: HistorySale, b: HistorySale) => number> = {
  new: (a, b) => b.soldAt.localeCompare(a.soldAt),
  old: (a, b) => a.soldAt.localeCompare(b.soldAt),
  high: (a, b) => b.total - a.total,
  low: (a, b) => a.total - b.total,
};

export function useHistory(initialPreset: PeriodPreset = 'today', fixed: { customerId?: string; search?: string } = {}) {
  const online = useOnlineStatus();
  const { preset, setPreset, custom, setCustom, period, startHour, label } = usePeriod(fixed.search ? 'all' : initialPreset);
  const [method, setMethod] = useState<string | undefined>();
  const [status, setStatus] = useState<HistoryStatus>('all');
  const [staffId, setStaffId] = useState<string | undefined>();
  const [tier, setTier] = useState<BillTier | undefined>();
  const [sort, setSort] = useState<HistorySort>('new');
  const [search, setSearch] = useState(fixed.search ?? '');
  const query = useDebouncedValue(search.trim(), 250);
  const filters: HistoryFilters = { ...period, method, status, staffId, tier, sort, search: query, customerId: fixed.customerId };

  const list = useInfiniteQuery({
    queryKey: [HISTORY_KEY, 'list', filters],
    queryFn: ({ pageParam }) => salesHistoryApi.list(filters, pageParam, 30),
    initialPageParam: 1,
    getNextPageParam: (last) => (last.hasMore ? last.page + 1 : undefined),
    placeholderData: (prev) => prev,
  });
  const first = list.data?.pages[0];

  const today = businessDayKey(Date.now(), startHour);
  const narrowing = !!(method || staffId || tier || query || fixed.customerId) || !(status === 'all' || status === 'active');
  const showPending = period.to === today && !narrowing;
  const waiting = useMirrorSales({ pendingOnly: true });
  const pending = useMemo(() => (showPending ? (waiting.data ?? []).map(rowToHistorySale) : []), [showPending, waiting.data]);

  // The phone's own copy, used only when the server gave nothing (offline, first open).
  const useLocal = !first && (!online || !!list.error);
  const mirror = useMirrorSales(useLocal ? { query: query || undefined, limit: 400 } : { limit: 1 });
  const local = useMemo(() => {
    if (!useLocal) return [] as HistorySale[];
    return (mirror.data ?? []).map(rowToHistorySale).filter((s) => matches(s, filters, startHour)).sort(SORT[sort]);
  }, [useLocal, mirror.data, filters, startHour, sort]); // eslint-disable-line react-hooks/exhaustive-deps

  const server = useMemo(() => list.data?.pages.flatMap((p) => p.items) ?? [], [list.data]);
  const sales = useMemo(() => {
    const body = useLocal ? local.filter((s) => !s.pending) : server;
    const ids = new Set(body.map((s) => s.id));
    return [...pending.filter((s) => !ids.has(s.id)), ...body];
  }, [useLocal, local, server, pending]);

  const hasFilters = !!(method || status !== 'all' || staffId || tier || query);
  return {
    preset, setPreset, custom, setCustom, period, startHour, label,
    method, setMethod, status, setStatus, staffId, setStaffId, tier, setTier, sort, setSort, search, setSearch, filters,
    sales, pendingCount: pending.length,
    stats: first?.stats ?? (useLocal ? localStats(local) : undefined),
    tiers: first?.tiers ?? null, count: first?.count ?? local.length, fromPhone: useLocal,
    loading: list.isLoading && !useLocal, error: !first && !useLocal ? list.error : null,
    refreshing: list.isRefetching && !list.isFetchingNextPage, refetch: list.refetch,
    hasMore: !!list.hasNextPage, loadMore: () => { if (list.hasNextPage && !list.isFetchingNextPage) void list.fetchNextPage(); }, loadingMore: list.isFetchingNextPage,
    hasFilters,
    clear: () => { setMethod(undefined); setStatus('all'); setStaffId(undefined); setTier(undefined); setSearch(''); },
  };
}
