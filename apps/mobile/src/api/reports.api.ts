import { apiClient } from './client';

export interface SalesTrendPoint {
  date: string;
  sales: number;
  profit: number;
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
  };
  quantitySold: number;
  revenue: number;
  profit: number;
  margin: number;
  orderCount: number;
}

export interface CategoryBreakdownItem {
  id: string;
  name: string;
  color: string;
  revenue: number;
  quantity: number;
  orderCount: number;
}

export interface PaymentMethodBreakdown {
  paymentMethod: string;
  total: number;
  paid: number;
  count: number;
  percent: number;
}

export interface HourlySalesPoint {
  hour: number;
  sales: number;
  orders: number;
}

export interface CashierPerformance {
  userId: string | null;
  user?: { id: string; fullName: string; email: string; role: string } | null;
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

export const reportsApi = {
  salesTrend: (days = 14): Promise<SalesTrendPoint[]> =>
    apiClient.get('/reports/sales-trend', { params: { days } }).then((r) => unwrapArr<SalesTrendPoint>(r)),
  topProducts: (limit = 10): Promise<TopProduct[]> =>
    apiClient.get('/reports/top-products', { params: { limit } }).then((r) => unwrapArr<TopProduct>(r)),
  categoryBreakdown: (): Promise<CategoryBreakdownItem[]> =>
    apiClient.get('/reports/category-breakdown').then((r) => unwrapArr<CategoryBreakdownItem>(r)),
  paymentMethods: (): Promise<PaymentMethodBreakdown[]> =>
    apiClient.get('/reports/payment-methods').then((r) => unwrapArr<PaymentMethodBreakdown>(r)),
  hourlyToday: (): Promise<HourlySalesPoint[]> =>
    apiClient.get('/reports/hourly-today').then((r) => unwrapArr<HourlySalesPoint>(r)),
  cashierPerformance: (days = 30): Promise<CashierPerformance[]> =>
    apiClient.get('/reports/cashier-performance', { params: { days } }).then((r) => unwrapArr<CashierPerformance>(r)),
  topCustomers: (limit = 10): Promise<TopCustomer[]> =>
    apiClient.get('/reports/top-customers', { params: { limit } }).then((r) => unwrapArr<TopCustomer>(r)),
  inventoryValue: (): Promise<InventoryValueReport> =>
    apiClient.get('/reports/inventory-value').then((r) => unwrapOne<InventoryValueReport>(r)),
  expenseBreakdown: (days = 30): Promise<ExpenseBreakdownReport> =>
    apiClient.get('/reports/expense-breakdown', { params: { days } }).then((r) => unwrapOne<ExpenseBreakdownReport>(r)),
  profitLoss: (days = 30): Promise<ProfitLossReport> =>
    apiClient.get('/reports/profit-loss', { params: { days } }).then((r) => unwrapOne<ProfitLossReport>(r)),
};
