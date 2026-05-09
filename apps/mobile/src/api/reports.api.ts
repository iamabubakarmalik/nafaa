import { apiClient } from './client';

export interface ReportSummary {
  totalRevenue: number;
  totalProfit: number;
  totalSales: number;
  totalCustomers: number;
  dailyTrend: Array<{ date: string; revenue: number }>;
  topProducts: Array<{ id: string; name: string; sold: number; revenue: number }>;
}

export const reportsApi = {
  summary: async (period: '7d' | '30d' | '90d' = '30d'): Promise<ReportSummary> => {
    const days = period === '7d' ? 7 : period === '30d' ? 30 : 90;

    const [trend, top, profit] = await Promise.all([
      apiClient.get<any>('/reports/sales-trend', { params: { days } }).then((r) => r.data).catch(() => []),
      apiClient.get<any>('/reports/top-products', { params: { days, limit: 10 } }).then((r) => r.data).catch(() => []),
      apiClient.get<any>('/profit-report/summary', { params: { days } }).then((r) => r.data).catch(() => ({})),
    ]);

    const trendArr: any[] = Array.isArray(trend) ? trend : (trend?.items ?? []);
    const topArr: any[] = Array.isArray(top) ? top : (top?.items ?? []);

    return {
      totalRevenue: profit?.totalRevenue ?? trendArr.reduce((s, t) => s + (t.revenue ?? 0), 0),
      totalProfit: profit?.totalProfit ?? 0,
      totalSales: profit?.totalSales ?? trendArr.reduce((s, t) => s + (t.count ?? t.salesCount ?? 0), 0),
      totalCustomers: profit?.totalCustomers ?? 0,
      dailyTrend: trendArr.map((t: any) => ({
        date: t.date ?? t.day,
        revenue: t.revenue ?? t.total ?? 0,
      })),
      topProducts: topArr.map((p: any) => ({
        id: p.id ?? p.productId,
        name: p.name ?? p.product?.name ?? 'Unknown',
        sold: p.sold ?? p.quantity ?? p.totalSold ?? 0,
        revenue: p.revenue ?? p.total ?? 0,
      })),
    };
  },
};
