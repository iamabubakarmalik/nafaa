/**
 * Furniture numbers for the dashboard: custom orders, deliveries and
 * carpenters. Every furniture widget calls this; React Query shares the
 * requests between them.
 */

import { useMemo } from 'react';
import { useQuery } from '@tanstack/react-query';
import { furnitureDashboardApi } from '../api/dashboard.api';
import { customOrdersApi } from '../api/custom-orders.api';
import { FURNITURE_KEYS } from '../lib/meta';

const MINUTE = 60_000;
const DAY = 86_400_000;

interface OrderRow {
  id: string; orderNumber: string; customerName: string; productType: string;
  expectedDeliveryDate?: string | null; balanceAmount?: number | string | null;
}
interface DeliveryRow {
  id: string; deliveryNumber: string; customerName: string; itemsCount?: number;
  scheduledSlot?: string | null; status: string;
}
interface CarpenterRow {
  id: string; name: string; photoUrl?: string | null;
  completedProjects?: number; activeProjects?: number; totalRevenue?: number | string | null;
}
interface FurnitureOverview {
  totals?: { totalProducts: number; totalCarpenters: number; activeCarpenters: number; activeCustomOrders: number; quotationOrders: number; completedCustomOrders: number };
  pending?: { deliveries: number; todayDeliveries: number; overdueOrders: number; quotationsToApprove: number };
  financial?: { monthlyCustomRevenue: number; totalReceivable: number; totalCollected: number };
  overdueOrders?: OrderRow[];
  readyForDelivery?: OrderRow[];
  todaySchedule?: DeliveryRow[];
  topCarpenters?: CarpenterRow[];
}
interface OrderSummary {
  quotation: number; deposit: number; production: number; ready: number;
  delivered: number; completed: number; cancelled: number;
}

export function useFurnitureOps() {
  const overview = useQuery<FurnitureOverview | null>({
    queryKey: [FURNITURE_KEYS.dashboard],
    queryFn: () => furnitureDashboardApi.overview().then((r) => r as FurnitureOverview).catch(() => null),
    refetchInterval: MINUTE,
  });
  const summary = useQuery<OrderSummary | null>({
    queryKey: [FURNITURE_KEYS.orders, 'summary'],
    queryFn: () => customOrdersApi.summary().catch(() => null),
    refetchInterval: 5 * MINUTE,
  });

  return useMemo(() => {
    const o = overview.data;
    const s = summary.data;
    const now = Date.now();
    const overdue = (o?.overdueOrders ?? []).map((x) => ({
      ...x,
      daysLate: x.expectedDeliveryDate ? Math.max(Math.ceil((now - new Date(x.expectedDeliveryDate).getTime()) / DAY), 1) : 0,
    }));
    const pipeline = [
      { key: 'quotation', label: 'Quotation', count: s?.quotation ?? 0, color: 'bg-amber-500' },
      { key: 'deposit', label: 'Advance mila', count: s?.deposit ?? 0, color: 'bg-sky-500' },
      { key: 'production', label: 'Ban raha', count: s?.production ?? 0, color: 'bg-brand-600' },
      { key: 'ready', label: 'Tayyar', count: s?.ready ?? 0, color: 'bg-success-600' },
    ];
    return {
      loading: overview.isLoading,
      activeOrders: o?.totals?.activeCustomOrders ?? 0,
      quotations: o?.pending?.quotationsToApprove ?? o?.totals?.quotationOrders ?? 0,
      carpenters: o?.totals?.totalCarpenters ?? 0,
      activeCarpenters: o?.totals?.activeCarpenters ?? 0,
      pendingDeliveries: o?.pending?.deliveries ?? 0,
      todayDeliveries: o?.pending?.todayDeliveries ?? 0,
      monthRevenue: o?.financial?.monthlyCustomRevenue ?? 0,
      receivable: o?.financial?.totalReceivable ?? 0,
      collected: o?.financial?.totalCollected ?? 0,
      overdue,
      ready: o?.readyForDelivery ?? [],
      schedule: o?.todaySchedule ?? [],
      topCarpenters: o?.topCarpenters ?? [],
      pipeline,
      pipelineTotal: pipeline.reduce((a, p) => a + p.count, 0),
      delivered: (s?.delivered ?? 0) + (s?.completed ?? 0),
    };
  }, [overview.data, overview.isLoading, summary.data]);
}
