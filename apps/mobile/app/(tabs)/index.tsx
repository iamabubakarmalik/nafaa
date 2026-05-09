import { useState } from 'react';
import {
  View,
  Text,
  ScrollView,
  RefreshControl,
  Pressable,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { useRouter } from 'expo-router';
import { useQuery } from '@tanstack/react-query';
import {
  TrendingUp,
  ShoppingBag,
  Users,
  AlertTriangle,
  Plus,
  Package,
  BarChart3,
  BookOpen,
  ArrowRight,
  Bell,
} from 'lucide-react-native';
import { Card } from '@/components/ui/Card';
import { Badge } from '@/components/ui/Badge';
import { useAuthStore } from '@/store/auth.store';
import { useThemeStore } from '@/store/theme.store';
import { useTranslation } from '@/i18n/useTranslation';
import { dashboardApi } from '@/api/dashboard.api';
import { formatPKR, formatRelative } from '@/lib/format';

export default function HomeScreen() {
  const router = useRouter();
  const { t } = useTranslation();
  const { isDark } = useThemeStore();
  const { user, tenant } = useAuthStore();
  const [refreshing, setRefreshing] = useState(false);

  const { isAuthenticated, isInitialized } = useAuthStore();

const { data, refetch } = useQuery({
  queryKey: ['dashboard-stats'],
  queryFn: dashboardApi.stats,
  enabled: isInitialized && isAuthenticated, // ← only run when auth ready
});


  const onRefresh = async () => {
    setRefreshing(true);
    await refetch();
    setRefreshing(false);
  };

  const statCards = [
    {
      label: t('home.todaySales'),
      value: formatPKR(data?.todaySales ?? 0),
      icon: TrendingUp,
      colors: ['#16a34a', '#22c55e'],
      bg: 'bg-emerald-50 dark:bg-emerald-950/40',
    },
    {
      label: t('home.todayOrders'),
      value: String(data?.todayOrders ?? 0),
      icon: ShoppingBag,
      colors: ['#2563eb', '#3b82f6'],
      bg: 'bg-blue-50 dark:bg-blue-950/40',
    },
    {
      label: t('home.totalCustomers'),
      value: String(data?.totalCustomers ?? 0),
      icon: Users,
      colors: ['#8b5cf6', '#a78bfa'],
      bg: 'bg-violet-50 dark:bg-violet-950/40',
    },
    {
      label: t('home.lowStock'),
      value: String(data?.lowStockCount ?? 0),
      icon: AlertTriangle,
      colors: ['#f59e0b', '#fbbf24'],
      bg: 'bg-amber-50 dark:bg-amber-950/40',
    },
  ];

  const quickActions = [
    {
      label: t('home.newSale'),
      icon: Plus,
      bg: 'bg-brand-600',
      onPress: () => router.push('/(tabs)/pos'),
    },
    {
      label: t('home.addProduct'),
      icon: Package,
      bg: 'bg-violet-600',
      onPress: () => router.push('/(tabs)/products'),
    },
    {
      label: t('home.viewReports'),
      icon: BarChart3,
      bg: 'bg-blue-600',
      onPress: () => {},
    },
    {
      label: t('home.khataBook'),
      icon: BookOpen,
      bg: 'bg-amber-600',
      onPress: () => router.push('/(tabs)/customers'),
    },
  ];

  return (
    <SafeAreaView className="flex-1 bg-neutral-50 dark:bg-neutral-950" edges={['top']}>
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
        {/* Header */}
        <View className="px-5 pt-4 pb-6 flex-row items-center justify-between">
          <View>
            <Text className="text-sm text-neutral-500 dark:text-neutral-400">
              {t('home.greeting')} 👋
            </Text>
            <Text className="text-2xl font-bold text-neutral-900 dark:text-white mt-0.5">
              {user?.fullName?.split(' ')[0] || 'User'}
            </Text>
            <Text className="text-xs text-neutral-500 mt-0.5">
              {tenant?.name}
            </Text>
          </View>
          <Pressable
            onPress={() => router.push('/notifications')}
            className="h-11 w-11 rounded-2xl bg-white dark:bg-neutral-900 items-center justify-center border border-neutral-200 dark:border-neutral-800"
          >
            <Bell size={20} color={isDark ? '#fff' : '#374151'} />
            <View className="absolute top-2 right-2 h-2 w-2 rounded-full bg-red-500" />
          </Pressable>
        </View>

        {/* Stats grid */}
        <View className="px-5">
          <View className="flex-row flex-wrap -mx-1.5">
            {statCards.map((s) => {
              const Icon = s.icon;
              return (
                <View key={s.label} className="w-1/2 px-1.5 mb-3">
                  <Card variant="outline" className="p-4">
                    <View
                      className={`h-10 w-10 rounded-xl ${s.bg} items-center justify-center`}
                    >
                      <Icon size={20} color={s.colors[0]} />
                    </View>
                    <Text className="mt-3 text-xs text-neutral-500 dark:text-neutral-400 font-semibold uppercase tracking-wide">
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

        {/* Quick Actions */}
        <View className="px-5 mt-2">
          <Text className="text-base font-bold text-neutral-900 dark:text-white mb-3">
            {t('home.quickActions')}
          </Text>
          <View className="flex-row flex-wrap -mx-1.5">
            {quickActions.map((a) => {
              const Icon = a.icon;
              return (
                <View key={a.label} className="w-1/2 px-1.5 mb-3">
                  <Pressable
                    onPress={a.onPress}
                    className={`${a.bg} rounded-2xl p-4 active:opacity-80`}
                  >
                    <View className="h-10 w-10 rounded-xl bg-white/20 items-center justify-center">
                      <Icon size={20} color="#ffffff" />
                    </View>
                    <Text className="mt-3 text-white font-bold">{a.label}</Text>
                  </Pressable>
                </View>
              );
            })}
          </View>
        </View>

        {/* Recent Sales */}
        <View className="px-5 mt-4">
          <View className="flex-row items-center justify-between mb-3">
            <Text className="text-base font-bold text-neutral-900 dark:text-white">
              {t('home.recentSales')}
            </Text>
            <Pressable className="flex-row items-center gap-1">
              <Text className="text-sm text-brand-600 dark:text-brand-400 font-semibold">
                See all
              </Text>
              <ArrowRight size={14} color="#16a34a" />
            </Pressable>
          </View>

          {!data?.recentSales || data.recentSales.length === 0 ? (
            <Card variant="outline" className="items-center py-10">
              <ShoppingBag size={40} color="#d1d5db" />
              <Text className="mt-3 text-neutral-500 text-sm">
                {t('home.noSales')}
              </Text>
            </Card>
          ) : (
            <View className="gap-2">
              {data.recentSales.slice(0, 5).map((sale) => (
                <Card key={sale.id} variant="outline" className="p-3">
                  <View className="flex-row items-center justify-between">
                    <View className="flex-row items-center gap-3 flex-1">
                      <View className="h-11 w-11 rounded-2xl bg-brand-100 dark:bg-brand-950/40 items-center justify-center">
                        <ShoppingBag size={18} color="#16a34a" />
                      </View>
                      <View className="flex-1">
                        <Text className="font-semibold text-neutral-900 dark:text-white">
                          {sale.saleNumber}
                        </Text>
                        <Text className="text-xs text-neutral-500 mt-0.5">
                          {sale.customerName || 'Walk-in'} • {formatRelative(sale.soldAt)}
                        </Text>
                      </View>
                    </View>
                    <Text className="font-bold text-emerald-700 dark:text-emerald-400">
                      {formatPKR(sale.total)}
                    </Text>
                  </View>
                </Card>
              ))}
            </View>
          )}
        </View>
      </ScrollView>
    </SafeAreaView>
  );
}
