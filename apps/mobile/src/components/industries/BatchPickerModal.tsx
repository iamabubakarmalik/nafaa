import { useMemo, useState } from 'react';
import { View, Text, Modal, Pressable, TextInput, ScrollView } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { useQuery } from '@tanstack/react-query';
import * as Haptics from 'expo-haptics';
import {
  X, Search, Pill, Check, AlertCircle, Calendar, AlertTriangle, Sparkles,
} from 'lucide-react-native';
import { batchesApi, type ProductBatch } from '@/api/batches.api';
import { formatPKRFull } from '@/lib/format';

interface Props {
  visible: boolean;
  productId: string;
  productName: string;
  unit: string;
  variantId?: string;
  variantName?: string;
  quantity: number;
  onSelect: (batch: ProductBatch) => void;
  onClose: () => void;
}

function daysUntil(date?: string | null): number | null {
  if (!date) return null;
  const expiry = new Date(date);
  const now = new Date();
  return Math.floor((expiry.getTime() - now.getTime()) / (1000 * 60 * 60 * 24));
}

export function BatchPickerModal({
  visible, productId, productName, unit, variantId, variantName, quantity, onSelect, onClose,
}: Props) {
  const [search, setSearch] = useState('');

  const { data: batches = [], isLoading } = useQuery({
    queryKey: ['batches-available', productId, variantId],
    queryFn: () => batchesApi.available(productId, variantId),
    enabled: visible,
  });

  const filtered = useMemo(() => {
    const q = search.toLowerCase().trim();
    if (!q) return batches;
    return batches.filter((b) => b.batchNumber.toLowerCase().includes(q));
  }, [batches, search]);

  return (
    <Modal
      visible={visible}
      animationType="slide"
      presentationStyle="pageSheet"
      onRequestClose={onClose}
    >
      <SafeAreaView className="flex-1 bg-neutral-50 dark:bg-neutral-950">
        {/* Header */}
        <View className="px-5 py-4 border-b border-neutral-200 dark:border-neutral-800 bg-rose-50 dark:bg-rose-950/30">
          <View className="flex-row items-center gap-3">
            <View
              className="h-12 w-12 rounded-2xl items-center justify-center"
              style={{ backgroundColor: '#dc2626' }}
            >
              <Pill size={22} color="#ffffff" />
            </View>
            <View className="flex-1 min-w-0">
              <Text className="text-[10px] uppercase tracking-wider text-rose-700 dark:text-rose-400 font-bold">
                Select Batch
              </Text>
              <Text className="font-bold text-neutral-900 dark:text-white" numberOfLines={1}>
                {productName}
              </Text>
              {variantName && (
                <Text className="text-xs text-violet-700 dark:text-violet-400 font-semibold" numberOfLines={1}>
                  {variantName}
                </Text>
              )}
              <Text className="text-xs text-neutral-500 mt-0.5">
                Need: <Text className="font-bold text-rose-700">{quantity} {unit}</Text>
              </Text>
            </View>
            <Pressable
              onPress={onClose}
              hitSlop={12}
              className="h-10 w-10 rounded-2xl bg-white dark:bg-neutral-900 items-center justify-center"
            >
              <X size={20} color="#6b7280" />
            </Pressable>
          </View>
        </View>

        {/* Search */}
        <View className="px-5 py-3 border-b border-neutral-100 dark:border-neutral-800 bg-white dark:bg-neutral-900">
          <View className="flex-row items-center gap-2 rounded-2xl border-2 border-rose-200 dark:border-rose-900 bg-rose-50/30 dark:bg-rose-950/20 px-4 h-12">
            <Search size={18} color="#dc2626" />
            <TextInput
              autoFocus
              value={search}
              onChangeText={setSearch}
              placeholder="Search batch number..."
              placeholderTextColor="#9ca3af"
              className="flex-1 text-base font-mono text-neutral-900 dark:text-white"
            />
          </View>
        </View>

        {/* List */}
        <ScrollView contentContainerStyle={{ padding: 20 }}>
          {isLoading ? (
            <View className="items-center py-12">
              <View className="h-12 w-12 rounded-full border-4 border-rose-200 border-t-rose-600 animate-spin" />
            </View>
          ) : filtered.length === 0 ? (
            <View className="items-center py-12">
              <View className="h-16 w-16 rounded-2xl bg-amber-100 items-center justify-center">
                <AlertCircle size={28} color="#d97706" />
              </View>
              <Text className="mt-3 font-bold text-neutral-900 dark:text-white">
                {batches.length === 0 ? 'No batches available' : 'No matches found'}
              </Text>
              <Text className="text-xs text-neutral-500 mt-1">
                {batches.length === 0 ? 'Add batches from product page' : 'Try different search'}
              </Text>
            </View>
          ) : (
            <View className="gap-2">
              {filtered.map((batch) => {
                const days = daysUntil(batch.expiryDate);
                const isExpired = days !== null && days < 0;
                const isExpiringSoon = days !== null && days >= 0 && days <= 30;
                const insufficient = batch.quantity < quantity;

                return (
                  <Pressable
                    key={batch.id}
                    onPress={() => {
                      if (isExpired) return;
                      Haptics.notificationAsync(Haptics.NotificationFeedbackType.Success);
                      onSelect(batch);
                    }}
                    disabled={isExpired}
                    className="rounded-2xl border-2 p-3"
                    style={{
                      borderColor: isExpired
                        ? '#fca5a5'
                        : isExpiringSoon
                        ? '#fcd34d'
                        : '#e5e7eb',
                      backgroundColor: isExpired
                        ? '#fee2e2'
                        : isExpiringSoon
                        ? '#fef3c7'
                        : '#ffffff',
                      opacity: isExpired ? 0.6 : 1,
                    }}
                  >
                    <View className="flex-row items-start justify-between gap-3">
                      <View className="flex-1 min-w-0">
                        <View className="flex-row items-center gap-2 flex-wrap">
                          <Text className="font-mono font-extrabold text-neutral-900 text-base">
                            #{batch.batchNumber}
                          </Text>
                          {isExpired && (
                            <View className="flex-row items-center gap-1 px-2 py-0.5 rounded-full bg-rose-600">
                              <AlertTriangle size={10} color="#ffffff" />
                              <Text className="text-[10px] font-bold text-white">EXPIRED</Text>
                            </View>
                          )}
                          {!isExpired && isExpiringSoon && (
                            <View className="px-2 py-0.5 rounded-full bg-amber-500">
                              <Text className="text-[10px] font-bold text-white">{days}d left</Text>
                            </View>
                          )}
                          {insufficient && !isExpired && (
                            <View className="px-2 py-0.5 rounded-full bg-orange-100">
                              <Text className="text-[10px] font-bold text-orange-700">
                                ONLY {batch.quantity}
                              </Text>
                            </View>
                          )}
                        </View>

                        <View className="flex-row gap-4 mt-2">
                          <View>
                            <Text className="text-[10px] uppercase text-neutral-500 font-bold">Stock</Text>
                            <Text className="font-bold text-neutral-900">{batch.quantity} {unit}</Text>
                          </View>
                          <View>
                            <Text className="text-[10px] uppercase text-neutral-500 font-bold">Cost</Text>
                            <Text className="font-bold text-neutral-900">{formatPKRFull(batch.costPrice)}</Text>
                          </View>
                        </View>

                        {batch.expiryDate && (
                          <View className="mt-2 flex-row items-center gap-1">
                            <Calendar size={11} color={isExpired ? '#dc2626' : isExpiringSoon ? '#d97706' : '#737373'} />
                            <Text
                              className="text-xs font-bold"
                              style={{
                                color: isExpired
                                  ? '#dc2626'
                                  : isExpiringSoon
                                  ? '#d97706'
                                  : '#374151',
                              }}
                            >
                              Expires: {new Date(batch.expiryDate).toLocaleDateString('en-PK', { day: 'numeric', month: 'short', year: 'numeric' })}
                            </Text>
                          </View>
                        )}
                      </View>

                      {!isExpired && (
                        <View className="h-9 w-9 rounded-full bg-emerald-100 items-center justify-center">
                          <Check size={16} color="#16a34a" />
                        </View>
                      )}
                    </View>
                  </Pressable>
                );
              })}
            </View>
          )}
        </ScrollView>

        {/* Footer */}
        <View className="px-5 py-3 border-t border-neutral-100 dark:border-neutral-800 bg-rose-50/40 items-center">
          <View className="flex-row items-center gap-1.5">
            <Sparkles size={12} color="#f59e0b" />
            <Text className="text-[11px] text-neutral-600 font-semibold">
              FEFO — expiring soon shown first
            </Text>
          </View>
        </View>
      </SafeAreaView>
    </Modal>
  );
}
