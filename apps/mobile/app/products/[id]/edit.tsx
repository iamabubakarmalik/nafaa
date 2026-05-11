import { useEffect, useState } from 'react';
import {
  View, Text, ScrollView, Pressable, KeyboardAvoidingView, Platform,
  TextInput, Alert,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { useLocalSearchParams, useRouter, Stack } from 'expo-router';
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import * as Haptics from 'expo-haptics';
import {
  ArrowLeft, Save, Star, Eye, EyeOff, Package, DollarSign, Boxes, Hash,
  Check, Sparkles, TrendingUp, AlertTriangle, Calendar, Tag as TagIcon,
  Building2, Trash2, ImageIcon, Layers,
} from 'lucide-react-native';
import { productsApi, type UpdateProductPayload } from '@/api/products.api';
import { brandsApi } from '@/api/brands.api';
import { categoriesApi } from '@/api/categories.api';
import { tagsApi } from '@/api/tags.api';
import { formatPKRFull } from '@/lib/format';
import Toast from 'react-native-toast-message';

import { useTranslation } from '@/i18n/useTranslation';
type Section = 'basic' | 'pricing' | 'inventory' | 'tags' | 'media';

const sections: {
  id: Section;
  label: string;
  icon: any;
  color: string;
}[] = [
  { id: 'basic', label: 'Basic', icon: Package, color: '#16a34a' },
  { id: 'pricing', label: 'Price', icon: DollarSign, color: '#2563eb' },
  { id: 'inventory', label: 'Stock', icon: Boxes, color: '#f59e0b' },
  { id: 'tags', label: 'Tags', icon: Hash, color: '#ec4899' },
  { id: 'media', label: 'Media', icon: ImageIcon, color: '#8b5cf6' },
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

  // Load product data into form
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

  const updateMutation = useMutation({
    mutationFn: () => productsApi.update(id, form),
    onSuccess: () => {
      Haptics.notificationAsync(Haptics.NotificationFeedbackType.Success);
      Toast.show({ type: 'success', text1: '✅ Updated!' });
      queryClient.invalidateQueries({ queryKey: ['product', id] });
      queryClient.invalidateQueries({ queryKey: ['products'] });
      router.back();
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

  const currentSection = sections.find((s) => s.id === section)!;
  const profit = (form.price ?? 0) - (form.costPrice ?? 0);
  const margin = (form.price ?? 0) > 0 ? (profit / (form.price ?? 1)) * 100 : 0;

  if (!product || !originalLoaded) {
    return (
      <SafeAreaView className="flex-1 bg-neutral-50 dark:bg-neutral-950 items-center justify-center">
        <Package size={36} color="#9ca3af" />
        <Text className="mt-3 text-neutral-500">{t('auto.section.loading')}</Text>
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
          <Text className="text-xl font-extrabold text-neutral-900 dark:text-white" numberOfLines={1}>{t('auto.edit.edit_product')}</Text>
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
              <Text style={{ color: 'rgba(255,255,255,0.85)', fontSize: 11, marginTop: 2 }}>{t('auto.edit.tap_save_changes_niche_to_apply')}</Text>
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
                onChangeText={(t: string) =>
                  setForm({ ...form, shortDescription: t })
                }
              />
              <ThemedInput
                label="Description"
                value={form.description ?? ''}
                onChangeText={(t: string) => setForm({ ...form, description: t })}
                multiline
              />

              {categories.length > 0 && (
                <View>
                  <Text className="text-sm font-bold text-neutral-700 dark:text-neutral-200 mb-2">{t('auto.new.category')}</Text>
                  <ScrollView
                    horizontal
                    showsHorizontalScrollIndicator={false}
                    contentContainerStyle={{ gap: 8, paddingRight: 20 }}
                  >
                    <Pressable
                      onPress={() => setForm({ ...form, categoryId: undefined })}
                      style={{
                        paddingHorizontal: 14,
                        height: 38,
                        borderRadius: 12,
                        borderWidth: 2,
                        alignItems: 'center',
                        justifyContent: 'center',
                        backgroundColor: !form.categoryId ? '#16a34a' : '#ffffff',
                        borderColor: !form.categoryId ? '#16a34a' : '#e5e7eb',
                      }}
                    >
                      <Text
                        style={{
                          fontSize: 13,
                          fontWeight: '700',
                          color: !form.categoryId ? '#ffffff' : '#374151',
                        }}
                      >{t('auto.new.none')}</Text>
                    </Pressable>
                    {categories.map((c) => {
                      const active = form.categoryId === c.id;
                      return (
                        <Pressable
                          key={c.id}
                          onPress={() => setForm({ ...form, categoryId: c.id })}
                          style={{
                            paddingHorizontal: 14,
                            height: 38,
                            borderRadius: 12,
                            borderWidth: 2,
                            alignItems: 'center',
                            justifyContent: 'center',
                            backgroundColor: active ? c.color || '#16a34a' : '#ffffff',
                            borderColor: active ? c.color || '#16a34a' : '#e5e7eb',
                          }}
                        >
                          <Text
                            style={{
                              fontSize: 13,
                              fontWeight: '700',
                              color: active ? '#ffffff' : '#374151',
                            }}
                          >
                            {c.name}
                          </Text>
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
                    <Text className="text-sm font-bold text-neutral-700 dark:text-neutral-200">{t('auto.new.brand')}</Text>
                  </View>
                  <ScrollView
                    horizontal
                    showsHorizontalScrollIndicator={false}
                    contentContainerStyle={{ gap: 8, paddingRight: 20 }}
                  >
                    <Pressable
                      onPress={() => setForm({ ...form, brandId: undefined })}
                      style={{
                        paddingHorizontal: 14,
                        height: 38,
                        borderRadius: 12,
                        borderWidth: 2,
                        alignItems: 'center',
                        justifyContent: 'center',
                        backgroundColor: !form.brandId ? '#7c3aed' : '#ffffff',
                        borderColor: !form.brandId ? '#7c3aed' : '#e5e7eb',
                      }}
                    >
                      <Text
                        style={{
                          fontSize: 13,
                          fontWeight: '700',
                          color: !form.brandId ? '#ffffff' : '#374151',
                        }}
                      >{t('auto.new.none')}</Text>
                    </Pressable>
                    {brands.map((b) => {
                      const active = form.brandId === b.id;
                      return (
                        <Pressable
                          key={b.id}
                          onPress={() => setForm({ ...form, brandId: b.id })}
                          style={{
                            paddingHorizontal: 14,
                            height: 38,
                            borderRadius: 12,
                            borderWidth: 2,
                            alignItems: 'center',
                            justifyContent: 'center',
                            backgroundColor: active ? '#7c3aed' : '#ffffff',
                            borderColor: active ? '#7c3aed' : '#e5e7eb',
                          }}
                        >
                          <Text
                            style={{
                              fontSize: 13,
                              fontWeight: '700',
                              color: active ? '#ffffff' : '#374151',
                            }}
                          >
                            {b.name}
                          </Text>
                        </Pressable>
                      );
                    })}
                  </ScrollView>
                </View>
              )}

              <View className="flex-row gap-3">
                <View className="flex-1">
                  <ThemedInput
                    label="SKU"
                    value={form.sku ?? ''}
                    onChangeText={(t: string) => setForm({ ...form, sku: t })}
                    autoCapitalize="characters"
                  />
                </View>
                <View className="flex-1">
                  <ThemedInput
                    label="Unit"
                    value={form.unit ?? 'pcs'}
                    onChangeText={(t: string) => setForm({ ...form, unit: t })}
                  />
                </View>
              </View>

              <ThemedInput
                label="Barcode"
                value={form.barcode ?? ''}
                onChangeText={(t: string) => setForm({ ...form, barcode: t })}
                keyboardType="number-pad"
              />

              <View className="flex-row gap-2 mt-1">
                <Pressable
                  onPress={() => setForm({ ...form, isActive: !form.isActive })}
                  className="flex-1 flex-row items-center gap-2 px-4 py-3 rounded-2xl border-2"
                  style={{
                    borderColor: form.isActive ? '#16a34a' : '#e5e7eb',
                    backgroundColor: form.isActive ? '#dcfce7' : '#ffffff',
                  }}
                >
                  {form.isActive ? (
                    <Eye size={18} color="#16a34a" />
                  ) : (
                    <EyeOff size={18} color="#6b7280" />
                  )}
                  <Text
                    className="font-bold text-sm flex-1"
                    style={{ color: form.isActive ? '#15803d' : '#6b7280' }}
                  >
                    {form.isActive ? 'Active' : 'Inactive'}
                  </Text>
                </Pressable>
                <Pressable
                  onPress={() => setForm({ ...form, isFeatured: !form.isFeatured })}
                  className="flex-1 flex-row items-center gap-2 px-4 py-3 rounded-2xl border-2"
                  style={{
                    borderColor: form.isFeatured ? '#f59e0b' : '#e5e7eb',
                    backgroundColor: form.isFeatured ? '#fef3c7' : '#ffffff',
                  }}
                >
                  <Star
                    size={18}
                    color={form.isFeatured ? '#f59e0b' : '#6b7280'}
                    fill={form.isFeatured ? '#f59e0b' : 'none'}
                  />
                  <Text
                    className="font-bold text-sm flex-1"
                    style={{ color: form.isFeatured ? '#b45309' : '#6b7280' }}
                  >
                    {form.isFeatured ? 'Featured' : 'Normal'}
                  </Text>
                </Pressable>
              </View>
            </View>
          )}

          {/* PRICING */}
          {section === 'pricing' && (
            <View className="gap-4">
              <ThemedInput
                label="Sell Price"
                required
                value={String(form.price ?? '')}
                onChangeText={(t: string) =>
                  setForm({ ...form, price: Number(t) || 0 })
                }
                keyboardType="numeric"
              />
              <ThemedInput
                label="Cost Price"
                value={String(form.costPrice ?? '')}
                onChangeText={(t: string) =>
                  setForm({ ...form, costPrice: Number(t) || 0 })
                }
                keyboardType="numeric"
              />
              <ThemedInput
                label="Wholesale Price"
                value={form.wholesalePrice !== undefined ? String(form.wholesalePrice) : ''}
                onChangeText={(t: string) =>
                  setForm({ ...form, wholesalePrice: t ? Number(t) : undefined })
                }
                keyboardType="numeric"
              />
              <ThemedInput
                label="Tax Rate (%)"
                value={String(form.taxRate ?? 0)}
                onChangeText={(t: string) =>
                  setForm({ ...form, taxRate: Number(t) || 0 })
                }
                keyboardType="numeric"
              />

              <View
                style={{
                  borderRadius: 20,
                  padding: 18,
                  marginTop: 6,
                  backgroundColor:
                    margin > 30 ? '#16a34a' : margin > 10 ? '#f59e0b' : '#737373',
                }}
              >
                <View className="flex-row items-center gap-2 mb-2">
                  <TrendingUp size={16} color="#ffffff" />
                  <Text className="text-xs font-bold uppercase tracking-wider text-white/80">{t('auto.new.profit_margin')}</Text>
                </View>
                <Text className="text-4xl font-extrabold text-white">
                  {(form.price ?? 0) > 0 && form.costPrice
                    ? `${margin.toFixed(1)}%`
                    : '—'}
                </Text>
                <View className="mt-3 pt-3 border-t border-white/20 flex-row items-center justify-between">
                  <View>
                    <Text className="text-[10px] font-bold uppercase tracking-wider text-white/70">{t('auto.new.profit_per_unit')}</Text>
                    <Text className="text-base font-extrabold text-white mt-0.5">
                      {formatPKRFull(profit)}
                    </Text>
                  </View>
                </View>
              </View>
            </View>
          )}

          {/* INVENTORY */}
          {section === 'inventory' && (
            <View className="gap-4">
              <ThemedInput
                label="Current Stock"
                value={String(form.stock ?? 0)}
                onChangeText={(t: string) =>
                  setForm({ ...form, stock: Number(t) || 0 })
                }
                keyboardType="numeric"
              />
              <ThemedInput
                label="Low Stock Alert"
                value={String(form.lowStockAlert ?? 5)}
                onChangeText={(t: string) =>
                  setForm({ ...form, lowStockAlert: Number(t) || 5 })
                }
                keyboardType="numeric"
              />

              <Pressable
                onPress={() =>
                  setForm({ ...form, expiryTracked: !form.expiryTracked })
                }
                className="flex-row items-center gap-3 p-4 rounded-2xl border-2"
                style={{
                  borderColor: form.expiryTracked ? '#f59e0b' : '#e5e7eb',
                  backgroundColor: form.expiryTracked ? '#fef3c7' : '#ffffff',
                }}
              >
                <View
                  className="h-12 w-12 rounded-2xl items-center justify-center"
                  style={{
                    backgroundColor: form.expiryTracked ? '#f59e0b' : '#f3f4f6',
                  }}
                >
                  <Calendar
                    size={22}
                    color={form.expiryTracked ? '#ffffff' : '#6b7280'}
                  />
                </View>
                <View className="flex-1">
                  <Text className="text-base font-bold text-neutral-900 dark:text-white">{t('auto.new.track_expiry_batches')}</Text>
                  <Text className="text-xs text-neutral-500 mt-0.5">{t('auto.edit.pharmacy_food_perishables')}</Text>
                </View>
                <View
                  style={{
                    height: 28,
                    width: 48,
                    borderRadius: 14,
                    padding: 2,
                    justifyContent: 'center',
                    backgroundColor: form.expiryTracked ? '#f59e0b' : '#d1d5db',
                  }}
                >
                  <View
                    style={{
                      height: 24,
                      width: 24,
                      borderRadius: 12,
                      backgroundColor: '#ffffff',
                      transform: [{ translateX: form.expiryTracked ? 20 : 0 }],
                    }}
                  />
                </View>
              </Pressable>
            </View>
          )}

          {/* TAGS */}
          {section === 'tags' && (
            <View className="gap-4">
              {allTags.length === 0 ? (
                <View className="rounded-3xl border-2 border-dashed border-pink-200 bg-pink-50 p-8 items-center">
                  <Hash size={28} color="#ec4899" />
                  <Text className="mt-4 text-base font-bold text-pink-900">{t('auto.index.no_tags_yet')}</Text>
                  <Pressable
                    onPress={() => router.push('/tags')}
                    className="mt-4 px-5 py-2.5 rounded-xl"
                    style={{ backgroundColor: '#ec4899' }}
                  >
                    <Text className="text-white font-bold text-sm">{t('auto.new.create_tags')}</Text>
                  </Pressable>
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
                    {allTags.map((t) => {
                      const active = form.tagIds?.includes(t.id);
                      return (
                        <Pressable
                          key={t.id}
                          onPress={() => toggleTag(t.id)}
                          style={{
                            flexDirection: 'row',
                            alignItems: 'center',
                            gap: 6,
                            paddingHorizontal: 12,
                            height: 36,
                            borderRadius: 999,
                            borderWidth: 2,
                            backgroundColor: active ? `${t.color}20` : '#ffffff',
                            borderColor: active ? t.color : '#e5e7eb',
                          }}
                        >
                          <View
                            style={{
                              height: 8,
                              width: 8,
                              borderRadius: 4,
                              backgroundColor: t.color,
                            }}
                          />
                          <Text
                            style={{
                              fontSize: 13,
                              fontWeight: '700',
                              color: active ? t.color : '#6b7280',
                            }}
                          >
                            {t.name}
                          </Text>
                          {active && (
                            <View
                              style={{
                                height: 18,
                                width: 18,
                                borderRadius: 9,
                                backgroundColor: t.color,
                                alignItems: 'center',
                                justifyContent: 'center',
                              }}
                            >
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

          {/* MEDIA */}
          {section === 'media' && (
            <View className="gap-4">
              <View className="rounded-3xl border-2 border-dashed border-violet-200 bg-violet-50 p-8 items-center">
                <View className="h-16 w-16 rounded-3xl bg-violet-100 items-center justify-center">
                  <ImageIcon size={28} color="#8b5cf6" />
                </View>
                <Text className="mt-4 text-base font-bold text-violet-900">{t('auto.edit.image_management')}</Text>
                <Text className="text-xs text-violet-700 mt-1 text-center">{t('auto.edit.images_aur_variants_ke_liye_full_editor_')}</Text>
                <Text className="mt-3 text-[11px] text-neutral-500 text-center">
                  Current: {product.images?.length ?? 0} images, {product.variants?.length ?? 0} variants
                </Text>
              </View>

              {(product.variants?.length ?? 0) > 0 && (
                <View>
                  <View className="flex-row items-center gap-2 mb-2">
                    <Layers size={16} color="#8b5cf6" />
                    <Text className="text-sm font-bold text-neutral-700 dark:text-neutral-200">
                      Existing Variants ({product.variants?.length})
                    </Text>
                  </View>
                  <View className="gap-2">
                    {product.variants?.map((v: any) => (
                      <View
                        key={v.id}
                        className="rounded-2xl bg-white border border-neutral-200 p-3 flex-row items-center gap-3"
                      >
                        {v.colorHex ? (
                          <View
                            className="h-10 w-10 rounded-xl border-2 border-neutral-200"
                            style={{ backgroundColor: v.colorHex }}
                          />
                        ) : (
                          <View className="h-10 w-10 rounded-xl bg-violet-100 items-center justify-center">
                            <Layers size={16} color="#8b5cf6" />
                          </View>
                        )}
                        <View className="flex-1">
                          <Text className="font-bold text-neutral-900">
                            {v.name}
                          </Text>
                          <Text className="text-xs text-neutral-500 mt-0.5">
                            {formatPKRFull(v.price)} • {v.stock} {v.unit || product.unit}
                          </Text>
                        </View>
                      </View>
                    ))}
                  </View>
                </View>
              )}
            </View>
          )}
        </ScrollView>

        {/* Save Button */}
        <View
          className="px-5 py-3 border-t border-neutral-200 dark:border-neutral-800 bg-white dark:bg-neutral-900"
          style={{
            shadowColor: '#000',
            shadowOpacity: 0.05,
            shadowRadius: 8,
            shadowOffset: { width: 0, height: -2 },
            elevation: 8,
          }}
        >
          <Pressable
            onPress={() => updateMutation.mutate()}
            disabled={updateMutation.isPending}
            className="h-12 rounded-2xl items-center justify-center flex-row gap-2 active:opacity-80"
            style={{
              backgroundColor: updateMutation.isPending ? '#9ca3af' : '#16a34a',
              shadowColor: '#16a34a',
              shadowOpacity: 0.4,
              shadowRadius: 12,
              elevation: 6,
            }}
          >
            {updateMutation.isPending ? (
              <Text className="text-white font-extrabold text-base">{t('auto.edit.saving')}</Text>
            ) : (
              <>
                <Save size={20} color="#ffffff" />
                <Text className="text-white font-extrabold text-base">{t('auto.edit.save_changes')}</Text>
              </>
            )}
          </Pressable>
        </View>
      </KeyboardAvoidingView>
    </SafeAreaView>
  );
}
