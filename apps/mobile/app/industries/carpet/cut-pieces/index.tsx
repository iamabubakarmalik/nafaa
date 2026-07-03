import { useState, useMemo } from 'react';
import {
  View, Text, ScrollView, Pressable, TextInput, RefreshControl,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { useRouter, Stack, useLocalSearchParams } from 'expo-router';
import { useQuery } from '@tanstack/react-query';
import * as Haptics from 'expo-haptics';
import {
  ArrowLeft, Scissors, Search, X, Package, Ruler,
  DollarSign, CheckCircle2, AlertTriangle, XCircle,
  Sparkles, Layers,
} from 'lucide-react-native';
import { carpetCutPiecesApi, type CarpetCutPieceStatus } from '@/api/carpet-cut-pieces.api';
import { carpetReportsApi } from '@/api/carpet-reports.api';
import { formatPKRFull } from '@/lib/format';
import { useSmartBack } from '@/hooks/useSmartBack';

const statusConfig: Record<CarpetCutPieceStatus, { label: string; color: string; bg: string }> = {
  AVAILABLE: { label: 'Available', color: '#16a34a', bg: '#dcfce7' },
  SOLD:      { label: 'Sold',      color: '#8b5cf6', bg: '#ede9fe' },
  DAMAGED:   { label: 'Damaged',   color: '#dc2626', bg: '#fee2e2' },
  RESERVED:  { label: 'Reserved',  color: '#f59e0b', bg: '#fef3c7' },
};

type StatusFilter = 'all' | CarpetCutPieceStatus;

export default function CutPiecesListScreen() {
  const router = useRouter();
  const goBack = useSmartBack();
  const { sourceRollId } = useLocalSearchParams<{ sourceRollId?: string }>();
  const [search, setSearch] = useState('');
  const [statusFilter, setStatusFilter] = useState<StatusFilter>('all');
  const [refreshing, setRefreshing] = useState(false);

  const { data: report } = useQuery({
    queryKey: ['cut-pieces-report'],
    queryFn: () => carpetReportsApi.cutPiecesReport(),
  });

  const { data: piecesData, refetch } = useQuery({
    queryKey: ['carpet-cut-pieces', statusFilter, sourceRollId],
    queryFn: () =>
      carpetCutPiecesApi.list({
        status: statusFilter === 'all' ? undefined : statusFilter,
        sourceRollId,
        limit: 200,
      }),
  });

  const pieces = piecesData?.items ?? [];

  const onRefresh = async () => {
    setRefreshing(true);
    await refetch();
    setRefreshing(false);
  };

  const filtered = useMemo(() => {
    if (!search.trim()) return pieces;
    const q = search.toLowerCase().trim();
    return pieces.filter(
      (p) =>
        p.pieceCode.toLowerCase().includes(q) ||
        p.product?.name.toLowerCase().includes(q) ||
        p.variant?.name?.toLowerCase().includes(q) ||
        (p.notes || '').toLowerCase().includes(q),
    );
  }, [pieces, search]);

  return (
    <SafeAreaView className="flex-1 bg-neutral-50 dark:bg-neutral-950" edges={['top']}>
      <Stack.Screen options={{ headerShown: false }} />

      {/* Header */}
      <View className="px-5 pt-4 pb-3 flex-row items-center gap-3">
        <Pressable
          onPress={() => router.canGoBack() ? goBack() : router.replace('/industries/carpet/rolls' as any)}
          hitSlop={12}
          className="h-10 w-10 rounded-2xl bg-white items-center justify-center border border-neutral-200"
        >
          <ArrowLeft size={20} color="#8b5cf6" />
        </Pressable>
        <View className="flex-1">
          <Text className="text-2xl font-extrabold text-neutral-900 dark:text-white">
            Cut Pieces
          </Text>
          <Text className="text-xs text-neutral-500 mt-0.5">
            {report?.availableCount ?? 0} available • {(report?.availableSqft ?? 0).toFixed(0)} sqft
          </Text>
        </View>
      </View>

      <ScrollView
        contentContainerStyle={{ paddingBottom: 40 }}
        refreshControl={
          <RefreshControl refreshing={refreshing} onRefresh={onRefresh} tintColor="#8b5cf6" />
        }
        showsVerticalScrollIndicator={false}
      >
        {/* Hero */}
        <View className="mx-5 rounded-3xl p-5 mb-4" style={{ backgroundColor: '#7c3aed' }}>
          <View className="flex-row items-center gap-2 mb-1">
            <Sparkles size={12} color="rgba(255,255,255,0.8)" />
            <Text className="text-[10px] uppercase tracking-wider text-white/80 font-extrabold">
              Available Value
            </Text>
          </View>
          <Text className="text-white text-3xl font-extrabold">
            {formatPKRFull(report?.availableValue ?? 0)}
          </Text>
          <View className="mt-3 pt-3 border-t border-white/20 flex-row justify-between">
            <View>
              <Text className="text-[10px] font-extrabold uppercase text-white/70">Cost</Text>
              <Text className="text-white text-sm font-extrabold mt-0.5">
                {formatPKRFull(report?.availableCost ?? 0)}
              </Text>
            </View>
            <View>
              <Text className="text-[10px] font-extrabold uppercase text-white/70">Potential Profit</Text>
              <Text className="text-white text-sm font-extrabold mt-0.5">
                {formatPKRFull(report?.potentialProfit ?? 0)}
              </Text>
            </View>
            <View>
              <Text className="text-[10px] font-extrabold uppercase text-white/70">Sold Revenue</Text>
              <Text className="text-white text-sm font-extrabold mt-0.5">
                {formatPKRFull(report?.soldRevenue ?? 0)}
              </Text>
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
            { key: 'all' as StatusFilter, label: 'All', count: pieces.length },
            { key: 'AVAILABLE' as StatusFilter, label: 'Available', count: report?.availableCount ?? 0, color: '#16a34a' },
            { key: 'SOLD' as StatusFilter, label: 'Sold', count: report?.soldCount ?? 0, color: '#8b5cf6' },
            { key: 'DAMAGED' as StatusFilter, label: 'Damaged', count: report?.damagedCount ?? 0, color: '#dc2626' },
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
                  backgroundColor: active ? (f.color || '#8b5cf6') : '#ffffff',
                  borderColor: active ? (f.color || '#8b5cf6') : '#e5e7eb',
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
              placeholder="Search piece code, product..."
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
              <View className="h-20 w-20 rounded-3xl bg-violet-100 items-center justify-center">
                <Scissors size={36} color="#8b5cf6" />
              </View>
              <Text className="mt-4 text-base font-bold text-neutral-900">
                {search || statusFilter !== 'all' ? 'No cut pieces match' : 'No cut pieces yet'}
              </Text>
              <Text className="text-xs text-neutral-500 mt-1 text-center">
                Cut pieces are created from carpet roll cuts (leftover after main cut).
              </Text>
            </View>
          ) : (
            <View className="gap-2">
              {filtered.map((piece) => {
                const cfg = statusConfig[piece.status];
                return (
                  <View
                    key={piece.id}
                    className="rounded-2xl bg-white border-2 border-neutral-200 p-3"
                  >
                    <View className="flex-row items-start gap-3">
                      <View
                        className="h-14 w-14 rounded-2xl items-center justify-center shrink-0"
                        style={{
                          backgroundColor: piece.variant?.colorHex || '#faf5ff',
                        }}
                      >
                        {!piece.variant?.colorHex && <Scissors size={24} color="#8b5cf6" />}
                      </View>

                      <View className="flex-1 min-w-0">
                        <View className="flex-row items-center gap-1.5 flex-wrap">
                          <Text className="font-extrabold font-mono text-sm text-neutral-900">
                            {piece.pieceCode}
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
                        </View>
                        <Text className="text-xs text-neutral-700 font-bold mt-1" numberOfLines={1}>
                          {piece.product?.name}
                          {piece.variant?.name && ` • ${piece.variant.name}`}
                        </Text>
                        <View className="flex-row items-center gap-3 mt-1">
                          <View className="flex-row items-center gap-1">
                            <Ruler size={10} color="#64748b" />
                            <Text className="text-[10px] text-neutral-500">
                              {piece.widthFt}ft × {piece.lengthFt}ft
                            </Text>
                          </View>
                          <Text className="text-[10px] font-extrabold text-emerald-700">
                            {piece.totalSqft.toFixed(2)} sqft
                          </Text>
                        </View>
                        {piece.sourceRoll && (
                          <View className="flex-row items-center gap-1 mt-1">
                            <Layers size={9} color="#16a34a" />
                            <Text className="text-[10px] text-emerald-600 font-bold">
                              From: {piece.sourceRoll.rollNumber}
                            </Text>
                          </View>
                        )}
                        {piece.rackNumber && (
                          <Text className="text-[10px] text-neutral-500 mt-0.5">
                            📦 Rack: {piece.rackNumber}
                          </Text>
                        )}
                      </View>

                      <View className="items-end">
                        <Text className="text-lg font-extrabold text-emerald-700">
                          {formatPKRFull(piece.salePrice)}
                        </Text>
                        {piece.pricePerSqft && (
                          <Text className="text-[10px] text-neutral-500 font-bold">
                            {formatPKRFull(piece.pricePerSqft)}/sqft
                          </Text>
                        )}
                      </View>
                    </View>
                  </View>
                );
              })}
            </View>
          )}
        </View>
      </ScrollView>
    </SafeAreaView>
  );
}
