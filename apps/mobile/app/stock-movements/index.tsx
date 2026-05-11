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
  ClipboardCheck, AlertTriangle, TrendingDown,
} from 'lucide-react-native';
import { stockMovementsApi, type StockMovementType } from '@/api/stock-movements.api';

import { useTranslation } from '@/i18n/useTranslation';
const typeConfig: Record<StockMovementType, { label: string; icon: any; color: string; bg: string; isIn: boolean }> = {
  PURCHASE_IN: { label: 'Purchase', icon: ArrowDownToLine, color: '#16a34a', bg: '#dcfce7', isIn: true },
  SALE_OUT: { label: 'Sale', icon: ArrowUpFromLine, color: '#dc2626', bg: '#fee2e2', isIn: false },
  RETURN_IN: { label: 'Return', icon: RotateCcw, color: '#f97316', bg: '#ffedd5', isIn: true },
  TRANSFER_IN: { label: 'Transfer In', icon: ArrowDownToLine, color: '#0891b2', bg: '#cffafe', isIn: true },
  TRANSFER_OUT: { label: 'Transfer Out', icon: ArrowUpFromLine, color: '#0891b2', bg: '#cffafe', isIn: false },
  ADJUSTMENT_IN: { label: 'Adjust +', icon: ClipboardCheck, color: '#7c3aed', bg: '#ede9fe', isIn: true },
  ADJUSTMENT_OUT: { label: 'Adjust -', icon: ClipboardCheck, color: '#7c3aed', bg: '#ede9fe', isIn: false },
  DAMAGE: { label: 'Damage', icon: AlertTriangle, color: '#dc2626', bg: '#fee2e2', isIn: false },
  LOSS: { label: 'Loss', icon: TrendingDown, color: '#dc2626', bg: '#fee2e2', isIn: false },
};

const filterOptions: Array<{ key: 'all' | 'in' | 'out'; label: string; color: string }> = [
  { key: 'all', label: 'All', color: '#737373' },
  { key: 'in', label: 'Stock In', color: '#16a34a' },
  { key: 'out', label: 'Stock Out', color: '#dc2626' },
];

const formatDate = (v: string) => {
  const d = new Date(v);
  return new Intl.DateTimeFormat('en-PK', {
    dateStyle: 'medium',
    timeStyle: 'short',
  }).format(d);
};

export default function StockMovementsScreen() {
  const { t } = useTranslation();
  const router = useRouter();
  const [refreshing, setRefreshing] = useState(false);
  const [search, setSearch] = useState('');
  const [filter, setFilter] = useState<'all' | 'in' | 'out'>('all');

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
    let result = movements;
    if (filter !== 'all') {
      result = result.filter((m) => {
        const isIn = typeConfig[m.type]?.isIn ?? false;
        return filter === 'in' ? isIn : !isIn;
      });
    }
    const q = search.toLowerCase().trim();
    if (q) {
      result = result.filter(
        (m) =>
          m.product.name.toLowerCase().includes(q) ||
          (m.reference || '').toLowerCase().includes(q) ||
          (m.note || '').toLowerCase().includes(q),
      );
    }
    return result;
  }, [movements, search, filter]);

  const stats = useMemo(() => {
    const inMoves = movements.filter((m) => typeConfig[m.type]?.isIn);
    const outMoves = movements.filter((m) => !typeConfig[m.type]?.isIn);
    return {
      total: movements.length,
      stockIn: inMoves.length,
      stockOut: outMoves.length,
    };
  }, [movements]);

  return (
    <SafeAreaView className="flex-1 bg-neutral-50 dark:bg-neutral-950" edges={['top']}>
      <Stack.Screen options={{ headerShown: false }} />

      <View className="px-5 pt-4 pb-3 flex-row items-center gap-3">
        <Pressable
          onPress={() => router.back()}
          hitSlop={12}
          className="h-10 w-10 rounded-2xl bg-white dark:bg-neutral-900 items-center justify-center border border-neutral-200 dark:border-neutral-800"
        >
          <ArrowLeft size={20} color="#16a34a" />
        </Pressable>
        <View className="flex-1">
          <Text className="text-2xl font-extrabold text-neutral-900 dark:text-white">{t('auto.index.stock_movements')}</Text>
          <View className="flex-row items-center gap-1.5 mt-0.5">
            <Sparkles size={11} color="#737373" />
            <Text className="text-xs text-neutral-500">
              Audit trail • {stats.total} records
            </Text>
          </View>
        </View>
      </View>

      {/* Stats Pills */}
      <ScrollView
        horizontal
        showsHorizontalScrollIndicator={false}
        contentContainerStyle={{ paddingHorizontal: 20, gap: 8, paddingBottom: 8 }}
      >
        <View className="flex-row items-center gap-1.5 px-3 py-1.5 rounded-full bg-neutral-100">
          <Activity size={11} color="#737373" />
          <Text className="text-xs font-bold text-neutral-700">
            Total {stats.total}
          </Text>
        </View>
        <View className="flex-row items-center gap-1.5 px-3 py-1.5 rounded-full bg-emerald-100">
          <ArrowDownToLine size={11} color="#16a34a" />
          <Text className="text-xs font-bold text-emerald-700">
            In {stats.stockIn}
          </Text>
        </View>
        <View className="flex-row items-center gap-1.5 px-3 py-1.5 rounded-full bg-rose-100">
          <ArrowUpFromLine size={11} color="#dc2626" />
          <Text className="text-xs font-bold text-rose-700">
            Out {stats.stockOut}
          </Text>
        </View>
      </ScrollView>

      {/* Search + Filter */}
      <View className="px-5 pb-3">
        <View className="flex-row items-center gap-2 rounded-2xl border border-neutral-200 dark:border-neutral-800 bg-white dark:bg-neutral-900 px-4 h-12 mb-3">
          <Search size={20} color="#9ca3af" />
          <TextInput
            placeholder="Search product, reference..."
            placeholderTextColor="#9ca3af"
            value={search}
            onChangeText={setSearch}
            className="flex-1 text-base text-neutral-900 dark:text-white"
          />
          {search.length > 0 && (
            <Pressable
              onPress={() => setSearch('')}
              hitSlop={12}
              className="h-7 w-7 rounded-full bg-neutral-100 dark:bg-neutral-800 items-center justify-center"
            >
              <X size={14} color="#9ca3af" />
            </Pressable>
          )}
        </View>

        <View className="flex-row gap-2">
          {filterOptions.map((opt) => {
            const active = filter === opt.key;
            return (
              <Pressable
                key={opt.key}
                onPress={() => {
                  Haptics.selectionAsync();
                  setFilter(opt.key);
                }}
                className="flex-1 h-10 rounded-xl items-center justify-center border-2"
                style={{
                  backgroundColor: active ? opt.color : '#ffffff',
                  borderColor: active ? opt.color : '#e5e7eb',
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
      </View>

      <ScrollView
        contentContainerStyle={{ padding: 20, paddingBottom: 40 }}
        refreshControl={
          <RefreshControl refreshing={refreshing} onRefresh={onRefresh} tintColor="#16a34a" />
        }
        showsVerticalScrollIndicator={false}
      >
        {filtered.length === 0 ? (
          <View className="rounded-2xl bg-white dark:bg-neutral-900 border border-neutral-200 dark:border-neutral-800 items-center py-12">
            <View className="h-16 w-16 rounded-3xl bg-neutral-100 items-center justify-center">
              <Activity size={32} color="#9ca3af" />
            </View>
            <Text className="mt-3 text-base font-bold text-neutral-700">
              {search || filter !== 'all' ? 'No matches' : 'No movements yet'}
            </Text>
            <Text className="mt-1 text-xs text-neutral-500">{t('auto.index.stock_changes_ka_pura_record_yahan_dikhe')}</Text>
          </View>
        ) : (
          <View className="gap-2">
            {filtered.map((m) => {
              const cfg = typeConfig[m.type] || {
                label: m.type,
                icon: Activity,
                color: '#737373',
                bg: '#f3f4f6',
                isIn: false,
              };
              const Icon = cfg.icon;
              return (
                <Pressable
                  key={m.id}
                  onPress={() => {
                    Haptics.selectionAsync();
                    router.push(`/products/${m.product.id}`);
                  }}
                  className="rounded-2xl bg-white dark:bg-neutral-900 border border-neutral-200 dark:border-neutral-800 p-3 active:opacity-70"
                >
                  <View className="flex-row items-center gap-3">
                    <View
                      className="h-11 w-11 rounded-2xl items-center justify-center"
                      style={{ backgroundColor: cfg.bg }}
                    >
                      <Icon size={18} color={cfg.color} />
                    </View>
                    <View className="flex-1">
                      <View className="flex-row items-center gap-2">
                        <Text
                          className="font-bold text-neutral-900 dark:text-white text-sm"
                          numberOfLines={1}
                        >
                          {m.product.name}
                        </Text>
                        <View
                          className="px-1.5 py-0.5 rounded-md"
                          style={{ backgroundColor: cfg.bg }}
                        >
                          <Text className="text-[9px] font-extrabold" style={{ color: cfg.color }}>
                            {cfg.label}
                          </Text>
                        </View>
                      </View>
                      {m.reference && (
                        <Text className="font-mono text-[10px] text-neutral-500 mt-0.5">
                          {m.reference}
                        </Text>
                      )}
                      {m.note && (
                        <Text className="text-[11px] text-neutral-500 mt-0.5" numberOfLines={1}>
                          {m.note}
                        </Text>
                      )}
                      <Text className="text-[10px] text-neutral-400 mt-0.5">
                        {formatDate(m.createdAt)}
                      </Text>
                    </View>
                    <View className="items-end">
                      <Text
                        className="text-base font-extrabold"
                        style={{ color: cfg.isIn ? '#15803d' : '#b91c1c' }}
                      >
                        {cfg.isIn ? '+' : ''}{m.quantity}
                      </Text>
                      <Text className="text-[9px] text-neutral-500 font-bold uppercase">
                        {m.product.unit}
                      </Text>
                      <Text className="text-[10px] text-neutral-500 mt-0.5">
                        Now: {m.balanceAfter}
                      </Text>
                    </View>
                  </View>
                </Pressable>
              );
            })}
          </View>
        )}
      </ScrollView>
    </SafeAreaView>
  );
}
