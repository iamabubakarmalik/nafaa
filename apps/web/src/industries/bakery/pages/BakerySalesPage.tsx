import { useMemo, useState, useEffect, useRef } from 'react';
import { Link } from 'react-router-dom';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import {
  Receipt, TrendingUp, Search, X, RefreshCw, Package, User, Clock,
  Banknote, CreditCard, Smartphone, Building2, Zap, BookOpen, Award,
  BarChart3, CalendarRange, ChevronDown, GraduationCap, Printer,
  FileSpreadsheet, ScanLine, MessageCircle, Undo2, Trash2, Cake,
  ChefHat, Loader2, CheckCircle2, AlertTriangle, Eye, Timer,
} from 'lucide-react';
import {
  ResponsiveContainer, BarChart, Bar, XAxis, YAxis, Tooltip, CartesianGrid,
  PieChart, Pie, Cell, Legend, ComposedChart, Area, Line,
} from 'recharts';
import { toast } from 'sonner';
import { salesApi, type PaymentMethod } from '@modules/sales/sales/api/sales.api';
import { cakeOrdersApi } from '../api/cake-orders.api';
import BarcodeScanner from '@core/components/barcode/BarcodeScanner';
import { ReturnModal } from '@industries/retail/components/ReturnModal';
import { resolveTemplates, fillTemplate, waLink } from '@core/lib/whatsapp/templates';
import { settingsApi } from '@modules/organization/settings/api/settings.api';
import { formatPKR } from '@core/lib/format';
import { Button } from '@core/ui/Button';
import { useAuthStore } from '@core/stores/auth.store';
import { PrivacyToggle, useCostHidden } from '@/core/security/HiddenValue';

/* ═════════════════════════════════════════════════════════════
   BAKERY BIKRI — DIN KA POORA RECORD
   ─────────────────────────────────────────────────────────────
   Bakery ki bikri ka mizaj kiryana se alag hai: subah aur shaam
   do saaf rush hote hain, aur beech me dukaan khali. Is liye
   yahan "kis waqt bika" sirf sajawat nahi — usi se tay hota hai
   ke subah kitna banana hai aur shaam ka batch kitna rakhna hai.

   Sath hi cake orders alag ginte hain: wo counter ki bikri nahi,
   pehle se booked kaam hai — dono ko mila dena tasveer bigaar
   deta hai.
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

const GRID = '#94a3b8';
const AXIS = '#64748b';
const PIE_COLORS = ['#ec4899', '#8b5cf6', '#f59e0b', '#10b981', '#3b82f6', '#ef4444', '#14b8a6'];
const TOOLTIP = {
  borderRadius: 12, border: '2px solid #cbd5e1', background: '#ffffff',
  color: '#0f172a', fontWeight: 700, fontSize: 12,
};

const dayStart = (d: Date) => { const x = new Date(d); x.setHours(0, 0, 0, 0); return x; };
const dayEnd = (d: Date) => { const x = new Date(d); x.setHours(23, 59, 59, 999); return x; };
const dayKey = (d: Date) => `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}-${String(d.getDate()).padStart(2, '0')}`;
const fmtDT = (v: string) => new Intl.DateTimeFormat('en-PK', { dateStyle: 'medium', timeStyle: 'short' }).format(new Date(v));

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

export default function BakerySalesPage() {
  const qc = useQueryClient();
  const tenant = useAuthStore((s) => s.tenant);
  const shopName = useAuthStore((s) => s.user?.assignedShop?.name);
  const hideAmounts = useCostHidden();
  const searchRef = useRef<HTMLInputElement>(null);

  const [tab, setTab] = useState<Tab>('list');
  const [search, setSearch] = useState('');
  const [dateFilter, setDateFilter] = useState<DateFilter>('today');
  const [customStart, setCustomStart] = useState('');
  const [customEnd, setCustomEnd] = useState('');
  const [payFilter, setPayFilter] = useState<PaymentMethod | 'all'>('all');
  const [creditOnly, setCreditOnly] = useState(false);
  const [showDate, setShowDate] = useState(false);
  const [showMore, setShowMore] = useState(false);
  const [scannerOpen, setScannerOpen] = useState(false);
  const [showTeacher, setShowTeacher] = useState(false);
  const [voidTarget, setVoidTarget] = useState<any>(null);
  const [returnTarget, setReturnTarget] = useState<any>(null);

  const salesQ = useQuery({
    queryKey: ['sales-list'],
    queryFn: () => salesApi.list(),
  });

  const cakeQ = useQuery({
    queryKey: ['cake-orders'],
    queryFn: () => cakeOrdersApi.list({}).catch(() => []),
  });

  const settingsQ = useQuery({
    queryKey: ['settings'],
    queryFn: () => settingsApi.get(),
    staleTime: 60_000,
  });

  const templates = useMemo(
    () => resolveTemplates((settingsQ.data as any)?.settings?.whatsappTemplates),
    [settingsQ.data],
  );

  const voidMut = useMutation({
    mutationFn: ({ id, reason }: { id: string; reason: string }) => salesApi.voidSale(id, reason),
    onSuccess: () => {
      toast.success('Bill void ho gaya — stock wapas aa gaya');
      qc.invalidateQueries({ queryKey: ['sales-list'] });
      setVoidTarget(null);
    },
    onError: (e: any) => toast.error(e?.response?.data?.message || 'Void nahi hua'),
  });

  /* ── Date range ── */
  const range = useMemo(() => {
    const now = new Date();
    switch (dateFilter) {
      case 'today': return { from: dayStart(now), to: dayEnd(now), label: 'Aaj' };
      case 'yesterday': {
        const y = new Date(now); y.setDate(y.getDate() - 1);
        return { from: dayStart(y), to: dayEnd(y), label: 'Kal' };
      }
      case 'week': {
        const f = new Date(now); f.setDate(f.getDate() - 6);
        return { from: dayStart(f), to: dayEnd(now), label: 'Pichhle 7 din' };
      }
      case 'month': {
        const f = new Date(now); f.setDate(f.getDate() - 29);
        return { from: dayStart(f), to: dayEnd(now), label: 'Pichhle 30 din' };
      }
      case 'year': return { from: new Date(now.getFullYear(), 0, 1), to: dayEnd(now), label: 'Is saal' };
      case 'custom': {
        if (!customStart || !customEnd) return { from: null, to: null, label: 'Apni tareekh' };
        return {
          from: dayStart(new Date(customStart)), to: dayEnd(new Date(customEnd)),
          label: `${new Date(customStart).toLocaleDateString('en-PK')} — ${new Date(customEnd).toLocaleDateString('en-PK')}`,
        };
      }
      default: return { from: null, to: null, label: 'Sab' };
    }
  }, [dateFilter, customStart, customEnd]);

  /* ── Rows ── */
  const sales = salesQ.data ?? [];
  const q = search.trim().toLowerCase();

  const filtered = useMemo(() => {
    let out = sales;
    if (range.from && range.to) {
      out = out.filter((s: any) => {
        const t = new Date(s.soldAt).getTime();
        return t >= range.from!.getTime() && t <= range.to!.getTime();
      });
    }
    if (payFilter !== 'all') out = out.filter((s: any) => s.paymentMethod === payFilter);
    if (creditOnly) out = out.filter((s: any) => Number(s.creditAmount) > 0);
    if (q) out = out.filter((s: any) =>
      (s.saleNumber ?? '').toLowerCase().includes(q) ||
      (s.customer?.name ?? '').toLowerCase().includes(q) ||
      (s.items ?? []).some((i: any) => (i.product?.name ?? '').toLowerCase().includes(q)));
    return [...out].sort((a: any, b: any) => new Date(b.soldAt).getTime() - new Date(a.soldAt).getTime());
  }, [sales, range, payFilter, creditOnly, q]);

  /* ── Stats ── */
  const stats = useMemo(() => {
    const live = filtered.filter((s: any) => s.status !== 'VOIDED');
    const amount = live.reduce((x: number, s: any) => x + Number(s.total || 0), 0);
    const cogs = live.reduce((x: number, s: any) => x + Number(s.costOfGoods || 0), 0);
    const qty = live.reduce((x: number, s: any) => x + (s.items ?? []).reduce((y: number, i: any) => y + Number(i.quantity || 0), 0), 0);
    const profit = amount - cogs;
    return {
      count: live.length,
      voided: filtered.length - live.length,
      amount, cogs, profit, qty,
      margin: amount > 0 ? (profit / amount) * 100 : 0,
      paid: live.reduce((x: number, s: any) => x + Number(s.paidAmount || 0), 0),
      credit: live.reduce((x: number, s: any) => x + Number(s.creditAmount || 0), 0),
      creditCount: live.filter((s: any) => Number(s.creditAmount) > 0).length,
      avg: live.length > 0 ? amount / live.length : 0,
      best: [...live].sort((a: any, b: any) => Number(b.total) - Number(a.total))[0],
    };
  }, [filtered]);

  /* ── Cake orders is arse me ── */
  const cakeStats = useMemo(() => {
    const list = (cakeQ.data ?? []).filter((c: any) => {
      if (!range.from || !range.to) return true;
      const t = new Date(c.deliveredAt || c.createdAt).getTime();
      return t >= range.from.getTime() && t <= range.to.getTime();
    });
    const delivered = list.filter((c: any) => c.status === 'DELIVERED');
    return {
      count: delivered.length,
      value: delivered.reduce((s: number, c: any) => s + Number(c.total || 0), 0),
    };
  }, [cakeQ.data, range]);

  /* ── Charts ── */
  const hourly = useMemo(() => {
    const buckets = Array.from({ length: 24 }, (_, h) => ({ h, label: `${h % 12 === 0 ? 12 : h % 12}${h < 12 ? 'am' : 'pm'}`, bikri: 0, bill: 0 }));
    filtered.filter((s: any) => s.status !== 'VOIDED').forEach((s: any) => {
      const h = new Date(s.soldAt).getHours();
      buckets[h].bikri += Number(s.total || 0);
      buckets[h].bill += 1;
    });
    return buckets;
  }, [filtered]);

  const peak = useMemo(() => [...hourly].sort((a, b) => b.bikri - a.bikri)[0], [hourly]);

  const daily = useMemo(() => {
    const m = new Map<string, { bikri: number; munafa: number; bill: number }>();
    filtered.filter((s: any) => s.status !== 'VOIDED').forEach((s: any) => {
      const k = dayKey(new Date(s.soldAt));
      const e = m.get(k) ?? { bikri: 0, munafa: 0, bill: 0 };
      e.bikri += Number(s.total || 0);
      e.munafa += Number(s.total || 0) - Number(s.costOfGoods || 0);
      e.bill += 1;
      m.set(k, e);
    });
    return [...m.entries()].sort().slice(-30).map(([k, v]) => ({
      name: new Date(k).toLocaleDateString('en-PK', { day: 'numeric', month: 'short' }),
      bikri: Math.round(v.bikri), munafa: Math.round(v.munafa), bill: v.bill,
    }));
  }, [filtered]);

  const payPie = useMemo(() => {
    const m = new Map<string, number>();
    filtered.filter((s: any) => s.status !== 'VOIDED').forEach((s: any) => {
      m.set(s.paymentMethod, (m.get(s.paymentMethod) ?? 0) + Number(s.total || 0));
    });
    return [...m.entries()].map(([k, v]) => ({ name: PAY[k]?.label ?? k, value: Math.round(v), hex: PAY[k]?.hex ?? '#94a3b8' }));
  }, [filtered]);

  const topItems = useMemo(() => {
    const m = new Map<string, { qty: number; value: number }>();
    filtered.filter((s: any) => s.status !== 'VOIDED').forEach((s: any) => {
      (s.items ?? []).forEach((i: any) => {
        const k = i.product?.name ?? '—';
        const e = m.get(k) ?? { qty: 0, value: 0 };
        e.qty += Number(i.quantity || 0);
        e.value += Number(i.total ?? (Number(i.price || 0) * Number(i.quantity || 0)));
        m.set(k, e);
      });
    });
    return [...m.entries()].sort((a, b) => b[1].value - a[1].value).slice(0, 10)
      .map(([name, v]) => ({ name: name.slice(0, 14), value: Math.round(v.value), qty: v.qty }));
  }, [filtered]);

  const showValue = (v: string) => (hideAmounts ? '•••••' : v);

  /* ── Scan ── */
  const onScan = (code: string) => {
    setScannerOpen(false);
    const c = code.trim();
    if (!c) return;
    const hit = sales.find((s: any) => (s.saleNumber ?? '').toLowerCase() === c.toLowerCase());
    if (hit) {
      setSearch(hit.saleNumber);
      setDateFilter('all');
      setTab('list');
      toast.success(`Bill ${hit.saleNumber} mil gaya`);
    } else {
      toast.error(`"${c}" ka koi bill nahi mila`);
    }
  };

  /* ── WhatsApp ── */
  const sendWa = (s: any) => {
    const phone = s.customer?.phone;
    const msg = fillTemplate(templates.receipt, {
      shop: tenant?.name ?? 'Bakery',
      customer: s.customer?.name ?? 'Customer',
      invoice: s.saleNumber,
      total: formatPKR(s.total),
      paid: formatPKR(s.paidAmount),
      due: formatPKR(s.creditAmount),
      date: fmtDT(s.soldAt),
    });
    const link = waLink(phone, msg);
    if (!link) return toast.error('Is customer ka phone number nahi hai');
    window.open(link, '_blank');
  };

  /* ── CSV / print ── */
  const exportCsv = () => {
    const head = ['Bill', 'Tareekh', 'Customer', 'Cheezein', 'Total', 'Mila', 'Udhaar', 'Tareeqa', 'Halat'];
    const body = filtered.map((s: any) => [
      s.saleNumber, fmtDT(s.soldAt), s.customer?.name ?? 'Walk-in',
      (s.items ?? []).length, s.total, s.paidAmount, s.creditAmount,
      PAY[s.paymentMethod]?.label ?? s.paymentMethod, s.status,
    ]);
    const esc = (v: any) => `"${String(v ?? '').replace(/"/g, '""')}"`;
    const csv = [head, ...body].map((r) => r.map(esc).join(',')).join('\n');
    const url = URL.createObjectURL(new Blob(['﻿' + csv], { type: 'text/csv;charset=utf-8;' }));
    const a = document.createElement('a'); a.href = url;
    a.download = `bakery-bikri-${new Date().toISOString().slice(0, 10)}.csv`;
    a.click(); URL.revokeObjectURL(url);
    toast.success(`${filtered.length} bill CSV me`);
  };

  useEffect(() => {
    const onKey = (e: KeyboardEvent) => {
      if (e.key === 'Escape') {
        if (voidTarget) return setVoidTarget(null);
        if (returnTarget) return setReturnTarget(null);
        if (showTeacher) return setShowTeacher(false);
        return;
      }
      const t = document.activeElement?.tagName;
      if (t === 'INPUT' || t === 'TEXTAREA' || t === 'SELECT') return;
      if (e.key === '/') { e.preventDefault(); searchRef.current?.focus(); }
      if (e.key.toLowerCase() === 'a') setTab((x) => (x === 'analytics' ? 'list' : 'analytics'));
      if (e.key.toLowerCase() === 'b') { e.preventDefault(); setScannerOpen(true); }
      if (e.key.toLowerCase() === 'g') setShowTeacher(true);
      if (e.key.toLowerCase() === 'p') window.print();
    };
    window.addEventListener('keydown', onKey);
    return () => window.removeEventListener('keydown', onKey);
  }, [voidTarget, returnTarget, showTeacher]);

  const activeFilters = [payFilter !== 'all', creditOnly].filter(Boolean).length;

  return (
    <div className="space-y-4 sm:space-y-5 pb-10">
      <div className="hidden print:block mb-4">
        <h1 className="text-xl font-extrabold">{tenant?.name || 'Bakery'} — Bikri ka record</h1>
        <p className="text-xs text-slate-600">
          {shopName ? `${shopName} • ` : ''}{range.label} • {new Date().toLocaleString('en-PK', { dateStyle: 'full', timeStyle: 'short' })}
        </p>
        <p className="text-xs text-slate-600 mt-1">
          {stats.count} bill • Kul {formatPKR(stats.amount)} • Udhaar {formatPKR(stats.credit)}
        </p>
      </div>

      {/* ═══ HERO ═══ */}
      <section className="relative overflow-hidden rounded-3xl bg-gradient-to-br from-slate-950 via-pink-900 to-fuchsia-700 text-white p-5 sm:p-6 shadow-2xl print:hidden">
        <div className="absolute -top-24 -right-20 h-72 w-72 rounded-full bg-pink-400/25 blur-3xl" />
        <div className="absolute inset-0 opacity-[0.06]"
          style={{ backgroundImage: 'radial-gradient(circle at 1px 1px, #fff 1px, transparent 0)', backgroundSize: '22px 22px' }} />
        <div className="relative flex items-start justify-between gap-4 flex-wrap">
          <div className="min-w-0">
            <div className="inline-flex items-center gap-2 rounded-full bg-white/15 backdrop-blur px-3 py-1 text-[11px] font-black border border-white/25 uppercase tracking-widest">
              <Receipt className="h-3.5 w-3.5 text-amber-300" /> Bakery · Bikri
            </div>
            <h1 className="mt-3 text-2xl sm:text-3xl lg:text-4xl font-black leading-tight">🧾 Bikri ka Record</h1>
            <p className="mt-1.5 text-xs sm:text-sm font-bold text-white/90">
              {range.label} · <strong className="text-emerald-200">{stats.count}</strong> bill ·{' '}
              <strong>{showValue(formatPKR(stats.amount))}</strong>
              {stats.credit > 0 && <> · <span className="text-amber-200">{showValue(formatPKR(stats.credit))} udhaar</span></>}
            </p>
          </div>
          <div className="flex gap-2 flex-wrap items-center shrink-0">
            <PrivacyToggle compact />
            <button onClick={() => setScannerOpen(true)} title="Bill scan (B)"
              className="h-11 px-3 rounded-xl bg-white text-pink-700 hover:bg-pink-50 text-xs font-black inline-flex items-center gap-1.5 shadow-lg transition">
              <ScanLine className="h-4 w-4" /> <span className="hidden sm:inline">Bill scan</span>
            </button>
            <button onClick={() => setShowTeacher(true)}
              className="h-11 w-11 rounded-xl bg-amber-400/90 hover:bg-amber-400 text-slate-900 flex items-center justify-center shadow-lg transition">
              <GraduationCap className="h-4 w-4" />
            </button>
            <button onClick={exportCsv}
              className="h-11 w-11 rounded-xl bg-white/15 hover:bg-white/25 border border-white/25 flex items-center justify-center backdrop-blur transition">
              <FileSpreadsheet className="h-4 w-4" />
            </button>
            <button onClick={() => window.print()}
              className="h-11 w-11 rounded-xl bg-white/15 hover:bg-white/25 border border-white/25 flex items-center justify-center backdrop-blur transition">
              <Printer className="h-4 w-4" />
            </button>
            <button onClick={() => salesQ.refetch()} disabled={salesQ.isRefetching}
              className="h-11 w-11 rounded-xl bg-white/15 hover:bg-white/25 border border-white/25 flex items-center justify-center backdrop-blur disabled:opacity-50 transition">
              <RefreshCw className={`h-4 w-4 ${salesQ.isRefetching ? 'animate-spin' : ''}`} />
            </button>
          </div>
        </div>
      </section>

      {/* ═══ KPI ═══ */}
      <section className="grid grid-cols-2 lg:grid-cols-4 gap-3 print:hidden">
        <Kpi icon={Receipt} label="Bill" value={stats.count}
          sub={stats.voided > 0 ? `${stats.voided} void hue` : `${stats.qty.toFixed(0)} cheezein bikin`} tone="blue" />
        <Kpi icon={TrendingUp} label="Kul bikri" value={showValue(formatPKR(stats.amount))}
          sub={range.label} tone="emerald" />
        <Kpi icon={Award} label="Munafa" value={showValue(formatPKR(stats.profit))}
          sub={`${stats.margin.toFixed(1)}% margin`} tone="violet" />
        <Kpi icon={BookOpen} label="Udhaar" value={showValue(formatPKR(stats.credit))}
          sub={`${stats.creditCount} bill par baqi`} tone="amber"
          onClick={() => setCreditOnly(!creditOnly)} active={creditOnly} />
      </section>

      {/* ═══ BAKERY KI KHAAS BAAT ═══ */}
      {(peak?.bikri > 0 || cakeStats.count > 0) && (
        <section className="grid sm:grid-cols-2 gap-3 print:hidden">
          {peak?.bikri > 0 && (
            <div className="rounded-3xl bg-gradient-to-br from-amber-50 to-orange-50 dark:from-amber-500/10 dark:to-orange-500/10 border-2 border-amber-200 dark:border-amber-500/30 p-4 flex gap-3">
              <Clock className="h-5 w-5 text-amber-600 shrink-0 mt-0.5" />
              <div className="min-w-0">
                <h3 className="font-black text-amber-900 dark:text-amber-200 text-sm">Sab se masroof waqt: {peak.label}</h3>
                <p className="text-[12px] font-bold text-amber-800 dark:text-amber-300 mt-0.5">
                  Is ghante {peak.bill} bill aur {showValue(formatPKR(peak.bikri))} ki bikri. Is se
                  pehle wala batch tayyar hona chahiye — warna rush me maal khatam mil-ta hai.
                </p>
              </div>
            </div>
          )}
          {cakeStats.count > 0 && (
            <div className="rounded-3xl bg-gradient-to-br from-pink-50 to-fuchsia-50 dark:from-pink-500/10 dark:to-fuchsia-500/10 border-2 border-pink-200 dark:border-pink-500/30 p-4 flex gap-3">
              <Cake className="h-5 w-5 text-pink-600 shrink-0 mt-0.5" />
              <div className="min-w-0">
                <h3 className="font-black text-pink-900 dark:text-pink-200 text-sm">Cake orders alag</h3>
                <p className="text-[12px] font-bold text-pink-800 dark:text-pink-300 mt-0.5">
                  Is arse me <strong>{cakeStats.count}</strong> booked cake diye —{' '}
                  {showValue(formatPKR(cakeStats.value))}. Ye counter ki bikri me shaamil nahi.
                </p>
                <Link to="/bakery/cake-orders" className="text-[11px] font-black text-pink-700 dark:text-pink-300 mt-1 inline-block">
                  Cake orders dekhein →
                </Link>
              </div>
            </div>
          )}
        </section>
      )}

      {/* ═══ TABS ═══ */}
      <div className="grid grid-cols-2 gap-2 sm:gap-3 print:hidden">
        {([['list', 'Bill', Receipt], ['analytics', 'Analytics', BarChart3]] as const).map(([v, label, Icon]) => (
          <button key={v} onClick={() => setTab(v as Tab)}
            className={`h-14 rounded-2xl border-2 font-black text-sm inline-flex items-center justify-center gap-2 transition ${
              tab === v
                ? 'bg-gradient-to-r from-pink-500 to-fuchsia-600 text-white border-transparent shadow-lg'
                : 'bg-white dark:bg-slate-900 text-slate-600 dark:text-slate-300 border-slate-200 dark:border-slate-800 hover:border-pink-400'
            }`}>
            <Icon className="h-4 w-4" /> {label}
            {v === 'list' && (
              <span className={`text-[10px] px-1.5 py-0.5 rounded-lg ${tab === v ? 'bg-white/25' : 'bg-slate-100 dark:bg-slate-800'}`}>{filtered.length}</span>
            )}
          </button>
        ))}
      </div>

      {/* ═══ FILTERS ═══ */}
      <section className="rounded-3xl bg-white dark:bg-slate-900 border-2 border-slate-200 dark:border-slate-800 shadow-sm p-3 sm:p-4 space-y-3 print:hidden">
        <div className="flex gap-2 flex-wrap items-center">
          <div className="relative flex-1 min-w-[220px]">
            <Search className="h-5 w-5 text-slate-400 absolute left-3.5 top-1/2 -translate-y-1/2 pointer-events-none" />
            <input ref={searchRef} value={search} onChange={(e) => setSearch(e.target.value)}
              placeholder="Bill #, customer, cheez… (/ dabao)"
              className="h-12 w-full rounded-2xl border-2 border-slate-200 dark:border-slate-700 bg-white dark:bg-slate-800 pl-11 pr-10 text-sm font-bold text-slate-900 dark:text-white focus:outline-none focus:border-pink-500 transition" />
            {search && (
              <button onClick={() => setSearch('')} className="absolute right-3 top-1/2 -translate-y-1/2 h-7 w-7 rounded-lg hover:bg-slate-100 dark:hover:bg-slate-700 flex items-center justify-center">
                <X className="h-4 w-4 text-slate-400" />
              </button>
            )}
          </div>

          <div className="relative">
            <button onClick={() => { setShowDate((v) => !v); setShowMore(false); }}
              className={`h-12 px-4 rounded-2xl border-2 text-sm font-black inline-flex items-center gap-2 transition ${
                dateFilter !== 'today'
                  ? 'border-pink-500 bg-pink-50 dark:bg-pink-500/15 text-pink-700 dark:text-pink-300'
                  : 'border-slate-200 dark:border-slate-700 bg-white dark:bg-slate-800 text-slate-700 dark:text-slate-200 hover:border-pink-400'
              }`}>
              <CalendarRange className="h-4 w-4" />
              <span className="max-w-[140px] truncate">{DATE_OPTS.find(([v]) => v === dateFilter)?.[1]}</span>
              <ChevronDown className={`h-3.5 w-3.5 transition ${showDate ? 'rotate-180' : ''}`} />
            </button>
            {showDate && (
              <>
                <div className="fixed inset-0 z-30" onClick={() => setShowDate(false)} />
                <div className="absolute right-0 z-40 mt-2 w-60 rounded-2xl bg-white dark:bg-slate-900 border-2 border-slate-200 dark:border-slate-700 shadow-2xl p-2">
                  {DATE_OPTS.map(([v, l]) => (
                    <button key={v} onClick={() => { setDateFilter(v); if (v !== 'custom') setShowDate(false); }}
                      className={`w-full text-left px-3 py-2 rounded-xl text-sm font-bold transition ${
                        dateFilter === v ? 'bg-pink-100 dark:bg-pink-500/20 text-pink-700 dark:text-pink-300' : 'hover:bg-slate-100 dark:hover:bg-slate-800 text-slate-700 dark:text-slate-200'
                      }`}>{l}</button>
                  ))}
                  {dateFilter === 'custom' && (
                    <div className="p-2 space-y-2 border-t-2 border-slate-100 dark:border-slate-800 mt-1">
                      <input type="date" value={customStart} onChange={(e) => setCustomStart(e.target.value)}
                        className="h-10 w-full rounded-xl border-2 border-slate-200 dark:border-slate-700 bg-white dark:bg-slate-800 px-2 text-xs font-bold text-slate-900 dark:text-white [color-scheme:light] dark:[color-scheme:dark]" />
                      <input type="date" value={customEnd} onChange={(e) => setCustomEnd(e.target.value)}
                        className="h-10 w-full rounded-xl border-2 border-slate-200 dark:border-slate-700 bg-white dark:bg-slate-800 px-2 text-xs font-bold text-slate-900 dark:text-white [color-scheme:light] dark:[color-scheme:dark]" />
                    </div>
                  )}
                </div>
              </>
            )}
          </div>

          <div className="relative">
            <button onClick={() => { setShowMore((v) => !v); setShowDate(false); }}
              className={`h-12 px-4 rounded-2xl border-2 text-sm font-black inline-flex items-center gap-2 transition ${
                activeFilters > 0
                  ? 'border-pink-500 bg-pink-50 dark:bg-pink-500/15 text-pink-700 dark:text-pink-300'
                  : 'border-slate-200 dark:border-slate-700 bg-white dark:bg-slate-800 text-slate-700 dark:text-slate-200 hover:border-pink-400'
              }`}>
              Chaant
              {activeFilters > 0 && <span className="text-[10px] px-1.5 py-0.5 rounded-lg bg-pink-600 text-white">{activeFilters}</span>}
              <ChevronDown className={`h-3.5 w-3.5 transition ${showMore ? 'rotate-180' : ''}`} />
            </button>
            {showMore && (
              <>
                <div className="fixed inset-0 z-30" onClick={() => setShowMore(false)} />
                <div className="absolute right-0 z-40 mt-2 w-60 rounded-2xl bg-white dark:bg-slate-900 border-2 border-slate-200 dark:border-slate-700 shadow-2xl p-3 space-y-2">
                  <div className="text-[10px] font-black uppercase tracking-widest text-slate-500">Paisa kaise aaya</div>
                  <div className="grid grid-cols-2 gap-1.5">
                    <button onClick={() => setPayFilter('all')}
                      className={`h-9 rounded-lg text-[11px] font-black transition ${payFilter === 'all' ? 'bg-pink-600 text-white' : 'bg-slate-100 dark:bg-slate-800 text-slate-600 dark:text-slate-300'}`}>Sab</button>
                    {Object.entries(PAY).map(([k, v]) => (
                      <button key={k} onClick={() => setPayFilter(k as PaymentMethod)}
                        className={`h-9 rounded-lg text-[11px] font-black transition ${payFilter === k ? 'bg-pink-600 text-white' : 'bg-slate-100 dark:bg-slate-800 text-slate-600 dark:text-slate-300'}`}>{v.label}</button>
                    ))}
                  </div>
                  <button onClick={() => setCreditOnly((v) => !v)}
                    className={`w-full h-10 rounded-xl text-xs font-black transition ${creditOnly ? 'bg-amber-500 text-white' : 'bg-slate-100 dark:bg-slate-800 text-slate-600 dark:text-slate-300'}`}>
                    Sirf udhaar wale
                  </button>
                </div>
              </>
            )}
          </div>
        </div>
      </section>

      {salesQ.isLoading ? (
        <div className="flex items-center justify-center py-24">
          <div className="h-12 w-12 rounded-full border-4 border-pink-200 border-t-pink-600 animate-spin" />
        </div>
      ) : tab === 'analytics' ? (
        <div className="space-y-4">
          <div className="grid lg:grid-cols-2 gap-4">
            <ChartCard icon={Clock} title="Kis waqt bika — bakery ka rush">
              {hourly.some((h) => h.bikri > 0) ? (
                <ResponsiveContainer width="100%" height="100%">
                  <BarChart data={hourly.filter((h) => h.bikri > 0 || (h.h >= 6 && h.h <= 22))}>
                    <CartesianGrid strokeDasharray="3 3" stroke={GRID} vertical={false} />
                    <XAxis dataKey="label" stroke={AXIS} fontSize={9} interval={1} />
                    <YAxis stroke={AXIS} fontSize={11} width={70} tickFormatter={(v) => Number(v).toLocaleString('en-PK')} />
                    <Tooltip contentStyle={TOOLTIP} formatter={(v: any) => [formatPKR(Number(v)), 'Bikri']} />
                    <Bar dataKey="bikri" radius={[6, 6, 0, 0]}>
                      {hourly.filter((h) => h.bikri > 0 || (h.h >= 6 && h.h <= 22)).map((h, i) => (
                        <Cell key={i} fill={h.h === peak?.h ? '#ec4899' : '#f59e0b'} />
                      ))}
                    </Bar>
                  </BarChart>
                </ResponsiveContainer>
              ) : <EmptyBox text="Is arse me koi bikri nahi" />}
            </ChartCard>

            <ChartCard icon={Package} title="Sab se zyada kya bika">
              {topItems.length > 0 ? (
                <ResponsiveContainer width="100%" height="100%">
                  <BarChart data={topItems}>
                    <CartesianGrid strokeDasharray="3 3" stroke={GRID} vertical={false} />
                    <XAxis dataKey="name" stroke={AXIS} fontSize={10} fontWeight={700} interval={0} angle={-20} textAnchor="end" height={60} />
                    <YAxis stroke={AXIS} fontSize={11} width={78} tickFormatter={(v) => Number(v).toLocaleString('en-PK')} />
                    <Tooltip contentStyle={TOOLTIP} formatter={(v: any) => [formatPKR(Number(v)), 'Bikri']} />
                    <Bar dataKey="value" fill="#8b5cf6" radius={[8, 8, 0, 0]} maxBarSize={48} />
                  </BarChart>
                </ResponsiveContainer>
              ) : <EmptyBox />}
            </ChartCard>

            <ChartCard icon={TrendingUp} title="Roz ki bikri aur munafa" wide>
              {daily.length > 0 ? (
                <ResponsiveContainer width="100%" height="100%">
                  <ComposedChart data={daily}>
                    <defs>
                      <linearGradient id="bkSale" x1="0" y1="0" x2="0" y2="1">
                        <stop offset="5%" stopColor="#ec4899" stopOpacity={0.35} />
                        <stop offset="95%" stopColor="#ec4899" stopOpacity={0} />
                      </linearGradient>
                    </defs>
                    <CartesianGrid strokeDasharray="3 3" stroke={GRID} vertical={false} />
                    <XAxis dataKey="name" stroke={AXIS} fontSize={10} fontWeight={700} />
                    <YAxis stroke={AXIS} fontSize={11} width={78} tickFormatter={(v) => Number(v).toLocaleString('en-PK')} />
                    <Tooltip contentStyle={TOOLTIP}
                      formatter={(v: any, n: any) => [n === 'bill' ? v : formatPKR(Number(v)), n === 'bikri' ? 'Bikri' : n === 'munafa' ? 'Munafa' : 'Bill']} />
                    <Legend formatter={(v) => (v === 'bikri' ? 'Bikri' : v === 'munafa' ? 'Munafa' : 'Bill')} />
                    <Area type="monotone" dataKey="bikri" stroke="#ec4899" strokeWidth={3} fill="url(#bkSale)" />
                    <Line type="monotone" dataKey="munafa" stroke="#10b981" strokeWidth={3} dot={{ r: 3, strokeWidth: 0, fill: '#10b981' }} />
                  </ComposedChart>
                </ResponsiveContainer>
              ) : <EmptyBox />}
            </ChartCard>

            <ChartCard icon={Banknote} title="Paisa kaise aaya">
              {payPie.length > 0 ? (
                <ResponsiveContainer width="100%" height="100%">
                  <PieChart>
                    <Pie data={payPie} dataKey="value" nameKey="name" innerRadius={55} outerRadius={90} paddingAngle={3}>
                      {payPie.map((p, i) => <Cell key={i} fill={p.hex ?? PIE_COLORS[i % PIE_COLORS.length]} />)}
                    </Pie>
                    <Tooltip contentStyle={TOOLTIP} formatter={(v: any) => formatPKR(Number(v))} />
                    <Legend />
                  </PieChart>
                </ResponsiveContainer>
              ) : <EmptyBox />}
            </ChartCard>

            <ChartCard icon={Award} title="Din ka khulasa">
              <div className="space-y-2.5 pt-2">
                <Sum label="Kul bikri" value={showValue(formatPKR(stats.amount))} />
                <Sum label="Lagat" value={showValue(formatPKR(stats.cogs))} />
                <Sum label="Munafa" value={showValue(formatPKR(stats.profit))} tone="emerald" />
                <Sum label="Ausat bill" value={showValue(formatPKR(stats.avg))} />
                <Sum label="Sab se bara bill" value={showValue(formatPKR(stats.best?.total ?? 0))} />
                <Sum label="Udhaar gaya" value={showValue(formatPKR(stats.credit))} tone="amber" />
              </div>
            </ChartCard>
          </div>
        </div>
      ) : filtered.length === 0 ? (
        <div className="rounded-3xl bg-white dark:bg-slate-900 border-4 border-dashed border-slate-200 dark:border-slate-700 p-10 sm:p-14 text-center">
          <Receipt className="h-12 w-12 text-slate-400 mx-auto" />
          <p className="mt-4 font-black text-slate-800 dark:text-slate-100 text-lg sm:text-xl">
            {search ? 'Koi bill nahi mila' : `${range.label} me koi bikri nahi`}
          </p>
          <p className="text-xs sm:text-sm text-slate-500 dark:text-slate-400 font-bold mt-1.5">
            {search ? `"${search}" se kuch nahi mila` : 'Counter par pehli bikri karein'}
          </p>
          <Link to="/pos" className="mt-4 h-11 px-4 rounded-xl bg-pink-600 hover:bg-pink-700 text-white text-sm font-black inline-flex items-center gap-2 transition">
            <Receipt className="h-4 w-4" /> Counter kholein
          </Link>
        </div>
      ) : (
        <section className="space-y-2">
          {filtered.map((s: any) => {
            const pay = PAY[s.paymentMethod] ?? PAY.CASH;
            const voided = s.status === 'VOIDED';
            const returned = s.status === 'FULLY_RETURNED' || s.status === 'PARTIALLY_RETURNED';
            return (
              <div key={s.id}
                className={`rounded-2xl bg-white dark:bg-slate-900 border-2 shadow-sm p-3 sm:p-4 avoid-break ${
                  voided ? 'border-rose-200 dark:border-rose-500/30 opacity-70' : 'border-slate-200 dark:border-slate-800'
                }`}>
                <div className="flex items-center gap-3 flex-wrap">
                  <span className={`h-11 w-11 rounded-2xl flex items-center justify-center shrink-0 ${
                    voided ? 'bg-rose-100 dark:bg-rose-500/20' : 'bg-pink-100 dark:bg-pink-500/20'
                  }`}>
                    <Receipt className={`h-5 w-5 ${voided ? 'text-rose-600' : 'text-pink-600 dark:text-pink-400'}`} />
                  </span>

                  <div className="min-w-0 flex-1">
                    <div className="flex items-center gap-1.5 flex-wrap">
                      <Link to={`/sales/${s.id}/receipt`} className="font-extrabold text-sm text-slate-900 dark:text-white hover:text-pink-600">
                        {s.saleNumber}
                      </Link>
                      <span className={`text-[9px] font-black uppercase px-1.5 py-0.5 rounded-md ${pay.chip}`}>{pay.label}</span>
                      {voided && <span className="text-[9px] font-black uppercase px-1.5 py-0.5 rounded-md bg-rose-600 text-white">Void</span>}
                      {returned && <span className="text-[9px] font-black uppercase px-1.5 py-0.5 rounded-md bg-amber-500 text-white">Wapsi hui</span>}
                      {Number(s.creditAmount) > 0 && (
                        <span className="text-[9px] font-black uppercase px-1.5 py-0.5 rounded-md bg-amber-100 dark:bg-amber-500/20 text-amber-700 dark:text-amber-300">Udhaar</span>
                      )}
                    </div>
                    <div className="text-[11px] font-bold text-slate-400 mt-0.5 truncate">
                      <User className="h-3 w-3 inline" /> {s.customer?.name ?? 'Walk-in'} ·{' '}
                      {(s.items ?? []).length} cheezein · {ago(s.soldAt)}
                    </div>
                  </div>

                  <div className="text-right shrink-0">
                    <div className="text-lg font-black text-slate-900 dark:text-white tabular-nums">{showValue(formatPKR(s.total))}</div>
                    {Number(s.creditAmount) > 0 && (
                      <div className="text-[11px] font-black text-amber-600 tabular-nums">{showValue(formatPKR(s.creditAmount))} baqi</div>
                    )}
                  </div>
                </div>

                {!voided && (
                  <div className="mt-2.5 flex gap-1.5 flex-wrap print:hidden">
                    <Link to={`/sales/${s.id}/receipt`}
                      className="h-9 px-3 rounded-xl bg-pink-600 hover:bg-pink-700 text-white text-[11px] font-black inline-flex items-center gap-1.5 transition">
                      <Eye className="h-3.5 w-3.5" /> Bill dekhein
                    </Link>
                    {s.customer?.phone && (
                      <button onClick={() => sendWa(s)}
                        className="h-9 px-3 rounded-xl bg-emerald-50 dark:bg-emerald-500/15 text-emerald-700 dark:text-emerald-300 text-[11px] font-black inline-flex items-center gap-1.5 transition">
                        <MessageCircle className="h-3.5 w-3.5" /> WhatsApp
                      </button>
                    )}
                    <button onClick={() => setReturnTarget(s)}
                      className="h-9 px-3 rounded-xl border-2 border-amber-200 dark:border-amber-500/30 text-amber-700 dark:text-amber-400 text-[11px] font-black inline-flex items-center gap-1.5 hover:bg-amber-50 dark:hover:bg-amber-500/10 transition">
                      <Undo2 className="h-3.5 w-3.5" /> Wapsi
                    </button>
                    <button onClick={() => setVoidTarget(s)}
                      className="h-9 px-3 rounded-xl border-2 border-rose-200 dark:border-rose-500/30 text-rose-600 dark:text-rose-400 text-[11px] font-black inline-flex items-center gap-1.5 hover:bg-rose-50 dark:hover:bg-rose-500/10 ml-auto transition">
                      <Trash2 className="h-3.5 w-3.5" /> Void
                    </button>
                  </div>
                )}
              </div>
            );
          })}
        </section>
      )}

      {scannerOpen && (
        <BarcodeScanner onDetected={onScan} onClose={() => setScannerOpen(false)}
          title="Bill scan karein" hint="Purane bill ka barcode camera ke samne rakhein" />
      )}

      {returnTarget && (
        <ReturnModal sale={returnTarget} onClose={() => setReturnTarget(null)}
          onDone={() => { setReturnTarget(null); qc.invalidateQueries({ queryKey: ['sales-list'] }); }} />
      )}

      {voidTarget && (
        <VoidModal sale={voidTarget} pending={voidMut.isPending}
          onClose={() => setVoidTarget(null)}
          onConfirm={(reason: string) => voidMut.mutate({ id: voidTarget.id, reason })} />
      )}

      {showTeacher && <Teacher onClose={() => setShowTeacher(false)} />}
    </div>
  );
}

/* ═══ VOID ═══ */
function VoidModal({ sale, pending, onClose, onConfirm }: any) {
  const [reason, setReason] = useState('');
  return (
    <div className="fixed inset-0 z-50 bg-black/60 backdrop-blur-sm flex items-end sm:items-center justify-center p-3" onClick={onClose}>
      <div className="w-full max-w-sm rounded-3xl bg-white dark:bg-slate-900 border-2 border-rose-300 dark:border-rose-500/40 shadow-2xl p-5" onClick={(e) => e.stopPropagation()}>
        <div className="h-12 w-12 rounded-2xl bg-rose-100 dark:bg-rose-500/20 flex items-center justify-center mx-auto">
          <Trash2 className="h-6 w-6 text-rose-600" />
        </div>
        <h3 className="mt-3 text-center font-black text-slate-900 dark:text-white text-lg">Bill void karein?</h3>
        <p className="mt-1 text-center text-sm font-bold text-slate-500 dark:text-slate-400">
          <strong>{sale.saleNumber}</strong> — {formatPKR(sale.total)}
        </p>
        <div className="mt-3 rounded-2xl bg-amber-50 dark:bg-amber-500/10 border-2 border-amber-200 dark:border-amber-500/30 p-3 flex gap-2">
          <AlertTriangle className="h-4 w-4 text-amber-600 shrink-0 mt-0.5" />
          <p className="text-[11px] font-bold text-amber-900 dark:text-amber-200">
            Void ka matlab: <strong>ye bikri hui hi nahi thi</strong> — stock wapas aa jayega aur
            report se nikal jayegi. Agar customer ne cheez asal me wapas ki hai to
            <strong> "Wapsi"</strong> istemal karein, void nahi.
          </p>
        </div>
        <input value={reason} onChange={(e) => setReason(e.target.value)} autoFocus
          placeholder="Wajah likhein — ghalti se bana, demo bill…"
          className="mt-3 h-11 w-full rounded-xl border-2 border-slate-200 dark:border-slate-700 bg-white dark:bg-slate-800 px-3 text-sm font-bold text-slate-900 dark:text-white focus:outline-none focus:border-rose-500" />
        <div className="mt-4 flex gap-2">
          <Button variant="secondary" className="flex-1" onClick={onClose}>Rehne dein</Button>
          <Button className="flex-[2] bg-rose-600 hover:bg-rose-700" disabled={!reason.trim() || pending}
            loading={pending} onClick={() => onConfirm(reason.trim())}>
            Haan, void karein
          </Button>
        </div>
      </div>
    </div>
  );
}

/* ═══ CHHOTE HISSE ═══ */
function Kpi({ icon: Icon, label, value, sub, tone, onClick, active }: any) {
  const tones: Record<string, string> = {
    emerald: 'from-emerald-500 to-green-600 shadow-emerald-500/40',
    blue: 'from-blue-500 to-blue-700 shadow-blue-500/40',
    violet: 'from-violet-500 to-purple-600 shadow-violet-500/40',
    amber: 'from-amber-500 to-orange-600 shadow-amber-500/40',
  };
  const Comp: any = onClick ? 'button' : 'div';
  return (
    <Comp onClick={onClick}
      className={[
        'rounded-2xl border-2 p-4 shadow-sm text-left w-full transition-all',
        onClick ? 'hover:-translate-y-0.5 hover:shadow-md cursor-pointer' : '',
        active
          ? 'border-amber-500 ring-2 ring-amber-200 dark:ring-amber-500/20 bg-amber-50 dark:bg-amber-500/10'
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

function ChartCard({ icon: Icon, title, wide, children }: any) {
  return (
    <section className={`rounded-3xl bg-white dark:bg-slate-900 border-2 border-slate-200 dark:border-slate-800 shadow-sm p-4 ${wide ? 'lg:col-span-2' : ''}`}>
      <h3 className="font-black text-slate-900 dark:text-white mb-3 flex items-center gap-2">
        <Icon className="h-4 w-4 text-pink-600" /> {title}
      </h3>
      <div className="h-64">{children}</div>
    </section>
  );
}

function Sum({ label, value, tone }: any) {
  const tones: Record<string, string> = {
    emerald: 'text-emerald-600 dark:text-emerald-400',
    amber: 'text-amber-600 dark:text-amber-400',
  };
  return (
    <div className="flex items-center justify-between border-b border-slate-100 dark:border-slate-800 pb-2 last:border-0">
      <span className="text-[12px] font-bold text-slate-500 dark:text-slate-400">{label}</span>
      <span className={`text-sm font-black tabular-nums ${tone ? tones[tone] : 'text-slate-900 dark:text-white'}`}>{value}</span>
    </div>
  );
}

function EmptyBox({ text }: { text?: string }) {
  return <div className="h-full flex items-center justify-center"><p className="text-sm font-bold text-slate-400 text-center px-4">{text ?? 'Abhi dikhane ko kuch nahi'}</p></div>;
}

function Teacher({ onClose }: { onClose: () => void }) {
  return (
    <div className="fixed inset-0 z-50 bg-black/60 backdrop-blur-sm flex items-end sm:items-center justify-center p-3" onClick={onClose}>
      <div className="w-full max-w-lg max-h-[90vh] overflow-y-auto rounded-3xl bg-white dark:bg-slate-900 border-2 border-pink-300 dark:border-pink-500/40 shadow-2xl" onClick={(e) => e.stopPropagation()}>
        <div className="px-5 py-3 border-b-2 border-pink-200 dark:border-pink-500/30 bg-gradient-to-r from-pink-50 to-fuchsia-50 dark:from-pink-500/15 dark:to-fuchsia-500/15 flex items-center justify-between sticky top-0 z-10">
          <h3 className="font-extrabold text-pink-900 dark:text-pink-200 flex items-center gap-2">
            <GraduationCap className="h-5 w-5" /> Bikri ka safha
          </h3>
          <button onClick={onClose} className="h-8 w-8 rounded-lg hover:bg-white dark:hover:bg-slate-800 flex items-center justify-center">
            <X className="h-4 w-4 text-slate-600 dark:text-slate-300" />
          </button>
        </div>
        <div className="p-5 space-y-3 text-sm">
          <Tip icon={ScanLine} title="Purana bill dhoondna">
            Customer purana bill le kar aaye to <strong>B</strong> dabayein aur us ka barcode
            scan karein — bill foran saamne aa jayega.
          </Tip>
          <Tip icon={Undo2} title="Wapsi aur Void — alag cheezein">
            <strong>Wapsi</strong>: customer ne cheez asal me wapas ki, paisa golak se gaya.
            <strong> Void</strong>: bill banna hi nahi chahiye tha (demo ya ghalti). Void se bill
            report se nikal jata hai, wapsi ka apna record rehta hai.
          </Tip>
          <Tip icon={Clock} title="Kis waqt bika">
            Bakery ke do rush hote hain. Analytics me dekhein kaunsa ghanta sab se bhara hai —
            us se <strong>pehle</strong> batch tayyar hona chahiye.
          </Tip>
          <Tip icon={Cake} title="Cake orders alag hain">
            Booked cake counter ki bikri me nahi ginte. Upar unki alag patti aa jati hai taake
            tasveer saaf rahe.
          </Tip>
          <Tip icon={MessageCircle} title="WhatsApp">
            Jis customer ka number saved hai uske saamne button aa jata hai — bill ka paighaam
            pehle se likha hua jata hai. Settings me apne alfaz likh sakte hain.
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
