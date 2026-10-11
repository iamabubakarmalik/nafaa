/** Sales history API: filtered pages of bills, totals and analytics. */

import { apiClient } from '@core/api/client';
import type { PaymentMethod } from '@modules/sales/sales/api/sales.api';

export type HistoryStatus = 'all' | 'active' | 'credit' | 'returned' | 'voided';
export type HistorySort = 'new' | 'old' | 'high' | 'low';

export interface HistoryFilters {
  /** Business-day keys (YYYY-MM-DD); from = 'all' for no lower bound. */
  from: string;
  to: string;
  method?: PaymentMethod;
  status: HistoryStatus;
  source?: string;
  staffId?: string;
  search?: string;
  sort: HistorySort;
}

export interface HistoryItem {
  id: string; productId: string | null; name: string; variant: string | null; unit: string; barcode: string | null;
  quantity: number; returnedQty: number; price: number; total: number;
}

export interface HistorySale {
  id: string; saleNumber: string; soldAt: string; status: 'COMPLETED' | 'PARTIALLY_RETURNED' | 'FULLY_RETURNED' | 'VOIDED';
  source: string; sourceRef: string | null; subtotal: number; discount: number; total: number; paidAmount: number;
  creditAmount: number; changeAmount: number; refundedAmount: number; paymentMethod: PaymentMethod; costOfGoods: number;
  receivedByName: string | null; staff: string | null;
  customer: { id: string; name: string; phone: string | null } | null;
  shop: { id: string; name: string } | null;
  items: HistoryItem[];
  /** Saved on this device, waiting for internet. */
  pending?: boolean;
}

export interface HistoryStats {
  bills: number; voided: number; creditCount: number;
  total: number; paid: number; credit: number; discount: number; change: number; refunded: number;
  cogs: number; profit: number; margin: number; average: number; lines: number; qty: number;
  best: { id: string; saleNumber: string; total: number; soldAt: string } | null;
}

export interface HistoryPage {
  from: string | null; to: string; page: number; limit: number; count: number; hasMore: boolean;
  items: HistorySale[]; stats: HistoryStats;
}

export interface HistoryAnalytics {
  from: string; to: string; grouping: 'day' | 'month';
  trend: Array<{ key: string; sales: number; profit: number; bills: number }>;
  hours: Array<{ hour: number; sales: number; bills: number }>;
  weekdays: Array<{ day: number; sales: number; bills: number }>;
  payments: Array<{ method: PaymentMethod; total: number; collected: number; bills: number }>;
  sources: Array<{ source: string; total: number; bills: number }>;
  topProducts: Array<{ productId: string; name: string; unit: string; qty: number; revenue: number; lines: number }>;
  topCustomers: Array<{ customerId: string; name: string; phone: string | null; balance: number; total: number; credit: number; bills: number }>;
  staff: Array<{ userId: string; name: string; total: number; bills: number; profit: number }>;
  /** Bill counts by weekday (0 = Sunday) and hour. */
  heatmap: number[][];
  categories: Array<{ id: string | null; name: string; color: string | null; revenue: number; qty: number; products: number }>;
  customers: {
    walkInBills: number; walkInTotal: number; namedBills: number; namedTotal: number;
    uniqueCustomers: number; repeatCustomers: number; newCustomers: number;
  };
  /** The same length of time just before this range; null for "all time". */
  previous: { total: number; bills: number; profit: number } | null;
}

const params = (f: HistoryFilters, page?: number, limit?: number) => ({
  from: f.from, to: f.to, method: f.method, status: f.status === 'all' ? undefined : f.status,
  source: f.source, staffId: f.staffId, search: f.search?.trim() || undefined, sort: f.sort, page, limit,
});

export const salesHistoryApi = {
  list: (f: HistoryFilters, page = 1, limit = 50) =>
    apiClient.get<{ data: HistoryPage }>('/sales/history', { params: params(f, page, limit) }).then((r) => r.data.data),
  analytics: (f: HistoryFilters) =>
    apiClient.get<{ data: HistoryAnalytics }>('/sales/history/analytics', { params: params(f) }).then((r) => r.data.data),
};
