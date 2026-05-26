import { useState } from 'react';
import { View, Text, Pressable, TextInput } from 'react-native';
import { Plus, Wand2, Palette } from 'lucide-react-native';
import type { UpsertVariantPayload } from '@/api/product-variants.api';

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
];

const SIZE_PRESETS = ['XS', 'S', 'M', 'L', 'XL', 'XXL', '3XL'];

interface Props {
  basePrice: number;
  baseCostPrice: number;
  onGenerate: (variants: UpsertVariantPayload[]) => void;
}

export default function MobileVariantBuilder({
  basePrice,
  baseCostPrice,
  onGenerate,
}: Props) {
  const [colors, setColors] = useState<{ name: string; hex: string }[]>([]);
  const [sizes, setSizes] = useState<string[]>([]);
  const [customColorName, setCustomColorName] = useState('');
  const [customColorHex, setCustomColorHex] = useState('#16a34a');
  const [customSize, setCustomSize] = useState('');

  const toggleColor = (c: { name: string; hex: string }) => {
    setColors((prev) =>
      prev.find((x) => x.name === c.name)
        ? prev.filter((x) => x.name !== c.name)
        : [...prev, c],
    );
  };

  const toggleSize = (s: string) => {
    setSizes((prev) =>
      prev.includes(s) ? prev.filter((x) => x !== s) : [...prev, s],
    );
  };

  const addCustomColor = () => {
    const name = customColorName.trim();
    if (!name) return;
    if (!colors.find((c) => c.name.toLowerCase() === name.toLowerCase())) {
      setColors((prev) => [...prev, { name, hex: customColorHex }]);
    }
    setCustomColorName('');
  };

  const addCustomSize = () => {
    const size = customSize.trim();
    if (!size) return;
    if (!sizes.find((s) => s.toLowerCase() === size.toLowerCase())) {
      setSizes((prev) => [...prev, size]);
    }
    setCustomSize('');
  };

  const totalVariants = Math.max(colors.length, 1) * Math.max(sizes.length, 1);

  const generate = () => {
    const result: UpsertVariantPayload[] = [];
    let order = 0;

    if (colors.length === 0 && sizes.length === 0) return;

    if (colors.length === 0) {
      sizes.forEach((s) => {
        result.push({
          name: s,
          size: s,
          price: basePrice,
          costPrice: baseCostPrice,
          stock: 0,
          sortOrder: order++,
        });
      });
    } else if (sizes.length === 0) {
      colors.forEach((c) => {
        result.push({
          name: c.name,
          color: c.name,
          colorHex: c.hex,
          price: basePrice,
          costPrice: baseCostPrice,
          stock: 0,
          sortOrder: order++,
        });
      });
    } else {
      colors.forEach((c) => {
        sizes.forEach((s) => {
          result.push({
            name: `${c.name} - ${s}`,
            color: c.name,
            colorHex: c.hex,
            size: s,
            price: basePrice,
            costPrice: baseCostPrice,
            stock: 0,
            sortOrder: order++,
          });
        });
      });
    }

    onGenerate(result);
  };

  return (
    <View
      style={{
        borderRadius: 22,
        padding: 16,
        backgroundColor: '#f5f3ff',
        borderWidth: 1,
        borderColor: '#ddd6fe',
        gap: 16,
      }}
    >
      <View style={{ flexDirection: 'row', alignItems: 'center', gap: 10 }}>
        <View
          style={{
            height: 42,
            width: 42,
            borderRadius: 14,
            backgroundColor: '#7c3aed',
            alignItems: 'center',
            justifyContent: 'center',
          }}
        >
          <Wand2 size={20} color="#ffffff" />
        </View>
        <View style={{ flex: 1 }}>
          <Text style={{ fontWeight: '800', fontSize: 16, color: '#111827' }}>
            Variant Builder
          </Text>
          <Text style={{ fontSize: 12, color: '#6b7280' }}>
            Colors aur sizes choose karo — combinations auto ban jayengi
          </Text>
        </View>
      </View>

      <View>
        <View style={{ flexDirection: 'row', alignItems: 'center', gap: 6, marginBottom: 8 }}>
          <Palette size={15} color="#7c3aed" />
          <Text style={{ fontSize: 13, fontWeight: '800', color: '#334155' }}>Colors</Text>
        </View>

        <View style={{ flexDirection: 'row', flexWrap: 'wrap', gap: 8 }}>
          {COLOR_PRESETS.map((c) => {
            const active = colors.find((x) => x.name === c.name);
            return (
              <Pressable
                key={c.name}
                onPress={() => toggleColor(c)}
                style={{
                  flexDirection: 'row',
                  alignItems: 'center',
                  gap: 6,
                  paddingHorizontal: 12,
                  height: 34,
                  borderRadius: 999,
                  borderWidth: 2,
                  borderColor: active ? '#7c3aed' : '#e5e7eb',
                  backgroundColor: '#ffffff',
                }}
              >
                <View
                  style={{
                    height: 14,
                    width: 14,
                    borderRadius: 7,
                    borderWidth: 1,
                    borderColor: '#cbd5e1',
                    backgroundColor: c.hex,
                  }}
                />
                <Text style={{ fontSize: 12, fontWeight: '700', color: '#334155' }}>
                  {c.name}
                </Text>
              </Pressable>
            );
          })}
        </View>

        <View style={{ flexDirection: 'row', gap: 8, marginTop: 12 }}>
          <TextInput
            value={customColorHex}
            onChangeText={setCustomColorHex}
            placeholder="#16a34a"
            style={{
              width: 90,
              height: 42,
              borderRadius: 12,
              borderWidth: 1,
              borderColor: '#e5e7eb',
              backgroundColor: '#ffffff',
              paddingHorizontal: 12,
              color: '#111827',
            }}
          />
          <TextInput
            value={customColorName}
            onChangeText={setCustomColorName}
            placeholder="Custom color"
            style={{
              flex: 1,
              height: 42,
              borderRadius: 12,
              borderWidth: 1,
              borderColor: '#e5e7eb',
              backgroundColor: '#ffffff',
              paddingHorizontal: 12,
              color: '#111827',
            }}
          />
          <Pressable
            onPress={addCustomColor}
            style={{
              height: 42,
              paddingHorizontal: 14,
              borderRadius: 12,
              backgroundColor: '#ede9fe',
              alignItems: 'center',
              justifyContent: 'center',
              flexDirection: 'row',
              gap: 4,
            }}
          >
            <Plus size={14} color="#6d28d9" />
            <Text style={{ color: '#6d28d9', fontWeight: '800', fontSize: 12 }}>Add</Text>
          </Pressable>
        </View>
      </View>

      <View>
        <Text style={{ fontSize: 13, fontWeight: '800', color: '#334155', marginBottom: 8 }}>
          Sizes
        </Text>

        <View style={{ flexDirection: 'row', flexWrap: 'wrap', gap: 8 }}>
          {SIZE_PRESETS.map((s) => {
            const active = sizes.includes(s);
            return (
              <Pressable
                key={s}
                onPress={() => toggleSize(s)}
                style={{
                  paddingHorizontal: 12,
                  height: 34,
                  borderRadius: 999,
                  borderWidth: 2,
                  alignItems: 'center',
                  justifyContent: 'center',
                  borderColor: active ? '#ec4899' : '#e5e7eb',
                  backgroundColor: active ? '#ec4899' : '#ffffff',
                }}
              >
                <Text
                  style={{
                    fontSize: 12,
                    fontWeight: '800',
                    color: active ? '#ffffff' : '#334155',
                  }}
                >
                  {s}
                </Text>
              </Pressable>
            );
          })}
        </View>

        <View style={{ flexDirection: 'row', gap: 8, marginTop: 12 }}>
          <TextInput
            value={customSize}
            onChangeText={setCustomSize}
            placeholder="Custom size e.g. 250g"
            style={{
              flex: 1,
              height: 42,
              borderRadius: 12,
              borderWidth: 1,
              borderColor: '#e5e7eb',
              backgroundColor: '#ffffff',
              paddingHorizontal: 12,
              color: '#111827',
            }}
          />
          <Pressable
            onPress={addCustomSize}
            style={{
              height: 42,
              paddingHorizontal: 14,
              borderRadius: 12,
              backgroundColor: '#fce7f3',
              alignItems: 'center',
              justifyContent: 'center',
              flexDirection: 'row',
              gap: 4,
            }}
          >
            <Plus size={14} color="#be185d" />
            <Text style={{ color: '#be185d', fontWeight: '800', fontSize: 12 }}>Add</Text>
          </Pressable>
        </View>
      </View>

      <View
        style={{
          borderRadius: 18,
          padding: 14,
          backgroundColor: '#ffffff',
          borderWidth: 1,
          borderColor: '#ddd6fe',
          flexDirection: 'row',
          alignItems: 'center',
          justifyContent: 'space-between',
        }}
      >
        <View style={{ flex: 1 }}>
          <Text style={{ fontSize: 11, color: '#6b7280', fontWeight: '800', textTransform: 'uppercase' }}>
            Will generate
          </Text>
          <Text style={{ fontSize: 28, color: '#6d28d9', fontWeight: '900' }}>
            {totalVariants}
          </Text>
          <Text style={{ fontSize: 12, color: '#6b7280' }}>
            {colors.length} colors × {sizes.length} sizes
          </Text>
        </View>

        <Pressable
          onPress={generate}
          disabled={colors.length === 0 && sizes.length === 0}
          style={{
            height: 44,
            paddingHorizontal: 16,
            borderRadius: 14,
            backgroundColor:
              colors.length === 0 && sizes.length === 0 ? '#d1d5db' : '#7c3aed',
            alignItems: 'center',
            justifyContent: 'center',
            flexDirection: 'row',
            gap: 6,
          }}
        >
          <Wand2 size={16} color="#ffffff" />
          <Text style={{ color: '#ffffff', fontWeight: '800' }}>Generate</Text>
        </Pressable>
      </View>
    </View>
  );
}
