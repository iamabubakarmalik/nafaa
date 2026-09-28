import { useState, useMemo, useEffect, useRef, useCallback } from 'react';
import { Link } from 'react-router-dom';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import {
  Search, ShoppingCart, Package, X, Camera, ScanLine, Store, Eye, EyeOff,
  Grid3x3, ArrowRight, Printer, Pause, Wifi, WifiOff, Sparkles, Zap,
  GraduationCap, Settings2, Wheat, Sprout, FlaskConical, Bug, Tractor,
  ShieldAlert, Leaf, Scale, Calendar,
} from 'lucide-react';
import { toast } from 'sonner';
import { formatPKR } from '@core/lib/format';
import { useAuthStore, useShopParam } from '@core/stores/auth.store';
import { offlineProductsApi as productsApi } from '@core/lib/offline/offlineProducts';
import { offlineCustomersApi as customersApi } from '@core/lib/offline/offlineCustomers';
import { offlineSalesApi } from '@core/lib/offline/offlineSales';
import { type PaymentMethod } from '@modules/sales/sales/api/sales.api';
import type { Product } from '@modules/inventory/products/api/products.api';
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
import { agriProductsApi, type AgriProductProfile } from '../api/products.api';
import { farmersApi } from '../api/farmers.api';
import { certStatus, isMeasured, agriUnitLabel, SEASONS as AGRI_SEASONS } from '../lib/agriUnits';
import {
  deriveAgriKind, prettyAgriKind, AGRI_KIND_EMOJI, needsGovtReg,
  isSeedKind, isFertKind, isSprayKind, isFeedKind, isToolKind, type AgriKind,
} from '../lib/agriCategory';

/* ═════════════════════════════════════════════════════════════
   🌾 AGRI POS — RETAIL KI BUNYAD PAR, AGRI KE DIMAGH SE
   ─────────────────────────────────────────────────────────────
   Retail aur bakery ki har cheez ab yahan bhi — wohi shared
   `@modules/pos`:
   ⚡ F12 instant cash + auto-print   💵 Full / Partial / Udhaar
   ⚖️ Weigh (kilo/litre)               💎 Discount   🚚 Delivery
   🎤 Voice                            🎁 Combos     ⚡ Quick keys
   ⏸️ Hold carts                       📴 Offline    👤 Customer yahin add

   Agri ki apni do cheezein:

   ⚖️ BORI BHI, KILO BHI — stock bori me ginta hai magar farmer
      "paanch kilo urea" maangta hai. Jahan "1 bori = 50 kg" bhara
      hai, wahan kilo ka naap khud ban jata hai aur stock usi
      hisaab se ghatta hai (`lib/agriUnits` — wohi hisab jo wizard,
      list aur detail page me hai).

   🛡️ SARKARI REGISTRATION — jis beej ya dawa ki meyaad khatam ho
      chuki, us ko bechna ghair-qanooni hai. Wo POS par laal aati
      hai aur bechne se pehle rok kar wajah batati hai. Taazgi wali
      rukawat bakery me hai; agri me yehi us ki jagah hai — farq ye
      ke yahan masla qanoon ka hai, maal kharab hone ka nahi.
   ⌨️ F1 guide • F2 scan • / search • F6 voice • F9 checkout • F12 instant
   ═════════════════════════════════════════════════════════════ */

type UnitOption = PosUnitOption;
type CartLine = PosCartLine;
type HeldCart = PosHeldCart;
type Kind = 'all' | 'seed' | 'fert' | 'spray' | 'feed' | 'tool' | 'legal';

/** Stock na hone par bhi bechne wali line ki hadd */
const NO_LIMIT = Number.MAX_SAFE_INTEGER;

const stockOf = (p: any) => Number(p?.shopStock ?? p?.stock ?? 0);

const KIND_TABS: Array<{ v: Kind; l: string; icon: any; on: string; test: (k: AgriKind) => boolean }> = [
  { v: 'seed', l: 'Beej', icon: Sprout, on: 'bg-lime-600 text-white border-lime-600', test: isSeedKind },
  { v: 'fert', l: 'Khaad', icon: FlaskConical, on: 'bg-emerald-600 text-white border-emerald-600', test: isFertKind },
  { v: 'spray', l: 'Dawa', icon: Bug, on: 'bg-rose-600 text-white border-rose-600', test: isSprayKind },
  { v: 'feed', l: 'Feed', icon: Wheat, on: 'bg-amber-600 text-white border-amber-600', test: isFeedKind },
  { v: 'tool', l: 'Auzaar', icon: Tractor, on: 'bg-slate-700 text-white border-slate-700', test: isToolKind },
];

/* 🗣️ Agri ke alfaz — farmer jo bolta hai */
const VOICE_ALIASES: Record<string, string> = {
  urea: 'urea khaad', 'یوریا': 'urea khaad', dap: 'dap khaad', 'ڈی اے پی': 'dap khaad',
  khaad: 'khaad fertilizer urea dap', 'کھاد': 'khaad fertilizer',
  beej: 'beej seed', 'بیج': 'beej seed', seed: 'beej seed',
  gandum: 'gandum wheat', 'گندم': 'gandum wheat', kapas: 'kapas cotton', 'کپاس': 'kapas cotton',
  chawal: 'chawal rice dhan', 'چاول': 'chawal rice', makai: 'makai maize', 'مکئی': 'makai maize',
  dawa: 'dawa spray pesticide', 'دوا': 'dawa spray', spray: 'spray dawa pesticide',
  sundi: 'sundi insecticide keera', 'سنڈی': 'sundi insecticide',
  keera: 'keera insecticide sundi', 'کیڑا': 'keera insecticide',
  wanda: 'wanda cattle feed', 'ونڈا': 'wanda cattle feed',
  feed: 'feed wanda murghi', murghi: 'murghi poultry feed', 'مرغی': 'murghi poultry feed',
  potash: 'potash sop mop khaad', zinc: 'zinc micronutrient',
  bori: 'bori bag', 'بوری': 'bori bag',
};

/** Kilo/gram wale naap jo bori ke andar se nikal kar diye ja sakte hain */
const LOOSE_UNITS: Record<string, { label: string; perUnit: (packSize: number) => number }> = {
  kg: { label: 'kg', perUnit: (p) => 1 / p },
  gram: { label: 'gram', perUnit: (p) => 1 / (p * 1000) },
  litre: { label: 'litre', perUnit: (p) => 1 / p },
  ml: { label: 'ml', perUnit: (p) => 1 / (p * 1000) },
};

/**
 * Agri ke naap — retail ke units + agri profile ka bori/kilo hisab.
 *
 * Pehle `derivePosUnits` (base + Multi-Unit safhe wale). Phir agar
 * agri profile me "1 bori = 50 kg" bhara ho to us naap ka option bhi
 * khud ban jata hai — rate proportional, taake bori aur kilo ka
 * hisab hamesha mel khaye. Pehle POS me ye tha hi nahi: ek bori
 * bikne par stock se 1 ghatta tha, 50 kilo nahi.
 */
function agriUnitOptions(
  product: Product,
  profile: AgriProductProfile | undefined,
  apiUnits: any[],
): UnitOption[] {
  const units = derivePosUnits(product, apiUnits);
  if (!profile) return units;

  const base = (product.unit || 'bag').toLowerCase();
  /* Base khud wazan wala ho (kg me bikne wali cheez) to torne ko
     kuch hai hi nahi. */
  if (isMeasured(base)) return units;

  const packSize = Number(profile.packSize || 0);
  const packUnit = String(profile.packUnit || 'kg').toLowerCase();
  const loose = LOOSE_UNITS[packUnit];
  if (!(packSize > 0) || !loose) return units;

  const have = new Set(units.map((u) => unitKeyOf(u.unitName)));
  if (have.has(unitKeyOf(packUnit))) return units;

  const rate = loose.perUnit(packSize);
  units.push({
    id: `ag-${packUnit}`,
    unitName: packUnit,
    label: packUnit.toUpperCase(),
    emoji: unitEmoji(packUnit),
    conversionRate: rate,
    price: Number(product.price || 0) * rate,
    wholesalePrice: product.wholesalePrice ? Number(product.wholesalePrice) * rate : null,
  } as UnitOption);

  return units;
}

export default function AgriPosPage() {
  const queryClient = useQueryClient();
  const currentShopId = useShopParam();
  const tenant = useAuthStore((s) => s.tenant);
  const shopPhone = useAuthStore((s: any) => s.user?.assignedShop?.phone || s.tenant?.phone || '');
  const shopAddress = useAuthStore((s: any) => s.user?.assignedShop?.address || s.tenant?.address || '');

  const {
    hidePrices, setHidePrices, autoClose, setAutoClose, autoPrint, setAutoPrint,
    printerWidth, setPrinterWidth, viewMode, setViewMode,
  } = usePosPreferences('agri');

  const [search, setSearch] = useState('');
  const [debouncedSearch, setDebouncedSearch] = useState('');
  const [categoryId, setCategoryId] = useState('');
  const [kind, setKind] = useState<Kind>('all');
  const [seasonFilter, setSeasonFilter] = useState('');
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
  const [blocked, setBlocked] = useState<{ product: Product; kind: AgriKind; text: string } | null>(null);
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
  }, [debouncedSearch, categoryId, kind, seasonFilter, viewMode]);

  useEffect(() => {
    const onOnline = () => { setIsOnline(true); toast.success('🟢 Internet wapas'); };
    const onOffline = () => { setIsOnline(false); toast.warning('📴 Offline — bill locally save honge'); };
    window.addEventListener('online', onOnline);
    window.addEventListener('offline', onOffline);
    return () => { window.removeEventListener('online', onOnline); window.removeEventListener('offline', onOffline); };
  }, []);

  /* Barcode gun ka khana hamesha tayyar — koi modal khula na ho to */
  const anyModal = scannerOpen || showCheckout || !!unitPicker || !!weightModal || showCustomerAdd
    || showHeldCarts || !!lastSale || showTeacher || showDiscountModal || showSettings || !!blocked;
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
    queryKey: ['products-for-agri-pos'],
    queryFn: () => productsApi.list({ page: 1, limit: 100_000 }),
    staleTime: 30_000,
  });
  /* Agri profile offline na mile to POS phir bhi chale — bas kilo ka
     naap aur registration ka nishan nahi aayega. */
  const { data: profiles = [] } = useQuery({
    queryKey: ['agri-profiles-all'],
    queryFn: () => agriProductsApi.list({}).catch(() => [] as AgriProductProfile[]),
    staleTime: 5 * 60_000,
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

  /* Customer chunte hi us ka farmer profile — gaon, zameen, credit
     limit. Customer aur AgriFarmer ab ek hi shakhs hain (farmer
     banate waqt Customer bhi ban jata hai), is liye ye hamesha
     mil jata hai. Purane farmer jo us se pehle bane, un ka khana
     khali aata hai — Farmers safhe se jora ja sakta hai. */
  const { data: farmerProfile } = useQuery({
    queryKey: ['agri-farmer-by-customer', customerId],
    queryFn: () => farmersApi.byCustomer(customerId).catch(() => null),
    enabled: !!customerId,
    staleTime: 60_000,
  });

  const unitIndex = useMemo(() => buildUnitScanIndex(allUnits as any[]), [allUnits]);
  const { byBarcode: unitByBarcode, bySku: unitBySku, byProduct: unitsByProduct, codesByProduct: unitCodesByProduct } = unitIndex;

  const profileBy = useMemo(() => {
    const m = new Map<string, AgriProductProfile>();
    (profiles as AgriProductProfile[]).forEach((p) => { if (p.productId) m.set(p.productId, p); });
    return m;
  }, [profiles]);

  /**
   * Search ka naqsha — ek dafa banta hai, har harf par nahi.
   *
   * Agri ka `hay` me fasal aur keera bhi hai: farmer "gandum ki
   * sundi ki dawa" maangta hai, product ka naam nahi janta.
   *
   * Tarteeb: jis ki registration khatam wo AAKHIR me — wo bik hi
   * nahi sakti, is liye raaste me nahi aani chahiye.
   */
  const searchIndex = useMemo(() => {
    const collator = new Intl.Collator('en', { sensitivity: 'base' });
    const rows = products
      .filter((p) => p.isActive !== false)
      .map((p) => {
        const profile = profileBy.get(p.id);
        const k = (profile?.category as AgriKind) ?? deriveAgriKind(p.category?.name, p.name);
        const cert = certStatus(profile?.govtRegExpiry);
        const regulated = needsGovtReg(k);
        const packSize = Number(profile?.packSize || 0);
        return {
          p, profile, kind: k, cert,
          blocked: regulated && cert.state === 'expired',
          certSoon: regulated && cert.state === 'soon',
          restricted: !!profile?.isRestricted,
          packSize: packSize > 0 && !isMeasured(p.unit) ? packSize : 0,
          packUnit: String(profile?.packUnit || 'kg').toLowerCase(),
          stock: stockOf(p),
          hay: [
            p.name, p.sku ?? '', p.barcode ?? '', p.category?.name ?? '',
            ...(profile?.targetCrops ?? []),
            ...(profile?.targetPests ?? []),
            profile?.activeIngredient ?? '',
            profile?.npkRatio ?? '',
            ...(unitCodesByProduct.get(p.id) ?? []),
          ].join(' ').toLowerCase(),
        };
      });
    const rank = (r: typeof rows[number]) => {
      if (r.blocked) return 4;            // bik hi nahi sakti
      if (r.stock <= 0) return 3;
      if (r.certSoon) return 1;           // jald khatam — nazar me rahe
      return r.p.isFeatured ? 0 : 2;
    };
    rows.sort((a, b) => {
      const ra = rank(a), rb = rank(b);
      if (ra !== rb) return ra - rb;
      return collator.compare(a.p.name, b.p.name);
    });
    return rows;
  }, [products, profileBy, unitCodesByProduct]);

  const counts = useMemo(() => {
    const m: Record<string, number> = { all: searchIndex.length };
    KIND_TABS.forEach((t) => { m[t.v] = searchIndex.filter((r) => t.test(r.kind)).length; });
    m.legal = searchIndex.filter((r) => r.blocked || r.certSoon).length;
    m.blocked = searchIndex.filter((r) => r.blocked).length;
    return m;
  }, [searchIndex]);

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
    const tab = KIND_TABS.find((t) => t.v === kind);
    if (tab) rows = rows.filter((r) => tab.test(r.kind));
    else if (kind === 'legal') rows = rows.filter((r) => r.blocked || r.certSoon);
    if (seasonFilter) rows = rows.filter((r) => r.profile?.season === seasonFilter);
    if (categoryId) rows = rows.filter((r) => r.p.categoryId === categoryId);
    const q = debouncedSearch.toLowerCase().trim();
    if (q) rows = rows.filter((r) => r.hay.includes(q));
    return rows;
  }, [searchIndex, kind, seasonFilter, categoryId, debouncedSearch]);

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
        if (newBase > existing.baseStock) { toast.error(`Stock sirf ${stock} ${agriUnitLabel(product.unit)}`); return prev; }
        toast.success(`${product.name} +${qty}`, { duration: 900 });
        return prev.map((l) => (l.id === existing.id ? { ...l, quantity: newQty, baseQuantity: newBase, lineTotal: newQty * l.unitPrice } : l));
      }
      if (baseQty > limit) { toast.error(`Stock sirf ${stock} ${agriUnitLabel(product.unit)}`); return prev; }
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
          /* Receipt par wohi likha jaye jo counter par bola gaya —
             "5 kg = 0.1 bori" dono taraf ka hisab saaf rakhta hai. */
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
      } catch { /* offline — sirf profile wala bori/kilo hisab */ }
    }
    return agriUnitOptions(product, profileBy.get(product.id), apiUnits);
  };

  /**
   * Cheez counter par — teen rukawatein:
   *
   *  1. REGISTRATION KHATAM — ye poochh kar bhi nahi hatti. Beej
   *     (Seed Act) aur zehreeli dawa (Pesticides Ordinance) bina
   *     registration bechna jurm hai; POS ko us me hissa nahi banna.
   *  2. Restricted — license dekh kar aage barh sakte hain.
   *  3. Stock 0 — poochh kar bech sakte hain (maal aa gaya ho magar
   *     chadha na ho, agri me aam baat hai).
   */
  const openProduct = async (product: Product, opts: { allowRestricted?: boolean; oversell?: boolean } = {}) => {
    const row = searchIndex.find((r) => r.p.id === product.id);

    if (row?.blocked) {
      setBlocked({ product, kind: row.kind, text: row.cert.text });
      return;
    }

    if (row?.restricted && !opts.allowRestricted) {
      toast.error(`${product.name} — restricted hai`, {
        description: 'Kharidne wale ka license dekh lein',
        duration: 8000,
        action: { label: 'License dekh liya', onClick: () => openProduct(product, { ...opts, allowRestricted: true }) },
      });
      return;
    }

    if (!opts.oversell && stockOf(product) <= 0) {
      toast.error(`${product.name} — stock 0 hai`, {
        description: 'Maal aa gaya hai magar chadha nahi?',
        duration: 8000,
        action: { label: 'Phir bhi bechein', onClick: () => openProduct(product, { ...opts, oversell: true }) },
      });
      return;
    }

    if (row?.certSoon && !inCartBy.has(product.id)) {
      toast.info(`🛡️ ${product.name} — registration ${row.cert.days} din me khatam`, {
        description: 'Renew karwa lein, warna ye bikna band ho jayegi', duration: 2500,
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
        note: `${combo.items.length} cheezein${combo.savingsAmount > 0 ? ` • bacha ${formatPKR(combo.savingsAmount)}` : ''}`,
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
      if (l.type === 'product' && nextBase > l.baseStock) { toast.error(`Stock sirf ${l.baseStock} ${agriUnitLabel(l.baseUnit)}`); return [l]; }
      return [{ ...l, quantity: nextQty, baseQuantity: nextBase, lineTotal: nextQty * l.unitPrice }];
    }));
  };

  const setQtyDirect = (id: string, qty: number) => {
    setCart((prev) => prev.flatMap((l) => {
      if (l.id !== id) return [l];
      if (qty <= 0) return [];
      const nextBase = qty * l.conversionRate;
      if (l.type === 'product' && nextBase > l.baseStock) { toast.error(`Stock sirf ${l.baseStock} ${agriUnitLabel(l.baseUnit)}`); return [l]; }
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

  /** Unit ke apne barcode se — bori ka apna sticker */
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
      toast.error(`${product.name} — ${unit.unitName} ke liye stock kam (sirf ${stockOf(product)} ${agriUnitLabel(product.unit)})`, {
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
      /* Registration khatam ho to unit ka barcode bhi kaam na kare */
      const row = product ? searchIndex.find((r) => r.p.id === product.id) : undefined;
      if (product && row?.blocked) { setBlocked({ product, kind: row.kind, text: row.cert.text }); return; }
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
    for (const row of searchIndex) {
      const p = row.p;
      /* Jo bik hi nahi sakti wo voice se bhi na aaye */
      if (row.blocked) continue;
      const name = p.name.toLowerCase();
      let score = name === q ? 100 : name.startsWith(q) ? 60 : name.includes(q) ? 40 : 0;
      for (const t of parts) {
        if (t.length < 2) continue;
        if (name.includes(t)) score += 10;
        /* Fasal ya keera bola ho to bhi mil jaye */
        if (row.hay.includes(t)) score += 4;
        if ((p.barcode || '').toLowerCase() === t || (p.sku || '').toLowerCase() === t) score += 50;
      }
      if (score > bestScore) { bestScore = score; best = p; }
    }
    return bestScore >= 20 ? best : null;
  }, [searchIndex]);

  const voiceAdd = async (cmd: Extract<VoiceCommand, { kind: 'add' }>) => {
    const p = findProductVoice(cmd.productQuery);
    if (!p) { toast.error(`🎤 "${cmd.productQuery}" nahi mila`); return; }
    if (stockOf(p) <= 0) { openProduct(p); return; } // rukawat wala raasta
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
      if (voiceMode === 'credit' && !customerId) { toast.error('🎤 Udhaar ke liye pehle farmer chunein'); return; }
      setCheckoutInit({ mode: voiceMode === 'credit' ? 'credit' : 'full' });
      setShowCheckout(true);
      return;
    }
    if (cmd.kind === 'discount') {
      if (cmd.pct) { setDiscountMode('pct'); setDiscountPct(Math.min(cmd.pct, 100)); setDiscountRs(0); toast.success(`🎤 ${cmd.pct}% chhoot`); }
      else if (cmd.rs) { setDiscountMode('rs'); setDiscountRs(cmd.rs); setDiscountPct(0); toast.success(`🎤 Rs ${cmd.rs} chhoot`); }
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
      if (!currentShopId) throw new Error('Pehle dukaan chunein');
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
              note: `Combo ka hissa: ${l.name}`,
            });
          });
        } else if (l.type === 'product' && l.productId) {
          /* Stock product ke apne naap me ghatta hai — 5 kg bika to
             0.1 bori, aur rate bhi usi hisab se per-bori. Yehi wo
             hisab hai jo pehle POS me tha hi nahi. */
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
        shopName: tenant?.name || 'Agri',
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
      queryClient.invalidateQueries({ queryKey: ['products-for-agri-pos'] });
      queryClient.invalidateQueries({ queryKey: ['agri-all-products'] });
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
    if (!currentShopId) { toast.error('Pehle dukaan chunein'); return; }
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
        if (blocked) setBlocked(null);
        else if (showSettings) setShowSettings(false);
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
      showDiscountModal, showSettings, lastSale, blocked, anyModal, barcodeInput,
      openCheckout, instantCash, closeSuccessModal, setViewMode]);

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
          title="Agri scanner" hint="Bori, bottle ya packet ka barcode camera ke samne rakhein" />
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

      {blocked && <BlockedModal info={blocked} onClose={() => setBlocked(null)} />}

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
            if (m === 'pct' ? p > 0 : r > 0) toast.success(`Chhoot: ${m === 'pct' ? p + '%' : formatPKR(r)}`);
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
          <div className="shrink-0 relative overflow-hidden bg-gradient-to-br from-slate-950 via-emerald-900 to-lime-700 text-white">
            <div className="absolute -top-10 -right-10 h-32 w-32 rounded-full bg-lime-400/25 blur-2xl pointer-events-none" />
            <div className="relative px-3 sm:px-4 py-2.5 flex items-center justify-between gap-2">
              <div className="flex items-center gap-2 sm:gap-3 min-w-0">
                <div className="h-10 w-10 sm:h-11 sm:w-11 rounded-2xl bg-white/15 backdrop-blur flex items-center justify-center ring-2 ring-white/20 shrink-0">
                  <Wheat className="h-5 w-5 sm:h-6 sm:w-6" />
                </div>
                <div className="min-w-0">
                  <div className="flex items-center gap-2 flex-wrap">
                    <h2 className="text-base sm:text-lg font-extrabold leading-none">🌾 Agri Counter</h2>
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
                    {counts.legal > 0 && (
                      <button onClick={() => { setViewMode('products'); setKind('legal'); }}
                        className="h-6 px-2 rounded-full bg-rose-500/90 text-white inline-flex items-center gap-1 text-[9px] font-extrabold hover:bg-rose-500 transition">
                        <ShieldAlert className="h-3 w-3" /> {counts.blocked > 0 ? `${counts.blocked} BIK NAHI SAKTI` : `${counts.legal} REG`}
                      </button>
                    )}
                  </div>
                  <p className="text-[11px] sm:text-xs text-white/80 font-semibold mt-0.5 flex items-center gap-1 truncate">
                    <Store className="h-3 w-3 shrink-0" /><span className="truncate">{tenant?.name || 'Agri'}</span>
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
                  className="h-14 sm:h-16 w-full rounded-2xl border-4 border-slate-200 dark:border-slate-700 bg-white dark:bg-slate-800 pl-11 sm:pl-14 pr-10 sm:pr-12 text-lg sm:text-xl font-bold text-slate-900 dark:text-white placeholder:text-slate-400 focus:outline-none focus:border-emerald-500 focus:ring-4 focus:ring-emerald-200 dark:focus:ring-emerald-500/20 transition"
                  placeholder={viewMode === 'products' ? 'Urea, gandum, sundi… (/)' : viewMode === 'combos' ? 'Combo naam…' : 'Quick key…'}
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
                placeholder="Barcode gun ready… (bori, bottle ya combo)"
                className="h-10 sm:h-12 w-full rounded-2xl border-2 border-emerald-300 dark:border-emerald-500/40 bg-emerald-50 dark:bg-emerald-500/10 pl-10 sm:pl-11 pr-3 text-sm sm:text-base font-mono font-extrabold text-emerald-900 dark:text-emerald-200 placeholder:text-emerald-400 focus:outline-none focus:border-emerald-600 focus:ring-2 focus:ring-emerald-200 dark:focus:ring-emerald-500/20" />
            </form>

            {viewMode === 'products' && (
              <>
                {/* Qism — agri ki apni patti */}
                <div className="flex gap-1.5 overflow-x-auto pb-0.5 -mx-1 px-1">
                  <KindBtn on={kind === 'all'} onClick={() => setKind('all')} icon={Grid3x3}
                    label="Sab" n={counts.all} onCls="bg-slate-900 dark:bg-white text-white dark:text-slate-900 border-transparent" />
                  {KIND_TABS.map((t) => (
                    <KindBtn key={t.v} on={kind === t.v} onClick={() => setKind(t.v)} icon={t.icon}
                      label={t.l} n={counts[t.v] ?? 0} onCls={t.on} />
                  ))}
                  {counts.legal > 0 && (
                    <KindBtn on={kind === 'legal'} onClick={() => setKind('legal')} icon={ShieldAlert}
                      label="Registration" n={counts.legal} onCls="bg-rose-600 text-white border-rose-600" />
                  )}
                </div>

                {/* Mausam — season ka maal ek click me */}
                <div className="flex gap-1.5 overflow-x-auto pb-0.5 -mx-1 px-1">
                  <button onClick={() => setSeasonFilter('')}
                    className={`shrink-0 h-9 px-3 rounded-xl text-xs font-extrabold border-2 transition active:scale-95 ${
                      !seasonFilter ? 'bg-emerald-600 text-white border-emerald-600 shadow-md'
                        : 'bg-white dark:bg-slate-800 text-slate-700 dark:text-slate-200 border-slate-200 dark:border-slate-700 hover:border-emerald-300'
                    }`}>Har mausam</button>
                  {AGRI_SEASONS.map((s) => (
                    <button key={s.v} onClick={() => setSeasonFilter(seasonFilter === s.v ? '' : s.v)}
                      className={`shrink-0 h-9 px-3 rounded-xl text-xs font-extrabold border-2 transition active:scale-95 ${
                        seasonFilter === s.v ? 'bg-emerald-600 text-white border-emerald-600 shadow-md'
                          : 'bg-white dark:bg-slate-800 text-slate-700 dark:text-slate-200 border-slate-200 dark:border-slate-700 hover:border-emerald-300'
                      }`}>{s.e} {s.l}</button>
                  ))}
                </div>

                {categories.length > 0 && (
                  <div className="flex gap-1.5 overflow-x-auto pb-1 -mx-1 px-1">
                    <button onClick={() => setCategoryId('')}
                      className={`shrink-0 h-9 px-3 rounded-xl text-xs font-extrabold inline-flex items-center gap-1.5 border-2 transition active:scale-95 ${
                        !categoryId ? 'bg-emerald-600 text-white border-emerald-600 shadow-md' : 'bg-white dark:bg-slate-800 text-slate-700 dark:text-slate-200 border-slate-200 dark:border-slate-700 hover:border-emerald-300'
                      }`}>
                      Sab categories
                    </button>
                    {categories.map((cat) => {
                      const active = categoryId === cat.id;
                      return (
                        <button key={cat.id} onClick={() => setCategoryId(active ? '' : cat.id)}
                          className="shrink-0 h-9 px-3 rounded-xl text-xs font-extrabold inline-flex items-center gap-1.5 border-2 border-slate-200 dark:border-slate-700 bg-white dark:bg-slate-800 transition active:scale-95"
                          style={active ? { backgroundColor: cat.color || '#059669', borderColor: cat.color || '#059669', color: '#fff' } : undefined}>
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
                <PosEmptyState icon={Wheat} title="Kuch nahi mila"
                  hint={search ? `"${search}" ki koi cheez nahi — fasal ya keeray ka naam bhi likh sakte hain`
                    : kind !== 'all' ? 'Is qism me abhi kuch nahi' : 'Pehle maal add karein'}
                  onClear={search || kind !== 'all' || categoryId || seasonFilter
                    ? () => { setSearch(''); setKind('all'); setCategoryId(''); setSeasonFilter(''); } : undefined} />
              ) : (
                <>
                  <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 lg:grid-cols-3 xl:grid-cols-4 2xl:grid-cols-5 gap-2 sm:gap-3">
                    {visibleRows.map((r) => (
                      <AgriTile key={r.p.id} row={r} inCart={inCartBy.get(r.p.id) ?? 0} hidePrices={hidePrices} onClick={() => openProduct(r.p)} />
                    ))}
                  </div>
                  {hasMore && (
                    <button onClick={() => setVisibleCount((c) => c + 60)}
                      className="mt-3 w-full h-12 rounded-2xl bg-white dark:bg-slate-800 border-4 border-slate-200 dark:border-slate-700 hover:border-emerald-400 active:scale-[0.98] text-slate-700 dark:text-slate-200 text-sm font-extrabold inline-flex items-center justify-center gap-2 transition">
                      <Package className="h-4 w-4" /> Aur dikhaein ({filteredRows.length - visibleCount} baqi)
                    </button>
                  )}
                </>
              )
            ) : viewMode === 'combos' ? (
              filteredCombos.length === 0 ? (
                <PosEmptyState icon={Sparkles} title="Koi combo nahi"
                  hint={combos.length === 0 ? 'Urea + DAP, beej + dawa — combo bana lein' : 'Search badal kar dekhein'} />
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
                      <div className="h-1 w-6 rounded-full bg-emerald-500" /> {group}
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
          customerExtra={<FarmerStrip farmer={farmerProfile} hidePrices={hidePrices} />}
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
            className="w-full h-16 rounded-2xl bg-gradient-to-r from-emerald-600 to-lime-700 text-white shadow-2xl active:scale-[0.98] flex items-center justify-between px-5 transition">
            <div className="flex items-center gap-3">
              <div className="relative">
                <ShoppingCart className="h-6 w-6" />
                <span className="absolute -top-2 -right-2 min-w-[22px] h-5 px-1 rounded-full bg-white text-emerald-700 text-[11px] font-extrabold flex items-center justify-center tabular-nums">{itemCount}</span>
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
   AGRI TILE — registration, fasal aur bori/kilo ek nazar me
   ═════════════════════════════════════════════════════════════ */
function AgriTile({ row, inCart, hidePrices, onClick }: {
  row: {
    p: Product; profile?: AgriProductProfile; kind: AgriKind;
    cert: ReturnType<typeof certStatus>;
    blocked: boolean; certSoon: boolean; restricted: boolean;
    packSize: number; packUnit: string; stock: number;
  };
  inCart: number; hidePrices: boolean; onClick: () => void;
}) {
  const { p, profile, kind, cert, blocked, certSoon, restricted, packSize, packUnit, stock } = row;
  const img = p.images?.find((i: any) => i.isPrimary)?.url ?? p.images?.[0]?.url ?? profile?.imageUrls?.[0];
  const out = stock <= 0;
  const low = !out && stock <= Number(profile?.minStockAlert ?? profile?.reorderLevel ?? (p as any).lowStockAlert ?? 5);
  const crops = profile?.targetCrops ?? [];
  const perPack = packSize > 0 ? Number(p.price || 0) / packSize : 0;

  return (
    <button onClick={onClick}
      className={[
        'group relative text-left rounded-2xl bg-white dark:bg-slate-900 border-2 overflow-hidden shadow-sm hover:shadow-lg hover:-translate-y-0.5 active:scale-[0.98] transition-all',
        inCart > 0 ? 'border-emerald-500 ring-2 ring-emerald-200 dark:ring-emerald-500/25'
          : blocked ? 'border-rose-400 dark:border-rose-500/60'
          : certSoon ? 'border-amber-400 dark:border-amber-500/60'
          : 'border-slate-200 dark:border-slate-800 hover:border-emerald-400',
        out || blocked ? 'opacity-70' : '',
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
          <div className="w-full h-full flex items-center justify-center bg-gradient-to-br from-emerald-50 to-lime-100 dark:from-slate-800 dark:to-slate-900">
            <span className="text-4xl drop-shadow-sm">{AGRI_KIND_EMOJI[kind]}</span>
          </div>
        )}

        <div className="absolute top-2 left-2 flex flex-col items-start gap-1">
          {blocked && (
            <span className="text-[9px] font-black uppercase px-1.5 py-0.5 rounded-md bg-rose-600 text-white shadow inline-flex items-center gap-1">
              <ShieldAlert className="h-2.5 w-2.5" /> Reg khatam
            </span>
          )}
          {certSoon && (
            <span className="text-[9px] font-black uppercase px-1.5 py-0.5 rounded-md bg-amber-500 text-white shadow inline-flex items-center gap-1">
              <Calendar className="h-2.5 w-2.5" /> Reg {cert.days}d
            </span>
          )}
          {restricted && (
            <span className="text-[9px] font-black uppercase px-1.5 py-0.5 rounded-md bg-rose-500 text-white shadow">License</span>
          )}
          {profile?.isOrganic && (
            <span className="text-[9px] font-black uppercase px-1.5 py-0.5 rounded-md bg-emerald-600 text-white shadow inline-flex items-center gap-1">
              <Leaf className="h-2.5 w-2.5" /> Organic
            </span>
          )}
        </div>

        {/* Bori wali cheez — kilo ka naap milega */}
        {packSize > 0 && !out && !blocked && (
          <span className="absolute top-2 right-2 text-[9px] font-black px-1.5 py-0.5 rounded-md bg-slate-900/80 text-white shadow backdrop-blur inline-flex items-center gap-1">
            <Scale className="h-2.5 w-2.5" /> {packSize} {packUnit}
          </span>
        )}

        {(out || low) && !blocked && (
          <div className={`absolute inset-x-0 bottom-0 py-0.5 text-center text-[9px] font-extrabold text-white ${out ? 'bg-slate-700' : 'bg-amber-500'}`}>
            {out ? 'STOCK 0' : `SIRF ${Number(stock.toFixed(2))} BACHA`}
          </div>
        )}
        {blocked && (
          <div className="absolute inset-x-0 bottom-0 py-0.5 text-center text-[9px] font-extrabold text-white bg-rose-600">
            BECHNA GHAIR-QANOONI
          </div>
        )}
      </div>

      <div className="p-2.5">
        <div className="font-extrabold text-[13px] text-slate-900 dark:text-white leading-tight line-clamp-2 min-h-[2.1rem]">{p.name}</div>
        {crops.length > 0 && (
          <div className="text-[9px] font-bold text-emerald-700 dark:text-emerald-400 truncate mt-0.5">
            🌾 {crops.slice(0, 2).join(', ')}
          </div>
        )}
        <div className="mt-1 flex items-end justify-between gap-1">
          <div className="min-w-0">
            <div className="text-base font-black text-emerald-600 dark:text-emerald-400 tabular-nums leading-none">
              {hidePrices ? '••••' : formatPKR(p.price)}
            </div>
            <div className="text-[9px] font-bold text-slate-400 mt-0.5 truncate">
              per {agriUnitLabel(p.unit)}
              {!hidePrices && perPack > 0 && ` • ${formatPKR(perPack)}/${packUnit}`}
            </div>
          </div>
          <span className="text-[9px] font-black uppercase px-1.5 py-0.5 rounded-md shrink-0 bg-slate-100 dark:bg-slate-800 text-slate-600 dark:text-slate-300">
            {AGRI_KIND_EMOJI[kind]}
          </span>
        </div>
      </div>
    </button>
  );
}

/* ═════════════════════════════════════════════════════════════
   REGISTRATION KHATAM — ye rukawat poochh kar nahi hatti
   ─────────────────────────────────────────────────────────────
   Baqi har rukawat (stock 0, restricted) toast me "phir bhi bechein"
   ka raasta deti hai. Ye nahi: masla maal ka nahi, qanoon ka hai.
   POS ka kaam dukaan-daar ko jurmane se bachana hai.
   ═════════════════════════════════════════════════════════════ */
function BlockedModal({ info, onClose }: {
  info: { product: Product; kind: AgriKind; text: string }; onClose: () => void;
}) {
  const { product, kind, text } = info;
  const seed = isSeedKind(kind);

  useEffect(() => {
    const prev = document.body.style.overflow;
    document.body.style.overflow = 'hidden';
    return () => { document.body.style.overflow = prev; };
  }, []);

  return (
    <div className="fixed inset-0 z-[60] bg-slate-950/70 backdrop-blur-sm flex items-end sm:items-center justify-center p-0 sm:p-4" onClick={onClose}>
      <div className="w-full sm:max-w-md bg-white dark:bg-slate-900 rounded-t-3xl sm:rounded-3xl shadow-2xl overflow-hidden"
        onClick={(e) => e.stopPropagation()}>
        <div className="px-5 py-4 bg-gradient-to-br from-rose-600 to-red-700 text-white flex items-center gap-3">
          <div className="h-12 w-12 rounded-2xl bg-white/20 flex items-center justify-center shrink-0">
            <ShieldAlert className="h-6 w-6" />
          </div>
          <div className="min-w-0">
            <div className="text-[10px] uppercase tracking-widest font-extrabold text-white/80">
              Ye cheez bechi nahi ja sakti
            </div>
            <h3 className="font-extrabold text-lg truncate">{product.name}</h3>
          </div>
        </div>

        <div className="p-5 space-y-4">
          <div className="rounded-2xl bg-rose-50 dark:bg-rose-500/10 border-2 border-rose-200 dark:border-rose-500/30 p-3">
            <p className="text-[13px] font-extrabold text-rose-900 dark:text-rose-200">{text}</p>
            <p className="text-[12px] font-bold text-rose-800 dark:text-rose-300 mt-1.5 leading-relaxed">
              {seed
                ? 'Seed Act ke tehat bina registration beej bechna ghair-qanooni hai.'
                : 'Agricultural Pesticides Ordinance ke tehat bina registration zehreeli dawa bechna ghair-qanooni hai.'}
              {' '}Inspector aaye to jurmana ho sakta hai aur stock zabt bhi.
            </p>
          </div>

          <div className="rounded-2xl bg-slate-50 dark:bg-slate-800 border-2 border-slate-200 dark:border-slate-700 p-3">
            <div className="text-[10px] font-black uppercase tracking-widest text-slate-500 mb-1">Kya karna hai</div>
            <ol className="space-y-1 text-[12px] font-bold text-slate-700 dark:text-slate-200">
              <li>1. Registration renew karwayein</li>
              <li>2. Nayi tareekh product me bhar dein</li>
              <li>3. Phir ye POS par khud chalne lagegi</li>
            </ol>
          </div>

          <div className="flex gap-2">
            <button onClick={onClose}
              className="flex-1 h-11 rounded-xl bg-slate-100 dark:bg-slate-800 hover:bg-slate-200 dark:hover:bg-slate-700 text-slate-700 dark:text-slate-200 text-sm font-extrabold transition">
              Theek hai
            </button>
            <Link to={`/agri-products/${product.id}/edit`}
              className="flex-1 h-11 rounded-xl bg-emerald-600 hover:bg-emerald-700 text-white text-sm font-extrabold inline-flex items-center justify-center gap-1.5 transition">
              <Calendar className="h-4 w-4" /> Tareekh theek karein
            </Link>
          </div>
        </div>
      </div>
    </div>
  );
}

function KindBtn({ on, onClick, icon: Icon, label, n, onCls }: any) {
  return (
    <button onClick={onClick}
      className={`shrink-0 h-9 sm:h-10 px-3 rounded-xl text-xs sm:text-sm font-extrabold inline-flex items-center gap-1.5 border-2 transition active:scale-95 ${
        on ? `${onCls} shadow-md` : 'bg-white dark:bg-slate-800 text-slate-700 dark:text-slate-200 border-slate-200 dark:border-slate-700 hover:border-emerald-300'
      }`}>
      <Icon className="h-3.5 w-3.5" /> {label}
      <span className={`px-1.5 rounded-md text-[10px] tabular-nums ${on ? 'bg-white/20' : 'bg-slate-100 dark:bg-slate-700'}`}>{n}</span>
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

/* ═════════════════════════════════════════════════════════════
   FARMER KI PATTI — customer ke theek neeche
   ─────────────────────────────────────────────────────────────
   Counter par dukaan-daar "customer" nahi sochta, "farmer" sochta
   hai: kaun sa gaon, kitni zameen, kitna udhaar de sakte hain.
   Cart panel shared hai (hold, discount, delivery sab usi se aate
   hain), is liye us me ghusne ke bajaye ye patti us ke slot me
   chali jati hai.
   ═════════════════════════════════════════════════════════════ */
function FarmerStrip({ farmer, hidePrices }: { farmer: any; hidePrices: boolean }) {
  if (!farmer) return null;

  const limit = Number(farmer.creditLimit || 0);
  const owed = Number(farmer.currentBalance || 0);
  const left = Math.max(limit - owed, 0);
  const overLimit = limit > 0 && owed >= limit;

  return (
    <div className="mt-2 rounded-2xl bg-emerald-50 dark:bg-emerald-500/10 border-2 border-emerald-200 dark:border-emerald-500/30 p-2.5">
      <div className="flex items-start gap-2">
        <span className="h-8 w-8 rounded-xl bg-emerald-600 text-white flex items-center justify-center shrink-0">
          <Tractor className="h-4 w-4" />
        </span>
        <div className="min-w-0 flex-1">
          <div className="flex items-center gap-1.5 flex-wrap">
            <span className="font-mono text-[10px] font-black text-emerald-700 dark:text-emerald-300">
              {farmer.farmerNumber}
            </span>
            {farmer.status && farmer.status !== 'ACTIVE' && (
              <span className="text-[9px] font-black uppercase px-1.5 py-0.5 rounded bg-rose-600 text-white">
                {farmer.status}
              </span>
            )}
          </div>
          <div className="text-[11px] font-bold text-slate-600 dark:text-slate-300 truncate">
            {[farmer.village, farmer.district].filter(Boolean).join(', ') || 'Gaon nahi likha'}
            {farmer.landAreaAcres ? ` · ${farmer.landAreaAcres} acre` : ''}
          </div>
          {(farmer.primaryCrops ?? []).length > 0 && (
            <div className="text-[10px] font-bold text-emerald-700 dark:text-emerald-400 truncate">
              🌾 {(farmer.primaryCrops as string[]).slice(0, 3).join(', ')}
            </div>
          )}
        </div>
      </div>

      {limit > 0 && !hidePrices && (
        <div className={`mt-2 rounded-xl px-2 py-1.5 text-[11px] font-extrabold ${
          overLimit
            ? 'bg-rose-100 dark:bg-rose-500/20 text-rose-800 dark:text-rose-300'
            : 'bg-white dark:bg-slate-800 text-slate-700 dark:text-slate-200'
        }`}>
          {overLimit
            ? `Udhaar ki hadd poori ho chuki — ${formatPKR(owed)} / ${formatPKR(limit)}`
            : `Aur ${formatPKR(left)} tak udhaar de sakte hain (hadd ${formatPKR(limit)})`}
        </div>
      )}
    </div>
  );
}
