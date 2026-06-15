import { useState } from 'react';
import { View, Text, Pressable, TextInput, Alert, Image } from 'react-native';
import * as Haptics from 'expo-haptics';
import {
  ChevronDown, Save, Trash2, Image as ImageIcon, Camera,
} from 'lucide-react-native';
import { formatPKRFull } from '@/lib/format';
import type { ProductVariant, UpsertVariantPayload } from '@/api/product-variants.api';

interface Props {
  variant: ProductVariant;
  draft: UpsertVariantPayload;
  parentUnit: string;
  onUpdate: (patch: Partial<UpsertVariantPayload>) => void;
  onImageChange: () => void;
  onSave: () => void;
  onDelete: () => void;
  saving: boolean;
  deleting: boolean;
}

function CompactInput({ label, value, onChange, keyboardType = 'default', placeholder }: any) {
  return (
    <View style={{ flex: 1 }}>
      <Text className="text-[10px] font-bold uppercase tracking-wider text-neutral-500 mb-1">
        {label}
      </Text>
      <View className="rounded-xl border border-neutral-200 dark:border-neutral-700 bg-white dark:bg-neutral-900 px-3 h-10 justify-center">
        <TextInput
          value={value ?? ''}
          onChangeText={onChange}
          keyboardType={keyboardType}
          placeholder={placeholder}
          placeholderTextColor="#9ca3af"
          className="text-sm font-bold text-neutral-900 dark:text-white"
        />
      </View>
    </View>
  );
}

export function MobileVariantCard({
  variant, draft, parentUnit, onUpdate, onImageChange, onSave, onDelete, saving, deleting,
}: Props) {
  const [expanded, setExpanded] = useState(false);

  const profit = (draft.price ?? 0) - (draft.costPrice ?? 0);
  const margin = draft.price ? (profit / draft.price) * 100 : 0;

  const handleToggle = () => {
    Haptics.selectionAsync();
    setExpanded((v) => !v);
  };

  return (
    <View
      className="rounded-2xl bg-white dark:bg-neutral-900 overflow-hidden border-2"
      style={{
        borderColor: expanded ? '#16a34a' : '#e5e7eb',
        shadowColor: expanded ? '#16a34a' : '#000',
        shadowOpacity: expanded ? 0.1 : 0.04,
        shadowRadius: 8,
        elevation: expanded ? 4 : 2,
      }}
    >
      {/* COLLAPSED HEADER */}
      <Pressable
        onPress={handleToggle}
        className="flex-row items-center gap-3 p-3 active:opacity-70"
      >
        {/* Thumbnail */}
        <View className="h-14 w-14 rounded-xl overflow-hidden bg-neutral-100 dark:bg-neutral-800 border border-neutral-200 dark:border-neutral-700">
          {draft.imageUrl ? (
            <Image source={{ uri: draft.imageUrl }} style={{ width: '100%', height: '100%' }} resizeMode="cover" />
          ) : draft.colorHex ? (
            <View style={{ width: '100%', height: '100%', backgroundColor: draft.colorHex }} />
          ) : (
            <View className="w-full h-full items-center justify-center">
              <ImageIcon size={18} color="#9ca3af" />
            </View>
          )}
        </View>

        {/* Info */}
        <View className="flex-1 min-w-0">
          <View className="flex-row items-center gap-1.5">
            {draft.colorHex && (
              <View
                style={{
                  height: 10, width: 10, borderRadius: 5,
                  backgroundColor: draft.colorHex,
                  borderWidth: 1, borderColor: '#cbd5e1',
                }}
              />
            )}
            <Text className="font-bold text-neutral-900 dark:text-white text-sm flex-1" numberOfLines={1}>
              {draft.name || 'Unnamed'}
            </Text>
            {!draft.isActive && (
              <View className="px-1.5 py-0.5 rounded-md bg-neutral-200 dark:bg-neutral-800">
                <Text className="text-[9px] font-bold text-neutral-600 dark:text-neutral-300">OFF</Text>
              </View>
            )}
          </View>
          <Text className="text-[11px] text-neutral-500 mt-0.5" numberOfLines={1}>
            {draft.sku || 'No SKU'}
            {draft.size && ` • ${draft.size}`}
          </Text>
        </View>

        {/* Price + Stock */}
        <View className="items-end">
          <Text className="text-base font-extrabold text-emerald-700 dark:text-emerald-400">
            {formatPKRFull(draft.price ?? 0)}
          </Text>
          <Text className="text-[10px] text-neutral-500 font-bold">
            Stock: {draft.stock ?? 0}
          </Text>
        </View>

        {/* Chevron */}
        <View
          className="h-8 w-8 rounded-full items-center justify-center"
          style={{
            backgroundColor: expanded ? '#dcfce7' : '#f3f4f6',
            transform: [{ rotate: expanded ? '180deg' : '0deg' }],
          }}
        >
          <ChevronDown size={16} color={expanded ? '#16a34a' : '#6b7280'} />
        </View>
      </Pressable>

      {/* EXPANDED EDITOR */}
      {expanded && (
        <View className="border-t-2 border-neutral-100 dark:border-neutral-800 p-3 gap-3 bg-neutral-50/30 dark:bg-neutral-950/30">
          {/* Image upload row */}
          <View className="flex-row items-center gap-3">
            <View className="h-20 w-20 rounded-2xl overflow-hidden bg-white dark:bg-neutral-900 border-2 border-neutral-200 dark:border-neutral-700">
              {draft.imageUrl ? (
                <Image source={{ uri: draft.imageUrl }} style={{ width: '100%', height: '100%' }} resizeMode="cover" />
              ) : (
                <View className="w-full h-full items-center justify-center">
                  <ImageIcon size={24} color="#9ca3af" />
                </View>
              )}
            </View>

            <View className="flex-1 gap-2">
              <Pressable
                onPress={onImageChange}
                className="h-10 rounded-xl flex-row items-center justify-center gap-1.5 active:opacity-80"
                style={{ backgroundColor: '#8b5cf6' }}
              >
                <Camera size={14} color="#ffffff" />
                <Text className="text-white font-bold text-xs">
                  {draft.imageUrl ? 'Change Image' : 'Add Image'}
                </Text>
              </Pressable>
              {draft.imageUrl && (
                <Pressable
                  onPress={() => onUpdate({ imageUrl: undefined })}
                  className="h-9 rounded-xl flex-row items-center justify-center gap-1.5 bg-rose-50 dark:bg-rose-950/40 active:opacity-80"
                >
                  <Trash2 size={12} color="#dc2626" />
                  <Text className="text-rose-700 font-bold text-xs">Remove</Text>
                </Pressable>
              )}
            </View>
          </View>

          {/* Name + SKU */}
          <View className="flex-row gap-2">
            <CompactInput
              label="Variant Name *"
              value={draft.name}
              onChange={(t: string) => onUpdate({ name: t })}
            />
            <CompactInput
              label="SKU"
              value={draft.sku}
              onChange={(t: string) => onUpdate({ sku: t })}
            />
          </View>

          {/* Barcode + Size */}
          <View className="flex-row gap-2">
            <CompactInput
              label="Barcode"
              value={draft.barcode}
              onChange={(t: string) => onUpdate({ barcode: t })}
              keyboardType="number-pad"
            />
            <CompactInput
              label="Size / Code"
              value={draft.size}
              onChange={(t: string) => onUpdate({ size: t })}
              placeholder="1D, M, L..."
            />
          </View>

          {/* Color */}
          <View className="flex-row gap-2 items-end">
            <CompactInput
              label="Color Name"
              value={draft.color}
              onChange={(t: string) => onUpdate({ color: t })}
            />
            <View style={{ width: 90 }}>
              <Text className="text-[10px] font-bold uppercase tracking-wider text-neutral-500 mb-1">
                Hex
              </Text>
              <View className="flex-row gap-1.5">
                {['#ef4444', '#3b82f6', '#16a34a', '#eab308', '#0f172a', '#ec4899'].map((c) => (
                  <Pressable
                    key={c}
                    onPress={() => onUpdate({ colorHex: c })}
                    style={{
                      width: 18,
                      height: 18,
                      borderRadius: 9,
                      backgroundColor: c,
                      borderWidth: draft.colorHex === c ? 2 : 1,
                      borderColor: draft.colorHex === c ? '#16a34a' : '#cbd5e1',
                    }}
                  />
                ))}
              </View>
            </View>
          </View>

          {/* Pricing row */}
          <View className="flex-row gap-2">
            <CompactInput
              label="Sell Price *"
              value={draft.price !== undefined ? String(draft.price) : ''}
              onChange={(t: string) => onUpdate({ price: Number(t) || 0 })}
              keyboardType="decimal-pad"
            />
            <CompactInput
              label="Cost"
              value={draft.costPrice !== undefined ? String(draft.costPrice) : ''}
              onChange={(t: string) => onUpdate({ costPrice: Number(t) || 0 })}
              keyboardType="decimal-pad"
            />
            <CompactInput
              label="Wholesale"
              value={draft.wholesalePrice !== undefined ? String(draft.wholesalePrice) : ''}
              onChange={(t: string) => onUpdate({ wholesalePrice: t ? Number(t) : undefined })}
              keyboardType="decimal-pad"
            />
          </View>

          {/* Stock row */}
          <View className="flex-row gap-2">
            <CompactInput
              label="Stock"
              value={draft.stock !== undefined ? String(draft.stock) : ''}
              onChange={(t: string) => onUpdate({ stock: Number(t) || 0 })}
              keyboardType="decimal-pad"
            />
            <CompactInput
              label="Low Alert"
              value={draft.lowStockAlert !== undefined ? String(draft.lowStockAlert) : ''}
              onChange={(t: string) => onUpdate({ lowStockAlert: Number(t) || 5 })}
              keyboardType="number-pad"
            />
            <CompactInput
              label="Unit"
              value={draft.unit}
              onChange={(t: string) => onUpdate({ unit: t })}
              placeholder={parentUnit}
            />
          </View>

          {/* Profit bar */}
          <View
            className="rounded-xl px-3 py-2.5 flex-row items-center justify-between"
            style={{ backgroundColor: '#dcfce7' }}
          >
            <View>
              <Text className="text-[10px] uppercase tracking-wider font-bold text-emerald-700">
                Profit per unit
              </Text>
              <Text className="text-sm font-extrabold text-emerald-800">
                {formatPKRFull(profit)} ({margin.toFixed(1)}%)
              </Text>
            </View>

            <Pressable
              onPress={() => onUpdate({ isActive: !draft.isActive })}
              className="flex-row items-center gap-1.5"
            >
              <View
                style={{
                  height: 22, width: 38, borderRadius: 11, padding: 2,
                  justifyContent: 'center',
                  backgroundColor: draft.isActive ? '#16a34a' : '#d1d5db',
                }}
              >
                <View
                  style={{
                    height: 18, width: 18, borderRadius: 9,
                    backgroundColor: '#ffffff',
                    transform: [{ translateX: draft.isActive ? 16 : 0 }],
                  }}
                />
              </View>
              <Text className="text-xs font-bold text-emerald-900">
                {draft.isActive ? 'Active' : 'Off'}
              </Text>
            </Pressable>
          </View>

          {/* Actions */}
          <View className="flex-row gap-2 pt-2 border-t border-neutral-200 dark:border-neutral-800">
            <Pressable
              onPress={() => {
                Alert.alert('Delete variant?', `Delete "${variant.name}"?`, [
                  { text: 'Cancel', style: 'cancel' },
                  { text: 'Delete', style: 'destructive', onPress: onDelete },
                ]);
              }}
              disabled={deleting}
              className="flex-1 h-11 rounded-xl bg-rose-50 dark:bg-rose-950/40 border border-rose-200 dark:border-rose-900/50 flex-row items-center justify-center gap-1.5 active:opacity-70"
            >
              <Trash2 size={14} color="#dc2626" />
              <Text className="text-rose-700 font-bold text-sm">
                {deleting ? 'Deleting...' : 'Delete'}
              </Text>
            </Pressable>
            <Pressable
              onPress={onSave}
              disabled={saving}
              className="flex-1 h-11 rounded-xl flex-row items-center justify-center gap-1.5 active:opacity-80"
              style={{ backgroundColor: '#16a34a' }}
            >
              <Save size={14} color="#ffffff" />
              <Text className="text-white font-extrabold text-sm">
                {saving ? 'Saving...' : 'Save Variant'}
              </Text>
            </Pressable>
          </View>
        </View>
      )}
    </View>
  );
}
