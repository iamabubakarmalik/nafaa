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
}

export interface CreatePurchasePayload {
  supplierId: string;
  paymentMethod: PaymentMethod;
  discount?: number;
  paidAmount?: number;
  notes?: string;
  items: Array<{
    productId: string;
    quantity: number;
    costPrice: number;
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

  create: (payload: CreatePurchasePayload) =>
    apiClient.post<{ data: Purchase }>('/purchases', payload).then(unwrap),

  summary: () =>
    apiClient.get<{ data: PurchaseSummary }>('/purchases/summary').then(unwrap),
};
