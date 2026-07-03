import { useState } from 'react';
import {
  View, Text, ScrollView, Pressable, RefreshControl,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { useRouter, Stack } from 'expo-router';
import { useQuery } from '@tanstack/react-query';
import * as Haptics from 'expo-haptics';
import {
  ArrowLeft, BarChart3, Smartphone, RefreshCw, Wrench, CreditCard,
  TrendingUp, DollarSign, Sparkles, Award, Package, Wallet,
  AlertTriangle, CheckCircle2, ChevronRight,
} from 'lucide-react-native';
import { mobileReportsApi } from '@/api/mobile-reports.api';
import { PTA_STATUS_LABELS, PTA_STATUS_COLORS } from '@/api/imei.api';
import { formatPKRFull } from '@/lib/format';
import { useSmartBack } from '@/hooks/useSmartBack';

type Tab = 'overview' | 'pta' | 'brands' | 'repairs' | 'emi' | 'used';

export default function MobileReportsScreen() {
  const router = useRouter();
  const goBack = useSmartBack();
  const [tab, setTab] = useState<Tab>('overview');
  const [days, setDays] = useState(30);
  const [refreshing, setRefreshing] = useState(false);

  const { data: dashboard, refetch: refetchDash } = useQuery({
    queryKey: ['mobile-dashboard'],
    queryFn: () => mobileReportsApi.dashboard(),
  });

  const { data: ptaBreakdown = [], refetch: refetchPta } = useQuery({
    queryKey: ['mobile-pta-breakdown'],
    queryFn: () => mobileReportsApi.ptaBreakdown(),
    enabled: tab === 'pta',
  });

  const { data: topBrands = [], refetch: refetchBrands } = useQuery({
    queryKey: ['mobile-top-brands', days],
    queryFn: () => mobileReportsApi.topBrands(days),
    enabled: tab === 'brands',
  });

  const { data: repairAnalytics, refetch: refetchRepairs } = useQuery({
    queryKey: ['mobile-repair-analytics', days],
    queryFn: () => mobileReportsApi.repairAnalytics(days),
    enabled: tab === 'repairs',
  });

  const { data: emiAnalytics, refetch: refetchEmi } = useQuery({
    queryKey: ['mobile-emi-analytics'],
    queryFn: () => mobileReportsApi.emiAnalytics(),
    enabled: tab === 'emi',
  });

  const { data: usedAnalytics, refetch: refetchUsed } = useQuery({
    queryKey: ['mobile-used-analytics', days],
    queryFn: () => mobileReportsApi.usedPhoneAnalytics(days),
    enabled: tab === 'used',
  });

  const onRefresh = async () => {
    setRefreshing(true);
    await Promise.all([
      refetchDash(),
      tab === 'pta' && refetchPta(),
      tab === 'brands' && refetchBrands(),
      tab === 'repairs' && refetchRepairs(),
      tab === 'emi' && refetchEmi(),
      tab === 'used' && refetchUsed(),
    ].filter(Boolean));
    setRefreshing(false);
  };

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
            Mobile Reports
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
          { key: 'pta' as Tab, label: 'PTA', icon: Smartphone },
          { key: 'brands' as Tab, label: 'Top Brands', icon: Award },
          { key: 'repairs' as Tab, label: 'Repairs', icon: Wrench },
          { key: 'emi' as Tab, label: 'EMI', icon: CreditCard },
          { key: 'used' as Tab, label: 'Used Phones', icon: RefreshCw },
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
                backgroundColor: active ? '#2563eb' : '#ffffff',
                borderColor: active ? '#2563eb' : '#e5e7eb',
              }}
            >
              <Icon size={13} color={active ? '#ffffff' : '#2563eb'} />
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
          <RefreshControl refreshing={refreshing} onRefresh={onRefresh} tintColor="#2563eb" />
        }
        showsVerticalScrollIndicator={false}
      >
        {/* ─── OVERVIEW ─── */}
        {tab === 'overview' && dashboard && (
          <View className="gap-3">
            {/* Hero */}
            <View className="rounded-3xl p-5" style={{ backgroundColor: '#2563eb' }}>
              <Text className="text-[10px] uppercase tracking-wider text-white/80 font-extrabold">
                Month Revenue
              </Text>
              <Text className="text-white text-4xl font-extrabold mt-1">
                {formatPKRFull(dashboard.monthRevenue)}
              </Text>
              <View className="mt-3 pt-3 border-t border-white/20 flex-row justify-between">
                <View>
                  <Text className="text-[10px] font-extrabold uppercase text-white/70">Profit</Text>
                  <Text className="text-white text-lg font-extrabold mt-0.5">
                    {formatPKRFull(dashboard.monthProfit)}
                  </Text>
                </View>
                <View>
                  <Text className="text-[10px] font-extrabold uppercase text-white/70">COGS</Text>
                  <Text className="text-white text-lg font-extrabold mt-0.5">
                    {formatPKRFull(dashboard.monthCogs)}
                  </Text>
                </View>
                <View>
                  <Text className="text-[10px] font-extrabold uppercase text-white/70">Sales</Text>
                  <Text className="text-white text-lg font-extrabold mt-0.5">
                    {dashboard.monthSalesCount}
                  </Text>
                </View>
              </View>
            </View>

            {/* Inventory stats */}
            <View className="flex-row flex-wrap -mx-1.5">
              {[
                {
                  label: 'New Phones In Stock',
                  value: dashboard.newPhonesInStock,
                  sub: formatPKRFull(dashboard.newPhonesStockValue),
                  color: '#2563eb', bg: '#dbeafe',
                  icon: Smartphone,
                },
                {
                  label: 'Used Phones In Stock',
                  value: dashboard.usedPhonesInStock,
                  sub: formatPKRFull(dashboard.usedPhonesStockValue),
                  color: '#7c3aed', bg: '#ede9fe',
                  icon: RefreshCw,
                },
                {
                  label: 'PTA Tax Locked',
                  value: formatPKRFull(dashboard.ptaTaxLocked),
                  sub: 'In stock',
                  color: '#dc2626', bg: '#fee2e2',
                  icon: DollarSign,
                  isText: true,
                },
                {
                  label: 'Open Repair Tickets',
                  value: dashboard.openRepairTickets,
                  sub: 'Active',
                  color: '#ea580c', bg: '#ffedd5',
                  icon: Wrench,
                },
                {
                  label: 'Active EMI Plans',
                  value: dashboard.activeEmiPlans,
                  sub: 'Ongoing',
                  color: '#f59e0b', bg: '#fef3c7',
                  icon: CreditCard,
                },
                {
                  label: 'EMI Outstanding',
                  value: formatPKRFull(dashboard.emiOutstanding),
                  sub: 'Total due',
                  color: '#0891b2', bg: '#cffafe',
                  icon: Wallet,
                  isText: true,
                },
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
                        className="text-lg font-extrabold mt-1"
                        style={{ color: s.color }}
                        numberOfLines={1}
                      >
                        {s.isText ? s.value : String(s.value)}
                      </Text>
                      <Text className="text-[10px] font-bold mt-0.5" style={{ color: s.color, opacity: 0.7 }}>
                        {s.sub}
                      </Text>
                    </View>
                  </View>
                );
              })}
            </View>

            {/* Potential revenue */}
            <View className="rounded-2xl bg-emerald-50 border-2 border-emerald-300 p-4">
              <View className="flex-row items-center gap-2 mb-2">
                <TrendingUp size={16} color="#16a34a" />
                <Text className="text-xs font-extrabold uppercase text-emerald-700 tracking-wider">
                  Used Phones Potential Revenue
                </Text>
              </View>
              <Text className="text-2xl font-extrabold text-emerald-900">
                {formatPKRFull(dashboard.usedPhonesPotentialRevenue)}
              </Text>
            </View>
          </View>
        )}

        {/* ─── PTA BREAKDOWN ─── */}
        {tab === 'pta' && (
          <View className="gap-2">
            <Text className="text-xs uppercase font-extrabold text-neutral-500 tracking-wider mb-1">
              IMEI Stock by PTA Status
            </Text>
            {ptaBreakdown.length === 0 ? (
              <View className="items-center py-16">
                <Smartphone size={36} color="#d1d5db" />
                <Text className="mt-3 text-sm font-bold text-neutral-500">No IMEI data</Text>
              </View>
            ) : (
              ptaBreakdown.map((row) => {
                const cfg = PTA_STATUS_COLORS[row.ptaStatus];
                return (
                  <View
                    key={row.ptaStatus}
                    className="rounded-2xl border-2 p-3"
                    style={{ backgroundColor: cfg.bg, borderColor: cfg.border }}
                  >
                    <View className="flex-row items-center justify-between mb-2">
                      <Text className="text-sm font-extrabold" style={{ color: cfg.text }}>
                        {PTA_STATUS_LABELS[row.ptaStatus]}
                      </Text>
                      <Text className="text-2xl font-extrabold" style={{ color: cfg.text }}>
                        {row.count}
                      </Text>
                    </View>
                    <View className="pt-2 border-t border-white/40 flex-row justify-between">
                      <View>
                        <Text className="text-[10px] font-bold uppercase" style={{ color: cfg.text, opacity: 0.7 }}>
                          Stock Value
                        </Text>
                        <Text className="text-sm font-extrabold" style={{ color: cfg.text }}>
                          {formatPKRFull(row.stockValue)}
                        </Text>
                      </View>
                      <View>
                        <Text className="text-[10px] font-bold uppercase" style={{ color: cfg.text, opacity: 0.7 }}>
                          Tax Paid
                        </Text>
                        <Text className="text-sm font-extrabold" style={{ color: cfg.text }}>
                          {formatPKRFull(row.taxPaid)}
                        </Text>
                      </View>
                    </View>
                  </View>
                );
              })
            )}
          </View>
        )}

        {/* ─── TOP BRANDS ─── */}
        {tab === 'brands' && (
          <View>
            <View className="flex-row gap-2 mb-3">
              {[7, 30, 90].map((d) => {
                const active = days === d;
                return (
                  <Pressable
                    key={d}
                    onPress={() => setDays(d)}
                    className="flex-1 h-9 rounded-lg items-center justify-center"
                    style={{
                      backgroundColor: active ? '#f59e0b' : '#ffffff',
                      borderWidth: 2,
                      borderColor: active ? '#f59e0b' : '#e5e7eb',
                    }}
                  >
                    <Text className="text-xs font-bold" style={{ color: active ? '#ffffff' : '#374151' }}>
                      Last {d} days
                    </Text>
                  </Pressable>
                );
              })}
            </View>
            {topBrands.length === 0 ? (
              <View className="items-center py-16">
                <Award size={36} color="#d1d5db" />
                <Text className="mt-3 text-sm font-bold text-neutral-500">No brand data</Text>
              </View>
            ) : (
              <View className="gap-2">
                {topBrands.slice(0, 20).map((b, idx) => (
                  <View key={b.brandId} className="rounded-2xl bg-white border border-neutral-200 p-3 flex-row items-center gap-3">
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
                      <Text className="text-sm font-extrabold text-neutral-900">{b.brandName}</Text>
                      <View className="flex-row items-center gap-2 mt-0.5">
                        <Text className="text-[10px] text-neutral-500">{b.unitsSold} units</Text>
                        <Text className="text-[10px] text-emerald-700 font-bold">
                          {b.margin.toFixed(1)}% margin
                        </Text>
                      </View>
                    </View>
                    <View className="items-end">
                      <Text className="text-sm font-extrabold text-emerald-700">
                        {formatPKRFull(b.revenue)}
                      </Text>
                      <Text className="text-[10px] text-violet-700 font-bold">
                        +{formatPKRFull(b.profit)}
                      </Text>
                    </View>
                  </View>
                ))}
              </View>
            )}
          </View>
        )}

        {/* ─── REPAIRS ─── */}
        {tab === 'repairs' && repairAnalytics && (
          <View className="gap-3">
            <View className="rounded-3xl p-5" style={{ backgroundColor: '#ea580c' }}>
              <Text className="text-[10px] uppercase tracking-wider text-white/80 font-extrabold">
                Repair Revenue ({days} days)
              </Text>
              <Text className="text-white text-4xl font-extrabold mt-1">
                {formatPKRFull(repairAnalytics.totalRevenue)}
              </Text>
              <View className="mt-3 pt-3 border-t border-white/20 flex-row justify-between">
                <View>
                  <Text className="text-[10px] font-extrabold uppercase text-white/70">Delivered</Text>
                  <Text className="text-white text-lg font-extrabold mt-0.5">
                    {repairAnalytics.delivered}
                  </Text>
                </View>
                <View>
                  <Text className="text-[10px] font-extrabold uppercase text-white/70">Collected</Text>
                  <Text className="text-white text-sm font-extrabold mt-0.5">
                    {formatPKRFull(repairAnalytics.collected)}
                  </Text>
                </View>
                <View>
                  <Text className="text-[10px] font-extrabold uppercase text-white/70">Profit</Text>
                  <Text className="text-white text-sm font-extrabold mt-0.5">
                    {formatPKRFull(repairAnalytics.grossProfit)}
                  </Text>
                </View>
              </View>
            </View>

            {repairAnalytics.topBrands.length > 0 && (
              <View className="rounded-2xl bg-white border border-neutral-200 p-4">
                <Text className="text-xs uppercase font-extrabold text-neutral-500 tracking-wider mb-2">
                  Most Repaired Brands
                </Text>
                {repairAnalytics.topBrands.slice(0, 5).map((b, idx) => (
                  <View key={b.brand} className={`flex-row justify-between py-2 ${idx !== 4 ? 'border-b border-neutral-100' : ''}`}>
                    <Text className="text-sm font-bold text-neutral-800">{b.brand}</Text>
                    <Text className="text-sm font-extrabold text-neutral-900">{b.count} tickets</Text>
                  </View>
                ))}
              </View>
            )}
          </View>
        )}

        {/* ─── EMI ─── */}
        {tab === 'emi' && emiAnalytics && (
          <View className="gap-3">
            <View className="rounded-3xl p-5" style={{ backgroundColor: '#7c3aed' }}>
              <Text className="text-[10px] uppercase tracking-wider text-white/80 font-extrabold">
                EMI Outstanding
              </Text>
              <Text className="text-white text-4xl font-extrabold mt-1">
                {formatPKRFull(emiAnalytics.activeRemaining)}
              </Text>
              <View className="mt-3 pt-3 border-t border-white/20 flex-row justify-between">
                <View>
                  <Text className="text-[10px] font-extrabold uppercase text-white/70">Financed</Text>
                  <Text className="text-white text-sm font-extrabold mt-0.5">
                    {formatPKRFull(emiAnalytics.activeFinanced)}
                  </Text>
                </View>
                <View>
                  <Text className="text-[10px] font-extrabold uppercase text-white/70">This Month</Text>
                  <Text className="text-white text-sm font-extrabold mt-0.5">
                    {formatPKRFull(emiAnalytics.collectedThisMonth)}
                  </Text>
                </View>
              </View>
            </View>

            {emiAnalytics.overdueCount > 0 && (
              <View className="rounded-2xl bg-rose-50 border-2 border-rose-300 p-4">
                <View className="flex-row items-center gap-2 mb-2">
                  <AlertTriangle size={16} color="#dc2626" />
                  <Text className="text-xs font-extrabold uppercase text-rose-700 tracking-wider">
                    Overdue Alert
                  </Text>
                </View>
                <View className="flex-row justify-between">
                  <Text className="text-2xl font-extrabold text-rose-700">
                    {emiAnalytics.overdueCount}
                  </Text>
                  <Text className="text-2xl font-extrabold text-rose-700">
                    {formatPKRFull(emiAnalytics.overdueAmount)}
                  </Text>
                </View>
              </View>
            )}
          </View>
        )}

        {/* ─── USED PHONES ─── */}
        {tab === 'used' && usedAnalytics && (
          <View className="gap-3">
            <View className="rounded-3xl p-5" style={{ backgroundColor: '#0891b2' }}>
              <Text className="text-[10px] uppercase tracking-wider text-white/80 font-extrabold">
                Trade-in Profit ({days} days)
              </Text>
              <Text className="text-white text-4xl font-extrabold mt-1">
                {formatPKRFull(usedAnalytics.soldProfit)}
              </Text>
              <View className="mt-3 pt-3 border-t border-white/20 flex-row justify-between">
                <View>
                  <Text className="text-[10px] font-extrabold uppercase text-white/70">Sold</Text>
                  <Text className="text-white text-lg font-extrabold mt-0.5">
                    {usedAnalytics.soldCount}
                  </Text>
                </View>
                <View>
                  <Text className="text-[10px] font-extrabold uppercase text-white/70">Revenue</Text>
                  <Text className="text-white text-sm font-extrabold mt-0.5">
                    {formatPKRFull(usedAnalytics.soldRevenue)}
                  </Text>
                </View>
                <View>
                  <Text className="text-[10px] font-extrabold uppercase text-white/70">In Stock</Text>
                  <Text className="text-white text-lg font-extrabold mt-0.5">
                    {usedAnalytics.inStockCount}
                  </Text>
                </View>
              </View>
            </View>

            <View className="rounded-2xl bg-white border border-neutral-200 p-4">
              <Text className="text-xs uppercase font-extrabold text-neutral-500 tracking-wider mb-3">
                By Condition
              </Text>
              {usedAnalytics.byCondition.map((c, idx) => (
                <View
                  key={c.condition}
                  className={`flex-row items-center gap-3 py-2 ${idx !== usedAnalytics.byCondition.length - 1 ? 'border-b border-neutral-100' : ''}`}
                >
                  <View className="flex-1">
                    <Text className="text-sm font-bold text-neutral-800">{c.condition}</Text>
                    <Text className="text-[10px] text-neutral-500 mt-0.5">
                      Cost: {formatPKRFull(c.totalCost)} • Resale: {formatPKRFull(c.resalePrice)}
                    </Text>
                  </View>
                  <View className="items-end">
                    <Text className="text-lg font-extrabold text-neutral-900">{c.count}</Text>
                    <Text className="text-[10px] text-neutral-500 font-bold">units</Text>
                  </View>
                </View>
              ))}
            </View>
          </View>
        )}
      </ScrollView>
    </SafeAreaView>
  );
}
