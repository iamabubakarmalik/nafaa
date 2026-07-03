import { useState, useMemo } from 'react';
import {
  View, Text, ScrollView, Pressable, RefreshControl, TextInput,
  Dimensions,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { useRouter, Stack } from 'expo-router';
import { useQuery } from '@tanstack/react-query';
import * as Haptics from 'expo-haptics';
import {
  ArrowLeft, PackagePlus, Sparkles, Plus, Truck, CalendarClock,
  Package, ChevronRight, TrendingUp, TrendingDown, Wallet, Receipt,
  Search, X, BarChart3, Award, Crown, Star, AlertTriangle,
  ArrowUpRight, ArrowDownRight, Building2, Layers, DollarSign,
  CreditCard, Banknote, Smartphone, Zap, Activity,
} from 'lucide-react-native';
import { purchasesApi } from '@/api/purchases.api';
import { formatPKR, formatPKRFull } from '@/lib/format';
import { MiniLineChart } from '@/components/charts/MiniLineChart';
import { DonutChart } from '@/components/charts/DonutChart';
import { useTranslation } from '@/i18n/useTranslation';
import { useSmartBack } from '@/hooks/useSmartBack';

const { width: SCREEN_W } = Dimensions.get('window');

const formatDate = (v: string) =>
  new Intl.DateTimeFormat('en-PK', { dateStyle: 'medium', timeStyle: 'short' }).format(new Date(v));

const formatShortDate = (v: string) =>
  new Intl.DateTimeFormat('en-PK', { month: 'short', day: 'numeric' }).format(new Date(v));

const formatPercent = (n: number) => {
  const sign = n > 0 ? '+' : '';
  return `${sign}${n.toFixed(1)}%`;
};

const paymentConfig: Record<string, { label: string; icon: any; color: string }> = {
  CASH: { label: 'Cash', icon: Banknote, color: '#16a34a' },
  CARD: { label: 'Card', icon: CreditCard, color: '#2563eb' },
  JAZZCASH: { label: 'JazzCash', icon: Smartphone, color: '#f97316' },
  EASYPAISA: { label: 'EasyPaisa', icon: Zap, color: '#22c55e' },
  BANK_TRANSFER: { label: 'Bank', icon: Building2, color: '#7c3aed' },
};

type Tab = 'history' | 'analytics';

export default function PurchasesScreen() {
  const { t } = useTranslation();
  const router = useRouter();
  const goBack = useSmartBack();
  const [refreshing, setRefreshing] = useState(false);
  const [search, setSearch] = useState('');
  const [tab, setTab] = useState<Tab>('history');

  const { data: purchases = [], refetch: refetchList } = useQuery({
    queryKey: ['purchases'],
    queryFn: async () => {
      try {
        const r = await purchasesApi.list();
        return Array.isArray(r) ? r : [];
      } catch {
        return [];
      }
    },
  });

  const { data: summary, refetch: refetchSummary } = useQuery({
    queryKey: ['purchases-summary'],
    queryFn: async () => {
      try {
        return await purchasesApi.summary();
      } catch {
        return null;
      }
    },
  });

  const onRefresh = async () => {
    setRefreshing(true);
    await Promise.all([refetchList(), refetchSummary()]);
    setRefreshing(false);
  };

  // Filter for history
  const filtered = useMemo(() => {
    if (!search.trim()) return purchases;
    const q = search.toLowerCase().trim();
    return purchases.filter(
      (p) =>
        p.purchaseNumber.toLowerCase().includes(q) ||
        (p.supplier?.name || '').toLowerCase().includes(q),
    );
  }, [purchases, search]);

  // Trend data
  const trendData = useMemo(() => {
    if (!summary?.salesTrend7Days) return [];
    return summary.salesTrend7Days.map((p, i) => ({
      value: p.total,
      label: String(new Date(p.date).getDate()),
    }));
  }, [summary]);

  // Payment donut
  const paymentDonut = useMemo(() => {
    if (!summary?.paymentBreakdown) return [];
    return summary.paymentBreakdown.map((p) => ({
      label: paymentConfig[p.paymentMethod]?.label || p.paymentMethod,
      value: p.total,
      color: paymentConfig[p.paymentMethod]?.color || '#64748b',
    }));
  }, [summary]);

  const growthVsYesterday = summary?.growthVsYesterday ?? 0;
  const growthVsLastMonth = summary?.growthVsLastMonth ?? 0;

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
            Purchases
          </Text>
          <View className="flex-row items-center gap-1.5 mt-0.5">
            <Sparkles size={11} color="#7c3aed" />
            <Text className="text-xs text-neutral-500">
              {summary?.totalCount ?? 0} orders • Stock IN
            </Text>
          </View>
        </View>
        <Pressable
          onPress={() => {
            Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
            router.push('/purchases/new');
          }}
          className="h-11 px-4 rounded-2xl flex-row items-center gap-1.5 active:opacity-80"
          style={{
            backgroundColor: '#7c3aed',
            shadowColor: '#7c3aed',
            shadowOpacity: 0.3,
            shadowRadius: 8,
            elevation: 4,
          }}
        >
          <Plus size={16} color="#ffffff" />
          <Text className="text-white font-bold text-sm">New</Text>
        </Pressable>
      </View>

      {/* Tabs */}
      <View className="px-5 pb-3 flex-row gap-2">
        {([
          { id: 'history' as Tab, label: 'History', icon: Receipt },
          { id: 'analytics' as Tab, label: 'Analytics', icon: BarChart3 },
        ]).map((t) => {
          const Icon = t.icon;
          const active = tab === t.id;
          return (
            <Pressable
              key={t.id}
              onPress={() => {
                Haptics.selectionAsync();
                setTab(t.id);
              }}
              className="flex-1 h-10 rounded-xl border-2 flex-row items-center justify-center gap-1.5"
              style={{
                backgroundColor: active ? '#7c3aed' : '#ffffff',
                borderColor: active ? '#7c3aed' : '#e5e7eb',
              }}
            >
              <Icon size={14} color={active ? '#ffffff' : '#7c3aed'} />
              <Text
                className="text-sm font-extrabold"
                style={{ color: active ? '#ffffff' : '#374151' }}
              >
                {t.label}
              </Text>
            </Pressable>
          );
        })}
      </View>

      <ScrollView
        contentContainerStyle={{ paddingBottom: 40 }}
        refreshControl={
          <RefreshControl refreshing={refreshing} onRefresh={onRefresh} tintColor="#7c3aed" />
        }
        showsVerticalScrollIndicator={false}
      >
        {/* Hero (always visible) */}
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
                <PackagePlus size={28} color="#ffffff" />
              </View>
              <View className="flex-1">
                <Text className="text-xs font-bold uppercase tracking-wider text-white/80">
                  Total Purchases
                </Text>
                <Text className="text-3xl font-extrabold text-white">
                  {formatPKR(summary?.totalPurchases ?? 0)}
                </Text>
                <Text className="text-xs text-white/80 mt-0.5">
                  {summary?.totalCount ?? 0} orders lifetime
                </Text>
              </View>
            </View>
            <View className="pt-3 border-t border-white/20 flex-row items-center justify-between">
              <View>
                <Text className="text-[10px] font-bold uppercase tracking-wider text-white/70">
                  Today
                </Text>
                <Text className="text-base font-extrabold text-white mt-0.5">
                  {formatPKR(summary?.todayPurchases ?? 0)}
                </Text>
              </View>
              <View>
                <Text className="text-[10px] font-bold uppercase tracking-wider text-white/70">
                  This Month
                </Text>
                <Text className="text-base font-extrabold text-white mt-0.5">
                  {formatPKR(summary?.monthPurchases ?? 0)}
                </Text>
              </View>
              <View>
                <Text className="text-[10px] font-bold uppercase tracking-wider text-white/70">
                  Due
                </Text>
                <Text className="text-base font-extrabold text-white mt-0.5">
                  {formatPKR(summary?.outstandingDue ?? 0)}
                </Text>
              </View>
            </View>
          </View>
        </View>

        {/* ═══ ANALYTICS TAB ═══ */}
        {tab === 'analytics' && (
          <>
            {/* Stats grid */}
            <View className="px-5 mb-4">
              <View className="flex-row flex-wrap -mx-1.5">
                <StatCard
                  label="Today"
                  value={formatPKR(summary?.todayPurchases ?? 0)}
                  sub={`${summary?.todayCount ?? 0} orders`}
                  icon={TrendingUp}
                  color="#7c3aed"
                  trend={growthVsYesterday}
                />
                <StatCard
                  label="This Month"
                  value={formatPKR(summary?.monthPurchases ?? 0)}
                  sub={`${summary?.monthCount ?? 0} orders`}
                  icon={CalendarClock}
                  color="#2563eb"
                  trend={growthVsLastMonth}
                />
                <StatCard
                  label="Lifetime"
                  value={formatPKR(summary?.totalPurchases ?? 0)}
                  sub={`${summary?.totalCount ?? 0} total`}
                  icon={Wallet}
                  color="#f59e0b"
                />
                <StatCard
                  label="Outstanding"
                  value={formatPKR(summary?.outstandingDue ?? 0)}
                  sub={`${summary?.suppliersWithDue ?? 0} suppliers`}
                  icon={AlertTriangle}
                  color="#dc2626"
                  isAlert={(summary?.outstandingDue ?? 0) > 0}
                />
              </View>
            </View>

            {/* Trend chart */}
            {trendData.length > 0 && (
              <View className="px-5 mb-4">
                <View className="flex-row items-center gap-2 mb-3">
                  <BarChart3 size={16} color="#7c3aed" />
                  <Text className="text-base font-extrabold text-neutral-900 dark:text-white">
                    7-Day Trend
                  </Text>
                </View>
                <View className="rounded-2xl bg-white dark:bg-neutral-900 border border-neutral-200 p-4">
                  <MiniLineChart
                    data={trendData}
                    height={140}
                    width={SCREEN_W - 60}
                    color="#7c3aed"
                    gradientId="purTrendGrad"
                    showLabels
                  />
                </View>
              </View>
            )}

            {/* Payment donut */}
            {paymentDonut.length > 0 && (
              <View className="px-5 mb-4">
                <View className="flex-row items-center gap-2 mb-3">
                  <CreditCard size={16} color="#2563eb" />
                  <Text className="text-base font-extrabold text-neutral-900 dark:text-white">
                    Payment Methods
                  </Text>
                </View>
                <View className="rounded-2xl bg-white dark:bg-neutral-900 border border-neutral-200 p-4">
                  <View className="items-center mb-4">
                    <DonutChart
                      data={paymentDonut}
                      size={160}
                      strokeWidth={22}
                      centerValue={String(paymentDonut.length)}
                      centerLabel="Methods"
                    />
                  </View>
                  <View className="gap-2">
                    {paymentDonut.map((p, i) => {
                      const total = paymentDonut.reduce((s, x) => s + x.value, 0);
                      const pct = total > 0 ? (p.value / total) * 100 : 0;
                      return (
                        <View key={i} className="flex-row items-center gap-2">
                          <View className="h-3 w-3 rounded-full" style={{ backgroundColor: p.color }} />
                          <Text className="flex-1 text-sm font-bold text-neutral-700">
                            {p.label}
                          </Text>
                          <Text className="text-xs text-neutral-500">{pct.toFixed(1)}%</Text>
                          <Text className="text-sm font-extrabold text-neutral-900 w-24 text-right">
                            {formatPKR(p.value)}
                          </Text>
                        </View>
                      );
                    })}
                  </View>
                </View>
              </View>
            )}

            {/* Top Suppliers */}
            {summary?.topSuppliers && summary.topSuppliers.length > 0 && (
              <View className="px-5 mb-4">
                <View className="flex-row items-center gap-2 mb-3">
                  <Crown size={16} color="#f59e0b" />
                  <Text className="text-base font-extrabold text-neutral-900 dark:text-white">
                    Top 5 Suppliers
                  </Text>
                </View>
                <View className="gap-2">
                  {summary.topSuppliers.slice(0, 5).map((ts, idx) => (
                    <View
                      key={ts.supplierId}
                      className="rounded-2xl bg-white dark:bg-neutral-900 border border-neutral-200 p-3 flex-row items-center gap-3"
                    >
                      <View
                        className="h-10 w-10 rounded-2xl items-center justify-center"
                        style={{
                          backgroundColor:
                            idx === 0 ? '#fef3c7' :
                            idx === 1 ? '#f1f5f9' :
                            idx === 2 ? '#ffedd5' :
                            '#f3f4f6',
                        }}
                      >
                        {idx < 3 ? (
                          <Crown
                            size={18}
                            color={idx === 0 ? '#f59e0b' : idx === 1 ? '#737373' : '#ea580c'}
                            fill={idx === 0 ? '#f59e0b' : idx === 1 ? '#737373' : '#ea580c'}
                          />
                        ) : (
                          <Text className="font-extrabold text-slate-700">#{idx + 1}</Text>
                        )}
                      </View>
                      <View className="flex-1">
                        <Text className="font-bold text-neutral-900 dark:text-white" numberOfLines={1}>
                          {ts.supplier?.name}
                        </Text>
                        <Text className="text-[11px] text-neutral-500 mt-0.5">
                          {ts.orderCount} orders
                        </Text>
                      </View>
                      <View className="items-end">
                        <Text className="text-base font-extrabold text-violet-700">
                          {formatPKR(ts.totalSpent)}
                        </Text>
                        {(ts.supplier?.outstandingDue ?? 0) > 0 && (
                          <Text className="text-[10px] text-rose-700 font-bold">
                            Due: {formatPKR(ts.supplier?.outstandingDue ?? 0)}
                          </Text>
                        )}
                      </View>
                    </View>
                  ))}
                </View>
              </View>
            )}

            {/* Top Products */}
            {summary?.topProducts && summary.topProducts.length > 0 && (
              <View className="px-5 mb-4">
                <View className="flex-row items-center gap-2 mb-3">
                  <Award size={16} color="#7c3aed" />
                  <Text className="text-base font-extrabold text-neutral-900 dark:text-white">
                    Top 5 Products
                  </Text>
                </View>
                <View className="gap-2">
                  {summary.topProducts.slice(0, 5).map((tp, idx) => (
                    <View
                      key={tp.productId}
                      className="rounded-2xl bg-white dark:bg-neutral-900 border border-neutral-200 p-3 flex-row items-center gap-3"
                    >
                      <View
                        className="h-10 w-10 rounded-2xl bg-violet-100 items-center justify-center"
                      >
                        {idx < 3 ? (
                          <Star size={18} color="#7c3aed" fill="#7c3aed" />
                        ) : (
                          <Package size={16} color="#7c3aed" />
                        )}
                      </View>
                      <View className="flex-1">
                        <Text className="font-bold text-neutral-900 dark:text-white" numberOfLines={1}>
                          {tp.product?.name}
                        </Text>
                        <Text className="text-[11px] text-neutral-500 mt-0.5">
                          {tp.quantityPurchased.toFixed(2)} {tp.product?.unit} • {tp.orderCount} orders
                        </Text>
                      </View>
                      <Text className="text-base font-extrabold text-violet-700">
                        {formatPKR(tp.totalSpent)}
                      </Text>
                    </View>
                  ))}
                </View>
              </View>
            )}

            {/* Comparisons */}
            <View className="px-5 mb-4">
              <View className="gap-2">
                <ComparisonCard
                  title="Today vs Yesterday"
                  currentLabel="Today"
                  currentValue={summary?.todayPurchases ?? 0}
                  previousLabel="Yesterday"
                  previousValue={summary?.yesterdayPurchases ?? 0}
                  growth={growthVsYesterday}
                />
                <ComparisonCard
                  title="This Month vs Last"
                  currentLabel="This Month"
                  currentValue={summary?.monthPurchases ?? 0}
                  previousLabel="Last Month"
                  previousValue={summary?.lastMonthPurchases ?? 0}
                  growth={growthVsLastMonth}
                />
              </View>
            </View>
          </>
        )}

        {/* ═══ HISTORY TAB ═══ */}
        {tab === 'history' && (
          <>
            {/* Search */}
            <View className="px-5 mb-3">
              <View className="flex-row items-center gap-2 rounded-2xl border border-neutral-200 bg-white dark:bg-neutral-900 px-4 h-12">
                <Search size={18} color="#9ca3af" />
                <TextInput
                  placeholder="Search purchase # or supplier..."
                  placeholderTextColor="#9ca3af"
                  value={search}
                  onChangeText={setSearch}
                  className="flex-1 text-sm text-neutral-900 dark:text-white"
                />
                {search.length > 0 && (
                  <Pressable
                    onPress={() => setSearch('')}
                    hitSlop={12}
                    className="h-7 w-7 rounded-full bg-neutral-100 items-center justify-center"
                  >
                    <X size={14} color="#9ca3af" />
                  </Pressable>
                )}
              </View>
            </View>

            {/* List */}
            <View className="px-5">
              {filtered.length === 0 ? (
                <View className="rounded-2xl bg-white dark:bg-neutral-900 border border-neutral-200 items-center py-12">
                  <View className="h-16 w-16 rounded-3xl bg-violet-100 items-center justify-center">
                    <PackagePlus size={32} color="#7c3aed" />
                  </View>
                  <Text className="mt-3 text-base font-bold text-neutral-700">
                    {search ? 'No matches' : 'No purchases yet'}
                  </Text>
                  <Text className="mt-1 text-xs text-neutral-500">
                    {search ? 'Try different search' : 'Stock incoming record karein'}
                  </Text>
                  {!search && (
                    <Pressable
                      onPress={() => router.push('/purchases/new')}
                      className="mt-4 h-10 px-5 rounded-xl flex-row items-center gap-1.5"
                      style={{ backgroundColor: '#7c3aed' }}
                    >
                      <Plus size={16} color="#ffffff" />
                      <Text className="text-white font-bold text-sm">New Purchase</Text>
                    </Pressable>
                  )}
                </View>
              ) : (
                <View className="gap-2.5">
                  {filtered.map((p) => {
                    const credit = Math.max(0, p.total - p.paidAmount);
                    const PayIcon = paymentConfig[p.paymentMethod]?.icon || Banknote;
                    const payColor = paymentConfig[p.paymentMethod]?.color || '#737373';
                    const rollCount = p.carpetRolls?.length ?? 0;

                    return (
                      <Pressable
                        key={p.id}
                        onPress={() => {
                          Haptics.selectionAsync();
                          router.push(`/purchases/${p.id}`);
                        }}
                        className="rounded-2xl bg-white dark:bg-neutral-900 border-2 border-neutral-200 p-3.5 active:opacity-70"
                      >
                        <View className="flex-row items-start gap-3">
                          <View
                            className="h-12 w-12 rounded-2xl items-center justify-center"
                            style={{ backgroundColor: `${payColor}20` }}
                          >
                            <PayIcon size={20} color={payColor} />
                          </View>
                          <View className="flex-1 min-w-0">
                            <View className="flex-row items-center gap-1.5 flex-wrap">
                              <Text className="font-mono text-sm font-extrabold text-neutral-900 dark:text-white">
                                {p.purchaseNumber}
                              </Text>
                              <View
                                className="px-1.5 py-0.5 rounded"
                                style={{
                                  backgroundColor:
                                    p.status === 'RECEIVED' ? '#dcfce7' :
                                    p.status === 'PENDING' ? '#fef3c7' :
                                    '#fee2e2',
                                }}
                              >
                                <Text
                                  className="text-[9px] font-extrabold uppercase"
                                  style={{
                                    color:
                                      p.status === 'RECEIVED' ? '#15803d' :
                                      p.status === 'PENDING' ? '#b45309' :
                                      '#b91c1c',
                                  }}
                                >
                                  {p.status}
                                </Text>
                              </View>
                              {rollCount > 0 && (
                                <View className="flex-row items-center gap-0.5 px-1.5 py-0.5 rounded bg-emerald-100">
                                  <Layers size={9} color="#15803d" />
                                  <Text className="text-[9px] font-extrabold text-emerald-700">
                                    {rollCount} ROLLS
                                  </Text>
                                </View>
                              )}
                            </View>
                            <View className="flex-row items-center gap-1 mt-1">
                              <Building2 size={10} color="#737373" />
                              <Text className="text-xs font-bold text-neutral-700" numberOfLines={1}>
                                {p.supplier?.name}
                              </Text>
                            </View>
                            <View className="flex-row items-center gap-2 mt-1 flex-wrap">
                              <View className="flex-row items-center gap-1">
                                <CalendarClock size={10} color="#9ca3af" />
                                <Text className="text-[10px] text-neutral-500">
                                  {formatShortDate(p.purchasedAt)}
                                </Text>
                              </View>
                              <View className="flex-row items-center gap-1">
                                <Package size={10} color="#9ca3af" />
                                <Text className="text-[10px] text-neutral-500">
                                  {p.items.length} items
                                </Text>
                              </View>
                            </View>
                          </View>
                          <View className="items-end">
                            <Text className="text-base font-extrabold text-violet-700">
                              {formatPKR(p.total)}
                            </Text>
                            <Text className="text-[10px] text-emerald-700 font-bold mt-0.5">
                              Paid: {formatPKR(p.paidAmount)}
                            </Text>
                            {credit > 0 && (
                              <View className="mt-1 px-1.5 py-0.5 rounded bg-rose-100">
                                <Text className="text-[9px] font-extrabold text-rose-700">
                                  Due: {formatPKR(credit)}
                                </Text>
                              </View>
                            )}
                            <ChevronRight size={14} color="#9ca3af" style={{ marginTop: 4 }} />
                          </View>
                        </View>

                        {/* Items preview */}
                        {p.items && p.items.length > 0 && (
                          <View className="mt-2.5 pt-2.5 border-t border-neutral-100 dark:border-neutral-800 gap-1">
                            {p.items.slice(0, 2).map((item) => (
                              <View key={item.id} className="flex-row items-center gap-1.5">
                                {item.product.unit === 'sqft' && (
                                  <Layers size={9} color="#15803d" />
                                )}
                                <Text className="text-[11px] text-neutral-600 flex-1" numberOfLines={1}>
                                  {item.product.name}
                                </Text>
                                <Text className="text-[11px] font-bold text-neutral-700">
                                  {item.quantity.toFixed(item.quantity % 1 === 0 ? 0 : 2)} × {formatPKR(item.costPrice)}
                                </Text>
                              </View>
                            ))}
                            {p.items.length > 2 && (
                              <Text className="text-[10px] text-neutral-500">
                                + {p.items.length - 2} more items
                              </Text>
                            )}
                          </View>
                        )}
                      </Pressable>
                    );
                  })}
                </View>
              )}
            </View>
          </>
        )}
      </ScrollView>
    </SafeAreaView>
  );
}

// ─── Helper Components ─────────────────────────
function StatCard({ label, value, sub, icon: Icon, color, trend, isAlert }: any) {
  return (
    <View className="w-1/2 px-1.5 mb-3">
      <View
        className="rounded-2xl border-2 p-3.5"
        style={{
          backgroundColor: isAlert ? '#fef2f2' : '#ffffff',
          borderColor: isAlert ? '#fca5a5' : '#e5e7eb',
        }}
      >
        <View className="flex-row items-center justify-between mb-2">
          <View
            className="h-10 w-10 rounded-xl items-center justify-center"
            style={{ backgroundColor: `${color}20` }}
          >
            <Icon size={16} color={color} />
          </View>
          {trend !== undefined && trend !== 0 && (
            <View
              className="flex-row items-center gap-0.5 px-1.5 py-0.5 rounded"
              style={{ backgroundColor: trend >= 0 ? '#dcfce7' : '#fee2e2' }}
            >
              {trend >= 0 ? (
                <ArrowUpRight size={10} color="#15803d" />
              ) : (
                <ArrowDownRight size={10} color="#b91c1c" />
              )}
              <Text
                className="text-[9px] font-extrabold"
                style={{ color: trend >= 0 ? '#15803d' : '#b91c1c' }}
              >
                {formatPercent(trend)}
              </Text>
            </View>
          )}
        </View>
        <Text className="text-lg font-extrabold text-neutral-900" numberOfLines={1}>
          {value}
        </Text>
        <Text className="text-[10px] text-neutral-500 font-bold mt-0.5" numberOfLines={1}>
          {sub}
        </Text>
      </View>
    </View>
  );
}

function ComparisonCard({ title, currentLabel, currentValue, previousLabel, previousValue, growth }: any) {
  const isUp = growth >= 0;
  return (
    <View className="rounded-2xl bg-white dark:bg-neutral-900 border-2 border-neutral-200 p-4">
      <Text className="text-xs font-bold text-neutral-700 mb-3">{title}</Text>
      <View className="flex-row gap-2 mb-2">
        <View className="flex-1 rounded-xl bg-violet-50 border border-violet-200 p-2.5">
          <Text className="text-[9px] uppercase font-extrabold text-violet-700">{currentLabel}</Text>
          <Text className="text-sm font-extrabold text-violet-900 mt-0.5">
            {formatPKR(currentValue)}
          </Text>
        </View>
        <View className="flex-1 rounded-xl bg-slate-50 border border-slate-200 p-2.5">
          <Text className="text-[9px] uppercase font-extrabold text-slate-600">{previousLabel}</Text>
          <Text className="text-sm font-extrabold text-slate-900 mt-0.5">
            {formatPKR(previousValue)}
          </Text>
        </View>
      </View>
      {growth !== 0 && (
        <View
          className="rounded-lg px-3 py-1.5 flex-row items-center gap-1 self-start"
          style={{ backgroundColor: isUp ? '#dcfce7' : '#fee2e2' }}
        >
          {isUp ? (
            <ArrowUpRight size={12} color="#15803d" />
          ) : (
            <ArrowDownRight size={12} color="#b91c1c" />
          )}
          <Text
            className="text-xs font-extrabold"
            style={{ color: isUp ? '#15803d' : '#b91c1c' }}
          >
            {formatPercent(growth)}
          </Text>
        </View>
      )}
    </View>
  );
}
