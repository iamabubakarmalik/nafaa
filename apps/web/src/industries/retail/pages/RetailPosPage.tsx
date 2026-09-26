import { useState, useMemo, useEffect, useRef, useCallback } from 'react';
import { createPortal } from 'react-dom';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import {
  Search, ShoppingCart, Package, X, Plus, Minus, Trash2,
  Camera, ScanLine, User, UserPlus, CheckCircle2, Store,
  ChevronDown, Eye, EyeOff, Grid3x3, ArrowRight, Printer,
  AlertTriangle, Star, RotateCcw, Pause, Play, Percent,
  Wifi, WifiOff, Sparkles, Zap, Scale, GraduationCap,
  Banknote, Pencil, Check, Tag, Calculator, Mic,
  CreditCard, Smartphone, Building2, BookOpen, Wallet, Delete,
  Settings2, Receipt,
} from 'lucide-react';
import { toast } from 'sonner';
import { formatPKR } from '@core/lib/format';
import { useAuthStore, useShopParam } from '@core/stores/auth.store';
import { offlineProductsApi as productsApi } from '@core/lib/offline/offlineProducts';
import { offlineCustomersApi as customersApi } from '@core/lib/offline/offlineCustomers';
import { categoriesApi } from '@modules/inventory/categories/api/categories.api';
import { type PaymentMethod } from '@modules/sales/sales/api/sales.api';
import { offlineSalesApi } from '@core/lib/offline/offlineSales';
import {
  PosDeliveryPanel, emptyDelivery, deliveryAmount, deliveryServiceCharge,
  type PosDeliveryState,
} from '@modules/pos/components';
import type { Product } from '@modules/inventory/products/api/products.api';
import BarcodeScanner from '@core/components/barcode/BarcodeScanner';
import { productUnitsApi } from '../api/product-units.api';
import {
  printReceiptDirect,
  type ReceiptPayload,
} from '@modules/pos/lib/thermalReceipt';
import {
  derivePosUnits, buildUnitScanIndex, unitEmoji, isWeightUnit, qtyStep, unitKeyOf,
  type PosUnitOption,
} from '@modules/pos/lib/posUnits';
import { emptyReceiver, type PosReceiverValue } from '@modules/pos/components/PosReceiverField';
import {
  PosSettingsModal, PosCheckoutModal, PosUnitPickerModal, PosWeighModal,
  PosDiscountModal, PosCartPanel, PosCustomerPicker, PosTeacher,
  PosViewTab, PosProductTile, PosComboTile, PosQuickKeyTile, PosEmptyState,
  PosSuccessModal, PosCustomerAddModal, PosHoldCartsModal,
} from '@modules/pos/components';
import {
  POS_PAYMENT_METHODS, posLineId, posHeldId,
  type PosCartLine, type PosHeldCart, type PosCheckoutMode,
  type PosDiscountMode, type PosViewMode,
} from '@modules/pos/lib/posCart';
import { usePosPreferences } from '@modules/pos/hooks/usePosPreferences';
import { combosApi, type ProductCombo } from '../api/combos.api';
import { quickKeysApi, type QuickKey } from '../api/quick-keys.api';
import { FbrModeIndicator } from '@integrations/fbr/components/FbrModeIndicator';
import { VoiceSaleButton, type VoiceCommand } from '@core/components/voice/VoiceSaleButton';

/* ═════════════════════════════════════════════════════════════
   🚀 NAfaa RETAIL POS — 2-SECOND BILLING EDITION
   ─────────────────────────────────────────────────────────────
   ⚡ F12 = INSTANT CASH + AUTO-PRINT — receipt seedha print dialog
   🖨️  Receipt POS ke andar banti hai — receipt page pe jaana hi nahi
   ⚙️  Settings: printer width (58/80mm), auto-print, auto-close
   🎤 Voice • ⚖️ Weigh • 💎 Discount • 🎁 Combos • ⚡ Quick keys
   💵 Checkout: Full / Partial / Udhaar + change ya khata-deposit
   ⌨️  F1 guide • F2 scan • F6 voice • F9 checkout • F12 instant
   ═════════════════════════════════════════════════════════════ */

/* Cart ki shakal, settings, modals aur tile — sab ab
   `@modules/pos` me hain. Ye page sirf retail ka apna kaam karta
   hai: kaun sa maal, kaun si unit, aur bill kaise banta hai. */
type ViewMode = PosViewMode;
type DiscountMode = PosDiscountMode;
type CheckoutMode = PosCheckoutMode;
type UnitOption = PosUnitOption;
type CartLine = PosCartLine;
type HeldCart = PosHeldCart;

const lineId = posLineId;
const heldId = posHeldId;


/* 🖨️ Bill chhapne ka poora code ab `@modules/pos/lib/thermalReceipt`
   me hai — Bakery, Electronics aur Mobile bhi wohi istemal karein to
   bill ki har behtari chaaron jagah ek saath pohnche. */

/* 🗣️ Voice aliases */
const VOICE_ALIASES: Record<string, string> = {
  chini: 'cheeni sugar', cheeni: 'cheeni sugar', 'چینی': 'cheeni sugar',
  doodh: 'milk doodh', dudh: 'milk doodh', 'دودھ': 'milk doodh',
  patti: 'patti tea chai', chai: 'tea chai patti', 'پتی': 'patti tea', 'چائے': 'tea chai',
  chawal: 'rice chawal', 'چاول': 'rice chawal',
  aata: 'aata atta flour', atta: 'aata atta flour', 'آٹا': 'aata atta flour',
  ghee: 'ghee', 'گھی': 'ghee', tel: 'oil tel', 'تیل': 'oil tel',
  namak: 'salt namak', 'نمک': 'salt namak',
  anda: 'egg anda anday', anday: 'egg anda anday', 'انڈے': 'egg anda', 'انڈا': 'egg anda',
  sabun: 'soap sabun', 'صابن': 'soap sabun',
  daal: 'daal dal', dal: 'daal dal', 'دال': 'daal dal', 'دالیں': 'daal dal',
  aloo: 'potato aloo', 'آلو': 'potato aloo', pyaz: 'onion pyaz', 'پیاز': 'onion pyaz',
  tamatar: 'tomato tamatar', 'ٹماٹر': 'tomato tamatar',
  dahi: 'yogurt dahi', 'دہی': 'yogurt dahi',
  paani: 'water paani', 'پانی': 'water paani',
  biscuit: 'biscuit', 'بسکٹ': 'biscuit', chocolate: 'chocolate', 'چاکلیٹ': 'chocolate',
  masala: 'masala', 'مصالحہ': 'masala', seb: 'apple seb', 'سیب': 'apple seb',
  kela: 'banana kela', 'کیلا': 'banana kela',
};


export default function RetailPosPage() {
  const queryClient = useQueryClient();
  const currentShopId = useShopParam();
  const tenant = useAuthStore((s) => s.tenant);
  const shopPhone = useAuthStore((s: any) => s.user?.assignedShop?.phone || s.tenant?.phone || '');
  const shopAddress = useAuthStore((s: any) => s.user?.assignedShop?.address || s.tenant?.address || '');

  /* Rate chhupana, auto-print, printer ka naap — sab ek hook me,
     browser me mehfooz. Har POS wahi hook istemal kare to settings
     ka bartao har jagah ek jaisa rehta hai. */
  const {
    hidePrices, setHidePrices,
    autoClose, setAutoClose,
    autoPrint, setAutoPrint,
    printerWidth, setPrinterWidth,
    viewMode, setViewMode,
  } = usePosPreferences('retail');

  const [search, setSearch] = useState('');
  const [debouncedSearch, setDebouncedSearch] = useState('');
  const [categoryId, setCategoryId] = useState('');
  const [cart, setCart] = useState<CartLine[]>([]);
  const [customerId, setCustomerId] = useState('');

  const [delivery, setDelivery] = useState<PosDeliveryState>(emptyDelivery());
  const [discountMode, setDiscountMode] = useState<DiscountMode>('pct');
  const [discountPct, setDiscountPct] = useState(0);
  const [discountRs, setDiscountRs] = useState(0);
  const [showDiscountModal, setShowDiscountModal] = useState(false);

  const [scannerOpen, setScannerOpen] = useState(false);
  const [barcodeInput, setBarcodeInput] = useState('');
  const [unitPicker, setUnitPicker] = useState<{ product: Product; units: UnitOption[] } | null>(null);
  const [weightModal, setWeightModal] = useState<{ product: Product; unit: UnitOption; prefillMoney?: number } | null>(null);
  const [priceEditId, setPriceEditId] = useState<string | null>(null);
  const [showCheckout, setShowCheckout] = useState(false);
  const [checkoutInit, setCheckoutInit] = useState<{ mode: CheckoutMode; amount?: number }>({ mode: 'full' });
  /* Jo banda maal lene aaya — udhaar wali sales par bill aur khate me
     jata hai. Cart clear hone par khud saaf ho jata hai. */
  const [receiver, setReceiver] = useState<PosReceiverValue>(emptyReceiver());
  const [showCustomerAdd, setShowCustomerAdd] = useState(false);
  const [showHeldCarts, setShowHeldCarts] = useState(false);
  const [showMobileCart, setShowMobileCart] = useState(false);
  const [showTeacher, setShowTeacher] = useState(false);
  const [showSettings, setShowSettings] = useState(false);
  const [heldCarts, setHeldCarts] = useState<HeldCart[]>([]);
  const [newCustomer, setNewCustomer] = useState({ name: '', phone: '' });
  const [lastSale, setLastSale] = useState<{
    id: string; number: string; change: number; total: number; deposited: boolean;
    printPayload: ReceiptPayload;
  } | null>(null);
  const [visibleCount, setVisibleCount] = useState(60);
  const [isOnline, setIsOnline] = useState(navigator.onLine);

  /* Customer badla to purana receiver saath na jaye — warna Ahmad ka
     driver "Bilal" agle khate ke bill par chhap jata hai. */
  useEffect(() => { setReceiver(emptyReceiver()); }, [customerId]);

  const barcodeRef = useRef<HTMLInputElement>(null);
  const scrollRef = useRef<HTMLDivElement>(null);
  const successTimerRef = useRef<any>(null);

  useEffect(() => {
    const t = setTimeout(() => setDebouncedSearch(search), 120);
    return () => clearTimeout(t);
  }, [search]);

  useEffect(() => {
    setVisibleCount(60);
    if (scrollRef.current) scrollRef.current.scrollTop = 0;
  }, [debouncedSearch, categoryId, viewMode]);

  useEffect(() => {
    const onOnline = () => { setIsOnline(true); toast.success('🟢 Internet wapas'); };
    const onOffline = () => { setIsOnline(false); toast.warning('📴 Offline — sales locally save hongi'); };
    window.addEventListener('online', onOnline);
    window.addEventListener('offline', onOffline);
    return () => { window.removeEventListener('online', onOnline); window.removeEventListener('offline', onOffline); };
  }, []);

  useEffect(() => {
    const refocus = () => {
      if (scannerOpen || showCheckout || unitPicker || weightModal || showCustomerAdd || showHeldCarts || lastSale || showTeacher || showDiscountModal || showSettings) return;
      const active = document.activeElement as HTMLElement | null;
      if (active && active !== barcodeRef.current) {
        const tag = active.tagName;
        if (tag === 'INPUT' || tag === 'TEXTAREA' || tag === 'SELECT' || active.isContentEditable) return;
      }
      barcodeRef.current?.focus();
    };
    const t = setTimeout(refocus, 300);
    return () => clearTimeout(t);
  }, [scannerOpen, showCheckout, unitPicker, weightModal, showCustomerAdd, showHeldCarts, lastSale, showTeacher, showDiscountModal, showSettings]);

  /* ─── Queries ─── */
  const { data: productsData, isLoading: loadingProducts } = useQuery({
    queryKey: ['products-for-retail-pos'],
    /* Pehle yahan 2000 ki hadd thi. Jis dukaan ke 20,000 products
       thay, uske 18,000 POS par kabhi nazar hi nahi aate thay —
       sirf barcode scan se milte thay. Offline layer waise bhi
       poora Dexie parh kar khud tukre karti hai, is liye badi hadd
       ka koi extra kharcha nahi. */
    queryFn: () => productsApi.list({ page: 1, limit: 100_000 }),
    staleTime: 30_000,
  });
  const { data: customersData } = useQuery({
    queryKey: ['customers-for-pos'],
    queryFn: () => customersApi.list({ page: 1, limit: 500 }),
    staleTime: 60_000,
  });
  const { data: categories = [] } = useQuery({ queryKey: ['categories'], queryFn: categoriesApi.list, staleTime: 5 * 60_000 });
  const { data: combos = [], isLoading: loadingCombos } = useQuery({
    queryKey: ['pos-combos'], queryFn: () => combosApi.list({ status: 'ACTIVE' }), staleTime: 60_000,
  });
  const { data: quickKeys = [] } = useQuery({ queryKey: ['pos-quick-keys'], queryFn: () => quickKeysApi.list(), staleTime: 60_000 });

  /* Sari multi-units ek dafa — har scan par server se poochne ki zaroorat
     nahi rehti, aur net na ho tab bhi carton/dozen ka barcode chalta hai. */
  const { data: allUnits = [] } = useQuery({
    queryKey: ['pos-product-units'],
    queryFn: () => productUnitsApi.listAll(),
    staleTime: 5 * 60_000,
  });

  const products: Product[] = productsData?.items ?? [];
  const customers = customersData?.items ?? [];
  const selectedCustomer = customers.find((c: any) => c.id === customerId);

  /* Scanner ka naqsha — barcode/SKU/product ke hisaab se. Banane ka
     tareeqa shared hai, taake har POS ek hi tarah scan kare. */
  const unitIndex = useMemo(() => buildUnitScanIndex(allUnits as any[]), [allUnits]);
  const { byBarcode: unitByBarcode, bySku: unitBySku,
          byProduct: unitsByProduct, codesByProduct: unitCodesByProduct } = unitIndex;

  /**
   * Search ka naqsha — ek dafa banta hai, har harf par nahi.
   *
   * Pehle har keystroke par poori list dobara sort hoti thi aur har
   * product par teen-chaar `toLowerCase()` chalte thay. 300 products
   * par ye nazar nahi aata tha; 20,000 par har harf ke baad screen
   * ruk jati thi — dukaan-daar ko lagta tha software hang ho gaya.
   *
   * Ab do cheezein pehle se tayyar hain: tarteeb, aur har product ka
   * ek hi lowercase jumla jis me naam, SKU, barcode aur uski units ke
   * barcode sab shamil hain. Keystroke par sirf ek seedha guzar hota
   * hai.
   *
   * `localeCompare` ki jagah `Intl.Collator`: wo har muqable par naya
   * collator banata hai, aur 20,000 naam par yehi sab se bara kharcha
   * tha.
   */
  const searchIndex = useMemo(() => {
    const collator = new Intl.Collator('en', { sensitivity: 'base' });
    const rows = products
      .filter((p) => p.isActive !== false)
      .map((p) => ({
        p,
        hay: [
          p.name,
          p.sku ?? '',
          p.barcode ?? '',
          ...(unitCodesByProduct.get(p.id) ?? []),
        ].join(' ').toLowerCase(),
      }));

    rows.sort((a, b) => {
      if (a.p.isFeatured !== b.p.isFeatured) return a.p.isFeatured ? -1 : 1;
      const aOut = a.p.stock <= 0, bOut = b.p.stock <= 0;
      if (aOut !== bOut) return aOut ? 1 : -1;
      return collator.compare(a.p.name, b.p.name);
    });
    return rows;
  }, [products, unitCodesByProduct]);

  /* Sirf chaant — tarteeb pehle se lagi hui hai, filter usay bigarta
     nahi. Yahan poora product object copy nahi hota; screen par jitne
     tile chahiyein utne hi `visibleProducts` me khulte hain. */
  const filteredRows = useMemo(() => {
    let rows = searchIndex;
    if (categoryId) rows = rows.filter((r) => r.p.categoryId === categoryId);
    const q = debouncedSearch.toLowerCase().trim();
    if (q) rows = rows.filter((r) => r.hay.includes(q));
    return rows;
  }, [searchIndex, categoryId, debouncedSearch]);


  const filteredCombos = useMemo(() => {
    const q = debouncedSearch.toLowerCase().trim();
    let list = combos;
    if (q) list = list.filter((c) => c.name.toLowerCase().includes(q) || (c.sku || '').toLowerCase().includes(q) || (c.tagLine || '').toLowerCase().includes(q));
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

  const visibleProducts = useMemo(
    () => filteredRows.slice(0, visibleCount).map((r) => r.p),
    [filteredRows, visibleCount],
  );
  const hasMore = filteredRows.length > visibleCount;

  const categoryCounts = useMemo(() => {
    const counts: Record<string, number> = {};
    products.forEach((p) => { if (p.categoryId) counts[p.categoryId] = (counts[p.categoryId] || 0) + 1; });
    return counts;
  }, [products]);

  const subtotal = useMemo(() => cart.reduce((s, l) => s + l.lineTotal, 0), [cart]);
  const discountAmount = useMemo(() =>
    discountMode === 'pct' ? (subtotal * discountPct) / 100 : Math.min(Number(discountRs || 0), subtotal),
    [subtotal, discountPct, discountRs, discountMode]);
  /** Ghar bhejne ka charge — discount ke BAAD jurta hai, us par discount nahi lagta */
  const deliveryFee = useMemo(() => deliveryAmount(delivery), [delivery]);
  const total = useMemo(
    () => Math.max(subtotal - discountAmount, 0) + deliveryFee,
    [subtotal, discountAmount, deliveryFee],
  );
  const totalSavings = useMemo(() => cart.reduce((s, l) => s + (l.savings || 0) * l.quantity, 0), [cart]);
  const itemCount = cart.length;
  const totalQty = useMemo(() => cart.reduce((s, l) => s + l.quantity, 0), [cart]);

  /* ─── Cart ops ─── */
  const addProductLine = useCallback((product: Product, unit: UnitOption, qty: number, customPrice?: number) => {
    const baseQty = qty * unit.conversionRate;
    const price = customPrice ?? unit.price;
    setCart((prev) => {
      const existing = prev.find((l) => l.productId === product.id && l.unitName === unit.unitName && l.unitPrice === price);
      if (existing) {
        const newQty = existing.quantity + qty;
        const newBaseQty = newQty * unit.conversionRate;
        if (newBaseQty > product.stock) { toast.error(`Stock sirf ${product.stock} ${product.unit}`); return prev; }
        toast.success(`${product.name} +${qty}`, { duration: 900 });
        return prev.map((l) => l.id === existing.id
          ? { ...l, quantity: newQty, baseQuantity: newBaseQty, lineTotal: newQty * l.unitPrice } : l);
      }
      toast.success(`${product.name} — ${qty} ${unit.unitName}`, { duration: 900 });
      return [...prev, {
        id: lineId(), type: 'product' as const, productId: product.id, name: product.name,
        image: product.images?.[0]?.url,
        unitName: unit.unitName, unitLabel: unit.label, emoji: unit.emoji,
        unitPrice: price, basePrice: unit.price,
        quantity: qty, baseQuantity: baseQty,
        conversionRate: unit.conversionRate, baseUnit: product.unit, baseStock: product.stock,
        lineTotal: qty * price,
        note: unit.conversionRate !== 1 ? `${qty} ${unit.unitName} = ${baseQty.toFixed(2)} ${product.unit}` : undefined,
      }];
    });
  }, []);

  const openProduct = useCallback(async (product: Product) => {
    if (product.stock <= 0) { toast.error(`${product.name} — stock khatam`); return; }
    // Units pehle se saath rakhi hain — har tile par click ke baad server
    // ka intezaar nahi, aur offline bhi picker poora khulta hai.
    let apiUnits: any[] = unitsByProduct.get(product.id) ?? [];
    if (apiUnits.length === 0) {
      try {
        const res = await productUnitsApi.byProduct(product.id);
        apiUnits = Array.isArray(res) ? res : ((res as any)?.items ?? []);
      } catch {}
    }
    const units = derivePosUnits(product, apiUnits);
    const baseUnit = units[0];
    if (units.length > 1) { setUnitPicker({ product, units }); return; }
    if (isWeightUnit(baseUnit.unitName)) { setWeightModal({ product, unit: baseUnit }); return; }
    addProductLine(product, baseUnit, 1);
  }, [addProductLine, unitsByProduct]);

  const addCombo = useCallback((combo: ProductCombo, qty: number = 1) => {
    for (const item of combo.items) {
      const product = products.find((p) => p.id === item.productId);
      if (!product) continue;
      const needed = Number(item.quantity) * qty;
      if (product.stock < needed) {
        toast.error(`${product.name} — stock sirf ${product.stock}, chahiye ${needed}`);
        return;
      }
    }
    setCart((prev) => {
      const existing = prev.find((l) => l.comboId === combo.id);
      if (existing) {
        toast.success(`${combo.name} +${qty}`, { duration: 900 });
        return prev.map((l) => l.id === existing.id
          ? { ...l, quantity: l.quantity + qty, lineTotal: (l.quantity + qty) * l.unitPrice } : l);
      }
      toast.success(`🎁 ${combo.name}`, { duration: 900 });
      return [...prev, {
        id: lineId(), type: 'combo' as const, comboId: combo.id, name: combo.name, image: combo.imageUrl,
        unitName: 'combo', unitLabel: 'COMBO', emoji: '🎁',
        unitPrice: Number(combo.comboPrice), basePrice: Number(combo.comboPrice),
        quantity: qty, baseQuantity: qty, conversionRate: 1, baseUnit: 'combo', baseStock: 9999,
        lineTotal: qty * Number(combo.comboPrice),
        comboItems: combo.items, savings: Number(combo.savingsAmount || 0),
        note: `${combo.items.length} items combo${combo.savingsAmount > 0 ? ` • Save ${formatPKR(combo.savingsAmount)}` : ''}`,
      }];
    });
  }, [products]);

  const addQuickKey = useCallback(async (qk: QuickKey) => {
    if (qk.comboId) {
      const combo = combos.find((c) => c.id === qk.comboId);
      if (combo) return addCombo(combo, 1);
      return toast.error('Combo nahi mila');
    }
    if (qk.productId) {
      const product = products.find((p) => p.id === qk.productId);
      if (product) return openProduct(product);
      return toast.error('Product nahi mila');
    }
    toast.error('Quick key configured nahi hai');
  }, [combos, products, addCombo, openProduct]);

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
  const clearCart = useCallback(() => {
    setCart([]); setCustomerId(''); setDiscountPct(0); setDiscountRs(0);
    setDelivery(emptyDelivery()); setReceiver(emptyReceiver());
  }, []);

  /**
   * ProductUnit ko cart ki line bana kar daalna.
   *
   * Rate unit ka apna hai (carton ka apna daam), magar stock hamesha base
   * unit me ginte hain — 1 carton = 24 pieces, to stock se 24 katne
   * chahiyein, 1 nahi.
   */
  const addUnitLine = useCallback((product: Product, unit: any) => {
    const rate = Number(unit.conversionRate) || 1;
    if (product.stock < rate) {
      toast.error(`${product.name} — ${unit.unitName} ke liye stock kam (sirf ${product.stock} ${product.unit})`);
      return;
    }
    const option: UnitOption = {
      id: unit.id,
      unitName: unit.unitName,
      label: (unit.unitLabel || unit.unitName).toUpperCase(),
      emoji: unitEmoji(unit.unitName),
      conversionRate: rate,
      price: Number(unit.price) || product.price * rate,
      wholesalePrice: unit.wholesalePrice ?? null,
    };
    // Kg/liter ka barcode sirf "kaun si cheez" batata hai, "kitni" nahi —
    // wazan phir bhi poochna parta hai.
    if (isWeightUnit(option.unitName)) { setWeightModal({ product, unit: option }); return; }
    addProductLine(product, option, 1);
  }, [addProductLine]);

  /**
   * Gun ne jo parha, uska product cart me.
   *
   * Teen jagah dekhni parti hain, isi tarteeb se:
   *
   *   1. Combo — apna alag barcode/SKU rakhta hai.
   *   2. Product ka apna barcode — sab se aam soorat.
   *   3. Unit ka apna barcode — dozen, carton, packet.
   *
   * Teesri soorat pehle thi hi nahi. Jis product ke multi-units banaye
   * hotay thay, us ke carton par apna barcode chhpa hota tha magar POS
   * sirf product wala barcode dhoondta tha — scan karne par "nahi mila"
   * aata tha, ya dukaan-daar ko haath se unit chunni parti thi.
   *
   * Unit ka barcode milne par unit picker nahi khulta: barcode khud bata
   * raha hai ke kaun sa package bika hai, phir se poochna waqt ka zaya
   * hai. Rate aur stock ka hisaab bhi usi unit ke conversion se.
   */
  const handleBarcode = async (code: string) => {
    setScannerOpen(false);
    const trimmed = code.trim();
    if (!trimmed) return;

    const lower = trimmed.toLowerCase();
    const comboMatch = combos.find(
      (c) => (c.barcode || '').toLowerCase() === lower || (c.sku || '').toLowerCase() === lower,
    );
    if (comboMatch) { addCombo(comboMatch, 1); return; }

    // Unit ka barcode — apne paas rakhi hui list se, foran aur offline bhi.
    const scannedUnit = unitByBarcode.get(lower);
    if (scannedUnit) {
      const product = products.find((p) => p.id === scannedUnit.productId);
      if (product) { addUnitLine(product, scannedUnit); return; }
    }

    try {
      const product = await productsApi.byBarcode(trimmed);
      await openProduct(product);
      return;
    } catch { /* product par nahi mila — ab units ke SKU me dekhte hain */ }

    const skuUnit = unitBySku.get(lower);
    if (skuUnit) {
      const product = products.find((p) => p.id === skuUnit.productId);
      if (product) { addUnitLine(product, skuUnit); return; }
    }

    try {
      const unit = await productUnitsApi.byBarcode(trimmed);
      const product = (unit.product as Product | undefined)
        ?? products.find((p) => p.id === unit.productId);
      if (!product) { toast.error(`Barcode "${trimmed}" nahi mila`); return; }
      addUnitLine(product, unit);
    } catch {
      toast.error(`Barcode "${trimmed}" nahi mila`);
    }
  };

  /* ─── Voice ─── */
  const findProductVoice = useCallback((query: string): Product | null => {
    const q = query.toLowerCase().trim();
    if (!q) return null;
    let searchTerms = q;
    Object.entries(VOICE_ALIASES).forEach(([alias, target]) => {
      if (q.includes(alias.toLowerCase())) searchTerms = `${q} ${target}`;
    });
    const terms = searchTerms.toLowerCase().split(/\s+/);
    let best: Product | null = null;
    let bestScore = 0;
    for (const p of products) {
      if (p.isActive === false) continue;
      const name = p.name.toLowerCase();
      let score = 0;
      if (name === q) score = 100;
      else if (name.startsWith(q)) score = 60;
      else if (name.includes(q)) score = 40;
      for (const t of terms) {
        if (t.length < 2) continue;
        if (name.includes(t)) score += 10;
        if ((p.barcode || '').toLowerCase() === t) score += 50;
        if ((p.sku || '').toLowerCase() === t) score += 50;
      }
      if (score > bestScore) { bestScore = score; best = p; }
    }
    return bestScore >= 20 ? best : null;
  }, [products]);

  const voiceAdd = useCallback(async (cmd: Extract<VoiceCommand, { kind: 'add' }>) => {
    const p = findProductVoice(cmd.productQuery);
    if (!p) { toast.error(`🎤 "${cmd.productQuery}" nahi mila`); return; }
    if (p.stock <= 0) { toast.error(`${p.name} — stock khatam`); return; }
    let apiUnits: any[] = [];
    try {
      const res = await productUnitsApi.byProduct(p.id);
      apiUnits = Array.isArray(res) ? res : ((res as any)?.items ?? []);
    } catch {}
    const units = derivePosUnits(p, apiUnits);
    let unit = units[0];
    if (cmd.unit) {
      const match = units.find((u) => unitKeyOf(u.unitName) === cmd.unit);
      if (match) unit = match;
      else {
        const baseKey = unitKeyOf(unit.unitName);
        let factor: number | null = null;
        if (cmd.unit === 'kg' && baseKey === 'gram') factor = 1000;
        else if (cmd.unit === 'gram' && baseKey === 'kg') factor = 0.001;
        else if (cmd.unit === 'liter' && baseKey === 'ml') factor = 1000;
        else if (cmd.unit === 'ml' && baseKey === 'liter') factor = 0.001;
        else if (cmd.unit === 'dozen' && ['pcs', 'piece'].includes(baseKey)) factor = 12;
        if (factor !== null && !cmd.byMoney) {
          const qty = Number((cmd.qty * factor).toFixed(3));
          addProductLine(p, unit, qty);
          return;
        }
      }
    }
    if (cmd.byMoney) {
      if (isWeightUnit(unit.unitName) && unit.price > 0) {
        const qty = Number((cmd.byMoney / unit.price).toFixed(3));
        addProductLine(p, unit, qty);
        return;
      }
      setWeightModal({ product: p, unit, prefillMoney: cmd.byMoney });
      return;
    }
    if (units.length > 1 && !cmd.unit) { setUnitPicker({ product: p, units }); return; }
    addProductLine(p, unit, cmd.qty || 1);
  }, [findProductVoice, addProductLine]);

  const handleVoiceCommand = useCallback((cmd: VoiceCommand) => {
    if (cmd.kind === 'add') { voiceAdd(cmd); return; }
    if (cmd.kind === 'checkout') {
  if (cart.length === 0) { toast.error('🎤 Cart khaali hai'); return; }

  // 🔀 Voice "cash"/"nagad" → full payment, "udhaar"/"credit" → credit
  const voiceMode = (cmd as any).mode as string | undefined;
  if (voiceMode === 'credit' && !customerId) {
    toast.error('🎤 Udhaar ke liye pehle customer chuno');
    return;
  }

  // 'cash' ya kuch bhi default → 'full' | 'credit' → credit
  const mappedMode: CheckoutMode = voiceMode === 'credit' ? 'credit' : 'full';

  setCheckoutInit({ mode: mappedMode });
  setShowCheckout(true);
  return;
}

    if (cmd.kind === 'discount') {
      if (cmd.pct) { setDiscountMode('pct'); setDiscountPct(Math.min(cmd.pct, 100)); setDiscountRs(0); toast.success(`🎤 ${cmd.pct}% discount`); }
      else if (cmd.rs) { setDiscountMode('rs'); setDiscountRs(cmd.rs); setDiscountPct(0); toast.success(`🎤 Rs ${cmd.rs} discount`); }
      return;
    }
    if (cmd.kind === 'clear') {
      if (cart.length === 0) { toast.info('Cart pehle se khaali'); return; }
      clearCart();
      toast.success('🎤 Cart clear');
      return;
    }
    toast.warning(`🎤 Samjha nahi: "${cmd.text}"`);
  }, [cart.length, customerId, voiceAdd, clearCart]);

  /* ─── Hold carts ─── */
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
    onSuccess: (c: any) => {
      toast.success(`${c.name} add ho gaya`);
      setCustomerId(c.id);
      setShowCustomerAdd(false);
      setNewCustomer({ name: '', phone: '' });
      queryClient.invalidateQueries({ queryKey: ['customers-for-pos'] });
    },
    onError: (e: any) => toast.error(e?.response?.data?.message || 'Add fail'),
  });

  const closeSuccessModal = useCallback(() => {
    if (successTimerRef.current) { clearTimeout(successTimerRef.current); successTimerRef.current = null; }
    setLastSale(null);
    setTimeout(() => barcodeRef.current?.focus(), 100);
  }, []);

  /* ═══ CHECKOUT — with DIRECT PRINT ═══ */
  const checkoutMutation = useMutation({
    mutationFn: (data: { paymentMethod: PaymentMethod; paidAmount: number }) => {
      if (!currentShopId) throw new Error('Shop select karein');
      const items: any[] = [];
      cart.forEach((l) => {
        if (l.type === 'combo' && l.comboItems) {
          const origTotal = l.comboItems.reduce((s: number, it: any) => s + Number(it.quantity || 0) * (Number(it.originalPrice) || 0), 0);
          const comboPricePerItem = origTotal > 0 ? l.unitPrice / origTotal : 1;
          l.comboItems.forEach((ci: any) => {
            const origPrice = Number(ci.originalPrice) || 0;
            const discountedPrice = origPrice * comboPricePerItem;
            items.push({
              productId: ci.productId, variantId: ci.variantId,
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
        serviceCharges: deliveryServiceCharge(delivery),
        receivedByName: receiver.name.trim() || undefined,
        receivedByPhone: receiver.phone.trim() || undefined,
        items,
      });
    },
    onSuccess: (sale: any, vars: any) => {
      const change = Math.max(vars.paidAmount - total, 0);
      const payLabel = POS_PAYMENT_METHODS.find((m) => m.id === vars.paymentMethod)?.label || vars.paymentMethod;

      /* 🖨️ Snapshot for print — cart clear hone se PEHLE */
      const printPayload: ReceiptPayload = {
        saleNumber: sale.saleNumber || 'N/A',
        date: new Date(),
        shopName: tenant?.name || 'My Shop',
        shopPhone, shopAddress,
        customerName: selectedCustomer?.name,
        receivedByName: receiver.name.trim() || undefined,
        receivedByPhone: receiver.phone.trim() || undefined,
        /* Cache me jo balance hai wo abhi tak IS bill se pehle ka hai —
           server balance baad me barhata hai, aur offline layer sirf
           snapshot leti hai. Is liye yahi 'pichla udhaar' hai. */
        previousDue: Number(selectedCustomer?.balance) || 0,
        lines: cart.map((l) => ({
          name: l.name, qty: l.quantity, unit: l.unitName, price: l.unitPrice, total: l.lineTotal,
        })),
        subtotal, discount: discountAmount, total,
        deliveryCharge: deliveryFee || undefined,
        deliveryAddress: delivery.on ? (delivery.address || undefined) : undefined,
        paid: vars.paidAmount,
        paymentLabel: `Paid (${payLabel})`,
      };

      setLastSale({ id: sale.id, number: sale.saleNumber, change, total, deposited: vars.depositExtra === true, printPayload });
      setShowCheckout(false);
      setShowMobileCart(false);
      clearCart();
      queryClient.invalidateQueries({ queryKey: ['products-for-retail-pos'] });
      queryClient.invalidateQueries({ queryKey: ['sales-list'] });
      queryClient.invalidateQueries({ queryKey: ['pos-combos'] });

      /* 🖨️ AUTO-PRINT — receipt page nahi, seedha print dialog! */
      if (autoPrint) {
        const ok = printReceiptDirect(printPayload, printerWidth);
        if (!ok) toast.error('Popup blocked — browser me popups allow karo');
      }

      if (autoClose) {
        successTimerRef.current = setTimeout(() => {
          setLastSale(null);
          setTimeout(() => barcodeRef.current?.focus(), 100);
        }, 3000);
      }
    },
    onError: (e: any) => {
      if (!navigator.onLine) toast.info('📴 Offline — sale queue me chali gayi');
      else toast.error(e?.response?.data?.message || 'Sale fail');
    },
  });

  /* ⚡ F12 — INSTANT CASH (scan → F12 → print. Bas!) */
  const instantCash = useCallback(() => {
    if (cart.length === 0) { toast.error('Cart khaali hai'); return; }
    if (!currentShopId) { toast.error('Pehle shop select karo'); return; }
    if (checkoutMutation.isPending) return;
    checkoutMutation.mutate({ paymentMethod: 'CASH', paidAmount: total });
  }, [cart.length, currentShopId, total, checkoutMutation]);

  const openCheckout = useCallback((mode: CheckoutMode = 'full') => {
    if (cart.length === 0) return;
    setCheckoutInit({ mode });
    setShowCheckout(true);
  }, [cart.length]);

  /* ─── Shortcuts ─── */
  useEffect(() => {
    const handler = (e: KeyboardEvent) => {
      const tag = (document.activeElement as HTMLElement | null)?.tagName;
      const typing = tag === 'INPUT' || tag === 'TEXTAREA' || tag === 'SELECT';
      if (e.key === 'F2') { e.preventDefault(); setScannerOpen(true); }
      if (e.key === 'F6' && !typing) { e.preventDefault(); document.getElementById('pos-voice-btn')?.click(); }
      if (e.key === 'F9') { e.preventDefault(); openCheckout('full'); }
      if (e.key === 'F12') { e.preventDefault(); instantCash(); }
      if (e.key === 'F7') { e.preventDefault(); setViewMode('products'); }
      if (e.key === 'F8') { e.preventDefault(); setViewMode('combos'); }
      if (e.key === 'F10') { e.preventDefault(); setViewMode('quickkeys'); }
      if (e.key === 'F1' && !typing) { e.preventDefault(); setShowTeacher(true); }
      if (e.key === 'Escape') {
        if (showSettings) setShowSettings(false);
        else if (showDiscountModal) setShowDiscountModal(false);
        else if (showTeacher) setShowTeacher(false);
        else if (scannerOpen) setScannerOpen(false);
        else if (weightModal) setWeightModal(null);
        else if (unitPicker) setUnitPicker(null);
        else if (showCheckout) setShowCheckout(false);
        else if (showMobileCart) setShowMobileCart(false);
        else if (priceEditId) setPriceEditId(null);
        else if (lastSale) closeSuccessModal();
      }
    };
    window.addEventListener('keydown', handler);
    return () => window.removeEventListener('keydown', handler);
  }, [scannerOpen, showCheckout, unitPicker, weightModal, showMobileCart, priceEditId, showTeacher, showDiscountModal, showSettings, lastSale, openCheckout, instantCash, closeSuccessModal]);

  const handleScroll = useCallback((e: React.UIEvent<HTMLDivElement>) => {
    if (!hasMore || viewMode !== 'products') return;
    const t = e.currentTarget;
    if ((t.scrollTop + t.clientHeight) / t.scrollHeight > 0.85) {
      setVisibleCount((c) => Math.min(c + 60, filteredRows.length));
    }
  }, [hasMore, filteredRows.length, viewMode]);

  const isLoading = viewMode === 'products' ? loadingProducts : viewMode === 'combos' ? loadingCombos : false;

  return (
    <>
      {scannerOpen && <BarcodeScanner onDetected={handleBarcode} onClose={() => setScannerOpen(false)} />}

      {unitPicker && (
        <PosUnitPickerModal
          product={unitPicker.product}
          units={unitPicker.units}
          onConfirm={(unit, qty) => {
            if (isWeightUnit(unit.unitName)) {
              setWeightModal({ product: unitPicker.product, unit });
              setUnitPicker(null);
              return;
            }
            addProductLine(unitPicker.product, unit, qty);
            setUnitPicker(null);
          }}
          onClose={() => setUnitPicker(null)}
        />
      )}

      {weightModal && (
        <PosWeighModal
          product={weightModal.product}
          unit={weightModal.unit}
          prefillMoney={weightModal.prefillMoney}
          onConfirm={(qty) => {
            addProductLine(weightModal.product, weightModal.unit, qty);
            setWeightModal(null);
          }}
          onClose={() => setWeightModal(null)}
        />
      )}

      {showCheckout && (
        <PosCheckoutModal
          total={total}
          itemCount={itemCount}
          loading={checkoutMutation.isPending}
          customerName={selectedCustomer?.name}
          customerBalance={Number(selectedCustomer?.balance || 0)}
          hasCustomer={!!customerId}
          initMode={checkoutInit.mode}
          initAmount={checkoutInit.amount}
          customerId={customerId || undefined}
          receiver={receiver}
          onReceiverChange={setReceiver}
          onConfirm={(d) => checkoutMutation.mutate({ paymentMethod: d.paymentMethod, paidAmount: d.paidAmount, depositExtra: d.depositExtra } as any)}
          onClose={() => setShowCheckout(false)}
        />
      )}

      {showTeacher && <PosTeacher onClose={() => setShowTeacher(false)} />}

      {showSettings && (
        <PosSettingsModal
          autoPrint={autoPrint} setAutoPrint={setAutoPrint}
          autoClose={autoClose} setAutoClose={setAutoClose}
          printerWidth={printerWidth} setPrinterWidth={setPrinterWidth}
          onClose={() => setShowSettings(false)}
        />
      )}

      {showDiscountModal && (
        <PosDiscountModal
          subtotal={subtotal}
          mode={discountMode}
          pct={discountPct}
          rs={Number(discountRs) || 0}
          onApply={(m, p, r) => {
            setDiscountMode(m); setDiscountPct(p); setDiscountRs(r);
            setShowDiscountModal(false);
            if (m === 'pct' ? p > 0 : r > 0) toast.success(`Discount: ${m === 'pct' ? p + '%' : formatPKR(r)}`);
          }}
          onClose={() => setShowDiscountModal(false)}
        />
      )}

      {/* ✅ SUCCESS MODAL — compact, auto-close */}
      {lastSale && (
        <PosSuccessModal
          lastSale={lastSale}
          autoPrint={autoPrint}
          autoClose={autoClose}
          onPrintAgain={() => printReceiptDirect(lastSale.printPayload, printerWidth)}
          onClose={closeSuccessModal}
        />
      )}

      {showCustomerAdd && (
        <PosCustomerAddModal
          value={newCustomer}
          onChange={setNewCustomer}
          saving={addCustomerMutation.isPending}
          onSubmit={(v) => {
            if (!v.name.trim()) return toast.error('Naam likhein');
            addCustomerMutation.mutate({ name: v.name.trim(), phone: v.phone?.trim() || undefined });
          }}
          onClose={() => setShowCustomerAdd(false)}
        />
      )}

      {showHeldCarts && (
        <PosHoldCartsModal
          heldCarts={heldCarts}
          onResume={resumeCart}
          onDelete={deleteHeld}
          onClose={() => setShowHeldCarts(false)}
        />
      )}

      <div className="min-h-[calc(100dvh-5rem)] lg:h-[calc(100dvh-7rem)] flex flex-col lg:grid lg:grid-cols-[1fr_400px] xl:grid-cols-[1fr_440px] gap-2 lg:gap-3">

        <section className="lg:flex-1 rounded-2xl lg:rounded-3xl bg-white dark:bg-slate-900/80 dark:backdrop-blur-sm border-2 border-slate-200 dark:border-slate-800 shadow-sm dark:shadow-black/20 lg:overflow-hidden flex flex-col lg:min-h-0">

          {/* HEADER */}
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
                    {autoPrint && (
                      <div className="h-6 px-2 rounded-full bg-sky-500/30 flex items-center gap-1" title={`Auto-print ON (${printerWidth}mm)`}>
                        <Printer className="h-3 w-3 text-sky-200" />
                        <span className="text-[9px] font-extrabold text-sky-200">{printerWidth}mm</span>
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
                <span id="pos-voice-btn"><VoiceSaleButton onCommand={handleVoiceCommand} /></span>
                <button onClick={() => setShowSettings(true)} title="Settings"
                  className="h-10 w-10 sm:h-11 sm:w-11 rounded-2xl bg-white/15 hover:bg-white/25 active:scale-95 flex items-center justify-center border-2 border-white/20 transition">
                  <Settings2 className="h-5 w-5" />
                </button>
                <button onClick={() => setShowTeacher(true)} title="Guide (F1)"
                  className="h-10 w-10 sm:h-11 sm:w-11 rounded-2xl bg-amber-400/90 hover:bg-amber-400 text-slate-900 active:scale-95 flex items-center justify-center shadow-lg transition">
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

          {/* VIEW TABS */}
          <div className="shrink-0 px-3 sm:px-4 pt-3 bg-slate-50 dark:bg-slate-900/60 border-b-2 border-slate-100 dark:border-slate-800">
            <div className="flex gap-1.5 bg-white dark:bg-slate-800 rounded-2xl border-2 border-slate-200 dark:border-slate-700 p-1">
              <PosViewTab active={viewMode === 'products'} onClick={() => setViewMode('products')} icon={Package} label="Products" count={products.length} color="sky" shortcut="F7" />
              <PosViewTab active={viewMode === 'combos'} onClick={() => setViewMode('combos')} icon={Sparkles} label="Combos" count={combos.length} color="violet" shortcut="F8" highlight={combos.length > 0} />
              <PosViewTab active={viewMode === 'quickkeys'} onClick={() => setViewMode('quickkeys')} icon={Zap} label="Quick" count={quickKeys.length} color="amber" shortcut="F10" />
            </div>
          </div>

          {/* SEARCH + BARCODE */}
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
                className="h-14 sm:h-16 w-16 sm:w-20 rounded-2xl bg-gradient-to-br from-slate-900 to-slate-800 dark:from-slate-700 dark:to-slate-800 hover:from-slate-800 hover:to-slate-800 active:scale-95 text-white flex flex-col items-center justify-center gap-0.5 shadow-lg transition shrink-0">
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
                      style={{ backgroundColor: active ? cat.color : undefined, borderColor: active ? cat.color : undefined, color: active ? '#fff' : undefined }}>
                      {!active && <span className="h-2 w-2 rounded-full" style={{ backgroundColor: cat.color }} />}
                      <span className={active ? '' : 'text-slate-700 dark:text-slate-200'}>{cat.name}</span>
                      <span className={['px-1.5 rounded-md text-[10px] tabular-nums', active ? 'bg-white/20' : 'bg-slate-100 dark:bg-slate-700 text-slate-600 dark:text-slate-300'].join(' ')}>{count}</span>
                    </button>
                  );
                })}
              </div>
            )}
          </div>

          {/* GRID */}
          <div ref={scrollRef} onScroll={handleScroll} className="lg:flex-1 lg:overflow-y-auto p-2 sm:p-3 bg-slate-50/50 dark:bg-slate-950/40 lg:min-h-0">
            {isLoading ? (
              <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 lg:grid-cols-3 xl:grid-cols-4 2xl:grid-cols-5 gap-2 sm:gap-3">
                {Array.from({ length: 12 }).map((_, i) => <div key={i} className="aspect-[3/4] rounded-2xl bg-slate-200 dark:bg-slate-800 animate-pulse" />)}
              </div>
            ) : viewMode === 'products' ? (
              filteredRows.length === 0 ? (
                <PosEmptyState icon={Package} title="Kuch nahi mila" hint={search ? `"${search}" ka koi product nahi` : 'Pehle products add karein'} onClear={search ? () => setSearch('') : undefined} />
              ) : (
                <>
                  <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 lg:grid-cols-3 xl:grid-cols-4 2xl:grid-cols-5 gap-2 sm:gap-3">
                    {visibleProducts.map((p) => (
                      <PosProductTile key={p.id} product={p} cart={cart} hidePrices={hidePrices} onClick={() => openProduct(p)} />
                    ))}
                  </div>
                  {hasMore && (
                    <button onClick={() => setVisibleCount((c) => c + 60)}
                      className="mt-3 w-full h-12 rounded-2xl bg-white dark:bg-slate-800 border-4 border-slate-200 dark:border-slate-700 hover:border-sky-400 active:scale-[0.98] text-slate-700 dark:text-slate-200 text-sm font-extrabold inline-flex items-center justify-center gap-2 transition">
                      <Package className="h-4 w-4" /> Aur dikhaein ({filteredRows.length - visibleCount} baqi)
                    </button>
                  )}
                </>
              )
            ) : viewMode === 'combos' ? (
              filteredCombos.length === 0 ? (
                <PosEmptyState icon={Sparkles} title="Koi combo nahi" hint={combos.length === 0 ? 'Pehle combos banaein — /retail/combos' : 'Filter change karo'} />
              ) : (
                <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 lg:grid-cols-3 xl:grid-cols-4 gap-2 sm:gap-3">
                  {filteredCombos.map((c) => (
                    <PosComboTile key={c.id} combo={c} cart={cart} hidePrices={hidePrices} onClick={() => addCombo(c, 1)} />
                  ))}
                </div>
              )
            ) : (
              Object.keys(groupedQuickKeys).length === 0 ? (
                <PosEmptyState icon={Zap} title="Koi quick key nahi" hint={quickKeys.length === 0 ? 'Pehle setup karein — /retail/quick-keys' : 'Filter change karo'} />
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
                          <PosQuickKeyTile key={k.id} qk={k} products={products} combos={combos} hidePrices={hidePrices} onClick={() => addQuickKey(k)} />
                        ))}
                      </div>
                    </div>
                  ))}
                </div>
              )
            )}
          </div>
        </section>

        <PosCartPanel
          isMobile={showMobileCart}
          onCloseMobile={() => setShowMobileCart(false)}
          cart={cart} itemCount={itemCount} totalQty={totalQty}
          subtotal={subtotal} total={total} totalSavings={totalSavings}
          discountMode={discountMode} discountPct={discountPct}
          discountRs={Number(discountRs) || 0} discountAmount={discountAmount}
          onOpenDiscount={() => setShowDiscountModal(true)}
          onClearDiscount={() => { setDiscountPct(0); setDiscountRs(0); }}
          delivery={delivery} onDeliveryChange={setDelivery} deliveryFee={deliveryFee}
          hidePrices={hidePrices}
          customers={customers} customerId={customerId} setCustomerId={setCustomerId}
          selectedCustomer={selectedCustomer}
          receiver={receiver}
          onReceiverChange={setReceiver}
          onAddCustomer={() => setShowCustomerAdd(true)}
          onHold={holdCart}
          onClear={() => { if (confirm('Cart khaali karein?')) clearCart(); }}
          onChangeQty={changeQty} onSetQty={setQtyDirect} onRemove={removeLine}
          priceEditId={priceEditId} onStartPriceEdit={setPriceEditId} onSetPrice={setLinePrice}
          onCheckout={() => openCheckout('full')}
          onInstantCash={instantCash}
          canCheckout={!!currentShopId}
          checkoutPending={checkoutMutation.isPending}
        />
      </div>

      {/* MOBILE FLOATING CART */}
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
