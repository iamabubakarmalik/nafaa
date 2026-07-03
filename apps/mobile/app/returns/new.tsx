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
  Building2, Zap, AlertCircle, Sparkles, Layers, Scissors,
  Settings, AlertTriangle, ChevronRight,
} from 'lucide-react-native';
import { returnsApi, parseCarpetNote, type CarpetInfo } from '@/api/returns.api';
import { salesApi } from '@/api/sales.api';
import type { PaymentMethod } from '@/api/sales.api';
import { formatPKRFull } from '@/lib/format';
import {
  CarpetReturnOptionsModal,
  type CarpetReturnOptions,
} from '@/components/returns/CarpetReturnOptionsModal';
import { useSmartBack } from '@/hooks/useSmartBack';
import Toast from 'react-native-toast-message';

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

const CARPET_UNITS = new Set(['sqft', 'sqm', 'sqyd']);

interface ReturnLine {
  saleItemId: string;
  productName: string;
  variantName?: string;
  variantColorHex?: string;
  unit: string;
  price: number;
  maxQty: number;
  qty: number;
  note?: string | null;
  isCarpet: boolean;
  carpetInfo?: CarpetInfo;
  carpetOptions?: CarpetReturnOptions;
}

export default function NewReturnScreen() {
  const router = useRouter();
  const goBack = useSmartBack();
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

  // Carpet dialog state
  const [carpetDialogFor, setCarpetDialogFor] = useState<{
    lineIndex: number;
    saleItem: any;
  } | null>(null);

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
        sale.items.map((item: any) => {
          const variant = item.variantLink?.variant;
          const isCarpet = CARPET_UNITS.has(item.product.unit);
          const carpetInfo = isCarpet ? parseCarpetNote(item.note) : undefined;
          return {
            saleItemId: item.id,
            productName: item.product.name,
            variantName: variant?.name,
            variantColorHex: variant?.colorHex,
            unit: item.product.unit,
            price: item.price,
            maxQty: item.quantity - (item.returnedQty || 0),
            qty: 0,
            note: item.note,
            isCarpet,
            carpetInfo,
          };
        }),
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

  // Carpet stats
  const carpetStats = useMemo(() => {
    const active = lines.filter((l) => l.qty > 0);
    const carpetActive = active.filter((l) => l.isCarpet);
    const willCreatePieces = carpetActive.filter(
      (l) => l.carpetOptions?.createCutPiece && !l.carpetOptions?.isDamaged,
    ).length;
    const willCreateDamaged = carpetActive.filter(
      (l) => l.carpetOptions?.createCutPiece && l.carpetOptions?.isDamaged,
    ).length;
    const unconfigured = carpetActive.filter((l) => !l.carpetOptions).length;
    return { carpetActive: carpetActive.length, willCreatePieces, willCreateDamaged, unconfigured };
  }, [lines]);

  const createMutation = useMutation({
    mutationFn: () =>
      returnsApi.create({
        saleId: selectedSaleId!,
        reason: reason.trim() || undefined,
        refundMethod,
        notes: notes.trim() || undefined,
        items: lines
          .filter((l) => l.qty > 0)
          .map((l) => ({
            saleItemId: l.saleItemId,
            quantity: l.qty,
            ...(l.isCarpet && l.carpetOptions
              ? {
                  createCutPiece: l.carpetOptions.createCutPiece,
                  isDamaged: l.carpetOptions.isDamaged,
                  cutPieceCondition: l.carpetOptions.cutPieceCondition,
                  cutPieceWidthFt: l.carpetOptions.cutPieceWidthFt,
                  cutPieceLengthFt: l.carpetOptions.cutPieceLengthFt,
                  cutPieceNotes: l.carpetOptions.cutPieceNotes,
                }
              : {}),
          })),
      }),
    onSuccess: (result) => {
      const cutPiecesCount = result.createdCutPieces?.length ?? 0;
      Haptics.notificationAsync(Haptics.NotificationFeedbackType.Success);
      Toast.show({
        type: 'success',
        text1: '✅ Return processed!',
        text2:
          cutPiecesCount > 0
            ? `Refunded ${formatPKRFull(refundAmount)} + ${cutPiecesCount} cut piece${cutPiecesCount !== 1 ? 's' : ''} created`
            : `Refunded ${formatPKRFull(refundAmount)}`,
      });
      queryClient.invalidateQueries({ queryKey: ['returns'] });
      queryClient.invalidateQueries({ queryKey: ['sales'] });
      queryClient.invalidateQueries({ queryKey: ['products'] });
      queryClient.invalidateQueries({ queryKey: ['carpet-rolls'] });
      queryClient.invalidateQueries({ queryKey: ['carpet-cut-pieces'] });
      queryClient.invalidateQueries({ queryKey: ['carpet-product-summary'] });
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

  const setLineQty = (saleItemId: string, qty: number) => {
    setLines((prev) =>
      prev.map((l) => {
        if (l.saleItemId !== saleItemId) return l;
        return { ...l, qty: Math.max(0, Math.min(l.maxQty, qty)) };
      }),
    );
  };

  const openCarpetDialog = (lineIndex: number) => {
    if (!sale) return;
    const line = lines[lineIndex];
    const saleItem = sale.items.find((i: any) => i.id === line.saleItemId);
    if (!saleItem) return;
    setCarpetDialogFor({ lineIndex, saleItem });
  };

  const handleCarpetConfirm = (options: CarpetReturnOptions) => {
    if (!carpetDialogFor) return;
    const { lineIndex } = carpetDialogFor;

    setLines((prev) =>
      prev.map((l, i) => (i === lineIndex ? { ...l, carpetOptions: options } : l)),
    );

    setCarpetDialogFor(null);

    Toast.show({
      type: 'success',
      text1: options.isDamaged
        ? '⚠️ Marked as damaged'
        : options.createCutPiece
        ? '✓ Cut piece will be created'
        : '✓ Configured — no piece',
    });
  };

  const handleSubmit = () => {
    if (!hasItems) {
      Toast.show({ type: 'error', text1: 'Kam se kam 1 item add karein' });
      return;
    }
    if (carpetStats.unconfigured > 0) {
      Toast.show({
        type: 'error',
        text1: `${carpetStats.unconfigured} carpet item${carpetStats.unconfigured !== 1 ? 's' : ''} need configuration`,
        text2: 'Cog icon tap karke setup karein',
      });
      return;
    }
    createMutation.mutate();
  };

  const activeCarpetLine =
    carpetDialogFor !== null ? lines[carpetDialogFor.lineIndex] : null;

  return (
    <SafeAreaView className="flex-1 bg-neutral-50 dark:bg-neutral-950" edges={['top']}>
      <Stack.Screen options={{ headerShown: false }} />

      {/* Header */}
      <View className="px-5 pt-4 pb-3 flex-row items-center gap-3">
        <Pressable
          onPress={goBack}
          hitSlop={12}
          className="h-10 w-10 rounded-2xl bg-white dark:bg-neutral-900 items-center justify-center border border-neutral-200 dark:border-neutral-800"
        >
          <ArrowLeft size={20} color="#f97316" />
        </Pressable>
        <View className="flex-1">
          <Text className="text-2xl font-extrabold text-neutral-900 dark:text-white">New Return</Text>
          <View className="flex-row items-center gap-1.5 mt-0.5">
            <Sparkles size={11} color="#f97316" />
            <Text className="text-xs text-neutral-500">Process refund + carpet cut piece</Text>
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
          <Text className="text-xs font-bold uppercase text-neutral-500 mb-2 tracking-wider">
            Sale Receipt
          </Text>
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
                  <Text className="font-extrabold text-neutral-900 dark:text-white font-mono">
                    {sale.saleNumber}
                  </Text>
                  <Text className="text-xs text-neutral-500 mt-0.5">
                    {sale.customer?.name || 'Walk-in'} • {formatPKRFull(sale.total)}
                  </Text>
                </>
              ) : (
                <>
                  <Text className="font-bold text-neutral-900 dark:text-white">Select Sale</Text>
                  <Text className="text-xs text-neutral-500 mt-0.5">Receipt choose karein</Text>
                </>
              )}
            </View>
            <ChevronRight size={18} color="#9ca3af" />
          </Pressable>

          {/* Carpet Inventory Actions Banner */}
          {carpetStats.carpetActive > 0 && (
            <View className="rounded-2xl bg-emerald-50 border-2 border-emerald-300 p-4 mb-4">
              <View className="flex-row items-center gap-2 mb-3">
                <Layers size={14} color="#16a34a" />
                <Text className="text-xs font-extrabold uppercase text-emerald-700 tracking-wider">
                  Carpet Inventory Actions
                </Text>
              </View>
              <View className="flex-row gap-2">
                <View className="flex-1 rounded-xl bg-white p-2.5 items-center">
                  <Text className="text-[9px] uppercase font-extrabold text-emerald-700">Cart</Text>
                  <Text className="text-xl font-extrabold text-emerald-900 mt-0.5">
                    {carpetStats.carpetActive}
                  </Text>
                  <Text className="text-[9px] text-emerald-700 font-bold">carpet items</Text>
                </View>
                <View className="flex-1 rounded-xl bg-white p-2.5 items-center">
                  <Text className="text-[9px] uppercase font-extrabold text-emerald-700">Resellable</Text>
                  <Text className="text-xl font-extrabold text-emerald-900 mt-0.5">
                    {carpetStats.willCreatePieces}
                  </Text>
                  <Text className="text-[9px] text-emerald-700 font-bold">pieces</Text>
                </View>
                <View className="flex-1 rounded-xl bg-white p-2.5 items-center">
                  <Text className="text-[9px] uppercase font-extrabold text-rose-700">Damaged</Text>
                  <Text className="text-xl font-extrabold text-rose-900 mt-0.5">
                    {carpetStats.willCreateDamaged}
                  </Text>
                  <Text className="text-[9px] text-rose-700 font-bold">pieces</Text>
                </View>
              </View>
              {carpetStats.unconfigured > 0 && (
                <View className="mt-3 rounded-lg bg-amber-100 border border-amber-300 p-2 flex-row items-center gap-1.5">
                  <AlertTriangle size={14} color="#b45309" />
                  <Text className="flex-1 text-[11px] text-amber-900 font-bold">
                    {carpetStats.unconfigured} carpet item{carpetStats.unconfigured !== 1 ? 's' : ''} need configuration — tap ⚙️
                  </Text>
                </View>
              )}
            </View>
          )}

          {/* Items */}
          {sale && lines.length > 0 && (
            <>
              <Text className="text-xs font-bold uppercase text-neutral-500 mb-2 tracking-wider">
                Items to Return
              </Text>
              <View className="gap-2 mb-4">
                {lines.map((line, idx) => {
                  const isSelected = line.qty > 0;
                  const carpetConfigured = line.isCarpet && line.carpetOptions;
                  const isDamaged = line.carpetOptions?.isDamaged;
                  const willCreatePiece = line.carpetOptions?.createCutPiece;

                  return (
                    <View
                      key={line.saleItemId}
                      className="rounded-2xl border-2 p-3"
                      style={{
                        borderColor: !isSelected
                          ? '#e5e7eb'
                          : line.isCarpet
                          ? isDamaged
                            ? '#fca5a5'
                            : willCreatePiece
                            ? '#86efac'
                            : '#fcd34d'
                          : '#fdba74',
                        backgroundColor: !isSelected
                          ? '#ffffff'
                          : line.isCarpet
                          ? isDamaged
                            ? '#fef2f2'
                            : willCreatePiece
                            ? '#f0fdf4'
                            : '#fffbeb'
                          : '#fff7ed',
                      }}
                    >
                      <View className="flex-row items-start gap-3">
                        <View
                          className="h-11 w-11 rounded-xl items-center justify-center shrink-0"
                          style={{
                            backgroundColor: line.variantColorHex || (line.isCarpet ? '#dcfce7' : '#ffedd5'),
                          }}
                        >
                          {!line.variantColorHex &&
                            (line.isCarpet ? (
                              <Layers size={18} color="#16a34a" />
                            ) : (
                              <Package size={18} color="#f97316" />
                            ))}
                        </View>
                        <View className="flex-1">
                          <View className="flex-row items-center gap-2 flex-wrap">
                            <Text
                              className="font-bold text-neutral-900 dark:text-white"
                              numberOfLines={2}
                            >
                              {line.productName}
                            </Text>
                            {line.isCarpet && (
                              <View className="flex-row items-center gap-0.5 px-1.5 py-0.5 rounded bg-emerald-100">
                                <Layers size={9} color="#16a34a" />
                                <Text className="text-[9px] font-extrabold text-emerald-700">
                                  CARPET
                                </Text>
                              </View>
                            )}
                          </View>
                          {line.variantName && (
                            <Text className="text-[10px] font-bold text-violet-700 mt-0.5">
                              {line.variantName}
                            </Text>
                          )}
                          <Text className="text-xs text-neutral-500 mt-0.5">
                            {formatPKRFull(line.price)} / {line.unit}
                          </Text>
                          <Text className="text-[10px] text-orange-700 mt-0.5 font-semibold">
                            Available: {line.maxQty.toFixed(line.maxQty % 1 === 0 ? 0 : 2)} {line.unit}
                          </Text>
                          {line.isCarpet && line.note && (
                            <View className="mt-1 px-2 py-1 rounded-md bg-emerald-100/50 border border-emerald-200 self-start">
                              <Text className="text-[10px] text-emerald-800 font-bold italic" numberOfLines={1}>
                                {line.note}
                              </Text>
                            </View>
                          )}

                          {/* Carpet action badge */}
                          {isSelected && line.isCarpet && (
                            <View className="mt-1.5">
                              {carpetConfigured ? (
                                <View
                                  className="self-start px-2 py-0.5 rounded-md flex-row items-center gap-1"
                                  style={{
                                    backgroundColor: isDamaged
                                      ? '#fee2e2'
                                      : willCreatePiece
                                      ? '#dcfce7'
                                      : '#fef3c7',
                                  }}
                                >
                                  {isDamaged ? (
                                    <>
                                      <AlertTriangle size={9} color="#b91c1c" />
                                      <Text className="text-[9px] font-extrabold text-rose-700">
                                        DAMAGED PIECE
                                      </Text>
                                    </>
                                  ) : willCreatePiece ? (
                                    <>
                                      <Scissors size={9} color="#15803d" />
                                      <Text className="text-[9px] font-extrabold text-emerald-700">
                                        WILL CREATE PIECE
                                      </Text>
                                    </>
                                  ) : (
                                    <>
                                      <Layers size={9} color="#b45309" />
                                      <Text className="text-[9px] font-extrabold text-amber-700">
                                        NO PIECE
                                      </Text>
                                    </>
                                  )}
                                </View>
                              ) : (
                                <View className="self-start px-2 py-0.5 rounded-md bg-amber-100 border border-amber-300 flex-row items-center gap-1">
                                  <AlertTriangle size={9} color="#b45309" />
                                  <Text className="text-[9px] font-extrabold text-amber-800">
                                    CONFIGURE FIRST
                                  </Text>
                                </View>
                              )}
                            </View>
                          )}
                        </View>
                      </View>

                      {line.maxQty > 0 ? (
                        <View className="mt-3 flex-row items-center justify-between gap-2">
                          <View className="flex-row items-center gap-1.5 bg-white rounded-xl p-1 border border-neutral-200">
                            <Pressable
                              onPress={() => updateQty(line.saleItemId, -1)}
                              disabled={line.qty === 0}
                              className="h-8 w-8 rounded-lg bg-neutral-100 items-center justify-center"
                              style={{ opacity: line.qty === 0 ? 0.5 : 1 }}
                            >
                              <Minus size={14} color="#374151" />
                            </Pressable>
                            <TextInput
                              value={String(line.qty)}
                              onChangeText={(t) => {
                                const v = parseFloat(t);
                                if (!isNaN(v)) setLineQty(line.saleItemId, v);
                              }}
                              keyboardType="decimal-pad"
                              className="w-12 text-center font-extrabold text-neutral-900"
                            />
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
                            <Pressable
                              onPress={() => setLineQty(line.saleItemId, line.maxQty)}
                              className="px-2.5 h-8 rounded-lg bg-amber-100 items-center justify-center"
                            >
                              <Text className="text-[10px] font-extrabold text-amber-800">Max</Text>
                            </Pressable>
                          </View>

                          <View className="flex-row items-center gap-2">
                            {line.qty > 0 && line.isCarpet && (
                              <Pressable
                                onPress={() => openCarpetDialog(idx)}
                                className="px-3 h-9 rounded-lg flex-row items-center gap-1.5 active:opacity-80"
                                style={{
                                  backgroundColor: carpetConfigured ? '#16a34a' : '#d97706',
                                }}
                              >
                                <Settings size={12} color="#ffffff" />
                                <Text className="text-white text-[11px] font-extrabold">
                                  {carpetConfigured ? 'Edit' : 'Configure'}
                                </Text>
                              </Pressable>
                            )}
                            {line.qty > 0 && (
                              <Text className="text-base font-extrabold text-rose-700">
                                -{formatPKRFull(line.price * line.qty)}
                              </Text>
                            )}
                          </View>
                        </View>
                      ) : (
                        <View className="mt-2 p-2 rounded-lg bg-neutral-100 flex-row items-center gap-1.5">
                          <AlertCircle size={12} color="#737373" />
                          <Text className="text-[11px] text-neutral-600">
                            Already fully returned
                          </Text>
                        </View>
                      )}
                    </View>
                  );
                })}
              </View>

              {/* Reason Presets */}
              <Text className="text-xs font-bold uppercase text-neutral-500 mb-2 tracking-wider">
                Reason (quick select)
              </Text>
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
              <Text className="text-xs font-bold uppercase text-neutral-500 mb-2 tracking-wider">
                Refund Method
              </Text>
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
              <Text className="text-xs font-bold uppercase text-neutral-500 mb-2 tracking-wider">
                Notes (optional)
              </Text>
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
                  <Text className="text-xs font-bold uppercase tracking-wider text-white/80">
                    Total Refund
                  </Text>
                  <Text className="text-4xl font-extrabold text-white mt-1">
                    -{formatPKRFull(refundAmount)}
                  </Text>
                  <Text className="text-xs text-white/80 mt-2">
                    {lines.filter((l) => l.qty > 0).length} items •{' '}
                    {refundMethods.find((m) => m.key === refundMethod)?.label}
                    {carpetStats.willCreatePieces > 0 &&
                      ` • ${carpetStats.willCreatePieces} cut piece${carpetStats.willCreatePieces !== 1 ? 's' : ''}`}
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
              onPress={handleSubmit}
              disabled={
                createMutation.isPending || !hasItems || carpetStats.unconfigured > 0
              }
              className="h-14 rounded-2xl items-center justify-center flex-row gap-2 active:opacity-80"
              style={{
                backgroundColor:
                  createMutation.isPending || !hasItems || carpetStats.unconfigured > 0
                    ? '#9ca3af'
                    : '#f97316',
                shadowColor: '#f97316',
                shadowOpacity: 0.4,
                shadowRadius: 12,
                elevation: 6,
              }}
            >
              {createMutation.isPending ? (
                <Text className="text-white font-extrabold text-base">Processing...</Text>
              ) : carpetStats.unconfigured > 0 ? (
                <>
                  <AlertTriangle size={20} color="#ffffff" />
                  <Text className="text-white font-extrabold text-base">
                    Configure {carpetStats.unconfigured} carpet item
                    {carpetStats.unconfigured !== 1 ? 's' : ''}
                  </Text>
                </>
              ) : (
                <>
                  <RotateCcw size={20} color="#ffffff" />
                  <Text className="text-white font-extrabold text-base">
                    Process Return {formatPKRFull(refundAmount)}
                  </Text>
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
            <Text className="text-xl font-extrabold text-neutral-900">Select Sale</Text>
            <Pressable
              onPress={() => {
                if (selectedSaleId) setSalePickerOpen(false);
                else goBack();
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
                <Text className="mt-3 text-neutral-500 font-semibold">No sales found</Text>
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

      {/* Carpet Return Options Modal */}
      {carpetDialogFor && activeCarpetLine && (
        <CarpetReturnOptionsModal
          visible={!!carpetDialogFor}
          carpetInfo={activeCarpetLine.carpetInfo || { isRollCut: false, isCutPiece: false }}
          productName={activeCarpetLine.productName}
          variantName={activeCarpetLine.variantName}
          returnedSqft={activeCarpetLine.qty}
          pricePerSqft={activeCarpetLine.price}
          initialOptions={activeCarpetLine.carpetOptions}
          onConfirm={handleCarpetConfirm}
          onClose={() => setCarpetDialogFor(null)}
        />
      )}
    </SafeAreaView>
  );
}
