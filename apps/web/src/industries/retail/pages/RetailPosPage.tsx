import { useState, useMemo, useEffect, useRef, useCallback } from 'react';
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
import type { Product } from '@modules/inventory/products/api/products.api';
import BarcodeScanner from '@core/components/barcode/BarcodeScanner';
import { productUnitsApi } from '../api/product-units.api';
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

const HIDE_PRICES_KEY = 'nafaa.retail-pos.hide-prices';
const AUTO_CLOSE_KEY = 'nafaa.retail-pos.auto-close-success';
const VIEW_MODE_KEY = 'nafaa.retail-pos.view-mode';
const AUTO_PRINT_KEY = 'nafaa.retail-pos.auto-print';       // 🖨️ default ON
const PRINTER_WIDTH_KEY = 'nafaa.retail-pos.printer-width'; // '80' | '58'

type ViewMode = 'products' | 'combos' | 'quickkeys';
type DiscountMode = 'pct' | 'rs';
type CheckoutMode = 'full' | 'partial' | 'credit';

interface UnitOption {
  id: string; unitName: string; label: string; emoji: string;
  conversionRate: number; price: number;
  wholesalePrice?: number | null; isBase?: boolean;
}

interface CartLine {
  id: string; type: 'product' | 'combo';
  productId?: string; comboId?: string;
  name: string; image?: string;
  unitName: string; unitLabel: string; emoji: string;
  unitPrice: number; basePrice: number;
  quantity: number; baseQuantity: number;
  conversionRate: number; baseUnit: string; baseStock: number;
  lineTotal: number; note?: string;
  comboItems?: any[]; savings?: number;
}

interface HeldCart { id: string; lines: CartLine[]; customerId: string; total: number; heldAt: number; }

const lineId = () => `l-${Date.now()}-${Math.random().toString(36).slice(2, 7)}`;
const heldId = () => `h-${Date.now()}-${Math.random().toString(36).slice(2, 7)}`;

const UNIT_EMOJI: Record<string, string> = {
  kg: '⚖️', gram: '⚖️', g: '⚖️', liter: '🧴', ml: '🧴',
  pcs: '🔢', piece: '🔢', box: '📦', carton: '📦',
  dozen: '🥚', packet: '🎁', bag: '🛍️', bottle: '🍾', meter: '📏', feet: '📏',
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

const escapeHtml = (s: string) =>
  String(s ?? '').replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;');

function deriveUnits(product: Product, apiUnits: any[]): UnitOption[] {
  const base = (product.unit || 'pcs').toLowerCase();
  const out: UnitOption[] = [{
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

/* ═══ 🖨️ DIRECT THERMAL PRINT — receipt page ke bina! ═══ */
interface PrintPayload {
  saleNumber: string;
  date: Date;
  shopName: string;
  shopPhone?: string;
  shopAddress?: string;
  customerName?: string;
  lines: Array<{ name: string; qty: number; unit: string; price: number; total: number }>;
  subtotal: number;
  discount: number;
  total: number;
  paid: number;
  paymentLabel: string;
}

/* Decorative barcode (scannable nahi — sirf look) */
function pseudoBarcode(seed: string): string {
  let bars = '';
  for (let i = 0; i < seed.length * 3; i++) {
    const code = seed.charCodeAt(i % seed.length) + i;
    const w = 1 + (code % 3);
    bars += `<span style="display:inline-block;width:${w}px;height:34px;background:#000;margin-right:${1 + (code % 2)}px;"></span>`;
  }
  return bars;
}

function printReceiptDirect(p: PrintPayload, widthMm: '80' | '58'): boolean {
  const w = window.open('', '_blank', `width=${widthMm === '80' ? 400 : 330},height=700`);
  if (!w) return false;

  const itemsHtml = p.lines.map((l, i) => `
    <div class="item">
      <div class="iname">${i + 1}. ${escapeHtml(l.name)}</div>
      <div class="irow">
        <span class="iqty">${l.qty} ${escapeHtml(l.unit)} × ${formatPKR(l.price)}</span>
        <span class="iamt">${formatPKR(l.total)}</span>
      </div>
    </div>`).join('');

  const html = `<!doctype html>
<html><head><meta charset="utf-8"/><title>${p.saleNumber}</title>
<style>
  @page { size: ${widthMm}mm auto; margin: 0; }
  * { box-sizing: border-box; margin: 0; padding: 0; }
  html, body { width: ${widthMm}mm; }
  body {
    font-family: 'Courier New', monospace;
    padding: ${widthMm === '80' ? '4mm 3mm' : '3mm 2mm'};
    color: #000;
    font-size: ${widthMm === '80' ? '12px' : '10px'};
    line-height: 1.35;
    background: #fff;
  }
  .c { text-align: center; }
  .b { font-weight: 700; }
  .shop { font-size: ${widthMm === '80' ? '17px' : '14px'}; font-weight: 800; letter-spacing: 0.5px; }
  .sub { font-size: ${widthMm === '80' ? '9px' : '8px'}; margin-top: 1px; }
  .div { border-top: 1px dashed #000; margin: 6px 0; }
  .dbl { border-top: 2px solid #000; margin: 6px 0; }
  .row { display: flex; justify-content: space-between; gap: 6px; margin: 2px 0; }
  .row .v { text-align: right; font-weight: 700; }
  .item { margin: 3px 0; }
  .iname { font-weight: 700; word-break: break-word; }
  .irow { display: flex; justify-content: space-between; font-size: ${widthMm === '80' ? '11px' : '9px'}; }
  .iamt { font-weight: 800; }
  .total-row { display: flex; justify-content: space-between; font-size: ${widthMm === '80' ? '17px' : '14px'}; font-weight: 800; margin: 4px 0; }
  .barcode { text-align: center; margin: 8px 0 2px; letter-spacing: 1px; }
  .barnum { font-size: 9px; font-weight: 700; margin-top: 2px; }
  .thanks { font-size: ${widthMm === '80' ? '10px' : '9px'}; margin-top: 6px; }
</style></head><body>
  <div class="c shop">${escapeHtml(p.shopName)}</div>
  ${p.shopAddress ? `<div class="c sub">${escapeHtml(p.shopAddress)}</div>` : ''}
  ${p.shopPhone ? `<div class="c sub">Ph: ${escapeHtml(p.shopPhone)}</div>` : ''}
  <div class="div"></div>
  <div class="row"><span>RECEIPT</span><span class="v">${escapeHtml(p.saleNumber)}</span></div>
  <div class="row"><span>DATE</span><span class="v">${p.date.toLocaleString('en-PK', { dateStyle: 'short', timeStyle: 'short' })}</span></div>
  ${p.customerName ? `<div class="row"><span>CUSTOMER</span><span class="v">${escapeHtml(p.customerName)}</span></div>` : ''}
  <div class="div"></div>
  ${itemsHtml}
  <div class="div"></div>
  <div class="row"><span>Items</span><span class="v">${p.lines.length}</span></div>
  ${p.discount > 0 ? `
    <div class="row"><span>Subtotal</span><span class="v">${formatPKR(p.subtotal)}</span></div>
    <div class="row"><span>Discount</span><span class="v">−${formatPKR(p.discount)}</span></div>
  ` : ''}
  <div class="dbl"></div>
  <div class="total-row"><span>TOTAL</span><span>${formatPKR(p.total)}</span></div>
  <div class="row"><span>${escapeHtml(p.paymentLabel)}</span><span class="v">${formatPKR(p.paid)}</span></div>
  ${p.paid > p.total ? `<div class="row b"><span>CHANGE (wapis dein)</span><span class="v">${formatPKR(p.paid - p.total)}</span></div>` : ''}
  ${p.paid < p.total ? `<div class="row b"><span>UDHAAR (baqi)</span><span class="v">${formatPKR(p.total - p.paid)}</span></div>` : ''}
  <div class="div"></div>
  <div class="barcode">${pseudoBarcode(p.saleNumber)}<div class="barnum">${escapeHtml(p.saleNumber)}</div></div>
  <div class="div"></div>
  <div class="c thanks">Shukriya! Phir tashreef laiye.</div>
  <div class="c sub" style="margin-top:2px;">Powered by Nafaa POS</div>
  <script>
    window.onload = function() {
      setTimeout(function() {
        window.print();
        setTimeout(function() { window.close(); }, 600);
      }, 150);
    };
  </script>
</body></html>`;

  w.document.open();
  w.document.write(html);
  w.document.close();
  return true;
}

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

function unitKeyOf(unitName: string): string {
  const u = (unitName || '').toLowerCase();
  if (['kg', 'kilo', 'kilogram'].includes(u)) return 'kg';
  if (['g', 'gram', 'grams'].includes(u)) return 'gram';
  if (['l', 'liter', 'litre'].includes(u)) return 'liter';
  if (u === 'ml') return 'ml';
  if (u === 'dozen') return 'dozen';
  if (['packet', 'pack'].includes(u)) return 'packet';
  if (u === 'box') return 'box';
  if (u === 'carton') return 'carton';
  if (u === 'bag') return 'bag';
  return u;
}

export default function RetailPosPage() {
  const queryClient = useQueryClient();
  const currentShopId = useShopParam();
  const tenant = useAuthStore((s) => s.tenant);
  const shopPhone = useAuthStore((s: any) => s.user?.assignedShop?.phone || s.tenant?.phone || '');
  const shopAddress = useAuthStore((s: any) => s.user?.assignedShop?.address || s.tenant?.address || '');

  const [hidePrices, setHidePrices] = useState(() => localStorage.getItem(HIDE_PRICES_KEY) === 'true');
  const [autoClose, setAutoClose] = useState(() => localStorage.getItem(AUTO_CLOSE_KEY) !== 'false');
  const [autoPrint, setAutoPrint] = useState(() => localStorage.getItem(AUTO_PRINT_KEY) !== 'false');
  const [printerWidth, setPrinterWidth] = useState<'80' | '58'>(() => (localStorage.getItem(PRINTER_WIDTH_KEY) as '80' | '58') || '80');
  const [viewMode, setViewMode] = useState<ViewMode>(() => (localStorage.getItem(VIEW_MODE_KEY) as ViewMode) || 'products');

  const [search, setSearch] = useState('');
  const [debouncedSearch, setDebouncedSearch] = useState('');
  const [categoryId, setCategoryId] = useState('');
  const [cart, setCart] = useState<CartLine[]>([]);
  const [customerId, setCustomerId] = useState('');

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
  const [showCustomerAdd, setShowCustomerAdd] = useState(false);
  const [showHeldCarts, setShowHeldCarts] = useState(false);
  const [showMobileCart, setShowMobileCart] = useState(false);
  const [showTeacher, setShowTeacher] = useState(false);
  const [showSettings, setShowSettings] = useState(false);
  const [heldCarts, setHeldCarts] = useState<HeldCart[]>([]);
  const [newCustomer, setNewCustomer] = useState({ name: '', phone: '' });
  const [lastSale, setLastSale] = useState<{
    id: string; number: string; change: number; total: number; deposited: boolean;
    printPayload: PrintPayload;
  } | null>(null);
  const [visibleCount, setVisibleCount] = useState(60);
  const [isOnline, setIsOnline] = useState(navigator.onLine);

  const barcodeRef = useRef<HTMLInputElement>(null);
  const scrollRef = useRef<HTMLDivElement>(null);
  const successTimerRef = useRef<any>(null);

  useEffect(() => { localStorage.setItem(HIDE_PRICES_KEY, String(hidePrices)); }, [hidePrices]);
  useEffect(() => { localStorage.setItem(AUTO_CLOSE_KEY, String(autoClose)); }, [autoClose]);
  useEffect(() => { localStorage.setItem(AUTO_PRINT_KEY, String(autoPrint)); }, [autoPrint]);
  useEffect(() => { localStorage.setItem(PRINTER_WIDTH_KEY, printerWidth); }, [printerWidth]);
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
    queryFn: () => productsApi.list({ page: 1, limit: 2000 }),
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

  const products: Product[] = productsData?.items ?? [];
  const customers = customersData?.items ?? [];
  const selectedCustomer = customers.find((c: any) => c.id === customerId);

  const filteredProducts = useMemo(() => {
    let list = products.filter((p) => p.isActive !== false);
    if (categoryId) list = list.filter((p) => p.categoryId === categoryId);
    const q = debouncedSearch.toLowerCase().trim();
    if (q) {
      list = list.filter((p) =>
        p.name.toLowerCase().includes(q) || (p.sku || '').toLowerCase().includes(q) || (p.barcode || '').toLowerCase().includes(q));
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

  const visibleProducts = useMemo(() => filteredProducts.slice(0, visibleCount), [filteredProducts, visibleCount]);
  const hasMore = filteredProducts.length > visibleCount;

  const categoryCounts = useMemo(() => {
    const counts: Record<string, number> = {};
    products.forEach((p) => { if (p.categoryId) counts[p.categoryId] = (counts[p.categoryId] || 0) + 1; });
    return counts;
  }, [products]);

  const subtotal = useMemo(() => cart.reduce((s, l) => s + l.lineTotal, 0), [cart]);
  const discountAmount = useMemo(() =>
    discountMode === 'pct' ? (subtotal * discountPct) / 100 : Math.min(Number(discountRs || 0), subtotal),
    [subtotal, discountPct, discountRs, discountMode]);
  const total = useMemo(() => Math.max(subtotal - discountAmount, 0), [subtotal, discountAmount]);
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
    let apiUnits: any[] = [];
    try {
      const res = await productUnitsApi.byProduct(product.id);
      apiUnits = Array.isArray(res) ? res : ((res as any)?.items ?? []);
    } catch {}
    const units = deriveUnits(product, apiUnits);
    const baseUnit = units[0];
    if (units.length > 1) { setUnitPicker({ product, units }); return; }
    if (isWeightUnit(baseUnit.unitName)) { setWeightModal({ product, unit: baseUnit }); return; }
    addProductLine(product, baseUnit, 1);
  }, [addProductLine]);

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
  const clearCart = useCallback(() => { setCart([]); setCustomerId(''); setDiscountPct(0); setDiscountRs(0); }, []);

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
    const units = deriveUnits(p, apiUnits);
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
        items,
      });
    },
    onSuccess: (sale: any, vars: any) => {
      const change = Math.max(vars.paidAmount - total, 0);
      const payLabel = PAYMENT_METHODS.find((m) => m.id === vars.paymentMethod)?.label || vars.paymentMethod;

      /* 🖨️ Snapshot for print — cart clear hone se PEHLE */
      const printPayload: PrintPayload = {
        saleNumber: sale.saleNumber || 'N/A',
        date: new Date(),
        shopName: tenant?.name || 'My Shop',
        shopPhone, shopAddress,
        customerName: selectedCustomer?.name,
        lines: cart.map((l) => ({
          name: l.name, qty: l.quantity, unit: l.unitName, price: l.unitPrice, total: l.lineTotal,
        })),
        subtotal, discount: discountAmount, total,
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
      setVisibleCount((c) => Math.min(c + 60, filteredProducts.length));
    }
  }, [hasMore, filteredProducts.length, viewMode]);

  const isLoading = viewMode === 'products' ? loadingProducts : viewMode === 'combos' ? loadingCombos : false;

  return (
    <>
      {scannerOpen && <BarcodeScanner onDetected={handleBarcode} onClose={() => setScannerOpen(false)} />}

      {unitPicker && (
        <UnitPickerModal
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
        <WeighSaleModal
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
        <CheckoutModal
          total={total}
          itemCount={itemCount}
          loading={checkoutMutation.isPending}
          customerName={selectedCustomer?.name}
          customerBalance={Number(selectedCustomer?.balance || 0)}
          hasCustomer={!!customerId}
          initMode={checkoutInit.mode}
          initAmount={checkoutInit.amount}
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
        <DiscountModal
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
        <div className="fixed inset-0 z-50 bg-slate-950/80 backdrop-blur-sm flex items-center justify-center p-4" onClick={closeSuccessModal}>
          <div className="w-full max-w-md bg-white dark:bg-slate-900 rounded-3xl shadow-2xl overflow-hidden animate-in fade-in zoom-in duration-150" onClick={(e) => e.stopPropagation()}>
            <div className="relative px-6 py-6 bg-gradient-to-br from-emerald-500 to-green-600 text-white text-center">
              <button onClick={closeSuccessModal} className="absolute top-3 right-3 h-10 w-10 rounded-2xl bg-white/20 hover:bg-white/30 active:scale-90 flex items-center justify-center transition">
                <X className="h-5 w-5" />
              </button>
              <div className="h-16 w-16 rounded-full bg-white/20 mx-auto flex items-center justify-center mb-2">
                <CheckCircle2 className="h-10 w-10" />
              </div>
              <h3 className="text-2xl font-extrabold">Sale Ho Gayi! 🎉</h3>
              <p className="text-xs font-bold text-white/90 mt-0.5 font-mono">{lastSale.number}</p>
              {autoPrint && (
                <p className="text-[10px] font-bold text-emerald-100 mt-1 inline-flex items-center gap-1">
                  <Printer className="h-3 w-3" /> Receipt auto-print ho rahi hai
                </p>
              )}
            </div>
            {lastSale.change > 0 && (
              <div className={[
                'px-6 py-4 border-b-4 text-center',
                lastSale.deposited
                  ? 'bg-violet-50 dark:bg-violet-500/15 border-violet-200 dark:border-violet-500/30'
                  : 'bg-amber-50 dark:bg-amber-500/15 border-amber-200 dark:border-amber-500/30',
              ].join(' ')}>
                <div className={['text-xs uppercase font-extrabold tracking-wider',
                  lastSale.deposited ? 'text-violet-800 dark:text-violet-300' : 'text-amber-800 dark:text-amber-300'].join(' ')}>
                  {lastSale.deposited ? '📔 Khaate mein jama ho gaya' : 'Customer ko wapis dein'}
                </div>
                <div className={['text-4xl font-extrabold tabular-nums mt-1',
                  lastSale.deposited ? 'text-violet-700 dark:text-violet-300' : 'text-amber-700 dark:text-amber-300'].join(' ')}>
                  {formatPKR(lastSale.change)}
                </div>
              </div>
            )}
            <div className="p-3 grid grid-cols-2 gap-2">
              <button
                onClick={() => printReceiptDirect(lastSale.printPayload, printerWidth)}
                className="h-14 rounded-2xl bg-slate-100 dark:bg-slate-800 hover:bg-slate-200 dark:hover:bg-slate-700 active:scale-95 font-extrabold text-slate-700 dark:text-slate-200 transition inline-flex items-center justify-center gap-2">
                <Printer className="h-5 w-5" /> Print Again
              </button>
              <button onClick={closeSuccessModal} className="h-14 rounded-2xl bg-gradient-to-r from-sky-600 to-cyan-600 hover:from-sky-700 hover:to-cyan-700 active:scale-95 font-extrabold text-white text-lg shadow-lg transition inline-flex items-center justify-center gap-2">
                Nayi Sale <ArrowRight className="h-5 w-5" />
              </button>
            </div>
            {autoClose && (
              <div className="px-4 pb-2.5 text-center text-[10px] font-bold text-slate-400 dark:text-slate-500">
                ⏱️ 3 sec me khud band — click karo foran band karne ke liye
              </div>
            )}
          </div>
        </div>
      )}

      {/* 👤 CUSTOMER ADD */}
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

      {/* ⏸️ HELD CARTS */}
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
              <ViewTab active={viewMode === 'products'} onClick={() => setViewMode('products')} icon={Package} label="Products" count={products.length} color="sky" shortcut="F7" />
              <ViewTab active={viewMode === 'combos'} onClick={() => setViewMode('combos')} icon={Sparkles} label="Combos" count={combos.length} color="violet" shortcut="F8" highlight={combos.length > 0} />
              <ViewTab active={viewMode === 'quickkeys'} onClick={() => setViewMode('quickkeys')} icon={Zap} label="Quick" count={quickKeys.length} color="amber" shortcut="F10" />
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
          cart={cart} itemCount={itemCount} totalQty={totalQty}
          subtotal={subtotal} total={total} totalSavings={totalSavings}
          discountMode={discountMode} discountPct={discountPct}
          discountRs={Number(discountRs) || 0} discountAmount={discountAmount}
          onOpenDiscount={() => setShowDiscountModal(true)}
          onClearDiscount={() => { setDiscountPct(0); setDiscountRs(0); }}
          hidePrices={hidePrices}
          customers={customers} customerId={customerId} setCustomerId={setCustomerId}
          selectedCustomer={selectedCustomer}
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

/* ═════════════════════════════════════════════════════════════
   ⚙️ POS SETTINGS MODAL
   ═════════════════════════════════════════════════════════════ */
function PosSettingsModal({ autoPrint, setAutoPrint, autoClose, setAutoClose, printerWidth, setPrinterWidth, onClose }: any) {
  return (
    <div className="fixed inset-0 z-50 bg-slate-950/80 backdrop-blur-sm flex items-center justify-center p-4" onClick={onClose}>
      <div className="w-full max-w-md bg-white dark:bg-slate-900 rounded-3xl shadow-2xl overflow-hidden" onClick={(e) => e.stopPropagation()}>
        <div className="px-5 py-4 bg-gradient-to-br from-slate-900 to-slate-700 text-white flex items-center justify-between">
          <div className="flex items-center gap-2">
            <Settings2 className="h-6 w-6" />
            <h3 className="font-extrabold text-xl">POS Settings</h3>
          </div>
          <button onClick={onClose} className="h-11 w-11 rounded-2xl bg-white/15 hover:bg-white/25 active:scale-95 flex items-center justify-center">
            <X className="h-5 w-5" />
          </button>
        </div>
        <div className="p-5 space-y-4">
          {/* Auto print */}
          <div className="rounded-2xl border-2 border-sky-200 dark:border-sky-500/40 bg-sky-50 dark:bg-sky-500/10 p-4">
            <div className="flex items-center justify-between gap-3">
              <div className="flex items-center gap-3 min-w-0">
                <div className="h-11 w-11 rounded-xl bg-gradient-to-br from-sky-500 to-blue-600 text-white flex items-center justify-center shadow-md shrink-0">
                  <Printer className="h-5 w-5" />
                </div>
                <div className="min-w-0">
                  <div className="font-extrabold text-slate-900 dark:text-white text-sm">🖨️ Auto-Print Receipt</div>
                  <div className="text-[11px] text-slate-600 dark:text-slate-300 font-semibold">Sale hote hi print dialog — receipt page nahi khulega</div>
                </div>
              </div>
              <button
                onClick={() => setAutoPrint(!autoPrint)}
                className={['shrink-0 w-14 h-8 rounded-full transition relative',
                  autoPrint ? 'bg-emerald-500' : 'bg-slate-300 dark:bg-slate-700'].join(' ')}>
                <span className={['absolute top-1 h-6 w-6 rounded-full bg-white shadow transition-all',
                  autoPrint ? 'left-7' : 'left-1'].join(' ')} />
              </button>
            </div>
            {autoPrint && (
              <div className="mt-3 pt-3 border-t border-sky-200 dark:border-sky-500/30">
                <div className="text-[10px] uppercase font-extrabold text-sky-700 dark:text-sky-300 tracking-wider mb-1.5">Printer width</div>
                <div className="grid grid-cols-2 gap-1.5">
                  {(['80', '58'] as const).map((w) => (
                    <button key={w} onClick={() => setPrinterWidth(w)}
                      className={['h-10 rounded-xl text-sm font-extrabold transition border-2',
                        printerWidth === w
                          ? 'bg-sky-600 border-sky-600 text-white shadow-md'
                          : 'bg-white dark:bg-slate-800 border-slate-200 dark:border-slate-700 text-slate-700 dark:text-slate-200'].join(' ')}>
                      {w}mm {w === '80' ? '(standard)' : '(chhota)'}
                    </button>
                  ))}
                </div>
              </div>
            )}
          </div>

          {/* Auto close */}
          <div className="rounded-2xl border-2 border-slate-200 dark:border-slate-700 bg-white dark:bg-slate-800/60 p-4">
            <div className="flex items-center justify-between gap-3">
              <div className="flex items-center gap-3 min-w-0">
                <div className="h-11 w-11 rounded-xl bg-gradient-to-br from-emerald-500 to-green-600 text-white flex items-center justify-center shadow-md shrink-0">
                  <CheckCircle2 className="h-5 w-5" />
                </div>
                <div className="min-w-0">
                  <div className="font-extrabold text-slate-900 dark:text-white text-sm">✅ Success Auto-Close</div>
                  <div className="text-[11px] text-slate-600 dark:text-slate-300 font-semibold">Sale ke baad modal 3 sec me khud band</div>
                </div>
              </div>
              <button
                onClick={() => setAutoClose(!autoClose)}
                className={['shrink-0 w-14 h-8 rounded-full transition relative',
                  autoClose ? 'bg-emerald-500' : 'bg-slate-300 dark:bg-slate-700'].join(' ')}>
                <span className={['absolute top-1 h-6 w-6 rounded-full bg-white shadow transition-all',
                  autoClose ? 'left-7' : 'left-1'].join(' ')} />
              </button>
            </div>
          </div>

          <div className="rounded-xl bg-slate-50 dark:bg-slate-800/60 border border-slate-200 dark:border-slate-700 p-3 text-[11px] font-semibold text-slate-600 dark:text-slate-300">
            💡 <strong>Popup blocked?</strong> Browser ke address bar me 🔒 icon pe click → "Pop-ups and redirects" → Allow. Tabhi auto-print chalega.
          </div>
        </div>
      </div>
    </div>
  );
}

/* ═════════════════════════════════════════════════════════════
   💳 CHECKOUT MODAL
   ═════════════════════════════════════════════════════════════ */
const PAYMENT_METHODS: { id: PaymentMethod; label: string; icon: any; bg: string }[] = [
  { id: 'CASH',          label: 'Cash',      icon: Banknote,   bg: 'from-emerald-500 to-green-600' },
  { id: 'JAZZCASH',      label: 'JazzCash',  icon: Smartphone, bg: 'from-orange-500 to-orange-600' },
  { id: 'EASYPAISA',     label: 'EasyPaisa', icon: Zap,        bg: 'from-green-500 to-lime-600' },
  { id: 'CARD',          label: 'Card',      icon: CreditCard, bg: 'from-blue-500 to-blue-700' },
  { id: 'BANK_TRANSFER', label: 'Bank',      icon: Building2,  bg: 'from-violet-500 to-purple-700' },
];
const QUICK_AMOUNTS = [100, 200, 500, 1000, 2000, 5000];

function CheckoutModal({ total, itemCount, loading, customerName, customerBalance = 0, hasCustomer, initMode, initAmount, onConfirm, onClose }: {
  total: number; itemCount: number; loading?: boolean;
  customerName?: string; customerBalance?: number; hasCustomer?: boolean;
  initMode: CheckoutMode; initAmount?: number;
  onConfirm: (d: { paymentMethod: PaymentMethod; paidAmount: number; isCredit: boolean; depositExtra: boolean }) => void;
  onClose: () => void;
}) {
  const [paymentMethod, setPaymentMethod] = useState<PaymentMethod>('CASH');
  const [paidStr, setPaidStr] = useState<string>(initAmount ? String(initAmount) : '');
  const [mode, setMode] = useState<CheckoutMode>(initMode);
  const [depositExtra, setDepositExtra] = useState(false);

  const paid = mode === 'credit' ? 0 : mode === 'full' ? total : Number(paidStr) || 0;
  const change = Math.max(paid - total, 0);
  const creditAmount = Math.max(total - paid, 0);
  const isCredit = creditAmount > 0;

  useEffect(() => {
    if (mode === 'full') setPaidStr(String(total));
  }, [mode, total]);

  const submit = useCallback(() => {
    if (isCredit && !hasCustomer) { toast.error('Udhaar ke liye customer select karein'); return; }
    if (loading) return;
    onConfirm({ paymentMethod, paidAmount: mode === 'credit' ? 0 : paid, isCredit, depositExtra: depositExtra && change > 0 });
  }, [isCredit, hasCustomer, loading, onConfirm, paymentMethod, mode, paid, depositExtra, change]);

  useEffect(() => {
    const handler = (e: KeyboardEvent) => {
      if (e.key === 'Enter') { e.preventDefault(); submit(); }
      if (e.key === 'Escape') onClose();
      if (e.key === 'F1') { e.preventDefault(); setPaymentMethod('CASH'); }
      if (e.key === 'F3') { e.preventDefault(); setPaymentMethod('JAZZCASH'); }
      if (e.key === 'F4') { e.preventDefault(); setPaymentMethod('EASYPAISA'); }
      if (e.key === 'F5') { e.preventDefault(); setPaymentMethod('CARD'); }
      if (e.key === 'F6') { e.preventDefault(); if (hasCustomer) setMode('credit'); }
    };
    window.addEventListener('keydown', handler);
    return () => window.removeEventListener('keydown', handler);
  }, [submit, onClose, hasCustomer]);

  const addAmount = (amt: number) => { setMode('partial'); setPaidStr(String((Number(paidStr) || 0) + amt)); };
  const setExact = (amt: number) => { setMode('partial'); setPaidStr(String(amt)); };

  const numpad = (k: string) => {
    setMode('partial');
    if (k === 'C') return setPaidStr('');
    if (k === '⌫') return setPaidStr((v) => v.slice(0, -1));
    setPaidStr((v) => (v === '0' ? k : v + k).slice(0, 9));
  };

  return (
    <div className="fixed inset-0 z-50 bg-slate-950/85 backdrop-blur-sm flex items-end sm:items-center justify-center p-0 sm:p-4">
      <div className="w-full max-w-2xl bg-white dark:bg-slate-900 rounded-t-3xl sm:rounded-3xl shadow-2xl overflow-hidden max-h-[95vh] flex flex-col">
        <div className="shrink-0 relative overflow-hidden bg-gradient-to-br from-slate-950 via-emerald-900 to-green-700 text-white px-5 py-4">
          <div className="absolute -top-10 -right-10 h-32 w-32 rounded-full bg-emerald-400/20 blur-2xl" />
          <div className="relative flex items-center justify-between gap-3">
            <div className="min-w-0">
              <div className="text-[11px] uppercase font-extrabold text-emerald-200 tracking-wider">Payment • {itemCount} items</div>
              <div className="text-4xl sm:text-5xl font-extrabold tabular-nums leading-none mt-1">{formatPKR(total)}</div>
              {hasCustomer && customerName && (
                <div className="mt-2 inline-flex items-center gap-1.5 px-2.5 py-1 rounded-lg bg-white/15 backdrop-blur border border-white/20 text-xs font-extrabold">
                  <User className="h-3 w-3" />
                  {customerName}
                  {customerBalance > 0 && (
                    <>
                      <span className="text-white/50">•</span>
                      <span className="text-amber-300">Purana udhaar {formatPKR(customerBalance)}</span>
                    </>
                  )}
                </div>
              )}
            </div>
            <button onClick={onClose} className="h-11 w-11 rounded-2xl bg-white/15 hover:bg-white/25 active:scale-90 flex items-center justify-center border-2 border-white/20 transition shrink-0">
              <X className="h-5 w-5" />
            </button>
          </div>
        </div>

        <div className="flex-1 overflow-y-auto">
          <div className="px-4 sm:px-5 pt-4">
            <div className="grid grid-cols-3 gap-2">
              <button onClick={() => setMode('full')}
                className={['p-3 rounded-2xl border-4 text-center transition active:scale-95',
                  mode === 'full' ? 'border-emerald-500 bg-emerald-50 dark:bg-emerald-500/15 shadow-lg ring-2 ring-emerald-200 dark:ring-emerald-500/30' : 'border-slate-200 dark:border-slate-700 bg-white dark:bg-slate-800 hover:border-emerald-300'].join(' ')}>
                <Wallet className={`h-6 w-6 mx-auto ${mode === 'full' ? 'text-emerald-600' : 'text-slate-500'}`} />
                <div className={`text-sm font-extrabold mt-1 ${mode === 'full' ? 'text-emerald-800 dark:text-emerald-300' : 'text-slate-700 dark:text-slate-200'}`}>Pura Paisa</div>
                <div className="text-[10px] font-bold text-slate-500 mt-0.5">100% payment</div>
              </button>
              <button onClick={() => { setMode('partial'); setPaidStr(''); }}
                className={['p-3 rounded-2xl border-4 text-center transition active:scale-95',
                  mode === 'partial' ? 'border-amber-500 bg-amber-50 dark:bg-amber-500/15 shadow-lg ring-2 ring-amber-200 dark:ring-amber-500/30' : 'border-slate-200 dark:border-slate-700 bg-white dark:bg-slate-800 hover:border-amber-300'].join(' ')}>
                <Calculator className={`h-6 w-6 mx-auto ${mode === 'partial' ? 'text-amber-600' : 'text-slate-500'}`} />
                <div className={`text-sm font-extrabold mt-1 ${mode === 'partial' ? 'text-amber-800 dark:text-amber-300' : 'text-slate-700 dark:text-slate-200'}`}>Kuch Cash</div>
                <div className="text-[10px] font-bold text-slate-500 mt-0.5">Baqi udhaar</div>
              </button>
              <button onClick={() => setMode('credit')} disabled={!hasCustomer}
                className={['p-3 rounded-2xl border-4 text-center transition active:scale-95 disabled:opacity-40 disabled:cursor-not-allowed',
                  mode === 'credit' ? 'border-rose-500 bg-rose-50 dark:bg-rose-500/15 shadow-lg ring-2 ring-rose-200 dark:ring-rose-500/30' : 'border-slate-200 dark:border-slate-700 bg-white dark:bg-slate-800 hover:border-rose-300'].join(' ')}>
                <BookOpen className={`h-6 w-6 mx-auto ${mode === 'credit' ? 'text-rose-600' : 'text-slate-500'}`} />
                <div className={`text-sm font-extrabold mt-1 ${mode === 'credit' ? 'text-rose-800 dark:text-rose-300' : 'text-slate-700 dark:text-slate-200'}`}>Pura Udhaar</div>
                <div className="text-[10px] font-bold text-slate-500 mt-0.5">{hasCustomer ? 'Khaate mein' : 'Customer chunein'}</div>
              </button>
            </div>
          </div>

          {mode !== 'credit' && (
            <div className="px-4 sm:px-5 pt-4">
              <div className="text-[10px] uppercase font-extrabold text-slate-600 dark:text-slate-400 tracking-wider mb-2">Payment Method</div>
              <div className="grid grid-cols-3 sm:grid-cols-5 gap-2">
                {PAYMENT_METHODS.map((m) => {
                  const active = paymentMethod === m.id;
                  const Icon = m.icon;
                  return (
                    <button key={m.id} onClick={() => setPaymentMethod(m.id)}
                      className={['p-2.5 rounded-2xl border-4 transition active:scale-95 flex flex-col items-center gap-1',
                        active ? `border-transparent shadow-lg text-white bg-gradient-to-br ${m.bg}` : 'border-slate-200 dark:border-slate-700 bg-white dark:bg-slate-800 hover:border-slate-300 text-slate-700 dark:text-slate-200'].join(' ')}>
                      <Icon className="h-5 w-5" />
                      <span className="text-[11px] font-extrabold">{m.label}</span>
                    </button>
                  );
                })}
              </div>
            </div>
          )}

          {mode === 'partial' && (
            <div className="px-4 sm:px-5 pt-4 space-y-3">
              <div className="relative">
                <input type="number" step="0.01" value={paidStr} autoFocus
                  onChange={(e) => setPaidStr(e.target.value)}
                  onFocus={(e) => e.target.select()}
                  placeholder="Kitna paisa diya?"
                  className="h-16 sm:h-20 w-full rounded-2xl border-4 border-emerald-300 dark:border-emerald-500/40 bg-emerald-50 dark:bg-emerald-500/10 px-4 pr-14 text-3xl sm:text-4xl font-extrabold tabular-nums text-emerald-900 dark:text-emerald-200 focus:outline-none focus:border-emerald-600 focus:ring-4 focus:ring-emerald-200 dark:focus:ring-emerald-500/20" />
                {paidStr && (
                  <button onClick={() => setPaidStr('')} className="absolute right-3 top-1/2 -translate-y-1/2 h-10 w-10 rounded-xl bg-white dark:bg-slate-800 hover:bg-slate-100 dark:hover:bg-slate-700 active:scale-95 flex items-center justify-center transition">
                    <X className="h-5 w-5 text-slate-500" />
                  </button>
                )}
              </div>
              <div className="grid grid-cols-3 sm:grid-cols-6 gap-1.5">
                {QUICK_AMOUNTS.map((amt) => (
                  <button key={amt} onClick={() => addAmount(amt)}
                    className="h-11 rounded-xl bg-slate-100 dark:bg-slate-800 hover:bg-emerald-100 dark:hover:bg-emerald-500/20 active:scale-95 text-sm font-extrabold text-slate-800 dark:text-slate-200 transition tabular-nums">
                    +{amt}
                  </button>
                ))}
              </div>
              <div className="grid grid-cols-2 gap-2">
                <button onClick={() => setExact(total)}
                  className="h-11 rounded-xl bg-emerald-100 dark:bg-emerald-500/20 hover:bg-emerald-200 dark:hover:bg-emerald-500/30 active:scale-95 text-sm font-extrabold text-emerald-800 dark:text-emerald-300 transition inline-flex items-center justify-center gap-1">
                  <CheckCircle2 className="h-4 w-4" /> Pura ({formatPKR(total)})
                </button>
                <button onClick={() => setExact(Math.ceil(total / 100) * 100)}
                  className="h-11 rounded-xl bg-blue-100 dark:bg-blue-500/20 hover:bg-blue-200 dark:hover:bg-blue-500/30 active:scale-95 text-sm font-extrabold text-blue-800 dark:text-blue-300 transition tabular-nums">
                  Round up ({formatPKR(Math.ceil(total / 100) * 100)})
                </button>
              </div>
              <div className="grid grid-cols-4 gap-1.5">
                {['1', '2', '3', '⌫', '4', '5', '6', 'C', '7', '8', '9', '00', '0', '000'].map((k) => (
                  <button key={k} onClick={() => numpad(k)}
                    className={['h-12 rounded-xl font-extrabold text-lg transition active:scale-95 tabular-nums',
                      k === 'C' ? 'bg-rose-100 dark:bg-rose-500/20 text-rose-700 dark:text-rose-300'
                      : k === '⌫' ? 'bg-amber-100 dark:bg-amber-500/20 text-amber-800 dark:text-amber-300'
                      : 'bg-white dark:bg-slate-800 border-2 border-slate-200 dark:border-slate-700 text-slate-900 dark:text-white hover:border-emerald-400'].join(' ')}>
                    {k === '⌫' ? <Delete className="h-5 w-5 mx-auto" /> : k}
                  </button>
                ))}
              </div>
            </div>
          )}

          <div className="px-4 sm:px-5 py-4">
            <div className="rounded-2xl bg-gradient-to-br from-slate-50 to-white dark:from-slate-800/60 dark:to-slate-900 border-4 border-slate-200 dark:border-slate-700 p-4 space-y-2">
              <div className="flex items-center justify-between">
                <span className="text-sm font-bold text-slate-600 dark:text-slate-300">Total Bill</span>
                <span className="text-lg font-extrabold tabular-nums text-slate-800 dark:text-white">{formatPKR(total)}</span>
              </div>
              {mode !== 'credit' && paid > 0 && (
                <div className="flex items-center justify-between">
                  <span className="text-sm font-bold text-slate-600 dark:text-slate-300">Diya</span>
                  <span className="text-lg font-extrabold tabular-nums text-emerald-700 dark:text-emerald-400">{formatPKR(paid)}</span>
                </div>
              )}
              {change > 0 && (
                <div className="rounded-xl bg-emerald-500 text-white p-3 mt-2">
                  <div className="flex items-center gap-2">
                    <CheckCircle2 className="h-5 w-5" />
                    <div>
                      <div className="text-[10px] uppercase font-extrabold text-white/80 tracking-wider">Customer ko wapis</div>
                      <div className="text-2xl font-extrabold tabular-nums leading-none">{formatPKR(change)}</div>
                    </div>
                  </div>
                  {hasCustomer && (
                    <label className="mt-2.5 flex items-center gap-2 rounded-lg bg-white/15 px-2.5 py-2 cursor-pointer hover:bg-white/25 transition">
                      <input type="checkbox" checked={depositExtra} onChange={(e) => setDepositExtra(e.target.checked)}
                        className="h-4 w-4 rounded accent-white" />
                      <span className="text-xs font-extrabold">Extra paisa {customerName} ke khaate mein jama karo</span>
                    </label>
                  )}
                </div>
              )}
              {creditAmount > 0 && (
                <div className={['rounded-xl p-3 flex items-center mt-2 border-2',
                  hasCustomer ? 'bg-amber-500 text-white border-amber-400' : 'bg-rose-500 text-white border-rose-400'].join(' ')}>
                  <div className="flex items-center gap-2">
                    <BookOpen className="h-5 w-5" />
                    <div>
                      <div className="text-[10px] uppercase font-extrabold text-white/80 tracking-wider">
                        {hasCustomer ? 'Khaate mein udhaar' : '⚠️ Customer chahiye'}
                      </div>
                      <div className="text-2xl font-extrabold tabular-nums leading-none">{formatPKR(creditAmount)}</div>
                    </div>
                  </div>
                </div>
              )}
              {!hasCustomer && (mode === 'credit' || creditAmount > 0) && (
                <div className="rounded-xl bg-rose-50 dark:bg-rose-500/15 border-2 border-rose-300 dark:border-rose-500/40 p-2.5 text-xs font-extrabold text-rose-800 dark:text-rose-300 flex items-start gap-2">
                  <AlertTriangle className="h-4 w-4 shrink-0 mt-0.5" />
                  <span>Udhaar ke liye customer select karein</span>
                </div>
              )}
            </div>
          </div>
        </div>

        <div className="shrink-0 p-4 border-t-4 border-slate-100 dark:border-slate-800 bg-white dark:bg-slate-900">
          <button onClick={submit} disabled={loading || (isCredit && !hasCustomer)}
            className={['w-full h-16 sm:h-20 rounded-3xl font-extrabold text-white shadow-2xl transition-all active:scale-[0.98]',
              isCredit ? 'bg-gradient-to-r from-amber-600 to-orange-600 hover:from-amber-700 hover:to-orange-700'
              : 'bg-gradient-to-r from-emerald-600 to-green-600 hover:from-emerald-700 hover:to-green-700',
              'disabled:opacity-50 disabled:cursor-not-allowed',
              'flex items-center justify-between px-5 sm:px-6'].join(' ')}>
            <div className="text-left">
              <div className="text-[10px] sm:text-xs uppercase font-extrabold text-white/80 tracking-wider">
                {loading ? 'Save ho raha...' : isCredit ? '📔 Khaate mein daalo' : '💰 Sale complete karo'}
              </div>
              <div className="text-xl sm:text-2xl tabular-nums leading-none mt-0.5">
                {mode === 'credit' ? `Udhaar ${formatPKR(total)}`
                  : isCredit ? `${formatPKR(paid)} + Udhaar ${formatPKR(creditAmount)}`
                  : `${formatPKR(paid || total)}`}
              </div>
            </div>
            <div className="h-12 w-12 sm:h-14 sm:w-14 rounded-2xl bg-white/20 flex items-center justify-center">
              <ArrowRight className="h-6 w-6 sm:h-8 sm:w-8" />
            </div>
          </button>
          <div className="mt-2 text-center text-[10px] font-bold text-slate-400 dark:text-slate-500">
            Enter = confirm • Esc = cancel • F1/F3/F4/F5 = payment • F6 = udhaar
          </div>
        </div>
      </div>
    </div>
  );
}

/* ═════════════════════════════════════════════════════════════
   📦 UNIT PICKER MODAL
   ═════════════════════════════════════════════════════════════ */
const UNIT_QTY_PRESETS: Record<string, number[]> = {
  kg: [0.25, 0.5, 1, 2, 5], gram: [100, 250, 500, 1000],
  liter: [0.5, 1, 2, 5], ml: [250, 500, 1000],
  pcs: [1, 2, 3, 5, 10, 12], piece: [1, 2, 3, 5, 10, 12],
  box: [1, 2, 3, 5], carton: [1, 2, 5], dozen: [1, 2, 3], packet: [1, 2, 5, 10], bag: [1, 2, 5],
};

function UnitPickerModal({ product, units, onConfirm, onClose }: {
  product: Product; units: UnitOption[];
  onConfirm: (unit: UnitOption, qty: number) => void;
  onClose: () => void;
}) {
  const [selectedId, setSelectedId] = useState(units.find((u) => u.isBase)?.id ?? units[0]?.id ?? '');
  const [qtyStr, setQtyStr] = useState('1');
  const unit = units.find((u) => u.id === selectedId) ?? units[0];
  const qty = Number(qtyStr) || 0;
  const presets = UNIT_QTY_PRESETS[(unit?.unitName || '').toLowerCase()] ?? [1, 2, 5, 10];
  const baseQty = qty * (unit?.conversionRate ?? 1);
  const lineTotal = qty * (unit?.price ?? 0);
  const exceeds = baseQty > product.stock;

  useEffect(() => { setQtyStr('1'); }, [selectedId]);
  useEffect(() => {
    const onKey = (e: KeyboardEvent) => {
      if (e.key === 'Escape') onClose();
      if (e.key === 'Enter' && qty > 0 && !exceeds) { e.preventDefault(); onConfirm(unit, qty); }
    };
    window.addEventListener('keydown', onKey);
    return () => window.removeEventListener('keydown', onKey);
  }, [qty, exceeds, unit, onConfirm, onClose]);

  if (!unit) return null;

  return (
    <div className="fixed inset-0 z-50 bg-slate-950/80 backdrop-blur-sm flex items-center justify-center p-3" onClick={onClose}>
      <div className="w-full max-w-2xl bg-white dark:bg-slate-900 rounded-3xl shadow-2xl overflow-hidden max-h-[95vh] flex flex-col" onClick={(e) => e.stopPropagation()}>
        <div className="px-5 py-4 bg-gradient-to-br from-slate-950 via-sky-900 to-cyan-700 text-white flex items-center gap-4 shrink-0">
          <div className="h-16 w-16 rounded-2xl bg-white/15 overflow-hidden shrink-0 flex items-center justify-center">
            {product.images?.[0]?.url ? <img src={product.images[0].url} alt="" className="w-full h-full object-cover" /> : <Package className="h-8 w-8 text-white/70" />}
          </div>
          <div className="flex-1 min-w-0">
            <div className="text-xs uppercase font-extrabold text-white/70 tracking-wider">Kitna chahiye?</div>
            <h3 className="text-2xl font-extrabold leading-tight truncate">{product.name}</h3>
            <div className="text-sm font-bold text-cyan-200">Stock: {Number(product.stock).toFixed(product.stock % 1 === 0 ? 0 : 2)} {product.unit}</div>
          </div>
          <button onClick={onClose} className="h-12 w-12 rounded-2xl bg-white/15 hover:bg-white/25 active:scale-95 flex items-center justify-center shrink-0 transition">
            <X className="h-6 w-6" />
          </button>
        </div>

        <div className="flex-1 overflow-y-auto p-4 space-y-4">
          {units.length > 1 && (
            <div className="grid grid-cols-3 sm:grid-cols-4 gap-2">
              {units.map((u) => {
                const active = selectedId === u.id;
                return (
                  <button key={u.id} onClick={() => setSelectedId(u.id)}
                    className={['h-[88px] rounded-2xl border-4 transition-all flex flex-col items-center justify-center gap-1 active:scale-95',
                      active ? 'border-sky-600 bg-sky-600 text-white shadow-lg shadow-sky-500/40 scale-105'
                      : 'border-slate-200 dark:border-slate-700 bg-white dark:bg-slate-800 text-slate-800 dark:text-slate-200 hover:border-sky-400 shadow-sm'].join(' ')}>
                    <span className="text-2xl">{u.emoji}</span>
                    <span className="text-sm font-extrabold uppercase">{u.unitName}</span>
                    <span className={['text-xs font-bold tabular-nums', active ? 'text-cyan-100' : 'text-emerald-700 dark:text-emerald-400'].join(' ')}>{formatPKR(u.price)}</span>
                  </button>
                );
              })}
            </div>
          )}

          <div className="grid grid-cols-3 sm:grid-cols-6 gap-2">
            {presets.map((p) => {
              const active = Number(qtyStr) === p;
              return (
                <button key={p} onClick={() => setQtyStr(String(p))}
                  className={['h-[64px] rounded-2xl border-4 font-extrabold text-lg tabular-nums transition-all active:scale-95',
                    active ? 'border-emerald-600 bg-emerald-600 text-white shadow-lg shadow-emerald-500/40'
                    : 'border-slate-200 dark:border-slate-700 bg-white dark:bg-slate-800 text-slate-800 dark:text-slate-200 hover:border-emerald-400 shadow-sm'].join(' ')}>
                  {p}
                  <div className={['text-[10px] font-bold uppercase', active ? 'text-emerald-100' : 'text-slate-500'].join(' ')}>{unit.unitName}</div>
                </button>
              );
            })}
          </div>

          <div className={['rounded-3xl p-4 border-4 transition-colors',
            exceeds ? 'bg-rose-50 dark:bg-rose-500/10 border-rose-400 dark:border-rose-500/40'
            : 'bg-gradient-to-br from-emerald-50 to-green-50 dark:from-emerald-500/10 dark:to-green-500/10 border-emerald-300 dark:border-emerald-500/40'].join(' ')}>
            <div className="flex items-center justify-between gap-3">
              <div className="flex-1">
                <div className="text-xs uppercase font-extrabold text-slate-600 dark:text-slate-400 tracking-wider">Quantity</div>
                <input type="number" step="any" value={qtyStr} autoFocus
                  onChange={(e) => setQtyStr(e.target.value)}
                  onFocus={(e) => e.target.select()}
                  className="mt-1 h-14 w-full rounded-xl border-2 border-slate-300 dark:border-slate-600 bg-white dark:bg-slate-800 px-3 text-3xl font-extrabold tabular-nums text-slate-900 dark:text-white focus:outline-none focus:border-emerald-500" />
                {unit.conversionRate !== 1 && (
                  <div className="text-xs font-bold text-slate-600 dark:text-slate-400 mt-1">= {baseQty.toFixed(2)} {product.unit}</div>
                )}
              </div>
              <div className="text-right shrink-0">
                <div className="text-xs uppercase font-extrabold text-slate-600 dark:text-slate-400 tracking-wider">Total</div>
                <div className="text-3xl sm:text-4xl font-extrabold text-emerald-700 dark:text-emerald-400 tabular-nums leading-none mt-1">{formatPKR(lineTotal)}</div>
              </div>
            </div>
            {exceeds && (
              <div className="mt-2 text-sm font-extrabold text-rose-700 dark:text-rose-400">⚠️ Stock sirf {Number(product.stock).toFixed(2)} {product.unit} hai!</div>
            )}
          </div>

          <button onClick={() => { if (qty > 0 && !exceeds) onConfirm(unit, qty); }}
            disabled={qty <= 0 || exceeds}
            className="w-full h-16 rounded-2xl bg-gradient-to-r from-emerald-600 to-green-600 hover:from-emerald-700 hover:to-green-700 disabled:opacity-40 font-extrabold text-white text-xl shadow-lg shadow-emerald-500/30 transition-all active:scale-[0.98] inline-flex items-center justify-center gap-2">
            <Check className="h-6 w-6" /> Cart Mein Daalo — {formatPKR(lineTotal)}
          </button>
        </div>
      </div>
    </div>
  );
}

/* ═════════════════════════════════════════════════════════════
   ⚖️ WEIGH SALE MODAL
   ═════════════════════════════════════════════════════════════ */
function WeighSaleModal({ product, unit, prefillMoney, onConfirm, onClose }: {
  product: Product; unit: UnitOption; prefillMoney?: number;
  onConfirm: (qty: number) => void; onClose: () => void;
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
  const [moneyInput, setMoneyInput] = useState<number | ''>(prefillMoney ?? '');

  const activeSub = subUnits.find((s) => s.k === subUnit) || subUnits[0];
  const baseQty = mode === 'weight' ? Number(weightInput || 0) * activeSub.toBase : 0;
  const weightPrice = baseQty * pricePerUnit;
  const moneyBaseQty = mode === 'money' && pricePerUnit > 0 ? Number(moneyInput || 0) / pricePerUnit : 0;
  const finalBaseQty = mode === 'weight' ? baseQty : moneyBaseQty;
  const finalPrice = mode === 'weight' ? weightPrice : Number(moneyInput || 0);
  const stockBase = Number(product.stock || 0) / unit.conversionRate;
  const overStock = finalBaseQty > 0 && finalBaseQty > stockBase;
  const canAdd = finalBaseQty > 0 && !overStock;

  const weightPresets = base === 'gram' || base === 'g' ? [100, 250, 500, 1000] : [0.25, 0.5, 1, 2, 5];
  const moneyPresets = [20, 50, 100, 200, 500];

  const submit = useCallback(() => { if (canAdd) onConfirm(Number(finalBaseQty.toFixed(4))); }, [canAdd, finalBaseQty, onConfirm]);

  useEffect(() => {
    const onKey = (e: KeyboardEvent) => {
      if (e.key === 'Escape') onClose();
      if (e.key === 'Enter' && canAdd) { e.preventDefault(); submit(); }
    };
    window.addEventListener('keydown', onKey);
    return () => window.removeEventListener('keydown', onKey);
  }, [canAdd, submit, onClose]);

  return (
    <div className="fixed inset-0 z-50 bg-slate-950/80 backdrop-blur-sm flex items-end sm:items-center justify-center p-0 sm:p-4" onClick={onClose}>
      <div className="w-full sm:max-w-md bg-white dark:bg-slate-900 rounded-t-3xl sm:rounded-3xl shadow-2xl overflow-hidden max-h-[94vh] flex flex-col" onClick={(e) => e.stopPropagation()}>
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
            <button onClick={() => setMode('money')}
              className={['py-3.5 rounded-2xl border-2 font-extrabold text-sm transition',
                mode === 'money' ? 'border-emerald-600 bg-emerald-50 dark:bg-emerald-500/15 text-emerald-800 dark:text-emerald-300 shadow-md'
                : 'border-slate-200 dark:border-slate-700 bg-white dark:bg-slate-800 text-slate-600 dark:text-slate-300'].join(' ')}>
              💰 Paise Se
              <div className="text-[10px] font-bold opacity-70">"100 ka aata de do"</div>
            </button>
            <button onClick={() => setMode('weight')}
              className={['py-3.5 rounded-2xl border-2 font-extrabold text-sm transition',
                mode === 'weight' ? 'border-amber-600 bg-amber-50 dark:bg-amber-500/15 text-amber-800 dark:text-amber-300 shadow-md'
                : 'border-slate-200 dark:border-slate-700 bg-white dark:bg-slate-800 text-slate-600 dark:text-slate-300'].join(' ')}>
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
              <label className="block text-xs font-extrabold uppercase tracking-wider text-slate-600 dark:text-slate-400 mb-1.5">Kitna wazan? ({activeSub.l})</label>
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
              <label className="block text-xs font-extrabold uppercase tracking-wider text-slate-600 dark:text-slate-400 mb-1.5">Kitne paise ka? (Rs)</label>
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

/* ═════════════════════════════════════════════════════════════
   💎 DISCOUNT MODAL
   ═════════════════════════════════════════════════════════════ */
function DiscountModal({ subtotal, mode: initMode, pct: initPct, rs: initRs, onApply, onClose }: {
  subtotal: number; mode: DiscountMode; pct: number; rs: number;
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

  const apply = useCallback(() => onApply(mode, pctNum, rsNum), [mode, pctNum, rsNum, onApply]);

  const numpadPress = (key: string) => {
    const setter = mode === 'pct' ? setPct : setRs;
    if (key === 'C') return setter('');
    if (key === '⌫') return setter((v) => v.slice(0, -1));
    if (key === '.' && (mode === 'pct' ? pct : rs).includes('.')) return;
    setter((v) => (v === '0' ? key : v + key).slice(0, mode === 'pct' ? 5 : 10));
  };

  useEffect(() => {
    const onKey = (e: KeyboardEvent) => {
      if (e.key === 'Enter') { e.preventDefault(); apply(); }
      if (e.key === 'Escape') onClose();
    };
    window.addEventListener('keydown', onKey);
    return () => window.removeEventListener('keydown', onKey);
  }, [apply, onClose]);

  return (
    <div className="fixed inset-0 z-50 bg-slate-950/80 backdrop-blur-md flex items-end sm:items-center justify-center p-0 sm:p-4" onClick={onClose}>
      <div className="w-full sm:max-w-md bg-white dark:bg-slate-900 rounded-t-3xl sm:rounded-3xl shadow-2xl overflow-hidden max-h-[96vh] flex flex-col" onClick={(e) => e.stopPropagation()}>
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

        <div className="shrink-0 px-5 pt-4">
          <div className="grid grid-cols-2 gap-2 p-1 bg-slate-100 dark:bg-slate-800 rounded-2xl">
            <button onClick={() => setMode('pct')}
              className={['h-12 rounded-xl text-sm font-extrabold inline-flex items-center justify-center gap-1.5 transition',
                mode === 'pct' ? 'bg-white dark:bg-slate-900 text-amber-700 dark:text-amber-300 shadow-md' : 'text-slate-600 dark:text-slate-300'].join(' ')}>
              <Percent className="h-4 w-4" /> Percent (%)
            </button>
            <button onClick={() => setMode('rs')}
              className={['h-12 rounded-xl text-sm font-extrabold inline-flex items-center justify-center gap-1.5 transition',
                mode === 'rs' ? 'bg-white dark:bg-slate-900 text-emerald-700 dark:text-emerald-300 shadow-md' : 'text-slate-600 dark:text-slate-300'].join(' ')}>
              <Banknote className="h-4 w-4" /> Rupees (Rs)
            </button>
          </div>
        </div>

        <div className="flex-1 overflow-y-auto px-5 py-4 space-y-4">
          <div className={['rounded-2xl border-2 p-4 text-center',
            mode === 'pct' ? 'border-amber-300 dark:border-amber-500/40 bg-gradient-to-br from-amber-50 to-orange-50 dark:from-amber-500/10 dark:to-orange-500/10'
            : 'border-emerald-300 dark:border-emerald-500/40 bg-gradient-to-br from-emerald-50 to-green-50 dark:from-emerald-500/10 dark:to-green-500/10'].join(' ')}>
            <div className="text-[10px] uppercase tracking-widest font-extrabold text-slate-600 dark:text-slate-400 mb-1">
              {mode === 'pct' ? 'Kitne % Discount' : 'Kitne Rs Discount'}
            </div>
            <div className="flex items-baseline justify-center gap-1">
              {mode === 'rs' && <span className="text-2xl font-extrabold text-emerald-700 dark:text-emerald-400">Rs</span>}
              <div className={['text-6xl font-extrabold tabular-nums leading-none',
                mode === 'pct' ? 'text-amber-700 dark:text-amber-300' : 'text-emerald-700 dark:text-emerald-300'].join(' ')}>
                {mode === 'pct' ? (pct || '0') : (rs || '0')}
              </div>
              {mode === 'pct' && <span className="text-3xl font-extrabold text-amber-700 dark:text-amber-300">%</span>}
            </div>
          </div>

          <div className="grid grid-cols-5 gap-1.5">
            {mode === 'pct'
              ? [5, 10, 15, 20, 25].map((v) => (
                  <button key={v} onClick={() => setPct(String(v))}
                    className={['h-11 rounded-xl text-sm font-extrabold tabular-nums transition active:scale-95 border-2',
                      Number(pct) === v ? 'bg-amber-600 text-white border-amber-600 shadow-md'
                      : 'bg-white dark:bg-slate-800 border-amber-200 dark:border-amber-500/30 text-amber-800 dark:text-amber-300 hover:border-amber-400'].join(' ')}>
                    {v}%
                  </button>
                ))
              : [50, 100, 200, 500, 1000].map((v) => (
                  <button key={v} onClick={() => setRs(String(v))}
                    className={['h-11 rounded-xl text-xs font-extrabold tabular-nums transition active:scale-95 border-2',
                      Number(rs) === v ? 'bg-emerald-600 text-white border-emerald-600 shadow-md'
                      : 'bg-white dark:bg-slate-800 border-emerald-200 dark:border-emerald-500/30 text-emerald-800 dark:text-emerald-300 hover:border-emerald-400'].join(' ')}>
                    {v}
                  </button>
                ))}
          </div>

          <div className="grid grid-cols-3 gap-1.5">
            {['1', '2', '3', '4', '5', '6', '7', '8', '9', '.', '0', '⌫'].map((k) => (
              <button key={k} onClick={() => numpadPress(k)}
                className={['h-12 rounded-xl text-lg font-extrabold transition active:scale-95 border-2 tabular-nums',
                  k === '⌫' ? 'bg-rose-50 dark:bg-rose-500/10 border-rose-200 dark:border-rose-500/30 text-rose-700 dark:text-rose-400'
                  : 'bg-white dark:bg-slate-800 border-slate-200 dark:border-slate-700 text-slate-900 dark:text-white hover:border-slate-400'].join(' ')}>
                {k}
              </button>
            ))}
          </div>

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
        </div>

        <div className="shrink-0 border-t-2 border-slate-200 dark:border-slate-700 bg-slate-50 dark:bg-slate-900/80 p-3 grid grid-cols-3 gap-2">
          <button onClick={() => onApply(mode, 0, 0)}
            className="h-14 rounded-2xl bg-white dark:bg-slate-800 border-2 border-slate-200 dark:border-slate-700 text-sm font-extrabold text-slate-700 dark:text-slate-200 hover:border-rose-300 hover:text-rose-600 transition inline-flex items-center justify-center gap-1">
            <RotateCcw className="h-4 w-4" /> Clear
          </button>
          <button onClick={onClose}
            className="h-14 rounded-2xl bg-white dark:bg-slate-800 border-2 border-slate-200 dark:border-slate-700 text-sm font-extrabold text-slate-700 dark:text-slate-200 transition">
            Cancel
          </button>
          <button onClick={apply}
            className={['h-14 rounded-2xl font-extrabold text-white shadow-lg inline-flex items-center justify-center gap-1.5 transition active:scale-95',
              mode === 'pct' ? 'bg-gradient-to-r from-amber-600 to-orange-600 hover:from-amber-700 hover:to-orange-700 shadow-amber-500/40'
              : 'bg-gradient-to-r from-emerald-600 to-green-600 hover:from-emerald-700 hover:to-green-700 shadow-emerald-500/40'].join(' ')}>
            <Check className="h-5 w-5" /> Apply
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
    <button onClick={onClick}
      className={['flex-1 h-12 rounded-xl text-xs sm:text-sm font-extrabold inline-flex items-center justify-center gap-1.5 transition active:scale-95 relative',
        active ? colors[color] : 'bg-transparent text-slate-600 dark:text-slate-300 hover:bg-slate-100 dark:hover:bg-slate-700'].join(' ')}>
      {highlight && !active && <span className="absolute top-1 right-1 h-2 w-2 rounded-full bg-violet-500 animate-pulse" />}
      <Icon className="h-4 w-4" />
      <span>{label}</span>
      {count > 0 && (
        <span className={['px-1.5 rounded-md text-[10px] tabular-nums', active ? 'bg-white/25' : 'bg-slate-200 dark:bg-slate-700 text-slate-700 dark:text-slate-300'].join(' ')}>{count}</span>
      )}
      <span className={['hidden lg:inline text-[9px] font-mono px-1 rounded', active ? 'bg-white/20' : 'bg-slate-200 dark:bg-slate-700 text-slate-500 dark:text-slate-400'].join(' ')}>{shortcut}</span>
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
          <div className={['text-xs sm:text-sm font-extrabold tabular-nums shrink-0',
            out ? 'text-rose-700 dark:text-rose-400' : low ? 'text-amber-700 dark:text-amber-400' : 'text-slate-600 dark:text-slate-300'].join(' ')}>
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
  onSetPrice, onCheckout, onInstantCash, canCheckout, checkoutPending,
}: any) {
  const containerClass = isMobile
    ? 'fixed inset-0 z-40 bg-white dark:bg-slate-950 flex flex-col lg:hidden'
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
            <p className="text-xs sm:text-sm text-slate-500 dark:text-slate-400 font-semibold mt-1">Scan karo, click karo, ya 🎤 bolo: "2 kilo chini"</p>
            <p className="text-[11px] text-slate-400 dark:text-slate-500 font-bold mt-2 inline-flex items-center gap-1">
              <Zap className="h-3 w-3 text-amber-500" /> F12 = instant cash + print!
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
          <button onClick={onOpenDiscount}
            className={['w-full h-12 rounded-2xl font-extrabold text-sm inline-flex items-center justify-between px-4 border-2 transition active:scale-[0.98]',
              hasDiscount ? 'bg-gradient-to-r from-amber-500 to-orange-500 border-amber-500 text-white shadow-md shadow-amber-500/30'
              : 'bg-white dark:bg-slate-800 border-slate-200 dark:border-slate-700 text-slate-700 dark:text-slate-200 hover:border-amber-400'].join(' ')}>
            <span className="inline-flex items-center gap-2">
              <Tag className="h-4 w-4" />
              {hasDiscount ? <span>Discount: {discountMode === 'pct' ? `${discountPct}%` : formatPKR(discountRs)}</span> : <span>Discount lagayein?</span>}
            </span>
              {hasDiscount && !hidePrices && <span className="text-xs tabular-nums opacity-90">−{formatPKR(discountAmount)}</span>}
              {hasDiscount ? (
                <span onClick={(e) => { e.stopPropagation(); onClearDiscount(); }}
                  className="h-6 w-6 rounded-lg bg-white/20 hover:bg-white/30 flex items-center justify-center transition" role="button">
                  <X className="h-3.5 w-3.5" />
                </span>
              ) : (
                <ArrowRight className="h-4 w-4 opacity-60" />
              )}
              
          </button>

          {hasDiscount && !hidePrices && (
            <div className="text-xs font-bold text-slate-500 dark:text-slate-400 tabular-nums flex justify-between px-1">
              <span>Subtotal</span>
              <span className="line-through">{formatPKR(subtotal)}</span>
            </div>
          )}

          {/* ⚡ INSTANT CASH — sab se tez rasta */}
          <button onClick={onInstantCash} disabled={!canCheckout || checkoutPending}
            className={['w-full h-14 rounded-2xl font-extrabold text-white shadow-xl transition-all active:scale-[0.98]',
              'bg-gradient-to-r from-sky-600 to-cyan-600 hover:from-sky-700 hover:to-cyan-700',
              'disabled:opacity-50 disabled:cursor-not-allowed',
              'flex items-center justify-center gap-2'].join(' ')}
            title="Cash sale + print — koi sawal nahi!">
            <Zap className="h-5 w-5" />
            ⚡ INSTANT CASH {hidePrices ? '' : `— ${formatPKR(total)}`} <KbdInline>F12</KbdInline>
          </button>

          <button onClick={onCheckout} disabled={!canCheckout || checkoutPending}
            className={['w-full h-[68px] sm:h-[80px] rounded-3xl font-extrabold text-white shadow-2xl transition-all active:scale-[0.98]',
              'bg-gradient-to-r from-emerald-600 to-green-600 hover:from-emerald-700 hover:to-green-700',
              'disabled:opacity-50 disabled:cursor-not-allowed',
              'flex items-center justify-between px-5 sm:px-6'].join(' ')}>
            <div className="text-left">
              <div className="text-[10px] sm:text-xs uppercase font-extrabold text-white/80 tracking-wider">
                Paisay lein <span className="hidden sm:inline">(F9)</span> — cash / udhaar / card
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

function KbdInline({ children }: { children: React.ReactNode }) {
  return (
    <kbd className="hidden sm:inline px-1.5 py-0.5 rounded bg-white/20 border border-white/30 text-[10px] font-mono font-extrabold">{children}</kbd>
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
    <div className={['rounded-2xl bg-white dark:bg-slate-900 border-4 p-2.5 sm:p-3 shadow-sm dark:shadow-black/20',
      l.type === 'combo' ? 'border-violet-300 dark:border-violet-500/40' : customPriced ? 'border-amber-300 dark:border-amber-500/40' : 'border-slate-200 dark:border-slate-700'].join(' ')}>
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
            {customPriced && <span className="px-1.5 py-0.5 rounded bg-amber-500 text-white text-[9px] font-extrabold uppercase tracking-wider shrink-0">Custom Rs</span>}
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
          {/* 🖨️ PRINT FLOW — sab se zaroori */}
          <div className="rounded-2xl border-2 border-sky-200 dark:border-sky-500/30 bg-sky-50/60 dark:bg-sky-500/5 p-4 space-y-2">
            <div className="text-[10px] uppercase tracking-widest font-extrabold text-sky-700 dark:text-sky-300 flex items-center gap-1">
              <Printer className="h-3 w-3" /> 🖨️ 2-Second Billing Flow
            </div>
            <div className="space-y-1.5 text-xs font-semibold text-slate-700 dark:text-slate-200">
              <TipRow><strong>Scan/click karo → F12 → done!</strong> Receipt seedha print dialog me aa jayegi — receipt page pe jaana hi nahi</TipRow>
              <TipRow>Settings ⚙️ me <strong>Auto-Print</strong> ON rakho + printer width chuno (80mm standard / 58mm chhota)</TipRow>
              <TipRow>Popup blocked aaye to browser me 🔒 icon → "Pop-ups" → <strong>Allow</strong></TipRow>
              <TipRow>Success modal me <strong>"Print Again"</strong> — receipt dobara nikalni ho to</TipRow>
            </div>
          </div>
          <div className="rounded-2xl border-2 border-rose-200 dark:border-rose-500/30 bg-rose-50/60 dark:bg-rose-500/5 p-4 space-y-2">
            <div className="text-[10px] uppercase tracking-widest font-extrabold text-rose-700 dark:text-rose-300 flex items-center gap-1">
              <Mic className="h-3 w-3" /> 🎤 Voice Sale (F6)
            </div>
            <div className="space-y-1.5 text-xs font-semibold text-slate-700 dark:text-slate-200">
              <TipRow><strong>"2 kilo chini"</strong> — item cart mein</TipRow>
              <TipRow><strong>"sau ka doodh"</strong> — paise se wazan khud niklega</TipRow>
              <TipRow><strong>"dedh kilo aata"</strong> — 1.5 kg samajhta hai</TipRow>
              <TipRow><strong>"udhaar"</strong> / <strong>"nagad"</strong> — checkout khul jayega</TipRow>
              <TipRow><strong>"5 percent discount"</strong> — discount lag jayega</TipRow>
              <TipRow><strong>"cart clear karo"</strong> — sab saaf</TipRow>
            </div>
          </div>
          <div className="rounded-2xl border-2 border-amber-200 dark:border-amber-500/30 bg-amber-50/60 dark:bg-amber-500/5 p-4 space-y-2">
            <div className="text-[10px] uppercase tracking-widest font-extrabold text-amber-700 dark:text-amber-300 flex items-center gap-1">
              <Zap className="h-3 w-3" /> ⚡ Speed Shortcuts
            </div>
            <div className="space-y-1.5 text-xs font-semibold text-slate-700 dark:text-slate-200">
              <TipRow><strong>F12</strong> — INSTANT CASH: scan → F12 → print. Bas!</TipRow>
              <TipRow><strong>F9</strong> — checkout (cash/udhaar/card) • <strong>Enter</strong> — confirm</TipRow>
              <TipRow><strong>F2</strong> scanner • <strong>F6</strong> voice • <strong>F7/F8/F10</strong> tabs</TipRow>
              <TipRow>Checkout me <strong>F1/F3/F4/F5</strong> = payment method, <strong>F6</strong> = udhaar</TipRow>
            </div>
          </div>
          <div className="rounded-2xl border-2 border-emerald-200 dark:border-emerald-500/30 bg-emerald-50/60 dark:bg-emerald-500/5 p-4 space-y-2">
            <div className="text-[10px] uppercase tracking-widest font-extrabold text-emerald-700 dark:text-emerald-300 flex items-center gap-1">
              <Banknote className="h-3 w-3" /> 💱 Zyada Paisa / Udhaar
            </div>
            <div className="space-y-1.5 text-xs font-semibold text-slate-700 dark:text-slate-200">
              <TipRow>Customer ne zyada diya? → bada green <strong>"wapis dein"</strong> dikhta hai</TipRow>
              <TipRow>Ya tick karo <strong>"khaate mein jama"</strong> — advance balance ban jayega</TipRow>
              <TipRow><strong>Kuch Cash</strong> mode — jitna diya likho, baqi khud udhaar</TipRow>
            </div>
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
