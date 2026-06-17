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
  variant?: { id: string; name: string; color?: string | null } | null;
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
  };
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
  monthPurchases: number;
  totalPurchases: number;
  totalCount: number;
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
