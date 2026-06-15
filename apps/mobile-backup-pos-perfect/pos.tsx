import { useEffect, useMemo, useState } from 'react';
import {
  View, Text, ScrollView, Pressable, TextInput, Modal,
  KeyboardAvoidingView, Platform,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import * as Haptics from 'expo-haptics';
import {
  Search, ScanLine, Plus, Minus, ShoppingCart, CreditCard,
  Package, X, User, CheckCircle2, Banknote, Smartphone, Building2,
  Sparkles, Wallet, TrendingDown, Receipt, BookOpen,
  HandCoins, Phone, Star, History, ArrowDownCircle, ArrowUpCircle,
  Info, Zap, TrendingUp,
} from 'lucide-react-native';
import { Card } from '@/components/ui/Card';
import { BarcodeScannerModal } from '@/components/scanner/BarcodeScannerModal';
import { productsApi, type Product } from '@/api/products.api';
import { customersApi, type Customer } from '@/api/customers.api';
import { salesApi, type PaymentMethod } from '@/api/sales.api';
import { formatPKRFull } from '@/lib/format';
import Toast from 'react-native-toast-message';

import { useTranslation } from '@/i18n/useTranslation';
interface CartItem {
  product: Product;
  quantity: number;
}

type SaleMode = 'FULL_PAYMENT' | 'PARTIAL_CREDIT' | 'FULL_CREDIT';

const paymentMethods: Array<{
  key: PaymentMethod;
  label: string;
  icon: any;
  color: string;
}> = [
  { key: 'CASH', label: 'Cash', icon: Banknote, color: '#16a34a' },
  { key: 'CARD', label: 'Card', icon: CreditCard, color: '#2563eb' },
  { key: 'JAZZCASH', label: 'JazzCash', icon: Smartphone, color: '#f97316' },
  { key: 'EASYPAISA', label: 'EasyPaisa', icon: Zap, color: '#22c55e' },
  { key: 'BANK_TRANSFER', label: 'Bank', icon: Building2, color: '#8b5cf6' },
];

const EMPTY_LIST = {
  items: [],
  meta: { page: 1, limit: 0, total: 0, totalPages: 0 },
};

const formatRelative = (date?: string) => {
  if (!date) return 'Never';
  const d = new Date(date);
  const now = new Date();
  const diff = Math.floor((now.getTime() - d.getTime()) / 1000);
  if (diff < 60) return 'Abhi';
  if (diff < 3600) return `${Math.floor(diff / 60)}m ago`;
  if (diff < 86400) return `${Math.floor(diff / 3600)}h ago`;
  if (diff < 2592000) return `${Math.floor(diff / 86400)}d ago`;
  return d.toLocaleDateString('en-PK');
};

export default function POSScreen() {
  const { t } = useTranslation();
  const queryClient = useQueryClient();
  const [search, setSearch] = useState('');
  const [cart, setCart] = useState<CartItem[]>([]);
  const [scannerOpen, setScannerOpen] = useState(false);
  const [checkoutOpen, setCheckoutOpen] = useState(false);
  const [customerPickerOpen, setCustomerPickerOpen] = useState(false);
  const [customerSearch, setCustomerSearch] = useState('');
  const [selectedCustomer, setSelectedCustomer] = useState<Customer | null>(null);
  const [paymentMethod, setPaymentMethod] = useState<PaymentMethod>('CASH');
  const [paidAmountStr, setPaidAmountStr] = useState('');
  const [saleMode, setSaleMode] = useState<SaleMode>('FULL_PAYMENT');

  // Always fetch with defensive fallback
  const { data: productsData = EMPTY_LIST } = useQuery({
    queryKey: ['pos-products', search],
    queryFn: async () => {
      try {
        const result = await productsApi.list({
          search: search || undefined,
          limit: 50,
        });
        return result ?? EMPTY_LIST;
      } catch (e) {
        console.error('❌ Products fetch error:', e);
        return EMPTY_LIST;
      }
    },
  });

  const { data: customersData = EMPTY_LIST } = useQuery({
    queryKey: ['pos-customers'],
    queryFn: async () => {
      try {
        const result = await customersApi.list({ limit: 200 });
        return result ?? EMPTY_LIST;
      } catch (e) {
        console.error('❌ Customers fetch error:', e);
        return EMPTY_LIST;
      }
    },
  });

  const { data: customerDetail } = useQuery({
    queryKey: ['customer-detail', selectedCustomer?.id],
    queryFn: async () => {
      if (!selectedCustomer) return null;
      try {
        return await customersApi.get(selectedCustomer.id);
      } catch (e) {
        console.error('❌ Customer detail error:', e);
        return null;
      }
    },
    enabled: !!selectedCustomer,
  });

  const productItems = productsData?.items ?? [];
  const customerItems = customersData?.items ?? [];

  const subtotal = cart.reduce((s, i) => s + i.product.price * i.quantity, 0);
  const total = subtotal;
  const totalItems = cart.reduce((s, i) => s + i.quantity, 0);

  const effectivePaid = useMemo(() => {
    if (saleMode === 'FULL_PAYMENT') return total;
    if (saleMode === 'FULL_CREDIT') return 0;
    return paidAmountStr ? Number(paidAmountStr) : 0;
  }, [saleMode, total, paidAmountStr]);

  const creditAmount = Math.max(0, total - effectivePaid);
  const changeAmount = Math.max(0, effectivePaid - total);
  const isCreditSale = creditAmount > 0;

  const customerCreditSummary = useMemo(() => {
    if (!customerDetail) return null;
    const sales = customerDetail.sales || [];
    const today = new Date().toDateString();
    const todaySales = sales.filter(
      (s) => new Date(s.soldAt).toDateString() === today,
    );
    const todayCredit = todaySales.reduce(
      (sum, s) => sum + (s.creditAmount || 0),
      0,
    );
    const todayPaid = todaySales.reduce(
      (sum, s) => sum + (s.paidAmount || 0),
      0,
    );
    const todayTotal = todaySales.reduce((sum, s) => sum + (s.total || 0), 0);

    return {
      currentBalance: customerDetail.balance || 0,
      todaySalesCount: todaySales.length,
      todayCredit,
      todayPaid,
      todayTotal,
      totalSales: customerDetail._count?.sales ?? sales.length,
      lastSaleDate: sales[0]?.soldAt,
    };
  }, [customerDetail]);

  useEffect(() => {
    if (
      !selectedCustomer &&
      (saleMode === 'PARTIAL_CREDIT' || saleMode === 'FULL_CREDIT')
    ) {
      setSaleMode('FULL_PAYMENT');
      setPaidAmountStr('');
    }
  }, [selectedCustomer, saleMode]);

  useEffect(() => {
    if (saleMode === 'FULL_PAYMENT') setPaidAmountStr(String(total));
    else if (saleMode === 'FULL_CREDIT') setPaidAmountStr('0');
  }, [saleMode, total]);

  const filteredCustomers = useMemo(() => {
    const q = customerSearch.toLowerCase().trim();
    if (!q) return customerItems;
    return customerItems.filter(
      (c) =>
        c.name.toLowerCase().includes(q) ||
        (c.phone || '').toLowerCase().includes(q),
    );
  }, [customerItems, customerSearch]);

  const quickAmounts = useMemo(() => {
    const amts = new Set(
      [Math.floor(total / 2), 500, 1000, 2000, 5000].filter(
        (n) => n > 0 && n < total,
      ),
    );
    return Array.from(amts).slice(0, 4);
  }, [total]);

  const checkoutMutation = useMutation({
    mutationFn: () =>
      salesApi.create({
        items: cart.map((c) => ({
          productId: c.product.id,
          quantity: c.quantity,
        })),
        paymentMethod,
        paidAmount: effectivePaid,
        customerId: selectedCustomer?.id,
        allowCredit: isCreditSale,
      }),
    onSuccess: (sale) => {
      Haptics.notificationAsync(Haptics.NotificationFeedbackType.Success);
      Toast.show({
        type: 'success',
        text1: isCreditSale ? '✅ Sale + Khata Updated!' : '✅ Sale Completed!',
        text2: `${sale.saleNumber} • ${formatPKRFull(total)}${
          isCreditSale ? ` • Udhaar: ${formatPKRFull(creditAmount)}` : ''
        }`,
      });
      setCart([]);
      setCheckoutOpen(false);
      setSelectedCustomer(null);
      setPaidAmountStr('');
      setPaymentMethod('CASH');
      setSaleMode('FULL_PAYMENT');
      queryClient.invalidateQueries({ queryKey: ['dashboard-stats'] });
      queryClient.invalidateQueries({ queryKey: ['products'] });
      queryClient.invalidateQueries({ queryKey: ['pos-products'] });
      queryClient.invalidateQueries({ queryKey: ['sales'] });
      queryClient.invalidateQueries({ queryKey: ['customers'] });
      queryClient.invalidateQueries({ queryKey: ['pos-customers'] });
    },
    onError: (e: any) => {
      Haptics.notificationAsync(Haptics.NotificationFeedbackType.Error);
      Toast.show({
        type: 'error',
        text1: 'Sale failed',
        text2:
          e?.response?.data?.message?.[0] ||
          e?.response?.data?.message ||
          'Try again',
      });
    },
  });

  const addToCart = (product: Product) => {
    Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
    setCart((prev) => {
      const existing = prev.find((c) => c.product.id === product.id);
      if (existing) {
        if (existing.quantity >= product.stock) {
          Haptics.notificationAsync(Haptics.NotificationFeedbackType.Warning);
          Toast.show({ type: 'error', text1: 'Stock limit reached' });
          return prev;
        }
        return prev.map((c) =>
          c.product.id === product.id
            ? { ...c, quantity: c.quantity + 1 }
            : c,
        );
      }
      return [...prev, { product, quantity: 1 }];
    });
  };

  const updateQuantity = (productId: string, delta: number) => {
    Haptics.selectionAsync();
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
      Haptics.notificationAsync(Haptics.NotificationFeedbackType.Error);
      Toast.show({ type: 'error', text1: 'Product not found', text2: data });
    }
  };

  const openCheckout = () => {
    if (cart.length === 0) {
      Toast.show({ type: 'error', text1: 'Cart is empty' });
      return;
    }
    Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Medium);
    setPaidAmountStr(String(total));
    setSaleMode('FULL_PAYMENT');
    setCheckoutOpen(true);
  };

  const openCustomerPicker = () => {
    Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
    setCustomerPickerOpen(true);
  };

  const closeCustomerPicker = () => {
    setCustomerPickerOpen(false);
    setCustomerSearch('');
  };

  return (
    <SafeAreaView
      className="flex-1 bg-neutral-50 dark:bg-neutral-950"
      edges={['top']}
    >
      {/* ===== Header ===== */}
      <View className="px-5 pt-4 pb-3">
        <View className="flex-row items-center justify-between mb-3">
          <View className="flex-row items-center gap-3 flex-1">
            <View
              className="h-12 w-12 rounded-2xl items-center justify-center"
              style={{ backgroundColor: '#16a34a' }}
            >
              <ShoppingCart size={22} color="#ffffff" />
            </View>
            <View className="flex-1">
              <Text className="text-2xl font-bold text-neutral-900 dark:text-white">{t('auto.index.pos_counter')}</Text>
              <View className="flex-row items-center gap-1.5 mt-0.5">
                <Sparkles size={11} color="#f59e0b" />
                <Text className="text-xs text-neutral-500">
                  {productItems.length} products • {customerItems.length} customers
                </Text>
              </View>
            </View>
          </View>
          <Pressable
            onPress={() => {
              Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
              setScannerOpen(true);
            }}
            className="h-12 px-4 rounded-2xl flex-row items-center gap-2 active:opacity-80"
            style={{
              backgroundColor: '#16a34a',
              shadowColor: '#16a34a',
              shadowOpacity: 0.3,
              shadowRadius: 12,
              shadowOffset: { width: 0, height: 4 },
              elevation: 6,
            }}
          >
            <ScanLine size={18} color="#ffffff" />
            <Text className="text-white font-bold text-sm">{t('auto.pos.scan')}</Text>
          </Pressable>
        </View>

        <View className="flex-row items-center gap-2 rounded-2xl border border-neutral-200 dark:border-neutral-800 bg-white dark:bg-neutral-900 px-4 h-12">
          <Search size={20} color="#9ca3af" />
          <TextInput
            placeholder="Search products by name, SKU..."
            placeholderTextColor="#9ca3af"
            value={search}
            onChangeText={setSearch}
            className="flex-1 text-base text-neutral-900 dark:text-white"
          />
          {search.length > 0 && (
            <Pressable
              onPress={() => setSearch('')}
              hitSlop={12}
              className="h-7 w-7 rounded-full bg-neutral-100 dark:bg-neutral-800 items-center justify-center"
            >
              <X size={14} color="#9ca3af" />
            </Pressable>
          )}
        </View>
      </View>

      {/* ===== Products Grid ===== */}
      <View className="flex-1">
        <ScrollView className="flex-1 px-3" showsVerticalScrollIndicator={false}>
          <View className="flex-row flex-wrap pb-4">
            {productItems.length === 0 ? (
              <View className="w-full items-center py-16">
                <View className="h-20 w-20 rounded-3xl bg-neutral-100 dark:bg-neutral-800 items-center justify-center">
                  <Package size={40} color="#9ca3af" />
                </View>
                <Text className="mt-4 text-base font-bold text-neutral-900 dark:text-white">
                  {search ? 'No products found' : 'No products yet'}
                </Text>
                <Text className="mt-1 text-xs text-neutral-500">
                  {search
                    ? `"${search}" se match nahi hua`
                    : 'Add products from Products tab'}
                </Text>
              </View>
            ) : (
              productItems.map((p) => {
                const inCart = cart.find((c) => c.product.id === p.id);
                const outOfStock = p.stock === 0;
                const lowStock = p.stock > 0 && p.stock <= 5;

                return (
                  <View key={p.id} className="w-1/2 p-1.5">
                    <Pressable
                      onPress={() => addToCart(p)}
                      disabled={outOfStock}
                      className="active:opacity-70"
                    >
                      <Card
                        variant="outline"
                        className={`p-3 h-40 ${
                          outOfStock
                            ? 'opacity-50'
                            : inCart
                            ? 'border-2 border-brand-500 bg-brand-50/60 dark:bg-brand-950/40'
                            : ''
                        }`}
                      >
                        <View className="flex-row items-start justify-between">
                          <View className="h-11 w-11 rounded-xl bg-brand-100 dark:bg-brand-950/40 items-center justify-center">
                            <Package size={20} color="#16a34a" />
                          </View>
                          {inCart && (
                            <View
                              className="h-7 min-w-7 px-1.5 rounded-full items-center justify-center"
                              style={{
                                backgroundColor: '#16a34a',
                                shadowColor: '#16a34a',
                                shadowOpacity: 0.4,
                                shadowRadius: 6,
                                shadowOffset: { width: 0, height: 2 },
                                elevation: 4,
                              }}
                            >
                              <Text className="text-white font-bold text-xs">
                                {inCart.quantity}
                              </Text>
                            </View>
                          )}
                          {!inCart && outOfStock && (
                            <View className="bg-rose-100 dark:bg-rose-950/40 px-2 py-0.5 rounded-md">
                              <Text className="text-[10px] text-rose-700 dark:text-rose-400 font-bold">
                                OUT
                              </Text>
                            </View>
                          )}
                          {!inCart && !outOfStock && lowStock && (
                            <View className="bg-amber-100 dark:bg-amber-950/40 px-2 py-0.5 rounded-md">
                              <Text className="text-[10px] text-amber-700 dark:text-amber-400 font-bold">
                                LOW
                              </Text>
                            </View>
                          )}
                        </View>

                        <Text
                          className="mt-2 text-sm font-bold text-neutral-900 dark:text-white leading-snug"
                          numberOfLines={2}
                        >
                          {p.name}
                        </Text>

                        <View className="mt-auto flex-row items-end justify-between">
                          <View>
                            <Text className="text-base font-extrabold text-brand-700 dark:text-brand-400">
                              {formatPKRFull(p.price)}
                            </Text>
                            {!outOfStock && !lowStock && (
                              <Text className="text-[10px] text-neutral-500 font-medium mt-0.5">
                                {p.stock} {p.unit}
                              </Text>
                            )}
                          </View>
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

      {/* ===== Cart Bar ===== */}
      {cart.length > 0 && (
        <View
          className="border-t border-neutral-200 dark:border-neutral-800 bg-white dark:bg-neutral-900"
          style={{
            shadowColor: '#000',
            shadowOpacity: 0.08,
            shadowRadius: 12,
            shadowOffset: { width: 0, height: -4 },
            elevation: 12,
          }}
        >
          <ScrollView className="max-h-44" showsVerticalScrollIndicator={false}>
            {cart.map((item) => (
              <View
                key={item.product.id}
                className="flex-row items-center px-5 py-2.5 border-b border-neutral-100 dark:border-neutral-800"
              >
                <View className="flex-1 mr-3">
                  <Text
                    className="text-sm font-bold text-neutral-900 dark:text-white"
                    numberOfLines={1}
                  >
                    {item.product.name}
                  </Text>
                  <Text className="text-xs text-neutral-500 mt-0.5">
                    {formatPKRFull(item.product.price)} × {item.quantity} ={' '}
                    <Text className="font-bold text-neutral-700 dark:text-neutral-300">
                      {formatPKRFull(item.product.price * item.quantity)}
                    </Text>
                  </Text>
                </View>
                <View className="flex-row items-center gap-1.5 bg-neutral-50 dark:bg-neutral-800 rounded-xl p-1">
                  <Pressable
                    onPress={() => updateQuantity(item.product.id, -1)}
                    className="h-8 w-8 rounded-lg bg-white dark:bg-neutral-900 border border-neutral-200 dark:border-neutral-700 items-center justify-center active:opacity-70"
                  >
                    <Minus size={14} color="#374151" />
                  </Pressable>
                  <Text className="font-extrabold w-7 text-center text-neutral-900 dark:text-white">
                    {item.quantity}
                  </Text>
                  <Pressable
                    onPress={() => updateQuantity(item.product.id, 1)}
                    className="h-8 w-8 rounded-lg items-center justify-center active:opacity-70"
                    style={{ backgroundColor: '#16a34a' }}
                  >
                    <Plus size={14} color="#ffffff" />
                  </Pressable>
                </View>
              </View>
            ))}
          </ScrollView>

          <View className="px-5 py-3.5 flex-row items-center justify-between">
            <View className="flex-1">
              <View className="flex-row items-center gap-2">
                <View className="flex-row items-center gap-1.5 bg-brand-100 dark:bg-brand-950/40 px-2.5 py-1 rounded-full">
                  <ShoppingCart size={12} color="#16a34a" />
                  <Text className="text-xs text-brand-700 dark:text-brand-400 font-bold">
                    {totalItems} items
                  </Text>
                </View>
                <Pressable
                  onPress={() => {
                    Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
                    setCart([]);
                  }}
                >
                  <Text className="text-xs text-rose-600 font-bold">{t('auto.pos.clear')}</Text>
                </Pressable>
              </View>
              <Text className="text-3xl font-extrabold text-neutral-900 dark:text-white mt-1">
                {formatPKRFull(total)}
              </Text>
            </View>
            <Pressable
              onPress={openCheckout}
              className="h-14 px-6 rounded-2xl flex-row items-center gap-2 active:opacity-80"
              style={{
                backgroundColor: '#16a34a',
                shadowColor: '#16a34a',
                shadowOpacity: 0.4,
                shadowRadius: 12,
                shadowOffset: { width: 0, height: 4 },
                elevation: 8,
              }}
            >
              <CreditCard size={20} color="#ffffff" />
              <Text className="text-white font-bold text-base">{t('auto.pos.checkout')}</Text>
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

      {/* ===== Checkout Modal ===== */}
      <Modal
        visible={checkoutOpen}
        animationType="slide"
        presentationStyle="pageSheet"
        onRequestClose={() => setCheckoutOpen(false)}
      >
        <SafeAreaView className="flex-1 bg-neutral-50 dark:bg-neutral-950">
          <KeyboardAvoidingView
            behavior={Platform.OS === 'ios' ? 'padding' : 'height'}
            className="flex-1"
          >
            <View className="flex-row items-center justify-between px-5 py-4 border-b border-neutral-200 dark:border-neutral-800">
              <View className="flex-row items-center gap-3">
                <View
                  className="h-10 w-10 rounded-2xl items-center justify-center"
                  style={{ backgroundColor: '#16a34a' }}
                >
                  <Receipt size={18} color="#ffffff" />
                </View>
                <View>
                  <Text className="text-xl font-bold text-neutral-900 dark:text-white">{t('auto.pos.checkout')}</Text>
                  <Text className="text-xs text-neutral-500">
                    {totalItems} items • {cart.length} unique
                  </Text>
                </View>
              </View>
              <Pressable
                onPress={() => setCheckoutOpen(false)}
                hitSlop={12}
                className="h-10 w-10 rounded-2xl bg-neutral-100 dark:bg-neutral-800 items-center justify-center"
              >
                <X size={20} color="#6b7280" />
              </Pressable>
            </View>

            <ScrollView
              contentContainerStyle={{ padding: 20, paddingBottom: 40 }}
              keyboardShouldPersistTaps="handled"
            >
              {/* Hero Total */}
              <View
                className="rounded-3xl p-6 items-center mb-4"
                style={{
                  backgroundColor:
                    saleMode === 'FULL_CREDIT'
                      ? '#dc2626'
                      : saleMode === 'PARTIAL_CREDIT'
                      ? '#d97706'
                      : '#16a34a',
                }}
              >
                <Text className="text-xs font-bold uppercase tracking-wider text-white/80">{t('auto.index.total_amount')}</Text>
                <Text className="text-5xl font-extrabold text-white mt-2">
                  {formatPKRFull(total)}
                </Text>
                <Text className="text-xs text-white/80 mt-2">
                  {cart.length} unique • {totalItems} items
                </Text>
              </View>

              {/* Customer */}
              <Text className="text-xs font-bold uppercase text-neutral-500 dark:text-neutral-400 mb-2 tracking-wider">{t('auto.id.customer')}</Text>
              <Pressable
                onPress={openCustomerPicker}
                className="flex-row items-center gap-3 px-4 py-3.5 rounded-2xl bg-white dark:bg-neutral-900 border border-neutral-200 dark:border-neutral-800 mb-3 active:opacity-70"
              >
                <View className="h-11 w-11 rounded-2xl bg-violet-100 dark:bg-violet-950/40 items-center justify-center">
                  <User size={20} color="#8b5cf6" />
                </View>
                <View className="flex-1">
                  <Text className="font-bold text-neutral-900 dark:text-white">
                    {selectedCustomer?.name || 'Walk-in Customer'}
                  </Text>
                  {selectedCustomer?.phone ? (
                    <Text className="text-xs text-neutral-500 mt-0.5">
                      {selectedCustomer.phone}
                    </Text>
                  ) : (
                    <Text className="text-xs text-neutral-500 mt-0.5">
                      Tap to select customer ({customerItems.length} available)
                    </Text>
                  )}
                </View>
                {selectedCustomer && (
                  <Pressable
                    onPress={(e) => {
                      e.stopPropagation();
                      setSelectedCustomer(null);
                    }}
                    hitSlop={12}
                    className="h-8 w-8 rounded-lg bg-neutral-100 dark:bg-neutral-800 items-center justify-center"
                  >
                    <X size={14} color="#9ca3af" />
                  </Pressable>
                )}
              </Pressable>

              {/* Customer Credit Summary */}
              {selectedCustomer && customerCreditSummary && (
                <View className="rounded-2xl overflow-hidden mb-4 border border-violet-200 dark:border-violet-900/50">
                  <View
                    className="px-4 py-3 flex-row items-center gap-3"
                    style={{ backgroundColor: '#7c3aed' }}
                  >
                    <View className="h-10 w-10 rounded-xl bg-white/20 items-center justify-center">
                      <Text className="text-white font-extrabold">
                        {selectedCustomer.name.charAt(0).toUpperCase()}
                      </Text>
                    </View>
                    <View className="flex-1">
                      <Text className="text-white font-bold text-sm" numberOfLines={1}>
                        {selectedCustomer.name}
                      </Text>
                      {selectedCustomer.phone && (
                        <View className="flex-row items-center gap-1 mt-0.5">
                          <Phone size={10} color="rgba(255,255,255,0.8)" />
                          <Text className="text-[10px] text-white/80">
                            {selectedCustomer.phone}
                          </Text>
                        </View>
                      )}
                    </View>
                    {customerCreditSummary.currentBalance > 0 && (
                      <View>
                        <Text className="text-[9px] text-white/70 font-bold uppercase">{t('auto.pos.total_udhaar')}</Text>
                        <Text className="text-base font-extrabold text-amber-300">
                          {formatPKRFull(customerCreditSummary.currentBalance)}
                        </Text>
                      </View>
                    )}
                  </View>

                  <View className="flex-row bg-white dark:bg-neutral-900">
                    <View className="flex-1 p-2.5 items-center border-r border-neutral-100 dark:border-neutral-800">
                      <Text className="text-[9px] text-neutral-500 font-bold uppercase">{t('auto.pos.aaj_sales')}</Text>
                      <Text className="text-sm font-extrabold text-neutral-900 dark:text-white mt-0.5">
                        {customerCreditSummary.todaySalesCount}
                      </Text>
                    </View>
                    <View className="flex-1 p-2.5 items-center bg-emerald-50/40 dark:bg-emerald-950/20 border-r border-neutral-100 dark:border-neutral-800">
                      <View className="flex-row items-center gap-0.5">
                        <ArrowDownCircle size={9} color="#16a34a" />
                        <Text className="text-[9px] text-emerald-700 dark:text-emerald-400 font-bold uppercase">{t('auto.pos.aaj_paid')}</Text>
                      </View>
                      <Text className="text-xs font-extrabold text-emerald-700 dark:text-emerald-400 mt-0.5">
                        {formatPKRFull(customerCreditSummary.todayPaid)}
                      </Text>
                    </View>
                    <View className="flex-1 p-2.5 items-center bg-amber-50/40 dark:bg-amber-950/20">
                      <View className="flex-row items-center gap-0.5">
                        <ArrowUpCircle size={9} color="#d97706" />
                        <Text className="text-[9px] text-amber-700 dark:text-amber-400 font-bold uppercase">{t('auto.pos.aaj_udhaar')}</Text>
                      </View>
                      <Text className="text-xs font-extrabold text-amber-700 dark:text-amber-400 mt-0.5">
                        {formatPKRFull(customerCreditSummary.todayCredit)}
                      </Text>
                    </View>
                  </View>

                  <View className="px-3 py-2 bg-violet-50/60 dark:bg-violet-950/30 border-t border-violet-100 dark:border-violet-900/50 flex-row items-center justify-between">
                    <View className="flex-row items-center gap-1">
                      <History size={10} color="#737373" />
                      <Text className="text-[10px] text-neutral-500">{t('auto.pos.last_visit')}</Text>
                      <Text className="text-[10px] font-bold text-neutral-700 dark:text-neutral-300">
                        {formatRelative(customerCreditSummary.lastSaleDate)}
                      </Text>
                    </View>
                    <View className="flex-row items-center gap-1">
                      <Star size={10} color="#f59e0b" />
                      <Text className="text-[10px] font-bold text-neutral-700 dark:text-neutral-300">
                        {customerCreditSummary.totalSales}
                      </Text>
                      <Text className="text-[10px] text-neutral-500">{t('auto.pos.sales')}</Text>
                    </View>
                  </View>
                </View>
              )}

              {/* Sale Mode */}
              <Text className="text-xs font-bold uppercase text-neutral-500 dark:text-neutral-400 mb-2 tracking-wider">{t('auto.pos.sale_mode')}</Text>
              <View className="flex-row gap-2 mb-4">
                <Pressable
                  onPress={() => {
                    Haptics.selectionAsync();
                    setSaleMode('FULL_PAYMENT');
                  }}
                  className="flex-1 rounded-2xl border-2 p-3 items-center"
                  style={{
                    borderColor:
                      saleMode === 'FULL_PAYMENT' ? '#16a34a' : '#e5e7eb',
                    backgroundColor:
                      saleMode === 'FULL_PAYMENT' ? '#dcfce7' : '#ffffff',
                  }}
                >
                  <Banknote
                    size={18}
                    color={saleMode === 'FULL_PAYMENT' ? '#16a34a' : '#9ca3af'}
                  />
                  <Text
                    className="text-[10px] font-bold mt-1"
                    style={{
                      color:
                        saleMode === 'FULL_PAYMENT' ? '#15803d' : '#6b7280',
                    }}
                  >{t('auto.pos.full_cash')}</Text>
                </Pressable>

                <Pressable
                  onPress={() => {
                    if (!selectedCustomer) {
                      Haptics.notificationAsync(
                        Haptics.NotificationFeedbackType.Warning,
                      );
                      Toast.show({
                        type: 'error',
                        text1: 'Customer required',
                        text2: 'Pehle customer select karein',
                      });
                      return;
                    }
                    Haptics.selectionAsync();
                    setSaleMode('PARTIAL_CREDIT');
                    setPaidAmountStr(String(Math.floor(total / 2)));
                  }}
                  disabled={!selectedCustomer}
                  className="flex-1 rounded-2xl border-2 p-3 items-center"
                  style={{
                    borderColor:
                      saleMode === 'PARTIAL_CREDIT' ? '#d97706' : '#e5e7eb',
                    backgroundColor:
                      saleMode === 'PARTIAL_CREDIT'
                        ? '#fef3c7'
                        : !selectedCustomer
                        ? '#f9fafb'
                        : '#ffffff',
                    opacity: !selectedCustomer ? 0.5 : 1,
                  }}
                >
                  <HandCoins
                    size={18}
                    color={
                      saleMode === 'PARTIAL_CREDIT' ? '#d97706' : '#9ca3af'
                    }
                  />
                  <Text
                    className="text-[10px] font-bold mt-1"
                    style={{
                      color:
                        saleMode === 'PARTIAL_CREDIT' ? '#b45309' : '#6b7280',
                    }}
                  >{t('auto.pos.partial')}</Text>
                </Pressable>

                <Pressable
                  onPress={() => {
                    if (!selectedCustomer) {
                      Haptics.notificationAsync(
                        Haptics.NotificationFeedbackType.Warning,
                      );
                      Toast.show({
                        type: 'error',
                        text1: 'Customer required',
                        text2: 'Pehle customer select karein',
                      });
                      return;
                    }
                    Haptics.selectionAsync();
                    setSaleMode('FULL_CREDIT');
                    setPaidAmountStr('0');
                  }}
                  disabled={!selectedCustomer}
                  className="flex-1 rounded-2xl border-2 p-3 items-center"
                  style={{
                    borderColor:
                      saleMode === 'FULL_CREDIT' ? '#dc2626' : '#e5e7eb',
                    backgroundColor:
                      saleMode === 'FULL_CREDIT'
                        ? '#fee2e2'
                        : !selectedCustomer
                        ? '#f9fafb'
                        : '#ffffff',
                    opacity: !selectedCustomer ? 0.5 : 1,
                  }}
                >
                  <BookOpen
                    size={18}
                    color={saleMode === 'FULL_CREDIT' ? '#dc2626' : '#9ca3af'}
                  />
                  <Text
                    className="text-[10px] font-bold mt-1"
                    style={{
                      color:
                        saleMode === 'FULL_CREDIT' ? '#b91c1c' : '#6b7280',
                    }}
                  >{t('auto.pos.full_udhaar')}</Text>
                </Pressable>
              </View>

              {!selectedCustomer && (
                <View className="flex-row items-center gap-1.5 mb-3 -mt-2">
                  <Info size={11} color="#737373" />
                  <Text className="text-[10px] text-neutral-500">{t('auto.pos.udhaar_ke_liye_customer_select_karein')}</Text>
                </View>
              )}

              {/* Payment Method */}
              {saleMode !== 'FULL_CREDIT' && (
                <>
                  <Text className="text-xs font-bold uppercase text-neutral-500 dark:text-neutral-400 mb-2 tracking-wider">{t('auto.new.payment_method')}</Text>
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
                            <Icon
                              size={20}
                              color={active ? '#ffffff' : m.color}
                            />
                            <Text
                              className="text-xs font-bold"
                              style={{
                                color: active ? '#ffffff' : '#374151',
                              }}
                            >
                              {m.label}
                            </Text>
                          </Pressable>
                        </View>
                      );
                    })}
                  </View>
                </>
              )}

              {/* Partial Paid Amount */}
              {saleMode === 'PARTIAL_CREDIT' && (
                <>
                  <View className="flex-row items-center justify-between mb-2">
                    <Text className="text-xs font-bold uppercase text-amber-700 dark:text-amber-400 tracking-wider">{t('auto.pos.paid_now_rest_udhaar')}</Text>
                    <Pressable
                      onPress={() => setPaidAmountStr(String(total - 1))}
                    >
                      <Text className="text-xs text-amber-600 font-bold">{t('auto.pos.almost_full')}</Text>
                    </Pressable>
                  </View>
                  <View className="flex-row items-center gap-2 rounded-2xl border-2 border-amber-300 dark:border-amber-900/50 bg-amber-50 dark:bg-amber-950/30 px-4 h-16 mb-2">
                    <Wallet size={22} color="#d97706" />
                    <Text className="text-lg font-bold text-amber-700">{t('auto.new.rs')}</Text>
                    <TextInput
                      value={paidAmountStr}
                      onChangeText={setPaidAmountStr}
                      keyboardType="numeric"
                      placeholder="0"
                      placeholderTextColor="#fcd34d"
                      className="flex-1 text-3xl font-extrabold text-amber-900 dark:text-amber-200"
                    />
                  </View>

                  {quickAmounts.length > 0 && (
                    <View className="flex-row gap-2 mb-3">
                      {quickAmounts.map((amt, idx) => (
                        <Pressable
                          key={`amt-${idx}-${amt}`}
                          onPress={() => {
                            Haptics.selectionAsync();
                            setPaidAmountStr(String(amt));
                          }}
                          className="flex-1 py-2 rounded-xl bg-amber-100 dark:bg-amber-950/40 active:opacity-70"
                        >
                          <Text className="text-center text-[10px] font-bold text-amber-800 dark:text-amber-300">
                            {formatPKRFull(amt)}
                          </Text>
                        </Pressable>
                      ))}
                    </View>
                  )}
                </>
              )}

              {/* Change */}
              {changeAmount > 0 && (
                <Card
                  variant="outline"
                  className="bg-emerald-50 dark:bg-emerald-950/30 border-emerald-200 dark:border-emerald-900/50 p-4 mb-3"
                >
                  <View className="flex-row items-center gap-2">
                    <View className="h-9 w-9 rounded-xl bg-emerald-200 dark:bg-emerald-900/50 items-center justify-center">
                      <TrendingDown size={16} color="#16a34a" />
                    </View>
                    <View className="flex-1">
                      <Text className="text-xs text-emerald-700 dark:text-emerald-400 font-bold uppercase">{t('auto.pos.change_wapis_dein')}</Text>
                      <Text className="text-lg font-extrabold text-emerald-700 dark:text-emerald-300">
                        {formatPKRFull(changeAmount)}
                      </Text>
                    </View>
                  </View>
                </Card>
              )}

              {/* Khata Summary */}
              {creditAmount > 0 && (
                <Card
                  variant="outline"
                  className="bg-amber-50 dark:bg-amber-950/30 border-2 border-amber-300 dark:border-amber-900/50 p-4 mb-3"
                >
                  <View className="flex-row items-start gap-2">
                    <View className="h-9 w-9 rounded-xl bg-amber-200 dark:bg-amber-900/50 items-center justify-center">
                      <BookOpen size={18} color="#d97706" />
                    </View>
                    <View className="flex-1">
                      <Text className="text-xs font-bold text-amber-900 dark:text-amber-200 uppercase tracking-wider">{t('auto.pos.khata_mein_add_hoga')}</Text>
                      <Text className="text-2xl font-extrabold text-amber-700 dark:text-amber-300 mt-0.5">
                        {formatPKRFull(creditAmount)}
                      </Text>
                      {selectedCustomer && customerCreditSummary && (
                        <View className="mt-2 pt-2 border-t border-amber-200 dark:border-amber-900/50 flex-row items-center gap-1.5">
                          <TrendingUp size={12} color="#dc2626" />
                          <Text className="text-[11px] text-amber-800 dark:text-amber-300 font-semibold">
                            Sale ke baad {selectedCustomer.name} ka udhaar:{' '}
                            <Text className="font-extrabold">
                              {formatPKRFull(
                                customerCreditSummary.currentBalance +
                                  creditAmount,
                              )}
                            </Text>
                          </Text>
                        </View>
                      )}
                      {!selectedCustomer && (
                        <Text className="text-xs text-amber-700 dark:text-amber-500 mt-1 font-semibold">{t('auto.pos.customer_select_karein_takay_credit_trac')}</Text>
                      )}
                    </View>
                  </View>
                </Card>
              )}
            </ScrollView>

            {/* Bottom Action */}
            <View
              className="px-5 py-4 border-t border-neutral-200 dark:border-neutral-800 bg-white dark:bg-neutral-900"
              style={{
                shadowColor: '#000',
                shadowOpacity: 0.05,
                shadowRadius: 8,
                shadowOffset: { width: 0, height: -2 },
                elevation: 8,
              }}
            >
              <Pressable
                onPress={() => checkoutMutation.mutate()}
                disabled={
                  checkoutMutation.isPending ||
                  (creditAmount > 0 && !selectedCustomer)
                }
                className="h-14 rounded-2xl flex-row items-center justify-center gap-2 active:opacity-80"
                style={{
                  backgroundColor:
                    checkoutMutation.isPending ||
                    (creditAmount > 0 && !selectedCustomer)
                      ? '#9ca3af'
                      : saleMode === 'FULL_CREDIT'
                      ? '#dc2626'
                      : saleMode === 'PARTIAL_CREDIT'
                      ? '#d97706'
                      : '#16a34a',
                  shadowColor:
                    saleMode === 'FULL_CREDIT'
                      ? '#dc2626'
                      : saleMode === 'PARTIAL_CREDIT'
                      ? '#d97706'
                      : '#16a34a',
                  shadowOpacity: 0.4,
                  shadowRadius: 12,
                  shadowOffset: { width: 0, height: 4 },
                  elevation: 8,
                }}
              >
                {checkoutMutation.isPending ? (
                  <Text className="text-white font-bold text-base">{t('auto.new.processing')}</Text>
                ) : (
                  <>
                    <CheckCircle2 size={22} color="#ffffff" />
                    <Text className="text-white font-bold text-base">
                      {saleMode === 'FULL_CREDIT'
                        ? `Add to Khata • ${formatPKRFull(total)}`
                        : saleMode === 'PARTIAL_CREDIT'
                        ? `Confirm (Udhaar: ${formatPKRFull(creditAmount)})`
                        : `Complete Sale • ${formatPKRFull(total)}`}
                    </Text>
                  </>
                )}
              </Pressable>
            </View>
          </KeyboardAvoidingView>

          {/* ===== INLINE CUSTOMER PICKER OVERLAY (iOS-safe) ===== */}
          {customerPickerOpen && (
            <View
              style={{
                position: 'absolute',
                top: 0,
                left: 0,
                right: 0,
                bottom: 0,
                backgroundColor: '#fafafa',
                zIndex: 9999,
                elevation: 9999,
              }}
            >
              <SafeAreaView
                className="flex-1 bg-neutral-50 dark:bg-neutral-950"
                edges={['top']}
              >
                <View className="flex-row items-center justify-between px-5 py-4 border-b border-neutral-200 dark:border-neutral-800 bg-white dark:bg-neutral-900">
                  <View>
                    <Text className="text-xl font-bold text-neutral-900 dark:text-white">{t('auto.pos.select_customer')}</Text>
                    <Text className="text-xs text-neutral-500 mt-0.5">
                      {filteredCustomers.length} of {customerItems.length} customers
                    </Text>
                  </View>
                  <Pressable
                    onPress={closeCustomerPicker}
                    hitSlop={12}
                    className="h-10 w-10 rounded-2xl bg-neutral-100 dark:bg-neutral-800 items-center justify-center"
                  >
                    <X size={20} color="#6b7280" />
                  </Pressable>
                </View>

                <View className="px-5 py-3">
                  <View className="flex-row items-center gap-2 rounded-2xl border border-neutral-200 dark:border-neutral-800 bg-white dark:bg-neutral-900 px-4 h-12">
                    <Search size={20} color="#9ca3af" />
                    <TextInput
                      placeholder="Search by name or phone..."
                      placeholderTextColor="#9ca3af"
                      value={customerSearch}
                      onChangeText={setCustomerSearch}
                      autoFocus
                      className="flex-1 text-base text-neutral-900 dark:text-white"
                    />
                    {customerSearch.length > 0 && (
                      <Pressable
                        onPress={() => setCustomerSearch('')}
                        hitSlop={12}
                        className="h-7 w-7 rounded-full bg-neutral-100 dark:bg-neutral-800 items-center justify-center"
                      >
                        <X size={14} color="#9ca3af" />
                      </Pressable>
                    )}
                  </View>
                </View>

                <ScrollView
                  contentContainerStyle={{ padding: 20, paddingTop: 0 }}
                  keyboardShouldPersistTaps="handled"
                  showsVerticalScrollIndicator={false}
                >
                  <Pressable
                    onPress={() => {
                      Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
                      setSelectedCustomer(null);
                      closeCustomerPicker();
                    }}
                    className="flex-row items-center gap-3 p-4 rounded-2xl bg-white dark:bg-neutral-900 border border-neutral-200 dark:border-neutral-800 mb-2 active:opacity-70"
                  >
                    <View className="h-12 w-12 rounded-2xl bg-neutral-100 dark:bg-neutral-800 items-center justify-center">
                      <User size={20} color="#9ca3af" />
                    </View>
                    <View className="flex-1">
                      <Text className="font-bold text-neutral-900 dark:text-white">{t('auto.pos.walk_in_customer')}</Text>
                      <Text className="text-xs text-neutral-500 mt-0.5">{t('auto.pos.no_tracking')}</Text>
                    </View>
                  </Pressable>

                  {filteredCustomers.length === 0 ? (
                    <View className="items-center py-12">
                      <User size={40} color="#d1d5db" />
                      <Text className="mt-3 text-neutral-500 font-semibold">
                        {customerSearch
                          ? 'No matching customer'
                          : 'No customers yet'}
                      </Text>
                      <Text className="text-xs text-neutral-400 mt-1">
                        {customerSearch
                          ? `"${customerSearch}" se match nahi`
                          : 'Add customers from Customers tab'}
                      </Text>
                    </View>
                  ) : (
                    filteredCustomers.map((c) => (
                      <Pressable
                        key={c.id}
                        onPress={() => {
                          Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
                          setSelectedCustomer(c);
                          closeCustomerPicker();
                        }}
                        className="flex-row items-center gap-3 p-4 rounded-2xl bg-white dark:bg-neutral-900 border border-neutral-200 dark:border-neutral-800 mb-2 active:opacity-70"
                      >
                        <View className="h-12 w-12 rounded-2xl bg-violet-100 dark:bg-violet-950/40 items-center justify-center">
                          <Text className="text-violet-700 dark:text-violet-300 font-extrabold text-base">
                            {c.name.charAt(0).toUpperCase()}
                          </Text>
                        </View>
                        <View className="flex-1">
                          <View className="flex-row items-center gap-2">
                            <Text className="font-bold text-neutral-900 dark:text-white">
                              {c.name}
                            </Text>
                            {c.isVip && (
                              <View className="bg-amber-100 dark:bg-amber-950/40 px-1.5 py-0.5 rounded-md">
                                <Text className="text-[9px] text-amber-700 dark:text-amber-400 font-extrabold">{t('auto.pos.vip')}</Text>
                              </View>
                            )}
                          </View>
                          {c.phone && (
                            <Text className="text-xs text-neutral-500 mt-0.5">
                              {c.phone}
                            </Text>
                          )}
                        </View>
                        {c.balance > 0 && (
                          <View className="bg-amber-100 dark:bg-amber-950/40 px-2.5 py-1 rounded-lg">
                            <Text className="text-[10px] text-amber-700 dark:text-amber-400 font-extrabold">
                              {formatPKRFull(c.balance)}
                            </Text>
                            <Text className="text-[9px] text-amber-600 dark:text-amber-500 font-bold">{t('auto.pos.udhaar')}</Text>
                          </View>
                        )}
                      </Pressable>
                    ))
                  )}
                </ScrollView>
              </SafeAreaView>
            </View>
          )}
        </SafeAreaView>
      </Modal>
    </SafeAreaView>
  );
}
