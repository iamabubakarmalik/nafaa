import { useState, useMemo, useEffect, useRef, useCallback } from 'react';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import {
  Search, ShoppingCart, Package, X, Camera, ScanLine, Store, Eye, EyeOff,
  Grid3x3, ArrowRight, Printer, Pause, Wifi, WifiOff, Sparkles, Zap,
  GraduationCap, Settings2, Cake, ChefHat, ShoppingBag, Timer, Snowflake,
  Flame, Star,
} from 'lucide-react';
import { toast } from 'sonner';
import { formatPKR } from '@core/lib/format';
import { useAuthStore, useShopParam } from '@core/stores/auth.store';
import { offlineProductsApi as productsApi } from '@core/lib/offline/offlineProducts';
import { offlineCustomersApi as customersApi } from '@core/lib/offline/offlineCustomers';
import { offlineSalesApi } from '@core/lib/offline/offlineSales';
import { type PaymentMethod } from '@modules/sales/sales/api/sales.api';
import type { Product } from '@modules/inventory/products/api/products.api';
import { productEmoji, productTint } from '@modules/inventory/products/lib/productEmoji';
import BarcodeScanner from '@core/components/barcode/BarcodeScanner';
import { printReceiptDirect, type ReceiptPayload } from '@modules/pos/lib/thermalReceipt';
import {
  derivePosUnits, buildUnitScanIndex, unitEmoji, isWeightUnit, qtyStep, unitKeyOf,
  type PosUnitOption,
} from '@modules/pos/lib/posUnits';
import {
  emptyDelivery, deliveryAmount, deliveryServiceCharge, type PosDeliveryState,
  PosSettingsModal, PosCheckoutModal, PosUnitPickerModal, PosWeighModal,
  PosDiscountModal, PosCartPanel, PosTeacher, PosViewTab, PosComboTile,
  PosQuickKeyTile, PosEmptyState, PosSuccessModal, PosCustomerAddModal,
  PosHoldCartsModal,
} from '@modules/pos/components';
import { emptyReceiver, type PosReceiverValue } from '@modules/pos/components/PosReceiverField';
import {
  POS_PAYMENT_METHODS, posLineId, posHeldId,
  type PosCartLine, type PosHeldCart, type PosCheckoutMode, type PosDiscountMode,
} from '@modules/pos/lib/posCart';
import { usePosPreferences } from '@modules/pos/hooks/usePosPreferences';
import { VoiceSaleButton, type VoiceCommand } from '@core/components/voice/VoiceSaleButton';
import { productUnitsApi } from '@industries/retail/api/product-units.api';
import { combosApi, type ProductCombo } from '@industries/retail/api/combos.api';
import { quickKeysApi, type QuickKey } from '@industries/retail/api/quick-keys.api';
import { bakeryProductsApi, type BakeryProduct } from '../api/products.api';
import { freshnessApi } from '../api/freshness.api';
import { extraUnitsFor, priceField, rateBetween, unitDef } from '../lib/bakeryUnits';

/* ═════════════════════════════════════════════════════════════
   🍰 BAKERY POS — RETAIL KI BUNYAD PAR, BAKERY KE DIMAGH SE
   ─────────────────────────────────────────────────────────────
   Retail ki har cheez ab yahan bhi — wohi shared `@modules/pos`:
   ⚡ F12 instant cash + auto-print   💵 Full / Partial / Udhaar
   ⚖️ Weigh (pound/kg)                 💎 Discount   🚚 Delivery
   🎤 Voice                            🎁 Combos     ⚡ Quick keys
   ⏸️ Hold carts                       📴 Offline    👤 Customer yahin add

   Bakery ki apni:
   🍰 Ek cheez, kai naap — piece / slice / pound / dozen, har naap
      ka apna rate, stock sahi conversion se ghatta hai
      (`lib/bakeryUnits` — wohi hisab jo wizard aur detail me hai)
   ⏱️ Jald kharab hone wala maal SAB SE PEHLE, waqt guzra hua
      maal rok kar poochta hai
   🧁 Khud banaya / 📦 Bahar se / 🔥 Jald bechna — ek click me
   🧑‍🍳 Stock na chadha ho to bhi bech sakte hain — tanur se abhi
      nikla maal, poochh kar
   ⌨️ F1 guide • F2 scan • / search • F6 voice • F9 checkout • F12 instant
   ═════════════════════════════════════════════════════════════ */

type UnitOption = PosUnitOption;
type CartLine = PosCartLine;
type HeldCart = PosHeldCart;
type Kind = 'all' | 'made' | 'bought' | 'urgent';

/** Itne ghante se kam baqi ho to "jald becho" */
const URGENT_HOURS = 12;
/** Stock na hone par bhi bechne wali line ki hadd */
const NO_LIMIT = Number.MAX_SAFE_INTEGER;

const stockOf = (p: any) => Number(p?.shopStock ?? p?.stock ?? 0);

/* 🗣️ Bakery ke alfaz — voice me jo bola jata hai */
const VOICE_ALIASES: Record<string, string> = {
  cake: 'cake', 'کیک': 'cake', pastry: 'pastry', 'پیسٹری': 'pastry',
  patty: 'patty patties', patties: 'patty patties', 'پیٹی': 'patty patties',
  samosa: 'samosa', 'سموسہ': 'samosa', rusk: 'rusk papay', papay: 'rusk papay', 'رس': 'rusk papay',
  'double roti': 'bread double roti', bread: 'bread double roti', 'ڈبل روٹی': 'bread double roti',
  bun: 'bun', 'بن': 'bun', 'naan khatai': 'nan khatai', 'nan khatai': 'nan khatai', 'نان خطائی': 'nan khatai',
  biscuit: 'biscuit cookies', cookies: 'biscuit cookies', 'بسکٹ': 'biscuit cookies',
  pizza: 'pizza', 'پیزا': 'pizza', sandwich: 'sandwich', 'سینڈوچ': 'sandwich',
  mithai: 'mithai sweet', 'مٹھائی': 'mithai sweet', doodh: 'milk doodh', 'دودھ': 'milk doodh',
  anda: 'egg anda anday', anday: 'egg anda anday', 'انڈے': 'egg anda',
  dahi: 'yogurt dahi', 'دہی': 'yogurt dahi', paani: 'water paani', 'پانی': 'water paani',
  chips: 'chips lays', lays: 'chips lays', juice: 'juice', 'جوس': 'juice', bottle: 'bottle drink',
};

/**
 * Bakery ke naap — retail ke units + bakery profile ke rate.
 *
 * Pehle `derivePosUnits` (base + Multi-Unit safhe wale). Phir bakery
 * profile me jo per-slice / per-pound / per-dozen rate bhara ho, wo
 * bhi — agar us naam ka unit pehle se na ho. Conversion `rateBetween`
 * se, jo wizard aur detail page bhi istemal karte hain. Pehle POS ka
 * apna alag hisab tha (`deriveRate`) jo in dono se mail nahi khata tha.
 */
function bakeryUnitOptions(product: Product, profile: BakeryProduct | undefined, apiUnits: any[]): UnitOption[] {
  const units = derivePosUnits(product, apiUnits);
  if (!profile) return units;
  const base = (product.unit || 'pcs').toLowerCase();
  const have = new Set(units.map((u) => unitKeyOf(u.unitName)));
  for (const k of extraUnitsFor(base)) {
    const price = Number((profile as any)[priceField[k]] || 0);
    if (price <= 0) continue;
    const def = unitDef(k);
    if (have.has(unitKeyOf(k)) || have.has(unitKeyOf(def.label))) continue;
    units.push({
      id: `bk-${k}`,
      unitName: k,
      label: String(def.label).toUpperCase(),
      emoji: def.emoji || unitEmoji(k),
      conversionRate: rateBetween(k, base, { weightGrams: profile.weightGrams, slices: profile.numberOfSlices }) || 1,
      price,
      wholesalePrice: null,
    } as UnitOption);
    have.add(unitKeyOf(k));
  }
  return units;
}

export default function BakeryPosPage() {
  const queryClient = useQueryClient();
  const currentShopId = useShopParam();
  const tenant = useAuthStore((s) => s.tenant);
  const shopPhone = useAuthStore((s: any) => s.user?.assignedShop?.phone || s.tenant?.phone || '');
  const shopAddress = useAuthStore((s: any) => s.user?.assignedShop?.address || s.tenant?.address || '');

  const {
    hidePrices, setHidePrices, autoClose, setAutoClose, autoPrint, setAutoPrint,
    printerWidth, setPrinterWidth, viewMode, setViewMode,
  } = usePosPreferences('bakery');

  const [search, setSearch] = useState('');
  const [debouncedSearch, setDebouncedSearch] = useState('');
  const [categoryId, setCategoryId] = useState('');
  const [kind, setKind] = useState<Kind>('all');
  const [cart, setCart] = useState<CartLine[]>([]);
  const [customerId, setCustomerId] = useState('');

  const [delivery, setDelivery] = useState<PosDeliveryState>(emptyDelivery());
  const [discountMode, setDiscountMode] = useState<PosDiscountMode>('pct');
  const [discountPct, setDiscountPct] = useState(0);
  const [discountRs, setDiscountRs] = useState(0);
  const [showDiscountModal, setShowDiscountModal] = useState(false);

  const [scannerOpen, setScannerOpen] = useState(false);
  const [barcodeInput, setBarcodeInput] = useState('');
  const [unitPicker, setUnitPicker] = useState<{ product: Product; units: UnitOption[]; oversell: boolean } | null>(null);
  const [weightModal, setWeightModal] = useState<{ product: Product; unit: UnitOption; prefillMoney?: number; oversell: boolean } | null>(null);
  const [priceEditId, setPriceEditId] = useState<string | null>(null);
  const [showCheckout, setShowCheckout] = useState(false);
  const [checkoutInit, setCheckoutInit] = useState<{ mode: PosCheckoutMode; amount?: number }>({ mode: 'full' });
  const [receiver, setReceiver] = useState<PosReceiverValue>(emptyReceiver());
  const [showCustomerAdd, setShowCustomerAdd] = useState(false);
  const [showHeldCarts, setShowHeldCarts] = useState(false);
  const [showMobileCart, setShowMobileCart] = useState(false);
  const [showTeacher, setShowTeacher] = useState(false);
  const [showSettings, setShowSettings] = useState(false);
  const [heldCarts, setHeldCarts] = useState<HeldCart[]>([]);
  const [newCustomer, setNewCustomer] = useState({ name: '', phone: '' });
  const [lastSale, setLastSale] = useState<{
    id: string; number: string; change: number; total: number; deposited: boolean; printPayload: ReceiptPayload;
  } | null>(null);
  const [visibleCount, setVisibleCount] = useState(60);
  const [isOnline, setIsOnline] = useState(navigator.onLine);

  useEffect(() => { setReceiver(emptyReceiver()); }, [customerId]);

  const barcodeRef = useRef<HTMLInputElement>(null);
  const searchRef = useRef<HTMLInputElement>(null);
  const scrollRef = useRef<HTMLDivElement>(null);
  const successTimerRef = useRef<any>(null);

  useEffect(() => {
    const t = setTimeout(() => setDebouncedSearch(search), 120);
    return () => clearTimeout(t);
  }, [search]);

  useEffect(() => {
    setVisibleCount(60);
    if (scrollRef.current) scrollRef.current.scrollTop = 0;
  }, [debouncedSearch, categoryId, kind, viewMode]);

  useEffect(() => {
    const onOnline = () => { setIsOnline(true); toast.success('🟢 Internet wapas'); };
    const onOffline = () => { setIsOnline(false); toast.warning('📴 Offline — bill locally save honge'); };
    window.addEventListener('online', onOnline);
    window.addEventListener('offline', onOffline);
    return () => { window.removeEventListener('online', onOnline); window.removeEventListener('offline', onOffline); };
  }, []);

  /* Barcode gun ka khana hamesha tayyar — koi modal khula na ho to */
  const anyModal = scannerOpen || showCheckout || !!unitPicker || !!weightModal || showCustomerAdd
    || showHeldCarts || !!lastSale || showTeacher || showDiscountModal || showSettings;
  useEffect(() => {
    if (anyModal) return;
    const t = setTimeout(() => {
      const active = document.activeElement as HTMLElement | null;
      if (active && active !== barcodeRef.current) {
        const tag = active.tagName;
        if (tag === 'INPUT' || tag === 'TEXTAREA' || tag === 'SELECT' || active.isContentEditable) return;
      }
      barcodeRef.current?.focus();
    }, 300);
    return () => clearTimeout(t);
  }, [anyModal]);

  /* ─── Queries ─── */
  const { data: productsData, isLoading: loadingProducts } = useQuery({
    queryKey: ['products-for-bakery-pos'],
    queryFn: () => productsApi.list({ page: 1, limit: 100_000 }),
    staleTime: 30_000,
  });
  /* Bakery profile aur taazgi offline na milein to POS phir bhi chale —
     bas naap aur taazgi ke nishan nahi aayenge. */
  const { data: profiles = [] } = useQuery({
    queryKey: ['bakery-profiles-all'],
    queryFn: () => bakeryProductsApi.list({}).catch(() => [] as BakeryProduct[]),
    staleTime: 5 * 60_000,
  });
  const { data: freshLogs = [] } = useQuery({
    queryKey: ['bakery-freshness-pos'],
    queryFn: () => freshnessApi.list({}).catch(() => [] as any[]),
    refetchInterval: 120_000,
  });
  const { data: customersData } = useQuery({
    queryKey: ['customers-for-pos'],
    queryFn: () => customersApi.list({ page: 1, limit: 500 }),
    staleTime: 60_000,
  });
  const { data: combos = [], isLoading: loadingCombos } = useQuery({
    queryKey: ['pos-combos'], queryFn: () => combosApi.list({ status: 'ACTIVE' }).catch(() => [] as ProductCombo[]), staleTime: 60_000,
  });
  const { data: quickKeys = [] } = useQuery({
    queryKey: ['pos-quick-keys'], queryFn: () => quickKeysApi.list().catch(() => [] as QuickKey[]), staleTime: 60_000,
  });
  const { data: allUnits = [] } = useQuery({
    queryKey: ['pos-product-units'],
    queryFn: () => productUnitsApi.listAll(),
    staleTime: 5 * 60_000,
  });

  const products: Product[] = productsData?.items ?? [];
  const customers = customersData?.items ?? [];
  const selectedCustomer = customers.find((c: any) => c.id === customerId);

  const unitIndex = useMemo(() => buildUnitScanIndex(allUnits as any[]), [allUnits]);
  const { byBarcode: unitByBarcode, bySku: unitBySku, byProduct: unitsByProduct, codesByProduct: unitCodesByProduct } = unitIndex;

  const profileBy = useMemo(() => {
    const m = new Map<string, BakeryProduct>();
    (profiles as BakeryProduct[]).forEach((p) => { if (p.productId) m.set(p.productId, p); });
    return m;
  }, [profiles]);

  /** Har cheez ka sab se jald kharab hone wala batch — ghanton me */
  const urgentBy = useMemo(() => {
    const m = new Map<string, number>();
    (freshLogs as any[]).forEach((f) => {
      if (f.status === 'DISCARDED' || Number(f.currentQty) <= 0 || !f.productId) return;
      const t = new Date(f.expiryDate || f.bestBefore).getTime();
      if (Number.isNaN(t)) return;
      const left = (t - Date.now()) / 3_600_000;
      if (left < URGENT_HOURS) m.set(f.productId, Math.min(m.get(f.productId) ?? Infinity, left));
    });
    return m;
  }, [freshLogs]);

  /**
   * Search ka naqsha — ek dafa banta hai, har harf par nahi (retail
   * wala tareeqa). Tarteeb bakery ki: jo 12 ghante me kharab hoga wo
   * sab se pehle — counter par wahi pehle nikalna chahiye. Jis ka waqt
   * guzar chuka wo aakhir me, khatam maal ke saath.
   */
  const searchIndex = useMemo(() => {
    const collator = new Intl.Collator('en', { sensitivity: 'base' });
    const rows = products
      .filter((p) => p.isActive !== false)
      .map((p) => {
        const profile = profileBy.get(p.id);
        return {
          p, profile,
          kind: (profile && (profile.isCakeCustomizable || profile.isCustomizable) ? 'made' : 'bought') as 'made' | 'bought',
          urgent: urgentBy.get(p.id),
          stock: stockOf(p),
          hay: [p.name, p.sku ?? '', p.barcode ?? '', p.category?.name ?? '', ...(unitCodesByProduct.get(p.id) ?? [])].join(' ').toLowerCase(),
        };
      });
    const rank = (r: typeof rows[number]) => {
      if (r.urgent !== undefined && r.urgent > 0) return 0; // jald becho
      if (r.stock <= 0 || (r.urgent !== undefined && r.urgent <= 0)) return 3;
      return r.p.isFeatured ? 1 : 2;
    };
    rows.sort((a, b) => {
      const ra = rank(a), rb = rank(b);
      if (ra !== rb) return ra - rb;
      if (ra === 0) return (a.urgent ?? 0) - (b.urgent ?? 0);
      return collator.compare(a.p.name, b.p.name);
    });
    return rows;
  }, [products, profileBy, urgentBy, unitCodesByProduct]);

  const rowById = useMemo(() => new Map(searchIndex.map((r) => [r.p.id, r])), [searchIndex]);

  const counts = useMemo(() => ({
    all: searchIndex.length,
    made: searchIndex.filter((r) => r.kind === 'made').length,
    bought: searchIndex.filter((r) => r.kind === 'bought').length,
    urgent: searchIndex.filter((r) => r.urgent !== undefined && r.urgent > 0).length,
    expired: searchIndex.filter((r) => r.urgent !== undefined && r.urgent <= 0).length,
  }), [searchIndex]);

  const categories = useMemo(() => {
    const m = new Map<string, { id: string; name: string; color?: string; count: number }>();
    searchIndex.forEach(({ p }) => {
      const c: any = p.category;
      if (!c) return;
      const e = m.get(c.id);
      if (e) e.count += 1; else m.set(c.id, { id: c.id, name: c.name, color: c.color, count: 1 });
    });
    return [...m.values()].sort((a, b) => b.count - a.count);
  }, [searchIndex]);

  const filteredRows = useMemo(() => {
    let rows = searchIndex;
    if (kind === 'made' || kind === 'bought') rows = rows.filter((r) => r.kind === kind);
    if (kind === 'urgent') rows = rows.filter((r) => r.urgent !== undefined);
    if (categoryId) rows = rows.filter((r) => r.p.categoryId === categoryId);
    const q = debouncedSearch.toLowerCase().trim();
    if (q) rows = rows.filter((r) => r.hay.includes(q));
    return rows;
  }, [searchIndex, kind, categoryId, debouncedSearch]);

  const filteredCombos = useMemo(() => {
    const q = debouncedSearch.toLowerCase().trim();
    let list = combos as ProductCombo[];
    if (q) list = list.filter((c) => c.name.toLowerCase().includes(q) || (c.sku || '').toLowerCase().includes(q) || (c.tagLine || '').toLowerCase().includes(q));
    return [...list].sort((a, b) => (a.isFeatured !== b.isFeatured ? (a.isFeatured ? -1 : 1) : b.savingsPercentage - a.savingsPercentage));
  }, [combos, debouncedSearch]);

  const groupedQuickKeys = useMemo(() => {
    const q = debouncedSearch.toLowerCase().trim();
    let list = (quickKeys as QuickKey[]).filter((k) => k.isActive);
    if (q) list = list.filter((k) => k.label.toLowerCase().includes(q));
    const groups: Record<string, QuickKey[]> = {};
    list.forEach((k) => { const g = k.group || 'General'; (groups[g] ||= []).push(k); });
    return groups;
  }, [quickKeys, debouncedSearch]);

  const visibleRows = useMemo(() => filteredRows.slice(0, visibleCount), [filteredRows, visibleCount]);
  const hasMore = filteredRows.length > visibleCount;

  const inCartBy = useMemo(() => {
    const m = new Map<string, number>();
    cart.forEach((l) => { if (l.productId) m.set(l.productId, (m.get(l.productId) ?? 0) + l.quantity); });
    return m;
  }, [cart]);

  const subtotal = useMemo(() => cart.reduce((s, l) => s + l.lineTotal, 0), [cart]);
  const discountAmount = useMemo(() =>
    discountMode === 'pct' ? (subtotal * discountPct) / 100 : Math.min(Number(discountRs || 0), subtotal),
  [subtotal, discountPct, discountRs, discountMode]);
  const deliveryFee = useMemo(() => deliveryAmount(delivery), [delivery]);
  const total = useMemo(() => Math.max(subtotal - discountAmount, 0) + deliveryFee, [subtotal, discountAmount, deliveryFee]);
  const totalSavings = useMemo(() => cart.reduce((s, l) => s + (l.savings || 0) * l.quantity, 0), [cart]);
  const itemCount = cart.length;
  const totalQty = useMemo(() => cart.reduce((s, l) => s + l.quantity, 0), [cart]);

  /* ─── Cart ops ─── */
  const addProductLine = useCallback((product: Product, unit: UnitOption, qty: number, oversell = false) => {
    const stock = stockOf(product);
    const limit = oversell ? NO_LIMIT : stock;
    const baseQty = qty * unit.conversionRate;
    const price = unit.price;
    setCart((prev) => {
      const existing = prev.find((l) => l.productId === product.id && l.unitName === unit.unitName && l.unitPrice === price);
      if (existing) {
        const newQty = Number((existing.quantity + qty).toFixed(3));
        const newBase = newQty * unit.conversionRate;
        if (newBase > existing.baseStock) { toast.error(`Stock sirf ${stock} ${product.unit}`); return prev; }
        toast.success(`${product.name} +${qty}`, { duration: 900 });
        return prev.map((l) => (l.id === existing.id ? { ...l, quantity: newQty, baseQuantity: newBase, lineTotal: newQty * l.unitPrice } : l));
      }
      if (baseQty > limit) { toast.error(`Stock sirf ${stock} ${product.unit}`); return prev; }
      toast.success(`${product.name} — ${qty} ${unit.unitName}`, { duration: 900 });
      return [...prev, {
        id: posLineId(), type: 'product' as const, productId: product.id, name: product.name,
        image: product.images?.[0]?.url,
        unitName: unit.unitName, unitLabel: unit.label, emoji: unit.emoji,
        unitPrice: price, basePrice: unit.price,
        quantity: qty, baseQuantity: baseQty,
        conversionRate: unit.conversionRate, baseUnit: product.unit, baseStock: limit,
        lineTotal: qty * price,
        note: [
          unit.conversionRate !== 1 ? `${qty} ${unit.unitName} = ${baseQty.toFixed(3)} ${product.unit}` : '',
          oversell ? 'Stock chadhe bagair becha' : '',
        ].filter(Boolean).join(' • ') || undefined,
      }];
    });
  }, []);

  /** Unit tay ho gaya — ab wazan poochna hai ya seedha daalna */
  const placeUnit = useCallback((product: Product, unit: UnitOption, oversell: boolean, qty = 1) => {
    if (isWeightUnit(unit.unitName)) { setWeightModal({ product, unit, oversell }); return; }
    addProductLine(product, unit, qty, oversell);
  }, [addProductLine]);

  const unitsFor = async (product: Product): Promise<UnitOption[]> => {
    let apiUnits: any[] = unitsByProduct.get(product.id) ?? [];
    if (apiUnits.length === 0) {
      try {
        const res = await productUnitsApi.byProduct(product.id);
        apiUnits = Array.isArray(res) ? res : ((res as any)?.items ?? []);
      } catch { /* offline — sirf profile wale naap */ }
    }
    return bakeryUnitOptions(product, profileBy.get(product.id), apiUnits);
  };

  /**
   * Cheez counter par — do rukawatein, dono poochh kar hat sakti hain:
   *
   *  1. Taazgi ka waqt guzar chuka — kharab maal chup-chaap na bike.
   *  2. Stock 0 — magar bakery me tanur se abhi nikla maal aksar
   *     stock me chadha hi nahi hota. Pehle ya to har cheez bina
   *     hadd ke bikti thi (stock 9999), ya bilkul nahi. Ab poochta hai.
   */
  const openProduct = async (product: Product, opts: { allowExpired?: boolean; oversell?: boolean } = {}) => {
    const urgent = urgentBy.get(product.id);
    if (!opts.allowExpired && urgent !== undefined && urgent <= 0) {
      toast.error(`${product.name} — taazgi ka waqt guzar chuka`, {
        description: 'Batch check kar lein, kharab maal na bike',
        duration: 8000,
        action: { label: 'Phir bhi bechein', onClick: () => openProduct(product, { ...opts, allowExpired: true }) },
      });
      return;
    }
    if (!opts.oversell && stockOf(product) <= 0) {
      toast.error(`${product.name} — stock 0 hai`, {
        description: 'Abhi bana hai aur stock me nahi chadha?',
        duration: 8000,
        action: { label: 'Phir bhi bechein', onClick: () => openProduct(product, { ...opts, oversell: true }) },
      });
      return;
    }
    if (urgent !== undefined && urgent > 0 && !inCartBy.has(product.id)) {
      toast.info(`⏱️ ${product.name} ${Math.max(1, Math.round(urgent))} ghante me kharab hoga`, {
        description: 'Rate par click kar ke discount de sakte hain', duration: 2500,
      });
    }
    const units = await unitsFor(product);
    const oversell = !!opts.oversell;
    if (units.length > 1) { setUnitPicker({ product, units, oversell }); return; }
    placeUnit(product, units[0], oversell);
  };

  const addCombo = useCallback((combo: ProductCombo, qty = 1) => {
    for (const item of combo.items) {
      const product = products.find((p) => p.id === item.productId);
      if (!product) continue;
      const needed = Number(item.quantity) * qty;
      if (stockOf(product) < needed) { toast.error(`${product.name} — stock sirf ${stockOf(product)}, chahiye ${needed}`); return; }
    }
    setCart((prev) => {
      const existing = prev.find((l) => l.comboId === combo.id);
      if (existing) {
        toast.success(`${combo.name} +${qty}`, { duration: 900 });
        return prev.map((l) => (l.id === existing.id ? { ...l, quantity: l.quantity + qty, lineTotal: (l.quantity + qty) * l.unitPrice } : l));
      }
      toast.success(`🎁 ${combo.name}`, { duration: 900 });
      return [...prev, {
        id: posLineId(), type: 'combo' as const, comboId: combo.id, name: combo.name, image: combo.imageUrl,
        unitName: 'combo', unitLabel: 'COMBO', emoji: '🎁',
        unitPrice: Number(combo.comboPrice), basePrice: Number(combo.comboPrice),
        quantity: qty, baseQuantity: qty, conversionRate: 1, baseUnit: 'combo', baseStock: 9999,
        lineTotal: qty * Number(combo.comboPrice),
        comboItems: combo.items, savings: Number(combo.savingsAmount || 0),
        note: `${combo.items.length} items combo${combo.savingsAmount > 0 ? ` • Save ${formatPKR(combo.savingsAmount)}` : ''}`,
      }];
    });
  }, [products]);

  const addQuickKey = (qk: QuickKey) => {
    if (qk.comboId) {
      const combo = (combos as ProductCombo[]).find((c) => c.id === qk.comboId);
      return combo ? addCombo(combo, 1) : toast.error('Combo nahi mila');
    }
    if (qk.productId) {
      const product = products.find((p) => p.id === qk.productId);
      return product ? openProduct(product) : toast.error('Cheez nahi mili');
    }
    toast.error('Quick key set nahi hai');
  };

  const changeQty = (id: string, delta: number) => {
    setCart((prev) => prev.flatMap((l) => {
      if (l.id !== id) return [l];
      const nextQty = Number((l.quantity + delta * qtyStep(l.unitName)).toFixed(3));
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
    setCart((prev) => prev.map((l) => (l.id !== id ? l : { ...l, unitPrice: Math.max(price, 0), lineTotal: l.quantity * Math.max(price, 0) })));
    setPriceEditId(null);
  };

  const removeLine = (id: string) => setCart((prev) => prev.filter((l) => l.id !== id));
  const clearCart = useCallback(() => {
    setCart([]); setCustomerId(''); setDiscountPct(0); setDiscountRs(0);
    setDelivery(emptyDelivery()); setReceiver(emptyReceiver());
  }, []);

  /** Unit ke apne barcode se — dozen ka dabba, rusk ka packet */
  const addUnitLine = (product: Product, unit: any) => {
    const rate = Number(unit.conversionRate) || 1;
    const option: UnitOption = {
      id: unit.id, unitName: unit.unitName,
      label: (unit.unitLabel || unit.unitName).toUpperCase(),
      emoji: unitEmoji(unit.unitName), conversionRate: rate,
      price: Number(unit.price) || product.price * rate,
      wholesalePrice: unit.wholesalePrice ?? null,
    };
    if (stockOf(product) < rate) {
      toast.error(`${product.name} — ${unit.unitName} ke liye stock kam (sirf ${stockOf(product)} ${product.unit})`, {
        action: { label: 'Phir bhi bechein', onClick: () => placeUnit(product, option, true) },
      });
      return;
    }
    placeUnit(product, option, false);
  };

  /** Gun ne jo parha — combo, unit ka barcode, product, phir server */
  const handleBarcode = async (code: string) => {
    setScannerOpen(false);
    const trimmed = code.trim();
    if (!trimmed) return;
    const lower = trimmed.toLowerCase();

    const comboMatch = (combos as ProductCombo[]).find((c) => (c.barcode || '').toLowerCase() === lower || (c.sku || '').toLowerCase() === lower);
    if (comboMatch) { addCombo(comboMatch, 1); return; }

    const scannedUnit = unitByBarcode.get(lower);
    if (scannedUnit) {
      const product = products.find((p) => p.id === scannedUnit.productId);
      if (product) { addUnitLine(product, scannedUnit); return; }
    }

    const local = products.find((p) => (p.barcode ?? '').toLowerCase() === lower || (p.sku ?? '').toLowerCase() === lower);
    if (local) { await openProduct(local); return; }

    try {
      const product = await productsApi.byBarcode(trimmed);
      await openProduct(product);
      return;
    } catch { /* units ke SKU me dekhte hain */ }

    const skuUnit = unitBySku.get(lower);
    if (skuUnit) {
      const product = products.find((p) => p.id === skuUnit.productId);
      if (product) { addUnitLine(product, skuUnit); return; }
    }

    try {
      const unit = await productUnitsApi.byBarcode(trimmed);
      const product = (unit.product as Product | undefined) ?? products.find((p) => p.id === unit.productId);
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
    let terms = q;
    Object.entries(VOICE_ALIASES).forEach(([alias, target]) => { if (q.includes(alias.toLowerCase())) terms = `${terms} ${target}`; });
    const parts = terms.split(/\s+/);
    let best: Product | null = null;
    let bestScore = 0;
    for (const p of products) {
      if (p.isActive === false) continue;
      const name = p.name.toLowerCase();
      let score = name === q ? 100 : name.startsWith(q) ? 60 : name.includes(q) ? 40 : 0;
      for (const t of parts) {
        if (t.length < 2) continue;
        if (name.includes(t)) score += 10;
        if ((p.barcode || '').toLowerCase() === t || (p.sku || '').toLowerCase() === t) score += 50;
      }
      /* Jald kharab hone wala maal barabar ke muqable me aage */
      if (score > 0 && urgentBy.has(p.id)) score += 3;
      if (score > bestScore) { bestScore = score; best = p; }
    }
    return bestScore >= 20 ? best : null;
  }, [products, urgentBy]);

  const voiceAdd = async (cmd: Extract<VoiceCommand, { kind: 'add' }>) => {
    const p = findProductVoice(cmd.productQuery);
    if (!p) { toast.error(`🎤 "${cmd.productQuery}" nahi mila`); return; }
    if (stockOf(p) <= 0 || (urgentBy.get(p.id) ?? 1) <= 0) { openProduct(p); return; } // rukawat wala raasta
    const units = await unitsFor(p);
    let unit = units[0];
    if (cmd.unit) {
      const match = units.find((u) => unitKeyOf(u.unitName) === cmd.unit);
      if (match) unit = match;
      else {
        const baseKey = unitKeyOf(unit.unitName);
        let factor: number | null = null;
        if (cmd.unit === 'kg' && baseKey === 'gram') factor = 1000;
        else if (cmd.unit === 'gram' && baseKey === 'kg') factor = 0.001;
        else if (cmd.unit === 'dozen' && ['pcs', 'piece'].includes(baseKey)) factor = 12;
        if (factor !== null && !cmd.byMoney) { addProductLine(p, unit, Number((cmd.qty * factor).toFixed(3))); return; }
      }
    }
    if (cmd.byMoney) {
      if (isWeightUnit(unit.unitName) && unit.price > 0) { addProductLine(p, unit, Number((cmd.byMoney / unit.price).toFixed(3))); return; }
      setWeightModal({ product: p, unit, prefillMoney: cmd.byMoney, oversell: false });
      return;
    }
    if (units.length > 1 && !cmd.unit) { setUnitPicker({ product: p, units, oversell: false }); return; }
    addProductLine(p, unit, cmd.qty || 1);
  };

  const handleVoiceCommand = (cmd: VoiceCommand) => {
    if (cmd.kind === 'add') { voiceAdd(cmd); return; }
    if (cmd.kind === 'checkout') {
      if (cart.length === 0) { toast.error('🎤 Cart khaali hai'); return; }
      const voiceMode = (cmd as any).mode as string | undefined;
      if (voiceMode === 'credit' && !customerId) { toast.error('🎤 Udhaar ke liye pehle customer chunein'); return; }
      setCheckoutInit({ mode: voiceMode === 'credit' ? 'credit' : 'full' });
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
      clearCart(); toast.success('🎤 Cart clear');
      return;
    }
    toast.warning(`🎤 Samjha nahi: "${cmd.text}"`);
  };

  /* ─── Hold ─── */
  const holdCart = () => {
    if (cart.length === 0) return;
    setHeldCarts((prev) => [...prev, { id: posHeldId(), lines: cart, customerId, total, heldAt: Date.now() }]);
    clearCart();
    toast.success('Bill rok diya');
  };
  const resumeCart = (held: HeldCart) => {
    setCart(held.lines); setCustomerId(held.customerId);
    setHeldCarts((prev) => prev.filter((h) => h.id !== held.id));
    setShowHeldCarts(false);
    toast.success('Bill wapas aa gaya');
  };

  /* Customer yahin banta hai — pehle naye safhe par le jata tha aur
     cart ur jata tha. */
  const addCustomerMutation = useMutation({
    mutationFn: customersApi.create,
    onSuccess: (c: any) => {
      toast.success(`${c.name} add ho gaya`);
      setCustomerId(c.id); setShowCustomerAdd(false); setNewCustomer({ name: '', phone: '' });
      queryClient.invalidateQueries({ queryKey: ['customers-for-pos'] });
    },
    onError: (e: any) => toast.error(e?.response?.data?.message || 'Customer nahi bana'),
  });

  const closeSuccessModal = useCallback(() => {
    if (successTimerRef.current) { clearTimeout(successTimerRef.current); successTimerRef.current = null; }
    setLastSale(null);
    setTimeout(() => barcodeRef.current?.focus(), 100);
  }, []);

  /* ═══ CHECKOUT ═══ */
  const checkoutMutation = useMutation({
    mutationFn: (data: { paymentMethod: PaymentMethod; paidAmount: number; depositExtra?: boolean }) => {
      if (!currentShopId) throw new Error('Shop select karein');
      const items: any[] = [];
      cart.forEach((l) => {
        if (l.type === 'combo' && l.comboItems) {
          const origTotal = l.comboItems.reduce((s: number, it: any) => s + Number(it.quantity || 0) * (Number(it.originalPrice) || 0), 0);
          const factor = origTotal > 0 ? l.unitPrice / origTotal : 1;
          l.comboItems.forEach((ci: any) => {
            const orig = Number(ci.originalPrice) || 0;
            const disc = orig * factor;
            items.push({
              productId: ci.productId, variantId: ci.variantId,
              quantity: Number(ci.quantity) * l.quantity,
              priceOverride: isFinite(disc) && disc > 0 ? disc : orig,
              note: `Part of combo: ${l.name}`,
            });
          });
        } else if (l.type === 'product' && l.productId) {
          /* Stock product ke apne naap me ghatta hai — slice bika to
             cake ka hissa, dozen bika to 12. Rate bhi usi hisab se. */
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
    onSuccess: (sale: any, vars) => {
      const change = Math.max(vars.paidAmount - total, 0);
      const payLabel = POS_PAYMENT_METHODS.find((m) => m.id === vars.paymentMethod)?.label || vars.paymentMethod;
      const printPayload: ReceiptPayload = {
        saleNumber: sale.saleNumber || 'N/A',
        date: new Date(),
        shopName: tenant?.name || 'Bakery',
        shopPhone, shopAddress,
        customerName: selectedCustomer?.name,
        receivedByName: receiver.name.trim() || undefined,
        receivedByPhone: receiver.phone.trim() || undefined,
        previousDue: Number(selectedCustomer?.balance) || 0,
        lines: cart.map((l) => ({ name: l.name, qty: l.quantity, unit: l.unitName, price: l.unitPrice, total: l.lineTotal })),
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
      queryClient.invalidateQueries({ queryKey: ['products-for-bakery-pos'] });
      queryClient.invalidateQueries({ queryKey: ['bakery-all-products'] });
      queryClient.invalidateQueries({ queryKey: ['bakery-freshness-pos'] });
      queryClient.invalidateQueries({ queryKey: ['customers-for-pos'] });
      queryClient.invalidateQueries({ queryKey: ['sales-list'] });
      queryClient.invalidateQueries({ queryKey: ['pos-combos'] });

      if (autoPrint && !printReceiptDirect(printPayload, printerWidth)) {
        toast.error('Popup block hai — browser me popups allow karein');
      }
      if (autoClose) {
        successTimerRef.current = setTimeout(() => {
          setLastSale(null);
          setTimeout(() => barcodeRef.current?.focus(), 100);
        }, 3000);
      }
    },
    onError: (e: any) => {
      if (!navigator.onLine) toast.info('📴 Offline — bill queue me chala gaya');
      else toast.error(e?.response?.data?.message || e?.message || 'Bill nahi bana');
    },
  });

  const instantCash = useCallback(() => {
    if (cart.length === 0) { toast.error('Cart khaali hai'); return; }
    if (!currentShopId) { toast.error('Pehle shop select karein'); return; }
    if (checkoutMutation.isPending) return;
    checkoutMutation.mutate({ paymentMethod: 'CASH', paidAmount: total });
  }, [cart.length, currentShopId, total, checkoutMutation]);

  const openCheckout = useCallback((mode: PosCheckoutMode = 'full') => {
    if (cart.length === 0) return;
    setCheckoutInit({ mode });
    setShowCheckout(true);
  }, [cart.length]);

  /* ─── Shortcuts ─── */
  useEffect(() => {
    const handler = (e: KeyboardEvent) => {
      const tag = (document.activeElement as HTMLElement | null)?.tagName;
      const typing = tag === 'INPUT' || tag === 'TEXTAREA' || tag === 'SELECT';
      const onGun = document.activeElement === barcodeRef.current && !barcodeInput;
      if (e.key === 'F2') { e.preventDefault(); setScannerOpen(true); }
      if (e.key === 'F6' && !typing) { e.preventDefault(); document.getElementById('pos-voice-btn')?.querySelector('button')?.click(); }
      if (e.key === 'F9') { e.preventDefault(); openCheckout('full'); }
      if (e.key === 'F12') { e.preventDefault(); instantCash(); }
      if (e.key === 'F7') { e.preventDefault(); setViewMode('products'); }
      if (e.key === 'F8') { e.preventDefault(); setViewMode('combos'); }
      if (e.key === 'F10') { e.preventDefault(); setViewMode('quickkeys'); }
      if (e.key === 'F1' && !typing) { e.preventDefault(); setShowTeacher(true); }
      if (e.key === '/' && (!typing || onGun) && !anyModal) { e.preventDefault(); searchRef.current?.focus(); }
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
  }, [scannerOpen, showCheckout, unitPicker, weightModal, showMobileCart, priceEditId, showTeacher,
      showDiscountModal, showSettings, lastSale, anyModal, barcodeInput, openCheckout, instantCash, closeSuccessModal, setViewMode]);

  const handleScroll = useCallback((e: React.UIEvent<HTMLDivElement>) => {
    if (!hasMore || viewMode !== 'products') return;
    const t = e.currentTarget;
    if ((t.scrollTop + t.clientHeight) / t.scrollHeight > 0.85) setVisibleCount((c) => Math.min(c + 60, filteredRows.length));
  }, [hasMore, filteredRows.length, viewMode]);

  const isLoading = viewMode === 'products' ? loadingProducts : viewMode === 'combos' ? loadingCombos : false;

  return (
    <>
      {scannerOpen && (
        <BarcodeScanner onDetected={handleBarcode} onClose={() => setScannerOpen(false)}
          title="Bakery scanner" hint="Cheez ya dabbe ka barcode camera ke samne rakhein" />
      )}

      {unitPicker && (
        <PosUnitPickerModal
          product={unitPicker.product}
          units={unitPicker.units}
          onConfirm={(unit, qty) => {
            const { product, oversell } = unitPicker;
            setUnitPicker(null);
            placeUnit(product, unit, oversell, qty);
          }}
          onClose={() => setUnitPicker(null)}
        />
      )}

      {weightModal && (
        <PosWeighModal
          product={weightModal.product}
          unit={weightModal.unit}
          prefillMoney={weightModal.prefillMoney}
          onConfirm={(qty) => { addProductLine(weightModal.product, weightModal.unit, qty, weightModal.oversell); setWeightModal(null); }}
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
          onConfirm={(d) => checkoutMutation.mutate({ paymentMethod: d.paymentMethod, paidAmount: d.paidAmount, depositExtra: d.depositExtra })}
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
          subtotal={subtotal} mode={discountMode} pct={discountPct} rs={Number(discountRs) || 0}
          onApply={(m, p, r) => {
            setDiscountMode(m); setDiscountPct(p); setDiscountRs(r);
            setShowDiscountModal(false);
            if (m === 'pct' ? p > 0 : r > 0) toast.success(`Discount: ${m === 'pct' ? p + '%' : formatPKR(r)}`);
          }}
          onClose={() => setShowDiscountModal(false)}
        />
      )}

      {lastSale && (
        <PosSuccessModal
          lastSale={lastSale} autoPrint={autoPrint} autoClose={autoClose}
          onPrintAgain={() => printReceiptDirect(lastSale.printPayload, printerWidth)}
          onClose={closeSuccessModal}
        />
      )}

      {showCustomerAdd && (
        <PosCustomerAddModal
          value={newCustomer} onChange={setNewCustomer} saving={addCustomerMutation.isPending}
          onSubmit={(v) => {
            if (!v.name.trim()) return toast.error('Naam likhein');
            addCustomerMutation.mutate({ name: v.name.trim(), phone: v.phone?.trim() || undefined });
          }}
          onClose={() => setShowCustomerAdd(false)}
        />
      )}

      {showHeldCarts && (
        <PosHoldCartsModal
          heldCarts={heldCarts} onResume={resumeCart}
          onDelete={(id) => setHeldCarts((prev) => prev.filter((h) => h.id !== id))}
          onClose={() => setShowHeldCarts(false)}
        />
      )}

      <div className="min-h-[calc(100dvh-5rem)] lg:h-[calc(100dvh-7rem)] flex flex-col lg:grid lg:grid-cols-[1fr_400px] xl:grid-cols-[1fr_440px] gap-2 lg:gap-3">
        <section className="lg:flex-1 rounded-2xl lg:rounded-3xl bg-white dark:bg-slate-900/80 border-2 border-slate-200 dark:border-slate-800 shadow-sm lg:overflow-hidden flex flex-col lg:min-h-0">

          {/* HEADER */}
          <div className="shrink-0 relative overflow-hidden bg-gradient-to-br from-slate-950 via-pink-900 to-fuchsia-700 text-white">
            <div className="absolute -top-10 -right-10 h-32 w-32 rounded-full bg-pink-400/25 blur-2xl pointer-events-none" />
            <div className="relative px-3 sm:px-4 py-2.5 flex items-center justify-between gap-2">
              <div className="flex items-center gap-2 sm:gap-3 min-w-0">
                <div className="h-10 w-10 sm:h-11 sm:w-11 rounded-2xl bg-white/15 backdrop-blur flex items-center justify-center ring-2 ring-white/20 shrink-0">
                  <Cake className="h-5 w-5 sm:h-6 sm:w-6" />
                </div>
                <div className="min-w-0">
                  <div className="flex items-center gap-2 flex-wrap">
                    <h2 className="text-base sm:text-lg font-extrabold leading-none">🍰 Bakery Counter</h2>
                    {isOnline ? (
                      <span className="h-6 px-2 rounded-full bg-emerald-500/30 inline-flex items-center gap-1">
                        <Wifi className="h-3 w-3 text-emerald-200" /><span className="text-[9px] font-extrabold text-emerald-200">LIVE</span>
                      </span>
                    ) : (
                      <span className="h-6 px-2 rounded-full bg-amber-500/30 inline-flex items-center gap-1 animate-pulse">
                        <WifiOff className="h-3 w-3 text-amber-200" /><span className="text-[9px] font-extrabold text-amber-200">OFFLINE</span>
                      </span>
                    )}
                    {autoPrint && (
                      <span className="h-6 px-2 rounded-full bg-sky-500/30 inline-flex items-center gap-1" title={`Auto-print ON (${printerWidth}mm)`}>
                        <Printer className="h-3 w-3 text-sky-200" /><span className="text-[9px] font-extrabold text-sky-200">{printerWidth}mm</span>
                      </span>
                    )}
                    {counts.urgent > 0 && (
                      <button onClick={() => { setViewMode('products'); setKind('urgent'); }}
                        className="h-6 px-2 rounded-full bg-amber-400/90 text-slate-900 inline-flex items-center gap-1 text-[9px] font-extrabold hover:bg-amber-300 transition">
                        <Timer className="h-3 w-3" /> {counts.urgent} JALD BECHO
                      </button>
                    )}
                  </div>
                  <p className="text-[11px] sm:text-xs text-white/80 font-semibold mt-0.5 flex items-center gap-1 truncate">
                    <Store className="h-3 w-3 shrink-0" /><span className="truncate">{tenant?.name || 'Bakery'}</span>
                  </p>
                </div>
              </div>
              <div className="flex items-center gap-1.5 shrink-0">
                <span id="pos-voice-btn"><VoiceSaleButton onCommand={handleVoiceCommand} /></span>
                <HeadBtn onClick={() => setShowSettings(true)} title="Settings"><Settings2 className="h-5 w-5" /></HeadBtn>
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
                <HeadBtn onClick={() => setHidePrices((v: boolean) => !v)} title="Rate chhupao">
                  {hidePrices ? <EyeOff className="h-5 w-5" /> : <Eye className="h-5 w-5" />}
                </HeadBtn>
                <button onClick={() => setShowMobileCart(true)}
                  className="lg:hidden relative h-10 w-10 rounded-2xl bg-emerald-500 hover:bg-emerald-600 active:scale-95 flex items-center justify-center transition">
                  <ShoppingCart className="h-5 w-5" />
                  {itemCount > 0 && (
                    <span className="absolute -top-1 -right-1 min-w-[20px] h-5 px-1 rounded-full bg-rose-500 text-white text-[10px] font-extrabold flex items-center justify-center">{itemCount}</span>
                  )}
                </button>
              </div>
            </div>
          </div>

          {/* VIEW TABS */}
          <div className="shrink-0 px-3 sm:px-4 pt-3 bg-slate-50 dark:bg-slate-900/60 border-b-2 border-slate-100 dark:border-slate-800">
            <div className="flex gap-1.5 bg-white dark:bg-slate-800 rounded-2xl border-2 border-slate-200 dark:border-slate-700 p-1">
              <PosViewTab active={viewMode === 'products'} onClick={() => setViewMode('products')} icon={Package} label="Maal" count={products.length} color="sky" shortcut="F7" />
              <PosViewTab active={viewMode === 'combos'} onClick={() => setViewMode('combos')} icon={Sparkles} label="Combos" count={combos.length} color="violet" shortcut="F8" highlight={combos.length > 0} />
              <PosViewTab active={viewMode === 'quickkeys'} onClick={() => setViewMode('quickkeys')} icon={Zap} label="Quick" count={quickKeys.length} color="amber" shortcut="F10" />
            </div>
          </div>

          {/* SEARCH + BARCODE */}
          <div className="shrink-0 px-3 sm:px-4 py-2.5 bg-slate-50 dark:bg-slate-900/60 border-b-2 border-slate-100 dark:border-slate-800 space-y-2">
            <div className="flex gap-2">
              <div className="relative flex-1">
                <Search className="h-5 w-5 sm:h-6 sm:w-6 text-slate-400 absolute left-3 sm:left-4 top-1/2 -translate-y-1/2 pointer-events-none" />
                <input ref={searchRef}
                  className="h-14 sm:h-16 w-full rounded-2xl border-4 border-slate-200 dark:border-slate-700 bg-white dark:bg-slate-800 pl-11 sm:pl-14 pr-10 sm:pr-12 text-lg sm:text-xl font-bold text-slate-900 dark:text-white placeholder:text-slate-400 focus:outline-none focus:border-pink-500 focus:ring-4 focus:ring-pink-200 dark:focus:ring-pink-500/20 transition"
                  placeholder={viewMode === 'products' ? 'Cake, patties, rusk… (/)' : viewMode === 'combos' ? 'Combo naam…' : 'Quick key…'}
                  value={search} onChange={(e) => setSearch(e.target.value)} />
                {search && (
                  <button onClick={() => setSearch('')} className="absolute right-2.5 top-1/2 -translate-y-1/2 h-9 w-9 sm:h-10 sm:w-10 rounded-xl hover:bg-slate-100 dark:hover:bg-slate-700 active:scale-95 flex items-center justify-center transition">
                    <X className="h-5 w-5 text-slate-500" />
                  </button>
                )}
              </div>
              <button onClick={() => setScannerOpen(true)} title="Camera scan (F2)"
                className="h-14 sm:h-16 w-16 sm:w-20 rounded-2xl bg-gradient-to-br from-slate-900 to-slate-800 dark:from-slate-700 dark:to-slate-800 active:scale-95 text-white flex flex-col items-center justify-center gap-0.5 shadow-lg transition shrink-0">
                <Camera className="h-5 w-5 sm:h-6 sm:w-6" /><span className="text-[9px] sm:text-[10px] font-extrabold uppercase">Scan</span>
              </button>
            </div>

            <form onSubmit={(e) => { e.preventDefault(); if (barcodeInput.trim()) { handleBarcode(barcodeInput); setBarcodeInput(''); } }} className="relative">
              <ScanLine className="h-4 w-4 sm:h-5 sm:w-5 text-emerald-600 dark:text-emerald-400 absolute left-3 top-1/2 -translate-y-1/2" />
              <input ref={barcodeRef} value={barcodeInput} onChange={(e) => setBarcodeInput(e.target.value)}
                placeholder="Barcode gun ready… (cheez, dabba ya combo)"
                className="h-10 sm:h-12 w-full rounded-2xl border-2 border-emerald-300 dark:border-emerald-500/40 bg-emerald-50 dark:bg-emerald-500/10 pl-10 sm:pl-11 pr-3 text-sm sm:text-base font-mono font-extrabold text-emerald-900 dark:text-emerald-200 placeholder:text-emerald-400 focus:outline-none focus:border-emerald-600 focus:ring-2 focus:ring-emerald-200 dark:focus:ring-emerald-500/20" />
            </form>

            {viewMode === 'products' && (
              <>
                {/* Qism — bakery ki apni patti */}
                <div className="flex gap-1.5 overflow-x-auto pb-0.5 -mx-1 px-1">
                  {([
                    { v: 'all' as Kind, l: 'Sab', n: counts.all, icon: Grid3x3, on: 'bg-slate-900 dark:bg-white text-white dark:text-slate-900 border-transparent' },
                    { v: 'made' as Kind, l: 'Khud banaya', n: counts.made, icon: ChefHat, on: 'bg-pink-600 text-white border-pink-600' },
                    { v: 'bought' as Kind, l: 'Bahar se', n: counts.bought, icon: ShoppingBag, on: 'bg-blue-600 text-white border-blue-600' },
                    { v: 'urgent' as Kind, l: 'Jald becho', n: counts.urgent + counts.expired, icon: Timer, on: 'bg-amber-500 text-white border-amber-500' },
                  ]).map((o) => {
                    const on = kind === o.v;
                    if (o.v === 'urgent' && o.n === 0) return null;
                    return (
                      <button key={o.v} onClick={() => setKind(o.v)}
                        className={`shrink-0 h-9 sm:h-10 px-3 rounded-xl text-xs sm:text-sm font-extrabold inline-flex items-center gap-1.5 border-2 transition active:scale-95 ${
                          on ? `${o.on} shadow-md` : 'bg-white dark:bg-slate-800 text-slate-700 dark:text-slate-200 border-slate-200 dark:border-slate-700 hover:border-pink-300'
                        }`}>
                        <o.icon className="h-3.5 w-3.5" /> {o.l}
                        <span className={`px-1.5 rounded-md text-[10px] tabular-nums ${on ? 'bg-white/20' : 'bg-slate-100 dark:bg-slate-700'}`}>{o.n}</span>
                      </button>
                    );
                  })}
                </div>

                {categories.length > 0 && (
                  <div className="flex gap-1.5 overflow-x-auto pb-1 -mx-1 px-1">
                    <button onClick={() => setCategoryId('')}
                      className={`shrink-0 h-9 px-3 rounded-xl text-xs font-extrabold inline-flex items-center gap-1.5 border-2 transition active:scale-95 ${
                        !categoryId ? 'bg-pink-600 text-white border-pink-600 shadow-md' : 'bg-white dark:bg-slate-800 text-slate-700 dark:text-slate-200 border-slate-200 dark:border-slate-700 hover:border-pink-300'
                      }`}>
                      Sab categories
                    </button>
                    {categories.map((cat) => {
                      const active = categoryId === cat.id;
                      return (
                        <button key={cat.id} onClick={() => setCategoryId(active ? '' : cat.id)}
                          className="shrink-0 h-9 px-3 rounded-xl text-xs font-extrabold inline-flex items-center gap-1.5 border-2 border-slate-200 dark:border-slate-700 bg-white dark:bg-slate-800 transition active:scale-95"
                          style={active ? { backgroundColor: cat.color || '#db2777', borderColor: cat.color || '#db2777', color: '#fff' } : undefined}>
                          {!active && <span className="h-2 w-2 rounded-full" style={{ backgroundColor: cat.color || '#94a3b8' }} />}
                          <span className={active ? '' : 'text-slate-700 dark:text-slate-200'}>{cat.name}</span>
                          <span className={`px-1.5 rounded-md text-[10px] tabular-nums ${active ? 'bg-white/20' : 'bg-slate-100 dark:bg-slate-700 text-slate-600 dark:text-slate-300'}`}>{cat.count}</span>
                        </button>
                      );
                    })}
                  </div>
                )}
              </>
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
                <PosEmptyState icon={Cake} title="Kuch nahi mila"
                  hint={search ? `"${search}" ki koi cheez nahi` : kind !== 'all' ? 'Is qism me abhi kuch nahi' : 'Pehle maal add karein'}
                  onClear={search || kind !== 'all' || categoryId ? () => { setSearch(''); setKind('all'); setCategoryId(''); } : undefined} />
              ) : (
                <>
                  <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 lg:grid-cols-3 xl:grid-cols-4 2xl:grid-cols-5 gap-2 sm:gap-3">
                    {visibleRows.map((r) => (
                      <BakeryTile key={r.p.id} row={r} inCart={inCartBy.get(r.p.id) ?? 0} hidePrices={hidePrices} onClick={() => openProduct(r.p)} />
                    ))}
                  </div>
                  {hasMore && (
                    <button onClick={() => setVisibleCount((c) => c + 60)}
                      className="mt-3 w-full h-12 rounded-2xl bg-white dark:bg-slate-800 border-4 border-slate-200 dark:border-slate-700 hover:border-pink-400 active:scale-[0.98] text-slate-700 dark:text-slate-200 text-sm font-extrabold inline-flex items-center justify-center gap-2 transition">
                      <Package className="h-4 w-4" /> Aur dikhaein ({filteredRows.length - visibleCount} baqi)
                    </button>
                  )}
                </>
              )
            ) : viewMode === 'combos' ? (
              filteredCombos.length === 0 ? (
                <PosEmptyState icon={Sparkles} title="Koi combo nahi"
                  hint={combos.length === 0 ? 'Cake + candles, chai + rusk — combo bana lein' : 'Search badal kar dekhein'} />
              ) : (
                <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 lg:grid-cols-3 xl:grid-cols-4 gap-2 sm:gap-3">
                  {filteredCombos.map((c) => <PosComboTile key={c.id} combo={c} cart={cart} hidePrices={hidePrices} onClick={() => addCombo(c, 1)} />)}
                </div>
              )
            ) : Object.keys(groupedQuickKeys).length === 0 ? (
              <PosEmptyState icon={Zap} title="Koi quick key nahi" hint={quickKeys.length === 0 ? 'Roz bikne wali cheezon ki quick key bana lein' : 'Search badal kar dekhein'} />
            ) : (
              <div className="space-y-4">
                {Object.entries(groupedQuickKeys).map(([group, keys]) => (
                  <div key={group}>
                    <div className="text-[10px] uppercase font-extrabold text-slate-600 dark:text-slate-400 tracking-wider mb-2 flex items-center gap-1.5">
                      <div className="h-1 w-6 rounded-full bg-pink-500" /> {group}
                      <span className="px-1.5 py-0.5 rounded bg-slate-200 dark:bg-slate-700 text-slate-700 dark:text-slate-300 text-[9px] tabular-nums">{keys.length}</span>
                    </div>
                    <div className="grid grid-cols-3 sm:grid-cols-4 md:grid-cols-5 lg:grid-cols-4 xl:grid-cols-6 gap-2">
                      {keys.map((k) => <PosQuickKeyTile key={k.id} qk={k} products={products} combos={combos} hidePrices={hidePrices} onClick={() => addQuickKey(k)} />)}
                    </div>
                  </div>
                ))}
              </div>
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
          receiver={receiver} onReceiverChange={setReceiver}
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
            className="w-full h-16 rounded-2xl bg-gradient-to-r from-pink-600 to-fuchsia-700 text-white shadow-2xl active:scale-[0.98] flex items-center justify-between px-5 transition">
            <div className="flex items-center gap-3">
              <div className="relative">
                <ShoppingCart className="h-6 w-6" />
                <span className="absolute -top-2 -right-2 min-w-[22px] h-5 px-1 rounded-full bg-white text-pink-700 text-[11px] font-extrabold flex items-center justify-center tabular-nums">{itemCount}</span>
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
   BAKERY TILE — taazgi, fridge aur qism ek nazar me
   ═════════════════════════════════════════════════════════════ */
function BakeryTile({ row, inCart, hidePrices, onClick }: {
  row: { p: Product; profile?: BakeryProduct; kind: 'made' | 'bought'; urgent?: number; stock: number };
  inCart: number; hidePrices: boolean; onClick: () => void;
}) {
  const { p, profile, kind, urgent, stock } = row;
  const img = p.images?.find((i: any) => i.isPrimary)?.url ?? p.images?.[0]?.url;
  const expired = urgent !== undefined && urgent <= 0;
  const soon = urgent !== undefined && urgent > 0;
  const out = stock <= 0;
  const low = !out && stock <= Number((p as any).lowStockAlert ?? 5);
  const slicePrice = Number(profile?.pricePerSlice || 0);

  return (
    <button onClick={onClick}
      className={[
        'group relative text-left rounded-2xl bg-white dark:bg-slate-900 border-2 overflow-hidden shadow-sm hover:shadow-lg hover:-translate-y-0.5 active:scale-[0.98] transition-all',
        inCart > 0 ? 'border-emerald-500 ring-2 ring-emerald-200 dark:ring-emerald-500/25'
          : expired ? 'border-rose-300 dark:border-rose-500/50'
          : soon ? 'border-amber-400 dark:border-amber-500/60'
          : 'border-slate-200 dark:border-slate-800 hover:border-pink-400',
        out || expired ? 'opacity-70' : '',
      ].join(' ')}>
      {inCart > 0 && (
        <span className="absolute top-2 right-2 z-10 h-7 min-w-7 px-1.5 rounded-full bg-emerald-600 text-white text-xs font-black flex items-center justify-center shadow tabular-nums">
          {Number(inCart.toFixed(2))}
        </span>
      )}

      <div className="relative aspect-[4/3] overflow-hidden bg-slate-100 dark:bg-slate-800">
        {img ? (
          <img src={img} alt={p.name} loading="lazy" className="h-full w-full object-cover group-hover:scale-105 transition-transform duration-300" />
        ) : (
          <div className={`w-full h-full flex items-center justify-center bg-gradient-to-br ${productTint(p.name)}`}>
            <span className="text-4xl drop-shadow-sm">{productEmoji(p.name, p.category?.name)}</span>
          </div>
        )}
        <div className="absolute top-2 left-2 flex flex-col items-start gap-1">
          {expired && (
            <span className="text-[9px] font-black uppercase px-1.5 py-0.5 rounded-md bg-rose-600 text-white shadow inline-flex items-center gap-1">
              <Flame className="h-2.5 w-2.5" /> Waqt guzra
            </span>
          )}
          {soon && (
            <span className="text-[9px] font-black uppercase px-1.5 py-0.5 rounded-md bg-amber-500 text-white shadow inline-flex items-center gap-1">
              <Timer className="h-2.5 w-2.5" /> {Math.max(1, Math.round(urgent!))}h baqi
            </span>
          )}
          {profile?.requiresRefrigeration && (
            <span className="text-[9px] font-black uppercase px-1.5 py-0.5 rounded-md bg-sky-600 text-white shadow inline-flex items-center gap-1">
              <Snowflake className="h-2.5 w-2.5" /> Fridge
            </span>
          )}
          {p.isFeatured && (
            <span className="h-5 w-5 rounded-full bg-amber-500 flex items-center justify-center shadow">
              <Star className="h-2.5 w-2.5 fill-white text-white" />
            </span>
          )}
        </div>
        {(out || low) && (
          <div className={`absolute inset-x-0 bottom-0 py-0.5 text-center text-[9px] font-extrabold text-white ${out ? 'bg-slate-700' : 'bg-amber-500'}`}>
            {out ? 'STOCK 0' : `SIRF ${Number(stock.toFixed(2))} BACHA`}
          </div>
        )}
      </div>

      <div className="p-2.5">
        <div className="font-extrabold text-[13px] text-slate-900 dark:text-white leading-tight line-clamp-2 min-h-[2.1rem]">{p.name}</div>
        <div className="mt-1 flex items-end justify-between gap-1">
          <div className="min-w-0">
            <div className="text-base font-black text-pink-600 dark:text-pink-400 tabular-nums leading-none">
              {hidePrices ? '••••' : formatPKR(p.price)}
            </div>
            <div className="text-[9px] font-bold text-slate-400 mt-0.5 truncate">
              per {p.unit}{!hidePrices && slicePrice > 0 && ` • slice ${formatPKR(slicePrice)}`}
            </div>
          </div>
          <span className={`text-[9px] font-black uppercase px-1.5 py-0.5 rounded-md shrink-0 ${
            kind === 'made' ? 'bg-pink-100 dark:bg-pink-500/20 text-pink-700 dark:text-pink-300' : 'bg-blue-100 dark:bg-blue-500/20 text-blue-700 dark:text-blue-300'
          }`}>{kind === 'made' ? '🧁' : '📦'}</span>
        </div>
      </div>
    </button>
  );
}

function HeadBtn({ children, onClick, title }: any) {
  return (
    <button onClick={onClick} title={title}
      className="h-10 w-10 sm:h-11 sm:w-11 rounded-2xl bg-white/15 hover:bg-white/25 active:scale-95 flex items-center justify-center border-2 border-white/20 transition">
      {children}
    </button>
  );
}