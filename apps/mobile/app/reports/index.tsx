import { useState } from 'react';
import {
  View, Text, ScrollView, Pressable, RefreshControl, Dimensions,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { useRouter, Stack } from 'expo-router';
import { useQuery } from '@tanstack/react-query';
import * as Haptics from 'expo-haptics';
import {
  ArrowLeft, BarChart3, Sparkles, TrendingUp, TrendingDown, Award, Calendar, X,
  ShoppingCart, DollarSign, Target, PieChart as PieIcon, CreditCard,
  Users, Package, Crown, Activity, ChevronRight, Banknote, Smartphone,
  Building2, Zap, Boxes, Wallet, ArrowUpRight, ArrowDownRight, Star,
} from 'lucide-react-native';
import { reportsApi } from '@/api/reports.api';
import { formatPKR, formatPKRFull } from '@/lib/format';
import { MiniLineChart } from '@/components/charts/MiniLineChart';
import { BarChart } from '@/components/charts/BarChart';
import { DonutChart } from '@/components/charts/DonutChart';
import { DateRangePicker, type DateRangeValue } from '@/components/reports/DateRangePicker';
import { useSmartBack } from '@/hooks/useSmartBack';

const { width: SCREEN_W } = Dimensions.get('window');

type Tab = 'overview' | 'sales' | 'products' | 'customers' | 'staff' | 'inventory' | 'patterns';

const TABS: Array<{ id: Tab; label: string; icon: any; color: string }> = [
  { id: 'overview', label: 'Overview', icon: BarChart3, color: '#7c3aed' },
  { id: 'sales', label: 'Sales', icon: TrendingUp, color: '#16a34a' },
  { id: 'products', label: 'Products', icon: Package, color: '#2563eb' },
  { id: 'customers', label: 'Customers', icon: Users, color: '#ec4899' },
  { id: 'staff', label: 'Staff', icon: Crown, color: '#f59e0b' },
  { id: 'inventory', label: 'Inventory', icon: Boxes, color: '#f97316' },
  { id: 'patterns', label: 'Patterns', icon: Activity, color: '#06b6d4' },
];

const PIE_COLORS = ['#16a34a', '#2563eb', '#f59e0b', '#dc2626', '#8b5cf6', '#ec4899', '#06b6d4', '#84cc16'];

const paymentMethodIcons: Record<string, any> = {
  CASH: Banknote,
  CARD: CreditCard,
  JAZZCASH: Smartphone,
  EASYPAISA: Zap,
  BANK_TRANSFER: Building2,
};

const paymentMethodColors: Record<string, string> = {
  CASH: '#16a34a',
  CARD: '#2563eb',
  JAZZCASH: '#f97316',
  EASYPAISA: '#22c55e',
  BANK_TRANSFER: '#8b5cf6',
};

const weekdayFullNames: Record<string, string> = {
  Sun: 'Sunday', Mon: 'Monday', Tue: 'Tuesday', Wed: 'Wednesday',
  Thu: 'Thursday', Fri: 'Friday', Sat: 'Saturday',
};

export default function ReportsScreen() {
  const router = useRouter();
  const goBack = useSmartBack();
  const [days, setDays] = useState(14);
  const [showDatePicker, setShowDatePicker] = useState(false);
  const [customRange, setCustomRange] = useState<{ start?: string; end?: string }>({});
  const [tab, setTab] = useState<Tab>('overview');
  const [refreshing, setRefreshing] = useState(false);

  // ─── DATA QUERIES ─────────────────────────
  const { data: trend = [], refetch: refetchTrend } = useQuery({
    queryKey: ['reports-trend', days],
    queryFn: () => reportsApi.salesTrend(days),
  });
  const { data: topProducts = [], refetch: refetchTop } = useQuery({
    queryKey: ['reports-top-products'],
    queryFn: () => reportsApi.topProducts(10),
  });
  const { data: categories = [], refetch: refetchCats } = useQuery({
    queryKey: ['reports-categories'],
    queryFn: () => reportsApi.categoryBreakdown(),
  });
  const { data: paymentMethods = [], refetch: refetchPay } = useQuery({
    queryKey: ['reports-payments'],
    queryFn: () => reportsApi.paymentMethods(),
  });
  const { data: topCustomers = [], refetch: refetchCust } = useQuery({
    queryKey: ['reports-top-customers'],
    queryFn: () => reportsApi.topCustomers(10),
  });
  const { data: profitLoss, refetch: refetchPL } = useQuery({
    queryKey: ['reports-pl', days],
    queryFn: () => reportsApi.profitLoss(days),
  });
  const { data: cashiers = [], refetch: refetchCashiers } = useQuery({
    queryKey: ['reports-cashiers', days],
    queryFn: () => reportsApi.cashierPerformance(days),
  });
  const { data: inventoryValue, refetch: refetchInventory } = useQuery({
    queryKey: ['reports-inventory'],
    queryFn: () => reportsApi.inventoryValue(),
    enabled: tab === 'inventory',
  });
  const { data: hourlyToday = [], refetch: refetchHourly } = useQuery({
    queryKey: ['reports-hourly'],
    queryFn: () => reportsApi.hourlyToday(),
    enabled: tab === 'patterns',
  });
  const { data: expenseBreakdown, refetch: refetchExpenses } = useQuery({
    queryKey: ['reports-expenses', days],
    queryFn: () => reportsApi.expenseBreakdown(days),
    enabled: tab === 'patterns',
  });
  const { data: weekdayPattern = [], refetch: refetchWeekday } = useQuery({
    queryKey: ['reports-weekday', days],
    queryFn: () => reportsApi.weekdayPattern(Math.max(days, 30)),
    enabled: tab === 'patterns',
  });
  const { data: monthlyComparison = [], refetch: refetchMonthly } = useQuery({
    queryKey: ['reports-monthly'],
    queryFn: () => reportsApi.monthlyComparison(),
    enabled: tab === 'overview' || tab === 'sales',
  });
  const { data: salesVsExpenses = [], refetch: refetchSVE } = useQuery({
    queryKey: ['reports-sve', days],
    queryFn: () => reportsApi.salesVsExpenses(days),
    enabled: tab === 'sales' || tab === 'patterns',
  });
  const { data: customerAcquisition = [], refetch: refetchAcq } = useQuery({
    queryKey: ['reports-acq', days],
    queryFn: () => reportsApi.customerAcquisition(days),
    enabled: tab === 'customers',
  });

  const onRefresh = async () => {
    setRefreshing(true);
    await Promise.all([
      refetchTrend(), refetchTop(), refetchCats(), refetchPay(),
      refetchCust(), refetchPL(), refetchCashiers(),
      tab === 'inventory' && refetchInventory(),
      tab === 'patterns' && refetchHourly(),
      tab === 'patterns' && refetchExpenses(),
      tab === 'patterns' && refetchWeekday(),
      (tab === 'overview' || tab === 'sales') && refetchMonthly(),
      (tab === 'sales' || tab === 'patterns') && refetchSVE(),
      tab === 'customers' && refetchAcq(),
    ].filter(Boolean));
    setRefreshing(false);
  };

  // ─── CHART DATA PREPARATION ─────────────────
  const trendChartData = trend.map((p) => {
    const d = new Date(p.date);
    return { value: p.sales, label: String(d.getDate()) };
  });

  const profitChartData = trend.map((p) => {
    const d = new Date(p.date);
    return { value: p.profit, label: String(d.getDate()) };
  });

  const paidVsCreditData = trend.map((p) => {
    const d = new Date(p.date);
    return { value: p.paid, label: String(d.getDate()) };
  });

  const categoryDonut = categories.slice(0, 6).map((c, i) => ({
    label: c.name,
    value: c.revenue,
    color: c.color || PIE_COLORS[i % PIE_COLORS.length],
  }));

  const expenseDonut = expenseBreakdown?.byCategory.slice(0, 6).map((c, i) => ({
    label: c.name,
    value: c.amount,
    color: c.color || PIE_COLORS[i % PIE_COLORS.length],
  })) || [];

  const totalRevenue = trend.reduce((s, p) => s + p.sales, 0);
  const totalProfit = trend.reduce((s, p) => s + p.profit, 0);
  const totalOrders = trend.reduce((s, p) => s + p.orders, 0);
  const aov = totalOrders > 0 ? totalRevenue / totalOrders : 0;

  const tabConfig = TABS.find((t) => t.id === tab)!;

  return (
    <SafeAreaView className="flex-1 bg-neutral-50 dark:bg-neutral-950" edges={['top']}>
      <Stack.Screen options={{ headerShown: false }} />

      {/* Header */}
      <View className="px-5 pt-4 pb-3 flex-row items-center gap-3">
        <Pressable
          onPress={goBack}
          hitSlop={12}
          className="h-10 w-10 rounded-2xl bg-white dark:bg-neutral-900 items-center justify-center border border-neutral-200 dark:border-neutral-800"
        >
          <ArrowLeft size={20} color="#7c3aed" />
        </Pressable>
        <View className="flex-1">
          <Text className="text-2xl font-extrabold text-neutral-900 dark:text-white">
            Reports
          </Text>
          <View className="flex-row items-center gap-1.5 mt-0.5">
            <Sparkles size={11} color="#7c3aed" />
            <Text className="text-xs text-neutral-500">Business Intelligence Center</Text>
          </View>
        </View>
      </View>

      {/* Period + View Tab Row (matches Profit Report style) */}
      <View className="px-5 pb-3">
        <Pressable
          onPress={() => {
            Haptics.selectionAsync();
            setShowDatePicker(true);
          }}
          className="h-12 rounded-xl border-2 flex-row items-center gap-2 px-3 active:opacity-70"
          style={{
            backgroundColor: '#ede9fe',
            borderColor: '#7c3aed',
          }}
        >
          <View className="h-8 w-8 rounded-lg bg-violet-600 items-center justify-center">
            <Calendar size={14} color="#ffffff" />
          </View>
          <View className="flex-1">
            <Text className="text-[9px] uppercase font-extrabold text-violet-700 tracking-wider">
              Period
            </Text>
            <Text className="text-xs font-extrabold text-violet-900" numberOfLines={1}>
              {customRange.start && customRange.end
                ? `${new Date(customRange.start).toLocaleDateString('en-PK', { month: 'short', day: 'numeric' })} - ${new Date(customRange.end).toLocaleDateString('en-PK', { month: 'short', day: 'numeric' })}`
                : days === 1 ? 'Today' :
                  days === 7 ? 'Last 7 Days' :
                  days === 14 ? 'Last 14 Days' :
                  days === 30 ? 'Last 30 Days' :
                  days === 90 ? 'Last 3 Months' :
                  days === 365 ? 'Last Year' :
                  `Last ${days} Days`}
            </Text>
          </View>
          {customRange.start ? (
            <Pressable
              onPress={(e) => {
                e.stopPropagation?.();
                setCustomRange({});
                setDays(14);
              }}
              hitSlop={8}
              className="h-7 w-7 rounded-full bg-white items-center justify-center"
            >
              <X size={12} color="#7c3aed" />
            </Pressable>
          ) : (
            <ChevronRight size={16} color="#7c3aed" />
          )}
        </Pressable>
      </View>

      {/* Tab Switcher — 2 rows grid for full visibility */}
      <View className="px-5 pb-3">
        <View className="flex-row flex-wrap -mx-1">
          {TABS.map((t) => {
            const Icon = t.icon;
            const active = tab === t.id;
            return (
              <View key={t.id} style={{ width: '25%', padding: 4 }}>
                <Pressable
                  onPress={() => {
                    Haptics.selectionAsync();
                    setTab(t.id);
                  }}
                  className="rounded-xl border-2 items-center justify-center py-2.5 gap-1"
                  style={{
                    backgroundColor: active ? t.color : '#ffffff',
                    borderColor: active ? t.color : '#e5e7eb',
                    minHeight: 62,
                  }}
                >
                  <Icon size={16} color={active ? '#ffffff' : t.color} />
                  <Text
                    className="text-[10px] font-extrabold"
                    style={{ color: active ? '#ffffff' : '#374151' }}
                    numberOfLines={1}
                  >
                    {t.label}
                  </Text>
                </Pressable>
              </View>
            );
          })}
        </View>
      </View>

      <ScrollView
        contentContainerStyle={{ paddingBottom: 40 }}
        refreshControl={<RefreshControl refreshing={refreshing} onRefresh={onRefresh} tintColor="#7c3aed" />}
        showsVerticalScrollIndicator={false}
      >
        {/* ═══════════ OVERVIEW TAB ═══════════ */}
        {tab === 'overview' && (
          <>
            {/* Hero */}
            <View className="px-5 mb-4">
              <View
                className="rounded-3xl p-5"
                style={{
                  backgroundColor: tabConfig.color,
                  shadowColor: tabConfig.color,
                  shadowOpacity: 0.3, shadowRadius: 16,
                  shadowOffset: { width: 0, height: 8 }, elevation: 10,
                }}
              >
                <View className="flex-row items-center gap-3 mb-3">
                  <View className="h-14 w-14 rounded-2xl bg-white/20 items-center justify-center">
                    <BarChart3 size={28} color="#ffffff" />
                  </View>
                  <View className="flex-1">
                    <Text className="text-xs font-bold uppercase tracking-wider text-white/80">
                      Total Revenue ({days}D)
                    </Text>
                    <Text className="text-3xl font-extrabold text-white">
                      {formatPKR(totalRevenue)}
                    </Text>
                    <Text className="text-xs text-white/80 mt-0.5">
                      {totalOrders} orders • AOV {formatPKR(aov)}
                    </Text>
                  </View>
                </View>
                <View className="pt-3 border-t border-white/20 flex-row items-center justify-between">
                  <View>
                    <Text className="text-[10px] font-bold uppercase tracking-wider text-white/70">Profit</Text>
                    <Text className="text-base font-extrabold text-white mt-0.5">
                      {formatPKR(totalProfit)}
                    </Text>
                  </View>
                  <View>
                    <Text className="text-[10px] font-bold uppercase tracking-wider text-white/70">Margin</Text>
                    <Text className="text-base font-extrabold text-white mt-0.5">
                      {totalRevenue > 0 ? ((totalProfit / totalRevenue) * 100).toFixed(1) : 0}%
                    </Text>
                  </View>
                  <View>
                    <Text className="text-[10px] font-bold uppercase tracking-wider text-white/70">Orders</Text>
                    <Text className="text-base font-extrabold text-white mt-0.5">{totalOrders}</Text>
                  </View>
                </View>
              </View>
            </View>

            {/* KPI Grid */}
            <View className="px-5 mb-4">
              <View className="flex-row flex-wrap -mx-1.5">
                <KpiCard label="Revenue" value={formatPKR(totalRevenue)} icon={TrendingUp} color="#16a34a" />
                <KpiCard label="Profit" value={formatPKR(totalProfit)} icon={Target} color="#7c3aed" highlight />
                <KpiCard label="Orders" value={String(totalOrders)} icon={ShoppingCart} color="#2563eb" />
                <KpiCard label="Avg Order" value={formatPKR(aov)} icon={DollarSign} color="#f59e0b" />
              </View>
            </View>

            {/* P&L Statement */}
            {profitLoss && (
              <View className="px-5 mb-4">
                <View className="flex-row items-center gap-2 mb-3">
                  <BarChart3 size={18} color="#7c3aed" />
                  <Text className="text-base font-extrabold text-neutral-900 dark:text-white">
                    Profit & Loss ({days}D)
                  </Text>
                </View>
                <View className="rounded-3xl bg-white dark:bg-neutral-900 border border-neutral-200 p-5">
                  <View className="flex-row items-start justify-between mb-3">
                    <View className="flex-1">
                      <Text className="text-[10px] font-bold uppercase tracking-wider text-neutral-500">
                        Net Profit
                      </Text>
                      <Text
                        className="text-3xl font-extrabold mt-0.5"
                        style={{ color: profitLoss.netProfit >= 0 ? '#15803d' : '#b91c1c' }}
                      >
                        {formatPKRFull(profitLoss.netProfit)}
                      </Text>
                      <View
                        className="mt-1.5 px-2 py-0.5 rounded-md self-start"
                        style={{
                          backgroundColor: profitLoss.netProfit >= 0 ? '#dcfce7' : '#fee2e2',
                        }}
                      >
                        <Text
                          className="text-[10px] font-extrabold"
                          style={{ color: profitLoss.netProfit >= 0 ? '#15803d' : '#b91c1c' }}
                        >
                          {profitLoss.netMargin.toFixed(1)}% margin
                        </Text>
                      </View>
                    </View>
                    <View
                      className="h-14 w-14 rounded-2xl items-center justify-center"
                      style={{ backgroundColor: profitLoss.netProfit >= 0 ? '#dcfce7' : '#fee2e2' }}
                    >
                      {profitLoss.netProfit >= 0 ? (
                        <TrendingUp size={24} color="#15803d" />
                      ) : (
                        <TrendingDown size={24} color="#b91c1c" />
                      )}
                    </View>
                  </View>

                  <View className="pt-3 border-t border-neutral-100 gap-2">
                    <PnLLine label="Revenue" value={profitLoss.revenue} type="positive" />
                    {profitLoss.discount > 0 && (
                      <PnLLine label="Discount Given" value={-profitLoss.discount} type="negative" />
                    )}
                    {profitLoss.returns > 0 && (
                      <PnLLine label="Returns" value={-profitLoss.returns} type="negative" />
                    )}
                    <PnLLine label="Net Revenue" value={profitLoss.netRevenue} type="bold" />
                    <PnLLine label="Cost of Goods" value={-profitLoss.cogs} type="negative" />
                    <PnLLine
                      label="Gross Profit"
                      value={profitLoss.grossProfit}
                      type="bold"
                      sub={`${profitLoss.grossMargin.toFixed(1)}% margin`}
                    />
                    <PnLLine label="Expenses" value={-profitLoss.expenses} type="negative" />
                    <PnLLine
                      label="Net Profit"
                      value={profitLoss.netProfit}
                      type="highlight"
                      sub={`${profitLoss.netMargin.toFixed(1)}% margin`}
                    />
                  </View>
                </View>
              </View>
            )}

            {/* Sales Trend Chart */}
            {trendChartData.length >= 2 && (
              <View className="px-5 mb-4">
                <View className="flex-row items-center gap-2 mb-3">
                  <TrendingUp size={18} color="#16a34a" />
                  <Text className="text-base font-extrabold text-neutral-900 dark:text-white">
                    Sales Trend
                  </Text>
                </View>
                <View className="rounded-2xl bg-white dark:bg-neutral-900 border border-neutral-200 p-4">
                  <MiniLineChart
                    data={trendChartData}
                    height={160}
                    width={SCREEN_W - 60}
                    color="#16a34a"
                    gradientId="ovTrendGrad"
                    showLabels
                  />
                </View>
              </View>
            )}

            {/* Monthly Comparison */}
            {monthlyComparison.length > 0 && (
              <View className="px-5 mb-4">
                <View className="flex-row items-center gap-2 mb-3">
                  <Calendar size={18} color="#7c3aed" />
                  <Text className="text-base font-extrabold text-neutral-900 dark:text-white">
                    6 Months Comparison
                  </Text>
                </View>
                <View className="rounded-2xl bg-white dark:bg-neutral-900 border border-neutral-200 p-4">
                  <BarChart
                    data={monthlyComparison.map((m) => ({
                      label: m.month,
                      value: m.sales,
                      color: '#7c3aed',
                    }))}
                    defaultColor="#7c3aed"
                    formatValue={(n) => formatPKR(n)}
                  />
                </View>
              </View>
            )}
          </>
        )}

        {/* ═══════════ SALES TAB ═══════════ */}
        {tab === 'sales' && (
          <>
            {/* Hero */}
            <View className="px-5 mb-4">
              <View className="rounded-3xl p-5" style={{ backgroundColor: '#16a34a' }}>
                <Text className="text-[10px] uppercase tracking-wider text-white/80 font-extrabold">
                  Sales Analytics
                </Text>
                <Text className="text-3xl font-extrabold text-white mt-1">
                  {formatPKR(totalRevenue)}
                </Text>
                <View className="mt-3 pt-3 border-t border-white/20 flex-row justify-between">
                  <View>
                    <Text className="text-[10px] font-extrabold uppercase text-white/70">Orders</Text>
                    <Text className="text-white text-base font-extrabold mt-0.5">{totalOrders}</Text>
                  </View>
                  <View>
                    <Text className="text-[10px] font-extrabold uppercase text-white/70">AOV</Text>
                    <Text className="text-white text-base font-extrabold mt-0.5">{formatPKR(aov)}</Text>
                  </View>
                  <View>
                    <Text className="text-[10px] font-extrabold uppercase text-white/70">Days</Text>
                    <Text className="text-white text-base font-extrabold mt-0.5">{days}</Text>
                  </View>
                </View>
              </View>
            </View>

            {/* Sales vs Expenses */}
            {salesVsExpenses.length > 0 && (
              <View className="px-5 mb-4">
                <View className="flex-row items-center gap-2 mb-3">
                  <BarChart3 size={18} color="#dc2626" />
                  <Text className="text-base font-extrabold text-neutral-900 dark:text-white">
                    Sales vs Expenses
                  </Text>
                </View>
                <View className="rounded-2xl bg-white dark:bg-neutral-900 border border-neutral-200 p-4">
                  <MiniLineChart
                    data={salesVsExpenses.map((p) => {
                      const d = new Date(p.date);
                      return { value: p.sales, label: String(d.getDate()) };
                    })}
                    height={140}
                    width={SCREEN_W - 60}
                    color="#16a34a"
                    gradientId="sveSalesGrad"
                    showLabels
                  />
                  <Text className="text-xs uppercase font-extrabold text-neutral-500 tracking-wider mt-3 mb-2">
                    Expenses Trend
                  </Text>
                  <MiniLineChart
                    data={salesVsExpenses.map((p) => {
                      const d = new Date(p.date);
                      return { value: p.expenses, label: String(d.getDate()) };
                    })}
                    height={100}
                    width={SCREEN_W - 60}
                    color="#dc2626"
                    gradientId="sveExpensesGrad"
                    showLabels
                  />
                </View>
              </View>
            )}

            {/* Profit Trend */}
            {profitChartData.length >= 2 && (
              <View className="px-5 mb-4">
                <View className="flex-row items-center gap-2 mb-3">
                  <Target size={18} color="#7c3aed" />
                  <Text className="text-base font-extrabold text-neutral-900 dark:text-white">
                    Profit Trend
                  </Text>
                </View>
                <View className="rounded-2xl bg-white dark:bg-neutral-900 border border-neutral-200 p-4">
                  <MiniLineChart
                    data={profitChartData}
                    height={140}
                    width={SCREEN_W - 60}
                    color="#7c3aed"
                    gradientId="salesProfitGrad"
                    showLabels
                  />
                </View>
              </View>
            )}

            {/* Paid vs Credit Split */}
            <View className="px-5 mb-4">
              <View className="flex-row items-center gap-2 mb-3">
                <CreditCard size={18} color="#f59e0b" />
                <Text className="text-base font-extrabold text-neutral-900 dark:text-white">
                  Paid vs Credit
                </Text>
              </View>
              <View className="rounded-2xl bg-white dark:bg-neutral-900 border border-neutral-200 p-4">
                <View className="flex-row items-center justify-between mb-3">
                  <View>
                    <Text className="text-[10px] font-bold uppercase text-emerald-700">Paid Total</Text>
                    <Text className="text-lg font-extrabold text-emerald-700 mt-0.5">
                      {formatPKR(trend.reduce((s, p) => s + p.paid, 0))}
                    </Text>
                  </View>
                  <View className="items-end">
                    <Text className="text-[10px] font-bold uppercase text-amber-700">Credit Total</Text>
                    <Text className="text-lg font-extrabold text-amber-700 mt-0.5">
                      {formatPKR(trend.reduce((s, p) => s + p.credit, 0))}
                    </Text>
                  </View>
                </View>
                <MiniLineChart
                  data={paidVsCreditData}
                  height={100}
                  width={SCREEN_W - 60}
                  color="#f59e0b"
                  gradientId="salesPaidGrad"
                  showLabels
                />
              </View>
            </View>
          </>
        )}

        {/* ═══════════ PRODUCTS TAB ═══════════ */}
        {tab === 'products' && (
          <>
            <View className="px-5 mb-4">
              <View className="rounded-3xl p-5" style={{ backgroundColor: '#2563eb' }}>
                <Text className="text-[10px] uppercase tracking-wider text-white/80 font-extrabold">
                  Products Analytics
                </Text>
                <Text className="text-3xl font-extrabold text-white mt-1">
                  {topProducts.length} Top
                </Text>
                <Text className="text-xs text-white/80 mt-1">
                  Best sellers by revenue
                </Text>
              </View>
            </View>

            {/* Top Products Bar */}
            {topProducts.length > 0 && (
              <View className="px-5 mb-4">
                <View className="flex-row items-center gap-2 mb-3">
                  <Award size={18} color="#f59e0b" />
                  <Text className="text-base font-extrabold text-neutral-900 dark:text-white">
                    Top Products Revenue
                  </Text>
                </View>
                <View className="rounded-2xl bg-white dark:bg-neutral-900 border border-neutral-200 p-4">
                  <BarChart
                    data={topProducts.slice(0, 8).map((p) => ({
                      label: p.product?.name?.slice(0, 18) || 'Unknown',
                      value: p.revenue,
                      color: '#2563eb',
                    }))}
                    defaultColor="#2563eb"
                    formatValue={(n) => formatPKR(n)}
                  />
                </View>
              </View>
            )}

            {/* Top Products Detail Table */}
            <View className="px-5 mb-4">
              <View className="flex-row items-center gap-2 mb-3">
                <Package size={18} color="#2563eb" />
                <Text className="text-base font-extrabold text-neutral-900 dark:text-white">
                  Top Products Detail
                </Text>
              </View>
              <View className="gap-2">
                {topProducts.map((p, idx) => (
                  <View
                    key={p.productId}
                    className="rounded-2xl bg-white dark:bg-neutral-900 border border-neutral-200 p-3"
                  >
                    <View className="flex-row items-start gap-3">
                      <View
                        className="h-11 w-11 rounded-2xl items-center justify-center"
                        style={{
                          backgroundColor:
                            idx === 0 ? '#fef3c7' :
                            idx === 1 ? '#f1f5f9' :
                            idx === 2 ? '#ffedd5' :
                            '#f3f4f6',
                        }}
                      >
                        <Text
                          className="text-base font-extrabold"
                          style={{
                            color:
                              idx === 0 ? '#d97706' :
                              idx === 1 ? '#64748b' :
                              idx === 2 ? '#c2410c' :
                              '#9ca3af',
                          }}
                        >
                          #{idx + 1}
                        </Text>
                      </View>
                      <View className="flex-1">
                        <Text className="font-bold text-neutral-900 dark:text-white" numberOfLines={2}>
                          {p.product?.name || 'Unknown'}
                        </Text>
                        {p.product?.sku && (
                          <Text className="text-[10px] font-mono text-neutral-500 mt-0.5">
                            {p.product.sku}
                          </Text>
                        )}
                        <View className="flex-row items-center gap-2 mt-1">
                          <Text className="text-[11px] text-blue-700 font-bold">
                            {p.quantitySold} {p.product?.unit}
                          </Text>
                          <Text className="text-[11px] text-neutral-500">•</Text>
                          <Text className="text-[11px] text-neutral-500">
                            {p.orderCount} orders
                          </Text>
                        </View>
                      </View>
                      <View className="items-end">
                        <Text className="text-base font-extrabold text-emerald-700">
                          {formatPKR(p.revenue)}
                        </Text>
                        <Text className="text-[10px] font-bold text-violet-700">
                          +{formatPKR(p.profit)}
                        </Text>
                        <View
                          className="mt-1 px-1.5 py-0.5 rounded-md"
                          style={{
                            backgroundColor:
                              p.margin > 30 ? '#dcfce7' :
                              p.margin > 10 ? '#fef3c7' :
                              '#fee2e2',
                          }}
                        >
                          <Text
                            className="text-[9px] font-extrabold"
                            style={{
                              color:
                                p.margin > 30 ? '#15803d' :
                                p.margin > 10 ? '#b45309' :
                                '#b91c1c',
                            }}
                          >
                            {p.margin.toFixed(1)}%
                          </Text>
                        </View>
                      </View>
                    </View>
                  </View>
                ))}
              </View>
            </View>

            {/* Category Donut */}
            {categoryDonut.length > 0 && (
              <View className="px-5 mb-4">
                <View className="flex-row items-center gap-2 mb-3">
                  <PieIcon size={18} color="#ec4899" />
                  <Text className="text-base font-extrabold text-neutral-900 dark:text-white">
                    Category Breakdown
                  </Text>
                </View>
                <View className="rounded-2xl bg-white dark:bg-neutral-900 border border-neutral-200 p-4">
                  <View className="items-center mb-4">
                    <DonutChart
                      data={categoryDonut}
                      size={180}
                      strokeWidth={26}
                      centerValue={String(categoryDonut.length)}
                      centerLabel="Categories"
                    />
                  </View>
                  <View className="gap-2">
                    {categoryDonut.map((c, i) => {
                      const totalRev = categoryDonut.reduce((s, x) => s + x.value, 0);
                      const pct = totalRev > 0 ? (c.value / totalRev) * 100 : 0;
                      return (
                        <View key={i} className="flex-row items-center gap-2">
                          <View className="h-3 w-3 rounded-full" style={{ backgroundColor: c.color }} />
                          <Text className="flex-1 text-sm font-bold text-neutral-700" numberOfLines={1}>
                            {c.label}
                          </Text>
                          <Text className="text-xs text-neutral-500">{pct.toFixed(1)}%</Text>
                          <Text className="text-sm font-extrabold text-neutral-900 w-24 text-right">
                            {formatPKR(c.value)}
                          </Text>
                        </View>
                      );
                    })}
                  </View>
                </View>
              </View>
            )}

            {/* Payment Methods */}
            {paymentMethods.length > 0 && (
              <View className="px-5 mb-4">
                <View className="flex-row items-center gap-2 mb-3">
                  <CreditCard size={18} color="#2563eb" />
                  <Text className="text-base font-extrabold text-neutral-900 dark:text-white">
                    Payment Methods
                  </Text>
                </View>
                <View className="gap-2">
                  {paymentMethods.map((pm) => {
                    const PMIcon = paymentMethodIcons[pm.paymentMethod] || Banknote;
                    const color = paymentMethodColors[pm.paymentMethod] || '#737373';
                    return (
                      <View
                        key={pm.paymentMethod}
                        className="rounded-2xl bg-white dark:bg-neutral-900 border border-neutral-200 p-3.5"
                      >
                        <View className="flex-row items-center gap-3">
                          <View
                            className="h-11 w-11 rounded-2xl items-center justify-center"
                            style={{ backgroundColor: `${color}20` }}
                          >
                            <PMIcon size={20} color={color} />
                          </View>
                          <View className="flex-1">
                            <Text className="font-extrabold text-neutral-900">{pm.paymentMethod}</Text>
                            <Text className="text-[11px] text-neutral-500 mt-0.5">
                              {pm.count} transactions
                            </Text>
                          </View>
                          <View className="items-end">
                            <Text className="font-extrabold text-neutral-900">
                              {formatPKR(pm.total)}
                            </Text>
                            <Text className="text-[10px] font-bold" style={{ color }}>
                              {pm.percent.toFixed(1)}%
                            </Text>
                          </View>
                        </View>
                        <View className="mt-2.5 h-2 bg-neutral-100 rounded-full overflow-hidden">
                          <View
                            className="h-full rounded-full"
                            style={{
                              width: `${Math.max(pm.percent, 2)}%`,
                              backgroundColor: color,
                            }}
                          />
                        </View>
                      </View>
                    );
                  })}
                </View>
              </View>
            )}
          </>
        )}

        {/* ═══════════ CUSTOMERS TAB ═══════════ */}
        {tab === 'customers' && (
          <>
            <View className="px-5 mb-4">
              <View className="rounded-3xl p-5" style={{ backgroundColor: '#ec4899' }}>
                <Text className="text-[10px] uppercase tracking-wider text-white/80 font-extrabold">
                  Customer Analytics
                </Text>
                <Text className="text-3xl font-extrabold text-white mt-1">
                  {topCustomers.length}
                </Text>
                <Text className="text-xs text-white/80 mt-1">
                  Top customers by lifetime value
                </Text>
              </View>
            </View>

            {/* New Customer Acquisition */}
            {customerAcquisition.length > 0 && (
              <View className="px-5 mb-4">
                <View className="flex-row items-center gap-2 mb-3">
                  <ArrowUpRight size={18} color="#ec4899" />
                  <Text className="text-base font-extrabold text-neutral-900 dark:text-white">
                    New Customer Acquisition
                  </Text>
                </View>
                <View className="rounded-2xl bg-white dark:bg-neutral-900 border border-neutral-200 p-4">
                  <View className="flex-row items-center justify-between mb-3">
                    <View>
                      <Text className="text-[10px] uppercase font-extrabold text-pink-700">
                        Total New
                      </Text>
                      <Text className="text-2xl font-extrabold text-pink-700 mt-0.5">
                        {customerAcquisition.reduce((s, p) => s + p.newCustomers, 0)}
                      </Text>
                    </View>
                    <View className="items-end">
                      <Text className="text-[10px] uppercase font-extrabold text-neutral-500">
                        Daily Avg
                      </Text>
                      <Text className="text-lg font-extrabold text-neutral-700 mt-0.5">
                        {(
                          customerAcquisition.reduce((s, p) => s + p.newCustomers, 0) /
                          Math.max(1, customerAcquisition.length)
                        ).toFixed(1)}
                      </Text>
                    </View>
                  </View>
                  <MiniLineChart
                    data={customerAcquisition.map((p) => {
                      const d = new Date(p.date);
                      return { value: p.newCustomers, label: String(d.getDate()) };
                    })}
                    height={120}
                    width={SCREEN_W - 60}
                    color="#ec4899"
                    gradientId="acqGrad"
                    showLabels
                  />
                </View>
              </View>
            )}

            {/* Top Customers */}
            {topCustomers.length > 0 && (
              <View className="px-5 mb-4">
                <View className="flex-row items-center gap-2 mb-3">
                  <Users size={18} color="#8b5cf6" />
                  <Text className="text-base font-extrabold text-neutral-900 dark:text-white">
                    Top Customers
                  </Text>
                </View>
                <View className="gap-2">
                  {topCustomers.map((tc, idx) => (
                    <Pressable
                      key={tc.customerId}
                      onPress={() => {
                        if (tc.customerId) {
                          Haptics.selectionAsync();
                          router.push(`/customers/${tc.customerId}`);
                        }
                      }}
                      className="rounded-2xl bg-white dark:bg-neutral-900 border border-neutral-200 p-3.5 flex-row items-center gap-3 active:opacity-70"
                    >
                      <View
                        className="h-11 w-11 rounded-2xl items-center justify-center"
                        style={{
                          backgroundColor:
                            idx === 0 ? '#fef3c7' :
                            idx === 1 ? '#f3f4f6' :
                            idx === 2 ? '#ffedd5' :
                            '#ede9fe',
                        }}
                      >
                        {idx < 3 ? (
                          <Crown
                            size={18}
                            color={idx === 0 ? '#f59e0b' : idx === 1 ? '#737373' : '#ea580c'}
                            fill={idx === 0 ? '#f59e0b' : idx === 1 ? '#737373' : '#ea580c'}
                          />
                        ) : (
                          <Text className="font-extrabold text-violet-700">#{idx + 1}</Text>
                        )}
                      </View>
                      <View className="flex-1">
                        <View className="flex-row items-center gap-1.5">
                          <Text className="font-bold text-neutral-900 dark:text-white" numberOfLines={1}>
                            {tc.customer?.name || 'Unknown'}
                          </Text>
                          {tc.customer?.isVip && (
                            <View className="bg-amber-100 px-1.5 py-0.5 rounded-md flex-row items-center gap-0.5">
                              <Star size={7} color="#f59e0b" fill="#f59e0b" />
                              <Text className="text-[9px] font-extrabold text-amber-700">VIP</Text>
                            </View>
                          )}
                        </View>
                        <Text className="text-[11px] text-neutral-500 mt-0.5">
                          {tc.orderCount} orders • AOV {formatPKR(tc.avgOrderValue)}
                        </Text>
                        {tc.customer && tc.customer.loyaltyPoints > 0 && (
                          <Text className="text-[10px] font-bold text-violet-700 mt-0.5">
                            🎯 {tc.customer.loyaltyPoints} points
                          </Text>
                        )}
                      </View>
                      <View className="items-end">
                        <Text className="text-base font-extrabold text-violet-700">
                          {formatPKR(tc.totalSpent)}
                        </Text>
                        {(tc.customer?.balance ?? 0) > 0 && (
                          <Text className="text-[10px] text-amber-600 font-bold">
                            Udhaar: {formatPKR(tc.customer?.balance ?? 0)}
                          </Text>
                        )}
                      </View>
                      <ChevronRight size={16} color="#9ca3af" />
                    </Pressable>
                  ))}
                </View>
              </View>
            )}
          </>
        )}

        {/* ═══════════ STAFF TAB ═══════════ */}
        {tab === 'staff' && (
          <>
            <View className="px-5 mb-4">
              <View className="rounded-3xl p-5" style={{ backgroundColor: '#f59e0b' }}>
                <Text className="text-[10px] uppercase tracking-wider text-white/80 font-extrabold">
                  Staff Performance ({days}D)
                </Text>
                <Text className="text-3xl font-extrabold text-white mt-1">
                  {cashiers.length}
                </Text>
                <Text className="text-xs text-white/80 mt-1">
                  Active staff members
                </Text>
              </View>
            </View>

            {cashiers.length > 0 && (
              <View className="px-5 mb-4">
                <View className="flex-row items-center gap-2 mb-3">
                  <Crown size={18} color="#f59e0b" />
                  <Text className="text-base font-extrabold text-neutral-900 dark:text-white">
                    Staff Leaderboard
                  </Text>
                </View>
                <View className="gap-2">
                  {cashiers.map((c, idx) => (
                    <View
                      key={c.userId || idx}
                      className="rounded-2xl bg-white dark:bg-neutral-900 border-2 p-3.5 flex-row items-center gap-3"
                      style={{
                        borderColor:
                          idx === 0 ? '#fcd34d' :
                          idx === 1 ? '#cbd5e1' :
                          idx === 2 ? '#fdba74' :
                          '#e5e7eb',
                        backgroundColor:
                          idx === 0 ? '#fef3c7' :
                          idx === 1 ? '#f8fafc' :
                          idx === 2 ? '#ffedd5' :
                          '#ffffff',
                      }}
                    >
                      <View
                        className="h-12 w-12 rounded-2xl items-center justify-center"
                        style={{
                          backgroundColor:
                            idx === 0 ? '#f59e0b' :
                            idx === 1 ? '#64748b' :
                            idx === 2 ? '#ea580c' :
                            '#7c3aed',
                        }}
                      >
                        {idx < 3 ? (
                          <Crown size={20} color="#ffffff" fill="#ffffff" />
                        ) : (
                          <Text className="font-extrabold text-white">#{idx + 1}</Text>
                        )}
                      </View>
                      <View className="flex-1">
                        <Text className="font-extrabold text-neutral-900 dark:text-white" numberOfLines={1}>
                          {c.user?.fullName || 'Unknown'}
                        </Text>
                        <View className="flex-row items-center gap-1.5 mt-0.5">
                          <View className="px-1.5 py-0.5 rounded-md bg-violet-100">
                            <Text className="text-[9px] font-extrabold text-violet-700">
                              {c.user?.role || 'STAFF'}
                            </Text>
                          </View>
                          <Text className="text-[11px] text-neutral-500">
                            {c.orderCount} orders
                          </Text>
                        </View>
                      </View>
                      <View className="items-end">
                        <Text className="text-base font-extrabold text-emerald-700">
                          {formatPKR(c.totalSales)}
                        </Text>
                        <Text className="text-[10px] text-neutral-500 font-bold">
                          AOV: {formatPKR(c.avgOrderValue)}
                        </Text>
                      </View>
                    </View>
                  ))}
                </View>
              </View>
            )}
          </>
        )}

        {/* ═══════════ INVENTORY TAB ═══════════ */}
        {tab === 'inventory' && inventoryValue && (
          <>
            <View className="px-5 mb-4">
              <View className="rounded-3xl p-5" style={{ backgroundColor: '#f97316' }}>
                <Text className="text-[10px] uppercase tracking-wider text-white/80 font-extrabold">
                  Inventory Value
                </Text>
                <Text className="text-3xl font-extrabold text-white mt-1">
                  {formatPKR(inventoryValue.totals.totalCostValue)}
                </Text>
                <View className="mt-3 pt-3 border-t border-white/20 flex-row justify-between">
                  <View>
                    <Text className="text-[10px] font-extrabold uppercase text-white/70">Products</Text>
                    <Text className="text-white text-lg font-extrabold mt-0.5">
                      {inventoryValue.totals.totalProducts}
                    </Text>
                  </View>
                  <View>
                    <Text className="text-[10px] font-extrabold uppercase text-white/70">Units</Text>
                    <Text className="text-white text-lg font-extrabold mt-0.5">
                      {inventoryValue.totals.totalUnits}
                    </Text>
                  </View>
                </View>
              </View>
            </View>

            <View className="px-5 mb-4">
              <View className="flex-row flex-wrap -mx-1.5">
                <KpiCard
                  label="Sell Value"
                  value={formatPKR(inventoryValue.totals.totalSellValue)}
                  icon={DollarSign}
                  color="#7c3aed"
                />
                <KpiCard
                  label="Potential Profit"
                  value={formatPKR(inventoryValue.totals.potentialProfit)}
                  icon={Target}
                  color="#f59e0b"
                  highlight
                  sub={`${inventoryValue.totals.potentialMargin.toFixed(1)}% margin`}
                />
              </View>
            </View>

            {/* Category breakdown */}
            <View className="px-5 mb-4">
              <View className="flex-row items-center gap-2 mb-3">
                <Boxes size={18} color="#f97316" />
                <Text className="text-base font-extrabold text-neutral-900 dark:text-white">
                  By Category
                </Text>
              </View>
              <View className="gap-2">
                {inventoryValue.byCategory.map((c) => (
                  <View
                    key={c.id}
                    className="rounded-2xl bg-white dark:bg-neutral-900 border border-neutral-200 p-3"
                  >
                    <View className="flex-row items-center gap-2 mb-2">
                      <View
                        className="h-3 w-3 rounded-full"
                        style={{ backgroundColor: c.color }}
                      />
                      <Text className="flex-1 font-bold text-neutral-900" numberOfLines={1}>
                        {c.name}
                      </Text>
                      <Text className="text-xs text-neutral-500 font-bold">
                        {c.productCount} • {c.totalStock} units
                      </Text>
                    </View>
                    <View className="flex-row items-center justify-between pt-2 border-t border-neutral-100">
                      <View>
                        <Text className="text-[9px] uppercase font-extrabold text-neutral-500">Cost</Text>
                        <Text className="text-sm font-extrabold text-emerald-700 mt-0.5">
                          {formatPKR(c.costValue)}
                        </Text>
                      </View>
                      <View className="items-center">
                        <Text className="text-[9px] uppercase font-extrabold text-neutral-500">Sell</Text>
                        <Text className="text-sm font-extrabold text-violet-700 mt-0.5">
                          {formatPKR(c.sellValue)}
                        </Text>
                      </View>
                      <View className="items-end">
                        <Text className="text-[9px] uppercase font-extrabold text-neutral-500">Profit</Text>
                        <Text className="text-sm font-extrabold text-amber-700 mt-0.5">
                          {formatPKR(c.sellValue - c.costValue)}
                        </Text>
                      </View>
                    </View>
                  </View>
                ))}
              </View>
            </View>
          </>
        )}

        {/* ═══════════ PATTERNS TAB ═══════════ */}
        {tab === 'patterns' && (
          <>
            <View className="px-5 mb-4">
              <View className="rounded-3xl p-5" style={{ backgroundColor: '#06b6d4' }}>
                <Text className="text-[10px] uppercase tracking-wider text-white/80 font-extrabold">
                  Business Patterns
                </Text>
                <Text className="text-2xl font-extrabold text-white mt-1">
                  Deep Insights
                </Text>
                <Text className="text-xs text-white/80 mt-1">
                  Weekly patterns, hourly activity, expenses
                </Text>
              </View>
            </View>

            {/* Hourly Today */}
            {hourlyToday.length > 0 && (
              <View className="px-5 mb-4">
                <View className="flex-row items-center gap-2 mb-3">
                  <Activity size={18} color="#0891b2" />
                  <Text className="text-base font-extrabold text-neutral-900 dark:text-white">
                    Today's Hourly Activity
                  </Text>
                </View>
                <View className="rounded-2xl bg-white dark:bg-neutral-900 border border-neutral-200 p-4">
                  <BarChart
                    data={hourlyToday
                      .filter((h) => h.sales > 0 || (h.hour >= 9 && h.hour <= 22))
                      .map((h) => ({
                        label: h.hour < 12 ? `${h.hour}AM` : h.hour === 12 ? '12PM' : `${h.hour - 12}PM`,
                        value: h.sales,
                        color: '#0891b2',
                      }))}
                    defaultColor="#0891b2"
                    formatValue={(n) => formatPKR(n)}
                  />
                </View>
              </View>
            )}

            {/* Weekday Pattern */}
            {weekdayPattern.length > 0 && (
              <View className="px-5 mb-4">
                <View className="flex-row items-center gap-2 mb-3">
                  <Calendar size={18} color="#7c3aed" />
                  <Text className="text-base font-extrabold text-neutral-900 dark:text-white">
                    Weekday Sales Pattern
                  </Text>
                </View>
                <View className="rounded-2xl bg-white dark:bg-neutral-900 border border-neutral-200 p-4">
                  <BarChart
                    data={weekdayPattern.map((w) => {
                      const max = Math.max(...weekdayPattern.map((x) => x.avg));
                      return {
                        label: w.day,
                        value: w.avg,
                        color: w.avg === max ? '#16a34a' : '#94a3b8',
                      };
                    })}
                    defaultColor="#94a3b8"
                    formatValue={(n) => formatPKR(n)}
                  />
                  <View className="mt-3 pt-3 border-t border-neutral-100 flex-row items-center justify-between">
                    <View className="flex-row items-center gap-1">
                      <View className="h-3 w-3 rounded-full bg-emerald-600" />
                      <Text className="text-[11px] text-neutral-500">Best day</Text>
                    </View>
                    <Text className="text-xs font-extrabold text-emerald-700">
                      {weekdayFullNames[
                        weekdayPattern.reduce((best, curr) => (curr.avg > best.avg ? curr : best), weekdayPattern[0]).day
                      ] || ''}
                    </Text>
                  </View>
                </View>
              </View>
            )}

            {/* Expense Breakdown */}
            {expenseBreakdown && expenseBreakdown.byCategory.length > 0 && (
              <View className="px-5 mb-4">
                <View className="flex-row items-center gap-2 mb-3">
                  <PieIcon size={18} color="#dc2626" />
                  <Text className="text-base font-extrabold text-neutral-900 dark:text-white">
                    Expense Breakdown
                  </Text>
                </View>
                <View className="rounded-2xl bg-white dark:bg-neutral-900 border border-neutral-200 p-4">
                  <View className="items-center mb-4">
                    <DonutChart
                      data={expenseDonut}
                      size={180}
                      strokeWidth={26}
                      centerValue={formatPKR(expenseBreakdown.total)}
                      centerLabel={`${expenseBreakdown.count} items`}
                    />
                  </View>
                  <View className="gap-2">
                    {expenseBreakdown.byCategory.map((c, i) => (
                      <View key={c.id} className="flex-row items-center gap-2">
                        <View
                          className="h-3 w-3 rounded-full"
                          style={{ backgroundColor: c.color || PIE_COLORS[i % PIE_COLORS.length] }}
                        />
                        <Text className="flex-1 text-sm font-bold text-neutral-700" numberOfLines={1}>
                          {c.name}
                        </Text>
                        <Text className="text-xs text-neutral-500">{c.percent.toFixed(1)}%</Text>
                        <Text className="text-sm font-extrabold text-neutral-900 w-24 text-right">
                          {formatPKR(c.amount)}
                        </Text>
                      </View>
                    ))}
                  </View>
                </View>
              </View>
            )}
          </>
        )}

        {/* Empty state */}
        {tab === 'overview' && totalRevenue === 0 && (
          <View className="px-5">
            <View className="rounded-2xl bg-white dark:bg-neutral-900 border border-neutral-200 items-center py-12">
              <View className="h-16 w-16 rounded-3xl bg-violet-100 items-center justify-center">
                <BarChart3 size={32} color="#7c3aed" />
              </View>
              <Text className="mt-3 text-base font-bold text-neutral-700">No sales data yet</Text>
              <Text className="mt-1 text-xs text-neutral-500 text-center px-8">
                Sales hone par yahan beautiful analytics
              </Text>
              <Pressable
                onPress={() => router.push('/(tabs)/pos')}
                className="mt-4 h-10 px-5 rounded-xl flex-row items-center gap-1.5"
                style={{ backgroundColor: '#7c3aed' }}
              >
                <ShoppingCart size={16} color="#ffffff" />
                <Text className="text-white font-bold text-sm">Start Selling</Text>
              </Pressable>
            </View>
          </View>
        )}
      </ScrollView>
      <DateRangePicker
        visible={showDatePicker}
        value={{
          period: customRange.start ? 'custom' : 'month',
          startDate: customRange.start,
          endDate: customRange.end,
        }}
        onConfirm={(v: DateRangeValue) => {
          if (v.period === 'custom' && v.startDate && v.endDate) {
            setCustomRange({ start: v.startDate, end: v.endDate });
            const daysDiff = Math.ceil((new Date(v.endDate).getTime() - new Date(v.startDate).getTime()) / (1000 * 60 * 60 * 24));
            setDays(Math.max(1, daysDiff));
          } else {
            setCustomRange({});
            if (v.period === 'today') setDays(1);
            else if (v.period === 'week') setDays(7);
            else if (v.period === 'month') setDays(30);
            else if (v.period === 'quarter') setDays(90);
            else if (v.period === 'year') setDays(365);
            else if (v.period === 'all') setDays(3650);
          }
          setShowDatePicker(false);
        }}
        onClose={() => setShowDatePicker(false)}
      />
    </SafeAreaView>
  );
}

// ─── Helper Components ─────────────────────────

function KpiCard({ label, value, icon: Icon, color, highlight, sub }: {
  label: string;
  value: string;
  icon: any;
  color: string;
  highlight?: boolean;
  sub?: string;
}) {
  return (
    <View className="w-1/2 px-1.5 mb-3">
      <View
        className="rounded-2xl border-2 p-3.5"
        style={{
          backgroundColor: highlight ? `${color}15` : '#ffffff',
          borderColor: highlight ? color : '#e5e7eb',
        }}
      >
        <View className="flex-row items-center gap-1.5 mb-1.5">
          <Icon size={14} color={color} />
          <Text className="text-[10px] uppercase font-extrabold tracking-wider" style={{ color }}>
            {label}
          </Text>
        </View>
        <Text className="text-lg font-extrabold text-neutral-900 dark:text-white" numberOfLines={1}>
          {value}
        </Text>
        {sub && (
          <Text className="text-[10px] text-neutral-500 font-bold mt-0.5" numberOfLines={1}>
            {sub}
          </Text>
        )}
      </View>
    </View>
  );
}

function PnLLine({ label, value, type, sub }: {
  label: string;
  value: number;
  type: 'positive' | 'negative' | 'bold' | 'highlight';
  sub?: string;
}) {
  if (type === 'highlight') {
    return (
      <View
        className="p-3 rounded-xl flex-row items-center justify-between"
        style={{
          backgroundColor: value >= 0 ? '#dcfce7' : '#fee2e2',
          borderWidth: 2,
          borderColor: value >= 0 ? '#86efac' : '#fca5a5',
        }}
      >
        <View>
          <Text className="font-extrabold" style={{ color: value >= 0 ? '#15803d' : '#b91c1c' }}>
            {label}
          </Text>
          {sub && (
            <Text
              className="text-[10px] font-bold mt-0.5"
              style={{ color: value >= 0 ? '#15803d' : '#b91c1c' }}
            >
              {sub}
            </Text>
          )}
        </View>
        <Text
          className="font-extrabold text-lg"
          style={{ color: value >= 0 ? '#15803d' : '#b91c1c' }}
        >
          {formatPKR(value)}
        </Text>
      </View>
    );
  }
  return (
    <View
      className={`flex-row items-center justify-between py-1.5 ${
        type === 'bold' ? 'border-t border-neutral-200 pt-2.5' : ''
      }`}
    >
      <View>
        <Text
          className={`text-sm ${type === 'bold' ? 'font-extrabold text-neutral-900' : 'text-neutral-600'}`}
        >
          {label}
        </Text>
        {sub && (
          <Text className="text-[10px] text-neutral-500 font-bold">{sub}</Text>
        )}
      </View>
      <Text
        className="font-bold"
        style={{
          color:
            type === 'positive' ? '#15803d' :
            type === 'negative' ? '#b91c1c' :
            '#111827',
        }}
      >
        {value < 0 ? '-' : ''}{formatPKR(Math.abs(value))}
      </Text>
    </View>
  );
}
