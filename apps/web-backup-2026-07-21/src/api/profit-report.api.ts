import { apiClient } from './client';

export type ProfitPeriod = 'today' | 'week' | 'month' | 'quarter' | 'year' | 'all';
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

const unwrap = <T>(res: { data: { data: T } }): T => res.data.data;

const buildParams = (filters?: ProfitFilters) => ({
  period: filters?.period,
  startDate: filters?.startDate,
  endDate: filters?.endDate,
  categoryId: filters?.categoryId,
  brandId: filters?.brandId,
  sortBy: filters?.sortBy,
});

export const profitReportApi = {
  byProduct: (filters?: ProfitFilters) =>
    apiClient
      .get<{ data: ProductProfit[] }>('/profit-report/by-product', {
        params: buildParams(filters),
      })
      .then(unwrap),

  summary: (filters?: ProfitFilters) =>
    apiClient
      .get<{ data: ProfitSummary }>('/profit-report/summary', {
        params: buildParams(filters),
      })
      .then(unwrap),
};
