/**
 * Toy store numbers for the dashboard: upcoming child birthdays, age-group
 * sales, gift packs and safety flags. Every toystore widget calls this;
 * React Query shares the single request between them.
 */

import { useMemo } from 'react';
import { useQuery } from '@tanstack/react-query';
import { toystoreDashboardApi } from '../api/dashboard.api';

const MINUTE = 60_000;

export interface UpcomingBirthday {
  id: string;
  childName: string;
  customerName?: string | null;
  customerPhone?: string | null;
  budgetRange?: string | null;
  lastGiftGiven?: string | null;
  daysUntil: number;
  turningAge: number;
}

interface GiftPack {
  id: string;
  name: string;
  itemCount?: number;
  totalSold?: number;
  savingsPct?: number;
  giftPackPrice?: number;
}

interface ToystoreOverview {
  totals?: {
    totalProducts?: number; educationalCount?: number; activeGiftPacks?: number; giftPacksSold?: number; birthdaysRegistered?: number;
  };
  alerts?: { safetyIssues?: number; batteryUpsellOpportunities?: number; birthdaysThisWeek?: number; birthdaysThisMonth?: number };
  upcomingBirthdays?: UpcomingBirthday[];
  topGiftPacks?: GiftPack[];
  byAgeGroup?: Array<{ ageGroup: string; count: number; revenue: number }>;
}

export const AGE_LABELS: Record<string, string> = {
  NEWBORN_0_6M: '0-6 mahine', INFANT_6_12M: '6-12 mahine', TODDLER_1_2Y: '1-2 saal',
  TODDLER_2_3Y: '2-3 saal', PRESCHOOL_3_5Y: '3-5 saal', KIDS_5_8Y: '5-8 saal',
  KIDS_8_12Y: '8-12 saal', TWEEN_12_14Y: '12-14 saal', TEEN_14_PLUS: '14+ saal', ALL_AGES: 'Har umar',
};

export function useToystoreOps() {
  const overview = useQuery({
    queryKey: ['toystore-dashboard-overview'],
    queryFn: () => toystoreDashboardApi.overview().catch(() => null) as Promise<ToystoreOverview | null>,
    refetchInterval: MINUTE,
  });

  return useMemo(() => {
    const d: ToystoreOverview = overview.data ?? {};
    const t: NonNullable<ToystoreOverview['totals']> = d.totals ?? {};
    const a: NonNullable<ToystoreOverview['alerts']> = d.alerts ?? {};
    const upcoming = d.upcomingBirthdays ?? [];
    const ages = (d.byAgeGroup ?? []).map((g) => ({ ...g, revenue: Number(g.revenue || 0) })).sort((x, y) => y.revenue - x.revenue);
    const ageRevenue = ages.reduce((s, g) => s + g.revenue, 0);

    return {
      birthdays: {
        registered: t.birthdaysRegistered ?? 0,
        week: a.birthdaysThisWeek ?? 0,
        month: a.birthdaysThisMonth ?? upcoming.length,
        soon: upcoming.filter((b) => b.daysUntil <= 3).length,
        list: upcoming,
      },
      ages: ages.map((g) => ({ ...g, label: AGE_LABELS[g.ageGroup] ?? g.ageGroup, share: ageRevenue ? (g.revenue / ageRevenue) * 100 : 0 })),
      giftPacks: { active: t.activeGiftPacks ?? 0, sold: t.giftPacksSold ?? 0, top: d.topGiftPacks ?? [] },
      safetyIssues: a.safetyIssues ?? 0,
      batteryUpsell: a.batteryUpsellOpportunities ?? 0,
      totalProducts: t.totalProducts ?? 0,
      educational: t.educationalCount ?? 0,
      loading: overview.isLoading,
    };
  }, [overview.data, overview.isLoading]);
}
