import { useState } from 'react';
import {
  View, Text, ScrollView, Pressable, RefreshControl,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { useRouter, Stack } from 'expo-router';
import { useQuery } from '@tanstack/react-query';
import * as Haptics from 'expo-haptics';
import {
  ArrowLeft, Award, Star, TrendingUp, Gift, Crown, Sparkles,
  Users, ChevronRight, Trophy, Medal,
} from 'lucide-react-native';
import { loyaltyApi } from '@/api/loyalty.api';
import { formatPKRFull } from '@/lib/format';

import { useTranslation } from '@/i18n/useTranslation';
export default function LoyaltyScreen() {
  const { t } = useTranslation();
  const router = useRouter();
  const [refreshing, setRefreshing] = useState(false);

  const { data, refetch } = useQuery({
    queryKey: ['loyalty-leaderboard'],
    queryFn: async () => {
      try {
        return await loyaltyApi.leaderboard();
      } catch {
        return { topCustomers: [], totalEarned: 0, totalRedeemed: 0 };
      }
    },
  });

  const onRefresh = async () => {
    setRefreshing(true);
    await refetch();
    setRefreshing(false);
  };

  const topCustomers = data?.topCustomers ?? [];
  const totalEarned = data?.totalEarned ?? 0;
  const totalRedeemed = data?.totalRedeemed ?? 0;

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
          <Text className="text-2xl font-extrabold text-neutral-900 dark:text-white">{t('auto.section.loyalty_points')}</Text>
          <View className="flex-row items-center gap-1.5 mt-0.5">
            <Sparkles size={11} color="#f59e0b" />
            <Text className="text-xs text-neutral-500">{t('auto.index.customer_rewards_program')}</Text>
          </View>
        </View>
      </View>

      <ScrollView
        contentContainerStyle={{ paddingBottom: 40 }}
        refreshControl={
          <RefreshControl
            refreshing={refreshing}
            onRefresh={onRefresh}
            tintColor="#16a34a"
          />
        }
        showsVerticalScrollIndicator={false}
      >
        {/* Hero Card */}
        <View className="px-5 mb-4">
          <View
            className="rounded-3xl p-5 overflow-hidden"
            style={{
              backgroundColor: '#f59e0b',
              shadowColor: '#f59e0b',
              shadowOpacity: 0.3,
              shadowRadius: 16,
              shadowOffset: { width: 0, height: 8 },
              elevation: 10,
            }}
          >
            <View className="flex-row items-center gap-3 mb-3">
              <View className="h-14 w-14 rounded-2xl bg-white/20 items-center justify-center">
                <Award size={28} color="#ffffff" />
              </View>
              <View className="flex-1">
                <Text className="text-xs font-bold uppercase tracking-wider text-white/80">{t('auto.index.total_points_pool')}</Text>
                <Text className="text-3xl font-extrabold text-white mt-0.5">
                  {totalEarned.toLocaleString()}
                </Text>
              </View>
            </View>
            <View className="pt-3 border-t border-white/20 flex-row items-center justify-between">
              <View>
                <Text className="text-[10px] font-bold uppercase tracking-wider text-white/70">{t('auto.index.earned')}</Text>
                <Text className="text-base font-extrabold text-white mt-0.5">
                  {totalEarned.toLocaleString()}
                </Text>
              </View>
              <View>
                <Text className="text-[10px] font-bold uppercase tracking-wider text-white/70">{t('auto.index.redeemed')}</Text>
                <Text className="text-base font-extrabold text-white mt-0.5">
                  {totalRedeemed.toLocaleString()}
                </Text>
              </View>
              <View>
                <Text className="text-[10px] font-bold uppercase tracking-wider text-white/70">{t('auto.index.active')}</Text>
                <Text className="text-base font-extrabold text-white mt-0.5">
                  {topCustomers.length}
                </Text>
              </View>
            </View>
          </View>
        </View>

        {/* How It Works */}
        <View className="px-5 mb-4">
          <View className="rounded-2xl bg-white dark:bg-neutral-900 border border-neutral-200 dark:border-neutral-800 p-4">
            <View className="flex-row items-center gap-2 mb-3">
              <Gift size={16} color="#f59e0b" />
              <Text className="text-base font-extrabold text-neutral-900 dark:text-white">{t('auto.index.loyalty_kaise_kaam_karta_hai')}</Text>
            </View>
            <View className="gap-2.5">
              <View className="flex-row gap-3">
                <View
                  className="h-7 w-7 rounded-full items-center justify-center"
                  style={{ backgroundColor: '#dcfce7' }}
                >
                  <Text className="text-xs font-extrabold text-emerald-700">1</Text>
                </View>
                <View className="flex-1">
                  <Text className="text-sm font-bold text-neutral-900 dark:text-white">{t('auto.index.customer_khareeday')}</Text>
                  <Text className="text-xs text-neutral-500 mt-0.5">{t('auto.index.har_sale_par_customer_ko_points_milte_ha')}</Text>
                </View>
              </View>
              <View className="flex-row gap-3">
                <View
                  className="h-7 w-7 rounded-full items-center justify-center"
                  style={{ backgroundColor: '#dbeafe' }}
                >
                  <Text className="text-xs font-extrabold text-blue-700">2</Text>
                </View>
                <View className="flex-1">
                  <Text className="text-sm font-bold text-neutral-900 dark:text-white">{t('auto.index.points_jama_hote_hain')}</Text>
                  <Text className="text-xs text-neutral-500 mt-0.5">{t('auto.index.account_mein_points_kabhi_expire_nahi_ho')}</Text>
                </View>
              </View>
              <View className="flex-row gap-3">
                <View
                  className="h-7 w-7 rounded-full items-center justify-center"
                  style={{ backgroundColor: '#fef3c7' }}
                >
                  <Text className="text-xs font-extrabold text-amber-700">3</Text>
                </View>
                <View className="flex-1">
                  <Text className="text-sm font-bold text-neutral-900 dark:text-white">{t('auto.index.next_sale_par_redeem')}</Text>
                  <Text className="text-xs text-neutral-500 mt-0.5">{t('auto.index.customer_points_use_karke_discount_le_sa')}</Text>
                </View>
              </View>
            </View>
          </View>
        </View>

        {/* Top Customers */}
        <View className="px-5">
          <View className="flex-row items-center gap-2 mb-3">
            <Trophy size={18} color="#f59e0b" />
            <Text className="text-base font-extrabold text-neutral-900 dark:text-white">{t('auto.index.top_loyalty_customers')}</Text>
          </View>

          {topCustomers.length === 0 ? (
            <View className="rounded-2xl bg-white dark:bg-neutral-900 border border-neutral-200 dark:border-neutral-800 items-center py-10">
              <View className="h-16 w-16 rounded-3xl bg-amber-100 dark:bg-amber-950/40 items-center justify-center">
                <Award size={32} color="#f59e0b" />
              </View>
              <Text className="mt-3 text-base font-bold text-neutral-700 dark:text-neutral-300">{t('auto.index.no_loyalty_customers_yet')}</Text>
              <Text className="mt-1 text-xs text-neutral-500 text-center px-8">{t('auto.index.settings_mein_loyalty_enable_karein_cust')}</Text>
            </View>
          ) : (
            <View className="gap-2">
              {topCustomers.map((customer, idx) => {
                const position = idx + 1;
                const isTop3 = position <= 3;
                const medalColor =
                  position === 1
                    ? '#f59e0b'
                    : position === 2
                    ? '#737373'
                    : position === 3
                    ? '#ea580c'
                    : '#9ca3af';
                const medalBg =
                  position === 1
                    ? '#fef3c7'
                    : position === 2
                    ? '#f3f4f6'
                    : position === 3
                    ? '#ffedd5'
                    : '#f3f4f6';

                return (
                  <Pressable
                    key={customer.id}
                    onPress={() => {
                      Haptics.selectionAsync();
                      router.push(`/customers/${customer.id}`);
                    }}
                    className="rounded-2xl bg-white dark:bg-neutral-900 border border-neutral-200 dark:border-neutral-800 p-3 flex-row items-center gap-3 active:opacity-70"
                  >
                    <View
                      className="h-12 w-12 rounded-2xl items-center justify-center"
                      style={{ backgroundColor: medalBg }}
                    >
                      {isTop3 ? (
                        <Medal size={22} color={medalColor} />
                      ) : (
                        <Text
                          className="text-base font-extrabold"
                          style={{ color: medalColor }}
                        >
                          #{position}
                        </Text>
                      )}
                    </View>
                    <View className="flex-1">
                      <View className="flex-row items-center gap-2">
                        <Text
                          className="font-bold text-neutral-900 dark:text-white"
                          numberOfLines={1}
                        >
                          {customer.name}
                        </Text>
                        {position === 1 && (
                          <Crown size={14} color="#f59e0b" fill="#f59e0b" />
                        )}
                      </View>
                      {customer.phone && (
                        <Text className="text-xs text-neutral-500 mt-0.5">
                          {customer.phone}
                        </Text>
                      )}
                      <Text className="text-[10px] text-neutral-500 mt-0.5">
                        Total spent: {formatPKRFull(customer.totalSpent)}
                      </Text>
                    </View>
                    <View className="items-end">
                      <View className="flex-row items-center gap-1">
                        <Star size={14} color="#f59e0b" fill="#f59e0b" />
                        <Text className="text-lg font-extrabold text-amber-700">
                          {customer.loyaltyPoints.toLocaleString()}
                        </Text>
                      </View>
                      <Text className="text-[9px] text-neutral-500 font-bold uppercase">{t('auto.index.points')}</Text>
                    </View>
                    <ChevronRight size={16} color="#9ca3af" />
                  </Pressable>
                );
              })}
            </View>
          )}
        </View>
      </ScrollView>
    </SafeAreaView>
  );
}
