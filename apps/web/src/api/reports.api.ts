import { apiClient } from './client';

export interface SalesTrendPoint {
  date: string;
  sales: number;
  profit: number;
  orders: number;
}

export interface TopProduct {
  productId: string;
  product?: {
    id: string;
    name: string;
    sku?: string | null;
    unit: string;
    price: number;
  };
  quantitySold: number;
  revenue: number;
  orderCount: number;
}

export interface CategoryBreakdown {
  name: string;
  color: string;
  revenue: number;
  quantity: number;
}

export interface PaymentMethodBreakdown {
  paymentMethod: string;
  total: number;
  count: number;
}

const unwrap = <T>(res: { data: { data: T } }): T => res.data.data;

export const reportsApi = {
  salesTrend: (days = 14) =>
    apiClient.get<{ data: SalesTrendPoint[] }>('/reports/sales-trend', { params: { days } }).then(unwrap),
  topProducts: (limit = 10) =>
    apiClient.get<{ data: TopProduct[] }>('/reports/top-products', { params: { limit } }).then(unwrap),
  categoryBreakdown: () =>
    apiClient.get<{ data: CategoryBreakdown[] }>('/reports/category-breakdown').then(unwrap),
  paymentMethods: () =>
    apiClient.get<{ data: PaymentMethodBreakdown[] }>('/reports/payment-methods').then(unwrap),
};
