import { useState } from 'react';
import {
  View, Text, ScrollView, Pressable, RefreshControl, Linking, Alert,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { useRouter, Stack } from 'expo-router';
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import * as Haptics from 'expo-haptics';
import Toast from 'react-native-toast-message';
import {
  ArrowLeft, CreditCard, FileText, Clock, CheckCircle2, XCircle,
  AlertCircle, Sparkles, ArrowRight, Receipt, ChevronRight, Crown,
  Wrench, RefreshCw,
} from 'lucide-react-native';
import { Card } from '@/components/ui/Card';
import { Badge } from '@/components/ui/Badge';
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

const subscriptionStatusBadge: Record<string, { tone: string; label: string }> = {
  ACTIVE: { tone: 'bg-emerald-100 text-emerald-800', label: 'Active' },
  TRIAL: { tone: 'bg-blue-100 text-blue-800', label: 'Free Trial' },
  PAST_DUE: { tone: 'bg-amber-100 text-amber-800', label: 'Past Due' },
  EXPIRED: { tone: 'bg-rose-100 text-rose-800', label: 'Expired' },
  PENDING_PAYMENT: { tone: 'bg-amber-100 text-amber-800', label: 'Pending' },
  CANCELLED: { tone: 'bg-slate-100 text-slate-800', label: 'Cancelled' },
};

export default function BillingScreen() {
  const { t } = useTranslation();
  const router = useRouter();
  const queryClient = useQueryClient();
  const [refreshing, setRefreshing] = useState(false);

  const { data: current, refetch: refetchCurrent } = useQuery({
    queryKey: ['subscription-current'],
    queryFn: subscriptionsApi.current,
  });

  const { data: pendingUpgrade } = useQuery({
    queryKey: ['subscription-pending'],
    queryFn: subscriptionsApi.pendingUpgrade,
  });

  const { data: invoices = [], refetch: refetchInvoices } = useQuery({
    queryKey: ['billing-invoices'],
    queryFn: billingApi.invoices,
  });

  const { data: payments = [], refetch: refetchPayments } = useQuery({
    queryKey: ['billing-payments'],
    queryFn: billingApi.payments,
  });

  const cleanupMutation = useMutation({
    mutationFn: subscriptionsApi.cleanupPending,
    onSuccess: (data) => {
      Haptics.notificationAsync(Haptics.NotificationFeedbackType.Success);
      Toast.show({
        type: 'success',
        text1: `${data.cancelled} duplicate cancel ho gaye`,
        text2: 'Sirf latest pending rakha gaya',
      });
      queryClient.invalidateQueries({ queryKey: ['subscription-current'] });
      queryClient.invalidateQueries({ queryKey: ['subscription-pending'] });
      queryClient.invalidateQueries({ queryKey: ['billing-invoices'] });
    },
    onError: (e: any) => {
      Toast.show({
        type: 'error',
        text1: e?.response?.data?.message || 'Cleanup fail ho gaya',
      });
    },
  });

  const onRefresh = async () => {
    setRefreshing(true);
    await Promise.all([refetchCurrent(), refetchInvoices(), refetchPayments()]);
    setRefreshing(false);
  };

  const handleCleanup = () => {
    Alert.alert(
      'Cleanup Duplicates?',
      'Sirf latest pending invoice rakha jayega, baqi cancel ho jayenge. Confirm?',
      [
        { text: 'Cancel', style: 'cancel' },
        {
          text: 'Yes, Cleanup',
          style: 'destructive',
          onPress: () => cleanupMutation.mutate(),
        },
      ],
    );
  };

  const pendingInvoices = invoices.filter(
    (i) => i.status === 'PENDING' || i.status === 'OVERDUE',
  );
  const showCleanup = pendingInvoices.length > 1;

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
          <Text className="text-2xl font-bold text-neutral-900 dark:text-white">Billing</Text>
          <Text className="text-xs text-neutral-500">Plans, invoices & payments</Text>
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
            style={{
              backgroundColor: '#16a34a',
              shadowColor: '#16a34a',
              shadowOpacity: 0.25,
              shadowRadius: 14,
              shadowOffset: { width: 0, height: 6 },
              elevation: 8,
            }}
          >
            <View className="flex-row items-start justify-between">
              <View className="flex-1">
                <View className="flex-row items-center gap-1.5">
                  <Crown size={14} color="#fbbf24" fill="#fbbf24" />
                  <Text className="text-xs font-bold uppercase tracking-wider text-white/80">
                    Current Plan
                  </Text>
                </View>
                <Text className="text-2xl font-bold text-white mt-1">
                  {current?.plan?.name || 'Free Trial'}
                </Text>
                {current && (
                  <>
                    <View className="flex-row items-center gap-2 mt-2 flex-wrap">
                      <View
                        className={`px-2 py-0.5 rounded-full ${subscriptionStatusBadge[current.status]?.tone || 'bg-white/20'}`}
                      >
                        <Text className="text-[10px] font-bold">
                          {subscriptionStatusBadge[current.status]?.label || current.status}
                        </Text>
                      </View>
                      {current.amount > 0 && (
                        <Text className="text-xs text-white/80">
                          {formatPKRFull(current.amount)} / {current.interval.toLowerCase()}
                        </Text>
                      )}
                    </View>
                    <Text className="text-xs text-white/70 mt-1">
                      {current.status === 'TRIAL' && current.trialEndsAt
                        ? `Trial ends: ${formatDate(current.trialEndsAt)}`
                        : `Expires: ${formatDate(current.currentPeriodEnd)}`}
                    </Text>
                  </>
                )}
              </View>
              <View className="h-14 w-14 rounded-2xl bg-white/20 items-center justify-center">
                <Sparkles size={28} color="#ffffff" />
              </View>
            </View>

            <Pressable
              onPress={() => {
                Haptics.selectionAsync();
                router.push('/plan');
              }}
              className="mt-4 flex-row items-center justify-center gap-2 py-3 rounded-2xl bg-white active:opacity-80"
            >
              <Sparkles size={16} color="#16a34a" />
              <Text className="text-emerald-700 font-bold">
                {current?.status === 'TRIAL' ? 'Upgrade' : 'Change Plan'}
              </Text>
              <ArrowRight size={16} color="#16a34a" />
            </Pressable>
          </View>
        </View>

        {/* Trial info — soft, encouraging */}
        {current?.status === 'TRIAL' && current.trialEndsAt && (
          <View className="px-5 mb-3">
            <Card variant="outline" className="bg-blue-50 dark:bg-blue-950/40 border-blue-300 p-4 flex-row items-start gap-3">
              <Sparkles size={20} color="#2563eb" />
              <View className="flex-1">
                <Text className="font-bold text-blue-900 dark:text-blue-200">
                  Trial Active hai — Full Access
                </Text>
                <Text className="text-xs text-blue-800 dark:text-blue-300 mt-1">
                  Trial {formatDate(current.trialEndsAt)} tak chalega. Upgrade jab chahein.
                </Text>
              </View>
            </Card>
          </View>
        )}

        {/* Pending upgrade — separate from current */}
        {pendingUpgrade && pendingUpgrade.subscription?.plan && pendingUpgrade.invoice && (
          <View className="px-5 mb-3">
            <Card variant="outline" className="bg-amber-50 dark:bg-amber-950/40 border-2 border-amber-300 p-4">
              <View className="flex-row items-start gap-3">
                <View className="h-11 w-11 rounded-2xl bg-amber-500 items-center justify-center">
                  <Clock size={20} color="#ffffff" />
                </View>
                <View className="flex-1">
                  <Text className="text-[10px] font-extrabold uppercase tracking-wider text-amber-700">
                    Upgrade Pending
                  </Text>
                  <Text className="font-bold text-amber-900 dark:text-amber-200 text-lg mt-0.5">
                    {pendingUpgrade.subscription.plan.name}
                  </Text>
                  <Text className="text-xs text-amber-800 dark:text-amber-300 mt-1">
                    Payment ke baad activate ho jayega
                  </Text>

                  <Pressable
                    onPress={() => {
                      Haptics.selectionAsync();
                      router.push(`/billing/invoice/${pendingUpgrade.invoice.id}`);
                    }}
                    className="mt-3 flex-row items-center gap-2 px-4 py-2.5 rounded-xl self-start"
                    style={{ backgroundColor: '#d97706' }}
                  >
                    <CreditCard size={14} color="#ffffff" />
                    <Text className="text-white font-bold text-sm">
                      Pay {formatPKRFull(pendingUpgrade.invoice.amountDue)}
                    </Text>
                  </Pressable>
                </View>
              </View>
            </Card>
          </View>
        )}

        {/* CLEANUP BANNER — duplicates detected */}
        {showCleanup && (
          <View className="px-5 mb-4">
            <Card variant="outline" className="bg-orange-50 dark:bg-orange-950/40 border-2 border-orange-300 p-4">
              <View className="flex-row items-start gap-3">
                <View className="h-11 w-11 rounded-2xl bg-orange-500 items-center justify-center">
                  <Wrench size={20} color="#ffffff" />
                </View>
                <View className="flex-1">
                  <Text className="font-extrabold text-orange-900 dark:text-orange-200">
                    {pendingInvoices.length} Duplicate Pending Invoices
                  </Text>
                  <Text className="text-xs text-orange-800 dark:text-orange-300 mt-1">
                    Cleanup karke sirf latest rakhein
                  </Text>
                  <Pressable
                    onPress={handleCleanup}
                    disabled={cleanupMutation.isPending}
                    className="mt-3 flex-row items-center gap-2 px-4 py-2.5 rounded-xl self-start"
                    style={{ backgroundColor: '#ea580c', opacity: cleanupMutation.isPending ? 0.5 : 1 }}
                  >
                    <Wrench size={14} color="#ffffff" />
                    <Text className="text-white font-bold text-sm">
                      {cleanupMutation.isPending ? 'Cleaning...' : 'Clean Up Duplicates'}
                    </Text>
                  </Pressable>
                </View>
              </View>
            </Card>
          </View>
        )}

        {/* Pending invoices alert (when only 1 pending, no cleanup needed) */}
        {pendingInvoices.length === 1 && !pendingUpgrade && (
          <View className="px-5 mb-4">
            <Card variant="outline" className="bg-amber-50 dark:bg-amber-950/40 border-2 border-amber-300 p-4">
              <View className="flex-row items-start gap-2 mb-3">
                <AlertCircle size={20} color="#b45309" />
                <View className="flex-1">
                  <Text className="font-bold text-amber-900 dark:text-amber-200">
                    Invoice Pending
                  </Text>
                  <Text className="text-xs text-amber-800 dark:text-amber-300 mt-0.5">
                    Service active rakhne ke liye pay karein
                  </Text>
                </View>
              </View>
              {pendingInvoices.map((inv) => (
                <Pressable
                  key={inv.id}
                  onPress={() => router.push(`/billing/invoice/${inv.id}`)}
                  className="bg-white dark:bg-neutral-900 rounded-xl p-3 flex-row items-center justify-between active:opacity-70"
                >
                  <View>
                    <Text className="font-bold text-neutral-900 dark:text-white font-mono text-sm">
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
                    <Text className="text-[10px] text-amber-600 font-bold">PAY NOW</Text>
                  </View>
                </Pressable>
              ))}
            </Card>
          </View>
        )}

        {/* Invoices list */}
        <View className="px-5 mb-4">
          <View className="flex-row items-center justify-between mb-2">
            <View className="flex-row items-center gap-2">
              <Receipt size={16} color="#16a34a" />
              <Text className="font-bold text-neutral-900 dark:text-white">Invoices</Text>
            </View>
            <Text className="text-xs text-neutral-500">{invoices.length} total</Text>
          </View>

          {invoices.length === 0 ? (
            <Card variant="outline" className="p-6 items-center">
              <Receipt size={32} color="#d1d5db" />
              <Text className="mt-2 text-sm text-neutral-500">No invoices yet</Text>
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
                          <Text className="font-bold text-neutral-900 dark:text-white font-mono text-sm">
                            {inv.invoiceNumber}
                          </Text>
                          <Badge variant={invoiceStatusVariant[inv.status]} size="sm">
                            {inv.status}
                          </Badge>
                        </View>
                        <Text className="text-xs text-neutral-500 mt-0.5" numberOfLines={1}>
                          {inv.subscription?.plan?.name || inv.description}
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
              <Text className="font-bold text-neutral-900 dark:text-white">Payments</Text>
            </View>
            <Text className="text-xs text-neutral-500">{payments.length} total</Text>
          </View>

          {payments.length === 0 ? (
            <Card variant="outline" className="p-6 items-center">
              <FileText size={32} color="#d1d5db" />
              <Text className="mt-2 text-sm text-neutral-500">No payments yet</Text>
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
                        <View className="flex-row items-center gap-2 flex-wrap">
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
                          <Text className="text-xs text-rose-700 mt-1 font-semibold">
                            ✗ {p.rejectionReason}
                          </Text>
                        )}
                        {p.upload?.url && (
                          <Pressable onPress={() => Linking.openURL(p.upload!.url)}>
                            <Text className="text-xs text-blue-600 mt-1 font-bold">
                              View Receipt
                            </Text>
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
