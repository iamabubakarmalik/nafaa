import { useState, useMemo, useEffect, useRef } from 'react';
import { createPortal } from 'react-dom';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { Link } from 'react-router-dom';
import {
  TrendingUp, CalendarDays, ShoppingCart, Search, X, Package, User,
  Banknote, CreditCard, Smartphone, Building2, Zap,
  Eye, Download, RefreshCw, Award, ArrowRight, BookOpen, Barcode, Clock,
  BarChart3, CalendarRange, GraduationCap, Printer, CheckCircle2,
  Trophy, Settings2, Check, Undo2, Loader2, Receipt, ScanLine, MessageCircle,
  Filter, ChevronDown, RotateCcw,
} from 'lucide-react';
import {
  ResponsiveContainer, XAxis, YAxis, Tooltip, CartesianGrid,
  PieChart, Pie, Cell, Legend, Area, Line, Bar, BarChart, ComposedChart,
} from 'recharts';
import { salesApi, type PaymentMethod } from '@modules/sales/sales/api/sales.api';
import { settingsApi } from '@modules/organization/settings/api/settings.api';
import BarcodeScanner from '@core/components/barcode/BarcodeScanner';
import { ReturnModal } from '../components/ReturnModal';
import {
  resolveTemplates, fillTemplate, waLink, waNumber,
} from '@core/lib/whatsapp/templates';
import { formatPKR } from '@core/lib/format';
import { Button } from '@core/ui/Button';
import { PrivacyToggle, useCostHidden } from '@/core/security/HiddenValue';
import { useAuthStore } from '@core/stores/auth.store';
import { toast } from 'sonner';

/* ═════════════════════════════════════════════════════════════
   NAFAA RETAIL SALES — FULL BEST v4
   ─────────────────────────────────────────────────────────────
   🔒 PrivacyToggle (sales privacy modal khatam)
   🎓 Teacher modal — "Ye page kya karta hai"
   🌙 Dark mode COMPLETE
   🖨️ Print/PDF perfect (A4 landscape, colored)
   📊 CSV summary header ke sath
   ⌨️  / = search, Esc = modals
   ⚙️  Receipt Quick-Settings (inline popover, localStorage)
       → key 'nafaa.receipt.prefs' — ReceiptPage yahi defaults use karta hai
   🔗 Row pe direct Print button (prefs ke saath receipt)
   📱 Mobile → 4K responsive
   ═════════════════════════════════════════════════════════════ */

const formatDate = (v: string) =>
  new Intl.DateTimeFormat('en-PK', { dateStyle: 'medium', timeStyle: 'short' }).format(new Date(v));

const paymentConfig: Record<string, { label: string; icon: any; color: string; bg: string; hex: string }> = {
  CASH:          { label: 'Cash',      icon: Banknote,   color: '#16a34a', bg: 'bg-emerald-100 dark:bg-emerald-500/20 text-emerald-700 dark:text-emerald-300 border-emerald-200 dark:border-emerald-500/40', hex: '#10b981' },
  CARD:          { label: 'Card',      icon: CreditCard, color: '#2563eb', bg: 'bg-blue-100 dark:bg-blue-500/20 text-blue-700 dark:text-blue-300 border-blue-200 dark:border-blue-500/40',                     hex: '#3b82f6' },
  JAZZCASH:      { label: 'JazzCash',  icon: Smartphone, color: '#f97316', bg: 'bg-orange-100 dark:bg-orange-500/20 text-orange-700 dark:text-orange-300 border-orange-200 dark:border-orange-500/40',       hex: '#f97316' },
  EASYPAISA:     { label: 'EasyPaisa', icon: Zap,        color: '#22c55e', bg: 'bg-green-100 dark:bg-green-500/20 text-green-700 dark:text-green-300 border-green-200 dark:border-green-500/40',            hex: '#22c55e' },
  BANK_TRANSFER: { label: 'Bank',      icon: Building2,  color: '#7c3aed', bg: 'bg-violet-100 dark:bg-violet-500/20 text-violet-700 dark:text-violet-300 border-violet-200 dark:border-violet-500/40',      hex: '#8b5cf6' },
};

type DateFilter = 'all' | 'today' | 'yesterday' | 'week' | 'month' | 'year' | 'custom';

/* ════════════════════════════════════════════════════════════
   RECEIPT PREFS — localStorage (ReceiptPage isi key se padhta hai)
   ════════════════════════════════════════════════════════════ */
const RECEIPT_PREFS_KEY = 'nafaa.receipt.prefs';

interface ReceiptPrefs {
  paperWidth: '58' | '80';
  mode: 'short' | 'full';
  autoPrint: boolean;
  showLogo: boolean;
}

const DEFAULT_RECEIPT_PREFS: ReceiptPrefs = {
  paperWidth: '80',
  mode: 'short',
  autoPrint: true,
  showLogo: true,
};

export function getReceiptPrefs(): ReceiptPrefs {
  try {
    const raw = localStorage.getItem(RECEIPT_PREFS_KEY);
    if (!raw) return DEFAULT_RECEIPT_PREFS;
    return { ...DEFAULT_RECEIPT_PREFS, ...JSON.parse(raw) };
  } catch {
    return DEFAULT_RECEIPT_PREFS;
  }
}

function saveReceiptPrefs(p: ReceiptPrefs) {
  try {
    localStorage.setItem(RECEIPT_PREFS_KEY, JSON.stringify(p));
    window.dispatchEvent(new CustomEvent('receipt-prefs-changed', { detail: p }));
  } catch { /* storage full — ignore */ }
}

/* ════════════════════════════════════════════════════════════
   TAREEKH KA HISAB — sab kuch dukaan ke apne waqt me
   ────────────────────────────────────────────────────────────
   Pehle yahan do ghalatiyan thin:

   1. "7 din" ka matlab poore 7 din nahi tha — abhi ke waqt se
      7×24 ghante peeche. Subah 9 baje "7 din" dabane par
      saat din pehle subah 9 baje se pehle ki bikri chhoot jati.

   2. Rujhan ka chart `toISOString()` se din banata tha — wo
      LONDON ka waqt hai. Raat 2 baje ki bikri pichlay din me
      chali jati thi, aur dukaan-daar ko lagta ke aadhi raat ke
      baad bika hua maal ghayab ho gaya.

   Ab har cheez maqami (local) din par chalti hai.
   ════════════════════════════════════════════════════════════ */

/** Maqami din ki shuruaat — raat 12 baje */
const dayStart = (d: Date) => { const x = new Date(d); x.setHours(0, 0, 0, 0); return x; };
/** Maqami din ka ant — 11:59:59 raat */
const dayEnd = (d: Date) => { const x = new Date(d); x.setHours(23, 59, 59, 999); return x; };
/** Maqami din ki chaabi — `toISOString` ki jagah, warna waqt ka farq din badal deta hai */
const dayKey = (d: Date) =>
  `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}-${String(d.getDate()).padStart(2, '0')}`;

const fmtDateTime = (v: string) =>
  new Intl.DateTimeFormat('en-PK', { dateStyle: 'medium', timeStyle: 'short' }).format(new Date(v));
const fmtTime = (v: string) =>
  new Intl.DateTimeFormat('en-PK', { hour: 'numeric', minute: '2-digit', hour12: true }).format(new Date(v));

/** "2 ghante pehle" — ginti se zyada samajh aata hai */
function agoPhrase(v: string) {
  const mins = Math.floor((Date.now() - new Date(v).getTime()) / 60000);
  if (mins < 1) return 'abhi abhi';
  if (mins < 60) return `${mins} minute pehle`;
  const hrs = Math.floor(mins / 60);
  if (hrs < 24) return `${hrs} ghante pehle`;
  const days = Math.floor(hrs / 24);
  if (days === 1) return 'kal';
  if (days < 30) return `${days} din pehle`;
  return fmtDateTime(v);
}

const DATE_OPTIONS: { v: DateFilter; l: string }[] = [
  { v: 'today', l: 'Aaj' },
  { v: 'yesterday', l: 'Kal' },
  { v: 'week', l: '7 din' },
  { v: 'month', l: '30 din' },
  { v: 'year', l: 'Is saal' },
  { v: 'all', l: 'Sab' },
  { v: 'custom', l: '📅 Apni tareekh' },
];

/* Chart ke rang — dono theme me saaf nazar aane wale.
   Pehle grid `#e2e8f0` (bohat halka) aur axis `#64748b` thay:
   dark mode me kaali zameen par ye ghayab ho jate thay, aur
   tooltip ka kinara safed safhe par dikhta hi nahi tha. */
const CHART_TOOLTIP = {
  borderRadius: 14,
  border: 'none',
  backgroundColor: 'rgba(15,23,42,0.96)',
  color: '#f8fafc',
  fontWeight: 700,
  fontSize: 12,
  boxShadow: '0 12px 32px rgba(15,23,42,.28)',
  padding: '10px 12px',
};

/** Dono theme me kaam karne wale rang */
const AXIS = '#94a3b8';                    // halka sleti — dono par parha jata hai
const GRID = 'rgba(148,163,184,0.25)';     // shaffaf — kaali aur safed dono par
const C = {
  sales:   '#0ea5e9',
  profit:  '#10b981',
  hours:   '#6366f1',
  peak:    '#f59e0b',
  weekday: '#a855f7',
};

/* ══════════════════════════════════════════════════════════ */
export default function RetailSalesPage() {
  const hideAmounts = useCostHidden();
  const tenantName = useAuthStore((s) => s.tenant?.name);
  const shopName = useAuthStore((s) => s.user?.assignedShop?.name);
  const searchRef = useRef<HTMLInputElement>(null);
  const qc = useQueryClient();

  const [tab, setTab] = useState<'list' | 'analytics'>('list');
  const [search, setSearch] = useState('');
  const [dateFilter, setDateFilter] = useState<DateFilter>('today');
  const [customStart, setCustomStart] = useState('');
  const [customEnd, setCustomEnd] = useState('');
  const [paymentFilter, setPaymentFilter] = useState<PaymentMethod | 'all'>('all');
  const [creditOnly, setCreditOnly] = useState(false);
  const [showTeacher, setShowTeacher] = useState(false);
  const [showReceiptSettings, setShowReceiptSettings] = useState(false);
  const receiptBtnRef = useRef<HTMLButtonElement>(null);
  const [visible, setVisible] = useState(50);

  /* Demo ki bikri, ghalat bill — wapas lene ka raasta */
  const [voidTarget, setVoidTarget] = useState<any>(null);
  const [voidReason, setVoidReason] = useState('');
  /* Purana bill haath me — barcode scan karo, wohi bill khul jaye */
  const [scannerOpen, setScannerOpen] = useState(false);
  const [showDatePicker, setShowDatePicker] = useState(false);
  const [showMoreFilters, setShowMoreFilters] = useState(false);
  /* Customer maal wapas laya — usi line se modal */
  const [returnTarget, setReturnTarget] = useState<any>(null);

  const [receiptPrefs, setReceiptPrefs] = useState<ReceiptPrefs>(getReceiptPrefs);
  const [prefsSaved, setPrefsSaved] = useState(false);

  const updateReceiptPrefs = (patch: Partial<ReceiptPrefs>) => {
    const next = { ...receiptPrefs, ...patch };
    setReceiptPrefs(next);
    saveReceiptPrefs(next);
    setPrefsSaved(true);
    setTimeout(() => setPrefsSaved(false), 1200);
  };

  const receiptLink = (saleId: string, autoprint = false) =>
    `/sales/${saleId}/receipt?paper=${receiptPrefs.paperWidth}&mode=${receiptPrefs.mode}${autoprint ? '&autoprint=1' : ''}`;

  const { data: sales = [], isLoading, refetch, isRefetching } = useQuery({
    queryKey: ['sales-list'],
    queryFn: () => salesApi.list(),
  });

  const { data: summary } = useQuery({
    queryKey: ['sales-summary'],
    queryFn: () => salesApi.summary(),
  });

  /* Malik ke apne WhatsApp paighaam — Settings → WhatsApp se */
  const { data: appSettings } = useQuery({
    queryKey: ['settings'],
    queryFn: settingsApi.get,
  });
  const templates = useMemo(
    () => resolveTemplates((appSettings as any)?.whatsappTemplates),
    [appSettings],
  );

  /** Bill ka WhatsApp link — customer ka number aur malik ka paighaam */
  const billWaLink = (sale: any) => {
    const items = (sale.items ?? []).slice(0, 6)
      .map((it: any) => `• ${it.product?.name ?? 'Cheez'} × ${Number(it.quantity)}`)
      .join('\n');
    const msg = fillTemplate(templates.receipt, {
      customer: sale.customer?.name || 'Ji',
      shop: tenantName || 'Hamari dukaan',
      phone: (appSettings as any)?.shopPhone || '',
      bill: sale.saleNumber,
      total: formatPKR(sale.total),
      paid: formatPKR(sale.paidAmount),
      baqi: sale.creditAmount > 0 ? formatPKR(sale.creditAmount) : 'Rs 0',
      tareekh: new Intl.DateTimeFormat('en-PK', { dateStyle: 'medium' }).format(new Date(sale.soldAt)),
      cheezein: items + ((sale.items?.length ?? 0) > 6 ? `\n• +${sale.items.length - 6} aur` : ''),
    });
    return waLink(sale.customer?.phone, msg);
  };

  const showValue = (v: string) => (hideAmounts ? '••••••' : v);

  /* ─── Bikri wapas lena ─── */
  const voidMutation = useMutation({
    mutationFn: ({ id, reason }: { id: string; reason: string }) => salesApi.voidSale(id, reason),
    onSuccess: () => {
      toast.success('Bikri wapas le li — stock wapas aa gaya');
      setVoidTarget(null);
      setVoidReason('');
      qc.invalidateQueries({ queryKey: ['sales-list'] });
      qc.invalidateQueries({ queryKey: ['sales-summary'] });
      qc.invalidateQueries({ queryKey: ['products'] });
      qc.invalidateQueries({ queryKey: ['retail-products'] });
      qc.invalidateQueries({ queryKey: ['customers'] });
    },
    onError: (e: any) => toast.error(e?.response?.data?.message || 'Wapas nahi li ja saki'),
  });

  /* ─── Tareekh ka daira — poore din, maqami waqt me ─── */
  const [rangeStart, rangeEnd] = useMemo<[Date, Date]>(() => {
    const now = new Date();
    switch (dateFilter) {
      case 'today':
        return [dayStart(now), dayEnd(now)];
      case 'yesterday': {
        const y = new Date(now); y.setDate(now.getDate() - 1);
        return [dayStart(y), dayEnd(y)];
      }
      case 'week': {
        const s = new Date(now); s.setDate(now.getDate() - 6);
        return [dayStart(s), dayEnd(now)];      // aaj mila kar poore 7 din
      }
      case 'month': {
        const s = new Date(now); s.setDate(now.getDate() - 29);
        return [dayStart(s), dayEnd(now)];      // 29 din peeche + aaj = 30
      }
      case 'year': {
        const s = new Date(now.getFullYear(), 0, 1);
        return [dayStart(s), dayEnd(now)];      // 1 January se — "pichlay 365 din" nahi
      }
      case 'custom': {
        const s = customStart ? dayStart(new Date(customStart)) : new Date(0);
        const e = customEnd ? dayEnd(new Date(customEnd)) : dayEnd(now);
        return [s, e];
      }
      default:
        return [new Date(0), dayEnd(now)];
    }
  }, [dateFilter, customStart, customEnd]);

  const rangeLabel = useMemo(() => {
    if (dateFilter === 'all') return 'Shuru se ab tak';
    const f = (d: Date) => new Intl.DateTimeFormat('en-PK', { dateStyle: 'medium' }).format(d);
    if (dayKey(rangeStart) === dayKey(rangeEnd)) return f(rangeStart);
    return `${f(rangeStart)} — ${f(rangeEnd)}`;
  }, [dateFilter, rangeStart, rangeEnd]);

  /* Daira badle to list dobara upar se */
  useEffect(() => { setVisible(50); }, [dateFilter, customStart, customEnd, paymentFilter, creditOnly, search]);

  const inRange = useMemo(
    () => sales.filter((s) => { const d = new Date(s.soldAt); return d >= rangeStart && d <= rangeEnd; }),
    [sales, rangeStart, rangeEnd],
  );

  const filteredSales = useMemo(() => {
    let list = [...inRange];
    if (paymentFilter !== 'all') list = list.filter((s) => s.paymentMethod === paymentFilter);
    if (creditOnly) list = list.filter((s) => s.creditAmount > 0);
    const q = search.toLowerCase().trim();
    if (q) {
      list = list.filter((s) =>
        s.saleNumber.toLowerCase().includes(q) ||
        s.customer?.name?.toLowerCase().includes(q) ||
        s.customer?.phone?.toLowerCase().includes(q) ||
        s.items.some((it: any) =>
          it.product?.name?.toLowerCase().includes(q) ||
          it.product?.sku?.toLowerCase().includes(q) ||
          it.product?.barcode?.toLowerCase().includes(q)),
      );
    }
    return list.sort((a, b) => new Date(b.soldAt).getTime() - new Date(a.soldAt).getTime());
  }, [inRange, paymentFilter, creditOnly, search]);

  /* ─── Ginti ─── */
  const stats = useMemo(() => {
    const live = filteredSales.filter((s) => s.status !== 'VOIDED');
    const totalAmount = live.reduce((s, x) => s + x.total, 0);
    const totalCredit = live.reduce((s, x) => s + x.creditAmount, 0);
    const totalPaid = live.reduce((s, x) => s + x.paidAmount, 0);
    const totalDiscount = live.reduce((s, x) => s + (x.discount || 0), 0);
    const cogs = live.reduce((s: number, x: any) => s + Number(x.costOfGoods || 0), 0);
    const profit = totalAmount - cogs;
    const items = live.reduce((s, x) => s + x.items.length, 0);
    const qty = live.reduce((s, x) => s + x.items.reduce((a: number, it: any) => a + Number(it.quantity || 0), 0), 0);
    return {
      count: live.length,
      voidedCount: filteredSales.filter((s) => s.status === 'VOIDED').length,
      totalAmount, totalCredit, totalPaid, totalDiscount, profit, cogs, items, qty,
      avgOrder: live.length ? totalAmount / live.length : 0,
      margin: totalAmount > 0 ? (profit / totalAmount) * 100 : 0,
      creditCount: live.filter((s) => s.creditAmount > 0).length,
      best: live.reduce<any>((b, s) => (s.total > (b?.total || 0) ? s : b), null),
    };
  }, [filteredSales]);

  /* ─── Rozana rujhan — chune hue daire ka, maqami din par ─── */
  const trendData = useMemo(() => {
    const days = Math.min(
      Math.max(Math.ceil((rangeEnd.getTime() - rangeStart.getTime()) / 86400000) + 1, 1),
      90,
    );
    const buckets: Record<string, { label: string; sales: number; orders: number; profit: number }> = {};
    for (let i = days - 1; i >= 0; i--) {
      const d = new Date(rangeEnd); d.setDate(rangeEnd.getDate() - i);
      buckets[dayKey(d)] = {
        label: d.toLocaleDateString('en-PK', days > 14 ? { day: 'numeric', month: 'short' } : { weekday: 'short' }),
        sales: 0, orders: 0, profit: 0,
      };
    }
    for (const s of inRange) {
      if (s.status === 'VOIDED') continue;
      const k = dayKey(new Date(s.soldAt));
      if (buckets[k]) {
        buckets[k].sales += s.total;
        buckets[k].orders += 1;
        buckets[k].profit += s.total - Number((s as any).costOfGoods || 0);
      }
    }
    return Object.values(buckets);
  }, [inRange, rangeStart, rangeEnd]);

  /* ─── Kis waqt sab se zyada bikri — staff ki duty isi se lagti hai ─── */
  const hourlyData = useMemo(() => {
    const hours = Array.from({ length: 24 }, (_, h) => ({
      h,
      label: h === 0 ? '12am' : h < 12 ? `${h}am` : h === 12 ? '12pm' : `${h - 12}pm`,
      sales: 0, orders: 0,
    }));
    for (const s of inRange) {
      if (s.status === 'VOIDED') continue;
      const h = new Date(s.soldAt).getHours();
      hours[h].sales += s.total;
      hours[h].orders += 1;
    }
    return hours;
  }, [inRange]);

  const peakHour = useMemo(
    () => hourlyData.reduce((b, h) => (h.sales > b.sales ? h : b), hourlyData[0]),
    [hourlyData],
  );

  /* ─── Hafte ka kaun sa din behtar ─── */
  const weekdayData = useMemo(() => {
    const names = ['Itwar', 'Peer', 'Mangal', 'Budh', 'Jumeraat', 'Juma', 'Hafta'];
    const rows = names.map((label) => ({ label, sales: 0, orders: 0 }));
    for (const s of inRange) {
      if (s.status === 'VOIDED') continue;
      const d = new Date(s.soldAt).getDay();
      rows[d].sales += s.total;
      rows[d].orders += 1;
    }
    return rows;
  }, [inRange]);

  /* ─── Kya sab se zyada bika ─── */
  const topProducts = useMemo(() => {
    const map = new Map<string, { name: string; qty: number; revenue: number; orders: number }>();
    for (const s of filteredSales) {
      if (s.status === 'VOIDED') continue;
      for (const it of s.items as any[]) {
        const name = it.product?.name ?? 'Doosra';
        const row = map.get(name) ?? { name, qty: 0, revenue: 0, orders: 0 };
        row.qty += Number(it.quantity || 0);
        row.revenue += Number(it.lineTotal ?? it.total ?? (it.unitPrice || 0) * (it.quantity || 0));
        row.orders += 1;
        map.set(name, row);
      }
    }
    return [...map.values()].sort((a, b) => b.revenue - a.revenue).slice(0, 10);
  }, [filteredSales]);

  /* ─── Kaun sa customer sab se qeemti ─── */
  const topCustomers = useMemo(() => {
    const map = new Map<string, { name: string; phone?: string; total: number; orders: number; credit: number }>();
    for (const s of filteredSales) {
      if (s.status === 'VOIDED' || !s.customer) continue;
      const key = s.customer.id;
      const row = map.get(key) ?? { name: s.customer.name, phone: s.customer.phone ?? undefined, total: 0, orders: 0, credit: 0 };
      row.total += s.total;
      row.orders += 1;
      row.credit += s.creditAmount;
      map.set(key, row);
    }
    return [...map.values()].sort((a, b) => b.total - a.total).slice(0, 10);
  }, [filteredSales]);

  /* ─── Paisa kis tareeqe se aaya ─── */
  const payData = useMemo(() => {
    const map = new Map<string, number>();
    for (const s of filteredSales) {
      if (s.status === 'VOIDED') continue;
      map.set(s.paymentMethod, (map.get(s.paymentMethod) ?? 0) + s.total);
    }
    return [...map.entries()]
      .map(([m, value]) => ({ name: paymentConfig[m]?.label ?? m, value, hex: paymentConfig[m]?.hex ?? '#64748b' }))
      .sort((a, b) => b.value - a.value);
  }, [filteredSales]);

  const hasFilters = !!search || dateFilter !== 'today' || paymentFilter !== 'all' || creditOnly;
  const clearFilters = () => {
    setSearch(''); setDateFilter('today'); setPaymentFilter('all');
    setCreditOnly(false); setCustomStart(''); setCustomEnd('');
  };

  /* ─── CSV ─── */
  const exportCSV = () => {
    if (filteredSales.length === 0) return toast.error('Koi data nahi');
    const head = [
      [`Bikri ka record — ${tenantName || 'Nafaa'}`],
      [`Dukaan: ${shopName || 'Sab'}  •  Nikala gaya: ${new Date().toLocaleString('en-PK')}`],
      [`Muddat: ${rangeLabel}  •  Bikri: ${stats.count}  •  Kul: ${stats.totalAmount.toFixed(2)}`],
      [`Wasool: ${stats.totalPaid.toFixed(2)}  •  Udhaar: ${stats.totalCredit.toFixed(2)}  •  Munafa: ${stats.profit.toFixed(2)} (${stats.margin.toFixed(1)}%)`],
      [''],
    ];
    const headers = ['Bill #', 'Tareekh', 'Waqt', 'Customer', 'Phone', 'Cheezein', 'Qty', 'Tareeqa', 'Subtotal', 'Chhoot', 'Kul', 'Wasool', 'Udhaar', 'Halat'];
    const rows = filteredSales.map((s) => [
      s.saleNumber,
      new Date(s.soldAt).toLocaleDateString('en-PK'),
      fmtTime(s.soldAt),
      s.customer?.name || 'Walk-in',
      s.customer?.phone || '',
      s.items.length,
      s.items.reduce((a: number, it: any) => a + Number(it.quantity || 0), 0),
      paymentConfig[s.paymentMethod]?.label || s.paymentMethod,
      s.subtotal.toFixed(2), s.discount.toFixed(2), s.total.toFixed(2),
      s.paidAmount.toFixed(2), s.creditAmount.toFixed(2), s.status,
    ]);
    const csv = [...head, headers, ...rows]
      .map((r) => r.map((c) => `"${String(c).replace(/"/g, '""')}"`).join(','))
      .join('\n');
    const blob = new Blob(['﻿' + csv], { type: 'text/csv;charset=utf-8' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = `bikri-${dayKey(new Date())}.csv`;
    a.click();
    URL.revokeObjectURL(url);
    toast.success(`${filteredSales.length} bill CSV me`);
  };

  const handlePrint = () => window.print();
  const printDate = new Date().toLocaleString('en-PK', { dateStyle: 'full', timeStyle: 'short' });

  useEffect(() => {
    const onKey = (e: KeyboardEvent) => {
      if (e.key === 'Escape') {
        if (voidTarget) return setVoidTarget(null);
        if (showTeacher) return setShowTeacher(false);
        if (showReceiptSettings) return setShowReceiptSettings(false);
        return;
      }
      const tag = document.activeElement?.tagName;
      if (tag === 'INPUT' || tag === 'TEXTAREA' || tag === 'SELECT') return;
      if (e.key === '/') { e.preventDefault(); searchRef.current?.focus(); }
      if (e.key.toLowerCase() === 'a') setTab((t) => (t === 'analytics' ? 'list' : 'analytics'));
      if (e.key.toLowerCase() === 'g') setShowTeacher(true);
      if (e.key.toLowerCase() === 'p') handlePrint();
      if (e.key.toLowerCase() === 'b') { e.preventDefault(); setScannerOpen(true); }
    };
    window.addEventListener('keydown', onKey);
    return () => window.removeEventListener('keydown', onKey);
  });

  return (
    <div className="space-y-4 sm:space-y-5 pb-10">
      {/* ═══ PRINT HEADER ═══ */}
      <div className="hidden print:block mb-4">
        <h1 className="text-xl font-extrabold">{tenantName || 'Nafaa'} — Bikri ka Record</h1>
        <p className="text-xs text-slate-600">
          {shopName ? `${shopName} • ` : ''}{rangeLabel} • {printDate}
        </p>
        <p className="text-xs text-slate-600 mt-1">
          {stats.count} bill • Kul {formatPKR(stats.totalAmount)} • Wasool {formatPKR(stats.totalPaid)} • Udhaar {formatPKR(stats.totalCredit)}
        </p>
      </div>

      {/* ═══ HERO ═══ */}
      <section className="relative overflow-hidden rounded-3xl bg-gradient-to-br from-slate-950 via-sky-900 to-cyan-700 text-white p-5 sm:p-6 shadow-2xl print:hidden">
        <div className="absolute -top-24 -right-20 h-72 w-72 rounded-full bg-sky-400/25 blur-3xl" />
        <div className="absolute -bottom-24 -left-20 h-64 w-64 rounded-full bg-cyan-300/15 blur-3xl" />
        <div className="absolute inset-0 opacity-[0.06]"
          style={{ backgroundImage: 'radial-gradient(circle at 1px 1px, #fff 1px, transparent 0)', backgroundSize: '22px 22px' }} />

        <div className="relative flex items-start justify-between gap-4 flex-wrap">
          <div className="min-w-0">
            <div className="inline-flex items-center gap-2 rounded-full bg-white/15 backdrop-blur px-3 py-1 text-[11px] font-black border border-white/25 uppercase tracking-widest">
              <Receipt className="h-3.5 w-3.5 text-amber-300" /> Retail · Bikri ka record
            </div>
            <h1 className="mt-3 text-2xl sm:text-3xl lg:text-4xl font-black leading-tight">🧾 Bikri</h1>
            <p className="mt-1.5 text-xs sm:text-sm font-bold text-white/90">
              {rangeLabel} · <strong className="text-emerald-200">{stats.count}</strong> bill ·{' '}
              <strong className="text-white">{showValue(formatPKR(stats.totalAmount))}</strong>
              {stats.totalCredit > 0 && (
                <> · <span className="text-amber-200">{showValue(formatPKR(stats.totalCredit))} udhaar</span></>
              )}
            </p>
          </div>

          <div className="flex gap-2 flex-wrap items-center shrink-0">
            <PrivacyToggle compact />
            <button onClick={() => setShowTeacher(true)} title="Sikhein (G)"
              className="h-11 px-3 rounded-xl bg-amber-400/90 hover:bg-amber-400 text-slate-900 text-xs font-black inline-flex items-center gap-1.5 shadow-lg transition">
              <GraduationCap className="h-4 w-4" /> <span className="hidden sm:inline">Sikhein</span>
            </button>
            <div className="relative">
              <button ref={receiptBtnRef} onClick={() => setShowReceiptSettings((v) => !v)}
                className={`h-11 px-3 rounded-xl text-xs font-black inline-flex items-center gap-1.5 border backdrop-blur transition ${
                  showReceiptSettings ? 'bg-white text-slate-900 border-white' : 'bg-white/15 hover:bg-white/25 border-white/25'
                }`}>
                <Settings2 className="h-4 w-4" /> <span className="hidden sm:inline">Receipt</span>
                {prefsSaved && <Check className="h-3 w-3 text-emerald-400" />}
              </button>
              {showReceiptSettings && (
                <ReceiptPrefsPopover anchorRef={receiptBtnRef} prefs={receiptPrefs} onChange={updateReceiptPrefs} onClose={() => setShowReceiptSettings(false)} />
              )}
            </div>
            <button onClick={() => refetch()} disabled={isRefetching} title="Taaza"
              className="h-11 w-11 rounded-xl bg-white/15 hover:bg-white/25 border border-white/25 flex items-center justify-center backdrop-blur disabled:opacity-50 transition">
              <RefreshCw className={`h-4 w-4 ${isRefetching ? 'animate-spin' : ''}`} />
            </button>
            <button onClick={exportCSV} title="CSV"
              className="h-11 w-11 rounded-xl bg-white/15 hover:bg-white/25 border border-white/25 flex items-center justify-center backdrop-blur transition">
              <Download className="h-4 w-4" />
            </button>
            <button onClick={() => setScannerOpen(true)} title="Bill ka barcode scan karein (B)"
              className="h-11 px-3.5 rounded-xl bg-emerald-500 hover:bg-emerald-400 text-white text-xs font-black inline-flex items-center gap-1.5 shadow-lg transition">
              <ScanLine className="h-4 w-4" /> <span className="hidden sm:inline">Bill Scan</span>
            </button>
            <button onClick={handlePrint} title="Print (P)"
              className="h-11 px-3.5 rounded-xl bg-white text-slate-900 text-xs font-black inline-flex items-center gap-1.5 shadow-lg transition">
              <Printer className="h-4 w-4" /> Print
            </button>
          </div>
        </div>
      </section>

      {/* ═══ KPI ═══
          Pehle aath box ek hi qatar me thay (`xl:grid-cols-8`) —
          itni tangi me raqam kat kar "Rs 2,03…" ban jati thi. Ab
          chaar per row aur bare card, taake poora number — "Rs
          2,032,274.00" — jyun ka tyun sama jaye. Koi "10k", koi
          "lakh/crore" nahi: dukaan-daar ko poori raqam chahiye. */}
      <section className="grid grid-cols-2 lg:grid-cols-4 gap-3 print:hidden">
        <Kpi icon={ShoppingCart} label="Bill" value={stats.count}
          sub={stats.voidedCount > 0 ? `${stats.voidedCount} wapas liye` : `${stats.qty.toFixed(0)} cheezein bikin`} tone="blue" />
        <Kpi icon={TrendingUp} label="Kul bikri" value={showValue(formatPKR(stats.totalAmount))}
          sub={rangeLabel} tone="emerald" highlight />
        <Kpi icon={Award} label="Munafa" value={showValue(formatPKR(stats.profit))}
          sub={`${stats.margin.toFixed(1)}% margin`} tone="violet" />
        <Kpi icon={Banknote} label="Wasool hua" value={showValue(formatPKR(stats.totalPaid))}
          sub="Haath me aaya" tone="emerald" />
      </section>

      <section className="grid grid-cols-2 lg:grid-cols-4 gap-3 print:hidden">
        <Kpi icon={BookOpen} label="Udhaar" value={showValue(formatPKR(stats.totalCredit))}
          sub={`${stats.creditCount} bill par baqi`} tone="amber"
          onClick={() => setCreditOnly(!creditOnly)} active={creditOnly} />
        <Kpi icon={BarChart3} label="Ausat bill" value={showValue(formatPKR(stats.avgOrder))}
          sub="Har customer ka" tone="blue" />
        <Kpi icon={Clock} label="Sab se masroof waqt" value={peakHour?.orders ? peakHour.label : '—'}
          sub={peakHour?.orders ? `${peakHour.orders} bill is ghante` : 'Abhi koi bikri nahi'} tone="violet" />
        <Kpi icon={Trophy} label="Sab se bara bill" value={showValue(formatPKR(stats.best?.total ?? 0))}
          sub={stats.best?.customer?.name ?? 'Walk-in'} tone="amber" />
      </section>

      {/* ═══ TABS ═══ */}
      <div className="grid grid-cols-2 gap-2 sm:gap-3 print:hidden">
        {([
          { v: 'list' as const, label: 'Bill', hint: 'Har bikri ka record', icon: Receipt, n: stats.count },
          { v: 'analytics' as const, label: 'Analytics', hint: 'Kab, kya aur kis se', icon: BarChart3, n: undefined },
        ]).map((t) => {
          const on = tab === t.v;
          return (
            <button key={t.v} onClick={() => setTab(t.v)}
              className={`group relative overflow-hidden rounded-3xl border-2 px-4 sm:px-6 py-4 text-left transition active:scale-[0.99] ${
                on ? 'bg-gradient-to-br from-sky-600 to-cyan-700 border-transparent text-white shadow-xl shadow-sky-500/30'
                   : 'bg-white dark:bg-slate-900 border-slate-200 dark:border-slate-800 text-slate-600 dark:text-slate-300 hover:border-sky-400 hover:shadow-lg'
              }`}>
              {on && <div className="absolute -top-10 -right-10 h-28 w-28 rounded-full bg-white/15 blur-2xl" />}
              <div className="relative flex items-center gap-3">
                <div className={`h-11 w-11 sm:h-12 sm:w-12 rounded-2xl flex items-center justify-center shrink-0 transition ${
                  on ? 'bg-white/20' : 'bg-gradient-to-br from-sky-500 to-cyan-700 text-white group-hover:scale-105'
                }`}>
                  <t.icon className="h-5 w-5 sm:h-6 sm:w-6" />
                </div>
                <div className="min-w-0 flex-1">
                  <div className="flex items-center gap-2">
                    <span className="text-base sm:text-lg font-black truncate">{t.label}</span>
                    {t.n !== undefined && (
                      <span className={`px-2 py-0.5 rounded-full text-[11px] font-black tabular-nums ${
                        on ? 'bg-black/25 text-white' : 'bg-slate-100 dark:bg-slate-800 text-slate-500'
                      }`}>{t.n}</span>
                    )}
                  </div>
                  <div className={`text-[11px] font-bold truncate ${on ? 'text-white/80' : 'text-slate-400'}`}>{t.hint}</div>
                </div>
              </div>
            </button>
          );
        })}
      </div>

      {/* ═══ TOOLBAR ═══
          Pehle tareekh ki sat gooliyan, payment ke chhe button aur
          search — sab hamesha khule rehte thay. Aadhi screen isi me
          chali jati thi aur asal cheez (bill ki list) neeche dhakel
          jati. Ab sirf search samne; baqi chaant ek dropdown me,
          aur jo chaant lagi ho wo button par nazar aa jati hai. */}
      <section className="rounded-3xl bg-white dark:bg-slate-900 border-2 border-slate-200 dark:border-slate-800 shadow-sm p-3 sm:p-4 print:hidden">
        <div className="flex gap-2 flex-wrap items-center">
          <div className="relative flex-1 min-w-[220px]">
            <Search className="h-5 w-5 text-slate-400 absolute left-3.5 top-1/2 -translate-y-1/2 pointer-events-none" />
            <input ref={searchRef} value={search} onChange={(e) => setSearch(e.target.value)}
              placeholder="Bill #, customer, cheez, barcode… (/ dabao)"
              className="h-12 w-full rounded-2xl border-2 border-slate-200 dark:border-slate-700 bg-white dark:bg-slate-800 pl-11 pr-10 text-sm font-bold text-slate-900 dark:text-white placeholder:text-slate-400 focus:outline-none focus:border-sky-500 transition" />
            {search && (
              <button onClick={() => setSearch('')}
                className="absolute right-3 top-1/2 -translate-y-1/2 h-7 w-7 rounded-lg hover:bg-slate-100 dark:hover:bg-slate-700 flex items-center justify-center">
                <X className="h-4 w-4 text-slate-400" />
              </button>
            )}
          </div>

          {/* Tareekh — dropdown */}
          <div className="relative">
            <button onClick={() => { setShowDatePicker((v) => !v); setShowMoreFilters(false); }}
              className={`h-12 px-4 rounded-2xl border-2 text-sm font-black inline-flex items-center gap-2 transition ${
                dateFilter !== 'today'
                  ? 'border-sky-500 bg-sky-50 dark:bg-sky-500/15 text-sky-700 dark:text-sky-300'
                  : 'border-slate-200 dark:border-slate-700 bg-white dark:bg-slate-800 text-slate-700 dark:text-slate-200 hover:border-sky-400'
              }`}>
              <CalendarRange className="h-4 w-4" />
              <span className="max-w-[140px] truncate">{DATE_OPTIONS.find((d) => d.v === dateFilter)?.l}</span>
              <ChevronDown className={`h-3.5 w-3.5 transition ${showDatePicker ? 'rotate-180' : ''}`} />
            </button>
            {showDatePicker && (
              <>
                <div className="fixed inset-0 z-30" onClick={() => setShowDatePicker(false)} />
                <div className="absolute right-0 z-40 mt-2 w-72 rounded-2xl bg-white dark:bg-slate-900 border-2 border-slate-200 dark:border-slate-700 shadow-2xl p-3 space-y-2">
                  <div className="text-[10px] font-black uppercase tracking-widest text-slate-500">Tareekh chunein</div>
                  <div className="grid grid-cols-2 gap-1.5">
                    {DATE_OPTIONS.map((d) => (
                      <button key={d.v}
                        onClick={() => { setDateFilter(d.v); if (d.v !== 'custom') setShowDatePicker(false); }}
                        className={`h-10 rounded-xl text-xs font-black transition ${
                          dateFilter === d.v ? 'bg-sky-600 text-white shadow'
                                             : 'bg-slate-100 dark:bg-slate-800 text-slate-700 dark:text-slate-300 hover:bg-slate-200 dark:hover:bg-slate-700'
                        }`}>{d.l}</button>
                    ))}
                  </div>
                  {dateFilter === 'custom' && (
                    <div className="grid grid-cols-2 gap-2 pt-1">
                      <div>
                        <label className="text-[10px] font-black uppercase text-slate-500 mb-1 block">Se</label>
                        <input type="date" value={customStart} onChange={(e) => setCustomStart(e.target.value)}
                          className="h-10 w-full rounded-lg border-2 border-slate-200 dark:border-slate-700 bg-white dark:bg-slate-800 px-2 text-xs font-bold text-slate-900 dark:text-white focus:outline-none focus:border-sky-500" />
                      </div>
                      <div>
                        <label className="text-[10px] font-black uppercase text-slate-500 mb-1 block">Tak</label>
                        <input type="date" value={customEnd} onChange={(e) => setCustomEnd(e.target.value)}
                          className="h-10 w-full rounded-lg border-2 border-slate-200 dark:border-slate-700 bg-white dark:bg-slate-800 px-2 text-xs font-bold text-slate-900 dark:text-white focus:outline-none focus:border-sky-500" />
                      </div>
                    </div>
                  )}
                  <div className="rounded-xl bg-slate-50 dark:bg-slate-800/60 p-2 text-[11px] font-bold text-slate-500 text-center">
                    {rangeLabel}
                  </div>
                </div>
              </>
            )}
          </div>

          {/* Baqi chaant — dropdown */}
          <div className="relative">
            <button onClick={() => { setShowMoreFilters((v) => !v); setShowDatePicker(false); }}
              className={`h-12 px-4 rounded-2xl border-2 text-sm font-black inline-flex items-center gap-2 transition ${
                paymentFilter !== 'all' || creditOnly
                  ? 'border-amber-500 bg-amber-50 dark:bg-amber-500/15 text-amber-700 dark:text-amber-300'
                  : 'border-slate-200 dark:border-slate-700 bg-white dark:bg-slate-800 text-slate-700 dark:text-slate-200 hover:border-amber-400'
              }`}>
              <Filter className="h-4 w-4" /> Payment Type
              {(paymentFilter !== 'all' || creditOnly) && (
                <span className="h-5 w-5 rounded-full bg-amber-600 text-white text-[10px] flex items-center justify-center">
                  {[paymentFilter !== 'all', creditOnly].filter(Boolean).length}
                </span>
              )}
              <ChevronDown className={`h-3.5 w-3.5 transition ${showMoreFilters ? 'rotate-180' : ''}`} />
            </button>
            {showMoreFilters && (
              <>
                <div className="fixed inset-0 z-30" onClick={() => setShowMoreFilters(false)} />
                <div className="absolute right-0 z-40 mt-2 w-72 rounded-2xl bg-white dark:bg-slate-900 border-2 border-slate-200 dark:border-slate-700 shadow-2xl p-3 space-y-3">
                  <div>
                    <div className="text-[10px] font-black uppercase tracking-widest text-slate-500 mb-1.5">Paisa kis tarah aaya</div>
                    <div className="grid grid-cols-2 gap-1.5">
                      <button onClick={() => setPaymentFilter('all')}
                        className={`h-10 rounded-xl text-[11px] font-black transition ${
                          paymentFilter === 'all' ? 'bg-slate-900 dark:bg-white text-white dark:text-slate-900'
                                                  : 'bg-slate-100 dark:bg-slate-800 text-slate-700 dark:text-slate-300'
                        }`}>Sab</button>
                      {Object.entries(paymentConfig).map(([k, cfg]) => (
                        <button key={k} onClick={() => setPaymentFilter(k as PaymentMethod)}
                          className={`h-10 rounded-xl text-[11px] font-black inline-flex items-center justify-center gap-1 transition ${
                            paymentFilter === k ? 'text-white shadow' : 'bg-slate-100 dark:bg-slate-800 text-slate-700 dark:text-slate-300'
                          }`}
                          style={paymentFilter === k ? { background: cfg.hex } : undefined}>
                          <cfg.icon className="h-3 w-3" /> {cfg.label}
                        </button>
                      ))}
                    </div>
                  </div>
                  <label className="flex items-center gap-2.5 rounded-xl bg-amber-50 dark:bg-amber-500/10 border-2 border-amber-200 dark:border-amber-500/30 p-2.5 cursor-pointer">
                    <input type="checkbox" checked={creditOnly} onChange={(e) => setCreditOnly(e.target.checked)}
                      className="h-4 w-4 rounded accent-amber-600" />
                    <div className="min-w-0">
                      <div className="text-xs font-black text-amber-900 dark:text-amber-200">Sirf udhaar wale</div>
                      <div className="text-[10px] font-bold text-amber-700 dark:text-amber-400">
                        {stats.creditCount} bill par paisa baqi hai
                      </div>
                    </div>
                  </label>
                </div>
              </>
            )}
          </div>

          {hasFilters && (
            <button onClick={clearFilters} title="Payment Type hatayein"
              className="h-12 w-12 rounded-2xl bg-rose-50 dark:bg-rose-500/15 text-rose-600 dark:text-rose-400 flex items-center justify-center transition">
              <X className="h-4 w-4" />
            </button>
          )}
        </div>

        {/* Kya chaant lagi hai — ek line me */}
        {hasFilters && (
          <div className="mt-2.5 flex items-center gap-1.5 flex-wrap text-[11px] font-black">
            <span className="text-slate-400">Payment Type:</span>
            <span className="px-2 py-1 rounded-lg bg-sky-100 dark:bg-sky-500/20 text-sky-700 dark:text-sky-300">{rangeLabel}</span>
            {paymentFilter !== 'all' && (
              <span className="px-2 py-1 rounded-lg bg-slate-100 dark:bg-slate-800 text-slate-600 dark:text-slate-300">
                {paymentConfig[paymentFilter]?.label}
              </span>
            )}
            {creditOnly && (
              <span className="px-2 py-1 rounded-lg bg-amber-100 dark:bg-amber-500/20 text-amber-700 dark:text-amber-300">Sirf udhaar</span>
            )}
            {search && (
              <span className="px-2 py-1 rounded-lg bg-slate-100 dark:bg-slate-800 text-slate-600 dark:text-slate-300">"{search}"</span>
            )}
            <span className="text-slate-400">→ {stats.count} bill</span>
          </div>
        )}
      </section>

      {/* ══════════ ANALYTICS ══════════ */}
      {tab === 'analytics' && (
        <div className="space-y-4 print:hidden">
          {/* Rozana */}
          <Panel icon={TrendingUp} title="Rozana Bikri" hint={`${rangeLabel} — har din kitna bika aur kitna munafa`}>
            <div className="h-72">
              <ResponsiveContainer width="100%" height="100%">
                <ComposedChart data={trendData}>
                  <defs>
                    <linearGradient id="rsSales" x1="0" y1="0" x2="0" y2="1">
                      <stop offset="0%" stopColor={C.sales} stopOpacity={0.45} />
                      <stop offset="100%" stopColor={C.sales} stopOpacity={0.02} />
                    </linearGradient>
                  </defs>
                  <CartesianGrid strokeDasharray="3 3" stroke={GRID} vertical={false} />
                  <XAxis dataKey="label" stroke={AXIS} fontSize={11} fontWeight={700} />
                  <YAxis stroke={AXIS} fontSize={11}
                    width={78} tickFormatter={(v) => Number(v).toLocaleString('en-PK')} />
                  <Tooltip contentStyle={CHART_TOOLTIP}
                    formatter={(v: any, n: any) => [formatPKR(Number(v)), n === 'sales' ? 'Bikri' : n === 'profit' ? 'Munafa' : 'Bill']} />
                  <Legend formatter={(v) => (v === 'sales' ? 'Bikri' : v === 'profit' ? 'Munafa' : 'Bill')} />
                  <Area type="monotone" dataKey="sales" stroke={C.sales} strokeWidth={3} fill="url(#rsSales)" />
                  <Line type="monotone" dataKey="profit" stroke={C.profit} strokeWidth={3} dot={{ r: 3, strokeWidth: 0, fill: C.profit }} />
                </ComposedChart>
              </ResponsiveContainer>
            </div>
          </Panel>

          <div className="grid lg:grid-cols-2 gap-4">
            {/* Ghante */}
            <Panel icon={Clock} title="Kis Waqt Bikri Hoti Hai"
              hint={peakHour?.orders ? `Sab se masroof: ${peakHour.label}` : 'Staff ki duty isi se lagti hai'}>
              <div className="h-64">
                <ResponsiveContainer width="100%" height="100%">
                  <BarChart data={hourlyData}>
                    <CartesianGrid strokeDasharray="3 3" stroke={GRID} vertical={false} />
                    <XAxis dataKey="label" stroke={AXIS} fontSize={9} interval={1} />
                    <YAxis stroke={AXIS} fontSize={11}
                      width={78} tickFormatter={(v) => Number(v).toLocaleString('en-PK')} />
                    <Tooltip contentStyle={CHART_TOOLTIP}
                      formatter={(v: any, n: any) => [n === 'sales' ? formatPKR(Number(v)) : v, n === 'sales' ? 'Bikri' : 'Bill']} />
                    <Bar dataKey="sales" radius={[6, 6, 0, 0]}>
                      {hourlyData.map((h, i) => (
                        <Cell key={i} fill={h.h === peakHour?.h && h.sales > 0 ? C.peak : C.hours} />
                      ))}
                    </Bar>
                  </BarChart>
                </ResponsiveContainer>
              </div>
              <p className="text-[11px] font-bold text-slate-500 dark:text-slate-400 mt-2">
                Peela column sab se masroof ghanta hai — us waqt counter par zyada banda rakhein.
              </p>
            </Panel>

            {/* Payment */}
            <Panel icon={CreditCard} title="Paisa Kis Tarah Aaya" hint="Cash, card ya mobile wallet">
              {payData.length === 0 ? (
                <div className="h-64 flex flex-col items-center justify-center gap-2">
                  <CreditCard className="h-10 w-10 text-slate-300" />
                  <p className="text-sm font-black text-slate-500">Is muddat me koi bikri nahi</p>
                </div>
              ) : (
                <>
                  <div className="h-56">
                    <ResponsiveContainer width="100%" height="100%">
                      <PieChart>
                        <Pie data={payData} dataKey="value" nameKey="name" cx="50%" cy="50%"
                          innerRadius={54} outerRadius={84} paddingAngle={4} stroke="none">
                          {payData.map((d, i) => <Cell key={i} fill={d.hex} />)}
                        </Pie>
                        <Tooltip contentStyle={CHART_TOOLTIP} formatter={(v: any) => formatPKR(Number(v))} />
                        <Legend />
                      </PieChart>
                    </ResponsiveContainer>
                  </div>
                  <div className="grid grid-cols-2 gap-1.5 mt-1">
                    {payData.map((p) => (
                      <div key={p.name} className="rounded-xl bg-slate-50 dark:bg-slate-800/60 p-2 flex items-center justify-between">
                        <span className="text-[11px] font-black text-slate-600 dark:text-slate-300">{p.name}</span>
                        <span className="text-xs font-black tabular-nums" style={{ color: p.hex }}>
                          {showValue(formatPKR(p.value))}
                        </span>
                      </div>
                    ))}
                  </div>
                </>
              )}
            </Panel>
          </div>

          <div className="grid lg:grid-cols-2 gap-4">
            {/* Top products */}
            <Panel icon={Package} title="Sab Se Zyada Kya Bika" hint="Kamai ke hisab se">
              {topProducts.length === 0 ? (
                <p className="py-12 text-center text-xs font-bold text-slate-400">Is muddat me koi bikri nahi</p>
              ) : (
                <div className="space-y-2">
                  {topProducts.map((p, i) => {
                    const pct = topProducts[0].revenue > 0 ? (p.revenue / topProducts[0].revenue) * 100 : 0;
                    return (
                      <div key={p.name} className="rounded-2xl bg-slate-50 dark:bg-slate-800/60 p-3">
                        <div className="flex items-center gap-2.5 mb-1.5">
                          <span className={`h-7 w-7 rounded-xl flex items-center justify-center text-[11px] font-black shrink-0 ${
                            i === 0 ? 'bg-gradient-to-br from-amber-400 to-orange-600 text-white' : 'bg-slate-200 dark:bg-slate-700 text-slate-600 dark:text-slate-300'
                          }`}>{i === 0 ? '🏆' : i + 1}</span>
                          <span className="font-black text-sm text-slate-900 dark:text-white truncate flex-1">{p.name}</span>
                          <span className="text-[11px] font-bold text-slate-400 shrink-0 tabular-nums">{p.qty.toFixed(0)} bikay</span>
                          <span className="text-sm font-black text-slate-900 dark:text-white tabular-nums shrink-0">
                            {showValue(formatPKR(p.revenue))}
                          </span>
                        </div>
                        <div className="h-1.5 rounded-full bg-slate-200 dark:bg-slate-700 overflow-hidden">
                          <div className="h-full rounded-full bg-gradient-to-r from-sky-500 to-cyan-600 transition-all duration-700"
                            style={{ width: `${Math.min(pct, 100)}%` }} />
                        </div>
                      </div>
                    );
                  })}
                </div>
              )}
            </Panel>

            {/* Top customers */}
            <Panel icon={User} title="Sab Se Qeemti Customer" hint="Jo sab se zyada kharch karte hain">
              {topCustomers.length === 0 ? (
                <p className="py-12 text-center text-xs font-bold text-slate-400">
                  Is muddat me kisi bill par customer darj nahi
                </p>
              ) : (
                <div className="space-y-1.5">
                  {topCustomers.map((c, i) => (
                    <div key={c.name + i} className="flex items-center gap-3 rounded-2xl bg-slate-50 dark:bg-slate-800/60 p-2.5">
                      <span className={`h-9 w-9 rounded-2xl flex items-center justify-center text-xs font-black shrink-0 ${
                        i === 0 ? 'bg-gradient-to-br from-amber-400 to-orange-600 text-white' : 'bg-slate-200 dark:bg-slate-700 text-slate-600 dark:text-slate-300'
                      }`}>{i === 0 ? '👑' : i + 1}</span>
                      <div className="min-w-0 flex-1">
                        <div className="font-black text-sm text-slate-900 dark:text-white truncate">{c.name}</div>
                        <div className="text-[11px] font-bold text-slate-500 dark:text-slate-400">
                          {c.orders} bill{c.phone ? ` · ${c.phone}` : ''}
                        </div>
                      </div>
                      <div className="text-right shrink-0">
                        <div className="text-sm font-black text-slate-900 dark:text-white tabular-nums">
                          {showValue(formatPKR(c.total))}
                        </div>
                        {c.credit > 0 && (
                          <div className="text-[10px] font-black text-amber-600 tabular-nums">
                            {showValue(formatPKR(c.credit))} udhaar
                          </div>
                        )}
                      </div>
                    </div>
                  ))}
                </div>
              )}
            </Panel>
          </div>

          {/* Hafte ka din */}
          <Panel icon={CalendarDays} title="Hafte Ka Kaun Sa Din Behtar" hint="Kis din dukaan zyada chalti hai">
            <div className="h-56">
              <ResponsiveContainer width="100%" height="100%">
                <BarChart data={weekdayData}>
                  <CartesianGrid strokeDasharray="3 3" stroke={GRID} vertical={false} />
                  <XAxis dataKey="label" stroke={AXIS} fontSize={11} fontWeight={700} />
                  <YAxis stroke={AXIS} fontSize={11}
                    width={78} tickFormatter={(v) => Number(v).toLocaleString('en-PK')} />
                  <Tooltip contentStyle={CHART_TOOLTIP}
                    formatter={(v: any, n: any) => [n === 'sales' ? formatPKR(Number(v)) : v, n === 'sales' ? 'Bikri' : 'Bill']} />
                  <Bar dataKey="sales" fill={C.weekday} radius={[8, 8, 0, 0]} maxBarSize={60} />
                </BarChart>
              </ResponsiveContainer>
            </div>
          </Panel>
        </div>
      )}

      {/* ══════════ LIST ══════════ */}
      {tab === 'list' && (
        <section className="rounded-3xl bg-white dark:bg-slate-900 border-2 border-slate-200 dark:border-slate-800 shadow-sm overflow-hidden print:border-0 print:rounded-none print:shadow-none">
          {isLoading ? (
            <div className="p-6 space-y-2">
              {Array.from({ length: 5 }).map((_, i) => (
                <div key={i} className="h-24 rounded-xl bg-slate-100 dark:bg-slate-800 animate-pulse" />
              ))}
            </div>
          ) : filteredSales.length === 0 ? (
            <div className="p-12 sm:p-16 text-center">
              <div className="h-20 w-20 rounded-3xl bg-gradient-to-br from-sky-500 to-cyan-700 mx-auto flex items-center justify-center shadow-lg shadow-sky-500/40">
                <ShoppingCart className="h-10 w-10 text-white" />
              </div>
              <h3 className="mt-4 text-lg font-black text-slate-900 dark:text-white">
                {hasFilters ? 'Is Payment Type par kuch nahi mila' : 'Is muddat me koi bikri nahi'}
              </h3>
              <p className="mt-1.5 text-sm font-bold text-slate-500 dark:text-slate-400 max-w-md mx-auto">
                {hasFilters ? 'Tareekh ya Payment Type badal kar dekhein' : 'POS se pehli bikri karein — 30 second ka kaam'}
              </p>
              <div className="mt-4 flex gap-2 justify-center flex-wrap">
                {hasFilters ? (
                  <Button variant="secondary" className="font-black" onClick={clearFilters}>
                    <X className="h-4 w-4" /> Payment Type hatayein
                  </Button>
                ) : (
                  <Link to="/pos">
                    <Button className="bg-gradient-to-r from-sky-600 to-cyan-700 font-black">
                      <ShoppingCart className="h-4 w-4" /> POS par jayein
                    </Button>
                  </Link>
                )}
              </div>
            </div>
          ) : (
            <>
              <div className="divide-y-2 divide-slate-100 dark:divide-slate-800">
                {filteredSales.slice(0, visible).map((sale) => {
                  const PayIcon = paymentConfig[sale.paymentMethod]?.icon || CreditCard;
                  const payColor = paymentConfig[sale.paymentMethod]?.color || '#64748b';
                  const totalQty = sale.items.reduce((a: number, it: any) => a + Number(it.quantity || 0), 0);
                  const isVoided = sale.status === 'VOIDED';

                  return (
                    <div key={sale.id}
                      className={`relative px-4 sm:px-5 py-4 transition group ${
                        isVoided ? 'opacity-60 bg-slate-50/60 dark:bg-slate-800/30' : 'hover:bg-sky-50/40 dark:hover:bg-sky-500/5'
                      }`}>
                      <Link to={receiptLink(sale.id)} className="absolute inset-0 print:hidden" aria-label={`Receipt ${sale.saleNumber}`} />

                      <div className="flex items-start justify-between gap-3">
                        <div className="flex items-start gap-3 flex-1 min-w-0">
                          <div className="h-12 w-12 rounded-2xl flex items-center justify-center shrink-0"
                            style={{ backgroundColor: payColor + '20' }}>
                            <PayIcon className="h-5 w-5" style={{ color: payColor }} />
                          </div>
                          <div className="min-w-0 flex-1">
                            <div className="flex items-center gap-2 flex-wrap">
                              <span className="font-mono font-black text-slate-900 dark:text-white text-sm">{sale.saleNumber}</span>
                              {isVoided && (
                                <span className="px-2 py-0.5 rounded-full bg-rose-100 dark:bg-rose-500/20 text-rose-700 dark:text-rose-300 text-[10px] font-black">
                                  WAPAS LI GAYI
                                </span>
                              )}
                              {sale.status === 'FULLY_RETURNED' && (
                                <span className="px-2 py-0.5 rounded-full bg-amber-100 dark:bg-amber-500/20 text-amber-700 dark:text-amber-300 text-[10px] font-black">
                                  POORA WAPAS AAYA
                                </span>
                              )}
                              {sale.status === 'PARTIALLY_RETURNED' && (
                                <span className="px-2 py-0.5 rounded-full bg-orange-100 dark:bg-orange-500/20 text-orange-700 dark:text-orange-300 text-[10px] font-black">
                                  KUCH WAPAS AAYA
                                </span>
                              )}
                              {sale.creditAmount > 0 && !isVoided && (
                                <span className="px-2 py-0.5 rounded-full bg-amber-100 dark:bg-amber-500/20 text-amber-700 dark:text-amber-300 text-[10px] font-black inline-flex items-center gap-1">
                                  <BookOpen className="h-2.5 w-2.5" /> UDHAAR
                                </span>
                              )}
                            </div>
                            <div className="mt-1 text-xs font-bold text-slate-600 dark:text-slate-300 flex items-center gap-2 flex-wrap">
                              <User className="h-3 w-3 shrink-0" />
                              <span className="truncate max-w-[160px]">{sale.customer?.name || 'Walk-in'}</span>
                              {sale.customer?.phone && (
                                <><span className="text-slate-300">•</span><span className="text-slate-500">{sale.customer.phone}</span></>
                              )}
                              <span className="text-slate-300">•</span>
                              <Package className="h-3 w-3 shrink-0" />
                              <span>{sale.items.length} cheezein · {totalQty.toFixed(0)} qty</span>
                            </div>
                            {/* Waqt — poori tareekh aur "kitni der pehle" dono */}
                            <div className="mt-1 text-[10px] font-bold text-slate-500 dark:text-slate-400 inline-flex items-center gap-1.5 flex-wrap">
                              <Clock className="h-2.5 w-2.5" />
                              <span className="text-slate-700 dark:text-slate-200">{fmtTime(sale.soldAt)}</span>
                              <span className="text-slate-300">•</span>
                              <span>{fmtDateTime(sale.soldAt)}</span>
                              <span className="text-slate-300">•</span>
                              <span className="text-sky-600 dark:text-sky-400">{agoPhrase(sale.soldAt)}</span>
                            </div>
                            <div className="mt-2 flex flex-wrap gap-1">
                              {sale.items.slice(0, 4).map((it: any) => (
                                <span key={it.id}
                                  className="px-1.5 py-0.5 rounded text-[10px] font-bold bg-slate-100 dark:bg-slate-800 text-slate-600 dark:text-slate-300 max-w-[180px] truncate inline-flex items-center gap-1">
                                  {it.product?.barcode && <Barcode className="h-2.5 w-2.5 text-sky-600" />}
                                  {it.product?.name} × {Number(it.quantity).toFixed(Number(it.quantity) % 1 === 0 ? 0 : 2)}
                                </span>
                              ))}
                              {sale.items.length > 4 && (
                                <span className="px-1.5 py-0.5 rounded text-[10px] font-bold bg-slate-100 dark:bg-slate-800 text-slate-500">
                                  +{sale.items.length - 4} aur
                                </span>
                              )}
                            </div>
                          </div>
                        </div>

                        <div className="text-right shrink-0">
                          <div className={`text-xl sm:text-2xl font-black tabular-nums ${
                            isVoided ? 'text-slate-400 line-through' : 'text-sky-700 dark:text-sky-400'
                          }`}>
                            {showValue(formatPKR(sale.total))}
                          </div>
                          {sale.changeAmount > 0 && !isVoided && (
                            <div className="text-[10px] font-black text-emerald-700 dark:text-emerald-400 mt-0.5 tabular-nums">
                              Wapsi: {showValue(formatPKR(sale.changeAmount))}
                            </div>
                          )}
                          {sale.creditAmount > 0 && !isVoided && (
                            <div className="text-[10px] font-black text-amber-700 dark:text-amber-400 mt-0.5 tabular-nums">
                              Udhaar: {showValue(formatPKR(sale.creditAmount))}
                            </div>
                          )}
                          <div className="mt-2 flex items-center justify-end gap-1.5 print:hidden">
                            {!isVoided && sale.status !== 'FULLY_RETURNED' && (
                              <button
                                onClick={(e) => { e.preventDefault(); e.stopPropagation(); setReturnTarget(sale); }}
                                title="Customer maal wapas laya hai"
                                className="relative z-10 inline-flex items-center gap-1 rounded-lg bg-amber-50 dark:bg-amber-500/15 hover:bg-amber-100 dark:hover:bg-amber-500/25 px-2 py-1 text-[10px] font-black text-amber-700 dark:text-amber-400 transition">
                                <RotateCcw className="h-3 w-3" /> Wapsi
                              </button>
                            )}
                            {!isVoided && (
                              <button
                                onClick={(e) => { e.preventDefault(); e.stopPropagation(); setVoidTarget(sale); }}
                                title="Ye bikri wapas lein — stock wapas aa jayega"
                                className="relative z-10 inline-flex items-center gap-1 rounded-lg bg-rose-50 dark:bg-rose-500/15 hover:bg-rose-100 dark:hover:bg-rose-500/25 px-2 py-1 text-[10px] font-black text-rose-600 dark:text-rose-400 transition">
                                <Undo2 className="h-3 w-3" /> Wapas lein
                              </button>
                            )}
                            {(() => {
                              const link = billWaLink(sale);
                              if (!link) return null;
                              return (
                                <a href={link} target="_blank" rel="noreferrer"
                                  onClick={(e) => e.stopPropagation()}
                                  title={`${sale.customer?.name} ko WhatsApp par bill bhejein`}
                                  className="relative z-10 inline-flex items-center gap-1 rounded-lg bg-emerald-50 dark:bg-emerald-500/15 hover:bg-emerald-100 dark:hover:bg-emerald-500/25 px-2 py-1 text-[10px] font-black text-emerald-700 dark:text-emerald-400 transition">
                                  <MessageCircle className="h-3 w-3" /> WhatsApp
                                </a>
                              );
                            })()}
                            <Link to={receiptLink(sale.id, true)} onClick={(e) => e.stopPropagation()} title="Seedha print"
                              className="relative z-10 inline-flex items-center gap-1 rounded-lg bg-slate-100 dark:bg-slate-800 hover:bg-sky-100 dark:hover:bg-sky-500/20 px-2 py-1 text-[10px] font-black text-slate-600 dark:text-slate-300 transition">
                              <Printer className="h-3 w-3" /> Print
                            </Link>
                            <span className="inline-flex items-center gap-1 text-[10px] font-black text-sky-600 dark:text-sky-400 group-hover:text-sky-700 transition">
                              <Eye className="h-3 w-3" /> Receipt <ArrowRight className="h-3 w-3" />
                            </span>
                          </div>
                        </div>
                      </div>
                    </div>
                  );
                })}
              </div>

              {visible < filteredSales.length && (
                <button onClick={() => setVisible((v) => v + 50)}
                  className="w-full py-4 text-xs font-black text-sky-700 dark:text-sky-400 hover:bg-sky-50 dark:hover:bg-sky-500/10 border-t-2 border-slate-100 dark:border-slate-800 transition print:hidden">
                  Aur {Math.min(50, filteredSales.length - visible)} dikhayein
                  <span className="text-slate-400 ml-1">({visible}/{filteredSales.length})</span>
                </button>
              )}
            </>
          )}
        </section>
      )}

      {/* ═══ BIKRI WAPAS LENE KA CONFIRM ═══ */}
      {voidTarget && (
        <div className="fixed inset-0 z-50 bg-black/70 backdrop-blur-sm flex items-center justify-center p-4"
          onClick={() => setVoidTarget(null)}>
          <div onClick={(e) => e.stopPropagation()}
            className="w-full max-w-md bg-white dark:bg-slate-900 rounded-3xl shadow-2xl overflow-hidden border-2 border-rose-200 dark:border-rose-500/40">
            <div className="bg-gradient-to-br from-rose-600 to-red-700 text-white p-5">
              <div className="h-12 w-12 rounded-2xl bg-white/20 flex items-center justify-center mb-2">
                <Undo2 className="h-6 w-6" />
              </div>
              <h3 className="text-lg font-black">Ye bikri wapas lein?</h3>
              <p className="text-xs font-bold text-white/85 mt-0.5 font-mono">
                {voidTarget.saleNumber} · {formatPKR(voidTarget.total)} · {fmtDateTime(voidTarget.soldAt)}
              </p>
            </div>

            <div className="p-5 space-y-3">
              <div className="rounded-2xl bg-emerald-50 dark:bg-emerald-500/10 border-2 border-emerald-200 dark:border-emerald-500/30 p-3">
                <div className="text-[10px] font-black uppercase tracking-wider text-emerald-700 dark:text-emerald-400 mb-1.5">
                  Ye sab khud theek ho jayega
                </div>
                <ul className="text-xs font-bold text-emerald-900 dark:text-emerald-200 space-y-1">
                  <li>✓ Bika hua maal stock me wapas</li>
                  <li>✓ Udhaar tha to customer ke khate se hat jayega</li>
                  <li>✓ Reports aur munafe ka hisab theek</li>
                  <li>✓ Din ki bikri me se ye bill nikal jayega</li>
                </ul>
              </div>

              <div className="rounded-2xl bg-slate-50 dark:bg-slate-800/60 border-2 border-slate-200 dark:border-slate-700 p-3 text-[11px] font-bold text-slate-600 dark:text-slate-300">
                Bill mitta nahi — us par <strong>WAPAS LI GAYI</strong> ka nishan lag jata hai.
                Record rehta hai taake baad me pata chale ke kya hua tha.
              </div>

              <div>
                <label className="block text-[10px] font-black uppercase tracking-wider text-slate-600 dark:text-slate-400 mb-1.5">
                  Wajah (optional)
                </label>
                <input value={voidReason} onChange={(e) => setVoidReason(e.target.value)}
                  placeholder="Demo ki bikri thi / ghalat bill ban gaya"
                  className="h-11 w-full rounded-xl border-2 border-slate-200 dark:border-slate-700 bg-white dark:bg-slate-800 text-slate-900 dark:text-white px-3 text-sm font-bold focus:outline-none focus:border-rose-500 transition" />
              </div>

              <div className="flex gap-2 pt-1">
                <Button variant="secondary" className="flex-1 h-12" onClick={() => setVoidTarget(null)}>
                  <X className="h-4 w-4" /> Rehne dein
                </Button>
                <button
                  onClick={() => voidMutation.mutate({ id: voidTarget.id, reason: voidReason.trim() || 'Bikri wapas li gayi' })}
                  disabled={voidMutation.isPending}
                  className="flex-[2] h-12 rounded-2xl bg-gradient-to-r from-rose-600 to-red-700 disabled:opacity-50 text-white text-sm font-black inline-flex items-center justify-center gap-2 shadow-lg transition">
                  {voidMutation.isPending ? <Loader2 className="h-4 w-4 animate-spin" /> : <Undo2 className="h-4 w-4" />}
                  Haan, Wapas Lein
                </button>
              </div>
            </div>
          </div>
        </div>
      )}

      {/* ═══ BILL SCAN ═══
          Receipt par ab asli CODE128 barcode chhapta hai. Purana
          bill haath me ho to gun se scan karo — seedha wahi bill
          khul jata hai. Pehle bill number haath se dhoondna parta
          tha. */}
      {scannerOpen && (
        <BarcodeScanner
          onClose={() => setScannerOpen(false)}
          onDetected={(code: string) => {
            const clean = code.trim();
            setScannerOpen(false);
            const hit = sales.find(
              (s) => s.saleNumber === clean ||
                s.saleNumber.toLowerCase() === clean.toLowerCase() ||
                s.saleNumber.replace(/[^A-Z0-9]/gi, '') === clean.replace(/[^A-Z0-9]/gi, ''),
            );
            if (hit) {
              toast.success(`${hit.saleNumber} mil gaya`);
              window.location.href = receiptLink(hit.id);
              return;
            }
            // Na mile to chaant hata kar search me daal dein —
            // shayad wo bill chune hue daire se bahar ka hai.
            setDateFilter('all');
            setPaymentFilter('all');
            setCreditOnly(false);
            setSearch(clean);
            setTab('list');
            toast.error(`${clean} is muddat me nahi mila — sab tareekhon me dhoondha ja raha hai`);
          }}
        />
      )}

      {returnTarget && (
        <ReturnModal sale={returnTarget}
          onClose={() => setReturnTarget(null)}
          onDone={() => setReturnTarget(null)} />
      )}

      {showTeacher && <SalesTeacher onClose={() => setShowTeacher(false)} />}

      {/* ═══ PRINT CSS ═══ */}
      <style>{`
        @media print {
          @page { size: A4 landscape; margin: 10mm 8mm; }
          html, body {
            background: white !important; color: #0f172a !important;
            print-color-adjust: exact !important; -webkit-print-color-adjust: exact !important;
          }
          .dark body, .dark { background: white !important; color: #0f172a !important; }
          .print\\:hidden { display: none !important; }
          .print\\:block { display: block !important; }
          section, div { box-shadow: none !important; }
          .overflow-x-auto, .overflow-y-auto, .overflow-hidden, .overflow-auto {
            overflow: visible !important; max-height: none !important; height: auto !important;
          }
          [class*="fixed"] { display: none !important; }
          html, body, #root { height: auto !important; min-height: 0 !important; overflow: visible !important; }
          [class*="sidebar"], [class*="topbar"], nav[class*="fixed"] { display: none !important; }
          [class*="rounded-2xl"], [class*="rounded-3xl"] { overflow: visible !important; border-radius: 6px !important; }
          .divide-y-2 > div { page-break-inside: avoid !important; break-inside: avoid !important; border-bottom: 1px solid #e2e8f0 !important; padding: 6px 0 !important; }
          img, .recharts-wrapper { display: none !important; }
          [data-sonner-toaster], [data-sonner-toast], [class*="Toaster"] { display: none !important; visibility: hidden !important; }
        }
      `}</style>
    </div>
  );
}

/* ─────────────── chhote purzay ─────────────── */

function Panel({ icon: Icon, title, hint, children }: {
  icon: any; title: string; hint?: string; children: React.ReactNode;
}) {
  return (
    <section className="rounded-3xl bg-white dark:bg-slate-900 border-2 border-slate-200 dark:border-slate-800 shadow-sm p-4 sm:p-5">
      <div className="flex items-center gap-3 mb-4">
        <div className="h-11 w-11 rounded-2xl bg-gradient-to-br from-sky-500 to-cyan-700 text-white flex items-center justify-center shadow-lg shrink-0">
          <Icon className="h-5 w-5" />
        </div>
        <div className="min-w-0">
          <h3 className="font-black text-slate-900 dark:text-white text-base leading-tight">{title}</h3>
          {hint && <p className="text-[11px] font-bold text-slate-500 dark:text-slate-400 mt-0.5">{hint}</p>}
        </div>
      </div>
      {children}
    </section>
  );
}

function ReceiptPrefsPopover({ prefs, onChange, onClose, anchorRef }: {
  prefs: ReceiptPrefs; onChange: (p: Partial<ReceiptPrefs>) => void; onClose: () => void;
  anchorRef: React.RefObject<HTMLButtonElement | null>;
}) {
  /* Hero par `overflow-hidden` hai (roshni ke blur blobs ke liye).
     Panel usi ke andar `absolute` tha, is liye neeche se kat jata tha.
     Ab portal se seedha <body> me — button ke theek neeche. */
  const [pos, setPos] = useState<{ top: number; right: number } | null>(null);

  useEffect(() => {
    const place = () => {
      const el = anchorRef.current;
      if (!el) return;
      const r = el.getBoundingClientRect();
      setPos({ top: r.bottom + 8, right: Math.max(8, window.innerWidth - r.right) });
    };
    place();
    window.addEventListener('resize', place);
    window.addEventListener('scroll', place, true);
    return () => {
      window.removeEventListener('resize', place);
      window.removeEventListener('scroll', place, true);
    };
  }, [anchorRef]);

  if (!pos) return null;

  return createPortal(
    <>
      <div className="fixed inset-0 z-[70] print:hidden" onClick={onClose} />
      <div
        style={{ top: pos.top, right: pos.right }}
        className="fixed z-[71] w-64 rounded-2xl bg-white dark:bg-slate-900 border-2 border-slate-200 dark:border-slate-700 shadow-2xl p-3 space-y-3 text-slate-900 dark:text-white print:hidden"
      >
        <div className="text-[10px] font-black uppercase tracking-widest text-slate-500">Receipt ki settings</div>
        <div>
          <div className="text-[10px] font-black uppercase text-slate-500 mb-1">Kaghaz</div>
          <div className="grid grid-cols-2 gap-1.5">
            {(['58', '80'] as const).map((w) => (
              <button key={w} onClick={() => onChange({ paperWidth: w })}
                className={`h-9 rounded-lg text-[11px] font-black transition ${
                  prefs.paperWidth === w ? 'bg-sky-600 text-white' : 'bg-slate-100 dark:bg-slate-800 text-slate-600 dark:text-slate-300'
                }`}>{w}mm</button>
            ))}
          </div>
        </div>
        <div>
          <div className="text-[10px] font-black uppercase text-slate-500 mb-1">Tafseel</div>
          <div className="grid grid-cols-2 gap-1.5">
            {([['short', 'Chhota'], ['full', 'Poora']] as const).map(([m, l]) => (
              <button key={m} onClick={() => onChange({ mode: m })}
                className={`h-9 rounded-lg text-[11px] font-black transition ${
                  prefs.mode === m ? 'bg-sky-600 text-white' : 'bg-slate-100 dark:bg-slate-800 text-slate-600 dark:text-slate-300'
                }`}>{l}</button>
            ))}
          </div>
        </div>
        <label className="flex items-center gap-2 cursor-pointer">
          <input type="checkbox" checked={prefs.autoPrint} onChange={(e) => onChange({ autoPrint: e.target.checked })}
            className="h-4 w-4 rounded accent-sky-600" />
          <span className="text-[11px] font-black">Kholte hi print</span>
        </label>
        <label className="flex items-center gap-2 cursor-pointer">
          <input type="checkbox" checked={prefs.showLogo} onChange={(e) => onChange({ showLogo: e.target.checked })}
            className="h-4 w-4 rounded accent-sky-600" />
          <span className="text-[11px] font-black">Logo dikhayein</span>
        </label>
      </div>
    </>,
    document.body,
  );
}

/* ═════════════════════════════════════════════════════════════
   SALES TEACHER — "Ye page kya karta hai"
   ═════════════════════════════════════════════════════════════ */
function SalesTeacher({ onClose }: { onClose: () => void }) {
  return (
    <div className="fixed inset-0 z-50 bg-black/60 backdrop-blur-sm flex items-end sm:items-center justify-center p-3" onClick={onClose}>
      <div
        className="w-full max-w-lg max-h-[90vh] overflow-y-auto rounded-3xl bg-white dark:bg-slate-900 border-2 border-sky-300 dark:border-sky-500/40 shadow-2xl"
        onClick={(e) => e.stopPropagation()}
      >
        <div className="px-5 py-3 border-b-2 border-sky-200 dark:border-sky-500/30 bg-gradient-to-r from-sky-50 to-cyan-50 dark:from-sky-500/15 dark:to-cyan-500/15 flex items-center justify-between sticky top-0 z-10">
          <h3 className="font-extrabold text-sky-900 dark:text-sky-200 flex items-center gap-2">
            <GraduationCap className="h-5 w-5" /> Sales Page — Complete Guide
          </h3>
          <button onClick={onClose} className="h-8 w-8 rounded-lg hover:bg-white dark:hover:bg-slate-800 flex items-center justify-center transition">
            <X className="h-4 w-4 text-slate-600 dark:text-slate-300" />
          </button>
        </div>

        <div className="p-5 space-y-4">
          <p className="text-sm font-semibold text-slate-700 dark:text-slate-200 leading-relaxed">
            Ye tumhari <strong>saari sales ka record</strong> hai — kab kya bika, kisne liya, kitna paisa aya,
            kitna udhaar bacha. POS se sale hoti hai to seedhi yahan aati hai.
          </p>

          <div className="rounded-2xl border-2 border-sky-200 dark:border-sky-500/30 bg-sky-50/60 dark:bg-sky-500/5 p-4 space-y-2 text-xs font-semibold text-slate-700 dark:text-slate-200">
            <TipRow><strong>🔒 Privacy Toggle</strong> — password wala icon dabao, saare paise chhup jayenge</TipRow>
            <TipRow><strong>⚙️ Receipt button</strong> — paper size (58/80mm), short/full mode, auto-print, logo — sab yahi se set karo</TipRow>
            <TipRow><strong>🖨️ Row ka Print</strong> — har sale ke paas chhota Print button — seedha thermal pe nikalo</TipRow>
            <TipRow><strong>📅 Date range</strong> — Today, Yesterday, 7 din, 30 din, ya custom period</TipRow>
            <TipRow><strong>💳 Payment filter</strong> — sirf Cash, ya JazzCash, ya Card wali sales</TipRow>
            <TipRow><strong>📖 Udhaar button</strong> — sirf khata wali sales (paise baqi)</TipRow>
            <TipRow><strong>Row pe click</strong> — receipt khul jayegi (print, WhatsApp, share)</TipRow>
            <TipRow><strong>📊 CSV export</strong> — Excel me kholo, accountant ko bhejo</TipRow>
            <TipRow><strong>⌨️ / dabao</strong> — search box pe jump</TipRow>
          </div>

          <div className="rounded-xl bg-slate-50 dark:bg-slate-800/60 border border-slate-200 dark:border-slate-700 p-3 text-xs font-semibold text-slate-700 dark:text-slate-200">
            💡 <strong>Pro tip:</strong> Roz shaam ko "Today" filter check karo — aaj kitni sale hui, kitna udhaar gaya, kis method se paise aye. 30 second me poori dukaan ka hisaab!
          </div>

          <Button
            className="w-full bg-gradient-to-r from-sky-600 to-cyan-700 hover:from-sky-700 hover:to-cyan-800 font-extrabold shadow-lg shadow-sky-500/40 h-12"
            onClick={onClose}
          >
            <CheckCircle2 className="h-4 w-4" /> Samajh Gaya!
          </Button>
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

/* ══════════ HELPERS ══════════ */

function Kpi({ icon: Icon, label, value, sub, tone, highlight, onClick, active, exact }: any) {
  const tones: Record<string, string> = {
    emerald: 'from-emerald-500 to-green-600 shadow-emerald-500/40',
    blue: 'from-blue-500 to-blue-700 shadow-blue-500/40',
    violet: 'from-violet-500 to-purple-600 shadow-violet-500/40',
    amber: 'from-amber-500 to-orange-600 shadow-amber-500/40',
  };
  const Comp: any = onClick ? 'button' : 'div';
  return (
    <Comp
      onClick={onClick}
      title={exact}
      className={[
        'rounded-2xl border-2 p-4 shadow-sm dark:shadow-black/20 text-left w-full transition-all',
        onClick ? 'hover:-translate-y-0.5 hover:shadow-md cursor-pointer' : '',
        active
          ? 'border-amber-500 dark:border-amber-500/60 ring-2 ring-amber-200 dark:ring-amber-500/20 bg-amber-50 dark:bg-amber-500/10'
          : highlight
          ? 'bg-gradient-to-br from-blue-50 to-cyan-50 dark:from-blue-500/10 dark:to-cyan-500/10 border-blue-300 dark:border-blue-500/40'
          : 'bg-white dark:bg-slate-900/80 dark:backdrop-blur-sm border-slate-200 dark:border-slate-800',
      ].join(' ')}
    >
      <div className="flex items-center justify-between gap-2">
        <div className="min-w-0">
          <div className="text-[10px] uppercase tracking-widest text-slate-500 dark:text-slate-400 font-extrabold">{label}</div>
          <div className="mt-1.5 text-lg sm:text-xl lg:text-2xl font-black text-slate-900 dark:text-white tabular-nums leading-tight break-words">{value}</div>
          {sub && <div className="text-[10px] text-slate-500 dark:text-slate-400 font-bold mt-1 leading-snug">{sub}</div>}
        </div>
        <div className={`h-11 w-11 rounded-2xl bg-gradient-to-br ${tones[tone]} text-white flex items-center justify-center shadow-lg shrink-0`}>
          <Icon className="h-5 w-5" />
        </div>
      </div>
    </Comp>
  );
}

function SummaryCell({ label, value, tone }: any) {
  const tones: Record<string, string> = {
    sky: 'text-sky-700 dark:text-sky-400',
    slate: 'text-slate-900 dark:text-white',
    blue: 'text-blue-700 dark:text-blue-400',
    amber: 'text-amber-700 dark:text-amber-400',
  };
  return (
    <div>
      <div className="text-[10px] uppercase font-extrabold text-slate-600 dark:text-slate-400">{label}</div>
      <div className={`font-extrabold tabular-nums ${tones[tone]}`}>{value}</div>
    </div>
  );
}
