import { apiClient } from './client';

export interface DashboardStats {
  // Today
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

  // Comparisons
  salesYesterday: number;
  ordersYesterday: number;
  salesGrowthVsYesterday: number;

  // Month
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

  // All-time
  totalOrders: number;
  totalRevenue: number;
  totalProducts: number;
  lowStockCount: number;
  outOfStockCount: number;
  totalUsers: number;
  totalSuppliers: number;
  totalCustomers: number;
  totalCategories: number;

  // Udhaar
  totalUdhaar: number;
  customersWithUdhaar: number;

  // Inventory
  inventoryValueAtCost: number;
  inventoryValueAtPrice: number;
  potentialProfit: number;

  // Register
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

export interface TopProductSummary {
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

export interface LowStockProduct {
  id: string;
  name: string;
  stock: number;
  lowStockAlert: number;
  unit: string;
  price: number;
}

export interface RecentSaleSummary {
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
}

export interface RecentProduct {
  id: string;
  name: string;
  sku?: string | null;
  stock: number;
  price: number;
  unit: string;
  createdAt: string;
  images?: Array<{ url: string }>;
}

export interface DashboardOverview {
  stats: DashboardStats;
  salesTrend7Days: TrendPoint[];
  topProducts: TopProductSummary[];
  lowStockProducts: LowStockProduct[];
  recentProducts: RecentProduct[];
  recentSales: RecentSaleSummary[];
  currentRegister: {
    id: string;
    registerNumber: string;
    openingBalance: number;
    expectedBalance: number;
    totalCashIn: number;
    totalCashOut: number;
    openedAt: string;
  } | null;
}

function unwrapOne<T>(res: any): T {
  const body = res?.data;
  if (body?.data !== undefined) return body.data as T;
  return body as T;
}

export const dashboardApi = {
  overview: (): Promise<DashboardOverview> =>
    apiClient.get('/dashboard/overview').then((r) => unwrapOne<DashboardOverview>(r)),

  // Legacy alias for backwards compatibility
  stats: async () => {
    const data = await dashboardApi.overview();
    return {
      todaySales: data.stats.salesToday,
      todayOrders: data.stats.ordersToday,
      totalCustomers: data.stats.totalCustomers,
      lowStockCount: data.stats.lowStockCount,
      todayProfit: data.stats.netProfitToday,
      todayCredit: data.stats.todayCredit,
      recentSales: data.recentSales.map((s) => ({
        id: s.id,
        saleNumber: s.saleNumber,
        customerName: s.customer?.name,
        soldAt: s.soldAt,
        total: s.total,
        creditAmount: s.creditAmount,
      })),
    };
  },
};
