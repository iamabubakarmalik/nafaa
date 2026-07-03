import { useMemo, useState } from 'react';
import {
  View, Text, ScrollView, Pressable, TextInput, RefreshControl,
  Image, Dimensions, Alert, Share,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { useRouter, Stack } from 'expo-router';
import { useQuery } from '@tanstack/react-query';
import * as Haptics from 'expo-haptics';
import * as Print from 'expo-print';
import * as Sharing from 'expo-sharing';
import * as FileSystem from 'expo-file-system/legacy';
import {
  ArrowLeft, AlertTriangle, Sparkles, Package, ChevronRight,
  TrendingDown, Search, X, RefreshCw, Filter, Layers, Smartphone,
  Hash, XCircle, CheckCircle2, BarChart3, FileText, Download,
  Edit3, ShoppingBag, Eye, PieChart as PieIcon, DollarSign, Scissors,
} from 'lucide-react-native';
import { stockReportApi, type IndustryType, type StockReportRow } from '@/api/stock-report.api';
import { formatPKR, formatPKRFull } from '@/lib/format';
import { BarChart } from '@/components/charts/BarChart';
import { DonutChart } from '@/components/charts/DonutChart';
import Toast from 'react-native-toast-message';

const { width: SCREEN_W } = Dimensions.get('window');
const formatQty = (qty: number) => qty.toFixed(qty % 1 === 0 ? 0 : 2);

type Filter = 'all' | 'critical' | 'warning';
type IndustryFilter = 'all' | IndustryType;

const industryConfig: Record<IndustryType, {
  label: string;
  icon: any;
  color: string;
  bg: string;
  borderColor: string;
}> = {
  STANDARD:     { label: 'Standard', icon: Package,    color: '#64748b', bg: '#f1f5f9', borderColor: '#cbd5e1' },
  CARPET:       { label: 'Carpet',   icon: Layers,     color: '#10b981', bg: '#dcfce7', borderColor: '#86efac' },
  MOBILE:       { label: 'Mobile',   icon: Smartphone, color: '#3b82f6', bg: '#dbeafe', borderColor: '#93c5fd' },
  WEIGHT_BASED: { label: 'Weight',   icon: Hash,       color: '#f59e0b', bg: '#fef3c7', borderColor: '#fcd34d' },
};

export default function LowStockScreen() {
  const router = useRouter();
  const [search, setSearch] = useState('');
  const [filter, setFilter] = useState<Filter>('all');
  const [industryFilter, setIndustryFilter] = useState<IndustryFilter>('all');
  const [refreshing, setRefreshing] = useState(false);
  const [showCharts, setShowCharts] = useState(true);

  const { data, refetch, isLoading } = useQuery({
    queryKey: ['low-stock-report'],
    queryFn: () => stockReportApi.generate({ stockStatus: 'all', isActive: true }),
  });

  const lowStockRows = useMemo(() => {
    if (!data?.rows) return [];
    return data.rows.filter(
      (r) => r.stockStatus === 'LOW_STOCK' || r.stockStatus === 'OUT_OF_STOCK',
    );
  }, [data]);

  const onRefresh = async () => {
    setRefreshing(true);
    await refetch();
    setRefreshing(false);
  };

  const filtered = useMemo(() => {
    let result = [...lowStockRows];
    const q = search.toLowerCase().trim();
    if (q) {
      result = result.filter(
        (p) =>
          p.productName.toLowerCase().includes(q) ||
          (p.sku || '').toLowerCase().includes(q) ||
          (p.barcode || '').toLowerCase().includes(q) ||
          (p.category || '').toLowerCase().includes(q) ||
          (p.brand || '').toLowerCase().includes(q),
      );
    }
    if (filter === 'critical') result = result.filter((p) => p.stockStatus === 'OUT_OF_STOCK');
    else if (filter === 'warning') result = result.filter((p) => p.stockStatus === 'LOW_STOCK');
    if (industryFilter !== 'all') result = result.filter((p) => p.industryType === industryFilter);
    return result;
  }, [lowStockRows, search, filter, industryFilter]);

  const stats = useMemo(() => {
    const critical = lowStockRows.filter((p) => p.stockStatus === 'OUT_OF_STOCK').length;
    const warning = lowStockRows.filter((p) => p.stockStatus === 'LOW_STOCK').length;
    const totalRetailValue = lowStockRows.reduce((s, p) => s + p.retailValue, 0);
    const totalCostValue = lowStockRows.reduce((s, p) => s + p.stockValue, 0);
    const carpetCount = lowStockRows.filter((p) => p.industryType === 'CARPET').length;
    const mobileCount = lowStockRows.filter((p) => p.industryType === 'MOBILE').length;
    return {
      critical, warning, total: lowStockRows.length,
      totalRetailValue, totalCostValue, carpetCount, mobileCount,
    };
  }, [lowStockRows]);

  // Industry breakdown for donut
  const industryBreakdown = useMemo(() => {
    const map = new Map<string, number>();
    for (const r of lowStockRows) {
      map.set(r.industryType, (map.get(r.industryType) || 0) + 1);
    }
    return Array.from(map.entries()).map(([key, count]) => ({
      label: industryConfig[key as IndustryType]?.label || key,
      value: count,
      color: industryConfig[key as IndustryType]?.color || '#64748b',
    }));
  }, [lowStockRows]);

  // Top 8 lowest for bar chart
  const topLowChart = useMemo(() => {
    return [...filtered]
      .sort((a, b) => a.stock - b.stock)
      .slice(0, 8)
      .map((r) => ({
        label: r.productName.length > 12 ? r.productName.slice(0, 12) + '…' : r.productName,
        value: r.stock,
        color: r.stockStatus === 'OUT_OF_STOCK' ? '#dc2626' : '#f59e0b',
      }));
  }, [filtered]);

  const hasFilters = search.trim() || filter !== 'all' || industryFilter !== 'all';

  const clearFilters = () => {
    setSearch('');
    setFilter('all');
    setIndustryFilter('all');
    Haptics.selectionAsync();
  };

  // Export CSV
  const exportCSV = async () => {
    if (filtered.length === 0) {
      Toast.show({ type: 'error', text1: 'No data to export' });
      return;
    }
    Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
    try {
      const headers = [
        'Product', 'SKU', 'Category', 'Brand', 'Industry', 'Unit',
        'Current Stock', 'Low Alert', 'Status', 'Cost Price', 'Sale Price',
        'Stock Value', 'Retail Value',
      ];
      const rows = filtered.map((p) => [
        p.productName, p.sku || '', p.category || '', p.brand || '',
        p.industryType, p.unit, formatQty(p.stock), formatQty(p.lowStockAlert),
        p.stockStatus === 'OUT_OF_STOCK' ? 'Out of Stock' : 'Low Stock',
        p.costPrice.toFixed(2), p.salePrice.toFixed(2),
        p.stockValue.toFixed(2), p.retailValue.toFixed(2),
      ]);
      const csv = [headers, ...rows]
        .map((r) => r.map((c) => `"${String(c).replace(/"/g, '""')}"`).join(','))
        .join('\n');

      const fileName = `low-stock-${new Date().toISOString().slice(0, 10)}.csv`;
      const uri = FileSystem.cacheDirectory + fileName;
      await FileSystem.writeAsStringAsync(uri, '\ufeff' + csv, {
        encoding: FileSystem.EncodingType.UTF8,
      });

      const canShare = await Sharing.isAvailableAsync();
      if (canShare) {
        await Sharing.shareAsync(uri, {
          mimeType: 'text/csv',
          dialogTitle: 'Low Stock Report',
          UTI: 'public.comma-separated-values-text',
        });
        Toast.show({ type: 'success', text1: 'CSV ready to share' });
      } else {
        Toast.show({ type: 'error', text1: 'Sharing not available' });
      }
    } catch (e: any) {
      Toast.show({ type: 'error', text1: 'Export failed', text2: e?.message });
    }
  };

  // Export PDF
  const exportPDF = async () => {
    if (filtered.length === 0) {
      Toast.show({ type: 'error', text1: 'No data to export' });
      return;
    }
    Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
    try {
      const rowsHtml = filtered.map((p) => {
        const isCritical = p.stockStatus === 'OUT_OF_STOCK';
        return `<tr style="background:${isCritical ? '#fef2f2' : '#fffbeb'};">
          <td style="padding:6px; border-bottom:1px solid #e5e7eb;">
            <div style="font-weight:700; color:#0f172a;">${p.productName}</div>
            <div style="font-size:10px; color:#6b7280; font-family:monospace;">${p.sku || p.barcode || ''}</div>
          </td>
          <td style="padding:6px; border-bottom:1px solid #e5e7eb; font-size:11px;">${p.category || '-'}</td>
          <td style="padding:6px; border-bottom:1px solid #e5e7eb; font-size:10px;">
            <span style="padding:2px 6px; border-radius:999px; background:${industryConfig[p.industryType]?.bg}; color:${industryConfig[p.industryType]?.color}; font-weight:700;">
              ${industryConfig[p.industryType]?.label}
            </span>
          </td>
          <td style="padding:6px; border-bottom:1px solid #e5e7eb; text-align:right; font-weight:800; color:${isCritical ? '#b91c1c' : '#b45309'};">
            ${formatQty(p.stock)} ${p.unit}
          </td>
          <td style="padding:6px; border-bottom:1px solid #e5e7eb; text-align:right; font-size:11px;">${formatQty(p.lowStockAlert)}</td>
          <td style="padding:6px; border-bottom:1px solid #e5e7eb; text-align:center;">
            <span style="padding:2px 6px; border-radius:4px; background:${isCritical ? '#fee2e2' : '#fef3c7'}; color:${isCritical ? '#b91c1c' : '#b45309'}; font-size:10px; font-weight:800;">
              ${isCritical ? 'OUT' : 'LOW'}
            </span>
          </td>
          <td style="padding:6px; border-bottom:1px solid #e5e7eb; text-align:right; font-weight:700; color:#15803d;">Rs ${p.salePrice.toLocaleString()}</td>
        </tr>`;
      }).join('');

      const html = `<!DOCTYPE html><html><head><meta charset="utf-8" />
<style>
  body { font-family: -apple-system, sans-serif; margin: 0; padding: 20px; color: #0f172a; }
  h1 { font-size: 22px; font-weight: 800; margin: 0 0 4px; }
  .subtitle { color: #64748b; font-size: 11px; margin-bottom: 16px; }
  .stats { display: flex; gap: 12px; margin-bottom: 20px; }
  .stat { flex: 1; border: 2px solid #e5e7eb; border-radius: 12px; padding: 10px; }
  .stat-label { font-size: 9px; text-transform: uppercase; letter-spacing: 0.5px; color: #64748b; font-weight: 700; }
  .stat-value { font-size: 18px; font-weight: 800; margin-top: 4px; }
  table { width: 100%; border-collapse: collapse; font-size: 11px; }
  th { background: #f8fafc; text-align: left; padding: 8px 6px; font-size: 9px; text-transform: uppercase; letter-spacing: 0.5px; color: #475569; border-bottom: 2px solid #cbd5e1; font-weight: 800; }
</style></head><body>
<h1>${data?.tenantName || 'My Store'}</h1>
<div class="subtitle">Low Stock Alert Report — ${new Date().toLocaleString('en-PK')}</div>
<div class="stats">
  <div class="stat" style="background:#fef2f2;">
    <div class="stat-label" style="color:#b91c1c;">Out of Stock</div>
    <div class="stat-value" style="color:#b91c1c;">${stats.critical}</div>
  </div>
  <div class="stat" style="background:#fef3c7;">
    <div class="stat-label" style="color:#b45309;">Low Stock</div>
    <div class="stat-value" style="color:#b45309;">${stats.warning}</div>
  </div>
  <div class="stat" style="background:#f5f3ff;">
    <div class="stat-label" style="color:#7c3aed;">Total Alerts</div>
    <div class="stat-value" style="color:#7c3aed;">${stats.total}</div>
  </div>
  <div class="stat" style="background:#f0fdf4;">
    <div class="stat-label" style="color:#15803d;">Retail Value</div>
    <div class="stat-value" style="color:#15803d;">Rs ${stats.totalRetailValue.toLocaleString()}</div>
  </div>
</div>
<table>
  <thead>
    <tr>
      <th>Product</th>
      <th>Category</th>
      <th>Industry</th>
      <th style="text-align:right;">Stock</th>
      <th style="text-align:right;">Alert</th>
      <th style="text-align:center;">Status</th>
      <th style="text-align:right;">Sale Price</th>
    </tr>
  </thead>
  <tbody>${rowsHtml}</tbody>
</table>
</body></html>`;

      const { uri } = await Print.printToFileAsync({ html });
      const canShare = await Sharing.isAvailableAsync();
      if (canShare) {
        await Sharing.shareAsync(uri, {
          mimeType: 'application/pdf',
          dialogTitle: 'Low Stock Report',
          UTI: 'com.adobe.pdf',
        });
        Toast.show({ type: 'success', text1: 'PDF ready to share' });
      }
    } catch (e: any) {
      Toast.show({ type: 'error', text1: 'PDF export failed', text2: e?.message });
    }
  };

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
          <ArrowLeft size={20} color="#f59e0b" />
        </Pressable>
        <View className="flex-1">
          <Text className="text-2xl font-extrabold text-neutral-900 dark:text-white">
            Low Stock Alerts
          </Text>
          <View className="flex-row items-center gap-1.5 mt-0.5">
            <Sparkles size={11} color="#f59e0b" />
            <Text className="text-xs text-neutral-500">
              Industry-aware — carpet, mobile, standard
            </Text>
          </View>
        </View>
        <Pressable
          onPress={onRefresh}
          className="h-10 w-10 rounded-2xl bg-white dark:bg-neutral-900 items-center justify-center border border-neutral-200"
        >
          <RefreshCw size={16} color="#f59e0b" />
        </Pressable>
      </View>

      <ScrollView
        contentContainerStyle={{ paddingBottom: 40 }}
        refreshControl={<RefreshControl refreshing={refreshing} onRefresh={onRefresh} tintColor="#f59e0b" />}
        showsVerticalScrollIndicator={false}
      >
        {/* Hero */}
        <View className="px-5 mb-4">
          <View
            className="rounded-3xl p-5"
            style={{
              backgroundColor: '#b45309',
              shadowColor: '#b45309',
              shadowOpacity: 0.3, shadowRadius: 16,
              shadowOffset: { width: 0, height: 8 }, elevation: 10,
            }}
          >
            <View className="flex-row items-center gap-3 mb-3">
              <View className="h-14 w-14 rounded-2xl bg-white/20 items-center justify-center">
                <AlertTriangle size={28} color="#ffffff" />
              </View>
              <View className="flex-1">
                <Text className="text-xs font-bold uppercase tracking-wider text-white/80">
                  Total Alerts
                </Text>
                <Text className="text-4xl font-extrabold text-white">
                  {stats.total}
                </Text>
                <Text className="text-xs text-white/80 mt-0.5">
                  items need restocking
                </Text>
              </View>
            </View>
            <View className="pt-3 border-t border-white/20 flex-row items-center justify-between">
              <View>
                <Text className="text-[10px] font-bold uppercase tracking-wider text-white/70">Out</Text>
                <Text className="text-xl font-extrabold text-white mt-0.5">{stats.critical}</Text>
              </View>
              <View>
                <Text className="text-[10px] font-bold uppercase tracking-wider text-white/70">Low</Text>
                <Text className="text-xl font-extrabold text-white mt-0.5">{stats.warning}</Text>
              </View>
              <View>
                <Text className="text-[10px] font-bold uppercase tracking-wider text-white/70">Lost Revenue</Text>
                <Text className="text-sm font-extrabold text-white mt-0.5">
                  {formatPKR(stats.totalRetailValue)}
                </Text>
              </View>
            </View>
          </View>
        </View>

        {/* KPI Grid */}
        <View className="px-5 mb-4">
          <View className="flex-row flex-wrap -mx-1.5">
            <View className="w-1/2 px-1.5 mb-3">
              <View
                className="rounded-2xl border-2 p-3.5"
                style={{
                  backgroundColor: stats.critical > 0 ? '#fef2f2' : '#ffffff',
                  borderColor: stats.critical > 0 ? '#fca5a5' : '#e5e7eb',
                }}
              >
                <View className="flex-row items-center gap-1.5 mb-1.5">
                  <XCircle size={14} color="#dc2626" />
                  <Text className="text-[10px] uppercase font-extrabold tracking-wider text-rose-700">
                    Out of Stock
                  </Text>
                </View>
                <Text className="text-2xl font-extrabold text-rose-700">{stats.critical}</Text>
                <Text className="text-[10px] text-rose-600 font-bold mt-0.5">Urgent restock</Text>
              </View>
            </View>
            <View className="w-1/2 px-1.5 mb-3">
              <View className="rounded-2xl border-2 border-amber-200 bg-amber-50 p-3.5">
                <View className="flex-row items-center gap-1.5 mb-1.5">
                  <AlertTriangle size={14} color="#d97706" />
                  <Text className="text-[10px] uppercase font-extrabold tracking-wider text-amber-700">
                    Low Stock
                  </Text>
                </View>
                <Text className="text-2xl font-extrabold text-amber-700">{stats.warning}</Text>
                <Text className="text-[10px] text-amber-600 font-bold mt-0.5">Below threshold</Text>
              </View>
            </View>
            <View className="w-1/2 px-1.5 mb-3">
              <View className="rounded-2xl border-2 border-emerald-200 bg-emerald-50 p-3.5">
                <View className="flex-row items-center gap-1.5 mb-1.5">
                  <Layers size={14} color="#16a34a" />
                  <Text className="text-[10px] uppercase font-extrabold tracking-wider text-emerald-700">
                    Carpet Affected
                  </Text>
                </View>
                <Text className="text-2xl font-extrabold text-emerald-700">{stats.carpetCount}</Text>
                <Text className="text-[10px] text-emerald-600 font-bold mt-0.5">Mobile: {stats.mobileCount}</Text>
              </View>
            </View>
            <View className="w-1/2 px-1.5 mb-3">
              <View className="rounded-2xl border-2 border-violet-200 bg-violet-50 p-3.5">
                <View className="flex-row items-center gap-1.5 mb-1.5">
                  <TrendingDown size={14} color="#7c3aed" />
                  <Text className="text-[10px] uppercase font-extrabold tracking-wider text-violet-700">
                    Lost Revenue
                  </Text>
                </View>
                <Text className="text-base font-extrabold text-violet-700" numberOfLines={1}>
                  {formatPKR(stats.totalRetailValue)}
                </Text>
                <Text className="text-[10px] text-violet-600 font-bold mt-0.5">
                  Cost: {formatPKR(stats.totalCostValue)}
                </Text>
              </View>
            </View>
          </View>
        </View>

        {/* Export Actions */}
        <View className="px-5 mb-4">
          <View className="flex-row gap-2">
            <Pressable
              onPress={exportCSV}
              className="flex-1 h-12 rounded-2xl border-2 border-emerald-200 bg-emerald-50 items-center justify-center flex-row gap-2 active:opacity-70"
            >
              <FileText size={16} color="#16a34a" />
              <Text className="text-emerald-700 font-extrabold text-sm">Export CSV</Text>
            </Pressable>
            <Pressable
              onPress={exportPDF}
              className="flex-1 h-12 rounded-2xl border-2 border-blue-200 bg-blue-50 items-center justify-center flex-row gap-2 active:opacity-70"
            >
              <Download size={16} color="#2563eb" />
              <Text className="text-blue-700 font-extrabold text-sm">Export PDF</Text>
            </Pressable>
            <Pressable
              onPress={() => router.push('/purchases')}
              className="h-12 px-4 rounded-2xl items-center justify-center flex-row gap-2 active:opacity-80"
              style={{ backgroundColor: '#16a34a' }}
            >
              <ShoppingBag size={16} color="#ffffff" />
              <Text className="text-white font-extrabold text-sm">Restock</Text>
            </Pressable>
          </View>
        </View>

        {/* Charts */}
        {stats.total > 0 && showCharts && (
          <>
            {/* Top 8 Critical */}
            {topLowChart.length > 0 && (
              <View className="px-5 mb-4">
                <View className="flex-row items-center justify-between mb-3">
                  <View className="flex-row items-center gap-2">
                    <BarChart3 size={18} color="#f59e0b" />
                    <Text className="text-base font-extrabold text-neutral-900 dark:text-white">
                      Top {topLowChart.length} Critical Items
                    </Text>
                  </View>
                  <Pressable
                    onPress={() => setShowCharts(false)}
                    hitSlop={8}
                    className="h-7 w-7 rounded-full bg-neutral-100 items-center justify-center"
                  >
                    <X size={12} color="#6b7280" />
                  </Pressable>
                </View>
                <View className="rounded-2xl bg-white dark:bg-neutral-900 border border-neutral-200 p-4">
                  <BarChart
                    data={topLowChart}
                    defaultColor="#f59e0b"
                    formatValue={(n) => `${n}`}
                  />
                </View>
              </View>
            )}

            {/* Industry Distribution */}
            {industryBreakdown.length > 1 && (
              <View className="px-5 mb-4">
                <View className="flex-row items-center gap-2 mb-3">
                  <PieIcon size={18} color="#8b5cf6" />
                  <Text className="text-base font-extrabold text-neutral-900 dark:text-white">
                    By Industry
                  </Text>
                </View>
                <View className="rounded-2xl bg-white dark:bg-neutral-900 border border-neutral-200 p-4">
                  <View className="items-center mb-4">
                    <DonutChart
                      data={industryBreakdown}
                      size={160}
                      strokeWidth={22}
                      centerValue={String(stats.total)}
                      centerLabel="Alerts"
                    />
                  </View>
                  <View className="gap-2">
                    {industryBreakdown.map((c, i) => {
                      const pct = stats.total > 0 ? (c.value / stats.total) * 100 : 0;
                      return (
                        <View key={i} className="flex-row items-center gap-2">
                          <View className="h-3 w-3 rounded-full" style={{ backgroundColor: c.color }} />
                          <Text className="flex-1 text-sm font-bold text-neutral-700" numberOfLines={1}>
                            {c.label}
                          </Text>
                          <Text className="text-xs text-neutral-500">{pct.toFixed(0)}%</Text>
                          <Text className="text-sm font-extrabold text-neutral-900 w-8 text-right">
                            {c.value}
                          </Text>
                        </View>
                      );
                    })}
                  </View>
                </View>
              </View>
            )}
          </>
        )}

        {!showCharts && stats.total > 0 && (
          <View className="px-5 mb-4">
            <Pressable
              onPress={() => setShowCharts(true)}
              className="rounded-xl bg-violet-50 border-2 border-violet-200 p-3 flex-row items-center justify-center gap-2 active:opacity-70"
            >
              <BarChart3 size={14} color="#7c3aed" />
              <Text className="text-violet-700 font-extrabold text-xs">Show Charts</Text>
            </Pressable>
          </View>
        )}

        {/* Search */}
        <View className="px-5 mb-3">
          <View className="flex-row items-center gap-2 rounded-2xl border border-neutral-200 bg-white dark:bg-neutral-900 px-4 h-12">
            <Search size={18} color="#9ca3af" />
            <TextInput
              placeholder="Search name, SKU, category..."
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

        {/* Filters */}
        <View className="px-5 mb-3">
          {/* Status filter */}
          <Text className="text-[10px] uppercase font-extrabold text-neutral-500 tracking-wider mb-1.5">
            Status
          </Text>
          <ScrollView horizontal showsHorizontalScrollIndicator={false} contentContainerStyle={{ gap: 6, marginBottom: 8 }}>
            {[
              { v: 'all' as Filter, l: 'All', c: '#0f172a', count: stats.total },
              { v: 'critical' as Filter, l: 'Out of Stock', c: '#dc2626', count: stats.critical },
              { v: 'warning' as Filter, l: 'Low', c: '#d97706', count: stats.warning },
            ].map((opt) => {
              const active = filter === opt.v;
              return (
                <Pressable
                  key={opt.v}
                  onPress={() => {
                    Haptics.selectionAsync();
                    setFilter(opt.v);
                  }}
                  className="h-9 px-3 rounded-xl border-2 flex-row items-center gap-1.5"
                  style={{
                    backgroundColor: active ? opt.c : '#ffffff',
                    borderColor: active ? opt.c : '#e5e7eb',
                  }}
                >
                  <Text
                    className="text-xs font-extrabold"
                    style={{ color: active ? '#ffffff' : '#374151' }}
                  >
                    {opt.l}
                  </Text>
                  <View
                    className="px-1.5 rounded-full"
                    style={{ backgroundColor: active ? 'rgba(255,255,255,0.25)' : '#f3f4f6' }}
                  >
                    <Text
                      className="text-[10px] font-extrabold"
                      style={{ color: active ? '#ffffff' : '#6b7280' }}
                    >
                      {opt.count}
                    </Text>
                  </View>
                </Pressable>
              );
            })}
          </ScrollView>

          {/* Industry filter */}
          <Text className="text-[10px] uppercase font-extrabold text-neutral-500 tracking-wider mt-2 mb-1.5">
            Industry
          </Text>
          <ScrollView horizontal showsHorizontalScrollIndicator={false} contentContainerStyle={{ gap: 6 }}>
            <Pressable
              onPress={() => setIndustryFilter('all')}
              className="h-9 px-3 rounded-xl border-2 items-center justify-center"
              style={{
                backgroundColor: industryFilter === 'all' ? '#7c3aed' : '#ffffff',
                borderColor: industryFilter === 'all' ? '#7c3aed' : '#e5e7eb',
              }}
            >
              <Text
                className="text-xs font-extrabold"
                style={{ color: industryFilter === 'all' ? '#ffffff' : '#374151' }}
              >
                All
              </Text>
            </Pressable>
            {(Object.keys(industryConfig) as IndustryType[]).map((key) => {
              const cfg = industryConfig[key];
              const Icon = cfg.icon;
              const active = industryFilter === key;
              return (
                <Pressable
                  key={key}
                  onPress={() => {
                    Haptics.selectionAsync();
                    setIndustryFilter(key);
                  }}
                  className="h-9 px-3 rounded-xl border-2 flex-row items-center gap-1"
                  style={{
                    backgroundColor: active ? cfg.color : '#ffffff',
                    borderColor: active ? cfg.color : '#e5e7eb',
                  }}
                >
                  <Icon size={12} color={active ? '#ffffff' : cfg.color} />
                  <Text
                    className="text-xs font-extrabold"
                    style={{ color: active ? '#ffffff' : '#374151' }}
                  >
                    {cfg.label}
                  </Text>
                </Pressable>
              );
            })}
          </ScrollView>

          {hasFilters && (
            <Pressable
              onPress={clearFilters}
              className="mt-2 self-start flex-row items-center gap-1"
            >
              <X size={11} color="#dc2626" />
              <Text className="text-xs text-rose-600 font-extrabold">Clear filters</Text>
            </Pressable>
          )}
        </View>

        {/* Results header */}
        <View className="px-5 mb-2 flex-row items-center justify-between">
          <Text className="text-xs font-extrabold uppercase text-neutral-500 tracking-wider">
            Products Needing Restock
          </Text>
          <Text className="text-xs font-bold text-neutral-600">
            {filtered.length} of {stats.total}
          </Text>
        </View>

        {/* List */}
        <View className="px-5">
          {isLoading ? (
            <View className="gap-2">
              {[1, 2, 3].map((i) => (
                <View key={i} className="h-20 rounded-2xl bg-neutral-100" />
              ))}
            </View>
          ) : filtered.length === 0 ? (
            <View className="rounded-2xl bg-white dark:bg-neutral-900 border border-neutral-200 items-center py-12">
              <View className="h-16 w-16 rounded-3xl bg-emerald-100 items-center justify-center">
                <CheckCircle2 size={32} color="#16a34a" />
              </View>
              <Text className="mt-3 text-base font-bold text-emerald-700">
                {hasFilters ? 'No matches' : 'All stock healthy 🎉'}
              </Text>
              <Text className="mt-1 text-xs text-neutral-500 text-center px-8">
                {hasFilters ? 'Try different filter' : 'Koi low stock alert nahi hai'}
              </Text>
            </View>
          ) : (
            <View className="gap-2">
              {filtered.map((p) => {
                const isCritical = p.stockStatus === 'OUT_OF_STOCK';
                const indCfg = industryConfig[p.industryType];
                const IndIcon = indCfg?.icon || Package;

                return (
                  <Pressable
                    key={p.productId}
                    onPress={() => {
                      Haptics.selectionAsync();
                      router.push(`/products/${p.productId}`);
                    }}
                    className="rounded-2xl border-2 p-3 active:opacity-70"
                    style={{
                      backgroundColor: isCritical ? '#fef2f2' : '#fffbeb',
                      borderColor: isCritical ? '#fca5a5' : '#fcd34d',
                    }}
                  >
                    <View className="flex-row items-start gap-3">
                      {/* Image / Icon */}
                      <View className="h-14 w-14 rounded-2xl bg-white items-center justify-center overflow-hidden shrink-0">
                        {p.primaryImage ? (
                          <Image
                            source={{ uri: p.primaryImage }}
                            style={{ width: '100%', height: '100%' }}
                            resizeMode="cover"
                          />
                        ) : (
                          <Package size={24} color={isCritical ? '#dc2626' : '#d97706'} />
                        )}
                      </View>

                      {/* Details */}
                      <View className="flex-1 min-w-0">
                        <View className="flex-row items-center gap-1.5 flex-wrap">
                          <Text
                            className="font-extrabold text-sm text-neutral-900 dark:text-white flex-1"
                            numberOfLines={2}
                          >
                            {p.productName}
                          </Text>
                          <View
                            className="px-1.5 py-0.5 rounded-md"
                            style={{ backgroundColor: isCritical ? '#fee2e2' : '#fef3c7' }}
                          >
                            <Text
                              className="text-[9px] font-extrabold"
                              style={{ color: isCritical ? '#b91c1c' : '#b45309' }}
                            >
                              {isCritical ? 'OUT' : 'LOW'}
                            </Text>
                          </View>
                        </View>

                        {(p.sku || p.barcode) && (
                          <Text className="text-[10px] font-mono text-neutral-500 mt-0.5">
                            {p.sku || p.barcode}
                          </Text>
                        )}

                        <View className="flex-row items-center gap-1.5 mt-1 flex-wrap">
                          {p.category && (
                            <View className="flex-row items-center gap-1">
                              {p.categoryColor && (
                                <View className="h-2 w-2 rounded-full" style={{ backgroundColor: p.categoryColor }} />
                              )}
                              <Text className="text-[10px] font-bold text-neutral-600">
                                {p.category}
                              </Text>
                            </View>
                          )}
                          {p.brand && (
                            <>
                              <Text className="text-[10px] text-neutral-400">•</Text>
                              <Text className="text-[10px] font-bold text-violet-700">{p.brand}</Text>
                            </>
                          )}
                        </View>

                        <View className="flex-row items-center gap-2 mt-1.5">
                          <View
                            className="flex-row items-center gap-1 px-1.5 py-0.5 rounded-md"
                            style={{ backgroundColor: indCfg.bg }}
                          >
                            <IndIcon size={9} color={indCfg.color} />
                            <Text
                              className="text-[9px] font-extrabold"
                              style={{ color: indCfg.color }}
                            >
                              {indCfg.label.toUpperCase()}
                            </Text>
                          </View>
                          {p.industryType === 'CARPET' &&
                            (p.carpetRollCount != null || p.carpetCutPiecesCount != null) && (
                              <Text className="text-[9px] font-extrabold text-emerald-700">
                                {p.carpetRollCount || 0}R • {p.carpetCutPiecesCount || 0}CP
                              </Text>
                            )}
                          {p.industryType === 'MOBILE' && p.imeiCount != null && (
                            <Text className="text-[9px] font-extrabold text-blue-700">
                              {p.imeiCount} IMEIs
                            </Text>
                          )}
                        </View>
                      </View>

                      {/* Right side: Stock + Price */}
                      <View className="items-end shrink-0">
                        <Text
                          className="text-xl font-extrabold"
                          style={{ color: isCritical ? '#b91c1c' : '#b45309' }}
                        >
                          {formatQty(p.stock)}
                        </Text>
                        <Text
                          className="text-[9px] font-bold uppercase"
                          style={{ color: isCritical ? '#dc2626' : '#d97706' }}
                        >
                          {p.unit}
                        </Text>
                        <Text className="text-[10px] text-neutral-500 mt-1">
                          Alert: {formatQty(p.lowStockAlert)}
                        </Text>
                        <Text className="text-sm font-extrabold text-emerald-700 mt-0.5">
                          {formatPKRFull(p.salePrice)}
                        </Text>
                      </View>
                    </View>

                    {/* Actions */}
                    <View className="mt-3 pt-3 border-t border-neutral-200/50 flex-row gap-2">
                      <Pressable
                        onPress={(e) => {
                          e.stopPropagation();
                          router.push(`/products/${p.productId}/edit`);
                        }}
                        className="flex-1 h-9 rounded-lg bg-white border border-neutral-200 items-center justify-center flex-row gap-1.5"
                      >
                        <Edit3 size={12} color="#374151" />
                        <Text className="text-xs font-extrabold text-neutral-700">Edit</Text>
                      </Pressable>
                      <Pressable
                        onPress={(e) => {
                          e.stopPropagation();
                          router.push('/purchases');
                        }}
                        className="flex-1 h-9 rounded-lg items-center justify-center flex-row gap-1.5"
                        style={{ backgroundColor: '#16a34a' }}
                      >
                        <ShoppingBag size={12} color="#ffffff" />
                        <Text className="text-xs font-extrabold text-white">Restock</Text>
                      </Pressable>
                    </View>
                  </Pressable>
                );
              })}
            </View>
          )}
        </View>
      </ScrollView>
    </SafeAreaView>
  );
}
