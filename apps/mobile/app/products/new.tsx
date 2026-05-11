import { useState } from 'react';
import {
  View, Text, ScrollView, Pressable, KeyboardAvoidingView, Platform,
  TextInput,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { useRouter, Stack } from 'expo-router';
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import * as Haptics from 'expo-haptics';
import {
  ArrowLeft, Save, Star, Eye, EyeOff, Package, DollarSign, Boxes, Hash,
  Check, ChevronRight, ChevronLeft, Sparkles, TrendingUp, AlertTriangle,
  Calendar, Tag as TagIcon, Building2,
} from 'lucide-react-native';
import { productsApi, type CreateProductPayload } from '@/api/products.api';
import { brandsApi } from '@/api/brands.api';
import { categoriesApi } from '@/api/categories.api';
import { tagsApi } from '@/api/tags.api';
import { formatPKRFull } from '@/lib/format';
import Toast from 'react-native-toast-message';

import { useTranslation } from '@/i18n/useTranslation';
type Step = 'basic' | 'pricing' | 'inventory' | 'tags';

const steps: {
  id: Step;
  label: string;
  icon: any;
  color: string;
  description: string;
}[] = [
  {
    id: 'basic',
    label: 'Basic',
    icon: Package,
    color: '#16a34a',
    description: 'Name, category, brand & SKU',
  },
  {
    id: 'pricing',
    label: 'Price',
    icon: DollarSign,
    color: '#2563eb',
    description: 'Sell, cost & profit margin',
  },
  {
    id: 'inventory',
    label: 'Stock',
    icon: Boxes,
    color: '#f59e0b',
    description: 'Stock & expiry tracking',
  },
  {
    id: 'tags',
    label: 'Tags',
    icon: Hash,
    color: '#ec4899',
    description: 'Labels & finishing',
  },
];

const empty: CreateProductPayload = {
  name: '',
  description: '',
  shortDescription: '',
  unit: 'pcs',
  price: 0,
  costPrice: 0,
  stock: 0,
  lowStockAlert: 5,
  taxRate: 0,
  isActive: true,
  isFeatured: false,
  expiryTracked: false,
  tagIds: [],
};

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

export default function NewProductScreen() {
  const { t } = useTranslation();
  const router = useRouter();
  const queryClient = useQueryClient();

  const [step, setStep] = useState<Step>('basic');
  const [form, setForm] = useState<CreateProductPayload>(empty);

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

  const createMutation = useMutation({
    mutationFn: () => productsApi.create(form),
    onSuccess: (saved) => {
      Haptics.notificationAsync(Haptics.NotificationFeedbackType.Success);
      Toast.show({
        type: 'success',
        text1: '✅ Product Created!',
        text2: 'Now add images & variants',
      });
      queryClient.invalidateQueries({ queryKey: ['products'] });
      router.replace(`/products/${saved.id}/edit`);
    },
    onError: (e: any) => {
      Haptics.notificationAsync(Haptics.NotificationFeedbackType.Error);
      Toast.show({
        type: 'error',
        text1: e?.response?.data?.message?.[0] || e?.response?.data?.message || 'Failed',
      });
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

  const stepIndex = steps.findIndex((s) => s.id === step);
  const currentStep = steps[stepIndex];
  const progress = ((stepIndex + 1) / steps.length) * 100;

  const profit = form.price - (form.costPrice ?? 0);
  const margin = form.price > 0 ? (profit / form.price) * 100 : 0;

  const isStepValid = () => {
    if (step === 'basic') return form.name.trim().length > 0;
    if (step === 'pricing') return form.price > 0;
    return true;
  };

  const goNext = () => {
    if (!isStepValid()) {
      Haptics.notificationAsync(Haptics.NotificationFeedbackType.Warning);
      if (step === 'basic') Toast.show({ type: 'error', text1: 'Product name required' });
      if (step === 'pricing') Toast.show({ type: 'error', text1: 'Sell price required' });
      return;
    }
    Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
    if (stepIndex < steps.length - 1) {
      setStep(steps[stepIndex + 1].id);
    }
  };

  const goPrev = () => {
    Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
    if (stepIndex > 0) setStep(steps[stepIndex - 1].id);
  };

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
          <Text className="text-xl font-extrabold text-neutral-900 dark:text-white">{t('auto.new.new_product')}</Text>
          <View className="flex-row items-center gap-1.5 mt-0.5">
            <Sparkles size={10} color="#f59e0b" />
            <Text className="text-[11px] text-neutral-500">
              Step {stepIndex + 1} of {steps.length} • {currentStep.description}
            </Text>
          </View>
        </View>
      </View>

      {/* Progress Bar */}
      <View className="px-5 pb-2">
        <View className="h-1.5 rounded-full bg-neutral-200 dark:bg-neutral-800 overflow-hidden">
          <View
            className="h-full rounded-full"
            style={{
              width: `${progress}%`,
              backgroundColor: currentStep.color,
            }}
          />
        </View>
      </View>

      {/* COMPACT Step Pills — fixed height, no flex-grow */}
      <View style={{ paddingHorizontal: 20, paddingBottom: 10 }}>
        <ScrollView
          horizontal
          showsHorizontalScrollIndicator={false}
          contentContainerStyle={{ gap: 8, paddingRight: 20 }}
        >
          {steps.map((s, idx) => {
            const Icon = s.icon;
            const active = step === s.id;
            const completed = idx < stepIndex;
            return (
              <Pressable
                key={s.id}
                onPress={() => {
                  Haptics.selectionAsync();
                  setStep(s.id);
                }}
                style={{
                  flexDirection: 'row',
                  alignItems: 'center',
                  gap: 6,
                  paddingHorizontal: 14,
                  height: 38,
                  borderRadius: 999,
                  borderWidth: 2,
                  backgroundColor: active
                    ? s.color
                    : completed
                    ? `${s.color}15`
                    : '#ffffff',
                  borderColor: active ? s.color : completed ? s.color : '#e5e7eb',
                }}
              >
                {completed ? (
                  <View
                    style={{
                      height: 18,
                      width: 18,
                      borderRadius: 9,
                      backgroundColor: s.color,
                      alignItems: 'center',
                      justifyContent: 'center',
                    }}
                  >
                    <Check size={11} color="#ffffff" />
                  </View>
                ) : (
                  <Icon size={14} color={active ? '#ffffff' : s.color} />
                )}
                <Text
                  style={{
                    fontSize: 13,
                    fontWeight: '700',
                    color: active ? '#ffffff' : completed ? s.color : '#6b7280',
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
          {/* Step Hero — compact */}
          <View
            style={{
              borderRadius: 20,
              padding: 14,
              marginBottom: 16,
              flexDirection: 'row',
              alignItems: 'center',
              gap: 12,
              backgroundColor: currentStep.color,
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
              <currentStep.icon size={22} color="#ffffff" />
            </View>
            <View style={{ flex: 1 }}>
              <Text style={{ color: '#ffffff', fontWeight: '800', fontSize: 16 }}>
                {currentStep.label === 'Basic'
                  ? 'Basic Info'
                  : currentStep.label === 'Price'
                  ? 'Pricing'
                  : currentStep.label === 'Stock'
                  ? 'Inventory'
                  : 'Tags'}
              </Text>
              <Text style={{ color: 'rgba(255,255,255,0.85)', fontSize: 11, marginTop: 2 }}>
                {currentStep.description}
              </Text>
            </View>
          </View>

          {/* STEP: BASIC */}
          {step === 'basic' && (
            <View className="gap-4">
              <ThemedInput
                label="Product Name"
                required
                value={form.name}
                onChangeText={(t: string) => setForm({ ...form, name: t })}
                placeholder="e.g. Basmati Rice 5kg"
              />

              <ThemedInput
                label="Short Description"
                value={form.shortDescription ?? ''}
                onChangeText={(t: string) =>
                  setForm({ ...form, shortDescription: t })
                }
                placeholder="One-liner for product listing"
              />

              {/* Category */}
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
                          onPress={() => {
                            Haptics.selectionAsync();
                            setForm({ ...form, categoryId: c.id });
                          }}
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

              {/* Brand */}
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
                          onPress={() => {
                            Haptics.selectionAsync();
                            setForm({ ...form, brandId: b.id });
                          }}
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
                    placeholder="ABC-001"
                  />
                </View>
                <View className="flex-1">
                  <ThemedInput
                    label="Unit"
                    value={form.unit ?? 'pcs'}
                    onChangeText={(t: string) => setForm({ ...form, unit: t })}
                    placeholder="pcs"
                  />
                </View>
              </View>

              <ThemedInput
                label="Barcode"
                value={form.barcode ?? ''}
                onChangeText={(t: string) => setForm({ ...form, barcode: t })}
                keyboardType="number-pad"
                placeholder="1234567890123"
              />

              <View className="flex-row gap-2 mt-1">
                <Pressable
                  onPress={() => {
                    Haptics.selectionAsync();
                    setForm({ ...form, isActive: !form.isActive });
                  }}
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
                  onPress={() => {
                    Haptics.selectionAsync();
                    setForm({ ...form, isFeatured: !form.isFeatured });
                  }}
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

          {/* STEP: PRICING */}
          {step === 'pricing' && (
            <View className="gap-4">
              <ThemedInput
                label="Sell Price"
                required
                value={form.price > 0 ? String(form.price) : ''}
                onChangeText={(t: string) =>
                  setForm({ ...form, price: Number(t) || 0 })
                }
                keyboardType="numeric"
                placeholder="0"
                hint="Customer ko kitne ka bechna hai"
              />

              <ThemedInput
                label="Cost Price"
                value={form.costPrice && form.costPrice > 0 ? String(form.costPrice) : ''}
                onChangeText={(t: string) =>
                  setForm({ ...form, costPrice: Number(t) || 0 })
                }
                keyboardType="numeric"
                placeholder="0"
                hint="Aap ne kitne ka khareeda hai"
              />

              <ThemedInput
                label="Wholesale Price"
                value={form.wholesalePrice !== undefined ? String(form.wholesalePrice) : ''}
                onChangeText={(t: string) =>
                  setForm({ ...form, wholesalePrice: t ? Number(t) : undefined })
                }
                keyboardType="numeric"
                placeholder="Optional"
                hint="Bulk sale ke liye"
              />

              <ThemedInput
                label="Tax Rate (%)"
                value={form.taxRate && form.taxRate > 0 ? String(form.taxRate) : ''}
                onChangeText={(t: string) =>
                  setForm({ ...form, taxRate: Number(t) || 0 })
                }
                keyboardType="numeric"
                placeholder="0"
                hint="GST/Sales tax %"
              />

              {/* Profit Card */}
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
                  {form.price > 0 && form.costPrice
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
                  <View className="items-end">
                    <Text className="text-[10px] font-bold uppercase tracking-wider text-white/70">{t('auto.new.sell_cost')}</Text>
                    <Text className="text-xs text-white/90 mt-0.5">
                      {formatPKRFull(form.price)} - {formatPKRFull(form.costPrice ?? 0)}
                    </Text>
                  </View>
                </View>
              </View>
            </View>
          )}

          {/* STEP: INVENTORY */}
          {step === 'inventory' && (
            <View className="gap-4">
              <ThemedInput
                label="Initial Stock"
                value={form.stock !== undefined ? String(form.stock) : '0'}
                onChangeText={(t: string) =>
                  setForm({ ...form, stock: Number(t) || 0 })
                }
                keyboardType="numeric"
                placeholder="0"
                hint={`Kitne ${form.unit ?? 'units'} aap ke paas hain abhi?`}
              />

              <ThemedInput
                label="Low Stock Alert"
                value={String(form.lowStockAlert ?? 5)}
                onChangeText={(t: string) =>
                  setForm({ ...form, lowStockAlert: Number(t) || 5 })
                }
                keyboardType="numeric"
                placeholder="5"
                hint="Notification jab stock is se neeche jaaye"
              />

              {(form.stock ?? 0) > 0 && (
                <View
                  className="rounded-2xl p-4 flex-row items-center gap-3"
                  style={{
                    backgroundColor:
                      (form.stock ?? 0) > (form.lowStockAlert ?? 5)
                        ? '#dcfce7'
                        : '#fef3c7',
                  }}
                >
                  <View
                    className="h-12 w-12 rounded-2xl items-center justify-center"
                    style={{
                      backgroundColor:
                        (form.stock ?? 0) > (form.lowStockAlert ?? 5)
                          ? '#16a34a'
                          : '#f59e0b',
                    }}
                  >
                    {(form.stock ?? 0) > (form.lowStockAlert ?? 5) ? (
                      <Boxes size={22} color="#ffffff" />
                    ) : (
                      <AlertTriangle size={22} color="#ffffff" />
                    )}
                  </View>
                  <View className="flex-1">
                    <Text
                      className="text-xs font-bold uppercase tracking-wider"
                      style={{
                        color:
                          (form.stock ?? 0) > (form.lowStockAlert ?? 5)
                            ? '#15803d'
                            : '#b45309',
                      }}
                    >
                      Status
                    </Text>
                    <Text
                      className="text-sm font-extrabold mt-0.5"
                      style={{
                        color:
                          (form.stock ?? 0) > (form.lowStockAlert ?? 5)
                            ? '#15803d'
                            : '#b45309',
                      }}
                    >
                      {(form.stock ?? 0) > (form.lowStockAlert ?? 5)
                        ? `Healthy stock — ${form.stock} ${form.unit}`
                        : `Low stock — only ${form.stock} ${form.unit}`}
                    </Text>
                  </View>
                </View>
              )}

              <Pressable
                onPress={() => {
                  Haptics.selectionAsync();
                  setForm({ ...form, expiryTracked: !form.expiryTracked });
                }}
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
                  <Calendar size={22} color={form.expiryTracked ? '#ffffff' : '#6b7280'} />
                </View>
                <View className="flex-1">
                  <Text className="text-base font-bold text-neutral-900 dark:text-white">{t('auto.new.track_expiry_batches')}</Text>
                  <Text className="text-xs text-neutral-500 mt-0.5">{t('auto.new.pharmacy_food_medicine_perishables')}</Text>
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

          {/* STEP: TAGS */}
          {step === 'tags' && (
            <View className="gap-4">
              {allTags.length === 0 ? (
                <View className="rounded-3xl border-2 border-dashed border-pink-200 dark:border-pink-900/50 bg-pink-50 dark:bg-pink-950/20 p-8 items-center">
                  <View className="h-16 w-16 rounded-3xl bg-pink-100 dark:bg-pink-950/40 items-center justify-center">
                    <Hash size={28} color="#ec4899" />
                  </View>
                  <Text className="mt-4 text-base font-bold text-pink-900 dark:text-pink-200">{t('auto.index.no_tags_yet')}</Text>
                  <Text className="text-xs text-pink-700 dark:text-pink-400 mt-1 text-center">{t('auto.new.tags_help_you_organize_products')}</Text>
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

              {/* Final Summary */}
              <View
                style={{ borderRadius: 20, padding: 18, marginTop: 8, backgroundColor: '#16a34a' }}
              >
                <View className="flex-row items-center gap-2 mb-3">
                  <Check size={18} color="#ffffff" />
                  <Text className="text-white font-extrabold text-sm uppercase tracking-wider">{t('auto.new.ready_to_create')}</Text>
                </View>
                <View className="gap-2">
                  <View className="flex-row justify-between">
                    <Text className="text-white/80 text-sm">{t('auto.new.name')}</Text>
                    <Text
                      className="text-white font-bold text-sm"
                      numberOfLines={1}
                      style={{ maxWidth: 200 }}
                    >
                      {form.name || '—'}
                    </Text>
                  </View>
                  <View className="flex-row justify-between">
                    <Text className="text-white/80 text-sm">{t('auto.receipt.price')}</Text>
                    <Text className="text-white font-bold text-sm">
                      {formatPKRFull(form.price)}
                    </Text>
                  </View>
                  <View className="flex-row justify-between">
                    <Text className="text-white/80 text-sm">{t('auto.new.stock')}</Text>
                    <Text className="text-white font-bold text-sm">
                      {form.stock} {form.unit}
                    </Text>
                  </View>
                  {margin > 0 && (
                    <View className="flex-row justify-between">
                      <Text className="text-white/80 text-sm">{t('auto.new.margin')}</Text>
                      <Text className="text-white font-bold text-sm">
                        {margin.toFixed(1)}%
                      </Text>
                    </View>
                  )}
                </View>
                <View className="mt-3 pt-3 border-t border-white/20">
                  <Text className="text-white/70 text-xs">{t('auto.new.baad_mein_images_variants_edit_screen_se')}</Text>
                </View>
              </View>
            </View>
          )}
        </ScrollView>

        {/* Bottom Action Bar */}
        <View
          className="px-5 py-3 border-t border-neutral-200 dark:border-neutral-800 bg-white dark:bg-neutral-900 flex-row gap-2"
          style={{
            shadowColor: '#000',
            shadowOpacity: 0.05,
            shadowRadius: 8,
            shadowOffset: { width: 0, height: -2 },
            elevation: 8,
          }}
        >
          {stepIndex > 0 && (
            <Pressable
              onPress={goPrev}
              className="h-12 px-5 rounded-2xl bg-neutral-100 dark:bg-neutral-800 items-center justify-center flex-row gap-1.5 active:opacity-70"
            >
              <ChevronLeft size={18} color="#374151" />
              <Text className="font-bold text-neutral-700 dark:text-neutral-300">{t('auto.new.back')}</Text>
            </Pressable>
          )}
          {stepIndex < steps.length - 1 ? (
            <Pressable
              onPress={goNext}
              className="flex-1 h-12 rounded-2xl items-center justify-center flex-row gap-2 active:opacity-80"
              style={{
                backgroundColor: currentStep.color,
                shadowColor: currentStep.color,
                shadowOpacity: 0.3,
                shadowRadius: 8,
                elevation: 4,
              }}
            >
              <Text className="text-white font-extrabold text-base">
                Next: {steps[stepIndex + 1].label}
              </Text>
              <ChevronRight size={18} color="#ffffff" />
            </Pressable>
          ) : (
            <Pressable
              onPress={() => {
                if (!form.name.trim()) {
                  Toast.show({ type: 'error', text1: 'Name required' });
                  setStep('basic');
                  return;
                }
                if (form.price <= 0) {
                  Toast.show({ type: 'error', text1: 'Price required' });
                  setStep('pricing');
                  return;
                }
                createMutation.mutate();
              }}
              disabled={createMutation.isPending}
              className="flex-1 h-12 rounded-2xl items-center justify-center flex-row gap-2 active:opacity-80"
              style={{
                backgroundColor: createMutation.isPending ? '#9ca3af' : '#16a34a',
                shadowColor: '#16a34a',
                shadowOpacity: 0.4,
                shadowRadius: 12,
                elevation: 6,
              }}
            >
              {createMutation.isPending ? (
                <Text className="text-white font-extrabold text-base">{t('auto.new.creating')}</Text>
              ) : (
                <>
                  <Save size={20} color="#ffffff" />
                  <Text className="text-white font-extrabold text-base">{t('auto.new.create_product')}</Text>
                </>
              )}
            </Pressable>
          )}
        </View>
      </KeyboardAvoidingView>
    </SafeAreaView>
  );
}
