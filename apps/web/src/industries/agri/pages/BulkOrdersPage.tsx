import { useMemo, useState, useEffect, useRef } from 'react';
import { Link } from 'react-router-dom';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import {
  Package, Plus, Search, X, RefreshCw, Clock, User, Phone, Tractor,
  CheckCircle2, ArrowRight, MapPin, Calendar, DollarSign, Ban, Truck,
  TrendingUp, GraduationCap, FileSpreadsheet, Printer, BarChart3,
  AlertTriangle, Wheat, Layers, MessageCircle, Copy, Scissors, Wallet,
} from 'lucide-react';
import {
  ResponsiveContainer, BarChart, Bar, XAxis, YAxis, Tooltip, CartesianGrid,
  PieChart, Pie, Cell, Legend,
} from 'recharts';
import { toast } from 'sonner';
import { bulkOrdersApi, type OrderStatus, type BulkOrder } from '../api/bulk-orders.api';
import { formatPKR } from '@core/lib/format';
import { Button } from '@core/ui/Button';
import { useAuthStore } from '@core/stores/auth.store';

/* ═════════════════════════════════════════════════════════════
   BARE ORDER — BORI ME MAAL, AKSAR UDHAAR PAR
   ─────────────────────────────────────────────────────────────
   Agri ka bara sauda aam dukaan ke sauday jaisa nahi hota. Farmer
   50 bori urea le jata hai — aur aksar UDHAAR par, is waada par
   ke katai ke baad paisa dega.

   Yani dukaan-daar ka paisa do jagah phansa hota hai:
     1. Maal jo tayyar ho kar bhejne ka intezaar kar raha hai.
     2. Paisa jo farmer ke paas hai aur katai tak nahi aayega.

   Dusra wala bara masla hai. Ek dukaan ka aadha sarmaya isi tarah
   bahar para hota hai aur us ka koi hisab nahi hota.

   Is liye ye safha sab se ooper wohi dikhata hai: **kitna paisa
   bahar hai** aur **kaunsi delivery aaj honi hai**.
   ═════════════════════════════════════════════════════════════ */

type Tab = 'orders' | 'board' | 'analytics';

const STATUS: Record<OrderStatus, {
  label: string; hint: string; color: string; pill: string; next?: OrderStatus; nextLabel?: string;
}> = {
  DRAFT: {
    label: 'Adhoora', hint: 'Abhi poora nahi hua', color: 'bg-slate-500',
    pill: 'bg-slate-200 dark:bg-slate-700 text-slate-600 dark:text-slate-300',
    next: 'CONFIRMED', nextLabel: 'Pakka karein',
  },
  PENDING: {
    label: 'Intezaar me', hint: 'Farmer ke jawab ka intezaar', color: 'bg-amber-500',
    pill: 'bg-amber-100 dark:bg-amber-500/20 text-amber-700 dark:text-amber-300',
    next: 'CONFIRMED', nextLabel: 'Pakka karein',
  },
  CONFIRMED: {
    label: 'Pakka ho gaya', hint: 'Order pakka — maal nikalna hai', color: 'bg-sky-500',
    pill: 'bg-sky-100 dark:bg-sky-500/20 text-sky-700 dark:text-sky-300',
    next: 'PROCESSING', nextLabel: 'Maal nikal rahe hain',
  },
  PROCESSING: {
    label: 'Maal nikal rahe', hint: 'Gudaam se maal nikala ja raha hai', color: 'bg-cyan-500',
    pill: 'bg-cyan-100 dark:bg-cyan-500/20 text-cyan-700 dark:text-cyan-300',
    next: 'READY', nextLabel: 'Tayyar hai',
  },
  READY: {
    label: 'Tayyar hai', hint: 'Maal bandha hua, bhejne ka intezaar', color: 'bg-emerald-500',
    pill: 'bg-emerald-100 dark:bg-emerald-500/20 text-emerald-700 dark:text-emerald-300',
    next: 'OUT_FOR_DELIVERY', nextLabel: 'Rawana kar dein',
  },
  OUT_FOR_DELIVERY: {
    label: 'Raaste me', hint: 'Gaari nikal chuki hai', color: 'bg-teal-600',
    pill: 'bg-teal-100 dark:bg-teal-500/20 text-teal-700 dark:text-teal-300',
    next: 'DELIVERED', nextLabel: 'Pahunch gaya',
  },
  DELIVERED: {
    label: 'Pahunch gaya', hint: 'Maal farmer tak pahunch gaya', color: 'bg-green-600',
    pill: 'bg-green-100 dark:bg-green-500/20 text-green-700 dark:text-green-300',
  },
  RETURNED: {
    label: 'Wapas aa gaya', hint: 'Farmer ne wapas kar diya', color: 'bg-orange-600',
    pill: 'bg-orange-100 dark:bg-orange-500/20 text-orange-700 dark:text-orange-300',
  },
  CANCELLED: {
    label: 'Cancel', hint: 'Order cancel ho gaya', color: 'bg-rose-500',
    pill: 'bg-rose-100 dark:bg-rose-500/20 text-rose-700 dark:text-rose-300',
  },
};

/** Board par yehi qadam tarteeb se dikhte hain */
const PIPELINE: OrderStatus[] = ['PENDING', 'CONFIRMED', 'PROCESSING', 'READY', 'OUT_FOR_DELIVERY'];
const CLOSED: OrderStatus[] = ['DELIVERED', 'CANCELLED', 'RETURNED'];

const SEASONS = [
  { v: 'KHARIF', l: 'Kharif', e: '🌧️' },
  { v: 'RABI', l: 'Rabi', e: '❄️' },
  { v: 'ZAID', l: 'Zaid', e: '☀️' },
  { v: 'ALL_SEASON', l: 'Har mausam', e: '🔄' },
];

const GRID = '#94a3b8';
const AXIS = '#64748b';
const PIE_COLORS = ['#10b981', '#84cc16', '#f59e0b', '#0ea5e9', '#8b5cf6', '#ef4444', '#14b8a6', '#f97316'];
const TOOLTIP = {
  borderRadius: 12, border: '2px solid #cbd5e1', background: '#ffffff',
  color: '#0f172a', fontWeight: 700, fontSize: 12,
};

const dayMs = 86_400_000;
const fmtQty = (q: number) => Number(q || 0).toFixed(Number(q || 0) % 1 === 0 ? 0 : 2);

/** Kitne din baad — manfi ka matlab guzar chuka */
function daysTo(iso?: string): number | null {
  if (!iso) return null;
  const t = new Date(iso).getTime();
  if (Number.isNaN(t)) return null;
  const today = new Date();
  const a = new Date(today.getFullYear(), today.getMonth(), today.getDate()).getTime();
  return Math.round((t - a) / dayMs);
}

function dayPhrase(d: number): string {
  if (d === 0) return 'aaj';
  if (d === 1) return 'kal';
  if (d === -1) return 'kal guzra';
  if (d > 0) return `${d} din me`;
  return `${Math.abs(d)} din pehle`;
}

export default function BulkOrdersPage() {
  const qc = useQueryClient();
  const tenant = useAuthStore((s) => s.tenant);
  const shopName = useAuthStore((s) => s.user?.assignedShop?.name);
  const searchRef = useRef<HTMLInputElement>(null);

  const [tab, setTab] = useState<Tab>('orders');
  const [search, setSearch] = useState('');
  const [statusFilter, setStatusFilter] = useState<string>('active');
  const [seasonFilter, setSeasonFilter] = useState('all');
  const [payFor, setPayFor] = useState<BulkOrder | null>(null);
  const [cancelFor, setCancelFor] = useState<BulkOrder | null>(null);
  const [showTeacher, setShowTeacher] = useState(false);
  const [copied, setCopied] = useState(false);

  /* Saare orders ek baar — chaant client par, taake har patti ka
     counter poora rahe chahe filter koi bhi ho. */
  const ordersQ = useQuery({
    queryKey: ['agri-bulk-orders-all'],
    queryFn: () => bulkOrdersApi.list({}),
    refetchInterval: 60_000,
  });

  const isLoading = ordersQ.isLoading;
  const isRefetching = ordersQ.isRefetching;
  const invalidateAll = () => qc.invalidateQueries({ queryKey: ['agri-bulk-orders-all'] });

  const advance = useMutation({
    mutationFn: ({ id, status }: { id: string; status: string }) => bulkOrdersApi.updateStatus(id, status),
    onSuccess: (_d, v) => {
      toast.success(`Order ${STATUS[v.status as OrderStatus]?.label ?? v.status}`);
      invalidateAll();
    },
    onError: (e: any) => toast.error(e?.response?.data?.message || 'Nahi hua'),
  });

  const cancel = useMutation({
    mutationFn: ({ id, reason }: { id: string; reason: string }) =>
      bulkOrdersApi.updateStatus(id, 'CANCELLED', reason),
    onSuccess: () => { toast.success('Order cancel kar diya'); setCancelFor(null); invalidateAll(); },
    onError: (e: any) => toast.error(e?.response?.data?.message || 'Nahi hua'),
  });

  const pay = useMutation({
    mutationFn: ({ id, amount }: { id: string; amount: number }) => bulkOrdersApi.addPayment(id, amount),
    onSuccess: () => { toast.success('Payment likh di'); setPayFor(null); invalidateAll(); },
    onError: (e: any) => toast.error(e?.response?.data?.message || 'Payment nahi lagi'),
  });

  /* ── Rows ── */
  const rows = useMemo(() => {
    const list = ordersQ.data ?? [];
    return list.map((o) => {
      const remaining = Number(o.total || 0) - Number(o.paidAmount || 0);
      const toDeliver = daysTo(o.deliveryDate);
      const toDue = daysTo(o.creditDueDate);
      const closed = CLOSED.includes(o.status);
      const qty = (o.items ?? []).reduce((s, it) => s + Number(it.quantity || 0), 0);
      return {
        ...o,
        remaining: Math.max(remaining, 0),
        qty,
        toDeliver, toDue,
        closed,
        active: !closed,
        /* Delivery ki tareekh guzar gayi aur maal abhi bhi nahi pahuncha */
        lateDelivery: !closed && toDeliver !== null && toDeliver < 0,
        deliverToday: !closed && toDeliver === 0,
        /* Udhaar ki tareekh guzar gayi aur paisa baqi hai */
        overdueCredit: remaining > 0 && toDue !== null && toDue < 0,
        /* Maal pahunch gaya magar paisa nahi aaya — yehi asal masla */
        moneyOut: o.status === 'DELIVERED' && remaining > 0,
      };
    });
  }, [ordersQ.data]);

  const q = search.trim().toLowerCase();
  const shown = useMemo(() => {
    let out = rows;
    if (statusFilter === 'active') out = out.filter((r) => r.active);
    else if (statusFilter === 'money') out = out.filter((r) => r.remaining > 0);
    else if (statusFilter !== 'all') out = out.filter((r) => r.status === statusFilter);
    if (seasonFilter !== 'all') out = out.filter((r) => r.season === seasonFilter);
    if (q) out = out.filter((r) =>
      (r.orderNumber || '').toLowerCase().includes(q)
      || (r.customerName || '').toLowerCase().includes(q)
      || (r.customerPhone || '').toLowerCase().includes(q)
      || (r.cropTarget || '').toLowerCase().includes(q)
      || (r.items ?? []).some((it) => (it.productName || '').toLowerCase().includes(q)));
    /* Jo late hai wo sab se ooper, phir jo aaj jana hai */
    return [...out].sort((a, b) => {
      const rank = (r: any) => (r.lateDelivery ? 0 : r.deliverToday ? 1 : r.overdueCredit ? 2 : r.active ? 3 : 4);
      const d = rank(a) - rank(b);
      if (d !== 0) return d;
      return new Date(b.orderDate).getTime() - new Date(a.orderDate).getTime();
    });
  }, [rows, statusFilter, seasonFilter, q]);

  const hasFilters = !!search || statusFilter !== 'active' || seasonFilter !== 'all';

  /* ── Stats ── */
  const stats = useMemo(() => {
    const active = rows.filter((r) => r.active);
    const delivered = rows.filter((r) => r.status === 'DELIVERED');
    const moneyOut = rows.filter((r) => r.remaining > 0);
    return {
      total: rows.length,
      active: active.length,
      ready: rows.filter((r) => r.status === 'READY').length,
      transit: rows.filter((r) => r.status === 'OUT_FOR_DELIVERY').length,
      delivered: delivered.length,
      /** Bahar para paisa — sab se ahem number */
      moneyOut: moneyOut.reduce((s, r) => s + r.remaining, 0),
      moneyOutCount: moneyOut.length,
      overdueCredit: rows.filter((r) => r.overdueCredit).length,
      overdueAmount: rows.filter((r) => r.overdueCredit).reduce((s, r) => s + r.remaining, 0),
      late: rows.filter((r) => r.lateDelivery).length,
      today: rows.filter((r) => r.deliverToday).length,
      todayList: rows.filter((r) => r.deliverToday || r.lateDelivery).slice(0, 6),
      revenue: delivered.reduce((s, r) => s + Number(r.total || 0), 0),
      avgOrder: delivered.length > 0
        ? delivered.reduce((s, r) => s + Number(r.total || 0), 0) / delivered.length : 0,
      creditCount: rows.filter((r) => r.isCredit).length,
    };
  }, [rows]);

  /* ── Charts ── */
  const statusPie = useMemo(() => {
    const m = new Map<string, number>();
    rows.forEach((r) => {
      const label = STATUS[r.status]?.label ?? r.status;
      m.set(label, (m.get(label) ?? 0) + 1);
    });
    return [...m.entries()].map(([name, value]) => ({ name, value }));
  }, [rows]);

  const monthChart = useMemo(() => {
    const m = new Map<string, { bikri: number; baqi: number }>();
    for (let i = 5; i >= 0; i--) {
      const d = new Date(); d.setMonth(d.getMonth() - i);
      m.set(`${d.getFullYear()}-${d.getMonth()}`, { bikri: 0, baqi: 0 });
    }
    rows.forEach((r) => {
      const d = new Date(r.orderDate);
      const e = m.get(`${d.getFullYear()}-${d.getMonth()}`);
      if (!e) return;
      e.bikri += Number(r.total || 0);
      e.baqi += r.remaining;
    });
    return [...m.entries()].map(([k, v]) => {
      const [y, mo] = k.split('-').map(Number);
      return {
        name: new Date(y, mo, 1).toLocaleDateString('en-PK', { month: 'short' }),
        bikri: Math.round(v.bikri),
        baqi: Math.round(v.baqi),
      };
    });
  }, [rows]);

  const seasonChart = useMemo(() => {
    const m = new Map<string, number>();
    rows.forEach((r) => {
      const def = SEASONS.find((s) => s.v === r.season);
      const label = def ? `${def.e} ${def.l}` : 'Likha nahi';
      m.set(label, (m.get(label) ?? 0) + Number(r.total || 0));
    });
    return [...m.entries()]
      .map(([name, value]) => ({ name, value: Math.round(value) }))
      .filter((x) => x.value > 0);
  }, [rows]);

  const topProducts = useMemo(() => {
    const m = new Map<string, { qty: number; amount: number }>();
    rows.forEach((r) => {
      (r.items ?? []).forEach((it) => {
        const k = it.productName || '—';
        const e = m.get(k) ?? { qty: 0, amount: 0 };
        e.qty += Number(it.quantity || 0);
        e.amount += Number(it.total || 0);
        m.set(k, e);
      });
    });
    return [...m.entries()]
      .map(([name, v]) => ({ name: name.slice(0, 14), value: Math.round(v.amount), qty: v.qty }))
      .sort((a, b) => b.value - a.value)
      .slice(0, 8);
  }, [rows]);

  /* ── Wusooli list — katai ke waqt kaam aati hai ── */
  const chaseText = useMemo(() => {
    const list = rows.filter((r) => r.remaining > 0)
      .sort((a, b) => (a.toDue ?? 999) - (b.toDue ?? 999));
    const lines = list.map((r, i) =>
      `${i + 1}. ${r.customerName || 'Farmer'}${r.customerPhone ? ` (${r.customerPhone})` : ''} — ${formatPKR(r.remaining)}`
      + (r.toDue !== null ? ` — ${dayPhrase(r.toDue)}` : ''));
    return [
      `💰 *${tenant?.name || 'Agri'}* — jin se paisa lena hai`,
      shopName ? `📍 ${shopName}` : '',
      `📅 ${new Date().toLocaleDateString('en-PK', { dateStyle: 'full' })}`,
      '',
      ...lines,
      '',
      `Kul ${list.length} farmer • ${formatPKR(stats.moneyOut)} bahar`,
    ].filter(Boolean).join('\n');
  }, [rows, tenant, shopName, stats.moneyOut]);

  const copyChase = async () => {
    try {
      await navigator.clipboard.writeText(chaseText);
      setCopied(true);
      setTimeout(() => setCopied(false), 1800);
      toast.success('List copy ho gayi');
    } catch { toast.error('Copy nahi ho saki'); }
  };
  const whatsappChase = () =>
    window.open(`https://wa.me/?text=${encodeURIComponent(chaseText)}`, '_blank');

  /* ── CSV ── */
  const exportCsv = () => {
    if (shown.length === 0) return toast.error('Koi data nahi');
    const summary = [
      [`Bare Order — ${tenant?.name || 'Nafaa'}`],
      [`Shop: ${shopName || 'All'}  •  Generated: ${new Date().toLocaleString('en-PK')}`],
      [`Bahar para paisa: ${formatPKR(stats.moneyOut)} (${stats.moneyOutCount} orders)`],
      [''],
    ];
    const head = ['Order #', 'Farmer', 'Phone', 'Tareekh', 'Delivery', 'Halat', 'Mausam',
      'Fasal', 'Raqba', 'Cheezein', 'Tadaad', 'Kul', 'Mila', 'Baqi', 'Udhaar',
      'Udhaar ki tareekh', 'Pata'];
    const body = shown.map((r) => [
      r.orderNumber, r.customerName || '', r.customerPhone || '',
      String(r.orderDate).slice(0, 10),
      r.deliveryDate ? String(r.deliveryDate).slice(0, 10) : '',
      STATUS[r.status]?.label ?? r.status,
      SEASONS.find((s) => s.v === r.season)?.l ?? '',
      r.cropTarget || '', r.landAreaAcres ?? '',
      (r.items ?? []).map((it) => `${it.productName} × ${it.quantity} ${it.unit}`).join(' | '),
      r.qty,
      Math.round(Number(r.total || 0)), Math.round(Number(r.paidAmount || 0)), Math.round(r.remaining),
      r.isCredit ? 'Haan' : 'Nahi',
      r.creditDueDate ? String(r.creditDueDate).slice(0, 10) : '',
      r.deliveryAddress || '',
    ]);
    const esc = (v: any) => `"${String(v ?? '').replace(/"/g, '""')}"`;
    const csv = [...summary, head, ...body].map((x) => x.map(esc).join(',')).join('\n');
    const url = URL.createObjectURL(new Blob(['﻿' + csv], { type: 'text/csv;charset=utf-8;' }));
    const a = document.createElement('a');
    a.href = url;
    a.download = `bare-order-${new Date().toISOString().slice(0, 10)}.csv`;
    a.click();
    URL.revokeObjectURL(url);
    toast.success(`${shown.length} orders CSV me`);
  };

  const doPrint = () => window.print();

  /* ── Keyboard ── */
  useEffect(() => {
    const onKey = (e: KeyboardEvent) => {
      if (e.key === 'Escape') {
        if (payFor) return setPayFor(null);
        if (cancelFor) return setCancelFor(null);
        if (showTeacher) return setShowTeacher(false);
        return;
      }
      if (payFor || cancelFor) return;
      const t = document.activeElement?.tagName;
      if (t === 'INPUT' || t === 'TEXTAREA' || t === 'SELECT') return;
      if (e.metaKey || e.ctrlKey || e.altKey) return;
      if (e.key === '/') { e.preventDefault(); searchRef.current?.focus(); }
      const k = e.key.toLowerCase();
      if (k === 'g') setShowTeacher(true);
      if (k === 'p') doPrint();
      if (e.key === '1') setTab('orders');
      if (e.key === '2') setTab('board');
      if (e.key === '3') setTab('analytics');
    };
    window.addEventListener('keydown', onKey);
    return () => window.removeEventListener('keydown', onKey);
  }, [showTeacher, payFor, cancelFor]);

  const printDate = new Date().toLocaleString('en-PK', { dateStyle: 'full', timeStyle: 'short' });

  return (
    <div className="space-y-4 sm:space-y-5 pb-10 print:space-y-3">
      {/* ═══ PRINT HEADER ═══ */}
      <div className="hidden print:block">
        <div className="flex items-center justify-between border-b-4 border-emerald-600 pb-3 mb-4">
          <div>
            <h1 className="text-2xl font-black text-slate-900">📦 {tenant?.name || 'Agri'} — Bare order</h1>
            <p className="text-xs text-slate-600 font-semibold mt-1">
              {shopName ? `${shopName} • ` : ''}{shown.length} orders •
              Bahar para paisa {formatPKR(stats.moneyOut)}
            </p>
          </div>
          <div className="text-right text-xs font-bold text-slate-900">{printDate}</div>
        </div>
      </div>

      {/* ═══ HERO ═══ */}
      <section className="relative overflow-hidden rounded-3xl bg-gradient-to-br from-slate-950 via-emerald-900 to-lime-700 text-white p-5 sm:p-6 shadow-2xl print:hidden">
        <div className="absolute -top-24 -right-20 h-72 w-72 rounded-full bg-lime-400/25 blur-3xl" />
        <div className="absolute -bottom-24 -left-20 h-64 w-64 rounded-full bg-emerald-300/15 blur-3xl" />
        <div className="absolute inset-0 opacity-[0.06]"
          style={{ backgroundImage: 'radial-gradient(circle at 1px 1px, #fff 1px, transparent 0)', backgroundSize: '22px 22px' }} />

        <div className="relative flex items-start justify-between gap-4 flex-wrap">
          <div className="min-w-0">
            <div className="inline-flex items-center gap-2 rounded-full bg-white/15 backdrop-blur px-3 py-1 text-[11px] font-black border border-white/25 uppercase tracking-widest">
              <Tractor className="h-3.5 w-3.5 text-lime-300" /> Bare order
              {shopName && (<><span className="opacity-40">•</span><span className="text-emerald-200">🏪 {shopName}</span></>)}
            </div>
            <h1 className="mt-3 text-2xl sm:text-3xl lg:text-4xl font-black leading-tight">📦 Bare Order</h1>
            <p className="mt-1.5 text-xs sm:text-sm font-bold text-white/90">
              <strong className="text-lime-200">{stats.active}</strong> chal rahe ·{' '}
              bahar para paisa <strong className="text-amber-200">{formatPKR(stats.moneyOut)}</strong>
              {stats.today > 0 && <> · <strong className="text-emerald-300">{stats.today}</strong> delivery aaj</>}
            </p>
          </div>

          <div className="flex gap-2 flex-wrap items-center shrink-0">
            <button onClick={() => setShowTeacher(true)} title="Sikhein (G)"
              className="h-11 px-3 rounded-xl bg-amber-400/90 hover:bg-amber-400 text-slate-900 text-xs font-black inline-flex items-center gap-1.5 shadow-lg transition">
              <GraduationCap className="h-4 w-4" /> <span className="hidden sm:inline">Sikhein</span>
            </button>
            <button onClick={exportCsv}
              className="h-11 px-3 rounded-xl bg-white/15 hover:bg-white/25 border border-white/25 text-xs font-black inline-flex items-center gap-1.5 backdrop-blur transition">
              <FileSpreadsheet className="h-4 w-4" /> <span className="hidden sm:inline">CSV</span>
            </button>
            <button onClick={doPrint} title="Print (P)"
              className="h-11 w-11 rounded-xl bg-white/15 hover:bg-white/25 border border-white/25 flex items-center justify-center backdrop-blur transition">
              <Printer className="h-4 w-4" />
            </button>
            <button onClick={() => ordersQ.refetch()} disabled={isRefetching} title="Taaza"
              className="h-11 w-11 rounded-xl bg-white/15 hover:bg-white/25 border border-white/25 flex items-center justify-center backdrop-blur disabled:opacity-50 transition">
              <RefreshCw className={`h-4 w-4 ${isRefetching ? 'animate-spin' : ''}`} />
            </button>
            <Link to="/agri/bulk-orders/new"
              className="h-11 px-4 rounded-xl bg-white text-emerald-700 hover:bg-emerald-50 text-xs font-black inline-flex items-center gap-1.5 shadow-2xl transition active:scale-[0.97]">
              <Plus className="h-4 w-4" /> Naya order
            </Link>
          </div>
        </div>
      </section>

      {/* ═══ AAJ KI DELIVERY / LATE ═══ */}
      {(stats.today > 0 || stats.late > 0) && (
        <section className="rounded-3xl bg-gradient-to-br from-sky-50 to-cyan-50 dark:from-sky-500/10 dark:to-cyan-500/10 border-2 border-sky-300 dark:border-sky-500/40 p-4 flex items-start gap-3 flex-wrap print:hidden">
          <div className="h-10 w-10 rounded-xl bg-gradient-to-br from-sky-600 to-cyan-600 text-white flex items-center justify-center shadow-md shrink-0">
            <Truck className="h-5 w-5" />
          </div>
          <div className="flex-1 min-w-[200px]">
            <h3 className="font-extrabold text-sky-900 dark:text-sky-200 text-sm">
              🚚 {stats.today > 0 && `${stats.today} delivery aaj honi hai`}
              {stats.today > 0 && stats.late > 0 && ' · '}
              {stats.late > 0 && `${stats.late} ki tareekh guzar chuki`}
            </h3>
            <div className="mt-2 flex flex-wrap gap-1.5">
              {stats.todayList.map((r: any) => (
                <Link key={r.id} to={`/agri/bulk-orders/${r.id}`}
                  className={`px-2.5 py-1.5 rounded-lg bg-white dark:bg-slate-800 border-2 text-[11px] font-extrabold transition ${
                    r.lateDelivery
                      ? 'border-rose-200 dark:border-rose-500/40 hover:border-rose-400 text-rose-900 dark:text-rose-200'
                      : 'border-sky-200 dark:border-sky-500/40 hover:border-sky-400 text-sky-900 dark:text-sky-200'
                  }`}>
                  {r.customerName || r.orderNumber}
                  {r.toDeliver !== null && <span className="opacity-70"> · {dayPhrase(r.toDeliver)}</span>}
                </Link>
              ))}
            </div>
          </div>
          <button onClick={() => { setTab('board'); }}
            className="px-3 py-2 rounded-xl bg-sky-600 hover:bg-sky-700 text-white text-xs font-extrabold shrink-0 inline-flex items-center gap-1.5 transition active:scale-[0.97]">
            Board dekhein <ArrowRight className="h-3.5 w-3.5" />
          </button>
        </section>
      )}

      {/* ═══ BAHAR PARA PAISA ═══ */}
      {stats.overdueCredit > 0 && (
        <section className="rounded-3xl bg-gradient-to-br from-amber-50 to-orange-50 dark:from-amber-500/10 dark:to-orange-500/10 border-2 border-amber-300 dark:border-amber-500/40 p-4 flex items-start gap-3 flex-wrap print:hidden">
          <div className="h-10 w-10 rounded-xl bg-gradient-to-br from-amber-500 to-orange-600 text-white flex items-center justify-center shadow-md shrink-0">
            <Wallet className="h-5 w-5" />
          </div>
          <div className="flex-1 min-w-[200px]">
            <h3 className="font-extrabold text-amber-900 dark:text-amber-200 text-sm">
              💰 {stats.overdueCredit} farmer ka udhaar ki tareekh guzar chuki — {formatPKR(stats.overdueAmount)}
            </h3>
            <p className="text-[11px] font-bold text-amber-800 dark:text-amber-300 mt-0.5">
              Katai ke baad farmer ke paas paisa aata hai — wohi waqt maangne ka sab se behtar hai.
              Us ke baad paisa kahin aur lag jata hai aur agle season tak intezaar karna parta hai.
            </p>
          </div>
          <div className="flex gap-1.5 shrink-0">
            <button onClick={copyChase}
              className="h-10 px-3 rounded-xl bg-white dark:bg-slate-800 border-2 border-amber-300 dark:border-amber-500/40 hover:border-amber-500 text-amber-800 dark:text-amber-200 text-xs font-black inline-flex items-center gap-1.5 transition">
              {copied ? <CheckCircle2 className="h-3.5 w-3.5 text-emerald-500" /> : <Copy className="h-3.5 w-3.5" />}
              {copied ? 'Copy hui' : 'List'}
            </button>
            <button onClick={whatsappChase}
              className="h-10 px-3 rounded-xl bg-emerald-600 hover:bg-emerald-700 text-white text-xs font-black inline-flex items-center gap-1.5 transition">
              <MessageCircle className="h-3.5 w-3.5" /> WhatsApp
            </button>
          </div>
        </section>
      )}

      {/* ═══ KPI ═══ */}
      <section className="grid grid-cols-2 lg:grid-cols-4 gap-3 print:hidden">
        <Kpi icon={Wallet} label="Bahar para paisa" value={formatPKR(stats.moneyOut)}
          sub={stats.moneyOutCount > 0 ? `${stats.moneyOutCount} orders ka baqi` : 'Sab wusool ho gaya'}
          tone="amber" onClick={() => { setTab('orders'); setStatusFilter('money'); }}
          active={statusFilter === 'money'} />
        <Kpi icon={Package} label="Chal rahe order" value={stats.active}
          sub={`${stats.ready} tayyar · ${stats.transit} raaste me`} tone="emerald"
          onClick={() => { setTab('orders'); setStatusFilter('active'); }}
          active={statusFilter === 'active'} />
        <Kpi icon={CheckCircle2} label="Pahunch gaye" value={stats.delivered}
          sub={stats.revenue > 0 ? formatPKR(stats.revenue) : 'Abhi koi nahi'} tone="lime"
          onClick={() => { setTab('orders'); setStatusFilter('DELIVERED'); }}
          active={statusFilter === 'DELIVERED'} />
        <Kpi icon={TrendingUp} label="Aam order" value={formatPKR(stats.avgOrder)}
          sub={`${stats.creditCount} udhaar par gaye`} tone="rose" />
      </section>

      {/* ═══ TABS ═══ */}
      <div className="grid grid-cols-3 gap-2 sm:gap-3 print:hidden">
        {([
          ['orders', 'List', Package, shown.length, '1'],
          ['board', 'Board', Layers, stats.active, '2'],
          ['analytics', 'Analytics', BarChart3, undefined, '3'],
        ] as const).map(([id, label, Icon, count, key]) => (
          <button key={id} onClick={() => setTab(id as Tab)}
            className={`h-14 rounded-2xl border-2 font-black text-xs sm:text-sm inline-flex items-center justify-center gap-2 transition ${
              tab === id
                ? 'bg-gradient-to-r from-emerald-600 to-lime-700 text-white border-transparent shadow-lg'
                : 'bg-white dark:bg-slate-900 text-slate-600 dark:text-slate-300 border-slate-200 dark:border-slate-800 hover:border-emerald-400'
            }`}>
            <Icon className="h-4 w-4" />
            <span className="truncate">{label}</span>
            {count !== undefined && (
              <span className={`text-[10px] px-1.5 py-0.5 rounded-lg tabular-nums ${
                tab === id ? 'bg-white/25' : 'bg-slate-100 dark:bg-slate-800'
              }`}>{count}</span>
            )}
            <kbd className="hidden sm:inline text-[9px] opacity-60">{key}</kbd>
          </button>
        ))}
      </div>

      {payFor && (
        <PaymentModal order={payFor} onClose={() => setPayFor(null)}
          onConfirm={(amount: number) => pay.mutate({ id: payFor.id, amount })} saving={pay.isPending} />
      )}
      {cancelFor && (
        <CancelModal order={cancelFor} onClose={() => setCancelFor(null)}
          onConfirm={(reason: string) => cancel.mutate({ id: cancelFor.id, reason })} saving={cancel.isPending} />
      )}

      {isLoading ? (
        <div className="grid gap-3">
          {[1, 2, 3].map((i) => <div key={i} className="h-40 rounded-2xl bg-slate-100 dark:bg-slate-800 animate-pulse" />)}
        </div>
      ) : tab === 'analytics' ? (
        <Analytics stats={stats} statusPie={statusPie} monthChart={monthChart}
          seasonChart={seasonChart} topProducts={topProducts} rows={rows} />
      ) : tab === 'board' ? (
        <Board rows={rows.filter((r) => r.active)}
          onAdvance={(id: string, status: string) => advance.mutate({ id, status })}
          busy={advance.isPending} />
      ) : (
        <>
          {/* ═══ TOOLBAR ═══ */}
          <section className="rounded-3xl bg-white dark:bg-slate-900 border-2 border-slate-200 dark:border-slate-800 shadow-sm p-3 sm:p-4 space-y-3 print:hidden">
            <div className="relative">
              <Search className="h-5 w-5 text-slate-400 absolute left-3.5 top-1/2 -translate-y-1/2 pointer-events-none" />
              <input ref={searchRef} value={search} onChange={(e) => setSearch(e.target.value)}
                placeholder="Order number, farmer, phone, cheez, fasal… (/ dabao)"
                className="h-12 w-full rounded-2xl border-2 border-slate-200 dark:border-slate-700 bg-white dark:bg-slate-800 pl-11 pr-10 text-sm font-bold text-slate-900 dark:text-white placeholder:text-slate-400 focus:outline-none focus:border-emerald-500 transition" />
              {search && (
                <button onClick={() => setSearch('')}
                  className="absolute right-3 top-1/2 -translate-y-1/2 h-7 w-7 rounded-lg hover:bg-slate-100 dark:hover:bg-slate-700 flex items-center justify-center">
                  <X className="h-4 w-4 text-slate-400" />
                </button>
              )}
            </div>

            <div className="flex gap-1.5 overflow-x-auto pb-1">
              {[
                { v: 'active', label: `🔥 Chal rahe (${stats.active})` },
                { v: 'money', label: `💰 Paisa baqi (${stats.moneyOutCount})` },
                { v: 'all', label: `Sab (${stats.total})` },
                ...(Object.keys(STATUS) as OrderStatus[]).map((k) => ({
                  v: k,
                  label: `${STATUS[k].label} (${rows.filter((r) => r.status === k).length})`,
                })),
              ].map((s) => (
                <button key={s.v} onClick={() => setStatusFilter(s.v)}
                  className={`shrink-0 h-10 px-3 rounded-xl border-2 text-[11px] font-black transition ${
                    statusFilter === s.v ? 'border-emerald-500 bg-emerald-50 dark:bg-emerald-500/15 text-emerald-700 dark:text-emerald-300'
                      : 'border-slate-200 dark:border-slate-700 bg-white dark:bg-slate-800 text-slate-600 dark:text-slate-300 hover:border-emerald-400'
                  }`}>{s.label}</button>
              ))}
            </div>

            <div className="flex gap-1.5 flex-wrap items-center">
              <button onClick={() => setSeasonFilter('all')}
                className={`h-9 px-3 rounded-xl border-2 text-[11px] font-black transition ${
                  seasonFilter === 'all' ? 'border-emerald-500 bg-emerald-50 dark:bg-emerald-500/15 text-emerald-700 dark:text-emerald-300'
                    : 'border-slate-200 dark:border-slate-700 bg-white dark:bg-slate-800 text-slate-600 dark:text-slate-300 hover:border-emerald-400'
                }`}>Har mausam</button>
              {SEASONS.map((s) => (
                <button key={s.v} onClick={() => setSeasonFilter(s.v)}
                  className={`h-9 px-3 rounded-xl border-2 text-[11px] font-black transition ${
                    seasonFilter === s.v ? 'border-emerald-500 bg-emerald-50 dark:bg-emerald-500/15 text-emerald-700 dark:text-emerald-300'
                      : 'border-slate-200 dark:border-slate-700 bg-white dark:bg-slate-800 text-slate-600 dark:text-slate-300 hover:border-emerald-400'
                  }`}>{s.e} {s.l}</button>
              ))}
              {hasFilters && (
                <button onClick={() => { setSearch(''); setStatusFilter('active'); setSeasonFilter('all'); }}
                  className="text-xs font-extrabold text-rose-600 dark:text-rose-400 hover:text-rose-700 inline-flex items-center gap-1 transition">
                  <X className="h-3 w-3" /> Chaant hatao
                </button>
              )}
              <div className="ml-auto text-xs font-extrabold text-slate-500 dark:text-slate-400 tabular-nums">
                {shown.length} orders
              </div>
            </div>
          </section>

          {shown.length === 0 ? (
            <Empty hasFilters={hasFilters}
              onClear={() => { setSearch(''); setStatusFilter('active'); setSeasonFilter('all'); }}
              onGuide={() => setShowTeacher(true)} />
          ) : (
            <section className="grid gap-3">
              {shown.map((order) => (
                <OrderCard key={order.id} order={order}
                  onAdvance={(next: string) => advance.mutate({ id: order.id, status: next })}
                  onPay={() => setPayFor(order)}
                  onCancel={() => setCancelFor(order)}
                  busy={advance.isPending} />
              ))}
            </section>
          )}
        </>
      )}

      {showTeacher && <Teacher onClose={() => setShowTeacher(false)} />}

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
          .overflow-x-auto, .overflow-y-auto { overflow: visible !important; }
          html, body, #root { height: auto !important; overflow: visible !important; }
          .avoid-break { page-break-inside: avoid !important; }
          [data-sonner-toaster] { display: none !important; }
        }
      `}</style>
    </div>
  );
}

/* ═════════════════════════════════════════════════════════════
   EK ORDER KA CARD
   ═════════════════════════════════════════════════════════════ */
function OrderCard({ order, onAdvance, onPay, onCancel, busy }: any) {
  const cfg = STATUS[order.status as OrderStatus];
  const season = SEASONS.find((s) => s.v === order.season);
  const paidPct = Number(order.total) > 0
    ? (Number(order.paidAmount || 0) / Number(order.total)) * 100 : 0;

  return (
    <div className={`rounded-2xl bg-white dark:bg-slate-900 border-2 shadow-sm p-4 space-y-3 avoid-break transition hover:shadow-lg ${
      order.lateDelivery ? 'border-rose-300 dark:border-rose-500/50'
        : order.deliverToday ? 'border-sky-300 dark:border-sky-500/50'
        : order.overdueCredit ? 'border-amber-300 dark:border-amber-500/50'
        : 'border-slate-200 dark:border-slate-800 hover:border-emerald-300'
    }`}>
      <div className="flex items-start justify-between gap-3 flex-wrap">
        <div className="flex items-start gap-3 min-w-0 flex-1">
          <div className={`h-12 w-12 rounded-2xl text-white flex items-center justify-center shadow shrink-0 ${
            order.closed ? 'bg-gradient-to-br from-slate-400 to-slate-600'
              : 'bg-gradient-to-br from-emerald-500 to-lime-600'
          }`}>
            <Package className="h-6 w-6" />
          </div>

          <div className="min-w-0 flex-1">
            <div className="flex items-center gap-1.5 flex-wrap">
              <Link to={`/agri/bulk-orders/${order.id}`}
                className="font-mono font-extrabold text-slate-900 dark:text-white hover:text-emerald-600 transition">
                {order.orderNumber}
              </Link>
              <span className={`px-2 py-0.5 rounded-full text-[9px] font-extrabold uppercase text-white ${cfg.color}`}>
                {cfg.label}
              </span>
              {season && (
                <span className="px-2 py-0.5 rounded-md bg-lime-100 dark:bg-lime-500/20 text-lime-700 dark:text-lime-300 text-[9px] font-extrabold uppercase">
                  {season.e} {season.l}
                </span>
              )}
              {order.isCredit && (
                <span className="px-2 py-0.5 rounded-md bg-amber-100 dark:bg-amber-500/20 text-amber-700 dark:text-amber-300 text-[9px] font-extrabold uppercase">
                  Udhaar
                </span>
              )}
              {order.isDelivery && (
                <span className="px-2 py-0.5 rounded-md bg-sky-100 dark:bg-sky-500/20 text-sky-700 dark:text-sky-300 text-[9px] font-extrabold uppercase inline-flex items-center gap-0.5">
                  <Truck className="h-2.5 w-2.5" /> Pahunchana hai
                </span>
              )}
              {order.cropTarget && (
                <span className="px-2 py-0.5 rounded-md bg-emerald-100 dark:bg-emerald-500/20 text-emerald-700 dark:text-emerald-300 text-[9px] font-extrabold uppercase">
                  🌱 {order.cropTarget}
                </span>
              )}
            </div>

            <div className="mt-2 flex items-center gap-3 text-[11px] text-slate-600 dark:text-slate-400 font-bold flex-wrap">
              {order.customerName && (
                <span className="inline-flex items-center gap-1"><User className="h-3 w-3" />{order.customerName}</span>
              )}
              {order.customerPhone && (
                <a href={`tel:${order.customerPhone}`}
                  className="inline-flex items-center gap-1 hover:text-emerald-600 transition">
                  <Phone className="h-3 w-3" />{order.customerPhone}
                </a>
              )}
              {order.landAreaAcres ? (
                <span className="inline-flex items-center gap-1"><Layers className="h-3 w-3" />{order.landAreaAcres} acre</span>
              ) : null}
              {order.deliveryDate && (
                <span className={`inline-flex items-center gap-1 font-extrabold ${
                  order.lateDelivery ? 'text-rose-600 dark:text-rose-400'
                    : order.deliverToday ? 'text-sky-600 dark:text-sky-400'
                    : 'text-slate-700 dark:text-slate-300'
                }`}>
                  <Calendar className="h-3 w-3" />
                  {new Date(order.deliveryDate).toLocaleDateString('en-PK', { day: '2-digit', month: 'short' })}
                  {order.toDeliver !== null && ` · ${dayPhrase(order.toDeliver)}`}
                </span>
              )}
            </div>

            {order.deliveryAddress && (
              <div className="mt-1 text-[11px] font-bold text-slate-500 dark:text-slate-400 inline-flex items-start gap-1">
                <MapPin className="h-3 w-3 shrink-0 mt-0.5" />
                <span className="line-clamp-1">{order.deliveryAddress}</span>
              </div>
            )}

            <div className="mt-2 flex flex-wrap gap-1">
              {(order.items ?? []).slice(0, 4).map((it: any, i: number) => (
                <span key={i}
                  className="px-2 py-0.5 rounded-md bg-slate-100 dark:bg-slate-800 text-slate-600 dark:text-slate-300 text-[10px] font-extrabold">
                  {it.productName} · {fmtQty(it.quantity)} {it.unit}
                </span>
              ))}
              {(order.items?.length || 0) > 4 && (
                <span className="px-2 py-0.5 rounded-md bg-slate-100 dark:bg-slate-800 text-slate-500 text-[10px] font-extrabold">
                  +{(order.items?.length || 0) - 4} aur
                </span>
              )}
            </div>
          </div>
        </div>

        <div className="text-right shrink-0">
          <div className="text-[10px] uppercase font-extrabold text-slate-500 tracking-wider">
            {fmtQty(order.qty)} cheezein
          </div>
          <div className="text-xl font-black text-slate-900 dark:text-white tabular-nums leading-none mt-0.5">
            {formatPKR(order.total)}
          </div>
          {order.remaining > 0 ? (
            <div className={`text-[11px] font-extrabold tabular-nums mt-0.5 ${
              order.overdueCredit ? 'text-rose-600 dark:text-rose-400' : 'text-amber-600 dark:text-amber-400'
            }`}>
              Baqi {formatPKR(order.remaining)}
              {order.toDue !== null && ` · ${dayPhrase(order.toDue)}`}
            </div>
          ) : (
            <div className="text-[11px] font-extrabold text-emerald-600 dark:text-emerald-400 mt-0.5 inline-flex items-center gap-1">
              <CheckCircle2 className="h-3 w-3" /> Poora paisa mil gaya
            </div>
          )}
        </div>
      </div>

      {/* Paisa ki patti */}
      {Number(order.total) > 0 && order.remaining > 0 && (
        <div>
          <div className="h-1.5 rounded-full bg-slate-100 dark:bg-slate-800 overflow-hidden">
            <div className={`h-full rounded-full ${order.overdueCredit ? 'bg-rose-500' : 'bg-emerald-500'}`}
              style={{ width: `${Math.min(paidPct, 100)}%` }} />
          </div>
          <div className="mt-1 text-[10px] font-bold text-slate-400 tabular-nums">
            {formatPKR(order.paidAmount)} mil chuka · {paidPct.toFixed(0)}%
          </div>
        </div>
      )}

      <div className="flex gap-1.5 pt-2 border-t border-slate-100 dark:border-slate-800 flex-wrap print:hidden">
        <Link to={`/agri/bulk-orders/${order.id}`}
          className="h-9 px-3 rounded-lg bg-slate-100 dark:bg-slate-800 hover:bg-slate-200 dark:hover:bg-slate-700 text-slate-700 dark:text-slate-200 text-[11px] font-extrabold inline-flex items-center gap-1 transition">
          Poora dekhein
        </Link>

        {order.remaining > 0 && (
          <button onClick={onPay}
            className="h-9 px-3 rounded-lg bg-emerald-50 dark:bg-emerald-500/15 hover:bg-emerald-100 dark:hover:bg-emerald-500/25 text-emerald-700 dark:text-emerald-300 text-[11px] font-extrabold inline-flex items-center gap-1 transition">
            <Wallet className="h-3.5 w-3.5" /> Paisa aaya
          </button>
        )}

        {cfg.next && !order.closed && (
          <button onClick={() => onAdvance(cfg.next)} disabled={busy}
            className={`h-9 px-3 rounded-lg text-white text-[11px] font-extrabold inline-flex items-center gap-1 disabled:opacity-50 transition ${STATUS[cfg.next].color} hover:opacity-90`}>
            {cfg.nextLabel} <ArrowRight className="h-3.5 w-3.5" />
          </button>
        )}

        {!order.closed && (
          <button onClick={onCancel}
            className="ml-auto h-9 px-3 rounded-lg bg-rose-50 dark:bg-rose-500/15 hover:bg-rose-100 dark:hover:bg-rose-500/25 text-rose-600 dark:text-rose-400 text-[11px] font-extrabold inline-flex items-center gap-1 transition">
            <Ban className="h-3.5 w-3.5" /> Cancel
          </button>
        )}
      </div>

      {order.cancellationReason && (
        <div className="rounded-xl bg-rose-50 dark:bg-rose-500/10 border-2 border-rose-200 dark:border-rose-500/30 p-2.5 text-[12px] font-bold text-rose-800 dark:text-rose-300">
          ❌ Cancel ki wajah: {order.cancellationReason}
        </div>
      )}
    </div>
  );
}

/* ═════════════════════════════════════════════════════════════
   BOARD — har qadam ka apna column
   ─────────────────────────────────────────────────────────────
   Gudaam wale ke liye list se behtar hai: ek nazar me pata chal
   jata hai ke kitna maal nikalna hai aur kitna bhejna hai.
   ═════════════════════════════════════════════════════════════ */
function Board({ rows, onAdvance, busy }: {
  rows: any[]; onAdvance: (id: string, status: string) => void; busy: boolean;
}) {
  if (rows.length === 0) {
    return (
      <section className="rounded-3xl bg-white dark:bg-slate-900 border-2 border-dashed border-slate-300 dark:border-slate-700 p-10 sm:p-14 text-center">
        <div className="mx-auto h-16 w-16 rounded-3xl bg-gradient-to-br from-emerald-500 to-lime-700 flex items-center justify-center shadow-lg shadow-emerald-500/40">
          <CheckCircle2 className="h-8 w-8 text-white" />
        </div>
        <h3 className="mt-4 text-lg font-extrabold text-slate-900 dark:text-white">Koi order chal nahi raha</h3>
        <p className="text-sm text-slate-500 dark:text-slate-400 mt-1.5 font-semibold">
          Sab kuch pahunch chuka hai. Naya order banayein to yahan aa jayega.
        </p>
      </section>
    );
  }

  return (
    <div className="overflow-x-auto pb-2">
      <div className="flex gap-3 min-w-max">
        {PIPELINE.map((st) => {
          const cfg = STATUS[st];
          const list = rows.filter((r) => r.status === st);
          const amount = list.reduce((s, r) => s + Number(r.total || 0), 0);
          return (
            <div key={st} className="w-72 shrink-0">
              <div className={`rounded-2xl border-2 p-3 mb-2 ${cfg.pill} border-transparent`}>
                <div className="flex items-center justify-between gap-2">
                  <span className="font-black text-sm">{cfg.label}</span>
                  <span className="px-2 py-0.5 rounded-full bg-white/60 dark:bg-black/20 text-[11px] font-black tabular-nums">
                    {list.length}
                  </span>
                </div>
                <div className="text-[10px] font-bold opacity-80 mt-0.5">{cfg.hint}</div>
                {amount > 0 && (
                  <div className="text-[11px] font-black tabular-nums mt-1">{formatPKR(amount)}</div>
                )}
              </div>

              <div className="space-y-2">
                {list.length === 0 ? (
                  <div className="rounded-xl border-2 border-dashed border-slate-200 dark:border-slate-700 p-4 text-center text-[11px] font-bold text-slate-400">
                    Khali
                  </div>
                ) : list.map((r) => (
                  <div key={r.id}
                    className={`rounded-xl bg-white dark:bg-slate-900 border-2 p-3 shadow-sm transition hover:shadow-md ${
                      r.lateDelivery ? 'border-rose-300 dark:border-rose-500/50'
                        : r.deliverToday ? 'border-sky-300 dark:border-sky-500/50'
                        : 'border-slate-200 dark:border-slate-800'
                    }`}>
                    <Link to={`/agri/bulk-orders/${r.id}`}
                      className="font-mono font-extrabold text-[12px] text-slate-900 dark:text-white hover:text-emerald-600 block truncate transition">
                      {r.orderNumber}
                    </Link>
                    <div className="text-[11px] font-bold text-slate-500 dark:text-slate-400 truncate">
                      {r.customerName || 'Farmer'}
                    </div>
                    <div className="mt-1 flex items-center justify-between gap-2">
                      <span className="text-[12px] font-black text-slate-900 dark:text-white tabular-nums">
                        {formatPKR(r.total)}
                      </span>
                      <span className="text-[10px] font-bold text-slate-400 tabular-nums">
                        {fmtQty(r.qty)} cheezein
                      </span>
                    </div>
                    {r.deliveryDate && (
                      <div className={`mt-1 text-[10px] font-extrabold inline-flex items-center gap-1 ${
                        r.lateDelivery ? 'text-rose-600 dark:text-rose-400'
                          : r.deliverToday ? 'text-sky-600 dark:text-sky-400'
                          : 'text-slate-400'
                      }`}>
                        <Calendar className="h-3 w-3" />
                        {r.toDeliver !== null ? dayPhrase(r.toDeliver) : '—'}
                      </div>
                    )}
                    {cfg.next && (
                      <button onClick={() => onAdvance(r.id, cfg.next!)} disabled={busy}
                        className={`mt-2 w-full h-8 rounded-lg text-white text-[10px] font-extrabold inline-flex items-center justify-center gap-1 disabled:opacity-50 transition ${STATUS[cfg.next].color} hover:opacity-90`}>
                        {cfg.nextLabel} <ArrowRight className="h-3 w-3" />
                      </button>
                    )}
                  </div>
                ))}
              </div>
            </div>
          );
        })}
      </div>
    </div>
  );
}

/* ═════════════════════════════════════════════════════════════
   PAISA AAYA
   ═════════════════════════════════════════════════════════════ */
function PaymentModal({ order, onClose, onConfirm, saving }: any) {
  const remaining = Number(order.total || 0) - Number(order.paidAmount || 0);
  const [amount, setAmount] = useState<number | ''>(remaining > 0 ? remaining : '');
  const n = Number(amount) || 0;
  const ok = n > 0 && n <= remaining + 0.01;

  useEffect(() => {
    const prev = document.body.style.overflow;
    document.body.style.overflow = 'hidden';
    const onKey = (e: KeyboardEvent) => {
      if (e.key === 'Enter' && ok && !saving) { e.preventDefault(); onConfirm(n); }
    };
    window.addEventListener('keydown', onKey);
    return () => { document.body.style.overflow = prev; window.removeEventListener('keydown', onKey); };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [ok, saving, n]);

  return (
    <div className="fixed inset-0 z-50 bg-slate-950/70 backdrop-blur-sm flex items-end sm:items-center justify-center p-0 sm:p-4" onClick={onClose}>
      <div className="w-full sm:max-w-md bg-white dark:bg-slate-900 rounded-t-3xl sm:rounded-3xl shadow-2xl overflow-hidden"
        onClick={(e) => e.stopPropagation()}>
        <div className="px-5 py-4 bg-gradient-to-br from-emerald-600 to-lime-700 text-white flex items-start justify-between gap-3">
          <div className="min-w-0">
            <div className="inline-flex items-center gap-1.5 rounded-full bg-white/20 px-2 py-0.5 text-[10px] font-extrabold">
              <Wallet className="h-3 w-3" /> Paisa aaya
            </div>
            <h3 className="font-extrabold text-lg mt-1.5 truncate">{order.customerName || order.orderNumber}</h3>
            <div className="text-xs text-white/80 font-bold">
              Kul {formatPKR(order.total)} · mil chuka {formatPKR(order.paidAmount)}
            </div>
          </div>
          <button onClick={onClose} className="h-9 w-9 rounded-lg bg-white/20 hover:bg-white/30 flex items-center justify-center shrink-0 transition">
            <X className="h-4 w-4" />
          </button>
        </div>

        <div className="p-5 space-y-4">
          <div>
            <label className="block text-[11px] font-black uppercase tracking-widest text-slate-500 mb-1.5">
              Kitna paisa aaya?
            </label>
            <input autoFocus type="number" min={0} max={remaining} step="any" value={amount}
              onChange={(e) => setAmount(e.target.value === '' ? '' : Math.max(0, Number(e.target.value)))}
              className="h-14 w-full rounded-2xl border-2 border-emerald-300 dark:border-emerald-500/40 bg-emerald-50 dark:bg-emerald-500/10 px-4 text-center text-3xl font-extrabold tabular-nums text-emerald-900 dark:text-emerald-200 focus:outline-none focus:border-emerald-600 transition" />
            <div className="mt-2 flex flex-wrap gap-1.5">
              {[0.25, 0.5, 1].map((f) => (
                <button key={f} onClick={() => setAmount(Math.round(remaining * f))}
                  className="px-3 py-1.5 rounded-xl border-2 border-emerald-200 dark:border-emerald-500/40 bg-white dark:bg-slate-800 hover:bg-emerald-50 dark:hover:bg-emerald-500/15 text-emerald-800 dark:text-emerald-300 text-xs font-extrabold transition">
                  {f === 1 ? 'Poora' : `${f * 100}%`} ({formatPKR(remaining * f)})
                </button>
              ))}
            </div>
          </div>

          <div className="rounded-2xl bg-slate-50 dark:bg-slate-800/60 border-2 border-slate-200 dark:border-slate-700 p-3 flex items-center justify-between gap-3">
            <div>
              <div className="text-[10px] uppercase font-extrabold text-slate-500 tracking-wider">Ab baqi rahega</div>
              <div className={`text-2xl font-black tabular-nums ${
                remaining - n <= 0 ? 'text-emerald-700 dark:text-emerald-400' : 'text-amber-700 dark:text-amber-400'
              }`}>
                {formatPKR(Math.max(remaining - n, 0))}
              </div>
            </div>
            {remaining - n <= 0 && n > 0 && (
              <span className="px-2.5 py-1 rounded-xl bg-emerald-100 dark:bg-emerald-500/20 text-emerald-700 dark:text-emerald-300 text-xs font-black inline-flex items-center gap-1">
                <CheckCircle2 className="h-3.5 w-3.5" /> Poora ho gaya
              </span>
            )}
          </div>

          {n > remaining && (
            <div className="rounded-xl bg-rose-50 dark:bg-rose-500/15 border-2 border-rose-200 dark:border-rose-500/40 p-2.5 text-xs font-bold text-rose-800 dark:text-rose-300 flex items-center gap-2">
              <AlertTriangle className="h-4 w-4 shrink-0" />
              Baqi se zyada nahi ho sakta — sirf {formatPKR(remaining)} lena hai
            </div>
          )}

          <div className="flex gap-2">
            <Button variant="secondary" className="flex-1" onClick={onClose}>Rehne do</Button>
            <Button className="flex-1 bg-gradient-to-r from-emerald-600 to-lime-700" disabled={!ok}
              loading={saving} onClick={() => onConfirm(n)}>
              <Wallet className="h-4 w-4" /> Likh dein
            </Button>
          </div>
        </div>
      </div>
    </div>
  );
}

/* ═════════════════════════════════════════════════════════════
   CANCEL
   ═════════════════════════════════════════════════════════════ */
const CANCEL_REASONS = [
  'Farmer ne mana kar diya',
  'Maal poora nahi tha',
  'Rate par baat nahi bani',
  'Mausam kharab ho gaya',
  'Farmer ne kahin aur se le liya',
];

function CancelModal({ order, onClose, onConfirm, saving }: any) {
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
              <Ban className="h-3 w-3" /> Order cancel karein
            </div>
            <h3 className="font-extrabold text-lg mt-1.5 truncate font-mono">{order.orderNumber}</h3>
            <div className="text-xs text-white/80 font-bold">
              {order.customerName || 'Farmer'} · {formatPKR(order.total)}
            </div>
          </div>
          <button onClick={onClose} className="h-9 w-9 rounded-lg bg-white/20 hover:bg-white/30 flex items-center justify-center shrink-0 transition">
            <X className="h-4 w-4" />
          </button>
        </div>

        <div className="p-5 space-y-3">
          <div>
            <label className="block text-[11px] font-black uppercase tracking-widest text-slate-500 mb-1.5">
              Cancel kyun kar rahe hain? <span className="text-rose-500">*</span>
            </label>
            <textarea rows={3} autoFocus value={reason} onChange={(e) => setReason(e.target.value)}
              placeholder="Wajah likhein — baad me samajhne me aasani hogi…"
              className="w-full rounded-xl border-2 border-slate-200 dark:border-slate-700 bg-white dark:bg-slate-800 px-3 py-2 text-sm font-bold text-slate-900 dark:text-white placeholder:text-slate-400 focus:outline-none focus:border-rose-500 resize-none transition" />
          </div>

          <div className="flex flex-wrap gap-1.5">
            {CANCEL_REASONS.map((r) => (
              <button key={r} type="button" onClick={() => setReason(r)}
                className="px-2.5 py-1.5 rounded-lg bg-slate-100 dark:bg-slate-800 hover:bg-rose-50 dark:hover:bg-rose-500/15 text-[11px] font-extrabold text-slate-600 dark:text-slate-300 transition">
                {r}
              </button>
            ))}
          </div>

          {Number(order.paidAmount) > 0 && (
            <div className="rounded-xl bg-amber-50 dark:bg-amber-500/10 border-2 border-amber-200 dark:border-amber-500/30 p-2.5 text-[11px] font-bold text-amber-900 dark:text-amber-200 flex items-start gap-2">
              <AlertTriangle className="h-4 w-4 shrink-0 mt-0.5" />
              <span>
                Is order par <strong>{formatPKR(order.paidAmount)}</strong> pehle hi mil chuka hai.
                Cancel karne ke baad wo paisa wapas karna hoga ya kisi aur order me lagana hoga —
                system khud nahi karega.
              </span>
            </div>
          )}

          <div className="flex gap-2 pt-1">
            <Button variant="secondary" className="flex-1" onClick={onClose}>Rehne do</Button>
            <Button className="flex-1 bg-rose-600 hover:bg-rose-700" disabled={!ok} loading={saving}
              onClick={() => onConfirm(reason.trim())}>
              <Ban className="h-4 w-4" /> Cancel karein
            </Button>
          </div>
        </div>
      </div>
    </div>
  );
}

/* ═════════════════════════════════════════════════════════════
   ANALYTICS
   ═════════════════════════════════════════════════════════════ */
function Analytics({ stats, statusPie, monthChart, seasonChart, topProducts, rows }: any) {
  const topFarmers = useMemo(() => {
    const m = new Map<string, { name: string; phone?: string; total: number; baqi: number; n: number }>();
    rows.forEach((r: any) => {
      const key = r.customerId || r.farmerId || r.customerName || r.id;
      const e = m.get(key) ?? { name: r.customerName || 'Farmer', phone: r.customerPhone, total: 0, baqi: 0, n: 0 };
      e.total += Number(r.total || 0);
      e.baqi += r.remaining;
      e.n += 1;
      m.set(key, e);
    });
    return [...m.values()].sort((a, b) => b.total - a.total).slice(0, 6);
  }, [rows]);

  return (
    <div className="space-y-4">
      <section className="grid sm:grid-cols-2 lg:grid-cols-4 gap-3">
        <MiniStat icon={DollarSign} label="Pahunche hue order" value={formatPKR(stats.revenue)}
          sub={`${stats.delivered} orders`} tone="emerald" />
        <MiniStat icon={Wallet} label="Bahar para paisa" value={formatPKR(stats.moneyOut)}
          sub={`${stats.moneyOutCount} orders ka baqi`} tone="amber" />
        <MiniStat icon={TrendingUp} label="Aam order" value={formatPKR(stats.avgOrder)} tone="lime" />
        <MiniStat icon={AlertTriangle} label="Tareekh guzri" value={stats.overdueCredit}
          sub={stats.overdueAmount > 0 ? formatPKR(stats.overdueAmount) : 'Koi nahi'} tone="rose" />
      </section>

      {stats.moneyOut > 0 && (
        <section className="rounded-3xl bg-amber-50 dark:bg-amber-500/10 border-2 border-amber-200 dark:border-amber-500/30 p-4">
          <div className="flex items-center gap-2 mb-1">
            <Scissors className="h-4 w-4 text-amber-600" />
            <h3 className="font-black text-amber-900 dark:text-amber-200">Wusooli ka waqt</h3>
          </div>
          <p className="text-[12px] font-bold text-amber-900 dark:text-amber-200 leading-relaxed">
            Abhi <strong>{formatPKR(stats.moneyOut)}</strong> farmer ke paas hai. Ye paisa katai ke
            baad hi aata hai — us waqt "Fasal ka calendar" khol kar dekhein ke kis fasal ki katai
            chal rahi hai, aur unhi farmer se pehle maangein jin ki fasal kat chuki hai.
          </p>
          <Link to="/agri/seasonal-plans"
            className="mt-2 h-9 px-3 rounded-xl bg-amber-600 hover:bg-amber-700 text-white text-xs font-black inline-flex items-center gap-1.5 transition">
            <Calendar className="h-3.5 w-3.5" /> Fasal ka calendar
          </Link>
        </section>
      )}

      <div className="grid lg:grid-cols-2 gap-4">
        <ChartCard icon={BarChart3} title="Pichle 6 mahine" wide>
          {monthChart.some((m: any) => m.bikri > 0) ? (
            <ResponsiveContainer width="100%" height="100%">
              <BarChart data={monthChart}>
                <CartesianGrid strokeDasharray="3 3" stroke={GRID} vertical={false} />
                <XAxis dataKey="name" stroke={AXIS} fontSize={10} fontWeight={700} />
                <YAxis stroke={AXIS} fontSize={11} width={78} tickFormatter={(v) => Number(v).toLocaleString('en-PK')} />
                <Tooltip contentStyle={TOOLTIP} formatter={(v: any, n: any) => [formatPKR(Number(v)), n === 'bikri' ? 'Kul order' : 'Paisa baqi']} />
                <Legend formatter={(v) => (v === 'bikri' ? 'Kul order' : 'Paisa baqi')} />
                <Bar dataKey="bikri" fill="#10b981" radius={[6, 6, 0, 0]} />
                <Bar dataKey="baqi" fill="#f59e0b" radius={[6, 6, 0, 0]} />
              </BarChart>
            </ResponsiveContainer>
          ) : <EmptyBox text="Abhi koi order nahi" />}
        </ChartCard>

        <ChartCard icon={Layers} title="Order kahan tak pahunche">
          {statusPie.length > 0 ? (
            <ResponsiveContainer width="100%" height="100%">
              <PieChart>
                <Pie data={statusPie} dataKey="value" nameKey="name" innerRadius={55} outerRadius={90} paddingAngle={3}>
                  {statusPie.map((_: any, i: number) => <Cell key={i} fill={PIE_COLORS[i % PIE_COLORS.length]} />)}
                </Pie>
                <Tooltip contentStyle={TOOLTIP} />
                <Legend />
              </PieChart>
            </ResponsiveContainer>
          ) : <EmptyBox text="Abhi koi order nahi" />}
        </ChartCard>

        <ChartCard icon={Calendar} title="Kis mausam me kitna bika">
          {seasonChart.length > 0 ? (
            <ResponsiveContainer width="100%" height="100%">
              <PieChart>
                <Pie data={seasonChart} dataKey="value" nameKey="name" innerRadius={55} outerRadius={90} paddingAngle={3}>
                  {seasonChart.map((_: any, i: number) => <Cell key={i} fill={PIE_COLORS[i % PIE_COLORS.length]} />)}
                </Pie>
                <Tooltip contentStyle={TOOLTIP} formatter={(v: any) => formatPKR(Number(v))} />
                <Legend />
              </PieChart>
            </ResponsiveContainer>
          ) : <EmptyBox text="Mausam likha hi nahi gaya" />}
        </ChartCard>

        <ChartCard icon={Wheat} title="Bare order me kya sab se zyada jata hai" wide>
          {topProducts.length > 0 ? (
            <ResponsiveContainer width="100%" height="100%">
              <BarChart data={topProducts} layout="vertical">
                <CartesianGrid strokeDasharray="3 3" stroke={GRID} horizontal={false} />
                <XAxis type="number" stroke={AXIS} fontSize={11} tickFormatter={(v) => Number(v).toLocaleString('en-PK')} />
                <YAxis type="category" dataKey="name" stroke={AXIS} fontSize={10} fontWeight={700} width={95} />
                <Tooltip contentStyle={TOOLTIP}
                  formatter={(v: any, _n: any, p: any) => [`${formatPKR(Number(v))} · ${fmtQty(p.payload.qty)} cheezein`, 'Kul']} />
                <Bar dataKey="value" radius={[0, 6, 6, 0]}>
                  {topProducts.map((_: any, i: number) => <Cell key={i} fill={PIE_COLORS[i % PIE_COLORS.length]} />)}
                </Bar>
              </BarChart>
            </ResponsiveContainer>
          ) : <EmptyBox text="Abhi koi order nahi" />}
        </ChartCard>
      </div>

      {topFarmers.length > 0 && (
        <section className="rounded-3xl bg-white dark:bg-slate-900 border-2 border-slate-200 dark:border-slate-800 shadow-sm overflow-hidden">
          <div className="px-4 py-3 border-b-2 border-slate-100 dark:border-slate-800 flex items-center gap-2">
            <User className="h-4 w-4 text-emerald-600" />
            <h3 className="font-black text-slate-900 dark:text-white">Sab se bare farmer</h3>
          </div>
          <div className="divide-y divide-slate-100 dark:divide-slate-800">
            {topFarmers.map((f, i) => (
              <div key={i} className="p-3 flex items-center gap-3">
                <span className="h-8 w-8 rounded-xl bg-emerald-100 dark:bg-emerald-500/20 flex items-center justify-center text-xs font-black text-emerald-700 dark:text-emerald-300 shrink-0">
                  {i + 1}
                </span>
                <div className="min-w-0 flex-1">
                  <div className="font-extrabold text-sm text-slate-900 dark:text-white truncate">{f.name}</div>
                  <div className="text-[11px] font-bold text-slate-400">
                    {f.n} order{f.phone ? ` · ${f.phone}` : ''}
                  </div>
                </div>
                {f.baqi > 0 && (
                  <span className="text-[11px] font-black tabular-nums text-amber-600 dark:text-amber-400 shrink-0">
                    baqi {formatPKR(f.baqi)}
                  </span>
                )}
                <span className="text-sm font-black tabular-nums text-slate-900 dark:text-white shrink-0">
                  {formatPKR(f.total)}
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
   CHHOTE HISSE
   ═════════════════════════════════════════════════════════════ */
function Kpi({ icon: Icon, label, value, sub, tone, onClick, active }: any) {
  const tones: Record<string, string> = {
    emerald: 'from-emerald-500 to-green-600 shadow-emerald-500/40',
    lime: 'from-lime-500 to-green-600 shadow-lime-500/40',
    amber: 'from-amber-500 to-orange-600 shadow-amber-500/40',
    rose: 'from-rose-500 to-rose-700 shadow-rose-500/40',
  };
  const Comp: any = onClick ? 'button' : 'div';
  return (
    <Comp onClick={onClick}
      className={[
        'rounded-2xl bg-white dark:bg-slate-900/80 border-2 p-3 sm:p-4 shadow-sm text-left w-full transition-all duration-200',
        onClick ? 'hover:-translate-y-0.5 hover:shadow-lg cursor-pointer active:scale-[0.98]' : '',
        active ? 'border-emerald-500 ring-2 ring-emerald-200 dark:ring-emerald-500/20' : 'border-slate-200 dark:border-slate-800 hover:border-slate-300 dark:hover:border-slate-700',
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
  };
  return (
    <div className="rounded-2xl bg-white dark:bg-slate-900 border-2 border-slate-200 dark:border-slate-800 p-4">
      <div className="flex items-center gap-1.5">
        <Icon className={`h-4 w-4 ${tones[tone] ?? tones.emerald}`} />
        <span className="text-[10px] font-black uppercase tracking-widest text-slate-500 truncate">{label}</span>
      </div>
      <div className="mt-1.5 text-xl font-black text-slate-900 dark:text-white tabular-nums break-words">{value}</div>
      {sub && <div className="text-[11px] font-bold text-slate-400 mt-0.5">{sub}</div>}
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

function EmptyBox({ text }: { text: string }) {
  return <div className="h-full flex items-center justify-center"><p className="text-sm font-bold text-slate-400 text-center px-4">{text}</p></div>;
}

function Empty({ hasFilters, onClear, onGuide }: any) {
  return (
    <section className="rounded-3xl bg-white dark:bg-slate-900 border-2 border-dashed border-slate-300 dark:border-slate-700 p-10 sm:p-16 text-center">
      <div className="mx-auto h-20 w-20 rounded-3xl bg-gradient-to-br from-emerald-500 to-lime-700 flex items-center justify-center shadow-lg shadow-emerald-500/40">
        <Package className="h-10 w-10 text-white" />
      </div>
      <h3 className="mt-4 text-lg font-extrabold text-slate-900 dark:text-white">
        {hasFilters ? 'Is chaant par kuch nahi mila' : 'Abhi koi bara order nahi'}
      </h3>
      <p className="text-sm text-slate-500 dark:text-slate-400 mt-1.5 font-semibold max-w-md mx-auto leading-relaxed">
        {hasFilters
          ? 'Chaant badal kar dekhein'
          : 'Jab koi farmer 20-50 bori ka sauda kare, wo yahan banayein — delivery, udhaar aur wusooli sab ka hisab rahega.'}
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
            <Link to="/agri/bulk-orders/new"
              className="h-11 px-4 rounded-xl bg-emerald-600 hover:bg-emerald-700 text-white text-xs font-extrabold inline-flex items-center gap-1.5 transition">
              <Plus className="h-4 w-4" /> Pehla order banayein
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
            <GraduationCap className="h-5 w-5" /> Bare order kaise chalte hain
          </h3>
          <button onClick={onClose} className="h-9 w-9 rounded-lg hover:bg-white dark:hover:bg-slate-800 flex items-center justify-center transition">
            <X className="h-4 w-4 text-slate-600 dark:text-slate-300" />
          </button>
        </div>
        <div className="p-5 space-y-3 text-sm">
          <div className="rounded-2xl bg-emerald-50 dark:bg-emerald-500/10 border-2 border-emerald-200 dark:border-emerald-500/30 p-3">
            <p className="text-[12px] font-bold text-emerald-900 dark:text-emerald-200 leading-relaxed">
              Bara order chhoti bikri jaisa nahi hota. Maal bori me jata hai, aksar{' '}
              <strong>udhaar par</strong>, aur paisa <strong>katai ke baad</strong> aata hai.
              Is liye do cheezon ka hisab rakhna parta hai: maal kahan tak pahuncha, aur paisa
              kitna bahar hai.
            </p>
          </div>
          <Tip icon={Wallet} title="Bahar para paisa — sab se ahem">
            Ooper ka pehla number wo paisa hai jo farmer ke paas hai. Aam dukaan ka aadha sarmaya
            isi tarah bahar para hota hai. Jis ki tareekh guzar jaye us ki alag patti aati hai,
            aur us ki list WhatsApp par bhej sakte hain.
          </Tip>
          <Tip icon={Layers} title="Board — gudaam wale ke liye">
            Doosra tab har qadam ka apna column dikhata hai: pakka hua → maal nikal rahe →
            tayyar → raaste me. Har card par agla qadam ka button hai, ek click me aage barh
            jata hai.
          </Tip>
          <Tip icon={Truck} title="Delivery ki tareekh">
            Jo aaj jana hai ya jis ki tareekh guzar chuki, wo sab se ooper neeli patti me aata
            hai. Us par click karke seedha order khul jata hai.
          </Tip>
          <Tip icon={Scissors} title="Wusooli katai ke waqt">
            Farmer ke paas paisa sirf katai ke baad aata hai. Us waqt "Fasal ka calendar" khol
            kar dekhein ke kis ki fasal kat chuki — unhi se pehle maangein. Baad me paisa kahin
            aur lag jata hai.
          </Tip>
          <Tip icon={Ban} title="Cancel karte waqt">
            Wajah zaroor likhein. Aur agar us order par paisa pehle hi aa chuka hai to system
            khud wapas nahi karega — wo aap ko khud sambhalna hoga.
          </Tip>
          <div className="rounded-2xl bg-slate-50 dark:bg-slate-800 p-3">
            <div className="text-[10px] font-black uppercase tracking-widest text-slate-500 mb-2">Shortcuts</div>
            <div className="grid grid-cols-2 gap-1.5 text-[11px] font-bold text-slate-600 dark:text-slate-300">
              <div><kbd className="px-1.5 py-0.5 rounded bg-white dark:bg-slate-900 border">/</kbd> dhoondo</div>
              <div><kbd className="px-1.5 py-0.5 rounded bg-white dark:bg-slate-900 border">1-3</kbd> tabs</div>
              <div><kbd className="px-1.5 py-0.5 rounded bg-white dark:bg-slate-900 border">Enter</kbd> payment save</div>
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
