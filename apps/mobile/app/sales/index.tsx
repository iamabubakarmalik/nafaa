import { useState, useMemo } from 'react';
import {
  View, Text, FlatList, Pressable, RefreshControl, ScrollView, TextInput,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { useRouter, Stack } from 'expo-router';
import { useQuery } from '@tanstack/react-query';
import * as Haptics from 'expo-haptics';
import {
  Search, Receipt, ArrowLeft, Calendar, ChevronRight, X,
  Filter, Banknote, CreditCard, Smartphone, Building2, Zap,
  BookOpen, TrendingUp, Sparkles,
} from 'lucide-react-native';
import { Card } from '@/components/ui/Card';
import { Badge } from '@/components/ui/Badge';
import { salesApi, type PaymentMethod } from '@/api/sales.api';
import { formatPKRFull, formatRelative, formatQty } from '@/lib/format';

const statusColors: Record<string, 'success' | 'warning' | 'danger' | 'info' | 'neutral'> = {
  COMPLETED: 'success',
  PARTIALLY_RETURNED: 'warning',
  FULLY_RETURNED: 'danger',
  VOIDED: 'danger',
};

const paymentConfig: Record<string, { label: string; icon: any; color: string }> = {
  CASH: { label: 'Cash', icon: Banknote, color: '#16a34a' },
  CARD: { label: 'Card', icon: CreditCard, color: '#2563eb' },
  JAZZCASH: { label: 'JazzCash', icon: Smartphone, color: '#f97316' },
  EASYPAISA: { label: 'EasyPaisa', icon: Zap, color: '#22c55e' },
  BANK_TRANSFER: { label: 'Bank', icon: Building2, color: '#8b5cf6' },
};

type DateFilter = 'all' | 'today' | 'week' | 'month';

export default function SalesScreen() {
  const router = useRouter();
  const [search, setSearch] = useState('');
  const [dateFilter, setDateFilter] = useState<DateFilter>('all');
  const [paymentFilter, setPaymentFilter] = useState<PaymentMethod | 'all'>('all');
  const [showFilters, setShowFilters] = useState(false);
  const [refreshing, setRefreshing] = useState(false);

  const { data, refetch } = useQuery({
    queryKey: ['sales', search],
    queryFn: () => salesApi.list({ search: search || undefined, limit: 100 }),
  });

  const { data: summary } = useQuery({
    queryKey: ['sales-summary'],
    queryFn: salesApi.summary,
  });

  const onRefresh = async () => {
    setRefreshing(true);
    await refetch();
    setRefreshing(false);
  };

  const filteredSales = useMemo(() => {
    let result = data?.items ?? [];

    if (dateFilter !== 'all') {
      const now = new Date();
      let cutoff = new Date();
      if (dateFilter === 'today') cutoff.setHours(0, 0, 0, 0);
      else if (dateFilter === 'week') cutoff.setDate(now.getDate() - 7);
      else if (dateFilter === 'month') cutoff.setMonth(now.getMonth() - 1);
      result = result.filter((s) => new Date(s.soldAt) >= cutoff);
    }

    if (paymentFilter !== 'all') {
      result = result.filter((s) => s.paymentMethod === paymentFilter);
    }

    return result;
  }, [data, dateFilter, paymentFilter]);

  const filteredTotal = filteredSales.reduce((sum, s) => sum + s.total, 0);
  const hasFilters = dateFilter !== 'all' || paymentFilter !== 'all';

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
          <Text className="text-2xl font-bold text-neutral-900 dark:text-white">Sales History</Text>
          <Text className="text-xs text-neutral-500 mt-0.5">
            {data?.meta?.total ?? 0} total sales
          </Text>
        </View>
      </View>

      {/* Stats cards */}
      <ScrollView
        horizontal
        showsHorizontalScrollIndicator={false}
        contentContainerStyle={{ paddingHorizontal: 20, gap: 8 }}
        className="mb-3"
      >
        <View className="rounded-2xl bg-white dark:bg-neutral-900 border border-neutral-200 dark:border-neutral-800 p-3" style={{ width: 140 }}>
          <Text className="text-[10px] uppercase tracking-wider text-neutral-500 font-bold">Today</Text>
          <Text className="text-base font-extrabold text-emerald-700 mt-1">
            {formatPKRFull(summary?.todaySales ?? 0)}
          </Text>
          <Text className="text-[10px] text-neutral-500 font-bold">
            {summary?.todayOrders ?? 0} orders
          </Text>
        </View>
        <View className="rounded-2xl bg-white dark:bg-neutral-900 border border-neutral-200 dark:border-neutral-800 p-3" style={{ width: 140 }}>
          <Text className="text-[10px] uppercase tracking-wider text-neutral-500 font-bold">Profit Today</Text>
          <Text className="text-base font-extrabold text-blue-700 mt-1">
            {formatPKRFull(summary?.todayProfit ?? 0)}
          </Text>
        </View>
        <View className="rounded-2xl bg-white dark:bg-neutral-900 border border-neutral-200 dark:border-neutral-800 p-3" style={{ width: 140 }}>
          <Text className="text-[10px] uppercase tracking-wider text-neutral-500 font-bold">This Month</Text>
          <Text className="text-base font-extrabold text-violet-700 mt-1">
            {formatPKRFull(summary?.monthSales ?? 0)}
          </Text>
        </View>
        <View className="rounded-2xl bg-white dark:bg-neutral-900 border border-neutral-200 dark:border-neutral-800 p-3" style={{ width: 140, marginRight: 20 }}>
          <Text className="text-[10px] uppercase tracking-wider text-neutral-500 font-bold">All Time</Text>
          <Text className="text-base font-extrabold text-amber-700 mt-1">
            {formatPKRFull(summary?.totalSales ?? 0)}
          </Text>
        </View>
      </ScrollView>

      {/* Search + Filter toggle */}
      <View className="px-5 pb-3 flex-row gap-2">
        <View className="flex-1 flex-row items-center gap-2 rounded-2xl border border-neutral-200 dark:border-neutral-800 bg-white dark:bg-neutral-900 px-4 h-12">
          <Search size={18} color="#9ca3af" />
          <TextInput
            placeholder="Search sale #..."
            placeholderTextColor="#9ca3af"
            value={search}
            onChangeText={setSearch}
            className="flex-1 text-sm text-neutral-900 dark:text-white"
          />
        </View>
        <Pressable
          onPress={() => {
            Haptics.selectionAsync();
            setShowFilters((v) => !v);
          }}
          className="h-12 px-4 rounded-2xl flex-row items-center gap-1.5 border-2 active:opacity-70"
          style={{
            backgroundColor: hasFilters || showFilters ? '#dcfce7' : '#ffffff',
            borderColor: hasFilters || showFilters ? '#16a34a' : '#e5e7eb',
          }}
        >
          <Filter size={16} color={hasFilters || showFilters ? '#16a34a' : '#6b7280'} />
          <Text
            className="font-bold text-sm"
            style={{ color: hasFilters || showFilters ? '#15803d' : '#374151' }}
          >
            Filter
          </Text>
          {hasFilters && (
            <View className="h-5 w-5 rounded-full bg-brand-600 items-center justify-center">
              <Text className="text-white text-[9px] font-extrabold">!</Text>
            </View>
          )}
        </Pressable>
      </View>

      {/* Filters panel */}
      {showFilters && (
        <View className="px-5 pb-3">
          <View className="rounded-2xl bg-white dark:bg-neutral-900 border border-neutral-200 dark:border-neutral-800 p-3 gap-3">
            <View>
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
                        backgroundColor: active ? '#16a34a' : '#f3f4f6',
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
            </View>

            <View>
              <Text className="text-[10px] uppercase tracking-wider font-bold text-neutral-500 mb-1.5">
                Payment Method
              </Text>
              <ScrollView horizontal showsHorizontalScrollIndicator={false} contentContainerStyle={{ gap: 6 }}>
                <Pressable
                  onPress={() => setPaymentFilter('all')}
                  className="px-3 h-8 rounded-lg items-center justify-center"
                  style={{ backgroundColor: paymentFilter === 'all' ? '#0f172a' : '#f3f4f6' }}
                >
                  <Text
                    className="text-xs font-bold"
                    style={{ color: paymentFilter === 'all' ? '#ffffff' : '#374151' }}
                  >
                    All
                  </Text>
                </Pressable>
                {(Object.keys(paymentConfig) as PaymentMethod[]).map((m) => {
                  const cfg = paymentConfig[m];
                  const active = paymentFilter === m;
                  const Icon = cfg.icon;
                  return (
                    <Pressable
                      key={m}
                      onPress={() => setPaymentFilter(m)}
                      className="px-3 h-8 rounded-lg flex-row items-center gap-1.5"
                      style={{ backgroundColor: active ? cfg.color : '#f3f4f6' }}
                    >
                      <Icon size={12} color={active ? '#ffffff' : cfg.color} />
                      <Text
                        className="text-xs font-bold"
                        style={{ color: active ? '#ffffff' : '#374151' }}
                      >
                        {cfg.label}
                      </Text>
                    </Pressable>
                  );
                })}
              </ScrollView>
            </View>

            {hasFilters && (
              <Pressable
                onPress={() => {
                  setDateFilter('all');
                  setPaymentFilter('all');
                }}
                className="flex-row items-center gap-1"
              >
                <X size={11} color="#dc2626" />
                <Text className="text-xs text-rose-600 font-bold">Clear all filters</Text>
              </Pressable>
            )}
          </View>

          {hasFilters && (
            <View className="rounded-xl bg-emerald-50 border border-emerald-200 p-2.5 mt-2 flex-row items-center justify-between">
              <Text className="text-xs font-bold text-emerald-900">
                {filteredSales.length} sales filtered
              </Text>
              <Text className="text-sm font-extrabold text-emerald-700">
                {formatPKRFull(filteredTotal)}
              </Text>
            </View>
          )}
        </View>
      )}

      {/* List */}
      <FlatList
        data={filteredSales}
        keyExtractor={(s) => s.id}
        contentContainerStyle={{ paddingHorizontal: 20, paddingBottom: 80 }}
        refreshControl={<RefreshControl refreshing={refreshing} onRefresh={onRefresh} tintColor="#16a34a" />}
        ListEmptyComponent={
          <View className="items-center py-20">
            <Receipt size={48} color="#d1d5db" />
            <Text className="mt-4 text-base font-semibold text-neutral-700 dark:text-neutral-300">
              {hasFilters ? 'No sales match filters' : 'No sales yet'}
            </Text>
          </View>
        }
        ItemSeparatorComponent={() => <View className="h-2.5" />}
        renderItem={({ item }) => {
          const PayIcon = paymentConfig[item.paymentMethod]?.icon || CreditCard;
          const payColor = paymentConfig[item.paymentMethod]?.color || '#64748b';
          const isVoided = item.status === 'VOIDED';

          return (
            <Pressable
              onPress={() => {
                Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
                router.push(`/sales/${item.id}`);
              }}
              className="active:opacity-70"
              style={{ opacity: isVoided ? 0.5 : 1 }}
            >
              <Card variant="outline" className="p-3">
                <View className="flex-row items-center gap-3">
                  <View
                    className="h-12 w-12 rounded-2xl items-center justify-center"
                    style={{ backgroundColor: `${payColor}20` }}
                  >
                    <PayIcon size={20} color={payColor} />
                  </View>

                  <View className="flex-1 min-w-0">
                    <View className="flex-row items-center gap-1.5">
                      <Text
                        className="font-extrabold text-neutral-900 dark:text-white font-mono text-sm"
                        numberOfLines={1}
                      >
                        {item.saleNumber}
                      </Text>
                      <Badge variant={statusColors[item.status] || 'neutral'} size="sm">
                        {item.status}
                      </Badge>
                      {item.creditAmount > 0 && (
                        <Badge variant="warning" size="sm">
                          UDHAAR
                        </Badge>
                      )}
                    </View>
                    <Text className="text-xs text-neutral-500 mt-0.5" numberOfLines={1}>
                      {item.customer?.name || 'Walk-in'} • {formatRelative(item.soldAt)}
                    </Text>
                    <Text className="text-[11px] text-neutral-400 mt-0.5" numberOfLines={1}>
                      {item.items.length} item{item.items.length !== 1 ? 's' : ''} •{' '}
                      {item.items
                        .slice(0, 2)
                        .map((it) => it.product.name)
                        .join(', ')}
                      {item.items.length > 2 && ` +${item.items.length - 2}`}
                    </Text>
                  </View>

                  <View className="items-end">
                    <Text
                      className="font-extrabold text-base"
                      style={{
                        color: isVoided ? '#9ca3af' : '#16a34a',
                        textDecorationLine: isVoided ? 'line-through' : 'none',
                      }}
                    >
                      {formatPKRFull(item.total)}
                    </Text>
                    {item.creditAmount > 0 && !isVoided && (
                      <Text className="text-[10px] text-amber-600 font-bold mt-0.5">
                        Udhaar: {formatPKRFull(item.creditAmount)}
                      </Text>
                    )}
                  </View>
                  <ChevronRight size={18} color="#9ca3af" />
                </View>
              </Card>
            </Pressable>
          );
        }}
      />
    </SafeAreaView>
  );
}
