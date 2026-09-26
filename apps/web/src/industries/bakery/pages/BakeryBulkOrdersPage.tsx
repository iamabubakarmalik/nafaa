import { useMemo, useState, useEffect, useRef } from 'react';
import { Link } from 'react-router-dom';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import {
  ShoppingBag, Plus, X, Search, RefreshCw, Calendar, Clock, Phone,
  MapPin, Users, CheckCircle2, AlertTriangle, BarChart3, GraduationCap,
  FileSpreadsheet, Printer, Truck, Wallet, Loader2, Building2,
  MessageCircle, ArrowRight, TrendingUp, Layers, Wrench,
} from 'lucide-react';
import {
  ResponsiveContainer, BarChart, Bar, XAxis, YAxis, Tooltip, CartesianGrid,
  PieChart, Pie, Cell, Legend,
} from 'recharts';
import { toast } from 'sonner';
import { bulkOrdersApi, type BulkOrder } from '../api/bulk-orders.api';
import { formatPKR } from '@core/lib/format';
import { Button } from '@core/ui/Button';
import { useAuthStore } from '@core/stores/auth.store';

/* ═════════════════════════════════════════════════════════════
   BULK ORDERS — SHADI, DAFTAR, EVENT
   ─────────────────────────────────────────────────────────────
   Ye orders bakery ke sab se bare hote hain, aur sab se khatarnak
   bhi: ek shadi ka order poore mahine ki bikri ke barabar ho sakta
   hai. Agar waqt par tayyar na ho, ya advance na liya ho, to
   nuqsaan bhi utna hi bara hota hai.

   Is liye yahan bhi wohi do sawal samne hain: kab dena hai, aur
   advance aaya ya nahi.
   ═════════════════════════════════════════════════════════════ */

type Tab = 'list' | 'analytics';
type Filter = 'active' | 'week' | 'late' | 'all';

const STATUS: Record<string, { label: string; chip: string; dot: string }> = {
  ENQUIRY:     { label: 'Poocha hai', chip: 'bg-slate-100 dark:bg-slate-700 text-slate-600 dark:text-slate-300', dot: 'bg-slate-400' },
  QUOTED:      { label: 'Rate bataya', chip: 'bg-sky-100 dark:bg-sky-500/20 text-sky-700 dark:text-sky-300', dot: 'bg-sky-500' },
  CONFIRMED:   { label: 'Pakka hua', chip: 'bg-blue-100 dark:bg-blue-500/20 text-blue-700 dark:text-blue-300', dot: 'bg-blue-500' },
  IN_PROGRESS: { label: 'Ban raha hai', chip: 'bg-orange-100 dark:bg-orange-500/20 text-orange-700 dark:text-orange-300', dot: 'bg-orange-500' },
  READY:       { label: 'Tayyar hai', chip: 'bg-emerald-100 dark:bg-emerald-500/20 text-emerald-700 dark:text-emerald-300', dot: 'bg-emerald-500' },
  DELIVERED:   { label: 'De diya', chip: 'bg-emerald-100 dark:bg-emerald-500/20 text-emerald-700 dark:text-emerald-300', dot: 'bg-emerald-600' },
  CANCELLED:   { label: 'Cancel', chip: 'bg-rose-100 dark:bg-rose-500/20 text-rose-700 dark:text-rose-300', dot: 'bg-rose-500' },
};

const NEXT: Record<string, { to: string; label: string }> = {
  ENQUIRY:     { to: 'QUOTED', label: 'Rate bata diya' },
  QUOTED:      { to: 'CONFIRMED', label: 'Pakka karein' },
  CONFIRMED:   { to: 'IN_PROGRESS', label: 'Banana shuru' },
  IN_PROGRESS: { to: 'READY', label: 'Tayyar hai' },
  READY:       { to: 'DELIVERED', label: 'De diya' },
};

const DONE = ['DELIVERED', 'CANCELLED'];
const GRID = '#94a3b8';
const AXIS = '#64748b';
const PIE_COLORS = ['#f59e0b', '#8b5cf6', '#ec4899', '#10b981', '#3b82f6', '#ef4444'];
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
  if (h < 24) return `${Math.round(h)} ghante me`;
  return `${Math.round(h / 24)} din baad`;
}

export default function BakeryBulkOrdersPage() {
  const qc = useQueryClient();
  const tenant = useAuthStore((s) => s.tenant);
  const searchRef = useRef<HTMLInputElement>(null);

  const [tab, setTab] = useState<Tab>('list');
  const [filter, setFilter] = useState<Filter>('active');
  const [search, setSearch] = useState('');
  const [showTeacher, setShowTeacher] = useState(false);
  const [payOn, setPayOn] = useState<BulkOrder | null>(null);

  const listQ = useQuery({
    queryKey: ['bulk-orders'],
    queryFn: () => bulkOrdersApi.list({}),
    refetchInterval: 120_000,
  });

  const statusMut = useMutation({
    mutationFn: ({ id, status }: { id: string; status: string }) => bulkOrdersApi.updateStatus(id, status),
    onSuccess: () => { toast.success('Halat badal di'); qc.invalidateQueries({ queryKey: ['bulk-orders'] }); },
    onError: (e: any) => toast.error(e?.response?.data?.message || 'Nahi badla'),
  });

  const rows = useMemo(() => {
    const list = listQ.data ?? [];
    return list.map((o) => {
      const left = hoursTo(o.eventDate);
      const price = Number(o.finalPrice ?? o.quotedPrice ?? 0);
      const due = Math.max(price - Number(o.paidAmount || 0), 0);
      const items = Array.isArray(o.items) ? o.items.length : Number(o.totalItems || 0);
      return {
        ...o,
        left, price, due, itemCount: items,
        isDone: DONE.includes(o.status),
        isLate: left !== null && left < 0 && !DONE.includes(o.status),
        isSoon: left !== null && left >= 0 && left <= 168,
        noAdvance: Number(o.advancePaid || 0) <= 0 && !DONE.includes(o.status) && o.status !== 'ENQUIRY',
      };
    });
  }, [listQ.data]);

  const q = search.trim().toLowerCase();
  const shown = useMemo(() => {
    let out = rows;
    if (filter === 'active') out = out.filter((r) => !r.isDone);
    if (filter === 'week') out = out.filter((r) => r.isSoon && !r.isDone);
    if (filter === 'late') out = out.filter((r) => r.isLate);
    if (q) out = out.filter((r) =>
      (r.organizationName || '').toLowerCase().includes(q) ||
      (r.orderNumber || '').toLowerCase().includes(q) ||
      (r.contactPerson || '').toLowerCase().includes(q) ||
      (r.contactPhone || '').toLowerCase().includes(q));
    return [...out].sort((a, b) => (a.left ?? 99999) - (b.left ?? 99999));
  }, [rows, filter, q]);

  const stats = useMemo(() => {
    const active = rows.filter((r) => !r.isDone);
    return {
      active: active.length,
      week: active.filter((r) => r.isSoon).length,
      late: rows.filter((r) => r.isLate).length,
      value: active.reduce((s, r) => s + r.price, 0),
      due: active.reduce((s, r) => s + r.due, 0),
      noAdvance: rows.filter((r) => r.noAdvance).length,
      delivered: rows.filter((r) => r.status === 'DELIVERED').length,
      avgTicket: (() => {
        const done = rows.filter((r) => r.status === 'DELIVERED');
        return done.length > 0 ? done.reduce((s, r) => s + r.price, 0) / done.length : 0;
      })(),
    };
  }, [rows]);

  const statusPie = useMemo(() => {
    const m = new Map<string, number>();
    rows.filter((r) => !r.isDone).forEach((r) => m.set(r.status, (m.get(r.status) ?? 0) + 1));
    return [...m.entries()].map(([k, v]) => ({ name: STATUS[k]?.label ?? k, value: v }));
  }, [rows]);

  const typeChart = useMemo(() => {
    const m = new Map<string, number>();
    rows.forEach((r) => { if (r.orderType) m.set(r.orderType, (m.get(r.orderType) ?? 0) + 1); });
    return [...m.entries()].sort((a, b) => b[1] - a[1]).slice(0, 8)
      .map(([name, value]) => ({ name: String(name).replace(/_/g, ' ').slice(0, 14), value }));
  }, [rows]);

  const monthChart = useMemo(() => {
    const m = new Map<string, { orders: number; value: number }>();
    rows.forEach((r) => {
      const d = new Date(r.eventDate || r.createdAt);
      if (Number.isNaN(d.getTime())) return;
      const key = d.toLocaleDateString('en-PK', { month: 'short', year: '2-digit' });
      const e = m.get(key) ?? { orders: 0, value: 0 };
      e.orders += 1; e.value += r.price;
      m.set(key, e);
    });
    return [...m.entries()].slice(-8).map(([name, v]) => ({ name, orders: v.orders, value: Math.round(v.value) }));
  }, [rows]);

  const exportCsv = () => {
    const head = ['Order', 'Idara', 'Rabta', 'Phone', 'Qism', 'Event', 'Mehmaan', 'Halat', 'Rate', 'Mila', 'Baqi'];
    const body = shown.map((r) => [
      r.orderNumber, r.organizationName, r.contactPerson ?? '', r.contactPhone,
      r.orderType, r.eventDate ? new Date(r.eventDate).toLocaleString('en-PK') : '',
      r.totalGuests ?? '', STATUS[r.status]?.label ?? r.status,
      Math.round(r.price), Math.round(Number(r.paidAmount || 0)), Math.round(r.due),
    ]);
    const esc = (v: any) => `"${String(v ?? '').replace(/"/g, '""')}"`;
    const csv = [head, ...body].map((r) => r.map(esc).join(',')).join('\n');
    const url = URL.createObjectURL(new Blob(['﻿' + csv], { type: 'text/csv;charset=utf-8;' }));
    const a = document.createElement('a'); a.href = url;
    a.download = `bulk-orders-${new Date().toISOString().slice(0, 10)}.csv`;
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
        <h1 className="text-xl font-extrabold">{tenant?.name || 'Bakery'} — Bulk orders</h1>
        <p className="text-xs text-slate-600">{new Date().toLocaleString('en-PK', { dateStyle: 'full', timeStyle: 'short' })}</p>
      </div>

      {/* ═══ HERO ═══ */}
      <section className="relative overflow-hidden rounded-3xl bg-gradient-to-br from-slate-950 via-amber-900 to-yellow-700 text-white p-5 sm:p-6 shadow-2xl print:hidden">
        <div className="absolute -top-24 -right-20 h-72 w-72 rounded-full bg-amber-400/25 blur-3xl" />
        <div className="absolute inset-0 opacity-[0.06]"
          style={{ backgroundImage: 'radial-gradient(circle at 1px 1px, #fff 1px, transparent 0)', backgroundSize: '22px 22px' }} />
        <div className="relative flex items-start justify-between gap-4 flex-wrap">
          <div className="min-w-0">
            <div className="inline-flex items-center gap-2 rounded-full bg-white/15 backdrop-blur px-3 py-1 text-[11px] font-black border border-white/25 uppercase tracking-widest">
              <ShoppingBag className="h-3.5 w-3.5 text-amber-300" /> Bakery · Bara order
            </div>
            <h1 className="mt-3 text-2xl sm:text-3xl lg:text-4xl font-black leading-tight">🎪 Shadi &amp; Event Orders</h1>
            <p className="mt-1.5 text-xs sm:text-sm font-bold text-white/90">
              <strong className="text-amber-200">{stats.week}</strong> is hafte ·{' '}
              <strong className="text-rose-200">{stats.late}</strong> late ·{' '}
              <strong className="text-white">{formatPKR(stats.value)}</strong> ka kaam
            </p>
          </div>
          <div className="flex gap-2 flex-wrap items-center shrink-0">
            <Link to="/bakery/bulk-orders/new"
              className="h-11 px-3.5 rounded-xl bg-white text-amber-700 hover:bg-amber-50 text-xs font-black inline-flex items-center gap-1.5 shadow-lg transition">
              <Plus className="h-4 w-4" /> Naya order
            </Link>
            <button onClick={() => setShowTeacher(true)}
              className="h-11 w-11 rounded-xl bg-white/20 hover:bg-white/30 border border-white/25 flex items-center justify-center backdrop-blur transition">
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
        <Kpi icon={Clock} label="Is hafte" value={stats.week}
          sub={stats.late > 0 ? `${stats.late} pehle hi late` : 'Koi late nahi'} tone="amber"
          onClick={() => { setFilter('week'); setTab('list'); }} />
        <Kpi icon={Layers} label="Chal rahe orders" value={stats.active}
          sub={formatPKR(stats.value)} tone="violet"
          onClick={() => { setFilter('active'); setTab('list'); }} />
        <Kpi icon={Wallet} label="Lena baqi hai" value={formatPKR(stats.due)}
          sub={stats.noAdvance > 0 ? `${stats.noAdvance} bina advance ke` : 'Advance aa chuka'}
          tone={stats.noAdvance > 0 ? 'rose' : 'emerald'} />
        <Kpi icon={TrendingUp} label="Ausat order" value={formatPKR(stats.avgTicket)}
          sub={`${stats.delivered} poore ho chuke`} tone="emerald" />
      </section>

      {/* ═══ ADVANCE WARNING ═══ */}
      {stats.noAdvance > 0 && (
        <section className="rounded-3xl bg-rose-50 dark:bg-rose-500/10 border-2 border-rose-200 dark:border-rose-500/30 p-4 flex items-center gap-3 flex-wrap print:hidden">
          <AlertTriangle className="h-5 w-5 text-rose-600 shrink-0" />
          <p className="text-sm font-extrabold text-rose-900 dark:text-rose-200 min-w-0 flex-1">
            <strong>{stats.noAdvance}</strong> pakke order par advance nahi aaya. Shadi ka order
            poore mahine ki bikri ke barabar hota hai — bina advance ke saamaan khareedna bakery
            ka paisa phansa deta hai.
          </p>
        </section>
      )}

      {/* ═══ TABS ═══ */}
      <div className="grid grid-cols-2 gap-2 sm:gap-3 print:hidden">
        {([['list', 'Orders', ShoppingBag], ['analytics', 'Analytics', BarChart3]] as const).map(([v, label, Icon]) => (
          <button key={v} onClick={() => setTab(v as Tab)}
            className={`h-14 rounded-2xl border-2 font-black text-sm inline-flex items-center justify-center gap-2 transition ${
              tab === v
                ? 'bg-gradient-to-r from-amber-500 to-yellow-600 text-white border-transparent shadow-lg'
                : 'bg-white dark:bg-slate-900 text-slate-600 dark:text-slate-300 border-slate-200 dark:border-slate-800 hover:border-amber-400'
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
                  placeholder="Idara, order number, phone… (/ dabao)"
                  className="h-12 w-full rounded-2xl border-2 border-slate-200 dark:border-slate-700 bg-white dark:bg-slate-800 pl-11 pr-10 text-sm font-bold text-slate-900 dark:text-white focus:outline-none focus:border-amber-500 transition" />
                {search && (
                  <button onClick={() => setSearch('')} className="absolute right-3 top-1/2 -translate-y-1/2 h-7 w-7 rounded-lg hover:bg-slate-100 dark:hover:bg-slate-700 flex items-center justify-center">
                    <X className="h-4 w-4 text-slate-400" />
                  </button>
                )}
              </div>
              <div className="flex gap-1.5 flex-wrap">
                {([['active', 'Chal rahe'], ['week', '⏰ Is hafte'], ['late', '🔴 Late'], ['all', 'Sab']] as const).map(([v, l]) => (
                  <button key={v} onClick={() => setFilter(v as Filter)}
                    className={`h-12 px-3.5 rounded-2xl border-2 text-xs font-black transition ${
                      filter === v
                        ? 'border-amber-500 bg-amber-50 dark:bg-amber-500/15 text-amber-700 dark:text-amber-300'
                        : 'border-slate-200 dark:border-slate-700 bg-white dark:bg-slate-800 text-slate-600 dark:text-slate-300 hover:border-amber-400'
                    }`}>{l}</button>
                ))}
              </div>
            </div>
          </section>

          {listQ.isLoading ? (
            <div className="flex items-center justify-center py-24">
              <div className="h-12 w-12 rounded-full border-4 border-amber-200 border-t-amber-600 animate-spin" />
            </div>
          ) : shown.length === 0 ? (
            <div className="rounded-3xl bg-white dark:bg-slate-900 border-4 border-dashed border-slate-200 dark:border-slate-700 p-10 sm:p-14 text-center">
              <div className="h-16 w-16 rounded-3xl bg-amber-100 dark:bg-amber-500/20 mx-auto flex items-center justify-center">
                <ShoppingBag className="h-8 w-8 text-amber-600 dark:text-amber-400" />
              </div>
              <p className="mt-4 font-black text-slate-800 dark:text-slate-100 text-lg sm:text-xl">
                {search ? 'Kuch nahi mila' : filter === 'late' ? 'Koi order late nahi — shabash' : 'Koi bara order nahi'}
              </p>
              <p className="text-xs sm:text-sm text-slate-500 dark:text-slate-400 font-bold mt-1.5 max-w-md mx-auto">
                Shadi, daftar ki party ya school ka function — bare order yahan aate hain.
              </p>
              <Link to="/bakery/bulk-orders/new"
                className="mt-4 h-11 px-4 rounded-xl bg-amber-600 hover:bg-amber-700 text-white text-sm font-black inline-flex items-center gap-2 transition">
                <Plus className="h-4 w-4" /> Naya bara order
              </Link>
            </div>
          ) : (
            <section className="space-y-2.5">
              {shown.map((o) => (
                <OrderCard key={o.id} o={o}
                  onNext={() => { const n = NEXT[o.status]; if (n) statusMut.mutate({ id: o.id, status: n.to }); }}
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

          <ChartCard icon={Building2} title="Kis qism ke order zyada">
            {typeChart.length > 0 ? (
              <ResponsiveContainer width="100%" height="100%">
                <BarChart data={typeChart}>
                  <CartesianGrid strokeDasharray="3 3" stroke={GRID} vertical={false} />
                  <XAxis dataKey="name" stroke={AXIS} fontSize={10} fontWeight={700} interval={0} angle={-20} textAnchor="end" height={60} />
                  <YAxis stroke={AXIS} fontSize={11} width={45} allowDecimals={false} />
                  <Tooltip contentStyle={TOOLTIP} formatter={(v: any) => [v, 'Order']} />
                  <Bar dataKey="value" fill="#f59e0b" radius={[8, 8, 0, 0]} maxBarSize={48} />
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
        onDone={() => { setPayOn(null); qc.invalidateQueries({ queryKey: ['bulk-orders'] }); }} />}
      {showTeacher && <Teacher onClose={() => setShowTeacher(false)} />}
    </div>
  );
}

/* ═══ CARD ═══ */
function OrderCard({ o, onNext, onPay, busy }: any) {
  const s = STATUS[o.status] ?? STATUS.ENQUIRY;
  const next = NEXT[o.status];

  return (
    <div className={`rounded-2xl bg-white dark:bg-slate-900 border-2 shadow-sm p-3 sm:p-4 avoid-break ${
      o.isLate ? 'border-rose-300 dark:border-rose-500/40' : o.isSoon ? 'border-amber-300 dark:border-amber-500/40' : 'border-slate-200 dark:border-slate-800'
    }`}>
      <div className="flex items-start gap-3 flex-wrap">
        <span className={`h-11 w-11 rounded-2xl flex items-center justify-center shrink-0 ${
          o.isLate ? 'bg-rose-100 dark:bg-rose-500/20' : o.isSoon ? 'bg-amber-100 dark:bg-amber-500/20' : 'bg-slate-100 dark:bg-slate-800'
        }`}>
          <Building2 className={`h-5 w-5 ${o.isLate ? 'text-rose-600' : o.isSoon ? 'text-amber-600' : 'text-slate-500'}`} />
        </span>

        <div className="min-w-0 flex-1">
          <div className="flex items-center gap-1.5 flex-wrap">
            <span className="font-extrabold text-sm text-slate-900 dark:text-white truncate">{o.organizationName}</span>
            <span className={`text-[9px] font-black uppercase px-1.5 py-0.5 rounded-md ${s.chip}`}>{s.label}</span>
            <span className="text-[10px] font-black text-slate-400">{o.orderNumber}</span>
          </div>
          <div className="text-[11px] font-bold text-slate-500 dark:text-slate-400 mt-0.5 truncate">
            {o.contactPerson ? `${o.contactPerson} · ` : ''}
            {String(o.orderType || '').replace(/_/g, ' ')}
            {o.totalGuests ? ` · ${o.totalGuests} mehmaan` : ''}
            {o.itemCount ? ` · ${o.itemCount} cheezein` : ''}
          </div>
          <div className="mt-1 flex items-center gap-2 flex-wrap">
            <span className={`text-[11px] font-black inline-flex items-center gap-1 ${
              o.isLate ? 'text-rose-600' : o.isSoon ? 'text-amber-600' : 'text-slate-500'
            }`}>
              <Calendar className="h-3 w-3" />
              {o.left !== null ? phrase(o.left) : 'Tareekh nahi'}
              {o.eventDate && ` · ${new Date(o.eventDate).toLocaleDateString('en-PK', { dateStyle: 'medium' })}`}
            </span>
            {o.requiresDelivery && (
              <span className="text-[11px] font-bold text-slate-400 inline-flex items-center gap-1"><Truck className="h-3 w-3" /> Pahunchana hai</span>
            )}
            {o.requiresSetup && (
              <span className="text-[11px] font-bold text-slate-400 inline-flex items-center gap-1"><Wrench className="h-3 w-3" /> Setup</span>
            )}
          </div>
          {o.venue && (
            <div className="text-[11px] font-bold text-slate-400 mt-0.5 inline-flex items-center gap-1 truncate">
              <MapPin className="h-3 w-3 shrink-0" /> {o.venue}
            </div>
          )}
        </div>

        <div className="text-right shrink-0">
          <div className="text-lg font-black text-slate-900 dark:text-white tabular-nums">{formatPKR(o.price)}</div>
          {o.due > 0 ? (
            <div className="text-[11px] font-black text-amber-600 tabular-nums">{formatPKR(o.due)} baqi</div>
          ) : (
            <div className="text-[11px] font-black text-emerald-600">Poora mil gaya</div>
          )}
        </div>
      </div>

      {o.noAdvance && (
        <div className="mt-2.5 rounded-xl bg-rose-50 dark:bg-rose-500/10 border-2 border-rose-200 dark:border-rose-500/30 p-2.5 flex gap-2">
          <AlertTriangle className="h-4 w-4 text-rose-600 shrink-0 mt-0.5" />
          <p className="text-[11px] font-bold text-rose-900 dark:text-rose-200">
            Is pakke order par <strong>advance nahi aaya</strong>. Itna bara saamaan apni jeb se
            khareedna bakery ka paisa phansa deta hai.
          </p>
        </div>
      )}

      <div className="mt-2.5 flex gap-1.5 flex-wrap print:hidden">
        {next && !o.isDone && (
          <button onClick={onNext} disabled={busy}
            className="h-9 px-3 rounded-xl bg-amber-600 hover:bg-amber-700 text-white text-[11px] font-black inline-flex items-center gap-1.5 disabled:opacity-60 transition">
            {busy ? <Loader2 className="h-3.5 w-3.5 animate-spin" /> : <CheckCircle2 className="h-3.5 w-3.5" />}
            {next.label}
          </button>
        )}
        {o.due > 0 && (
          <button onClick={onPay}
            className="h-9 px-3 rounded-xl bg-emerald-600 hover:bg-emerald-700 text-white text-[11px] font-black inline-flex items-center gap-1.5 transition">
            <Wallet className="h-3.5 w-3.5" /> Paisa mila
          </button>
        )}
        {o.contactPhone && (
          <>
            <a href={`https://wa.me/${String(o.contactPhone).replace(/\D/g, '')}?text=${encodeURIComponent(
              `Assalam o alaikum, aap ka order (${o.orderNumber}) ${STATUS[o.status]?.label ?? ''} hai.`)}`}
              target="_blank" rel="noreferrer"
              className="h-9 px-3 rounded-xl bg-emerald-50 dark:bg-emerald-500/15 text-emerald-700 dark:text-emerald-300 text-[11px] font-black inline-flex items-center gap-1.5 transition">
              <MessageCircle className="h-3.5 w-3.5" /> WhatsApp
            </a>
            <a href={`tel:${o.contactPhone}`}
              className="h-9 px-3 rounded-xl border-2 border-slate-200 dark:border-slate-700 text-slate-600 dark:text-slate-300 text-[11px] font-black inline-flex items-center gap-1.5 transition">
              <Phone className="h-3.5 w-3.5" /> Call
            </a>
          </>
        )}
      </div>
    </div>
  );
}

/* ═══ PAYMENT ═══ */
function PayModal({ order, onClose, onDone }: any) {
  const price = Number(order.finalPrice ?? order.quotedPrice ?? 0);
  const due = Math.max(price - Number(order.paidAmount || 0), 0);
  const [amount, setAmount] = useState<number | ''>(due);

  const mut = useMutation({
    mutationFn: () => bulkOrdersApi.payment(order.id, Number(amount) || 0),
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
            <p className="text-[11px] font-bold text-slate-500 truncate">{order.organizationName} · {formatPKR(due)} baqi</p>
          </div>
        </div>

        <input type="number" min={0} max={due} step="any" autoFocus value={amount}
          onChange={(e) => setAmount(e.target.value === '' ? '' : Number(e.target.value))}
          className="mt-4 h-14 w-full rounded-2xl border-2 border-slate-200 dark:border-slate-700 bg-white dark:bg-slate-800 px-3 text-2xl font-black text-center tabular-nums text-slate-900 dark:text-white focus:outline-none focus:border-emerald-500" />

        <div className="mt-2 grid grid-cols-3 gap-1.5">
          {[due, due / 2, price * 0.5].map((v, i) => {
            const val = Math.round(Number(v) * 100) / 100;
            if (!(val > 0) || val > due) return null;
            return (
              <button key={i} onClick={() => setAmount(val)}
                className="h-10 rounded-xl bg-slate-100 dark:bg-slate-800 hover:bg-slate-200 text-[11px] font-black text-slate-700 dark:text-slate-200 tabular-nums transition">
                {i === 0 ? 'Poora' : i === 2 ? '50% advance' : formatPKR(val)}
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
    amber: 'from-amber-500 to-orange-600 shadow-amber-500/40',
    violet: 'from-violet-500 to-purple-600 shadow-violet-500/40',
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
        <Icon className="h-4 w-4 text-amber-600" /> {title}
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
      <div className="w-full max-w-lg max-h-[90vh] overflow-y-auto rounded-3xl bg-white dark:bg-slate-900 border-2 border-amber-300 dark:border-amber-500/40 shadow-2xl" onClick={(e) => e.stopPropagation()}>
        <div className="px-5 py-3 border-b-2 border-amber-200 dark:border-amber-500/30 bg-gradient-to-r from-amber-50 to-yellow-50 dark:from-amber-500/15 dark:to-yellow-500/15 flex items-center justify-between sticky top-0 z-10">
          <h3 className="font-extrabold text-amber-900 dark:text-amber-200 flex items-center gap-2">
            <GraduationCap className="h-5 w-5" /> Bare orders
          </h3>
          <button onClick={onClose} className="h-8 w-8 rounded-lg hover:bg-white dark:hover:bg-slate-800 flex items-center justify-center">
            <X className="h-4 w-4 text-slate-600 dark:text-slate-300" />
          </button>
        </div>
        <div className="p-5 space-y-3 text-sm">
          <p className="font-bold text-slate-700 dark:text-slate-200">
            Shadi, daftar ki party, school ka function. Ye orders bakery ke sab se bare hote hain —
            aur sab se khatarnak bhi.
          </p>
          <Tip icon={Calendar} title="Jo pehle dena hai wo upar">
            List khud event ki tareekh se lagti hai. Late laal, is hafte wale amber.
          </Tip>
          <Tip icon={CheckCircle2} title="Agla qadam">
            Rate bataya → pakka hua → banana shuru → tayyar → de diya. Har order par ek hi button,
            jo abhi karna hai.
          </Tip>
          <Tip icon={Wallet} title="Advance sab se ahem">
            Ek shadi ka order poore mahine ki bikri ke barabar ho sakta hai. Bina advance ke itna
            saamaan apni jeb se khareedna paisa phansa deta hai — is liye advance na aaya ho to
            order par laal warning aa jati hai.
          </Tip>
          <Tip icon={Truck} title="Pahunchana aur setup">
            Jis order me delivery ya setup hai us par nishan aa jata hai — waqt ka hisab lagate
            waqt ye bhool jana aam hai.
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
      <div className="h-8 w-8 rounded-xl bg-amber-100 dark:bg-amber-500/20 flex items-center justify-center shrink-0">
        <Icon className="h-4 w-4 text-amber-600 dark:text-amber-400" />
      </div>
      <div className="min-w-0">
        <div className="font-extrabold text-slate-900 dark:text-white text-[13px]">{title}</div>
        <p className="text-[12px] font-semibold text-slate-600 dark:text-slate-300 leading-snug">{children}</p>
      </div>
    </div>
  );
}
