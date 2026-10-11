/**
 * Meat-shop numbers for the dashboard: weight orders in progress, livestock
 * on hand, cutting jobs, halal compliance and subscription deliveries.
 * Every meat widget calls this; React Query shares the requests.
 */

import { useMemo } from 'react';
import { useQuery } from '@tanstack/react-query';
import { meatDashboardApi } from '../api/dashboard.api';
import { liveAnimalsApi } from '../api/live-animals.api';
import { slaughterApi } from '../api/slaughter.api';
import { weightOrdersApi, type WeightOrder } from '../api/weight-orders.api';
import { cuttingJobsApi, type CuttingJob } from '../api/cutting-jobs.api';
import type { Subscription } from '../api/subscriptions.api';

const MINUTE = 60_000;
const n = (v: unknown) => Number(v || 0);

/** Hours from now until `iso`; negative when already past. */
const hoursTo = (iso?: string | null) => (iso ? (new Date(iso).getTime() - Date.now()) / 3_600_000 : null);

/** Shape of GET /meat/dashboard/overview. Prisma decimals may arrive as strings. */
interface MeatOverview {
  totals?: { liveAnimals?: number; totalProducts?: number; activeSubscriptions?: number; activeQurbani?: number; wholesaleAccounts?: number };
  operations?: { todayOrders?: number; pendingOrders?: number; upcomingDeliveries?: number };
  revenue?: { today?: number | string; monthly?: number | string; collected?: number | string };
  halalCompliance?: { total?: number; halal?: number; pct?: number };
  upcomingSubs?: Subscription[];
}

interface LiveSummary {
  aliveCount?: number;
  totalCost?: { _sum?: { purchasePrice?: number | string | null; totalFeedCost?: number | string | null } };
  byType?: Array<{ animalType: string; _count?: { _all?: number }; _sum?: { weightKg?: number | string | null } }>;
}

interface HalalStats { total?: number; halal?: number; halalPct?: number; withCert?: number; withVet?: number }

const OPEN: WeightOrder['status'][] = ['CONFIRMED', 'PROCESSING', 'CUTTING', 'PACKED', 'READY', 'OUT_FOR_DELIVERY'];

export const ANIMAL_LABEL: Record<string, string> = {
  BEEF: 'Gaye', MUTTON: 'Bakra', GOAT: 'Bakri', LAMB: 'Dumba', CHICKEN: 'Murgi', DUCK: 'Batakh', TURKEY: 'Turkey',
  QUAIL: 'Bater', CAMEL: 'Oont', BUFFALO: 'Bhains', FISH: 'Machhli', PRAWN: 'Jhinga', OTHER: 'Deegar',
};

export function useMeatOps() {
  const overview = useQuery({
    queryKey: ['meat-dashboard'],
    queryFn: () => meatDashboardApi.overview().catch(() => ({})) as Promise<MeatOverview>,
    refetchInterval: MINUTE,
  });
  const live = useQuery({
    queryKey: ['live-animals-summary'],
    queryFn: () => liveAnimalsApi.summary().catch(() => ({})) as Promise<LiveSummary>,
    refetchInterval: MINUTE,
  });
  const halalQ = useQuery({
    queryKey: ['halal-compliance'],
    queryFn: () => slaughterApi.halalCompliance().catch(() => ({})) as Promise<HalalStats>,
    refetchInterval: 5 * MINUTE,
  });
  // Same keys as the orders and cutting pages, so their updates refresh these.
  const ordersQ = useQuery({
    queryKey: ['weight-orders', 'all', ''],
    queryFn: () => weightOrdersApi.list({}).catch(() => [] as WeightOrder[]),
    refetchInterval: MINUTE,
  });
  const cuttingQ = useQuery({
    queryKey: ['cutting-jobs', 'IN_PROGRESS'],
    queryFn: () => cuttingJobsApi.list({ status: 'IN_PROGRESS' }).catch(() => [] as CuttingJob[]),
    refetchInterval: MINUTE,
  });

  const o = overview.data ?? {};

  const orders = useMemo(() => {
    const open = (Array.isArray(ordersQ.data) ? ordersQ.data : [])
      .filter((w) => OPEN.includes(w.status))
      .map((w) => ({
        ...w,
        left: hoursTo(w.neededBy || w.scheduledDelivery),
        due: Math.max(n(w.total) - n(w.paidAmount), 0),
        kg: (w.items ?? []).reduce((s, i) => s + n(i.actualKg ?? i.requestedKg), 0),
      }));
    return {
      open,
      late: open.filter((w) => w.left !== null && w.left < 0 && w.status !== 'OUT_FOR_DELIVERY'),
      ready: open.filter((w) => w.status === 'READY'),
      today: open.filter((w) => w.left !== null && w.left >= 0 && w.left <= 24),
      due: open.reduce((s, w) => s + w.due, 0),
      list: [...open].sort((a, b) => (a.left ?? 99_999) - (b.left ?? 99_999)).slice(0, 6),
      todayCount: n(o.operations?.todayOrders),
      onRoad: n(o.operations?.upcomingDeliveries),
    };
  }, [ordersQ.data, o.operations]);

  const livestock = useMemo(() => {
    const d = live.data ?? {};
    const types = (d.byType ?? []).map((t) => ({
      type: t.animalType, label: ANIMAL_LABEL[t.animalType] ?? t.animalType, count: n(t._count?._all), kg: n(t._sum?.weightKg),
    })).sort((a, b) => b.count - a.count);
    const purchase = n(d.totalCost?._sum?.purchasePrice);
    const feed = n(d.totalCost?._sum?.totalFeedCost);
    return {
      alive: n(d.aliveCount ?? o.totals?.liveAnimals),
      kg: types.reduce((s, t) => s + t.kg, 0),
      purchase,
      feed,
      invested: purchase + feed,
      types,
    };
  }, [live.data, o.totals?.liveAnimals]);

  const halal = useMemo(() => {
    const h = o.halalCompliance ?? {};
    const all = halalQ.data ?? {};
    const total = n(h.total);
    return {
      total,
      halal: n(h.halal),
      pct: total > 0 ? n(h.pct) : 100,
      withCert: n(all.withCert),
      withVet: n(all.withVet),
      allTime: n(all.total),
    };
  }, [o.halalCompliance, halalQ.data]);

  const subs = useMemo(() => {
    const list = (o.upcomingSubs ?? []).map((s) => ({ ...s, left: hoursTo(s.nextDeliveryDate) }));
    return {
      active: n(o.totals?.activeSubscriptions),
      list,
      today: list.filter((s) => s.left !== null && s.left <= 24),
    };
  }, [o.upcomingSubs, o.totals?.activeSubscriptions]);

  const cutting = useMemo(() => {
    const jobs = (Array.isArray(cuttingQ.data) ? cuttingQ.data : []).filter((j) => j.status !== 'COMPLETED');
    return { open: jobs.length, kg: jobs.reduce((s, j) => s + n(j.inputWeightKg), 0) };
  }, [cuttingQ.data]);

  const revenue = useMemo(() => {
    const monthly = n(o.revenue?.monthly);
    const collected = n(o.revenue?.collected);
    return { today: n(o.revenue?.today), monthly, collected, outstanding: Math.max(monthly - collected, 0) };
  }, [o.revenue]);

  return {
    orders, livestock, halal, subs, cutting, revenue,
    totals: { qurbani: n(o.totals?.activeQurbani), wholesale: n(o.totals?.wholesaleAccounts), products: n(o.totals?.totalProducts) },
    loading: overview.isLoading,
  };
}
