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

export const profitReportApi = {
  byProduct: (): Promise<ProductProfit[]> =>
    apiClient.get('/profit-report/by-product').then((r) => unwrapArr<ProductProfit>(r)),
  summary: (): Promise<ProfitSummary> =>
    apiClient.get('/profit-report/summary').then((r) => unwrapOne<ProfitSummary>(r)),
};
