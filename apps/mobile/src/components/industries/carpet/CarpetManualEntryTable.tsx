import { useMemo, useState } from 'react';
import {
  View, Text, TextInput, Pressable, ScrollView, Modal,
} from 'react-native';
import * as Haptics from 'expo-haptics';
import {
  Plus, Trash2, Copy, AlertCircle, CheckCircle2, Package,
  Ruler, X, ChevronDown, Search,
} from 'lucide-react-native';
import { formatPKR } from '@/lib/format';

export interface CarpetManualRow {
  id: string;
  productName: string;
  variantName: string;
  rollNumber: string;
  designCode: string;
  widthFt: string;
  widthInch: string;
  lengthFt: string;
  lengthInch: string;
  costPerSqft: string;
  salePricePerSqft: string;
  rackNumber: string;
  quality: string;
  pile: string;
  notes: string;
}

interface ProductOption {
  productName: string;
  variantName: string;
  productSku?: string;
  variantSku?: string;
  defaultCost?: number;
  defaultPrice?: number;
}

interface Props {
  rows: CarpetManualRow[];
  onChange: (rows: CarpetManualRow[]) => void;
  productOptions: ProductOption[];
}

const QUALITY_OPTIONS = ['', 'Premium', 'Standard', 'Economy'];
const PILE_OPTIONS = ['', 'Wool', 'Synthetic', 'Mixed', 'Cotton', 'Jute'];

export function CarpetManualEntryTable({ rows, onChange, productOptions }: Props) {
  const [pickerForId, setPickerForId] = useState<string | null>(null);
  const [pickerSearch, setPickerSearch] = useState('');

  const productGroups = useMemo(() => {
    const map = new Map<string, ProductOption[]>();
    for (const opt of productOptions) {
      const existing = map.get(opt.productName) ?? [];
      existing.push(opt);
      map.set(opt.productName, existing);
    }
    return map;
  }, [productOptions]);

  const productNames = useMemo(
    () => Array.from(productGroups.keys()).sort(),
    [productGroups],
  );

  const filteredOptions = useMemo(() => {
    const q = pickerSearch.toLowerCase().trim();
    if (!q) return productOptions;
    return productOptions.filter(
      (o) =>
        o.productName.toLowerCase().includes(q) ||
        o.variantName.toLowerCase().includes(q),
    );
  }, [productOptions, pickerSearch]);

  const newRow = (overrides?: Partial<CarpetManualRow>): CarpetManualRow => ({
    id: `row-${Date.now()}-${Math.random().toString(36).slice(2, 7)}`,
    productName: '', variantName: '', rollNumber: '', designCode: '',
    widthFt: '', widthInch: '', lengthFt: '', lengthInch: '',
    costPerSqft: '', salePricePerSqft: '', rackNumber: '',
    quality: '', pile: '', notes: '',
    ...overrides,
  });

  const addRow = () => {
    Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
    onChange([...rows, newRow()]);
  };

  const addEmptyRows = (count: number) => {
    Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
    const newRows: CarpetManualRow[] = [];
    for (let i = 0; i < count; i++) newRows.push(newRow());
    onChange([...rows, ...newRows]);
  };

  const removeRow = (id: string) => {
    Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
    onChange(rows.filter((r) => r.id !== id));
  };

  const duplicateRow = (id: string) => {
    const row = rows.find((r) => r.id === id);
    if (!row) return;
    const { id: _, rollNumber, ...rest } = row;
    const dup = newRow({ ...rest });
    const index = rows.findIndex((r) => r.id === id);
    const next = [...rows];
    next.splice(index + 1, 0, dup);
    onChange(next);
  };

  const updateRow = (id: string, patch: Partial<CarpetManualRow>) => {
    onChange(rows.map((r) => (r.id === id ? { ...r, ...patch } : r)));
  };

  const handleSelectProduct = (opt: ProductOption) => {
    if (!pickerForId) return;
    updateRow(pickerForId, {
      productName: opt.productName,
      variantName: opt.variantName || '',
      costPerSqft: opt.defaultCost && opt.defaultCost > 0 ? String(opt.defaultCost) : '',
      salePricePerSqft: opt.defaultPrice && opt.defaultPrice > 0 ? String(opt.defaultPrice) : '',
    });
    setPickerForId(null);
    setPickerSearch('');
  };

  const getRowStatus = (row: CarpetManualRow) => {
    const errors: string[] = [];
    if (!row.productName) errors.push('Product');
    if (!row.widthFt || Number(row.widthFt) <= 0) errors.push('Width');
    if (!row.lengthFt || Number(row.lengthFt) <= 0) errors.push('Length');
    return {
      isValid: errors.length === 0,
      errors,
      isEmpty: !row.productName && !row.widthFt && !row.lengthFt,
    };
  };

  const stats = useMemo(() => {
    let valid = 0, invalid = 0, totalSqft = 0, totalValue = 0;
    for (const row of rows) {
      const s = getRowStatus(row);
      if (s.isEmpty) continue;
      if (s.isValid) {
        valid++;
        const sqft =
          (Number(row.widthFt) + Number(row.widthInch || 0) / 12) *
          (Number(row.lengthFt) + Number(row.lengthInch || 0) / 12);
        totalSqft += sqft;
        totalValue += sqft * Number(row.salePricePerSqft || 0);
      } else invalid++;
    }
    return { valid, invalid, totalSqft, totalValue };
  }, [rows]);

  return (
    <View className="gap-3">
      {/* Stats banner */}
      <View className="flex-row flex-wrap -mx-1">
        <View className="w-1/2 px-1 mb-2">
          <View className="rounded-xl border-2 border-slate-200 bg-slate-50 p-2.5">
            <Text className="text-[9px] uppercase font-extrabold text-slate-500">Rows</Text>
            <Text className="text-lg font-extrabold text-slate-900">{rows.length}</Text>
          </View>
        </View>
        <View className="w-1/2 px-1 mb-2">
          <View className="rounded-xl border-2 border-emerald-200 bg-emerald-50 p-2.5">
            <Text className="text-[9px] uppercase font-extrabold text-emerald-700">Valid</Text>
            <Text className="text-lg font-extrabold text-emerald-900">{stats.valid}</Text>
          </View>
        </View>
        <View className="w-1/2 px-1 mb-2">
          <View className="rounded-xl border-2 border-violet-200 bg-violet-50 p-2.5">
            <Text className="text-[9px] uppercase font-extrabold text-violet-700">Sqft</Text>
            <Text className="text-sm font-extrabold text-violet-900" numberOfLines={1}>
              {stats.totalSqft.toFixed(0)}
            </Text>
          </View>
        </View>
        <View className="w-1/2 px-1 mb-2">
          <View className="rounded-xl border-2 border-amber-200 bg-amber-50 p-2.5">
            <Text className="text-[9px] uppercase font-extrabold text-amber-700">Value</Text>
            <Text className="text-sm font-extrabold text-amber-900" numberOfLines={1}>
              {formatPKR(stats.totalValue)}
            </Text>
          </View>
        </View>
      </View>

      {/* Rows */}
      {rows.length === 0 ? (
        <View className="rounded-2xl border-2 border-dashed border-slate-300 bg-slate-50 p-8 items-center">
          <Package size={40} color="#94a3b8" />
          <Text className="mt-3 font-extrabold text-slate-700">No rows yet</Text>
          <Text className="text-xs text-slate-500 mt-1">Tap "Add Row" below</Text>
        </View>
      ) : (
        <View className="gap-2">
          {rows.map((row, idx) => {
            const status = getRowStatus(row);
            const sqft =
              Number(row.widthFt || 0) > 0 && Number(row.lengthFt || 0) > 0
                ? (Number(row.widthFt) + Number(row.widthInch || 0) / 12) *
                  (Number(row.lengthFt) + Number(row.lengthInch || 0) / 12)
                : 0;

            return (
              <View
                key={row.id}
                className="rounded-2xl border-2 p-3"
                style={{
                  backgroundColor: status.isEmpty ? '#ffffff' : status.isValid ? '#f0fdf4' : '#fef2f2',
                  borderColor: status.isEmpty ? '#e5e7eb' : status.isValid ? '#86efac' : '#fca5a5',
                }}
              >
                {/* Row header */}
                <View className="flex-row items-center gap-2 mb-2">
                  <View
                    className="h-7 w-7 rounded-lg items-center justify-center"
                    style={{
                      backgroundColor: status.isValid ? '#16a34a' : status.isEmpty ? '#94a3b8' : '#dc2626',
                    }}
                  >
                    <Text className="text-white font-extrabold text-xs">#{idx + 1}</Text>
                  </View>
                  {!status.isEmpty && (
                    status.isValid ? (
                      <CheckCircle2 size={14} color="#16a34a" />
                    ) : (
                      <View className="flex-row items-center gap-1">
                        <AlertCircle size={14} color="#dc2626" />
                        <Text className="text-[10px] font-bold text-rose-700">
                          Missing: {status.errors.join(', ')}
                        </Text>
                      </View>
                    )
                  )}
                  <View className="flex-1" />
                  <Pressable
                    onPress={() => duplicateRow(row.id)}
                    className="h-7 w-7 rounded-lg bg-blue-100 items-center justify-center"
                  >
                    <Copy size={12} color="#2563eb" />
                  </Pressable>
                  <Pressable
                    onPress={() => removeRow(row.id)}
                    className="h-7 w-7 rounded-lg bg-rose-100 items-center justify-center"
                  >
                    <Trash2 size={12} color="#dc2626" />
                  </Pressable>
                </View>

                {/* Product picker */}
                <Pressable
                  onPress={() => setPickerForId(row.id)}
                  className="rounded-xl border-2 border-slate-200 bg-white px-3 h-11 flex-row items-center gap-2 mb-2"
                >
                  <Package size={14} color="#64748b" />
                  <View className="flex-1">
                    {row.productName ? (
                      <>
                        <Text className="text-xs font-extrabold text-slate-900" numberOfLines={1}>
                          {row.productName}
                        </Text>
                        {row.variantName && (
                          <Text className="text-[10px] font-bold text-violet-700" numberOfLines={1}>
                            {row.variantName}
                          </Text>
                        )}
                      </>
                    ) : (
                      <Text className="text-xs font-bold text-slate-400">Tap to select product</Text>
                    )}
                  </View>
                  <ChevronDown size={14} color="#94a3b8" />
                </Pressable>

                {/* Roll # + Design */}
                <View className="flex-row gap-2 mb-2">
                  <View className="flex-1">
                    <Text className="text-[9px] uppercase font-extrabold text-slate-500 mb-1">Roll #</Text>
                    <TextInput
                      value={row.rollNumber}
                      onChangeText={(t) => updateRow(row.id, { rollNumber: t })}
                      placeholder="Auto"
                      placeholderTextColor="#9ca3af"
                      className="h-10 rounded-lg border-2 border-slate-200 bg-white px-2 text-xs font-bold font-mono text-slate-900"
                    />
                  </View>
                  <View className="flex-1">
                    <Text className="text-[9px] uppercase font-extrabold text-slate-500 mb-1">Design</Text>
                    <TextInput
                      value={row.designCode}
                      onChangeText={(t) => updateRow(row.id, { designCode: t })}
                      placeholder="Optional"
                      placeholderTextColor="#9ca3af"
                      className="h-10 rounded-lg border-2 border-slate-200 bg-white px-2 text-xs font-bold text-slate-900"
                    />
                  </View>
                </View>

                {/* Width */}
                <View className="flex-row gap-2 mb-2">
                  <View className="flex-1">
                    <Text className="text-[9px] uppercase font-extrabold text-slate-500 mb-1">Width Ft *</Text>
                    <TextInput
                      value={row.widthFt}
                      onChangeText={(t) => updateRow(row.id, { widthFt: t })}
                      keyboardType="decimal-pad"
                      placeholder="12"
                      placeholderTextColor="#9ca3af"
                      className="h-10 rounded-lg border-2 bg-white px-2 text-xs font-bold text-center text-slate-900"
                      style={{ borderColor: row.widthFt && Number(row.widthFt) > 0 ? '#86efac' : '#e5e7eb' }}
                    />
                  </View>
                  <View className="flex-1">
                    <Text className="text-[9px] uppercase font-extrabold text-slate-500 mb-1">Width In</Text>
                    <TextInput
                      value={row.widthInch}
                      onChangeText={(t) => updateRow(row.id, { widthInch: t })}
                      keyboardType="decimal-pad"
                      placeholder="0"
                      placeholderTextColor="#9ca3af"
                      className="h-10 rounded-lg border-2 border-slate-200 bg-white px-2 text-xs font-bold text-center text-slate-900"
                    />
                  </View>
                  <View className="flex-1">
                    <Text className="text-[9px] uppercase font-extrabold text-slate-500 mb-1">Len Ft *</Text>
                    <TextInput
                      value={row.lengthFt}
                      onChangeText={(t) => updateRow(row.id, { lengthFt: t })}
                      keyboardType="decimal-pad"
                      placeholder="29"
                      placeholderTextColor="#9ca3af"
                      className="h-10 rounded-lg border-2 bg-white px-2 text-xs font-bold text-center text-slate-900"
                      style={{ borderColor: row.lengthFt && Number(row.lengthFt) > 0 ? '#86efac' : '#e5e7eb' }}
                    />
                  </View>
                  <View className="flex-1">
                    <Text className="text-[9px] uppercase font-extrabold text-slate-500 mb-1">Len In</Text>
                    <TextInput
                      value={row.lengthInch}
                      onChangeText={(t) => updateRow(row.id, { lengthInch: t })}
                      keyboardType="decimal-pad"
                      placeholder="0"
                      placeholderTextColor="#9ca3af"
                      className="h-10 rounded-lg border-2 border-slate-200 bg-white px-2 text-xs font-bold text-center text-slate-900"
                    />
                  </View>
                </View>

                {/* Sqft display */}
                {sqft > 0 && (
                  <View className="rounded-lg bg-emerald-100 p-2 mb-2 flex-row items-center justify-between">
                    <View className="flex-row items-center gap-1">
                      <Ruler size={11} color="#15803d" />
                      <Text className="text-[10px] font-extrabold uppercase text-emerald-700">Total sqft</Text>
                    </View>
                    <Text className="text-sm font-extrabold text-emerald-900">
                      {sqft.toFixed(2)}
                    </Text>
                  </View>
                )}

                {/* Prices */}
                <View className="flex-row gap-2 mb-2">
                  <View className="flex-1">
                    <Text className="text-[9px] uppercase font-extrabold text-slate-500 mb-1">Cost/sqft</Text>
                    <TextInput
                      value={row.costPerSqft}
                      onChangeText={(t) => updateRow(row.id, { costPerSqft: t })}
                      keyboardType="decimal-pad"
                      placeholder="0"
                      placeholderTextColor="#9ca3af"
                      className="h-10 rounded-lg border-2 border-blue-200 bg-blue-50/40 px-2 text-xs font-bold text-right text-slate-900"
                    />
                  </View>
                  <View className="flex-1">
                    <Text className="text-[9px] uppercase font-extrabold text-slate-500 mb-1">Sale/sqft</Text>
                    <TextInput
                      value={row.salePricePerSqft}
                      onChangeText={(t) => updateRow(row.id, { salePricePerSqft: t })}
                      keyboardType="decimal-pad"
                      placeholder="0"
                      placeholderTextColor="#9ca3af"
                      className="h-10 rounded-lg border-2 border-emerald-200 bg-emerald-50/40 px-2 text-xs font-bold text-right text-slate-900"
                    />
                  </View>
                </View>

                {/* Optional fields row */}
                <View className="flex-row gap-2">
                  <View className="flex-1">
                    <Text className="text-[9px] uppercase font-extrabold text-slate-500 mb-1">Rack</Text>
                    <TextInput
                      value={row.rackNumber}
                      onChangeText={(t) => updateRow(row.id, { rackNumber: t })}
                      placeholder="Wall-1"
                      placeholderTextColor="#9ca3af"
                      className="h-10 rounded-lg border-2 border-slate-200 bg-white px-2 text-xs font-bold text-slate-900"
                    />
                  </View>
                  <View className="flex-1">
                    <Text className="text-[9px] uppercase font-extrabold text-slate-500 mb-1">Quality</Text>
                    <View className="rounded-lg border-2 border-slate-200 bg-white h-10 justify-center px-2">
                      <ScrollView horizontal showsHorizontalScrollIndicator={false}>
                        <View className="flex-row gap-1">
                          {QUALITY_OPTIONS.slice(1).map((q) => (
                            <Pressable
                              key={q}
                              onPress={() => updateRow(row.id, { quality: row.quality === q ? '' : q })}
                              className="px-2 h-6 rounded items-center justify-center"
                              style={{
                                backgroundColor: row.quality === q ? '#16a34a' : '#f1f5f9',
                              }}
                            >
                              <Text
                                className="text-[10px] font-extrabold"
                                style={{ color: row.quality === q ? '#ffffff' : '#475569' }}
                              >
                                {q}
                              </Text>
                            </Pressable>
                          ))}
                        </View>
                      </ScrollView>
                    </View>
                  </View>
                </View>
              </View>
            );
          })}
        </View>
      )}

      {/* Add buttons */}
      <View className="flex-row gap-2">
        <Pressable
          onPress={addRow}
          className="flex-1 h-12 rounded-xl bg-emerald-600 items-center justify-center flex-row gap-1.5 active:opacity-80"
          style={{ shadowColor: '#16a34a', shadowOpacity: 0.3, shadowRadius: 8, elevation: 4 }}
        >
          <Plus size={16} color="#ffffff" />
          <Text className="text-white font-extrabold text-sm">Add Row</Text>
        </Pressable>
        <Pressable
          onPress={() => addEmptyRows(5)}
          className="h-12 px-4 rounded-xl bg-slate-200 items-center justify-center"
        >
          <Text className="text-slate-700 font-extrabold text-xs">+5</Text>
        </Pressable>
        <Pressable
          onPress={() => addEmptyRows(10)}
          className="h-12 px-4 rounded-xl bg-slate-200 items-center justify-center"
        >
          <Text className="text-slate-700 font-extrabold text-xs">+10</Text>
        </Pressable>
      </View>

      {/* Product picker modal */}
      <Modal
        visible={!!pickerForId}
        animationType="slide"
        presentationStyle="pageSheet"
        onRequestClose={() => setPickerForId(null)}
      >
        <View className="flex-1 bg-neutral-50" style={{ paddingTop: 16 }}>
          <View className="px-5 py-4 border-b border-neutral-200 flex-row items-center gap-3">
            <View className="h-11 w-11 rounded-2xl bg-emerald-600 items-center justify-center">
              <Package size={20} color="#ffffff" />
            </View>
            <View className="flex-1">
              <Text className="text-lg font-bold text-neutral-900">Select Product</Text>
              <Text className="text-xs text-neutral-500">{productOptions.length} options</Text>
            </View>
            <Pressable
              onPress={() => setPickerForId(null)}
              hitSlop={12}
              className="h-10 w-10 rounded-2xl bg-neutral-100 items-center justify-center"
            >
              <X size={20} color="#6b7280" />
            </Pressable>
          </View>
          <View className="px-5 py-3">
            <View className="flex-row items-center gap-2 rounded-2xl border border-neutral-200 bg-white px-4 h-12">
              <Search size={18} color="#9ca3af" />
              <TextInput
                value={pickerSearch}
                onChangeText={setPickerSearch}
                placeholder="Search product or variant..."
                placeholderTextColor="#9ca3af"
                autoFocus
                className="flex-1 text-base text-neutral-900"
              />
            </View>
          </View>
          <ScrollView contentContainerStyle={{ padding: 20, paddingTop: 0 }}>
            {filteredOptions.length === 0 ? (
              <View className="items-center py-12">
                <Package size={36} color="#d1d5db" />
                <Text className="mt-3 font-bold text-neutral-500">No matches</Text>
              </View>
            ) : (
              filteredOptions.map((opt, idx) => (
                <Pressable
                  key={`${opt.productName}-${opt.variantName}-${idx}`}
                  onPress={() => handleSelectProduct(opt)}
                  className="p-3 rounded-2xl bg-white border border-neutral-200 mb-2 flex-row items-center gap-3 active:opacity-70"
                >
                  <View className="h-10 w-10 rounded-xl bg-emerald-100 items-center justify-center">
                    <Package size={18} color="#16a34a" />
                  </View>
                  <View className="flex-1">
                    <Text className="text-sm font-extrabold text-neutral-900" numberOfLines={1}>
                      {opt.productName}
                    </Text>
                    {opt.variantName && (
                      <Text className="text-[11px] font-bold text-violet-700">{opt.variantName}</Text>
                    )}
                    {(opt.defaultCost || opt.defaultPrice) && (
                      <Text className="text-[10px] text-neutral-500 mt-0.5">
                        {opt.defaultCost ? `Cost: ${formatPKR(opt.defaultCost)}` : ''}
                        {opt.defaultCost && opt.defaultPrice ? ' • ' : ''}
                        {opt.defaultPrice ? `Sale: ${formatPKR(opt.defaultPrice)}` : ''}
                      </Text>
                    )}
                  </View>
                </Pressable>
              ))
            )}
          </ScrollView>
        </View>
      </Modal>
    </View>
  );
}
