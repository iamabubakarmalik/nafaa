import { apiClient } from './client';

export interface DashboardStats {
  todaySales: number;
  todayOrders: number;
  totalCustomers: number;
  lowStockCount: number;
  totalRevenue: number;
  recentSales: Array<{
    id: string;
    saleNumber: string;
    total: number;
    customerName?: string;
    soldAt: string;
  }>;
}

export const dashboardApi = {
  stats: async (): Promise<DashboardStats> => {
    const d: any = await apiClient.get('/dashboard/overview').then((r) => r.data);

    return {
      todaySales: d?.today?.revenue ?? d?.todaySales ?? 0,
      todayOrders: d?.today?.salesCount ?? d?.today?.orders ?? d?.todayOrders ?? 0,
      totalCustomers: d?.totals?.customers ?? d?.totalCustomers ?? 0,
      lowStockCount: d?.totals?.lowStockCount ?? d?.lowStockCount ?? 0,
      totalRevenue: d?.totals?.revenue ?? d?.totalRevenue ?? 0,
      recentSales: (d?.recentSales ?? []).map((s: any) => ({
        id: s.id,
        saleNumber: s.saleNumber,
        total: s.total,
        customerName: s.customer?.name,
        soldAt: s.soldAt ?? s.createdAt,
      })),
    };
  },
};
