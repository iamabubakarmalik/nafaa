import { useState } from 'react';
import {
  View, Text, ScrollView, Pressable, Image, RefreshControl, Linking,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { useLocalSearchParams, useRouter, Stack } from 'expo-router';
import { useQuery } from '@tanstack/react-query';
import {
  ArrowLeft, Edit3, Phone, Mail, MapPin, MessageCircle,
  CreditCard, FileText, ShoppingBag, TrendingUp, Wallet, Building2,
} from 'lucide-react-native';
import { Card } from '@/components/ui/Card';
import { suppliersApi } from '@/api/suppliers.api';
import { formatPKRFull, formatRelative } from '@/lib/format';

import { useTranslation } from '@/i18n/useTranslation';
export default function SupplierDetailScreen() {
  const { t } = useTranslation();
  const { id } = useLocalSearchParams<{ id: string }>();
  const router = useRouter();
  const [refreshing, setRefreshing] = useState(false);

  const { data: supplier, refetch } = useQuery({
    queryKey: ['supplier', id],
    queryFn: () => suppliersApi.getOne(id),
    enabled: !!id,
  });

  if (!supplier) {
    return (
      <SafeAreaView className="flex-1 bg-neutral-50 dark:bg-neutral-950 items-center justify-center">
        <Text className="text-neutral-500">{t('auto.section.loading')}</Text>
      </SafeAreaView>
    );
  }

  const onRefresh = async () => {
    setRefreshing(true);
    await refetch();
    setRefreshing(false);
  };

  const openCall = () => supplier.phone && Linking.openURL(`tel:${supplier.phone}`);
  const openWhatsApp = () => {
    if (!supplier.phone) return;
    const phone = supplier.phone.replace(/[^0-9]/g, '');
    Linking.openURL(`whatsapp://send?phone=${phone}`).catch(() =>
      Linking.openURL(`https://wa.me/${phone}`),
    );
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
          <ArrowLeft size={20} color="#f97316" />
        </Pressable>
        <View className="flex-1">
          <Text className="text-xs text-neutral-500">{t('auto.index.supplier_profile')}</Text>
          <Text className="text-lg font-bold text-neutral-900 dark:text-white" numberOfLines={1}>
            {supplier.name}
          </Text>
        </View>
        <Pressable
          onPress={() => router.push(`/suppliers/${id}/edit`)}
          className="h-11 w-11 rounded-2xl bg-orange-600 items-center justify-center"
        >
          <Edit3 size={18} color="#ffffff" />
        </Pressable>
      </View>

      <ScrollView
        contentContainerStyle={{ paddingBottom: 80 }}
        refreshControl={<RefreshControl refreshing={refreshing} onRefresh={onRefresh} />}
        showsVerticalScrollIndicator={false}
      >
        {/* Hero */}
        <View className="mx-5 rounded-3xl p-5" style={{ backgroundColor: '#7c2d12' }}>
          <View className="flex-row items-center gap-4">
            {supplier.logoUrl ? (
              <Image
                source={{ uri: supplier.logoUrl }}
                className="h-20 w-20 rounded-3xl"
                style={{ borderWidth: 3, borderColor: 'rgba(255,255,255,0.3)' }}
              />
            ) : (
              <View
                className="h-20 w-20 rounded-3xl items-center justify-center"
                style={{ backgroundColor: 'rgba(255,255,255,0.2)', borderWidth: 3, borderColor: 'rgba(255,255,255,0.3)' }}
              >
                <Text className="text-3xl font-bold text-white">
                  {supplier.name.charAt(0).toUpperCase()}
                </Text>
              </View>
            )}
            <View className="flex-1">
              <Text className="text-xl font-bold text-white" numberOfLines={1}>
                {supplier.name}
              </Text>
              {supplier.contactPerson && (
                <Text className="text-xs text-white/80 mt-1">{supplier.contactPerson}</Text>
              )}
              {supplier.phone && (
                <View className="flex-row items-center gap-1 mt-1">
                  <Phone size={11} color="rgba(255,255,255,0.8)" />
                  <Text className="text-xs text-white/80">{supplier.phone}</Text>
                </View>
              )}
              {supplier.city && (
                <View className="flex-row items-center gap-1 mt-0.5">
                  <MapPin size={11} color="rgba(255,255,255,0.8)" />
                  <Text className="text-xs text-white/80">
                    {supplier.city}{supplier.area && `, ${supplier.area}`}
                  </Text>
                </View>
              )}
            </View>
          </View>

          <View className="flex-row gap-2 mt-4">
            {supplier.phone && (
              <Pressable
                onPress={openCall}
                className="flex-1 flex-row items-center justify-center gap-2 py-2.5 rounded-xl bg-white/20"
              >
                <Phone size={16} color="#ffffff" />
                <Text className="text-white font-bold text-sm">{t('auto.index.call')}</Text>
              </Pressable>
            )}
            {supplier.phone && (
              <Pressable
                onPress={openWhatsApp}
                className="flex-1 flex-row items-center justify-center gap-2 py-2.5 rounded-xl bg-green-600"
              >
                <MessageCircle size={16} color="#ffffff" />
                <Text className="text-white font-bold text-sm">{t('auto.section.whatsapp')}</Text>
              </Pressable>
            )}
          </View>
        </View>

        {/* Stats */}
        <View className="px-5 mt-4">
          <View className="flex-row flex-wrap -mx-1.5">
            <View className="w-1/2 px-1.5 mb-3">
              <Card variant="outline" className="p-4">
                <View className="h-9 w-9 rounded-xl bg-orange-100 dark:bg-orange-950/40 items-center justify-center">
                  <ShoppingBag size={18} color="#f97316" />
                </View>
                <Text className="mt-2 text-[10px] font-bold uppercase tracking-wider text-neutral-500">{t('auto.index.total_purchases')}</Text>
                <Text className="text-xl font-bold text-neutral-900 dark:text-white">
                  {supplier.stats.totalPurchases}
                </Text>
              </Card>
            </View>
            <View className="w-1/2 px-1.5 mb-3">
              <Card variant="outline" className="p-4">
                <View className="h-9 w-9 rounded-xl bg-blue-100 dark:bg-blue-950/40 items-center justify-center">
                  <TrendingUp size={18} color="#2563eb" />
                </View>
                <Text className="mt-2 text-[10px] font-bold uppercase tracking-wider text-neutral-500">{t('auto.index.total_amount')}</Text>
                <Text className="text-xl font-bold text-blue-700 dark:text-blue-400">
                  {formatPKRFull(supplier.stats.totalAmount)}
                </Text>
              </Card>
            </View>
            <View className="w-1/2 px-1.5 mb-3">
              <Card variant="outline" className="p-4 bg-emerald-50 dark:bg-emerald-950/40 border-emerald-200">
                <View className="h-9 w-9 rounded-xl bg-emerald-200 dark:bg-emerald-900/50 items-center justify-center">
                  <Wallet size={18} color="#16a34a" />
                </View>
                <Text className="mt-2 text-[10px] font-bold uppercase tracking-wider text-emerald-700">{t('auto.index.paid')}</Text>
                <Text className="text-xl font-bold text-emerald-700 dark:text-emerald-400">
                  {formatPKRFull(supplier.stats.totalPaid)}
                </Text>
              </Card>
            </View>
            <View className="w-1/2 px-1.5 mb-3">
              <Card variant="outline" className="p-4 bg-rose-50 dark:bg-rose-950/40 border-rose-200">
                <View className="h-9 w-9 rounded-xl bg-rose-200 dark:bg-rose-900/50 items-center justify-center">
                  <Wallet size={18} color="#dc2626" />
                </View>
                <Text className="mt-2 text-[10px] font-bold uppercase tracking-wider text-rose-700">{t('auto.index.outstanding')}</Text>
                <Text className="text-xl font-bold text-rose-700 dark:text-rose-400">
                  {formatPKRFull(supplier.stats.outstanding)}
                </Text>
              </Card>
            </View>
          </View>
        </View>

        {/* Banking */}
        {(supplier.bankName || supplier.iban || supplier.paymentTerms) && (
          <View className="px-5 mb-4">
            <View className="flex-row items-center gap-2 mb-2">
              <CreditCard size={16} color="#16a34a" />
              <Text className="text-xs font-bold uppercase tracking-wider text-neutral-500">{t('auto.index.banking_payment')}</Text>
            </View>
            <Card variant="outline" className="p-4">
              <View className="gap-3">
                {supplier.bankName && (
                  <View className="flex-row justify-between">
                    <Text className="text-xs text-neutral-500 font-bold uppercase">{t('auto.new.bank')}</Text>
                    <Text className="font-bold text-neutral-900 dark:text-white">{supplier.bankName}</Text>
                  </View>
                )}
                {supplier.accountNumber && (
                  <View className="flex-row justify-between">
                    <Text className="text-xs text-neutral-500 font-bold uppercase">{t('auto.index.account')}</Text>
                    <Text className="font-mono font-bold text-neutral-900 dark:text-white">
                      {supplier.accountNumber}
                    </Text>
                  </View>
                )}
                {supplier.iban && (
                  <View>
                    <Text className="text-xs text-neutral-500 font-bold uppercase">IBAN</Text>
                    <Text className="font-mono font-bold text-neutral-900 dark:text-white text-xs mt-1">
                      {supplier.iban}
                    </Text>
                  </View>
                )}
                {supplier.paymentTerms && (
                  <View className="flex-row justify-between items-center">
                    <Text className="text-xs text-neutral-500 font-bold uppercase">{t('auto.index.terms')}</Text>
                    <View className="px-2 py-0.5 rounded-full bg-orange-100 dark:bg-orange-950/40">
                      <Text className="text-xs font-bold text-orange-700 dark:text-orange-400">
                        {supplier.paymentTerms}
                      </Text>
                    </View>
                  </View>
                )}
                {supplier.ntn && (
                  <View className="flex-row justify-between">
                    <Text className="text-xs text-neutral-500 font-bold uppercase">NTN</Text>
                    <Text className="font-mono font-bold text-neutral-900 dark:text-white">
                      {supplier.ntn}
                    </Text>
                  </View>
                )}
              </View>
            </Card>
          </View>
        )}

        {/* Recent purchases */}
        <View className="px-5 mb-4">
          <View className="flex-row items-center justify-between mb-2">
            <View className="flex-row items-center gap-2">
              <ShoppingBag size={16} color="#f97316" />
              <Text className="font-bold text-neutral-900 dark:text-white">{t('auto.index.recent_purchases')}</Text>
            </View>
            <Text className="text-xs text-neutral-500">{supplier._count.purchases} total</Text>
          </View>
          {supplier.purchases.length === 0 ? (
            <Card variant="outline" className="p-6 items-center">
              <ShoppingBag size={32} color="#d1d5db" />
              <Text className="mt-2 text-sm text-neutral-500">{t('auto.index.koi_purchase_nahi')}</Text>
            </Card>
          ) : (
            <View className="gap-2">
              {supplier.purchases.map((p) => (
                <Card key={p.id} variant="outline" className="p-3">
                  <View className="flex-row items-center justify-between">
                    <View className="flex-1">
                      <Text className="font-bold text-sm text-neutral-900 dark:text-white">
                        {p.purchaseNumber}
                      </Text>
                      <Text className="text-xs text-neutral-500 mt-0.5">
                        {formatRelative(p.purchasedAt)} • {p.paymentMethod}
                      </Text>
                    </View>
                    <View className="items-end">
                      <Text className="font-bold text-blue-700 dark:text-blue-400">
                        {formatPKRFull(p.total)}
                      </Text>
                      <Text className="text-[10px] text-neutral-500">
                        Paid: {formatPKRFull(p.paidAmount)}
                      </Text>
                    </View>
                  </View>
                </Card>
              ))}
            </View>
          )}
        </View>

        {supplier.notes && (
          <View className="px-5 mb-4">
            <Card variant="outline" className="bg-amber-50 dark:bg-amber-950/40 border-amber-200 p-4">
              <View className="flex-row items-center gap-2 mb-2">
                <FileText size={14} color="#b45309" />
                <Text className="font-bold text-amber-900 dark:text-amber-200 text-sm">{t('auto.new.notes')}</Text>
              </View>
              <Text className="text-sm text-amber-900/80 dark:text-amber-200/80 leading-5">
                {supplier.notes}
              </Text>
            </Card>
          </View>
        )}
      </ScrollView>
    </SafeAreaView>
  );
}
