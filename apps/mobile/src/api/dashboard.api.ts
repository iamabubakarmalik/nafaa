import { apiClient } from './client';

export interface DashboardStats {
  salesToday: number; ordersToday: number; cogsToday: number;
  grossProfitToday: number; netProfitToday: number; expensesToday: number;
  purchasesToday: number; purchaseCountToday: number; expenseCountToday: number;
  todayCredit: number; todayPaid: number; aovToday: number;
  salesYesterday: number; ordersYesterday: number; salesGrowthVsYesterday: number;
  salesMonth: number; ordersMonth: number; cogsMonth: number;
  grossProfitMonth: number; netProfitMonth: number; expensesMonth: number;
  purchasesMonth: number; aovMonth: number;
  salesLastMonth: number; salesGrowthVsLastMonth: number;
  totalOrders: number; totalRevenue: number; totalProducts: number;
  lowStockCount: number; outOfStockCount: number; totalUsers: number;
  totalSuppliers: number; totalCustomers: number; totalCategories: number;
  totalUdhaar: number; customersWithUdhaar: number;
  inventoryValueAtCost: number; inventoryValueAtPrice: number; potentialProfit: number;
  registerOpen: boolean; registerExpected: number; registerOpening: number;
  returnsTodayCount?: number; returnsTodayAmount?: number;
  returnsMonthCount?: number; returnsMonthAmount?: number;
  pendingTransfers?: number;
}

export interface CarpetStatsDash {
  totalActiveRolls: number;
  totalSqft: number;
  totalLengthFt: number;
  cutPiecesCount: number;
  cutPiecesSqft: number;
  cutPiecesValue: number;
  lowStockRolls: Array<{
    id: string; rollNumber: string; productName?: string;
    remainingLengthFt: number; remainingSqft: number; salePricePerSqft: number;
  }>;
  recentRolls?: Array<any>;
}

export interface MobileStatsDash {
  total: number; inStock: number; sold: number; returned: number; damaged: number;
  soldToday: number; usedPhonesInStock: number; repairTicketsOpen: number; emiActivePlans: number;
}

export interface TrendPoint { date: string; sales: number; profit: number; orders: number; }
export interface HourlyPoint { hour: number; sales: number; orders: number; }

export interface DashboardOverview {
  tenant?: {
    name?: string; businessType?: string | null; defaultUnit?: string | null;
    isCarpet: boolean; isMobile: boolean;
  };
  stats: DashboardStats;
  carpetStats?: CarpetStatsDash | null;
  mobileStats?: MobileStatsDash | null;
  salesTrend7Days: TrendPoint[];
  salesTrend30Days?: TrendPoint[];
  hourlySalesToday?: HourlyPoint[];
  topProducts: Array<{
    productId: string;
    product?: {
      id: string; name: string; sku?: string | null; unit: string; price: number;
      images?: Array<{ url: string }>;
    };
    quantitySold: number; revenue: number; orderCount: number;
  }>;
  lowStockProducts: Array<{
    id: string; name: string; stock: number; lowStockAlert: number;
    unit: string; price: number;
    images?: Array<{ url: string }>;
  }>;
  recentProducts?: Array<any>;
  recentSales: Array<{
    id: string; saleNumber: string; total: number; paidAmount: number;
    creditAmount: number; paymentMethod: string; status: string; soldAt: string;
    customer?: { id: string; name: string; phone?: string | null } | null;
    cashier?: string | null;
  }>;
  paymentBreakdown?: Array<{ method: string; total: number; count: number; }>;
  currentRegister?: any;
}

const unwrap = <T>(res: any): T => {
  const body = res?.data;
  return (body?.data !== undefined ? body.data : body) as T;
};

export const dashboardApi = {
  overview: (): Promise<DashboardOverview> =>
    apiClient.get('/dashboard/overview').then((r) => unwrap<DashboardOverview>(r)),
};
