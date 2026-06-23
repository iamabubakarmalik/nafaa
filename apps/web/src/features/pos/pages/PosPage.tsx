import { useEffect, useMemo, useRef, useState, useCallback } from 'react';
import { useQuery, useQueryClient, useMutation } from '@tanstack/react-query';
import {
  Search, ShoppingCart, Receipt, ScanLine, Camera, Package, User,
  X, Sparkles, BookOpen, Phone, ArrowDownCircle, ArrowUpCircle,
  Pause, Layers, UserPlus, Eye, EyeOff, ChevronDown, Smartphone, Scissors,
  Zap, Store, AlertTriangle, TrendingUp, Star, ArrowRight, Crown,
  CheckCircle2, Plus, Minus,
} from 'lucide-react';
import { productsApi, type Product } from '@/api/products.api';
import { productVariantsApi, type ProductVariant } from '@/api/product-variants.api';
import { customersApi } from '@/api/customers.api';
import { categoriesApi } from '@/api/categories.api';
import type { PaymentMethod } from '@/api/sales.api';
import { Button } from '@/components/ui/Button';
import { formatPKR } from '@/lib/format';
import { toast } from 'sonner';
import BarcodeScanner from '@/components/barcode/BarcodeScanner';
import { LengthWidthCalculator } from '../components/LengthWidthCalculator';
import { VariantPicker } from '../components/VariantPicker';
import { CarpetRollPicker } from '../components/CarpetRollPicker';
import { CarpetCutPiecePicker } from '../components/CarpetCutPiecePicker';
import { PosHeldCartsModal } from '../components/PosHeldCartsModal';
import { PosCartLine } from '../components/PosCartLine';
import { PosCheckoutPanel } from '../components/PosCheckoutPanel';
import { useBusinessFeatures } from '@/hooks/useBusinessFeatures';
import { useAuthStore } from '@/store/auth.store';
import { ImeiPickerModal } from '@/features/industries/mobile/components/ImeiPickerModal';
import { QuickEmiFromSaleModal } from '@/features/industries/mobile/emi/components/QuickEmiFromSaleModal';
import type { ProductImei } from '@/features/industries/mobile/api/imei.api';
import { usePosCheckout } from '../hooks/usePosCheckout';
import { carpetRollsApi } from '@/features/industries/carpet/api/carpet-rolls.api';
import {
  type CartItem, type HeldCart, type SaleMode,
  CARPET_UNITS, MOBILE_KEYWORDS, PAGE_SIZE,
  loadHeldCarts, saveHeldCarts, cartLineId,
} from '../components/pos-types';

export default function PosPage() {
  const queryClient = useQueryClient();
  const { features: businessFeatures, businessType } = useBusinessFeatures();
  const currentShopId = useAuthStore((s) => s.currentShopId);
  const tenant = useAuthStore((s) => s.tenant);

  // ─── Carpet business detection ─────────────────────────────
  const isCarpetBusiness = useMemo(() => {
    const type = (businessType ?? '').toUpperCase();
    return type === 'CARPET' || type === 'FLOORING' || businessFeatures?.lengthWidthCalc === true;
  }, [businessType, businessFeatures]);

  const isMobileBusiness = useMemo(() => {
    const type = (businessType ?? '').toUpperCase();
    return type === 'MOBILE' || type === 'PHONE' || type === 'ELECTRONICS' || businessFeatures?.imei === true;
  }, [businessType, businessFeatures]);

  // ─── State ─────────────────────────────────────────────────
  const [search, setSearch] = useState('');
  const [debouncedSearch, setDebouncedSearch] = useState('');
  const [selectedCategoryId, setSelectedCategoryId] = useState('');
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
  const [carpetPickerData, setCarpetPickerData] = useState<{ product: Product; variant?: ProductVariant } | null>(null);
  const [cutPiecePickerData, setCutPiecePickerData] = useState<{ product: Product; variant?: ProductVariant } | null>(null);
  const [editingLine, setEditingLine] = useState<string | null>(null);
  const [heldCarts, setHeldCarts] = useState<HeldCart[]>([]);
  const [showHeldCarts, setShowHeldCarts] = useState(false);
  const [showCustomerAdd, setShowCustomerAdd] = useState(false);
  const [newCustomer, setNewCustomer] = useState({ name: '', phone: '' });
  const [hidePrices, setHidePrices] = useState(false);
  const [imeiPickerData, setImeiPickerData] = useState<{ product: Product; variant?: ProductVariant } | null>(null);
  const [emiPromptData, setEmiPromptData] = useState<{
    saleId: string;
    saleNumber: string;
    total: number;
    paidAmount: number;
    customerId: string;
    customerName: string;
    customerPhone?: string;
  } | null>(null);
  const barcodeRef = useRef<HTMLInputElement>(null);
  const scrollRef = useRef<HTMLDivElement>(null);

  // ─── Debounce ──────────────────────────────────────────────
  useEffect(() => {
    const t = setTimeout(() => setDebouncedSearch(search), 200);
    return () => clearTimeout(t);
  }, [search]);

  useEffect(() => {
    setVisibleCount(PAGE_SIZE);
    if (scrollRef.current) scrollRef.current.scrollTop = 0;
  }, [debouncedSearch, selectedCategoryId]);

  // ─── Queries ───────────────────────────────────────────────
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

  // ─── Carpet stock summary for POS cards ───────────────────
  const productIds = useMemo(() => products.map((p) => p.id), [products]);
  const { data: carpetSummary = [] } = useQuery({
    queryKey: ['carpet-product-summary-pos', productIds],
    queryFn: () => carpetRollsApi.productSummary(productIds),
    enabled: isCarpetBusiness && productIds.length > 0,
  });
  const carpetSummaryMap = useMemo(() => {
    const map = new Map<string, any>();
    for (const s of carpetSummary) map.set(s.productId, s);
    return map;
  }, [carpetSummary]);

  useEffect(() => { setHeldCarts(loadHeldCarts()); }, []);

  // ─── Filters ───────────────────────────────────────────────
  const filteredProducts = useMemo(() => {
    let list = products;
    if (selectedCategoryId) list = list.filter((p) => p.categoryId === selectedCategoryId);
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

  const categoryCounts = useMemo(() => {
    const counts: Record<string, number> = {};
    products.forEach((p) => {
      if (p.categoryId) counts[p.categoryId] = (counts[p.categoryId] || 0) + 1;
    });
    return counts;
  }, [products]);

  // ─── Detection helpers ─────────────────────────────────────
  const productNeedsImei = useCallback(
    (product: Product) => {
      if (!businessFeatures.imei) return false;
      const name = product.name.toLowerCase();
      const category = (product.category?.name || '').toLowerCase();
      return MOBILE_KEYWORDS.some((kw) => name.includes(kw) || category.includes(kw));
    },
    [businessFeatures.imei],
  );

  const isCarpetProduct = useCallback(
    (product: Product) => isCarpetBusiness && CARPET_UNITS.has(product.unit),
    [isCarpetBusiness],
  );

  // ─── Cart calculations ─────────────────────────────────────
  const totalItems = useMemo(
    () => cart.reduce((sum, item) => sum + item.quantity, 0),
    [cart],
  );
  const selectedCustomer = customers.find((c) => c.id === customerId);

  const customerCreditSummary = useMemo(() => {
    if (!customerDetail) return null;
    const sales = (customerDetail as any).sales || [];
    const today = new Date().toDateString();
    const todaySales = sales.filter((s: any) => new Date(s.createdAt).toDateString() === today);
    return {
      currentBalance: customerDetail.balance || 0,
      todaySalesCount: todaySales.length,
      todayCredit: todaySales.reduce((sum: number, s: any) => sum + (s.creditAmount || 0), 0),
      todayPaid: todaySales.reduce((sum: number, s: any) => sum + (s.paidAmount || 0), 0),
    };
  }, [customerDetail]);

  // ─── Mutations ─────────────────────────────────────────────
  const checkoutMutation = usePosCheckout((result) => {
    const hasImeiItem = cart.some((c) => c.imeiId);
    const shouldOfferEmi =
      hasImeiItem &&
      result.customerId &&
      result.customerName &&
      result.credit > 0 &&
      result.total > 0;

    if (shouldOfferEmi) {
      setEmiPromptData({
        saleId: result.saleId,
        saleNumber: result.saleNumber,
        total: result.total,
        paidAmount: result.paidAmount,
        customerId: result.customerId!,
        customerName: result.customerName!,
        customerPhone: result.customerPhone ?? undefined,
      });
    }

    resetCart();
    barcodeRef.current?.focus();
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

  // ─── Add product to cart (smart routing) ───────────────────
  const addProductToCart = async (product: Product) => {
    const isCarpet = isCarpetProduct(product);

    if (!isCarpet && product.stock <= 0) {
      toast.error(`${product.name} stock mein nahi hai`);
      return;
    }

    if (isCarpet) {
      const summary = carpetSummaryMap.get(product.id);
      if (!summary || summary.totalSqft <= 0) {
        toast.error(`${product.name}: koi active roll nahi hai`);
        return;
      }

      if (product.hasVariants) {
        try {
          const variants = await productVariantsApi.list(product.id);
          const active = variants.filter((v) => v.isActive);
          if (active.length === 0) {
            toast.error('No active variants for this carpet');
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
      setCarpetPickerData({ product });
      return;
    }

    if (product.hasVariants) {
      try {
        const variants = await productVariantsApi.list(product.id);
        const active = variants.filter((v) => v.isActive);
        if (active.length === 0) {
          toast.error('No active variants');
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

    if (productNeedsImei(product)) {
      setImeiPickerData({ product });
      return;
    }

    addToCart(product, null);
  };

  const addToCart = (
    product: Product,
    variant: ProductVariant | null,
    extras?: { imeiId?: string; imeiNumber?: string },
  ) => {
    const variantId = variant?.id;

    if (extras?.imeiId) {
      setCart((prev) => [
        ...prev,
        {
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
          stock: 1,
          quantity: 1,
          unit: variant?.unit ?? product.unit,
          category: product.category,
          useWholesale: false,
          lineDiscount: 0,
          note: `IMEI: ${extras.imeiNumber}`,
        },
      ]);
      toast.success(`${product.name} added with IMEI ${extras.imeiNumber}`);
      return;
    }

    const existingIndex = cart.findIndex(
      (item) =>
        item.productId === product.id &&
        item.variantId === variantId &&
        !item.imeiId &&
        !item.rollId &&
        !item.cutPieceId &&
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
        prev.map((item, i) => (i === existingIndex ? { ...item, quantity: item.quantity + 1 } : item)),
      );
      return;
    }

    setCart((prev) => [
      ...prev,
      {
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
      },
    ]);
    toast.success(`${product.name}${variant ? ` (${variant.name})` : ''} added`);
  };

  // ─── Variant Picker handler ────────────────────────────────
  const handleVariantSelect = (variant: ProductVariant) => {
    if (!variantPickerProduct) return;

    if (isCarpetProduct(variantPickerProduct)) {
      setCarpetPickerData({ product: variantPickerProduct, variant });
      setVariantPickerProduct(null);
      setVariantPickerData([]);
      return;
    }

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

  // ─── Carpet roll cut handler ───────────────────────────────
  const handleCarpetRollConfirm = (data: {
    roll: any;
    customerWidthFt: number;
    lengthFt: number;
    cutSqft: number;
    pricePerSqft: number;
    totalPrice: number;
    createLeftover: boolean;
    isCustomRate?: boolean;
    originalRate?: number;
  }) => {
    if (!carpetPickerData) return;
    const { product, variant } = carpetPickerData;
    const { roll } = data;

    const rollFullWidth = Number(roll.widthFt) + Number(roll.widthInch || 0) / 12;

    let note = `Cut from ${roll.rollNumber}: ${data.customerWidthFt}ft × ${data.lengthFt}ft = ${data.cutSqft.toFixed(2)} sqft`;
    if (data.isCustomRate && data.originalRate && data.originalRate !== data.pricePerSqft) {
      note += ` @ Rs ${data.pricePerSqft.toFixed(2)}/sqft (Custom)`;
    }

    setCart((prev) => [
      ...prev,
      {
        cartLineId: cartLineId(),
        productId: product.id,
        variantId: variant?.id,
        rollId: roll.id,
        rollNumber: roll.rollNumber,
        cutWidthFt: data.customerWidthFt,
        cutLengthFt: data.lengthFt,
        cutSqft: data.cutSqft,
        createLeftover: data.createLeftover,
        rollCustomerWidthFt: data.customerWidthFt,
        rollFullWidthFt: rollFullWidth,
        name: product.name,
        variantName: variant?.name,
        variantImage: variant?.imageUrl ?? undefined,
        variantColor: variant?.color ?? undefined,
        variantColorHex: variant?.colorHex ?? undefined,
        basePrice: data.pricePerSqft,
        wholesalePrice: roll.wholesalePricePerSqft ?? null,
        stock: data.cutSqft,
        quantity: data.cutSqft,
        unit: product.unit,
        category: product.category,
        useWholesale: false,
        priceOverride: data.pricePerSqft,
        lineDiscount: 0,
        note,
      },
    ]);

    const rateText = data.isCustomRate
      ? ` @ Rs ${data.pricePerSqft.toFixed(2)}/sqft`
      : '';
    toast.success(`${roll.rollNumber} se ${data.cutSqft.toFixed(2)} sqft cut added${rateText}`);
    setCarpetPickerData(null);
  };

  // ─── Carpet cut piece handler ──────────────────────────────
  const handleCutPieceSelect = (piece: any) => {
    if (!cutPiecePickerData) return;
    const { product, variant } = cutPiecePickerData;

    setCart((prev) => [
      ...prev,
      {
        cartLineId: cartLineId(),
        productId: product.id,
        variantId: variant?.id,
        cutPieceId: piece.id,
        cutPieceCode: piece.pieceCode,
        cutSqft: piece.totalSqft,
        name: product.name,
        variantName: variant?.name,
        variantImage: variant?.imageUrl ?? undefined,
        variantColor: variant?.color ?? undefined,
        variantColorHex: variant?.colorHex ?? undefined,
        basePrice: piece.salePrice,
        wholesalePrice: null,
        stock: piece.totalSqft,
        quantity: piece.totalSqft,
        unit: product.unit,
        category: product.category,
        useWholesale: false,
        priceOverride: piece.salePrice / Math.max(piece.totalSqft, 0.01),
        lineDiscount: 0,
        note: `Cut piece ${piece.pieceCode} • ${piece.widthFt}ft × ${piece.lengthFt}ft`,
      },
    ]);

    toast.success(`Cut piece ${piece.pieceCode} added`);
    setCutPiecePickerData(null);
  };

  const handleImeiSelect = (imei: ProductImei) => {
    if (!imeiPickerData) return;
    addToCart(imeiPickerData.product, imeiPickerData.variant || null, {
      imeiId: imei.id,
      imeiNumber: imei.imei1,
    });
    setImeiPickerData(null);
  };

  // ─── Cart utilities ────────────────────────────────────────
  const updateCartLine = (lineId: string, patch: Partial<CartItem>) => {
    setCart((prev) =>
      prev.map((item) => (item.cartLineId === lineId ? { ...item, ...patch } : item)),
    );
  };

  const removeCartLine = (lineId: string) => {
    setCart((prev) => prev.filter((item) => item.cartLineId !== lineId));
  };

  const setLineQuantity = (lineId: string, qty: number) => {
    const item = cart.find((i) => i.cartLineId === lineId);
    if (!item) return;
    if (item.imeiId || item.rollId || item.cutPieceId) {
      toast.error('Fixed quantity item');
      return;
    }
    if (qty < 0.01) {
      removeCartLine(lineId);
      return;
    }
    if (qty > item.stock) {
      toast.error(`Stock available: ${item.stock} ${item.unit}`);
      return;
    }
    updateCartLine(lineId, { quantity: Number(qty.toFixed(2)) });
  };

  // ─── Barcode handlers ──────────────────────────────────────
  const handleBarcodeScan = async (code: string) => {
    setScannerOpen(false);
    if (!code.trim()) return;
    try {
      const product = await productsApi.byBarcode(code.trim());
      if ((product as any).matchedVariant) {
        const variant = (product as any).matchedVariant as ProductVariant;
        if (isCarpetProduct(product)) {
          setCarpetPickerData({ product, variant });
        } else if (productNeedsImei(product)) {
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

  useEffect(() => { barcodeRef.current?.focus(); }, []);

  useEffect(() => {
    if (!customerId && (saleMode === 'PARTIAL_CREDIT' || saleMode === 'FULL_CREDIT')) {
      setSaleMode('FULL_PAYMENT');
      setPaidAmount('');
    }
  }, [customerId, saleMode]);

  const handleScroll = useCallback(
    (e: React.UIEvent<HTMLDivElement>) => {
      const target = e.currentTarget;
      if (!hasMore) return;
      const scrolledRatio = (target.scrollTop + target.clientHeight) / target.scrollHeight;
      if (scrolledRatio > 0.85) {
        setVisibleCount((c) => Math.min(c + PAGE_SIZE, filteredProducts.length));
      }
    },
    [hasMore, filteredProducts.length],
  );

  // ─── Checkout ──────────────────────────────────────────────
  const handleCheckout = () => {
    if (cart.length === 0) {
      toast.error('Cart khaali hai');
      return;
    }
    if (!currentShopId) {
      toast.error('Pehle top-bar se shop select karein');
      return;
    }

    const subtotal = cart.reduce((sum, item) => {
      const unitPrice =
        item.priceOverride ?? (item.useWholesale ? (item.wholesalePrice ?? item.basePrice) : item.basePrice);
      return sum + unitPrice * item.quantity;
    }, 0);
    const totalLineDiscount = cart.reduce((sum, item) => sum + (item.lineDiscount || 0), 0);
    const gDiscount = Number(globalDiscount) || 0;
    const total = Math.max(subtotal - totalLineDiscount - gDiscount, 0);
    const effectivePaid =
      saleMode === 'FULL_PAYMENT' ? total : saleMode === 'FULL_CREDIT' ? 0 : Number(paidAmount || 0);
    const credit = Math.max(total - effectivePaid, 0);

    if (credit > 0 && !customerId) {
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
      shopId: currentShopId,
      customerId,
      paymentMethod,
      paidAmount: effectivePaid,
      discount: gDiscount,
      cart,
    });
  };

  // ─── Held carts ────────────────────────────────────────────
  const total = useMemo(() => {
    const subtotal = cart.reduce((sum, item) => {
      const unitPrice =
        item.priceOverride ?? (item.useWholesale ? (item.wholesalePrice ?? item.basePrice) : item.basePrice);
      return sum + unitPrice * item.quantity;
    }, 0);
    const totalLineDiscount = cart.reduce((sum, item) => sum + (item.lineDiscount || 0), 0);
    return Math.max(subtotal - totalLineDiscount - (Number(globalDiscount) || 0), 0);
  }, [cart, globalDiscount]);

  const holdCurrentCart = () => {
    if (cart.length === 0) { toast.error('Cart khaali hai'); return; }
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
    if (cart.length > 0 && !confirm('Current cart hai. Replace karein?')) return;
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

  const excludedImeis = cart.filter((c) => c.imeiId).map((c) => c.imeiId!);

  // ─── Stats for header ──────────────────────────────────────
  const outOfStockCount = useMemo(
    () => products.filter((p) => {
      if (isCarpetProduct(p)) {
        const s = carpetSummaryMap.get(p.id);
        return !s || s.totalSqft <= 0;
      }
      return p.stock <= 0;
    }).length,
    [products, carpetSummaryMap, isCarpetProduct],
  );

  return (
    <>
      {scannerOpen && <BarcodeScanner onDetected={handleBarcodeScan} onClose={() => setScannerOpen(false)} />}

      {lwOpen && (
        <LengthWidthCalculator
          productName={lwOpen.name + (lwOpen.variantName ? ` (${lwOpen.variantName})` : '')}
          unit={lwOpen.unit}
          initialQuantity={lwOpen.quantity}
          onApply={(qty, note) => {
            if (qty > lwOpen.stock) { toast.error(`Stock available: ${lwOpen.stock} ${lwOpen.unit}`); return; }
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
          onClose={() => { setVariantPickerProduct(null); setVariantPickerData([]); }}
          ignoreStock={isCarpetProduct(variantPickerProduct)}
        />
      )}

      {carpetPickerData && (
        <CarpetRollPicker
          product={carpetPickerData.product}
          variant={carpetPickerData.variant}
          onConfirm={handleCarpetRollConfirm}
          onClose={() => setCarpetPickerData(null)}
        />
      )}

      {cutPiecePickerData && (
        <CarpetCutPiecePicker
          product={cutPiecePickerData.product}
          variant={cutPiecePickerData.variant}
          onSelect={handleCutPieceSelect}
          onClose={() => setCutPiecePickerData(null)}
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

      {emiPromptData && (
        <QuickEmiFromSaleModal
          saleId={emiPromptData.saleId}
          saleNumber={emiPromptData.saleNumber}
          saleTotal={emiPromptData.total}
          paidAmount={emiPromptData.paidAmount}
          customerId={emiPromptData.customerId}
          customerName={emiPromptData.customerName}
          customerPhone={emiPromptData.customerPhone}
          onSuccess={() => setEmiPromptData(null)}
          onClose={() => setEmiPromptData(null)}
        />
      )}

      {showCustomerAdd && (
        <div className="fixed inset-0 z-50 bg-slate-950/70 backdrop-blur-sm flex items-center justify-center p-4">
          <div className="w-full max-w-md bg-white rounded-3xl shadow-2xl overflow-hidden">
            <div className="px-6 py-5 border-b border-slate-200 bg-gradient-to-br from-violet-600 via-purple-600 to-pink-600 text-white">
              <div className="flex items-center justify-between">
                <div className="flex items-center gap-3">
                  <div className="h-11 w-11 rounded-2xl bg-white/20 backdrop-blur flex items-center justify-center shadow-lg">
                    <UserPlus className="h-5 w-5" />
                  </div>
                  <div>
                    <h3 className="font-extrabold text-lg">Quick Add Customer</h3>
                    <p className="text-xs text-white/80 font-semibold">Naya customer add karein</p>
                  </div>
                </div>
                <button
                  onClick={() => setShowCustomerAdd(false)}
                  className="h-9 w-9 rounded-xl bg-white/15 hover:bg-white/25 backdrop-blur flex items-center justify-center transition"
                >
                  <X className="h-4 w-4" />
                </button>
              </div>
            </div>
            <div className="p-6 space-y-4">
              <div>
                <label className="text-xs font-extrabold uppercase tracking-wider text-slate-600 mb-1.5 inline-flex items-center gap-1.5">
                  <User className="h-3 w-3 text-violet-600" />
                  Name *
                </label>
                <input
                  autoFocus
                  value={newCustomer.name}
                  onChange={(e) => setNewCustomer({ ...newCustomer, name: e.target.value })}
                  placeholder="Customer name"
                  className="h-12 w-full rounded-xl border-2 border-slate-200 px-4 text-sm font-bold focus:outline-none focus:ring-2 focus:ring-violet-500/30 focus:border-violet-500 transition"
                />
              </div>
              <div>
                <label className="text-xs font-extrabold uppercase tracking-wider text-slate-600 mb-1.5 inline-flex items-center gap-1.5">
                  <Phone className="h-3 w-3 text-violet-600" />
                  Phone
                </label>
                <input
                  value={newCustomer.phone}
                  onChange={(e) => setNewCustomer({ ...newCustomer, phone: e.target.value })}
                  placeholder="03XXXXXXXXX"
                  className="h-12 w-full rounded-xl border-2 border-slate-200 px-4 text-sm font-bold focus:outline-none focus:ring-2 focus:ring-violet-500/30 focus:border-violet-500 transition"
                />
              </div>
              <Button
                size="lg"
                className="w-full bg-gradient-to-r from-violet-600 to-purple-700 hover:from-violet-700 hover:to-purple-800 shadow-lg shadow-violet-500/30"
                onClick={() => {
                  if (!newCustomer.name.trim()) { toast.error('Name zaroori hai'); return; }
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
        <PosHeldCartsModal
          heldCarts={heldCarts}
          onResume={resumeHeldCart}
          onDelete={deleteHeldCart}
          onClose={() => setShowHeldCarts(false)}
        />
      )}

      <div className="grid xl:grid-cols-[1.5fr_460px] gap-4 h-[calc(100vh-7rem)]">
        {/* ═══════════════ PRODUCTS SIDE ═══════════════ */}
        <section className="rounded-3xl bg-white border border-slate-200 shadow-sm overflow-hidden flex flex-col">
          {/* ───── PREMIUM HEADER ───── */}
          <div className="shrink-0 relative overflow-hidden bg-gradient-to-br from-slate-950 via-emerald-900 to-emerald-700 text-white">
            <div className="absolute -top-10 -right-10 h-32 w-32 rounded-full bg-emerald-400/20 blur-2xl" />
            <div className="absolute -bottom-10 -left-10 h-32 w-32 rounded-full bg-amber-400/15 blur-2xl" />

            <div className="relative px-5 py-4 space-y-3">
              <div className="flex items-center justify-between gap-3 flex-wrap">
                <div className="flex items-center gap-3 min-w-0">
                  <div className="h-11 w-11 rounded-2xl bg-white/15 backdrop-blur flex items-center justify-center shadow-lg ring-2 ring-white/20 shrink-0">
                    <ShoppingCart className="h-5 w-5 text-white" />
                  </div>
                  <div className="min-w-0">
                    <div className="flex items-center gap-2 flex-wrap">
                      <h2 className="text-lg font-extrabold leading-none">POS Counter</h2>
                      {isCarpetBusiness && (
                        <span className="px-2 py-0.5 rounded-md bg-emerald-500/30 backdrop-blur text-[9px] font-extrabold uppercase tracking-wider border border-emerald-300/40">
                          🧶 Carpet
                        </span>
                      )}
                      {isMobileBusiness && (
                        <span className="px-2 py-0.5 rounded-md bg-blue-500/30 backdrop-blur text-[9px] font-extrabold uppercase tracking-wider border border-blue-300/40">
                          📱 Mobile
                        </span>
                      )}
                    </div>
                    <p className="text-[11px] text-white/80 flex items-center gap-1.5 mt-1 font-semibold">
                      <Sparkles className="h-2.5 w-2.5 text-amber-300" />
                      {tenant?.name || 'My Shop'}
                      <span className="text-white/40">•</span>
                      <span className="inline-flex items-center gap-0.5">
                        <Package className="h-2.5 w-2.5" />
                        {filteredProducts.length} products
                      </span>
                      {hasMore && <span className="text-amber-300">(showing {visibleProducts.length})</span>}
                    </p>
                  </div>
                </div>

                <div className="flex items-center gap-1.5 shrink-0">
                  {isCarpetBusiness && (
                    <button
                      onClick={() => {
                        const carpetProduct = products.find(isCarpetProduct);
                        if (carpetProduct) setCutPiecePickerData({ product: carpetProduct });
                        else toast.error('Pehle koi carpet product banayein');
                      }}
                      className="h-9 px-3 rounded-xl bg-violet-500/30 hover:bg-violet-500/50 backdrop-blur text-white text-xs font-extrabold inline-flex items-center gap-1.5 transition border border-violet-300/40 shadow-md"
                      title="Quick cut pieces"
                    >
                      <Scissors className="h-3.5 w-3.5" />
                      Cut Pieces
                    </button>
                  )}

                  {heldCarts.length > 0 && (
                    <button
                      onClick={() => setShowHeldCarts(true)}
                      className="h-9 px-3 rounded-xl bg-amber-500/30 hover:bg-amber-500/50 backdrop-blur text-white text-xs font-extrabold inline-flex items-center gap-1.5 transition border border-amber-300/40 shadow-md relative"
                    >
                      <Pause className="h-3.5 w-3.5" />
                      Held Carts
                      <span className="absolute -top-1.5 -right-1.5 h-5 w-5 rounded-full bg-amber-500 text-white text-[10px] font-extrabold flex items-center justify-center shadow-lg ring-2 ring-emerald-900">
                        {heldCarts.length}
                      </span>
                    </button>
                  )}

                  <button
                    onClick={() => setHidePrices((v) => !v)}
                    className="h-9 w-9 rounded-xl bg-white/15 hover:bg-white/25 backdrop-blur text-white flex items-center justify-center transition border border-white/20"
                    title={hidePrices ? 'Show prices' : 'Hide prices (customer view)'}
                  >
                    {hidePrices ? <EyeOff className="h-3.5 w-3.5" /> : <Eye className="h-3.5 w-3.5" />}
                  </button>
                </div>
              </div>

              {/* Quick stats strip */}
              <div className="flex items-center gap-2 flex-wrap">
                <div className="inline-flex items-center gap-1.5 px-2.5 py-1 rounded-lg bg-white/10 backdrop-blur border border-white/15">
                  <Store className="h-3 w-3 text-emerald-300" />
                  <span className="text-[10px] font-extrabold uppercase tracking-wider">
                    {currentShopId ? 'Shop Active' : 'Select Shop'}
                  </span>
                </div>
                {outOfStockCount > 0 && (
                  <div className="inline-flex items-center gap-1.5 px-2.5 py-1 rounded-lg bg-rose-500/30 backdrop-blur border border-rose-300/40">
                    <AlertTriangle className="h-3 w-3 text-rose-200" />
                    <span className="text-[10px] font-extrabold text-white">
                      {outOfStockCount} out of stock
                    </span>
                  </div>
                )}
                <div className="inline-flex items-center gap-1.5 px-2.5 py-1 rounded-lg bg-white/10 backdrop-blur border border-white/15">
                  <ScanLine className="h-3 w-3 text-blue-300" />
                  <span className="text-[10px] font-extrabold uppercase tracking-wider">
                    Barcode Ready
                  </span>
                </div>
              </div>
            </div>
          </div>

          {/* ───── SEARCH BAR ───── */}
          <div className="shrink-0 px-5 py-3 bg-gradient-to-b from-slate-50/80 to-white border-b border-slate-100 space-y-2.5">
            <div className="flex gap-2">
              <div className="relative flex-1">
                <Search className="h-4 w-4 text-slate-400 absolute left-3.5 top-1/2 -translate-y-1/2" />
                <input
                  className="h-11 w-full rounded-xl border-2 border-slate-200 bg-white pl-10 pr-10 text-sm font-semibold focus:outline-none focus:ring-2 focus:ring-emerald-500/20 focus:border-emerald-500 transition shadow-sm"
                  placeholder="Search products by name, SKU, barcode..."
                  value={search}
                  onChange={(e) => setSearch(e.target.value)}
                />
                {search && (
                  <button
                    onClick={() => setSearch('')}
                    className="absolute right-2 top-1/2 -translate-y-1/2 h-7 w-7 rounded-lg hover:bg-slate-100 flex items-center justify-center transition"
                  >
                    <X className="h-3.5 w-3.5 text-slate-500" />
                  </button>
                )}
              </div>

              <form onSubmit={handleBarcodeSubmit} className="flex gap-1.5">
                <div className="relative">
                  <ScanLine className="h-4 w-4 text-emerald-600 absolute left-3 top-1/2 -translate-y-1/2 z-10" />
                  <input
                    ref={barcodeRef}
                    className="h-11 w-48 rounded-xl border-2 border-emerald-400 bg-gradient-to-br from-emerald-50 to-green-50 pl-10 pr-3 text-xs font-mono font-extrabold focus:outline-none focus:ring-2 focus:ring-emerald-500/30 focus:border-emerald-600 transition shadow-sm placeholder:text-emerald-600/50"
                    placeholder="Scan or type..."
                    value={barcodeInput}
                    onChange={(e) => setBarcodeInput(e.target.value)}
                  />
                </div>
                <button
                  type="button"
                  onClick={() => setScannerOpen(true)}
                  className="h-11 w-11 rounded-xl bg-gradient-to-br from-slate-900 to-slate-800 hover:from-slate-800 hover:to-slate-700 text-white flex items-center justify-center transition shadow-lg"
                  title="Open camera scanner"
                >
                  <Camera className="h-4 w-4" />
                </button>
              </form>
            </div>

            {/* Categories */}
            {categories.length > 0 && (
              <div className="flex gap-1.5 overflow-x-auto pb-1 -mb-1">
                <button
                  onClick={() => setSelectedCategoryId('')}
                  className={`shrink-0 px-3 h-8 rounded-xl text-xs font-extrabold transition inline-flex items-center gap-1.5 ${
                    !selectedCategoryId
                      ? 'bg-gradient-to-br from-emerald-600 to-emerald-700 text-white shadow-md shadow-emerald-500/30'
                      : 'bg-slate-100 text-slate-700 hover:bg-slate-200 border border-slate-200'
                  }`}
                >
                  <Sparkles className="h-3 w-3" />
                  All
                  <span className={`px-1 py-0 rounded text-[10px] ${!selectedCategoryId ? 'bg-white/20' : 'bg-slate-200'}`}>
                    {products.length}
                  </span>
                </button>
                {categories.map((cat: any) => {
                  const count = categoryCounts[cat.id] || 0;
                  if (count === 0) return null;
                  const active = selectedCategoryId === cat.id;
                  return (
                    <button
                      key={cat.id}
                      onClick={() => setSelectedCategoryId(active ? '' : cat.id)}
                      className={`shrink-0 px-3 h-8 rounded-xl text-xs font-extrabold inline-flex items-center gap-1.5 transition border-2 ${
                        active ? 'shadow-md' : 'opacity-75 hover:opacity-100 hover:shadow'
                      }`}
                      style={{
                        backgroundColor: active ? cat.color : '#fff',
                        borderColor: active ? cat.color : '#e2e8f0',
                        color: active ? '#fff' : '#475569',
                        boxShadow: active ? `0 4px 12px ${cat.color}40` : undefined,
                      }}
                    >
                      <span
                        className="h-2 w-2 rounded-full ring-2"
                        style={{
                          backgroundColor: active ? '#fff' : cat.color,
                          boxShadow: `0 0 0 2px ${active ? 'transparent' : 'rgba(255,255,255,0.5)'}`,
                        }}
                      />
                      {cat.name}
                      <span className={`px-1 py-0 rounded text-[10px] font-extrabold ${
                        active ? 'bg-white/20' : 'bg-slate-100 text-slate-600'
                      }`}>
                        {count}
                      </span>
                    </button>
                  );
                })}
              </div>
            )}
          </div>

          {/* ───── PRODUCTS GRID ───── */}
          <div ref={scrollRef} onScroll={handleScroll} className="flex-1 overflow-y-auto p-3 bg-gradient-to-b from-slate-50/30 to-white">
            {productsLoading ? (
              <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-4 2xl:grid-cols-5 gap-2.5">
                {Array.from({ length: 12 }).map((_, i) => (
                  <div key={i} className="aspect-[3/4] rounded-xl bg-slate-100 animate-pulse" />
                ))}
              </div>
            ) : filteredProducts.length === 0 ? (
              <div className="flex flex-col items-center justify-center py-20 px-6">
                <div className="h-20 w-20 rounded-3xl bg-gradient-to-br from-slate-100 to-slate-200 flex items-center justify-center shadow-inner">
                  <Package className="h-10 w-10 text-slate-400" />
                </div>
                <h3 className="mt-4 font-extrabold text-slate-900 text-lg">No products found</h3>
                <p className="mt-1 text-xs text-slate-500 text-center max-w-xs font-semibold">
                  {search
                    ? `No match for "${search}"`
                    : selectedCategoryId
                    ? 'No products in this category'
                    : 'Add products first'}
                </p>
                {(search || selectedCategoryId) && (
                  <button
                    onClick={() => { setSearch(''); setSelectedCategoryId(''); }}
                    className="mt-4 px-4 py-2 rounded-xl bg-emerald-600 hover:bg-emerald-700 text-white text-xs font-extrabold transition shadow-md"
                  >
                    Clear filters
                  </button>
                )}
              </div>
            ) : (
              <>
                <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-4 2xl:grid-cols-5 gap-2.5">
                  {visibleProducts.map((product) => {
                    const inCart = cart.find(
                      (c) => c.productId === product.id && !c.variantId && !c.imeiId && !c.rollId && !c.cutPieceId,
                    );
                    const isCarpet = isCarpetProduct(product);
                    const carpetData = isCarpet ? carpetSummaryMap.get(product.id) : undefined;
                    const carpetSqft = carpetData?.totalSqft ?? 0;
                    const carpetRollCount = carpetData?.rollCount ?? 0;
                    const outOfStock = isCarpet ? carpetSqft <= 0 : product.stock <= 0;
                    const lowStock = isCarpet
                      ? false
                      : product.stock > 0 && product.stock <= product.lowStockAlert;
                    const primaryImage = product.images?.[0]?.url;
                    const needsImei = productNeedsImei(product);

                    return (
                      <button
                        key={product.id}
                        onClick={() => addProductToCart(product)}
                        disabled={outOfStock}
                        className={`group relative text-left rounded-2xl border-2 transition-all overflow-hidden ${
                          outOfStock
                            ? 'border-slate-200 bg-slate-50 opacity-60 cursor-not-allowed'
                            : inCart
                            ? 'border-emerald-500 bg-gradient-to-br from-emerald-50 to-white shadow-lg shadow-emerald-500/20 ring-2 ring-emerald-200'
                            : 'border-slate-200 bg-white hover:border-emerald-400 hover:shadow-lg hover:shadow-emerald-500/10 hover:-translate-y-0.5'
                        }`}
                      >
                        {inCart && (
                          <div className="absolute -top-2 -right-2 h-7 w-7 rounded-full bg-gradient-to-br from-emerald-500 to-emerald-700 text-white text-xs font-extrabold flex items-center justify-center shadow-xl ring-2 ring-white z-10 animate-in zoom-in duration-200">
                            {inCart.quantity}
                          </div>
                        )}

                        <div className="aspect-square bg-gradient-to-br from-slate-50 to-slate-100 overflow-hidden relative">
                          {primaryImage ? (
                            <img
                              src={primaryImage}
                              alt={product.name}
                              loading="lazy"
                              className="w-full h-full object-cover group-hover:scale-110 transition-transform duration-500"
                            />
                          ) : (
                            <div className="w-full h-full flex items-center justify-center bg-gradient-to-br from-emerald-100 via-white to-emerald-200">
                              <Package className="h-10 w-10 text-emerald-400" />
                            </div>
                          )}

                          {/* Stock badges (top-right) */}
                          {outOfStock ? (
                            <div className="absolute top-1.5 right-1.5 px-2 py-0.5 rounded-full text-[9px] font-extrabold bg-rose-600 text-white shadow-lg ring-2 ring-white">
                              OUT
                            </div>
                          ) : lowStock ? (
                            <div className="absolute top-1.5 right-1.5 px-2 py-0.5 rounded-full text-[9px] font-extrabold bg-amber-500 text-white shadow-lg ring-2 ring-white animate-pulse">
                              LOW
                            </div>
                          ) : null}

                          {/* Type badges (bottom-left) */}
                          <div className="absolute bottom-1 left-1 flex gap-1 flex-wrap">
                            {isCarpet && (
                              <div className="px-1.5 py-0.5 rounded-md text-[8px] font-extrabold bg-emerald-600 text-white shadow-md inline-flex items-center gap-0.5 ring-1 ring-emerald-300">
                                <Layers className="h-2 w-2" /> ROLLS
                              </div>
                            )}
                            {product.hasVariants && !isCarpet && (
                              <div className="px-1.5 py-0.5 rounded-md text-[8px] font-extrabold bg-violet-600 text-white shadow-md inline-flex items-center gap-0.5 ring-1 ring-violet-300">
                                <Layers className="h-2 w-2" /> VAR
                              </div>
                            )}
                            {needsImei && (
                              <div className="px-1.5 py-0.5 rounded-md text-[8px] font-extrabold bg-blue-600 text-white shadow-md inline-flex items-center gap-0.5 ring-1 ring-blue-300">
                                <Smartphone className="h-2 w-2" /> IMEI
                              </div>
                            )}
                            {product.isFeatured && (
                              <div className="px-1.5 py-0.5 rounded-md text-[8px] font-extrabold bg-amber-500 text-white shadow-md inline-flex items-center gap-0.5 ring-1 ring-amber-300">
                                <Star className="h-2 w-2 fill-white" />
                              </div>
                            )}
                          </div>

                          {/* Hover overlay (Add icon) */}
                          {!outOfStock && !inCart && (
                            <div className="absolute inset-0 bg-emerald-900/0 group-hover:bg-emerald-900/10 transition-colors flex items-center justify-center opacity-0 group-hover:opacity-100">
                              <div className="h-10 w-10 rounded-full bg-emerald-600 text-white flex items-center justify-center shadow-xl scale-90 group-hover:scale-100 transition-transform">
                                <Plus className="h-5 w-5" />
                              </div>
                            </div>
                          )}
                        </div>

                        <div className="p-2">
                          <div className="font-extrabold text-slate-900 text-xs line-clamp-2 leading-tight min-h-[2rem]">
                            {product.name}
                          </div>
                          {product.category && (
                            <span
                              className="mt-1 inline-flex px-1.5 py-0.5 rounded text-[8px] font-extrabold text-white tracking-wide"
                              style={{ backgroundColor: product.category.color }}
                            >
                              {product.category.name}
                            </span>
                          )}
                          <div className="mt-1.5 flex items-end justify-between gap-1">
                            <div>
                              <div className="text-sm font-extrabold text-emerald-700 leading-none tabular-nums">
                                {hidePrices ? '••••' : formatPKR(product.price)}
                                {isCarpet && <span className="text-[9px] text-slate-500 ml-0.5 font-bold">/{product.unit}</span>}
                              </div>
                              {!isCarpet && product.wholesalePrice && product.wholesalePrice < product.price && !hidePrices && (
                                <div className="text-[9px] text-violet-700 font-bold mt-0.5">
                                  W: {formatPKR(product.wholesalePrice)}
                                </div>
                              )}
                            </div>
                            <div className="text-[9px] text-right shrink-0">
                              {isCarpet ? (
                                <div>
                                  <div className="text-emerald-700 font-extrabold tabular-nums">
                                    {carpetSqft.toFixed(0)} {product.unit}
                                  </div>
                                  <div className="text-[8px] text-slate-500 font-bold">
                                    {carpetRollCount} roll{carpetRollCount !== 1 ? 's' : ''}
                                  </div>
                                </div>
                              ) : (
                                <div className={`font-extrabold tabular-nums ${outOfStock ? 'text-rose-700' : lowStock ? 'text-amber-700' : 'text-slate-700'}`}>
                                  {product.stock.toFixed(product.stock % 1 === 0 ? 0 : 2)} {product.unit}
                                </div>
                              )}
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
                      className="px-5 py-2.5 rounded-xl bg-gradient-to-br from-slate-100 to-slate-200 hover:from-slate-200 hover:to-slate-300 text-slate-700 text-sm font-extrabold transition shadow-sm inline-flex items-center gap-2"
                    >
                      <Package className="h-3.5 w-3.5" />
                      Load {Math.min(PAGE_SIZE, filteredProducts.length - visibleCount)} more
                      <span className="text-xs text-slate-500">({filteredProducts.length - visibleCount} remaining)</span>
                    </button>
                  </div>
                )}
              </>
            )}
          </div>
        </section>

        {/* ═══════════════ CART SIDE ═══════════════ */}
        <aside className="rounded-3xl bg-white border border-slate-200 shadow-sm overflow-hidden flex flex-col">
          {/* ───── CART HEADER ───── */}
          <div className="shrink-0 relative overflow-hidden bg-gradient-to-br from-slate-950 via-brand-900 to-brand-700 text-white">
            <div className="absolute -top-10 -right-10 h-32 w-32 rounded-full bg-brand-400/20 blur-2xl" />
            <div className="absolute -bottom-10 -left-10 h-32 w-32 rounded-full bg-emerald-400/15 blur-2xl" />

            <div className="relative px-5 py-4">
              <div className="flex items-center justify-between gap-3">
                <div className="min-w-0">
                  <div className="inline-flex items-center gap-1.5 rounded-full bg-white/15 backdrop-blur px-2.5 py-0.5 text-[10px] font-extrabold uppercase tracking-wider border border-white/20">
                    <Receipt className="h-2.5 w-2.5 text-amber-300" />
                    Cart
                  </div>
                  <h3 className="mt-1.5 text-2xl font-extrabold tabular-nums">
                    {totalItems.toFixed(totalItems % 1 === 0 ? 0 : 2)}
                    <span className="text-sm font-bold text-white/70 ml-1">items</span>
                  </h3>
                  <p className="text-[11px] text-white/70 mt-0.5 font-semibold">
                    {cart.length} line{cart.length !== 1 ? 's' : ''}
                    {totalItems > 0 && (
                      <span className="ml-2 inline-flex items-center gap-1">
                        <span className="text-white/40">•</span>
                        <TrendingUp className="h-2.5 w-2.5 text-emerald-300" />
                        <span className="text-emerald-300 font-extrabold">{formatPKR(total)}</span>
                      </span>
                    )}
                  </p>
                </div>
                <div className="flex gap-1.5 shrink-0">
                  {cart.length > 0 && (
                    <>
                      <button
                        onClick={holdCurrentCart}
                        className="px-3 py-2 rounded-xl bg-amber-500/30 hover:bg-amber-500/50 backdrop-blur text-white text-[11px] font-extrabold inline-flex items-center gap-1.5 transition border border-amber-300/40 shadow-md"
                      >
                        <Pause className="h-3 w-3" />
                        Hold
                      </button>
                      <button
                        onClick={() => { if (confirm('Clear cart?')) resetCart(); }}
                        className="px-3 py-2 rounded-xl bg-white/15 hover:bg-rose-500/40 backdrop-blur text-white text-[11px] font-extrabold transition border border-white/20"
                      >
                        Clear
                      </button>
                    </>
                  )}
                </div>
              </div>
            </div>
          </div>

          {/* ───── CART BODY ───── */}
          <div className="flex-1 overflow-y-auto bg-gradient-to-b from-slate-50/30 to-white">
            {/* Customer selector */}
            <div className="p-3 border-b border-slate-100 bg-white space-y-2">
              <div className="flex items-center justify-between">
                <label className="text-[10px] font-extrabold uppercase tracking-wider text-slate-600 flex items-center gap-1.5">
                  <User className="h-3 w-3 text-violet-600" />
                  Customer / Khata
                </label>
                <button
                  onClick={() => setShowCustomerAdd(true)}
                  className="text-[10px] font-extrabold text-violet-600 hover:text-violet-700 inline-flex items-center gap-1 transition"
                >
                  <UserPlus className="h-3 w-3" />
                  Quick Add
                </button>
              </div>

              <div className="relative">
                <User className="h-3.5 w-3.5 text-violet-500 absolute left-3 top-1/2 -translate-y-1/2 pointer-events-none" />
                <select
                  value={customerId}
                  onChange={(e) => setCustomerId(e.target.value)}
                  className="h-11 w-full rounded-xl border-2 border-slate-200 bg-white pl-9 pr-9 text-xs font-bold focus:outline-none focus:ring-2 focus:ring-violet-500/30 focus:border-violet-500 appearance-none transition shadow-sm"
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
                <div className="rounded-2xl bg-gradient-to-br from-violet-50 via-white to-amber-50 border-2 border-violet-200 overflow-hidden shadow-sm">
                  <div className="p-2.5 bg-gradient-to-r from-violet-600 to-purple-700 text-white">
                    <div className="flex items-center gap-2">
                      <div className="h-9 w-9 rounded-xl bg-white/20 backdrop-blur flex items-center justify-center text-sm font-extrabold ring-2 ring-white/30 shrink-0">
                        {selectedCustomer.name.charAt(0).toUpperCase()}
                      </div>
                      <div className="flex-1 min-w-0">
                        <div className="font-extrabold truncate text-sm flex items-center gap-1">
                          {selectedCustomer.name}
                          {selectedCustomer.isVip && (
                            <Crown className="h-3 w-3 text-amber-300 fill-amber-300" />
                          )}
                        </div>
                        {selectedCustomer.phone && (
                          <div className="text-[10px] text-white/85 flex items-center gap-1 font-semibold">
                            <Phone className="h-2 w-2" />
                            {selectedCustomer.phone}
                          </div>
                        )}
                      </div>
                      {customerCreditSummary.currentBalance > 0 && (
                        <div className="text-right shrink-0">
                          <div className="text-[8px] text-white/70 font-extrabold uppercase tracking-wider">Udhaar</div>
                          <div className="text-sm font-extrabold text-amber-300 tabular-nums">
                            {formatPKR(customerCreditSummary.currentBalance)}
                          </div>
                        </div>
                      )}
                    </div>
                  </div>
                  <div className="grid grid-cols-3 divide-x divide-violet-100">
                    <div className="p-2 text-center">
                      <div className="text-[8px] text-slate-500 font-extrabold uppercase tracking-wider">Aaj</div>
                      <div className="text-sm font-extrabold text-slate-900 tabular-nums">
                        {customerCreditSummary.todaySalesCount}
                      </div>
                    </div>
                    <div className="p-2 text-center bg-emerald-50/50">
                      <div className="text-[8px] text-emerald-700 font-extrabold uppercase tracking-wider flex items-center justify-center gap-0.5">
                        <ArrowDownCircle className="h-2 w-2" />
                        Paid
                      </div>
                      <div className="text-[11px] font-extrabold text-emerald-700 tabular-nums">
                        {formatPKR(customerCreditSummary.todayPaid)}
                      </div>
                    </div>
                    <div className="p-2 text-center bg-amber-50/50">
                      <div className="text-[8px] text-amber-700 font-extrabold uppercase tracking-wider flex items-center justify-center gap-0.5">
                        <ArrowUpCircle className="h-2 w-2" />
                        Udhaar
                      </div>
                      <div className="text-[11px] font-extrabold text-amber-700 tabular-nums">
                        {formatPKR(customerCreditSummary.todayCredit)}
                      </div>
                    </div>
                  </div>
                </div>
              )}
            </div>

            {/* Cart lines */}
            <div className="p-3 space-y-1.5">
              {cart.length === 0 ? (
                <div className="rounded-2xl bg-gradient-to-br from-slate-50 to-white border-2 border-dashed border-slate-200 p-8 text-center">
                  <div className="h-14 w-14 rounded-2xl bg-white mx-auto flex items-center justify-center shadow-inner ring-1 ring-slate-200">
                    <ShoppingCart className="h-7 w-7 text-slate-400" />
                  </div>
                  <p className="mt-3 font-extrabold text-slate-700 text-sm">Cart empty</p>
                  <p className="text-[11px] text-slate-500 mt-1 font-semibold">
                    Click products or scan barcode to add
                  </p>
                  <div className="mt-4 flex items-center justify-center gap-2 flex-wrap">
                    <div className="inline-flex items-center gap-1 px-2 py-1 rounded-lg bg-emerald-50 border border-emerald-200 text-[10px] font-extrabold text-emerald-700">
                      <ScanLine className="h-2.5 w-2.5" />
                      Scan
                    </div>
                    <div className="inline-flex items-center gap-1 px-2 py-1 rounded-lg bg-blue-50 border border-blue-200 text-[10px] font-extrabold text-blue-700">
                      <Search className="h-2.5 w-2.5" />
                      Search
                    </div>
                    <div className="inline-flex items-center gap-1 px-2 py-1 rounded-lg bg-violet-50 border border-violet-200 text-[10px] font-extrabold text-violet-700">
                      <Sparkles className="h-2.5 w-2.5" />
                      Click
                    </div>
                  </div>
                </div>
              ) : (
                cart.map((item) => (
                  <PosCartLine
                    key={item.cartLineId}
                    item={item}
                    isEditing={editingLine === item.cartLineId}
                    hidePrices={hidePrices}
                    onToggleEdit={() => setEditingLine(editingLine === item.cartLineId ? null : item.cartLineId)}
                    onRemove={() => removeCartLine(item.cartLineId)}
                    onUpdate={(patch) => updateCartLine(item.cartLineId, patch)}
                    onSetQuantity={(qty) => setLineQuantity(item.cartLineId, qty)}
                    onOpenLW={() => setLwOpen(item)}
                  />
                ))
              )}
            </div>
          </div>

          {/* ───── CHECKOUT PANEL ───── */}
          {cart.length > 0 && (
            <PosCheckoutPanel
              cart={cart}
              globalDiscount={globalDiscount}
              setGlobalDiscount={setGlobalDiscount}
              saleMode={saleMode}
              setSaleMode={setSaleMode}
              paymentMethod={paymentMethod}
              setPaymentMethod={setPaymentMethod}
              paidAmount={paidAmount}
              setPaidAmount={setPaidAmount}
              customerId={customerId}
              onCheckout={handleCheckout}
              loading={checkoutMutation.isPending}
            />
          )}
        </aside>
      </div>
    </>
  );
}
