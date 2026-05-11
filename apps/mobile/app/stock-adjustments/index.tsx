import { useState, useMemo } from 'react';
import {
  View, Text, ScrollView, Pressable, RefreshControl, Modal,
  TextInput, KeyboardAvoidingView, Platform,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { useRouter, Stack } from 'expo-router';
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import * as Haptics from 'expo-haptics';
import {
  ArrowLeft, ClipboardCheck, Sparkles, Plus, Search, X, Check,
  Package, ArrowDownToLine, ArrowUpFromLine, AlertTriangle, TrendingDown,
} from 'lucide-react-native';
import { stockAdjustmentsApi, type AdjustmentType } from '@/api/stock-adjustments.api';
import { productsApi } from '@/api/products.api';
import Toast from 'react-native-toast-message';

import { useTranslation } from '@/i18n/useTranslation';
const adjustmentTypes: Array<{
  key: AdjustmentType;
  label: string;
  icon: any;
  color: string;
  bg: string;
  description: string;
}> = [
  {
    key: 'ADJUSTMENT_IN',
    label: 'Add Stock',
    icon: ArrowDownToLine,
    color: '#16a34a',
    bg: '#dcfce7',
    description: 'Stock count increase karein',
  },
  {
    key: 'ADJUSTMENT_OUT',
    label: 'Remove Stock',
    icon: ArrowUpFromLine,
    color: '#dc2626',
    bg: '#fee2e2',
    description: 'Stock count decrease karein',
  },
  {
    key: 'DAMAGE',
    label: 'Damaged',
    icon: AlertTriangle,
    color: '#dc2626',
    bg: '#fee2e2',
    description: 'Damaged stock write off',
  },
  {
    key: 'LOSS',
    label: 'Loss',
    icon: TrendingDown,
    color: '#737373',
    bg: '#f3f4f6',
    description: 'Lost / stolen items',
  },
];

const formatDate = (v: string) =>
  new Intl.DateTimeFormat('en-PK', {
    dateStyle: 'medium',
    timeStyle: 'short',
  }).format(new Date(v));

export default function StockAdjustmentsScreen() {
  const { t } = useTranslation();
  const router = useRouter();
  const queryClient = useQueryClient();
  const [refreshing, setRefreshing] = useState(false);
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
        return await productsApi.list({ limit: 200 });
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
    if (!q) return products;
    return products.filter((p) => p.name.toLowerCase().includes(q));
  }, [products, productSearch]);

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
    },
    onError: (e: any) =>
      Toast.show({ type: 'error', text1: e?.response?.data?.message || 'Failed' }),
  });

  return (
    <SafeAreaView className="flex-1 bg-neutral-50 dark:bg-neutral-950" edges={['top']}>
      <Stack.Screen options={{ headerShown: false }} />

      <View className="px-5 pt-4 pb-3 flex-row items-center gap-3">
        <Pressable
          onPress={() => router.back()}
          hitSlop={12}
          className="h-10 w-10 rounded-2xl bg-white dark:bg-neutral-900 items-center justify-center border border-neutral-200 dark:border-neutral-800"
        >
          <ArrowLeft size={20} color="#16a34a" />
        </Pressable>
        <View className="flex-1">
          <Text className="text-2xl font-extrabold text-neutral-900 dark:text-white">{t('auto.index.stock_adjustments')}</Text>
          <View className="flex-row items-center gap-1.5 mt-0.5">
            <Sparkles size={11} color="#7c3aed" />
            <Text className="text-xs text-neutral-500">
              {adjustments.length} adjustments
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
            backgroundColor: '#7c3aed',
            shadowColor: '#7c3aed',
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
          <RefreshControl refreshing={refreshing} onRefresh={onRefresh} tintColor="#7c3aed" />
        }
        showsVerticalScrollIndicator={false}
      >
        {/* Hero */}
        <View className="px-5 mb-4">
          <View
            className="rounded-3xl p-5"
            style={{
              backgroundColor: '#7c3aed',
              shadowColor: '#7c3aed',
              shadowOpacity: 0.3,
              shadowRadius: 16,
              shadowOffset: { width: 0, height: 8 },
              elevation: 10,
            }}
          >
            <View className="flex-row items-center gap-3">
              <View className="h-14 w-14 rounded-2xl bg-white/20 items-center justify-center">
                <ClipboardCheck size={28} color="#ffffff" />
              </View>
              <View className="flex-1">
                <Text className="text-xs font-bold uppercase tracking-wider text-white/80">{t('auto.index.stock_adjustments')}</Text>
                <Text className="text-3xl font-extrabold text-white">
                  {adjustments.length}
                </Text>
                <Text className="text-xs text-white/80 mt-0.5">{t('auto.index.manual_stock_corrections')}</Text>
              </View>
            </View>
          </View>
        </View>

        <View className="px-5">
          {adjustments.length === 0 ? (
            <View className="rounded-2xl bg-white dark:bg-neutral-900 border border-neutral-200 dark:border-neutral-800 items-center py-12">
              <View className="h-16 w-16 rounded-3xl bg-violet-100 items-center justify-center">
                <ClipboardCheck size={32} color="#7c3aed" />
              </View>
              <Text className="mt-3 text-base font-bold text-neutral-700">{t('auto.index.no_adjustments_yet')}</Text>
              <Pressable
                onPress={() => setCreateOpen(true)}
                className="mt-4 h-10 px-5 rounded-xl flex-row items-center gap-1.5"
                style={{ backgroundColor: '#7c3aed' }}
              >
                <Plus size={16} color="#ffffff" />
                <Text className="text-white font-bold text-sm">{t('auto.index.new_adjustment')}</Text>
              </Pressable>
            </View>
          ) : (
            <View className="gap-2.5">
              {adjustments.map((a) => {
                const cfg = adjustmentTypes.find((t) => t.key === a.type);
                if (!cfg) return null;
                const Icon = cfg.icon;
                const isIn = a.type === 'ADJUSTMENT_IN';
                return (
                  <View
                    key={a.id}
                    className="rounded-2xl bg-white dark:bg-neutral-900 border border-neutral-200 dark:border-neutral-800 p-3.5"
                  >
                    <View className="flex-row items-center gap-3">
                      <View
                        className="h-12 w-12 rounded-2xl items-center justify-center"
                        style={{ backgroundColor: cfg.bg }}
                      >
                        <Icon size={20} color={cfg.color} />
                      </View>
                      <View className="flex-1">
                        <Text
                          className="font-bold text-neutral-900 dark:text-white"
                          numberOfLines={1}
                        >
                          {a.product.name}
                        </Text>
                        <View className="flex-row items-center gap-1.5 mt-0.5">
                          <View
                            className="px-1.5 py-0.5 rounded-md"
                            style={{ backgroundColor: cfg.bg }}
                          >
                            <Text
                              className="text-[9px] font-extrabold"
                              style={{ color: cfg.color }}
                            >
                              {cfg.label}
                            </Text>
                          </View>
                          <Text className="text-[10px] text-neutral-500">
                            {formatDate(a.createdAt)}
                          </Text>
                        </View>
                      </View>
                      <View className="items-end">
                        <Text
                          className="text-lg font-extrabold"
                          style={{ color: isIn ? '#15803d' : '#b91c1c' }}
                        >
                          {isIn ? '+' : '-'}{a.quantity}
                        </Text>
                        <Text className="text-[9px] text-neutral-500 font-bold uppercase">
                          {a.product.unit}
                        </Text>
                      </View>
                    </View>
                    <View className="mt-2.5 pt-2.5 border-t border-neutral-100 dark:border-neutral-800">
                      <Text className="text-xs font-bold text-neutral-700">
                        Reason: <Text className="font-normal text-neutral-600">{a.reason}</Text>
                      </Text>
                      {a.note && (
                        <Text className="text-[11px] text-neutral-500 mt-1">{a.note}</Text>
                      )}
                      {a.createdBy && (
                        <Text className="text-[10px] text-neutral-400 mt-1">
                          By: {a.createdBy.fullName}
                        </Text>
                      )}
                    </View>
                  </View>
                );
              })}
            </View>
          )}
        </View>
      </ScrollView>

      {/* Create Modal */}
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
                  style={{ backgroundColor: '#7c3aed' }}
                >
                  <ClipboardCheck size={18} color="#ffffff" />
                </View>
                <Text className="text-xl font-extrabold text-neutral-900 dark:text-white">{t('auto.index.new_adjustment')}</Text>
              </View>
              <Pressable
                onPress={() => setCreateOpen(false)}
                hitSlop={12}
                className="h-10 w-10 rounded-2xl bg-neutral-100 dark:bg-neutral-800 items-center justify-center"
              >
                <X size={20} color="#6b7280" />
              </Pressable>
            </View>
            <ScrollView contentContainerStyle={{ padding: 20 }} keyboardShouldPersistTaps="handled">
              <View className="gap-4">
                {/* Product */}
                <View>
                  <Text className="text-sm font-bold text-neutral-700 mb-1.5">
                    Product <Text className="text-rose-600">*</Text>
                  </Text>
                  <Pressable
                    onPress={() => {
                      Haptics.selectionAsync();
                      setProductPickerOpen(true);
                    }}
                    className="flex-row items-center gap-3 px-4 py-3.5 rounded-2xl bg-white border border-neutral-200 active:opacity-70"
                  >
                    <View className="h-11 w-11 rounded-2xl bg-violet-100 items-center justify-center">
                      <Package size={20} color="#7c3aed" />
                    </View>
                    <View className="flex-1">
                      {selectedProduct ? (
                        <>
                          <Text className="font-bold text-neutral-900" numberOfLines={1}>
                            {selectedProduct.name}
                          </Text>
                          <Text className="text-xs text-neutral-500 mt-0.5">
                            Current stock: {selectedProduct.stock} {selectedProduct.unit}
                          </Text>
                        </>
                      ) : (
                        <Text className="text-neutral-500">{t('auto.index.select_product')}</Text>
                      )}
                    </View>
                  </Pressable>
                </View>

                {/* Type */}
                <View>
                  <Text className="text-sm font-bold text-neutral-700 mb-2">
                    Adjustment Type <Text className="text-rose-600">*</Text>
                  </Text>
                  <View className="gap-2">
                    {adjustmentTypes.map((t) => {
                      const Icon = t.icon;
                      const active = type === t.key;
                      return (
                        <Pressable
                          key={t.key}
                          onPress={() => {
                            Haptics.selectionAsync();
                            setType(t.key);
                          }}
                          className="flex-row items-center gap-3 p-3 rounded-2xl border-2"
                          style={{
                            borderColor: active ? t.color : '#e5e7eb',
                            backgroundColor: active ? t.bg : '#ffffff',
                          }}
                        >
                          <View
                            className="h-10 w-10 rounded-xl items-center justify-center"
                            style={{ backgroundColor: active ? t.color : t.bg }}
                          >
                            <Icon size={18} color={active ? '#ffffff' : t.color} />
                          </View>
                          <View className="flex-1">
                            <Text
                              className="font-bold"
                              style={{ color: active ? t.color : '#374151' }}
                            >
                              {t.label}
                            </Text>
                            <Text className="text-[11px] text-neutral-500 mt-0.5">
                              {t.description}
                            </Text>
                          </View>
                          {active && (
                            <View
                              className="h-6 w-6 rounded-full items-center justify-center"
                              style={{ backgroundColor: t.color }}
                            >
                              <Check size={14} color="#ffffff" />
                            </View>
                          )}
                        </Pressable>
                      );
                    })}
                  </View>
                </View>

                {/* Quantity */}
                <View>
                  <Text className="text-sm font-bold text-neutral-700 mb-1.5">
                    Quantity <Text className="text-rose-600">*</Text>
                  </Text>
                  <View className="flex-row items-center gap-2 rounded-2xl border border-neutral-200 bg-white px-4 h-12">
                    <TextInput
                      value={quantity}
                      onChangeText={setQuantity}
                      placeholder="0"
                      placeholderTextColor="#9ca3af"
                      keyboardType="numeric"
                      className="flex-1 text-base text-neutral-900"
                    />
                    {selectedProduct && (
                      <Text className="text-xs text-neutral-500 font-bold">
                        {selectedProduct.unit}
                      </Text>
                    )}
                  </View>
                </View>

                {/* Reason */}
                <View>
                  <Text className="text-sm font-bold text-neutral-700 mb-1.5">
                    Reason <Text className="text-rose-600">*</Text>
                  </Text>
                  <View className="flex-row items-center gap-2 rounded-2xl border border-neutral-200 bg-white px-4 h-12">
                    <TextInput
                      value={reason}
                      onChangeText={setReason}
                      placeholder="e.g., Damaged in storage"
                      placeholderTextColor="#9ca3af"
                      className="flex-1 text-base text-neutral-900"
                    />
                  </View>
                </View>

                {/* Note */}
                <View>
                  <Text className="text-sm font-bold text-neutral-700 mb-1.5">{t('auto.index.note')}</Text>
                  <View className="rounded-2xl border border-neutral-200 bg-white px-4 py-3">
                    <TextInput
                      value={note}
                      onChangeText={setNote}
                      placeholder="Additional details..."
                      placeholderTextColor="#9ca3af"
                      multiline
                      numberOfLines={3}
                      className="text-base text-neutral-900 min-h-[60px]"
                      textAlignVertical="top"
                    />
                  </View>
                </View>
              </View>
            </ScrollView>
            <View className="px-5 py-4 border-t border-neutral-200 dark:border-neutral-800 bg-white dark:bg-neutral-900">
              <Pressable
                onPress={() => {
                  if (!selectedProduct) {
                    Toast.show({ type: 'error', text1: 'Select product' });
                    return;
                  }
                  if (!Number(quantity) || Number(quantity) <= 0) {
                    Toast.show({ type: 'error', text1: 'Valid quantity' });
                    return;
                  }
                  if (!reason.trim()) {
                    Toast.show({ type: 'error', text1: 'Reason required' });
                    return;
                  }
                  createMutation.mutate();
                }}
                disabled={createMutation.isPending}
                className="h-14 rounded-2xl items-center justify-center flex-row gap-2 active:opacity-80"
                style={{
                  backgroundColor: createMutation.isPending ? '#9ca3af' : '#7c3aed',
                  shadowColor: '#7c3aed',
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

      {/* Product Picker */}
      <Modal visible={productPickerOpen} animationType="slide" presentationStyle="pageSheet">
        <SafeAreaView className="flex-1 bg-neutral-50">
          <View className="flex-row items-center justify-between px-5 py-4 border-b border-neutral-200">
            <Text className="text-xl font-extrabold text-neutral-900">{t('auto.new.select_product')}</Text>
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
                <Text className="mt-3 text-neutral-500 font-semibold">{t('auto.index.no_products')}</Text>
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
                    className="flex-row items-center gap-3 p-3 rounded-2xl bg-white border border-neutral-200 active:opacity-70"
                  >
                    <View className="h-11 w-11 rounded-xl bg-violet-100 items-center justify-center">
                      <Package size={18} color="#7c3aed" />
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
