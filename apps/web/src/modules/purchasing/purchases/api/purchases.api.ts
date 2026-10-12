import { apiClient } from '@core/api/client';
import type { ShopStamp } from '@core/lib/shopScope';
import type { PaymentMethod } from '@modules/sales/sales/api/sales.api';

export interface PurchaseItem {
  id: string;
  /** In the unit it was bought in (see unitName / conversionRate). */
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
  /** Base units ordered, received and sent back. */
  baseQuantity?: number;
  receivedQty?: number;
  returnedQty?: number;
  batchNo?: string | null;
  expiryDate?: string | null;
  ingredient?: { id: string; name: string; unit: string; currentStock: number } | null;
  /** Missing on raw-material lines. */
  product: {
    id: string;
    name: string;
    unit: string;
    sku?: string | null;
    images?: Array<{ url: string }>;
  };
}

export interface PurchaseCarpetRoll {
  id: string;
  rollNumber: string;
  designCode?: string | null;
  widthFt: number;
  widthInch: number;
  originalLengthFt: number;
  remainingLengthFt: number;
  originalSqft: number;
  remainingSqft: number;
  costPerSqft: number;
  salePricePerSqft: number;
  status: string;
  product: { id: string; name: string };
  variant?: {
    id: string;
    name: string;
    color?: string | null;
    colorHex?: string | null;
  } | null;
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
  receivedValue?: number;
  returnedAmount?: number;
  dueDate?: string | null;
  expectedAt?: string | null;
  receivedAt?: string | null;
  cancelledAt?: string | null;
  cancelReason?: string | null;
  returns?: Array<{ id: string; returnNumber: string; total: number; reason?: string | null; createdAt: string; items: Array<{ purchaseItemId: string; quantity: number; amount: number }> }>;
  supplier: {
    id: string;
    name: string;
    phone?: string | null;
    email?: string | null;
    address?: string | null;
    contactPerson?: string | null;
  };
  createdBy?: {
    id: string;
    fullName: string;
    email: string;
  } | null;
  /** Kis branch/godown mein maal aaya */
  shop?: ShopStamp | null;
  items: PurchaseItem[];
  carpetRolls?: PurchaseCarpetRoll[];
  createdRollsByItem?: Record<string, string[]>;
}

/**
 * Carpet roll details that can be attached to a purchase item.
 * If provided, system auto-creates CarpetRoll entries on purchase receive.
 */
export interface PurchaseRollPayload {
  rollNumber?: string;
  designCode?: string;
  widthFt: number;
  widthInch?: number;
  lengthFt: number;
  costPerSqft?: number;
  salePricePerSqft?: number;
  wholesalePricePerSqft?: number;
  variantId?: string;
  rackNumber?: string;
  notes?: string;
  quality?: string;
  pile?: string;
}

export type PurchaseStatus = 'PENDING' | 'PARTIAL' | 'RECEIVED' | 'CANCELLED';

export interface PurchaseLinePayload {
  productId?: string;
  variantId?: string;
  ingredientId?: string;
  unitId?: string;
  unitName?: string;
  conversionRate?: number;
  quantity: number;
  /** Cost of one unit as bought. */
  costPrice: number;
  /** New selling price of one base unit. */
  salePrice?: number;
  batchNo?: string;
  expiryDate?: string;
  rolls?: PurchaseRollPayload[];
}

export interface CreatePurchasePayload {
  supplierId: string;
  paymentMethod: PaymentMethod;
  discount?: number;
  otherCharges?: number;
  taxAmount?: number;
  /** Missing = paid in full. */
  paidAmount?: number;
  notes?: string;
  shopId?: string;
  supplierInvoiceNo?: string;
  purchasedAt?: string;
  dueDate?: string;
  expectedAt?: string;
  /** false = an order; goods come later. */
  receive?: boolean;
  items: PurchaseLinePayload[];
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
  shop?: ShopStamp | null;
  items: Array<{ id: string; itemName: string; quantity: number; unitName: string; productId?: string | null; ingredientId?: string | null; baseQuantity: number; receivedQty: number }>;
}

export interface PurchaseListQuery {
  from?: string;
  to?: string;
  status?: 'all' | PurchaseStatus | 'credit' | 'returned';
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
  todayPaid: number;
  yesterdayPurchases: number;
  growthVsYesterday: number;
  monthPurchases: number;
  monthCount: number;
  monthPaid: number;
  lastMonthPurchases: number;
  growthVsLastMonth: number;
  totalPurchases: number;
  totalPaid: number;
  totalCount: number;
  outstandingDue: number;
  suppliersWithDue: number;
  openOrders?: number;
  openOrdersValue?: number;
  salesTrend7Days: Array<{ date: string; total: number; orders: number }>;
  paymentBreakdown: Array<{ paymentMethod: string; total: number; count: number }>;
  topSuppliers: Array<{
    supplierId: string;
    supplier?: {
      id: string;
      name: string;
      phone?: string | null;
      totalPurchased: number;
      outstandingDue: number;
    };
    totalSpent: number;
    orderCount: number;
  }>;
  topProducts: Array<{
    productId: string;
    product?: {
      id: string;
      name: string;
      sku?: string | null;
      unit: string;
      costPrice: number;
      images?: Array<{ url: string }>;
    };
    quantityPurchased: number;
    totalSpent: number;
    orderCount: number;
  }>;
  recentPurchases: Array<{
    id: string;
    purchaseNumber: string;
    total: number;
    supplierName?: string;
    purchasedAt: string;
  }>;
}

const unwrap = <T>(res: { data: { data: T } }): T => res.data.data;

export const purchasesApi = {
  list: () =>
    apiClient.get<{ data: Purchase[] }>('/purchases').then(unwrap),

  getOne: (id: string) =>
    apiClient.get<{ data: Purchase }>(`/purchases/${id}`).then(unwrap),

  create: (payload: CreatePurchasePayload) =>
    apiClient.post<{ data: Purchase }>('/purchases', payload).then(unwrap),

  summary: () =>
    apiClient.get<{ data: PurchaseSummary }>('/purchases/summary').then(unwrap),

  page: (q: PurchaseListQuery) =>
    apiClient.get<{ data: PurchaseList }>('/purchases/list', { params: q }).then(unwrap),

  /** Goods of an order arriving; quantities in each line's own unit. */
  receive: (id: string, body: { items: Array<{ itemId: string; quantity: number }>; paidAmount?: number; paymentMethod?: PaymentMethod; close?: boolean }) =>
    apiClient.post<{ data: { received: number; status: PurchaseStatus } }>(`/purchases/${id}/receive`, body).then(unwrap),

  returnGoods: (id: string, body: { items: Array<{ itemId: string; quantity: number }>; reason?: string }) =>
    apiClient.post<{ data: { returnNumber: string; total: number } }>(`/purchases/${id}/return`, body).then(unwrap),

  cancel: (id: string, reason: string) =>
    apiClient.post<{ data: { cancelled: boolean } }>(`/purchases/${id}/cancel`, { reason }).then(unwrap),
};
