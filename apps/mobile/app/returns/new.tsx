import { useEffect, useMemo, useState } from 'react';
import {
  View, Text, ScrollView, Pressable, TextInput, Modal,
  KeyboardAvoidingView, Platform,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { useRouter, Stack, useLocalSearchParams } from 'expo-router';
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import * as Haptics from 'expo-haptics';
import {
  ArrowLeft, RotateCcw, Search, X, Check, Receipt, User,
  Package, Minus, Plus, Banknote, CreditCard, Smartphone,
  Building2, Zap, AlertCircle, Sparkles,
} from 'lucide-react-native';
import { returnsApi } from '@/api/returns.api';
import { salesApi } from '@/api/sales.api';
import type { PaymentMethod } from '@/api/sales.api';
import { formatPKRFull } from '@/lib/format';
import Toast from 'react-native-toast-message';

import { useTranslation } from '@/i18n/useTranslation';
const refundMethods: Array<{
  key: PaymentMethod;
  label: string;
  icon: any;
  color: string;
}> = [
  { key: 'CASH', label: 'Cash', icon: Banknote, color: '#16a34a' },
  { key: 'CARD', label: 'Card', icon: CreditCard, color: '#2563eb' },
  { key: 'JAZZCASH', label: 'JazzCash', icon: Smartphone, color: '#f97316' },
  { key: 'EASYPAISA', label: 'EasyPaisa', icon: Zap, color: '#22c55e' },
  { key: 'BANK_TRANSFER', label: 'Bank', icon: Building2, color: '#8b5cf6' },
];

const reasonPresets = [
  'Defective product',
  'Wrong item',
  'Customer changed mind',
  'Damaged in transit',
  'Size/fit issue',
  'Not as described',
];

interface ReturnLine {
  saleItemId: string;
  productName: string;
  unit: string;
  price: number;
  maxQty: number;
  qty: number;
}

export default function NewReturnScreen() {
  const { t } = useTranslation();
  const router = useRouter();
  const queryClient = useQueryClient();
  const { saleId: preselectedSaleId } = useLocalSearchParams<{ saleId?: string }>();

  const [salePickerOpen, setSalePickerOpen] = useState(!preselectedSaleId);
  const [saleSearch, setSaleSearch] = useState('');
  const [selectedSaleId, setSelectedSaleId] = useState<string | null>(
    preselectedSaleId || null,
  );
  const [lines, setLines] = useState<ReturnLine[]>([]);
  const [refundMethod, setRefundMethod] = useState<PaymentMethod>('CASH');
  const [reason, setReason] = useState('');
  const [notes, setNotes] = useState('');

  // Fetch all sales for picker
  const { data: salesData } = useQuery({
    queryKey: ['returns-sales'],
    queryFn: async () => {
      try {
        return await salesApi.list({ limit: 100 });
      } catch {
        return { items: [], meta: { page: 1, limit: 0, total: 0, totalPages: 0 } };
      }
    },
  });

  // Fetch sale detail when selected
  const { data: sale } = useQuery({
    queryKey: ['sale-for-return', selectedSaleId],
    queryFn: async () => {
      if (!selectedSaleId) return null;
      try {
        return await salesApi.byId(selectedSaleId);
      } catch {
        return null;
      }
    },
    enabled: !!selectedSaleId,
  });

  // Initialize lines when sale loads
  useEffect(() => {
    if (sale && lines.length === 0) {
      setLines(
        sale.items.map((item: any) => ({
          saleItemId: item.id,
          productName: item.product.name,
          unit: item.product.unit,
          price: item.price,
          maxQty: item.quantity - (item.returnedQty || 0),
          qty: 0,
        })),
      );
    }
  }, [sale]);

  const allSales = salesData?.items ?? [];
  const filteredSales = useMemo(() => {
    const q = saleSearch.toLowerCase().trim();
    if (!q) return allSales;
    return allSales.filter(
      (s) =>
        s.saleNumber.toLowerCase().includes(q) ||
        (s.customer?.name || '').toLowerCase().includes(q),
    );
  }, [allSales, saleSearch]);

  const refundAmount = lines.reduce((s, l) => s + l.price * l.qty, 0);
  const hasItems = lines.some((l) => l.qty > 0);

  const createMutation = useMutation({
    mutationFn: () =>
      returnsApi.create({
        saleId: selectedSaleId!,
        reason: reason.trim() || undefined,
        refundMethod,
        notes: notes.trim() || undefined,
        items: lines
          .filter((l) => l.qty > 0)
          .map((l) => ({ saleItemId: l.saleItemId, quantity: l.qty })),
      }),
    onSuccess: () => {
      Haptics.notificationAsync(Haptics.NotificationFeedbackType.Success);
      Toast.show({
        type: 'success',
        text1: '✅ Return processed!',
        text2: `Refunded ${formatPKRFull(refundAmount)}`,
      });
      queryClient.invalidateQueries({ queryKey: ['returns'] });
      queryClient.invalidateQueries({ queryKey: ['sales'] });
      queryClient.invalidateQueries({ queryKey: ['products'] });
      router.replace('/returns');
    },
    onError: (e: any) => {
      Haptics.notificationAsync(Haptics.NotificationFeedbackType.Error);
      Toast.show({
        type: 'error',
        text1: 'Return failed',
        text2: e?.response?.data?.message?.[0] || e?.response?.data?.message || 'Try again',
      });
    },
  });

  const updateQty = (saleItemId: string, delta: number) => {
    Haptics.selectionAsync();
    setLines((prev) =>
      prev.map((l) => {
        if (l.saleItemId !== saleItemId) return l;
        const newQty = Math.max(0, Math.min(l.maxQty, l.qty + delta));
        return { ...l, qty: newQty };
      }),
    );
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
          <Text className="text-2xl font-extrabold text-neutral-900 dark:text-white">{t('auto.new.new_return')}</Text>
          <View className="flex-row items-center gap-1.5 mt-0.5">
            <Sparkles size={11} color="#f97316" />
            <Text className="text-xs text-neutral-500">{t('auto.new.process_refund_exchange')}</Text>
          </View>
        </View>
      </View>

      <KeyboardAvoidingView
        behavior={Platform.OS === 'ios' ? 'padding' : 'height'}
        className="flex-1"
      >
        <ScrollView
          contentContainerStyle={{ padding: 20, paddingBottom: 40 }}
          keyboardShouldPersistTaps="handled"
          showsVerticalScrollIndicator={false}
        >
          {/* Sale Selector */}
          <Text className="text-xs font-bold uppercase text-neutral-500 mb-2 tracking-wider">{t('auto.new.sale_receipt')}</Text>
          <Pressable
            onPress={() => {
              Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
              setSalePickerOpen(true);
            }}
            className="flex-row items-center gap-3 px-4 py-3.5 rounded-2xl bg-white dark:bg-neutral-900 border border-neutral-200 dark:border-neutral-800 mb-4 active:opacity-70"
          >
            <View className="h-11 w-11 rounded-2xl bg-orange-100 dark:bg-orange-950/40 items-center justify-center">
              <Receipt size={20} color="#f97316" />
            </View>
            <View className="flex-1">
              {sale ? (
                <>
                  <Text className="font-extrabold text-neutral-900 dark:text-white">
                    {sale.saleNumber}
                  </Text>
                  <Text className="text-xs text-neutral-500 mt-0.5">
                    {sale.customer?.name || 'Walk-in'} • {formatPKRFull(sale.total)}
                  </Text>
                </>
              ) : (
                <>
                  <Text className="font-bold text-neutral-900 dark:text-white">{t('auto.new.select_sale')}</Text>
                  <Text className="text-xs text-neutral-500 mt-0.5">{t('auto.new.receipt_choose_karein')}</Text>
                </>
              )}
            </View>
            <ChevronRight size={18} color="#9ca3af" />
          </Pressable>

          {/* Items */}
          {sale && lines.length > 0 && (
            <>
              <Text className="text-xs font-bold uppercase text-neutral-500 mb-2 tracking-wider">{t('auto.new.items_to_return')}</Text>
              <View className="gap-2 mb-4">
                {lines.map((line) => {
                  const isSelected = line.qty > 0;
                  return (
                    <View
                      key={line.saleItemId}
                      className="rounded-2xl border-2 p-3"
                      style={{
                        borderColor: isSelected ? '#f97316' : '#e5e7eb',
                        backgroundColor: isSelected ? '#fff7ed' : '#ffffff',
                      }}
                    >
                      <View className="flex-row items-start gap-3">
                        <View className="h-11 w-11 rounded-xl bg-orange-100 items-center justify-center">
                          <Package size={18} color="#f97316" />
                        </View>
                        <View className="flex-1">
                          <Text
                            className="font-bold text-neutral-900 dark:text-white"
                            numberOfLines={2}
                          >
                            {line.productName}
                          </Text>
                          <Text className="text-xs text-neutral-500 mt-0.5">
                            {formatPKRFull(line.price)} / {line.unit}
                          </Text>
                          <Text className="text-[10px] text-orange-700 mt-0.5 font-semibold">
                            Available to return: {line.maxQty} {line.unit}
                          </Text>
                        </View>
                      </View>

                      {line.maxQty > 0 ? (
                        <View className="mt-3 flex-row items-center justify-between">
                          <View className="flex-row items-center gap-1.5 bg-white rounded-xl p-1 border border-neutral-200">
                            <Pressable
                              onPress={() => updateQty(line.saleItemId, -1)}
                              disabled={line.qty === 0}
                              className="h-8 w-8 rounded-lg bg-neutral-100 items-center justify-center"
                              style={{ opacity: line.qty === 0 ? 0.5 : 1 }}
                            >
                              <Minus size={14} color="#374151" />
                            </Pressable>
                            <Text className="font-extrabold w-8 text-center text-neutral-900">
                              {line.qty}
                            </Text>
                            <Pressable
                              onPress={() => updateQty(line.saleItemId, 1)}
                              disabled={line.qty >= line.maxQty}
                              className="h-8 w-8 rounded-lg items-center justify-center"
                              style={{
                                backgroundColor: line.qty >= line.maxQty ? '#d1d5db' : '#f97316',
                              }}
                            >
                              <Plus size={14} color="#ffffff" />
                            </Pressable>
                          </View>
                          {line.qty > 0 && (
                            <Text className="text-base font-extrabold text-rose-700">
                              -{formatPKRFull(line.price * line.qty)}
                            </Text>
                          )}
                        </View>
                      ) : (
                        <View className="mt-2 p-2 rounded-lg bg-neutral-100 flex-row items-center gap-1.5">
                          <AlertCircle size={12} color="#737373" />
                          <Text className="text-[11px] text-neutral-600">{t('auto.new.already_fully_returned')}</Text>
                        </View>
                      )}
                    </View>
                  );
                })}
              </View>

              {/* Reason Presets */}
              <Text className="text-xs font-bold uppercase text-neutral-500 mb-2 tracking-wider">{t('auto.new.reason_quick_select')}</Text>
              <ScrollView
                horizontal
                showsHorizontalScrollIndicator={false}
                contentContainerStyle={{ gap: 8, paddingRight: 20, marginBottom: 8 }}
              >
                {reasonPresets.map((preset) => {
                  const active = reason === preset;
                  return (
                    <Pressable
                      key={preset}
                      onPress={() => {
                        Haptics.selectionAsync();
                        setReason(preset);
                      }}
                      style={{
                        paddingHorizontal: 12,
                        height: 36,
                        borderRadius: 999,
                        borderWidth: 2,
                        alignItems: 'center',
                        justifyContent: 'center',
                        backgroundColor: active ? '#f97316' : '#ffffff',
                        borderColor: active ? '#f97316' : '#e5e7eb',
                      }}
                    >
                      <Text
                        style={{
                          fontSize: 12,
                          fontWeight: '700',
                          color: active ? '#ffffff' : '#6b7280',
                        }}
                      >
                        {preset}
                      </Text>
                    </Pressable>
                  );
                })}
              </ScrollView>

              <View className="flex-row items-center gap-2 rounded-2xl border border-neutral-200 bg-white px-4 h-12 mb-4">
                <TextInput
                  value={reason}
                  onChangeText={setReason}
                  placeholder="Custom reason..."
                  placeholderTextColor="#9ca3af"
                  className="flex-1 text-base text-neutral-900"
                />
              </View>

              {/* Refund Method */}
              <Text className="text-xs font-bold uppercase text-neutral-500 mb-2 tracking-wider">{t('auto.new.refund_method')}</Text>
              <View className="flex-row flex-wrap -m-1 mb-4">
                {refundMethods.map((m) => {
                  const Icon = m.icon;
                  const active = refundMethod === m.key;
                  return (
                    <View key={m.key} className="w-1/3 p-1">
                      <Pressable
                        onPress={() => {
                          Haptics.selectionAsync();
                          setRefundMethod(m.key);
                        }}
                        className="h-20 rounded-2xl items-center justify-center gap-1 border-2"
                        style={{
                          backgroundColor: active ? m.color : '#ffffff',
                          borderColor: active ? m.color : '#e5e7eb',
                        }}
                      >
                        <Icon size={20} color={active ? '#ffffff' : m.color} />
                        <Text
                          className="text-xs font-bold"
                          style={{ color: active ? '#ffffff' : '#374151' }}
                        >
                          {m.label}
                        </Text>
                      </Pressable>
                    </View>
                  );
                })}
              </View>

              {/* Notes */}
              <Text className="text-xs font-bold uppercase text-neutral-500 mb-2 tracking-wider">{t('auto.new.notes_optional')}</Text>
              <View className="rounded-2xl border border-neutral-200 bg-white px-4 py-3 mb-4">
                <TextInput
                  value={notes}
                  onChangeText={setNotes}
                  placeholder="Additional notes..."
                  placeholderTextColor="#9ca3af"
                  multiline
                  numberOfLines={3}
                  className="text-base text-neutral-900 min-h-[60px]"
                  textAlignVertical="top"
                />
              </View>

              {/* Refund Summary */}
              {hasItems && (
                <View
                  className="rounded-3xl p-5 mb-4"
                  style={{
                    backgroundColor: '#dc2626',
                    shadowColor: '#dc2626',
                    shadowOpacity: 0.3,
                    shadowRadius: 12,
                    elevation: 6,
                  }}
                >
                  <Text className="text-xs font-bold uppercase tracking-wider text-white/80">{t('auto.new.total_refund')}</Text>
                  <Text className="text-4xl font-extrabold text-white mt-1">
                    -{formatPKRFull(refundAmount)}
                  </Text>
                  <Text className="text-xs text-white/80 mt-2">
                    {lines.filter((l) => l.qty > 0).length} items •{' '}
                    {refundMethods.find((m) => m.key === refundMethod)?.label}
                  </Text>
                </View>
              )}
            </>
          )}
        </ScrollView>

        {/* Submit Button */}
        {sale && (
          <View className="px-5 py-4 border-t border-neutral-200 dark:border-neutral-800 bg-white dark:bg-neutral-900">
            <Pressable
              onPress={() => createMutation.mutate()}
              disabled={createMutation.isPending || !hasItems}
              className="h-14 rounded-2xl items-center justify-center flex-row gap-2 active:opacity-80"
              style={{
                backgroundColor:
                  createMutation.isPending || !hasItems ? '#9ca3af' : '#f97316',
                shadowColor: '#f97316',
                shadowOpacity: 0.4,
                shadowRadius: 12,
                elevation: 6,
              }}
            >
              {createMutation.isPending ? (
                <Text className="text-white font-extrabold text-base">{t('auto.new.processing')}</Text>
              ) : (
                <>
                  <RotateCcw size={20} color="#ffffff" />
                  <Text className="text-white font-extrabold text-base">{t('auto.new.process_return')}</Text>
                </>
              )}
            </Pressable>
          </View>
        )}
      </KeyboardAvoidingView>

      {/* Sale Picker Modal */}
      <Modal visible={salePickerOpen} animationType="slide" presentationStyle="pageSheet">
        <SafeAreaView className="flex-1 bg-neutral-50">
          <View className="flex-row items-center justify-between px-5 py-4 border-b border-neutral-200">
            <Text className="text-xl font-extrabold text-neutral-900">
              Select Sale
            </Text>
            <Pressable
              onPress={() => {
                if (selectedSaleId) setSalePickerOpen(false);
                else router.back();
              }}
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
                placeholder="Search by sale number or customer..."
                value={saleSearch}
                onChangeText={setSaleSearch}
                className="flex-1 text-base"
                autoFocus
              />
            </View>
          </View>
          <ScrollView contentContainerStyle={{ padding: 20, paddingTop: 0 }}>
            {filteredSales.length === 0 ? (
              <View className="items-center py-12">
                <Receipt size={40} color="#d1d5db" />
                <Text className="mt-3 text-neutral-500 font-semibold">{t('auto.new.no_sales_found')}</Text>
              </View>
            ) : (
              <View className="gap-2">
                {filteredSales.map((s) => (
                  <Pressable
                    key={s.id}
                    onPress={() => {
                      Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
                      setSelectedSaleId(s.id);
                      setLines([]);
                      setSalePickerOpen(false);
                      setSaleSearch('');
                    }}
                    className="flex-row items-center gap-3 p-3 rounded-2xl bg-white border border-neutral-200 active:opacity-70"
                  >
                    <View className="h-11 w-11 rounded-xl bg-orange-100 items-center justify-center">
                      <Receipt size={18} color="#f97316" />
                    </View>
                    <View className="flex-1">
                      <Text className="font-mono font-extrabold text-neutral-900">
                        {s.saleNumber}
                      </Text>
                      <Text className="text-xs text-neutral-500 mt-0.5" numberOfLines={1}>
                        {s.customer?.name || 'Walk-in'} • {s.items.length} items
                      </Text>
                    </View>
                    <View className="items-end">
                      <Text className="font-extrabold text-emerald-700">
                        {formatPKRFull(s.total)}
                      </Text>
                      {s.status !== 'COMPLETED' && (
                        <View
                          className="mt-1 px-1.5 py-0.5 rounded-md"
                          style={{ backgroundColor: '#fef3c7' }}
                        >
                          <Text className="text-[9px] font-extrabold text-amber-700">
                            {s.status}
                          </Text>
                        </View>
                      )}
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

function ChevronRight({ size, color }: { size: number; color: string }) {
  return (
    <View style={{ width: size, height: size, justifyContent: 'center', alignItems: 'center' }}>
      <Text style={{ color, fontSize: size, fontWeight: '300' }}>›</Text>
    </View>
  );
}
