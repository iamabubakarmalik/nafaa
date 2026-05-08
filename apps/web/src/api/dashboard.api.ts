import { apiClient } from './client';

export interface DashboardOverview {
  stats: {
    salesToday: number;
    grossProfitToday: number;
    netProfitToday: number;
    expensesToday: number;
    salesMonth: number;
    grossProfitMonth: number;
    netProfitMonth: number;
    expensesMonth: number;
    purchasesToday: number;
    totalOrders: number;
    totalProducts: number;
    lowStockProducts: number;
    totalUsers: number;
    totalSuppliers: number;
    totalCategories: number;
  };
  recentProducts: Array<{
    id: string;
    name: string;
    sku?: string | null;
    stock: number;
    price: number;
    createdAt: string;
  }>;
  recentSales: Array<{
    id: string;
    saleNumber: string;
    total: number;
    paymentMethod: string;
    soldAt: string;
    customer?: { id: string; name: string } | null;
  }>;
}

const unwrap = <T>(res: { data: { data: T } }): T => res.data.data;

export const dashboardApi = {
  overview: () =>
    apiClient.get<{ data: DashboardOverview }>('/dashboard/overview').then(unwrap),
};
