import { useState, useMemo } from 'react';
import {
  View, Text, ScrollView, Pressable, TextInput, RefreshControl,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { useRouter, Stack } from 'expo-router';
import { useQuery } from '@tanstack/react-query';
import * as Haptics from 'expo-haptics';
import {
  ArrowLeft, CreditCard, Search, X, Plus, User, Phone, Calendar,
  AlertTriangle, CheckCircle2, TrendingUp, TrendingDown, Wallet,
  Sparkles, ChevronRight, Clock, DollarSign,
} from 'lucide-react-native';
import {
  emiApi,
  EMI_STATUS_LABELS, EMI_STATUS_COLORS,
  type EmiPlanStatus,
} from '@/api/emi.api';
import { formatPKRFull } from '@/lib/format';
import { useSmartBack } from '@/hooks/useSmartBack';

const formatDate = (v: string) =>
  new Intl.DateTimeFormat('en-PK', { month: 'short', day: 'numeric' }).format(new Date(v));

type StatusFilter = 'all' | EmiPlanStatus | 'overdue';

export default function EmiPlansScreen() {
  const router = useRouter();
  const goBack = useSmartBack();
  const [search, setSearch] = useState('');
  const [statusFilter, setStatusFilter] = useState<StatusFilter>('all');
  const [refreshing, setRefreshing] = useState(false);

  const { data: stats } = useQuery({
    queryKey: ['emi-stats'],
    queryFn: () => emiApi.stats(),
  });

  const { data, refetch } = useQuery({
    queryKey: ['emi-plans', statusFilter],
    queryFn: () =>
      emiApi.list({
        status:
          statusFilter === 'overdue' || statusFilter === 'all'
            ? undefined
            : statusFilter,
        filter: statusFilter === 'overdue' ? 'ONLY_OVERDUE' : undefined,
        limit: 200,
      }),
  });

  const plans = data?.items ?? [];

  const onRefresh = async () => {
    setRefreshing(true);
    await refetch();
    setRefreshing(false);
  };

  const filtered = useMemo(() => {
    if (!search.trim()) return plans;
    const q = search.toLowerCase().trim();
    return plans.filter(
      (p) =>
        p.planNumber.toLowerCase().includes(q) ||
        p.customerName.toLowerCase().includes(q) ||
        (p.customerPhone || '').toLowerCase().includes(q),
    );
  }, [plans, search]);

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
          <ArrowLeft size={20} color="#7c3aed" />
        </Pressable>
        <View className="flex-1">
          <Text className="text-2xl font-extrabold text-neutral-900 dark:text-white">
            EMI Plans
          </Text>
          <Text className="text-xs text-neutral-500 mt-0.5">
            Installment tracking
          </Text>
        </View>
      </View>

      <ScrollView
        contentContainerStyle={{ paddingBottom: 40 }}
        refreshControl={
          <RefreshControl refreshing={refreshing} onRefresh={onRefresh} tintColor="#7c3aed" />
        }
        showsVerticalScrollIndicator={false}
      >
        {/* Hero */}
        <View className="mx-5 rounded-3xl p-5 mb-4" style={{ backgroundColor: '#7c3aed' }}>
          <View className="flex-row items-center gap-2 mb-1">
            <CreditCard size={12} color="rgba(255,255,255,0.8)" />
            <Text className="text-[10px] uppercase tracking-wider text-white/80 font-extrabold">
              Total Outstanding
            </Text>
          </View>
          <Text className="text-white text-4xl font-extrabold">
            {formatPKRFull(stats?.activeRemaining ?? 0)}
          </Text>
          <View className="mt-3 pt-3 border-t border-white/20 flex-row justify-between">
            <View>
              <Text className="text-[10px] font-extrabold uppercase text-white/70">Financed</Text>
              <Text className="text-white text-sm font-extrabold mt-0.5">
                {formatPKRFull(stats?.activeFinanced ?? 0)}
              </Text>
            </View>
            <View>
              <Text className="text-[10px] font-extrabold uppercase text-white/70">Collected</Text>
              <Text className="text-white text-sm font-extrabold mt-0.5">
                {formatPKRFull(stats?.activePaid ?? 0)}
              </Text>
            </View>
            <View>
              <Text className="text-[10px] font-extrabold uppercase text-white/70">This Month</Text>
              <Text className="text-white text-sm font-extrabold mt-0.5">
                {formatPKRFull(stats?.collectedThisMonth ?? 0)}
              </Text>
            </View>
          </View>
        </View>

        {/* Alerts */}
        <View className="px-5 mb-3">
          <View className="flex-row flex-wrap -mx-1.5">
            {(stats?.overdueCount ?? 0) > 0 && (
              <View className="w-1/2 px-1.5 mb-2">
                <View className="rounded-2xl bg-rose-50 border-2 border-rose-300 p-3">
                  <View className="flex-row items-center gap-1.5 mb-1">
                    <AlertTriangle size={12} color="#dc2626" />
                    <Text className="text-[10px] uppercase font-extrabold text-rose-700">
                      Overdue
                    </Text>
                  </View>
                  <Text className="text-2xl font-extrabold text-rose-700">
                    {stats?.overdueCount}
                  </Text>
                  <Text className="text-[10px] text-rose-600 font-bold mt-0.5">
                    {formatPKRFull(stats?.overdueAmount ?? 0)}
                  </Text>
                </View>
              </View>
            )}
            {(stats?.upcomingCount ?? 0) > 0 && (
              <View className="w-1/2 px-1.5 mb-2">
                <View className="rounded-2xl bg-amber-50 border-2 border-amber-300 p-3">
                  <View className="flex-row items-center gap-1.5 mb-1">
                    <Clock size={12} color="#d97706" />
                    <Text className="text-[10px] uppercase font-extrabold text-amber-700">
                      Due Soon
                    </Text>
                  </View>
                  <Text className="text-2xl font-extrabold text-amber-700">
                    {stats?.upcomingCount}
                  </Text>
                  <Text className="text-[10px] text-amber-600 font-bold mt-0.5">
                    {formatPKRFull(stats?.upcomingAmount ?? 0)}
                  </Text>
                </View>
              </View>
            )}
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
            { key: 'all' as StatusFilter, label: 'All', count: plans.length, color: '#7c3aed' },
            { key: 'overdue' as StatusFilter, label: 'Overdue', count: stats?.overdueCount ?? 0, color: '#dc2626' },
            { key: 'ACTIVE' as StatusFilter, label: 'Active', count: statusCounts.get('ACTIVE') ?? 0, color: '#2563eb' },
            { key: 'COMPLETED' as StatusFilter, label: 'Completed', count: statusCounts.get('COMPLETED') ?? 0, color: '#16a34a' },
            { key: 'DEFAULTED' as StatusFilter, label: 'Defaulted', count: statusCounts.get('DEFAULTED') ?? 0, color: '#b91c1c' },
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

        {/* Search */}
        <View className="px-5 mb-3">
          <View className="flex-row items-center gap-2 rounded-2xl border border-neutral-200 bg-white px-4 h-12">
            <Search size={18} color="#9ca3af" />
            <TextInput
              placeholder="Search plan #, customer, phone..."
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
                <CreditCard size={36} color="#7c3aed" />
              </View>
              <Text className="mt-4 text-base font-bold text-neutral-900">
                {search || statusFilter !== 'all' ? 'No plans match' : 'No EMI plans yet'}
              </Text>
              <Text className="text-xs text-neutral-500 mt-1">
                EMI plans customers ke liye qist plan
              </Text>
            </View>
          ) : (
            <View className="gap-2">
              {filtered.map((plan) => {
                const cfg = EMI_STATUS_COLORS[plan.status];
                const paidPercent =
                  plan.financedAmount > 0
                    ? (plan.paidAmount / plan.financedAmount) * 100
                    : 0;
                const hasOverdue = plan.overdueCount > 0;
                return (
                  <Pressable
                    key={plan.id}
                    onPress={() => {
                      Haptics.selectionAsync();
                      // router.push(`/industries/mobile/emi/${plan.id}` as any);
                    }}
                    className="rounded-2xl bg-white border-2 p-3 active:opacity-70"
                    style={{ borderColor: hasOverdue ? '#fca5a5' : '#e5e7eb' }}
                  >
                    <View className="flex-row items-start gap-3">
                      <View className="h-14 w-14 rounded-2xl bg-violet-100 items-center justify-center shrink-0 relative">
                        <CreditCard size={24} color="#7c3aed" />
                        {hasOverdue && (
                          <View className="absolute -top-1 -right-1 h-5 w-5 rounded-full items-center justify-center" style={{ backgroundColor: '#dc2626' }}>
                            <AlertTriangle size={10} color="#ffffff" />
                          </View>
                        )}
                      </View>

                      <View className="flex-1 min-w-0">
                        <View className="flex-row items-center gap-1.5 flex-wrap">
                          <Text className="font-extrabold font-mono text-sm text-neutral-900">
                            {plan.planNumber}
                          </Text>
                          <View className="px-1.5 py-0.5 rounded" style={{ backgroundColor: cfg.bg }}>
                            <Text className="text-[9px] font-extrabold" style={{ color: cfg.text }}>
                              {EMI_STATUS_LABELS[plan.status]}
                            </Text>
                          </View>
                          {hasOverdue && (
                            <View className="px-1.5 py-0.5 rounded bg-rose-100">
                              <Text className="text-[9px] font-extrabold text-rose-700">
                                {plan.overdueCount} OVERDUE
                              </Text>
                            </View>
                          )}
                        </View>
                        <View className="flex-row items-center gap-1 mt-1">
                          <User size={11} color="#8b5cf6" />
                          <Text className="text-xs font-bold text-neutral-800" numberOfLines={1}>
                            {plan.customerName}
                          </Text>
                        </View>
                        {plan.customerPhone && (
                          <Text className="text-[10px] text-neutral-500 mt-0.5">
                            📞 {plan.customerPhone}
                          </Text>
                        )}
                        <View className="mt-1.5 bg-neutral-100 rounded-full h-1.5 overflow-hidden">
                          <View
                            className="h-full rounded-full"
                            style={{
                              width: `${paidPercent}%`,
                              backgroundColor: hasOverdue ? '#dc2626' : '#16a34a',
                            }}
                          />
                        </View>
                        <View className="flex-row items-center justify-between mt-1">
                          <Text className="text-[10px] text-neutral-500">
                            {plan.paidInstallmentCount} / {plan.installmentCount} paid
                          </Text>
                          {plan.nextDueDate && (
                            <Text className="text-[10px] text-neutral-500">
                              Next: {formatDate(plan.nextDueDate)}
                            </Text>
                          )}
                        </View>
                      </View>

                      <View className="items-end">
                        <Text className="text-base font-extrabold text-emerald-700">
                          {formatPKRFull(plan.installmentAmount)}
                        </Text>
                        <Text className="text-[10px] text-neutral-500 font-bold">
                          /month
                        </Text>
                        <Text className="text-[10px] text-amber-700 font-extrabold mt-1">
                          Due: {formatPKRFull(plan.remainingAmount)}
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
