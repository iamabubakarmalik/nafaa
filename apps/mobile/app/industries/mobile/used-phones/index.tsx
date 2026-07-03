import { useState, useMemo } from 'react';
import {
  View, Text, ScrollView, Pressable, TextInput, RefreshControl,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { useRouter, Stack } from 'expo-router';
import { useQuery } from '@tanstack/react-query';
import * as Haptics from 'expo-haptics';
import {
  ArrowLeft, RefreshCw, Search, X, Plus, Smartphone, DollarSign,
  TrendingUp, Sparkles, ChevronRight, CheckCircle2, Package,
  AlertCircle, Wrench,
} from 'lucide-react-native';
import {
  usedPhonesApi, CONDITION_LABELS, CONDITION_COLORS,
  STATUS_LABELS, STATUS_COLORS,
  type UsedPhoneCondition, type UsedPhoneStatus,
} from '@/api/used-phones.api';
import { formatPKRFull } from '@/lib/format';
import { useSmartBack } from '@/hooks/useSmartBack';

const formatDate = (v: string) =>
  new Intl.DateTimeFormat('en-PK', { month: 'short', day: 'numeric' }).format(new Date(v));

type StatusFilter = 'all' | UsedPhoneStatus;

export default function UsedPhonesScreen() {
  const router = useRouter();
  const goBack = useSmartBack();
  const [search, setSearch] = useState('');
  const [statusFilter, setStatusFilter] = useState<StatusFilter>('all');
  const [refreshing, setRefreshing] = useState(false);

  const { data: stats } = useQuery({
    queryKey: ['used-phones-stats'],
    queryFn: () => usedPhonesApi.stats(),
  });

  const { data, refetch } = useQuery({
    queryKey: ['used-phones', statusFilter],
    queryFn: () =>
      usedPhonesApi.list({
        status: statusFilter === 'all' ? undefined : statusFilter,
        limit: 200,
      }),
  });

  const phones = data?.items ?? [];

  const onRefresh = async () => {
    setRefreshing(true);
    await refetch();
    setRefreshing(false);
  };

  const filtered = useMemo(() => {
    if (!search.trim()) return phones;
    const q = search.toLowerCase().trim();
    return phones.filter(
      (p) =>
        p.usedPhoneCode.toLowerCase().includes(q) ||
        p.brand.toLowerCase().includes(q) ||
        p.model.toLowerCase().includes(q) ||
        p.imei1.toLowerCase().includes(q) ||
        (p.fromCustomerName || '').toLowerCase().includes(q),
    );
  }, [phones, search]);

  const statusCounts = useMemo(() => {
    const map = new Map<string, number>();
    stats?.byStatus.forEach((s) => map.set(s.status, s.count));
    return map;
  }, [stats]);

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
          <ArrowLeft size={20} color="#2563eb" />
        </Pressable>
        <View className="flex-1">
          <Text className="text-2xl font-extrabold text-neutral-900 dark:text-white">
            Used Phones
          </Text>
          <Text className="text-xs text-neutral-500 mt-0.5">
            Trade-in inventory
          </Text>
        </View>
        <Pressable
          onPress={() => router.push('/industries/mobile/used-phones/new' as any)}
          className="h-11 px-4 rounded-2xl flex-row items-center gap-1.5 active:opacity-80"
          style={{ backgroundColor: '#7c3aed', shadowColor: '#7c3aed', shadowOpacity: 0.3, shadowRadius: 8, elevation: 4 }}
        >
          <Plus size={16} color="#ffffff" />
          <Text className="text-white font-bold text-sm">New</Text>
        </Pressable>
      </View>

      <ScrollView
        contentContainerStyle={{ paddingBottom: 40 }}
        refreshControl={
          <RefreshControl refreshing={refreshing} onRefresh={onRefresh} tintColor="#2563eb" />
        }
        showsVerticalScrollIndicator={false}
      >
        {/* Hero */}
        <View className="mx-5 rounded-3xl p-5 mb-4" style={{ backgroundColor: '#2563eb' }}>
          <View className="flex-row items-center gap-2 mb-1">
            <RefreshCw size={12} color="rgba(255,255,255,0.8)" />
            <Text className="text-[10px] uppercase tracking-wider text-white/80 font-extrabold">
              In Stock Value
            </Text>
          </View>
          <Text className="text-white text-4xl font-extrabold">
            {formatPKRFull(stats?.inStockResaleValue ?? 0)}
          </Text>
          <View className="mt-3 pt-3 border-t border-white/20 flex-row justify-between">
            <View>
              <Text className="text-[10px] font-extrabold uppercase text-white/70">In Stock</Text>
              <Text className="text-white text-lg font-extrabold mt-0.5">
                {statusCounts.get('IN_STOCK') ?? 0}
              </Text>
            </View>
            <View>
              <Text className="text-[10px] font-extrabold uppercase text-white/70">Cost</Text>
              <Text className="text-white text-sm font-extrabold mt-0.5">
                {formatPKRFull(stats?.inStockCost ?? 0)}
              </Text>
            </View>
            <View>
              <Text className="text-[10px] font-extrabold uppercase text-white/70">Profit</Text>
              <Text className="text-white text-sm font-extrabold mt-0.5">
                {formatPKRFull(stats?.potentialProfit ?? 0)}
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
            { key: 'all' as StatusFilter, label: 'All', count: phones.length },
            { key: 'PENDING_INSPECTION' as StatusFilter, label: 'Pending', count: statusCounts.get('PENDING_INSPECTION') ?? 0 },
            { key: 'IN_STOCK' as StatusFilter, label: 'In Stock', count: statusCounts.get('IN_STOCK') ?? 0 },
            { key: 'REPAIRING' as StatusFilter, label: 'Repairing', count: statusCounts.get('REPAIRING') ?? 0 },
            { key: 'SOLD' as StatusFilter, label: 'Sold', count: statusCounts.get('SOLD') ?? 0 },
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
                  backgroundColor: active ? '#2563eb' : '#ffffff',
                  borderColor: active ? '#2563eb' : '#e5e7eb',
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
              placeholder="Search code, brand, model, IMEI..."
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
              <View className="h-20 w-20 rounded-3xl bg-blue-100 items-center justify-center">
                <RefreshCw size={36} color="#2563eb" />
              </View>
              <Text className="mt-4 text-base font-bold text-neutral-900">
                {search || statusFilter !== 'all' ? 'No matches' : 'No used phones yet'}
              </Text>
              <Text className="text-xs text-neutral-500 mt-1 text-center">
                Trade-in phones will appear here
              </Text>
            </View>
          ) : (
            <View className="gap-2">
              {filtered.map((phone) => {
                const condCfg = CONDITION_COLORS[phone.condition];
                const statusCfg = STATUS_COLORS[phone.status];
                return (
                  <Pressable
                    key={phone.id}
                    onPress={() => {
                      Haptics.selectionAsync();
                      // For now navigate to detail via param; we'll build detail in next batch
                      // router.push(`/industries/mobile/used-phones/${phone.id}` as any);
                    }}
                    className="rounded-2xl bg-white border-2 border-neutral-200 p-3 active:opacity-70"
                  >
                    <View className="flex-row items-start gap-3">
                      <View className="h-14 w-14 rounded-2xl bg-blue-100 items-center justify-center shrink-0">
                        <Smartphone size={24} color="#2563eb" />
                      </View>

                      <View className="flex-1 min-w-0">
                        <View className="flex-row items-center gap-1.5 flex-wrap">
                          <Text className="font-extrabold font-mono text-sm text-neutral-900">
                            {phone.usedPhoneCode}
                          </Text>
                          <View className="px-1.5 py-0.5 rounded" style={{ backgroundColor: statusCfg.bg }}>
                            <Text className="text-[9px] font-extrabold" style={{ color: statusCfg.text }}>
                              {STATUS_LABELS[phone.status]}
                            </Text>
                          </View>
                        </View>
                        <Text className="text-sm font-extrabold text-neutral-900 mt-1">
                          {phone.brand} {phone.model}
                        </Text>
                        <View className="flex-row items-center gap-2 mt-0.5">
                          {phone.storage && (
                            <Text className="text-[10px] text-neutral-500 font-bold">{phone.storage}</Text>
                          )}
                          {phone.color && (
                            <Text className="text-[10px] text-neutral-500 font-bold">• {phone.color}</Text>
                          )}
                        </View>
                        <View className="flex-row items-center gap-2 mt-1">
                          <View className="px-1.5 py-0.5 rounded" style={{ backgroundColor: condCfg.bg }}>
                            <Text className="text-[9px] font-extrabold" style={{ color: condCfg.text }}>
                              {CONDITION_LABELS[phone.condition]}
                            </Text>
                          </View>
                          <Text className="text-[10px] text-neutral-500 font-mono">
                            IMEI: {phone.imei1.slice(-6)}
                          </Text>
                        </View>
                        {phone.fromCustomerName && (
                          <Text className="text-[10px] text-neutral-500 mt-0.5">
                            From: {phone.fromCustomerName}
                          </Text>
                        )}
                      </View>

                      <View className="items-end">
                        <Text className="text-base font-extrabold text-emerald-700">
                          {formatPKRFull(phone.resalePrice)}
                        </Text>
                        <Text className="text-[10px] text-blue-700 font-bold">
                          Cost: {formatPKRFull(phone.totalCost)}
                        </Text>
                        <Text className="text-[10px] text-violet-700 font-bold mt-0.5">
                          +{formatPKRFull(phone.resalePrice - phone.totalCost)}
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
