import { useState } from 'react';
import {
  View, Text, ScrollView, Pressable, RefreshControl,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { useRouter, Stack } from 'expo-router';
import { useQuery } from '@tanstack/react-query';
import * as Haptics from 'expo-haptics';
import {
  ArrowLeft, RotateCcw, Sparkles, Plus, Receipt, User,
  CalendarClock, ChevronRight, Package, Banknote,
} from 'lucide-react-native';
import { returnsApi } from '@/api/returns.api';
import { formatPKRFull } from '@/lib/format';

import { useTranslation } from '@/i18n/useTranslation';
const formatDate = (v: string) =>
  new Intl.DateTimeFormat('en-PK', {
    dateStyle: 'medium',
    timeStyle: 'short',
  }).format(new Date(v));

export default function ReturnsScreen() {
  const { t } = useTranslation();
  const router = useRouter();
  const [refreshing, setRefreshing] = useState(false);

  const { data: returns = [], refetch } = useQuery({
    queryKey: ['returns'],
    queryFn: async () => {
      try {
        const r = await returnsApi.list();
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

  const totalRefunded = returns.reduce((s, r) => s + r.refundAmount, 0);

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
          <Text className="text-2xl font-extrabold text-neutral-900 dark:text-white">{t('auto.index.returns')}</Text>
          <View className="flex-row items-center gap-1.5 mt-0.5">
            <Sparkles size={11} color="#f97316" />
            <Text className="text-xs text-neutral-500">
              {returns.length} returns processed
            </Text>
          </View>
        </View>
        <Pressable
          onPress={() => {
            Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
            router.push('/returns/new');
          }}
          className="h-11 px-4 rounded-2xl flex-row items-center gap-1.5 active:opacity-80"
          style={{
            backgroundColor: '#f97316',
            shadowColor: '#f97316',
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
          <RefreshControl refreshing={refreshing} onRefresh={onRefresh} tintColor="#f97316" />
        }
        showsVerticalScrollIndicator={false}
      >
        {/* Hero */}
        <View className="px-5 mb-4">
          <View
            className="rounded-3xl p-5"
            style={{
              backgroundColor: '#f97316',
              shadowColor: '#f97316',
              shadowOpacity: 0.3,
              shadowRadius: 16,
              shadowOffset: { width: 0, height: 8 },
              elevation: 10,
            }}
          >
            <View className="flex-row items-center gap-3">
              <View className="h-14 w-14 rounded-2xl bg-white/20 items-center justify-center">
                <RotateCcw size={28} color="#ffffff" />
              </View>
              <View className="flex-1">
                <Text className="text-xs font-bold uppercase tracking-wider text-white/80">{t('auto.index.total_refunded')}</Text>
                <Text className="text-3xl font-extrabold text-white">
                  {formatPKRFull(totalRefunded)}
                </Text>
                <Text className="text-xs text-white/80 mt-0.5">
                  Across {returns.length} returns
                </Text>
              </View>
            </View>
          </View>
        </View>

        {/* Returns List */}
        <View className="px-5">
          {returns.length === 0 ? (
            <View className="rounded-2xl bg-white dark:bg-neutral-900 border border-neutral-200 dark:border-neutral-800 items-center py-12">
              <View className="h-16 w-16 rounded-3xl bg-orange-100 dark:bg-orange-950/40 items-center justify-center">
                <RotateCcw size={32} color="#f97316" />
              </View>
              <Text className="mt-3 text-base font-bold text-neutral-700 dark:text-neutral-300">{t('auto.index.no_returns_yet')}</Text>
              <Text className="mt-1 text-xs text-neutral-500 text-center px-8">{t('auto.index.sale_ki_receipt_se_return_process_karein')}</Text>
              <Pressable
                onPress={() => router.push('/returns/new')}
                className="mt-4 h-10 px-5 rounded-xl flex-row items-center gap-1.5"
                style={{ backgroundColor: '#f97316' }}
              >
                <Plus size={16} color="#ffffff" />
                <Text className="text-white font-bold text-sm">{t('auto.new.process_return')}</Text>
              </Pressable>
            </View>
          ) : (
            <View className="gap-2.5">
              {returns.map((r) => (
                <Pressable
                  key={r.id}
                  onPress={() => {
                    Haptics.selectionAsync();
                    router.push(`/returns/${r.id}` as any);
                  }}
                  className="rounded-2xl bg-white dark:bg-neutral-900 border border-neutral-200 dark:border-neutral-800 p-3.5 active:opacity-70"
                >
                  <View className="flex-row items-center gap-3">
                    <View
                      className="h-12 w-12 rounded-2xl items-center justify-center"
                      style={{ backgroundColor: '#ffedd5' }}
                    >
                      <RotateCcw size={20} color="#f97316" />
                    </View>
                    <View className="flex-1">
                      <Text className="font-mono text-sm font-extrabold text-neutral-900 dark:text-white">
                        {r.returnNumber}
                      </Text>
                      <View className="flex-row items-center gap-1 mt-0.5">
                        <Receipt size={10} color="#737373" />
                        <Text className="text-xs text-neutral-500">
                          From: {r.sale.saleNumber}
                        </Text>
                      </View>
                      {r.sale.customer && (
                        <View className="flex-row items-center gap-1 mt-0.5">
                          <User size={10} color="#737373" />
                          <Text className="text-[11px] text-neutral-500" numberOfLines={1}>
                            {r.sale.customer.name}
                          </Text>
                        </View>
                      )}
                      <View className="flex-row items-center gap-1 mt-1">
                        <CalendarClock size={10} color="#9ca3af" />
                        <Text className="text-[10px] text-neutral-500">
                          {formatDate(r.returnedAt)}
                        </Text>
                      </View>
                    </View>
                    <View className="items-end">
                      <Text className="text-base font-extrabold text-rose-700">
                        -{formatPKRFull(r.refundAmount)}
                      </Text>
                      <View
                        className="flex-row items-center gap-1 mt-1 px-2 py-0.5 rounded-md"
                        style={{ backgroundColor: '#dcfce7' }}
                      >
                        <Banknote size={9} color="#15803d" />
                        <Text className="text-[9px] font-extrabold text-emerald-700">
                          {r.refundMethod}
                        </Text>
                      </View>
                    </View>
                    <ChevronRight size={16} color="#9ca3af" />
                  </View>

                  {r.items && r.items.length > 0 && (
                    <View className="mt-2.5 pt-2.5 border-t border-neutral-100 dark:border-neutral-800">
                      {r.items.slice(0, 2).map((item) => (
                        <View key={item.id} className="flex-row items-center gap-1.5">
                          <Package size={10} color="#9ca3af" />
                          <Text className="text-[11px] text-neutral-500 flex-1" numberOfLines={1}>
                            {item.product.name} × {item.quantity}
                          </Text>
                          <Text className="text-[11px] font-bold text-neutral-700">
                            {formatPKRFull(item.total)}
                          </Text>
                        </View>
                      ))}
                      {r.items.length > 2 && (
                        <Text className="text-[10px] text-neutral-500 mt-0.5">
                          + {r.items.length - 2} more
                        </Text>
                      )}
                    </View>
                  )}

                  {r.reason && (
                    <View className="mt-2 px-2 py-1.5 rounded-lg bg-orange-50">
                      <Text className="text-[10px] text-orange-700">
                        Reason: <Text className="font-bold">{r.reason}</Text>
                      </Text>
                    </View>
                  )}
                </Pressable>
              ))}
            </View>
          )}
        </View>
      </ScrollView>
    </SafeAreaView>
  );
}
