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
  ArrowLeft, PackagePlus, Sparkles, Plus, Minus, X, Search,
  Truck, Package, Trash2, Banknote, CreditCard, Smartphone,
  Building2, Zap, Wallet, Layers, ChevronDown, ChevronUp,
  AlertTriangle, CheckCircle2,
} from 'lucide-react-native';
import { purchasesApi } from '@/api/purchases.api';
import { suppliersApi } from '@/api/suppliers.api';
import { productsApi } from '@/api/products.api';
import type { PaymentMethod } from '@/api/sales.api';
import { formatPKRFull } from '@/lib/format';
import Toast from 'react-native-toast-message';
import { useTranslation } from '@/i18n/useTranslation';
import { useSmartBack } from '@/hooks/useSmartBack';
import {
  PurchaseRollsInput,
  rollsToPayload,
  calculateRollsTotal,
  type PurchaseRoll,
} from '@/components/industries/carpet/PurchaseRollsInput';

const CARPET_UNITS = new Set(['sqft', 'sqm', 'sqyd']);

const paymentMethods: Array<{ key: PaymentMethod; label: string; icon: any; color: string }> = [
  { key: 'CASH', label: 'Cash', icon: Banknote, color: '#16a34a' },
  { key: 'CARD', label: 'Card', icon: CreditCard, color: '#2563eb' },
  { key: 'JAZZCASH', label: 'JazzCash', icon: Smartphone, color: '#f97316' },
  { key: 'EASYPAISA', label: 'EasyPaisa', icon: Zap, color: '#22c55e' },
  { key: 'BANK_TRANSFER', label: 'Bank', icon: Building2, color: '#7c3aed' },
];

interface CartLine {
  productId: string;
  name: string;
  unit: string;
  quantity: number;
  costPrice: number;
  isCarpet: boolean;
  rolls: PurchaseRoll[];
  expanded: boolean;
}

export default function NewPurchaseScreen() {
  const { t } = useTranslation();
  const router = useRouter();
  const goBack = useSmartBack();
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
        return await productsApi.list({ limit: 500 });
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

  const subtotal = cart.reduce((s, l) => s + l.quantity * l.costPrice, 0);
  const total = Math.max(0, subtotal - Number(discount || 0));
  const credit = Math.max(0, total - Number(paidAmount || total));

  // Validate carpet rolls
  const cartValidation = useMemo(() => {
    const issues: string[] = [];
    cart.forEach((line) => {
      if (line.isCarpet) {
        if (line.rolls.length === 0) {
          issues.push(`${line.name}: Kam se kam 1 roll add karein`);
          return;
        }
        const invalidRolls = line.rolls.filter(
          (r) => Number(r.widthFt) <= 0 || Number(r.lengthFt) <= 0,
        );
        if (invalidRolls.length > 0) {
          issues.push(`${line.name}: ${invalidRolls.length} rolls dimensions incomplete`);
        }
      }
    });
    return { valid: issues.length === 0, issues };
  }, [cart]);

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
          costPrice: l.costPrice,
          rolls: l.isCarpet ? rollsToPayload(l.rolls) : undefined,
        })),
      }),
    onSuccess: (purchase: any) => {
      const rollCount = Object.values(purchase.createdRollsByItem || {}).flat().length;
      Haptics.notificationAsync(Haptics.NotificationFeedbackType.Success);
      Toast.show({
        type: 'success',
        text1: '✅ Purchase saved!',
        text2:
          rollCount > 0
            ? `${purchase.purchaseNumber} • ${rollCount} rolls created`
            : `${purchase.purchaseNumber} • ${formatPKRFull(total)}`,
      });
      queryClient.invalidateQueries({ queryKey: ['purchases'] });
      queryClient.invalidateQueries({ queryKey: ['products'] });
      queryClient.invalidateQueries({ queryKey: ['purchases-summary'] });
      queryClient.invalidateQueries({ queryKey: ['carpet-rolls'] });
      queryClient.invalidateQueries({ queryKey: ['carpet-overview'] });
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
    const isCarpet = CARPET_UNITS.has(product.unit);
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
          costPrice: product.costPrice || 0,
          quantity: isCarpet ? 0 : 1,
          isCarpet,
          rolls: [],
          expanded: isCarpet,
        },
      ];
    });
    setProductPickerOpen(false);
    setProductSearch('');
    if (isCarpet) {
      Toast.show({
        type: 'success',
        text1: `${product.name} added`,
        text2: 'Neeche rolls add karein',
      });
    }
  };

  const updateLine = (productId: string, patch: Partial<CartLine>) => {
    setCart((prev) =>
      prev.map((l) => {
        if (l.productId !== productId) return l;
        const updated = { ...l, ...patch };
        // If rolls changed, auto-update quantity from total sqft
        if (updated.isCarpet && patch.rolls !== undefined) {
          const totalSqft = calculateRollsTotal(patch.rolls);
          updated.quantity = Number(totalSqft.toFixed(2));
        }
        return updated;
      }),
    );
  };

  const updateLineQty = (productId: string, delta: number) => {
    Haptics.selectionAsync();
    setCart((prev) =>
      prev
        .map((l) =>
          l.productId === productId ? { ...l, quantity: Math.max(0, l.quantity + delta) } : l,
        )
        .filter((l) => l.quantity > 0 || l.isCarpet),
    );
  };

  const updateLineCost = (productId: string, cost: string) => {
    setCart((prev) =>
      prev.map((l) => (l.productId === productId ? { ...l, costPrice: Number(cost) || 0 } : l)),
    );
  };

  const removeLine = (productId: string) => {
    Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
    setCart((prev) => prev.filter((l) => l.productId !== productId));
  };

  return (
    <SafeAreaView className="flex-1 bg-neutral-50 dark:bg-neutral-950" edges={['top']}>
      <Stack.Screen options={{ headerShown: false }} />

      <View className="px-5 pt-4 pb-3 flex-row items-center gap-3">
        <Pressable
          onPress={goBack}
          hitSlop={12}
          className="h-10 w-10 rounded-2xl bg-white dark:bg-neutral-900 items-center justify-center border border-neutral-200 dark:border-neutral-800"
        >
          <ArrowLeft size={20} color="#7c3aed" />
        </Pressable>
        <View className="flex-1">
          <Text className="text-2xl font-extrabold text-neutral-900 dark:text-white">
            New Purchase
          </Text>
          <View className="flex-row items-center gap-1.5 mt-0.5">
            <Sparkles size={11} color="#7c3aed" />
            <Text className="text-xs text-neutral-500">Stock incoming + carpet rolls</Text>
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
          <Text className="text-xs font-bold uppercase text-neutral-500 mb-2 tracking-wider">
            Supplier *
          </Text>
          <Pressable
            onPress={() => setSupplierPickerOpen(true)}
            className="flex-row items-center gap-3 px-4 py-3.5 rounded-2xl bg-white dark:bg-neutral-900 border-2 border-neutral-200 mb-4 active:opacity-70"
            style={{ borderColor: selectedSupplier ? '#7c3aed' : '#e5e7eb' }}
          >
            <View
              className="h-11 w-11 rounded-2xl items-center justify-center"
              style={{
                backgroundColor: selectedSupplier ? '#ede9fe' : '#f1f5f9',
              }}
            >
              <Truck size={20} color={selectedSupplier ? '#7c3aed' : '#9ca3af'} />
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
                  <Text className="font-bold text-neutral-900 dark:text-white">
                    Select Supplier
                  </Text>
                  <Text className="text-xs text-neutral-500 mt-0.5">
                    Vendor / wholesaler choose karein
                  </Text>
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
              className="h-9 px-3 rounded-xl flex-row items-center gap-1 active:opacity-80"
              style={{ backgroundColor: '#7c3aed' }}
            >
              <Plus size={14} color="#ffffff" />
              <Text className="text-white font-bold text-xs">Add Product</Text>
            </Pressable>
          </View>

          {cart.length === 0 ? (
            <View className="rounded-2xl border-2 border-dashed border-neutral-300 p-6 items-center mb-4">
              <Package size={28} color="#9ca3af" />
              <Text className="mt-2 text-sm text-neutral-500 font-semibold">
                Cart khaali hai
              </Text>
              <Text className="text-xs text-neutral-400 mt-1">
                Products add karein
              </Text>
            </View>
          ) : (
            <View className="gap-2 mb-4">
              {cart.map((line) => {
                const lineTotal = line.quantity * line.costPrice;
                return (
                  <View
                    key={line.productId}
                    className="rounded-2xl border-2 overflow-hidden"
                    style={{
                      borderColor: line.isCarpet ? '#86efac' : '#e5e7eb',
                      backgroundColor: line.isCarpet ? '#f0fdf4' : '#ffffff',
                    }}
                  >
                    {/* Item header */}
                    <View className="p-3">
                      <View className="flex-row items-center gap-2 mb-2">
                        <View
                          className="h-10 w-10 rounded-xl items-center justify-center"
                          style={{
                            backgroundColor: line.isCarpet ? '#dcfce7' : '#ede9fe',
                          }}
                        >
                          {line.isCarpet ? (
                            <Layers size={16} color="#16a34a" />
                          ) : (
                            <Package size={16} color="#7c3aed" />
                          )}
                        </View>
                        <View className="flex-1">
                          <View className="flex-row items-center gap-1.5">
                            <Text
                              className="font-bold text-neutral-900 dark:text-white flex-1"
                              numberOfLines={1}
                            >
                              {line.name}
                            </Text>
                            {line.isCarpet && (
                              <View className="flex-row items-center gap-0.5 px-1.5 py-0.5 rounded bg-emerald-100">
                                <Layers size={9} color="#15803d" />
                                <Text className="text-[9px] font-extrabold text-emerald-700">
                                  CARPET
                                </Text>
                              </View>
                            )}
                          </View>
                          {line.isCarpet && line.rolls.length > 0 && (
                            <Text className="text-[10px] text-emerald-700 font-bold mt-0.5">
                              {line.rolls.length} rolls • {calculateRollsTotal(line.rolls).toFixed(2)} sqft
                            </Text>
                          )}
                        </View>
                        <Pressable
                          onPress={() => removeLine(line.productId)}
                          className="h-8 w-8 rounded-lg bg-rose-50 border border-rose-200 items-center justify-center"
                        >
                          <Trash2 size={12} color="#dc2626" />
                        </Pressable>
                      </View>

                      {/* Cost & Qty */}
                      <View className="flex-row items-center gap-2">
                        <View className="flex-1">
                          <Text className="text-[9px] uppercase font-bold text-slate-600 mb-1">
                            {line.isCarpet ? 'Default Cost/sqft' : 'Cost / Unit'}
                          </Text>
                          <View className="flex-row items-center gap-1 rounded-lg border border-slate-200 bg-white px-2 h-9">
                            <Text className="text-[10px] font-bold text-slate-700">Rs</Text>
                            <TextInput
                              value={String(line.costPrice)}
                              onChangeText={(t) => updateLineCost(line.productId, t)}
                              keyboardType="decimal-pad"
                              className="flex-1 text-sm font-bold text-slate-900"
                            />
                          </View>
                        </View>

                        {line.isCarpet ? (
                          <View className="flex-1">
                            <Text className="text-[9px] uppercase font-bold text-slate-600 mb-1">
                              Total Sqft (auto)
                            </Text>
                            <View className="h-9 rounded-lg border border-emerald-200 bg-emerald-50 px-3 justify-center">
                              <Text className="text-sm font-extrabold text-emerald-800">
                                {line.quantity.toFixed(2)}
                              </Text>
                            </View>
                          </View>
                        ) : (
                          <View>
                            <Text className="text-[9px] uppercase font-bold text-slate-600 mb-1">
                              Qty ({line.unit})
                            </Text>
                            <View className="flex-row items-center gap-1.5 bg-slate-50 rounded-lg p-1">
                              <Pressable
                                onPress={() => updateLineQty(line.productId, -1)}
                                className="h-7 w-7 rounded bg-white border border-slate-200 items-center justify-center"
                              >
                                <Minus size={11} color="#374151" />
                              </Pressable>
                              <Text className="font-extrabold w-8 text-center text-sm">
                                {line.quantity}
                              </Text>
                              <Pressable
                                onPress={() => updateLineQty(line.productId, 1)}
                                className="h-7 w-7 rounded items-center justify-center"
                                style={{ backgroundColor: '#7c3aed' }}
                              >
                                <Plus size={11} color="#ffffff" />
                              </Pressable>
                            </View>
                          </View>
                        )}
                      </View>

                      {/* Line total + expand */}
                      <View className="mt-2 pt-2 border-t border-slate-100 flex-row items-center justify-between">
                        {line.isCarpet ? (
                          <Pressable
                            onPress={() =>
                              updateLine(line.productId, { expanded: !line.expanded })
                            }
                            className="flex-row items-center gap-1 px-2.5 py-1.5 rounded-lg bg-emerald-100 active:opacity-70"
                          >
                            <Layers size={11} color="#15803d" />
                            <Text className="text-[11px] font-extrabold text-emerald-800">
                              {line.rolls.length > 0
                                ? `${line.rolls.length} rolls`
                                : 'Add rolls'}
                            </Text>
                            {line.expanded ? (
                              <ChevronUp size={11} color="#15803d" />
                            ) : (
                              <ChevronDown size={11} color="#15803d" />
                            )}
                          </Pressable>
                        ) : (
                          <Text className="text-[10px] uppercase font-bold text-slate-500">
                            Line Total
                          </Text>
                        )}
                        <Text className="font-extrabold text-violet-700 text-base">
                          {formatPKRFull(lineTotal)}
                        </Text>
                      </View>
                    </View>

                    {/* Carpet rolls expanded panel */}
                    {line.isCarpet && line.expanded && (
                      <View className="p-3 border-t border-emerald-200 bg-white">
                        <PurchaseRollsInput
                          productId={line.productId}
                          productName={line.name}
                          defaultCostPerSqft={line.costPrice}
                          rolls={line.rolls}
                          onChange={(rolls) => updateLine(line.productId, { rolls })}
                        />
                      </View>
                    )}
                  </View>
                );
              })}
            </View>
          )}

          {/* Validation errors */}
          {!cartValidation.valid && cart.length > 0 && (
            <View className="rounded-2xl bg-rose-50 border-2 border-rose-200 p-3 mb-4">
              <View className="flex-row items-center gap-2 mb-1">
                <AlertTriangle size={14} color="#dc2626" />
                <Text className="text-xs font-extrabold text-rose-900">
                  Issues to fix:
                </Text>
              </View>
              {cartValidation.issues.map((issue, i) => (
                <Text key={i} className="text-[11px] text-rose-800 font-semibold ml-6">
                  • {issue}
                </Text>
              ))}
            </View>
          )}

          {/* Payment Method */}
          <Text className="text-xs font-bold uppercase text-neutral-500 mb-2 tracking-wider">
            Payment Method
          </Text>
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

          {/* Discount + Paid */}
          <View className="flex-row gap-2 mb-4">
            <View className="flex-1">
              <Text className="text-xs font-bold uppercase text-neutral-500 mb-2 tracking-wider">
                Discount (PKR)
              </Text>
              <View className="flex-row items-center gap-2 rounded-2xl border border-neutral-200 bg-white px-4 h-12">
                <Text className="text-sm font-bold text-neutral-700">Rs</Text>
                <TextInput
                  value={discount}
                  onChangeText={setDiscount}
                  keyboardType="decimal-pad"
                  placeholder="0"
                  placeholderTextColor="#9ca3af"
                  className="flex-1 text-sm font-bold text-neutral-900"
                />
              </View>
            </View>
            <View className="flex-1">
              <View className="flex-row items-center justify-between mb-2">
                <Text className="text-xs font-bold uppercase text-neutral-500 tracking-wider">
                  Paid
                </Text>
                <Pressable onPress={() => setPaidAmount(String(total))}>
                  <Text className="text-[10px] text-violet-700 font-bold">Full</Text>
                </Pressable>
              </View>
              <View className="flex-row items-center gap-2 rounded-2xl border-2 border-violet-200 bg-violet-50 px-3 h-12">
                <Wallet size={14} color="#7c3aed" />
                <TextInput
                  value={paidAmount}
                  onChangeText={setPaidAmount}
                  keyboardType="decimal-pad"
                  placeholder={String(total)}
                  placeholderTextColor="#c4b5fd"
                  className="flex-1 text-base font-extrabold text-violet-900"
                />
              </View>
            </View>
          </View>

          {/* Notes */}
          <Text className="text-xs font-bold uppercase text-neutral-500 mb-2 tracking-wider">
            Notes (optional)
          </Text>
          <View className="rounded-2xl border border-neutral-200 bg-white px-4 py-3 mb-4">
            <TextInput
              value={notes}
              onChangeText={setNotes}
              placeholder="Invoice #, delivery notes..."
              placeholderTextColor="#9ca3af"
              multiline
              numberOfLines={2}
              className="text-sm text-neutral-900 min-h-[48px]"
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
            <Text className="text-xs font-bold uppercase tracking-wider text-white/80">
              Purchase Total
            </Text>
            <Text className="text-4xl font-extrabold text-white mt-1">
              {formatPKRFull(total)}
            </Text>
            <View className="mt-3 pt-3 border-t border-white/20 gap-1.5">
              <View className="flex-row justify-between">
                <Text className="text-xs text-white/80">Subtotal</Text>
                <Text className="text-xs font-bold text-white">{formatPKRFull(subtotal)}</Text>
              </View>
              {Number(discount) > 0 && (
                <View className="flex-row justify-between">
                  <Text className="text-xs text-white/80">Discount</Text>
                  <Text className="text-xs font-bold text-white">
                    -{formatPKRFull(Number(discount))}
                  </Text>
                </View>
              )}
              <View className="flex-row justify-between">
                <Text className="text-xs text-white/80">Paid</Text>
                <Text className="text-xs font-bold text-white">
                  {formatPKRFull(Number(paidAmount || total))}
                </Text>
              </View>
              {credit > 0 && (
                <View className="flex-row justify-between pt-1.5 border-t border-white/20">
                  <Text className="text-xs text-amber-200 font-bold">Balance Due</Text>
                  <Text className="text-xs font-extrabold text-amber-200">
                    {formatPKRFull(credit)}
                  </Text>
                </View>
              )}
            </View>
          </View>
        </ScrollView>

        {/* Submit */}
        <View className="px-5 py-4 border-t border-neutral-200 bg-white dark:bg-neutral-900">
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
              if (!cartValidation.valid) {
                Toast.show({ type: 'error', text1: cartValidation.issues[0] });
                return;
              }
              createMutation.mutate();
            }}
            disabled={createMutation.isPending || !cartValidation.valid}
            className="h-14 rounded-2xl items-center justify-center flex-row gap-2 active:opacity-80"
            style={{
              backgroundColor:
                createMutation.isPending || !cartValidation.valid ? '#9ca3af' : '#7c3aed',
              shadowColor: '#7c3aed',
              shadowOpacity: 0.4,
              shadowRadius: 12,
              elevation: 6,
            }}
          >
            {createMutation.isPending ? (
              <Text className="text-white font-extrabold text-base">Recording...</Text>
            ) : (
              <>
                <PackagePlus size={20} color="#ffffff" />
                <Text className="text-white font-extrabold text-base">
                  Save Purchase • {formatPKRFull(total)}
                </Text>
              </>
            )}
          </Pressable>
        </View>
      </KeyboardAvoidingView>

      {/* Supplier Picker */}
      <Modal
        visible={supplierPickerOpen}
        animationType="slide"
        presentationStyle="pageSheet"
        onRequestClose={() => setSupplierPickerOpen(false)}
      >
        <SafeAreaView className="flex-1 bg-neutral-50">
          <View className="flex-row items-center justify-between px-5 py-4 border-b border-neutral-200">
            <Text className="text-xl font-extrabold text-neutral-900">Select Supplier</Text>
            <Pressable
              onPress={() => setSupplierPickerOpen(false)}
              hitSlop={12}
              className="h-10 w-10 rounded-2xl bg-neutral-100 items-center justify-center"
            >
              <X size={20} color="#6b7280" />
            </Pressable>
          </View>
          <View className="px-5 py-3">
            <View className="flex-row items-center gap-2 rounded-2xl border border-neutral-200 bg-white px-4 h-12">
              <Search size={18} color="#9ca3af" />
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
                <Text className="mt-3 text-neutral-500 font-semibold">No suppliers</Text>
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
      <Modal
        visible={productPickerOpen}
        animationType="slide"
        presentationStyle="pageSheet"
        onRequestClose={() => setProductPickerOpen(false)}
      >
        <SafeAreaView className="flex-1 bg-neutral-50">
          <View className="flex-row items-center justify-between px-5 py-4 border-b border-neutral-200">
            <Text className="text-xl font-extrabold text-neutral-900">Select Product</Text>
            <Pressable
              onPress={() => setProductPickerOpen(false)}
              hitSlop={12}
              className="h-10 w-10 rounded-2xl bg-neutral-100 items-center justify-center"
            >
              <X size={20} color="#6b7280" />
            </Pressable>
          </View>
          <View className="px-5 py-3">
            <View className="flex-row items-center gap-2 rounded-2xl border border-neutral-200 bg-white px-4 h-12">
              <Search size={18} color="#9ca3af" />
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
                <Text className="mt-3 text-neutral-500 font-semibold">No products</Text>
              </View>
            ) : (
              <View className="gap-2">
                {filteredProducts.map((p) => {
                  const isCarpet = CARPET_UNITS.has(p.unit);
                  return (
                    <Pressable
                      key={p.id}
                      onPress={() => addProductToCart(p)}
                      className="flex-row items-center gap-3 p-3 rounded-2xl bg-white border border-neutral-200 active:opacity-70"
                    >
                      <View
                        className="h-11 w-11 rounded-xl items-center justify-center"
                        style={{
                          backgroundColor: isCarpet ? '#dcfce7' : '#ede9fe',
                        }}
                      >
                        {isCarpet ? (
                          <Layers size={18} color="#16a34a" />
                        ) : (
                          <Package size={18} color="#7c3aed" />
                        )}
                      </View>
                      <View className="flex-1">
                        <View className="flex-row items-center gap-1.5">
                          <Text
                            className="font-bold text-neutral-900 flex-1"
                            numberOfLines={1}
                          >
                            {p.name}
                          </Text>
                          {isCarpet && (
                            <View className="flex-row items-center gap-0.5 px-1.5 py-0.5 rounded bg-emerald-100">
                              <Layers size={9} color="#15803d" />
                              <Text className="text-[9px] font-extrabold text-emerald-700">
                                CARPET
                              </Text>
                            </View>
                          )}
                        </View>
                        <Text className="text-xs text-neutral-500 mt-0.5">
                          Cost: {formatPKRFull(p.costPrice)} • Stock: {p.stock} {p.unit}
                        </Text>
                      </View>
                    </Pressable>
                  );
                })}
              </View>
            )}
          </ScrollView>
        </SafeAreaView>
      </Modal>
    </SafeAreaView>
  );
}
