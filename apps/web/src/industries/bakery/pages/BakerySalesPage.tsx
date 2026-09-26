import { useMemo, useState, useEffect, useRef } from 'react';
import { createPortal } from 'react-dom';
import { Link, useNavigate } from 'react-router-dom';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import {
  Receipt, TrendingUp, Search, X, RefreshCw, Package, User, Clock,
  Banknote, CreditCard, Smartphone, Building2, Zap, BookOpen, Award,
  BarChart3, CalendarRange, CalendarDays, ChevronDown, GraduationCap, Printer,
  FileSpreadsheet, ScanLine, MessageCircle, Undo2, Trash2, Cake, ChefHat,
  AlertTriangle, Eye, Settings2, Check, Filter, Trophy, Sun,
  Sunrise, Sunset, Moon, ArrowRight,
} from 'lucide-react';
import {
  ResponsiveContainer, BarChart, Bar, XAxis, YAxis, Tooltip, CartesianGrid,
  PieChart, Pie, Cell, Legend, ComposedChart, Area, Line,
} from 'recharts';
import { toast } from 'sonner';
import { salesApi, type PaymentMethod } from '@modules/sales/sales/api/sales.api';
import { billedSaleIds, isOrderNote } from '../components/OrderDeliverModal';
import { bakeryProductsApi } from '../api/products.api';
import BarcodeScanner from '@core/components/barcode/BarcodeScanner';
import { ReturnModal } from '@industries/retail/components/ReturnModal';
import { resolveTemplates, fillTemplate, waLink } from '@core/lib/whatsapp/templates';
import { settingsApi } from '@modules/organization/settings/api/settings.api';
import { formatPKR } from '@core/lib/format';
import { Button } from '@core/ui/Button';
import { useAuthStore } from '@core/stores/auth.store';
import { PrivacyToggle, useCostHidden } from '@/core/security/HiddenValue';

/* ═════════════════════════════════════════════════════════════
   BAKERY BIKRI — DIN KA POORA RECORD  (Retail jaisa, poora)
   ─────────────────────────────────────────────────────────────
   Retail se:
     ⚙️ Receipt settings (58/80mm, chhota/poora, kholte hi print, logo)
     🖨️ Har bill par seedha Print • poori line par click = bill
     🧾 Cheezon ki chip, waqt + "kitni der pehle", wapis diya
     📊 Aath KPI, rozana rujhan (khali din bhi), hafte ka din,
        qeemti customer, kya bika (bars ke saath)
     🔎 Bill scan → seedha wahi bill • lagi chaant ek line me
     📄 CSV ke upar khulasa
   Bakery ki apni (jaisi thi):
     Void / Wapsi — wohi alfaz, Void par wajah zaroori
     Cake orders alag • sab se masroof ghanta
   Nayi bakery baatein:
     🌅 Subah / Dopahar / Shaam / Raat — kis hisse me kitni bikri
     🧁 Apna banaya vs 📦 bahar ka — paisa kahan se aata hai
   ⌨️ / search • B bill scan • A analytics • G guide • P print
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

/* Dono theme me saaf nazar aane wale chart ke rang */
const AXIS = '#94a3b8';
const GRID = 'rgba(148,163,184,0.25)';
const TOOLTIP = {
  borderRadius: 14, border: 'none', backgroundColor: 'rgba(15,23,42,0.96)', color: '#f8fafc',
  fontWeight: 700, fontSize: 12, boxShadow: '0 12px 32px rgba(15,23,42,.28)', padding: '10px 12px',
};
const C = { sale: '#ec4899', profit: '#10b981', hours: '#f59e0b', peak: '#db2777', weekday: '#a855f7', made: '#ec4899', bought: '#3b82f6' };

/* ── Receipt ki pasand — BakeryReceiptPage isi chaabi se parhta hai ── */
const RECEIPT_PREFS_KEY = 'nafaa.receipt.prefs';
interface ReceiptPrefs { paperWidth: '58' | '80'; mode: 'short' | 'full'; autoPrint: boolean; showLogo: boolean }
const DEFAULT_PREFS: ReceiptPrefs = { paperWidth: '80', mode: 'short', autoPrint: false, showLogo: true };
function getPrefs(): ReceiptPrefs {
  try {
    const p = JSON.parse(localStorage.getItem(RECEIPT_PREFS_KEY) || 'null');
    if (p) return { ...DEFAULT_PREFS, ...p };
    const legacy = JSON.parse(localStorage.getItem('nafaa.bakery.print') || 'null');
    return legacy?.width ? { ...DEFAULT_PREFS, paperWidth: legacy.width === '58' ? '58' : '80' } : DEFAULT_PREFS;
  } catch { return DEFAULT_PREFS; }
}

/* ── Waqt — sab maqami din par (toISOString London ka din deta hai) ── */
const dayStart = (d: Date) => { const x = new Date(d); x.setHours(0, 0, 0, 0); return x; };
const dayEnd = (d: Date) => { const x = new Date(d); x.setHours(23, 59, 59, 999); return x; };
const dayKey = (d: Date) => `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}-${String(d.getDate()).padStart(2, '0')}`;
const fmtDT = (v: string) => new Intl.DateTimeFormat('en-PK', { dateStyle: 'medium', timeStyle: 'short' }).format(new Date(v));
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

/** Bakery ke din ke hisse — batch isi hisab se lagte hain */
const DAYPARTS = [
  { key: 'subah', label: 'Subah', range: '5am – 11am', icon: Sunrise, from: 5, to: 11 },
  { key: 'dopahar', label: 'Dopahar', range: '11am – 4pm', icon: Sun, from: 11, to: 16 },
  { key: 'shaam', label: 'Shaam', range: '4pm – 9pm', icon: Sunset, from: 16, to: 21 },
  { key: 'raat', label: 'Raat', range: '9pm – 5am', icon: Moon, from: 21, to: 29 },
] as const;
const daypartOf = (h: number) => DAYPARTS.find((p) => {
  const hh = h < 5 ? h + 24 : h;
  return hh >= p.from && hh < p.to;
})!;

export default function BakerySalesPage() {
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

  const updatePrefs = (patch: Partial<ReceiptPrefs>) => {
    const next = { ...prefs, ...patch };
    setPrefs(next);
    try { localStorage.setItem(RECEIPT_PREFS_KEY, JSON.stringify(next)); } catch { /* ignore */ }
    setPrefsSaved(true); setTimeout(() => setPrefsSaved(false), 1200);
  };

  /** Bill ka raasta — pasand ke naap aur tafseel ke saath */
  const receiptLink = (id: string, print = prefs.autoPrint) =>
    `/sales/${id}/receipt?paper=${prefs.paperWidth}&mode=${prefs.mode}${print ? '&autoprint=1' : ''}`;

  /* ── Data ── */
  const salesQ = useQuery({ queryKey: ['sales-list'], queryFn: () => salesApi.list() });
  const settingsQ = useQuery({ queryKey: ['settings'], queryFn: () => settingsApi.get(), staleTime: 60_000 });
  const profilesQ = useQuery({
    queryKey: ['bakery-profiles-all'],
    queryFn: () => bakeryProductsApi.list({}).catch(() => []),
    staleTime: 5 * 60_000,
  });

  const templates = useMemo(() => {
    const d: any = settingsQ.data;
    return resolveTemplates(d?.settings?.whatsappTemplates ?? d?.whatsappTemplates);
  }, [settingsQ.data]);

  /** Kaun si cheez hum khud banate hain */
  const madeIds = useMemo(() => {
    const s = new Set<string>();
    (profilesQ.data ?? []).forEach((p: any) => { if (p.productId && (p.isCakeCustomizable || p.isCustomizable)) s.add(p.productId); });
    return s;
  }, [profilesQ.data]);

  const voidMut = useMutation({
    mutationFn: ({ id, reason }: { id: string; reason: string }) => salesApi.voidSale(id, reason),
    onSuccess: () => {
      toast.success('Bill void ho gaya — stock wapas aa gaya');
      setVoidTarget(null);
      ['sales-list', 'sales-summary', 'products', 'bakery-all-products', 'products-for-bakery-pos', 'customers', 'customers-for-pos']
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

  useEffect(() => { setVisible(50); }, [dateFilter, customStart, customEnd, payFilter, creditOnly, search]);

  /* ── Rows ── */
  const sales: any[] = salesQ.data ?? [];
  const inRange = useMemo(
    () => sales.filter((s) => { const t = new Date(s.soldAt).getTime(); return t >= from.getTime() && t <= to.getTime(); }),
    [sales, from, to],
  );
  const live = useMemo(() => inRange.filter((s) => s.status !== 'VOIDED'), [inRange]);

  const q = search.trim().toLowerCase();
  const filtered = useMemo(() => {
    let out = inRange;
    if (payFilter !== 'all') out = out.filter((s) => s.paymentMethod === payFilter);
    if (creditOnly) out = out.filter((s) => Number(s.creditAmount) > 0);
    if (q) out = out.filter((s) =>
      (s.saleNumber ?? '').toLowerCase().includes(q) ||
      (s.customer?.name ?? '').toLowerCase().includes(q) ||
      (s.customer?.phone ?? '').toLowerCase().includes(q) ||
      (s.items ?? []).some((i: any) =>
        (i.product?.name ?? '').toLowerCase().includes(q) ||
        (i.product?.barcode ?? '').toLowerCase().includes(q) ||
        (i.product?.sku ?? '').toLowerCase().includes(q)));
    return [...out].sort((a, b) => new Date(b.soldAt).getTime() - new Date(a.soldAt).getTime());
  }, [inRange, payFilter, creditOnly, q]);

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

  /* Cake / bulk orders ab "De diya" par asli bill bante hain — yahi
     list me gine jate hain. Unhein pehchan lo (item ki note ya is
     browser ki yaad), taake alag nishan lage aur rakam do dafa na gine. */
  const orderSaleIds = useMemo(() => billedSaleIds(), [salesQ.data]);
  const isOrderSale = (s: any) => orderSaleIds.has(s.id) || (s.items ?? []).some((i: any) => isOrderNote(i.note));
  const orderStats = useMemo(() => {
    const l = live.filter(isOrderSale);
    return { count: l.length, value: l.reduce((x, s) => x + Number(s.total || 0), 0) };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [live, orderSaleIds]);

  /* ── Charts ── */
  const hourly = useMemo(() => {
    const b = Array.from({ length: 24 }, (_, h) => ({ h, label: hourLabel(h), bikri: 0, bill: 0 }));
    live.forEach((s) => { const h = new Date(s.soldAt).getHours(); b[h].bikri += Number(s.total || 0); b[h].bill += 1; });
    return b;
  }, [live]);
  const peak = useMemo(() => hourly.reduce((b, h) => (h.bikri > b.bikri ? h : b), hourly[0]), [hourly]);
  const hourlyShown = useMemo(() => hourly.filter((h) => h.bikri > 0 || (h.h >= 6 && h.h <= 22)), [hourly]);

  const dayparts = useMemo(() => {
    const m = new Map<string, { bikri: number; bill: number }>(DAYPARTS.map((p) => [p.key, { bikri: 0, bill: 0 }]));
    live.forEach((s) => {
      const e = m.get(daypartOf(new Date(s.soldAt).getHours()).key)!;
      e.bikri += Number(s.total || 0); e.bill += 1;
    });
    const total = [...m.values()].reduce((x, v) => x + v.bikri, 0);
    return DAYPARTS.map((p) => ({ ...p, ...m.get(p.key)!, pct: total > 0 ? (m.get(p.key)!.bikri / total) * 100 : 0 }));
  }, [live]);
  const topPart = useMemo(() => dayparts.reduce((b, p) => (p.bikri > b.bikri ? p : b), dayparts[0]), [dayparts]);

  /* Rozana — khali din bhi dikhein, warna chart jhoot bolta hai */
  const daily = useMemo(() => {
    const start = dateFilter === 'all' && live.length
      ? dayStart(new Date(Math.min(...live.map((s) => new Date(s.soldAt).getTime()))))
      : from;
    const days = Math.min(Math.max(Math.ceil((to.getTime() - start.getTime()) / 86400000), 1), 90);
    const b: Record<string, { name: string; bikri: number; munafa: number; bill: number }> = {};
    for (let i = days - 1; i >= 0; i--) {
      const d = new Date(to); d.setDate(to.getDate() - i);
      b[dayKey(d)] = { name: d.toLocaleDateString('en-PK', days > 14 ? { day: 'numeric', month: 'short' } : { weekday: 'short', day: 'numeric' }), bikri: 0, munafa: 0, bill: 0 };
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
    return [...m.entries()].map(([k, v]) => ({ name: PAY[k]?.label ?? k, value: Math.round(v), hex: PAY[k]?.hex ?? '#94a3b8' }))
      .sort((a, b) => b.value - a.value);
  }, [live]);

  const itemsAgg = useMemo(() => {
    const m = new Map<string, { name: string; qty: number; value: number; made: boolean }>();
    let made = 0, bought = 0;
    live.forEach((s) => (s.items ?? []).forEach((i: any) => {
      const value = Number(i.lineTotal ?? i.total ?? Number(i.unitPrice ?? i.price ?? 0) * Number(i.quantity || 0));
      const isMade = madeIds.has(itemPid(i));
      if (isMade) made += value; else bought += value;
      const k = i.product?.name ?? 'Doosri cheez';
      const e = m.get(k) ?? { name: k, qty: 0, value: 0, made: isMade };
      e.qty += Number(i.quantity || 0); e.value += value;
      m.set(k, e);
    }));
    return {
      top: [...m.values()].sort((a, b) => b.value - a.value).slice(0, 10),
      split: [
        { name: 'Apna banaya', value: Math.round(made), hex: C.made },
        { name: 'Bahar se laya', value: Math.round(bought), hex: C.bought },
      ].filter((x) => x.value > 0),
      madePct: made + bought > 0 ? (made / (made + bought)) * 100 : 0,
    };
  }, [live, madeIds]);

  const topCustomers = useMemo(() => {
    const m = new Map<string, { name: string; phone?: string; total: number; orders: number; credit: number }>();
    live.forEach((s) => {
      if (!s.customer) return;
      const e = m.get(s.customer.id) ?? { name: s.customer.name, phone: s.customer.phone ?? undefined, total: 0, orders: 0, credit: 0 };
      e.total += Number(s.total || 0); e.orders += 1; e.credit += Number(s.creditAmount || 0);
      m.set(s.customer.id, e);
    });
    return [...m.values()].sort((a, b) => b.total - a.total).slice(0, 10);
  }, [live]);

  const showValue = (v: string) => (hideAmounts ? '•••••' : v);
  const hasFilters = !!search || dateFilter !== 'today' || payFilter !== 'all' || creditOnly;
  const clearFilters = () => { setSearch(''); setDateFilter('today'); setPayFilter('all'); setCreditOnly(false); setCustomStart(''); setCustomEnd(''); };

  /* ── Bill scan — mile to seedha wahi bill ── */
  const onScan = (code: string) => {
    setScannerOpen(false);
    const c = code.trim();
    if (!c) return;
    const norm = (x: string) => x.replace(/[^a-z0-9]/gi, '').toLowerCase();
    const hit = sales.find((s) => (s.saleNumber ?? '').toLowerCase() === c.toLowerCase() || norm(s.saleNumber ?? '') === norm(c) || s.id === c);
    if (hit) {
      toast.success(`Bill ${hit.saleNumber} mil gaya`);
      navigate(receiptLink(hit.id, false));
      return;
    }
    setDateFilter('all'); setPayFilter('all'); setCreditOnly(false); setSearch(c); setTab('list');
    toast.error(`"${c}" ka bill nahi mila — sab tareekhon me dhoond rahe hain`);
  };

  /* ── WhatsApp — dono qism ke template alfaz bhar dete hain ── */
  const billWaLink = (s: any) => {
    const items = (s.items ?? []).slice(0, 6).map((it: any) => `• ${it.product?.name ?? 'Cheez'} × ${Number(it.quantity)}`).join('\n');
    const msg = fillTemplate(templates.receipt, {
      shop: tenant?.name ?? 'Bakery',
      customer: s.customer?.name ?? 'Ji',
      invoice: s.saleNumber, bill: s.saleNumber,
      total: formatPKR(s.total),
      paid: formatPKR(s.paidAmount),
      due: formatPKR(s.creditAmount), baqi: Number(s.creditAmount) > 0 ? formatPKR(s.creditAmount) : 'Rs 0',
      date: fmtDT(s.soldAt), tareekh: new Intl.DateTimeFormat('en-PK', { dateStyle: 'medium' }).format(new Date(s.soldAt)),
      phone: (settingsQ.data as any)?.shopPhone || '',
      cheezein: items + ((s.items?.length ?? 0) > 6 ? `\n• +${s.items.length - 6} aur` : ''),
    });
    return waLink(s.customer?.phone, msg);
  };

  /* ── CSV — upar khulasa ── */
  const exportCsv = () => {
    if (filtered.length === 0) return toast.error('Koi bill nahi');
    const head = [
      [`Bakery bikri — ${tenant?.name || 'Nafaa'}`],
      [`Dukaan: ${shopName || 'Sab'}  •  Nikala gaya: ${new Date().toLocaleString('en-PK')}`],
      [`Muddat: ${rangeLabel}  •  Bill: ${stats.count}  •  Kul: ${stats.amount.toFixed(2)}`],
      [`Wasool: ${stats.paid.toFixed(2)}  •  Udhaar: ${stats.credit.toFixed(2)}  •  Munafa: ${stats.profit.toFixed(2)} (${stats.margin.toFixed(1)}%)`],
      [''],
    ];
    const cols = ['Bill', 'Tareekh', 'Waqt', 'Customer', 'Phone', 'Cheezein', 'Qty', 'Tareeqa', 'Discount', 'Total', 'Mila', 'Udhaar', 'Halat'];
    const body = filtered.map((s) => [
      s.saleNumber, new Date(s.soldAt).toLocaleDateString('en-PK'), fmtTime(s.soldAt),
      s.customer?.name ?? 'Walk-in', s.customer?.phone ?? '',
      (s.items ?? []).length,
      (s.items ?? []).reduce((a: number, i: any) => a + Number(i.quantity || 0), 0),
      PAY[s.paymentMethod]?.label ?? s.paymentMethod,
      Number(s.discount || 0).toFixed(2), Number(s.total || 0).toFixed(2),
      Number(s.paidAmount || 0).toFixed(2), Number(s.creditAmount || 0).toFixed(2), s.status,
    ]);
    const esc = (v: any) => `"${String(v ?? '').replace(/"/g, '""')}"`;
    const csv = [...head, cols, ...body].map((r) => r.map(esc).join(',')).join('\n');
    const url = URL.createObjectURL(new Blob(['\ufeff' + csv], { type: 'text/csv;charset=utf-8;' }));
    const a = document.createElement('a'); a.href = url;
    a.download = `bakery-bikri-${dayKey(new Date())}.csv`;
    a.click(); URL.revokeObjectURL(url);
    toast.success(`${filtered.length} bill CSV me`);
  };

  useEffect(() => {
    const onKey = (e: KeyboardEvent) => {
      if (e.key === 'Escape') {
        if (voidTarget) return setVoidTarget(null);
        if (returnTarget) return setReturnTarget(null);
        if (showPrefs) return setShowPrefs(false);
        if (showTeacher) return setShowTeacher(false);
        return;
      }
      if (voidTarget || returnTarget || scannerOpen) return;
      const t = document.activeElement?.tagName;
      if (t === 'INPUT' || t === 'TEXTAREA' || t === 'SELECT') return;
      if (e.metaKey || e.ctrlKey || e.altKey) return;
      const k = e.key.toLowerCase();
      if (e.key === '/') { e.preventDefault(); searchRef.current?.focus(); }
      else if (k === 'a') setTab((x) => (x === 'analytics' ? 'list' : 'analytics'));
      else if (k === 'b') { e.preventDefault(); setScannerOpen(true); }
      else if (k === 'g') setShowTeacher(true);
      else if (k === 'p') window.print();
    };
    window.addEventListener('keydown', onKey);
    return () => window.removeEventListener('keydown', onKey);
  }, [voidTarget, returnTarget, showTeacher, showPrefs, scannerOpen]);

  const heroBtn = 'h-11 w-11 rounded-xl bg-white/15 hover:bg-white/25 border border-white/25 flex items-center justify-center backdrop-blur transition';

  return (
    <div className="space-y-4 sm:space-y-5 pb-10">
      {/* ═══ PRINT HEADER ═══ */}
      <div className="hidden print:block mb-4">
        <h1 className="text-xl font-extrabold">{tenant?.name || 'Bakery'} — Bikri ka record</h1>
        <p className="text-xs text-slate-600">{shopName ? `${shopName} • ` : ''}{rangeLabel} • {new Date().toLocaleString('en-PK', { dateStyle: 'full', timeStyle: 'short' })}</p>
        <p className="text-xs text-slate-600 mt-1">
          {stats.count} bill • Kul {formatPKR(stats.amount)} • Wasool {formatPKR(stats.paid)} • Udhaar {formatPKR(stats.credit)}
          {orderStats.count > 0 && ` • Orders se ${orderStats.count} bill (${formatPKR(orderStats.value)}) shamil`}
        </p>
      </div>

      {/* ═══ HERO ═══ */}
      <section className="relative overflow-hidden rounded-3xl bg-gradient-to-br from-slate-950 via-pink-900 to-fuchsia-700 text-white p-5 sm:p-6 shadow-2xl print:hidden">
        <div className="absolute -top-24 -right-20 h-72 w-72 rounded-full bg-pink-400/25 blur-3xl pointer-events-none" />
        <div className="absolute -bottom-24 -left-20 h-64 w-64 rounded-full bg-amber-300/15 blur-3xl pointer-events-none" />
        <div className="absolute inset-0 opacity-[0.06] pointer-events-none"
          style={{ backgroundImage: 'radial-gradient(circle at 1px 1px, #fff 1px, transparent 0)', backgroundSize: '22px 22px' }} />
        <div className="relative flex items-start justify-between gap-4 flex-wrap">
          <div className="min-w-0">
            <div className="inline-flex items-center gap-2 rounded-full bg-white/15 backdrop-blur px-3 py-1 text-[11px] font-black border border-white/25 uppercase tracking-widest">
              <Receipt className="h-3.5 w-3.5 text-amber-300" /> Bakery · Bikri
            </div>
            <h1 className="mt-3 text-2xl sm:text-3xl lg:text-4xl font-black leading-tight">🧾 Bikri ka Record</h1>
            <p className="mt-1.5 text-xs sm:text-sm font-bold text-white/90">
              {rangeLabel} · <strong className="text-emerald-200">{stats.count}</strong> bill ·{' '}
              <strong>{showValue(formatPKR(stats.amount))}</strong>
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
            <button onClick={() => salesQ.refetch()} disabled={salesQ.isRefetching} title="Taaza" className={`${heroBtn} disabled:opacity-50`}>
              <RefreshCw className={`h-4 w-4 ${salesQ.isRefetching ? 'animate-spin' : ''}`} />
            </button>
            <button onClick={exportCsv} title="CSV" className={heroBtn}><FileSpreadsheet className="h-4 w-4" /></button>
            <button onClick={() => setScannerOpen(true)} title="Bill scan (B)"
              className="h-11 px-3.5 rounded-xl bg-emerald-500 hover:bg-emerald-400 text-white text-xs font-black inline-flex items-center gap-1.5 shadow-lg transition">
              <ScanLine className="h-4 w-4" /> <span className="hidden sm:inline">Bill scan</span>
            </button>
            <button onClick={() => window.print()} title="Print (P)"
              className="h-11 px-3.5 rounded-xl bg-white text-pink-700 hover:bg-pink-50 text-xs font-black inline-flex items-center gap-1.5 shadow-lg transition">
              <Printer className="h-4 w-4" /> Print
            </button>
          </div>
        </div>
      </section>

      {showPrefs && (
        <ReceiptPrefsPopover anchorRef={prefsBtnRef} prefs={prefs} onChange={updatePrefs} onClose={() => setShowPrefs(false)} />
      )}

      {/* ═══ KPI — do qatar, poori raqam ═══ */}
      <section className="grid grid-cols-2 lg:grid-cols-4 gap-3 print:hidden">
        <Kpi icon={Receipt} label="Bill" value={stats.count}
          sub={stats.voided > 0 ? `${stats.voided} void hue` : `${Number(stats.qty.toFixed(1))} cheezein bikin`} tone="blue" />
        <Kpi icon={TrendingUp} label="Kul bikri" value={showValue(formatPKR(stats.amount))} sub={rangeLabel} tone="pink" highlight />
        <Kpi icon={Award} label="Munafa" value={showValue(formatPKR(stats.profit))} sub={`${stats.margin.toFixed(1)}% margin`} tone="violet" />
        <Kpi icon={Banknote} label="Wasool hua" value={showValue(formatPKR(stats.paid))}
          sub={stats.discount > 0 ? `${showValue(formatPKR(stats.discount))} discount diya` : 'Haath me aaya'} tone="emerald" />
      </section>
      <section className="grid grid-cols-2 lg:grid-cols-4 gap-3 print:hidden">
        <Kpi icon={BookOpen} label="Udhaar" value={showValue(formatPKR(stats.credit))}
          sub={`${stats.creditCount} bill par baqi`} tone="amber" onClick={() => setCreditOnly(!creditOnly)} active={creditOnly} />
        <Kpi icon={BarChart3} label="Ausat bill" value={showValue(formatPKR(stats.avg))} sub="Har customer ka" tone="blue" />
        <Kpi icon={Clock} label="Sab se masroof" value={peak?.bill ? peak.label : '—'}
          sub={peak?.bill ? `${peak.bill} bill is ghante` : 'Abhi koi bikri nahi'} tone="violet" />
        <Kpi icon={Trophy} label="Sab se bara bill" value={showValue(formatPKR(stats.best?.total ?? 0))}
          sub={stats.best?.customer?.name ?? (stats.best ? 'Walk-in' : '—')} tone="amber"
          onClick={stats.best ? () => navigate(receiptLink(stats.best.id, false)) : undefined} />
      </section>

      {/* ═══ BAKERY KI KHAAS BAAT ═══ */}
      {(peak?.bikri > 0 || orderStats.count > 0) && (
        <section className="grid sm:grid-cols-2 gap-3 print:hidden">
          {peak?.bikri > 0 && (
            <div className="rounded-3xl bg-gradient-to-br from-amber-50 to-orange-50 dark:from-amber-500/10 dark:to-orange-500/10 border-2 border-amber-200 dark:border-amber-500/30 p-4 flex gap-3">
              <Clock className="h-5 w-5 text-amber-600 shrink-0 mt-0.5" />
              <div className="min-w-0">
                <h3 className="font-black text-amber-900 dark:text-amber-200 text-sm">
                  Sab se masroof: {peak.label} · {topPart.label} ka hissa {topPart.pct.toFixed(0)}%
                </h3>
                <p className="text-[12px] font-bold text-amber-800 dark:text-amber-300 mt-0.5">
                  Is ghante {peak.bill} bill aur {showValue(formatPKR(peak.bikri))} ki bikri. Is se pehle wala batch
                  tayyar hona chahiye — warna rush me maal khatam milta hai.
                </p>
              </div>
            </div>
          )}
          {orderStats.count > 0 && (
            <div className="rounded-3xl bg-gradient-to-br from-pink-50 to-fuchsia-50 dark:from-pink-500/10 dark:to-fuchsia-500/10 border-2 border-pink-200 dark:border-pink-500/30 p-4 flex gap-3">
              <Cake className="h-5 w-5 text-pink-600 shrink-0 mt-0.5" />
              <div className="min-w-0">
                <h3 className="font-black text-pink-900 dark:text-pink-200 text-sm">Orders se bane bill — isi list me</h3>
                <p className="text-[12px] font-bold text-pink-800 dark:text-pink-300 mt-0.5">
                  Is arse me <strong>{orderStats.count}</strong> cake / bare order de kar bill bane —{' '}
                  {showValue(formatPKR(orderStats.value))}. Ye upar ki kul bikri me <strong>shamil</strong> hain; list me 🎂 ka nishan.
                </p>
                <div className="flex gap-3 mt-1">
                  <Link to="/bakery/cake-orders" className="text-[11px] font-black text-pink-700 dark:text-pink-300">Cake orders →</Link>
                  <Link to="/bakery/bulk-orders" className="text-[11px] font-black text-pink-700 dark:text-pink-300">Bare orders →</Link>
                </div>
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
                on ? 'bg-gradient-to-br from-pink-600 to-fuchsia-700 border-transparent text-white shadow-xl shadow-pink-500/30'
                  : 'bg-white dark:bg-slate-900 border-slate-200 dark:border-slate-800 text-slate-600 dark:text-slate-300 hover:border-pink-400 hover:shadow-lg'
              }`}>
              <div className="relative flex items-center gap-3">
                <div className={`h-11 w-11 sm:h-12 sm:w-12 rounded-2xl flex items-center justify-center shrink-0 ${
                  on ? 'bg-white/20' : 'bg-gradient-to-br from-pink-500 to-fuchsia-700 text-white'
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
              placeholder="Bill #, customer, phone, cheez… (/ dabao)"
              className="h-12 w-full rounded-2xl border-2 border-slate-200 dark:border-slate-700 bg-white dark:bg-slate-800 pl-11 pr-10 text-sm font-bold text-slate-900 dark:text-white placeholder:text-slate-400 focus:outline-none focus:border-pink-500 transition" />
            {search && (
              <button onClick={() => setSearch('')} className="absolute right-3 top-1/2 -translate-y-1/2 h-7 w-7 rounded-lg hover:bg-slate-100 dark:hover:bg-slate-700 flex items-center justify-center">
                <X className="h-4 w-4 text-slate-400" />
              </button>
            )}
          </div>

          <div className="relative">
            <button onClick={() => { setShowDate((v) => !v); setShowMore(false); }}
              className={`h-12 px-4 rounded-2xl border-2 text-sm font-black inline-flex items-center gap-2 transition ${
                dateFilter !== 'today' ? 'border-pink-500 bg-pink-50 dark:bg-pink-500/15 text-pink-700 dark:text-pink-300'
                  : 'border-slate-200 dark:border-slate-700 bg-white dark:bg-slate-800 text-slate-700 dark:text-slate-200 hover:border-pink-400'
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
                          dateFilter === v ? 'bg-pink-600 text-white shadow' : 'bg-slate-100 dark:bg-slate-800 text-slate-700 dark:text-slate-300 hover:bg-slate-200 dark:hover:bg-slate-700'
                        }`}>{l}</button>
                    ))}
                  </div>
                  {dateFilter === 'custom' && (
                    <div className="grid grid-cols-2 gap-2 pt-1">
                      {([['Se', customStart, setCustomStart], ['Tak', customEnd, setCustomEnd]] as const).map(([l, v, set]) => (
                        <div key={l}>
                          <label className="text-[10px] font-black uppercase text-slate-500 mb-1 block">{l}</label>
                          <input type="date" value={v} onChange={(e) => set(e.target.value)}
                            className="h-10 w-full rounded-lg border-2 border-slate-200 dark:border-slate-700 bg-white dark:bg-slate-800 px-2 text-xs font-bold text-slate-900 dark:text-white focus:outline-none focus:border-pink-500 [color-scheme:light] dark:[color-scheme:dark]" />
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
                payFilter !== 'all' || creditOnly ? 'border-amber-500 bg-amber-50 dark:bg-amber-500/15 text-amber-700 dark:text-amber-300'
                  : 'border-slate-200 dark:border-slate-700 bg-white dark:bg-slate-800 text-slate-700 dark:text-slate-200 hover:border-amber-400'
              }`}>
              <Filter className="h-4 w-4" /> Chaant
              {(payFilter !== 'all' || creditOnly) && (
                <span className="h-5 w-5 rounded-full bg-amber-600 text-white text-[10px] flex items-center justify-center">
                  {[payFilter !== 'all', creditOnly].filter(Boolean).length}
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
            <span className="px-2 py-1 rounded-lg bg-pink-100 dark:bg-pink-500/20 text-pink-700 dark:text-pink-300">{rangeLabel}</span>
            {payFilter !== 'all' && <span className="px-2 py-1 rounded-lg bg-slate-100 dark:bg-slate-800 text-slate-600 dark:text-slate-300">{PAY[payFilter]?.label}</span>}
            {creditOnly && <span className="px-2 py-1 rounded-lg bg-amber-100 dark:bg-amber-500/20 text-amber-700 dark:text-amber-300">Sirf udhaar</span>}
            {search && <span className="px-2 py-1 rounded-lg bg-slate-100 dark:bg-slate-800 text-slate-600 dark:text-slate-300">"{search}"</span>}
            <span className="text-slate-400">→ {stats.count} bill</span>
          </div>
        )}
      </section>

      {/* ═══════ ANALYTICS ═══════ */}
      {salesQ.isLoading ? (
        <div className="p-2 space-y-2">
          {Array.from({ length: 5 }).map((_, i) => <div key={i} className="h-24 rounded-2xl bg-slate-100 dark:bg-slate-800 animate-pulse" />)}
        </div>
      ) : tab === 'analytics' ? (
        <div className="space-y-4 print:hidden">
          {/* Din ke hisse — bakery ki sab se kaam ki cheez */}
          <section className="grid grid-cols-2 lg:grid-cols-4 gap-3">
            {dayparts.map((p) => {
              const top = p.key === topPart.key && p.bikri > 0;
              return (
                <div key={p.key} className={`rounded-2xl border-2 p-4 ${
                  top ? 'border-pink-400 bg-gradient-to-br from-pink-50 to-fuchsia-50 dark:from-pink-500/15 dark:to-fuchsia-500/10' : 'border-slate-200 dark:border-slate-800 bg-white dark:bg-slate-900'
                }`}>
                  <div className="flex items-center gap-2">
                    <p.icon className={`h-4 w-4 ${top ? 'text-pink-600' : 'text-slate-400'}`} />
                    <span className="text-sm font-black text-slate-900 dark:text-white">{p.label}</span>
                    {top && <span className="ml-auto text-[9px] font-black uppercase px-1.5 py-0.5 rounded-md bg-pink-600 text-white">Rush</span>}
                  </div>
                  <div className="text-[10px] font-bold text-slate-400">{p.range}</div>
                  <div className="mt-2 text-lg font-black text-slate-900 dark:text-white tabular-nums">{showValue(formatPKR(p.bikri))}</div>
                  <div className="text-[11px] font-bold text-slate-500">{p.bill} bill · {p.pct.toFixed(0)}%</div>
                  <div className="mt-2 h-1.5 rounded-full bg-slate-100 dark:bg-slate-800 overflow-hidden">
                    <div className="h-full rounded-full bg-gradient-to-r from-pink-500 to-fuchsia-600" style={{ width: `${p.pct}%` }} />
                  </div>
                </div>
              );
            })}
          </section>

          <Panel icon={TrendingUp} title="Roz ki bikri aur munafa" hint={`${rangeLabel} — khali din bhi nazar aate hain`}>
            {daily.some((d) => d.bikri > 0) ? (
              <div className="h-72">
                <ResponsiveContainer width="100%" height="100%">
                  <ComposedChart data={daily}>
                    <defs>
                      <linearGradient id="bkSale" x1="0" y1="0" x2="0" y2="1">
                        <stop offset="0%" stopColor={C.sale} stopOpacity={0.45} />
                        <stop offset="100%" stopColor={C.sale} stopOpacity={0.02} />
                      </linearGradient>
                    </defs>
                    <CartesianGrid strokeDasharray="3 3" stroke={GRID} vertical={false} />
                    <XAxis dataKey="name" stroke={AXIS} fontSize={10} fontWeight={700} />
                    <YAxis stroke={AXIS} fontSize={11} width={78} tickFormatter={(v) => Number(v).toLocaleString('en-PK')} />
                    <Tooltip contentStyle={TOOLTIP}
                      formatter={(v: any, n: any) => [n === 'bill' ? v : formatPKR(Number(v)), n === 'bikri' ? 'Bikri' : n === 'munafa' ? 'Munafa' : 'Bill']} />
                    <Legend formatter={(v) => (v === 'bikri' ? 'Bikri' : v === 'munafa' ? 'Munafa' : 'Bill')} />
                    <Area type="monotone" dataKey="bikri" stroke={C.sale} strokeWidth={3} fill="url(#bkSale)" />
                    <Line type="monotone" dataKey="munafa" stroke={C.profit} strokeWidth={3} dot={{ r: 3, strokeWidth: 0, fill: C.profit }} />
                  </ComposedChart>
                </ResponsiveContainer>
              </div>
            ) : <EmptyBox text="Is arse me koi bikri nahi" />}
          </Panel>

          <div className="grid lg:grid-cols-2 gap-4">
            <Panel icon={Clock} title="Kis waqt bika — bakery ka rush" hint={peak?.bill ? `Sab se masroof: ${peak.label}` : 'Batch isi hisab se lagta hai'}>
              {hourly.some((h) => h.bikri > 0) ? (
                <>
                  <div className="h-64">
                    <ResponsiveContainer width="100%" height="100%">
                      <BarChart data={hourlyShown}>
                        <CartesianGrid strokeDasharray="3 3" stroke={GRID} vertical={false} />
                        <XAxis dataKey="label" stroke={AXIS} fontSize={9} interval={1} />
                        <YAxis stroke={AXIS} fontSize={11} width={70} tickFormatter={(v) => Number(v).toLocaleString('en-PK')} />
                        <Tooltip contentStyle={TOOLTIP} formatter={(v: any) => [formatPKR(Number(v)), 'Bikri']} />
                        <Bar dataKey="bikri" radius={[6, 6, 0, 0]}>
                          {hourlyShown.map((h, i) => <Cell key={i} fill={h.h === peak?.h ? C.peak : C.hours} />)}
                        </Bar>
                      </BarChart>
                    </ResponsiveContainer>
                  </div>
                  <p className="text-[11px] font-bold text-slate-500 dark:text-slate-400 mt-2">
                    Gulabi column sab se masroof ghanta hai — us se ek do ghante pehle taaza batch nikal lein.
                  </p>
                </>
              ) : <EmptyBox text="Is arse me koi bikri nahi" />}
            </Panel>

            <Panel icon={ChefHat} title="Apna banaya vs bahar ka" hint="Paisa kahan se aata hai">
              {itemsAgg.split.length > 0 ? (
                <>
                  <div className="h-52">
                    <ResponsiveContainer width="100%" height="100%">
                      <PieChart>
                        <Pie data={itemsAgg.split} dataKey="value" nameKey="name" innerRadius={52} outerRadius={82} paddingAngle={4} stroke="none">
                          {itemsAgg.split.map((d, i) => <Cell key={i} fill={d.hex} />)}
                        </Pie>
                        <Tooltip contentStyle={TOOLTIP} formatter={(v: any) => formatPKR(Number(v))} />
                        <Legend />
                      </PieChart>
                    </ResponsiveContainer>
                  </div>
                  <p className="text-[11px] font-bold text-slate-500 dark:text-slate-400 mt-1">
                    Bikri ka <strong className="text-pink-600">{itemsAgg.madePct.toFixed(0)}%</strong> apne tanur ka hai.
                    {itemsAgg.madePct < 40 && ' Bahar ka maal kam munafe wala hota hai — apna maal aage rakhein.'}
                  </p>
                </>
              ) : <EmptyBox />}
            </Panel>
          </div>

          <div className="grid lg:grid-cols-2 gap-4">
            <Panel icon={Package} title="Sab se zyada kya bika" hint="Kamai ke hisab se">
              {itemsAgg.top.length === 0 ? <EmptyBox /> : (
                <div className="space-y-2">
                  {itemsAgg.top.map((p, i) => {
                    const pct = itemsAgg.top[0].value > 0 ? (p.value / itemsAgg.top[0].value) * 100 : 0;
                    return (
                      <div key={p.name} className="rounded-2xl bg-slate-50 dark:bg-slate-800/60 p-3">
                        <div className="flex items-center gap-2.5 mb-1.5">
                          <span className={`h-7 w-7 rounded-xl flex items-center justify-center text-[11px] font-black shrink-0 ${
                            i === 0 ? 'bg-gradient-to-br from-amber-400 to-orange-600 text-white' : 'bg-slate-200 dark:bg-slate-700 text-slate-600 dark:text-slate-300'
                          }`}>{i === 0 ? '🏆' : i + 1}</span>
                          <span className="font-black text-sm text-slate-900 dark:text-white truncate flex-1">{p.made ? '🧁 ' : ''}{p.name}</span>
                          <span className="text-[11px] font-bold text-slate-400 shrink-0 tabular-nums">{Number(p.qty.toFixed(1))} bike</span>
                          <span className="text-sm font-black text-slate-900 dark:text-white tabular-nums shrink-0">{showValue(formatPKR(p.value))}</span>
                        </div>
                        <div className="h-1.5 rounded-full bg-slate-200 dark:bg-slate-700 overflow-hidden">
                          <div className="h-full rounded-full bg-gradient-to-r from-pink-500 to-fuchsia-600" style={{ width: `${Math.min(pct, 100)}%` }} />
                        </div>
                      </div>
                    );
                  })}
                </div>
              )}
            </Panel>

            <Panel icon={User} title="Sab se qeemti customer" hint="Hotel, canteen, roz ke gahak">
              {topCustomers.length === 0 ? <EmptyBox text="Is arse me kisi bill par customer darj nahi" /> : (
                <div className="space-y-1.5">
                  {topCustomers.map((c, i) => (
                    <div key={c.name + i} className="flex items-center gap-3 rounded-2xl bg-slate-50 dark:bg-slate-800/60 p-2.5">
                      <span className={`h-9 w-9 rounded-2xl flex items-center justify-center text-xs font-black shrink-0 ${
                        i === 0 ? 'bg-gradient-to-br from-amber-400 to-orange-600 text-white' : 'bg-slate-200 dark:bg-slate-700 text-slate-600 dark:text-slate-300'
                      }`}>{i === 0 ? '👑' : i + 1}</span>
                      <div className="min-w-0 flex-1">
                        <div className="font-black text-sm text-slate-900 dark:text-white truncate">{c.name}</div>
                        <div className="text-[11px] font-bold text-slate-500">{c.orders} bill{c.phone ? ` · ${c.phone}` : ''}</div>
                      </div>
                      <div className="text-right shrink-0">
                        <div className="text-sm font-black text-slate-900 dark:text-white tabular-nums">{showValue(formatPKR(c.total))}</div>
                        {c.credit > 0 && <div className="text-[10px] font-black text-amber-600 tabular-nums">{showValue(formatPKR(c.credit))} udhaar</div>}
                      </div>
                    </div>
                  ))}
                </div>
              )}
            </Panel>
          </div>

          <div className="grid lg:grid-cols-2 gap-4">
            <Panel icon={CalendarDays} title="Hafte ka kaun sa din behtar" hint="Juma aur Itwar ko zyada banana hai ya nahi">
              <div className="h-56">
                <ResponsiveContainer width="100%" height="100%">
                  <BarChart data={weekday}>
                    <CartesianGrid strokeDasharray="3 3" stroke={GRID} vertical={false} />
                    <XAxis dataKey="label" stroke={AXIS} fontSize={11} fontWeight={700} />
                    <YAxis stroke={AXIS} fontSize={11} width={78} tickFormatter={(v) => Number(v).toLocaleString('en-PK')} />
                    <Tooltip contentStyle={TOOLTIP} formatter={(v: any) => [formatPKR(Number(v)), 'Bikri']} />
                    <Bar dataKey="bikri" fill={C.weekday} radius={[8, 8, 0, 0]} maxBarSize={60} />
                  </BarChart>
                </ResponsiveContainer>
              </div>
            </Panel>

            <Panel icon={Banknote} title="Paisa kaise aaya" hint="Cash, card ya wallet">
              {payPie.length === 0 ? <EmptyBox /> : (
                <>
                  <div className="h-48">
                    <ResponsiveContainer width="100%" height="100%">
                      <PieChart>
                        <Pie data={payPie} dataKey="value" nameKey="name" innerRadius={48} outerRadius={78} paddingAngle={4} stroke="none">
                          {payPie.map((p, i) => <Cell key={i} fill={p.hex} />)}
                        </Pie>
                        <Tooltip contentStyle={TOOLTIP} formatter={(v: any) => formatPKR(Number(v))} />
                      </PieChart>
                    </ResponsiveContainer>
                  </div>
                  <div className="grid grid-cols-2 gap-1.5 mt-1">
                    {payPie.map((p) => (
                      <div key={p.name} className="rounded-xl bg-slate-50 dark:bg-slate-800/60 p-2 flex items-center justify-between">
                        <span className="text-[11px] font-black text-slate-600 dark:text-slate-300">{p.name}</span>
                        <span className="text-xs font-black tabular-nums" style={{ color: p.hex }}>{showValue(formatPKR(p.value))}</span>
                      </div>
                    ))}
                  </div>
                </>
              )}
            </Panel>
          </div>
        </div>
      ) : filtered.length === 0 ? (
        /* ═══════ KHALI ═══════ */
        <div className="rounded-3xl bg-white dark:bg-slate-900 border-4 border-dashed border-slate-200 dark:border-slate-700 p-10 sm:p-14 text-center">
          <Receipt className="h-12 w-12 text-slate-400 mx-auto" />
          <p className="mt-4 font-black text-slate-800 dark:text-slate-100 text-lg sm:text-xl">
            {hasFilters && (search || payFilter !== 'all' || creditOnly) ? 'Koi bill nahi mila' : `${rangeLabel} me koi bikri nahi`}
          </p>
          <p className="text-xs sm:text-sm text-slate-500 dark:text-slate-400 font-bold mt-1.5">
            {search ? `"${search}" se kuch nahi mila` : 'Counter par pehli bikri karein'}
          </p>
          <div className="mt-4 flex gap-2 justify-center flex-wrap">
            {hasFilters && <Button variant="secondary" onClick={clearFilters}><X className="h-4 w-4" /> Chaant hatao</Button>}
            <Link to="/pos" className="h-11 px-4 rounded-xl bg-pink-600 hover:bg-pink-700 text-white text-sm font-black inline-flex items-center gap-2 transition">
              <Receipt className="h-4 w-4" /> Counter kholein
            </Link>
          </div>
        </div>
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
              return (
                <div key={s.id}
                  className={`relative px-4 sm:px-5 py-4 transition group avoid-break ${
                    voided ? 'opacity-60 bg-rose-50/40 dark:bg-rose-500/5' : 'hover:bg-pink-50/40 dark:hover:bg-pink-500/5'
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
                          {isOrderSale(s) && <span className="text-[9px] font-black uppercase px-1.5 py-0.5 rounded-md bg-fuchsia-600 text-white">🎂 Order</span>}
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
                          <span className="text-pink-600 dark:text-pink-400">{ago(s.soldAt)}</span>
                        </div>
                        <div className="mt-2 flex flex-wrap gap-1">
                          {(s.items ?? []).slice(0, 4).map((it: any, n: number) => (
                            <span key={it.id ?? n}
                              className="px-1.5 py-0.5 rounded text-[10px] font-bold bg-slate-100 dark:bg-slate-800 text-slate-600 dark:text-slate-300 max-w-[180px] truncate">
                              {madeIds.has(itemPid(it)) ? '🧁 ' : ''}{it.product?.name} × {Number(Number(it.quantity).toFixed(2))}
                            </span>
                          ))}
                          {(s.items?.length ?? 0) > 4 && (
                            <span className="px-1.5 py-0.5 rounded text-[10px] font-bold bg-slate-100 dark:bg-slate-800 text-slate-500">+{s.items.length - 4} aur</span>
                          )}
                        </div>
                      </div>
                    </div>

                    <div className="text-right shrink-0">
                      <div className={`text-xl sm:text-2xl font-black tabular-nums ${voided ? 'text-slate-400 line-through' : 'text-pink-700 dark:text-pink-400'}`}>
                        {showValue(formatPKR(s.total))}
                      </div>
                      {Number(s.changeAmount) > 0 && !voided && (
                        <div className="text-[10px] font-black text-emerald-700 dark:text-emerald-400 tabular-nums">Wapis diya: {showValue(formatPKR(s.changeAmount))}</div>
                      )}
                      {credit && !voided && (
                        <div className="text-[10px] font-black text-amber-600 tabular-nums">{showValue(formatPKR(s.creditAmount))} baqi</div>
                      )}
                    </div>
                  </div>

                  {/* Kaam ke button — line ke upar, click unhi par ruke */}
                  <div className="mt-2.5 flex items-center gap-1.5 flex-wrap print:hidden">
                    <Link to={receiptLink(s.id, false)}
                      className="relative z-10 h-9 px-3 rounded-xl bg-pink-600 hover:bg-pink-700 text-white text-[11px] font-black inline-flex items-center gap-1.5 transition">
                      <Eye className="h-3.5 w-3.5" /> Bill dekhein
                    </Link>
                    <Link to={receiptLink(s.id, true)} title="Seedha print"
                      className="relative z-10 h-9 px-3 rounded-xl bg-slate-100 dark:bg-slate-800 hover:bg-pink-100 dark:hover:bg-pink-500/20 text-slate-700 dark:text-slate-200 text-[11px] font-black inline-flex items-center gap-1.5 transition">
                      <Printer className="h-3.5 w-3.5" /> Print
                    </Link>
                    {wa && (
                      <a href={wa} target="_blank" rel="noreferrer" title={`${s.customer?.name} ko WhatsApp par bill bhejein`}
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
              className="w-full py-4 text-xs font-black text-pink-700 dark:text-pink-400 hover:bg-pink-50 dark:hover:bg-pink-500/10 border-t-2 border-slate-100 dark:border-slate-800 inline-flex items-center justify-center gap-1 transition print:hidden">
              Aur {Math.min(50, filtered.length - visible)} dikhayein <ArrowRight className="h-3 w-3" />
              <span className="text-slate-400 ml-1">({visible}/{filtered.length})</span>
            </button>
          )}
        </section>
      )}

      {scannerOpen && (
        <BarcodeScanner onDetected={onScan} onClose={() => setScannerOpen(false)}
          title="Bill scan karein" hint="Purane bill ka barcode camera ke samne rakhein" />
      )}

      {returnTarget && (
        <ReturnModal sale={returnTarget} onClose={() => setReturnTarget(null)}
          onDone={() => {
            setReturnTarget(null);
            ['sales-list', 'products', 'bakery-all-products', 'customers'].forEach((k) => qc.invalidateQueries({ queryKey: [k] }));
          }} />
      )}

      {voidTarget && (
        <VoidModal sale={voidTarget} pending={voidMut.isPending}
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

/* ═══ RECEIPT KI PASAND — portal, taake hero ke overflow me na kate ═══ */
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

  const seg = (on: boolean) => `h-9 rounded-lg text-[11px] font-black transition ${on ? 'bg-pink-600 text-white' : 'bg-slate-100 dark:bg-slate-800 text-slate-600 dark:text-slate-300'}`;

  return createPortal(
    <>
      <div className="fixed inset-0 z-[70] print:hidden" onClick={onClose} />
      <div style={{ top: pos.top, right: pos.right }}
        className="fixed z-[71] w-64 rounded-2xl bg-white dark:bg-slate-900 border-2 border-slate-200 dark:border-slate-700 shadow-2xl p-3 space-y-3 text-slate-900 dark:text-white print:hidden">
        <div className="text-[10px] font-black uppercase tracking-widest text-slate-500">Receipt ki settings</div>
        <div>
          <div className="text-[10px] font-black uppercase text-slate-500 mb-1">Kaghaz</div>
          <div className="grid grid-cols-2 gap-1.5">
            {(['58', '80'] as const).map((w) => <button key={w} onClick={() => onChange({ paperWidth: w })} className={seg(prefs.paperWidth === w)}>{w}mm</button>)}
          </div>
        </div>
        <div>
          <div className="text-[10px] font-black uppercase text-slate-500 mb-1">Tafseel</div>
          <div className="grid grid-cols-2 gap-1.5">
            {([['short', 'Chhota'], ['full', 'Poora']] as const).map(([m, l]) => <button key={m} onClick={() => onChange({ mode: m })} className={seg(prefs.mode === m)}>{l}</button>)}
          </div>
        </div>
        <label className="flex items-center gap-2 cursor-pointer">
          <input type="checkbox" checked={prefs.autoPrint} onChange={(e) => onChange({ autoPrint: e.target.checked })} className="h-4 w-4 rounded accent-pink-600" />
          <span className="text-[11px] font-black">Bill kholte hi print</span>
        </label>
        <label className="flex items-center gap-2 cursor-pointer">
          <input type="checkbox" checked={prefs.showLogo} onChange={(e) => onChange({ showLogo: e.target.checked })} className="h-4 w-4 rounded accent-pink-600" />
          <span className="text-[11px] font-black">Logo dikhayein</span>
        </label>
        <p className="text-[10px] font-bold text-slate-400">"Print" button hamesha seedha print karta hai.</p>
      </div>
    </>,
    document.body,
  );
}

/* ═══ VOID — wajah zaroori ═══ */
function VoidModal({ sale, pending, onClose, onConfirm }: any) {
  const [reason, setReason] = useState('');
  const quick = ['Ghalti se bana', 'Demo bill', 'Customer ne liya hi nahi', 'Double bill ban gaya'];
  return (
    <div className="fixed inset-0 z-50 bg-black/60 backdrop-blur-sm flex items-end sm:items-center justify-center p-3" onClick={onClose}>
      <div className="w-full max-w-sm rounded-3xl bg-white dark:bg-slate-900 border-2 border-rose-300 dark:border-rose-500/40 shadow-2xl p-5" onClick={(e) => e.stopPropagation()}>
        <div className="h-12 w-12 rounded-2xl bg-rose-100 dark:bg-rose-500/20 flex items-center justify-center mx-auto">
          <Trash2 className="h-6 w-6 text-rose-600" />
        </div>
        <h3 className="mt-3 text-center font-black text-slate-900 dark:text-white text-lg">Bill void karein?</h3>
        <p className="mt-1 text-center text-sm font-bold text-slate-500 dark:text-slate-400">
          <strong>{sale.saleNumber}</strong> — {formatPKR(sale.total)} · {fmtDT(sale.soldAt)}
        </p>
        <div className="mt-3 rounded-2xl bg-amber-50 dark:bg-amber-500/10 border-2 border-amber-200 dark:border-amber-500/30 p-3 flex gap-2">
          <AlertTriangle className="h-4 w-4 text-amber-600 shrink-0 mt-0.5" />
          <p className="text-[11px] font-bold text-amber-900 dark:text-amber-200">
            Void ka matlab: <strong>ye bikri hui hi nahi thi</strong> — stock wapas aa jayega, udhaar khate se hat
            jayega aur report se nikal jayegi. Bill mitta nahi, us par "Void" lag jata hai. Agar customer ne cheez
            asal me wapas ki hai to <strong>"Wapsi"</strong> istemal karein, void nahi.
          </p>
        </div>
        <div className="mt-3 flex flex-wrap gap-1.5">
          {quick.map((r) => (
            <button key={r} onClick={() => setReason(r)}
              className={`h-8 px-2.5 rounded-lg text-[11px] font-black transition ${reason === r ? 'bg-rose-600 text-white' : 'bg-slate-100 dark:bg-slate-800 text-slate-600 dark:text-slate-300'}`}>{r}</button>
          ))}
        </div>
        <input value={reason} onChange={(e) => setReason(e.target.value)} autoFocus
          onKeyDown={(e) => { if (e.key === 'Enter' && reason.trim() && !pending) onConfirm(reason.trim()); }}
          placeholder="Wajah likhein…"
          className="mt-2 h-11 w-full rounded-xl border-2 border-slate-200 dark:border-slate-700 bg-white dark:bg-slate-800 px-3 text-sm font-bold text-slate-900 dark:text-white focus:outline-none focus:border-rose-500" />
        <div className="mt-4 flex gap-2">
          <Button variant="secondary" className="flex-1" onClick={onClose}>Rehne dein</Button>
          <Button className="flex-[2] bg-rose-600 hover:bg-rose-700" disabled={!reason.trim() || pending}
            loading={pending} onClick={() => onConfirm(reason.trim())}>Haan, void karein</Button>
        </div>
      </div>
    </div>
  );
}

/* ═══ CHHOTE HISSE ═══ */
function Kpi({ icon: Icon, label, value, sub, tone, onClick, active, highlight }: any) {
  const tones: Record<string, string> = {
    emerald: 'from-emerald-500 to-green-600 shadow-emerald-500/40',
    blue: 'from-blue-500 to-blue-700 shadow-blue-500/40',
    violet: 'from-violet-500 to-purple-600 shadow-violet-500/40',
    amber: 'from-amber-500 to-orange-600 shadow-amber-500/40',
    pink: 'from-pink-500 to-fuchsia-600 shadow-pink-500/40',
  };
  const Comp: any = onClick ? 'button' : 'div';
  return (
    <Comp onClick={onClick}
      className={[
        'rounded-2xl border-2 p-4 shadow-sm text-left w-full transition-all',
        onClick ? 'hover:-translate-y-0.5 hover:shadow-md cursor-pointer' : '',
        active ? 'border-amber-500 ring-2 ring-amber-200 dark:ring-amber-500/20 bg-amber-50 dark:bg-amber-500/10'
          : highlight ? 'bg-gradient-to-br from-pink-50 to-fuchsia-50 dark:from-pink-500/10 dark:to-fuchsia-500/10 border-pink-300 dark:border-pink-500/40'
          : 'bg-white dark:bg-slate-900 border-slate-200 dark:border-slate-800',
      ].join(' ')}>
      <div className="flex items-start justify-between gap-2">
        <div className="min-w-0 flex-1">
          <div className="text-[10px] uppercase tracking-[0.15em] text-slate-500 dark:text-slate-400 font-black">{label}</div>
          <div className="mt-2 text-lg sm:text-xl lg:text-2xl font-black text-slate-900 dark:text-white tabular-nums break-words leading-tight">{value}</div>
          {sub && <div className="text-[10px] sm:text-[11px] font-bold text-slate-500 dark:text-slate-400 mt-1.5 line-clamp-2">{sub}</div>}
        </div>
        <div className={`h-11 w-11 rounded-2xl bg-gradient-to-br ${tones[tone]} text-white flex items-center justify-center shadow-lg shrink-0`}>
          <Icon className="h-5 w-5" />
        </div>
      </div>
    </Comp>
  );
}

function Panel({ icon: Icon, title, hint, children }: { icon: any; title: string; hint?: string; children: React.ReactNode }) {
  return (
    <section className="rounded-3xl bg-white dark:bg-slate-900 border-2 border-slate-200 dark:border-slate-800 shadow-sm p-4 sm:p-5">
      <div className="flex items-center gap-3 mb-4">
        <div className="h-11 w-11 rounded-2xl bg-gradient-to-br from-pink-500 to-fuchsia-600 text-white flex items-center justify-center shadow-lg shrink-0">
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

function EmptyBox({ text }: { text?: string }) {
  return <div className="h-48 flex items-center justify-center"><p className="text-sm font-bold text-slate-400 text-center px-4">{text ?? 'Abhi dikhane ko kuch nahi'}</p></div>;
}

function Teacher({ onClose }: { onClose: () => void }) {
  return (
    <div className="fixed inset-0 z-50 bg-black/60 backdrop-blur-sm flex items-end sm:items-center justify-center p-3" onClick={onClose}>
      <div className="w-full max-w-lg max-h-[90vh] overflow-y-auto rounded-3xl bg-white dark:bg-slate-900 border-2 border-pink-300 dark:border-pink-500/40 shadow-2xl" onClick={(e) => e.stopPropagation()}>
        <div className="px-5 py-3 border-b-2 border-pink-200 dark:border-pink-500/30 bg-gradient-to-r from-pink-50 to-fuchsia-50 dark:from-pink-500/15 dark:to-fuchsia-500/15 flex items-center justify-between sticky top-0 z-10">
          <h3 className="font-extrabold text-pink-900 dark:text-pink-200 flex items-center gap-2"><GraduationCap className="h-5 w-5" /> Bikri ka safha</h3>
          <button onClick={onClose} className="h-8 w-8 rounded-lg hover:bg-white dark:hover:bg-slate-800 flex items-center justify-center">
            <X className="h-4 w-4 text-slate-600 dark:text-slate-300" />
          </button>
        </div>
        <div className="p-5 space-y-3 text-sm">
          <Tip icon={ScanLine} title="Purana bill dhoondna">
            Customer purana bill le kar aaye to <strong>B</strong> dabayein aur barcode scan karein — wahi bill foran khul jata hai.
          </Tip>
          <Tip icon={Undo2} title="Wapsi aur Void — alag cheezein">
            <strong>Wapsi</strong>: customer ne cheez asal me wapas ki, paisa golak se gaya.
            <strong> Void</strong>: bill banna hi nahi chahiye tha (demo ya ghalti) — wajah likhna zaroori hai.
          </Tip>
          <Tip icon={Settings2} title="Receipt ki settings">
            Kaghaz 58/80mm, chhota ya poora bill, "kholte hi print" aur logo — ek dafa chunein, har bill par lagta hai.
            Har line ka <strong>Print</strong> button seedha thermal par nikalta hai.
          </Tip>
          <Tip icon={Sunrise} title="Subah / Dopahar / Shaam">
            Analytics me dekhein din ke kis hisse me sab se zyada bikta hai — us se <strong>pehle</strong> batch tayyar ho.
          </Tip>
          <Tip icon={ChefHat} title="Apna banaya vs bahar ka">
            🧁 wali cheezein apne tanur ki hain. Un ka hissa jitna zyada, munafa utna behtar.
          </Tip>
          <Tip icon={Cake} title="Cake aur bare orders">
            Order "De diya" hote hi us ka asli bill banta hai aur isi list me aata hai (🎂 Order ka nishan) — stock bhi
            ghatta hai aur baqi paisa khate me jata hai.
          </Tip>
          <div className="rounded-2xl bg-slate-50 dark:bg-slate-800 p-3">
            <div className="text-[10px] font-black uppercase tracking-widest text-slate-500 mb-2">Shortcuts</div>
            <div className="grid grid-cols-2 gap-1.5 text-[11px] font-bold text-slate-600 dark:text-slate-300">
              <div><kbd className="px-1.5 py-0.5 rounded bg-white dark:bg-slate-900 border">B</kbd> bill scan</div>
              <div><kbd className="px-1.5 py-0.5 rounded bg-white dark:bg-slate-900 border">A</kbd> analytics</div>
              <div><kbd className="px-1.5 py-0.5 rounded bg-white dark:bg-slate-900 border">/</kbd> dhoondo</div>
              <div><kbd className="px-1.5 py-0.5 rounded bg-white dark:bg-slate-900 border">P</kbd> print</div>
            </div>
          </div>
          <Button className="w-full" onClick={onClose}>Samajh gaya</Button>
        </div>
      </div>
    </div>
  );
}

function Tip({ icon: Icon, title, children }: any) {
  return (
    <div className="flex gap-2.5">
      <div className="h-8 w-8 rounded-xl bg-pink-100 dark:bg-pink-500/20 flex items-center justify-center shrink-0">
        <Icon className="h-4 w-4 text-pink-600 dark:text-pink-400" />
      </div>
      <div className="min-w-0">
        <div className="font-extrabold text-slate-900 dark:text-white text-[13px]">{title}</div>
        <p className="text-[12px] font-semibold text-slate-600 dark:text-slate-300 leading-snug">{children}</p>
      </div>
    </div>
  );
}
