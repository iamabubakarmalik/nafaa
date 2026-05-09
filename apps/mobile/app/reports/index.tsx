import { useState } from 'react';
import { View, Text, ScrollView, Pressable, Dimensions } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { useRouter, Stack } from 'expo-router';
import { useQuery } from '@tanstack/react-query';
import { LineChart } from 'react-native-gifted-charts';
import {
  ArrowLeft,
  TrendingUp,
  DollarSign,
  ShoppingBag,
  Users,
  Award,
} from 'lucide-react-native';
import { Card } from '@/components/ui/Card';
import { reportsApi } from '@/api/reports.api';
import { useThemeStore } from '@/store/theme.store';
import { formatPKRFull, formatPKR } from '@/lib/format';

const { width } = Dimensions.get('window');

export default function ReportsScreen() {
  const router = useRouter();
  const { isDark } = useThemeStore();
  const [period, setPeriod] = useState<'7d' | '30d' | '90d'>('30d');

  const { data } = useQuery({
    queryKey: ['reports', period],
    queryFn: () => reportsApi.summary(period),
  });

  const chartData =
    data?.dailyTrend?.map((d, idx) => ({
      value: d.revenue / 1000,
      label: idx % 5 === 0 ? d.date.slice(5) : '',
      labelTextStyle: { color: isDark ? '#a3a3a3' : '#6b7280', fontSize: 9 },
    })) ?? [];

  const stats = [
    {
      label: 'Revenue',
      value: formatPKR(data?.totalRevenue ?? 0),
      icon: DollarSign,
      bg: 'bg-emerald-50 dark:bg-emerald-950/40',
      color: '#16a34a',
    },
    {
      label: 'Profit',
      value: formatPKR(data?.totalProfit ?? 0),
      icon: TrendingUp,
      bg: 'bg-blue-50 dark:bg-blue-950/40',
      color: '#2563eb',
    },
    {
      label: 'Sales',
      value: String(data?.totalSales ?? 0),
      icon: ShoppingBag,
      bg: 'bg-violet-50 dark:bg-violet-950/40',
      color: '#8b5cf6',
    },
    {
      label: 'Customers',
      value: String(data?.totalCustomers ?? 0),
      icon: Users,
      bg: 'bg-amber-50 dark:bg-amber-950/40',
      color: '#f59e0b',
    },
  ];

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
          <Text className="text-2xl font-bold text-neutral-900 dark:text-white">Reports</Text>
          <Text className="text-xs text-neutral-500">Business insights</Text>
        </View>
      </View>

      <View className="px-5 pb-3 flex-row gap-2">
        {(['7d', '30d', '90d'] as const).map((p) => (
          <Pressable
            key={p}
            onPress={() => setPeriod(p)}
            className={`flex-1 py-2.5 rounded-xl ${
              period === p
                ? 'bg-brand-600'
                : 'bg-white dark:bg-neutral-900 border border-neutral-200 dark:border-neutral-800'
            }`}
          >
            <Text
              className={`text-center text-sm font-bold ${
                period === p ? 'text-white' : 'text-neutral-700 dark:text-neutral-300'
              }`}
            >
              {p === '7d' ? '7 Days' : p === '30d' ? '30 Days' : '90 Days'}
            </Text>
          </Pressable>
        ))}
      </View>

      <ScrollView contentContainerStyle={{ paddingBottom: 40 }} showsVerticalScrollIndicator={false}>
        <View className="px-5">
          <View className="flex-row flex-wrap -mx-1.5">
            {stats.map((s) => {
              const Icon = s.icon;
              return (
                <View key={s.label} className="w-1/2 px-1.5 mb-3">
                  <Card variant="outline" className="p-4">
                    <View className={`h-10 w-10 rounded-xl ${s.bg} items-center justify-center`}>
                      <Icon size={20} color={s.color} />
                    </View>
                    <Text className="mt-3 text-xs text-neutral-500 font-semibold uppercase tracking-wide">
                      {s.label}
                    </Text>
                    <Text className="mt-1 text-xl font-bold text-neutral-900 dark:text-white">
                      {s.value}
                    </Text>
                  </Card>
                </View>
              );
            })}
          </View>
        </View>

        <View className="px-5 mt-2">
          <Card variant="outline" className="p-4">
            <Text className="text-base font-bold text-neutral-900 dark:text-white mb-1">
              Revenue Trend
            </Text>
            <Text className="text-xs text-neutral-500 mb-4">in thousands (k)</Text>
            {chartData.length > 0 ? (
              <LineChart
                data={chartData}
                width={width - 80}
                height={180}
                color="#16a34a"
                thickness={3}
                hideDataPoints={false}
                dataPointsColor="#16a34a"
                dataPointsRadius={3}
                yAxisColor={isDark ? '#404040' : '#e5e7eb'}
                xAxisColor={isDark ? '#404040' : '#e5e7eb'}
                yAxisTextStyle={{ color: isDark ? '#a3a3a3' : '#6b7280', fontSize: 10 }}
                rulesColor={isDark ? '#262626' : '#f3f4f6'}
                rulesType="dashed"
                areaChart
                startFillColor="#16a34a"
                startOpacity={0.3}
                endFillColor="#16a34a"
                endOpacity={0.05}
                noOfSections={4}
                spacing={(width - 80) / Math.max(chartData.length - 1, 1)}
                initialSpacing={10}
              />
            ) : (
              <View className="h-44 items-center justify-center">
                <Text className="text-neutral-500 text-sm">No data for this period</Text>
              </View>
            )}
          </Card>
        </View>

        <View className="px-5 mt-3">
          <View className="flex-row items-center gap-2 mb-3">
            <Award size={18} color="#f59e0b" />
            <Text className="text-base font-bold text-neutral-900 dark:text-white">
              Top Products
            </Text>
          </View>
          <Card variant="outline" className="p-0">
            {(data?.topProducts ?? []).slice(0, 5).map((p, idx) => (
              <View
                key={p.id}
                className={`flex-row items-center px-4 py-3 ${
                  idx !== Math.min((data?.topProducts?.length ?? 1) - 1, 4)
                    ? 'border-b border-neutral-100 dark:border-neutral-800'
                    : ''
                }`}
              >
                <View
                  className={`h-9 w-9 rounded-xl items-center justify-center ${
                    idx === 0
                      ? 'bg-amber-100 dark:bg-amber-950/40'
                      : idx === 1
                        ? 'bg-neutral-200 dark:bg-neutral-700'
                        : idx === 2
                          ? 'bg-orange-100 dark:bg-orange-950/40'
                          : 'bg-neutral-100 dark:bg-neutral-800'
                  }`}
                >
                  <Text className="font-bold text-sm text-neutral-700 dark:text-neutral-200">
                    #{idx + 1}
                  </Text>
                </View>
                <View className="flex-1 ml-3 min-w-0">
                  <Text
                    className="font-semibold text-neutral-900 dark:text-white"
                    numberOfLines={1}
                  >
                    {p.name}
                  </Text>
                  <Text className="text-xs text-neutral-500">{p.sold} sold</Text>
                </View>
                <Text className="font-bold text-emerald-700 dark:text-emerald-400">
                  {formatPKR(p.revenue)}
                </Text>
              </View>
            ))}
            {(!data?.topProducts || data.topProducts.length === 0) && (
              <View className="py-8 items-center">
                <Text className="text-neutral-500 text-sm">No products sold yet</Text>
              </View>
            )}
          </Card>
        </View>
      </ScrollView>
    </SafeAreaView>
  );
}
