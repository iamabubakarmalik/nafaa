import { useState } from 'react';
import {
  View, Text, ScrollView, Pressable, TextInput, Alert, Modal,
  KeyboardAvoidingView, Platform,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import * as Haptics from 'expo-haptics';
import {
  Search, ScanLine, Plus, Minus, ShoppingCart, CreditCard, Trash2,
  Package, X, User, CheckCircle2, Banknote, Smartphone, Building2,
} from 'lucide-react-native';
import { Card } from '@/components/ui/Card';
import { BarcodeScannerModal } from '@/components/scanner/BarcodeScannerModal';
import { productsApi, type Product } from '@/api/products.api';
import { customersApi, type Customer } from '@/api/customers.api';
import { salesApi } from '@/api/sales.api';
import { formatPKRFull } from '@/lib/format';
import Toast from 'react-native-toast-message';

interface CartItem {
  product: Product;
  quantity: number;
}

type PaymentMethod = 'CASH' | 'CARD' | 'JAZZCASH' | 'EASYPAISA' | 'BANK';

const paymentMethods: Array<{ key: PaymentMethod; label: string; icon: any; color: string }> = [
  { key: 'CASH', label: 'Cash', icon: Banknote, color: '#16a34a' },
  { key: 'CARD', label: 'Card', icon: CreditCard, color: '#2563eb' },
  { key: 'JAZZCASH', label: 'JazzCash', icon: Smartphone, color: '#dc2626' },
  { key: 'EASYPAISA', label: 'EasyPaisa', icon: Smartphone, color: '#16a34a' },
  { key: 'BANK', label: 'Bank', icon: Building2, color: '#7c3aed' },
];

export default function POSScreen() {
  const queryClient = useQueryClient();
  const [search, setSearch] = useState('');
  const [cart, setCart] = useState<CartItem[]>([]);
  const [scannerOpen, setScannerOpen] = useState(false);
  const [checkoutOpen, setCheckoutOpen] = useState(false);
  const [customerPickerOpen, setCustomerPickerOpen] = useState(false);
  const [selectedCustomer, setSelectedCustomer] = useState<Customer | null>(null);
  const [paymentMethod, setPaymentMethod] = useState<PaymentMethod>('CASH');
  const [paidAmountStr, setPaidAmountStr] = useState('');

  const { data: productsData } = useQuery({
    queryKey: ['pos-products', search],
    queryFn: () => productsApi.list({ search: search || undefined, limit: 50 }),
  });

  const { data: customersData } = useQuery({
    queryKey: ['pos-customers'],
    queryFn: () => customersApi.list({ limit: 100 }),
    enabled: customerPickerOpen,
  });

  const subtotal = cart.reduce((s, i) => s + i.product.price * i.quantity, 0);
  const total = subtotal;
  const paidAmount = paidAmountStr ? Number(paidAmountStr) : total;
  const creditAmount = Math.max(0, total - paidAmount);

  const checkoutMutation = useMutation({
    mutationFn: () =>
      salesApi.create({
        items: cart.map((c) => ({
          productId: c.product.id,
          quantity: c.quantity,
        })),
        paymentMethod,
        paidAmount,
        customerId: selectedCustomer?.id,
      }),
    onSuccess: (sale) => {
      Haptics.notificationAsync(Haptics.NotificationFeedbackType.Success);
      Toast.show({
        type: 'success',
        text1: '✅ Sale completed!',
        text2: `${sale.saleNumber} • ${formatPKRFull(total)}`,
      });
      setCart([]);
      setCheckoutOpen(false);
      setSelectedCustomer(null);
      setPaidAmountStr('');
      setPaymentMethod('CASH');
      queryClient.invalidateQueries({ queryKey: ['dashboard-stats'] });
      queryClient.invalidateQueries({ queryKey: ['products'] });
      queryClient.invalidateQueries({ queryKey: ['pos-products'] });
      queryClient.invalidateQueries({ queryKey: ['sales'] });
      queryClient.invalidateQueries({ queryKey: ['customers'] });
    },
    onError: (e: any) => {
      Toast.show({
        type: 'error',
        text1: 'Sale failed',
        text2: e?.response?.data?.message?.[0] || e?.response?.data?.message || 'Try again',
      });
    },
  });

  const addToCart = (product: Product) => {
    Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
    setCart((prev) => {
      const existing = prev.find((c) => c.product.id === product.id);
      if (existing) {
        if (existing.quantity >= product.stock) {
          Toast.show({ type: 'error', text1: 'Stock limit reached' });
          return prev;
        }
        return prev.map((c) =>
          c.product.id === product.id ? { ...c, quantity: c.quantity + 1 } : c,
        );
      }
      return [...prev, { product, quantity: 1 }];
    });
  };

  const updateQuantity = (productId: string, delta: number) => {
    setCart((prev) =>
      prev
        .map((c) => {
          if (c.product.id !== productId) return c;
          const newQty = c.quantity + delta;
          if (newQty > c.product.stock) {
            Toast.show({ type: 'error', text1: 'Stock limit' });
            return c;
          }
          return { ...c, quantity: Math.max(0, newQty) };
        })
        .filter((c) => c.quantity > 0),
    );
  };

  const handleBarcodeScanned = async (data: string) => {
    try {
      const product = await productsApi.byBarcode(data);
      addToCart(product);
      Toast.show({ type: 'success', text1: 'Added', text2: product.name });
      setScannerOpen(false);
    } catch {
      Toast.show({ type: 'error', text1: 'Product not found', text2: data });
    }
  };

  const openCheckout = () => {
    if (cart.length === 0) {
      Toast.show({ type: 'error', text1: 'Cart is empty' });
      return;
    }
    setPaidAmountStr(String(total));
    setCheckoutOpen(true);
  };

  return (
    <SafeAreaView className="flex-1 bg-neutral-50 dark:bg-neutral-950" edges={['top']}>
      {/* Header */}
      <View className="px-5 pt-4 pb-3">
        <View className="flex-row items-center justify-between mb-3">
          <View>
            <Text className="text-2xl font-bold text-neutral-900 dark:text-white">POS Counter</Text>
            <Text className="text-xs text-neutral-500 mt-0.5">
              {productsData?.meta?.total ?? 0} products available
            </Text>
          </View>
          <Pressable
            onPress={() => setScannerOpen(true)}
            className="h-11 px-4 rounded-2xl bg-brand-600 flex-row items-center gap-2 active:opacity-80 shadow-lg shadow-brand-600/30"
          >
            <ScanLine size={18} color="#ffffff" />
            <Text className="text-white font-bold text-sm">Scan</Text>
          </Pressable>
        </View>

        <View className="flex-row items-center gap-2 rounded-2xl border border-neutral-200 dark:border-neutral-800 bg-white dark:bg-neutral-900 px-4 h-12">
          <Search size={20} color="#9ca3af" />
          <TextInput
            placeholder="Search products..."
            placeholderTextColor="#9ca3af"
            value={search}
            onChangeText={setSearch}
            className="flex-1 text-base text-neutral-900 dark:text-white"
          />
          {search.length > 0 && (
            <Pressable onPress={() => setSearch('')}>
              <X size={18} color="#9ca3af" />
            </Pressable>
          )}
        </View>
      </View>

      {/* Products Grid */}
      <View className="flex-1">
        <ScrollView className="flex-1 px-3" showsVerticalScrollIndicator={false}>
          <View className="flex-row flex-wrap pb-4">
            {(productsData?.items ?? []).length === 0 ? (
              <View className="w-full items-center py-16">
                <Package size={48} color="#d1d5db" />
                <Text className="mt-3 text-neutral-500">No products yet</Text>
                <Text className="mt-1 text-xs text-neutral-400">Add products from Products tab</Text>
              </View>
            ) : (
              (productsData?.items ?? []).map((p) => {
                const inCart = cart.find((c) => c.product.id === p.id);
                return (
                  <View key={p.id} className="w-1/2 p-1.5">
                    <Pressable
                      onPress={() => addToCart(p)}
                      disabled={p.stock === 0}
                      className="active:opacity-70"
                    >
                      <Card
                        variant="outline"
                        className={`p-3 h-36 ${inCart ? 'border-brand-500 bg-brand-50/50 dark:bg-brand-950/30' : ''}`}
                      >
                        <View className="flex-row items-center justify-between">
                          <View className="h-11 w-11 rounded-xl bg-brand-100 dark:bg-brand-950/40 items-center justify-center">
                            <Package size={20} color="#16a34a" />
                          </View>
                          {inCart && (
                            <View className="h-7 w-7 rounded-full bg-brand-600 items-center justify-center">
                              <Text className="text-white font-bold text-xs">{inCart.quantity}</Text>
                            </View>
                          )}
                        </View>
                        <Text
                          className="mt-2 text-sm font-bold text-neutral-900 dark:text-white"
                          numberOfLines={2}
                        >
                          {p.name}
                        </Text>
                        <View className="mt-auto flex-row items-end justify-between">
                          <Text className="text-base font-bold text-brand-700 dark:text-brand-400">
                            {formatPKRFull(p.price)}
                          </Text>
                          {p.stock === 0 ? (
                            <View className="bg-red-100 dark:bg-red-950/40 px-2 py-0.5 rounded-md">
                              <Text className="text-[10px] text-red-700 dark:text-red-400 font-bold">OUT</Text>
                            </View>
                          ) : (
                            <Text className="text-[10px] text-neutral-500 font-medium">
                              {p.stock} {p.unit}
                            </Text>
                          )}
                        </View>
                      </Card>
                    </Pressable>
                  </View>
                );
              })
            )}
          </View>
        </ScrollView>
      </View>

      {/* Cart Bar (when items in cart) */}
      {cart.length > 0 && (
        <View className="border-t border-neutral-200 dark:border-neutral-800 bg-white dark:bg-neutral-900">
          <ScrollView className="max-h-44" showsVerticalScrollIndicator={false}>
            {cart.map((item) => (
              <View
                key={item.product.id}
                className="flex-row items-center px-5 py-2.5 border-b border-neutral-100 dark:border-neutral-800"
              >
                <View className="flex-1 mr-3">
                  <Text
                    className="text-sm font-semibold text-neutral-900 dark:text-white"
                    numberOfLines={1}
                  >
                    {item.product.name}
                  </Text>
                  <Text className="text-xs text-neutral-500 mt-0.5">
                    {formatPKRFull(item.product.price)} × {item.quantity} = {formatPKRFull(item.product.price * item.quantity)}
                  </Text>
                </View>
                <View className="flex-row items-center gap-2">
                  <Pressable
                    onPress={() => updateQuantity(item.product.id, -1)}
                    className="h-8 w-8 rounded-xl bg-neutral-100 dark:bg-neutral-800 items-center justify-center active:opacity-70"
                  >
                    <Minus size={14} color="#374151" />
                  </Pressable>
                  <Text className="font-bold w-7 text-center text-neutral-900 dark:text-white">
                    {item.quantity}
                  </Text>
                  <Pressable
                    onPress={() => updateQuantity(item.product.id, 1)}
                    className="h-8 w-8 rounded-xl bg-brand-600 items-center justify-center active:opacity-70"
                  >
                    <Plus size={14} color="#ffffff" />
                  </Pressable>
                </View>
              </View>
            ))}
          </ScrollView>

          <View className="px-5 py-3 flex-row items-center justify-between">
            <View>
              <View className="flex-row items-center gap-2">
                <ShoppingCart size={16} color="#16a34a" />
                <Text className="text-xs text-neutral-500 font-semibold uppercase">{cart.length} items</Text>
                <Pressable onPress={() => setCart([])} className="ml-2">
                  <Text className="text-xs text-red-600 font-semibold">Clear</Text>
                </Pressable>
              </View>
              <Text className="text-3xl font-extrabold text-neutral-900 dark:text-white mt-0.5">
                {formatPKRFull(total)}
              </Text>
            </View>
            <Pressable
              onPress={openCheckout}
              className="h-14 px-6 rounded-2xl bg-brand-600 flex-row items-center gap-2 shadow-lg shadow-brand-600/40 active:opacity-80"
            >
              <CreditCard size={20} color="#ffffff" />
              <Text className="text-white font-bold text-base">Checkout</Text>
            </Pressable>
          </View>
        </View>
      )}

      {/* Barcode Scanner */}
      <BarcodeScannerModal
        visible={scannerOpen}
        onClose={() => setScannerOpen(false)}
        onScan={handleBarcodeScanned}
      />

      {/* Checkout Modal */}
      <Modal visible={checkoutOpen} animationType="slide" presentationStyle="pageSheet">
        <SafeAreaView className="flex-1 bg-neutral-50 dark:bg-neutral-950">
          <KeyboardAvoidingView
            behavior={Platform.OS === 'ios' ? 'padding' : 'height'}
            className="flex-1"
          >
            <View className="flex-row items-center justify-between px-5 py-4 border-b border-neutral-200 dark:border-neutral-800">
              <Text className="text-xl font-bold text-neutral-900 dark:text-white">Checkout</Text>
              <Pressable
                onPress={() => setCheckoutOpen(false)}
                className="h-10 w-10 rounded-2xl bg-neutral-100 dark:bg-neutral-800 items-center justify-center"
              >
                <X size={20} color="#6b7280" />
              </Pressable>
            </View>

            <ScrollView contentContainerStyle={{ padding: 20, paddingBottom: 100 }}>
              {/* Order Summary */}
              <Card variant="outline" className="bg-brand-50 dark:bg-brand-950/30 border-brand-200 dark:border-brand-900/50 p-5 mb-4">
                <Text className="text-xs text-brand-700 dark:text-brand-400 font-bold uppercase">Total Amount</Text>
                <Text className="text-4xl font-extrabold text-brand-700 dark:text-brand-300 mt-1">
                  {formatPKRFull(total)}
                </Text>
                <Text className="text-xs text-neutral-600 dark:text-neutral-400 mt-1">
                  {cart.length} items
                </Text>
              </Card>

              {/* Customer */}
              <Text className="text-xs font-bold uppercase text-neutral-500 dark:text-neutral-400 mb-2">
                Customer
              </Text>
              <Pressable
                onPress={() => setCustomerPickerOpen(true)}
                className="flex-row items-center gap-3 px-4 py-3.5 rounded-2xl bg-white dark:bg-neutral-900 border border-neutral-200 dark:border-neutral-800 active:opacity-70 mb-4"
              >
                <View className="h-10 w-10 rounded-xl bg-violet-100 dark:bg-violet-950/40 items-center justify-center">
                  <User size={18} color="#8b5cf6" />
                </View>
                <View className="flex-1">
                  <Text className="font-semibold text-neutral-900 dark:text-white">
                    {selectedCustomer?.name || 'Walk-in Customer'}
                  </Text>
                  {selectedCustomer?.phone && (
                    <Text className="text-xs text-neutral-500 mt-0.5">{selectedCustomer.phone}</Text>
                  )}
                </View>
                {selectedCustomer && (
                  <Pressable onPress={() => setSelectedCustomer(null)} hitSlop={12}>
                    <X size={16} color="#9ca3af" />
                  </Pressable>
                )}
              </Pressable>

              {/* Payment Method */}
              <Text className="text-xs font-bold uppercase text-neutral-500 dark:text-neutral-400 mb-2">
                Payment Method
              </Text>
              <View className="flex-row flex-wrap -m-1 mb-4">
                {paymentMethods.map((m) => {
                  const Icon = m.icon;
                  const active = paymentMethod === m.key;
                  return (
                    <View key={m.key} className="w-1/3 p-1">
                      <Pressable
                        onPress={() => setPaymentMethod(m.key)}
                        className={`h-20 rounded-2xl items-center justify-center gap-1 ${
                          active ? 'bg-brand-600' : 'bg-white dark:bg-neutral-900 border border-neutral-200 dark:border-neutral-800'
                        }`}
                      >
                        <Icon size={20} color={active ? '#ffffff' : m.color} />
                        <Text className={`text-xs font-bold ${active ? 'text-white' : 'text-neutral-700 dark:text-neutral-300'}`}>
                          {m.label}
                        </Text>
                      </Pressable>
                    </View>
                  );
                })}
              </View>

              {/* Paid Amount */}
              <Text className="text-xs font-bold uppercase text-neutral-500 dark:text-neutral-400 mb-2">
                Paid Amount
              </Text>
              <View className="flex-row items-center gap-2 rounded-2xl border border-neutral-200 dark:border-neutral-800 bg-white dark:bg-neutral-900 px-4 h-14 mb-2">
                <Text className="text-lg font-bold text-neutral-500">Rs</Text>
                <TextInput
                  value={paidAmountStr}
                  onChangeText={setPaidAmountStr}
                  keyboardType="numeric"
                  placeholder="0"
                  placeholderTextColor="#9ca3af"
                  className="flex-1 text-2xl font-bold text-neutral-900 dark:text-white"
                />
              </View>

              {/* Quick amounts */}
              {/* Quick amounts */}
<View className="flex-row gap-2 mb-4">
  {Array.from(new Set([total, 1000, 2000, 5000].filter((n) => n > 0))).map((amt, idx) => (
    <Pressable
      key={`amt-${idx}-${amt}`}
      onPress={() => setPaidAmountStr(String(amt))}
      className="flex-1 py-2 rounded-xl bg-neutral-100 dark:bg-neutral-800 active:opacity-70"
    >
      <Text className="text-center text-xs font-bold text-neutral-700 dark:text-neutral-300">
        {formatPKRFull(amt)}
      </Text>
    </Pressable>
  ))}
</View>


              {/* Credit warning */}
              {creditAmount > 0 && (
                <Card variant="outline" className="bg-amber-50 dark:bg-amber-950/30 border-amber-200 dark:border-amber-900/50 p-4">
                  <Text className="text-xs text-amber-700 dark:text-amber-400 font-bold">
                    ⚠️ {formatPKRFull(creditAmount)} will be added to khata
                  </Text>
                  {!selectedCustomer && (
                    <Text className="text-xs text-amber-700 dark:text-amber-500 mt-1">
                      Select a customer to track credit
                    </Text>
                  )}
                </Card>
              )}
            </ScrollView>

            <View className="px-5 py-4 border-t border-neutral-200 dark:border-neutral-800 bg-white dark:bg-neutral-900">
              <Pressable
                onPress={() => checkoutMutation.mutate()}
                disabled={checkoutMutation.isPending}
                className="h-14 rounded-2xl bg-brand-600 flex-row items-center justify-center gap-2 shadow-lg shadow-brand-600/40 active:opacity-80"
              >
                {checkoutMutation.isPending ? (
                  <Text className="text-white font-bold text-base">Processing...</Text>
                ) : (
                  <>
                    <CheckCircle2 size={20} color="#ffffff" />
                    <Text className="text-white font-bold text-base">
                      Confirm Sale • {formatPKRFull(total)}
                    </Text>
                  </>
                )}
              </Pressable>
            </View>
          </KeyboardAvoidingView>
        </SafeAreaView>
      </Modal>

      {/* Customer Picker */}
      <Modal visible={customerPickerOpen} animationType="slide" presentationStyle="pageSheet">
        <SafeAreaView className="flex-1 bg-neutral-50 dark:bg-neutral-950">
          <View className="flex-row items-center justify-between px-5 py-4 border-b border-neutral-200 dark:border-neutral-800">
            <Text className="text-xl font-bold text-neutral-900 dark:text-white">Select Customer</Text>
            <Pressable
              onPress={() => setCustomerPickerOpen(false)}
              className="h-10 w-10 rounded-2xl bg-neutral-100 dark:bg-neutral-800 items-center justify-center"
            >
              <X size={20} color="#6b7280" />
            </Pressable>
          </View>

          <ScrollView contentContainerStyle={{ padding: 20 }}>
            <Pressable
              onPress={() => {
                setSelectedCustomer(null);
                setCustomerPickerOpen(false);
              }}
              className="flex-row items-center gap-3 p-4 rounded-2xl bg-white dark:bg-neutral-900 border border-neutral-200 dark:border-neutral-800 mb-2 active:opacity-70"
            >
              <View className="h-12 w-12 rounded-2xl bg-neutral-100 dark:bg-neutral-800 items-center justify-center">
                <User size={20} color="#9ca3af" />
              </View>
              <Text className="font-semibold text-neutral-900 dark:text-white">Walk-in Customer</Text>
            </Pressable>

            {(customersData?.items ?? []).map((c) => (
              <Pressable
                key={c.id}
                onPress={() => {
                  setSelectedCustomer(c);
                  setCustomerPickerOpen(false);
                }}
                className="flex-row items-center gap-3 p-4 rounded-2xl bg-white dark:bg-neutral-900 border border-neutral-200 dark:border-neutral-800 mb-2 active:opacity-70"
              >
                <View className="h-12 w-12 rounded-2xl bg-violet-100 dark:bg-violet-950/40 items-center justify-center">
                  <Text className="text-violet-700 dark:text-violet-300 font-bold">
                    {c.name.charAt(0).toUpperCase()}
                  </Text>
                </View>
                <View className="flex-1">
                  <Text className="font-semibold text-neutral-900 dark:text-white">{c.name}</Text>
                  {c.phone && <Text className="text-xs text-neutral-500 mt-0.5">{c.phone}</Text>}
                </View>
                {c.balance > 0 && (
                  <View className="bg-amber-100 dark:bg-amber-950/40 px-2 py-1 rounded-md">
                    <Text className="text-[10px] text-amber-700 dark:text-amber-400 font-bold">
                      {formatPKRFull(c.balance)} udhaar
                    </Text>
                  </View>
                )}
              </Pressable>
            ))}
          </ScrollView>
        </SafeAreaView>
      </Modal>
    </SafeAreaView>
  );
}
