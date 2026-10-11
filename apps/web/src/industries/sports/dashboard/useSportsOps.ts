/**
 * Sports shop numbers for the dashboard: team orders, repairs and brands.
 * Every sports widget calls this; React Query shares the requests.
 */

import { useMemo } from 'react';
import { useQuery } from '@tanstack/react-query';
import { sportsDashboardApi } from '../api/dashboard.api';
import { teamOrdersApi } from '../api/team-orders.api';
import { repairServicesApi } from '../api/repair-services.api';

const MINUTE = 60_000;
const DAY = 86_400_000;

export interface TeamDelivery {
  id: string;
  orderNumber: string;
  teamName: string;
  status: string;
  totalQuantity?: number;
  totalAmount?: number;
  advancePaid?: number;
  balanceAmount?: number;
  expectedDeliveryDate: string;
}

export interface ActiveRepair {
  id: string;
  serviceNumber: string;
  customerName: string;
  customerPhone?: string;
  itemType: string;
  itemBrand?: string | null;
  status: string;
  estimatedReadyAt?: string | null;
  estimatedCost?: number;
}

interface SportsBrand {
  id: string;
  name: string;
  logoUrl?: string | null;
  brandTier?: string | null;
  authorizedDealer?: boolean;
  totalRevenue?: number;
}

interface SportsOverview {
  totals?: { totalBrands: number; totalProducts: number; activeTeamOrders: number; pendingRepairs: number; overdueRepairs: number };
  upcomingTeamDeliveries?: TeamDelivery[];
  activeRepairs?: ActiveRepair[];
  topBrands?: SportsBrand[];
}

interface TeamSummary {
  counts?: { draft: number; quoted: number; confirmed: number; inProduction: number; ready: number; delivered: number };
  totalPending?: number;
}

interface RepairSummary {
  received?: number;
  inProgress?: number;
  completed?: number;
}

const daysTo = (iso?: string | null) => (iso ? (new Date(iso).getTime() - Date.now()) / DAY : null);

export function useSportsOps() {
  const overview = useQuery({
    queryKey: ['sports-dashboard-overview'],
    queryFn: () => sportsDashboardApi.overview().catch(() => null) as Promise<SportsOverview | null>,
    refetchInterval: MINUTE,
  });
  const team = useQuery({
    queryKey: ['sports-team-orders-summary'],
    queryFn: () => teamOrdersApi.summary().catch(() => null) as Promise<TeamSummary | null>,
    refetchInterval: 5 * MINUTE,
  });
  const repair = useQuery({
    queryKey: ['sports-repair-summary'],
    queryFn: () => repairServicesApi.summary().catch(() => null) as Promise<RepairSummary | null>,
    refetchInterval: 5 * MINUTE,
  });

  return useMemo(() => {
    const t = overview.data?.totals ?? { totalBrands: 0, totalProducts: 0, activeTeamOrders: 0, pendingRepairs: 0, overdueRepairs: 0 };
    const counts = team.data?.counts;

    const deliveries = (overview.data?.upcomingTeamDeliveries ?? []).map((o) => ({ ...o, days: daysTo(o.expectedDeliveryDate) ?? 99 }));
    const repairs = (overview.data?.activeRepairs ?? []).map((r) => {
      const left = daysTo(r.estimatedReadyAt);
      return { ...r, late: left !== null && left < 0 };
    });

    return {
      team: {
        active: t.activeTeamOrders,
        ready: counts?.ready ?? 0,
        inProduction: counts?.inProduction ?? 0,
        quoted: (counts?.draft ?? 0) + (counts?.quoted ?? 0),
        balance: Number(team.data?.totalPending ?? 0),
        deliveries,
        // Due within three days and not ready yet: the ones that slip.
        atRisk: deliveries.filter((o) => o.days <= 3 && o.status !== 'READY').length,
      },
      repairs: {
        pending: t.pendingRepairs,
        overdue: t.overdueRepairs,
        // COMPLETED means fixed and waiting for the customer to collect.
        toCollect: repair.data?.completed ?? 0,
        list: [...repairs].sort((a, b) => Number(b.late) - Number(a.late)),
      },
      brands: overview.data?.topBrands ?? [],
      totalBrands: t.totalBrands,
      totalProducts: t.totalProducts,
      loading: overview.isLoading,
    };
  }, [overview.data, overview.isLoading, team.data, repair.data]);
}
