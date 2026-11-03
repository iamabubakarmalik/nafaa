/** Sales history API (same endpoints and shapes as the web): filtered pages of bills, totals for the filter, analytics, one bill. */

import { apiClient } from '@/core/api/client';
import type { SaleRow } from '@/core/offline';

export type HistoryStatus = 'all' | 'active' | 'credit' | 'returned' | 'voided';
export type HistorySort = 'new' | 'old' | 'high' | 'low';
export type PriceTier = 'RETAIL' | 'WHOLESALE' | 'CREDIT';
export type BillTier = PriceTier | 'MIXED';
export type SaleStatus = 'COMPLETED' | 'PARTIALLY_RETURNED' | 'FULLY_RETURNED' | 'VOIDED';

export interface HistoryFilters {
  from: string;
  to: string;
  method?: string;
  status: HistoryStatus;
  source?: string;
  staffId?: string;
  customerId?: string;
  search?: string;
  tier?: BillTier;
  sort: HistorySort;
}

export interface HistoryItem {
  id: string; productId: string | null; name: string; variant: string | null; unit: string; barcode: string | null;
  quantity: number; returnedQty: number; price: number; total: number;
  priceTier?: PriceTier | null;
  retailPrice?: number | null;
  retailPriceIsToday?: boolean;
}

export interface HistorySale {
  id: string; saleNumber: string; soldAt: string; status: SaleStatus;
  source: string; sourceRef: string | null; subtotal: number; discount: number; total: number; paidAmount: number;
  creditAmount: number; changeAmount: number; refundedAmount: number; paymentMethod: string; costOfGoods: number;
  payments?: Array<{ method: string; amount: number; reference?: string | null; note?: string | null }>;
  receivedByName: string | null; staff: string | null;
  customer: { id: string; name: string; phone: string | null } | null;
  shop: { id: string; name: string } | null;
  items: HistoryItem[];
  priceTier?: BillTier | null;
  /** Saved on this phone, waiting for internet. */
  pending?: boolean;
  note?: string | null;
}

export interface HistoryStats {
  bills: number; voided: number; creditCount: number;
  total: number; paid: number; credit: number; discount: number; change: number; refunded: number;
  cogs: number; profit: number; margin: number; average: number; lines: number; qty: number;
  best: { id: string; saleNumber: string; total: number; soldAt: string } | null;
}

export interface HistoryTierTotals {
  RETAIL: { bills: number; total: number };
  WHOLESALE: { bills: number; total: number };
  CREDIT: { bills: number; total: number };
  mixedBills: number;
}

export interface HistoryPage {
  from: string | null; to: string; page: number; limit: number; count: number; hasMore: boolean;
  items: HistorySale[]; stats: HistoryStats;
  tiers?: HistoryTierTotals | null;
}

export interface HistoryAnalytics {
  from: string; to: string; grouping: 'day' | 'month';
  trend: Array<{ key: string; sales: number; profit: number; bills: number }>;
  hours: Array<{ hour: number; sales: number; bills: number }>;
  weekdays: Array<{ day: number; sales: number; bills: number }>;
  payments: Array<{ method: string; total: number; collected: number; bills: number }>;
  sources: Array<{ source: string; total: number; bills: number }>;
  topProducts: Array<{ productId: string; name: string; unit: string; qty: number; revenue: number; lines: number }>;
  topCustomers: Array<{ customerId: string; name: string; phone: string | null; balance: number; total: number; credit: number; bills: number }>;
  staff: Array<{ userId: string; name: string; total: number; bills: number; profit: number }>;
  customers: { walkInBills: number; walkInTotal: number; namedBills: number; namedTotal: number; uniqueCustomers: number; repeatCustomers: number; newCustomers: number };
  previous: { total: number; bills: number; profit: number } | null;
}

const params = (f: HistoryFilters, page?: number, limit?: number) => ({
  from: f.from, to: f.to, method: f.method, status: f.status === 'all' ? undefined : f.status,
  source: f.source, staffId: f.staffId, customerId: f.customerId, search: f.search?.trim() || undefined, tier: f.tier, sort: f.sort, page, limit,
});

export const salesHistoryApi = {
  list: (f: HistoryFilters, page = 1, limit = 30) =>
    apiClient.get<HistoryPage>('/sales/history', { params: params(f, page, limit) }).then((r) => r.data),
  analytics: (f: HistoryFilters) => apiClient.get<HistoryAnalytics>('/sales/history/analytics', { params: params(f) }).then((r) => r.data),
  one: (id: string) => apiClient.get<Record<string, any>>(`/sales/${id}`).then((r) => r.data),
};

/** A bill from the phone's own copy (made offline or in the last 30 days), in the shape of the history list. */
export function rowToHistorySale(s: SaleRow): HistorySale {
  return {
    id: s.id, saleNumber: s.saleNumber, soldAt: s.soldAt, status: (s.status as SaleStatus) || 'COMPLETED', source: 'POS', sourceRef: null,
    subtotal: s.subtotal, discount: s.discount, total: s.total, paidAmount: s.paidAmount, creditAmount: s.creditAmount,
    changeAmount: s.changeAmount, refundedAmount: 0, paymentMethod: s.paymentMethod, payments: s.payments, costOfGoods: 0,
    receivedByName: null, staff: null,
    customer: s.customerId ? { id: s.customerId, name: s.customerName ?? '', phone: null } : null,
    shop: null,
    items: s.items.map((it, i) => ({
      id: it.id ?? `${s.id}-${i}`, productId: it.productId, name: it.name, variant: it.variantName ?? null, unit: it.unit ?? it.unitName ?? 'pcs', barcode: null,
      quantity: it.quantity, returnedQty: it.returnedQty ?? 0, price: it.price, total: it.total,
    })),
    pending: s.pending, note: s.note,
  };
}

/** A bill from GET /sales/:id (items carry the product), in the shape of the history list. */
export function serverSaleToHistory(s: Record<string, any>): HistorySale {
  return {
    id: s.id, saleNumber: s.saleNumber, soldAt: s.soldAt, status: s.status ?? 'COMPLETED', source: s.source ?? 'POS', sourceRef: s.sourceRef ?? null,
    subtotal: Number(s.subtotal) || 0, discount: Number(s.discount) || 0, total: Number(s.total) || 0, paidAmount: Number(s.paidAmount) || 0,
    creditAmount: Number(s.creditAmount) || 0, changeAmount: Number(s.changeAmount) || 0, refundedAmount: Number(s.refundedAmount) || 0,
    paymentMethod: s.paymentMethod, costOfGoods: Number(s.costOfGoods) || 0, payments: s.payments, receivedByName: s.receivedByName ?? null,
    staff: s.createdBy?.fullName ?? null,
    customer: s.customer ? { id: s.customer.id, name: s.customer.name, phone: s.customer.phone ?? null } : null,
    shop: s.shop ? { id: s.shop.id, name: s.shop.name } : null,
    items: (s.items ?? []).map((it: any) => ({
      id: it.id, productId: it.productId ?? null, name: it.product?.name ?? it.name ?? 'Item', variant: it.variant?.name ?? it.variantName ?? null,
      unit: it.unitName ?? it.product?.unit ?? 'pcs', barcode: it.product?.barcode ?? null, quantity: Number(it.quantity) || 0,
      returnedQty: Number(it.returnedQty) || 0, price: Number(it.price) || 0, total: Number(it.total) || 0, priceTier: it.priceTier ?? null,
      retailPrice: it.retailPrice != null ? Number(it.retailPrice) : null,
    })),
    priceTier: s.priceTier ?? null,
  };
}
