import { useEffect, useMemo, useRef, useState, useCallback } from 'react';
import { useQuery, useQueryClient, useMutation } from '@tanstack/react-query';
import {
  Search, ShoppingCart, Receipt, ScanLine, Camera, Package, User,
  X, Sparkles, BookOpen, Phone, History, ArrowDownCircle, ArrowUpCircle,
  Pause, Layers, UserPlus, Eye, EyeOff, ChevronDown, Smartphone, Scissors,
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

  // ─── Carpet business detection ─────────────────────────────
  const isCarpetBusiness = useMemo(() => {
    const type = (businessType ?? '').toUpperCase();
    return type === 'CARPET' || type === 'FLOORING' || businessFeatures?.lengthWidthCalc === true;
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
    // Detect if this was a mobile (IMEI) sale with credit + customer
    const hasImeiItem = cart.some((c) => c.imeiId);
    const shouldOfferEmi =
      hasImeiItem &&
      result.customerId &&
      result.customerName &&
      result.credit > 0 &&
      result.total > 0;

    if (shouldOfferEmi) {
      // Show EMI conversion prompt before resetting
      setEmiPromptData({
        saleId: result.saleId,
        saleNumber: result.saleNumber,
        total: result.total,
        paidAmount: result.paidAmount,
        customerId: result.customerId!,
        customerName: result.customerName!,
        customerPhone: result.customerPhone ?? undefined,
      });
      // Don't reset cart yet — user might cancel
      // But cart is locked because sale is already saved
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

    // Non-carpet: check standard stock
    if (!isCarpet && product.stock <= 0) {
      toast.error(`${product.name} stock mein nahi hai`);
      return;
    }

    // Carpet: check rolls availability
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

    // Standard variant routing
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

    // IMEI routing
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

    // CARPET path — open roll picker after variant
    // (Skip variant stock check — carpet stock lives in rolls)
    if (isCarpetProduct(variantPickerProduct)) {
      setCarpetPickerData({ product: variantPickerProduct, variant });
      setVariantPickerProduct(null);
      setVariantPickerData([]);
      return;
    }

    // IMEI path
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

    // Build note — include rate info if custom
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
            <div className="px-5 py-4 border-b border-slate-200 bg-gradient-to-br from-violet-50 to-pink-50 flex items-center justify-between">
              <div className="flex items-center gap-2">
                <UserPlus className="h-5 w-5 text-violet-600" />
                <h3 className="font-bold text-slate-900">Quick Add Customer</h3>
              </div>
              <button onClick={() => setShowCustomerAdd(false)} className="h-8 w-8 rounded-lg hover:bg-white/50 flex items-center justify-center">
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
        {/* ============== PRODUCTS SIDE ============== */}
        <section className="rounded-3xl bg-white border border-slate-200 shadow-sm overflow-hidden flex flex-col">
          <div className="shrink-0 px-5 py-3 border-b border-slate-100 bg-white space-y-3">
            <div className="flex items-center justify-between gap-3">
              <div className="flex items-center gap-2">
                <div className="h-9 w-9 rounded-xl bg-gradient-to-br from-emerald-500 to-emerald-700 flex items-center justify-center shadow-sm">
                  <ShoppingCart className="h-4 w-4 text-white" />
                </div>
                <div>
                  <h2 className="text-base font-extrabold text-slate-900 leading-none">
                    POS Counter
                    {isCarpetBusiness && (
                      <span className="ml-2 px-1.5 py-0.5 rounded text-[9px] font-extrabold bg-emerald-100 text-emerald-700">
                        CARPET
                      </span>
                    )}
                  </h2>
                  <p className="text-[11px] text-slate-500 flex items-center gap-1 mt-0.5">
                    <Sparkles className="h-2.5 w-2.5 text-amber-500" />
                    {filteredProducts.length} products
                    {hasMore && ` (showing ${visibleProducts.length})`}
                  </p>
                </div>
              </div>

              <div className="flex items-center gap-1.5">
                {isCarpetBusiness && (
                  <button
                    onClick={() => {
                      const carpetProduct = products.find(isCarpetProduct);
                      if (carpetProduct) {
                        setCutPiecePickerData({ product: carpetProduct });
                      } else {
                        toast.error('Pehle koi carpet product banayein');
                      }
                    }}
                    className="h-9 px-2.5 rounded-lg bg-violet-100 hover:bg-violet-200 text-violet-800 text-xs font-bold inline-flex items-center gap-1"
                    title="Quick access to cut pieces"
                  >
                    <Scissors className="h-3.5 w-3.5" /> Cut Pieces
                  </button>
                )}

                {heldCarts.length > 0 && (
                  <button
                    onClick={() => setShowHeldCarts(true)}
                    className="h-9 px-2.5 rounded-lg bg-amber-100 hover:bg-amber-200 text-amber-800 text-xs font-bold inline-flex items-center gap-1 relative"
                  >
                    <Pause className="h-3.5 w-3.5" /> Held
                    <span className="absolute -top-1 -right-1 h-4 w-4 rounded-full bg-amber-600 text-white text-[9px] font-bold flex items-center justify-center">
                      {heldCarts.length}
                    </span>
                  </button>
                )}

                <button
                  onClick={() => setHidePrices((v) => !v)}
                  className="h-9 w-9 rounded-lg bg-slate-100 hover:bg-slate-200 text-slate-700 flex items-center justify-center"
                >
                  {hidePrices ? <EyeOff className="h-3.5 w-3.5" /> : <Eye className="h-3.5 w-3.5" />}
                </button>
              </div>
            </div>

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
                  <button onClick={() => setSearch('')} className="absolute right-2 top-1/2 -translate-y-1/2 h-6 w-6 rounded-full hover:bg-slate-200 flex items-center justify-center">
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
                >
                  <Camera className="h-3.5 w-3.5" />
                </button>
              </form>
            </div>

            {categories.length > 0 && (
              <div className="flex gap-1.5 overflow-x-auto pb-1">
                <button
                  onClick={() => setSelectedCategoryId('')}
                  className={`shrink-0 px-3 h-7 rounded-lg text-xs font-bold transition ${
                    !selectedCategoryId ? 'bg-brand-600 text-white shadow' : 'bg-slate-100 text-slate-700 hover:bg-slate-200'
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

          <div ref={scrollRef} onScroll={handleScroll} className="flex-1 overflow-y-auto p-3">
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
                    const inCart = cart.find(
                      (c) => c.productId === product.id && !c.variantId && !c.imeiId && !c.rollId && !c.cutPieceId,
                    );
                    const isCarpet = isCarpetProduct(product);
                    // ─── Carpet-aware stock check ─────────────
                    const carpetData = isCarpet ? carpetSummaryMap.get(product.id) : undefined;
                    const carpetSqft = carpetData?.totalSqft ?? 0;
                    const carpetRollCount = carpetData?.rollCount ?? 0;
                    const outOfStock = isCarpet
                      ? carpetSqft <= 0
                      : product.stock <= 0;
                    const lowStock = isCarpet
                      ? false
                      : (product.stock > 0 && product.stock <= product.lowStockAlert);
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
                            <img src={primaryImage} alt={product.name} loading="lazy" className="w-full h-full object-cover group-hover:scale-105 transition-transform duration-300" />
                          ) : (
                            <div className="w-full h-full flex items-center justify-center bg-gradient-to-br from-brand-100 to-brand-200">
                              <Package className="h-8 w-8 text-brand-400" />
                            </div>
                          )}

                          {outOfStock ? (
                            <div className="absolute top-1.5 right-1.5 px-1.5 py-0.5 rounded-full text-[9px] font-bold bg-rose-600 text-white shadow">OUT</div>
                          ) : lowStock ? (
                            <div className="absolute top-1.5 right-1.5 px-1.5 py-0.5 rounded-full text-[9px] font-bold bg-amber-500 text-white shadow">LOW</div>
                          ) : null}

                          <div className="absolute bottom-1 left-1 flex gap-1">
                            {isCarpet && (
                              <div className="px-1.5 py-0.5 rounded text-[8px] font-bold bg-emerald-600 text-white shadow inline-flex items-center gap-0.5">
                                <Layers className="h-2 w-2" /> ROLLS
                              </div>
                            )}
                            {product.hasVariants && !isCarpet && (
                              <div className="px-1.5 py-0.5 rounded text-[8px] font-bold bg-violet-600 text-white shadow inline-flex items-center gap-0.5">
                                <Layers className="h-2 w-2" /> VAR
                              </div>
                            )}
                            {needsImei && (
                              <div className="px-1.5 py-0.5 rounded text-[8px] font-bold bg-blue-600 text-white shadow inline-flex items-center gap-0.5">
                                <Smartphone className="h-2 w-2" /> IMEI
                              </div>
                            )}
                          </div>
                        </div>

                        <div className="p-2">
                          <div className="font-bold text-slate-900 text-xs line-clamp-2 leading-tight min-h-[2rem]">{product.name}</div>
                          {product.category && (
                            <span className="inline-block mt-1 px-1 py-0.5 rounded text-[8px] font-bold text-white" style={{ backgroundColor: product.category.color }}>
                              {product.category.name}
                            </span>
                          )}
                          <div className="mt-1 flex items-end justify-between">
                            <div className="text-sm font-extrabold text-slate-900 leading-none">
                              {hidePrices ? '••••' : formatPKR(product.price)}
                              {isCarpet && <span className="text-[9px] text-slate-500 ml-0.5">/{product.unit}</span>}
                            </div>
                            <div className="text-[9px] text-slate-500 font-medium text-right">
                              {isCarpet ? (
                                <div>
                                  <div className="text-emerald-700 font-extrabold">
                                    {carpetSqft.toFixed(0)} {product.unit}
                                  </div>
                                  <div className="text-[8px]">
                                    {carpetRollCount} roll{carpetRollCount !== 1 ? 's' : ''}
                                  </div>
                                </div>
                              ) : (
                                `${product.stock.toFixed(product.stock % 1 === 0 ? 0 : 2)} ${product.unit}`
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
                  <Receipt className="h-2.5 w-2.5" /> Cart
                </div>
                <h3 className="mt-1.5 text-xl font-bold">{totalItems.toFixed(totalItems % 1 === 0 ? 0 : 2)} items</h3>
                <p className="text-[11px] text-white/70 mt-0.5">{cart.length} lines</p>
              </div>
              <div className="flex gap-1.5">
                {cart.length > 0 && (
                  <>
                    <button onClick={holdCurrentCart} className="px-2.5 py-1.5 rounded-lg bg-amber-500/20 hover:bg-amber-500/30 text-amber-200 text-[11px] font-bold inline-flex items-center gap-1">
                      <Pause className="h-3 w-3" /> Hold
                    </button>
                    <button onClick={() => { if (confirm('Clear cart?')) resetCart(); }} className="px-2.5 py-1.5 rounded-lg bg-white/15 hover:bg-white/25 text-[11px] font-bold">
                      Clear
                    </button>
                  </>
                )}
              </div>
            </div>
          </div>

          <div className="flex-1 overflow-y-auto">
            <div className="p-3 border-b border-slate-100 space-y-2">
              <div className="flex items-center justify-between">
                <label className="text-[10px] font-bold uppercase tracking-wider text-slate-500 flex items-center gap-1.5">
                  <User className="h-3 w-3" /> Customer / Khata
                </label>
                <button onClick={() => setShowCustomerAdd(true)} className="text-[10px] font-bold text-violet-600 hover:text-violet-700 inline-flex items-center gap-1">
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
                      {customer.name}{customer.phone ? ` • ${customer.phone}` : ''}{customer.balance > 0 ? ` • Udhaar: ${formatPKR(customer.balance)}` : ''}
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
                            <Phone className="h-2 w-2" /> {selectedCustomer.phone}
                          </div>
                        )}
                      </div>
                      {customerCreditSummary.currentBalance > 0 && (
                        <div className="text-right">
                          <div className="text-[8px] text-white/70 font-semibold uppercase">Udhaar</div>
                          <div className="text-sm font-extrabold text-amber-300">{formatPKR(customerCreditSummary.currentBalance)}</div>
                        </div>
                      )}
                    </div>
                  </div>
                  <div className="grid grid-cols-3 divide-x divide-violet-100">
                    <div className="p-1.5 text-center">
                      <div className="text-[8px] text-slate-500 font-bold uppercase">Aaj</div>
                      <div className="text-xs font-extrabold text-slate-900">{customerCreditSummary.todaySalesCount}</div>
                    </div>
                    <div className="p-1.5 text-center bg-emerald-50/40">
                      <div className="text-[8px] text-emerald-700 font-bold uppercase flex items-center justify-center gap-0.5">
                        <ArrowDownCircle className="h-2 w-2" /> Paid
                      </div>
                      <div className="text-[10px] font-extrabold text-emerald-700">{formatPKR(customerCreditSummary.todayPaid)}</div>
                    </div>
                    <div className="p-1.5 text-center bg-amber-50/40">
                      <div className="text-[8px] text-amber-700 font-bold uppercase flex items-center justify-center gap-0.5">
                        <ArrowUpCircle className="h-2 w-2" /> Udhaar
                      </div>
                      <div className="text-[10px] font-extrabold text-amber-700">{formatPKR(customerCreditSummary.todayCredit)}</div>
                    </div>
                  </div>
                </div>
              )}
            </div>

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
