import { useState, useMemo } from 'react';
import {
  View, Text, ScrollView, Pressable, TextInput, RefreshControl, Image,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { useRouter, Stack, Link } from 'expo-router';
import { useQuery } from '@tanstack/react-query';
import * as Haptics from 'expo-haptics';
import {
  Users, Plus, Search, ArrowLeft, X, Phone, Briefcase,
  Calendar, UserCheck, UserX, Coffee, Sparkles, ChevronRight,
  Building2, Wallet, CheckCircle2, TrendingUp,
} from 'lucide-react-native';
import { staffApi, type StaffStatus } from '@/api/staff.api';
import { formatPKRFull } from '@/lib/format';

const statusConfig: Record<StaffStatus, { label: string; color: string; bg: string }> = {
  ACTIVE: { label: 'Active', color: '#16a34a', bg: '#dcfce7' },
  ON_LEAVE: { label: 'On Leave', color: '#f59e0b', bg: '#fef3c7' },
  SUSPENDED: { label: 'Suspended', color: '#dc2626', bg: '#fee2e2' },
  TERMINATED: { label: 'Terminated', color: '#64748b', bg: '#f1f5f9' },
  RESIGNED: { label: 'Resigned', color: '#64748b', bg: '#f1f5f9' },
};

const salaryLabels: Record<string, string> = {
  MONTHLY: 'Monthly',
  DAILY: 'Per Day',
  HOURLY: 'Per Hour',
  PER_TASK: 'Per Task',
  COMMISSION: 'Commission',
  HYBRID: 'Hybrid',
};

export default function StaffListScreen() {
  const router = useRouter();
  const [search, setSearch] = useState('');
  const [statusFilter, setStatusFilter] = useState<StaffStatus | 'all'>('all');
  const [refreshing, setRefreshing] = useState(false);

  const { data: staff = [], refetch } = useQuery({
    queryKey: ['staff-list', search, statusFilter],
    queryFn: () => staffApi.list({
      search: search || undefined,
      status: statusFilter === 'all' ? undefined : statusFilter,
    }),
  });

  const { data: stats } = useQuery({
    queryKey: ['staff-stats'],
    queryFn: staffApi.stats,
  });

  const onRefresh = async () => {
    setRefreshing(true);
    await refetch();
    setRefreshing(false);
  };

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
          <ArrowLeft size={20} color="#7c3aed" />
        </Pressable>
        <View className="flex-1">
          <View className="flex-row items-center gap-1.5">
            <Sparkles size={11} color="#f59e0b" />
            <Text className="text-[10px] uppercase tracking-wider text-amber-700 font-extrabold">
              Staff Management
            </Text>
          </View>
          <Text className="text-2xl font-bold text-neutral-900 dark:text-white">Your Team</Text>
        </View>
      </View>

      {/* Stats */}
      <ScrollView
        horizontal
        showsHorizontalScrollIndicator={false}
        contentContainerStyle={{ paddingHorizontal: 20, gap: 8 }}
        style={{ maxHeight: 90 }}
      >
        <StatCard label="Total" value={stats?.total ?? 0} icon={Users} color="#7c3aed" />
        <StatCard label="Active" value={stats?.active ?? 0} icon={UserCheck} color="#16a34a" />
        <StatCard label="On Leave" value={stats?.onLeave ?? 0} icon={Coffee} color="#f59e0b" />
        <StatCard label="Present" value={stats?.presentToday ?? 0} icon={CheckCircle2} color="#0ea5e9" />
        <StatCard label="Absent" value={stats?.absentToday ?? 0} icon={UserX} color="#dc2626" last />
      </ScrollView>

      {/* Quick Actions */}
      <View className="px-5 pt-3 pb-3 flex-row gap-2">
        <Link href={"/staff/attendance" as any} asChild>
          <Pressable
            className="flex-1 h-12 rounded-2xl flex-row items-center justify-center gap-1.5 active:opacity-80"
            style={{ backgroundColor: '#0ea5e9', shadowColor: '#0ea5e9', shadowOpacity: 0.3, shadowRadius: 8, elevation: 4 }}
          >
            <CheckCircle2 size={16} color="#ffffff" />
            <Text className="text-white font-extrabold text-sm">Attendance</Text>
          </Pressable>
        </Link>
        <Link href={"/staff/salary/new" as any} asChild>
          <Pressable
            className="flex-1 h-12 rounded-2xl flex-row items-center justify-center gap-1.5 active:opacity-80"
            style={{ backgroundColor: '#16a34a', shadowColor: '#16a34a', shadowOpacity: 0.3, shadowRadius: 8, elevation: 4 }}
          >
            <Wallet size={16} color="#ffffff" />
            <Text className="text-white font-extrabold text-sm">Salary</Text>
          </Pressable>
        </Link>
      </View>

      {/* Search */}
      <View className="px-5 pb-3">
        <View className="flex-row items-center gap-2 rounded-2xl border border-neutral-200 dark:border-neutral-800 bg-white dark:bg-neutral-900 px-4 h-12">
          <Search size={18} color="#9ca3af" />
          <TextInput
            placeholder="Search by name, phone, designation..."
            placeholderTextColor="#9ca3af"
            value={search}
            onChangeText={setSearch}
            className="flex-1 text-sm text-neutral-900 dark:text-white"
          />
          {search.length > 0 && (
            <Pressable
              onPress={() => setSearch('')}
              hitSlop={12}
              className="h-7 w-7 rounded-full bg-neutral-100 dark:bg-neutral-800 items-center justify-center"
            >
              <X size={14} color="#9ca3af" />
            </Pressable>
          )}
        </View>
      </View>

      {/* Status Filter */}
      <ScrollView
        horizontal
        showsHorizontalScrollIndicator={false}
        contentContainerStyle={{ paddingHorizontal: 20, gap: 6 }}
        style={{ maxHeight: 44 }}
      >
        <Pressable
          onPress={() => setStatusFilter('all')}
          className="px-3 h-8 rounded-lg items-center justify-center"
          style={{ backgroundColor: statusFilter === 'all' ? '#7c3aed' : '#f3f4f6' }}
        >
          <Text
            className="text-xs font-bold"
            style={{ color: statusFilter === 'all' ? '#ffffff' : '#374151' }}
          >
            All
          </Text>
        </Pressable>
        {(Object.keys(statusConfig) as StaffStatus[]).map((s) => (
          <Pressable
            key={s}
            onPress={() => {
              Haptics.selectionAsync();
              setStatusFilter(s);
            }}
            className="px-3 h-8 rounded-lg items-center justify-center"
            style={{
              backgroundColor: statusFilter === s ? statusConfig[s].color : '#f3f4f6',
            }}
          >
            <Text
              className="text-xs font-bold"
              style={{ color: statusFilter === s ? '#ffffff' : '#374151' }}
            >
              {statusConfig[s].label}
            </Text>
          </Pressable>
        ))}
      </ScrollView>

      {/* List */}
      <ScrollView
        contentContainerStyle={{ paddingHorizontal: 20, paddingTop: 12, paddingBottom: 100 }}
        refreshControl={<RefreshControl refreshing={refreshing} onRefresh={onRefresh} tintColor="#7c3aed" />}
      >
        {staff.length === 0 ? (
          <View className="items-center py-16">
            <View className="h-20 w-20 rounded-3xl bg-violet-100 items-center justify-center">
              <Users size={36} color="#7c3aed" />
            </View>
            <Text className="mt-4 font-bold text-neutral-900 dark:text-white">
              {search ? 'No staff found' : 'Add your first employee'}
            </Text>
            <Text className="text-xs text-neutral-500 mt-1">
              {search ? 'Try different search' : 'Tap + button below'}
            </Text>
          </View>
        ) : (
          <View className="gap-2.5">
            {staff.map((s) => (
              <Pressable
                key={s.id}
                onPress={() => {
                  Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
                  router.push(`/staff/${s.id}` as any);
                }}
                className="rounded-3xl bg-white dark:bg-neutral-900 border border-neutral-200 dark:border-neutral-800 p-4 active:opacity-70"
              >
                <View className="flex-row items-start gap-3">
                  {/* Avatar */}
                  <View className="relative">
                    {s.avatarUrl ? (
                      <Image source={{ uri: s.avatarUrl }} className="h-14 w-14 rounded-2xl" resizeMode="cover" />
                    ) : (
                      <View
                        className="h-14 w-14 rounded-2xl items-center justify-center"
                        style={{
                          backgroundColor: '#7c3aed',
                          shadowColor: '#7c3aed',
                          shadowOpacity: 0.3,
                          shadowRadius: 6,
                          elevation: 3,
                        }}
                      >
                        <Text className="text-white text-2xl font-extrabold">
                          {s.fullName.charAt(0).toUpperCase()}
                        </Text>
                      </View>
                    )}
                    <View
                      className="absolute -bottom-0.5 -right-0.5 h-4 w-4 rounded-full border-2 border-white"
                      style={{
                        backgroundColor:
                          s.status === 'ACTIVE' ? '#16a34a' :
                          s.status === 'ON_LEAVE' ? '#f59e0b' :
                          s.status === 'SUSPENDED' ? '#dc2626' : '#9ca3af',
                      }}
                    />
                  </View>

                  <View className="flex-1 min-w-0">
                    <View className="flex-row items-center gap-2">
                      <Text className="font-extrabold text-neutral-900 dark:text-white flex-1" numberOfLines={1}>
                        {s.fullName}
                      </Text>
                      <View
                        className="px-2 py-0.5 rounded-md"
                        style={{ backgroundColor: statusConfig[s.status].bg }}
                      >
                        <Text className="text-[9px] font-bold" style={{ color: statusConfig[s.status].color }}>
                          {statusConfig[s.status].label}
                        </Text>
                      </View>
                    </View>
                    <Text className="text-xs font-bold text-violet-700 dark:text-violet-400 mt-0.5">
                      {s.designation}
                    </Text>
                    <Text className="text-[10px] text-neutral-500 font-mono mt-0.5">
                      {s.staffNumber}
                    </Text>

                    <View className="mt-2 flex-row items-center gap-3 flex-wrap">
                      <View className="flex-row items-center gap-1">
                        <Phone size={10} color="#9ca3af" />
                        <Text className="text-[11px] text-neutral-600 dark:text-neutral-400">{s.phone}</Text>
                      </View>
                      {s.shop && (
                        <View className="flex-row items-center gap-1">
                          <Building2 size={10} color="#9ca3af" />
                          <Text className="text-[11px] text-neutral-600 dark:text-neutral-400" numberOfLines={1}>
                            {s.shop.name}
                          </Text>
                        </View>
                      )}
                    </View>

                    <View className="mt-2 pt-2 border-t border-neutral-100 dark:border-neutral-800 flex-row items-center justify-between">
                      <View>
                        <Text className="text-[9px] uppercase tracking-wider text-neutral-500 font-bold">
                          {salaryLabels[s.salaryType]}
                        </Text>
                        <Text className="text-base font-extrabold text-emerald-700 mt-0.5">
                          {formatPKRFull(s.baseSalary)}
                        </Text>
                      </View>
                      <ChevronRight size={18} color="#9ca3af" />
                    </View>
                  </View>
                </View>
              </Pressable>
            ))}
          </View>
        )}
      </ScrollView>

      {/* FAB */}
      <Link href={"/staff/new" as any} asChild>
        <Pressable
          className="absolute bottom-6 right-6 h-14 w-14 rounded-2xl items-center justify-center active:opacity-80"
          style={{
            backgroundColor: '#7c3aed',
            shadowColor: '#7c3aed',
            shadowOpacity: 0.4,
            shadowRadius: 12,
            shadowOffset: { width: 0, height: 4 },
            elevation: 8,
          }}
        >
          <Plus size={26} color="#ffffff" />
        </Pressable>
      </Link>
    </SafeAreaView>
  );
}

function StatCard({ label, value, icon: Icon, color, last }: { label: string; value: number; icon: any; color: string; last?: boolean }) {
  return (
    <View
      className="rounded-2xl bg-white dark:bg-neutral-900 border border-neutral-200 dark:border-neutral-800 p-3"
      style={{ width: 110, marginRight: last ? 20 : 0 }}
    >
      <View className="h-8 w-8 rounded-lg items-center justify-center" style={{ backgroundColor: `${color}20` }}>
        <Icon size={16} color={color} />
      </View>
      <Text className="text-[10px] uppercase tracking-wider text-neutral-500 font-bold mt-2">{label}</Text>
      <Text className="text-2xl font-extrabold text-neutral-900 dark:text-white mt-0.5">{value}</Text>
    </View>
  );
}
