import { useState } from 'react';
import {
  View, Text, ScrollView, Pressable, RefreshControl,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { useRouter, Stack } from 'expo-router';
import { useQuery } from '@tanstack/react-query';
import * as Haptics from 'expo-haptics';
import {
  ArrowLeft, AlertTriangle, Sparkles, Package, ChevronRight,
  TrendingDown, Plus,
} from 'lucide-react-native';
import { productsApi } from '@/api/products.api';
import { formatPKRFull } from '@/lib/format';

import { useTranslation } from '@/i18n/useTranslation';
export default function LowStockScreen() {
  const { t } = useTranslation();
  const router = useRouter();
  const [refreshing, setRefreshing] = useState(false);

  const { data: products = [], refetch } = useQuery({
    queryKey: ['low-stock-products'],
    queryFn: async () => {
      try {
        const r = await productsApi.lowStock();
        return Array.isArray(r) ? r : [];
      } catch {
        return [];
      }
    },
  });

  const onRefresh = async () => {
    setRefreshing(true);
    await refetch();
    setRefreshing(false);
  };

  const outOfStock = products.filter((p) => p.stock === 0);
  const lowStock = products.filter((p) => p.stock > 0);

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
          <Text className="text-2xl font-extrabold text-neutral-900 dark:text-white">{t('auto.index.low_stock')}</Text>
          <View className="flex-row items-center gap-1.5 mt-0.5">
            <Sparkles size={11} color="#f59e0b" />
            <Text className="text-xs text-neutral-500">
              {products.length} items need attention
            </Text>
          </View>
        </View>
      </View>

      <ScrollView
        contentContainerStyle={{ paddingBottom: 40 }}
        refreshControl={<RefreshControl refreshing={refreshing} onRefresh={onRefresh} tintColor="#f59e0b" />}
        showsVerticalScrollIndicator={false}
      >
        <View className="px-5 mb-4">
          <View
            className="rounded-3xl p-5"
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
                <AlertTriangle size={28} color="#ffffff" />
              </View>
              <View className="flex-1">
                <Text className="text-xs font-bold uppercase tracking-wider text-white/80">{t('auto.index.stock_alerts')}</Text>
                <Text className="text-3xl font-extrabold text-white">
                  {products.length}
                </Text>
                <Text className="text-xs text-white/80 mt-0.5">{t('auto.index.items_running_low')}</Text>
              </View>
            </View>
            <View className="pt-3 border-t border-white/20 flex-row items-center justify-between">
              <View>
                <Text className="text-[10px] font-bold uppercase tracking-wider text-white/70">{t('auto.index.out_of_stock')}</Text>
                <Text className="text-2xl font-extrabold text-white mt-0.5">{outOfStock.length}</Text>
              </View>
              <View>
                <Text className="text-[10px] font-bold uppercase tracking-wider text-white/70">{t('auto.index.low_stock')}</Text>
                <Text className="text-2xl font-extrabold text-white mt-0.5">{lowStock.length}</Text>
              </View>
            </View>
          </View>
        </View>

        {/* Out of Stock */}
        {outOfStock.length > 0 && (
          <View className="px-5 mb-4">
            <View className="flex-row items-center gap-2 mb-2">
              <TrendingDown size={16} color="#dc2626" />
              <Text className="text-base font-extrabold text-rose-700">{t('auto.index.out_of_stock')}</Text>
              <View className="bg-rose-100 px-2 py-0.5 rounded-full">
                <Text className="text-[10px] font-bold text-rose-700">{outOfStock.length}</Text>
              </View>
            </View>
            <View className="gap-2">
              {outOfStock.map((p) => (
                <Pressable
                  key={p.id}
                  onPress={() => {
                    Haptics.selectionAsync();
                    router.push(`/products/${p.id}`);
                  }}
                  className="rounded-2xl bg-white dark:bg-neutral-900 border-2 border-rose-200 p-3.5 flex-row items-center gap-3 active:opacity-70"
                >
                  <View className="h-12 w-12 rounded-2xl bg-rose-100 items-center justify-center">
                    <Package size={20} color="#dc2626" />
                  </View>
                  <View className="flex-1">
                    <Text className="font-bold text-neutral-900 dark:text-white" numberOfLines={1}>
                      {p.name}
                    </Text>
                    <Text className="text-xs text-neutral-500 mt-0.5">
                      {formatPKRFull(p.price)} • Was: {p.lowStockAlert} {p.unit}
                    </Text>
                  </View>
                  <View className="bg-rose-100 px-2.5 py-1 rounded-lg">
                    <Text className="text-[10px] font-extrabold text-rose-700">OUT</Text>
                  </View>
                  <ChevronRight size={16} color="#9ca3af" />
                </Pressable>
              ))}
            </View>
          </View>
        )}

        {/* Low Stock */}
        {lowStock.length > 0 && (
          <View className="px-5">
            <View className="flex-row items-center gap-2 mb-2">
              <AlertTriangle size={16} color="#f59e0b" />
              <Text className="text-base font-extrabold text-amber-700">{t('auto.index.low_stock')}</Text>
              <View className="bg-amber-100 px-2 py-0.5 rounded-full">
                <Text className="text-[10px] font-bold text-amber-700">{lowStock.length}</Text>
              </View>
            </View>
            <View className="gap-2">
              {lowStock.map((p) => (
                <Pressable
                  key={p.id}
                  onPress={() => {
                    Haptics.selectionAsync();
                    router.push(`/products/${p.id}`);
                  }}
                  className="rounded-2xl bg-white dark:bg-neutral-900 border-2 border-amber-200 p-3.5 flex-row items-center gap-3 active:opacity-70"
                >
                  <View className="h-12 w-12 rounded-2xl bg-amber-100 items-center justify-center">
                    <Package size={20} color="#f59e0b" />
                  </View>
                  <View className="flex-1">
                    <Text className="font-bold text-neutral-900 dark:text-white" numberOfLines={1}>
                      {p.name}
                    </Text>
                    <Text className="text-xs text-neutral-500 mt-0.5">
                      {formatPKRFull(p.price)} • Alert at: {p.lowStockAlert} {p.unit}
                    </Text>
                  </View>
                  <View className="items-end">
                    <Text className="text-base font-extrabold text-amber-700">
                      {p.stock}
                    </Text>
                    <Text className="text-[9px] text-amber-600 font-bold uppercase">
                      {p.unit} left
                    </Text>
                  </View>
                  <ChevronRight size={16} color="#9ca3af" />
                </Pressable>
              ))}
            </View>
          </View>
        )}

        {products.length === 0 && (
          <View className="px-5">
            <View className="rounded-2xl bg-white dark:bg-neutral-900 border border-neutral-200 dark:border-neutral-800 items-center py-12">
              <View className="h-16 w-16 rounded-3xl bg-emerald-100 items-center justify-center">
                <Package size={32} color="#16a34a" />
              </View>
              <Text className="mt-3 text-base font-bold text-emerald-700">{t('auto.index.all_stock_healthy')}</Text>
              <Text className="mt-1 text-xs text-neutral-500">{t('auto.index.koi_product_low_stock_par_nahi_hai')}</Text>
            </View>
          </View>
        )}
      </ScrollView>
    </SafeAreaView>
  );
}
