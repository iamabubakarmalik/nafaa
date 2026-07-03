import { useState, useMemo } from 'react';
import {
  View, Text, ScrollView, Pressable, RefreshControl, Modal, TextInput,
  KeyboardAvoidingView, Platform, Alert, Linking,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { useRouter, Stack } from 'expo-router';
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import * as Haptics from 'expo-haptics';
import {
  ArrowLeft, Store, Plus, Trash2, Sparkles, X, Check, Crown,
  MapPin, Phone, Building2, Warehouse, Package, Edit3, Search,
  Globe, MessageCircle, UserPlus, Mail, Lock, Eye, EyeOff,
  ShieldCheck, AlertCircle, TrendingUp, Activity, Info, Save,
} from 'lucide-react-native';
import { shopsApi, type Shop, type ShopType } from '@/api/shops.api';
import { useAuthStore } from '@/store/auth.store';
import { formatPKRFull } from '@/lib/format';
import { useSmartBack } from '@/hooks/useSmartBack';
import Toast from 'react-native-toast-message';

const shopTypeConfig: Record<ShopType, {
  label: string; icon: any; color: string; bg: string; description: string;
}> = {
  SHOP: {
    label: 'Retail Shop', icon: Building2,
    color: '#4f46e5', bg: '#e0e7ff',
    description: 'POS + sales + customers',
  },
  WAREHOUSE: {
    label: 'Warehouse', icon: Warehouse,
    color: '#d97706', bg: '#fef3c7',
    description: 'Storage + transfers only',
  },
  GODOWN: {
    label: 'Godown', icon: Package,
    color: '#8b5cf6', bg: '#ede9fe',
    description: 'Backup storage',
  },
};

export default function ShopsScreen() {
  const router = useRouter();
  const goBack = useSmartBack();
  const queryClient = useQueryClient();
  const { user } = useAuthStore();
  const isOwner = user?.role === 'OWNER' || user?.role === 'SUPER_ADMIN';

  const [refreshing, setRefreshing] = useState(false);
  const [search, setSearch] = useState('');

  const [showForm, setShowForm] = useState(false);
  const [editing, setEditing] = useState<Shop | null>(null);
  const [createManager, setCreateManager] = useState(false);
  const [showPassword, setShowPassword] = useState(false);

  const [form, setForm] = useState({
    name: '', address: '', phone: '', isMain: false,
    type: 'SHOP' as ShopType,
    managerName: '', managerEmail: '', managerPhone: '', managerPassword: '',
  });

  const { data: shops = [], refetch } = useQuery({
    queryKey: ['shops'],
    queryFn: async () => {
      try {
        return await shopsApi.list();
      } catch {
        return [];
      }
    },
  });

  const { data: overview = [] } = useQuery({
    queryKey: ['shops-overview'],
    queryFn: async () => {
      try {
        return await shopsApi.overview();
      } catch {
        return [];
      }
    },
    enabled: isOwner,
  });

  const overviewMap = useMemo(() => {
    const map: Record<string, any> = {};
    overview.forEach((o) => { map[o.id] = o; });
    return map;
  }, [overview]);

  const onRefresh = async () => {
    setRefreshing(true);
    await refetch();
    setRefreshing(false);
  };

  const closeForm = () => {
    setShowForm(false);
    setEditing(null);
    setCreateManager(false);
    setShowPassword(false);
    setForm({
      name: '', address: '', phone: '', isMain: false, type: 'SHOP',
      managerName: '', managerEmail: '', managerPhone: '', managerPassword: '',
    });
  };

  const openCreate = () => {
    if (!isOwner) {
      Toast.show({ type: 'error', text1: 'Sirf Owner shop create kar sakta hai' });
      return;
    }
    setEditing(null);
    setForm({
      name: '', address: '', phone: '',
      isMain: shops.length === 0,
      type: 'SHOP',
      managerName: '', managerEmail: '', managerPhone: '', managerPassword: '',
    });
    setShowForm(true);
  };

  const openEdit = (shop: Shop) => {
    if (!isOwner) {
      Toast.show({ type: 'error', text1: 'Sirf Owner shop edit kar sakta hai' });
      return;
    }
    setEditing(shop);
    setCreateManager(false);
    setForm({
      name: shop.name,
      address: shop.address || '',
      phone: shop.phone || '',
      isMain: shop.isMain,
      type: shop.type,
      managerName: '', managerEmail: '', managerPhone: '', managerPassword: '',
    });
    setShowForm(true);
  };

  const createMutation = useMutation({
    mutationFn: () => {
      const payload: any = {
        name: form.name.trim(),
        address: form.address.trim() || undefined,
        phone: form.phone.trim() || undefined,
        isMain: form.isMain,
        type: form.type,
      };
      if (createManager) {
        payload.managerName = form.managerName.trim();
        payload.managerEmail = form.managerEmail.trim();
        payload.managerPhone = form.managerPhone.trim() || undefined;
        payload.managerPassword = form.managerPassword;
      }
      return shopsApi.create(payload);
    },
    onSuccess: (data: any) => {
      Haptics.notificationAsync(Haptics.NotificationFeedbackType.Success);
      if (data.manager) {
        Toast.show({
          type: 'success',
          text1: 'Shop + Manager created!',
          text2: `Manager: ${data.manager.fullName}`,
        });
      } else {
        Toast.show({ type: 'success', text1: '✅ Shop created!' });
      }
      closeForm();
      queryClient.invalidateQueries({ queryKey: ['shops'] });
      queryClient.invalidateQueries({ queryKey: ['shops-overview'] });
      queryClient.invalidateQueries({ queryKey: ['team'] });
    },
    onError: (e: any) =>
      Toast.show({ type: 'error', text1: e?.response?.data?.message || 'Failed' }),
  });

  const updateMutation = useMutation({
    mutationFn: () => {
      if (!editing) throw new Error('No shop selected');
      return shopsApi.update(editing.id, {
        name: form.name.trim(),
        address: form.address.trim() || undefined,
        phone: form.phone.trim() || undefined,
        isMain: form.isMain,
        type: form.type,
      });
    },
    onSuccess: () => {
      Toast.show({ type: 'success', text1: 'Shop updated' });
      closeForm();
      queryClient.invalidateQueries({ queryKey: ['shops'] });
      queryClient.invalidateQueries({ queryKey: ['shops-overview'] });
    },
    onError: (e: any) =>
      Toast.show({ type: 'error', text1: e?.response?.data?.message || 'Update failed' }),
  });

  const toggleMutation = useMutation({
    mutationFn: shopsApi.toggleActive,
    onSuccess: () => {
      Toast.show({ type: 'success', text1: 'Status updated' });
      queryClient.invalidateQueries({ queryKey: ['shops'] });
    },
  });

  const deleteMutation = useMutation({
    mutationFn: shopsApi.remove,
    onSuccess: () => {
      Toast.show({ type: 'success', text1: 'Deleted' });
      queryClient.invalidateQueries({ queryKey: ['shops'] });
    },
    onError: (e: any) =>
      Toast.show({ type: 'error', text1: e?.response?.data?.message || 'Cannot delete' }),
  });

  const handleSubmit = () => {
    if (!form.name.trim()) {
      Toast.show({ type: 'error', text1: 'Shop name required' });
      return;
    }
    if (!editing && createManager) {
      if (!form.managerName.trim()) return Toast.show({ type: 'error', text1: 'Manager name required' });
      if (!form.managerEmail.trim()) return Toast.show({ type: 'error', text1: 'Manager email required' });
      if (form.managerPassword.length < 8) return Toast.show({ type: 'error', text1: 'Password min 8 chars' });
    }

    if (editing) {
      updateMutation.mutate();
    } else {
      createMutation.mutate();
    }
  };

  const handleDelete = (shop: Shop) => {
    Alert.alert('Delete Shop?', `"${shop.name}" ko delete karna chahte hain?`, [
      { text: 'Cancel', style: 'cancel' },
      { text: 'Delete', style: 'destructive', onPress: () => deleteMutation.mutate(shop.id) },
    ]);
  };

  const filtered = useMemo(() => {
    const q = search.toLowerCase().trim();
    if (!q) return shops;
    return shops.filter((s) =>
      s.name.toLowerCase().includes(q) ||
      (s.address || '').toLowerCase().includes(q) ||
      (s.phone || '').toLowerCase().includes(q),
    );
  }, [shops, search]);

  const stats = useMemo(() => ({
    total: shops.length,
    shops: shops.filter((s) => s.type === 'SHOP').length,
    warehouses: shops.filter((s) => s.type === 'WAREHOUSE' || s.type === 'GODOWN').length,
    hasMain: shops.some((s) => s.isMain),
  }), [shops]);

  return (
    <SafeAreaView className="flex-1 bg-neutral-50 dark:bg-neutral-950" edges={['top']}>
      <Stack.Screen options={{ headerShown: false }} />

      {/* Header */}
      <View className="px-5 pt-4 pb-3 flex-row items-center gap-3">
        <Pressable
          onPress={goBack}
          hitSlop={12}
          className="h-10 w-10 rounded-2xl bg-white dark:bg-neutral-900 items-center justify-center border border-neutral-200"
        >
          <ArrowLeft size={20} color="#4f46e5" />
        </Pressable>
        <View className="flex-1">
          <Text className="text-2xl font-extrabold text-neutral-900 dark:text-white">
            Shops / Branches
          </Text>
          <View className="flex-row items-center gap-1.5 mt-0.5">
            <Sparkles size={11} color="#4f46e5" />
            <Text className="text-xs text-neutral-500">{shops.length} locations</Text>
          </View>
        </View>
        {isOwner && (
          <Pressable
            onPress={openCreate}
            className="h-11 px-4 rounded-2xl flex-row items-center gap-1.5 active:opacity-80"
            style={{
              backgroundColor: '#4f46e5',
              shadowColor: '#4f46e5',
              shadowOpacity: 0.3,
              shadowRadius: 8,
              elevation: 4,
            }}
          >
            <Plus size={16} color="#ffffff" />
            <Text className="text-white font-bold text-sm">New</Text>
          </Pressable>
        )}
      </View>

      <ScrollView
        contentContainerStyle={{ paddingBottom: 40 }}
        refreshControl={
          <RefreshControl refreshing={refreshing} onRefresh={onRefresh} tintColor="#4f46e5" />
        }
        showsVerticalScrollIndicator={false}
      >
        {/* Hero */}
        <View className="mx-5 rounded-3xl p-5 mb-4" style={{
          backgroundColor: '#4f46e5',
          shadowColor: '#4f46e5',
          shadowOpacity: 0.3,
          shadowRadius: 16,
          elevation: 10,
        }}>
          <View className="flex-row items-center gap-3">
            <View className="h-14 w-14 rounded-2xl bg-white/20 items-center justify-center">
              <Building2 size={28} color="#ffffff" />
            </View>
            <View className="flex-1">
              <Text className="text-[10px] uppercase tracking-wider text-white/80 font-extrabold">
                Multi-Branch Setup
              </Text>
              <Text className="text-white text-3xl font-extrabold mt-0.5">
                {shops.length} Locations
              </Text>
              <Text className="text-xs text-white/80 mt-0.5">
                Manage all branches from one app
              </Text>
            </View>
          </View>
        </View>

        {/* Stats grid */}
        <View className="px-5 mb-3">
          <View className="flex-row flex-wrap -mx-1.5">
            {[
              { label: 'Total', value: stats.total, color: '#4f46e5', bg: '#e0e7ff', icon: Globe },
              { label: 'Retail Shops', value: stats.shops, color: '#16a34a', bg: '#dcfce7', icon: Building2 },
              { label: 'Warehouses', value: stats.warehouses, color: '#d97706', bg: '#fef3c7', icon: Warehouse },
              { label: 'Main Branch', value: stats.hasMain ? '✓ Set' : '⚠ Not Set', color: '#8b5cf6', bg: '#ede9fe', icon: Crown, isText: true },
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
                      className={s.isText ? 'text-lg font-extrabold mt-0.5' : 'text-2xl font-extrabold mt-0.5'}
                      style={{ color: s.color }}
                    >
                      {s.value}
                    </Text>
                  </View>
                </View>
              );
            })}
          </View>
        </View>

        {/* Info banner */}
        <View className="mx-5 rounded-2xl bg-indigo-50 border-2 border-indigo-200 p-4 mb-3">
          <View className="flex-row items-start gap-3">
            <View className="h-10 w-10 rounded-xl bg-indigo-600 items-center justify-center shrink-0">
              <Info size={18} color="#ffffff" />
            </View>
            <View className="flex-1">
              <Text className="font-extrabold text-indigo-900 text-sm">Multi-Shop Setup</Text>
              <Text className="text-xs text-slate-700 mt-1">
                Har shop ka apna stock, cash register, staff aur reports — sab automatic track hota hai.
              </Text>
            </View>
          </View>
        </View>

        {/* Search */}
        {shops.length > 0 && (
          <View className="px-5 mb-3">
            <View className="flex-row items-center gap-2 rounded-2xl border border-neutral-200 bg-white px-4 h-12">
              <Search size={18} color="#9ca3af" />
              <TextInput
                placeholder="Search shops..."
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
        )}

        {/* Shops list */}
        <View className="px-5">
          {filtered.length === 0 ? (
            <View className="items-center py-16">
              <View className="h-20 w-20 rounded-3xl bg-indigo-100 items-center justify-center">
                <Building2 size={36} color="#4f46e5" />
              </View>
              <Text className="mt-4 text-base font-bold text-neutral-900">
                {search ? 'No matches' : 'No shops yet'}
              </Text>
              <Text className="text-xs text-neutral-500 mt-1 text-center">
                {search ? 'Try different search' : 'Apni first shop add karein'}
              </Text>
              {!search && isOwner && (
                <Pressable
                  onPress={openCreate}
                  className="mt-4 h-11 px-5 rounded-xl flex-row items-center gap-2"
                  style={{ backgroundColor: '#4f46e5' }}
                >
                  <Plus size={16} color="#ffffff" />
                  <Text className="text-white font-bold text-sm">Add First Shop</Text>
                </Pressable>
              )}
            </View>
          ) : (
            <View className="gap-2.5">
              {filtered.map((shop) => {
                const typeCfg = shopTypeConfig[shop.type];
                const TypeIcon = typeCfg.icon;
                const shopStats = overviewMap[shop.id];
                return (
                  <View
                    key={shop.id}
                    className="rounded-2xl border-2 overflow-hidden"
                    style={{
                      backgroundColor: shop.isMain ? '#fefce8' : '#ffffff',
                      borderColor: shop.isMain ? '#fcd34d' : (shop.isActive === false ? '#fca5a5' : '#e5e7eb'),
                    }}
                  >
                    {shop.isMain && (
                      <View
                        className="absolute top-0 right-0 px-3 py-1 flex-row items-center gap-1 rounded-bl-2xl"
                        style={{ backgroundColor: '#f59e0b' }}
                      >
                        <Crown size={10} color="#ffffff" fill="#ffffff" />
                        <Text className="text-[9px] font-extrabold text-white">MAIN</Text>
                      </View>
                    )}

                    <View className="p-4">
                      <View className="flex-row items-start gap-3">
                        <View
                          className="h-14 w-14 rounded-2xl items-center justify-center shrink-0"
                          style={{ backgroundColor: typeCfg.bg }}
                        >
                          <TypeIcon size={24} color={typeCfg.color} />
                        </View>
                        <View className="flex-1 min-w-0">
                          <Text className="text-base font-extrabold text-neutral-900" numberOfLines={1}>
                            {shop.name}
                          </Text>
                          <View className="flex-row items-center gap-1.5 flex-wrap mt-1">
                            <View
                              className="px-2 py-0.5 rounded-full"
                              style={{ backgroundColor: typeCfg.bg }}
                            >
                              <Text className="text-[10px] font-extrabold" style={{ color: typeCfg.color }}>
                                {typeCfg.label}
                              </Text>
                            </View>
                            {shop.isActive === false && (
                              <View className="px-2 py-0.5 rounded-full bg-rose-100">
                                <Text className="text-[10px] font-extrabold text-rose-700">INACTIVE</Text>
                              </View>
                            )}
                          </View>
                        </View>
                      </View>

                      {(shop.address || shop.phone) && (
                        <View className="mt-3 gap-1.5">
                          {shop.address && (
                            <View className="flex-row items-center gap-2">
                              <MapPin size={12} color="#dc2626" />
                              <Text className="text-xs font-semibold text-neutral-700 flex-1" numberOfLines={2}>
                                {shop.address}
                              </Text>
                            </View>
                          )}
                          {shop.phone && (
                            <Pressable
                              onPress={() => Linking.openURL(`tel:${shop.phone}`)}
                              className="flex-row items-center gap-2"
                            >
                              <Phone size={12} color="#2563eb" />
                              <Text className="text-xs font-semibold text-blue-700">{shop.phone}</Text>
                            </Pressable>
                          )}
                        </View>
                      )}

                      {/* Today's stats (Owner only) */}
                      {shopStats && isOwner && (
                        <View className="mt-3 pt-3 border-t border-neutral-200 flex-row gap-2">
                          <View className="flex-1 rounded-lg bg-emerald-50 p-2 items-center">
                            <Text className="text-[9px] font-extrabold text-emerald-700 uppercase">Today Sales</Text>
                            <Text className="text-xs font-extrabold text-emerald-900 mt-0.5" numberOfLines={1}>
                              {formatPKRFull(shopStats.todaySales)}
                            </Text>
                          </View>
                          <View className="flex-1 rounded-lg bg-blue-50 p-2 items-center">
                            <Text className="text-[9px] font-extrabold text-blue-700 uppercase">Orders</Text>
                            <Text className="text-sm font-extrabold text-blue-900 mt-0.5">
                              {shopStats.todayOrders}
                            </Text>
                          </View>
                          <View
                            className="flex-1 rounded-lg p-2 items-center"
                            style={{ backgroundColor: shopStats.lowStockCount > 0 ? '#fef3c7' : '#f3f4f6' }}
                          >
                            <Text
                              className="text-[9px] font-extrabold uppercase"
                              style={{ color: shopStats.lowStockCount > 0 ? '#b45309' : '#6b7280' }}
                            >
                              Low Stock
                            </Text>
                            <Text
                              className="text-sm font-extrabold mt-0.5"
                              style={{ color: shopStats.lowStockCount > 0 ? '#b45309' : '#6b7280' }}
                            >
                              {shopStats.lowStockCount}
                            </Text>
                          </View>
                        </View>
                      )}

                      {/* Meta + actions */}
                      <View className="mt-3 pt-3 border-t border-neutral-100 flex-row items-center justify-between">
                        <View className="flex-row items-center gap-2">
                          {shop._count?.users !== undefined && (
                            <View className="flex-row items-center gap-1">
                              <ShieldCheck size={11} color="#64748b" />
                              <Text className="text-[10px] font-bold text-slate-600">
                                {shop._count.users} staff
                              </Text>
                            </View>
                          )}
                          {shopStats?.registerOpen && (
                            <View className="flex-row items-center gap-1">
                              <Activity size={11} color="#16a34a" />
                              <Text className="text-[10px] font-bold text-emerald-700">Register Open</Text>
                            </View>
                          )}
                        </View>

                        {isOwner && (
                          <View className="flex-row items-center gap-1.5">
                            {shop.phone && (
                              <Pressable
                                onPress={() => {
                                  const phone = shop.phone!.replace(/[^0-9]/g, '').replace(/^0/, '92');
                                  Linking.openURL(`https://wa.me/${phone}`);
                                }}
                                className="h-8 w-8 rounded-lg bg-green-100 items-center justify-center"
                              >
                                <MessageCircle size={13} color="#16a34a" />
                              </Pressable>
                            )}
                            <Pressable
                              onPress={() => openEdit(shop)}
                              className="h-8 w-8 rounded-lg bg-indigo-100 items-center justify-center"
                            >
                              <Edit3 size={13} color="#4f46e5" />
                            </Pressable>
                            <Pressable
                              onPress={() => toggleMutation.mutate(shop.id)}
                              className="h-8 w-8 rounded-lg bg-amber-100 items-center justify-center"
                            >
                              <Text className="text-xs">{shop.isActive === false ? '🔴' : '🟢'}</Text>
                            </Pressable>
                            <Pressable
                              onPress={() => handleDelete(shop)}
                              className="h-8 w-8 rounded-lg bg-rose-100 items-center justify-center"
                            >
                              <Trash2 size={13} color="#dc2626" />
                            </Pressable>
                          </View>
                        )}
                      </View>
                    </View>
                  </View>
                );
              })}
            </View>
          )}
        </View>
      </ScrollView>

      {/* ═════ CREATE/EDIT MODAL ═════ */}
      <Modal visible={showForm} animationType="slide" presentationStyle="pageSheet" onRequestClose={closeForm}>
        <SafeAreaView className="flex-1 bg-neutral-50">
          <KeyboardAvoidingView behavior={Platform.OS === 'ios' ? 'padding' : 'height'} className="flex-1">
            <View className="flex-row items-center justify-between px-5 py-4 border-b border-neutral-200">
              <View className="flex-row items-center gap-3">
                <View className="h-11 w-11 rounded-2xl items-center justify-center" style={{ backgroundColor: '#4f46e5' }}>
                  <Building2 size={20} color="#ffffff" />
                </View>
                <View>
                  <Text className="text-lg font-extrabold text-neutral-900">
                    {editing ? 'Edit Shop' : 'New Shop / Warehouse'}
                  </Text>
                  <Text className="text-[10px] text-neutral-500">
                    {editing ? editing.name : 'Add location with optional manager'}
                  </Text>
                </View>
              </View>
              <Pressable
                onPress={closeForm}
                hitSlop={12}
                className="h-10 w-10 rounded-2xl bg-neutral-100 items-center justify-center"
              >
                <X size={20} color="#6b7280" />
              </Pressable>
            </View>

            <ScrollView contentContainerStyle={{ padding: 20 }} keyboardShouldPersistTaps="handled">
              {/* Type selector */}
              <Text className="text-xs font-extrabold uppercase text-neutral-500 tracking-wider mb-2">
                Location Type
              </Text>
              <View className="flex-row gap-2 mb-4">
                {(Object.entries(shopTypeConfig) as [ShopType, any][]).map(([type, cfg]) => {
                  const Icon = cfg.icon;
                  const active = form.type === type;
                  return (
                    <Pressable
                      key={type}
                      onPress={() => {
                        Haptics.selectionAsync();
                        setForm({ ...form, type });
                      }}
                      className="flex-1 rounded-2xl border-2 p-3 items-center"
                      style={{
                        backgroundColor: active ? cfg.bg : '#ffffff',
                        borderColor: active ? cfg.color : '#e5e7eb',
                      }}
                    >
                      <Icon size={20} color={active ? cfg.color : '#9ca3af'} />
                      <Text
                        className="text-[11px] font-extrabold mt-1"
                        style={{ color: active ? cfg.color : '#374151' }}
                      >
                        {cfg.label}
                      </Text>
                      <Text className="text-[9px] text-slate-500 mt-0.5 text-center" numberOfLines={2}>
                        {cfg.description}
                      </Text>
                    </Pressable>
                  );
                })}
              </View>

              {/* Name */}
              <View className="mb-3">
                <Text className="text-xs font-extrabold uppercase text-neutral-500 tracking-wider mb-1.5">
                  Name *
                </Text>
                <View className="rounded-2xl border-2 border-neutral-200 bg-white px-4 h-12 flex-row items-center gap-2">
                  <Building2 size={16} color="#9ca3af" />
                  <TextInput
                    value={form.name}
                    onChangeText={(t) => setForm({ ...form, name: t })}
                    placeholder="e.g., Main Branch"
                    placeholderTextColor="#9ca3af"
                    autoFocus
                    className="flex-1 text-base font-bold text-neutral-900"
                  />
                </View>
              </View>

              {/* Address */}
              <View className="mb-3">
                <Text className="text-xs font-extrabold uppercase text-neutral-500 tracking-wider mb-1.5">
                  Address
                </Text>
                <View className="rounded-2xl border-2 border-neutral-200 bg-white px-4 h-12 flex-row items-center gap-2">
                  <MapPin size={16} color="#9ca3af" />
                  <TextInput
                    value={form.address}
                    onChangeText={(t) => setForm({ ...form, address: t })}
                    placeholder="Shop #, Street, City"
                    placeholderTextColor="#9ca3af"
                    className="flex-1 text-base font-bold text-neutral-900"
                  />
                </View>
              </View>

              {/* Phone */}
              <View className="mb-3">
                <Text className="text-xs font-extrabold uppercase text-neutral-500 tracking-wider mb-1.5">
                  Phone
                </Text>
                <View className="rounded-2xl border-2 border-neutral-200 bg-white px-4 h-12 flex-row items-center gap-2">
                  <Phone size={16} color="#9ca3af" />
                  <TextInput
                    value={form.phone}
                    onChangeText={(t) => setForm({ ...form, phone: t })}
                    placeholder="+923001234567"
                    placeholderTextColor="#9ca3af"
                    keyboardType="phone-pad"
                    className="flex-1 text-base font-bold text-neutral-900"
                  />
                </View>
              </View>

              {/* Main Branch toggle */}
              <Pressable
                onPress={() => setForm({ ...form, isMain: !form.isMain })}
                className="flex-row items-center gap-3 p-3 rounded-2xl border-2 mb-4"
                style={{
                  backgroundColor: form.isMain ? '#fef3c7' : '#ffffff',
                  borderColor: form.isMain ? '#f59e0b' : '#e5e7eb',
                }}
              >
                <View
                  className="h-11 w-11 rounded-2xl items-center justify-center"
                  style={{ backgroundColor: form.isMain ? '#f59e0b' : '#f3f4f6' }}
                >
                  <Crown
                    size={18}
                    color={form.isMain ? '#ffffff' : '#9ca3af'}
                    fill={form.isMain ? '#ffffff' : 'none'}
                  />
                </View>
                <View className="flex-1">
                  <Text className="text-sm font-extrabold text-neutral-900">
                    Set as Main Branch
                  </Text>
                  <Text className="text-[10px] text-neutral-500 mt-0.5">
                    Default shop for new sales
                  </Text>
                </View>
                <View
                  style={{
                    height: 26, width: 44, borderRadius: 13, padding: 2,
                    justifyContent: 'center',
                    backgroundColor: form.isMain ? '#f59e0b' : '#d1d5db',
                  }}
                >
                  <View
                    style={{
                      height: 22, width: 22, borderRadius: 11,
                      backgroundColor: '#ffffff',
                      transform: [{ translateX: form.isMain ? 18 : 0 }],
                    }}
                  />
                </View>
              </Pressable>

              {/* Manager section (create only) */}
              {!editing && (
                <View
                  className="rounded-2xl border-2 overflow-hidden mb-3"
                  style={{
                    backgroundColor: createManager ? '#faf5ff' : '#ffffff',
                    borderColor: createManager ? '#8b5cf6' : '#e5e7eb',
                  }}
                >
                  <Pressable
                    onPress={() => setCreateManager((v) => !v)}
                    className="flex-row items-center gap-3 p-3"
                  >
                    <View
                      className="h-11 w-11 rounded-2xl items-center justify-center"
                      style={{ backgroundColor: createManager ? '#8b5cf6' : '#f3f4f6' }}
                    >
                      <UserPlus size={18} color={createManager ? '#ffffff' : '#9ca3af'} />
                    </View>
                    <View className="flex-1">
                      <Text className="text-sm font-extrabold text-neutral-900">
                        Create Manager Account
                      </Text>
                      <Text className="text-[10px] text-neutral-500 mt-0.5">
                        Auto-assigns to this shop
                      </Text>
                    </View>
                    <View
                      style={{
                        height: 26, width: 44, borderRadius: 13, padding: 2,
                        justifyContent: 'center',
                        backgroundColor: createManager ? '#8b5cf6' : '#d1d5db',
                      }}
                    >
                      <View
                        style={{
                          height: 22, width: 22, borderRadius: 11,
                          backgroundColor: '#ffffff',
                          transform: [{ translateX: createManager ? 18 : 0 }],
                        }}
                      />
                    </View>
                  </Pressable>

                  {createManager && (
                    <View className="border-t-2 border-violet-200 p-3 gap-3">
                      <View>
                        <Text className="text-xs font-extrabold uppercase text-neutral-500 tracking-wider mb-1.5">
                          Manager Name *
                        </Text>
                        <View className="rounded-xl border-2 border-neutral-200 bg-white px-3 h-11 flex-row items-center gap-2">
                          <UserPlus size={15} color="#9ca3af" />
                          <TextInput
                            value={form.managerName}
                            onChangeText={(t) => setForm({ ...form, managerName: t })}
                            placeholder="Ahmad Ali"
                            placeholderTextColor="#9ca3af"
                            className="flex-1 text-sm font-bold text-neutral-900"
                          />
                        </View>
                      </View>
                      <View>
                        <Text className="text-xs font-extrabold uppercase text-neutral-500 tracking-wider mb-1.5">
                          Manager Email *
                        </Text>
                        <View className="rounded-xl border-2 border-neutral-200 bg-white px-3 h-11 flex-row items-center gap-2">
                          <Mail size={15} color="#9ca3af" />
                          <TextInput
                            value={form.managerEmail}
                            onChangeText={(t) => setForm({ ...form, managerEmail: t })}
                            placeholder="manager@yourshop.pk"
                            placeholderTextColor="#9ca3af"
                            keyboardType="email-address"
                            autoCapitalize="none"
                            className="flex-1 text-sm font-bold text-neutral-900"
                          />
                        </View>
                      </View>
                      <View>
                        <Text className="text-xs font-extrabold uppercase text-neutral-500 tracking-wider mb-1.5">
                          Manager Phone
                        </Text>
                        <View className="rounded-xl border-2 border-neutral-200 bg-white px-3 h-11 flex-row items-center gap-2">
                          <Phone size={15} color="#9ca3af" />
                          <TextInput
                            value={form.managerPhone}
                            onChangeText={(t) => setForm({ ...form, managerPhone: t })}
                            placeholder="+923001234567"
                            placeholderTextColor="#9ca3af"
                            keyboardType="phone-pad"
                            className="flex-1 text-sm font-bold text-neutral-900"
                          />
                        </View>
                      </View>
                      <View>
                        <Text className="text-xs font-extrabold uppercase text-neutral-500 tracking-wider mb-1.5">
                          Password *
                        </Text>
                        <View className="rounded-xl border-2 border-neutral-200 bg-white px-3 h-11 flex-row items-center gap-2">
                          <Lock size={15} color="#9ca3af" />
                          <TextInput
                            value={form.managerPassword}
                            onChangeText={(t) => setForm({ ...form, managerPassword: t })}
                            placeholder="Min 8 characters"
                            placeholderTextColor="#9ca3af"
                            secureTextEntry={!showPassword}
                            className="flex-1 text-sm font-bold text-neutral-900"
                          />
                          <Pressable
                            onPress={() => setShowPassword((v) => !v)}
                            hitSlop={8}
                          >
                            {showPassword ? (
                              <EyeOff size={16} color="#9ca3af" />
                            ) : (
                              <Eye size={16} color="#9ca3af" />
                            )}
                          </Pressable>
                        </View>
                      </View>
                      <View className="rounded-lg bg-amber-50 border border-amber-200 p-2.5 flex-row items-start gap-2">
                        <AlertCircle size={12} color="#b45309" />
                        <Text className="flex-1 text-[10px] font-bold text-amber-900">
                          Manager ko yeh credentials WhatsApp/Email pe send karein. Woh first login pe password change kar sakta hai.
                        </Text>
                      </View>
                    </View>
                  )}
                </View>
              )}
            </ScrollView>

            {/* Footer */}
            <View className="px-5 py-4 border-t border-neutral-200 bg-white flex-row gap-2">
              <Pressable
                onPress={closeForm}
                className="h-12 px-5 rounded-2xl bg-neutral-100 items-center justify-center"
              >
                <Text className="text-neutral-700 font-bold">Cancel</Text>
              </Pressable>
              <Pressable
                onPress={handleSubmit}
                disabled={createMutation.isPending || updateMutation.isPending}
                className="flex-1 h-12 rounded-2xl items-center justify-center flex-row gap-2"
                style={{
                  backgroundColor: createMutation.isPending || updateMutation.isPending ? '#9ca3af' : '#4f46e5',
                }}
              >
                <Save size={16} color="#ffffff" />
                <Text className="text-white font-extrabold">
                  {createMutation.isPending || updateMutation.isPending
                    ? 'Saving...'
                    : editing
                    ? 'Update Shop'
                    : createManager
                    ? 'Create Shop + Manager'
                    : 'Create Shop'}
                </Text>
              </Pressable>
            </View>
          </KeyboardAvoidingView>
        </SafeAreaView>
      </Modal>
    </SafeAreaView>
  );
}
