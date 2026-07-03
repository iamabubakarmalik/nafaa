import { useState, useMemo } from 'react';
import {
  View, Text, ScrollView, Pressable, Alert, RefreshControl,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { useRouter, Stack } from 'expo-router';
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import * as Haptics from 'expo-haptics';
import * as DocumentPicker from 'expo-document-picker';
import { File, Paths } from 'expo-file-system';
import * as XLSX from 'xlsx';
import {
  ArrowLeft, Upload, FileSpreadsheet, Download, CheckCircle2,
  AlertTriangle, X, Sparkles, Layers, FileWarning, RefreshCw,
  ArrowRight, Edit3, Package, DollarSign, TrendingUp,
  Database, Info, Zap,
} from 'lucide-react-native';
import { productsApi } from '@/api/products.api';
import { productVariantsApi } from '@/api/product-variants.api';
import {
  carpetRollsApi,
  type BulkImportPreviewResponse,
  type BulkImportApplyResponse,
} from '@/api/carpet-rolls.api';
import {
  CarpetManualEntryTable,
  type CarpetManualRow,
} from '@/components/industries/carpet/CarpetManualEntryTable';
import { formatPKRFull } from '@/lib/format';
import { useSmartBack } from '@/hooks/useSmartBack';
import Toast from 'react-native-toast-message';

type ImportStep = 'upload' | 'preview' | 'result';
type InputMode = 'excel' | 'manual';

export default function CarpetBulkImportScreen() {
  const router = useRouter();
  const goBack = useSmartBack();
  const queryClient = useQueryClient();

  const [step, setStep] = useState<ImportStep>('upload');
  const [inputMode, setInputMode] = useState<InputMode>('manual');
  const [manualRows, setManualRows] = useState<CarpetManualRow[]>([]);
  const [parsedRows, setParsedRows] = useState<any[]>([]);
  const [preview, setPreview] = useState<BulkImportPreviewResponse | null>(null);
  const [result, setResult] = useState<BulkImportApplyResponse | null>(null);
  const [fileName, setFileName] = useState('');
  const [previewFilter, setPreviewFilter] = useState<'all' | 'valid' | 'invalid'>('all');

  const { data: productsData } = useQuery({
    queryKey: ['products-for-bulk-import'],
    queryFn: () => productsApi.list({ limit: 500 }),
  });

  const carpetProducts = useMemo(() => {
    const items = productsData?.items ?? [];
    return items.filter((p: any) =>
      ['sqft', 'sqm', 'sqyd'].includes((p.unit || '').toLowerCase()),
    );
  }, [productsData]);

  const carpetProductIds = useMemo(
    () => carpetProducts.map((p: any) => p.id),
    [carpetProducts],
  );

  const { data: allVariantsData } = useQuery({
    queryKey: ['carpet-products-variants', carpetProductIds.join(',')],
    queryFn: async () => {
      const results = await Promise.all(
        carpetProductIds.map(async (pid) => {
          try {
            const variants = await productVariantsApi.list(pid);
            return { productId: pid, variants };
          } catch {
            return { productId: pid, variants: [] };
          }
        }),
      );
      const map = new Map<string, any[]>();
      for (const r of results) map.set(r.productId, r.variants);
      return map;
    },
    enabled: carpetProductIds.length > 0,
  });

  const productOptions = useMemo(() => {
    const rows: Array<{
      productName: string;
      variantName: string;
      productSku?: string;
      variantSku?: string;
      defaultCost?: number;
      defaultPrice?: number;
    }> = [];

    for (const p of carpetProducts as any[]) {
      const variants = allVariantsData?.get(p.id) ?? [];
      if (variants.length > 0) {
        for (const v of variants) {
          rows.push({
            productName: p.name,
            variantName: v.name,
            productSku: p.sku ?? undefined,
            variantSku: v.sku ?? undefined,
            defaultCost: Number(v.costPrice ?? p.costPrice ?? 0),
            defaultPrice: Number(v.price ?? p.price ?? 0),
          });
        }
      } else {
        rows.push({
          productName: p.name,
          variantName: '',
          productSku: p.sku ?? undefined,
          defaultCost: Number(p.costPrice ?? 0),
          defaultPrice: Number(p.price ?? 0),
        });
      }
    }
    return rows;
  }, [carpetProducts, allVariantsData]);

  // Excel file pick
  const pickExcelFile = async () => {
    try {
      Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
      const res = await DocumentPicker.getDocumentAsync({
        type: [
          'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet',
          'application/vnd.ms-excel',
          'text/csv',
        ],
        copyToCacheDirectory: true,
      });

      if (res.canceled || !res.assets?.[0]) return;

      const asset = res.assets[0];
      setFileName(asset.name);

      const file = new File(asset.uri);
      const base64 = await file.base64();

      const wb = XLSX.read(base64, { type: 'base64' });
      const sheet = wb.Sheets[wb.SheetNames[0]];
      const rows = XLSX.utils.sheet_to_json<any>(sheet, { raw: true });

      if (rows.length === 0) {
        Toast.show({ type: 'error', text1: 'Empty file' });
        return;
      }

      const normalized = rows.map((row) => {
        const out: any = {};
        for (const k of Object.keys(row)) {
          const cleaned = k.trim().replace(/\s+/g, '');
          const camel = cleaned.charAt(0).toLowerCase() + cleaned.slice(1);
          out[camel] = row[k];
        }
        ['widthFt', 'widthInch', 'lengthFt', 'lengthInch', 'costPerSqft', 'salePricePerSqft'].forEach((f) => {
          if (out[f] !== undefined && out[f] !== '') out[f] = Number(out[f]);
        });
        return out;
      });

      setParsedRows(normalized);
      Toast.show({ type: 'success', text1: `${normalized.length} rows parsed` });
    } catch (e: any) {
      Toast.show({ type: 'error', text1: 'File error', text2: e?.message });
    }
  };

  // Template download (share to WhatsApp / etc.)
  const downloadTemplate = async () => {
    try {
      const wb = XLSX.utils.book_new();
      const sample = [{
        productName: 'Sun Flower', variantName: 'Cream', rollNumber: 'R-001',
        designCode: 'SF-001', widthFt: 12, widthInch: 0, lengthFt: 100, lengthInch: 0,
        costPerSqft: 72, salePricePerSqft: 90, rackNumber: 'Wall-1',
        quality: 'Premium', pile: 'Wool', notes: '',
      }];
      const ws = XLSX.utils.json_to_sheet(sample);
      XLSX.utils.book_append_sheet(wb, ws, 'Carpet Rolls');

      const b64 = XLSX.write(wb, { type: 'base64', bookType: 'xlsx' });
      const templateFile = new File(Paths.document, 'carpet_rolls_template.xlsx');
      if (templateFile.exists) templateFile.delete();
      templateFile.create();
      templateFile.write(b64, { encoding: 'base64' });
      const uri = templateFile.uri;

      const Sharing = await import('expo-sharing');
      await Sharing.shareAsync(uri, {
        mimeType: 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet',
        dialogTitle: 'Carpet Rolls Template',
      });
    } catch (e: any) {
      Toast.show({ type: 'error', text1: 'Template failed', text2: e?.message });
    }
  };

  // Mutations
  const previewMutation = useMutation({
    mutationFn: () => carpetRollsApi.bulkImportPreview(parsedRows),
    onSuccess: (data: any) => {
      Haptics.notificationAsync(Haptics.NotificationFeedbackType.Success);
      setPreview(data);
      setStep('preview');
      if (data.invalidCount > 0) {
        Toast.show({ type: 'info', text1: `${data.validCount} valid, ${data.invalidCount} invalid` });
      } else {
        Toast.show({ type: 'success', text1: `All ${data.validCount} rows valid!` });
      }
    },
    onError: (e: any) => {
      Haptics.notificationAsync(Haptics.NotificationFeedbackType.Error);
      Toast.show({ type: 'error', text1: e?.response?.data?.message || 'Preview failed' });
    },
  });

  const applyMutation = useMutation({
    mutationFn: () => {
      if (!preview) throw new Error('No preview');
      const validRows = preview.rows
        .filter((r: any) => r.valid)
        .map((r: any) => ({
          productId: r.productId,
          variantId: r.variantId,
          rollNumber: r.rollNumber === '(auto-generated)' ? undefined : r.rollNumber,
          designCode: r.designCode,
          widthFt: r.widthFt,
          widthInch: r.widthInch,
          lengthFt: r.lengthFt,
          lengthInch: (r as any).lengthInch ?? 0,
          costPerSqft: r.costPerSqft,
          salePricePerSqft: r.salePricePerSqft,
          rackNumber: r.rackNumber,
          notes: r.notes,
          quality: r.quality,
          pile: r.pile,
        }));
      return carpetRollsApi.bulkImportApply(validRows);
    },
    onSuccess: (data: any) => {
      Haptics.notificationAsync(Haptics.NotificationFeedbackType.Success);
      setResult(data);
      setStep('result');
      queryClient.invalidateQueries({ queryKey: ['carpet-rolls'] });
      queryClient.invalidateQueries({ queryKey: ['carpet-overview'] });
      Toast.show({ type: 'success', text1: `${data.successCount} rolls imported!` });
    },
  });

  const handleManualSubmit = () => {
    const nonEmpty = manualRows.filter(
      (r) => r.productName || r.widthFt || r.lengthFt,
    );
    if (nonEmpty.length === 0) {
      Toast.show({ type: 'error', text1: 'Koi row fill nahi ki' });
      return;
    }
    const invalid = nonEmpty.filter(
      (r) => !r.productName || !r.widthFt || Number(r.widthFt) <= 0 || !r.lengthFt || Number(r.lengthFt) <= 0,
    );
    if (invalid.length > 0) {
      Toast.show({ type: 'error', text1: `${invalid.length} rows incomplete` });
      return;
    }
    const apiRows = nonEmpty.map((r) => ({
      productName: r.productName.trim(),
      variantName: r.variantName?.trim() || undefined,
      rollNumber: r.rollNumber?.trim() || undefined,
      designCode: r.designCode?.trim() || undefined,
      widthFt: Number(r.widthFt),
      widthInch: Number(r.widthInch || 0),
      lengthFt: Number(r.lengthFt),
      lengthInch: Number(r.lengthInch || 0),
      costPerSqft: r.costPerSqft !== '' ? Number(r.costPerSqft) : undefined,
      salePricePerSqft: r.salePricePerSqft !== '' ? Number(r.salePricePerSqft) : undefined,
      rackNumber: r.rackNumber?.trim() || undefined,
      quality: r.quality?.trim() || undefined,
      pile: r.pile?.trim() || undefined,
      notes: r.notes?.trim() || undefined,
    }));
    setParsedRows(apiRows);
    setTimeout(() => previewMutation.mutate(), 100);
  };

  const resetFlow = () => {
    setStep('upload');
    setParsedRows([]);
    setManualRows([]);
    setPreview(null);
    setResult(null);
    setFileName('');
    setPreviewFilter('all');
  };

  const filteredPreviewRows = useMemo(() => {
    if (!preview) return [];
    if (previewFilter === 'valid') return preview.rows.filter((r: any) => r.valid);
    if (previewFilter === 'invalid') return preview.rows.filter((r: any) => !r.valid);
    return preview.rows;
  }, [preview, previewFilter]);

  return (
    <SafeAreaView className="flex-1 bg-neutral-50 dark:bg-neutral-950" edges={['top']}>
      <Stack.Screen options={{ headerShown: false }} />

      {/* Header */}
      <View className="px-5 pt-4 pb-3 flex-row items-center gap-3">
        <Pressable
          onPress={() => router.canGoBack() ? goBack() : router.replace('/industries/carpet/rolls' as any)}
          hitSlop={12}
          className="h-10 w-10 rounded-2xl bg-white items-center justify-center border border-neutral-200"
        >
          <ArrowLeft size={20} color="#16a34a" />
        </Pressable>
        <View className="flex-1">
          <Text className="text-2xl font-extrabold text-neutral-900 dark:text-white">
            Bulk Import
          </Text>
          <Text className="text-xs text-neutral-500 mt-0.5">
            Carpet Rolls
          </Text>
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
          <Text className="text-white text-2xl font-extrabold">Import Carpet Rolls</Text>
          <Text className="text-xs text-white/80 mt-1">
            Manual entry ya Excel se 100+ rolls ek saath
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
                style={{
                  backgroundColor: s.done ? '#16a34a' : s.active ? '#2563eb' : '#e5e7eb',
                }}
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

        {/* Step 1: Upload */}
        {step === 'upload' && (
          <View className="px-5 gap-4">
            {/* Mode switcher */}
            <View className="rounded-2xl bg-white border-2 border-slate-200 p-1.5 flex-row">
              <Pressable
                onPress={() => setInputMode('manual')}
                className="flex-1 h-11 rounded-xl items-center justify-center flex-row gap-1.5"
                style={{ backgroundColor: inputMode === 'manual' ? '#2563eb' : 'transparent' }}
              >
                <Edit3 size={14} color={inputMode === 'manual' ? '#ffffff' : '#64748b'} />
                <Text
                  className="text-xs font-extrabold"
                  style={{ color: inputMode === 'manual' ? '#ffffff' : '#64748b' }}
                >
                  Manual Entry
                </Text>
              </Pressable>
              <Pressable
                onPress={() => setInputMode('excel')}
                className="flex-1 h-11 rounded-xl items-center justify-center flex-row gap-1.5"
                style={{ backgroundColor: inputMode === 'excel' ? '#16a34a' : 'transparent' }}
              >
                <FileSpreadsheet size={14} color={inputMode === 'excel' ? '#ffffff' : '#64748b'} />
                <Text
                  className="text-xs font-extrabold"
                  style={{ color: inputMode === 'excel' ? '#ffffff' : '#64748b' }}
                >
                  Excel Upload
                </Text>
              </Pressable>
            </View>

            {/* Excel mode */}
            {inputMode === 'excel' && (
              <View className="gap-3">
                <Pressable
                  onPress={pickExcelFile}
                  className="rounded-3xl border-4 border-dashed p-8 items-center bg-emerald-50/50"
                  style={{ borderColor: fileName ? '#86efac' : '#86efac' }}
                >
                  <View className="h-16 w-16 rounded-2xl bg-emerald-500 items-center justify-center">
                    {fileName ? <FileSpreadsheet size={32} color="#ffffff" /> : <Upload size={32} color="#ffffff" />}
                  </View>
                  <Text className="mt-3 font-extrabold text-emerald-900 text-base">
                    {fileName || 'Tap to pick Excel/CSV'}
                  </Text>
                  <Text className="text-xs text-emerald-700 mt-1 text-center">
                    {fileName ? `${parsedRows.length} rows parsed` : 'Supported: .xlsx, .xls, .csv'}
                  </Text>
                </Pressable>

                <Pressable
                  onPress={downloadTemplate}
                  className="rounded-2xl bg-white border-2 border-slate-200 p-3 flex-row items-center gap-3 active:opacity-70"
                >
                  <View className="h-11 w-11 rounded-2xl bg-blue-100 items-center justify-center">
                    <Download size={20} color="#2563eb" />
                  </View>
                  <View className="flex-1">
                    <Text className="font-extrabold text-slate-900">Download Template</Text>
                    <Text className="text-xs text-slate-500 mt-0.5">Excel format with sample</Text>
                  </View>
                  <ArrowRight size={16} color="#94a3b8" />
                </Pressable>

                {parsedRows.length > 0 && (
                  <View className="rounded-2xl bg-emerald-50 border-2 border-emerald-300 p-3 flex-row items-center gap-3">
                    <CheckCircle2 size={20} color="#16a34a" />
                    <View className="flex-1">
                      <Text className="font-extrabold text-emerald-900 text-sm">{parsedRows.length} rows ready</Text>
                    </View>
                    <Pressable
                      onPress={() => previewMutation.mutate()}
                      disabled={previewMutation.isPending}
                      className="h-11 px-4 rounded-xl bg-emerald-600 items-center justify-center flex-row gap-1"
                    >
                      <Text className="text-white font-extrabold text-xs">
                        {previewMutation.isPending ? '...' : 'Validate'}
                      </Text>
                      <ArrowRight size={14} color="#ffffff" />
                    </Pressable>
                  </View>
                )}
              </View>
            )}

            {/* Manual mode */}
            {inputMode === 'manual' && (
              <View className="gap-3">
                <View className="rounded-2xl bg-blue-50 border-2 border-blue-200 p-3 flex-row items-start gap-3">
                  <Sparkles size={14} color="#2563eb" style={{ marginTop: 2 }} />
                  <Text className="flex-1 text-xs text-blue-900 font-semibold">
                    Product select karte hi cost & sale price auto-fill ho jate hain product defaults se
                  </Text>
                </View>

                <CarpetManualEntryTable
                  rows={manualRows}
                  onChange={setManualRows}
                  productOptions={productOptions}
                />

                {manualRows.length > 0 && (
                  <Pressable
                    onPress={handleManualSubmit}
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
                      {previewMutation.isPending ? 'Validating...' : `Validate ${manualRows.length} Rows`}
                    </Text>
                  </Pressable>
                )}
              </View>
            )}
          </View>
        )}

        {/* Step 2: Preview */}
        {step === 'preview' && preview && (
          <View className="px-5 gap-3">
            {/* Stats */}
            <View className="flex-row flex-wrap -mx-1">
              <View className="w-1/2 px-1 mb-2">
                <View className="rounded-2xl border-2 border-slate-200 bg-white p-3">
                  <Text className="text-[9px] uppercase font-extrabold text-slate-500">Total Rows</Text>
                  <Text className="text-2xl font-extrabold text-slate-900">{preview.totalRows}</Text>
                </View>
              </View>
              <View className="w-1/2 px-1 mb-2">
                <View className="rounded-2xl border-2 border-emerald-200 bg-emerald-50 p-3">
                  <Text className="text-[9px] uppercase font-extrabold text-emerald-700">Valid</Text>
                  <Text className="text-2xl font-extrabold text-emerald-900">{preview.validCount}</Text>
                </View>
              </View>
              <View className="w-1/2 px-1 mb-2">
                <View className="rounded-2xl border-2 border-rose-200 bg-rose-50 p-3">
                  <Text className="text-[9px] uppercase font-extrabold text-rose-700">Invalid</Text>
                  <Text className="text-2xl font-extrabold text-rose-900">{preview.invalidCount}</Text>
                </View>
              </View>
              <View className="w-1/2 px-1 mb-2">
                <View className="rounded-2xl border-2 border-violet-200 bg-violet-50 p-3">
                  <Text className="text-[9px] uppercase font-extrabold text-violet-700">Total Sqft</Text>
                  <Text className="text-lg font-extrabold text-violet-900" numberOfLines={1}>
                    {preview.totalSqftToImport.toFixed(0)}
                  </Text>
                </View>
              </View>
            </View>

            {/* Value summary */}
            {preview.validCount > 0 && (
              <View className="rounded-2xl bg-white border border-slate-200 p-4">
                <Text className="text-[10px] uppercase font-extrabold text-slate-500 mb-2">Financial Summary</Text>
                <View className="gap-1.5">
                  <View className="flex-row justify-between">
                    <Text className="text-xs text-blue-700 font-bold">Total Cost</Text>
                    <Text className="text-xs font-extrabold text-blue-900">{formatPKRFull(preview.totalCostToImport)}</Text>
                  </View>
                  <View className="flex-row justify-between">
                    <Text className="text-xs text-emerald-700 font-bold">Sale Value</Text>
                    <Text className="text-xs font-extrabold text-emerald-900">{formatPKRFull(preview.totalSaleValueToImport)}</Text>
                  </View>
                  <View className="flex-row justify-between pt-2 mt-1 border-t border-slate-200">
                    <Text className="text-sm text-amber-700 font-extrabold">Potential Profit</Text>
                    <Text className="text-sm font-extrabold text-amber-900">
                      {formatPKRFull(preview.totalSaleValueToImport - preview.totalCostToImport)}
                    </Text>
                  </View>
                </View>
              </View>
            )}

            {/* Filter chips */}
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
                    onPress={() => {
                      Haptics.selectionAsync();
                      setPreviewFilter(f.key);
                    }}
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

            {/* Rows list */}
            <View className="gap-2">
              {filteredPreviewRows.slice(0, 100).map((row: any) => (
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
                        {row.productName}
                      </Text>
                      {row.variantName && (
                        <Text className="text-[11px] font-bold text-violet-700">{row.variantName}</Text>
                      )}
                      <Text className="text-[10px] text-slate-600 font-bold mt-0.5">
                        {row.widthFt}ft × {row.lengthFt}ft = {row.totalSqft.toFixed(2)} sqft
                      </Text>
                      {row.errors.map((e: string, i: number) => (
                        <Text key={i} className="text-[10px] text-rose-700 font-bold mt-0.5">
                          ✗ {e}
                        </Text>
                      ))}
                    </View>
                    <View className="items-end">
                      <Text className="text-xs font-mono font-bold text-slate-700">{row.rollNumber}</Text>
                      {row.salePricePerSqft > 0 && (
                        <Text className="text-[10px] font-extrabold text-emerald-700 mt-1">
                          {formatPKRFull(row.salePricePerSqft)}/sqft
                        </Text>
                      )}
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

            {/* Actions */}
            <View className="flex-row gap-2 mt-2">
              <Pressable
                onPress={resetFlow}
                className="flex-1 h-12 rounded-xl border-2 border-slate-300 items-center justify-center flex-row gap-1"
              >
                <ArrowLeft size={14} color="#64748b" />
                <Text className="text-slate-700 font-extrabold text-sm">Start Over</Text>
              </Pressable>
              <Pressable
                onPress={() => applyMutation.mutate()}
                disabled={applyMutation.isPending || preview.validCount === 0}
                className="flex-[2] h-12 rounded-xl items-center justify-center flex-row gap-1.5"
                style={{
                  backgroundColor:
                    applyMutation.isPending || preview.validCount === 0 ? '#94a3b8' : '#16a34a',
                }}
              >
                <CheckCircle2 size={16} color="#ffffff" />
                <Text className="text-white font-extrabold text-sm">
                  {applyMutation.isPending
                    ? 'Importing...'
                    : `Import ${preview.validCount} Rolls`}
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
                {result.successCount} rolls created
              </Text>
            </View>

            <View className="flex-row flex-wrap -mx-1">
              {[
                { label: 'Submitted', value: result.totalSubmitted, color: '#0f172a' },
                { label: 'Success', value: result.successCount, color: '#16a34a' },
                { label: 'Failed', value: result.failureCount, color: '#dc2626' },
              ].map((s) => (
                <View key={s.label} className="w-1/3 px-1">
                  <View className="rounded-2xl bg-white border-2 border-slate-200 p-3 items-center">
                    <Text className="text-[10px] uppercase font-extrabold text-slate-500">{s.label}</Text>
                    <Text className="text-2xl font-extrabold mt-1" style={{ color: s.color }}>{s.value}</Text>
                  </View>
                </View>
              ))}
            </View>

            {result.failureCount > 0 && (
              <View className="rounded-2xl bg-white border-2 border-rose-200 p-3">
                <Text className="text-xs font-extrabold uppercase text-rose-700 mb-2">Failed Rows</Text>
                {result.results.filter((r: any) => !r.success).slice(0, 10).map((r: any) => (
                  <View key={r.index} className="flex-row gap-2 py-1">
                    <Text className="text-[10px] font-mono font-bold text-slate-500 w-8">#{r.index}</Text>
                    <Text className="flex-1 text-[11px] text-rose-700 font-semibold">{r.error}</Text>
                  </View>
                ))}
              </View>
            )}

            <View className="flex-row gap-2 mt-2">
              <Pressable
                onPress={resetFlow}
                className="flex-1 h-12 rounded-xl border-2 border-slate-300 items-center justify-center flex-row gap-1"
              >
                <RefreshCw size={14} color="#64748b" />
                <Text className="text-slate-700 font-extrabold text-sm">Import More</Text>
              </Pressable>
              <Pressable
                onPress={() => router.replace('/industries/carpet/rolls' as any)}
                className="flex-[2] h-12 rounded-xl bg-emerald-600 items-center justify-center flex-row gap-1.5"
              >
                <Layers size={16} color="#ffffff" />
                <Text className="text-white font-extrabold text-sm">View All Rolls</Text>
              </Pressable>
            </View>
          </View>
        )}
      </ScrollView>
    </SafeAreaView>
  );
}
