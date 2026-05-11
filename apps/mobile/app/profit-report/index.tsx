import { useState } from 'react';
import {
  View, Text, ScrollView, Pressable, RefreshControl,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { useRouter, Stack } from 'expo-router';
import { useQuery } from '@tanstack/react-query';
import * as Haptics from 'expo-haptics';
import {
  ArrowLeft, TrendingUp, Sparkles, Package, BarChart3,
  Crown, TrendingDown, DollarSign, ChevronRight, Award,
} from 'lucide-react-native';
import { profitReportApi } from '@/api/profit-report.api';
import { formatPKRFull } from '@/lib/format';

import { useTranslation } from '@/i18n/useTranslation';
export default function ProfitReportScreen() {
  const { t } = useTranslation();
  const router = useRouter();
  const [refreshing, setRefreshing] = useState(false);

  const { data: summary, refetch: refetchSummary } = useQuery({
    queryKey: ['profit-summary'],
    queryFn: async () => {
      try {
        return await profitReportApi.summary();
      } catch {
        return null;
      }
    },
  });

  const { data: products = [], refetch: refetchProducts } = useQuery({
    queryKey: ['profit-by-product'],
    queryFn: async () => {
      try {
        const r = await profitReportApi.byProduct();
        return Array.isArray(r) ? r : [];
      } catch {
        return [];
      }
    },
  });

  const onRefresh = async () => {
    setRefreshing(true);
    await Promise.all([refetchSummary(), refetchProducts()]);
    setRefreshing(false);
  };

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
          <Text className="text-2xl font-extrabold text-neutral-900 dark:text-white">{t('auto.index.profit_report')}</Text>
          <View className="flex-row items-center gap-1.5 mt-0.5">
            <Sparkles size={11} color="#16a34a" />
            <Text className="text-xs text-neutral-500">{t('auto.index.profit_analysis_by_product')}</Text>
          </View>
        </View>
      </View>

      <ScrollView
        contentContainerStyle={{ paddingBottom: 40 }}
        refreshControl={
          <RefreshControl refreshing={refreshing} onRefresh={onRefresh} tintColor="#16a34a" />
        }
        showsVerticalScrollIndicator={false}
      >
        {/* Hero */}
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
            <View className="flex-row items-center gap-3 mb-3">
              <View className="h-14 w-14 rounded-2xl bg-white/20 items-center justify-center">
                <TrendingUp size={28} color="#ffffff" />
              </View>
              <View className="flex-1">
                <Text className="text-xs font-bold uppercase tracking-wider text-white/80">{t('auto.index.total_profit')}</Text>
                <Text className="text-3xl font-extrabold text-white">
                  {formatPKRFull(summary?.totalProfit ?? 0)}
                </Text>
                <Text className="text-xs text-white/80 mt-0.5">
                  {summary?.overallMargin.toFixed(1)}% margin
                </Text>
              </View>
            </View>
            <View className="pt-3 border-t border-white/20 flex-row items-center justify-between">
              <View>
                <Text className="text-[10px] font-bold uppercase tracking-wider text-white/70">{t('auto.index.revenue')}</Text>
                <Text className="text-base font-extrabold text-white mt-0.5">
                  {formatPKRFull(summary?.totalRevenue ?? 0)}
                </Text>
              </View>
              <View>
                <Text className="text-[10px] font-bold uppercase tracking-wider text-white/70">{t('auto.index.cost')}</Text>
                <Text className="text-base font-extrabold text-white mt-0.5">
                  {formatPKRFull(summary?.totalCost ?? 0)}
                </Text>
              </View>
              <View>
                <Text className="text-[10px] font-bold uppercase tracking-wider text-white/70">{t('auto.products.products')}</Text>
                <Text className="text-base font-extrabold text-white mt-0.5">
                  {summary?.productsCount ?? 0}
                </Text>
              </View>
            </View>
          </View>
        </View>

        {/* Top Performers */}
        {summary?.topProfitable && summary.topProfitable.length > 0 && (
          <View className="px-5 mb-4">
            <View className="flex-row items-center gap-2 mb-3">
              <Award size={18} color="#f59e0b" />
              <Text className="text-base font-extrabold text-neutral-900 dark:text-white">{t('auto.index.top_5_profitable')}</Text>
            </View>
            <View className="gap-2">
              {summary.topProfitable.map((p, idx) => (
                <View
                  key={p.productId}
                  className="rounded-2xl bg-white dark:bg-neutral-900 border border-neutral-200 dark:border-neutral-800 p-3 flex-row items-center gap-3"
                >
                  <View
                    className="h-10 w-10 rounded-2xl items-center justify-center"
                    style={{
                      backgroundColor:
                        idx === 0 ? '#fef3c7' : idx === 1 ? '#f3f4f6' : idx === 2 ? '#ffedd5' : '#dcfce7',
                    }}
                  >
                    {idx < 3 ? (
                      <Crown
                        size={18}
                        color={idx === 0 ? '#f59e0b' : idx === 1 ? '#737373' : '#ea580c'}
                        fill={idx === 0 ? '#f59e0b' : idx === 1 ? '#737373' : '#ea580c'}
                      />
                    ) : (
                      <Text className="font-extrabold text-emerald-700">#{idx + 1}</Text>
                    )}
                  </View>
                  <View className="flex-1">
                    <Text
                      className="font-bold text-neutral-900 dark:text-white text-sm"
                      numberOfLines={1}
                    >
                      {p.name}
                    </Text>
                    <Text className="text-[10px] text-neutral-500 mt-0.5">
                      {p.quantitySold} {p.unit} • {p.margin.toFixed(1)}% margin
                    </Text>
                  </View>
                  <View className="items-end">
                    <Text className="text-base font-extrabold text-emerald-700">
                      {formatPKRFull(p.profit)}
                    </Text>
                    <Text className="text-[9px] text-neutral-500 font-bold uppercase">
                      profit
                    </Text>
                  </View>
                </View>
              ))}
            </View>
          </View>
        )}

        {/* All Products */}
        <View className="px-5">
          <View className="flex-row items-center gap-2 mb-3">
            <BarChart3 size={18} color="#2563eb" />
            <Text className="text-base font-extrabold text-neutral-900 dark:text-white">{t('auto.index.all_products')}</Text>
            <View className="ml-auto px-2 py-0.5 rounded-full bg-blue-100">
              <Text className="text-[10px] font-bold text-blue-700">
                {products.length}
              </Text>
            </View>
          </View>

          {products.length === 0 ? (
            <View className="rounded-2xl bg-white border border-neutral-200 items-center py-12">
              <View className="h-16 w-16 rounded-3xl bg-emerald-100 items-center justify-center">
                <TrendingUp size={32} color="#16a34a" />
              </View>
              <Text className="mt-3 text-base font-bold text-neutral-700">{t('auto.index.no_sales_data_yet')}</Text>
              <Text className="mt-1 text-xs text-neutral-500">{t('auto.index.sales_hone_par_profit_calculate_hoga')}</Text>
            </View>
          ) : (
            <View className="gap-2">
              {products.map((p) => {
                const profitable = p.profit > 0;
                const marginColor =
                  p.margin > 30 ? '#16a34a' : p.margin > 10 ? '#f59e0b' : '#dc2626';
                return (
                  <Pressable
                    key={p.productId}
                    onPress={() => {
                      Haptics.selectionAsync();
                      router.push(`/products/${p.productId}`);
                    }}
                    className="rounded-2xl bg-white dark:bg-neutral-900 border border-neutral-200 dark:border-neutral-800 p-3 active:opacity-70"
                  >
                    <View className="flex-row items-center gap-3">
                      <View
                        className="h-11 w-11 rounded-2xl items-center justify-center"
                        style={{
                          backgroundColor: p.categoryColor
                            ? `${p.categoryColor}20`
                            : '#dcfce7',
                        }}
                      >
                        <Package size={18} color={p.categoryColor || '#16a34a'} />
                      </View>
                      <View className="flex-1">
                        <Text
                          className="font-bold text-neutral-900 dark:text-white text-sm"
                          numberOfLines={1}
                        >
                          {p.name}
                        </Text>
                        <View className="flex-row items-center gap-2 mt-0.5">
                          {p.categoryName && (
                            <View
                              className="px-1.5 py-0.5 rounded-md"
                              style={{ backgroundColor: `${p.categoryColor}15` }}
                            >
                              <Text
                                className="text-[9px] font-bold"
                                style={{ color: p.categoryColor || '#737373' }}
                              >
                                {p.categoryName}
                              </Text>
                            </View>
                          )}
                          <Text className="text-[10px] text-neutral-500">
                            {p.quantitySold} {p.unit} sold
                          </Text>
                        </View>
                      </View>
                      <View className="items-end">
                        <Text
                          className="text-base font-extrabold"
                          style={{ color: profitable ? '#15803d' : '#b91c1c' }}
                        >
                          {profitable ? '+' : ''}{formatPKRFull(p.profit)}
                        </Text>
                        <View
                          className="flex-row items-center gap-0.5 mt-0.5 px-1.5 py-0.5 rounded-md"
                          style={{ backgroundColor: `${marginColor}15` }}
                        >
                          {profitable ? (
                            <TrendingUp size={9} color={marginColor} />
                          ) : (
                            <TrendingDown size={9} color={marginColor} />
                          )}
                          <Text
                            className="text-[10px] font-extrabold"
                            style={{ color: marginColor }}
                          >
                            {p.margin.toFixed(1)}%
                          </Text>
                        </View>
                      </View>
                      <ChevronRight size={16} color="#9ca3af" />
                    </View>

                    <View className="mt-2.5 pt-2.5 border-t border-neutral-100 flex-row items-center justify-between">
                      <View>
                        <Text className="text-[9px] text-neutral-500 font-bold uppercase">{t('auto.index.revenue')}</Text>
                        <Text className="text-xs font-bold text-neutral-700 mt-0.5">
                          {formatPKRFull(p.revenue)}
                        </Text>
                      </View>
                      <View>
                        <Text className="text-[9px] text-neutral-500 font-bold uppercase">{t('auto.index.cost')}</Text>
                        <Text className="text-xs font-bold text-neutral-700 mt-0.5">
                          {formatPKRFull(p.cost)}
                        </Text>
                      </View>
                      <View>
                        <Text className="text-[9px] text-neutral-500 font-bold uppercase">{t('auto.index.profit')}</Text>
                        <Text
                          className="text-xs font-bold mt-0.5"
                          style={{ color: profitable ? '#15803d' : '#b91c1c' }}
                        >
                          {formatPKRFull(p.profit)}
                        </Text>
                      </View>
                    </View>
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
