import { apiClient } from './client';

export interface Sale {
  id: string;
  saleNumber: string;
  total: number;
  paidAmount: number;
  creditAmount: number;
  paymentMethod: string;
  status: string;
  soldAt: string;
  customer?: { id: string; name: string } | null;
  items?: Array<{
    id: string;
    quantity: number;
    price: number;
    total: number;
    product: { name: string };
  }>;
}

export interface CreateSalePayload {
  items: Array<{ productId: string; quantity: number }>;
  paymentMethod: 'CASH' | 'CARD' | 'JAZZCASH' | 'EASYPAISA' | 'BANK' | 'CREDIT';
  paidAmount?: number;
  customerId?: string;
  discountAmount?: number;
  notes?: string;
}

export interface ListResponse<T> {
  items: T[];
  meta: { page: number; limit: number; total: number; totalPages: number };
}

export const salesApi = {
  list: (params?: { search?: string; page?: number; limit?: number }) =>
    apiClient.get<ListResponse<Sale>>('/sales', { params }).then((r) => r.data),

  byId: (id: string) =>
    apiClient.get<Sale>(`/sales/${id}`).then((r) => r.data),

  create: (payload: CreateSalePayload) =>
    apiClient.post<Sale>('/sales', payload).then((r) => r.data),

  summary: () =>
    apiClient.get<any>('/sales/summary').then((r) => r.data),
};
