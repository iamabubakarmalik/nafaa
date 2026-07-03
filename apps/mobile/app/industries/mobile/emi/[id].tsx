import { useState } from 'react';
import {
  View, Text, ScrollView, Pressable, Modal, TextInput,
  KeyboardAvoidingView, Platform, Alert, RefreshControl, Linking,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { useLocalSearchParams, useRouter, Stack } from 'expo-router';
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import * as Haptics from 'expo-haptics';
import {
  ArrowLeft, CreditCard, User, Phone, X, CheckCircle2, XCircle,
  Wallet, Calendar, AlertTriangle, Clock, DollarSign, TrendingUp,
  MessageCircle, Trash2, Ban, Sparkles,
} from 'lucide-react-native';
import {
  emiApi, EMI_STATUS_LABELS, EMI_STATUS_COLORS,
  INSTALLMENT_STATUS_LABELS, INSTALLMENT_STATUS_COLORS,
} from '@/api/emi.api';
import { formatPKRFull } from '@/lib/format';
import type { PaymentMethod } from '@/api/sales.api';
import { useSmartBack } from '@/hooks/useSmartBack';
import Toast from 'react-native-toast-message';

const formatDate = (v: string) =>
  new Intl.DateTimeFormat('en-PK', { dateStyle: 'medium' }).format(new Date(v));

export default function EmiPlanDetailScreen() {
  const { id } = useLocalSearchParams<{ id: string }>();
  const router = useRouter();
  const goBack = useSmartBack();
  const queryClient = useQueryClient();

  const [showPayment, setShowPayment] = useState<string | null>(null);
  const [paymentAmount, setPaymentAmount] = useState('');
  const [paymentMethod, setPaymentMethod] = useState<PaymentMethod>('CASH');
  const [paymentNotes, setPaymentNotes] = useState('');
  const [refreshing, setRefreshing] = useState(false);

  const { data: plan, refetch } = useQuery({
    queryKey: ['emi-plan', id],
    queryFn: () => emiApi.getOne(id!),
    enabled: !!id,
  });

  const onRefresh = async () => {
    setRefreshing(true);
    await refetch();
    setRefreshing(false);
  };

  const invalidate = () => {
    queryClient.invalidateQueries({ queryKey: ['emi-plan', id] });
    queryClient.invalidateQueries({ queryKey: ['emi-plans'] });
    queryClient.invalidateQueries({ queryKey: ['emi-stats'] });
  };

  const recordPaymentMutation = useMutation({
    mutationFn: () =>
      emiApi.recordPayment(id!, showPayment!, {
        amount: Number(paymentAmount),
        paymentMethod,
        notes: paymentNotes.trim() || undefined,
      }),
    onSuccess: () => {
      Haptics.notificationAsync(Haptics.NotificationFeedbackType.Success);
      Toast.show({ type: 'success', text1: 'Payment recorded' });
      setShowPayment(null);
      setPaymentAmount('');
      setPaymentNotes('');
      invalidate();
    },
    onError: (e: any) =>
      Toast.show({ type: 'error', text1: e?.response?.data?.message || 'Failed' }),
  });

  const waiveMutation = useMutation({
    mutationFn: (installmentId: string) => emiApi.waiveInstallment(id!, installmentId),
    onSuccess: () => {
      Toast.show({ type: 'success', text1: 'Installment waived' });
      invalidate();
    },
  });

  const cancelMutation = useMutation({
    mutationFn: (reason?: string) => emiApi.cancel(id!, reason),
    onSuccess: () => {
      Toast.show({ type: 'success', text1: 'Plan cancelled' });
      invalidate();
    },
  });

  const defaultMutation = useMutation({
    mutationFn: (reason?: string) => emiApi.markDefaulted(id!, reason),
    onSuccess: () => {
      Toast.show({ type: 'success', text1: 'Marked defaulted' });
      invalidate();
    },
  });

  const removeMutation = useMutation({
    mutationFn: () => emiApi.remove(id!),
    onSuccess: () => {
      Toast.show({ type: 'success', text1: 'Deleted' });
      router.replace('/industries/mobile/emi' as any);
    },
  });

  if (!plan) {
    return (
      <SafeAreaView className="flex-1 bg-neutral-50 items-center justify-center">
        <Stack.Screen options={{ headerShown: false }} />
        <CreditCard size={36} color="#9ca3af" />
        <Text className="mt-3 text-neutral-500">Loading...</Text>
      </SafeAreaView>
    );
  }

  const cfg = EMI_STATUS_COLORS[plan.status];
  const paidPercent = plan.financedAmount > 0 ? (plan.paidAmount / plan.financedAmount) * 100 : 0;

  const handleWhatsAppReminder = (installment: any) => {
    if (!plan.customerPhone) {
      Toast.show({ type: 'error', text1: 'Phone nahi hai' });
      return;
    }
    const phone = plan.customerPhone.replace(/[^0-9]/g, '');
    const msg = `As-salam-o-alaikum ${plan.customerName} bhai,\n\n` +
      `EMI Plan *${plan.planNumber}* ki installment #${installment.installmentNumber} due hai:\n\n` +
      `Amount: *${formatPKRFull(installment.amount)}*\n` +
      `Due Date: ${formatDate(installment.dueDate)}\n\n` +
      `Please jaldi pay karein.\n\nShukriya! 🙏`;
    Linking.openURL(`whatsapp://send?phone=${phone}&text=${encodeURIComponent(msg)}`).catch(() =>
      Linking.openURL(`https://wa.me/${phone}?text=${encodeURIComponent(msg)}`)
    );
  };

  return (
    <SafeAreaView className="flex-1 bg-neutral-50 dark:bg-neutral-950" edges={['top']}>
      <Stack.Screen options={{ headerShown: false }} />

      <View className="px-5 pt-4 pb-3 flex-row items-center gap-3">
        <Pressable
          onPress={() => router.canGoBack() ? goBack() : router.replace('/industries/mobile/emi' as any)}
          hitSlop={12}
          className="h-10 w-10 rounded-2xl bg-white items-center justify-center border border-neutral-200"
        >
          <ArrowLeft size={20} color="#7c3aed" />
        </Pressable>
        <View className="flex-1">
          <Text className="text-xs text-neutral-500">EMI Plan</Text>
          <Text className="text-lg font-extrabold text-neutral-900 dark:text-white font-mono">
            {plan.planNumber}
          </Text>
        </View>
      </View>

      <ScrollView
        contentContainerStyle={{ paddingBottom: 120 }}
        refreshControl={<RefreshControl refreshing={refreshing} onRefresh={onRefresh} tintColor="#7c3aed" />}
        showsVerticalScrollIndicator={false}
      >
        {/* Hero */}
        <View className="mx-5 rounded-3xl p-5 mb-4" style={{ backgroundColor: cfg.text }}>
          <View className="flex-row items-center gap-3">
            <View className="h-14 w-14 rounded-2xl bg-white/20 items-center justify-center">
              <CreditCard size={28} color="#ffffff" />
            </View>
            <View className="flex-1">
              <Text className="text-[10px] uppercase tracking-wider text-white/80 font-extrabold">
                Status
              </Text>
              <Text className="text-white text-2xl font-extrabold mt-0.5">
                {EMI_STATUS_LABELS[plan.status]}
              </Text>
              <Text className="text-white/80 text-xs mt-0.5">
                Started {formatDate(plan.startDate)}
              </Text>
            </View>
          </View>
          <View className="mt-4 pt-4 border-t border-white/20">
            <View className="flex-row justify-between mb-1">
              <Text className="text-[10px] font-extrabold uppercase text-white/70">
                Paid: {paidPercent.toFixed(0)}%
              </Text>
              <Text className="text-[10px] font-extrabold uppercase text-white/70">
                {plan.paidInstallmentCount} / {plan.installmentCount} installments
              </Text>
            </View>
            <View className="bg-white/20 rounded-full h-2 overflow-hidden">
              <View
                className="h-full rounded-full bg-white"
                style={{ width: `${paidPercent}%` }}
              />
            </View>
          </View>
        </View>

        {/* Customer */}
        <View className="mx-5 rounded-2xl bg-white border border-neutral-200 p-4 mb-3">
          <Text className="text-[10px] uppercase font-extrabold text-neutral-500 tracking-wider mb-2">
            Customer
          </Text>
          <View className="flex-row items-center gap-3">
            <View className="h-11 w-11 rounded-2xl bg-violet-100 items-center justify-center">
              <User size={18} color="#7c3aed" />
            </View>
            <View className="flex-1">
              <Text className="text-sm font-extrabold text-neutral-900">{plan.customerName}</Text>
              {plan.customerPhone && (
                <View className="flex-row items-center gap-1 mt-0.5">
                  <Phone size={10} color="#64748b" />
                  <Text className="text-xs text-neutral-500">{plan.customerPhone}</Text>
                </View>
              )}
              {plan.customer?.cnic && (
                <Text className="text-[10px] text-neutral-500 font-mono mt-0.5">
                  CNIC: {plan.customer.cnic}
                </Text>
              )}
            </View>
          </View>
        </View>

        {/* Financials */}
        <View className="mx-5 rounded-2xl bg-white border border-neutral-200 p-4 mb-3">
          <Text className="text-[10px] uppercase font-extrabold text-neutral-500 tracking-wider mb-3">
            Financial Summary
          </Text>
          <View className="gap-1.5">
            <View className="flex-row justify-between">
              <Text className="text-xs text-neutral-500">Total Amount</Text>
              <Text className="text-xs font-bold text-neutral-800">{formatPKRFull(plan.totalAmount)}</Text>
            </View>
            <View className="flex-row justify-between">
              <Text className="text-xs text-neutral-500">Down Payment</Text>
              <Text className="text-xs font-bold text-neutral-800">{formatPKRFull(plan.downPayment)}</Text>
            </View>
            <View className="flex-row justify-between pt-2 mt-1 border-t border-neutral-100">
              <Text className="text-sm font-bold text-neutral-700">Financed</Text>
              <Text className="text-sm font-extrabold text-blue-700">{formatPKRFull(plan.financedAmount)}</Text>
            </View>
            <View className="flex-row justify-between">
              <Text className="text-sm text-emerald-700 font-bold">Paid</Text>
              <Text className="text-sm font-extrabold text-emerald-700">{formatPKRFull(plan.paidAmount)}</Text>
            </View>
            <View className="rounded-xl bg-amber-50 border border-amber-300 p-2.5 mt-1 flex-row justify-between">
              <Text className="text-xs font-extrabold text-amber-800 uppercase">Remaining</Text>
              <Text className="text-lg font-extrabold text-amber-700">{formatPKRFull(plan.remainingAmount)}</Text>
            </View>
            <View className="flex-row justify-between mt-2">
              <Text className="text-xs text-neutral-500">Installment</Text>
              <Text className="text-xs font-bold text-neutral-800">
                {formatPKRFull(plan.installmentAmount)} × {plan.installmentCount}
              </Text>
            </View>
            {plan.overdueCount > 0 && (
              <View className="rounded-xl bg-rose-50 border-2 border-rose-300 p-2.5 mt-1 flex-row justify-between">
                <View className="flex-row items-center gap-1">
                  <AlertTriangle size={12} color="#dc2626" />
                  <Text className="text-xs font-extrabold text-rose-700 uppercase">
                    Overdue ({plan.overdueCount})
                  </Text>
                </View>
                <Text className="text-sm font-extrabold text-rose-700">{formatPKRFull(plan.overdueAmount)}</Text>
              </View>
            )}
          </View>
        </View>

        {/* Installments */}
        <View className="mx-5 rounded-2xl bg-white border border-neutral-200 overflow-hidden mb-3">
          <View className="px-4 py-3 border-b border-neutral-100 flex-row items-center gap-2">
            <Calendar size={14} color="#7c3aed" />
            <Text className="text-xs font-extrabold uppercase tracking-wider text-neutral-700">
              Installments ({plan.installments.length})
            </Text>
          </View>
          {plan.installments.map((inst, idx) => {
            const icfg = INSTALLMENT_STATUS_COLORS[inst.status];
            const isOverdue = inst.status === 'OVERDUE';
            const isPending = inst.status === 'PENDING';
            return (
              <View
                key={inst.id}
                className={`p-3 ${idx !== plan.installments.length - 1 ? 'border-b border-neutral-100' : ''}`}
                style={{ backgroundColor: isOverdue ? '#fef2f2' : undefined }}
              >
                <View className="flex-row items-center gap-3">
                  <View
                    className="h-11 w-11 rounded-2xl items-center justify-center"
                    style={{ backgroundColor: icfg.bg }}
                  >
                    <Text className="text-lg font-extrabold" style={{ color: icfg.text }}>
                      #{inst.installmentNumber}
                    </Text>
                  </View>
                  <View className="flex-1">
                    <View className="flex-row items-center gap-1.5 flex-wrap">
                      <Text className="text-sm font-extrabold text-neutral-900">
                        {formatPKRFull(inst.amount)}
                      </Text>
                      <View className="px-1.5 py-0.5 rounded" style={{ backgroundColor: icfg.bg }}>
                        <Text className="text-[9px] font-extrabold" style={{ color: icfg.text }}>
                          {INSTALLMENT_STATUS_LABELS[inst.status]}
                        </Text>
                      </View>
                    </View>
                    <View className="flex-row items-center gap-1 mt-0.5">
                      <Calendar size={10} color="#64748b" />
                      <Text className="text-[10px] text-neutral-500">
                        Due: {formatDate(inst.dueDate)}
                      </Text>
                    </View>
                    {inst.paidDate && (
                      <View className="flex-row items-center gap-1 mt-0.5">
                        <CheckCircle2 size={10} color="#16a34a" />
                        <Text className="text-[10px] text-emerald-700 font-bold">
                          Paid: {formatDate(inst.paidDate)} • {formatPKRFull(inst.paidAmount)}
                        </Text>
                      </View>
                    )}
                  </View>
                  {(isPending || isOverdue) && plan.status === 'ACTIVE' && (
                    <View className="gap-1">
                      <Pressable
                        onPress={() => {
                          setPaymentAmount(String(inst.amount - inst.paidAmount));
                          setShowPayment(inst.id);
                        }}
                        className="h-8 px-3 rounded-lg items-center justify-center flex-row gap-1"
                        style={{ backgroundColor: '#16a34a' }}
                      >
                        <Wallet size={11} color="#ffffff" />
                        <Text className="text-white font-bold text-[10px]">Pay</Text>
                      </Pressable>
                      {isOverdue && plan.customerPhone && (
                        <Pressable
                          onPress={() => handleWhatsAppReminder(inst)}
                          className="h-8 px-3 rounded-lg items-center justify-center flex-row gap-1"
                          style={{ backgroundColor: '#25D366' }}
                        >
                          <MessageCircle size={11} color="#ffffff" />
                          <Text className="text-white font-bold text-[10px]">Remind</Text>
                        </Pressable>
                      )}
                    </View>
                  )}
                </View>
              </View>
            );
          })}
        </View>
      </ScrollView>

      {/* Bottom Actions */}
      {plan.status === 'ACTIVE' && (
        <View className="absolute left-0 right-0 bottom-0 bg-white border-t border-neutral-200 px-5 py-3">
          <View className="flex-row gap-2">
            <Pressable
              onPress={() => {
                Alert.prompt('Cancel Plan?', 'Reason:', [
                  { text: 'Back', style: 'cancel' },
                  { text: 'Cancel Plan', style: 'destructive', onPress: (r?: string) => cancelMutation.mutate(r) },
                ], 'plain-text');
              }}
              className="flex-1 h-12 rounded-xl border-2 border-rose-300 flex-row items-center justify-center gap-1.5"
            >
              <XCircle size={16} color="#dc2626" />
              <Text className="text-rose-700 font-bold text-sm">Cancel</Text>
            </Pressable>
            <Pressable
              onPress={() => {
                Alert.prompt('Mark Defaulted?', 'Reason:', [
                  { text: 'Back', style: 'cancel' },
                  { text: 'Default', style: 'destructive', onPress: (r?: string) => defaultMutation.mutate(r) },
                ], 'plain-text');
              }}
              className="flex-1 h-12 rounded-xl bg-rose-50 border-2 border-rose-300 flex-row items-center justify-center gap-1.5"
            >
              <Ban size={16} color="#dc2626" />
              <Text className="text-rose-700 font-bold text-sm">Default</Text>
            </Pressable>
          </View>
        </View>
      )}

      {/* Payment Modal */}
      <Modal visible={!!showPayment} animationType="slide" presentationStyle="formSheet" onRequestClose={() => setShowPayment(null)}>
        <SafeAreaView className="flex-1 bg-neutral-50">
          <KeyboardAvoidingView behavior={Platform.OS === 'ios' ? 'padding' : 'height'} className="flex-1">
            <View className="px-5 py-4 border-b border-neutral-200 flex-row items-center gap-3">
              <View className="h-11 w-11 rounded-2xl bg-emerald-600 items-center justify-center">
                <Wallet size={20} color="#ffffff" />
              </View>
              <Text className="flex-1 text-lg font-bold text-neutral-900">Record Installment Payment</Text>
              <Pressable onPress={() => setShowPayment(null)} hitSlop={12} className="h-10 w-10 rounded-2xl bg-neutral-100 items-center justify-center">
                <X size={20} color="#6b7280" />
              </Pressable>
            </View>
            <ScrollView contentContainerStyle={{ padding: 20 }}>
              <Text className="text-xs uppercase font-extrabold text-neutral-500 mb-1.5">Amount</Text>
              <TextInput
                value={paymentAmount}
                onChangeText={setPaymentAmount}
                keyboardType="decimal-pad"
                autoFocus
                className="h-16 rounded-2xl border-2 border-emerald-200 bg-white px-4 text-3xl font-extrabold text-neutral-900 mb-3"
              />
              <Text className="text-xs uppercase font-extrabold text-neutral-500 mb-1.5">Method</Text>
              <View className="flex-row flex-wrap -m-1 mb-3">
                {(['CASH', 'CARD', 'JAZZCASH', 'EASYPAISA', 'BANK_TRANSFER'] as PaymentMethod[]).map((m) => (
                  <View key={m} className="w-1/3 p-1">
                    <Pressable
                      onPress={() => setPaymentMethod(m)}
                      className="h-12 rounded-xl items-center justify-center border-2"
                      style={{
                        backgroundColor: paymentMethod === m ? '#16a34a' : '#ffffff',
                        borderColor: paymentMethod === m ? '#16a34a' : '#e5e7eb',
                      }}
                    >
                      <Text className="text-xs font-bold" style={{ color: paymentMethod === m ? '#ffffff' : '#374151' }}>
                        {m}
                      </Text>
                    </Pressable>
                  </View>
                ))}
              </View>
              <Text className="text-xs uppercase font-extrabold text-neutral-500 mb-1.5">Notes</Text>
              <TextInput
                value={paymentNotes}
                onChangeText={setPaymentNotes}
                placeholder="Optional"
                placeholderTextColor="#9ca3af"
                className="h-12 rounded-xl border-2 border-neutral-200 bg-white px-3 text-sm font-bold text-neutral-900"
              />
            </ScrollView>
            <View className="px-5 py-4 border-t border-neutral-200">
              <Pressable
                onPress={() => recordPaymentMutation.mutate()}
                disabled={recordPaymentMutation.isPending || !(Number(paymentAmount) > 0)}
                className="h-14 rounded-2xl items-center justify-center flex-row gap-2"
                style={{ backgroundColor: recordPaymentMutation.isPending ? '#9ca3af' : '#16a34a' }}
              >
                <CheckCircle2 size={20} color="#ffffff" />
                <Text className="text-white font-extrabold text-base">
                  {recordPaymentMutation.isPending ? 'Recording...' : 'Record Payment'}
                </Text>
              </Pressable>
            </View>
          </KeyboardAvoidingView>
        </SafeAreaView>
      </Modal>
    </SafeAreaView>
  );
}
