import { useMemo } from 'react';
import { View, Text, TextInput, Pressable, ScrollView } from 'react-native';
import * as Haptics from 'expo-haptics';
import {
  Layers, Plus, Trash2, Ruler, Package, Copy, AlertCircle,
} from 'lucide-react-native';
import type { PurchaseRollPayload } from '@/api/purchases.api';
import { formatPKRFull } from '@/lib/format';

export interface PurchaseRoll {
  id: string;
  rollNumber: string;
  designCode: string;
  widthFt: string;
  widthInch: string;
  lengthFt: string;
  costPerSqft: string;
  salePricePerSqft: string;
  rackNumber: string;
  notes: string;
}

interface Props {
  productId: string;
  productName: string;
  defaultCostPerSqft: number;
  rolls: PurchaseRoll[];
  onChange: (rolls: PurchaseRoll[]) => void;
}

const newRoll = (defaultCost: number): PurchaseRoll => ({
  id: `${Date.now()}-${Math.random().toString(36).slice(2, 8)}`,
  rollNumber: '',
  designCode: '',
  widthFt: '',
  widthInch: '0',
  lengthFt: '',
  costPerSqft: String(defaultCost || ''),
  salePricePerSqft: '',
  rackNumber: '',
  notes: '',
});

export function calculateRollsTotal(rolls: PurchaseRoll[]): number {
  return rolls.reduce((sum, r) => {
    const w = Number(r.widthFt) + Number(r.widthInch || 0) / 12;
    const l = Number(r.lengthFt) || 0;
    return sum + w * l;
  }, 0);
}

export function rollsToPayload(rolls: PurchaseRoll[]): PurchaseRollPayload[] {
  return rolls
    .filter((r) => Number(r.widthFt) > 0 && Number(r.lengthFt) > 0)
    .map((r) => ({
      rollNumber: r.rollNumber.trim() || undefined,
      designCode: r.designCode.trim() || undefined,
      widthFt: Number(r.widthFt),
      widthInch: Number(r.widthInch || 0),
      lengthFt: Number(r.lengthFt),
      costPerSqft: Number(r.costPerSqft) || undefined,
      salePricePerSqft: Number(r.salePricePerSqft) || undefined,
      rackNumber: r.rackNumber.trim() || undefined,
      notes: r.notes.trim() || undefined,
    }));
}

export function PurchaseRollsInput({
  productName, defaultCostPerSqft, rolls, onChange,
}: Props) {
  const totalSqft = useMemo(() => calculateRollsTotal(rolls), [rolls]);
  const totalCost = useMemo(
    () =>
      rolls.reduce((s, r) => {
        const w = Number(r.widthFt) + Number(r.widthInch || 0) / 12;
        const l = Number(r.lengthFt) || 0;
        const c = Number(r.costPerSqft) || defaultCostPerSqft;
        return s + w * l * c;
      }, 0),
    [rolls, defaultCostPerSqft],
  );

  const addRoll = () => {
    Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
    onChange([...rolls, newRoll(defaultCostPerSqft)]);
  };

  const duplicateRoll = (idx: number) => {
    Haptics.selectionAsync();
    const r = rolls[idx];
    onChange([
      ...rolls.slice(0, idx + 1),
      { ...r, id: `${Date.now()}-${Math.random().toString(36).slice(2, 8)}`, rollNumber: '' },
      ...rolls.slice(idx + 1),
    ]);
  };

  const removeRoll = (idx: number) => {
    Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Medium);
    onChange(rolls.filter((_, i) => i !== idx));
  };

  const updateRoll = (idx: number, patch: Partial<PurchaseRoll>) => {
    onChange(rolls.map((r, i) => (i === idx ? { ...r, ...patch } : r)));
  };

  return (
    <View className="gap-3">
      <View className="flex-row items-center justify-between">
        <View className="flex-row items-center gap-2">
          <Layers size={14} color="#16a34a" />
          <Text className="text-xs uppercase tracking-wider font-extrabold text-emerald-700">
            Carpet Rolls ({rolls.length})
          </Text>
        </View>
        <Pressable
          onPress={addRoll}
          className="h-8 px-3 rounded-lg flex-row items-center gap-1 active:opacity-80"
          style={{ backgroundColor: '#16a34a' }}
        >
          <Plus size={12} color="#ffffff" />
          <Text className="text-white font-extrabold text-xs">Add Roll</Text>
        </Pressable>
      </View>

      {rolls.length === 0 && (
        <View className="rounded-xl border-2 border-dashed border-emerald-300 bg-emerald-50/40 p-4 items-center">
          <AlertCircle size={20} color="#16a34a" />
          <Text className="mt-2 text-xs font-bold text-emerald-800 text-center">
            Kam se kam 1 roll add karein
          </Text>
          <Text className="text-[10px] text-emerald-700 mt-0.5 text-center">
            Har roll ke width, length aur cost enter karein
          </Text>
        </View>
      )}

      {rolls.map((roll, idx) => {
        const w = Number(roll.widthFt) + Number(roll.widthInch || 0) / 12;
        const l = Number(roll.lengthFt) || 0;
        const sqft = w * l;
        const cost = Number(roll.costPerSqft) || defaultCostPerSqft;
        const rollCost = sqft * cost;
        const isValid = sqft > 0;

        return (
          <View
            key={roll.id}
            className="rounded-2xl border-2 p-3"
            style={{
              borderColor: isValid ? '#86efac' : '#fca5a5',
              backgroundColor: isValid ? '#f0fdf4' : '#fef2f2',
            }}
          >
            {/* Header */}
            <View className="flex-row items-center justify-between mb-2">
              <View className="flex-row items-center gap-1.5">
                <View
                  className="h-6 w-6 rounded-md items-center justify-center"
                  style={{ backgroundColor: isValid ? '#16a34a' : '#dc2626' }}
                >
                  <Text className="text-white font-extrabold text-[10px]">#{idx + 1}</Text>
                </View>
                <Text className="text-xs font-extrabold text-slate-900">
                  Roll {idx + 1}
                </Text>
              </View>
              <View className="flex-row gap-1">
                <Pressable
                  onPress={() => duplicateRoll(idx)}
                  className="h-7 w-7 rounded-md bg-blue-100 items-center justify-center"
                >
                  <Copy size={11} color="#2563eb" />
                </Pressable>
                <Pressable
                  onPress={() => removeRoll(idx)}
                  className="h-7 w-7 rounded-md bg-rose-100 items-center justify-center"
                >
                  <Trash2 size={11} color="#dc2626" />
                </Pressable>
              </View>
            </View>

            {/* Row 1: Roll # + Design Code */}
            <View className="flex-row gap-2 mb-2">
              <View className="flex-1">
                <Text className="text-[9px] uppercase font-extrabold text-slate-600 mb-1">Roll #</Text>
                <TextInput
                  value={roll.rollNumber}
                  onChangeText={(t) => updateRoll(idx, { rollNumber: t })}
                  placeholder="Auto"
                  placeholderTextColor="#9ca3af"
                  className="h-9 rounded-lg border border-slate-200 bg-white px-2 text-xs font-bold text-slate-900"
                />
              </View>
              <View className="flex-1">
                <Text className="text-[9px] uppercase font-extrabold text-slate-600 mb-1">Design</Text>
                <TextInput
                  value={roll.designCode}
                  onChangeText={(t) => updateRoll(idx, { designCode: t })}
                  placeholder="D-01"
                  placeholderTextColor="#9ca3af"
                  className="h-9 rounded-lg border border-slate-200 bg-white px-2 text-xs font-bold text-slate-900"
                />
              </View>
            </View>

            {/* Row 2: Dimensions */}
            <View className="flex-row gap-2 mb-2">
              <View className="flex-1">
                <Text className="text-[9px] uppercase font-extrabold text-slate-600 mb-1">Width (ft) *</Text>
                <TextInput
                  value={roll.widthFt}
                  onChangeText={(t) => updateRoll(idx, { widthFt: t })}
                  keyboardType="decimal-pad"
                  placeholder="12"
                  placeholderTextColor="#9ca3af"
                  className="h-10 rounded-lg border-2 border-emerald-200 bg-white px-2 text-sm font-extrabold text-slate-900"
                />
              </View>
              <View style={{ width: 60 }}>
                <Text className="text-[9px] uppercase font-extrabold text-slate-600 mb-1">Inch</Text>
                <TextInput
                  value={roll.widthInch}
                  onChangeText={(t) => updateRoll(idx, { widthInch: t })}
                  keyboardType="decimal-pad"
                  placeholder="0"
                  placeholderTextColor="#9ca3af"
                  className="h-10 rounded-lg border border-slate-200 bg-white px-2 text-sm font-bold text-slate-900"
                />
              </View>
              <View className="flex-1">
                <Text className="text-[9px] uppercase font-extrabold text-slate-600 mb-1">Length (ft) *</Text>
                <TextInput
                  value={roll.lengthFt}
                  onChangeText={(t) => updateRoll(idx, { lengthFt: t })}
                  keyboardType="decimal-pad"
                  placeholder="100"
                  placeholderTextColor="#9ca3af"
                  className="h-10 rounded-lg border-2 border-emerald-200 bg-white px-2 text-sm font-extrabold text-slate-900"
                />
              </View>
            </View>

            {/* Row 3: Costs */}
            <View className="flex-row gap-2 mb-2">
              <View className="flex-1">
                <Text className="text-[9px] uppercase font-extrabold text-slate-600 mb-1">Cost/sqft</Text>
                <TextInput
                  value={roll.costPerSqft}
                  onChangeText={(t) => updateRoll(idx, { costPerSqft: t })}
                  keyboardType="decimal-pad"
                  placeholder={String(defaultCostPerSqft)}
                  placeholderTextColor="#9ca3af"
                  className="h-9 rounded-lg border border-slate-200 bg-white px-2 text-xs font-bold text-slate-900"
                />
              </View>
              <View className="flex-1">
                <Text className="text-[9px] uppercase font-extrabold text-slate-600 mb-1">Sale/sqft</Text>
                <TextInput
                  value={roll.salePricePerSqft}
                  onChangeText={(t) => updateRoll(idx, { salePricePerSqft: t })}
                  keyboardType="decimal-pad"
                  placeholder="Optional"
                  placeholderTextColor="#9ca3af"
                  className="h-9 rounded-lg border border-slate-200 bg-white px-2 text-xs font-bold text-slate-900"
                />
              </View>
              <View style={{ width: 90 }}>
                <Text className="text-[9px] uppercase font-extrabold text-slate-600 mb-1">Rack</Text>
                <TextInput
                  value={roll.rackNumber}
                  onChangeText={(t) => updateRoll(idx, { rackNumber: t })}
                  placeholder="A-1"
                  placeholderTextColor="#9ca3af"
                  className="h-9 rounded-lg border border-slate-200 bg-white px-2 text-xs font-bold text-slate-900"
                />
              </View>
            </View>

            {/* Summary badge */}
            {isValid && (
              <View
                className="rounded-lg p-2 flex-row items-center justify-between"
                style={{ backgroundColor: '#16a34a' }}
              >
                <View className="flex-row items-center gap-1">
                  <Ruler size={11} color="#ffffff" />
                  <Text className="text-white font-extrabold text-xs">
                    {w.toFixed(2)}ft × {l.toFixed(1)}ft
                  </Text>
                </View>
                <View className="flex-row items-center gap-2">
                  <Text className="text-white/90 text-xs font-bold">
                    {sqft.toFixed(2)} sqft
                  </Text>
                  <Text className="text-white font-extrabold text-xs">
                    {formatPKRFull(rollCost)}
                  </Text>
                </View>
              </View>
            )}
          </View>
        );
      })}

      {/* Grand total */}
      {rolls.length > 0 && (
        <View
          className="rounded-2xl p-3 flex-row items-center justify-between"
          style={{ backgroundColor: '#16a34a' }}
        >
          <View>
            <Text className="text-[10px] uppercase font-extrabold text-white/70">
              Total {rolls.length} Roll{rolls.length !== 1 ? 's' : ''}
            </Text>
            <Text className="text-white text-lg font-extrabold mt-0.5">
              {totalSqft.toFixed(2)} sqft
            </Text>
          </View>
          <View className="items-end">
            <Text className="text-[10px] uppercase font-extrabold text-white/70">Total Cost</Text>
            <Text className="text-white text-lg font-extrabold mt-0.5">
              {formatPKRFull(totalCost)}
            </Text>
          </View>
        </View>
      )}
    </View>
  );
}
