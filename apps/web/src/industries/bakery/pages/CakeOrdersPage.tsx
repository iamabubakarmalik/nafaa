import { useMemo, useState, useEffect, useRef } from 'react';
import { Link } from 'react-router-dom';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import {
  Cake, Plus, X, Search, RefreshCw, Calendar, Clock, Phone, MapPin,
  CheckCircle2, AlertTriangle, BarChart3, GraduationCap, FileSpreadsheet,
  Printer, Truck, Store, Wallet, Loader2, ChefHat, Star, Layers,
  MessageCircle, ArrowRight, DollarSign, Flame, TrendingUp,
} from 'lucide-react';
import {
  ResponsiveContainer, BarChart, Bar, XAxis, YAxis, Tooltip, CartesianGrid,
  PieChart, Pie, Cell, Legend,
} from 'recharts';
import { toast } from 'sonner';
import { cakeOrdersApi, type CakeOrder } from '../api/cake-orders.api';
import { formatPKR } from '@core/lib/format';
import { Button } from '@core/ui/Button';
import { useAuthStore } from '@core/stores/auth.store';

/* ═════════════════════════════════════════════════════════════
   CAKE ORDERS — PEHLE SE BOOK HUE CAKE
   ─────────────────────────────────────────────────────────────
   Ye bakery ka sab se nazuk kaam hai. Shadi ya birthday ka cake
   waqt par na mile to customer hamesha ke liye chala jata hai,
   aur paisa bhi wapas karna parta hai.

   Is liye is safhe ka pehla sawal ek hi hai: *kaun sa cake kab
   tak dena hai, aur kya wo waqt par ban raha hai?* Jo aaj dena
   hai wo sab se upar; jis ka waqt guzar chuka wo laal.

   Doosri ahem cheez advance hai — bina advance liye bara cake
   banane se bakery ka paisa phans jata hai. Wo bhi saamne rehta
   hai.
   ═════════════════════════════════════════════════════════════ */

type Tab = 'list' | 'analytics';
type Filter = 'active' | 'today' | 'late' | 'ready' | 'all';

const STATUS: Record<string, { label: string; chip: string; dot: string }> = {
  ENQUIRY:          { label: 'Poocha hai', chip: 'bg-slate-100 dark:bg-slate-700 text-slate-600 dark:text-slate-300', dot: 'bg-slate-400' },
  CONFIRMED:        { label: 'Pakka hua', chip: 'bg-blue-100 dark:bg-blue-500/20 text-blue-700 dark:text-blue-300', dot: 'bg-blue-500' },
  DEPOSIT_PAID:     { label: 'Advance mila', chip: 'bg-cyan-100 dark:bg-cyan-500/20 text-cyan-700 dark:text-cyan-300', dot: 'bg-cyan-500' },
  IN_PRODUCTION:    { label: 'Ban raha hai', chip: 'bg-orange-100 dark:bg-orange-500/20 text-orange-700 dark:text-orange-300', dot: 'bg-orange-500' },
  BAKING:           { label: 'Oven me hai', chip: 'bg-orange-100 dark:bg-orange-500/20 text-orange-700 dark:text-orange-300', dot: 'bg-orange-500' },
  DECORATING:       { label: 'Sajawat ho rahi', chip: 'bg-fuchsia-100 dark:bg-fuchsia-500/20 text-fuchsia-700 dark:text-fuchsia-300', dot: 'bg-fuchsia-500' },
  QUALITY_CHECK:    { label: 'Check ho raha', chip: 'bg-violet-100 dark:bg-violet-500/20 text-violet-700 dark:text-violet-300', dot: 'bg-violet-500' },
  READY:            { label: 'Tayyar hai', chip: 'bg-emerald-100 dark:bg-emerald-500/20 text-emerald-700 dark:text-emerald-300', dot: 'bg-emerald-500' },
  OUT_FOR_DELIVERY: { label: 'Raaste me', chip: 'bg-amber-100 dark:bg-amber-500/20 text-amber-700 dark:text-amber-300', dot: 'bg-amber-500' },
  DELIVERED:        { label: 'De diya', chip: 'bg-emerald-100 dark:bg-emerald-500/20 text-emerald-700 dark:text-emerald-300', dot: 'bg-emerald-600' },
  CANCELLED:        { label: 'Cancel', chip: 'bg-rose-100 dark:bg-rose-500/20 text-rose-700 dark:text-rose-300', dot: 'bg-rose-500' },
};

/** Agla qadam kya hai — bawarchi ko yehi chahiye */
const NEXT: Record<string, { to: string; label: string }> = {
  ENQUIRY:       { to: 'CONFIRMED', label: 'Pakka karein' },
  CONFIRMED:     { to: 'IN_PRODUCTION', label: 'Banana shuru' },
  DEPOSIT_PAID:  { to: 'IN_PRODUCTION', label: 'Banana shuru' },
  IN_PRODUCTION: { to: 'DECORATING', label: 'Sajawat shuru' },
  BAKING:        { to: 'DECORATING', label: 'Sajawat shuru' },
  DECORATING:    { to: 'READY', label: 'Tayyar hai' },
  QUALITY_CHECK: { to: 'READY', label: 'Tayyar hai' },
  READY:         { to: 'DELIVERED', label: 'De diya' },
  OUT_FOR_DELIVERY: { to: 'DELIVERED', label: 'De diya' },
};

const DONE = ['DELIVERED', 'CANCELLED'];
const GRID = '#94a3b8';
const AXIS = '#64748b';
const PIE_COLORS = ['#ec4899', '#f59e0b', '#8b5cf6', '#10b981', '#3b82f6', '#ef4444', '#14b8a6'];
const TOOLTIP = {
  borderRadius: 12, border: '2px solid #cbd5e1', background: '#ffffff',
  color: '#0f172a', fontWeight: 700, fontSize: 12,
};

function hoursTo(iso?: string): number | null {
  if (!iso) return null;
  const t = new Date(iso).getTime();
  return Number.isNaN(t) ? null : (t - Date.now()) / 3_600_000;
}

function phrase(h: number): string {
  if (h < 0) {
    const p = Math.abs(h);
    return p < 24 ? `${Math.round(p)} ghante late` : `${Math.round(p / 24)} din late`;
  }
  if (h < 1) return `${Math.round(h * 60)} minute me`;
  if (h < 24) return `${Math.round(h)} ghante me`;
  return `${Math.round(h / 24)} din baad`;
}

export default function CakeOrdersPage() {
  const qc = useQueryClient();
  const tenant = useAuthStore((s) => s.tenant);
  const searchRef = useRef<HTMLInputElement>(null);

  const [tab, setTab] = useState<Tab>('list');
  const [filter, setFilter] = useState<Filter>('active');
  const [search, setSearch] = useState('');
  const [showTeacher, setShowTeacher] = useState(false);
  const [payOn, setPayOn] = useState<CakeOrder | null>(null);

  const listQ = useQuery({
    queryKey: ['cake-orders'],
    queryFn: () => cakeOrdersApi.list({}),
    refetchInterval: 120_000,
  });

  const statusMut = useMutation({
    mutationFn: ({ id, status }: { id: string; status: string }) => cakeOrdersApi.updateStatus(id, status),
    onSuccess: () => { toast.success('Halat badal di'); qc.invalidateQueries({ queryKey: ['cake-orders'] }); },
    onError: (e: any) => toast.error(e?.response?.data?.message || 'Nahi badla'),
  });

  /* ── Rows ── */
  const rows = useMemo(() => {
    const list = listQ.data ?? [];
    return list.map((o) => {
      const left = hoursTo(o.deliveryDate || o.neededBy);
      const due = Math.max(Number(o.total || 0) - Number(o.paidAmount || 0), 0);
      const advanceShort = Math.max(Number(o.advanceRequired || 0) - Number(o.advancePaid || 0), 0);
      return {
        ...o,
        left,
        due,
        advanceShort,
        isDone: DONE.includes(o.status),
        isLate: left !== null && left < 0 && !DONE.includes(o.status),
        isToday: left !== null && left >= 0 && left <= 24,
      };
    });
  }, [listQ.data]);

  const q = search.trim().toLowerCase();
  const shown = useMemo(() => {
    let out = rows;
    if (filter === 'active') out = out.filter((r) => !r.isDone);
    if (filter === 'today') out = out.filter((r) => r.isToday && !r.isDone);
    if (filter === 'late') out = out.filter((r) => r.isLate);
    if (filter === 'ready') out = out.filter((r) => r.status === 'READY' || r.status === 'OUT_FOR_DELIVERY');
    if (q) out = out.filter((r) =>
      (r.customerName || '').toLowerCase().includes(q) ||
      (r.orderNumber || '').toLowerCase().includes(q) ||
      (r.customerPhone || '').toLowerCase().includes(q) ||
      (r.occasion || '').toLowerCase().includes(q));
    /* Jo pehle dena hai wo pehle — late sab se upar */
    return [...out].sort((a, b) => (a.left ?? 99999) - (b.left ?? 99999));
  }, [rows, filter, q]);

  /* ── Stats ── */
  const stats = useMemo(() => {
    const active = rows.filter((r) => !r.isDone);
    return {
      active: active.length,
      today: active.filter((r) => r.isToday).length,
      late: rows.filter((r) => r.isLate).length,
      ready: active.filter((r) => r.status === 'READY' || r.status === 'OUT_FOR_DELIVERY').length,
      value: active.reduce((s, r) => s + Number(r.total || 0), 0),
      due: active.reduce((s, r) => s + r.due, 0),
      advanceShort: active.filter((r) => r.advanceShort > 0).length,
      delivered: rows.filter((r) => r.status === 'DELIVERED').length,
      cancelled: rows.filter((r) => r.status === 'CANCELLED').length,
      avgRating: (() => {
        const rated = rows.filter((r) => Number(r.customerRating) > 0);
        return rated.length > 0 ? rated.reduce((s, r) => s + Number(r.customerRating), 0) / rated.length : 0;
      })(),
    };
  }, [rows]);

  /* ── Charts ── */
  const statusPie = useMemo(() => {
    const m = new Map<string, number>();
    rows.filter((r) => !r.isDone).forEach((r) => m.set(r.status, (m.get(r.status) ?? 0) + 1));
    return [...m.entries()].map(([k, v]) => ({ name: STATUS[k]?.label ?? k, value: v }));
  }, [rows]);

  const occasionChart = useMemo(() => {
    const m = new Map<string, number>();
    rows.forEach((r) => { if (r.occasion) m.set(r.occasion, (m.get(r.occasion) ?? 0) + 1); });
    return [...m.entries()].sort((a, b) => b[1] - a[1]).slice(0, 8)
      .map(([name, value]) => ({ name: name.slice(0, 14), value }));
  }, [rows]);

  const monthChart = useMemo(() => {
    const m = new Map<string, { orders: number; value: number }>();
    rows.forEach((r) => {
      const d = new Date(r.createdAt);
      if (Number.isNaN(d.getTime())) return;
      const key = d.toLocaleDateString('en-PK', { month: 'short', year: '2-digit' });
      const e = m.get(key) ?? { orders: 0, value: 0 };
      e.orders += 1; e.value += Number(r.total || 0);
      m.set(key, e);
    });
    return [...m.entries()].slice(-8).map(([name, v]) => ({ name, orders: v.orders, value: Math.round(v.value) }));
  }, [rows]);

  const exportCsv = () => {
    const head = ['Order', 'Customer', 'Phone', 'Mauqa', 'Kab dena hai', 'Halat', 'Total', 'Mila', 'Baqi', 'Delivery'];
    const body = shown.map((r) => [
      r.orderNumber, r.customerName, r.customerPhone, r.occasion,
      r.deliveryDate ? new Date(r.deliveryDate).toLocaleString('en-PK') : '',
      STATUS[r.status]?.label ?? r.status,
      r.total, r.paidAmount, r.due, r.deliveryType,
    ]);
    const esc = (v: any) => `"${String(v ?? '').replace(/"/g, '""')}"`;
    const csv = [head, ...body].map((r) => r.map(esc).join(',')).join('\n');
    const url = URL.createObjectURL(new Blob(['﻿' + csv], { type: 'text/csv;charset=utf-8;' }));
    const a = document.createElement('a'); a.href = url;
    a.download = `cake-orders-${new Date().toISOString().slice(0, 10)}.csv`;
    a.click(); URL.revokeObjectURL(url);
    toast.success('CSV nikal gayi');
  };

  useEffect(() => {
    const onKey = (e: KeyboardEvent) => {
      if (e.key === 'Escape') {
        if (payOn) return setPayOn(null);
        if (showTeacher) return setShowTeacher(false);
        return;
      }
      const t = document.activeElement?.tagName;
      if (t === 'INPUT' || t === 'TEXTAREA' || t === 'SELECT') return;
      if (e.key === '/') { e.preventDefault(); searchRef.current?.focus(); }
      if (e.key.toLowerCase() === 'g') setShowTeacher(true);
      if (e.key.toLowerCase() === 'a') setTab((x) => (x === 'analytics' ? 'list' : 'analytics'));
      if (e.key.toLowerCase() === 'p') window.print();
    };
    window.addEventListener('keydown', onKey);
    return () => window.removeEventListener('keydown', onKey);
  }, [payOn, showTeacher]);

  return (
    <div className="space-y-4 sm:space-y-5 pb-10">
      <div className="hidden print:block mb-4">
        <h1 className="text-xl font-extrabold">{tenant?.name || 'Bakery'} — Cake orders</h1>
        <p className="text-xs text-slate-600">{new Date().toLocaleString('en-PK', { dateStyle: 'full', timeStyle: 'short' })}</p>
      </div>

      {/* ═══ HERO ═══ */}
      <section className="relative overflow-hidden rounded-3xl bg-gradient-to-br from-slate-950 via-fuchsia-900 to-pink-700 text-white p-5 sm:p-6 shadow-2xl print:hidden">
        <div className="absolute -top-24 -right-20 h-72 w-72 rounded-full bg-fuchsia-400/25 blur-3xl" />
        <div className="absolute inset-0 opacity-[0.06]"
          style={{ backgroundImage: 'radial-gradient(circle at 1px 1px, #fff 1px, transparent 0)', backgroundSize: '22px 22px' }} />
        <div className="relative flex items-start justify-between gap-4 flex-wrap">
          <div className="min-w-0">
            <div className="inline-flex items-center gap-2 rounded-full bg-white/15 backdrop-blur px-3 py-1 text-[11px] font-black border border-white/25 uppercase tracking-widest">
              <Cake className="h-3.5 w-3.5 text-pink-300" /> Bakery · Booking
            </div>
            <h1 className="mt-3 text-2xl sm:text-3xl lg:text-4xl font-black leading-tight">🎂 Cake Orders</h1>
            <p className="mt-1.5 text-xs sm:text-sm font-bold text-white/90">
              <strong className="text-amber-200">{stats.today}</strong> aaj dena hai ·{' '}
              <strong className="text-rose-200">{stats.late}</strong> late ·{' '}
              <strong className="text-emerald-200">{stats.ready}</strong> tayyar
            </p>
          </div>
          <div className="flex gap-2 flex-wrap items-center shrink-0">
            <Link to="/bakery/cake-orders/new"
              className="h-11 px-3.5 rounded-xl bg-white text-pink-700 hover:bg-pink-50 text-xs font-black inline-flex items-center gap-1.5 shadow-lg transition">
              <Plus className="h-4 w-4" /> Naya order
            </Link>
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
            <button onClick={() => listQ.refetch()} disabled={listQ.isRefetching}
              className="h-11 w-11 rounded-xl bg-white/15 hover:bg-white/25 border border-white/25 flex items-center justify-center backdrop-blur disabled:opacity-50 transition">
              <RefreshCw className={`h-4 w-4 ${listQ.isRefetching ? 'animate-spin' : ''}`} />
            </button>
          </div>
        </div>
      </section>

      {/* ═══ KPI ═══ */}
      <section className="grid grid-cols-2 lg:grid-cols-4 gap-3 print:hidden">
        <Kpi icon={Clock} label="Aaj dena hai" value={stats.today}
          sub={stats.late > 0 ? `${stats.late} pehle hi late` : 'Koi late nahi'} tone="amber"
          onClick={() => { setFilter('today'); setTab('list'); }} />
        <Kpi icon={Layers} label="Chal rahe orders" value={stats.active}
          sub={formatPKR(stats.value)} tone="fuchsia"
          onClick={() => { setFilter('active'); setTab('list'); }} />
        <Kpi icon={Wallet} label="Lena baqi hai" value={formatPKR(stats.due)}
          sub={stats.advanceShort > 0 ? `${stats.advanceShort} ka advance adhoora` : 'Advance poora'}
          tone={stats.advanceShort > 0 ? 'rose' : 'emerald'} />
        <Kpi icon={Star} label="Customer ki raye" value={stats.avgRating > 0 ? `${stats.avgRating.toFixed(1)} / 5` : '—'}
          sub={`${stats.delivered} de diye · ${stats.cancelled} cancel`} tone="emerald" />
      </section>

      {/* ═══ LATE WARNING ═══ */}
      {stats.late > 0 && (
        <section className="rounded-3xl bg-rose-50 dark:bg-rose-500/10 border-2 border-rose-200 dark:border-rose-500/30 p-4 flex items-center gap-3 flex-wrap print:hidden">
          <AlertTriangle className="h-5 w-5 text-rose-600 shrink-0" />
          <p className="text-sm font-extrabold text-rose-900 dark:text-rose-200 min-w-0 flex-1">
            <strong>{stats.late}</strong> order ka waqt guzar chuka hai. Cake late hone par customer
            hamesha ke liye chala jata hai — pehle inhein dekhein.
          </p>
          <button onClick={() => { setFilter('late'); setTab('list'); }}
            className="h-10 px-3.5 rounded-xl bg-rose-600 hover:bg-rose-700 text-white text-xs font-black inline-flex items-center gap-1.5 transition">
            Dekhein <ArrowRight className="h-4 w-4" />
          </button>
        </section>
      )}

      {/* ═══ TABS ═══ */}
      <div className="grid grid-cols-2 gap-2 sm:gap-3 print:hidden">
        {([['list', 'Orders', Cake], ['analytics', 'Analytics', BarChart3]] as const).map(([v, label, Icon]) => (
          <button key={v} onClick={() => setTab(v as Tab)}
            className={`h-14 rounded-2xl border-2 font-black text-sm inline-flex items-center justify-center gap-2 transition ${
              tab === v
                ? 'bg-gradient-to-r from-fuchsia-500 to-pink-600 text-white border-transparent shadow-lg'
                : 'bg-white dark:bg-slate-900 text-slate-600 dark:text-slate-300 border-slate-200 dark:border-slate-800 hover:border-pink-400'
            }`}>
            <Icon className="h-4 w-4" /> {label}
            {v === 'list' && (
              <span className={`text-[10px] px-1.5 py-0.5 rounded-lg ${tab === v ? 'bg-white/25' : 'bg-slate-100 dark:bg-slate-800'}`}>{shown.length}</span>
            )}
          </button>
        ))}
      </div>

      {tab === 'list' ? (
        <>
          <section className="rounded-3xl bg-white dark:bg-slate-900 border-2 border-slate-200 dark:border-slate-800 shadow-sm p-3 sm:p-4 print:hidden">
            <div className="flex gap-2 flex-wrap items-center">
              <div className="relative flex-1 min-w-[220px]">
                <Search className="h-5 w-5 text-slate-400 absolute left-3.5 top-1/2 -translate-y-1/2 pointer-events-none" />
                <input ref={searchRef} value={search} onChange={(e) => setSearch(e.target.value)}
                  placeholder="Customer, order number, phone… (/ dabao)"
                  className="h-12 w-full rounded-2xl border-2 border-slate-200 dark:border-slate-700 bg-white dark:bg-slate-800 pl-11 pr-10 text-sm font-bold text-slate-900 dark:text-white placeholder:text-slate-400 focus:outline-none focus:border-pink-500 transition" />
                {search && (
                  <button onClick={() => setSearch('')} className="absolute right-3 top-1/2 -translate-y-1/2 h-7 w-7 rounded-lg hover:bg-slate-100 dark:hover:bg-slate-700 flex items-center justify-center">
                    <X className="h-4 w-4 text-slate-400" />
                  </button>
                )}
              </div>
              <div className="flex gap-1.5 flex-wrap">
                {([['active', 'Chal rahe'], ['today', '⏰ Aaj'], ['late', '🔴 Late'], ['ready', '✅ Tayyar'], ['all', 'Sab']] as const).map(([v, l]) => (
                  <button key={v} onClick={() => setFilter(v as Filter)}
                    className={`h-12 px-3.5 rounded-2xl border-2 text-xs font-black transition ${
                      filter === v
                        ? 'border-pink-500 bg-pink-50 dark:bg-pink-500/15 text-pink-700 dark:text-pink-300'
                        : 'border-slate-200 dark:border-slate-700 bg-white dark:bg-slate-800 text-slate-600 dark:text-slate-300 hover:border-pink-400'
                    }`}>{l}</button>
                ))}
              </div>
            </div>
          </section>

          {listQ.isLoading ? (
            <div className="flex items-center justify-center py-24">
              <div className="h-12 w-12 rounded-full border-4 border-pink-200 border-t-pink-600 animate-spin" />
            </div>
          ) : shown.length === 0 ? (
            <div className="rounded-3xl bg-white dark:bg-slate-900 border-4 border-dashed border-slate-200 dark:border-slate-700 p-10 sm:p-14 text-center">
              <div className="h-16 w-16 rounded-3xl bg-pink-100 dark:bg-pink-500/20 mx-auto flex items-center justify-center">
                <Cake className="h-8 w-8 text-pink-600 dark:text-pink-400" />
              </div>
              <p className="mt-4 font-black text-slate-800 dark:text-slate-100 text-lg sm:text-xl">
                {search ? 'Kuch nahi mila' : filter === 'late' ? 'Koi order late nahi — shabash' : 'Koi order nahi'}
              </p>
              <p className="text-xs sm:text-sm text-slate-500 dark:text-slate-400 font-bold mt-1.5 max-w-md mx-auto">
                Birthday ya shadi ka cake pehle se book hota hai — yahan se order lein taake
                waqt par tayyar ho jaye.
              </p>
              <Link to="/bakery/cake-orders/new"
                className="mt-4 h-11 px-4 rounded-xl bg-pink-600 hover:bg-pink-700 text-white text-sm font-black inline-flex items-center gap-2 transition">
                <Plus className="h-4 w-4" /> Naya order
              </Link>
            </div>
          ) : (
            <section className="space-y-2.5">
              {shown.map((o) => (
                <OrderCard key={o.id} o={o}
                  onNext={() => {
                    const n = NEXT[o.status];
                    if (n) statusMut.mutate({ id: o.id, status: n.to });
                  }}
                  onPay={() => setPayOn(o)}
                  busy={statusMut.isPending} />
              ))}
            </section>
          )}
        </>
      ) : (
        <div className="grid lg:grid-cols-2 gap-4">
          <ChartCard icon={Layers} title="Chal rahe orders kis halat me">
            {statusPie.length > 0 ? (
              <ResponsiveContainer width="100%" height="100%">
                <PieChart>
                  <Pie data={statusPie} dataKey="value" nameKey="name" innerRadius={55} outerRadius={90} paddingAngle={3}>
                    {statusPie.map((_, i) => <Cell key={i} fill={PIE_COLORS[i % PIE_COLORS.length]} />)}
                  </Pie>
                  <Tooltip contentStyle={TOOLTIP} />
                  <Legend />
                </PieChart>
              </ResponsiveContainer>
            ) : <EmptyBox />}
          </ChartCard>

          <ChartCard icon={Cake} title="Kis mauqe ke cake sab se zyada">
            {occasionChart.length > 0 ? (
              <ResponsiveContainer width="100%" height="100%">
                <BarChart data={occasionChart}>
                  <CartesianGrid strokeDasharray="3 3" stroke={GRID} vertical={false} />
                  <XAxis dataKey="name" stroke={AXIS} fontSize={10} fontWeight={700} interval={0} angle={-20} textAnchor="end" height={60} />
                  <YAxis stroke={AXIS} fontSize={11} width={45} allowDecimals={false} />
                  <Tooltip contentStyle={TOOLTIP} formatter={(v: any) => [v, 'Order']} />
                  <Bar dataKey="value" fill="#ec4899" radius={[8, 8, 0, 0]} maxBarSize={48} />
                </BarChart>
              </ResponsiveContainer>
            ) : <EmptyBox />}
          </ChartCard>

          <ChartCard icon={TrendingUp} title="Mahine ke hisaab se" wide>
            {monthChart.length > 0 ? (
              <ResponsiveContainer width="100%" height="100%">
                <BarChart data={monthChart}>
                  <CartesianGrid strokeDasharray="3 3" stroke={GRID} vertical={false} />
                  <XAxis dataKey="name" stroke={AXIS} fontSize={11} fontWeight={700} />
                  <YAxis yAxisId="l" stroke={AXIS} fontSize={11} width={78} tickFormatter={(v) => Number(v).toLocaleString('en-PK')} />
                  <YAxis yAxisId="r" orientation="right" stroke={AXIS} fontSize={11} width={45} allowDecimals={false} />
                  <Tooltip contentStyle={TOOLTIP}
                    formatter={(v: any, n: any) => [n === 'value' ? formatPKR(Number(v)) : v, n === 'value' ? 'Paisa' : 'Order']} />
                  <Legend formatter={(v) => (v === 'value' ? 'Paisa' : 'Order')} />
                  <Bar yAxisId="l" dataKey="value" fill="#8b5cf6" radius={[6, 6, 0, 0]} />
                  <Bar yAxisId="r" dataKey="orders" fill="#10b981" radius={[6, 6, 0, 0]} />
                </BarChart>
              </ResponsiveContainer>
            ) : <EmptyBox />}
          </ChartCard>
        </div>
      )}

      {payOn && <PayModal order={payOn} onClose={() => setPayOn(null)}
        onDone={() => { setPayOn(null); qc.invalidateQueries({ queryKey: ['cake-orders'] }); }} />}
      {showTeacher && <Teacher onClose={() => setShowTeacher(false)} />}
    </div>
  );
}

/* ═══ ORDER CARD ═══ */
function OrderCard({ o, onNext, onPay, busy }: any) {
  const s = STATUS[o.status] ?? STATUS.ENQUIRY;
  const next = NEXT[o.status];
  const late = o.isLate;
  const soon = o.isToday && !late;

  return (
    <div className={`rounded-2xl bg-white dark:bg-slate-900 border-2 shadow-sm p-3 sm:p-4 avoid-break ${
      late ? 'border-rose-300 dark:border-rose-500/40' : soon ? 'border-amber-300 dark:border-amber-500/40' : 'border-slate-200 dark:border-slate-800'
    }`}>
      <div className="flex items-start gap-3 flex-wrap">
        <span className={`h-11 w-11 rounded-2xl flex items-center justify-center shrink-0 ${
          late ? 'bg-rose-100 dark:bg-rose-500/20' : soon ? 'bg-amber-100 dark:bg-amber-500/20' : 'bg-pink-100 dark:bg-pink-500/20'
        }`}>
          <Cake className={`h-5 w-5 ${late ? 'text-rose-600' : soon ? 'text-amber-600' : 'text-pink-600 dark:text-pink-400'}`} />
        </span>

        <div className="min-w-0 flex-1">
          <div className="flex items-center gap-1.5 flex-wrap">
            <Link to={`/bakery/cake-orders/${o.id}`} className="font-extrabold text-sm text-slate-900 dark:text-white hover:text-pink-600 truncate">
              {o.customerName}
            </Link>
            <span className={`text-[9px] font-black uppercase px-1.5 py-0.5 rounded-md ${s.chip}`}>{s.label}</span>
            <span className="text-[10px] font-black text-slate-400">{o.orderNumber}</span>
          </div>

          <div className="text-[11px] font-bold text-slate-500 dark:text-slate-400 mt-0.5 truncate">
            {o.occasion ? `${o.occasion} · ` : ''}
            {o.size ? `${String(o.size).replace(/_/g, ' ').toLowerCase()} · ` : ''}
            {o.flavor ? String(o.flavor).replace(/_/g, ' ').toLowerCase() : ''}
          </div>

          <div className="mt-1 flex items-center gap-2 flex-wrap">
            <span className={`text-[11px] font-black inline-flex items-center gap-1 ${
              late ? 'text-rose-600' : soon ? 'text-amber-600' : 'text-slate-500'
            }`}>
              <Clock className="h-3 w-3" />
              {o.left !== null ? phrase(o.left) : 'Tareekh nahi'}
              {o.deliveryDate && ` · ${new Date(o.deliveryDate).toLocaleString('en-PK', { dateStyle: 'short', timeStyle: 'short' })}`}
            </span>
            <span className="text-[11px] font-bold text-slate-400 inline-flex items-center gap-1">
              {o.deliveryType === 'DELIVERY' ? <><Truck className="h-3 w-3" /> Ghar bhejna</> : <><Store className="h-3 w-3" /> Dukaan se lena</>}
            </span>
          </div>
        </div>

        <div className="text-right shrink-0">
          <div className="text-lg font-black text-slate-900 dark:text-white tabular-nums">{formatPKR(o.total)}</div>
          {o.due > 0 ? (
            <div className="text-[11px] font-black text-amber-600 tabular-nums">{formatPKR(o.due)} baqi</div>
          ) : (
            <div className="text-[11px] font-black text-emerald-600">Poora mil gaya</div>
          )}
        </div>
      </div>

      {o.advanceShort > 0 && !o.isDone && (
        <div className="mt-2.5 rounded-xl bg-amber-50 dark:bg-amber-500/10 border-2 border-amber-200 dark:border-amber-500/30 p-2.5 flex gap-2">
          <AlertTriangle className="h-4 w-4 text-amber-600 shrink-0 mt-0.5" />
          <p className="text-[11px] font-bold text-amber-900 dark:text-amber-200">
            Advance me <strong>{formatPKR(o.advanceShort)}</strong> kam hai. Bina poora advance
            liye bara cake banane se bakery ka paisa phans jata hai.
          </p>
        </div>
      )}

      <div className="mt-2.5 flex gap-1.5 flex-wrap print:hidden">
        {next && !o.isDone && (
          <button onClick={onNext} disabled={busy}
            className="h-9 px-3 rounded-xl bg-pink-600 hover:bg-pink-700 text-white text-[11px] font-black inline-flex items-center gap-1.5 disabled:opacity-60 transition">
            {busy ? <Loader2 className="h-3.5 w-3.5 animate-spin" /> : <ChefHat className="h-3.5 w-3.5" />}
            {next.label}
          </button>
        )}
        {o.due > 0 && (
          <button onClick={onPay}
            className="h-9 px-3 rounded-xl bg-emerald-600 hover:bg-emerald-700 text-white text-[11px] font-black inline-flex items-center gap-1.5 transition">
            <Wallet className="h-3.5 w-3.5" /> Paisa mila
          </button>
        )}
        {o.customerPhone && (
          <a href={`https://wa.me/${String(o.customerPhone).replace(/\D/g, '')}?text=${encodeURIComponent(
            `Assalam o alaikum ${o.customerName}, aap ka cake (${o.orderNumber}) ${STATUS[o.status]?.label ?? ''} hai.`)}`}
            target="_blank" rel="noreferrer"
            className="h-9 px-3 rounded-xl bg-emerald-50 dark:bg-emerald-500/15 text-emerald-700 dark:text-emerald-300 text-[11px] font-black inline-flex items-center gap-1.5 transition">
            <MessageCircle className="h-3.5 w-3.5" /> WhatsApp
          </a>
        )}
        {o.customerPhone && (
          <a href={`tel:${o.customerPhone}`}
            className="h-9 px-3 rounded-xl border-2 border-slate-200 dark:border-slate-700 text-slate-600 dark:text-slate-300 text-[11px] font-black inline-flex items-center gap-1.5 transition">
            <Phone className="h-3.5 w-3.5" /> Call
          </a>
        )}
        <Link to={`/bakery/cake-orders/${o.id}`}
          className="h-9 px-3 rounded-xl border-2 border-slate-200 dark:border-slate-700 text-slate-600 dark:text-slate-300 text-[11px] font-black inline-flex items-center gap-1.5 ml-auto transition">
          Poori tafseel <ArrowRight className="h-3.5 w-3.5" />
        </Link>
      </div>
    </div>
  );
}

/* ═══ PAYMENT ═══ */
function PayModal({ order, onClose, onDone }: any) {
  const due = Math.max(Number(order.total || 0) - Number(order.paidAmount || 0), 0);
  const [amount, setAmount] = useState<number | ''>(due);

  const mut = useMutation({
    mutationFn: () => cakeOrdersApi.addPayment(order.id, Number(amount) || 0),
    onSuccess: () => { toast.success('Paisa darj ho gaya'); onDone(); },
    onError: (e: any) => toast.error(e?.response?.data?.message || 'Darj nahi hua'),
  });

  const bad = amount === '' || Number(amount) <= 0 || Number(amount) > due;

  return (
    <div className="fixed inset-0 z-50 bg-black/60 backdrop-blur-sm flex items-end sm:items-center justify-center p-3" onClick={onClose}>
      <div className="w-full max-w-sm rounded-3xl bg-white dark:bg-slate-900 border-2 border-emerald-300 dark:border-emerald-500/40 shadow-2xl p-5" onClick={(e) => e.stopPropagation()}>
        <div className="flex items-center gap-2.5">
          <span className="h-10 w-10 rounded-2xl bg-emerald-100 dark:bg-emerald-500/20 flex items-center justify-center">
            <Wallet className="h-5 w-5 text-emerald-600" />
          </span>
          <div className="min-w-0">
            <h3 className="font-black text-slate-900 dark:text-white">Paisa mila</h3>
            <p className="text-[11px] font-bold text-slate-500 truncate">{order.customerName} · {formatPKR(due)} baqi</p>
          </div>
        </div>

        <input type="number" min={0} max={due} step="any" autoFocus value={amount}
          onChange={(e) => setAmount(e.target.value === '' ? '' : Number(e.target.value))}
          className="mt-4 h-14 w-full rounded-2xl border-2 border-slate-200 dark:border-slate-700 bg-white dark:bg-slate-800 px-3 text-2xl font-black text-center tabular-nums text-slate-900 dark:text-white focus:outline-none focus:border-emerald-500" />

        <div className="mt-2 grid grid-cols-3 gap-1.5">
          {[due, due / 2, Number(order.advanceRequired) - Number(order.advancePaid)].map((v, i) => {
            const val = Math.round(Number(v) * 100) / 100;
            if (!(val > 0) || val > due) return null;
            return (
              <button key={i} onClick={() => setAmount(val)}
                className="h-10 rounded-xl bg-slate-100 dark:bg-slate-800 hover:bg-slate-200 text-[11px] font-black text-slate-700 dark:text-slate-200 tabular-nums transition">
                {i === 0 ? 'Poora' : i === 2 ? 'Advance' : formatPKR(val)}
              </button>
            );
          })}
        </div>

        <div className="mt-4 flex gap-2">
          <Button variant="secondary" className="flex-1" onClick={onClose}>Rehne dein</Button>
          <Button className="flex-[2] bg-emerald-600 hover:bg-emerald-700" disabled={bad} loading={mut.isPending} onClick={() => mut.mutate()}>
            <CheckCircle2 className="h-4 w-4" /> Darj karein
          </Button>
        </div>
      </div>
    </div>
  );
}

/* ═══ CHHOTE HISSE ═══ */
function Kpi({ icon: Icon, label, value, sub, tone, onClick }: any) {
  const tones: Record<string, string> = {
    fuchsia: 'from-fuchsia-500 to-pink-600 shadow-fuchsia-500/40',
    amber: 'from-amber-500 to-orange-600 shadow-amber-500/40',
    rose: 'from-rose-500 to-red-600 shadow-rose-500/40',
    emerald: 'from-emerald-500 to-green-600 shadow-emerald-500/40',
  };
  const Comp: any = onClick ? 'button' : 'div';
  return (
    <Comp onClick={onClick}
      className={`rounded-2xl bg-white dark:bg-slate-900 border-2 border-slate-200 dark:border-slate-800 p-4 shadow-sm text-left w-full transition-all ${
        onClick ? 'hover:-translate-y-0.5 hover:shadow-md cursor-pointer' : ''
      }`}>
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

function EmptyBox({ text }: { text?: string }) {
  return <div className="h-full flex items-center justify-center"><p className="text-sm font-bold text-slate-400 text-center px-4">{text ?? 'Abhi dikhane ko kuch nahi'}</p></div>;
}

function Teacher({ onClose }: { onClose: () => void }) {
  return (
    <div className="fixed inset-0 z-50 bg-black/60 backdrop-blur-sm flex items-end sm:items-center justify-center p-3" onClick={onClose}>
      <div className="w-full max-w-lg max-h-[90vh] overflow-y-auto rounded-3xl bg-white dark:bg-slate-900 border-2 border-pink-300 dark:border-pink-500/40 shadow-2xl" onClick={(e) => e.stopPropagation()}>
        <div className="px-5 py-3 border-b-2 border-pink-200 dark:border-pink-500/30 bg-gradient-to-r from-pink-50 to-fuchsia-50 dark:from-pink-500/15 dark:to-fuchsia-500/15 flex items-center justify-between sticky top-0 z-10">
          <h3 className="font-extrabold text-pink-900 dark:text-pink-200 flex items-center gap-2">
            <GraduationCap className="h-5 w-5" /> Cake orders ka safha
          </h3>
          <button onClick={onClose} className="h-8 w-8 rounded-lg hover:bg-white dark:hover:bg-slate-800 flex items-center justify-center">
            <X className="h-4 w-4 text-slate-600 dark:text-slate-300" />
          </button>
        </div>
        <div className="p-5 space-y-3 text-sm">
          <p className="font-bold text-slate-700 dark:text-slate-200">
            Ye bakery ka sab se nazuk kaam hai. Shadi ya birthday ka cake late ho jaye to
            customer hamesha ke liye chala jata hai.
          </p>
          <Tip icon={Clock} title="Jo pehle dena hai wo upar">
            List apne aap waqt ke hisaab se lagti hai. <strong>Late</strong> orders laal, aur
            aaj wale amber — poochne ki zaroorat nahi.
          </Tip>
          <Tip icon={ChefHat} title="Agla qadam">
            Har order par ek hi button — jo abhi karna hai. Pakka hua → banana shuru → sajawat →
            tayyar → de diya. Lambi list me se status dhoondne ki zaroorat nahi.
          </Tip>
          <Tip icon={Wallet} title="Advance">
            Bina poora advance liye bara cake banane se bakery ka paisa phans jata hai. Advance
            kam ho to order par khud warning aa jati hai.
          </Tip>
          <Tip icon={MessageCircle} title="Customer ko batana">
            WhatsApp ka button khud paighaam likh deta hai — cake ka number aur uski abhi ki
            halat ke sath.
          </Tip>
          <Tip icon={BarChart3} title="Analytics">
            Kis mauqe ke cake sab se zyada bikte hain, mahine me kitne order aaye, aur
            customer ki raye kitni hai.
          </Tip>
          <div className="rounded-2xl bg-slate-50 dark:bg-slate-800 p-3">
            <div className="text-[10px] font-black uppercase tracking-widest text-slate-500 mb-2">Shortcuts</div>
            <div className="grid grid-cols-2 gap-1.5 text-[11px] font-bold text-slate-600 dark:text-slate-300">
              <div><kbd className="px-1.5 py-0.5 rounded bg-white dark:bg-slate-900 border">/</kbd> dhoondo</div>
              <div><kbd className="px-1.5 py-0.5 rounded bg-white dark:bg-slate-900 border">A</kbd> analytics</div>
              <div><kbd className="px-1.5 py-0.5 rounded bg-white dark:bg-slate-900 border">P</kbd> print</div>
              <div><kbd className="px-1.5 py-0.5 rounded bg-white dark:bg-slate-900 border">G</kbd> ye madad</div>
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
