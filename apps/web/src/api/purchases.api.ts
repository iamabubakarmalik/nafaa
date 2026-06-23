import { apiClient } from './client';
import type { PaymentMethod } from './sales.api';

export interface PurchaseItem {
  id: string;
  quantity: number;
  costPrice: number;
  total: number;
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
  status: 'PENDING' | 'RECEIVED' | 'CANCELLED';
  notes?: string | null;
  purchasedAt: string;
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

export interface CreatePurchasePayload {
  supplierId: string;
  paymentMethod: PaymentMethod;
  discount?: number;
  paidAmount?: number;
  notes?: string;
  shopId?: string;
  items: Array<{
    productId: string;
    quantity: number;
    costPrice: number;
    rolls?: PurchaseRollPayload[];
  }>;
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
};
