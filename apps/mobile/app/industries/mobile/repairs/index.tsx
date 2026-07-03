import { useState, useMemo } from 'react';
import {
  View, Text, ScrollView, Pressable, TextInput, RefreshControl,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { useRouter, Stack } from 'expo-router';
import { useQuery } from '@tanstack/react-query';
import * as Haptics from 'expo-haptics';
import {
  ArrowLeft, Wrench, Search, X, Plus, Smartphone, Clock,
  User, Phone, AlertTriangle, CheckCircle2, XCircle,
  Sparkles, Zap, Package,
} from 'lucide-react-native';
import {
  repairsApi,
  REPAIR_STATUS_LABELS, REPAIR_STATUS_COLORS,
  REPAIR_PRIORITY_LABELS, REPAIR_PRIORITY_COLORS,
  type RepairStatus,
} from '@/api/repairs.api';
import { formatPKRFull } from '@/lib/format';
import { useSmartBack } from '@/hooks/useSmartBack';

const formatDate = (v: string) =>
  new Intl.DateTimeFormat('en-PK', { month: 'short', day: 'numeric' }).format(new Date(v));

type StatusFilter = 'all' | 'open' | RepairStatus;

export default function RepairTicketsScreen() {
  const router = useRouter();
  const goBack = useSmartBack();
  const [search, setSearch] = useState('');
  const [statusFilter, setStatusFilter] = useState<StatusFilter>('all');
  const [refreshing, setRefreshing] = useState(false);

  const { data: stats } = useQuery({
    queryKey: ['repair-stats'],
    queryFn: () => repairsApi.stats(),
  });

  const { data, refetch } = useQuery({
    queryKey: ['repair-tickets', statusFilter],
    queryFn: () =>
      repairsApi.list({
        status:
          statusFilter === 'all' || statusFilter === 'open'
            ? undefined
            : statusFilter,
        limit: 200,
      }),
  });

  const allTickets = data?.items ?? [];
  const tickets = useMemo(() => {
    if (statusFilter === 'open') {
      return allTickets.filter((t) =>
        !['DELIVERED', 'CANCELLED'].includes(t.status),
      );
    }
    return allTickets;
  }, [allTickets, statusFilter]);

  const onRefresh = async () => {
    setRefreshing(true);
    await refetch();
    setRefreshing(false);
  };

  const filtered = useMemo(() => {
    if (!search.trim()) return tickets;
    const q = search.toLowerCase().trim();
    return tickets.filter(
      (t) =>
        t.ticketNumber.toLowerCase().includes(q) ||
        t.customerName.toLowerCase().includes(q) ||
        t.customerPhone.toLowerCase().includes(q) ||
        t.deviceBrand.toLowerCase().includes(q) ||
        t.deviceModel.toLowerCase().includes(q) ||
        t.imei1?.toLowerCase().includes(q),
    );
  }, [tickets, search]);

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
          <ArrowLeft size={20} color="#ea580c" />
        </Pressable>
        <View className="flex-1">
          <Text className="text-2xl font-extrabold text-neutral-900 dark:text-white">
            Repair Tickets
          </Text>
          <Text className="text-xs text-neutral-500 mt-0.5">
            {stats?.openTickets ?? 0} open • {stats?.todayCount ?? 0} today
          </Text>
        </View>
      </View>

      <ScrollView
        contentContainerStyle={{ paddingBottom: 40 }}
        refreshControl={
          <RefreshControl refreshing={refreshing} onRefresh={onRefresh} tintColor="#ea580c" />
        }
        showsVerticalScrollIndicator={false}
      >
        {/* Hero */}
        <View className="mx-5 rounded-3xl p-5 mb-4" style={{ backgroundColor: '#ea580c' }}>
          <View className="flex-row items-center gap-2 mb-1">
            <Wrench size={12} color="rgba(255,255,255,0.8)" />
            <Text className="text-[10px] uppercase tracking-wider text-white/80 font-extrabold">
              This Month Revenue
            </Text>
          </View>
          <Text className="text-white text-4xl font-extrabold">
            {formatPKRFull(stats?.monthRevenue ?? 0)}
          </Text>
          <View className="mt-3 pt-3 border-t border-white/20 flex-row justify-between">
            <View>
              <Text className="text-[10px] font-extrabold uppercase text-white/70">Open</Text>
              <Text className="text-white text-lg font-extrabold mt-0.5">
                {stats?.openTickets ?? 0}
              </Text>
            </View>
            <View>
              <Text className="text-[10px] font-extrabold uppercase text-white/70">Delivered</Text>
              <Text className="text-white text-lg font-extrabold mt-0.5">
                {stats?.totalDelivered ?? 0}
              </Text>
            </View>
            <View>
              <Text className="text-[10px] font-extrabold uppercase text-white/70">Today</Text>
              <Text className="text-white text-lg font-extrabold mt-0.5">
                {stats?.todayCount ?? 0}
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
            { key: 'all' as StatusFilter, label: 'All', count: allTickets.length },
            { key: 'open' as StatusFilter, label: 'Open', count: stats?.openTickets ?? 0 },
            { key: 'RECEIVED' as StatusFilter, label: 'Received', count: statusCounts.get('RECEIVED') ?? 0 },
            { key: 'IN_PROGRESS' as StatusFilter, label: 'In Progress', count: statusCounts.get('IN_PROGRESS') ?? 0 },
            { key: 'READY' as StatusFilter, label: 'Ready', count: statusCounts.get('READY') ?? 0 },
            { key: 'DELIVERED' as StatusFilter, label: 'Delivered', count: statusCounts.get('DELIVERED') ?? 0 },
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
                  backgroundColor: active ? '#ea580c' : '#ffffff',
                  borderColor: active ? '#ea580c' : '#e5e7eb',
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
              placeholder="Search ticket #, customer, device, IMEI..."
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
              <View className="h-20 w-20 rounded-3xl bg-orange-100 items-center justify-center">
                <Wrench size={36} color="#ea580c" />
              </View>
              <Text className="mt-4 text-base font-bold text-neutral-900">
                {search || statusFilter !== 'all' ? 'No tickets match' : 'Abhi koi repair ticket nahi'}
              </Text>
              <Text className="text-xs text-neutral-500 mt-1">
                Customer ka phone accept karein
              </Text>
            </View>
          ) : (
            <View className="gap-2">
              {filtered.map((ticket) => {
                const statusCfg = REPAIR_STATUS_COLORS[ticket.status];
                const priorityCfg = REPAIR_PRIORITY_COLORS[ticket.priority];
                const isUrgent = ticket.priority !== 'NORMAL';
                return (
                  <Pressable
                    key={ticket.id}
                    onPress={() => {
                      Haptics.selectionAsync();
                      // router.push(`/industries/mobile/repairs/${ticket.id}` as any);
                    }}
                    className="rounded-2xl bg-white border-2 p-3 active:opacity-70"
                    style={{ borderColor: isUrgent ? '#fca5a5' : '#e5e7eb' }}
                  >
                    <View className="flex-row items-start gap-3">
                      <View className="h-14 w-14 rounded-2xl bg-orange-100 items-center justify-center shrink-0 relative">
                        <Smartphone size={24} color="#ea580c" />
                        {isUrgent && (
                          <View
                            className="absolute -top-1 -right-1 h-5 w-5 rounded-full items-center justify-center"
                            style={{ backgroundColor: priorityCfg.text }}
                          >
                            <AlertTriangle size={10} color="#ffffff" />
                          </View>
                        )}
                      </View>

                      <View className="flex-1 min-w-0">
                        <View className="flex-row items-center gap-1.5 flex-wrap">
                          <Text className="font-extrabold font-mono text-sm text-neutral-900">
                            {ticket.ticketNumber}
                          </Text>
                          <View className="px-1.5 py-0.5 rounded" style={{ backgroundColor: statusCfg.bg }}>
                            <Text className="text-[9px] font-extrabold" style={{ color: statusCfg.text }}>
                              {REPAIR_STATUS_LABELS[ticket.status]}
                            </Text>
                          </View>
                          {isUrgent && (
                            <View className="px-1.5 py-0.5 rounded" style={{ backgroundColor: priorityCfg.bg }}>
                              <Text className="text-[9px] font-extrabold" style={{ color: priorityCfg.text }}>
                                {REPAIR_PRIORITY_LABELS[ticket.priority]}
                              </Text>
                            </View>
                          )}
                        </View>
                        <Text className="text-sm font-extrabold text-neutral-900 mt-1">
                          {ticket.deviceBrand} {ticket.deviceModel}
                        </Text>
                        <View className="flex-row items-center gap-1 mt-0.5">
                          <User size={10} color="#64748b" />
                          <Text className="text-xs text-neutral-700 font-bold" numberOfLines={1}>
                            {ticket.customerName}
                          </Text>
                          <Text className="text-[10px] text-neutral-500">• {ticket.customerPhone}</Text>
                        </View>
                        <Text className="text-[10px] text-neutral-500 mt-0.5" numberOfLines={2}>
                          Issue: {ticket.reportedIssue}
                        </Text>
                        <View className="flex-row items-center gap-2 mt-1">
                          <Clock size={9} color="#9ca3af" />
                          <Text className="text-[10px] text-neutral-500">
                            {formatDate(ticket.receivedAt)}
                          </Text>
                        </View>
                      </View>

                      <View className="items-end">
                        <Text className="text-base font-extrabold text-emerald-700">
                          {formatPKRFull(ticket.totalCost || ticket.estimatedCost)}
                        </Text>
                        {ticket.balanceDue > 0 && (
                          <Text className="text-[10px] text-amber-700 font-extrabold">
                            Due: {formatPKRFull(ticket.balanceDue)}
                          </Text>
                        )}
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
