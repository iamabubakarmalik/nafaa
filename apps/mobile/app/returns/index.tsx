import { useState, useMemo } from 'react';
import {
  View, Text, ScrollView, Pressable, RefreshControl, TextInput,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { useRouter, Stack } from 'expo-router';
import { useQuery } from '@tanstack/react-query';
import * as Haptics from 'expo-haptics';
import {
  ArrowLeft, RotateCcw, Sparkles, Plus, Receipt, User,
  CalendarClock, ChevronRight, Package, Banknote, Search, X,
  Scissors, TrendingDown, Filter, CreditCard, Smartphone,
  Building2, Zap, Calendar,
} from 'lucide-react-native';
import { returnsApi } from '@/api/returns.api';
import { formatPKRFull } from '@/lib/format';
import { useSmartBack } from '@/hooks/useSmartBack';

const formatDate = (v: string) =>
  new Intl.DateTimeFormat('en-PK', {
    dateStyle: 'medium',
    timeStyle: 'short',
  }).format(new Date(v));

const formatShortDate = (v: string) =>
  new Intl.DateTimeFormat('en-PK', {
    month: 'short',
    day: 'numeric',
  }).format(new Date(v));

const paymentIcons: Record<string, any> = {
  CASH: Banknote,
  CARD: CreditCard,
  JAZZCASH: Smartphone,
  EASYPAISA: Zap,
  BANK_TRANSFER: Building2,
};

const paymentColors: Record<string, string> = {
  CASH: '#16a34a',
  CARD: '#2563eb',
  JAZZCASH: '#f97316',
  EASYPAISA: '#22c55e',
  BANK_TRANSFER: '#8b5cf6',
};

type DateFilter = 'all' | 'today' | 'week' | 'month';

export default function ReturnsScreen() {
  const router = useRouter();
  const goBack = useSmartBack();
  const [refreshing, setRefreshing] = useState(false);
  const [search, setSearch] = useState('');
  const [dateFilter, setDateFilter] = useState<DateFilter>('all');
  const [showFilters, setShowFilters] = useState(false);

  const { data: returns = [], refetch } = useQuery({
    queryKey: ['returns'],
    queryFn: async () => {
      try {
        const r = await returnsApi.list();
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

  // Stats
  const stats = useMemo(() => {
    const totalRefunded = returns.reduce((s, r) => s + r.refundAmount, 0);
    const today = new Date().toDateString();
    const todayReturns = returns.filter(
      (r) => new Date(r.returnedAt).toDateString() === today,
    );
    const totalCutPieces = returns.reduce(
      (s, r) => s + (r.createdCutPieces?.length || 0),
      0,
    );
    return {
      total: returns.length,
      totalRefunded,
      todayCount: todayReturns.length,
      todayRefunded: todayReturns.reduce((s, r) => s + r.refundAmount, 0),
      totalCutPieces,
    };
  }, [returns]);

  // Filtered results
  const filtered = useMemo(() => {
    let result = returns;

    // Date filter
    if (dateFilter !== 'all') {
      const now = new Date();
      let cutoff = new Date();
      if (dateFilter === 'today') cutoff.setHours(0, 0, 0, 0);
      else if (dateFilter === 'week') cutoff.setDate(now.getDate() - 7);
      else if (dateFilter === 'month') cutoff.setMonth(now.getMonth() - 1);
      result = result.filter((r) => new Date(r.returnedAt) >= cutoff);
    }

    // Search filter
    if (search.trim()) {
      const q = search.toLowerCase().trim();
      result = result.filter(
        (r) =>
          r.returnNumber.toLowerCase().includes(q) ||
          r.sale.saleNumber.toLowerCase().includes(q) ||
          (r.sale.customer?.name || '').toLowerCase().includes(q) ||
          (r.reason || '').toLowerCase().includes(q),
      );
    }

    return result;
  }, [returns, dateFilter, search]);

  const filteredTotal = filtered.reduce((s, r) => s + r.refundAmount, 0);
  const hasFilters = dateFilter !== 'all' || search.trim().length > 0;

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
          <ArrowLeft size={20} color="#f97316" />
        </Pressable>
        <View className="flex-1">
          <Text className="text-2xl font-extrabold text-neutral-900 dark:text-white">
            Returns
          </Text>
          <View className="flex-row items-center gap-1.5 mt-0.5">
            <Sparkles size={11} color="#f97316" />
            <Text className="text-xs text-neutral-500">
              {returns.length} returns processed
            </Text>
          </View>
        </View>
        <Pressable
          onPress={() => {
            Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
            router.push('/returns/new');
          }}
          className="h-11 px-4 rounded-2xl flex-row items-center gap-1.5 active:opacity-80"
          style={{
            backgroundColor: '#f97316',
            shadowColor: '#f97316',
            shadowOpacity: 0.3,
            shadowRadius: 8,
            elevation: 4,
          }}
        >
          <Plus size={16} color="#ffffff" />
          <Text className="text-white font-bold text-sm">New</Text>
        </Pressable>
      </View>

      <ScrollView
        contentContainerStyle={{ paddingBottom: 40 }}
        refreshControl={
          <RefreshControl refreshing={refreshing} onRefresh={onRefresh} tintColor="#f97316" />
        }
        showsVerticalScrollIndicator={false}
      >
        {/* Hero */}
        <View className="px-5 mb-4">
          <View
            className="rounded-3xl p-5"
            style={{
              backgroundColor: '#f97316',
              shadowColor: '#f97316',
              shadowOpacity: 0.3,
              shadowRadius: 16,
              shadowOffset: { width: 0, height: 8 },
              elevation: 10,
            }}
          >
            <View className="flex-row items-center gap-3">
              <View className="h-14 w-14 rounded-2xl bg-white/20 items-center justify-center">
                <TrendingDown size={28} color="#ffffff" />
              </View>
              <View className="flex-1">
                <Text className="text-xs font-bold uppercase tracking-wider text-white/80">
                  Total Refunded
                </Text>
                <Text className="text-3xl font-extrabold text-white">
                  {formatPKRFull(stats.totalRefunded)}
                </Text>
                <Text className="text-xs text-white/80 mt-0.5">
                  Across {stats.total} returns
                </Text>
              </View>
            </View>

            {/* Sub-stats */}
            <View className="mt-4 pt-4 border-t border-white/20 flex-row items-center justify-between">
              <View className="flex-1">
                <Text className="text-[10px] font-extrabold uppercase text-white/70">
                  Today
                </Text>
                <Text className="text-white text-lg font-extrabold mt-0.5">
                  {stats.todayCount}
                </Text>
                <Text className="text-[10px] text-white/70 font-bold">
                  {formatPKRFull(stats.todayRefunded)}
                </Text>
              </View>
              <View className="flex-1 items-center border-l border-white/20 pl-3">
                <Text className="text-[10px] font-extrabold uppercase text-white/70">
                  This Month
                </Text>
                <Text className="text-white text-lg font-extrabold mt-0.5">
                  {returns.filter((r) => {
                    const d = new Date(r.returnedAt);
                    const now = new Date();
                    return d.getMonth() === now.getMonth() && d.getFullYear() === now.getFullYear();
                  }).length}
                </Text>
                <Text className="text-[10px] text-white/70 font-bold">returns</Text>
              </View>
              {stats.totalCutPieces > 0 && (
                <View className="flex-1 items-end border-l border-white/20 pl-3">
                  <View className="flex-row items-center gap-1">
                    <Scissors size={10} color="rgba(255,255,255,0.7)" />
                    <Text className="text-[10px] font-extrabold uppercase text-white/70">
                      Cut Pieces
                    </Text>
                  </View>
                  <Text className="text-white text-lg font-extrabold mt-0.5">
                    {stats.totalCutPieces}
                  </Text>
                  <Text className="text-[10px] text-white/70 font-bold">created</Text>
                </View>
              )}
            </View>
          </View>
        </View>

        {/* Search + Filter */}
        <View className="px-5 mb-3 flex-row gap-2">
          <View className="flex-1 flex-row items-center gap-2 rounded-2xl border border-neutral-200 bg-white dark:bg-neutral-900 px-4 h-12">
            <Search size={18} color="#9ca3af" />
            <TextInput
              placeholder="Search return #, customer..."
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
          <Pressable
            onPress={() => {
              Haptics.selectionAsync();
              setShowFilters((v) => !v);
            }}
            className="h-12 px-4 rounded-2xl flex-row items-center gap-1.5 border-2 active:opacity-70"
            style={{
              backgroundColor: hasFilters || showFilters ? '#fed7aa' : '#ffffff',
              borderColor: hasFilters || showFilters ? '#f97316' : '#e5e7eb',
            }}
          >
            <Filter size={16} color={hasFilters || showFilters ? '#c2410c' : '#6b7280'} />
            <Text
              className="font-bold text-sm"
              style={{ color: hasFilters || showFilters ? '#c2410c' : '#374151' }}
            >
              Filter
            </Text>
            {hasFilters && (
              <View className="h-5 w-5 rounded-full bg-orange-600 items-center justify-center">
                <Text className="text-white text-[9px] font-extrabold">!</Text>
              </View>
            )}
          </Pressable>
        </View>

        {/* Filters panel */}
        {showFilters && (
          <View className="px-5 mb-3">
            <View className="rounded-2xl bg-white dark:bg-neutral-900 border border-neutral-200 p-3">
              <Text className="text-[10px] uppercase tracking-wider font-bold text-neutral-500 mb-1.5">
                Date Range
              </Text>
              <ScrollView horizontal showsHorizontalScrollIndicator={false} contentContainerStyle={{ gap: 6 }}>
                {(['all', 'today', 'week', 'month'] as DateFilter[]).map((v) => {
                  const labels = { all: 'All Time', today: 'Today', week: '7 Days', month: '30 Days' };
                  const active = dateFilter === v;
                  return (
                    <Pressable
                      key={v}
                      onPress={() => {
                        Haptics.selectionAsync();
                        setDateFilter(v);
                      }}
                      className="px-3 h-8 rounded-lg items-center justify-center"
                      style={{
                        backgroundColor: active ? '#f97316' : '#f3f4f6',
                      }}
                    >
                      <Text
                        className="text-xs font-bold"
                        style={{ color: active ? '#ffffff' : '#374151' }}
                      >
                        {labels[v]}
                      </Text>
                    </Pressable>
                  );
                })}
              </ScrollView>

              {hasFilters && (
                <Pressable
                  onPress={() => {
                    setDateFilter('all');
                    setSearch('');
                  }}
                  className="mt-3 flex-row items-center gap-1"
                >
                  <X size={11} color="#dc2626" />
                  <Text className="text-xs text-rose-600 font-bold">Clear all filters</Text>
                </Pressable>
              )}
            </View>

            {hasFilters && (
              <View className="rounded-xl bg-orange-50 border border-orange-200 p-2.5 mt-2 flex-row items-center justify-between">
                <Text className="text-xs font-bold text-orange-900">
                  {filtered.length} returns filtered
                </Text>
                <Text className="text-sm font-extrabold text-orange-700">
                  {formatPKRFull(filteredTotal)}
                </Text>
              </View>
            )}
          </View>
        )}

        {/* Returns List */}
        <View className="px-5">
          {filtered.length === 0 ? (
            <View className="rounded-2xl bg-white dark:bg-neutral-900 border border-neutral-200 dark:border-neutral-800 items-center py-12">
              <View className="h-16 w-16 rounded-3xl bg-orange-100 dark:bg-orange-950/40 items-center justify-center">
                <RotateCcw size={32} color="#f97316" />
              </View>
              <Text className="mt-3 text-base font-bold text-neutral-700 dark:text-neutral-300">
                {hasFilters ? 'No returns match filters' : 'No returns yet'}
              </Text>
              <Text className="mt-1 text-xs text-neutral-500 text-center px-8">
                {hasFilters
                  ? 'Try different filter or search'
                  : 'Sale ki receipt se return process karein'}
              </Text>
              {!hasFilters && (
                <Pressable
                  onPress={() => router.push('/returns/new')}
                  className="mt-4 h-10 px-5 rounded-xl flex-row items-center gap-1.5"
                  style={{ backgroundColor: '#f97316' }}
                >
                  <Plus size={16} color="#ffffff" />
                  <Text className="text-white font-bold text-sm">Process Return</Text>
                </Pressable>
              )}
            </View>
          ) : (
            <View className="gap-2.5">
              {filtered.map((r) => {
                const PayIcon = paymentIcons[r.refundMethod] || CreditCard;
                const payColor = paymentColors[r.refundMethod] || '#6b7280';
                const cutPiecesCount = r.createdCutPieces?.length ?? 0;

                return (
                  <Pressable
                    key={r.id}
                    onPress={() => {
                      Haptics.selectionAsync();
                      router.push(`/returns/${r.id}` as any);
                    }}
                    className="rounded-2xl bg-white dark:bg-neutral-900 border-2 border-neutral-200 dark:border-neutral-800 p-3.5 active:opacity-70"
                  >
                    <View className="flex-row items-start gap-3">
                      <View
                        className="h-12 w-12 rounded-2xl items-center justify-center shrink-0"
                        style={{ backgroundColor: '#ffedd5' }}
                      >
                        <RotateCcw size={20} color="#f97316" />
                      </View>
                      <View className="flex-1 min-w-0">
                        <View className="flex-row items-center gap-1.5 flex-wrap">
                          <Text className="font-mono text-sm font-extrabold text-neutral-900 dark:text-white">
                            {r.returnNumber}
                          </Text>
                          {cutPiecesCount > 0 && (
                            <View className="flex-row items-center gap-0.5 px-1.5 py-0.5 rounded bg-emerald-100">
                              <Scissors size={9} color="#15803d" />
                              <Text className="text-[9px] font-extrabold text-emerald-700">
                                {cutPiecesCount} PIECE{cutPiecesCount !== 1 ? 'S' : ''}
                              </Text>
                            </View>
                          )}
                        </View>
                        <View className="flex-row items-center gap-1 mt-1">
                          <Receipt size={10} color="#737373" />
                          <Text className="text-xs text-neutral-500">
                            From: <Text className="font-bold font-mono">{r.sale.saleNumber}</Text>
                          </Text>
                        </View>
                        {r.sale.customer && (
                          <View className="flex-row items-center gap-1 mt-0.5">
                            <User size={10} color="#8b5cf6" />
                            <Text className="text-[11px] text-neutral-600 font-bold" numberOfLines={1}>
                              {r.sale.customer.name}
                            </Text>
                            {r.sale.customer.phone && (
                              <>
                                <Text className="text-[10px] text-neutral-400">•</Text>
                                <Text className="text-[10px] text-neutral-500">
                                  {r.sale.customer.phone}
                                </Text>
                              </>
                            )}
                          </View>
                        )}
                        <View className="flex-row items-center gap-2 mt-1 flex-wrap">
                          <View className="flex-row items-center gap-1">
                            <CalendarClock size={10} color="#9ca3af" />
                            <Text className="text-[10px] text-neutral-500">
                              {formatShortDate(r.returnedAt)}
                            </Text>
                          </View>
                          <View className="flex-row items-center gap-1">
                            <Package size={10} color="#9ca3af" />
                            <Text className="text-[10px] text-neutral-500">
                              {r.items.length} item{r.items.length !== 1 ? 's' : ''}
                            </Text>
                          </View>
                        </View>
                      </View>

                      <View className="items-end shrink-0">
                        <Text className="text-base font-extrabold text-rose-700">
                          -{formatPKRFull(r.refundAmount)}
                        </Text>
                        <View
                          className="flex-row items-center gap-1 mt-1 px-2 py-0.5 rounded-md"
                          style={{ backgroundColor: `${payColor}20` }}
                        >
                          <PayIcon size={9} color={payColor} />
                          <Text
                            className="text-[9px] font-extrabold"
                            style={{ color: payColor }}
                          >
                            {r.refundMethod}
                          </Text>
                        </View>
                        <ChevronRight size={14} color="#9ca3af" style={{ marginTop: 4 }} />
                      </View>
                    </View>

                    {/* Items preview */}
                    {r.items && r.items.length > 0 && (
                      <View className="mt-2.5 pt-2.5 border-t border-neutral-100 dark:border-neutral-800 gap-1">
                        {r.items.slice(0, 2).map((item) => (
                          <View key={item.id} className="flex-row items-center gap-1.5">
                            <Package size={10} color="#9ca3af" />
                            <Text className="text-[11px] text-neutral-500 flex-1" numberOfLines={1}>
                              {item.product.name}
                            </Text>
                            <Text className="text-[11px] font-bold text-neutral-700">
                              {item.quantity} {item.product.unit} × {formatPKRFull(item.refundPrice)}
                            </Text>
                          </View>
                        ))}
                        {r.items.length > 2 && (
                          <Text className="text-[10px] text-neutral-500">
                            + {r.items.length - 2} more items
                          </Text>
                        )}
                      </View>
                    )}

                    {/* Reason */}
                    {r.reason && (
                      <View className="mt-2 px-2 py-1.5 rounded-lg bg-orange-50 flex-row items-center gap-1.5">
                        <View className="h-1 w-1 rounded-full bg-orange-500" />
                        <Text className="text-[10px] text-orange-800 flex-1">
                          <Text className="font-bold">Reason:</Text> {r.reason}
                        </Text>
                      </View>
                    )}

                    {/* Cut pieces indicator */}
                    {cutPiecesCount > 0 && (
                      <View className="mt-2 px-2 py-1.5 rounded-lg bg-emerald-50 border border-emerald-200 flex-row items-center gap-1.5">
                        <Scissors size={11} color="#15803d" />
                        <Text className="text-[10px] text-emerald-900 flex-1">
                          <Text className="font-extrabold">{cutPiecesCount} cut piece{cutPiecesCount !== 1 ? 's' : ''}</Text> created in inventory
                        </Text>
                      </View>
                    )}
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
