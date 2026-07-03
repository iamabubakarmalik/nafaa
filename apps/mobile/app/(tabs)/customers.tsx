import { useState, useMemo } from 'react';
import {
  View, Text, ScrollView, Pressable, TextInput, RefreshControl,
  FlatList, Image, Linking, Alert,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { useRouter } from 'expo-router';
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import * as Haptics from 'expo-haptics';
import {
  Users, Plus, Search, X, Filter, Crown, Phone,
  MapPin, TrendingUp, Wallet, Star, MessageCircle, Mail,
  Edit3, Trash2, Sparkles, ChevronRight,
} from 'lucide-react-native';
import { customersApi, type CustomersListParams } from '@/api/customers.api';
import { formatPKR } from '@/lib/format';
import Toast from 'react-native-toast-message';
import { useTranslation } from '@/i18n/useTranslation';

type FilterType = 'all' | 'vip' | 'credit';
type SortBy = 'createdAt' | 'name' | 'totalSpent' | 'balance';

export default function CustomersListScreen() {
  const { t } = useTranslation();
  const router = useRouter();
  const queryClient = useQueryClient();

  const [search, setSearch] = useState('');
  const [filterType, setFilterType] = useState<FilterType>('all');
  const [sortBy, setSortBy] = useState<SortBy>('createdAt');
  const [city, setCity] = useState('');
  const [showFilters, setShowFilters] = useState(false);
  const [refreshing, setRefreshing] = useState(false);

  const queryParams: CustomersListParams = useMemo(() => ({
    search: search || undefined,
    isVip: filterType === 'vip' ? true : undefined,
    hasCredit: filterType === 'credit' ? true : undefined,
    city: city || undefined,
    sortBy,
    sortOrder: 'desc',
    page: 1,
    limit: 100,
  }), [search, filterType, city, sortBy]);

  const { data, refetch } = useQuery({
    queryKey: ['customers', queryParams],
    queryFn: () => customersApi.list(queryParams),
  });

  const { data: stats, refetch: refetchStats } = useQuery({
    queryKey: ['customers-stats'],
    queryFn: () => customersApi.stats(),
  });

  const items = data?.items ?? [];
  const hasFilters = !!(search || filterType !== 'all' || city);

  const removeMutation = useMutation({
    mutationFn: (id: string) => customersApi.remove(id),
    onSuccess: () => {
      Haptics.notificationAsync(Haptics.NotificationFeedbackType.Success);
      Toast.show({ type: 'success', text1: 'Customer deleted' });
      queryClient.invalidateQueries({ queryKey: ['customers'] });
      queryClient.invalidateQueries({ queryKey: ['customers-stats'] });
    },
    onError: (e: any) =>
      Toast.show({ type: 'error', text1: e?.response?.data?.message || 'Delete fail' }),
  });

  const onRefresh = async () => {
    setRefreshing(true);
    await Promise.all([refetch(), refetchStats()]);
    setRefreshing(false);
  };

  const clearFilters = () => {
    setSearch('');
    setFilterType('all');
    setCity('');
    setSortBy('createdAt');
  };

  const handleWhatsApp = (phone: string) => {
    Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
    const p = phone.replace(/[^0-9]/g, '').replace(/^0/, '92');
    Linking.openURL(`whatsapp://send?phone=${p}`).catch(() =>
      Linking.openURL(`https://wa.me/${p}`),
    );
  };

  const handleCall = (phone: string) => {
    Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
    Linking.openURL(`tel:${phone}`);
  };

  const handleEmail = (email: string) => {
    Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
    Linking.openURL(`mailto:${email}`);
  };

  const handleDelete = (id: string, name: string) => {
    Alert.alert(
      'Delete Customer?',
      `${name} ko permanently delete karein? Yeh action undo nahi ho sakta.`,
      [
        { text: 'Cancel', style: 'cancel' },
        { text: 'Delete', style: 'destructive', onPress: () => removeMutation.mutate(id) },
      ],
    );
  };

  const renderCustomerItem = ({ item: c }: any) => (
    <View className="px-5">
      <Pressable
        onPress={() => {
          Haptics.selectionAsync();
          router.push(`/customers/${c.id}` as any);
        }}
        className="rounded-2xl bg-white dark:bg-neutral-900 border-2 border-neutral-200 dark:border-neutral-800 p-3.5 active:opacity-70"
      >
        <View className="flex-row items-start gap-3">
          <View className="relative shrink-0">
            {c.avatarUrl ? (
              <Image
                source={{ uri: c.avatarUrl }}
                className="h-14 w-14 rounded-2xl"
                resizeMode="cover"
              />
            ) : (
              <View
                className="h-14 w-14 rounded-2xl items-center justify-center"
                style={{ backgroundColor: c.isVip ? '#f59e0b' : '#2563eb' }}
              >
                <Text className="text-white text-xl font-extrabold">
                  {c.name.charAt(0).toUpperCase()}
                </Text>
              </View>
            )}
            {c.isVip && (
              <View
                className="absolute -top-1 -right-1 h-6 w-6 rounded-full items-center justify-center border-2 border-white dark:border-neutral-950"
                style={{ backgroundColor: '#f59e0b' }}
              >
                <Crown size={11} color="#ffffff" />
              </View>
            )}
          </View>

          <View className="flex-1 min-w-0">
            <View className="flex-row items-center gap-1.5 flex-wrap">
              <Text className="font-extrabold text-neutral-900 dark:text-white" numberOfLines={1}>
                {c.name}
              </Text>
              {c.isVip && (
                <View className="bg-amber-100 dark:bg-amber-950/40 px-1.5 py-0.5 rounded-md flex-row items-center gap-0.5">
                  <Crown size={8} color="#f59e0b" />
                  <Text className="text-[9px] font-extrabold text-amber-700">VIP</Text>
                </View>
              )}
              {!c.isActive && (
                <View className="bg-neutral-200 dark:bg-neutral-800 px-1.5 py-0.5 rounded-md">
                  <Text className="text-[9px] font-extrabold text-neutral-600 dark:text-neutral-400">
                    INACTIVE
                  </Text>
                </View>
              )}
            </View>

            {c.phone && (
              <View className="flex-row items-center gap-1 mt-1">
                <Phone size={10} color="#64748b" />
                <Text className="text-xs text-neutral-500 font-bold" numberOfLines={1}>
                  {c.phone}
                </Text>
              </View>
            )}
            {c.city && (
              <View className="flex-row items-center gap-1 mt-0.5">
                <MapPin size={10} color="#64748b" />
                <Text className="text-xs text-neutral-500" numberOfLines={1}>
                  {c.city}
                  {c.area ? `, ${c.area}` : ''}
                </Text>
              </View>
            )}

            <View className="flex-row items-center gap-2 mt-2 flex-wrap">
              <View className="flex-row items-center gap-0.5 px-1.5 py-0.5 rounded-md bg-emerald-100 dark:bg-emerald-950/40">
                <TrendingUp size={9} color="#16a34a" />
                <Text className="text-[10px] font-extrabold text-emerald-700 dark:text-emerald-400">
                  {formatPKR(c.totalSpent)}
                </Text>
              </View>
              {c.balance > 0 && (
                <View className="flex-row items-center gap-0.5 px-1.5 py-0.5 rounded-md bg-rose-100 dark:bg-rose-950/40">
                  <Wallet size={9} color="#dc2626" />
                  <Text className="text-[10px] font-extrabold text-rose-700 dark:text-rose-400">
                    {formatPKR(c.balance)}
                  </Text>
                </View>
              )}
              {c.loyaltyPoints > 0 && (
                <View className="flex-row items-center gap-0.5 px-1.5 py-0.5 rounded-md bg-amber-100 dark:bg-amber-950/40">
                  <Star size={9} color="#f59e0b" fill="#f59e0b" />
                  <Text className="text-[10px] font-extrabold text-amber-700 dark:text-amber-400">
                    {c.loyaltyPoints}
                  </Text>
                </View>
              )}
            </View>
          </View>

          <ChevronRight size={16} color="#9ca3af" style={{ marginTop: 4 }} />
        </View>

        {/* Quick actions */}
        <View className="mt-2.5 pt-2.5 border-t border-neutral-100 dark:border-neutral-800 flex-row items-center gap-1.5">
          {c.phone && (
            <>
              <Pressable
                onPress={() => handleCall(c.phone!)}
                hitSlop={6}
                className="h-8 w-8 rounded-lg bg-blue-100 dark:bg-blue-950/40 items-center justify-center active:opacity-70"
              >
                <Phone size={13} color="#2563eb" />
              </Pressable>
              <Pressable
                onPress={() => handleWhatsApp(c.phone!)}
                hitSlop={6}
                className="h-8 w-8 rounded-lg items-center justify-center active:opacity-70"
                style={{ backgroundColor: '#dcfce7' }}
              >
                <MessageCircle size={13} color="#16a34a" />
              </Pressable>
            </>
          )}
          {c.email && (
            <Pressable
              onPress={() => handleEmail(c.email!)}
              hitSlop={6}
              className="h-8 w-8 rounded-lg bg-violet-100 dark:bg-violet-950/40 items-center justify-center active:opacity-70"
            >
              <Mail size={13} color="#8b5cf6" />
            </Pressable>
          )}
          <View className="flex-1" />
          <Pressable
            onPress={() => router.push(`/customers/${c.id}/edit` as any)}
            hitSlop={6}
            className="h-8 w-8 rounded-lg bg-neutral-100 dark:bg-neutral-800 items-center justify-center active:opacity-70"
          >
            <Edit3 size={13} color="#374151" />
          </Pressable>
          <Pressable
            onPress={() => handleDelete(c.id, c.name)}
            hitSlop={6}
            className="h-8 w-8 rounded-lg bg-rose-100 dark:bg-rose-950/40 items-center justify-center active:opacity-70"
          >
            <Trash2 size={13} color="#dc2626" />
          </Pressable>
        </View>
      </Pressable>
    </View>
  );

  return (
    <SafeAreaView className="flex-1 bg-neutral-50 dark:bg-neutral-950" edges={['top']}>
      {/* Header */}
      <View className="px-5 pt-4 pb-3 flex-row items-center gap-3">
        <View className="flex-1">
          <Text className="text-2xl font-extrabold text-neutral-900 dark:text-white">
            Customers
          </Text>
          <Text className="text-xs text-neutral-500 mt-0.5">
            {stats?.total ?? 0} total • {items.length} showing
          </Text>
        </View>
        <Pressable
          onPress={() => {
            Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
            router.push('/customers/new' as any);
          }}
          className="h-11 px-4 rounded-2xl flex-row items-center gap-1.5 active:opacity-80"
          style={{
            backgroundColor: '#2563eb',
            shadowColor: '#2563eb',
            shadowOpacity: 0.3,
            shadowRadius: 8,
            elevation: 4,
          }}
        >
          <Plus size={16} color="#ffffff" />
          <Text className="text-white font-bold text-sm">{t('auto.customers.naya') || 'New'}</Text>
        </Pressable>
      </View>

      <FlatList
        data={items}
        keyExtractor={(item) => item.id}
        renderItem={renderCustomerItem}
        contentContainerStyle={{ paddingBottom: 80 }}
        ItemSeparatorComponent={() => <View className="h-2" />}
        refreshControl={
          <RefreshControl refreshing={refreshing} onRefresh={onRefresh} tintColor="#2563eb" />
        }
        showsVerticalScrollIndicator={false}
        ListHeaderComponent={
          <>
            {/* Hero Gradient */}
            <View className="px-5 mb-4">
              <View
                className="rounded-3xl p-5 overflow-hidden"
                style={{
                  backgroundColor: '#1e40af',
                  shadowColor: '#1e40af',
                  shadowOpacity: 0.3,
                  shadowRadius: 16,
                  shadowOffset: { width: 0, height: 8 },
                  elevation: 10,
                }}
              >
                <View className="flex-row items-center gap-2 mb-2">
                  <View className="bg-white/20 px-2 py-1 rounded-full flex-row items-center gap-1">
                    <Users size={11} color="#fbbf24" />
                    <Text className="text-[10px] font-extrabold text-white">CRM</Text>
                  </View>
                </View>
                <Text className="text-white text-2xl font-extrabold">
                  Customer Management
                </Text>
                <Text className="text-white/80 text-xs mt-1">
                  VIP, regular, khata wale — sab yahan
                </Text>
              </View>
            </View>

            {/* Stats Grid */}
            <View className="px-5 mb-4">
              <View className="flex-row flex-wrap -mx-1.5">
                <StatCard
                  label="Total"
                  value={String(stats?.total ?? 0)}
                  sub={stats && stats.newThisMonth > 0 ? `+${stats.newThisMonth} this month` : undefined}
                  icon={Users}
                  color="#2563eb"
                  bg="#dbeafe"
                />
                <StatCard
                  label="VIP"
                  value={String(stats?.vip ?? 0)}
                  sub="Premium tier"
                  icon={Crown}
                  color="#f59e0b"
                  bg="#fef3c7"
                />
                <StatCard
                  label="Total Khata"
                  value={formatPKR(stats?.totalDebt ?? 0)}
                  sub={`${stats?.withCredit ?? 0} customers`}
                  icon={Wallet}
                  color="#dc2626"
                  bg="#fee2e2"
                />
                <StatCard
                  label="Growth"
                  value={`${stats && stats.growthPct >= 0 ? '+' : ''}${stats?.growthPct?.toFixed(1) ?? 0}%`}
                  sub="vs last month"
                  icon={TrendingUp}
                  color="#16a34a"
                  bg="#dcfce7"
                  highlight
                />
              </View>
            </View>

            {/* Top Spenders */}
            {stats && stats.topSpenders.length > 0 && (
              <View className="mb-4">
                <View className="flex-row items-center gap-2 px-5 mb-2">
                  <Sparkles size={14} color="#f59e0b" />
                  <Text className="text-sm font-extrabold text-neutral-900 dark:text-white">
                    Top Spenders
                  </Text>
                </View>
                <ScrollView
                  horizontal
                  showsHorizontalScrollIndicator={false}
                  contentContainerStyle={{ paddingHorizontal: 20, gap: 8 }}
                >
                  {stats.topSpenders.map((s, idx) => (
                    <Pressable
                      key={s.id}
                      onPress={() => {
                        Haptics.selectionAsync();
                        router.push(`/customers/${s.id}` as any);
                      }}
                      className="rounded-2xl p-3 border-2 border-amber-200"
                      style={{
                        width: 160,
                        backgroundColor: '#fffbeb',
                      }}
                    >
                      <View className="flex-row items-center gap-2">
                        <View className="relative">
                          {s.avatarUrl ? (
                            <Image
                              source={{ uri: s.avatarUrl }}
                              className="h-10 w-10 rounded-full"
                            />
                          ) : (
                            <View
                              className="h-10 w-10 rounded-full items-center justify-center"
                              style={{ backgroundColor: '#f59e0b' }}
                            >
                              <Text className="text-white font-extrabold">
                                {s.name.charAt(0).toUpperCase()}
                              </Text>
                            </View>
                          )}
                          <View
                            className="absolute -top-1 -right-1 h-5 w-5 rounded-full items-center justify-center border-2 border-amber-100"
                            style={{
                              backgroundColor:
                                idx === 0 ? '#f59e0b' :
                                idx === 1 ? '#737373' :
                                idx === 2 ? '#c2410c' :
                                '#64748b',
                            }}
                          >
                            <Text className="text-[9px] font-extrabold text-white">
                              #{idx + 1}
                            </Text>
                          </View>
                        </View>
                        <View className="flex-1 min-w-0">
                          <Text
                            className="text-xs font-extrabold text-neutral-900"
                            numberOfLines={1}
                          >
                            {s.name}
                          </Text>
                          <Text className="text-xs font-extrabold text-amber-700 mt-0.5">
                            {formatPKR(s.totalSpent)}
                          </Text>
                        </View>
                      </View>
                    </Pressable>
                  ))}
                </ScrollView>
              </View>
            )}

            {/* Search bar + Filter toggle */}
            <View className="px-5 mb-3 flex-row gap-2">
              <View className="flex-1 flex-row items-center gap-2 rounded-2xl border border-neutral-200 dark:border-neutral-800 bg-white dark:bg-neutral-900 px-4 h-12">
                <Search size={18} color="#9ca3af" />
                <TextInput
                  placeholder="Search name, phone, CNIC..."
                  placeholderTextColor="#9ca3af"
                  value={search}
                  onChangeText={setSearch}
                  className="flex-1 text-sm text-neutral-900 dark:text-white"
                />
                {search.length > 0 && (
                  <Pressable
                    onPress={() => setSearch('')}
                    hitSlop={12}
                    className="h-7 w-7 rounded-full bg-neutral-100 dark:bg-neutral-800 items-center justify-center"
                  >
                    <X size={14} color="#9ca3af" />
                  </Pressable>
                )}
              </View>
              <Pressable
                onPress={() => {
                  Haptics.selectionAsync();
                  setShowFilters((v) => !v);
                }}
                className="h-12 px-4 rounded-2xl flex-row items-center gap-1.5 border-2 active:opacity-70"
                style={{
                  backgroundColor: hasFilters || showFilters ? '#dbeafe' : '#ffffff',
                  borderColor: hasFilters || showFilters ? '#2563eb' : '#e5e7eb',
                }}
              >
                <Filter size={14} color={hasFilters || showFilters ? '#1d4ed8' : '#6b7280'} />
                <Text
                  className="font-bold text-xs"
                  style={{ color: hasFilters || showFilters ? '#1d4ed8' : '#374151' }}
                >
                  Filter
                </Text>
                {hasFilters && (
                  <View className="h-4 w-4 rounded-full bg-blue-600 items-center justify-center">
                    <Text className="text-white text-[8px] font-extrabold">!</Text>
                  </View>
                )}
              </Pressable>
            </View>

            {/* Filters Panel */}
            {showFilters && (
              <View className="px-5 mb-3">
                <View className="rounded-2xl bg-white dark:bg-neutral-900 border border-neutral-200 dark:border-neutral-800 p-4 gap-3">
                  {/* Type */}
                  <View>
                    <Text className="text-[10px] uppercase tracking-wider font-bold text-neutral-500 mb-1.5">
                      Type
                    </Text>
                    <View className="flex-row gap-2">
                      {[
                        { key: 'all' as FilterType, label: '👥 All', color: '#0f172a' },
                        { key: 'vip' as FilterType, label: '👑 VIP', color: '#f59e0b' },
                        { key: 'credit' as FilterType, label: '💳 Khata', color: '#dc2626' },
                      ].map((f) => {
                        const active = filterType === f.key;
                        return (
                          <Pressable
                            key={f.key}
                            onPress={() => {
                              Haptics.selectionAsync();
                              setFilterType(f.key);
                            }}
                            className="flex-1 h-10 rounded-lg items-center justify-center"
                            style={{ backgroundColor: active ? f.color : '#f3f4f6' }}
                          >
                            <Text
                              className="text-xs font-extrabold"
                              style={{ color: active ? '#ffffff' : '#374151' }}
                            >
                              {f.label}
                            </Text>
                          </Pressable>
                        );
                      })}
                    </View>
                  </View>

                  {/* Sort */}
                  <View>
                    <Text className="text-[10px] uppercase tracking-wider font-bold text-neutral-500 mb-1.5">
                      Sort By
                    </Text>
                    <View className="flex-row flex-wrap -m-1">
                      {[
                        { key: 'createdAt' as SortBy, label: '🆕 Newest first' },
                        { key: 'name' as SortBy, label: '🔤 Name (A-Z)' },
                        { key: 'totalSpent' as SortBy, label: '💰 Top spenders' },
                        { key: 'balance' as SortBy, label: '⚠️ Highest debt' },
                      ].map((s) => {
                        const active = sortBy === s.key;
                        return (
                          <View key={s.key} className="w-1/2 p-1">
                            <Pressable
                              onPress={() => {
                                Haptics.selectionAsync();
                                setSortBy(s.key);
                              }}
                              className="h-10 rounded-lg items-center justify-center border-2"
                              style={{
                                backgroundColor: active ? '#2563eb' : '#ffffff',
                                borderColor: active ? '#2563eb' : '#e5e7eb',
                              }}
                            >
                              <Text
                                className="text-[11px] font-bold"
                                style={{ color: active ? '#ffffff' : '#374151' }}
                                numberOfLines={1}
                              >
                                {s.label}
                              </Text>
                            </Pressable>
                          </View>
                        );
                      })}
                    </View>
                  </View>

                  {/* City */}
                  <View>
                    <Text className="text-[10px] uppercase tracking-wider font-bold text-neutral-500 mb-1.5">
                      City
                    </Text>
                    <TextInput
                      value={city}
                      onChangeText={setCity}
                      placeholder="Lahore, Karachi..."
                      placeholderTextColor="#9ca3af"
                      className="h-11 rounded-xl border-2 border-neutral-200 dark:border-neutral-800 bg-white dark:bg-neutral-900 px-3 text-sm font-bold text-neutral-900 dark:text-white"
                    />
                  </View>

                  {hasFilters && (
                    <Pressable
                      onPress={clearFilters}
                      className="flex-row items-center gap-1"
                    >
                      <X size={11} color="#dc2626" />
                      <Text className="text-xs text-rose-600 font-bold">Clear all filters</Text>
                    </Pressable>
                  )}
                </View>
              </View>
            )}

            <View className="px-5 mb-2" />
          </>
        }
        ListEmptyComponent={
          <View className="px-5">
            <View className="rounded-2xl border-2 border-dashed border-neutral-200 dark:border-neutral-800 items-center py-12">
              <View className="h-20 w-20 rounded-3xl bg-blue-100 dark:bg-blue-950/40 items-center justify-center">
                <Users size={36} color="#2563eb" />
              </View>
              <Text className="mt-4 text-base font-bold text-neutral-700 dark:text-neutral-300">
                {hasFilters ? 'No customers match' : 'No customers yet'}
              </Text>
              <Text className="text-xs text-neutral-500 mt-1 text-center px-8">
                {hasFilters ? 'Try different filters or clear them' : 'Apna pehla customer add karein'}
              </Text>
              {!hasFilters && (
                <Pressable
                  onPress={() => router.push('/customers/new' as any)}
                  className="mt-4 h-10 px-5 rounded-xl flex-row items-center gap-1.5"
                  style={{ backgroundColor: '#2563eb' }}
                >
                  <Plus size={16} color="#ffffff" />
                  <Text className="text-white font-bold text-sm">Add Customer</Text>
                </Pressable>
              )}
            </View>
          </View>
        }
      />
    </SafeAreaView>
  );
}

function StatCard({ label, value, sub, icon: Icon, color, bg, highlight }: any) {
  return (
    <View className="w-1/2 px-1.5 mb-3">
      <View
        className="rounded-2xl p-3.5 border-2"
        style={{
          backgroundColor: highlight ? bg : '#ffffff',
          borderColor: highlight ? color : '#e5e7eb',
        }}
      >
        <View
          className="h-10 w-10 rounded-xl items-center justify-center"
          style={{ backgroundColor: bg }}
        >
          <Icon size={18} color={color} />
        </View>
        <Text
          className="mt-2 text-[10px] font-extrabold uppercase tracking-wider"
          style={{ color }}
        >
          {label}
        </Text>
        <Text
          className="text-lg font-extrabold text-neutral-900 dark:text-white mt-0.5"
          numberOfLines={1}
        >
          {value}
        </Text>
        {sub && (
          <Text className="text-[10px] font-bold mt-0.5" style={{ color }}>
            {sub}
          </Text>
        )}
      </View>
    </View>
  );
}
