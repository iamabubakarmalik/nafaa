import { useState } from 'react';
import {
  View, Text, ScrollView, Pressable, Image, RefreshControl, Linking,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { useLocalSearchParams, useRouter, Stack } from 'expo-router';
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import {
  ArrowLeft, Edit3, Crown, Phone, Mail, MapPin, MessageCircle,
  Receipt, Wallet, Star, ShoppingBag, TrendingUp, ArrowRight,
  Calendar, FileText, ArrowUpFromLine, ArrowDownToLine, Cake,
} from 'lucide-react-native';
import { Card } from '@/components/ui/Card';
import { Badge } from '@/components/ui/Badge';
import { Button } from '@/components/ui/Button';
import { customersApi } from '@/api/customers.api';
import { formatPKRFull, formatDate, formatRelative } from '@/lib/format';
import Toast from 'react-native-toast-message';

import { useTranslation } from '@/i18n/useTranslation';
export default function CustomerDetailScreen() {
  const { t } = useTranslation();
  const { id } = useLocalSearchParams<{ id: string }>();
  const router = useRouter();
  const queryClient = useQueryClient();
  const [refreshing, setRefreshing] = useState(false);

  const { data: customer, refetch } = useQuery({
    queryKey: ['customer', id],
    queryFn: () => customersApi.getOne(id),
    enabled: !!id,
  });

  const toggleVipMutation = useMutation({
    mutationFn: () => customersApi.toggleVip(id),
    onSuccess: () => {
      Toast.show({ type: 'success', text1: 'VIP status update ho gaya' });
      queryClient.invalidateQueries({ queryKey: ['customer', id] });
      queryClient.invalidateQueries({ queryKey: ['customers'] });
    },
  });

  const onRefresh = async () => {
    setRefreshing(true);
    await refetch();
    setRefreshing(false);
  };

  if (!customer) {
    return (
      <SafeAreaView className="flex-1 bg-neutral-50 dark:bg-neutral-950 items-center justify-center">
        <Text className="text-neutral-500">{t('auto.section.loading')}</Text>
      </SafeAreaView>
    );
  }

  const openWhatsApp = () => {
    if (!customer.phone) return Toast.show({ type: 'error', text1: 'Phone nahi hai' });
    const phone = customer.phone.replace(/[^0-9]/g, '');
    Linking.openURL(`whatsapp://send?phone=${phone}`).catch(() => {
      Linking.openURL(`https://wa.me/${phone}`);
    });
  };

  const openCall = () => {
    if (!customer.phone) return;
    Linking.openURL(`tel:${customer.phone}`);
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
          <ArrowLeft size={20} color="#2563eb" />
        </Pressable>
        <View className="flex-1">
          <Text className="text-xs text-neutral-500">{t('auto.index.customer_profile')}</Text>
          <Text className="text-lg font-bold text-neutral-900 dark:text-white" numberOfLines={1}>
            {customer.name}
          </Text>
        </View>
        <Pressable
          onPress={() => router.push(`/customers/${id}/edit`)}
          className="h-11 w-11 rounded-2xl bg-blue-600 items-center justify-center"
        >
          <Edit3 size={18} color="#ffffff" />
        </Pressable>
      </View>

      <ScrollView
        contentContainerStyle={{ paddingBottom: 80 }}
        refreshControl={
          <RefreshControl refreshing={refreshing} onRefresh={onRefresh} tintColor="#2563eb" />
        }
        showsVerticalScrollIndicator={false}
      >
        {/* Hero card */}
        <View className="mx-5 rounded-3xl overflow-hidden" style={{ backgroundColor: '#1e3a8a' }}>
          <View className="p-5">
            <View className="flex-row items-center gap-4">
              <View className="relative">
                {customer.avatarUrl ? (
                  <Image
                    source={{ uri: customer.avatarUrl }}
                    className="h-20 w-20 rounded-3xl"
                    style={{ borderWidth: 3, borderColor: 'rgba(255,255,255,0.3)' }}
                  />
                ) : (
                  <View
                    className="h-20 w-20 rounded-3xl items-center justify-center"
                    style={{ backgroundColor: 'rgba(255,255,255,0.2)', borderWidth: 3, borderColor: 'rgba(255,255,255,0.3)' }}
                  >
                    <Text className="text-3xl font-bold text-white">
                      {customer.name.charAt(0).toUpperCase()}
                    </Text>
                  </View>
                )}
                {customer.isVip && (
                  <View className="absolute -top-1 -right-1 h-8 w-8 rounded-full bg-amber-500 items-center justify-center border-2 border-blue-900">
                    <Crown size={14} color="#ffffff" />
                  </View>
                )}
              </View>

              <View className="flex-1 min-w-0">
                <Text className="text-xl font-bold text-white" numberOfLines={1}>
                  {customer.name}
                </Text>
                {customer.isVip && (
                  <View className="self-start flex-row items-center gap-1 mt-1 px-2 py-0.5 rounded-full bg-amber-500/30">
                    <Crown size={10} color="#fbbf24" />
                    <Text className="text-[10px] font-bold text-amber-200">{t('auto.index.vip_customer')}</Text>
                  </View>
                )}
                {customer.phone && (
                  <View className="flex-row items-center gap-1 mt-1.5">
                    <Phone size={11} color="rgba(255,255,255,0.8)" />
                    <Text className="text-xs text-white/80">{customer.phone}</Text>
                  </View>
                )}
                {customer.city && (
                  <View className="flex-row items-center gap-1 mt-0.5">
                    <MapPin size={11} color="rgba(255,255,255,0.8)" />
                    <Text className="text-xs text-white/80">
                      {customer.city}{customer.area && `, ${customer.area}`}
                    </Text>
                  </View>
                )}
              </View>
            </View>

            {/* Action buttons */}
            <View className="flex-row gap-2 mt-4">
              {customer.phone && (
                <Pressable
                  onPress={openCall}
                  className="flex-1 flex-row items-center justify-center gap-2 py-2.5 rounded-xl bg-white/20 active:bg-white/30"
                >
                  <Phone size={16} color="#ffffff" />
                  <Text className="text-white font-bold text-sm">{t('auto.index.call')}</Text>
                </Pressable>
              )}
              {customer.phone && (
                <Pressable
                  onPress={openWhatsApp}
                  className="flex-1 flex-row items-center justify-center gap-2 py-2.5 rounded-xl bg-green-600 active:opacity-80"
                >
                  <MessageCircle size={16} color="#ffffff" />
                  <Text className="text-white font-bold text-sm">{t('auto.section.whatsapp')}</Text>
                </Pressable>
              )}
              <Pressable
                onPress={() => toggleVipMutation.mutate()}
                className="px-3 py-2.5 rounded-xl bg-white/20 active:bg-white/30"
              >
                <Crown size={16} color={customer.isVip ? '#fbbf24' : '#ffffff'} fill={customer.isVip ? '#fbbf24' : 'none'} />
              </Pressable>
            </View>
          </View>
        </View>

        {/* Stats grid */}
        <View className="px-5 mt-4">
          <View className="flex-row flex-wrap -mx-1.5">
            <View className="w-1/2 px-1.5 mb-3">
              <Card variant="outline" className="p-4">
                <View className="h-9 w-9 rounded-xl bg-emerald-100 dark:bg-emerald-950/40 items-center justify-center">
                  <ShoppingBag size={18} color="#16a34a" />
                </View>
                <Text className="mt-2 text-[10px] font-bold uppercase tracking-wider text-neutral-500">{t('auto.index.total_sales')}</Text>
                <Text className="text-xl font-bold text-neutral-900 dark:text-white">
                  {customer.stats.totalSales}
                </Text>
              </Card>
            </View>
            <View className="w-1/2 px-1.5 mb-3">
              <Card variant="outline" className="p-4">
                <View className="h-9 w-9 rounded-xl bg-blue-100 dark:bg-blue-950/40 items-center justify-center">
                  <TrendingUp size={18} color="#2563eb" />
                </View>
                <Text className="mt-2 text-[10px] font-bold uppercase tracking-wider text-neutral-500">{t('auto.index.total_spent')}</Text>
                <Text className="text-xl font-bold text-emerald-700 dark:text-emerald-400">
                  {formatPKRFull(customer.stats.totalSpent)}
                </Text>
              </Card>
            </View>
            <View className="w-1/2 px-1.5 mb-3">
              <Card
                variant="outline"
                className={`p-4 ${customer.balance > 0 ? 'bg-rose-50 dark:bg-rose-950/40 border-rose-200' : ''}`}
              >
                <View
                  className={`h-9 w-9 rounded-xl items-center justify-center ${
                    customer.balance > 0
                      ? 'bg-rose-200 dark:bg-rose-900/50'
                      : 'bg-neutral-100 dark:bg-neutral-800'
                  }`}
                >
                  <Wallet size={18} color={customer.balance > 0 ? '#dc2626' : '#6b7280'} />
                </View>
                <Text className="mt-2 text-[10px] font-bold uppercase tracking-wider text-neutral-500">{t('auto.id.khata')}</Text>
                <Text
                  className={`text-xl font-bold ${
                    customer.balance > 0
                      ? 'text-rose-700 dark:text-rose-400'
                      : 'text-neutral-900 dark:text-white'
                  }`}
                >
                  {formatPKRFull(customer.balance)}
                </Text>
                {customer.creditLimit > 0 && (
                  <Text className="text-[10px] text-neutral-500 mt-0.5">
                    Limit: {formatPKRFull(customer.creditLimit)}
                  </Text>
                )}
              </Card>
            </View>
            <View className="w-1/2 px-1.5 mb-3">
              <View className="rounded-2xl p-4" style={{ backgroundColor: '#f59e0b' }}>
                <View className="h-9 w-9 rounded-xl bg-white/20 items-center justify-center">
                  <Star size={18} color="#ffffff" fill="#ffffff" />
                </View>
                <Text className="mt-2 text-[10px] font-bold uppercase tracking-wider text-white/80">{t('auto.section.loyalty_points')}</Text>
                <Text className="text-xl font-bold text-white">{customer.loyaltyPoints}</Text>
              </View>
            </View>
          </View>
        </View>

        {/* Quick info */}
        {(customer.cnic || customer.dateOfBirth || customer.email) && (
          <View className="px-5 mb-4">
            <Card variant="outline" className="p-4">
              <Text className="text-xs font-bold uppercase tracking-wider text-neutral-500 mb-3">{t('auto.index.personal_info')}</Text>
              <View className="gap-2">
                {customer.email && (
                  <View className="flex-row items-center gap-2">
                    <Mail size={14} color="#9ca3af" />
                    <Text className="text-sm text-neutral-700 dark:text-neutral-300">
                      {customer.email}
                    </Text>
                  </View>
                )}
                {customer.cnic && (
                  <View className="flex-row items-center gap-2">
                    <FileText size={14} color="#9ca3af" />
                    <Text className="text-sm font-mono text-neutral-700 dark:text-neutral-300">
                      {customer.cnic}
                    </Text>
                  </View>
                )}
                {customer.dateOfBirth && (
                  <View className="flex-row items-center gap-2">
                    <Cake size={14} color="#9ca3af" />
                    <Text className="text-sm text-neutral-700 dark:text-neutral-300">
                      {formatDate(customer.dateOfBirth)}
                    </Text>
                  </View>
                )}
                {customer.address && (
                  <View className="flex-row items-start gap-2">
                    <MapPin size={14} color="#9ca3af" />
                    <Text className="text-sm text-neutral-700 dark:text-neutral-300 flex-1">
                      {customer.address}
                    </Text>
                  </View>
                )}
              </View>
            </Card>
          </View>
        )}

        {/* Recent Sales */}
        <View className="px-5 mb-4">
          <View className="flex-row items-center justify-between mb-2">
            <View className="flex-row items-center gap-2">
              <Receipt size={16} color="#16a34a" />
              <Text className="font-bold text-neutral-900 dark:text-white">{t('auto.index.recent_sales')}</Text>
            </View>
            <Text className="text-xs text-neutral-500">{customer._count.sales} total</Text>
          </View>

          {customer.sales.length === 0 ? (
            <Card variant="outline" className="p-6 items-center">
              <Receipt size={32} color="#d1d5db" />
              <Text className="mt-2 text-sm text-neutral-500">{t('auto.index.abhi_koi_sale_nahi')}</Text>
            </Card>
          ) : (
            <View className="gap-2">
              {customer.sales.slice(0, 5).map((s) => (
                <Pressable
                  key={s.id}
                  onPress={() => router.push(`/sales/${s.id}`)}
                  className="active:opacity-70"
                >
                  <Card variant="outline" className="p-3">
                    <View className="flex-row items-center justify-between">
                      <View className="flex-1 min-w-0">
                        <Text className="font-bold text-neutral-900 dark:text-white text-sm">
                          {s.saleNumber}
                        </Text>
                        <Text className="text-xs text-neutral-500 mt-0.5">
                          {formatRelative(s.soldAt)} • {s.paymentMethod}
                        </Text>
                      </View>
                      <View className="items-end">
                        <Text className="font-bold text-emerald-700 dark:text-emerald-400 text-sm">
                          {formatPKRFull(s.total)}
                        </Text>
                        {s.creditAmount > 0 && (
                          <Text className="text-[10px] text-rose-600 mt-0.5">
                            Credit: {formatPKRFull(s.creditAmount)}
                          </Text>
                        )}
                      </View>
                      <ArrowRight size={16} color="#9ca3af" className="ml-2" />
                    </View>
                  </Card>
                </Pressable>
              ))}
            </View>
          )}
        </View>

        {/* Khata Ledger */}
        <View className="px-5 mb-4">
          <View className="flex-row items-center justify-between mb-2">
            <View className="flex-row items-center gap-2">
              <Wallet size={16} color="#dc2626" />
              <Text className="font-bold text-neutral-900 dark:text-white">{t('auto.index.khata_ledger')}</Text>
            </View>
            <Text className="text-xs text-neutral-500">{customer._count.ledgers} entries</Text>
          </View>

          {customer.ledgers.length === 0 ? (
            <Card variant="outline" className="p-6 items-center">
              <Wallet size={32} color="#d1d5db" />
              <Text className="mt-2 text-sm text-neutral-500">{t('auto.index.koi_transaction_nahi')}</Text>
            </Card>
          ) : (
            <View className="gap-2">
              {customer.ledgers.slice(0, 8).map((l) => {
                const isCredit = l.amount > 0;
                const Icon = isCredit ? ArrowUpFromLine : ArrowDownToLine;
                return (
                  <Card key={l.id} variant="outline" className="p-3">
                    <View className="flex-row items-center gap-3">
                      <View
                        className={`h-9 w-9 rounded-xl items-center justify-center ${
                          isCredit
                            ? 'bg-rose-100 dark:bg-rose-950/40'
                            : 'bg-emerald-100 dark:bg-emerald-950/40'
                        }`}
                      >
                        <Icon size={16} color={isCredit ? '#dc2626' : '#16a34a'} />
                      </View>
                      <View className="flex-1 min-w-0">
                        <Text className="font-bold text-sm text-neutral-900 dark:text-white">
                          {l.type.replace(/_/g, ' ')}
                        </Text>
                        <Text className="text-xs text-neutral-500" numberOfLines={1}>
                          {l.note || l.reference || '—'}
                        </Text>
                        <Text className="text-[10px] text-neutral-400 mt-0.5">
                          {formatRelative(l.createdAt)}
                        </Text>
                      </View>
                      <View className="items-end">
                        <Text
                          className={`font-bold text-sm ${
                            isCredit
                              ? 'text-rose-700 dark:text-rose-400'
                              : 'text-emerald-700 dark:text-emerald-400'
                          }`}
                        >
                          {isCredit ? '+' : ''}
                          {formatPKRFull(l.amount)}
                        </Text>
                        <Text className="text-[10px] text-neutral-500">
                          Bal: {formatPKRFull(l.balanceAfter)}
                        </Text>
                      </View>
                    </View>
                  </Card>
                );
              })}
            </View>
          )}
        </View>

        {/* Notes */}
        {customer.notes && (
          <View className="px-5 mb-4">
            <Card variant="outline" className="bg-amber-50 dark:bg-amber-950/40 border-amber-200 dark:border-amber-900 p-4">
              <View className="flex-row items-center gap-2 mb-2">
                <FileText size={14} color="#b45309" />
                <Text className="font-bold text-amber-900 dark:text-amber-200 text-sm">{t('auto.new.notes')}</Text>
              </View>
              <Text className="text-sm text-amber-900/80 dark:text-amber-200/80 leading-5">
                {customer.notes}
              </Text>
            </Card>
          </View>
        )}
      </ScrollView>
    </SafeAreaView>
  );
}
