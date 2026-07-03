import { useState, useMemo } from 'react';
import {
  View, Text, ScrollView, Pressable,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { useRouter, Stack } from 'expo-router';
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import * as Haptics from 'expo-haptics';
import {
  ArrowLeft, Upload, CheckCircle2, X, Sparkles, RefreshCw,
  ArrowRight, Edit3, Package, Database, TrendingUp,
} from 'lucide-react-native';
import {
  productsApi,
  type BulkImportPreviewResponse,
  type BulkImportApplyResponse,
} from '@/api/products.api';
import { useBusinessFeatures } from '@/hooks/useBusinessFeatures';
import {
  ProductManualEntryTable,
  type ProductManualRow,
} from '@/components/products/ProductManualEntryTable';
import { formatPKRFull } from '@/lib/format';
import { useSmartBack } from '@/hooks/useSmartBack';
import Toast from 'react-native-toast-message';

type ImportStep = 'upload' | 'preview' | 'result';

export default function ProductBulkImportScreen() {
  const router = useRouter();
  const goBack = useSmartBack();
  const queryClient = useQueryClient();
  const { defaultUnit } = useBusinessFeatures();

  const [step, setStep] = useState<ImportStep>('upload');
  const [manualRows, setManualRows] = useState<ProductManualRow[]>([]);
  const [parsedRows, setParsedRows] = useState<any[]>([]);
  const [preview, setPreview] = useState<BulkImportPreviewResponse | null>(null);
  const [result, setResult] = useState<BulkImportApplyResponse | null>(null);
  const [previewFilter, setPreviewFilter] = useState<'all' | 'valid' | 'invalid'>('all');

  const { data: refData } = useQuery({
    queryKey: ['products-bulk-import-reference'],
    queryFn: productsApi.bulkImportReferenceData,
  });

  const referenceData = useMemo(
    () => refData ?? { categories: [], brands: [], tags: [] },
    [refData],
  );

  const previewMutation = useMutation({
    mutationFn: () => productsApi.bulkImportPreview(parsedRows),
    onSuccess: (data) => {
      Haptics.notificationAsync(Haptics.NotificationFeedbackType.Success);
      setPreview(data);
      setStep('preview');
      Toast.show({
        type: data.invalidCount > 0 ? 'info' : 'success',
        text1: `${data.validCount} valid${data.invalidCount > 0 ? `, ${data.invalidCount} invalid` : ''}`,
      });
    },
    onError: (e: any) =>
      Toast.show({ type: 'error', text1: e?.response?.data?.message || 'Preview failed' }),
  });

  const applyMutation = useMutation({
    mutationFn: () => {
      if (!preview) throw new Error('No preview');
      const applyRows = preview.rows
        .filter((r) => r.valid)
        .map((r) => ({
          name: r.name,
          description: r.description,
          categoryId: r.categoryId,
          newCategoryName: r.willCreateCategory ? r.categoryName : undefined,
          brandId: r.brandId,
          newBrandName: r.willCreateBrand ? r.brandName : undefined,
          tagIds: r.tagIds,
          newTagNames: r.willCreateTags,
          sku: r.sku,
          barcode: r.barcode,
          unit: r.unit,
          price: r.price,
          costPrice: r.costPrice,
          wholesalePrice: r.wholesalePrice,
          stock: r.stock,
          lowStockAlert: r.lowStockAlert,
          isActive: r.isActive,
          isFeatured: r.isFeatured,
          variantNames: r.variantNames,
          imageUrls: r.imageUrls,
        }));
      return productsApi.bulkImportApply(applyRows);
    },
    onSuccess: (data) => {
      Haptics.notificationAsync(Haptics.NotificationFeedbackType.Success);
      setResult(data);
      setStep('result');
      queryClient.invalidateQueries({ queryKey: ['products'] });
      queryClient.invalidateQueries({ queryKey: ['categories'] });
      queryClient.invalidateQueries({ queryKey: ['brands'] });
      queryClient.invalidateQueries({ queryKey: ['tags'] });
      Toast.show({ type: 'success', text1: `${data.successCount} products imported!` });
    },
  });

  const handleSubmit = () => {
    const nonEmpty = manualRows.filter((r) => r.name || r.price !== '' || r.sku);
    if (nonEmpty.length === 0) {
      Toast.show({ type: 'error', text1: 'Koi row fill nahi ki' });
      return;
    }
    const apiRows = nonEmpty.map((r) => ({
      name: r.name.trim(),
      description: r.description?.trim() || undefined,
      categoryName: r.categoryName?.trim() || undefined,
      brandName: r.brandName?.trim() || undefined,
      tagNames: r.tagNames?.trim() || undefined,
      sku: r.sku?.trim() || undefined,
      barcode: r.barcode?.trim() || undefined,
      unit: r.unit || 'pcs',
      price: r.price === '' ? 0 : Number(r.price),
      costPrice: r.costPrice === '' ? undefined : Number(r.costPrice),
      wholesalePrice: r.wholesalePrice === '' ? undefined : Number(r.wholesalePrice),
      stock: r.stock === '' ? 0 : Number(r.stock),
      lowStockAlert: r.lowStockAlert === '' ? 5 : Number(r.lowStockAlert),
      variantNames: r.variantNames?.trim() || undefined,
      imageUrls: r.imageUrls?.trim() || undefined,
      isActive: r.isActive,
      isFeatured: r.isFeatured,
    }));
    setParsedRows(apiRows);
    setTimeout(() => previewMutation.mutate(), 100);
  };

  const resetFlow = () => {
    setStep('upload');
    setManualRows([]);
    setParsedRows([]);
    setPreview(null);
    setResult(null);
    setPreviewFilter('all');
  };

  const filteredPreviewRows = useMemo(() => {
    if (!preview) return [];
    if (previewFilter === 'valid') return preview.rows.filter((r) => r.valid);
    if (previewFilter === 'invalid') return preview.rows.filter((r) => !r.valid);
    return preview.rows;
  }, [preview, previewFilter]);

  return (
    <SafeAreaView className="flex-1 bg-neutral-50 dark:bg-neutral-950" edges={['top']}>
      <Stack.Screen options={{ headerShown: false }} />

      {/* Header */}
      <View className="px-5 pt-4 pb-3 flex-row items-center gap-3">
        <Pressable
          onPress={() => router.canGoBack() ? goBack() : router.replace('/(tabs)/products' as any)}
          hitSlop={12}
          className="h-10 w-10 rounded-2xl bg-white items-center justify-center border border-neutral-200"
        >
          <ArrowLeft size={20} color="#16a34a" />
        </Pressable>
        <View className="flex-1">
          <Text className="text-2xl font-extrabold text-neutral-900 dark:text-white">
            Bulk Import
          </Text>
          <Text className="text-xs text-neutral-500 mt-0.5">Products</Text>
        </View>
      </View>

      <ScrollView contentContainerStyle={{ paddingBottom: 120 }} showsVerticalScrollIndicator={false}>
        {/* Hero */}
        <View className="mx-5 rounded-3xl p-5 mb-4" style={{ backgroundColor: '#16a34a' }}>
          <View className="flex-row items-center gap-2 mb-2">
            <Database size={12} color="rgba(255,255,255,0.9)" />
            <Text className="text-[10px] uppercase tracking-wider text-white/80 font-extrabold">
              Bulk Operations
            </Text>
          </View>
          <Text className="text-white text-2xl font-extrabold">Import Products</Text>
          <Text className="text-xs text-white/80 mt-1">
            100+ products ek saath — categories, brands, tags auto-create
          </Text>
        </View>

        {/* Step indicator */}
        <View className="px-5 mb-4 flex-row items-center justify-center gap-2">
          {[
            { num: 1, label: 'Upload', active: step === 'upload', done: step !== 'upload' },
            { num: 2, label: 'Preview', active: step === 'preview', done: step === 'result' },
            { num: 3, label: 'Done', active: step === 'result', done: false },
          ].map((s, idx, arr) => (
            <View key={s.num} className="flex-row items-center gap-1">
              <View
                className="h-9 w-9 rounded-full items-center justify-center"
                style={{ backgroundColor: s.done ? '#16a34a' : s.active ? '#2563eb' : '#e5e7eb' }}
              >
                {s.done ? (
                  <CheckCircle2 size={16} color="#ffffff" />
                ) : (
                  <Text className="font-extrabold text-white text-sm">{s.num}</Text>
                )}
              </View>
              <Text
                className="text-xs font-bold"
                style={{ color: s.done || s.active ? '#0f172a' : '#94a3b8' }}
              >
                {s.label}
              </Text>
              {idx < arr.length - 1 && (
                <View className="w-6 h-0.5 mx-1" style={{ backgroundColor: s.done ? '#16a34a' : '#e5e7eb' }} />
              )}
            </View>
          ))}
        </View>

        {/* Step 1: Manual entry */}
        {step === 'upload' && (
          <View className="px-5 gap-4">
            <View className="rounded-2xl bg-blue-50 border-2 border-blue-200 p-3 flex-row items-start gap-3">
              <Sparkles size={14} color="#2563eb" style={{ marginTop: 2 }} />
              <Text className="flex-1 text-xs text-blue-900 font-semibold">
                Categories, brands aur tags auto-create honge agar exist na karein.
                {referenceData.categories.length > 0 && ` ${referenceData.categories.length} categories,`}
                {referenceData.brands.length > 0 && ` ${referenceData.brands.length} brands`}
                {referenceData.tags.length > 0 && `, ${referenceData.tags.length} tags`} already available.
              </Text>
            </View>

            <ProductManualEntryTable
              rows={manualRows}
              onChange={setManualRows}
              referenceData={referenceData}
              defaultUnit={defaultUnit || 'pcs'}
            />

            {manualRows.length > 0 && (
              <Pressable
                onPress={handleSubmit}
                disabled={previewMutation.isPending}
                className="h-14 rounded-2xl items-center justify-center flex-row gap-2 active:opacity-80"
                style={{
                  backgroundColor: previewMutation.isPending ? '#94a3b8' : '#2563eb',
                  shadowColor: '#2563eb',
                  shadowOpacity: 0.3,
                  shadowRadius: 12,
                  elevation: 6,
                }}
              >
                <CheckCircle2 size={20} color="#ffffff" />
                <Text className="text-white font-extrabold text-base">
                  {previewMutation.isPending ? 'Validating...' : `Validate ${manualRows.length} Products`}
                </Text>
              </Pressable>
            )}
          </View>
        )}

        {/* Step 2: Preview */}
        {step === 'preview' && preview && (
          <View className="px-5 gap-3">
            <View className="flex-row flex-wrap -mx-1">
              {[
                { label: 'Total', value: preview.totalRows, color: '#0f172a' },
                { label: 'Valid', value: preview.validCount, color: '#16a34a' },
                { label: 'Invalid', value: preview.invalidCount, color: '#dc2626' },
                { label: 'Variants', value: preview.totalVariantsToCreate, color: '#8b5cf6' },
              ].map((s) => (
                <View key={s.label} className="w-1/2 px-1 mb-2">
                  <View className="rounded-2xl border-2 border-slate-200 bg-white p-3">
                    <Text className="text-[9px] uppercase font-extrabold text-slate-500">{s.label}</Text>
                    <Text className="text-2xl font-extrabold mt-1" style={{ color: s.color }}>{s.value}</Text>
                  </View>
                </View>
              ))}
            </View>

            {(preview.totalCategoriesToCreate + preview.totalBrandsToCreate + preview.totalTagsToCreate) > 0 && (
              <View className="rounded-2xl bg-blue-50 border-2 border-blue-200 p-3 flex-row items-center gap-2">
                <Sparkles size={16} color="#2563eb" />
                <Text className="flex-1 text-xs font-bold text-blue-900">
                  Auto-create: {preview.totalCategoriesToCreate} cats, {preview.totalBrandsToCreate} brands, {preview.totalTagsToCreate} tags
                </Text>
              </View>
            )}

            {preview.validCount > 0 && (
              <View className="rounded-2xl bg-white border border-slate-200 p-4">
                <Text className="text-[10px] uppercase font-extrabold text-slate-500 mb-2">Value Summary</Text>
                <View className="flex-row justify-between mb-1">
                  <Text className="text-xs text-emerald-700 font-bold">Stock Value</Text>
                  <Text className="text-xs font-extrabold text-emerald-900">{formatPKRFull(preview.totalStockValue)}</Text>
                </View>
                <View className="flex-row justify-between mb-1">
                  <Text className="text-xs text-blue-700 font-bold">Cost Value</Text>
                  <Text className="text-xs font-extrabold text-blue-900">{formatPKRFull(preview.totalCostValue)}</Text>
                </View>
                <View className="flex-row justify-between pt-2 border-t border-slate-200">
                  <Text className="text-sm text-amber-700 font-extrabold">Potential Profit</Text>
                  <Text className="text-sm font-extrabold text-amber-900">
                    {formatPKRFull(preview.totalStockValue - preview.totalCostValue)}
                  </Text>
                </View>
              </View>
            )}

            <View className="flex-row gap-2">
              {[
                { key: 'all' as const, label: 'All', count: preview.totalRows, color: '#0f172a' },
                { key: 'valid' as const, label: 'Valid', count: preview.validCount, color: '#16a34a' },
                { key: 'invalid' as const, label: 'Invalid', count: preview.invalidCount, color: '#dc2626' },
              ].map((f) => {
                const active = previewFilter === f.key;
                return (
                  <Pressable
                    key={f.key}
                    onPress={() => setPreviewFilter(f.key)}
                    className="h-9 px-3 rounded-xl flex-row items-center gap-1.5"
                    style={{
                      backgroundColor: active ? f.color : '#ffffff',
                      borderWidth: 2,
                      borderColor: active ? f.color : '#e5e7eb',
                    }}
                  >
                    <Text className="text-xs font-extrabold" style={{ color: active ? '#ffffff' : '#374151' }}>
                      {f.label} ({f.count})
                    </Text>
                  </Pressable>
                );
              })}
            </View>

            <View className="gap-2">
              {filteredPreviewRows.slice(0, 100).map((row) => (
                <View
                  key={row.index}
                  className="rounded-2xl border-2 p-3"
                  style={{
                    backgroundColor: row.valid ? '#f0fdf4' : '#fef2f2',
                    borderColor: row.valid ? '#86efac' : '#fca5a5',
                  }}
                >
                  <View className="flex-row items-start justify-between gap-2">
                    <View className="flex-1 min-w-0">
                      <View className="flex-row items-center gap-1.5">
                        <Text className="text-[10px] font-mono font-extrabold text-slate-500">#{row.index}</Text>
                        {row.valid ? (
                          <View className="px-1.5 py-0.5 rounded bg-emerald-100 flex-row items-center gap-0.5">
                            <CheckCircle2 size={8} color="#15803d" />
                            <Text className="text-[9px] font-extrabold text-emerald-700">VALID</Text>
                          </View>
                        ) : (
                          <View className="px-1.5 py-0.5 rounded bg-rose-100 flex-row items-center gap-0.5">
                            <X size={8} color="#b91c1c" />
                            <Text className="text-[9px] font-extrabold text-rose-700">INVALID</Text>
                          </View>
                        )}
                      </View>
                      <Text className="text-sm font-extrabold text-slate-900 mt-1" numberOfLines={1}>
                        {row.name}
                      </Text>
                      <View className="flex-row items-center gap-1.5 mt-0.5 flex-wrap">
                        {row.categoryName && (
                          <View className="px-1.5 py-0.5 rounded bg-slate-100 flex-row items-center gap-0.5">
                            <Text className="text-[9px] font-bold text-slate-700">{row.categoryName}</Text>
                            {row.willCreateCategory && (
                              <Text className="text-[8px] font-extrabold text-blue-700">NEW</Text>
                            )}
                          </View>
                        )}
                        {row.brandName && (
                          <View className="px-1.5 py-0.5 rounded bg-violet-100 flex-row items-center gap-0.5">
                            <Text className="text-[9px] font-bold text-violet-700">{row.brandName}</Text>
                            {row.willCreateBrand && (
                              <Text className="text-[8px] font-extrabold text-blue-700">NEW</Text>
                            )}
                          </View>
                        )}
                      </View>
                      {row.errors.map((e: string, i: number) => (
                        <Text key={i} className="text-[10px] text-rose-700 font-bold mt-0.5">
                          ✗ {e}
                        </Text>
                      ))}
                    </View>
                    <View className="items-end">
                      <Text className="text-sm font-extrabold text-emerald-700">{formatPKRFull(row.price)}</Text>
                      <Text className="text-[10px] text-slate-500 font-bold">Stock: {row.stock}</Text>
                    </View>
                  </View>
                </View>
              ))}
              {filteredPreviewRows.length > 100 && (
                <View className="rounded-xl bg-amber-50 border border-amber-200 p-2 items-center">
                  <Text className="text-[10px] text-amber-800 font-bold">
                    Showing first 100 of {filteredPreviewRows.length}
                  </Text>
                </View>
              )}
            </View>

            <View className="flex-row gap-2 mt-2">
              <Pressable
                onPress={resetFlow}
                className="flex-1 h-12 rounded-xl border-2 border-slate-300 items-center justify-center flex-row gap-1"
              >
                <ArrowLeft size={14} color="#64748b" />
                <Text className="text-slate-700 font-extrabold text-sm">Back</Text>
              </Pressable>
              <Pressable
                onPress={() => applyMutation.mutate()}
                disabled={applyMutation.isPending || preview.validCount === 0}
                className="flex-[2] h-12 rounded-xl items-center justify-center flex-row gap-1.5"
                style={{ backgroundColor: applyMutation.isPending || preview.validCount === 0 ? '#94a3b8' : '#16a34a' }}
              >
                <CheckCircle2 size={16} color="#ffffff" />
                <Text className="text-white font-extrabold text-sm">
                  {applyMutation.isPending ? 'Importing...' : `Import ${preview.validCount} Products`}
                </Text>
              </Pressable>
            </View>
          </View>
        )}

        {/* Step 3: Result */}
        {step === 'result' && result && (
          <View className="px-5 gap-3">
            <View className="rounded-3xl bg-emerald-50 border-2 border-emerald-300 p-6 items-center">
              <View className="h-20 w-20 rounded-3xl bg-emerald-600 items-center justify-center">
                <CheckCircle2 size={40} color="#ffffff" />
              </View>
              <Text className="text-2xl font-extrabold text-emerald-900 mt-4">Import Complete! 🎉</Text>
              <Text className="text-sm text-emerald-800 font-bold mt-1">
                {result.successCount} products created
              </Text>
            </View>

            <View className="flex-row flex-wrap -mx-1">
              {[
                { label: 'Submitted', value: result.totalSubmitted, color: '#0f172a' },
                { label: 'Success', value: result.successCount, color: '#16a34a' },
                { label: 'Failed', value: result.failureCount, color: '#dc2626' },
                { label: 'New Cats', value: result.newCategoriesCreated, color: '#8b5cf6' },
                { label: 'New Brands', value: result.newBrandsCreated, color: '#f59e0b' },
                { label: 'Variants', value: result.newVariantsCreated, color: '#0891b2' },
              ].map((s) => (
                <View key={s.label} className="w-1/3 px-1 mb-2">
                  <View className="rounded-2xl bg-white border-2 border-slate-200 p-2.5 items-center">
                    <Text className="text-[9px] uppercase font-extrabold text-slate-500">{s.label}</Text>
                    <Text className="text-lg font-extrabold mt-0.5" style={{ color: s.color }}>{s.value}</Text>
                  </View>
                </View>
              ))}
            </View>

            <View className="flex-row gap-2 mt-2">
              <Pressable
                onPress={resetFlow}
                className="flex-1 h-12 rounded-xl border-2 border-slate-300 items-center justify-center flex-row gap-1"
              >
                <RefreshCw size={14} color="#64748b" />
                <Text className="text-slate-700 font-extrabold text-sm">Import More</Text>
              </Pressable>
              <Pressable
                onPress={() => router.replace('/(tabs)/products' as any)}
                className="flex-[2] h-12 rounded-xl bg-emerald-600 items-center justify-center flex-row gap-1.5"
              >
                <Package size={16} color="#ffffff" />
                <Text className="text-white font-extrabold text-sm">View Products</Text>
              </Pressable>
            </View>
          </View>
        )}
      </ScrollView>
    </SafeAreaView>
  );
}
