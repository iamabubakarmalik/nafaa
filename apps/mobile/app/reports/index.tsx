import { useState } from 'react';
import {
  View, Text, ScrollView, Pressable, RefreshControl, Dimensions,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { useRouter, Stack } from 'expo-router';
import { useQuery } from '@tanstack/react-query';
import * as Haptics from 'expo-haptics';
import {
  ArrowLeft, BarChart3, Sparkles, TrendingUp, TrendingDown, Award,
  ShoppingCart, DollarSign, Target, PieChart, CreditCard, Users,
  Package, Award as TrophyIcon, Receipt, Calendar, ChevronRight,
  Banknote, Smartphone, Building2, Zap, Crown,
} from 'lucide-react-native';
import { reportsApi } from '@/api/reports.api';
import { formatPKR, formatPKRFull } from '@/lib/format';
import { MiniLineChart } from '@/components/charts/MiniLineChart';
import { BarChart } from '@/components/charts/BarChart';
import { DonutChart } from '@/components/charts/DonutChart';

import { useTranslation } from '@/i18n/useTranslation';
const { width: SCREEN_W } = Dimensions.get('window');

const periods = [
  { value: 7, label: '7D' },
  { value: 14, label: '14D' },
  { value: 30, label: '30D' },
  { value: 90, label: '90D' },
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

export default function ReportsScreen() {
  const { t } = useTranslation();
  const router = useRouter();
  const [days, setDays] = useState(14);
  const [refreshing, setRefreshing] = useState(false);

  const { data: trend = [], refetch: refetchTrend } = useQuery({
    queryKey: ['reports-trend', days],
    queryFn: async () => {
      try {
        const r = await reportsApi.salesTrend(days);
        return Array.isArray(r) ? r : [];
      } catch {
        return [];
      }
    },
  });

  const { data: topProducts = [], refetch: refetchTop } = useQuery({
    queryKey: ['reports-top-products'],
    queryFn: async () => {
      try {
        const r = await reportsApi.topProducts(10);
        return Array.isArray(r) ? r : [];
      } catch {
        return [];
      }
    },
  });

  const { data: categories = [], refetch: refetchCats } = useQuery({
    queryKey: ['reports-categories'],
    queryFn: async () => {
      try {
        const r = await reportsApi.categoryBreakdown();
        return Array.isArray(r) ? r : [];
      } catch {
        return [];
      }
    },
  });

  const { data: paymentMethods = [], refetch: refetchPay } = useQuery({
    queryKey: ['reports-payments'],
    queryFn: async () => {
      try {
        const r = await reportsApi.paymentMethods();
        return Array.isArray(r) ? r : [];
      } catch {
        return [];
      }
    },
  });

  const { data: topCustomers = [], refetch: refetchCust } = useQuery({
    queryKey: ['reports-top-customers'],
    queryFn: async () => {
      try {
        const r = await reportsApi.topCustomers(5);
        return Array.isArray(r) ? r : [];
      } catch {
        return [];
      }
    },
  });

  const { data: profitLoss, refetch: refetchPL } = useQuery({
    queryKey: ['reports-pl', days],
    queryFn: async () => {
      try {
        return await reportsApi.profitLoss(days);
      } catch {
        return null;
      }
    },
  });

  const { data: cashiers = [], refetch: refetchCashiers } = useQuery({
    queryKey: ['reports-cashiers', days],
    queryFn: async () => {
      try {
        const r = await reportsApi.cashierPerformance(days);
        return Array.isArray(r) ? r : [];
      } catch {
        return [];
      }
    },
  });

  const onRefresh = async () => {
    setRefreshing(true);
    await Promise.all([
      refetchTrend(),
      refetchTop(),
      refetchCats(),
      refetchPay(),
      refetchCust(),
      refetchPL(),
      refetchCashiers(),
    ]);
    setRefreshing(false);
  };

  // Chart data prep
  const trendChartData = trend.map((p) => {
    const d = new Date(p.date);
    const day = d.getDate();
    return { value: p.sales, label: String(day) };
  });

  const profitChartData = trend.map((p) => {
    const d = new Date(p.date);
    const day = d.getDate();
    return { value: p.profit, label: String(day) };
  });

  const topProductsBars = topProducts.slice(0, 8).map((p) => ({
    label: p.product?.name || 'Unknown',
    value: p.revenue,
    color: '#16a34a',
  }));

  const categoryDonutData = categories.slice(0, 6).map((c, i) => ({
    label: c.name,
    value: c.revenue,
    color: c.color || PIE_COLORS[i % PIE_COLORS.length],
  }));

  // Stats
  const totalRevenue = trend.reduce((s, p) => s + p.sales, 0);
  const totalProfit = trend.reduce((s, p) => s + p.profit, 0);
  const totalOrders = trend.reduce((s, p) => s + p.orders, 0);
  const aov = totalOrders > 0 ? totalRevenue / totalOrders : 0;

  return (
    <SafeAreaView className="flex-1 bg-neutral-50 dark:bg-neutral-950" edges={['top']}>
      <Stack.Screen options={{ headerShown: false }} />

      {/* Header */}
      <View className="px-5 pt-4 pb-3 flex-row items-center gap-3">
        <Pressable
          onPress={() => router.back()}
          hitSlop={12}
          className="h-10 w-10 rounded-2xl bg-white dark:bg-neutral-900 items-center justify-center border border-neutral-200 dark:border-neutral-800"
        >
          <ArrowLeft size={20} color="#16a34a" />
        </Pressable>
        <View className="flex-1">
          <Text className="text-2xl font-extrabold text-neutral-900 dark:text-white">{t('auto.index.reports')}</Text>
          <View className="flex-row items-center gap-1.5 mt-0.5">
            <Sparkles size={11} color="#7c3aed" />
            <Text className="text-xs text-neutral-500">{t('auto.index.business_analytics_insights')}</Text>
          </View>
        </View>
      </View>

      {/* Period Selector */}
      <View className="px-5 pb-3">
        <View className="flex-row gap-2">
          {periods.map((p) => {
            const active = days === p.value;
            return (
              <Pressable
                key={p.value}
                onPress={() => {
                  Haptics.selectionAsync();
                  setDays(p.value);
                }}
                className="flex-1 h-10 rounded-xl items-center justify-center border-2"
                style={{
                  backgroundColor: active ? '#7c3aed' : '#ffffff',
                  borderColor: active ? '#7c3aed' : '#e5e7eb',
                }}
              >
                <Text
                  className="text-sm font-extrabold"
                  style={{ color: active ? '#ffffff' : '#374151' }}
                >
                  {p.label}
                </Text>
              </Pressable>
            );
          })}
        </View>
      </View>

      <ScrollView
        contentContainerStyle={{ paddingBottom: 40 }}
        refreshControl={<RefreshControl refreshing={refreshing} onRefresh={onRefresh} tintColor="#7c3aed" />}
        showsVerticalScrollIndicator={false}
      >
        {/* ===== Hero Stats ===== */}
        <View className="px-5 mb-4">
          <View
            className="rounded-3xl p-5"
            style={{
              backgroundColor: '#7c3aed',
              shadowColor: '#7c3aed',
              shadowOpacity: 0.3,
              shadowRadius: 16,
              shadowOffset: { width: 0, height: 8 },
              elevation: 10,
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
                <Text className="text-[10px] font-bold uppercase tracking-wider text-white/70">{t('auto.index.profit')}</Text>
                <Text className="text-base font-extrabold text-white mt-0.5">
                  {formatPKR(totalProfit)}
                </Text>
              </View>
              <View>
                <Text className="text-[10px] font-bold uppercase tracking-wider text-white/70">{t('auto.new.margin')}</Text>
                <Text className="text-base font-extrabold text-white mt-0.5">
                  {totalRevenue > 0 ? ((totalProfit / totalRevenue) * 100).toFixed(1) : 0}%
                </Text>
              </View>
              <View>
                <Text className="text-[10px] font-bold uppercase tracking-wider text-white/70">{t('auto.index.orders')}</Text>
                <Text className="text-base font-extrabold text-white mt-0.5">
                  {totalOrders}
                </Text>
              </View>
            </View>
          </View>
        </View>

        {/* ===== Profit & Loss Card ===== */}
        {profitLoss && (
          <View className="px-5 mb-4">
            <Text className="text-base font-extrabold text-neutral-900 dark:text-white mb-3">
              Profit & Loss ({days} days)
            </Text>
            <View
              className="rounded-3xl bg-white dark:bg-neutral-900 border border-neutral-200 dark:border-neutral-800 p-5"
              style={{
                shadowColor: '#000',
                shadowOpacity: 0.04,
                shadowRadius: 6,
                elevation: 2,
              }}
            >
              <View className="flex-row items-center justify-between mb-3">
                <View>
                  <Text className="text-[10px] font-bold uppercase tracking-wider text-neutral-500">{t('auto.index.net_profit')}</Text>
                  <Text
                    className="text-3xl font-extrabold mt-0.5"
                    style={{ color: profitLoss.netProfit >= 0 ? '#15803d' : '#b91c1c' }}
                  >
                    {formatPKRFull(profitLoss.netProfit)}
                  </Text>
                  <Text className="text-xs text-neutral-500 mt-0.5">
                    Margin: {profitLoss.netMargin.toFixed(1)}%
                  </Text>
                </View>
                <View
                  className="h-14 w-14 rounded-2xl items-center justify-center"
                  style={{
                    backgroundColor: profitLoss.netProfit >= 0 ? '#dcfce7' : '#fee2e2',
                  }}
                >
                  {profitLoss.netProfit >= 0 ? (
                    <TrendingUp size={24} color="#15803d" />
                  ) : (
                    <TrendingDown size={24} color="#b91c1c" />
                  )}
                </View>
              </View>

              <View className="pt-3 border-t border-neutral-100 dark:border-neutral-800 gap-2">
                <View className="flex-row justify-between">
                  <Text className="text-xs text-neutral-500">{t('auto.index.revenue')}</Text>
                  <Text className="text-xs font-bold text-emerald-700">
                    +{formatPKRFull(profitLoss.revenue)}
                  </Text>
                </View>
                {profitLoss.returns > 0 && (
                  <View className="flex-row justify-between">
                    <Text className="text-xs text-neutral-500">{t('auto.index.returns')}</Text>
                    <Text className="text-xs font-bold text-rose-700">
                      -{formatPKRFull(profitLoss.returns)}
                    </Text>
                  </View>
                )}
                <View className="flex-row justify-between">
                  <Text className="text-xs text-neutral-500">{t('auto.index.cost_of_goods')}</Text>
                  <Text className="text-xs font-bold text-rose-700">
                    -{formatPKRFull(profitLoss.cogs)}
                  </Text>
                </View>
                <View className="flex-row justify-between pt-1.5 border-t border-neutral-100 dark:border-neutral-800">
                  <Text className="text-xs font-bold text-neutral-700">{t('auto.index.gross_profit')}</Text>
                  <Text className="text-xs font-extrabold text-neutral-900 dark:text-white">
                    {formatPKRFull(profitLoss.grossProfit)} ({profitLoss.grossMargin.toFixed(1)}%)
                  </Text>
                </View>
                <View className="flex-row justify-between">
                  <Text className="text-xs text-neutral-500">{t('auto.more.expenses')}</Text>
                  <Text className="text-xs font-bold text-rose-700">
                    -{formatPKRFull(profitLoss.expenses)}
                  </Text>
                </View>
                <View className="flex-row justify-between pt-1.5 border-t border-neutral-100 dark:border-neutral-800">
                  <Text className="text-sm font-extrabold text-neutral-900 dark:text-white">{t('auto.index.net_profit')}</Text>
                  <Text
                    className="text-sm font-extrabold"
                    style={{ color: profitLoss.netProfit >= 0 ? '#15803d' : '#b91c1c' }}
                  >
                    {formatPKRFull(profitLoss.netProfit)}
                  </Text>
                </View>
              </View>
            </View>
          </View>
        )}

        {/* ===== Sales Trend Chart ===== */}
        {trendChartData.length >= 2 && (
          <View className="px-5 mb-4">
            <View className="flex-row items-center gap-2 mb-3">
              <TrendingUp size={18} color="#16a34a" />
              <Text className="text-base font-extrabold text-neutral-900 dark:text-white">{t('auto.index.sales_trend')}</Text>
            </View>
            <View
              className="rounded-2xl bg-white dark:bg-neutral-900 border border-neutral-200 dark:border-neutral-800 p-4"
              style={{
                shadowColor: '#000',
                shadowOpacity: 0.04,
                shadowRadius: 6,
                elevation: 2,
              }}
            >
              <MiniLineChart
                data={trendChartData}
                height={160}
                width={SCREEN_W - 60}
                color="#16a34a"
                gradientId="reportsTrendGrad"
                showLabels
              />
              <View className="mt-3 pt-3 border-t border-neutral-100 dark:border-neutral-800 flex-row items-center justify-around">
                <View>
                  <Text className="text-[10px] text-neutral-500 font-bold uppercase">{t('auto.index.highest')}</Text>
                  <Text className="text-sm font-extrabold text-emerald-700 mt-0.5">
                    {formatPKR(Math.max(...trend.map((t) => t.sales), 0))}
                  </Text>
                </View>
                <View>
                  <Text className="text-[10px] text-neutral-500 font-bold uppercase">{t('auto.section.average')}</Text>
                  <Text className="text-sm font-extrabold text-blue-700 mt-0.5">
                    {formatPKR(totalRevenue / Math.max(1, trend.length))}
                  </Text>
                </View>
                <View>
                  <Text className="text-[10px] text-neutral-500 font-bold uppercase">{t('auto.receipt.total')}</Text>
                  <Text className="text-sm font-extrabold text-violet-700 mt-0.5">
                    {formatPKR(totalRevenue)}
                  </Text>
                </View>
              </View>
            </View>
          </View>
        )}

        {/* ===== Profit Trend Chart ===== */}
        {profitChartData.length >= 2 && (
          <View className="px-5 mb-4">
            <View className="flex-row items-center gap-2 mb-3">
              <Target size={18} color="#7c3aed" />
              <Text className="text-base font-extrabold text-neutral-900 dark:text-white">{t('auto.index.profit_trend')}</Text>
            </View>
            <View
              className="rounded-2xl bg-white dark:bg-neutral-900 border border-neutral-200 dark:border-neutral-800 p-4"
              style={{
                shadowColor: '#000',
                shadowOpacity: 0.04,
                shadowRadius: 6,
                elevation: 2,
              }}
            >
              <MiniLineChart
                data={profitChartData}
                height={140}
                width={SCREEN_W - 60}
                color="#7c3aed"
                gradientId="reportsProfitGrad"
                showLabels
              />
            </View>
          </View>
        )}

        {/* ===== Top Products ===== */}
        {topProductsBars.length > 0 && (
          <View className="px-5 mb-4">
            <View className="flex-row items-center gap-2 mb-3">
              <TrophyIcon size={18} color="#f59e0b" />
              <Text className="text-base font-extrabold text-neutral-900 dark:text-white">{t('auto.index.top_products')}</Text>
            </View>
            <View
              className="rounded-2xl bg-white dark:bg-neutral-900 border border-neutral-200 dark:border-neutral-800 p-4"
              style={{
                shadowColor: '#000',
                shadowOpacity: 0.04,
                shadowRadius: 6,
                elevation: 2,
              }}
            >
              <BarChart
                data={topProductsBars}
                defaultColor="#16a34a"
                formatValue={(n) => formatPKR(n)}
              />
            </View>
          </View>
        )}

        {/* ===== Category Breakdown Donut ===== */}
        {categoryDonutData.length > 0 && (
          <View className="px-5 mb-4">
            <View className="flex-row items-center gap-2 mb-3">
              <PieChart size={18} color="#ec4899" />
              <Text className="text-base font-extrabold text-neutral-900 dark:text-white">{t('auto.index.category_breakdown')}</Text>
            </View>
            <View
              className="rounded-2xl bg-white dark:bg-neutral-900 border border-neutral-200 dark:border-neutral-800 p-4"
              style={{
                shadowColor: '#000',
                shadowOpacity: 0.04,
                shadowRadius: 6,
                elevation: 2,
              }}
            >
              <View className="items-center mb-4">
                <DonutChart
                  data={categoryDonutData}
                  size={180}
                  strokeWidth={26}
                  centerValue={String(categoryDonutData.length)}
                  centerLabel="Categories"
                />
              </View>
              <View className="gap-2">
                {categoryDonutData.map((c, i) => {
                  const totalRev = categoryDonutData.reduce((s, x) => s + x.value, 0);
                  const pct = totalRev > 0 ? (c.value / totalRev) * 100 : 0;
                  return (
                    <View key={i} className="flex-row items-center gap-2">
                      <View
                        className="h-3 w-3 rounded-full"
                        style={{ backgroundColor: c.color }}
                      />
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

        {/* ===== Payment Methods ===== */}
        {paymentMethods.length > 0 && (
          <View className="px-5 mb-4">
            <View className="flex-row items-center gap-2 mb-3">
              <CreditCard size={18} color="#2563eb" />
              <Text className="text-base font-extrabold text-neutral-900 dark:text-white">{t('auto.index.payment_methods')}</Text>
            </View>
            <View className="gap-2">
              {paymentMethods.map((pm) => {
                const PMIcon = paymentMethodIcons[pm.paymentMethod] || Banknote;
                const color = paymentMethodColors[pm.paymentMethod] || '#737373';
                return (
                  <View
                    key={pm.paymentMethod}
                    className="rounded-2xl bg-white dark:bg-neutral-900 border border-neutral-200 dark:border-neutral-800 p-3.5"
                  >
                    <View className="flex-row items-center gap-3">
                      <View
                        className="h-11 w-11 rounded-2xl items-center justify-center"
                        style={{ backgroundColor: `${color}20` }}
                      >
                        <PMIcon size={20} color={color} />
                      </View>
                      <View className="flex-1">
                        <Text className="font-extrabold text-neutral-900 dark:text-white text-sm">
                          {pm.paymentMethod}
                        </Text>
                        <Text className="text-[11px] text-neutral-500 mt-0.5">
                          {pm.count} transactions
                        </Text>
                      </View>
                      <View className="items-end">
                        <Text className="font-extrabold text-neutral-900 dark:text-white">
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

        {/* ===== Top Customers ===== */}
        {topCustomers.length > 0 && (
          <View className="px-5 mb-4">
            <View className="flex-row items-center gap-2 mb-3">
              <Users size={18} color="#8b5cf6" />
              <Text className="text-base font-extrabold text-neutral-900 dark:text-white">{t('auto.index.top_customers')}</Text>
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
                  className="rounded-2xl bg-white dark:bg-neutral-900 border border-neutral-200 dark:border-neutral-800 p-3.5 flex-row items-center gap-3 active:opacity-70"
                >
                  <View
                    className="h-11 w-11 rounded-2xl items-center justify-center"
                    style={{
                      backgroundColor:
                        idx === 0 ? '#fef3c7' : idx === 1 ? '#f3f4f6' : idx === 2 ? '#ffedd5' : '#ede9fe',
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
                        <View className="bg-amber-100 px-1.5 py-0.5 rounded-md">
                          <Text className="text-[9px] font-extrabold text-amber-700">VIP</Text>
                        </View>
                      )}
                    </View>
                    <Text className="text-[11px] text-neutral-500 mt-0.5">
                      {tc.orderCount} orders • AOV {formatPKR(tc.avgOrderValue)}
                    </Text>
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

        {/* ===== Cashier Performance ===== */}
        {cashiers.length > 0 && (
          <View className="px-5 mb-4">
            <View className="flex-row items-center gap-2 mb-3">
              <Award size={18} color="#16a34a" />
              <Text className="text-base font-extrabold text-neutral-900 dark:text-white">{t('auto.index.cashier_performance')}</Text>
            </View>
            <View className="gap-2">
              {cashiers.map((c, idx) => (
                <View
                  key={c.userId || idx}
                  className="rounded-2xl bg-white dark:bg-neutral-900 border border-neutral-200 dark:border-neutral-800 p-3.5 flex-row items-center gap-3"
                >
                  <View className="h-11 w-11 rounded-2xl bg-emerald-100 items-center justify-center">
                    <Text className="font-extrabold text-emerald-700 text-base">
                      {c.user?.fullName?.charAt(0).toUpperCase() || '?'}
                    </Text>
                  </View>
                  <View className="flex-1">
                    <Text className="font-bold text-neutral-900 dark:text-white" numberOfLines={1}>
                      {c.user?.fullName || 'Unknown'}
                    </Text>
                    <Text className="text-[11px] text-neutral-500 mt-0.5">
                      {c.user?.role} • {c.orderCount} orders
                    </Text>
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

        {/* ===== Empty State ===== */}
        {trend.every((t) => t.sales === 0) && (
          <View className="px-5">
            <View className="rounded-2xl bg-white dark:bg-neutral-900 border border-neutral-200 dark:border-neutral-800 items-center py-12">
              <View className="h-16 w-16 rounded-3xl bg-violet-100 items-center justify-center">
                <BarChart3 size={32} color="#7c3aed" />
              </View>
              <Text className="mt-3 text-base font-bold text-neutral-700">{t('auto.index.no_sales_data_yet')}</Text>
              <Text className="mt-1 text-xs text-neutral-500 text-center px-8">{t('auto.index.sales_hone_par_yahan_beautiful_analytics')}</Text>
              <Pressable
                onPress={() => router.push('/(tabs)/pos')}
                className="mt-4 h-10 px-5 rounded-xl flex-row items-center gap-1.5"
                style={{ backgroundColor: '#7c3aed' }}
              >
                <Receipt size={16} color="#ffffff" />
                <Text className="text-white font-bold text-sm">{t('auto.index.start_selling')}</Text>
              </Pressable>
            </View>
          </View>
        )}
      </ScrollView>
    </SafeAreaView>
  );
}
