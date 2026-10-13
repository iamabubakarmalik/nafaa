/**
 * Branches API: the list and editing, today's figures per branch
 * (`analytics`, `overview`) and the period comparison (`compare`). Cost,
 * profit and stock-value fields are 0 or missing for users without cost
 * access; `costHidden` says so.
 */

import { apiClient } from '@core/api/client';

export type ShopType = 'SHOP' | 'WAREHOUSE' | 'GODOWN';

export interface Shop {
  id: string;
  name: string;
  address?: string | null;
  phone?: string | null;
  isMain: boolean;
  isActive: boolean;
  type: ShopType;
  createdAt: string;
  _count?: {
    users?: number;
    sales?: number;
    shopStocks?: number;
    cashRegisters?: number;
  };
}

/** Sales are net of returns; net profit is gross profit − paid expenses − write-offs. */
export interface ShopWithOverview extends Shop {
  todaySales: number;
  todayProfit: number;
  todayOrders: number;
  todayPaid: number;
  todayCredit: number;
  todayRefunds: number;
  monthSales: number;
  monthProfit: number;
  monthOrders: number;
  lowStockCount: number;
  totalStock: number;
  /** Stock at cost; missing without cost access. */
  stockValue?: number;
  /** Stock at sale price. */
  stockRetailValue: number;
  registerOpen: boolean;
  openDrawers: number;
  /** Live cash in all open drawers of the branch. */
  registerBalance: number;
  registerOpening: number;
  registerOpenedAt: string | null;
}

/** One branch in the all-branches view. */
export interface ShopAnalyticsRow extends ShopWithOverview {
  yesterdaySales: number;
  /** Today against yesterday, in percent. */
  growthVsYesterday: number;
  weekSales: number;
  weekProfit: number;
  weekOrders: number;
  weekExpenses: number;
  weekNetProfit: number;
  avgOrderValue: number;
  todayExpenses: number;
  monthExpenses: number;
  todayWriteOff: number;
  monthWriteOff: number;
  todayNetProfit: number;
  monthNetProfit: number;
  /** Khata still owed to this branch. */
  outstandingCredit: number;
  staffCount: number;
  /** People with an open drawer or checked in today. */
  staffOnDuty: number;
  onDutyNames: string[];
  /** Share of this month's sales across branches, in percent. */
  monthShare: number;
  /** 1 = highest sales this month. */
  rank: number;
}

export interface ShopAnalyticsTotals {
  todaySales: number;
  todayOrders: number;
  todayNetProfit: number;
  todayExpenses: number;
  monthSales: number;
  monthNetProfit: number;
  outstandingCredit: number;
  lowStockCount: number;
  totalStock: number;
  stockValue?: number;
  registersOpen: number;
  drawerCash: number;
  staffCount: number;
  staffOnDuty: number;
  shopCount: number;
}

export interface ShopAnalytics {
  shops: ShopAnalyticsRow[];
  totals: ShopAnalyticsTotals;
  best: ShopAnalyticsRow | null;
  costHidden: boolean;
  /** Today's business day. */
  day: string;
  needsAttention: Array<{ shopId: string; name: string; reasons: string[] }>;
}

/** A branch's figures for a chosen period. Cost fields are missing without cost access. */
export interface BranchFigures {
  id: string;
  name: string;
  type: ShopType;
  isMain: boolean;
  bills: number;
  gross: number;
  refunds: number;
  net: number;
  discount: number;
  cashIn: number;
  credit: number;
  cost?: number;
  grossProfit?: number;
  expenses: number;
  writeOff: number;
  netProfit?: number;
  margin?: number;
  avgBill: number;
  /** Share of the period's sales, in percent. */
  share: number;
  prev: { bills: number; net: number; netProfit: number };
  /** Sales against the previous period, in percent. */
  growth: number;
}

export interface BranchComparison {
  range: { from: string; to: string; days: number };
  previous: { from: string; to: string };
  costHidden: boolean;
  shops: BranchFigures[];
  totals: {
    bills: number; gross: number; refunds: number; net: number; discount: number; cashIn: number; credit: number;
    cost?: number; grossProfit?: number; expenses: number; writeOff: number; netProfit?: number;
    prevNet: number; prevNetProfit: number; prevBills: number;
  };
  /** One row per business day: `day` plus net sales keyed by branch id. */
  trend: Array<Record<string, number | string>>;
  /** One row per hour (0–23): bills keyed by branch id. */
  hours: Array<Record<string, number>>;
}

export interface CreateShopPayload {
  name: string;
  address?: string;
  phone?: string;
  isMain?: boolean;
  type?: ShopType;
  managerName?: string;
  managerEmail?: string;
  managerPhone?: string;
  managerPassword?: string;
}

export interface UpdateShopPayload {
  name?: string;
  address?: string;
  phone?: string;
  isMain?: boolean;
  type?: ShopType;
  isActive?: boolean;
}

/**
 * Structured error from backend for shop deletion
 */
export interface ShopDeleteError {
  message: string;
  code:
    | 'MAIN_SHOP_PROTECTED'
    | 'HAS_FINANCIAL_HISTORY'
    | 'HAS_SALES_HISTORY'
    | 'HAS_PENDING_TRANSFERS'
    | 'HAS_OPEN_REGISTER';
  suggestion:
    | 'DEACTIVATE'
    | 'DEACTIVATE_OR_SET_ANOTHER_AS_MAIN'
    | 'COMPLETE_TRANSFERS_FIRST'
    | 'CLOSE_REGISTER_FIRST';
  stats?: {
    sales?: number;
    purchases?: number;
    expenses?: number;
    ledgerEntries?: number;
    users?: number;
    products?: number;
    registers?: number;
  };
}

const unwrap = <T>(res: { data: { data: T } }): T => res.data.data;

export const shopsApi = {
  list: () => apiClient.get<{ data: Shop[] }>('/shops').then(unwrap),
  /** Per-branch rows. Carries every analytics field — see ShopAnalyticsRow. */
  overview: () => apiClient.get<{ data: ShopAnalyticsRow[] }>('/shops/overview').then(unwrap),

  /** Every branch today, this week and this month, with totals. */
  analytics: () =>
    apiClient.get<{ data: ShopAnalytics }>('/shops/analytics').then(unwrap),
  /** Branches side by side for business days `from`–`to`. */
  compare: (p: { from: string; to: string }) =>
    apiClient.get<{ data: BranchComparison }>('/shops/compare', { params: p }).then(unwrap),
  get: (id: string) => apiClient.get<{ data: Shop }>(`/shops/${id}`).then(unwrap),
  create: (payload: CreateShopPayload) =>
    apiClient.post<{ data: Shop & { manager?: { id: string; fullName: string; email: string } | null; productsBackfilled?: number } }>('/shops', payload).then(unwrap),
  update: (id: string, payload: UpdateShopPayload) =>
    apiClient.patch<{ data: Shop }>(`/shops/${id}`, payload).then(unwrap),
  toggleActive: (id: string) =>
    apiClient.patch<{ data: Shop }>(`/shops/${id}/toggle`).then(unwrap),
  remove: (id: string) =>
    apiClient.delete<{ data: { message: string } }>(`/shops/${id}`).then(unwrap),
};
