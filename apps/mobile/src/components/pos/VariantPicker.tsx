import { useState, useMemo } from 'react';
import {
  Modal, View, Text, TextInput, Pressable, ScrollView, Image,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import * as Haptics from 'expo-haptics';
import { X, Search, Package, AlertCircle, Check } from 'lucide-react-native';
import { formatPKRFull, formatQty } from '@/lib/format';
import type { Product } from '@/api/products.api';
import type { ProductVariant } from '@/api/product-variants.api';

interface Props {
  visible: boolean;
  product: Product | null;
  variants: ProductVariant[];
  onSelect: (variant: ProductVariant) => void;
  onClose: () => void;
}

export function VariantPicker({ visible, product, variants, onSelect, onClose }: Props) {
  const [search, setSearch] = useState('');

  const filtered = useMemo(() => {
    const active = variants.filter((v) => v.isActive);
    const q = search.toLowerCase().trim();
    if (!q) return active;
    return active.filter(
      (v) =>
        v.name.toLowerCase().includes(q) ||
        (v.sku || '').toLowerCase().includes(q) ||
        (v.barcode || '').toLowerCase().includes(q) ||
        (v.color || '').toLowerCase().includes(q) ||
        (v.size || '').toLowerCase().includes(q),
    );
  }, [variants, search]);

  const handleSelect = (v: ProductVariant) => {
    if (v.stock <= 0) return;
    Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Medium);
    onSelect(v);
  };

  if (!product) return null;

  return (
    <Modal
      visible={visible}
      animationType="slide"
      presentationStyle="pageSheet"
      onRequestClose={onClose}
    >
      <SafeAreaView className="flex-1 bg-neutral-50 dark:bg-neutral-950">
        {/* Header */}
        <View className="px-5 py-4 border-b border-neutral-200 dark:border-neutral-800 flex-row items-center gap-3">
          <View
            className="h-11 w-11 rounded-2xl items-center justify-center"
            style={{ backgroundColor: '#8b5cf6' }}
          >
            <Package size={20} color="#ffffff" />
          </View>
          <View className="flex-1 min-w-0">
            <Text className="text-xs uppercase tracking-wider text-violet-700 dark:text-violet-400 font-extrabold">
              Select Variant
            </Text>
            <Text className="text-base font-bold text-neutral-900 dark:text-white" numberOfLines={1}>
              {product.name}
            </Text>
            <Text className="text-[11px] text-neutral-500">
              {variants.length} variant{variants.length !== 1 ? 's' : ''} available
            </Text>
          </View>
          <Pressable
            onPress={onClose}
            hitSlop={12}
            className="h-10 w-10 rounded-2xl bg-neutral-100 dark:bg-neutral-800 items-center justify-center"
          >
            <X size={20} color="#6b7280" />
          </Pressable>
        </View>

        {/* Search */}
        <View className="px-5 py-3 border-b border-neutral-200 dark:border-neutral-800">
          <View className="flex-row items-center gap-2 rounded-2xl border border-neutral-200 dark:border-neutral-800 bg-white dark:bg-neutral-900 px-4 h-12">
            <Search size={18} color="#9ca3af" />
            <TextInput
              value={search}
              onChangeText={setSearch}
              placeholder="Search variant by name, color, code..."
              placeholderTextColor="#9ca3af"
              autoFocus
              className="flex-1 text-base text-neutral-900 dark:text-white"
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
        </View>

        {/* Variants */}
        <ScrollView contentContainerStyle={{ padding: 20 }} showsVerticalScrollIndicator={false}>
          {filtered.length === 0 ? (
            <View className="items-center py-16">
              <View className="h-16 w-16 rounded-3xl bg-neutral-100 dark:bg-neutral-800 items-center justify-center">
                <AlertCircle size={28} color="#9ca3af" />
              </View>
              <Text className="mt-4 font-bold text-neutral-700 dark:text-neutral-300">
                No variants found
              </Text>
              <Text className="text-xs text-neutral-500 mt-1">
                {search ? `"${search}" se match nahi hua` : 'No active variants'}
              </Text>
            </View>
          ) : (
            <View className="flex-row flex-wrap" style={{ marginHorizontal: -6 }}>
              {filtered.map((v) => {
                const outOfStock = v.stock <= 0;
                const lowStock = v.stock > 0 && v.stock <= (v.lowStockAlert || 5);

                return (
                  <View key={v.id} style={{ width: '50%', padding: 6 }}>
                    <Pressable
                      onPress={() => handleSelect(v)}
                      disabled={outOfStock}
                      className="rounded-2xl bg-white dark:bg-neutral-900 border-2 border-neutral-200 dark:border-neutral-800 overflow-hidden active:opacity-80"
                      style={{ opacity: outOfStock ? 0.5 : 1 }}
                    >
                      {/* Image */}
                      <View style={{ aspectRatio: 1 }} className="bg-neutral-100 dark:bg-neutral-800 relative">
                        {v.imageUrl ? (
                          <Image
                            source={{ uri: v.imageUrl }}
                            style={{ width: '100%', height: '100%' }}
                            resizeMode="cover"
                          />
                        ) : v.colorHex ? (
                          <View
                            style={{ width: '100%', height: '100%', backgroundColor: v.colorHex }}
                          />
                        ) : (
                          <View className="items-center justify-center h-full">
                            <Package size={32} color="#9ca3af" />
                          </View>
                        )}

                        {/* Stock badge */}
                        {outOfStock ? (
                          <View className="absolute inset-0 items-center justify-center" style={{ backgroundColor: 'rgba(220, 38, 38, 0.8)' }}>
                            <View className="px-3 py-1 rounded-full bg-white">
                              <Text className="text-[10px] font-extrabold text-rose-700">OUT OF STOCK</Text>
                            </View>
                          </View>
                        ) : lowStock ? (
                          <View className="absolute top-2 left-2 px-2 py-0.5 rounded-full" style={{ backgroundColor: '#f59e0b' }}>
                            <Text className="text-[9px] font-extrabold text-white">LOW</Text>
                          </View>
                        ) : null}
                      </View>

                      {/* Body */}
                      <View className="p-3">
                        <View className="flex-row items-center gap-1.5">
                          {v.colorHex && (
                            <View
                              style={{
                                height: 10, width: 10, borderRadius: 5,
                                backgroundColor: v.colorHex,
                                borderWidth: 1, borderColor: '#cbd5e1',
                              }}
                            />
                          )}
                          <Text className="font-bold text-neutral-900 dark:text-white text-sm flex-1" numberOfLines={1}>
                            {v.name}
                          </Text>
                        </View>

                        <Text className="text-[10px] text-neutral-500 mt-0.5" numberOfLines={1}>
                          {v.sku || v.size || '—'}
                        </Text>

                        <View className="mt-2 flex-row items-end justify-between">
                          <Text className="text-base font-extrabold text-emerald-700 dark:text-emerald-400">
                            {formatPKRFull(v.price)}
                          </Text>
                          <Text className="text-[10px] font-bold text-neutral-500">
                            {formatQty(v.stock)} {v.unit || product.unit}
                          </Text>
                        </View>
                      </View>
                    </Pressable>
                  </View>
                );
              })}
            </View>
          )}
        </ScrollView>
      </SafeAreaView>
    </Modal>
  );
}
