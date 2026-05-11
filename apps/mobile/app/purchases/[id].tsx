import { useState } from 'react';
import {
  View, Text, ScrollView, Pressable, RefreshControl,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { useLocalSearchParams, useRouter, Stack } from 'expo-router';
import { useQuery } from '@tanstack/react-query';
import {
  ArrowLeft, PackagePlus, Sparkles, Truck, Package, CalendarClock,
  Banknote, CreditCard, Smartphone, Building2, Zap, Wallet, Receipt,
  User, Phone,
} from 'lucide-react-native';
import { purchasesApi } from '@/api/purchases.api';
import { formatPKRFull } from '@/lib/format';

import { useTranslation } from '@/i18n/useTranslation';
const formatDate = (v: string) =>
  new Intl.DateTimeFormat('en-PK', { dateStyle: 'medium', timeStyle: 'short' }).format(new Date(v));

const pmIcons: Record<string, any> = {
  CASH: Banknote, CARD: CreditCard, JAZZCASH: Smartphone,
  EASYPAISA: Zap, BANK_TRANSFER: Building2,
};

const pmColors: Record<string, string> = {
  CASH: '#16a34a', CARD: '#2563eb', JAZZCASH: '#f97316',
  EASYPAISA: '#22c55e', BANK_TRANSFER: '#8b5cf6',
};

export default function PurchaseDetailScreen() {
  const { t } = useTranslation();
  const { id } = useLocalSearchParams<{ id: string }>();
  const router = useRouter();
  const [refreshing, setRefreshing] = useState(false);

  const { data: purchase, refetch } = useQuery({
    queryKey: ['purchase', id],
    queryFn: async () => {
      try {
        const all = await purchasesApi.list();
        return all.find((p) => p.id === id) ?? null;
      } catch {
        return null;
      }
    },
    enabled: !!id,
  });

  const onRefresh = async () => {
    setRefreshing(true);
    await refetch();
    setRefreshing(false);
  };

  if (!purchase) {
    return (
      <SafeAreaView className="flex-1 bg-neutral-50 dark:bg-neutral-950 items-center justify-center">
        <Stack.Screen options={{ headerShown: false }} />
        <PackagePlus size={36} color="#9ca3af" />
        <Text className="mt-3 text-neutral-500">{t('auto.id.loading_purchase')}</Text>
      </SafeAreaView>
    );
  }

  const PMIcon = pmIcons[purchase.paymentMethod] || Banknote;
  const pmColor = pmColors[purchase.paymentMethod] || '#16a34a';
  const credit = Math.max(0, purchase.total - purchase.paidAmount);

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
          <Text className="text-xs text-neutral-500">{t('auto.id.purchase_detail')}</Text>
          <Text className="text-lg font-extrabold text-neutral-900 dark:text-white">
            {purchase.purchaseNumber}
          </Text>
        </View>
      </View>

      <ScrollView
        contentContainerStyle={{ paddingBottom: 40 }}
        refreshControl={<RefreshControl refreshing={refreshing} onRefresh={onRefresh} tintColor="#7c3aed" />}
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
            <Text className="text-xs font-bold uppercase tracking-wider text-white/80">{t('auto.new.purchase_total')}</Text>
            <Text className="text-5xl font-extrabold text-white mt-1">
              {formatPKRFull(purchase.total)}
            </Text>
            <View className="mt-3 pt-3 border-t border-white/20 flex-row items-center gap-3">
              <View
                className="px-2 py-0.5 rounded-md"
                style={{ backgroundColor: 'rgba(255,255,255,0.2)' }}
              >
                <Text className="text-[10px] font-extrabold text-white">
                  {purchase.status}
                </Text>
              </View>
              <View className="flex-row items-center gap-1">
                <CalendarClock size={11} color="rgba(255,255,255,0.8)" />
                <Text className="text-xs text-white/80">
                  {formatDate(purchase.purchasedAt)}
                </Text>
              </View>
            </View>
          </View>
        </View>

        {/* Supplier */}
        <View className="px-5 mb-4">
          <Text className="text-xs font-bold uppercase text-neutral-500 mb-2 tracking-wider">{t('auto.new.supplier')}</Text>
          <View className="rounded-2xl bg-white dark:bg-neutral-900 border border-neutral-200 dark:border-neutral-800 p-4 flex-row items-center gap-3">
            <View className="h-12 w-12 rounded-2xl bg-orange-100 items-center justify-center">
              <Truck size={20} color="#f97316" />
            </View>
            <View className="flex-1">
              <Text className="font-extrabold text-neutral-900 dark:text-white">
                {purchase.supplier.name}
              </Text>
              {purchase.supplier.phone && (
                <View className="flex-row items-center gap-1 mt-0.5">
                  <Phone size={11} color="#737373" />
                  <Text className="text-xs text-neutral-500">{purchase.supplier.phone}</Text>
                </View>
              )}
            </View>
          </View>
        </View>

        {/* Payment Info */}
        <View className="px-5 mb-4">
          <Text className="text-xs font-bold uppercase text-neutral-500 mb-2 tracking-wider">{t('auto.id.payment')}</Text>
          <View className="rounded-2xl bg-white dark:bg-neutral-900 border border-neutral-200 dark:border-neutral-800 p-4 gap-3">
            <View className="flex-row items-center gap-3">
              <View
                className="h-10 w-10 rounded-xl items-center justify-center"
                style={{ backgroundColor: `${pmColor}20` }}
              >
                <PMIcon size={18} color={pmColor} />
              </View>
              <Text className="flex-1 font-bold text-neutral-900 dark:text-white">
                {purchase.paymentMethod}
              </Text>
            </View>

            <View className="pt-3 border-t border-neutral-100 gap-1.5">
              <View className="flex-row justify-between">
                <Text className="text-xs text-neutral-500">{t('auto.receipt.subtotal')}</Text>
                <Text className="text-xs font-bold text-neutral-700">
                  {formatPKRFull(purchase.subtotal)}
                </Text>
              </View>
              {purchase.discount > 0 && (
                <View className="flex-row justify-between">
                  <Text className="text-xs text-neutral-500">{t('auto.receipt.discount')}</Text>
                  <Text className="text-xs font-bold text-emerald-700">
                    -{formatPKRFull(purchase.discount)}
                  </Text>
                </View>
              )}
              <View className="flex-row justify-between pt-1.5 border-t border-neutral-100">
                <Text className="text-sm font-bold text-neutral-700">{t('auto.receipt.total')}</Text>
                <Text className="text-sm font-extrabold text-neutral-900">
                  {formatPKRFull(purchase.total)}
                </Text>
              </View>
              <View className="flex-row justify-between">
                <Text className="text-xs text-emerald-700 font-semibold">{t('auto.index.paid')}</Text>
                <Text className="text-xs font-bold text-emerald-700">
                  {formatPKRFull(purchase.paidAmount)}
                </Text>
              </View>
              {credit > 0 && (
                <View className="flex-row justify-between">
                  <Text className="text-xs text-rose-700 font-semibold">{t('auto.index.pending')}</Text>
                  <Text className="text-xs font-bold text-rose-700">
                    {formatPKRFull(credit)}
                  </Text>
                </View>
              )}
            </View>
          </View>
        </View>

        {/* Items */}
        <View className="px-5 mb-4">
          <Text className="text-xs font-bold uppercase text-neutral-500 mb-2 tracking-wider">
            Items ({purchase.items.length})
          </Text>
          <View className="gap-2">
            {purchase.items.map((item) => (
              <View
                key={item.id}
                className="rounded-2xl bg-white dark:bg-neutral-900 border border-neutral-200 dark:border-neutral-800 p-3"
              >
                <View className="flex-row items-center gap-3">
                  <View className="h-11 w-11 rounded-2xl bg-violet-100 items-center justify-center">
                    <Package size={18} color="#7c3aed" />
                  </View>
                  <View className="flex-1">
                    <Text className="font-bold text-neutral-900 dark:text-white" numberOfLines={1}>
                      {item.product.name}
                    </Text>
                    <Text className="text-xs text-neutral-500 mt-0.5">
                      {item.quantity} {item.product.unit} × {formatPKRFull(item.costPrice)}
                    </Text>
                  </View>
                  <Text className="text-base font-extrabold text-violet-700">
                    {formatPKRFull(item.total)}
                  </Text>
                </View>
              </View>
            ))}
          </View>
        </View>

        {/* Notes */}
        {purchase.notes && (
          <View className="px-5">
            <Text className="text-xs font-bold uppercase text-neutral-500 mb-2 tracking-wider">{t('auto.new.notes')}</Text>
            <View className="rounded-2xl bg-white dark:bg-neutral-900 border border-neutral-200 dark:border-neutral-800 p-4">
              <Text className="text-sm text-neutral-700 dark:text-neutral-300 leading-5">
                {purchase.notes}
              </Text>
            </View>
          </View>
        )}
      </ScrollView>
    </SafeAreaView>
  );
}
