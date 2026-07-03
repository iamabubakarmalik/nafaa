import { apiClient } from './client';

export type ProfitPeriod = 'today' | 'week' | 'month' | 'quarter' | 'year' | 'all' | 'custom';
export type ProfitSortBy = 'profit' | 'margin' | 'revenue' | 'quantity';
export type IndustryType = 'STANDARD' | 'CARPET' | 'MOBILE' | 'WEIGHT_BASED';

export interface ProfitFilters {
  period?: ProfitPeriod;
  startDate?: string;
  endDate?: string;
  categoryId?: string;
  brandId?: string;
  sortBy?: ProfitSortBy;
}

export interface ProductProfit {
  productId: string;
  name: string;
  sku: string | null;
  barcode: string | null;
  primaryImage: string | null;
  categoryName: string | null;
  categoryColor: string | null;
  brandName: string | null;
  unit: string;
  industryType: IndustryType;
  quantitySold: number;
  ordersCount: number;
  revenue: number;
  cost: number;
  profit: number;
  margin: number;
  avgSellPrice: number;
  avgCostPrice: number;
  returnedQty: number;
  returnedAmount: number;
  variantCount: number;
  topVariants?: Array<{
    name: string;
    quantity: number;
    profit: number;
  }>;
}

export interface CategoryBreakdown {
  name: string;
  color: string | null;
  profit: number;
  revenue: number;
  count: number;
  margin: number;
}

export interface BrandBreakdown {
  name: string;
  profit: number;
  revenue: number;
  count: number;
}

export interface ProfitSummary {
  totalRevenue: number;
  totalCost: number;
  totalProfit: number;
  overallMargin: number;
  productsCount: number;
  totalQtySold: number;
  totalOrders: number;
  totalReturns: number;
  carpetCount: number;
  mobileCount: number;
  standardCount: number;
  topProfitable: ProductProfit[];
  leastProfitable: ProductProfit[];
  losses: ProductProfit[];
  categoryBreakdown: CategoryBreakdown[];
  brandBreakdown: BrandBreakdown[];
  highestMargin: ProductProfit[];
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

const buildParams = (filters?: ProfitFilters) => ({
  period: filters?.period,
  startDate: filters?.startDate,
  endDate: filters?.endDate,
  categoryId: filters?.categoryId,
  brandId: filters?.brandId,
  sortBy: filters?.sortBy,
});

export const profitReportApi = {
  byProduct: (filters?: ProfitFilters): Promise<ProductProfit[]> =>
    apiClient
      .get('/profit-report/by-product', { params: buildParams(filters) })
      .then((r) => unwrapArr<ProductProfit>(r)),
  summary: (filters?: ProfitFilters): Promise<ProfitSummary> =>
    apiClient
      .get('/profit-report/summary', { params: buildParams(filters) })
      .then((r) => unwrapOne<ProfitSummary>(r)),
};
