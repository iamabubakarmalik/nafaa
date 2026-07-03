import { useState, useMemo } from 'react';
import {
  View, Text, ScrollView, Pressable, TextInput, KeyboardAvoidingView,
  Platform, Alert,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { useRouter, Stack } from 'expo-router';
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import * as Haptics from 'expo-haptics';
import {
  ArrowLeft, RefreshCw, Smartphone, User, Phone, DollarSign,
  Sparkles, Check, X, ChevronDown, TrendingDown, CheckCircle2,
  AlertCircle, Battery, Package as PackageBox,
} from 'lucide-react-native';
import {
  usedPhonesApi, CONDITION_LABELS,
  type UsedPhoneCondition, type TradeInSource,
} from '@/api/used-phones.api';
import { PTA_STATUS_LABELS, type PtaStatus } from '@/api/imei.api';
import { formatPKRFull } from '@/lib/format';
import { useSmartBack } from '@/hooks/useSmartBack';
import Toast from 'react-native-toast-message';

const conditions: UsedPhoneCondition[] = ['EXCELLENT', 'VERY_GOOD', 'GOOD', 'FAIR', 'POOR'];
const ptaStatuses: PtaStatus[] = ['APPROVED', 'NON_PTA', 'PATCH', 'PENDING', 'EXEMPT'];
const sources: TradeInSource[] = ['CASH_BUYBACK', 'EXCHANGE', 'CONSIGNMENT'];

export default function NewUsedPhoneScreen() {
  const router = useRouter();
  const goBack = useSmartBack();
  const queryClient = useQueryClient();

  const [imei1, setImei1] = useState('');
  const [imei2, setImei2] = useState('');
  const [brand, setBrand] = useState('');
  const [model, setModel] = useState('');
  const [storage, setStorage] = useState('');
  const [ram, setRam] = useState('');
  const [color, setColor] = useState('');
  const [modelYear, setModelYear] = useState('');
  const [ptaStatus, setPtaStatus] = useState<PtaStatus>('APPROVED');
  const [ptaTaxPaid, setPtaTaxPaid] = useState('');
  const [condition, setCondition] = useState<UsedPhoneCondition>('GOOD');
  const [conditionNotes, setConditionNotes] = useState('');
  const [source, setSource] = useState<TradeInSource>('CASH_BUYBACK');
  const [buybackPrice, setBuybackPrice] = useState('');
  const [refurbishCost, setRefurbishCost] = useState('');
  const [resalePrice, setResalePrice] = useState('');
  const [fromCustomerName, setFromCustomerName] = useState('');
  const [fromCustomerPhone, setFromCustomerPhone] = useState('');
  const [fromCustomerCnic, setFromCustomerCnic] = useState('');
  const [notes, setNotes] = useState('');
  const [hasOriginalBox, setHasOriginalBox] = useState(false);
  const [hasOriginalCharger, setHasOriginalCharger] = useState(false);
  const [hasOriginalReceipt, setHasOriginalReceipt] = useState(false);
  const [hasWarrantyLeft, setHasWarrantyLeft] = useState(false);
  const [batteryHealth, setBatteryHealth] = useState('');

  // ─── Valuation estimator ────────────────────
  const [referencePrice, setReferencePrice] = useState('');

  const { data: estimate } = useQuery({
    queryKey: ['valuation-estimate', referencePrice, condition, modelYear, hasOriginalBox, hasOriginalCharger, hasOriginalReceipt, hasWarrantyLeft, batteryHealth],
    queryFn: () =>
      usedPhonesApi.estimate({
        referencePrice: Number(referencePrice) || 0,
        condition,
        modelYear: modelYear ? Number(modelYear) : undefined,
        hasOriginalBox,
        hasOriginalCharger,
        hasOriginalReceipt,
        hasWarrantyLeft,
        batteryHealth: batteryHealth ? Number(batteryHealth) : undefined,
      }),
    enabled: !!referencePrice && Number(referencePrice) > 0,
  });

  const createMutation = useMutation({
    mutationFn: () =>
      usedPhonesApi.create({
        imei1: imei1.trim(),
        imei2: imei2.trim() || undefined,
        brand: brand.trim(),
        model: model.trim(),
        storage: storage.trim() || undefined,
        ram: ram.trim() || undefined,
        color: color.trim() || undefined,
        modelYear: modelYear ? Number(modelYear) : undefined,
        ptaStatus,
        ptaTaxPaid: Number(ptaTaxPaid) || 0,
        condition,
        conditionNotes: conditionNotes.trim() || undefined,
        source,
        buybackPrice: Number(buybackPrice) || 0,
        refurbishCost: Number(refurbishCost) || 0,
        resalePrice: Number(resalePrice) || 0,
        fromCustomerName: fromCustomerName.trim() || undefined,
        fromCustomerPhone: fromCustomerPhone.trim() || undefined,
        fromCustomerCnic: fromCustomerCnic.trim() || undefined,
        hasOriginalBox,
        hasOriginalCharger,
        hasOriginalReceipt,
        hasWarrantyLeft,
        notes: notes.trim() || undefined,
      }),
    onSuccess: (phone) => {
      Haptics.notificationAsync(Haptics.NotificationFeedbackType.Success);
      Toast.show({ type: 'success', text1: `${phone.usedPhoneCode} added!` });
      queryClient.invalidateQueries({ queryKey: ['used-phones'] });
      queryClient.invalidateQueries({ queryKey: ['used-phones-stats'] });
      router.replace(`/industries/mobile/used-phones/${phone.id}` as any);
    },
    onError: (e: any) => {
      Toast.show({
        type: 'error',
        text1: e?.response?.data?.message?.[0] || e?.response?.data?.message || 'Failed',
      });
    },
  });

  const handleSubmit = () => {
    if (!imei1.trim() || imei1.length < 14) {
      Toast.show({ type: 'error', text1: 'Valid IMEI required (14-15 digits)' });
      return;
    }
    if (!brand.trim() || !model.trim()) {
      Toast.show({ type: 'error', text1: 'Brand & Model required' });
      return;
    }
    if (!(Number(buybackPrice) > 0)) {
      Toast.show({ type: 'error', text1: 'Buyback price required' });
      return;
    }
    createMutation.mutate();
  };

  return (
    <SafeAreaView className="flex-1 bg-neutral-50 dark:bg-neutral-950" edges={['top']}>
      <Stack.Screen options={{ headerShown: false }} />

      {/* Header */}
      <View className="px-5 pt-4 pb-3 flex-row items-center gap-3">
        <Pressable
          onPress={() => router.canGoBack() ? goBack() : router.replace('/industries/mobile/used-phones' as any)}
          hitSlop={12}
          className="h-10 w-10 rounded-2xl bg-white items-center justify-center border border-neutral-200"
        >
          <ArrowLeft size={20} color="#7c3aed" />
        </Pressable>
        <View className="flex-1">
          <Text className="text-2xl font-extrabold text-neutral-900 dark:text-white">
            Trade-In Phone
          </Text>
          <Text className="text-xs text-neutral-500 mt-0.5">
            Customer se used phone lein
          </Text>
        </View>
      </View>

      <KeyboardAvoidingView behavior={Platform.OS === 'ios' ? 'padding' : 'height'} className="flex-1">
        <ScrollView
          contentContainerStyle={{ padding: 20, paddingBottom: 120 }}
          keyboardShouldPersistTaps="handled"
          showsVerticalScrollIndicator={false}
        >
          {/* Hero */}
          <View className="rounded-3xl p-5 mb-4" style={{ backgroundColor: '#7c3aed' }}>
            <View className="flex-row items-center gap-2 mb-2">
              <RefreshCw size={14} color="rgba(255,255,255,0.8)" />
              <Text className="text-xs uppercase tracking-wider text-white/80 font-extrabold">
                Trade-In / Buyback
              </Text>
            </View>
            <Text className="text-white text-lg font-extrabold">
              Phone check karein, valuation lein, cash/exchange karein
            </Text>
          </View>

          {/* Device Info */}
          <View className="rounded-2xl bg-white border-2 border-neutral-200 p-4 mb-3 gap-3">
            <View className="flex-row items-center gap-2 mb-1">
              <Smartphone size={14} color="#2563eb" />
              <Text className="text-xs font-extrabold uppercase tracking-wider text-neutral-700">
                Device Details
              </Text>
            </View>

            <View>
              <Text className="text-[10px] font-extrabold uppercase text-neutral-500 mb-1">IMEI 1 *</Text>
              <TextInput
                value={imei1}
                onChangeText={setImei1}
                keyboardType="number-pad"
                maxLength={15}
                placeholder="15-digit IMEI"
                placeholderTextColor="#9ca3af"
                className="h-12 rounded-xl border-2 border-neutral-200 bg-white px-3 text-base font-bold text-neutral-900 font-mono"
              />
            </View>
            <View>
              <Text className="text-[10px] font-extrabold uppercase text-neutral-500 mb-1">IMEI 2 (dual sim)</Text>
              <TextInput
                value={imei2}
                onChangeText={setImei2}
                keyboardType="number-pad"
                maxLength={15}
                placeholder="Optional"
                placeholderTextColor="#9ca3af"
                className="h-12 rounded-xl border-2 border-neutral-200 bg-white px-3 text-base font-bold text-neutral-900 font-mono"
              />
            </View>

            <View className="flex-row gap-2">
              <View className="flex-1">
                <Text className="text-[10px] font-extrabold uppercase text-neutral-500 mb-1">Brand *</Text>
                <TextInput
                  value={brand}
                  onChangeText={setBrand}
                  placeholder="Samsung, Apple..."
                  placeholderTextColor="#9ca3af"
                  className="h-12 rounded-xl border-2 border-neutral-200 bg-white px-3 text-sm font-bold text-neutral-900"
                />
              </View>
              <View className="flex-1">
                <Text className="text-[10px] font-extrabold uppercase text-neutral-500 mb-1">Model *</Text>
                <TextInput
                  value={model}
                  onChangeText={setModel}
                  placeholder="Galaxy S22, iPhone 13..."
                  placeholderTextColor="#9ca3af"
                  className="h-12 rounded-xl border-2 border-neutral-200 bg-white px-3 text-sm font-bold text-neutral-900"
                />
              </View>
            </View>

            <View className="flex-row gap-2">
              <View className="flex-1">
                <Text className="text-[10px] font-extrabold uppercase text-neutral-500 mb-1">Storage</Text>
                <TextInput
                  value={storage}
                  onChangeText={setStorage}
                  placeholder="128GB"
                  placeholderTextColor="#9ca3af"
                  className="h-11 rounded-xl border-2 border-neutral-200 bg-white px-3 text-sm font-bold text-neutral-900"
                />
              </View>
              <View className="flex-1">
                <Text className="text-[10px] font-extrabold uppercase text-neutral-500 mb-1">RAM</Text>
                <TextInput
                  value={ram}
                  onChangeText={setRam}
                  placeholder="8GB"
                  placeholderTextColor="#9ca3af"
                  className="h-11 rounded-xl border-2 border-neutral-200 bg-white px-3 text-sm font-bold text-neutral-900"
                />
              </View>
              <View className="flex-1">
                <Text className="text-[10px] font-extrabold uppercase text-neutral-500 mb-1">Year</Text>
                <TextInput
                  value={modelYear}
                  onChangeText={setModelYear}
                  keyboardType="number-pad"
                  maxLength={4}
                  placeholder="2023"
                  placeholderTextColor="#9ca3af"
                  className="h-11 rounded-xl border-2 border-neutral-200 bg-white px-3 text-sm font-bold text-neutral-900"
                />
              </View>
            </View>
            <View>
              <Text className="text-[10px] font-extrabold uppercase text-neutral-500 mb-1">Color</Text>
              <TextInput
                value={color}
                onChangeText={setColor}
                placeholder="Phantom Black"
                placeholderTextColor="#9ca3af"
                className="h-11 rounded-xl border-2 border-neutral-200 bg-white px-3 text-sm font-bold text-neutral-900"
              />
            </View>
          </View>

          {/* PTA */}
          <View className="rounded-2xl bg-white border-2 border-neutral-200 p-4 mb-3">
            <Text className="text-xs font-extrabold uppercase tracking-wider text-neutral-700 mb-2">
              PTA Status
            </Text>
            <View className="flex-row flex-wrap gap-1.5 mb-2">
              {ptaStatuses.map((s) => {
                const active = ptaStatus === s;
                return (
                  <Pressable
                    key={s}
                    onPress={() => {
                      Haptics.selectionAsync();
                      setPtaStatus(s);
                    }}
                    className="px-3 h-9 rounded-xl border-2 items-center justify-center"
                    style={{
                      backgroundColor: active ? '#7c3aed' : '#ffffff',
                      borderColor: active ? '#7c3aed' : '#e5e7eb',
                    }}
                  >
                    <Text
                      className="text-xs font-bold"
                      style={{ color: active ? '#ffffff' : '#374151' }}
                    >
                      {PTA_STATUS_LABELS[s]}
                    </Text>
                  </Pressable>
                );
              })}
            </View>
            {(ptaStatus === 'APPROVED' || ptaStatus === 'PATCH') && (
              <View>
                <Text className="text-[10px] font-extrabold uppercase text-neutral-500 mb-1">
                  PTA Tax Paid (PKR)
                </Text>
                <TextInput
                  value={ptaTaxPaid}
                  onChangeText={setPtaTaxPaid}
                  keyboardType="decimal-pad"
                  placeholder="0"
                  placeholderTextColor="#9ca3af"
                  className="h-11 rounded-xl border-2 border-neutral-200 bg-white px-3 text-sm font-bold text-neutral-900"
                />
              </View>
            )}
          </View>

          {/* Condition */}
          <View className="rounded-2xl bg-white border-2 border-neutral-200 p-4 mb-3 gap-3">
            <Text className="text-xs font-extrabold uppercase tracking-wider text-neutral-700">
              Condition
            </Text>
            <View className="gap-1.5">
              {conditions.map((c) => {
                const active = condition === c;
                return (
                  <Pressable
                    key={c}
                    onPress={() => {
                      Haptics.selectionAsync();
                      setCondition(c);
                    }}
                    className="rounded-xl border-2 p-3 flex-row items-center gap-2"
                    style={{
                      backgroundColor: active ? '#dcfce7' : '#ffffff',
                      borderColor: active ? '#16a34a' : '#e5e7eb',
                    }}
                  >
                    <View
                      style={{
                        height: 20, width: 20, borderRadius: 10, borderWidth: 2,
                        borderColor: active ? '#16a34a' : '#cbd5e1',
                        backgroundColor: active ? '#16a34a' : '#ffffff',
                        alignItems: 'center', justifyContent: 'center',
                      }}
                    >
                      {active && <Check size={12} color="#ffffff" />}
                    </View>
                    <Text className="flex-1 text-sm font-extrabold" style={{ color: active ? '#15803d' : '#374151' }}>
                      {CONDITION_LABELS[c]}
                    </Text>
                  </Pressable>
                );
              })}
            </View>

            <TextInput
              value={conditionNotes}
              onChangeText={setConditionNotes}
              multiline
              numberOfLines={2}
              placeholder="Condition notes (scratches, dents, etc.)"
              placeholderTextColor="#9ca3af"
              className="min-h-[60px] rounded-xl border-2 border-neutral-200 bg-white p-3 text-sm font-bold text-neutral-900"
              textAlignVertical="top"
            />

            <View>
              <Text className="text-[10px] font-extrabold uppercase text-neutral-500 mb-1">
                Battery Health (%)
              </Text>
              <View className="flex-row items-center rounded-xl border-2 border-neutral-200 bg-white px-3 h-11">
                <Battery size={14} color="#64748b" />
                <TextInput
                  value={batteryHealth}
                  onChangeText={setBatteryHealth}
                  keyboardType="number-pad"
                  maxLength={3}
                  placeholder="e.g. 85"
                  placeholderTextColor="#9ca3af"
                  className="flex-1 ml-2 text-sm font-bold text-neutral-900"
                />
                <Text className="text-xs font-bold text-neutral-500">%</Text>
              </View>
            </View>
          </View>

          {/* Accessories */}
          <View className="rounded-2xl bg-white border-2 border-neutral-200 p-4 mb-3">
            <Text className="text-xs font-extrabold uppercase tracking-wider text-neutral-700 mb-2">
              Accessories & Extras
            </Text>
            <View className="gap-1.5">
              {[
                { key: 'box', label: 'Original Box', value: hasOriginalBox, setter: setHasOriginalBox },
                { key: 'charger', label: 'Original Charger', value: hasOriginalCharger, setter: setHasOriginalCharger },
                { key: 'receipt', label: 'Original Receipt', value: hasOriginalReceipt, setter: setHasOriginalReceipt },
                { key: 'warranty', label: 'Warranty Remaining', value: hasWarrantyLeft, setter: setHasWarrantyLeft },
              ].map((item) => (
                <Pressable
                  key={item.key}
                  onPress={() => {
                    Haptics.selectionAsync();
                    item.setter(!item.value);
                  }}
                  className="flex-row items-center gap-2 p-2.5 rounded-xl border-2"
                  style={{
                    backgroundColor: item.value ? '#dcfce7' : '#ffffff',
                    borderColor: item.value ? '#16a34a' : '#e5e7eb',
                  }}
                >
                  <View
                    style={{
                      height: 20, width: 20, borderRadius: 6, borderWidth: 2,
                      borderColor: item.value ? '#16a34a' : '#cbd5e1',
                      backgroundColor: item.value ? '#16a34a' : '#ffffff',
                      alignItems: 'center', justifyContent: 'center',
                    }}
                  >
                    {item.value && <Check size={12} color="#ffffff" />}
                  </View>
                  <Text className="flex-1 text-sm font-bold" style={{ color: item.value ? '#15803d' : '#374151' }}>
                    {item.label}
                  </Text>
                </Pressable>
              ))}
            </View>
          </View>

          {/* Valuation Helper */}
          <View className="rounded-2xl bg-amber-50 border-2 border-amber-300 p-4 mb-3 gap-3">
            <View className="flex-row items-center gap-2">
              <Sparkles size={14} color="#d97706" />
              <Text className="text-xs font-extrabold uppercase tracking-wider text-amber-800">
                Valuation Helper
              </Text>
            </View>
            <View>
              <Text className="text-[10px] font-extrabold uppercase text-amber-700 mb-1">
                Current New Price (for reference)
              </Text>
              <TextInput
                value={referencePrice}
                onChangeText={setReferencePrice}
                keyboardType="decimal-pad"
                placeholder="e.g. 150000"
                placeholderTextColor="#fcd34d"
                className="h-12 rounded-xl border-2 border-amber-200 bg-white px-3 text-lg font-extrabold text-amber-900"
              />
            </View>
            {estimate && (
              <View className="rounded-xl bg-white p-3">
                <Text className="text-[10px] uppercase font-extrabold text-amber-700 mb-1">
                  Suggested Buyback
                </Text>
                <Text className="text-2xl font-extrabold text-amber-900">
                  {formatPKRFull(estimate.suggestedBuyback)}
                </Text>
                <Text className="text-[10px] text-amber-600 font-bold mt-0.5">
                  {(estimate.multiplier * 100).toFixed(0)}% of reference
                </Text>
                {estimate.reasoning.length > 0 && (
                  <View className="mt-2 pt-2 border-t border-amber-100">
                    {estimate.reasoning.map((r, i) => (
                      <Text key={i} className="text-[10px] text-amber-800 mb-0.5">
                        • {r}
                      </Text>
                    ))}
                  </View>
                )}
                <Pressable
                  onPress={() => setBuybackPrice(String(Math.floor(estimate.suggestedBuyback)))}
                  className="mt-2 h-9 rounded-lg items-center justify-center"
                  style={{ backgroundColor: '#d97706' }}
                >
                  <Text className="text-white font-bold text-xs">Apply Suggested Price</Text>
                </Pressable>
              </View>
            )}
          </View>

          {/* Pricing */}
          <View className="rounded-2xl bg-white border-2 border-neutral-200 p-4 mb-3 gap-3">
            <View className="flex-row items-center gap-2 mb-1">
              <DollarSign size={14} color="#16a34a" />
              <Text className="text-xs font-extrabold uppercase tracking-wider text-neutral-700">
                Pricing
              </Text>
            </View>
            <View>
              <Text className="text-[10px] font-extrabold uppercase text-neutral-500 mb-1">
                Buyback Price * (kitne mein le rahe hain)
              </Text>
              <TextInput
                value={buybackPrice}
                onChangeText={setBuybackPrice}
                keyboardType="decimal-pad"
                placeholder="0"
                placeholderTextColor="#9ca3af"
                className="h-14 rounded-xl border-2 border-emerald-200 bg-emerald-50/40 px-3 text-xl font-extrabold text-emerald-900"
              />
            </View>
            <View>
              <Text className="text-[10px] font-extrabold uppercase text-neutral-500 mb-1">
                Refurbish Cost (repair/cleaning)
              </Text>
              <TextInput
                value={refurbishCost}
                onChangeText={setRefurbishCost}
                keyboardType="decimal-pad"
                placeholder="0"
                placeholderTextColor="#9ca3af"
                className="h-12 rounded-xl border-2 border-neutral-200 bg-white px-3 text-base font-bold text-neutral-900"
              />
            </View>
            <View>
              <Text className="text-[10px] font-extrabold uppercase text-neutral-500 mb-1">
                Resale Price (kitne mein bechenge)
              </Text>
              <TextInput
                value={resalePrice}
                onChangeText={setResalePrice}
                keyboardType="decimal-pad"
                placeholder="0"
                placeholderTextColor="#9ca3af"
                className="h-14 rounded-xl border-2 border-blue-200 bg-blue-50/40 px-3 text-xl font-extrabold text-blue-900"
              />
            </View>
            {Number(buybackPrice) > 0 && Number(resalePrice) > 0 && (
              <View className="rounded-xl bg-emerald-50 border border-emerald-200 p-3">
                <Text className="text-[10px] font-extrabold uppercase text-emerald-700 mb-1">
                  Expected Profit
                </Text>
                <Text className="text-2xl font-extrabold text-emerald-700">
                  {formatPKRFull(Number(resalePrice) - Number(buybackPrice) - Number(refurbishCost || 0))}
                </Text>
              </View>
            )}
          </View>

          {/* From Customer */}
          <View className="rounded-2xl bg-white border-2 border-neutral-200 p-4 mb-3 gap-3">
            <View className="flex-row items-center gap-2 mb-1">
              <User size={14} color="#8b5cf6" />
              <Text className="text-xs font-extrabold uppercase tracking-wider text-neutral-700">
                Customer (jis se lia)
              </Text>
            </View>
            <View>
              <Text className="text-[10px] font-extrabold uppercase text-neutral-500 mb-1">Name</Text>
              <TextInput
                value={fromCustomerName}
                onChangeText={setFromCustomerName}
                placeholder="Customer name"
                placeholderTextColor="#9ca3af"
                className="h-11 rounded-xl border-2 border-neutral-200 bg-white px-3 text-sm font-bold text-neutral-900"
              />
            </View>
            <View>
              <Text className="text-[10px] font-extrabold uppercase text-neutral-500 mb-1">Phone</Text>
              <TextInput
                value={fromCustomerPhone}
                onChangeText={setFromCustomerPhone}
                keyboardType="phone-pad"
                placeholder="03XXXXXXXXX"
                placeholderTextColor="#9ca3af"
                className="h-11 rounded-xl border-2 border-neutral-200 bg-white px-3 text-sm font-bold text-neutral-900"
              />
            </View>
            <View>
              <Text className="text-[10px] font-extrabold uppercase text-neutral-500 mb-1">CNIC</Text>
              <TextInput
                value={fromCustomerCnic}
                onChangeText={setFromCustomerCnic}
                keyboardType="number-pad"
                maxLength={13}
                placeholder="XXXXX-XXXXXXX-X"
                placeholderTextColor="#9ca3af"
                className="h-11 rounded-xl border-2 border-neutral-200 bg-white px-3 text-sm font-bold text-neutral-900 font-mono"
              />
            </View>
          </View>

          {/* Notes */}
          <View className="rounded-2xl bg-white border-2 border-neutral-200 p-4 mb-3">
            <Text className="text-xs font-extrabold uppercase tracking-wider text-neutral-700 mb-2">
              Notes (optional)
            </Text>
            <TextInput
              value={notes}
              onChangeText={setNotes}
              multiline
              numberOfLines={3}
              placeholder="Additional details..."
              placeholderTextColor="#9ca3af"
              className="min-h-[80px] rounded-xl border-2 border-neutral-200 bg-white p-3 text-sm font-bold text-neutral-900"
              textAlignVertical="top"
            />
          </View>
        </ScrollView>

        <View className="px-5 py-4 border-t border-neutral-200 bg-white">
          <Pressable
            onPress={handleSubmit}
            disabled={createMutation.isPending}
            className="h-14 rounded-2xl items-center justify-center flex-row gap-2 active:opacity-80"
            style={{ backgroundColor: createMutation.isPending ? '#9ca3af' : '#7c3aed' }}
          >
            {createMutation.isPending ? (
              <Text className="text-white font-extrabold text-base">Adding...</Text>
            ) : (
              <>
                <CheckCircle2 size={20} color="#ffffff" />
                <Text className="text-white font-extrabold text-base">Add Trade-In Phone</Text>
              </>
            )}
          </Pressable>
        </View>
      </KeyboardAvoidingView>
    </SafeAreaView>
  );
}
