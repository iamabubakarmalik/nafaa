import { useMemo, useState } from 'react';
import {
  View, Text, TextInput, Pressable, ScrollView, Modal, Switch,
} from 'react-native';
import * as Haptics from 'expo-haptics';
import {
  Plus, Trash2, Copy, AlertCircle, CheckCircle2, Package,
  X, ChevronDown, ChevronUp, Star, Eye, TrendingUp, Search,
  Sparkles,
} from 'lucide-react-native';
import { formatPKR, formatPKRFull } from '@/lib/format';

export interface ProductManualRow {
  id: string;
  name: string;
  description: string;
  categoryName: string;
  brandName: string;
  tagNames: string;
  sku: string;
  barcode: string;
  unit: string;
  price: string;
  costPrice: string;
  wholesalePrice: string;
  stock: string;
  lowStockAlert: string;
  variantNames: string;
  imageUrls: string;
  isActive: boolean;
  isFeatured: boolean;
}

interface RefData {
  categories: Array<{ id: string; name: string; color: string }>;
  brands: Array<{ id: string; name: string }>;
  tags: Array<{ id: string; name: string; color: string }>;
}

interface Props {
  rows: ProductManualRow[];
  onChange: (rows: ProductManualRow[]) => void;
  referenceData: RefData;
  defaultUnit?: string;
}

const UNIT_OPTIONS = ['pcs', 'kg', 'gram', 'liter', 'ml', 'meter', 'sqft', 'sqm', 'sqyd', 'box', 'packet', 'dozen'];

export function ProductManualEntryTable({ rows, onChange, referenceData, defaultUnit = 'pcs' }: Props) {
  const [expandedRow, setExpandedRow] = useState<string | null>(null);
  const [refPickerFor, setRefPickerFor] = useState<{ rowId: string; type: 'category' | 'brand' } | null>(null);
  const [refSearch, setRefSearch] = useState('');

  const newRow = (overrides?: Partial<ProductManualRow>): ProductManualRow => ({
    id: `row-${Date.now()}-${Math.random().toString(36).slice(2, 7)}`,
    name: '', description: '', categoryName: '', brandName: '', tagNames: '',
    sku: '', barcode: '', unit: defaultUnit, price: '', costPrice: '',
    wholesalePrice: '', stock: '', lowStockAlert: '', variantNames: '',
    imageUrls: '', isActive: true, isFeatured: false, ...overrides,
  });

  const addRow = () => {
    Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
    onChange([...rows, newRow()]);
  };

  const addEmptyRows = (count: number) => {
    Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
    const newRows: ProductManualRow[] = [];
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
    const { id: _, ...rest } = row;
    const dup = newRow(rest);
    const index = rows.findIndex((r) => r.id === id);
    const next = [...rows];
    next.splice(index + 1, 0, dup);
    onChange(next);
  };

  const updateRow = (id: string, patch: Partial<ProductManualRow>) => {
    onChange(rows.map((r) => (r.id === id ? { ...r, ...patch } : r)));
  };

  const filteredRefs = useMemo(() => {
    if (!refPickerFor) return { categories: [], brands: [] };
    const q = refSearch.toLowerCase().trim();
    if (refPickerFor.type === 'category') {
      return {
        categories: q
          ? referenceData.categories.filter((c) => c.name.toLowerCase().includes(q))
          : referenceData.categories,
        brands: [],
      };
    }
    return {
      categories: [],
      brands: q
        ? referenceData.brands.filter((b) => b.name.toLowerCase().includes(q))
        : referenceData.brands,
    };
  }, [refPickerFor, refSearch, referenceData]);

  const getRowStatus = (row: ProductManualRow) => {
    const errors: string[] = [];
    if (!row.name?.trim()) errors.push('Name');
    if (row.price === '' || Number(row.price) < 0) errors.push('Price');
    return {
      isValid: errors.length === 0,
      errors,
      isEmpty: !row.name && row.price === '' && !row.sku,
    };
  };

  const stats = useMemo(() => {
    let valid = 0, invalid = 0, totalValue = 0, totalVariants = 0;
    const newCats = new Set<string>();
    const newBrands = new Set<string>();

    const catNames = new Set(referenceData.categories.map((c) => c.name.toLowerCase()));
    const brandNames = new Set(referenceData.brands.map((b) => b.name.toLowerCase()));

    for (const row of rows) {
      const s = getRowStatus(row);
      if (s.isEmpty) continue;
      if (s.isValid) {
        valid++;
        totalValue += Number(row.stock || 0) * Number(row.price || 0);
        if (row.variantNames) {
          totalVariants += row.variantNames.split(',').filter((v) => v.trim()).length;
        }
        if (row.categoryName && !catNames.has(row.categoryName.toLowerCase().trim())) {
          newCats.add(row.categoryName.trim());
        }
        if (row.brandName && !brandNames.has(row.brandName.toLowerCase().trim())) {
          newBrands.add(row.brandName.trim());
        }
      } else invalid++;
    }
    return { valid, invalid, totalValue, totalVariants, newCats: newCats.size, newBrands: newBrands.size };
  }, [rows, referenceData]);

  return (
    <View className="gap-3">
      {/* Stats */}
      <View className="flex-row flex-wrap -mx-1">
        {[
          { label: 'Rows', value: rows.length, color: '#0f172a' },
          { label: 'Valid', value: stats.valid, color: '#16a34a' },
          { label: 'Invalid', value: stats.invalid, color: '#dc2626' },
          { label: 'Variants', value: stats.totalVariants, color: '#8b5cf6' },
        ].map((s) => (
          <View key={s.label} className="w-1/4 px-1 mb-2">
            <View className="rounded-xl border-2 border-slate-200 bg-white p-2.5">
              <Text className="text-[9px] uppercase font-extrabold text-slate-500">{s.label}</Text>
              <Text className="text-lg font-extrabold" style={{ color: s.color }}>{s.value}</Text>
            </View>
          </View>
        ))}
      </View>

      {stats.totalValue > 0 && (
        <View className="rounded-2xl bg-emerald-50 border-2 border-emerald-200 p-3 flex-row items-center gap-2">
          <TrendingUp size={16} color="#16a34a" />
          <View className="flex-1">
            <Text className="text-[10px] uppercase font-extrabold text-emerald-700">Total Stock Value</Text>
            <Text className="text-lg font-extrabold text-emerald-900">{formatPKR(stats.totalValue)}</Text>
          </View>
        </View>
      )}

      {(stats.newCats > 0 || stats.newBrands > 0) && (
        <View className="rounded-2xl bg-blue-50 border-2 border-blue-200 p-3 flex-row items-center gap-2">
          <Sparkles size={14} color="#2563eb" />
          <Text className="flex-1 text-xs text-blue-900 font-bold">
            Auto-create: {stats.newCats > 0 && `${stats.newCats} categories`}
            {stats.newCats > 0 && stats.newBrands > 0 && ', '}
            {stats.newBrands > 0 && `${stats.newBrands} brands`}
          </Text>
        </View>
      )}

      {/* Rows */}
      {rows.length === 0 ? (
        <View className="rounded-2xl border-2 border-dashed border-slate-300 bg-slate-50 p-8 items-center">
          <Package size={40} color="#94a3b8" />
          <Text className="mt-3 font-extrabold text-slate-700">No products yet</Text>
          <Text className="text-xs text-slate-500 mt-1">Tap "Add Row" below</Text>
        </View>
      ) : (
        <View className="gap-2">
          {rows.map((row, idx) => {
            const status = getRowStatus(row);
            const isExpanded = expandedRow === row.id;
            const profit = row.price !== '' && row.costPrice !== ''
              ? Number(row.price) - Number(row.costPrice) : 0;
            return (
              <View
                key={row.id}
                className="rounded-2xl border-2 p-3"
                style={{
                  backgroundColor: status.isEmpty ? '#ffffff' : status.isValid ? '#f0fdf4' : '#fef2f2',
                  borderColor: status.isEmpty ? '#e5e7eb' : status.isValid ? '#86efac' : '#fca5a5',
                }}
              >
                {/* Header */}
                <View className="flex-row items-center gap-2 mb-2">
                  <View
                    className="h-7 w-7 rounded-lg items-center justify-center"
                    style={{
                      backgroundColor: status.isValid ? '#16a34a' : status.isEmpty ? '#94a3b8' : '#dc2626',
                    }}
                  >
                    <Text className="text-white font-extrabold text-xs">#{idx + 1}</Text>
                  </View>
                  {!status.isEmpty && (status.isValid
                    ? <CheckCircle2 size={14} color="#16a34a" />
                    : <View className="flex-row items-center gap-1">
                        <AlertCircle size={14} color="#dc2626" />
                        <Text className="text-[10px] font-bold text-rose-700">
                          Missing: {status.errors.join(', ')}
                        </Text>
                      </View>)}
                  <View className="flex-1" />
                  <Pressable
                    onPress={() => setExpandedRow(isExpanded ? null : row.id)}
                    className="h-7 w-7 rounded-lg items-center justify-center"
                    style={{ backgroundColor: isExpanded ? '#16a34a' : '#f1f5f9' }}
                  >
                    {isExpanded ? <ChevronUp size={12} color="#ffffff" /> : <ChevronDown size={12} color="#475569" />}
                  </Pressable>
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

                {/* Name */}
                <View className="mb-2">
                  <Text className="text-[9px] uppercase font-extrabold text-slate-500 mb-1">Name *</Text>
                  <TextInput
                    value={row.name}
                    onChangeText={(t) => updateRow(row.id, { name: t })}
                    placeholder="Product name"
                    placeholderTextColor="#9ca3af"
                    className="h-11 rounded-lg border-2 bg-white px-3 text-sm font-bold text-slate-900"
                    style={{ borderColor: row.name ? '#86efac' : '#e5e7eb' }}
                  />
                </View>

                {/* Category + Brand */}
                <View className="flex-row gap-2 mb-2">
                  <View className="flex-1">
                    <Text className="text-[9px] uppercase font-extrabold text-slate-500 mb-1">Category</Text>
                    <Pressable
                      onPress={() => setRefPickerFor({ rowId: row.id, type: 'category' })}
                      className="h-10 rounded-lg border-2 border-slate-200 bg-white px-2 flex-row items-center gap-1"
                    >
                      <Text className="flex-1 text-xs font-bold" numberOfLines={1} style={{ color: row.categoryName ? '#0f172a' : '#9ca3af' }}>
                        {row.categoryName || 'Select or type'}
                      </Text>
                      <ChevronDown size={12} color="#94a3b8" />
                    </Pressable>
                    <TextInput
                      value={row.categoryName}
                      onChangeText={(t) => updateRow(row.id, { categoryName: t })}
                      placeholder="Or type here"
                      placeholderTextColor="#c4c4c4"
                      className="mt-1 h-8 rounded-md border border-slate-100 bg-slate-50 px-2 text-[10px] font-bold text-slate-700"
                    />
                  </View>
                  <View className="flex-1">
                    <Text className="text-[9px] uppercase font-extrabold text-slate-500 mb-1">Brand</Text>
                    <Pressable
                      onPress={() => setRefPickerFor({ rowId: row.id, type: 'brand' })}
                      className="h-10 rounded-lg border-2 border-slate-200 bg-white px-2 flex-row items-center gap-1"
                    >
                      <Text className="flex-1 text-xs font-bold" numberOfLines={1} style={{ color: row.brandName ? '#0f172a' : '#9ca3af' }}>
                        {row.brandName || 'Select or type'}
                      </Text>
                      <ChevronDown size={12} color="#94a3b8" />
                    </Pressable>
                    <TextInput
                      value={row.brandName}
                      onChangeText={(t) => updateRow(row.id, { brandName: t })}
                      placeholder="Or type here"
                      placeholderTextColor="#c4c4c4"
                      className="mt-1 h-8 rounded-md border border-slate-100 bg-slate-50 px-2 text-[10px] font-bold text-slate-700"
                    />
                  </View>
                </View>

                {/* Price + Stock */}
                <View className="flex-row gap-2 mb-2">
                  <View className="flex-1">
                    <Text className="text-[9px] uppercase font-extrabold text-slate-500 mb-1">Price *</Text>
                    <TextInput
                      value={row.price}
                      onChangeText={(t) => updateRow(row.id, { price: t })}
                      keyboardType="decimal-pad"
                      placeholder="0"
                      placeholderTextColor="#9ca3af"
                      className="h-10 rounded-lg border-2 bg-white px-2 text-sm font-bold text-right text-slate-900"
                      style={{ borderColor: row.price !== '' && Number(row.price) > 0 ? '#86efac' : '#e5e7eb' }}
                    />
                  </View>
                  <View className="flex-1">
                    <Text className="text-[9px] uppercase font-extrabold text-slate-500 mb-1">Cost</Text>
                    <TextInput
                      value={row.costPrice}
                      onChangeText={(t) => updateRow(row.id, { costPrice: t })}
                      keyboardType="decimal-pad"
                      placeholder="0"
                      placeholderTextColor="#9ca3af"
                      className="h-10 rounded-lg border-2 border-blue-200 bg-blue-50/40 px-2 text-sm font-bold text-right text-slate-900"
                    />
                  </View>
                  <View className="flex-1">
                    <Text className="text-[9px] uppercase font-extrabold text-slate-500 mb-1">Stock</Text>
                    <TextInput
                      value={row.stock}
                      onChangeText={(t) => updateRow(row.id, { stock: t })}
                      keyboardType="decimal-pad"
                      placeholder="0"
                      placeholderTextColor="#9ca3af"
                      className="h-10 rounded-lg border-2 border-slate-200 bg-white px-2 text-sm font-bold text-right text-slate-900"
                    />
                  </View>
                </View>

                {/* Unit picker */}
                <View className="mb-2">
                  <Text className="text-[9px] uppercase font-extrabold text-slate-500 mb-1">Unit</Text>
                  <ScrollView horizontal showsHorizontalScrollIndicator={false}>
                    <View className="flex-row gap-1">
                      {UNIT_OPTIONS.map((u) => (
                        <Pressable
                          key={u}
                          onPress={() => updateRow(row.id, { unit: u })}
                          className="h-8 px-3 rounded-lg items-center justify-center"
                          style={{ backgroundColor: row.unit === u ? '#16a34a' : '#f1f5f9' }}
                        >
                          <Text
                            className="text-[10px] font-extrabold"
                            style={{ color: row.unit === u ? '#ffffff' : '#475569' }}
                          >
                            {u}
                          </Text>
                        </Pressable>
                      ))}
                    </View>
                  </ScrollView>
                </View>

                {profit > 0 && (
                  <View className="rounded-lg bg-emerald-100 p-2 flex-row items-center gap-1">
                    <TrendingUp size={11} color="#15803d" />
                    <Text className="text-[10px] font-extrabold text-emerald-800">
                      Profit: {formatPKRFull(profit)} ({((profit / Number(row.price)) * 100).toFixed(1)}%)
                    </Text>
                  </View>
                )}

                {/* Expanded fields */}
                {isExpanded && (
                  <View className="mt-3 pt-3 border-t border-slate-200 gap-2">
                    <View className="flex-row gap-2">
                      <View className="flex-1">
                        <Text className="text-[9px] uppercase font-extrabold text-slate-500 mb-1">SKU</Text>
                        <TextInput
                          value={row.sku}
                          onChangeText={(t) => updateRow(row.id, { sku: t })}
                          placeholder="Optional"
                          placeholderTextColor="#9ca3af"
                          className="h-10 rounded-lg border-2 border-slate-200 bg-white px-2 text-xs font-bold font-mono text-slate-900"
                        />
                      </View>
                      <View className="flex-1">
                        <Text className="text-[9px] uppercase font-extrabold text-slate-500 mb-1">Barcode</Text>
                        <TextInput
                          value={row.barcode}
                          onChangeText={(t) => updateRow(row.id, { barcode: t })}
                          placeholder="Optional"
                          placeholderTextColor="#9ca3af"
                          className="h-10 rounded-lg border-2 border-slate-200 bg-white px-2 text-xs font-bold font-mono text-slate-900"
                        />
                      </View>
                    </View>
                    <View>
                      <Text className="text-[9px] uppercase font-extrabold text-slate-500 mb-1">Wholesale Price</Text>
                      <TextInput
                        value={row.wholesalePrice}
                        onChangeText={(t) => updateRow(row.id, { wholesalePrice: t })}
                        keyboardType="decimal-pad"
                        placeholder="0"
                        placeholderTextColor="#9ca3af"
                        className="h-10 rounded-lg border-2 border-amber-200 bg-amber-50/40 px-2 text-xs font-bold text-right text-slate-900"
                      />
                    </View>
                    <View>
                      <Text className="text-[9px] uppercase font-extrabold text-slate-500 mb-1">Variants (comma-separated)</Text>
                      <TextInput
                        value={row.variantNames}
                        onChangeText={(t) => updateRow(row.id, { variantNames: t })}
                        placeholder="Red, Blue, Green"
                        placeholderTextColor="#9ca3af"
                        className="h-10 rounded-lg border-2 border-violet-200 bg-violet-50/40 px-2 text-xs font-bold text-slate-900"
                      />
                    </View>
                    <View>
                      <Text className="text-[9px] uppercase font-extrabold text-slate-500 mb-1">Tags (comma-separated)</Text>
                      <TextInput
                        value={row.tagNames}
                        onChangeText={(t) => updateRow(row.id, { tagNames: t })}
                        placeholder="new, sale"
                        placeholderTextColor="#9ca3af"
                        className="h-10 rounded-lg border-2 border-amber-200 bg-amber-50/40 px-2 text-xs font-bold text-slate-900"
                      />
                    </View>
                    <View className="flex-row items-center gap-4">
                      <Pressable
                        onPress={() => updateRow(row.id, { isActive: !row.isActive })}
                        className="flex-row items-center gap-1"
                      >
                        <View
                          className="h-5 w-5 rounded-md items-center justify-center"
                          style={{ backgroundColor: row.isActive ? '#16a34a' : '#e5e7eb' }}
                        >
                          {row.isActive && <CheckCircle2 size={12} color="#ffffff" />}
                        </View>
                        <Eye size={12} color="#64748b" />
                        <Text className="text-[10px] font-bold text-slate-700">Active</Text>
                      </Pressable>
                      <Pressable
                        onPress={() => updateRow(row.id, { isFeatured: !row.isFeatured })}
                        className="flex-row items-center gap-1"
                      >
                        <View
                          className="h-5 w-5 rounded-md items-center justify-center"
                          style={{ backgroundColor: row.isFeatured ? '#f59e0b' : '#e5e7eb' }}
                        >
                          {row.isFeatured && <Star size={12} color="#ffffff" />}
                        </View>
                        <Text className="text-[10px] font-bold text-slate-700">Featured</Text>
                      </Pressable>
                    </View>
                  </View>
                )}
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

      {/* Reference picker */}
      <Modal
        visible={!!refPickerFor}
        animationType="slide"
        presentationStyle="pageSheet"
        onRequestClose={() => setRefPickerFor(null)}
      >
        <View className="flex-1 bg-neutral-50" style={{ paddingTop: 16 }}>
          <View className="px-5 py-4 border-b border-neutral-200 flex-row items-center gap-3">
            <Text className="flex-1 text-lg font-bold text-neutral-900">
              Select {refPickerFor?.type === 'category' ? 'Category' : 'Brand'}
            </Text>
            <Pressable
              onPress={() => { setRefPickerFor(null); setRefSearch(''); }}
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
                value={refSearch}
                onChangeText={setRefSearch}
                placeholder="Search..."
                placeholderTextColor="#9ca3af"
                autoFocus
                className="flex-1 text-base text-neutral-900"
              />
            </View>
          </View>
          <ScrollView contentContainerStyle={{ padding: 20, paddingTop: 0 }}>
            {refPickerFor?.type === 'category' && filteredRefs.categories.map((c) => (
              <Pressable
                key={c.id}
                onPress={() => {
                  updateRow(refPickerFor.rowId, { categoryName: c.name });
                  setRefPickerFor(null);
                  setRefSearch('');
                }}
                className="p-3 rounded-2xl bg-white border border-neutral-200 mb-2 flex-row items-center gap-3 active:opacity-70"
              >
                <View
                  className="h-4 w-4 rounded"
                  style={{ backgroundColor: c.color || '#9ca3af' }}
                />
                <Text className="flex-1 font-bold text-neutral-900">{c.name}</Text>
              </Pressable>
            ))}
            {refPickerFor?.type === 'brand' && filteredRefs.brands.map((b) => (
              <Pressable
                key={b.id}
                onPress={() => {
                  updateRow(refPickerFor.rowId, { brandName: b.name });
                  setRefPickerFor(null);
                  setRefSearch('');
                }}
                className="p-3 rounded-2xl bg-white border border-neutral-200 mb-2 active:opacity-70"
              >
                <Text className="font-bold text-neutral-900">{b.name}</Text>
              </Pressable>
            ))}
          </ScrollView>
        </View>
      </Modal>
    </View>
  );
}
