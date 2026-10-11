/**
 * Electronics numbers for the dashboard: serial stock, warranty claims and
 * brand sales. Every electronics widget calls this; React Query shares the
 * requests between them.
 */

import { useMemo } from 'react';
import { useQuery } from '@tanstack/react-query';
import { electronicsDashboardApi } from '../api/dashboard.api';
import { warrantyClaimsApi, type WarrantyClaim, type WarrantyClaimsSummary } from '../api/warranty-claims.api';
import { serialTrackingApi, type SerialWithProduct } from '../api/serial-tracking.api';

const MINUTE = 60_000;
const DAY = 24 * 3_600_000;

/** Shape of GET /electronics/dashboard/overview (fields the dashboard reads). */
export interface ElectronicsOverview {
  totals?: { totalBrands: number; totalProducts: number; totalSerials: number; activeBundles: number };
  inventory?: { inStock: number; sold: number; defective: number };
  warranty?: { activeClaims: number; resolvedClaims: number; expiringWarranties: number };
  topBrands?: Array<{ id: string; name: string; logoUrl: string | null; totalRevenue: number; unitsSold: number }>;
}

const OPEN_CLAIM = new Set(['ACTIVE', 'CLAIMED', 'IN_REPAIR']);

export function useElectronicsOps() {
  const overviewQ = useQuery({
    queryKey: ['electronics-dashboard-overview'],
    queryFn: () => (electronicsDashboardApi.overview() as Promise<ElectronicsOverview>).catch(() => ({}) as ElectronicsOverview),
    refetchInterval: MINUTE,
  });
  const summaryQ = useQuery({
    queryKey: ['warranty-claims-summary'],
    queryFn: () => warrantyClaimsApi.summary().catch(() => null as WarrantyClaimsSummary | null),
    refetchInterval: 5 * MINUTE,
  });
  // Same key and request as the warranty claims page, so both share one cache entry.
  const claimsQ = useQuery({
    queryKey: ['warranty-claims-list'],
    queryFn: () => warrantyClaimsApi.list({}).catch(() => [] as WarrantyClaim[]),
    refetchInterval: 5 * MINUTE,
  });
  const serialsQ = useQuery({
    queryKey: ['recent-serials'],
    queryFn: () => serialTrackingApi.list({ status: 'IN_STOCK' }).catch(() => [] as SerialWithProduct[]),
    refetchInterval: MINUTE,
  });

  const serials = useMemo(() => {
    const o = overviewQ.data;
    const recent = [...(serialsQ.data ?? [])]
      .sort((a, b) => new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime())
      .slice(0, 6);
    return {
      total: o?.totals?.totalSerials ?? 0,
      inStock: o?.inventory?.inStock ?? serialsQ.data?.length ?? 0,
      sold: o?.inventory?.sold ?? 0,
      defective: o?.inventory?.defective ?? 0,
      expiring: o?.warranty?.expiringWarranties ?? 0,
      recent,
    };
  }, [overviewQ.data, serialsQ.data]);

  const claims = useMemo(() => {
    const s = summaryQ.data;
    const now = Date.now();
    const open = (claimsQ.data ?? [])
      .filter((c) => OPEN_CLAIM.has(c.status))
      .map((c) => ({ ...c, ageDays: Math.max(Math.floor((now - new Date(c.claimDate).getTime()) / DAY), 0) }))
      .sort((a, b) => b.ageDays - a.ageDays);
    return {
      pending: s?.pending ?? open.length,
      resolved: s?.resolved ?? 0,
      thisMonth: s?.thisMonth ?? 0,
      sentToBrand: s?.sentToBrand ?? 0,
      shopBore: Number(s?.cost?.shopBore ?? 0),
      stale: open.filter((c) => c.ageDays >= 7).length,
      list: open.slice(0, 6),
    };
  }, [summaryQ.data, claimsQ.data]);

  const brands = useMemo(() => overviewQ.data?.topBrands ?? [], [overviewQ.data]);

  return { serials, claims, brands, loading: overviewQ.isLoading };
}
