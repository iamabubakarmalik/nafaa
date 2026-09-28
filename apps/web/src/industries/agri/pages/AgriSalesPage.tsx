import { useMemo, useState, useEffect, useRef } from 'react';
import { createPortal } from 'react-dom';
import { Link, useNavigate } from 'react-router-dom';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import {
  Receipt, TrendingUp, Search, X, RefreshCw, Package, User, Clock,
  Banknote, CreditCard, Smartphone, Building2, Zap, Award, BarChart3,
  ChevronDown, GraduationCap, Printer, FileSpreadsheet, ScanLine,
  MessageCircle, Undo2, Trash2, AlertTriangle, Settings2, Check,
  Wheat, Sprout, FlaskConical, Bug, Tractor, Calendar, Wallet,
  Layers, Scale, ArrowRight, Sunrise, Sun, Sunset, Moon,
} from 'lucide-react';
import {
  ResponsiveContainer, BarChart, Bar, XAxis, YAxis, Tooltip, CartesianGrid,
  PieChart, Pie, Cell, Legend, ComposedChart, Area, Line,
} from 'recharts';
import { toast } from 'sonner';
import { salesApi, type PaymentMethod } from '@modules/sales/sales/api/sales.api';
import BarcodeScanner from '@core/components/barcode/BarcodeScanner';
import { ReturnModal } from '@industries/retail/components/ReturnModal';
import { resolveTemplates, fillTemplate, waLink } from '@core/lib/whatsapp/templates';
import { settingsApi } from '@modules/organization/settings/api/settings.api';
import { formatPKR } from '@core/lib/format';
import { Button } from '@core/ui/Button';
import { useAuthStore } from '@core/stores/auth.store';
import { PrivacyToggle, useCostHidden } from '@/core/security/HiddenValue';
import { agriProductsApi, type AgriProductProfile } from '../api/products.api';
import { isMeasured, agriUnitLabel, SEASONS } from '../lib/agriUnits';
import {
  deriveAgriKind, prettyAgriKind, AGRI_KIND_EMOJI,
  isSeedKind, isFertKind, isSprayKind, isFeedKind, isToolKind, type AgriKind,
} from '../lib/agriCategory';

/* ═════════════════════════════════════════════════════════════
   AGRI BIKRI — DIN KA POORA RECORD  (Retail/Bakery jaisa, poora)
   ─────────────────────────────────────────────────────────────
   Retail se:
     ⚙️ Receipt settings (58/80mm, chhota/poora, kholte hi print)
     🖨️ Har bill par seedha Print • poori line par click = bill
     🧾 Cheezon ki chip, waqt + "kitni der pehle", void aur wapsi
     📊 KPI, rozana rujhan, hafte ka din, qeemti farmer, kya bika
     🔎 Bill scan → seedha wahi bill • CSV ke upar khulasa
   Agri ki apni:
     💰 UDHAAR sab se pehle — agri me aadha sarmaya bahar para hota
        hai. Kitna gaya, kis farmer ke paas, kitne din se.
     🌦️ MAUSAM — Kharif ka paisa Rabi se alag ginna parta hai,
        warna agle season ki kharidari andaze par hoti hai.
     🌱 QISM — beej / khaad / dawa / feed / auzaar. Margin in me
        bohat alag hota hai, is liye "kul bikri" se kaam nahi chalta.
     🌾 FASAL — kis fasal ka maal bika, taake agli dafa wohi rakha jaye.
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

const KINDS: Array<{ v: string; l: string; e: string; hex: string; test: (k: AgriKind) => boolean }> = [
  { v: 'seed', l: 'Beej', e: '🌱', hex: '#84cc16', test: isSeedKind },
  { v: 'fert', l: 'Khaad', e: '🧪', hex: '#10b981', test: isFertKind },
  { v: 'spray', l: 'Dawa', e: '🐛', hex: '#ef4444', test: isSprayKind },
  { v: 'feed', l: 'Feed', e: '🐄', hex: '#f59e0b', test: isFeedKind },
  { v: 'tool', l: 'Auzaar', e: '🔧', hex: '#64748b', test: isToolKind },
];

/* Dono theme me saaf nazar aane wale chart ke rang */
const AXIS = '#94a3b8';
const GRID = 'rgba(148,163,184,0.25)';
const TOOLTIP = {
  borderRadius: 14, border: 'none', backgroundColor: 'rgba(15,23,42,0.96)', color: '#f8fafc',
  fontWeight: 700, fontSize: 12, boxShadow: '0 12px 32px rgba(15,23,42,.28)', padding: '10px 12px',
};
const C = { sale: '#10b981', profit: '#84cc16', credit: '#f59e0b', weekday: '#8b5cf6' };

/* ── Receipt ki pasand — AgriReceiptPage isi chaabi se parhta hai ── */
const RECEIPT_PREFS_KEY = 'nafaa.receipt.prefs';
interface ReceiptPrefs { paperWidth: '58' | '80'; mode: 'short' | 'full'; autoPrint: boolean; showLogo: boolean }
const DEFAULT_PREFS: ReceiptPrefs = { paperWidth: '80', mode: 'short', autoPrint: false, showLogo: true };
function getPrefs(): ReceiptPrefs {
  try {
    const p = JSON.parse(localStorage.getItem(RECEIPT_PREFS_KEY) || 'null');
    return p ? { ...DEFAULT_PREFS, ...p } : DEFAULT_PREFS;
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
const fmtQty = (q: number) => Number(q || 0).toFixed(Number(q || 0) % 1 === 0 ? 0 : 2);

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

/** Agri ke din ke hisse — farmer subah aata hai, dopahar khet me */
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

export default function AgriSalesPage() {
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
  const [kindFilter, setKindFilter] = useState('all');
  const [showDate, setShowDate] = useState(false);
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
    queryKey: ['agri-profiles-all'],
    queryFn: () => agriProductsApi.list({}).catch(() => [] as AgriProductProfile[]),
    staleTime: 5 * 60_000,
  });

  const templates = useMemo(() => {
    const d: any = settingsQ.data;
    return resolveTemplates(d?.settings?.whatsappTemplates ?? d?.whatsappTemplates);
  }, [settingsQ.data]);

  /** Har product ki agri tafseel — qism, mausam, fasal, bori ka hisab */
  const infoBy = useMemo(() => {
    const m = new Map<string, {
      kind: AgriKind; group: string; season?: string | null;
      crops: string[]; packSize: number; packUnit: string;
    }>();
    (profilesQ.data ?? []).forEach((p: any) => {
      if (!p.productId) return;
      const k = (p.category as AgriKind) ?? 'OTHER';
      const g = KINDS.find((x) => x.test(k))?.v ?? 'tool';
      m.set(p.productId, {
        kind: k, group: g, season: p.season ?? null,
        crops: p.targetCrops ?? [],
        packSize: Number(p.packSize || 0),
        packUnit: String(p.packUnit || 'kg'),
      });
    });
    return m;
  }, [profilesQ.data]);

  /** Jo product profile me na ho, us ka naam se andaza */
  const infoOf = (i: any) => {
    const hit = infoBy.get(itemPid(i));
    if (hit) return hit;
    const k = deriveAgriKind(i.product?.category?.name, i.product?.name);
    return {
      kind: k, group: KINDS.find((x) => x.test(k))?.v ?? 'tool',
      season: null, crops: [] as string[], packSize: 0, packUnit: 'kg',
    };
  };

  const voidMut = useMutation({
    mutationFn: ({ id, reason }: { id: string; reason: string }) => salesApi.voidSale(id, reason),
    onSuccess: () => {
      toast.success('Bill void ho gaya — stock wapas aa gaya');
      setVoidTarget(null);
      ['sales-list', 'sales-summary', 'products', 'agri-all-products', 'products-for-agri-pos', 'customers', 'customers-for-pos']
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

  useEffect(() => { setVisible(50); }, [dateFilter, customStart, customEnd, payFilter, creditOnly, kindFilter, search]);

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
    if (kindFilter !== 'all') {
      out = out.filter((s) => (s.items ?? []).some((i: any) => infoOf(i).group === kindFilter));
    }
    if (q) out = out.filter((s) =>
      (s.saleNumber ?? '').toLowerCase().includes(q) ||
      (s.customer?.name ?? '').toLowerCase().includes(q) ||
      (s.customer?.phone ?? '').toLowerCase().includes(q) ||
      (s.note ?? '').toLowerCase().includes(q) ||
      (s.items ?? []).some((i: any) =>
        (i.product?.name ?? '').toLowerCase().includes(q) ||
        (i.product?.barcode ?? '').toLowerCase().includes(q) ||
        infoOf(i).crops.some((c) => c.toLowerCase().includes(q))));
    return [...out].sort((a, b) => new Date(b.soldAt).getTime() - new Date(a.soldAt).getTime());
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [inRange, payFilter, creditOnly, kindFilter, q, infoBy]);

  /* ── Ginti ── */
  const stats = useMemo(() => {
    const l = filtered.filter((s) => s.status !== 'VOIDED');
    const amount = l.reduce((x, s) => x + Number(s.total || 0), 0);
    const cogs = l.reduce((x, s) => x + Number(s.costOfGoods || 0), 0);
    const profit = amount - cogs;
    const creditSales = l.filter((s) => Number(s.creditAmount) > 0);
    return {
      count: l.length,
      voided: filtered.length - l.length,
      amount, cogs, profit,
      qty: l.reduce((x, s) => x + (s.items ?? []).reduce((y: number, i: any) => y + Number(i.quantity || 0), 0), 0),
      margin: amount > 0 ? (profit / amount) * 100 : 0,
      paid: l.reduce((x, s) => x + Math.min(Number(s.paidAmount || 0), Number(s.total || 0)), 0),
      credit: l.reduce((x, s) => x + Number(s.creditAmount || 0), 0),
      discount: l.reduce((x, s) => x + Number(s.discount || 0), 0),
      creditCount: creditSales.length,
      /* Udhaar kitne fi sad bikri par gaya — agri ka sab se ahem number */
      creditPct: amount > 0 ? (l.reduce((x, s) => x + Number(s.creditAmount || 0), 0) / amount) * 100 : 0,
      avg: l.length > 0 ? amount / l.length : 0,
      best: l.reduce<any>((b, s) => (Number(s.total) > Number(b?.total ?? 0) ? s : b), null),
    };
  }, [filtered]);

  /* ── Charts ── */
  const hourly = useMemo(() => {
    const b = Array.from({ length: 24 }, (_, h) => ({ h, label: hourLabel(h), bikri: 0, bill: 0 }));
    live.forEach((s) => { const h = new Date(s.soldAt).getHours(); b[h].bikri += Number(s.total || 0); b[h].bill += 1; });
    return b;
  }, [live]);
  const peak = useMemo(() => hourly.reduce((b, h) => (h.bikri > b.bikri ? h : b), hourly[0]), [hourly]);
  const hourlyShown = useMemo(() => hourly.filter((h) => h.bikri > 0 || (h.h >= 6 && h.h <= 21)), [hourly]);

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
    const b: Record<string, { name: string; bikri: number; munafa: number; udhaar: number; bill: number }> = {};
    for (let i = days - 1; i >= 0; i--) {
      const d = new Date(to); d.setDate(to.getDate() - i);
      b[dayKey(d)] = {
        name: d.toLocaleDateString('en-PK', days > 14 ? { day: 'numeric', month: 'short' } : { weekday: 'short', day: 'numeric' }),
        bikri: 0, munafa: 0, udhaar: 0, bill: 0,
      };
    }
    live.forEach((s) => {
      const k = dayKey(new Date(s.soldAt));
      if (!b[k]) return;
      b[k].bikri += Number(s.total || 0);
      b[k].munafa += Number(s.total || 0) - Number(s.costOfGoods || 0);
      b[k].udhaar += Number(s.creditAmount || 0);
      b[k].bill += 1;
    });
    return Object.values(b).map((v) => ({
      ...v, bikri: Math.round(v.bikri), munafa: Math.round(v.munafa), udhaar: Math.round(v.udhaar),
    }));
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

  /** Agri ka dil — qism, mausam, fasal aur cheezein, sab ek pass me */
  const agg = useMemo(() => {
    const byKind = new Map<string, number>();
    const bySeason = new Map<string, number>();
    const byCrop = new Map<string, number>();
    const byItem = new Map<string, { name: string; qty: number; unit: string; value: number; group: string }>();

    live.forEach((s) => (s.items ?? []).forEach((i: any) => {
      const value = Number(i.lineTotal ?? i.total ?? Number(i.unitPrice ?? i.price ?? 0) * Number(i.quantity || 0));
      const info = infoOf(i);
      byKind.set(info.group, (byKind.get(info.group) ?? 0) + value);

      const sdef = SEASONS.find((x) => x.v === info.season);
      const slabel = sdef ? `${sdef.e} ${sdef.l}` : 'Likha nahi';
      bySeason.set(slabel, (bySeason.get(slabel) ?? 0) + value);

      /* Ek cheez kai fasalon par chalti hai — paisa baant dete hain,
         warna kul jama asli bikri se zyada ho jata. */
      if (info.crops.length > 0) {
        const share = value / info.crops.length;
        info.crops.forEach((c) => byCrop.set(c, (byCrop.get(c) ?? 0) + share));
      }

      const name = i.product?.name ?? 'Doosri cheez';
      const e = byItem.get(name) ?? {
        name, qty: 0, unit: agriUnitLabel(i.product?.unit ?? 'pcs'), value: 0, group: info.group,
      };
      e.qty += Number(i.quantity || 0); e.value += value;
      byItem.set(name, e);
    }));

    return {
      kinds: KINDS.map((k) => ({
        ...k, value: Math.round(byKind.get(k.v) ?? 0),
      })).filter((k) => k.value > 0).sort((a, b) => b.value - a.value),
      seasons: [...bySeason.entries()].map(([name, value]) => ({ name, value: Math.round(value) }))
        .filter((x) => x.value > 0).sort((a, b) => b.value - a.value),
      crops: [...byCrop.entries()].map(([name, value]) => ({ name, value: Math.round(value) }))
        .sort((a, b) => b.value - a.value).slice(0, 8),
      top: [...byItem.values()].sort((a, b) => b.value - a.value).slice(0, 10),
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [live, infoBy]);

  /** Kaun farmer sab se zyada leta hai — aur kitna udhaar par */
  const topFarmers = useMemo(() => {
    const m = new Map<string, { id: string; name: string; phone?: string; total: number; orders: number; credit: number }>();
    live.forEach((s) => {
      if (!s.customer) return;
      const e = m.get(s.customer.id) ?? {
        id: s.customer.id, name: s.customer.name, phone: s.customer.phone ?? undefined,
        total: 0, orders: 0, credit: 0,
      };
      e.total += Number(s.total || 0); e.orders += 1; e.credit += Number(s.creditAmount || 0);
      m.set(s.customer.id, e);
    });
    return [...m.values()].sort((a, b) => b.total - a.total).slice(0, 10);
  }, [live]);

  /** Jin se paisa lena hai — sab se purana pehle */
  const creditList = useMemo(
    () => live.filter((s) => Number(s.creditAmount) > 0)
      .sort((a, b) => new Date(a.soldAt).getTime() - new Date(b.soldAt).getTime()),
    [live],
  );

  const showValue = (v: string) => (hideAmounts ? '•••••' : v);
  const hasFilters = !!search || dateFilter !== 'today' || payFilter !== 'all' || creditOnly || kindFilter !== 'all';
  const clearFilters = () => {
    setSearch(''); setDateFilter('today'); setPayFilter('all');
    setCreditOnly(false); setKindFilter('all'); setCustomStart(''); setCustomEnd('');
  };

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
    setDateFilter('all'); setPayFilter('all'); setCreditOnly(false); setKindFilter('all');
    setSearch(c); setTab('list');
    toast.error(`"${c}" ka bill nahi mila — sab tareekhon me dhoond rahe hain`);
  };

  /* ── WhatsApp ── */
  const billWaLink = (s: any) => {
    const items = (s.items ?? []).slice(0, 6)
      .map((it: any) => `• ${it.product?.name ?? 'Cheez'} × ${fmtQty(it.quantity)} ${agriUnitLabel(it.product?.unit ?? '')}`)
      .join('\n');
    const msg = fillTemplate(templates.receipt, {
      shop: tenant?.name ?? 'Agri',
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
      [`Agri bikri — ${tenant?.name || 'Nafaa'}`],
      [`Dukaan: ${shopName || 'Sab'}  •  Nikala gaya: ${new Date().toLocaleString('en-PK')}`],
      [`Muddat: ${rangeLabel}  •  Bill: ${stats.count}  •  Kul: ${stats.amount.toFixed(2)}`],
      [`Wasool: ${stats.paid.toFixed(2)}  •  Udhaar: ${stats.credit.toFixed(2)} (${stats.creditPct.toFixed(1)}%)  •  Munafa: ${stats.profit.toFixed(2)}`],
      [''],
    ];
    const cols = ['Bill', 'Tareekh', 'Waqt', 'Farmer', 'Phone', 'Cheezein', 'Tafseel', 'Qty',
      'Tareeqa', 'Discount', 'Total', 'Mila', 'Udhaar', 'Halat', 'Note'];
    const body = filtered.map((s) => [
      s.saleNumber, new Date(s.soldAt).toLocaleDateString('en-PK'), fmtTime(s.soldAt),
      s.customer?.name ?? 'Walk-in', s.customer?.phone ?? '',
      (s.items ?? []).length,
      (s.items ?? []).map((i: any) =>
        `${i.product?.name ?? ''} × ${fmtQty(i.quantity)} ${agriUnitLabel(i.product?.unit ?? '')}`).join(' | '),
      (s.items ?? []).reduce((a: number, i: any) => a + Number(i.quantity || 0), 0),
      PAY[s.paymentMethod]?.label ?? s.paymentMethod,
      Number(s.discount || 0).toFixed(2), Number(s.total || 0).toFixed(2),
      Number(s.paidAmount || 0).toFixed(2), Number(s.creditAmount || 0).toFixed(2),
      s.status, s.note ?? '',
    ]);
    const esc = (v: any) => `"${String(v ?? '').replace(/"/g, '""')}"`;
    const csv = [...head, cols, ...body].map((r) => r.map(esc).join(',')).join('\n');
    const url = URL.createObjectURL(new Blob(['﻿' + csv], { type: 'text/csv;charset=utf-8;' }));
    const a = document.createElement('a'); a.href = url;
    a.download = `agri-bikri-${dayKey(new Date())}.csv`;
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
  const shown = filtered.slice(0, visible);

  return (
    <div className="space-y-4 sm:space-y-5 pb-10">
      {scannerOpen && (
        <BarcodeScanner onDetected={onScan} onClose={() => setScannerOpen(false)}
          title="Bill scan karein" hint="Bill ka barcode ya number camera ke samne rakhein" />
      )}
      {voidTarget && (
        <VoidModal sale={voidTarget} onClose={() => setVoidTarget(null)}
          onConfirm={(reason: string) => voidMut.mutate({ id: voidTarget.id, reason })}
          saving={voidMut.isPending} />
      )}
      {returnTarget && (
        <ReturnModal sale={returnTarget} onClose={() => setReturnTarget(null)}
          onDone={() => {
            setReturnTarget(null);
            ['sales-list', 'products', 'agri-all-products', 'customers'].forEach((k) => qc.invalidateQueries({ queryKey: [k] }));
          }} />
      )}
      {showTeacher && <Teacher onClose={() => setShowTeacher(false)} />}

      {/* ═══ PRINT HEADER ═══ */}
      <div className="hidden print:block mb-4">
        <h1 className="text-xl font-extrabold">{tenant?.name || 'Agri'} — Bikri ka record</h1>
        <p className="text-xs text-slate-600">{shopName ? `${shopName} • ` : ''}{rangeLabel} • {new Date().toLocaleString('en-PK', { dateStyle: 'full', timeStyle: 'short' })}</p>
        <p className="text-xs text-slate-600 mt-1">
          {stats.count} bill • Kul {formatPKR(stats.amount)} • Wasool {formatPKR(stats.paid)} • Udhaar {formatPKR(stats.credit)}
        </p>
      </div>

      {/* ═══ HERO ═══ */}
      <section className="relative overflow-hidden rounded-3xl bg-gradient-to-br from-slate-950 via-emerald-900 to-lime-700 text-white p-5 sm:p-6 shadow-2xl print:hidden">
        <div className="absolute -top-24 -right-20 h-72 w-72 rounded-full bg-lime-400/25 blur-3xl pointer-events-none" />
        <div className="absolute -bottom-24 -left-20 h-64 w-64 rounded-full bg-emerald-300/15 blur-3xl pointer-events-none" />
        <div className="absolute inset-0 opacity-[0.06] pointer-events-none"
          style={{ backgroundImage: 'radial-gradient(circle at 1px 1px, #fff 1px, transparent 0)', backgroundSize: '22px 22px' }} />
        <div className="relative flex items-start justify-between gap-4 flex-wrap">
          <div className="min-w-0">
            <div className="inline-flex items-center gap-2 rounded-full bg-white/15 backdrop-blur px-3 py-1 text-[11px] font-black border border-white/25 uppercase tracking-widest">
              <Receipt className="h-3.5 w-3.5 text-lime-300" /> Agri · Bikri
              {shopName && (<><span className="opacity-40">•</span><span className="text-emerald-200">🏪 {shopName}</span></>)}
            </div>
            <h1 className="mt-3 text-2xl sm:text-3xl lg:text-4xl font-black leading-tight">🧾 Bikri ka Record</h1>
            <p className="mt-1.5 text-xs sm:text-sm font-bold text-white/90">
              {rangeLabel} · <strong className="text-lime-200">{stats.count}</strong> bill ·{' '}
              <strong>{showValue(formatPKR(stats.amount))}</strong>
              {stats.credit > 0 && <> · <span className="text-amber-200">{showValue(formatPKR(stats.credit))} udhaar gaya</span></>}
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
              className="h-11 px-3.5 rounded-xl bg-white text-emerald-700 hover:bg-emerald-50 text-xs font-black inline-flex items-center gap-1.5 shadow-lg transition">
              <Printer className="h-4 w-4" /> Print
            </button>
          </div>
        </div>
      </section>

      {showPrefs && (
        <ReceiptPrefsPopover anchorRef={prefsBtnRef} prefs={prefs} onChange={updatePrefs} onClose={() => setShowPrefs(false)} />
      )}

      {/* ═══ UDHAAR — agri ka sab se bara masla ═══ */}
      {stats.credit > 0 && (
        <section className="rounded-3xl bg-gradient-to-br from-amber-50 to-orange-50 dark:from-amber-500/10 dark:to-orange-500/10 border-2 border-amber-300 dark:border-amber-500/40 p-4 flex items-start gap-3 flex-wrap print:hidden">
          <div className="h-10 w-10 rounded-xl bg-gradient-to-br from-amber-500 to-orange-600 text-white flex items-center justify-center shadow-md shrink-0">
            <Wallet className="h-5 w-5" />
          </div>
          <div className="flex-1 min-w-[200px]">
            <h3 className="font-extrabold text-amber-900 dark:text-amber-200 text-sm">
              💰 {showValue(formatPKR(stats.credit))} udhaar gaya — {stats.creditCount} bill par
            </h3>
            <p className="text-[11px] font-bold text-amber-800 dark:text-amber-300 mt-0.5">
              Is muddat ki <strong>{stats.creditPct.toFixed(0)}%</strong> bikri udhaar par gayi.
              Agri me ye aam hai — farmer katai ke baad deta hai — magar hisab rakhna zaroori hai,
              warna sarmaya bahar hi para reh jata hai.
            </p>
          </div>
          <div className="flex gap-1.5 shrink-0">
            <button onClick={() => { setCreditOnly(true); setTab('list'); }}
              className="h-10 px-3 rounded-xl bg-white dark:bg-slate-800 border-2 border-amber-300 dark:border-amber-500/40 hover:border-amber-500 text-amber-800 dark:text-amber-200 text-xs font-black transition">
              Sirf udhaar wale
            </button>
            <Link to="/khata"
              className="h-10 px-3 rounded-xl bg-amber-600 hover:bg-amber-700 text-white text-xs font-black inline-flex items-center gap-1.5 transition">
              Khata <ArrowRight className="h-3.5 w-3.5" />
            </Link>
          </div>
        </section>
      )}

      {/* ═══ KPI ═══ */}
      <section className="grid grid-cols-2 lg:grid-cols-4 gap-3 print:hidden">
        <Kpi icon={Receipt} label="Bill" value={stats.count}
          sub={stats.voided > 0 ? `${stats.voided} void hue` : `${fmtQty(stats.qty)} cheezein bikin`} tone="sky" />
        <Kpi icon={TrendingUp} label="Kul bikri" value={showValue(formatPKR(stats.amount))} sub={rangeLabel} tone="emerald" highlight />
        <Kpi icon={Award} label="Munafa" value={showValue(formatPKR(stats.profit))} sub={`${stats.margin.toFixed(1)}% margin`} tone="lime" />
        <Kpi icon={Wallet} label="Udhaar gaya" value={showValue(formatPKR(stats.credit))}
          sub={stats.creditCount > 0 ? `${stats.creditCount} bill · ${stats.creditPct.toFixed(0)}% bikri` : 'Sab cash'}
          tone="amber" onClick={() => { setCreditOnly(!creditOnly); setTab('list'); }} active={creditOnly} />
      </section>

      {/* ═══ QISM KI PATTI ═══ */}
      {agg.kinds.length > 0 && (
        <section className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-5 gap-2 sm:gap-3 print:hidden">
          {KINDS.map((k) => {
            const row = agg.kinds.find((x) => x.v === k.v);
            const on = kindFilter === k.v;
            return (
              <button key={k.v} onClick={() => { setKindFilter(on ? 'all' : k.v); setTab('list'); }}
                className={`rounded-2xl border-2 p-3 text-left transition active:scale-[0.98] ${
                  on ? 'border-emerald-500 bg-emerald-50 dark:bg-emerald-500/10 ring-2 ring-emerald-200 dark:ring-emerald-500/20'
                    : 'border-slate-200 dark:border-slate-800 bg-white dark:bg-slate-900 hover:border-emerald-400'
                }`}>
                <div className="text-[10px] font-black uppercase tracking-widest text-slate-500 truncate">
                  {k.e} {k.l}
                </div>
                <div className="mt-1 text-base font-black text-slate-900 dark:text-white tabular-nums truncate">
                  {showValue(formatPKR(row?.value ?? 0))}
                </div>
              </button>
            );
          })}
        </section>
      )}

      {/* ═══ TABS ═══ */}
      <div className="grid grid-cols-2 gap-2 sm:gap-3 print:hidden">
        {([
          ['list', 'Bill', Receipt, filtered.length],
          ['analytics', 'Analytics', BarChart3, undefined],
        ] as const).map(([id, label, Icon, count]) => (
          <button key={id} onClick={() => setTab(id as Tab)}
            className={`h-14 rounded-2xl border-2 font-black text-sm inline-flex items-center justify-center gap-2 transition ${
              tab === id
                ? 'bg-gradient-to-r from-emerald-600 to-lime-700 text-white border-transparent shadow-lg'
                : 'bg-white dark:bg-slate-900 text-slate-600 dark:text-slate-300 border-slate-200 dark:border-slate-800 hover:border-emerald-400'
            }`}>
            <Icon className="h-4 w-4" /> {label}
            {count !== undefined && (
              <span className={`text-[10px] px-1.5 py-0.5 rounded-lg tabular-nums ${
                tab === id ? 'bg-white/25' : 'bg-slate-100 dark:bg-slate-800'
              }`}>{count}</span>
            )}
          </button>
        ))}
      </div>

      {/* ═══ TOOLBAR ═══ */}
      <section className="rounded-3xl bg-white dark:bg-slate-900 border-2 border-slate-200 dark:border-slate-800 shadow-sm p-3 sm:p-4 space-y-3 print:hidden">
        <div className="flex gap-2 flex-wrap">
          <div className="relative flex-1 min-w-[220px]">
            <Search className="h-5 w-5 text-slate-400 absolute left-3.5 top-1/2 -translate-y-1/2 pointer-events-none" />
            <input ref={searchRef} value={search} onChange={(e) => setSearch(e.target.value)}
              placeholder="Bill number, farmer, phone, cheez, fasal… (/ dabao)"
              className="h-12 w-full rounded-2xl border-2 border-slate-200 dark:border-slate-700 bg-white dark:bg-slate-800 pl-11 pr-10 text-sm font-bold text-slate-900 dark:text-white placeholder:text-slate-400 focus:outline-none focus:border-emerald-500 transition" />
            {search && (
              <button onClick={() => setSearch('')}
                className="absolute right-3 top-1/2 -translate-y-1/2 h-7 w-7 rounded-lg hover:bg-slate-100 dark:hover:bg-slate-700 flex items-center justify-center">
                <X className="h-4 w-4 text-slate-400" />
              </button>
            )}
          </div>

          <div className="relative">
            <button onClick={() => setShowDate((v) => !v)}
              className="h-12 px-4 rounded-2xl border-2 border-slate-200 dark:border-slate-700 bg-white dark:bg-slate-800 text-sm font-extrabold text-slate-700 dark:text-slate-200 inline-flex items-center gap-1.5 hover:border-emerald-400 transition">
              <Calendar className="h-4 w-4" /> {DATE_OPTS.find(([v]) => v === dateFilter)?.[1]}
              <ChevronDown className="h-3.5 w-3.5" />
            </button>
            {showDate && (
              <div className="absolute z-30 mt-1 right-0 w-56 rounded-2xl bg-white dark:bg-slate-900 border-2 border-slate-200 dark:border-slate-700 shadow-2xl p-2 space-y-1">
                {DATE_OPTS.map(([v, l]) => (
                  <button key={v} onClick={() => { setDateFilter(v); if (v !== 'custom') setShowDate(false); }}
                    className={`w-full h-10 px-3 rounded-xl text-left text-xs font-extrabold transition ${
                      dateFilter === v ? 'bg-emerald-600 text-white' : 'hover:bg-slate-100 dark:hover:bg-slate-800 text-slate-700 dark:text-slate-200'
                    }`}>{l}</button>
                ))}
                {dateFilter === 'custom' && (
                  <div className="pt-2 space-y-1.5 border-t-2 border-slate-100 dark:border-slate-800">
                    <input type="date" value={customStart} onChange={(e) => setCustomStart(e.target.value)}
                      className="h-10 w-full rounded-xl border-2 border-slate-200 dark:border-slate-700 bg-white dark:bg-slate-800 px-2 text-xs font-bold text-slate-900 dark:text-white focus:outline-none focus:border-emerald-500" />
                    <input type="date" value={customEnd} onChange={(e) => setCustomEnd(e.target.value)}
                      className="h-10 w-full rounded-xl border-2 border-slate-200 dark:border-slate-700 bg-white dark:bg-slate-800 px-2 text-xs font-bold text-slate-900 dark:text-white focus:outline-none focus:border-emerald-500" />
                    <Button className="w-full h-9" onClick={() => setShowDate(false)}>Laga do</Button>
                  </div>
                )}
              </div>
            )}
          </div>
        </div>

        <div className="flex gap-1.5 flex-wrap items-center">
          <button onClick={() => setPayFilter('all')}
            className={`h-9 px-3 rounded-xl border-2 text-[11px] font-black transition ${
              payFilter === 'all' ? 'border-emerald-500 bg-emerald-50 dark:bg-emerald-500/15 text-emerald-700 dark:text-emerald-300'
                : 'border-slate-200 dark:border-slate-700 bg-white dark:bg-slate-800 text-slate-600 dark:text-slate-300 hover:border-emerald-400'
            }`}>Har tareeqa</button>
          {Object.entries(PAY).map(([k, v]) => (
            <button key={k} onClick={() => setPayFilter(payFilter === k ? 'all' : (k as PaymentMethod))}
              className={`h-9 px-3 rounded-xl border-2 text-[11px] font-black inline-flex items-center gap-1 transition ${
                payFilter === k ? 'border-emerald-500 bg-emerald-50 dark:bg-emerald-500/15 text-emerald-700 dark:text-emerald-300'
                  : 'border-slate-200 dark:border-slate-700 bg-white dark:bg-slate-800 text-slate-600 dark:text-slate-300 hover:border-emerald-400'
              }`}>
              <v.icon className="h-3 w-3" /> {v.label}
            </button>
          ))}
          <button onClick={() => setCreditOnly(!creditOnly)}
            className={`h-9 px-3 rounded-xl border-2 text-[11px] font-black inline-flex items-center gap-1 transition ${
              creditOnly ? 'border-amber-500 bg-amber-50 dark:bg-amber-500/15 text-amber-700 dark:text-amber-300'
                : 'border-slate-200 dark:border-slate-700 bg-white dark:bg-slate-800 text-slate-600 dark:text-slate-300 hover:border-amber-400'
            }`}>
            <Wallet className="h-3 w-3" /> Sirf udhaar
          </button>

          {hasFilters && (
            <button onClick={clearFilters}
              className="text-xs font-extrabold text-rose-600 dark:text-rose-400 hover:text-rose-700 inline-flex items-center gap-1 transition">
              <X className="h-3 w-3" /> Chaant hatao
            </button>
          )}
          <div className="ml-auto text-xs font-extrabold text-slate-500 dark:text-slate-400 tabular-nums">
            {filtered.length} bill · {showValue(formatPKR(stats.amount))}
          </div>
        </div>
      </section>

      {tab === 'analytics' ? (
        <Analytics
          stats={stats} agg={agg} daily={daily} weekday={weekday} payPie={payPie}
          hourlyShown={hourlyShown} peak={peak} dayparts={dayparts} topPart={topPart}
          topFarmers={topFarmers} creditList={creditList}
          showValue={showValue} hideAmounts={hideAmounts} rangeLabel={rangeLabel} />
      ) : salesQ.isLoading ? (
        <div className="grid gap-3">
          {[1, 2, 3].map((i) => <div key={i} className="h-28 rounded-2xl bg-slate-100 dark:bg-slate-800 animate-pulse" />)}
        </div>
      ) : filtered.length === 0 ? (
        <Empty hasFilters={hasFilters} onClear={clearFilters} onGuide={() => setShowTeacher(true)} />
      ) : (
        <>
          <section className="space-y-2">
            {shown.map((s) => (
              <SaleRow key={s.id} s={s} infoOf={infoOf} receiptLink={receiptLink}
                showValue={showValue} waHref={billWaLink(s)}
                onVoid={() => setVoidTarget(s)} onReturn={() => setReturnTarget(s)} />
            ))}
          </section>
          {visible < filtered.length && (
            <div className="flex justify-center print:hidden">
              <button onClick={() => setVisible((v) => v + 50)}
                className="px-6 py-3.5 rounded-2xl bg-white dark:bg-slate-800 border-2 border-slate-200 dark:border-slate-700 hover:border-emerald-400 text-sm font-extrabold text-slate-700 dark:text-slate-200 shadow-sm transition active:scale-[0.98]">
                Aur {Math.min(50, filtered.length - visible)} dikhao
                <span className="text-slate-400 font-bold ml-1">({visible}/{filtered.length})</span>
              </button>
            </div>
          )}
        </>
      )}

      <style>{`
        @media print {
          @page { size: A4; margin: 12mm 10mm; }
          html, body { background: white !important; color: #0f172a !important;
            print-color-adjust: exact !important; -webkit-print-color-adjust: exact !important; }
          .dark body, .dark { background: white !important; color: #0f172a !important; }
          .print\\:hidden { display: none !important; }
          .print\\:block { display: block !important; }
          section, div { box-shadow: none !important; }
          [class*="fixed"] { display: none !important; }
          html, body, #root { height: auto !important; overflow: visible !important; }
          .avoid-break { page-break-inside: avoid !important; }
          [data-sonner-toaster] { display: none !important; }
        }
      `}</style>
    </div>
  );
}

/* ═════════════════════════════════════════════════════════════
   EK BILL KI LINE — poori line par click = bill khul jata hai
   ═════════════════════════════════════════════════════════════ */
function SaleRow({ s, infoOf, receiptLink, showValue, waHref, onVoid, onReturn }: any) {
  const voided = s.status === 'VOIDED';
  const credit = Number(s.creditAmount || 0);
  const pay = PAY[s.paymentMethod] ?? { label: s.paymentMethod, icon: Banknote, chip: 'bg-slate-100 text-slate-600' };
  const PayIcon = pay.icon;
  const items = s.items ?? [];

  /* Bill par jo qism sab se zyada bik gayi — ek nazar me pata chale */
  const kinds = new Set<string>(items.map((i: any) => infoOf(i).group));

  return (
    <div className={`rounded-2xl border-2 shadow-sm overflow-hidden avoid-break transition hover:shadow-md ${
      voided ? 'border-rose-200 dark:border-rose-500/40 bg-rose-50/40 dark:bg-rose-500/5 opacity-75'
        : credit > 0 ? 'border-amber-200 dark:border-amber-500/40 bg-white dark:bg-slate-900'
        : 'border-slate-200 dark:border-slate-800 bg-white dark:bg-slate-900 hover:border-emerald-300'
    }`}>
      <Link to={receiptLink(s.id, false)} className="block p-3 sm:p-4">
        <div className="flex items-start justify-between gap-3 flex-wrap">
          <div className="min-w-0 flex-1">
            <div className="flex items-center gap-1.5 flex-wrap">
              <span className="font-mono font-extrabold text-sm text-slate-900 dark:text-white">{s.saleNumber}</span>
              <span className={`px-2 py-0.5 rounded-full text-[9px] font-extrabold uppercase inline-flex items-center gap-1 ${pay.chip}`}>
                <PayIcon className="h-2.5 w-2.5" /> {pay.label}
              </span>
              {voided && (
                <span className="px-2 py-0.5 rounded-full text-[9px] font-extrabold uppercase bg-rose-600 text-white">Void</span>
              )}
              {credit > 0 && !voided && (
                <span className="px-2 py-0.5 rounded-full text-[9px] font-extrabold uppercase bg-amber-100 dark:bg-amber-500/20 text-amber-700 dark:text-amber-300">
                  Udhaar {showValue(formatPKR(credit))}
                </span>
              )}
              {[...kinds].map((g) => {
                const k = KINDS.find((x) => x.v === g);
                if (!k) return null;
                return (
                  <span key={g} className="px-1.5 py-0.5 rounded-md text-[9px] font-extrabold bg-slate-100 dark:bg-slate-800 text-slate-600 dark:text-slate-300">
                    {k.e} {k.l}
                  </span>
                );
              })}
            </div>

            <div className="mt-1 flex items-center gap-3 text-[11px] font-bold text-slate-600 dark:text-slate-400 flex-wrap">
              <span className="inline-flex items-center gap-1">
                <User className="h-3 w-3" />{s.customer?.name ?? 'Walk-in'}
              </span>
              <span className="inline-flex items-center gap-1">
                <Clock className="h-3 w-3" />{fmtTime(s.soldAt)} · {ago(s.soldAt)}
              </span>
              {s.note && <span className="truncate max-w-[220px] text-slate-400">{s.note}</span>}
            </div>

            <div className="mt-2 flex flex-wrap gap-1">
              {items.slice(0, 4).map((i: any, n: number) => (
                <span key={n} className="px-2 py-0.5 rounded-md bg-slate-100 dark:bg-slate-800 text-slate-600 dark:text-slate-300 text-[10px] font-extrabold">
                  {AGRI_KIND_EMOJI[infoOf(i).kind as AgriKind]} {i.product?.name ?? 'Cheez'} ·{' '}
                  {fmtQty(i.quantity)} {agriUnitLabel(i.product?.unit ?? '')}
                </span>
              ))}
              {items.length > 4 && (
                <span className="px-2 py-0.5 rounded-md bg-slate-100 dark:bg-slate-800 text-slate-500 text-[10px] font-extrabold">
                  +{items.length - 4} aur
                </span>
              )}
            </div>
          </div>

          <div className="text-right shrink-0">
            <div className={`text-xl font-black tabular-nums leading-none ${voided ? 'line-through text-slate-400' : 'text-slate-900 dark:text-white'}`}>
              {showValue(formatPKR(s.total))}
            </div>
            {credit > 0 ? (
              <div className="text-[11px] font-extrabold text-amber-600 dark:text-amber-400 mt-0.5 tabular-nums">
                mila {showValue(formatPKR(s.paidAmount))}
              </div>
            ) : (
              <div className="text-[11px] font-extrabold text-emerald-600 dark:text-emerald-400 mt-0.5">
                Poora paisa mila
              </div>
            )}
            {Number(s.discount) > 0 && (
              <div className="text-[10px] font-bold text-slate-400 tabular-nums">
                chhoot {showValue(formatPKR(s.discount))}
              </div>
            )}
          </div>
        </div>
      </Link>

      {!voided && (
        <div className="px-3 sm:px-4 pb-3 flex gap-1.5 flex-wrap print:hidden">
          <Link to={receiptLink(s.id, true)} target="_blank"
            className="h-9 px-3 rounded-lg bg-emerald-50 dark:bg-emerald-500/15 hover:bg-emerald-100 dark:hover:bg-emerald-500/25 text-emerald-700 dark:text-emerald-300 text-[11px] font-extrabold inline-flex items-center gap-1 transition">
            <Printer className="h-3.5 w-3.5" /> Print
          </Link>
          {s.customer?.phone && (
            <a href={waHref} target="_blank" rel="noreferrer"
              className="h-9 px-3 rounded-lg bg-green-50 dark:bg-green-500/15 hover:bg-green-100 dark:hover:bg-green-500/25 text-green-700 dark:text-green-300 text-[11px] font-extrabold inline-flex items-center gap-1 transition">
              <MessageCircle className="h-3.5 w-3.5" /> WhatsApp
            </a>
          )}
          <button onClick={onReturn}
            className="h-9 px-3 rounded-lg bg-sky-50 dark:bg-sky-500/15 hover:bg-sky-100 dark:hover:bg-sky-500/25 text-sky-700 dark:text-sky-300 text-[11px] font-extrabold inline-flex items-center gap-1 transition">
            <Undo2 className="h-3.5 w-3.5" /> Wapsi
          </button>
          <button onClick={onVoid}
            className="ml-auto h-9 px-3 rounded-lg bg-rose-50 dark:bg-rose-500/15 hover:bg-rose-100 dark:hover:bg-rose-500/25 text-rose-600 dark:text-rose-400 text-[11px] font-extrabold inline-flex items-center gap-1 transition">
            <Trash2 className="h-3.5 w-3.5" /> Void
          </button>
        </div>
      )}

      {s.voidReason && (
        <div className="px-3 sm:px-4 pb-3">
          <div className="rounded-xl bg-rose-50 dark:bg-rose-500/10 border-2 border-rose-200 dark:border-rose-500/30 p-2 text-[11px] font-bold text-rose-800 dark:text-rose-300">
            ❌ Void ki wajah: {s.voidReason}
          </div>
        </div>
      )}
    </div>
  );
}

/* ═════════════════════════════════════════════════════════════
   ANALYTICS
   ═════════════════════════════════════════════════════════════ */
function Analytics({
  stats, agg, daily, weekday, payPie, hourlyShown, peak, dayparts, topPart,
  topFarmers, creditList, showValue, hideAmounts, rangeLabel,
}: any) {
  return (
    <div className="space-y-4">
      <section className="grid sm:grid-cols-2 lg:grid-cols-4 gap-3">
        <MiniStat icon={Receipt} label="Aam bill" value={showValue(formatPKR(stats.avg))}
          sub={`${stats.count} bill · ${rangeLabel}`} tone="emerald" />
        <MiniStat icon={Wallet} label="Udhaar ki shrah" value={`${stats.creditPct.toFixed(0)}%`}
          sub={showValue(formatPKR(stats.credit))} tone={stats.creditPct > 50 ? 'rose' : 'amber'} />
        <MiniStat icon={topPart.icon} label="Sab se masroof waqt" value={topPart.label}
          sub={`${topPart.range} · ${topPart.pct.toFixed(0)}% bikri`} tone="lime" />
        <MiniStat icon={Clock} label="Sab se masroof ghanta" value={peak?.bikri > 0 ? peak.label : '—'}
          sub={peak?.bikri > 0 ? showValue(formatPKR(peak.bikri)) : 'Abhi koi bikri nahi'} tone="sky" />
      </section>

      {stats.creditPct > 50 && (
        <section className="rounded-3xl bg-amber-50 dark:bg-amber-500/10 border-2 border-amber-200 dark:border-amber-500/30 p-4">
          <div className="flex items-center gap-2 mb-1">
            <AlertTriangle className="h-4 w-4 text-amber-600" />
            <h3 className="font-black text-amber-900 dark:text-amber-200">Aadhi se zyada bikri udhaar par</h3>
          </div>
          <p className="text-[12px] font-bold text-amber-900 dark:text-amber-200 leading-relaxed">
            Is muddat me <strong>{stats.creditPct.toFixed(0)}%</strong> maal udhaar par gaya. Agri me
            ye aam hai — farmer katai ke baad deta hai — magar itna paisa bahar hone par naya maal
            mangwane ke liye cash nahi bachta. "Fasal ka calendar" me dekhein ke kis ki katai qareeb
            hai, aur unhi farmer se pehle maangein.
          </p>
          <Link to="/agri/seasonal-plans"
            className="mt-2 h-9 px-3 rounded-xl bg-amber-600 hover:bg-amber-700 text-white text-xs font-black inline-flex items-center gap-1.5 transition">
            <Calendar className="h-3.5 w-3.5" /> Fasal ka calendar
          </Link>
        </section>
      )}

      <div className="grid lg:grid-cols-2 gap-4">
        <ChartCard icon={BarChart3} title="Rozana — bikri, munafa aur udhaar" wide>
          {daily.some((d: any) => d.bikri > 0) ? (
            <ResponsiveContainer width="100%" height="100%">
              <ComposedChart data={daily}>
                <CartesianGrid strokeDasharray="3 3" stroke={GRID} vertical={false} />
                <XAxis dataKey="name" stroke={AXIS} fontSize={10} fontWeight={700} />
                <YAxis stroke={AXIS} fontSize={11} width={70} tickFormatter={(v) => Number(v).toLocaleString('en-PK')} />
                <Tooltip contentStyle={TOOLTIP} formatter={(v: any, n: any) => [formatPKR(Number(v)), n]} />
                <Legend />
                <Area type="monotone" dataKey="bikri" name="Bikri" stroke={C.sale} fill={C.sale} fillOpacity={0.18} strokeWidth={2.5} />
                <Bar dataKey="udhaar" name="Udhaar" fill={C.credit} radius={[4, 4, 0, 0]} maxBarSize={28} />
                <Line type="monotone" dataKey="munafa" name="Munafa" stroke={C.profit} strokeWidth={2.5} dot={false} />
              </ComposedChart>
            </ResponsiveContainer>
          ) : <EmptyBox text="Is muddat me koi bikri nahi" />}
        </ChartCard>

        <ChartCard icon={Layers} title="Kis qism se kitna paisa">
          {agg.kinds.length > 0 ? (
            <ResponsiveContainer width="100%" height="100%">
              <PieChart>
                <Pie data={agg.kinds} dataKey="value" nameKey="l" innerRadius={55} outerRadius={90} paddingAngle={3}>
                  {agg.kinds.map((k: any, i: number) => <Cell key={i} fill={k.hex} />)}
                </Pie>
                <Tooltip contentStyle={TOOLTIP} formatter={(v: any) => formatPKR(Number(v))} />
                <Legend />
              </PieChart>
            </ResponsiveContainer>
          ) : <EmptyBox text="Abhi koi bikri nahi" />}
        </ChartCard>

        <ChartCard icon={Calendar} title="Kis mausam ka maal bika">
          {agg.seasons.length > 0 ? (
            <ResponsiveContainer width="100%" height="100%">
              <BarChart data={agg.seasons} layout="vertical">
                <CartesianGrid strokeDasharray="3 3" stroke={GRID} horizontal={false} />
                <XAxis type="number" stroke={AXIS} fontSize={11} tickFormatter={(v) => Number(v).toLocaleString('en-PK')} />
                <YAxis type="category" dataKey="name" stroke={AXIS} fontSize={10} fontWeight={700} width={100} />
                <Tooltip contentStyle={TOOLTIP} formatter={(v: any) => [formatPKR(Number(v)), 'Bikri']} />
                <Bar dataKey="value" fill={C.sale} radius={[0, 6, 6, 0]} />
              </BarChart>
            </ResponsiveContainer>
          ) : <EmptyBox text="Cheezon par mausam likha hi nahi" />}
        </ChartCard>

        <ChartCard icon={Wheat} title="Kis fasal ka maal bika">
          {agg.crops.length > 0 ? (
            <ResponsiveContainer width="100%" height="100%">
              <BarChart data={agg.crops} layout="vertical">
                <CartesianGrid strokeDasharray="3 3" stroke={GRID} horizontal={false} />
                <XAxis type="number" stroke={AXIS} fontSize={11} tickFormatter={(v) => Number(v).toLocaleString('en-PK')} />
                <YAxis type="category" dataKey="name" stroke={AXIS} fontSize={10} fontWeight={700} width={95} />
                <Tooltip contentStyle={TOOLTIP} formatter={(v: any) => [formatPKR(Number(v)), 'Bikri']} />
                <Bar dataKey="value" fill={C.profit} radius={[0, 6, 6, 0]} />
              </BarChart>
            </ResponsiveContainer>
          ) : <EmptyBox text="Cheezon par fasal likhi hi nahi" />}
        </ChartCard>

        <ChartCard icon={Clock} title="Ghante ke hisab se">
          {hourlyShown.some((h: any) => h.bikri > 0) ? (
            <ResponsiveContainer width="100%" height="100%">
              <BarChart data={hourlyShown}>
                <CartesianGrid strokeDasharray="3 3" stroke={GRID} vertical={false} />
                <XAxis dataKey="label" stroke={AXIS} fontSize={9} fontWeight={700} interval={1} />
                <YAxis stroke={AXIS} fontSize={11} width={60} tickFormatter={(v) => Number(v).toLocaleString('en-PK')} />
                <Tooltip contentStyle={TOOLTIP} formatter={(v: any) => [formatPKR(Number(v)), 'Bikri']} />
                <Bar dataKey="bikri" radius={[4, 4, 0, 0]}>
                  {hourlyShown.map((h: any, i: number) => (
                    <Cell key={i} fill={h.h === peak?.h ? '#f59e0b' : C.sale} />
                  ))}
                </Bar>
              </BarChart>
            </ResponsiveContainer>
          ) : <EmptyBox text="Is muddat me koi bikri nahi" />}
        </ChartCard>

        <ChartCard icon={Banknote} title="Paisa kaise aaya">
          {payPie.length > 0 ? (
            <ResponsiveContainer width="100%" height="100%">
              <PieChart>
                <Pie data={payPie} dataKey="value" nameKey="name" innerRadius={55} outerRadius={90} paddingAngle={3}>
                  {payPie.map((p: any, i: number) => <Cell key={i} fill={p.hex} />)}
                </Pie>
                <Tooltip contentStyle={TOOLTIP} formatter={(v: any) => formatPKR(Number(v))} />
                <Legend />
              </PieChart>
            </ResponsiveContainer>
          ) : <EmptyBox text="Abhi koi bikri nahi" />}
        </ChartCard>

        <ChartCard icon={Calendar} title="Hafte ka kaunsa din bhara hota hai">
          {weekday.some((d: any) => d.bikri > 0) ? (
            <ResponsiveContainer width="100%" height="100%">
              <BarChart data={weekday}>
                <CartesianGrid strokeDasharray="3 3" stroke={GRID} vertical={false} />
                <XAxis dataKey="label" stroke={AXIS} fontSize={10} fontWeight={700} />
                <YAxis stroke={AXIS} fontSize={11} width={60} tickFormatter={(v) => Number(v).toLocaleString('en-PK')} />
                <Tooltip contentStyle={TOOLTIP} formatter={(v: any) => [formatPKR(Number(v)), 'Bikri']} />
                <Bar dataKey="bikri" fill={C.weekday} radius={[6, 6, 0, 0]} />
              </BarChart>
            </ResponsiveContainer>
          ) : <EmptyBox text="Abhi koi bikri nahi" />}
        </ChartCard>
      </div>

      {/* Din ke hisse */}
      <section className="grid grid-cols-2 lg:grid-cols-4 gap-3">
        {dayparts.map((p: any) => (
          <div key={p.key} className={`rounded-2xl border-2 p-4 ${
            p.key === topPart.key
              ? 'border-emerald-400 bg-emerald-50 dark:bg-emerald-500/10'
              : 'border-slate-200 dark:border-slate-800 bg-white dark:bg-slate-900'
          }`}>
            <div className="flex items-center gap-1.5">
              <p.icon className="h-4 w-4 text-emerald-600" />
              <span className="text-[11px] font-black uppercase tracking-widest text-slate-500">{p.label}</span>
            </div>
            <div className="mt-1 text-lg font-black text-slate-900 dark:text-white tabular-nums">
              {showValue(formatPKR(p.bikri))}
            </div>
            <div className="text-[10px] font-bold text-slate-400">{p.range} · {p.bill} bill · {p.pct.toFixed(0)}%</div>
          </div>
        ))}
      </section>

      <div className="grid lg:grid-cols-2 gap-4">
        <ListCard icon={Package} title="Kya sab se zyada bika" rows={agg.top.map((t: any) => ({
          key: t.name,
          title: t.name,
          sub: `${fmtQty(t.qty)} ${t.unit}`,
          value: showValue(formatPKR(t.value)),
        }))} emptyText="Abhi koi bikri nahi" />

        <ListCard icon={Tractor} title="Sab se bare farmer" rows={topFarmers.map((f: any) => ({
          key: f.id,
          title: f.name,
          sub: `${f.orders} bill${f.phone ? ` · ${f.phone}` : ''}${f.credit > 0 ? ` · udhaar ${formatPKR(f.credit)}` : ''}`,
          value: showValue(formatPKR(f.total)),
          to: `/customers/${f.id}`,
        }))} emptyText="Kisi bill par farmer nahi laga" />
      </div>

      {creditList.length > 0 && !hideAmounts && (
        <section className="rounded-3xl bg-white dark:bg-slate-900 border-2 border-amber-200 dark:border-amber-500/30 shadow-sm overflow-hidden">
          <div className="px-4 py-3 border-b-2 border-amber-100 dark:border-amber-500/20 bg-amber-50 dark:bg-amber-500/10 flex items-center gap-2">
            <Wallet className="h-4 w-4 text-amber-600" />
            <h3 className="font-black text-amber-900 dark:text-amber-200">Jin se paisa lena hai — purana pehle</h3>
            <span className="ml-auto text-xs font-black text-amber-700 dark:text-amber-300 tabular-nums">
              {formatPKR(creditList.reduce((x: number, s: any) => x + Number(s.creditAmount || 0), 0))}
            </span>
          </div>
          <div className="divide-y divide-slate-100 dark:divide-slate-800 max-h-[420px] overflow-y-auto">
            {creditList.slice(0, 20).map((s: any) => (
              <div key={s.id} className="p-3 flex items-center gap-3">
                <span className="h-9 w-9 rounded-xl bg-amber-100 dark:bg-amber-500/20 flex items-center justify-center shrink-0">
                  <User className="h-4 w-4 text-amber-700 dark:text-amber-300" />
                </span>
                <div className="min-w-0 flex-1">
                  <div className="font-extrabold text-sm text-slate-900 dark:text-white truncate">
                    {s.customer?.name ?? 'Walk-in'}
                  </div>
                  <div className="text-[11px] font-bold text-slate-400 truncate">
                    {s.saleNumber} · {ago(s.soldAt)}
                  </div>
                </div>
                <span className="text-sm font-black tabular-nums text-amber-700 dark:text-amber-400 shrink-0">
                  {formatPKR(s.creditAmount)}
                </span>
              </div>
            ))}
          </div>
        </section>
      )}
    </div>
  );
}

/* ═════════════════════════════════════════════════════════════
   VOID — wajah likhna zaroori hai
   ═════════════════════════════════════════════════════════════ */
const VOID_REASONS = [
  'Ghalat cheez daal di',
  'Ghalat rate laga',
  'Farmer ne mana kar diya',
  'Do dafa bill ban gaya',
  'Ghalat farmer par laga',
];

function VoidModal({ sale, onClose, onConfirm, saving }: any) {
  const [reason, setReason] = useState('');
  const ok = reason.trim().length > 0;

  useEffect(() => {
    const prev = document.body.style.overflow;
    document.body.style.overflow = 'hidden';
    return () => { document.body.style.overflow = prev; };
  }, []);

  return (
    <div className="fixed inset-0 z-50 bg-slate-950/70 backdrop-blur-sm flex items-end sm:items-center justify-center p-0 sm:p-4" onClick={onClose}>
      <div className="w-full sm:max-w-md bg-white dark:bg-slate-900 rounded-t-3xl sm:rounded-3xl shadow-2xl overflow-hidden"
        onClick={(e) => e.stopPropagation()}>
        <div className="px-5 py-4 bg-gradient-to-br from-rose-600 to-red-700 text-white flex items-start justify-between gap-3">
          <div className="min-w-0">
            <div className="inline-flex items-center gap-1.5 rounded-full bg-white/20 px-2 py-0.5 text-[10px] font-extrabold">
              <Trash2 className="h-3 w-3" /> Bill void karein
            </div>
            <h3 className="font-extrabold text-lg mt-1.5 truncate font-mono">{sale.saleNumber}</h3>
            <div className="text-xs text-white/80 font-bold">
              {sale.customer?.name ?? 'Walk-in'} · {formatPKR(sale.total)}
            </div>
          </div>
          <button onClick={onClose} className="h-9 w-9 rounded-lg bg-white/20 hover:bg-white/30 flex items-center justify-center shrink-0 transition">
            <X className="h-4 w-4" />
          </button>
        </div>

        <div className="p-5 space-y-3">
          <div className="rounded-xl bg-emerald-50 dark:bg-emerald-500/10 border-2 border-emerald-200 dark:border-emerald-500/30 p-2.5 text-[11px] font-bold text-emerald-900 dark:text-emerald-200">
            Void karne par saara maal stock me wapas chala jayega, aur udhaar bhi khatam ho jayega.
          </div>

          <div>
            <label className="block text-[11px] font-black uppercase tracking-widest text-slate-500 mb-1.5">
              Wajah <span className="text-rose-500">*</span>
            </label>
            <textarea rows={2} autoFocus value={reason} onChange={(e) => setReason(e.target.value)}
              placeholder="Kyun void kar rahe hain…"
              className="w-full rounded-xl border-2 border-slate-200 dark:border-slate-700 bg-white dark:bg-slate-800 px-3 py-2 text-sm font-bold text-slate-900 dark:text-white placeholder:text-slate-400 focus:outline-none focus:border-rose-500 resize-none transition" />
          </div>

          <div className="flex flex-wrap gap-1.5">
            {VOID_REASONS.map((r) => (
              <button key={r} type="button" onClick={() => setReason(r)}
                className="px-2.5 py-1.5 rounded-lg bg-slate-100 dark:bg-slate-800 hover:bg-rose-50 dark:hover:bg-rose-500/15 text-[11px] font-extrabold text-slate-600 dark:text-slate-300 transition">
                {r}
              </button>
            ))}
          </div>

          <div className="flex gap-2 pt-1">
            <Button variant="secondary" className="flex-1" onClick={onClose}>Rehne do</Button>
            <Button className="flex-1 bg-rose-600 hover:bg-rose-700" disabled={!ok} loading={saving}
              onClick={() => onConfirm(reason.trim())}>
              <Trash2 className="h-4 w-4" /> Void karein
            </Button>
          </div>
        </div>
      </div>
    </div>
  );
}

/* ═════════════════════════════════════════════════════════════
   RECEIPT KI PASAND — hero ke button ke neeche khulta hai
   ─────────────────────────────────────────────────────────────
   Portal is liye ke hero `overflow-hidden` hai; andar rakha jaye
   to popover kat jata hai.
   ═════════════════════════════════════════════════════════════ */
function ReceiptPrefsPopover({ anchorRef, prefs, onChange, onClose }: any) {
  const [pos, setPos] = useState<{ top: number; left: number } | null>(null);

  useEffect(() => {
    const place = () => {
      const r = anchorRef.current?.getBoundingClientRect();
      if (!r) return;
      const width = 280;
      setPos({
        top: r.bottom + window.scrollY + 8,
        left: Math.max(8, Math.min(r.left + window.scrollX, window.innerWidth - width - 8)),
      });
    };
    place();
    window.addEventListener('resize', place);
    window.addEventListener('scroll', place, true);
    return () => { window.removeEventListener('resize', place); window.removeEventListener('scroll', place, true); };
  }, [anchorRef]);

  if (!pos) return null;

  return createPortal(
    <>
      <div className="fixed inset-0 z-40" onClick={onClose} />
      <div className="absolute z-50 w-[280px] rounded-2xl bg-white dark:bg-slate-900 border-2 border-slate-200 dark:border-slate-700 shadow-2xl p-3 space-y-3"
        style={{ top: pos.top, left: pos.left }}>
        <div className="flex items-center justify-between">
          <span className="text-[11px] font-black uppercase tracking-widest text-slate-500">Receipt ki settings</span>
          <button onClick={onClose} className="h-6 w-6 rounded-lg hover:bg-slate-100 dark:hover:bg-slate-800 flex items-center justify-center">
            <X className="h-3.5 w-3.5 text-slate-400" />
          </button>
        </div>

        <div>
          <div className="text-[10px] font-black uppercase tracking-widest text-slate-500 mb-1">Kaghaz ka naap</div>
          <div className="grid grid-cols-2 gap-1.5">
            {(['58', '80'] as const).map((w) => (
              <button key={w} onClick={() => onChange({ paperWidth: w })}
                className={`h-9 rounded-xl border-2 text-xs font-black transition ${
                  prefs.paperWidth === w ? 'border-emerald-500 bg-emerald-50 dark:bg-emerald-500/15 text-emerald-700 dark:text-emerald-300'
                    : 'border-slate-200 dark:border-slate-700 bg-white dark:bg-slate-800 text-slate-600 dark:text-slate-300'
                }`}>{w}mm</button>
            ))}
          </div>
        </div>

        <div>
          <div className="text-[10px] font-black uppercase tracking-widest text-slate-500 mb-1">Kitni tafseel</div>
          <div className="grid grid-cols-2 gap-1.5">
            {([['short', 'Chhota'], ['full', 'Poora']] as const).map(([m, l]) => (
              <button key={m} onClick={() => onChange({ mode: m })}
                className={`h-9 rounded-xl border-2 text-xs font-black transition ${
                  prefs.mode === m ? 'border-emerald-500 bg-emerald-50 dark:bg-emerald-500/15 text-emerald-700 dark:text-emerald-300'
                    : 'border-slate-200 dark:border-slate-700 bg-white dark:bg-slate-800 text-slate-600 dark:text-slate-300'
                }`}>{l}</button>
            ))}
          </div>
        </div>

        {([['autoPrint', 'Kholte hi print ho jaye'], ['showLogo', 'Logo dikhayein']] as const).map(([k, l]) => (
          <button key={k} onClick={() => onChange({ [k]: !prefs[k] })}
            className="w-full flex items-center justify-between gap-2 px-2.5 py-2 rounded-xl bg-slate-50 dark:bg-slate-800 hover:bg-slate-100 dark:hover:bg-slate-700 transition">
            <span className="text-[12px] font-extrabold text-slate-700 dark:text-slate-200">{l}</span>
            <span className={`h-5 w-9 rounded-full transition relative ${prefs[k] ? 'bg-emerald-600' : 'bg-slate-300 dark:bg-slate-600'}`}>
              <span className={`absolute top-0.5 h-4 w-4 rounded-full bg-white transition-all ${prefs[k] ? 'left-[1.15rem]' : 'left-0.5'}`} />
            </span>
          </button>
        ))}
      </div>
    </>,
    document.body,
  );
}

/* ═════════════════════════════════════════════════════════════
   CHHOTE HISSE
   ═════════════════════════════════════════════════════════════ */
function Kpi({ icon: Icon, label, value, sub, tone, highlight, onClick, active }: any) {
  const tones: Record<string, string> = {
    emerald: 'from-emerald-500 to-green-600 shadow-emerald-500/40',
    lime: 'from-lime-500 to-green-600 shadow-lime-500/40',
    amber: 'from-amber-500 to-orange-600 shadow-amber-500/40',
    rose: 'from-rose-500 to-rose-700 shadow-rose-500/40',
    sky: 'from-sky-500 to-blue-600 shadow-sky-500/40',
  };
  const Comp: any = onClick ? 'button' : 'div';
  return (
    <Comp onClick={onClick}
      className={[
        'rounded-2xl bg-white dark:bg-slate-900/80 border-2 p-3 sm:p-4 shadow-sm text-left w-full transition-all duration-200',
        onClick ? 'hover:-translate-y-0.5 hover:shadow-lg cursor-pointer active:scale-[0.98]' : '',
        active || highlight ? 'border-emerald-500 ring-2 ring-emerald-200 dark:ring-emerald-500/20'
          : 'border-slate-200 dark:border-slate-800 hover:border-slate-300 dark:hover:border-slate-700',
      ].join(' ')}>
      <div className="flex items-center justify-between gap-2">
        <div className="min-w-0">
          <div className="text-[10px] uppercase tracking-widest text-slate-500 dark:text-slate-400 font-extrabold">{label}</div>
          <div className="mt-1.5 text-xl sm:text-2xl font-extrabold text-slate-900 dark:text-white tabular-nums truncate">{value}</div>
          {sub && <div className="text-[10px] text-slate-500 dark:text-slate-400 font-bold mt-0.5 truncate">{sub}</div>}
        </div>
        <div className={`h-11 w-11 rounded-2xl bg-gradient-to-br ${tones[tone]} text-white flex items-center justify-center shadow-lg shrink-0`}>
          <Icon className="h-5 w-5" />
        </div>
      </div>
    </Comp>
  );
}

function MiniStat({ icon: Icon, label, value, sub, tone }: any) {
  const tones: Record<string, string> = {
    emerald: 'text-emerald-600 dark:text-emerald-400', lime: 'text-lime-600 dark:text-lime-400',
    amber: 'text-amber-600 dark:text-amber-400', rose: 'text-rose-600 dark:text-rose-400',
    sky: 'text-sky-600 dark:text-sky-400',
  };
  return (
    <div className="rounded-2xl bg-white dark:bg-slate-900 border-2 border-slate-200 dark:border-slate-800 p-4">
      <div className="flex items-center gap-1.5">
        <Icon className={`h-4 w-4 ${tones[tone] ?? tones.emerald}`} />
        <span className="text-[10px] font-black uppercase tracking-widest text-slate-500 truncate">{label}</span>
      </div>
      <div className="mt-1.5 text-lg font-black text-slate-900 dark:text-white tabular-nums break-words">{value}</div>
      {sub && <div className="text-[11px] font-bold text-slate-400 mt-0.5 truncate">{sub}</div>}
    </div>
  );
}

function ChartCard({ icon: Icon, title, wide, children }: any) {
  return (
    <section className={`rounded-3xl bg-white dark:bg-slate-900 border-2 border-slate-200 dark:border-slate-800 shadow-sm p-4 ${wide ? 'lg:col-span-2' : ''}`}>
      <h3 className="font-black text-slate-900 dark:text-white mb-3 flex items-center gap-2">
        <Icon className="h-4 w-4 text-emerald-600" /> {title}
      </h3>
      <div className="h-64">{children}</div>
    </section>
  );
}

function ListCard({ icon: Icon, title, rows, emptyText }: any) {
  return (
    <section className="rounded-3xl bg-white dark:bg-slate-900 border-2 border-slate-200 dark:border-slate-800 shadow-sm overflow-hidden">
      <div className="px-4 py-3 border-b-2 border-slate-100 dark:border-slate-800 flex items-center gap-2">
        <Icon className="h-4 w-4 text-emerald-600" />
        <h3 className="font-black text-slate-900 dark:text-white">{title}</h3>
      </div>
      {rows.length === 0 ? (
        <div className="p-8 text-center text-sm font-bold text-slate-400">{emptyText}</div>
      ) : (
        <div className="divide-y divide-slate-100 dark:divide-slate-800">
          {rows.map((r: any, i: number) => {
            const body = (
              <>
                <span className="h-8 w-8 rounded-xl bg-slate-100 dark:bg-slate-800 flex items-center justify-center text-xs font-black text-slate-500 shrink-0">
                  {i + 1}
                </span>
                <span className="min-w-0 flex-1">
                  <span className="block font-extrabold text-sm text-slate-900 dark:text-white truncate">{r.title}</span>
                  <span className="block text-[11px] font-bold text-slate-400 truncate">{r.sub}</span>
                </span>
                <span className="text-sm font-black tabular-nums text-slate-900 dark:text-white shrink-0">{r.value}</span>
              </>
            );
            return r.to ? (
              <Link key={r.key} to={r.to} className="p-3 flex items-center gap-3 hover:bg-slate-50 dark:hover:bg-slate-800/50 transition">
                {body}
              </Link>
            ) : (
              <div key={r.key} className="p-3 flex items-center gap-3">{body}</div>
            );
          })}
        </div>
      )}
    </section>
  );
}

function EmptyBox({ text }: { text: string }) {
  return <div className="h-full flex items-center justify-center"><p className="text-sm font-bold text-slate-400 text-center px-4">{text}</p></div>;
}

function Empty({ hasFilters, onClear, onGuide }: any) {
  return (
    <section className="rounded-3xl bg-white dark:bg-slate-900 border-2 border-dashed border-slate-300 dark:border-slate-700 p-10 sm:p-16 text-center">
      <div className="mx-auto h-20 w-20 rounded-3xl bg-gradient-to-br from-emerald-500 to-lime-700 flex items-center justify-center shadow-lg shadow-emerald-500/40">
        <Receipt className="h-10 w-10 text-white" />
      </div>
      <h3 className="mt-4 text-lg font-extrabold text-slate-900 dark:text-white">
        {hasFilters ? 'Is chaant par koi bill nahi' : 'Is muddat me koi bikri nahi'}
      </h3>
      <p className="text-sm text-slate-500 dark:text-slate-400 mt-1.5 font-semibold max-w-md mx-auto">
        {hasFilters ? 'Tareekh ya chaant badal kar dekhein' : 'POS se bikri karein, bill yahan aa jayega'}
      </p>
      <div className="mt-5 flex gap-2 justify-center flex-wrap">
        {hasFilters ? (
          <Button variant="secondary" onClick={onClear}><X className="h-4 w-4" /> Chaant hatao</Button>
        ) : (
          <>
            <button onClick={onGuide}
              className="h-11 px-4 rounded-xl bg-amber-100 dark:bg-amber-500/20 hover:bg-amber-200 text-amber-800 dark:text-amber-200 text-xs font-extrabold inline-flex items-center gap-1.5 border-2 border-amber-300 dark:border-amber-500/40 transition">
              <GraduationCap className="h-4 w-4" /> Pehle seekh lo
            </button>
            <Link to="/pos"
              className="h-11 px-4 rounded-xl bg-emerald-600 hover:bg-emerald-700 text-white text-xs font-extrabold inline-flex items-center gap-1.5 transition">
              <Package className="h-4 w-4" /> POS kholein
            </Link>
          </>
        )}
      </div>
    </section>
  );
}

function Teacher({ onClose }: { onClose: () => void }) {
  return (
    <div className="fixed inset-0 z-50 bg-black/60 backdrop-blur-sm flex items-end sm:items-center justify-center p-0 sm:p-3" onClick={onClose}>
      <div className="w-full max-w-lg max-h-[92vh] overflow-y-auto rounded-t-3xl sm:rounded-3xl bg-white dark:bg-slate-900 border-2 border-emerald-300 dark:border-emerald-500/40 shadow-2xl"
        onClick={(e) => e.stopPropagation()}>
        <div className="px-5 py-3 border-b-2 border-emerald-200 dark:border-emerald-500/30 bg-gradient-to-r from-emerald-50 to-lime-50 dark:from-emerald-500/15 dark:to-lime-500/15 flex items-center justify-between sticky top-0 z-10">
          <h3 className="font-extrabold text-emerald-900 dark:text-emerald-200 flex items-center gap-2">
            <GraduationCap className="h-5 w-5" /> Ye safha kya batata hai
          </h3>
          <button onClick={onClose} className="h-9 w-9 rounded-lg hover:bg-white dark:hover:bg-slate-800 flex items-center justify-center transition">
            <X className="h-4 w-4 text-slate-600 dark:text-slate-300" />
          </button>
        </div>
        <div className="p-5 space-y-3 text-sm">
          <Tip icon={Wallet} title="Udhaar — sab se pehle dekhein">
            Agri me aadhi se zyada bikri udhaar par jati hai. Ooper amber patti batati hai ke is
            muddat me kitna paisa bahar gaya. "Sirf udhaar" dabayein to wohi bill dikhenge, aur
            Analytics me "jin se paisa lena hai" ki list purane pehle aati hai.
          </Tip>
          <Tip icon={Layers} title="Qism ke hisab se">
            Beej, khaad, dawa, feed, auzaar — har ek ka margin bohat alag hota hai. Ooper ke
            paanch box par click karke sirf usi qism ke bill dekh sakte hain.
          </Tip>
          <Tip icon={Calendar} title="Mausam aur fasal">
            Analytics me "kis mausam ka maal bika" aur "kis fasal ka maal bika" — inhi se agle
            season ki kharidari tay hoti hai. Ye tab bharta hai jab product ke andar mausam aur
            fasal likhi ho.
          </Tip>
          <Tip icon={Printer} title="Bill print aur WhatsApp">
            Har bill par Print ka button. Ooper "Receipt" se kaghaz ka naap (58/80mm) aur kitni
            tafseel chahiye wo tay karein — yaad reh jata hai. Phone laga ho to WhatsApp par
            seedha bhej sakte hain.
          </Tip>
          <Tip icon={Undo2} title="Wapsi aur Void">
            <strong>Wapsi</strong> — kuch cheezein wapas aayin. <strong>Void</strong> — poora bill
            ghalat tha; maal stock me wapas, udhaar khatam. Void par wajah likhna zaroori hai.
          </Tip>
          <Tip icon={ScanLine} title="Bill dhoondna">
            B dabayein aur bill ka barcode scan karein — seedha wohi bill khul jata hai. Ya search
            me farmer ka naam, phone, ya fasal likh dein.
          </Tip>
          <div className="rounded-2xl bg-slate-50 dark:bg-slate-800 p-3">
            <div className="text-[10px] font-black uppercase tracking-widest text-slate-500 mb-2">Shortcuts</div>
            <div className="grid grid-cols-2 gap-1.5 text-[11px] font-bold text-slate-600 dark:text-slate-300">
              <div><kbd className="px-1.5 py-0.5 rounded bg-white dark:bg-slate-900 border">/</kbd> dhoondo</div>
              <div><kbd className="px-1.5 py-0.5 rounded bg-white dark:bg-slate-900 border">B</kbd> bill scan</div>
              <div><kbd className="px-1.5 py-0.5 rounded bg-white dark:bg-slate-900 border">A</kbd> analytics</div>
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
      <div className="h-8 w-8 rounded-xl bg-emerald-100 dark:bg-emerald-500/20 flex items-center justify-center shrink-0">
        <Icon className="h-4 w-4 text-emerald-600 dark:text-emerald-400" />
      </div>
      <div className="min-w-0">
        <div className="font-extrabold text-slate-900 dark:text-white text-[13px]">{title}</div>
        <p className="text-[12px] font-semibold text-slate-600 dark:text-slate-300 leading-snug">{children}</p>
      </div>
    </div>
  );
}
