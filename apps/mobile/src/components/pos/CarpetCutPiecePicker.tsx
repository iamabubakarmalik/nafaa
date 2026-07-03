import { useState, useMemo } from 'react';
import {
  Modal, View, Text, TextInput, Pressable, ScrollView, ActivityIndicator,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { useQuery } from '@tanstack/react-query';
import * as Haptics from 'expo-haptics';
import { X, Search, Scissors, CheckCircle2, AlertCircle, Package } from 'lucide-react-native';
import {
  carpetCutPiecesApi, type CarpetCutPiece,
} from '@/api/carpet-cut-pieces.api';
import { formatPKRFull } from '@/lib/format';

interface Props {
  visible: boolean;
  productId?: string;
  productName?: string;
  variantId?: string;
  onSelect: (piece: CarpetCutPiece) => void;
  onClose: () => void;
}

export function CarpetCutPiecePicker({
  visible, productId, productName, variantId, onSelect, onClose,
}: Props) {
  const [search, setSearch] = useState('');

  const { data: piecesData, isLoading } = useQuery({
    queryKey: ['pos-cut-pieces', productId, variantId],
    queryFn: () =>
      carpetCutPiecesApi.list({
        productId,
        variantId,
        status: 'AVAILABLE',
        limit: 200,
      }),
    enabled: visible,
  });

  const pieces = piecesData?.items ?? [];

  const filtered = useMemo(() => {
    const q = search.toLowerCase().trim();
    if (!q) return pieces;
    return pieces.filter(
      (p) =>
        p.pieceCode.toLowerCase().includes(q) ||
        p.product?.name.toLowerCase().includes(q) ||
        p.variant?.name?.toLowerCase().includes(q) ||
        (p.notes || '').toLowerCase().includes(q),
    );
  }, [pieces, search]);

  const handleSelect = (piece: CarpetCutPiece) => {
    Haptics.notificationAsync(Haptics.NotificationFeedbackType.Success);
    onSelect(piece);
  };

  return (
    <Modal visible={visible} animationType="slide" presentationStyle="pageSheet" onRequestClose={onClose}>
      <SafeAreaView className="flex-1 bg-neutral-50 dark:bg-neutral-950">
        {/* Header */}
        <View className="px-5 py-4 border-b border-neutral-200 dark:border-neutral-800 flex-row items-center gap-3">
          <View className="h-11 w-11 rounded-2xl items-center justify-center" style={{ backgroundColor: '#8b5cf6' }}>
            <Scissors size={20} color="#ffffff" />
          </View>
          <View className="flex-1 min-w-0">
            <Text className="text-xs uppercase tracking-wider text-violet-700 font-extrabold">
              Cut Pieces
            </Text>
            <Text className="text-base font-bold text-neutral-900 dark:text-white" numberOfLines={1}>
              {productName || 'All carpet cut pieces'}
            </Text>
            <Text className="text-[11px] text-neutral-500">{filtered.length} available</Text>
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
          <View className="flex-row items-center gap-2 rounded-2xl border border-neutral-200 bg-white px-4 h-12">
            <Search size={18} color="#9ca3af" />
            <TextInput
              value={search}
              onChangeText={setSearch}
              placeholder="Search by code, name, notes..."
              placeholderTextColor="#9ca3af"
              autoFocus
              className="flex-1 text-base text-neutral-900"
            />
            {search.length > 0 && (
              <Pressable
                onPress={() => setSearch('')}
                hitSlop={12}
                className="h-7 w-7 rounded-full bg-neutral-100 items-center justify-center"
              >
                <X size={14} color="#9ca3af" />
              </Pressable>
            )}
          </View>
        </View>

        <ScrollView contentContainerStyle={{ padding: 20 }} showsVerticalScrollIndicator={false}>
          {isLoading ? (
            <View className="py-8 items-center">
              <ActivityIndicator color="#8b5cf6" />
            </View>
          ) : filtered.length === 0 ? (
            <View className="items-center py-12">
              <AlertCircle size={36} color="#d1d5db" />
              <Text className="mt-3 font-bold text-neutral-500">No cut pieces found</Text>
              <Text className="text-xs text-neutral-400 mt-1">
                {search ? 'Try different search' : 'Create from carpet rolls'}
              </Text>
            </View>
          ) : (
            <View className="gap-2">
              {filtered.map((piece) => (
                <Pressable
                  key={piece.id}
                  onPress={() => handleSelect(piece)}
                  className="rounded-2xl bg-white dark:bg-neutral-900 border-2 border-neutral-200 dark:border-neutral-800 p-3 active:opacity-70"
                >
                  <View className="flex-row items-center gap-3">
                    <View
                      className="h-12 w-12 rounded-2xl items-center justify-center"
                      style={{
                        backgroundColor: piece.variant?.colorHex || '#f5f3ff',
                      }}
                    >
                      {!piece.variant?.colorHex && <Scissors size={20} color="#8b5cf6" />}
                    </View>
                    <View className="flex-1 min-w-0">
                      <View className="flex-row items-center gap-2">
                        <Text className="font-extrabold text-neutral-900 dark:text-white font-mono">
                          {piece.pieceCode}
                        </Text>
                        <View className="px-1.5 py-0.5 rounded bg-emerald-100">
                          <Text className="text-[9px] font-extrabold text-emerald-700">AVAILABLE</Text>
                        </View>
                      </View>
                      <Text className="text-xs text-neutral-500 mt-0.5" numberOfLines={1}>
                        {piece.product?.name}
                        {piece.variant?.name && ` • ${piece.variant.name}`}
                      </Text>
                      <Text className="text-[11px] font-bold text-neutral-700 mt-0.5">
                        {piece.widthFt}ft × {piece.lengthFt}ft = {piece.totalSqft.toFixed(2)} sqft
                      </Text>
                    </View>
                    <View className="items-end">
                      <Text className="font-extrabold text-emerald-700 text-base">
                        {formatPKRFull(piece.salePrice)}
                      </Text>
                      {piece.pricePerSqft && (
                        <Text className="text-[10px] text-neutral-500">
                          {formatPKRFull(piece.pricePerSqft)}/sqft
                        </Text>
                      )}
                    </View>
                  </View>
                </Pressable>
              ))}
            </View>
          )}
        </ScrollView>
      </SafeAreaView>
    </Modal>
  );
}
