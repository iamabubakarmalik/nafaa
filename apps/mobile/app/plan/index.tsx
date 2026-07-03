import { useState } from 'react';
import {
  View, Text, ScrollView, Pressable, RefreshControl, Modal, Alert,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { useRouter, Stack } from 'expo-router';
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import * as Haptics from 'expo-haptics';
import Toast from 'react-native-toast-message';
import {
  ArrowLeft, Sparkles, Check, X, Crown, Zap, Rocket, ArrowRight,
  Star, Award, Shield, TrendingUp, RefreshCw, AlertTriangle,
  CheckCircle2, ChevronRight, MessageCircle,
} from 'lucide-react-native';
import { plansApi, type Plan } from '@/api/plans.api';
import { subscriptionsApi, type BillingInterval } from '@/api/subscriptions.api';
import { apiClient } from '@/api/client';
import { formatPKR, formatPKRFull } from '@/lib/format';

const planIcons: Record<string, any> = {
  'free-trial': Sparkles,
  basic: Zap,
  pro: Rocket,
  enterprise: Crown,
};

const planColors: Record<string, string> = {
  'free-trial': '#64748b',
  basic: '#2563eb',
  pro: '#16a34a',
  enterprise: '#f59e0b',
};

export default function PlansScreen() {
  const router = useRouter();
  const queryClient = useQueryClient();
  const [interval, setInterval] = useState<BillingInterval>('MONTHLY');
  const [confirmPlan, setConfirmPlan] = useState<Plan | null>(null);
  const [refreshing, setRefreshing] = useState(false);

  const { data: plans = [], refetch: refetchPlans } = useQuery({
    queryKey: ['plans'],
    queryFn: plansApi.list,
  });

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

  const startMutation = useMutation({
    mutationFn: ({ planId, interval }: { planId: string; interval: BillingInterval }) =>
      subscriptionsApi.start(planId, interval),
    onSuccess: (data: any) => {
      Haptics.notificationAsync(Haptics.NotificationFeedbackType.Success);
      queryClient.invalidateQueries({ queryKey: ['subscription-current'] });
      queryClient.invalidateQueries({ queryKey: ['subscription-pending'] });
      queryClient.invalidateQueries({ queryKey: ['billing-invoices'] });

      if (data.reused) {
        Toast.show({ type: 'success', text1: 'Existing invoice pay karein' });
      } else if (data.cancelledCount > 0) {
        Toast.show({
          type: 'success',
          text1: 'Plan switch ho gaya!',
          text2: `${data.cancelledCount} pichla pending cancel`,
        });
      } else {
        Toast.show({ type: 'success', text1: 'Plan selected! Ab payment karein' });
      }

      setConfirmPlan(null);
      router.push(`/billing/invoice/${data.invoice.id}`);
    },
    onError: (e: any) =>
      Toast.show({ type: 'error', text1: e?.response?.data?.message || 'Subscribe fail' }),
  });

  const cleanupMutation = useMutation({
    mutationFn: () => subscriptionsApi.cleanupPending(),
    onSuccess: (data: any) => {
      Toast.show({ type: 'success', text1: data?.message || 'Cleanup done' });
      queryClient.invalidateQueries({ queryKey: ['subscription-pending'] });
      queryClient.invalidateQueries({ queryKey: ['billing-invoices'] });
    },
    onError: (e: any) =>
      Toast.show({ type: 'error', text1: e?.response?.data?.message || 'Cleanup fail' }),
  });

  const onRefresh = async () => {
    setRefreshing(true);
    await Promise.all([refetchPlans(), refetchCurrent()]);
    setRefreshing(false);
  };

  const getPrice = (plan: Plan) => {
    if (interval === 'MONTHLY') return plan.priceMonthly;
    if (interval === 'QUARTERLY') return plan.priceQuarterly;
    return plan.priceYearly;
  };

  const getSavings = (plan: Plan) => {
    if (plan.priceMonthly === 0 || interval === 'MONTHLY') return null;
    const monthlyTotal = plan.priceMonthly * (interval === 'QUARTERLY' ? 3 : 12);
    const actualPrice = getPrice(plan);
    const savings = monthlyTotal - actualPrice;
    const pct = (savings / monthlyTotal) * 100;
    return { amount: savings, percent: pct };
  };

  const intervalLabel = {
    MONTHLY: '/month',
    QUARTERLY: '/3 months',
    YEARLY: '/year',
  }[interval];

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
          <Text className="text-2xl font-extrabold text-neutral-900 dark:text-white">Plans</Text>
          <View className="flex-row items-center gap-1.5 mt-0.5">
            <Sparkles size={11} color="#16a34a" />
            <Text className="text-xs text-neutral-500">Choose your plan</Text>
          </View>
        </View>
      </View>

      <ScrollView
        contentContainerStyle={{ paddingBottom: 40 }}
        refreshControl={<RefreshControl refreshing={refreshing} onRefresh={onRefresh} tintColor="#16a34a" />}
        showsVerticalScrollIndicator={false}
      >
        {/* Hero */}
        <View className="px-5 mb-4">
          <View
            className="rounded-3xl p-6 items-center"
            style={{
              backgroundColor: '#0f172a',
              shadowColor: '#16a34a',
              shadowOpacity: 0.3,
              shadowRadius: 16,
              shadowOffset: { width: 0, height: 8 },
              elevation: 10,
            }}
          >
            <View className="flex-row items-center gap-1.5 px-3 py-1 rounded-full bg-white/10 border border-white/20 mb-3">
              <Sparkles size={11} color="#fde68a" />
              <Text className="text-[10px] font-extrabold uppercase tracking-wider text-white/90">
                Pricing Plans
              </Text>
            </View>
            <Text className="text-3xl font-extrabold text-white text-center">
              Apna business{'\n'}
              <Text className="text-emerald-300">aagey barhao</Text>
            </Text>
            <Text className="text-sm text-white/70 mt-2 font-semibold text-center">
              7-day free trial • No credit card
            </Text>
          </View>
        </View>

        {/* Interval switcher */}
        <View className="px-5 mb-4">
          <View className="flex-row bg-white rounded-2xl p-1 border border-neutral-200">
            {(['MONTHLY', 'QUARTERLY', 'YEARLY'] as BillingInterval[]).map((i) => {
              const active = interval === i;
              return (
                <Pressable
                  key={i}
                  onPress={() => setInterval(i)}
                  className="flex-1 py-2.5 rounded-xl items-center relative"
                  style={{ backgroundColor: active ? '#16a34a' : 'transparent' }}
                >
                  <Text
                    className="text-xs font-extrabold"
                    style={{ color: active ? '#ffffff' : '#374151' }}
                  >
                    {i === 'MONTHLY' && 'Monthly'}
                    {i === 'QUARTERLY' && 'Quarterly'}
                    {i === 'YEARLY' && 'Yearly'}
                  </Text>
                  {i === 'QUARTERLY' && (
                    <View className="absolute -top-1 -right-0.5 px-1 py-0.5 rounded-md bg-amber-400">
                      <Text className="text-[8px] font-extrabold text-amber-900">-5%</Text>
                    </View>
                  )}
                  {i === 'YEARLY' && (
                    <View className="absolute -top-1 -right-0.5 px-1 py-0.5 rounded-md bg-emerald-400">
                      <Text className="text-[8px] font-extrabold text-emerald-900">-15%</Text>
                    </View>
                  )}
                </Pressable>
              );
            })}
          </View>
        </View>

        {/* Current plan */}
        {current && (
          <View className="px-5 mb-3">
            <View className="rounded-2xl bg-emerald-50 border-2 border-emerald-200 p-3.5 flex-row items-center gap-3">
              <View className="h-11 w-11 rounded-2xl items-center justify-center" style={{ backgroundColor: '#16a34a' }}>
                <Award size={20} color="#ffffff" />
              </View>
              <View className="flex-1">
                <Text className="text-[10px] uppercase font-extrabold tracking-wider text-emerald-700">
                  Current Plan
                </Text>
                <Text className="font-extrabold text-emerald-900">{current.plan.name}</Text>
                <Text className="text-[11px] text-emerald-700 font-bold">
                  {current.status} • Expires {new Date(current.currentPeriodEnd).toLocaleDateString('en-PK', { month: 'short', day: 'numeric' })}
                </Text>
              </View>
              <Pressable onPress={() => router.push('/billing')} className="h-8 w-8 items-center justify-center">
                <ChevronRight size={16} color="#16a34a" />
              </Pressable>
            </View>
          </View>
        )}

        {/* Pending warning */}
        {pendingUpgrade && pendingUpgrade.subscription?.plan && pendingUpgrade.invoice && (
          <View className="px-5 mb-3">
            <View className="rounded-2xl bg-amber-50 border-2 border-amber-300 p-3.5">
              <View className="flex-row items-start gap-3">
                <View className="h-11 w-11 rounded-2xl items-center justify-center" style={{ backgroundColor: '#d97706' }}>
                  <AlertTriangle size={20} color="#ffffff" />
                </View>
                <View className="flex-1">
                  <Text className="text-[10px] uppercase font-extrabold tracking-wider text-amber-700">
                    Pending Upgrade
                  </Text>
                  <Text className="font-extrabold text-amber-900">
                    {pendingUpgrade.subscription.plan.name}
                  </Text>
                  <Text className="text-[11px] text-amber-700 font-bold">
                    Naya plan select karne se ye cancel ho jayega
                  </Text>
                </View>
              </View>
              <View className="flex-row gap-2 mt-3">
                <Pressable
                  onPress={() => cleanupMutation.mutate()}
                  disabled={cleanupMutation.isPending}
                  className="flex-1 h-10 rounded-xl border-2 border-amber-300 bg-white items-center justify-center flex-row gap-1.5"
                >
                  <RefreshCw size={12} color="#b45309" />
                  <Text className="text-amber-800 font-extrabold text-xs">Cleanup</Text>
                </Pressable>
                <Pressable
                  onPress={() => router.push(`/billing/invoice/${pendingUpgrade.invoice.id}`)}
                  className="flex-1 h-10 rounded-xl items-center justify-center flex-row gap-1.5"
                  style={{ backgroundColor: '#d97706' }}
                >
                  <Text className="text-white font-extrabold text-xs">Pay Existing</Text>
                  <ArrowRight size={12} color="#ffffff" />
                </Pressable>
              </View>
            </View>
          </View>
        )}

        {/* Plans */}
        <View className="px-5 gap-3">
          {plans.map((plan) => {
            const Icon = planIcons[plan.slug] || Sparkles;
            const color = planColors[plan.slug] || '#737373';
            const isCurrent = current?.plan.id === plan.id;
            const isPopular = plan.slug === 'pro';
            const isFree = plan.priceMonthly === 0;
            const price = getPrice(plan);
            const savings = getSavings(plan);
            const isPendingThis = pendingUpgrade?.subscription?.plan?.id === plan.id;

            return (
              <View
                key={plan.id}
                className="rounded-3xl bg-white dark:bg-neutral-900 border-2 overflow-hidden shadow-sm"
                style={{
                  borderColor: isPopular ? color : '#e5e7eb',
                  ...(isPopular && {
                    shadowColor: color,
                    shadowOpacity: 0.2,
                    shadowRadius: 12,
                    elevation: 6,
                  }),
                }}
              >
                {isPopular && (
                  <View
                    className="px-3 py-1.5 items-center flex-row justify-center gap-1"
                    style={{ backgroundColor: color }}
                  >
                    <Star size={11} color="#ffffff" fill="#ffffff" />
                    <Text className="text-white text-[10px] font-extrabold uppercase tracking-wider">
                      Most Popular
                    </Text>
                  </View>
                )}
                {isPendingThis && (
                  <View className="absolute top-2 right-2 z-10 px-2 py-0.5 rounded-md bg-amber-500">
                    <Text className="text-white text-[9px] font-extrabold uppercase tracking-wider">
                      ⏳ Pending
                    </Text>
                  </View>
                )}

                <View
                  className="p-5"
                  style={{ backgroundColor: `${color}10` }}
                >
                  <View
                    className="h-14 w-14 rounded-2xl items-center justify-center"
                    style={{ backgroundColor: color }}
                  >
                    <Icon size={26} color="#ffffff" />
                  </View>
                  <Text className="mt-3 text-2xl font-extrabold text-neutral-900 dark:text-white">
                    {plan.name}
                  </Text>
                  {plan.description && (
                    <Text className="text-sm text-neutral-600 dark:text-neutral-400 mt-1 font-semibold">
                      {plan.description}
                    </Text>
                  )}

                  <View className="mt-4">
                    {isFree ? (
                      <View>
                        <Text className="text-3xl font-extrabold text-emerald-700">
                          FREE
                        </Text>
                        <Text className="text-xs text-neutral-600 mt-0.5 font-bold">
                          ⏱️ {plan.trialDays} days trial
                        </Text>
                      </View>
                    ) : (
                      <View>
                        <View className="flex-row items-baseline gap-1">
                          <Text className="text-3xl font-extrabold text-neutral-900 dark:text-white">
                            {formatPKR(price)}
                          </Text>
                          <Text className="text-sm text-neutral-500 font-bold">{intervalLabel}</Text>
                        </View>
                        {savings && (
                          <View
                            className="mt-1.5 self-start px-2 py-0.5 rounded-md flex-row items-center gap-1"
                            style={{ backgroundColor: '#dcfce7' }}
                          >
                            <TrendingUp size={9} color="#15803d" />
                            <Text className="text-[10px] font-extrabold text-emerald-700">
                              Save {formatPKR(savings.amount)} ({savings.percent.toFixed(0)}%)
                            </Text>
                          </View>
                        )}
                      </View>
                    )}
                  </View>
                </View>

                <View className="p-5">
                  <View className="gap-1.5 mb-4">
                    <FeatureRow enabled label={`${plan.maxProducts >= 999999 ? 'Unlimited' : plan.maxProducts.toLocaleString()} Products`} />
                    <FeatureRow enabled label={`${plan.maxUsers >= 999 ? 'Unlimited' : plan.maxUsers} Users`} />
                    <FeatureRow enabled label={`${plan.maxShops >= 999 ? 'Unlimited' : plan.maxShops} Shop${plan.maxShops > 1 ? 's' : ''}`} />
                    <FeatureRow enabled label={`${plan.maxSalesPerMonth >= 999999 ? 'Unlimited' : plan.maxSalesPerMonth.toLocaleString()} Sales/month`} />
                  </View>

                  <View className="pt-3 border-t border-neutral-100 dark:border-neutral-800 gap-1.5 mb-4">
                    <FeatureRow enabled={plan.featurePos} label="POS Counter" />
                    <FeatureRow enabled={plan.featureBarcodeScanner} label="Barcode Scanner" />
                    <FeatureRow enabled={plan.featureKhata} label="Khata (Udhaar)" />
                    <FeatureRow enabled={plan.featureCashRegister} label="Cash Register" />
                    <FeatureRow enabled={plan.featureReturns} label="Returns" />
                    <FeatureRow enabled={plan.featureReports} label="Reports & Analytics" />
                    <FeatureRow enabled={plan.featureLoyalty} label="Loyalty Points" />
                    <FeatureRow enabled={plan.featureDiscounts} label="Discount Codes" />
                    <FeatureRow enabled={plan.featureMultiShop} label="Multi-Shop" />
                    <FeatureRow enabled={plan.featureWhatsappReceipt} label="WhatsApp Receipt" />
                    <FeatureRow enabled={plan.featureExports} label="Excel/PDF Export" />
                    <FeatureRow enabled={plan.featureBackup} label="Backup & Restore" />
                    <FeatureRow enabled={plan.featureSupport24x7} label="24/7 Priority Support" />
                  </View>

                  {isCurrent ? (
                    <View className="h-12 rounded-xl bg-emerald-100 items-center justify-center flex-row gap-2">
                      <Check size={16} color="#15803d" />
                      <Text className="font-extrabold text-emerald-800">Current Plan</Text>
                    </View>
                  ) : isFree ? (
                    <Pressable
                      onPress={() => router.push('/billing')}
                      className="h-12 rounded-xl bg-slate-100 items-center justify-center"
                    >
                      <Text className="font-extrabold text-slate-700">Already on Trial</Text>
                    </Pressable>
                  ) : isPendingThis ? (
                    <Pressable
                      onPress={() => router.push(`/billing/invoice/${pendingUpgrade.invoice.id}`)}
                      className="h-12 rounded-xl items-center justify-center flex-row gap-2"
                      style={{ backgroundColor: '#d97706' }}
                    >
                      <ArrowRight size={16} color="#ffffff" />
                      <Text className="text-white font-extrabold">Continue Payment</Text>
                    </Pressable>
                  ) : (
                    <Pressable
                      onPress={() => {
                        Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Medium);
                        setConfirmPlan(plan);
                      }}
                      className="h-12 rounded-xl items-center justify-center flex-row gap-2 active:opacity-80"
                      style={{
                        backgroundColor: color,
                        shadowColor: color,
                        shadowOpacity: 0.3,
                        shadowRadius: 8,
                        elevation: 4,
                      }}
                    >
                      <Text className="text-white font-extrabold">Subscribe Now</Text>
                      <ArrowRight size={16} color="#ffffff" />
                    </Pressable>
                  )}
                </View>
              </View>
            );
          })}
        </View>

        {/* Trust cards */}
        <View className="px-5 mt-6">
          <Text className="text-lg font-extrabold text-neutral-900 dark:text-white text-center mb-3">
            Why Choose Nafaa?
          </Text>
          <View className="flex-row flex-wrap -mx-1.5">
            {[
              { icon: Shield, title: 'Secure', desc: 'Bank-level security', color: '#16a34a' },
              { icon: Zap, title: 'Fast', desc: 'Even on slow internet', color: '#f59e0b' },
              { icon: MessageCircle, title: 'Urdu Support', desc: 'Roman Urdu team', color: '#2563eb' },
              { icon: TrendingUp, title: 'Growing', desc: '500+ shops trust', color: '#7c3aed' },
            ].map((t) => {
              const Icon = t.icon;
              return (
                <View key={t.title} className="w-1/2 px-1.5 mb-3">
                  <View className="rounded-2xl bg-white border border-neutral-200 p-3">
                    <View
                      className="h-9 w-9 rounded-xl items-center justify-center"
                      style={{ backgroundColor: `${t.color}15` }}
                    >
                      <Icon size={16} color={t.color} />
                    </View>
                    <Text className="mt-2 font-extrabold text-neutral-900 text-sm">{t.title}</Text>
                    <Text className="text-[10px] text-neutral-500 font-semibold mt-0.5">
                      {t.desc}
                    </Text>
                  </View>
                </View>
              );
            })}
          </View>
        </View>
      </ScrollView>

      {/* Confirm Modal */}
      <Modal
        visible={!!confirmPlan}
        animationType="slide"
        presentationStyle="pageSheet"
        onRequestClose={() => setConfirmPlan(null)}
      >
        {confirmPlan && (
          <ConfirmSheet
            plan={confirmPlan}
            interval={interval}
            price={getPrice(confirmPlan)}
            existingPending={pendingUpgrade}
            currentPlanName={current?.plan?.name}
            onConfirm={() => startMutation.mutate({ planId: confirmPlan.id, interval })}
            onClose={() => setConfirmPlan(null)}
            loading={startMutation.isPending}
          />
        )}
      </Modal>
    </SafeAreaView>
  );
}

function FeatureRow({ enabled, label }: { enabled: boolean; label: string }) {
  return (
    <View className="flex-row items-center gap-2">
      <View
        className="h-4 w-4 rounded-full items-center justify-center"
        style={{ backgroundColor: enabled ? '#dcfce7' : '#f1f5f9' }}
      >
        {enabled ? <Check size={9} color="#15803d" /> : <X size={9} color="#94a3b8" />}
      </View>
      <Text
        className="text-xs flex-1"
        style={{
          color: enabled ? '#374151' : '#94a3b8',
          textDecorationLine: enabled ? 'none' : 'line-through',
          fontWeight: enabled ? '600' : '500',
        }}
      >
        {label}
      </Text>
    </View>
  );
}

function ConfirmSheet({ plan, interval, price, existingPending, currentPlanName, onConfirm, onClose, loading }: any) {
  const color = planColors[plan.slug] || '#16a34a';
  const Icon = planIcons[plan.slug] || Sparkles;
  const isSamePlan = existingPending?.subscription?.plan?.id === plan.id &&
                     existingPending?.subscription?.interval === interval;

  return (
    <SafeAreaView className="flex-1 bg-neutral-50">
      <View className="px-5 py-4 border-b border-neutral-200 flex-row items-center gap-3">
        <View className="h-11 w-11 rounded-2xl items-center justify-center" style={{ backgroundColor: color }}>
          <Icon size={20} color="#ffffff" />
        </View>
        <View className="flex-1">
          <Text className="text-xs uppercase tracking-wider text-emerald-700 font-extrabold">
            Confirm Subscription
          </Text>
          <Text className="text-lg font-bold text-neutral-900">{plan.name}</Text>
        </View>
        <Pressable
          onPress={onClose}
          hitSlop={12}
          className="h-10 w-10 rounded-2xl bg-neutral-100 items-center justify-center"
        >
          <X size={20} color="#6b7280" />
        </Pressable>
      </View>

      <ScrollView contentContainerStyle={{ padding: 20, paddingBottom: 40 }}>
        <View
          className="rounded-3xl p-6 items-center mb-4"
          style={{ backgroundColor: color }}
        >
          <Text className="text-[10px] uppercase tracking-wider text-white/80 font-extrabold">
            {interval} Subscription
          </Text>
          <Text className="text-5xl font-extrabold text-white mt-2">
            {formatPKRFull(price)}
          </Text>
          <Text className="text-xs text-white/80 mt-1 font-semibold">
            per {interval.toLowerCase()}
          </Text>
        </View>

        {isSamePlan ? (
          <View className="rounded-2xl bg-blue-50 border-2 border-blue-200 p-4 mb-4 flex-row items-start gap-3">
            <RefreshCw size={20} color="#1d4ed8" />
            <View className="flex-1">
              <Text className="font-extrabold text-blue-900">Already Pending</Text>
              <Text className="text-xs text-blue-800 mt-1 font-semibold">
                Iss plan ke liye already invoice hai. Aap ko us hi invoice par redirect kiya jayega.
              </Text>
            </View>
          </View>
        ) : existingPending ? (
          <View className="rounded-2xl bg-amber-50 border-2 border-amber-300 p-4 mb-4 flex-row items-start gap-3">
            <AlertTriangle size={20} color="#b45309" />
            <View className="flex-1">
              <Text className="font-extrabold text-amber-900">
                Pichla Pending Cancel Ho Jayega
              </Text>
              <Text className="text-xs text-amber-800 mt-1 font-semibold">
                Existing pending{' '}
                <Text className="font-extrabold">{existingPending.subscription.plan.name}</Text> aur us ka invoice automatic cancel ho jayega.
              </Text>
            </View>
          </View>
        ) : (
          <View className="rounded-2xl bg-emerald-50 border-2 border-emerald-200 p-4 mb-4 flex-row items-start gap-3">
            <CheckCircle2 size={20} color="#15803d" />
            <View className="flex-1">
              <Text className="font-extrabold text-emerald-900">Ready to Subscribe</Text>
              <Text className="text-xs text-emerald-800 mt-1 font-semibold">
                Naya invoice generate hoga. Current {currentPlanName ? `plan (${currentPlanName})` : 'trial'} payment confirm hone tak chalta rahega.
              </Text>
            </View>
          </View>
        )}

        <View className="gap-2">
          <View className="flex-row items-center gap-2">
            <Check size={14} color="#15803d" />
            <Text className="text-sm font-semibold text-neutral-700">
              {plan.maxProducts >= 999999 ? 'Unlimited' : plan.maxProducts.toLocaleString()} Products
            </Text>
          </View>
          <View className="flex-row items-center gap-2">
            <Check size={14} color="#15803d" />
            <Text className="text-sm font-semibold text-neutral-700">
              {plan.maxUsers >= 999 ? 'Unlimited' : plan.maxUsers} Users
            </Text>
          </View>
          <View className="flex-row items-center gap-2">
            <Check size={14} color="#15803d" />
            <Text className="text-sm font-semibold text-neutral-700">
              {plan.maxShops >= 999 ? 'Unlimited' : plan.maxShops} Shop{plan.maxShops > 1 ? 's' : ''}
            </Text>
          </View>
        </View>
      </ScrollView>

      <View className="px-5 py-4 border-t border-neutral-200 bg-white flex-row gap-2">
        <Pressable
          onPress={onClose}
          disabled={loading}
          className="flex-1 h-12 rounded-xl border-2 border-neutral-200 items-center justify-center"
        >
          <Text className="font-extrabold text-neutral-700">Cancel</Text>
        </Pressable>
        <Pressable
          onPress={onConfirm}
          disabled={loading}
          className="flex-1 h-12 rounded-xl items-center justify-center flex-row gap-2"
          style={{ backgroundColor: loading ? '#9ca3af' : color }}
        >
          {isSamePlan ? <ArrowRight size={16} color="#ffffff" /> : <Rocket size={16} color="#ffffff" />}
          <Text className="text-white font-extrabold">
            {loading ? 'Loading...' : isSamePlan ? 'Go to Payment' : 'Confirm & Pay'}
          </Text>
        </Pressable>
      </View>
    </SafeAreaView>
  );
}
