import { useMemo, useState } from 'react';
import {
  View, Text, ScrollView, Pressable, Modal, TextInput, Alert,
  KeyboardAvoidingView, Platform,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { useRouter, Stack } from 'expo-router';
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import * as Haptics from 'expo-haptics';
import {
  ArrowLeft, Utensils, Plus, Users, Clock, CheckCircle2, AlertCircle,
  Trash2, X, Sparkles, MapPin, RefreshCw, Edit3,
} from 'lucide-react-native';
import {
  tablesApi, type RestaurantTable, type TableStatus, type CreateTablePayload,
} from '@/api/tables.api';
import Toast from 'react-native-toast-message';

const STATUS_CONFIG: Record<TableStatus, { label: string; bg: string; border: string; text: string; icon: any }> = {
  AVAILABLE: { label: 'Available', bg: '#dcfce7', border: '#86efac', text: '#15803d', icon: CheckCircle2 },
  OCCUPIED: { label: 'Occupied', bg: '#fee2e2', border: '#fca5a5', text: '#b91c1c', icon: Users },
  RESERVED: { label: 'Reserved', bg: '#fef3c7', border: '#fcd34d', text: '#b45309', icon: Clock },
  CLEANING: { label: 'Cleaning', bg: '#dbeafe', border: '#93c5fd', text: '#1d4ed8', icon: RefreshCw },
  OUT_OF_SERVICE: { label: 'Out', bg: '#f1f5f9', border: '#cbd5e1', text: '#475569', icon: AlertCircle },
};

export default function TablesScreen() {
  const router = useRouter();
  const queryClient = useQueryClient();
  const [showAdd, setShowAdd] = useState(false);
  const [editingTable, setEditingTable] = useState<RestaurantTable | null>(null);
  const [form, setForm] = useState<CreateTablePayload>({
    tableNumber: '', name: '', capacity: 4, floor: '', zone: '', notes: '',
  });

  const { data: tables = [] } = useQuery({
    queryKey: ['restaurant-tables'],
    queryFn: () => tablesApi.list(),
  });

  const { data: stats } = useQuery({
    queryKey: ['restaurant-tables-stats'],
    queryFn: tablesApi.stats,
  });

  const groupedByFloor = useMemo(() => {
    const groups: Record<string, RestaurantTable[]> = {};
    tables.forEach((t) => {
      const floor = t.floor || 'Main Floor';
      if (!groups[floor]) groups[floor] = [];
      groups[floor].push(t);
    });
    return groups;
  }, [tables]);

  const createMutation = useMutation({
    mutationFn: () => tablesApi.create(form),
    onSuccess: () => {
      Haptics.notificationAsync(Haptics.NotificationFeedbackType.Success);
      Toast.show({ type: 'success', text1: 'Table added' });
      queryClient.invalidateQueries({ queryKey: ['restaurant-tables'] });
      queryClient.invalidateQueries({ queryKey: ['restaurant-tables-stats'] });
      resetForm();
    },
    onError: (e: any) => Toast.show({ type: 'error', text1: e?.response?.data?.message || 'Failed' }),
  });

  const updateMutation = useMutation({
    mutationFn: () => tablesApi.update(editingTable!.id, form),
    onSuccess: () => {
      Haptics.notificationAsync(Haptics.NotificationFeedbackType.Success);
      Toast.show({ type: 'success', text1: 'Table updated' });
      queryClient.invalidateQueries({ queryKey: ['restaurant-tables'] });
      resetForm();
    },
  });

  const statusMutation = useMutation({
    mutationFn: ({ id, status }: { id: string; status: TableStatus }) =>
      tablesApi.updateStatus(id, status),
    onSuccess: () => {
      Haptics.selectionAsync();
      queryClient.invalidateQueries({ queryKey: ['restaurant-tables'] });
      queryClient.invalidateQueries({ queryKey: ['restaurant-tables-stats'] });
    },
  });

  const removeMutation = useMutation({
    mutationFn: (id: string) => tablesApi.remove(id),
    onSuccess: () => {
      Toast.show({ type: 'success', text1: 'Table removed' });
      queryClient.invalidateQueries({ queryKey: ['restaurant-tables'] });
    },
  });

  const resetForm = () => {
    setShowAdd(false);
    setEditingTable(null);
    setForm({ tableNumber: '', name: '', capacity: 4, floor: '', zone: '', notes: '' });
  };

  const openEdit = (t: RestaurantTable) => {
    setEditingTable(t);
    setForm({
      tableNumber: t.tableNumber,
      name: t.name || '',
      capacity: t.capacity,
      floor: t.floor || '',
      zone: t.zone || '',
      notes: t.notes || '',
    });
    setShowAdd(true);
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
          <ArrowLeft size={20} color="#ea580c" />
        </Pressable>
        <View className="flex-1">
          <Text className="text-xl font-extrabold text-neutral-900 dark:text-white">Tables</Text>
          <Text className="text-xs text-neutral-500">Floor plan & seating</Text>
        </View>
        <Pressable
          onPress={() => setShowAdd(true)}
          className="h-10 px-3 rounded-2xl flex-row items-center gap-1.5"
          style={{ backgroundColor: '#ea580c' }}
        >
          <Plus size={16} color="#ffffff" />
          <Text className="text-white font-bold text-sm">Add</Text>
        </Pressable>
      </View>

      <ScrollView contentContainerStyle={{ padding: 20, paddingBottom: 60 }}>
        {/* Hero */}
        <View
          className="rounded-3xl p-5 mb-5"
          style={{
            backgroundColor: '#7c2d12',
            shadowColor: '#ea580c',
            shadowOpacity: 0.3,
            shadowRadius: 16,
            elevation: 8,
          }}
        >
          <View className="flex-row items-center gap-3 mb-4">
            <View className="h-14 w-14 rounded-2xl bg-white/20 items-center justify-center">
              <Utensils size={28} color="#ffffff" />
            </View>
            <View>
              <View className="self-start flex-row items-center gap-1.5 rounded-full bg-white/15 px-2.5 py-1">
                <Sparkles size={10} color="#fbbf24" />
                <Text className="text-[10px] font-bold text-white">Restaurant Module</Text>
              </View>
              <Text className="mt-2 text-2xl font-extrabold text-white">Floor Plan</Text>
            </View>
          </View>

          <View className="flex-row gap-2">
            <View className="flex-1 rounded-xl bg-white/10 p-2 items-center">
              <Text className="text-[10px] uppercase text-white/70 font-bold">Total</Text>
              <Text className="text-xl font-extrabold text-white">{stats?.total ?? 0}</Text>
            </View>
            <View className="flex-1 rounded-xl bg-emerald-500/20 p-2 items-center">
              <Text className="text-[10px] uppercase text-emerald-200 font-bold">Free</Text>
              <Text className="text-xl font-extrabold text-emerald-100">{stats?.available ?? 0}</Text>
            </View>
            <View className="flex-1 rounded-xl bg-rose-500/20 p-2 items-center">
              <Text className="text-[10px] uppercase text-rose-200 font-bold">Busy</Text>
              <Text className="text-xl font-extrabold text-rose-100">{stats?.occupied ?? 0}</Text>
            </View>
            <View className="flex-1 rounded-xl bg-amber-500/20 p-2 items-center">
              <Text className="text-[10px] uppercase text-amber-200 font-bold">Reserved</Text>
              <Text className="text-xl font-extrabold text-amber-100">{stats?.reserved ?? 0}</Text>
            </View>
          </View>
        </View>

        {/* Tables grouped by floor */}
        {tables.length === 0 ? (
          <View className="rounded-3xl bg-white border-2 border-dashed border-neutral-300 p-12 items-center">
            <Utensils size={40} color="#cbd5e1" />
            <Text className="mt-3 font-extrabold text-neutral-900">No tables yet</Text>
            <Text className="text-xs text-neutral-500 mt-1">Add tables to manage your restaurant</Text>
            <Pressable
              onPress={() => setShowAdd(true)}
              className="mt-4 h-11 px-5 rounded-2xl flex-row items-center gap-2"
              style={{ backgroundColor: '#ea580c' }}
            >
              <Plus size={16} color="#ffffff" />
              <Text className="text-white font-bold text-sm">Add First Table</Text>
            </Pressable>
          </View>
        ) : (
          Object.entries(groupedByFloor).map(([floor, floorTables]) => (
            <View key={floor} className="rounded-3xl bg-white dark:bg-neutral-900 border border-neutral-200 dark:border-neutral-800 mb-4 overflow-hidden">
              <View className="px-4 py-3 bg-slate-50 dark:bg-neutral-800 border-b border-neutral-200 dark:border-neutral-700 flex-row items-center gap-2">
                <MapPin size={14} color="#737373" />
                <Text className="font-extrabold text-neutral-900 dark:text-white">{floor}</Text>
                <Text className="text-xs text-neutral-500">({floorTables.length} tables)</Text>
              </View>

              <View className="p-3 flex-row flex-wrap -m-1">
                {floorTables.map((table) => {
                  const cfg = STATUS_CONFIG[table.status];
                  const Icon = cfg.icon;
                  return (
                    <View key={table.id} className="w-1/3 p-1">
                      <View
                        className="rounded-2xl border-2 p-3 items-center"
                        style={{ backgroundColor: cfg.bg, borderColor: cfg.border }}
                      >
                        <View className="absolute top-1 right-1 flex-row gap-1">
                          <Pressable
                            onPress={() => openEdit(table)}
                            className="h-6 w-6 rounded-md bg-white items-center justify-center"
                          >
                            <Edit3 size={11} color="#475569" />
                          </Pressable>
                          <Pressable
                            onPress={() => {
                              Alert.alert('Delete', `Remove ${table.tableNumber}?`, [
                                { text: 'Cancel', style: 'cancel' },
                                { text: 'Delete', style: 'destructive', onPress: () => removeMutation.mutate(table.id) },
                              ]);
                            }}
                            className="h-6 w-6 rounded-md bg-white items-center justify-center"
                          >
                            <Trash2 size={11} color="#dc2626" />
                          </Pressable>
                        </View>

                        <Icon size={18} color={cfg.text} />
                        <Text className="font-extrabold text-base mt-1" style={{ color: cfg.text }}>
                          {table.tableNumber}
                        </Text>
                        {table.name && (
                          <Text className="text-[10px] text-neutral-600 text-center" numberOfLines={1}>
                            {table.name}
                          </Text>
                        )}
                        <View className="flex-row items-center gap-1 mt-1 px-2 py-0.5 rounded-full bg-white/60">
                          <Users size={10} color={cfg.text} />
                          <Text className="text-[9px] font-bold" style={{ color: cfg.text }}>
                            {table.capacity}
                          </Text>
                        </View>

                        {/* Status selector */}
                        <View className="mt-2 w-full flex-row flex-wrap -m-0.5">
                          {(Object.keys(STATUS_CONFIG) as TableStatus[]).map((s) => {
                            const active = table.status === s;
                            const sCfg = STATUS_CONFIG[s];
                            return (
                              <View key={s} className="w-1/2 p-0.5">
                                <Pressable
                                  onPress={() => statusMutation.mutate({ id: table.id, status: s })}
                                  className="h-5 rounded items-center justify-center"
                                  style={{
                                    backgroundColor: active ? sCfg.text : 'rgba(255,255,255,0.5)',
                                  }}
                                >
                                  <Text
                                    className="text-[8px] font-bold"
                                    style={{ color: active ? '#ffffff' : sCfg.text }}
                                  >
                                    {sCfg.label.toUpperCase()}
                                  </Text>
                                </Pressable>
                              </View>
                            );
                          })}
                        </View>
                      </View>
                    </View>
                  );
                })}
              </View>
            </View>
          ))
        )}
      </ScrollView>

      {/* Add/Edit Modal */}
      <Modal
        visible={showAdd}
        animationType="slide"
        presentationStyle="formSheet"
        onRequestClose={resetForm}
      >
        <SafeAreaView className="flex-1 bg-neutral-50 dark:bg-neutral-950">
          <KeyboardAvoidingView
            behavior={Platform.OS === 'ios' ? 'padding' : 'height'}
            className="flex-1"
          >
            <View className="px-5 py-4 border-b border-neutral-200 flex-row items-center gap-3">
              <View className="h-10 w-10 rounded-2xl items-center justify-center" style={{ backgroundColor: '#ea580c' }}>
                <Utensils size={18} color="#ffffff" />
              </View>
              <Text className="flex-1 text-lg font-bold text-neutral-900 dark:text-white">
                {editingTable ? 'Edit Table' : 'New Table'}
              </Text>
              <Pressable onPress={resetForm} hitSlop={12} className="h-10 w-10 rounded-2xl bg-neutral-100 items-center justify-center">
                <X size={20} color="#6b7280" />
              </Pressable>
            </View>

            <ScrollView contentContainerStyle={{ padding: 20 }} keyboardShouldPersistTaps="handled">
              <View className="gap-3">
                <View>
                  <Text className="text-xs font-bold uppercase text-neutral-600 mb-1.5">Table Number *</Text>
                  <TextInput
                    value={form.tableNumber}
                    onChangeText={(t) => setForm({ ...form, tableNumber: t })}
                    placeholder="T-1, VIP-1..."
                    placeholderTextColor="#9ca3af"
                    autoFocus
                    className="h-12 rounded-2xl border-2 border-neutral-200 bg-white px-4 text-base"
                  />
                </View>
                <View>
                  <Text className="text-xs font-bold uppercase text-neutral-600 mb-1.5">Display Name</Text>
                  <TextInput
                    value={form.name}
                    onChangeText={(t) => setForm({ ...form, name: t })}
                    placeholder="Window seat..."
                    placeholderTextColor="#9ca3af"
                    className="h-12 rounded-2xl border-2 border-neutral-200 bg-white px-4 text-base"
                  />
                </View>
                <View>
                  <Text className="text-xs font-bold uppercase text-neutral-600 mb-1.5">Capacity *</Text>
                  <TextInput
                    value={String(form.capacity)}
                    onChangeText={(t) => setForm({ ...form, capacity: Number(t) || 1 })}
                    keyboardType="numeric"
                    placeholder="4"
                    placeholderTextColor="#9ca3af"
                    className="h-12 rounded-2xl border-2 border-neutral-200 bg-white px-4 text-base font-bold"
                  />
                </View>
                <View className="flex-row gap-3">
                  <View className="flex-1">
                    <Text className="text-xs font-bold uppercase text-neutral-600 mb-1.5">Floor</Text>
                    <TextInput
                      value={form.floor}
                      onChangeText={(t) => setForm({ ...form, floor: t })}
                      placeholder="Ground..."
                      placeholderTextColor="#9ca3af"
                      className="h-12 rounded-2xl border-2 border-neutral-200 bg-white px-4 text-base"
                    />
                  </View>
                  <View className="flex-1">
                    <Text className="text-xs font-bold uppercase text-neutral-600 mb-1.5">Zone</Text>
                    <TextInput
                      value={form.zone}
                      onChangeText={(t) => setForm({ ...form, zone: t })}
                      placeholder="Indoor, AC..."
                      placeholderTextColor="#9ca3af"
                      className="h-12 rounded-2xl border-2 border-neutral-200 bg-white px-4 text-base"
                    />
                  </View>
                </View>
              </View>
            </ScrollView>

            <View className="px-5 py-4 border-t border-neutral-200 bg-white">
              <Pressable
                onPress={() => (editingTable ? updateMutation.mutate() : createMutation.mutate())}
                disabled={createMutation.isPending || updateMutation.isPending || !form.tableNumber.trim()}
                className="h-14 rounded-2xl items-center justify-center"
                style={{
                  backgroundColor: !form.tableNumber.trim() ? '#9ca3af' : '#ea580c',
                  shadowColor: '#ea580c',
                  shadowOpacity: 0.4,
                  shadowRadius: 12,
                  elevation: 6,
                }}
              >
                <Text className="text-white font-extrabold text-base">
                  {createMutation.isPending || updateMutation.isPending ? 'Saving...' : editingTable ? 'Save Changes' : 'Add Table'}
                </Text>
              </Pressable>
            </View>
          </KeyboardAvoidingView>
        </SafeAreaView>
      </Modal>
    </SafeAreaView>
  );
}
