import { useMemo, useState, useEffect, useRef } from 'react';
import { createPortal } from 'react-dom';
import { Link, useNavigate } from 'react-router-dom';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import {
  Receipt, TrendingUp, Search, X, RefreshCw, Package, User, Clock,
  Banknote, CreditCard, Smartphone, Building2, Zap, BookOpen, Award,
  BarChart3, CalendarRange, ChevronDown, GraduationCap, Printer,
  FileSpreadsheet, ScanLine, MessageCircle, Undo2, Trash2, Cpu,
  AlertTriangle, Eye, Settings2, Check, Filter, Trophy, ArrowRight,
  ShieldCheck, Hash, ShieldAlert,
} from 'lucide-react';
import {
  ResponsiveContainer, BarChart, Bar, XAxis, YAxis, Tooltip, CartesianGrid,
  PieChart, Pie, Cell, Legend, ComposedChart, Area, Line,
} from 'recharts';
import { toast } from 'sonner';
import { salesApi, type PaymentMethod } from '@modules/sales/sales/api/sales.api';
import { electronicsProductsApi } from '../api/products.api';
import { serialTrackingApi } from '../api/serial-tracking.api';
import BarcodeScanner from '@core/components/barcode/BarcodeScanner';
import { ReturnModal } from '@industries/retail/components/ReturnModal';
import { resolveTemplates, fillTemplate, waLink } from '@core/lib/whatsapp/templates';
import { settingsApi } from '@modules/organization/settings/api/settings.api';
import { formatPKR } from '@core/lib/format';
import { Button } from '@core/ui/Button';
import { useAuthStore } from '@core/stores/auth.store';
import { PrivacyToggle, useCostHidden } from '@/core/security/HiddenValue';
import { CATEGORY_META, CONDITION_META, type CategoryType, type ConditionType } from '../constants';

/* ═════════════════════════════════════════════════════════════
   ELECTRONICS BIKRI — DIN KA POORA RECORD
   ─────────────────────────────────────────────────────────────
   Baqi dukaanon me bill bikri ka aakhri qadam hota hai. Electronics
   me bill SHURU hota hai — kyunke warranty usi din se chalti hai.
   Chhe mahine baad grahak kharab charger le kar aata hai, aur poora
   maamla ek hi sawal par tik jata hai: "ye cheez humse kab gayi
   thi, aur kaunsi wali gayi thi?"

   Is liye is safhe me teen cheezein aisi hain jo aur kahin nahi:

     🔢 KIS BILL KE SATH KAUNSA SERIAL GAYA — har bill ke neeche
        us ke serial/IMEI likhe hain. Claim aane par dhoondna nahi
        parta.

     ⚠️ SERIAL KE BAGHAIR BIKRI — jis cheez ka serial rakha jata
        hai, wo agar serial jore baghair bik gayi, to us par laal
        nishan lagta hai. Us grahak ki warranty ka koi saboot nahi
        hai — aur pata abhi chalna chahiye, claim ke din nahi.

     🛡️ WARRANTY KHATAM HONE WALI — jin cheezon ki warranty agle
        30 din me khatam ho rahi hai, un ki ginti upar aa jati hai.

   ⌨️ / dhoondein • B bill scan • A analytics • G sikhein • P print
   ═════════════════════════════════════════════════════════════ */

type Tab = 'list' | 'analytics';
type DateFilter = 'today' | 'yesterday' | 'week' | 'month' | 'year' | 'all' | 'custom';

const PAY: Record<string, { label: string; icon: any; hex: string; chip: string }> = {
  CASH:          { label: 'Cash', icon: Banknote, hex: '#10b981', chip: 'bg-emerald-100 dark:bg-emerald-500/20 text-emerald-700 dark:text-emerald-300' },
  CARD:          { label: 'Card', icon: CreditCard, hex: '#3b82f6', chip: 'bg-blue-100 dark:bg-blue-500/20 text-blue-700 dark:text-blue-300' },
  JAZZCASH:      { label: 'JazzCash', icon: Smartphone, hex: '#f97316', chip: 'bg-orange-100 dark:bg-orange-500/20 text-orange-700 dark:text-orange-300' },
  EASYPAISA:     { label: 'EasyPaisa', icon: Zap, hex: '#22c55e', chip: 'bg-green-100 dark:bg-green-500/20 text-green-700 dark:text-green-300' },
  BANK_TRANSFER: { label: 'Bank', icon: Building2, hex: '#8b5cf6', chip: 'bg-violet-100 dark:bg-violet-500/20 text-violet-700 dark:text-violet-300' },
};

const DATE_OPTS: Array<[DateFilter, string]> = [
  ['today', 'Aaj'], ['yesterday', 'Kal'], ['week', '7 din'],
  ['month', '30 din'], ['year', 'Is saal'], ['all', 'Sab'], ['custom', '📅 Apni tareekh'],
];

const AXIS = '#94a3b8';
const GRID = 'rgba(148,163,184,0.25)';
const TOOLTIP = {
  borderRadius: 14, border: 'none', backgroundColor: 'rgba(15,23,42,0.96)', color: '#f8fafc',
  fontWeight: 700, fontSize: 12, boxShadow: '0 12px 32px rgba(15,23,42,.28)', padding: '10px 12px',
};
const C = { sale: '#3b82f6', profit: '#10b981', hours: '#f59e0b', weekday: '#8b5cf6' };
const PIE_COLORS = ['#3b82f6', '#06b6d4', '#8b5cf6', '#10b981', '#f59e0b', '#ef4444', '#14b8a6', '#f97316'];

/* ── Receipt ki pasand — ReceiptPage isi chaabi se parhta hai ── */
const RECEIPT_PREFS_KEY = 'nafaa.receipt.prefs';
interface ReceiptPrefs { paperWidth: '58' | '80'; mode: 'short' | 'full'; autoPrint: boolean; showLogo: boolean }
const DEFAULT_PREFS: ReceiptPrefs = { paperWidth: '80', mode: 'short', autoPrint: false, showLogo: true };
function getPrefs(): ReceiptPrefs {
  try {
    const p = JSON.parse(localStorage.getItem(RECEIPT_PREFS_KEY) || 'null');
    return p ? { ...DEFAULT_PREFS, ...p } : DEFAULT_PREFS;
  } catch { return DEFAULT_PREFS; }
}

/* ── Waqt — sab maqami din par ── */
const dayStart = (d: Date) => { const x = new Date(d); x.setHours(0, 0, 0, 0); return x; };
const dayEnd = (d: Date) => { const x = new Date(d); x.setHours(23, 59, 59, 999); return x; };
const dayKey = (d: Date) => `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}-${String(d.getDate()).padStart(2, '0')}`;
const fmtDT = (v: string) => new Intl.DateTimeFormat('en-PK', { dateStyle: 'medium', timeStyle: 'short' }).format(new Date(v));
const fmtD = (v: string) => new Intl.DateTimeFormat('en-PK', { dateStyle: 'medium' }).format(new Date(v));
const fmtTime = (v: string) => new Intl.DateTimeFormat('en-PK', { hour: 'numeric', minute: '2-digit', hour12: true }).format(new Date(v));
const hourLabel = (h: number) => (h === 0 ? '12am' : h < 12 ? `${h}am` : h === 12 ? '12pm' : `${h - 12}pm`);
const itemPid = (i: any) => i.product?.id ?? i.productId;

function ago(v: string) {
  const m = Math.floor((Date.now() - new Date(v).getTime()) / 60000);
  if (m < 1) return 'abhi abhi';
  if (m < 60) return `${m} minute pehle`;
  const h = Math.floor(m / 60);
  if (h < 24) return `${h} ghante pehle`;
  const d = Math.floor(h / 24);
  if (d === 1) return 'kal';
  if (d < 30) return `${d} din pehle`;
  return fmtDT(v);
}

const catMeta = (c?: string) =>
  (c && CATEGORY_META[c as CategoryType]) || { label: 'Baqi', emoji: '📦' };

const heroBtn = 'h-11 px-3 rounded-xl bg-white/15 hover:bg-white/25 border border-white/25 text-xs font-black inline-flex items-center gap-1.5 backdrop-blur transition';

export default function ElectronicsSalesPage() {
  const qc = useQueryClient();
  const navigate = useNavigate();
  const tenant = useAuthStore((s) => s.tenant);
  const shopName = useAuthStore((s) => s.user?.assignedShop?.name);
  const hideAmounts = useCostHidden();
  const searchRef = useRef<HTMLInputElement>(null);
  const prefsBtnRef = useRef<HTMLButtonElement>(null);

  const [tab, setTab] = useState<Tab>('list');
  const [search, setSearch] = useState('');
  const [dateFilter, setDateFilter] = useState<DateFilter>('today');
  const [customStart, setCustomStart] = useState('');
  const [customEnd, setCustomEnd] = useState('');
  const [payFilter, setPayFilter] = useState<PaymentMethod | 'all'>('all');
  const [creditOnly, setCreditOnly] = useState(false);
  const [noSerialOnly, setNoSerialOnly] = useState(false);
  const [showDate, setShowDate] = useState(false);
  const [showMore, setShowMore] = useState(false);
  const [showPrefs, setShowPrefs] = useState(false);
  const [prefs, setPrefs] = useState<ReceiptPrefs>(getPrefs);
  const [prefsSaved, setPrefsSaved] = useState(false);
  const [scannerOpen, setScannerOpen] = useState(false);
  const [showTeacher, setShowTeacher] = useState(false);
  const [voidTarget, setVoidTarget] = useState<any>(null);
  const [returnTarget, setReturnTarget] = useState<any>(null);
  const [visible, setVisible] = useState(50);

  const showValue = (v: string) => (hideAmounts ? '••••' : v);

  const updatePrefs = (patch: Partial<ReceiptPrefs>) => {
    const next = { ...prefs, ...patch };
    setPrefs(next);
    try { localStorage.setItem(RECEIPT_PREFS_KEY, JSON.stringify(next)); } catch { /* ignore */ }
    setPrefsSaved(true); setTimeout(() => setPrefsSaved(false), 1200);
  };

  const receiptLink = (id: string, print = prefs.autoPrint) =>
    `/sales/${id}/receipt?paper=${prefs.paperWidth}&mode=${prefs.mode}${print ? '&autoprint=1' : ''}`;

  /* ── Data ── */
  const salesQ = useQuery({ queryKey: ['sales-list'], queryFn: () => salesApi.list() });
  const settingsQ = useQuery({ queryKey: ['settings'], queryFn: () => settingsApi.get(), staleTime: 60_000 });
  const profilesQ = useQuery({
    queryKey: ['electronics-profiles-all'],
    queryFn: () => electronicsProductsApi.list().catch(() => []),
    staleTime: 5 * 60_000,
  });
  /* Bike hue serial — kis bill ke sath kaunsa gaya */
  const soldSerialsQ = useQuery({
    queryKey: ['electronics-serials-sold'],
    queryFn: () => serialTrackingApi.list({ status: 'SOLD' }).catch(() => []),
    staleTime: 60_000,
  });

  const templates = useMemo(() => {
    const d: any = settingsQ.data;
    return resolveTemplates(d?.settings?.whatsappTemplates ?? d?.whatsappTemplates);
  }, [settingsQ.data]);

  /** Jin cheezon ka serial rakha jata hai — inke baghair bikri par nishan lagta hai */
  const trackedIds = useMemo(() => {
    const s = new Set<string>();
    (profilesQ.data ?? []).forEach((p: any) => {
      if (p.productId && (p.requiresSerial || p.hasImei)) s.add(p.productId);
    });
    return s;
  }, [profilesQ.data]);

  /** Har product ka profile — category, haalat, warranty ke liye */
  const profByProduct = useMemo(() => {
    const m = new Map<string, any>();
    (profilesQ.data ?? []).forEach((p: any) => { if (p.productId) m.set(p.productId, p); });
    return m;
  }, [profilesQ.data]);

  /** Bill ke hisab se serial */
  const serialsBySale = useMemo(() => {
    const m = new Map<string, any[]>();
    (soldSerialsQ.data ?? []).forEach((s: any) => {
      if (!s.saleId) return;
      const arr = m.get(s.saleId) ?? [];
      arr.push(s);
      m.set(s.saleId, arr);
    });
    return m;
  }, [soldSerialsQ.data]);

  const voidMut = useMutation({
    mutationFn: ({ id, reason }: { id: string; reason: string }) => salesApi.voidSale(id, reason),
    onSuccess: () => {
      toast.success('Bill void ho gaya — stock wapas aa gaya');
      setVoidTarget(null);
      ['sales-list', 'sales-summary', 'products', 'electronics-products-list',
        'electronics-serials-sold', 'electronics-serials-in-stock', 'customers']
        .forEach((k) => qc.invalidateQueries({ queryKey: [k] }));
    },
    onError: (e: any) => toast.error(e?.response?.data?.message || 'Void nahi hua'),
  });

  /* ── Tareekh ka daira ── */
  const [from, to] = useMemo<[Date, Date]>(() => {
    const now = new Date();
    switch (dateFilter) {
      case 'today': return [dayStart(now), dayEnd(now)];
      case 'yesterday': { const y = new Date(now); y.setDate(y.getDate() - 1); return [dayStart(y), dayEnd(y)]; }
      case 'week': { const f = new Date(now); f.setDate(f.getDate() - 6); return [dayStart(f), dayEnd(now)]; }
      case 'month': { const f = new Date(now); f.setDate(f.getDate() - 29); return [dayStart(f), dayEnd(now)]; }
      case 'year': return [new Date(now.getFullYear(), 0, 1), dayEnd(now)];
      case 'custom': return [
        customStart ? dayStart(new Date(customStart)) : new Date(0),
        customEnd ? dayEnd(new Date(customEnd)) : dayEnd(now),
      ];
      default: return [new Date(0), dayEnd(now)];
    }
  }, [dateFilter, customStart, customEnd]);

  const rangeLabel = useMemo(() => {
    if (dateFilter === 'all') return 'Shuru se ab tak';
    const f = (d: Date) => new Intl.DateTimeFormat('en-PK', { dateStyle: 'medium' }).format(d);
    return dayKey(from) === dayKey(to) ? f(from) : `${f(from)} — ${f(to)}`;
  }, [dateFilter, from, to]);

  useEffect(() => { setVisible(50); },
    [dateFilter, customStart, customEnd, payFilter, creditOnly, noSerialOnly, search]);

  /* ── Rows ── */
  const sales: any[] = salesQ.data ?? [];
  const inRange = useMemo(
    () => sales.filter((s) => { const t = new Date(s.soldAt).getTime(); return t >= from.getTime() && t <= to.getTime(); }),
    [sales, from, to],
  );
  const live = useMemo(() => inRange.filter((s) => s.status !== 'VOIDED'), [inRange]);

  /** Is bill me kitni aisi cheezein hain jinka serial hona chahiye tha */
  const needSerialQty = (s: any) =>
    (s.items ?? []).reduce((a: number, i: any) =>
      a + (trackedIds.has(itemPid(i)) ? Number(i.quantity || 0) : 0), 0);

  /** Serial ke baghair bik gayi — warranty ka saboot nahi bacha */
  const serialGap = (s: any) => {
    const need = needSerialQty(s);
    if (need <= 0) return 0;
    return Math.max(need - (serialsBySale.get(s.id)?.length ?? 0), 0);
  };

  const q = search.trim().toLowerCase();
  const filtered = useMemo(() => {
    let out = inRange;
    if (payFilter !== 'all') out = out.filter((s) => s.paymentMethod === payFilter);
    if (creditOnly) out = out.filter((s) => Number(s.creditAmount) > 0);
    if (noSerialOnly) out = out.filter((s) => s.status !== 'VOIDED' && serialGap(s) > 0);
    if (q) out = out.filter((s) =>
      (s.saleNumber ?? '').toLowerCase().includes(q)
      || (s.customer?.name ?? '').toLowerCase().includes(q)
      || (s.customer?.phone ?? '').toLowerCase().includes(q)
      || (serialsBySale.get(s.id) ?? []).some((x: any) =>
        (x.serialNumber ?? '').toLowerCase().includes(q)
        || (x.imei ?? '').toLowerCase().includes(q)
        || (x.imei2 ?? '').toLowerCase().includes(q))
      || (s.items ?? []).some((i: any) =>
        (i.product?.name ?? '').toLowerCase().includes(q)
        || (i.product?.barcode ?? '').toLowerCase().includes(q)
        || (i.product?.sku ?? '').toLowerCase().includes(q)));
    return [...out].sort((a, b) => new Date(b.soldAt).getTime() - new Date(a.soldAt).getTime());
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [inRange, payFilter, creditOnly, noSerialOnly, q, serialsBySale, trackedIds]);

  /* ── Ginti ── */
  const stats = useMemo(() => {
    const l = filtered.filter((s) => s.status !== 'VOIDED');
    const amount = l.reduce((x, s) => x + Number(s.total || 0), 0);
    const cogs = l.reduce((x, s) => x + Number(s.costOfGoods || 0), 0);
    const profit = amount - cogs;
    return {
      count: l.length,
      voided: filtered.length - l.length,
      amount, cogs, profit,
      qty: l.reduce((x, s) => x + (s.items ?? []).reduce((y: number, i: any) => y + Number(i.quantity || 0), 0), 0),
      margin: amount > 0 ? (profit / amount) * 100 : 0,
      paid: l.reduce((x, s) => x + Math.min(Number(s.paidAmount || 0), Number(s.total || 0)), 0),
      credit: l.reduce((x, s) => x + Number(s.creditAmount || 0), 0),
      discount: l.reduce((x, s) => x + Number(s.discount || 0), 0),
      creditCount: l.filter((s) => Number(s.creditAmount) > 0).length,
      avg: l.length > 0 ? amount / l.length : 0,
      best: l.reduce<any>((b, s) => (Number(s.total) > Number(b?.total ?? 0) ? s : b), null),
    };
  }, [filtered]);

  /* ── Electronics ki khaas ginti ── */
  const serialStats = useMemo(() => {
    const withGap = live.filter((s) => serialGap(s) > 0);
    const sold = live.reduce((a, s) => a + (serialsBySale.get(s.id)?.length ?? 0), 0);
    return {
      soldSerials: sold,
      gapBills: withGap.length,
      gapQty: withGap.reduce((a, s) => a + serialGap(s), 0),
      gapList: withGap.slice(0, 5),
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [live, serialsBySale, trackedIds]);

  /** Agle 30 din me jin ki warranty khatam — grahak ko batana banta hai */
  const warrantyEnding = useMemo(() => {
    const now = Date.now();
    const in30 = now + 30 * 86400000;
    return (soldSerialsQ.data ?? [])
      .filter((s: any) => {
        if (!s.warrantyEndDate || s.warrantyStatus !== 'ACTIVE') return false;
        const t = new Date(s.warrantyEndDate).getTime();
        return t >= now && t <= in30;
      })
      .sort((a: any, b: any) =>
        new Date(a.warrantyEndDate).getTime() - new Date(b.warrantyEndDate).getTime());
  }, [soldSerialsQ.data]);

  /* ── Charts ── */
  const hourly = useMemo(() => {
    const b = Array.from({ length: 24 }, (_, h) => ({ h, label: hourLabel(h), bikri: 0, bill: 0 }));
    live.forEach((s) => { const h = new Date(s.soldAt).getHours(); b[h].bikri += Number(s.total || 0); b[h].bill += 1; });
    return b;
  }, [live]);
  const peak = useMemo(() => hourly.reduce((b, h) => (h.bikri > b.bikri ? h : b), hourly[0]), [hourly]);
  const hourlyShown = useMemo(() => hourly.filter((h) => h.bikri > 0 || (h.h >= 9 && h.h <= 22)), [hourly]);

  const daily = useMemo(() => {
    const start = dateFilter === 'all' && live.length
      ? dayStart(new Date(Math.min(...live.map((s) => new Date(s.soldAt).getTime()))))
      : from;
    const days = Math.min(Math.max(Math.ceil((to.getTime() - start.getTime()) / 86400000), 1), 90);
    const b: Record<string, { name: string; bikri: number; munafa: number; bill: number }> = {};
    for (let i = days - 1; i >= 0; i--) {
      const d = new Date(to); d.setDate(to.getDate() - i);
      b[dayKey(d)] = {
        name: d.toLocaleDateString('en-PK', days > 14 ? { day: 'numeric', month: 'short' } : { weekday: 'short', day: 'numeric' }),
        bikri: 0, munafa: 0, bill: 0,
      };
    }
    live.forEach((s) => {
      const k = dayKey(new Date(s.soldAt));
      if (!b[k]) return;
      b[k].bikri += Number(s.total || 0);
      b[k].munafa += Number(s.total || 0) - Number(s.costOfGoods || 0);
      b[k].bill += 1;
    });
    return Object.values(b).map((v) => ({ ...v, bikri: Math.round(v.bikri), munafa: Math.round(v.munafa) }));
  }, [live, from, to, dateFilter]);

  const weekday = useMemo(() => {
    const names = ['Itwar', 'Peer', 'Mangal', 'Budh', 'Jumeraat', 'Juma', 'Hafta'];
    const rows = names.map((label) => ({ label, bikri: 0, bill: 0 }));
    live.forEach((s) => { const d = new Date(s.soldAt).getDay(); rows[d].bikri += Number(s.total || 0); rows[d].bill += 1; });
    return rows;
  }, [live]);

  const payPie = useMemo(() => {
    const m = new Map<string, number>();
    live.forEach((s) => m.set(s.paymentMethod, (m.get(s.paymentMethod) ?? 0) + Number(s.total || 0)));
    return [...m.entries()]
      .map(([k, v]) => ({ name: PAY[k]?.label ?? k, value: Math.round(v), hex: PAY[k]?.hex ?? '#94a3b8' }))
      .sort((a, b) => b.value - a.value);
  }, [live]);

  /** Kis qism ka maal bika — electronics ki apni tasveer */
  const catAgg = useMemo(() => {
    const m = new Map<string, { name: string; emoji: string; qty: number; value: number }>();
    live.forEach((s) => (s.items ?? []).forEach((i: any) => {
      const prof = profByProduct.get(itemPid(i));
      const cm = catMeta(prof?.categoryType);
      const key = prof?.categoryType ?? 'OTHER';
      const e = m.get(key) ?? { name: cm.label, emoji: cm.emoji, qty: 0, value: 0 };
      e.qty += Number(i.quantity || 0);
      e.value += Number(i.total ?? (Number(i.quantity || 0) * Number(i.unitPrice || 0)));
      m.set(key, e);
    }));
    return [...m.values()].sort((a, b) => b.value - a.value).slice(0, 8);
  }, [live, profByProduct]);

  /** Naya vs purana maal — refurbished ka hissa dukaan-daar ko pata hona chahiye */
  const condAgg = useMemo(() => {
    const m = new Map<string, { name: string; emoji: string; value: number }>();
    live.forEach((s) => (s.items ?? []).forEach((i: any) => {
      const prof = profByProduct.get(itemPid(i));
      const c = prof?.conditionType as ConditionType | undefined;
      if (!c) return;
      const meta = CONDITION_META[c];
      const e = m.get(c) ?? { name: meta.label, emoji: meta.emoji, value: 0 };
      e.value += Number(i.total ?? (Number(i.quantity || 0) * Number(i.unitPrice || 0)));
      m.set(c, e);
    }));
    return [...m.values()].sort((a, b) => b.value - a.value);
  }, [live, profByProduct]);

  const itemsAgg = useMemo(() => {
    const m = new Map<string, { name: string; qty: number; value: number; tracked: boolean }>();
    live.forEach((s) => (s.items ?? []).forEach((i: any) => {
      const pid = itemPid(i);
      const e = m.get(pid) ?? { name: i.product?.name ?? 'Cheez', qty: 0, value: 0, tracked: trackedIds.has(pid) };
      e.qty += Number(i.quantity || 0);
      e.value += Number(i.total ?? (Number(i.quantity || 0) * Number(i.unitPrice || 0)));
      m.set(pid, e);
    }));
    return [...m.values()].sort((a, b) => b.value - a.value).slice(0, 10);
  }, [live, trackedIds]);

  const topCustomers = useMemo(() => {
    const m = new Map<string, { name: string; phone?: string; value: number; bills: number }>();
    live.forEach((s) => {
      if (!s.customer?.id) return;
      const e = m.get(s.customer.id) ?? { name: s.customer.name, phone: s.customer.phone, value: 0, bills: 0 };
      e.value += Number(s.total || 0); e.bills += 1;
      m.set(s.customer.id, e);
    });
    return [...m.values()].sort((a, b) => b.value - a.value).slice(0, 8);
  }, [live]);

  const hasFilters = dateFilter !== 'today' || payFilter !== 'all' || creditOnly || noSerialOnly || !!search;
  const clearFilters = () => {
    setDateFilter('today'); setPayFilter('all'); setCreditOnly(false);
    setNoSerialOnly(false); setSearch('');
  };

  /* ── WhatsApp ── */
  const billWaLink = (s: any) => {
    const phone = s.customer?.phone;
    if (!phone) return null;
    const body = fillTemplate(templates.receipt, {
      customer: s.customer?.name ?? 'Ji',
      shop: tenant?.name ?? 'Dukaan',
      bill: s.saleNumber,
      amount: formatPKR(s.total),
      date: fmtDT(s.soldAt),
    });
    return waLink(phone, body);
  };

  /* ── CSV ── */
  const exportCsv = () => {
    if (filtered.length === 0) return toast.error('Koi bill nahi');
    const summary = [
      [`Electronics bikri — ${tenant?.name || 'Nafaa'}`],
      [`${shopName ? shopName + '  •  ' : ''}${rangeLabel}  •  ${new Date().toLocaleString('en-PK')}`],
      [`${stats.count} bill  •  Kul ${stats.amount.toFixed(2)}  •  Wasool ${stats.paid.toFixed(2)}  •  Udhaar ${stats.credit.toFixed(2)}`],
      [`Serial bike: ${serialStats.soldSerials}  •  Serial ke baghair: ${serialStats.gapQty}`],
      [''],
    ];
    const head = ['Bill #', 'Tareekh', 'Waqt', 'Customer', 'Phone', 'Cheezein',
      'Serial / IMEI', 'Serial ke baghair', 'Tareeqa', 'Kul', 'Wasool', 'Udhaar', 'Chhoot', 'Haalat'];
    const body = filtered.map((s) => [
      s.saleNumber, fmtD(s.soldAt), fmtTime(s.soldAt),
      s.customer?.name ?? 'Walk-in', s.customer?.phone ?? '',
      (s.items ?? []).map((i: any) => `${i.product?.name} x${i.quantity}`).join(' | '),
      (serialsBySale.get(s.id) ?? []).map((x: any) => x.imei || x.serialNumber).join(' | '),
      serialGap(s) || '',
      PAY[s.paymentMethod]?.label ?? s.paymentMethod,
      Number(s.total || 0).toFixed(2), Number(s.paidAmount || 0).toFixed(2),
      Number(s.creditAmount || 0).toFixed(2), Number(s.discount || 0).toFixed(2),
      s.status === 'VOIDED' ? 'Void' : 'Theek',
    ]);
    const csv = [...summary, head, ...body]
      .map((r) => r.map((c) => `"${String(c).replace(/"/g, '""')}"`).join(',')).join('\n');
    const blob = new Blob(['﻿' + csv], { type: 'text/csv;charset=utf-8' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url; a.download = `electronics-bikri-${new Date().toISOString().slice(0, 10)}.csv`;
    a.click(); URL.revokeObjectURL(url);
    toast.success(`${filtered.length} bill export ho gaye`);
  };

  /* ── Scan — bill, ya serial/IMEI ── */
  const onScan = (code: string) => {
    const clean = code.trim();
    setScannerOpen(false);
    const hit = sales.find((s) => (s.saleNumber ?? '').toLowerCase() === clean.toLowerCase());
    if (hit) {
      toast.success(`${hit.saleNumber} mil gaya`);
      navigate(receiptLink(hit.id, false));
      return;
    }
    /* Bill na mile to shayad ye serial ya IMEI hai — electronics me
       grahak aksar dabba le kar aata hai, bill nahi. */
    const bySerial = (soldSerialsQ.data ?? []).find((x: any) =>
      x.serialNumber === clean || x.imei === clean || x.imei2 === clean);
    if (bySerial?.saleId) {
      toast.success(`Ye serial ${bySerial.product?.name ?? 'cheez'} ka hai — bill khol rahe hain`);
      navigate(receiptLink(bySerial.saleId, false));
      return;
    }
    setDateFilter('all');
    setSearch(clean);
    toast.error(`${clean} ka bill nahi mila — list me dhoond rahe hain`);
  };

  /* ── Shortcuts ── */
  useEffect(() => {
    const onKey = (e: KeyboardEvent) => {
      const tag = document.activeElement?.tagName;
      const typing = tag === 'INPUT' || tag === 'TEXTAREA' || tag === 'SELECT';
      if (e.key === 'Escape') {
        if (scannerOpen) return setScannerOpen(false);
        if (showTeacher) return setShowTeacher(false);
        if (voidTarget) return setVoidTarget(null);
        if (showDate) return setShowDate(false);
        if (showMore) return setShowMore(false);
        if (showPrefs) return setShowPrefs(false);
        return;
      }
      if (typing || e.ctrlKey || e.metaKey || e.altKey) return;
      if (e.key === '/') { e.preventDefault(); searchRef.current?.focus(); }
      const k = e.key.toLowerCase();
      if (k === 'b') { e.preventDefault(); setScannerOpen(true); }
      if (k === 'a') setTab((t) => (t === 'list' ? 'analytics' : 'list'));
      if (k === 'g') setShowTeacher(true);
      if (k === 'p') { e.preventDefault(); window.print(); }
    };
    window.addEventListener('keydown', onKey);
    return () => window.removeEventListener('keydown', onKey);
  }, [scannerOpen, showTeacher, voidTarget, showDate, showMore, showPrefs]);

  return (
    <div className="space-y-4 sm:space-y-5 pb-10">
      {/* ═══ PRINT HEADER ═══ */}
      <div className="hidden print:block mb-4">
        <h1 className="text-xl font-extrabold">{tenant?.name || 'Electronics'} — Bikri ka record</h1>
        <p className="text-xs text-slate-600">
          {shopName ? `${shopName} • ` : ''}{rangeLabel} • {new Date().toLocaleString('en-PK', { dateStyle: 'full', timeStyle: 'short' })}
        </p>
        <p className="text-xs text-slate-600 mt-1">
          {stats.count} bill • Kul {formatPKR(stats.amount)} • Wasool {formatPKR(stats.paid)} • Udhaar {formatPKR(stats.credit)}
          {serialStats.soldSerials > 0 && ` • ${serialStats.soldSerials} serial bike`}
        </p>
      </div>

      {/* ═══ HERO ═══ */}
      <section className="relative overflow-hidden rounded-3xl bg-gradient-to-br from-slate-950 via-blue-900 to-cyan-700 text-white p-5 sm:p-6 shadow-2xl print:hidden">
        <div className="absolute -top-24 -right-20 h-72 w-72 rounded-full bg-cyan-400/25 blur-3xl pointer-events-none" />
        <div className="absolute -bottom-24 -left-20 h-64 w-64 rounded-full bg-blue-300/15 blur-3xl pointer-events-none" />
        <div className="absolute inset-0 opacity-[0.06] pointer-events-none"
          style={{ backgroundImage: 'radial-gradient(circle at 1px 1px, #fff 1px, transparent 0)', backgroundSize: '22px 22px' }} />
        <div className="relative flex items-start justify-between gap-4 flex-wrap">
          <div className="min-w-0">
            <div className="inline-flex items-center gap-2 rounded-full bg-white/15 backdrop-blur px-3 py-1 text-[11px] font-black border border-white/25 uppercase tracking-widest">
              <Cpu className="h-3.5 w-3.5 text-cyan-300" /> Electronics · Bikri
            </div>
            <h1 className="mt-3 text-2xl sm:text-3xl lg:text-4xl font-black leading-tight">🧾 Bikri ka Record</h1>
            <p className="mt-1.5 text-xs sm:text-sm font-bold text-white/90">
              {rangeLabel} · <strong className="text-emerald-200">{stats.count}</strong> bill ·{' '}
              <strong>{showValue(formatPKR(stats.amount))}</strong>
              {serialStats.soldSerials > 0 && <> · <span className="text-sky-200">{serialStats.soldSerials} serial</span></>}
              {stats.credit > 0 && <> · <span className="text-amber-200">{showValue(formatPKR(stats.credit))} udhaar</span></>}
            </p>
          </div>
          <div className="flex gap-2 flex-wrap items-center shrink-0">
            <PrivacyToggle compact />
            <button onClick={() => setShowTeacher(true)} title="Sikhein (G)"
              className="h-11 px-3 rounded-xl bg-amber-400/90 hover:bg-amber-400 text-slate-900 text-xs font-black inline-flex items-center gap-1.5 shadow-lg transition">
              <GraduationCap className="h-4 w-4" /> <span className="hidden sm:inline">Sikhein</span>
            </button>
            <button ref={prefsBtnRef} onClick={() => setShowPrefs((v) => !v)} title="Receipt ki settings"
              className={`h-11 px-3 rounded-xl text-xs font-black inline-flex items-center gap-1.5 border backdrop-blur transition ${
                showPrefs ? 'bg-white text-slate-900 border-white' : 'bg-white/15 hover:bg-white/25 border-white/25'
              }`}>
              <Settings2 className="h-4 w-4" /> <span className="hidden sm:inline">Receipt</span>
              {prefsSaved && <Check className="h-3 w-3 text-emerald-400" />}
            </button>
            <Link to="/electronics/warranty-claims" title="Warranty claims" className={heroBtn}>
              <ShieldCheck className="h-4 w-4" /> <span className="hidden lg:inline">Warranty</span>
            </Link>
            <button onClick={() => salesQ.refetch()} disabled={salesQ.isRefetching} title="Taaza" className={`${heroBtn} disabled:opacity-50`}>
              <RefreshCw className={`h-4 w-4 ${salesQ.isRefetching ? 'animate-spin' : ''}`} />
            </button>
            <button onClick={exportCsv} title="CSV" className={heroBtn}><FileSpreadsheet className="h-4 w-4" /></button>
            <button onClick={() => setScannerOpen(true)} title="Bill / IMEI scan (B)"
              className="h-11 px-3.5 rounded-xl bg-emerald-500 hover:bg-emerald-400 text-white text-xs font-black inline-flex items-center gap-1.5 shadow-lg transition">
              <ScanLine className="h-4 w-4" /> <span className="hidden sm:inline">Scan</span>
            </button>
            <button onClick={() => window.print()} title="Print (P)"
              className="h-11 px-3.5 rounded-xl bg-white text-blue-700 hover:bg-blue-50 text-xs font-black inline-flex items-center gap-1.5 shadow-lg transition">
              <Printer className="h-4 w-4" /> Print
            </button>
          </div>
        </div>
      </section>

      {showPrefs && (
        <ReceiptPrefsPopover anchorRef={prefsBtnRef} prefs={prefs} onChange={updatePrefs} onClose={() => setShowPrefs(false)} />
      )}

      {/* ═══ KPI ═══ */}
      <section className="grid grid-cols-2 lg:grid-cols-4 gap-3 print:hidden">
        <Kpi icon={Receipt} label="Bill" value={stats.count}
          sub={stats.voided > 0 ? `${stats.voided} void hue` : `${Number(stats.qty.toFixed(1))} cheezein bikin`} tone="blue" />
        <Kpi icon={TrendingUp} label="Kul bikri" value={showValue(formatPKR(stats.amount))} sub={rangeLabel} tone="cyan" highlight />
        <Kpi icon={Award} label="Munafa" value={showValue(formatPKR(stats.profit))} sub={`${stats.margin.toFixed(1)}% margin`} tone="violet" />
        <Kpi icon={Banknote} label="Wasool hua" value={showValue(formatPKR(stats.paid))}
          sub={stats.discount > 0 ? `${showValue(formatPKR(stats.discount))} chhoot di` : 'Haath me aaya'} tone="emerald" />
      </section>
      <section className="grid grid-cols-2 lg:grid-cols-4 gap-3 print:hidden">
        <Kpi icon={Hash} label="Serial bike" value={serialStats.soldSerials}
          sub={serialStats.gapQty > 0 ? `${serialStats.gapQty} bina serial` : 'Sab darj hain'}
          tone="sky" onClick={serialStats.gapBills > 0 ? () => setNoSerialOnly(!noSerialOnly) : undefined}
          active={noSerialOnly} />
        <Kpi icon={BookOpen} label="Udhaar" value={showValue(formatPKR(stats.credit))}
          sub={`${stats.creditCount} bill par baqi`} tone="amber"
          onClick={() => setCreditOnly(!creditOnly)} active={creditOnly} />
        <Kpi icon={BarChart3} label="Ausat bill" value={showValue(formatPKR(stats.avg))} sub="Har grahak ka" tone="blue" />
        <Kpi icon={Trophy} label="Sab se bara bill" value={showValue(formatPKR(stats.best?.total ?? 0))}
          sub={stats.best?.customer?.name ?? (stats.best ? 'Walk-in' : '—')} tone="violet"
          onClick={stats.best ? () => navigate(receiptLink(stats.best.id, false)) : undefined} />
      </section>

      {/* ═══ ELECTRONICS KI KHAAS BAAT ═══ */}
      {(serialStats.gapBills > 0 || warrantyEnding.length > 0) && (
        <section className="grid sm:grid-cols-2 gap-3 print:hidden">
          {serialStats.gapBills > 0 && (
            <div className="rounded-3xl bg-gradient-to-br from-rose-50 to-orange-50 dark:from-rose-500/10 dark:to-orange-500/10 border-2 border-rose-300 dark:border-rose-500/40 p-4 flex gap-3">
              <ShieldAlert className="h-5 w-5 text-rose-600 shrink-0 mt-0.5" />
              <div className="min-w-0">
                <h3 className="font-black text-rose-900 dark:text-rose-200 text-sm">
                  {serialStats.gapQty} cheezein serial jore baghair bik gayin
                </h3>
                <p className="text-[12px] font-bold text-rose-800 dark:text-rose-300 mt-0.5">
                  In grahakon ki warranty ka koi saboot nahi bacha. Claim ke din jhagra hoga —
                  abhi bill khol kar serial jor dein, bil kul asaan hai.
                </p>
                <div className="mt-1.5 flex flex-wrap gap-1">
                  {serialStats.gapList.map((s) => (
                    <Link key={s.id} to={receiptLink(s.id, false)}
                      className="px-2 py-0.5 rounded-md bg-white dark:bg-slate-800 text-[10px] font-black text-rose-800 dark:text-rose-200">
                      {s.saleNumber} · {serialGap(s)} baqi
                    </Link>
                  ))}
                </div>
                <button onClick={() => { setNoSerialOnly(true); setTab('list'); }}
                  className="mt-1.5 text-[11px] font-black text-rose-700 dark:text-rose-300 underline">
                  Saare aise bill dekhein →
                </button>
              </div>
            </div>
          )}
          {warrantyEnding.length > 0 && (
            <div className="rounded-3xl bg-gradient-to-br from-amber-50 to-yellow-50 dark:from-amber-500/10 dark:to-yellow-500/10 border-2 border-amber-200 dark:border-amber-500/30 p-4 flex gap-3">
              <ShieldCheck className="h-5 w-5 text-amber-600 shrink-0 mt-0.5" />
              <div className="min-w-0">
                <h3 className="font-black text-amber-900 dark:text-amber-200 text-sm">
                  {warrantyEnding.length} cheezon ki warranty 30 din me khatam
                </h3>
                <p className="text-[12px] font-bold text-amber-800 dark:text-amber-300 mt-0.5">
                  Jis grahak ki warranty khatam hone wali hai, use pehle bata dein — kharabi ho to abhi
                  dikha jaye. Baad me aayega to kuch nahi ho sakta.
                </p>
                <div className="mt-1.5 flex flex-wrap gap-1">
                  {warrantyEnding.slice(0, 4).map((s: any) => (
                    <span key={s.id} className="px-2 py-0.5 rounded-md bg-white dark:bg-slate-800 text-[10px] font-black text-amber-800 dark:text-amber-200">
                      {s.product?.name ?? 'Cheez'} · {fmtD(s.warrantyEndDate)}
                    </span>
                  ))}
                </div>
                <Link to="/electronics/serials?status=SOLD"
                  className="mt-1.5 inline-block text-[11px] font-black text-amber-700 dark:text-amber-300 underline">
                  Saare serial dekhein →
                </Link>
              </div>
            </div>
          )}
        </section>
      )}

      {/* ═══ TABS ═══ */}
      <div className="grid grid-cols-2 gap-2 sm:gap-3 print:hidden">
        {([
          { v: 'list' as const, label: 'Bill', hint: 'Har bikri ka record', icon: Receipt, n: filtered.length as number | undefined },
          { v: 'analytics' as const, label: 'Analytics', hint: 'Kab, kya aur kis se', icon: BarChart3, n: undefined },
        ]).map((t) => {
          const on = tab === t.v;
          return (
            <button key={t.v} onClick={() => setTab(t.v)}
              className={`group relative overflow-hidden rounded-3xl border-2 px-4 sm:px-6 py-4 text-left transition active:scale-[0.99] ${
                on ? 'bg-gradient-to-br from-blue-600 to-cyan-700 border-transparent text-white shadow-xl shadow-blue-500/30'
                  : 'bg-white dark:bg-slate-900 border-slate-200 dark:border-slate-800 text-slate-600 dark:text-slate-300 hover:border-blue-400 hover:shadow-lg'
              }`}>
              <div className="relative flex items-center gap-3">
                <div className={`h-11 w-11 sm:h-12 sm:w-12 rounded-2xl flex items-center justify-center shrink-0 ${
                  on ? 'bg-white/20' : 'bg-gradient-to-br from-blue-500 to-cyan-700 text-white'
                }`}><t.icon className="h-5 w-5 sm:h-6 sm:w-6" /></div>
                <div className="min-w-0 flex-1">
                  <div className="flex items-center gap-2">
                    <span className="text-base sm:text-lg font-black truncate">{t.label}</span>
                    {t.n !== undefined && (
                      <span className={`px-2 py-0.5 rounded-full text-[11px] font-black tabular-nums ${on ? 'bg-black/25 text-white' : 'bg-slate-100 dark:bg-slate-800 text-slate-500'}`}>{t.n}</span>
                    )}
                  </div>
                  <div className={`text-[11px] font-bold truncate ${on ? 'text-white/80' : 'text-slate-400'}`}>{t.hint}</div>
                </div>
              </div>
            </button>
          );
        })}
      </div>

      {/* ═══ TOOLBAR ═══ */}
      <section className="rounded-3xl bg-white dark:bg-slate-900 border-2 border-slate-200 dark:border-slate-800 shadow-sm p-3 sm:p-4 print:hidden">
        <div className="flex gap-2 flex-wrap items-center">
          <div className="relative flex-1 min-w-[220px]">
            <Search className="h-5 w-5 text-slate-400 absolute left-3.5 top-1/2 -translate-y-1/2 pointer-events-none" />
            <input ref={searchRef} value={search} onChange={(e) => setSearch(e.target.value)}
              placeholder="Bill #, grahak, phone, cheez, serial / IMEI… (/ dabao)"
              className="h-12 w-full rounded-2xl border-2 border-slate-200 dark:border-slate-700 bg-white dark:bg-slate-800 pl-11 pr-10 text-sm font-bold text-slate-900 dark:text-white placeholder:text-slate-400 focus:outline-none focus:border-blue-500 transition" />
            {search && (
              <button onClick={() => setSearch('')}
                className="absolute right-3 top-1/2 -translate-y-1/2 h-7 w-7 rounded-lg hover:bg-slate-100 dark:hover:bg-slate-700 flex items-center justify-center">
                <X className="h-4 w-4 text-slate-400" />
              </button>
            )}
          </div>

          <div className="relative">
            <button onClick={() => { setShowDate((v) => !v); setShowMore(false); }}
              className={`h-12 px-4 rounded-2xl border-2 text-sm font-black inline-flex items-center gap-2 transition ${
                dateFilter !== 'today' ? 'border-blue-500 bg-blue-50 dark:bg-blue-500/15 text-blue-700 dark:text-blue-300'
                  : 'border-slate-200 dark:border-slate-700 bg-white dark:bg-slate-800 text-slate-700 dark:text-slate-200 hover:border-blue-400'
              }`}>
              <CalendarRange className="h-4 w-4" />
              <span className="max-w-[140px] truncate">{DATE_OPTS.find(([v]) => v === dateFilter)?.[1]}</span>
              <ChevronDown className={`h-3.5 w-3.5 transition ${showDate ? 'rotate-180' : ''}`} />
            </button>
            {showDate && (
              <>
                <div className="fixed inset-0 z-30" onClick={() => setShowDate(false)} />
                <div className="absolute right-0 z-40 mt-2 w-72 rounded-2xl bg-white dark:bg-slate-900 border-2 border-slate-200 dark:border-slate-700 shadow-2xl p-3 space-y-2">
                  <div className="text-[10px] font-black uppercase tracking-widest text-slate-500">Tareekh chunein</div>
                  <div className="grid grid-cols-2 gap-1.5">
                    {DATE_OPTS.map(([v, l]) => (
                      <button key={v} onClick={() => { setDateFilter(v); if (v !== 'custom') setShowDate(false); }}
                        className={`h-10 rounded-xl text-xs font-black transition ${
                          dateFilter === v ? 'bg-blue-600 text-white shadow'
                            : 'bg-slate-100 dark:bg-slate-800 text-slate-700 dark:text-slate-300 hover:bg-slate-200 dark:hover:bg-slate-700'
                        }`}>{l}</button>
                    ))}
                  </div>
                  {dateFilter === 'custom' && (
                    <div className="grid grid-cols-2 gap-2 pt-1">
                      {([['Se', customStart, setCustomStart], ['Tak', customEnd, setCustomEnd]] as const).map(([l, v, set]) => (
                        <div key={l}>
                          <label className="text-[10px] font-black uppercase text-slate-500 mb-1 block">{l}</label>
                          <input type="date" value={v} onChange={(e) => set(e.target.value)}
                            className="h-10 w-full rounded-lg border-2 border-slate-200 dark:border-slate-700 bg-white dark:bg-slate-800 px-2 text-xs font-bold text-slate-900 dark:text-white focus:outline-none focus:border-blue-500 [color-scheme:light] dark:[color-scheme:dark]" />
                        </div>
                      ))}
                    </div>
                  )}
                  <div className="rounded-xl bg-slate-50 dark:bg-slate-800/60 p-2 text-[11px] font-bold text-slate-500 text-center">{rangeLabel}</div>
                </div>
              </>
            )}
          </div>

          <div className="relative">
            <button onClick={() => { setShowMore((v) => !v); setShowDate(false); }}
              className={`h-12 px-4 rounded-2xl border-2 text-sm font-black inline-flex items-center gap-2 transition ${
                payFilter !== 'all' || creditOnly || noSerialOnly
                  ? 'border-amber-500 bg-amber-50 dark:bg-amber-500/15 text-amber-700 dark:text-amber-300'
                  : 'border-slate-200 dark:border-slate-700 bg-white dark:bg-slate-800 text-slate-700 dark:text-slate-200 hover:border-amber-400'
              }`}>
              <Filter className="h-4 w-4" /> Chaant
              {(payFilter !== 'all' || creditOnly || noSerialOnly) && (
                <span className="h-5 w-5 rounded-full bg-amber-600 text-white text-[10px] flex items-center justify-center">
                  {[payFilter !== 'all', creditOnly, noSerialOnly].filter(Boolean).length}
                </span>
              )}
              <ChevronDown className={`h-3.5 w-3.5 transition ${showMore ? 'rotate-180' : ''}`} />
            </button>
            {showMore && (
              <>
                <div className="fixed inset-0 z-30" onClick={() => setShowMore(false)} />
                <div className="absolute right-0 z-40 mt-2 w-72 rounded-2xl bg-white dark:bg-slate-900 border-2 border-slate-200 dark:border-slate-700 shadow-2xl p-3 space-y-3">
                  <div>
                    <div className="text-[10px] font-black uppercase tracking-widest text-slate-500 mb-1.5">Paisa kaise aaya</div>
                    <div className="grid grid-cols-2 gap-1.5">
                      <button onClick={() => setPayFilter('all')}
                        className={`h-10 rounded-xl text-[11px] font-black transition ${payFilter === 'all' ? 'bg-slate-900 dark:bg-white text-white dark:text-slate-900' : 'bg-slate-100 dark:bg-slate-800 text-slate-700 dark:text-slate-300'}`}>Sab</button>
                      {Object.entries(PAY).map(([k, v]) => (
                        <button key={k} onClick={() => setPayFilter(k as PaymentMethod)}
                          className={`h-10 rounded-xl text-[11px] font-black inline-flex items-center justify-center gap-1 transition ${payFilter === k ? 'text-white shadow' : 'bg-slate-100 dark:bg-slate-800 text-slate-700 dark:text-slate-300'}`}
                          style={payFilter === k ? { background: v.hex } : undefined}>
                          <v.icon className="h-3 w-3" /> {v.label}
                        </button>
                      ))}
                    </div>
                  </div>
                  <label className="flex items-center gap-2.5 rounded-xl bg-amber-50 dark:bg-amber-500/10 border-2 border-amber-200 dark:border-amber-500/30 p-2.5 cursor-pointer">
                    <input type="checkbox" checked={creditOnly} onChange={(e) => setCreditOnly(e.target.checked)} className="h-4 w-4 rounded accent-amber-600" />
                    <div className="min-w-0">
                      <div className="text-xs font-black text-amber-900 dark:text-amber-200">Sirf udhaar wale</div>
                      <div className="text-[10px] font-bold text-amber-700 dark:text-amber-400">{stats.creditCount} bill par paisa baqi</div>
                    </div>
                  </label>
                  <label className="flex items-center gap-2.5 rounded-xl bg-rose-50 dark:bg-rose-500/10 border-2 border-rose-200 dark:border-rose-500/30 p-2.5 cursor-pointer">
                    <input type="checkbox" checked={noSerialOnly} onChange={(e) => setNoSerialOnly(e.target.checked)} className="h-4 w-4 rounded accent-rose-600" />
                    <div className="min-w-0">
                      <div className="text-xs font-black text-rose-900 dark:text-rose-200">Serial ke baghair bikri</div>
                      <div className="text-[10px] font-bold text-rose-700 dark:text-rose-400">{serialStats.gapBills} bill par warranty ka saboot nahi</div>
                    </div>
                  </label>
                </div>
              </>
            )}
          </div>

          {hasFilters && (
            <button onClick={clearFilters} title="Chaant hatao"
              className="h-12 w-12 rounded-2xl bg-rose-50 dark:bg-rose-500/15 text-rose-600 dark:text-rose-400 flex items-center justify-center transition">
              <X className="h-4 w-4" />
            </button>
          )}
        </div>

        {hasFilters && (
          <div className="mt-2.5 flex items-center gap-1.5 flex-wrap text-[11px] font-black">
            <span className="text-slate-400">Chaant:</span>
            <span className="px-2 py-1 rounded-lg bg-blue-100 dark:bg-blue-500/20 text-blue-700 dark:text-blue-300">{rangeLabel}</span>
            {payFilter !== 'all' && <span className="px-2 py-1 rounded-lg bg-slate-100 dark:bg-slate-800 text-slate-600 dark:text-slate-300">{PAY[payFilter]?.label}</span>}
            {creditOnly && <span className="px-2 py-1 rounded-lg bg-amber-100 dark:bg-amber-500/20 text-amber-700 dark:text-amber-300">Sirf udhaar</span>}
            {noSerialOnly && <span className="px-2 py-1 rounded-lg bg-rose-100 dark:bg-rose-500/20 text-rose-700 dark:text-rose-300">Serial ke baghair</span>}
            {search && <span className="px-2 py-1 rounded-lg bg-slate-100 dark:bg-slate-800 text-slate-600 dark:text-slate-300">"{search}"</span>}
            <span className="text-slate-400">→ {stats.count} bill</span>
          </div>
        )}
      </section>

      {/* ═══════ ANALYTICS ═══════ */}
      {tab === 'analytics' ? (
        <div className="space-y-4">
          <div className="grid lg:grid-cols-2 gap-4">
            <Panel icon={TrendingUp} title="Rozana bikri aur munafa" hint="Khali din bhi dikhte hain — warna chart jhoot bolta hai">
              {daily.length === 0 ? <EmptyBox /> : (
                <ResponsiveContainer width="100%" height={260}>
                  <ComposedChart data={daily}>
                    <CartesianGrid strokeDasharray="3 3" stroke={GRID} vertical={false} />
                    <XAxis dataKey="name" tick={{ fontSize: 10, fill: AXIS, fontWeight: 700 }} axisLine={false} tickLine={false} />
                    <YAxis tick={{ fontSize: 10, fill: AXIS, fontWeight: 700 }} axisLine={false} tickLine={false} />
                    <Tooltip contentStyle={TOOLTIP} formatter={(v: any, n: any) => [formatPKR(Number(v)), n === 'bikri' ? 'Bikri' : 'Munafa']} />
                    <Legend wrapperStyle={{ fontSize: 11, fontWeight: 700 }} />
                    <Area type="monotone" dataKey="bikri" name="Bikri" fill={C.sale} fillOpacity={0.15} stroke={C.sale} strokeWidth={2.5} />
                    <Line type="monotone" dataKey="munafa" name="Munafa" stroke={C.profit} strokeWidth={2.5} dot={false} />
                  </ComposedChart>
                </ResponsiveContainer>
              )}
            </Panel>

            <Panel icon={Clock} title="Kis ghante sab se zyada bikri" hint={peak?.bill ? `Sab se masroof: ${peak.label}` : undefined}>
              {live.length === 0 ? <EmptyBox /> : (
                <ResponsiveContainer width="100%" height={260}>
                  <BarChart data={hourlyShown}>
                    <CartesianGrid strokeDasharray="3 3" stroke={GRID} vertical={false} />
                    <XAxis dataKey="label" tick={{ fontSize: 9, fill: AXIS, fontWeight: 700 }} axisLine={false} tickLine={false} />
                    <YAxis tick={{ fontSize: 10, fill: AXIS, fontWeight: 700 }} axisLine={false} tickLine={false} />
                    <Tooltip contentStyle={TOOLTIP} formatter={(v: any) => [formatPKR(Number(v)), 'Bikri']} />
                    <Bar dataKey="bikri" fill={C.hours} radius={[6, 6, 0, 0]} />
                  </BarChart>
                </ResponsiveContainer>
              )}
            </Panel>

            <Panel icon={Cpu} title="Kis qism ka maal bika" hint="Electronics ki apni tasveer">
              {catAgg.length === 0 ? <EmptyBox /> : (
                <div className="space-y-2">
                  {catAgg.map((c, i) => {
                    const max = catAgg[0].value || 1;
                    return (
                      <div key={c.name} className="space-y-1">
                        <div className="flex items-center justify-between gap-2 text-xs font-black">
                          <span className="text-slate-700 dark:text-slate-200 truncate">{c.emoji} {c.name}</span>
                          <span className="text-slate-500 tabular-nums shrink-0">
                            {Number(c.qty.toFixed(1))} · {showValue(formatPKR(c.value))}
                          </span>
                        </div>
                        <div className="h-2 rounded-full bg-slate-100 dark:bg-slate-800 overflow-hidden">
                          <div className="h-full rounded-full transition-all"
                            style={{ width: `${(c.value / max) * 100}%`, background: PIE_COLORS[i % PIE_COLORS.length] }} />
                        </div>
                      </div>
                    );
                  })}
                </div>
              )}
            </Panel>

            <Panel icon={Award} title="Naya vs purana maal" hint="Refurbished ka hissa pata hona chahiye">
              {condAgg.length === 0 ? <EmptyBox text="Kisi cheez par haalat nahi likhi" /> : (
                <ResponsiveContainer width="100%" height={260}>
                  <PieChart>
                    <Pie data={condAgg} dataKey="value" nameKey="name" cx="50%" cy="50%" outerRadius={90} innerRadius={50}>
                      {condAgg.map((_, i) => <Cell key={i} fill={PIE_COLORS[i % PIE_COLORS.length]} />)}
                    </Pie>
                    <Tooltip contentStyle={TOOLTIP} formatter={(v: any) => formatPKR(Number(v))} />
                    <Legend wrapperStyle={{ fontSize: 11, fontWeight: 700 }} />
                  </PieChart>
                </ResponsiveContainer>
              )}
            </Panel>

            <Panel icon={Banknote} title="Paisa kaise aaya">
              {payPie.length === 0 ? <EmptyBox /> : (
                <ResponsiveContainer width="100%" height={260}>
                  <PieChart>
                    <Pie data={payPie} dataKey="value" nameKey="name" cx="50%" cy="50%" outerRadius={90} innerRadius={50}>
                      {payPie.map((p, i) => <Cell key={i} fill={p.hex} />)}
                    </Pie>
                    <Tooltip contentStyle={TOOLTIP} formatter={(v: any) => formatPKR(Number(v))} />
                    <Legend wrapperStyle={{ fontSize: 11, fontWeight: 700 }} />
                  </PieChart>
                </ResponsiveContainer>
              )}
            </Panel>

            <Panel icon={CalendarRange} title="Hafte ka kaunsa din bhaari">
              {live.length === 0 ? <EmptyBox /> : (
                <ResponsiveContainer width="100%" height={260}>
                  <BarChart data={weekday}>
                    <CartesianGrid strokeDasharray="3 3" stroke={GRID} vertical={false} />
                    <XAxis dataKey="label" tick={{ fontSize: 10, fill: AXIS, fontWeight: 700 }} axisLine={false} tickLine={false} />
                    <YAxis tick={{ fontSize: 10, fill: AXIS, fontWeight: 700 }} axisLine={false} tickLine={false} />
                    <Tooltip contentStyle={TOOLTIP} formatter={(v: any) => [formatPKR(Number(v)), 'Bikri']} />
                    <Bar dataKey="bikri" fill={C.weekday} radius={[6, 6, 0, 0]} />
                  </BarChart>
                </ResponsiveContainer>
              )}
            </Panel>
          </div>

          <div className="grid lg:grid-cols-2 gap-4">
            <Panel icon={Package} title="Kya bika" hint="🔢 nishan wali cheezon ka serial rakha jata hai">
              {itemsAgg.length === 0 ? <EmptyBox /> : (
                <div className="space-y-2">
                  {itemsAgg.map((it, i) => {
                    const max = itemsAgg[0].value || 1;
                    return (
                      <div key={it.name + i} className="space-y-1">
                        <div className="flex items-center justify-between gap-2 text-xs font-black">
                          <span className="text-slate-700 dark:text-slate-200 truncate">
                            {it.tracked && '🔢 '}{it.name}
                          </span>
                          <span className="text-slate-500 tabular-nums shrink-0">
                            {Number(it.qty.toFixed(1))} · {showValue(formatPKR(it.value))}
                          </span>
                        </div>
                        <div className="h-2 rounded-full bg-slate-100 dark:bg-slate-800 overflow-hidden">
                          <div className="h-full rounded-full bg-gradient-to-r from-blue-500 to-cyan-600"
                            style={{ width: `${(it.value / max) * 100}%` }} />
                        </div>
                      </div>
                    );
                  })}
                </div>
              )}
            </Panel>

            <Panel icon={User} title="Qeemti grahak" hint="Jo bar bar aate hain">
              {topCustomers.length === 0 ? <EmptyBox text="Abhi kisi bill par grahak ka naam nahi" /> : (
                <div className="space-y-1.5">
                  {topCustomers.map((c, i) => (
                    <div key={c.name + i} className="flex items-center gap-2.5 rounded-xl bg-slate-50 dark:bg-slate-800/60 p-2.5">
                      <span className="h-8 w-8 rounded-xl bg-gradient-to-br from-blue-500 to-cyan-700 text-white text-xs font-black flex items-center justify-center shrink-0">
                        {i + 1}
                      </span>
                      <span className="flex-1 min-w-0">
                        <span className="block text-xs font-black text-slate-900 dark:text-white truncate">{c.name}</span>
                        <span className="block text-[10px] font-bold text-slate-400">{c.bills} bill{c.phone ? ` · ${c.phone}` : ''}</span>
                      </span>
                      <span className="text-sm font-black text-blue-600 dark:text-blue-400 tabular-nums shrink-0">
                        {showValue(formatPKR(c.value))}
                      </span>
                    </div>
                  ))}
                </div>
              )}
            </Panel>
          </div>
        </div>
      ) : filtered.length === 0 ? (
        <section className="rounded-3xl bg-white dark:bg-slate-900 border-2 border-dashed border-slate-300 dark:border-slate-700 p-12 text-center">
          <Receipt className="h-12 w-12 text-slate-300 mx-auto mb-3" />
          <p className="text-base font-black text-slate-700 dark:text-slate-200">Koi bill nahi mila</p>
          <p className="text-xs font-bold text-slate-400 mt-1">
            {hasFilters ? 'Chaant badal kar dekhein' : 'Is arse me koi bikri nahi hui'}
          </p>
          {hasFilters && (
            <button onClick={clearFilters}
              className="mt-4 h-11 px-4 rounded-xl bg-slate-900 dark:bg-slate-700 text-white text-xs font-black transition">
              Chaant hatayein
            </button>
          )}
        </section>
      ) : (
        /* ═══════ LIST ═══════ */
        <section className="rounded-3xl bg-white dark:bg-slate-900 border-2 border-slate-200 dark:border-slate-800 shadow-sm overflow-hidden print:border-0 print:shadow-none">
          <div className="divide-y-2 divide-slate-100 dark:divide-slate-800">
            {filtered.slice(0, visible).map((s) => {
              const pay = PAY[s.paymentMethod] ?? PAY.CASH;
              const voided = s.status === 'VOIDED';
              const full = s.status === 'FULLY_RETURNED';
              const part = s.status === 'PARTIALLY_RETURNED';
              const credit = Number(s.creditAmount) > 0;
              const qty = (s.items ?? []).reduce((a: number, i: any) => a + Number(i.quantity || 0), 0);
              const wa = !voided ? billWaLink(s) : null;
              const mySerials = serialsBySale.get(s.id) ?? [];
              const gap = voided ? 0 : serialGap(s);

              return (
                <div key={s.id}
                  className={`relative px-4 sm:px-5 py-4 transition group avoid-break ${
                    voided ? 'opacity-60 bg-rose-50/40 dark:bg-rose-500/5'
                      : gap > 0 ? 'bg-rose-50/30 dark:bg-rose-500/5 hover:bg-rose-50/60'
                        : 'hover:bg-blue-50/40 dark:hover:bg-blue-500/5'
                  }`}>
                  <Link to={receiptLink(s.id)} className="absolute inset-0 print:hidden" aria-label={`Bill ${s.saleNumber}`} />

                  <div className="flex items-start justify-between gap-3">
                    <div className="flex items-start gap-3 flex-1 min-w-0">
                      <span className="h-12 w-12 rounded-2xl flex items-center justify-center shrink-0" style={{ backgroundColor: pay.hex + '22' }}>
                        <pay.icon className="h-5 w-5" style={{ color: pay.hex }} />
                      </span>
                      <div className="min-w-0 flex-1">
                        <div className="flex items-center gap-1.5 flex-wrap">
                          <span className="font-mono font-black text-sm text-slate-900 dark:text-white">{s.saleNumber}</span>
                          <span className={`text-[9px] font-black uppercase px-1.5 py-0.5 rounded-md ${pay.chip}`}>{pay.label}</span>
                          {voided && <span className="text-[9px] font-black uppercase px-1.5 py-0.5 rounded-md bg-rose-600 text-white">Void</span>}
                          {gap > 0 && (
                            <span className="text-[9px] font-black uppercase px-1.5 py-0.5 rounded-md bg-rose-600 text-white inline-flex items-center gap-1">
                              <ShieldAlert className="h-2.5 w-2.5" /> {gap} bina serial
                            </span>
                          )}
                          {mySerials.length > 0 && (
                            <span className="text-[9px] font-black uppercase px-1.5 py-0.5 rounded-md bg-sky-100 dark:bg-sky-500/20 text-sky-700 dark:text-sky-300 inline-flex items-center gap-1">
                              <Hash className="h-2.5 w-2.5" /> {mySerials.length} serial
                            </span>
                          )}
                          {full && <span className="text-[9px] font-black uppercase px-1.5 py-0.5 rounded-md bg-amber-500 text-white">Poori wapsi</span>}
                          {part && <span className="text-[9px] font-black uppercase px-1.5 py-0.5 rounded-md bg-orange-500 text-white">Kuch wapsi</span>}
                          {credit && !voided && (
                            <span className="text-[9px] font-black uppercase px-1.5 py-0.5 rounded-md bg-amber-100 dark:bg-amber-500/20 text-amber-700 dark:text-amber-300 inline-flex items-center gap-1">
                              <BookOpen className="h-2.5 w-2.5" /> Udhaar
                            </span>
                          )}
                        </div>

                        <div className="mt-1 text-xs font-bold text-slate-600 dark:text-slate-300 flex items-center gap-2 flex-wrap">
                          <User className="h-3 w-3 shrink-0" />
                          <span className="truncate max-w-[160px]">{s.customer?.name ?? 'Walk-in'}</span>
                          {s.customer?.phone && <><span className="text-slate-300">•</span><span className="text-slate-500">{s.customer.phone}</span></>}
                          <span className="text-slate-300">•</span>
                          <Package className="h-3 w-3 shrink-0" />
                          <span>{(s.items ?? []).length} cheezein · {Number(qty.toFixed(2))} qty</span>
                        </div>

                        <div className="mt-1 text-[10px] font-bold text-slate-500 dark:text-slate-400 inline-flex items-center gap-1.5 flex-wrap">
                          <Clock className="h-2.5 w-2.5" />
                          <span className="text-slate-700 dark:text-slate-200">{fmtTime(s.soldAt)}</span>
                          <span className="text-slate-300">•</span>
                          <span>{fmtDT(s.soldAt)}</span>
                          <span className="text-slate-300">•</span>
                          <span className="text-blue-600 dark:text-blue-400">{ago(s.soldAt)}</span>
                        </div>

                        <div className="mt-2 flex flex-wrap gap-1">
                          {(s.items ?? []).slice(0, 4).map((it: any, n: number) => {
                            const prof = profByProduct.get(itemPid(it));
                            return (
                              <span key={it.id ?? n}
                                className="px-1.5 py-0.5 rounded text-[10px] font-bold bg-slate-100 dark:bg-slate-800 text-slate-600 dark:text-slate-300 max-w-[190px] truncate">
                                {trackedIds.has(itemPid(it)) ? '🔢 ' : `${catMeta(prof?.categoryType).emoji} `}
                                {it.product?.name} × {Number(Number(it.quantity).toFixed(2))}
                              </span>
                            );
                          })}
                          {(s.items?.length ?? 0) > 4 && (
                            <span className="px-1.5 py-0.5 rounded text-[10px] font-bold bg-slate-100 dark:bg-slate-800 text-slate-500">
                              +{s.items.length - 4} aur
                            </span>
                          )}
                        </div>

                        {/* Serial / IMEI — claim ke din yehi kaam aata hai */}
                        {mySerials.length > 0 && (
                          <div className="mt-2 rounded-xl bg-sky-50 dark:bg-sky-500/10 border border-sky-200 dark:border-sky-500/30 px-2 py-1.5">
                            <div className="text-[9px] font-black uppercase tracking-wide text-sky-700 dark:text-sky-300 mb-1 inline-flex items-center gap-1">
                              <Hash className="h-2.5 w-2.5" /> Is bill ke serial / IMEI
                            </div>
                            <div className="flex flex-wrap gap-1">
                              {mySerials.slice(0, 6).map((x: any) => (
                                <span key={x.id}
                                  className="px-1.5 py-0.5 rounded-md bg-white dark:bg-slate-800 font-mono text-[10px] font-black text-slate-700 dark:text-slate-200">
                                  {x.imei || x.serialNumber}
                                  {x.warrantyEndDate && (
                                    <span className="ml-1 font-sans text-emerald-600 dark:text-emerald-400">
                                      🛡️ {fmtD(x.warrantyEndDate)}
                                    </span>
                                  )}
                                </span>
                              ))}
                              {mySerials.length > 6 && (
                                <span className="px-1.5 py-0.5 rounded-md bg-white dark:bg-slate-800 text-[10px] font-black text-slate-500">
                                  +{mySerials.length - 6} aur
                                </span>
                              )}
                            </div>
                          </div>
                        )}

                        {gap > 0 && (
                          <p className="mt-1.5 text-[10px] font-black text-rose-700 dark:text-rose-400">
                            ⚠️ {gap} cheez ka serial jora nahi gaya — is grahak ki warranty ka saboot nahi bacha
                          </p>
                        )}
                      </div>
                    </div>

                    <div className="text-right shrink-0">
                      <div className={`text-xl sm:text-2xl font-black tabular-nums ${voided ? 'text-slate-400 line-through' : 'text-blue-700 dark:text-blue-400'}`}>
                        {showValue(formatPKR(s.total))}
                      </div>
                      {Number(s.changeAmount) > 0 && !voided && (
                        <div className="text-[10px] font-black text-emerald-700 dark:text-emerald-400 tabular-nums">
                          Wapis diya: {showValue(formatPKR(s.changeAmount))}
                        </div>
                      )}
                      {credit && !voided && (
                        <div className="text-[10px] font-black text-amber-600 tabular-nums">{showValue(formatPKR(s.creditAmount))} baqi</div>
                      )}
                    </div>
                  </div>

                  <div className="mt-2.5 flex items-center gap-1.5 flex-wrap print:hidden">
                    <Link to={receiptLink(s.id, false)}
                      className="relative z-10 h-9 px-3 rounded-xl bg-blue-600 hover:bg-blue-700 text-white text-[11px] font-black inline-flex items-center gap-1.5 transition">
                      <Eye className="h-3.5 w-3.5" /> Bill dekhein
                    </Link>
                    <Link to={receiptLink(s.id, true)} title="Seedha print"
                      className="relative z-10 h-9 px-3 rounded-xl bg-slate-100 dark:bg-slate-800 hover:bg-blue-100 dark:hover:bg-blue-500/20 text-slate-700 dark:text-slate-200 text-[11px] font-black inline-flex items-center gap-1.5 transition">
                      <Printer className="h-3.5 w-3.5" /> Print
                    </Link>
                    {gap > 0 && (
                      <Link to={`/electronics/serials?sale=${s.id}`}
                        className="relative z-10 h-9 px-3 rounded-xl bg-rose-600 hover:bg-rose-700 text-white text-[11px] font-black inline-flex items-center gap-1.5 transition">
                        <Hash className="h-3.5 w-3.5" /> Serial jorein
                      </Link>
                    )}
                    {mySerials.length > 0 && !voided && (
                      <Link to="/electronics/warranty-claims"
                        className="relative z-10 h-9 px-3 rounded-xl bg-sky-50 dark:bg-sky-500/15 hover:bg-sky-100 text-sky-700 dark:text-sky-300 text-[11px] font-black inline-flex items-center gap-1.5 transition">
                        <ShieldCheck className="h-3.5 w-3.5" /> Claim
                      </Link>
                    )}
                    {wa && (
                      <a href={wa} target="_blank" rel="noreferrer" title="WhatsApp par bill bhejein"
                        className="relative z-10 h-9 px-3 rounded-xl bg-emerald-50 dark:bg-emerald-500/15 hover:bg-emerald-100 text-emerald-700 dark:text-emerald-300 text-[11px] font-black inline-flex items-center gap-1.5 transition">
                        <MessageCircle className="h-3.5 w-3.5" /> WhatsApp
                      </a>
                    )}
                    {!voided && !full && (
                      <button onClick={() => setReturnTarget(s)}
                        className="relative z-10 h-9 px-3 rounded-xl border-2 border-amber-200 dark:border-amber-500/30 text-amber-700 dark:text-amber-400 text-[11px] font-black inline-flex items-center gap-1.5 hover:bg-amber-50 dark:hover:bg-amber-500/10 transition">
                        <Undo2 className="h-3.5 w-3.5" /> Wapsi
                      </button>
                    )}
                    {!voided && (
                      <button onClick={() => setVoidTarget(s)}
                        className="relative z-10 h-9 px-3 rounded-xl border-2 border-rose-200 dark:border-rose-500/30 text-rose-600 dark:text-rose-400 text-[11px] font-black inline-flex items-center gap-1.5 hover:bg-rose-50 dark:hover:bg-rose-500/10 ml-auto transition">
                        <Trash2 className="h-3.5 w-3.5" /> Void
                      </button>
                    )}
                    {voided && (
                      <span className="ml-auto text-[10px] font-black text-rose-600 inline-flex items-center gap-1">
                        Void{s.voidReason ? ` — ${s.voidReason}` : ''}
                      </span>
                    )}
                  </div>
                </div>
              );
            })}
          </div>
          {visible < filtered.length && (
            <button onClick={() => setVisible((v) => v + 50)}
              className="w-full py-4 text-xs font-black text-blue-700 dark:text-blue-400 hover:bg-blue-50 dark:hover:bg-blue-500/10 border-t-2 border-slate-100 dark:border-slate-800 inline-flex items-center justify-center gap-1 transition print:hidden">
              Aur {Math.min(50, filtered.length - visible)} dikhayein <ArrowRight className="h-3 w-3" />
              <span className="text-slate-400 ml-1">({visible}/{filtered.length})</span>
            </button>
          )}
        </section>
      )}

      {scannerOpen && (
        <BarcodeScanner onDetected={onScan} onClose={() => setScannerOpen(false)}
          title="Bill ya IMEI scan karein"
          hint="Purane bill ka barcode, ya cheez ka serial / IMEI camera ke samne rakhein" />
      )}

      {returnTarget && (
        <ReturnModal sale={returnTarget} onClose={() => setReturnTarget(null)}
          onDone={() => {
            setReturnTarget(null);
            ['sales-list', 'products', 'electronics-products-list', 'electronics-serials-sold', 'customers']
              .forEach((k) => qc.invalidateQueries({ queryKey: [k] }));
          }} />
      )}

      {voidTarget && (
        <VoidModal sale={voidTarget} pending={voidMut.isPending}
          serials={serialsBySale.get(voidTarget.id) ?? []}
          onClose={() => setVoidTarget(null)}
          onConfirm={(reason: string) => voidMut.mutate({ id: voidTarget.id, reason })} />
      )}

      {showTeacher && <Teacher onClose={() => setShowTeacher(false)} />}

      <style>{`
        @media print {
          @page { size: A4 landscape; margin: 10mm 8mm; }
          html, body { background: white !important; color: #0f172a !important; print-color-adjust: exact !important; -webkit-print-color-adjust: exact !important; }
          .dark body, .dark { background: white !important; color: #0f172a !important; }
          .print\\:hidden { display: none !important; }
          .print\\:block { display: block !important; }
          section, div { box-shadow: none !important; }
          .overflow-hidden, .overflow-auto { overflow: visible !important; }
          [class*="fixed"] { display: none !important; }
          html, body, #root { height: auto !important; overflow: visible !important; }
          .avoid-break { break-inside: avoid !important; page-break-inside: avoid !important; }
          img, .recharts-wrapper { display: none !important; }
          [data-sonner-toaster] { display: none !important; }
        }
      `}</style>
    </div>
  );
}

/* ════════════════ CHHOTE HISSE ════════════════ */

function ReceiptPrefsPopover({ prefs, onChange, onClose, anchorRef }: {
  prefs: ReceiptPrefs; onChange: (p: Partial<ReceiptPrefs>) => void; onClose: () => void;
  anchorRef: React.RefObject<HTMLButtonElement | null>;
}) {
  const [pos, setPos] = useState<{ top: number; right: number } | null>(null);
  useEffect(() => {
    const place = () => {
      const r = anchorRef.current?.getBoundingClientRect();
      if (r) setPos({ top: r.bottom + 8, right: Math.max(8, window.innerWidth - r.right) });
    };
    place();
    window.addEventListener('resize', place);
    window.addEventListener('scroll', place, true);
    return () => { window.removeEventListener('resize', place); window.removeEventListener('scroll', place, true); };
  }, [anchorRef]);
  if (!pos) return null;

  const seg = (on: boolean) =>
    `h-9 rounded-lg text-[11px] font-black transition ${on ? 'bg-blue-600 text-white' : 'bg-slate-100 dark:bg-slate-800 text-slate-600 dark:text-slate-300'}`;

  return createPortal(
    <>
      <div className="fixed inset-0 z-[70] print:hidden" onClick={onClose} />
      <div style={{ top: pos.top, right: pos.right }}
        className="fixed z-[71] w-64 rounded-2xl bg-white dark:bg-slate-900 border-2 border-slate-200 dark:border-slate-700 shadow-2xl p-3 space-y-3 text-slate-900 dark:text-white print:hidden">
        <div className="text-[10px] font-black uppercase tracking-widest text-slate-500">Receipt ki settings</div>
        <div>
          <div className="text-[10px] font-black uppercase text-slate-500 mb-1">Kaghaz</div>
          <div className="grid grid-cols-2 gap-1.5">
            {(['58', '80'] as const).map((w) => (
              <button key={w} onClick={() => onChange({ paperWidth: w })} className={seg(prefs.paperWidth === w)}>{w}mm</button>
            ))}
          </div>
        </div>
        <div>
          <div className="text-[10px] font-black uppercase text-slate-500 mb-1">Tafseel</div>
          <div className="grid grid-cols-2 gap-1.5">
            {([['short', 'Chhota'], ['full', 'Poora']] as const).map(([m, l]) => (
              <button key={m} onClick={() => onChange({ mode: m })} className={seg(prefs.mode === m)}>{l}</button>
            ))}
          </div>
        </div>
        <label className="flex items-center gap-2 cursor-pointer">
          <input type="checkbox" checked={prefs.autoPrint} onChange={(e) => onChange({ autoPrint: e.target.checked })}
            className="h-4 w-4 rounded accent-blue-600" />
          <span className="text-[11px] font-black">Bill kholte hi print</span>
        </label>
        <label className="flex items-center gap-2 cursor-pointer">
          <input type="checkbox" checked={prefs.showLogo} onChange={(e) => onChange({ showLogo: e.target.checked })}
            className="h-4 w-4 rounded accent-blue-600" />
          <span className="text-[11px] font-black">Logo dikhayein</span>
        </label>
        <p className="text-[10px] font-bold text-slate-400">"Print" button hamesha seedha print karta hai.</p>
      </div>
    </>,
    document.body,
  );
}

/* ═══ VOID — wajah zaroori ═══ */
function VoidModal({ sale, pending, serials, onClose, onConfirm }: any) {
  const [reason, setReason] = useState('');
  const quick = ['Ghalti se bana', 'Demo bill', 'Grahak ne liya hi nahi', 'Double bill ban gaya'];
  return (
    <div className="fixed inset-0 z-50 bg-black/60 backdrop-blur-sm flex items-end sm:items-center justify-center p-3" onClick={onClose}>
      <div onClick={(e) => e.stopPropagation()}
        className="w-full max-w-sm rounded-3xl bg-white dark:bg-slate-900 shadow-2xl overflow-hidden">
        <div className="p-5 bg-gradient-to-br from-rose-600 to-red-700 text-white">
          <div className="flex items-center gap-3">
            <span className="h-11 w-11 rounded-2xl bg-white/20 flex items-center justify-center shrink-0">
              <AlertTriangle className="h-5 w-5" />
            </span>
            <div className="min-w-0">
              <div className="text-[10px] uppercase tracking-widest font-black text-white/80">Bill void karein</div>
              <h3 className="font-black text-lg font-mono">{sale.saleNumber}</h3>
            </div>
          </div>
        </div>
        <div className="p-5 space-y-3">
          <p className="text-[12px] font-bold text-slate-600 dark:text-slate-300">
            Void karne se stock wapas aa jayega aur ye bill hisab se nikal jayega.
          </p>

          {serials?.length > 0 && (
            <div className="rounded-xl bg-sky-50 dark:bg-sky-500/10 border-2 border-sky-200 dark:border-sky-500/30 p-2.5">
              <p className="text-[11px] font-black text-sky-900 dark:text-sky-200">
                Is bill ke sath {serials.length} serial gaye thay
              </p>
              <p className="text-[11px] font-bold text-sky-800 dark:text-sky-300 mt-0.5">
                Void ke baad wo stock me wapas aane chahiyen. Ek baar Serial safhe par ja kar dekh lein
                ke unki haalat "stock me" ho gayi hai.
              </p>
            </div>
          )}

          <div>
            <label className="block mb-1 text-[11px] font-black uppercase tracking-wide text-slate-500">
              Wajah <span className="text-rose-500">*</span>
            </label>
            <input autoFocus value={reason} onChange={(e) => setReason(e.target.value)}
              placeholder="Kyun void kar rahe hain…"
              className="h-11 w-full rounded-xl border-2 border-slate-200 dark:border-slate-700 bg-white dark:bg-slate-800 px-3 text-sm font-bold text-slate-900 dark:text-white focus:outline-none focus:border-rose-500 transition" />
            <div className="mt-1.5 flex flex-wrap gap-1">
              {quick.map((r) => (
                <button key={r} onClick={() => setReason(r)}
                  className="px-2 py-1 rounded-lg bg-slate-100 dark:bg-slate-800 text-[10px] font-black text-slate-600 dark:text-slate-300 hover:bg-slate-200 dark:hover:bg-slate-700 transition">
                  {r}
                </button>
              ))}
            </div>
          </div>

          <div className="flex gap-2">
            <button onClick={onClose}
              className="flex-1 h-11 rounded-xl bg-slate-100 dark:bg-slate-800 text-sm font-black text-slate-700 dark:text-slate-200 transition">
              Rehne dein
            </button>
            <button onClick={() => onConfirm(reason.trim())} disabled={!reason.trim() || pending}
              className="flex-1 h-11 rounded-xl bg-rose-600 hover:bg-rose-700 text-white text-sm font-black disabled:opacity-50 transition">
              {pending ? 'Ho raha hai…' : 'Void karein'}
            </button>
          </div>
        </div>
      </div>
    </div>
  );
}

const KPI_TONES: Record<string, string> = {
  blue: 'from-blue-500 to-blue-700',
  cyan: 'from-cyan-500 to-blue-600',
  emerald: 'from-emerald-500 to-green-600',
  amber: 'from-amber-500 to-orange-600',
  violet: 'from-violet-500 to-purple-700',
  sky: 'from-sky-500 to-cyan-600',
};

function Kpi({ icon: Icon, label, value, sub, tone, onClick, active, highlight }: any) {
  const Wrap: any = onClick ? 'button' : 'div';
  return (
    <Wrap onClick={onClick}
      className={`rounded-3xl border-2 p-4 text-left transition ${
        active ? 'border-blue-500 bg-blue-50 dark:bg-blue-500/10 shadow-lg'
          : highlight ? 'border-blue-200 dark:border-blue-500/30 bg-white dark:bg-slate-900 shadow-md'
            : 'border-slate-200 dark:border-slate-800 bg-white dark:bg-slate-900 shadow-sm'
      } ${onClick ? 'hover:border-blue-400 hover:shadow-md active:scale-[0.99] cursor-pointer' : ''}`}>
      <div className="flex items-center gap-2 mb-1.5">
        <span className={`h-8 w-8 rounded-xl bg-gradient-to-br ${KPI_TONES[tone] ?? KPI_TONES.blue} text-white flex items-center justify-center shrink-0`}>
          <Icon className="h-4 w-4" />
        </span>
        <span className="text-[10px] font-black uppercase tracking-wide text-slate-500 dark:text-slate-400 truncate">{label}</span>
      </div>
      <p className="text-xl sm:text-2xl font-black text-slate-900 dark:text-white tabular-nums leading-none">
        {typeof value === 'number' ? value.toLocaleString() : value}
      </p>
      {sub && <p className="mt-0.5 text-[10px] font-bold text-slate-400 truncate">{sub}</p>}
    </Wrap>
  );
}

function Panel({ icon: Icon, title, hint, children }: {
  icon: any; title: string; hint?: string; children: React.ReactNode;
}) {
  return (
    <section className="rounded-3xl bg-white dark:bg-slate-900 border-2 border-slate-200 dark:border-slate-800 shadow-sm overflow-hidden">
      <header className="px-4 py-3 border-b-2 border-slate-100 dark:border-slate-800 flex items-center gap-2">
        <span className="h-8 w-8 rounded-xl bg-gradient-to-br from-blue-600 to-cyan-700 text-white flex items-center justify-center shrink-0">
          <Icon className="h-4 w-4" />
        </span>
        <div className="min-w-0">
          <h2 className="text-sm font-black text-slate-900 dark:text-white truncate">{title}</h2>
          {hint && <p className="text-[10px] font-bold text-slate-400 truncate">{hint}</p>}
        </div>
      </header>
      <div className="p-4">{children}</div>
    </section>
  );
}

function EmptyBox({ text }: { text?: string }) {
  return (
    <div className="py-12 text-center">
      <BarChart3 className="h-10 w-10 text-slate-200 dark:text-slate-700 mx-auto mb-2" />
      <p className="text-xs font-black text-slate-400">{text ?? 'Is arse me kuch nahi bika'}</p>
    </div>
  );
}

/* ── Sikhein ── */
function Teacher({ onClose }: { onClose: () => void }) {
  return (
    <div className="fixed inset-0 z-[60] bg-slate-950/75 backdrop-blur-sm flex items-end sm:items-center justify-center p-0 sm:p-4" onClick={onClose}>
      <div onClick={(e) => e.stopPropagation()}
        className="w-full sm:max-w-lg max-h-[88vh] rounded-t-3xl sm:rounded-3xl bg-white dark:bg-slate-900 shadow-2xl flex flex-col overflow-hidden">
        <header className="p-5 bg-gradient-to-br from-amber-500 to-orange-600 text-white shrink-0 flex items-center justify-between gap-2">
          <div>
            <h3 className="text-lg font-black inline-flex items-center gap-2">
              <GraduationCap className="h-5 w-5" /> Bikri ka safha
            </h3>
            <p className="text-xs font-bold text-white/80 mt-0.5">Electronics me bill warranty ki shuruaat hai</p>
          </div>
          <button onClick={onClose} className="h-9 w-9 rounded-xl bg-white/20 hover:bg-white/30 flex items-center justify-center shrink-0 transition">
            <X className="h-4 w-4" />
          </button>
        </header>
        <div className="flex-1 overflow-y-auto p-5 space-y-3">
          {[
            { i: Hash, t: 'Har bill ke neeche uske serial', d: 'Jo serial ya IMEI is bill ke sath gaye, wo neele khane me likhe hain — sath me warranty ki tareekh. Chhe mahine baad grahak aaye to dhoondna nahi parta, bill khol kar dekh lein.' },
            { i: ShieldAlert, t: 'Laal nishan sab se ahem hai', d: 'Jis cheez ka serial rakha jata hai, wo agar serial jore baghair bik gayi, to bill par laal patti aa jati hai. Us grahak ki warranty ka koi saboot nahi bacha. "Serial jorein" dabayein aur abhi theek kar lein.' },
            { i: ScanLine, t: 'Scan me sirf bill nahi, IMEI bhi', d: 'Grahak aksar bill nahi, dabba le kar aata hai. Dabbe ka IMEI scan karein — hum khud us ka bill dhoond kar khol dete hain.' },
            { i: ShieldCheck, t: 'Warranty khatam hone se pehle batayein', d: 'Upar peeli patti batati hai ke kis kis ki warranty agle 30 din me khatam ho rahi hai. Grahak ko bata dein — kharabi ho to abhi dikha jaye, baad me kuch nahi ho sakta.' },
            { i: Settings2, t: 'Receipt ek baar set karein', d: 'Kaghaz 58 ya 80mm, chhota ya poora bill, aur "kholte hi print". Ek baar set karein — har bill usi tarah chapega.' },
            { i: Undo2, t: 'Wapsi aur Void alag cheezein hain', d: 'Wapsi = grahak kuch cheezein wapas laya. Void = bill bana hi ghalat tha. Void par wajah likhna zaroori hai, aur serial bhi stock me wapas aate hain.' },
            { i: BarChart3, t: 'Analytics me qism dekhein', d: 'Kis qism ka maal bika — Audio, Power, Storage. Aur naya vs refurbished ka hissa. A dabayein.' },
          ].map((s, n) => (
            <div key={n} className="flex gap-3 rounded-2xl bg-slate-50 dark:bg-slate-800/60 p-3">
              <span className="h-9 w-9 rounded-xl bg-gradient-to-br from-blue-600 to-cyan-700 text-white flex items-center justify-center shrink-0">
                <s.i className="h-4 w-4" />
              </span>
              <div className="min-w-0">
                <p className="text-sm font-black text-slate-900 dark:text-white">{s.t}</p>
                <p className="text-[12px] font-bold text-slate-600 dark:text-slate-400 mt-0.5">{s.d}</p>
              </div>
            </div>
          ))}
          <div className="rounded-2xl bg-slate-900 dark:bg-slate-800 p-3">
            <p className="text-[10px] font-black uppercase tracking-widest text-white/60 mb-2">Tez tareeqa</p>
            <div className="flex flex-wrap gap-2">
              {[['/', 'Dhoondein'], ['B', 'Scan'], ['A', 'Analytics'], ['G', 'Ye safha'], ['P', 'Print'], ['Esc', 'Band']].map(([k, l]) => (
                <span key={k} className="inline-flex items-center gap-1.5 text-[11px] font-bold text-white/80">
                  <kbd className="px-1.5 py-0.5 rounded bg-white/15 font-black">{k}</kbd> {l}
                </span>
              ))}
            </div>
          </div>
        </div>
        <footer className="p-4 border-t-2 border-slate-100 dark:border-slate-800 shrink-0">
          <Button onClick={onClose} className="w-full bg-gradient-to-r from-blue-600 to-cyan-700">Samajh gaya</Button>
        </footer>
      </div>
    </div>
  );
}
