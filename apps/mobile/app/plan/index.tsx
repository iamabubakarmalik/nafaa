import { useState } from 'react';
import {
  View, Text, ScrollView, Pressable, RefreshControl,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { useRouter, Stack } from 'expo-router';
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import {
  ArrowLeft, Sparkles, Check, X, Crown, Zap, Rocket, ArrowRight,
} from 'lucide-react-native';
import { Card } from '@/components/ui/Card';
import { Badge } from '@/components/ui/Badge';
import { Button } from '@/components/ui/Button';
import { plansApi, type Plan } from '@/api/plans.api';
import {
  subscriptionsApi, type BillingInterval,
} from '@/api/subscriptions.api';
import { formatPKRFull } from '@/lib/format';
import Toast from 'react-native-toast-message';

import { useTranslation } from '@/i18n/useTranslation';
const planIcons: Record<string, any> = {
  'free-trial': Sparkles,
  basic: Zap,
  pro: Rocket,
  enterprise: Crown,
};

const planColors: Record<string, string> = {
  'free-trial': '#737373',
  basic: '#2563eb',
  pro: '#16a34a',
  enterprise: '#f59e0b',
};

export default function PlanScreen() {
  const { t } = useTranslation();
  const router = useRouter();
  const queryClient = useQueryClient();
  const [refreshing, setRefreshing] = useState(false);
  const [interval, setInterval] = useState<BillingInterval>('MONTHLY');

  const { data: plans = [], refetch } = useQuery({
    queryKey: ['plans'],
    queryFn: plansApi.list,
  });

  const { data: current, refetch: refetchCurrent } = useQuery({
    queryKey: ['subscription-current'],
    queryFn: subscriptionsApi.current,
  });

  const startMutation = useMutation({
    mutationFn: ({ planId, interval }: { planId: string; interval: BillingInterval }) =>
      subscriptionsApi.start(planId, interval),
    onSuccess: (data) => {
      Toast.show({ type: 'success', text1: 'Plan select ho gaya', text2: 'Ab payment karein' });
      queryClient.invalidateQueries({ queryKey: ['subscription-current'] });
      router.push(`/billing/invoice/${data.invoice.id}`);
    },
    onError: (e: any) =>
      Toast.show({ type: 'error', text1: e?.response?.data?.message || 'Fail' }),
  });

  const onRefresh = async () => {
    setRefreshing(true);
    await Promise.all([refetch(), refetchCurrent()]);
    setRefreshing(false);
  };

  const getPrice = (p: Plan) =>
    interval === 'MONTHLY' ? p.priceMonthly :
    interval === 'QUARTERLY' ? p.priceQuarterly : p.priceYearly;

  const intervalLabel = {
    MONTHLY: '/month', QUARTERLY: '/3 months', YEARLY: '/year',
  }[interval];

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
          <Text className="text-2xl font-bold text-neutral-900 dark:text-white">{t('auto.index.plans_pricing')}</Text>
          <Text className="text-xs text-neutral-500">{t('auto.index.apna_plan_choose_karein')}</Text>
        </View>
      </View>

      <ScrollView
        contentContainerStyle={{ paddingBottom: 40 }}
        refreshControl={<RefreshControl refreshing={refreshing} onRefresh={onRefresh} tintColor="#16a34a" />}
        showsVerticalScrollIndicator={false}
      >
        {/* Current plan banner */}
        {current && (
          <View className="px-5 mb-3">
            <Card variant="outline" className="bg-emerald-50 dark:bg-emerald-950/40 border-emerald-200 p-4">
              <View className="flex-row items-center gap-3">
                <View className="h-12 w-12 rounded-2xl bg-emerald-200 dark:bg-emerald-900/50 items-center justify-center">
                  <Check size={22} color="#16a34a" />
                </View>
                <View className="flex-1">
                  <Text className="text-xs text-emerald-700 dark:text-emerald-400 font-bold uppercase tracking-wider">{t('auto.index.current_plan')}</Text>
                  <Text className="text-base font-bold text-emerald-900 dark:text-emerald-200">
                    {current.plan.name} • {current.status}
                  </Text>
                  <Text className="text-xs text-emerald-700 dark:text-emerald-400 mt-0.5">
                    Expires: {new Date(current.currentPeriodEnd).toLocaleDateString('en-PK')}
                  </Text>
                </View>
              </View>
            </Card>
          </View>
        )}

        {/* Interval toggle */}
        <View className="px-5 mb-4">
          <View className="flex-row bg-white dark:bg-neutral-900 rounded-2xl p-1 border border-neutral-200 dark:border-neutral-800">
            {(['MONTHLY', 'QUARTERLY', 'YEARLY'] as BillingInterval[]).map((i) => (
              <Pressable
                key={i}
                onPress={() => setInterval(i)}
                className={`flex-1 py-2.5 rounded-xl ${
                  interval === i ? 'bg-brand-600' : ''
                }`}
              >
                <Text
                  className={`text-center text-sm font-bold ${
                    interval === i ? 'text-white' : 'text-neutral-700 dark:text-neutral-300'
                  }`}
                >
                  {i === 'MONTHLY' ? 'Monthly' : i === 'QUARTERLY' ? 'Quarterly' : 'Yearly'}
                </Text>
                {i === 'YEARLY' && (
                  <Text
                    className={`text-center text-[9px] mt-0.5 ${
                      interval === i ? 'text-white/80' : 'text-emerald-600'
                    }`}
                  >{t('auto.index.save_15')}</Text>
                )}
              </Pressable>
            ))}
          </View>
        </View>

        {/* Plans */}
        <View className="px-5 gap-3">
          {plans.map((plan) => {
            const Icon = planIcons[plan.slug] || Sparkles;
            const color = planColors[plan.slug] || '#737373';
            const isCurrent = current?.plan.id === plan.id;
            const isPopular = plan.slug === 'pro';
            const price = getPrice(plan);

            return (
              <Card
                key={plan.id}
                variant="outline"
                className={`p-5 relative ${isPopular ? 'border-2 border-brand-500' : ''}`}
              >
                {isPopular && (
                  <View className="absolute -top-3 right-5">
                    <Badge variant="brand" size="md">⭐ MOST POPULAR</Badge>
                  </View>
                )}

                <View className="flex-row items-center gap-3 mb-3">
                  <View
                    className="h-14 w-14 rounded-2xl items-center justify-center"
                    style={{ backgroundColor: color + '20' }}
                  >
                    <Icon size={26} color={color} />
                  </View>
                  <View className="flex-1">
                    <Text className="text-xl font-bold text-neutral-900 dark:text-white">
                      {plan.name}
                    </Text>
                    <Text className="text-xs text-neutral-500" numberOfLines={2}>
                      {plan.description}
                    </Text>
                  </View>
                </View>

                <View className="bg-neutral-50 dark:bg-neutral-800 rounded-2xl p-4 mb-3">
                  {price > 0 ? (
                    <>
                      <View className="flex-row items-baseline gap-1">
                        <Text className="text-3xl font-bold text-neutral-900 dark:text-white">
                          {formatPKRFull(price)}
                        </Text>
                        <Text className="text-sm text-neutral-500">{intervalLabel}</Text>
                      </View>
                    </>
                  ) : (
                    <Text className="text-2xl font-bold text-emerald-600">
                      FREE • {plan.trialDays} days trial
                    </Text>
                  )}
                </View>

                {/* Limits */}
                <View className="gap-1.5 mb-3">
                  <FeatureRow enabled label={`${plan.maxProducts >= 999999 ? 'Unlimited' : plan.maxProducts} Products`} />
                  <FeatureRow enabled label={`${plan.maxUsers >= 999 ? 'Unlimited' : plan.maxUsers} Users`} />
                  <FeatureRow enabled label={`${plan.maxShops >= 999 ? 'Unlimited' : plan.maxShops} Shop${plan.maxShops > 1 ? 's' : ''}`} />
                  <FeatureRow enabled label={`${plan.maxSalesPerMonth >= 999999 ? 'Unlimited' : plan.maxSalesPerMonth} sales/month`} />
                </View>

                <View className="gap-1.5 mb-4 pt-3 border-t border-neutral-100 dark:border-neutral-800">
                  <FeatureRow enabled={plan.featurePos} label="POS Counter" />
                  <FeatureRow enabled={plan.featureKhata} label="Khata (Udhaar)" />
                  <FeatureRow enabled={plan.featureBarcodeScanner} label="Barcode Scanner" />
                  <FeatureRow enabled={plan.featureReports} label="Reports" />
                  <FeatureRow enabled={plan.featureMultiShop} label="Multi-Shop" />
                  <FeatureRow enabled={plan.featureLoyalty} label="Loyalty Points" />
                  <FeatureRow enabled={plan.featureWhatsappReceipt} label="WhatsApp Receipt" />
                  <FeatureRow enabled={plan.featureExports} label="Excel/PDF Export" />
                </View>

                {isCurrent ? (
                  <Button variant="secondary" size="md" disabled>
                    <Check size={16} color="#737373" />
                    <Text className="font-bold text-neutral-700 dark:text-neutral-300">{t('auto.index.current_plan')}</Text>
                  </Button>
                ) : plan.priceMonthly === 0 ? (
                  <Button variant="secondary" size="md">
                    <Text className="font-bold text-neutral-700 dark:text-neutral-300">{t('auto.index.free_trial')}</Text>
                  </Button>
                ) : (
                  <Button
                    size="md"
                    loading={startMutation.isPending}
                    onPress={() => startMutation.mutate({ planId: plan.id, interval })}
                    className={isPopular ? 'bg-brand-600' : ''}
                  >
                    <Text className="text-white font-bold">{t('auto.index.subscribe_now')}</Text>
                    <ArrowRight size={16} color="#ffffff" />
                  </Button>
                )}
              </Card>
            );
          })}
        </View>
      </ScrollView>
    </SafeAreaView>
  );
}

function FeatureRow({ enabled, label }: { enabled: boolean; label: string }) {
  return (
    <View className="flex-row items-center gap-2">
      {enabled ? (
        <View className="h-4 w-4 rounded-full bg-emerald-100 dark:bg-emerald-950/40 items-center justify-center">
          <Check size={10} color="#16a34a" />
        </View>
      ) : (
        <View className="h-4 w-4 rounded-full bg-neutral-100 dark:bg-neutral-800 items-center justify-center">
          <X size={10} color="#9ca3af" />
        </View>
      )}
      <Text
        className={`text-xs ${enabled ? 'text-neutral-700 dark:text-neutral-300' : 'text-neutral-400 line-through'}`}
      >
        {label}
      </Text>
    </View>
  );
}
