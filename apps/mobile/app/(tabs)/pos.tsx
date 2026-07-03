import { useEffect, useMemo, useRef, useState, useCallback } from 'react';
import {
  View, Text, ScrollView, Pressable, TextInput, Modal, Image,
  KeyboardAvoidingView, Platform, Alert, FlatList,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import * as Haptics from 'expo-haptics';
import AsyncStorage from '@react-native-async-storage/async-storage';
import {
  Search, ScanLine, Plus, Minus, ShoppingCart, CreditCard, Package, X,
  User, CheckCircle2, Banknote, Smartphone, Building2, Sparkles, Wallet,
  Receipt, BookOpen, HandCoins, Phone, Zap, Ruler, Edit3, Pause,
  PlayCircle, Layers, Tag, UserPlus, Eye, EyeOff, ChevronDown, Scissors,
  Wrench, StickyNote, MessageSquare, EyeOff as EyeOffIcon, Lock, Store,
  AlertTriangle, TrendingUp, Star, Crown, ArrowDownCircle, ArrowUpCircle,
  Filter, Grid3x3,
} from 'lucide-react-native';
import { BarcodeScannerModal } from '@/components/scanner/BarcodeScannerModal';
import { LengthWidthCalculator } from '@/components/pos/LengthWidthCalculator';
import { VariantPicker } from '@/components/pos/VariantPicker';
import { CarpetRollPicker } from '@/components/pos/CarpetRollPicker';
import { CarpetCutPiecePicker } from '@/components/pos/CarpetCutPiecePicker';
import { ServiceChargesSheet } from '@/components/pos/ServiceChargesSheet';
import { NotesEditor } from '@/components/pos/NotesEditor';
import { useBusinessFeatures } from '@/hooks/useBusinessFeatures';
import { useCarpetSummary } from '@/hooks/useCarpetSummary';
import { ImeiPickerModal } from '@/components/industries/ImeiPickerModal';
import { BatchPickerModal } from '@/components/industries/BatchPickerModal';
import type { ProductImei } from '@/api/imei.api';
import type { ProductBatch } from '@/api/batches.api';
import { productsApi, type Product } from '@/api/products.api';
import { productVariantsApi, type ProductVariant } from '@/api/product-variants.api';
import { customersApi, type Customer } from '@/api/customers.api';
import { categoriesApi } from '@/api/categories.api';
import { salesApi, type PaymentMethod, type ServiceChargeItem } from '@/api/sales.api';
import { useAuthStore } from '@/store/auth.store';
import { formatPKRFull, formatQty } from '@/lib/format';
import Toast from 'react-native-toast-message';

type CartItem = {
  cartLineId: string;
  productId: string;
  variantId?: string;
  imeiId?: string;
  imeiNumber?: string;
  batchId?: string;
  batchNumber?: string;
  rollId?: string;
  rollNumber?: string;
  cutPieceId?: string;
  cutPieceCode?: string;
  cutWidthFt?: number;
  cutLengthFt?: number;
  cutLengthInch?: number;
  cutSqft?: number;
  name: string;
  variantName?: string;
  variantImage?: string;
  variantColorHex?: string;
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
  internalNote?: string;
};

type SaleMode = 'FULL_PAYMENT' | 'PARTIAL_CREDIT' | 'FULL_CREDIT';

type HeldCart = {
  id: string;
  items: CartItem[];
  customerId: string;
  customerName: string;
  serviceCharges: ServiceChargeItem[];
  total: number;
  heldAt: number;
};

const paymentMethods: Array<{ key: PaymentMethod; label: string; icon: any; color: string }> = [
  { key: 'CASH', label: 'Cash', icon: Banknote, color: '#16a34a' },
  { key: 'CARD', label: 'Card', icon: CreditCard, color: '#2563eb' },
  { key: 'JAZZCASH', label: 'JazzCash', icon: Smartphone, color: '#f97316' },
  { key: 'EASYPAISA', label: 'EasyPaisa', icon: Zap, color: '#22c55e' },
  { key: 'BANK_TRANSFER', label: 'Bank', icon: Building2, color: '#8b5cf6' },
];

const HOLD_KEY = 'nafaa.pos.held-carts';
const LW_UNITS = new Set(['sqft', 'sqm', 'meter', 'ft', 'yard', 'gaj']);
const CARPET_UNITS = new Set(['sqft', 'sqm', 'sqyd']);
const MOBILE_KEYWORDS = ['mobile', 'phone', 'smartphone', 'iphone', 'samsung', 'oppo', 'vivo', 'realme', 'xiaomi', 'tecno', 'infinix'];
const PAGE_SIZE = 24;

const EMPTY_LIST = { items: [], meta: { page: 1, limit: 0, total: 0, totalPages: 0 } };
const newCartLineId = () => `${Date.now()}-${Math.random().toString(36).slice(2, 8)}`;

const formatRelative = (date?: string | number) => {
  if (!date) return 'Never';
  const d = typeof date === 'number' ? new Date(date) : new Date(date);
  const diff = Math.floor((Date.now() - d.getTime()) / 1000);
  if (diff < 60) return 'Abhi';
  if (diff < 3600) return `${Math.floor(diff / 60)}m ago`;
  if (diff < 86400) return `${Math.floor(diff / 3600)}h ago`;
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
  const queryClient = useQueryClient();
  const { features: businessFeatures, businessType } = useBusinessFeatures();
  const tenant = useAuthStore((s) => s.tenant);

  const isCarpetBusiness = useMemo(() => {
    const t = (businessType ?? '').toUpperCase();
    return t === 'CARPET' || t === 'FLOORING' || businessFeatures?.lengthWidthCalc === true;
  }, [businessType, businessFeatures]);

  const isMobileBusiness = useMemo(() => {
    const t = (businessType ?? '').toUpperCase();
    return t === 'MOBILE' || t === 'PHONE' || t === 'ELECTRONICS' || businessFeatures?.imei === true;
  }, [businessType, businessFeatures]);

  // ─── STATE ─────────────────────────────
  const [search, setSearch] = useState('');
  const [selectedCategoryId, setSelectedCategoryId] = useState('');
  const [cart, setCart] = useState<CartItem[]>([]);
  const [serviceCharges, setServiceCharges] = useState<ServiceChargeItem[]>([]);
  const [hidePrices, setHidePrices] = useState(false);
  const [scannerOpen, setScannerOpen] = useState(false);
  const [checkoutOpen, setCheckoutOpen] = useState(false);
  const [customerPickerOpen, setCustomerPickerOpen] = useState(false);
  const [customerSearch, setCustomerSearch] = useState('');
  const [lwOpen, setLwOpen] = useState<CartItem | null>(null);
  const [variantPicker, setVariantPicker] = useState<{ product: Product; variants: ProductVariant[] } | null>(null);
  const [imeiPickerData, setImeiPickerData] = useState<{ product: Product; variant?: ProductVariant } | null>(null);
  const [batchPickerData, setBatchPickerData] = useState<{ product: Product; variant?: ProductVariant; quantity: number } | null>(null);
  const [rollPicker, setRollPicker] = useState<{ product: Product; variant?: ProductVariant } | null>(null);
  const [cutPiecePicker, setCutPiecePicker] = useState<{ product?: Product; variant?: ProductVariant } | null>(null);
  const [servicesSheetOpen, setServicesSheetOpen] = useState(false);
  const [notesEditorFor, setNotesEditorFor] = useState<string | null>(null);
  const [editingLine, setEditingLine] = useState<string | null>(null);
  const [showHeldCarts, setShowHeldCarts] = useState(false);
  const [showCustomerAdd, setShowCustomerAdd] = useState(false);
  const [newCustomer, setNewCustomer] = useState({ name: '', phone: '' });
  const [selectedCustomer, setSelectedCustomer] = useState<Customer | null>(null);
  const [paymentMethod, setPaymentMethod] = useState<PaymentMethod>('CASH');
  const [paidAmountStr, setPaidAmountStr] = useState('');
  const [saleMode, setSaleMode] = useState<SaleMode>('FULL_PAYMENT');
  const [globalDiscount, setGlobalDiscount] = useState('');
  const [heldCarts, setHeldCarts] = useState<HeldCart[]>([]);
  const [cartExpanded, setCartExpanded] = useState(false);

  // ─── QUERIES ───────────────────────────
  const { data: productsData = EMPTY_LIST } = useQuery({
    queryKey: ['pos-products', search],
    queryFn: async () => {
      try {
        return (await productsApi.list({ search: search || undefined, limit: 200 })) ?? EMPTY_LIST;
      } catch { return EMPTY_LIST; }
    },
  });

  const { data: customersData = EMPTY_LIST } = useQuery({
    queryKey: ['pos-customers'],
    queryFn: async () => {
      try {
        return (await customersApi.list({ limit: 500 })) ?? EMPTY_LIST;
      } catch { return EMPTY_LIST; }
    },
  });

  const { data: categories = [] } = useQuery({
    queryKey: ['categories-pos'],
    queryFn: categoriesApi.list,
  });

  const { data: customerDetail } = useQuery({
    queryKey: ['customer-detail', selectedCustomer?.id],
    queryFn: async () => {
      if (!selectedCustomer) return null;
      try { return await customersApi.get(selectedCustomer.id); }
      catch { return null; }
    },
    enabled: !!selectedCustomer,
  });

  const allProducts = productsData?.items ?? [];
  const customerItems = customersData?.items ?? [];

  const filteredProducts = useMemo(() => {
    if (!selectedCategoryId) return allProducts;
    return allProducts.filter((p) => p.categoryId === selectedCategoryId);
  }, [allProducts, selectedCategoryId]);

  const productIds = useMemo(() => filteredProducts.map((p) => p.id), [filteredProducts]);
  const { data: carpetSummary = [] } = useCarpetSummary(productIds, isCarpetBusiness && productIds.length > 0);
  const carpetSummaryMap = useMemo(() => {
    const map = new Map<string, any>();
    for (const s of carpetSummary) map.set(s.productId, s);
    return map;
  }, [carpetSummary]);

  const categoryCounts = useMemo(() => {
    const counts: Record<string, number> = {};
    allProducts.forEach((p) => {
      if (p.categoryId) counts[p.categoryId] = (counts[p.categoryId] || 0) + 1;
    });
    return counts;
  }, [allProducts]);

  const isCarpetProduct = (p: Product) => isCarpetBusiness && CARPET_UNITS.has(p.unit);
  const productNeedsImei = (p: Product) => {
    if (!businessFeatures.imei) return false;
    const name = p.name.toLowerCase();
    const category = (p.category?.name || '').toLowerCase();
    return MOBILE_KEYWORDS.some((kw) => name.includes(kw) || category.includes(kw));
  };
  const productNeedsBatch = (p: Product) => businessFeatures.batches && p.expiryTracked === true;

  useEffect(() => { loadHeldCarts().then(setHeldCarts); }, []);

  // ─── TOTALS ────────────────────────────
  const subtotal = useMemo(
    () => cart.reduce((sum, item) => {
      const price = item.priceOverride ?? (item.useWholesale ? (item.wholesalePrice ?? item.basePrice) : item.basePrice);
      return sum + price * item.quantity;
    }, 0),
    [cart],
  );
  const totalLineDiscount = useMemo(() => cart.reduce((s, i) => s + (i.lineDiscount || 0), 0), [cart]);
  const gDiscount = Number(globalDiscount) || 0;
  const totalDiscount = totalLineDiscount + gDiscount;
  const svcTotal = useMemo(() => serviceCharges.reduce((s, c) => s + Number(c.amount || 0), 0), [serviceCharges]);
  const total = Math.max(subtotal - totalDiscount + svcTotal, 0);
  const totalItems = useMemo(() => cart.reduce((s, i) => s + i.quantity, 0), [cart]);

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
    const sales = (customerDetail as any).sales || [];
    const today = new Date().toDateString();
    const todaySales = sales.filter((s: any) => new Date(s.soldAt || s.createdAt).toDateString() === today);
    return {
      currentBalance: customerDetail.balance || 0,
      todaySalesCount: todaySales.length,
      todayCredit: todaySales.reduce((s: number, x: any) => s + (x.creditAmount || 0), 0),
      todayPaid: todaySales.reduce((s: number, x: any) => s + (x.paidAmount || 0), 0),
    };
  }, [customerDetail]);

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
    const amts = new Set([Math.floor(total / 2), 500, 1000, 2000, 5000].filter((n) => n > 0 && n < total));
    return Array.from(amts).slice(0, 4);
  }, [total]);

  const outOfStockCount = useMemo(
    () => allProducts.filter((p) => {
      if (isCarpetProduct(p)) {
        const s = carpetSummaryMap.get(p.id);
        return !s || s.totalSqft <= 0;
      }
      return p.stock <= 0;
    }).length,
    [allProducts, carpetSummaryMap],
  );

  // ─── MUTATIONS ─────────────────────────
  const checkoutMutation = useMutation({
    mutationFn: () =>
      salesApi.create({
        customerId: selectedCustomer?.id,
        paymentMethod,
        paidAmount: effectivePaid,
        discount: gDiscount,
        allowCredit: isCreditSale,
        serviceCharges: serviceCharges.length > 0 ? serviceCharges : undefined,
        items: cart.map((c) => ({
          productId: c.productId,
          variantId: c.variantId,
          imeiId: c.imeiId,
          rollId: c.rollId,
          cutPieceId: c.cutPieceId,
          cutWidthFt: c.cutWidthFt,
          cutLengthFt: c.cutLengthFt,
          cutLengthInch: c.cutLengthInch,
          cutSqft: c.cutSqft,
          quantity: c.quantity,
          priceOverride: c.priceOverride,
          lineDiscount: c.lineDiscount || undefined,
          useWholesale: c.useWholesale || undefined,
          note: c.note,
          internalNote: c.internalNote,
        })),
      }),
    onSuccess: (sale) => {
      Haptics.notificationAsync(Haptics.NotificationFeedbackType.Success);
      Toast.show({
        type: 'success',
        text1: isCreditSale ? '✅ Sale + Khata!' : '✅ Sale Complete!',
        text2: `${sale.saleNumber} • ${formatPKRFull(total)}`,
      });
      resetCart();
      setCheckoutOpen(false);
      queryClient.invalidateQueries({ queryKey: ['dashboard-overview'] });
      queryClient.invalidateQueries({ queryKey: ['products'] });
      queryClient.invalidateQueries({ queryKey: ['pos-products'] });
      queryClient.invalidateQueries({ queryKey: ['sales'] });
      queryClient.invalidateQueries({ queryKey: ['customers'] });
      queryClient.invalidateQueries({ queryKey: ['pos-customers'] });
    },
    onError: (e: any) => {
      Haptics.notificationAsync(Haptics.NotificationFeedbackType.Error);
      Toast.show({ type: 'error', text1: 'Failed', text2: e?.response?.data?.message || 'Try again' });
    },
  });

  const addCustomerMutation = useMutation({
    mutationFn: () => customersApi.create({
      name: newCustomer.name.trim(),
      phone: newCustomer.phone.trim() || undefined,
    }),
    onSuccess: (c) => {
      Toast.show({ type: 'success', text1: `${c.name} added` });
      setSelectedCustomer(c);
      setShowCustomerAdd(false);
      setNewCustomer({ name: '', phone: '' });
      queryClient.invalidateQueries({ queryKey: ['pos-customers'] });
    },
    onError: (e: any) => Toast.show({ type: 'error', text1: e?.response?.data?.message || 'Failed' }),
  });

  const resetCart = () => {
    setCart([]);
    setServiceCharges([]);
    setSelectedCustomer(null);
    setPaymentMethod('CASH');
    setPaidAmountStr('');
    setSaleMode('FULL_PAYMENT');
    setGlobalDiscount('');
    setEditingLine(null);
    setCartExpanded(false);
  };

  // ─── Add product routing ───────────────
  const addProductToCart = async (product: Product) => {
    if (isCarpetProduct(product)) {
      const summary = carpetSummaryMap.get(product.id);
      if (!summary || summary.totalSqft <= 0) {
        Toast.show({ type: 'error', text1: `${product.name}: no active roll` });
        return;
      }
      if (product.hasVariants) {
        try {
          const variants = await productVariantsApi.list(product.id);
          const active = variants.filter((v) => v.isActive);
          if (active.length === 0) { Toast.show({ type: 'error', text1: 'No variants' }); return; }
          setVariantPicker({ product, variants });
        } catch { Toast.show({ type: 'error', text1: 'Failed to load' }); }
        return;
      }
      setRollPicker({ product });
      return;
    }

    if (product.stock <= 0) {
      Haptics.notificationAsync(Haptics.NotificationFeedbackType.Warning);
      Toast.show({ type: 'error', text1: `${product.name} out of stock` });
      return;
    }

    if (product.hasVariants) {
      try {
        const variants = await productVariantsApi.list(product.id);
        const active = variants.filter((v) => v.isActive);
        if (active.length === 0) { Toast.show({ type: 'error', text1: 'No variants' }); return; }
        setVariantPicker({ product, variants });
      } catch { Toast.show({ type: 'error', text1: 'Failed to load' }); }
      return;
    }
    if (productNeedsImei(product)) { setImeiPickerData({ product }); return; }
    if (productNeedsBatch(product)) { setBatchPickerData({ product, quantity: 1 }); return; }
    addStandardItem(product, null);
  };

  const handleVariantSelect = (variant: ProductVariant) => {
    if (!variantPicker) return;
    const { product } = variantPicker;
    if (isCarpetProduct(product)) { setRollPicker({ product, variant }); setVariantPicker(null); return; }
    if (productNeedsImei(product)) { setImeiPickerData({ product, variant }); setVariantPicker(null); return; }
    if (productNeedsBatch(product)) { setBatchPickerData({ product, variant, quantity: 1 }); setVariantPicker(null); return; }
    if (variant.stock <= 0) { Toast.show({ type: 'error', text1: 'Variant out of stock' }); return; }
    addStandardItem(product, variant);
    setVariantPicker(null);
  };

  const addStandardItem = (product: Product, variant: ProductVariant | null) => {
    Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
    const variantId = variant?.id;
    const existing = cart.findIndex(
      (item) =>
        item.productId === product.id &&
        item.variantId === variantId &&
        !item.rollId && !item.cutPieceId && !item.imeiId &&
        item.priceOverride === undefined,
    );
    if (existing >= 0) {
      const stock = variant ? variant.stock : product.stock;
      if (cart[existing].quantity >= stock) { Toast.show({ type: 'error', text1: 'Stock limit' }); return; }
      setCart((prev) => prev.map((it, i) => i === existing ? { ...it, quantity: it.quantity + 1 } : it));
      return;
    }
    setCart((prev) => [...prev, {
      cartLineId: newCartLineId(),
      productId: product.id,
      variantId,
      name: product.name,
      variantName: variant?.name,
      variantImage: variant?.imageUrl ?? undefined,
      variantColorHex: variant?.colorHex ?? undefined,
      productImage: product.images?.[0]?.url,
      basePrice: variant?.price ?? product.price,
      wholesalePrice: variant?.wholesalePrice ?? product.wholesalePrice,
      stock: variant?.stock ?? product.stock,
      quantity: 1,
      unit: variant?.unit ?? product.unit,
      category: product.category,
      useWholesale: false,
      lineDiscount: 0,
    }]);
    Toast.show({ type: 'success', text1: 'Added', text2: `${product.name}${variant ? ` (${variant.name})` : ''}` });
  };

  const handleRollConfirm = (data: any) => {
    if (!rollPicker) return;
    const { product, variant } = rollPicker;
    const { roll } = data;
    const lenInchPart = (data.lengthInch ?? 0) > 0 ? ` ${data.lengthInch}in` : '';
    let note = `Cut from ${roll.rollNumber}: ${data.customerWidthFt}ft × ${data.lengthFt}ft${lenInchPart} = ${data.cutSqft.toFixed(2)} sqft`;
    setCart((prev) => [...prev, {
      cartLineId: newCartLineId(),
      productId: product.id,
      variantId: variant?.id,
      rollId: roll.id,
      rollNumber: roll.rollNumber,
      name: product.name,
      variantName: variant?.name,
      variantColorHex: variant?.colorHex ?? undefined,
      cutWidthFt: data.customerWidthFt,
      cutLengthFt: data.lengthFt,
      cutLengthInch: data.lengthInch ?? 0,
      cutSqft: data.cutSqft,
      basePrice: data.pricePerSqft,
      stock: data.cutSqft,
      quantity: data.cutSqft,
      unit: product.unit,
      category: product.category,
      useWholesale: false,
      lineDiscount: 0,
      note,
    }]);
    Toast.show({ type: 'success', text1: `${roll.rollNumber} → ${data.cutSqft.toFixed(2)} sqft` });
    setRollPicker(null);
  };

  const handleCutPieceSelect = (piece: any) => {
    const productObj = cutPiecePicker?.product ?? { id: piece.productId, name: piece.product?.name || 'Cut Piece', unit: 'sqft', images: [], category: null } as any;
    setCart((prev) => [...prev, {
      cartLineId: newCartLineId(),
      productId: piece.productId,
      variantId: piece.variantId,
      cutPieceId: piece.id,
      cutPieceCode: piece.pieceCode,
      name: productObj.name,
      variantName: piece.variant?.name,
      variantColorHex: piece.variant?.colorHex ?? undefined,
      basePrice: piece.salePrice / Math.max(piece.totalSqft, 0.01),
      stock: piece.totalSqft,
      quantity: piece.totalSqft,
      unit: 'sqft',
      category: productObj.category,
      useWholesale: false,
      lineDiscount: 0,
      note: `Cut piece ${piece.pieceCode} • ${piece.widthFt}ft × ${piece.lengthFt}ft`,
    }]);
    Toast.show({ type: 'success', text1: `Cut piece ${piece.pieceCode}` });
    setCutPiecePicker(null);
  };

  const handleImeiSelect = (imei: ProductImei) => {
    if (!imeiPickerData) return;
    const { product, variant } = imeiPickerData;
    setCart((prev) => [...prev, {
      cartLineId: newCartLineId(),
      productId: product.id,
      variantId: variant?.id,
      imeiId: imei.id,
      imeiNumber: imei.imei1,
      name: product.name,
      variantName: variant?.name,
      variantColorHex: variant?.colorHex ?? undefined,
      basePrice: variant?.price ?? product.price,
      wholesalePrice: variant?.wholesalePrice ?? product.wholesalePrice,
      stock: 1,
      quantity: 1,
      unit: variant?.unit ?? product.unit,
      category: product.category,
      useWholesale: false,
      lineDiscount: 0,
      note: `IMEI: ${imei.imei1}`,
    }]);
    setImeiPickerData(null);
    Toast.show({ type: 'success', text1: `IMEI added` });
  };

  const handleBatchSelect = (batch: ProductBatch) => {
    if (!batchPickerData) return;
    const { product, variant, quantity } = batchPickerData;
    setCart((prev) => [...prev, {
      cartLineId: newCartLineId(),
      productId: product.id,
      variantId: variant?.id,
      batchId: batch.id,
      batchNumber: batch.batchNumber,
      name: product.name,
      variantName: variant?.name,
      variantColorHex: variant?.colorHex ?? undefined,
      basePrice: variant?.price ?? product.price,
      wholesalePrice: variant?.wholesalePrice ?? product.wholesalePrice,
      stock: batch.quantity,
      quantity,
      unit: variant?.unit ?? product.unit,
      category: product.category,
      useWholesale: false,
      lineDiscount: 0,
      note: `Batch: ${batch.batchNumber}`,
    }]);
    setBatchPickerData(null);
    Toast.show({ type: 'success', text1: `Batch ${batch.batchNumber}` });
  };

  const updateCartLine = (id: string, patch: Partial<CartItem>) => {
    setCart((prev) => prev.map((it) => it.cartLineId === id ? { ...it, ...patch } : it));
  };
  const removeCartLine = (id: string) => {
    Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
    setCart((prev) => prev.filter((it) => it.cartLineId !== id));
  };
  const setLineQuantity = (id: string, qty: number) => {
    const item = cart.find((i) => i.cartLineId === id);
    if (!item) return;
    if (item.rollId || item.cutPieceId || item.imeiId) return;
    if (qty < 0.01) { removeCartLine(id); return; }
    if (qty > item.stock) { Toast.show({ type: 'error', text1: `Stock: ${item.stock}` }); return; }
    Haptics.selectionAsync();
    updateCartLine(id, { quantity: Number(qty.toFixed(2)) });
  };

  const handleBarcodeScanned = async (code: string) => {
    setScannerOpen(false);
    if (!code.trim()) return;
    try {
      const product = await productsApi.byBarcode(code.trim());
      if ((product as any).matchedVariant) {
        setVariantPicker({ product, variants: [(product as any).matchedVariant] });
      } else {
        await addProductToCart(product);
      }
    } catch {
      Haptics.notificationAsync(Haptics.NotificationFeedbackType.Error);
      Toast.show({ type: 'error', text1: 'Not found', text2: code });
    }
  };

  const openCheckout = () => {
    if (cart.length === 0) { Toast.show({ type: 'error', text1: 'Cart empty' }); return; }
    Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Medium);
    setPaidAmountStr(String(total.toFixed(2)));
    setSaleMode('FULL_PAYMENT');
    setCheckoutOpen(true);
  };

  const handleHold = async () => {
    if (cart.length === 0) { Toast.show({ type: 'error', text1: 'Cart empty' }); return; }
    const held: HeldCart = {
      id: newCartLineId(),
      items: cart,
      customerId: selectedCustomer?.id || '',
      customerName: selectedCustomer?.name || 'Walk-in',
      serviceCharges,
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
        { text: 'Replace', onPress: async () => {
          setCart(held.items);
          setServiceCharges(held.serviceCharges || []);
          if (held.customerId) {
            const c = customerItems.find((x) => x.id === held.customerId);
            if (c) setSelectedCustomer(c);
          }
          const remaining = heldCarts.filter((c) => c.id !== held.id);
          setHeldCarts(remaining);
          await saveHeldCarts(remaining);
          setShowHeldCarts(false);
        }},
      ]);
      return;
    }
    setCart(held.items);
    setServiceCharges(held.serviceCharges || []);
    if (held.customerId) {
      const c = customerItems.find((x) => x.id === held.customerId);
      if (c) setSelectedCustomer(c);
    }
    const remaining = heldCarts.filter((c) => c.id !== held.id);
    setHeldCarts(remaining);
    await saveHeldCarts(remaining);
    setShowHeldCarts(false);
    Toast.show({ type: 'success', text1: 'Resumed' });
  };

  const handleDeleteHeld = async (id: string) => {
    const remaining = heldCarts.filter((c) => c.id !== id);
    setHeldCarts(remaining);
    await saveHeldCarts(remaining);
  };

  const handleCheckout = () => {
    if (isCreditSale && !selectedCustomer) { Toast.show({ type: 'error', text1: 'Customer required for credit' }); return; }
    if (saleMode === 'PARTIAL_CREDIT' && effectivePaid >= total) { Toast.show({ type: 'error', text1: 'Paid < total for partial' }); return; }
    if (saleMode === 'PARTIAL_CREDIT' && effectivePaid <= 0) { Toast.show({ type: 'error', text1: 'Paid amount required' }); return; }
    checkoutMutation.mutate();
  };

  const activeNoteItem = cart.find((c) => c.cartLineId === notesEditorFor);

  const carpetProductsAvailable = useMemo(() => allProducts.filter(isCarpetProduct), [allProducts, isCarpetBusiness]);

  return (
    <SafeAreaView className="flex-1 bg-neutral-50" edges={['top']}>
      {/* ═════ HERO HEADER (Web parity) ═════ */}
      <View className="mx-4 mt-3 rounded-3xl overflow-hidden" style={{ backgroundColor: '#065f46', shadowColor: '#16a34a', shadowOpacity: 0.3, shadowRadius: 12, elevation: 8 }}>
        <View className="p-4">
          <View className="flex-row items-center gap-3 mb-3">
            <View className="h-11 w-11 rounded-2xl bg-white/15 items-center justify-center" style={{ borderWidth: 2, borderColor: 'rgba(255,255,255,0.2)' }}>
              <ShoppingCart size={20} color="#ffffff" />
            </View>
            <View className="flex-1 min-w-0">
              <View className="flex-row items-center gap-2 flex-wrap">
                <Text className="text-lg font-extrabold text-white">POS Counter</Text>
                {isCarpetBusiness && (
                  <View className="px-1.5 py-0.5 rounded" style={{ backgroundColor: 'rgba(16,185,129,0.3)', borderWidth: 1, borderColor: 'rgba(110,231,183,0.4)' }}>
                    <Text className="text-[9px] font-extrabold text-white uppercase">🧶 Carpet</Text>
                  </View>
                )}
                {isMobileBusiness && (
                  <View className="px-1.5 py-0.5 rounded" style={{ backgroundColor: 'rgba(59,130,246,0.3)', borderWidth: 1, borderColor: 'rgba(147,197,253,0.4)' }}>
                    <Text className="text-[9px] font-extrabold text-white uppercase">📱 Mobile</Text>
                  </View>
                )}
              </View>
              <View className="flex-row items-center gap-1 mt-1">
                <Sparkles size={9} color="#fde68a" />
                <Text className="text-[11px] text-white/80 font-semibold" numberOfLines={1}>
                  {tenant?.name || 'My Shop'} • {filteredProducts.length} products
                </Text>
              </View>
            </View>
            <Pressable
              onPress={() => setHidePrices((v) => !v)}
              className="h-10 w-10 rounded-xl bg-white/15 items-center justify-center"
              style={{ borderWidth: 1, borderColor: 'rgba(255,255,255,0.2)' }}
            >
              {hidePrices ? <EyeOff size={16} color="#ffffff" /> : <Eye size={16} color="#ffffff" />}
            </Pressable>
          </View>

          {/* Quick stats strip */}
          <View className="flex-row items-center gap-1.5 flex-wrap">
            <View className="flex-row items-center gap-1 px-2 py-1 rounded-lg" style={{ backgroundColor: 'rgba(255,255,255,0.1)' }}>
              <Store size={10} color="#6ee7b7" />
              <Text className="text-[9px] font-extrabold text-white uppercase tracking-wider">Ready</Text>
            </View>
            {outOfStockCount > 0 && (
              <View className="flex-row items-center gap-1 px-2 py-1 rounded-lg" style={{ backgroundColor: 'rgba(244,63,94,0.3)', borderWidth: 1, borderColor: 'rgba(252,165,165,0.4)' }}>
                <AlertTriangle size={10} color="#fecaca" />
                <Text className="text-[9px] font-extrabold text-white">{outOfStockCount} out</Text>
              </View>
            )}
            <View className="flex-row items-center gap-1 px-2 py-1 rounded-lg" style={{ backgroundColor: 'rgba(255,255,255,0.1)' }}>
              <ScanLine size={10} color="#93c5fd" />
              <Text className="text-[9px] font-extrabold text-white uppercase tracking-wider">Barcode</Text>
            </View>
          </View>
        </View>
      </View>

      {/* ═════ TOP BAR ═════ */}
      <View className="px-4 pt-3 pb-2">
        <View className="flex-row gap-2 mb-2">
          <View className="flex-1 flex-row items-center gap-2 rounded-2xl border-2 border-neutral-200 bg-white px-3 h-11">
            <Search size={16} color="#9ca3af" />
            <TextInput
              placeholder="Search products, SKU..."
              placeholderTextColor="#9ca3af"
              value={search}
              onChangeText={setSearch}
              className="flex-1 text-sm font-semibold text-neutral-900"
            />
            {search.length > 0 && (
              <Pressable onPress={() => setSearch('')} hitSlop={8}>
                <X size={14} color="#9ca3af" />
              </Pressable>
            )}
          </View>
          <Pressable
            onPress={() => { Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light); setScannerOpen(true); }}
            className="h-11 w-11 rounded-2xl items-center justify-center"
            style={{ backgroundColor: '#064e3b', shadowColor: '#16a34a', shadowOpacity: 0.3, shadowRadius: 6, elevation: 4 }}
          >
            <ScanLine size={18} color="#ffffff" />
          </Pressable>
        </View>

        {/* Action buttons row */}
        <View className="flex-row gap-2 mb-2">
          {isCarpetBusiness && (
            <Pressable
              onPress={() => setCutPiecePicker({ product: carpetProductsAvailable[0] })}
              className="flex-row items-center gap-1.5 px-3 h-9 rounded-xl bg-violet-100"
            >
              <Scissors size={13} color="#8b5cf6" />
              <Text className="text-violet-700 font-extrabold text-xs">Cut Pieces</Text>
            </Pressable>
          )}
          {heldCarts.length > 0 && (
            <Pressable
              onPress={() => setShowHeldCarts(true)}
              className="flex-row items-center gap-1.5 px-3 h-9 rounded-xl bg-amber-100 relative"
            >
              <Pause size={13} color="#d97706" />
              <Text className="text-amber-800 font-extrabold text-xs">Held</Text>
              <View className="h-5 w-5 rounded-full items-center justify-center" style={{ backgroundColor: '#d97706' }}>
                <Text className="text-white text-[10px] font-extrabold">{heldCarts.length}</Text>
              </View>
            </Pressable>
          )}
        </View>

        {/* Categories horizontal filter */}
        {categories.length > 0 && (
          <ScrollView
            horizontal
            showsHorizontalScrollIndicator={false}
            contentContainerStyle={{ gap: 6, paddingRight: 12 }}
          >
            <Pressable
              onPress={() => { Haptics.selectionAsync(); setSelectedCategoryId(''); }}
              className="h-8 px-3 rounded-xl flex-row items-center gap-1.5"
              style={{
                backgroundColor: !selectedCategoryId ? '#065f46' : '#f1f5f9',
                borderWidth: 2,
                borderColor: !selectedCategoryId ? '#065f46' : '#e2e8f0',
              }}
            >
              <Sparkles size={10} color={!selectedCategoryId ? '#ffffff' : '#64748b'} />
              <Text
                className="text-[11px] font-extrabold"
                style={{ color: !selectedCategoryId ? '#ffffff' : '#334155' }}
              >
                All
              </Text>
              <View
                className="px-1 py-0 rounded"
                style={{ backgroundColor: !selectedCategoryId ? 'rgba(255,255,255,0.2)' : '#e2e8f0' }}
              >
                <Text
                  className="text-[9px] font-extrabold"
                  style={{ color: !selectedCategoryId ? '#ffffff' : '#64748b' }}
                >
                  {allProducts.length}
                </Text>
              </View>
            </Pressable>
            {categories.map((cat: any) => {
              const count = categoryCounts[cat.id] || 0;
              if (count === 0) return null;
              const active = selectedCategoryId === cat.id;
              return (
                <Pressable
                  key={cat.id}
                  onPress={() => { Haptics.selectionAsync(); setSelectedCategoryId(active ? '' : cat.id); }}
                  className="h-8 px-3 rounded-xl flex-row items-center gap-1.5"
                  style={{
                    backgroundColor: active ? cat.color : '#ffffff',
                    borderWidth: 2,
                    borderColor: active ? cat.color : '#e2e8f0',
                  }}
                >
                  <View
                    className="h-1.5 w-1.5 rounded-full"
                    style={{
                      backgroundColor: active ? '#ffffff' : cat.color,
                    }}
                  />
                  <Text
                    className="text-[11px] font-extrabold"
                    style={{ color: active ? '#ffffff' : '#475569' }}
                  >
                    {cat.name}
                  </Text>
                  <View
                    className="px-1 py-0 rounded"
                    style={{ backgroundColor: active ? 'rgba(255,255,255,0.2)' : '#f1f5f9' }}
                  >
                    <Text
                      className="text-[9px] font-extrabold"
                      style={{ color: active ? '#ffffff' : '#64748b' }}
                    >
                      {count}
                    </Text>
                  </View>
                </Pressable>
              );
            })}
          </ScrollView>
        )}
      </View>

      {/* ═════ PRODUCTS GRID ═════ */}
      <View className="flex-1">
        <FlatList
          data={filteredProducts}
          keyExtractor={(item) => item.id}
          numColumns={2}
          columnWrapperStyle={{ gap: 8, paddingHorizontal: 12 }}
          contentContainerStyle={{ paddingBottom: 120, paddingTop: 4, gap: 8 }}
          showsVerticalScrollIndicator={false}
          renderItem={({ item: p }) => {
            const isCarpet = isCarpetProduct(p);
            const carpetData = isCarpet ? carpetSummaryMap.get(p.id) : undefined;
            const carpetSqft = carpetData?.totalSqft ?? 0;
            const rollCount = carpetData?.rollCount ?? 0;
            const inCart = cart.find((c) => c.productId === p.id && !c.variantId && !c.rollId && !c.cutPieceId && !c.imeiId);
            const outOfStock = isCarpet ? carpetSqft <= 0 : p.stock <= 0;
            const lowStock = !isCarpet && p.stock > 0 && p.stock <= p.lowStockAlert;
            const needsImei = productNeedsImei(p);
            const primaryImage = p.images?.[0]?.url;

            return (
              <Pressable
                onPress={() => addProductToCart(p)}
                disabled={outOfStock}
                className="flex-1 rounded-2xl overflow-hidden active:opacity-70"
                style={{
                  backgroundColor: '#ffffff',
                  borderWidth: 2,
                  borderColor: outOfStock ? '#e2e8f0' : inCart ? '#16a34a' : '#e2e8f0',
                  opacity: outOfStock ? 0.5 : 1,
                  shadowColor: inCart ? '#16a34a' : '#000',
                  shadowOpacity: inCart ? 0.15 : 0.04,
                  shadowRadius: inCart ? 10 : 6,
                  elevation: inCart ? 4 : 1,
                }}
              >
                <View style={{ aspectRatio: 1 }} className="relative bg-slate-100">
                  {primaryImage ? (
                    <Image source={{ uri: primaryImage }} style={{ width: '100%', height: '100%' }} resizeMode="cover" />
                  ) : (
                    <View className="w-full h-full items-center justify-center" style={{ backgroundColor: '#f0fdf4' }}>
                      <Package size={32} color="#86efac" />
                    </View>
                  )}

                  {/* In-cart badge */}
                  {inCart && (
                    <View
                      className="absolute top-1.5 right-1.5 h-7 min-w-7 px-1.5 rounded-full items-center justify-center"
                      style={{ backgroundColor: '#16a34a', shadowColor: '#000', shadowOpacity: 0.2, shadowRadius: 4, elevation: 4 }}
                    >
                      <Text className="text-white font-extrabold text-xs">{formatQty(inCart.quantity)}</Text>
                    </View>
                  )}

                  {/* Stock badges */}
                  {!inCart && outOfStock && (
                    <View className="absolute top-1.5 right-1.5 px-1.5 py-0.5 rounded-md" style={{ backgroundColor: '#dc2626' }}>
                      <Text className="text-[9px] text-white font-extrabold">OUT</Text>
                    </View>
                  )}
                  {!inCart && !outOfStock && lowStock && (
                    <View className="absolute top-1.5 right-1.5 px-1.5 py-0.5 rounded-md" style={{ backgroundColor: '#f59e0b' }}>
                      <Text className="text-[9px] text-white font-extrabold">LOW</Text>
                    </View>
                  )}

                  {/* Type badges (bottom-left) */}
                  <View className="absolute bottom-1.5 left-1.5 flex-row gap-1">
                    {isCarpet && (
                      <View className="flex-row items-center gap-0.5 px-1.5 py-0.5 rounded-md" style={{ backgroundColor: '#16a34a' }}>
                        <Layers size={8} color="#ffffff" />
                        <Text className="text-[9px] text-white font-extrabold">ROLLS</Text>
                      </View>
                    )}
                    {needsImei && !isCarpet && (
                      <View className="flex-row items-center gap-0.5 px-1.5 py-0.5 rounded-md" style={{ backgroundColor: '#2563eb' }}>
                        <Smartphone size={8} color="#ffffff" />
                        <Text className="text-[9px] text-white font-extrabold">IMEI</Text>
                      </View>
                    )}
                    {p.hasVariants && !isCarpet && !needsImei && (
                      <View className="flex-row items-center gap-0.5 px-1.5 py-0.5 rounded-md" style={{ backgroundColor: '#8b5cf6' }}>
                        <Layers size={8} color="#ffffff" />
                        <Text className="text-[9px] text-white font-extrabold">VAR</Text>
                      </View>
                    )}
                    {p.isFeatured && (
                      <View className="flex-row items-center gap-0.5 px-1.5 py-0.5 rounded-md" style={{ backgroundColor: '#f59e0b' }}>
                        <Star size={8} color="#ffffff" fill="#ffffff" />
                      </View>
                    )}
                  </View>
                </View>

                <View className="p-2">
                  <Text className="text-xs font-extrabold text-slate-900 leading-tight" numberOfLines={2} style={{ minHeight: 32 }}>
                    {p.name}
                  </Text>
                  {p.category && (
                    <View className="mt-1 self-start px-1.5 py-0.5 rounded" style={{ backgroundColor: p.category.color }}>
                      <Text className="text-[8px] font-extrabold text-white uppercase">{p.category.name}</Text>
                    </View>
                  )}
                  <View className="mt-1.5 flex-row items-end justify-between gap-1">
                    <View className="flex-1 min-w-0">
                      <Text className="text-sm font-extrabold text-emerald-700" numberOfLines={1}>
                        {hidePrices ? '••••' : formatPKRFull(p.price)}
                      </Text>
                      {!isCarpet && p.wholesalePrice && p.wholesalePrice < p.price && !hidePrices && (
                        <Text className="text-[9px] font-bold text-violet-700 mt-0.5" numberOfLines={1}>
                          W: {formatPKRFull(p.wholesalePrice)}
                        </Text>
                      )}
                    </View>
                    <View className="items-end shrink-0">
                      {isCarpet ? (
                        <>
                          <Text className="text-[10px] font-extrabold text-emerald-700 tabular-nums">
                            {carpetSqft.toFixed(0)} {p.unit}
                          </Text>
                          <Text className="text-[8px] font-bold text-slate-500">
                            {rollCount} roll{rollCount !== 1 ? 's' : ''}
                          </Text>
                        </>
                      ) : (
                        <Text
                          className="text-[10px] font-extrabold tabular-nums"
                          style={{ color: outOfStock ? '#dc2626' : lowStock ? '#d97706' : '#334155' }}
                        >
                          {formatQty(p.stock)} {p.unit}
                        </Text>
                      )}
                    </View>
                  </View>
                </View>
              </Pressable>
            );
          }}
          ListEmptyComponent={
            <View className="items-center py-16 px-6">
              <View className="h-20 w-20 rounded-3xl items-center justify-center" style={{ backgroundColor: '#f1f5f9' }}>
                <Package size={36} color="#94a3b8" />
              </View>
              <Text className="mt-4 text-lg font-extrabold text-slate-900">
                {search || selectedCategoryId ? 'No products match' : 'No products yet'}
              </Text>
              <Text className="mt-1 text-xs text-slate-500 text-center font-semibold">
                {search ? `No match for "${search}"` : 'Add products first'}
              </Text>
              {(search || selectedCategoryId) && (
                <Pressable
                  onPress={() => { setSearch(''); setSelectedCategoryId(''); }}
                  className="mt-4 px-4 py-2 rounded-xl"
                  style={{ backgroundColor: '#16a34a' }}
                >
                  <Text className="text-white text-xs font-extrabold">Clear filters</Text>
                </Pressable>
              )}
            </View>
          }
        />
      </View>

      {/* ═════ CART BAR (Bottom sticky) ═════ */}
      {cart.length > 0 && (
        <View
          className="absolute left-0 right-0 bottom-0 bg-white"
          style={{
            borderTopWidth: 2,
            borderTopColor: '#e2e8f0',
            shadowColor: '#000',
            shadowOpacity: 0.1,
            shadowRadius: 16,
            shadowOffset: { width: 0, height: -6 },
            elevation: 20,
          }}
        >
          {/* Expandable cart list */}
          {cartExpanded && (
            <ScrollView className="max-h-80" showsVerticalScrollIndicator={false}>
              {cart.map((item) => {
                const isEditing = editingLine === item.cartLineId;
                const isLocked = !!(item.rollId || item.cutPieceId || item.imeiId);
                const unitPrice = item.priceOverride ?? (item.useWholesale ? (item.wholesalePrice ?? item.basePrice) : item.basePrice);
                const lineTotal = unitPrice * item.quantity - (item.lineDiscount || 0);
                const canUseLW = LW_UNITS.has(item.unit) && !isLocked;
                const hasUserNote = !!item.note?.trim();
                const hasInternalNote = !!item.internalNote?.trim();

                return (
                  <View
                    key={item.cartLineId}
                    className="border-b border-slate-100"
                    style={{
                      backgroundColor: item.rollId ? '#f0fdf480' : item.cutPieceId ? '#faf5ff80' : item.imeiId ? '#eff6ff80' : undefined,
                    }}
                  >
                    <View className="flex-row items-center px-4 py-2.5 gap-2">
                      <View className="h-10 w-10 rounded-lg overflow-hidden bg-slate-100 relative" style={{ borderWidth: 1, borderColor: '#e2e8f0' }}>
                        {item.variantImage || item.productImage ? (
                          <Image source={{ uri: item.variantImage || item.productImage }} style={{ width: '100%', height: '100%' }} resizeMode="cover" />
                        ) : item.variantColorHex ? (
                          <View style={{ width: '100%', height: '100%', backgroundColor: item.variantColorHex }} />
                        ) : (
                          <View className="w-full h-full items-center justify-center">
                            <Package size={14} color="#9ca3af" />
                          </View>
                        )}
                        {isLocked && (
                          <View className="absolute -top-1 -right-1 h-4 w-4 rounded-full items-center justify-center" style={{ backgroundColor: '#0f172a' }}>
                            <Lock size={7} color="#ffffff" />
                          </View>
                        )}
                      </View>

                      <View className="flex-1 min-w-0">
                        <Text className="text-sm font-bold text-slate-900" numberOfLines={1}>{item.name}</Text>
                        {item.variantName && (
                          <View className="flex-row items-center gap-1 mt-0.5">
                            {item.variantColorHex && (
                              <View style={{ height: 8, width: 8, borderRadius: 4, backgroundColor: item.variantColorHex, borderWidth: 1, borderColor: '#cbd5e1' }} />
                            )}
                            <Text className="text-[11px] font-bold text-violet-700">{item.variantName}</Text>
                          </View>
                        )}
                        <View className="flex-row flex-wrap gap-1 mt-0.5">
                          {item.rollNumber && (
                            <View className="flex-row items-center gap-0.5 px-1.5 py-0.5 rounded bg-emerald-100">
                              <Layers size={8} color="#16a34a" />
                              <Text className="text-[9px] font-extrabold text-emerald-700">{item.rollNumber}</Text>
                            </View>
                          )}
                          {item.cutPieceCode && (
                            <View className="flex-row items-center gap-0.5 px-1.5 py-0.5 rounded bg-violet-100">
                              <Scissors size={8} color="#8b5cf6" />
                              <Text className="text-[9px] font-extrabold text-violet-700">{item.cutPieceCode}</Text>
                            </View>
                          )}
                          {item.imeiNumber && (
                            <View className="flex-row items-center gap-0.5 px-1.5 py-0.5 rounded bg-blue-100">
                              <Smartphone size={8} color="#2563eb" />
                              <Text className="text-[9px] font-extrabold text-blue-700 font-mono">{item.imeiNumber}</Text>
                            </View>
                          )}
                        </View>
                        <Text className="text-[11px] text-slate-500 mt-0.5" numberOfLines={1}>
                          {hidePrices ? '••' : formatPKRFull(unitPrice)} × {formatQty(item.quantity)} {item.unit}
                        </Text>
                        {hasUserNote && (
                          <View className="flex-row items-start gap-1 mt-1 px-1.5 py-0.5 rounded self-start" style={{ backgroundColor: '#fef3c7', borderWidth: 1, borderColor: '#fcd34d' }}>
                            <MessageSquare size={9} color="#b45309" />
                            <Text className="text-[10px] font-bold text-amber-900 flex-1" numberOfLines={1}>{item.note}</Text>
                          </View>
                        )}
                        {hasInternalNote && (
                          <View className="flex-row items-start gap-1 mt-0.5 px-1.5 py-0.5 rounded self-start" style={{ backgroundColor: '#f1f5f9', borderWidth: 1, borderColor: '#cbd5e1' }}>
                            <EyeOffIcon size={9} color="#475569" />
                            <Text className="text-[10px] font-bold text-slate-700 italic flex-1" numberOfLines={1}>{item.internalNote}</Text>
                          </View>
                        )}
                      </View>

                      <View className="items-end">
                        <Text className="text-sm font-extrabold text-slate-900">
                          {hidePrices ? '••••' : formatPKRFull(lineTotal)}
                        </Text>
                        <View className="flex-row gap-1 mt-1">
                          <Pressable
                            onPress={() => setNotesEditorFor(item.cartLineId)}
                            className="h-7 w-7 rounded-lg items-center justify-center"
                            style={{ backgroundColor: hasUserNote || hasInternalNote ? '#f59e0b' : '#fef3c7' }}
                          >
                            <StickyNote size={12} color={hasUserNote || hasInternalNote ? '#ffffff' : '#b45309'} />
                          </Pressable>
                          <Pressable
                            onPress={() => setEditingLine(isEditing ? null : item.cartLineId)}
                            className="h-7 w-7 rounded-lg items-center justify-center"
                            style={{ backgroundColor: isEditing ? '#16a34a' : '#f1f5f9' }}
                          >
                            <Edit3 size={12} color={isEditing ? '#ffffff' : '#334155'} />
                          </Pressable>
                          <Pressable
                            onPress={() => removeCartLine(item.cartLineId)}
                            className="h-7 w-7 rounded-lg items-center justify-center"
                            style={{ backgroundColor: '#fef2f2' }}
                          >
                            <X size={12} color="#dc2626" />
                          </Pressable>
                        </View>
                      </View>
                    </View>

                    {!isLocked && (
                      <View className="flex-row items-center justify-between px-4 pb-2 gap-2">
                        <View className="flex-row items-center gap-1.5 rounded-xl p-1" style={{ backgroundColor: '#f8fafc' }}>
                          <Pressable
                            onPress={() => setLineQuantity(item.cartLineId, item.quantity - 1)}
                            className="h-7 w-7 rounded-lg bg-white items-center justify-center"
                            style={{ borderWidth: 1, borderColor: '#e2e8f0' }}
                          >
                            <Minus size={12} color="#334155" />
                          </Pressable>
                          <TextInput
                            value={String(item.quantity)}
                            onChangeText={(t) => {
                              const v = parseFloat(t);
                              if (!isNaN(v)) setLineQuantity(item.cartLineId, v);
                            }}
                            keyboardType="decimal-pad"
                            className="w-14 text-center font-extrabold text-slate-900"
                          />
                          <Pressable
                            onPress={() => setLineQuantity(item.cartLineId, item.quantity + 1)}
                            disabled={item.quantity >= item.stock}
                            className="h-7 w-7 rounded-lg items-center justify-center"
                            style={{ backgroundColor: '#16a34a' }}
                          >
                            <Plus size={12} color="#ffffff" />
                          </Pressable>
                        </View>
                        {canUseLW && (
                          <Pressable
                            onPress={() => setLwOpen(item)}
                            className="px-3 h-8 rounded-lg flex-row items-center gap-1.5"
                            style={{ backgroundColor: '#16a34a' }}
                          >
                            <Ruler size={12} color="#ffffff" />
                            <Text className="text-white text-[11px] font-extrabold">Calc</Text>
                          </Pressable>
                        )}
                      </View>
                    )}

                    {isEditing && (
                      <View className="px-4 pb-3 pt-3 gap-2" style={{ borderTopWidth: 1, borderTopColor: '#f1f5f9', backgroundColor: 'rgba(16,185,129,0.05)' }}>
                        {item.wholesalePrice && !isLocked && (
                          <Pressable
                            onPress={() => updateCartLine(item.cartLineId, { useWholesale: !item.useWholesale, priceOverride: undefined })}
                            className="flex-row items-center justify-between p-2.5 rounded-xl bg-white"
                            style={{ borderWidth: 1, borderColor: '#e2e8f0' }}
                          >
                            <Text className="text-xs font-bold text-slate-700">Use wholesale price</Text>
                            <View
                              style={{
                                height: 22, width: 38, borderRadius: 11, padding: 2, justifyContent: 'center',
                                backgroundColor: item.useWholesale ? '#f59e0b' : '#d1d5db',
                              }}
                            >
                              <View style={{ height: 18, width: 18, borderRadius: 9, backgroundColor: '#ffffff', transform: [{ translateX: item.useWholesale ? 16 : 0 }] }} />
                            </View>
                          </Pressable>
                        )}
                        <View className="flex-row gap-2">
                          <View className="flex-1">
                            <Text className="text-[10px] font-extrabold uppercase text-slate-500 mb-1">
                              {item.rollId || item.cutPieceId ? 'Rate / sqft' : 'Custom Price'}
                            </Text>
                            <TextInput
                              value={item.priceOverride !== undefined ? String(item.priceOverride) : ''}
                              onChangeText={(t) => updateCartLine(item.cartLineId, { priceOverride: t === '' ? undefined : parseFloat(t) })}
                              keyboardType="decimal-pad"
                              placeholder={String(item.basePrice)}
                              placeholderTextColor="#9ca3af"
                              className="h-10 rounded-xl bg-white px-3 text-sm font-bold text-slate-900"
                              style={{ borderWidth: 1, borderColor: '#e2e8f0' }}
                            />
                          </View>
                          <View className="flex-1">
                            <Text className="text-[10px] font-extrabold uppercase text-slate-500 mb-1">Discount (Rs)</Text>
                            <TextInput
                              value={item.lineDiscount > 0 ? String(item.lineDiscount) : ''}
                              onChangeText={(t) => updateCartLine(item.cartLineId, { lineDiscount: parseFloat(t) || 0 })}
                              keyboardType="decimal-pad"
                              placeholder="0"
                              placeholderTextColor="#9ca3af"
                              className="h-10 rounded-xl bg-white px-3 text-sm font-bold text-slate-900"
                              style={{ borderWidth: 1, borderColor: '#e2e8f0' }}
                            />
                          </View>
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
          )}

          {/* Service charges chip */}
          {isCarpetBusiness && cartExpanded && (
            <View className="px-4 py-2" style={{ borderTopWidth: 1, borderTopColor: '#f1f5f9' }}>
              <Pressable
                onPress={() => setServicesSheetOpen(true)}
                className="flex-row items-center gap-2 p-2.5 rounded-xl"
                style={{
                  backgroundColor: serviceCharges.length > 0 ? '#fef3c7' : '#ffffff',
                  borderWidth: 2,
                  borderColor: serviceCharges.length > 0 ? '#f59e0b' : '#e5e7eb',
                }}
              >
                <View className="h-9 w-9 rounded-xl items-center justify-center" style={{ backgroundColor: '#d97706' }}>
                  <Wrench size={16} color="#ffffff" />
                </View>
                <View className="flex-1">
                  <Text className="text-xs font-extrabold text-amber-900">
                    Service Charges {serviceCharges.length > 0 && `(${serviceCharges.length})`}
                  </Text>
                  <Text className="text-[10px] text-amber-700">
                    {svcTotal > 0 ? `+${formatPKRFull(svcTotal)}` : 'Glue, installation, delivery...'}
                  </Text>
                </View>
                <ChevronDown size={16} color="#b45309" />
              </Pressable>
            </View>
          )}

          {/* Cart summary bar */}
          <Pressable
            onPress={() => setCartExpanded((v) => !v)}
            className="flex-row items-center gap-2 px-4 py-2"
            style={{ borderTopWidth: cartExpanded ? 1 : 0, borderTopColor: '#f1f5f9' }}
          >
            <View className="flex-row items-center gap-1.5 rounded-full px-2.5 py-1" style={{ backgroundColor: '#dcfce7' }}>
              <ShoppingCart size={11} color="#16a34a" />
              <Text className="text-xs text-emerald-700 font-extrabold">{formatQty(totalItems)}</Text>
            </View>
            <Pressable onPress={handleHold} className="flex-row items-center gap-1">
              <Pause size={10} color="#d97706" />
              <Text className="text-xs text-amber-700 font-extrabold">Hold</Text>
            </Pressable>
            <Pressable
              onPress={() => Alert.alert('Clear cart?', 'Sure?', [
                { text: 'Cancel', style: 'cancel' },
                { text: 'Clear', style: 'destructive', onPress: resetCart },
              ])}
            >
              <Text className="text-xs text-rose-600 font-extrabold">Clear</Text>
            </Pressable>
            <View className="flex-1 items-end">
              <ChevronDown size={14} color="#94a3b8" style={{ transform: [{ rotate: cartExpanded ? '180deg' : '0deg' }] }} />
            </View>
          </Pressable>

          <View className="px-4 pb-3 pt-1 flex-row items-center justify-between gap-3">
            <View className="flex-1 min-w-0">
              <Text className="text-[10px] uppercase tracking-wider text-slate-500 font-extrabold">Total</Text>
              <Text className="text-2xl font-extrabold text-slate-900" numberOfLines={1}>
                {hidePrices ? '••••' : formatPKRFull(total)}
              </Text>
              {svcTotal > 0 && (
                <Text className="text-[10px] text-amber-700 font-bold">
                  Inc. {formatPKRFull(svcTotal)} services
                </Text>
              )}
            </View>
            <Pressable
              onPress={openCheckout}
              className="h-14 px-5 rounded-2xl flex-row items-center gap-2"
              style={{
                backgroundColor: '#065f46',
                shadowColor: '#16a34a',
                shadowOpacity: 0.4,
                shadowRadius: 12,
                elevation: 8,
              }}
            >
              <CreditCard size={18} color="#ffffff" />
              <Text className="text-white font-extrabold text-sm">Checkout</Text>
            </Pressable>
          </View>
        </View>
      )}

      {/* ═════ MODALS & PICKERS ═════ */}
      <BarcodeScannerModal visible={scannerOpen} onClose={() => setScannerOpen(false)} onScan={handleBarcodeScanned} />

      <LengthWidthCalculator
        visible={!!lwOpen}
        productName={lwOpen ? lwOpen.name + (lwOpen.variantName ? ` (${lwOpen.variantName})` : '') : ''}
        unit={lwOpen?.unit || 'sqft'}
        onApply={(qty, note) => {
          if (!lwOpen) return;
          if (qty > lwOpen.stock) { Toast.show({ type: 'error', text1: `Stock: ${lwOpen.stock}` }); return; }
          updateCartLine(lwOpen.cartLineId, { quantity: qty, note });
          setLwOpen(null);
          Toast.show({ type: 'success', text1: `Updated: ${qty.toFixed(2)} ${lwOpen.unit}` });
        }}
        onClose={() => setLwOpen(null)}
      />

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
        visible={!!variantPicker}
        product={variantPicker?.product ?? null}
        variants={variantPicker?.variants ?? []}
        onSelect={handleVariantSelect}
        onClose={() => setVariantPicker(null)}
      />

      <CarpetRollPicker
        visible={!!rollPicker}
        productId={rollPicker?.product.id || ''}
        productName={rollPicker?.product.name || ''}
        variantId={rollPicker?.variant?.id}
        variantName={rollPicker?.variant?.name}
        onConfirm={handleRollConfirm}
        onClose={() => setRollPicker(null)}
      />

      <CarpetCutPiecePicker
        visible={!!cutPiecePicker}
        productId={cutPiecePicker?.product?.id}
        productName={cutPiecePicker?.product?.name}
        variantId={cutPiecePicker?.variant?.id}
        onSelect={handleCutPieceSelect}
        onClose={() => setCutPiecePicker(null)}
      />

      <ServiceChargesSheet
        visible={servicesSheetOpen}
        charges={serviceCharges}
        onChange={setServiceCharges}
        onClose={() => setServicesSheetOpen(false)}
      />

      <NotesEditor
        visible={!!notesEditorFor}
        productName={activeNoteItem?.name || ''}
        note={activeNoteItem?.note ?? ''}
        internalNote={activeNoteItem?.internalNote ?? ''}
        onChange={(patch) => { if (notesEditorFor) updateCartLine(notesEditorFor, patch); }}
        onClose={() => setNotesEditorFor(null)}
      />

      {/* Held Carts Modal */}
      <Modal visible={showHeldCarts} animationType="slide" presentationStyle="pageSheet" onRequestClose={() => setShowHeldCarts(false)}>
        <SafeAreaView className="flex-1 bg-neutral-50">
          <View className="px-5 py-4 border-b border-slate-200 flex-row items-center gap-3">
            <View className="h-11 w-11 rounded-2xl items-center justify-center" style={{ backgroundColor: '#d97706' }}>
              <Pause size={20} color="#ffffff" />
            </View>
            <View className="flex-1">
              <Text className="text-base font-extrabold text-slate-900">Held Carts</Text>
              <Text className="text-xs text-slate-500">{heldCarts.length} on hold</Text>
            </View>
            <Pressable onPress={() => setShowHeldCarts(false)} hitSlop={12} className="h-10 w-10 rounded-2xl bg-slate-100 items-center justify-center">
              <X size={20} color="#64748b" />
            </Pressable>
          </View>
          <ScrollView contentContainerStyle={{ padding: 20 }}>
            {heldCarts.length === 0 ? (
              <View className="items-center py-12">
                <Pause size={40} color="#d1d5db" />
                <Text className="mt-3 font-extrabold text-slate-500">No held carts</Text>
              </View>
            ) : heldCarts.map((held) => (
              <View key={held.id} className="rounded-2xl bg-white p-3 mb-2" style={{ borderWidth: 2, borderColor: '#e2e8f0' }}>
                <View className="flex-row items-start justify-between">
                  <View className="flex-1 min-w-0">
                    <View className="flex-row items-center gap-1.5 mb-0.5">
                      <User size={12} color="#8b5cf6" />
                      <Text className="font-extrabold text-slate-900" numberOfLines={1}>{held.customerName}</Text>
                    </View>
                    <Text className="text-xs text-slate-500">
                      {held.items.length} items{held.serviceCharges?.length > 0 && ` + ${held.serviceCharges.length} svc`} • {formatRelative(held.heldAt)}
                    </Text>
                  </View>
                  <View className="items-end">
                    <Text className="text-lg font-extrabold text-emerald-700">{formatPKRFull(held.total)}</Text>
                    <View className="flex-row gap-1 mt-1">
                      <Pressable
                        onPress={() => handleResumeCart(held)}
                        className="px-2.5 h-7 rounded-lg flex-row items-center gap-1"
                        style={{ backgroundColor: '#d97706' }}
                      >
                        <PlayCircle size={11} color="#ffffff" />
                        <Text className="text-white text-[10px] font-extrabold">Resume</Text>
                      </Pressable>
                      <Pressable
                        onPress={() => handleDeleteHeld(held.id)}
                        className="h-7 w-7 rounded-lg items-center justify-center"
                        style={{ backgroundColor: '#fef2f2' }}
                      >
                        <X size={11} color="#dc2626" />
                      </Pressable>
                    </View>
                  </View>
                </View>
              </View>
            ))}
          </ScrollView>
        </SafeAreaView>
      </Modal>

      {/* Quick Add Customer */}
      <Modal visible={showCustomerAdd} animationType="slide" presentationStyle="formSheet" onRequestClose={() => setShowCustomerAdd(false)}>
        <SafeAreaView className="flex-1 bg-neutral-50">
          <View className="px-5 py-4 border-b border-slate-200 flex-row items-center gap-3">
            <View className="h-11 w-11 rounded-2xl items-center justify-center" style={{ backgroundColor: '#8b5cf6' }}>
              <UserPlus size={20} color="#ffffff" />
            </View>
            <Text className="flex-1 text-base font-extrabold text-slate-900">Quick Add Customer</Text>
            <Pressable onPress={() => setShowCustomerAdd(false)} hitSlop={12} className="h-10 w-10 rounded-2xl bg-slate-100 items-center justify-center">
              <X size={20} color="#64748b" />
            </Pressable>
          </View>
          <View className="p-5 gap-3">
            <View>
              <Text className="text-xs font-extrabold uppercase text-slate-500 mb-1.5 tracking-wider">Name *</Text>
              <View className="rounded-2xl bg-white px-4 h-12 justify-center" style={{ borderWidth: 2, borderColor: '#e2e8f0' }}>
                <TextInput
                  autoFocus
                  value={newCustomer.name}
                  onChangeText={(t) => setNewCustomer({ ...newCustomer, name: t })}
                  placeholder="Customer name"
                  placeholderTextColor="#9ca3af"
                  className="text-base text-slate-900"
                />
              </View>
            </View>
            <View>
              <Text className="text-xs font-extrabold uppercase text-slate-500 mb-1.5 tracking-wider">Phone</Text>
              <View className="rounded-2xl bg-white px-4 h-12 justify-center" style={{ borderWidth: 2, borderColor: '#e2e8f0' }}>
                <TextInput
                  value={newCustomer.phone}
                  onChangeText={(t) => setNewCustomer({ ...newCustomer, phone: t })}
                  placeholder="03XXXXXXXXX"
                  placeholderTextColor="#9ca3af"
                  keyboardType="phone-pad"
                  className="text-base text-slate-900"
                />
              </View>
            </View>
            <Pressable
              onPress={() => {
                if (!newCustomer.name.trim()) { Toast.show({ type: 'error', text1: 'Name required' }); return; }
                addCustomerMutation.mutate();
              }}
              disabled={addCustomerMutation.isPending}
              className="h-12 rounded-2xl items-center justify-center flex-row gap-2 mt-2"
              style={{ backgroundColor: addCustomerMutation.isPending ? '#9ca3af' : '#8b5cf6' }}
            >
              <UserPlus size={18} color="#ffffff" />
              <Text className="text-white font-extrabold text-base">
                {addCustomerMutation.isPending ? 'Adding...' : 'Add Customer'}
              </Text>
            </Pressable>
          </View>
        </SafeAreaView>
      </Modal>

      {/* Checkout Modal */}
      <Modal visible={checkoutOpen} animationType="slide" presentationStyle="pageSheet" onRequestClose={() => setCheckoutOpen(false)}>
        <SafeAreaView className="flex-1 bg-neutral-50">
          <KeyboardAvoidingView behavior={Platform.OS === 'ios' ? 'padding' : 'height'} className="flex-1">
            <View className="flex-row items-center justify-between px-5 py-4 border-b border-slate-200">
              <View className="flex-row items-center gap-3">
                <View className="h-10 w-10 rounded-2xl items-center justify-center" style={{ backgroundColor: '#065f46' }}>
                  <Receipt size={18} color="#ffffff" />
                </View>
                <View>
                  <Text className="text-xl font-extrabold text-slate-900">Checkout</Text>
                  <Text className="text-xs text-slate-500">{formatQty(totalItems)} items • {cart.length} lines</Text>
                </View>
              </View>
              <Pressable onPress={() => setCheckoutOpen(false)} hitSlop={12} className="h-10 w-10 rounded-2xl bg-slate-100 items-center justify-center">
                <X size={20} color="#64748b" />
              </Pressable>
            </View>

            <ScrollView contentContainerStyle={{ padding: 20, paddingBottom: 40 }} keyboardShouldPersistTaps="handled">
              <View
                className="rounded-3xl p-6 items-center mb-4"
                style={{
                  backgroundColor: saleMode === 'FULL_CREDIT' ? '#dc2626' : saleMode === 'PARTIAL_CREDIT' ? '#d97706' : '#065f46',
                }}
              >
                <Text className="text-xs font-extrabold uppercase tracking-wider text-white/80">Total Amount</Text>
                <Text className="text-5xl font-extrabold text-white mt-2">{formatPKRFull(total)}</Text>
                {(totalDiscount > 0 || svcTotal > 0) && (
                  <Text className="text-xs text-white/80 mt-2 text-center">
                    Subtotal: {formatPKRFull(subtotal)}
                    {totalDiscount > 0 && ` • Disc: -${formatPKRFull(totalDiscount)}`}
                    {svcTotal > 0 && ` • Svc: +${formatPKRFull(svcTotal)}`}
                  </Text>
                )}
              </View>

              <View className="mb-3">
                <Text className="text-xs font-extrabold uppercase text-slate-500 mb-1.5 tracking-wider">Global Discount (PKR)</Text>
                <View className="rounded-2xl bg-white px-4 h-12 justify-center" style={{ borderWidth: 2, borderColor: '#e2e8f0' }}>
                  <TextInput
                    value={globalDiscount}
                    onChangeText={setGlobalDiscount}
                    keyboardType="decimal-pad"
                    placeholder="0"
                    placeholderTextColor="#9ca3af"
                    className="text-base font-bold text-slate-900"
                  />
                </View>
              </View>

              <Text className="text-xs font-extrabold uppercase text-slate-500 mb-2 tracking-wider">Customer</Text>
              <View className="flex-row gap-2 mb-3">
                <Pressable
                  onPress={() => setCustomerPickerOpen(true)}
                  className="flex-1 flex-row items-center gap-3 px-4 py-3 rounded-2xl bg-white"
                  style={{ borderWidth: 1, borderColor: '#e2e8f0' }}
                >
                  <View className="h-10 w-10 rounded-xl items-center justify-center" style={{ backgroundColor: '#ede9fe' }}>
                    <User size={18} color="#8b5cf6" />
                  </View>
                  <View className="flex-1 min-w-0">
                    <Text className="font-extrabold text-slate-900" numberOfLines={1}>
                      {selectedCustomer?.name || 'Walk-in Customer'}
                    </Text>
                    <Text className="text-xs text-slate-500" numberOfLines={1}>
                      {selectedCustomer?.phone || 'Tap to select'}
                    </Text>
                  </View>
                  {selectedCustomer && (
                    <Pressable
                      onPress={() => setSelectedCustomer(null)}
                      hitSlop={8}
                      className="h-7 w-7 rounded-lg bg-slate-100 items-center justify-center"
                    >
                      <X size={12} color="#94a3b8" />
                    </Pressable>
                  )}
                </Pressable>
                <Pressable
                  onPress={() => setShowCustomerAdd(true)}
                  className="h-14 w-14 rounded-2xl items-center justify-center"
                  style={{ backgroundColor: '#8b5cf6' }}
                >
                  <UserPlus size={20} color="#ffffff" />
                </Pressable>
              </View>

              {selectedCustomer && customerCreditSummary && (
                <View className="rounded-2xl mb-4 overflow-hidden" style={{ borderWidth: 2, borderColor: '#c4b5fd' }}>
                  <View className="px-4 py-3 flex-row items-center gap-3" style={{ backgroundColor: '#7c3aed' }}>
                    <View className="h-10 w-10 rounded-xl items-center justify-center" style={{ backgroundColor: 'rgba(255,255,255,0.2)' }}>
                      <Text className="text-white font-extrabold text-base">{selectedCustomer.name.charAt(0).toUpperCase()}</Text>
                    </View>
                    <View className="flex-1 min-w-0">
                      <View className="flex-row items-center gap-1">
                        <Text className="text-white font-extrabold" numberOfLines={1}>{selectedCustomer.name}</Text>
                        {selectedCustomer.isVip && <Crown size={12} color="#fde68a" fill="#fde68a" />}
                      </View>
                      {selectedCustomer.phone && (
                        <View className="flex-row items-center gap-1 mt-0.5">
                          <Phone size={10} color="rgba(255,255,255,0.8)" />
                          <Text className="text-[10px] text-white/80">{selectedCustomer.phone}</Text>
                        </View>
                      )}
                    </View>
                    {customerCreditSummary.currentBalance > 0 && (
                      <View>
                        <Text className="text-[9px] text-white/70 font-extrabold uppercase">Udhaar</Text>
                        <Text className="text-base font-extrabold text-amber-300">{formatPKRFull(customerCreditSummary.currentBalance)}</Text>
                      </View>
                    )}
                  </View>
                  <View className="flex-row bg-white">
                    <View className="flex-1 p-2 items-center" style={{ borderRightWidth: 1, borderRightColor: '#f1f5f9' }}>
                      <Text className="text-[9px] uppercase font-extrabold text-slate-500">Today</Text>
                      <Text className="text-sm font-extrabold text-slate-900">{customerCreditSummary.todaySalesCount}</Text>
                    </View>
                    <View className="flex-1 p-2 items-center" style={{ backgroundColor: '#f0fdf4', borderRightWidth: 1, borderRightColor: '#f1f5f9' }}>
                      <View className="flex-row items-center gap-0.5">
                        <ArrowDownCircle size={8} color="#16a34a" />
                        <Text className="text-[9px] uppercase font-extrabold text-emerald-700">Paid</Text>
                      </View>
                      <Text className="text-[11px] font-extrabold text-emerald-700">{formatPKRFull(customerCreditSummary.todayPaid)}</Text>
                    </View>
                    <View className="flex-1 p-2 items-center" style={{ backgroundColor: '#fffbeb' }}>
                      <View className="flex-row items-center gap-0.5">
                        <ArrowUpCircle size={8} color="#d97706" />
                        <Text className="text-[9px] uppercase font-extrabold text-amber-700">Udhaar</Text>
                      </View>
                      <Text className="text-[11px] font-extrabold text-amber-700">{formatPKRFull(customerCreditSummary.todayCredit)}</Text>
                    </View>
                  </View>
                </View>
              )}

              <Text className="text-xs font-extrabold uppercase text-slate-500 mb-2 tracking-wider">Sale Mode</Text>
              <View className="flex-row gap-2 mb-4">
                {[
                  { key: 'FULL_PAYMENT', label: 'Full Cash', icon: Banknote, activeBg: '#dcfce7', activeBorder: '#16a34a', activeIcon: '#16a34a', activeText: '#15803d' },
                  { key: 'PARTIAL_CREDIT', label: 'Partial', icon: HandCoins, activeBg: '#fef3c7', activeBorder: '#d97706', activeIcon: '#d97706', activeText: '#b45309' },
                  { key: 'FULL_CREDIT', label: 'Full Udhaar', icon: BookOpen, activeBg: '#fee2e2', activeBorder: '#dc2626', activeIcon: '#dc2626', activeText: '#b91c1c' },
                ].map((m) => {
                  const Icon = m.icon;
                  const active = saleMode === m.key;
                  const disabled = m.key !== 'FULL_PAYMENT' && !selectedCustomer;
                  return (
                    <Pressable
                      key={m.key}
                      onPress={() => {
                        if (disabled) { Toast.show({ type: 'error', text1: 'Customer required' }); return; }
                        Haptics.selectionAsync();
                        setSaleMode(m.key as SaleMode);
                        if (m.key === 'PARTIAL_CREDIT') setPaidAmountStr(String(Math.floor(total / 2)));
                        else if (m.key === 'FULL_CREDIT') setPaidAmountStr('0');
                      }}
                      disabled={disabled}
                      className="flex-1 rounded-2xl p-3 items-center"
                      style={{
                        borderWidth: 2,
                        borderColor: active ? m.activeBorder : '#e5e7eb',
                        backgroundColor: active ? m.activeBg : disabled ? '#f9fafb' : '#ffffff',
                        opacity: disabled ? 0.5 : 1,
                      }}
                    >
                      <Icon size={18} color={active ? m.activeIcon : '#9ca3af'} />
                      <Text className="text-[10px] font-extrabold mt-1" style={{ color: active ? m.activeText : '#64748b' }}>
                        {m.label}
                      </Text>
                    </Pressable>
                  );
                })}
              </View>

              {saleMode !== 'FULL_CREDIT' && (
                <>
                  <Text className="text-xs font-extrabold uppercase text-slate-500 mb-2 tracking-wider">Payment Method</Text>
                  <View className="flex-row flex-wrap -m-1 mb-4">
                    {paymentMethods.map((m) => {
                      const Icon = m.icon;
                      const active = paymentMethod === m.key;
                      return (
                        <View key={m.key} className="w-1/3 p-1">
                          <Pressable
                            onPress={() => { Haptics.selectionAsync(); setPaymentMethod(m.key); }}
                            className="h-20 rounded-2xl items-center justify-center gap-1"
                            style={{
                              borderWidth: 2,
                              backgroundColor: active ? m.color : '#ffffff',
                              borderColor: active ? m.color : '#e5e7eb',
                            }}
                          >
                            <Icon size={20} color={active ? '#ffffff' : m.color} />
                            <Text className="text-xs font-extrabold" style={{ color: active ? '#ffffff' : '#334155' }}>
                              {m.label}
                            </Text>
                          </Pressable>
                        </View>
                      );
                    })}
                  </View>
                </>
              )}

              {saleMode === 'PARTIAL_CREDIT' && (
                <>
                  <Text className="text-xs font-extrabold uppercase text-amber-700 mb-2 tracking-wider">Paid Now (Rest → Khata)</Text>
                  <View className="flex-row items-center gap-2 rounded-2xl px-4 h-16 mb-2" style={{ borderWidth: 2, borderColor: '#fcd34d', backgroundColor: '#fef3c7' }}>
                    <Wallet size={22} color="#d97706" />
                    <Text className="text-lg font-extrabold text-amber-700">Rs</Text>
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
                          onPress={() => setPaidAmountStr(String(amt))}
                          className="flex-1 py-2 rounded-xl"
                          style={{ backgroundColor: '#fef3c7' }}
                        >
                          <Text className="text-center text-[10px] font-extrabold text-amber-800">{formatPKRFull(amt)}</Text>
                        </Pressable>
                      ))}
                    </View>
                  )}
                </>
              )}

              {changeAmount > 0 && (
                <View className="rounded-2xl p-4 mb-3" style={{ backgroundColor: '#f0fdf4', borderWidth: 1, borderColor: '#86efac' }}>
                  <Text className="text-xs text-emerald-700 font-extrabold uppercase">Change Wapis</Text>
                  <Text className="text-2xl font-extrabold text-emerald-700 mt-1">{formatPKRFull(changeAmount)}</Text>
                </View>
              )}

              {creditAmount > 0 && (
                <View className="rounded-2xl p-4 mb-3" style={{ backgroundColor: '#fef3c7', borderWidth: 2, borderColor: '#fcd34d' }}>
                  <Text className="text-xs font-extrabold text-amber-900 uppercase tracking-wider">Khata mein Add</Text>
                  <Text className="text-2xl font-extrabold text-amber-700 mt-1">{formatPKRFull(creditAmount)}</Text>
                </View>
              )}
            </ScrollView>

            <View className="px-5 py-4 border-t border-slate-200 bg-white">
              <Pressable
                onPress={handleCheckout}
                disabled={checkoutMutation.isPending || (creditAmount > 0 && !selectedCustomer)}
                className="h-14 rounded-2xl flex-row items-center justify-center gap-2"
                style={{
                  backgroundColor: checkoutMutation.isPending || (creditAmount > 0 && !selectedCustomer)
                    ? '#9ca3af'
                    : saleMode === 'FULL_CREDIT' ? '#dc2626'
                    : saleMode === 'PARTIAL_CREDIT' ? '#d97706'
                    : '#065f46',
                }}
              >
                {checkoutMutation.isPending ? (
                  <Text className="text-white font-extrabold text-base">Processing...</Text>
                ) : (
                  <>
                    <CheckCircle2 size={22} color="#ffffff" />
                    <Text className="text-white font-extrabold text-base">
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

          {customerPickerOpen && (
            <View style={{ position: 'absolute', top: 0, left: 0, right: 0, bottom: 0, backgroundColor: '#fafafa', zIndex: 9999, elevation: 9999 }}>
              <SafeAreaView className="flex-1 bg-neutral-50" edges={['top']}>
                <View className="flex-row items-center justify-between px-5 py-4 border-b border-slate-200 bg-white">
                  <View>
                    <Text className="text-xl font-extrabold text-slate-900">Select Customer</Text>
                    <Text className="text-xs text-slate-500 mt-0.5">{filteredCustomers.length} of {customerItems.length}</Text>
                  </View>
                  <Pressable
                    onPress={() => { setCustomerPickerOpen(false); setCustomerSearch(''); }}
                    hitSlop={12}
                    className="h-10 w-10 rounded-2xl bg-slate-100 items-center justify-center"
                  >
                    <X size={20} color="#64748b" />
                  </Pressable>
                </View>
                <View className="px-5 py-3">
                  <View className="flex-row items-center gap-2 rounded-2xl bg-white px-4 h-12" style={{ borderWidth: 1, borderColor: '#e2e8f0' }}>
                    <Search size={18} color="#9ca3af" />
                    <TextInput
                      placeholder="Search by name or phone..."
                      placeholderTextColor="#9ca3af"
                      value={customerSearch}
                      onChangeText={setCustomerSearch}
                      autoFocus
                      className="flex-1 text-base text-slate-900"
                    />
                  </View>
                </View>
                <ScrollView contentContainerStyle={{ padding: 20, paddingTop: 0 }}>
                  <Pressable
                    onPress={() => { setSelectedCustomer(null); setCustomerPickerOpen(false); setCustomerSearch(''); }}
                    className="flex-row items-center gap-3 p-4 rounded-2xl bg-white mb-2"
                    style={{ borderWidth: 1, borderColor: '#e2e8f0' }}
                  >
                    <View className="h-12 w-12 rounded-2xl items-center justify-center" style={{ backgroundColor: '#f1f5f9' }}>
                      <User size={20} color="#94a3b8" />
                    </View>
                    <View className="flex-1">
                      <Text className="font-extrabold text-slate-900">Walk-in Customer</Text>
                      <Text className="text-xs text-slate-500 mt-0.5">No tracking</Text>
                    </View>
                  </Pressable>
                  {filteredCustomers.map((c) => (
                    <Pressable
                      key={c.id}
                      onPress={() => { setSelectedCustomer(c); setCustomerPickerOpen(false); setCustomerSearch(''); }}
                      className="flex-row items-center gap-3 p-4 rounded-2xl bg-white mb-2"
                      style={{ borderWidth: 1, borderColor: '#e2e8f0' }}
                    >
                      <View className="h-12 w-12 rounded-2xl items-center justify-center" style={{ backgroundColor: '#ede9fe' }}>
                        <Text className="text-violet-700 font-extrabold">{c.name.charAt(0).toUpperCase()}</Text>
                      </View>
                      <View className="flex-1">
                        <View className="flex-row items-center gap-2">
                          <Text className="font-extrabold text-slate-900">{c.name}</Text>
                          {c.isVip && (
                            <View className="px-1.5 py-0.5 rounded-md" style={{ backgroundColor: '#fef3c7' }}>
                              <Text className="text-[9px] text-amber-700 font-extrabold">VIP</Text>
                            </View>
                          )}
                        </View>
                        {c.phone && <Text className="text-xs text-slate-500 mt-0.5">{c.phone}</Text>}
                      </View>
                      {c.balance > 0 && (
                        <View className="px-2.5 py-1 rounded-lg" style={{ backgroundColor: '#fef3c7' }}>
                          <Text className="text-[10px] text-amber-700 font-extrabold">{formatPKRFull(c.balance)}</Text>
                          <Text className="text-[9px] text-amber-600 font-extrabold">Udhaar</Text>
                        </View>
                      )}
                    </Pressable>
                  ))}
                </ScrollView>
              </SafeAreaView>
            </View>
          )}
        </SafeAreaView>
      </Modal>
    </SafeAreaView>
  );
}
