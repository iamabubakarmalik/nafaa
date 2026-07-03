import { useState, useMemo, useEffect } from 'react';
import {
  View, Text, TextInput, Pressable, Modal, ScrollView,
  KeyboardAvoidingView, Platform,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import * as Haptics from 'expo-haptics';
import AsyncStorage from '@react-native-async-storage/async-storage';
import {
  Check, ChevronDown, Plus, Search, X, Star, Clock, Sparkles, Edit2, Trash2,
} from 'lucide-react-native';
import Toast from 'react-native-toast-message';

const UNIT_CATEGORIES = [
  {
    label: 'Pieces & Quantity', icon: '📦',
    units: [
      { value: 'pcs', label: 'Piece', desc: 'Single item' },
      { value: 'dozen', label: 'Dozen', desc: '12 pieces' },
      { value: 'pair', label: 'Pair', desc: '2 pieces' },
      { value: 'set', label: 'Set', desc: 'Multiple items' },
      { value: 'pack', label: 'Pack', desc: 'Packed bundle' },
      { value: 'box', label: 'Box', desc: 'Boxed package' },
      { value: 'carton', label: 'Carton', desc: 'Large box' },
    ],
  },
  {
    label: 'Length & Area', icon: '📏', desc: 'Carpets, Cloth, Hardware',
    units: [
      { value: 'sqft', label: 'Square Feet', desc: 'Area — carpets, tiles' },
      { value: 'sqm', label: 'Square Meter', desc: 'Area — metric' },
      { value: 'ft', label: 'Foot', desc: 'Length' },
      { value: 'meter', label: 'Meter', desc: 'Length metric' },
      { value: 'yard', label: 'Yard', desc: 'Length — fabric' },
      { value: 'gaj', label: 'Gaj', desc: 'Pakistani fabric' },
      { value: 'inch', label: 'Inch', desc: 'Small length' },
      { value: 'cm', label: 'Centimeter', desc: 'Small metric' },
      { value: 'roll', label: 'Roll', desc: 'Rolled material' },
      { value: 'thaan', label: 'Thaan', desc: 'Full fabric roll' },
    ],
  },
  {
    label: 'Weight', icon: '⚖️', desc: 'Grocery, Bakery, Meat',
    units: [
      { value: 'kg', label: 'Kilogram', desc: 'Standard weight' },
      { value: 'gram', label: 'Gram', desc: 'Small weight' },
      { value: 'mg', label: 'Milligram', desc: 'Medicine' },
      { value: 'ton', label: 'Ton', desc: 'Heavy bulk' },
      { value: 'pao', label: 'Pao', desc: '250g Pakistani' },
      { value: 'seer', label: 'Seer', desc: 'Traditional' },
      { value: 'maund', label: 'Maund', desc: '~40kg' },
      { value: 'lb', label: 'Pound', desc: 'Imperial' },
      { value: 'oz', label: 'Ounce', desc: 'Small imperial' },
    ],
  },
  {
    label: 'Volume', icon: '💧', desc: 'Drinks, Oil, Liquid',
    units: [
      { value: 'liter', label: 'Liter', desc: 'Standard liquid' },
      { value: 'ml', label: 'Milliliter', desc: 'Small liquid' },
      { value: 'gallon', label: 'Gallon', desc: 'Large liquid' },
      { value: 'bottle', label: 'Bottle', desc: 'Packaged' },
      { value: 'can', label: 'Can', desc: 'Canned drink' },
    ],
  },
  {
    label: 'Pharmacy', icon: '💊', desc: 'Medicine',
    units: [
      { value: 'tablet', label: 'Tablet', desc: 'Single tablet' },
      { value: 'capsule', label: 'Capsule', desc: 'Single capsule' },
      { value: 'strip', label: 'Strip', desc: 'Tablet strip' },
      { value: 'sachet', label: 'Sachet', desc: 'Powder packet' },
      { value: 'vial', label: 'Vial', desc: 'Injection' },
      { value: 'syrup', label: 'Syrup', desc: 'Liquid medicine' },
    ],
  },
  {
    label: 'Food & Restaurant', icon: '🍽️',
    units: [
      { value: 'plate', label: 'Plate', desc: 'Served plate' },
      { value: 'cup', label: 'Cup', desc: 'Tea/coffee' },
      { value: 'glass', label: 'Glass', desc: 'Drink glass' },
      { value: 'slice', label: 'Slice', desc: 'Cake/bread' },
      { value: 'loaf', label: 'Loaf', desc: 'Bread loaf' },
    ],
  },
];

const POPULAR = ['pcs', 'sqft', 'kg', 'meter', 'liter', 'dozen', 'pack', 'box'];
const RECENT_KEY = 'nafaa.mobile.unit.recent';
const CUSTOM_KEY = 'nafaa.mobile.unit.custom';

interface CustomUnit { value: string; label: string; desc: string; createdAt: number; }

function findUnit(value: string, customs: CustomUnit[] = []) {
  for (const cat of UNIT_CATEGORIES) {
    const found = cat.units.find((u) => u.value === value);
    if (found) return { ...found, category: cat.label, isCustom: false };
  }
  const c = customs.find((u) => u.value === value);
  if (c) return { value: c.value, label: c.label, desc: c.desc, category: 'Custom', isCustom: true };
  return null;
}

interface Props {
  value: string;
  onChange: (value: string) => void;
  label?: string;
  hint?: string;
}

export function UnitSelect({ value, onChange, label = 'Unit', hint }: Props) {
  const [open, setOpen] = useState(false);
  const [search, setSearch] = useState('');
  const [showCustom, setShowCustom] = useState(false);
  const [customValue, setCustomValue] = useState('');
  const [customDesc, setCustomDesc] = useState('');
  const [editingValue, setEditingValue] = useState<string | null>(null);
  const [recent, setRecent] = useState<string[]>([]);
  const [customs, setCustoms] = useState<CustomUnit[]>([]);

  useEffect(() => {
    if (open) {
      AsyncStorage.getItem(RECENT_KEY).then((r) => { try { r && setRecent(JSON.parse(r)); } catch {} });
      AsyncStorage.getItem(CUSTOM_KEY).then((r) => { try { r && setCustoms(JSON.parse(r)); } catch {} });
    }
  }, [open]);

  const selected = useMemo(() => {
    const f = findUnit(value, customs);
    if (f) return f;
    return value ? { value, label: value, desc: 'Custom', category: 'Custom', isCustom: true } : null;
  }, [value, customs]);

  const filteredCategories = useMemo(() => {
    if (!search.trim()) return UNIT_CATEGORIES;
    const q = search.toLowerCase();
    return UNIT_CATEGORIES.map((cat) => ({
      ...cat,
      units: cat.units.filter((u) =>
        u.value.toLowerCase().includes(q) ||
        u.label.toLowerCase().includes(q) ||
        u.desc.toLowerCase().includes(q),
      ),
    })).filter((cat) => cat.units.length > 0);
  }, [search]);

  const filteredCustom = useMemo(() => {
    if (!search.trim()) return customs;
    const q = search.toLowerCase();
    return customs.filter((u) =>
      u.value.toLowerCase().includes(q) ||
      u.label.toLowerCase().includes(q) ||
      u.desc.toLowerCase().includes(q),
    );
  }, [search, customs]);

  const quickAccess = useMemo(() => {
    const combined = [...recent, ...POPULAR];
    const seen = new Set<string>();
    const out: Array<{ value: string; label: string; isRecent: boolean }> = [];
    for (const v of combined) {
      if (seen.has(v)) continue;
      seen.add(v);
      const found = findUnit(v, customs);
      out.push({ value: v, label: found?.label || v, isRecent: recent.includes(v) });
      if (out.length >= 8) break;
    }
    return out;
  }, [recent, customs]);

  const handleSelect = async (unitValue: string) => {
    Haptics.selectionAsync();
    onChange(unitValue);
    setOpen(false);
    setSearch('');
    setShowCustom(false);
    setEditingValue(null);
    try {
      const next = [unitValue, ...recent.filter((v) => v !== unitValue)].slice(0, 5);
      await AsyncStorage.setItem(RECENT_KEY, JSON.stringify(next));
    } catch {}
  };

  const handleCustomSave = async () => {
    const trimmed = customValue.trim().toLowerCase();
    if (!trimmed) return;
    Haptics.notificationAsync(Haptics.NotificationFeedbackType.Success);

    if (editingValue) {
      const next = customs.map((u) =>
        u.value === editingValue
          ? { ...u, value: trimmed, label: customValue.trim(), desc: customDesc.trim() || 'Custom unit' }
          : u,
      );
      setCustoms(next);
      await AsyncStorage.setItem(CUSTOM_KEY, JSON.stringify(next));
      if (value === editingValue) onChange(trimmed);
      Toast.show({ type: 'success', text1: 'Custom unit updated' });
    } else {
      const exists = customs.some((u) => u.value === trimmed);
      if (!exists) {
        const next = [
          { value: trimmed, label: customValue.trim(), desc: customDesc.trim() || 'Custom unit', createdAt: Date.now() },
          ...customs,
        ];
        setCustoms(next);
        await AsyncStorage.setItem(CUSTOM_KEY, JSON.stringify(next));
      }
      handleSelect(trimmed);
      return;
    }
    setCustomValue('');
    setCustomDesc('');
    setEditingValue(null);
    setShowCustom(false);
  };

  const handleCustomEdit = (u: CustomUnit) => {
    setCustomValue(u.label);
    setCustomDesc(u.desc);
    setEditingValue(u.value);
    setShowCustom(true);
  };

  const handleCustomDelete = async (v: string) => {
    const next = customs.filter((u) => u.value !== v);
    setCustoms(next);
    await AsyncStorage.setItem(CUSTOM_KEY, JSON.stringify(next));
    if (value === v) onChange('pcs');
  };

  return (
    <View>
      {label && <Text className="text-sm font-bold text-slate-700 mb-1.5">{label}</Text>}

      <Pressable
        onPress={() => setOpen(true)}
        className="h-12 rounded-xl bg-white px-3 flex-row items-center justify-between"
        style={{ borderWidth: 2, borderColor: '#e2e8f0' }}
      >
        {selected ? (
          <View className="flex-1 min-w-0">
            <View className="flex-row items-center gap-1.5 flex-wrap">
              <Text className="font-extrabold text-slate-900" numberOfLines={1}>
                {selected.label}
              </Text>
              <Text className="text-xs text-slate-500 font-mono">({selected.value})</Text>
              {selected.isCustom && (
                <View className="px-1.5 py-0.5 rounded-full bg-violet-100">
                  <Text className="text-[9px] font-extrabold text-violet-700">CUSTOM</Text>
                </View>
              )}
            </View>
            <Text className="text-[10px] text-slate-500 font-semibold mt-0.5" numberOfLines={1}>
              {selected.desc}
            </Text>
          </View>
        ) : (
          <Text className="text-slate-400 font-semibold">Select unit...</Text>
        )}
        <ChevronDown size={16} color="#94a3b8" />
      </Pressable>

      {hint && !open && <Text className="text-xs text-slate-500 font-semibold mt-1">{hint}</Text>}

      <Modal visible={open} animationType="slide" presentationStyle="pageSheet" onRequestClose={() => setOpen(false)}>
        <SafeAreaView className="flex-1 bg-neutral-50">
          <KeyboardAvoidingView behavior={Platform.OS === 'ios' ? 'padding' : 'height'} className="flex-1">
            <View className="px-5 py-4 border-b border-slate-200 bg-white">
              <View className="flex-row items-center gap-3 mb-3">
                <View className="h-11 w-11 rounded-2xl bg-emerald-600 items-center justify-center">
                  <Sparkles size={20} color="#ffffff" />
                </View>
                <View className="flex-1">
                  <Text className="text-lg font-extrabold text-slate-900">Select Unit</Text>
                  <Text className="text-xs text-slate-500">Choose or create custom</Text>
                </View>
                <Pressable onPress={() => setOpen(false)} hitSlop={12} className="h-10 w-10 rounded-2xl bg-slate-100 items-center justify-center">
                  <X size={20} color="#64748b" />
                </Pressable>
              </View>

              <View className="flex-row items-center gap-2 rounded-xl bg-slate-50 px-3 h-11" style={{ borderWidth: 1, borderColor: '#e2e8f0' }}>
                <Search size={16} color="#94a3b8" />
                <TextInput
                  value={search}
                  onChangeText={setSearch}
                  placeholder="Search kg, sqft, dozen..."
                  placeholderTextColor="#94a3b8"
                  className="flex-1 text-sm font-semibold text-slate-900"
                />
                {search.length > 0 && (
                  <Pressable onPress={() => setSearch('')} hitSlop={8}>
                    <X size={14} color="#94a3b8" />
                  </Pressable>
                )}
              </View>
            </View>

            <ScrollView contentContainerStyle={{ paddingBottom: 24 }}>
              {!search && quickAccess.length > 0 && (
                <View className="px-5 py-3">
                  <View className="flex-row items-center gap-1 mb-2">
                    <Star size={11} color="#f59e0b" fill="#f59e0b" />
                    <Text className="text-[10px] uppercase tracking-wider font-extrabold text-slate-500">Quick Access</Text>
                  </View>
                  <View className="flex-row flex-wrap gap-1.5">
                    {quickAccess.map((u) => {
                      const active = value === u.value;
                      return (
                        <Pressable
                          key={u.value}
                          onPress={() => handleSelect(u.value)}
                          className="flex-row items-center gap-1 h-9 px-3 rounded-xl"
                          style={{
                            backgroundColor: active ? '#16a34a' : '#ffffff',
                            borderWidth: 2,
                            borderColor: active ? '#16a34a' : '#e2e8f0',
                          }}
                        >
                          {u.isRecent && !active && <Clock size={10} color="#64748b" />}
                          <Text
                            className="text-xs font-extrabold"
                            style={{ color: active ? '#ffffff' : '#334155' }}
                          >
                            {u.value}
                          </Text>
                        </Pressable>
                      );
                    })}
                  </View>
                </View>
              )}

              {filteredCustom.length > 0 && (
                <View>
                  <View className="px-5 py-2 bg-violet-50 flex-row items-center gap-1.5 border-b border-slate-100">
                    <Sparkles size={11} color="#7c3aed" />
                    <Text className="text-[10px] uppercase tracking-wider font-extrabold text-violet-700">Custom Units</Text>
                  </View>
                  {filteredCustom.map((u) => {
                    const active = value === u.value;
                    return (
                      <View key={u.value} className={`px-5 py-3 flex-row items-center gap-3 border-b border-slate-100 ${active ? 'bg-violet-50' : 'bg-white'}`}>
                        <Pressable onPress={() => handleSelect(u.value)} className="flex-1 flex-row items-center gap-3">
                          <View
                            className="h-10 w-14 rounded-lg items-center justify-center"
                            style={{ backgroundColor: active ? '#7c3aed' : '#ede9fe' }}
                          >
                            <Text
                              className="text-xs font-extrabold"
                              style={{ color: active ? '#ffffff' : '#7c3aed' }}
                            >
                              {u.value}
                            </Text>
                          </View>
                          <View className="flex-1">
                            <Text
                              className="text-sm font-extrabold"
                              style={{ color: active ? '#7c3aed' : '#0f172a' }}
                            >
                              {u.label}
                            </Text>
                            <Text className="text-[10px] text-slate-500 font-semibold" numberOfLines={1}>
                              {u.desc}
                            </Text>
                          </View>
                          {active && <Check size={16} color="#7c3aed" />}
                        </Pressable>
                        <Pressable
                          onPress={() => handleCustomEdit(u)}
                          className="h-8 w-8 rounded-lg items-center justify-center"
                          style={{ backgroundColor: '#ede9fe' }}
                        >
                          <Edit2 size={12} color="#7c3aed" />
                        </Pressable>
                        <Pressable
                          onPress={() => handleCustomDelete(u.value)}
                          className="h-8 w-8 rounded-lg items-center justify-center"
                          style={{ backgroundColor: '#fef2f2' }}
                        >
                          <Trash2 size={12} color="#dc2626" />
                        </Pressable>
                      </View>
                    );
                  })}
                </View>
              )}

              {filteredCategories.length === 0 && filteredCustom.length === 0 ? (
                <View className="items-center py-12">
                  <Search size={36} color="#cbd5e1" />
                  <Text className="mt-3 text-sm font-bold text-slate-700">No units match "{search}"</Text>
                  <Text className="text-xs text-slate-500 mt-1">Try custom unit ↓</Text>
                </View>
              ) : (
                filteredCategories.map((cat) => (
                  <View key={cat.label}>
                    <View className="px-5 py-2 bg-slate-50 flex-row items-center gap-2 border-b border-slate-100">
                      <Text>{cat.icon}</Text>
                      <View className="flex-1">
                        <Text className="text-[10px] uppercase tracking-wider font-extrabold text-slate-700">
                          {cat.label}
                        </Text>
                        {cat.desc && (
                          <Text className="text-[9px] text-slate-500 font-semibold">{cat.desc}</Text>
                        )}
                      </View>
                    </View>
                    {cat.units.map((u) => {
                      const active = value === u.value;
                      return (
                        <Pressable
                          key={u.value}
                          onPress={() => handleSelect(u.value)}
                          className={`px-5 py-3 flex-row items-center gap-3 border-b border-slate-100 ${active ? 'bg-emerald-50' : 'bg-white'}`}
                        >
                          <View
                            className="h-10 w-14 rounded-lg items-center justify-center"
                            style={{ backgroundColor: active ? '#16a34a' : '#f1f5f9' }}
                          >
                            <Text
                              className="text-xs font-extrabold"
                              style={{ color: active ? '#ffffff' : '#334155' }}
                            >
                              {u.value}
                            </Text>
                          </View>
                          <View className="flex-1">
                            <Text
                              className="text-sm font-extrabold"
                              style={{ color: active ? '#16a34a' : '#0f172a' }}
                            >
                              {u.label}
                            </Text>
                            <Text className="text-[10px] text-slate-500 font-semibold" numberOfLines={1}>
                              {u.desc}
                            </Text>
                          </View>
                          {active && <Check size={16} color="#16a34a" />}
                        </Pressable>
                      );
                    })}
                  </View>
                ))
              )}
            </ScrollView>

            <View className="px-5 py-3 border-t border-slate-200 bg-white">
              {!showCustom ? (
                <Pressable
                  onPress={() => setShowCustom(true)}
                  className="h-12 rounded-xl border-2 border-dashed flex-row items-center justify-center gap-2 active:opacity-70"
                  style={{ borderColor: '#94a3b8', backgroundColor: '#f8fafc' }}
                >
                  <Plus size={16} color="#64748b" />
                  <Text className="text-sm font-extrabold text-slate-700">Add Custom Unit</Text>
                </Pressable>
              ) : (
                <View className="gap-2">
                  <View className="flex-row items-center gap-1 mb-1">
                    <Sparkles size={11} color="#16a34a" />
                    <Text className="text-[10px] uppercase tracking-wider font-extrabold text-emerald-700">
                      {editingValue ? 'Edit Custom Unit' : 'New Custom Unit'}
                    </Text>
                  </View>
                  <TextInput
                    value={customValue}
                    onChangeText={setCustomValue}
                    placeholder="Unit name (e.g. bundle, drum)"
                    placeholderTextColor="#94a3b8"
                    autoFocus
                    className="h-11 rounded-xl bg-white px-3 text-sm font-bold text-slate-900"
                    style={{ borderWidth: 2, borderColor: '#e2e8f0' }}
                  />
                  <TextInput
                    value={customDesc}
                    onChangeText={setCustomDesc}
                    placeholder="Description (optional)"
                    placeholderTextColor="#94a3b8"
                    className="h-11 rounded-xl bg-white px-3 text-sm font-bold text-slate-900"
                    style={{ borderWidth: 2, borderColor: '#e2e8f0' }}
                  />
                  <View className="flex-row gap-2">
                    <Pressable
                      onPress={handleCustomSave}
                      disabled={!customValue.trim()}
                      className="flex-1 h-11 rounded-xl items-center justify-center"
                      style={{ backgroundColor: customValue.trim() ? '#16a34a' : '#94a3b8' }}
                    >
                      <Text className="text-white font-extrabold text-sm">
                        {editingValue ? 'Update' : 'Add'}
                      </Text>
                    </Pressable>
                    <Pressable
                      onPress={() => {
                        setShowCustom(false);
                        setCustomValue('');
                        setCustomDesc('');
                        setEditingValue(null);
                      }}
                      className="h-11 px-4 rounded-xl bg-slate-100 items-center justify-center"
                    >
                      <Text className="text-slate-700 font-extrabold text-sm">Cancel</Text>
                    </Pressable>
                  </View>
                </View>
              )}
            </View>
          </KeyboardAvoidingView>
        </SafeAreaView>
      </Modal>
    </View>
  );
}
