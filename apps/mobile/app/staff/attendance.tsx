import { useState, useMemo } from 'react';
import {
  View, Text, ScrollView, Pressable, TextInput, Image, RefreshControl,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { useRouter, Stack } from 'expo-router';
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import * as Haptics from 'expo-haptics';
import {
  ArrowLeft, CheckCircle2, XCircle, Clock, Coffee,
  Search, Calendar, Sparkles, UserCheck, UserX,
} from 'lucide-react-native';
import { staffApi, type AttendanceStatus } from '@/api/staff.api';
import Toast from 'react-native-toast-message';

const statusConfig: Record<AttendanceStatus, { label: string; color: string; bg: string; icon: any }> = {
  PRESENT: { label: 'Present', color: '#16a34a', bg: '#dcfce7', icon: CheckCircle2 },
  LATE: { label: 'Late', color: '#f59e0b', bg: '#fef3c7', icon: Clock },
  ABSENT: { label: 'Absent', color: '#dc2626', bg: '#fee2e2', icon: XCircle },
  HALF_DAY: { label: 'Half Day', color: '#0ea5e9', bg: '#e0f2fe', icon: Clock },
  ON_LEAVE: { label: 'On Leave', color: '#7c3aed', bg: '#ede9fe', icon: Coffee },
  HOLIDAY: { label: 'Holiday', color: '#64748b', bg: '#f1f5f9', icon: Calendar },
};

export default function AttendanceScreen() {
  const router = useRouter();
  const queryClient = useQueryClient();
  const [search, setSearch] = useState('');
  const [refreshing, setRefreshing] = useState(false);

  const { data: staff = [], refetch: refetchStaff } = useQuery({
    queryKey: ['staff-list-active'],
    queryFn: () => staffApi.list({ status: 'ACTIVE' }),
  });

  const { data: todayAttendance = [], refetch: refetchAttendance } = useQuery({
    queryKey: ['attendance-today'],
    queryFn: staffApi.todayAttendance,
  });

  const today = new Date().toISOString().split('T')[0];

  const attendanceMap = useMemo(() => {
    const map = new Map();
    todayAttendance.forEach((a) => map.set(a.staffId, a));
    return map;
  }, [todayAttendance]);

  const filteredStaff = useMemo(() => {
    if (!search) return staff;
    const q = search.toLowerCase();
    return staff.filter(
      (s) =>
        s.fullName.toLowerCase().includes(q) ||
        s.designation.toLowerCase().includes(q),
    );
  }, [staff, search]);

  const onRefresh = async () => {
    setRefreshing(true);
    await Promise.all([refetchStaff(), refetchAttendance()]);
    setRefreshing(false);
  };

  const checkInMutation = useMutation({
    mutationFn: (staffId: string) =>
      staffApi.markAttendance({
        staffId,
        date: today,
        checkIn: new Date().toISOString(),
        status: 'PRESENT',
      }),
    onSuccess: () => {
      Haptics.notificationAsync(Haptics.NotificationFeedbackType.Success);
      Toast.show({ type: 'success', text1: 'Check-in marked' });
      queryClient.invalidateQueries({ queryKey: ['attendance-today'] });
      queryClient.invalidateQueries({ queryKey: ['staff-stats'] });
    },
  });

  const checkOutMutation = useMutation({
    mutationFn: (staffId: string) =>
      staffApi.markAttendance({
        staffId,
        date: today,
        checkOut: new Date().toISOString(),
      }),
    onSuccess: () => {
      Haptics.notificationAsync(Haptics.NotificationFeedbackType.Success);
      Toast.show({ type: 'success', text1: 'Check-out marked' });
      queryClient.invalidateQueries({ queryKey: ['attendance-today'] });
    },
  });

  const markStatusMutation = useMutation({
    mutationFn: ({ staffId, status }: { staffId: string; status: AttendanceStatus }) =>
      staffApi.markAttendance({ staffId, date: today, status }),
    onSuccess: () => {
      Toast.show({ type: 'success', text1: 'Status updated' });
      queryClient.invalidateQueries({ queryKey: ['attendance-today'] });
      queryClient.invalidateQueries({ queryKey: ['staff-stats'] });
    },
  });

  const presentCount = todayAttendance.filter((a) => a.status === 'PRESENT' || a.status === 'LATE').length;
  const absentCount = staff.length - presentCount;

  return (
    <SafeAreaView className="flex-1 bg-neutral-50 dark:bg-neutral-950" edges={['top']}>
      <Stack.Screen options={{ headerShown: false }} />

      <View className="px-5 pt-4 pb-3 flex-row items-center gap-3">
        <Pressable
          onPress={() => router.back()}
          hitSlop={12}
          className="h-10 w-10 rounded-2xl bg-white border border-neutral-200 items-center justify-center"
        >
          <ArrowLeft size={20} color="#0ea5e9" />
        </Pressable>
        <View className="flex-1">
          <View className="flex-row items-center gap-1.5">
            <Sparkles size={11} color="#f59e0b" />
            <Text className="text-[10px] uppercase tracking-wider text-amber-700 font-extrabold">
              Daily Attendance
            </Text>
          </View>
          <Text className="text-xl font-bold text-neutral-900 dark:text-white">
            {new Date().toLocaleDateString('en-PK', { weekday: 'long', day: 'numeric', month: 'short' })}
          </Text>
        </View>
      </View>

      {/* Stats */}
      <View className="px-5 pb-3 flex-row gap-3">
        <View
          className="flex-1 rounded-2xl p-3 flex-row items-center gap-2"
          style={{ backgroundColor: '#dcfce7' }}
        >
          <UserCheck size={20} color="#16a34a" />
          <View>
            <Text className="text-2xl font-extrabold text-emerald-900">{presentCount}</Text>
            <Text className="text-[10px] uppercase tracking-wider text-emerald-700 font-bold">Present</Text>
          </View>
        </View>
        <View
          className="flex-1 rounded-2xl p-3 flex-row items-center gap-2"
          style={{ backgroundColor: '#fee2e2' }}
        >
          <UserX size={20} color="#dc2626" />
          <View>
            <Text className="text-2xl font-extrabold text-rose-900">{absentCount}</Text>
            <Text className="text-[10px] uppercase tracking-wider text-rose-700 font-bold">Absent</Text>
          </View>
        </View>
      </View>

      {/* Search */}
      <View className="px-5 pb-3">
        <View className="flex-row items-center gap-2 rounded-2xl border border-neutral-200 bg-white px-4 h-12">
          <Search size={18} color="#9ca3af" />
          <TextInput
            placeholder="Search staff..."
            placeholderTextColor="#9ca3af"
            value={search}
            onChangeText={setSearch}
            className="flex-1 text-sm text-neutral-900"
          />
        </View>
      </View>

      <ScrollView
        contentContainerStyle={{ paddingHorizontal: 20, paddingBottom: 80 }}
        refreshControl={<RefreshControl refreshing={refreshing} onRefresh={onRefresh} tintColor="#0ea5e9" />}
      >
        {filteredStaff.length === 0 ? (
          <View className="items-center py-12">
            <UserCheck size={36} color="#9ca3af" />
            <Text className="mt-3 font-bold text-neutral-700">No active staff</Text>
          </View>
        ) : (
          <View className="gap-2.5">
            {filteredStaff.map((s) => {
              const att = attendanceMap.get(s.id);
              const cfg = att ? statusConfig[att.status as AttendanceStatus] : null;
              const Icon = cfg?.icon;
              const hasCheckedIn = !!att?.checkIn;
              const hasCheckedOut = !!att?.checkOut;

              return (
                <View
                  key={s.id}
                  className="rounded-2xl bg-white dark:bg-neutral-900 border-2 overflow-hidden"
                  style={{ borderColor: att ? '#16a34a' : '#e5e7eb' }}
                >
                  <View className="p-3 flex-row items-center gap-3">
                    {s.avatarUrl ? (
                      <Image source={{ uri: s.avatarUrl }} className="h-12 w-12 rounded-2xl" resizeMode="cover" />
                    ) : (
                      <View
                        className="h-12 w-12 rounded-2xl items-center justify-center"
                        style={{ backgroundColor: '#7c3aed' }}
                      >
                        <Text className="text-white text-lg font-extrabold">
                          {s.fullName.charAt(0).toUpperCase()}
                        </Text>
                      </View>
                    )}
                    <View className="flex-1 min-w-0">
                      <Text className="font-bold text-neutral-900" numberOfLines={1}>
                        {s.fullName}
                      </Text>
                      <Text className="text-xs text-violet-700 font-bold mt-0.5">{s.designation}</Text>
                      {att && Icon && cfg && (
                        <View
                          className="self-start mt-1 px-2 py-0.5 rounded-md flex-row items-center gap-1"
                          style={{ backgroundColor: cfg.bg }}
                        >
                          <Icon size={10} color={cfg.color} />
                          <Text className="text-[9px] font-bold" style={{ color: cfg.color }}>
                            {cfg.label}
                          </Text>
                        </View>
                      )}
                    </View>
                  </View>

                  {att && (hasCheckedIn || hasCheckedOut) && (
                    <View className="px-3 pb-2 flex-row gap-2">
                      <View className="flex-1 rounded-lg bg-slate-50 p-2">
                        <Text className="text-[9px] uppercase tracking-wider text-slate-500 font-bold">In</Text>
                        <Text className="text-sm font-bold text-slate-900">
                          {hasCheckedIn ? new Date(att.checkIn!).toLocaleTimeString('en-PK', { hour: '2-digit', minute: '2-digit' }) : '—'}
                        </Text>
                      </View>
                      <View className="flex-1 rounded-lg bg-slate-50 p-2">
                        <Text className="text-[9px] uppercase tracking-wider text-slate-500 font-bold">Out</Text>
                        <Text className="text-sm font-bold text-slate-900">
                          {hasCheckedOut ? new Date(att.checkOut!).toLocaleTimeString('en-PK', { hour: '2-digit', minute: '2-digit' }) : '—'}
                        </Text>
                      </View>
                    </View>
                  )}

                  <View className="px-3 pb-3 pt-1 flex-row gap-2">
                    {!hasCheckedIn ? (
                      <Pressable
                        onPress={() => checkInMutation.mutate(s.id)}
                        disabled={checkInMutation.isPending}
                        className="flex-1 h-10 rounded-lg flex-row items-center justify-center gap-1"
                        style={{ backgroundColor: '#16a34a' }}
                      >
                        <CheckCircle2 size={14} color="#ffffff" />
                        <Text className="text-white font-bold text-xs">Check In</Text>
                      </Pressable>
                    ) : !hasCheckedOut ? (
                      <Pressable
                        onPress={() => checkOutMutation.mutate(s.id)}
                        disabled={checkOutMutation.isPending}
                        className="flex-1 h-10 rounded-lg flex-row items-center justify-center gap-1"
                        style={{ backgroundColor: '#0ea5e9' }}
                      >
                        <Clock size={14} color="#ffffff" />
                        <Text className="text-white font-bold text-xs">Check Out</Text>
                      </Pressable>
                    ) : (
                      <View className="flex-1 h-10 rounded-lg bg-emerald-100 items-center justify-center">
                        <Text className="text-emerald-700 font-bold text-xs">✓ Complete</Text>
                      </View>
                    )}

                    <Pressable
                      onPress={() => {
                        // Quick status menu
                        Haptics.selectionAsync();
                      }}
                      className="h-10 px-3 rounded-lg bg-neutral-100 items-center justify-center"
                    >
                      <Text className="text-xs font-bold text-neutral-700">Status</Text>
                    </Pressable>
                  </View>

                  {/* Quick status buttons */}
                  <View className="px-3 pb-3 flex-row flex-wrap gap-1.5">
                    {(['ABSENT', 'LATE', 'HALF_DAY', 'ON_LEAVE'] as AttendanceStatus[]).map((status) => {
                      const cfg = statusConfig[status];
                      const isActive = att?.status === status;
                      return (
                        <Pressable
                          key={status}
                          onPress={() => markStatusMutation.mutate({ staffId: s.id, status })}
                          className="px-2.5 h-7 rounded-md items-center justify-center"
                          style={{ backgroundColor: isActive ? cfg.color : cfg.bg }}
                        >
                          <Text
                            className="text-[10px] font-bold"
                            style={{ color: isActive ? '#ffffff' : cfg.color }}
                          >
                            {cfg.label}
                          </Text>
                        </Pressable>
                      );
                    })}
                  </View>
                </View>
              );
            })}
          </View>
        )}
      </ScrollView>
    </SafeAreaView>
  );
}
