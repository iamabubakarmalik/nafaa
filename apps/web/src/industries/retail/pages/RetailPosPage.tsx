import { useState, useMemo, useEffect, useRef, useCallback } from 'react';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import {
  Search, ShoppingCart, Package, X, Plus, Minus, Trash2,
  Camera, ScanLine, User, UserPlus, CheckCircle2, Store,
  ChevronDown, Eye, EyeOff, Grid3x3, ArrowRight, Printer,
  AlertTriangle, Star, RotateCcw, Pause, Play, Percent,
  Wifi, WifiOff, Sparkles, Layers, Zap, Package2,
} from 'lucide-react';
import { toast } from 'sonner';
import { formatPKR } from '@core/lib/format';
import { useAuthStore } from '@core/stores/auth.store';
import { offlineProductsApi as productsApi } from '@core/lib/offline/offlineProducts';
import { offlineCustomersApi as customersApi } from '@core/lib/offline/offlineCustomers';
import { categoriesApi } from '@modules/inventory/categories/api/categories.api';
import { salesApi, type PaymentMethod } from '@modules/sales/sales/api/sales.api';
import type { Product } from '@modules/inventory/products/api/products.api';
import BarcodeScanner from '@core/components/barcode/BarcodeScanner';
import { RetailUnitPicker, RetailQuickCash, type RetailUnitOption } from '../components/pos';
import { productUnitsApi } from '../api/product-units.api';
import { combosApi, type ProductCombo } from '../api/combos.api';
import { quickKeysApi, type QuickKey } from '../api/quick-keys.api';

const HIDE_PRICES_KEY = 'nafaa.retail-pos.hide-prices';
const AUTO_CLOSE_KEY = 'nafaa.retail-pos.auto-close-success';
const VIEW_MODE_KEY = 'nafaa.retail-pos.view-mode';

type ViewMode = 'products' | 'combos' | 'quickkeys';

interface CartLine {
  id: string;
  type: 'product' | 'combo';
  productId?: string;
  comboId?: string;
  name: string;
  image?: string;
  unitName: string;
  unitLabel: string;
  emoji: string;
  unitPrice: number;
  quantity: number;
  baseQuantity: number;
  conversionRate: number;
  baseUnit: string;
  baseStock: number;
  lineTotal: number;
  note?: string;
  comboItems?: any[]; // For combos: original items
  savings?: number;
}

interface HeldCart {
  id: string; lines: CartLine[]; customerId: string; total: number; heldAt: number;
}

const lineId = () => `l-${Date.now()}-${Math.random().toString(36).slice(2, 7)}`;
const heldId = () => `h-${Date.now()}-${Math.random().toString(36).slice(2, 7)}`;

const UNIT_EMOJI: Record<string, string> = {
  kg: '⚖️', gram: '⚖️', g: '⚖️', liter: '🧴', ml: '🧴',
  pcs: '🔢', piece: '🔢', box: '📦', carton: '📦',
  dozen: '🥚', packet: '🎁', bag: '🛍️', bottle: '🍾',
  meter: '📏', feet: '📏',
};
const unitEmoji = (u: string) => UNIT_EMOJI[(u || '').toLowerCase()] ?? '📦';

function deriveUnits(product: Product, apiUnits: any[]): RetailUnitOption[] {
  const base = (product.unit || 'pcs').toLowerCase();
  const out: RetailUnitOption[] = [{
    id: 'base', unitName: base, label: base.toUpperCase(), emoji: unitEmoji(base),
    conversionRate: 1, price: product.price, wholesalePrice: product.wholesalePrice ?? null, isBase: true,
  }];
  for (const u of apiUnits) {
    if (!u?.unitName || u.unitName.toLowerCase() === base) continue;
    out.push({
      id: u.id, unitName: u.unitName, label: u.unitName.toUpperCase(), emoji: unitEmoji(u.unitName),
      conversionRate: Number(u.conversionRate) || 1, price: Number(u.price) || product.price,
      wholesalePrice: u.wholesalePrice ?? null,
    });
  }
  return out;
}

export default function RetailPosPage() {
  const queryClient = useQueryClient();
  const currentShopId = useAuthStore((s) => s.currentShopId);
  const tenant = useAuthStore((s) => s.tenant);

  const [hidePrices, setHidePrices] = useState(() => localStorage.getItem(HIDE_PRICES_KEY) === 'true');
  const [autoClose, setAutoClose] = useState(() => localStorage.getItem(AUTO_CLOSE_KEY) !== 'false');
  const [viewMode, setViewMode] = useState<ViewMode>(() => (localStorage.getItem(VIEW_MODE_KEY) as ViewMode) || 'products');
  const [search, setSearch] = useState('');
  const [debouncedSearch, setDebouncedSearch] = useState('');
  const [categoryId, setCategoryId] = useState('');
  const [cart, setCart] = useState<CartLine[]>([]);
  const [customerId, setCustomerId] = useState('');
  const [discountPct, setDiscountPct] = useState(0);
  const [scannerOpen, setScannerOpen] = useState(false);
  const [barcodeInput, setBarcodeInput] = useState('');
  const [unitPickerProduct, setUnitPickerProduct] = useState<{ product: Product; units: RetailUnitOption[] } | null>(null);
  const [showCheckout, setShowCheckout] = useState(false);
  const [showCustomerAdd, setShowCustomerAdd] = useState(false);
  const [showHeldCarts, setShowHeldCarts] = useState(false);
  const [showMobileCart, setShowMobileCart] = useState(false);
  const [heldCarts, setHeldCarts] = useState<HeldCart[]>([]);
  const [newCustomer, setNewCustomer] = useState({ name: '', phone: '' });
  const [lastSale, setLastSale] = useState<{ id: string; number: string; change: number; total: number } | null>(null);
  const [visibleCount, setVisibleCount] = useState(60);
  const [isOnline, setIsOnline] = useState(navigator.onLine);

  const barcodeRef = useRef<HTMLInputElement>(null);
  const scrollRef = useRef<HTMLDivElement>(null);
  const successTimerRef = useRef<any>(null);

  useEffect(() => { localStorage.setItem(HIDE_PRICES_KEY, String(hidePrices)); }, [hidePrices]);
  useEffect(() => { localStorage.setItem(AUTO_CLOSE_KEY, String(autoClose)); }, [autoClose]);
  useEffect(() => { localStorage.setItem(VIEW_MODE_KEY, viewMode); }, [viewMode]);
  useEffect(() => {
    const t = setTimeout(() => setDebouncedSearch(search), 120);
    return () => clearTimeout(t);
  }, [search]);
  useEffect(() => {
    setVisibleCount(60);
    if (scrollRef.current) scrollRef.current.scrollTop = 0;
  }, [debouncedSearch, categoryId, viewMode]);

  useEffect(() => {
    const onOnline = () => setIsOnline(true);
    const onOffline = () => setIsOnline(false);
    window.addEventListener('online', onOnline);
    window.addEventListener('offline', onOffline);
    return () => {
      window.removeEventListener('online', onOnline);
      window.removeEventListener('offline', onOffline);
    };
  }, []);

  // Auto-focus barcode input — but ONLY if user isn't typing in another field
  useEffect(() => {
    const refocus = () => {
      if (scannerOpen || showCheckout || unitPickerProduct || showCustomerAdd || showHeldCarts || lastSale) return;
      // Don't steal focus if user is typing in ANY input, textarea, or select
      const active = document.activeElement as HTMLElement | null;
      if (active && active !== barcodeRef.current) {
        const tag = active.tagName;
        if (tag === 'INPUT' || tag === 'TEXTAREA' || tag === 'SELECT' || active.isContentEditable) {
          return;
        }
      }
      barcodeRef.current?.focus();
    };
    // Only initial focus — remove the interval that keeps stealing focus
    const t = setTimeout(refocus, 300);
    return () => clearTimeout(t);
  }, [scannerOpen, showCheckout, unitPickerProduct, showCustomerAdd, showHeldCarts, lastSale]);

  // Keyboard shortcuts
  useEffect(() => {
    const handler = (e: KeyboardEvent) => {
      if (e.key === 'F2') { e.preventDefault(); setScannerOpen(true); }
      if (e.key === 'F9') { e.preventDefault(); if (cart.length > 0) setShowCheckout(true); }
      if (e.key === 'F7') { e.preventDefault(); setViewMode('products'); }
      if (e.key === 'F8') { e.preventDefault(); setViewMode('combos'); }
      if (e.key === 'F10') { e.preventDefault(); setViewMode('quickkeys'); }
      if (e.key === 'Escape') {
        if (scannerOpen) setScannerOpen(false);
        if (showCheckout) setShowCheckout(false);
        if (unitPickerProduct) setUnitPickerProduct(null);
        if (showMobileCart) setShowMobileCart(false);
      }
    };
    window.addEventListener('keydown', handler);
    return () => window.removeEventListener('keydown', handler);
  }, [cart.length, scannerOpen, showCheckout, unitPickerProduct, showMobileCart]);

  // Data fetches
  const { data: productsData, isLoading: loadingProducts } = useQuery({
    queryKey: ['products-for-retail-pos'],
    queryFn: () => productsApi.list({ page: 1, limit: 2000 }),
    staleTime: 30_000,
  });
  const { data: customersData } = useQuery({
    queryKey: ['customers-for-pos'],
    queryFn: () => customersApi.list({ page: 1, limit: 500 }),
    staleTime: 60_000,
  });
  const { data: categories = [] } = useQuery({
    queryKey: ['categories'],
    queryFn: categoriesApi.list,
    staleTime: 5 * 60_000,
  });
  const { data: combos = [], isLoading: loadingCombos } = useQuery({
    queryKey: ['pos-combos'],
    queryFn: () => combosApi.list({ status: 'ACTIVE' }),
    staleTime: 60_000,
  });
  const { data: quickKeys = [] } = useQuery({
    queryKey: ['pos-quick-keys'],
    queryFn: () => quickKeysApi.list(),
    staleTime: 60_000,
  });

  const products: Product[] = productsData?.items ?? [];
  const customers = customersData?.items ?? [];
  const selectedCustomer = customers.find((c) => c.id === customerId);

  // Filters
  const filteredProducts = useMemo(() => {
    let list = products.filter((p) => p.isActive !== false);
    if (categoryId) list = list.filter((p) => p.categoryId === categoryId);
    const q = debouncedSearch.toLowerCase().trim();
    if (q) {
      list = list.filter((p) =>
        p.name.toLowerCase().includes(q) ||
        (p.sku || '').toLowerCase().includes(q) ||
        (p.barcode || '').toLowerCase().includes(q)
      );
    }
    return list.sort((a, b) => {
      if (a.isFeatured !== b.isFeatured) return a.isFeatured ? -1 : 1;
      const aOut = a.stock <= 0, bOut = b.stock <= 0;
      if (aOut !== bOut) return aOut ? 1 : -1;
      return a.name.localeCompare(b.name);
    });
  }, [products, debouncedSearch, categoryId]);

  const filteredCombos = useMemo(() => {
    const q = debouncedSearch.toLowerCase().trim();
    let list = combos;
    if (q) {
      list = list.filter((c) =>
        c.name.toLowerCase().includes(q) ||
        (c.sku || '').toLowerCase().includes(q) ||
        (c.tagLine || '').toLowerCase().includes(q)
      );
    }
    return [...list].sort((a, b) => {
      if (a.isFeatured !== b.isFeatured) return a.isFeatured ? -1 : 1;
      return b.savingsPercentage - a.savingsPercentage;
    });
  }, [combos, debouncedSearch]);

  const groupedQuickKeys = useMemo(() => {
    const q = debouncedSearch.toLowerCase().trim();
    let list = quickKeys.filter((k) => k.isActive);
    if (q) list = list.filter((k) => k.label.toLowerCase().includes(q));
    const groups: Record<string, QuickKey[]> = {};
    list.forEach((k) => {
      const g = k.group || 'General';
      if (!groups[g]) groups[g] = [];
      groups[g].push(k);
    });
    return groups;
  }, [quickKeys, debouncedSearch]);

  const visibleProducts = useMemo(() => filteredProducts.slice(0, visibleCount), [filteredProducts, visibleCount]);
  const hasMore = filteredProducts.length > visibleCount;

  const categoryCounts = useMemo(() => {
    const counts: Record<string, number> = {};
    products.forEach((p) => { if (p.categoryId) counts[p.categoryId] = (counts[p.categoryId] || 0) + 1; });
    return counts;
  }, [products]);

  // Cart totals
  const subtotal = useMemo(() => cart.reduce((s, l) => s + l.lineTotal, 0), [cart]);
  const discountAmount = useMemo(() => (subtotal * discountPct) / 100, [subtotal, discountPct]);
  const total = useMemo(() => subtotal - discountAmount, [subtotal, discountAmount]);
  const totalSavings = useMemo(() => cart.reduce((s, l) => s + (l.savings || 0) * l.quantity, 0), [cart]);
  const itemCount = cart.length;
  const totalQty = useMemo(() => cart.reduce((s, l) => s + l.quantity, 0), [cart]);

  // ═══ PRODUCT ADD FLOW ═══
  const openProduct = useCallback(async (product: Product) => {
    if (product.stock <= 0) { toast.error(`${product.name} — stock khatam`); return; }
    let apiUnits: any[] = [];
    try {
      const res = await productUnitsApi.byProduct(product.id);
      apiUnits = Array.isArray(res) ? res : ((res as any)?.items ?? []);
    } catch {}
    const units = deriveUnits(product, apiUnits);
    // Multi-unit? Open picker. Single-unit? Direct add.
    if (units.length > 1) {
      setUnitPickerProduct({ product, units });
      return;
    }
    addProductLine(product, units[0], 1);
  }, []);

  const addProductLine = (product: Product, unit: RetailUnitOption, qty: number) => {
    const baseQty = qty * unit.conversionRate;
    const existing = cart.find((l) => l.productId === product.id && l.unitName === unit.unitName);
    if (existing) {
      const newQty = existing.quantity + qty;
      const newBaseQty = newQty * unit.conversionRate;
      if (newBaseQty > product.stock) { toast.error(`Stock sirf ${product.stock} ${product.unit}`); return; }
      setCart((prev) => prev.map((l) => l.id === existing.id
        ? { ...l, quantity: newQty, baseQuantity: newBaseQty, lineTotal: newQty * l.unitPrice } : l));
      toast.success(`${product.name} +${qty}`, { duration: 900 });
      return;
    }
    setCart((prev) => [...prev, {
      id: lineId(),
      type: 'product',
      productId: product.id,
      name: product.name,
      image: product.images?.[0]?.url,
      unitName: unit.unitName,
      unitLabel: unit.label,
      emoji: unit.emoji,
      unitPrice: unit.price,
      quantity: qty,
      baseQuantity: baseQty,
      conversionRate: unit.conversionRate,
      baseUnit: product.unit,
      baseStock: product.stock,
      lineTotal: qty * unit.price,
      note: unit.conversionRate !== 1 ? `${qty} ${unit.unitName} = ${baseQty.toFixed(2)} ${product.unit}` : undefined,
    }]);
    toast.success(`${product.name} — ${qty} ${unit.unitName}`, { duration: 900 });
  };

  // ═══ COMBO ADD FLOW ═══
  const addCombo = (combo: ProductCombo, qty: number = 1) => {
    // Check stock for each item in combo
    for (const item of combo.items) {
      const product = products.find((p) => p.id === item.productId);
      if (!product) continue;
      const needed = Number(item.quantity) * qty;
      if (product.stock < needed) {
        toast.error(`${product.name} — stock sirf ${product.stock}, chahiye ${needed}`);
        return;
      }
    }

    const existing = cart.find((l) => l.comboId === combo.id);
    if (existing) {
      setCart((prev) => prev.map((l) => l.id === existing.id
        ? { ...l, quantity: l.quantity + qty, lineTotal: (l.quantity + qty) * l.unitPrice } : l));
      toast.success(`${combo.name} +${qty}`, { duration: 900 });
      return;
    }
    setCart((prev) => [...prev, {
      id: lineId(),
      type: 'combo',
      comboId: combo.id,
      name: combo.name,
      image: combo.imageUrl,
      unitName: 'combo',
      unitLabel: 'COMBO',
      emoji: '🎁',
      unitPrice: Number(combo.comboPrice),
      quantity: qty,
      baseQuantity: qty,
      conversionRate: 1,
      baseUnit: 'combo',
      baseStock: 9999,
      lineTotal: qty * Number(combo.comboPrice),
      comboItems: combo.items,
      savings: Number(combo.savingsAmount || 0),
      note: `${combo.items.length} items combo${combo.savingsAmount > 0 ? ` • Save ${formatPKR(combo.savingsAmount)}` : ''}`,
    }]);
    toast.success(`🎁 ${combo.name} added`, { duration: 900 });
  };

  // ═══ QUICK KEY ADD FLOW ═══
  const addQuickKey = async (qk: QuickKey) => {
    if (qk.comboId) {
      const combo = combos.find((c) => c.id === qk.comboId);
      if (combo) return addCombo(combo, 1);
      toast.error('Combo nahi mila');
      return;
    }
    if (qk.productId) {
      const product = products.find((p) => p.id === qk.productId);
      if (product) return openProduct(product);
      toast.error('Product nahi mila');
      return;
    }
    toast.error('Quick key configured nahi hai');
  };

  const changeQty = (id: string, delta: number) => {
    setCart((prev) => prev.flatMap((l) => {
      if (l.id !== id) return [l];
      const step = l.unitName.toLowerCase() === 'kg' || l.unitName.toLowerCase() === 'liter' ? 0.5 : 1;
      const nextQty = Number((l.quantity + delta * step).toFixed(3));
      if (nextQty <= 0) return [];
      const nextBase = nextQty * l.conversionRate;
      if (l.type === 'product' && nextBase > l.baseStock) { toast.error(`Stock sirf ${l.baseStock} ${l.baseUnit}`); return [l]; }
      return [{ ...l, quantity: nextQty, baseQuantity: nextBase, lineTotal: nextQty * l.unitPrice }];
    }));
  };

  const setQtyDirect = (id: string, qty: number) => {
    setCart((prev) => prev.flatMap((l) => {
      if (l.id !== id) return [l];
      if (qty <= 0) return [];
      const nextBase = qty * l.conversionRate;
      if (l.type === 'product' && nextBase > l.baseStock) { toast.error(`Stock sirf ${l.baseStock} ${l.baseUnit}`); return [l]; }
      return [{ ...l, quantity: qty, baseQuantity: nextBase, lineTotal: qty * l.unitPrice }];
    }));
  };

  const removeLine = (id: string) => setCart((prev) => prev.filter((l) => l.id !== id));
  const clearCart = () => { setCart([]); setCustomerId(''); setDiscountPct(0); };

  // ═══ BARCODE — try product first, then combo ═══
  const handleBarcode = async (code: string) => {
    setScannerOpen(false);
    const trimmed = code.trim();
    if (!trimmed) return;

    // Try combo barcode first
    const comboMatch = combos.find((c) => c.barcode === trimmed || c.sku === trimmed);
    if (comboMatch) {
      addCombo(comboMatch, 1);
      return;
    }

    // Fall back to product barcode
    try {
      const product = await productsApi.byBarcode(trimmed);
      await openProduct(product);
    } catch { toast.error(`Barcode "${trimmed}" nahi mila`); }
  };

  const holdCart = () => {
    if (cart.length === 0) return;
    setHeldCarts((prev) => [...prev, { id: heldId(), lines: cart, customerId, total, heldAt: Date.now() }]);
    clearCart();
    toast.success('Cart hold ho gaya');
  };

  const resumeCart = (held: HeldCart) => {
    setCart(held.lines);
    setCustomerId(held.customerId);
    setHeldCarts((prev) => prev.filter((h) => h.id !== held.id));
    setShowHeldCarts(false);
    toast.success('Cart resume ho gaya');
  };

  const deleteHeld = (id: string) => setHeldCarts((prev) => prev.filter((h) => h.id !== id));

  const addCustomerMutation = useMutation({
    mutationFn: customersApi.create,
    onSuccess: (c) => {
      toast.success(`${c.name} add ho gaya`);
      setCustomerId(c.id);
      setShowCustomerAdd(false);
      setNewCustomer({ name: '', phone: '' });
      queryClient.invalidateQueries({ queryKey: ['customers-for-pos'] });
    },
    onError: (e: any) => toast.error(e?.response?.data?.message || 'Add fail'),
  });

  const closeSuccessModal = useCallback(() => {
    if (successTimerRef.current) {
      clearTimeout(successTimerRef.current);
      successTimerRef.current = null;
    }
    setLastSale(null);
    setTimeout(() => barcodeRef.current?.focus(), 100);
  }, []);

  const checkoutMutation = useMutation({
    mutationFn: (data: { paymentMethod: PaymentMethod; paidAmount: number }) => {
      if (!currentShopId) throw new Error('Shop select karein');
      // Expand combos into their items for the sale
      const items: any[] = [];
      cart.forEach((l) => {
        if (l.type === 'combo' && l.comboItems) {
          const comboPricePerItem = l.unitPrice / l.comboItems.reduce((s: number, it: any) => s + Number(it.quantity || 0) * (Number(it.originalPrice) || 0), 0);
          l.comboItems.forEach((ci: any) => {
            const origPrice = Number(ci.originalPrice) || 0;
            const discountedPrice = origPrice * comboPricePerItem;
            items.push({
              productId: ci.productId,
              variantId: ci.variantId,
              quantity: Number(ci.quantity) * l.quantity,
              priceOverride: isFinite(discountedPrice) && discountedPrice > 0 ? discountedPrice : origPrice,
              note: `Part of combo: ${l.name}`,
            });
          });
        } else if (l.type === 'product' && l.productId) {
          items.push({
            productId: l.productId,
            quantity: l.baseQuantity,
            priceOverride: l.unitPrice / l.conversionRate,
            note: l.note,
          });
        }
      });

      return salesApi.create({
        shopId: currentShopId,
        customerId: customerId || undefined,
        paymentMethod: data.paymentMethod,
        paidAmount: data.paidAmount,
        discount: discountAmount,
        items,
      });
    },
    onSuccess: (sale, vars) => {
      const change = Math.max(vars.paidAmount - total, 0);
      setLastSale({ id: sale.id, number: sale.saleNumber, change, total });
      setShowCheckout(false);
      setShowMobileCart(false);
      clearCart();
      queryClient.invalidateQueries({ queryKey: ['products-for-retail-pos'] });
      queryClient.invalidateQueries({ queryKey: ['sales-list'] });
      queryClient.invalidateQueries({ queryKey: ['pos-combos'] });
      const autoOpenReceipt = localStorage.getItem('nafaa.pos.auto-open-receipt') !== 'false';
      if (autoOpenReceipt) window.open(`/sales/${sale.id}/receipt?auto=1`, '_blank');

      if (autoClose) {
        successTimerRef.current = setTimeout(() => {
          setLastSale(null);
          setTimeout(() => barcodeRef.current?.focus(), 100);
        }, 3500);
      }
    },
    onError: (e: any) => toast.error(e?.response?.data?.message || 'Sale fail'),
  });

  const handleScroll = useCallback((e: React.UIEvent<HTMLDivElement>) => {
    if (!hasMore || viewMode !== 'products') return;
    const t = e.currentTarget;
    if ((t.scrollTop + t.clientHeight) / t.scrollHeight > 0.85) {
      setVisibleCount((c) => Math.min(c + 60, filteredProducts.length));
    }
  }, [hasMore, filteredProducts.length, viewMode]);

  const isLoading = viewMode === 'products' ? loadingProducts : viewMode === 'combos' ? loadingCombos : false;

  return (
    <>
      {scannerOpen && <BarcodeScanner onDetected={handleBarcode} onClose={() => setScannerOpen(false)} />}

      {unitPickerProduct && (
        <RetailUnitPicker
          productName={unitPickerProduct.product.name}
          productImage={unitPickerProduct.product.images?.[0]?.url}
          baseUnit={unitPickerProduct.product.unit}
          basePrice={unitPickerProduct.product.price}
          baseStock={unitPickerProduct.product.stock}
          units={unitPickerProduct.units}
          onConfirm={({ unit, quantity }) => { addProductLine(unitPickerProduct.product, unit, quantity); setUnitPickerProduct(null); }}
          onClose={() => setUnitPickerProduct(null)}
        />
      )}

      {showCheckout && (
        <RetailQuickCash
          total={total}
          itemCount={itemCount}
          loading={checkoutMutation.isPending}
          customerName={selectedCustomer?.name}
          customerBalance={Number(selectedCustomer?.balance || 0)}
          hasCustomer={!!customerId}
          onConfirm={({ paymentMethod, paidAmount }) => checkoutMutation.mutate({ paymentMethod, paidAmount })}
          onClose={() => setShowCheckout(false)}
        />
      )}

      {lastSale && (
        <div className="fixed inset-0 z-50 bg-slate-950/80 backdrop-blur-sm flex items-center justify-center p-4" onClick={closeSuccessModal}>
          <div className="w-full max-w-md bg-white rounded-3xl shadow-2xl overflow-hidden animate-in fade-in zoom-in duration-200" onClick={(e) => e.stopPropagation()}>
            <div className="relative px-6 py-8 bg-gradient-to-br from-emerald-500 to-green-600 text-white text-center">
              <button onClick={closeSuccessModal} className="absolute top-3 right-3 h-10 w-10 rounded-2xl bg-white/20 hover:bg-white/30 active:scale-90 flex items-center justify-center transition">
                <X className="h-5 w-5" />
              </button>
              <div className="h-20 w-20 rounded-full bg-white/20 mx-auto flex items-center justify-center mb-3">
                <CheckCircle2 className="h-12 w-12" />
              </div>
              <h3 className="text-3xl font-extrabold">Sale Ho Gayi! 🎉</h3>
              <p className="text-sm font-bold text-white/90 mt-1 font-mono">{lastSale.number}</p>
            </div>
            {lastSale.change > 0 && (
              <div className="px-6 py-5 bg-amber-50 border-b-4 border-amber-200 text-center">
                <div className="text-xs uppercase font-extrabold text-amber-800 tracking-wider">Customer ko wapis dein</div>
                <div className="text-5xl font-extrabold text-amber-700 tabular-nums mt-1">{formatPKR(lastSale.change)}</div>
              </div>
            )}
            <div className="p-4 grid grid-cols-2 gap-2">
              <button onClick={() => window.open(`/sales/${lastSale.id}/receipt`, '_blank')} className="h-14 rounded-2xl bg-slate-100 hover:bg-slate-200 active:scale-95 font-extrabold text-slate-700 transition inline-flex items-center justify-center gap-2">
                <Printer className="h-5 w-5" /> Receipt
              </button>
              <button onClick={closeSuccessModal} className="h-14 rounded-2xl bg-gradient-to-r from-sky-600 to-cyan-600 hover:from-sky-700 hover:to-cyan-700 active:scale-95 font-extrabold text-white text-lg shadow-lg transition inline-flex items-center justify-center gap-2">
                Nayi Sale <ArrowRight className="h-5 w-5" />
              </button>
            </div>
            {autoClose && (
              <div className="px-4 pb-3 text-center text-[11px] font-bold text-slate-400">
                ⏱️ 3.5 second me khud band ho jayega
              </div>
            )}
          </div>
        </div>
      )}

      {showCustomerAdd && (
        <div className="fixed inset-0 z-50 bg-slate-950/80 backdrop-blur-sm flex items-center justify-center p-4">
          <div className="w-full max-w-md bg-white rounded-3xl shadow-2xl overflow-hidden">
            <div className="px-5 py-4 bg-gradient-to-br from-violet-600 to-purple-700 text-white flex items-center justify-between">
              <div className="flex items-center gap-2">
                <UserPlus className="h-6 w-6" />
                <h3 className="font-extrabold text-xl">Naya Customer</h3>
              </div>
              <button onClick={() => setShowCustomerAdd(false)} className="h-11 w-11 rounded-2xl bg-white/15 hover:bg-white/25 active:scale-95 flex items-center justify-center">
                <X className="h-5 w-5" />
              </button>
            </div>
            <div className="p-5 space-y-3">
              <input autoFocus value={newCustomer.name} onChange={(e) => setNewCustomer({ ...newCustomer, name: e.target.value })}
                placeholder="Customer ka naam"
                className="h-16 w-full rounded-2xl border-4 border-slate-200 px-4 text-xl font-bold focus:outline-none focus:border-violet-500" />
              <input value={newCustomer.phone} onChange={(e) => setNewCustomer({ ...newCustomer, phone: e.target.value })}
                placeholder="03XX XXXXXXX"
                className="h-16 w-full rounded-2xl border-4 border-slate-200 px-4 text-xl font-bold focus:outline-none focus:border-violet-500" />
              <button onClick={() => {
                if (!newCustomer.name.trim()) return toast.error('Naam likhein');
                addCustomerMutation.mutate({ name: newCustomer.name.trim(), phone: newCustomer.phone.trim() || undefined });
              }} disabled={addCustomerMutation.isPending}
                className="w-full h-16 rounded-2xl bg-gradient-to-r from-violet-600 to-purple-700 hover:from-violet-700 active:scale-95 font-extrabold text-white text-xl shadow-lg transition disabled:opacity-50">
                Add Karein
              </button>
            </div>
          </div>
        </div>
      )}

      {showHeldCarts && (
        <div className="fixed inset-0 z-50 bg-slate-950/80 backdrop-blur-sm flex items-center justify-center p-4">
          <div className="w-full max-w-lg bg-white rounded-3xl shadow-2xl overflow-hidden max-h-[85vh] flex flex-col">
            <div className="px-5 py-4 bg-gradient-to-br from-amber-600 to-orange-700 text-white flex items-center justify-between">
              <div className="flex items-center gap-2">
                <Pause className="h-6 w-6" />
                <h3 className="font-extrabold text-xl">Hold Carts</h3>
              </div>
              <button onClick={() => setShowHeldCarts(false)} className="h-11 w-11 rounded-2xl bg-white/15 hover:bg-white/25 flex items-center justify-center">
                <X className="h-5 w-5" />
              </button>
            </div>
            <div className="flex-1 overflow-y-auto p-4 space-y-3">
              {heldCarts.length === 0 ? (
                <div className="text-center py-12">
                  <Pause className="h-12 w-12 text-slate-300 mx-auto mb-2" />
                  <p className="font-extrabold text-slate-700">Koi hold cart nahi</p>
                </div>
              ) : heldCarts.map((h) => (
                <div key={h.id} className="rounded-2xl border-2 border-slate-200 p-3 flex items-center gap-3">
                  <div className="h-12 w-12 rounded-xl bg-amber-100 text-amber-700 flex items-center justify-center shrink-0">
                    <ShoppingCart className="h-6 w-6" />
                  </div>
                  <div className="flex-1 min-w-0">
                    <div className="font-extrabold text-slate-900 text-sm">{h.lines.length} items • {formatPKR(h.total)}</div>
                    <div className="text-xs text-slate-500 font-bold">
                      {new Date(h.heldAt).toLocaleTimeString('en-PK', { hour: '2-digit', minute: '2-digit' })}
                    </div>
                  </div>
                  <button onClick={() => resumeCart(h)} className="h-10 px-4 rounded-xl bg-emerald-600 hover:bg-emerald-700 text-white text-xs font-extrabold inline-flex items-center gap-1">
                    <Play className="h-3.5 w-3.5" /> Resume
                  </button>
                  <button onClick={() => deleteHeld(h.id)} className="h-10 w-10 rounded-xl bg-rose-50 hover:bg-rose-100 text-rose-600 flex items-center justify-center">
                    <Trash2 className="h-4 w-4" />
                  </button>
                </div>
              ))}
            </div>
          </div>
        </div>
      )}

      {/* ═══ MAIN LAYOUT ═══ */}
      <div className="min-h-[calc(100dvh-5rem)] lg:h-[calc(100dvh-7rem)] flex flex-col lg:grid lg:grid-cols-[1fr_400px] xl:grid-cols-[1fr_440px] gap-2 lg:gap-3">

        {/* ═══ PRODUCTS/COMBOS/QUICKKEYS PANEL ═══ */}
        <section className="lg:flex-1 rounded-2xl lg:rounded-3xl bg-white border-2 border-slate-200 shadow-sm lg:overflow-hidden flex flex-col lg:min-h-0">

          {/* Header */}
          <div className="shrink-0 relative overflow-hidden bg-gradient-to-br from-slate-950 via-sky-900 to-cyan-700 text-white">
            <div className="absolute -top-10 -right-10 h-32 w-32 rounded-full bg-sky-400/20 blur-2xl" />
            <div className="relative px-3 sm:px-4 py-2.5 flex items-center justify-between gap-2">
              <div className="flex items-center gap-2 sm:gap-3 min-w-0">
                <div className="h-10 w-10 sm:h-11 sm:w-11 rounded-2xl bg-white/15 backdrop-blur flex items-center justify-center ring-2 ring-white/20 shrink-0">
                  <ShoppingCart className="h-5 w-5 sm:h-6 sm:w-6" />
                </div>
                <div className="min-w-0">
                  <div className="flex items-center gap-2">
                    <h2 className="text-base sm:text-lg font-extrabold leading-none">🛒 POS</h2>
                    {isOnline ? (
                      <div className="h-6 w-6 rounded-full bg-emerald-500/30 flex items-center justify-center">
                        <Wifi className="h-3 w-3 text-emerald-200" />
                      </div>
                    ) : (
                      <div className="h-6 w-6 rounded-full bg-amber-500/30 flex items-center justify-center">
                        <WifiOff className="h-3 w-3 text-amber-200" />
                      </div>
                    )}
                  </div>
                  <p className="text-[11px] sm:text-xs text-white/80 font-semibold mt-0.5 flex items-center gap-1 truncate">
                    <Store className="h-3 w-3 shrink-0" />
                    <span className="truncate">{tenant?.name || 'My Shop'}</span>
                  </p>
                </div>
              </div>
              <div className="flex items-center gap-1.5 shrink-0">
                {heldCarts.length > 0 && (
                  <button onClick={() => setShowHeldCarts(true)}
                    className="h-10 sm:h-11 px-2.5 rounded-2xl bg-amber-500/30 hover:bg-amber-500/50 text-white text-xs font-extrabold inline-flex items-center gap-1 border-2 border-amber-300/40 transition active:scale-95">
                    <Pause className="h-4 w-4" /> {heldCarts.length}
                  </button>
                )}
                <button onClick={() => setHidePrices((v) => !v)}
                  className="h-10 w-10 sm:h-11 sm:w-11 rounded-2xl bg-white/15 hover:bg-white/25 active:scale-95 flex items-center justify-center border-2 border-white/20 transition">
                  {hidePrices ? <EyeOff className="h-5 w-5" /> : <Eye className="h-5 w-5" />}
                </button>
                <button onClick={() => setShowMobileCart(true)}
                  className="lg:hidden relative h-10 w-10 rounded-2xl bg-emerald-500 hover:bg-emerald-600 active:scale-95 flex items-center justify-center transition">
                  <ShoppingCart className="h-5 w-5" />
                  {itemCount > 0 && (
                    <span className="absolute -top-1 -right-1 min-w-[20px] h-5 px-1 rounded-full bg-rose-500 text-white text-[10px] font-extrabold flex items-center justify-center">
                      {itemCount}
                    </span>
                  )}
                </button>
              </div>
            </div>
          </div>

          {/* ═══ VIEW MODE TABS — Products / Combos / Quick Keys ═══ */}
          <div className="shrink-0 px-3 sm:px-4 pt-3 bg-slate-50 border-b-2 border-slate-100">
            <div className="flex gap-1.5 bg-white rounded-2xl border-2 border-slate-200 p-1">
              <ViewTab
                active={viewMode === 'products'}
                onClick={() => setViewMode('products')}
                icon={Package}
                label="Products"
                count={products.length}
                color="sky"
                shortcut="F7"
              />
              <ViewTab
                active={viewMode === 'combos'}
                onClick={() => setViewMode('combos')}
                icon={Sparkles}
                label="Combos"
                count={combos.length}
                color="violet"
                shortcut="F8"
                highlight={combos.length > 0}
              />
              <ViewTab
                active={viewMode === 'quickkeys'}
                onClick={() => setViewMode('quickkeys')}
                icon={Zap}
                label="Quick"
                count={quickKeys.length}
                color="amber"
                shortcut="F10"
              />
            </div>
          </div>

          {/* Search + Barcode */}
          <div className="shrink-0 px-3 sm:px-4 py-2.5 bg-slate-50 border-b-2 border-slate-100 space-y-2">
            <div className="flex gap-2">
              <div className="relative flex-1">
                <Search className="h-5 w-5 sm:h-6 sm:w-6 text-slate-400 absolute left-3 sm:left-4 top-1/2 -translate-y-1/2" />
                <input
                  className="h-14 sm:h-16 w-full rounded-2xl border-4 border-slate-200 bg-white pl-11 sm:pl-14 pr-10 sm:pr-12 text-lg sm:text-xl font-bold focus:outline-none focus:border-sky-500 focus:ring-4 focus:ring-sky-200 transition"
                  placeholder={viewMode === 'products' ? 'Cheez ka naam...' : viewMode === 'combos' ? 'Combo naam...' : 'Quick key...'}
                  value={search}
                  onChange={(e) => setSearch(e.target.value)}
                />
                {search && (
                  <button onClick={() => setSearch('')} className="absolute right-2.5 top-1/2 -translate-y-1/2 h-9 w-9 sm:h-10 sm:w-10 rounded-xl hover:bg-slate-100 active:scale-95 flex items-center justify-center transition">
                    <X className="h-5 w-5 text-slate-500" />
                  </button>
                )}
              </div>
              <button onClick={() => setScannerOpen(true)}
                className="h-14 sm:h-16 w-16 sm:w-20 rounded-2xl bg-gradient-to-br from-slate-900 to-slate-800 hover:from-slate-800 active:scale-95 text-white flex flex-col items-center justify-center gap-0.5 shadow-lg transition shrink-0">
                <Camera className="h-5 w-5 sm:h-6 sm:w-6" />
                <span className="text-[9px] sm:text-[10px] font-extrabold uppercase">Scan</span>
              </button>
            </div>

            <form onSubmit={(e) => { e.preventDefault(); if (barcodeInput.trim()) { handleBarcode(barcodeInput); setBarcodeInput(''); } }} className="relative">
              <ScanLine className="h-4 w-4 sm:h-5 sm:w-5 text-emerald-600 absolute left-3 top-1/2 -translate-y-1/2" />
              <input ref={barcodeRef} value={barcodeInput} onChange={(e) => setBarcodeInput(e.target.value)}
                placeholder="Barcode gun ready... (product ya combo dono kaam karte hain)"
                className="h-10 sm:h-12 w-full rounded-2xl border-2 border-emerald-300 bg-emerald-50 pl-10 sm:pl-11 pr-3 text-sm sm:text-base font-mono font-extrabold focus:outline-none focus:border-emerald-600 focus:ring-2 focus:ring-emerald-200" />
            </form>

            {/* Categories — only in products view */}
            {viewMode === 'products' && categories.length > 0 && (
              <div className="flex gap-1.5 overflow-x-auto pb-1 -mx-1 px-1">
                <button onClick={() => setCategoryId('')}
                  className={['shrink-0 h-9 sm:h-10 px-3 rounded-xl text-xs sm:text-sm font-extrabold inline-flex items-center gap-1.5 border-2 transition active:scale-95',
                    !categoryId ? 'bg-sky-600 text-white border-sky-600 shadow-md' : 'bg-white text-slate-700 border-slate-200 hover:border-sky-300'].join(' ')}>
                  <Grid3x3 className="h-3.5 w-3.5" /> Sab
                  <span className={['px-1.5 rounded-md text-[10px]', !categoryId ? 'bg-white/20' : 'bg-slate-100'].join(' ')}>{products.length}</span>
                </button>
                {categories.map((cat: any) => {
                  const count = categoryCounts[cat.id] || 0;
                  if (count === 0) return null;
                  const active = categoryId === cat.id;
                  return (
                    <button key={cat.id} onClick={() => setCategoryId(active ? '' : cat.id)}
                      className="shrink-0 h-9 sm:h-10 px-3 rounded-xl text-xs sm:text-sm font-extrabold inline-flex items-center gap-1.5 border-2 transition active:scale-95"
                      style={{ backgroundColor: active ? cat.color : '#fff', borderColor: active ? cat.color : '#e2e8f0', color: active ? '#fff' : '#334155' }}>
                      <span className="h-2 w-2 rounded-full" style={{ backgroundColor: active ? '#fff' : cat.color }} />
                      {cat.name}
                      <span className={['px-1.5 rounded-md text-[10px]', active ? 'bg-white/20' : 'bg-slate-100 text-slate-600'].join(' ')}>{count}</span>
                    </button>
                  );
                })}
              </div>
            )}
          </div>

          {/* ═══ CONTENT GRID ═══ */}
          <div ref={scrollRef} onScroll={handleScroll} className="lg:flex-1 lg:overflow-y-auto p-2 sm:p-3 bg-slate-50/50 lg:min-h-0">
            {isLoading ? (
              <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 lg:grid-cols-3 xl:grid-cols-4 2xl:grid-cols-5 gap-2 sm:gap-3">
                {Array.from({ length: 12 }).map((_, i) => <div key={i} className="aspect-[3/4] rounded-2xl bg-slate-200 animate-pulse" />)}
              </div>
            ) : viewMode === 'products' ? (
              filteredProducts.length === 0 ? (
                <EmptyState icon={Package} title="Kuch nahi mila" hint={search ? `"${search}" ka koi product nahi` : 'Pehle products add karein'} onClear={search ? () => setSearch('') : undefined} />
              ) : (
                <>
                  <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 lg:grid-cols-3 xl:grid-cols-4 2xl:grid-cols-5 gap-2 sm:gap-3">
                    {visibleProducts.map((p) => (
                      <ProductTile key={p.id} product={p} cart={cart} hidePrices={hidePrices} onClick={() => openProduct(p)} />
                    ))}
                  </div>
                  {hasMore && (
                    <button onClick={() => setVisibleCount((c) => c + 60)}
                      className="mt-3 w-full h-12 rounded-2xl bg-white border-4 border-slate-200 hover:border-sky-400 active:scale-[0.98] text-slate-700 text-sm font-extrabold inline-flex items-center justify-center gap-2 transition">
                      <Package className="h-4 w-4" /> Aur dikhaein ({filteredProducts.length - visibleCount} baqi)
                    </button>
                  )}
                </>
              )
            ) : viewMode === 'combos' ? (
              filteredCombos.length === 0 ? (
                <EmptyState icon={Sparkles} title="Koi combo nahi" hint={combos.length === 0 ? 'Pehle combos banaein — /retail/combos' : 'Filter change karo'} />
              ) : (
                <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 lg:grid-cols-3 xl:grid-cols-4 gap-2 sm:gap-3">
                  {filteredCombos.map((c) => (
                    <ComboTile key={c.id} combo={c} cart={cart} hidePrices={hidePrices} onClick={() => addCombo(c, 1)} />
                  ))}
                </div>
              )
            ) : (
              // Quick Keys view
              Object.keys(groupedQuickKeys).length === 0 ? (
                <EmptyState icon={Zap} title="Koi quick key nahi" hint={quickKeys.length === 0 ? 'Pehle setup karein — /retail/quick-keys' : 'Filter change karo'} />
              ) : (
                <div className="space-y-4">
                  {Object.entries(groupedQuickKeys).map(([group, keys]) => (
                    <div key={group}>
                      <div className="text-[10px] uppercase font-extrabold text-slate-600 tracking-wider mb-2 flex items-center gap-1.5">
                        <div className="h-1 w-6 rounded-full bg-amber-500" />
                        {group}
                        <span className="px-1.5 py-0.5 rounded bg-slate-200 text-slate-700 text-[9px]">{keys.length}</span>
                      </div>
                      <div className="grid grid-cols-3 sm:grid-cols-4 md:grid-cols-5 lg:grid-cols-4 xl:grid-cols-6 gap-2">
                        {keys.map((k) => (
                          <QuickKeyTile key={k.id} qk={k} products={products} combos={combos} hidePrices={hidePrices} onClick={() => addQuickKey(k)} />
                        ))}
                      </div>
                    </div>
                  ))}
                </div>
              )
            )}
          </div>
        </section>

        {/* ═══ CART PANEL ═══ */}
        <CartPanel
          isMobile={showMobileCart}
          onCloseMobile={() => setShowMobileCart(false)}
          cart={cart}
          itemCount={itemCount}
          totalQty={totalQty}
          subtotal={subtotal}
          total={total}
          totalSavings={totalSavings}
          discountPct={discountPct}
          setDiscountPct={setDiscountPct}
          discountAmount={discountAmount}
          hidePrices={hidePrices}
          customers={customers}
          customerId={customerId}
          setCustomerId={setCustomerId}
          selectedCustomer={selectedCustomer}
          onAddCustomer={() => setShowCustomerAdd(true)}
          onHold={holdCart}
          onClear={() => { if (confirm('Cart khaali karein?')) clearCart(); }}
          onChangeQty={changeQty}
          onSetQty={setQtyDirect}
          onRemove={removeLine}
          onCheckout={() => setShowCheckout(true)}
          canCheckout={!!currentShopId}
        />
      </div>

      {/* Mobile FAB */}
      {cart.length > 0 && !showMobileCart && (
        <div className="lg:hidden fixed bottom-4 inset-x-4 z-30">
          <button onClick={() => setShowMobileCart(true)}
            className="w-full h-16 rounded-2xl bg-gradient-to-r from-emerald-600 to-green-600 text-white shadow-2xl active:scale-[0.98] flex items-center justify-between px-5 transition">
            <div className="flex items-center gap-3">
              <div className="relative">
                <ShoppingCart className="h-6 w-6" />
                <span className="absolute -top-2 -right-2 min-w-[22px] h-5 px-1 rounded-full bg-white text-emerald-700 text-[11px] font-extrabold flex items-center justify-center">
                  {itemCount}
                </span>
              </div>
              <div className="text-left">
                <div className="text-[10px] uppercase font-extrabold text-white/80 tracking-wider">Cart</div>
                <div className="text-lg font-extrabold tabular-nums leading-none">{hidePrices ? '••••' : formatPKR(total)}</div>
              </div>
            </div>
            <ArrowRight className="h-6 w-6" />
          </button>
        </div>
      )}
    </>
  );
}

/* ══════════ VIEW TAB ══════════ */
function ViewTab({ active, onClick, icon: Icon, label, count, color, shortcut, highlight }: any) {
  const colors: Record<string, string> = {
    sky: 'bg-sky-600 text-white shadow-md',
    violet: 'bg-violet-600 text-white shadow-md',
    amber: 'bg-amber-600 text-white shadow-md',
  };
  return (
    <button
      onClick={onClick}
      className={[
        'flex-1 h-12 rounded-xl text-xs sm:text-sm font-extrabold inline-flex items-center justify-center gap-1.5 transition active:scale-95 relative',
        active ? colors[color] : 'bg-transparent text-slate-600 hover:bg-slate-100',
      ].join(' ')}
    >
      {highlight && !active && (
        <span className="absolute top-1 right-1 h-2 w-2 rounded-full bg-violet-500 animate-pulse" />
      )}
      <Icon className="h-4 w-4" />
      <span>{label}</span>
      {count > 0 && (
        <span className={['px-1.5 rounded-md text-[10px]', active ? 'bg-white/25' : 'bg-slate-200 text-slate-700'].join(' ')}>
          {count}
        </span>
      )}
      <span className={['hidden lg:inline text-[9px] font-mono px-1 rounded', active ? 'bg-white/20' : 'bg-slate-200 text-slate-500'].join(' ')}>
        {shortcut}
      </span>
    </button>
  );
}

/* ══════════ PRODUCT TILE ══════════ */
function ProductTile({ product: p, cart, hidePrices, onClick }: any) {
  const inCart = cart.filter((l: CartLine) => l.productId === p.id);
  const cartQty = inCart.reduce((s: number, l: CartLine) => s + l.baseQuantity, 0);
  const out = p.stock <= 0;
  const low = !out && p.stock <= (p.lowStockAlert || 0);
  const img = p.images?.[0]?.url;
  return (
    <button onClick={onClick} disabled={out}
      className={['group relative text-left rounded-2xl border-4 overflow-hidden transition-all active:scale-95',
        out ? 'border-slate-200 bg-slate-100 opacity-50 cursor-not-allowed'
          : cartQty > 0 ? 'border-emerald-500 bg-emerald-50 shadow-xl ring-4 ring-emerald-200'
            : 'border-slate-200 bg-white hover:border-sky-400 hover:shadow-xl hover:-translate-y-1'].join(' ')}>
      {cartQty > 0 && (
        <div className="absolute -top-2 -right-2 min-w-[32px] h-8 sm:min-w-[36px] sm:h-9 px-2 rounded-full bg-emerald-600 text-white text-sm sm:text-base font-extrabold flex items-center justify-center shadow-xl ring-4 ring-white z-10 tabular-nums">
          {cartQty % 1 === 0 ? cartQty : cartQty.toFixed(1)}
        </div>
      )}
      <div className="aspect-square bg-slate-100 overflow-hidden relative">
        {img ? (
          <img src={img} alt={p.name} loading="lazy" className="w-full h-full object-cover group-hover:scale-110 transition-transform duration-500" />
        ) : (
          <div className="w-full h-full flex items-center justify-center bg-gradient-to-br from-sky-50 to-cyan-50">
            <span className="text-4xl sm:text-5xl">{unitEmoji(p.unit)}</span>
          </div>
        )}
        {out && <div className="absolute inset-0 bg-slate-900/60 flex items-center justify-center"><span className="px-3 py-1 rounded-xl bg-rose-600 text-white text-xs sm:text-sm font-extrabold shadow-lg">KHATAM</span></div>}
        {low && !out && <div className="absolute top-1.5 right-1.5 px-1.5 py-0.5 rounded-md bg-amber-500 text-white text-[10px] font-extrabold shadow-lg animate-pulse">KAM</div>}
        {p.isFeatured && !out && <div className="absolute top-1.5 left-1.5 h-7 w-7 rounded-full bg-amber-500 flex items-center justify-center shadow-lg"><Star className="h-3.5 w-3.5 fill-white text-white" /></div>}
      </div>
      <div className="p-2 sm:p-3">
        <div className="font-extrabold text-slate-900 text-sm sm:text-base line-clamp-2 leading-tight min-h-[2.25rem] sm:min-h-[2.5rem]">{p.name}</div>
        <div className="mt-1.5 sm:mt-2 flex items-end justify-between gap-1">
          <div>
            <div className="text-lg sm:text-2xl font-extrabold text-emerald-700 leading-none tabular-nums">{hidePrices ? '•••' : formatPKR(p.price)}</div>
            <div className="text-[10px] sm:text-xs font-bold text-slate-500 mt-0.5">per {p.unit}</div>
          </div>
          <div className={['text-xs sm:text-sm font-extrabold tabular-nums shrink-0', out ? 'text-rose-700' : low ? 'text-amber-700' : 'text-slate-600'].join(' ')}>
            {p.stock.toFixed(p.stock % 1 === 0 ? 0 : 1)}
          </div>
        </div>
      </div>
    </button>
  );
}

/* ══════════ COMBO TILE ══════════ */
function ComboTile({ combo, cart, hidePrices, onClick }: any) {
  const inCart = cart.filter((l: CartLine) => l.comboId === combo.id);
  const cartQty = inCart.reduce((s: number, l: CartLine) => s + l.quantity, 0);
  const savings = Number(combo.savingsAmount || 0);
  const savingsPct = Number(combo.savingsPercentage || 0);

  return (
    <button onClick={onClick}
      className={['group relative text-left rounded-2xl border-4 overflow-hidden transition-all active:scale-95',
        cartQty > 0 ? 'border-emerald-500 bg-emerald-50 shadow-xl ring-4 ring-emerald-200'
          : 'border-violet-200 bg-gradient-to-br from-white via-violet-50 to-white hover:border-violet-400 hover:shadow-xl hover:-translate-y-1'].join(' ')}>
      {cartQty > 0 && (
        <div className="absolute -top-2 -right-2 min-w-[32px] h-8 px-2 rounded-full bg-emerald-600 text-white text-sm font-extrabold flex items-center justify-center shadow-xl ring-4 ring-white z-10">
          {cartQty}
        </div>
      )}
      <div className="aspect-square bg-gradient-to-br from-violet-100 to-fuchsia-100 overflow-hidden relative">
        {combo.imageUrl ? (
          <img src={combo.imageUrl} alt={combo.name} loading="lazy" className="w-full h-full object-cover group-hover:scale-110 transition-transform duration-500" />
        ) : (
          <div className="w-full h-full flex items-center justify-center">
            <span className="text-5xl sm:text-6xl">🎁</span>
          </div>
        )}
        <div className="absolute top-1.5 left-1.5 px-2 py-0.5 rounded-md bg-violet-600 text-white text-[9px] font-extrabold uppercase tracking-wider shadow-lg">
          Combo
        </div>
        {savingsPct > 0 && (
          <div className="absolute bottom-1.5 left-1.5 px-2 py-0.5 rounded-md bg-emerald-500 text-white text-xs font-extrabold shadow-lg">
            Save {savingsPct.toFixed(0)}%
          </div>
        )}
        {combo.isFeatured && (
          <div className="absolute top-1.5 right-1.5 h-7 w-7 rounded-full bg-amber-500 flex items-center justify-center shadow-lg">
            <Star className="h-3.5 w-3.5 fill-white text-white" />
          </div>
        )}
      </div>
      <div className="p-2 sm:p-3">
        <div className="font-extrabold text-slate-900 text-sm sm:text-base line-clamp-2 leading-tight min-h-[2.25rem] sm:min-h-[2.5rem]">{combo.name}</div>
        {combo.tagLine && (
          <div className="text-[10px] font-extrabold text-violet-700 uppercase mt-0.5 line-clamp-1">{combo.tagLine}</div>
        )}
        <div className="mt-1.5 flex items-end justify-between gap-1">
          <div>
            <div className="text-lg sm:text-2xl font-extrabold text-emerald-700 leading-none tabular-nums">
              {hidePrices ? '•••' : formatPKR(combo.comboPrice)}
            </div>
            {savings > 0 && !hidePrices && (
              <div className="text-[10px] text-slate-500 line-through font-bold mt-0.5">
                {formatPKR(combo.originalTotal)}
              </div>
            )}
          </div>
          <div className="text-[10px] font-extrabold text-violet-700 shrink-0">
            {combo.items.length} items
          </div>
        </div>
      </div>
    </button>
  );
}

/* ══════════ QUICK KEY TILE ══════════ */
function QuickKeyTile({ qk, products, combos, hidePrices, onClick }: any) {
  const product = qk.productId ? products.find((p: Product) => p.id === qk.productId) : null;
  const combo = qk.comboId ? combos.find((c: ProductCombo) => c.id === qk.comboId) : null;
  const price = product?.price ?? combo?.comboPrice ?? 0;
  const out = product ? product.stock <= 0 : false;

  return (
    <button onClick={onClick} disabled={out}
      className={['group relative text-left rounded-2xl border-4 p-2.5 sm:p-3 transition-all active:scale-95 aspect-square flex flex-col items-center justify-center',
        out ? 'opacity-50 cursor-not-allowed border-slate-200 bg-slate-100' : 'hover:shadow-xl hover:-translate-y-1'].join(' ')}
      style={{
        borderColor: out ? undefined : (qk.color || '#f59e0b'),
        backgroundColor: out ? undefined : `${qk.color || '#f59e0b'}12`,
      }}>
      {qk.hotkey && (
        <div className="absolute top-1 right-1 px-1.5 py-0.5 rounded bg-slate-900 text-white text-[9px] font-mono font-extrabold">
          {qk.hotkey}
        </div>
      )}
      {qk.icon && <div className="text-3xl sm:text-4xl mb-1">{qk.icon}</div>}
      <div className="font-extrabold text-slate-900 text-xs sm:text-sm text-center leading-tight line-clamp-2">
        {qk.label}
      </div>
      {price > 0 && (
        <div className="mt-1 text-xs font-extrabold text-emerald-700 tabular-nums">
          {hidePrices ? '•••' : formatPKR(price)}
        </div>
      )}
      {combo && (
        <div className="absolute bottom-1 left-1 px-1.5 py-0.5 rounded bg-violet-600 text-white text-[8px] font-extrabold uppercase">
          Combo
        </div>
      )}
    </button>
  );
}

/* ══════════ EMPTY STATE ══════════ */
function EmptyState({ icon: Icon, title, hint, onClear }: any) {
  return (
    <div className="flex flex-col items-center justify-center py-16 px-6">
      <div className="h-20 w-20 rounded-3xl bg-slate-200 flex items-center justify-center">
        <Icon className="h-10 w-10 text-slate-400" />
      </div>
      <h3 className="mt-4 font-extrabold text-slate-900 text-xl">{title}</h3>
      <p className="mt-2 text-sm text-slate-500 text-center font-semibold">{hint}</p>
      {onClear && (
        <button onClick={onClear} className="mt-4 h-12 px-5 rounded-2xl bg-sky-600 hover:bg-sky-700 active:scale-95 text-white font-extrabold transition inline-flex items-center gap-2">
          <RotateCcw className="h-4 w-4" /> Clear
        </button>
      )}
    </div>
  );
}

/* ══════════ CART PANEL ══════════ */
function CartPanel({
  isMobile, onCloseMobile, cart, itemCount, totalQty, subtotal, total, totalSavings,
  discountPct, setDiscountPct, discountAmount, hidePrices, customers, customerId,
  setCustomerId, selectedCustomer, onAddCustomer, onHold, onClear, onChangeQty,
  onSetQty, onRemove, onCheckout, canCheckout,
}: any) {
  const containerClass = isMobile
    ? 'fixed inset-0 z-40 bg-white flex flex-col lg:hidden animate-in slide-in-from-bottom duration-200'
    : 'hidden lg:flex rounded-3xl bg-white border-2 border-slate-200 shadow-sm overflow-hidden flex-col min-h-0';

  return (
    <aside className={containerClass}>
      {/* Header */}
      <div className="shrink-0 relative overflow-hidden bg-gradient-to-br from-slate-950 via-emerald-900 to-emerald-700 text-white px-3 sm:px-4 py-3 sm:py-4">
        <div className="flex items-center justify-between gap-2">
          <div className="min-w-0">
            <div className="text-[10px] sm:text-[11px] uppercase font-extrabold text-white/70 tracking-wider">
              Cart • {itemCount} lines • {totalQty.toFixed(totalQty % 1 === 0 ? 0 : 1)} qty
            </div>
            <div className="text-3xl sm:text-4xl font-extrabold tabular-nums leading-none mt-1">
              {hidePrices ? '••••' : formatPKR(total)}
            </div>
            {totalSavings > 0 && !hidePrices && (
              <div className="text-xs font-extrabold text-emerald-300 mt-1 inline-flex items-center gap-1">
                <Sparkles className="h-3 w-3" /> Combo bachat {formatPKR(totalSavings)}
              </div>
            )}
            {discountPct > 0 && !hidePrices && (
              <div className="text-xs font-bold text-amber-300 mt-0.5">
                Discount {discountPct}% • Save {formatPKR(discountAmount)}
              </div>
            )}
          </div>
          <div className="flex gap-1.5 shrink-0">
            {cart.length > 0 && (
              <>
                <button onClick={onHold}
                  className="h-10 sm:h-12 px-2.5 rounded-2xl bg-white/15 hover:bg-amber-500/50 active:scale-95 text-white text-xs sm:text-sm font-extrabold border-2 border-white/20 transition inline-flex items-center gap-1">
                  <Pause className="h-3.5 w-3.5 sm:h-4 sm:w-4" /> Hold
                </button>
                <button onClick={onClear}
                  className="h-10 sm:h-12 px-2.5 rounded-2xl bg-white/15 hover:bg-rose-500/50 active:scale-95 text-white text-xs sm:text-sm font-extrabold border-2 border-white/20 transition">
                  Khaali
                </button>
              </>
            )}
            {isMobile && (
              <button onClick={onCloseMobile}
                className="h-10 w-10 sm:h-12 sm:w-12 rounded-2xl bg-white/15 hover:bg-white/25 active:scale-95 flex items-center justify-center border-2 border-white/20 transition">
                <X className="h-5 w-5" />
              </button>
            )}
          </div>
        </div>
      </div>

      {/* Customer selector */}
      <div className="shrink-0 px-3 py-2.5 border-b-2 border-slate-100 bg-slate-50">
        <div className="flex gap-2">
          <div className="relative flex-1">
            <User className="h-4 w-4 sm:h-5 sm:w-5 text-violet-600 absolute left-3 top-1/2 -translate-y-1/2 pointer-events-none" />
            <select value={customerId} onChange={(e) => setCustomerId(e.target.value)}
              className="h-12 sm:h-14 w-full rounded-2xl border-4 border-slate-200 bg-white pl-10 sm:pl-11 pr-9 text-sm sm:text-base font-bold focus:outline-none focus:border-violet-500 appearance-none">
              <option value="">Walk-in Customer</option>
              {customers.map((c: any) => (
                <option key={c.id} value={c.id}>
                  {c.name}{c.balance > 0 ? ` • Udhaar ${formatPKR(c.balance)}` : ''}
                </option>
              ))}
            </select>
            <ChevronDown className="h-4 w-4 sm:h-5 sm:w-5 text-slate-400 absolute right-3 top-1/2 -translate-y-1/2 pointer-events-none" />
          </div>
          <button onClick={onAddCustomer}
            className="h-12 w-12 sm:h-14 sm:w-14 rounded-2xl bg-violet-600 hover:bg-violet-700 active:scale-95 text-white flex items-center justify-center shadow-md shrink-0 transition">
            <UserPlus className="h-5 w-5 sm:h-6 sm:w-6" />
          </button>
        </div>
        {selectedCustomer && selectedCustomer.balance > 0 && (
          <div className="mt-2 px-3 py-1.5 rounded-xl bg-amber-100 border-2 border-amber-300 text-xs sm:text-sm font-extrabold text-amber-900 inline-flex items-center gap-1.5">
            <AlertTriangle className="h-3.5 w-3.5" /> Purana udhaar: {formatPKR(selectedCustomer.balance)}
          </div>
        )}
      </div>

      {/* Cart items */}
      <div className="flex-1 overflow-y-auto p-2.5 sm:p-3 space-y-2 bg-slate-50/50 min-h-0">
        {cart.length === 0 ? (
          <div className="rounded-3xl bg-white border-4 border-dashed border-slate-200 p-8 sm:p-10 text-center">
            <div className="h-16 w-16 sm:h-20 sm:w-20 rounded-3xl bg-slate-100 mx-auto flex items-center justify-center">
              <ShoppingCart className="h-8 w-8 sm:h-10 sm:w-10 text-slate-400" />
            </div>
            <p className="mt-4 font-extrabold text-slate-700 text-lg sm:text-xl">Cart khaali hai</p>
            <p className="text-xs sm:text-sm text-slate-500 font-semibold mt-1">Barcode scan karo, product/combo/quick key click karo</p>
          </div>
        ) : (
          cart.map((l: CartLine) => (
            <div key={l.id} className={[
              'rounded-2xl bg-white border-4 p-2.5 sm:p-3 shadow-sm',
              l.type === 'combo' ? 'border-violet-300' : 'border-slate-200',
            ].join(' ')}>
              <div className="flex items-start gap-2.5 sm:gap-3">
                <div className={[
                  'h-12 w-12 sm:h-14 sm:w-14 rounded-xl overflow-hidden shrink-0 flex items-center justify-center relative',
                  l.type === 'combo' ? 'bg-gradient-to-br from-violet-100 to-fuchsia-100' : 'bg-slate-100',
                ].join(' ')}>
                  {l.image ? <img src={l.image} alt="" className="w-full h-full object-cover" /> : <span className="text-xl sm:text-2xl">{l.emoji}</span>}
                  {l.type === 'combo' && (
                    <div className="absolute -top-1 -right-1 h-5 w-5 rounded-full bg-violet-600 text-white flex items-center justify-center">
                      <Sparkles className="h-3 w-3" />
                    </div>
                  )}
                </div>
                <div className="flex-1 min-w-0">
                  <div className="flex items-center gap-1.5 flex-wrap">
                    <div className="font-extrabold text-sm sm:text-base text-slate-900 leading-tight line-clamp-2">{l.name}</div>
                    {l.type === 'combo' && (
                      <span className="px-1.5 py-0.5 rounded bg-violet-600 text-white text-[9px] font-extrabold uppercase tracking-wider shrink-0">Combo</span>
                    )}
                  </div>
                  <div className="text-xs sm:text-sm font-bold text-sky-700 mt-0.5">
                    {l.emoji} {formatPKR(l.unitPrice)} / {l.unitName}
                  </div>
                  {l.note && <div className="text-[10px] sm:text-[11px] font-semibold text-slate-500 mt-0.5">{l.note}</div>}
                </div>
                <button onClick={() => onRemove(l.id)}
                  className="h-9 w-9 sm:h-10 sm:w-10 rounded-xl bg-rose-50 hover:bg-rose-100 active:scale-95 text-rose-600 flex items-center justify-center shrink-0 transition">
                  <Trash2 className="h-4 w-4 sm:h-5 sm:w-5" />
                </button>
              </div>
              <div className="mt-2.5 sm:mt-3 flex items-center justify-between gap-2">
                <div className="inline-flex items-center bg-slate-100 rounded-2xl overflow-hidden border-2 border-slate-200">
                  <button onClick={() => onChangeQty(l.id, -1)} className="h-12 sm:h-14 w-12 sm:w-14 hover:bg-slate-200 active:bg-slate-300 flex items-center justify-center transition">
                    <Minus className="h-5 w-5 sm:h-6 sm:w-6 text-slate-700" />
                  </button>
                  <input type="number" step="0.001" value={l.quantity}
                    onChange={(e) => onSetQty(l.id, Number(e.target.value))}
                    onFocus={(e) => e.target.select()}
                    className="h-12 sm:h-14 min-w-[70px] w-[70px] sm:min-w-[80px] sm:w-[80px] text-center bg-white border-0 text-lg sm:text-xl font-extrabold tabular-nums focus:outline-none" />
                  <button onClick={() => onChangeQty(l.id, 1)}
                    className={[
                      'h-12 sm:h-14 w-12 sm:w-14 text-white flex items-center justify-center transition',
                      l.type === 'combo' ? 'bg-violet-600 hover:bg-violet-700 active:bg-violet-800' : 'bg-sky-600 hover:bg-sky-700 active:bg-sky-800',
                    ].join(' ')}>
                    <Plus className="h-5 w-5 sm:h-6 sm:w-6" />
                  </button>
                </div>
                <div className="text-xl sm:text-2xl font-extrabold text-emerald-700 tabular-nums">
                  {hidePrices ? '•••' : formatPKR(l.lineTotal)}
                </div>
              </div>
            </div>
          ))
        )}
      </div>

      {/* Discount + Checkout */}
      {cart.length > 0 && (
        <div className="shrink-0 p-2.5 sm:p-3 border-t-4 border-slate-100 bg-white space-y-2">
          <div className="flex items-center gap-2">
            <div className="flex items-center gap-1 text-[11px] sm:text-xs font-extrabold text-slate-600 shrink-0">
              <Percent className="h-3.5 w-3.5 sm:h-4 sm:w-4 text-amber-600" />
              <span className="hidden sm:inline">Discount:</span>
            </div>
            <div className="flex gap-1 flex-1">
              {[0, 5, 10, 15, 20].map((d) => (
                <button key={d} onClick={() => setDiscountPct(d)}
                  className={['flex-1 h-9 sm:h-10 rounded-xl text-[11px] sm:text-xs font-extrabold transition',
                    discountPct === d ? 'bg-amber-600 text-white shadow' : 'bg-slate-100 hover:bg-slate-200 text-slate-700'].join(' ')}>
                  {d === 0 ? 'None' : `${d}%`}
                </button>
              ))}
            </div>
          </div>

          <button onClick={onCheckout} disabled={!canCheckout}
            className={['w-full h-[76px] sm:h-[88px] rounded-3xl font-extrabold text-white shadow-2xl transition-all active:scale-[0.98]',
              'bg-gradient-to-r from-emerald-600 to-green-600 hover:from-emerald-700 hover:to-green-700',
              'disabled:opacity-50 disabled:cursor-not-allowed',
              'flex items-center justify-between px-5 sm:px-6'].join(' ')}>
            <div className="text-left">
              <div className="text-[10px] sm:text-xs uppercase font-extrabold text-white/80 tracking-wider">
                Paisay lein <span className="hidden sm:inline">(F9)</span>
              </div>
              <div className="text-2xl sm:text-3xl tabular-nums leading-none mt-0.5">{formatPKR(total)}</div>
            </div>
            <div className="h-12 w-12 sm:h-14 sm:w-14 rounded-2xl bg-white/20 flex items-center justify-center">
              <ArrowRight className="h-6 w-6 sm:h-8 sm:w-8" />
            </div>
          </button>
          {!canCheckout && <p className="text-center text-xs font-extrabold text-rose-600">⚠️ Pehle shop select karein</p>}
        </div>
      )}
    </aside>
  );
}
