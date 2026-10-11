/**
 * Cosmetics numbers for the dashboard: batch expiry and loyalty birthdays.
 * `available` is false when the overview request fails, so widgets can say
 * the data is missing instead of showing an "all clear".
 */

import { useMemo } from 'react';
import { useQuery } from '@tanstack/react-query';
import { cosmeticsDashboardApi } from '../api/dashboard.api';

const MINUTE = 60_000;
const DAY = 86_400_000;

interface ExpiringBatch {
  id: string;
  batchNumber: string;
  currentStock?: number;
  expiryDate: string;
  product?: { name?: string } | null;
}

interface BirthdayMember {
  id: string;
  name: string;
  phone?: string | null;
  tier?: string | null;
  dateOfBirth?: string | null;
}

interface CosmeticsOverview {
  totals?: { totalBrands?: number; totalProducts?: number; totalBatches?: number; activeBundles?: number; totalLoyaltyMembers?: number; expiredBatches?: number; expiringSoonBatches?: number };
  expiringBatches?: ExpiringBatch[];
  birthdayMembers?: BirthdayMember[];
}

export function useCosmeticsOps() {
  const overview = useQuery({
    queryKey: ['cosmetics-dashboard-overview'],
    queryFn: () => cosmeticsDashboardApi.overview().catch(() => null) as Promise<CosmeticsOverview | null>,
    refetchInterval: MINUTE,
  });

  return useMemo(() => {
    const d = overview.data;
    const t: NonNullable<CosmeticsOverview['totals']> = d?.totals ?? {};
    const batches = (d?.expiringBatches ?? [])
      .map((b) => ({ ...b, days: Math.ceil((new Date(b.expiryDate).getTime() - Date.now()) / DAY) }))
      .sort((a, b) => a.days - b.days);
    const dayOfMonth = (iso?: string | null) => (iso ? new Date(iso).getDate() : 99);
    const today = new Date().getDate();
    const members = [...(d?.birthdayMembers ?? [])].sort((a, b) => dayOfMonth(a.dateOfBirth) - dayOfMonth(b.dateOfBirth));

    return {
      available: !!d,
      expiry: {
        expired: t.expiredBatches ?? 0,
        soon: t.expiringSoonBatches ?? 0,
        week: batches.filter((b) => b.days <= 7).length,
        list: batches,
      },
      loyalty: {
        members: t.totalLoyaltyMembers ?? 0,
        birthdays: members,
        upcoming: members.filter((m) => dayOfMonth(m.dateOfBirth) >= today),
      },
      totals: {
        brands: t.totalBrands ?? 0, products: t.totalProducts ?? 0, batches: t.totalBatches ?? 0, bundles: t.activeBundles ?? 0,
      },
      loading: overview.isLoading,
    };
  }, [overview.data, overview.isLoading]);
}
