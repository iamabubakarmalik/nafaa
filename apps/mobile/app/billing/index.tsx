import { useState } from 'react';
import {
  View, Text, ScrollView, Pressable, RefreshControl, Linking,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { useRouter, Stack } from 'expo-router';
import { useQuery } from '@tanstack/react-query';
import {
  ArrowLeft, CreditCard, FileText, Clock, CheckCircle2, XCircle,
  AlertCircle, Sparkles, ArrowRight, Receipt, ChevronRight, Crown,
} from 'lucide-react-native';
import { Card } from '@/components/ui/Card';
import { Badge } from '@/components/ui/Badge';
import { Button } from '@/components/ui/Button';
import { subscriptionsApi } from '@/api/subscriptions.api';
import { billingApi, type InvoiceStatus, type PaymentStatus } from '@/api/billing.api';
import { formatPKRFull, formatRelative } from '@/lib/format';

import { useTranslation } from '@/i18n/useTranslation';
const formatDate = (v: string) =>
  new Intl.DateTimeFormat('en-PK', { dateStyle: 'medium' }).format(new Date(v));

const invoiceStatusVariant: Record<InvoiceStatus, any> = {
  DRAFT: 'neutral', PENDING: 'warning', PAID: 'success',
  OVERDUE: 'danger', CANCELLED: 'neutral', REFUNDED: 'info',
};

const paymentStatusConfig: Record<PaymentStatus, { variant: any; icon: any; label: string }> = {
  PENDING: { variant: 'warning', icon: Clock, label: 'Pending Approval' },
  APPROVED: { variant: 'success', icon: CheckCircle2, label: 'Approved' },
  REJECTED: { variant: 'danger', icon: XCircle, label: 'Rejected' },
  REFUNDED: { variant: 'info', icon: AlertCircle, label: 'Refunded' },
};

export default function BillingScreen() {
  const { t } = useTranslation();
  const router = useRouter();
  const [refreshing, setRefreshing] = useState(false);

  const { data: current, refetch: refetchCurrent } = useQuery({
    queryKey: ['subscription-current'],
    queryFn: subscriptionsApi.current,
  });

  const { data: invoices = [], refetch: refetchInvoices } = useQuery({
    queryKey: ['billing-invoices'],
    queryFn: billingApi.invoices,
  });

  const { data: payments = [], refetch: refetchPayments } = useQuery({
    queryKey: ['billing-payments'],
    queryFn: billingApi.payments,
  });

  const onRefresh = async () => {
    setRefreshing(true);
    await Promise.all([refetchCurrent(), refetchInvoices(), refetchPayments()]);
    setRefreshing(false);
  };

  const pendingInvoices = invoices.filter(
    (i) => i.status === 'PENDING' || i.status === 'OVERDUE',
  );

  return (
    <SafeAreaView className="flex-1 bg-neutral-50 dark:bg-neutral-950" edges={['top']}>
      <Stack.Screen options={{ headerShown: false }} />

      <View className="px-5 pt-4 pb-3 flex-row items-center gap-3">
        <Pressable
          onPress={() => router.back()}
          hitSlop={12}
          className="h-10 w-10 rounded-2xl bg-white dark:bg-neutral-900 items-center justify-center border border-neutral-200 dark:border-neutral-800"
        >
          <ArrowLeft size={20} color="#16a34a" />
        </Pressable>
        <View className="flex-1">
          <Text className="text-2xl font-bold text-neutral-900 dark:text-white">{t('auto.index.billing')}</Text>
          <Text className="text-xs text-neutral-500">{t('auto.index.plans_invoices_payments')}</Text>
        </View>
      </View>

      <ScrollView
        contentContainerStyle={{ paddingBottom: 40 }}
        refreshControl={<RefreshControl refreshing={refreshing} onRefresh={onRefresh} tintColor="#16a34a" />}
        showsVerticalScrollIndicator={false}
      >
        {/* Current subscription */}
        <View className="px-5 mb-4">
          <View
            className="rounded-3xl p-5 overflow-hidden"
            style={{ backgroundColor: '#16a34a' }}
          >
            <View className="flex-row items-start justify-between">
              <View className="flex-1">
                <View className="flex-row items-center gap-1.5">
                  <Crown size={14} color="#fbbf24" fill="#fbbf24" />
                  <Text className="text-xs font-bold uppercase tracking-wider text-white/80">{t('auto.index.current_plan')}</Text>
                </View>
                <Text className="text-2xl font-bold text-white mt-1">
                  {current?.plan?.name || 'Free Trial'}
                </Text>
                {current && (
                  <>
                    <View className="flex-row items-center gap-2 mt-2">
                      <View className="px-2 py-0.5 rounded-full bg-white/20">
                        <Text className="text-[10px] font-bold text-white">
                          {current.status}
                        </Text>
                      </View>
                      <Text className="text-xs text-white/80">
                        {formatPKRFull(current.amount)} / {current.interval.toLowerCase()}
                      </Text>
                    </View>
                    <Text className="text-xs text-white/70 mt-1">
                      Expires: {formatDate(current.currentPeriodEnd)}
                    </Text>
                  </>
                )}
              </View>
              <View className="h-14 w-14 rounded-2xl bg-white/20 items-center justify-center">
                <Sparkles size={28} color="#ffffff" />
              </View>
            </View>

            <Pressable
              onPress={() => router.push('/plan')}
              className="mt-4 flex-row items-center justify-center gap-2 py-3 rounded-2xl bg-white"
            >
              <Sparkles size={16} color="#16a34a" />
              <Text className="text-emerald-700 font-bold">{t('auto.index.upgrade_change_plan')}</Text>
              <ArrowRight size={16} color="#16a34a" />
            </Pressable>
          </View>
        </View>

        {/* Trial warning */}
        {current?.status === 'TRIAL' && current.trialEndsAt && (
          <View className="px-5 mb-3">
            <Card variant="outline" className="bg-amber-50 dark:bg-amber-950/40 border-amber-300 p-4 flex-row items-start gap-3">
              <AlertCircle size={20} color="#f59e0b" />
              <View className="flex-1">
                <Text className="font-bold text-amber-900 dark:text-amber-200">{t('auto.index.trial_khatam_ho_raha_hai')}</Text>
                <Text className="text-xs text-amber-800 dark:text-amber-300 mt-1">
                  Trial {formatDate(current.trialEndsAt)} ko expire — upgrade karein.
                </Text>
              </View>
            </Card>
          </View>
        )}

        {/* Pending invoices alert */}
        {pendingInvoices.length > 0 && (
          <View className="px-5 mb-4">
            <Card variant="outline" className="bg-amber-50 dark:bg-amber-950/40 border-2 border-amber-300 p-4">
              <View className="flex-row items-start gap-2 mb-3">
                <AlertCircle size={20} color="#b45309" />
                <View className="flex-1">
                  <Text className="font-bold text-amber-900 dark:text-amber-200">
                    {pendingInvoices.length} Invoice Pending
                  </Text>
                  <Text className="text-xs text-amber-800 dark:text-amber-300 mt-0.5">{t('auto.index.service_active_rakhne_ke_liye_pay_karein')}</Text>
                </View>
              </View>
              <View className="gap-2">
                {pendingInvoices.map((inv) => (
                  <Pressable
                    key={inv.id}
                    onPress={() => router.push(`/billing/invoice/${inv.id}`)}
                    className="bg-white dark:bg-neutral-900 rounded-xl p-3 flex-row items-center justify-between active:opacity-70"
                  >
                    <View>
                      <Text className="font-bold text-neutral-900 dark:text-white">
                        {inv.invoiceNumber}
                      </Text>
                      <Text className="text-xs text-neutral-500">
                        Due: {formatDate(inv.dueDate)}
                      </Text>
                    </View>
                    <View className="items-end">
                      <Text className="font-bold text-amber-700">
                        {formatPKRFull(inv.amountDue)}
                      </Text>
                      <Text className="text-[10px] text-amber-600 font-bold">{t('auto.index.pay_now')}</Text>
                    </View>
                  </Pressable>
                ))}
              </View>
            </Card>
          </View>
        )}

        {/* Invoices */}
        <View className="px-5 mb-4">
          <View className="flex-row items-center justify-between mb-2">
            <View className="flex-row items-center gap-2">
              <Receipt size={16} color="#16a34a" />
              <Text className="font-bold text-neutral-900 dark:text-white">{t('auto.index.invoices')}</Text>
            </View>
            <Text className="text-xs text-neutral-500">{invoices.length} total</Text>
          </View>

          {invoices.length === 0 ? (
            <Card variant="outline" className="p-6 items-center">
              <Receipt size={32} color="#d1d5db" />
              <Text className="mt-2 text-sm text-neutral-500">{t('auto.index.no_invoices_yet')}</Text>
            </Card>
          ) : (
            <View className="gap-2">
              {invoices.slice(0, 10).map((inv) => (
                <Pressable
                  key={inv.id}
                  onPress={() => router.push(`/billing/invoice/${inv.id}`)}
                  className="active:opacity-70"
                >
                  <Card variant="outline" className="p-3">
                    <View className="flex-row items-center gap-3">
                      <View className="flex-1 min-w-0">
                        <View className="flex-row items-center gap-2">
                          <Text className="font-bold text-neutral-900 dark:text-white">
                            {inv.invoiceNumber}
                          </Text>
                          <Badge variant={invoiceStatusVariant[inv.status]} size="sm">
                            {inv.status}
                          </Badge>
                        </View>
                        <Text className="text-xs text-neutral-500 mt-0.5" numberOfLines={1}>
                          {inv.subscription?.plan.name || inv.description}
                        </Text>
                        <Text className="text-[10px] text-neutral-400 mt-0.5">
                          {formatRelative(inv.createdAt)}
                        </Text>
                      </View>
                      <View className="items-end">
                        <Text className="font-bold text-neutral-900 dark:text-white">
                          {formatPKRFull(inv.total)}
                        </Text>
                        {inv.amountDue > 0 && (
                          <Text className="text-[10px] text-rose-600 font-bold">
                            Due: {formatPKRFull(inv.amountDue)}
                          </Text>
                        )}
                      </View>
                      <ChevronRight size={18} color="#9ca3af" />
                    </View>
                  </Card>
                </Pressable>
              ))}
            </View>
          )}
        </View>

        {/* Payments */}
        <View className="px-5 mb-4">
          <View className="flex-row items-center justify-between mb-2">
            <View className="flex-row items-center gap-2">
              <FileText size={16} color="#2563eb" />
              <Text className="font-bold text-neutral-900 dark:text-white">{t('auto.index.payments')}</Text>
            </View>
            <Text className="text-xs text-neutral-500">{payments.length} total</Text>
          </View>

          {payments.length === 0 ? (
            <Card variant="outline" className="p-6 items-center">
              <FileText size={32} color="#d1d5db" />
              <Text className="mt-2 text-sm text-neutral-500">{t('auto.index.no_payments_yet')}</Text>
            </Card>
          ) : (
            <View className="gap-2">
              {payments.slice(0, 10).map((p) => {
                const cfg = paymentStatusConfig[p.status];
                const Icon = cfg.icon;
                return (
                  <Card key={p.id} variant="outline" className="p-3">
                    <View className="flex-row items-start gap-3">
                      <View className="flex-1 min-w-0">
                        <View className="flex-row items-center gap-2">
                          <Text className="font-bold text-neutral-900 dark:text-white">
                            {formatPKRFull(p.amount)}
                          </Text>
                          <View className="px-2 py-0.5 rounded-full bg-neutral-100 dark:bg-neutral-800">
                            <Text className="text-[10px] font-bold text-neutral-700 dark:text-neutral-300">
                              {p.provider}
                            </Text>
                          </View>
                        </View>
                        <Text className="text-xs text-neutral-500 mt-0.5">
                          {formatRelative(p.createdAt)}
                          {p.invoice?.invoiceNumber && ` • ${p.invoice.invoiceNumber}`}
                        </Text>
                        {p.rejectionReason && (
                          <Text className="text-xs text-rose-700 mt-1">
                            ✗ {p.rejectionReason}
                          </Text>
                        )}
                        {p.upload?.url && (
                          <Pressable onPress={() => Linking.openURL(p.upload!.url)}>
                            <Text className="text-xs text-blue-600 mt-1 font-bold">{t('auto.index.view_receipt')}</Text>
                          </Pressable>
                        )}
                      </View>
                      <View className="flex-row items-center gap-1">
                        <Icon size={14} color={
                          p.status === 'APPROVED' ? '#16a34a' :
                          p.status === 'PENDING' ? '#f59e0b' :
                          p.status === 'REJECTED' ? '#dc2626' : '#2563eb'
                        } />
                        <Text className={`text-[10px] font-bold ${
                          p.status === 'APPROVED' ? 'text-emerald-700' :
                          p.status === 'PENDING' ? 'text-amber-700' :
                          p.status === 'REJECTED' ? 'text-rose-700' : 'text-blue-700'
                        }`}>
                          {cfg.label}
                        </Text>
                      </View>
                    </View>
                  </Card>
                );
              })}
            </View>
          )}
        </View>
      </ScrollView>
    </SafeAreaView>
  );
}
