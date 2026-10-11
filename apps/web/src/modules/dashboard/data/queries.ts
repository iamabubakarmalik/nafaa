/**
 * Data hooks shared by dashboard widgets. Several widgets read the same
 * source; React Query de-duplicates, so each widget asks for what it needs.
 *
 * Query keys match the ones the rest of the app invalidates after a sale,
 * purchase or product change ('dashboard-overview', 'retail-money-map').
 *
 * The `/retail/dashboard/*` endpoints are the backend's business-pulse
 * service. Despite the path they are industry-neutral (scoped by tenant and
 * shop), so every industry uses them.
 */

import { useQuery } from '@tanstack/react-query';
import { dashboardApi, type DashboardOverview } from '../api/dashboard.api';
import { retailDashboardApi } from '@industries/retail/api/dashboard.api';

const MINUTE = 60_000;

export function useOverview() {
  return useQuery<DashboardOverview>({
    queryKey: ['dashboard-overview'],
    queryFn: () => dashboardApi.overview(),
    refetchInterval: MINUTE,
  });
}

export interface MoneyMap {
  cash: { expected: number; opening: number; registerOpen: boolean };
  expenses: {
    today: number; month: number; lastMonth?: number; monthCount: number;
    byCategory: Array<{ categoryId?: string | null; name: string; color?: string | null; amount: number; count: number }>;
  };
  inventory: { productCount: number; valueAtCost: number; valueAtRetail: number; deadStockCount: number; deadStockValue: number };
  payable: { total: number; supplierCount: number };
  purchases: {
    todayTotal: number; monthTotal: number; monthCount: number; monthUnpaid: number;
    recent: Array<{ id: string; purchaseNumber: string; total: number; paidAmount: number; purchasedAt: string; supplier?: { name: string } | null }>;
  };
  receivable: { total: number; customerCount: number };
  profit: { todayNet: number; monthRevenue: number; monthCogs: number; monthExpenses: number };
}

export function useMoneyMap() {
  return useQuery<MoneyMap | null>({
    queryKey: ['retail-money-map'],
    queryFn: () => retailDashboardApi.moneyMap().catch(() => null),
    refetchInterval: MINUTE,
  });
}

export interface HourlySales {
  hours: Array<{ hour: number; total: number; count?: number }>;
  peakHour: number | null;
  currentHour?: number;
}

/** `days` 1 = today, 7 = daily average over the last week. */
export function useHourlySales(days: 1 | 7) {
  return useQuery<HourlySales | null>({
    queryKey: ['retail-hourly', days],
    queryFn: () => retailDashboardApi.salesByHour(days).catch(() => null),
    refetchInterval: MINUTE,
  });
}

export interface SlowMover {
  id: string; name: string; stock: number; unit?: string;
  price?: number; costPrice?: number; lastSoldAt?: string | null;
}

export function useSlowMovers() {
  return useQuery<SlowMover[]>({
    queryKey: ['retail-slow-movers'],
    queryFn: () => retailDashboardApi.slowMovers(30).catch(() => []),
    refetchInterval: 5 * MINUTE,
  });
}

export interface RetailAlerts { damagesToday?: number; pendingReorders?: number }

export function useRetailAlerts() {
  return useQuery<RetailAlerts>({
    queryKey: ['retail-dashboard-overview'],
    queryFn: () => retailDashboardApi.overview().then((r: { alerts?: RetailAlerts }) => r?.alerts ?? {}).catch(() => ({})),
    refetchInterval: MINUTE,
  });
}
