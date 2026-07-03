import { useState, useMemo } from 'react';
import {
  View, Text, ScrollView, Pressable, RefreshControl, TextInput, Modal, Image, Dimensions,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { useRouter, Stack } from 'expo-router';
import { useQuery } from '@tanstack/react-query';
import * as Haptics from 'expo-haptics';
import {
  ArrowLeft, TrendingUp, TrendingDown, Sparkles, Package, BarChart3,
  Crown, DollarSign, ChevronRight, Award, Calendar, Filter, X, Search,
  AlertTriangle, Layers, Smartphone, ArrowUpRight, ArrowDownRight, Star,
  Percent, ShoppingBag, RefreshCw, Tag, Building2, RotateCcw, AlertCircle,
  Check,
} from 'lucide-react-native';
import {
  profitReportApi,
  type ProfitFilters,
  type ProfitPeriod,
  type ProfitSortBy,
  type ProductProfit,
} from '@/api/profit-report.api';
import { categoriesApi } from '@/api/categories.api';
import { brandsApi } from '@/api/brands.api';
import { formatPKR, formatPKRFull } from '@/lib/format';
import { BarChart } from '@/components/charts/BarChart';
import { DonutChart } from '@/components/charts/DonutChart';
import {
  DateRangePicker,
  type DateRangeValue,
} from '@/components/reports/DateRangePicker';
import { useSmartBack } from '@/hooks/useSmartBack';

const { width: SCREEN_W } = Dimensions.get('window');

const PERIOD_LABELS: Record<ProfitPeriod, string> = {
  today: 'Today',
  week: '7 Days',
  month: '30 Days',
  quarter: '3 Months',
  year: '1 Year',
  all: 'All Time',
  custom: 'Custom',
};

const SORT_OPTIONS: Array<{ value: ProfitSortBy; label: string; icon: any }> = [
  { value: 'profit', label: 'Highest Profit', icon: TrendingUp },
  { value: 'margin', label: 'Best Margin %', icon: Percent },
  { value: 'revenue', label: 'Most Revenue', icon: DollarSign },
  { value: 'quantity', label: 'Most Sold', icon: ShoppingBag },
];

const PIE_COLORS = ['#10b981', '#3b82f6', '#8b5cf6', '#f59e0b', '#ec4899', '#06b6d4', '#84cc16', '#f43f5e'];

export default function ProfitReportScreen() {
  const router = useRouter();
  const goBack = useSmartBack();
  const [filters, setFilters] = useState<ProfitFilters>({ period: 'month', sortBy: 'profit' });
  const [search, setSearch] = useState('');
  const [refreshing, setRefreshing] = useState(false);
  const [showDateRange, setShowDateRange] = useState(false);
  const [showFilters, setShowFilters] = useState(false);
  const [showSortModal, setShowSortModal] = useState(false);

  const { data: summary, refetch: refetchSummary } = useQuery({
    queryKey: ['profit-summary-mobile', filters],
    queryFn: () => profitReportApi.summary(filters),
  });

  const { data: products = [], refetch: refetchProducts } = useQuery({
    queryKey: ['profit-by-product-mobile', filters],
    queryFn: () => profitReportApi.byProduct(filters),
  });

  const { data: categories = [] } = useQuery({
    queryKey: ['categories-for-profit'],
    queryFn: async () => {
      try {
        return await categoriesApi.list();
      } catch {
        return [];
      }
    },
  });

  const { data: brands = [] } = useQuery({
    queryKey: ['brands-for-profit'],
    queryFn: async () => {
      try {
        return await brandsApi.list();
      } catch {
        return [];
      }
    },
  });

  const onRefresh = async () => {
    setRefreshing(true);
    await Promise.all([refetchSummary(), refetchProducts()]);
    setRefreshing(false);
  };

  const filteredProducts = useMemo(() => {
    const q = search.toLowerCase().trim();
    if (!q) return products;
    return products.filter(
      (p) =>
        p.name.toLowerCase().includes(q) ||
        (p.sku || '').toLowerCase().includes(q) ||
        (p.categoryName || '').toLowerCase().includes(q) ||
        (p.brandName || '').toLowerCase().includes(q),
    );
  }, [products, search]);

  const hasActiveFilters = !!(filters.categoryId || filters.brandId ||
    (filters.period && filters.period !== 'all' && filters.period !== 'month'));

  const clearFilters = () => {
    setFilters({ period: 'month', sortBy: 'profit' });
    setSearch('');
  };

  const currentPeriodLabel = filters.period === 'custom' && filters.startDate && filters.endDate
    ? `${new Date(filters.startDate).toLocaleDateString('en-PK', { month: 'short', day: 'numeric' })} - ${new Date(filters.endDate).toLocaleDateString('en-PK', { month: 'short', day: 'numeric' })}`
    : PERIOD_LABELS[filters.period || 'month'];

  const currentSort = SORT_OPTIONS.find((s) => s.value === (filters.sortBy || 'profit'));

  const categoryDonut = summary?.categoryBreakdown.slice(0, 6).map((c, i) => ({
    label: c.name,
    value: Math.max(c.profit, 0),
    color: c.color || PIE_COLORS[i % PIE_COLORS.length],
  })) || [];

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
          <ArrowLeft size={20} color="#16a34a" />
        </Pressable>
        <View className="flex-1">
          <Text className="text-2xl font-extrabold text-neutral-900 dark:text-white">
            Profit Report
          </Text>
          <View className="flex-row items-center gap-1.5 mt-0.5">
            <Sparkles size={11} color="#16a34a" />
            <Text className="text-xs text-neutral-500">Industry-aware analytics</Text>
          </View>
        </View>
      </View>

      {/* Period + Sort + Filter Row */}
      <View className="px-5 pb-3 gap-2">
        <View className="flex-row gap-2">
          <Pressable
            onPress={() => {
              Haptics.selectionAsync();
              setShowDateRange(true);
            }}
            className="flex-1 h-11 rounded-xl border-2 flex-row items-center gap-2 px-3 active:opacity-70"
            style={{
              backgroundColor: '#ede9fe',
              borderColor: '#7c3aed',
            }}
          >
            <Calendar size={14} color="#7c3aed" />
            <View className="flex-1">
              <Text className="text-[9px] uppercase font-extrabold text-violet-700">Period</Text>
              <Text className="text-xs font-extrabold text-violet-900" numberOfLines={1}>
                {currentPeriodLabel}
              </Text>
            </View>
          </Pressable>

          <Pressable
            onPress={() => {
              Haptics.selectionAsync();
              setShowSortModal(true);
            }}
            className="flex-1 h-11 rounded-xl border-2 flex-row items-center gap-2 px-3 active:opacity-70"
            style={{
              backgroundColor: '#ffffff',
              borderColor: '#e5e7eb',
            }}
          >
            {currentSort && <currentSort.icon size={14} color="#0891b2" />}
            <View className="flex-1">
              <Text className="text-[9px] uppercase font-extrabold text-neutral-500">Sort</Text>
              <Text className="text-xs font-extrabold text-neutral-900" numberOfLines={1}>
                {currentSort?.label}
              </Text>
            </View>
          </Pressable>

          <Pressable
            onPress={() => {
              Haptics.selectionAsync();
              setShowFilters(true);
            }}
            className="h-11 px-4 rounded-xl border-2 flex-row items-center gap-1.5 relative"
            style={{
              backgroundColor: hasActiveFilters ? '#dcfce7' : '#ffffff',
              borderColor: hasActiveFilters ? '#16a34a' : '#e5e7eb',
            }}
          >
            <Filter size={14} color={hasActiveFilters ? '#15803d' : '#6b7280'} />
            <Text
              className="text-xs font-extrabold"
              style={{ color: hasActiveFilters ? '#15803d' : '#374151' }}
            >
              Filter
            </Text>
            {hasActiveFilters && (
              <View className="absolute -top-1 -right-1 h-4 w-4 rounded-full bg-emerald-600 items-center justify-center">
                <Text className="text-white text-[8px] font-extrabold">!</Text>
              </View>
            )}
          </Pressable>
        </View>

        {/* Search */}
        <View className="flex-row items-center gap-2 rounded-xl border border-neutral-200 bg-white px-3 h-11">
          <Search size={16} color="#9ca3af" />
          <TextInput
            placeholder="Search product, SKU, category..."
            placeholderTextColor="#9ca3af"
            value={search}
            onChangeText={setSearch}
            className="flex-1 text-sm text-neutral-900"
          />
          {search.length > 0 && (
            <Pressable onPress={() => setSearch('')} hitSlop={12}>
              <X size={16} color="#9ca3af" />
            </Pressable>
          )}
        </View>
      </View>

      <ScrollView
        contentContainerStyle={{ paddingBottom: 40 }}
        refreshControl={
          <RefreshControl refreshing={refreshing} onRefresh={onRefresh} tintColor="#16a34a" />
        }
        showsVerticalScrollIndicator={false}
      >
        {/* Hero — Total Profit */}
        <View className="px-5 mb-4">
          <View
            className="rounded-3xl p-5"
            style={{
              backgroundColor: '#16a34a',
              shadowColor: '#16a34a',
              shadowOpacity: 0.3,
              shadowRadius: 16,
              shadowOffset: { width: 0, height: 8 },
              elevation: 10,
            }}
          >
            <View className="flex-row items-center gap-3">
              <View className="h-14 w-14 rounded-2xl bg-white/20 items-center justify-center">
                <TrendingUp size={28} color="#ffffff" />
              </View>
              <View className="flex-1">
                <Text className="text-[10px] font-bold uppercase tracking-wider text-white/80">
                  Total Profit • {currentPeriodLabel}
                </Text>
                <Text className="text-3xl font-extrabold text-white mt-1">
                  {formatPKRFull(summary?.totalProfit ?? 0)}
                </Text>
                <View className="flex-row items-center gap-1 mt-1">
                  <Percent size={11} color="rgba(255,255,255,0.8)" />
                  <Text className="text-xs text-white/80 font-bold">
                    {(summary?.overallMargin ?? 0).toFixed(1)}% overall margin
                  </Text>
                </View>
              </View>
            </View>
            <View className="mt-4 pt-4 border-t border-white/20 flex-row items-center justify-between">
              <View>
                <Text className="text-[10px] font-bold uppercase tracking-wider text-white/70">Revenue</Text>
                <Text className="text-base font-extrabold text-white mt-0.5">
                  {formatPKR(summary?.totalRevenue ?? 0)}
                </Text>
              </View>
              <View>
                <Text className="text-[10px] font-bold uppercase tracking-wider text-white/70">Cost</Text>
                <Text className="text-base font-extrabold text-white mt-0.5">
                  {formatPKR(summary?.totalCost ?? 0)}
                </Text>
              </View>
              <View>
                <Text className="text-[10px] font-bold uppercase tracking-wider text-white/70">Orders</Text>
                <Text className="text-base font-extrabold text-white mt-0.5">
                  {summary?.totalOrders ?? 0}
                </Text>
              </View>
            </View>
          </View>
        </View>

        {/* KPI Grid */}
        {summary && (
          <View className="px-5 mb-4">
            <View className="flex-row flex-wrap -mx-1.5">
              <KpiCard
                label="Products Sold"
                value={String(summary.productsCount)}
                sub={`${summary.totalQtySold.toFixed(0)} units`}
                icon={Package}
                color="#2563eb"
              />
              <KpiCard
                label="Returns"
                value={String(summary.totalReturns)}
                sub="Sale returns"
                icon={RotateCcw}
                color="#dc2626"
              />
            </View>
          </View>
        )}

        {/* Industry Breakdown */}
        {summary && (summary.carpetCount > 0 || summary.mobileCount > 0) && (
          <View className="px-5 mb-4">
            <Text className="text-xs uppercase font-extrabold text-neutral-500 tracking-wider mb-2">
              Industry Breakdown
            </Text>
            <View className="gap-2">
              {summary.standardCount > 0 && (
                <IndustryBadge
                  label="Standard Products"
                  count={summary.standardCount}
                  icon={Package}
                  color="#64748b"
                  bg="#f1f5f9"
                />
              )}
              {summary.carpetCount > 0 && (
                <IndustryBadge
                  label="Carpet Products"
                  count={summary.carpetCount}
                  icon={Layers}
                  color="#16a34a"
                  bg="#dcfce7"
                />
              )}
              {summary.mobileCount > 0 && (
                <IndustryBadge
                  label="Mobile Products"
                  count={summary.mobileCount}
                  icon={Smartphone}
                  color="#2563eb"
                  bg="#dbeafe"
                />
              )}
            </View>
          </View>
        )}

        {/* Top Performers */}
        {summary?.topProfitable && summary.topProfitable.length > 0 && (
          <View className="px-5 mb-4">
            <View className="flex-row items-center gap-2 mb-3">
              <Crown size={18} color="#f59e0b" fill="#f59e0b" />
              <Text className="text-base font-extrabold text-neutral-900 dark:text-white">
                Top Profitable
              </Text>
              <View className="ml-auto px-2 py-0.5 rounded-full bg-amber-100">
                <Text className="text-[10px] font-bold text-amber-700">TOP 5</Text>
              </View>
            </View>
            <View className="gap-2">
              {summary.topProfitable.slice(0, 5).map((p, idx) => (
                <TopProductCard key={p.productId} product={p} rank={idx + 1} variant="profit" />
              ))}
            </View>
          </View>
        )}

        {/* Highest Margin */}
        {summary?.highestMargin && summary.highestMargin.length > 0 && (
          <View className="px-5 mb-4">
            <View className="flex-row items-center gap-2 mb-3">
              <Percent size={18} color="#7c3aed" />
              <Text className="text-base font-extrabold text-neutral-900 dark:text-white">
                Highest Margin %
              </Text>
              <View className="ml-auto px-2 py-0.5 rounded-full bg-violet-100">
                <Text className="text-[10px] font-bold text-violet-700">BEST MARGINS</Text>
              </View>
            </View>
            <View className="gap-2">
              {summary.highestMargin.slice(0, 5).map((p, idx) => (
                <TopProductCard key={p.productId} product={p} rank={idx + 1} variant="margin" />
              ))}
            </View>
          </View>
        )}

        {/* Losses Alert */}
        {summary?.losses && summary.losses.length > 0 && (
          <View className="px-5 mb-4">
            <View className="rounded-3xl bg-rose-50 border-2 border-rose-300 p-4">
              <View className="flex-row items-center gap-2 mb-1">
                <AlertCircle size={18} color="#dc2626" />
                <Text className="text-base font-extrabold text-rose-900">
                  Products with Losses ({summary.losses.length})
                </Text>
              </View>
              <Text className="text-xs text-rose-700 mb-3">
                Ye products lagat se kam mein bik rahe hain — review karein
              </Text>
              <View className="gap-2">
                {summary.losses.slice(0, 5).map((p) => (
                  <View
                    key={p.productId}
                    className="rounded-xl bg-white border border-rose-200 p-3 flex-row items-center gap-3"
                  >
                    <View className="h-10 w-10 rounded-lg bg-rose-100 items-center justify-center">
                      <TrendingDown size={18} color="#dc2626" />
                    </View>
                    <View className="flex-1 min-w-0">
                      <Text className="font-bold text-sm text-neutral-900" numberOfLines={1}>
                        {p.name}
                      </Text>
                      <Text className="text-[10px] text-neutral-500 mt-0.5">
                        {p.quantitySold} {p.unit} sold • {p.ordersCount} orders
                      </Text>
                    </View>
                    <View className="items-end">
                      <Text className="text-base font-extrabold text-rose-700">
                        {formatPKR(p.profit)}
                      </Text>
                      <Text className="text-[10px] text-rose-600 font-bold">
                        {p.margin.toFixed(1)}%
                      </Text>
                    </View>
                  </View>
                ))}
              </View>
            </View>
          </View>
        )}

        {/* Category Chart */}
        {categoryDonut.length > 0 && (
          <View className="px-5 mb-4">
            <View className="flex-row items-center gap-2 mb-3">
              <BarChart3 size={18} color="#0891b2" />
              <Text className="text-base font-extrabold text-neutral-900 dark:text-white">
                Profit by Category
              </Text>
            </View>
            <View className="rounded-2xl bg-white border border-neutral-200 p-4">
              <View className="items-center mb-4">
                <DonutChart
                  data={categoryDonut}
                  size={180}
                  strokeWidth={26}
                  centerValue={formatPKR(summary?.totalProfit || 0)}
                  centerLabel="Total profit"
                />
              </View>
              <View className="gap-2">
                {summary?.categoryBreakdown.slice(0, 6).map((c, i) => {
                  const pct = summary.totalProfit > 0 ? (c.profit / summary.totalProfit) * 100 : 0;
                  return (
                    <View key={i} className="flex-row items-center gap-2">
                      <View
                        className="h-3 w-3 rounded-full"
                        style={{ backgroundColor: c.color || PIE_COLORS[i % PIE_COLORS.length] }}
                      />
                      <Text className="flex-1 text-sm font-bold text-neutral-700" numberOfLines={1}>
                        {c.name}
                      </Text>
                      <Text className="text-xs text-neutral-500">{pct.toFixed(1)}%</Text>
                      <Text className="text-sm font-extrabold text-neutral-900 w-24 text-right">
                        {formatPKR(c.profit)}
                      </Text>
                    </View>
                  );
                })}
              </View>
            </View>
          </View>
        )}

        {/* Top Products Bar */}
        {summary?.topProfitable && summary.topProfitable.length > 0 && (
          <View className="px-5 mb-4">
            <View className="flex-row items-center gap-2 mb-3">
              <Award size={18} color="#f59e0b" />
              <Text className="text-base font-extrabold text-neutral-900 dark:text-white">
                Top 10 Bar Chart
              </Text>
            </View>
            <View className="rounded-2xl bg-white border border-neutral-200 p-4">
              <BarChart
                data={summary.topProfitable.slice(0, 10).map((p) => ({
                  label: p.name.length > 15 ? p.name.slice(0, 15) + '…' : p.name,
                  value: p.profit,
                  color: '#16a34a',
                }))}
                defaultColor="#16a34a"
                formatValue={(n) => formatPKR(n)}
              />
            </View>
          </View>
        )}

        {/* Brand Breakdown */}
        {summary?.brandBreakdown && summary.brandBreakdown.length > 0 && (
          <View className="px-5 mb-4">
            <View className="flex-row items-center gap-2 mb-3">
              <Building2 size={18} color="#7c3aed" />
              <Text className="text-base font-extrabold text-neutral-900 dark:text-white">
                Top Brands
              </Text>
            </View>
            <View className="gap-2">
              {summary.brandBreakdown.slice(0, 5).map((b, idx) => (
                <View
                  key={b.name}
                  className="rounded-2xl bg-white border border-neutral-200 p-3 flex-row items-center gap-3"
                >
                  <View
                    className="h-10 w-10 rounded-2xl items-center justify-center"
                    style={{
                      backgroundColor:
                        idx === 0 ? '#fef3c7' : idx === 1 ? '#f3f4f6' : idx === 2 ? '#ffedd5' : '#ede9fe',
                    }}
                  >
                    <Building2
                      size={16}
                      color={idx === 0 ? '#d97706' : idx === 1 ? '#64748b' : idx === 2 ? '#ea580c' : '#7c3aed'}
                    />
                  </View>
                  <View className="flex-1">
                    <Text className="font-extrabold text-sm text-neutral-900">{b.name}</Text>
                    <Text className="text-[10px] text-neutral-500 mt-0.5">{b.count} products</Text>
                  </View>
                  <View className="items-end">
                    <Text className="text-sm font-extrabold text-emerald-700">
                      {formatPKR(b.profit)}
                    </Text>
                    <Text className="text-[10px] text-neutral-500">
                      {formatPKR(b.revenue)} rev
                    </Text>
                  </View>
                </View>
              ))}
            </View>
          </View>
        )}

        {/* All Products Detailed List */}
        <View className="px-5">
          <View className="flex-row items-center gap-2 mb-3">
            <BarChart3 size={18} color="#2563eb" />
            <Text className="text-base font-extrabold text-neutral-900 dark:text-white">
              All Products
            </Text>
            <View className="ml-auto px-2 py-0.5 rounded-full bg-blue-100">
              <Text className="text-[10px] font-bold text-blue-700">
                {filteredProducts.length}
              </Text>
            </View>
          </View>

          {filteredProducts.length === 0 ? (
            <View className="rounded-2xl bg-white border border-neutral-200 items-center py-12">
              <View className="h-16 w-16 rounded-3xl bg-emerald-100 items-center justify-center">
                <TrendingUp size={32} color="#16a34a" />
              </View>
              <Text className="mt-3 text-base font-bold text-neutral-700">
                {search ? 'No matches' : 'No sales data yet'}
              </Text>
              <Text className="mt-1 text-xs text-neutral-500 text-center px-8">
                {search ? 'Different search karein' : 'Sales hone par profit calculate hoga'}
              </Text>
            </View>
          ) : (
            <View className="gap-2">
              {filteredProducts.map((p, idx) => (
                <ProductProfitRow
                  key={p.productId}
                  product={p}
                  rank={idx + 1}
                  onPress={() => {
                    Haptics.selectionAsync();
                    router.push(`/products/${p.productId}`);
                  }}
                />
              ))}
            </View>
          )}
        </View>
      </ScrollView>

      {/* Date Range Picker Modal */}
      <DateRangePicker
        visible={showDateRange}
        value={{
          period: filters.period || 'month',
          startDate: filters.startDate,
          endDate: filters.endDate,
        }}
        onConfirm={(v: DateRangeValue) => {
          setFilters({
            ...filters,
            period: v.period as ProfitPeriod,
            startDate: v.startDate,
            endDate: v.endDate,
          });
          setShowDateRange(false);
        }}
        onClose={() => setShowDateRange(false)}
      />

      {/* Sort Modal */}
      <Modal
        visible={showSortModal}
        animationType="slide"
        presentationStyle="formSheet"
        onRequestClose={() => setShowSortModal(false)}
      >
        <SafeAreaView className="flex-1 bg-neutral-50">
          <View className="px-5 py-4 border-b border-neutral-200 flex-row items-center gap-3">
            <View className="h-11 w-11 rounded-2xl bg-cyan-600 items-center justify-center">
              <TrendingUp size={20} color="#ffffff" />
            </View>
            <Text className="flex-1 text-lg font-bold text-neutral-900">Sort By</Text>
            <Pressable
              onPress={() => setShowSortModal(false)}
              hitSlop={12}
              className="h-10 w-10 rounded-2xl bg-neutral-100 items-center justify-center"
            >
              <X size={20} color="#6b7280" />
            </Pressable>
          </View>
          <ScrollView contentContainerStyle={{ padding: 20 }}>
            <View className="gap-2">
              {SORT_OPTIONS.map((opt) => {
                const Icon = opt.icon;
                const active = filters.sortBy === opt.value;
                return (
                  <Pressable
                    key={opt.value}
                    onPress={() => {
                      Haptics.selectionAsync();
                      setFilters({ ...filters, sortBy: opt.value });
                      setShowSortModal(false);
                    }}
                    className="rounded-2xl border-2 p-4 flex-row items-center gap-3"
                    style={{
                      backgroundColor: active ? '#0891b2' : '#ffffff',
                      borderColor: active ? '#0891b2' : '#e5e7eb',
                    }}
                  >
                    <Icon size={20} color={active ? '#ffffff' : '#0891b2'} />
                    <Text
                      className="flex-1 font-extrabold"
                      style={{ color: active ? '#ffffff' : '#111827' }}
                    >
                      {opt.label}
                    </Text>
                    {active && <Check size={18} color="#ffffff" />}
                  </Pressable>
                );
              })}
            </View>
          </ScrollView>
        </SafeAreaView>
      </Modal>

      {/* Filters Modal */}
      <Modal
        visible={showFilters}
        animationType="slide"
        presentationStyle="pageSheet"
        onRequestClose={() => setShowFilters(false)}
      >
        <SafeAreaView className="flex-1 bg-neutral-50">
          <View className="px-5 py-4 border-b border-neutral-200 flex-row items-center gap-3">
            <View className="h-11 w-11 rounded-2xl bg-emerald-600 items-center justify-center">
              <Filter size={20} color="#ffffff" />
            </View>
            <View className="flex-1">
              <Text className="text-lg font-bold text-neutral-900">Filters</Text>
              <Text className="text-xs text-neutral-500">Category, brand, period</Text>
            </View>
            <Pressable
              onPress={() => setShowFilters(false)}
              hitSlop={12}
              className="h-10 w-10 rounded-2xl bg-neutral-100 items-center justify-center"
            >
              <X size={20} color="#6b7280" />
            </Pressable>
          </View>

          <ScrollView contentContainerStyle={{ padding: 20 }}>
            {/* Category Filter */}
            <Text className="text-xs uppercase font-extrabold text-neutral-500 mb-2 tracking-wider">
              Category
            </Text>
            <View className="gap-2 mb-4">
              <Pressable
                onPress={() => setFilters({ ...filters, categoryId: undefined })}
                className="rounded-xl border-2 p-3 flex-row items-center gap-2"
                style={{
                  backgroundColor: !filters.categoryId ? '#dcfce7' : '#ffffff',
                  borderColor: !filters.categoryId ? '#16a34a' : '#e5e7eb',
                }}
              >
                <Tag size={14} color={!filters.categoryId ? '#15803d' : '#9ca3af'} />
                <Text className="flex-1 font-bold text-sm">All Categories</Text>
                {!filters.categoryId && <Check size={16} color="#16a34a" />}
              </Pressable>
              {categories.map((c: any) => {
                const active = filters.categoryId === c.id;
                return (
                  <Pressable
                    key={c.id}
                    onPress={() => setFilters({ ...filters, categoryId: c.id })}
                    className="rounded-xl border-2 p-3 flex-row items-center gap-2"
                    style={{
                      backgroundColor: active ? '#dcfce7' : '#ffffff',
                      borderColor: active ? '#16a34a' : '#e5e7eb',
                    }}
                  >
                    <View
                      className="h-4 w-4 rounded-full"
                      style={{ backgroundColor: c.color || '#94a3b8' }}
                    />
                    <Text className="flex-1 font-bold text-sm text-neutral-900" numberOfLines={1}>
                      {c.name}
                    </Text>
                    {active && <Check size={16} color="#16a34a" />}
                  </Pressable>
                );
              })}
            </View>

            {/* Brand Filter */}
            {brands.length > 0 && (
              <>
                <Text className="text-xs uppercase font-extrabold text-neutral-500 mb-2 tracking-wider">
                  Brand
                </Text>
                <View className="gap-2 mb-4">
                  <Pressable
                    onPress={() => setFilters({ ...filters, brandId: undefined })}
                    className="rounded-xl border-2 p-3 flex-row items-center gap-2"
                    style={{
                      backgroundColor: !filters.brandId ? '#ede9fe' : '#ffffff',
                      borderColor: !filters.brandId ? '#7c3aed' : '#e5e7eb',
                    }}
                  >
                    <Building2 size={14} color={!filters.brandId ? '#6d28d9' : '#9ca3af'} />
                    <Text className="flex-1 font-bold text-sm">All Brands</Text>
                    {!filters.brandId && <Check size={16} color="#7c3aed" />}
                  </Pressable>
                  {brands.map((b) => {
                    const active = filters.brandId === b.id;
                    return (
                      <Pressable
                        key={b.id}
                        onPress={() => setFilters({ ...filters, brandId: b.id })}
                        className="rounded-xl border-2 p-3 flex-row items-center gap-2"
                        style={{
                          backgroundColor: active ? '#ede9fe' : '#ffffff',
                          borderColor: active ? '#7c3aed' : '#e5e7eb',
                        }}
                      >
                        <Building2 size={14} color={active ? '#6d28d9' : '#94a3b8'} />
                        <Text className="flex-1 font-bold text-sm text-neutral-900" numberOfLines={1}>
                          {b.name}
                        </Text>
                        {active && <Check size={16} color="#7c3aed" />}
                      </Pressable>
                    );
                  })}
                </View>
              </>
            )}

            {hasActiveFilters && (
              <Pressable
                onPress={() => {
                  clearFilters();
                  setShowFilters(false);
                }}
                className="rounded-xl border-2 border-rose-300 bg-rose-50 p-3 flex-row items-center justify-center gap-2"
              >
                <RotateCcw size={14} color="#dc2626" />
                <Text className="font-extrabold text-rose-700">Clear All Filters</Text>
              </Pressable>
            )}
          </ScrollView>

          <View className="px-5 py-4 border-t border-neutral-200 bg-white">
            <Pressable
              onPress={() => setShowFilters(false)}
              className="h-14 rounded-2xl items-center justify-center flex-row gap-2"
              style={{ backgroundColor: '#16a34a' }}
            >
              <Check size={20} color="#ffffff" />
              <Text className="text-white font-extrabold text-base">Apply Filters</Text>
            </Pressable>
          </View>
        </SafeAreaView>
      </Modal>
    </SafeAreaView>
  );
}

// ─── Helper Components ────────────────────────────────

function KpiCard({ label, value, sub, icon: Icon, color }: any) {
  return (
    <View className="w-1/2 px-1.5 mb-3">
      <View
        className="rounded-2xl border-2 p-3.5"
        style={{ backgroundColor: '#ffffff', borderColor: '#e5e7eb' }}
      >
        <View className="flex-row items-center gap-1.5 mb-1.5">
          <Icon size={14} color={color} />
          <Text className="text-[10px] uppercase font-extrabold tracking-wider" style={{ color }}>
            {label}
          </Text>
        </View>
        <Text className="text-lg font-extrabold text-neutral-900" numberOfLines={1}>
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

function IndustryBadge({ label, count, icon: Icon, color, bg }: any) {
  return (
    <View
      className="rounded-2xl border-2 p-3 flex-row items-center gap-3"
      style={{ backgroundColor: bg, borderColor: color }}
    >
      <View
        className="h-11 w-11 rounded-2xl items-center justify-center"
        style={{ backgroundColor: '#ffffff' }}
      >
        <Icon size={18} color={color} />
      </View>
      <View className="flex-1">
        <Text className="text-[10px] uppercase font-extrabold tracking-wider" style={{ color, opacity: 0.7 }}>
          {label}
        </Text>
        <Text className="text-xl font-extrabold mt-0.5" style={{ color }}>
          {count} products
        </Text>
      </View>
    </View>
  );
}

function TopProductCard({ product, rank, variant }: {
  product: ProductProfit;
  rank: number;
  variant: 'profit' | 'margin';
}) {
  const rankColors = ['#f59e0b', '#94a3b8', '#ea580c', '#cbd5e1', '#cbd5e1'];
  const bgColors = ['#fef3c7', '#f1f5f9', '#ffedd5', '#f8fafc', '#f8fafc'];

  return (
    <View className="rounded-2xl bg-white border border-neutral-200 p-3 flex-row items-center gap-3">
      <View
        className="h-10 w-10 rounded-2xl items-center justify-center"
        style={{ backgroundColor: bgColors[rank - 1] || '#f3f4f6' }}
      >
        {rank <= 3 ? (
          <Crown
            size={18}
            color={rankColors[rank - 1]}
            fill={rankColors[rank - 1]}
          />
        ) : (
          <Text className="font-extrabold text-neutral-600">#{rank}</Text>
        )}
      </View>

      {product.primaryImage ? (
        <Image
          source={{ uri: product.primaryImage }}
          className="h-10 w-10 rounded-xl"
        />
      ) : (
        <View className="h-10 w-10 rounded-xl bg-neutral-100 items-center justify-center">
          <Package size={16} color="#9ca3af" />
        </View>
      )}

      <View className="flex-1 min-w-0">
        <Text className="font-bold text-neutral-900 text-sm" numberOfLines={1}>
          {product.name}
        </Text>
        <Text className="text-[10px] text-neutral-500 mt-0.5" numberOfLines={1}>
          {product.quantitySold} {product.unit} • {product.ordersCount} orders
        </Text>
      </View>

      <View className="items-end">
        {variant === 'profit' ? (
          <>
            <Text className="text-base font-extrabold text-emerald-700">
              {formatPKR(product.profit)}
            </Text>
            <Text className="text-[10px] text-emerald-600 font-bold">
              {product.margin.toFixed(1)}%
            </Text>
          </>
        ) : (
          <>
            <Text className="text-lg font-extrabold text-violet-700">
              {product.margin.toFixed(1)}%
            </Text>
            <Text className="text-[10px] text-violet-600 font-bold">
              {formatPKR(product.profit)}
            </Text>
          </>
        )}
      </View>
    </View>
  );
}

function ProductProfitRow({ product: p, rank, onPress }: {
  product: ProductProfit;
  rank: number;
  onPress: () => void;
}) {
  const profitable = p.profit > 0;
  const isHighMargin = p.margin >= 30;
  const isMediumMargin = p.margin >= 15 && p.margin < 30;
  const marginColor = isHighMargin ? '#16a34a' : isMediumMargin ? '#f59e0b' : profitable ? '#64748b' : '#dc2626';
  const marginBg = isHighMargin ? '#dcfce7' : isMediumMargin ? '#fef3c7' : profitable ? '#f1f5f9' : '#fee2e2';

  return (
    <Pressable
      onPress={onPress}
      className="rounded-2xl bg-white border-2 p-3 active:opacity-70"
      style={{ borderColor: !profitable ? '#fca5a5' : '#e5e7eb', backgroundColor: !profitable ? '#fef2f2' : '#ffffff' }}
    >
      <View className="flex-row items-center gap-3">
        <View
          className="h-8 w-8 rounded-lg items-center justify-center"
          style={{
            backgroundColor: rank <= 3 ? '#fef3c7' : '#f3f4f6',
          }}
        >
          <Text
            className="text-[11px] font-extrabold"
            style={{ color: rank <= 3 ? '#d97706' : '#6b7280' }}
          >
            #{rank}
          </Text>
        </View>

        {p.primaryImage ? (
          <Image source={{ uri: p.primaryImage }} className="h-11 w-11 rounded-xl" />
        ) : (
          <View
            className="h-11 w-11 rounded-2xl items-center justify-center"
            style={{
              backgroundColor: p.categoryColor
                ? `${p.categoryColor}20`
                : '#f1f5f9',
            }}
          >
            <Package size={18} color={p.categoryColor || '#64748b'} />
          </View>
        )}

        <View className="flex-1 min-w-0">
          <View className="flex-row items-center gap-1 flex-wrap">
            <Text className="font-bold text-neutral-900 text-sm flex-shrink" numberOfLines={1}>
              {p.name}
            </Text>
            {p.industryType === 'CARPET' && (
              <View className="flex-row items-center gap-0.5 px-1.5 py-0.5 rounded bg-emerald-100">
                <Layers size={8} color="#16a34a" />
                <Text className="text-[9px] font-extrabold text-emerald-700">CARPET</Text>
              </View>
            )}
            {p.industryType === 'MOBILE' && (
              <View className="flex-row items-center gap-0.5 px-1.5 py-0.5 rounded bg-blue-100">
                <Smartphone size={8} color="#2563eb" />
                <Text className="text-[9px] font-extrabold text-blue-700">MOBILE</Text>
              </View>
            )}
            {p.variantCount > 0 && (
              <View className="px-1.5 py-0.5 rounded bg-violet-100">
                <Text className="text-[9px] font-extrabold text-violet-700">
                  {p.variantCount}V
                </Text>
              </View>
            )}
          </View>
          <View className="flex-row items-center gap-2 mt-0.5">
            {p.categoryName && (
              <View
                className="px-1.5 py-0.5 rounded-md flex-row items-center gap-1"
                style={{ backgroundColor: `${p.categoryColor}15` }}
              >
                <View
                  className="h-2 w-2 rounded-full"
                  style={{ backgroundColor: p.categoryColor || '#94a3b8' }}
                />
                <Text
                  className="text-[9px] font-bold"
                  style={{ color: p.categoryColor || '#64748b' }}
                >
                  {p.categoryName}
                </Text>
              </View>
            )}
            {p.brandName && (
              <Text className="text-[9px] text-violet-700 font-extrabold">
                {p.brandName}
              </Text>
            )}
          </View>
          <Text className="text-[10px] text-neutral-500 mt-0.5" numberOfLines={1}>
            {p.quantitySold.toFixed(p.quantitySold % 1 === 0 ? 0 : 2)} {p.unit} • {p.ordersCount} orders
          </Text>
        </View>

        <View className="items-end">
          <View className="flex-row items-center gap-1">
            {profitable ? (
              <ArrowUpRight size={12} color="#15803d" />
            ) : (
              <ArrowDownRight size={12} color="#dc2626" />
            )}
            <Text
              className="text-base font-extrabold"
              style={{ color: profitable ? '#15803d' : '#dc2626' }}
            >
              {formatPKR(p.profit)}
            </Text>
          </View>
          <View
            className="mt-1 px-1.5 py-0.5 rounded-md flex-row items-center gap-0.5"
            style={{ backgroundColor: marginBg }}
          >
            {isHighMargin && <Star size={9} color={marginColor} fill={marginColor} />}
            <Text className="text-[10px] font-extrabold" style={{ color: marginColor }}>
              {p.margin.toFixed(1)}%
            </Text>
          </View>
        </View>
      </View>

      {/* Bottom stats */}
      <View className="mt-2.5 pt-2.5 border-t border-neutral-100 flex-row items-center justify-between">
        <View>
          <Text className="text-[9px] text-neutral-500 font-bold uppercase">Revenue</Text>
          <Text className="text-xs font-extrabold text-blue-700 mt-0.5">
            {formatPKR(p.revenue)}
          </Text>
        </View>
        <View className="items-center">
          <Text className="text-[9px] text-neutral-500 font-bold uppercase">Cost</Text>
          <Text className="text-xs font-extrabold text-rose-700 mt-0.5">
            {formatPKR(p.cost)}
          </Text>
        </View>
        <View className="items-center">
          <Text className="text-[9px] text-neutral-500 font-bold uppercase">Avg Sell</Text>
          <Text className="text-xs font-extrabold text-neutral-700 mt-0.5">
            {formatPKR(p.avgSellPrice)}
          </Text>
        </View>
        {p.returnedQty > 0 && (
          <View className="items-end">
            <Text className="text-[9px] text-neutral-500 font-bold uppercase">Returns</Text>
            <Text className="text-xs font-extrabold text-amber-700 mt-0.5">
              {p.returnedQty.toFixed(0)}
            </Text>
          </View>
        )}
      </View>
    </Pressable>
  );
}
