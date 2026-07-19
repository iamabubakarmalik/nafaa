import { useQuery } from '@tanstack/react-query';
import { reportsApi } from '@/api/reports.api';

export function useReportsData(days: number) {
  const trend = useQuery({
    queryKey: ['reports-sales-trend', days],
    queryFn: () => reportsApi.salesTrend(days),
  });
  const topProducts = useQuery({
    queryKey: ['reports-top-products'],
    queryFn: () => reportsApi.topProducts(10),
  });
  const categoryBreakdown = useQuery({
    queryKey: ['reports-category-breakdown'],
    queryFn: reportsApi.categoryBreakdown,
  });
  const paymentMethods = useQuery({
    queryKey: ['reports-payment-methods'],
    queryFn: reportsApi.paymentMethods,
  });
  const topCustomers = useQuery({
    queryKey: ['reports-top-customers'],
    queryFn: () => reportsApi.topCustomers(10),
  });
  const cashiers = useQuery({
    queryKey: ['reports-cashiers', days],
    queryFn: () => reportsApi.cashierPerformance(days),
  });
  const profitLoss = useQuery({
    queryKey: ['reports-pl', days],
    queryFn: () => reportsApi.profitLoss(days),
  });
  const inventoryValue = useQuery({
    queryKey: ['reports-inventory'],
    queryFn: reportsApi.inventoryValue,
  });
  const hourlyToday = useQuery({
    queryKey: ['reports-hourly'],
    queryFn: reportsApi.hourlyToday,
  });
  const expenseBreakdown = useQuery({
    queryKey: ['reports-expenses', days],
    queryFn: () => reportsApi.expenseBreakdown(days),
  });
  const weekdayPattern = useQuery({
    queryKey: ['reports-weekday', days],
    queryFn: () => reportsApi.weekdayPattern(Math.max(days, 30)),
  });
  const monthlyComparison = useQuery({
    queryKey: ['reports-monthly'],
    queryFn: reportsApi.monthlyComparison,
  });
  const salesVsExpenses = useQuery({
    queryKey: ['reports-sve', days],
    queryFn: () => reportsApi.salesVsExpenses(days),
  });
  const customerAcquisition = useQuery({
    queryKey: ['reports-acq', days],
    queryFn: () => reportsApi.customerAcquisition(days),
  });

  return {
    trend: trend.data ?? [],
    topProducts: topProducts.data ?? [],
    categoryBreakdown: categoryBreakdown.data ?? [],
    paymentMethods: paymentMethods.data ?? [],
    topCustomers: topCustomers.data ?? [],
    cashiers: cashiers.data ?? [],
    profitLoss: profitLoss.data,
    inventoryValue: inventoryValue.data,
    hourlyToday: hourlyToday.data ?? [],
    expenseBreakdown: expenseBreakdown.data,
    weekdayPattern: weekdayPattern.data ?? [],
    monthlyComparison: monthlyComparison.data ?? [],
    salesVsExpenses: salesVsExpenses.data ?? [],
    customerAcquisition: customerAcquisition.data ?? [],
    isLoading: trend.isLoading || profitLoss.isLoading,
  };
}
