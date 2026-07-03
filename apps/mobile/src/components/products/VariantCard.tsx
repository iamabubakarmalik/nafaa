import { useState } from 'react';
import { View, Text, TextInput, Pressable, Image, Alert } from 'react-native';
import * as Haptics from 'expo-haptics';
import * as ImagePicker from 'expo-image-picker';
import {
  ChevronDown, Save, Trash2, Image as ImageIcon, Palette, Hash,
  DollarSign, Package, TrendingUp, AlertTriangle, Eye,
  CheckCircle2, Camera,
} from 'lucide-react-native';
import { formatPKRFull } from '@/lib/format';
import { uploadsApi } from '@/api/uploads.api';
import Toast from 'react-native-toast-message';
import type { ProductVariant, UpsertVariantPayload } from '@/api/product-variants.api';

interface Props {
  variant: ProductVariant;
  draft: UpsertVariantPayload;
  parentUnit: string;
  onUpdate: (patch: Partial<UpsertVariantPayload>) => void;
  onImageChange: (url: string | null) => void;
  onSave: () => void;
  onDelete: () => void;
  saving: boolean;
  deleting: boolean;
}

export function VariantCard({
  variant, draft, parentUnit, onUpdate, onImageChange, onSave, onDelete, saving, deleting,
}: Props) {
  const [expanded, setExpanded] = useState(false);
  const [uploading, setUploading] = useState(false);

  const profit = (draft.price ?? 0) - (draft.costPrice ?? 0);
  const margin = draft.price ? (profit / draft.price) * 100 : 0;
  const stockValue = (draft.stock ?? 0) * (draft.price ?? 0);
  const isLowStock = (draft.stock ?? 0) > 0 && (draft.stock ?? 0) <= (draft.lowStockAlert ?? 5);
  const isOutOfStock = (draft.stock ?? 0) === 0;
  const isLoss = profit < 0;

  const handleImagePick = async () => {
    try {
      const perm = await ImagePicker.requestMediaLibraryPermissionsAsync();
      if (!perm.granted) {
        Toast.show({ type: 'error', text1: 'Gallery permission required' });
        return;
      }
      const result = await ImagePicker.launchImageLibraryAsync({
        mediaTypes: ImagePicker.MediaTypeOptions.Images,
        allowsEditing: true,
        aspect: [1, 1],
        quality: 0.7,
      });
      if (result.canceled || !result.assets[0]) return;
      setUploading(true);
      Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
      const asset = result.assets[0];
      const uploaded = await (uploadsApi as any).upload({
        uri: asset.uri,
        fileName: asset.fileName || `variant-${Date.now()}.jpg`,
        mimeType: asset.mimeType || 'image/jpeg',
        purpose: 'product-image',
      });
      const url = uploaded?.url || uploaded?.data?.url;
      if (url) {
        onImageChange(url);
        Toast.show({ type: 'success', text1: 'Image uploaded' });
      }
    } catch (e: any) {
      Toast.show({ type: 'error', text1: e?.message || 'Upload failed' });
    } finally {
      setUploading(false);
    }
  };

  return (
    <View
      className="rounded-2xl bg-white overflow-hidden mb-3"
      style={{
        borderWidth: 2,
        borderColor: expanded ? '#16a34a' : '#e2e8f0',
      }}
    >
      <Pressable
        onPress={() => { Haptics.selectionAsync(); setExpanded((v) => !v); }}
        className="flex-row items-center gap-3 p-3"
      >
        <View
          className="h-14 w-14 rounded-xl overflow-hidden"
          style={{ borderWidth: 2, borderColor: '#e2e8f0', backgroundColor: '#f1f5f9' }}
        >
          {draft.imageUrl ? (
            <Image source={{ uri: draft.imageUrl }} style={{ width: '100%', height: '100%' }} resizeMode="cover" />
          ) : draft.colorHex ? (
            <View style={{ flex: 1, backgroundColor: draft.colorHex }} />
          ) : (
            <View style={{ flex: 1, alignItems: 'center', justifyContent: 'center' }}>
              <ImageIcon size={20} color="#94a3b8" />
            </View>
          )}
        </View>

        <View className="flex-1 min-w-0">
          <View className="flex-row items-center gap-1.5 flex-wrap">
            {draft.colorHex && (
              <View
                className="h-3 w-3 rounded-full"
                style={{ backgroundColor: draft.colorHex, borderWidth: 1, borderColor: '#cbd5e1' }}
              />
            )}
            <Text className="font-extrabold text-slate-900 flex-1" numberOfLines={1}>
              {draft.name || 'Unnamed variant'}
            </Text>
            {!draft.isActive && (
              <View className="px-1.5 py-0.5 rounded-full bg-slate-200">
                <Text className="text-[9px] font-extrabold text-slate-700">OFF</Text>
              </View>
            )}
            {isLoss && (
              <View className="px-1.5 py-0.5 rounded-full bg-rose-100">
                <Text className="text-[9px] font-extrabold text-rose-700">LOSS</Text>
              </View>
            )}
            {isOutOfStock && (
              <View className="px-1.5 py-0.5 rounded-full bg-rose-100">
                <Text className="text-[9px] font-extrabold text-rose-700">OUT</Text>
              </View>
            )}
            {isLowStock && !isOutOfStock && (
              <View className="px-1.5 py-0.5 rounded-full bg-amber-100">
                <Text className="text-[9px] font-extrabold text-amber-700">LOW</Text>
              </View>
            )}
          </View>
          <View className="flex-row items-center gap-2 mt-0.5">
            {draft.sku && (
              <Text className="text-[10px] font-mono font-bold text-slate-600">SKU: {draft.sku}</Text>
            )}
            {draft.size && (
              <Text className="text-[10px] font-bold text-slate-600">• {draft.size}</Text>
            )}
          </View>
          <View className="flex-row items-center gap-2 mt-1">
            <Text className="text-sm font-extrabold text-emerald-700">{formatPKRFull(draft.price ?? 0)}</Text>
            <Text className="text-slate-400 text-xs">•</Text>
            <Text
              className="text-xs font-extrabold"
              style={{ color: isOutOfStock ? '#dc2626' : isLowStock ? '#d97706' : '#334155' }}
            >
              {draft.stock ?? 0} {draft.unit || parentUnit}
            </Text>
          </View>
        </View>

        <View
          className="h-9 w-9 rounded-full items-center justify-center"
          style={{
            backgroundColor: expanded ? '#16a34a' : '#f1f5f9',
            transform: [{ rotate: expanded ? '180deg' : '0deg' }],
          }}
        >
          <ChevronDown size={18} color={expanded ? '#ffffff' : '#334155'} />
        </View>
      </Pressable>

      {expanded && (
        <View className="p-4 gap-4" style={{ borderTopWidth: 2, borderTopColor: '#f1f5f9', backgroundColor: '#f8fafc' }}>
          <View className="items-center">
            <View
              className="h-32 w-32 rounded-2xl overflow-hidden mb-2"
              style={{ backgroundColor: '#f1f5f9', borderWidth: 2, borderColor: '#e2e8f0' }}
            >
              {draft.imageUrl ? (
                <Image source={{ uri: draft.imageUrl }} style={{ width: '100%', height: '100%' }} resizeMode="cover" />
              ) : draft.colorHex ? (
                <View style={{ flex: 1, backgroundColor: draft.colorHex, alignItems: 'center', justifyContent: 'center' }}>
                  <View className="bg-black/30 rounded-lg px-2 py-1">
                    <Text className="text-white text-[10px] font-extrabold">{draft.colorHex}</Text>
                  </View>
                </View>
              ) : (
                <View style={{ flex: 1, alignItems: 'center', justifyContent: 'center' }}>
                  <ImageIcon size={36} color="#cbd5e1" />
                </View>
              )}
            </View>
            <View className="flex-row gap-2">
              <Pressable
                onPress={handleImagePick}
                disabled={uploading}
                className="flex-row items-center gap-1.5 px-3 h-10 rounded-xl"
                style={{ backgroundColor: '#16a34a' }}
              >
                <Camera size={14} color="#ffffff" />
                <Text className="text-white text-xs font-extrabold">
                  {uploading ? 'Uploading...' : draft.imageUrl ? 'Change' : 'Add Image'}
                </Text>
              </Pressable>
              {draft.imageUrl && (
                <Pressable
                  onPress={() => onImageChange(null)}
                  className="h-10 w-10 rounded-xl items-center justify-center"
                  style={{ backgroundColor: '#fef2f2', borderWidth: 2, borderColor: '#fecaca' }}
                >
                  <Trash2 size={14} color="#dc2626" />
                </Pressable>
              )}
            </View>
          </View>

          <View className="rounded-xl p-3" style={{ backgroundColor: '#f8fafc', borderWidth: 2, borderColor: '#e2e8f0' }}>
            <View className="flex-row items-center gap-1 mb-2">
              <Hash size={11} color="#64748b" />
              <Text className="text-[10px] uppercase tracking-wider font-extrabold text-slate-600">Identifiers</Text>
            </View>
            <View className="gap-2">
              <View>
                <Text className="text-[10px] font-extrabold uppercase text-slate-500 mb-1">Variant Name *</Text>
                <TextInput
                  value={draft.name ?? ''}
                  onChangeText={(v) => onUpdate({ name: v })}
                  placeholder="e.g. Red - Large"
                  placeholderTextColor="#94a3b8"
                  className="h-11 rounded-lg bg-white px-3 text-sm font-bold text-slate-900"
                  style={{ borderWidth: 2, borderColor: '#e2e8f0' }}
                />
              </View>
              <View className="flex-row gap-2">
                <View className="flex-1">
                  <Text className="text-[10px] font-extrabold uppercase text-slate-500 mb-1">SKU</Text>
                  <TextInput
                    value={draft.sku ?? ''}
                    onChangeText={(v) => onUpdate({ sku: v })}
                    className="h-11 rounded-lg bg-white px-3 text-sm font-mono font-bold text-slate-900"
                    style={{ borderWidth: 2, borderColor: '#e2e8f0' }}
                  />
                </View>
                <View className="flex-1">
                  <Text className="text-[10px] font-extrabold uppercase text-slate-500 mb-1">Barcode</Text>
                  <TextInput
                    value={draft.barcode ?? ''}
                    onChangeText={(v) => onUpdate({ barcode: v })}
                    className="h-11 rounded-lg bg-white px-3 text-sm font-mono font-bold text-slate-900"
                    style={{ borderWidth: 2, borderColor: '#e2e8f0' }}
                  />
                </View>
              </View>
            </View>
          </View>

          <View className="rounded-xl p-3" style={{ backgroundColor: '#faf5ff', borderWidth: 2, borderColor: '#e9d5ff' }}>
            <View className="flex-row items-center gap-1 mb-2">
              <Palette size={11} color="#7c3aed" />
              <Text className="text-[10px] uppercase tracking-wider font-extrabold text-violet-700">Appearance</Text>
            </View>
            <View className="gap-2">
              <View className="flex-row gap-2">
                <View className="flex-1">
                  <Text className="text-[10px] font-extrabold uppercase text-slate-500 mb-1">Color Name</Text>
                  <TextInput
                    value={draft.color ?? ''}
                    onChangeText={(v) => onUpdate({ color: v })}
                    placeholder="Red"
                    placeholderTextColor="#94a3b8"
                    className="h-11 rounded-lg bg-white px-3 text-sm font-bold text-slate-900"
                    style={{ borderWidth: 2, borderColor: '#e2e8f0' }}
                  />
                </View>
                <View className="flex-1">
                  <Text className="text-[10px] font-extrabold uppercase text-slate-500 mb-1">Size / Code</Text>
                  <TextInput
                    value={draft.size ?? ''}
                    onChangeText={(v) => onUpdate({ size: v })}
                    placeholder="M, L, 17R"
                    placeholderTextColor="#94a3b8"
                    className="h-11 rounded-lg bg-white px-3 text-sm font-bold text-slate-900"
                    style={{ borderWidth: 2, borderColor: '#e2e8f0' }}
                  />
                </View>
              </View>
              <View>
                <Text className="text-[10px] font-extrabold uppercase text-slate-500 mb-1">Color Hex</Text>
                <View className="flex-row gap-2">
                  <View
                    className="h-11 w-14 rounded-lg"
                    style={{ backgroundColor: draft.colorHex || '#e2e8f0', borderWidth: 2, borderColor: '#e2e8f0' }}
                  />
                  <TextInput
                    value={draft.colorHex ?? ''}
                    onChangeText={(v) => onUpdate({ colorHex: v })}
                    placeholder="#16a34a"
                    placeholderTextColor="#94a3b8"
                    className="flex-1 h-11 rounded-lg bg-white px-3 text-sm font-mono font-bold text-slate-900"
                    style={{ borderWidth: 2, borderColor: '#e2e8f0' }}
                  />
                </View>
              </View>
            </View>
          </View>

          <View className="rounded-xl p-3" style={{ backgroundColor: '#f0fdf4', borderWidth: 2, borderColor: '#bbf7d0' }}>
            <View className="flex-row items-center gap-1 mb-2">
              <DollarSign size={11} color="#16a34a" />
              <Text className="text-[10px] uppercase tracking-wider font-extrabold text-emerald-700">Pricing</Text>
            </View>
            <View className="gap-2">
              <View>
                <Text className="text-[10px] font-extrabold uppercase text-slate-500 mb-1">Sell Price *</Text>
                <TextInput
                  value={String(draft.price ?? 0)}
                  onChangeText={(v) => onUpdate({ price: Number(v || 0) })}
                  keyboardType="decimal-pad"
                  className="h-12 rounded-lg bg-white px-3 text-lg font-extrabold text-emerald-900"
                  style={{ borderWidth: 2, borderColor: '#bbf7d0' }}
                />
              </View>
              <View className="flex-row gap-2">
                <View className="flex-1">
                  <Text className="text-[10px] font-extrabold uppercase text-slate-500 mb-1">Cost Price</Text>
                  <TextInput
                    value={String(draft.costPrice ?? 0)}
                    onChangeText={(v) => onUpdate({ costPrice: Number(v || 0) })}
                    keyboardType="decimal-pad"
                    className="h-11 rounded-lg bg-white px-3 text-sm font-bold text-slate-900"
                    style={{ borderWidth: 2, borderColor: '#e2e8f0' }}
                  />
                </View>
                <View className="flex-1">
                  <Text className="text-[10px] font-extrabold uppercase text-slate-500 mb-1">Wholesale</Text>
                  <TextInput
                    value={draft.wholesalePrice !== undefined ? String(draft.wholesalePrice) : ''}
                    onChangeText={(v) => onUpdate({ wholesalePrice: v ? Number(v) : undefined })}
                    keyboardType="decimal-pad"
                    className="h-11 rounded-lg bg-white px-3 text-sm font-bold text-slate-900"
                    style={{ borderWidth: 2, borderColor: '#e2e8f0' }}
                  />
                </View>
              </View>
            </View>
          </View>

          <View className="rounded-xl p-3" style={{ backgroundColor: '#eff6ff', borderWidth: 2, borderColor: '#bfdbfe' }}>
            <View className="flex-row items-center gap-1 mb-2">
              <Package size={11} color="#2563eb" />
              <Text className="text-[10px] uppercase tracking-wider font-extrabold text-blue-700">Stock & Inventory</Text>
            </View>
            <View className="flex-row gap-2">
              <View className="flex-1">
                <Text className="text-[10px] font-extrabold uppercase text-slate-500 mb-1">Stock</Text>
                <TextInput
                  value={String(draft.stock ?? 0)}
                  onChangeText={(v) => onUpdate({ stock: Number(v || 0) })}
                  keyboardType="decimal-pad"
                  className="h-11 rounded-lg bg-white px-3 text-sm font-extrabold text-slate-900"
                  style={{ borderWidth: 2, borderColor: '#e2e8f0' }}
                />
              </View>
              <View className="flex-1">
                <Text className="text-[10px] font-extrabold uppercase text-slate-500 mb-1">Low Alert</Text>
                <TextInput
                  value={String(draft.lowStockAlert ?? 5)}
                  onChangeText={(v) => onUpdate({ lowStockAlert: Number(v || 0) })}
                  keyboardType="decimal-pad"
                  className="h-11 rounded-lg bg-white px-3 text-sm font-bold text-slate-900"
                  style={{ borderWidth: 2, borderColor: '#e2e8f0' }}
                />
              </View>
              <View className="flex-1">
                <Text className="text-[10px] font-extrabold uppercase text-slate-500 mb-1">Unit</Text>
                <TextInput
                  value={draft.unit ?? ''}
                  onChangeText={(v) => onUpdate({ unit: v })}
                  placeholder={parentUnit || 'pcs'}
                  placeholderTextColor="#94a3b8"
                  className="h-11 rounded-lg bg-white px-3 text-sm font-bold text-slate-900"
                  style={{ borderWidth: 2, borderColor: '#e2e8f0' }}
                />
              </View>
            </View>
          </View>

          <View className="flex-row gap-2">
            <View
              className="flex-1 rounded-xl p-3"
              style={{
                backgroundColor: isLoss ? '#fef2f2' : '#f0fdf4',
                borderWidth: 2,
                borderColor: isLoss ? '#fecaca' : '#bbf7d0',
              }}
            >
              <View className="flex-row items-center gap-1 mb-1">
                <TrendingUp size={11} color={isLoss ? '#dc2626' : '#16a34a'} />
                <Text
                  className="text-[10px] uppercase tracking-wider font-extrabold"
                  style={{ color: isLoss ? '#b91c1c' : '#15803d' }}
                >
                  Profit
                </Text>
              </View>
              <Text
                className="text-base font-extrabold"
                style={{ color: isLoss ? '#7f1d1d' : '#14532d' }}
              >
                {formatPKRFull(profit)}
              </Text>
              <Text
                className="text-[9px] font-bold mt-0.5"
                style={{ color: isLoss ? '#b91c1c' : '#15803d' }}
              >
                Margin: {margin.toFixed(1)}%
              </Text>
            </View>
            <View className="flex-1 rounded-xl p-3" style={{ backgroundColor: '#eff6ff', borderWidth: 2, borderColor: '#bfdbfe' }}>
              <View className="flex-row items-center gap-1 mb-1">
                <Package size={11} color="#2563eb" />
                <Text className="text-[10px] uppercase tracking-wider font-extrabold text-blue-700">
                  Stock Value
                </Text>
              </View>
              <Text className="text-base font-extrabold text-blue-900">{formatPKRFull(stockValue)}</Text>
              <Text className="text-[9px] text-blue-700 font-bold mt-0.5">
                {draft.stock ?? 0} × {formatPKRFull(draft.price ?? 0)}
              </Text>
            </View>
          </View>

          <Pressable
            onPress={() => onUpdate({ isActive: !draft.isActive })}
            className="flex-row items-center gap-3 p-3 rounded-xl"
            style={{
              backgroundColor: draft.isActive ? '#f0fdf4' : '#ffffff',
              borderWidth: 2,
              borderColor: draft.isActive ? '#16a34a' : '#e2e8f0',
            }}
          >
            <View
              className="h-6 w-6 rounded-lg items-center justify-center"
              style={{
                backgroundColor: draft.isActive ? '#16a34a' : '#ffffff',
                borderWidth: 2,
                borderColor: draft.isActive ? '#16a34a' : '#cbd5e1',
              }}
            >
              {draft.isActive && <CheckCircle2 size={14} color="#ffffff" />}
            </View>
            <Eye size={16} color="#64748b" />
            <View className="flex-1">
              <Text className="text-sm font-extrabold text-slate-900">Active (visible in POS)</Text>
              <Text className="text-[10px] text-slate-500 font-semibold">Show to customers</Text>
            </View>
          </Pressable>

          {isLoss && (
            <View className="rounded-xl p-3 flex-row items-start gap-2" style={{ backgroundColor: '#fef2f2', borderWidth: 2, borderColor: '#fecaca' }}>
              <AlertTriangle size={16} color="#dc2626" />
              <Text className="flex-1 text-xs text-rose-900 font-semibold">
                <Text className="font-extrabold">Warning:</Text> Sell price less than cost — selling at loss!
              </Text>
            </View>
          )}

          <View className="flex-row gap-2">
            <Pressable
              onPress={() => {
                Alert.alert('Delete variant?', 'This cannot be undone.', [
                  { text: 'Cancel', style: 'cancel' },
                  { text: 'Delete', style: 'destructive', onPress: onDelete },
                ]);
              }}
              disabled={deleting}
              className="flex-1 h-12 rounded-xl flex-row items-center justify-center gap-2"
              style={{ backgroundColor: '#fef2f2', borderWidth: 2, borderColor: '#fecaca' }}
            >
              <Trash2 size={14} color="#dc2626" />
              <Text className="text-rose-700 font-extrabold text-sm">
                {deleting ? 'Deleting...' : 'Delete'}
              </Text>
            </Pressable>
            <Pressable
              onPress={onSave}
              disabled={saving}
              className="flex-[2] h-12 rounded-xl flex-row items-center justify-center gap-2"
              style={{ backgroundColor: saving ? '#94a3b8' : '#16a34a' }}
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
