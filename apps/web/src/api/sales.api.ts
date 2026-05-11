import { apiClient } from './client';

export type PaymentMethod =
  | 'CASH'
  | 'CARD'
  | 'BANK_TRANSFER'
  | 'JAZZCASH'
  | 'EASYPAISA';

export interface CreateSalePayload {
  customerId?: string;
  paymentMethod: PaymentMethod;
  paidAmount: number;
  discount?: number;
  items: Array<{
    productId: string;
    quantity: number;
  }>;
}

export interface Sale {
  id: string;
  saleNumber: string;
  subtotal: number;
  discount: number;
  total: number;
  paidAmount: number;
  changeAmount: number;
  paymentMethod: PaymentMethod;
  soldAt: string;
  status?: 'COMPLETED' | 'PARTIALLY_RETURNED' | 'FULLY_RETURNED' | 'VOIDED';
  customer?: {
    id: string;
    name: string;
    phone?: string | null;
  } | null;
  createdBy?: {
    id: string;
    fullName: string;
    email: string;
  } | null;
  tenant?: {
    id: string;
    name: string;
    slug: string;
    phone?: string | null;
    country: string;
    currency: string;
  };
  items: Array<{
    id: string;
    quantity: number;
    price: number;
    total: number;
    product: {
      id: string;
      name: string;
      unit: string;
      sku?: string | null;
      barcode?: string | null;
    };
  }>;
}

export interface SalesSummary {
  todaySales: number;
  todayOrders: number;
  monthSales: number;
  totalSales: number;
  totalOrders: number;
  paymentBreakdown: Array<{
    paymentMethod: PaymentMethod;
    _count: { _all: number };
    _sum: { total: number | null };
  }>;
}

const unwrap = <T>(res: { data: { data: T } }): T => res.data.data;

export const salesApi = {
  create: (payload: CreateSalePayload) =>
    apiClient.post<{ data: Sale }>('/sales', payload).then(unwrap),

  list: () =>
    apiClient.get<{ data: Sale[] }>('/sales').then(unwrap),

  summary: () =>
    apiClient.get<{ data: SalesSummary }>('/sales/summary').then(unwrap),

  getOne: (id: string) =>
    apiClient.get<{ data: Sale }>(`/sales/${id}`).then(unwrap),

  voidSale: (id: string, reason?: string) =>
    apiClient.post<{ data: any }>(`/sales/${id}/void`, { reason }).then(unwrap),
};
