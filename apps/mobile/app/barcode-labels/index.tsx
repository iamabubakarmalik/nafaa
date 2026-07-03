import { useMemo, useState } from 'react';
import {
  View, Text, ScrollView, Pressable, TextInput, Modal,
  KeyboardAvoidingView, Platform, Alert,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { useRouter, Stack } from 'expo-router';
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import * as Print from 'expo-print';
import * as Haptics from 'expo-haptics';
import {
  ArrowLeft, ScanLine, Printer, Plus, Minus, Search, X, Sparkles,
  Package, Trash2, Wand2, Settings2, CheckCircle2, AlertCircle,
  Building2, DollarSign, Tag, Hash, Edit3, RefreshCw, Filter,
  Eye, EyeOff, Layers, ChevronDown,
} from 'lucide-react-native';
import { productsApi, type Product } from '@/api/products.api';
import { categoriesApi } from '@/api/categories.api';
import { settingsApi } from '@/api/settings.api';
import { useAuthStore } from '@/store/auth.store';
import { formatPKRFull } from '@/lib/format';
import { BarcodeSvg } from '@/components/barcode/BarcodeSvg';
import Toast from 'react-native-toast-message';

interface LabelItem {
  id: string;
  product: Product;
  copies: number;
}

type LabelSize = 'small' | 'medium' | 'large' | 'xlarge' | 'jewelry';
type BarcodeFormat = 'CODE128' | 'CODE39' | 'EAN13' | 'UPC';
type StockFilter = 'all' | 'with-barcode' | 'without-barcode';

const SIZE_CONFIG: Record<LabelSize, any> = {
  small: {
    label: 'Small (40×25mm)',
    desc: 'Thermal printer',
    cols: 5,
    height: 65,
    barcodeHeight: 28,
    barcodeWidth: 1.1,
    fontSize: 8,
    nameSize: 8,
    priceSize: 10,
  },
  medium: {
    label: 'Medium (50×30mm)',
    desc: 'Standard thermal',
    cols: 4,
    height: 80,
    barcodeHeight: 38,
    barcodeWidth: 1.3,
    fontSize: 10,
    nameSize: 10,
    priceSize: 12,
  },
  large: {
    label: 'Large (70×40mm)',
    desc: 'A4 sheet labels',
    cols: 3,
    height: 100,
    barcodeHeight: 48,
    barcodeWidth: 1.5,
    fontSize: 12,
    nameSize: 12,
    priceSize: 14,
  },
  xlarge: {
    label: 'X-Large (100×50mm)',
    desc: 'Detailed labels',
    cols: 2,
    height: 130,
    barcodeHeight: 60,
    barcodeWidth: 1.8,
    fontSize: 14,
    nameSize: 14,
    priceSize: 16,
  },
  jewelry: {
    label: 'Jewelry (30×20mm)',
    desc: 'Small price tags',
    cols: 6,
    height: 50,
    barcodeHeight: 22,
    barcodeWidth: 1,
    fontSize: 7,
    nameSize: 7,
    priceSize: 9,
  },
};

export default function BarcodeLabelsScreen() {
  const router = useRouter();
  const queryClient = useQueryClient();
  const { tenant } = useAuthStore();

  const [selected, setSelected] = useState<LabelItem[]>([]);
  const [pickerOpen, setPickerOpen] = useState(false);
  const [productSearch, setProductSearch] = useState('');
  const [categoryFilter, setCategoryFilter] = useState('');
  const [stockFilter, setStockFilter] = useState<StockFilter>('all');
  const [labelSize, setLabelSize] = useState<LabelSize>('medium');
  const [barcodeFormat, setBarcodeFormat] = useState<BarcodeFormat>('CODE128');
  const [showShopName, setShowShopName] = useState(true);
  const [showPrice, setShowPrice] = useState(true);
  const [showCategory, setShowCategory] = useState(false);
  const [showSku, setShowSku] = useState(false);
  const [settingsOpen, setSettingsOpen] = useState(false);
  const [editingProduct, setEditingProduct] = useState<Product | null>(null);
  const [printing, setPrinting] = useState(false);

  // ─── QUERIES ─────────────────────────
  const { data: productsData, refetch: refetchProducts } = useQuery({
    queryKey: ['barcode-products'],
    queryFn: async () => {
      try {
        return await productsApi.list({ limit: 500 });
      } catch {
        return { items: [], meta: { page: 1, limit: 0, total: 0, totalPages: 0 } };
      }
    },
  });

  const { data: categories = [] } = useQuery({
    queryKey: ['categories'],
    queryFn: () => categoriesApi.list(),
  });

  const { data: settings } = useQuery({
    queryKey: ['settings'],
    queryFn: () => settingsApi.get(),
  });

  const products = productsData?.items ?? [];

  // ─── FILTERED ─────────────────────────
  const filteredProducts = useMemo(() => {
    const q = productSearch.toLowerCase().trim();
    return products.filter((p) => {
      if (categoryFilter && p.categoryId !== categoryFilter) return false;
      if (stockFilter === 'with-barcode' && !p.barcode) return false;
      if (stockFilter === 'without-barcode' && p.barcode) return false;
      if (!q) return true;
      return (
        p.name.toLowerCase().includes(q) ||
        (p.sku || '').toLowerCase().includes(q) ||
        (p.barcode || '').toLowerCase().includes(q)
      );
    });
  }, [products, productSearch, categoryFilter, stockFilter]);

  // ─── STATS ─────────────────────────
  const stats = useMemo(() => {
    const withBarcode = products.filter((p) => p.barcode).length;
    return {
      total: products.length,
      withBarcode,
      withoutBarcode: products.length - withBarcode,
    };
  }, [products]);

  const labelsToPrint = useMemo(
    () =>
      selected.flatMap((item) =>
        Array.from({ length: item.copies }, (_, i) => ({
          ...item,
          _key: `${item.id}-${i}`,
        })),
      ),
    [selected],
  );

  const config = SIZE_CONFIG[labelSize];
  const shopName =
    (settings as any)?.shopName ||
    (settings as any)?.legalName ||
    tenant?.name ||
    'My Shop';

  // ─── MUTATIONS ─────────────────────────
  const generateBarcodeMutation = useMutation({
    mutationFn: (id: string) => productsApi.generateBarcode(id),
    onSuccess: (updated) => {
      Haptics.notificationAsync(Haptics.NotificationFeedbackType.Success);
      Toast.show({
        type: 'success',
        text1: 'Barcode generated!',
        text2: updated.barcode || undefined,
      });
      queryClient.invalidateQueries({ queryKey: ['barcode-products'] });
      queryClient.invalidateQueries({ queryKey: ['products'] });
    },
    onError: () => Toast.show({ type: 'error', text1: 'Generate failed' }),
  });

  const bulkGenerateMutation = useMutation({
    mutationFn: (productIds: string[]) => productsApi.bulkGenerateBarcodes(productIds),
    onSuccess: (result) => {
      Haptics.notificationAsync(Haptics.NotificationFeedbackType.Success);
      Toast.show({
        type: 'success',
        text1: `${result.count} barcodes generated!`,
      });
      queryClient.invalidateQueries({ queryKey: ['barcode-products'] });
      queryClient.invalidateQueries({ queryKey: ['products'] });
    },
    onError: () => Toast.show({ type: 'error', text1: 'Bulk generate failed' }),
  });

  const updateProductMutation = useMutation({
    mutationFn: ({ id, payload }: { id: string; payload: any }) =>
      productsApi.update(id, payload),
    onSuccess: () => {
      Toast.show({ type: 'success', text1: 'Barcode updated' });
      queryClient.invalidateQueries({ queryKey: ['barcode-products'] });
      queryClient.invalidateQueries({ queryKey: ['products'] });
      setEditingProduct(null);
    },
    onError: () => Toast.show({ type: 'error', text1: 'Update failed' }),
  });

  // ─── HANDLERS ─────────────────────────
  const addProduct = (product: Product) => {
    if (!product.barcode) {
      Alert.alert(
        'No Barcode',
        `"${product.name}" mein barcode nahi hai. Auto-generate karein?`,
        [
          { text: 'Cancel', style: 'cancel' },
          {
            text: 'Generate',
            onPress: async () => {
              await generateBarcodeMutation.mutateAsync(product.id);
              Toast.show({ type: 'success', text1: 'Ab dobara add karein' });
            },
          },
        ],
      );
      return;
    }

    Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
    setSelected((prev) => {
      const existing = prev.find((p) => p.id === product.id);
      if (existing) {
        return prev.map((p) => (p.id === product.id ? { ...p, copies: p.copies + 1 } : p));
      }
      return [...prev, { id: product.id, product, copies: 1 }];
    });
    setPickerOpen(false);
    setProductSearch('');
  };

  const updateCopies = (id: string, delta: number) => {
    Haptics.selectionAsync();
    setSelected((prev) =>
      prev
        .map((p) => (p.id === id ? { ...p, copies: Math.max(0, p.copies + delta) } : p))
        .filter((p) => p.copies > 0),
    );
  };

  const setCopies = (id: string, copies: number) => {
    setSelected((prev) =>
      prev
        .map((p) => (p.id === id ? { ...p, copies: Math.max(0, copies) } : p))
        .filter((p) => p.copies > 0),
    );
  };

  const setAllCopies = (copies: number) => {
    Haptics.selectionAsync();
    setSelected((prev) => prev.map((p) => ({ ...p, copies })));
    Toast.show({ type: 'success', text1: `All set to ${copies} copies` });
  };

  const removeItem = (id: string) => {
    Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
    setSelected((prev) => prev.filter((p) => p.id !== id));
  };

  const handleAddAll = () => {
    let added = 0;
    filteredProducts.forEach((p) => {
      if (p.barcode) {
        setSelected((prev) => {
          const existing = prev.find((x) => x.id === p.id);
          if (existing) return prev;
          return [...prev, { id: p.id, product: p, copies: 1 }];
        });
        added++;
      }
    });
    Toast.show({ type: 'success', text1: `${added} products added` });
    setPickerOpen(false);
  };

  const handleBulkGenerate = () => {
    const withoutBarcode = filteredProducts.filter((p) => !p.barcode);
    if (withoutBarcode.length === 0) {
      Toast.show({ type: 'error', text1: 'Sab products ke pass already barcodes hain' });
      return;
    }
    Alert.alert(
      'Bulk Generate',
      `${withoutBarcode.length} products ke liye barcodes generate karein?`,
      [
        { text: 'Cancel', style: 'cancel' },
        {
          text: 'Generate All',
          onPress: () => bulkGenerateMutation.mutate(withoutBarcode.map((p) => p.id)),
        },
      ],
    );
  };

  // ─── PRINT HTML (proper barcodes with jsbarcode) ─────────────────────────
  const generateHtml = () => {
    const cfg = config;

    // For print HTML, use jsbarcode via inline SVG generation
    const labelCards = labelsToPrint
      .map((item) => {
        const p = item.product;
        const barcode = p.barcode || '';
        const barcodeId = `bc-${p.id}-${item._key}`;

        return `
        <div class="label">
          ${showShopName ? `<div class="shop">${shopName}</div>` : ''}
          <div class="name">${p.name}</div>
          ${showCategory && p.category ? `<div class="category">${p.category.name}</div>` : ''}
          ${showSku && p.sku ? `<div class="sku">${p.sku}</div>` : ''}
          <svg class="barcode" id="${barcodeId}"></svg>
          ${showPrice ? `<div class="price">Rs ${p.price.toFixed(0)}</div>` : ''}
          <script>
            try {
              JsBarcode("#${barcodeId}", "${barcode}", {
                format: "${barcodeFormat}",
                width: ${cfg.barcodeWidth},
                height: ${cfg.barcodeHeight},
                fontSize: ${cfg.fontSize},
                displayValue: true,
                margin: 2
              });
            } catch(e) {
              try {
                JsBarcode("#${barcodeId}", "${barcode}", {
                  format: "CODE128",
                  width: ${cfg.barcodeWidth},
                  height: ${cfg.barcodeHeight},
                  fontSize: ${cfg.fontSize},
                  displayValue: true,
                  margin: 2
                });
              } catch(e2) {}
            }
          </script>
        </div>`;
      })
      .join('');

    return `<!DOCTYPE html>
<html>
<head>
  <meta charset="utf-8" />
  <title>Barcode Labels</title>
  <script src="https://cdn.jsdelivr.net/npm/jsbarcode@3.11.5/dist/JsBarcode.all.min.js"></script>
  <style>
    @page { margin: 5mm; size: auto; }
    body {
      font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', sans-serif;
      margin: 0;
      padding: 0;
      background: white;
    }
    .grid {
      display: grid;
      grid-template-columns: repeat(${cfg.cols}, 1fr);
      gap: 4mm;
      padding: 4mm;
    }
    .label {
      border: 1.5px dashed #64748b;
      border-radius: 6px;
      padding: 6px 4px;
      text-align: center;
      page-break-inside: avoid;
      background: white;
      display: flex;
      flex-direction: column;
      align-items: center;
      justify-content: center;
    }
    .shop {
      font-size: 8px;
      font-weight: bold;
      color: #334155;
      margin-bottom: 2px;
      max-width: 100%;
      overflow: hidden;
      text-overflow: ellipsis;
      white-space: nowrap;
    }
    .name {
      font-size: ${cfg.nameSize}px;
      font-weight: 800;
      color: #0f172a;
      line-height: 1.1;
      max-width: 100%;
      overflow: hidden;
      text-overflow: ellipsis;
      white-space: nowrap;
      margin-bottom: 2px;
    }
    .category {
      font-size: 7px;
      color: #64748b;
      font-weight: bold;
    }
    .sku {
      font-size: 7px;
      font-family: 'Courier New', monospace;
      color: #64748b;
    }
    .barcode {
      margin: 2px 0;
      max-width: 100%;
    }
    .price {
      font-size: ${cfg.priceSize}px;
      font-weight: 800;
      color: #0f172a;
      margin-top: 2px;
    }
  </style>
</head>
<body>
  <div class="grid">${labelCards}</div>
</body>
</html>`;
  };

  const handlePrint = async () => {
    if (labelsToPrint.length === 0) {
      Toast.show({ type: 'error', text1: 'Add products first' });
      return;
    }
    Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Medium);
    setPrinting(true);
    try {
      await Print.printAsync({ html: generateHtml() });
      Haptics.notificationAsync(Haptics.NotificationFeedbackType.Success);
    } catch (e: any) {
      if (e?.message && !e.message.includes('cancelled')) {
        Toast.show({ type: 'error', text1: 'Print failed' });
      }
    } finally {
      setPrinting(false);
    }
  };

  return (
    <SafeAreaView className="flex-1 bg-neutral-50 dark:bg-neutral-950" edges={['top']}>
      <Stack.Screen options={{ headerShown: false }} />

      {/* Header */}
      <View className="px-5 pt-4 pb-3 flex-row items-center gap-3">
        <Pressable
          onPress={() => router.back()}
          hitSlop={12}
          className="h-10 w-10 rounded-2xl bg-white dark:bg-neutral-900 items-center justify-center border border-neutral-200 dark:border-neutral-800"
        >
          <ArrowLeft size={20} color="#16a34a" />
        </Pressable>
        <View className="flex-1">
          <Text className="text-2xl font-extrabold text-neutral-900 dark:text-white">
            Barcode Labels
          </Text>
          <View className="flex-row items-center gap-1.5 mt-0.5">
            <Sparkles size={11} color="#0891b2" />
            <Text className="text-xs text-neutral-500">
              {labelsToPrint.length} labels • {config.label.split('(')[0].trim()}
            </Text>
          </View>
        </View>
        <Pressable
          onPress={() => setSettingsOpen(true)}
          hitSlop={12}
          className="h-11 w-11 rounded-2xl bg-white dark:bg-neutral-900 border border-neutral-200 items-center justify-center"
        >
          <Settings2 size={18} color="#0891b2" />
        </Pressable>
      </View>

      <ScrollView contentContainerStyle={{ paddingBottom: 120 }} showsVerticalScrollIndicator={false}>
        {/* Hero */}
        <View className="px-5 mb-4">
          <View
            className="rounded-3xl p-5"
            style={{
              backgroundColor: '#0891b2',
              shadowColor: '#0891b2',
              shadowOpacity: 0.3,
              shadowRadius: 16,
              shadowOffset: { width: 0, height: 8 },
              elevation: 10,
            }}
          >
            <View className="flex-row items-center gap-3">
              <View className="h-14 w-14 rounded-2xl bg-white/20 items-center justify-center">
                <ScanLine size={28} color="#ffffff" />
              </View>
              <View className="flex-1">
                <Text className="text-xs font-bold uppercase tracking-wider text-white/80">
                  Barcode Label Studio
                </Text>
                <Text className="text-3xl font-extrabold text-white">
                  {labelsToPrint.length}
                </Text>
                <Text className="text-xs text-white/80 mt-0.5">
                  {selected.length} unique • {config.label}
                </Text>
              </View>
            </View>
          </View>
        </View>

        {/* Stats Grid */}
        <View className="px-5 mb-4">
          <View className="flex-row flex-wrap -mx-1.5">
            <View className="w-1/3 px-1.5">
              <View className="rounded-2xl bg-white dark:bg-neutral-900 border-2 border-violet-200 p-3">
                <View className="flex-row items-center gap-1 mb-1">
                  <Package size={12} color="#7c3aed" />
                  <Text className="text-[9px] font-extrabold uppercase text-violet-700">
                    Total
                  </Text>
                </View>
                <Text className="text-2xl font-extrabold text-violet-900">
                  {stats.total}
                </Text>
              </View>
            </View>
            <View className="w-1/3 px-1.5">
              <View className="rounded-2xl bg-white dark:bg-neutral-900 border-2 border-emerald-200 p-3">
                <View className="flex-row items-center gap-1 mb-1">
                  <CheckCircle2 size={12} color="#16a34a" />
                  <Text className="text-[9px] font-extrabold uppercase text-emerald-700">
                    With BC
                  </Text>
                </View>
                <Text className="text-2xl font-extrabold text-emerald-900">
                  {stats.withBarcode}
                </Text>
              </View>
            </View>
            <View className="w-1/3 px-1.5">
              <View className="rounded-2xl bg-white dark:bg-neutral-900 border-2 border-amber-200 p-3">
                <View className="flex-row items-center gap-1 mb-1">
                  <AlertCircle size={12} color="#d97706" />
                  <Text className="text-[9px] font-extrabold uppercase text-amber-700">
                    Missing
                  </Text>
                </View>
                <Text className="text-2xl font-extrabold text-amber-900">
                  {stats.withoutBarcode}
                </Text>
              </View>
            </View>
          </View>

          {stats.withoutBarcode > 0 && (
            <Pressable
              onPress={handleBulkGenerate}
              disabled={bulkGenerateMutation.isPending}
              className="mt-2 rounded-xl bg-violet-600 p-3 flex-row items-center justify-center gap-2 active:opacity-80"
              style={{ opacity: bulkGenerateMutation.isPending ? 0.5 : 1 }}
            >
              <Wand2 size={14} color="#ffffff" />
              <Text className="text-white font-extrabold text-xs">
                {bulkGenerateMutation.isPending
                  ? 'Generating...'
                  : `Auto-Generate ${stats.withoutBarcode} Missing Barcodes`}
              </Text>
            </Pressable>
          )}
        </View>

        {/* Actions Row */}
        <View className="px-5 mb-4 flex-row gap-2">
          <Pressable
            onPress={() => setPickerOpen(true)}
            className="flex-1 h-11 rounded-xl flex-row items-center justify-center gap-1.5 active:opacity-80"
            style={{ backgroundColor: '#0891b2' }}
          >
            <Plus size={16} color="#ffffff" />
            <Text className="text-white font-bold text-sm">Add Products</Text>
          </Pressable>
          {selected.length > 0 && (
            <Pressable
              onPress={() => {
                Alert.alert('Clear all?', 'Sure?', [
                  { text: 'Cancel', style: 'cancel' },
                  { text: 'Clear', style: 'destructive', onPress: () => setSelected([]) },
                ]);
              }}
              className="h-11 px-4 rounded-xl bg-rose-50 border-2 border-rose-300 flex-row items-center gap-1.5"
            >
              <Trash2 size={14} color="#dc2626" />
              <Text className="text-rose-700 font-bold text-sm">Clear</Text>
            </Pressable>
          )}
        </View>

        {/* Quick Set All */}
        {selected.length > 0 && (
          <View className="px-5 mb-4">
            <View className="rounded-2xl bg-white dark:bg-neutral-900 border border-neutral-200 p-3">
              <View className="flex-row items-center justify-between mb-2">
                <Text className="text-[10px] font-extrabold uppercase text-neutral-500 tracking-wider">
                  Quick Set All Copies
                </Text>
                <Text className="text-[10px] text-neutral-500">
                  {labelsToPrint.length} labels total
                </Text>
              </View>
              <View className="flex-row gap-2">
                {[1, 5, 10, 20, 50].map((n) => (
                  <Pressable
                    key={n}
                    onPress={() => setAllCopies(n)}
                    className="flex-1 h-9 rounded-lg bg-cyan-50 border border-cyan-200 items-center justify-center active:opacity-70"
                  >
                    <Text className="text-cyan-700 font-extrabold text-sm">×{n}</Text>
                  </Pressable>
                ))}
              </View>
            </View>
          </View>
        )}

        {/* Selected Products */}
        <View className="px-5">
          <Text className="text-xs font-bold uppercase text-neutral-500 mb-2 tracking-wider">
            Selected ({selected.length})
          </Text>

          {selected.length === 0 ? (
            <View className="rounded-2xl bg-white dark:bg-neutral-900 border-2 border-dashed border-neutral-200 items-center py-12">
              <View className="h-16 w-16 rounded-3xl bg-cyan-100 items-center justify-center">
                <ScanLine size={32} color="#0891b2" />
              </View>
              <Text className="mt-3 text-base font-bold text-neutral-700">
                No products added
              </Text>
              <Text className="mt-1 text-xs text-neutral-500 text-center px-8">
                Sirf barcode-wale products labels mein a-sakenge
              </Text>
              <Pressable
                onPress={() => setPickerOpen(true)}
                className="mt-4 h-10 px-5 rounded-xl flex-row items-center gap-1.5"
                style={{ backgroundColor: '#0891b2' }}
              >
                <Plus size={16} color="#ffffff" />
                <Text className="text-white font-bold text-sm">Add Products</Text>
              </Pressable>
            </View>
          ) : (
            <View className="gap-2">
              {selected.map((item) => (
                <View
                  key={item.id}
                  className="rounded-2xl bg-white dark:bg-neutral-900 border border-neutral-200 dark:border-neutral-800 p-3"
                >
                  <View className="flex-row items-center gap-3">
                    <View className="h-11 w-11 rounded-2xl bg-cyan-100 items-center justify-center">
                      <ScanLine size={18} color="#0891b2" />
                    </View>
                    <View className="flex-1 min-w-0">
                      <Text
                        className="font-bold text-neutral-900 dark:text-white"
                        numberOfLines={1}
                      >
                        {item.product.name}
                      </Text>
                      <Text className="font-mono text-[10px] text-neutral-500 mt-0.5">
                        {item.product.barcode}
                      </Text>
                      <Text className="text-xs text-emerald-700 font-bold mt-0.5">
                        {formatPKRFull(item.product.price)}
                      </Text>
                    </View>
                    <View className="flex-row items-center gap-1 bg-neutral-50 rounded-xl p-1">
                      <Pressable
                        onPress={() => updateCopies(item.id, -1)}
                        className="h-8 w-8 rounded-lg bg-white border border-neutral-200 items-center justify-center"
                      >
                        <Minus size={12} color="#374151" />
                      </Pressable>
                      <TextInput
                        value={String(item.copies)}
                        onChangeText={(t) => setCopies(item.id, parseInt(t) || 0)}
                        keyboardType="number-pad"
                        className="w-10 text-center font-extrabold text-neutral-900"
                      />
                      <Pressable
                        onPress={() => updateCopies(item.id, 1)}
                        className="h-8 w-8 rounded-lg items-center justify-center"
                        style={{ backgroundColor: '#0891b2' }}
                      >
                        <Plus size={12} color="#ffffff" />
                      </Pressable>
                    </View>
                    <Pressable
                      onPress={() => removeItem(item.id)}
                      className="h-8 w-8 rounded-lg bg-rose-50 items-center justify-center"
                    >
                      <X size={12} color="#dc2626" />
                    </Pressable>
                  </View>
                </View>
              ))}
            </View>
          )}
        </View>

        {/* Preview */}
        {labelsToPrint.length > 0 && (
          <View className="px-5 mt-4">
            <View className="flex-row items-center gap-2 mb-3">
              <Eye size={14} color="#0891b2" />
              <Text className="text-xs font-bold uppercase text-neutral-500 tracking-wider">
                Preview ({config.label})
              </Text>
            </View>
            <View className="rounded-2xl bg-white dark:bg-neutral-900 border border-neutral-200 p-3">
              <View className="flex-row flex-wrap -m-1">
                {labelsToPrint.slice(0, 12).map((item) => (
                  <View
                    key={item._key}
                    className="p-1"
                    style={{ width: `${100 / Math.min(config.cols, 3)}%` }}
                  >
                    <View className="rounded-lg border border-dashed border-neutral-300 p-2 items-center">
                      {showShopName && (
                        <Text
                          style={{ fontSize: 7 }}
                          className="font-extrabold text-neutral-700 max-w-full"
                          numberOfLines={1}
                        >
                          {shopName}
                        </Text>
                      )}
                      <Text
                        style={{ fontSize: config.nameSize / 1.5 }}
                        className="font-extrabold text-neutral-900 max-w-full mt-0.5"
                        numberOfLines={1}
                      >
                        {item.product.name}
                      </Text>
                      <View style={{ marginVertical: 4 }}>
                        <BarcodeSvg
                          value={item.product.barcode || ''}
                          height={config.barcodeHeight / 2}
                          width={config.barcodeWidth / 2}
                          fontSize={7}
                          format={barcodeFormat}
                        />
                      </View>
                      {showPrice && (
                        <Text
                          style={{ fontSize: config.priceSize / 1.4 }}
                          className="font-extrabold text-neutral-900"
                        >
                          Rs {item.product.price.toFixed(0)}
                        </Text>
                      )}
                    </View>
                  </View>
                ))}
              </View>
              {labelsToPrint.length > 12 && (
                <Text className="text-center text-[10px] text-neutral-500 font-bold mt-2">
                  +{labelsToPrint.length - 12} more labels
                </Text>
              )}
            </View>
          </View>
        )}
      </ScrollView>

      {/* Print Button */}
      {selected.length > 0 && (
        <View className="px-5 py-4 border-t border-neutral-200 dark:border-neutral-800 bg-white dark:bg-neutral-900">
          <Pressable
            onPress={handlePrint}
            disabled={printing}
            className="h-14 rounded-2xl items-center justify-center flex-row gap-2 active:opacity-80"
            style={{
              backgroundColor: printing ? '#9ca3af' : '#0891b2',
              shadowColor: '#0891b2',
              shadowOpacity: 0.4,
              shadowRadius: 12,
              elevation: 6,
            }}
          >
            <Printer size={20} color="#ffffff" />
            <Text className="text-white font-extrabold text-base">
              {printing ? 'Printing...' : `Print ${labelsToPrint.length} Labels`}
            </Text>
          </Pressable>
        </View>
      )}

      {/* ═════ SETTINGS MODAL ═════ */}
      <Modal visible={settingsOpen} animationType="slide" presentationStyle="pageSheet" onRequestClose={() => setSettingsOpen(false)}>
        <SafeAreaView className="flex-1 bg-neutral-50">
          <View className="px-5 py-4 border-b border-neutral-200 flex-row items-center gap-3">
            <View className="h-11 w-11 rounded-2xl bg-cyan-600 items-center justify-center">
              <Settings2 size={20} color="#ffffff" />
            </View>
            <View className="flex-1">
              <Text className="text-lg font-bold text-neutral-900">Label Settings</Text>
              <Text className="text-xs text-neutral-500">Size, format, options</Text>
            </View>
            <Pressable
              onPress={() => setSettingsOpen(false)}
              hitSlop={12}
              className="h-10 w-10 rounded-2xl bg-neutral-100 items-center justify-center"
            >
              <X size={20} color="#6b7280" />
            </Pressable>
          </View>
          <ScrollView contentContainerStyle={{ padding: 20 }}>
            {/* Label Size */}
            <Text className="text-[10px] uppercase font-extrabold text-neutral-500 tracking-wider mb-2">
              Label Size
            </Text>
            <View className="gap-2 mb-4">
              {(Object.entries(SIZE_CONFIG) as [LabelSize, any][]).map(([key, cfg]) => {
                const active = labelSize === key;
                return (
                  <Pressable
                    key={key}
                    onPress={() => {
                      Haptics.selectionAsync();
                      setLabelSize(key);
                    }}
                    className="rounded-2xl border-2 p-3 flex-row items-center gap-3"
                    style={{
                      backgroundColor: active ? '#cffafe' : '#ffffff',
                      borderColor: active ? '#0891b2' : '#e5e7eb',
                    }}
                  >
                    <View
                      className="h-10 w-10 rounded-xl items-center justify-center"
                      style={{ backgroundColor: active ? '#0891b2' : '#f3f4f6' }}
                    >
                      <ScanLine size={18} color={active ? '#ffffff' : '#6b7280'} />
                    </View>
                    <View className="flex-1">
                      <Text className="font-extrabold text-neutral-900">{cfg.label}</Text>
                      <Text className="text-[10px] text-neutral-500 font-bold">{cfg.desc}</Text>
                    </View>
                    {active && <CheckCircle2 size={20} color="#0891b2" />}
                  </Pressable>
                );
              })}
            </View>

            {/* Barcode Format */}
            <Text className="text-[10px] uppercase font-extrabold text-neutral-500 tracking-wider mb-2">
              Barcode Format
            </Text>
            <View className="flex-row flex-wrap -m-1 mb-4">
              {(['CODE128', 'CODE39', 'EAN13', 'UPC'] as BarcodeFormat[]).map((f) => {
                const active = barcodeFormat === f;
                return (
                  <View key={f} className="w-1/2 p-1">
                    <Pressable
                      onPress={() => {
                        Haptics.selectionAsync();
                        setBarcodeFormat(f);
                      }}
                      className="h-11 rounded-xl items-center justify-center border-2"
                      style={{
                        backgroundColor: active ? '#0891b2' : '#ffffff',
                        borderColor: active ? '#0891b2' : '#e5e7eb',
                      }}
                    >
                      <Text
                        className="text-sm font-extrabold"
                        style={{ color: active ? '#ffffff' : '#374151' }}
                      >
                        {f}
                      </Text>
                    </Pressable>
                  </View>
                );
              })}
            </View>

            {/* Show/Hide toggles */}
            <Text className="text-[10px] uppercase font-extrabold text-neutral-500 tracking-wider mb-2">
              Show on Label
            </Text>
            <View className="gap-2">
              <ToggleRow
                label="Shop Name"
                icon={Building2}
                value={showShopName}
                onChange={setShowShopName}
              />
              <ToggleRow
                label="Price"
                icon={DollarSign}
                value={showPrice}
                onChange={setShowPrice}
              />
              <ToggleRow
                label="Category"
                icon={Tag}
                value={showCategory}
                onChange={setShowCategory}
              />
              <ToggleRow
                label="SKU"
                icon={Hash}
                value={showSku}
                onChange={setShowSku}
              />
            </View>
          </ScrollView>
        </SafeAreaView>
      </Modal>

      {/* ═════ PRODUCT PICKER MODAL ═════ */}
      <Modal visible={pickerOpen} animationType="slide" presentationStyle="pageSheet" onRequestClose={() => setPickerOpen(false)}>
        <SafeAreaView className="flex-1 bg-neutral-50">
          <View className="px-5 py-4 border-b border-neutral-200 flex-row items-center gap-3">
            <View className="h-11 w-11 rounded-2xl bg-cyan-600 items-center justify-center">
              <Package size={20} color="#ffffff" />
            </View>
            <View className="flex-1">
              <Text className="text-lg font-bold text-neutral-900">Add Products</Text>
              <Text className="text-xs text-neutral-500">
                {filteredProducts.length} of {products.length}
              </Text>
            </View>
            <Pressable
              onPress={() => setPickerOpen(false)}
              hitSlop={12}
              className="h-10 w-10 rounded-2xl bg-neutral-100 items-center justify-center"
            >
              <X size={20} color="#6b7280" />
            </Pressable>
          </View>

          {/* Search + Filters */}
          <View className="px-5 py-3 border-b border-neutral-200 gap-2">
            <View className="flex-row items-center gap-2 rounded-2xl border border-neutral-200 bg-white px-4 h-12">
              <Search size={20} color="#9ca3af" />
              <TextInput
                placeholder="Search name, SKU, barcode..."
                value={productSearch}
                onChangeText={setProductSearch}
                autoFocus
                className="flex-1 text-base"
              />
              {productSearch.length > 0 && (
                <Pressable
                  onPress={() => setProductSearch('')}
                  hitSlop={12}
                  className="h-7 w-7 rounded-full bg-neutral-100 items-center justify-center"
                >
                  <X size={14} color="#9ca3af" />
                </Pressable>
              )}
            </View>

            <View className="flex-row gap-1">
              {[
                { v: 'all' as StockFilter, l: 'All', c: '#0f172a' },
                { v: 'with-barcode' as StockFilter, l: 'Has Barcode', c: '#16a34a' },
                { v: 'without-barcode' as StockFilter, l: 'No Barcode', c: '#d97706' },
              ].map((opt) => {
                const active = stockFilter === opt.v;
                return (
                  <Pressable
                    key={opt.v}
                    onPress={() => setStockFilter(opt.v)}
                    className="flex-1 h-9 rounded-lg items-center justify-center"
                    style={{
                      backgroundColor: active ? opt.c : '#ffffff',
                      borderWidth: 2,
                      borderColor: active ? opt.c : '#e5e7eb',
                    }}
                  >
                    <Text
                      className="text-xs font-extrabold"
                      style={{ color: active ? '#ffffff' : '#374151' }}
                    >
                      {opt.l}
                    </Text>
                  </Pressable>
                );
              })}
            </View>

            <View className="flex-row gap-2">
              <Pressable
                onPress={handleAddAll}
                disabled={filteredProducts.length === 0}
                className="flex-1 h-10 rounded-xl flex-row items-center justify-center gap-1.5 active:opacity-80"
                style={{
                  backgroundColor: filteredProducts.length === 0 ? '#9ca3af' : '#16a34a',
                }}
              >
                <Plus size={14} color="#ffffff" />
                <Text className="text-white font-bold text-xs">Add All Visible</Text>
              </Pressable>
              {stats.withoutBarcode > 0 && (
                <Pressable
                  onPress={handleBulkGenerate}
                  disabled={bulkGenerateMutation.isPending}
                  className="flex-1 h-10 rounded-xl flex-row items-center justify-center gap-1.5"
                  style={{ backgroundColor: '#8b5cf6' }}
                >
                  <Wand2 size={14} color="#ffffff" />
                  <Text className="text-white font-bold text-xs">Generate Missing</Text>
                </Pressable>
              )}
            </View>
          </View>

          <ScrollView contentContainerStyle={{ padding: 20 }}>
            {filteredProducts.length === 0 ? (
              <View className="items-center py-16">
                <ScanLine size={40} color="#d1d5db" />
                <Text className="mt-3 font-bold text-neutral-500">No products found</Text>
              </View>
            ) : (
              <View className="gap-2">
                {filteredProducts.map((p) => {
                  const isAdded = selected.some((s) => s.id === p.id);
                  const hasBarcode = !!p.barcode;
                  return (
                    <View
                      key={p.id}
                      className="rounded-2xl bg-white border-2 p-3"
                      style={{
                        borderColor: isAdded ? '#0891b2' : hasBarcode ? '#e5e7eb' : '#fcd34d',
                        backgroundColor: isAdded ? '#f0fdfa' : hasBarcode ? '#ffffff' : '#fffbeb',
                      }}
                    >
                      <View className="flex-row items-center gap-3">
                        <Pressable
                          onPress={() => addProduct(p)}
                          className="flex-row items-center gap-3 flex-1"
                        >
                          <View
                            className="h-11 w-11 rounded-xl items-center justify-center"
                            style={{ backgroundColor: hasBarcode ? '#cffafe' : '#fef3c7' }}
                          >
                            {hasBarcode ? (
                              <ScanLine size={18} color="#0891b2" />
                            ) : (
                              <AlertCircle size={18} color="#d97706" />
                            )}
                          </View>
                          <View className="flex-1 min-w-0">
                            <View className="flex-row items-center gap-1.5">
                              <Text
                                className="font-bold text-neutral-900"
                                numberOfLines={1}
                              >
                                {p.name}
                              </Text>
                              {p.hasVariants && (
                                <View className="flex-row items-center gap-0.5 px-1.5 py-0.5 rounded bg-violet-100">
                                  <Layers size={9} color="#7c3aed" />
                                  <Text className="text-[9px] font-extrabold text-violet-700">
                                    VAR
                                  </Text>
                                </View>
                              )}
                              {isAdded && (
                                <View className="px-1.5 py-0.5 rounded bg-emerald-100">
                                  <Text className="text-[9px] font-extrabold text-emerald-700">
                                    ✓ ADDED
                                  </Text>
                                </View>
                              )}
                            </View>
                            {hasBarcode ? (
                              <Text className="font-mono text-[10px] text-emerald-700 mt-0.5 font-bold">
                                {p.barcode}
                              </Text>
                            ) : (
                              <Text className="text-[10px] text-amber-700 mt-0.5 font-bold">
                                ⚠️ No barcode
                              </Text>
                            )}
                            <Text className="text-xs text-neutral-500 font-bold mt-0.5">
                              {formatPKRFull(p.price)}
                            </Text>
                          </View>
                        </Pressable>
                        <View className="flex-row gap-1">
                          <Pressable
                            onPress={() => setEditingProduct(p)}
                            className="h-9 w-9 rounded-lg bg-blue-100 items-center justify-center"
                          >
                            <Edit3 size={14} color="#2563eb" />
                          </Pressable>
                          {!hasBarcode && (
                            <Pressable
                              onPress={() => generateBarcodeMutation.mutate(p.id)}
                              disabled={generateBarcodeMutation.isPending}
                              className="h-9 w-9 rounded-lg bg-violet-100 items-center justify-center"
                            >
                              <Wand2 size={14} color="#7c3aed" />
                            </Pressable>
                          )}
                        </View>
                      </View>
                    </View>
                  );
                })}
              </View>
            )}
          </ScrollView>
        </SafeAreaView>
      </Modal>

      {/* ═════ EDIT BARCODE MODAL ═════ */}
      {editingProduct && (
        <EditBarcodeModal
          product={editingProduct}
          onClose={() => setEditingProduct(null)}
          onSave={(barcode) =>
            updateProductMutation.mutate({
              id: editingProduct.id,
              payload: { barcode },
            })
          }
          onGenerate={() => generateBarcodeMutation.mutate(editingProduct.id)}
          saving={updateProductMutation.isPending || generateBarcodeMutation.isPending}
        />
      )}
    </SafeAreaView>
  );
}

// ═══════════ Helper Components ═══════════

function ToggleRow({ label, icon: Icon, value, onChange }: any) {
  return (
    <Pressable
      onPress={() => {
        Haptics.selectionAsync();
        onChange(!value);
      }}
      className="flex-row items-center gap-3 p-3 rounded-xl border-2"
      style={{
        backgroundColor: value ? '#cffafe' : '#ffffff',
        borderColor: value ? '#0891b2' : '#e5e7eb',
      }}
    >
      <View
        className="h-10 w-10 rounded-xl items-center justify-center"
        style={{ backgroundColor: value ? '#0891b2' : '#f3f4f6' }}
      >
        <Icon size={18} color={value ? '#ffffff' : '#6b7280'} />
      </View>
      <Text className="flex-1 font-extrabold text-neutral-900">{label}</Text>
      <View
        style={{
          height: 26,
          width: 44,
          borderRadius: 13,
          padding: 2,
          justifyContent: 'center',
          backgroundColor: value ? '#0891b2' : '#d1d5db',
        }}
      >
        <View
          style={{
            height: 22,
            width: 22,
            borderRadius: 11,
            backgroundColor: '#ffffff',
            transform: [{ translateX: value ? 18 : 0 }],
          }}
        />
      </View>
    </Pressable>
  );
}

function EditBarcodeModal({
  product,
  onClose,
  onSave,
  onGenerate,
  saving,
}: {
  product: Product;
  onClose: () => void;
  onSave: (barcode: string) => void;
  onGenerate: () => void;
  saving: boolean;
}) {
  const [barcode, setBarcode] = useState(product.barcode || '');

  return (
    <Modal visible animationType="slide" presentationStyle="formSheet" onRequestClose={onClose}>
      <SafeAreaView className="flex-1 bg-neutral-50">
        <KeyboardAvoidingView
          behavior={Platform.OS === 'ios' ? 'padding' : 'height'}
          className="flex-1"
        >
          <View className="px-5 py-4 border-b border-neutral-200 flex-row items-center gap-3">
            <View className="h-11 w-11 rounded-2xl bg-blue-600 items-center justify-center">
              <Edit3 size={20} color="#ffffff" />
            </View>
            <View className="flex-1">
              <Text className="text-lg font-bold text-neutral-900">Edit Barcode</Text>
              <Text className="text-xs text-neutral-500" numberOfLines={1}>
                {product.name}
              </Text>
            </View>
            <Pressable
              onPress={onClose}
              hitSlop={12}
              className="h-10 w-10 rounded-2xl bg-neutral-100 items-center justify-center"
            >
              <X size={20} color="#6b7280" />
            </Pressable>
          </View>

          <ScrollView contentContainerStyle={{ padding: 20 }}>
            <View className="rounded-2xl bg-blue-50 border border-blue-200 p-3 mb-4">
              <Text className="text-[10px] uppercase font-extrabold text-blue-700 mb-1">
                Product
              </Text>
              <Text className="text-base font-bold text-blue-900">{product.name}</Text>
              {product.sku && (
                <Text className="text-[10px] font-mono text-blue-700 mt-0.5">
                  SKU: {product.sku}
                </Text>
              )}
            </View>

            <Text className="text-xs uppercase font-extrabold text-neutral-500 mb-2 tracking-wider">
              Barcode Value
            </Text>
            <TextInput
              value={barcode}
              onChangeText={setBarcode}
              placeholder="Enter or generate barcode"
              placeholderTextColor="#9ca3af"
              autoFocus
              className="h-14 rounded-2xl border-2 border-neutral-200 bg-white px-4 text-lg font-mono font-bold text-neutral-900"
            />
            <Text className="text-[10px] text-neutral-500 font-bold mt-2">
              Supports CODE128, CODE39, EAN-13, UPC-A
            </Text>

            {barcode && (
              <View className="rounded-2xl bg-white border border-neutral-200 p-4 mt-4 items-center">
                <Text className="text-[10px] uppercase font-extrabold text-neutral-500 mb-2">
                  Preview
                </Text>
                <BarcodeSvg
                  value={barcode}
                  height={50}
                  width={2}
                  fontSize={12}
                  format="CODE128"
                />
              </View>
            )}
          </ScrollView>

          <View className="px-5 py-4 border-t border-neutral-200 flex-row gap-2">
            <Pressable
              onPress={onGenerate}
              disabled={saving}
              className="flex-1 h-14 rounded-2xl items-center justify-center flex-row gap-2"
              style={{ backgroundColor: saving ? '#9ca3af' : '#7c3aed' }}
            >
              <Wand2 size={18} color="#ffffff" />
              <Text className="text-white font-extrabold text-sm">Auto</Text>
            </Pressable>
            <Pressable
              onPress={() => barcode.trim() && onSave(barcode.trim())}
              disabled={saving || !barcode.trim()}
              className="flex-[2] h-14 rounded-2xl items-center justify-center flex-row gap-2"
              style={{
                backgroundColor: saving || !barcode.trim() ? '#9ca3af' : '#2563eb',
              }}
            >
              <CheckCircle2 size={18} color="#ffffff" />
              <Text className="text-white font-extrabold text-base">
                {saving ? 'Saving...' : 'Save'}
              </Text>
            </Pressable>
          </View>
        </KeyboardAvoidingView>
      </SafeAreaView>
    </Modal>
  );
}
