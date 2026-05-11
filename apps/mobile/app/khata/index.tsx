import { useState } from 'react';
import {
  View, Text, ScrollView, Pressable, RefreshControl, Modal,
  KeyboardAvoidingView, Platform,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { useRouter, Stack } from 'expo-router';
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import {
  ArrowLeft, BookOpen, Wallet, Users, AlertTriangle, Phone, ChevronRight,
  X, Save, ArrowDownToLine,
} from 'lucide-react-native';
import { Card } from '@/components/ui/Card';
import { Button } from '@/components/ui/Button';
import { Input } from '@/components/ui/Input';
import { customerLedgerApi } from '@/api/customer-ledger.api';
import { formatPKRFull } from '@/lib/format';
import Toast from 'react-native-toast-message';

import { useTranslation } from '@/i18n/useTranslation';
export default function KhataScreen() {
  const { t } = useTranslation();
  const router = useRouter();
  const queryClient = useQueryClient();
  const [refreshing, setRefreshing] = useState(false);
  const [paymentModal, setPaymentModal] = useState<{ id: string; name: string; balance: number } | null>(null);
  const [paymentAmount, setPaymentAmount] = useState('');
  const [paymentNote, setPaymentNote] = useState('');

  const { data: summary, refetch } = useQuery({
    queryKey: ['khata-summary'],
    queryFn: customerLedgerApi.summary,
  });

  const paymentMutation = useMutation({
    mutationFn: ({ customerId, payload }: any) =>
      customerLedgerApi.receivePayment(customerId, payload),
    onSuccess: () => {
      Toast.show({ type: 'success', text1: 'Payment receive ho gaya' });
      queryClient.invalidateQueries({ queryKey: ['khata-summary'] });
      queryClient.invalidateQueries({ queryKey: ['customers'] });
      setPaymentModal(null);
      setPaymentAmount('');
      setPaymentNote('');
    },
    onError: (e: any) =>
      Toast.show({ type: 'error', text1: e?.response?.data?.message || 'Fail ho gaya' }),
  });

  const onRefresh = async () => {
    setRefreshing(true);
    await refetch();
    setRefreshing(false);
  };

  const handleReceivePayment = () => {
    if (!paymentModal) return;
    const amount = Number(paymentAmount);
    if (!amount || amount <= 0) {
      return Toast.show({ type: 'error', text1: 'Sahi amount darj karein' });
    }
    if (amount > paymentModal.balance) {
      return Toast.show({ type: 'error', text1: `Khata sirf ${paymentModal.balance} hai` });
    }
    paymentMutation.mutate({
      customerId: paymentModal.id,
      payload: { amount, note: paymentNote.trim() || undefined },
    });
  };

  return (
    <SafeAreaView className="flex-1 bg-neutral-50 dark:bg-neutral-950" edges={['top']}>
      <Stack.Screen options={{ headerShown: false }} />

      <View className="px-5 pt-4 pb-3 flex-row items-center gap-3">
        <Pressable
          onPress={() => router.back()}
          hitSlop={12}
          className="h-10 w-10 rounded-2xl bg-white dark:bg-neutral-900 items-center justify-center border border-neutral-200 dark:border-neutral-800"
        >
          <ArrowLeft size={20} color="#dc2626" />
        </Pressable>
        <View className="flex-1">
          <Text className="text-2xl font-bold text-neutral-900 dark:text-white">{t('auto.index.khata_book')}</Text>
          <Text className="text-xs text-neutral-500">{t('auto.index.customers_ka_udhaar')}</Text>
        </View>
      </View>

      <ScrollView
        contentContainerStyle={{ paddingBottom: 80 }}
        refreshControl={
          <RefreshControl refreshing={refreshing} onRefresh={onRefresh} tintColor="#dc2626" />
        }
        showsVerticalScrollIndicator={false}
      >
        {/* Hero */}
        <View className="px-5">
          <View className="rounded-3xl overflow-hidden p-5" style={{ backgroundColor: '#7f1d1d' }}>
            <View className="flex-row items-center gap-3">
              <View className="h-14 w-14 rounded-2xl bg-white/20 items-center justify-center">
                <BookOpen size={28} color="#ffffff" />
              </View>
              <View className="flex-1">
                <Text className="text-xs text-white/80 font-bold uppercase tracking-wider">{t('auto.index.total_outstanding')}</Text>
                <Text className="text-3xl font-bold text-white">
                  {formatPKRFull(summary?.totalOutstanding ?? 0)}
                </Text>
              </View>
            </View>
            <View className="flex-row gap-3 mt-4">
              <View className="flex-1 bg-white/10 rounded-xl p-3">
                <Text className="text-[10px] font-bold uppercase tracking-wider text-white/70">{t('auto.index.with_khata')}</Text>
                <Text className="text-xl font-bold text-white">
                  {summary?.customersWithCredit ?? 0}
                </Text>
              </View>
              <View className="flex-1 bg-white/10 rounded-xl p-3">
                <Text className="text-[10px] font-bold uppercase tracking-wider text-white/70">{t('auto.index.total_customers')}</Text>
                <Text className="text-xl font-bold text-white">
                  {summary?.totalCustomers ?? 0}
                </Text>
              </View>
            </View>
          </View>
        </View>

        {/* Top Debtors */}
        <View className="px-5 mt-5">
          <View className="flex-row items-center gap-2 mb-3">
            <AlertTriangle size={16} color="#dc2626" />
            <Text className="font-bold text-neutral-900 dark:text-white">{t('auto.index.top_debtors')}</Text>
          </View>

          {!summary?.topDebtors || summary.topDebtors.length === 0 ? (
            <Card variant="outline" className="p-8 items-center">
              <View className="h-16 w-16 rounded-3xl bg-emerald-100 dark:bg-emerald-950/40 items-center justify-center">
                <Wallet size={28} color="#16a34a" />
              </View>
              <Text className="mt-4 text-base font-bold text-emerald-700 dark:text-emerald-400">{t('auto.index.mubarak_ho')}</Text>
              <Text className="text-sm text-neutral-500 text-center mt-1">{t('auto.index.koi_customer_udhaar_mein_nahi_hai')}</Text>
            </Card>
          ) : (
            <View className="gap-2">
              {summary.topDebtors.map((d, idx) => (
                <Card key={d.id} variant="outline" className="p-3">
                  <View className="flex-row items-center gap-3">
                    <View
                      className={`h-12 w-12 rounded-2xl items-center justify-center ${
                        idx === 0
                          ? 'bg-rose-500'
                          : idx === 1
                          ? 'bg-orange-500'
                          : idx === 2
                          ? 'bg-amber-500'
                          : 'bg-neutral-200 dark:bg-neutral-800'
                      }`}
                    >
                      <Text className={`text-base font-bold ${idx < 3 ? 'text-white' : 'text-neutral-700'}`}>
                        #{idx + 1}
                      </Text>
                    </View>

                    <Pressable
                      className="flex-1 min-w-0"
                      onPress={() => router.push(`/customers/${d.id}`)}
                    >
                      <Text className="font-bold text-neutral-900 dark:text-white" numberOfLines={1}>
                        {d.name}
                      </Text>
                      {d.phone && (
                        <View className="flex-row items-center gap-1 mt-0.5">
                          <Phone size={10} color="#9ca3af" />
                          <Text className="text-xs text-neutral-500">{d.phone}</Text>
                        </View>
                      )}
                      <View className="flex-row items-center gap-2 mt-1">
                        <Text className="text-base font-bold text-rose-700 dark:text-rose-400">
                          {formatPKRFull(d.balance)}
                        </Text>
                        {d.creditLimit > 0 && d.balance >= d.creditLimit && (
                          <View className="px-1.5 py-0.5 rounded bg-rose-100 dark:bg-rose-950/40">
                            <Text className="text-[9px] font-bold text-rose-700 dark:text-rose-400">{t('auto.index.limit_exceeded')}</Text>
                          </View>
                        )}
                      </View>
                    </Pressable>

                    <Pressable
                      onPress={() => setPaymentModal({ id: d.id, name: d.name, balance: d.balance })}
                      className="h-10 px-3 rounded-xl bg-emerald-600 items-center justify-center flex-row gap-1"
                    >
                      <ArrowDownToLine size={14} color="#ffffff" />
                      <Text className="text-white text-xs font-bold">{t('auto.index.receive')}</Text>
                    </Pressable>
                  </View>
                </Card>
              ))}
            </View>
          )}
        </View>
      </ScrollView>

      {/* Payment Modal */}
      <Modal
        visible={!!paymentModal}
        animationType="slide"
        transparent
        onRequestClose={() => setPaymentModal(null)}
      >
        <View className="flex-1 bg-black/50 justify-end">
          <KeyboardAvoidingView behavior={Platform.OS === 'ios' ? 'padding' : 'height'}>
            <View className="bg-white dark:bg-neutral-900 rounded-t-3xl">
              <View className="flex-row items-center justify-between px-5 py-4 border-b border-neutral-200 dark:border-neutral-800">
                <Text className="text-lg font-bold text-neutral-900 dark:text-white">{t('auto.index.receive_payment')}</Text>
                <Pressable
                  onPress={() => setPaymentModal(null)}
                  className="h-9 w-9 rounded-2xl bg-neutral-100 dark:bg-neutral-800 items-center justify-center"
                >
                  <X size={18} color="#6b7280" />
                </Pressable>
              </View>

              <View className="p-5 gap-4">
                <Card variant="outline" className="bg-rose-50 dark:bg-rose-950/40 border-rose-200 dark:border-rose-900 p-4">
                  <Text className="text-xs font-bold uppercase tracking-wider text-rose-700 dark:text-rose-400">{t('auto.id.customer')}</Text>
                  <Text className="text-base font-bold text-neutral-900 dark:text-white mt-1">
                    {paymentModal?.name}
                  </Text>
                  <Text className="text-xs text-neutral-500 mt-1">{t('auto.index.total_khata')}</Text>
                  <Text className="text-2xl font-bold text-rose-700 dark:text-rose-400">
                    {formatPKRFull(paymentModal?.balance ?? 0)}
                  </Text>
                </Card>

                <Input
                  label="Amount Received (PKR) *"
                  value={paymentAmount}
                  onChangeText={setPaymentAmount}
                  placeholder="0"
                  keyboardType="numeric"
                />
                <Input
                  label="Note (optional)"
                  value={paymentNote}
                  onChangeText={setPaymentNote}
                  placeholder="Cash, JazzCash, etc."
                />

                <View className="flex-row gap-2">
                  <Pressable
                    onPress={() => paymentModal && setPaymentAmount(String(paymentModal.balance))}
                    className="flex-1 px-3 py-2 rounded-xl bg-amber-100 dark:bg-amber-950/40 items-center"
                  >
                    <Text className="text-xs font-bold text-amber-700 dark:text-amber-400">{t('auto.index.full_amount')}</Text>
                  </Pressable>
                  <Pressable
                    onPress={() => paymentModal && setPaymentAmount(String(Math.round(paymentModal.balance / 2)))}
                    className="flex-1 px-3 py-2 rounded-xl bg-blue-100 dark:bg-blue-950/40 items-center"
                  >
                    <Text className="text-xs font-bold text-blue-700 dark:text-blue-400">{t('auto.index.half')}</Text>
                  </Pressable>
                </View>

                <Button
                  size="lg"
                  loading={paymentMutation.isPending}
                  onPress={handleReceivePayment}
                  className="bg-emerald-600"
                >
                  <Save size={18} color="#ffffff" />
                  <Text className="text-white font-bold">{t('auto.index.save_payment')}</Text>
                </Button>
              </View>
            </View>
          </KeyboardAvoidingView>
        </View>
      </Modal>
    </SafeAreaView>
  );
}
