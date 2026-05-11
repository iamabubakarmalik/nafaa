import { useMemo, useState } from 'react';
import {
  View, Text, ScrollView, Pressable, TextInput, Modal,
  KeyboardAvoidingView, Platform,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { useRouter, Stack } from 'expo-router';
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import * as Haptics from 'expo-haptics';
import {
  ArrowLeft, PackagePlus, Sparkles, Plus, Minus, X, Check, Search,
  Truck, Package, Trash2, Banknote, CreditCard, Smartphone,
  Building2, Zap, Wallet, Receipt,
} from 'lucide-react-native';
import { purchasesApi } from '@/api/purchases.api';
import { suppliersApi } from '@/api/suppliers.api';
import { productsApi } from '@/api/products.api';
import type { PaymentMethod } from '@/api/sales.api';
import { formatPKRFull } from '@/lib/format';
import Toast from 'react-native-toast-message';

import { useTranslation } from '@/i18n/useTranslation';
const paymentMethods: Array<{ key: PaymentMethod; label: string; icon: any; color: string }> = [
  { key: 'CASH', label: 'Cash', icon: Banknote, color: '#16a34a' },
  { key: 'CARD', label: 'Card', icon: CreditCard, color: '#2563eb' },
  { key: 'JAZZCASH', label: 'JazzCash', icon: Smartphone, color: '#f97316' },
  { key: 'EASYPAISA', label: 'EasyPaisa', icon: Zap, color: '#22c55e' },
  { key: 'BANK_TRANSFER', label: 'Bank', icon: Building2, color: '#8b5cf6' },
];

interface CartLine {
  productId: string;
  name: string;
  unit: string;
  costPrice: string;
  quantity: number;
}

export default function NewPurchaseScreen() {
  const { t } = useTranslation();
  const router = useRouter();
  const queryClient = useQueryClient();

  const [supplierPickerOpen, setSupplierPickerOpen] = useState(false);
  const [productPickerOpen, setProductPickerOpen] = useState(false);
  const [supplierSearch, setSupplierSearch] = useState('');
  const [productSearch, setProductSearch] = useState('');
  const [selectedSupplier, setSelectedSupplier] = useState<any>(null);
  const [cart, setCart] = useState<CartLine[]>([]);
  const [discount, setDiscount] = useState('');
  const [paidAmount, setPaidAmount] = useState('');
  const [paymentMethod, setPaymentMethod] = useState<PaymentMethod>('CASH');
  const [notes, setNotes] = useState('');

  const { data: suppliers = [] } = useQuery({
    queryKey: ['suppliers'],
    queryFn: async () => {
      try {
        const r = await suppliersApi.list();
        const items = (r as any)?.items ?? r;
        return Array.isArray(items) ? items : [];
      } catch {
        return [];
      }
    },
  });

  const { data: productsData } = useQuery({
    queryKey: ['purchase-products'],
    queryFn: async () => {
      try {
        return await productsApi.list({ limit: 200 });
      } catch {
        return { items: [], meta: { page: 1, limit: 0, total: 0, totalPages: 0 } };
      }
    },
    enabled: productPickerOpen,
  });

  const products = productsData?.items ?? [];

  const filteredSuppliers = useMemo(() => {
    const q = supplierSearch.toLowerCase().trim();
    if (!q) return suppliers;
    return suppliers.filter(
      (s: any) =>
        s.name.toLowerCase().includes(q) || (s.phone || '').toLowerCase().includes(q),
    );
  }, [suppliers, supplierSearch]);

  const filteredProducts = useMemo(() => {
    const q = productSearch.toLowerCase().trim();
    if (!q) return products;
    return products.filter((p) =>
      p.name.toLowerCase().includes(q) || (p.sku || '').toLowerCase().includes(q),
    );
  }, [products, productSearch]);

  const subtotal = cart.reduce((s, l) => s + Number(l.costPrice || 0) * l.quantity, 0);
  const total = Math.max(0, subtotal - Number(discount || 0));
  const credit = Math.max(0, total - Number(paidAmount || total));

  const createMutation = useMutation({
    mutationFn: () =>
      purchasesApi.create({
        supplierId: selectedSupplier!.id,
        paymentMethod,
        discount: Number(discount || 0),
        paidAmount: paidAmount ? Number(paidAmount) : total,
        notes: notes.trim() || undefined,
        items: cart.map((l) => ({
          productId: l.productId,
          quantity: l.quantity,
          costPrice: Number(l.costPrice || 0),
        })),
      }),
    onSuccess: (purchase) => {
      Haptics.notificationAsync(Haptics.NotificationFeedbackType.Success);
      Toast.show({
        type: 'success',
        text1: '✅ Purchase recorded!',
        text2: `${purchase.purchaseNumber} • ${formatPKRFull(total)}`,
      });
      queryClient.invalidateQueries({ queryKey: ['purchases'] });
      queryClient.invalidateQueries({ queryKey: ['products'] });
      router.replace('/purchases');
    },
    onError: (e: any) =>
      Toast.show({
        type: 'error',
        text1: e?.response?.data?.message?.[0] || 'Failed',
      }),
  });

  const addProductToCart = (product: any) => {
    Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
    setCart((prev) => {
      if (prev.find((l) => l.productId === product.id)) {
        Toast.show({ type: 'info', text1: 'Already in cart' });
        return prev;
      }
      return [
        ...prev,
        {
          productId: product.id,
          name: product.name,
          unit: product.unit,
          costPrice: String(product.costPrice || 0),
          quantity: 1,
        },
      ];
    });
    setProductPickerOpen(false);
    setProductSearch('');
  };

  const updateLineQty = (productId: string, delta: number) => {
    Haptics.selectionAsync();
    setCart((prev) =>
      prev
        .map((l) =>
          l.productId === productId ? { ...l, quantity: Math.max(0, l.quantity + delta) } : l,
        )
        .filter((l) => l.quantity > 0),
    );
  };

  const updateLineCost = (productId: string, cost: string) => {
    setCart((prev) =>
      prev.map((l) => (l.productId === productId ? { ...l, costPrice: cost } : l)),
    );
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
          <Text className="text-2xl font-extrabold text-neutral-900 dark:text-white">{t('auto.new.new_purchase')}</Text>
          <View className="flex-row items-center gap-1.5 mt-0.5">
            <Sparkles size={11} color="#7c3aed" />
            <Text className="text-xs text-neutral-500">{t('auto.new.stock_incoming_record')}</Text>
          </View>
        </View>
      </View>

      <KeyboardAvoidingView
        behavior={Platform.OS === 'ios' ? 'padding' : 'height'}
        className="flex-1"
      >
        <ScrollView
          contentContainerStyle={{ padding: 20, paddingBottom: 40 }}
          keyboardShouldPersistTaps="handled"
          showsVerticalScrollIndicator={false}
        >
          {/* Supplier */}
          <Text className="text-xs font-bold uppercase text-neutral-500 mb-2 tracking-wider">{t('auto.new.supplier')}</Text>
          <Pressable
            onPress={() => setSupplierPickerOpen(true)}
            className="flex-row items-center gap-3 px-4 py-3.5 rounded-2xl bg-white dark:bg-neutral-900 border border-neutral-200 dark:border-neutral-800 mb-4 active:opacity-70"
          >
            <View className="h-11 w-11 rounded-2xl bg-orange-100 dark:bg-orange-950/40 items-center justify-center">
              <Truck size={20} color="#f97316" />
            </View>
            <View className="flex-1">
              {selectedSupplier ? (
                <>
                  <Text className="font-extrabold text-neutral-900 dark:text-white">
                    {selectedSupplier.name}
                  </Text>
                  {selectedSupplier.phone && (
                    <Text className="text-xs text-neutral-500 mt-0.5">
                      {selectedSupplier.phone}
                    </Text>
                  )}
                </>
              ) : (
                <>
                  <Text className="font-bold text-neutral-900 dark:text-white">{t('auto.new.select_supplier')}</Text>
                  <Text className="text-xs text-neutral-500 mt-0.5">{t('auto.new.vendor_wholesaler_choose_karein')}</Text>
                </>
              )}
            </View>
          </Pressable>

          {/* Items */}
          <View className="flex-row items-center justify-between mb-2">
            <Text className="text-xs font-bold uppercase text-neutral-500 tracking-wider">
              Items ({cart.length})
            </Text>
            <Pressable
              onPress={() => {
                Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
                setProductPickerOpen(true);
              }}
              className="h-9 px-3 rounded-xl flex-row items-center gap-1"
              style={{ backgroundColor: '#7c3aed' }}
            >
              <Plus size={14} color="#ffffff" />
              <Text className="text-white font-bold text-xs">{t('auto.new.add_product')}</Text>
            </Pressable>
          </View>

          {cart.length === 0 ? (
            <View className="rounded-2xl border-2 border-dashed border-neutral-200 p-6 items-center mb-4">
              <Package size={28} color="#9ca3af" />
              <Text className="mt-2 text-sm text-neutral-500 font-semibold">{t('auto.new.cart_khaali_hai')}</Text>
              <Text className="text-xs text-neutral-400 mt-1">{t('auto.new.products_add_karein')}</Text>
            </View>
          ) : (
            <View className="gap-2 mb-4">
              {cart.map((line) => {
                const lineTotal = Number(line.costPrice || 0) * line.quantity;
                return (
                  <View
                    key={line.productId}
                    className="rounded-2xl bg-white dark:bg-neutral-900 border border-neutral-200 dark:border-neutral-800 p-3"
                  >
                    <View className="flex-row items-center gap-2 mb-2">
                      <View className="h-10 w-10 rounded-xl bg-violet-100 items-center justify-center">
                        <Package size={16} color="#7c3aed" />
                      </View>
                      <Text className="flex-1 font-bold text-neutral-900 dark:text-white" numberOfLines={1}>
                        {line.name}
                      </Text>
                      <Pressable
                        onPress={() =>
                          setCart((prev) => prev.filter((l) => l.productId !== line.productId))
                        }
                        className="h-8 w-8 rounded-lg bg-rose-50 border border-rose-200 items-center justify-center"
                      >
                        <Trash2 size={12} color="#dc2626" />
                      </Pressable>
                    </View>

                    <View className="flex-row items-center gap-2">
                      <View className="flex-1">
                        <Text className="text-[10px] text-neutral-500 font-bold uppercase mb-1">{t('auto.new.cost_unit')}</Text>
                        <View className="flex-row items-center gap-1 rounded-xl border border-neutral-200 bg-neutral-50 px-3 h-10">
                          <Text className="text-xs font-bold text-neutral-700">{t('auto.new.rs')}</Text>
                          <TextInput
                            value={line.costPrice}
                            onChangeText={(t) => updateLineCost(line.productId, t)}
                            keyboardType="numeric"
                            placeholder="0"
                            placeholderTextColor="#9ca3af"
                            className="flex-1 text-base font-bold text-neutral-900"
                          />
                        </View>
                      </View>

                      <View>
                        <Text className="text-[10px] text-neutral-500 font-bold uppercase mb-1">
                          Qty ({line.unit})
                        </Text>
                        <View className="flex-row items-center gap-1.5 bg-neutral-50 rounded-xl p-1">
                          <Pressable
                            onPress={() => updateLineQty(line.productId, -1)}
                            className="h-8 w-8 rounded-lg bg-white border border-neutral-200 items-center justify-center"
                          >
                            <Minus size={12} color="#374151" />
                          </Pressable>
                          <Text className="font-extrabold w-8 text-center">{line.quantity}</Text>
                          <Pressable
                            onPress={() => updateLineQty(line.productId, 1)}
                            className="h-8 w-8 rounded-lg items-center justify-center"
                            style={{ backgroundColor: '#7c3aed' }}
                          >
                            <Plus size={12} color="#ffffff" />
                          </Pressable>
                        </View>
                      </View>
                    </View>

                    <View className="mt-2 pt-2 border-t border-neutral-100 flex-row items-center justify-between">
                      <Text className="text-[10px] text-neutral-500 font-bold uppercase">{t('auto.new.line_total')}</Text>
                      <Text className="font-extrabold text-violet-700">
                        {formatPKRFull(lineTotal)}
                      </Text>
                    </View>
                  </View>
                );
              })}
            </View>
          )}

          {/* Payment Method */}
          <Text className="text-xs font-bold uppercase text-neutral-500 mb-2 tracking-wider">{t('auto.new.payment_method')}</Text>
          <View className="flex-row flex-wrap -m-1 mb-4">
            {paymentMethods.map((m) => {
              const Icon = m.icon;
              const active = paymentMethod === m.key;
              return (
                <View key={m.key} className="w-1/3 p-1">
                  <Pressable
                    onPress={() => {
                      Haptics.selectionAsync();
                      setPaymentMethod(m.key);
                    }}
                    className="h-20 rounded-2xl items-center justify-center gap-1 border-2"
                    style={{
                      backgroundColor: active ? m.color : '#ffffff',
                      borderColor: active ? m.color : '#e5e7eb',
                    }}
                  >
                    <Icon size={20} color={active ? '#ffffff' : m.color} />
                    <Text
                      className="text-xs font-bold"
                      style={{ color: active ? '#ffffff' : '#374151' }}
                    >
                      {m.label}
                    </Text>
                  </Pressable>
                </View>
              );
            })}
          </View>

          {/* Discount */}
          <Text className="text-xs font-bold uppercase text-neutral-500 mb-2 tracking-wider">{t('auto.new.discount_optional')}</Text>
          <View className="flex-row items-center gap-2 rounded-2xl border border-neutral-200 bg-white px-4 h-12 mb-4">
            <Text className="text-base font-bold text-neutral-700">{t('auto.new.rs')}</Text>
            <TextInput
              value={discount}
              onChangeText={setDiscount}
              keyboardType="numeric"
              placeholder="0"
              placeholderTextColor="#9ca3af"
              className="flex-1 text-base text-neutral-900"
            />
          </View>

          {/* Paid Amount */}
          <View className="flex-row items-center justify-between mb-2">
            <Text className="text-xs font-bold uppercase text-neutral-500 tracking-wider">{t('auto.new.paid_now')}</Text>
            <Pressable onPress={() => setPaidAmount(String(total))}>
              <Text className="text-xs text-violet-700 font-bold">{t('auto.new.full_payment')}</Text>
            </Pressable>
          </View>
          <View className="flex-row items-center gap-2 rounded-2xl border-2 border-violet-200 bg-violet-50 px-4 h-14 mb-4">
            <Wallet size={20} color="#7c3aed" />
            <Text className="text-base font-bold text-violet-700">{t('auto.new.rs')}</Text>
            <TextInput
              value={paidAmount}
              onChangeText={setPaidAmount}
              keyboardType="numeric"
              placeholder={String(total)}
              placeholderTextColor="#c4b5fd"
              className="flex-1 text-2xl font-extrabold text-violet-900"
            />
          </View>

          {/* Notes */}
          <Text className="text-xs font-bold uppercase text-neutral-500 mb-2 tracking-wider">{t('auto.new.notes')}</Text>
          <View className="rounded-2xl border border-neutral-200 bg-white px-4 py-3 mb-4">
            <TextInput
              value={notes}
              onChangeText={setNotes}
              placeholder="Invoice #, delivery notes..."
              placeholderTextColor="#9ca3af"
              multiline
              numberOfLines={2}
              className="text-base text-neutral-900 min-h-[48px]"
              textAlignVertical="top"
            />
          </View>

          {/* Summary */}
          <View
            className="rounded-3xl p-5"
            style={{
              backgroundColor: '#7c3aed',
              shadowColor: '#7c3aed',
              shadowOpacity: 0.3,
              shadowRadius: 12,
              elevation: 6,
            }}
          >
            <Text className="text-xs font-bold uppercase tracking-wider text-white/80">{t('auto.new.purchase_total')}</Text>
            <Text className="text-5xl font-extrabold text-white mt-1">
              {formatPKRFull(total)}
            </Text>
            <View className="mt-3 pt-3 border-t border-white/20 gap-1.5">
              <View className="flex-row justify-between">
                <Text className="text-xs text-white/80">{t('auto.receipt.subtotal')}</Text>
                <Text className="text-xs font-bold text-white">{formatPKRFull(subtotal)}</Text>
              </View>
              {Number(discount) > 0 && (
                <View className="flex-row justify-between">
                  <Text className="text-xs text-white/80">{t('auto.receipt.discount')}</Text>
                  <Text className="text-xs font-bold text-white">-{formatPKRFull(Number(discount))}</Text>
                </View>
              )}
              <View className="flex-row justify-between">
                <Text className="text-xs text-white/80">{t('auto.new.paid_now')}</Text>
                <Text className="text-xs font-bold text-white">
                  {formatPKRFull(Number(paidAmount || total))}
                </Text>
              </View>
              {credit > 0 && (
                <View className="flex-row justify-between pt-1.5 border-t border-white/20">
                  <Text className="text-xs text-amber-200 font-bold">{t('auto.index.pending')}</Text>
                  <Text className="text-xs font-extrabold text-amber-200">
                    {formatPKRFull(credit)}
                  </Text>
                </View>
              )}
            </View>
          </View>
        </ScrollView>

        {/* Submit */}
        <View className="px-5 py-4 border-t border-neutral-200 dark:border-neutral-800 bg-white dark:bg-neutral-900">
          <Pressable
            onPress={() => {
              if (!selectedSupplier) {
                Toast.show({ type: 'error', text1: 'Select supplier' });
                return;
              }
              if (cart.length === 0) {
                Toast.show({ type: 'error', text1: 'Add at least 1 product' });
                return;
              }
              const invalidLine = cart.find((l) => !Number(l.costPrice));
              if (invalidLine) {
                Toast.show({ type: 'error', text1: `Set cost for ${invalidLine.name}` });
                return;
              }
              createMutation.mutate();
            }}
            disabled={createMutation.isPending}
            className="h-14 rounded-2xl items-center justify-center flex-row gap-2 active:opacity-80"
            style={{
              backgroundColor: createMutation.isPending ? '#9ca3af' : '#7c3aed',
              shadowColor: '#7c3aed',
              shadowOpacity: 0.4,
              shadowRadius: 12,
              elevation: 6,
            }}
          >
            <PackagePlus size={20} color="#ffffff" />
            <Text className="text-white font-extrabold text-base">
              {createMutation.isPending ? 'Recording...' : `Record Purchase • ${formatPKRFull(total)}`}
            </Text>
          </Pressable>
        </View>
      </KeyboardAvoidingView>

      {/* Supplier Picker */}
      <Modal visible={supplierPickerOpen} animationType="slide" presentationStyle="pageSheet">
        <SafeAreaView className="flex-1 bg-neutral-50">
          <View className="flex-row items-center justify-between px-5 py-4 border-b border-neutral-200">
            <Text className="text-xl font-extrabold text-neutral-900">Select Supplier</Text>
            <Pressable
              onPress={() => setSupplierPickerOpen(false)}
              className="h-10 w-10 rounded-2xl bg-neutral-100 items-center justify-center"
            >
              <X size={20} color="#6b7280" />
            </Pressable>
          </View>
          <View className="px-5 py-3">
            <View className="flex-row items-center gap-2 rounded-2xl border border-neutral-200 bg-white px-4 h-12">
              <Search size={20} color="#9ca3af" />
              <TextInput
                placeholder="Search supplier..."
                value={supplierSearch}
                onChangeText={setSupplierSearch}
                className="flex-1 text-base"
                autoFocus
              />
            </View>
          </View>
          <ScrollView contentContainerStyle={{ padding: 20, paddingTop: 0 }}>
            {filteredSuppliers.length === 0 ? (
              <View className="items-center py-12">
                <Truck size={40} color="#d1d5db" />
                <Text className="mt-3 text-neutral-500 font-semibold">{t('auto.new.no_suppliers')}</Text>
              </View>
            ) : (
              <View className="gap-2">
                {filteredSuppliers.map((s: any) => (
                  <Pressable
                    key={s.id}
                    onPress={() => {
                      Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
                      setSelectedSupplier(s);
                      setSupplierPickerOpen(false);
                      setSupplierSearch('');
                    }}
                    className="flex-row items-center gap-3 p-3 rounded-2xl bg-white border border-neutral-200 active:opacity-70"
                  >
                    <View className="h-11 w-11 rounded-xl bg-orange-100 items-center justify-center">
                      <Truck size={18} color="#f97316" />
                    </View>
                    <View className="flex-1">
                      <Text className="font-bold text-neutral-900" numberOfLines={1}>
                        {s.name}
                      </Text>
                      {s.phone && (
                        <Text className="text-xs text-neutral-500 mt-0.5">{s.phone}</Text>
                      )}
                    </View>
                  </Pressable>
                ))}
              </View>
            )}
          </ScrollView>
        </SafeAreaView>
      </Modal>

      {/* Product Picker */}
      <Modal visible={productPickerOpen} animationType="slide" presentationStyle="pageSheet">
        <SafeAreaView className="flex-1 bg-neutral-50">
          <View className="flex-row items-center justify-between px-5 py-4 border-b border-neutral-200">
            <Text className="text-xl font-extrabold text-neutral-900">{t('auto.new.select_product')}</Text>
            <Pressable
              onPress={() => setProductPickerOpen(false)}
              className="h-10 w-10 rounded-2xl bg-neutral-100 items-center justify-center"
            >
              <X size={20} color="#6b7280" />
            </Pressable>
          </View>
          <View className="px-5 py-3">
            <View className="flex-row items-center gap-2 rounded-2xl border border-neutral-200 bg-white px-4 h-12">
              <Search size={20} color="#9ca3af" />
              <TextInput
                placeholder="Search products..."
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
                <Package size={40} color="#d1d5db" />
                <Text className="mt-3 text-neutral-500 font-semibold">{t('auto.index.no_products')}</Text>
              </View>
            ) : (
              <View className="gap-2">
                {filteredProducts.map((p) => (
                  <Pressable
                    key={p.id}
                    onPress={() => addProductToCart(p)}
                    className="flex-row items-center gap-3 p-3 rounded-2xl bg-white border border-neutral-200 active:opacity-70"
                  >
                    <View className="h-11 w-11 rounded-xl bg-violet-100 items-center justify-center">
                      <Package size={18} color="#7c3aed" />
                    </View>
                    <View className="flex-1">
                      <Text className="font-bold text-neutral-900" numberOfLines={1}>
                        {p.name}
                      </Text>
                      <Text className="text-xs text-neutral-500 mt-0.5">
                        Cost: {formatPKRFull(p.costPrice)} • Stock: {p.stock} {p.unit}
                      </Text>
                    </View>
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
