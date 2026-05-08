import { apiClient } from './client';

export interface ProductProfit {
  productId: string;
  name: string;
  sku: string | null;
  categoryName: string | null;
  categoryColor: string | null;
  unit: string;
  quantitySold: number;
  revenue: number;
  cost: number;
  profit: number;
  margin: number;
}

export interface ProfitSummary {
  totalRevenue: number;
  totalCost: number;
  totalProfit: number;
  overallMargin: number;
  productsCount: number;
  topProfitable: ProductProfit[];
  leastProfitable: ProductProfit[];
}

const unwrap = <T>(res: { data: { data: T } }): T => res.data.data;

export const profitReportApi = {
  byProduct: () =>
    apiClient.get<{ data: ProductProfit[] }>('/profit-report/by-product').then(unwrap),
  summary: () =>
    apiClient.get<{ data: ProfitSummary }>('/profit-report/summary').then(unwrap),
};
