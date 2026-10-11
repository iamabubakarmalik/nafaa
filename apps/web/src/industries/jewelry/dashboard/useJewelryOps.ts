/**
 * Jewelry numbers for the dashboard: today's metal rates, raw metal in the
 * safe, custom orders by promised date, weight sold and karigar balances.
 * Every jewelry widget calls this; React Query shares the requests.
 */

import { useMemo } from 'react';
import { useQuery } from '@tanstack/react-query';
import { jewelryDashboardApi } from '../api/dashboard.api';
import { metalRatesApi, type MetalRate } from '../api/metal-rates.api';
import { metalStockApi } from '../api/metal-stock.api';

const MINUTE = 60_000;
const DAY = 86_400_000;

export interface JewelryOverview {
  today?: { sales: number; revenue: number; weightSold: number; customOrders: number; exchanges: number };
  monthly?: {
    sales: number; revenue: number; collected: number; outstanding: number;
    goldSold: number; silverSold: number; exchangesCount: number; exchangesValue: number; exchangesGold: number;
  };
  pendingCustomOrders?: number;
  totals?: { totalProducts: number; activeKarigars: number };
  upcomingOrders?: Array<{
    id: string; orderNumber: string; customerName: string; category?: string; status: string;
    promisedDate?: string | null; estimatedPrice?: number; advancePayment?: number; paidAmount?: number;
  }>;
  topKarigars?: Array<{
    id: string; fullName: string; skillLevel?: string | null; completedOrders: number;
    totalEarnings: number; outstandingGrams: number;
  }>;
}

interface MetalBalance { metalType: string; purity: string; balanceGrams: number; lastEntryDate?: string }

const PURITY: Record<string, string> = {
  KARAT_24: '24K', KARAT_22: '22K', KARAT_21: '21K', KARAT_18: '18K', KARAT_14: '14K', KARAT_10: '10K', KARAT_9: '9K',
  STERLING_925: '925', SILVER_999: '999', SILVER_925: '925', SILVER_800: '800', PLATINUM_950: '950', PLATINUM_900: '900',
};
const METAL: Record<string, string> = {
  GOLD: 'Sona', SILVER: 'Chandi', PLATINUM: 'Platinum', PALLADIUM: 'Palladium', ROSE_GOLD: 'Rose gold', WHITE_GOLD: 'White gold',
};

/** "Sona 22K", "Chandi 925". */
export const metalLabel = (metalType: string, purity?: string) =>
  `${METAL[metalType] ?? metalType.replace('_', ' ')}${purity ? ` ${PURITY[purity] ?? purity.replace(/^[A-Z]+_/, '')}` : ''}`;

/** Whole days from today to `iso`; negative when already past. */
const daysTo = (iso?: string | null) => {
  if (!iso) return null;
  const start = new Date(); start.setHours(0, 0, 0, 0);
  return Math.floor((new Date(iso).getTime() - start.getTime()) / DAY);
};

export function useJewelryOps() {
  const overview = useQuery({
    queryKey: ['jewelry-dashboard'],
    queryFn: () => jewelryDashboardApi.overview().catch(() => null) as Promise<JewelryOverview | null>,
    refetchInterval: MINUTE,
  });
  const ratesQ = useQuery({
    queryKey: ['metal-rates-current'],
    queryFn: () => metalRatesApi.current().catch(() => [] as MetalRate[]),
    refetchInterval: 5 * MINUTE,
  });
  const balanceQ = useQuery({
    queryKey: ['metal-stock-balance'],
    queryFn: () => metalStockApi.balance().catch(() => [] as MetalBalance[]) as Promise<MetalBalance[]>,
    staleTime: 5 * MINUTE,
  });

  const o = overview.data ?? {};

  const rates = useMemo(() => {
    const list = (ratesQ.data ?? []).filter((r) => r.isActive !== false);
    const rateOf = (metalType: string, purity: string) =>
      list.find((r) => r.metalType === metalType && r.purity === purity)?.ratePerGram ?? 0;
    const gold = list.find((r) => r.metalType === 'GOLD' && r.purity === 'KARAT_24')
      ?? list.find((r) => r.metalType === 'GOLD' && r.purity === 'KARAT_22')
      ?? list.find((r) => r.metalType === 'GOLD');
    // A rate is current only if it was set on today's calendar day.
    const newest = list.reduce((t, r) => Math.max(t, new Date(r.updatedAt || r.effectiveDate).getTime() || 0), 0);
    const ageDays = newest ? -(daysTo(new Date(newest).toISOString()) ?? 0) : null;
    return { list, gold, rateOf, ageDays, stale: ageDays !== null && ageDays > 0 };
  }, [ratesQ.data]);

  const metal = useMemo(() => {
    const list = (balanceQ.data ?? [])
      .filter((b) => Number(b.balanceGrams) > 0)
      .map((b) => ({ ...b, value: Number(b.balanceGrams) * rates.rateOf(b.metalType, b.purity) }))
      .sort((a, b) => b.value - a.value || b.balanceGrams - a.balanceGrams);
    const grams = (t: string) => list.filter((b) => b.metalType === t).reduce((s, b) => s + Number(b.balanceGrams), 0);
    return { list, value: list.reduce((s, b) => s + b.value, 0), gold: grams('GOLD'), silver: grams('SILVER') };
  }, [balanceQ.data, rates]);

  const orders = useMemo(() => {
    const list = (o.upcomingOrders ?? []).map((x) => ({
      ...x,
      left: daysTo(x.promisedDate),
      due: Math.max(Number(x.estimatedPrice || 0) - Number(x.paidAmount ?? x.advancePayment ?? 0), 0),
    }));
    return {
      list,
      pending: o.pendingCustomOrders ?? 0,
      late: list.filter((x) => x.left !== null && x.left < 0),
      soon: list.filter((x) => x.left !== null && x.left >= 0 && x.left <= 2),
    };
  }, [o.upcomingOrders, o.pendingCustomOrders]);

  const karigars = useMemo(() => {
    const list = o.topKarigars ?? [];
    return { list, gramsOut: list.reduce((s, k) => s + Number(k.outstandingGrams || 0), 0), active: o.totals?.activeKarigars ?? list.length };
  }, [o.topKarigars, o.totals]);

  return {
    today: o.today ?? { sales: 0, revenue: 0, weightSold: 0, customOrders: 0, exchanges: 0 },
    monthly: o.monthly ?? {
      sales: 0, revenue: 0, collected: 0, outstanding: 0, goldSold: 0, silverSold: 0, exchangesCount: 0, exchangesValue: 0, exchangesGold: 0,
    },
    rates, metal, orders, karigars,
    loading: overview.isLoading || ratesQ.isLoading,
  };
}

export const fmtGrams = (g: number | null | undefined) => {
  const n = Number(g || 0);
  return `${n % 1 === 0 ? n : n.toFixed(n >= 100 ? 0 : 2)}g`;
};
