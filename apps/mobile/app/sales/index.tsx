import { useState } from 'react';
import {
  View,
  Text,
  FlatList,
  Pressable,
  RefreshControl,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { useRouter, Stack } from 'expo-router';
import { useQuery } from '@tanstack/react-query';
import {
  Search,
  Receipt,
  ArrowLeft,
  Calendar,
  CreditCard,
  ChevronRight,
} from 'lucide-react-native';
import { Card } from '@/components/ui/Card';
import { Badge } from '@/components/ui/Badge';
import { Input } from '@/components/ui/Input';
import { salesApi } from '@/api/sales.api';
import { formatPKRFull, formatRelative } from '@/lib/format';

import { useTranslation } from '@/i18n/useTranslation';
const statusColors: Record<string, 'success' | 'warning' | 'danger' | 'info'> = {
  COMPLETED: 'success',
  PARTIALLY_RETURNED: 'warning',
  FULLY_RETURNED: 'danger',
  VOIDED: 'danger',
};

export default function SalesScreen() {
  const { t } = useTranslation();
  const router = useRouter();
  const [search, setSearch] = useState('');
  const [refreshing, setRefreshing] = useState(false);

  const { data, refetch } = useQuery({
    queryKey: ['sales', search],
    queryFn: () => salesApi.list({ search: search || undefined, limit: 50 }),
  });

  const onRefresh = async () => {
    setRefreshing(true);
    await refetch();
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
          <Text className="text-2xl font-bold text-neutral-900 dark:text-white">{t('auto.index.sales_history')}</Text>
          <Text className="text-xs text-neutral-500 mt-0.5">
            {data?.meta?.total ?? 0} total sales
          </Text>
        </View>
      </View>

      {/* Search */}
      <View className="px-5 pb-3">
        <Input
          placeholder="Search by sale number..."
          value={search}
          onChangeText={setSearch}
          leftIcon={<Search size={20} color="#9ca3af" />}
        />
      </View>

      {/* List */}
      <FlatList
        data={data?.items ?? []}
        keyExtractor={(s) => s.id}
        contentContainerStyle={{ paddingHorizontal: 20, paddingBottom: 80 }}
        refreshControl={
          <RefreshControl refreshing={refreshing} onRefresh={onRefresh} tintColor="#16a34a" />
        }
        ListEmptyComponent={
          <View className="items-center py-20">
            <Receipt size={48} color="#d1d5db" />
            <Text className="mt-4 text-base font-semibold text-neutral-700 dark:text-neutral-300">{t('auto.index.no_sales_yet')}</Text>
          </View>
        }
        ItemSeparatorComponent={() => <View className="h-2.5" />}
        renderItem={({ item }) => (
          <Pressable
            onPress={() => router.push(`/sales/${item.id}`)}
            className="active:opacity-70"
          >
            <Card variant="outline" className="p-3">
              <View className="flex-row items-center gap-3">
                <View className="h-12 w-12 rounded-2xl bg-emerald-100 dark:bg-emerald-950/40 items-center justify-center">
                  <Receipt size={20} color="#16a34a" />
                </View>

                <View className="flex-1 min-w-0">
                  <View className="flex-row items-center gap-2">
                    <Text
                      className="font-bold text-neutral-900 dark:text-white"
                      numberOfLines={1}
                    >
                      {item.saleNumber}
                    </Text>
                    <Badge variant={statusColors[item.status] || 'neutral'} size="sm">
                      {item.status}
                    </Badge>
                  </View>
                  <View className="flex-row items-center gap-2 mt-0.5">
                    <Text className="text-xs text-neutral-500">
                      {item.customer?.name || 'Walk-in'}
                    </Text>
                    <Text className="text-xs text-neutral-400">•</Text>
                    <Text className="text-xs text-neutral-500">
                      {formatRelative(item.soldAt)}
                    </Text>
                  </View>
                  <View className="flex-row items-center gap-1 mt-0.5">
                    <CreditCard size={11} color="#9ca3af" />
                    <Text className="text-xs text-neutral-500">
                      {item.paymentMethod}
                    </Text>
                  </View>
                </View>

                <View className="items-end">
                  <Text className="font-bold text-emerald-700 dark:text-emerald-400 text-base">
                    {formatPKRFull(item.total)}
                  </Text>
                  {item.creditAmount > 0 && (
                    <Text className="text-xs text-amber-600 mt-0.5">
                      Credit: {formatPKRFull(item.creditAmount)}
                    </Text>
                  )}
                </View>
                <ChevronRight size={18} color="#9ca3af" />
              </View>
            </Card>
          </Pressable>
        )}
      />
    </SafeAreaView>
  );
}
