import { useState, useMemo, useEffect, useRef, useCallback } from 'react';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import {
  Search, ShoppingCart, Package, X, Plus, Minus, Trash2,
  Camera, ScanLine, User, UserPlus, CheckCircle2, Store,
  ChevronDown, Eye, EyeOff, Grid3x3, ArrowRight, Printer,
  AlertTriangle, Star, RotateCcw, Pause, Play, Percent,
  Wifi, WifiOff, Sparkles, Zap, Scale, GraduationCap,
  Banknote, Pencil, Check, Tag, Calculator,
} from 'lucide-react';
import { toast } from 'sonner';
import { formatPKR } from '@core/lib/format';
import { useAuthStore } from '@core/stores/auth.store';
import { offlineProductsApi as productsApi } from '@core/lib/offline/offlineProducts';
import { offlineCustomersApi as customersApi } from '@core/lib/offline/offlineCustomers';
import { categoriesApi } from '@modules/inventory/categories/api/categories.api';
import { salesApi, type PaymentMethod } from '@modules/sales/sales/api/sales.api';
import { offlineSalesApi } from '@core/lib/offline/offlineSales';
import type { Product } from '@modules/inventory/products/api/products.api';
import BarcodeScanner from '@core/components/barcode/BarcodeScanner';
import { RetailUnitPicker, RetailQuickCash, type RetailUnitOption } from '../components/pos';
import { productUnitsApi } from '../api/product-units.api';
import { combosApi, type ProductCombo } from '../api/combos.api';
import { quickKeysApi, type QuickKey } from '../api/quick-keys.api';
import { FbrModeIndicator } from '@integrations/fbr/components/FbrModeIndicator';

/* ═════════════════════════════════════════════════════════════
   NAFAA RETAIL POS — BILLION-$ GRADE
   ─────────────────────────────────────────────────────────────
   💎 Discount MODAL — full-screen best UX (% / Rs / presets)
   ✏️  Custom price per line (click price → edit)
   ⚖️  Weigh sale — paise ya wazan (dono modes)
   🎁 Combos + ⚡ Quick keys
   🎓 Teacher • ⌨️ F1/F2/F9/F7/F8/F10
   🌙 Dark mode • 📴 Offline • 📱 Mobile → 4K
   ═════════════════════════════════════════════════════════════ */

const HIDE_PRICES_KEY = 'nafaa.retail-pos.hide-prices';
const AUTO_CLOSE_KEY = 'nafaa.retail-pos.auto-close-success';
const VIEW_MODE_KEY = 'nafaa.retail-pos.view-mode';

type ViewMode = 'products' | 'combos' | 'quickkeys';
type DiscountMode = 'pct' | 'rs';

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
  basePrice: number;
  quantity: number;
  baseQuantity: number;
  conversionRate: number;
  baseUnit: string;
  baseStock: number;
  lineTotal: number;
  note?: string;
  comboItems?: any[];
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

const WEIGHT_UNITS = ['kg', 'gram', 'g', 'liter', 'litre', 'l', 'ml', 'meter', 'metre', 'm', 'feet', 'ft'];
const isWeightUnit = (u: string) => WEIGHT_UNITS.includes((u || '').toLowerCase());

const qtyStep = (unitName: string) => {
  const u = unitName.toLowerCase();
  if (u === 'kg' || u === 'liter' || u === 'meter') return 0.25;
  if (u === 'gram' || u === 'g' || u === 'ml') return 50;
  return 1;
};

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

  // Discount state
  const [discountMode, setDiscountMode] = useState<DiscountMode>('pct');
  const [discountPct, setDiscountPct] = useState(0);
  const [discountRs, setDiscountRs] = useState(0);
  const [showDiscountModal, setShowDiscountModal] = useState(false);

  const [scannerOpen, setScannerOpen] = useState(false);
  const [barcodeInput, setBarcodeInput] = useState('');
  const [unitPickerProduct, setUnitPickerProduct] = useState<{ product: Product; units: RetailUnitOption[] } | null>(null);
  const [weightModal, setWeightModal] = useState<{ product: Product; unit: RetailUnitOption } | null>(null);
  const [priceEditId, setPriceEditId] = useState<string | null>(null);
  const [showCheckout, setShowCheckout] = useState(false);
  const [showCustomerAdd, setShowCustomerAdd] = useState(false);
  const [showHeldCarts, setShowHeldCarts] = useState(false);
  const [showMobileCart, setShowMobileCart] = useState(false);
  const [showTeacher, setShowTeacher] = useState(false);
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
    const onOnline = () => { setIsOnline(true); toast.success('🟢 Internet wapas — sync ho raha'); };
    const onOffline = () => { setIsOnline(false); toast.warning('📴 Offline mode — sales locally save hongi'); };
    window.addEventListener('online', onOnline);
    window.addEventListener('offline', onOffline);
    return () => {
      window.removeEventListener('online', onOnline);
      window.removeEventListener('offline', onOffline);
    };
  }, []);

  useEffect(() => {
    const refocus = () => {
      if (scannerOpen || showCheckout || unitPickerProduct || weightModal || showCustomerAdd || showHeldCarts || lastSale || showTeacher || showDiscountModal) return;
      const active = document.activeElement as HTMLElement | null;
      if (active && active !== barcodeRef.current) {
        const tag = active.tagName;
        if (tag === 'INPUT' || tag === 'TEXTAREA' || tag === 'SELECT' || active.isContentEditable) return;
      }
      barcodeRef.current?.focus();
    };
    const t = setTimeout(refocus, 300);
    return () => clearTimeout(t);
  }, [scannerOpen, showCheckout, unitPickerProduct, weightModal, showCustomerAdd, showHeldCarts, lastSale, showTeacher, showDiscountModal]);

  useEffect(() => {
    const handler = (e: KeyboardEvent) => {
      const tag = (document.activeElement as HTMLElement | null)?.tagName;
      const typing = tag === 'INPUT' || tag === 'TEXTAREA' || tag === 'SELECT';
      if (e.key === 'F2') { e.preventDefault(); setScannerOpen(true); }
      if (e.key === 'F9') { e.preventDefault(); if (cart.length > 0) setShowCheckout(true); }
      if (e.key === 'F7') { e.preventDefault(); setViewMode('products'); }
      if (e.key === 'F8') { e.preventDefault(); setViewMode('combos'); }
      if (e.key === 'F10') { e.preventDefault(); setViewMode('quickkeys'); }
      if (e.key === 'F1' && !typing) { e.preventDefault(); setShowTeacher(true); }
      if (e.key === 'Escape') {
        if (showDiscountModal) setShowDiscountModal(false);
        else if (showTeacher) setShowTeacher(false);
        else if (scannerOpen) setScannerOpen(false);
        else if (weightModal) setWeightModal(null);
        else if (unitPickerProduct) setUnitPickerProduct(null);
        else if (showCheckout) setShowCheckout(false);
        else if (showMobileCart) setShowMobileCart(false);
        else if (priceEditId) setPriceEditId(null);
      }
    };
    window.addEventListener('keydown', handler);
    return () => window.removeEventListener('keydown', handler);
  }, [cart.length, scannerOpen, showCheckout, unitPickerProduct, weightModal, showMobileCart, priceEditId, showTeacher, showDiscountModal]);

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

  const subtotal = useMemo(() => cart.reduce((s, l) => s + l.lineTotal, 0), [cart]);
  const discountAmount = useMemo(() => {
    if (discountMode === 'pct') return (subtotal * discountPct) / 100;
    return Math.min(Number(discountRs || 0), subtotal);
  }, [subtotal, discountPct, discountRs, discountMode]);
  const total = useMemo(() => Math.max(subtotal - discountAmount, 0), [subtotal, discountAmount]);
  const totalSavings = useMemo(() => cart.reduce((s, l) => s + (l.savings || 0) * l.quantity, 0), [cart]);
  const itemCount = cart.length;
  const totalQty = useMemo(() => cart.reduce((s, l) => s + l.quantity, 0), [cart]);

  const openProduct = useCallback(async (product: Product) => {
    if (product.stock <= 0) { toast.error(`${product.name} — stock khatam`); return; }
    let apiUnits: any[] = [];
    try {
      const res = await productUnitsApi.byProduct(product.id);
      apiUnits = Array.isArray(res) ? res : ((res as any)?.items ?? []);
    } catch {}
    const units = deriveUnits(product, apiUnits);
    const baseUnit = units[0];

    if (units.length > 1) {
      setUnitPickerProduct({ product, units });
      return;
    }
    if (isWeightUnit(baseUnit.unitName)) {
      setWeightModal({ product, unit: baseUnit });
      return;
    }
    addProductLine(product, baseUnit, 1);
  }, [cart]);

  const addProductLine = (product: Product, unit: RetailUnitOption, qty: number, customPrice?: number) => {
    const baseQty = qty * unit.conversionRate;
    const price = customPrice ?? unit.price;
    const existing = cart.find((l) => l.productId === product.id && l.unitName === unit.unitName && l.unitPrice === price);
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
      unitPrice: price,
      basePrice: unit.price,
      quantity: qty,
      baseQuantity: baseQty,
      conversionRate: unit.conversionRate,
      baseUnit: product.unit,
      baseStock: product.stock,
      lineTotal: qty * price,
      note: unit.conversionRate !== 1 ? `${qty} ${unit.unitName} = ${baseQty.toFixed(2)} ${product.unit}` : undefined,
    }]);
    toast.success(`${product.name} — ${qty} ${unit.unitName}`, { duration: 900 });
  };

  const addCombo = (combo: ProductCombo, qty: number = 1) => {
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
      basePrice: Number(combo.comboPrice),
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
      const step = qtyStep(l.unitName);
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

  const setLinePrice = (id: string, price: number) => {
    setCart((prev) => prev.map((l) => {
      if (l.id !== id) return l;
      const p = Math.max(price, 0);
      return { ...l, unitPrice: p, lineTotal: l.quantity * p };
    }));
    setPriceEditId(null);
  };

  const removeLine = (id: string) => setCart((prev) => prev.filter((l) => l.id !== id));
  const clearCart = () => { setCart([]); setCustomerId(''); setDiscountPct(0); setDiscountRs(0); };

  const handleBarcode = async (code: string) => {
    setScannerOpen(false);
    const trimmed = code.trim();
    if (!trimmed) return;
    const comboMatch = combos.find((c) => c.barcode === trimmed || c.sku === trimmed);
    if (comboMatch) { addCombo(comboMatch, 1); return; }
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
      return offlineSalesApi.create({
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
    onError: (e: any) => {
      const msg = e?.response?.data?.message || 'Sale fail';
      if (!navigator.onLine) toast.info('📴 Offline — sale queue me chali gayi');
      else toast.error(msg);
    },
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
          onConfirm={({ unit, quantity }) => {
            if (isWeightUnit(unit.unitName)) {
              setWeightModal({ product: unitPickerProduct.product, unit });
              setUnitPickerProduct(null);
              return;
            }
            addProductLine(unitPickerProduct.product, unit, quantity);
            setUnitPickerProduct(null);
          }}
          onClose={() => setUnitPickerProduct(null)}
        />
      )}

      {weightModal && (
        <WeighSaleModal
          product={weightModal.product}
          unit={weightModal.unit}
          onConfirm={(qty) => {
            addProductLine(weightModal.product, weightModal.unit, qty);
            setWeightModal(null);
          }}
          onClose={() => setWeightModal(null)}
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

      {showTeacher && <PosTeacher onClose={() => setShowTeacher(false)} />}

      {/* 💎 DISCOUNT MODAL */}
      {showDiscountModal && (
        <DiscountModal
          subtotal={subtotal}
          mode={discountMode}
          pct={discountPct}
          rs={Number(discountRs) || 0}
          onApply={(m, p, r) => {
            setDiscountMode(m);
            setDiscountPct(p);
            setDiscountRs(r);
            setShowDiscountModal(false);
            if (m === 'pct' ? p > 0 : r > 0) {
              toast.success(`Discount applied: ${m === 'pct' ? p + '%' : formatPKR(r)}`);
            }
          }}
          onClose={() => setShowDiscountModal(false)}
        />
      )}

      {lastSale && (
        <div className="fixed inset-0 z-50 bg-slate-950/80 backdrop-blur-sm flex items-center justify-center p-4" onClick={closeSuccessModal}>
          <div className="w-full max-w-md bg-white dark:bg-slate-900 rounded-3xl shadow-2xl overflow-hidden animate-in fade-in zoom-in duration-200" onClick={(e) => e.stopPropagation()}>
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
              <div className="px-6 py-5 bg-amber-50 dark:bg-amber-500/15 border-b-4 border-amber-200 dark:border-amber-500/30 text-center">
                <div className="text-xs uppercase font-extrabold text-amber-800 dark:text-amber-300 tracking-wider">Customer ko wapis dein</div>
                <div className="text-5xl font-extrabold text-amber-700 dark:text-amber-300 tabular-nums mt-1">{formatPKR(lastSale.change)}</div>
              </div>
            )}
            <div className="p-4 grid grid-cols-2 gap-2">
              <button onClick={() => window.open(`/sales/${lastSale.id}/receipt`, '_blank')} className="h-14 rounded-2xl bg-slate-100 dark:bg-slate-800 hover:bg-slate-200 dark:hover:bg-slate-700 active:scale-95 font-extrabold text-slate-700 dark:text-slate-200 transition inline-flex items-center justify-center gap-2">
                <Printer className="h-5 w-5" /> Receipt
              </button>
              <button onClick={closeSuccessModal} className="h-14 rounded-2xl bg-gradient-to-r from-sky-600 to-cyan-600 hover:from-sky-700 hover:to-cyan-700 active:scale-95 font-extrabold text-white text-lg shadow-lg transition inline-flex items-center justify-center gap-2">
                Nayi Sale <ArrowRight className="h-5 w-5" />
              </button>
            </div>
            {autoClose && (
              <div className="px-4 pb-3 text-center text-[11px] font-bold text-slate-400 dark:text-slate-500">
                ⏱️ 3.5 second me khud band ho jayega
              </div>
            )}
          </div>
        </div>
      )}

      {showCustomerAdd && (
        <div className="fixed inset-0 z-50 bg-slate-950/80 backdrop-blur-sm flex items-center justify-center p-4">
          <div className="w-full max-w-md bg-white dark:bg-slate-900 rounded-3xl shadow-2xl overflow-hidden">
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
                className="h-16 w-full rounded-2xl border-4 border-slate-200 dark:border-slate-700 bg-white dark:bg-slate-800 px-4 text-xl font-bold text-slate-900 dark:text-white focus:outline-none focus:border-violet-500" />
              <input value={newCustomer.phone} onChange={(e) => setNewCustomer({ ...newCustomer, phone: e.target.value })}
                placeholder="03XX XXXXXXX"
                className="h-16 w-full rounded-2xl border-4 border-slate-200 dark:border-slate-700 bg-white dark:bg-slate-800 px-4 text-xl font-bold text-slate-900 dark:text-white focus:outline-none focus:border-violet-500" />
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
          <div className="w-full max-w-lg bg-white dark:bg-slate-900 rounded-3xl shadow-2xl overflow-hidden max-h-[85vh] flex flex-col">
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
                  <Pause className="h-12 w-12 text-slate-300 dark:text-slate-600 mx-auto mb-2" />
                  <p className="font-extrabold text-slate-700 dark:text-slate-200">Koi hold cart nahi</p>
                </div>
              ) : heldCarts.map((h) => (
                <div key={h.id} className="rounded-2xl border-2 border-slate-200 dark:border-slate-700 bg-white dark:bg-slate-800/60 p-3 flex items-center gap-3">
                  <div className="h-12 w-12 rounded-xl bg-amber-100 dark:bg-amber-500/20 text-amber-700 dark:text-amber-300 flex items-center justify-center shrink-0">
                    <ShoppingCart className="h-6 w-6" />
                  </div>
                  <div className="flex-1 min-w-0">
                    <div className="font-extrabold text-slate-900 dark:text-white text-sm">{h.lines.length} items • {formatPKR(h.total)}</div>
                    <div className="text-xs text-slate-500 dark:text-slate-400 font-bold">
                      {new Date(h.heldAt).toLocaleTimeString('en-PK', { hour: '2-digit', minute: '2-digit' })}
                    </div>
                  </div>
                  <button onClick={() => resumeCart(h)} className="h-10 px-4 rounded-xl bg-emerald-600 hover:bg-emerald-700 text-white text-xs font-extrabold inline-flex items-center gap-1 transition">
                    <Play className="h-3.5 w-3.5" /> Resume
                  </button>
                  <button onClick={() => deleteHeld(h.id)} className="h-10 w-10 rounded-xl bg-rose-50 dark:bg-rose-500/15 hover:bg-rose-100 dark:hover:bg-rose-500/25 text-rose-600 dark:text-rose-400 flex items-center justify-center transition">
                    <Trash2 className="h-4 w-4" />
                  </button>
                </div>
              ))}
            </div>
          </div>
        </div>
      )}

      <div className="min-h-[calc(100dvh-5rem)] lg:h-[calc(100dvh-7rem)] flex flex-col lg:grid lg:grid-cols-[1fr_400px] xl:grid-cols-[1fr_440px] gap-2 lg:gap-3">

        <section className="lg:flex-1 rounded-2xl lg:rounded-3xl bg-white dark:bg-slate-900/80 dark:backdrop-blur-sm border-2 border-slate-200 dark:border-slate-800 shadow-sm dark:shadow-black/20 lg:overflow-hidden flex flex-col lg:min-h-0">

          <div className="shrink-0 relative overflow-hidden bg-gradient-to-br from-slate-950 via-sky-900 to-cyan-700 dark:from-slate-950 dark:via-sky-950 dark:to-cyan-900 text-white">
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
                      <div className="h-6 px-2 rounded-full bg-emerald-500/30 flex items-center gap-1">
                        <Wifi className="h-3 w-3 text-emerald-200" />
                        <span className="text-[9px] font-extrabold text-emerald-200">LIVE</span>
                      </div>
                    ) : (
                      <div className="h-6 px-2 rounded-full bg-amber-500/30 flex items-center gap-1 animate-pulse">
                        <WifiOff className="h-3 w-3 text-amber-200" />
                        <span className="text-[9px] font-extrabold text-amber-200">OFFLINE</span>
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
                <button
                  onClick={() => setShowTeacher(true)}
                  title="Guide (F1)"
                  className="h-10 w-10 sm:h-11 sm:w-11 rounded-2xl bg-amber-400/90 hover:bg-amber-400 text-slate-900 active:scale-95 flex items-center justify-center shadow-lg transition"
                >
                  <GraduationCap className="h-5 w-5" />
                </button>
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

          <div className="shrink-0 px-3 sm:px-4 pt-3 bg-slate-50 dark:bg-slate-900/60 border-b-2 border-slate-100 dark:border-slate-800">
            <div className="flex gap-1.5 bg-white dark:bg-slate-800 rounded-2xl border-2 border-slate-200 dark:border-slate-700 p-1">
              <ViewTab active={viewMode === 'products'} onClick={() => setViewMode('products')} icon={Package} label="Products" count={products.length} color="sky" shortcut="F7" />
              <ViewTab active={viewMode === 'combos'} onClick={() => setViewMode('combos')} icon={Sparkles} label="Combos" count={combos.length} color="violet" shortcut="F8" highlight={combos.length > 0} />
              <ViewTab active={viewMode === 'quickkeys'} onClick={() => setViewMode('quickkeys')} icon={Zap} label="Quick" count={quickKeys.length} color="amber" shortcut="F10" />
            </div>
          </div>

          <div className="shrink-0 px-3 sm:px-4 py-2.5 bg-slate-50 dark:bg-slate-900/60 border-b-2 border-slate-100 dark:border-slate-800 space-y-2">
            <div className="flex gap-2">
              <div className="relative flex-1">
                <Search className="h-5 w-5 sm:h-6 sm:w-6 text-slate-400 absolute left-3 sm:left-4 top-1/2 -translate-y-1/2" />
                <input
                  className="h-14 sm:h-16 w-full rounded-2xl border-4 border-slate-200 dark:border-slate-700 bg-white dark:bg-slate-800 pl-11 sm:pl-14 pr-10 sm:pr-12 text-lg sm:text-xl font-bold text-slate-900 dark:text-white placeholder:text-slate-400 dark:placeholder:text-slate-500 focus:outline-none focus:border-sky-500 focus:ring-4 focus:ring-sky-200 dark:focus:ring-sky-500/20 transition"
                  placeholder={viewMode === 'products' ? 'Cheez ka naam...' : viewMode === 'combos' ? 'Combo naam...' : 'Quick key...'}
                  value={search}
                  onChange={(e) => setSearch(e.target.value)}
                />
                {search && (
                  <button onClick={() => setSearch('')} className="absolute right-2.5 top-1/2 -translate-y-1/2 h-9 w-9 sm:h-10 sm:w-10 rounded-xl hover:bg-slate-100 dark:hover:bg-slate-700 active:scale-95 flex items-center justify-center transition">
                    <X className="h-5 w-5 text-slate-500 dark:text-slate-400" />
                  </button>
                )}
              </div>
              <button onClick={() => setScannerOpen(true)}
                className="h-14 sm:h-16 w-16 sm:w-20 rounded-2xl bg-gradient-to-br from-slate-900 to-slate-800 dark:from-slate-700 dark:to-slate-800 hover:from-slate-800 active:scale-95 text-white flex flex-col items-center justify-center gap-0.5 shadow-lg transition shrink-0">
                <Camera className="h-5 w-5 sm:h-6 sm:w-6" />
                <span className="text-[9px] sm:text-[10px] font-extrabold uppercase">Scan</span>
              </button>
            </div>

            <form onSubmit={(e) => { e.preventDefault(); if (barcodeInput.trim()) { handleBarcode(barcodeInput); setBarcodeInput(''); } }} className="relative">
              <ScanLine className="h-4 w-4 sm:h-5 sm:w-5 text-emerald-600 dark:text-emerald-400 absolute left-3 top-1/2 -translate-y-1/2" />
              <input ref={barcodeRef} value={barcodeInput} onChange={(e) => setBarcodeInput(e.target.value)}
                placeholder="Barcode gun ready... (product ya combo dono)"
                className="h-10 sm:h-12 w-full rounded-2xl border-2 border-emerald-300 dark:border-emerald-500/40 bg-emerald-50 dark:bg-emerald-500/10 pl-10 sm:pl-11 pr-3 text-sm sm:text-base font-mono font-extrabold text-emerald-900 dark:text-emerald-200 placeholder:text-emerald-400 dark:placeholder:text-emerald-600 focus:outline-none focus:border-emerald-600 focus:ring-2 focus:ring-emerald-200 dark:focus:ring-emerald-500/20" />
            </form>

            {viewMode === 'products' && categories.length > 0 && (
              <div className="flex gap-1.5 overflow-x-auto pb-1 -mx-1 px-1">
                <button onClick={() => setCategoryId('')}
                  className={['shrink-0 h-9 sm:h-10 px-3 rounded-xl text-xs sm:text-sm font-extrabold inline-flex items-center gap-1.5 border-2 transition active:scale-95',
                    !categoryId ? 'bg-sky-600 text-white border-sky-600 shadow-md' : 'bg-white dark:bg-slate-800 text-slate-700 dark:text-slate-200 border-slate-200 dark:border-slate-700 hover:border-sky-300'].join(' ')}>
                  <Grid3x3 className="h-3.5 w-3.5" /> Sab
                  <span className={['px-1.5 rounded-md text-[10px] tabular-nums', !categoryId ? 'bg-white/20' : 'bg-slate-100 dark:bg-slate-700'].join(' ')}>{products.length}</span>
                </button>
                {categories.map((cat: any) => {
                  const count = categoryCounts[cat.id] || 0;
                  if (count === 0) return null;
                  const active = categoryId === cat.id;
                  return (
                    <button key={cat.id} onClick={() => setCategoryId(active ? '' : cat.id)}
                      className="shrink-0 h-9 sm:h-10 px-3 rounded-xl text-xs sm:text-sm font-extrabold inline-flex items-center gap-1.5 border-2 transition active:scale-95"
                      style={{
                        backgroundColor: active ? cat.color : undefined,
                        borderColor: active ? cat.color : undefined,
                        color: active ? '#fff' : undefined,
                      }}>
                      {!active && <span className="h-2 w-2 rounded-full" style={{ backgroundColor: cat.color }} />}
                      <span className={active ? '' : 'text-slate-700 dark:text-slate-200'}>{cat.name}</span>
                      <span className={['px-1.5 rounded-md text-[10px] tabular-nums', active ? 'bg-white/20' : 'bg-slate-100 dark:bg-slate-700 text-slate-600 dark:text-slate-300'].join(' ')}>{count}</span>
                    </button>
                  );
                })}
              </div>
            )}
          </div>

          <div ref={scrollRef} onScroll={handleScroll} className="lg:flex-1 lg:overflow-y-auto p-2 sm:p-3 bg-slate-50/50 dark:bg-slate-950/40 lg:min-h-0">
            {isLoading ? (
              <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 lg:grid-cols-3 xl:grid-cols-4 2xl:grid-cols-5 gap-2 sm:gap-3">
                {Array.from({ length: 12 }).map((_, i) => <div key={i} className="aspect-[3/4] rounded-2xl bg-slate-200 dark:bg-slate-800 animate-pulse" />)}
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
                      className="mt-3 w-full h-12 rounded-2xl bg-white dark:bg-slate-800 border-4 border-slate-200 dark:border-slate-700 hover:border-sky-400 active:scale-[0.98] text-slate-700 dark:text-slate-200 text-sm font-extrabold inline-flex items-center justify-center gap-2 transition">
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
              Object.keys(groupedQuickKeys).length === 0 ? (
                <EmptyState icon={Zap} title="Koi quick key nahi" hint={quickKeys.length === 0 ? 'Pehle setup karein — /retail/quick-keys' : 'Filter change karo'} />
              ) : (
                <div className="space-y-4">
                  {Object.entries(groupedQuickKeys).map(([group, keys]) => (
                    <div key={group}>
                      <div className="text-[10px] uppercase font-extrabold text-slate-600 dark:text-slate-400 tracking-wider mb-2 flex items-center gap-1.5">
                        <div className="h-1 w-6 rounded-full bg-amber-500" />
                        {group}
                        <span className="px-1.5 py-0.5 rounded bg-slate-200 dark:bg-slate-700 text-slate-700 dark:text-slate-300 text-[9px] tabular-nums">{keys.length}</span>
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

        <CartPanel
          isMobile={showMobileCart}
          onCloseMobile={() => setShowMobileCart(false)}
          cart={cart}
          itemCount={itemCount}
          totalQty={totalQty}
          subtotal={subtotal}
          total={total}
          totalSavings={totalSavings}
          discountMode={discountMode}
          discountPct={discountPct}
          discountRs={Number(discountRs) || 0}
          discountAmount={discountAmount}
          onOpenDiscount={() => setShowDiscountModal(true)}
          onClearDiscount={() => { setDiscountPct(0); setDiscountRs(0); }}
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
          priceEditId={priceEditId}
          onStartPriceEdit={setPriceEditId}
          onSetPrice={setLinePrice}
          onCheckout={() => setShowCheckout(true)}
          canCheckout={!!currentShopId}
        />
      </div>

      {cart.length > 0 && !showMobileCart && (
        <div className="lg:hidden fixed bottom-4 inset-x-4 z-30">
          <button onClick={() => setShowMobileCart(true)}
            className="w-full h-16 rounded-2xl bg-gradient-to-r from-emerald-600 to-green-600 text-white shadow-2xl active:scale-[0.98] flex items-center justify-between px-5 transition">
            <div className="flex items-center gap-3">
              <div className="relative">
                <ShoppingCart className="h-6 w-6" />
                <span className="absolute -top-2 -right-2 min-w-[22px] h-5 px-1 rounded-full bg-white text-emerald-700 text-[11px] font-extrabold flex items-center justify-center tabular-nums">
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

/* ═════════════════════════════════════════════════════════════
   💎 DISCOUNT MODAL — Billion-$ UX
   ═════════════════════════════════════════════════════════════ */
function DiscountModal({ subtotal, mode: initMode, pct: initPct, rs: initRs, onApply, onClose }: {
  subtotal: number;
  mode: DiscountMode;
  pct: number;
  rs: number;
  onApply: (mode: DiscountMode, pct: number, rs: number) => void;
  onClose: () => void;
}) {
  const [mode, setMode] = useState<DiscountMode>(initMode);
  const [pct, setPct] = useState<string>(initPct ? String(initPct) : '');
  const [rs, setRs] = useState<string>(initRs ? String(initRs) : '');

  const pctNum = Math.min(Math.max(Number(pct) || 0, 0), 100);
  const rsNum = Math.max(Math.min(Number(rs) || 0, subtotal), 0);

  const amount = mode === 'pct' ? (subtotal * pctNum) / 100 : rsNum;
  const finalTotal = Math.max(subtotal - amount, 0);
  const effectivePct = subtotal > 0 ? (amount / subtotal) * 100 : 0;

  const apply = () => onApply(mode, pctNum, rsNum);
  const clear = () => { setPct(''); setRs(''); onApply(mode, 0, 0); };

  const numpadPress = (key: string) => {
    if (mode === 'pct') {
      if (key === 'C') return setPct('');
      if (key === '⌫') return setPct((v) => v.slice(0, -1));
      if (key === '.' && pct.includes('.')) return;
      setPct((v) => (v === '0' ? key : v + key).slice(0, 5));
    } else {
      if (key === 'C') return setRs('');
      if (key === '⌫') return setRs((v) => v.slice(0, -1));
      if (key === '.' && rs.includes('.')) return;
      setRs((v) => (v === '0' ? key : v + key).slice(0, 10));
    }
  };

  useEffect(() => {
    const onKey = (e: KeyboardEvent) => {
      if (e.key === 'Enter') { e.preventDefault(); apply(); }
    };
    window.addEventListener('keydown', onKey);
    return () => window.removeEventListener('keydown', onKey);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [mode, pct, rs]);

  return (
    <div className="fixed inset-0 z-50 bg-slate-950/80 backdrop-blur-md flex items-end sm:items-center justify-center p-0 sm:p-4" onClick={onClose}>
      <div
        className="w-full sm:max-w-md bg-white dark:bg-slate-900 rounded-t-3xl sm:rounded-3xl shadow-2xl overflow-hidden max-h-[96vh] flex flex-col animate-in slide-in-from-bottom sm:zoom-in duration-200"
        onClick={(e) => e.stopPropagation()}
      >
        {/* Head */}
        <div className="shrink-0 relative px-5 py-4 bg-gradient-to-br from-amber-500 via-orange-500 to-rose-500 text-white overflow-hidden">
          <div className="absolute -top-10 -right-10 h-40 w-40 rounded-full bg-white/10 blur-2xl" />
          <div className="relative flex items-start justify-between">
            <div>
              <div className="inline-flex items-center gap-1.5 rounded-full bg-white/20 backdrop-blur px-2.5 py-0.5 text-[10px] font-extrabold border border-white/30">
                <Tag className="h-3 w-3" /> Discount
              </div>
              <div className="mt-2 text-xs font-bold text-white/85">Subtotal</div>
              <div className="text-2xl font-extrabold tabular-nums leading-none">{formatPKR(subtotal)}</div>
            </div>
            <button onClick={onClose} className="h-10 w-10 rounded-2xl bg-white/20 hover:bg-white/30 active:scale-95 flex items-center justify-center transition">
              <X className="h-5 w-5" />
            </button>
          </div>
        </div>

        {/* Mode toggle */}
        <div className="shrink-0 px-5 pt-4">
          <div className="grid grid-cols-2 gap-2 p-1 bg-slate-100 dark:bg-slate-800 rounded-2xl">
            <button
              onClick={() => setMode('pct')}
              className={[
                'h-12 rounded-xl text-sm font-extrabold inline-flex items-center justify-center gap-1.5 transition',
                mode === 'pct'
                  ? 'bg-white dark:bg-slate-900 text-amber-700 dark:text-amber-300 shadow-md'
                  : 'text-slate-600 dark:text-slate-300',
              ].join(' ')}
            >
              <Percent className="h-4 w-4" /> Percent (%)
            </button>
            <button
              onClick={() => setMode('rs')}
              className={[
                'h-12 rounded-xl text-sm font-extrabold inline-flex items-center justify-center gap-1.5 transition',
                mode === 'rs'
                  ? 'bg-white dark:bg-slate-900 text-emerald-700 dark:text-emerald-300 shadow-md'
                  : 'text-slate-600 dark:text-slate-300',
              ].join(' ')}
            >
              <Banknote className="h-4 w-4" /> Rupees (Rs)
            </button>
          </div>
        </div>

        {/* Body */}
        <div className="flex-1 overflow-y-auto px-5 py-4 space-y-4">
          {/* Big display */}
          <div className={[
            'rounded-2xl border-2 p-4 text-center',
            mode === 'pct'
              ? 'border-amber-300 dark:border-amber-500/40 bg-gradient-to-br from-amber-50 to-orange-50 dark:from-amber-500/10 dark:to-orange-500/10'
              : 'border-emerald-300 dark:border-emerald-500/40 bg-gradient-to-br from-emerald-50 to-green-50 dark:from-emerald-500/10 dark:to-green-500/10',
          ].join(' ')}>
            <div className="text-[10px] uppercase tracking-widest font-extrabold text-slate-600 dark:text-slate-400 mb-1">
              {mode === 'pct' ? 'Kitne % Discount' : 'Kitne Rs Discount'}
            </div>
            <div className="flex items-baseline justify-center gap-1">
              {mode === 'rs' && <span className="text-2xl font-extrabold text-emerald-700 dark:text-emerald-400">Rs</span>}
              <div className={[
                'text-6xl font-extrabold tabular-nums leading-none',
                mode === 'pct' ? 'text-amber-700 dark:text-amber-300' : 'text-emerald-700 dark:text-emerald-300',
              ].join(' ')}>
                {mode === 'pct' ? (pct || '0') : (rs || '0')}
              </div>
              {mode === 'pct' && <span className="text-3xl font-extrabold text-amber-700 dark:text-amber-300">%</span>}
            </div>
          </div>

          {/* Presets */}
          <div>
            <div className="text-[10px] uppercase tracking-widest font-extrabold text-slate-600 dark:text-slate-400 mb-2 flex items-center gap-1">
              <Sparkles className="h-3 w-3" /> Jaldi Select
            </div>
            <div className="grid grid-cols-5 gap-1.5">
              {mode === 'pct'
                ? [5, 10, 15, 20, 25].map((v) => (
                    <button
                      key={v}
                      onClick={() => setPct(String(v))}
                      className={[
                        'h-11 rounded-xl text-sm font-extrabold tabular-nums transition active:scale-95 border-2',
                        Number(pct) === v
                          ? 'bg-amber-600 text-white border-amber-600 shadow-md'
                          : 'bg-white dark:bg-slate-800 border-amber-200 dark:border-amber-500/30 text-amber-800 dark:text-amber-300 hover:border-amber-400',
                      ].join(' ')}
                    >
                      {v}%
                    </button>
                  ))
                : [50, 100, 200, 500, 1000].map((v) => (
                    <button
                      key={v}
                      onClick={() => setRs(String(v))}
                      className={[
                        'h-11 rounded-xl text-xs font-extrabold tabular-nums transition active:scale-95 border-2',
                        Number(rs) === v
                          ? 'bg-emerald-600 text-white border-emerald-600 shadow-md'
                          : 'bg-white dark:bg-slate-800 border-emerald-200 dark:border-emerald-500/30 text-emerald-800 dark:text-emerald-300 hover:border-emerald-400',
                      ].join(' ')}
                    >
                      {v}
                    </button>
                  ))}
            </div>
          </div>

          {/* Numpad */}
          <div className="grid grid-cols-3 gap-1.5">
            {['1', '2', '3', '4', '5', '6', '7', '8', '9', '.', '0', '⌫'].map((k) => (
              <button
                key={k}
                onClick={() => numpadPress(k)}
                className={[
                  'h-12 rounded-xl text-lg font-extrabold transition active:scale-95 border-2',
                  k === '⌫'
                    ? 'bg-rose-50 dark:bg-rose-500/10 border-rose-200 dark:border-rose-500/30 text-rose-700 dark:text-rose-400'
                    : 'bg-white dark:bg-slate-800 border-slate-200 dark:border-slate-700 text-slate-900 dark:text-white hover:border-slate-400',
                ].join(' ')}
              >
                {k}
              </button>
            ))}
          </div>

          {/* Live summary */}
          <div className="rounded-2xl bg-gradient-to-br from-slate-950 to-slate-800 text-white p-4 shadow-lg">
            <div className="text-[10px] uppercase tracking-widest font-extrabold text-amber-300 mb-2 flex items-center gap-1">
              <Calculator className="h-3 w-3" /> Live Hisaab
            </div>
            <div className="space-y-1.5 text-sm font-bold">
              <div className="flex justify-between">
                <span className="text-white/70">Subtotal</span>
                <span className="tabular-nums">{formatPKR(subtotal)}</span>
              </div>
              <div className="flex justify-between text-rose-300">
                <span>Discount {mode === 'rs' && amount > 0 ? `(${effectivePct.toFixed(1)}%)` : ''}</span>
                <span className="tabular-nums">− {formatPKR(amount)}</span>
              </div>
              <div className="h-px bg-white/20 my-1.5" />
              <div className="flex justify-between text-lg font-extrabold">
                <span>Final Total</span>
                <span className="tabular-nums text-emerald-300">{formatPKR(finalTotal)}</span>
              </div>
            </div>
          </div>

          {amount > subtotal && (
            <div className="rounded-xl bg-rose-50 dark:bg-rose-500/15 border-2 border-rose-200 dark:border-rose-500/40 p-3 flex items-center gap-2 text-sm font-extrabold text-rose-800 dark:text-rose-300">
              <AlertTriangle className="h-4 w-4 shrink-0" />
              Discount subtotal se zyada nahi ho sakta
            </div>
          )}
        </div>

        {/* Footer */}
        <div className="shrink-0 border-t-2 border-slate-200 dark:border-slate-700 bg-slate-50 dark:bg-slate-900/80 p-3 grid grid-cols-3 gap-2">
          <button
            onClick={clear}
            className="h-14 rounded-2xl bg-white dark:bg-slate-800 border-2 border-slate-200 dark:border-slate-700 text-sm font-extrabold text-slate-700 dark:text-slate-200 hover:border-rose-300 hover:text-rose-600 transition inline-flex items-center justify-center gap-1"
          >
            <RotateCcw className="h-4 w-4" /> Clear
          </button>
          <button
            onClick={onClose}
            className="h-14 rounded-2xl bg-white dark:bg-slate-800 border-2 border-slate-200 dark:border-slate-700 text-sm font-extrabold text-slate-700 dark:text-slate-200 transition"
          >
            Cancel
          </button>
          <button
            onClick={apply}
            className={[
              'h-14 rounded-2xl font-extrabold text-white shadow-lg inline-flex items-center justify-center gap-1.5 transition active:scale-95',
              mode === 'pct'
                ? 'bg-gradient-to-r from-amber-600 to-orange-600 hover:from-amber-700 hover:to-orange-700 shadow-amber-500/40'
                : 'bg-gradient-to-r from-emerald-600 to-green-600 hover:from-emerald-700 hover:to-green-700 shadow-emerald-500/40',
            ].join(' ')}
          >
            <Check className="h-5 w-5" /> Apply
          </button>
        </div>
      </div>
    </div>
  );
}

/* ═════════════════════════════════════════════════════════════
   ⚖️ WEIGH SALE MODAL
   ═════════════════════════════════════════════════════════════ */
function WeighSaleModal({ product, unit, onConfirm, onClose }: {
  product: Product;
  unit: RetailUnitOption;
  onConfirm: (qty: number) => void;
  onClose: () => void;
}) {
  const base = unit.unitName.toLowerCase();
  const pricePerUnit = unit.price;

  const subUnits = useMemo(() => {
    if (base === 'kg') return [{ k: 'kg', l: 'KG', toBase: 1 }, { k: 'g', l: 'Gram', toBase: 0.001 }];
    if (base === 'gram' || base === 'g') return [{ k: 'g', l: 'Gram', toBase: 1 }, { k: 'kg', l: 'KG', toBase: 1000 }];
    if (base === 'liter' || base === 'litre' || base === 'l') return [{ k: 'l', l: 'Liter', toBase: 1 }, { k: 'ml', l: 'ml', toBase: 0.001 }];
    if (base === 'ml') return [{ k: 'ml', l: 'ml', toBase: 1 }, { k: 'l', l: 'Liter', toBase: 1000 }];
    return [{ k: base, l: unit.unitName.toUpperCase(), toBase: 1 }];
  }, [base, unit.unitName]);

  const [mode, setMode] = useState<'weight' | 'money'>('money');
  const [subUnit, setSubUnit] = useState(subUnits[0].k);
  const [weightInput, setWeightInput] = useState<number | ''>('');
  const [moneyInput, setMoneyInput] = useState<number | ''>('');

  const activeSub = subUnits.find((s) => s.k === subUnit) || subUnits[0];

  const baseQty = mode === 'weight' ? Number(weightInput || 0) * activeSub.toBase : 0;
  const weightPrice = baseQty * pricePerUnit;
  const moneyBaseQty = mode === 'money' && pricePerUnit > 0 ? Number(moneyInput || 0) / pricePerUnit : 0;

  const finalBaseQty = mode === 'weight' ? baseQty : moneyBaseQty;
  const finalPrice = mode === 'weight' ? weightPrice : Number(moneyInput || 0);
  const stockBase = Number(product.stock || 0) / unit.conversionRate;
  const overStock = finalBaseQty > 0 && finalBaseQty > stockBase;
  const canAdd = finalBaseQty > 0 && !overStock;

  const weightPresets = base === 'gram' || base === 'g'
    ? [100, 250, 500, 1000]
    : [0.25, 0.5, 1, 2, 5];
  const moneyPresets = [20, 50, 100, 200, 500];

  const submit = () => { if (canAdd) onConfirm(finalBaseQty); };

  useEffect(() => {
    const onKey = (e: KeyboardEvent) => {
      if (e.key === 'Escape') onClose();
      if (e.key === 'Enter' && canAdd) { e.preventDefault(); submit(); }
    };
    window.addEventListener('keydown', onKey);
    return () => window.removeEventListener('keydown', onKey);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [canAdd, finalBaseQty, finalPrice, mode, weightInput, moneyInput]);

  return (
    <div className="fixed inset-0 z-50 bg-slate-950/80 backdrop-blur-sm flex items-end sm:items-center justify-center p-0 sm:p-4" onClick={onClose}>
      <div
        className="w-full sm:max-w-md bg-white dark:bg-slate-900 rounded-t-3xl sm:rounded-3xl shadow-2xl overflow-hidden max-h-[94vh] flex flex-col animate-in slide-in-from-bottom sm:zoom-in duration-200"
        onClick={(e) => e.stopPropagation()}
      >
        <div className="shrink-0 px-5 py-4 bg-gradient-to-br from-amber-600 to-orange-700 text-white flex items-start justify-between gap-3">
          <div className="min-w-0">
            <div className="inline-flex items-center gap-1.5 rounded-full bg-white/20 px-2 py-0.5 text-[10px] font-extrabold">
              <Scale className="h-3 w-3" /> Weigh Machine Sale
            </div>
            <h3 className="font-extrabold text-lg mt-1.5 truncate">{product.name}</h3>
            <div className="text-xs text-white/85 font-bold">
              {formatPKR(pricePerUnit)} / {unit.unitName} • Stock {stockBase.toFixed(stockBase % 1 === 0 ? 0 : 2)}
            </div>
          </div>
          <button onClick={onClose} className="h-9 w-9 rounded-lg bg-white/20 hover:bg-white/30 flex items-center justify-center shrink-0 transition">
            <X className="h-4 w-4" />
          </button>
        </div>

        <div className="flex-1 overflow-y-auto p-5 space-y-4">
          <div className="grid grid-cols-2 gap-2">
            <button
              onClick={() => setMode('money')}
              className={[
                'py-3.5 rounded-2xl border-2 font-extrabold text-sm transition',
                mode === 'money'
                  ? 'border-emerald-600 bg-emerald-50 dark:bg-emerald-500/15 text-emerald-800 dark:text-emerald-300 shadow-md'
                  : 'border-slate-200 dark:border-slate-700 bg-white dark:bg-slate-800 text-slate-600 dark:text-slate-300',
              ].join(' ')}
            >
              💰 Paise Se
              <div className="text-[10px] font-bold opacity-70">"100 ka aata de do"</div>
            </button>
            <button
              onClick={() => setMode('weight')}
              className={[
                'py-3.5 rounded-2xl border-2 font-extrabold text-sm transition',
                mode === 'weight'
                  ? 'border-amber-600 bg-amber-50 dark:bg-amber-500/15 text-amber-800 dark:text-amber-300 shadow-md'
                  : 'border-slate-200 dark:border-slate-700 bg-white dark:bg-slate-800 text-slate-600 dark:text-slate-300',
              ].join(' ')}
            >
              ⚖️ Wazan Se
              <div className="text-[10px] font-bold opacity-70">"250 gram daal"</div>
            </button>
          </div>

          {subUnits.length > 1 && (
            <div className="flex gap-1 bg-slate-100 dark:bg-slate-800 rounded-xl p-1 w-max mx-auto">
              {subUnits.map((s) => (
                <button key={s.k} onClick={() => setSubUnit(s.k)}
                  className={['px-4 py-1.5 rounded-lg text-xs font-extrabold transition',
                    subUnit === s.k ? 'bg-amber-600 text-white shadow-sm' : 'text-slate-600 dark:text-slate-300'].join(' ')}>
                  {s.l}
                </button>
              ))}
            </div>
          )}

          {mode === 'weight' ? (
            <div>
              <label className="block text-xs font-extrabold uppercase tracking-wider text-slate-600 dark:text-slate-400 mb-1.5">
                Kitna wazan? ({activeSub.l})
              </label>
              <input autoFocus type="number" inputMode="decimal" step="any" min={0} value={weightInput}
                onChange={(e) => setWeightInput(e.target.value === '' ? '' : Number(e.target.value))}
                placeholder="0"
                className="h-16 w-full rounded-2xl border-2 border-amber-400 dark:border-amber-500/40 bg-amber-50 dark:bg-amber-500/10 px-4 text-center text-3xl font-extrabold tabular-nums text-amber-900 dark:text-amber-200 focus:outline-none focus:border-amber-600 transition" />
              <div className="mt-2 flex flex-wrap gap-1.5 justify-center">
                {weightPresets.map((w) => (
                  <button key={w} onClick={() => setWeightInput(w)}
                    className="px-3 py-1.5 rounded-xl bg-white dark:bg-slate-800 border-2 border-amber-200 dark:border-amber-500/40 hover:border-amber-400 text-amber-800 dark:text-amber-300 text-xs font-extrabold transition tabular-nums">
                    {w} {activeSub.k === 'g' ? 'g' : activeSub.k === 'ml' ? 'ml' : activeSub.l}
                  </button>
                ))}
              </div>
            </div>
          ) : (
            <div>
              <label className="block text-xs font-extrabold uppercase tracking-wider text-slate-600 dark:text-slate-400 mb-1.5">
                Kitne paise ka? (Rs)
              </label>
              <input autoFocus type="number" inputMode="decimal" step="any" min={0} value={moneyInput}
                onChange={(e) => setMoneyInput(e.target.value === '' ? '' : Number(e.target.value))}
                placeholder="0"
                className="h-16 w-full rounded-2xl border-2 border-emerald-400 dark:border-emerald-500/40 bg-emerald-50 dark:bg-emerald-500/10 px-4 text-center text-3xl font-extrabold tabular-nums text-emerald-900 dark:text-emerald-200 focus:outline-none focus:border-emerald-600 transition" />
              <div className="mt-2 flex flex-wrap gap-1.5 justify-center">
                {moneyPresets.map((m) => (
                  <button key={m} onClick={() => setMoneyInput(m)}
                    className="px-3.5 py-1.5 rounded-xl bg-white dark:bg-slate-800 border-2 border-emerald-200 dark:border-emerald-500/40 hover:border-emerald-400 text-emerald-800 dark:text-emerald-300 text-xs font-extrabold transition tabular-nums">
                    Rs {m}
                  </button>
                ))}
              </div>
            </div>
          )}

          <div className="rounded-2xl bg-gradient-to-br from-slate-950 to-amber-900 text-white p-4 shadow-lg">
            <div className="text-[10px] uppercase tracking-widest font-extrabold text-amber-300 mb-2 flex items-center gap-1">
              <Scale className="h-3 w-3" /> Live Hisaab
            </div>
            <div className="flex items-center justify-between gap-3 flex-wrap">
              <div>
                <div className="text-[10px] uppercase font-extrabold text-white/60">Wazan</div>
                <div className="text-2xl font-extrabold tabular-nums leading-none">
                  {(mode === 'weight' ? baseQty : moneyBaseQty).toFixed(3).replace(/\.?0+$/, '')}
                  <span className="text-sm font-bold text-white/60"> {unit.unitName}</span>
                </div>
              </div>
              <div className="text-2xl text-amber-300">=</div>
              <div className="text-right">
                <div className="text-[10px] uppercase font-extrabold text-white/60">Paise</div>
                <div className="text-3xl font-extrabold tabular-nums text-emerald-300 leading-none">{formatPKR(finalPrice)}</div>
              </div>
            </div>
          </div>

          {overStock && (
            <div className="rounded-xl bg-rose-50 dark:bg-rose-500/15 border-2 border-rose-200 dark:border-rose-500/40 p-2.5 flex items-center gap-2 text-xs font-bold text-rose-800 dark:text-rose-300">
              <AlertTriangle className="h-4 w-4 shrink-0" />
              Stock sirf {stockBase.toFixed(2)} {unit.unitName} hai
            </div>
          )}
        </div>

        <div className="shrink-0 border-t-2 border-slate-200 dark:border-slate-700 bg-slate-50 dark:bg-slate-900/80 p-4 flex gap-2">
          <button onClick={onClose} className="flex-1 h-12 rounded-2xl bg-white dark:bg-slate-800 border-2 border-slate-200 dark:border-slate-700 text-sm font-extrabold text-slate-700 dark:text-slate-200 transition">Cancel</button>
          <button onClick={submit} disabled={!canAdd}
            className="flex-[2] h-12 rounded-2xl bg-gradient-to-r from-amber-600 to-orange-700 hover:from-amber-700 hover:to-orange-800 disabled:opacity-40 text-white font-extrabold shadow-lg shadow-amber-500/40 inline-flex items-center justify-center gap-2 transition">
            <Plus className="h-4 w-4" /> Cart Me Daalo ({formatPKR(finalPrice)})
          </button>
        </div>
      </div>
    </div>
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
        active ? colors[color] : 'bg-transparent text-slate-600 dark:text-slate-300 hover:bg-slate-100 dark:hover:bg-slate-700',
      ].join(' ')}
    >
      {highlight && !active && <span className="absolute top-1 right-1 h-2 w-2 rounded-full bg-violet-500 animate-pulse" />}
      <Icon className="h-4 w-4" />
      <span>{label}</span>
      {count > 0 && (
        <span className={['px-1.5 rounded-md text-[10px] tabular-nums', active ? 'bg-white/25' : 'bg-slate-200 dark:bg-slate-700 text-slate-700 dark:text-slate-300'].join(' ')}>
          {count}
        </span>
      )}
      <span className={['hidden lg:inline text-[9px] font-mono px-1 rounded', active ? 'bg-white/20' : 'bg-slate-200 dark:bg-slate-700 text-slate-500 dark:text-slate-400'].join(' ')}>
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
  const isWeight = isWeightUnit(p.unit || '');
  return (
    <button onClick={onClick} disabled={out}
      className={['group relative text-left rounded-2xl border-4 overflow-hidden transition-all active:scale-95',
        out ? 'border-slate-200 dark:border-slate-700 bg-slate-100 dark:bg-slate-800/60 opacity-50 cursor-not-allowed'
          : cartQty > 0 ? 'border-emerald-500 bg-emerald-50 dark:bg-emerald-500/15 shadow-xl ring-4 ring-emerald-200 dark:ring-emerald-500/30'
            : 'border-slate-200 dark:border-slate-700 bg-white dark:bg-slate-900 hover:border-sky-400 dark:hover:border-sky-500/60 hover:shadow-xl hover:-translate-y-1'].join(' ')}>
      {cartQty > 0 && (
        <div className="absolute -top-2 -right-2 min-w-[32px] h-8 sm:min-w-[36px] sm:h-9 px-2 rounded-full bg-emerald-600 text-white text-sm sm:text-base font-extrabold flex items-center justify-center shadow-xl ring-4 ring-white dark:ring-slate-900 z-10 tabular-nums">
          {cartQty % 1 === 0 ? cartQty : cartQty.toFixed(1)}
        </div>
      )}
      <div className="aspect-square bg-slate-100 dark:bg-slate-800 overflow-hidden relative">
        {img ? (
          <img src={img} alt={p.name} loading="lazy" className="w-full h-full object-cover group-hover:scale-110 transition-transform duration-500" />
        ) : (
          <div className="w-full h-full flex items-center justify-center bg-gradient-to-br from-sky-50 to-cyan-50 dark:from-sky-500/10 dark:to-cyan-500/10">
            <span className="text-4xl sm:text-5xl">{unitEmoji(p.unit)}</span>
          </div>
        )}
        {out && <div className="absolute inset-0 bg-slate-900/60 flex items-center justify-center"><span className="px-3 py-1 rounded-xl bg-rose-600 text-white text-xs sm:text-sm font-extrabold shadow-lg">KHATAM</span></div>}
        {low && !out && <div className="absolute top-1.5 right-1.5 px-1.5 py-0.5 rounded-md bg-amber-500 text-white text-[10px] font-extrabold shadow-lg animate-pulse">KAM</div>}
        {p.isFeatured && !out && <div className="absolute top-1.5 left-1.5 h-7 w-7 rounded-full bg-amber-500 flex items-center justify-center shadow-lg"><Star className="h-3.5 w-3.5 fill-white text-white" /></div>}
        {isWeight && !out && (
          <div className="absolute bottom-1.5 right-1.5 px-1.5 py-0.5 rounded-md bg-amber-600/95 text-white text-[9px] font-extrabold shadow-lg inline-flex items-center gap-0.5">
            <Scale className="h-2.5 w-2.5" /> WAZAN
          </div>
        )}
      </div>
      <div className="p-2 sm:p-3">
        <div className="font-extrabold text-slate-900 dark:text-white text-sm sm:text-base line-clamp-2 leading-tight min-h-[2.25rem] sm:min-h-[2.5rem]">{p.name}</div>
        <div className="mt-1.5 sm:mt-2 flex items-end justify-between gap-1">
          <div>
            <div className="text-lg sm:text-2xl font-extrabold text-emerald-700 dark:text-emerald-400 leading-none tabular-nums">{hidePrices ? '•••' : formatPKR(p.price)}</div>
            <div className="text-[10px] sm:text-xs font-bold text-slate-500 dark:text-slate-400 mt-0.5">per {p.unit}</div>
          </div>
          <div className={['text-xs sm:text-sm font-extrabold tabular-nums shrink-0', out ? 'text-rose-700 dark:text-rose-400' : low ? 'text-amber-700 dark:text-amber-400' : 'text-slate-600 dark:text-slate-300'].join(' ')}>
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
        cartQty > 0 ? 'border-emerald-500 bg-emerald-50 dark:bg-emerald-500/15 shadow-xl ring-4 ring-emerald-200 dark:ring-emerald-500/30'
          : 'border-violet-200 dark:border-violet-500/40 bg-gradient-to-br from-white via-violet-50 to-white dark:from-slate-900 dark:via-violet-500/10 dark:to-slate-900 hover:border-violet-400 dark:hover:border-violet-500/60 hover:shadow-xl hover:-translate-y-1'].join(' ')}>
      {cartQty > 0 && (
        <div className="absolute -top-2 -right-2 min-w-[32px] h-8 px-2 rounded-full bg-emerald-600 text-white text-sm font-extrabold flex items-center justify-center shadow-xl ring-4 ring-white dark:ring-slate-900 z-10 tabular-nums">{cartQty}</div>
      )}
      <div className="aspect-square bg-gradient-to-br from-violet-100 to-fuchsia-100 dark:from-violet-500/20 dark:to-fuchsia-500/20 overflow-hidden relative">
        {combo.imageUrl ? (
          <img src={combo.imageUrl} alt={combo.name} loading="lazy" className="w-full h-full object-cover group-hover:scale-110 transition-transform duration-500" />
        ) : (
          <div className="w-full h-full flex items-center justify-center"><span className="text-5xl sm:text-6xl">🎁</span></div>
        )}
        <div className="absolute top-1.5 left-1.5 px-2 py-0.5 rounded-md bg-violet-600 text-white text-[9px] font-extrabold uppercase tracking-wider shadow-lg">Combo</div>
        {savingsPct > 0 && (
          <div className="absolute bottom-1.5 left-1.5 px-2 py-0.5 rounded-md bg-emerald-500 text-white text-xs font-extrabold shadow-lg tabular-nums">Save {savingsPct.toFixed(0)}%</div>
        )}
        {combo.isFeatured && (
          <div className="absolute top-1.5 right-1.5 h-7 w-7 rounded-full bg-amber-500 flex items-center justify-center shadow-lg"><Star className="h-3.5 w-3.5 fill-white text-white" /></div>
        )}
      </div>
      <div className="p-2 sm:p-3">
        <div className="font-extrabold text-slate-900 dark:text-white text-sm sm:text-base line-clamp-2 leading-tight min-h-[2.25rem] sm:min-h-[2.5rem]">{combo.name}</div>
        {combo.tagLine && <div className="text-[10px] font-extrabold text-violet-700 dark:text-violet-400 uppercase mt-0.5 line-clamp-1">{combo.tagLine}</div>}
        <div className="mt-1.5 flex items-end justify-between gap-1">
          <div>
            <div className="text-lg sm:text-2xl font-extrabold text-emerald-700 dark:text-emerald-400 leading-none tabular-nums">{hidePrices ? '•••' : formatPKR(combo.comboPrice)}</div>
            {savings > 0 && !hidePrices && <div className="text-[10px] text-slate-500 dark:text-slate-400 line-through font-bold mt-0.5 tabular-nums">{formatPKR(combo.originalTotal)}</div>}
          </div>
          <div className="text-[10px] font-extrabold text-violet-700 dark:text-violet-400 shrink-0">{combo.items.length} items</div>
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
      className={['group relative text-left rounded-2xl border-4 p-2.5 sm:p-3 transition-all active:scale-95 aspect-square flex flex-col items-center justify-center bg-white dark:bg-slate-900',
        out ? 'opacity-50 cursor-not-allowed border-slate-200 dark:border-slate-700 bg-slate-100 dark:bg-slate-800/60' : 'hover:shadow-xl hover:-translate-y-1'].join(' ')}
      style={{ borderColor: out ? undefined : (qk.color || '#f59e0b') }}>
      <div className="absolute inset-0 opacity-10 dark:opacity-15 pointer-events-none rounded-2xl" style={{ background: qk.color || '#f59e0b' }} />
      {qk.hotkey && <div className="absolute top-1 right-1 px-1.5 py-0.5 rounded bg-slate-900 dark:bg-white text-white dark:text-slate-900 text-[9px] font-mono font-extrabold z-10">{qk.hotkey}</div>}
      {qk.icon && <div className="text-3xl sm:text-4xl mb-1 relative">{qk.icon}</div>}
      <div className="font-extrabold text-slate-900 dark:text-white text-xs sm:text-sm text-center leading-tight line-clamp-2 relative">{qk.label}</div>
      {price > 0 && <div className="mt-1 text-xs font-extrabold text-emerald-700 dark:text-emerald-400 tabular-nums relative">{hidePrices ? '•••' : formatPKR(price)}</div>}
      {combo && <div className="absolute bottom-1 left-1 px-1.5 py-0.5 rounded bg-violet-600 text-white text-[8px] font-extrabold uppercase">Combo</div>}
    </button>
  );
}

/* ══════════ EMPTY STATE ══════════ */
function EmptyState({ icon: Icon, title, hint, onClear }: any) {
  return (
    <div className="flex flex-col items-center justify-center py-16 px-6">
      <div className="h-20 w-20 rounded-3xl bg-slate-200 dark:bg-slate-800 flex items-center justify-center">
        <Icon className="h-10 w-10 text-slate-400 dark:text-slate-500" />
      </div>
      <h3 className="mt-4 font-extrabold text-slate-900 dark:text-white text-xl">{title}</h3>
      <p className="mt-2 text-sm text-slate-500 dark:text-slate-400 text-center font-semibold">{hint}</p>
      {onClear && (
        <button onClick={onClear} className="mt-4 h-12 px-5 rounded-2xl bg-sky-600 hover:bg-sky-700 active:scale-95 text-white font-extrabold transition inline-flex items-center gap-2">
          <RotateCcw className="h-4 w-4" /> Clear
        </button>
      )}
    </div>
  );
}

/* ═════════════════════════════════════════════════════════════
   CART PANEL
   ═════════════════════════════════════════════════════════════ */
function CartPanel({
  isMobile, onCloseMobile, cart, itemCount, totalQty, subtotal, total, totalSavings,
  discountMode, discountPct, discountRs, discountAmount, onOpenDiscount, onClearDiscount,
  hidePrices, customers, customerId, setCustomerId, selectedCustomer, onAddCustomer,
  onHold, onClear, onChangeQty, onSetQty, onRemove, priceEditId, onStartPriceEdit,
  onSetPrice, onCheckout, canCheckout,
}: any) {
  const containerClass = isMobile
    ? 'fixed inset-0 z-40 bg-white dark:bg-slate-950 flex flex-col lg:hidden animate-in slide-in-from-bottom duration-200'
    : 'hidden lg:flex rounded-3xl bg-white dark:bg-slate-900/80 dark:backdrop-blur-sm border-2 border-slate-200 dark:border-slate-800 shadow-sm dark:shadow-black/20 overflow-hidden flex-col min-h-0';

  const hasDiscount = discountAmount > 0;

  return (
    <aside className={containerClass}>
      <div className="shrink-0 relative overflow-hidden bg-gradient-to-br from-slate-950 via-emerald-900 to-emerald-700 dark:from-slate-950 dark:via-emerald-950 dark:to-emerald-900 text-white px-3 sm:px-4 py-3 sm:py-4">
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
            {hasDiscount && !hidePrices && (
              <div className="text-xs font-bold text-amber-300 mt-0.5 tabular-nums inline-flex items-center gap-1">
                <Tag className="h-3 w-3" /> Discount {discountMode === 'pct' ? `${discountPct}%` : ''} • Save {formatPKR(discountAmount)}
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

      <div className="shrink-0 px-3 py-2.5 border-b-2 border-slate-100 dark:border-slate-800 bg-slate-50 dark:bg-slate-900/60">
        <div className="flex gap-2">
          <div className="relative flex-1">
            <User className="h-4 w-4 sm:h-5 sm:w-5 text-violet-600 dark:text-violet-400 absolute left-3 top-1/2 -translate-y-1/2 pointer-events-none" />
            <select value={customerId} onChange={(e) => setCustomerId(e.target.value)}
              className="h-12 sm:h-14 w-full rounded-2xl border-4 border-slate-200 dark:border-slate-700 bg-white dark:bg-slate-800 pl-10 sm:pl-11 pr-9 text-sm sm:text-base font-bold text-slate-900 dark:text-white focus:outline-none focus:border-violet-500 appearance-none">
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
          <div className="mt-2 px-3 py-1.5 rounded-xl bg-amber-100 dark:bg-amber-500/20 border-2 border-amber-300 dark:border-amber-500/40 text-xs sm:text-sm font-extrabold text-amber-900 dark:text-amber-200 inline-flex items-center gap-1.5">
            <AlertTriangle className="h-3.5 w-3.5" /> Purana udhaar: {formatPKR(selectedCustomer.balance)}
          </div>
        )}
      </div>

      <div className="flex-1 overflow-y-auto p-2.5 sm:p-3 space-y-2 bg-slate-50/50 dark:bg-slate-950/40 min-h-0">
        {cart.length === 0 ? (
          <div className="rounded-3xl bg-white dark:bg-slate-900/80 border-4 border-dashed border-slate-200 dark:border-slate-700 p-8 sm:p-10 text-center">
            <div className="h-16 w-16 sm:h-20 sm:w-20 rounded-3xl bg-slate-100 dark:bg-slate-800 mx-auto flex items-center justify-center">
              <ShoppingCart className="h-8 w-8 sm:h-10 sm:w-10 text-slate-400 dark:text-slate-500" />
            </div>
            <p className="mt-4 font-extrabold text-slate-700 dark:text-slate-200 text-lg sm:text-xl">Cart khaali hai</p>
            <p className="text-xs sm:text-sm text-slate-500 dark:text-slate-400 font-semibold mt-1">Barcode scan karo, product/combo/quick key click karo</p>
            <p className="text-[11px] text-slate-400 dark:text-slate-500 font-bold mt-2 inline-flex items-center gap-1">
              <Scale className="h-3 w-3 text-amber-500" /> Daal/rice — wazan ya paise likho
            </p>
          </div>
        ) : (
          cart.map((l: CartLine) => (
            <CartRow
              key={l.id}
              line={l}
              hidePrices={hidePrices}
              editing={priceEditId === l.id}
              onStartPriceEdit={() => onStartPriceEdit(l.id)}
              onSetPrice={(p: number) => onSetPrice(l.id, p)}
              onCancelPriceEdit={() => onStartPriceEdit(null)}
              onChangeQty={(d: number) => onChangeQty(l.id, d)}
              onSetQty={(q: number) => onSetQty(l.id, q)}
              onRemove={() => onRemove(l.id)}
            />
          ))
        )}
      </div>

      {cart.length > 0 && (
        <div className="shrink-0 p-2.5 sm:p-3 border-t-4 border-slate-100 dark:border-slate-800 bg-white dark:bg-slate-900/80 space-y-2">
          {/* 💎 Discount button — opens modal */}
          <button
            onClick={onOpenDiscount}
            className={[
              'w-full h-12 rounded-2xl font-extrabold text-sm inline-flex items-center justify-between px-4 border-2 transition active:scale-[0.98]',
              hasDiscount
                ? 'bg-gradient-to-r from-amber-500 to-orange-500 border-amber-500 text-white shadow-md shadow-amber-500/30'
                : 'bg-white dark:bg-slate-800 border-slate-200 dark:border-slate-700 text-slate-700 dark:text-slate-200 hover:border-amber-400',
            ].join(' ')}
          >
            <span className="inline-flex items-center gap-2">
              <Tag className="h-4 w-4" />
              {hasDiscount
                ? <span>Discount: {discountMode === 'pct' ? `${discountPct}%` : formatPKR(discountRs)}</span>
                : <span>Discount lagayein?</span>}
            </span>
            <span className="inline-flex items-center gap-2">
              {hasDiscount && !hidePrices && <span className="text-xs tabular-nums opacity-90">−{formatPKR(discountAmount)}</span>}
              {hasDiscount ? (
                <span onClick={(e) => { e.stopPropagation(); onClearDiscount(); }}
                  className="h-6 w-6 rounded-lg bg-white/20 hover:bg-white/30 flex items-center justify-center transition"
                  role="button">
                  <X className="h-3.5 w-3.5" />
                </span>
              ) : (
                <ArrowRight className="h-4 w-4 opacity-60" />
              )}
            </span>
          </button>

          {/* Subtotal row (only if discount active, for clarity) */}
          {hasDiscount && !hidePrices && (
            <div className="text-xs font-bold text-slate-500 dark:text-slate-400 tabular-nums flex justify-between px-1">
              <span>Subtotal</span>
              <span className="line-through">{formatPKR(subtotal)}</span>
            </div>
          )}

          <button onClick={onCheckout} disabled={!canCheckout}
            className={['w-full h-[76px] sm:h-[88px] rounded-3xl font-extrabold text-white shadow-2xl transition-all active:scale-[0.98]',
              'bg-gradient-to-r from-emerald-600 to-green-600 hover:from-emerald-700 hover:to-green-700',
              'disabled:opacity-50 disabled:cursor-not-allowed',
              'flex items-center justify-between px-5 sm:px-6'].join(' ')}>
            <div className="text-left">
              <div className="text-[10px] sm:text-xs uppercase font-extrabold text-white/80 tracking-wider">
                Paisay lein <span className="hidden sm:inline">(F9)</span>
              </div>
              <FbrModeIndicator saleTotal={total} className="mb-2" />
              <div className="text-2xl sm:text-3xl tabular-nums leading-none mt-0.5">{formatPKR(total)}</div>
            </div>
            <div className="h-12 w-12 sm:h-14 sm:w-14 rounded-2xl bg-white/20 flex items-center justify-center">
              <ArrowRight className="h-6 w-6 sm:h-8 sm:w-8" />
            </div>
          </button>
          {!canCheckout && <p className="text-center text-xs font-extrabold text-rose-600 dark:text-rose-400">⚠️ Pehle shop select karein</p>}
        </div>
      )}
    </aside>
  );
}

/* ══════════ CART ROW ══════════ */
function CartRow({ line: l, hidePrices, editing, onStartPriceEdit, onSetPrice, onCancelPriceEdit, onChangeQty, onSetQty, onRemove }: any) {
  const [draft, setDraft] = useState('');
  const customPriced = Number(l.unitPrice) !== Number(l.basePrice);
  const isWeight = isWeightUnit(l.unitName);

  useEffect(() => { if (editing) setDraft(String(l.unitPrice)); }, [editing, l.unitPrice]);

  const commit = () => {
    const v = Number(draft);
    if (!isNaN(v) && v >= 0) onSetPrice(v);
    else onCancelPriceEdit();
  };

  return (
    <div className={[
      'rounded-2xl bg-white dark:bg-slate-900 border-4 p-2.5 sm:p-3 shadow-sm dark:shadow-black/20',
      l.type === 'combo' ? 'border-violet-300 dark:border-violet-500/40' : customPriced ? 'border-amber-300 dark:border-amber-500/40' : 'border-slate-200 dark:border-slate-700',
    ].join(' ')}>
      <div className="flex items-start gap-2.5 sm:gap-3">
        <div className={['h-12 w-12 sm:h-14 sm:w-14 rounded-xl overflow-hidden shrink-0 flex items-center justify-center relative bg-slate-100 dark:bg-slate-800',
          l.type === 'combo' ? 'bg-gradient-to-br from-violet-100 to-fuchsia-100 dark:from-violet-500/20 dark:to-fuchsia-500/20' : ''].join(' ')}>
          {l.image ? <img src={l.image} alt="" className="w-full h-full object-cover" /> : <span className="text-xl sm:text-2xl">{l.emoji}</span>}
          {l.type === 'combo' && (
            <div className="absolute -top-1 -right-1 h-5 w-5 rounded-full bg-violet-600 text-white flex items-center justify-center">
              <Sparkles className="h-3 w-3" />
            </div>
          )}
        </div>
        <div className="flex-1 min-w-0">
          <div className="flex items-center gap-1.5 flex-wrap">
            <div className="font-extrabold text-sm sm:text-base text-slate-900 dark:text-white leading-tight line-clamp-2">{l.name}</div>
            {l.type === 'combo' && <span className="px-1.5 py-0.5 rounded bg-violet-600 text-white text-[9px] font-extrabold uppercase tracking-wider shrink-0">Combo</span>}
            {customPriced && <span className="px-1.5 py-0.5 rounded bg-amber-500 text-white text-[9px] font-extrabold uppercase tracking-wider shrink-0">Custom ₹</span>}
          </div>

          {editing ? (
            <div className="mt-1 flex items-center gap-1.5">
              <span className="text-xs font-bold text-slate-500 dark:text-slate-400">Rs</span>
              <input autoFocus type="number" inputMode="decimal" step="any" min={0} value={draft}
                onChange={(e) => setDraft(e.target.value)}
                onKeyDown={(e) => { if (e.key === 'Enter') commit(); if (e.key === 'Escape') onCancelPriceEdit(); }}
                onBlur={commit}
                className="h-9 w-28 rounded-lg border-2 border-amber-400 dark:border-amber-500/50 bg-amber-50 dark:bg-amber-500/10 px-2 text-base font-extrabold tabular-nums text-amber-900 dark:text-amber-200 focus:outline-none" />
              <button onClick={commit} className="h-9 w-9 rounded-lg bg-emerald-600 text-white flex items-center justify-center"><Check className="h-4 w-4" /></button>
              <button onClick={() => onSetPrice(l.basePrice)} title="Wapas original rate"
                className="h-9 px-2 rounded-lg bg-slate-100 dark:bg-slate-800 text-slate-600 dark:text-slate-300 text-[10px] font-extrabold">Reset</button>
            </div>
          ) : (
            <button onClick={onStartPriceEdit} title="Rate badlo"
              className="mt-0.5 text-xs sm:text-sm font-bold text-sky-700 dark:text-sky-400 inline-flex items-center gap-1 hover:text-sky-900 dark:hover:text-sky-300 transition group/price">
              {l.emoji} {formatPKR(l.unitPrice)} / {l.unitName}
              <Pencil className="h-3 w-3 opacity-0 group-hover/price:opacity-100 transition" />
            </button>
          )}

          {l.note && <div className="text-[10px] sm:text-[11px] font-semibold text-slate-500 dark:text-slate-400 mt-0.5">{l.note}</div>}
          {customPriced && !editing && (
            <div className="text-[10px] font-bold text-slate-400 dark:text-slate-500 tabular-nums">(original {formatPKR(l.basePrice)})</div>
          )}
        </div>
        <button onClick={onRemove}
          className="h-9 w-9 sm:h-10 sm:w-10 rounded-xl bg-rose-50 dark:bg-rose-500/15 hover:bg-rose-100 dark:hover:bg-rose-500/25 active:scale-95 text-rose-600 dark:text-rose-400 flex items-center justify-center shrink-0 transition">
          <Trash2 className="h-4 w-4 sm:h-5 sm:w-5" />
        </button>
      </div>
      <div className="mt-2.5 sm:mt-3 flex items-center justify-between gap-2">
        <div className="inline-flex items-center bg-slate-100 dark:bg-slate-800 rounded-2xl overflow-hidden border-2 border-slate-200 dark:border-slate-700">
          <button onClick={() => onChangeQty(-1)} className="h-12 sm:h-14 w-12 sm:w-14 hover:bg-slate-200 dark:hover:bg-slate-700 active:bg-slate-300 flex items-center justify-center transition">
            <Minus className="h-5 w-5 sm:h-6 sm:w-6 text-slate-700 dark:text-slate-200" />
          </button>
          <input type="number" step="0.001" value={l.quantity}
            onChange={(e) => onSetQty(Number(e.target.value))}
            onFocus={(e) => e.target.select()}
            className="h-12 sm:h-14 min-w-[70px] w-[70px] sm:min-w-[80px] sm:w-[80px] text-center bg-white dark:bg-slate-900 border-0 text-lg sm:text-xl font-extrabold tabular-nums text-slate-900 dark:text-white focus:outline-none" />
          <button onClick={() => onChangeQty(1)}
            className={['h-12 sm:h-14 w-12 sm:w-14 text-white flex items-center justify-center transition',
              l.type === 'combo' ? 'bg-violet-600 hover:bg-violet-700 active:bg-violet-800' : isWeight ? 'bg-amber-600 hover:bg-amber-700' : 'bg-sky-600 hover:bg-sky-700 active:bg-sky-800'].join(' ')}>
            <Plus className="h-5 w-5 sm:h-6 sm:w-6" />
          </button>
        </div>
        <div className="text-xl sm:text-2xl font-extrabold text-emerald-700 dark:text-emerald-400 tabular-nums">
          {hidePrices ? '•••' : formatPKR(l.lineTotal)}
        </div>
      </div>
      {isWeight && (
        <div className="mt-1 text-[9px] font-extrabold text-amber-700 dark:text-amber-400 uppercase tracking-wider inline-flex items-center gap-1">
          <Scale className="h-2.5 w-2.5" /> Weigh item — +/− {qtyStep(l.unitName)} {l.unitName} step
        </div>
      )}
    </div>
  );
}

/* ══════════ POS TEACHER ══════════ */
function PosTeacher({ onClose }: { onClose: () => void }) {
  return (
    <div className="fixed inset-0 z-50 bg-black/60 backdrop-blur-sm flex items-end sm:items-center justify-center p-3" onClick={onClose}>
      <div className="w-full max-w-lg max-h-[90vh] overflow-y-auto rounded-3xl bg-white dark:bg-slate-900 border-2 border-sky-300 dark:border-sky-500/40 shadow-2xl" onClick={(e) => e.stopPropagation()}>
        <div className="px-5 py-3 border-b-2 border-sky-200 dark:border-sky-500/30 bg-gradient-to-r from-sky-50 to-cyan-50 dark:from-sky-500/15 dark:to-cyan-500/15 flex items-center justify-between sticky top-0 z-10">
          <h3 className="font-extrabold text-sky-900 dark:text-sky-200 flex items-center gap-2">
            <GraduationCap className="h-5 w-5" /> POS — Complete Guide
          </h3>
          <button onClick={onClose} className="h-8 w-8 rounded-lg hover:bg-white dark:hover:bg-slate-800 flex items-center justify-center transition">
            <X className="h-4 w-4 text-slate-600 dark:text-slate-300" />
          </button>
        </div>
        <div className="p-5 space-y-4">
          <div className="rounded-2xl border-2 border-amber-200 dark:border-amber-500/30 bg-amber-50/60 dark:bg-amber-500/5 p-4 space-y-2">
            <div className="text-[10px] uppercase tracking-widest font-extrabold text-amber-700 dark:text-amber-300 flex items-center gap-1">
              <Scale className="h-3 w-3" /> ⚖️ Daal / Rice / Aata (wazan wale)
            </div>
            <div className="space-y-1.5 text-xs font-semibold text-slate-700 dark:text-slate-200">
              <TipRow>Product pe click → <strong>💰 "Paise Se"</strong> me Rs 100 likho → wazan khud nikle</TipRow>
              <TipRow>Ya <strong>⚖️ "Wazan Se"</strong> — 250 gram likho → paise khud niklein</TipRow>
              <TipRow>Quick buttons: Rs 20/50/100 ya 250g/500g/1kg — 1 tap</TipRow>
            </div>
          </div>
          <div className="rounded-2xl border-2 border-sky-200 dark:border-sky-500/30 bg-sky-50/60 dark:bg-sky-500/5 p-4 space-y-2">
            <div className="text-[10px] uppercase tracking-widest font-extrabold text-sky-700 dark:text-sky-300">💎 Rate & Discount</div>
            <div className="space-y-1.5 text-xs font-semibold text-slate-700 dark:text-slate-200">
              <TipRow>Cart me <strong>price pe click</strong> karo → apni rate likho (custom price)</TipRow>
              <TipRow><strong>Discount button</strong> dabao → modal khulega — % ya Rs, numpad, presets, live hisaab</TipRow>
            </div>
          </div>
          <div className="rounded-xl bg-slate-50 dark:bg-slate-800/60 border border-slate-200 dark:border-slate-700 p-3 space-y-1.5 text-xs font-semibold text-slate-700 dark:text-slate-200">
            <TipRow><strong>F2</strong> scanner • <strong>F9</strong> paisay lo • <strong>F7/F8/F10</strong> tabs • <strong>F1</strong> ye guide</TipRow>
            <TipRow><strong>Hold</strong> — customer bhag gaya? cart hold karo, baad me resume</TipRow>
            <TipRow><strong>📴 Offline</strong> — net nahi? Sale phir bhi hogi, net aate hi sync</TipRow>
          </div>
          <button onClick={onClose}
            className="w-full h-12 rounded-2xl bg-gradient-to-r from-sky-600 to-cyan-700 hover:from-sky-700 hover:to-cyan-800 text-white font-extrabold shadow-lg shadow-sky-500/40 inline-flex items-center justify-center gap-2 transition">
            <CheckCircle2 className="h-4 w-4" /> Samajh Gaya — Sale Shuru!
          </button>
        </div>
      </div>
    </div>
  );
}

function TipRow({ children }: { children: React.ReactNode }) {
  return (
    <div className="flex items-start gap-2">
      <CheckCircle2 className="h-3.5 w-3.5 text-emerald-500 shrink-0 mt-0.5" />
      <span>{children}</span>
    </div>
  );
}
