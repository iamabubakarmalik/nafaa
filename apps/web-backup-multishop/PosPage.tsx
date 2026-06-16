import { useEffect, useMemo, useRef, useState, useCallback } from 'react';
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import {
  Search, ShoppingCart, Trash2, Plus, Minus, Receipt, ScanLine, Camera,
  Package, User, CreditCard, Banknote, Smartphone, Building2, X,
  CheckCircle2, AlertCircle, Sparkles, Wallet, Zap, BookOpen,
  TrendingDown, Phone, Star, History, HandCoins,
  ArrowDownCircle, ArrowUpCircle, Ruler, Edit3, Pause,
  PlayCircle, Layers, Percent, Tag, UserPlus, Eye, EyeOff, ChevronDown,
  Filter,
} from 'lucide-react';
import { productsApi, type Product } from '@/api/products.api';
import { productVariantsApi, type ProductVariant } from '@/api/product-variants.api';
import { customersApi } from '@/api/customers.api';
import { salesApi, type PaymentMethod } from '@/api/sales.api';
import { categoriesApi } from '@/api/categories.api';
import { Button } from '@/components/ui/Button';
import { formatPKR } from '@/lib/format';
import { toast } from 'sonner';
import BarcodeScanner from '@/components/barcode/BarcodeScanner';
import { LengthWidthCalculator } from '../components/LengthWidthCalculator';
import { VariantPicker } from '../components/VariantPicker';
import { useBusinessFeatures } from '@/hooks/useBusinessFeatures';
import { ImeiPickerModal } from '@/features/industries/mobile/components/ImeiPickerModal';
import type { ProductImei } from '@/features/industries/mobile/api/imei.api';

type CartItem = {
  cartLineId: string;
  productId: string;
  variantId?: string;
  imeiId?: string;
  imeiNumber?: string;
  name: string;
  variantName?: string;
  variantImage?: string;
  variantColor?: string;
  variantColorHex?: string;
  variantSize?: string;
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

const paymentMethodConfig: Record<PaymentMethod, { label: string; icon: any; color: string; bg: string }> = {
  CASH: { label: 'Cash', icon: Banknote, color: '#16a34a', bg: 'bg-emerald-50 border-emerald-300' },
  CARD: { label: 'Card', icon: CreditCard, color: '#2563eb', bg: 'bg-blue-50 border-blue-300' },
  JAZZCASH: { label: 'JazzCash', icon: Smartphone, color: '#f97316', bg: 'bg-orange-50 border-orange-300' },
  EASYPAISA: { label: 'EasyPaisa', icon: Zap, color: '#22c55e', bg: 'bg-green-50 border-green-300' },
  BANK_TRANSFER: { label: 'Bank', icon: Building2, color: '#7c3aed', bg: 'bg-violet-50 border-violet-300' },
};

const HOLD_KEY = 'nafaa.pos.held-carts';
const LW_UNITS = new Set(['sqft', 'sqm', 'meter', 'ft', 'yard', 'gaj']);
const MOBILE_KEYWORDS = ['mobile', 'phone', 'smartphone', 'iphone', 'samsung', 'oppo', 'vivo', 'realme', 'xiaomi', 'tecno', 'infinix'];
const PAGE_SIZE = 60; // Show 60 products at a time, infinite scroll for more

const loadHeldCarts = (): HeldCart[] => {
  try {
    const raw = localStorage.getItem(HOLD_KEY);
    if (raw) return JSON.parse(raw);
  } catch {}
  return [];
};

const saveHeldCarts = (carts: HeldCart[]) => {
  try {
    localStorage.setItem(HOLD_KEY, JSON.stringify(carts));
  } catch {}
};

const cartLineId = () => `${Date.now()}-${Math.random().toString(36).slice(2, 8)}`;

export default function PosPage() {
  const queryClient = useQueryClient();
  const { features: businessFeatures } = useBusinessFeatures();

  const [search, setSearch] = useState('');
  const [debouncedSearch, setDebouncedSearch] = useState('');
  const [selectedCategoryId, setSelectedCategoryId] = useState<string>('');
  const [visibleCount, setVisibleCount] = useState(PAGE_SIZE);
  const [cart, setCart] = useState<CartItem[]>([]);
  const [customerId, setCustomerId] = useState('');
  const [paymentMethod, setPaymentMethod] = useState<PaymentMethod>('CASH');
  const [paidAmount, setPaidAmount] = useState('');
  const [saleMode, setSaleMode] = useState<SaleMode>('FULL_PAYMENT');
  const [globalDiscount, setGlobalDiscount] = useState('');
  const [scannerOpen, setScannerOpen] = useState(false);
  const [barcodeInput, setBarcodeInput] = useState('');
  const [lwOpen, setLwOpen] = useState<CartItem | null>(null);
  const [variantPickerProduct, setVariantPickerProduct] = useState<Product | null>(null);
  const [variantPickerData, setVariantPickerData] = useState<ProductVariant[]>([]);
  const [editingLine, setEditingLine] = useState<string | null>(null);
  const [heldCarts, setHeldCarts] = useState<HeldCart[]>([]);
  const [showHeldCarts, setShowHeldCarts] = useState(false);
  const [showCustomerAdd, setShowCustomerAdd] = useState(false);
  const [newCustomer, setNewCustomer] = useState({ name: '', phone: '' });
  const [hidePrices, setHidePrices] = useState(false);
  const [imeiPickerData, setImeiPickerData] = useState<{ product: Product; variant?: ProductVariant } | null>(null);
  const barcodeRef = useRef<HTMLInputElement>(null);
  const scrollRef = useRef<HTMLDivElement>(null);

  // Debounce search for performance
  useEffect(() => {
    const t = setTimeout(() => setDebouncedSearch(search), 200);
    return () => clearTimeout(t);
  }, [search]);

  // Reset visible count when filter changes
  useEffect(() => {
    setVisibleCount(PAGE_SIZE);
    if (scrollRef.current) scrollRef.current.scrollTop = 0;
  }, [debouncedSearch, selectedCategoryId]);

  const { data: productsData, isLoading: productsLoading } = useQuery({
    queryKey: ['products-for-pos'],
    queryFn: () => productsApi.list({ page: 1, limit: 1000 }),
  });

  const { data: customersData } = useQuery({
    queryKey: ['customers-for-pos'],
    queryFn: () => customersApi.list({ page: 1, limit: 500 }),
  });

  const { data: customerDetail } = useQuery({
    queryKey: ['customer-detail', customerId],
    queryFn: () => customersApi.get(customerId),
    enabled: !!customerId,
  });

  const { data: categories = [] } = useQuery({
    queryKey: ['categories'],
    queryFn: categoriesApi.list,
  });

  const products = productsData?.items ?? [];
  const customers = customersData?.items ?? [];

  useEffect(() => {
    setHeldCarts(loadHeldCarts());
  }, []);

  // Memoized filter for performance with large lists
  const filteredProducts = useMemo(() => {
    let list = products;

    if (selectedCategoryId) {
      list = list.filter((p) => p.categoryId === selectedCategoryId);
    }

    const q = debouncedSearch.toLowerCase().trim();
    if (q) {
      list = list.filter(
        (p) =>
          p.name.toLowerCase().includes(q) ||
          (p.sku || '').toLowerCase().includes(q) ||
          (p.barcode || '').toLowerCase().includes(q),
      );
    }

    return list;
  }, [products, debouncedSearch, selectedCategoryId]);

  const visibleProducts = useMemo(
    () => filteredProducts.slice(0, visibleCount),
    [filteredProducts, visibleCount],
  );

  const hasMore = filteredProducts.length > visibleCount;

  // Category counts
  const categoryCounts = useMemo(() => {
    const counts: Record<string, number> = {};
    products.forEach((p) => {
      if (p.categoryId) counts[p.categoryId] = (counts[p.categoryId] || 0) + 1;
    });
    return counts;
  }, [products]);

  // Cart calculations
  const subtotal = useMemo(
    () =>
      cart.reduce((sum, item) => {
        const unitPrice = item.priceOverride ?? (item.useWholesale ? (item.wholesalePrice ?? item.basePrice) : item.basePrice);
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
    return Number(paidAmount || 0);
  }, [saleMode, total, paidAmount]);

  const change = Math.max(effectivePaid - total, 0);
  const credit = Math.max(total - effectivePaid, 0);
  const isCreditSale = credit > 0;

  const selectedCustomer = customers.find((c) => c.id === customerId);

  const customerCreditSummary = useMemo(() => {
    if (!customerDetail) return null;
    const sales = (customerDetail as any).sales || [];
    const today = new Date().toDateString();

    const todaySales = sales.filter((s: any) => new Date(s.createdAt).toDateString() === today);
    const todayCredit = todaySales.reduce((sum: number, s: any) => sum + (s.creditAmount || 0), 0);
    const todayPaid = todaySales.reduce((sum: number, s: any) => sum + (s.paidAmount || 0), 0);

    return {
      currentBalance: customerDetail.balance || 0,
      todaySalesCount: todaySales.length,
      todayCredit,
      todayPaid,
      totalSales: sales.length,
      lastSaleDate: sales[0]?.createdAt,
    };
  }, [customerDetail]);

  const checkoutMutation = useMutation({
    mutationFn: salesApi.create,
    onSuccess: (sale) => {
      const msg = isCreditSale
        ? `Sale + ${formatPKR(credit)} udhaar khata mein add ho gaya`
        : `Sale complete! ${sale.saleNumber}`;
      toast.success(msg, { description: `Total: ${formatPKR(total)}` });
      resetCart();
      queryClient.invalidateQueries({ queryKey: ['products'] });
      queryClient.invalidateQueries({ queryKey: ['products-for-pos'] });
      queryClient.invalidateQueries({ queryKey: ['dashboard-overview'] });
      queryClient.invalidateQueries({ queryKey: ['sales'] });
      queryClient.invalidateQueries({ queryKey: ['customers'] });
      queryClient.invalidateQueries({ queryKey: ['customers-for-pos'] });
      barcodeRef.current?.focus();
    },
    onError: (err: any) => {
      toast.error(err?.response?.data?.message || 'Checkout fail ho gaya');
    },
  });

  const addCustomerMutation = useMutation({
    mutationFn: customersApi.create,
    onSuccess: (customer) => {
      toast.success(`${customer.name} added`);
      setCustomerId(customer.id);
      setShowCustomerAdd(false);
      setNewCustomer({ name: '', phone: '' });
      queryClient.invalidateQueries({ queryKey: ['customers-for-pos'] });
    },
    onError: (e: any) => toast.error(e?.response?.data?.message || 'Add fail'),
  });

  const resetCart = () => {
    setCart([]);
    setCustomerId('');
    setPaymentMethod('CASH');
    setPaidAmount('');
    setGlobalDiscount('');
    setSaleMode('FULL_PAYMENT');
  };

  // Check if product likely needs IMEI (mobile shops with imei feature)
  const productNeedsImei = useCallback((product: Product): boolean => {
    if (!businessFeatures.imei) return false;
    const name = product.name.toLowerCase();
    const category = (product.category?.name || '').toLowerCase();
    return MOBILE_KEYWORDS.some((kw) => name.includes(kw) || category.includes(kw));
  }, [businessFeatures.imei]);

  const addProductToCart = async (product: Product) => {
    if (product.stock <= 0) {
      toast.error(`${product.name} stock mein nahi hai`);
      return;
    }

    // If product has variants — open variant picker first
    if (product.hasVariants) {
      try {
        const variants = await productVariantsApi.list(product.id);
        const active = variants.filter((v) => v.isActive);
        if (active.length === 0) {
          toast.error('No active variants for this product');
          return;
        }
        setVariantPickerData(variants);
        setVariantPickerProduct(product);
        return;
      } catch {
        toast.error('Failed to load variants');
        return;
      }
    }

    // If product needs IMEI, open IMEI picker
    if (productNeedsImei(product)) {
      setImeiPickerData({ product });
      return;
    }

    addToCart(product, null);
  };

  const addToCart = (product: Product, variant: ProductVariant | null, extras?: { imeiId?: string; imeiNumber?: string }) => {
    const variantId = variant?.id;

    // For IMEI items, each must be a separate line (unique IMEI)
    if (extras?.imeiId) {
      const newItem: CartItem = {
        cartLineId: cartLineId(),
        productId: product.id,
        variantId,
        imeiId: extras.imeiId,
        imeiNumber: extras.imeiNumber,
        name: product.name,
        variantName: variant?.name,
        variantImage: variant?.imageUrl ?? undefined,
        variantColor: variant?.color ?? undefined,
        variantColorHex: variant?.colorHex ?? undefined,
        variantSize: variant?.size ?? undefined,
        basePrice: variant?.price ?? product.price,
        wholesalePrice: variant?.wholesalePrice ?? product.wholesalePrice,
        stock: 1, // IMEI items have qty 1
        quantity: 1,
        unit: variant?.unit ?? product.unit,
        category: product.category,
        useWholesale: false,
        lineDiscount: 0,
        note: `IMEI: ${extras.imeiNumber}`,
      };
      setCart((prev) => [...prev, newItem]);
      toast.success(`${product.name} added with IMEI ${extras.imeiNumber}`);
      return;
    }

    const existingIndex = cart.findIndex(
      (item) =>
        item.productId === product.id &&
        item.variantId === variantId &&
        !item.imeiId &&
        !item.priceOverride,
    );

    if (existingIndex >= 0) {
      const existing = cart[existingIndex];
      const stock = variant ? variant.stock : product.stock;
      if (existing.quantity >= stock) {
        toast.error('Available stock se zyada add nahi kar sakte');
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
      cartLineId: cartLineId(),
      productId: product.id,
      variantId,
      name: product.name,
      variantName: variant?.name,
      variantImage: variant?.imageUrl ?? undefined,
      variantColor: variant?.color ?? undefined,
      variantColorHex: variant?.colorHex ?? undefined,
      variantSize: variant?.size ?? undefined,
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
    toast.success(`${product.name}${variant ? ` (${variant.name})` : ''} added`);
  };

  const handleVariantSelect = (variant: ProductVariant) => {
    if (!variantPickerProduct) return;

    // Check if this variant needs IMEI
    if (productNeedsImei(variantPickerProduct)) {
      setImeiPickerData({ product: variantPickerProduct, variant });
      setVariantPickerProduct(null);
      setVariantPickerData([]);
      return;
    }

    addToCart(variantPickerProduct, variant);
    setVariantPickerProduct(null);
    setVariantPickerData([]);
  };

  const handleImeiSelect = (imei: ProductImei) => {
    if (!imeiPickerData) return;
    addToCart(imeiPickerData.product, imeiPickerData.variant || null, {
      imeiId: imei.id,
      imeiNumber: imei.imei1,
    });
    setImeiPickerData(null);
  };

  const updateCartLine = (cartLineId: string, patch: Partial<CartItem>) => {
    setCart((prev) =>
      prev.map((item) => (item.cartLineId === cartLineId ? { ...item, ...patch } : item)),
    );
  };

  const removeCartLine = (cartLineId: string) => {
    setCart((prev) => prev.filter((item) => item.cartLineId !== cartLineId));
  };

  const setLineQuantity = (cartLineId: string, qty: number) => {
    const item = cart.find((i) => i.cartLineId === cartLineId);
    if (!item) return;
    if (item.imeiId) {
      toast.error('IMEI items always qty 1');
      return;
    }
    if (qty < 0.01) {
      removeCartLine(cartLineId);
      return;
    }
    if (qty > item.stock) {
      toast.error(`Stock available: ${item.stock} ${item.unit}`);
      return;
    }
    updateCartLine(cartLineId, { quantity: Number(qty.toFixed(2)) });
  };

  const handleBarcodeScan = async (code: string) => {
    setScannerOpen(false);
    if (!code.trim()) return;
    try {
      const product = await productsApi.byBarcode(code.trim());
      if ((product as any).matchedVariant) {
        const variant = (product as any).matchedVariant as ProductVariant;
        if (productNeedsImei(product)) {
          setImeiPickerData({ product, variant });
        } else {
          addToCart(product, variant);
        }
      } else {
        await addProductToCart(product);
      }
    } catch {
      toast.error(`Barcode "${code}" se koi product nahi mila`);
    }
  };

  const handleBarcodeSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (!barcodeInput.trim()) return;
    handleBarcodeScan(barcodeInput.trim());
    setBarcodeInput('');
  };

  useEffect(() => {
    barcodeRef.current?.focus();
  }, []);

  useEffect(() => {
    if (!customerId && (saleMode === 'PARTIAL_CREDIT' || saleMode === 'FULL_CREDIT')) {
      setSaleMode('FULL_PAYMENT');
      setPaidAmount('');
    }
  }, [customerId]);

  // Infinite scroll handler
  const handleScroll = useCallback((e: React.UIEvent<HTMLDivElement>) => {
    const target = e.currentTarget;
    if (!hasMore) return;
    const scrolledRatio = (target.scrollTop + target.clientHeight) / target.scrollHeight;
    if (scrolledRatio > 0.85) {
      setVisibleCount((c) => Math.min(c + PAGE_SIZE, filteredProducts.length));
    }
  }, [hasMore, filteredProducts.length]);

  const handleCheckout = () => {
    if (cart.length === 0) {
      toast.error('Cart khaali hai');
      return;
    }
    if (isCreditSale && !customerId) {
      toast.error('Udhaar/Khata ke liye customer select karna zaroori hai');
      return;
    }
    if (saleMode === 'PARTIAL_CREDIT' && effectivePaid >= total) {
      toast.error('Partial mein paid amount total se kam honi chahiye');
      return;
    }
    if (saleMode === 'PARTIAL_CREDIT' && effectivePaid <= 0) {
      toast.error('Partial mein paid amount zaroori hai');
      return;
    }

    checkoutMutation.mutate({
      customerId: customerId || undefined,
      paymentMethod,
      paidAmount: effectivePaid,
      discount: gDiscount,
      items: cart.map((item) => ({
        productId: item.productId,
        variantId: item.variantId,
        quantity: item.quantity,
        priceOverride: item.priceOverride,
        lineDiscount: item.lineDiscount || undefined,
        useWholesale: item.useWholesale || undefined,
        note: item.note,
      })),
    });
  };

  const holdCurrentCart = () => {
    if (cart.length === 0) {
      toast.error('Cart khaali hai');
      return;
    }
    const held: HeldCart = {
      id: cartLineId(),
      items: cart,
      customerId,
      customerName: selectedCustomer?.name || 'Walk-in',
      total,
      heldAt: Date.now(),
    };
    const next = [held, ...heldCarts].slice(0, 10);
    setHeldCarts(next);
    saveHeldCarts(next);
    resetCart();
    toast.success('Cart held — POS ready for next customer');
  };

  const resumeHeldCart = (held: HeldCart) => {
    if (cart.length > 0) {
      if (!confirm('Current cart hai. Replace karein?')) return;
    }
    setCart(held.items);
    setCustomerId(held.customerId);
    const remaining = heldCarts.filter((c) => c.id !== held.id);
    setHeldCarts(remaining);
    saveHeldCarts(remaining);
    setShowHeldCarts(false);
    toast.success('Cart resumed');
  };

  const deleteHeldCart = (id: string) => {
    const remaining = heldCarts.filter((c) => c.id !== id);
    setHeldCarts(remaining);
    saveHeldCarts(remaining);
  };

  const quickAmounts = useMemo(() => {
    const amts = new Set([total, 500, 1000, 2000, 5000, 10000].filter((n) => n > 0 && n < total));
    return Array.from(amts).slice(0, 4);
  }, [total]);

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

  // Excluded IMEIs (already in cart)
  const excludedImeis = cart.filter((c) => c.imeiId).map((c) => c.imeiId!);

  return (
    <>
      {scannerOpen && (
        <BarcodeScanner
          onDetected={handleBarcodeScan}
          onClose={() => setScannerOpen(false)}
        />
      )}

      {lwOpen && (
        <LengthWidthCalculator
          productName={lwOpen.name + (lwOpen.variantName ? ` (${lwOpen.variantName})` : '')}
          unit={lwOpen.unit}
          initialQuantity={lwOpen.quantity}
          onApply={(qty, note) => {
            if (qty > lwOpen.stock) {
              toast.error(`Stock available: ${lwOpen.stock} ${lwOpen.unit}`);
              return;
            }
            updateCartLine(lwOpen.cartLineId, { quantity: qty, note });
            setLwOpen(null);
            toast.success(`Updated: ${qty.toFixed(2)} ${lwOpen.unit}`);
          }}
          onClose={() => setLwOpen(null)}
        />
      )}

      {variantPickerProduct && (
        <VariantPicker
          product={variantPickerProduct}
          variants={variantPickerData}
          onSelect={handleVariantSelect}
          onClose={() => {
            setVariantPickerProduct(null);
            setVariantPickerData([]);
          }}
        />
      )}

      {imeiPickerData && (
        <ImeiPickerModal
          productId={imeiPickerData.product.id}
          productName={imeiPickerData.product.name}
          variantId={imeiPickerData.variant?.id}
          variantName={imeiPickerData.variant?.name}
          excludeIds={excludedImeis}
          onSelect={handleImeiSelect}
          onClose={() => setImeiPickerData(null)}
        />
      )}

      {showCustomerAdd && (
        <div className="fixed inset-0 z-50 bg-slate-950/70 backdrop-blur-sm flex items-center justify-center p-4">
          <div className="w-full max-w-md bg-white rounded-3xl shadow-2xl overflow-hidden">
            <div className="px-5 py-4 border-b border-slate-200 bg-gradient-to-br from-violet-50 to-pink-50 flex items-center justify-between">
              <div className="flex items-center gap-2">
                <UserPlus className="h-5 w-5 text-violet-600" />
                <h3 className="font-bold text-slate-900">Quick Add Customer</h3>
              </div>
              <button
                onClick={() => setShowCustomerAdd(false)}
                className="h-8 w-8 rounded-lg hover:bg-white/50 flex items-center justify-center"
              >
                <X className="h-4 w-4" />
              </button>
            </div>
            <div className="p-5 space-y-3">
              <div>
                <label className="block text-xs font-bold text-slate-600 mb-1">Name *</label>
                <input
                  autoFocus
                  value={newCustomer.name}
                  onChange={(e) => setNewCustomer({ ...newCustomer, name: e.target.value })}
                  placeholder="Customer name"
                  className="h-11 w-full rounded-xl border-2 border-slate-200 px-3 text-sm focus:outline-none focus:border-violet-500"
                />
              </div>
              <div>
                <label className="block text-xs font-bold text-slate-600 mb-1">Phone</label>
                <input
                  value={newCustomer.phone}
                  onChange={(e) => setNewCustomer({ ...newCustomer, phone: e.target.value })}
                  placeholder="03XXXXXXXXX"
                  className="h-11 w-full rounded-xl border-2 border-slate-200 px-3 text-sm focus:outline-none focus:border-violet-500"
                />
              </div>
              <Button
                className="w-full"
                onClick={() => {
                  if (!newCustomer.name.trim()) {
                    toast.error('Name zaroori hai');
                    return;
                  }
                  addCustomerMutation.mutate({
                    name: newCustomer.name.trim(),
                    phone: newCustomer.phone.trim() || undefined,
                  });
                }}
                loading={addCustomerMutation.isPending}
              >
                <UserPlus className="h-4 w-4" /> Add Customer
              </Button>
            </div>
          </div>
        </div>
      )}

      {showHeldCarts && (
        <div className="fixed inset-0 z-50 bg-slate-950/70 backdrop-blur-sm flex items-center justify-center p-4">
          <div className="w-full max-w-2xl bg-white rounded-3xl shadow-2xl overflow-hidden max-h-[80vh] flex flex-col">
            <div className="px-5 py-4 border-b border-slate-200 bg-gradient-to-br from-amber-50 to-orange-50 flex items-center justify-between">
              <div className="flex items-center gap-2">
                <Pause className="h-5 w-5 text-amber-600" />
                <div>
                  <h3 className="font-bold text-slate-900">Held Carts</h3>
                  <p className="text-xs text-slate-600">
                    {heldCarts.length} cart{heldCarts.length !== 1 ? 's' : ''} on hold
                  </p>
                </div>
              </div>
              <button
                onClick={() => setShowHeldCarts(false)}
                className="h-8 w-8 rounded-lg hover:bg-white/50 flex items-center justify-center"
              >
                <X className="h-4 w-4" />
              </button>
            </div>
            <div className="flex-1 overflow-y-auto p-4 space-y-2">
              {heldCarts.length === 0 ? (
                <div className="py-12 text-center text-slate-500">
                  <Pause className="h-12 w-12 mx-auto opacity-30 mb-2" />
                  <p className="font-bold">No held carts</p>
                  <p className="text-xs mt-1">Hold a cart to switch between customers</p>
                </div>
              ) : (
                heldCarts.map((held) => (
                  <div
                    key={held.id}
                    className="rounded-2xl border-2 border-slate-200 hover:border-amber-400 p-3 transition group"
                  >
                    <div className="flex items-start justify-between gap-3">
                      <div className="min-w-0 flex-1">
                        <div className="flex items-center gap-2 mb-1">
                          <User className="h-3.5 w-3.5 text-violet-600" />
                          <div className="font-bold text-slate-900 truncate">
                            {held.customerName}
                          </div>
                        </div>
                        <div className="text-xs text-slate-500">
                          {held.items.length} items • Held {formatRelative(held.heldAt)}
                        </div>
                      </div>
                      <div className="text-right shrink-0">
                        <div className="text-lg font-extrabold text-emerald-700">
                          {formatPKR(held.total)}
                        </div>
                        <div className="flex gap-1 mt-2">
                          <button
                            onClick={() => resumeHeldCart(held)}
                            className="px-2.5 py-1 rounded-lg bg-amber-600 hover:bg-amber-700 text-white text-[11px] font-bold inline-flex items-center gap-1"
                          >
                            <PlayCircle className="h-3 w-3" /> Resume
                          </button>
                          <button
                            onClick={() => deleteHeldCart(held.id)}
                            className="h-7 w-7 rounded-lg bg-rose-50 hover:bg-rose-100 text-rose-600 flex items-center justify-center"
                          >
                            <Trash2 className="h-3 w-3" />
                          </button>
                        </div>
                      </div>
                    </div>
                  </div>
                ))
              )}
            </div>
          </div>
        </div>
      )}

      <div className="grid xl:grid-cols-[1.5fr_460px] gap-4 h-[calc(100vh-7rem)]">
        {/* ============== PRODUCTS SIDE ============== */}
        <section className="rounded-3xl bg-white border border-slate-200 shadow-sm overflow-hidden flex flex-col">
          {/* Sticky header */}
          <div className="shrink-0 px-5 py-3 border-b border-slate-100 bg-white space-y-3">
            <div className="flex items-center justify-between gap-3">
              <div className="flex items-center gap-2">
                <div className="h-9 w-9 rounded-xl bg-gradient-to-br from-emerald-500 to-emerald-700 flex items-center justify-center shadow-sm">
                  <ShoppingCart className="h-4 w-4 text-white" />
                </div>
                <div>
                  <h2 className="text-base font-extrabold text-slate-900 leading-none">POS Counter</h2>
                  <p className="text-[11px] text-slate-500 flex items-center gap-1 mt-0.5">
                    <Sparkles className="h-2.5 w-2.5 text-amber-500" />
                    {filteredProducts.length} products
                    {hasMore && ` (showing ${visibleProducts.length})`}
                  </p>
                </div>
              </div>

              <div className="flex items-center gap-1.5">
                {heldCarts.length > 0 && (
                  <button
                    onClick={() => setShowHeldCarts(true)}
                    className="h-9 px-2.5 rounded-lg bg-amber-100 hover:bg-amber-200 text-amber-800 text-xs font-bold inline-flex items-center gap-1 relative"
                  >
                    <Pause className="h-3.5 w-3.5" />
                    Held
                    <span className="absolute -top-1 -right-1 h-4 w-4 rounded-full bg-amber-600 text-white text-[9px] font-bold flex items-center justify-center">
                      {heldCarts.length}
                    </span>
                  </button>
                )}

                <button
                  onClick={() => setHidePrices((v) => !v)}
                  className="h-9 w-9 rounded-lg bg-slate-100 hover:bg-slate-200 text-slate-700 flex items-center justify-center"
                  title={hidePrices ? 'Show prices' : 'Hide prices'}
                >
                  {hidePrices ? <EyeOff className="h-3.5 w-3.5" /> : <Eye className="h-3.5 w-3.5" />}
                </button>
              </div>
            </div>

            {/* Search + Barcode in single row */}
            <div className="flex gap-2">
              <div className="relative flex-1">
                <Search className="h-3.5 w-3.5 text-slate-400 absolute left-3 top-1/2 -translate-y-1/2" />
                <input
                  className="h-10 w-full rounded-xl border border-slate-200 bg-slate-50/50 pl-9 pr-9 text-sm focus:outline-none focus:bg-white focus:ring-2 focus:ring-brand-500/20 focus:border-brand-500"
                  placeholder="Search products..."
                  value={search}
                  onChange={(e) => setSearch(e.target.value)}
                />
                {search && (
                  <button
                    onClick={() => setSearch('')}
                    className="absolute right-2 top-1/2 -translate-y-1/2 h-6 w-6 rounded-full hover:bg-slate-200 flex items-center justify-center"
                  >
                    <X className="h-3 w-3 text-slate-500" />
                  </button>
                )}
              </div>

              <form onSubmit={handleBarcodeSubmit} className="flex gap-1.5">
                <div className="relative">
                  <ScanLine className="h-3.5 w-3.5 text-brand-600 absolute left-3 top-1/2 -translate-y-1/2" />
                  <input
                    ref={barcodeRef}
                    className="h-10 w-44 rounded-xl border-2 border-brand-300 bg-brand-50/40 pl-9 pr-3 text-xs font-mono font-bold focus:outline-none focus:ring-2 focus:ring-brand-500/30 focus:border-brand-500"
                    placeholder="Barcode..."
                    value={barcodeInput}
                    onChange={(e) => setBarcodeInput(e.target.value)}
                  />
                </div>
                <button
                  type="button"
                  onClick={() => setScannerOpen(true)}
                  className="h-10 w-10 rounded-xl bg-slate-900 hover:bg-slate-800 text-white flex items-center justify-center"
                  title="Camera scanner"
                >
                  <Camera className="h-3.5 w-3.5" />
                </button>
              </form>
            </div>

            {/* Category filter pills */}
            {categories.length > 0 && (
              <div className="flex gap-1.5 overflow-x-auto pb-1">
                <button
                  onClick={() => setSelectedCategoryId('')}
                  className={`shrink-0 px-3 h-7 rounded-lg text-xs font-bold transition ${
                    !selectedCategoryId
                      ? 'bg-brand-600 text-white shadow'
                      : 'bg-slate-100 text-slate-700 hover:bg-slate-200'
                  }`}
                >
                  All ({products.length})
                </button>
                {categories.map((cat: any) => {
                  const count = categoryCounts[cat.id] || 0;
                  if (count === 0) return null;
                  const active = selectedCategoryId === cat.id;
                  return (
                    <button
                      key={cat.id}
                      onClick={() => setSelectedCategoryId(active ? '' : cat.id)}
                      className={`shrink-0 px-3 h-7 rounded-lg text-xs font-bold inline-flex items-center gap-1.5 transition border-2 ${
                        active ? 'shadow' : 'opacity-70 hover:opacity-100'
                      }`}
                      style={{
                        backgroundColor: active ? cat.color : '#fff',
                        borderColor: active ? cat.color : '#e2e8f0',
                        color: active ? '#fff' : '#475569',
                      }}
                    >
                      <span className="h-1.5 w-1.5 rounded-full" style={{ backgroundColor: active ? '#fff' : cat.color }} />
                      {cat.name} ({count})
                    </button>
                  );
                })}
              </div>
            )}
          </div>

          {/* Scrollable product grid */}
          <div
            ref={scrollRef}
            onScroll={handleScroll}
            className="flex-1 overflow-y-auto p-3"
          >
            {productsLoading ? (
              <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-4 2xl:grid-cols-5 gap-2.5">
                {Array.from({ length: 12 }).map((_, i) => (
                  <div key={i} className="aspect-[3/4] rounded-xl bg-slate-100 animate-pulse" />
                ))}
              </div>
            ) : filteredProducts.length === 0 ? (
              <div className="flex flex-col items-center justify-center py-20 px-6">
                <div className="h-16 w-16 rounded-2xl bg-slate-100 flex items-center justify-center">
                  <Package className="h-8 w-8 text-slate-400" />
                </div>
                <h3 className="mt-3 font-bold text-slate-900">No products found</h3>
                <p className="mt-1 text-xs text-slate-500 text-center max-w-xs">
                  {search ? `No match for "${search}"` : selectedCategoryId ? 'No products in this category' : 'Add products first'}
                </p>
                {(search || selectedCategoryId) && (
                  <button
                    onClick={() => { setSearch(''); setSelectedCategoryId(''); }}
                    className="mt-3 px-3 py-1.5 rounded-lg bg-slate-100 hover:bg-slate-200 text-xs font-bold text-slate-700"
                  >
                    Clear filters
                  </button>
                )}
              </div>
            ) : (
              <>
                <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-4 2xl:grid-cols-5 gap-2.5">
                  {visibleProducts.map((product) => {
                    const inCart = cart.find((c) => c.productId === product.id && !c.variantId && !c.imeiId);
                    const outOfStock = product.stock <= 0;
                    const lowStock = product.stock > 0 && product.stock <= product.lowStockAlert;
                    const primaryImage = product.images?.[0]?.url;
                    const needsImei = productNeedsImei(product);

                    return (
                      <button
                        key={product.id}
                        onClick={() => addProductToCart(product)}
                        disabled={outOfStock}
                        className={`group relative text-left rounded-xl border-2 transition-all overflow-hidden ${
                          outOfStock
                            ? 'border-slate-200 bg-slate-50 opacity-60 cursor-not-allowed'
                            : inCart
                            ? 'border-brand-500 bg-gradient-to-br from-brand-50 to-white shadow-md'
                            : 'border-slate-200 bg-white hover:border-brand-400 hover:shadow-md'
                        }`}
                      >
                        {inCart && (
                          <div className="absolute -top-1.5 -right-1.5 h-6 w-6 rounded-full bg-brand-600 text-white text-[10px] font-bold flex items-center justify-center shadow-lg ring-2 ring-white z-10">
                            {inCart.quantity}
                          </div>
                        )}

                        <div className="aspect-square bg-slate-100 overflow-hidden relative">
                          {primaryImage ? (
                            <img
                              src={primaryImage}
                              alt={product.name}
                              loading="lazy"
                              className="w-full h-full object-cover group-hover:scale-105 transition-transform duration-300"
                            />
                          ) : (
                            <div className="w-full h-full flex items-center justify-center bg-gradient-to-br from-brand-100 to-brand-200">
                              <Package className="h-8 w-8 text-brand-400" />
                            </div>
                          )}

                          {outOfStock ? (
                            <div className="absolute top-1.5 right-1.5 px-1.5 py-0.5 rounded-full text-[9px] font-bold bg-rose-600 text-white shadow">
                              OUT
                            </div>
                          ) : lowStock ? (
                            <div className="absolute top-1.5 right-1.5 px-1.5 py-0.5 rounded-full text-[9px] font-bold bg-amber-500 text-white shadow">
                              LOW
                            </div>
                          ) : null}

                          <div className="absolute bottom-1 left-1 flex gap-1">
                            {product.hasVariants && (
                              <div className="px-1.5 py-0.5 rounded text-[8px] font-bold bg-violet-600 text-white shadow inline-flex items-center gap-0.5">
                                <Layers className="h-2 w-2" />
                                {product.hasVariants ? 'VAR' : ''}
                              </div>
                            )}
                            {needsImei && (
                              <div className="px-1.5 py-0.5 rounded text-[8px] font-bold bg-blue-600 text-white shadow inline-flex items-center gap-0.5">
                                <Smartphone className="h-2 w-2" />
                                IMEI
                              </div>
                            )}
                          </div>
                        </div>

                        <div className="p-2">
                          <div className="font-bold text-slate-900 text-xs line-clamp-2 leading-tight min-h-[2rem]">
                            {product.name}
                          </div>

                          {product.category && (
                            <span
                              className="inline-block mt-1 px-1 py-0.5 rounded text-[8px] font-bold text-white"
                              style={{ backgroundColor: product.category.color }}
                            >
                              {product.category.name}
                            </span>
                          )}

                          <div className="mt-1 flex items-end justify-between">
                            <div className="text-sm font-extrabold text-slate-900 leading-none">
                              {hidePrices ? '••••' : formatPKR(product.price)}
                            </div>
                            <div className="text-[9px] text-slate-500 font-medium">
                              {product.stock.toFixed(product.stock % 1 === 0 ? 0 : 2)} {product.unit}
                            </div>
                          </div>
                        </div>
                      </button>
                    );
                  })}
                </div>

                {hasMore && (
                  <div className="mt-4 text-center">
                    <button
                      onClick={() => setVisibleCount((c) => c + PAGE_SIZE)}
                      className="px-4 py-2 rounded-xl bg-slate-100 hover:bg-slate-200 text-slate-700 text-sm font-bold"
                    >
                      Load more ({filteredProducts.length - visibleCount} remaining)
                    </button>
                  </div>
                )}
              </>
            )}
          </div>
        </section>

        {/* ============== CART SIDE ============== */}
        <aside className="rounded-3xl bg-white border border-slate-200 shadow-sm overflow-hidden flex flex-col">
          <div className="shrink-0 px-5 py-4 border-b border-slate-100 bg-gradient-to-br from-slate-950 to-brand-800 text-white">
            <div className="flex items-center justify-between">
              <div>
                <div className="inline-flex items-center gap-1.5 rounded-full bg-white/15 px-2.5 py-0.5 text-[10px] font-semibold">
                  <Receipt className="h-2.5 w-2.5" />
                  Cart
                </div>
                <h3 className="mt-1.5 text-xl font-bold">
                  {totalItems.toFixed(totalItems % 1 === 0 ? 0 : 2)} items
                </h3>
                <p className="text-[11px] text-white/70 mt-0.5">{cart.length} lines</p>
              </div>
              <div className="flex gap-1.5">
                {cart.length > 0 && (
                  <>
                    <button
                      onClick={holdCurrentCart}
                      className="px-2.5 py-1.5 rounded-lg bg-amber-500/20 hover:bg-amber-500/30 text-amber-200 text-[11px] font-bold transition inline-flex items-center gap-1"
                    >
                      <Pause className="h-3 w-3" /> Hold
                    </button>
                    <button
                      onClick={() => {
                        if (confirm('Clear cart?')) resetCart();
                      }}
                      className="px-2.5 py-1.5 rounded-lg bg-white/15 hover:bg-white/25 text-[11px] font-bold transition"
                    >
                      Clear
                    </button>
                  </>
                )}
              </div>
            </div>
          </div>

          <div className="flex-1 overflow-y-auto">
            {/* Customer */}
            <div className="p-3 border-b border-slate-100 space-y-2">
              <div className="flex items-center justify-between">
                <label className="text-[10px] font-bold uppercase tracking-wider text-slate-500 flex items-center gap-1.5">
                  <User className="h-3 w-3" />
                  Customer / Khata
                </label>
                <button
                  onClick={() => setShowCustomerAdd(true)}
                  className="text-[10px] font-bold text-violet-600 hover:text-violet-700 inline-flex items-center gap-1"
                >
                  <UserPlus className="h-3 w-3" /> Quick Add
                </button>
              </div>

              <div className="relative">
                <User className="h-3.5 w-3.5 text-violet-500 absolute left-3 top-1/2 -translate-y-1/2 pointer-events-none" />
                <select
                  value={customerId}
                  onChange={(e) => setCustomerId(e.target.value)}
                  className="h-10 w-full rounded-xl border border-slate-200 bg-white pl-9 pr-9 text-xs font-medium focus:outline-none focus:ring-2 focus:ring-brand-500/30 appearance-none"
                >
                  <option value="">Walk-in Customer</option>
                  {customers.map((customer) => (
                    <option key={customer.id} value={customer.id}>
                      {customer.name}
                      {customer.phone ? ` • ${customer.phone}` : ''}
                      {customer.balance > 0 ? ` • Udhaar: ${formatPKR(customer.balance)}` : ''}
                    </option>
                  ))}
                </select>
                <ChevronDown className="h-3.5 w-3.5 text-slate-400 absolute right-3 top-1/2 -translate-y-1/2 pointer-events-none" />
              </div>

              {selectedCustomer && customerCreditSummary && (
                <div className="rounded-xl bg-gradient-to-br from-violet-50 via-white to-amber-50 border border-violet-200 overflow-hidden">
                  <div className="p-2 bg-gradient-to-r from-violet-600 to-violet-700 text-white">
                    <div className="flex items-center gap-2">
                      <div className="h-7 w-7 rounded-lg bg-white/20 flex items-center justify-center text-xs font-bold">
                        {selectedCustomer.name.charAt(0).toUpperCase()}
                      </div>
                      <div className="flex-1 min-w-0">
                        <div className="font-bold truncate text-xs">{selectedCustomer.name}</div>
                        {selectedCustomer.phone && (
                          <div className="text-[9px] text-white/80 flex items-center gap-1">
                            <Phone className="h-2 w-2" />
                            {selectedCustomer.phone}
                          </div>
                        )}
                      </div>
                      {customerCreditSummary.currentBalance > 0 && (
                        <div className="text-right">
                          <div className="text-[8px] text-white/70 font-semibold uppercase">Udhaar</div>
                          <div className="text-sm font-extrabold text-amber-300">
                            {formatPKR(customerCreditSummary.currentBalance)}
                          </div>
                        </div>
                      )}
                    </div>
                  </div>

                  <div className="grid grid-cols-3 divide-x divide-violet-100">
                    <div className="p-1.5 text-center">
                      <div className="text-[8px] text-slate-500 font-bold uppercase">Aaj</div>
                      <div className="text-xs font-extrabold text-slate-900">
                        {customerCreditSummary.todaySalesCount}
                      </div>
                    </div>
                    <div className="p-1.5 text-center bg-emerald-50/40">
                      <div className="text-[8px] text-emerald-700 font-bold uppercase flex items-center justify-center gap-0.5">
                        <ArrowDownCircle className="h-2 w-2" />
                        Paid
                      </div>
                      <div className="text-[10px] font-extrabold text-emerald-700">
                        {formatPKR(customerCreditSummary.todayPaid)}
                      </div>
                    </div>
                    <div className="p-1.5 text-center bg-amber-50/40">
                      <div className="text-[8px] text-amber-700 font-bold uppercase flex items-center justify-center gap-0.5">
                        <ArrowUpCircle className="h-2 w-2" />
                        Udhaar
                      </div>
                      <div className="text-[10px] font-extrabold text-amber-700">
                        {formatPKR(customerCreditSummary.todayCredit)}
                      </div>
                    </div>
                  </div>
                </div>
              )}
            </div>

            {/* Cart items */}
            <div className="p-3 space-y-1.5">
              {cart.length === 0 ? (
                <div className="rounded-xl bg-slate-50 border-2 border-dashed border-slate-200 p-6 text-center">
                  <div className="h-12 w-12 rounded-2xl bg-white mx-auto flex items-center justify-center">
                    <ShoppingCart className="h-6 w-6 text-slate-400" />
                  </div>
                  <p className="mt-2 font-bold text-slate-700 text-sm">Cart empty</p>
                  <p className="text-[10px] text-slate-500 mt-0.5">Click products or scan barcode</p>
                </div>
              ) : (
                cart.map((item) => {
                  const isEditing = editingLine === item.cartLineId;
                  const unitPrice = item.priceOverride ?? (item.useWholesale ? (item.wholesalePrice ?? item.basePrice) : item.basePrice);
                  const lineTotal = unitPrice * item.quantity - (item.lineDiscount || 0);
                  const canUseLW = LW_UNITS.has(item.unit);

                  return (
                    <div
                      key={item.cartLineId}
                      className={`rounded-xl border transition ${
                        isEditing
                          ? 'border-brand-400 bg-brand-50/40 shadow'
                          : 'border-slate-200 bg-white hover:border-brand-300'
                      }`}
                    >
                      <div className="p-2 flex items-start gap-2">
                        <div className="h-10 w-10 rounded-lg bg-slate-100 overflow-hidden flex items-center justify-center shrink-0">
                          {item.variantImage ? (
                            <img src={item.variantImage} alt={item.name} className="h-full w-full object-cover" />
                          ) : item.variantColorHex ? (
                            <div className="h-full w-full" style={{ backgroundColor: item.variantColorHex }} />
                          ) : (
                            <Package className="h-4 w-4 text-slate-400" />
                          )}
                        </div>

                        <div className="flex-1 min-w-0">
                          <div className="font-bold text-slate-900 text-xs line-clamp-1">{item.name}</div>
                          {item.variantName && (
                            <div className="flex items-center gap-1 mt-0.5">
                              {item.variantColorHex && (
                                <span
                                  className="h-2 w-2 rounded-full border border-slate-300"
                                  style={{ backgroundColor: item.variantColorHex }}
                                />
                              )}
                              <span className="text-[10px] font-semibold text-violet-700">
                                {item.variantName}
                              </span>
                            </div>
                          )}
                          {item.imeiNumber && (
                            <div className="text-[10px] text-blue-700 mt-0.5 font-mono font-bold inline-flex items-center gap-1">
                              <Smartphone className="h-2.5 w-2.5" />
                              {item.imeiNumber}
                            </div>
                          )}
                          <div className="text-[10px] text-slate-500 mt-0.5">
                            {hidePrices ? '••••' : formatPKR(unitPrice)} × {item.quantity.toFixed(item.quantity % 1 === 0 ? 0 : 2)} {item.unit}
                            {item.useWholesale && <span className="ml-1 text-amber-700 font-bold">(W)</span>}
                            {item.priceOverride !== undefined && <span className="ml-1 text-blue-700 font-bold">(Custom)</span>}
                          </div>
                          {item.note && !item.imeiNumber && (
                            <div className="text-[9px] text-emerald-700 mt-0.5 font-semibold flex items-center gap-1">
                              <Ruler className="h-2 w-2" />
                              {item.note}
                            </div>
                          )}
                          {item.lineDiscount > 0 && (
                            <div className="text-[9px] text-rose-600 mt-0.5 font-semibold inline-flex items-center gap-1">
                              <Tag className="h-2 w-2" />
                              -{formatPKR(item.lineDiscount)}
                            </div>
                          )}
                        </div>

                        <div className="text-right shrink-0">
                          <div className="font-extrabold text-slate-900 text-xs">
                            {hidePrices ? '••••' : formatPKR(lineTotal)}
                          </div>
                          <div className="flex gap-0.5 mt-1 justify-end">
                            {!item.imeiId && (
                              <button
                                onClick={() => setEditingLine(isEditing ? null : item.cartLineId)}
                                className={`h-5 w-5 rounded-md flex items-center justify-center transition ${
                                  isEditing
                                    ? 'bg-brand-600 text-white'
                                    : 'bg-slate-100 hover:bg-brand-100 text-slate-600 hover:text-brand-700'
                                }`}
                              >
                                <Edit3 className="h-2.5 w-2.5" />
                              </button>
                            )}
                            <button
                              onClick={() => removeCartLine(item.cartLineId)}
                              className="h-5 w-5 rounded-md bg-rose-50 hover:bg-rose-100 text-rose-600 flex items-center justify-center"
                            >
                              <Trash2 className="h-2.5 w-2.5" />
                            </button>
                          </div>
                        </div>
                      </div>

                      {!item.imeiId && (
                        <div className="px-2 pb-2 flex items-center justify-between gap-2">
                          <div className="inline-flex items-center gap-1 bg-slate-50 rounded-lg p-0.5">
                            <button
                              onClick={() => setLineQuantity(item.cartLineId, item.quantity - 1)}
                              className="h-6 w-6 rounded-md bg-white border border-slate-200 hover:bg-slate-100 flex items-center justify-center"
                            >
                              <Minus className="h-2.5 w-2.5" />
                            </button>
                            <input
                              type="number"
                              step="0.01"
                              min="0.01"
                              value={item.quantity}
                              onChange={(e) => {
                                const val = parseFloat(e.target.value);
                                if (!isNaN(val) && val > 0 && val <= item.stock) {
                                  updateCartLine(item.cartLineId, { quantity: val });
                                }
                              }}
                              className="w-14 text-center font-bold text-xs bg-transparent border-0 focus:outline-none"
                            />
                            <button
                              onClick={() => setLineQuantity(item.cartLineId, item.quantity + 1)}
                              disabled={item.quantity >= item.stock}
                              className="h-6 w-6 rounded-md bg-brand-600 hover:bg-brand-700 disabled:bg-slate-300 text-white flex items-center justify-center"
                            >
                              <Plus className="h-2.5 w-2.5" />
                            </button>
                          </div>

                          {canUseLW && (
                            <button
                              onClick={() => setLwOpen(item)}
                              className="px-2 py-0.5 rounded-md bg-gradient-to-r from-brand-600 to-emerald-600 text-white text-[9px] font-bold inline-flex items-center gap-1 shadow-sm"
                            >
                              <Ruler className="h-2.5 w-2.5" />
                              L×W
                            </button>
                          )}
                        </div>
                      )}

                      {isEditing && !item.imeiId && (
                        <div className="border-t border-brand-200 bg-brand-50/30 p-2 space-y-1.5">
                          {item.wholesalePrice && (
                            <label className="flex items-center justify-between gap-2 text-[10px] cursor-pointer">
                              <span className="font-bold text-slate-700">Use wholesale</span>
                              <input
                                type="checkbox"
                                checked={item.useWholesale}
                                onChange={(e) => updateCartLine(item.cartLineId, { useWholesale: e.target.checked, priceOverride: undefined })}
                                className="h-3 w-3 rounded"
                              />
                            </label>
                          )}

                          <div className="grid grid-cols-2 gap-1.5">
                            <div>
                              <label className="block text-[9px] font-bold text-slate-600 mb-0.5">Custom price</label>
                              <input
                                type="number"
                                step="0.01"
                                placeholder={String(item.basePrice)}
                                value={item.priceOverride ?? ''}
                                onChange={(e) => {
                                  const val = e.target.value === '' ? undefined : parseFloat(e.target.value);
                                  updateCartLine(item.cartLineId, { priceOverride: val });
                                }}
                                className="h-7 w-full rounded-md border border-slate-200 px-1.5 text-xs font-bold"
                              />
                            </div>
                            <div>
                              <label className="block text-[9px] font-bold text-slate-600 mb-0.5">Line discount</label>
                              <input
                                type="number"
                                step="0.01"
                                min="0"
                                value={item.lineDiscount || ''}
                                onChange={(e) => updateCartLine(item.cartLineId, { lineDiscount: parseFloat(e.target.value) || 0 })}
                                className="h-7 w-full rounded-md border border-slate-200 px-1.5 text-xs font-bold"
                              />
                            </div>
                          </div>

                          <input
                            type="text"
                            value={item.note ?? ''}
                            onChange={(e) => updateCartLine(item.cartLineId, { note: e.target.value })}
                            placeholder="Note (optional)"
                            className="h-7 w-full rounded-md border border-slate-200 px-1.5 text-xs"
                          />

                          <button
                            onClick={() => setEditingLine(null)}
                            className="w-full h-7 rounded-md bg-brand-600 hover:bg-brand-700 text-white text-[10px] font-bold"
                          >
                            Done
                          </button>
                        </div>
                      )}
                    </div>
                  );
                })
              )}
            </div>
          </div>

          {/* Bottom checkout */}
          {cart.length > 0 && (
            <div className="shrink-0 border-t border-slate-200 bg-gradient-to-br from-slate-50 to-white p-3 space-y-2.5">
              <div>
                <label className="text-[9px] font-bold uppercase tracking-wider text-slate-500 mb-1 flex items-center gap-1">
                  <Percent className="h-2.5 w-2.5" />
                  Global Discount
                </label>
                <input
                  type="number"
                  step="0.01"
                  min="0"
                  value={globalDiscount}
                  onChange={(e) => setGlobalDiscount(e.target.value)}
                  placeholder="0"
                  className="h-9 w-full rounded-lg border border-slate-200 px-2.5 text-xs font-bold"
                />
              </div>

              <div>
                <label className="text-[9px] font-bold uppercase tracking-wider text-slate-500 mb-1 flex items-center gap-1">
                  <BookOpen className="h-2.5 w-2.5" />
                  Sale Mode
                </label>
                <div className="grid grid-cols-3 gap-1">
                  <button
                    onClick={() => {
                      setSaleMode('FULL_PAYMENT');
                      setPaidAmount('');
                    }}
                    className={`flex flex-col items-center gap-0.5 p-1.5 rounded-lg border-2 transition ${
                      saleMode === 'FULL_PAYMENT'
                        ? 'border-emerald-500 bg-emerald-50'
                        : 'bg-white border-slate-200 hover:border-emerald-300'
                    }`}
                  >
                    <Banknote className={`h-3 w-3 ${saleMode === 'FULL_PAYMENT' ? 'text-emerald-600' : 'text-slate-400'}`} />
                    <span className={`text-[9px] font-bold ${saleMode === 'FULL_PAYMENT' ? 'text-emerald-700' : 'text-slate-500'}`}>
                      Full Cash
                    </span>
                  </button>
                  <button
                    onClick={() => {
                      if (!customerId) {
                        toast.error('Pehle customer select karein');
                        return;
                      }
                      setSaleMode('PARTIAL_CREDIT');
                      setPaidAmount(String(Math.floor(total / 2)));
                    }}
                    disabled={!customerId}
                    className={`flex flex-col items-center gap-0.5 p-1.5 rounded-lg border-2 transition ${
                      saleMode === 'PARTIAL_CREDIT'
                        ? 'border-amber-500 bg-amber-50'
                        : !customerId
                        ? 'bg-slate-50 border-slate-200 opacity-50 cursor-not-allowed'
                        : 'bg-white border-slate-200 hover:border-amber-300'
                    }`}
                  >
                    <HandCoins className={`h-3 w-3 ${saleMode === 'PARTIAL_CREDIT' ? 'text-amber-600' : 'text-slate-400'}`} />
                    <span className={`text-[9px] font-bold ${saleMode === 'PARTIAL_CREDIT' ? 'text-amber-700' : 'text-slate-500'}`}>
                      Partial
                    </span>
                  </button>
                  <button
                    onClick={() => {
                      if (!customerId) {
                        toast.error('Pehle customer select karein');
                        return;
                      }
                      setSaleMode('FULL_CREDIT');
                      setPaidAmount('0');
                    }}
                    disabled={!customerId}
                    className={`flex flex-col items-center gap-0.5 p-1.5 rounded-lg border-2 transition ${
                      saleMode === 'FULL_CREDIT'
                        ? 'border-rose-500 bg-rose-50'
                        : !customerId
                        ? 'bg-slate-50 border-slate-200 opacity-50 cursor-not-allowed'
                        : 'bg-white border-slate-200 hover:border-rose-300'
                    }`}
                  >
                    <BookOpen className={`h-3 w-3 ${saleMode === 'FULL_CREDIT' ? 'text-rose-600' : 'text-slate-400'}`} />
                    <span className={`text-[9px] font-bold ${saleMode === 'FULL_CREDIT' ? 'text-rose-700' : 'text-slate-500'}`}>
                      Full Udhaar
                    </span>
                  </button>
                </div>
              </div>

              {saleMode !== 'FULL_CREDIT' && (
                <div>
                  <label className="text-[9px] font-bold uppercase tracking-wider text-slate-500 mb-1 block">
                    Payment Method
                  </label>
                  <div className="grid grid-cols-5 gap-1">
                    {(Object.keys(paymentMethodConfig) as PaymentMethod[]).map((m) => {
                      const cfg = paymentMethodConfig[m];
                      const Icon = cfg.icon;
                      const active = paymentMethod === m;
                      return (
                        <button
                          key={m}
                          onClick={() => setPaymentMethod(m)}
                          className={`flex flex-col items-center gap-0.5 p-1.5 rounded-lg border-2 transition ${
                            active ? `${cfg.bg}` : 'bg-white border-slate-200 hover:border-slate-300'
                          }`}
                        >
                          <Icon className="h-3 w-3" style={{ color: active ? cfg.color : '#94a3b8' }} />
                          <span className={`text-[9px] font-bold ${active ? 'text-slate-900' : 'text-slate-500'}`}>
                            {cfg.label}
                          </span>
                        </button>
                      );
                    })}
                  </div>
                </div>
              )}

              {saleMode === 'PARTIAL_CREDIT' && (
                <div>
                  <label className="text-[9px] font-bold uppercase tracking-wider text-amber-700 mb-1 block">
                    Paid Amount
                  </label>
                  <div className="relative">
                    <Wallet className="h-3.5 w-3.5 text-amber-500 absolute left-2.5 top-1/2 -translate-y-1/2" />
                    <input
                      type="number"
                      step="0.01"
                      value={paidAmount}
                      onChange={(e) => setPaidAmount(e.target.value)}
                      placeholder="0"
                      max={total - 0.01}
                      className="h-10 w-full rounded-lg border-2 border-amber-300 bg-amber-50 pl-8 pr-3 text-sm font-bold focus:outline-none focus:ring-2 focus:ring-amber-500/40"
                    />
                  </div>
                  {quickAmounts.length > 0 && (
                    <div className="grid grid-cols-4 gap-1 mt-1">
                      {quickAmounts.map((amt, idx) => (
                        <button
                          key={`${idx}-${amt}`}
                          onClick={() => setPaidAmount(String(amt))}
                          className="py-1 rounded-md bg-amber-100 hover:bg-amber-200 text-[9px] font-bold text-amber-800"
                        >
                          {formatPKR(amt)}
                        </button>
                      ))}
                    </div>
                  )}
                </div>
              )}

              <div className={`rounded-xl p-3 space-y-1.5 text-white ${
                saleMode === 'FULL_CREDIT'
                  ? 'bg-gradient-to-br from-rose-700 to-rose-900'
                  : saleMode === 'PARTIAL_CREDIT'
                  ? 'bg-gradient-to-br from-amber-700 to-orange-900'
                  : 'bg-gradient-to-br from-slate-950 to-brand-900'
              }`}>
                <div className="flex items-center justify-between text-xs">
                  <span className="text-white/70">Subtotal</span>
                  <span className="font-semibold">{formatPKR(subtotal)}</span>
                </div>

                {totalDiscount > 0 && (
                  <div className="flex items-center justify-between text-[10px]">
                    <span className="text-amber-300">Discount</span>
                    <span className="font-bold text-amber-300">-{formatPKR(totalDiscount)}</span>
                  </div>
                )}

                <div className="flex items-center justify-between pt-1.5 border-t border-white/10">
                  <span className="text-sm font-bold">Total</span>
                  <span className="text-xl font-extrabold">{formatPKR(total)}</span>
                </div>

                {saleMode !== 'FULL_CREDIT' && (
                  <div className="flex items-center justify-between text-[10px] pt-1.5 border-t border-white/10">
                    <span className="text-emerald-300 font-semibold flex items-center gap-1">
                      <ArrowDownCircle className="h-2.5 w-2.5" /> Paid
                    </span>
                    <span className="font-bold text-emerald-300">{formatPKR(effectivePaid)}</span>
                  </div>
                )}

                {change > 0 && (
                  <div className="flex items-center justify-between text-[10px] pt-1.5 border-t border-white/10">
                    <span className="text-emerald-300 font-semibold flex items-center gap-1">
                      <TrendingDown className="h-2.5 w-2.5" /> Change
                    </span>
                    <span className="font-bold text-emerald-300">{formatPKR(change)}</span>
                  </div>
                )}

                {credit > 0 && (
                  <div className="flex items-center justify-between text-sm pt-1.5 border-t border-white/20 bg-white/5 -mx-3 -mb-3 px-3 py-2">
                    <span className="text-amber-300 font-bold flex items-center gap-1">
                      <BookOpen className="h-3 w-3" />
                      Khata Add
                    </span>
                    <span className="font-extrabold text-amber-300 text-base">{formatPKR(credit)}</span>
                  </div>
                )}
              </div>

              {credit > 0 && !customerId && (
                <div className="rounded-lg bg-amber-50 border border-amber-300 p-2 flex items-start gap-1.5">
                  <AlertCircle className="h-3 w-3 text-amber-600 mt-0.5" />
                  <p className="text-[10px] text-amber-900 font-bold">Customer required for credit</p>
                </div>
              )}

              <Button
                className={`w-full ${
                  saleMode === 'FULL_CREDIT'
                    ? 'bg-rose-600 hover:bg-rose-700'
                    : saleMode === 'PARTIAL_CREDIT'
                    ? 'bg-amber-600 hover:bg-amber-700'
                    : ''
                }`}
                onClick={handleCheckout}
                loading={checkoutMutation.isPending}
                disabled={isCreditSale && !customerId}
              >
                <CheckCircle2 className="h-4 w-4" />
                {saleMode === 'FULL_CREDIT'
                  ? `Add to Khata • ${formatPKR(total)}`
                  : saleMode === 'PARTIAL_CREDIT'
                  ? `Confirm (${formatPKR(credit)} udhaar)`
                  : `Complete Sale • ${formatPKR(total)}`}
              </Button>
            </div>
          )}
        </aside>
      </div>
    </>
  );
}
