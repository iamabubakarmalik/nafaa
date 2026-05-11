import { apiClient } from './client';

export interface DashboardStats {
  salesToday: number;
  ordersToday: number;
  cogsToday: number;
  grossProfitToday: number;
  netProfitToday: number;
  expensesToday: number;
  purchasesToday: number;
  purchaseCountToday: number;
  expenseCountToday: number;
  todayCredit: number;
  todayPaid: number;
  aovToday: number;
  salesYesterday: number;
  ordersYesterday: number;
  salesGrowthVsYesterday: number;
  salesMonth: number;
  ordersMonth: number;
  cogsMonth: number;
  grossProfitMonth: number;
  netProfitMonth: number;
  expensesMonth: number;
  purchasesMonth: number;
  aovMonth: number;
  salesLastMonth: number;
  salesGrowthVsLastMonth: number;
  totalOrders: number;
  totalRevenue: number;
  totalProducts: number;
  lowStockCount: number;
  outOfStockCount: number;
  totalUsers: number;
  totalSuppliers: number;
  totalCustomers: number;
  totalCategories: number;
  totalUdhaar: number;
  customersWithUdhaar: number;
  inventoryValueAtCost: number;
  inventoryValueAtPrice: number;
  potentialProfit: number;
  registerOpen: boolean;
  registerExpected: number;
  registerOpening: number;
}

export interface TrendPoint {
  date: string;
  sales: number;
  profit: number;
  orders: number;
}

export interface DashboardOverview {
  stats: DashboardStats;
  salesTrend7Days: TrendPoint[];
  topProducts: Array<{
    productId: string;
    product?: { id: string; name: string; sku?: string | null; unit: string; price: number };
    quantitySold: number;
    revenue: number;
    orderCount: number;
  }>;
  lowStockProducts: Array<{
    id: string;
    name: string;
    stock: number;
    lowStockAlert: number;
    unit: string;
    price: number;
  }>;
  recentProducts: Array<{
    id: string;
    name: string;
    sku?: string | null;
    stock: number;
    price: number;
    unit: string;
    createdAt: string;
    images?: Array<{ url: string }>;
  }>;
  recentSales: Array<{
    id: string;
    saleNumber: string;
    total: number;
    paidAmount: number;
    creditAmount: number;
    paymentMethod: string;
    status: string;
    soldAt: string;
    customer?: { id: string; name: string; phone?: string | null } | null;
    cashier?: string | null;
  }>;
  currentRegister: any;
}

const unwrap = <T>(res: { data: { data: T } }): T => res.data.data;

export const dashboardApi = {
  overview: () =>
    apiClient.get<{ data: DashboardOverview }>('/dashboard/overview').then(unwrap),
};
