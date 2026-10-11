/**
 * Florist numbers for the dashboard: today's deliveries, wedding bookings,
 * flowers about to wilt and subscription bouquets due. Every florist widget
 * calls this; React Query shares the request.
 */

import { useMemo } from 'react';
import { useQuery } from '@tanstack/react-query';
import { floristDashboardApi } from '../api/dashboard.api';
import type { FloristOrder } from '../api/orders.api';
import type { WeddingContract } from '../api/wedding-contracts.api';
import type { FloristSubscription } from '../api/subscriptions.api';
import type { FloristProductProfile } from '../api/products.api';

const MINUTE = 60_000;
const DAY = 86_400_000;
const n = (v: unknown) => Number(v || 0);

/** Days from now until `iso`, rounded up; negative when already past. */
const daysTo = (iso?: string | null) => (iso ? Math.ceil((new Date(iso).getTime() - Date.now()) / DAY) : null);

/** Shape of GET /florist/dashboard/overview. Prisma decimals may arrive as strings. */
interface FloristOverview {
  totals?: {
    totalProducts?: number; activeOrders?: number; deliveredToday?: number;
    activeSubscriptions?: number; upcomingWeddings?: number; witheringSoon?: number;
  };
  monthly?: {
    orders?: { count?: number; revenue?: number | string; collected?: number | string };
    weddings?: { count?: number; revenue?: number | string; collected?: number | string };
  };
  todayScheduledDeliveries?: FloristOrder[];
  upcomingWeddingList?: WeddingContract[];
  dueSubscriptions?: FloristSubscription[];
  witheringProducts?: FloristProductProfile[];
}

export const flowerName = (p: Pick<FloristProductProfile, 'flowerType' | 'categoryType'> & { product?: { name?: string } }) =>
  p.product?.name || p.flowerType || p.categoryType?.replace(/_/g, ' ').toLowerCase() || 'Phool';

export function useFloristOps() {
  const overview = useQuery({
    queryKey: ['florist-dashboard-overview'],
    queryFn: () => floristDashboardApi.overview().catch(() => ({})) as Promise<FloristOverview>,
    refetchInterval: MINUTE,
  });
  const o = overview.data ?? {};

  const deliveries = useMemo(() => {
    const list = o.todayScheduledDeliveries ?? [];
    return {
      list,
      pending: list.length,
      out: list.filter((d) => d.status === 'OUT_FOR_DELIVERY').length,
      notReady: list.filter((d) => d.status === 'CONFIRMED' || d.status === 'IN_PREPARATION').length,
      delivered: n(o.totals?.deliveredToday),
      value: list.reduce((s, d) => s + n(d.totalAmount), 0),
    };
  }, [o.todayScheduledDeliveries, o.totals?.deliveredToday]);

  const weddings = useMemo(() => {
    const list = (o.upcomingWeddingList ?? []).map((w) => ({
      ...w, days: daysTo(w.weddingDate) ?? 0, balance: Math.max(n(w.quotedAmount) - n(w.advanceAmount), 0),
    }));
    return {
      list,
      count: n(o.totals?.upcomingWeddings) || list.length,
      thisWeek: list.filter((w) => w.days <= 7),
      soon: list.filter((w) => w.days <= 3),
      unconfirmed: list.filter((w) => w.status === 'QUOTED'),
      balance: list.reduce((s, w) => s + w.balance, 0),
    };
  }, [o.upcomingWeddingList, o.totals?.upcomingWeddings]);

  const wilting = useMemo(() => {
    const list = (o.witheringProducts ?? []).map((p) => ({ ...p, days: daysTo(p.freshUntil) }));
    return {
      list,
      withered: list.filter((p) => p.days !== null && p.days <= 0),
      soon: n(o.totals?.witheringSoon),
    };
  }, [o.witheringProducts, o.totals?.witheringSoon]);

  const subs = useMemo(() => {
    const list = (o.dueSubscriptions ?? []).map((s) => ({ ...s, days: daysTo(s.nextDeliveryDate) }));
    return {
      list,
      active: n(o.totals?.activeSubscriptions),
      today: list.filter((s) => s.days !== null && s.days <= 1),
    };
  }, [o.dueSubscriptions, o.totals?.activeSubscriptions]);

  const month = useMemo(() => ({
    orders: n(o.monthly?.orders?.count),
    orderRevenue: n(o.monthly?.orders?.revenue),
    weddings: n(o.monthly?.weddings?.count),
    weddingRevenue: n(o.monthly?.weddings?.revenue),
    weddingAdvance: n(o.monthly?.weddings?.collected),
  }), [o.monthly]);

  return {
    deliveries, weddings, wilting, subs, month,
    activeOrders: n(o.totals?.activeOrders),
    loading: overview.isLoading,
  };
}
