import { useState, useMemo } from 'react';
import { View, Text, TextInput, Pressable, ScrollView } from 'react-native';
import * as Haptics from 'expo-haptics';
import {
  Wand2, Palette, Ruler, Plus, X, CheckCircle2, Sparkles, ArrowRight, Trash2, Zap,
} from 'lucide-react-native';
import type { UpsertVariantPayload } from '@/api/product-variants.api';
import Toast from 'react-native-toast-message';

const COLOR_PRESETS = [
  { name: 'Red', hex: '#ef4444' },
  { name: 'Blue', hex: '#3b82f6' },
  { name: 'Green', hex: '#16a34a' },
  { name: 'Yellow', hex: '#eab308' },
  { name: 'Black', hex: '#0f172a' },
  { name: 'White', hex: '#ffffff' },
  { name: 'Pink', hex: '#ec4899' },
  { name: 'Purple', hex: '#8b5cf6' },
  { name: 'Orange', hex: '#f97316' },
  { name: 'Brown', hex: '#92400e' },
  { name: 'Gray', hex: '#64748b' },
  { name: 'Cyan', hex: '#06b6d4' },
];

const SIZE_PRESETS = ['XS', 'S', 'M', 'L', 'XL', 'XXL', '3XL'];

const QUICK_TEMPLATES = [
  { label: 'Clothing', sizes: ['S', 'M', 'L', 'XL'] },
  { label: 'Shoes', sizes: ['38', '39', '40', '41', '42', '43', '44'] },
  { label: 'Storage', sizes: ['64GB', '128GB', '256GB', '512GB'] },
  { label: 'Bottles', sizes: ['250ml', '500ml', '1L', '1.5L'] },
];

interface Props {
  basePrice: number;
  baseCostPrice: number;
  onGenerate: (variants: UpsertVariantPayload[]) => void;
}

export function VariantBuilder({ basePrice, baseCostPrice, onGenerate }: Props) {
  const [colors, setColors] = useState<{ name: string; hex: string }[]>([]);
  const [sizes, setSizes] = useState<string[]>([]);
  const [customColorName, setCustomColorName] = useState('');
  const [customColorHex, setCustomColorHex] = useState('#16a34a');
  const [customSize, setCustomSize] = useState('');

  const toggleColor = (c: { name: string; hex: string }) => {
    Haptics.selectionAsync();
    setColors((prev) =>
      prev.find((x) => x.name === c.name)
        ? prev.filter((x) => x.name !== c.name)
        : [...prev, c],
    );
  };

  const toggleSize = (s: string) => {
    Haptics.selectionAsync();
    setSizes((prev) => (prev.includes(s) ? prev.filter((x) => x !== s) : [...prev, s]));
  };

  const addCustomColor = () => {
    const name = customColorName.trim();
    if (!name) return;
    Haptics.notificationAsync(Haptics.NotificationFeedbackType.Success);
    if (!colors.some((x) => x.name.toLowerCase() === name.toLowerCase())) {
      setColors((prev) => [...prev, { name, hex: customColorHex }]);
    }
    setCustomColorName('');
  };

  const addCustomSize = () => {
    const v = customSize.trim();
    if (!v) return;
    Haptics.notificationAsync(Haptics.NotificationFeedbackType.Success);
    if (!sizes.some((x) => x.toLowerCase() === v.toLowerCase())) {
      setSizes((prev) => [...prev, v]);
    }
    setCustomSize('');
  };

  const applyTemplate = (tSizes: string[]) => {
    Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
    const merged = Array.from(new Set([...sizes, ...tSizes]));
    setSizes(merged);
  };

  const clearAll = () => {
    Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Medium);
    setColors([]);
    setSizes([]);
  };

  const totalVariants = useMemo(() => {
    if (colors.length === 0 && sizes.length === 0) return 0;
    if (colors.length > 0 && sizes.length > 0) return colors.length * sizes.length;
    return Math.max(colors.length, sizes.length);
  }, [colors.length, sizes.length]);

  const generate = () => {
    if (totalVariants === 0) return;
    Haptics.notificationAsync(Haptics.NotificationFeedbackType.Success);
    const result: UpsertVariantPayload[] = [];
    let order = 0;

    if (colors.length === 0) {
      sizes.forEach((s) => result.push({
        name: s, size: s, price: basePrice, costPrice: baseCostPrice, stock: 0, sortOrder: order++,
      }));
    } else if (sizes.length === 0) {
      colors.forEach((c) => result.push({
        name: c.name, color: c.name, colorHex: c.hex,
        price: basePrice, costPrice: baseCostPrice, stock: 0, sortOrder: order++,
      }));
    } else {
      colors.forEach((c) => {
        sizes.forEach((s) => {
          result.push({
            name: `${c.name} - ${s}`, color: c.name, colorHex: c.hex, size: s,
            price: basePrice, costPrice: baseCostPrice, stock: 0, sortOrder: order++,
          });
        });
      });
    }

    onGenerate(result);
    setColors([]);
    setSizes([]);
    Toast.show({ type: 'success', text1: `${result.length} variants generated` });
  };

  return (
    <View className="rounded-3xl p-4" style={{ backgroundColor: '#faf5ff', borderWidth: 2, borderColor: '#e9d5ff' }}>
      <View className="flex-row items-center justify-between mb-4">
        <View className="flex-row items-center gap-3 flex-1">
          <View
            className="h-12 w-12 rounded-2xl items-center justify-center"
            style={{ backgroundColor: '#7c3aed', shadowColor: '#7c3aed', shadowOpacity: 0.3, shadowRadius: 8, elevation: 4 }}
          >
            <Wand2 size={22} color="#ffffff" />
          </View>
          <View className="flex-1">
            <Text className="text-lg font-extrabold text-slate-900">Variant Builder</Text>
            <Text className="text-xs text-slate-600 font-semibold">Auto-generate combinations</Text>
          </View>
        </View>
        {(colors.length > 0 || sizes.length > 0) && (
          <Pressable
            onPress={clearAll}
            className="h-9 px-3 rounded-lg flex-row items-center gap-1"
            style={{ backgroundColor: '#fef2f2', borderWidth: 2, borderColor: '#fecaca' }}
          >
            <Trash2 size={12} color="#dc2626" />
            <Text className="text-xs font-extrabold text-rose-700">Clear</Text>
          </Pressable>
        )}
      </View>

      <View className="rounded-2xl bg-white p-3 mb-3" style={{ borderWidth: 2, borderColor: '#e9d5ff' }}>
        <View className="flex-row items-center gap-1 mb-2">
          <Zap size={11} color="#7c3aed" />
          <Text className="text-[10px] uppercase tracking-wider font-extrabold text-violet-700">Quick Templates</Text>
        </View>
        <ScrollView horizontal showsHorizontalScrollIndicator={false} contentContainerStyle={{ gap: 6, paddingRight: 12 }}>
          {QUICK_TEMPLATES.map((tpl) => (
            <Pressable
              key={tpl.label}
              onPress={() => applyTemplate(tpl.sizes)}
              className="flex-row items-center gap-1 h-8 px-3 rounded-lg"
              style={{ backgroundColor: '#faf5ff', borderWidth: 1, borderColor: '#e9d5ff' }}
            >
              <Sparkles size={10} color="#7c3aed" />
              <Text className="text-xs font-extrabold text-violet-700">{tpl.label}</Text>
            </Pressable>
          ))}
        </ScrollView>
      </View>

      <View className="rounded-2xl bg-white p-3 mb-3" style={{ borderWidth: 2, borderColor: '#e9d5ff' }}>
        <View className="flex-row items-center gap-2 mb-3">
          <View className="h-8 w-8 rounded-lg items-center justify-center" style={{ backgroundColor: '#7c3aed' }}>
            <Palette size={14} color="#ffffff" />
          </View>
          <View className="flex-1">
            <Text className="font-extrabold text-slate-900 text-sm">Colors</Text>
            <Text className="text-[10px] text-slate-500 font-semibold">Tap to select multiple</Text>
          </View>
          {colors.length > 0 && (
            <View className="px-2 py-0.5 rounded-full" style={{ backgroundColor: '#ede9fe' }}>
              <Text className="text-[10px] font-extrabold text-violet-700">{colors.length}</Text>
            </View>
          )}
        </View>

        <View className="flex-row flex-wrap gap-1.5">
          {COLOR_PRESETS.map((c) => {
            const active = colors.find((x) => x.name === c.name);
            return (
              <Pressable
                key={c.name}
                onPress={() => toggleColor(c)}
                className="flex-row items-center gap-1.5 px-2.5 py-1.5 rounded-lg"
                style={{
                  backgroundColor: active ? '#faf5ff' : '#ffffff',
                  borderWidth: 2,
                  borderColor: active ? '#7c3aed' : '#e2e8f0',
                }}
              >
                <View
                  className="h-3.5 w-3.5 rounded-full"
                  style={{ backgroundColor: c.hex, borderWidth: 1, borderColor: '#cbd5e1' }}
                />
                <Text className="text-xs font-extrabold text-slate-800">{c.name}</Text>
                {active && <CheckCircle2 size={12} color="#7c3aed" />}
              </Pressable>
            );
          })}
        </View>

        <View className="flex-row gap-2 mt-3">
          <View
            className="h-11 w-14 rounded-lg items-center justify-center"
            style={{ backgroundColor: customColorHex, borderWidth: 2, borderColor: '#e2e8f0' }}
          />
          <TextInput
            value={customColorName}
            onChangeText={setCustomColorName}
            placeholder="Custom color name"
            placeholderTextColor="#94a3b8"
            className="flex-1 h-11 rounded-lg px-3 text-sm font-bold text-slate-900"
            style={{ backgroundColor: '#ffffff', borderWidth: 2, borderColor: '#e2e8f0' }}
          />
          <Pressable
            onPress={addCustomColor}
            disabled={!customColorName.trim()}
            className="h-11 px-3 rounded-lg flex-row items-center gap-1"
            style={{ backgroundColor: customColorName.trim() ? '#7c3aed' : '#94a3b8' }}
          >
            <Plus size={14} color="#ffffff" />
            <Text className="text-white text-xs font-extrabold">Add</Text>
          </Pressable>
        </View>
      </View>

      <View className="rounded-2xl bg-white p-3 mb-3" style={{ borderWidth: 2, borderColor: '#fbcfe8' }}>
        <View className="flex-row items-center gap-2 mb-3">
          <View className="h-8 w-8 rounded-lg items-center justify-center" style={{ backgroundColor: '#ec4899' }}>
            <Ruler size={14} color="#ffffff" />
          </View>
          <View className="flex-1">
            <Text className="font-extrabold text-slate-900 text-sm">Sizes / Codes</Text>
            <Text className="text-[10px] text-slate-500 font-semibold">XS-XXL, 32GB, 250ml, 17R</Text>
          </View>
          {sizes.length > 0 && (
            <View className="px-2 py-0.5 rounded-full" style={{ backgroundColor: '#fce7f3' }}>
              <Text className="text-[10px] font-extrabold text-pink-700">{sizes.length}</Text>
            </View>
          )}
        </View>

        <View className="flex-row flex-wrap gap-1.5">
          {SIZE_PRESETS.map((s) => {
            const active = sizes.includes(s);
            return (
              <Pressable
                key={s}
                onPress={() => toggleSize(s)}
                className="flex-row items-center gap-1 px-3 py-1.5 rounded-lg"
                style={{
                  backgroundColor: active ? '#ec4899' : '#ffffff',
                  borderWidth: 2,
                  borderColor: active ? '#ec4899' : '#e2e8f0',
                }}
              >
                <Text
                  className="text-xs font-extrabold"
                  style={{ color: active ? '#ffffff' : '#334155' }}
                >
                  {s}
                </Text>
                {active && <CheckCircle2 size={12} color="#ffffff" />}
              </Pressable>
            );
          })}
        </View>

        <View className="flex-row gap-2 mt-3">
          <TextInput
            value={customSize}
            onChangeText={setCustomSize}
            placeholder="Custom (e.g. 250g, 1L, 17R)"
            placeholderTextColor="#94a3b8"
            className="flex-1 h-11 rounded-lg px-3 text-sm font-bold text-slate-900"
            style={{ backgroundColor: '#ffffff', borderWidth: 2, borderColor: '#e2e8f0' }}
            onSubmitEditing={addCustomSize}
          />
          <Pressable
            onPress={addCustomSize}
            disabled={!customSize.trim()}
            className="h-11 px-3 rounded-lg flex-row items-center gap-1"
            style={{ backgroundColor: customSize.trim() ? '#ec4899' : '#94a3b8' }}
          >
            <Plus size={14} color="#ffffff" />
            <Text className="text-white text-xs font-extrabold">Add</Text>
          </Pressable>
        </View>
      </View>

      {(colors.length > 0 || sizes.length > 0) && (
        <View className="rounded-2xl bg-white p-3 mb-3" style={{ borderWidth: 2, borderColor: '#e2e8f0' }}>
          <View className="flex-row items-center gap-1 mb-2">
            <CheckCircle2 size={11} color="#16a34a" />
            <Text className="text-[10px] uppercase tracking-wider font-extrabold text-slate-700">Selected</Text>
          </View>
          {colors.length > 0 && (
            <View className="mb-2">
              <Text className="text-[10px] font-extrabold text-slate-600 mb-1">Colors ({colors.length})</Text>
              <View className="flex-row flex-wrap gap-1">
                {colors.map((c) => (
                  <Pressable
                    key={c.name}
                    onPress={() => toggleColor(c)}
                    className="flex-row items-center gap-1 px-2 py-1 rounded-lg"
                    style={{ backgroundColor: '#faf5ff', borderWidth: 1, borderColor: '#e9d5ff' }}
                  >
                    <View
                      className="h-2.5 w-2.5 rounded-full"
                      style={{ backgroundColor: c.hex, borderWidth: 1, borderColor: '#cbd5e1' }}
                    />
                    <Text className="text-[10px] font-extrabold text-slate-700">{c.name}</Text>
                    <X size={9} color="#7c3aed" />
                  </Pressable>
                ))}
              </View>
            </View>
          )}
          {sizes.length > 0 && (
            <View>
              <Text className="text-[10px] font-extrabold text-slate-600 mb-1">Sizes ({sizes.length})</Text>
              <View className="flex-row flex-wrap gap-1">
                {sizes.map((s) => (
                  <Pressable
                    key={s}
                    onPress={() => toggleSize(s)}
                    className="flex-row items-center gap-1 px-2 py-1 rounded-lg"
                    style={{ backgroundColor: '#fdf2f8', borderWidth: 1, borderColor: '#fbcfe8' }}
                  >
                    <Text className="text-[10px] font-extrabold text-slate-700">{s}</Text>
                    <X size={9} color="#ec4899" />
                  </Pressable>
                ))}
              </View>
            </View>
          )}
        </View>
      )}

      <View
        className="rounded-2xl p-4 flex-row items-center justify-between"
        style={{
          backgroundColor: '#7c3aed',
          shadowColor: '#7c3aed',
          shadowOpacity: 0.3,
          shadowRadius: 12,
          elevation: 6,
        }}
      >
        <View className="flex-row items-center gap-3 flex-1">
          <View className="h-12 w-12 rounded-2xl bg-white/20 items-center justify-center">
            <Sparkles size={22} color="#ffffff" />
          </View>
          <View className="flex-1">
            <Text className="text-[10px] uppercase tracking-wider font-extrabold text-white/80">Will Generate</Text>
            <Text className="text-3xl font-extrabold text-white">{totalVariants}</Text>
            <Text className="text-[10px] text-white/80 font-bold">
              {colors.length} × {sizes.length} combinations
            </Text>
          </View>
        </View>
        <Pressable
          onPress={generate}
          disabled={totalVariants === 0}
          className="h-12 px-4 rounded-2xl flex-row items-center gap-1.5"
          style={{ backgroundColor: totalVariants === 0 ? 'rgba(255,255,255,0.3)' : '#ffffff' }}
        >
          <Wand2 size={14} color={totalVariants === 0 ? '#ffffff' : '#7c3aed'} />
          <Text
            className="text-xs font-extrabold"
            style={{ color: totalVariants === 0 ? '#ffffff' : '#7c3aed' }}
          >
            Generate
          </Text>
          <ArrowRight size={12} color={totalVariants === 0 ? '#ffffff' : '#7c3aed'} />
        </Pressable>
      </View>
    </View>
  );
}
