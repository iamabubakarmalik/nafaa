import { useEffect, useMemo, useRef, useState } from 'react';
import {
  View, Text, ScrollView, Pressable, TextInput, Modal, Image,
  KeyboardAvoidingView, Platform, Alert,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import * as Haptics from 'expo-haptics';
import AsyncStorage from '@react-native-async-storage/async-storage';
import {
  Search, ScanLine, Plus, Minus, ShoppingCart, CreditCard,
  Package, X, User, CheckCircle2, Banknote, Smartphone, Building2,
  Sparkles, Wallet, TrendingDown, Receipt, BookOpen,
  HandCoins, Phone, Star, History, ArrowDownCircle, ArrowUpCircle,
  Info, Zap, TrendingUp, Ruler, Edit3, Pause, PlayCircle,
  Layers, Percent, Tag, UserPlus, Eye, EyeOff, ChevronDown, AlertCircle,
} from 'lucide-react-native';
import { Card } from '@/components/ui/Card';
import { BarcodeScannerModal } from '@/components/scanner/BarcodeScannerModal';
import { LengthWidthCalculator } from '@/components/pos/LengthWidthCalculator';
import { VariantPicker } from '@/components/pos/VariantPicker';
import { useBusinessFeatures } from '@/hooks/useBusinessFeatures';
import { ImeiPickerModal } from '@/components/industries/ImeiPickerModal';
import { BatchPickerModal } from '@/components/industries/BatchPickerModal';
import type { ProductImei } from '@/api/imei.api';
import type { ProductBatch } from '@/api/batches.api';
import { productsApi, type Product } from '@/api/products.api';
import { productVariantsApi, type ProductVariant } from '@/api/product-variants.api';
import { customersApi, type Customer } from '@/api/customers.api';
import { salesApi, type PaymentMethod } from '@/api/sales.api';
import { formatPKRFull, formatQty } from '@/lib/format';
import Toast from 'react-native-toast-message';
import { useTranslation } from '@/i18n/useTranslation';

type CartItem = {
  cartLineId: string;
  productId: string;
  variantId?: string;
  imeiId?: string;
  imeiNumber?: string;
  batchId?: string;
  batchNumber?: string;
  name: string;
  variantName?: string;
  variantImage?: string;
  variantColor?: string;
  variantColorHex?: string;
  variantSize?: string;
  productImage?: string;
  basePrice: number;
  wholesalePrice?: number | null;
  stock: number;
  quantity: number;
  unit: string;
  category?: { name: string; color: string } | null;
  useWholesale: boolean;
  priceOverride?: number;
  lineDiscount: number;
  note?: string;
};

type SaleMode = 'FULL_PAYMENT' | 'PARTIAL_CREDIT' | 'FULL_CREDIT';

type HeldCart = {
  id: string;
  items: CartItem[];
  customerId: string;
  customerName: string;
  total: number;
  heldAt: number;
};

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

const HOLD_KEY = 'nafaa.pos.held-carts';
const LW_UNITS = new Set(['sqft', 'sqm', 'meter', 'ft', 'yard', 'gaj']);
const MOBILE_KEYWORDS = ['mobile', 'phone', 'smartphone', 'iphone', 'samsung', 'oppo', 'vivo', 'realme', 'xiaomi', 'tecno', 'infinix'];

const EMPTY_LIST = {
  items: [],
  meta: { page: 1, limit: 0, total: 0, totalPages: 0 },
};

const newCartLineId = () => `${Date.now()}-${Math.random().toString(36).slice(2, 8)}`;

const formatRelative = (date?: string | number) => {
  if (!date) return 'Never';
  const d = typeof date === 'number' ? new Date(date) : new Date(date);
  const now = new Date();
  const diff = Math.floor((now.getTime() - d.getTime()) / 1000);
  if (diff < 60) return 'Abhi';
  if (diff < 3600) return `${Math.floor(diff / 60)}m ago`;
  if (diff < 86400) return `${Math.floor(diff / 3600)}h ago`;
  if (diff < 2592000) return `${Math.floor(diff / 86400)}d ago`;
  return d.toLocaleDateString('en-PK');
};

const loadHeldCarts = async (): Promise<HeldCart[]> => {
  try {
    const raw = await AsyncStorage.getItem(HOLD_KEY);
    if (raw) return JSON.parse(raw);
  } catch {}
  return [];
};

const saveHeldCarts = async (carts: HeldCart[]) => {
  try {
    await AsyncStorage.setItem(HOLD_KEY, JSON.stringify(carts));
  } catch {}
};

export default function POSScreen() {
  const { t } = useTranslation();
  const queryClient = useQueryClient();
  const { features: businessFeatures, defaultUnit: bizDefaultUnit } = useBusinessFeatures();

  // Search & cart
  const [search, setSearch] = useState('');
  const [cart, setCart] = useState<CartItem[]>([]);
  const [hidePrices, setHidePrices] = useState(false);

  // Modals
  const [scannerOpen, setScannerOpen] = useState(false);
  const [checkoutOpen, setCheckoutOpen] = useState(false);
  const [customerPickerOpen, setCustomerPickerOpen] = useState(false);
  const [customerSearch, setCustomerSearch] = useState('');
  const [lwOpen, setLwOpen] = useState<CartItem | null>(null);
  const [variantPickerProduct, setVariantPickerProduct] = useState<Product | null>(null);
  const [variantPickerData, setVariantPickerData] = useState<ProductVariant[]>([]);
  const [imeiPickerData, setImeiPickerData] = useState<{ product: Product; variant?: ProductVariant } | null>(null);
  const [batchPickerData, setBatchPickerData] = useState<{ product: Product; variant?: ProductVariant; quantity: number } | null>(null);
  const [editingLine, setEditingLine] = useState<string | null>(null);
  const [showHeldCarts, setShowHeldCarts] = useState(false);
  const [showCustomerAdd, setShowCustomerAdd] = useState(false);
  const [newCustomer, setNewCustomer] = useState({ name: '', phone: '' });

  // Customer + checkout
  const [selectedCustomer, setSelectedCustomer] = useState<Customer | null>(null);
  const [paymentMethod, setPaymentMethod] = useState<PaymentMethod>('CASH');
  const [paidAmountStr, setPaidAmountStr] = useState('');
  const [saleMode, setSaleMode] = useState<SaleMode>('FULL_PAYMENT');
  const [globalDiscount, setGlobalDiscount] = useState('');

  // Held carts
  const [heldCarts, setHeldCarts] = useState<HeldCart[]>([]);

  // Queries
  const { data: productsData = EMPTY_LIST } = useQuery({
    queryKey: ['pos-products', search],
    queryFn: async () => {
      try {
        return (await productsApi.list({ search: search || undefined, limit: 100 })) ?? EMPTY_LIST;
      } catch {
        return EMPTY_LIST;
      }
    },
  });

  const { data: customersData = EMPTY_LIST } = useQuery({
    queryKey: ['pos-customers'],
    queryFn: async () => {
      try {
        return (await customersApi.list({ limit: 500 })) ?? EMPTY_LIST;
      } catch {
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
      } catch {
        return null;
      }
    },
    enabled: !!selectedCustomer,
  });

  const productItems = productsData?.items ?? [];
  const customerItems = customersData?.items ?? [];

  // Load held carts on mount
  useEffect(() => {
    loadHeldCarts().then(setHeldCarts);
  }, []);

  // Subtotal + totals
  const subtotal = useMemo(
    () =>
      cart.reduce((sum, item) => {
        const unitPrice =
          item.priceOverride ??
          (item.useWholesale ? item.wholesalePrice ?? item.basePrice : item.basePrice);
        return sum + unitPrice * item.quantity;
      }, 0),
    [cart],
  );

  const totalLineDiscount = useMemo(
    () => cart.reduce((sum, item) => sum + (item.lineDiscount || 0), 0),
    [cart],
  );

  const gDiscount = Number(globalDiscount) || 0;
  const totalDiscount = totalLineDiscount + gDiscount;
  const total = Math.max(subtotal - totalDiscount, 0);
  const totalItems = useMemo(
    () => cart.reduce((sum, item) => sum + item.quantity, 0),
    [cart],
  );

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
    const todaySales = sales.filter((s) => new Date(s.soldAt).toDateString() === today);
    const todayCredit = todaySales.reduce((sum, s) => sum + (s.creditAmount || 0), 0);
    const todayPaid = todaySales.reduce((sum, s) => sum + (s.paidAmount || 0), 0);

    return {
      currentBalance: customerDetail.balance || 0,
      todaySalesCount: todaySales.length,
      todayCredit,
      todayPaid,
      totalSales: customerDetail._count?.sales ?? sales.length,
      lastSaleDate: sales[0]?.soldAt,
    };
  }, [customerDetail]);

  // Auto-switch sale mode logic
  useEffect(() => {
    if (!selectedCustomer && (saleMode === 'PARTIAL_CREDIT' || saleMode === 'FULL_CREDIT')) {
      setSaleMode('FULL_PAYMENT');
      setPaidAmountStr('');
    }
  }, [selectedCustomer, saleMode]);

  useEffect(() => {
    if (saleMode === 'FULL_PAYMENT') setPaidAmountStr(String(total.toFixed(2)));
    else if (saleMode === 'FULL_CREDIT') setPaidAmountStr('0');
  }, [saleMode, total]);

  const filteredCustomers = useMemo(() => {
    const q = customerSearch.toLowerCase().trim();
    if (!q) return customerItems;
    return customerItems.filter(
      (c) => c.name.toLowerCase().includes(q) || (c.phone || '').toLowerCase().includes(q),
    );
  }, [customerItems, customerSearch]);

  const quickAmounts = useMemo(() => {
    const amts = new Set(
      [Math.floor(total / 2), 500, 1000, 2000, 5000].filter((n) => n > 0 && n < total),
    );
    return Array.from(amts).slice(0, 4);
  }, [total]);

  // Mutations
  const checkoutMutation = useMutation({
    mutationFn: () =>
      salesApi.create({
        customerId: selectedCustomer?.id,
        paymentMethod,
        paidAmount: effectivePaid,
        discount: gDiscount,
        allowCredit: isCreditSale,
        items: cart.map((c) => ({
          productId: c.productId,
          variantId: c.variantId,
          quantity: c.quantity,
          priceOverride: c.priceOverride,
          lineDiscount: c.lineDiscount || undefined,
          useWholesale: c.useWholesale || undefined,
          note: c.note,
        })),
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
      resetCart();
      setCheckoutOpen(false);
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

  const addCustomerMutation = useMutation({
    mutationFn: () =>
      customersApi.create({
        name: newCustomer.name.trim(),
        phone: newCustomer.phone.trim() || undefined,
      }),
    onSuccess: (customer) => {
      Toast.show({ type: 'success', text1: `${customer.name} added` });
      setSelectedCustomer(customer);
      setShowCustomerAdd(false);
      setNewCustomer({ name: '', phone: '' });
      queryClient.invalidateQueries({ queryKey: ['pos-customers'] });
    },
    onError: (e: any) => {
      Toast.show({
        type: 'error',
        text1: e?.response?.data?.message || 'Add failed',
      });
    },
  });

  // Helpers
  const resetCart = () => {
    setCart([]);
    setSelectedCustomer(null);
    setPaymentMethod('CASH');
    setPaidAmountStr('');
    setSaleMode('FULL_PAYMENT');
    setGlobalDiscount('');
    setEditingLine(null);
  };

  // Check if product needs IMEI (mobile shops with imei feature)
  const productNeedsImei = (product: Product): boolean => {
    if (!businessFeatures.imei) return false;
    const name = product.name.toLowerCase();
    const category = (product.category?.name || '').toLowerCase();
    return MOBILE_KEYWORDS.some((kw) => name.includes(kw) || category.includes(kw));
  };

  // Check if product needs Batch (pharmacy with batches feature)
  const productNeedsBatch = (product: Product): boolean => {
    if (!businessFeatures.batches) return false;
    return product.expiryTracked === true;
  };

  const handleImeiSelect = (imei: ProductImei) => {
    if (!imeiPickerData) return;
    const { product, variant } = imeiPickerData;
    const newItem: CartItem = {
      cartLineId: newCartLineId(),
      productId: product.id,
      variantId: variant?.id,
      imeiId: imei.id,
      imeiNumber: imei.imei1,
      name: product.name,
      variantName: variant?.name,
      variantImage: variant?.imageUrl ?? undefined,
      variantColor: variant?.color ?? undefined,
      variantColorHex: variant?.colorHex ?? undefined,
      variantSize: variant?.size ?? undefined,
      productImage: product.images?.[0]?.url,
      basePrice: variant?.price ?? product.price,
      wholesalePrice: variant?.wholesalePrice ?? product.wholesalePrice,
      stock: 1,
      quantity: 1,
      unit: variant?.unit ?? product.unit,
      category: product.category,
      useWholesale: false,
      lineDiscount: 0,
      note: `IMEI: ${imei.imei1}`,
    };
    setCart((prev) => [...prev, newItem]);
    setImeiPickerData(null);
    Toast.show({ type: 'success', text1: `${product.name} added with IMEI` });
  };

  const handleBatchSelect = (batch: ProductBatch) => {
    if (!batchPickerData) return;
    const { product, variant, quantity } = batchPickerData;
    const newItem: CartItem = {
      cartLineId: newCartLineId(),
      productId: product.id,
      variantId: variant?.id,
      batchId: batch.id,
      batchNumber: batch.batchNumber,
      name: product.name,
      variantName: variant?.name,
      variantImage: variant?.imageUrl ?? undefined,
      variantColor: variant?.color ?? undefined,
      variantColorHex: variant?.colorHex ?? undefined,
      variantSize: variant?.size ?? undefined,
      productImage: product.images?.[0]?.url,
      basePrice: variant?.price ?? product.price,
      wholesalePrice: variant?.wholesalePrice ?? product.wholesalePrice,
      stock: batch.quantity,
      quantity,
      unit: variant?.unit ?? product.unit,
      category: product.category,
      useWholesale: false,
      lineDiscount: 0,
      note: `Batch: ${batch.batchNumber}${batch.expiryDate ? ` • Exp: ${new Date(batch.expiryDate).toLocaleDateString('en-PK')}` : ''}`,
    };
    setCart((prev) => [...prev, newItem]);
    setBatchPickerData(null);
    Toast.show({ type: 'success', text1: `${product.name} added from batch ${batch.batchNumber}` });
  };

  const addProductToCart = async (product: Product) => {
    if (product.stock <= 0) {
      Haptics.notificationAsync(Haptics.NotificationFeedbackType.Warning);
      Toast.show({ type: 'error', text1: `${product.name} stock mein nahi` });
      return;
    }

    if (product.hasVariants) {
      try {
        const variants = await productVariantsApi.list(product.id);
        const active = variants.filter((v) => v.isActive);
        if (active.length === 0) {
          Toast.show({ type: 'error', text1: 'No active variants' });
          return;
        }
        setVariantPickerData(variants);
        setVariantPickerProduct(product);
        return;
      } catch {
        Toast.show({ type: 'error', text1: 'Failed to load variants' });
        return;
      }
    }

    // Check IMEI / Batch needs for non-variant products
    if (productNeedsImei(product)) {
      setImeiPickerData({ product });
      return;
    }
    if (productNeedsBatch(product)) {
      setBatchPickerData({ product, quantity: 1 });
      return;
    }

    addToCart(product, null);
  };

  const addToCart = (product: Product, variant: ProductVariant | null) => {
    Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
    const variantId = variant?.id;
    const existingIndex = cart.findIndex(
      (item) =>
        item.productId === product.id &&
        item.variantId === variantId &&
        item.priceOverride === undefined,
    );

    if (existingIndex >= 0) {
      const existing = cart[existingIndex];
      const stock = variant ? variant.stock : product.stock;
      if (existing.quantity >= stock) {
        Haptics.notificationAsync(Haptics.NotificationFeedbackType.Warning);
        Toast.show({ type: 'error', text1: 'Stock limit reached' });
        return;
      }
      setCart((prev) =>
        prev.map((item, i) =>
          i === existingIndex ? { ...item, quantity: item.quantity + 1 } : item,
        ),
      );
      return;
    }

    const newItem: CartItem = {
      cartLineId: newCartLineId(),
      productId: product.id,
      variantId,
      name: product.name,
      variantName: variant?.name,
      variantImage: variant?.imageUrl ?? undefined,
      variantColor: variant?.color ?? undefined,
      variantColorHex: variant?.colorHex ?? undefined,
      variantSize: variant?.size ?? undefined,
      productImage: product.images?.[0]?.url,
      basePrice: variant?.price ?? product.price,
      wholesalePrice: variant?.wholesalePrice ?? product.wholesalePrice,
      stock: variant?.stock ?? product.stock,
      quantity: 1,
      unit: variant?.unit ?? product.unit,
      category: product.category,
      useWholesale: false,
      lineDiscount: 0,
    };

    setCart((prev) => [...prev, newItem]);
    Toast.show({
      type: 'success',
      text1: 'Added',
      text2: `${product.name}${variant ? ` (${variant.name})` : ''}`,
    });
  };

  const handleVariantSelect = (variant: ProductVariant) => {
    if (!variantPickerProduct) return;

    // Check IMEI / Batch for variant products
    if (productNeedsImei(variantPickerProduct)) {
      setImeiPickerData({ product: variantPickerProduct, variant });
      setVariantPickerProduct(null);
      setVariantPickerData([]);
      return;
    }
    if (productNeedsBatch(variantPickerProduct)) {
      setBatchPickerData({ product: variantPickerProduct, variant, quantity: 1 });
      setVariantPickerProduct(null);
      setVariantPickerData([]);
      return;
    }

    addToCart(variantPickerProduct, variant);
    setVariantPickerProduct(null);
    setVariantPickerData([]);
  };

  const updateCartLine = (cartLineId: string, patch: Partial<CartItem>) => {
    setCart((prev) =>
      prev.map((item) => (item.cartLineId === cartLineId ? { ...item, ...patch } : item)),
    );
  };

  const removeCartLine = (cartLineId: string) => {
    Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
    setCart((prev) => prev.filter((item) => item.cartLineId !== cartLineId));
  };

  const setLineQuantity = (cartLineId: string, qty: number) => {
    const item = cart.find((i) => i.cartLineId === cartLineId);
    if (!item) return;
    if (qty < 0.01) {
      removeCartLine(cartLineId);
      return;
    }
    if (qty > item.stock) {
      Haptics.notificationAsync(Haptics.NotificationFeedbackType.Warning);
      Toast.show({ type: 'error', text1: `Stock: ${item.stock} ${item.unit}` });
      return;
    }
    Haptics.selectionAsync();
    updateCartLine(cartLineId, { quantity: Number(qty.toFixed(2)) });
  };

  const handleBarcodeScanned = async (code: string) => {
    setScannerOpen(false);
    if (!code.trim()) return;
    try {
      const product = await productsApi.byBarcode(code.trim());
      if ((product as any).matchedVariant) {
        addToCart(product, (product as any).matchedVariant);
      } else {
        await addProductToCart(product);
      }
    } catch {
      Haptics.notificationAsync(Haptics.NotificationFeedbackType.Error);
      Toast.show({ type: 'error', text1: 'Product not found', text2: code });
    }
  };

  const openCheckout = () => {
    if (cart.length === 0) {
      Toast.show({ type: 'error', text1: 'Cart is empty' });
      return;
    }
    Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Medium);
    setPaidAmountStr(String(total.toFixed(2)));
    setSaleMode('FULL_PAYMENT');
    setCheckoutOpen(true);
  };

  const handleHold = async () => {
    if (cart.length === 0) {
      Toast.show({ type: 'error', text1: 'Cart is empty' });
      return;
    }
    const held: HeldCart = {
      id: newCartLineId(),
      items: cart,
      customerId: selectedCustomer?.id || '',
      customerName: selectedCustomer?.name || 'Walk-in',
      total,
      heldAt: Date.now(),
    };
    const next = [held, ...heldCarts].slice(0, 10);
    setHeldCarts(next);
    await saveHeldCarts(next);
    resetCart();
    Haptics.notificationAsync(Haptics.NotificationFeedbackType.Success);
    Toast.show({ type: 'success', text1: 'Cart held' });
  };

  const handleResumeCart = async (held: HeldCart) => {
    if (cart.length > 0) {
      Alert.alert('Replace cart?', 'Current cart hai. Replace?', [
        { text: 'Cancel', style: 'cancel' },
        {
          text: 'Replace',
          onPress: async () => {
            setCart(held.items);
            if (held.customerId) {
              const cust = customerItems.find((c) => c.id === held.customerId);
              if (cust) setSelectedCustomer(cust);
            }
            const remaining = heldCarts.filter((c) => c.id !== held.id);
            setHeldCarts(remaining);
            await saveHeldCarts(remaining);
            setShowHeldCarts(false);
          },
        },
      ]);
      return;
    }
    setCart(held.items);
    if (held.customerId) {
      const cust = customerItems.find((c) => c.id === held.customerId);
      if (cust) setSelectedCustomer(cust);
    }
    const remaining = heldCarts.filter((c) => c.id !== held.id);
    setHeldCarts(remaining);
    await saveHeldCarts(remaining);
    setShowHeldCarts(false);
    Toast.show({ type: 'success', text1: 'Cart resumed' });
  };

  const handleDeleteHeld = async (id: string) => {
    const remaining = heldCarts.filter((c) => c.id !== id);
    setHeldCarts(remaining);
    await saveHeldCarts(remaining);
  };

  const handleCheckout = () => {
    if (isCreditSale && !selectedCustomer) {
      Toast.show({ type: 'error', text1: 'Customer required for credit' });
      return;
    }
    if (saleMode === 'PARTIAL_CREDIT' && effectivePaid >= total) {
      Toast.show({ type: 'error', text1: 'Partial mein paid amount kam honi chahiye' });
      return;
    }
    if (saleMode === 'PARTIAL_CREDIT' && effectivePaid <= 0) {
      Toast.show({ type: 'error', text1: 'Paid amount required' });
      return;
    }
    checkoutMutation.mutate();
  };

  return (
    <SafeAreaView className="flex-1 bg-neutral-50 dark:bg-neutral-950" edges={['top']}>
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
              <Text className="text-2xl font-bold text-neutral-900 dark:text-white">
                POS Counter
              </Text>
              <View className="flex-row items-center gap-1.5 mt-0.5">
                <Sparkles size={11} color="#f59e0b" />
                <Text className="text-xs text-neutral-500">
                  {productItems.length} products • {customerItems.length} customers
                </Text>
              </View>
            </View>
          </View>

          {/* Action buttons */}
          <View className="flex-row items-center gap-1.5">
            {heldCarts.length > 0 && (
              <Pressable
                onPress={() => setShowHeldCarts(true)}
                className="h-12 px-3 rounded-2xl bg-amber-100 dark:bg-amber-950/40 flex-row items-center gap-1.5 active:opacity-80 relative"
              >
                <Pause size={14} color="#d97706" />
                <Text className="text-amber-800 font-bold text-xs">Held</Text>
                <View
                  className="absolute -top-1 -right-1 h-5 w-5 rounded-full items-center justify-center"
                  style={{ backgroundColor: '#d97706' }}
                >
                  <Text className="text-white text-[10px] font-extrabold">
                    {heldCarts.length}
                  </Text>
                </View>
              </Pressable>
            )}
            <Pressable
              onPress={() => {
                Haptics.selectionAsync();
                setHidePrices((v) => !v);
              }}
              className="h-12 w-12 rounded-2xl bg-neutral-100 dark:bg-neutral-800 items-center justify-center"
            >
              {hidePrices ? <EyeOff size={18} color="#374151" /> : <Eye size={18} color="#374151" />}
            </Pressable>
            <Pressable
              onPress={() => {
                Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
                setScannerOpen(true);
              }}
              className="h-12 px-3.5 rounded-2xl flex-row items-center gap-1.5 active:opacity-80"
              style={{
                backgroundColor: '#16a34a',
                shadowColor: '#16a34a',
                shadowOpacity: 0.3,
                shadowRadius: 8,
                elevation: 4,
              }}
            >
              <ScanLine size={16} color="#ffffff" />
              <Text className="text-white font-bold text-xs">Scan</Text>
            </Pressable>
          </View>
        </View>

        {/* Search */}
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
                  {search ? `"${search}" se match nahi hua` : 'Add products from Products tab'}
                </Text>
              </View>
            ) : (
              productItems.map((p) => {
                const inCart = cart.find((c) => c.productId === p.id && !c.variantId);
                const outOfStock = p.stock <= 0;
                const lowStock = p.stock > 0 && p.stock <= p.lowStockAlert;
                const primaryImage = p.images?.[0]?.url;

                return (
                  <View key={p.id} className="w-1/2 p-1.5">
                    <Pressable
                      onPress={() => addProductToCart(p)}
                      disabled={outOfStock}
                      className="active:opacity-70"
                    >
                      <Card
                        variant="outline"
                        className={`p-0 overflow-hidden ${
                          outOfStock
                            ? 'opacity-50'
                            : inCart
                            ? 'border-2'
                            : ''
                        }`}
                        style={inCart ? { borderColor: '#16a34a' } : undefined}
                      >
                        {/* Image */}
                        <View style={{ aspectRatio: 1 }} className="bg-neutral-100 dark:bg-neutral-800 relative">
                          {primaryImage ? (
                            <Image
                              source={{ uri: primaryImage }}
                              style={{ width: '100%', height: '100%' }}
                              resizeMode="cover"
                            />
                          ) : (
                            <View className="w-full h-full items-center justify-center">
                              <Package size={32} color="#9ca3af" />
                            </View>
                          )}

                          {inCart && (
                            <View
                              className="absolute top-1.5 right-1.5 h-7 min-w-7 px-1.5 rounded-full items-center justify-center"
                              style={{
                                backgroundColor: '#16a34a',
                                shadowColor: '#16a34a',
                                shadowOpacity: 0.4,
                                shadowRadius: 4,
                                elevation: 4,
                              }}
                            >
                              <Text className="text-white font-extrabold text-xs">
                                {formatQty(inCart.quantity)}
                              </Text>
                            </View>
                          )}

                          {!inCart && outOfStock && (
                            <View className="absolute top-1.5 right-1.5 bg-rose-600 px-2 py-0.5 rounded-md">
                              <Text className="text-[9px] text-white font-extrabold">OUT</Text>
                            </View>
                          )}
                          {!inCart && !outOfStock && lowStock && (
                            <View className="absolute top-1.5 right-1.5 bg-amber-500 px-2 py-0.5 rounded-md">
                              <Text className="text-[9px] text-white font-extrabold">LOW</Text>
                            </View>
                          )}
                          {p.hasVariants && (
                            <View
                              className="absolute bottom-1.5 left-1.5 flex-row items-center gap-1 px-1.5 py-0.5 rounded-md"
                              style={{ backgroundColor: '#8b5cf6' }}
                            >
                              <Layers size={9} color="#ffffff" />
                              <Text className="text-[9px] text-white font-extrabold">
                                VARIANTS
                              </Text>
                            </View>
                          )}
                        </View>

                        {/* Body */}
                        <View className="p-2.5">
                          <Text
                            className="text-sm font-bold text-neutral-900 dark:text-white leading-snug"
                            numberOfLines={2}
                          >
                            {p.name}
                          </Text>

                          <View className="mt-1.5 flex-row items-end justify-between">
                            <Text className="text-base font-extrabold text-brand-700 dark:text-brand-400">
                              {hidePrices ? '••••' : formatPKRFull(p.price)}
                            </Text>
                            <Text className="text-[10px] text-neutral-500 font-medium">
                              {formatQty(p.stock)} {p.unit}
                            </Text>
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
          <ScrollView className="max-h-72" showsVerticalScrollIndicator={false}>
            {cart.map((item) => {
              const isEditing = editingLine === item.cartLineId;
              const unitPrice =
                item.priceOverride ??
                (item.useWholesale ? item.wholesalePrice ?? item.basePrice : item.basePrice);
              const lineTotal = unitPrice * item.quantity - (item.lineDiscount || 0);
              const canUseLW = LW_UNITS.has(item.unit);

              return (
                <View key={item.cartLineId} className="border-b border-neutral-100 dark:border-neutral-800">
                  {/* Compact row */}
                  <View className="flex-row items-center px-4 py-2.5 gap-2">
                    {/* Mini thumb */}
                    <View className="h-10 w-10 rounded-lg overflow-hidden bg-neutral-100 dark:bg-neutral-800 border border-neutral-200 dark:border-neutral-700">
                      {item.variantImage || item.productImage ? (
                        <Image
                          source={{ uri: item.variantImage || item.productImage }}
                          style={{ width: '100%', height: '100%' }}
                          resizeMode="cover"
                        />
                      ) : item.variantColorHex ? (
                        <View style={{ width: '100%', height: '100%', backgroundColor: item.variantColorHex }} />
                      ) : (
                        <View className="items-center justify-center h-full">
                          <Package size={14} color="#9ca3af" />
                        </View>
                      )}
                    </View>

                    <View className="flex-1 min-w-0">
                      <Text className="text-sm font-bold text-neutral-900 dark:text-white" numberOfLines={1}>
                        {item.name}
                      </Text>
                      {item.variantName && (
                        <View className="flex-row items-center gap-1 mt-0.5">
                          {item.variantColorHex && (
                            <View
                              style={{
                                height: 8, width: 8, borderRadius: 4,
                                backgroundColor: item.variantColorHex,
                                borderWidth: 1, borderColor: '#cbd5e1',
                              }}
                            />
                          )}
                          <Text className="text-[11px] font-bold text-violet-700 dark:text-violet-400">
                            {item.variantName}
                          </Text>
                        </View>
                      )}
                      <Text className="text-[11px] text-neutral-500 mt-0.5" numberOfLines={1}>
                        {hidePrices ? '••' : formatPKRFull(unitPrice)} × {formatQty(item.quantity)} {item.unit}
                        {item.useWholesale && <Text className="text-amber-700 font-bold"> (W)</Text>}
                        {item.priceOverride !== undefined && <Text className="text-blue-700 font-bold"> (Custom)</Text>}
                      </Text>
                      {item.note && (
                        <View className="flex-row items-center gap-1 mt-0.5">
                          <Ruler size={9} color="#16a34a" />
                          <Text className="text-[10px] text-emerald-700 font-bold" numberOfLines={1}>
                            {item.note}
                          </Text>
                        </View>
                      )}
                      {item.lineDiscount > 0 && (
                        <View className="flex-row items-center gap-1 mt-0.5">
                          <Tag size={9} color="#dc2626" />
                          <Text className="text-[10px] text-rose-600 font-bold">
                            -{formatPKRFull(item.lineDiscount)}
                          </Text>
                        </View>
                      )}
                    </View>

                    <View className="items-end">
                      <Text className="text-sm font-extrabold text-neutral-900 dark:text-white">
                        {hidePrices ? '••••' : formatPKRFull(lineTotal)}
                      </Text>
                      <View className="flex-row gap-1 mt-1">
                        <Pressable
                          onPress={() => setEditingLine(isEditing ? null : item.cartLineId)}
                          className="h-6 w-6 rounded-lg items-center justify-center"
                          style={{ backgroundColor: isEditing ? '#16a34a' : '#f3f4f6' }}
                        >
                          <Edit3 size={12} color={isEditing ? '#ffffff' : '#374151'} />
                        </Pressable>
                        <Pressable
                          onPress={() => removeCartLine(item.cartLineId)}
                          className="h-6 w-6 rounded-lg bg-rose-50 items-center justify-center"
                        >
                          <X size={12} color="#dc2626" />
                        </Pressable>
                      </View>
                    </View>
                  </View>

                  {/* Quantity controls */}
                  <View className="flex-row items-center justify-between px-4 pb-2 gap-2">
                    <View className="flex-row items-center gap-1.5 bg-neutral-50 dark:bg-neutral-800 rounded-xl p-1">
                      <Pressable
                        onPress={() => setLineQuantity(item.cartLineId, item.quantity - 1)}
                        className="h-7 w-7 rounded-lg bg-white dark:bg-neutral-900 border border-neutral-200 dark:border-neutral-700 items-center justify-center active:opacity-70"
                      >
                        <Minus size={12} color="#374151" />
                      </Pressable>
                      <TextInput
                        value={String(item.quantity)}
                        onChangeText={(t) => {
                          const v = parseFloat(t);
                          if (!isNaN(v)) setLineQuantity(item.cartLineId, v);
                        }}
                        keyboardType="decimal-pad"
                        className="w-14 text-center font-extrabold text-neutral-900 dark:text-white"
                      />
                      <Pressable
                        onPress={() => setLineQuantity(item.cartLineId, item.quantity + 1)}
                        disabled={item.quantity >= item.stock}
                        className="h-7 w-7 rounded-lg items-center justify-center active:opacity-70"
                        style={{ backgroundColor: '#16a34a' }}
                      >
                        <Plus size={12} color="#ffffff" />
                      </Pressable>
                    </View>

                    {canUseLW && (
                      <Pressable
                        onPress={() => setLwOpen(item)}
                        className="px-3 h-8 rounded-lg flex-row items-center gap-1.5 active:opacity-80"
                        style={{ backgroundColor: '#16a34a' }}
                      >
                        <Ruler size={12} color="#ffffff" />
                        <Text className="text-white text-[11px] font-extrabold">Calculate</Text>
                      </Pressable>
                    )}
                  </View>

                  {/* Inline editor */}
                  {isEditing && (
                    <View className="px-4 pb-3 border-t border-neutral-100 dark:border-neutral-800 pt-3 gap-2 bg-brand-50/30 dark:bg-brand-950/20">
                      {item.wholesalePrice && (
                        <Pressable
                          onPress={() => updateCartLine(item.cartLineId, {
                            useWholesale: !item.useWholesale,
                            priceOverride: undefined,
                          })}
                          className="flex-row items-center justify-between p-2.5 rounded-xl bg-white dark:bg-neutral-900 border border-neutral-200 dark:border-neutral-700"
                        >
                          <Text className="text-xs font-bold text-neutral-700 dark:text-neutral-300">
                            Use wholesale price
                          </Text>
                          <View
                            style={{
                              height: 22, width: 38, borderRadius: 11, padding: 2,
                              justifyContent: 'center',
                              backgroundColor: item.useWholesale ? '#f59e0b' : '#d1d5db',
                            }}
                          >
                            <View
                              style={{
                                height: 18, width: 18, borderRadius: 9,
                                backgroundColor: '#ffffff',
                                transform: [{ translateX: item.useWholesale ? 16 : 0 }],
                              }}
                            />
                          </View>
                        </Pressable>
                      )}

                      <View className="flex-row gap-2">
                        <View className="flex-1">
                          <Text className="text-[10px] font-bold uppercase text-neutral-500 mb-1">Custom Price</Text>
                          <TextInput
                            value={item.priceOverride !== undefined ? String(item.priceOverride) : ''}
                            onChangeText={(t) => {
                              const v = t === '' ? undefined : parseFloat(t);
                              updateCartLine(item.cartLineId, { priceOverride: v });
                            }}
                            keyboardType="decimal-pad"
                            placeholder={String(item.basePrice)}
                            placeholderTextColor="#9ca3af"
                            className="h-10 rounded-xl border border-neutral-200 dark:border-neutral-700 bg-white dark:bg-neutral-900 px-3 text-sm font-bold text-neutral-900 dark:text-white"
                          />
                        </View>
                        <View className="flex-1">
                          <Text className="text-[10px] font-bold uppercase text-neutral-500 mb-1">Discount (Rs)</Text>
                          <TextInput
                            value={item.lineDiscount > 0 ? String(item.lineDiscount) : ''}
                            onChangeText={(t) => updateCartLine(item.cartLineId, { lineDiscount: parseFloat(t) || 0 })}
                            keyboardType="decimal-pad"
                            placeholder="0"
                            placeholderTextColor="#9ca3af"
                            className="h-10 rounded-xl border border-neutral-200 dark:border-neutral-700 bg-white dark:bg-neutral-900 px-3 text-sm font-bold text-neutral-900 dark:text-white"
                          />
                        </View>
                      </View>

                      <View>
                        <Text className="text-[10px] font-bold uppercase text-neutral-500 mb-1">Note</Text>
                        <TextInput
                          value={item.note ?? ''}
                          onChangeText={(t) => updateCartLine(item.cartLineId, { note: t })}
                          placeholder="Optional note"
                          placeholderTextColor="#9ca3af"
                          className="h-10 rounded-xl border border-neutral-200 dark:border-neutral-700 bg-white dark:bg-neutral-900 px-3 text-sm text-neutral-900 dark:text-white"
                        />
                      </View>

                      <Pressable
                        onPress={() => setEditingLine(null)}
                        className="h-10 rounded-xl items-center justify-center"
                        style={{ backgroundColor: '#16a34a' }}
                      >
                        <Text className="text-white font-extrabold text-xs">Done</Text>
                      </Pressable>
                    </View>
                  )}
                </View>
              );
            })}
          </ScrollView>

          {/* Cart summary bar */}
          <View className="px-5 py-3.5 flex-row items-center justify-between">
            <View className="flex-1">
              <View className="flex-row items-center gap-2">
                <View className="flex-row items-center gap-1.5 bg-brand-100 dark:bg-brand-950/40 px-2.5 py-1 rounded-full">
                  <ShoppingCart size={12} color="#16a34a" />
                  <Text className="text-xs text-brand-700 dark:text-brand-400 font-bold">
                    {formatQty(totalItems)} items
                  </Text>
                </View>
                <Pressable onPress={handleHold} className="flex-row items-center gap-1">
                  <Pause size={10} color="#d97706" />
                  <Text className="text-xs text-amber-700 font-bold">Hold</Text>
                </Pressable>
                <Pressable
                  onPress={() => {
                    Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
                    Alert.alert('Clear cart?', 'Sure?', [
                      { text: 'Cancel', style: 'cancel' },
                      { text: 'Clear', style: 'destructive', onPress: resetCart },
                    ]);
                  }}
                >
                  <Text className="text-xs text-rose-600 font-bold">Clear</Text>
                </Pressable>
              </View>
              <Text className="text-3xl font-extrabold text-neutral-900 dark:text-white mt-1">
                {hidePrices ? '••••' : formatPKRFull(total)}
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

      {/* L×W Calculator */}
      <LengthWidthCalculator
        visible={!!lwOpen}
        productName={lwOpen ? lwOpen.name + (lwOpen.variantName ? ` (${lwOpen.variantName})` : '') : ''}
        unit={lwOpen?.unit || 'sqft'}
        onApply={(qty, note) => {
          if (!lwOpen) return;
          if (qty > lwOpen.stock) {
            Toast.show({ type: 'error', text1: `Stock: ${lwOpen.stock} ${lwOpen.unit}` });
            return;
          }
          updateCartLine(lwOpen.cartLineId, { quantity: qty, note });
          setLwOpen(null);
          Toast.show({ type: 'success', text1: `Updated: ${qty.toFixed(2)} ${lwOpen.unit}` });
        }}
        onClose={() => setLwOpen(null)}
      />

      {/* Variant Picker */}
      <ImeiPickerModal
        visible={!!imeiPickerData}
        productId={imeiPickerData?.product.id || ''}
        productName={imeiPickerData?.product.name || ''}
        variantId={imeiPickerData?.variant?.id}
        variantName={imeiPickerData?.variant?.name}
        excludeIds={cart.filter((c) => c.imeiId).map((c) => c.imeiId!)}
        onSelect={handleImeiSelect}
        onClose={() => setImeiPickerData(null)}
      />

      <BatchPickerModal
        visible={!!batchPickerData}
        productId={batchPickerData?.product.id || ''}
        productName={batchPickerData?.product.name || ''}
        unit={batchPickerData?.product.unit || 'pcs'}
        variantId={batchPickerData?.variant?.id}
        variantName={batchPickerData?.variant?.name}
        quantity={batchPickerData?.quantity || 1}
        onSelect={handleBatchSelect}
        onClose={() => setBatchPickerData(null)}
      />

      <VariantPicker
        visible={!!variantPickerProduct}
        product={variantPickerProduct}
        variants={variantPickerData}
        onSelect={handleVariantSelect}
        onClose={() => {
          setVariantPickerProduct(null);
          setVariantPickerData([]);
        }}
      />

      {/* ===== Held Carts Modal ===== */}
      <Modal
        visible={showHeldCarts}
        animationType="slide"
        presentationStyle="pageSheet"
        onRequestClose={() => setShowHeldCarts(false)}
      >
        <SafeAreaView className="flex-1 bg-neutral-50 dark:bg-neutral-950">
          <View className="px-5 py-4 border-b border-neutral-200 dark:border-neutral-800 flex-row items-center gap-3">
            <View
              className="h-11 w-11 rounded-2xl items-center justify-center"
              style={{ backgroundColor: '#d97706' }}
            >
              <Pause size={20} color="#ffffff" />
            </View>
            <View className="flex-1">
              <Text className="text-base font-bold text-neutral-900 dark:text-white">Held Carts</Text>
              <Text className="text-xs text-neutral-500">{heldCarts.length} on hold</Text>
            </View>
            <Pressable
              onPress={() => setShowHeldCarts(false)}
              hitSlop={12}
              className="h-10 w-10 rounded-2xl bg-neutral-100 dark:bg-neutral-800 items-center justify-center"
            >
              <X size={20} color="#6b7280" />
            </Pressable>
          </View>

          <ScrollView contentContainerStyle={{ padding: 20 }}>
            {heldCarts.length === 0 ? (
              <View className="items-center py-12">
                <Pause size={40} color="#d1d5db" />
                <Text className="mt-3 text-base font-bold text-neutral-700 dark:text-neutral-300">
                  No held carts
                </Text>
              </View>
            ) : (
              heldCarts.map((held) => (
                <View
                  key={held.id}
                  className="rounded-2xl bg-white dark:bg-neutral-900 border-2 border-neutral-200 dark:border-neutral-800 p-3 mb-2"
                >
                  <View className="flex-row items-start justify-between">
                    <View className="flex-1 min-w-0">
                      <View className="flex-row items-center gap-1.5 mb-0.5">
                        <User size={12} color="#8b5cf6" />
                        <Text className="font-bold text-neutral-900 dark:text-white" numberOfLines={1}>
                          {held.customerName}
                        </Text>
                      </View>
                      <Text className="text-xs text-neutral-500">
                        {held.items.length} items • {formatRelative(held.heldAt)}
                      </Text>
                    </View>
                    <View className="items-end">
                      <Text className="text-lg font-extrabold text-emerald-700 dark:text-emerald-400">
                        {formatPKRFull(held.total)}
                      </Text>
                      <View className="flex-row gap-1 mt-1">
                        <Pressable
                          onPress={() => handleResumeCart(held)}
                          className="px-2.5 h-7 rounded-lg flex-row items-center gap-1 active:opacity-80"
                          style={{ backgroundColor: '#d97706' }}
                        >
                          <PlayCircle size={11} color="#ffffff" />
                          <Text className="text-white text-[10px] font-extrabold">Resume</Text>
                        </Pressable>
                        <Pressable
                          onPress={() => handleDeleteHeld(held.id)}
                          className="h-7 w-7 rounded-lg bg-rose-50 dark:bg-rose-950/40 items-center justify-center"
                        >
                          <X size={11} color="#dc2626" />
                        </Pressable>
                      </View>
                    </View>
                  </View>
                </View>
              ))
            )}
          </ScrollView>
        </SafeAreaView>
      </Modal>

      {/* ===== Quick Add Customer Modal ===== */}
      <Modal
        visible={showCustomerAdd}
        animationType="slide"
        presentationStyle="formSheet"
        onRequestClose={() => setShowCustomerAdd(false)}
      >
        <SafeAreaView className="flex-1 bg-neutral-50 dark:bg-neutral-950">
          <View className="px-5 py-4 border-b border-neutral-200 dark:border-neutral-800 flex-row items-center gap-3">
            <View
              className="h-11 w-11 rounded-2xl items-center justify-center"
              style={{ backgroundColor: '#8b5cf6' }}
            >
              <UserPlus size={20} color="#ffffff" />
            </View>
            <Text className="flex-1 text-base font-bold text-neutral-900 dark:text-white">
              Quick Add Customer
            </Text>
            <Pressable
              onPress={() => setShowCustomerAdd(false)}
              hitSlop={12}
              className="h-10 w-10 rounded-2xl bg-neutral-100 dark:bg-neutral-800 items-center justify-center"
            >
              <X size={20} color="#6b7280" />
            </Pressable>
          </View>

          <View className="p-5 gap-3">
            <View>
              <Text className="text-xs font-bold uppercase text-neutral-500 mb-1.5">Name *</Text>
              <View className="rounded-2xl border-2 border-neutral-200 dark:border-neutral-800 bg-white dark:bg-neutral-900 px-4 h-12 justify-center">
                <TextInput
                  autoFocus
                  value={newCustomer.name}
                  onChangeText={(t) => setNewCustomer({ ...newCustomer, name: t })}
                  placeholder="Customer name"
                  placeholderTextColor="#9ca3af"
                  className="text-base text-neutral-900 dark:text-white"
                />
              </View>
            </View>
            <View>
              <Text className="text-xs font-bold uppercase text-neutral-500 mb-1.5">Phone</Text>
              <View className="rounded-2xl border-2 border-neutral-200 dark:border-neutral-800 bg-white dark:bg-neutral-900 px-4 h-12 justify-center">
                <TextInput
                  value={newCustomer.phone}
                  onChangeText={(t) => setNewCustomer({ ...newCustomer, phone: t })}
                  placeholder="03XXXXXXXXX"
                  placeholderTextColor="#9ca3af"
                  keyboardType="phone-pad"
                  className="text-base text-neutral-900 dark:text-white"
                />
              </View>
            </View>
            <Pressable
              onPress={() => {
                if (!newCustomer.name.trim()) {
                  Toast.show({ type: 'error', text1: 'Name required' });
                  return;
                }
                addCustomerMutation.mutate();
              }}
              disabled={addCustomerMutation.isPending}
              className="h-12 rounded-2xl items-center justify-center flex-row gap-2 mt-2 active:opacity-80"
              style={{
                backgroundColor: addCustomerMutation.isPending ? '#9ca3af' : '#8b5cf6',
                shadowColor: '#8b5cf6',
                shadowOpacity: 0.4,
                shadowRadius: 8,
                elevation: 4,
              }}
            >
              <UserPlus size={18} color="#ffffff" />
              <Text className="text-white font-extrabold text-base">
                {addCustomerMutation.isPending ? 'Adding...' : 'Add Customer'}
              </Text>
            </Pressable>
          </View>
        </SafeAreaView>
      </Modal>

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
                  <Text className="text-xl font-bold text-neutral-900 dark:text-white">
                    Checkout
                  </Text>
                  <Text className="text-xs text-neutral-500">
                    {formatQty(totalItems)} items • {cart.length} lines
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
                <Text className="text-xs font-bold uppercase tracking-wider text-white/80">
                  Total Amount
                </Text>
                <Text className="text-5xl font-extrabold text-white mt-2">
                  {formatPKRFull(total)}
                </Text>
                {totalDiscount > 0 && (
                  <Text className="text-xs text-white/80 mt-2">
                    Subtotal: {formatPKRFull(subtotal)} • Discount: -{formatPKRFull(totalDiscount)}
                  </Text>
                )}
              </View>

              {/* Global Discount */}
              <View className="mb-3">
                <Text className="text-xs font-bold uppercase text-neutral-500 mb-1.5 tracking-wider">
                  Global Discount (PKR)
                </Text>
                <View className="rounded-2xl border-2 border-neutral-200 dark:border-neutral-800 bg-white dark:bg-neutral-900 px-4 h-12 justify-center">
                  <TextInput
                    value={globalDiscount}
                    onChangeText={setGlobalDiscount}
                    keyboardType="decimal-pad"
                    placeholder="0"
                    placeholderTextColor="#9ca3af"
                    className="text-base font-bold text-neutral-900 dark:text-white"
                  />
                </View>
              </View>

              {/* Customer */}
              <Text className="text-xs font-bold uppercase text-neutral-500 mb-2 tracking-wider">
                Customer
              </Text>
              <View className="flex-row gap-2 mb-3">
                <Pressable
                  onPress={() => setCustomerPickerOpen(true)}
                  className="flex-1 flex-row items-center gap-3 px-4 py-3 rounded-2xl bg-white dark:bg-neutral-900 border border-neutral-200 dark:border-neutral-800 active:opacity-70"
                >
                  <View className="h-10 w-10 rounded-xl bg-violet-100 dark:bg-violet-950/40 items-center justify-center">
                    <User size={18} color="#8b5cf6" />
                  </View>
                  <View className="flex-1 min-w-0">
                    <Text className="font-bold text-neutral-900 dark:text-white" numberOfLines={1}>
                      {selectedCustomer?.name || 'Walk-in Customer'}
                    </Text>
                    <Text className="text-xs text-neutral-500" numberOfLines={1}>
                      {selectedCustomer?.phone || 'Tap to select'}
                    </Text>
                  </View>
                  {selectedCustomer && (
                    <Pressable
                      onPress={() => setSelectedCustomer(null)}
                      hitSlop={8}
                      className="h-7 w-7 rounded-lg bg-neutral-100 dark:bg-neutral-800 items-center justify-center"
                    >
                      <X size={12} color="#9ca3af" />
                    </Pressable>
                  )}
                </Pressable>
                <Pressable
                  onPress={() => setShowCustomerAdd(true)}
                  className="h-14 w-14 rounded-2xl items-center justify-center active:opacity-80"
                  style={{ backgroundColor: '#8b5cf6' }}
                >
                  <UserPlus size={20} color="#ffffff" />
                </Pressable>
              </View>

              {/* Customer Credit Summary */}
              {selectedCustomer && customerCreditSummary && (
                <View className="rounded-2xl overflow-hidden mb-4 border border-violet-200 dark:border-violet-900/50">
                  <View
                    className="px-4 py-3 flex-row items-center gap-3"
                    style={{ backgroundColor: '#7c3aed' }}
                  >
                    <View className="h-9 w-9 rounded-xl bg-white/20 items-center justify-center">
                      <Text className="text-white font-extrabold">
                        {selectedCustomer.name.charAt(0).toUpperCase()}
                      </Text>
                    </View>
                    <View className="flex-1 min-w-0">
                      <Text className="text-white font-bold text-sm" numberOfLines={1}>
                        {selectedCustomer.name}
                      </Text>
                      {selectedCustomer.phone && (
                        <View className="flex-row items-center gap-1 mt-0.5">
                          <Phone size={10} color="rgba(255,255,255,0.8)" />
                          <Text className="text-[10px] text-white/80">{selectedCustomer.phone}</Text>
                        </View>
                      )}
                    </View>
                    {customerCreditSummary.currentBalance > 0 && (
                      <View>
                        <Text className="text-[9px] text-white/70 font-bold uppercase">Udhaar</Text>
                        <Text className="text-base font-extrabold text-amber-300">
                          {formatPKRFull(customerCreditSummary.currentBalance)}
                        </Text>
                      </View>
                    )}
                  </View>

                  <View className="flex-row bg-white dark:bg-neutral-900">
                    <View className="flex-1 p-2.5 items-center border-r border-neutral-100 dark:border-neutral-800">
                      <Text className="text-[9px] text-neutral-500 font-bold uppercase">
                        Aaj Sales
                      </Text>
                      <Text className="text-sm font-extrabold text-neutral-900 dark:text-white mt-0.5">
                        {customerCreditSummary.todaySalesCount}
                      </Text>
                    </View>
                    <View className="flex-1 p-2.5 items-center bg-emerald-50/40 dark:bg-emerald-950/20 border-r border-neutral-100 dark:border-neutral-800">
                      <View className="flex-row items-center gap-0.5">
                        <ArrowDownCircle size={9} color="#16a34a" />
                        <Text className="text-[9px] text-emerald-700 dark:text-emerald-400 font-bold uppercase">
                          Aaj Paid
                        </Text>
                      </View>
                      <Text className="text-xs font-extrabold text-emerald-700 dark:text-emerald-400 mt-0.5">
                        {formatPKRFull(customerCreditSummary.todayPaid)}
                      </Text>
                    </View>
                    <View className="flex-1 p-2.5 items-center bg-amber-50/40 dark:bg-amber-950/20">
                      <View className="flex-row items-center gap-0.5">
                        <ArrowUpCircle size={9} color="#d97706" />
                        <Text className="text-[9px] text-amber-700 dark:text-amber-400 font-bold uppercase">
                          Aaj Udhaar
                        </Text>
                      </View>
                      <Text className="text-xs font-extrabold text-amber-700 dark:text-amber-400 mt-0.5">
                        {formatPKRFull(customerCreditSummary.todayCredit)}
                      </Text>
                    </View>
                  </View>
                </View>
              )}

              {/* Sale Mode */}
              <Text className="text-xs font-bold uppercase text-neutral-500 mb-2 tracking-wider">
                Sale Mode
              </Text>
              <View className="flex-row gap-2 mb-4">
                <Pressable
                  onPress={() => {
                    Haptics.selectionAsync();
                    setSaleMode('FULL_PAYMENT');
                  }}
                  className="flex-1 rounded-2xl border-2 p-3 items-center"
                  style={{
                    borderColor: saleMode === 'FULL_PAYMENT' ? '#16a34a' : '#e5e7eb',
                    backgroundColor: saleMode === 'FULL_PAYMENT' ? '#dcfce7' : '#ffffff',
                  }}
                >
                  <Banknote size={18} color={saleMode === 'FULL_PAYMENT' ? '#16a34a' : '#9ca3af'} />
                  <Text
                    className="text-[10px] font-bold mt-1"
                    style={{
                      color: saleMode === 'FULL_PAYMENT' ? '#15803d' : '#6b7280',
                    }}
                  >
                    Full Cash
                  </Text>
                </Pressable>

                <Pressable
                  onPress={() => {
                    if (!selectedCustomer) {
                      Toast.show({ type: 'error', text1: 'Customer required' });
                      return;
                    }
                    Haptics.selectionAsync();
                    setSaleMode('PARTIAL_CREDIT');
                    setPaidAmountStr(String(Math.floor(total / 2)));
                  }}
                  disabled={!selectedCustomer}
                  className="flex-1 rounded-2xl border-2 p-3 items-center"
                  style={{
                    borderColor: saleMode === 'PARTIAL_CREDIT' ? '#d97706' : '#e5e7eb',
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
                    color={saleMode === 'PARTIAL_CREDIT' ? '#d97706' : '#9ca3af'}
                  />
                  <Text
                    className="text-[10px] font-bold mt-1"
                    style={{
                      color: saleMode === 'PARTIAL_CREDIT' ? '#b45309' : '#6b7280',
                    }}
                  >
                    Partial
                  </Text>
                </Pressable>

                <Pressable
                  onPress={() => {
                    if (!selectedCustomer) {
                      Toast.show({ type: 'error', text1: 'Customer required' });
                      return;
                    }
                    Haptics.selectionAsync();
                    setSaleMode('FULL_CREDIT');
                    setPaidAmountStr('0');
                  }}
                  disabled={!selectedCustomer}
                  className="flex-1 rounded-2xl border-2 p-3 items-center"
                  style={{
                    borderColor: saleMode === 'FULL_CREDIT' ? '#dc2626' : '#e5e7eb',
                    backgroundColor:
                      saleMode === 'FULL_CREDIT'
                        ? '#fee2e2'
                        : !selectedCustomer
                        ? '#f9fafb'
                        : '#ffffff',
                    opacity: !selectedCustomer ? 0.5 : 1,
                  }}
                >
                  <BookOpen size={18} color={saleMode === 'FULL_CREDIT' ? '#dc2626' : '#9ca3af'} />
                  <Text
                    className="text-[10px] font-bold mt-1"
                    style={{
                      color: saleMode === 'FULL_CREDIT' ? '#b91c1c' : '#6b7280',
                    }}
                  >
                    Full Udhaar
                  </Text>
                </Pressable>
              </View>

              {/* Payment Method */}
              {saleMode !== 'FULL_CREDIT' && (
                <>
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
                </>
              )}

              {/* Paid Amount */}
              {saleMode === 'PARTIAL_CREDIT' && (
                <>
                  <Text className="text-xs font-bold uppercase text-amber-700 mb-2 tracking-wider">
                    Paid Now (Rest → Khata)
                  </Text>
                  <View className="flex-row items-center gap-2 rounded-2xl border-2 border-amber-300 bg-amber-50 px-4 h-16 mb-2">
                    <Wallet size={22} color="#d97706" />
                    <Text className="text-lg font-bold text-amber-700">Rs</Text>
                    <TextInput
                      value={paidAmountStr}
                      onChangeText={setPaidAmountStr}
                      keyboardType="decimal-pad"
                      placeholder="0"
                      placeholderTextColor="#fcd34d"
                      className="flex-1 text-3xl font-extrabold text-amber-900"
                    />
                  </View>

                  {quickAmounts.length > 0 && (
                    <View className="flex-row gap-2 mb-3">
                      {quickAmounts.map((amt, idx) => (
                        <Pressable
                          key={`${idx}-${amt}`}
                          onPress={() => {
                            Haptics.selectionAsync();
                            setPaidAmountStr(String(amt));
                          }}
                          className="flex-1 py-2 rounded-xl bg-amber-100 active:opacity-70"
                        >
                          <Text className="text-center text-[10px] font-bold text-amber-800">
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
                <View className="rounded-2xl bg-emerald-50 dark:bg-emerald-950/30 border border-emerald-200 p-4 mb-3">
                  <View className="flex-row items-center gap-2">
                    <TrendingDown size={16} color="#16a34a" />
                    <Text className="text-xs text-emerald-700 font-bold uppercase">
                      Change Wapis
                    </Text>
                  </View>
                  <Text className="text-2xl font-extrabold text-emerald-700 mt-1">
                    {formatPKRFull(changeAmount)}
                  </Text>
                </View>
              )}

              {/* Credit info */}
              {creditAmount > 0 && (
                <View className="rounded-2xl bg-amber-50 border-2 border-amber-300 p-4 mb-3">
                  <View className="flex-row items-center gap-2 mb-1">
                    <BookOpen size={16} color="#d97706" />
                    <Text className="text-xs font-bold text-amber-900 uppercase tracking-wider">
                      Khata mein Add
                    </Text>
                  </View>
                  <Text className="text-2xl font-extrabold text-amber-700">
                    {formatPKRFull(creditAmount)}
                  </Text>
                  {selectedCustomer && customerCreditSummary && (
                    <Text className="text-[11px] text-amber-800 mt-1 font-semibold">
                      Sale ke baad total udhaar:{' '}
                      <Text className="font-extrabold">
                        {formatPKRFull(customerCreditSummary.currentBalance + creditAmount)}
                      </Text>
                    </Text>
                  )}
                </View>
              )}
            </ScrollView>

            {/* Bottom Action */}
            <View className="px-5 py-4 border-t border-neutral-200 dark:border-neutral-800 bg-white dark:bg-neutral-900">
              <Pressable
                onPress={handleCheckout}
                disabled={checkoutMutation.isPending || (creditAmount > 0 && !selectedCustomer)}
                className="h-14 rounded-2xl flex-row items-center justify-center gap-2 active:opacity-80"
                style={{
                  backgroundColor:
                    checkoutMutation.isPending || (creditAmount > 0 && !selectedCustomer)
                      ? '#9ca3af'
                      : saleMode === 'FULL_CREDIT'
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
                  <Text className="text-white font-bold text-base">Processing...</Text>
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

          {/* ===== Customer Picker Overlay ===== */}
          {customerPickerOpen && (
            <View
              style={{
                position: 'absolute',
                top: 0, left: 0, right: 0, bottom: 0,
                backgroundColor: '#fafafa',
                zIndex: 9999,
                elevation: 9999,
              }}
            >
              <SafeAreaView className="flex-1 bg-neutral-50 dark:bg-neutral-950" edges={['top']}>
                <View className="flex-row items-center justify-between px-5 py-4 border-b border-neutral-200 dark:border-neutral-800 bg-white dark:bg-neutral-900">
                  <View>
                    <Text className="text-xl font-bold text-neutral-900 dark:text-white">
                      Select Customer
                    </Text>
                    <Text className="text-xs text-neutral-500 mt-0.5">
                      {filteredCustomers.length} of {customerItems.length}
                    </Text>
                  </View>
                  <Pressable
                    onPress={() => {
                      setCustomerPickerOpen(false);
                      setCustomerSearch('');
                    }}
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
                  </View>
                </View>

                <ScrollView contentContainerStyle={{ padding: 20, paddingTop: 0 }}>
                  <Pressable
                    onPress={() => {
                      setSelectedCustomer(null);
                      setCustomerPickerOpen(false);
                      setCustomerSearch('');
                    }}
                    className="flex-row items-center gap-3 p-4 rounded-2xl bg-white dark:bg-neutral-900 border border-neutral-200 dark:border-neutral-800 mb-2 active:opacity-70"
                  >
                    <View className="h-12 w-12 rounded-2xl bg-neutral-100 dark:bg-neutral-800 items-center justify-center">
                      <User size={20} color="#9ca3af" />
                    </View>
                    <View className="flex-1">
                      <Text className="font-bold text-neutral-900 dark:text-white">
                        Walk-in Customer
                      </Text>
                      <Text className="text-xs text-neutral-500 mt-0.5">No tracking</Text>
                    </View>
                  </Pressable>

                  {filteredCustomers.length === 0 ? (
                    <View className="items-center py-12">
                      <User size={40} color="#d1d5db" />
                      <Text className="mt-3 text-neutral-500 font-semibold">
                        {customerSearch ? 'No matching' : 'No customers yet'}
                      </Text>
                    </View>
                  ) : (
                    filteredCustomers.map((c) => (
                      <Pressable
                        key={c.id}
                        onPress={() => {
                          setSelectedCustomer(c);
                          setCustomerPickerOpen(false);
                          setCustomerSearch('');
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
                              <View className="bg-amber-100 px-1.5 py-0.5 rounded-md">
                                <Text className="text-[9px] text-amber-700 font-extrabold">VIP</Text>
                              </View>
                            )}
                          </View>
                          {c.phone && (
                            <Text className="text-xs text-neutral-500 mt-0.5">{c.phone}</Text>
                          )}
                        </View>
                        {c.balance > 0 && (
                          <View className="bg-amber-100 px-2.5 py-1 rounded-lg">
                            <Text className="text-[10px] text-amber-700 font-extrabold">
                              {formatPKRFull(c.balance)}
                            </Text>
                            <Text className="text-[9px] text-amber-600 font-bold">Udhaar</Text>
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
