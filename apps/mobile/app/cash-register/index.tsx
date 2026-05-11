import { useState } from 'react';
import {
  View, Text, ScrollView, Pressable, RefreshControl, Modal,
  TextInput, KeyboardAvoidingView, Platform, Alert,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { useRouter, Stack } from 'expo-router';
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import * as Haptics from 'expo-haptics';
import {
  ArrowLeft, Wallet, PlayCircle, StopCircle, ArrowDownToLine,
  ArrowUpFromLine, Banknote, History, Sparkles, X, Check,
  AlertCircle, TrendingUp, TrendingDown, Clock, CalendarClock,
} from 'lucide-react-native';
import { cashRegisterApi } from '@/api/cash-register.api';
import { formatPKRFull } from '@/lib/format';
import Toast from 'react-native-toast-message';

import { useTranslation } from '@/i18n/useTranslation';
const formatDate = (v: string) =>
  new Intl.DateTimeFormat('en-PK', {
    dateStyle: 'medium',
    timeStyle: 'short',
  }).format(new Date(v));

function ThemedInput({ label, required, hint, ...props }: any) {
  return (
    <View>
      <View className="flex-row items-center gap-1 mb-1.5">
        <Text className="text-sm font-bold text-neutral-700 dark:text-neutral-200">{label}</Text>
        {required && <Text className="text-rose-600 font-bold">*</Text>}
      </View>
      <View className="flex-row items-center gap-2 rounded-2xl border border-neutral-200 dark:border-neutral-800 bg-white dark:bg-neutral-900 px-4 h-12">
        <TextInput
          placeholderTextColor="#9ca3af"
          className="flex-1 text-base text-neutral-900 dark:text-white"
          {...props}
        />
      </View>
      {hint && <Text className="mt-1 text-xs text-neutral-500">{hint}</Text>}
    </View>
  );
}

export default function CashRegisterScreen() {
  const { t } = useTranslation();
  const router = useRouter();
  const queryClient = useQueryClient();
  const [refreshing, setRefreshing] = useState(false);
  const [openModal, setOpenModal] = useState(false);
  const [closeModal, setCloseModal] = useState(false);
  const [txModal, setTxModal] = useState<'CASH_IN' | 'CASH_OUT' | null>(null);

  const [openingBal, setOpeningBal] = useState('');
  const [openingNotes, setOpeningNotes] = useState('');
  const [closingBal, setClosingBal] = useState('');
  const [closingNotes, setClosingNotes] = useState('');
  const [txAmount, setTxAmount] = useState('');
  const [txReason, setTxReason] = useState('');

  const { data: current, refetch: refetchCurrent } = useQuery({
    queryKey: ['cash-register-current'],
    queryFn: async () => {
      try {
        return await cashRegisterApi.current();
      } catch {
        return null;
      }
    },
    refetchInterval: 30000,
  });

  const { data: history = [], refetch: refetchHistory } = useQuery({
    queryKey: ['cash-register-history'],
    queryFn: async () => {
      try {
        const r = await cashRegisterApi.history();
        return Array.isArray(r) ? r : [];
      } catch {
        return [];
      }
    },
  });

  const onRefresh = async () => {
    setRefreshing(true);
    await Promise.all([refetchCurrent(), refetchHistory()]);
    setRefreshing(false);
  };

  const openMutation = useMutation({
    mutationFn: cashRegisterApi.open,
    onSuccess: () => {
      Haptics.notificationAsync(Haptics.NotificationFeedbackType.Success);
      Toast.show({ type: 'success', text1: '✅ Register opened!' });
      setOpeningBal('');
      setOpeningNotes('');
      setOpenModal(false);
      queryClient.invalidateQueries({ queryKey: ['cash-register-current'] });
      queryClient.invalidateQueries({ queryKey: ['cash-register-history'] });
    },
    onError: (e: any) =>
      Toast.show({ type: 'error', text1: e?.response?.data?.message || 'Open failed' }),
  });

  const txMutation = useMutation({
    mutationFn: cashRegisterApi.transaction,
    onSuccess: () => {
      Haptics.notificationAsync(Haptics.NotificationFeedbackType.Success);
      Toast.show({ type: 'success', text1: '✅ Transaction recorded!' });
      setTxAmount('');
      setTxReason('');
      setTxModal(null);
      queryClient.invalidateQueries({ queryKey: ['cash-register-current'] });
    },
    onError: (e: any) =>
      Toast.show({ type: 'error', text1: e?.response?.data?.message || 'Failed' }),
  });

  const closeMutation = useMutation({
    mutationFn: cashRegisterApi.close,
    onSuccess: () => {
      Haptics.notificationAsync(Haptics.NotificationFeedbackType.Success);
      Toast.show({ type: 'success', text1: '✅ Register closed!' });
      setClosingBal('');
      setClosingNotes('');
      setCloseModal(false);
      queryClient.invalidateQueries({ queryKey: ['cash-register-current'] });
      queryClient.invalidateQueries({ queryKey: ['cash-register-history'] });
    },
    onError: (e: any) =>
      Toast.show({ type: 'error', text1: e?.response?.data?.message || 'Close failed' }),
  });

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
          <Text className="text-2xl font-extrabold text-neutral-900 dark:text-white">{t('auto.index.cash_register')}</Text>
          <View className="flex-row items-center gap-1.5 mt-0.5">
            <Sparkles size={11} color="#10b981" />
            <Text className="text-xs text-neutral-500">
              {current ? `OPEN • ${current.registerNumber}` : 'No active register'}
            </Text>
          </View>
        </View>
        {current && (
          <View className="flex-row items-center gap-1.5 px-3 py-1.5 rounded-full bg-emerald-100 dark:bg-emerald-950/40">
            <View className="h-2 w-2 rounded-full bg-emerald-500" />
            <Text className="text-xs font-extrabold text-emerald-700">OPEN</Text>
          </View>
        )}
      </View>

      <ScrollView
        contentContainerStyle={{ paddingBottom: 40 }}
        refreshControl={
          <RefreshControl refreshing={refreshing} onRefresh={onRefresh} tintColor="#16a34a" />
        }
        showsVerticalScrollIndicator={false}
      >
        {!current ? (
          /* No register open */
          <View className="px-5">
            <View className="rounded-3xl bg-white dark:bg-neutral-900 border border-neutral-200 dark:border-neutral-800 p-8 items-center">
              <View
                className="h-20 w-20 rounded-3xl items-center justify-center"
                style={{ backgroundColor: '#dcfce7' }}
              >
                <PlayCircle size={40} color="#16a34a" />
              </View>
              <Text className="mt-5 text-xl font-extrabold text-neutral-900 dark:text-white">{t('auto.index.register_closed')}</Text>
              <Text className="mt-2 text-sm text-neutral-500 text-center">{t('auto.index.din_shuru_karne_se_pehle_apna_opening_ca')}</Text>
              <Pressable
                onPress={() => {
                  Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
                  setOpenModal(true);
                }}
                className="mt-6 h-12 px-6 rounded-2xl flex-row items-center gap-2 active:opacity-80"
                style={{
                  backgroundColor: '#16a34a',
                  shadowColor: '#16a34a',
                  shadowOpacity: 0.3,
                  shadowRadius: 12,
                  elevation: 6,
                }}
              >
                <PlayCircle size={20} color="#ffffff" />
                <Text className="text-white font-extrabold text-base">{t('auto.index.open_register')}</Text>
              </Pressable>
            </View>
          </View>
        ) : (
          /* Register OPEN */
          <View className="px-5 gap-4">
            {/* Hero — Expected Balance */}
            <View
              className="rounded-3xl p-5"
              style={{
                backgroundColor: '#16a34a',
                shadowColor: '#16a34a',
                shadowOpacity: 0.3,
                shadowRadius: 16,
                shadowOffset: { width: 0, height: 8 },
                elevation: 10,
              }}
            >
              <View className="flex-row items-center gap-2">
                <Wallet size={14} color="rgba(255,255,255,0.9)" />
                <Text className="text-xs font-bold uppercase tracking-wider text-white/80">{t('auto.index.expected_in_drawer')}</Text>
              </View>
              <Text className="text-5xl font-extrabold text-white mt-1">
                {formatPKRFull(current.expectedBalance)}
              </Text>
              <View className="flex-row items-center gap-1 mt-2">
                <Clock size={11} color="rgba(255,255,255,0.8)" />
                <Text className="text-xs text-white/80">
                  Opened: {formatDate(current.openedAt)}
                </Text>
              </View>
              <Text className="text-[11px] text-white/70 mt-1">
                By: {current.openedBy?.fullName || '—'}
              </Text>
            </View>

            {/* Stats Grid */}
            <View className="flex-row flex-wrap -mx-1.5">
              {[
                { label: 'Opening', value: current.openingBalance, icon: PlayCircle, color: '#737373', bg: '#f3f4f6' },
                { label: 'Cash In', value: current.totalCashIn, icon: ArrowDownToLine, color: '#16a34a', bg: '#dcfce7' },
                { label: 'Cash Out', value: current.totalCashOut, icon: ArrowUpFromLine, color: '#dc2626', bg: '#fee2e2' },
                { label: 'Sales', value: current.totalSales, icon: TrendingUp, color: '#2563eb', bg: '#dbeafe' },
              ].map((s) => {
                const Icon = s.icon;
                return (
                  <View key={s.label} className="w-1/2 px-1.5 mb-3">
                    <View
                      className="rounded-2xl bg-white dark:bg-neutral-900 border border-neutral-200 dark:border-neutral-800 p-3"
                      style={{
                        shadowColor: '#000',
                        shadowOpacity: 0.04,
                        shadowRadius: 4,
                        elevation: 1,
                      }}
                    >
                      <View
                        className="h-9 w-9 rounded-xl items-center justify-center"
                        style={{ backgroundColor: s.bg }}
                      >
                        <Icon size={18} color={s.color} />
                      </View>
                      <Text className="mt-2 text-[10px] text-neutral-500 font-extrabold uppercase tracking-wider">
                        {s.label}
                      </Text>
                      <Text className="mt-0.5 text-base font-extrabold text-neutral-900 dark:text-white">
                        {formatPKRFull(s.value)}
                      </Text>
                    </View>
                  </View>
                );
              })}
            </View>

            {/* Action Buttons */}
            <View className="flex-row gap-2">
              <Pressable
                onPress={() => {
                  Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
                  setTxModal('CASH_IN');
                }}
                className="flex-1 h-14 rounded-2xl flex-row items-center justify-center gap-2 active:opacity-80"
                style={{
                  backgroundColor: '#16a34a',
                  shadowColor: '#16a34a',
                  shadowOpacity: 0.3,
                  shadowRadius: 8,
                  elevation: 4,
                }}
              >
                <ArrowDownToLine size={20} color="#ffffff" />
                <Text className="text-white font-extrabold text-base">{t('auto.index.cash_in')}</Text>
              </Pressable>
              <Pressable
                onPress={() => {
                  Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
                  setTxModal('CASH_OUT');
                }}
                className="flex-1 h-14 rounded-2xl flex-row items-center justify-center gap-2 active:opacity-80"
                style={{
                  backgroundColor: '#dc2626',
                  shadowColor: '#dc2626',
                  shadowOpacity: 0.3,
                  shadowRadius: 8,
                  elevation: 4,
                }}
              >
                <ArrowUpFromLine size={20} color="#ffffff" />
                <Text className="text-white font-extrabold text-base">{t('auto.index.cash_out')}</Text>
              </Pressable>
            </View>

            {/* Close Register */}
            <Pressable
              onPress={() => {
                Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Medium);
                setCloseModal(true);
              }}
              className="h-14 rounded-2xl flex-row items-center justify-center gap-2 border-2 active:opacity-70"
              style={{
                borderColor: '#dc2626',
                backgroundColor: '#fee2e2',
              }}
            >
              <StopCircle size={20} color="#dc2626" />
              <Text className="font-extrabold text-base text-rose-700">{t('auto.index.close_register')}</Text>
            </Pressable>

            {/* Recent Transactions */}
            {current.transactions && current.transactions.length > 0 && (
              <View>
                <View className="flex-row items-center gap-2 mb-3">
                  <History size={16} color="#16a34a" />
                  <Text className="text-base font-extrabold text-neutral-900 dark:text-white">{t('auto.index.recent_transactions')}</Text>
                </View>
                <View className="gap-2">
                  {current.transactions.slice(0, 10).map((tx) => {
                    const isIn = ['CASH_IN', 'OPENING', 'SALE'].includes(tx.type);
                    return (
                      <View
                        key={tx.id}
                        className="rounded-2xl bg-white dark:bg-neutral-900 border border-neutral-200 dark:border-neutral-800 p-3 flex-row items-center gap-3"
                      >
                        <View
                          className="h-10 w-10 rounded-xl items-center justify-center"
                          style={{ backgroundColor: isIn ? '#dcfce7' : '#fee2e2' }}
                        >
                          {isIn ? (
                            <ArrowDownToLine size={16} color="#16a34a" />
                          ) : (
                            <ArrowUpFromLine size={16} color="#dc2626" />
                          )}
                        </View>
                        <View className="flex-1">
                          <Text className="text-xs font-extrabold uppercase text-neutral-500">
                            {tx.type.replace('_', ' ')}
                          </Text>
                          <Text className="text-sm font-bold text-neutral-900 dark:text-white" numberOfLines={1}>
                            {tx.reason || '—'}
                          </Text>
                          <Text className="text-[10px] text-neutral-500 mt-0.5">
                            {formatDate(tx.createdAt)}
                          </Text>
                        </View>
                        <Text
                          className="text-base font-extrabold"
                          style={{ color: isIn ? '#15803d' : '#b91c1c' }}
                        >
                          {isIn ? '+' : '-'}{formatPKRFull(tx.amount)}
                        </Text>
                      </View>
                    );
                  })}
                </View>
              </View>
            )}
          </View>
        )}

        {/* History Section */}
        {history.length > 0 && (
          <View className="px-5 mt-6">
            <View className="flex-row items-center gap-2 mb-3">
              <CalendarClock size={16} color="#737373" />
              <Text className="text-base font-extrabold text-neutral-900 dark:text-white">{t('auto.index.register_history')}</Text>
            </View>
            <View className="gap-2">
              {history.slice(0, 10).map((r) => (
                <View
                  key={r.id}
                  className="rounded-2xl bg-white dark:bg-neutral-900 border border-neutral-200 dark:border-neutral-800 p-3"
                >
                  <View className="flex-row items-center justify-between">
                    <View className="flex-1">
                      <Text className="font-mono text-xs font-extrabold text-neutral-700">
                        {r.registerNumber}
                      </Text>
                      <Text className="text-[10px] text-neutral-500 mt-0.5">
                        {r.openedBy?.fullName} • {formatDate(r.openedAt)}
                      </Text>
                    </View>
                    <View
                      className="px-2 py-0.5 rounded-md"
                      style={{
                        backgroundColor: r.status === 'OPEN' ? '#dcfce7' : '#f3f4f6',
                      }}
                    >
                      <Text
                        className="text-[9px] font-extrabold"
                        style={{ color: r.status === 'OPEN' ? '#15803d' : '#6b7280' }}
                      >
                        {r.status}
                      </Text>
                    </View>
                  </View>
                  <View className="mt-3 flex-row items-center justify-between">
                    <View>
                      <Text className="text-[10px] text-neutral-500 font-bold uppercase">{t('auto.index.sales')}</Text>
                      <Text className="text-sm font-extrabold text-emerald-700">
                        {formatPKRFull(r.totalSales)}
                      </Text>
                    </View>
                    <View>
                      <Text className="text-[10px] text-neutral-500 font-bold uppercase">{t('auto.index.closed')}</Text>
                      <Text className="text-sm font-extrabold text-neutral-900">
                        {formatPKRFull(r.closingBalance)}
                      </Text>
                    </View>
                    {r.status === 'CLOSED' && (
                      <View>
                        <Text className="text-[10px] text-neutral-500 font-bold uppercase">{t('auto.index.difference')}</Text>
                        <Text
                          className="text-sm font-extrabold"
                          style={{
                            color: r.difference === 0 ? '#374151' : r.difference > 0 ? '#15803d' : '#b91c1c',
                          }}
                        >
                          {r.difference > 0 ? '+' : ''}{formatPKRFull(r.difference)}
                        </Text>
                      </View>
                    )}
                  </View>
                </View>
              ))}
            </View>
          </View>
        )}
      </ScrollView>

      {/* Open Register Modal */}
      <Modal visible={openModal} animationType="slide" presentationStyle="pageSheet">
        <SafeAreaView className="flex-1 bg-neutral-50 dark:bg-neutral-950">
          <KeyboardAvoidingView
            behavior={Platform.OS === 'ios' ? 'padding' : 'height'}
            className="flex-1"
          >
            <View className="flex-row items-center justify-between px-5 py-4 border-b border-neutral-200 dark:border-neutral-800">
              <View className="flex-row items-center gap-3">
                <View
                  className="h-10 w-10 rounded-2xl items-center justify-center"
                  style={{ backgroundColor: '#16a34a' }}
                >
                  <PlayCircle size={18} color="#ffffff" />
                </View>
                <Text className="text-xl font-extrabold text-neutral-900 dark:text-white">{t('auto.index.open_register')}</Text>
              </View>
              <Pressable
                onPress={() => setOpenModal(false)}
                hitSlop={12}
                className="h-10 w-10 rounded-2xl bg-neutral-100 dark:bg-neutral-800 items-center justify-center"
              >
                <X size={20} color="#6b7280" />
              </Pressable>
            </View>
            <ScrollView contentContainerStyle={{ padding: 20 }} keyboardShouldPersistTaps="handled">
              <View className="gap-4">
                <ThemedInput
                  label="Opening Cash Balance"
                  required
                  value={openingBal}
                  onChangeText={setOpeningBal}
                  keyboardType="numeric"
                  placeholder="5000"
                  hint="Drawer mein abhi kitna cash hai?"
                />
                <ThemedInput
                  label="Notes"
                  value={openingNotes}
                  onChangeText={setOpeningNotes}
                  placeholder="Morning shift opened by..."
                />
              </View>
            </ScrollView>
            <View className="px-5 py-4 border-t border-neutral-200 dark:border-neutral-800 bg-white dark:bg-neutral-900">
              <Pressable
                onPress={() => {
                  const bal = Number(openingBal);
                  if (isNaN(bal) || bal < 0) {
                    Toast.show({ type: 'error', text1: 'Valid balance likhein' });
                    return;
                  }
                  openMutation.mutate({
                    openingBalance: bal,
                    notes: openingNotes.trim() || undefined,
                  });
                }}
                disabled={openMutation.isPending}
                className="h-14 rounded-2xl items-center justify-center flex-row gap-2 active:opacity-80"
                style={{
                  backgroundColor: openMutation.isPending ? '#9ca3af' : '#16a34a',
                  shadowColor: '#16a34a',
                  shadowOpacity: 0.4,
                  shadowRadius: 12,
                  elevation: 6,
                }}
              >
                <PlayCircle size={20} color="#ffffff" />
                <Text className="text-white font-extrabold text-base">
                  {openMutation.isPending ? 'Opening...' : 'Open Register'}
                </Text>
              </Pressable>
            </View>
          </KeyboardAvoidingView>
        </SafeAreaView>
      </Modal>

      {/* Cash In/Out Modal */}
      <Modal visible={!!txModal} animationType="slide" presentationStyle="pageSheet">
        <SafeAreaView className="flex-1 bg-neutral-50 dark:bg-neutral-950">
          <KeyboardAvoidingView
            behavior={Platform.OS === 'ios' ? 'padding' : 'height'}
            className="flex-1"
          >
            <View className="flex-row items-center justify-between px-5 py-4 border-b border-neutral-200 dark:border-neutral-800">
              <View className="flex-row items-center gap-3">
                <View
                  className="h-10 w-10 rounded-2xl items-center justify-center"
                  style={{ backgroundColor: txModal === 'CASH_IN' ? '#16a34a' : '#dc2626' }}
                >
                  {txModal === 'CASH_IN' ? (
                    <ArrowDownToLine size={18} color="#ffffff" />
                  ) : (
                    <ArrowUpFromLine size={18} color="#ffffff" />
                  )}
                </View>
                <Text className="text-xl font-extrabold text-neutral-900 dark:text-white">
                  {txModal === 'CASH_IN' ? 'Cash In' : 'Cash Out'}
                </Text>
              </View>
              <Pressable
                onPress={() => setTxModal(null)}
                hitSlop={12}
                className="h-10 w-10 rounded-2xl bg-neutral-100 dark:bg-neutral-800 items-center justify-center"
              >
                <X size={20} color="#6b7280" />
              </Pressable>
            </View>
            <ScrollView contentContainerStyle={{ padding: 20 }} keyboardShouldPersistTaps="handled">
              <View className="gap-4">
                <ThemedInput
                  label="Amount (PKR)"
                  required
                  value={txAmount}
                  onChangeText={setTxAmount}
                  keyboardType="numeric"
                  placeholder="1000"
                />
                <ThemedInput
                  label="Reason"
                  required
                  value={txReason}
                  onChangeText={setTxReason}
                  placeholder={txModal === 'CASH_IN' ? 'e.g., Owner deposited cash' : 'e.g., Owner withdrawal'}
                />
              </View>
            </ScrollView>
            <View className="px-5 py-4 border-t border-neutral-200 dark:border-neutral-800 bg-white dark:bg-neutral-900">
              <Pressable
                onPress={() => {
                  const amt = Number(txAmount);
                  if (isNaN(amt) || amt <= 0) {
                    Toast.show({ type: 'error', text1: 'Valid amount likhein' });
                    return;
                  }
                  if (!txReason.trim()) {
                    Toast.show({ type: 'error', text1: 'Reason likhein' });
                    return;
                  }
                  txMutation.mutate({
                    type: txModal!,
                    amount: amt,
                    reason: txReason.trim(),
                  });
                }}
                disabled={txMutation.isPending}
                className="h-14 rounded-2xl items-center justify-center flex-row gap-2 active:opacity-80"
                style={{
                  backgroundColor: txMutation.isPending
                    ? '#9ca3af'
                    : txModal === 'CASH_IN'
                    ? '#16a34a'
                    : '#dc2626',
                  shadowColor: txModal === 'CASH_IN' ? '#16a34a' : '#dc2626',
                  shadowOpacity: 0.4,
                  shadowRadius: 12,
                  elevation: 6,
                }}
              >
                <Check size={20} color="#ffffff" />
                <Text className="text-white font-extrabold text-base">
                  {txMutation.isPending ? 'Processing...' : 'Confirm'}
                </Text>
              </Pressable>
            </View>
          </KeyboardAvoidingView>
        </SafeAreaView>
      </Modal>

      {/* Close Register Modal */}
      <Modal visible={closeModal} animationType="slide" presentationStyle="pageSheet">
        <SafeAreaView className="flex-1 bg-neutral-50 dark:bg-neutral-950">
          <KeyboardAvoidingView
            behavior={Platform.OS === 'ios' ? 'padding' : 'height'}
            className="flex-1"
          >
            <View className="flex-row items-center justify-between px-5 py-4 border-b border-neutral-200 dark:border-neutral-800">
              <View className="flex-row items-center gap-3">
                <View
                  className="h-10 w-10 rounded-2xl items-center justify-center"
                  style={{ backgroundColor: '#dc2626' }}
                >
                  <StopCircle size={18} color="#ffffff" />
                </View>
                <Text className="text-xl font-extrabold text-neutral-900 dark:text-white">{t('auto.index.close_register')}</Text>
              </View>
              <Pressable
                onPress={() => setCloseModal(false)}
                hitSlop={12}
                className="h-10 w-10 rounded-2xl bg-neutral-100 dark:bg-neutral-800 items-center justify-center"
              >
                <X size={20} color="#6b7280" />
              </Pressable>
            </View>
            <ScrollView contentContainerStyle={{ padding: 20 }} keyboardShouldPersistTaps="handled">
              <View className="gap-4">
                <View className="rounded-2xl bg-amber-50 border-2 border-amber-300 p-4 flex-row items-start gap-2">
                  <AlertCircle size={18} color="#b45309" />
                  <View className="flex-1">
                    <Text className="text-sm font-bold text-amber-900">{t('auto.index.tip')}</Text>
                    <Text className="text-xs text-amber-800 mt-1">{t('auto.index.drawer_mein_actual_cash_gin_lo_phir_nich')}</Text>
                  </View>
                </View>
                <ThemedInput
                  label="Closing Cash Count (Actual)"
                  required
                  value={closingBal}
                  onChangeText={setClosingBal}
                  keyboardType="numeric"
                  placeholder="25000"
                  hint="Drawer mein actual cash kitna hai?"
                />
                <ThemedInput
                  label="Notes"
                  value={closingNotes}
                  onChangeText={setClosingNotes}
                  placeholder="End of day shift"
                />
              </View>
            </ScrollView>
            <View className="px-5 py-4 border-t border-neutral-200 dark:border-neutral-800 bg-white dark:bg-neutral-900">
              <Pressable
                onPress={() => {
                  const bal = Number(closingBal);
                  if (isNaN(bal) || bal < 0) {
                    Toast.show({ type: 'error', text1: 'Valid balance likhein' });
                    return;
                  }
                  Alert.alert(
                    'Close Register?',
                    'Register close karne ke baad reopen nahi ho sakta',
                    [
                      { text: 'Cancel', style: 'cancel' },
                      {
                        text: 'Close',
                        style: 'destructive',
                        onPress: () =>
                          closeMutation.mutate({
                            closingBalance: bal,
                            notes: closingNotes.trim() || undefined,
                          }),
                      },
                    ],
                  );
                }}
                disabled={closeMutation.isPending}
                className="h-14 rounded-2xl items-center justify-center flex-row gap-2 active:opacity-80"
                style={{
                  backgroundColor: closeMutation.isPending ? '#9ca3af' : '#dc2626',
                  shadowColor: '#dc2626',
                  shadowOpacity: 0.4,
                  shadowRadius: 12,
                  elevation: 6,
                }}
              >
                <StopCircle size={20} color="#ffffff" />
                <Text className="text-white font-extrabold text-base">
                  {closeMutation.isPending ? 'Closing...' : 'Close Register'}
                </Text>
              </Pressable>
            </View>
          </KeyboardAvoidingView>
        </SafeAreaView>
      </Modal>
    </SafeAreaView>
  );
}
