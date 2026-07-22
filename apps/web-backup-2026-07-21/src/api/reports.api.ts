import { apiClient } from './client';

export interface SalesTrendPoint {
  date: string;
  sales: number;
  profit: number;
  cost: number;
  orders: number;
  paid: number;
  credit: number;
}

export interface TopProduct {
  productId: string;
  product?: {
    id: string;
    name: string;
    sku?: string | null;
    unit: string;
    price: number;
    costPrice: number;
    stock: number;
    images?: Array<{ url: string }>;
  };
  quantitySold: number;
  revenue: number;
  profit: number;
  margin: number;
  orderCount: number;
}

export interface CategoryBreakdown {
  id: string;
  name: string;
  color: string;
  revenue: number;
  quantity: number;
  orderCount: number;
  cost: number;
  profit: number;
  margin: number;
}

export interface PaymentMethodBreakdown {
  paymentMethod: string;
  total: number;
  paid: number;
  count: number;
  percent: number;
}

export interface HourlySales {
  hour: number;
  sales: number;
  orders: number;
}

export interface CashierPerformance {
  userId: string | null;
  user?: { id: string; fullName: string; email: string; role: string; avatarUrl?: string | null } | null;
  totalSales: number;
  orderCount: number;
  avgOrderValue: number;
}

export interface TopCustomer {
  customerId: string | null;
  customer?: {
    id: string;
    name: string;
    phone?: string | null;
    balance: number;
    loyaltyPoints: number;
    isVip: boolean;
    avatarUrl?: string | null;
  } | null;
  totalSpent: number;
  orderCount: number;
  avgOrderValue: number;
}

export interface InventoryValueReport {
  totals: {
    totalProducts: number;
    totalUnits: number;
    totalCostValue: number;
    totalSellValue: number;
    potentialProfit: number;
    potentialMargin: number;
  };
  byCategory: Array<{
    id: string;
    name: string;
    color: string;
    productCount: number;
    totalStock: number;
    costValue: number;
    sellValue: number;
  }>;
}

export interface ProfitLossReport {
  period: { days: number; startDate: string };
  revenue: number;
  returns: number;
  netRevenue: number;
  cogs: number;
  grossProfit: number;
  grossMargin: number;
  expenses: number;
  netProfit: number;
  netMargin: number;
  orderCount: number;
  returnCount: number;
  paid: number;
  credit: number;
  discount: number;
  purchases: number;
  purchaseCount: number;
}

export interface ExpenseBreakdownReport {
  total: number;
  count: number;
  byCategory: Array<{
    id: string;
    name: string;
    color: string;
    amount: number;
    count: number;
    percent: number;
  }>;
}

export interface WeekdayPattern {
  day: string;
  dayIndex: number;
  sales: number;
  orders: number;
  avg: number;
}

export interface MonthlyComparison {
  month: string;
  sales: number;
  profit: number;
  expenses: number;
  orders: number;
}

export interface SalesVsExpensesPoint {
  date: string;
  sales: number;
  expenses: number;
  profit: number;
}

export interface CustomerAcquisitionPoint {
  date: string;
  newCustomers: number;
}

const unwrap = <T>(res: { data: { data: T } }): T => res.data.data;

export const reportsApi = {
  salesTrend: (days = 14) =>
    apiClient.get<{ data: SalesTrendPoint[] }>('/reports/sales-trend', { params: { days } }).then(unwrap),
  topProducts: (limit = 10) =>
    apiClient.get<{ data: TopProduct[] }>('/reports/top-products', { params: { limit } }).then(unwrap),
  categoryBreakdown: () =>
    apiClient.get<{ data: CategoryBreakdown[] }>('/reports/category-breakdown').then(unwrap),
  paymentMethods: () =>
    apiClient.get<{ data: PaymentMethodBreakdown[] }>('/reports/payment-methods').then(unwrap),
  hourlyToday: () =>
    apiClient.get<{ data: HourlySales[] }>('/reports/hourly-today').then(unwrap),
  cashierPerformance: (days = 30) =>
    apiClient.get<{ data: CashierPerformance[] }>('/reports/cashier-performance', { params: { days } }).then(unwrap),
  topCustomers: (limit = 10) =>
    apiClient.get<{ data: TopCustomer[] }>('/reports/top-customers', { params: { limit } }).then(unwrap),
  inventoryValue: () =>
    apiClient.get<{ data: InventoryValueReport }>('/reports/inventory-value').then(unwrap),
  expenseBreakdown: (days = 30) =>
    apiClient.get<{ data: ExpenseBreakdownReport }>('/reports/expense-breakdown', { params: { days } }).then(unwrap),
  profitLoss: (days = 30) =>
    apiClient.get<{ data: ProfitLossReport }>('/reports/profit-loss', { params: { days } }).then(unwrap),
  weekdayPattern: (days = 90) =>
    apiClient.get<{ data: WeekdayPattern[] }>('/reports/weekday-pattern', { params: { days } }).then(unwrap),
  monthlyComparison: () =>
    apiClient.get<{ data: MonthlyComparison[] }>('/reports/monthly-comparison').then(unwrap),
  salesVsExpenses: (days = 30) =>
    apiClient.get<{ data: SalesVsExpensesPoint[] }>('/reports/sales-vs-expenses', { params: { days } }).then(unwrap),
  customerAcquisition: (days = 30) =>
    apiClient.get<{ data: CustomerAcquisitionPoint[] }>('/reports/customer-acquisition', { params: { days } }).then(unwrap),
};
