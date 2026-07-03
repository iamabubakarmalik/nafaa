import { useState, useEffect } from 'react';
import {
  Modal, View, Text, TextInput, Pressable, ScrollView,
  KeyboardAvoidingView, Platform,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import * as Haptics from 'expo-haptics';
import {
  X, Layers, Scissors, AlertTriangle, CheckCircle2, Sparkles,
  Info, Ruler,
} from 'lucide-react-native';
import type { CarpetInfo } from '@/api/returns.api';
import { formatPKRFull } from '@/lib/format';

export interface CarpetReturnOptions {
  createCutPiece: boolean;
  cutPieceCondition: string;
  isDamaged: boolean;
  cutPieceWidthFt?: number;
  cutPieceLengthFt?: number;
  cutPieceNotes?: string;
}

const CONDITION_OPTIONS = [
  { key: 'EXCELLENT', label: 'Excellent', color: '#16a34a' },
  { key: 'GOOD', label: 'Good', color: '#0ea5e9' },
  { key: 'FAIR', label: 'Fair', color: '#f59e0b' },
  { key: 'POOR', label: 'Poor', color: '#dc2626' },
];

interface Props {
  visible: boolean;
  carpetInfo: CarpetInfo;
  productName: string;
  variantName?: string;
  returnedSqft: number;
  pricePerSqft: number;
  initialOptions?: CarpetReturnOptions;
  onConfirm: (options: CarpetReturnOptions) => void;
  onClose: () => void;
}

export function CarpetReturnOptionsModal({
  visible, carpetInfo, productName, variantName,
  returnedSqft, pricePerSqft, initialOptions,
  onConfirm, onClose,
}: Props) {
  const [createCutPiece, setCreateCutPiece] = useState(true);
  const [condition, setCondition] = useState('GOOD');
  const [isDamaged, setIsDamaged] = useState(false);
  const [widthFt, setWidthFt] = useState('');
  const [lengthFt, setLengthFt] = useState('');
  const [notes, setNotes] = useState('');

  // Initialize from props
  useEffect(() => {
    if (!visible) return;

    if (initialOptions) {
      setCreateCutPiece(initialOptions.createCutPiece);
      setCondition(initialOptions.cutPieceCondition);
      setIsDamaged(initialOptions.isDamaged);
      setWidthFt(initialOptions.cutPieceWidthFt ? String(initialOptions.cutPieceWidthFt) : '');
      setLengthFt(initialOptions.cutPieceLengthFt ? String(initialOptions.cutPieceLengthFt) : '');
      setNotes(initialOptions.cutPieceNotes || '');
    } else {
      // Prefill from carpet info
      setCreateCutPiece(true);
      setCondition('GOOD');
      setIsDamaged(false);
      setWidthFt(carpetInfo.widthFt ? String(carpetInfo.widthFt) : '');
      setLengthFt(carpetInfo.lengthFt ? String(carpetInfo.lengthFt) : '');
      setNotes('');
    }
  }, [visible, initialOptions, carpetInfo]);

  const computedSqft = (Number(widthFt) || 0) * (Number(lengthFt) || 0);
  const resalePrice = computedSqft * pricePerSqft * 0.8; // 80% of original

  const handleConfirm = () => {
    if (createCutPiece && (!widthFt || !lengthFt)) {
      return;
    }
    Haptics.notificationAsync(Haptics.NotificationFeedbackType.Success);
    onConfirm({
      createCutPiece,
      cutPieceCondition: isDamaged ? 'DAMAGED' : condition,
      isDamaged,
      cutPieceWidthFt: createCutPiece ? Number(widthFt) : undefined,
      cutPieceLengthFt: createCutPiece ? Number(lengthFt) : undefined,
      cutPieceNotes: notes.trim() || undefined,
    });
  };

  return (
    <Modal
      visible={visible}
      animationType="slide"
      presentationStyle="pageSheet"
      onRequestClose={onClose}
    >
      <SafeAreaView className="flex-1 bg-neutral-50 dark:bg-neutral-950">
        <KeyboardAvoidingView
          behavior={Platform.OS === 'ios' ? 'padding' : 'height'}
          className="flex-1"
        >
          {/* Header */}
          <View className="px-5 py-4 border-b border-neutral-200 flex-row items-center gap-3">
            <View
              className="h-11 w-11 rounded-2xl items-center justify-center"
              style={{ backgroundColor: '#16a34a' }}
            >
              <Layers size={20} color="#ffffff" />
            </View>
            <View className="flex-1 min-w-0">
              <Text className="text-xs uppercase tracking-wider text-emerald-700 font-extrabold">
                Carpet Return
              </Text>
              <Text className="text-base font-bold text-neutral-900" numberOfLines={1}>
                {productName}
              </Text>
              {variantName && (
                <Text className="text-[11px] font-bold text-violet-700" numberOfLines={1}>
                  {variantName}
                </Text>
              )}
            </View>
            <Pressable
              onPress={onClose}
              hitSlop={12}
              className="h-10 w-10 rounded-2xl bg-neutral-100 items-center justify-center"
            >
              <X size={20} color="#6b7280" />
            </Pressable>
          </View>

          <ScrollView
            contentContainerStyle={{ padding: 20, paddingBottom: 40 }}
            keyboardShouldPersistTaps="handled"
          >
            {/* Info banner */}
            <View className="rounded-2xl bg-blue-50 border border-blue-200 p-3 mb-4 flex-row items-start gap-2">
              <Info size={14} color="#2563eb" />
              <View className="flex-1">
                <Text className="text-xs font-extrabold text-blue-900">
                  Return: {returnedSqft.toFixed(2)} sqft
                </Text>
                <Text className="text-[11px] text-blue-800 mt-0.5 leading-relaxed">
                  {carpetInfo.isRollCut &&
                    `Original: cut from roll ${carpetInfo.rollNumber} (${carpetInfo.widthFt}ft × ${carpetInfo.lengthFt}ft)`}
                  {carpetInfo.isCutPiece &&
                    `Original: cut piece ${carpetInfo.pieceCode}`}
                  {!carpetInfo.isRollCut && !carpetInfo.isCutPiece &&
                    'No carpet cut info in sale record'}
                </Text>
              </View>
            </View>

            {/* Toggle: Create cut piece */}
            <Pressable
              onPress={() => {
                Haptics.selectionAsync();
                setCreateCutPiece((v) => !v);
              }}
              className="rounded-2xl border-2 p-4 mb-3 flex-row items-center gap-3"
              style={{
                borderColor: createCutPiece ? '#16a34a' : '#e5e7eb',
                backgroundColor: createCutPiece ? '#dcfce7' : '#ffffff',
              }}
            >
              <View
                className="h-12 w-12 rounded-2xl items-center justify-center"
                style={{ backgroundColor: createCutPiece ? '#16a34a' : '#f3f4f6' }}
              >
                <Scissors size={22} color={createCutPiece ? '#ffffff' : '#6b7280'} />
              </View>
              <View className="flex-1">
                <Text className="font-extrabold text-neutral-900">
                  Create Cut Piece
                </Text>
                <Text className="text-[11px] text-neutral-600 mt-0.5">
                  Returned carpet ko resell inventory mein add karein
                </Text>
              </View>
              <View
                style={{
                  height: 28, width: 48, borderRadius: 14, padding: 2, justifyContent: 'center',
                  backgroundColor: createCutPiece ? '#16a34a' : '#d1d5db',
                }}
              >
                <View
                  style={{
                    height: 24, width: 24, borderRadius: 12, backgroundColor: '#ffffff',
                    transform: [{ translateX: createCutPiece ? 20 : 0 }],
                  }}
                />
              </View>
            </Pressable>

            {createCutPiece && (
              <>
                {/* Damaged toggle */}
                <Pressable
                  onPress={() => {
                    Haptics.selectionAsync();
                    setIsDamaged((v) => !v);
                  }}
                  className="rounded-2xl border-2 p-4 mb-3 flex-row items-center gap-3"
                  style={{
                    borderColor: isDamaged ? '#dc2626' : '#e5e7eb',
                    backgroundColor: isDamaged ? '#fee2e2' : '#ffffff',
                  }}
                >
                  <View
                    className="h-12 w-12 rounded-2xl items-center justify-center"
                    style={{ backgroundColor: isDamaged ? '#dc2626' : '#f3f4f6' }}
                  >
                    <AlertTriangle size={22} color={isDamaged ? '#ffffff' : '#6b7280'} />
                  </View>
                  <View className="flex-1">
                    <Text className="font-extrabold text-neutral-900">
                      Mark as Damaged
                    </Text>
                    <Text className="text-[11px] text-neutral-600 mt-0.5">
                      Kharaab hai, sale nahi ho sakta
                    </Text>
                  </View>
                  <View
                    style={{
                      height: 28, width: 48, borderRadius: 14, padding: 2, justifyContent: 'center',
                      backgroundColor: isDamaged ? '#dc2626' : '#d1d5db',
                    }}
                  >
                    <View
                      style={{
                        height: 24, width: 24, borderRadius: 12, backgroundColor: '#ffffff',
                        transform: [{ translateX: isDamaged ? 20 : 0 }],
                      }}
                    />
                  </View>
                </Pressable>

                {/* Condition picker */}
                {!isDamaged && (
                  <View className="mb-3">
                    <Text className="text-xs uppercase font-extrabold text-neutral-500 mb-2 tracking-wider">
                      Condition
                    </Text>
                    <View className="flex-row flex-wrap -m-1">
                      {CONDITION_OPTIONS.map((c) => {
                        const active = condition === c.key;
                        return (
                          <View key={c.key} className="w-1/2 p-1">
                            <Pressable
                              onPress={() => {
                                Haptics.selectionAsync();
                                setCondition(c.key);
                              }}
                              className="h-12 rounded-xl items-center justify-center border-2"
                              style={{
                                backgroundColor: active ? c.color : '#ffffff',
                                borderColor: active ? c.color : '#e5e7eb',
                              }}
                            >
                              <Text
                                className="text-sm font-extrabold"
                                style={{ color: active ? '#ffffff' : '#374151' }}
                              >
                                {c.label}
                              </Text>
                            </Pressable>
                          </View>
                        );
                      })}
                    </View>
                  </View>
                )}

                {/* Dimensions */}
                <View className="rounded-2xl bg-white border-2 border-emerald-200 p-4 mb-3 gap-3">
                  <View className="flex-row items-center gap-2">
                    <Ruler size={14} color="#16a34a" />
                    <Text className="text-xs uppercase font-extrabold text-emerald-700 tracking-wider">
                      Cut Piece Dimensions
                    </Text>
                  </View>

                  <View className="flex-row gap-3">
                    <View className="flex-1">
                      <Text className="text-[10px] uppercase font-extrabold text-slate-500 mb-1.5">
                        Width (ft)
                      </Text>
                      <TextInput
                        value={widthFt}
                        onChangeText={setWidthFt}
                        keyboardType="decimal-pad"
                        placeholder="0"
                        placeholderTextColor="#9ca3af"
                        className="h-12 rounded-xl border-2 border-slate-200 bg-white px-3 text-lg font-bold text-neutral-900"
                      />
                    </View>
                    <View className="flex-1">
                      <Text className="text-[10px] uppercase font-extrabold text-slate-500 mb-1.5">
                        Length (ft)
                      </Text>
                      <TextInput
                        value={lengthFt}
                        onChangeText={setLengthFt}
                        keyboardType="decimal-pad"
                        placeholder="0"
                        placeholderTextColor="#9ca3af"
                        className="h-12 rounded-xl border-2 border-slate-200 bg-white px-3 text-lg font-bold text-neutral-900"
                      />
                    </View>
                  </View>

                  {computedSqft > 0 && (
                    <View
                      className="rounded-xl p-3 flex-row items-center justify-between"
                      style={{
                        backgroundColor: isDamaged ? '#dc2626' : '#16a34a',
                      }}
                    >
                      <View className="flex-1">
                        <Text className="text-white/80 text-[10px] font-extrabold uppercase">
                          Cut Piece Size
                        </Text>
                        <Text className="text-white text-xl font-extrabold mt-0.5">
                          {computedSqft.toFixed(2)} sqft
                        </Text>
                      </View>
                      {!isDamaged && (
                        <View className="items-end">
                          <Text className="text-white/80 text-[10px] font-extrabold uppercase">
                            Resale @ 80%
                          </Text>
                          <Text className="text-white text-lg font-extrabold mt-0.5">
                            {formatPKRFull(resalePrice)}
                          </Text>
                        </View>
                      )}
                    </View>
                  )}
                </View>

                {/* Notes */}
                <View className="mb-3">
                  <Text className="text-xs uppercase font-extrabold text-neutral-500 mb-2 tracking-wider">
                    Notes (optional)
                  </Text>
                  <TextInput
                    value={notes}
                    onChangeText={setNotes}
                    multiline
                    numberOfLines={2}
                    placeholder='"Slight color fade on edge"'
                    placeholderTextColor="#9ca3af"
                    className="min-h-[60px] rounded-xl border-2 border-neutral-200 bg-white p-3 text-sm font-bold text-neutral-900"
                    textAlignVertical="top"
                  />
                </View>
              </>
            )}

            {!createCutPiece && (
              <View className="rounded-2xl bg-amber-50 border-2 border-amber-300 p-4 flex-row items-start gap-2">
                <AlertTriangle size={16} color="#b45309" />
                <View className="flex-1">
                  <Text className="text-sm font-extrabold text-amber-900">
                    No cut piece will be created
                  </Text>
                  <Text className="text-[11px] text-amber-800 mt-1 leading-relaxed">
                    Sirf refund process ho ga. Manual inventory adjustment karni ho gi agar chahiye.
                  </Text>
                </View>
              </View>
            )}
          </ScrollView>

          {/* Footer */}
          <View className="px-5 py-4 border-t border-neutral-200 bg-white">
            <Pressable
              onPress={handleConfirm}
              disabled={createCutPiece && (!widthFt || !lengthFt)}
              className="h-14 rounded-2xl items-center justify-center flex-row gap-2 active:opacity-80"
              style={{
                backgroundColor:
                  createCutPiece && (!widthFt || !lengthFt)
                    ? '#9ca3af'
                    : isDamaged
                    ? '#dc2626'
                    : '#16a34a',
              }}
            >
              <CheckCircle2 size={20} color="#ffffff" />
              <Text className="text-white font-extrabold text-base">
                {isDamaged
                  ? 'Confirm Damaged Return'
                  : createCutPiece
                  ? 'Confirm — Create Cut Piece'
                  : 'Confirm — No Piece'}
              </Text>
            </Pressable>
          </View>
        </KeyboardAvoidingView>
      </SafeAreaView>
    </Modal>
  );
}
