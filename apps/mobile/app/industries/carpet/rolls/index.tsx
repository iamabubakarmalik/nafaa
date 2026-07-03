import { useState, useMemo } from 'react';
import {
  View, Text, ScrollView, Pressable, TextInput, RefreshControl,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { useRouter, Stack } from 'expo-router';
import { useQuery } from '@tanstack/react-query';
import * as Haptics from 'expo-haptics';
import {
  ArrowLeft, Layers, Search, X, Plus, Package, AlertTriangle, Upload,
  Ruler, DollarSign, Sparkles, ChevronRight, TrendingUp,
  CheckCircle2, XCircle, RefreshCw, Filter, Boxes,
} from 'lucide-react-native';
import { carpetRollsApi, type CarpetRollStatus } from '@/api/carpet-rolls.api';
import { carpetReportsApi } from '@/api/carpet-reports.api';
import { formatPKRFull } from '@/lib/format';
import { useSmartBack } from '@/hooks/useSmartBack';

const statusConfig: Record<CarpetRollStatus, { label: string; color: string; bg: string }> = {
  ACTIVE:      { label: 'Active',      color: '#16a34a', bg: '#dcfce7' },
  FINISHED:    { label: 'Finished',    color: '#64748b', bg: '#f1f5f9' },
  DAMAGED:     { label: 'Damaged',     color: '#dc2626', bg: '#fee2e2' },
  RESERVED:    { label: 'Reserved',    color: '#f59e0b', bg: '#fef3c7' },
  TRANSFERRED: { label: 'Transferred', color: '#8b5cf6', bg: '#ede9fe' },
};

type StatusFilter = 'all' | CarpetRollStatus;

export default function CarpetRollsListScreen() {
  const router = useRouter();
  const goBack = useSmartBack();
  const [search, setSearch] = useState('');
  const [statusFilter, setStatusFilter] = useState<StatusFilter>('all');
  const [refreshing, setRefreshing] = useState(false);

  const { data: overview } = useQuery({
    queryKey: ['carpet-overview'],
    queryFn: () => carpetReportsApi.overview(),
  });

  const { data: rollsData, refetch } = useQuery({
    queryKey: ['carpet-rolls', statusFilter],
    queryFn: () =>
      carpetRollsApi.list({
        status: statusFilter === 'all' ? undefined : statusFilter,
        limit: 200,
      }),
  });

  const rolls = rollsData?.items ?? [];

  const onRefresh = async () => {
    setRefreshing(true);
    await refetch();
    setRefreshing(false);
  };

  const filtered = useMemo(() => {
    if (!search.trim()) return rolls;
    const q = search.toLowerCase().trim();
    return rolls.filter(
      (r) =>
        r.rollNumber.toLowerCase().includes(q) ||
        r.designCode?.toLowerCase().includes(q) ||
        r.product?.name.toLowerCase().includes(q) ||
        r.variant?.name?.toLowerCase().includes(q),
    );
  }, [rolls, search]);

  return (
    <SafeAreaView className="flex-1 bg-neutral-50 dark:bg-neutral-950" edges={['top']}>
      <Stack.Screen options={{ headerShown: false }} />

      {/* Header */}
      <View className="px-5 pt-4 pb-3 flex-row items-center gap-3">
        <Pressable
          onPress={goBack}
          hitSlop={12}
          className="h-10 w-10 rounded-2xl bg-white items-center justify-center border border-neutral-200"
        >
          <ArrowLeft size={20} color="#16a34a" />
        </Pressable>
        <View className="flex-1">
          <Text className="text-2xl font-extrabold text-neutral-900 dark:text-white">
            Carpet Rolls
          </Text>
          <Text className="text-xs text-neutral-500 mt-0.5">
            {overview?.activeRollCount ?? 0} active • {overview?.grandTotalSqft.toFixed(0) ?? 0} sqft
          </Text>
        </View>
        <Pressable
          onPress={() => router.push('/industries/carpet/rolls/bulk-import' as any)}
          className="h-11 px-3 rounded-2xl bg-blue-600 flex-row items-center gap-1.5 active:opacity-80"
          style={{ shadowColor: '#2563eb', shadowOpacity: 0.3, shadowRadius: 8, elevation: 4 }}
        >
          <Upload size={14} color="#ffffff" />
          <Text className="text-white font-bold text-xs">Bulk</Text>
        </Pressable>
      </View>

      <ScrollView
        contentContainerStyle={{ paddingBottom: 40 }}
        refreshControl={
          <RefreshControl refreshing={refreshing} onRefresh={onRefresh} tintColor="#16a34a" />
        }
        showsVerticalScrollIndicator={false}
      >
        {/* Hero */}
        <View className="mx-5 rounded-3xl p-5 mb-4" style={{ backgroundColor: '#16a34a' }}>
          <View className="flex-row items-center gap-2 mb-1">
            <Sparkles size={12} color="rgba(255,255,255,0.8)" />
            <Text className="text-[10px] uppercase tracking-wider text-white/80 font-extrabold">
              Total Stock (sqft)
            </Text>
          </View>
          <Text className="text-white text-4xl font-extrabold">
            {(overview?.grandTotalSqft ?? 0).toFixed(0)}
          </Text>
          <View className="mt-3 pt-3 border-t border-white/20 flex-row justify-between">
            <View>
              <Text className="text-[10px] font-extrabold uppercase text-white/70">
                Rolls
              </Text>
              <Text className="text-white text-lg font-extrabold mt-0.5">
                {overview?.activeRollCount ?? 0}
              </Text>
            </View>
            <View>
              <Text className="text-[10px] font-extrabold uppercase text-white/70">
                Cut Pieces
              </Text>
              <Text className="text-white text-lg font-extrabold mt-0.5">
                {overview?.cutPieceAvailableCount ?? 0}
              </Text>
            </View>
            <View>
              <Text className="text-[10px] font-extrabold uppercase text-white/70">
                Value
              </Text>
              <Text className="text-white text-sm font-extrabold mt-0.5">
                {formatPKRFull(overview?.totalStockCost ?? 0)}
              </Text>
            </View>
          </View>
        </View>

        {/* Stats grid */}
        <View className="px-5 mb-4">
          <View className="flex-row flex-wrap -mx-1.5">
            <View className="w-1/2 px-1.5 mb-3">
              <View className="rounded-2xl bg-white border border-neutral-200 p-3.5">
                <View className="h-10 w-10 rounded-xl bg-emerald-100 items-center justify-center">
                  <TrendingUp size={18} color="#16a34a" />
                </View>
                <Text className="mt-2 text-[10px] font-extrabold uppercase text-neutral-500 tracking-wider">
                  Sale Value
                </Text>
                <Text className="text-lg font-extrabold text-emerald-700 mt-0.5" numberOfLines={1}>
                  {formatPKRFull(overview?.totalStockSaleValue ?? 0)}
                </Text>
              </View>
            </View>
            <View className="w-1/2 px-1.5 mb-3">
              <View className="rounded-2xl bg-white border border-neutral-200 p-3.5">
                <View className="h-10 w-10 rounded-xl bg-violet-100 items-center justify-center">
                  <Sparkles size={18} color="#8b5cf6" />
                </View>
                <Text className="mt-2 text-[10px] font-extrabold uppercase text-neutral-500 tracking-wider">
                  Potential Profit
                </Text>
                <Text className="text-lg font-extrabold text-violet-700 mt-0.5" numberOfLines={1}>
                  {formatPKRFull(overview?.potentialProfit ?? 0)}
                </Text>
              </View>
            </View>
          </View>
        </View>

        {/* Filter chips */}
        <ScrollView
          horizontal
          showsHorizontalScrollIndicator={false}
          contentContainerStyle={{ paddingHorizontal: 20, gap: 8 }}
          className="mb-3"
        >
          {[
            { key: 'all' as StatusFilter, label: 'All', count: rolls.length },
            { key: 'ACTIVE' as StatusFilter, label: 'Active', count: overview?.activeRollCount ?? 0 },
            { key: 'FINISHED' as StatusFilter, label: 'Finished', count: overview?.finishedRollCount ?? 0 },
            { key: 'DAMAGED' as StatusFilter, label: 'Damaged', count: overview?.damagedRollCount ?? 0 },
          ].map((f) => {
            const active = statusFilter === f.key;
            return (
              <Pressable
                key={f.key}
                onPress={() => {
                  Haptics.selectionAsync();
                  setStatusFilter(f.key);
                }}
                className="h-9 px-3 rounded-xl border-2 flex-row items-center gap-1.5"
                style={{
                  backgroundColor: active ? '#16a34a' : '#ffffff',
                  borderColor: active ? '#16a34a' : '#e5e7eb',
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

        {/* Search */}
        <View className="px-5 mb-3">
          <View className="flex-row items-center gap-2 rounded-2xl border border-neutral-200 bg-white px-4 h-12">
            <Search size={18} color="#9ca3af" />
            <TextInput
              placeholder="Search roll #, design, product..."
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

        {/* List */}
        <View className="px-5">
          {filtered.length === 0 ? (
            <View className="items-center py-16">
              <View className="h-20 w-20 rounded-3xl bg-emerald-100 items-center justify-center">
                <Layers size={36} color="#16a34a" />
              </View>
              <Text className="mt-4 text-base font-bold text-neutral-900">
                {search || statusFilter !== 'all' ? 'No rolls match' : 'No carpet rolls yet'}
              </Text>
              <Text className="text-xs text-neutral-500 mt-1">
                {search || statusFilter !== 'all' ? 'Try different filter' : 'Add rolls to start selling'}
              </Text>
            </View>
          ) : (
            <View className="gap-2">
              {filtered.map((roll) => {
                const cfg = statusConfig[roll.status];
                const usagePercent = roll.originalSqft > 0
                  ? ((roll.originalSqft - roll.remainingSqft) / roll.originalSqft) * 100
                  : 0;
                const isLow = roll.status === 'ACTIVE' && roll.remainingLengthFt < 10;

                return (
                  <Pressable
                    key={roll.id}
                    onPress={() => {
                      Haptics.selectionAsync();
                      router.push(`/industries/carpet/rolls/${roll.id}` as any);
                    }}
                    className="rounded-2xl bg-white border-2 p-3 active:opacity-70"
                    style={{ borderColor: isLow ? '#fcd34d' : '#e5e7eb' }}
                  >
                    <View className="flex-row items-start gap-3">
                      <View
                        className="h-14 w-14 rounded-2xl items-center justify-center shrink-0 relative"
                        style={{
                          backgroundColor: roll.variant?.colorHex || cfg.bg,
                        }}
                      >
                        {!roll.variant?.colorHex && <Layers size={24} color={cfg.color} />}
                        {isLow && (
                          <View
                            className="absolute -top-1 -right-1 h-5 w-5 rounded-full items-center justify-center"
                            style={{ backgroundColor: '#f59e0b' }}
                          >
                            <AlertTriangle size={10} color="#ffffff" />
                          </View>
                        )}
                      </View>

                      <View className="flex-1 min-w-0">
                        <View className="flex-row items-center gap-1.5 flex-wrap">
                          <Text className="font-extrabold font-mono text-sm text-neutral-900">
                            {roll.rollNumber}
                          </Text>
                          <View
                            className="px-1.5 py-0.5 rounded"
                            style={{ backgroundColor: cfg.bg }}
                          >
                            <Text
                              className="text-[9px] font-extrabold uppercase"
                              style={{ color: cfg.color }}
                            >
                              {cfg.label}
                            </Text>
                          </View>
                          {roll.designCode && (
                            <View className="px-1.5 py-0.5 rounded bg-slate-100">
                              <Text className="text-[9px] font-extrabold text-slate-700">
                                {roll.designCode}
                              </Text>
                            </View>
                          )}
                        </View>
                        <Text className="text-xs text-neutral-700 font-bold mt-1" numberOfLines={1}>
                          {roll.product?.name}
                          {roll.variant?.name && ` • ${roll.variant.name}`}
                        </Text>
                        <View className="flex-row items-center gap-3 mt-1">
                          <View className="flex-row items-center gap-1">
                            <Ruler size={10} color="#64748b" />
                            <Text className="text-[10px] text-neutral-500">
                              W: {roll.widthFt}ft
                            </Text>
                          </View>
                          <Text className="text-[10px] text-emerald-700 font-extrabold">
                            {roll.remainingLengthFt.toFixed(1)}ft / {roll.originalLengthFt}ft
                          </Text>
                        </View>
                        <View className="mt-1 bg-neutral-100 rounded-full h-1.5 overflow-hidden">
                          <View
                            className="h-full rounded-full"
                            style={{
                              width: `${100 - usagePercent}%`,
                              backgroundColor: isLow ? '#f59e0b' : '#16a34a',
                            }}
                          />
                        </View>
                      </View>

                      <View className="items-end">
                        <Text className="text-lg font-extrabold text-emerald-700">
                          {roll.remainingSqft.toFixed(0)}
                        </Text>
                        <Text className="text-[9px] font-bold text-neutral-500 uppercase">sqft</Text>
                        <Text className="text-[10px] font-extrabold text-neutral-700 mt-1">
                          {formatPKRFull(roll.salePricePerSqft)}/sqft
                        </Text>
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
