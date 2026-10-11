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
import { categoriesApi } from '@modules/inventory/categories/api/categories.api';

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

export type PaymentMethod = 'CASH' | 'CARD' | 'BANK_TRANSFER' | 'JAZZCASH' | 'EASYPAISA';

export interface DayReport {
  date: string;
  isToday: boolean;
  sales: {
    total: number; bills: number; average: number; discount: number; collected: number; credit: number;
    itemsSold: number; cogs: number; grossProfit: number; refunds: number; refundCount: number;
    previousTotal: number; previousBills: number;
  };
  payments: Array<{ method: PaymentMethod; sales: number; collected: number; bills: number }>;
  cashCollected: number;
  onlineCollected: number;
  items: Array<{
    productId: string | null; name: string; sku: string | null; unit: string; categoryId: string | null;
    category: string; qty: number; returnedQty: number; revenue: number; lines: number;
  }>;
  categories: Array<{ id: string | null; name: string; color: string | null; qty: number; revenue: number; items: number; units: Record<string, number> }>;
  expenses: { total: number; cash: number; list: Array<{ id: string; title: string; category: string | null; amount: number; method: PaymentMethod }> };
  cash: {
    registers: number; opening: number; cashSales: number; cashIn: number; cashOut: number; expenses: number;
    refunds: number; purchases: number; supplierPaid: number; expectedClosing: number;
    countedClosing: number | null; difference: number | null; allClosed: boolean;
  };
  staff: Array<{ userId: string; name: string; total: number; bills: number }>;
}

/** `date` is YYYY-MM-DD; omit for the current business day. */
export function useDayReport(date?: string) {
  return useQuery<DayReport>({
    queryKey: ['dashboard-day-report', date ?? 'today'],
    queryFn: () => dashboardApi.dayReport(date),
    refetchInterval: date ? false : MINUTE,
  });
}

export type InsightDays = 7 | 30 | 90;

export interface Insights {
  days: InsightDays;
  categories: Array<{ id: string | null; name: string; color: string | null; revenue: number; qty: number; cost: number; profit: number }>;
  staff: Array<{ userId: string; name: string; role: string; avatarUrl?: string | null; total: number; profit: number; bills: number; average: number }>;
  topCustomers: Array<{ customerId: string; name: string; phone?: string | null; balance: number; total: number; bills: number }>;
  weekday: Array<{ day: number; total: number; bills: number; occurrences: number; average: number }>;
  monthly: Array<{ month: string; sales: number; bills: number; expenses: number; profit: number }>;
}

export function useInsights(days: InsightDays) {
  return useQuery<Insights>({
    queryKey: ['dashboard-insights', days],
    queryFn: () => dashboardApi.insights(days),
    staleTime: 5 * MINUTE,
  });
}

export interface ListItemBase { id: string; name: string; unit: string; category: string | null; image: string | null }
export interface TopList { kind: 'top'; total: number; items: Array<ListItemBase & { qty: number; revenue: number; profit: number; bills: number }> }
export interface SlowList { kind: 'slow'; total: number; totalValue: number; items: Array<ListItemBase & { stock: number; value: number; lastSoldAt: string | null }> }
export interface LowList { kind: 'low'; total: number; outCount: number; items: Array<ListItemBase & { stock: number; lowStockAlert: number; price: number }> }
export interface RecentList {
  kind: 'recent';
  items: Array<{ id: string; saleNumber: string; total: number; credit: number; method: PaymentMethod; soldAt: string; source: string; customer: string | null; staff: string | null; items: number }>;
}

type ListParams = Record<string, string | number | undefined>;

/** One of the dashboard lists; `params.kind` picks which. */
export function useDashboardList<T>(params: ListParams & { kind: 'top' | 'slow' | 'low' | 'recent' }) {
  return useQuery<T>({
    queryKey: ['dashboard-list', params],
    queryFn: () => dashboardApi.list(params),
    refetchInterval: MINUTE,
    placeholderData: (prev) => prev,
  });
}

export interface CategoryOption { id: string; name: string }

export function useCategoryOptions() {
  return useQuery<CategoryOption[]>({
    queryKey: ['categories'],
    queryFn: () => categoriesApi.list(),
    staleTime: 5 * MINUTE,
    select: (rows) => rows.map((c) => ({ id: c.id, name: c.name })),
  });
}
