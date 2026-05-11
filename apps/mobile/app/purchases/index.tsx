import { useState } from 'react';
import {
  View, Text, ScrollView, Pressable, RefreshControl,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { useRouter, Stack } from 'expo-router';
import { useQuery } from '@tanstack/react-query';
import * as Haptics from 'expo-haptics';
import {
  ArrowLeft, PackagePlus, Sparkles, Plus, Truck, CalendarClock,
  Package, ChevronRight, TrendingUp, Wallet, Receipt,
} from 'lucide-react-native';
import { purchasesApi } from '@/api/purchases.api';
import { formatPKRFull } from '@/lib/format';

import { useTranslation } from '@/i18n/useTranslation';
const formatDate = (v: string) =>
  new Intl.DateTimeFormat('en-PK', {
    dateStyle: 'medium',
    timeStyle: 'short',
  }).format(new Date(v));

export default function PurchasesScreen() {
  const { t } = useTranslation();
  const router = useRouter();
  const [refreshing, setRefreshing] = useState(false);

  const { data: purchases = [], refetch: refetchList } = useQuery({
    queryKey: ['purchases'],
    queryFn: async () => {
      try {
        const r = await purchasesApi.list();
        return Array.isArray(r) ? r : [];
      } catch {
        return [];
      }
    },
  });

  const { data: summary, refetch: refetchSummary } = useQuery({
    queryKey: ['purchases-summary'],
    queryFn: async () => {
      try {
        return await purchasesApi.summary();
      } catch {
        return null;
      }
    },
  });

  const onRefresh = async () => {
    setRefreshing(true);
    await Promise.all([refetchList(), refetchSummary()]);
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
          <Text className="text-2xl font-extrabold text-neutral-900 dark:text-white">{t('auto.index.purchases')}</Text>
          <View className="flex-row items-center gap-1.5 mt-0.5">
            <Sparkles size={11} color="#7c3aed" />
            <Text className="text-xs text-neutral-500">
              {summary?.totalCount ?? 0} purchase orders
            </Text>
          </View>
        </View>
        <Pressable
          onPress={() => {
            Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
            router.push('/purchases/new');
          }}
          className="h-11 px-4 rounded-2xl flex-row items-center gap-1.5 active:opacity-80"
          style={{
            backgroundColor: '#7c3aed',
            shadowColor: '#7c3aed',
            shadowOpacity: 0.3,
            shadowRadius: 8,
            elevation: 4,
          }}
        >
          <Plus size={16} color="#ffffff" />
          <Text className="text-white font-bold text-sm">{t('auto.index.new')}</Text>
        </Pressable>
      </View>

      <ScrollView
        contentContainerStyle={{ paddingBottom: 40 }}
        refreshControl={
          <RefreshControl refreshing={refreshing} onRefresh={onRefresh} tintColor="#7c3aed" />
        }
        showsVerticalScrollIndicator={false}
      >
        {/* Hero */}
        <View className="px-5 mb-4">
          <View
            className="rounded-3xl p-5"
            style={{
              backgroundColor: '#7c3aed',
              shadowColor: '#7c3aed',
              shadowOpacity: 0.3,
              shadowRadius: 16,
              shadowOffset: { width: 0, height: 8 },
              elevation: 10,
            }}
          >
            <View className="flex-row items-center gap-3 mb-3">
              <View className="h-14 w-14 rounded-2xl bg-white/20 items-center justify-center">
                <PackagePlus size={28} color="#ffffff" />
              </View>
              <View className="flex-1">
                <Text className="text-xs font-bold uppercase tracking-wider text-white/80">{t('auto.index.total_purchases')}</Text>
                <Text className="text-3xl font-extrabold text-white">
                  {formatPKRFull(summary?.totalPurchases ?? 0)}
                </Text>
                <Text className="text-xs text-white/80 mt-0.5">
                  {summary?.totalCount ?? 0} orders
                </Text>
              </View>
            </View>
            <View className="pt-3 border-t border-white/20 flex-row items-center justify-between">
              <View>
                <Text className="text-[10px] font-bold uppercase tracking-wider text-white/70">{t('auto.index.today')}</Text>
                <Text className="text-base font-extrabold text-white mt-0.5">
                  {formatPKRFull(summary?.todayPurchases ?? 0)}
                </Text>
              </View>
              <View>
                <Text className="text-[10px] font-bold uppercase tracking-wider text-white/70">{t('auto.index.this_month')}</Text>
                <Text className="text-base font-extrabold text-white mt-0.5">
                  {formatPKRFull(summary?.monthPurchases ?? 0)}
                </Text>
              </View>
              <View>
                <Text className="text-[10px] font-bold uppercase tracking-wider text-white/70">{t('auto.index.today_count')}</Text>
                <Text className="text-base font-extrabold text-white mt-0.5">
                  {summary?.todayCount ?? 0}
                </Text>
              </View>
            </View>
          </View>
        </View>

        {/* List */}
        <View className="px-5">
          {purchases.length === 0 ? (
            <View className="rounded-2xl bg-white dark:bg-neutral-900 border border-neutral-200 dark:border-neutral-800 items-center py-12">
              <View className="h-16 w-16 rounded-3xl bg-violet-100 items-center justify-center">
                <PackagePlus size={32} color="#7c3aed" />
              </View>
              <Text className="mt-3 text-base font-bold text-neutral-700">{t('auto.index.no_purchases_yet')}</Text>
              <Text className="mt-1 text-xs text-neutral-500">{t('auto.index.stock_incoming_record_karein')}</Text>
              <Pressable
                onPress={() => router.push('/purchases/new')}
                className="mt-4 h-10 px-5 rounded-xl flex-row items-center gap-1.5"
                style={{ backgroundColor: '#7c3aed' }}
              >
                <Plus size={16} color="#ffffff" />
                <Text className="text-white font-bold text-sm">{t('auto.new.new_purchase')}</Text>
              </Pressable>
            </View>
          ) : (
            <View className="gap-2.5">
              {purchases.map((p) => {
                const credit = Math.max(0, p.total - p.paidAmount);
                return (
                  <Pressable
                    key={p.id}
                    onPress={() => {
                      Haptics.selectionAsync();
                      router.push(`/purchases/${p.id}`);
                    }}
                    className="rounded-2xl bg-white dark:bg-neutral-900 border border-neutral-200 dark:border-neutral-800 p-3.5 active:opacity-70"
                  >
                    <View className="flex-row items-center gap-3">
                      <View className="h-12 w-12 rounded-2xl bg-violet-100 dark:bg-violet-950/40 items-center justify-center">
                        <PackagePlus size={20} color="#7c3aed" />
                      </View>
                      <View className="flex-1">
                        <Text className="font-mono text-sm font-extrabold text-neutral-900 dark:text-white">
                          {p.purchaseNumber}
                        </Text>
                        <View className="flex-row items-center gap-1 mt-0.5">
                          <Truck size={10} color="#737373" />
                          <Text className="text-xs text-neutral-500" numberOfLines={1}>
                            {p.supplier.name}
                          </Text>
                        </View>
                        <View className="flex-row items-center gap-1 mt-0.5">
                          <Package size={10} color="#9ca3af" />
                          <Text className="text-[11px] text-neutral-500">
                            {p.items.length} items
                          </Text>
                          <CalendarClock size={10} color="#9ca3af" />
                          <Text className="text-[10px] text-neutral-500">
                            {formatDate(p.purchasedAt)}
                          </Text>
                        </View>
                      </View>
                      <View className="items-end">
                        <Text className="text-base font-extrabold text-violet-700">
                          {formatPKRFull(p.total)}
                        </Text>
                        <View
                          className="px-1.5 py-0.5 rounded-md mt-0.5"
                          style={{
                            backgroundColor:
                              p.status === 'RECEIVED' ? '#dcfce7' : '#fef3c7',
                          }}
                        >
                          <Text
                            className="text-[9px] font-extrabold"
                            style={{
                              color: p.status === 'RECEIVED' ? '#15803d' : '#b45309',
                            }}
                          >
                            {p.status}
                          </Text>
                        </View>
                      </View>
                      <ChevronRight size={16} color="#9ca3af" />
                    </View>

                    {p.items && p.items.length > 0 && (
                      <View className="mt-2.5 pt-2.5 border-t border-neutral-100 dark:border-neutral-800">
                        {p.items.slice(0, 2).map((item) => (
                          <Text
                            key={item.id}
                            className="text-[11px] text-neutral-600"
                            numberOfLines={1}
                          >
                            • {item.product.name}: {item.quantity} × {formatPKRFull(item.costPrice)}
                          </Text>
                        ))}
                        {p.items.length > 2 && (
                          <Text className="text-[10px] text-neutral-500 mt-0.5">
                            + {p.items.length - 2} more
                          </Text>
                        )}
                      </View>
                    )}

                    {credit > 0 && (
                      <View className="mt-2 px-2 py-1.5 rounded-lg bg-amber-50 flex-row items-center gap-1">
                        <Wallet size={11} color="#b45309" />
                        <Text className="text-[10px] text-amber-700 font-bold">
                          Pending: {formatPKRFull(credit)}
                        </Text>
                      </View>
                    )}
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
