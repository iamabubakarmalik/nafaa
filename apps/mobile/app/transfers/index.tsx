import { useState, useMemo } from 'react';
import {
  View, Text, ScrollView, Pressable, RefreshControl, Modal,
  TextInput, KeyboardAvoidingView, Platform, Alert,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { useRouter, Stack } from 'expo-router';
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import * as Haptics from 'expo-haptics';
import {
  ArrowLeft, ArrowRightLeft, Plus, Building2, Trash2, Minus,
  CheckCircle2, XCircle, Clock, PackageCheck, Sparkles, X, Check,
  Package, Search,
} from 'lucide-react-native';
import { transfersApi, type TransferStatus } from '@/api/transfers.api';
import { shopsApi } from '@/api/shops.api';
import { productsApi } from '@/api/products.api';
import Toast from 'react-native-toast-message';

import { useTranslation } from '@/i18n/useTranslation';
interface CartLine {
  productId: string;
  name: string;
  unit: string;
  stock: number;
  quantity: number;
}

const statusConfig: Record<TransferStatus, { label: string; bg: string; text: string; icon: any }> = {
  PENDING: { label: 'Pending', bg: '#f3f4f6', text: '#4b5563', icon: Clock },
  IN_TRANSIT: { label: 'In Transit', bg: '#fef3c7', text: '#b45309', icon: ArrowRightLeft },
  RECEIVED: { label: 'Received', bg: '#dcfce7', text: '#15803d', icon: CheckCircle2 },
  CANCELLED: { label: 'Cancelled', bg: '#fee2e2', text: '#b91c1c', icon: XCircle },
};

const formatDate = (v: string) =>
  new Intl.DateTimeFormat('en-PK', {
    dateStyle: 'medium',
    timeStyle: 'short',
  }).format(new Date(v));

export default function TransfersScreen() {
  const { t } = useTranslation();
  const router = useRouter();
  const queryClient = useQueryClient();
  const [refreshing, setRefreshing] = useState(false);
  const [createOpen, setCreateOpen] = useState(false);
  const [productPickerOpen, setProductPickerOpen] = useState(false);
  const [productSearch, setProductSearch] = useState('');
  const [fromShopId, setFromShopId] = useState('');
  const [toShopId, setToShopId] = useState('');
  const [notes, setNotes] = useState('');
  const [cart, setCart] = useState<CartLine[]>([]);

  const { data: shops = [] } = useQuery({
    queryKey: ['shops'],
    queryFn: async () => {
      try {
        const r = await shopsApi.list();
        return Array.isArray(r) ? r : [];
      } catch {
        return [];
      }
    },
  });

  const { data: productsData } = useQuery({
    queryKey: ['transfers-products'],
    queryFn: async () => {
      try {
        return await productsApi.list({ limit: 200 });
      } catch {
        return { items: [], meta: { page: 1, limit: 0, total: 0, totalPages: 0 } };
      }
    },
    enabled: createOpen,
  });

  const { data: transfers = [], refetch } = useQuery({
    queryKey: ['transfers'],
    queryFn: async () => {
      try {
        const r = await transfersApi.list();
        return Array.isArray(r) ? r : [];
      } catch {
        return [];
      }
    },
  });

  const onRefresh = async () => {
    setRefreshing(true);
    await refetch();
    setRefreshing(false);
  };

  const products = productsData?.items ?? [];
  const filteredProducts = useMemo(() => {
    const q = productSearch.toLowerCase().trim();
    if (!q) return products;
    return products.filter((p) =>
      p.name.toLowerCase().includes(q) ||
      (p.sku || '').toLowerCase().includes(q),
    );
  }, [products, productSearch]);

  const createMutation = useMutation({
    mutationFn: () =>
      transfersApi.create({
        fromShopId,
        toShopId,
        notes: notes.trim() || undefined,
        items: cart.map((l) => ({ productId: l.productId, quantity: l.quantity })),
      }),
    onSuccess: () => {
      Haptics.notificationAsync(Haptics.NotificationFeedbackType.Success);
      Toast.show({ type: 'success', text1: '✅ Transfer created!' });
      setFromShopId('');
      setToShopId('');
      setNotes('');
      setCart([]);
      setCreateOpen(false);
      queryClient.invalidateQueries({ queryKey: ['transfers'] });
      queryClient.invalidateQueries({ queryKey: ['products'] });
    },
    onError: (e: any) =>
      Toast.show({ type: 'error', text1: e?.response?.data?.message || 'Failed' }),
  });

  const receiveMutation = useMutation({
    mutationFn: transfersApi.receive,
    onSuccess: () => {
      Haptics.notificationAsync(Haptics.NotificationFeedbackType.Success);
      Toast.show({ type: 'success', text1: '✅ Transfer received!' });
      queryClient.invalidateQueries({ queryKey: ['transfers'] });
      queryClient.invalidateQueries({ queryKey: ['products'] });
    },
  });

  const cancelMutation = useMutation({
    mutationFn: transfersApi.cancel,
    onSuccess: () => {
      Toast.show({ type: 'success', text1: 'Cancelled' });
      queryClient.invalidateQueries({ queryKey: ['transfers'] });
      queryClient.invalidateQueries({ queryKey: ['products'] });
    },
  });

  const addProductToCart = (product: any) => {
    Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
    setCart((prev) => {
      const existing = prev.find((l) => l.productId === product.id);
      if (existing) {
        if (existing.quantity >= product.stock) {
          Toast.show({ type: 'error', text1: 'Stock limit reached' });
          return prev;
        }
        return prev.map((l) =>
          l.productId === product.id ? { ...l, quantity: l.quantity + 1 } : l,
        );
      }
      return [
        ...prev,
        {
          productId: product.id,
          name: product.name,
          unit: product.unit,
          stock: product.stock,
          quantity: 1,
        },
      ];
    });
    setProductPickerOpen(false);
    setProductSearch('');
  };

  const handleReceive = (id: string, num: string) => {
    Alert.alert('Receive Transfer?', `${num} ko receive karna chahte hain?`, [
      { text: 'Cancel', style: 'cancel' },
      { text: 'Receive', onPress: () => receiveMutation.mutate(id) },
    ]);
  };

  const handleCancel = (id: string, num: string) => {
    Alert.alert('Cancel Transfer?', `${num} ko cancel karna chahte hain?`, [
      { text: 'No', style: 'cancel' },
      { text: 'Yes Cancel', style: 'destructive', onPress: () => cancelMutation.mutate(id) },
    ]);
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
          <ArrowLeft size={20} color="#16a34a" />
        </Pressable>
        <View className="flex-1">
          <Text className="text-2xl font-extrabold text-neutral-900 dark:text-white">{t('auto.index.stock_transfers')}</Text>
          <View className="flex-row items-center gap-1.5 mt-0.5">
            <Sparkles size={11} color="#0891b2" />
            <Text className="text-xs text-neutral-500">{t('auto.index.multi_shop_inventory')}</Text>
          </View>
        </View>
        <Pressable
          onPress={() => {
            Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
            setCreateOpen(true);
          }}
          className="h-11 px-4 rounded-2xl flex-row items-center gap-1.5 active:opacity-80"
          style={{
            backgroundColor: '#0891b2',
            shadowColor: '#0891b2',
            shadowOpacity: 0.3,
            shadowRadius: 8,
            elevation: 4,
          }}
        >
          <Plus size={16} color="#ffffff" />
          <Text className="text-white font-bold text-sm">{t('auto.index.new')}</Text>
        </Pressable>
      </View>

      <ScrollView
        contentContainerStyle={{ paddingBottom: 40 }}
        refreshControl={
          <RefreshControl refreshing={refreshing} onRefresh={onRefresh} tintColor="#0891b2" />
        }
        showsVerticalScrollIndicator={false}
      >
        {/* Hero */}
        <View className="px-5 mb-4">
          <View
            className="rounded-3xl p-5"
            style={{
              backgroundColor: '#0891b2',
              shadowColor: '#0891b2',
              shadowOpacity: 0.3,
              shadowRadius: 16,
              shadowOffset: { width: 0, height: 8 },
              elevation: 10,
            }}
          >
            <View className="flex-row items-center gap-3">
              <View className="h-14 w-14 rounded-2xl bg-white/20 items-center justify-center">
                <ArrowRightLeft size={28} color="#ffffff" />
              </View>
              <View className="flex-1">
                <Text className="text-xs font-bold uppercase tracking-wider text-white/80">{t('auto.index.stock_transfers')}</Text>
                <Text className="text-3xl font-extrabold text-white">
                  {transfers.length}
                </Text>
                <Text className="text-xs text-white/80 mt-0.5">
                  {transfers.filter((tx) => tx.status === 'IN_TRANSIT').length} in transit
                </Text>
              </View>
            </View>
          </View>
        </View>

        {/* Transfers List */}
        <View className="px-5">
          {transfers.length === 0 ? (
            <View className="rounded-2xl bg-white dark:bg-neutral-900 border border-neutral-200 dark:border-neutral-800 items-center py-12">
              <View className="h-16 w-16 rounded-3xl bg-cyan-100 dark:bg-cyan-950/40 items-center justify-center">
                <ArrowRightLeft size={32} color="#0891b2" />
              </View>
              <Text className="mt-3 text-base font-bold text-neutral-700 dark:text-neutral-300">{t('auto.index.no_transfers_yet')}</Text>
              <Pressable
                onPress={() => setCreateOpen(true)}
                className="mt-4 h-10 px-5 rounded-xl flex-row items-center gap-1.5"
                style={{ backgroundColor: '#0891b2' }}
              >
                <Plus size={16} color="#ffffff" />
                <Text className="text-white font-bold text-sm">{t('auto.index.create_transfer')}</Text>
              </Pressable>
            </View>
          ) : (
            <View className="gap-2.5">
              {transfers.map((tx) => {
                const cfg = statusConfig[tx.status];
                const Icon = cfg.icon;
                return (
                  <View
                    key={tx.id}
                    className="rounded-2xl bg-white dark:bg-neutral-900 border border-neutral-200 dark:border-neutral-800 p-3.5"
                  >
                    <View className="flex-row items-start justify-between gap-2">
                      <View className="flex-1">
                        <View className="flex-row items-center gap-2 flex-wrap">
                          <Text className="font-mono text-sm font-extrabold text-neutral-900 dark:text-white">
                            {tx.transferNumber}
                          </Text>
                          <View
                            className="px-2 py-0.5 rounded-md flex-row items-center gap-1"
                            style={{ backgroundColor: cfg.bg }}
                          >
                            <Icon size={9} color={cfg.text} />
                            <Text className="text-[9px] font-extrabold" style={{ color: cfg.text }}>
                              {cfg.label}
                            </Text>
                          </View>
                        </View>
                        <View className="flex-row items-center gap-2 mt-2">
                          <Building2 size={11} color="#737373" />
                          <Text className="text-xs font-bold text-neutral-700">
                            {tx.fromShop.name}
                          </Text>
                          <ArrowRightLeft size={10} color="#9ca3af" />
                          <Text className="text-xs font-bold text-neutral-700">
                            {tx.toShop.name}
                          </Text>
                        </View>
                        <Text className="text-[10px] text-neutral-500 mt-1">
                          {tx.items.length} items • {formatDate(tx.createdAt)}
                        </Text>
                      </View>
                    </View>

                    <View className="mt-2.5 pt-2.5 border-t border-neutral-100 dark:border-neutral-800">
                      <Text className="text-[10px] text-neutral-500 font-bold uppercase mb-1">{t('auto.index.items')}</Text>
                      {tx.items.slice(0, 3).map((item: any) => (
                        <Text key={item.id} className="text-xs text-neutral-700 dark:text-neutral-300">
                          • {item.product.name}: <Text className="font-bold">{item.quantity} {item.product.unit}</Text>
                        </Text>
                      ))}
                      {tx.items.length > 3 && (
                        <Text className="text-[10px] text-neutral-500 mt-0.5">
                          + {tx.items.length - 3} more
                        </Text>
                      )}
                    </View>

                    {tx.status === 'IN_TRANSIT' && (
                      <View className="mt-3 flex-row gap-2">
                        <Pressable
                          onPress={() => handleReceive(tx.id, tx.transferNumber)}
                          className="flex-1 h-10 rounded-xl flex-row items-center justify-center gap-1.5 active:opacity-80"
                          style={{ backgroundColor: '#16a34a' }}
                        >
                          <PackageCheck size={14} color="#ffffff" />
                          <Text className="text-white font-bold text-xs">{t('auto.index.receive')}</Text>
                        </Pressable>
                        <Pressable
                          onPress={() => handleCancel(tx.id, tx.transferNumber)}
                          className="flex-1 h-10 rounded-xl flex-row items-center justify-center gap-1.5 border-2"
                          style={{ borderColor: '#fecaca', backgroundColor: '#fee2e2' }}
                        >
                          <XCircle size={14} color="#dc2626" />
                          <Text className="font-bold text-xs text-rose-700">{t('auto.index.cancel')}</Text>
                        </Pressable>
                      </View>
                    )}
                  </View>
                );
              })}
            </View>
          )}
        </View>
      </ScrollView>

      {/* Create Transfer Modal */}
      <Modal visible={createOpen} animationType="slide" presentationStyle="pageSheet">
        <SafeAreaView className="flex-1 bg-neutral-50 dark:bg-neutral-950">
          <KeyboardAvoidingView
            behavior={Platform.OS === 'ios' ? 'padding' : 'height'}
            className="flex-1"
          >
            <View className="flex-row items-center justify-between px-5 py-4 border-b border-neutral-200 dark:border-neutral-800">
              <View className="flex-row items-center gap-3">
                <View
                  className="h-10 w-10 rounded-2xl items-center justify-center"
                  style={{ backgroundColor: '#0891b2' }}
                >
                  <ArrowRightLeft size={18} color="#ffffff" />
                </View>
                <Text className="text-xl font-extrabold text-neutral-900 dark:text-white">{t('auto.index.new_transfer')}</Text>
              </View>
              <Pressable
                onPress={() => setCreateOpen(false)}
                hitSlop={12}
                className="h-10 w-10 rounded-2xl bg-neutral-100 dark:bg-neutral-800 items-center justify-center"
              >
                <X size={20} color="#6b7280" />
              </Pressable>
            </View>

            <ScrollView
              contentContainerStyle={{ padding: 20 }}
              keyboardShouldPersistTaps="handled"
            >
              <View className="gap-4">
                {/* From Shop */}
                <View>
                  <Text className="text-sm font-bold text-neutral-700 mb-2">{t('auto.index.from_shop')}</Text>
                  <ScrollView
                    horizontal
                    showsHorizontalScrollIndicator={false}
                    contentContainerStyle={{ gap: 8, paddingRight: 20 }}
                  >
                    {shops.map((s) => {
                      const active = fromShopId === s.id;
                      return (
                        <Pressable
                          key={s.id}
                          onPress={() => setFromShopId(s.id)}
                          style={{
                            paddingHorizontal: 14,
                            height: 38,
                            borderRadius: 12,
                            borderWidth: 2,
                            alignItems: 'center',
                            justifyContent: 'center',
                            backgroundColor: active ? '#0891b2' : '#ffffff',
                            borderColor: active ? '#0891b2' : '#e5e7eb',
                          }}
                        >
                          <Text style={{ fontSize: 13, fontWeight: '700', color: active ? '#ffffff' : '#374151' }}>
                            {s.name}
                          </Text>
                        </Pressable>
                      );
                    })}
                  </ScrollView>
                </View>

                {/* To Shop */}
                <View>
                  <Text className="text-sm font-bold text-neutral-700 mb-2">{t('auto.index.to_shop')}</Text>
                  <ScrollView
                    horizontal
                    showsHorizontalScrollIndicator={false}
                    contentContainerStyle={{ gap: 8, paddingRight: 20 }}
                  >
                    {shops.filter((s) => s.id !== fromShopId).map((s) => {
                      const active = toShopId === s.id;
                      return (
                        <Pressable
                          key={s.id}
                          onPress={() => setToShopId(s.id)}
                          style={{
                            paddingHorizontal: 14,
                            height: 38,
                            borderRadius: 12,
                            borderWidth: 2,
                            alignItems: 'center',
                            justifyContent: 'center',
                            backgroundColor: active ? '#16a34a' : '#ffffff',
                            borderColor: active ? '#16a34a' : '#e5e7eb',
                          }}
                        >
                          <Text style={{ fontSize: 13, fontWeight: '700', color: active ? '#ffffff' : '#374151' }}>
                            {s.name}
                          </Text>
                        </Pressable>
                      );
                    })}
                  </ScrollView>
                </View>

                {/* Products */}
                <View>
                  <View className="flex-row items-center justify-between mb-2">
                    <Text className="text-sm font-bold text-neutral-700">
                      Products ({cart.length})
                    </Text>
                    <Pressable
                      onPress={() => setProductPickerOpen(true)}
                      className="h-9 px-3 rounded-xl flex-row items-center gap-1"
                      style={{ backgroundColor: '#0891b2' }}
                    >
                      <Plus size={14} color="#ffffff" />
                      <Text className="text-white font-bold text-xs">{t('auto.new.add_product')}</Text>
                    </Pressable>
                  </View>

                  {cart.length === 0 ? (
                    <View className="rounded-2xl border-2 border-dashed border-neutral-200 p-6 items-center">
                      <Package size={28} color="#9ca3af" />
                      <Text className="mt-2 text-sm text-neutral-500">{t('auto.index.no_products_added')}</Text>
                    </View>
                  ) : (
                    <View className="gap-2">
                      {cart.map((line) => (
                        <View
                          key={line.productId}
                          className="rounded-2xl border border-neutral-200 bg-white p-3 flex-row items-center gap-2"
                        >
                          <View className="flex-1">
                            <Text className="font-bold text-neutral-900" numberOfLines={1}>
                              {line.name}
                            </Text>
                            <Text className="text-[10px] text-neutral-500 mt-0.5">
                              Available: {line.stock} {line.unit}
                            </Text>
                          </View>
                          <View className="flex-row items-center gap-1.5 bg-neutral-50 rounded-xl p-1">
                            <Pressable
                              onPress={() =>
                                setCart((prev) =>
                                  prev.map((l) =>
                                    l.productId === line.productId
                                      ? { ...l, quantity: Math.max(1, l.quantity - 1) }
                                      : l,
                                  ),
                                )
                              }
                              className="h-7 w-7 rounded-lg bg-white border border-neutral-200 items-center justify-center"
                            >
                              <Minus size={12} color="#374151" />
                            </Pressable>
                            <Text className="font-extrabold w-7 text-center">{line.quantity}</Text>
                            <Pressable
                              onPress={() =>
                                setCart((prev) =>
                                  prev.map((l) =>
                                    l.productId === line.productId
                                      ? { ...l, quantity: Math.min(l.stock, l.quantity + 1) }
                                      : l,
                                  ),
                                )
                              }
                              className="h-7 w-7 rounded-lg items-center justify-center"
                              style={{ backgroundColor: '#0891b2' }}
                            >
                              <Plus size={12} color="#ffffff" />
                            </Pressable>
                          </View>
                          <Pressable
                            onPress={() =>
                              setCart((prev) => prev.filter((l) => l.productId !== line.productId))
                            }
                            className="h-8 w-8 rounded-lg bg-rose-50 border border-rose-200 items-center justify-center"
                          >
                            <Trash2 size={12} color="#dc2626" />
                          </Pressable>
                        </View>
                      ))}
                    </View>
                  )}
                </View>

                {/* Notes */}
                <View>
                  <Text className="text-sm font-bold text-neutral-700 mb-1.5">{t('auto.new.notes')}</Text>
                  <View className="flex-row items-center gap-2 rounded-2xl border border-neutral-200 bg-white px-4 h-12">
                    <TextInput
                      value={notes}
                      onChangeText={setNotes}
                      placeholder="Reason for transfer (optional)"
                      placeholderTextColor="#9ca3af"
                      className="flex-1 text-base"
                    />
                  </View>
                </View>
              </View>
            </ScrollView>

            <View className="px-5 py-4 border-t border-neutral-200 dark:border-neutral-800 bg-white dark:bg-neutral-900">
              <Pressable
                onPress={() => {
                  if (!fromShopId || !toShopId) {
                    Toast.show({ type: 'error', text1: 'Select source & destination' });
                    return;
                  }
                  if (cart.length === 0) {
                    Toast.show({ type: 'error', text1: 'Add at least 1 product' });
                    return;
                  }
                  createMutation.mutate();
                }}
                disabled={createMutation.isPending}
                className="h-14 rounded-2xl items-center justify-center flex-row gap-2 active:opacity-80"
                style={{
                  backgroundColor: createMutation.isPending ? '#9ca3af' : '#0891b2',
                  shadowColor: '#0891b2',
                  shadowOpacity: 0.4,
                  shadowRadius: 12,
                  elevation: 6,
                }}
              >
                <ArrowRightLeft size={20} color="#ffffff" />
                <Text className="text-white font-extrabold text-base">
                  {createMutation.isPending ? 'Creating...' : 'Create Transfer'}
                </Text>
              </Pressable>
            </View>
          </KeyboardAvoidingView>
        </SafeAreaView>
      </Modal>

      {/* Product Picker Modal */}
      <Modal visible={productPickerOpen} animationType="slide" presentationStyle="pageSheet">
        <SafeAreaView className="flex-1 bg-neutral-50 dark:bg-neutral-950">
          <View className="flex-row items-center justify-between px-5 py-4 border-b border-neutral-200 dark:border-neutral-800">
            <Text className="text-xl font-extrabold text-neutral-900 dark:text-white">{t('auto.new.select_product')}</Text>
            <Pressable
              onPress={() => setProductPickerOpen(false)}
              className="h-10 w-10 rounded-2xl bg-neutral-100 items-center justify-center"
            >
              <X size={20} color="#6b7280" />
            </Pressable>
          </View>
          <View className="px-5 py-3">
            <View className="flex-row items-center gap-2 rounded-2xl border border-neutral-200 bg-white px-4 h-12">
              <Search size={20} color="#9ca3af" />
              <TextInput
                placeholder="Search products..."
                value={productSearch}
                onChangeText={setProductSearch}
                className="flex-1 text-base"
                autoFocus
              />
            </View>
          </View>
          <ScrollView contentContainerStyle={{ padding: 20, paddingTop: 0 }}>
            {filteredProducts.length === 0 ? (
              <View className="items-center py-12">
                <Package size={40} color="#d1d5db" />
                <Text className="mt-3 text-neutral-500 font-semibold">{t('auto.index.no_products_found')}</Text>
              </View>
            ) : (
              <View className="gap-2">
                {filteredProducts.map((p) => (
                  <Pressable
                    key={p.id}
                    onPress={() => addProductToCart(p)}
                    className="flex-row items-center gap-3 p-3 rounded-2xl bg-white border border-neutral-200 active:opacity-70"
                  >
                    <View className="h-11 w-11 rounded-xl bg-cyan-100 items-center justify-center">
                      <Package size={18} color="#0891b2" />
                    </View>
                    <View className="flex-1">
                      <Text className="font-bold text-neutral-900" numberOfLines={1}>
                        {p.name}
                      </Text>
                      <Text className="text-xs text-neutral-500 mt-0.5">
                        Stock: {p.stock} {p.unit}
                      </Text>
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
