import { useState, useMemo, useEffect } from 'react';
import {
  Modal, View, Text, TextInput, Pressable, ScrollView,
  KeyboardAvoidingView, Platform,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import * as Haptics from 'expo-haptics';
import { X, Ruler, Plus, Trash2, Equal } from 'lucide-react-native';

interface Piece {
  length: string;
  width: string;
  quantity: string;
}

interface Props {
  visible: boolean;
  productName: string;
  unit: string;
  onApply: (quantity: number, note: string) => void;
  onClose: () => void;
}

const UNIT_FORMULAS: Record<
  string,
  { label: string; calc: (l: number, w: number) => number; pieceLabel: string; isArea: boolean }
> = {
  sqft: { label: 'Square Feet', calc: (l, w) => l * w, pieceLabel: 'ft', isArea: true },
  sqm: { label: 'Square Meter', calc: (l, w) => l * w, pieceLabel: 'm', isArea: true },
  meter: { label: 'Meter', calc: (l) => l, pieceLabel: 'm', isArea: false },
  ft: { label: 'Foot', calc: (l) => l, pieceLabel: 'ft', isArea: false },
  yard: { label: 'Yard', calc: (l) => l, pieceLabel: 'yard', isArea: false },
  gaj: { label: 'Gaj', calc: (l) => l, pieceLabel: 'gaj', isArea: false },
};

export function LengthWidthCalculator({
  visible, productName, unit, onApply, onClose,
}: Props) {
  const [pieces, setPieces] = useState<Piece[]>([
    { length: '', width: '', quantity: '1' },
  ]);

  const formula = UNIT_FORMULAS[unit] || UNIT_FORMULAS.sqft;
  const isAreaBased = formula.isArea;

  // Reset when modal opens
  useEffect(() => {
    if (visible) {
      setPieces([{ length: '', width: '', quantity: '1' }]);
    }
  }, [visible]);

  const addPiece = () => {
    Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
    setPieces((p) => [...p, { length: '', width: '', quantity: '1' }]);
  };

  const removePiece = (i: number) => {
    Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
    setPieces((p) => p.filter((_, idx) => idx !== i));
  };

  const updatePiece = (i: number, field: keyof Piece, value: string) => {
    setPieces((p) =>
      p.map((piece, idx) => (idx === i ? { ...piece, [field]: value } : piece)),
    );
  };

  const calculations = useMemo(() => {
    return pieces.map((piece) => {
      const l = parseFloat(piece.length) || 0;
      const w = parseFloat(piece.width) || 0;
      const q = parseFloat(piece.quantity) || 0;
      const perPiece = formula.calc(l, w);
      const total = perPiece * q;
      return { l, w, q, perPiece, total };
    });
  }, [pieces, formula]);

  const grandTotal = useMemo(
    () => calculations.reduce((sum, c) => sum + c.total, 0),
    [calculations],
  );

  const note = useMemo(() => {
    const parts = pieces
      .map((piece, i) => {
        const calc = calculations[i];
        if (calc.total === 0) return null;
        if (isAreaBased) {
          return `${calc.l}×${calc.w} ${formula.pieceLabel}${
            calc.q > 1 ? ` × ${calc.q}` : ''
          }`;
        }
        return `${calc.l} ${formula.pieceLabel}${calc.q > 1 ? ` × ${calc.q}` : ''}`;
      })
      .filter(Boolean);

    return parts.length > 0
      ? parts.join(' + ') + ` = ${grandTotal.toFixed(2)} ${unit}`
      : '';
  }, [pieces, calculations, isAreaBased, formula.pieceLabel, grandTotal, unit]);

  const handleApply = () => {
    if (grandTotal <= 0) return;
    Haptics.notificationAsync(Haptics.NotificationFeedbackType.Success);
    onApply(Number(grandTotal.toFixed(2)), note);
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
          <View className="px-5 py-4 border-b border-neutral-200 dark:border-neutral-800 flex-row items-center gap-3">
            <View
              className="h-11 w-11 rounded-2xl items-center justify-center"
              style={{ backgroundColor: '#16a34a' }}
            >
              <Ruler size={20} color="#ffffff" />
            </View>
            <View className="flex-1 min-w-0">
              <Text className="text-xs uppercase tracking-wider text-emerald-700 dark:text-emerald-400 font-extrabold">
                Size Calculator
              </Text>
              <Text className="text-base font-bold text-neutral-900 dark:text-white" numberOfLines={1}>
                {productName}
              </Text>
              <Text className="text-[11px] text-neutral-500">{formula.label}</Text>
            </View>
            <Pressable
              onPress={onClose}
              hitSlop={12}
              className="h-10 w-10 rounded-2xl bg-neutral-100 dark:bg-neutral-800 items-center justify-center"
            >
              <X size={20} color="#6b7280" />
            </Pressable>
          </View>

          <ScrollView
            contentContainerStyle={{ padding: 20, paddingBottom: 40 }}
            keyboardShouldPersistTaps="handled"
            showsVerticalScrollIndicator={false}
          >
            {/* Hint */}
            <View className="rounded-2xl bg-blue-50 dark:bg-blue-950/30 border border-blue-200 dark:border-blue-900/50 p-3 mb-4">
              <Text className="text-xs text-blue-900 dark:text-blue-200 leading-5">
                <Text className="font-bold">Tip: </Text>
                {isAreaBased
                  ? `Length × Width per piece dalein, phir pieces. e.g. 12 ft × 12 ft = 144 ${unit}`
                  : `Length per piece dalein. Pieces multiply ho jayenge.`}
              </Text>
            </View>

            {/* Pieces */}
            {pieces.map((piece, i) => {
              const calc = calculations[i];
              return (
                <View
                  key={i}
                  className="rounded-3xl bg-white dark:bg-neutral-900 border-2 border-neutral-200 dark:border-neutral-800 p-4 mb-3"
                >
                  <View className="flex-row items-center justify-between mb-3">
                    <View className="px-2.5 py-1 rounded-full bg-neutral-100 dark:bg-neutral-800">
                      <Text className="text-[10px] uppercase tracking-wider font-bold text-neutral-600 dark:text-neutral-400">
                        Piece {i + 1}
                      </Text>
                    </View>
                    {pieces.length > 1 && (
                      <Pressable
                        onPress={() => removePiece(i)}
                        className="h-8 w-8 rounded-lg bg-rose-50 dark:bg-rose-950/40 items-center justify-center"
                      >
                        <Trash2 size={14} color="#dc2626" />
                      </Pressable>
                    )}
                  </View>

                  <View className={`gap-3 ${isAreaBased ? '' : ''}`}>
                    {/* Length */}
                    <View>
                      <Text className="text-[10px] font-bold uppercase tracking-wider text-neutral-500 mb-1.5">
                        Length
                      </Text>
                      <View className="flex-row items-center rounded-2xl border-2 border-neutral-200 dark:border-neutral-800 bg-white dark:bg-neutral-900 px-4 h-14">
                        <TextInput
                          value={piece.length}
                          onChangeText={(t) => updatePiece(i, 'length', t)}
                          keyboardType="decimal-pad"
                          placeholder="0"
                          placeholderTextColor="#9ca3af"
                          autoFocus={i === 0}
                          className="flex-1 text-2xl font-extrabold text-neutral-900 dark:text-white"
                        />
                        <Text className="text-xs font-bold text-neutral-400">
                          {formula.pieceLabel}
                        </Text>
                      </View>
                    </View>

                    {/* Width — only for area */}
                    {isAreaBased && (
                      <View>
                        <Text className="text-[10px] font-bold uppercase tracking-wider text-neutral-500 mb-1.5">
                          Width
                        </Text>
                        <View className="flex-row items-center rounded-2xl border-2 border-neutral-200 dark:border-neutral-800 bg-white dark:bg-neutral-900 px-4 h-14">
                          <TextInput
                            value={piece.width}
                            onChangeText={(t) => updatePiece(i, 'width', t)}
                            keyboardType="decimal-pad"
                            placeholder="0"
                            placeholderTextColor="#9ca3af"
                            className="flex-1 text-2xl font-extrabold text-neutral-900 dark:text-white"
                          />
                          <Text className="text-xs font-bold text-neutral-400">
                            {formula.pieceLabel}
                          </Text>
                        </View>
                      </View>
                    )}

                    {/* Pieces + Sub Total row */}
                    <View className="flex-row gap-3">
                      <View className="flex-1">
                        <Text className="text-[10px] font-bold uppercase tracking-wider text-neutral-500 mb-1.5">
                          Pieces
                        </Text>
                        <View className="flex-row items-center rounded-2xl border-2 border-neutral-200 dark:border-neutral-800 bg-white dark:bg-neutral-900 px-4 h-14">
                          <TextInput
                            value={piece.quantity}
                            onChangeText={(t) => updatePiece(i, 'quantity', t)}
                            keyboardType="number-pad"
                            placeholder="1"
                            placeholderTextColor="#9ca3af"
                            className="flex-1 text-2xl font-extrabold text-neutral-900 dark:text-white"
                          />
                        </View>
                      </View>

                      <View className="flex-1">
                        <Text className="text-[10px] font-bold uppercase tracking-wider text-emerald-700 dark:text-emerald-400 mb-1.5">
                          Sub Total
                        </Text>
                        <View className="rounded-2xl bg-emerald-50 dark:bg-emerald-950/30 border-2 border-emerald-200 dark:border-emerald-900/50 px-4 h-14 justify-center">
                          <View className="flex-row items-baseline justify-end gap-1">
                            <Text className="text-2xl font-extrabold text-emerald-700 dark:text-emerald-400">
                              {calc.total.toFixed(2)}
                            </Text>
                            <Text className="text-[10px] font-bold text-emerald-600 dark:text-emerald-500">
                              {unit}
                            </Text>
                          </View>
                        </View>
                      </View>
                    </View>
                  </View>

                  {/* Formula display */}
                  {calc.total > 0 && (
                    <Text className="mt-3 text-[11px] text-neutral-500 font-mono">
                      {isAreaBased
                        ? `${calc.l} × ${calc.w} = ${calc.perPiece.toFixed(2)} ${unit}${
                            calc.q > 1
                              ? ` × ${calc.q} pcs = ${calc.total.toFixed(2)} ${unit}`
                              : ''
                          }`
                        : `${calc.l} ${formula.pieceLabel}${
                            calc.q > 1 ? ` × ${calc.q} = ${calc.total.toFixed(2)} ${unit}` : ''
                          }`}
                    </Text>
                  )}
                </View>
              );
            })}

            {/* Add piece */}
            <Pressable
              onPress={addPiece}
              className="h-14 rounded-2xl border-2 border-dashed border-neutral-300 dark:border-neutral-700 items-center justify-center flex-row gap-2 active:opacity-70"
            >
              <Plus size={18} color="#6b7280" />
              <Text className="font-bold text-neutral-700 dark:text-neutral-300 text-sm">
                Add Another Piece
              </Text>
            </Pressable>
          </ScrollView>

          {/* Footer with grand total + apply */}
          <View
            className="px-5 py-4 border-t border-neutral-200 dark:border-neutral-800 bg-white dark:bg-neutral-900"
            style={{
              shadowColor: '#000',
              shadowOpacity: 0.05,
              shadowRadius: 8,
              shadowOffset: { width: 0, height: -2 },
              elevation: 8,
            }}
          >
            <View className="flex-row items-center justify-between mb-3">
              <View className="flex-row items-center gap-2">
                <Equal size={18} color="#16a34a" />
                <Text className="text-sm font-bold text-neutral-700 dark:text-neutral-300">
                  Grand Total
                </Text>
              </View>
              <View className="flex-row items-baseline gap-1">
                <Text className="text-3xl font-extrabold text-emerald-700 dark:text-emerald-400">
                  {grandTotal.toFixed(2)}
                </Text>
                <Text className="text-xs font-bold text-emerald-600 dark:text-emerald-500">
                  {unit}
                </Text>
              </View>
            </View>

            <Pressable
              onPress={handleApply}
              disabled={grandTotal <= 0}
              className="h-14 rounded-2xl items-center justify-center flex-row gap-2 active:opacity-80"
              style={{
                backgroundColor: grandTotal > 0 ? '#16a34a' : '#9ca3af',
                shadowColor: '#16a34a',
                shadowOpacity: 0.4,
                shadowRadius: 12,
                elevation: 6,
              }}
            >
              <Text className="text-white font-extrabold text-base">
                {grandTotal > 0
                  ? `Apply ${grandTotal.toFixed(2)} ${unit}`
                  : 'Enter values to apply'}
              </Text>
            </Pressable>
          </View>
        </KeyboardAvoidingView>
      </SafeAreaView>
    </Modal>
  );
}
