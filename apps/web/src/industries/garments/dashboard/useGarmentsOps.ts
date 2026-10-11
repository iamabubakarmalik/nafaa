/**
 * Garments numbers for the dashboard: tailoring, alterations, holds and
 * the catalogue mix. Every garments widget calls this; React Query shares
 * the request between them.
 */

import { useMemo } from 'react';
import { useQuery } from '@tanstack/react-query';
import { garmentsDashboardApi } from '../api/dashboard.api';

const MINUTE = 60_000;
const DAY = 86_400_000;

interface TailoringRow {
  id: string; orderNumber: string; customerName?: string | null;
  priority?: string | null; promisedDate?: string | null; total?: number | string | null;
}
interface AlterationRow {
  id: string; ticketNumber: string; garmentDescription?: string | null; promisedDate?: string | null;
}
interface GroupCount { _count: { _all: number } }
interface GarmentsOverview {
  totals?: { totalCollections: number; activeCollections: number; totalMeasurements: number; newArrivals: number; bestSellers: number; onSaleCount: number };
  pending?: { tailoring: number; alterations: number; reservations: number; layaway: number };
  tailoringRevenue?: { total: number; paid: number; count: number };
  upcomingDeliveries?: TailoringRow[];
  upcomingAlterations?: AlterationRow[];
  bySeason?: Array<GroupCount & { season: string }>;
  byGender?: Array<GroupCount & { gender: string }>;
}

/** Whole days from now until `iso`; 0 means today or already due. */
const daysTo = (iso?: string | null) => (iso ? Math.max(Math.ceil((new Date(iso).getTime() - Date.now()) / DAY), 0) : null);

const pretty = (s: string) => s.replace(/_COLLECTION$/, '').replace(/_/g, ' ').toLowerCase().replace(/^\w/, (c) => c.toUpperCase());

export function useGarmentsOps() {
  const q = useQuery<GarmentsOverview | null>({
    queryKey: ['garments-dashboard'],
    queryFn: () => garmentsDashboardApi.overview().catch(() => null),
    refetchInterval: MINUTE,
  });

  return useMemo(() => {
    const g = q.data;
    const tailoring = (g?.upcomingDeliveries ?? []).map((o) => ({ ...o, days: daysTo(o.promisedDate) }));
    const alterations = (g?.upcomingAlterations ?? []).map((a) => ({ ...a, days: daysTo(a.promisedDate) }));
    const pending = g?.pending ?? { tailoring: 0, alterations: 0, reservations: 0, layaway: 0 };
    const totals = g?.totals ?? { totalCollections: 0, activeCollections: 0, totalMeasurements: 0, newArrivals: 0, bestSellers: 0, onSaleCount: 0 };
    return {
      loading: q.isLoading,
      pending,
      totals,
      revenue: g?.tailoringRevenue ?? { total: 0, paid: 0, count: 0 },
      tailoring,
      alterations,
      /** Stitching and alteration jobs promised for today or tomorrow. */
      tailoringSoon: tailoring.filter((o) => o.days !== null && o.days <= 1),
      alterationsSoon: alterations.filter((a) => a.days !== null && a.days <= 1),
      urgent: tailoring.filter((o) => o.priority === 'URGENT'),
      seasons: (g?.bySeason ?? []).map((s) => ({ key: s.season, label: pretty(s.season), count: s._count._all })).sort((a, b) => b.count - a.count),
      genders: (g?.byGender ?? []).map((s) => ({ key: s.gender, label: pretty(s.gender), count: s._count._all })).sort((a, b) => b.count - a.count),
    };
  }, [q.data, q.isLoading]);
}
