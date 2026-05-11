import { useState } from 'react';
import {
  View, Text, FlatList, Pressable, RefreshControl, Image,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { useRouter, Stack } from 'expo-router';
import { useQuery } from '@tanstack/react-query';
import {
  ArrowLeft, Search, Truck, Plus, Phone, MapPin,
} from 'lucide-react-native';
import { Card } from '@/components/ui/Card';
import { Badge } from '@/components/ui/Badge';
import { Input } from '@/components/ui/Input';
import { Button } from '@/components/ui/Button';
import { suppliersApi } from '@/api/suppliers.api';
import { formatPKRFull } from '@/lib/format';

import { useTranslation } from '@/i18n/useTranslation';
export default function SuppliersScreen() {
  const { t } = useTranslation();
  const router = useRouter();
  const [search, setSearch] = useState('');
  const [refreshing, setRefreshing] = useState(false);

  const { data, refetch } = useQuery({
    queryKey: ['suppliers', search],
    queryFn: () => suppliersApi.list({ search, page: 1, limit: 50 }),
  });

  const onRefresh = async () => {
    setRefreshing(true);
    await refetch();
    setRefreshing(false);
  };

  const items = data?.items ?? [];

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
          <Text className="text-2xl font-bold text-neutral-900 dark:text-white">{t('auto.index.suppliers')}</Text>
          <Text className="text-xs text-neutral-500">{items.length} suppliers</Text>
        </View>
        <Pressable
          onPress={() => router.push('/suppliers/new')}
          className="h-11 w-11 rounded-2xl bg-orange-600 items-center justify-center"
        >
          <Plus size={22} color="#ffffff" />
        </Pressable>
      </View>

      <View className="px-5 pb-3">
        <Input
          placeholder="Naam, NTN, contact se search..."
          value={search}
          onChangeText={setSearch}
          leftIcon={<Search size={20} color="#9ca3af" />}
        />
      </View>

      <FlatList
        data={items}
        keyExtractor={(s) => s.id}
        contentContainerStyle={{ paddingHorizontal: 20, paddingBottom: 80 }}
        refreshControl={
          <RefreshControl refreshing={refreshing} onRefresh={onRefresh} tintColor="#f97316" />
        }
        ListEmptyComponent={
          <View className="items-center py-20 px-10">
            <View className="h-20 w-20 rounded-3xl bg-orange-100 dark:bg-orange-950/40 items-center justify-center">
              <Truck size={36} color="#f97316" />
            </View>
            <Text className="mt-5 text-lg font-bold text-neutral-900 dark:text-white">{t('auto.index.koi_supplier_nahi')}</Text>
            <Button size="md" className="mt-6 bg-orange-600" onPress={() => router.push('/suppliers/new')}>
              <Plus size={18} color="#fff" />
              <Text className="text-white font-bold">{t('auto.index.supplier_add_karein')}</Text>
            </Button>
          </View>
        }
        ItemSeparatorComponent={() => <View className="h-2.5" />}
        renderItem={({ item }) => (
          <Pressable
            onPress={() => router.push(`/suppliers/${item.id}`)}
            className="active:opacity-80"
          >
            <Card variant="outline" className="p-3">
              <View className="flex-row items-center gap-3">
                {item.logoUrl ? (
                  <Image source={{ uri: item.logoUrl }} className="h-14 w-14 rounded-2xl" />
                ) : (
                  <View className="h-14 w-14 rounded-2xl bg-orange-100 dark:bg-orange-950/40 items-center justify-center">
                    <Text className="text-orange-700 dark:text-orange-300 text-lg font-bold">
                      {item.name.charAt(0).toUpperCase()}
                    </Text>
                  </View>
                )}

                <View className="flex-1 min-w-0">
                  <Text className="font-bold text-neutral-900 dark:text-white" numberOfLines={1}>
                    {item.name}
                  </Text>
                  {item.contactPerson && (
                    <Text className="text-xs text-neutral-500" numberOfLines={1}>
                      {item.contactPerson}
                    </Text>
                  )}
                  <View className="flex-row items-center gap-2 mt-1">
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
                  {item.paymentTerms && (
                    <View className="self-start mt-1.5 px-2 py-0.5 rounded-full bg-orange-100 dark:bg-orange-950/40">
                      <Text className="text-[10px] font-bold text-orange-700 dark:text-orange-400">
                        {item.paymentTerms}
                      </Text>
                    </View>
                  )}
                </View>

                <View className="items-end">
                  <Text className="text-[10px] text-neutral-500 uppercase font-bold">{t('auto.receipt.total')}</Text>
                  <Text className="text-sm font-bold text-emerald-700 dark:text-emerald-400">
                    {formatPKRFull(item.totalPurchased)}
                  </Text>
                </View>
              </View>
            </Card>
          </Pressable>
        )}
      />
    </SafeAreaView>
  );
}
