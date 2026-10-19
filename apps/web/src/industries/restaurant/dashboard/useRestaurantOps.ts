/**
 * Restaurant's own numbers for the dashboard: open orders, the table floor,
 * the kitchen queue and today's tips. Every restaurant widget calls this;
 * React Query shares the requests between them.
 */

import { useMemo } from 'react';
import { useQuery } from '@tanstack/react-query';
import { tablesApi, type FloorTable } from '../api/tables.api';
import { ordersApi, type OrderMode, type OrderStatus, type RestaurantOrder } from '../api/orders.api';
import { kotApi } from '../api/kot.api';
import { restaurantDashboardApi } from '../api/dashboard.api';

const SECOND = 1_000;
const MINUTE = 60 * SECOND;

/** Statuses the kitchen is still working on. */
const IN_KITCHEN: OrderStatus[] = ['PLACED', 'CONFIRMED', 'COOKING'];
/** Default kitchen time when an order carries no estimate. */
const DEFAULT_PREP_MIN = 20;

const minutesSince = (iso?: string | null) => (iso ? (Date.now() - new Date(iso).getTime()) / MINUTE : 0);
const minutesTo = (iso?: string | null) => (iso ? (new Date(iso).getTime() - Date.now()) / MINUTE : null);

export interface OpenOrder extends RestaurantOrder {
  /** Minutes since the order was placed. */
  age: number;
  /** Still in the kitchen past its expected time. */
  late: boolean;
}

interface KitchenPerformance {
  avgPrepMinutes?: number;
  avgServeMinutes?: number;
  totalCompleted?: number;
}

interface RestaurantOverview {
  today?: { revenue?: number; orders?: number; tips?: number; growthPercent?: number };
  activeDeliveries?: number;
}

export function useRestaurantOps() {
  // The live floor: a table's state comes from its open orders, not a stored flag.
  const tablesQ = useQuery({ queryKey: ['restaurant-floor'], queryFn: () => tablesApi.floor(), select: (f): FloorTable[] => f?.tables ?? [], refetchInterval: 30 * SECOND });
  const ordersQ = useQuery({ queryKey: ['restaurant-orders-active'], queryFn: () => ordersApi.list({ open: true }).catch(() => [] as RestaurantOrder[]), refetchInterval: 20 * SECOND });
  const kotsQ = useQuery({ queryKey: ['restaurant-kot', 'active'], queryFn: () => kotApi.list({ active: true }).catch(() => []), refetchInterval: 15 * SECOND });
  const overviewQ = useQuery({
    queryKey: ['restaurant-dashboard-overview'],
    queryFn: () => restaurantDashboardApi.overview().catch(() => null) as Promise<RestaurantOverview | null>,
    refetchInterval: MINUTE,
  });
  const perfQ = useQuery({
    queryKey: ['restaurant-kitchen-perf'],
    queryFn: () => restaurantDashboardApi.kitchenPerformance().catch(() => null) as Promise<KitchenPerformance | null>,
    refetchInterval: MINUTE,
  });

  const tables = useMemo(() => {
    const list = (tablesQ.data ?? []).map((t) => ({ ...t, status: t.liveStatus }));
    const by = (s: FloorTable['liveStatus']) => list.filter((t) => t.status === s);
    const reserved = by('RESERVED');
    return {
      list,
      total: list.length,
      available: by('AVAILABLE').length,
      occupied: by('OCCUPIED').length,
      cleaning: by('CLEANING').length,
      reserved: reserved.length,
      // Reservations starting within the hour, so the table is held in time.
      reservedSoon: reserved.filter((t) => {
        const m = minutesTo(t.reservedFor);
        return m !== null && m >= -15 && m <= 60;
      }),
      seats: list.filter((t) => t.status === 'OCCUPIED').reduce((x, t) => x + Number(t.capacity || 0), 0),
    };
  }, [tablesQ.data]);

  const orders = useMemo(() => {
    const open: OpenOrder[] = (ordersQ.data ?? [])
      .filter((o) => !o.saleId)
      .map((o) => {
        const age = minutesSince(o.placedAt || o.createdAt);
        return { ...o, age, late: IN_KITCHEN.includes(o.status) && age > Number(o.estimatedPrepTime || DEFAULT_PREP_MIN) };
      });
    const modes = new Map<OrderMode, { count: number; value: number }>();
    open.forEach((o) => {
      const m = modes.get(o.mode) ?? { count: 0, value: 0 };
      m.count += 1;
      m.value += Number(o.total || 0);
      modes.set(o.mode, m);
    });
    return {
      open,
      cooking: open.filter((o) => IN_KITCHEN.includes(o.status)).length,
      ready: open.filter((o) => o.status === 'READY'),
      late: open.filter((o) => o.late),
      onTheWay: open.filter((o) => o.status === 'OUT_FOR_DELIVERY').length,
      value: open.reduce((x, o) => x + Number(o.total || 0), 0),
      modes: [...modes.entries()].map(([mode, v]) => ({ mode, ...v })).sort((a, b) => b.count - a.count),
      // Late first, then ready, then oldest.
      list: [...open]
        .sort((a, b) => Number(b.late) - Number(a.late) || Number(b.status === 'READY') - Number(a.status === 'READY') || b.age - a.age)
        .slice(0, 8),
    };
  }, [ordersQ.data]);

  const kitchen = useMemo(() => {
    const kots = kotsQ.data ?? [];
    return {
      active: kots.filter((k) => k.status !== 'SERVED' && k.status !== 'CANCELLED').length,
      cooking: kots.filter((k) => k.status === 'COOKING').length,
      ready: kots.filter((k) => k.status === 'READY').length,
      avgPrep: Number(perfQ.data?.avgPrepMinutes ?? 0),
      avgServe: Number(perfQ.data?.avgServeMinutes ?? 0),
      completed: Number(perfQ.data?.totalCompleted ?? 0),
    };
  }, [kotsQ.data, perfQ.data]);

  return {
    tables,
    orders,
    kitchen,
    tips: Number(overviewQ.data?.today?.tips ?? 0),
    deliveries: Number(overviewQ.data?.activeDeliveries ?? orders.onTheWay),
    loading: ordersQ.isLoading || tablesQ.isLoading,
  };
}
