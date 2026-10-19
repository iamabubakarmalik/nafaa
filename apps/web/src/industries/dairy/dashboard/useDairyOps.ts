/**
 * Dairy numbers for the dashboard: today's deliveries, milk collected from
 * farmers, subscriber volume and money owed both ways. Every dairy widget
 * calls this; React Query shares the requests between them.
 */

import { useMemo } from 'react';
import { useQuery } from '@tanstack/react-query';
import { dairyDashboardApi } from '../api/dashboard.api';
import { dairyCustomersApi, type DairyCustomer } from '../api/customers.api';

const MINUTE = 60_000;

interface NamedRef { id: string; name: string; phone?: string | null }

/** Shape of GET /dairy/dashboard/overview. Prisma decimals may arrive as strings. */
interface DairyOverview {
  totals?: { totalCustomers?: number; activeCustomers?: number; totalFarmers?: number; activeRoutes?: number };
  today?: {
    scheduledDeliveries?: number; deliveredCount?: number; deliveredLiters?: number | string; deliveredRevenue?: number | string;
    farmerSupplies?: number; suppliedLiters?: number | string; suppliedAmount?: number | string;
  };
  monthly?: { deliveries?: number; liters?: number | string; revenue?: number | string };
  financials?: { customerOutstanding?: number | string; customerCount?: number; farmerPayable?: number | string };
  topFarmers?: Array<{ farmer?: NamedRef; liters: number | string; amount: number | string }>;
  topDebtors?: Array<NamedRef & { currentBalance: number | string }>;
}

const n = (v: unknown) => Number(v || 0);

export function useDairyOps() {
  const overview = useQuery({
    queryKey: ['dairy-dashboard'],
    queryFn: () => dairyDashboardApi.overview().catch(() => ({})) as Promise<DairyOverview>,
    refetchInterval: MINUTE,
  });
  const customers = useQuery({
    queryKey: ['dairy-customers-dash'],
    queryFn: () => dairyCustomersApi.list({}).catch(() => [] as DairyCustomer[]),
    refetchInterval: MINUTE,
  });

  const o = overview.data ?? {};

  const today = useMemo(() => {
    const t = o.today ?? {};
    const scheduled = n(t.scheduledDeliveries);
    const delivered = n(t.deliveredCount);
    return {
      scheduled,
      delivered,
      pending: Math.max(scheduled - delivered, 0),
      liters: n(t.deliveredLiters),
      revenue: n(t.deliveredRevenue),
      supplies: n(t.farmerSupplies),
      suppliedLiters: n(t.suppliedLiters),
      suppliedAmount: n(t.suppliedAmount),
    };
  }, [o.today]);

  const subscribers = useMemo(() => {
    const list = Array.isArray(customers.data) ? customers.data : [];
    const active = list.filter((c) => c.status === 'ACTIVE');
    const morning = active.reduce((s, c) => s + n(c.morningQuantity), 0);
    const evening = active.reduce((s, c) => s + n(c.eveningQuantity), 0);
    return {
      total: list.length,
      active: active.length,
      paused: list.filter((c) => c.status === 'SUSPENDED').length,
      morning,
      evening,
      daily: morning + evening,
    };
  }, [customers.data]);

  const money = useMemo(() => ({
    receivable: n(o.financials?.customerOutstanding),
    debtorCount: n(o.financials?.customerCount),
    farmerPayable: n(o.financials?.farmerPayable),
  }), [o.financials]);

  const month = useMemo(() => ({
    deliveries: n(o.monthly?.deliveries),
    liters: n(o.monthly?.liters),
    revenue: n(o.monthly?.revenue),
  }), [o.monthly]);

  const farmers = useMemo(() => (o.topFarmers ?? []).map((f) => ({
    id: f.farmer?.id ?? '', name: f.farmer?.name ?? 'Gawala', liters: n(f.liters), amount: n(f.amount),
  })), [o.topFarmers]);

  const debtors = useMemo(() => (o.topDebtors ?? []).map((d) => ({
    id: d.id, name: d.name, phone: d.phone ?? undefined, balance: n(d.currentBalance),
  })), [o.topDebtors]);

  return {
    today,
    subscribers,
    money,
    month,
    farmers,
    debtors,
    totals: { farmers: n(o.totals?.totalFarmers), routes: n(o.totals?.activeRoutes) },
    loading: overview.isLoading,
  };
}
