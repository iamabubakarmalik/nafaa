/**
 * Pharmacy numbers for the dashboard: batches near or past expiry (with
 * their cost value), the prescription workflow, refill reminders, cold
 * chain breaches and controlled drugs. Every pharmacy widget calls this;
 * React Query shares the requests between them.
 */

import { useMemo } from 'react';
import { useQuery } from '@tanstack/react-query';
import { pharmacyDashboardApi } from '../api/dashboard.api';

const MINUTE = 60_000;
const DAY = 86_400_000;

/** Shape of GET /pharmacy/dashboard/overview (fields the dashboard reads). */
interface PharmacyOverview {
  totals?: { medicines: number; controlledCount: number; coldChainCount: number };
  prescriptions?: { pending: number; verified: number; dispensedToday: number };
  alerts?: { expiringSoon: number; expired: number; refillsDueToday: number; recentTempBreaches: number };
}

/** Batch row from GET /pharmacy/dashboard/expiring. */
export interface ExpiringBatch {
  id: string;
  productId: string;
  batchNumber: string;
  expiryDate: string;
  quantity: number;
  costPrice?: number | null;
  product?: { id: string; name: string; unit?: string };
}

export type ExpiringRow = ExpiringBatch & { daysLeft: number; value: number };

export function usePharmacyOps() {
  const overview = useQuery({
    queryKey: ['pharmacy-dashboard'],
    queryFn: () => pharmacyDashboardApi.overview().catch(() => null) as Promise<PharmacyOverview | null>,
    refetchInterval: MINUTE,
  });

  // Same key as the Expiring page with its default 90-day window, so both share the cache.
  const expiring = useQuery({
    queryKey: ['pharmacy-expiring', 90],
    queryFn: () => pharmacyDashboardApi.expiring(90).catch(() => []) as Promise<ExpiringBatch[]>,
    refetchInterval: 5 * MINUTE,
  });

  const expiry = useMemo(() => {
    const now = Date.now();
    const rows: ExpiringRow[] = (expiring.data ?? [])
      .filter((b) => b.expiryDate && Number(b.quantity) > 0)
      .map((b) => ({
        ...b,
        daysLeft: Math.ceil((new Date(b.expiryDate).getTime() - now) / DAY),
        value: Number(b.quantity || 0) * Number(b.costPrice || 0),
      }))
      .sort((a, b) => a.daysLeft - b.daysLeft);
    const expired = rows.filter((r) => r.daysLeft <= 0);
    const week = rows.filter((r) => r.daysLeft > 0 && r.daysLeft <= 7);
    const month = rows.filter((r) => r.daysLeft > 0 && r.daysLeft <= 30);
    const sum = (list: ExpiringRow[]) => list.reduce((s, r) => s + r.value, 0);
    return {
      expired,
      week,
      month,
      watch: rows.length - expired.length,
      expiredValue: sum(expired),
      // Stock that must be sold, returned or written off within a month.
      atRiskValue: sum(expired) + sum(month),
      list: rows.slice(0, 8),
    };
  }, [expiring.data]);

  const o = overview.data;
  return {
    expiry,
    rx: o?.prescriptions ?? { pending: 0, verified: 0, dispensedToday: 0 },
    refillsDue: o?.alerts?.refillsDueToday ?? 0,
    tempBreaches: o?.alerts?.recentTempBreaches ?? 0,
    medicines: o?.totals?.medicines ?? 0,
    controlled: o?.totals?.controlledCount ?? 0,
    coldChain: o?.totals?.coldChainCount ?? 0,
    loading: overview.isLoading || expiring.isLoading,
  };
}
