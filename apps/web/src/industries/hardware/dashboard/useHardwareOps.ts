/**
 * Hardware numbers for the dashboard: contractor credit, deliveries,
 * construction projects, open quotations and reorder alerts. Every hardware
 * widget calls this; React Query shares the requests.
 */

import { useMemo } from 'react';
import { useQuery } from '@tanstack/react-query';
import { hardwareDashboardApi } from '../api/dashboard.api';
import { quotationsApi } from '../api/quotations.api';
import { deliveriesApi } from '../api/deliveries.api';
import type { CreditAccount } from '../api/credit-accounts.api';
import type { Delivery } from '../api/deliveries.api';
import type { HardwareProject } from '../api/projects.api';

const MINUTE = 60_000;
const DAY = 86_400_000;

interface HardwareOverview {
  pending?: { quotations: number; deliveries: number; todayDeliveries: number; overdueAccounts: number; lowStockCount: number };
  creditSummary?: { totalOutstanding: number; totalPurchases: number; totalOverdue90Plus: number };
  totals?: { totalBrands: number; totalProducts: number; activeProjects: number; totalCreditAccounts: number };
  activeProjects?: HardwareProject[];
  upcomingDeliveries?: Delivery[];
  topDebtors?: CreditAccount[];
}

interface QuotationSummary { pendingCount: number; acceptedCount: number; acceptedValue: number; expiredCount: number }
interface DeliverySummary { pending: number; inTransit: number; todayScheduled: number; deliveredCount: number; deliveredRevenue: number }

/** Whole days from today to `iso`; negative when already past. */
const daysTo = (iso?: string | null) => {
  if (!iso) return null;
  const start = new Date(); start.setHours(0, 0, 0, 0);
  return Math.floor((new Date(iso).getTime() - start.getTime()) / DAY);
};

export function useHardwareOps() {
  const overview = useQuery({
    queryKey: ['hardware-dashboard'],
    queryFn: () => hardwareDashboardApi.overview().catch(() => null) as Promise<HardwareOverview | null>,
    refetchInterval: MINUTE,
  });
  const quotes = useQuery({
    queryKey: ['hardware-quotations-summary'],
    queryFn: () => quotationsApi.summary().catch(() => null) as Promise<QuotationSummary | null>,
    refetchInterval: MINUTE,
  });
  const deliveries = useQuery({
    queryKey: ['hardware-deliveries-summary'],
    queryFn: () => deliveriesApi.summary().catch(() => null) as Promise<DeliverySummary | null>,
    refetchInterval: MINUTE,
  });

  const o = overview.data ?? {};

  const credit = useMemo(() => {
    const s = o.creditSummary ?? { totalOutstanding: 0, totalPurchases: 0, totalOverdue90Plus: 0 };
    return {
      outstanding: Number(s.totalOutstanding || 0),
      over90: Number(s.totalOverdue90Plus || 0),
      overdueAccounts: o.pending?.overdueAccounts ?? 0,
      accounts: o.totals?.totalCreditAccounts ?? 0,
      list: (o.topDebtors ?? []).map((a) => ({
        ...a,
        old: Number(a.age61To90Days || 0) + Number(a.ageOver90Days || 0),
        overLimit: Number(a.creditLimit || 0) > 0 && Number(a.currentBalance) > Number(a.creditLimit),
      })),
    };
  }, [o.creditSummary, o.pending, o.totals, o.topDebtors]);

  const delivery = useMemo(() => {
    const list = (o.upcomingDeliveries ?? []).map((d) => ({ ...d, left: daysTo(d.scheduledDate) }));
    return {
      list: list.slice(0, 6),
      today: o.pending?.todayDeliveries ?? deliveries.data?.todayScheduled ?? 0,
      pending: deliveries.data?.pending ?? o.pending?.deliveries ?? 0,
      inTransit: deliveries.data?.inTransit ?? 0,
      open: o.pending?.deliveries ?? 0,
    };
  }, [o.upcomingDeliveries, o.pending, deliveries.data]);

  const projects = useMemo(() => {
    const list = (o.activeProjects ?? []).map((p) => ({
      ...p,
      pct: Number(p.totalOrdered) > 0 ? Math.min(Math.round((Number(p.totalDelivered) / Number(p.totalOrdered)) * 100), 100) : null,
    }));
    return { list, active: o.totals?.activeProjects ?? list.length, pending: list.reduce((s, p) => s + Number(p.totalPending || 0), 0) };
  }, [o.activeProjects, o.totals]);

  const quotations = {
    pending: quotes.data?.pendingCount ?? o.pending?.quotations ?? 0,
    expired: quotes.data?.expiredCount ?? 0,
    acceptedValue: quotes.data?.acceptedValue ?? 0,
    acceptedCount: quotes.data?.acceptedCount ?? 0,
  };

  return { credit, delivery, projects, quotations, reorder: o.pending?.lowStockCount ?? 0, loading: overview.isLoading };
}
