import { useState } from 'react';
import {
  View, Text, ScrollView, Pressable, Modal, TextInput,
  KeyboardAvoidingView, Platform, Alert, RefreshControl,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { useLocalSearchParams, useRouter, Stack } from 'expo-router';
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import * as Haptics from 'expo-haptics';
import {
  ArrowLeft, Smartphone, User, Phone, X, CheckCircle2, XCircle,
  DollarSign, TrendingUp, Package, Sparkles, RefreshCw, AlertTriangle,
  Battery, Hash, Trash2, Award, Zap,
} from 'lucide-react-native';
import {
  usedPhonesApi, CONDITION_LABELS, CONDITION_COLORS,
  STATUS_LABELS, STATUS_COLORS,
} from '@/api/used-phones.api';
import { PTA_STATUS_LABELS, PTA_STATUS_COLORS } from '@/api/imei.api';
import { formatPKRFull } from '@/lib/format';
import { useSmartBack } from '@/hooks/useSmartBack';
import Toast from 'react-native-toast-message';

const formatDate = (v: string) =>
  new Intl.DateTimeFormat('en-PK', { dateStyle: 'medium', timeStyle: 'short' }).format(new Date(v));

export default function UsedPhoneDetailScreen() {
  const { id } = useLocalSearchParams<{ id: string }>();
  const router = useRouter();
  const goBack = useSmartBack();
  const queryClient = useQueryClient();

  const [showMarkSold, setShowMarkSold] = useState(false);
  const [finalPrice, setFinalPrice] = useState('');
  const [refreshing, setRefreshing] = useState(false);

  const { data: phone, refetch } = useQuery({
    queryKey: ['used-phone', id],
    queryFn: () => usedPhonesApi.getOne(id!),
    enabled: !!id,
  });

  const onRefresh = async () => {
    setRefreshing(true);
    await refetch();
    setRefreshing(false);
  };

  const invalidate = () => {
    queryClient.invalidateQueries({ queryKey: ['used-phone', id] });
    queryClient.invalidateQueries({ queryKey: ['used-phones'] });
    queryClient.invalidateQueries({ queryKey: ['used-phones-stats'] });
  };

  const markInStockMutation = useMutation({
    mutationFn: () => usedPhonesApi.markInStock(id!),
    onSuccess: () => {
      Haptics.notificationAsync(Haptics.NotificationFeedbackType.Success);
      Toast.show({ type: 'success', text1: 'Marked in stock' });
      invalidate();
    },
  });

  const markSoldMutation = useMutation({
    mutationFn: () => usedPhonesApi.markSold(id!, Number(finalPrice)),
    onSuccess: () => {
      Haptics.notificationAsync(Haptics.NotificationFeedbackType.Success);
      Toast.show({ type: 'success', text1: 'Marked as sold' });
      setShowMarkSold(false);
      setFinalPrice('');
      invalidate();
    },
  });

  const discardMutation = useMutation({
    mutationFn: (reason?: string) => usedPhonesApi.discard(id!, reason),
    onSuccess: () => {
      Toast.show({ type: 'success', text1: 'Phone discarded' });
      invalidate();
    },
  });

  const removeMutation = useMutation({
    mutationFn: () => usedPhonesApi.remove(id!),
    onSuccess: () => {
      Toast.show({ type: 'success', text1: 'Deleted' });
      router.replace('/industries/mobile/used-phones' as any);
    },
  });

  if (!phone) {
    return (
      <SafeAreaView className="flex-1 bg-neutral-50 items-center justify-center">
        <Stack.Screen options={{ headerShown: false }} />
        <Smartphone size={36} color="#9ca3af" />
        <Text className="mt-3 text-neutral-500">Loading...</Text>
      </SafeAreaView>
    );
  }

  const condCfg = CONDITION_COLORS[phone.condition];
  const statusCfg = STATUS_COLORS[phone.status];
  const ptaCfg = PTA_STATUS_COLORS[phone.ptaStatus];
  const profit = phone.resalePrice - phone.totalCost;

  return (
    <SafeAreaView className="flex-1 bg-neutral-50 dark:bg-neutral-950" edges={['top']}>
      <Stack.Screen options={{ headerShown: false }} />

      <View className="px-5 pt-4 pb-3 flex-row items-center gap-3">
        <Pressable
          onPress={() => router.canGoBack() ? goBack() : router.replace('/industries/mobile/used-phones' as any)}
          hitSlop={12}
          className="h-10 w-10 rounded-2xl bg-white items-center justify-center border border-neutral-200"
        >
          <ArrowLeft size={20} color="#7c3aed" />
        </Pressable>
        <View className="flex-1">
          <Text className="text-xs text-neutral-500">Used Phone</Text>
          <Text className="text-lg font-extrabold text-neutral-900 dark:text-white font-mono">
            {phone.usedPhoneCode}
          </Text>
        </View>
      </View>

      <ScrollView
        contentContainerStyle={{ paddingBottom: 120 }}
        refreshControl={<RefreshControl refreshing={refreshing} onRefresh={onRefresh} tintColor="#7c3aed" />}
        showsVerticalScrollIndicator={false}
      >
        {/* Hero */}
        <View className="mx-5 rounded-3xl p-5 mb-4" style={{ backgroundColor: '#7c3aed' }}>
          <View className="flex-row items-center gap-3">
            <View className="h-14 w-14 rounded-2xl bg-white/20 items-center justify-center">
              <Smartphone size={28} color="#ffffff" />
            </View>
            <View className="flex-1">
              <Text className="text-white text-2xl font-extrabold">
                {phone.brand} {phone.model}
              </Text>
              <View className="flex-row items-center gap-2 mt-1">
                {phone.storage && (
                  <Text className="text-white/80 text-xs font-bold">{phone.storage}</Text>
                )}
                {phone.color && (
                  <Text className="text-white/80 text-xs">• {phone.color}</Text>
                )}
              </View>
              <View className="flex-row items-center gap-1.5 mt-2 flex-wrap">
                <View className="px-2 py-0.5 rounded-md" style={{ backgroundColor: 'rgba(255,255,255,0.2)' }}>
                  <Text className="text-[10px] font-extrabold text-white">{STATUS_LABELS[phone.status]}</Text>
                </View>
                <View className="px-2 py-0.5 rounded-md" style={{ backgroundColor: 'rgba(255,255,255,0.2)' }}>
                  <Text className="text-[10px] font-extrabold text-white">{CONDITION_LABELS[phone.condition]}</Text>
                </View>
                <View className="px-2 py-0.5 rounded-md" style={{ backgroundColor: 'rgba(255,255,255,0.2)' }}>
                  <Text className="text-[10px] font-extrabold text-white">{PTA_STATUS_LABELS[phone.ptaStatus]}</Text>
                </View>
              </View>
            </View>
          </View>
        </View>

        {/* IMEIs */}
        <View className="mx-5 rounded-2xl bg-white border border-neutral-200 p-4 mb-3">
          <Text className="text-[10px] uppercase font-extrabold text-neutral-500 tracking-wider mb-2">
            Identification
          </Text>
          <View className="gap-1.5">
            <View className="flex-row justify-between">
              <Text className="text-xs text-neutral-500">IMEI 1</Text>
              <Text className="text-xs font-extrabold text-neutral-800 font-mono">{phone.imei1}</Text>
            </View>
            {phone.imei2 && (
              <View className="flex-row justify-between">
                <Text className="text-xs text-neutral-500">IMEI 2</Text>
                <Text className="text-xs font-extrabold text-neutral-800 font-mono">{phone.imei2}</Text>
              </View>
            )}
            {phone.serialNumber && (
              <View className="flex-row justify-between">
                <Text className="text-xs text-neutral-500">Serial</Text>
                <Text className="text-xs font-extrabold text-neutral-800 font-mono">{phone.serialNumber}</Text>
              </View>
            )}
            <View className="flex-row justify-between">
              <Text className="text-xs text-neutral-500">Received</Text>
              <Text className="text-xs font-extrabold text-neutral-800">{formatDate(phone.receivedAt)}</Text>
            </View>
          </View>
        </View>

        {/* Pricing */}
        <View className="mx-5 rounded-2xl bg-white border border-neutral-200 p-4 mb-3">
          <Text className="text-[10px] uppercase font-extrabold text-neutral-500 tracking-wider mb-3">
            Financials
          </Text>
          <View className="gap-2">
            <View className="rounded-xl bg-blue-50 p-3 flex-row justify-between">
              <Text className="text-sm text-blue-700 font-bold">Buyback Price</Text>
              <Text className="text-sm font-extrabold text-blue-900">{formatPKRFull(phone.buybackPrice)}</Text>
            </View>
            {phone.refurbishCost > 0 && (
              <View className="rounded-xl bg-amber-50 p-3 flex-row justify-between">
                <Text className="text-sm text-amber-700 font-bold">Refurbish Cost</Text>
                <Text className="text-sm font-extrabold text-amber-900">{formatPKRFull(phone.refurbishCost)}</Text>
              </View>
            )}
            <View className="rounded-xl bg-slate-100 p-3 flex-row justify-between">
              <Text className="text-sm text-slate-700 font-bold">Total Cost</Text>
              <Text className="text-sm font-extrabold text-slate-900">{formatPKRFull(phone.totalCost)}</Text>
            </View>
            <View className="rounded-xl bg-emerald-50 border-2 border-emerald-300 p-3 flex-row justify-between">
              <Text className="text-sm text-emerald-700 font-bold">Resale Price</Text>
              <Text className="text-lg font-extrabold text-emerald-700">{formatPKRFull(phone.resalePrice)}</Text>
            </View>
            {phone.finalSoldPrice && (
              <View className="rounded-xl bg-violet-50 border-2 border-violet-300 p-3 flex-row justify-between">
                <Text className="text-sm text-violet-700 font-bold">Final Sold Price</Text>
                <Text className="text-lg font-extrabold text-violet-700">{formatPKRFull(phone.finalSoldPrice)}</Text>
              </View>
            )}
            <View className="pt-2 mt-1 border-t-2 border-neutral-200 flex-row justify-between">
              <Text className="text-base font-extrabold text-neutral-900">Expected Profit</Text>
              <Text
                className="text-lg font-extrabold"
                style={{ color: profit >= 0 ? '#16a34a' : '#dc2626' }}
              >
                {profit >= 0 ? '+' : ''}{formatPKRFull(profit)}
              </Text>
            </View>
          </View>
        </View>

        {/* Accessories */}
        <View className="mx-5 rounded-2xl bg-white border border-neutral-200 p-4 mb-3">
          <Text className="text-[10px] uppercase font-extrabold text-neutral-500 tracking-wider mb-2">
            Accessories
          </Text>
          <View className="flex-row flex-wrap gap-2">
            {[
              { label: 'Box', has: phone.hasOriginalBox },
              { label: 'Charger', has: phone.hasOriginalCharger },
              { label: 'Cable', has: phone.hasOriginalCable },
              { label: 'Earphones', has: phone.hasOriginalEarphones },
              { label: 'Receipt', has: phone.hasOriginalReceipt },
              { label: 'Warranty', has: phone.hasWarrantyLeft },
            ].map((item) => (
              <View
                key={item.label}
                className="flex-row items-center gap-1 px-2.5 py-1.5 rounded-lg"
                style={{
                  backgroundColor: item.has ? '#dcfce7' : '#fee2e2',
                }}
              >
                {item.has ? <CheckCircle2 size={11} color="#16a34a" /> : <XCircle size={11} color="#dc2626" />}
                <Text
                  className="text-xs font-bold"
                  style={{ color: item.has ? '#15803d' : '#b91c1c' }}
                >
                  {item.label}
                </Text>
              </View>
            ))}
          </View>
        </View>

        {/* From Customer */}
        {phone.fromCustomerName && (
          <View className="mx-5 rounded-2xl bg-white border border-neutral-200 p-4 mb-3">
            <Text className="text-[10px] uppercase font-extrabold text-neutral-500 tracking-wider mb-2">
              Purchased From
            </Text>
            <View className="flex-row items-center gap-3">
              <View className="h-11 w-11 rounded-2xl bg-violet-100 items-center justify-center">
                <User size={18} color="#8b5cf6" />
              </View>
              <View className="flex-1">
                <Text className="text-sm font-extrabold text-neutral-900">{phone.fromCustomerName}</Text>
                {phone.fromCustomerPhone && (
                  <View className="flex-row items-center gap-1 mt-0.5">
                    <Phone size={10} color="#64748b" />
                    <Text className="text-xs text-neutral-500">{phone.fromCustomerPhone}</Text>
                  </View>
                )}
                {phone.fromCustomerCnic && (
                  <Text className="text-xs text-neutral-500 font-mono mt-0.5">
                    CNIC: {phone.fromCustomerCnic}
                  </Text>
                )}
              </View>
            </View>
          </View>
        )}

        {/* Condition notes */}
        {phone.conditionNotes && (
          <View className="mx-5 rounded-2xl bg-amber-50 border-2 border-amber-300 p-4 mb-3">
            <Text className="text-[10px] uppercase font-extrabold text-amber-700 mb-1">
              Condition Notes
            </Text>
            <Text className="text-sm font-bold text-amber-900 italic">{phone.conditionNotes}</Text>
          </View>
        )}

        {phone.notes && (
          <View className="mx-5 rounded-2xl bg-slate-100 border-2 border-slate-300 p-4 mb-3">
            <Text className="text-[10px] uppercase font-extrabold text-slate-700 mb-1">
              Notes
            </Text>
            <Text className="text-sm font-bold text-slate-800 italic">{phone.notes}</Text>
          </View>
        )}
      </ScrollView>

      {/* Bottom Actions */}
      <View className="absolute left-0 right-0 bottom-0 bg-white border-t border-neutral-200 px-5 py-3">
        <View className="flex-row gap-2">
          {phone.status === 'PENDING_INSPECTION' && (
            <Pressable
              onPress={() => markInStockMutation.mutate()}
              disabled={markInStockMutation.isPending}
              className="flex-1 h-12 rounded-xl flex-row items-center justify-center gap-1.5"
              style={{ backgroundColor: '#16a34a' }}
            >
              <CheckCircle2 size={16} color="#ffffff" />
              <Text className="text-white font-bold text-sm">Mark In Stock</Text>
            </Pressable>
          )}
          {phone.status === 'IN_STOCK' && (
            <Pressable
              onPress={() => {
                setFinalPrice(String(phone.resalePrice));
                setShowMarkSold(true);
              }}
              className="flex-1 h-12 rounded-xl flex-row items-center justify-center gap-1.5"
              style={{ backgroundColor: '#7c3aed' }}
            >
              <DollarSign size={16} color="#ffffff" />
              <Text className="text-white font-bold text-sm">Mark Sold</Text>
            </Pressable>
          )}
          {!['SOLD', 'DISCARDED'].includes(phone.status) && (
            <Pressable
              onPress={() => {
                Alert.prompt('Discard Phone?', 'Reason:', [
                  { text: 'Cancel', style: 'cancel' },
                  { text: 'Discard', style: 'destructive', onPress: (reason?: string) => discardMutation.mutate(reason) },
                ], 'plain-text');
              }}
              className="h-12 px-4 rounded-xl border-2 border-rose-300 flex-row items-center justify-center gap-1.5"
            >
              <XCircle size={16} color="#dc2626" />
              <Text className="text-rose-700 font-bold text-sm">Discard</Text>
            </Pressable>
          )}
          {['DISCARDED'].includes(phone.status) && (
            <Pressable
              onPress={() => {
                Alert.alert('Delete Permanently?', 'Sure?', [
                  { text: 'Cancel', style: 'cancel' },
                  { text: 'Delete', style: 'destructive', onPress: () => removeMutation.mutate() },
                ]);
              }}
              className="h-12 px-4 rounded-xl bg-rose-50 border-2 border-rose-300 items-center justify-center"
            >
              <Trash2 size={16} color="#dc2626" />
            </Pressable>
          )}
        </View>
      </View>

      {/* Mark Sold Modal */}
      <Modal visible={showMarkSold} animationType="slide" presentationStyle="formSheet" onRequestClose={() => setShowMarkSold(false)}>
        <SafeAreaView className="flex-1 bg-neutral-50">
          <KeyboardAvoidingView behavior={Platform.OS === 'ios' ? 'padding' : 'height'} className="flex-1">
            <View className="px-5 py-4 border-b border-neutral-200 flex-row items-center gap-3">
              <View className="h-11 w-11 rounded-2xl bg-violet-600 items-center justify-center">
                <DollarSign size={20} color="#ffffff" />
              </View>
              <Text className="flex-1 text-lg font-bold text-neutral-900">Mark as Sold</Text>
              <Pressable onPress={() => setShowMarkSold(false)} hitSlop={12} className="h-10 w-10 rounded-2xl bg-neutral-100 items-center justify-center">
                <X size={20} color="#6b7280" />
              </Pressable>
            </View>
            <ScrollView contentContainerStyle={{ padding: 20 }}>
              <Text className="text-xs uppercase font-extrabold text-neutral-500 mb-1.5">Final Sold Price</Text>
              <TextInput
                value={finalPrice}
                onChangeText={setFinalPrice}
                keyboardType="decimal-pad"
                autoFocus
                className="h-16 rounded-2xl border-2 border-violet-200 bg-white px-4 text-3xl font-extrabold text-neutral-900 mb-3"
              />
              <View className="rounded-xl bg-emerald-50 border border-emerald-200 p-3">
                <Text className="text-xs text-emerald-700 font-bold">Expected Profit</Text>
                <Text className="text-2xl font-extrabold text-emerald-700 mt-0.5">
                  {formatPKRFull((Number(finalPrice) || 0) - phone.totalCost)}
                </Text>
              </View>
            </ScrollView>
            <View className="px-5 py-4 border-t border-neutral-200">
              <Pressable
                onPress={() => {
                  if (!(Number(finalPrice) > 0)) {
                    Toast.show({ type: 'error', text1: 'Enter valid price' });
                    return;
                  }
                  markSoldMutation.mutate();
                }}
                disabled={markSoldMutation.isPending}
                className="h-14 rounded-2xl items-center justify-center flex-row gap-2"
                style={{ backgroundColor: markSoldMutation.isPending ? '#9ca3af' : '#7c3aed' }}
              >
                <CheckCircle2 size={20} color="#ffffff" />
                <Text className="text-white font-extrabold text-base">
                  {markSoldMutation.isPending ? 'Saving...' : 'Confirm Sold'}
                </Text>
              </Pressable>
            </View>
          </KeyboardAvoidingView>
        </SafeAreaView>
      </Modal>
    </SafeAreaView>
  );
}
