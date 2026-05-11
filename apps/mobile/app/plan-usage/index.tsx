import { useState } from 'react';
import {
  View, Text, ScrollView, Pressable, RefreshControl,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { useRouter, Stack } from 'expo-router';
import { useQuery } from '@tanstack/react-query';
import * as Haptics from 'expo-haptics';
import {
  ArrowLeft, Gauge, Sparkles, Package, Users, ShieldCheck,
  Building2, Crown, TrendingUp, AlertTriangle,
} from 'lucide-react-native';
import { planUsageApi } from '@/api/plan-usage.api';

import { useTranslation } from '@/i18n/useTranslation';
const usageItems = [
  { key: 'products', label: 'Products', icon: Package, color: '#16a34a' },
  { key: 'customers', label: 'Customers', icon: Users, color: '#8b5cf6' },
  { key: 'users', label: 'Team Members', icon: ShieldCheck, color: '#7c3aed' },
  { key: 'shops', label: 'Shops', icon: Building2, color: '#0891b2' },
];

export default function PlanUsageScreen() {
  const { t } = useTranslation();
  const router = useRouter();
  const [refreshing, setRefreshing] = useState(false);

  const { data, refetch } = useQuery({
    queryKey: ['plan-usage'],
    queryFn: async () => {
      try {
        return await planUsageApi.get();
      } catch {
        return null;
      }
    },
  });

  const onRefresh = async () => {
    setRefreshing(true);
    await refetch();
    setRefreshing(false);
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
          <ArrowLeft size={20} color="#16a34a" />
        </Pressable>
        <View className="flex-1">
          <Text className="text-2xl font-extrabold text-neutral-900 dark:text-white">{t('auto.index.plan_usage')}</Text>
          <View className="flex-row items-center gap-1.5 mt-0.5">
            <Sparkles size={11} color="#16a34a" />
            <Text className="text-xs text-neutral-500">{t('auto.index.track_your_limits')}</Text>
          </View>
        </View>
      </View>

      <ScrollView
        contentContainerStyle={{ paddingBottom: 40 }}
        refreshControl={<RefreshControl refreshing={refreshing} onRefresh={onRefresh} tintColor="#16a34a" />}
        showsVerticalScrollIndicator={false}
      >
        {/* Plan Card */}
        <View className="px-5 mb-4">
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
            <View className="flex-row items-center gap-3">
              <View className="h-14 w-14 rounded-2xl bg-white/20 items-center justify-center">
                <Crown size={28} color="#fde68a" fill="#fde68a" />
              </View>
              <View className="flex-1">
                <Text className="text-xs font-bold uppercase tracking-wider text-white/80">{t('auto.index.current_plan')}</Text>
                <Text className="text-2xl font-extrabold text-white">
                  {data?.plan?.name || 'Free'}
                </Text>
                <Text className="text-xs text-white/80 mt-0.5">{t('auto.index.track_usage_vs_limits')}</Text>
              </View>
            </View>
            <Pressable
              onPress={() => {
                Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
                router.push('/plan');
              }}
              className="mt-4 h-11 rounded-xl bg-white items-center justify-center flex-row gap-2"
            >
              <Sparkles size={16} color="#16a34a" />
              <Text className="font-extrabold text-base text-emerald-700">{t('auto.index.upgrade_plan')}</Text>
            </Pressable>
          </View>
        </View>

        {/* Usage Bars */}
        <View className="px-5">
          <Text className="text-xs font-bold uppercase tracking-wider text-neutral-500 mb-2">{t('auto.index.usage')}</Text>
          <View className="gap-3">
            {usageItems.map((item) => {
              const Icon = item.icon;
              const usage = (data?.usage as any)?.[item.key];
              const current = usage?.current ?? 0;
              const limit = usage?.limit ?? 0;
              const percent = usage?.percent ?? 0;
              const unlimited = limit === -1 || limit === 999999;
              const warningColor =
                percent >= 90 ? '#dc2626' : percent >= 75 ? '#f59e0b' : item.color;

              return (
                <View
                  key={item.key}
                  className="rounded-2xl bg-white dark:bg-neutral-900 border border-neutral-200 dark:border-neutral-800 p-4"
                >
                  <View className="flex-row items-center gap-3 mb-3">
                    <View
                      className="h-12 w-12 rounded-2xl items-center justify-center"
                      style={{ backgroundColor: `${item.color}20` }}
                    >
                      <Icon size={20} color={item.color} />
                    </View>
                    <View className="flex-1">
                      <Text className="font-bold text-neutral-900 dark:text-white">
                        {item.label}
                      </Text>
                      <Text className="text-xs text-neutral-500 mt-0.5">
                        {current.toLocaleString()} {unlimited ? '(unlimited)' : `/ ${limit.toLocaleString()}`}
                      </Text>
                    </View>
                    {!unlimited && (
                      <View
                        className="px-2 py-0.5 rounded-md"
                        style={{ backgroundColor: `${warningColor}15` }}
                      >
                        <Text
                          className="text-xs font-extrabold"
                          style={{ color: warningColor }}
                        >
                          {percent.toFixed(0)}%
                        </Text>
                      </View>
                    )}
                  </View>

                  {!unlimited && (
                    <>
                      <View className="h-2 bg-neutral-100 rounded-full overflow-hidden">
                        <View
                          className="h-full rounded-full"
                          style={{
                            width: `${Math.min(100, percent)}%`,
                            backgroundColor: warningColor,
                          }}
                        />
                      </View>

                      {percent >= 90 && (
                        <View className="mt-2 flex-row items-center gap-1.5">
                          <AlertTriangle size={11} color="#dc2626" />
                          <Text className="text-[11px] text-rose-700 font-bold">{t('auto.index.approaching_limit_consider_upgrading')}</Text>
                        </View>
                      )}
                    </>
                  )}
                </View>
              );
            })}
          </View>
        </View>
      </ScrollView>
    </SafeAreaView>
  );
}
