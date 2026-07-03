import { useState, useMemo } from 'react';
import {
  View, Text, ScrollView, Pressable, RefreshControl, TextInput,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { useRouter, Stack } from 'expo-router';
import { useQuery } from '@tanstack/react-query';
import * as Haptics from 'expo-haptics';
import {
  ArrowLeft, BookOpen, Wallet, Users, AlertTriangle, Phone,
  ChevronRight, Search, X, CheckCircle2, Star, TrendingUp,
  Sparkles, Filter, ArrowDownToLine,
} from 'lucide-react-native';
import { customerLedgerApi } from '@/api/customer-ledger.api';
import { customersApi } from '@/api/customers.api';
import { formatPKR, formatPKRFull } from '@/lib/format';

type FilterType = 'credit' | 'all' | 'cleared';

export default function KhataScreen() {
  const router = useRouter();
  const [refreshing, setRefreshing] = useState(false);
  const [search, setSearch] = useState('');
  const [filter, setFilter] = useState<FilterType>('credit');

  const { data: summary, refetch: refetchSummary } = useQuery({
    queryKey: ['khata-summary'],
    queryFn: () => customerLedgerApi.summary(),
  });

  const { data: allCustomersData, refetch: refetchCustomers } = useQuery({
    queryKey: ['customers-for-khata'],
    queryFn: () => customersApi.list({ page: 1, limit: 500 }),
  });

  const customers = allCustomersData?.items ?? [];

  const onRefresh = async () => {
    setRefreshing(true);
    await Promise.all([refetchSummary(), refetchCustomers()]);
    setRefreshing(false);
  };

  const filteredCustomers = useMemo(() => {
    let result = [...customers];

    // Search
    const q = search.toLowerCase().trim();
    if (q) {
      result = result.filter(
        (c) => c.name.toLowerCase().includes(q) || (c.phone || '').toLowerCase().includes(q),
      );
    }

    // Filter
    if (filter === 'credit') {
      result = result.filter((c) => c.balance > 0);
    } else if (filter === 'cleared') {
      result = result.filter((c) => c.balance === 0);
    }

    // Sort by balance descending
    return result.sort((a, b) => b.balance - a.balance);
  }, [customers, search, filter]);

  // Stats
  const stats = useMemo(() => {
    const withCredit = customers.filter((c) => c.balance > 0);
    const totalOutstanding = withCredit.reduce((s, c) => s + c.balance, 0);
    const avgBalance = withCredit.length > 0 ? totalOutstanding / withCredit.length : 0;
    return {
      totalOutstanding,
      customersWithCredit: withCredit.length,
      avgBalance,
      totalCustomers: customers.length,
      cleared: customers.length - withCredit.length,
    };
  }, [customers]);

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
          <ArrowLeft size={20} color="#dc2626" />
        </Pressable>
        <View className="flex-1">
          <Text className="text-2xl font-extrabold text-neutral-900 dark:text-white">
            Khata Book
          </Text>
          <View className="flex-row items-center gap-1.5 mt-0.5">
            <Sparkles size={11} color="#dc2626" />
            <Text className="text-xs text-neutral-500">
              Customer Credit System
            </Text>
          </View>
        </View>
      </View>

      <ScrollView
        contentContainerStyle={{ paddingBottom: 40 }}
        refreshControl={
          <RefreshControl refreshing={refreshing} onRefresh={onRefresh} tintColor="#dc2626" />
        }
        showsVerticalScrollIndicator={false}
      >
        {/* Hero */}
        <View className="px-5 mb-4">
          <View
            className="rounded-3xl p-5"
            style={{
              backgroundColor: '#7f1d1d',
              shadowColor: '#7f1d1d',
              shadowOpacity: 0.3,
              shadowRadius: 16,
              shadowOffset: { width: 0, height: 8 },
              elevation: 10,
            }}
          >
            <View className="flex-row items-center gap-3 mb-4">
              <View className="h-14 w-14 rounded-2xl bg-white/20 items-center justify-center">
                <BookOpen size={28} color="#ffffff" />
              </View>
              <View className="flex-1">
                <Text className="text-xs font-bold uppercase tracking-wider text-white/80">
                  Total Outstanding
                </Text>
                <Text className="text-3xl font-extrabold text-white">
                  {formatPKRFull(stats.totalOutstanding)}
                </Text>
                <Text className="text-xs text-white/80 mt-0.5">
                  Collect karna baqi
                </Text>
              </View>
            </View>

            <View className="pt-3 border-t border-white/20 flex-row items-center justify-between">
              <View className="flex-1">
                <Text className="text-[10px] font-extrabold uppercase text-white/70">
                  With Credit
                </Text>
                <Text className="text-white text-lg font-extrabold mt-0.5">
                  {stats.customersWithCredit}
                </Text>
              </View>
              <View className="flex-1 items-center border-l border-white/20 pl-3">
                <Text className="text-[10px] font-extrabold uppercase text-white/70">
                  Avg Balance
                </Text>
                <Text className="text-white text-sm font-extrabold mt-0.5">
                  {formatPKR(stats.avgBalance)}
                </Text>
              </View>
              <View className="flex-1 items-end border-l border-white/20 pl-3">
                <Text className="text-[10px] font-extrabold uppercase text-white/70">
                  Cleared
                </Text>
                <Text className="text-white text-lg font-extrabold mt-0.5">
                  {stats.cleared}
                </Text>
              </View>
            </View>
          </View>
        </View>

        {/* Stats Grid */}
        <View className="px-5 mb-4">
          <View className="flex-row flex-wrap -mx-1.5">
            <StatCard
              label="Outstanding"
              value={formatPKR(stats.totalOutstanding)}
              icon={Wallet}
              color="#dc2626"
              bg="#fee2e2"
              sub="Collect karna baqi"
            />
            <StatCard
              label="With Credit"
              value={String(stats.customersWithCredit)}
              icon={AlertTriangle}
              color="#d97706"
              bg="#fef3c7"
              sub="Khatedar customers"
            />
            <StatCard
              label="Avg Balance"
              value={formatPKR(stats.avgBalance)}
              icon={TrendingUp}
              color="#7c3aed"
              bg="#ede9fe"
              sub="Per khatedar"
            />
            <StatCard
              label="Total Customers"
              value={String(stats.totalCustomers)}
              icon={Users}
              color="#2563eb"
              bg="#dbeafe"
              sub={`${stats.cleared} cleared`}
            />
          </View>
        </View>

        {/* Search */}
        <View className="px-5 mb-3">
          <View className="flex-row items-center gap-2 rounded-2xl border border-neutral-200 bg-white dark:bg-neutral-900 px-4 h-12">
            <Search size={18} color="#9ca3af" />
            <TextInput
              placeholder="Search customer or phone..."
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

        {/* Filter Tabs */}
        <View className="px-5 mb-3">
          <View className="flex-row gap-2 bg-slate-100 dark:bg-neutral-800 rounded-2xl p-1">
            {[
              { key: 'credit' as FilterType, label: 'With Credit', color: '#dc2626', count: stats.customersWithCredit },
              { key: 'all' as FilterType, label: 'All', color: '#0f172a', count: stats.totalCustomers },
              { key: 'cleared' as FilterType, label: 'Cleared', color: '#16a34a', count: stats.cleared },
            ].map((f) => {
              const active = filter === f.key;
              return (
                <Pressable
                  key={f.key}
                  onPress={() => {
                    Haptics.selectionAsync();
                    setFilter(f.key);
                  }}
                  className="flex-1 h-11 rounded-xl items-center justify-center flex-row gap-1.5"
                  style={{
                    backgroundColor: active ? f.color : 'transparent',
                    shadowColor: active ? f.color : 'transparent',
                    shadowOpacity: active ? 0.2 : 0,
                    shadowRadius: 6,
                    elevation: active ? 3 : 0,
                  }}
                >
                  <Text
                    className="text-xs font-extrabold"
                    style={{ color: active ? '#ffffff' : '#6b7280' }}
                  >
                    {f.label}
                  </Text>
                  <View
                    className="px-1.5 py-0.5 rounded-md"
                    style={{
                      backgroundColor: active ? 'rgba(255,255,255,0.25)' : '#e5e7eb',
                    }}
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
          </View>
        </View>

        {/* Result info */}
        {(search || filter !== 'credit') && (
          <View className="px-5 mb-2 flex-row items-center gap-1.5">
            <Filter size={11} color="#7c3aed" />
            <Text className="text-xs text-neutral-500">
              Showing{' '}
              <Text className="font-extrabold text-violet-700">{filteredCustomers.length}</Text>
              {' '}of {customers.length}
            </Text>
          </View>
        )}

        {/* Customer List */}
        <View className="px-5">
          {filteredCustomers.length === 0 ? (
            <View className="rounded-2xl bg-white dark:bg-neutral-900 border border-neutral-200 items-center py-12">
              <View className="h-16 w-16 rounded-3xl bg-emerald-100 items-center justify-center">
                {filter === 'credit' ? (
                  <CheckCircle2 size={32} color="#16a34a" />
                ) : (
                  <Users size={32} color="#9ca3af" />
                )}
              </View>
              <Text className="mt-3 text-base font-bold text-neutral-700 dark:text-neutral-300">
                {filter === 'credit'
                  ? 'Koi customer udhaar mein nahi'
                  : search
                  ? 'No matches'
                  : 'No customers'}
              </Text>
              {filter === 'credit' && !search && (
                <Text className="mt-1 text-xs text-emerald-700 font-bold">
                  Alhamdulillah! 🎉
                </Text>
              )}
            </View>
          ) : (
            <View className="gap-2">
              {filteredCustomers.map((c, idx) => {
                const hasCredit = c.balance > 0;
                return (
                  <Pressable
                    key={c.id}
                    onPress={() => {
                      Haptics.selectionAsync();
                      router.push(`/khata/${c.id}` as any);
                    }}
                    className="rounded-2xl bg-white dark:bg-neutral-900 border-2 p-3 active:opacity-70"
                    style={{
                      borderColor: hasCredit && filter === 'credit' && idx < 3 ? '#fca5a5' : '#e5e7eb',
                    }}
                  >
                    <View className="flex-row items-center gap-3">
                      {/* Rank badge for top debtors */}
                      {hasCredit && filter === 'credit' && idx < 3 ? (
                        <View
                          className="h-12 w-12 rounded-2xl items-center justify-center shrink-0"
                          style={{
                            backgroundColor:
                              idx === 0 ? '#dc2626' :
                              idx === 1 ? '#ea580c' :
                              '#f59e0b',
                            shadowColor:
                              idx === 0 ? '#dc2626' :
                              idx === 1 ? '#ea580c' :
                              '#f59e0b',
                            shadowOpacity: 0.3,
                            shadowRadius: 6,
                            elevation: 4,
                          }}
                        >
                          <Text className="text-white font-extrabold text-base">
                            #{idx + 1}
                          </Text>
                        </View>
                      ) : (
                        <View
                          className="h-12 w-12 rounded-2xl items-center justify-center shrink-0"
                          style={{
                            backgroundColor: hasCredit ? '#fee2e2' : '#dcfce7',
                          }}
                        >
                          <Text
                            className="text-lg font-extrabold"
                            style={{ color: hasCredit ? '#dc2626' : '#16a34a' }}
                          >
                            {c.name.charAt(0).toUpperCase()}
                          </Text>
                        </View>
                      )}

                      {/* Info */}
                      <View className="flex-1 min-w-0">
                        <View className="flex-row items-center gap-1.5 flex-wrap">
                          <Text
                            className="font-bold text-neutral-900 dark:text-white"
                            numberOfLines={1}
                          >
                            {c.name}
                          </Text>
                          {c.isVip && (
                            <View className="bg-amber-100 dark:bg-amber-950/40 px-1.5 py-0.5 rounded-md flex-row items-center gap-0.5">
                              <Star size={7} color="#f59e0b" fill="#f59e0b" />
                              <Text className="text-[9px] font-extrabold text-amber-700">
                                VIP
                              </Text>
                            </View>
                          )}
                        </View>
                        {c.phone && (
                          <View className="flex-row items-center gap-1 mt-0.5">
                            <Phone size={10} color="#9ca3af" />
                            <Text className="text-[11px] text-neutral-500">
                              {c.phone}
                            </Text>
                          </View>
                        )}
                        {c.creditLimit > 0 && (
                          <Text className="text-[10px] text-neutral-500 mt-0.5">
                            Limit: {formatPKR(c.creditLimit)}
                          </Text>
                        )}
                      </View>

                      {/* Balance */}
                      <View className="items-end shrink-0">
                        {hasCredit ? (
                          <>
                            <Text className="text-base font-extrabold text-rose-700 dark:text-rose-400">
                              {formatPKR(c.balance)}
                            </Text>
                            <Text className="text-[10px] text-rose-600 font-extrabold">
                              Udhaar
                            </Text>
                            {c.creditLimit > 0 && c.balance >= c.creditLimit && (
                              <View className="mt-1 px-1.5 py-0.5 rounded-md bg-rose-100">
                                <Text className="text-[9px] font-extrabold text-rose-700">
                                  LIMIT!
                                </Text>
                              </View>
                            )}
                          </>
                        ) : (
                          <View className="flex-row items-center gap-1 px-2 py-0.5 rounded-md bg-emerald-100">
                            <CheckCircle2 size={9} color="#15803d" />
                            <Text className="text-[10px] font-extrabold text-emerald-700">
                              CLEARED
                            </Text>
                          </View>
                        )}
                      </View>
                      <ChevronRight size={16} color="#9ca3af" />
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

// Helper
function StatCard({ label, value, icon: Icon, color, bg, sub }: any) {
  return (
    <View className="w-1/2 px-1.5 mb-3">
      <View className="rounded-2xl bg-white dark:bg-neutral-900 border border-neutral-200 p-3.5">
        <View className="flex-row items-start justify-between">
          <View className="flex-1">
            <Text className="text-[10px] uppercase font-extrabold text-neutral-500 tracking-wider">
              {label}
            </Text>
            <Text
              className="mt-1 text-lg font-extrabold"
              style={{ color }}
              numberOfLines={1}
            >
              {value}
            </Text>
            {sub && (
              <Text
                className="text-[10px] font-bold mt-0.5"
                style={{ color, opacity: 0.7 }}
                numberOfLines={1}
              >
                {sub}
              </Text>
            )}
          </View>
          <View
            className="h-10 w-10 rounded-2xl items-center justify-center"
            style={{ backgroundColor: bg }}
          >
            <Icon size={18} color={color} />
          </View>
        </View>
      </View>
    </View>
  );
}
