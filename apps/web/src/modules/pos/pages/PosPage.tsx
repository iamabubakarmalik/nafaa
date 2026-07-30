import { useEffect, useMemo, useRef, useState, useCallback } from 'react';
import { useQuery, useQueryClient, useMutation } from '@tanstack/react-query';
import {
  Search, ShoppingCart, Receipt, ScanLine, Camera, Package, User,
  X, Sparkles, Phone, ArrowDownCircle, ArrowUpCircle,
  Pause, Layers, UserPlus, Eye, EyeOff, ChevronDown, Smartphone, Scissors,
  Store, AlertTriangle, TrendingUp, Star, Crown, Plus, Settings, Zap,
} from 'lucide-react';
import { type Product } from '@modules/inventory/products/api/products.api';
import { offlineProductsApi as productsApi } from '@core/lib/offline/offlineProducts';
import { productVariantsApi, type ProductVariant } from '@modules/inventory/products/api/product-variants.api';
import { offlineCustomersApi as customersApi } from '@core/lib/offline/offlineCustomers';
import { categoriesApi } from '@modules/inventory/categories/api/categories.api';
import type { PaymentMethod, ServiceChargeItem } from '@modules/sales/sales/api/sales.api';
import { Button } from '@core/ui/Button';
import { formatPKR } from '@core/lib/format';
import { toast } from 'sonner';
import BarcodeScanner from '@core/components/barcode/BarcodeScanner';
import { LengthWidthCalculator } from '@industries/carpet/components/pos-extensions/LengthWidthCalculator';
import { VariantPicker } from '../components/VariantPicker';
import { CarpetRollPicker } from '@industries/carpet/components/pos-extensions/CarpetRollPicker';
import { CarpetCutPiecePicker } from '@industries/carpet/components/pos-extensions/CarpetCutPiecePicker';
import { PosHeldCartsModal } from '../components/PosHeldCartsModal';
import { PosCartLine } from '../components/PosCartLine';
import { PosCheckoutPanel } from '../components/PosCheckoutPanel';
import { PosUniversalSearchPanel } from '../components/PosUniversalSearchPanel';
import { PosOptionsPanel, loadPosPreferences, type PosPreferences } from '../components/PosOptionsPanel';
import { useBusinessFeatures } from '@core/hooks/useBusinessFeatures';
import { useAuthStore } from '@core/stores/auth.store';
import { useOfflineCarpetSummary } from '@industries/carpet/hooks/useOfflineCarpetSummary';
import { usePosFastSearch } from '../hooks/usePosFastSearch';
import { ImeiPickerModal } from '@industries/mobile/components/ImeiPickerModal';
import { QuickEmiFromSaleModal } from '@industries/mobile/components/emi/QuickEmiFromSaleModal';
import type { ProductImei } from '@industries/mobile/api/imei.api';
import { usePosCheckout } from '../hooks/usePosCheckout';
import type { CarpetRoll } from '@industries/carpet/api/carpet-rolls.api';
import type { CarpetCutPiece } from '@industries/carpet/api/carpet-cut-pieces.api';
import { RetailQuickKeysBar } from '@industries/retail/components/pos-extensions/RetailQuickKeysBar';
import { RetailReorderAlert } from '@industries/retail/components/pos-extensions/RetailReorderAlert';
import { RestaurantModeBar } from '@/industries/restaurant/pos-extensions/RestaurantModeBar';
import { RestaurantModifierPicker } from '@/industries/restaurant/pos-extensions/RestaurantModifierPicker';
import { useRestaurantOrderMode } from '../hooks/useRestaurantOrderMode';
import { menuItemsApi } from '@industries/restaurant/api/menu-items.api';
import { useIsRetailBusiness } from '@industries/retail/hooks/useIsRetailBusiness';
import { useComboToCart } from '../hooks/useComboToCart';
import { smartBarcodeScan } from '../hooks/useSmartBarcodeScan';
import {
  type CartItem, type HeldCart, type SaleMode,
  CARPET_UNITS, MOBILE_KEYWORDS, PAGE_SIZE,
  loadHeldCarts, saveHeldCarts, cartLineId,
} from '../components/pos-types';
import { IndustrySlot } from '@industries/_shared/components/IndustrySlot';
import { useIndustryDetection } from '@industries/_shared/registry/useIndustryDetection';

export default function PosPage() {
  const queryClient = useQueryClient();
  const { features: businessFeatures, businessType } = useBusinessFeatures();
  const currentShopId = useAuthStore((s) => s.currentShopId);
  const industryDetection = useIndustryDetection();
  const activeIndustryId = industryDetection.id; // 'carpet' | 'mobile' | 'restaurant' | 'retail' | 'hotel' | ...
// isRetail now derived from posIndustry above
  const { expandCombo } = useComboToCart();
// isRestaurant now derived from posIndustry above
  const restaurantMode = useRestaurantOrderMode();
  const [modifierPickerProductId, setModifierPickerProductId] = useState<string | null>(null);
  const tenant = useAuthStore((s) => s.tenant);

  // ─── Industry detection via pack registry (single source of truth) ───
  // Only ONE pack matches the tenant at a time — priorities are set in each
  // pack's `priority` field: Carpet=90, Mobile=80, Hotel=75, Restaurant=70,
  // Jewelry=68, Pharmacy=65, Retail=60, etc.
  const isCarpetBusiness = activeIndustryId === 'carpet';
  const isMobileBusiness = activeIndustryId === 'mobile';
  const isRestaurant     = activeIndustryId === 'restaurant';
  const isRetail         = activeIndustryId === 'retail';

  // Legacy alias — some downstream code still reads posIndustry
  const posIndustry: 'CARPET' | 'MOBILE' | 'RESTAURANT' | 'RETAIL' | 'STANDARD' =
    isCarpetBusiness ? 'CARPET' :
    isMobileBusiness ? 'MOBILE' :
    isRestaurant     ? 'RESTAURANT' :
    isRetail         ? 'RETAIL' : 'STANDARD';
  void posIndustry; // may be referenced elsewhere in this file

  // Preferences
  const [prefs, setPrefs] = useState<PosPreferences>(loadPosPreferences());
  const [showOptions, setShowOptions] = useState(false);

  // Core state
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
  const [serviceCharges, setServiceCharges] = useState<ServiceChargeItem[]>([]);
  const [scannerOpen, setScannerOpen] = useState(false);
  const [barcodeInput, setBarcodeInput] = useState('');
  const [lwOpen, setLwOpen] = useState<CartItem | null>(null);
  const [variantPickerProduct, setVariantPickerProduct] = useState<Product | null>(null);
  const [variantPickerData, setVariantPickerData] = useState<ProductVariant[]>([]);
  const [carpetPickerData, setCarpetPickerData] = useState<{ product: Product; variant?: ProductVariant; preSelectedRoll?: CarpetRoll } | null>(null);
  const [cutPiecePickerData, setCutPiecePickerData] = useState<{ product: Product; variant?: ProductVariant } | null>(null);
  const [editingLine, setEditingLine] = useState<string | null>(null);
  const [heldCarts, setHeldCarts] = useState<HeldCart[]>([]);
  const [showHeldCarts, setShowHeldCarts] = useState(false);
  const [showCustomerAdd, setShowCustomerAdd] = useState(false);
  const [newCustomer, setNewCustomer] = useState({ name: '', phone: '' });
  const [hidePrices, setHidePrices] = useState(false);
  const [imeiPickerData, setImeiPickerData] = useState<{ product: Product; variant?: ProductVariant } | null>(null);
  const [emiPromptData, setEmiPromptData] = useState<any>(null);
  const barcodeRef = useRef<HTMLInputElement>(null);
  const scrollRef = useRef<HTMLDivElement>(null);

  // Auto-refetch on shop switch
  useEffect(() => {
    if (!currentShopId) return;
    queryClient.invalidateQueries({ queryKey: ['products-for-pos'] });
    queryClient.invalidateQueries({ queryKey: ['products-shop-stock', currentShopId] });
    queryClient.invalidateQueries({ queryKey: ['carpet-product-summary-pos'] });
    queryClient.invalidateQueries({ queryKey: ['pos-fast-rolls'] });
    queryClient.invalidateQueries({ queryKey: ['pos-fast-cut-pieces'] });
    // Reset cart on shop switch to prevent cross-shop stock issues
    if (cart.length > 0) {
      const shouldKeep = confirm('Shop switch ho raha hai — kya current cart clear karna hai?');
      if (shouldKeep) {
        setCart([]);
        setCustomerId('');
        setPaidAmount('');
        setGlobalDiscount('');
        setServiceCharges([]);
      }
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [currentShopId]);

    useEffect(() => {
    const t = setTimeout(() => setDebouncedSearch(search), 120);
    return () => clearTimeout(t);
  }, [search]);

  useEffect(() => {
    setVisibleCount(PAGE_SIZE);
    if (scrollRef.current) scrollRef.current.scrollTop = 0;
  }, [debouncedSearch, selectedCategoryId]);

  // Data
  const { data: productsData, isLoading: productsLoading } = useQuery({
    queryKey: ['products-for-pos'],
    queryFn: () => productsApi.list({ page: 1, limit: 2000 }),
    staleTime: 30_000,
  });

  const { data: customersData } = useQuery({
    queryKey: ['customers-for-pos'],
    queryFn: () => customersApi.list({ page: 1, limit: 500 }),
    staleTime: 60_000,
  });

  const { data: customerDetail } = useQuery({
    queryKey: ['customer-detail', customerId],
    queryFn: () => customersApi.get(customerId),
    enabled: !!customerId,
  });

  const { data: categories = [] } = useQuery({
    queryKey: ['categories'],
    queryFn: categoriesApi.list,
    staleTime: 5 * 60_000,
  });

  const products = productsData?.items ?? [];
  const customers = customersData?.items ?? [];

  // Fast universal search (rolls + cut pieces)
  const fastSearch = usePosFastSearch(debouncedSearch, isCarpetBusiness);

  // Carpet stock summary
  const productIds = useMemo(() => products.map((p) => p.id), [products]);
  const { data: carpetSummary = [] } = useOfflineCarpetSummary(
    productIds,
    isCarpetBusiness && productIds.length > 0,
  );
  const carpetSummaryMap = useMemo(() => {
    const map = new Map<string, any>();
    for (const s of carpetSummary) map.set(s.productId, s);
    return map;
  }, [carpetSummary]);

  useEffect(() => { setHeldCarts(loadHeldCarts()); }, []);

  // Filters
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

  const checkRestaurantModifiers = async (productId: string): Promise<boolean> => {
    try {
      const menuItems = await menuItemsApi.list({});
      const mi = menuItems.find((m: any) => m.productId === productId);
      if (!mi) return false;
      const required = mi.modifiers?.some((mm: any) => mm.modifierGroup?.isRequired);
      return !!required;
    } catch { return false; }
  };

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

  const checkoutMutation = usePosCheckout((result) => {
    // Auto-open receipt in new tab if enabled
    const autoOpenReceipt = localStorage.getItem('nafaa.pos.auto-open-receipt') !== 'false';
    if (autoOpenReceipt && result.saleId) {
      window.open('/sales/' + result.saleId + '/receipt?auto=1', '_blank');
    }

    const hasImeiItem = cart.some((c) => c.imeiId);
    const shouldOfferEmi =
      hasImeiItem && result.customerId && result.customerName && result.credit > 0 && result.total > 0;

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
    if (prefs.autoFocusBarcode) barcodeRef.current?.focus();
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
    onError: (e: any) => toast.error(e?.response?.data?.message || 'Add failed'),
  });

  const handleComboAdd = (combo: any) => {
    const newItems = expandCombo(combo, cartLineId);
    setCart((prev) => [...prev, ...newItems]);
  };

  const resetCart = () => {
    setCart([]);
    setCustomerId('');
    setPaymentMethod('CASH');
    setPaidAmount('');
    setGlobalDiscount('');
    setServiceCharges([]);
    setSaleMode('FULL_PAYMENT');
  };

  // Add product to cart (smart routing)
  const addProductToCart = async (product: Product) => {
    const isCarpet = isCarpetProduct(product);

    if (!isCarpet && product.stock <= 0) {
      toast.error(`${product.name} out of stock`);
      return;
    }

    if (isCarpet) {
      const summary = carpetSummaryMap.get(product.id);
      if (!summary || summary.totalSqft <= 0) {
        toast.error(`${product.name}: koi active roll nahi`);
        return;
      }
      if (product.hasVariants) {
        try {
          const variants = await productVariantsApi.list(product.id);
          const active = variants.filter((v) => v.isActive);
          if (active.length === 0) { toast.error('No active variants'); return; }
          setVariantPickerData(variants);
          setVariantPickerProduct(product);
          return;
        } catch { toast.error('Load variants failed'); return; }
      }
      setCarpetPickerData({ product });
      return;
    }

    if (product.hasVariants) {
      try {
        const variants = await productVariantsApi.list(product.id);
        const active = variants.filter((v) => v.isActive);
        if (active.length === 0) { toast.error('No active variants'); return; }
        setVariantPickerData(variants);
        setVariantPickerProduct(product);
        return;
      } catch { toast.error('Load variants failed'); return; }
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
      setCart((prev) => [...prev, {
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
      }]);
      toast.success(`${product.name} added with IMEI`);
      return;
    }

    const existingIndex = cart.findIndex(
      (item) =>
        item.productId === product.id &&
        item.variantId === variantId &&
        !item.imeiId && !item.rollId && !item.cutPieceId && !item.priceOverride,
    );

    if (existingIndex >= 0) {
      const existing = cart[existingIndex];
      const stock = variant ? variant.stock : product.stock;
      if (existing.quantity >= stock) { toast.error('Stock limit'); return; }
      setCart((prev) => prev.map((item, i) => i === existingIndex ? { ...item, quantity: item.quantity + 1 } : item));
      return;
    }

    setCart((prev) => [...prev, {
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
    }]);
    toast.success(`${product.name}${variant ? ` (${variant.name})` : ''} added`);
  };

  const handleVariantSelect = (variant: ProductVariant) => {
    if (!variantPickerProduct) return;
    if (isCarpetProduct(variantPickerProduct)) {
      setCarpetPickerData({ product: variantPickerProduct, variant });
      setVariantPickerProduct(null); setVariantPickerData([]);
      return;
    }
    if (productNeedsImei(variantPickerProduct)) {
      setImeiPickerData({ product: variantPickerProduct, variant });
      setVariantPickerProduct(null); setVariantPickerData([]);
      return;
    }
    addToCart(variantPickerProduct, variant);
    setVariantPickerProduct(null); setVariantPickerData([]);
  };

  const handleCarpetRollConfirm = (data: any) => {
    if (!carpetPickerData) return;
    const { product, variant } = carpetPickerData;
    const { roll } = data;

    const wInchPart = data.customerWidthInch > 0 ? ` ${data.customerWidthInch}in` : '';
    const lInchPart = data.lengthInch > 0 ? ` ${data.lengthInch}in` : '';
    let note = `Cut from ${roll.rollNumber}: ${data.customerWidthFt}ft${wInchPart} × ${data.lengthFt}ft${lInchPart} = ${data.cutSqft.toFixed(2)} sqft`;
    if (data.isCustomRate && data.originalRate !== data.pricePerSqft) {
      note += ` @ Rs ${data.pricePerSqft.toFixed(2)}/sqft (Custom)`;
    }

    setCart((prev) => [...prev, {
      cartLineId: cartLineId(),
      productId: product.id,
      variantId: variant?.id,
      rollId: roll.id,
      rollNumber: roll.rollNumber,
      cutWidthFt: data.customerWidthFt,
      cutWidthInch: data.customerWidthInch,
      cutLengthFt: data.lengthFt,
      cutLengthInch: data.lengthInch,
      cutLengthReal: data.lengthReal,
      cutWidthReal: data.widthReal,
      cutSqft: data.cutSqft,
      createLeftover: data.createLeftover,
      rollCustomerWidthFt: data.widthReal,
      rollFullWidthFt: Number(roll.widthFt) + Number((roll as any).widthInch || 0) / 12,
      name: product.name,
      variantName: variant?.name,
      variantImage: variant?.imageUrl ?? undefined,
      variantColor: variant?.color ?? undefined,
      variantColorHex: variant?.colorHex ?? undefined,
      basePrice: data.pricePerSqft,
      wholesalePrice: (roll as any).wholesalePricePerSqft ?? null,
      stock: data.cutSqft,
      quantity: data.cutSqft,
      unit: product.unit,
      category: product.category,
      useWholesale: false,
      priceOverride: data.pricePerSqft,
      lineDiscount: 0,
      note,
    }]);

    toast.success(`${roll.rollNumber} → ${data.cutSqft.toFixed(2)} sqft added`);
    setCarpetPickerData(null);
  };

  const handleCutPieceSelect = (piece: CarpetCutPiece) => {
    if (!cutPiecePickerData) return;
    const { product, variant } = cutPiecePickerData;

    setCart((prev) => [...prev, {
      cartLineId: cartLineId(),
      productId: product.id,
      variantId: variant?.id,
      cutPieceId: piece.id,
      cutPieceCode: piece.pieceCode,
      cutSqft: (piece as any).totalSqft,
      name: product.name,
      variantName: variant?.name,
      variantImage: variant?.imageUrl ?? undefined,
      variantColor: variant?.color ?? undefined,
      variantColorHex: variant?.colorHex ?? undefined,
      basePrice: (piece as any).salePrice,
      wholesalePrice: null,
      stock: (piece as any).totalSqft,
      quantity: (piece as any).totalSqft,
      unit: product.unit,
      category: product.category,
      useWholesale: false,
      priceOverride: (piece as any).salePrice / Math.max((piece as any).totalSqft, 0.01),
      lineDiscount: 0,
      note: `Cut piece ${piece.pieceCode} • ${(piece as any).widthFt}ft × ${(piece as any).lengthFt}ft`,
    }]);

    toast.success(`Cut piece ${piece.pieceCode} added`);
    setCutPiecePickerData(null);
  };

  const handleImeiSelect = (imei: ProductImei) => {
    if (!imeiPickerData) return;
    addToCart(imeiPickerData.product, imeiPickerData.variant || null, {
      imeiId: imei.id, imeiNumber: imei.imei1,
    });
    setImeiPickerData(null);
  };

  const updateCartLine = (lineId: string, patch: Partial<CartItem>) => {
    setCart((prev) => prev.map((item) => (item.cartLineId === lineId ? { ...item, ...patch } : item)));
  };

  const removeCartLine = (lineId: string) => {
    setCart((prev) => prev.filter((item) => item.cartLineId !== lineId));
  };

  const setLineQuantity = (lineId: string, qty: number) => {
    const item = cart.find((i) => i.cartLineId === lineId);
    if (!item) return;
    if (item.imeiId || item.rollId || item.cutPieceId) { toast.error('Fixed quantity'); return; }
    if (qty < 0.01) { removeCartLine(lineId); return; }
    if (qty > item.stock) { toast.error(`Stock: ${item.stock} ${item.unit}`); return; }
    updateCartLine(lineId, { quantity: Number(qty.toFixed(2)) });
  };

  const handleBarcodeScan = async (code: string) => {
    setScannerOpen(false);
    if (!code.trim()) return;

    // Retail businesses — use smart barcode (checks unit + combo barcodes first)
    if (isRetail) {
      try {
        const result = await smartBarcodeScan(code.trim());

        if (result.type === 'combo' && result.combo) {
          handleComboAdd(result.combo);
          return;
        }

        if (result.type === 'unit' && result.unit && result.product) {
          // Add to cart with unit-specific price
          setCart((prev) => [...prev, {
            cartLineId: cartLineId(),
            productId: result.product.id,
            variantId: result.variant?.id,
            name: result.product.name,
            variantName: result.variant?.name,
            variantImage: result.variant?.imageUrl ?? undefined,
            variantColor: result.variant?.color ?? undefined,
            variantColorHex: result.variant?.colorHex ?? undefined,
            basePrice: result.unit.price,
            wholesalePrice: result.unit.wholesalePrice ?? null,
            stock: result.product.stock,
            quantity: 1,
            unit: result.unit.unitName,
            category: result.product.category,
            useWholesale: false,
            lineDiscount: 0,
            note: `Unit: ${result.unit.unitName} (${result.unit.conversionRate}× base)`,
          }]);
          toast.success(`${result.product.name} added as ${result.unit.unitName}`);
          return;
        }

        if (result.type === 'product' && result.product) {
          await addProductToCart(result.product);
          return;
        }

        if (result.type === 'variant' && result.product && result.variant) {
          if (isCarpetProduct(result.product)) setCarpetPickerData({ product: result.product, variant: result.variant });
          else if (productNeedsImei(result.product)) setImeiPickerData({ product: result.product, variant: result.variant });
          else addToCart(result.product, result.variant);
          return;
        }
      } catch {
        // Fall through to standard flow
      }
    }

    // Standard barcode flow
    try {
      const product = await productsApi.byBarcode(code.trim());
      if ((product as any).matchedVariant) {
        const variant = (product as any).matchedVariant as ProductVariant;
        if (isCarpetProduct(product)) setCarpetPickerData({ product, variant });
        else if (productNeedsImei(product)) setImeiPickerData({ product, variant });
        else addToCart(product, variant);
      } else {
        await addProductToCart(product);
      }
    } catch {
      toast.error(`Barcode "${code}" not found`);
    }
  };

  const handleBarcodeSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (!barcodeInput.trim()) return;
    handleBarcodeScan(barcodeInput.trim());
    setBarcodeInput('');
  };

  useEffect(() => {
    if (prefs.autoFocusBarcode) barcodeRef.current?.focus();
  }, [prefs.autoFocusBarcode]);

  useEffect(() => {
    if (!customerId && (saleMode === 'PARTIAL_CREDIT' || saleMode === 'FULL_CREDIT')) {
      setSaleMode('FULL_PAYMENT');
      setPaidAmount('');
    }
  }, [customerId, saleMode]);

  const handleScroll = useCallback((e: React.UIEvent<HTMLDivElement>) => {
    const target = e.currentTarget;
    if (!hasMore) return;
    const ratio = (target.scrollTop + target.clientHeight) / target.scrollHeight;
    if (ratio > 0.85) setVisibleCount((c) => Math.min(c + PAGE_SIZE, filteredProducts.length));
  }, [hasMore, filteredProducts.length]);

  const handleCheckout = () => {
    if (cart.length === 0) { toast.error('Cart khaali hai'); return; }
    if (!currentShopId) { toast.error('Pehle shop select karein'); return; }

    const subtotal = cart.reduce((sum, item) => {
      const unitPrice = item.priceOverride ?? (item.useWholesale ? (item.wholesalePrice ?? item.basePrice) : item.basePrice);
      return sum + unitPrice * item.quantity;
    }, 0);
    const totalLineDiscount = cart.reduce((sum, item) => sum + (item.lineDiscount || 0), 0);
    const gDiscount = Number(globalDiscount) || 0;
    const svcTotal = serviceCharges.reduce((sum, c) => sum + Number(c.amount || 0), 0);
    const total = Math.max(subtotal - totalLineDiscount - gDiscount + svcTotal, 0);
    const effectivePaid = saleMode === 'FULL_PAYMENT' ? total : saleMode === 'FULL_CREDIT' ? 0 : Number(paidAmount || 0);
    const credit = Math.max(total - effectivePaid, 0);

    if (credit > 0 && !customerId) { toast.error('Customer required for credit'); return; }
    if (saleMode === 'PARTIAL_CREDIT' && effectivePaid >= total) { toast.error('Partial paid must be less than total'); return; }
    if (saleMode === 'PARTIAL_CREDIT' && effectivePaid <= 0) { toast.error('Paid amount required'); return; }

    checkoutMutation.mutate({
      shopId: currentShopId, customerId, paymentMethod,
      paidAmount: effectivePaid, discount: gDiscount, cart, serviceCharges,
    });
  };

  const total = useMemo(() => {
    const subtotal = cart.reduce((sum, item) => {
      const unitPrice = item.priceOverride ?? (item.useWholesale ? (item.wholesalePrice ?? item.basePrice) : item.basePrice);
      return sum + unitPrice * item.quantity;
    }, 0);
    const totalLineDiscount = cart.reduce((sum, item) => sum + (item.lineDiscount || 0), 0);
    const svcTotal = serviceCharges.reduce((sum, c) => sum + Number(c.amount || 0), 0);
    return Math.max(subtotal - totalLineDiscount - (Number(globalDiscount) || 0) + svcTotal, 0);
  }, [cart, globalDiscount, serviceCharges]);

  const holdCurrentCart = () => {
    if (cart.length === 0) { toast.error('Cart khaali hai'); return; }
    const held: HeldCart = {
      id: cartLineId(), items: cart, customerId,
      customerName: selectedCustomer?.name || 'Walk-in',
      total, heldAt: Date.now(),
    };
    const next = [held, ...heldCarts].slice(0, 20);
    setHeldCarts(next);
    saveHeldCarts(next);
    resetCart();
    toast.success('Cart held');
  };

  const resumeHeldCart = (held: HeldCart) => {
    if (cart.length > 0 && !confirm('Current cart replace karein?')) return;
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

  // POS_SHOP_GUARD_MARKER — must have an active shop
  if (!currentShopId) {
    return (
      <div className="flex items-center justify-center min-h-[60vh] p-6">
        <div className="max-w-md w-full rounded-3xl bg-gradient-to-br from-amber-50 to-orange-50 border-2 border-amber-300 p-8 text-center shadow-lg">
          <div className="mx-auto h-16 w-16 rounded-2xl bg-amber-500 text-white flex items-center justify-center shadow-lg">
            <Store className="h-8 w-8" />
          </div>
          <h2 className="mt-4 text-2xl font-extrabold text-amber-900">Pehle Shop Select Karein</h2>
          <p className="mt-2 text-sm text-amber-800 font-semibold">
            POS use karne ke liye topbar se shop select karein.
          </p>
          <p className="mt-4 text-xs text-amber-700">
            Agar koi shop nahi hai to <a href="/shops" className="underline font-bold">Shops page</a> se naya banayein.
          </p>
        </div>
      </div>
    );
  }

  return (
    <>
      {modifierPickerProductId && (
        <RestaurantModifierPicker
          productId={modifierPickerProductId}
          onConfirm={(mods) => {
            // Find product and add to cart with modifier notes
            const product = products.find((p) => p.id === modifierPickerProductId);
            if (product) {
              const modText = mods.map((m: any) => m.optionName + (m.priceAdjustment !== 0 ? ' (' + (m.priceAdjustment > 0 ? '+' : '') + m.priceAdjustment + ')' : '')).join(', ');
              const modTotal = mods.reduce((s: number, m: any) => s + m.priceAdjustment * m.quantity, 0);
              setCart((prev) => [...prev, {
                cartLineId: cartLineId(),
                productId: product.id,
                name: product.name,
                variantImage: product.images?.[0]?.url ?? undefined,
                basePrice: product.price + modTotal,
                wholesalePrice: null,
                stock: product.stock,
                quantity: 1,
                unit: product.unit,
                category: product.category,
                useWholesale: false,
                lineDiscount: 0,
                note: modText ? 'Modifiers: ' + modText : undefined,
              }]);
              toast.success(product.name + ' added with modifiers');
            }
            setModifierPickerProductId(null);
          }}
          onClose={() => setModifierPickerProductId(null)}
        />
      )}

      {scannerOpen && <BarcodeScanner onDetected={handleBarcodeScan} onClose={() => setScannerOpen(false)} />}

      {showOptions && <PosOptionsPanel onClose={() => setShowOptions(false)} onChange={setPrefs} />}

      {lwOpen && (
        <LengthWidthCalculator
          productName={lwOpen.name + (lwOpen.variantName ? ` (${lwOpen.variantName})` : '')}
          unit={lwOpen.unit}
          initialQuantity={lwOpen.quantity}
          onApply={(qty, note) => {
            if (qty > lwOpen.stock) { toast.error(`Stock: ${lwOpen.stock}`); return; }
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
          preSelectedRoll={carpetPickerData.preSelectedRoll}
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
            <div className="px-6 py-5 border-b border-slate-200 bg-gradient-to-br from-violet-600 to-purple-700 text-white">
              <div className="flex items-center justify-between">
                <div className="flex items-center gap-3">
                  <div className="h-11 w-11 rounded-2xl bg-white/20 flex items-center justify-center">
                    <UserPlus className="h-5 w-5" />
                  </div>
                  <div>
                    <h3 className="font-extrabold text-lg">Quick Add Customer</h3>
                    <p className="text-xs text-white/80 font-semibold">Naya customer</p>
                  </div>
                </div>
                <button onClick={() => setShowCustomerAdd(false)} className="h-9 w-9 rounded-xl bg-white/15 hover:bg-white/25 flex items-center justify-center">
                  <X className="h-4 w-4" />
                </button>
              </div>
            </div>
            <div className="p-6 space-y-4">
              <div>
                <label className="text-xs font-extrabold uppercase tracking-wider text-slate-600 mb-1.5 block">Name *</label>
                <input
                  autoFocus
                  value={newCustomer.name}
                  onChange={(e) => setNewCustomer({ ...newCustomer, name: e.target.value })}
                  placeholder="Customer name"
                  className="h-12 w-full rounded-xl border-2 border-slate-200 px-4 text-base font-bold focus:outline-none focus:border-violet-500 transition"
                />
              </div>
              <div>
                <label className="text-xs font-extrabold uppercase tracking-wider text-slate-600 mb-1.5 block">Phone</label>
                <input
                  value={newCustomer.phone}
                  onChange={(e) => setNewCustomer({ ...newCustomer, phone: e.target.value })}
                  placeholder="03XXXXXXXXX"
                  className="h-12 w-full rounded-xl border-2 border-slate-200 px-4 text-base font-bold focus:outline-none focus:border-violet-500 transition"
                />
              </div>
              <Button
                size="lg"
                className="w-full bg-gradient-to-r from-violet-600 to-purple-700"
                onClick={() => {
                  if (!newCustomer.name.trim()) { toast.error('Name required'); return; }
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

      <div className="grid xl:grid-cols-[1.5fr_460px] gap-4 h-[calc(100dvh-7rem)] pos-scroll-container">
        {/* PRODUCTS SIDE */}
        <section className="rounded-3xl bg-white border border-slate-200 shadow-sm overflow-hidden flex flex-col">
          {/* HEADER */}
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
                        <span className="px-2 py-0.5 rounded-md bg-emerald-500/30 text-[10px] font-extrabold uppercase border border-emerald-300/40">🧶 Carpet</span>
                      )}
                      {isMobileBusiness && (
                        <span className="px-2 py-0.5 rounded-md bg-blue-500/30 text-[10px] font-extrabold uppercase border border-blue-300/40">📱 Mobile</span>
                      )}
                    </div>
                    <p className="text-xs text-white/80 flex items-center gap-1.5 mt-1 font-semibold">
                      <Sparkles className="h-2.5 w-2.5 text-amber-300" />
                      {tenant?.name || 'My Shop'}
                      <span className="text-white/40">•</span>
                      <Package className="h-2.5 w-2.5" />
                      {filteredProducts.length}
                    </p>
                  </div>
                </div>

                <div className="flex items-center gap-1.5 shrink-0">
                  {isCarpetBusiness && prefs.showQuickCutPieces && (
                    <button
                      onClick={() => {
                        const carpetProduct = products.find(isCarpetProduct);
                        if (carpetProduct) setCutPiecePickerData({ product: carpetProduct });
                        else toast.error('Pehle carpet product banayein');
                      }}
                      className="h-9 px-3 rounded-xl bg-violet-500/30 hover:bg-violet-500/50 text-white text-xs font-extrabold inline-flex items-center gap-1.5 border border-violet-300/40 shadow-md"
                    >
                      <Scissors className="h-3.5 w-3.5" />
                      Cut Pieces
                    </button>
                  )}

                  {heldCarts.length > 0 && prefs.showHeldCartsButton && (
                    <button
                      onClick={() => setShowHeldCarts(true)}
                      className="h-9 px-3 rounded-xl bg-amber-500/30 hover:bg-amber-500/50 text-white text-xs font-extrabold inline-flex items-center gap-1.5 border border-amber-300/40 shadow-md relative"
                    >
                      <Pause className="h-3.5 w-3.5" />
                      Held
                      <span className="absolute -top-1.5 -right-1.5 h-5 w-5 rounded-full bg-amber-500 text-white text-[10px] font-extrabold flex items-center justify-center shadow-lg ring-2 ring-emerald-900">
                        {heldCarts.length}
                      </span>
                    </button>
                  )}

                  <button
                    onClick={() => setHidePrices((v) => !v)}
                    className="h-9 w-9 rounded-xl bg-white/15 hover:bg-white/25 text-white flex items-center justify-center border border-white/20"
                    title={hidePrices ? 'Show prices' : 'Hide prices'}
                  >
                    {hidePrices ? <EyeOff className="h-3.5 w-3.5" /> : <Eye className="h-3.5 w-3.5" />}
                  </button>

                  <button
                    onClick={() => setShowOptions(true)}
                    className="h-9 w-9 rounded-xl bg-white/15 hover:bg-white/25 text-white flex items-center justify-center border border-white/20"
                    title="POS options"
                  >
                    <Settings className="h-3.5 w-3.5" />
                  </button>
                </div>
              </div>

              <div className="flex items-center gap-2 flex-wrap">
                <div className="inline-flex items-center gap-1.5 px-2.5 py-1 rounded-lg bg-white/10 border border-white/15">
                  <Store className="h-3 w-3 text-emerald-300" />
                  <span className="text-[10px] font-extrabold uppercase">
                    {currentShopId ? 'Shop Active' : 'Select Shop'}
                  </span>
                </div>
                {outOfStockCount > 0 && (
                  <div className="inline-flex items-center gap-1.5 px-2.5 py-1 rounded-lg bg-rose-500/30 border border-rose-300/40">
                    <AlertTriangle className="h-3 w-3 text-rose-200" />
                    <span className="text-[10px] font-extrabold text-white">{outOfStockCount} out</span>
                  </div>
                )}
                <div className="inline-flex items-center gap-1.5 px-2.5 py-1 rounded-lg bg-white/10 border border-white/15">
                  <Zap className="h-3 w-3 text-yellow-300" />
                  <span className="text-[10px] font-extrabold uppercase">Fast Search</span>
                </div>
              </div>
            </div>
          </div>

          {/* RETAIL QUICK KEYS BAR */}
          {isRetail && (
            <div className="shrink-0 px-3 pt-3">
              <RetailQuickKeysBar
                onProductAdd={(product) => addProductToCart(product)}
                onComboAdd={handleComboAdd}
                shopId={currentShopId ?? undefined}
              />
            </div>
          )}

          {/* CRITICAL REORDER ALERT */}
          {isRetail && <RetailReorderAlert />}

          {/* Industry POS mode bar (Restaurant / future: Hotel etc.) */}
          <div className="shrink-0 px-3 pt-3 empty:hidden">
            <IndustrySlot slot={(p) => p.pos?.modeBar} />
          </div>

                    {/* SEARCH */}
          <div className="shrink-0 px-5 py-3 bg-slate-50/80 border-b border-slate-100 space-y-2.5">
            <div className="flex gap-2">
              <div className="relative flex-1">
                <Search className="h-4 w-4 text-slate-400 absolute left-3.5 top-1/2 -translate-y-1/2" />
                <input
                  className="h-12 w-full rounded-xl border-2 border-slate-200 bg-white pl-10 pr-10 text-base font-semibold focus:outline-none focus:border-emerald-500 focus:ring-2 focus:ring-emerald-200 transition shadow-sm"
                  placeholder="Search product, roll #, cut piece, SKU, barcode..."
                  value={search}
                  onChange={(e) => setSearch(e.target.value)}
                />
                {search && (
                  <button onClick={() => setSearch('')} className="absolute right-2 top-1/2 -translate-y-1/2 h-7 w-7 rounded-lg hover:bg-slate-100 flex items-center justify-center">
                    <X className="h-3.5 w-3.5 text-slate-500" />
                  </button>
                )}
              </div>

              {prefs.showBarcodeInput && (
                <form onSubmit={handleBarcodeSubmit} className="flex gap-1.5">
                  <div className="relative">
                    <ScanLine className="h-4 w-4 text-emerald-600 absolute left-3 top-1/2 -translate-y-1/2 z-10" />
                    <input
                      ref={barcodeRef}
                      className="h-12 w-48 rounded-xl border-2 border-emerald-400 bg-emerald-50 pl-10 pr-3 text-xs font-mono font-extrabold focus:outline-none focus:border-emerald-600 transition"
                      placeholder="Scan or type..."
                      value={barcodeInput}
                      onChange={(e) => setBarcodeInput(e.target.value)}
                    />
                  </div>
                  <button
                    type="button"
                    onClick={() => setScannerOpen(true)}
                    className="h-12 w-12 rounded-xl bg-gradient-to-br from-slate-900 to-slate-800 hover:from-slate-800 hover:to-slate-700 text-white flex items-center justify-center shadow-lg"
                  >
                    <Camera className="h-4 w-4" />
                  </button>
                </form>
              )}
            </div>

            {/* FAST SEARCH RESULTS */}
            {fastSearch.isActive && (
              <PosUniversalSearchPanel
                query={fastSearch.query}
                products={products}
                rolls={fastSearch.rolls}
                cutPieces={fastSearch.cutPieces}
                onPickProduct={(p) => { addProductToCart(p); setSearch(''); }}
                onPickRoll={({ product, variant, roll }) => {
                  setCarpetPickerData({ product, variant, preSelectedRoll: roll });
                  setSearch('');
                }}
                onPickCutPiece={({ product, variant, piece }) => {
                  handleCutPieceSelect(piece);
                  setSearch('');
                }}
              />
            )}

            {/* CATEGORIES */}
            {prefs.showCategories && categories.length > 0 && !fastSearch.isActive && (
              <div className="flex gap-1.5 overflow-x-auto pb-1">
                <button
                  onClick={() => setSelectedCategoryId('')}
                  className={`shrink-0 px-3 h-9 rounded-xl text-sm font-extrabold transition inline-flex items-center gap-1.5 ${
                    !selectedCategoryId
                      ? 'bg-emerald-600 text-white shadow-md'
                      : 'bg-slate-100 text-slate-700 hover:bg-slate-200'
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
                      className={`shrink-0 px-3 h-9 rounded-xl text-sm font-extrabold inline-flex items-center gap-1.5 transition border-2 ${
                        active ? 'shadow-md' : 'opacity-75 hover:opacity-100'
                      }`}
                      style={{
                        backgroundColor: active ? cat.color : '#fff',
                        borderColor: active ? cat.color : '#e2e8f0',
                        color: active ? '#fff' : '#475569',
                      }}
                    >
                      <span className="h-2 w-2 rounded-full" style={{ backgroundColor: active ? '#fff' : cat.color }} />
                      {cat.name}
                      <span className={`px-1 py-0 rounded text-[10px] ${active ? 'bg-white/20' : 'bg-slate-100 text-slate-600'}`}>
                        {count}
                      </span>
                    </button>
                  );
                })}
              </div>
            )}
          </div>

          {/* PRODUCTS GRID */}
          <div ref={scrollRef} onScroll={handleScroll} className="flex-1 overflow-y-auto p-3 bg-slate-50/30">
            {productsLoading ? (
              <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-4 2xl:grid-cols-5 gap-2.5">
                {Array.from({ length: 12 }).map((_, i) => (
                  <div key={i} className="aspect-[3/4] rounded-xl bg-slate-100 animate-pulse" />
                ))}
              </div>
            ) : filteredProducts.length === 0 ? (
              <div className="flex flex-col items-center justify-center py-20 px-6">
                <div className="h-20 w-20 rounded-3xl bg-slate-100 flex items-center justify-center">
                  <Package className="h-10 w-10 text-slate-400" />
                </div>
                <h3 className="mt-4 font-extrabold text-slate-900 text-lg">No products</h3>
                <p className="mt-1 text-sm text-slate-500 text-center font-semibold">
                  {search ? `No match for "${search}"` : 'Add products first'}
                </p>
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
                    const lowStock = isCarpet ? false : product.stock > 0 && product.stock <= product.lowStockAlert;
                    const primaryImage = product.images?.[0]?.url;
                    const needsImei = productNeedsImei(product);

                    return (
                      <button
                        key={product.id}
                        onClick={() => addProductToCart(product)}
                        disabled={outOfStock}
                        className={`group relative text-left rounded-2xl border-2 overflow-hidden transition-all ${
                          outOfStock
                            ? 'border-slate-200 bg-slate-50 opacity-60 cursor-not-allowed'
                            : inCart
                            ? 'border-emerald-500 bg-emerald-50 shadow-lg ring-2 ring-emerald-200'
                            : 'border-slate-200 bg-white hover:border-emerald-400 hover:shadow-lg hover:-translate-y-0.5'
                        }`}
                      >
                        {inCart && (
                          <div className="absolute -top-2 -right-2 h-7 w-7 rounded-full bg-emerald-600 text-white text-xs font-extrabold flex items-center justify-center shadow-xl ring-2 ring-white z-10">
                            {inCart.quantity}
                          </div>
                        )}

                        {prefs.showProductImages && (
                          <div className="aspect-square bg-slate-100 overflow-hidden relative">
                            {primaryImage ? (
                              <img
                                src={primaryImage}
                                alt={product.name}
                                loading="lazy"
                                className="w-full h-full object-cover group-hover:scale-110 transition-transform duration-500"
                              />
                            ) : (
                              <div className="w-full h-full flex items-center justify-center bg-emerald-50">
                                <Package className="h-10 w-10 text-emerald-400" />
                              </div>
                            )}

                            {prefs.showLowStockBadge && (outOfStock ? (
                              <div className="absolute top-1.5 right-1.5 px-2 py-0.5 rounded-full text-[10px] font-extrabold bg-rose-600 text-white shadow-lg ring-2 ring-white">OUT</div>
                            ) : lowStock ? (
                              <div className="absolute top-1.5 right-1.5 px-2 py-0.5 rounded-full text-[10px] font-extrabold bg-amber-500 text-white shadow-lg ring-2 ring-white animate-pulse">LOW</div>
                            ) : null)}

                            <div className="absolute bottom-1 left-1 flex gap-1 flex-wrap">
                              {isCarpet && (
                                <div className="px-1.5 py-0.5 rounded-md text-[9px] font-extrabold bg-emerald-600 text-white shadow-md inline-flex items-center gap-0.5">
                                  <Layers className="h-2 w-2" /> ROLLS
                                </div>
                              )}
                              {product.hasVariants && !isCarpet && (
                                <div className="px-1.5 py-0.5 rounded-md text-[9px] font-extrabold bg-violet-600 text-white shadow-md">VAR</div>
                              )}
                              {needsImei && (
                                <div className="px-1.5 py-0.5 rounded-md text-[9px] font-extrabold bg-blue-600 text-white shadow-md inline-flex items-center gap-0.5">
                                  <Smartphone className="h-2 w-2" /> IMEI
                                </div>
                              )}
                              {product.isFeatured && prefs.showFeaturedBadge && (
                                <div className="px-1.5 py-0.5 rounded-md text-[9px] font-extrabold bg-amber-500 text-white shadow-md">
                                  <Star className="h-2 w-2 fill-white" />
                                </div>
                              )}
                            </div>

                            {!outOfStock && !inCart && (
                              <div className="absolute inset-0 bg-emerald-900/0 group-hover:bg-emerald-900/10 transition-colors flex items-center justify-center opacity-0 group-hover:opacity-100">
                                <div className="h-10 w-10 rounded-full bg-emerald-600 text-white flex items-center justify-center shadow-xl scale-90 group-hover:scale-100 transition-transform">
                                  <Plus className="h-5 w-5" />
                                </div>
                              </div>
                            )}
                          </div>
                        )}

                        <div className="p-2.5">
                          <div className="font-extrabold text-slate-900 text-sm line-clamp-2 leading-tight min-h-[2.25rem]">
                            {product.name}
                          </div>
                          {product.category && (
                            <span
                              className="mt-1 inline-flex px-1.5 py-0.5 rounded text-[9px] font-extrabold text-white tracking-wide"
                              style={{ backgroundColor: product.category.color }}
                            >
                              {product.category.name}
                            </span>
                          )}
                          <div className="mt-1.5 flex items-end justify-between gap-1">
                            <div>
                              <div className="text-base font-extrabold text-emerald-700 leading-none tabular-nums">
                                {hidePrices ? '••••' : formatPKR(product.price)}
                                {isCarpet && <span className="text-[10px] text-slate-500 ml-0.5 font-bold">/{product.unit}</span>}
                              </div>
                              {!isCarpet && product.wholesalePrice && product.wholesalePrice < product.price && !hidePrices && prefs.showWholesaleBadge && (
                                <div className="text-[10px] text-violet-700 font-bold mt-0.5">
                                  W: {formatPKR(product.wholesalePrice)}
                                </div>
                              )}
                            </div>
                            {prefs.showStockCount && (
                              <div className="text-[10px] text-right shrink-0">
                                {isCarpet ? (
                                  <div>
                                    <div className="text-emerald-700 font-extrabold tabular-nums">
                                      {carpetSqft.toFixed(0)} {product.unit}
                                    </div>
                                    <div className="text-[9px] text-slate-500 font-bold">
                                      {carpetRollCount} roll{carpetRollCount !== 1 ? 's' : ''}
                                    </div>
                                  </div>
                                ) : (
                                  <div className={`font-extrabold tabular-nums ${outOfStock ? 'text-rose-700' : lowStock ? 'text-amber-700' : 'text-slate-700'}`}>
                                    {product.stock.toFixed(product.stock % 1 === 0 ? 0 : 2)} {product.unit}
                                  </div>
                                )}
                              </div>
                            )}
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
                      className="px-5 py-2.5 rounded-xl bg-slate-100 hover:bg-slate-200 text-slate-700 text-sm font-extrabold inline-flex items-center gap-2"
                    >
                      <Package className="h-3.5 w-3.5" />
                      Load more ({filteredProducts.length - visibleCount} remaining)
                    </button>
                  </div>
                )}
              </>
            )}
          </div>
        </section>

        {/* CART SIDE */}
        <aside className="rounded-3xl bg-white border border-slate-200 shadow-sm overflow-hidden flex flex-col">
          <div className="shrink-0 relative overflow-hidden bg-gradient-to-br from-slate-950 via-brand-900 to-brand-700 text-white">
            <div className="absolute -top-10 -right-10 h-32 w-32 rounded-full bg-brand-400/20 blur-2xl" />
            <div className="relative px-5 py-4">
              <div className="flex items-center justify-between gap-3">
                <div className="min-w-0">
                  <div className="inline-flex items-center gap-1.5 rounded-full bg-white/15 px-2.5 py-0.5 text-[10px] font-extrabold uppercase border border-white/20">
                    <Receipt className="h-2.5 w-2.5 text-amber-300" />
                    Cart
                  </div>
                  <h3 className="mt-1.5 text-2xl font-extrabold tabular-nums">
                    {totalItems.toFixed(totalItems % 1 === 0 ? 0 : 2)}
                    <span className="text-sm font-bold text-white/70 ml-1">items</span>
                  </h3>
                  <p className="text-xs text-white/70 mt-0.5 font-semibold">
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
                        className="px-3 py-2 rounded-xl bg-amber-500/30 hover:bg-amber-500/50 text-white text-[11px] font-extrabold inline-flex items-center gap-1.5 border border-amber-300/40 shadow-md"
                      >
                        <Pause className="h-3 w-3" />
                        Hold
                      </button>
                      <button
                        onClick={() => { if (confirm('Clear cart?')) resetCart(); }}
                        className="px-3 py-2 rounded-xl bg-white/15 hover:bg-rose-500/40 text-white text-[11px] font-extrabold border border-white/20"
                      >
                        Clear
                      </button>
                    </>
                  )}
                </div>
              </div>
            </div>
          </div>

          <div className="flex-1 overflow-y-auto bg-slate-50/30">
            <div className="p-3 border-b border-slate-100 bg-white space-y-2">
              <div className="flex items-center justify-between">
                <label className="text-xs font-extrabold uppercase tracking-wider text-slate-600 flex items-center gap-1.5">
                  <User className="h-3 w-3 text-violet-600" />
                  Customer / Khata
                </label>
                <button
                  onClick={() => setShowCustomerAdd(true)}
                  className="text-xs font-extrabold text-violet-600 hover:text-violet-700 inline-flex items-center gap-1"
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
                  className="h-11 w-full rounded-xl border-2 border-slate-200 bg-white pl-9 pr-9 text-sm font-bold focus:outline-none focus:border-violet-500 appearance-none transition"
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

              {selectedCustomer && customerCreditSummary && prefs.showCustomerCredit && (
                <div className="rounded-2xl bg-gradient-to-br from-violet-50 via-white to-amber-50 border-2 border-violet-200 overflow-hidden shadow-sm">
                  <div className="p-2.5 bg-gradient-to-r from-violet-600 to-purple-700 text-white">
                    <div className="flex items-center gap-2">
                      <div className="h-9 w-9 rounded-xl bg-white/20 flex items-center justify-center text-sm font-extrabold ring-2 ring-white/30 shrink-0">
                        {selectedCustomer.name.charAt(0).toUpperCase()}
                      </div>
                      <div className="flex-1 min-w-0">
                        <div className="font-extrabold truncate text-sm flex items-center gap-1">
                          {selectedCustomer.name}
                          {selectedCustomer.isVip && <Crown className="h-3 w-3 text-amber-300 fill-amber-300" />}
                        </div>
                        {selectedCustomer.phone && (
                          <div className="text-[11px] text-white/85 flex items-center gap-1 font-semibold">
                            <Phone className="h-2 w-2" />
                            {selectedCustomer.phone}
                          </div>
                        )}
                      </div>
                      {customerCreditSummary.currentBalance > 0 && (
                        <div className="text-right shrink-0">
                          <div className="text-[9px] text-white/70 font-extrabold uppercase">Udhaar</div>
                          <div className="text-sm font-extrabold text-amber-300 tabular-nums">
                            {formatPKR(customerCreditSummary.currentBalance)}
                          </div>
                        </div>
                      )}
                    </div>
                  </div>
                  <div className="grid grid-cols-3 divide-x divide-violet-100">
                    <div className="p-2 text-center">
                      <div className="text-[9px] text-slate-500 font-extrabold uppercase">Aaj</div>
                      <div className="text-sm font-extrabold text-slate-900 tabular-nums">{customerCreditSummary.todaySalesCount}</div>
                    </div>
                    <div className="p-2 text-center bg-emerald-50/50">
                      <div className="text-[9px] text-emerald-700 font-extrabold uppercase inline-flex items-center gap-0.5">
                        <ArrowDownCircle className="h-2 w-2" />
                        Paid
                      </div>
                      <div className="text-xs font-extrabold text-emerald-700 tabular-nums">{formatPKR(customerCreditSummary.todayPaid)}</div>
                    </div>
                    <div className="p-2 text-center bg-amber-50/50">
                      <div className="text-[9px] text-amber-700 font-extrabold uppercase inline-flex items-center gap-0.5">
                        <ArrowUpCircle className="h-2 w-2" />
                        Udhaar
                      </div>
                      <div className="text-xs font-extrabold text-amber-700 tabular-nums">{formatPKR(customerCreditSummary.todayCredit)}</div>
                    </div>
                  </div>
                </div>
              )}
            </div>

            <div className="p-3 space-y-1.5">
              {cart.length === 0 ? (
                <div className="rounded-2xl bg-white border-2 border-dashed border-slate-200 p-8 text-center">
                  <div className="h-14 w-14 rounded-2xl bg-slate-50 mx-auto flex items-center justify-center">
                    <ShoppingCart className="h-7 w-7 text-slate-400" />
                  </div>
                  <p className="mt-3 font-extrabold text-slate-700 text-base">Cart empty</p>
                  <p className="text-xs text-slate-500 mt-1 font-semibold">
                    Click products or scan barcode
                  </p>
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
              serviceCharges={serviceCharges}
              setServiceCharges={setServiceCharges}
              showServiceCharges={isCarpetBusiness}
              onCheckout={handleCheckout}
              loading={checkoutMutation.isPending}
            />
          )}
        </aside>
      </div>
    </>
  );
}
