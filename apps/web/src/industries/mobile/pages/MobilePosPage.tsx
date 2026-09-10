// src/industries/mobile/pages/MobilePosPage.tsx
import { useState, useMemo, useEffect, useRef, useCallback } from 'react';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import {
  Smartphone, Search, X, Plus, Minus, Trash2, User, UserPlus,
  Package, ShieldCheck, CheckCircle2, AlertTriangle, Award, Camera,
  ChevronDown, GraduationCap, Cable, Wifi, WifiOff, Pause, Play,
  ArrowRight, Printer, Tag, Percent, Banknote, RotateCcw, Check,
  AlertOctagon, RefreshCw, Star, Wrench, Eye, EyeOff, Settings2,
  CreditCard, Building2, Zap, Calculator, BookOpen, Wallet, Delete,
  ScanLine, Pencil, Sparkles, Store, ShoppingCart,
} from 'lucide-react';
import { toast } from 'sonner';
import { formatPKR } from '@core/lib/format';
import { useAuthStore } from '@core/stores/auth.store';
import { customersApi } from '@modules/customers/customers/api/customers.api';
import { type PaymentMethod } from '@modules/sales/sales/api/sales.api';
import { offlineSalesApi } from '@core/lib/offline/offlineSales';
import BarcodeScanner from '@core/components/barcode/BarcodeScanner';
import {
  type PtaStatus, PTA_STATUS_COLORS, PTA_STATUS_LABELS,
} from '../api/imei.api';
import { type UsedPhone, CONDITION_LABELS, CONDITION_COLORS } from '../api/used-phones.api';
import {
  mobilePosApi, type PosPhone, type PosAccessory,
} from '../api/mobile-pos.api';
import { repairsApi, type RepairTicket } from '../api/repairs.api';
import { DeliverRepairModal } from '../components/repairs/DeliverRepairModal';
import { QuickEmiFromSaleModal } from '../components/emi/QuickEmiFromSaleModal';
import { FbrModeIndicator } from '@integrations/fbr/components/FbrModeIndicator';

/* ═════════════════════════════════════════════════════════════
   📱 NAfaa MOBILE POS — 2-SECOND BILLING EDITION (Retail-grade)
   ─────────────────────────────────────────────────────────────
   ⚡ F12 = INSTANT CASH + AUTO-PRINT — receipt seedha print dialog
   🖨️  Receipt POS ke andar banti hai — receipt page pe jaana hi nahi
   ⚙️  Settings: printer width (58/80mm), auto-print, auto-close
   📱 IMEI search + camera scan • 🔄 Used phones • 🎧 Accessories
   🔧 Repair delivery — READY tickets seedha deliver + sale
   🛡️  PTA badge + red guard on non-PTA at checkout
   💎 Discount modal • 💳 Price override • ⏸️ Hold carts
   💳 Checkout: Full / Partial / Udhaar + change ya khata-deposit
   📴 Offline-safe • 💳 EMI auto-prompt on credit sale
   ⌨️ F1 guide • F2 scan • F7/F8 tabs • F9 checkout • F12 instant
   ═════════════════════════════════════════════════════════════ */

const HIDE_KEY = 'nafaa.mobile-pos.hide-prices';
const AUTO_CLOSE_KEY = 'nafaa.mobile-pos.auto-close-success';
const VIEW_MODE_KEY = 'nafaa.mobile-pos.view-mode';
const AUTO_PRINT_KEY = 'nafaa.mobile-pos.auto-print';       // 🖨️ default ON
const PRINTER_WIDTH_KEY = 'nafaa.mobile-pos.printer-width'; // '80' | '58'

type ViewMode = 'imei' | 'usedphone' | 'accessories' | 'repair';
type SaleMode = 'FULL_PAYMENT' | 'PARTIAL_CREDIT' | 'FULL_CREDIT';
type DiscountMode = 'pct' | 'rs';
type CheckoutMode = 'full' | 'partial' | 'credit';

interface CartLine {
  id: string;
  type: 'imei' | 'usedphone' | 'accessory';
  productId?: string;
  variantId?: string;
  imeiId?: string;
  imeiNumber?: string;
  usedPhoneId?: string;
  usedPhoneCode?: string;
  ptaStatus?: PtaStatus;
  warrantyMonths?: number;
  color?: string;
  name: string;
  image?: string;
  unitPrice: number;
  basePrice: number;
  quantity: number;
  stock: number;
  lineTotal: number;
  note?: string;
}

interface HeldCart { id: string; lines: CartLine[]; customerId: string; total: number; heldAt: number; }

const lineId = () => `l-${Date.now()}-${Math.random().toString(36).slice(2, 7)}`;
const heldId = () => `h-${Date.now()}-${Math.random().toString(36).slice(2, 7)}`;

const escapeHtml = (s: string) =>
  String(s ?? '').replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;');

/** Sale hone par ye sab query keys stale ho jati hain. */
const SALE_REFRESH_KEYS = [
  'mobile-pos-catalog',
  'imei-list', 'imei-stats', 'imei-global-list', 'imei-global-stats',
  'imei-product-list', 'imei-available', 'product-imeis',
  'used-phones', 'used-phones-stats',
  'products', 'mobile-products', 'mobile-catalog',
  'sales-list', 'dashboard-overview', 'mobile-dashboard',
  'customers', 'customers-stats',
];

/* ═══ 🖨️ DIRECT THERMAL PRINT — receipt page ke bina! ═══ */
interface PrintPayload {
  saleNumber: string;
  date: Date;
  shopName: string;
  shopPhone?: string;
  shopAddress?: string;
  customerName?: string;
  lines: Array<{ name: string; qty: number; detail?: string; price: number; total: number }>;
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
        <span class="iqty">${l.qty} × ${formatPKR(l.price)}</span>
        <span class="iamt">${formatPKR(l.total)}</span>
      </div>
      ${l.detail ? `<div class="idet">${escapeHtml(l.detail)}</div>` : ''}
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
  .idet { font-size: ${widthMm === '80' ? '9px' : '8px'}; font-weight: 600; }
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

/* ════════════════════════════════════════════════════════════ */

export default function MobilePosPage() {
  const queryClient = useQueryClient();
  const currentShopId = useAuthStore((s) => s.currentShopId);
  const tenant = useAuthStore((s) => s.tenant);
  const shopPhone = useAuthStore((s: any) => s.user?.assignedShop?.phone || s.tenant?.phone || '');
  const shopAddress = useAuthStore((s: any) => s.user?.assignedShop?.address || s.tenant?.address || '');

  const [viewMode, setViewMode] = useState<ViewMode>(() => (localStorage.getItem(VIEW_MODE_KEY) as ViewMode) || 'imei');
  const [hidePrices, setHidePrices] = useState(() => localStorage.getItem(HIDE_KEY) === 'true');
  const [autoClose, setAutoClose] = useState(() => localStorage.getItem(AUTO_CLOSE_KEY) !== 'false');
  const [autoPrint, setAutoPrint] = useState(() => localStorage.getItem(AUTO_PRINT_KEY) !== 'false');
  const [printerWidth, setPrinterWidth] = useState<'80' | '58'>(() => (localStorage.getItem(PRINTER_WIDTH_KEY) as '80' | '58') || '80');

  const [imeiSearch, setImeiSearch] = useState('');
  const [debouncedSearch, setDebouncedSearch] = useState('');
  const [usedPhoneSearch, setUsedPhoneSearch] = useState('');
  const [accSearch, setAccSearch] = useState('');
  const [repairSearch, setRepairSearch] = useState('');
  const [deliverTicket, setDeliverTicket] = useState<RepairTicket | null>(null);
  const [scannerOpen, setScannerOpen] = useState(false);
  const [barcodeInput, setBarcodeInput] = useState('');

  const [cart, setCart] = useState<CartLine[]>([]);
  const [customerId, setCustomerId] = useState('');
  const [showCustomerAdd, setShowCustomerAdd] = useState(false);
  const [newCustomer, setNewCustomer] = useState({ name: '', phone: '' });

  const [showTeacher, setShowTeacher] = useState(false);
  const [showSettings, setShowSettings] = useState(false);
  const [showDiscountModal, setShowDiscountModal] = useState(false);
  const [discountMode, setDiscountMode] = useState<DiscountMode>('rs');
  const [discountPct, setDiscountPct] = useState(0);
  const [discountRs, setDiscountRs] = useState(0);

  const [showCheckout, setShowCheckout] = useState(false);
  const [checkoutInit, setCheckoutInit] = useState<{ mode: CheckoutMode }>({ mode: 'full' });
  const [priceEditId, setPriceEditId] = useState<string | null>(null);
  const [emiPromptData, setEmiPromptData] = useState<any>(null);
  const [isOnline, setIsOnline] = useState(navigator.onLine);
  const [showHoldList, setShowHoldList] = useState(false);
  const [heldCarts, setHeldCarts] = useState<HeldCart[]>([]);
  const [showMobileCart, setShowMobileCart] = useState(false);
  const [lastSale, setLastSale] = useState<{
    id: string; number: string; change: number; total: number; deposited: boolean;
    printPayload: PrintPayload;
  } | null>(null);

  const searchRef = useRef<HTMLInputElement>(null);
  const barcodeRef = useRef<HTMLInputElement>(null);
  const successTimerRef = useRef<any>(null);

  useEffect(() => { localStorage.setItem(HIDE_KEY, String(hidePrices)); }, [hidePrices]);
  useEffect(() => { localStorage.setItem(AUTO_CLOSE_KEY, String(autoClose)); }, [autoClose]);
  useEffect(() => { localStorage.setItem(AUTO_PRINT_KEY, String(autoPrint)); }, [autoPrint]);
  useEffect(() => { localStorage.setItem(PRINTER_WIDTH_KEY, printerWidth); }, [printerWidth]);
  useEffect(() => { localStorage.setItem(VIEW_MODE_KEY, viewMode); }, [viewMode]);

  // Active tab ka search box hi server ko jaata hai (250ms debounce)
  useEffect(() => {
    const raw =
      viewMode === 'imei' ? imeiSearch
      : viewMode === 'usedphone' ? usedPhoneSearch
      : viewMode === 'accessories' ? accSearch
      : '';
    const t = setTimeout(() => setDebouncedSearch(raw.trim()), 250);
    return () => clearTimeout(t);
  }, [viewMode, imeiSearch, usedPhoneSearch, accSearch]);

  useEffect(() => {
    const on = () => { setIsOnline(true); toast.success('🟢 Internet wapas'); };
    const off = () => { setIsOnline(false); toast.warning('📴 Offline — sale queue me chali jayegi'); };
    window.addEventListener('online', on);
    window.addEventListener('offline', off);
    return () => { window.removeEventListener('online', on); window.removeEventListener('offline', off); };
  }, []);

  /* Barcode gun auto-refocus — koi modal open nahi to gun ready rahe */
  useEffect(() => {
    const anyModal = scannerOpen || showCheckout || showCustomerAdd || showHoldList ||
      lastSale || showTeacher || showDiscountModal || showSettings || deliverTicket || showMobileCart;
    if (anyModal) return;
    const active = document.activeElement as HTMLElement | null;
    if (active && active !== barcodeRef.current) {
      const tag = active.tagName;
      if (tag === 'INPUT' || tag === 'TEXTAREA' || tag === 'SELECT' || active.isContentEditable) return;
    }
    const t = setTimeout(() => barcodeRef.current?.focus(), 300);
    return () => clearTimeout(t);
  }, [scannerOpen, showCheckout, showCustomerAdd, showHoldList, lastSale, showTeacher, showDiscountModal, showSettings, deliverTicket, showMobileCart]);

  /* ── Data: POS catalog (ek call me teeno tabs) ── */
  const { data: catalog, isFetching: loadingCatalog } = useQuery({
    queryKey: ['mobile-pos-catalog', currentShopId, debouncedSearch],
    queryFn: () => mobilePosApi.catalog({
      shopId: currentShopId || undefined,
      search: debouncedSearch || undefined,
    }),
    enabled: Boolean(currentShopId),
    placeholderData: (prev) => prev,
    staleTime: 15_000,
  });

  const phoneResults: PosPhone[] = catalog?.phones ?? [];
  const accessories: PosAccessory[] = catalog?.accessories ?? [];
  const usedPhoneResults: UsedPhone[] = catalog?.usedPhones ?? [];
  const firstLoad = loadingCatalog && !catalog;
  const noShop = !currentShopId;

  /* ── Data: deliver hone ke liye tayyar repair tickets ── */
  const { data: readyTicketsData, isFetching: loadingRepairs } = useQuery({
    queryKey: ['repair-tickets', 'READY', 'pos'],
    queryFn: () => repairsApi.list({ status: 'READY', limit: 200 }),
    staleTime: 15_000,
  });
  const readyTickets = useMemo(() => {
    const list = readyTicketsData?.items ?? [];
    const q = repairSearch.toLowerCase().trim();
    if (!q) return list;
    return list.filter((t) =>
      t.ticketNumber.toLowerCase().includes(q) ||
      t.customerName.toLowerCase().includes(q) ||
      (t.customerPhone || '').includes(q) ||
      `${t.deviceBrand} ${t.deviceModel}`.toLowerCase().includes(q),
    );
  }, [readyTicketsData, repairSearch]);

  const { data: customersData } = useQuery({
    queryKey: ['customers-for-pos'],
    queryFn: () => customersApi.list({ page: 1, limit: 500 } as any),
  });
  const customers = customersData?.items ?? [];
  const selectedCustomer = customers.find((c: any) => c.id === customerId);

  /* ── Cart math ── */
  const excludedImeiIds = cart.filter((c) => c.imeiId).map((c) => c.imeiId!);
  const excludedUsedPhoneIds = cart.filter((c) => c.usedPhoneId).map((c) => c.usedPhoneId!);
  const availableImeis = phoneResults.filter((i) => !excludedImeiIds.includes(i.id));
  const availableUsedPhones = usedPhoneResults.filter((p: UsedPhone) => !excludedUsedPhoneIds.includes(p.id));
  const nonPtaInCart = cart.filter((c) => c.ptaStatus === 'NON_PTA' || c.ptaStatus === 'PENDING');

  const subtotal = useMemo(() => cart.reduce((s, l) => s + l.lineTotal, 0), [cart]);
  const discountAmount = useMemo(() => {
    if (discountMode === 'pct') return (subtotal * discountPct) / 100;
    return Math.min(Number(discountRs) || 0, subtotal);
  }, [subtotal, discountPct, discountRs, discountMode]);
  const total = useMemo(() => Math.max(subtotal - discountAmount, 0), [subtotal, discountAmount]);
  const itemCount = cart.length;
  const totalQty = useMemo(() => cart.reduce((s, l) => s + l.quantity, 0), [cart]);

  /* ── Cart ops ── */
  const addImeiToCart = useCallback((imei: PosPhone) => {
    setCart((prev) => {
      if (prev.some((c) => c.imeiId === imei.id)) { toast.error('Already in cart'); return prev; }
      const price = Number(imei.salePrice) || 0;
      if (price <= 0) {
        toast.error(`${imei.productName} ka sale price set nahi hai — pehle product edit karke price daalein`);
        return prev;
      }
      toast.success(`${imei.productName} — IMEI ${imei.imei1}`, { duration: 1200 });
      return [...prev, {
        id: lineId(),
        type: 'imei' as const,
        productId: imei.productId,
        variantId: imei.variantId || undefined,
        imeiId: imei.id,
        imeiNumber: imei.imei1,
        ptaStatus: imei.ptaStatus,
        warrantyMonths: imei.warrantyMonths || undefined,
        color: imei.color || imei.variant?.color || undefined,
        name: imei.productName || 'Mobile',
        image: imei.imageUrl ?? undefined,
        unitPrice: price,
        basePrice: price,
        quantity: 1,
        stock: 1,
        lineTotal: price,
        note: `IMEI: ${imei.imei1}${imei.imei2 ? ` / ${imei.imei2}` : ''} • ${PTA_STATUS_LABELS[imei.ptaStatus]}${imei.warrantyMonths ? ` • ${imei.warrantyMonths}m warranty` : ''}`,
      }];
    });
    setImeiSearch('');
  }, []);

  const addUsedPhoneToCart = useCallback((phone: UsedPhone) => {
    setCart((prev) => {
      if (prev.some((c) => c.usedPhoneId === phone.id)) { toast.error('Already in cart'); return prev; }
      const price = Number(phone.resalePrice) || 0;
      if (price <= 0) { toast.error(`${phone.brand} ${phone.model} ka resale price set nahi hai`); return prev; }
      toast.success(`${phone.brand} ${phone.model} — ${phone.usedPhoneCode}`, { duration: 1200 });
      return [...prev, {
        id: lineId(),
        type: 'usedphone' as const,
        usedPhoneId: phone.id,
        usedPhoneCode: phone.usedPhoneCode,
        ptaStatus: phone.ptaStatus,
        color: phone.color || undefined,
        name: `${phone.brand} ${phone.model}${phone.storage ? ` ${phone.storage}` : ''} (Used)`,
        unitPrice: price,
        basePrice: price,
        quantity: 1,
        stock: 1,
        lineTotal: price,
        note: `Used • ${phone.usedPhoneCode} • IMEI: ${phone.imei1} • ${CONDITION_LABELS[phone.condition]} • ${PTA_STATUS_LABELS[phone.ptaStatus]}`,
      }];
    });
    setUsedPhoneSearch('');
  }, []);

  const addAccessory = useCallback((product: PosAccessory) => {
    if (product.notInShop) {
      return toast.error(`${product.name} is shop me assign nahi — Transfer ya Purchase entry karein`);
    }
    if (product.stock <= 0) return toast.error('Stock khatam');
    if (product.price <= 0) return toast.error(`${product.name} ka price set nahi hai`);
    setCart((prev) => {
      const existing = prev.find((c) => c.type === 'accessory' && c.productId === product.id);
      if (existing) {
        if (existing.quantity >= product.stock) { toast.error(`Stock sirf ${product.stock}`); return prev; }
        toast.success(`${product.name} +1`, { duration: 900 });
        return prev.map((c) => c.id === existing.id ? { ...c, quantity: c.quantity + 1, lineTotal: (c.quantity + 1) * c.unitPrice } : c);
      }
      toast.success(`${product.name} added`, { duration: 900 });
      return [...prev, {
        id: lineId(), type: 'accessory' as const, productId: product.id,
        name: product.name, image: product.imageUrl ?? undefined,
        unitPrice: product.price, basePrice: product.price,
        quantity: 1, stock: product.stock, lineTotal: product.price,
      }];
    });
  }, []);

  const changeQty = (id: string, delta: number) => {
    setCart((prev) => prev.flatMap((l) => {
      if (l.id !== id || l.type !== 'accessory') return [l];
      const q = l.quantity + delta;
      if (q <= 0) return [];
      if (q > l.stock) { toast.error(`Stock sirf ${l.stock}`); return [l]; }
      return [{ ...l, quantity: q, lineTotal: q * l.unitPrice }];
    }));
  };

  const removeLine = (id: string) => setCart((prev) => prev.filter((l) => l.id !== id));
  const clearCart = useCallback(() => {
    setCart([]); setCustomerId(''); setDiscountPct(0); setDiscountRs(0);
  }, []);

  const setLinePrice = (id: string, price: number) => {
    setCart((prev) => prev.map((l) => l.id === id ? { ...l, unitPrice: Math.max(price, 0), lineTotal: l.quantity * Math.max(price, 0) } : l));
    setPriceEditId(null);
  };

  const handleBarcode = useCallback(async (code: string) => {
    setScannerOpen(false);
    const trimmed = code.trim();
    if (!trimmed) return;
    /* Pehle loaded catalog me exact IMEI match — foran add, search ki zaroorat nahi */
    const exactPhone = phoneResults.find((p) => p.imei1 === trimmed || (p as any).imei2 === trimmed);
    if (exactPhone) { addImeiToCart(exactPhone); return; }
    const exactUsed = usedPhoneResults.find((p: UsedPhone) => p.imei1 === trimmed || p.usedPhoneCode === trimmed);
    if (exactUsed) { addUsedPhoneToCart(exactUsed); return; }
    const exactAcc = accessories.find((a) => (a as any).barcode === trimmed || (a as any).sku === trimmed);
    if (exactAcc) { addAccessory(exactAcc); return; }
    /* Warna search me daal do */
    setViewMode('imei');
    setImeiSearch(trimmed);
    toast.info(`"${trimmed}" search ho raha hai...`);
  }, [phoneResults, usedPhoneResults, accessories, addImeiToCart, addUsedPhoneToCart, addAccessory]);

  /* ─── Hold carts ─── */
  const holdCart = () => {
    if (cart.length === 0) return;
    setHeldCarts((prev) => [...prev, { id: heldId(), lines: cart, customerId, total, heldAt: Date.now() }]);
    clearCart();
    toast.success('Cart hold ho gaya');
  };
  const resumeCart = (h: HeldCart) => {
    setCart(h.lines);
    setCustomerId(h.customerId);
    setHeldCarts((prev) => prev.filter((x) => x.id !== h.id));
    setShowHoldList(false);
    toast.success('Cart resume ho gaya');
  };
  const deleteHeld = (id: string) => setHeldCarts((prev) => prev.filter((h) => h.id !== id));

  /* ── Mutations ── */
  const addCustomerMutation = useMutation({
    mutationFn: customersApi.create,
    onSuccess: (c: any) => {
      toast.success(`${c.name} add ho gaya`);
      setCustomerId(c.id);
      setShowCustomerAdd(false);
      setNewCustomer({ name: '', phone: '' });
      queryClient.invalidateQueries({ queryKey: ['customers-for-pos'] });
    },
    onError: (e: any) => toast.error(e?.response?.data?.message || 'Add fail hua'),
  });

  const closeSuccessModal = useCallback(() => {
    if (successTimerRef.current) { clearTimeout(successTimerRef.current); successTimerRef.current = null; }
    setLastSale(null);
    setTimeout(() => barcodeRef.current?.focus(), 100);
  }, []);

  const refreshAfterSale = useCallback(() => {
    queryClient.invalidateQueries({
      predicate: (q) => {
        const k = String(q.queryKey?.[0] ?? '');
        return SALE_REFRESH_KEYS.includes(k) || k.startsWith('mobile-reports');
      },
    });
  }, [queryClient]);

  /* ═══ CHECKOUT — with DIRECT PRINT ═══ */
  const checkoutMutation = useMutation({
    mutationFn: (data: { paymentMethod: PaymentMethod; paidAmount: number; depositExtra?: boolean }) => {
      if (!currentShopId) throw new Error('Shop select karein');
      return offlineSalesApi.create({
        shopId: currentShopId,
        customerId: customerId || undefined,
        paymentMethod: data.paymentMethod,
        paidAmount: data.paidAmount,
        discount: discountAmount,
        items: cart.map((c) => ({
          ...(c.productId ? { productId: c.productId } : {}),
          ...(c.usedPhoneId ? { usedPhoneId: c.usedPhoneId } : {}),
          variantId: c.variantId,
          imeiId: c.imeiId,
          quantity: c.quantity,
          priceOverride: c.unitPrice,
          note: c.note,
        })),
      });
    },
    onSuccess: (sale: any, vars: any) => {
      const paid = vars.paidAmount;
      const change = Math.max(paid - total, 0);
      const creditAmt = Math.max(total - paid, 0);
      const payLabel = PAYMENT_METHODS.find((m) => m.id === vars.paymentMethod)?.label || vars.paymentMethod;

      /* 🖨️ Snapshot for print — cart clear hone se PEHLE */
      const printPayload: PrintPayload = {
        saleNumber: sale.saleNumber || 'N/A',
        date: new Date(),
        shopName: tenant?.name || 'My Shop',
        shopPhone, shopAddress,
        customerName: selectedCustomer?.name,
        lines: cart.map((l) => ({
          name: l.name,
          qty: l.quantity,
          detail: l.type === 'accessory' ? undefined : l.note,
          price: l.unitPrice,
          total: l.lineTotal,
        })),
        subtotal, discount: discountAmount, total,
        paid,
        paymentLabel: `Paid (${payLabel})`,
      };

      setLastSale({ id: sale.id, number: sale.saleNumber, change, total, deposited: vars.depositExtra === true, printPayload });
      setShowCheckout(false);
      setShowMobileCart(false);

      /* 💳 EMI prompt — credit sale with device + customer */
      const hasImei = cart.some((c) => c.imeiId || c.usedPhoneId);
      if (hasImei && customerId && selectedCustomer && creditAmt > 0) {
        setEmiPromptData({
          saleId: sale.id, saleNumber: sale.saleNumber, saleTotal: sale.total ?? total,
          paidAmount: sale.paidAmount ?? paid,
          customerId, customerName: selectedCustomer.name, customerPhone: selectedCustomer.phone ?? undefined,
        });
      }

      clearCart();
      refreshAfterSale();

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
      else toast.error(e?.response?.data?.message || 'Sale fail hui');
    },
  });

  const deliverMutation = useMutation({
    mutationFn: (vars: { id: string; amount: number; paymentMethod: PaymentMethod }) =>
      repairsApi.deliver(vars.id, {
        amount: vars.amount,
        paymentMethod: vars.paymentMethod,
      }),
    onSuccess: (res) => {
      const t = deliverTicket;
      setDeliverTicket(null);
      toast.success(
        res.sale
          ? `✓ ${t?.ticketNumber} deliver — sale ${res.sale.saleNumber} ban gayi`
          : `✓ ${t?.ticketNumber} deliver ho gaya`,
      );
      queryClient.invalidateQueries({
        predicate: (q) => {
          const k = String(q.queryKey?.[0] ?? '');
          return SALE_REFRESH_KEYS.includes(k) || k.startsWith('mobile-reports') || k === 'repair-tickets' || k === 'repair-stats';
        },
      });
    },
    onError: (e: any) => toast.error(e?.response?.data?.message || 'Deliver fail hua'),
  });

  /* 🛡️ Non-PTA guard — checkout kholne se pehle */
  const ptaGuard = useCallback((): boolean => {
    if (nonPtaInCart.length > 0) {
      return confirm(`⚠️ ${nonPtaInCart.length} device(s) Non-PTA/Pending hain. Phir bhi bechna hai?`);
    }
    return true;
  }, [nonPtaInCart.length]);

  const openCheckout = useCallback((mode: CheckoutMode = 'full') => {
    if (cart.length === 0) return;
    if (!currentShopId) { toast.error('Pehle shop select karein'); return; }
    if (mode !== 'full' && !customerId) { toast.error('Udhaar ke liye pehle customer chunein'); return; }
    if (!ptaGuard()) return;
    setCheckoutInit({ mode });
    setShowCheckout(true);
  }, [cart.length, currentShopId, customerId, ptaGuard]);

  /* ⚡ F12 — INSTANT CASH (scan → F12 → print. Bas!) */
  const instantCash = useCallback(() => {
    if (cart.length === 0) { toast.error('Cart khaali hai'); return; }
    if (!currentShopId) { toast.error('Pehle shop select karein'); return; }
    if (checkoutMutation.isPending) return;
    if (!ptaGuard()) return;
    checkoutMutation.mutate({ paymentMethod: 'CASH', paidAmount: total });
  }, [cart.length, currentShopId, total, checkoutMutation, ptaGuard]);

  /* ─── Shortcuts ─── */
  useEffect(() => {
    const onKey = (e: KeyboardEvent) => {
      const tag = document.activeElement?.tagName;
      const typing = tag === 'INPUT' || tag === 'TEXTAREA' || tag === 'SELECT';
      if (e.key === 'F1' && !typing) { e.preventDefault(); setShowTeacher(true); }
      if (e.key === 'F2') { e.preventDefault(); setScannerOpen(true); }
      if (e.key === 'F7') { e.preventDefault(); setViewMode('imei'); }
      if (e.key === 'F8') { e.preventDefault(); setViewMode('usedphone'); }
      if (e.key === 'F9') { e.preventDefault(); openCheckout('full'); }
      if (e.key === 'F12') { e.preventDefault(); instantCash(); }
      if (e.key === 'Escape') {
        if (showSettings) setShowSettings(false);
        else if (showDiscountModal) setShowDiscountModal(false);
        else if (showTeacher) setShowTeacher(false);
        else if (scannerOpen) setScannerOpen(false);
        else if (showCheckout) setShowCheckout(false);
        else if (showHoldList) setShowHoldList(false);
        else if (showMobileCart) setShowMobileCart(false);
        else if (priceEditId) setPriceEditId(null);
        else if (lastSale) closeSuccessModal();
      }
    };
    window.addEventListener('keydown', onKey);
    return () => window.removeEventListener('keydown', onKey);
  }, [showDiscountModal, showTeacher, scannerOpen, showHoldList, priceEditId, showSettings, showCheckout, showMobileCart, lastSale, openCheckout, instantCash, closeSuccessModal]);

  return (
    <>
      {scannerOpen && <BarcodeScanner onDetected={handleBarcode} onClose={() => setScannerOpen(false)} />}
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
          subtotal={subtotal} mode={discountMode} pct={discountPct} rs={Number(discountRs) || 0}
          onApply={(m, p, r) => {
            setDiscountMode(m); setDiscountPct(p); setDiscountRs(r);
            setShowDiscountModal(false);
            if (m === 'pct' ? p > 0 : r > 0) toast.success(`Discount: ${m === 'pct' ? p + '%' : formatPKR(r)}`);
          }}
          onClose={() => setShowDiscountModal(false)}
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
          onConfirm={(d) => checkoutMutation.mutate({ paymentMethod: d.paymentMethod, paidAmount: d.paidAmount, depositExtra: d.depositExtra } as any)}
          onClose={() => setShowCheckout(false)}
        />
      )}

      {emiPromptData && (
        <QuickEmiFromSaleModal
          saleId={emiPromptData.saleId}
          saleNumber={emiPromptData.saleNumber}
          saleTotal={emiPromptData.saleTotal}
          paidAmount={emiPromptData.paidAmount}
          customerId={emiPromptData.customerId}
          customerName={emiPromptData.customerName}
          customerPhone={emiPromptData.customerPhone}
          onSuccess={() => { setEmiPromptData(null); toast.success('EMI plan ban gaya!'); }}
          onClose={() => setEmiPromptData(null)}
        />
      )}

      {deliverTicket && (
        <DeliverRepairModal
          ticket={deliverTicket}
          pending={deliverMutation.isPending}
          onClose={() => setDeliverTicket(null)}
          onConfirm={(amount, paymentMethod) =>
            deliverMutation.mutate({ id: deliverTicket.id, amount, paymentMethod })
          }
        />
      )}

      {/* 👤 CUSTOMER ADD */}
      {showCustomerAdd && (
        <div className="fixed inset-0 z-50 bg-slate-950/80 backdrop-blur-sm flex items-center justify-center p-4">
          <div className="w-full max-w-md bg-white dark:bg-slate-900 rounded-3xl shadow-2xl overflow-hidden">
            <div className="px-5 py-4 bg-gradient-to-br from-blue-600 to-indigo-700 text-white flex items-center justify-between">
              <div className="flex items-center gap-2"><UserPlus className="h-6 w-6" /><h3 className="font-extrabold text-xl">Naya Customer</h3></div>
              <button onClick={() => setShowCustomerAdd(false)} className="h-11 w-11 rounded-2xl bg-white/15 hover:bg-white/25 active:scale-95 flex items-center justify-center"><X className="h-5 w-5" /></button>
            </div>
            <div className="p-5 space-y-3">
              <input autoFocus value={newCustomer.name} onChange={(e) => setNewCustomer({ ...newCustomer, name: e.target.value })}
                placeholder="Customer ka naam"
                className="h-16 w-full rounded-2xl border-4 border-slate-200 dark:border-slate-700 bg-white dark:bg-slate-800 px-4 text-xl font-bold text-slate-900 dark:text-white focus:outline-none focus:border-blue-500" />
              <input value={newCustomer.phone} onChange={(e) => setNewCustomer({ ...newCustomer, phone: e.target.value })}
                placeholder="03XX XXXXXXX"
                className="h-16 w-full rounded-2xl border-4 border-slate-200 dark:border-slate-700 bg-white dark:bg-slate-800 px-4 text-xl font-bold text-slate-900 dark:text-white focus:outline-none focus:border-blue-500" />
              <button onClick={() => {
                if (!newCustomer.name.trim()) return toast.error('Naam likhein');
                addCustomerMutation.mutate({ name: newCustomer.name.trim(), phone: newCustomer.phone.trim() || undefined } as any);
              }} disabled={addCustomerMutation.isPending}
                className="w-full h-16 rounded-2xl bg-gradient-to-r from-blue-600 to-indigo-700 hover:from-blue-700 active:scale-95 font-extrabold text-white text-xl shadow-lg transition disabled:opacity-50">
                Add Karein
              </button>
            </div>
          </div>
        </div>
      )}

      {/* ⏸️ HELD CARTS */}
      {showHoldList && (
        <div className="fixed inset-0 z-50 bg-slate-950/80 backdrop-blur-sm flex items-center justify-center p-4">
          <div className="w-full max-w-lg bg-white dark:bg-slate-900 rounded-3xl shadow-2xl overflow-hidden max-h-[85vh] flex flex-col">
            <div className="px-5 py-4 bg-gradient-to-br from-amber-600 to-orange-700 text-white flex items-center justify-between">
              <div className="flex items-center gap-2"><Pause className="h-6 w-6" /><h3 className="font-extrabold text-xl">Hold Carts</h3></div>
              <button onClick={() => setShowHoldList(false)} className="h-11 w-11 rounded-2xl bg-white/15 hover:bg-white/25 flex items-center justify-center"><X className="h-5 w-5" /></button>
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
                    <Smartphone className="h-6 w-6" />
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
              <h3 className="text-2xl font-extrabold">Sale Ho Gayi! 📱</h3>
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
              <button onClick={closeSuccessModal} className="h-14 rounded-2xl bg-gradient-to-r from-blue-600 to-indigo-600 hover:from-blue-700 hover:to-indigo-700 active:scale-95 font-extrabold text-white text-lg shadow-lg transition inline-flex items-center justify-center gap-2">
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

      <div className="min-h-[calc(100dvh-5rem)] lg:h-[calc(100dvh-7rem)] flex flex-col lg:grid lg:grid-cols-[1fr_400px] xl:grid-cols-[1fr_440px] gap-2 lg:gap-3">

        {/* ════════ SEARCH SIDE ════════ */}
        <section className="lg:flex-1 rounded-2xl lg:rounded-3xl bg-white dark:bg-slate-900/80 dark:backdrop-blur-sm border-2 border-slate-200 dark:border-slate-800 shadow-sm dark:shadow-black/20 lg:overflow-hidden flex flex-col lg:min-h-0">

          {/* HEADER */}
          <div className="shrink-0 relative overflow-hidden bg-gradient-to-br from-slate-950 via-blue-900 to-indigo-700 dark:from-slate-950 dark:via-blue-950 dark:to-indigo-900 text-white">
            <div className="absolute -top-10 -right-10 h-32 w-32 rounded-full bg-blue-400/20 blur-2xl" />
            <div className="relative px-3 sm:px-4 py-2.5 flex items-center justify-between gap-2">
              <div className="flex items-center gap-2 sm:gap-3 min-w-0">
                <div className="h-10 w-10 sm:h-11 sm:w-11 rounded-2xl bg-white/15 backdrop-blur flex items-center justify-center ring-2 ring-white/20 shrink-0">
                  <Smartphone className="h-5 w-5 sm:h-6 sm:w-6" />
                </div>
                <div className="min-w-0">
                  <div className="flex items-center gap-2">
                    <h2 className="text-base sm:text-lg font-extrabold leading-none">📱 Mobile POS</h2>
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
                      <div className="h-6 px-2 rounded-full bg-blue-500/30 flex items-center gap-1" title={`Auto-print ON (${printerWidth}mm)`}>
                        <Printer className="h-3 w-3 text-blue-200" />
                        <span className="text-[9px] font-extrabold text-blue-200">{printerWidth}mm</span>
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
                <button onClick={() => setShowSettings(true)} title="Settings"
                  className="h-10 w-10 sm:h-11 sm:w-11 rounded-2xl bg-white/15 hover:bg-white/25 active:scale-95 flex items-center justify-center border-2 border-white/20 transition">
                  <Settings2 className="h-5 w-5" />
                </button>
                <button onClick={() => setShowTeacher(true)} title="Guide (F1)"
                  className="h-10 w-10 sm:h-11 sm:w-11 rounded-2xl bg-amber-400/90 hover:bg-amber-400 text-slate-900 active:scale-95 flex items-center justify-center shadow-lg transition">
                  <GraduationCap className="h-5 w-5" />
                </button>
                {heldCarts.length > 0 && (
                  <button onClick={() => setShowHoldList(true)}
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
              <ViewTab active={viewMode === 'imei'} onClick={() => setViewMode('imei')} icon={Smartphone} label="New" count={phoneResults.length} color="blue" shortcut="F7" />
              <ViewTab active={viewMode === 'usedphone'} onClick={() => setViewMode('usedphone')} icon={RefreshCw} label="Used" count={usedPhoneResults.length} color="violet" shortcut="F8" highlight={(catalog?.usedPhonesPendingInspection ?? 0) > 0} />
              <ViewTab active={viewMode === 'accessories'} onClick={() => setViewMode('accessories')} icon={Cable} label="Accessories" count={accessories.length} color="emerald" />
              <ViewTab active={viewMode === 'repair'} onClick={() => setViewMode('repair')} icon={Wrench} label="Repair" count={readyTickets.length} color="amber" highlight={readyTickets.length > 0} />
            </div>
          </div>

          {/* SEARCH + BARCODE */}
          <div className="shrink-0 px-3 sm:px-4 py-2.5 bg-slate-50 dark:bg-slate-900/60 border-b-2 border-slate-100 dark:border-slate-800 space-y-2">
            {viewMode !== 'repair' ? (
              <div className="flex gap-2">
                <div className="relative flex-1">
                  {viewMode === 'imei' && <Smartphone className="h-5 w-5 sm:h-6 sm:w-6 text-blue-600 dark:text-blue-400 absolute left-3 sm:left-4 top-1/2 -translate-y-1/2" />}
                  {viewMode === 'usedphone' && <RefreshCw className="h-5 w-5 sm:h-6 sm:w-6 text-violet-600 dark:text-violet-400 absolute left-3 sm:left-4 top-1/2 -translate-y-1/2" />}
                  {viewMode === 'accessories' && <Search className="h-5 w-5 sm:h-6 sm:w-6 text-slate-400 absolute left-3 sm:left-4 top-1/2 -translate-y-1/2" />}
                  <input
                    ref={viewMode === 'imei' ? searchRef : undefined}
                    className={[
                      'h-14 sm:h-16 w-full rounded-2xl border-4 bg-white dark:bg-slate-800 pl-11 sm:pl-14 pr-10 sm:pr-12 text-lg sm:text-xl font-bold text-slate-900 dark:text-white placeholder:text-slate-400 dark:placeholder:text-slate-500 focus:outline-none focus:ring-4 transition',
                      viewMode === 'imei' ? 'border-blue-300 dark:border-blue-500/40 focus:border-blue-600 focus:ring-blue-200 dark:focus:ring-blue-500/20'
                      : viewMode === 'usedphone' ? 'border-violet-300 dark:border-violet-500/40 focus:border-violet-600 focus:ring-violet-200 dark:focus:ring-violet-500/20'
                      : 'border-slate-200 dark:border-slate-700 focus:border-emerald-500 focus:ring-emerald-200 dark:focus:ring-emerald-500/20',
                    ].join(' ')}
                    placeholder={viewMode === 'imei' ? 'IMEI, model ya brand...' : viewMode === 'usedphone' ? 'Code / IMEI / model...' : 'Charger, cover, handsfree...'}
                    value={viewMode === 'imei' ? imeiSearch : viewMode === 'usedphone' ? usedPhoneSearch : accSearch}
                    onChange={(e) => {
                      const v = e.target.value;
                      if (viewMode === 'imei') setImeiSearch(v);
                      else if (viewMode === 'usedphone') setUsedPhoneSearch(v);
                      else setAccSearch(v);
                    }}
                  />
                  {((viewMode === 'imei' && imeiSearch) || (viewMode === 'usedphone' && usedPhoneSearch) || (viewMode === 'accessories' && accSearch)) && (
                    <button onClick={() => { setImeiSearch(''); setUsedPhoneSearch(''); setAccSearch(''); }}
                      className="absolute right-2.5 top-1/2 -translate-y-1/2 h-9 w-9 sm:h-10 sm:w-10 rounded-xl hover:bg-slate-100 dark:hover:bg-slate-700 active:scale-95 flex items-center justify-center transition">
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
            ) : (
              <div className="relative">
                <Wrench className="h-5 w-5 sm:h-6 sm:w-6 text-amber-600 dark:text-amber-400 absolute left-3 sm:left-4 top-1/2 -translate-y-1/2" />
                <input
                  className="h-14 sm:h-16 w-full rounded-2xl border-4 border-amber-300 dark:border-amber-500/40 bg-white dark:bg-slate-800 pl-11 sm:pl-14 pr-10 text-lg sm:text-xl font-bold text-slate-900 dark:text-white placeholder:text-slate-400 dark:placeholder:text-slate-500 focus:outline-none focus:border-amber-500 focus:ring-4 focus:ring-amber-200 dark:focus:ring-amber-500/20 transition"
                  placeholder="Ticket # / customer / phone / model..."
                  value={repairSearch}
                  onChange={(e) => setRepairSearch(e.target.value)}
                />
                {repairSearch && (
                  <button onClick={() => setRepairSearch('')} className="absolute right-2.5 top-1/2 -translate-y-1/2 h-9 w-9 rounded-xl hover:bg-slate-100 dark:hover:bg-slate-700 flex items-center justify-center">
                    <X className="h-5 w-5 text-slate-500" />
                  </button>
                )}
              </div>
            )}

            {viewMode !== 'repair' && (
              <form onSubmit={(e) => { e.preventDefault(); if (barcodeInput.trim()) { handleBarcode(barcodeInput); setBarcodeInput(''); } }} className="relative">
                <ScanLine className="h-4 w-4 sm:h-5 sm:w-5 text-emerald-600 dark:text-emerald-400 absolute left-3 top-1/2 -translate-y-1/2" />
                <input ref={barcodeRef} value={barcodeInput} onChange={(e) => setBarcodeInput(e.target.value)}
                  placeholder="Barcode gun ready... (IMEI / used code / accessory)"
                  className="h-10 sm:h-12 w-full rounded-2xl border-2 border-emerald-300 dark:border-emerald-500/40 bg-emerald-50 dark:bg-emerald-500/10 pl-10 sm:pl-11 pr-3 text-sm sm:text-base font-mono font-extrabold text-emerald-900 dark:text-emerald-200 placeholder:text-emerald-400 dark:placeholder:text-emerald-600 focus:outline-none focus:border-emerald-600 focus:ring-2 focus:ring-emerald-200 dark:focus:ring-emerald-500/20" />
              </form>
            )}
          </div>

          {/* CONTENT */}
          <div className="lg:flex-1 lg:overflow-y-auto p-2 sm:p-3 bg-slate-50/50 dark:bg-slate-950/40 lg:min-h-0">

            {/* ── NEW PHONES (IMEI) ── */}
            {viewMode === 'imei' && (
              <div className="space-y-2">
                {noShop ? (
                  <EmptyState icon={AlertOctagon} title="Pehle shop select karein" hint="Upar se apni shop chunein — stock usi shop ka dikhega" tone="amber" />
                ) : firstLoad ? (
                  Array.from({ length: 4 }).map((_, i) => <div key={i} className="h-24 rounded-2xl bg-slate-200 dark:bg-slate-800 animate-pulse" />)
                ) : availableImeis.length === 0 ? (
                  debouncedSearch ? (
                    <EmptyState icon={AlertTriangle} title="Koi phone nahi mila" hint={`"${debouncedSearch}" se kuch match nahi hua — IMEI ya model dobara check karo`} tone="amber" />
                  ) : (
                    <EmptyState icon={Smartphone} title="Koi naya phone stock me nahi" hint="IMEI Inventory ya Purchase page se phone ka IMEI add karo, phir yahan bikega" />
                  )
                ) : (
                  availableImeis.map((imei) => {
                    const ptaCfg = PTA_STATUS_COLORS[imei.ptaStatus];
                    const risky = imei.ptaStatus === 'NON_PTA' || imei.ptaStatus === 'PENDING';
                    return (
                      <button key={imei.id} onClick={() => addImeiToCart(imei)}
                        className={`w-full rounded-2xl bg-white dark:bg-slate-900 border-4 hover:shadow-lg p-3 flex items-start gap-3 text-left transition active:scale-[0.99] ${risky ? 'border-amber-300 dark:border-amber-500/40' : 'border-slate-200 dark:border-slate-700 hover:border-blue-400 dark:hover:border-blue-500/50'}`}>
                        <div className="h-14 w-14 sm:h-16 sm:w-16 rounded-xl bg-blue-100 dark:bg-blue-500/20 overflow-hidden flex items-center justify-center shrink-0">
                          {imei.imageUrl ? (
                            <img src={imei.imageUrl} alt="" className="w-full h-full object-cover" />
                          ) : <Smartphone className="h-7 w-7 text-blue-600 dark:text-blue-300" />}
                        </div>
                        <div className="flex-1 min-w-0">
                          <div className="font-extrabold text-sm sm:text-base text-slate-900 dark:text-white truncate">{imei.productName}</div>
                          {imei.variant?.name && <div className="text-xs font-semibold text-violet-700 dark:text-violet-400">{imei.variant.name}</div>}
                          <div className="text-xs font-mono text-slate-600 dark:text-slate-400 mt-0.5">IMEI: <strong>{imei.imei1}</strong></div>
                          <div className="mt-1.5 flex flex-wrap gap-1">
                            <span className={`inline-flex items-center gap-1 px-1.5 py-0.5 rounded border text-[9px] font-extrabold uppercase ${ptaCfg.bg} ${ptaCfg.text} ${ptaCfg.border}`}>
                              <ShieldCheck className="h-2.5 w-2.5" />{PTA_STATUS_LABELS[imei.ptaStatus]}
                            </span>
                            {(imei.warrantyMonths ?? 0) > 0 && (
                              <span className="px-1.5 py-0.5 rounded bg-teal-100 dark:bg-teal-500/20 text-teal-700 dark:text-teal-300 text-[9px] font-extrabold inline-flex items-center gap-0.5"><Award className="h-2.5 w-2.5" />{imei.warrantyMonths}m</span>
                            )}
                            {imei.color && <span className="px-1.5 py-0.5 rounded bg-violet-100 dark:bg-violet-500/20 text-violet-700 dark:text-violet-300 text-[9px] font-extrabold">{imei.color}</span>}
                          </div>
                        </div>
                        <div className="text-right shrink-0">
                          <div className={`text-lg sm:text-xl font-extrabold tabular-nums ${imei.salePrice > 0 ? 'text-emerald-700 dark:text-emerald-400' : 'text-rose-600 dark:text-rose-400'}`}>
                            {hidePrices ? '••••' : imei.salePrice > 0 ? formatPKR(imei.salePrice) : 'Price nahi'}
                          </div>
                          <Plus className="h-4 w-4 text-blue-600 dark:text-blue-400 ml-auto mt-1" />
                        </div>
                      </button>
                    );
                  })
                )}
              </div>
            )}

            {/* ── USED PHONES ── */}
            {viewMode === 'usedphone' && (
              <div className="space-y-2">
                {noShop ? (
                  <EmptyState icon={AlertOctagon} title="Pehle shop select karein" hint="Upar se apni shop chunein" tone="amber" />
                ) : firstLoad ? (
                  Array.from({ length: 3 }).map((_, i) => <div key={i} className="h-24 rounded-2xl bg-slate-200 dark:bg-slate-800 animate-pulse" />)
                ) : availableUsedPhones.length === 0 ? (
                  (catalog?.usedPhonesPendingInspection ?? 0) > 0 ? (
                    <EmptyState
                      icon={AlertTriangle}
                      tone="amber"
                      title={`${catalog?.usedPhonesPendingInspection} phone inspection me atka hai`}
                      hint="Used Phones page kholo → inspection mukammal karo → 'Mark In Stock' dabao. Uske baad phone yahan bikne ke liye aa jayega."
                    />
                  ) : (
                    <EmptyState icon={RefreshCw} title="Koi used phone in-stock nahi" hint="Trade-in page se pehle used phone add karo, phir yahan bikega" />
                  )
                ) : (
                  availableUsedPhones.map((phone: UsedPhone) => {
                    const ptaCfg = PTA_STATUS_COLORS[phone.ptaStatus];
                    const condColors = CONDITION_COLORS[phone.condition];
                    const risky = phone.ptaStatus === 'NON_PTA' || phone.ptaStatus === 'PENDING';
                    return (
                      <button key={phone.id} onClick={() => addUsedPhoneToCart(phone)}
                        className={`w-full rounded-2xl bg-white dark:bg-slate-900 border-4 hover:shadow-lg p-3 flex items-start gap-3 text-left transition active:scale-[0.99] ${risky ? 'border-amber-300 dark:border-amber-500/40' : 'border-slate-200 dark:border-slate-700 hover:border-violet-400 dark:hover:border-violet-500/50'}`}>
                        <div className="h-14 w-14 sm:h-16 sm:w-16 rounded-xl bg-violet-100 dark:bg-violet-500/20 overflow-hidden flex items-center justify-center shrink-0">
                          <RefreshCw className="h-7 w-7 text-violet-600 dark:text-violet-300" />
                        </div>
                        <div className="flex-1 min-w-0">
                          <div className="font-mono font-extrabold text-[10px] text-violet-700 dark:text-violet-300">{phone.usedPhoneCode}</div>
                          <div className="font-extrabold text-sm sm:text-base text-slate-900 dark:text-white truncate">{phone.brand} {phone.model}{phone.storage ? ` ${phone.storage}` : ''}</div>
                          <div className="text-xs font-mono text-slate-600 dark:text-slate-400 mt-0.5">IMEI: <strong>{phone.imei1}</strong></div>
                          <div className="mt-1.5 flex flex-wrap gap-1">
                            <span className={`px-1.5 py-0.5 rounded text-[9px] font-extrabold border ${condColors.bg} ${condColors.text} ${condColors.border}`}>
                              <Star className="h-2.5 w-2.5 inline mr-0.5 fill-current" />{CONDITION_LABELS[phone.condition]}
                            </span>
                            <span className={`inline-flex items-center gap-1 px-1.5 py-0.5 rounded border text-[9px] font-extrabold uppercase ${ptaCfg.bg} ${ptaCfg.text} ${ptaCfg.border}`}>
                              <ShieldCheck className="h-2.5 w-2.5" />{PTA_STATUS_LABELS[phone.ptaStatus]}
                            </span>
                          </div>
                        </div>
                        <div className="text-right shrink-0">
                          <div className="text-lg sm:text-xl font-extrabold text-emerald-700 dark:text-emerald-400 tabular-nums">{hidePrices ? '••••' : formatPKR(phone.resalePrice)}</div>
                          <Plus className="h-4 w-4 text-violet-600 dark:text-violet-400 ml-auto mt-1" />
                        </div>
                      </button>
                    );
                  })
                )}
              </div>
            )}

            {/* ── ACCESSORIES ── */}
            {viewMode === 'accessories' && (
              noShop ? (
                <EmptyState icon={AlertOctagon} title="Pehle shop select karein" hint="Upar se apni shop chunein — stock usi shop ka dikhega" tone="amber" />
              ) : firstLoad ? (
                <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-4 gap-2.5">
                  {Array.from({ length: 8 }).map((_, i) => <div key={i} className="aspect-[3/4] rounded-2xl bg-slate-200 dark:bg-slate-800 animate-pulse" />)}
                </div>
              ) : accessories.length === 0 ? (
                <EmptyState icon={Cable} title="Koi accessory nahi mili" hint="Products page se accessory add karo (naya phone IMEI wale products yahan nahi aate)" />
              ) : (
                <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-4 gap-2 sm:gap-3">
                  {accessories.map((p) => {
                    const blocked = p.notInShop || p.stock <= 0;
                    const inCart = cart.find((c) => c.type === 'accessory' && c.productId === p.id);
                    return (
                      <button key={p.id} onClick={() => addAccessory(p)} disabled={blocked}
                        className={['group relative text-left rounded-2xl border-4 overflow-hidden transition-all active:scale-95 bg-white dark:bg-slate-900',
                          blocked ? 'opacity-50 cursor-not-allowed border-slate-200 dark:border-slate-700'
                          : inCart ? 'border-emerald-500 bg-emerald-50 dark:bg-emerald-500/15 shadow-xl ring-4 ring-emerald-200 dark:ring-emerald-500/30'
                          : 'border-slate-200 dark:border-slate-700 hover:border-emerald-400 dark:hover:border-emerald-500/50 hover:shadow-xl hover:-translate-y-1'].join(' ')}>
                        {inCart && (
                          <div className="absolute -top-2 -right-2 min-w-[32px] h-8 px-2 rounded-full bg-emerald-600 text-white text-sm font-extrabold flex items-center justify-center shadow-xl ring-4 ring-white dark:ring-slate-900 z-10 tabular-nums">
                            {inCart.quantity}
                          </div>
                        )}
                        {p.notInShop && (
                          <span className="absolute top-1.5 left-1.5 z-10 px-1.5 py-0.5 rounded-md bg-amber-500 text-white text-[8px] font-extrabold uppercase shadow">Shop me nahi</span>
                        )}
                        {p.stock <= 0 && !p.notInShop && (
                          <span className="absolute top-1.5 left-1.5 z-10 px-1.5 py-0.5 rounded-md bg-rose-600 text-white text-[8px] font-extrabold uppercase shadow">Khatam</span>
                        )}
                        <div className="aspect-square bg-slate-100 dark:bg-slate-800 overflow-hidden">
                          {p.imageUrl ? (
                            <img src={p.imageUrl} alt="" loading="lazy" className="w-full h-full object-cover group-hover:scale-110 transition-transform duration-500" />
                          ) : (
                            <div className="w-full h-full flex items-center justify-center bg-gradient-to-br from-emerald-50 to-teal-50 dark:from-emerald-500/10 dark:to-teal-500/10">
                              <Cable className="h-10 w-10 text-emerald-400 dark:text-emerald-500" />
                            </div>
                          )}
                        </div>
                        <div className="p-2 sm:p-3">
                          <div className="font-extrabold text-slate-900 dark:text-white text-sm line-clamp-2 leading-tight min-h-[2.25rem]">{p.name}</div>
                          <div className="mt-1.5 flex items-end justify-between gap-1">
                            <div className="text-lg sm:text-xl font-extrabold text-emerald-700 dark:text-emerald-400 leading-none tabular-nums">
                              {hidePrices ? '•••' : p.price > 0 ? formatPKR(p.price) : <span className="text-rose-600 text-sm">Price nahi</span>}
                            </div>
                            <div className={['text-xs font-extrabold tabular-nums shrink-0',
                              p.stock <= 0 ? 'text-rose-700 dark:text-rose-400' : 'text-slate-600 dark:text-slate-300'].join(' ')}>
                              {p.notInShop ? '—' : p.stock}
                            </div>
                          </div>
                        </div>
                      </button>
                    );
                  })}
                </div>
              )
            )}

            {/* ── REPAIR DELIVERY ── */}
            {viewMode === 'repair' && (
              <div className="space-y-2">
                {loadingRepairs && !readyTicketsData ? (
                  Array.from({ length: 3 }).map((_, i) => <div key={i} className="h-24 rounded-2xl bg-slate-200 dark:bg-slate-800 animate-pulse" />)
                ) : readyTickets.length === 0 ? (
                  <EmptyState icon={Wrench} title="Koi tayyar repair nahi" hint={repairSearch ? `"${repairSearch}" se koi ticket nahi mila` : 'Jab repair READY ho jayegi, yahan deliver kar sakte ho'} />
                ) : (
                  readyTickets.map((t) => (
                    <div key={t.id} className="w-full rounded-2xl bg-white dark:bg-slate-900 border-4 border-amber-200 dark:border-amber-500/30 hover:border-amber-400 p-3 flex items-center gap-3 transition">
                      <div className="h-14 w-14 sm:h-16 sm:w-16 rounded-xl bg-amber-100 dark:bg-amber-500/20 flex items-center justify-center shrink-0">
                        <Wrench className="h-7 w-7 text-amber-600 dark:text-amber-300" />
                      </div>
                      <div className="flex-1 min-w-0">
                        <div className="font-mono font-extrabold text-[10px] text-amber-700 dark:text-amber-300">{t.ticketNumber}</div>
                        <div className="font-extrabold text-sm sm:text-base text-slate-900 dark:text-white truncate">{t.deviceBrand} {t.deviceModel}</div>
                        <div className="text-xs font-bold text-slate-600 dark:text-slate-400 mt-0.5 truncate">
                          {t.customerName}{t.customerPhone ? ` • ${t.customerPhone}` : ''}
                        </div>
                        <div className="mt-1 inline-flex items-center gap-1 px-1.5 py-0.5 rounded bg-emerald-100 dark:bg-emerald-500/20 text-emerald-700 dark:text-emerald-300 text-[9px] font-extrabold uppercase">
                          <CheckCircle2 className="h-2.5 w-2.5" /> Ready for delivery
                        </div>
                      </div>
                      <div className="text-right shrink-0 space-y-1.5">
                        <div className="text-lg sm:text-xl font-extrabold text-emerald-700 dark:text-emerald-400 tabular-nums">
                          {hidePrices ? '••••' : formatPKR(Number((t as any).totalCost ?? (t as any).estimatedCost ?? 0))}
                        </div>
                        <button onClick={() => setDeliverTicket(t)}
                          className="h-10 px-4 rounded-xl bg-gradient-to-r from-amber-600 to-orange-600 hover:from-amber-700 hover:to-orange-700 active:scale-95 text-white text-xs font-extrabold inline-flex items-center gap-1 shadow-md transition">
                          <Check className="h-3.5 w-3.5" /> Deliver
                        </button>
                      </div>
                    </div>
                  ))
                )}
              </div>
            )}
          </div>
        </section>

        {/* ════════ CART PANEL ════════ */}
        <CartPanel
          isMobile={showMobileCart}
          onCloseMobile={() => setShowMobileCart(false)}
          cart={cart} itemCount={itemCount} totalQty={totalQty}
          subtotal={subtotal} total={total}
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
          onChangeQty={changeQty} onRemove={removeLine}
          priceEditId={priceEditId} onStartPriceEdit={setPriceEditId} onSetPrice={setLinePrice}
          onCheckout={() => openCheckout('full')}
          onInstantCash={instantCash}
          canCheckout={!!currentShopId}
          checkoutPending={checkoutMutation.isPending}
          nonPtaCount={nonPtaInCart.length}
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
          <div className="rounded-2xl border-2 border-blue-200 dark:border-blue-500/40 bg-blue-50 dark:bg-blue-500/10 p-4">
            <div className="flex items-center justify-between gap-3">
              <div className="flex items-center gap-3 min-w-0">
                <div className="h-11 w-11 rounded-xl bg-gradient-to-br from-blue-500 to-indigo-600 text-white flex items-center justify-center shadow-md shrink-0">
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
              <div className="mt-3 pt-3 border-t border-blue-200 dark:border-blue-500/30">
                <div className="text-[10px] uppercase font-extrabold text-blue-700 dark:text-blue-300 tracking-wider mb-1.5">Printer width</div>
                <div className="grid grid-cols-2 gap-1.5">
                  {(['80', '58'] as const).map((w) => (
                    <button key={w} onClick={() => setPrinterWidth(w)}
                      className={['h-10 rounded-xl text-sm font-extrabold transition border-2',
                        printerWidth === w
                          ? 'bg-blue-600 border-blue-600 text-white shadow-md'
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
const QUICK_AMOUNTS = [1000, 5000, 10000, 20000, 50000];

function CheckoutModal({ total, itemCount, loading, customerName, customerBalance = 0, hasCustomer, initMode, onConfirm, onClose }: {
  total: number; itemCount: number; loading?: boolean;
  customerName?: string; customerBalance?: number; hasCustomer?: boolean;
  initMode: CheckoutMode;
  onConfirm: (d: { paymentMethod: PaymentMethod; paidAmount: number; isCredit: boolean; depositExtra: boolean }) => void;
  onClose: () => void;
}) {
  const [paymentMethod, setPaymentMethod] = useState<PaymentMethod>('CASH');
  const [paidStr, setPaidStr] = useState<string>('');
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
        <div className="shrink-0 relative overflow-hidden bg-gradient-to-br from-slate-950 via-blue-900 to-indigo-700 text-white px-5 py-4">
          <div className="absolute -top-10 -right-10 h-32 w-32 rounded-full bg-blue-400/20 blur-2xl" />
          <div className="relative flex items-center justify-between gap-3">
            <div className="min-w-0">
              <div className="text-[11px] uppercase font-extrabold text-blue-200 tracking-wider">Payment • {itemCount} items</div>
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
          {/* Mode selector */}
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
                <div className="text-[10px] font-bold text-slate-500 mt-0.5">Baqi udhaar / EMI</div>
              </button>
              <button onClick={() => setMode('credit')} disabled={!hasCustomer}
                className={['p-3 rounded-2xl border-4 text-center transition active:scale-95 disabled:opacity-40 disabled:cursor-not-allowed',
                  mode === 'credit' ? 'border-rose-500 bg-rose-50 dark:bg-rose-500/15 shadow-lg ring-2 ring-rose-200 dark:ring-rose-500/30' : 'border-slate-200 dark:border-slate-700 bg-white dark:bg-slate-800 hover:border-rose-300'].join(' ')}>
                <BookOpen className={`h-6 w-6 mx-auto ${mode === 'credit' ? 'text-rose-600' : 'text-slate-500'}`} />
                <div className={`text-sm font-extrabold mt-1 ${mode === 'credit' ? 'text-rose-800 dark:text-rose-300' : 'text-slate-700 dark:text-slate-200'}`}>Pura Udhaar</div>
                <div className="text-[10px] font-bold text-slate-500 mt-0.5">{hasCustomer ? 'Khaate / EMI mein' : 'Customer chunein'}</div>
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
                  placeholder="Kitna paisa diya? (advance)"
                  className="h-16 sm:h-20 w-full rounded-2xl border-4 border-emerald-300 dark:border-emerald-500/40 bg-emerald-50 dark:bg-emerald-500/10 px-4 pr-14 text-3xl sm:text-4xl font-extrabold tabular-nums text-emerald-900 dark:text-emerald-200 focus:outline-none focus:border-emerald-600 focus:ring-4 focus:ring-emerald-200 dark:focus:ring-emerald-500/20" />
                {paidStr && (
                  <button onClick={() => setPaidStr('')} className="absolute right-3 top-1/2 -translate-y-1/2 h-10 w-10 rounded-xl bg-white dark:bg-slate-800 hover:bg-slate-100 dark:hover:bg-slate-700 active:scale-95 flex items-center justify-center transition">
                    <X className="h-5 w-5 text-slate-500" />
                  </button>
                )}
              </div>
              <div className="grid grid-cols-3 sm:grid-cols-5 gap-1.5">
                {QUICK_AMOUNTS.map((amt) => (
                  <button key={amt} onClick={() => addAmount(amt)}
                    className="h-11 rounded-xl bg-slate-100 dark:bg-slate-800 hover:bg-emerald-100 dark:hover:bg-emerald-500/20 active:scale-95 text-sm font-extrabold text-slate-800 dark:text-slate-200 transition tabular-nums">
                    +{amt >= 1000 ? `${amt / 1000}k` : amt}
                  </button>
                ))}
              </div>
              <div className="grid grid-cols-2 gap-2">
                <button onClick={() => setExact(total)}
                  className="h-11 rounded-xl bg-emerald-100 dark:bg-emerald-500/20 hover:bg-emerald-200 dark:hover:bg-emerald-500/30 active:scale-95 text-sm font-extrabold text-emerald-800 dark:text-emerald-300 transition inline-flex items-center justify-center gap-1">
                  <CheckCircle2 className="h-4 w-4" /> Pura ({formatPKR(total)})
                </button>
                <button onClick={() => setExact(Math.ceil(total / 1000) * 1000)}
                  className="h-11 rounded-xl bg-blue-100 dark:bg-blue-500/20 hover:bg-blue-200 dark:hover:bg-blue-500/30 active:scale-95 text-sm font-extrabold text-blue-800 dark:text-blue-300 transition tabular-nums">
                  Round up ({formatPKR(Math.ceil(total / 1000) * 1000)})
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

          {/* Summary */}
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
                        {hasCustomer ? 'Khaate mein udhaar — EMI ka option milega' : '⚠️ Customer chahiye'}
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
              ? [1, 2, 3, 5, 10].map((v) => (
                  <button key={v} onClick={() => setPct(String(v))}
                    className={['h-11 rounded-xl text-sm font-extrabold tabular-nums transition active:scale-95 border-2',
                      Number(pct) === v ? 'bg-amber-600 text-white border-amber-600 shadow-md'
                      : 'bg-white dark:bg-slate-800 border-amber-200 dark:border-amber-500/30 text-amber-800 dark:text-amber-300 hover:border-amber-400'].join(' ')}>
                    {v}%
                  </button>
                ))
              : [100, 500, 1000, 2000, 5000].map((v) => (
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
    blue: 'bg-blue-600 text-white shadow-md',
    violet: 'bg-violet-600 text-white shadow-md',
    emerald: 'bg-emerald-600 text-white shadow-md',
    amber: 'bg-amber-600 text-white shadow-md',
  };
  return (
    <button onClick={onClick}
      className={['flex-1 h-12 rounded-xl text-xs sm:text-sm font-extrabold inline-flex items-center justify-center gap-1.5 transition active:scale-95 relative',
        active ? colors[color] : 'bg-transparent text-slate-600 dark:text-slate-300 hover:bg-slate-100 dark:hover:bg-slate-700'].join(' ')}>
      {highlight && !active && <span className="absolute top-1 right-1 h-2 w-2 rounded-full bg-amber-500 animate-pulse" />}
      <Icon className="h-4 w-4" />
      <span>{label}</span>
      {count > 0 && (
        <span className={['px-1.5 rounded-md text-[10px] tabular-nums', active ? 'bg-white/25' : 'bg-slate-200 dark:bg-slate-700 text-slate-700 dark:text-slate-300'].join(' ')}>{count}</span>
      )}
      {shortcut && (
        <span className={['hidden lg:inline text-[9px] font-mono px-1 rounded', active ? 'bg-white/20' : 'bg-slate-200 dark:bg-slate-700 text-slate-500 dark:text-slate-400'].join(' ')}>{shortcut}</span>
      )}
    </button>
  );
}

/* ══════════ EMPTY STATE ══════════ */
function EmptyState({ icon: Icon, title, hint, tone = 'slate', onClear }: any) {
  return (
    <div className="flex flex-col items-center justify-center py-16 px-6">
      <div className={`h-20 w-20 rounded-3xl flex items-center justify-center ${tone === 'amber' ? 'bg-amber-100 dark:bg-amber-500/20' : 'bg-slate-200 dark:bg-slate-800'}`}>
        <Icon className={`h-10 w-10 ${tone === 'amber' ? 'text-amber-500' : 'text-slate-400 dark:text-slate-500'}`} />
      </div>
      <h3 className="mt-4 font-extrabold text-slate-900 dark:text-white text-xl text-center">{title}</h3>
      <p className="mt-2 text-sm text-slate-500 dark:text-slate-400 text-center font-semibold max-w-sm">{hint}</p>
      {onClear && (
        <button onClick={onClear} className="mt-4 h-12 px-5 rounded-2xl bg-blue-600 hover:bg-blue-700 active:scale-95 text-white font-extrabold transition inline-flex items-center gap-2">
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
  isMobile, onCloseMobile, cart, itemCount, totalQty, subtotal, total,
  discountMode, discountPct, discountRs, discountAmount, onOpenDiscount, onClearDiscount,
  hidePrices, customers, customerId, setCustomerId, selectedCustomer, onAddCustomer,
  onHold, onClear, onChangeQty, onRemove, priceEditId, onStartPriceEdit,
  onSetPrice, onCheckout, onInstantCash, canCheckout, checkoutPending, nonPtaCount,
}: any) {
  const containerClass = isMobile
    ? 'fixed inset-0 z-40 bg-white dark:bg-slate-950 flex flex-col lg:hidden'
    : 'hidden lg:flex rounded-3xl bg-white dark:bg-slate-900/80 dark:backdrop-blur-sm border-2 border-slate-200 dark:border-slate-800 shadow-sm dark:shadow-black/20 overflow-hidden flex-col min-h-0';
  const hasDiscount = discountAmount > 0;

  return (
    <aside className={containerClass}>
      {/* Header */}
      <div className="shrink-0 relative overflow-hidden bg-gradient-to-br from-slate-950 via-emerald-900 to-emerald-700 dark:from-slate-950 dark:via-emerald-950 dark:to-emerald-900 text-white px-3 sm:px-4 py-3 sm:py-4">
        <div className="flex items-center justify-between gap-2">
          <div className="min-w-0">
            <div className="text-[10px] sm:text-[11px] uppercase font-extrabold text-white/70 tracking-wider">
              Cart • {itemCount} lines • {totalQty} qty
            </div>
            <div className="text-3xl sm:text-4xl font-extrabold tabular-nums leading-none mt-1">
              {hidePrices ? '••••' : formatPKR(total)}
            </div>
            {hasDiscount && !hidePrices && (
              <div className="text-xs font-bold text-amber-300 mt-1 tabular-nums inline-flex items-center gap-1">
                <Tag className="h-3 w-3" /> Discount {discountMode === 'pct' ? `${discountPct}%` : ''} • Save {formatPKR(discountAmount)}
              </div>
            )}
            {nonPtaCount > 0 && (
              <div className="text-xs font-extrabold text-amber-300 mt-1 inline-flex items-center gap-1">
                <AlertTriangle className="h-3 w-3" /> {nonPtaCount} Non-PTA/Pending device
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

      {/* Customer */}
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

      {/* Lines */}
      <div className="flex-1 overflow-y-auto p-2.5 sm:p-3 space-y-2 bg-slate-50/50 dark:bg-slate-950/40 min-h-0">
        {cart.length === 0 ? (
          <div className="rounded-3xl bg-white dark:bg-slate-900/80 border-4 border-dashed border-slate-200 dark:border-slate-700 p-8 sm:p-10 text-center">
            <div className="h-16 w-16 sm:h-20 sm:w-20 rounded-3xl bg-slate-100 dark:bg-slate-800 mx-auto flex items-center justify-center">
              <Smartphone className="h-8 w-8 sm:h-10 sm:w-10 text-slate-400 dark:text-slate-500" />
            </div>
            <p className="mt-4 font-extrabold text-slate-700 dark:text-slate-200 text-lg sm:text-xl">Cart khaali hai</p>
            <p className="text-xs sm:text-sm text-slate-500 dark:text-slate-400 font-semibold mt-1">IMEI scan karo ya list se device chuno</p>
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
              onRemove={() => onRemove(l.id)}
            />
          ))
        )}
      </div>

      {/* Footer */}
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
              'bg-gradient-to-r from-blue-600 to-indigo-600 hover:from-blue-700 hover:to-indigo-700',
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
                Paisay lein <span className="hidden sm:inline">(F9)</span> — cash / udhaar / EMI / card
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
function CartRow({ line: l, hidePrices, editing, onStartPriceEdit, onSetPrice, onCancelPriceEdit, onChangeQty, onRemove }: any) {
  const [draft, setDraft] = useState('');
  const customPriced = Number(l.unitPrice) !== Number(l.basePrice);
  const isAccessory = l.type === 'accessory';
  const riskyPta = l.ptaStatus === 'NON_PTA' || l.ptaStatus === 'PENDING';

  useEffect(() => { if (editing) setDraft(String(l.unitPrice)); }, [editing, l.unitPrice]);

  const commit = () => {
    const v = Number(draft);
    if (!isNaN(v) && v >= 0) onSetPrice(v);
    else onCancelPriceEdit();
  };

  return (
    <div className={['rounded-2xl bg-white dark:bg-slate-900 border-4 p-2.5 sm:p-3 shadow-sm dark:shadow-black/20',
      riskyPta ? 'border-amber-300 dark:border-amber-500/40'
      : l.type === 'usedphone' ? 'border-violet-300 dark:border-violet-500/40'
      : customPriced ? 'border-amber-300 dark:border-amber-500/40'
      : 'border-slate-200 dark:border-slate-700'].join(' ')}>
      <div className="flex items-start gap-2.5 sm:gap-3">
        <div className={['h-12 w-12 sm:h-14 sm:w-14 rounded-xl overflow-hidden shrink-0 flex items-center justify-center relative bg-slate-100 dark:bg-slate-800',
          l.type === 'usedphone' ? 'bg-gradient-to-br from-violet-100 to-fuchsia-100 dark:from-violet-500/20 dark:to-fuchsia-500/20' : ''].join(' ')}>
          {l.image ? <img src={l.image} alt="" className="w-full h-full object-cover" /> : (
            l.type === 'imei' ? <Smartphone className="h-6 w-6 text-blue-500" />
            : l.type === 'usedphone' ? <RefreshCw className="h-6 w-6 text-violet-500" />
            : <Cable className="h-6 w-6 text-emerald-500" />
          )}
          {riskyPta && (
            <div className="absolute -top-1 -right-1 h-5 w-5 rounded-full bg-amber-500 text-white flex items-center justify-center">
              <AlertTriangle className="h-3 w-3" />
            </div>
          )}
        </div>
        <div className="flex-1 min-w-0">
          <div className="flex items-center gap-1.5 flex-wrap">
            <div className="font-extrabold text-sm sm:text-base text-slate-900 dark:text-white leading-tight line-clamp-2">{l.name}</div>
            {l.type === 'usedphone' && <span className="px-1.5 py-0.5 rounded bg-violet-600 text-white text-[9px] font-extrabold uppercase tracking-wider shrink-0">Used</span>}
            {l.ptaStatus && (
              <span className={['px-1.5 py-0.5 rounded text-[9px] font-extrabold uppercase tracking-wider shrink-0',
                l.ptaStatus === 'APPROVED' ? 'bg-emerald-600 text-white'
                : l.ptaStatus === 'ACTIVE' ? 'bg-teal-600 text-white'
                : 'bg-amber-500 text-white'].join(' ')}>
                {PTA_STATUS_LABELS[l.ptaStatus as PtaStatus]}
              </span>
            )}
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
              className="mt-0.5 text-xs sm:text-sm font-bold text-blue-700 dark:text-blue-400 inline-flex items-center gap-1 hover:text-blue-900 dark:hover:text-blue-300 transition group/price">
              {formatPKR(l.unitPrice)}
              {l.warrantyMonths ? <span className="text-teal-600 dark:text-teal-400">• {l.warrantyMonths}m warranty</span> : null}
              <Pencil className="h-3 w-3 opacity-0 group-hover/price:opacity-100 transition" />
            </button>
          )}

          {l.note && <div className="text-[10px] sm:text-[11px] font-mono font-semibold text-slate-500 dark:text-slate-400 mt-0.5 line-clamp-1">{l.note}</div>}
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
        {/* Qty stepper — sirf accessories ke liye; IMEI/used phone hamesha 1 */}
        {isAccessory ? (
          <div className="inline-flex items-center bg-slate-100 dark:bg-slate-800 rounded-2xl overflow-hidden border-2 border-slate-200 dark:border-slate-700">
            <button onClick={() => onChangeQty(-1)} className="h-12 sm:h-14 w-12 sm:w-14 hover:bg-slate-200 dark:hover:bg-slate-700 active:bg-slate-300 flex items-center justify-center transition">
              <Minus className="h-5 w-5 sm:h-6 sm:w-6 text-slate-700 dark:text-slate-200" />
            </button>
            <div className="h-12 sm:h-14 min-w-[56px] w-14 flex items-center justify-center bg-white dark:bg-slate-900 text-lg sm:text-xl font-extrabold tabular-nums text-slate-900 dark:text-white">
              {l.quantity}
            </div>
            <button onClick={() => onChangeQty(1)}
              className="h-12 sm:h-14 w-12 sm:w-14 text-white flex items-center justify-center transition bg-emerald-600 hover:bg-emerald-700 active:bg-emerald-800">
              <Plus className="h-5 w-5 sm:h-6 sm:w-6" />
            </button>
          </div>
        ) : (
          <div className="inline-flex items-center gap-1 px-2.5 py-1 rounded-xl bg-slate-100 dark:bg-slate-800 text-[10px] font-extrabold text-slate-600 dark:text-slate-300 uppercase tracking-wider">
            <ShieldCheck className="h-3 w-3" /> 1 device
          </div>
        )}
        <div className="text-xl sm:text-2xl font-extrabold text-emerald-700 dark:text-emerald-400 tabular-nums">
          {hidePrices ? '•••' : formatPKR(l.lineTotal)}
        </div>
      </div>
    </div>
  );
}

/* ══════════ POS TEACHER ══════════ */
function PosTeacher({ onClose }: { onClose: () => void }) {
  return (
    <div className="fixed inset-0 z-50 bg-black/60 backdrop-blur-sm flex items-end sm:items-center justify-center p-3" onClick={onClose}>
      <div className="w-full max-w-lg max-h-[90vh] overflow-y-auto rounded-3xl bg-white dark:bg-slate-900 border-2 border-blue-300 dark:border-blue-500/40 shadow-2xl" onClick={(e) => e.stopPropagation()}>
        <div className="px-5 py-3 border-b-2 border-blue-200 dark:border-blue-500/30 bg-gradient-to-r from-blue-50 to-indigo-50 dark:from-blue-500/15 dark:to-indigo-500/15 flex items-center justify-between sticky top-0 z-10">
          <h3 className="font-extrabold text-blue-900 dark:text-blue-200 flex items-center gap-2">
            <GraduationCap className="h-5 w-5" /> Mobile POS — Complete Guide
          </h3>
          <button onClick={onClose} className="h-8 w-8 rounded-lg hover:bg-white dark:hover:bg-slate-800 flex items-center justify-center transition">
            <X className="h-4 w-4 text-slate-600 dark:text-slate-300" />
          </button>
        </div>
        <div className="p-5 space-y-4">
          {/* 🖨️ PRINT FLOW */}
          <div className="rounded-2xl border-2 border-blue-200 dark:border-blue-500/30 bg-blue-50/60 dark:bg-blue-500/5 p-4 space-y-2">
            <div className="text-[10px] uppercase tracking-widest font-extrabold text-blue-700 dark:text-blue-300 flex items-center gap-1">
              <Printer className="h-3 w-3" /> 🖨️ 2-Second Billing Flow
            </div>
            <div className="space-y-1.5 text-xs font-semibold text-slate-700 dark:text-slate-200">
              <TipRow><strong>IMEI scan karo → F12 → done!</strong> Receipt seedha print dialog me aa jayegi — receipt page pe jaana hi nahi</TipRow>
              <TipRow>Settings ⚙️ me <strong>Auto-Print</strong> ON rakho + printer width chuno (80mm standard / 58mm chhota)</TipRow>
              <TipRow>Popup blocked aaye to browser me 🔒 icon → "Pop-ups" → <strong>Allow</strong></TipRow>
              <TipRow>Success modal me <strong>"Print Again"</strong> — receipt dobara nikalni ho to</TipRow>
              <TipRow>Receipt pe <strong>IMEI + warranty</strong> khud print hota hai — warranty claim me kaam aayega</TipRow>
            </div>
          </div>
          {/* 📱 SELLING */}
          <div className="rounded-2xl border-2 border-violet-200 dark:border-violet-500/30 bg-violet-50/60 dark:bg-violet-500/5 p-4 space-y-2">
            <div className="text-[10px] uppercase tracking-widest font-extrabold text-violet-700 dark:text-violet-300 flex items-center gap-1">
              <Smartphone className="h-3 w-3" /> 📱 Phone Bechna
            </div>
            <div className="space-y-1.5 text-xs font-semibold text-slate-700 dark:text-slate-200">
              <TipRow><strong>F2</strong> ya camera se IMEI scan — box ka barcode seedha device cart mein</TipRow>
              <TipRow>Barcode gun se scan karo — neeche green wala input hamesha ready rehta hai</TipRow>
              <TipRow><strong>Used phones</strong> tab se trade-in stock seedha bikta hai</TipRow>
              <TipRow>Cart me rate pe click karke <strong>price badal</strong> sakte ho (custom rate)</TipRow>
              <TipRow><strong>Non-PTA device</strong> bechne se pehle warning aayegi — confirm karna parega</TipRow>
            </div>
          </div>
          {/* ⚡ SHORTCUTS */}
          <div className="rounded-2xl border-2 border-amber-200 dark:border-amber-500/30 bg-amber-50/60 dark:bg-amber-500/5 p-4 space-y-2">
            <div className="text-[10px] uppercase tracking-widest font-extrabold text-amber-700 dark:text-amber-300 flex items-center gap-1">
              <Zap className="h-3 w-3" /> ⚡ Speed Shortcuts
            </div>
            <div className="space-y-1.5 text-xs font-semibold text-slate-700 dark:text-slate-200">
              <TipRow><strong>F12</strong> — INSTANT CASH: scan → F12 → print. Bas!</TipRow>
              <TipRow><strong>F9</strong> — checkout (cash/udhaar/EMI/card) • <strong>Enter</strong> — confirm</TipRow>
              <TipRow><strong>F2</strong> scanner • <strong>F7</strong> New • <strong>F8</strong> Used tabs</TipRow>
              <TipRow>Checkout me <strong>F1/F3/F4/F5</strong> = payment method, <strong>F6</strong> = udhaar</TipRow>
              <TipRow><strong>Esc</strong> — koi bhi modal band</TipRow>
            </div>
          </div>
          {/* 💳 EMI + Udhaar */}
          <div className="rounded-2xl border-2 border-emerald-200 dark:border-emerald-500/30 bg-emerald-50/60 dark:bg-emerald-500/5 p-4 space-y-2">
            <div className="text-[10px] uppercase tracking-widest font-extrabold text-emerald-700 dark:text-emerald-300 flex items-center gap-1">
              <Banknote className="h-3 w-3" /> 💳 EMI / Udhaar / Repair
            </div>
            <div className="space-y-1.5 text-xs font-semibold text-slate-700 dark:text-slate-200">
              <TipRow>Credit sale par device + customer ho to <strong>EMI plan</strong> banane ka prompt khud aayega</TipRow>
              <TipRow><strong>Kuch Cash</strong> mode — advance likho, baqi khud udhaar</TipRow>
              <TipRow>Zyada paisa mila? → "wapis dein" ya <strong>"khaate mein jama"</strong> tick karo</TipRow>
              <TipRow><strong>Repair tab</strong> — READY tickets yahan se deliver + payment + sale ek saath</TipRow>
            </div>
          </div>
          <button onClick={onClose}
            className="w-full h-12 rounded-2xl bg-gradient-to-r from-blue-600 to-indigo-700 hover:from-blue-700 hover:to-indigo-800 text-white font-extrabold shadow-lg shadow-blue-500/40 inline-flex items-center justify-center gap-2 transition">
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
