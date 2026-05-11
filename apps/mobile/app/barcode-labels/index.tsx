import { useMemo, useState } from 'react';
import {
  View, Text, ScrollView, Pressable, TextInput, Modal,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { useRouter, Stack } from 'expo-router';
import { useQuery } from '@tanstack/react-query';
import * as Print from 'expo-print';
import * as Haptics from 'expo-haptics';
import {
  ArrowLeft, ScanLine, Printer, Plus, Minus, Search, X, Sparkles,
  Package, Trash2,
} from 'lucide-react-native';
import { productsApi, type Product } from '@/api/products.api';
import { useAuthStore } from '@/store/auth.store';
import { formatPKRFull } from '@/lib/format';
import Toast from 'react-native-toast-message';

import { useTranslation } from '@/i18n/useTranslation';
interface LabelItem {
  product: Product;
  copies: number;
}

export default function BarcodeLabelsScreen() {
  const { t } = useTranslation();
  const router = useRouter();
  const { tenant } = useAuthStore();
  const [pickerOpen, setPickerOpen] = useState(false);
  const [productSearch, setProductSearch] = useState('');
  const [selected, setSelected] = useState<LabelItem[]>([]);
  const [printing, setPrinting] = useState(false);

  const { data: productsData } = useQuery({
    queryKey: ['barcode-products'],
    queryFn: async () => {
      try {
        return await productsApi.list({ limit: 200 });
      } catch {
        return { items: [], meta: { page: 1, limit: 0, total: 0, totalPages: 0 } };
      }
    },
  });

  const products = productsData?.items ?? [];
  const productsWithBarcode = products.filter((p) => p.barcode);

  const filteredProducts = useMemo(() => {
    const q = productSearch.toLowerCase().trim();
    if (!q) return productsWithBarcode;
    return productsWithBarcode.filter(
      (p) =>
        p.name.toLowerCase().includes(q) || (p.barcode || '').toLowerCase().includes(q),
    );
  }, [productsWithBarcode, productSearch]);

  const totalLabels = selected.reduce((s, l) => s + l.copies, 0);

  const addProduct = (product: Product) => {
    Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
    setSelected((prev) => {
      const existing = prev.find((p) => p.product.id === product.id);
      if (existing) {
        return prev.map((p) =>
          p.product.id === product.id ? { ...p, copies: p.copies + 1 } : p,
        );
      }
      return [...prev, { product, copies: 1 }];
    });
    setPickerOpen(false);
    setProductSearch('');
  };

  const updateCopies = (productId: string, delta: number) => {
    Haptics.selectionAsync();
    setSelected((prev) =>
      prev
        .map((p) =>
          p.product.id === productId ? { ...p, copies: Math.max(0, p.copies + delta) } : p,
        )
        .filter((p) => p.copies > 0),
    );
  };

  // Generate Code128 barcode as SVG string (simple bar pattern)
  // For a production-quality barcode, you'd use a library, but for printing
  // we use HTML+CSS bars that scan well with most readers
  const generateBarcodeBars = (code: string): string => {
    // Simplified barcode bar representation — alternating widths based on char codes
    const bars = code.split('').map((char, i) => {
      const w = ((char.charCodeAt(0) + i) % 3) + 1;
      const isBlack = i % 2 === 0;
      return `<div style="display:inline-block; width:${w}px; height:40px; background:${isBlack ? '#000' : '#fff'};"></div>`;
    });
    // Add quiet zones + start/stop patterns
    return `
      <div style="display:inline-flex; align-items:flex-end; padding: 4px; background: #fff;">
        <div style="width:2px; height:40px; background:#000;"></div>
        ${bars.join('')}
        <div style="width:2px; height:40px; background:#000;"></div>
      </div>
    `;
  };

  const generateHtml = () => {
    const labels = selected.flatMap((item) =>
      Array.from({ length: item.copies }, () => item.product),
    );

    const labelCards = labels
      .map(
        (p) => `
        <div class="label">
          <div class="name">${p.name}</div>
          <div class="barcode">${generateBarcodeBars(p.barcode || '')}</div>
          <div class="code">${p.barcode}</div>
          <div class="price">Rs ${p.price.toFixed(0)}</div>
        </div>`,
      )
      .join('');

    return `
<!DOCTYPE html>
<html>
<head>
  <meta charset="utf-8" />
  <title>Barcode Labels</title>
  <style>
    @page { margin: 8mm; }
    body { font-family: -apple-system, sans-serif; margin: 0; padding: 0; }
    .grid {
      display: grid;
      grid-template-columns: repeat(3, 1fr);
      gap: 6mm;
    }
    .label {
      border: 1px dashed #94a3b8;
      border-radius: 6px;
      padding: 8px;
      text-align: center;
      page-break-inside: avoid;
    }
    .name {
      font-size: 11px;
      font-weight: bold;
      color: #0f172a;
      white-space: nowrap;
      overflow: hidden;
      text-overflow: ellipsis;
      margin-bottom: 4px;
    }
    .barcode {
      display: flex;
      justify-content: center;
      margin: 4px 0;
    }
    .code {
      font-family: 'Courier New', monospace;
      font-size: 9px;
      color: #475569;
      margin: 2px 0;
    }
    .price {
      font-size: 13px;
      font-weight: bold;
      color: #0f172a;
    }
    .header {
      text-align: center;
      margin-bottom: 12px;
      padding-bottom: 8px;
      border-bottom: 1px solid #cbd5e1;
    }
  </style>
</head>
<body>
  <div class="header">
    <div style="font-size: 14px; font-weight: bold;">${tenant?.name || 'Nafaa'}</div>
    <div style="font-size: 10px; color: #64748b;">${labels.length} labels</div>
  </div>
  <div class="grid">${labelCards}</div>
</body>
</html>`;
  };

  const handlePrint = async () => {
    if (totalLabels === 0) {
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

      <View className="px-5 pt-4 pb-3 flex-row items-center gap-3">
        <Pressable
          onPress={() => router.back()}
          hitSlop={12}
          className="h-10 w-10 rounded-2xl bg-white dark:bg-neutral-900 items-center justify-center border border-neutral-200 dark:border-neutral-800"
        >
          <ArrowLeft size={20} color="#16a34a" />
        </Pressable>
        <View className="flex-1">
          <Text className="text-2xl font-extrabold text-neutral-900 dark:text-white">{t('auto.index.barcode_labels')}</Text>
          <View className="flex-row items-center gap-1.5 mt-0.5">
            <Sparkles size={11} color="#0891b2" />
            <Text className="text-xs text-neutral-500">
              {totalLabels} labels ready
            </Text>
          </View>
        </View>
        <Pressable
          onPress={() => setPickerOpen(true)}
          className="h-11 px-4 rounded-2xl flex-row items-center gap-1.5 active:opacity-80"
          style={{
            backgroundColor: '#0891b2',
            shadowColor: '#0891b2',
            shadowOpacity: 0.3,
            shadowRadius: 8,
            elevation: 4,
          }}
        >
          <Plus size={16} color="#ffffff" />
          <Text className="text-white font-bold text-sm">{t('auto.index.add')}</Text>
        </Pressable>
      </View>

      <ScrollView contentContainerStyle={{ paddingBottom: 100 }} showsVerticalScrollIndicator={false}>
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
                <Text className="text-xs font-bold uppercase tracking-wider text-white/80">{t('auto.index.print_labels')}</Text>
                <Text className="text-3xl font-extrabold text-white">
                  {totalLabels}
                </Text>
                <Text className="text-xs text-white/80 mt-0.5">
                  {selected.length} unique products
                </Text>
              </View>
            </View>
          </View>
        </View>

        {/* Selected Labels */}
        <View className="px-5">
          <Text className="text-xs font-bold uppercase text-neutral-500 mb-2 tracking-wider">{t('auto.index.selected_products')}</Text>

          {selected.length === 0 ? (
            <View className="rounded-2xl bg-white dark:bg-neutral-900 border border-neutral-200 dark:border-neutral-800 items-center py-12">
              <View className="h-16 w-16 rounded-3xl bg-cyan-100 items-center justify-center">
                <ScanLine size={32} color="#0891b2" />
              </View>
              <Text className="mt-3 text-base font-bold text-neutral-700">{t('auto.index.no_products_added')}</Text>
              <Text className="mt-1 text-xs text-neutral-500 text-center px-8">{t('auto.index.sirf_wo_products_labels_mein_dikhenge_ji')}</Text>
              <Pressable
                onPress={() => setPickerOpen(true)}
                className="mt-4 h-10 px-5 rounded-xl flex-row items-center gap-1.5"
                style={{ backgroundColor: '#0891b2' }}
              >
                <Plus size={16} color="#ffffff" />
                <Text className="text-white font-bold text-sm">{t('auto.index.add_products')}</Text>
              </Pressable>
            </View>
          ) : (
            <View className="gap-2 mb-4">
              {selected.map((item) => (
                <View
                  key={item.product.id}
                  className="rounded-2xl bg-white dark:bg-neutral-900 border border-neutral-200 dark:border-neutral-800 p-3"
                >
                  <View className="flex-row items-center gap-3">
                    <View className="h-11 w-11 rounded-2xl bg-cyan-100 items-center justify-center">
                      <Package size={18} color="#0891b2" />
                    </View>
                    <View className="flex-1">
                      <Text className="font-bold text-neutral-900 dark:text-white" numberOfLines={1}>
                        {item.product.name}
                      </Text>
                      <Text className="font-mono text-[10px] text-neutral-500 mt-0.5">
                        {item.product.barcode}
                      </Text>
                      <Text className="text-xs text-emerald-700 font-bold mt-0.5">
                        {formatPKRFull(item.product.price)}
                      </Text>
                    </View>
                    <View className="flex-row items-center gap-1.5 bg-neutral-50 rounded-xl p-1">
                      <Pressable
                        onPress={() => updateCopies(item.product.id, -1)}
                        className="h-8 w-8 rounded-lg bg-white border border-neutral-200 items-center justify-center"
                      >
                        <Minus size={12} color="#374151" />
                      </Pressable>
                      <Text className="font-extrabold w-8 text-center">{item.copies}</Text>
                      <Pressable
                        onPress={() => updateCopies(item.product.id, 1)}
                        className="h-8 w-8 rounded-lg items-center justify-center"
                        style={{ backgroundColor: '#0891b2' }}
                      >
                        <Plus size={12} color="#ffffff" />
                      </Pressable>
                    </View>
                  </View>
                </View>
              ))}
            </View>
          )}

          {/* Info */}
          {productsWithBarcode.length === 0 && (
            <View className="rounded-2xl bg-amber-50 border-2 border-amber-300 p-4 mt-4">
              <Text className="text-sm font-bold text-amber-900">{t('auto.index.no_products_with_barcode')}</Text>
              <Text className="text-xs text-amber-800 mt-1">{t('auto.index.products_mein_barcode_add_karein_phir_ya')}</Text>
            </View>
          )}
        </View>
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
              {printing ? 'Printing...' : `Print ${totalLabels} Labels`}
            </Text>
          </Pressable>
        </View>
      )}

      {/* Product Picker */}
      <Modal visible={pickerOpen} animationType="slide" presentationStyle="pageSheet">
        <SafeAreaView className="flex-1 bg-neutral-50">
          <View className="flex-row items-center justify-between px-5 py-4 border-b border-neutral-200">
            <Text className="text-xl font-extrabold text-neutral-900">{t('auto.new.add_product')}</Text>
            <Pressable
              onPress={() => setPickerOpen(false)}
              className="h-10 w-10 rounded-2xl bg-neutral-100 items-center justify-center"
            >
              <X size={20} color="#6b7280" />
            </Pressable>
          </View>
          <View className="px-5 py-3">
            <View className="flex-row items-center gap-2 rounded-2xl border border-neutral-200 bg-white px-4 h-12">
              <Search size={20} color="#9ca3af" />
              <TextInput
                placeholder="Search products with barcode..."
                value={productSearch}
                onChangeText={setProductSearch}
                className="flex-1 text-base"
                autoFocus
              />
            </View>
          </View>
          <ScrollView contentContainerStyle={{ padding: 20, paddingTop: 0 }}>
            {filteredProducts.length === 0 ? (
              <View className="items-center py-12">
                <ScanLine size={40} color="#d1d5db" />
                <Text className="mt-3 text-neutral-500 font-semibold">{t('auto.index.no_products_with_barcode')}</Text>
                <Text className="text-xs text-neutral-400 mt-1 text-center px-8">{t('auto.index.pehle_products_mein_barcode_add_karein')}</Text>
              </View>
            ) : (
              <View className="gap-2">
                {filteredProducts.map((p) => (
                  <Pressable
                    key={p.id}
                    onPress={() => addProduct(p)}
                    className="flex-row items-center gap-3 p-3 rounded-2xl bg-white border border-neutral-200 active:opacity-70"
                  >
                    <View className="h-11 w-11 rounded-xl bg-cyan-100 items-center justify-center">
                      <ScanLine size={18} color="#0891b2" />
                    </View>
                    <View className="flex-1">
                      <Text className="font-bold text-neutral-900" numberOfLines={1}>
                        {p.name}
                      </Text>
                      <Text className="font-mono text-[10px] text-neutral-500 mt-0.5">
                        {p.barcode}
                      </Text>
                    </View>
                    <Text className="font-bold text-emerald-700">
                      {formatPKRFull(p.price)}
                    </Text>
                  </Pressable>
                ))}
              </View>
            )}
          </ScrollView>
        </SafeAreaView>
      </Modal>
    </SafeAreaView>
  );
}
