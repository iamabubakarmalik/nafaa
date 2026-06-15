import { useEffect, useState } from 'react';
import {
  View, Text, ScrollView, Pressable, KeyboardAvoidingView, Platform,
  TextInput, Alert, Image, ActivityIndicator,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { useLocalSearchParams, useRouter, Stack } from 'expo-router';
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import * as Haptics from 'expo-haptics';
import {
  ArrowLeft, Save, Star, Eye, EyeOff, Package, DollarSign, Boxes, Hash,
  Check, TrendingUp, Calendar, Tag as TagIcon, Building2, Trash2,
  ImageIcon, Layers, Upload, Star as StarFilled, GripVertical,
} from 'lucide-react-native';
import { productsApi, type UpdateProductPayload } from '@/api/products.api';
import { brandsApi } from '@/api/brands.api';
import { categoriesApi } from '@/api/categories.api';
import { tagsApi } from '@/api/tags.api';
import { productImagesApi } from '@/api/product-images.api';
import { productVariantsApi, type UpsertVariantPayload } from '@/api/product-variants.api';
import { ImagePickerSheet } from '@/components/uploads';
import MobileVariantBuilder from '@/components/products/MobileVariantBuilder';
import { MobileVariantCard } from '@/components/products/MobileVariantCard';
import { formatPKRFull } from '@/lib/format';
import Toast from 'react-native-toast-message';

import { useTranslation } from '@/i18n/useTranslation';

type Section = 'basic' | 'pricing' | 'inventory' | 'images' | 'variants' | 'tags';

const sections: {
  id: Section;
  label: string;
  icon: any;
  color: string;
}[] = [
  { id: 'basic', label: 'Basic', icon: Package, color: '#16a34a' },
  { id: 'pricing', label: 'Price', icon: DollarSign, color: '#2563eb' },
  { id: 'inventory', label: 'Stock', icon: Boxes, color: '#f59e0b' },
  { id: 'images', label: 'Images', icon: ImageIcon, color: '#8b5cf6' },
  { id: 'variants', label: 'Variants', icon: Layers, color: '#ec4899' },
  { id: 'tags', label: 'Tags', icon: Hash, color: '#0ea5e9' },
];

function ThemedInput({ label, required, hint, ...props }: any) {
  return (
    <View>
      <View className="flex-row items-center gap-1 mb-1.5">
        <Text className="text-sm font-bold text-neutral-700 dark:text-neutral-200">
          {label}
        </Text>
        {required && <Text className="text-rose-600 font-bold">*</Text>}
      </View>
      <View className="flex-row items-center gap-2 rounded-2xl border border-neutral-200 dark:border-neutral-800 bg-white dark:bg-neutral-900 px-4 h-12">
        <TextInput
          placeholderTextColor="#9ca3af"
          className="flex-1 text-base text-neutral-900 dark:text-white"
          {...props}
        />
      </View>
      {hint && <Text className="mt-1 text-xs text-neutral-500">{hint}</Text>}
    </View>
  );
}

export default function EditProductScreen() {
  const { t } = useTranslation();
  const { id } = useLocalSearchParams<{ id: string }>();
  const router = useRouter();
  const queryClient = useQueryClient();

  const [section, setSection] = useState<Section>('basic');
  const [form, setForm] = useState<UpdateProductPayload>({});
  const [originalLoaded, setOriginalLoaded] = useState(false);
  const [uploading, setUploading] = useState(false);
  const [showPicker, setShowPicker] = useState(false);
  const [variantDrafts, setVariantDrafts] = useState<Record<string, UpsertVariantPayload>>({});
  const [variantPickerForId, setVariantPickerForId] = useState<string | null>(null);

  const { data: product } = useQuery({
    queryKey: ['product', id],
    queryFn: async () => {
      try {
        return await productsApi.getOne(id);
      } catch {
        return null;
      }
    },
    enabled: !!id,
  });

  const { data: categories = [] } = useQuery({
    queryKey: ['categories'],
    queryFn: async () => {
      try {
        const r = await categoriesApi.list();
        return Array.isArray(r) ? r : [];
      } catch {
        return [];
      }
    },
  });

  const { data: brands = [] } = useQuery({
    queryKey: ['brands'],
    queryFn: async () => {
      try {
        const r = await brandsApi.list();
        return Array.isArray(r) ? r : [];
      } catch {
        return [];
      }
    },
  });

  const { data: allTags = [] } = useQuery({
    queryKey: ['tags'],
    queryFn: async () => {
      try {
        const r = await tagsApi.list();
        return Array.isArray(r) ? r : [];
      } catch {
        return [];
      }
    },
  });

  const { data: images = [], refetch: refetchImages } = useQuery({
    queryKey: ['product-images', id],
    queryFn: async () => {
      try {
        const r = await productImagesApi.list(id);
        return Array.isArray(r) ? r : [];
      } catch {
        return [];
      }
    },
    enabled: !!id,
  });

  const { data: variants = [], refetch: refetchVariants } = useQuery({
    queryKey: ['product-variants', id],
    queryFn: async () => {
      try {
        const r = await productVariantsApi.list(id);
        return Array.isArray(r) ? r : [];
      } catch {
        return [];
      }
    },
    enabled: !!id,
  });

  useEffect(() => {
    if (product && !originalLoaded) {
      setForm({
        name: product.name,
        description: product.description ?? '',
        shortDescription: product.shortDescription ?? '',
        sku: product.sku ?? '',
        barcode: product.barcode ?? '',
        unit: product.unit,
        price: product.price,
        costPrice: product.costPrice,
        wholesalePrice: product.wholesalePrice ?? undefined,
        taxRate: product.taxRate,
        stock: product.stock,
        lowStockAlert: product.lowStockAlert,
        categoryId: product.categoryId ?? undefined,
        brandId: product.brandId ?? undefined,
        isActive: product.isActive,
        isFeatured: product.isFeatured,
        expiryTracked: product.expiryTracked,
        tagIds: product.tags?.map((t: any) => t.tag.id) ?? [],
      });
      setOriginalLoaded(true);
    }
  }, [product, originalLoaded]);

  // Sync variant drafts when variants load/refresh
  useEffect(() => {
    const next: Record<string, UpsertVariantPayload> = {};
    variants.forEach((v: any) => {
      next[v.id] = {
        name: v.name,
        sku: v.sku ?? undefined,
        barcode: v.barcode ?? undefined,
        color: v.color ?? undefined,
        colorHex: v.colorHex ?? undefined,
        size: v.size ?? undefined,
        weight: v.weight ?? undefined,
        unit: v.unit ?? undefined,
        price: v.price,
        costPrice: v.costPrice ?? 0,
        wholesalePrice: v.wholesalePrice ?? undefined,
        stock: v.stock ?? 0,
        lowStockAlert: v.lowStockAlert ?? 5,
        imageUrl: v.imageUrl ?? undefined,
        isActive: v.isActive,
        sortOrder: v.sortOrder ?? 0,
      };
    });
    setVariantDrafts(next);
  }, [variants]);

  const updateMutation = useMutation({
    mutationFn: () => productsApi.update(id, form),
    onSuccess: () => {
      Haptics.notificationAsync(Haptics.NotificationFeedbackType.Success);
      Toast.show({ type: 'success', text1: '✅ Updated!' });
      queryClient.invalidateQueries({ queryKey: ['product', id] });
      queryClient.invalidateQueries({ queryKey: ['products'] });
    },
    onError: (e: any) => {
      Haptics.notificationAsync(Haptics.NotificationFeedbackType.Error);
      Toast.show({
        type: 'error',
        text1: e?.response?.data?.message?.[0] || 'Update failed',
      });
    },
  });

  const deleteMutation = useMutation({
    mutationFn: () => productsApi.remove(id),
    onSuccess: () => {
      Haptics.notificationAsync(Haptics.NotificationFeedbackType.Success);
      Toast.show({ type: 'success', text1: 'Product deleted' });
      queryClient.invalidateQueries({ queryKey: ['products'] });
      router.replace('/(tabs)/products');
    },
    onError: () => {
      Toast.show({ type: 'error', text1: 'Delete failed' });
    },
  });

  const addImageMutation = useMutation({
    mutationFn: (payload: { url: string; uploadId?: string; isPrimary?: boolean }) =>
      productImagesApi.add(id, payload),
    onSuccess: () => refetchImages(),
  });

  const setPrimaryMutation = useMutation({
    mutationFn: (imageId: string) => productImagesApi.setPrimary(id, imageId),
    onSuccess: () => {
      Haptics.selectionAsync();
      refetchImages();
      Toast.show({ type: 'success', text1: 'Primary image set' });
    },
  });

  const removeImageMutation = useMutation({
    mutationFn: (imageId: string) => productImagesApi.remove(id, imageId),
    onSuccess: () => {
      refetchImages();
      Toast.show({ type: 'success', text1: 'Image removed' });
    },
  });

  const saveVariantMutation = useMutation({
    mutationFn: ({ variantId, payload }: { variantId: string; payload: UpsertVariantPayload }) =>
      productVariantsApi.update(id, variantId, payload),
    onSuccess: () => {
      Haptics.notificationAsync(Haptics.NotificationFeedbackType.Success);
      refetchVariants();
      Toast.show({ type: 'success', text1: 'Variant updated' });
    },
    onError: (e: any) => {
      Toast.show({
        type: 'error',
        text1: e?.response?.data?.message?.[0] || e?.response?.data?.message || 'Save failed',
      });
    },
  });

  const updateVariantDraft = (variantId: string, patch: Partial<UpsertVariantPayload>) => {
    setVariantDrafts((prev) => ({
      ...prev,
      [variantId]: { ...(prev[variantId] ?? {} as UpsertVariantPayload), ...patch },
    }));
  };

  const handleVariantImageChange = (variantId: string) => {
    setVariantPickerForId(variantId);
    setShowPicker(true);
  };

  const handleVariantSave = (variantId: string) => {
    const draft = variantDrafts[variantId];
    if (!draft?.name?.trim()) {
      Toast.show({ type: 'error', text1: 'Variant name required' });
      return;
    }
    const sanitized: UpsertVariantPayload = {
      name: draft.name.trim(),
      sku: draft.sku?.trim() || undefined,
      barcode: draft.barcode?.trim() || undefined,
      color: draft.color?.trim() || undefined,
      colorHex: draft.colorHex?.trim() || undefined,
      size: draft.size?.trim() || undefined,
      weight: draft.weight === undefined || draft.weight === null ? undefined : Number(draft.weight),
      unit: draft.unit?.trim() || undefined,
      price: Number(draft.price ?? 0),
      costPrice: Number(draft.costPrice ?? 0),
      wholesalePrice:
        draft.wholesalePrice === undefined || draft.wholesalePrice === null
          ? undefined
          : Number(draft.wholesalePrice),
      stock: Number(draft.stock ?? 0),
      lowStockAlert: Number(draft.lowStockAlert ?? 5),
      imageUrl: draft.imageUrl?.trim() || undefined,
      isActive: draft.isActive ?? true,
      sortOrder: Number(draft.sortOrder ?? 0),
    };
    saveVariantMutation.mutate({ variantId, payload: sanitized });
  };

  const bulkVariantsMutation = useMutation({
    mutationFn: (vs: UpsertVariantPayload[]) => productVariantsApi.bulkCreate(id, vs),
    onSuccess: () => {
      Haptics.notificationAsync(Haptics.NotificationFeedbackType.Success);
      refetchVariants();
      Toast.show({ type: 'success', text1: 'Variants generated!' });
    },
  });

  const removeVariantMutation = useMutation({
    mutationFn: (vid: string) => productVariantsApi.remove(id, vid),
    onSuccess: () => refetchVariants(),
  });

  const toggleTag = (tagId: string) => {
    Haptics.selectionAsync();
    setForm((f) => ({
      ...f,
      tagIds: f.tagIds?.includes(tagId)
        ? f.tagIds.filter((t) => t !== tagId)
        : [...(f.tagIds ?? []), tagId],
    }));
  };

  const handleDelete = () => {
    Alert.alert('Delete Product?', 'Ye permanent action hai. Sure?', [
      { text: 'Cancel', style: 'cancel' },
      {
        text: 'Delete',
        style: 'destructive',
        onPress: () => deleteMutation.mutate(),
      },
    ]);
  };

  const handlePickImages = () => {
    Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
    setShowPicker(true);
  };

  const handleUploaded = async (records: any[]) => {
    try {
      // If this upload was triggered for a specific variant, set variant image
      if (variantPickerForId && records.length > 0) {
        const url = records[0].url;
        const draft = variantDrafts[variantPickerForId];
        if (draft) {
          const nextDraft = { ...draft, imageUrl: url };
          setVariantDrafts((prev) => ({ ...prev, [variantPickerForId]: nextDraft }));
          // Auto-save variant with new image
          saveVariantMutation.mutate({
            variantId: variantPickerForId,
            payload: {
              ...nextDraft,
              price: Number(nextDraft.price ?? 0),
              costPrice: Number(nextDraft.costPrice ?? 0),
              stock: Number(nextDraft.stock ?? 0),
              lowStockAlert: Number(nextDraft.lowStockAlert ?? 5),
            },
          });
        }
        setVariantPickerForId(null);
        setShowPicker(false);
        return;
      }

      // Otherwise — regular product images
      for (let i = 0; i < records.length; i++) {
        const r = records[i];
        await addImageMutation.mutateAsync({
          url: r.url,
          uploadId: r.id,
          isPrimary: images.length === 0 && i === 0,
        });
      }
      if (records.length > 0) {
        Toast.show({
          type: 'success',
          text1: `${records.length} image(s) uploaded`,
        });
      }
    } catch (e: any) {
      Toast.show({ type: 'error', text1: e?.message || 'Save failed' });
    } finally {
      setShowPicker(false);
    }
  };

  const confirmRemoveImage = (imageId: string) => {
    Alert.alert('Remove image?', 'Sure?', [
      { text: 'Cancel', style: 'cancel' },
      {
        text: 'Remove',
        style: 'destructive',
        onPress: () => removeImageMutation.mutate(imageId),
      },
    ]);
  };

  const confirmRemoveVariant = (vid: string, name: string) => {
    Alert.alert('Remove variant?', `Remove "${name}"?`, [
      { text: 'Cancel', style: 'cancel' },
      {
        text: 'Remove',
        style: 'destructive',
        onPress: () => removeVariantMutation.mutate(vid),
      },
    ]);
  };

  const currentSection = sections.find((s) => s.id === section)!;
  const profit = (form.price ?? 0) - (form.costPrice ?? 0);
  const margin = (form.price ?? 0) > 0 ? (profit / (form.price ?? 1)) * 100 : 0;

  if (!product || !originalLoaded) {
    return (
      <SafeAreaView className="flex-1 bg-neutral-50 dark:bg-neutral-950 items-center justify-center">
        <Package size={36} color="#9ca3af" />
        <Text className="mt-3 text-neutral-500">Loading...</Text>
      </SafeAreaView>
    );
  }

  return (
    <SafeAreaView className="flex-1 bg-neutral-50 dark:bg-neutral-950" edges={['top']}>
      <Stack.Screen options={{ headerShown: false }} />

      {/* Header */}
      <View className="px-5 pt-3 pb-2 flex-row items-center gap-3">
        <Pressable
          onPress={() => router.back()}
          hitSlop={12}
          className="h-10 w-10 rounded-2xl bg-white dark:bg-neutral-900 items-center justify-center border border-neutral-200 dark:border-neutral-800"
        >
          <ArrowLeft size={20} color="#16a34a" />
        </Pressable>
        <View className="flex-1">
          <Text className="text-xl font-extrabold text-neutral-900 dark:text-white" numberOfLines={1}>
            Edit Product
          </Text>
          <Text className="text-[11px] text-neutral-500" numberOfLines={1}>
            {product.name}
          </Text>
        </View>
        <Pressable
          onPress={handleDelete}
          className="h-10 w-10 rounded-2xl bg-rose-50 dark:bg-rose-950/40 border border-rose-200 dark:border-rose-900/50 items-center justify-center"
        >
          <Trash2 size={18} color="#dc2626" />
        </Pressable>
      </View>

      {/* Section Pills */}
      <View style={{ paddingHorizontal: 20, paddingBottom: 10, paddingTop: 4 }}>
        <ScrollView
          horizontal
          showsHorizontalScrollIndicator={false}
          contentContainerStyle={{ gap: 8, paddingRight: 20 }}
        >
          {sections.map((s) => {
            const Icon = s.icon;
            const active = section === s.id;
            return (
              <Pressable
                key={s.id}
                onPress={() => {
                  Haptics.selectionAsync();
                  setSection(s.id);
                }}
                style={{
                  flexDirection: 'row',
                  alignItems: 'center',
                  gap: 6,
                  paddingHorizontal: 14,
                  height: 38,
                  borderRadius: 999,
                  borderWidth: 2,
                  backgroundColor: active ? s.color : '#ffffff',
                  borderColor: active ? s.color : '#e5e7eb',
                }}
              >
                <Icon size={14} color={active ? '#ffffff' : s.color} />
                <Text
                  style={{
                    fontSize: 13,
                    fontWeight: '700',
                    color: active ? '#ffffff' : '#6b7280',
                  }}
                >
                  {s.label}
                </Text>
              </Pressable>
            );
          })}
        </ScrollView>
      </View>

      <KeyboardAvoidingView
        behavior={Platform.OS === 'ios' ? 'padding' : 'height'}
        className="flex-1"
      >
        <ScrollView
          contentContainerStyle={{ paddingHorizontal: 20, paddingBottom: 100, paddingTop: 4 }}
          keyboardShouldPersistTaps="handled"
          showsVerticalScrollIndicator={false}
        >
          {/* Section Hero */}
          <View
            style={{
              borderRadius: 20,
              padding: 14,
              marginBottom: 16,
              flexDirection: 'row',
              alignItems: 'center',
              gap: 12,
              backgroundColor: currentSection.color,
            }}
          >
            <View
              style={{
                height: 44,
                width: 44,
                borderRadius: 14,
                backgroundColor: 'rgba(255,255,255,0.2)',
                alignItems: 'center',
                justifyContent: 'center',
              }}
            >
              <currentSection.icon size={22} color="#ffffff" />
            </View>
            <View style={{ flex: 1 }}>
              <Text style={{ color: '#ffffff', fontWeight: '800', fontSize: 16 }}>
                Editing: {currentSection.label}
              </Text>
              <Text style={{ color: 'rgba(255,255,255,0.85)', fontSize: 11, marginTop: 2 }}>
                Tap Save Changes neeche to apply
              </Text>
            </View>
          </View>

          {/* BASIC */}
          {section === 'basic' && (
            <View className="gap-4">
              <ThemedInput
                label="Product Name"
                required
                value={form.name ?? ''}
                onChangeText={(t: string) => setForm({ ...form, name: t })}
              />
              <ThemedInput
                label="Short Description"
                value={form.shortDescription ?? ''}
                onChangeText={(t: string) => setForm({ ...form, shortDescription: t })}
              />
              <ThemedInput
                label="Description"
                value={form.description ?? ''}
                onChangeText={(t: string) => setForm({ ...form, description: t })}
                multiline
              />

              {categories.length > 0 && (
                <View>
                  <Text className="text-sm font-bold text-neutral-700 dark:text-neutral-200 mb-2">Category</Text>
                  <ScrollView horizontal showsHorizontalScrollIndicator={false} contentContainerStyle={{ gap: 8, paddingRight: 20 }}>
                    <Pressable
                      onPress={() => setForm({ ...form, categoryId: undefined })}
                      style={{ paddingHorizontal: 14, height: 38, borderRadius: 12, borderWidth: 2, alignItems: 'center', justifyContent: 'center', backgroundColor: !form.categoryId ? '#16a34a' : '#ffffff', borderColor: !form.categoryId ? '#16a34a' : '#e5e7eb' }}
                    >
                      <Text style={{ fontSize: 13, fontWeight: '700', color: !form.categoryId ? '#ffffff' : '#374151' }}>None</Text>
                    </Pressable>
                    {categories.map((c: any) => {
                      const active = form.categoryId === c.id;
                      return (
                        <Pressable
                          key={c.id}
                          onPress={() => setForm({ ...form, categoryId: c.id })}
                          style={{ paddingHorizontal: 14, height: 38, borderRadius: 12, borderWidth: 2, alignItems: 'center', justifyContent: 'center', backgroundColor: active ? c.color || '#16a34a' : '#ffffff', borderColor: active ? c.color || '#16a34a' : '#e5e7eb' }}
                        >
                          <Text style={{ fontSize: 13, fontWeight: '700', color: active ? '#ffffff' : '#374151' }}>{c.name}</Text>
                        </Pressable>
                      );
                    })}
                  </ScrollView>
                </View>
              )}

              {brands.length > 0 && (
                <View>
                  <View className="flex-row items-center gap-1.5 mb-2">
                    <Building2 size={14} color="#8b5cf6" />
                    <Text className="text-sm font-bold text-neutral-700 dark:text-neutral-200">Brand</Text>
                  </View>
                  <ScrollView horizontal showsHorizontalScrollIndicator={false} contentContainerStyle={{ gap: 8, paddingRight: 20 }}>
                    <Pressable
                      onPress={() => setForm({ ...form, brandId: undefined })}
                      style={{ paddingHorizontal: 14, height: 38, borderRadius: 12, borderWidth: 2, alignItems: 'center', justifyContent: 'center', backgroundColor: !form.brandId ? '#7c3aed' : '#ffffff', borderColor: !form.brandId ? '#7c3aed' : '#e5e7eb' }}
                    >
                      <Text style={{ fontSize: 13, fontWeight: '700', color: !form.brandId ? '#ffffff' : '#374151' }}>None</Text>
                    </Pressable>
                    {brands.map((b: any) => {
                      const active = form.brandId === b.id;
                      return (
                        <Pressable
                          key={b.id}
                          onPress={() => setForm({ ...form, brandId: b.id })}
                          style={{ paddingHorizontal: 14, height: 38, borderRadius: 12, borderWidth: 2, alignItems: 'center', justifyContent: 'center', backgroundColor: active ? '#7c3aed' : '#ffffff', borderColor: active ? '#7c3aed' : '#e5e7eb' }}
                        >
                          <Text style={{ fontSize: 13, fontWeight: '700', color: active ? '#ffffff' : '#374151' }}>{b.name}</Text>
                        </Pressable>
                      );
                    })}
                  </ScrollView>
                </View>
              )}

              <View className="flex-row gap-3">
                <View className="flex-1">
                  <ThemedInput label="SKU" value={form.sku ?? ''} onChangeText={(t: string) => setForm({ ...form, sku: t })} autoCapitalize="characters" />
                </View>
                <View className="flex-1">
                  <ThemedInput label="Unit" value={form.unit ?? 'pcs'} onChangeText={(t: string) => setForm({ ...form, unit: t })} />
                </View>
              </View>

              <ThemedInput label="Barcode" value={form.barcode ?? ''} onChangeText={(t: string) => setForm({ ...form, barcode: t })} keyboardType="number-pad" />

              <View className="flex-row gap-2 mt-1">
                <Pressable
                  onPress={() => setForm({ ...form, isActive: !form.isActive })}
                  className="flex-1 flex-row items-center gap-2 px-4 py-3 rounded-2xl border-2"
                  style={{ borderColor: form.isActive ? '#16a34a' : '#e5e7eb', backgroundColor: form.isActive ? '#dcfce7' : '#ffffff' }}
                >
                  {form.isActive ? <Eye size={18} color="#16a34a" /> : <EyeOff size={18} color="#6b7280" />}
                  <Text className="font-bold text-sm flex-1" style={{ color: form.isActive ? '#15803d' : '#6b7280' }}>
                    {form.isActive ? 'Active' : 'Inactive'}
                  </Text>
                </Pressable>
                <Pressable
                  onPress={() => setForm({ ...form, isFeatured: !form.isFeatured })}
                  className="flex-1 flex-row items-center gap-2 px-4 py-3 rounded-2xl border-2"
                  style={{ borderColor: form.isFeatured ? '#f59e0b' : '#e5e7eb', backgroundColor: form.isFeatured ? '#fef3c7' : '#ffffff' }}
                >
                  <Star size={18} color={form.isFeatured ? '#f59e0b' : '#6b7280'} fill={form.isFeatured ? '#f59e0b' : 'none'} />
                  <Text className="font-bold text-sm flex-1" style={{ color: form.isFeatured ? '#b45309' : '#6b7280' }}>
                    {form.isFeatured ? 'Featured' : 'Normal'}
                  </Text>
                </Pressable>
              </View>
            </View>
          )}

          {/* PRICING */}
          {section === 'pricing' && (
            <View className="gap-4">
              <ThemedInput label="Sell Price" required value={String(form.price ?? '')} onChangeText={(t: string) => setForm({ ...form, price: Number(t) || 0 })} keyboardType="numeric" />
              <ThemedInput label="Cost Price" value={String(form.costPrice ?? '')} onChangeText={(t: string) => setForm({ ...form, costPrice: Number(t) || 0 })} keyboardType="numeric" />
              <ThemedInput label="Wholesale Price" value={form.wholesalePrice !== undefined ? String(form.wholesalePrice) : ''} onChangeText={(t: string) => setForm({ ...form, wholesalePrice: t ? Number(t) : undefined })} keyboardType="numeric" />
              <ThemedInput label="Tax Rate (%)" value={String(form.taxRate ?? 0)} onChangeText={(t: string) => setForm({ ...form, taxRate: Number(t) || 0 })} keyboardType="numeric" />

              <View style={{ borderRadius: 20, padding: 18, marginTop: 6, backgroundColor: margin > 30 ? '#16a34a' : margin > 10 ? '#f59e0b' : '#737373' }}>
                <View className="flex-row items-center gap-2 mb-2">
                  <TrendingUp size={16} color="#ffffff" />
                  <Text className="text-xs font-bold uppercase tracking-wider text-white/80">Profit Margin</Text>
                </View>
                <Text className="text-4xl font-extrabold text-white">
                  {(form.price ?? 0) > 0 && form.costPrice ? `${margin.toFixed(1)}%` : '—'}
                </Text>
                <View className="mt-3 pt-3 border-t border-white/20 flex-row items-center justify-between">
                  <View>
                    <Text className="text-[10px] font-bold uppercase tracking-wider text-white/70">Profit per unit</Text>
                    <Text className="text-base font-extrabold text-white mt-0.5">{formatPKRFull(profit)}</Text>
                  </View>
                </View>
              </View>
            </View>
          )}

          {/* INVENTORY */}
          {section === 'inventory' && (
            <View className="gap-4">
              <ThemedInput label="Current Stock" value={String(form.stock ?? 0)} onChangeText={(t: string) => setForm({ ...form, stock: Number(t) || 0 })} keyboardType="numeric" />
              <ThemedInput label="Low Stock Alert" value={String(form.lowStockAlert ?? 5)} onChangeText={(t: string) => setForm({ ...form, lowStockAlert: Number(t) || 5 })} keyboardType="numeric" />

              <Pressable
                onPress={() => setForm({ ...form, expiryTracked: !form.expiryTracked })}
                className="flex-row items-center gap-3 p-4 rounded-2xl border-2"
                style={{ borderColor: form.expiryTracked ? '#f59e0b' : '#e5e7eb', backgroundColor: form.expiryTracked ? '#fef3c7' : '#ffffff' }}
              >
                <View className="h-12 w-12 rounded-2xl items-center justify-center" style={{ backgroundColor: form.expiryTracked ? '#f59e0b' : '#f3f4f6' }}>
                  <Calendar size={22} color={form.expiryTracked ? '#ffffff' : '#6b7280'} />
                </View>
                <View className="flex-1">
                  <Text className="text-base font-bold text-neutral-900 dark:text-white">Track Expiry / Batches</Text>
                  <Text className="text-xs text-neutral-500 mt-0.5">Pharmacy, food, perishables</Text>
                </View>
                <View style={{ height: 28, width: 48, borderRadius: 14, padding: 2, justifyContent: 'center', backgroundColor: form.expiryTracked ? '#f59e0b' : '#d1d5db' }}>
                  <View style={{ height: 24, width: 24, borderRadius: 12, backgroundColor: '#ffffff', transform: [{ translateX: form.expiryTracked ? 20 : 0 }] }} />
                </View>
              </Pressable>
            </View>
          )}

          {/* IMAGES */}
          {section === 'images' && (
            <View className="gap-4">
              <Pressable
                onPress={handlePickImages}
                className="rounded-3xl border-2 border-dashed p-8 items-center"
                style={{ borderColor: '#8b5cf6', backgroundColor: '#f5f3ff' }}
              >
                <View className="h-16 w-16 rounded-3xl bg-violet-200 items-center justify-center">
                  <Upload size={28} color="#7c3aed" />
                </View>
                <Text className="mt-4 text-base font-bold text-violet-900">Add Product Photos</Text>
                <Text className="text-xs text-violet-700 mt-1 text-center">
                  Camera ya Gallery se images add karein
                </Text>
              </Pressable>

              <View>
                <View className="flex-row items-center gap-2 mb-2">
                  <ImageIcon size={16} color="#8b5cf6" />
                  <Text className="text-sm font-bold text-neutral-700 dark:text-neutral-200">
                    Gallery ({images.length})
                  </Text>
                </View>

                {images.length === 0 ? (
                  <View className="rounded-2xl border border-dashed border-neutral-200 bg-white p-6 items-center">
                    <Text className="text-sm text-neutral-500">No images yet</Text>
                  </View>
                ) : (
                  <View className="flex-row flex-wrap" style={{ gap: 10 }}>
                    {images.map((img: any) => (
                      <View
                        key={img.id}
                        style={{ width: '31%', aspectRatio: 1, position: 'relative' }}
                        className="rounded-2xl overflow-hidden border border-neutral-200 bg-white"
                      >
                        <Image source={{ uri: img.url }} style={{ width: '100%', height: '100%' }} resizeMode="cover" />

                        {img.isPrimary && (
                          <View
                            style={{ position: 'absolute', top: 4, left: 4 }}
                            className="px-2 py-0.5 rounded-md flex-row items-center gap-1"
                          >
                            <View style={{ backgroundColor: '#f59e0b', paddingHorizontal: 6, paddingVertical: 2, borderRadius: 6, flexDirection: 'row', alignItems: 'center', gap: 3 }}>
                              <StarFilled size={9} color="#ffffff" fill="#ffffff" />
                              <Text style={{ color: '#ffffff', fontSize: 9, fontWeight: '800' }}>PRIMARY</Text>
                            </View>
                          </View>
                        )}

                        <View style={{ position: 'absolute', bottom: 4, left: 4, right: 4, flexDirection: 'row', gap: 4 }}>
                          {!img.isPrimary && (
                            <Pressable
                              onPress={() => setPrimaryMutation.mutate(img.id)}
                              style={{ flex: 1, height: 26, borderRadius: 6, backgroundColor: 'rgba(245, 158, 11, 0.95)', alignItems: 'center', justifyContent: 'center' }}
                            >
                              <Star size={12} color="#ffffff" />
                            </Pressable>
                          )}
                          <Pressable
                            onPress={() => confirmRemoveImage(img.id)}
                            style={{ flex: 1, height: 26, borderRadius: 6, backgroundColor: 'rgba(220, 38, 38, 0.95)', alignItems: 'center', justifyContent: 'center' }}
                          >
                            <Trash2 size={12} color="#ffffff" />
                          </Pressable>
                        </View>
                      </View>
                    ))}
                  </View>
                )}
              </View>
            </View>
          )}

          {/* VARIANTS */}
          {section === 'variants' && (
            <View className="gap-4">
              <MobileVariantBuilder
                basePrice={form.price ?? 0}
                baseCostPrice={form.costPrice ?? 0}
                onGenerate={(vs) => bulkVariantsMutation.mutate(vs)}
              />

              <View>
                <View className="flex-row items-center gap-2 mb-2">
                  <Layers size={16} color="#ec4899" />
                  <Text className="text-sm font-bold text-neutral-700 dark:text-neutral-200">
                    Existing Variants ({variants.length})
                  </Text>
                </View>

                {variants.length === 0 ? (
                  <View className="rounded-2xl border border-dashed border-neutral-200 bg-white p-6 items-center">
                    <Layers size={24} color="#9ca3af" />
                    <Text className="mt-2 text-sm text-neutral-500">No variants yet</Text>
                    <Text className="text-xs text-neutral-400 mt-0.5">Use builder above to generate</Text>
                  </View>
                ) : (
                  <View className="gap-2.5">
                    {variants.map((v: any) => {
                      const draft = variantDrafts[v.id] ?? {
                        name: v.name,
                        price: v.price,
                        costPrice: v.costPrice ?? 0,
                        stock: v.stock ?? 0,
                        lowStockAlert: v.lowStockAlert ?? 5,
                        isActive: v.isActive,
                        sortOrder: v.sortOrder ?? 0,
                      };
                      const saving =
                        saveVariantMutation.isPending &&
                        saveVariantMutation.variables?.variantId === v.id;
                      const deleting =
                        removeVariantMutation.isPending &&
                        removeVariantMutation.variables === v.id;

                      return (
                        <MobileVariantCard
                          key={v.id}
                          variant={v}
                          draft={draft}
                          parentUnit={product.unit}
                          onUpdate={(patch) => updateVariantDraft(v.id, patch)}
                          onImageChange={() => handleVariantImageChange(v.id)}
                          onSave={() => handleVariantSave(v.id)}
                          onDelete={() => removeVariantMutation.mutate(v.id)}
                          saving={saving}
                          deleting={deleting}
                        />
                      );
                    })}
                  </View>
                )}
              </View>
            </View>
          )}

          {/* TAGS */}
          {section === 'tags' && (
            <View className="gap-4">
              {allTags.length === 0 ? (
                <View className="rounded-3xl border-2 border-dashed border-pink-200 bg-pink-50 p-8 items-center">
                  <Hash size={28} color="#ec4899" />
                  <Text className="mt-4 text-base font-bold text-pink-900">No tags yet</Text>
                </View>
              ) : (
                <>
                  <View className="flex-row items-center gap-2 mb-1">
                    <TagIcon size={14} color="#ec4899" />
                    <Text className="text-sm font-bold text-neutral-700 dark:text-neutral-200">
                      Select tags ({(form.tagIds ?? []).length} selected)
                    </Text>
                  </View>
                  <View className="flex-row flex-wrap gap-2">
                    {allTags.map((tag: any) => {
                      const active = form.tagIds?.includes(tag.id);
                      return (
                        <Pressable
                          key={tag.id}
                          onPress={() => toggleTag(tag.id)}
                          style={{
                            flexDirection: 'row',
                            alignItems: 'center',
                            gap: 6,
                            paddingHorizontal: 12,
                            height: 36,
                            borderRadius: 999,
                            borderWidth: 2,
                            backgroundColor: active ? `${tag.color}20` : '#ffffff',
                            borderColor: active ? tag.color : '#e5e7eb',
                          }}
                        >
                          <View style={{ height: 8, width: 8, borderRadius: 4, backgroundColor: tag.color }} />
                          <Text style={{ fontSize: 13, fontWeight: '700', color: active ? tag.color : '#6b7280' }}>
                            {tag.name}
                          </Text>
                          {active && (
                            <View style={{ height: 18, width: 18, borderRadius: 9, backgroundColor: tag.color, alignItems: 'center', justifyContent: 'center' }}>
                              <Check size={10} color="#ffffff" />
                            </View>
                          )}
                        </Pressable>
                      );
                    })}
                  </View>
                </>
              )}
            </View>
          )}
        </ScrollView>

        {/* Save Button */}
        <View
          className="px-5 py-3 border-t border-neutral-200 dark:border-neutral-800 bg-white dark:bg-neutral-900"
          style={{ shadowColor: '#000', shadowOpacity: 0.05, shadowRadius: 8, shadowOffset: { width: 0, height: -2 }, elevation: 8 }}
        >
          <Pressable
            onPress={() => updateMutation.mutate()}
            disabled={updateMutation.isPending}
            className="h-12 rounded-2xl items-center justify-center flex-row gap-2 active:opacity-80"
            style={{ backgroundColor: updateMutation.isPending ? '#9ca3af' : '#16a34a', shadowColor: '#16a34a', shadowOpacity: 0.4, shadowRadius: 12, elevation: 6 }}
          >
            {updateMutation.isPending ? (
              <Text className="text-white font-extrabold text-base">Saving...</Text>
            ) : (
              <>
                <Save size={20} color="#ffffff" />
                <Text className="text-white font-extrabold text-base">Save Changes</Text>
              </>
            )}
          </Pressable>
        </View>
      </KeyboardAvoidingView>
    <ImagePickerSheet
        visible={showPicker}
        onClose={() => setShowPicker(false)}
        purpose="product-image"
        multiple={true}
        title="Product Photos"
        onUploaded={handleUploaded}
      />
    </SafeAreaView>
  );
}
