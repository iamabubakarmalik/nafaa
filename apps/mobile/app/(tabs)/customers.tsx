import { useState } from 'react';
import {
  View, Text, FlatList, Pressable, RefreshControl, Image, ScrollView, Modal,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { useRouter } from 'expo-router';
import { useQuery } from '@tanstack/react-query';
import {
  Search, Users, Plus, Phone, Crown, Wallet, TrendingUp, MapPin,
  Star, SlidersHorizontal, X, MessageCircle, Award, ChevronRight,
} from 'lucide-react-native';
import { Card } from '@/components/ui/Card';
import { Badge } from '@/components/ui/Badge';
import { Input } from '@/components/ui/Input';
import { Button } from '@/components/ui/Button';
import { customersApi, type CustomersListParams } from '@/api/customers.api';
import { formatPKRFull } from '@/lib/format';

import { useTranslation } from '@/i18n/useTranslation';
export default function CustomersScreen() {
  const { t } = useTranslation();
  const router = useRouter();
  const [refreshing, setRefreshing] = useState(false);
  const [showFilters, setShowFilters] = useState(false);
  const [params, setParams] = useState<CustomersListParams>({
    search: '',
    page: 1,
    limit: 50,
    sortBy: 'createdAt',
    sortOrder: 'desc',
  });

  const { data, refetch } = useQuery({
    queryKey: ['customers', params],
    queryFn: () => customersApi.list(params),
  });

  const { data: stats } = useQuery({
    queryKey: ['customers-stats'],
    queryFn: customersApi.stats,
  });

  const onRefresh = async () => {
    setRefreshing(true);
    await Promise.all([refetch()]);
    setRefreshing(false);
  };

  const items = data?.items ?? [];
  const activeFilters = !!(params.isVip || params.hasCredit || params.city);

  return (
    <SafeAreaView className="flex-1 bg-neutral-50 dark:bg-neutral-950" edges={['top']}>
      {/* Header */}
      <View className="px-5 pt-4 pb-3">
        <View className="flex-row items-center justify-between mb-3">
          <View>
            <Text className="text-2xl font-bold text-neutral-900 dark:text-white">{t('auto.index.customers')}</Text>
            <Text className="text-xs text-neutral-500 mt-0.5">
              {stats?.total ?? items.length} total • {stats?.vip ?? 0} VIP
            </Text>
          </View>
          <Pressable
            onPress={() => router.push('/customers/new')}
            className="flex-row items-center gap-2 px-4 h-11 rounded-2xl bg-blue-600 active:opacity-80"
          >
            <Plus size={20} color="#ffffff" />
            <Text className="text-white font-bold">{t('auto.customers.naya')}</Text>
          </Pressable>
        </View>

        {/* Quick stats */}
        {stats && (
          <ScrollView horizontal showsHorizontalScrollIndicator={false}>
            <View className="flex-row gap-2">
              <View className="flex-row items-center gap-1.5 px-3 py-1.5 rounded-full bg-blue-100 dark:bg-blue-950/40">
                <Users size={12} color="#2563eb" />
                <Text className="text-xs font-bold text-blue-700 dark:text-blue-400">
                  {stats.total} total
                </Text>
              </View>
              {stats.vip > 0 && (
                <View className="flex-row items-center gap-1.5 px-3 py-1.5 rounded-full bg-amber-100 dark:bg-amber-950/40">
                  <Crown size={12} color="#b45309" />
                  <Text className="text-xs font-bold text-amber-700 dark:text-amber-400">
                    {stats.vip} VIP
                  </Text>
                </View>
              )}
              {stats.withCredit > 0 && (
                <View className="flex-row items-center gap-1.5 px-3 py-1.5 rounded-full bg-rose-100 dark:bg-rose-950/40">
                  <Wallet size={12} color="#dc2626" />
                  <Text className="text-xs font-bold text-rose-700 dark:text-rose-400">
                    {formatPKRFull(stats.totalDebt)} udhaar
                  </Text>
                </View>
              )}
              {stats.newThisMonth > 0 && (
                <View className="flex-row items-center gap-1.5 px-3 py-1.5 rounded-full bg-emerald-100 dark:bg-emerald-950/40">
                  <TrendingUp size={12} color="#16a34a" />
                  <Text className="text-xs font-bold text-emerald-700 dark:text-emerald-400">
                    +{stats.newThisMonth} naye
                  </Text>
                </View>
              )}
            </View>
          </ScrollView>
        )}
      </View>

      {/* Search + Filter */}
      <View className="px-5 pb-3 flex-row gap-2">
        <View className="flex-1">
          <Input
            placeholder="Naam, phone, CNIC se search..."
            value={params.search ?? ''}
            onChangeText={(s) => setParams({ ...params, search: s, page: 1 })}
            leftIcon={<Search size={20} color="#9ca3af" />}
          />
        </View>
        <Pressable
          onPress={() => setShowFilters(true)}
          className={`h-12 w-12 rounded-xl items-center justify-center border ${
            activeFilters
              ? 'bg-blue-600 border-blue-600'
              : 'bg-white dark:bg-neutral-900 border-neutral-200 dark:border-neutral-700'
          }`}
        >
          <SlidersHorizontal size={20} color={activeFilters ? '#fff' : '#6b7280'} />
        </Pressable>
      </View>

      {/* Top Spenders horizontal */}
      {stats && stats.topSpenders.length > 0 && (
        <View className="pb-3">
          <View className="flex-row items-center gap-2 px-5 mb-2">
            <Award size={14} color="#f59e0b" />
            <Text className="text-xs font-bold uppercase tracking-wider text-neutral-500">{t('auto.customers.top_spenders')}</Text>
          </View>
          <ScrollView
            horizontal
            showsHorizontalScrollIndicator={false}
            contentContainerStyle={{ paddingHorizontal: 20, gap: 8 }}
          >
            {stats.topSpenders.map((s, idx) => (
              <Pressable
                key={s.id}
                onPress={() => router.push(`/customers/${s.id}`)}
                className="rounded-2xl bg-amber-50 dark:bg-amber-950/40 border border-amber-200 dark:border-amber-900 p-3 w-44"
              >
                <View className="flex-row items-center gap-2">
                  <View className="relative">
                    {s.avatarUrl ? (
                      <Image source={{ uri: s.avatarUrl }} className="h-10 w-10 rounded-full" />
                    ) : (
                      <View className="h-10 w-10 rounded-full bg-amber-200 items-center justify-center">
                        <Text className="text-amber-700 font-bold">
                          {s.name.charAt(0).toUpperCase()}
                        </Text>
                      </View>
                    )}
                    <View className="absolute -top-1 -right-1 h-5 w-5 rounded-full bg-amber-500 items-center justify-center">
                      <Text className="text-[9px] font-bold text-white">#{idx + 1}</Text>
                    </View>
                  </View>
                  <View className="flex-1 min-w-0">
                    <Text className="font-bold text-sm text-amber-900 dark:text-amber-200" numberOfLines={1}>
                      {s.name}
                    </Text>
                    <Text className="text-[10px] font-bold text-amber-700 dark:text-amber-400">
                      {formatPKRFull(s.totalSpent)}
                    </Text>
                  </View>
                </View>
              </Pressable>
            ))}
          </ScrollView>
        </View>
      )}

      {/* List */}
      <FlatList
        data={items}
        keyExtractor={(c) => c.id}
        contentContainerStyle={{ paddingHorizontal: 20, paddingBottom: 80 }}
        refreshControl={
          <RefreshControl refreshing={refreshing} onRefresh={onRefresh} tintColor="#2563eb" />
        }
        ListEmptyComponent={
          <View className="items-center py-20 px-10">
            <View className="h-20 w-20 rounded-3xl bg-blue-100 dark:bg-blue-950/40 items-center justify-center">
              <Users size={36} color="#2563eb" />
            </View>
            <Text className="mt-5 text-lg font-bold text-neutral-900 dark:text-white">{t('auto.customers.koi_customer_nahi')}</Text>
            <Text className="mt-1 text-sm text-neutral-500 text-center">{t('auto.customers.pehla_customer_add_karein')}</Text>
            <Button size="md" className="mt-6" onPress={() => router.push('/customers/new')}>
              <Plus size={18} color="#fff" />
              <Text className="text-white font-bold">{t('auto.customers.customer_add_karein')}</Text>
            </Button>
          </View>
        }
        ItemSeparatorComponent={() => <View className="h-2.5" />}
        renderItem={({ item }) => (
          <Pressable
            onPress={() => router.push(`/customers/${item.id}`)}
            className="active:opacity-80"
          >
            <Card variant="outline" className="p-3">
              <View className="flex-row items-center gap-3">
                <View className="relative">
                  {item.avatarUrl ? (
                    <Image source={{ uri: item.avatarUrl }} className="h-14 w-14 rounded-2xl" />
                  ) : (
                    <View
                      className={`h-14 w-14 rounded-2xl items-center justify-center ${
                        item.isVip
                          ? 'bg-amber-500'
                          : 'bg-blue-100 dark:bg-blue-950/40'
                      }`}
                    >
                      <Text
                        className={`text-lg font-bold ${
                          item.isVip ? 'text-white' : 'text-blue-700 dark:text-blue-300'
                        }`}
                      >
                        {item.name.charAt(0).toUpperCase()}
                      </Text>
                    </View>
                  )}
                  {item.isVip && (
                    <View className="absolute -top-1 -right-1 h-6 w-6 rounded-full bg-amber-500 items-center justify-center border-2 border-white dark:border-neutral-900">
                      <Crown size={11} color="#ffffff" />
                    </View>
                  )}
                </View>

                <View className="flex-1 min-w-0">
                  <View className="flex-row items-center gap-1.5">
                    <Text className="font-bold text-neutral-900 dark:text-white" numberOfLines={1}>
                      {item.name}
                    </Text>
                    {item.isVip && (
                      <View className="px-1.5 py-0.5 rounded bg-amber-100 dark:bg-amber-950/40">
                        <Text className="text-[9px] font-bold text-amber-700 dark:text-amber-400">VIP</Text>
                      </View>
                    )}
                  </View>
                  <View className="flex-row items-center gap-3 mt-0.5">
                    {item.phone && (
                      <View className="flex-row items-center gap-1">
                        <Phone size={10} color="#9ca3af" />
                        <Text className="text-xs text-neutral-500">{item.phone}</Text>
                      </View>
                    )}
                    {item.city && (
                      <View className="flex-row items-center gap-1">
                        <MapPin size={10} color="#9ca3af" />
                        <Text className="text-xs text-neutral-500">{item.city}</Text>
                      </View>
                    )}
                  </View>
                  {item.loyaltyPoints > 0 && (
                    <View className="flex-row items-center gap-0.5 mt-1">
                      <Star size={10} color="#f59e0b" fill="#f59e0b" />
                      <Text className="text-[10px] font-bold text-amber-700 dark:text-amber-400">
                        {item.loyaltyPoints} points
                      </Text>
                    </View>
                  )}
                </View>

                <View className="items-end">
                  {item.balance > 0 ? (
                    <View className="px-2 py-1 rounded-lg bg-rose-50 dark:bg-rose-950/40">
                      <Text className="text-[10px] font-bold text-rose-700 dark:text-rose-400 uppercase">{t('auto.id.khata')}</Text>
                      <Text className="text-sm font-bold text-rose-700 dark:text-rose-400">
                        {formatPKRFull(item.balance)}
                      </Text>
                    </View>
                  ) : item.totalSpent > 0 ? (
                    <View>
                      <Text className="text-[10px] text-neutral-500 uppercase font-bold">{t('auto.customers.spent')}</Text>
                      <Text className="text-sm font-bold text-emerald-700 dark:text-emerald-400">
                        {formatPKRFull(item.totalSpent)}
                      </Text>
                    </View>
                  ) : (
                    <ChevronRight size={18} color="#9ca3af" />
                  )}
                </View>
              </View>
            </Card>
          </Pressable>
        )}
      />

      {/* Filters Modal */}
      <Modal visible={showFilters} animationType="slide" transparent onRequestClose={() => setShowFilters(false)}>
        <View className="flex-1 bg-black/50 justify-end">
          <View className="bg-white dark:bg-neutral-900 rounded-t-3xl">
            <View className="flex-row items-center justify-between px-5 py-4 border-b border-neutral-200 dark:border-neutral-800">
              <Text className="text-lg font-bold text-neutral-900 dark:text-white">{t('auto.products.filters')}</Text>
              <Pressable
                onPress={() => setShowFilters(false)}
                className="h-9 w-9 rounded-2xl bg-neutral-100 dark:bg-neutral-800 items-center justify-center"
              >
                <X size={18} color="#6b7280" />
              </Pressable>
            </View>

            <ScrollView contentContainerStyle={{ padding: 20 }}>
              <View className="gap-5">
                <View>
                  <Text className="text-xs font-bold uppercase tracking-wider text-neutral-500 mb-2">{t('auto.index.type')}</Text>
                  <View className="flex-row gap-2">
                    <Pressable
                      onPress={() => setParams({ ...params, isVip: undefined, hasCredit: undefined, page: 1 })}
                      className={`flex-1 px-3 py-3 rounded-xl border-2 ${
                        !params.isVip && !params.hasCredit
                          ? 'bg-blue-600 border-blue-600'
                          : 'bg-white dark:bg-neutral-800 border-neutral-200'
                      }`}
                    >
                      <Text
                        className={`text-center text-sm font-bold ${
                          !params.isVip && !params.hasCredit ? 'text-white' : 'text-neutral-700 dark:text-neutral-300'
                        }`}
                      >{t('auto.products.all')}</Text>
                    </Pressable>
                    <Pressable
                      onPress={() => setParams({ ...params, isVip: true, hasCredit: undefined, page: 1 })}
                      className={`flex-1 px-3 py-3 rounded-xl border-2 ${
                        params.isVip
                          ? 'bg-amber-500 border-amber-500'
                          : 'bg-white dark:bg-neutral-800 border-neutral-200'
                      }`}
                    >
                      <Text
                        className={`text-center text-sm font-bold ${
                          params.isVip ? 'text-white' : 'text-neutral-700 dark:text-neutral-300'
                        }`}
                      >
                        VIP
                      </Text>
                    </Pressable>
                    <Pressable
                      onPress={() => setParams({ ...params, isVip: undefined, hasCredit: true, page: 1 })}
                      className={`flex-1 px-3 py-3 rounded-xl border-2 ${
                        params.hasCredit
                          ? 'bg-rose-600 border-rose-600'
                          : 'bg-white dark:bg-neutral-800 border-neutral-200'
                      }`}
                    >
                      <Text
                        className={`text-center text-sm font-bold ${
                          params.hasCredit ? 'text-white' : 'text-neutral-700 dark:text-neutral-300'
                        }`}
                      >{t('auto.id.khata')}</Text>
                    </Pressable>
                  </View>
                </View>

                <View>
                  <Text className="text-xs font-bold uppercase tracking-wider text-neutral-500 mb-2">{t('auto.customers.sort_by')}</Text>
                  <View className="gap-2">
                    {[
                      { id: 'createdAt', label: 'Newest first' },
                      { id: 'name', label: 'Name (A-Z)' },
                      { id: 'totalSpent', label: 'Top spenders' },
                      { id: 'balance', label: 'Highest debt' },
                    ].map((opt) => (
                      <Pressable
                        key={opt.id}
                        onPress={() => setParams({ ...params, sortBy: opt.id as any, page: 1 })}
                        className={`px-4 py-3 rounded-xl border-2 ${
                          params.sortBy === opt.id
                            ? 'bg-blue-600 border-blue-600'
                            : 'bg-white dark:bg-neutral-800 border-neutral-200'
                        }`}
                      >
                        <Text
                          className={`font-bold ${
                            params.sortBy === opt.id ? 'text-white' : 'text-neutral-700 dark:text-neutral-300'
                          }`}
                        >
                          {opt.label}
                        </Text>
                      </Pressable>
                    ))}
                  </View>
                </View>
              </View>
            </ScrollView>

            <View className="px-5 py-4 border-t border-neutral-200 dark:border-neutral-800 flex-row gap-2">
              <Button
                variant="secondary"
                size="lg"
                className="flex-1"
                onPress={() =>
                  setParams({ search: '', page: 1, limit: 50, sortBy: 'createdAt', sortOrder: 'desc' })
                }
              >
                <Text className="font-bold">{t('auto.pos.clear')}</Text>
              </Button>
              <Button size="lg" className="flex-1" onPress={() => setShowFilters(false)}>
                <Text className="text-white font-bold">{t('auto.customers.apply')}</Text>
              </Button>
            </View>
          </View>
        </View>
      </Modal>
    </SafeAreaView>
  );
}
