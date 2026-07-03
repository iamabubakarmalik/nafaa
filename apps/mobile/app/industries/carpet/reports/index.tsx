import { useState } from 'react';
import {
  View, Text, ScrollView, Pressable, RefreshControl,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { useRouter, Stack } from 'expo-router';
import { useQuery } from '@tanstack/react-query';
import * as Haptics from 'expo-haptics';
import {
  ArrowLeft, BarChart3, TrendingUp, TrendingDown, Layers, Scissors, CheckCircle2,
  DollarSign, Package, Sparkles, Award, Clock, AlertTriangle,
  Calendar, Zap, ChevronRight, Boxes,
} from 'lucide-react-native';
import { carpetReportsApi } from '@/api/carpet-reports.api';
import { formatPKRFull } from '@/lib/format';
import { useSmartBack } from '@/hooks/useSmartBack';

const formatDate = (v: string) =>
  new Intl.DateTimeFormat('en-PK', { month: 'short', day: 'numeric' }).format(new Date(v));

type Tab = 'overview' | 'profit' | 'slow' | 'today' | 'designs';

export default function CarpetReportsScreen() {
  const router = useRouter();
  const goBack = useSmartBack();
  const [tab, setTab] = useState<Tab>('overview');
  const [days, setDays] = useState(30);
  const [refreshing, setRefreshing] = useState(false);

  const { data: overview, refetch: refetchOverview } = useQuery({
    queryKey: ['carpet-overview'],
    queryFn: () => carpetReportsApi.overview(),
  });

  const { data: rollProfit = [], refetch: refetchProfit } = useQuery({
    queryKey: ['carpet-roll-profit'],
    queryFn: () => carpetReportsApi.rollProfit(),
    enabled: tab === 'profit',
  });

  const { data: slowMoving = [], refetch: refetchSlow } = useQuery({
    queryKey: ['carpet-slow-moving', days],
    queryFn: () => carpetReportsApi.slowMoving(days),
    enabled: tab === 'slow',
  });

  const { data: todaysCuts, refetch: refetchToday } = useQuery({
    queryKey: ['carpet-todays-cuts'],
    queryFn: () => carpetReportsApi.todaysCuts(),
    enabled: tab === 'today',
  });

  const { data: topDesigns = [], refetch: refetchDesigns } = useQuery({
    queryKey: ['carpet-top-designs', days],
    queryFn: () => carpetReportsApi.topDesigns(days),
    enabled: tab === 'designs',
  });

  const onRefresh = async () => {
    setRefreshing(true);
    await Promise.all([
      refetchOverview(),
      tab === 'profit' && refetchProfit(),
      tab === 'slow' && refetchSlow(),
      tab === 'today' && refetchToday(),
      tab === 'designs' && refetchDesigns(),
    ].filter(Boolean));
    setRefreshing(false);
  };

  return (
    <SafeAreaView className="flex-1 bg-neutral-50 dark:bg-neutral-950" edges={['top']}>
      <Stack.Screen options={{ headerShown: false }} />

      {/* Header */}
      <View className="px-5 pt-4 pb-3 flex-row items-center gap-3">
        <Pressable
          onPress={() => router.canGoBack() ? goBack() : router.replace('/(tabs)/more' as any)}
          hitSlop={12}
          className="h-10 w-10 rounded-2xl bg-white items-center justify-center border border-neutral-200"
        >
          <ArrowLeft size={20} color="#16a34a" />
        </Pressable>
        <View className="flex-1">
          <Text className="text-2xl font-extrabold text-neutral-900 dark:text-white">
            Carpet Reports
          </Text>
          <Text className="text-xs text-neutral-500 mt-0.5">
            Industry analytics
          </Text>
        </View>
      </View>

      {/* Tabs */}
      <ScrollView
        horizontal
        showsHorizontalScrollIndicator={false}
        contentContainerStyle={{ paddingHorizontal: 20, gap: 8 }}
        className="mb-3"
      >
        {[
          { key: 'overview' as Tab, label: 'Overview', icon: BarChart3 },
          { key: 'profit' as Tab, label: 'Roll Profit', icon: TrendingUp },
          { key: 'today' as Tab, label: "Today's Cuts", icon: Scissors },
          { key: 'designs' as Tab, label: 'Top Designs', icon: Award },
          { key: 'slow' as Tab, label: 'Slow Moving', icon: Clock },
        ].map((t) => {
          const Icon = t.icon;
          const active = tab === t.key;
          return (
            <Pressable
              key={t.key}
              onPress={() => {
                Haptics.selectionAsync();
                setTab(t.key);
              }}
              className="h-9 px-3 rounded-xl border-2 flex-row items-center gap-1.5"
              style={{
                backgroundColor: active ? '#16a34a' : '#ffffff',
                borderColor: active ? '#16a34a' : '#e5e7eb',
              }}
            >
              <Icon size={13} color={active ? '#ffffff' : '#16a34a'} />
              <Text
                className="text-xs font-bold"
                style={{ color: active ? '#ffffff' : '#374151' }}
              >
                {t.label}
              </Text>
            </Pressable>
          );
        })}
      </ScrollView>

      <ScrollView
        contentContainerStyle={{ padding: 20, paddingTop: 0, paddingBottom: 40 }}
        refreshControl={
          <RefreshControl refreshing={refreshing} onRefresh={onRefresh} tintColor="#16a34a" />
        }
        showsVerticalScrollIndicator={false}
      >
        {/* ─── OVERVIEW TAB ─── */}
        {tab === 'overview' && overview && (
          <View className="gap-3">
            {/* Hero */}
            <View className="rounded-3xl p-5" style={{ backgroundColor: '#16a34a' }}>
              <Text className="text-[10px] uppercase tracking-wider text-white/80 font-extrabold">
                Grand Total Stock
              </Text>
              <Text className="text-white text-4xl font-extrabold mt-1">
                {overview.grandTotalSqft.toFixed(0)} sqft
              </Text>
              <View className="mt-3 pt-3 border-t border-white/20 flex-row justify-between">
                <View>
                  <Text className="text-[10px] font-extrabold uppercase text-white/70">Rolls</Text>
                  <Text className="text-white text-lg font-extrabold mt-0.5">
                    {overview.totalSqftAvailable.toFixed(0)} sqft
                  </Text>
                </View>
                <View>
                  <Text className="text-[10px] font-extrabold uppercase text-white/70">Cut Pieces</Text>
                  <Text className="text-white text-lg font-extrabold mt-0.5">
                    {overview.cutPiecesSqft.toFixed(0)} sqft
                  </Text>
                </View>
              </View>
            </View>

            {/* Financials */}
            <View className="rounded-2xl bg-white border border-neutral-200 p-4">
              <Text className="text-[10px] uppercase font-extrabold text-neutral-500 tracking-wider mb-3">
                Financial Overview
              </Text>
              <View className="gap-2">
                <View className="flex-row justify-between p-2 rounded-lg bg-blue-50">
                  <Text className="text-sm text-blue-700 font-bold">Stock Cost</Text>
                  <Text className="text-sm font-extrabold text-blue-900">
                    {formatPKRFull(overview.totalStockCost)}
                  </Text>
                </View>
                <View className="flex-row justify-between p-2 rounded-lg bg-emerald-50">
                  <Text className="text-sm text-emerald-700 font-bold">Sale Value</Text>
                  <Text className="text-sm font-extrabold text-emerald-900">
                    {formatPKRFull(overview.totalStockSaleValue)}
                  </Text>
                </View>
                <View className="flex-row justify-between p-2 rounded-lg bg-violet-50">
                  <Text className="text-sm text-violet-700 font-bold">Potential Profit</Text>
                  <Text className="text-sm font-extrabold text-violet-900">
                    {formatPKRFull(overview.potentialProfit)}
                  </Text>
                </View>
              </View>
            </View>

            {/* Counts breakdown */}
            <View className="flex-row flex-wrap -mx-1.5">
              {[
                { label: 'Active Rolls', value: overview.activeRollCount, color: '#16a34a', bg: '#dcfce7' },
                { label: 'Finished', value: overview.finishedRollCount, color: '#64748b', bg: '#f1f5f9' },
                { label: 'Damaged', value: overview.damagedRollCount, color: '#dc2626', bg: '#fee2e2' },
                { label: 'Cut Pieces (Available)', value: overview.cutPieceAvailableCount, color: '#8b5cf6', bg: '#ede9fe' },
                { label: 'Cut Pieces (Sold)', value: overview.cutPieceSoldCount, color: '#7c3aed', bg: '#f3e8ff' },
              ].map((s) => (
                <View key={s.label} className="w-1/2 px-1.5 mb-3">
                  <View className="rounded-2xl border-2 p-3" style={{ backgroundColor: s.bg, borderColor: s.color }}>
                    <Text className="text-[10px] uppercase font-extrabold" style={{ color: s.color }}>
                      {s.label}
                    </Text>
                    <Text className="text-2xl font-extrabold mt-1" style={{ color: s.color }}>
                      {s.value}
                    </Text>
                  </View>
                </View>
              ))}
            </View>

            {/* Quick actions */}
            <Pressable
              onPress={() => router.push('/industries/carpet/rolls' as any)}
              className="rounded-2xl bg-white border-2 border-emerald-200 p-4 flex-row items-center gap-3"
            >
              <View className="h-11 w-11 rounded-2xl bg-emerald-100 items-center justify-center">
                <Layers size={20} color="#16a34a" />
              </View>
              <View className="flex-1">
                <Text className="font-extrabold text-neutral-900">All Carpet Rolls</Text>
                <Text className="text-xs text-neutral-500 mt-0.5">Manage inventory</Text>
              </View>
              <ChevronRight size={18} color="#9ca3af" />
            </Pressable>
            <Pressable
              onPress={() => router.push('/industries/carpet/cut-pieces' as any)}
              className="rounded-2xl bg-white border-2 border-violet-200 p-4 flex-row items-center gap-3"
            >
              <View className="h-11 w-11 rounded-2xl bg-violet-100 items-center justify-center">
                <Scissors size={20} color="#8b5cf6" />
              </View>
              <View className="flex-1">
                <Text className="font-extrabold text-neutral-900">All Cut Pieces</Text>
                <Text className="text-xs text-neutral-500 mt-0.5">Leftover inventory</Text>
              </View>
              <ChevronRight size={18} color="#9ca3af" />
            </Pressable>
          </View>
        )}

        {/* ─── ROLL PROFIT TAB ─── */}
        {tab === 'profit' && (
          <View className="gap-2">
            <Text className="text-xs uppercase font-extrabold text-neutral-500 tracking-wider mb-1">
              Roll Profit Analysis ({rollProfit.length})
            </Text>
            {rollProfit.length === 0 ? (
              <View className="items-center py-16">
                <TrendingUp size={36} color="#d1d5db" />
                <Text className="mt-3 text-sm font-bold text-neutral-500">No profit data yet</Text>
              </View>
            ) : (
              rollProfit.slice(0, 30).map((r) => (
                <Pressable
                  key={r.id}
                  onPress={() => router.push(`/industries/carpet/rolls/${r.id}` as any)}
                  className="rounded-2xl bg-white border border-neutral-200 p-3 active:opacity-70"
                >
                  <View className="flex-row items-center gap-3">
                    <View className="h-12 w-12 rounded-2xl bg-emerald-100 items-center justify-center">
                      <Layers size={20} color="#16a34a" />
                    </View>
                    <View className="flex-1">
                      <View className="flex-row items-center gap-1.5">
                        <Text className="text-sm font-extrabold font-mono text-neutral-900">
                          {r.rollNumber}
                        </Text>
                        <Text className="text-[10px] text-neutral-500">•</Text>
                        <Text className="text-[10px] text-neutral-500 font-bold" numberOfLines={1}>
                          {r.usagePercent.toFixed(0)}% sold
                        </Text>
                      </View>
                      <Text className="text-xs text-neutral-700 font-bold mt-0.5" numberOfLines={1}>
                        {r.productName}
                        {r.variantName && ` • ${r.variantName}`}
                      </Text>
                      <View className="flex-row items-center gap-3 mt-1">
                        <Text className="text-[10px] text-blue-700 font-extrabold">
                          Cost: {formatPKRFull(r.cost)}
                        </Text>
                        <Text className="text-[10px] text-emerald-700 font-extrabold">
                          Rev: {formatPKRFull(r.revenue)}
                        </Text>
                      </View>
                    </View>
                    <View className="items-end">
                      <Text
                        className="text-base font-extrabold"
                        style={{ color: r.profit >= 0 ? '#16a34a' : '#dc2626' }}
                      >
                        {r.profit >= 0 ? '+' : ''}{formatPKRFull(r.profit)}
                      </Text>
                      <Text className="text-[10px] font-bold text-neutral-500">
                        {r.profitMargin.toFixed(1)}%
                      </Text>
                    </View>
                  </View>
                </Pressable>
              ))
            )}
          </View>
        )}

        {/* ─── TODAY'S CUTS TAB ─── */}
        {tab === 'today' && todaysCuts && (
          <View>
            <View className="rounded-3xl p-5 mb-3" style={{ backgroundColor: '#8b5cf6' }}>
              <Text className="text-[10px] uppercase tracking-wider text-white/80 font-extrabold">
                Today's Activity
              </Text>
              <Text className="text-white text-4xl font-extrabold mt-1">
                {todaysCuts.cutCount}
              </Text>
              <Text className="text-white/80 text-sm mt-1">
                cuts • {todaysCuts.totalSqftSold.toFixed(2)} sqft sold
              </Text>
              <View className="mt-3 pt-3 border-t border-white/20 flex-row justify-between">
                <View>
                  <Text className="text-[10px] font-extrabold uppercase text-white/70">Length Sold</Text>
                  <Text className="text-white text-lg font-extrabold mt-0.5">
                    {todaysCuts.totalLengthSoldFt.toFixed(1)}ft
                  </Text>
                </View>
              </View>
            </View>

            {todaysCuts.cuts.length === 0 ? (
              <View className="items-center py-16">
                <Scissors size={36} color="#d1d5db" />
                <Text className="mt-3 text-sm font-bold text-neutral-500">Aaj koi cut nahi hua</Text>
              </View>
            ) : (
              <View className="gap-2">
                {todaysCuts.cuts.map((c) => (
                  <View key={c.id} className="rounded-2xl bg-white border border-neutral-200 p-3 flex-row items-center gap-3">
                    <View className="h-11 w-11 rounded-2xl bg-violet-100 items-center justify-center">
                      <Scissors size={18} color="#8b5cf6" />
                    </View>
                    <View className="flex-1">
                      <Text className="text-sm font-extrabold font-mono text-neutral-900">
                        {c.rollNumber}
                      </Text>
                      <Text className="text-xs text-neutral-500 mt-0.5" numberOfLines={1}>
                        {c.productName}
                        {c.variantName && ` • ${c.variantName}`}
                      </Text>
                      {c.note && (
                        <Text className="text-[10px] text-neutral-500 italic mt-0.5">{c.note}</Text>
                      )}
                    </View>
                    <View className="items-end">
                      <Text className="text-base font-extrabold text-emerald-700">
                        {c.sqft.toFixed(2)}
                      </Text>
                      <Text className="text-[10px] text-neutral-500 font-bold">sqft</Text>
                      <Text className="text-[9px] text-neutral-400 font-bold mt-0.5">
                        {c.lengthFt.toFixed(1)}ft
                      </Text>
                    </View>
                  </View>
                ))}
              </View>
            )}
          </View>
        )}

        {/* ─── TOP DESIGNS TAB ─── */}
        {tab === 'designs' && (
          <View>
            <View className="flex-row gap-2 mb-3">
              {[7, 30, 90].map((d) => {
                const active = days === d;
                return (
                  <Pressable
                    key={d}
                    onPress={() => setDays(d)}
                    className="flex-1 h-9 rounded-lg items-center justify-center"
                    style={{ backgroundColor: active ? '#f59e0b' : '#ffffff', borderWidth: 2, borderColor: active ? '#f59e0b' : '#e5e7eb' }}
                  >
                    <Text className="text-xs font-bold" style={{ color: active ? '#ffffff' : '#374151' }}>
                      Last {d} days
                    </Text>
                  </Pressable>
                );
              })}
            </View>

            {topDesigns.length === 0 ? (
              <View className="items-center py-16">
                <Award size={36} color="#d1d5db" />
                <Text className="mt-3 text-sm font-bold text-neutral-500">No sales data</Text>
              </View>
            ) : (
              <View className="gap-2">
                {topDesigns.slice(0, 20).map((d, idx) => (
                  <View key={`${d.productId}-${d.variantId}`} className="rounded-2xl bg-white border border-neutral-200 p-3 flex-row items-center gap-3">
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
                      <Text
                        className="text-lg font-extrabold"
                        style={{
                          color:
                            idx === 0 ? '#d97706' :
                            idx === 1 ? '#64748b' :
                            idx === 2 ? '#c2410c' :
                            '#9ca3af',
                        }}
                      >
                        #{idx + 1}
                      </Text>
                    </View>
                    <View className="flex-1">
                      <Text className="text-sm font-extrabold text-neutral-900" numberOfLines={1}>
                        {d.productName}
                      </Text>
                      {d.variantName && (
                        <Text className="text-[10px] font-bold text-violet-700">{d.variantName}</Text>
                      )}
                      <View className="flex-row items-center gap-3 mt-1">
                        <Text className="text-[10px] text-emerald-700 font-bold">
                          {d.totalSqft.toFixed(0)} sqft
                        </Text>
                        <Text className="text-[10px] text-neutral-500">•</Text>
                        <Text className="text-[10px] text-neutral-500">
                          {d.salesCount} sales
                        </Text>
                      </View>
                    </View>
                    <Text className="text-base font-extrabold text-emerald-700">
                      {formatPKRFull(d.revenue)}
                    </Text>
                  </View>
                ))}
              </View>
            )}
          </View>
        )}

        {/* ─── SLOW MOVING TAB ─── */}
        {tab === 'slow' && (
          <View>
            <View className="flex-row gap-2 mb-3">
              {[30, 60, 90].map((d) => {
                const active = days === d;
                return (
                  <Pressable
                    key={d}
                    onPress={() => setDays(d)}
                    className="flex-1 h-9 rounded-lg items-center justify-center"
                    style={{ backgroundColor: active ? '#dc2626' : '#ffffff', borderWidth: 2, borderColor: active ? '#dc2626' : '#e5e7eb' }}
                  >
                    <Text className="text-xs font-bold" style={{ color: active ? '#ffffff' : '#374151' }}>
                      {d}+ days
                    </Text>
                  </Pressable>
                );
              })}
            </View>

            {slowMoving.length === 0 ? (
              <View className="items-center py-16">
                <CheckCircle2 size={36} color="#16a34a" />
                <Text className="mt-3 text-sm font-bold text-neutral-700">All rolls moving well! 🎉</Text>
              </View>
            ) : (
              <View className="gap-2">
                {slowMoving.map((r) => (
                  <Pressable
                    key={r.id}
                    onPress={() => router.push(`/industries/carpet/rolls/${r.id}` as any)}
                    className="rounded-2xl bg-white border-2 border-rose-200 p-3 active:opacity-70"
                  >
                    <View className="flex-row items-center gap-3">
                      <View className="h-12 w-12 rounded-2xl bg-rose-100 items-center justify-center">
                        <AlertTriangle size={20} color="#dc2626" />
                      </View>
                      <View className="flex-1">
                        <Text className="text-sm font-extrabold font-mono text-neutral-900">
                          {r.rollNumber}
                        </Text>
                        <Text className="text-xs text-neutral-700 font-bold mt-0.5" numberOfLines={1}>
                          {r.productName}
                        </Text>
                        <Text className="text-[10px] text-rose-700 font-bold mt-0.5">
                          {r.daysSinceLastActivity} days idle
                        </Text>
                      </View>
                      <View className="items-end">
                        <Text className="text-sm font-extrabold text-neutral-900">
                          {r.remainingSqft.toFixed(0)} sqft
                        </Text>
                        <Text className="text-[10px] text-blue-700 font-bold">
                          {formatPKRFull(r.stockValueCost)}
                        </Text>
                      </View>
                    </View>
                  </Pressable>
                ))}
              </View>
            )}
          </View>
        )}
      </ScrollView>
    </SafeAreaView>
  );
}
