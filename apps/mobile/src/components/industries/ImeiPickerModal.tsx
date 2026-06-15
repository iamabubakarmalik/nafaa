import { useMemo, useState } from 'react';
import { View, Text, Modal, Pressable, TextInput, ScrollView } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { useQuery } from '@tanstack/react-query';
import * as Haptics from 'expo-haptics';
import {
  X, Search, ScanLine, Check, AlertCircle, Smartphone, ShieldCheck, Sparkles,
} from 'lucide-react-native';
import { imeiApi, type ProductImei } from '@/api/imei.api';

interface Props {
  visible: boolean;
  productId: string;
  productName: string;
  variantId?: string;
  variantName?: string;
  excludeIds?: string[];
  onSelect: (imei: ProductImei) => void;
  onClose: () => void;
}

export function ImeiPickerModal({
  visible, productId, productName, variantId, variantName,
  excludeIds = [], onSelect, onClose,
}: Props) {
  const [search, setSearch] = useState('');

  const { data: imeis = [], isLoading } = useQuery({
    queryKey: ['imei-available', productId, variantId],
    queryFn: () => imeiApi.available(productId, variantId),
    enabled: visible,
  });

  const filtered = useMemo(() => {
    const q = search.toLowerCase().trim();
    if (!q) return imeis;
    return imeis.filter(
      (i) =>
        i.imei1.toLowerCase().includes(q) ||
        (i.imei2 || '').toLowerCase().includes(q) ||
        (i.serialNumber || '').toLowerCase().includes(q),
    );
  }, [imeis, search]);

  const excludedSet = new Set(excludeIds);

  return (
    <Modal
      visible={visible}
      animationType="slide"
      presentationStyle="pageSheet"
      onRequestClose={onClose}
    >
      <SafeAreaView className="flex-1 bg-neutral-50 dark:bg-neutral-950">
        {/* Header */}
        <View className="px-5 py-4 border-b border-neutral-200 dark:border-neutral-800 bg-blue-50 dark:bg-blue-950/30">
          <View className="flex-row items-center gap-3">
            <View
              className="h-12 w-12 rounded-2xl items-center justify-center"
              style={{ backgroundColor: '#2563eb' }}
            >
              <Smartphone size={22} color="#ffffff" />
            </View>
            <View className="flex-1 min-w-0">
              <Text className="text-[10px] uppercase tracking-wider text-blue-700 dark:text-blue-400 font-bold">
                Select IMEI
              </Text>
              <Text className="font-bold text-neutral-900 dark:text-white" numberOfLines={1}>
                {productName}
              </Text>
              {variantName && (
                <Text className="text-xs text-violet-700 dark:text-violet-400 font-semibold" numberOfLines={1}>
                  {variantName}
                </Text>
              )}
            </View>
            <Pressable
              onPress={onClose}
              hitSlop={12}
              className="h-10 w-10 rounded-2xl bg-white dark:bg-neutral-900 items-center justify-center"
            >
              <X size={20} color="#6b7280" />
            </Pressable>
          </View>

          <View className="flex-row gap-3 mt-3">
            <View className="flex-1 items-center">
              <Text className="text-[10px] uppercase tracking-wider text-neutral-500 font-bold">Available</Text>
              <Text className="text-xl font-extrabold text-emerald-700">{imeis.length}</Text>
            </View>
            <View className="flex-1 items-center">
              <Text className="text-[10px] uppercase tracking-wider text-neutral-500 font-bold">Filtered</Text>
              <Text className="text-xl font-extrabold text-neutral-900 dark:text-white">{filtered.length}</Text>
            </View>
          </View>
        </View>

        {/* Search */}
        <View className="px-5 py-3 border-b border-neutral-100 dark:border-neutral-800 bg-white dark:bg-neutral-900">
          <View className="flex-row items-center gap-2 rounded-2xl border-2 border-blue-200 dark:border-blue-900 bg-blue-50/30 dark:bg-blue-950/20 px-4 h-12">
            <ScanLine size={18} color="#2563eb" />
            <TextInput
              autoFocus
              value={search}
              onChangeText={setSearch}
              placeholder="Scan or type IMEI / Serial..."
              placeholderTextColor="#9ca3af"
              className="flex-1 text-base font-mono text-neutral-900 dark:text-white"
            />
            {search.length > 0 && (
              <Pressable
                onPress={() => setSearch('')}
                hitSlop={8}
                className="h-7 w-7 rounded-full bg-neutral-100 dark:bg-neutral-800 items-center justify-center"
              >
                <X size={14} color="#9ca3af" />
              </Pressable>
            )}
          </View>
        </View>

        {/* IMEI list */}
        <ScrollView contentContainerStyle={{ padding: 20 }}>
          {isLoading ? (
            <View className="items-center py-12">
              <View className="h-12 w-12 rounded-full border-4 border-blue-200 border-t-blue-600 animate-spin" />
            </View>
          ) : filtered.length === 0 ? (
            <View className="items-center py-12">
              <View className="h-16 w-16 rounded-2xl bg-rose-100 dark:bg-rose-950/40 items-center justify-center">
                <AlertCircle size={28} color="#dc2626" />
              </View>
              <Text className="mt-3 font-bold text-neutral-900 dark:text-white">
                {imeis.length === 0 ? 'No IMEIs available' : 'No matches found'}
              </Text>
              <Text className="text-xs text-neutral-500 mt-1 text-center">
                {imeis.length === 0
                  ? 'Add IMEIs from product page first'
                  : 'Try a different search'}
              </Text>
            </View>
          ) : (
            <View className="gap-2">
              {filtered.map((imei) => {
                const excluded = excludedSet.has(imei.id);
                return (
                  <Pressable
                    key={imei.id}
                    onPress={() => {
                      if (excluded) return;
                      Haptics.notificationAsync(Haptics.NotificationFeedbackType.Success);
                      onSelect(imei);
                    }}
                    disabled={excluded}
                    className="rounded-2xl border-2 p-3"
                    style={{
                      borderColor: excluded ? '#cbd5e1' : '#e5e7eb',
                      backgroundColor: excluded ? '#f8fafc' : '#ffffff',
                      opacity: excluded ? 0.5 : 1,
                    }}
                  >
                    <View className="flex-row items-start justify-between gap-3">
                      <View className="flex-1 min-w-0">
                        <View className="flex-row items-center gap-2 flex-wrap">
                          <Text className="font-mono font-extrabold text-neutral-900 dark:text-white text-base">
                            {imei.imei1}
                          </Text>
                          {excluded && (
                            <View className="px-2 py-0.5 rounded-full bg-amber-100">
                              <Text className="text-[10px] font-bold text-amber-700">IN CART</Text>
                            </View>
                          )}
                          {imei.color && (
                            <View className="px-2 py-0.5 rounded-full bg-violet-100">
                              <Text className="text-[10px] font-bold text-violet-700">{imei.color}</Text>
                            </View>
                          )}
                        </View>

                        {imei.imei2 && (
                          <Text className="text-xs text-neutral-500 mt-1 font-mono">
                            IMEI 2: {imei.imei2}
                          </Text>
                        )}
                        {imei.serialNumber && (
                          <Text className="text-xs text-neutral-500 font-mono">
                            S/N: {imei.serialNumber}
                          </Text>
                        )}

                        <View className="flex-row items-center gap-2 mt-2 flex-wrap">
                          {imei.warrantyMonths && (
                            <View className="flex-row items-center gap-1 px-2 py-0.5 rounded-full bg-teal-100">
                              <ShieldCheck size={10} color="#0d9488" />
                              <Text className="text-[10px] font-bold text-teal-700">
                                {imei.warrantyMonths}m warranty
                              </Text>
                            </View>
                          )}
                        </View>
                      </View>

                      {!excluded && (
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

        {/* Footer hint */}
        <View className="px-5 py-3 border-t border-neutral-100 dark:border-neutral-800 bg-neutral-50 dark:bg-neutral-900 items-center">
          <View className="flex-row items-center gap-1.5">
            <Sparkles size={12} color="#f59e0b" />
            <Text className="text-[11px] text-neutral-500 font-semibold">
              FIFO — oldest stock first
            </Text>
          </View>
        </View>
      </SafeAreaView>
    </Modal>
  );
}
