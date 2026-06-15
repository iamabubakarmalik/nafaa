import { View, Text, ScrollView, Pressable, RefreshControl } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { useRouter, Stack } from 'expo-router';
import { useQuery } from '@tanstack/react-query';
import { useState } from 'react';
import {
  ArrowLeft, Pill, AlertTriangle, Calendar, Package, Sparkles, ChevronRight,
} from 'lucide-react-native';
import { batchesApi } from '@/api/batches.api';

function daysUntil(date?: string | null): number | null {
  if (!date) return null;
  const expiry = new Date(date);
  const now = new Date();
  return Math.floor((expiry.getTime() - now.getTime()) / (1000 * 60 * 60 * 24));
}

export default function ExpiryDashboardScreen() {
  const router = useRouter();
  const [refreshing, setRefreshing] = useState(false);

  const { data: stats, refetch: refetchStats } = useQuery({
    queryKey: ['batches-stats'],
    queryFn: batchesApi.stats,
  });

  const { data: expiringSoon = [], refetch: refetchSoon } = useQuery({
    queryKey: ['batches-expiring-soon'],
    queryFn: () => batchesApi.expiringSoon(30),
  });

  const { data: expired = [], refetch: refetchExpired } = useQuery({
    queryKey: ['batches-expired'],
    queryFn: batchesApi.expired,
  });

  const onRefresh = async () => {
    setRefreshing(true);
    await Promise.all([refetchStats(), refetchSoon(), refetchExpired()]);
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
          <ArrowLeft size={20} color="#dc2626" />
        </Pressable>
        <View className="flex-1">
          <Text className="text-xl font-extrabold text-neutral-900 dark:text-white">
            Expiry Dashboard
          </Text>
          <Text className="text-xs text-neutral-500">Pharmacy & expiry tracking</Text>
        </View>
      </View>

      <ScrollView
        contentContainerStyle={{ padding: 20, paddingBottom: 60 }}
        refreshControl={<RefreshControl refreshing={refreshing} onRefresh={onRefresh} tintColor="#dc2626" />}
      >
        {/* Hero */}
        <View
          className="rounded-3xl p-6 mb-5"
          style={{
            backgroundColor: '#991b1b',
            shadowColor: '#dc2626',
            shadowOpacity: 0.3,
            shadowRadius: 16,
            elevation: 8,
          }}
        >
          <View className="flex-row items-center gap-3">
            <View className="h-14 w-14 rounded-2xl bg-white/20 items-center justify-center">
              <Pill size={28} color="#ffffff" />
            </View>
            <View>
              <View className="self-start flex-row items-center gap-1.5 rounded-full bg-white/15 px-2.5 py-1">
                <Sparkles size={10} color="#fbbf24" />
                <Text className="text-[10px] font-bold text-white">Pharmacy Module</Text>
              </View>
              <Text className="mt-2 text-2xl font-extrabold text-white">Expiry Dashboard</Text>
              <Text className="text-sm text-white/80 mt-0.5">Track expiry inventory</Text>
            </View>
          </View>
        </View>

        {/* Stats */}
        <View className="flex-row flex-wrap -m-1 mb-5">
          <View className="w-1/2 p-1">
            <View className="rounded-2xl bg-white dark:bg-neutral-900 border-2 border-neutral-200 dark:border-neutral-800 p-4">
              <View className="flex-row items-center gap-2 mb-1">
                <Package size={14} color="#737373" />
                <Text className="text-[10px] uppercase tracking-wider text-neutral-500 font-bold">Total Batches</Text>
              </View>
              <Text className="text-2xl font-extrabold text-neutral-900 dark:text-white">{stats?.total ?? 0}</Text>
            </View>
          </View>
          <View className="w-1/2 p-1">
            <View className="rounded-2xl border-2 border-emerald-200 p-4" style={{ backgroundColor: '#dcfce7' }}>
              <View className="flex-row items-center gap-2 mb-1">
                <Package size={14} color="#16a34a" />
                <Text className="text-[10px] uppercase tracking-wider text-emerald-700 font-bold">Total Stock</Text>
              </View>
              <Text className="text-2xl font-extrabold text-emerald-900">{stats?.totalQuantity ?? 0}</Text>
            </View>
          </View>
          <View className="w-1/2 p-1">
            <View className="rounded-2xl border-2 border-amber-200 p-4" style={{ backgroundColor: '#fef3c7' }}>
              <View className="flex-row items-center gap-2 mb-1">
                <Calendar size={14} color="#d97706" />
                <Text className="text-[10px] uppercase tracking-wider text-amber-700 font-bold">Expiring Soon</Text>
              </View>
              <Text className="text-2xl font-extrabold text-amber-900">{stats?.expiringSoon ?? 0}</Text>
              <Text className="text-[10px] text-amber-700 font-semibold mt-1">Within 30 days</Text>
            </View>
          </View>
          <View className="w-1/2 p-1">
            <View className="rounded-2xl border-2 border-rose-200 p-4" style={{ backgroundColor: '#fee2e2' }}>
              <View className="flex-row items-center gap-2 mb-1">
                <AlertTriangle size={14} color="#dc2626" />
                <Text className="text-[10px] uppercase tracking-wider text-rose-700 font-bold">Expired</Text>
              </View>
              <Text className="text-2xl font-extrabold text-rose-900">{stats?.expired ?? 0}</Text>
              <Text className="text-[10px] text-rose-700 font-semibold mt-1">Remove now</Text>
            </View>
          </View>
        </View>

        {/* Expired list */}
        {expired.length > 0 && (
          <View className="rounded-3xl bg-white dark:bg-neutral-900 border-2 border-rose-200 mb-5 overflow-hidden">
            <View className="px-4 py-3 bg-rose-50 border-b border-rose-200 flex-row items-center gap-2">
              <AlertTriangle size={18} color="#dc2626" />
              <Text className="font-extrabold text-rose-900 flex-1">
                Expired Batches ({expired.length})
              </Text>
            </View>
            {expired.slice(0, 10).map((batch) => {
              const days = daysUntil(batch.expiryDate);
              return (
                <Pressable
                  key={batch.id}
                  onPress={() => router.push(`/products/${batch.productId}` as any)}
                  className="p-3 border-b border-neutral-100 dark:border-neutral-800 flex-row items-center justify-between"
                >
                  <View className="flex-1 min-w-0">
                    <Text className="font-bold text-neutral-900 dark:text-white" numberOfLines={1}>
                      {batch.product?.name}
                    </Text>
                    <Text className="text-xs text-neutral-500 font-mono">#{batch.batchNumber}</Text>
                  </View>
                  <View className="items-end mr-2">
                    <Text className="font-extrabold text-rose-700">
                      {batch.quantity} {batch.product?.unit}
                    </Text>
                    <Text className="text-[10px] text-rose-600 font-bold">
                      Expired {Math.abs(days || 0)}d ago
                    </Text>
                  </View>
                  <ChevronRight size={16} color="#9ca3af" />
                </Pressable>
              );
            })}
          </View>
        )}

        {/* Expiring soon list */}
        {expiringSoon.length > 0 && (
          <View className="rounded-3xl bg-white dark:bg-neutral-900 border-2 border-amber-200 overflow-hidden">
            <View className="px-4 py-3 bg-amber-50 border-b border-amber-200 flex-row items-center gap-2">
              <Calendar size={18} color="#d97706" />
              <Text className="font-extrabold text-amber-900 flex-1">
                Expiring Soon ({expiringSoon.length})
              </Text>
            </View>
            {expiringSoon.slice(0, 15).map((batch) => {
              const days = daysUntil(batch.expiryDate);
              return (
                <Pressable
                  key={batch.id}
                  onPress={() => router.push(`/products/${batch.productId}` as any)}
                  className="p-3 border-b border-neutral-100 dark:border-neutral-800 flex-row items-center justify-between"
                >
                  <View className="flex-1 min-w-0">
                    <Text className="font-bold text-neutral-900 dark:text-white" numberOfLines={1}>
                      {batch.product?.name}
                    </Text>
                    <Text className="text-xs text-neutral-500 font-mono">#{batch.batchNumber}</Text>
                  </View>
                  <View className="items-end mr-2">
                    <Text className="font-extrabold text-amber-700">
                      {batch.quantity} {batch.product?.unit}
                    </Text>
                    <Text className="text-[10px] text-amber-600 font-bold">{days}d remaining</Text>
                  </View>
                  <ChevronRight size={16} color="#9ca3af" />
                </Pressable>
              );
            })}
          </View>
        )}

        {/* All clear */}
        {expired.length === 0 && expiringSoon.length === 0 && (
          <View className="rounded-3xl bg-white dark:bg-neutral-900 border-2 border-emerald-200 p-12 items-center">
            <View className="h-16 w-16 rounded-2xl bg-emerald-100 items-center justify-center">
              <Sparkles size={32} color="#16a34a" />
            </View>
            <Text className="mt-3 text-lg font-extrabold text-emerald-900">All Clear! 🎉</Text>
            <Text className="text-sm text-emerald-700 mt-1">No expiring or expired batches</Text>
          </View>
        )}
      </ScrollView>
    </SafeAreaView>
  );
}
