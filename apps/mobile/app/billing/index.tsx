import { useState, useMemo } from 'react';
import {
  View, Text, ScrollView, Pressable, RefreshControl, Alert, TextInput, Linking,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { useRouter, Stack } from 'expo-router';
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import * as Haptics from 'expo-haptics';
import Toast from 'react-native-toast-message';
import {
  ArrowLeft, CreditCard, FileText, Clock, CheckCircle2, XCircle,
  AlertCircle, Sparkles, ArrowRight, Receipt, ChevronRight, Crown,
  Wrench, RefreshCw, BarChart3, TrendingUp, Wallet, Award, Calendar,
  Search, X, Filter, Download, Banknote,
} from 'lucide-react-native';
import { subscriptionsApi } from '@/api/subscriptions.api';
import { billingApi, type InvoiceStatus, type PaymentStatus } from '@/api/billing.api';
import { apiClient } from '@/api/client';
import { formatPKRFull, formatPKR } from '@/lib/format';
import {
  invoiceStatusConfig, paymentStatusConfig, subscriptionStatusConfig,
  paymentProviderConfig, formatDate, formatDateTime, getDaysUntilDue,
} from '@/features/billing/components/helpers';

type Tab = 'overview' | 'invoices' | 'payments';
type InvoiceFilter = 'all' | 'PENDING' | 'PAID' | 'OVERDUE';
type PaymentFilter = 'all' | 'PENDING' | 'APPROVED' | 'REJECTED';

export default function BillingScreen() {
  const router = useRouter();
  const queryClient = useQueryClient();
  const [tab, setTab] = useState<Tab>('overview');
  const [invoiceFilter, setInvoiceFilter] = useState<InvoiceFilter>('all');
  const [paymentFilter, setPaymentFilter] = useState<PaymentFilter>('all');
  const [search, setSearch] = useState('');
  const [refreshing, setRefreshing] = useState(false);

  const { data: current, refetch: refetchCurrent } = useQuery({
    queryKey: ['subscription-current'],
    queryFn: subscriptionsApi.current,
  });

  const { data: pendingUpgrade } = useQuery({
    queryKey: ['subscription-pending'],
    queryFn: async () => {
      try {
        const res = await apiClient.get('/subscriptions/pending-upgrade');
        return res.data?.data ?? res.data ?? null;
      } catch { return null; }
    },
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
    mutationFn: async () => {
      const res = await apiClient.post('/subscriptions/cleanup-pending');
      return res.data?.data ?? res.data;
    },
    onSuccess: (data: any) => {
      Haptics.notificationAsync(Haptics.NotificationFeedbackType.Success);
      Toast.show({ type: 'success', text1: `${data?.cancelled || 0} duplicates cancel ho gaye` });
      queryClient.invalidateQueries({ queryKey: ['subscription-current'] });
      queryClient.invalidateQueries({ queryKey: ['subscription-pending'] });
      queryClient.invalidateQueries({ queryKey: ['billing-invoices'] });
    },
    onError: (e: any) => Toast.show({ type: 'error', text1: e?.response?.data?.message || 'Cleanup fail' }),
  });

  const onRefresh = async () => {
    setRefreshing(true);
    await Promise.all([refetchCurrent(), refetchInvoices(), refetchPayments()]);
    setRefreshing(false);
  };

  const pendingInvoices = invoices.filter((i) => i.status === 'PENDING' || i.status === 'OVERDUE');
  const paidInvoices = invoices.filter((i) => i.status === 'PAID');
  const showCleanup = pendingInvoices.length > 1;

  const stats = useMemo(() => {
    const totalPaid = paidInvoices.reduce((s, i) => s + (i.total || 0), 0);
    const totalDue = pendingInvoices.reduce((s, i) => s + (i.amountDue || 0), 0);
    const pendingPayments = payments.filter((p) => p.status === 'PENDING').length;
    return {
      totalPaid, totalDue,
      totalInvoices: invoices.length,
      paidCount: paidInvoices.length,
      pendingCount: pendingInvoices.length,
      pendingPayments,
    };
  }, [invoices, paidInvoices, pendingInvoices, payments]);

  const filteredInvoices = useMemo(() => {
    let list = [...invoices];
    if (invoiceFilter !== 'all') list = list.filter((i) => i.status === invoiceFilter);
    const q = search.toLowerCase().trim();
    if (q) {
      list = list.filter(
        (i) =>
          i.invoiceNumber.toLowerCase().includes(q) ||
          (i.description || '').toLowerCase().includes(q) ||
          (i.subscription?.plan?.name || '').toLowerCase().includes(q),
      );
    }
    return list;
  }, [invoices, invoiceFilter, search]);

  const filteredPayments = useMemo(() => {
    if (paymentFilter === 'all') return payments;
    return payments.filter((p) => p.status === paymentFilter);
  }, [payments, paymentFilter]);

  const currentCfg = current ? subscriptionStatusConfig[current.status] : null;
  const CurrentIcon = currentCfg?.icon || Clock;

  return (
    <SafeAreaView className="flex-1 bg-neutral-50 dark:bg-neutral-950" edges={['top']}>
      <Stack.Screen options={{ headerShown: false }} />

      {/* Header */}
      <View className="px-5 pt-4 pb-3 flex-row items-center gap-3">
        <Pressable
          onPress={() => router.back()}
          hitSlop={12}
          className="h-10 w-10 rounded-2xl bg-white dark:bg-neutral-900 items-center justify-center border border-neutral-200"
        >
          <ArrowLeft size={20} color="#16a34a" />
        </Pressable>
        <View className="flex-1">
          <Text className="text-2xl font-extrabold text-neutral-900 dark:text-white">Billing</Text>
          <Text className="text-xs text-neutral-500 mt-0.5">Plans, invoices & payments</Text>
        </View>
      </View>

      {/* Tabs */}
      <ScrollView
        horizontal
        showsHorizontalScrollIndicator={false}
        contentContainerStyle={{ paddingHorizontal: 20, gap: 8 }}
        className="mb-3"
      >
        {[
          { id: 'overview' as Tab, label: 'Overview', icon: BarChart3, count: undefined },
          { id: 'invoices' as Tab, label: 'Invoices', icon: Receipt, count: invoices.length },
          { id: 'payments' as Tab, label: 'Payments', icon: FileText, count: payments.length },
        ].map((t) => {
          const Icon = t.icon;
          const active = tab === t.id;
          return (
            <Pressable
              key={t.id}
              onPress={() => { Haptics.selectionAsync(); setTab(t.id); }}
              className="h-10 px-4 rounded-xl border-2 flex-row items-center gap-1.5"
              style={{
                backgroundColor: active ? '#16a34a' : '#ffffff',
                borderColor: active ? '#16a34a' : '#e5e7eb',
              }}
            >
              <Icon size={14} color={active ? '#ffffff' : '#16a34a'} />
              <Text className="text-xs font-extrabold" style={{ color: active ? '#ffffff' : '#374151' }}>
                {t.label}
              </Text>
              {t.count !== undefined && (
                <View
                  className="px-1.5 py-0.5 rounded"
                  style={{ backgroundColor: active ? 'rgba(255,255,255,0.25)' : '#f3f4f6' }}
                >
                  <Text
                    className="text-[10px] font-extrabold"
                    style={{ color: active ? '#ffffff' : '#6b7280' }}
                  >
                    {t.count}
                  </Text>
                </View>
              )}
            </Pressable>
          );
        })}
      </ScrollView>

      <ScrollView
        contentContainerStyle={{ paddingBottom: 40 }}
        refreshControl={<RefreshControl refreshing={refreshing} onRefresh={onRefresh} tintColor="#16a34a" />}
        showsVerticalScrollIndicator={false}
      >
        {/* Stats — always visible */}
        <View className="px-5 mb-3">
          <View className="flex-row flex-wrap -mx-1.5">
            <StatCard label="Total Paid" value={formatPKR(stats.totalPaid)} sub={`${stats.paidCount} invoices`} icon={CheckCircle2} color="#15803d" bg="#dcfce7" />
            <StatCard label="Amount Due" value={formatPKR(stats.totalDue)} sub={`${stats.pendingCount} pending`} icon={Clock} color="#d97706" bg="#fef3c7" alert={stats.totalDue > 0} />
            <StatCard label="Invoices" value={String(stats.totalInvoices)} sub="All time" icon={Receipt} color="#2563eb" bg="#dbeafe" />
            <StatCard label="Under Review" value={String(stats.pendingPayments)} sub="Pending" icon={FileText} color="#7c3aed" bg="#ede9fe" />
          </View>
        </View>

        {/* Cleanup warning */}
        {showCleanup && (
          <View className="px-5 mb-3">
            <View className="rounded-2xl bg-orange-50 border-2 border-orange-300 p-4">
              <View className="flex-row items-start gap-3">
                <View className="h-11 w-11 rounded-2xl items-center justify-center" style={{ backgroundColor: '#ea580c' }}>
                  <Wrench size={20} color="#ffffff" />
                </View>
                <View className="flex-1">
                  <Text className="text-[10px] uppercase tracking-wider font-extrabold text-orange-700">
                    Cleanup Needed
                  </Text>
                  <Text className="text-base font-extrabold text-orange-900 mt-0.5">
                    {pendingInvoices.length} Duplicate Pending Invoices
                  </Text>
                  <Text className="text-[11px] text-orange-800 mt-1">
                    Latest rakho, baqi automatic cancel
                  </Text>
                  <Pressable
                    onPress={() => {
                      Alert.alert('Cleanup Duplicates?', 'Sirf latest pending rakha jayega, baqi cancel ho jayenge.', [
                        { text: 'Cancel', style: 'cancel' },
                        { text: 'Cleanup', style: 'destructive', onPress: () => cleanupMutation.mutate() },
                      ]);
                    }}
                    disabled={cleanupMutation.isPending}
                    className="mt-3 self-start px-4 py-2.5 rounded-xl flex-row items-center gap-2"
                    style={{ backgroundColor: '#ea580c', opacity: cleanupMutation.isPending ? 0.5 : 1 }}
                  >
                    <Wrench size={14} color="#ffffff" />
                    <Text className="text-white font-extrabold text-sm">
                      {cleanupMutation.isPending ? 'Cleaning...' : 'Clean Up'}
                    </Text>
                  </Pressable>
                </View>
              </View>
            </View>
          </View>
        )}

        {/* ═══════ OVERVIEW TAB ═══════ */}
        {tab === 'overview' && (
          <>
            {/* Current subscription */}
            {current && current.plan && currentCfg && (
              <View className="px-5 mb-3">
                <View
                  className="rounded-3xl p-5"
                  style={{
                    backgroundColor: currentCfg.color,
                    shadowColor: currentCfg.color,
                    shadowOpacity: 0.3, shadowRadius: 12,
                    shadowOffset: { width: 0, height: 6 }, elevation: 8,
                  }}
                >
                  <View className="flex-row items-start justify-between gap-3">
                    <View className="flex-1">
                      <View className="flex-row items-center gap-1.5">
                        <Crown size={14} color="#fde68a" fill="#fde68a" />
                        <Text className="text-[10px] font-extrabold uppercase tracking-wider text-white/80">
                          Current Plan
                        </Text>
                      </View>
                      <Text className="text-3xl font-extrabold text-white mt-1">
                        {current.plan.name}
                      </Text>
                      <View className="flex-row items-center gap-2 mt-2 flex-wrap">
                        <View className="px-2 py-0.5 rounded-full bg-white/25">
                          <View className="flex-row items-center gap-1">
                            <CurrentIcon size={10} color="#ffffff" />
                            <Text className="text-[10px] font-extrabold text-white">
                              {currentCfg.label}
                            </Text>
                          </View>
                        </View>
                        {current.amount > 0 && (
                          <Text className="text-xs text-white/90 font-bold">
                            {formatPKRFull(current.amount)} / {current.interval?.toLowerCase()}
                          </Text>
                        )}
                      </View>
                      <Text className="text-xs text-white/80 mt-1.5 font-semibold">
                        {currentCfg.description}
                      </Text>
                    </View>
                    <View className="h-14 w-14 rounded-2xl bg-white/20 items-center justify-center">
                      <Award size={28} color="#ffffff" />
                    </View>
                  </View>

                  <Pressable
                    onPress={() => { Haptics.selectionAsync(); router.push('/plan'); }}
                    className="mt-4 h-12 rounded-xl bg-white items-center justify-center flex-row gap-2"
                  >
                    <Sparkles size={16} color={currentCfg.color} />
                    <Text className="font-extrabold" style={{ color: currentCfg.color }}>
                      {current.status === 'TRIAL' ? 'Upgrade Now' : 'Change Plan'}
                    </Text>
                    <ArrowRight size={16} color={currentCfg.color} />
                  </Pressable>
                </View>
              </View>
            )}

            {/* Timeline card */}
            {current && (
              <View className="px-5 mb-3">
                <View className="rounded-2xl bg-white dark:bg-neutral-900 border border-neutral-200 p-4">
                  <Text className="text-[10px] uppercase font-extrabold tracking-wider text-neutral-500 mb-3">
                    Subscription Details
                  </Text>
                  <View className="gap-2.5">
                    <TimelineRow
                      icon={Calendar}
                      label="Started"
                      value={formatDate(current.currentPeriodStart)}
                      color="#64748b"
                    />
                    <TimelineRow
                      icon={Clock}
                      label={current.status === 'TRIAL' ? 'Trial Ends' : 'Expires'}
                      value={formatDate(current.status === 'TRIAL' && current.trialEndsAt ? current.trialEndsAt : current.currentPeriodEnd)}
                      color={current.status === 'TRIAL' ? '#2563eb' : current.status === 'PAST_DUE' ? '#d97706' : '#16a34a'}
                      sub={(() => {
                        const d = getDaysUntilDue(current.status === 'TRIAL' ? current.trialEndsAt : current.currentPeriodEnd);
                        return d > 0 ? `${d} days left` : d === 0 ? 'Today' : `${Math.abs(d)}d ago`;
                      })()}
                    />
                    <TimelineRow
                      icon={Wallet}
                      label="Billing"
                      value={current.interval || '—'}
                      color="#7c3aed"
                      sub={current.autoRenew ? 'Auto-renew on' : 'Manual'}
                    />
                  </View>
                </View>
              </View>
            )}

            {/* Pending upgrade */}
            {pendingUpgrade && pendingUpgrade.subscription?.plan && pendingUpgrade.invoice && (
              <View className="px-5 mb-3">
                <View className="rounded-2xl bg-amber-50 border-2 border-amber-300 p-4">
                  <View className="flex-row items-start gap-3">
                    <View className="h-11 w-11 rounded-2xl items-center justify-center" style={{ backgroundColor: '#d97706' }}>
                      <Clock size={20} color="#ffffff" />
                    </View>
                    <View className="flex-1">
                      <Text className="text-[10px] font-extrabold uppercase tracking-wider text-amber-700">
                        Upgrade Pending
                      </Text>
                      <Text className="text-base font-extrabold text-amber-900 mt-0.5">
                        {pendingUpgrade.subscription.plan.name}
                      </Text>
                      <Text className="text-xs text-amber-800 mt-0.5 font-semibold">
                        Payment ke baad activate ho jayega
                      </Text>
                      <Pressable
                        onPress={() => router.push(`/billing/invoice/${pendingUpgrade.invoice.id}`)}
                        className="mt-3 self-start px-4 py-2.5 rounded-xl flex-row items-center gap-2"
                        style={{ backgroundColor: '#d97706' }}
                      >
                        <CreditCard size={14} color="#ffffff" />
                        <Text className="text-white font-extrabold text-sm">
                          Pay {formatPKRFull(pendingUpgrade.invoice.amountDue)}
                        </Text>
                      </Pressable>
                    </View>
                  </View>
                </View>
              </View>
            )}

            {/* Recent invoices preview */}
            {invoices.length > 0 && (
              <View className="px-5 mb-3">
                <View className="flex-row items-center justify-between mb-2">
                  <View className="flex-row items-center gap-2">
                    <Receipt size={16} color="#2563eb" />
                    <Text className="font-extrabold text-neutral-900 dark:text-white">Recent Invoices</Text>
                  </View>
                  <Pressable onPress={() => setTab('invoices')} className="flex-row items-center gap-0.5">
                    <Text className="text-xs font-extrabold text-blue-700">View All</Text>
                    <ChevronRight size={12} color="#2563eb" />
                  </Pressable>
                </View>
                <View className="gap-2">
                  {invoices.slice(0, 3).map((inv) => (
                    <InvoiceCard key={inv.id} invoice={inv} onPress={() => router.push(`/billing/invoice/${inv.id}`)} />
                  ))}
                </View>
              </View>
            )}

            {/* Recent payments preview */}
            {payments.length > 0 && (
              <View className="px-5 mb-3">
                <View className="flex-row items-center justify-between mb-2">
                  <View className="flex-row items-center gap-2">
                    <FileText size={16} color="#7c3aed" />
                    <Text className="font-extrabold text-neutral-900 dark:text-white">Recent Payments</Text>
                  </View>
                  <Pressable onPress={() => setTab('payments')} className="flex-row items-center gap-0.5">
                    <Text className="text-xs font-extrabold text-violet-700">View All</Text>
                    <ChevronRight size={12} color="#7c3aed" />
                  </Pressable>
                </View>
                <View className="gap-2">
                  {payments.slice(0, 3).map((p) => (
                    <PaymentCard key={p.id} payment={p} />
                  ))}
                </View>
              </View>
            )}
          </>
        )}

        {/* ═══════ INVOICES TAB ═══════ */}
        {tab === 'invoices' && (
          <>
            {/* Search */}
            <View className="px-5 mb-3">
              <View className="flex-row items-center gap-2 rounded-2xl border border-neutral-200 bg-white px-4 h-12">
                <Search size={18} color="#9ca3af" />
                <TextInput
                  placeholder="Search invoice #, description..."
                  placeholderTextColor="#9ca3af"
                  value={search}
                  onChangeText={setSearch}
                  className="flex-1 text-sm text-neutral-900"
                />
                {search.length > 0 && (
                  <Pressable onPress={() => setSearch('')} hitSlop={12}>
                    <X size={14} color="#9ca3af" />
                  </Pressable>
                )}
              </View>
            </View>

            {/* Filter chips */}
            <ScrollView
              horizontal
              showsHorizontalScrollIndicator={false}
              contentContainerStyle={{ paddingHorizontal: 20, gap: 6 }}
              className="mb-3"
            >
              {[
                { v: 'all' as InvoiceFilter, l: 'All', count: invoices.length },
                { v: 'PENDING' as InvoiceFilter, l: 'Pending', count: invoices.filter(i => i.status === 'PENDING').length, color: '#d97706' },
                { v: 'PAID' as InvoiceFilter, l: 'Paid', count: paidInvoices.length, color: '#16a34a' },
                { v: 'OVERDUE' as InvoiceFilter, l: 'Overdue', count: invoices.filter(i => i.status === 'OVERDUE').length, color: '#dc2626' },
              ].map((opt) => {
                const active = invoiceFilter === opt.v;
                return (
                  <Pressable
                    key={opt.v}
                    onPress={() => setInvoiceFilter(opt.v)}
                    className="h-9 px-3 rounded-lg border-2 flex-row items-center gap-1.5"
                    style={{
                      backgroundColor: active ? (opt.color || '#0f172a') : '#ffffff',
                      borderColor: active ? (opt.color || '#0f172a') : '#e5e7eb',
                    }}
                  >
                    <Text className="text-xs font-bold" style={{ color: active ? '#ffffff' : '#374151' }}>
                      {opt.l}
                    </Text>
                    <View
                      className="px-1.5 py-0.5 rounded"
                      style={{ backgroundColor: active ? 'rgba(255,255,255,0.25)' : '#f3f4f6' }}
                    >
                      <Text
                        className="text-[10px] font-extrabold"
                        style={{ color: active ? '#ffffff' : '#6b7280' }}
                      >
                        {opt.count}
                      </Text>
                    </View>
                  </Pressable>
                );
              })}
            </ScrollView>

            <View className="px-5">
              {filteredInvoices.length === 0 ? (
                <View className="items-center py-12">
                  <Receipt size={36} color="#d1d5db" />
                  <Text className="mt-3 text-sm font-bold text-neutral-500">
                    {search || invoiceFilter !== 'all' ? 'No matches' : 'No invoices yet'}
                  </Text>
                </View>
              ) : (
                <View className="gap-2">
                  {filteredInvoices.map((inv) => (
                    <InvoiceCard key={inv.id} invoice={inv} onPress={() => router.push(`/billing/invoice/${inv.id}`)} />
                  ))}
                </View>
              )}
            </View>
          </>
        )}

        {/* ═══════ PAYMENTS TAB ═══════ */}
        {tab === 'payments' && (
          <>
            <ScrollView
              horizontal
              showsHorizontalScrollIndicator={false}
              contentContainerStyle={{ paddingHorizontal: 20, gap: 6 }}
              className="mb-3"
            >
              {[
                { v: 'all' as PaymentFilter, l: 'All', count: payments.length },
                { v: 'PENDING' as PaymentFilter, l: 'Pending', count: payments.filter(p => p.status === 'PENDING').length, color: '#d97706' },
                { v: 'APPROVED' as PaymentFilter, l: 'Approved', count: payments.filter(p => p.status === 'APPROVED').length, color: '#16a34a' },
                { v: 'REJECTED' as PaymentFilter, l: 'Rejected', count: payments.filter(p => p.status === 'REJECTED').length, color: '#dc2626' },
              ].map((opt) => {
                const active = paymentFilter === opt.v;
                return (
                  <Pressable
                    key={opt.v}
                    onPress={() => setPaymentFilter(opt.v)}
                    className="h-9 px-3 rounded-lg border-2 flex-row items-center gap-1.5"
                    style={{
                      backgroundColor: active ? (opt.color || '#0f172a') : '#ffffff',
                      borderColor: active ? (opt.color || '#0f172a') : '#e5e7eb',
                    }}
                  >
                    <Text className="text-xs font-bold" style={{ color: active ? '#ffffff' : '#374151' }}>
                      {opt.l}
                    </Text>
                    <View
                      className="px-1.5 py-0.5 rounded"
                      style={{ backgroundColor: active ? 'rgba(255,255,255,0.25)' : '#f3f4f6' }}
                    >
                      <Text
                        className="text-[10px] font-extrabold"
                        style={{ color: active ? '#ffffff' : '#6b7280' }}
                      >
                        {opt.count}
                      </Text>
                    </View>
                  </Pressable>
                );
              })}
            </ScrollView>

            <View className="px-5">
              {filteredPayments.length === 0 ? (
                <View className="items-center py-12">
                  <FileText size={36} color="#d1d5db" />
                  <Text className="mt-3 text-sm font-bold text-neutral-500">
                    {paymentFilter !== 'all' ? 'No matches' : 'No payments yet'}
                  </Text>
                </View>
              ) : (
                <View className="gap-2">
                  {filteredPayments.map((p) => (
                    <PaymentCard key={p.id} payment={p} />
                  ))}
                </View>
              )}
            </View>
          </>
        )}
      </ScrollView>
    </SafeAreaView>
  );
}

// ─── Helper Components ─────────────────

function StatCard({ label, value, sub, icon: Icon, color, bg, alert }: any) {
  return (
    <View className="w-1/2 px-1.5 mb-3">
      <View
        className="rounded-2xl border-2 p-3.5"
        style={{
          backgroundColor: alert ? bg : '#ffffff',
          borderColor: alert ? color : '#e5e7eb',
        }}
      >
        <View className="flex-row items-center justify-between mb-2">
          <View
            className="h-9 w-9 rounded-xl items-center justify-center"
            style={{ backgroundColor: bg }}
          >
            <Icon size={16} color={color} />
          </View>
        </View>
        <Text className="text-[10px] uppercase font-extrabold tracking-wider" style={{ color }}>
          {label}
        </Text>
        <Text className="text-lg font-extrabold text-neutral-900 dark:text-white mt-0.5" numberOfLines={1}>
          {value}
        </Text>
        <Text className="text-[10px] text-neutral-500 font-bold" numberOfLines={1}>
          {sub}
        </Text>
      </View>
    </View>
  );
}

function TimelineRow({ icon: Icon, label, value, color, sub }: any) {
  return (
    <View className="flex-row items-center gap-3">
      <View
        className="h-9 w-9 rounded-xl items-center justify-center"
        style={{ backgroundColor: `${color}15` }}
      >
        <Icon size={14} color={color} />
      </View>
      <View className="flex-1">
        <Text className="text-[10px] uppercase font-extrabold tracking-wider text-neutral-500">
          {label}
        </Text>
        <Text className="text-sm font-extrabold text-neutral-900 dark:text-white mt-0.5">
          {value}
        </Text>
      </View>
      {sub && (
        <Text className="text-[10px] font-bold" style={{ color }}>
          {sub}
        </Text>
      )}
    </View>
  );
}

function InvoiceCard({ invoice, onPress }: any) {
  const cfg = invoiceStatusConfig[invoice.status as InvoiceStatus];
  const Icon = cfg.icon;
  const isPayable = invoice.status === 'PENDING' || invoice.status === 'OVERDUE';
  const daysUntilDue = getDaysUntilDue(invoice.dueDate);

  return (
    <Pressable
      onPress={onPress}
      className="rounded-2xl bg-white dark:bg-neutral-900 border border-neutral-200 dark:border-neutral-800 p-3.5 active:opacity-70"
    >
      <View className="flex-row items-start gap-3">
        <View
          className="h-11 w-11 rounded-2xl items-center justify-center shrink-0"
          style={{ backgroundColor: cfg.bg }}
        >
          <Icon size={20} color={cfg.color} />
        </View>
        <View className="flex-1 min-w-0">
          <View className="flex-row items-center gap-1.5 flex-wrap">
            <Text className="font-extrabold text-neutral-900 dark:text-white font-mono text-sm">
              {invoice.invoiceNumber}
            </Text>
            <View className="px-1.5 py-0.5 rounded" style={{ backgroundColor: cfg.bg }}>
              <Text className="text-[9px] font-extrabold uppercase" style={{ color: cfg.color }}>
                {cfg.label}
              </Text>
            </View>
            {invoice.status === 'PENDING' && daysUntilDue > 0 && (
              <Text className="text-[10px] font-bold text-amber-700">
                Due in {daysUntilDue}d
              </Text>
            )}
            {invoice.status === 'OVERDUE' && (
              <Text className="text-[10px] font-extrabold text-rose-700">
                ⚠️ {Math.abs(daysUntilDue)}d overdue
              </Text>
            )}
          </View>
          <Text className="text-xs text-neutral-500 mt-1" numberOfLines={1}>
            {invoice.subscription?.plan?.name || invoice.description || 'Subscription'}
          </Text>
          <Text className="text-[10px] text-neutral-400 mt-0.5">
            {formatDate(invoice.createdAt)}
          </Text>
        </View>
        <View className="items-end shrink-0">
          <Text className="text-base font-extrabold text-neutral-900 dark:text-white">
            {formatPKR(invoice.total)}
          </Text>
          {invoice.amountDue > 0 && (
            <Text className="text-[10px] font-extrabold text-amber-700">
              Due: {formatPKR(invoice.amountDue)}
            </Text>
          )}
          {isPayable && (
            <View className="flex-row items-center gap-0.5 mt-1">
              <Text className="text-[10px] font-extrabold text-brand-700">Pay</Text>
              <ArrowRight size={10} color="#16a34a" />
            </View>
          )}
        </View>
      </View>
    </Pressable>
  );
}

function PaymentCard({ payment }: any) {
  const cfg = paymentStatusConfig[payment.status as PaymentStatus];
  const Icon = cfg.icon;
  const providerCfg = paymentProviderConfig[payment.provider as keyof typeof paymentProviderConfig];
  const ProviderIcon = providerCfg?.icon || CreditCard;

  return (
    <View className="rounded-2xl bg-white dark:bg-neutral-900 border border-neutral-200 dark:border-neutral-800 p-3.5">
      <View className="flex-row items-start gap-3">
        <View
          className="h-11 w-11 rounded-2xl items-center justify-center shrink-0"
          style={{ backgroundColor: providerCfg?.color || '#737373' }}
        >
          <ProviderIcon size={20} color="#ffffff" />
        </View>
        <View className="flex-1 min-w-0">
          <View className="flex-row items-center gap-1.5 flex-wrap">
            <Text className="font-extrabold text-neutral-900 dark:text-white">
              {formatPKR(payment.amount)}
            </Text>
            <View className="px-1.5 py-0.5 rounded" style={{ backgroundColor: cfg.bg }}>
              <View className="flex-row items-center gap-0.5">
                <Icon size={9} color={cfg.color} />
                <Text className="text-[9px] font-extrabold uppercase" style={{ color: cfg.color }}>
                  {cfg.label}
                </Text>
              </View>
            </View>
          </View>
          <Text className="text-[11px] text-neutral-500 mt-0.5 font-semibold">
            {providerCfg?.label || payment.provider} • {formatDateTime(payment.createdAt)}
          </Text>
          {payment.invoice?.invoiceNumber && (
            <Text className="text-[10px] text-neutral-400 mt-0.5 font-mono font-bold">
              {payment.invoice.invoiceNumber}
            </Text>
          )}
          {payment.transactionId && (
            <Text className="text-[10px] text-neutral-400 mt-0.5 font-mono">
              TXN: {payment.transactionId}
            </Text>
          )}
          {payment.rejectionReason && (
            <View className="mt-1.5 px-2 py-1 rounded-lg bg-rose-50 border border-rose-200 flex-row items-center gap-1 self-start">
              <XCircle size={10} color="#dc2626" />
              <Text className="text-[10px] font-bold text-rose-800">
                {payment.rejectionReason}
              </Text>
            </View>
          )}
        </View>
        {payment.upload?.url && (
          <Pressable
            onPress={() => Linking.openURL(payment.upload!.url)}
            className="h-9 w-9 rounded-lg bg-blue-50 items-center justify-center"
          >
            <Download size={14} color="#2563eb" />
          </Pressable>
        )}
      </View>
    </View>
  );
}
