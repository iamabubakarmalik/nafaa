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
    phone?: string | null;
  };
  items: PurchaseItem[];
}

export interface PurchaseSummary {
  todayPurchases: number;
  todayCount: number;
  monthPurchases: number;
  totalPurchases: number;
  totalCount: number;
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

function unwrapOne<T>(res: any): T {
  const body = res?.data;
  if (body?.data !== undefined) return body.data as T;
  return body as T;
}

function unwrapArr<T>(res: any): T[] {
  const body = res?.data;
  if (Array.isArray(body)) return body;
  if (Array.isArray(body?.data)) return body.data;
  return [];
}

export const purchasesApi = {
  list: (): Promise<Purchase[]> =>
    apiClient.get('/purchases').then((r) => unwrapArr<Purchase>(r)),
  summary: (): Promise<PurchaseSummary> =>
    apiClient.get('/purchases/summary').then((r) => unwrapOne<PurchaseSummary>(r)),
  create: (payload: CreatePurchasePayload): Promise<Purchase> =>
    apiClient.post('/purchases', payload).then((r) => unwrapOne<Purchase>(r)),
};
