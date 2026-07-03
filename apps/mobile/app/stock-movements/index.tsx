import { useState, useMemo } from 'react';
import {
  View, Text, ScrollView, Pressable, RefreshControl, TextInput,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { useRouter, Stack } from 'expo-router';
import { useQuery } from '@tanstack/react-query';
import * as Haptics from 'expo-haptics';
import {
  ArrowLeft, Activity, Sparkles, Search, X, Package,
  ArrowDownToLine, ArrowUpFromLine, RotateCcw, ArrowRightLeft,
  ClipboardCheck, AlertTriangle, TrendingDown, TrendingUp,
  Calendar, Filter,
} from 'lucide-react-native';
import { stockMovementsApi, type StockMovementType } from '@/api/stock-movements.api';
import { useSmartBack } from '@/hooks/useSmartBack';

const typeConfig: Record<StockMovementType, {
  label: string; icon: any; color: string; bg: string; isIn: boolean;
}> = {
  PURCHASE_IN:    { label: 'Purchase',     icon: ArrowDownToLine,  color: '#16a34a', bg: '#dcfce7', isIn: true },
  SALE_OUT:       { label: 'Sale',         icon: ArrowUpFromLine,  color: '#dc2626', bg: '#fee2e2', isIn: false },
  RETURN_IN:      { label: 'Return',       icon: RotateCcw,        color: '#f97316', bg: '#ffedd5', isIn: true },
  TRANSFER_IN:    { label: 'Transfer In',  icon: ArrowDownToLine,  color: '#0891b2', bg: '#cffafe', isIn: true },
  TRANSFER_OUT:   { label: 'Transfer Out', icon: ArrowUpFromLine,  color: '#0891b2', bg: '#cffafe', isIn: false },
  ADJUSTMENT_IN:  { label: 'Adjust +',     icon: ClipboardCheck,   color: '#7c3aed', bg: '#ede9fe', isIn: true },
  ADJUSTMENT_OUT: { label: 'Adjust -',     icon: ClipboardCheck,   color: '#7c3aed', bg: '#ede9fe', isIn: false },
  DAMAGE:         { label: 'Damage',       icon: AlertTriangle,    color: '#dc2626', bg: '#fee2e2', isIn: false },
  LOSS:           { label: 'Loss',         icon: TrendingDown,     color: '#dc2626', bg: '#fee2e2', isIn: false },
};

type DateFilter = 'all' | 'today' | 'week' | 'month';
type TypeFilter = 'all' | 'in' | 'out' | StockMovementType;

const formatDate = (v: string) =>
  new Intl.DateTimeFormat('en-PK', { dateStyle: 'medium', timeStyle: 'short' }).format(new Date(v));

const formatQty = (q: number) => q.toFixed(q % 1 === 0 ? 0 : 2);

export default function StockMovementsScreen() {
  const router = useRouter();
  const goBack = useSmartBack();
  const [refreshing, setRefreshing] = useState(false);
  const [search, setSearch] = useState('');
  const [typeFilter, setTypeFilter] = useState<TypeFilter>('all');
  const [dateFilter, setDateFilter] = useState<DateFilter>('week');

  const { data: movements = [], refetch } = useQuery({
    queryKey: ['stock-movements'],
    queryFn: async () => {
      try {
        const r = await stockMovementsApi.list();
        return Array.isArray(r) ? r : [];
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

  const filtered = useMemo(() => {
    let result = [...movements];

    // Date filter
    if (dateFilter !== 'all') {
      const now = new Date();
      let cutoff = new Date();
      if (dateFilter === 'today') cutoff.setHours(0, 0, 0, 0);
      else if (dateFilter === 'week') cutoff.setDate(now.getDate() - 7);
      else if (dateFilter === 'month') cutoff.setMonth(now.getMonth() - 1);
      result = result.filter((m) => new Date(m.createdAt) >= cutoff);
    }

    // Type filter
    if (typeFilter === 'in') {
      result = result.filter((m) => typeConfig[m.type]?.isIn);
    } else if (typeFilter === 'out') {
      result = result.filter((m) => !typeConfig[m.type]?.isIn);
    } else if (typeFilter !== 'all') {
      result = result.filter((m) => m.type === typeFilter);
    }

    // Search
    const q = search.toLowerCase().trim();
    if (q) {
      result = result.filter(
        (m) =>
          m.product.name.toLowerCase().includes(q) ||
          (m.reference || '').toLowerCase().includes(q) ||
          (m.product.sku || '').toLowerCase().includes(q),
      );
    }
    return result;
  }, [movements, search, typeFilter, dateFilter]);

  const stats = useMemo(() => {
    const today = new Date().toDateString();
    const todayCount = movements.filter((m) => new Date(m.createdAt).toDateString() === today).length;
    const totalIn = movements.filter((m) => typeConfig[m.type]?.isIn).reduce((s, m) => s + Math.abs(m.quantity), 0);
    const totalOut = movements.filter((m) => !typeConfig[m.type]?.isIn).reduce((s, m) => s + Math.abs(m.quantity), 0);
    return {
      total: movements.length,
      today: todayCount,
      totalIn,
      totalOut,
      stockInCount: movements.filter((m) => typeConfig[m.type]?.isIn).length,
      stockOutCount: movements.filter((m) => !typeConfig[m.type]?.isIn).length,
    };
  }, [movements]);

  const hasFilters = search || typeFilter !== 'all' || dateFilter !== 'week';

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
          <ArrowLeft size={20} color="#2563eb" />
        </Pressable>
        <View className="flex-1">
          <Text className="text-2xl font-extrabold text-neutral-900 dark:text-white">
            Stock Movements
          </Text>
          <View className="flex-row items-center gap-1.5 mt-0.5">
            <Sparkles size={11} color="#2563eb" />
            <Text className="text-xs text-neutral-500">
              Audit trail • {stats.total} records
            </Text>
          </View>
        </View>
      </View>

      <ScrollView
        contentContainerStyle={{ paddingBottom: 40 }}
        refreshControl={
          <RefreshControl refreshing={refreshing} onRefresh={onRefresh} tintColor="#2563eb" />
        }
        showsVerticalScrollIndicator={false}
      >
        {/* Hero */}
        <View className="mx-5 rounded-3xl p-5 mb-4" style={{
          backgroundColor: '#2563eb',
          shadowColor: '#2563eb',
          shadowOpacity: 0.3,
          shadowRadius: 16,
          elevation: 10,
        }}>
          <View className="flex-row items-center gap-3">
            <View className="h-14 w-14 rounded-2xl bg-white/20 items-center justify-center">
              <Activity size={28} color="#ffffff" />
            </View>
            <View className="flex-1">
              <Text className="text-[10px] uppercase tracking-wider text-white/80 font-extrabold">
                Inventory Audit Trail
              </Text>
              <Text className="text-white text-3xl font-extrabold mt-0.5">
                {stats.total}
              </Text>
              <Text className="text-xs text-white/80 mt-0.5">
                {stats.today} today
              </Text>
            </View>
          </View>
        </View>

        {/* Stats grid */}
        <View className="px-5 mb-3">
          <View className="flex-row flex-wrap -mx-1.5">
            {[
              { label: 'Today', value: stats.today, color: '#2563eb', bg: '#dbeafe', icon: Calendar },
              { label: 'Total', value: stats.total, color: '#7c3aed', bg: '#ede9fe', icon: Activity },
              { label: 'Stock In', value: `+${formatQty(stats.totalIn)}`, color: '#16a34a', bg: '#dcfce7', icon: TrendingUp, isText: true },
              { label: 'Stock Out', value: `−${formatQty(stats.totalOut)}`, color: '#dc2626', bg: '#fee2e2', icon: TrendingDown, isText: true },
            ].map((s) => {
              const Icon = s.icon;
              return (
                <View key={s.label} className="w-1/2 px-1.5 mb-3">
                  <View className="rounded-2xl border-2 p-3" style={{ backgroundColor: s.bg, borderColor: s.color }}>
                    <View className="flex-row items-center gap-1.5 mb-1">
                      <Icon size={12} color={s.color} />
                      <Text className="text-[10px] uppercase font-extrabold" style={{ color: s.color }}>
                        {s.label}
                      </Text>
                    </View>
                    <Text
                      className={s.isText ? 'text-lg font-extrabold mt-0.5' : 'text-2xl font-extrabold mt-0.5'}
                      style={{ color: s.color }}
                      numberOfLines={1}
                    >
                      {s.value}
                    </Text>
                  </View>
                </View>
              );
            })}
          </View>
        </View>

        {/* Search */}
        <View className="px-5 mb-3">
          <View className="flex-row items-center gap-2 rounded-2xl border border-neutral-200 bg-white px-4 h-12">
            <Search size={18} color="#9ca3af" />
            <TextInput
              placeholder="Search product, reference, SKU..."
              placeholderTextColor="#9ca3af"
              value={search}
              onChangeText={setSearch}
              className="flex-1 text-sm text-neutral-900"
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

        {/* Type filter chips */}
        <ScrollView
          horizontal
          showsHorizontalScrollIndicator={false}
          contentContainerStyle={{ paddingHorizontal: 20, gap: 8 }}
          className="mb-2"
        >
          {[
            { key: 'all' as TypeFilter, label: 'All', count: stats.total, color: '#0f172a' },
            { key: 'in' as TypeFilter, label: 'Stock In', count: stats.stockInCount, color: '#16a34a' },
            { key: 'out' as TypeFilter, label: 'Stock Out', count: stats.stockOutCount, color: '#dc2626' },
          ].map((f) => {
            const active = typeFilter === f.key;
            return (
              <Pressable
                key={f.key}
                onPress={() => {
                  Haptics.selectionAsync();
                  setTypeFilter(f.key);
                }}
                className="h-9 px-3 rounded-xl border-2 flex-row items-center gap-1.5"
                style={{
                  backgroundColor: active ? f.color : '#ffffff',
                  borderColor: active ? f.color : '#e5e7eb',
                }}
              >
                <Text
                  className="text-xs font-bold"
                  style={{ color: active ? '#ffffff' : '#374151' }}
                >
                  {f.label}
                </Text>
                <View
                  className="px-1.5 py-0.5 rounded"
                  style={{ backgroundColor: active ? 'rgba(255,255,255,0.25)' : '#f3f4f6' }}
                >
                  <Text
                    className="text-[10px] font-extrabold"
                    style={{ color: active ? '#ffffff' : '#6b7280' }}
                  >
                    {f.count}
                  </Text>
                </View>
              </Pressable>
            );
          })}
        </ScrollView>

        {/* Date filter */}
        <ScrollView
          horizontal
          showsHorizontalScrollIndicator={false}
          contentContainerStyle={{ paddingHorizontal: 20, gap: 8 }}
          className="mb-3"
        >
          <View className="flex-row items-center gap-1 pr-1">
            <Calendar size={11} color="#9ca3af" />
            <Text className="text-[10px] uppercase font-extrabold text-neutral-500">Period:</Text>
          </View>
          {[
            { v: 'all' as DateFilter, l: 'All Time' },
            { v: 'today' as DateFilter, l: 'Today' },
            { v: 'week' as DateFilter, l: 'Last 7 Days' },
            { v: 'month' as DateFilter, l: 'Last 30 Days' },
          ].map((opt) => {
            const active = dateFilter === opt.v;
            return (
              <Pressable
                key={opt.v}
                onPress={() => setDateFilter(opt.v)}
                className="h-8 px-3 rounded-lg border-2 items-center justify-center"
                style={{
                  backgroundColor: active ? '#2563eb' : '#ffffff',
                  borderColor: active ? '#2563eb' : '#e5e7eb',
                }}
              >
                <Text
                  className="text-[11px] font-bold"
                  style={{ color: active ? '#ffffff' : '#374151' }}
                >
                  {opt.l}
                </Text>
              </Pressable>
            );
          })}
        </ScrollView>

        {/* Movement type detail chips */}
        <ScrollView
          horizontal
          showsHorizontalScrollIndicator={false}
          contentContainerStyle={{ paddingHorizontal: 20, gap: 6 }}
          className="mb-3"
        >
          {(Object.entries(typeConfig) as [StockMovementType, any][]).map(([key, cfg]) => {
            const Icon = cfg.icon;
            const active = typeFilter === key;
            return (
              <Pressable
                key={key}
                onPress={() => setTypeFilter(active ? 'all' : key)}
                className="h-8 px-2.5 rounded-lg border flex-row items-center gap-1"
                style={{
                  backgroundColor: active ? cfg.color : cfg.bg,
                  borderColor: active ? cfg.color : cfg.color + '40',
                }}
              >
                <Icon size={11} color={active ? '#ffffff' : cfg.color} />
                <Text
                  className="text-[10px] font-extrabold"
                  style={{ color: active ? '#ffffff' : cfg.color }}
                >
                  {cfg.label}
                </Text>
              </Pressable>
            );
          })}
        </ScrollView>

        {/* Movements list */}
        <View className="px-5">
          {filtered.length === 0 ? (
            <View className="items-center py-16">
              <View className="h-20 w-20 rounded-3xl bg-blue-100 items-center justify-center">
                <Activity size={36} color="#2563eb" />
              </View>
              <Text className="mt-4 text-base font-bold text-neutral-900">
                {hasFilters ? 'No movements match' : 'No movements yet'}
              </Text>
              <Text className="text-xs text-neutral-500 mt-1 text-center px-8">
                Stock changes ka pura record yahan dikhega
              </Text>
            </View>
          ) : (
            <View className="gap-2">
              {filtered.map((m) => {
                const cfg = typeConfig[m.type] || {
                  label: m.type, icon: Activity, color: '#737373', bg: '#f3f4f6', isIn: false,
                };
                const Icon = cfg.icon;
                return (
                  <Pressable
                    key={m.id}
                    onPress={() => {
                      Haptics.selectionAsync();
                      router.push(`/products/${m.product.id}`);
                    }}
                    className="rounded-2xl bg-white dark:bg-neutral-900 border-2 border-neutral-200 p-3 active:opacity-70"
                  >
                    <View className="flex-row items-start gap-3">
                      <View
                        className="h-12 w-12 rounded-2xl items-center justify-center shrink-0"
                        style={{ backgroundColor: cfg.bg }}
                      >
                        <Icon size={20} color={cfg.color} />
                      </View>
                      <View className="flex-1 min-w-0">
                        <View className="flex-row items-center gap-1.5 flex-wrap">
                          <Text className="font-extrabold text-sm text-neutral-900" numberOfLines={1}>
                            {m.product.name}
                          </Text>
                          <View
                            className="px-1.5 py-0.5 rounded"
                            style={{ backgroundColor: cfg.bg }}
                          >
                            <Text className="text-[9px] font-extrabold" style={{ color: cfg.color }}>
                              {cfg.label}
                            </Text>
                          </View>
                        </View>
                        {m.reference && (
                          <Text className="font-mono text-[10px] text-neutral-500 mt-0.5">
                            🔗 {m.reference}
                          </Text>
                        )}
                        {m.note && (
                          <Text className="text-[11px] text-neutral-600 italic mt-0.5" numberOfLines={1}>
                            {m.note}
                          </Text>
                        )}
                        <Text className="text-[10px] text-neutral-400 mt-1">
                          {formatDate(m.createdAt)}
                        </Text>
                      </View>
                      <View className="items-end">
                        <Text
                          className="text-lg font-extrabold"
                          style={{ color: cfg.isIn ? '#15803d' : '#b91c1c' }}
                        >
                          {cfg.isIn ? '+' : ''}{formatQty(m.quantity)}
                        </Text>
                        <Text className="text-[9px] text-neutral-500 font-bold uppercase">
                          {m.product.unit}
                        </Text>
                        <View className="mt-1 px-1.5 py-0.5 rounded bg-slate-100">
                          <Text className="text-[9px] font-extrabold text-slate-700">
                            Bal: {formatQty(m.balanceAfter)}
                          </Text>
                        </View>
                      </View>
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
