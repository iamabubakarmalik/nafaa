/**
 * Dashboard data, the same endpoints and payloads as the web dashboard
 * (apps/web/src/modules/dashboard/data). Every key starts with 'dashboard' so
 * the app's refresh after a sale, expense or purchase reaches all widgets,
 * and every result is kept on the phone for offline (core/offline queryPersist).
 */

import { useQuery } from '@tanstack/react-query';
import { apiClient } from '@/core/api/client';
import { useAuthStore } from '@/core/auth/store';
import { shopParam } from '@/core/auth/shopScope';

const MINUTE = 60_000;

export type PaymentMethod = 'CASH' | 'CARD' | 'BANK_TRANSFER' | 'JAZZCASH' | 'EASYPAISA';

export interface ProfitSplit {
  basis: 'PAID' | 'BILL';
  billProfit: number; realised: number; fromOlderBills: number; pending: number; writtenOff: number; headline: number;
}

export interface DashboardStats {
  salesToday: number; ordersToday: number; cogsToday?: number; grossProfitToday: number; netProfitToday: number; expensesToday: number;
  todayCredit: number; todayPaid: number; aovToday: number;
  salesYesterday: number; ordersYesterday: number; salesGrowthVsYesterday: number;
  salesMonth: number; ordersMonth: number; netProfitMonth: number; aovMonth?: number;
  salesLastMonth?: number; salesGrowthVsLastMonth?: number;
  expensesMonth?: number; purchasesMonth?: number; purchasesToday?: number; cogsMonth?: number; grossProfitMonth?: number;
  lowStockCount: number; outOfStockCount: number; totalProducts: number; totalCustomers: number; totalSuppliers?: number;
  totalUdhaar: number; customersWithUdhaar: number;
  inventoryValueAtCost?: number; inventoryValueAtPrice?: number;
  registerOpen: boolean; registerExpected: number; registerOpening: number;
  returnsTodayCount: number; returnsTodayAmount: number;
  pendingTransfers?: number;
  profitSplitToday?: ProfitSplit; profitSplitMonth?: ProfitSplit;
  otherIncomeToday?: number; otherIncomeMonth?: number;
  stockLossToday?: number; stockGainToday?: number; stockLossMonth?: number; stockGainMonth?: number;
}

export interface TrendPoint { date: string; sales: number; profit: number; orders: number }

export interface DashboardOverview {
  shop: { id: string; name: string; isMain: boolean } | null;
  scope: 'shop' | 'all';
  stats: DashboardStats;
  salesTrend7Days?: TrendPoint[];
  salesTrend30Days?: TrendPoint[];
  hourlySalesToday?: Array<{ hour: number; sales: number; orders: number }>;
  topProducts: Array<{ productId: string; product?: { id: string; name: string; unit: string; price: number }; quantitySold: number; revenue: number }>;
  lowStockProducts: Array<{ id: string; name: string; stock: number; lowStockAlert: number; unit: string; price: number }>;
  recentSales: Array<{ id: string; saleNumber: string; total: number; paidAmount: number; creditAmount: number; paymentMethod: string; status: string; soldAt: string; customer?: { id: string; name: string } | null }>;
  paymentBreakdown?: Array<{ method: string; total: number; count: number }>;
}

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
  items: Array<{ productId: string | null; name: string; unit: string; category: string; qty: number; returnedQty: number; revenue: number }>;
  categories: Array<{ id: string | null; name: string; color: string | null; qty: number; revenue: number; items: number }>;
  expenses: { total: number; cash: number; list: Array<{ id: string; title: string; category: string | null; amount: number; method: PaymentMethod }> };
  cash: {
    registers: number; opening: number; cashSales: number; cashIn: number; cashOut: number; expenses: number;
    refunds: number; purchases: number; supplierPaid: number; expectedClosing: number; otherIncome?: number; khataCollected?: number;
    countedClosing: number | null; difference: number | null; allClosed: boolean;
  };
  profit?: { split?: ProfitSplit; expenses: number; stockLoss?: number; stockGain?: number; otherIncome: number; netProfit?: number };
  staff: Array<{ userId: string; name: string; total: number; bills: number }>;
}

export type InsightDays = 1 | 7 | 30 | 90;

export interface Insights {
  days: InsightDays;
  categories: Array<{ id: string | null; name: string; color: string | null; revenue: number; qty: number; cost: number; profit: number }>;
  staff: Array<{ userId: string; name: string; role: string; total: number; profit: number; bills: number; average: number }>;
  topCustomers: Array<{ customerId: string; name: string; phone?: string | null; balance: number; total: number; bills: number }>;
  weekday: Array<{ day: number; total: number; bills: number; occurrences: number; average: number }>;
  monthly: Array<{ month: string; sales: number; bills: number; expenses: number; profit: number }>;
  trend: Array<{ date: string; sales: number; profit: number; bills: number }>;
  payments: Array<{ method: PaymentMethod; collected: number; bills: number }>;
  credit: number;
}

export interface MoneyMap {
  cash: { expected: number; opening: number; registerOpen: boolean };
  expenses: { today: number; month: number; lastMonth?: number; monthCount: number; byCategory: Array<{ categoryId?: string | null; name: string; color?: string | null; amount: number; count: number }> };
  inventory: { productCount: number; valueAtCost: number; valueAtRetail: number; deadStockCount: number; deadStockValue: number };
  payable: { total: number; supplierCount: number };
  purchases: { todayTotal: number; monthTotal: number; monthCount: number; monthUnpaid: number; recent: Array<{ id: string; purchaseNumber: string; total: number; paidAmount: number; purchasedAt: string; supplier?: { name: string } | null }> };
  receivable: { total: number; customerCount: number };
  profit: {
    todayNet: number; monthRevenue: number; monthCogs: number; monthExpenses: number;
    todayGross?: number; monthGross?: number; monthNet?: number; monthSplit?: ProfitSplit; monthOtherIncome?: number;
  };
}

export interface HourlySales { hours: Array<{ hour: number; total: number; count?: number }>; peakHour: number | null; currentHour?: number }

interface ListItemBase { id: string; name: string; unit: string; category: string | null; image: string | null }
export interface TopList { kind: 'top'; total: number; items: Array<ListItemBase & { qty: number; revenue: number; profit: number; bills: number }> }
export interface SlowList { kind: 'slow'; total: number; totalValue: number; items: Array<ListItemBase & { stock: number; value: number; lastSoldAt: string | null }> }
export interface LowList { kind: 'low'; total: number; outCount: number; items: Array<ListItemBase & { stock: number; lowStockAlert: number; price: number }> }
export interface RecentList {
  kind: 'recent';
  items: Array<{ id: string; saleNumber: string; total: number; credit: number; method: PaymentMethod; soldAt: string; source: string; customer: string | null; staff: string | null; items: number }>;
}

function useScope() {
  const shopId = useAuthStore((s) => s.currentShopId);
  const on = useAuthStore((s) => s.isAuthenticated);
  return { shop: shopParam(shopId), key: shopId ?? 'none', on };
}

export function useDashboard() {
  const { shop, key, on } = useScope();
  return useQuery({
    queryKey: ['dashboard', 'overview', key],
    queryFn: () => apiClient.get<DashboardOverview>('/dashboard/overview', { params: shop ? { shopId: shop } : {} }).then((r) => r.data),
    enabled: on,
    staleTime: 30_000,
    refetchInterval: MINUTE,
  });
}

/** `date` is YYYY-MM-DD; omit for the current business day. */
export function useDayReport(date?: string) {
  const { key, on } = useScope();
  return useQuery({
    queryKey: ['dashboard', 'day-report', key, date ?? 'today'],
    queryFn: () => apiClient.get<DayReport>('/dashboard/day-report', { params: date ? { date } : {} }).then((r) => r.data),
    enabled: on,
    staleTime: 30_000,
    refetchInterval: date ? false : MINUTE,
  });
}

/** `days` 1 = today; more = the daily average over that many days. */
export function useHourlySales(days: number) {
  const { shop, key, on } = useScope();
  return useQuery({
    queryKey: ['dashboard', 'hourly', key, days],
    queryFn: () => apiClient.get<HourlySales>('/retail/dashboard/sales-by-hour', { params: { days, ...(shop ? { shopId: shop } : {}) } }).then((r) => r.data),
    enabled: on,
    staleTime: 30_000,
    refetchInterval: MINUTE,
  });
}

export function useInsights(days: InsightDays, months: 6 | 12 = 6) {
  const { key, on } = useScope();
  return useQuery({
    queryKey: ['dashboard', 'insights', key, days, months],
    queryFn: () => apiClient.get<Insights>('/dashboard/insights', { params: { days, months } }).then((r) => r.data),
    enabled: on,
    staleTime: days === 1 ? MINUTE : 5 * MINUTE,
    placeholderData: (prev) => prev,
  });
}

export function useMoneyMap() {
  const { shop, key, on } = useScope();
  return useQuery({
    queryKey: ['dashboard', 'money-map', key],
    queryFn: () => apiClient.get<MoneyMap>('/retail/dashboard/money-map', { params: shop ? { shopId: shop } : {} }).then((r) => r.data),
    enabled: on,
    staleTime: MINUTE,
    refetchInterval: MINUTE,
  });
}

type ListParams = Record<string, string | number | undefined>;

/** One of the dashboard lists; `params.kind` picks which (top, slow, low, recent). */
export function useDashboardList<T>(params: ListParams & { kind: 'top' | 'slow' | 'low' | 'recent' }) {
  const { key, on } = useScope();
  const clean = Object.fromEntries(Object.entries(params).filter(([, v]) => v !== '' && v !== undefined));
  return useQuery({
    queryKey: ['dashboard', 'list', key, clean],
    queryFn: () => apiClient.get<T>('/dashboard/lists', { params: clean }).then((r) => r.data),
    enabled: on,
    staleTime: 30_000,
    refetchInterval: MINUTE,
    placeholderData: (prev) => prev,
  });
}

export interface Subscription {
  status: 'TRIAL' | 'ACTIVE' | 'PAST_DUE' | 'CANCELLED' | 'EXPIRED' | 'PENDING_PAYMENT';
  trialEndsAt?: string | null;
  plan?: { name?: string };
}

export function useSubscription() {
  const isAuthenticated = useAuthStore((s) => s.isAuthenticated);
  return useQuery({
    queryKey: ['subscription-current'],
    queryFn: () => apiClient.get<Subscription | null>('/subscriptions/current').then((r) => r.data),
    enabled: isAuthenticated,
    staleTime: 5 * 60_000,
  });
}
