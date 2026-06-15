import { useState } from 'react';
import {
  View, Text, ScrollView, Pressable, Modal, TextInput, Alert,
  KeyboardAvoidingView, Platform,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { useRouter, Stack } from 'expo-router';
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import * as Haptics from 'expo-haptics';
import {
  ArrowLeft, Scissors, Plus, Phone, Calendar, X, Sparkles, Trash2,
} from 'lucide-react-native';
import {
  appointmentsApi, type AppointmentStatus, type CreateAppointmentPayload,
} from '@/api/appointments.api';
import { formatPKRFull } from '@/lib/format';
import Toast from 'react-native-toast-message';

const STATUS_CONFIG: Record<AppointmentStatus, { label: string; bg: string; text: string }> = {
  SCHEDULED: { label: 'Scheduled', bg: '#dbeafe', text: '#1d4ed8' },
  CONFIRMED: { label: 'Confirmed', bg: '#ede9fe', text: '#7c3aed' },
  IN_PROGRESS: { label: 'In Progress', bg: '#fef3c7', text: '#b45309' },
  COMPLETED: { label: 'Completed', bg: '#dcfce7', text: '#15803d' },
  CANCELLED: { label: 'Cancelled', bg: '#f1f5f9', text: '#475569' },
  NO_SHOW: { label: 'No Show', bg: '#fee2e2', text: '#b91c1c' },
};

export default function AppointmentsScreen() {
  const router = useRouter();
  const queryClient = useQueryClient();
  const [showAdd, setShowAdd] = useState(false);
  const [form, setForm] = useState<CreateAppointmentPayload>({
    customerName: '', customerPhone: '', serviceName: '', duration: 30, price: 0,
    startTime: new Date().toISOString().slice(0, 16),
  });

  const { data: stats } = useQuery({
    queryKey: ['appointments-stats'],
    queryFn: appointmentsApi.stats,
  });

  const { data: appointments = [] } = useQuery({
    queryKey: ['appointments-today'],
    queryFn: appointmentsApi.today,
  });

  const createMutation = useMutation({
    mutationFn: () => appointmentsApi.create(form),
    onSuccess: () => {
      Haptics.notificationAsync(Haptics.NotificationFeedbackType.Success);
      Toast.show({ type: 'success', text1: 'Appointment scheduled' });
      queryClient.invalidateQueries({ queryKey: ['appointments-today'] });
      queryClient.invalidateQueries({ queryKey: ['appointments-stats'] });
      setShowAdd(false);
      setForm({
        customerName: '', customerPhone: '', serviceName: '', duration: 30, price: 0,
        startTime: new Date().toISOString().slice(0, 16),
      });
    },
    onError: (e: any) => Toast.show({ type: 'error', text1: e?.response?.data?.message || 'Failed' }),
  });

  const statusMutation = useMutation({
    mutationFn: ({ id, status }: { id: string; status: AppointmentStatus }) =>
      appointmentsApi.updateStatus(id, status),
    onSuccess: () => {
      Haptics.selectionAsync();
      queryClient.invalidateQueries({ queryKey: ['appointments-today'] });
      queryClient.invalidateQueries({ queryKey: ['appointments-stats'] });
    },
  });

  const removeMutation = useMutation({
    mutationFn: (id: string) => appointmentsApi.remove(id),
    onSuccess: () => {
      Toast.show({ type: 'success', text1: 'Removed' });
      queryClient.invalidateQueries({ queryKey: ['appointments-today'] });
    },
  });

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
          <ArrowLeft size={20} color="#a855f7" />
        </Pressable>
        <View className="flex-1">
          <Text className="text-xl font-extrabold text-neutral-900 dark:text-white">Appointments</Text>
          <Text className="text-xs text-neutral-500">Today's bookings</Text>
        </View>
        <Pressable
          onPress={() => setShowAdd(true)}
          className="h-10 px-3 rounded-2xl flex-row items-center gap-1.5"
          style={{ backgroundColor: '#a855f7' }}
        >
          <Plus size={16} color="#ffffff" />
          <Text className="text-white font-bold text-sm">New</Text>
        </Pressable>
      </View>

      <ScrollView contentContainerStyle={{ padding: 20, paddingBottom: 60 }}>
        {/* Hero */}
        <View
          className="rounded-3xl p-5 mb-5"
          style={{
            backgroundColor: '#581c87',
            shadowColor: '#a855f7',
            shadowOpacity: 0.3,
            shadowRadius: 16,
            elevation: 8,
          }}
        >
          <View className="flex-row items-center gap-3 mb-4">
            <View className="h-14 w-14 rounded-2xl bg-white/20 items-center justify-center">
              <Scissors size={28} color="#ffffff" />
            </View>
            <View>
              <View className="self-start flex-row items-center gap-1.5 rounded-full bg-white/15 px-2.5 py-1">
                <Sparkles size={10} color="#fbbf24" />
                <Text className="text-[10px] font-bold text-white">Salon Module</Text>
              </View>
              <Text className="mt-2 text-2xl font-extrabold text-white">Appointments</Text>
            </View>
          </View>

          <View className="flex-row gap-2">
            <View className="flex-1 rounded-xl bg-white/10 p-2 items-center">
              <Text className="text-[10px] uppercase text-white/70 font-bold">Today</Text>
              <Text className="text-xl font-extrabold text-white">{stats?.today ?? 0}</Text>
            </View>
            <View className="flex-1 rounded-xl bg-blue-500/20 p-2 items-center">
              <Text className="text-[10px] uppercase text-blue-200 font-bold">Upcoming</Text>
              <Text className="text-xl font-extrabold text-blue-100">{stats?.upcoming ?? 0}</Text>
            </View>
            <View className="flex-1 rounded-xl bg-emerald-500/20 p-2 items-center">
              <Text className="text-[10px] uppercase text-emerald-200 font-bold">Done</Text>
              <Text className="text-xl font-extrabold text-emerald-100">{stats?.completed ?? 0}</Text>
            </View>
          </View>
        </View>

        {/* Today's appointments */}
        <View className="rounded-3xl bg-white dark:bg-neutral-900 border border-neutral-200 dark:border-neutral-800 overflow-hidden">
          <View className="px-4 py-3 bg-slate-50 dark:bg-neutral-800 border-b border-neutral-200 dark:border-neutral-700 flex-row items-center gap-2">
            <Calendar size={16} color="#737373" />
            <Text className="font-extrabold text-neutral-900 dark:text-white flex-1">
              Today's Schedule ({appointments.length})
            </Text>
          </View>

          {appointments.length === 0 ? (
            <View className="p-12 items-center">
              <Calendar size={40} color="#cbd5e1" />
              <Text className="mt-3 font-bold text-neutral-700">No appointments today</Text>
              <Text className="text-xs text-neutral-500 mt-1">Schedule your first one</Text>
            </View>
          ) : (
            appointments.map((apt) => {
              const cfg = STATUS_CONFIG[apt.status];
              return (
                <View
                  key={apt.id}
                  className="p-3 border-b border-neutral-100 dark:border-neutral-800 flex-row items-center gap-3"
                >
                  <View className="items-center">
                    <Text className="text-xs font-bold text-neutral-700">
                      {new Date(apt.startTime).toLocaleTimeString('en-PK', { hour: '2-digit', minute: '2-digit' })}
                    </Text>
                    <Text className="text-[10px] text-neutral-500">{apt.duration}m</Text>
                  </View>

                  <View className="flex-1 min-w-0">
                    <Text className="font-bold text-neutral-900 dark:text-white" numberOfLines={1}>
                      {apt.customerName}
                    </Text>
                    {apt.customerPhone && (
                      <View className="flex-row items-center gap-1 mt-0.5">
                        <Phone size={9} color="#737373" />
                        <Text className="text-[10px] text-neutral-500">{apt.customerPhone}</Text>
                      </View>
                    )}
                    <Text className="text-xs text-violet-700 font-semibold mt-0.5" numberOfLines={1}>
                      {apt.serviceName}
                    </Text>
                  </View>

                  <View className="items-end">
                    <Text className="font-extrabold text-emerald-700 text-sm">
                      {formatPKRFull(apt.price)}
                    </Text>
                    <View className="px-2 py-0.5 rounded-md mt-1" style={{ backgroundColor: cfg.bg }}>
                      <Text className="text-[9px] font-bold" style={{ color: cfg.text }}>
                        {cfg.label}
                      </Text>
                    </View>
                  </View>

                  <Pressable
                    onPress={() => {
                      Alert.alert('Change Status', 'Select new status:', [
                        ...(Object.keys(STATUS_CONFIG) as AppointmentStatus[]).map((s) => ({
                          text: STATUS_CONFIG[s].label,
                          onPress: () => statusMutation.mutate({ id: apt.id, status: s }),
                        })),
                        { text: 'Delete', style: 'destructive' as const, onPress: () => removeMutation.mutate(apt.id) },
                        { text: 'Cancel', style: 'cancel' as const },
                      ]);
                    }}
                    hitSlop={8}
                    className="h-8 w-8 rounded-lg bg-neutral-100 items-center justify-center"
                  >
                    <Text className="text-neutral-600 text-lg leading-none">⋯</Text>
                  </Pressable>
                </View>
              );
            })
          )}
        </View>
      </ScrollView>

      {/* Add Modal */}
      <Modal
        visible={showAdd}
        animationType="slide"
        presentationStyle="formSheet"
        onRequestClose={() => setShowAdd(false)}
      >
        <SafeAreaView className="flex-1 bg-neutral-50">
          <KeyboardAvoidingView
            behavior={Platform.OS === 'ios' ? 'padding' : 'height'}
            className="flex-1"
          >
            <View className="px-5 py-4 border-b border-neutral-200 flex-row items-center gap-3">
              <View className="h-10 w-10 rounded-2xl items-center justify-center" style={{ backgroundColor: '#a855f7' }}>
                <Scissors size={18} color="#ffffff" />
              </View>
              <Text className="flex-1 text-lg font-bold text-neutral-900">New Appointment</Text>
              <Pressable onPress={() => setShowAdd(false)} hitSlop={12} className="h-10 w-10 rounded-2xl bg-neutral-100 items-center justify-center">
                <X size={20} color="#6b7280" />
              </Pressable>
            </View>

            <ScrollView contentContainerStyle={{ padding: 20 }} keyboardShouldPersistTaps="handled">
              <View className="gap-3">
                <View>
                  <Text className="text-xs font-bold uppercase text-neutral-600 mb-1.5">Customer Name *</Text>
                  <TextInput
                    value={form.customerName}
                    onChangeText={(t) => setForm({ ...form, customerName: t })}
                    placeholder="Customer name"
                    placeholderTextColor="#9ca3af"
                    autoFocus
                    className="h-12 rounded-2xl border-2 border-neutral-200 bg-white px-4 text-base"
                  />
                </View>
                <View>
                  <Text className="text-xs font-bold uppercase text-neutral-600 mb-1.5">Phone</Text>
                  <TextInput
                    value={form.customerPhone}
                    onChangeText={(t) => setForm({ ...form, customerPhone: t })}
                    placeholder="03XXXXXXXXX"
                    placeholderTextColor="#9ca3af"
                    keyboardType="phone-pad"
                    className="h-12 rounded-2xl border-2 border-neutral-200 bg-white px-4 text-base"
                  />
                </View>
                <View>
                  <Text className="text-xs font-bold uppercase text-neutral-600 mb-1.5">Service *</Text>
                  <TextInput
                    value={form.serviceName}
                    onChangeText={(t) => setForm({ ...form, serviceName: t })}
                    placeholder="Haircut, Facial..."
                    placeholderTextColor="#9ca3af"
                    className="h-12 rounded-2xl border-2 border-neutral-200 bg-white px-4 text-base"
                  />
                </View>
                <View className="flex-row gap-3">
                  <View className="flex-1">
                    <Text className="text-xs font-bold uppercase text-neutral-600 mb-1.5">Duration (min)</Text>
                    <TextInput
                      value={String(form.duration)}
                      onChangeText={(t) => setForm({ ...form, duration: Number(t) || 30 })}
                      keyboardType="numeric"
                      className="h-12 rounded-2xl border-2 border-neutral-200 bg-white px-4 text-base font-bold"
                    />
                  </View>
                  <View className="flex-1">
                    <Text className="text-xs font-bold uppercase text-neutral-600 mb-1.5">Price</Text>
                    <TextInput
                      value={String(form.price || '')}
                      onChangeText={(t) => setForm({ ...form, price: Number(t) || 0 })}
                      keyboardType="numeric"
                      placeholder="0"
                      placeholderTextColor="#9ca3af"
                      className="h-12 rounded-2xl border-2 border-neutral-200 bg-white px-4 text-base font-bold"
                    />
                  </View>
                </View>
                <View>
                  <Text className="text-xs font-bold uppercase text-neutral-600 mb-1.5">Start Time *</Text>
                  <TextInput
                    value={form.startTime}
                    onChangeText={(t) => setForm({ ...form, startTime: t })}
                    placeholder="YYYY-MM-DDTHH:MM"
                    placeholderTextColor="#9ca3af"
                    className="h-12 rounded-2xl border-2 border-neutral-200 bg-white px-4 text-base font-mono"
                  />
                </View>
              </View>
            </ScrollView>

            <View className="px-5 py-4 border-t border-neutral-200 bg-white">
              <Pressable
                onPress={() => createMutation.mutate()}
                disabled={createMutation.isPending || !form.customerName.trim() || !form.serviceName.trim()}
                className="h-14 rounded-2xl items-center justify-center"
                style={{
                  backgroundColor:
                    createMutation.isPending || !form.customerName.trim() || !form.serviceName.trim()
                      ? '#9ca3af'
                      : '#a855f7',
                  shadowColor: '#a855f7',
                  shadowOpacity: 0.4,
                  shadowRadius: 12,
                  elevation: 6,
                }}
              >
                <Text className="text-white font-extrabold text-base">
                  {createMutation.isPending ? 'Scheduling...' : 'Schedule Appointment'}
                </Text>
              </Pressable>
            </View>
          </KeyboardAvoidingView>
        </SafeAreaView>
      </Modal>
    </SafeAreaView>
  );
}
