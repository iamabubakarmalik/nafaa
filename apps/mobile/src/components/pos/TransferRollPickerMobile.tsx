import { useState, useMemo } from 'react';
import {
  Modal, View, Text, TextInput, Pressable, ScrollView, ActivityIndicator,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { useQuery } from '@tanstack/react-query';
import * as Haptics from 'expo-haptics';
import {
  X, Search, Layers, CheckCircle2, AlertCircle, Ruler, Sparkles,
} from 'lucide-react-native';
import { carpetRollsApi, type CarpetRoll } from '@/api/carpet-rolls.api';
import { formatPKRFull } from '@/lib/format';

interface Props {
  visible: boolean;
  productId: string;
  productName: string;
  fromShopId: string;
  excludeRollIds: string[];
  onConfirm: (rolls: CarpetRoll[]) => void;
  onClose: () => void;
}

export function TransferRollPickerMobile({
  visible, productId, productName, fromShopId, excludeRollIds, onConfirm, onClose,
}: Props) {
  const [search, setSearch] = useState('');
  const [selectedIds, setSelectedIds] = useState<Set<string>>(new Set());

  const { data: rollsData, isLoading } = useQuery({
    queryKey: ['transfer-rolls', productId, fromShopId],
    queryFn: () =>
      carpetRollsApi.list({
        productId,
        shopId: fromShopId,
        status: 'ACTIVE',
        inStockOnly: true,
        limit: 200,
      }),
    enabled: visible && !!productId && !!fromShopId,
  });

  const rolls = (rollsData?.items ?? []).filter((r) => !excludeRollIds.includes(r.id));

  const filtered = useMemo(() => {
    const q = search.toLowerCase().trim();
    if (!q) return rolls;
    return rolls.filter(
      (r) =>
        r.rollNumber.toLowerCase().includes(q) ||
        r.designCode?.toLowerCase().includes(q) ||
        r.variant?.name?.toLowerCase().includes(q),
    );
  }, [rolls, search]);

  const toggleRoll = (id: string) => {
    Haptics.selectionAsync();
    setSelectedIds((prev) => {
      const next = new Set(prev);
      if (next.has(id)) next.delete(id);
      else next.add(id);
      return next;
    });
  };

  const selectAll = () => {
    Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
    setSelectedIds(new Set(filtered.map((r) => r.id)));
  };

  const deselectAll = () => {
    setSelectedIds(new Set());
  };

  const handleConfirm = () => {
    const selected = rolls.filter((r) => selectedIds.has(r.id));
    if (selected.length === 0) return;
    Haptics.notificationAsync(Haptics.NotificationFeedbackType.Success);
    onConfirm(selected);
    setSelectedIds(new Set());
    setSearch('');
  };

  const totalSqft = useMemo(
    () => rolls.filter((r) => selectedIds.has(r.id)).reduce((s, r) => s + Number(r.remainingSqft), 0),
    [rolls, selectedIds],
  );

  return (
    <Modal visible={visible} animationType="slide" presentationStyle="pageSheet" onRequestClose={onClose}>
      <SafeAreaView className="flex-1 bg-neutral-50 dark:bg-neutral-950">
        {/* Header */}
        <View className="px-5 py-4 border-b border-neutral-200 flex-row items-center gap-3">
          <View className="h-11 w-11 rounded-2xl items-center justify-center" style={{ backgroundColor: '#0891b2' }}>
            <Layers size={20} color="#ffffff" />
          </View>
          <View className="flex-1 min-w-0">
            <Text className="text-xs uppercase tracking-wider text-cyan-700 font-extrabold">
              Select Rolls to Transfer
            </Text>
            <Text className="text-base font-bold text-neutral-900 dark:text-white" numberOfLines={1}>
              {productName}
            </Text>
            <Text className="text-[11px] text-neutral-500">
              {selectedIds.size} selected • {totalSqft.toFixed(2)} sqft
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

        {/* Search + controls */}
        <View className="px-5 py-3 border-b border-neutral-200 gap-2">
          <View className="flex-row items-center gap-2 rounded-2xl border border-neutral-200 bg-white px-4 h-12">
            <Search size={18} color="#9ca3af" />
            <TextInput
              value={search}
              onChangeText={setSearch}
              placeholder="Search roll #, design code..."
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
          {filtered.length > 0 && (
            <View className="flex-row gap-2">
              <Pressable
                onPress={selectAll}
                className="flex-1 h-9 rounded-lg bg-cyan-100 items-center justify-center flex-row gap-1.5"
              >
                <CheckCircle2 size={13} color="#0891b2" />
                <Text className="text-cyan-700 font-extrabold text-xs">Select All ({filtered.length})</Text>
              </Pressable>
              {selectedIds.size > 0 && (
                <Pressable
                  onPress={deselectAll}
                  className="flex-1 h-9 rounded-lg bg-neutral-100 items-center justify-center"
                >
                  <Text className="text-neutral-700 font-extrabold text-xs">Deselect All</Text>
                </Pressable>
              )}
            </View>
          )}
        </View>

        {/* Rolls list */}
        <ScrollView contentContainerStyle={{ padding: 20 }} showsVerticalScrollIndicator={false}>
          {isLoading ? (
            <View className="py-8 items-center">
              <ActivityIndicator color="#0891b2" />
            </View>
          ) : filtered.length === 0 ? (
            <View className="items-center py-12">
              <AlertCircle size={40} color="#d1d5db" />
              <Text className="mt-3 text-base font-bold text-neutral-700">
                {search ? 'No rolls match' : 'No rolls in source shop'}
              </Text>
              <Text className="text-xs text-neutral-500 mt-1 text-center">
                {excludeRollIds.length > 0 && `${excludeRollIds.length} already selected`}
              </Text>
            </View>
          ) : (
            <View className="gap-2">
              {filtered.map((roll) => {
                const active = selectedIds.has(roll.id);
                return (
                  <Pressable
                    key={roll.id}
                    onPress={() => toggleRoll(roll.id)}
                    className="rounded-2xl border-2 p-3 active:opacity-80"
                    style={{
                      borderColor: active ? '#0891b2' : '#e5e7eb',
                      backgroundColor: active ? '#cffafe' : '#ffffff',
                    }}
                  >
                    <View className="flex-row items-center gap-3">
                      <View
                        style={{
                          height: 24,
                          width: 24,
                          borderRadius: 6,
                          borderWidth: 2,
                          borderColor: active ? '#0891b2' : '#cbd5e1',
                          backgroundColor: active ? '#0891b2' : '#ffffff',
                          alignItems: 'center',
                          justifyContent: 'center',
                        }}
                      >
                        {active && <CheckCircle2 size={16} color="#ffffff" />}
                      </View>
                      <View
                        className="h-11 w-11 rounded-2xl items-center justify-center"
                        style={{ backgroundColor: roll.variant?.colorHex || '#f0fdf4' }}
                      >
                        {!roll.variant?.colorHex && <Layers size={20} color="#16a34a" />}
                      </View>
                      <View className="flex-1 min-w-0">
                        <View className="flex-row items-center gap-1.5">
                          <Text className="font-extrabold text-sm text-neutral-900 font-mono">
                            {roll.rollNumber}
                          </Text>
                          {roll.designCode && (
                            <View className="px-1.5 py-0.5 rounded bg-slate-100">
                              <Text className="text-[9px] font-extrabold text-slate-700">
                                {roll.designCode}
                              </Text>
                            </View>
                          )}
                        </View>
                        {roll.variant?.name && (
                          <Text className="text-[10px] font-bold text-violet-700 mt-0.5">
                            {roll.variant.name}
                          </Text>
                        )}
                        <View className="flex-row items-center gap-2 mt-1">
                          <View className="flex-row items-center gap-1">
                            <Ruler size={9} color="#64748b" />
                            <Text className="text-[10px] text-neutral-500">
                              {roll.widthFt}ft × {roll.remainingLengthFt.toFixed(1)}ft
                            </Text>
                          </View>
                          <Text className="text-[10px] font-extrabold text-emerald-700">
                            {formatPKRFull(roll.salePricePerSqft)}/sqft
                          </Text>
                        </View>
                      </View>
                      <View className="items-end">
                        <Text className="text-lg font-extrabold text-emerald-700">
                          {roll.remainingSqft.toFixed(0)}
                        </Text>
                        <Text className="text-[9px] font-bold text-neutral-500 uppercase">sqft</Text>
                      </View>
                    </View>
                  </Pressable>
                );
              })}
            </View>
          )}
        </ScrollView>

        {/* Footer */}
        <View className="px-5 py-4 border-t border-neutral-200 bg-white">
          {selectedIds.size > 0 && (
            <View
              className="rounded-2xl p-3 mb-3"
              style={{ backgroundColor: '#0891b2' }}
            >
              <View className="flex-row items-center justify-between">
                <View className="flex-row items-center gap-2">
                  <Sparkles size={14} color="#ffffff" />
                  <Text className="text-white font-extrabold">
                    {selectedIds.size} roll{selectedIds.size !== 1 ? 's' : ''} selected
                  </Text>
                </View>
                <Text className="text-white text-lg font-extrabold">
                  {totalSqft.toFixed(2)} sqft
                </Text>
              </View>
            </View>
          )}
          <Pressable
            onPress={handleConfirm}
            disabled={selectedIds.size === 0}
            className="h-14 rounded-2xl items-center justify-center flex-row gap-2 active:opacity-80"
            style={{ backgroundColor: selectedIds.size > 0 ? '#0891b2' : '#9ca3af' }}
          >
            <CheckCircle2 size={20} color="#ffffff" />
            <Text className="text-white font-extrabold text-base">
              {selectedIds.size > 0 ? `Add ${selectedIds.size} Roll${selectedIds.size !== 1 ? 's' : ''}` : 'Select rolls to continue'}
            </Text>
          </Pressable>
        </View>
      </SafeAreaView>
    </Modal>
  );
}
