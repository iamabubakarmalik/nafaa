/**
 * Purchases and orders (same endpoints and shapes as the web). Creating a
 * purchase goes through the offline engine (enqueuePurchase); the rest of
 * the actions need the server.
 */

import type { LandedCostPayload, LandedMethod, LandedKind } from '@nafaa/core/inventory';
import { apiClient } from '@/core/api/client';
import type { PaymentMethod } from '@/core/offline';

export type { LandedCostPayload, LandedMethod, LandedKind };
export type PurchaseStatus = 'PENDING' | 'PARTIAL' | 'RECEIVED' | 'CANCELLED';

export interface PurchaseItem {
  id: string;
  quantity: number;
  costPrice: number;
  total: number;
  productId?: string | null;
  variantId?: string | null;
  ingredientId?: string | null;
  itemName?: string;
  unitId?: string | null;
  unitName?: string;
  conversionRate?: number;
  baseQuantity?: number;
  receivedQty?: number;
  returnedQty?: number;
  batchNo?: string | null;
  expiryDate?: string | null;
  landedCost?: number;
  weightKg?: number | null;
  ingredient?: { id: string; name: string; unit: string } | null;
  product?: { id: string; name: string; unit: string; sku?: string | null; images?: Array<{ url: string }> } | null;
  variant?: { id: string; name: string } | null;
}

export interface PurchaseLandedCost {
  id: string; kind: LandedKind; label: string | null; amount: number; currency: string | null; foreignAmount: number | null; exchangeRate: number | null;
  paidTo: string | null; method: LandedMethod; afterReceipt: boolean; soldShare: number; createdAt: string;
}

export interface LandedCostResult {
  total: number; method: LandedMethod; afterReceipt: boolean; soldShare: number;
  lines: Array<{ itemId: string; itemName: string; share: number; perUnit: number; onHand: number; added: number; soldShare: number; newCost: number | null }>;
}

export interface Purchase {
  id: string;
  purchaseNumber: string;
  subtotal: number;
  discount: number;
  total: number;
  paidAmount: number;
  paymentMethod: PaymentMethod;
  status: PurchaseStatus;
  notes?: string | null;
  purchasedAt: string;
  supplierInvoiceNo?: string | null;
  otherCharges?: number;
  taxAmount?: number;
  landedCost?: number;
  landedCostMethod?: LandedMethod | null;
  landedCosts?: PurchaseLandedCost[];
  receivedValue?: number;
  returnedAmount?: number;
  dueDate?: string | null;
  expectedAt?: string | null;
  receivedAt?: string | null;
  cancelledAt?: string | null;
  cancelReason?: string | null;
  returns?: Array<{ id: string; returnNumber: string; total: number; reason?: string | null; createdAt: string }>;
  supplier: { id: string; name: string; phone?: string | null; email?: string | null; address?: string | null; contactPerson?: string | null };
  createdBy?: { id: string; fullName: string } | null;
  shop?: { id: string; name: string } | null;
  items: PurchaseItem[];
}

export interface PurchaseListRow {
  id: string;
  purchaseNumber: string;
  supplierInvoiceNo?: string | null;
  status: PurchaseStatus;
  total: number;
  receivedValue: number;
  paidAmount: number;
  returnedAmount: number;
  paymentMethod: PaymentMethod;
  purchasedAt: string;
  expectedAt?: string | null;
  dueDate?: string | null;
  supplier: { id: string; name: string; phone?: string | null };
  shop?: { id: string; name: string } | null;
  items: Array<{ id: string; itemName: string; quantity: number; unitName: string; productId?: string | null; ingredientId?: string | null; baseQuantity: number; receivedQty: number }>;
}

export type PurchaseStatusFilter = 'all' | PurchaseStatus | 'credit' | 'returned';

export interface PurchaseListQuery {
  from?: string;
  to?: string;
  status?: PurchaseStatusFilter;
  supplierId?: string;
  search?: string;
  page?: number;
  limit?: number;
}

export interface PurchaseList {
  items: PurchaseListRow[];
  total: number;
  page: number;
  pages: number;
  totals: { value: number; paid: number; returned: number };
}

export interface PurchaseSummary {
  todayPurchases: number;
  todayCount: number;
  monthPurchases: number;
  monthCount: number;
  lastMonthPurchases: number;
  outstandingDue: number;
  suppliersWithDue: number;
  openOrders?: number;
  openOrdersValue?: number;
  salesTrend7Days: Array<{ date: string; total: number; orders: number }>;
  topSuppliers: Array<{ supplierId: string; supplier?: { id: string; name: string }; totalSpent: number; orderCount: number }>;
  topProducts: Array<{ productId: string; name?: string; product?: { name: string; unit: string }; quantityPurchased: number; totalSpent: number }>;
}

export interface PurchaseAnalytics {
  range: { from: string; to: string; byMonth: boolean };
  totals: { value: number; paid: number; credit: number; returned: number; bills: number; avgBill: number; suppliers: number; items: number; prevValue: number; prevBills: number; growth: number };
  trend: Array<{ key: string; label: string; value: number; paid: number; bills: number }>;
  weekday: Array<{ day: number; value: number; bills: number }>;
  suppliers: Array<{ id: string; name: string; value: number; paid: number; bills: number; share: number }>;
  categories: Array<{ name: string; color: string | null; value: number }>;
  items: Array<{ name: string; unit: string; value: number; qty: number; bills: number; avgCost: number; raw: boolean }>;
  costRises: Array<{ name: string; unit: string; first: number; last: number; change: number }>;
  payments: Array<{ method: string; value: number; bills: number }>;
  units: Array<{ unit: string; lines: number; value: number }>;
  returns: { count: number; total: number };
  openOrders: { count: number; value: number; late: number; list: Array<{ id: string; number: string; supplier: string; value: number; expectedAt: string | null; late: boolean }> };
}

export const purchasesApi = {
  getOne: (id: string) => apiClient.get<Purchase>(`/purchases/${id}`).then((r) => r.data),
  summary: () => apiClient.get<PurchaseSummary>('/purchases/summary').then((r) => r.data),
  analytics: (range?: { from: string; to: string } | null) => apiClient.get<PurchaseAnalytics>('/purchases/analytics', { params: range ?? undefined }).then((r) => r.data),
  page: (q: PurchaseListQuery) => apiClient.get<PurchaseList>('/purchases/list', { params: q }).then((r) => r.data),
  /** Goods of an order arriving; quantities in each line's own unit. */
  receive: (id: string, body: { items: Array<{ itemId: string; quantity: number }>; paidAmount?: number; paymentMethod?: PaymentMethod; close?: boolean }) =>
    apiClient.post<{ received: number; status: PurchaseStatus }>(`/purchases/${id}/receive`, body).then((r) => r.data),
  returnGoods: (id: string, body: { items: Array<{ itemId: string; quantity: number }>; reason?: string }) =>
    apiClient.post<{ returnNumber: string; total: number }>(`/purchases/${id}/return`, body).then((r) => r.data),
  cancel: (id: string, reason: string) => apiClient.post<{ cancelled: boolean }>(`/purchases/${id}/cancel`, { reason }).then((r) => r.data),
  addLandedCosts: (id: string, body: { costs: LandedCostPayload[]; method: LandedMethod; weights?: Array<{ itemId: string; weightKg: number }> }) =>
    apiClient.post<LandedCostResult>(`/purchases/${id}/landed-costs`, body).then((r) => r.data),
  removeLandedCost: (id: string, costId: string) => apiClient.delete<{ removed: boolean; total: number }>(`/purchases/${id}/landed-costs/${costId}`).then((r) => r.data),
};

/** Expense for the landed-cost share that fell on goods already sold (same call as the web). */
export const expenseApi = {
  create: (body: { title: string; description?: string; amount: number; paymentMethod: string; shopId?: string }) =>
    apiClient.post('/expenses', body).then((r) => r.data),
};
