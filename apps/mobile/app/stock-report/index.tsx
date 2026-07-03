import { useState, useMemo } from 'react';
import {
  View, Text, ScrollView, Pressable, TextInput, RefreshControl, Modal, Image,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { useRouter, Stack } from 'expo-router';
import { useQuery } from '@tanstack/react-query';
import * as Haptics from 'expo-haptics';
import {
  ArrowLeft, BarChart3, Search, X, Package, AlertTriangle, CheckCircle2,
  XCircle, Layers, Smartphone, TrendingUp, DollarSign, Sliders, Star,
  Award, ChevronDown, ChevronRight, Filter, Sparkles, Hash, RotateCcw,
  Check, Tag, Building2, FileText,
} from 'lucide-react-native';
import {
  stockReportApi,
  type StockReportFilters,
  type StockStatus,
  type StockReportRow,
} from '@/api/stock-report.api';
import { categoriesApi } from '@/api/categories.api';
import { brandsApi } from '@/api/brands.api';
import { formatPKR, formatPKRFull } from '@/lib/format';
import { ExpandableProductRow } from '@/components/stock-report/ExpandableProductRow';
import { useSmartBack } from '@/hooks/useSmartBack';

const statusConfig: Record<StockStatus, {
  label: string; color: string; bg: string; icon: any;
}> = {
  IN_STOCK: { label: 'In Stock', color: '#15803d', bg: '#dcfce7', icon: CheckCircle2 },
  LOW_STOCK: { label: 'Low', color: '#b45309', bg: '#fef3c7', icon: AlertTriangle },
  OUT_OF_STOCK: { label: 'Out', color: '#b91c1c', bg: '#fee2e2', icon: XCircle },
};

export default function StockReportScreen() {
  const router = useRouter();
  const goBack = useSmartBack();
  const [filters, setFilters] = useState<StockReportFilters>({ stockStatus: 'all' });
  const [search, setSearch] = useState('');
  const [refreshing, setRefreshing] = useState(false);
  const [showFilters, setShowFilters] = useState(false);
  const [expandedRows, setExpandedRows] = useState<Set<string>>(new Set());

  const { data, refetch, isLoading } = useQuery({
    queryKey: ['stock-report-mobile', filters],
    queryFn: () => stockReportApi.generate(filters),
  });

  const { data: categories = [] } = useQuery({
    queryKey: ['categories-stock'],
    queryFn: async () => {
      try {
        return await categoriesApi.list();
      } catch {
        return [];
      }
    },
  });

  const { data: brands = [] } = useQuery({
    queryKey: ['brands-stock'],
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
    await refetch();
    setRefreshing(false);
  };

  const toggleExpand = (productId: string) => {
    Haptics.selectionAsync();
    setExpandedRows((prev) => {
      const next = new Set(prev);
      if (next.has(productId)) next.delete(productId);
      else next.add(productId);
      return next;
    });
  };

  const filteredRows = useMemo(() => {
    if (!data?.rows) return [];
    const q = search.toLowerCase().trim();
    if (!q) return data.rows;
    return data.rows.filter(
      (r) =>
        r.productName.toLowerCase().includes(q) ||
        r.sku?.toLowerCase().includes(q) ||
        r.barcode?.toLowerCase().includes(q) ||
        r.category?.toLowerCase().includes(q) ||
        r.brand?.toLowerCase().includes(q),
    );
  }, [data?.rows, search]);

  const hasActiveFilters =
    !!filters.categoryId ||
    !!filters.brandId ||
    filters.stockStatus !== 'all' ||
    filters.isActive !== undefined;

  const clearFilters = () => {
    setFilters({ stockStatus: 'all' });
    setSearch('');
  };

  const summary = data?.summary;

  return (
    <SafeAreaView className="flex-1 bg-neutral-50 dark:bg-neutral-950" edges={['top']}>
      <Stack.Screen options={{ headerShown: false }} />

      {/* Header */}
      <View className="px-5 pt-4 pb-3 flex-row items-center gap-3">
        <Pressable
          onPress={goBack}
          hitSlop={12}
          className="h-10 w-10 rounded-2xl bg-white dark:bg-neutral-900 items-center justify-center border border-neutral-200"
        >
          <ArrowLeft size={20} color="#0891b2" />
        </Pressable>
        <View className="flex-1">
          <Text className="text-2xl font-extrabold text-neutral-900 dark:text-white">
            Stock Report
          </Text>
          <View className="flex-row items-center gap-1.5 mt-0.5">
            <Sparkles size={11} color="#0891b2" />
            <Text className="text-xs text-neutral-500">Complete inventory snapshot</Text>
          </View>
        </View>
      </View>

      {/* Search + Filter */}
      <View className="px-5 pb-3 flex-row gap-2">
        <View className="flex-1 flex-row items-center gap-2 rounded-xl border border-neutral-200 bg-white px-3 h-11">
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
        <Pressable
          onPress={() => {
            Haptics.selectionAsync();
            setShowFilters(true);
          }}
          className="h-11 px-3 rounded-xl border-2 flex-row items-center gap-1.5 relative"
          style={{
            backgroundColor: hasActiveFilters ? '#cffafe' : '#ffffff',
            borderColor: hasActiveFilters ? '#0891b2' : '#e5e7eb',
          }}
        >
          <Sliders size={14} color={hasActiveFilters ? '#0891b2' : '#6b7280'} />
          <Text
            className="text-xs font-extrabold"
            style={{ color: hasActiveFilters ? '#0e7490' : '#374151' }}
          >
            Filter
          </Text>
          {hasActiveFilters && (
            <View className="absolute -top-1 -right-1 h-4 w-4 rounded-full bg-cyan-600 items-center justify-center">
              <Text className="text-white text-[8px] font-extrabold">!</Text>
            </View>
          )}
        </Pressable>
      </View>

      <ScrollView
        contentContainerStyle={{ paddingBottom: 40 }}
        refreshControl={
          <RefreshControl refreshing={refreshing} onRefresh={onRefresh} tintColor="#0891b2" />
        }
        showsVerticalScrollIndicator={false}
      >
        {/* Hero */}
        <View className="px-5 mb-4">
          <View
            className="rounded-3xl p-5"
            style={{
              backgroundColor: '#0891b2',
              shadowColor: '#0891b2',
              shadowOpacity: 0.3,
              shadowRadius: 16,
              shadowOffset: { width: 0, height: 8 },
              elevation: 10,
            }}
          >
            <View className="flex-row items-center gap-3">
              <View className="h-14 w-14 rounded-2xl bg-white/20 items-center justify-center">
                <BarChart3 size={28} color="#ffffff" />
              </View>
              <View className="flex-1">
                <Text className="text-[10px] font-bold uppercase tracking-wider text-white/80">
                  Total Stock Value
                </Text>
                <Text className="text-3xl font-extrabold text-white mt-1">
                  {formatPKR(summary?.totalStockValue ?? 0)}
                </Text>
                <Text className="text-xs text-white/80 mt-1">
                  {summary?.totalProducts ?? 0} products • {summary?.totalActiveProducts ?? 0} active
                </Text>
              </View>
            </View>
            <View className="mt-4 pt-4 border-t border-white/20 flex-row items-center justify-between">
              <View>
                <Text className="text-[10px] font-bold uppercase tracking-wider text-white/70">Retail</Text>
                <Text className="text-base font-extrabold text-white mt-0.5">
                  {formatPKR(summary?.totalRetailValue ?? 0)}
                </Text>
              </View>
              <View>
                <Text className="text-[10px] font-bold uppercase tracking-wider text-white/70">Profit Potential</Text>
                <Text className="text-base font-extrabold text-white mt-0.5">
                  {formatPKR(summary?.totalPotentialProfit ?? 0)}
                </Text>
              </View>
            </View>
          </View>
        </View>

        {/* Status Filter Cards */}
        {summary && (
          <View className="px-5 mb-4">
            <View className="flex-row gap-2">
              <Pressable
                onPress={() => {
                  Haptics.selectionAsync();
                  setFilters({ ...filters, stockStatus: filters.stockStatus === 'in' ? 'all' : 'in' });
                }}
                className="flex-1 rounded-2xl border-2 p-3"
                style={{
                  backgroundColor: filters.stockStatus === 'in' ? '#dcfce7' : '#ffffff',
                  borderColor: filters.stockStatus === 'in' ? '#16a34a' : '#e5e7eb',
                }}
              >
                <CheckCircle2 size={16} color="#16a34a" />
                <Text className="text-[10px] uppercase font-extrabold text-emerald-700 mt-1">In Stock</Text>
                <Text className="text-lg font-extrabold text-emerald-900 mt-0.5">
                  {summary.inStockCount}
                </Text>
              </Pressable>
              <Pressable
                onPress={() => {
                  Haptics.selectionAsync();
                  setFilters({ ...filters, stockStatus: filters.stockStatus === 'low' ? 'all' : 'low' });
                }}
                className="flex-1 rounded-2xl border-2 p-3"
                style={{
                  backgroundColor: filters.stockStatus === 'low' ? '#fef3c7' : '#ffffff',
                  borderColor: filters.stockStatus === 'low' ? '#f59e0b' : '#e5e7eb',
                }}
              >
                <AlertTriangle size={16} color="#f59e0b" />
                <Text className="text-[10px] uppercase font-extrabold text-amber-700 mt-1">Low</Text>
                <Text className="text-lg font-extrabold text-amber-900 mt-0.5">
                  {summary.lowStockCount}
                </Text>
              </Pressable>
              <Pressable
                onPress={() => {
                  Haptics.selectionAsync();
                  setFilters({ ...filters, stockStatus: filters.stockStatus === 'out' ? 'all' : 'out' });
                }}
                className="flex-1 rounded-2xl border-2 p-3"
                style={{
                  backgroundColor: filters.stockStatus === 'out' ? '#fee2e2' : '#ffffff',
                  borderColor: filters.stockStatus === 'out' ? '#dc2626' : '#e5e7eb',
                }}
              >
                <XCircle size={16} color="#dc2626" />
                <Text className="text-[10px] uppercase font-extrabold text-rose-700 mt-1">Out</Text>
                <Text className="text-lg font-extrabold text-rose-900 mt-0.5">
                  {summary.outOfStockCount}
                </Text>
              </Pressable>
            </View>
          </View>
        )}

        {/* Industry counts */}
        {summary && (summary.carpetCount > 0 || summary.mobileCount > 0) && (
          <View className="px-5 mb-4">
            <Text className="text-xs uppercase font-extrabold text-neutral-500 tracking-wider mb-2">
              By Industry
            </Text>
            <View className="gap-2">
              {summary.standardCount > 0 && (
                <View className="rounded-xl bg-white border border-slate-200 p-3 flex-row items-center gap-2">
                  <View className="h-9 w-9 rounded-lg bg-slate-100 items-center justify-center">
                    <Package size={16} color="#64748b" />
                  </View>
                  <Text className="flex-1 text-sm font-bold text-slate-700">Standard</Text>
                  <Text className="text-lg font-extrabold text-slate-900">{summary.standardCount}</Text>
                </View>
              )}
              {summary.carpetCount > 0 && (
                <View className="rounded-xl bg-white border border-emerald-200 p-3 flex-row items-center gap-2">
                  <View className="h-9 w-9 rounded-lg bg-emerald-100 items-center justify-center">
                    <Layers size={16} color="#16a34a" />
                  </View>
                  <Text className="flex-1 text-sm font-bold text-emerald-700">Carpet</Text>
                  <Text className="text-lg font-extrabold text-emerald-900">{summary.carpetCount}</Text>
                </View>
              )}
              {summary.mobileCount > 0 && (
                <View className="rounded-xl bg-white border border-blue-200 p-3 flex-row items-center gap-2">
                  <View className="h-9 w-9 rounded-lg bg-blue-100 items-center justify-center">
                    <Smartphone size={16} color="#2563eb" />
                  </View>
                  <Text className="flex-1 text-sm font-bold text-blue-700">Mobile</Text>
                  <Text className="text-lg font-extrabold text-blue-900">{summary.mobileCount}</Text>
                </View>
              )}
            </View>
          </View>
        )}

        {/* Category Breakdown */}
        {summary && summary.categoryBreakdown.length > 0 && (
          <View className="px-5 mb-4">
            <View className="flex-row items-center gap-2 mb-2">
              <BarChart3 size={16} color="#7c3aed" />
              <Text className="text-xs uppercase font-extrabold text-neutral-500 tracking-wider">
                Category-wise Value
              </Text>
            </View>
            <View className="rounded-2xl bg-white border border-neutral-200 p-3 gap-2">
              {summary.categoryBreakdown.slice(0, 8).map((cat) => {
                const pct = summary.totalStockValue > 0
                  ? (cat.stockValue / summary.totalStockValue) * 100
                  : 0;
                return (
                  <View key={cat.categoryName}>
                    <View className="flex-row items-center justify-between mb-1">
                      <Text className="text-xs font-bold text-slate-700 flex-1" numberOfLines={1}>
                        {cat.categoryName}
                      </Text>
                      <Text className="text-xs font-extrabold text-slate-900">
                        {formatPKR(cat.stockValue)}
                      </Text>
                    </View>
                    <View className="h-2 bg-slate-100 rounded-full overflow-hidden">
                      <View
                        className="h-full rounded-full"
                        style={{
                          width: `${Math.max(pct, 1)}%`,
                          backgroundColor: '#16a34a',
                        }}
                      />
                    </View>
                    <Text className="text-[10px] text-slate-500 mt-0.5">
                      {cat.productCount} products
                    </Text>
                  </View>
                );
              })}
            </View>
          </View>
        )}

        {/* Products List */}
        <View className="px-5">
          <View className="flex-row items-center justify-between mb-2">
            <View className="flex-row items-center gap-2">
              <FileText size={16} color="#0891b2" />
              <Text className="text-base font-extrabold text-neutral-900 dark:text-white">
                Products
              </Text>
              <View className="px-2 py-0.5 rounded-full bg-cyan-100">
                <Text className="text-[10px] font-bold text-cyan-700">
                  {filteredRows.length}
                </Text>
              </View>
            </View>
            {expandedRows.size > 0 && (
              <Pressable
                onPress={() => setExpandedRows(new Set())}
                className="px-2.5 py-1 rounded-lg bg-slate-100"
              >
                <Text className="text-[10px] font-bold text-slate-700">Collapse All</Text>
              </Pressable>
            )}
          </View>

          {isLoading ? (
            <View className="items-center py-8">
              <Package size={32} color="#cbd5e1" />
              <Text className="mt-2 text-sm text-slate-500">Loading stock...</Text>
            </View>
          ) : filteredRows.length === 0 ? (
            <View className="rounded-2xl bg-white border border-slate-200 items-center py-12">
              <View className="h-16 w-16 rounded-3xl bg-slate-100 items-center justify-center">
                <Package size={32} color="#94a3b8" />
              </View>
              <Text className="mt-3 text-base font-bold text-slate-700">
                {hasActiveFilters ? 'No products match' : 'No products yet'}
              </Text>
              <Text className="mt-1 text-xs text-slate-500 text-center px-8">
                {hasActiveFilters ? 'Try different filters' : 'Add products to start'}
              </Text>
            </View>
          ) : (
            <View className="gap-2">
              {filteredRows.map((row, idx) => (
                <ProductRow
                  key={row.productId}
                  row={row}
                  idx={idx + 1}
                  expanded={expandedRows.has(row.productId)}
                  onToggle={() => toggleExpand(row.productId)}
                  onOpenDetail={() => router.push(`/products/${row.productId}`)}
                />
              ))}
            </View>
          )}
        </View>
      </ScrollView>

      {/* Filters Modal */}
      <Modal
        visible={showFilters}
        animationType="slide"
        presentationStyle="pageSheet"
        onRequestClose={() => setShowFilters(false)}
      >
        <SafeAreaView className="flex-1 bg-neutral-50">
          <View className="px-5 py-4 border-b border-neutral-200 flex-row items-center gap-3">
            <View className="h-11 w-11 rounded-2xl bg-cyan-600 items-center justify-center">
              <Filter size={20} color="#ffffff" />
            </View>
            <View className="flex-1">
              <Text className="text-lg font-bold text-neutral-900">Filters</Text>
              <Text className="text-xs text-neutral-500">Category, brand, status</Text>
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
            <Text className="text-xs uppercase font-extrabold text-neutral-500 mb-2 tracking-wider">
              Category
            </Text>
            <View className="gap-2 mb-4">
              <Pressable
                onPress={() => setFilters({ ...filters, categoryId: undefined })}
                className="rounded-xl border-2 p-3 flex-row items-center gap-2"
                style={{
                  backgroundColor: !filters.categoryId ? '#cffafe' : '#ffffff',
                  borderColor: !filters.categoryId ? '#0891b2' : '#e5e7eb',
                }}
              >
                <Tag size={14} color={!filters.categoryId ? '#0e7490' : '#9ca3af'} />
                <Text className="flex-1 font-bold text-sm">All Categories</Text>
                {!filters.categoryId && <Check size={16} color="#0891b2" />}
              </Pressable>
              {categories.map((c: any) => {
                const active = filters.categoryId === c.id;
                return (
                  <Pressable
                    key={c.id}
                    onPress={() => setFilters({ ...filters, categoryId: c.id })}
                    className="rounded-xl border-2 p-3 flex-row items-center gap-2"
                    style={{
                      backgroundColor: active ? '#cffafe' : '#ffffff',
                      borderColor: active ? '#0891b2' : '#e5e7eb',
                    }}
                  >
                    <View className="h-4 w-4 rounded-full" style={{ backgroundColor: c.color || '#94a3b8' }} />
                    <Text className="flex-1 font-bold text-sm" numberOfLines={1}>{c.name}</Text>
                    {active && <Check size={16} color="#0891b2" />}
                  </Pressable>
                );
              })}
            </View>

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
                        <Text className="flex-1 font-bold text-sm" numberOfLines={1}>{b.name}</Text>
                        {active && <Check size={16} color="#7c3aed" />}
                      </Pressable>
                    );
                  })}
                </View>
              </>
            )}

            <Text className="text-xs uppercase font-extrabold text-neutral-500 mb-2 tracking-wider">
              Active Status
            </Text>
            <View className="flex-row gap-2 mb-4">
              {[
                { key: undefined, label: 'All' },
                { key: true, label: 'Active' },
                { key: false, label: 'Inactive' },
              ].map((opt: any) => {
                const active = filters.isActive === opt.key;
                return (
                  <Pressable
                    key={String(opt.key)}
                    onPress={() => setFilters({ ...filters, isActive: opt.key })}
                    className="flex-1 h-10 rounded-xl items-center justify-center border-2"
                    style={{
                      backgroundColor: active ? '#0891b2' : '#ffffff',
                      borderColor: active ? '#0891b2' : '#e5e7eb',
                    }}
                  >
                    <Text
                      className="text-sm font-bold"
                      style={{ color: active ? '#ffffff' : '#374151' }}
                    >
                      {opt.label}
                    </Text>
                  </Pressable>
                );
              })}
            </View>

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
              style={{ backgroundColor: '#0891b2' }}
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

// ─── Product Row Component ───────────────────────────────

function ProductRow({ row, idx, expanded, onToggle, onOpenDetail }: {
  row: StockReportRow;
  idx: number;
  expanded: boolean;
  onToggle: () => void;
  onOpenDetail: () => void;
}) {
  const statusInfo = statusConfig[row.stockStatus];
  const StatusIcon = statusInfo.icon;

  return (
    <View
      className="rounded-2xl border-2 overflow-hidden"
      style={{
        borderColor: expanded
          ? '#3b82f6'
          : row.stockStatus === 'OUT_OF_STOCK'
          ? '#fecaca'
          : row.stockStatus === 'LOW_STOCK'
          ? '#fde68a'
          : '#e5e7eb',
        backgroundColor: expanded
          ? '#eff6ff'
          : row.stockStatus === 'OUT_OF_STOCK'
          ? '#fef2f2'
          : row.stockStatus === 'LOW_STOCK'
          ? '#fffbeb'
          : '#ffffff',
        opacity: row.isActive ? 1 : 0.7,
      }}
    >
      <Pressable onPress={onOpenDetail} className="p-3 active:opacity-70">
        <View className="flex-row items-start gap-3">
          <View className="h-11 w-11 rounded-2xl bg-slate-100 items-center justify-center overflow-hidden shrink-0">
            {row.primaryImage ? (
              <Image source={{ uri: row.primaryImage }} style={{ width: '100%', height: '100%' }} resizeMode="cover" />
            ) : (
              <Package size={18} color="#94a3b8" />
            )}
          </View>

          <View className="flex-1 min-w-0">
            <View className="flex-row items-center gap-1 flex-wrap">
              <Text className="text-sm font-extrabold text-slate-900" numberOfLines={2}>
                {row.productName}
              </Text>
              {row.isFeatured && <Star size={11} color="#f59e0b" fill="#f59e0b" />}
              {row.industryType === 'CARPET' && (
                <View className="flex-row items-center gap-0.5 px-1.5 py-0.5 rounded bg-emerald-100">
                  <Layers size={8} color="#16a34a" />
                  <Text className="text-[9px] font-extrabold text-emerald-700">CARPET</Text>
                </View>
              )}
              {row.industryType === 'MOBILE' && (
                <View className="flex-row items-center gap-0.5 px-1.5 py-0.5 rounded bg-blue-100">
                  <Smartphone size={8} color="#2563eb" />
                  <Text className="text-[9px] font-extrabold text-blue-700">MOBILE</Text>
                </View>
              )}
              {row.variantCount ? (
                <View className="px-1.5 py-0.5 rounded bg-violet-100">
                  <Text className="text-[9px] font-extrabold text-violet-700">
                    {row.variantCount}V
                  </Text>
                </View>
              ) : null}
            </View>
            <View className="flex-row items-center gap-1.5 mt-0.5 flex-wrap">
              {row.sku && (
                <Text className="text-[10px] font-mono text-slate-500">{row.sku}</Text>
              )}
              {row.category && (
                <View className="flex-row items-center gap-1 px-1.5 py-0.5 rounded" style={{ backgroundColor: `${row.categoryColor}15` }}>
                  <View className="h-2 w-2 rounded-full" style={{ backgroundColor: row.categoryColor || '#94a3b8' }} />
                  <Text className="text-[9px] font-bold" style={{ color: row.categoryColor || '#64748b' }}>
                    {row.category}
                  </Text>
                </View>
              )}
              {row.brand && (
                <Text className="text-[9px] font-extrabold text-violet-700">{row.brand}</Text>
              )}
            </View>
            {(row.carpetRollCount || row.carpetCutPiecesCount || row.imeiCount) ? (
              <View className="flex-row items-center gap-2 mt-1">
                {row.carpetRollCount ? (
                  <Text className="text-[10px] text-emerald-700 font-bold">
                    🎯 {row.carpetRollCount} rolls
                  </Text>
                ) : null}
                {row.carpetCutPiecesCount ? (
                  <Text className="text-[10px] text-violet-700 font-bold">
                    ✂️ {row.carpetCutPiecesCount} pieces
                  </Text>
                ) : null}
                {row.imeiCount ? (
                  <Text className="text-[10px] text-blue-700 font-bold">
                    📱 {row.imeiCount} IMEIs
                  </Text>
                ) : null}
              </View>
            ) : null}
          </View>

          <View className="items-end">
            <View className="flex-row items-center gap-0.5 px-1.5 py-0.5 rounded-full" style={{ backgroundColor: statusInfo.bg }}>
              <StatusIcon size={10} color={statusInfo.color} />
              <Text className="text-[9px] font-extrabold" style={{ color: statusInfo.color }}>
                {statusInfo.label}
              </Text>
            </View>
            <Text className="text-lg font-extrabold text-slate-900 mt-1">
              {row.stock.toFixed(row.stock % 1 === 0 ? 0 : 2)}
            </Text>
            <Text className="text-[9px] font-bold text-slate-500 uppercase">{row.unit}</Text>
          </View>
        </View>

        {/* Financial row */}
        <View className="mt-2.5 pt-2.5 border-t border-slate-100 flex-row items-center justify-between">
          <View>
            <Text className="text-[9px] uppercase font-bold text-slate-500">Cost</Text>
            <Text className="text-xs font-bold text-slate-700 mt-0.5">
              {formatPKR(row.costPrice)}
            </Text>
          </View>
          <View className="items-center">
            <Text className="text-[9px] uppercase font-bold text-slate-500">Sale</Text>
            <Text className="text-xs font-bold text-emerald-700 mt-0.5">
              {formatPKR(row.salePrice)}
            </Text>
          </View>
          <View className="items-center">
            <Text className="text-[9px] uppercase font-bold text-slate-500">Stock Value</Text>
            <Text className="text-xs font-extrabold text-blue-700 mt-0.5">
              {formatPKR(row.stockValue)}
            </Text>
          </View>
          <View className="items-end">
            <Text className="text-[9px] uppercase font-bold text-slate-500">Profit</Text>
            <Text className="text-xs font-extrabold text-amber-700 mt-0.5">
              {formatPKR(row.potentialProfit)}
            </Text>
          </View>
        </View>
      </Pressable>

      {/* Expand button */}
      <Pressable
        onPress={onToggle}
        className="border-t border-slate-100 py-2 flex-row items-center justify-center gap-1.5 active:opacity-70"
        style={{ backgroundColor: expanded ? '#dbeafe' : '#f8fafc' }}
      >
        {expanded ? (
          <ChevronDown size={14} color="#2563eb" />
        ) : (
          <ChevronRight size={14} color="#64748b" />
        )}
        <Text
          className="text-[11px] font-extrabold"
          style={{ color: expanded ? '#1d4ed8' : '#64748b' }}
        >
          {expanded ? 'Hide Details' : 'Show Detailed Breakdown'}
        </Text>
      </Pressable>

      {/* Expanded content */}
      {expanded && (
        <View className="p-3 bg-blue-50/40 border-t border-blue-100">
          <ExpandableProductRow
            productId={row.productId}
            industryType={row.industryType}
            productUnit={row.unit}
            productName={row.productName}
          />
        </View>
      )}
    </View>
  );
}
