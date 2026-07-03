import { useState, useMemo } from 'react';
import {
  View, Text, ScrollView, Pressable, RefreshControl, Modal,
  TextInput, KeyboardAvoidingView, Platform, Image,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { useRouter, Stack } from 'expo-router';
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import * as Haptics from 'expo-haptics';
import {
  ArrowLeft, ClipboardCheck, Sparkles, Plus, Search, X, Check,
  Package, ArrowDownToLine, ArrowUpFromLine, AlertTriangle, TrendingDown,
  Calendar, User, Filter, TrendingUp,
} from 'lucide-react-native';
import { stockAdjustmentsApi, type AdjustmentType } from '@/api/stock-adjustments.api';
import { productsApi } from '@/api/products.api';
import { useSmartBack } from '@/hooks/useSmartBack';
import Toast from 'react-native-toast-message';

const typeConfig: Record<AdjustmentType, {
  label: string; icon: any; color: string; bg: string; description: string; isPositive: boolean;
}> = {
  ADJUSTMENT_IN: {
    label: 'Stock In',
    icon: ArrowDownToLine,
    color: '#16a34a',
    bg: '#dcfce7',
    description: 'Stock count increase',
    isPositive: true,
  },
  ADJUSTMENT_OUT: {
    label: 'Stock Out',
    icon: ArrowUpFromLine,
    color: '#2563eb',
    bg: '#dbeafe',
    description: 'Stock count decrease',
    isPositive: false,
  },
  DAMAGE: {
    label: 'Damaged',
    icon: AlertTriangle,
    color: '#dc2626',
    bg: '#fee2e2',
    description: 'Damaged stock write off',
    isPositive: false,
  },
  LOSS: {
    label: 'Loss',
    icon: TrendingDown,
    color: '#d97706',
    bg: '#fef3c7',
    description: 'Lost / stolen items',
    isPositive: false,
  },
};

type TypeFilter = 'all' | AdjustmentType;

const formatDate = (v: string) =>
  new Intl.DateTimeFormat('en-PK', { dateStyle: 'medium', timeStyle: 'short' }).format(new Date(v));

const formatQty = (q: number) => q.toFixed(q % 1 === 0 ? 0 : 2);

export default function StockAdjustmentsScreen() {
  const router = useRouter();
  const goBack = useSmartBack();
  const queryClient = useQueryClient();
  const [refreshing, setRefreshing] = useState(false);
  const [search, setSearch] = useState('');
  const [typeFilter, setTypeFilter] = useState<TypeFilter>('all');

  const [createOpen, setCreateOpen] = useState(false);
  const [productPickerOpen, setProductPickerOpen] = useState(false);
  const [productSearch, setProductSearch] = useState('');
  const [selectedProduct, setSelectedProduct] = useState<any>(null);
  const [type, setType] = useState<AdjustmentType>('ADJUSTMENT_IN');
  const [quantity, setQuantity] = useState('');
  const [reason, setReason] = useState('');
  const [note, setNote] = useState('');

  const { data: adjustments = [], refetch } = useQuery({
    queryKey: ['stock-adjustments'],
    queryFn: async () => {
      try {
        const r = await stockAdjustmentsApi.list();
        return Array.isArray(r) ? r : [];
      } catch {
        return [];
      }
    },
  });

  const { data: productsData } = useQuery({
    queryKey: ['adjustments-products'],
    queryFn: async () => {
      try {
        return await productsApi.list({ limit: 500 });
      } catch {
        return { items: [], meta: { page: 1, limit: 0, total: 0, totalPages: 0 } };
      }
    },
    enabled: productPickerOpen,
  });

  const onRefresh = async () => {
    setRefreshing(true);
    await refetch();
    setRefreshing(false);
  };

  const products = productsData?.items ?? [];
  const filteredProducts = useMemo(() => {
    const q = productSearch.toLowerCase().trim();
    if (!q) return products.slice(0, 30);
    return products.filter(
      (p) => p.name.toLowerCase().includes(q) || (p.sku || '').toLowerCase().includes(q),
    ).slice(0, 30);
  }, [products, productSearch]);

  const filtered = useMemo(() => {
    let result = [...adjustments];
    if (typeFilter !== 'all') {
      result = result.filter((a) => a.type === typeFilter);
    }
    const q = search.toLowerCase().trim();
    if (q) {
      result = result.filter(
        (a) =>
          a.product.name.toLowerCase().includes(q) ||
          (a.reason || '').toLowerCase().includes(q),
      );
    }
    return result;
  }, [adjustments, search, typeFilter]);

  const stats = useMemo(() => {
    const today = new Date().toDateString();
    return {
      total: adjustments.length,
      today: adjustments.filter((a) => new Date(a.createdAt).toDateString() === today).length,
      stockIn: adjustments.filter((a) => a.type === 'ADJUSTMENT_IN').reduce((s, a) => s + a.quantity, 0),
      damaged: adjustments.filter((a) => a.type === 'DAMAGE').reduce((s, a) => s + a.quantity, 0),
      lost: adjustments.filter((a) => a.type === 'LOSS').reduce((s, a) => s + a.quantity, 0),
      countIn: adjustments.filter((a) => a.type === 'ADJUSTMENT_IN').length,
      countOut: adjustments.filter((a) => a.type === 'ADJUSTMENT_OUT').length,
      countDamage: adjustments.filter((a) => a.type === 'DAMAGE').length,
      countLoss: adjustments.filter((a) => a.type === 'LOSS').length,
    };
  }, [adjustments]);

  const createMutation = useMutation({
    mutationFn: () =>
      stockAdjustmentsApi.create({
        productId: selectedProduct!.id,
        type,
        quantity: Number(quantity),
        reason: reason.trim(),
        note: note.trim() || undefined,
      }),
    onSuccess: () => {
      Haptics.notificationAsync(Haptics.NotificationFeedbackType.Success);
      Toast.show({ type: 'success', text1: '✅ Stock adjusted!' });
      setSelectedProduct(null);
      setType('ADJUSTMENT_IN');
      setQuantity('');
      setReason('');
      setNote('');
      setCreateOpen(false);
      queryClient.invalidateQueries({ queryKey: ['stock-adjustments'] });
      queryClient.invalidateQueries({ queryKey: ['products'] });
      queryClient.invalidateQueries({ queryKey: ['stock-movements'] });
      queryClient.invalidateQueries({ queryKey: ['dashboard-overview'] });
    },
    onError: (e: any) =>
      Toast.show({ type: 'error', text1: e?.response?.data?.message || 'Failed' }),
  });

  const handleSubmit = () => {
    if (!selectedProduct) return Toast.show({ type: 'error', text1: 'Select product' });
    if (!Number(quantity) || Number(quantity) <= 0) return Toast.show({ type: 'error', text1: 'Valid quantity' });
    if (!reason.trim()) return Toast.show({ type: 'error', text1: 'Reason required' });
    createMutation.mutate();
  };

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
          <ArrowLeft size={20} color="#2563eb" />
        </Pressable>
        <View className="flex-1">
          <Text className="text-2xl font-extrabold text-neutral-900 dark:text-white">
            Stock Adjustments
          </Text>
          <View className="flex-row items-center gap-1.5 mt-0.5">
            <Sparkles size={11} color="#2563eb" />
            <Text className="text-xs text-neutral-500">
              {stats.total} adjustments • {stats.today} today
            </Text>
          </View>
        </View>
        <Pressable
          onPress={() => {
            Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
            setCreateOpen(true);
          }}
          className="h-11 px-4 rounded-2xl flex-row items-center gap-1.5 active:opacity-80"
          style={{
            backgroundColor: '#2563eb',
            shadowColor: '#2563eb',
            shadowOpacity: 0.3,
            shadowRadius: 8,
            elevation: 4,
          }}
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
        <View className="mx-5 rounded-3xl p-5 mb-4" style={{
          backgroundColor: '#2563eb',
          shadowColor: '#2563eb',
          shadowOpacity: 0.3,
          shadowRadius: 16,
          elevation: 10,
        }}>
          <View className="flex-row items-center gap-3">
            <View className="h-14 w-14 rounded-2xl bg-white/20 items-center justify-center">
              <ClipboardCheck size={28} color="#ffffff" />
            </View>
            <View className="flex-1">
              <Text className="text-[10px] uppercase tracking-wider text-white/80 font-extrabold">
                Manual Stock Control
              </Text>
              <Text className="text-white text-3xl font-extrabold mt-0.5">
                {stats.total}
              </Text>
              <Text className="text-xs text-white/80 mt-0.5">
                Damage, loss, correction tracking
              </Text>
            </View>
          </View>
        </View>

        {/* Stats grid */}
        <View className="px-5 mb-3">
          <View className="flex-row flex-wrap -mx-1.5">
            {[
              { label: 'Today', value: stats.today, color: '#2563eb', bg: '#dbeafe', icon: Calendar },
              { label: 'Stock In', value: formatQty(stats.stockIn), color: '#16a34a', bg: '#dcfce7', icon: TrendingUp },
              { label: 'Damaged', value: formatQty(stats.damaged), color: '#dc2626', bg: '#fee2e2', icon: AlertTriangle },
              { label: 'Lost', value: formatQty(stats.lost), color: '#d97706', bg: '#fef3c7', icon: TrendingDown },
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
                    <Text className="text-lg font-extrabold mt-0.5" style={{ color: s.color }} numberOfLines={1}>
                      {s.value}
                    </Text>
                  </View>
                </View>
              );
            })}
          </View>
        </View>

        {/* Search */}
        <View className="px-5 mb-3">
          <View className="flex-row items-center gap-2 rounded-2xl border border-neutral-200 bg-white px-4 h-12">
            <Search size={18} color="#9ca3af" />
            <TextInput
              placeholder="Search product, reason..."
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

        {/* Type filter chips */}
        <ScrollView
          horizontal
          showsHorizontalScrollIndicator={false}
          contentContainerStyle={{ paddingHorizontal: 20, gap: 8 }}
          className="mb-3"
        >
          <Pressable
            onPress={() => setTypeFilter('all')}
            className="h-9 px-3 rounded-xl border-2 flex-row items-center gap-1.5"
            style={{
              backgroundColor: typeFilter === 'all' ? '#0f172a' : '#ffffff',
              borderColor: typeFilter === 'all' ? '#0f172a' : '#e5e7eb',
            }}
          >
            <Text
              className="text-xs font-bold"
              style={{ color: typeFilter === 'all' ? '#ffffff' : '#374151' }}
            >
              All
            </Text>
            <View
              className="px-1.5 py-0.5 rounded"
              style={{ backgroundColor: typeFilter === 'all' ? 'rgba(255,255,255,0.25)' : '#f3f4f6' }}
            >
              <Text
                className="text-[10px] font-extrabold"
                style={{ color: typeFilter === 'all' ? '#ffffff' : '#6b7280' }}
              >
                {stats.total}
              </Text>
            </View>
          </Pressable>
          {(Object.entries(typeConfig) as [AdjustmentType, any][]).map(([key, cfg]) => {
            const Icon = cfg.icon;
            const active = typeFilter === key;
            const count = key === 'ADJUSTMENT_IN' ? stats.countIn :
                          key === 'ADJUSTMENT_OUT' ? stats.countOut :
                          key === 'DAMAGE' ? stats.countDamage : stats.countLoss;
            return (
              <Pressable
                key={key}
                onPress={() => setTypeFilter(key)}
                className="h-9 px-3 rounded-xl border-2 flex-row items-center gap-1.5"
                style={{
                  backgroundColor: active ? cfg.color : '#ffffff',
                  borderColor: active ? cfg.color : '#e5e7eb',
                }}
              >
                <Icon size={11} color={active ? '#ffffff' : cfg.color} />
                <Text
                  className="text-xs font-bold"
                  style={{ color: active ? '#ffffff' : '#374151' }}
                >
                  {cfg.label}
                </Text>
                <View
                  className="px-1.5 py-0.5 rounded"
                  style={{ backgroundColor: active ? 'rgba(255,255,255,0.25)' : '#f3f4f6' }}
                >
                  <Text
                    className="text-[10px] font-extrabold"
                    style={{ color: active ? '#ffffff' : '#6b7280' }}
                  >
                    {count}
                  </Text>
                </View>
              </Pressable>
            );
          })}
        </ScrollView>

        {/* Adjustments list */}
        <View className="px-5">
          {filtered.length === 0 ? (
            <View className="items-center py-16">
              <View className="h-20 w-20 rounded-3xl bg-blue-100 items-center justify-center">
                <ClipboardCheck size={36} color="#2563eb" />
              </View>
              <Text className="mt-4 text-base font-bold text-neutral-900">
                {search || typeFilter !== 'all' ? 'No matches' : 'No adjustments yet'}
              </Text>
              <Text className="text-xs text-neutral-500 mt-1 text-center px-8">
                Manual stock corrections yahan track hongi
              </Text>
              {!search && typeFilter === 'all' && (
                <Pressable
                  onPress={() => setCreateOpen(true)}
                  className="mt-4 h-11 px-5 rounded-xl flex-row items-center gap-2"
                  style={{ backgroundColor: '#2563eb' }}
                >
                  <Plus size={16} color="#ffffff" />
                  <Text className="text-white font-bold text-sm">First Adjustment</Text>
                </Pressable>
              )}
            </View>
          ) : (
            <View className="gap-2">
              {filtered.map((a) => {
                const cfg = typeConfig[a.type];
                const Icon = cfg.icon;
                return (
                  <View
                    key={a.id}
                    className="rounded-2xl bg-white dark:bg-neutral-900 border-2 border-neutral-200 p-3.5"
                  >
                    <View className="flex-row items-start gap-3">
                      <View
                        className="h-12 w-12 rounded-2xl items-center justify-center shrink-0"
                        style={{ backgroundColor: cfg.bg }}
                      >
                        <Icon size={20} color={cfg.color} />
                      </View>
                      <View className="flex-1 min-w-0">
                        <View className="flex-row items-center gap-1.5 flex-wrap">
                          <Text className="font-bold text-neutral-900" numberOfLines={1}>
                            {a.product.name}
                          </Text>
                          <View className="px-1.5 py-0.5 rounded" style={{ backgroundColor: cfg.bg }}>
                            <Text className="text-[9px] font-extrabold uppercase" style={{ color: cfg.color }}>
                              {cfg.label}
                            </Text>
                          </View>
                        </View>
                        <Text className="text-xs text-neutral-700 font-bold mt-1" numberOfLines={2}>
                          {a.reason}
                        </Text>
                        {a.note && (
                          <Text className="text-[11px] text-neutral-500 italic mt-1" numberOfLines={2}>
                            💬 {a.note}
                          </Text>
                        )}
                        <View className="flex-row items-center gap-2 mt-1.5 flex-wrap">
                          <View className="flex-row items-center gap-1">
                            <Calendar size={9} color="#9ca3af" />
                            <Text className="text-[10px] text-neutral-500">
                              {formatDate(a.createdAt)}
                            </Text>
                          </View>
                          {a.createdBy && (
                            <View className="flex-row items-center gap-1">
                              <User size={9} color="#9ca3af" />
                              <Text className="text-[10px] text-neutral-500">
                                {a.createdBy.fullName}
                              </Text>
                            </View>
                          )}
                        </View>
                      </View>
                      <View className="items-end">
                        <Text
                          className="text-lg font-extrabold"
                          style={{ color: cfg.isPositive ? '#15803d' : '#b91c1c' }}
                        >
                          {cfg.isPositive ? '+' : '−'}{formatQty(a.quantity)}
                        </Text>
                        <Text className="text-[9px] text-neutral-500 font-bold uppercase">
                          {a.product.unit}
                        </Text>
                      </View>
                    </View>
                  </View>
                );
              })}
            </View>
          )}
        </View>
      </ScrollView>

      {/* ═════ CREATE MODAL ═════ */}
      <Modal visible={createOpen} animationType="slide" presentationStyle="pageSheet" onRequestClose={() => setCreateOpen(false)}>
        <SafeAreaView className="flex-1 bg-neutral-50">
          <KeyboardAvoidingView behavior={Platform.OS === 'ios' ? 'padding' : 'height'} className="flex-1">
            <View className="flex-row items-center justify-between px-5 py-4 border-b border-neutral-200">
              <View className="flex-row items-center gap-3">
                <View className="h-11 w-11 rounded-2xl items-center justify-center" style={{ backgroundColor: '#2563eb' }}>
                  <ClipboardCheck size={20} color="#ffffff" />
                </View>
                <View>
                  <Text className="text-lg font-extrabold text-neutral-900">New Adjustment</Text>
                  <Text className="text-[10px] text-neutral-500">Stock manually adjust karein</Text>
                </View>
              </View>
              <Pressable
                onPress={() => setCreateOpen(false)}
                hitSlop={12}
                className="h-10 w-10 rounded-2xl bg-neutral-100 items-center justify-center"
              >
                <X size={20} color="#6b7280" />
              </Pressable>
            </View>

            <ScrollView contentContainerStyle={{ padding: 20 }} keyboardShouldPersistTaps="handled">
              {/* Product picker */}
              <View className="mb-4">
                <Text className="text-xs font-extrabold uppercase text-neutral-500 tracking-wider mb-1.5">
                  Product *
                </Text>
                <Pressable
                  onPress={() => {
                    Haptics.selectionAsync();
                    setProductPickerOpen(true);
                  }}
                  className="rounded-2xl bg-white border-2 border-neutral-200 p-3 flex-row items-center gap-3 active:opacity-70"
                >
                  <View className="h-11 w-11 rounded-xl bg-blue-100 items-center justify-center overflow-hidden">
                    {selectedProduct?.images?.[0]?.url ? (
                      <Image source={{ uri: selectedProduct.images[0].url }} style={{ width: '100%', height: '100%' }} resizeMode="cover" />
                    ) : (
                      <Package size={18} color="#2563eb" />
                    )}
                  </View>
                  <View className="flex-1">
                    {selectedProduct ? (
                      <>
                        <Text className="font-extrabold text-neutral-900" numberOfLines={1}>
                          {selectedProduct.name}
                        </Text>
                        <Text className="text-xs text-neutral-500 mt-0.5">
                          Current stock: <Text className="font-extrabold text-emerald-700">
                            {formatQty(selectedProduct.stock)} {selectedProduct.unit}
                          </Text>
                        </Text>
                      </>
                    ) : (
                      <Text className="text-neutral-500 font-bold">Tap to select product</Text>
                    )}
                  </View>
                </Pressable>
              </View>

              {/* Type */}
              <View className="mb-4">
                <Text className="text-xs font-extrabold uppercase text-neutral-500 tracking-wider mb-2">
                  Adjustment Type *
                </Text>
                <View className="flex-row flex-wrap -m-1">
                  {(Object.entries(typeConfig) as [AdjustmentType, any][]).map(([key, cfg]) => {
                    const Icon = cfg.icon;
                    const active = type === key;
                    return (
                      <View key={key} className="w-1/2 p-1">
                        <Pressable
                          onPress={() => {
                            Haptics.selectionAsync();
                            setType(key);
                          }}
                          className="rounded-2xl border-2 p-3"
                          style={{
                            backgroundColor: active ? cfg.bg : '#ffffff',
                            borderColor: active ? cfg.color : '#e5e7eb',
                          }}
                        >
                          <View className="flex-row items-center gap-2">
                            <View
                              className="h-9 w-9 rounded-xl items-center justify-center"
                              style={{ backgroundColor: active ? cfg.color : cfg.bg }}
                            >
                              <Icon size={16} color={active ? '#ffffff' : cfg.color} />
                            </View>
                            {active && (
                              <View className="h-5 w-5 rounded-full items-center justify-center" style={{ backgroundColor: cfg.color }}>
                                <Check size={12} color="#ffffff" />
                              </View>
                            )}
                          </View>
                          <Text
                            className="text-sm font-extrabold mt-2"
                            style={{ color: active ? cfg.color : '#374151' }}
                          >
                            {cfg.label}
                          </Text>
                          <Text className="text-[10px] text-slate-500 mt-0.5" numberOfLines={2}>
                            {cfg.description}
                          </Text>
                        </Pressable>
                      </View>
                    );
                  })}
                </View>
              </View>

              {/* Quantity */}
              <View className="mb-3">
                <Text className="text-xs font-extrabold uppercase text-neutral-500 tracking-wider mb-1.5">
                  Quantity *
                </Text>
                <View className="rounded-2xl border-2 border-neutral-200 bg-white px-4 h-12 flex-row items-center gap-2">
                  <TextInput
                    value={quantity}
                    onChangeText={setQuantity}
                    placeholder="0"
                    placeholderTextColor="#9ca3af"
                    keyboardType="decimal-pad"
                    className="flex-1 text-2xl font-extrabold text-neutral-900"
                  />
                  {selectedProduct && (
                    <View className="px-2 py-1 rounded-lg bg-neutral-100">
                      <Text className="text-xs font-extrabold text-neutral-700 uppercase">
                        {selectedProduct.unit}
                      </Text>
                    </View>
                  )}
                </View>
                <Text className="text-[10px] text-neutral-500 mt-1 font-semibold">
                  💡 Decimal allowed (e.g. 2.5 kg)
                </Text>
              </View>

              {/* Reason */}
              <View className="mb-3">
                <Text className="text-xs font-extrabold uppercase text-neutral-500 tracking-wider mb-1.5">
                  Reason *
                </Text>
                <View className="rounded-2xl border-2 border-neutral-200 bg-white px-4 h-12 flex-row items-center gap-2">
                  <TextInput
                    value={reason}
                    onChangeText={setReason}
                    placeholder="e.g., Damaged in transport"
                    placeholderTextColor="#9ca3af"
                    className="flex-1 text-base font-bold text-neutral-900"
                  />
                </View>
              </View>

              {/* Note */}
              <View className="mb-4">
                <Text className="text-xs font-extrabold uppercase text-neutral-500 tracking-wider mb-1.5">
                  Note (optional)
                </Text>
                <TextInput
                  value={note}
                  onChangeText={setNote}
                  multiline
                  numberOfLines={3}
                  placeholder="Additional details..."
                  placeholderTextColor="#9ca3af"
                  className="min-h-[80px] rounded-2xl border-2 border-neutral-200 bg-white p-3 text-sm font-bold text-neutral-900"
                  textAlignVertical="top"
                />
              </View>

              {/* Preview */}
              {selectedProduct && quantity && Number(quantity) > 0 && (
                <View
                  className="rounded-2xl p-4 mb-2"
                  style={{ backgroundColor: typeConfig[type].color }}
                >
                  <View className="flex-row items-center gap-2 mb-2">
                    <Sparkles size={14} color="#ffffff" />
                    <Text className="text-white font-extrabold text-xs uppercase tracking-wider">
                      Preview
                    </Text>
                  </View>
                  <View className="flex-row items-center justify-between">
                    <Text className="text-white/80 text-sm">Current stock:</Text>
                    <Text className="text-white font-bold">{formatQty(selectedProduct.stock)} {selectedProduct.unit}</Text>
                  </View>
                  <View className="flex-row items-center justify-between mt-1">
                    <Text className="text-white/80 text-sm">{typeConfig[type].label}:</Text>
                    <Text className="text-white font-extrabold">
                      {typeConfig[type].isPositive ? '+' : '−'}{formatQty(Number(quantity))} {selectedProduct.unit}
                    </Text>
                  </View>
                  <View className="pt-2 mt-2 border-t border-white/20 flex-row items-center justify-between">
                    <Text className="text-white font-extrabold text-sm">New stock:</Text>
                    <Text className="text-white text-2xl font-extrabold">
                      {formatQty(
                        typeConfig[type].isPositive
                          ? selectedProduct.stock + Number(quantity)
                          : selectedProduct.stock - Number(quantity)
                      )} {selectedProduct.unit}
                    </Text>
                  </View>
                </View>
              )}
            </ScrollView>

            {/* Submit */}
            <View className="px-5 py-4 border-t border-neutral-200 bg-white">
              <Pressable
                onPress={handleSubmit}
                disabled={createMutation.isPending}
                className="h-14 rounded-2xl items-center justify-center flex-row gap-2 active:opacity-80"
                style={{
                  backgroundColor: createMutation.isPending ? '#9ca3af' : '#2563eb',
                  shadowColor: '#2563eb',
                  shadowOpacity: 0.4,
                  shadowRadius: 12,
                  elevation: 6,
                }}
              >
                <Check size={20} color="#ffffff" />
                <Text className="text-white font-extrabold text-base">
                  {createMutation.isPending ? 'Saving...' : 'Save Adjustment'}
                </Text>
              </Pressable>
            </View>
          </KeyboardAvoidingView>
        </SafeAreaView>
      </Modal>

      {/* ═════ PRODUCT PICKER MODAL ═════ */}
      <Modal visible={productPickerOpen} animationType="slide" presentationStyle="pageSheet" onRequestClose={() => setProductPickerOpen(false)}>
        <SafeAreaView className="flex-1 bg-neutral-50">
          <View className="px-5 py-4 border-b border-neutral-200 flex-row items-center gap-3">
            <Text className="flex-1 text-lg font-extrabold text-neutral-900">Select Product</Text>
            <Pressable
              onPress={() => setProductPickerOpen(false)}
              hitSlop={12}
              className="h-10 w-10 rounded-2xl bg-neutral-100 items-center justify-center"
            >
              <X size={20} color="#6b7280" />
            </Pressable>
          </View>
          <View className="px-5 py-3">
            <View className="flex-row items-center gap-2 rounded-2xl border border-neutral-200 bg-white px-4 h-12">
              <Search size={18} color="#9ca3af" />
              <TextInput
                value={productSearch}
                onChangeText={setProductSearch}
                placeholder="Search products..."
                placeholderTextColor="#9ca3af"
                autoFocus
                className="flex-1 text-base text-neutral-900"
              />
            </View>
          </View>
          <ScrollView contentContainerStyle={{ padding: 20, paddingTop: 0 }}>
            {filteredProducts.length === 0 ? (
              <View className="items-center py-12">
                <Package size={40} color="#d1d5db" />
                <Text className="mt-3 text-neutral-500 font-semibold">No products found</Text>
              </View>
            ) : (
              <View className="gap-2">
                {filteredProducts.map((p) => (
                  <Pressable
                    key={p.id}
                    onPress={() => {
                      Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
                      setSelectedProduct(p);
                      setProductPickerOpen(false);
                      setProductSearch('');
                    }}
                    className="flex-row items-center gap-3 p-3 rounded-2xl bg-white border-2 border-neutral-200 active:opacity-70"
                  >
                    <View className="h-11 w-11 rounded-xl bg-blue-100 items-center justify-center overflow-hidden">
                      {p.images?.[0]?.url ? (
                        <Image source={{ uri: p.images[0].url }} style={{ width: '100%', height: '100%' }} resizeMode="cover" />
                      ) : (
                        <Package size={18} color="#2563eb" />
                      )}
                    </View>
                    <View className="flex-1 min-w-0">
                      <Text className="font-bold text-neutral-900" numberOfLines={1}>{p.name}</Text>
                      <View className="flex-row items-center gap-2 mt-0.5">
                        {p.sku && (
                          <Text className="text-[10px] text-neutral-500 font-mono">{p.sku}</Text>
                        )}
                        <Text className="text-xs font-extrabold text-emerald-700">
                          {formatQty(p.stock)} {p.unit}
                        </Text>
                      </View>
                    </View>
                  </Pressable>
                ))}
              </View>
            )}
          </ScrollView>
        </SafeAreaView>
      </Modal>
    </SafeAreaView>
  );
}
