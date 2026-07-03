import { useState } from 'react';
import {
  View, Text, ScrollView, Pressable, Modal, TextInput, Alert,
  KeyboardAvoidingView, Platform, RefreshControl,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { useLocalSearchParams, useRouter, Stack } from 'expo-router';
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import * as Haptics from 'expo-haptics';
import {
  ArrowLeft, Layers, Ruler, Scissors, AlertTriangle, CheckCircle2,
  XCircle, TrendingUp, DollarSign, Package, Calendar, X, Edit3,
  Sparkles, Activity, Trash2, RefreshCw,
} from 'lucide-react-native';
import { carpetRollsApi } from '@/api/carpet-rolls.api';
import { formatPKRFull } from '@/lib/format';
import { useSmartBack } from '@/hooks/useSmartBack';
import Toast from 'react-native-toast-message';

const formatDate = (v: string) =>
  new Intl.DateTimeFormat('en-PK', { dateStyle: 'medium', timeStyle: 'short' }).format(new Date(v));

const statusConfig: Record<string, { label: string; color: string; bg: string }> = {
  ACTIVE:      { label: 'Active',      color: '#16a34a', bg: '#dcfce7' },
  FINISHED:    { label: 'Finished',    color: '#64748b', bg: '#f1f5f9' },
  DAMAGED:     { label: 'Damaged',     color: '#dc2626', bg: '#fee2e2' },
  RESERVED:    { label: 'Reserved',    color: '#f59e0b', bg: '#fef3c7' },
  TRANSFERRED: { label: 'Transferred', color: '#8b5cf6', bg: '#ede9fe' },
};

export default function CarpetRollDetailScreen() {
  const { id } = useLocalSearchParams<{ id: string }>();
  const router = useRouter();
  const goBack = useSmartBack();
  const queryClient = useQueryClient();

  const [showAdjust, setShowAdjust] = useState(false);
  const [adjustDelta, setAdjustDelta] = useState('');
  const [adjustReason, setAdjustReason] = useState('');
  const [adjustNote, setAdjustNote] = useState('');

  const [refreshing, setRefreshing] = useState(false);

  const { data: roll, refetch } = useQuery({
    queryKey: ['carpet-roll', id],
    queryFn: () => carpetRollsApi.getOne(id!),
    enabled: !!id,
  });

  const onRefresh = async () => {
    setRefreshing(true);
    await refetch();
    setRefreshing(false);
  };

  const invalidate = () => {
    queryClient.invalidateQueries({ queryKey: ['carpet-roll', id] });
    queryClient.invalidateQueries({ queryKey: ['carpet-rolls'] });
    queryClient.invalidateQueries({ queryKey: ['carpet-overview'] });
  };

  const adjustMutation = useMutation({
    mutationFn: (payload: any) => carpetRollsApi.adjust(id!, payload),
    onSuccess: () => {
      Haptics.notificationAsync(Haptics.NotificationFeedbackType.Success);
      Toast.show({ type: 'success', text1: 'Roll adjusted' });
      setShowAdjust(false);
      setAdjustDelta('');
      setAdjustReason('');
      setAdjustNote('');
      invalidate();
    },
    onError: (e: any) =>
      Toast.show({ type: 'error', text1: e?.response?.data?.message || 'Failed' }),
  });

  const damageMutation = useMutation({
    mutationFn: (reason?: string) => carpetRollsApi.markDamaged(id!, reason),
    onSuccess: () => {
      Toast.show({ type: 'success', text1: 'Marked as damaged' });
      invalidate();
    },
  });

  const finishMutation = useMutation({
    mutationFn: () => carpetRollsApi.markFinished(id!),
    onSuccess: () => {
      Toast.show({ type: 'success', text1: 'Marked as finished' });
      invalidate();
    },
  });

  const removeMutation = useMutation({
    mutationFn: () => carpetRollsApi.remove(id!),
    onSuccess: () => {
      Toast.show({ type: 'success', text1: 'Roll deleted' });
      router.replace('/industries/carpet/rolls');
    },
    onError: (e: any) =>
      Toast.show({ type: 'error', text1: e?.response?.data?.message || 'Failed' }),
  });

  if (!roll) {
    return (
      <SafeAreaView className="flex-1 bg-neutral-50 items-center justify-center">
        <Stack.Screen options={{ headerShown: false }} />
        <Layers size={36} color="#9ca3af" />
        <Text className="mt-3 text-neutral-500">Loading roll...</Text>
      </SafeAreaView>
    );
  }

  const cfg = statusConfig[roll.status] || statusConfig.ACTIVE;
  const usagePercent = roll.originalSqft > 0
    ? ((roll.originalSqft - roll.remainingSqft) / roll.originalSqft) * 100
    : 0;

  return (
    <SafeAreaView className="flex-1 bg-neutral-50 dark:bg-neutral-950" edges={['top']}>
      <Stack.Screen options={{ headerShown: false }} />

      {/* Header */}
      <View className="px-5 pt-4 pb-3 flex-row items-center gap-3">
        <Pressable
          onPress={() => router.canGoBack() ? goBack() : router.replace('/industries/carpet/rolls' as any)}
          hitSlop={12}
          className="h-10 w-10 rounded-2xl bg-white items-center justify-center border border-neutral-200"
        >
          <ArrowLeft size={20} color="#16a34a" />
        </Pressable>
        <View className="flex-1">
          <Text className="text-xs text-neutral-500">Carpet Roll</Text>
          <Text className="text-lg font-extrabold text-neutral-900 dark:text-white font-mono">
            {roll.rollNumber}
          </Text>
        </View>
      </View>

      <ScrollView
        contentContainerStyle={{ paddingBottom: 120 }}
        refreshControl={
          <RefreshControl refreshing={refreshing} onRefresh={onRefresh} tintColor="#16a34a" />
        }
        showsVerticalScrollIndicator={false}
      >
        {/* Hero */}
        <View className="mx-5 rounded-3xl p-5 mb-4" style={{ backgroundColor: cfg.color }}>
          <View className="flex-row items-center gap-3">
            <View className="h-14 w-14 rounded-2xl bg-white/20 items-center justify-center">
              <Layers size={28} color="#ffffff" />
            </View>
            <View className="flex-1">
              <Text className="text-[10px] uppercase tracking-wider text-white/80 font-extrabold">
                {cfg.label}
              </Text>
              <Text className="text-2xl font-extrabold text-white mt-0.5" numberOfLines={1}>
                {roll.product?.name}
              </Text>
              {roll.variant?.name && (
                <Text className="text-xs text-white/80 mt-0.5">{roll.variant.name}</Text>
              )}
            </View>
          </View>

          <View className="mt-4 pt-4 border-t border-white/20 flex-row items-center justify-between">
            <View>
              <Text className="text-[10px] font-extrabold uppercase text-white/70">Remaining</Text>
              <Text className="text-white text-3xl font-extrabold mt-0.5">
                {roll.remainingLengthFt.toFixed(1)}
              </Text>
              <Text className="text-[10px] text-white/70 font-bold">ft length</Text>
            </View>
            <View className="items-end">
              <Text className="text-[10px] font-extrabold uppercase text-white/70">Available</Text>
              <Text className="text-white text-3xl font-extrabold mt-0.5">
                {roll.remainingSqft.toFixed(0)}
              </Text>
              <Text className="text-[10px] text-white/70 font-bold">sqft</Text>
            </View>
          </View>

          {/* Progress bar */}
          <View className="mt-3">
            <View className="flex-row justify-between mb-1">
              <Text className="text-[10px] font-bold text-white/80">
                Sold: {usagePercent.toFixed(1)}%
              </Text>
              <Text className="text-[10px] font-bold text-white/80">
                {(roll.originalSqft - roll.remainingSqft).toFixed(0)} / {roll.originalSqft.toFixed(0)} sqft
              </Text>
            </View>
            <View className="bg-white/20 rounded-full h-2 overflow-hidden">
              <View
                className="h-full rounded-full bg-white"
                style={{ width: `${usagePercent}%` }}
              />
            </View>
          </View>
        </View>

        {/* Info grid */}
        <View className="px-5 mb-3">
          <View className="flex-row flex-wrap -mx-1.5">
            <View className="w-1/2 px-1.5 mb-3">
              <View className="rounded-2xl bg-white border border-neutral-200 p-3">
                <View className="flex-row items-center gap-1.5 mb-1">
                  <Ruler size={12} color="#64748b" />
                  <Text className="text-[10px] uppercase font-extrabold text-neutral-500">Width</Text>
                </View>
                <Text className="text-xl font-extrabold text-neutral-900">
                  {roll.widthFt}ft
                  {roll.widthInch > 0 && ` ${roll.widthInch}in`}
                </Text>
              </View>
            </View>
            <View className="w-1/2 px-1.5 mb-3">
              <View className="rounded-2xl bg-white border border-neutral-200 p-3">
                <View className="flex-row items-center gap-1.5 mb-1">
                  <Ruler size={12} color="#64748b" />
                  <Text className="text-[10px] uppercase font-extrabold text-neutral-500">Original</Text>
                </View>
                <Text className="text-xl font-extrabold text-neutral-900">
                  {roll.originalLengthFt.toFixed(1)}ft
                </Text>
              </View>
            </View>
            <View className="w-1/2 px-1.5 mb-3">
              <View className="rounded-2xl bg-emerald-50 border border-emerald-200 p-3">
                <View className="flex-row items-center gap-1.5 mb-1">
                  <DollarSign size={12} color="#16a34a" />
                  <Text className="text-[10px] uppercase font-extrabold text-emerald-700">
                    Sale Rate
                  </Text>
                </View>
                <Text className="text-lg font-extrabold text-emerald-700">
                  {formatPKRFull(roll.salePricePerSqft)}
                </Text>
                <Text className="text-[10px] text-emerald-600 font-bold">per sqft</Text>
              </View>
            </View>
            <View className="w-1/2 px-1.5 mb-3">
              <View className="rounded-2xl bg-blue-50 border border-blue-200 p-3">
                <View className="flex-row items-center gap-1.5 mb-1">
                  <DollarSign size={12} color="#2563eb" />
                  <Text className="text-[10px] uppercase font-extrabold text-blue-700">
                    Cost
                  </Text>
                </View>
                <Text className="text-lg font-extrabold text-blue-700">
                  {formatPKRFull(roll.costPerSqft)}
                </Text>
                <Text className="text-[10px] text-blue-600 font-bold">per sqft</Text>
              </View>
            </View>
          </View>
        </View>

        {/* Meta details */}
        <View className="mx-5 rounded-2xl bg-white border border-neutral-200 p-4 mb-3 gap-2">
          <Text className="text-[10px] uppercase font-extrabold text-neutral-500 tracking-wider mb-1">
            Details
          </Text>
          {roll.designCode && (
            <View className="flex-row justify-between">
              <Text className="text-xs text-neutral-500">Design Code</Text>
              <Text className="text-xs font-extrabold text-neutral-800 font-mono">{roll.designCode}</Text>
            </View>
          )}
          {roll.rackNumber && (
            <View className="flex-row justify-between">
              <Text className="text-xs text-neutral-500">Rack</Text>
              <Text className="text-xs font-extrabold text-neutral-800">{roll.rackNumber}</Text>
            </View>
          )}
          {roll.quality && (
            <View className="flex-row justify-between">
              <Text className="text-xs text-neutral-500">Quality</Text>
              <Text className="text-xs font-extrabold text-neutral-800">{roll.quality}</Text>
            </View>
          )}
          {roll.pile && (
            <View className="flex-row justify-between">
              <Text className="text-xs text-neutral-500">Pile</Text>
              <Text className="text-xs font-extrabold text-neutral-800">{roll.pile}</Text>
            </View>
          )}
          {roll.shop && (
            <View className="flex-row justify-between">
              <Text className="text-xs text-neutral-500">Shop</Text>
              <Text className="text-xs font-extrabold text-neutral-800">{roll.shop.name}</Text>
            </View>
          )}
          <View className="flex-row justify-between">
            <Text className="text-xs text-neutral-500">Received</Text>
            <Text className="text-xs font-extrabold text-neutral-800">{formatDate(roll.receivedAt)}</Text>
          </View>
          <View className="flex-row justify-between">
            <Text className="text-xs text-neutral-500">Source</Text>
            <Text className="text-xs font-extrabold text-neutral-800">{roll.sourceType.replace('_', ' ')}</Text>
          </View>
          {roll.notes && (
            <View className="pt-2 mt-1 border-t border-neutral-100">
              <Text className="text-[10px] uppercase font-extrabold text-neutral-500">Notes</Text>
              <Text className="text-xs text-neutral-700 italic mt-1">{roll.notes}</Text>
            </View>
          )}
        </View>

        {/* Cut Pieces */}
        {roll._count && roll._count.cutPieces > 0 && (
          <View className="mx-5 rounded-2xl bg-white border border-neutral-200 p-4 mb-3">
            <View className="flex-row items-center gap-2 mb-2">
              <Scissors size={14} color="#8b5cf6" />
              <Text className="text-xs font-extrabold uppercase tracking-wider text-neutral-700">
                Cut Pieces from this roll: {roll._count.cutPieces}
              </Text>
            </View>
            <Pressable
              onPress={() => router.push(`/industries/carpet/cut-pieces?sourceRollId=${roll.id}` as any)}
              className="rounded-xl bg-violet-100 p-3 flex-row items-center justify-center gap-2"
            >
              <Scissors size={14} color="#8b5cf6" />
              <Text className="text-violet-700 font-extrabold text-sm">View Cut Pieces</Text>
            </Pressable>
          </View>
        )}

        {/* Movements */}
        {roll.movements && roll.movements.length > 0 && (
          <View className="mx-5 rounded-2xl bg-white border border-neutral-200 overflow-hidden mb-3">
            <View className="px-4 py-3 border-b border-neutral-100 flex-row items-center gap-2">
              <Activity size={14} color="#f59e0b" />
              <Text className="text-xs font-extrabold uppercase tracking-wider text-neutral-700">
                Movements ({roll.movements.length})
              </Text>
            </View>
            {roll.movements.slice(0, 10).map((mv, idx) => (
              <View
                key={mv.id}
                className={`p-3 flex-row items-center gap-3 ${
                  idx !== roll.movements!.length - 1 ? 'border-b border-neutral-100' : ''
                }`}
              >
                <View
                  className="h-9 w-9 rounded-xl items-center justify-center"
                  style={{
                    backgroundColor:
                      mv.type === 'CUT_FOR_SALE' ? '#dbeafe' :
                      mv.type === 'ADJUSTMENT' ? '#fef3c7' :
                      mv.type === 'DAMAGE' ? '#fee2e2' :
                      mv.type === 'OPENING' ? '#dcfce7' :
                      '#f1f5f9',
                  }}
                >
                  {mv.type === 'CUT_FOR_SALE' && <Scissors size={16} color="#2563eb" />}
                  {mv.type === 'ADJUSTMENT' && <Edit3 size={16} color="#d97706" />}
                  {mv.type === 'DAMAGE' && <AlertTriangle size={16} color="#dc2626" />}
                  {mv.type === 'OPENING' && <Package size={16} color="#16a34a" />}
                  {(mv.type === 'RETURN' || mv.type === 'TRANSFER') && <Activity size={16} color="#64748b" />}
                </View>
                <View className="flex-1">
                  <Text className="text-xs font-extrabold text-neutral-800">
                    {mv.type.replace(/_/g, ' ')}
                  </Text>
                  <Text className="text-[10px] text-neutral-500 mt-0.5">
                    {formatDate(mv.createdAt)}
                  </Text>
                  {mv.note && (
                    <Text className="text-[10px] text-neutral-600 italic mt-0.5">{mv.note}</Text>
                  )}
                </View>
                <View className="items-end">
                  <Text className={`text-sm font-extrabold ${mv.lengthFt > 0 ? 'text-emerald-700' : 'text-rose-700'}`}>
                    {mv.lengthFt > 0 ? '+' : ''}{mv.lengthFt.toFixed(1)}ft
                  </Text>
                  <Text className="text-[10px] text-neutral-500 font-bold">
                    Bal: {mv.balanceLengthAfter.toFixed(1)}ft
                  </Text>
                </View>
              </View>
            ))}
          </View>
        )}
      </ScrollView>

      {/* Bottom Actions */}
      <View className="absolute left-0 right-0 bottom-0 bg-white dark:bg-neutral-900 border-t border-neutral-200 px-5 py-3">
        <View className="flex-row gap-2">
          <Pressable
            onPress={() => setShowAdjust(true)}
            className="flex-1 h-12 rounded-xl flex-row items-center justify-center gap-1.5 active:opacity-80"
            style={{ backgroundColor: '#f59e0b' }}
          >
            <Edit3 size={16} color="#ffffff" />
            <Text className="text-white font-bold text-sm">Adjust</Text>
          </Pressable>
          {roll.status === 'ACTIVE' && (
            <>
              <Pressable
                onPress={() => {
                  Alert.prompt(
                    'Mark Damaged?',
                    'Reason:',
                    [
                      { text: 'Cancel', style: 'cancel' },
                      { text: 'Confirm', onPress: (reason?: string) => damageMutation.mutate(reason) },
                    ],
                    'plain-text',
                  );
                }}
                className="h-12 px-4 rounded-xl border-2 border-rose-300 items-center justify-center flex-row gap-1.5 active:opacity-70"
              >
                <AlertTriangle size={16} color="#dc2626" />
                <Text className="text-rose-700 font-bold text-sm">Damage</Text>
              </Pressable>
              <Pressable
                onPress={() => {
                  Alert.alert('Mark Finished?', 'Roll fully sold?', [
                    { text: 'Cancel', style: 'cancel' },
                    { text: 'Finish', onPress: () => finishMutation.mutate() },
                  ]);
                }}
                className="h-12 px-4 rounded-xl border-2 border-slate-300 items-center justify-center flex-row gap-1.5 active:opacity-70"
              >
                <CheckCircle2 size={16} color="#64748b" />
              </Pressable>
            </>
          )}
        </View>
      </View>

      {/* Adjust Modal */}
      <Modal visible={showAdjust} animationType="slide" presentationStyle="formSheet" onRequestClose={() => setShowAdjust(false)}>
        <SafeAreaView className="flex-1 bg-neutral-50">
          <KeyboardAvoidingView behavior={Platform.OS === 'ios' ? 'padding' : 'height'} className="flex-1">
            <View className="px-5 py-4 border-b border-neutral-200 flex-row items-center gap-3">
              <View className="h-11 w-11 rounded-2xl bg-amber-600 items-center justify-center">
                <Edit3 size={20} color="#ffffff" />
              </View>
              <Text className="flex-1 text-lg font-bold text-neutral-900">Adjust Roll</Text>
              <Pressable onPress={() => setShowAdjust(false)} hitSlop={12} className="h-10 w-10 rounded-2xl bg-neutral-100 items-center justify-center">
                <X size={20} color="#6b7280" />
              </Pressable>
            </View>
            <ScrollView contentContainerStyle={{ padding: 20 }}>
              <View className="rounded-xl bg-amber-50 border-2 border-amber-300 p-3 mb-4">
                <Text className="text-xs font-bold text-amber-900">
                  Current remaining: {roll.remainingLengthFt.toFixed(1)}ft ({roll.remainingSqft.toFixed(0)} sqft)
                </Text>
              </View>
              <Text className="text-xs uppercase font-extrabold text-neutral-500 mb-1.5">
                Length Delta (ft) — positive to add, negative to subtract
              </Text>
              <TextInput
                value={adjustDelta}
                onChangeText={setAdjustDelta}
                keyboardType="numbers-and-punctuation"
                placeholder="e.g. -2.5 or +5"
                placeholderTextColor="#9ca3af"
                autoFocus
                className="h-14 rounded-2xl border-2 border-amber-200 bg-white px-4 text-xl font-extrabold text-neutral-900 mb-4"
              />
              <Text className="text-xs uppercase font-extrabold text-neutral-500 mb-1.5">Reason *</Text>
              <TextInput
                value={adjustReason}
                onChangeText={setAdjustReason}
                placeholder="e.g. Physical count adjustment"
                placeholderTextColor="#9ca3af"
                className="h-12 rounded-2xl border-2 border-neutral-200 bg-white px-4 text-sm font-bold text-neutral-900 mb-4"
              />
              <Text className="text-xs uppercase font-extrabold text-neutral-500 mb-1.5">Note (optional)</Text>
              <TextInput
                value={adjustNote}
                onChangeText={setAdjustNote}
                multiline
                numberOfLines={2}
                placeholder="Extra details..."
                placeholderTextColor="#9ca3af"
                className="min-h-[60px] rounded-2xl border-2 border-neutral-200 bg-white p-3 text-sm font-bold text-neutral-900"
                textAlignVertical="top"
              />
            </ScrollView>
            <View className="px-5 py-4 border-t border-neutral-200">
              <Pressable
                onPress={() => {
                  const delta = Number(adjustDelta);
                  if (isNaN(delta) || delta === 0) {
                    Toast.show({ type: 'error', text1: 'Enter delta' });
                    return;
                  }
                  if (!adjustReason.trim()) {
                    Toast.show({ type: 'error', text1: 'Reason required' });
                    return;
                  }
                  adjustMutation.mutate({
                    lengthDeltaFt: delta,
                    reason: adjustReason.trim(),
                    note: adjustNote.trim() || undefined,
                  });
                }}
                disabled={adjustMutation.isPending}
                className="h-14 rounded-2xl items-center justify-center flex-row gap-2"
                style={{ backgroundColor: adjustMutation.isPending ? '#9ca3af' : '#f59e0b' }}
              >
                <CheckCircle2 size={20} color="#ffffff" />
                <Text className="text-white font-extrabold text-base">
                  {adjustMutation.isPending ? 'Adjusting...' : 'Apply Adjustment'}
                </Text>
              </Pressable>
            </View>
          </KeyboardAvoidingView>
        </SafeAreaView>
      </Modal>
    </SafeAreaView>
  );
}
