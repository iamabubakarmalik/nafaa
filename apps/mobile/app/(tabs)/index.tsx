import { useState } from 'react';
import {
  View, Text, ScrollView, RefreshControl, Pressable, Dimensions,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { useRouter } from 'expo-router';
import { useQuery } from '@tanstack/react-query';
import * as Haptics from 'expo-haptics';
import {
  TrendingUp, TrendingDown, ShoppingBag, Users, AlertTriangle, Plus,
  Package, BarChart3, BookOpen, ArrowRight, Bell, Sparkles, Sun, Moon,
  Receipt, ChevronRight, Crown, Wallet, Zap, Award, DollarSign,
  Building2, ShoppingCart, Activity, Layers, Boxes, Target,
} from 'lucide-react-native';
import { useAuthStore } from '@/store/auth.store';
import { useThemeStore } from '@/store/theme.store';
import { dashboardApi } from '@/api/dashboard.api';
import { BillingBanners } from '@/components/billing/BillingBanners';
import { EmailVerifyBanner } from '@/components/auth/EmailVerifyBanner';
import { formatPKR, formatPKRFull, formatRelative } from '@/lib/format';
import { MiniLineChart } from '@/components/charts/MiniLineChart';
import { BarChart } from '@/components/charts/BarChart';

import { useTranslation } from '@/i18n/useTranslation';
const { width: SCREEN_W } = Dimensions.get('window');

const getGreeting = () => {
  const h = new Date().getHours();
  if (h < 12) return { text: 'Good Morning', icon: Sun, color: '#f59e0b' };
  if (h < 17) return { text: 'Good Afternoon', icon: Sun, color: '#f97316' };
  return { text: 'Good Evening', icon: Moon, color: '#7c3aed' };
};

const formatPercent = (n: number) => {
  const sign = n > 0 ? '+' : '';
  return `${sign}${n.toFixed(1)}%`;
};

export default function HomeScreen() {
  const { t } = useTranslation();
  const router = useRouter();
  const { isDark } = useThemeStore();
  const { user, tenant, isAuthenticated, isInitialized } = useAuthStore();
  const [refreshing, setRefreshing] = useState(false);

  const { data, refetch } = useQuery({
    queryKey: ['dashboard-overview'],
    queryFn: dashboardApi.overview,
    enabled: isInitialized && isAuthenticated,
  });

  const onRefresh = async () => {
    setRefreshing(true);
    await refetch();
    setRefreshing(false);
  };

  const greeting = getGreeting();
  const GreetingIcon = greeting.icon;
  const stats = data?.stats;

  // 7-day trend data for chart
  const trendData = (data?.salesTrend7Days ?? []).map((p) => {
    const d = new Date(p.date);
    const dayName = ['Sun', 'Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat'][d.getDay()];
    return { value: p.sales, label: dayName };
  });

  // Top products bar chart data
  const topProductsBars = (data?.topProducts ?? []).slice(0, 5).map((p) => ({
    label: p.product?.name || 'Unknown',
    value: p.revenue,
    color: '#16a34a',
  }));

  const growthVsYesterday = stats?.salesGrowthVsYesterday ?? 0;
  const growthVsLastMonth = stats?.salesGrowthVsLastMonth ?? 0;

  return (
    <SafeAreaView className="flex-1 bg-neutral-50 dark:bg-neutral-950" edges={['top']}>
      <ScrollView
        contentContainerStyle={{ paddingBottom: 40 }}
        refreshControl={
          <RefreshControl refreshing={refreshing} onRefresh={onRefresh} tintColor="#16a34a" />
        }
        showsVerticalScrollIndicator={false}
      >
        <BillingBanners />
        <EmailVerifyBanner />
        {/* ===== Hero Header ===== */}
        <View className="px-5 pt-4 pb-4">
          <View className="flex-row items-center justify-between">
            <View className="flex-1">
              <View className="flex-row items-center gap-1.5">
                <GreetingIcon size={14} color={greeting.color} />
                <Text className="text-sm text-neutral-500 dark:text-neutral-400 font-semibold">
                  {greeting.text}
                </Text>
              </View>
              <Text className="text-3xl font-extrabold text-neutral-900 dark:text-white mt-0.5">
                {user?.fullName?.split(' ')[0] || 'User'} 👋
              </Text>
              {tenant?.name && (
                <View className="flex-row items-center gap-1 mt-1">
                  <Crown size={11} color="#f59e0b" />
                  <Text className="text-xs text-neutral-500 dark:text-neutral-400 font-semibold">
                    {tenant.name}
                  </Text>
                </View>
              )}
            </View>
            <Pressable
              onPress={() => {
                Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
                router.push('/notifications');
              }}
              className="h-11 w-11 rounded-2xl bg-white dark:bg-neutral-900 items-center justify-center border border-neutral-200 dark:border-neutral-800"
              style={{
                shadowColor: '#000',
                shadowOpacity: 0.05,
                shadowRadius: 6,
                shadowOffset: { width: 0, height: 2 },
                elevation: 2,
              }}
            >
              <Bell size={20} color={isDark ? '#fff' : '#374151'} />
              <View
                className="absolute top-2 right-2 h-2.5 w-2.5 rounded-full border-2 border-white dark:border-neutral-900"
                style={{ backgroundColor: '#dc2626' }}
              />
            </Pressable>
          </View>
        </View>

        {/* ===== Hero Sales Card with Mini Chart ===== */}
        <View className="px-5 mb-4">
          <View
            className="rounded-3xl p-5 overflow-hidden"
            style={{
              backgroundColor: '#16a34a',
              shadowColor: '#16a34a',
              shadowOpacity: 0.3,
              shadowRadius: 16,
              shadowOffset: { width: 0, height: 8 },
              elevation: 10,
            }}
          >
            <View className="flex-row items-start justify-between">
              <View className="flex-1">
                <View className="flex-row items-center gap-1.5">
                  <Sparkles size={12} color="rgba(255,255,255,0.9)" />
                  <Text className="text-xs font-bold uppercase tracking-wider text-white/80">{t('auto.index.aaj_ki_sales')}</Text>
                </View>
                <Text className="text-4xl font-extrabold text-white mt-1">
                  {formatPKR(stats?.salesToday ?? 0)}
                </Text>

                {/* Growth indicator */}
                <View className="flex-row items-center gap-1.5 mt-2">
                  {growthVsYesterday !== 0 && (
                    <View
                      className="flex-row items-center gap-1 px-2 py-0.5 rounded-md"
                      style={{
                        backgroundColor: growthVsYesterday >= 0 ? 'rgba(255,255,255,0.25)' : 'rgba(254,202,202,0.3)',
                      }}
                    >
                      {growthVsYesterday >= 0 ? (
                        <TrendingUp size={10} color="#ffffff" />
                      ) : (
                        <TrendingDown size={10} color="#fecaca" />
                      )}
                      <Text className="text-[10px] font-extrabold text-white">
                        {formatPercent(growthVsYesterday)} vs yesterday
                      </Text>
                    </View>
                  )}
                </View>

                <View className="flex-row items-center gap-3 mt-3">
                  <View className="flex-row items-center gap-1">
                    <Receipt size={11} color="rgba(255,255,255,0.8)" />
                    <Text className="text-xs text-white/80 font-semibold">
                      {stats?.ordersToday ?? 0} orders
                    </Text>
                  </View>
                  {(stats?.netProfitToday ?? 0) !== 0 && (
                    <View className="flex-row items-center gap-1">
                      <Target size={11} color="rgba(255,255,255,0.8)" />
                      <Text className="text-xs text-white/80 font-semibold">
                        Profit: {formatPKR(stats?.netProfitToday ?? 0)}
                      </Text>
                    </View>
                  )}
                </View>
                {(stats?.todayCredit ?? 0) > 0 && (
                  <View className="flex-row items-center gap-1 mt-1.5">
                    <BookOpen size={11} color="#fde68a" />
                    <Text className="text-xs text-amber-200 font-bold">
                      Udhaar: {formatPKR(stats?.todayCredit ?? 0)}
                    </Text>
                  </View>
                )}
              </View>
              <View className="h-16 w-16 rounded-2xl bg-white/20 items-center justify-center">
                <Wallet size={32} color="#ffffff" />
              </View>
            </View>

            {/* Mini chart */}
            {trendData.length >= 2 && (
              <View className="mt-4 pt-4 border-t border-white/20">
                <Text className="text-[10px] font-bold uppercase tracking-wider text-white/70 mb-2">{t('auto.index.7_day_trend')}</Text>
                <MiniLineChart
                  data={trendData}
                  height={70}
                  width={SCREEN_W - 80}
                  color="#ffffff"
                  gradientId="heroTrendGrad"
                  showDots={false}
                  showLabels
                  showGrid={false}
                />
              </View>
            )}
          </View>
        </View>

        {/* ===== Cash Register Quick Status ===== */}
        {stats?.registerOpen ? (
          <Pressable
            onPress={() => {
              Haptics.selectionAsync();
              router.push('/cash-register');
            }}
            className="px-5 mb-4"
          >
            <View
              className="rounded-2xl p-4 flex-row items-center gap-3 border-2"
              style={{ borderColor: '#16a34a', backgroundColor: '#dcfce7' }}
            >
              <View className="h-11 w-11 rounded-2xl items-center justify-center" style={{ backgroundColor: '#16a34a' }}>
                <Wallet size={20} color="#ffffff" />
              </View>
              <View className="flex-1">
                <View className="flex-row items-center gap-1.5">
                  <View className="h-2 w-2 rounded-full bg-emerald-500" />
                  <Text className="text-xs font-extrabold text-emerald-700 uppercase tracking-wider">{t('auto.index.register_open')}</Text>
                </View>
                <Text className="text-base font-extrabold text-emerald-900 mt-0.5">
                  {formatPKRFull(stats.registerExpected)} expected
                </Text>
                <Text className="text-[10px] text-emerald-700 font-semibold">
                  Opening: {formatPKRFull(stats.registerOpening)}
                </Text>
              </View>
              <ChevronRight size={18} color="#16a34a" />
            </View>
          </Pressable>
        ) : (
          <Pressable
            onPress={() => router.push('/cash-register')}
            className="px-5 mb-4"
          >
            <View
              className="rounded-2xl p-4 flex-row items-center gap-3 border-2 border-dashed"
              style={{ borderColor: '#fcd34d', backgroundColor: '#fef3c7' }}
            >
              <View className="h-11 w-11 rounded-2xl items-center justify-center" style={{ backgroundColor: '#f59e0b' }}>
                <Wallet size={20} color="#ffffff" />
              </View>
              <View className="flex-1">
                <Text className="text-xs font-extrabold text-amber-800 uppercase tracking-wider">{t('auto.index.cash_register_closed')}</Text>
                <Text className="text-sm font-bold text-amber-900 mt-0.5">{t('auto.index.open_karein_to_start_tracking')}</Text>
              </View>
              <ChevronRight size={18} color="#b45309" />
            </View>
          </Pressable>
        )}

        {/* ===== Profit & Loss Card ===== */}
        <View className="px-5 mb-4">
          <Text className="text-base font-extrabold text-neutral-900 dark:text-white mb-3">{t('auto.index.aaj_ka_hisaab_kitaab')}</Text>
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
              <View className="flex-1">
                <Text className="text-[10px] font-bold uppercase tracking-wider text-neutral-500">{t('auto.index.net_profit_today')}</Text>
                <Text
                  className="text-3xl font-extrabold mt-0.5"
                  style={{
                    color: (stats?.netProfitToday ?? 0) >= 0 ? '#15803d' : '#b91c1c',
                  }}
                >
                  {formatPKRFull(stats?.netProfitToday ?? 0)}
                </Text>
              </View>
              <View
                className="h-12 w-12 rounded-2xl items-center justify-center"
                style={{
                  backgroundColor: (stats?.netProfitToday ?? 0) >= 0 ? '#dcfce7' : '#fee2e2',
                }}
              >
                {(stats?.netProfitToday ?? 0) >= 0 ? (
                  <TrendingUp size={22} color="#15803d" />
                ) : (
                  <TrendingDown size={22} color="#b91c1c" />
                )}
              </View>
            </View>

            <View className="pt-3 border-t border-neutral-100 dark:border-neutral-800 gap-1.5">
              <View className="flex-row justify-between">
                <Text className="text-xs text-neutral-500">{t('auto.index.sales_revenue')}</Text>
                <Text className="text-xs font-bold text-emerald-700">
                  +{formatPKRFull(stats?.salesToday ?? 0)}
                </Text>
              </View>
              <View className="flex-row justify-between">
                <Text className="text-xs text-neutral-500">{t('auto.index.cost_of_goods')}</Text>
                <Text className="text-xs font-bold text-rose-700">
                  -{formatPKRFull(stats?.cogsToday ?? 0)}
                </Text>
              </View>
              <View className="flex-row justify-between">
                <Text className="text-xs text-neutral-500">{t('auto.more.expenses')}</Text>
                <Text className="text-xs font-bold text-rose-700">
                  -{formatPKRFull(stats?.expensesToday ?? 0)}
                </Text>
              </View>
              <View className="flex-row justify-between pt-1.5 mt-1 border-t border-neutral-100 dark:border-neutral-800">
                <Text className="text-xs font-extrabold text-neutral-700">{t('auto.index.gross_profit')}</Text>
                <Text className="text-xs font-extrabold text-neutral-900 dark:text-white">
                  {formatPKRFull(stats?.grossProfitToday ?? 0)}
                </Text>
              </View>
            </View>
          </View>
        </View>

        {/* ===== Stats Grid 2x2 ===== */}
        <View className="px-5 mb-4">
          <Text className="text-base font-extrabold text-neutral-900 dark:text-white mb-3">{t('auto.index.quick_stats')}</Text>
          <View className="flex-row flex-wrap -mx-1.5">
            {[
              {
                label: 'Aaj ke Orders',
                value: String(stats?.ordersToday ?? 0),
                icon: ShoppingBag,
                iconColor: '#2563eb',
                bgColor: '#dbeafe',
                subtitle: `AOV: ${formatPKR(stats?.aovToday ?? 0)}`,
              },
              {
                label: 'Total Customers',
                value: String(stats?.totalCustomers ?? 0),
                icon: Users,
                iconColor: '#8b5cf6',
                bgColor: '#ede9fe',
                subtitle: `${stats?.customersWithUdhaar ?? 0} ne udhaar`,
              },
              {
                label: 'Total Udhaar',
                value: formatPKR(stats?.totalUdhaar ?? 0),
                icon: BookOpen,
                iconColor: '#dc2626',
                bgColor: '#fee2e2',
                subtitle: 'Collect karein',
              },
              {
                label: 'Low Stock',
                value: String(stats?.lowStockCount ?? 0),
                icon: AlertTriangle,
                iconColor: '#f59e0b',
                bgColor: '#fef3c7',
                subtitle: `${stats?.outOfStockCount ?? 0} out of stock`,
              },
            ].map((s) => {
              const Icon = s.icon;
              return (
                <View key={s.label} className="w-1/2 px-1.5 mb-3">
                  <View
                    className="rounded-2xl bg-white dark:bg-neutral-900 border border-neutral-200 dark:border-neutral-800 p-3.5"
                    style={{
                      shadowColor: '#000',
                      shadowOpacity: 0.04,
                      shadowRadius: 6,
                      elevation: 2,
                    }}
                  >
                    <View
                      className="h-11 w-11 rounded-2xl items-center justify-center"
                      style={{ backgroundColor: s.bgColor }}
                    >
                      <Icon size={22} color={s.iconColor} />
                    </View>
                    <Text className="mt-3 text-[10px] text-neutral-500 font-extrabold uppercase tracking-wider">
                      {s.label}
                    </Text>
                    <Text className="mt-0.5 text-xl font-extrabold text-neutral-900 dark:text-white" numberOfLines={1}>
                      {s.value}
                    </Text>
                    <Text className="text-[10px] text-neutral-500 mt-0.5" numberOfLines={1}>
                      {s.subtitle}
                    </Text>
                  </View>
                </View>
              );
            })}
          </View>
        </View>

        {/* ===== Quick Actions ===== */}
        <View className="px-5 mb-4">
          <View className="flex-row items-center justify-between mb-3">
            <Text className="text-base font-extrabold text-neutral-900 dark:text-white">{t('auto.index.quick_actions')}</Text>
            <View className="flex-row items-center gap-1">
              <Zap size={12} color="#f59e0b" />
              <Text className="text-xs text-neutral-500 font-semibold">{t('auto.index.tap_to_start')}</Text>
            </View>
          </View>
          <View className="flex-row flex-wrap -mx-1.5">
            {[
              { label: 'New Sale', sublabel: 'POS', icon: Plus, bg: '#16a34a', path: '/(tabs)/pos' },
              { label: 'Add Product', sublabel: 'Inventory', icon: Package, bg: '#7c3aed', path: '/products/new' },
              { label: 'View Reports', sublabel: 'Analytics', icon: BarChart3, bg: '#2563eb', path: '/reports' },
              { label: 'Khata Book', sublabel: 'Udhaar', icon: BookOpen, bg: '#dc2626', path: '/khata' },
            ].map((a) => {
              const Icon = a.icon;
              return (
                <View key={a.label} className="w-1/2 px-1.5 mb-3">
                  <Pressable
                    onPress={() => {
                      Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
                      router.push(a.path as any);
                    }}
                    className="rounded-2xl p-4 active:opacity-80"
                    style={{
                      backgroundColor: a.bg,
                      shadowColor: a.bg,
                      shadowOpacity: 0.3,
                      shadowRadius: 10,
                      shadowOffset: { width: 0, height: 4 },
                      elevation: 5,
                    }}
                  >
                    <View className="flex-row items-start justify-between">
                      <View className="h-11 w-11 rounded-2xl bg-white/20 items-center justify-center">
                        <Icon size={22} color="#ffffff" />
                      </View>
                      <View className="h-7 w-7 rounded-full bg-white/20 items-center justify-center">
                        <ArrowRight size={14} color="#ffffff" />
                      </View>
                    </View>
                    <Text className="mt-3 text-white font-extrabold text-base">
                      {a.label}
                    </Text>
                    <Text className="text-white/70 text-[11px] font-semibold mt-0.5">
                      {a.sublabel}
                    </Text>
                  </Pressable>
                </View>
              );
            })}
          </View>
        </View>

        {/* ===== Top Products Bar Chart ===== */}
        {topProductsBars.length > 0 && (
          <View className="px-5 mb-4">
            <View className="flex-row items-center justify-between mb-3">
              <View className="flex-row items-center gap-2">
                <Award size={18} color="#f59e0b" />
                <Text className="text-base font-extrabold text-neutral-900 dark:text-white">{t('auto.index.top_products')}</Text>
              </View>
              <Pressable
                onPress={() => router.push('/reports')}
                className="flex-row items-center gap-1 px-3 py-1.5 rounded-full bg-amber-100 dark:bg-amber-950/40"
              >
                <Text className="text-xs text-amber-700 font-extrabold">{t('auto.index.view_all')}</Text>
                <ArrowRight size={12} color="#b45309" />
              </Pressable>
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

        {/* ===== Low Stock Alerts ===== */}
        {(data?.lowStockProducts?.length ?? 0) > 0 && (
          <View className="px-5 mb-4">
            <View className="flex-row items-center justify-between mb-3">
              <View className="flex-row items-center gap-2">
                <AlertTriangle size={18} color="#f59e0b" />
                <Text className="text-base font-extrabold text-neutral-900 dark:text-white">{t('auto.more.low_stock_alerts')}</Text>
                <View className="bg-amber-100 px-2 py-0.5 rounded-full">
                  <Text className="text-[10px] font-bold text-amber-700">
                    {data?.lowStockProducts?.length}
                  </Text>
                </View>
              </View>
              <Pressable
                onPress={() => router.push('/low-stock')}
                className="flex-row items-center gap-1 px-3 py-1.5 rounded-full bg-amber-100 dark:bg-amber-950/40"
              >
                <Text className="text-xs text-amber-700 font-extrabold">{t('auto.products.all')}</Text>
                <ArrowRight size={12} color="#b45309" />
              </Pressable>
            </View>
            <View className="gap-2">
              {data?.lowStockProducts?.slice(0, 4).map((p) => (
                <Pressable
                  key={p.id}
                  onPress={() => {
                    Haptics.selectionAsync();
                    router.push(`/products/${p.id}`);
                  }}
                  className="rounded-2xl bg-white dark:bg-neutral-900 border-2 p-3 flex-row items-center gap-3 active:opacity-70"
                  style={{
                    borderColor: p.stock === 0 ? '#fecaca' : '#fcd34d',
                  }}
                >
                  <View
                    className="h-11 w-11 rounded-2xl items-center justify-center"
                    style={{
                      backgroundColor: p.stock === 0 ? '#fee2e2' : '#fef3c7',
                    }}
                  >
                    <Package size={20} color={p.stock === 0 ? '#dc2626' : '#f59e0b'} />
                  </View>
                  <View className="flex-1">
                    <Text className="font-bold text-neutral-900 dark:text-white text-sm" numberOfLines={1}>
                      {p.name}
                    </Text>
                    <Text className="text-xs text-neutral-500 mt-0.5">
                      {formatPKRFull(p.price)} / {p.unit}
                    </Text>
                  </View>
                  <View className="items-end">
                    <Text
                      className="text-base font-extrabold"
                      style={{ color: p.stock === 0 ? '#dc2626' : '#f59e0b' }}
                    >
                      {p.stock}
                    </Text>
                    <Text
                      className="text-[9px] font-bold uppercase"
                      style={{ color: p.stock === 0 ? '#dc2626' : '#f59e0b' }}
                    >
                      {p.stock === 0 ? 'OUT' : 'LOW'}
                    </Text>
                  </View>
                </Pressable>
              ))}
            </View>
          </View>
        )}

        {/* ===== Recent Sales ===== */}
        <View className="px-5 mb-4">
          <View className="flex-row items-center justify-between mb-3">
            <View className="flex-row items-center gap-2">
              <Receipt size={18} color="#16a34a" />
              <Text className="text-base font-extrabold text-neutral-900 dark:text-white">{t('auto.index.recent_sales')}</Text>
            </View>
            <Pressable
              onPress={() => {
                Haptics.selectionAsync();
                router.push('/sales');
              }}
              className="flex-row items-center gap-1 px-3 py-1.5 rounded-full bg-brand-100 dark:bg-brand-950/40"
            >
              <Text className="text-xs text-brand-700 dark:text-brand-400 font-extrabold">{t('auto.index.see_all')}</Text>
              <ArrowRight size={12} color="#16a34a" />
            </Pressable>
          </View>

          {(data?.recentSales?.length ?? 0) === 0 ? (
            <View className="rounded-2xl bg-white dark:bg-neutral-900 border border-neutral-200 dark:border-neutral-800 items-center py-10">
              <View className="h-16 w-16 rounded-3xl bg-neutral-100 dark:bg-neutral-800 items-center justify-center">
                <ShoppingBag size={32} color="#9ca3af" />
              </View>
              <Text className="mt-3 text-base font-bold text-neutral-700 dark:text-neutral-300">{t('auto.index.no_sales_yet')}</Text>
              <Pressable
                onPress={() => router.push('/(tabs)/pos')}
                className="mt-4 h-10 px-5 rounded-xl flex-row items-center gap-1.5"
                style={{ backgroundColor: '#16a34a' }}
              >
                <Plus size={16} color="#ffffff" />
                <Text className="text-white font-bold text-sm">{t('auto.index.start_selling')}</Text>
              </Pressable>
            </View>
          ) : (
            <View className="gap-2">
              {data?.recentSales?.slice(0, 5).map((sale) => (
                <Pressable
                  key={sale.id}
                  onPress={() => {
                    Haptics.selectionAsync();
                    router.push(`/sales/${sale.id}`);
                  }}
                  className="rounded-2xl bg-white dark:bg-neutral-900 border border-neutral-200 dark:border-neutral-800 p-3 active:opacity-70"
                >
                  <View className="flex-row items-center gap-3">
                    <View
                      className="h-12 w-12 rounded-2xl items-center justify-center"
                      style={{ backgroundColor: isDark ? 'rgba(22,163,74,0.15)' : '#dcfce7' }}
                    >
                      <ShoppingBag size={20} color="#16a34a" />
                    </View>
                    <View className="flex-1">
                      <Text
                        className="font-extrabold text-neutral-900 dark:text-white text-sm font-mono"
                        numberOfLines={1}
                      >
                        {sale.saleNumber}
                      </Text>
                      <Text className="text-xs text-neutral-500 mt-0.5" numberOfLines={1}>
                        {sale.customer?.name || 'Walk-in'} • {formatRelative(sale.soldAt)}
                      </Text>
                    </View>
                    <View className="items-end">
                      <Text className="font-extrabold text-emerald-700 dark:text-emerald-400 text-base">
                        {formatPKR(sale.total)}
                      </Text>
                      {sale.creditAmount > 0 && (
                        <Text className="text-[10px] text-amber-600 font-bold">
                          Udhaar: {formatPKR(sale.creditAmount)}
                        </Text>
                      )}
                    </View>
                    <ChevronRight size={18} color="#9ca3af" />
                  </View>
                </Pressable>
              ))}
            </View>
          )}
        </View>

        {/* ===== Month Summary ===== */}
        <View className="px-5 mb-4">
          <Text className="text-base font-extrabold text-neutral-900 dark:text-white mb-3">{t('auto.index.is_mahine_ka_hisab')}</Text>
          <View
            className="rounded-3xl p-5"
            style={{
              backgroundColor: '#7c3aed',
              shadowColor: '#7c3aed',
              shadowOpacity: 0.3,
              shadowRadius: 12,
              elevation: 6,
            }}
          >
            <View className="flex-row items-center gap-3 mb-3">
              <View className="h-14 w-14 rounded-2xl bg-white/20 items-center justify-center">
                <BarChart3 size={28} color="#ffffff" />
              </View>
              <View className="flex-1">
                <Text className="text-xs font-bold uppercase tracking-wider text-white/80">{t('auto.index.net_profit_month')}</Text>
                <Text className="text-3xl font-extrabold text-white">
                  {formatPKR(stats?.netProfitMonth ?? 0)}
                </Text>
                {growthVsLastMonth !== 0 && (
                  <View className="flex-row items-center gap-1 mt-1">
                    {growthVsLastMonth >= 0 ? (
                      <TrendingUp size={10} color="#ffffff" />
                    ) : (
                      <TrendingDown size={10} color="#fecaca" />
                    )}
                    <Text className="text-[10px] font-extrabold text-white">
                      {formatPercent(growthVsLastMonth)} vs last month
                    </Text>
                  </View>
                )}
              </View>
            </View>
            <View className="pt-3 border-t border-white/20 flex-row items-center justify-between">
              <View>
                <Text className="text-[10px] font-bold uppercase tracking-wider text-white/70">{t('auto.index.revenue')}</Text>
                <Text className="text-base font-extrabold text-white mt-0.5">
                  {formatPKR(stats?.salesMonth ?? 0)}
                </Text>
              </View>
              <View>
                <Text className="text-[10px] font-bold uppercase tracking-wider text-white/70">{t('auto.index.orders')}</Text>
                <Text className="text-base font-extrabold text-white mt-0.5">
                  {stats?.ordersMonth ?? 0}
                </Text>
              </View>
              <View>
                <Text className="text-[10px] font-bold uppercase tracking-wider text-white/70">
                  AOV
                </Text>
                <Text className="text-base font-extrabold text-white mt-0.5">
                  {formatPKR(stats?.aovMonth ?? 0)}
                </Text>
              </View>
            </View>
          </View>
        </View>

        {/* ===== Inventory Health ===== */}
        <View className="px-5 mb-4">
          <Text className="text-base font-extrabold text-neutral-900 dark:text-white mb-3">{t('auto.index.inventory_health')}</Text>
          <View className="rounded-2xl bg-white dark:bg-neutral-900 border border-neutral-200 dark:border-neutral-800 p-4 gap-3">
            <View className="flex-row items-center gap-3">
              <View className="h-12 w-12 rounded-2xl bg-blue-100 items-center justify-center">
                <Boxes size={20} color="#2563eb" />
              </View>
              <View className="flex-1">
                <Text className="text-xs font-bold uppercase tracking-wider text-neutral-500">{t('auto.index.stock_value_cost')}</Text>
                <Text className="text-xl font-extrabold text-neutral-900 dark:text-white">
                  {formatPKR(stats?.inventoryValueAtCost ?? 0)}
                </Text>
              </View>
            </View>
            <View className="pt-3 border-t border-neutral-100 dark:border-neutral-800 flex-row items-center justify-between">
              <View>
                <Text className="text-[10px] text-neutral-500 font-bold uppercase">{t('auto.index.sell_value')}</Text>
                <Text className="text-sm font-extrabold text-emerald-700 mt-0.5">
                  {formatPKR(stats?.inventoryValueAtPrice ?? 0)}
                </Text>
              </View>
              <View>
                <Text className="text-[10px] text-neutral-500 font-bold uppercase">{t('auto.index.potential_profit')}</Text>
                <Text className="text-sm font-extrabold text-violet-700 mt-0.5">
                  {formatPKR(stats?.potentialProfit ?? 0)}
                </Text>
              </View>
              <View>
                <Text className="text-[10px] text-neutral-500 font-bold uppercase">{t('auto.products.products')}</Text>
                <Text className="text-sm font-extrabold text-neutral-900 dark:text-white mt-0.5">
                  {stats?.totalProducts ?? 0}
                </Text>
              </View>
            </View>
          </View>
        </View>

        {/* ===== Footer ===== */}
        <View className="items-center mt-4">
          <Text className="text-xs text-neutral-400 font-semibold">{t('auto.more.made_in_pakistan_with')}</Text>
        </View>
      </ScrollView>
    </SafeAreaView>
  );
}
