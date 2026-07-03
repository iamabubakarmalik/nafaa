import { useState, useMemo, useEffect } from 'react';
import {
  Modal, View, Text, TextInput, Pressable, ScrollView,
  KeyboardAvoidingView, Platform, ActivityIndicator,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { useQuery } from '@tanstack/react-query';
import * as Haptics from 'expo-haptics';
import {
  X, Search, Layers, Ruler, Scissors, CheckCircle2, AlertCircle, Sparkles,
} from 'lucide-react-native';
import { carpetRollsApi, type CarpetRoll } from '@/api/carpet-rolls.api';
import { formatPKRFull } from '@/lib/format';
import Toast from 'react-native-toast-message';

interface Props {
  visible: boolean;
  productId: string;
  productName: string;
  variantId?: string;
  variantName?: string;
  onConfirm: (data: {
    roll: CarpetRoll;
    customerWidthFt: number;
    lengthFt: number;
    lengthInch?: number;
    cutSqft: number;
    pricePerSqft: number;
    totalPrice: number;
    createLeftover: boolean;
    isCustomRate?: boolean;
    originalRate?: number;
  }) => void;
  onClose: () => void;
}

export function CarpetRollPicker({
  visible, productId, productName, variantId, variantName, onConfirm, onClose,
}: Props) {
  const [selectedRoll, setSelectedRoll] = useState<CarpetRoll | null>(null);
  const [customerWidthFt, setCustomerWidthFt] = useState('');
  const [lengthFt, setLengthFt] = useState('');
  const [lengthInch, setLengthInch] = useState('');
  const [customRate, setCustomRate] = useState('');
  const [createLeftover, setCreateLeftover] = useState(false);

  const { data: rollsData, isLoading } = useQuery({
    queryKey: ['pos-carpet-rolls', productId, variantId],
    queryFn: () => carpetRollsApi.list({
      productId,
      variantId,
      status: 'ACTIVE',
      inStockOnly: true,
      limit: 100,
    }),
    enabled: visible && !!productId,
  });

  useEffect(() => {
    if (visible) {
      setSelectedRoll(null);
      setCustomerWidthFt('');
      setLengthFt('');
      setLengthInch('');
      setCustomRate('');
      setCreateLeftover(false);
    }
  }, [visible]);

  const rolls = rollsData?.items ?? [];

  useEffect(() => {
    if (selectedRoll && !customerWidthFt) {
      setCustomerWidthFt(String(selectedRoll.widthFt));
    }
  }, [selectedRoll]);

  const calculations = useMemo(() => {
    if (!selectedRoll) return null;
    const w = Number(customerWidthFt) || 0;
    const lFt = Number(lengthFt) || 0;
    const lIn = Number(lengthInch) || 0;
    const realLength = lFt + lIn / 12;
    const cutSqft = w * realLength;
    const rate = customRate ? Number(customRate) : selectedRoll.salePricePerSqft;
    const totalPrice = cutSqft * rate;
    const isCustomRate = !!customRate && Number(customRate) !== selectedRoll.salePricePerSqft;
    const remainingLength =
      selectedRoll.remainingLengthFt + selectedRoll.remainingLengthInch / 12;
    const canCut = realLength > 0 && realLength <= remainingLength && w > 0 && w <= selectedRoll.widthFt;
    return { cutSqft, rate, totalPrice, isCustomRate, canCut, remainingLength, realLength };
  }, [selectedRoll, customerWidthFt, lengthFt, lengthInch, customRate]);

  const handleConfirm = () => {
    if (!selectedRoll || !calculations || !calculations.canCut) {
      Toast.show({ type: 'error', text1: 'Valid dimensions dalain' });
      return;
    }
    Haptics.notificationAsync(Haptics.NotificationFeedbackType.Success);
    onConfirm({
      roll: selectedRoll,
      customerWidthFt: Number(customerWidthFt),
      lengthFt: Number(lengthFt),
      lengthInch: Number(lengthInch) || 0,
      cutSqft: calculations.cutSqft,
      pricePerSqft: calculations.rate,
      totalPrice: calculations.totalPrice,
      createLeftover,
      isCustomRate: calculations.isCustomRate,
      originalRate: selectedRoll.salePricePerSqft,
    });
  };

  return (
    <Modal visible={visible} animationType="slide" presentationStyle="pageSheet" onRequestClose={onClose}>
      <SafeAreaView className="flex-1 bg-neutral-50 dark:bg-neutral-950">
        <KeyboardAvoidingView behavior={Platform.OS === 'ios' ? 'padding' : 'height'} className="flex-1">
          {/* Header */}
          <View className="px-5 py-4 border-b border-neutral-200 dark:border-neutral-800 flex-row items-center gap-3">
            <View className="h-11 w-11 rounded-2xl items-center justify-center" style={{ backgroundColor: '#16a34a' }}>
              <Layers size={20} color="#ffffff" />
            </View>
            <View className="flex-1 min-w-0">
              <Text className="text-xs uppercase tracking-wider text-emerald-700 font-extrabold">
                Select Carpet Roll
              </Text>
              <Text className="text-base font-bold text-neutral-900 dark:text-white" numberOfLines={1}>
                {productName}
              </Text>
              {variantName && (
                <Text className="text-[11px] font-bold text-violet-700">{variantName}</Text>
              )}
            </View>
            <Pressable
              onPress={onClose}
              hitSlop={12}
              className="h-10 w-10 rounded-2xl bg-neutral-100 dark:bg-neutral-800 items-center justify-center"
            >
              <X size={20} color="#6b7280" />
            </Pressable>
          </View>

          <ScrollView contentContainerStyle={{ padding: 20, paddingBottom: 40 }} keyboardShouldPersistTaps="handled">
            {/* Rolls list */}
            <Text className="text-xs uppercase tracking-wider font-extrabold text-neutral-500 mb-2">
              Available Rolls ({rolls.length})
            </Text>

            {isLoading ? (
              <View className="py-8 items-center">
                <ActivityIndicator color="#16a34a" />
              </View>
            ) : rolls.length === 0 ? (
              <View className="rounded-2xl border-2 border-dashed border-neutral-200 dark:border-neutral-800 p-6 items-center">
                <AlertCircle size={28} color="#9ca3af" />
                <Text className="mt-2 text-sm font-bold text-neutral-500">No active rolls</Text>
                <Text className="text-xs text-neutral-400 mt-1">Add roll from Carpet Rolls page</Text>
              </View>
            ) : (
              <View className="gap-2">
                {rolls.map((roll) => {
                  const active = selectedRoll?.id === roll.id;
                  return (
                    <Pressable
                      key={roll.id}
                      onPress={() => {
                        Haptics.selectionAsync();
                        setSelectedRoll(roll);
                      }}
                      className="rounded-2xl border-2 p-3 active:opacity-80"
                      style={{
                        borderColor: active ? '#16a34a' : '#e5e7eb',
                        backgroundColor: active ? '#dcfce7' : '#ffffff',
                      }}
                    >
                      <View className="flex-row items-center gap-3">
                        <View
                          className="h-11 w-11 rounded-2xl items-center justify-center"
                          style={{ backgroundColor: active ? '#16a34a' : '#f0fdf4' }}
                        >
                          <Layers size={20} color={active ? '#ffffff' : '#16a34a'} />
                        </View>
                        <View className="flex-1 min-w-0">
                          <View className="flex-row items-center gap-2">
                            <Text className="font-extrabold text-sm text-neutral-900 dark:text-white font-mono">
                              {roll.rollNumber}
                            </Text>
                            {roll.designCode && (
                              <View className="px-1.5 py-0.5 rounded bg-slate-100 dark:bg-slate-800">
                                <Text className="text-[9px] font-extrabold text-slate-700 dark:text-slate-300">
                                  {roll.designCode}
                                </Text>
                              </View>
                            )}
                          </View>
                          <Text className="text-xs text-neutral-500 mt-0.5">
                            Width: <Text className="font-bold">{roll.widthFt}ft</Text> • Remaining:{' '}
                            <Text className="font-bold text-emerald-700">{roll.remainingLengthFt.toFixed(1)}ft</Text>{' '}
                            ({roll.remainingSqft.toFixed(0)} sqft)
                          </Text>
                          <Text className="text-[10px] font-bold text-emerald-700 mt-0.5">
                            Rate: {formatPKRFull(roll.salePricePerSqft)}/sqft
                          </Text>
                        </View>
                        {active && <CheckCircle2 size={22} color="#16a34a" />}
                      </View>
                    </Pressable>
                  );
                })}
              </View>
            )}

            {/* Cut controls */}
            {selectedRoll && (
              <View className="mt-4 rounded-3xl bg-white dark:bg-neutral-900 border-2 border-emerald-200 dark:border-emerald-900/50 p-4 gap-3">
                <View className="flex-row items-center gap-2">
                  <Scissors size={16} color="#16a34a" />
                  <Text className="font-extrabold text-emerald-900 dark:text-emerald-100">Cut Details</Text>
                </View>

                <View className="flex-row gap-2">
                  <View className="flex-1">
                    <Text className="text-[10px] uppercase font-extrabold text-slate-500 mb-1">Width (ft)</Text>
                    <TextInput
                      value={customerWidthFt}
                      onChangeText={setCustomerWidthFt}
                      keyboardType="decimal-pad"
                      placeholder={String(selectedRoll.widthFt)}
                      placeholderTextColor="#9ca3af"
                      className="h-12 rounded-xl border-2 border-slate-200 bg-white px-3 text-base font-bold text-neutral-900"
                    />
                  </View>
                  <View className="flex-1">
                    <Text className="text-[10px] uppercase font-extrabold text-slate-500 mb-1">Length (ft)</Text>
                    <TextInput
                      value={lengthFt}
                      onChangeText={setLengthFt}
                      keyboardType="decimal-pad"
                      placeholder="0"
                      placeholderTextColor="#9ca3af"
                      className="h-12 rounded-xl border-2 border-slate-200 bg-white px-3 text-base font-bold text-neutral-900"
                    />
                  </View>
                  <View className="flex-1">
                    <Text className="text-[10px] uppercase font-extrabold text-slate-500 mb-1">Inch</Text>
                    <TextInput
                      value={lengthInch}
                      onChangeText={setLengthInch}
                      keyboardType="decimal-pad"
                      placeholder="0"
                      placeholderTextColor="#9ca3af"
                      className="h-12 rounded-xl border-2 border-slate-200 bg-white px-3 text-base font-bold text-neutral-900"
                    />
                  </View>
                </View>

                <View>
                  <Text className="text-[10px] uppercase font-extrabold text-slate-500 mb-1">
                    Rate / sqft (default: {formatPKRFull(selectedRoll.salePricePerSqft)})
                  </Text>
                  <TextInput
                    value={customRate}
                    onChangeText={setCustomRate}
                    keyboardType="decimal-pad"
                    placeholder={String(selectedRoll.salePricePerSqft)}
                    placeholderTextColor="#9ca3af"
                    className="h-12 rounded-xl border-2 border-blue-200 bg-blue-50/40 px-3 text-base font-bold text-neutral-900"
                  />
                </View>

                <Pressable
                  onPress={() => setCreateLeftover((v) => !v)}
                  className="flex-row items-center gap-2 p-3 rounded-xl border-2"
                  style={{
                    borderColor: createLeftover ? '#8b5cf6' : '#e5e7eb',
                    backgroundColor: createLeftover ? '#ede9fe' : '#ffffff',
                  }}
                >
                  <View
                    style={{
                      height: 22, width: 22, borderRadius: 6,
                      borderWidth: 2, borderColor: createLeftover ? '#8b5cf6' : '#cbd5e1',
                      backgroundColor: createLeftover ? '#8b5cf6' : '#ffffff',
                      alignItems: 'center', justifyContent: 'center',
                    }}
                  >
                    {createLeftover && <CheckCircle2 size={14} color="#ffffff" />}
                  </View>
                  <Text className="flex-1 text-xs font-bold text-slate-800">
                    Create cut piece from leftover
                  </Text>
                </Pressable>

                {calculations && calculations.cutSqft > 0 && (
                  <View
                    className="rounded-2xl p-4"
                    style={{
                      backgroundColor: calculations.canCut ? '#16a34a' : '#dc2626',
                    }}
                  >
                    <View className="flex-row items-center gap-2 mb-2">
                      <Sparkles size={14} color="#ffffff" />
                      <Text className="text-white font-extrabold text-xs uppercase tracking-wider">
                        {calculations.canCut ? 'Summary' : 'Invalid'}
                      </Text>
                    </View>
                    {calculations.canCut ? (
                      <>
                        <Text className="text-white text-2xl font-extrabold">
                          {calculations.cutSqft.toFixed(2)} sqft
                        </Text>
                        <View className="mt-2 pt-2 border-t border-white/20 flex-row justify-between">
                          <Text className="text-white/80 text-xs">Rate:</Text>
                          <Text className="text-white font-bold text-xs">
                            {formatPKRFull(calculations.rate)}/sqft
                            {calculations.isCustomRate && <Text className="text-yellow-200"> (custom)</Text>}
                          </Text>
                        </View>
                        <View className="flex-row justify-between mt-1">
                          <Text className="text-white/80 text-xs">Total:</Text>
                          <Text className="text-white text-lg font-extrabold">
                            {formatPKRFull(calculations.totalPrice)}
                          </Text>
                        </View>
                      </>
                    ) : (
                      <Text className="text-white text-sm font-bold">
                        Cut length {calculations.realLength.toFixed(2)}ft cannot exceed remaining{' '}
                        {calculations.remainingLength.toFixed(2)}ft
                      </Text>
                    )}
                  </View>
                )}
              </View>
            )}
          </ScrollView>

          {/* Footer */}
          <View className="px-5 py-4 border-t border-neutral-200 dark:border-neutral-800 bg-white dark:bg-neutral-900">
            <Pressable
              onPress={handleConfirm}
              disabled={!selectedRoll || !calculations?.canCut}
              className="h-14 rounded-2xl items-center justify-center flex-row gap-2 active:opacity-80"
              style={{
                backgroundColor: selectedRoll && calculations?.canCut ? '#16a34a' : '#9ca3af',
              }}
            >
              <Scissors size={20} color="#ffffff" />
              <Text className="text-white font-extrabold text-base">
                {selectedRoll && calculations?.canCut
                  ? `Add ${calculations.cutSqft.toFixed(2)} sqft`
                  : 'Select roll & dimensions'}
              </Text>
            </Pressable>
          </View>
        </KeyboardAvoidingView>
      </SafeAreaView>
    </Modal>
  );
}
