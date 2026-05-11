import { useState } from 'react';
import {
  View, Text, ScrollView, Pressable, RefreshControl, Modal, TextInput,
  KeyboardAvoidingView, Platform,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { useLocalSearchParams, useRouter, Stack } from 'expo-router';
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import * as Haptics from 'expo-haptics';
import {
  ArrowLeft, BookOpen, Sparkles, Plus, X, Check, User, Phone,
  ArrowDownCircle, ArrowUpCircle, CalendarClock, Wallet, History,
  TrendingDown, Receipt,
} from 'lucide-react-native';
import { customerLedgerApi } from '@/api/customer-ledger.api';
import { formatPKRFull } from '@/lib/format';
import Toast from 'react-native-toast-message';

import { useTranslation } from '@/i18n/useTranslation';
const formatDate = (v: string) =>
  new Intl.DateTimeFormat('en-PK', { dateStyle: 'medium', timeStyle: 'short' }).format(new Date(v));

const entryColors: Record<string, { bg: string; text: string; icon: any; sign: string }> = {
  CREDIT_SALE: { bg: '#fee2e2', text: '#b91c1c', icon: ArrowUpCircle, sign: '+' },
  PAYMENT: { bg: '#dcfce7', text: '#15803d', icon: ArrowDownCircle, sign: '-' },
  REFUND: { bg: '#dbeafe', text: '#1d4ed8', icon: TrendingDown, sign: '-' },
  ADJUSTMENT: { bg: '#f3f4f6', text: '#4b5563', icon: History, sign: '' },
};

export default function KhataCustomerScreen() {
  const { t } = useTranslation();
  const { customerId } = useLocalSearchParams<{ customerId: string }>();
  const router = useRouter();
  const queryClient = useQueryClient();
  const [refreshing, setRefreshing] = useState(false);
  const [paymentOpen, setPaymentOpen] = useState(false);
  const [amount, setAmount] = useState('');
  const [note, setNote] = useState('');

  const { data, refetch } = useQuery({
    queryKey: ['customer-ledger', customerId],
    queryFn: async () => {
      try {
        return await customerLedgerApi.customerLedger(customerId);
      } catch {
        return null;
      }
    },
    enabled: !!customerId,
  });

  const onRefresh = async () => {
    setRefreshing(true);
    await refetch();
    setRefreshing(false);
  };

  const paymentMutation = useMutation({
    mutationFn: () =>
      customerLedgerApi.recordPayment(customerId, {
        amount: Number(amount),
        note: note.trim() || undefined,
      }),
    onSuccess: () => {
      Haptics.notificationAsync(Haptics.NotificationFeedbackType.Success);
      Toast.show({
        type: 'success',
        text1: '✅ Payment recorded!',
        text2: `${formatPKRFull(Number(amount))} received`,
      });
      setAmount('');
      setNote('');
      setPaymentOpen(false);
      queryClient.invalidateQueries({ queryKey: ['customer-ledger', customerId] });
      queryClient.invalidateQueries({ queryKey: ['khata-summary'] });
      queryClient.invalidateQueries({ queryKey: ['customers'] });
      queryClient.invalidateQueries({ queryKey: ['pos-customers'] });
    },
    onError: (e: any) =>
      Toast.show({ type: 'error', text1: e?.response?.data?.message || 'Failed' }),
  });

  if (!data) {
    return (
      <SafeAreaView className="flex-1 bg-neutral-50 dark:bg-neutral-950 items-center justify-center">
        <Stack.Screen options={{ headerShown: false }} />
        <BookOpen size={36} color="#9ca3af" />
        <Text className="mt-3 text-neutral-500">{t('auto.customerId.loading_khata')}</Text>
      </SafeAreaView>
    );
  }

  const { customer, entries } = data;
  const balance = customer?.balance ?? 0;

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
          <Text className="text-xs text-neutral-500">{t('auto.customerId.customer_ledger')}</Text>
          <Text className="text-lg font-extrabold text-neutral-900 dark:text-white" numberOfLines={1}>
            {customer?.name || 'Customer'}
          </Text>
        </View>
        <Pressable
          onPress={() => {
            Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
            setPaymentOpen(true);
          }}
          className="h-11 px-4 rounded-2xl flex-row items-center gap-1.5 active:opacity-80"
          style={{
            backgroundColor: '#16a34a',
            shadowColor: '#16a34a',
            shadowOpacity: 0.3,
            shadowRadius: 8,
            elevation: 4,
          }}
        >
          <Plus size={16} color="#ffffff" />
          <Text className="text-white font-bold text-sm">{t('auto.id.payment')}</Text>
        </Pressable>
      </View>

      <ScrollView
        contentContainerStyle={{ paddingBottom: 40 }}
        refreshControl={<RefreshControl refreshing={refreshing} onRefresh={onRefresh} tintColor="#16a34a" />}
        showsVerticalScrollIndicator={false}
      >
        {/* Hero — Current Balance */}
        <View className="px-5 mb-4">
          <View
            className="rounded-3xl p-5"
            style={{
              backgroundColor: balance > 0 ? '#dc2626' : '#16a34a',
              shadowColor: balance > 0 ? '#dc2626' : '#16a34a',
              shadowOpacity: 0.3,
              shadowRadius: 16,
              shadowOffset: { width: 0, height: 8 },
              elevation: 10,
            }}
          >
            <View className="flex-row items-center gap-3 mb-3">
              <View className="h-14 w-14 rounded-2xl bg-white/20 items-center justify-center">
                <BookOpen size={28} color="#ffffff" />
              </View>
              <View className="flex-1">
                <Text className="text-xs font-bold uppercase tracking-wider text-white/80">
                  {balance > 0 ? 'Total Udhaar' : 'Account Clear'}
                </Text>
                <Text className="text-4xl font-extrabold text-white">
                  {formatPKRFull(balance)}
                </Text>
                {balance > 0 && (
                  <Text className="text-xs text-white/80 mt-0.5">{t('auto.customerId.customer_ne_dena_hai')}</Text>
                )}
              </View>
            </View>

            {customer?.phone && (
              <View className="pt-3 border-t border-white/20 flex-row items-center gap-1.5">
                <Phone size={11} color="rgba(255,255,255,0.8)" />
                <Text className="text-xs text-white/90 font-semibold">
                  {customer.phone}
                </Text>
              </View>
            )}
          </View>
        </View>

        {/* Stats */}
        <View className="px-5 mb-4 flex-row gap-2">
          <View className="flex-1 rounded-2xl bg-white dark:bg-neutral-900 border border-neutral-200 dark:border-neutral-800 p-3">
            <View className="flex-row items-center gap-1.5">
              <Wallet size={12} color="#737373" />
              <Text className="text-[10px] text-neutral-500 font-extrabold uppercase tracking-wider">{t('auto.customerId.credit_limit')}</Text>
            </View>
            <Text className="mt-1 text-base font-extrabold text-neutral-900 dark:text-white">
              {formatPKRFull(customer?.creditLimit || 0)}
            </Text>
          </View>
          <View className="flex-1 rounded-2xl bg-white dark:bg-neutral-900 border border-neutral-200 dark:border-neutral-800 p-3">
            <View className="flex-row items-center gap-1.5">
              <History size={12} color="#737373" />
              <Text className="text-[10px] text-neutral-500 font-extrabold uppercase tracking-wider">{t('auto.customerId.total_entries')}</Text>
            </View>
            <Text className="mt-1 text-base font-extrabold text-neutral-900 dark:text-white">
              {entries?.length || 0}
            </Text>
          </View>
        </View>

        {/* Ledger Entries */}
        <View className="px-5">
          <View className="flex-row items-center gap-2 mb-3">
            <History size={16} color="#16a34a" />
            <Text className="text-base font-extrabold text-neutral-900 dark:text-white">{t('auto.customerId.transaction_history')}</Text>
          </View>

          {!entries || entries.length === 0 ? (
            <View className="rounded-2xl bg-white dark:bg-neutral-900 border border-neutral-200 dark:border-neutral-800 items-center py-12">
              <View className="h-16 w-16 rounded-3xl bg-neutral-100 items-center justify-center">
                <Receipt size={32} color="#9ca3af" />
              </View>
              <Text className="mt-3 text-base font-bold text-neutral-700">{t('auto.customerId.no_transactions_yet')}</Text>
              <Text className="mt-1 text-xs text-neutral-500">{t('auto.customerId.sales_aur_payments_yahan_dikhenge')}</Text>
            </View>
          ) : (
            <View className="gap-2">
              {entries.map((entry) => {
                const cfg = entryColors[entry.type] || entryColors.ADJUSTMENT;
                const Icon = cfg.icon;
                return (
                  <View
                    key={entry.id}
                    className="rounded-2xl bg-white dark:bg-neutral-900 border border-neutral-200 dark:border-neutral-800 p-3.5"
                  >
                    <View className="flex-row items-center gap-3">
                      <View
                        className="h-11 w-11 rounded-2xl items-center justify-center"
                        style={{ backgroundColor: cfg.bg }}
                      >
                        <Icon size={20} color={cfg.text} />
                      </View>
                      <View className="flex-1">
                        <View className="flex-row items-center gap-2">
                          <View
                            className="px-2 py-0.5 rounded-md"
                            style={{ backgroundColor: cfg.bg }}
                          >
                            <Text className="text-[9px] font-extrabold" style={{ color: cfg.text }}>
                              {entry.type.replace('_', ' ')}
                            </Text>
                          </View>
                        </View>
                        {entry.reference && (
                          <Text className="font-mono text-[11px] text-neutral-500 mt-0.5">
                            {entry.reference}
                          </Text>
                        )}
                        {entry.note && (
                          <Text className="text-xs text-neutral-600 mt-0.5" numberOfLines={1}>
                            {entry.note}
                          </Text>
                        )}
                        <View className="flex-row items-center gap-1 mt-0.5">
                          <CalendarClock size={10} color="#9ca3af" />
                          <Text className="text-[10px] text-neutral-500">
                            {formatDate(entry.createdAt)}
                          </Text>
                        </View>
                      </View>
                      <View className="items-end">
                        <Text
                          className="text-lg font-extrabold"
                          style={{ color: cfg.text }}
                        >
                          {cfg.sign}{formatPKRFull(Math.abs(entry.amount))}
                        </Text>
                        <Text className="text-[10px] text-neutral-500 font-bold">
                          Bal: {formatPKRFull(entry.balanceAfter)}
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

      {/* Payment Modal */}
      <Modal visible={paymentOpen} animationType="slide" presentationStyle="pageSheet">
        <SafeAreaView className="flex-1 bg-neutral-50 dark:bg-neutral-950">
          <KeyboardAvoidingView
            behavior={Platform.OS === 'ios' ? 'padding' : 'height'}
            className="flex-1"
          >
            <View className="flex-row items-center justify-between px-5 py-4 border-b border-neutral-200 dark:border-neutral-800">
              <View className="flex-row items-center gap-3">
                <View className="h-10 w-10 rounded-2xl items-center justify-center" style={{ backgroundColor: '#16a34a' }}>
                  <ArrowDownCircle size={18} color="#ffffff" />
                </View>
                <View>
                  <Text className="text-xl font-extrabold text-neutral-900 dark:text-white">{t('auto.customerId.record_payment')}</Text>
                  <Text className="text-xs text-neutral-500">
                    From {customer?.name}
                  </Text>
                </View>
              </View>
              <Pressable
                onPress={() => setPaymentOpen(false)}
                hitSlop={12}
                className="h-10 w-10 rounded-2xl bg-neutral-100 dark:bg-neutral-800 items-center justify-center"
              >
                <X size={20} color="#6b7280" />
              </Pressable>
            </View>

            <ScrollView contentContainerStyle={{ padding: 20 }} keyboardShouldPersistTaps="handled">
              <View className="gap-4">
                {/* Current Balance Display */}
                <View className="rounded-2xl bg-rose-50 border-2 border-rose-200 p-4">
                  <Text className="text-xs font-bold uppercase tracking-wider text-rose-700">{t('auto.customerId.current_udhaar')}</Text>
                  <Text className="text-3xl font-extrabold text-rose-900 mt-1">
                    {formatPKRFull(balance)}
                  </Text>
                </View>

                <View>
                  <Text className="text-sm font-bold text-neutral-700 mb-1.5">
                    Payment Amount <Text className="text-rose-600">*</Text>
                  </Text>
                  <View className="flex-row items-center gap-2 rounded-2xl border-2 border-emerald-300 bg-emerald-50 px-4 h-16">
                    <Text className="text-lg font-bold text-emerald-700">{t('auto.new.rs')}</Text>
                    <TextInput
                      value={amount}
                      onChangeText={setAmount}
                      placeholder="0"
                      placeholderTextColor="#86efac"
                      keyboardType="numeric"
                      autoFocus
                      className="flex-1 text-3xl font-extrabold text-emerald-900"
                    />
                  </View>

                  {/* Quick amounts */}
                  {balance > 0 && (
                    <View className="flex-row gap-2 mt-3">
                      <Pressable
                        onPress={() => {
                          Haptics.selectionAsync();
                          setAmount(String(Math.floor(balance / 2)));
                        }}
                        className="flex-1 h-10 rounded-xl bg-emerald-100 items-center justify-center"
                      >
                        <Text className="text-xs font-bold text-emerald-700">{t('auto.index.half')}</Text>
                      </Pressable>
                      <Pressable
                        onPress={() => {
                          Haptics.selectionAsync();
                          setAmount(String(balance));
                        }}
                        className="flex-1 h-10 rounded-xl bg-emerald-200 items-center justify-center"
                      >
                        <Text className="text-xs font-bold text-emerald-800">{t('auto.new.full_payment')}</Text>
                      </Pressable>
                    </View>
                  )}
                </View>

                <View>
                  <Text className="text-sm font-bold text-neutral-700 mb-1.5">{t('auto.index.note')}</Text>
                  <View className="rounded-2xl border border-neutral-200 bg-white px-4 py-3">
                    <TextInput
                      value={note}
                      onChangeText={setNote}
                      placeholder="e.g., Cash received, JazzCash transfer..."
                      placeholderTextColor="#9ca3af"
                      multiline
                      numberOfLines={3}
                      className="text-base text-neutral-900 min-h-[60px]"
                      textAlignVertical="top"
                    />
                  </View>
                </View>

                {/* After Payment Preview */}
                {Number(amount) > 0 && (
                  <View className="rounded-2xl bg-blue-50 border-2 border-blue-200 p-4">
                    <Text className="text-xs font-bold uppercase tracking-wider text-blue-700">{t('auto.customerId.baqi_udhaar')}</Text>
                    <Text className="text-2xl font-extrabold text-blue-900 mt-1">
                      {formatPKRFull(Math.max(0, balance - Number(amount)))}
                    </Text>
                    <Text className="text-[11px] text-blue-700 mt-1">{t('auto.customerId.payment_ke_baad_customer_ka_udhaar')}</Text>
                  </View>
                )}
              </View>
            </ScrollView>

            <View className="px-5 py-4 border-t border-neutral-200 dark:border-neutral-800 bg-white dark:bg-neutral-900">
              <Pressable
                onPress={() => {
                  if (!Number(amount) || Number(amount) <= 0) {
                    Toast.show({ type: 'error', text1: 'Valid amount required' });
                    return;
                  }
                  paymentMutation.mutate();
                }}
                disabled={paymentMutation.isPending}
                className="h-14 rounded-2xl items-center justify-center flex-row gap-2 active:opacity-80"
                style={{
                  backgroundColor: paymentMutation.isPending ? '#9ca3af' : '#16a34a',
                  shadowColor: '#16a34a',
                  shadowOpacity: 0.4,
                  shadowRadius: 12,
                  elevation: 6,
                }}
              >
                <Check size={20} color="#ffffff" />
                <Text className="text-white font-extrabold text-base">
                  {paymentMutation.isPending ? 'Recording...' : 'Record Payment'}
                </Text>
              </Pressable>
            </View>
          </KeyboardAvoidingView>
        </SafeAreaView>
      </Modal>
    </SafeAreaView>
  );
}
