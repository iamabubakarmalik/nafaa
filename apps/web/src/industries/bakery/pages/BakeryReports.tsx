import { useMemo, useState, useEffect } from 'react';
import { Link } from 'react-router-dom';
import { useQuery } from '@tanstack/react-query';
import {
  BarChart3, Cake, ChefHat, Wheat, Timer, TrendingUp, TrendingDown,
  Award, Users, DollarSign, RefreshCw, GraduationCap, FileSpreadsheet,
  Printer, X, Flame, AlertTriangle, CheckCircle2, Layers, Croissant,
  ShoppingBag, Wallet, Star,
} from 'lucide-react';
import {
  ResponsiveContainer, AreaChart, Area, BarChart, Bar, PieChart, Pie, Cell,
  XAxis, YAxis, Tooltip, CartesianGrid, Legend, ComposedChart, Line,
} from 'recharts';
import { toast } from 'sonner';
import { useReportsData } from '@modules/reports/reports/hooks/useReportsData';
import { cakeOrdersApi } from '../api/cake-orders.api';
import { bulkOrdersApi } from '../api/bulk-orders.api';
import { productionApi } from '../api/production.api';
import { ingredientsApi } from '../api/ingredients.api';
import { freshnessApi } from '../api/freshness.api';
import { formatPKR } from '@core/lib/format';
import { Button } from '@core/ui/Button';
import { useAuthStore } from '@core/stores/auth.store';

/* ═════════════════════════════════════════════════════════════
   BAKERY REPORTS — CHAAR SAWAL KA JAWAB
   ─────────────────────────────────────────────────────────────
   Aam reports sirf bikri dikhate hain. Bakery ka asal hisab char
   cheezon se banta hai, aur teen unme se kisi aam report me nahi
   aatin:

     1. Bika kitna — ye har jagah milta hai
     2. Bana kitna, aur kitna kharab hua
     3. Phinka kitna — bakery ka sab se chupa hua nuqsaan
     4. Advance wale orders — paisa aaya ya sirf waada hai

   Chaaron yahan hain, aur har tab ke aakhir me ek seedha sa
   jumla hota hai: is se karna kya hai.
   ═════════════════════════════════════════════════════════════ */

type Tab = 'sales' | 'production' | 'waste' | 'orders';

const TABS: Array<[Tab, string, any]> = [
  ['sales', 'Bikri', TrendingUp],
  ['production', 'Baking', ChefHat],
  ['waste', 'Zaya', Flame],
  ['orders', 'Orders', Cake],
];

const DAYS = [7, 14, 30, 90];
const GRID = '#94a3b8';
const AXIS = '#64748b';
const PIE_COLORS = ['#ec4899', '#8b5cf6', '#f59e0b', '#10b981', '#3b82f6', '#ef4444', '#14b8a6', '#f97316'];
const TOOLTIP = {
  borderRadius: 12, border: '2px solid #cbd5e1', background: '#ffffff',
  color: '#0f172a', fontWeight: 700, fontSize: 12,
};

const fmtQty = (q: number) => Number(q || 0).toFixed(Number(q || 0) % 1 === 0 ? 0 : 2);
const dayLabel = (d: string) => new Date(d).toLocaleDateString('en-PK', { day: 'numeric', month: 'short' });

export default function BakeryReportsV2() {
  const tenant = useAuthStore((s) => s.tenant);
  const [tab, setTab] = useState<Tab>('sales');
  const [days, setDays] = useState(30);
  const [showTeacher, setShowTeacher] = useState(false);

  const r = useReportsData(days);

  const cakeQ = useQuery({ queryKey: ['cake-orders'], queryFn: () => cakeOrdersApi.list({}).catch(() => []) });
  const bulkQ = useQuery({ queryKey: ['bulk-orders'], queryFn: () => bulkOrdersApi.list({}).catch(() => []) });
  const prodQ = useQuery({ queryKey: ['bakery-production-all'], queryFn: () => productionApi.listPlans({}).catch(() => []) });
  const ingQ = useQuery({ queryKey: ['bakery-ingredients'], queryFn: () => ingredientsApi.list({}).catch(() => []) });
  const freshQ = useQuery({ queryKey: ['freshness-logs'], queryFn: () => freshnessApi.list({}).catch(() => []) });

  const refetchAll = () => { cakeQ.refetch(); bulkQ.refetch(); prodQ.refetch(); ingQ.refetch(); freshQ.refetch(); };

  const pl = r.profitLoss;

  /* ── Baking ── */
  const prod = useMemo(() => {
    const items = (prodQ.data ?? []).flatMap((p: any) => p.items ?? []);
    const planned = items.reduce((s: number, i: any) => s + Number(i.plannedQty || 0), 0);
    const made = items.reduce((s: number, i: any) => s + Number(i.producedQty || 0), 0);
    const failed = items.reduce((s: number, i: any) => s + Number(i.failedQty || 0), 0);
    const byProduct = new Map<string, { planned: number; made: number; failed: number }>();
    items.forEach((i: any) => {
      const k = i.productName || '—';
      const e = byProduct.get(k) ?? { planned: 0, made: 0, failed: 0 };
      e.planned += Number(i.plannedQty || 0);
      e.made += Number(i.producedQty || 0);
      e.failed += Number(i.failedQty || 0);
      byProduct.set(k, e);
    });
    return {
      planned, made, failed,
      failRate: made + failed > 0 ? (failed / (made + failed)) * 100 : 0,
      hitRate: planned > 0 ? (made / planned) * 100 : 0,
      chart: [...byProduct.entries()].sort((a, b) => b[1].planned - a[1].planned).slice(0, 10)
        .map(([name, v]) => ({ name: name.slice(0, 14), socha: v.planned, bana: v.made, kharab: v.failed })),
      worst: [...byProduct.entries()].filter(([, v]) => v.failed > 0)
        .sort((a, b) => b[1].failed - a[1].failed).slice(0, 8)
        .map(([name, v]) => ({ name: name.slice(0, 14), value: v.failed })),
    };
  }, [prodQ.data]);

  /* ── Zaya ── */
  const waste = useMemo(() => {
    const logs = freshQ.data ?? [];
    const made = logs.reduce((s: number, f: any) => s + Number(f.initialQty || 0), 0);
    const sold = logs.reduce((s: number, f: any) => s + Number(f.soldQty || 0), 0);
    const wasted = logs.reduce((s: number, f: any) => s + Number(f.wastedQty || 0), 0);
    const discounted = logs.reduce((s: number, f: any) => s + Number(f.discountedQty || 0), 0);
    const byProduct = new Map<string, number>();
    logs.forEach((f: any) => {
      const w = Number(f.wastedQty || 0);
      if (w > 0) byProduct.set(f.productName || '—', (byProduct.get(f.productName || '—') ?? 0) + w);
    });
    const ingWaste = (ingQ.data ?? []).filter((i: any) => Number(i.totalWasted || 0) > 0)
      .map((i: any) => ({ name: (i.name || '').slice(0, 14), value: Math.round(Number(i.totalWasted) * Number(i.costPerUnit || 0)) }))
      .sort((a, b) => b.value - a.value).slice(0, 8);
    return {
      made, sold, wasted, discounted,
      wastePct: made > 0 ? (wasted / made) * 100 : 0,
      pie: [
        { name: 'Bik gaya', value: sold },
        { name: 'Discount par', value: discounted },
        { name: 'Phinka', value: wasted },
      ].filter((x) => x.value > 0),
      worst: [...byProduct.entries()].sort((a, b) => b[1] - a[1]).slice(0, 8)
        .map(([name, value]) => ({ name: name.slice(0, 14), value })),
      ingWaste,
      ingWasteTotal: (ingQ.data ?? []).reduce((s: number, i: any) => s + Number(i.totalWasted || 0) * Number(i.costPerUnit || 0), 0),
    };
  }, [freshQ.data, ingQ.data]);

  /* ── Orders ── */
  const ord = useMemo(() => {
    const cakes = (cakeQ.data ?? []).map((c: any) => ({
      kind: 'Cake', status: c.status, total: Number(c.total || 0),
      paid: Number(c.paidAmount || 0), occasion: c.occasion,
      rating: Number(c.customerRating || 0), createdAt: c.createdAt,
    }));
    const bulks = (bulkQ.data ?? []).map((b: any) => ({
      kind: 'Bara order', status: b.status,
      total: Number(b.finalPrice ?? b.quotedPrice ?? 0),
      paid: Number(b.paidAmount || 0), occasion: b.orderType,
      rating: 0, createdAt: b.createdAt,
    }));
    const all = [...cakes, ...bulks];
    const done = all.filter((x) => x.status === 'DELIVERED');
    const cancelled = all.filter((x) => x.status === 'CANCELLED');
    const active = all.filter((x) => !['DELIVERED', 'CANCELLED'].includes(x.status));
    const rated = cakes.filter((c) => c.rating > 0);
    const byOccasion = new Map<string, number>();
    all.forEach((x) => { if (x.occasion) byOccasion.set(String(x.occasion), (byOccasion.get(String(x.occasion)) ?? 0) + 1); });
    return {
      total: all.length,
      done: done.length,
      cancelled: cancelled.length,
      active: active.length,
      value: done.reduce((s, x) => s + x.total, 0),
      due: active.reduce((s, x) => s + Math.max(x.total - x.paid, 0), 0),
      cancelRate: all.length > 0 ? (cancelled.length / all.length) * 100 : 0,
      avgTicket: done.length > 0 ? done.reduce((s, x) => s + x.total, 0) / done.length : 0,
      rating: rated.length > 0 ? rated.reduce((s, c) => s + c.rating, 0) / rated.length : 0,
      kindPie: [
        { name: 'Cake orders', value: cakes.length },
        { name: 'Bare orders', value: bulks.length },
      ].filter((x) => x.value > 0),
      occasionChart: [...byOccasion.entries()].sort((a, b) => b[1] - a[1]).slice(0, 8)
        .map(([name, value]) => ({ name: String(name).replace(/_/g, ' ').slice(0, 14), value })),
    };
  }, [cakeQ.data, bulkQ.data]);

  const trendChart = useMemo(
    () => (r.trend ?? []).map((t: any) => ({
      name: dayLabel(t.date),
      bikri: Math.round(Number(t.sales || 0)),
      munafa: Math.round(Number(t.profit || 0)),
      bill: Number(t.orders || 0),
    })),
    [r.trend],
  );

  const exportCsv = () => {
    let head: string[] = []; let body: (string | number)[][] = [];
    if (tab === 'sales') {
      head = ['Tareekh', 'Bikri', 'Munafa', 'Bill'];
      body = (r.trend ?? []).map((t: any) => [dayLabel(t.date), Math.round(t.sales), Math.round(t.profit), t.orders]);
    } else if (tab === 'production') {
      head = ['Cheez', 'Socha tha', 'Bana', 'Kharab'];
      body = prod.chart.map((c) => [c.name, c.socha, c.bana, c.kharab]);
    } else if (tab === 'waste') {
      head = ['Cheez', 'Phinka'];
      body = waste.worst.map((w) => [w.name, w.value]);
    } else {
      head = ['Mauqa', 'Orders'];
      body = ord.occasionChart.map((o) => [o.name, o.value]);
    }
    const esc = (v: any) => `"${String(v ?? '').replace(/"/g, '""')}"`;
    const csv = [head, ...body].map((x) => x.map(esc).join(',')).join('\n');
    const url = URL.createObjectURL(new Blob(['﻿' + csv], { type: 'text/csv;charset=utf-8;' }));
    const a = document.createElement('a'); a.href = url;
    a.download = `bakery-report-${tab}-${new Date().toISOString().slice(0, 10)}.csv`;
    a.click(); URL.revokeObjectURL(url);
    toast.success('CSV nikal gayi');
  };

  useEffect(() => {
    const onKey = (e: KeyboardEvent) => {
      if (e.key === 'Escape' && showTeacher) return setShowTeacher(false);
      const t = document.activeElement?.tagName;
      if (t === 'INPUT' || t === 'TEXTAREA' || t === 'SELECT') return;
      if (e.key.toLowerCase() === 'g') setShowTeacher(true);
      if (e.key.toLowerCase() === 'p') window.print();
      if (e.key === '1') setTab('sales');
      if (e.key === '2') setTab('production');
      if (e.key === '3') setTab('waste');
      if (e.key === '4') setTab('orders');
    };
    window.addEventListener('keydown', onKey);
    return () => window.removeEventListener('keydown', onKey);
  }, [showTeacher]);

  return (
    <div className="space-y-4 sm:space-y-5 pb-10">
      <div className="hidden print:block mb-4">
        <h1 className="text-xl font-extrabold">{tenant?.name || 'Bakery'} — Reports</h1>
        <p className="text-xs text-slate-600">
          Pichhle {days} din • {new Date().toLocaleString('en-PK', { dateStyle: 'full', timeStyle: 'short' })}
        </p>
      </div>

      {/* ═══ HERO ═══ */}
      <section className="relative overflow-hidden rounded-3xl bg-gradient-to-br from-slate-950 via-violet-900 to-fuchsia-700 text-white p-5 sm:p-6 shadow-2xl print:hidden">
        <div className="absolute -top-24 -right-20 h-72 w-72 rounded-full bg-violet-400/25 blur-3xl" />
        <div className="absolute inset-0 opacity-[0.06]"
          style={{ backgroundImage: 'radial-gradient(circle at 1px 1px, #fff 1px, transparent 0)', backgroundSize: '22px 22px' }} />
        <div className="relative">
          <div className="flex items-start justify-between gap-4 flex-wrap">
            <div className="min-w-0">
              <div className="inline-flex items-center gap-2 rounded-full bg-white/15 backdrop-blur px-3 py-1 text-[11px] font-black border border-white/25 uppercase tracking-widest">
                <BarChart3 className="h-3.5 w-3.5 text-violet-300" /> Bakery · Reports
              </div>
              <h1 className="mt-3 text-2xl sm:text-3xl lg:text-4xl font-black leading-tight">📊 Poora Hisab</h1>
              <p className="mt-1.5 text-xs sm:text-sm font-bold text-white/90">
                Bikri <strong>{formatPKR(pl?.netRevenue ?? 0)}</strong> ·{' '}
                munafa <strong className="text-emerald-200">{formatPKR(pl?.netProfit ?? 0)}</strong> ·{' '}
                zaya <strong className="text-rose-200">{waste.wastePct.toFixed(1)}%</strong>
              </p>
            </div>
            <div className="flex gap-2 flex-wrap items-center shrink-0">
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
              <button onClick={refetchAll}
                className="h-11 w-11 rounded-xl bg-white/15 hover:bg-white/25 border border-white/25 flex items-center justify-center backdrop-blur transition">
                <RefreshCw className="h-4 w-4" />
              </button>
            </div>
          </div>

          <div className="mt-4 flex gap-1.5 flex-wrap">
            {DAYS.map((d) => (
              <button key={d} onClick={() => setDays(d)}
                className={`h-10 px-3.5 rounded-xl text-xs font-black transition ${
                  days === d ? 'bg-white text-violet-700' : 'bg-white/15 hover:bg-white/25 border border-white/25'
                }`}>{d} din</button>
            ))}
          </div>
        </div>
      </section>

      {/* ═══ TABS ═══ */}
      <div className="grid grid-cols-4 gap-2 print:hidden">
        {TABS.map(([v, label, Icon], i) => (
          <button key={v} onClick={() => setTab(v)}
            className={`py-3 rounded-2xl border-2 font-black text-[11px] sm:text-sm inline-flex items-center justify-center gap-1.5 transition ${
              tab === v
                ? 'bg-gradient-to-r from-violet-500 to-fuchsia-600 text-white border-transparent shadow-lg'
                : 'bg-white dark:bg-slate-900 text-slate-600 dark:text-slate-300 border-slate-200 dark:border-slate-800 hover:border-violet-400'
            }`}>
            <Icon className="h-4 w-4 shrink-0" /> <span className="truncate">{label}</span>
            <kbd className="hidden lg:inline text-[9px] opacity-60">{i + 1}</kbd>
          </button>
        ))}
      </div>

      {r.isLoading ? (
        <div className="flex items-center justify-center py-24">
          <div className="h-12 w-12 rounded-full border-4 border-violet-200 border-t-violet-600 animate-spin" />
        </div>
      ) : tab === 'sales' ? (
        <div className="space-y-4">
          <section className="grid grid-cols-2 lg:grid-cols-4 gap-3">
            <Kpi icon={DollarSign} label="Bikri" value={formatPKR(pl?.netRevenue ?? 0)} sub={`${pl?.orderCount ?? 0} bill`} tone="violet" />
            <Kpi icon={Layers} label="Lagat" value={formatPKR(pl?.cogs ?? 0)} sub={`Kharch ${formatPKR(pl?.expenses ?? 0)}`} tone="amber" />
            <Kpi icon={Award} label="Munafa" value={formatPKR(pl?.netProfit ?? 0)}
              sub={`${Number(pl?.netMargin ?? 0).toFixed(1)}% margin`} tone="emerald" />
            <Kpi icon={Wallet} label="Udhaar gaya" value={formatPKR(pl?.credit ?? 0)}
              sub={`Wasool ${formatPKR(pl?.paid ?? 0)}`} tone="rose" />
          </section>

          <ChartCard icon={TrendingUp} title="Roz ki bikri aur munafa" wide>
            {trendChart.length > 0 ? (
              <ResponsiveContainer width="100%" height="100%">
                <ComposedChart data={trendChart}>
                  <defs>
                    <linearGradient id="bkRep" x1="0" y1="0" x2="0" y2="1">
                      <stop offset="5%" stopColor="#8b5cf6" stopOpacity={0.35} />
                      <stop offset="95%" stopColor="#8b5cf6" stopOpacity={0} />
                    </linearGradient>
                  </defs>
                  <CartesianGrid strokeDasharray="3 3" stroke={GRID} vertical={false} />
                  <XAxis dataKey="name" stroke={AXIS} fontSize={10} fontWeight={700} />
                  <YAxis stroke={AXIS} fontSize={11} width={78} tickFormatter={(v) => Number(v).toLocaleString('en-PK')} />
                  <Tooltip contentStyle={TOOLTIP}
                    formatter={(v: any, n: any) => [n === 'bill' ? v : formatPKR(Number(v)), n === 'bikri' ? 'Bikri' : n === 'munafa' ? 'Munafa' : 'Bill']} />
                  <Legend formatter={(v) => (v === 'bikri' ? 'Bikri' : v === 'munafa' ? 'Munafa' : 'Bill')} />
                  <Area type="monotone" dataKey="bikri" stroke="#8b5cf6" strokeWidth={3} fill="url(#bkRep)" />
                  <Line type="monotone" dataKey="munafa" stroke="#10b981" strokeWidth={3} dot={{ r: 3, strokeWidth: 0, fill: '#10b981' }} />
                </ComposedChart>
              </ResponsiveContainer>
            ) : <EmptyBox />}
          </ChartCard>

          <div className="grid lg:grid-cols-2 gap-4">
            <ChartCard icon={Star} title="Sab se zyada kya bika">
              {(r.topProducts ?? []).length > 0 ? (
                <ResponsiveContainer width="100%" height="100%">
                  <BarChart data={(r.topProducts ?? []).slice(0, 8).map((p: any) => ({
                    name: (p.product?.name ?? '—').slice(0, 14), value: Math.round(Number(p.revenue || 0)),
                  }))}>
                    <CartesianGrid strokeDasharray="3 3" stroke={GRID} vertical={false} />
                    <XAxis dataKey="name" stroke={AXIS} fontSize={10} fontWeight={700} interval={0} angle={-20} textAnchor="end" height={60} />
                    <YAxis stroke={AXIS} fontSize={11} width={78} tickFormatter={(v) => Number(v).toLocaleString('en-PK')} />
                    <Tooltip contentStyle={TOOLTIP} formatter={(v: any) => [formatPKR(Number(v)), 'Bikri']} />
                    <Bar dataKey="value" fill="#ec4899" radius={[8, 8, 0, 0]} maxBarSize={48} />
                  </BarChart>
                </ResponsiveContainer>
              ) : <EmptyBox />}
            </ChartCard>

            <ChartCard icon={Layers} title="Category me bikri">
              {(r.categoryBreakdown ?? []).length > 0 ? (
                <ResponsiveContainer width="100%" height="100%">
                  <PieChart>
                    <Pie data={(r.categoryBreakdown ?? []).map((c: any) => ({ name: c.name, value: Math.round(Number(c.revenue || 0)) }))}
                      dataKey="value" nameKey="name" innerRadius={55} outerRadius={90} paddingAngle={3}>
                      {(r.categoryBreakdown ?? []).map((_: any, i: number) => <Cell key={i} fill={PIE_COLORS[i % PIE_COLORS.length]} />)}
                    </Pie>
                    <Tooltip contentStyle={TOOLTIP} formatter={(v: any) => formatPKR(Number(v))} />
                    <Legend />
                  </PieChart>
                </ResponsiveContainer>
              ) : <EmptyBox />}
            </ChartCard>
          </div>

          <Advice tone="violet" text={
            Number(pl?.netMargin ?? 0) < 15
              ? `Margin ${Number(pl?.netMargin ?? 0).toFixed(1)}% hai — bakery me ye kam hai. Munafa ka safha kholein aur dekhein kis cheez ki cost purani chal rahi hai.`
              : `Margin ${Number(pl?.netMargin ?? 0).toFixed(1)}% theek chal raha hai. Zaya kam rakhein to aur behtar hoga.`
          } to="/profit-report" cta="Munafa dekhein" />
        </div>
      ) : tab === 'production' ? (
        <div className="space-y-4">
          <section className="grid grid-cols-2 lg:grid-cols-4 gap-3">
            <Kpi icon={Layers} label="Socha tha" value={fmtQty(prod.planned)} tone="amber" />
            <Kpi icon={Croissant} label="Bana" value={fmtQty(prod.made)}
              sub={`${prod.hitRate.toFixed(0)}% poora hua`} tone="emerald" />
            <Kpi icon={TrendingDown} label="Kharab hua" value={fmtQty(prod.failed)}
              sub={`${prod.failRate.toFixed(1)}%`} tone={prod.failRate > 5 ? 'rose' : 'emerald'} />
            <Kpi icon={ChefHat} label="Plan bane" value={(prodQ.data ?? []).length} tone="violet" />
          </section>

          <ChartCard icon={BarChart3} title="Socha kitna tha, bana kitna" wide>
            {prod.chart.length > 0 ? (
              <ResponsiveContainer width="100%" height="100%">
                <BarChart data={prod.chart}>
                  <CartesianGrid strokeDasharray="3 3" stroke={GRID} vertical={false} />
                  <XAxis dataKey="name" stroke={AXIS} fontSize={10} fontWeight={700} interval={0} angle={-20} textAnchor="end" height={60} />
                  <YAxis stroke={AXIS} fontSize={11} width={50} allowDecimals={false} />
                  <Tooltip contentStyle={TOOLTIP} />
                  <Legend />
                  <Bar dataKey="socha" fill="#94a3b8" radius={[6, 6, 0, 0]} />
                  <Bar dataKey="bana" fill="#10b981" radius={[6, 6, 0, 0]} />
                  <Bar dataKey="kharab" fill="#ef4444" radius={[6, 6, 0, 0]} />
                </BarChart>
              </ResponsiveContainer>
            ) : <EmptyBox text="Abhi koi baking plan nahi bana" />}
          </ChartCard>

          <ChartCard icon={Flame} title="Kis cheez me sab se zyada kharabi" wide>
            {prod.worst.length > 0 ? (
              <ResponsiveContainer width="100%" height="100%">
                <BarChart data={prod.worst}>
                  <CartesianGrid strokeDasharray="3 3" stroke={GRID} vertical={false} />
                  <XAxis dataKey="name" stroke={AXIS} fontSize={10} fontWeight={700} interval={0} angle={-20} textAnchor="end" height={60} />
                  <YAxis stroke={AXIS} fontSize={11} width={45} allowDecimals={false} />
                  <Tooltip contentStyle={TOOLTIP} formatter={(v: any) => [v, 'Kharab']} />
                  <Bar dataKey="value" fill="#ef4444" radius={[8, 8, 0, 0]} maxBarSize={48} />
                </BarChart>
              </ResponsiveContainer>
            ) : <EmptyBox text="Abhi tak kuch kharab nahi hua — shabash" />}
          </ChartCard>

          <Advice tone="amber" text={
            prod.failRate > 5
              ? `Har 100 me se ${prod.failRate.toFixed(0)} kharab ho rahe hain. Upar wali list dekhein — shayad us cheez ka oven ka temperature ya batch ka size dekhna chahiye.`
              : prod.hitRate < 80 && prod.planned > 0
              ? `Plan ka sirf ${prod.hitRate.toFixed(0)}% bana. Ya to plan bara ban raha hai, ya waqt kam par raha hai.`
              : 'Baking theek chal rahi hai — jitna socha, qariban utna hi ban raha hai.'
          } to="/bakery/production" cta="Baking dekhein" />
        </div>
      ) : tab === 'waste' ? (
        <div className="space-y-4">
          <section className="grid grid-cols-2 lg:grid-cols-4 gap-3">
            <Kpi icon={Croissant} label="Kul bana" value={fmtQty(waste.made)} tone="violet" />
            <Kpi icon={CheckCircle2} label="Bik gaya" value={fmtQty(waste.sold)} tone="emerald" />
            <Kpi icon={Flame} label="Phinka" value={fmtQty(waste.wasted)}
              sub={`${waste.wastePct.toFixed(1)}%`} tone={waste.wastePct > 10 ? 'rose' : 'emerald'} />
            <Kpi icon={Wheat} label="Saamaan zaya" value={formatPKR(waste.ingWasteTotal)} tone="amber" />
          </section>

          <div className="grid lg:grid-cols-2 gap-4">
            <ChartCard icon={Flame} title="Bana hua maal kahan gaya">
              {waste.pie.length > 0 ? (
                <ResponsiveContainer width="100%" height="100%">
                  <PieChart>
                    <Pie data={waste.pie} dataKey="value" nameKey="name" innerRadius={55} outerRadius={90} paddingAngle={3}>
                      <Cell fill="#10b981" /><Cell fill="#f59e0b" /><Cell fill="#ef4444" />
                    </Pie>
                    <Tooltip contentStyle={TOOLTIP} />
                    <Legend />
                  </PieChart>
                </ResponsiveContainer>
              ) : <EmptyBox />}
            </ChartCard>

            <ChartCard icon={TrendingDown} title="Kis cheez ka sab se zyada phinka">
              {waste.worst.length > 0 ? (
                <ResponsiveContainer width="100%" height="100%">
                  <BarChart data={waste.worst}>
                    <CartesianGrid strokeDasharray="3 3" stroke={GRID} vertical={false} />
                    <XAxis dataKey="name" stroke={AXIS} fontSize={10} fontWeight={700} interval={0} angle={-20} textAnchor="end" height={60} />
                    <YAxis stroke={AXIS} fontSize={11} width={45} allowDecimals={false} />
                    <Tooltip contentStyle={TOOLTIP} formatter={(v: any) => [v, 'Phinka']} />
                    <Bar dataKey="value" fill="#ef4444" radius={[8, 8, 0, 0]} maxBarSize={48} />
                  </BarChart>
                </ResponsiveContainer>
              ) : <EmptyBox text="Abhi tak kuch nahi phinka — shabash" />}
            </ChartCard>

            <ChartCard icon={Wheat} title="Kis saamaan ka zaya sab se zyada" wide>
              {waste.ingWaste.length > 0 ? (
                <ResponsiveContainer width="100%" height="100%">
                  <BarChart data={waste.ingWaste}>
                    <CartesianGrid strokeDasharray="3 3" stroke={GRID} vertical={false} />
                    <XAxis dataKey="name" stroke={AXIS} fontSize={10} fontWeight={700} interval={0} angle={-20} textAnchor="end" height={60} />
                    <YAxis stroke={AXIS} fontSize={11} width={78} tickFormatter={(v) => Number(v).toLocaleString('en-PK')} />
                    <Tooltip contentStyle={TOOLTIP} formatter={(v: any) => [formatPKR(Number(v)), 'Nuqsaan']} />
                    <Bar dataKey="value" fill="#8b5cf6" radius={[8, 8, 0, 0]} maxBarSize={48} />
                  </BarChart>
                </ResponsiveContainer>
              ) : <EmptyBox text="Saamaan ka koi zaya darj nahi" />}
            </ChartCard>
          </div>

          <Advice tone="rose" text={
            waste.wastePct > 10
              ? `Har 100 me se ${waste.wastePct.toFixed(0)} phink rahe hain — ye bakery ka sab se chupa hua nuqsaan hai. Upar dekhein kis cheez ka sab se zyada, aur us ka batch chhota kar dein. Aakhri ghante me discount lagana bhi bohat bachata hai.`
              : `Zaya ${waste.wastePct.toFixed(1)}% hai — ye acha hai. Discount par ${fmtQty(waste.discounted)} nikal gaya, warna wo bhi phinkta.`
          } to="/bakery/freshness" cta="Taazgi dekhein" />
        </div>
      ) : (
        <div className="space-y-4">
          <section className="grid grid-cols-2 lg:grid-cols-4 gap-3">
            <Kpi icon={Cake} label="Kul orders" value={ord.total}
              sub={`${ord.active} chal rahe`} tone="pink" />
            <Kpi icon={CheckCircle2} label="Poore hue" value={ord.done}
              sub={formatPKR(ord.value)} tone="emerald" />
            <Kpi icon={Wallet} label="Lena baqi" value={formatPKR(ord.due)}
              sub={`Ausat order ${formatPKR(ord.avgTicket)}`} tone="amber" />
            <Kpi icon={Star} label="Customer ki raye" value={ord.rating > 0 ? `${ord.rating.toFixed(1)} / 5` : '—'}
              sub={`${ord.cancelRate.toFixed(0)}% cancel hue`} tone={ord.cancelRate > 10 ? 'rose' : 'emerald'} />
          </section>

          <div className="grid lg:grid-cols-2 gap-4">
            <ChartCard icon={Layers} title="Cake vs bare orders">
              {ord.kindPie.length > 0 ? (
                <ResponsiveContainer width="100%" height="100%">
                  <PieChart>
                    <Pie data={ord.kindPie} dataKey="value" nameKey="name" innerRadius={55} outerRadius={90} paddingAngle={3}>
                      <Cell fill="#ec4899" /><Cell fill="#f59e0b" />
                    </Pie>
                    <Tooltip contentStyle={TOOLTIP} />
                    <Legend />
                  </PieChart>
                </ResponsiveContainer>
              ) : <EmptyBox />}
            </ChartCard>

            <ChartCard icon={Cake} title="Kis mauqe ke order zyada">
              {ord.occasionChart.length > 0 ? (
                <ResponsiveContainer width="100%" height="100%">
                  <BarChart data={ord.occasionChart}>
                    <CartesianGrid strokeDasharray="3 3" stroke={GRID} vertical={false} />
                    <XAxis dataKey="name" stroke={AXIS} fontSize={10} fontWeight={700} interval={0} angle={-20} textAnchor="end" height={60} />
                    <YAxis stroke={AXIS} fontSize={11} width={45} allowDecimals={false} />
                    <Tooltip contentStyle={TOOLTIP} formatter={(v: any) => [v, 'Order']} />
                    <Bar dataKey="value" fill="#ec4899" radius={[8, 8, 0, 0]} maxBarSize={48} />
                  </BarChart>
                </ResponsiveContainer>
              ) : <EmptyBox />}
            </ChartCard>
          </div>

          <Advice tone="pink" text={
            ord.cancelRate > 10
              ? `${ord.cancelRate.toFixed(0)}% orders cancel ho rahe hain — ye zyada hai. Advance lena shuru karein, cancel karna mushkil ho jata hai.`
              : ord.due > 0
              ? `${formatPKR(ord.due)} chal rahe orders se lena baqi hai. Advance poora lein taake saamaan apni jeb se na khareedna pare.`
              : 'Orders ka hisab saaf hai — advance bhi aa raha hai aur cancel bhi kam.'
          } to="/bakery/cake-orders" cta="Orders dekhein" />
        </div>
      )}

      {showTeacher && <Teacher onClose={() => setShowTeacher(false)} />}
    </div>
  );
}

/* ═══ CHHOTE HISSE ═══ */
function Advice({ tone, text, to, cta }: any) {
  const tones: Record<string, string> = {
    violet: 'bg-violet-50 dark:bg-violet-500/10 border-violet-200 dark:border-violet-500/30 text-violet-900 dark:text-violet-200',
    amber: 'bg-amber-50 dark:bg-amber-500/10 border-amber-200 dark:border-amber-500/30 text-amber-900 dark:text-amber-200',
    rose: 'bg-rose-50 dark:bg-rose-500/10 border-rose-200 dark:border-rose-500/30 text-rose-900 dark:text-rose-200',
    pink: 'bg-pink-50 dark:bg-pink-500/10 border-pink-200 dark:border-pink-500/30 text-pink-900 dark:text-pink-200',
  };
  return (
    <section className={`rounded-3xl border-2 p-4 flex items-center gap-3 flex-wrap ${tones[tone]}`}>
      <AlertTriangle className="h-5 w-5 shrink-0" />
      <p className="text-[13px] font-extrabold min-w-0 flex-1 leading-snug">{text}</p>
      <Link to={to}
        className="h-10 px-3.5 rounded-xl bg-slate-900 dark:bg-white text-white dark:text-slate-900 text-xs font-black inline-flex items-center gap-1.5 shrink-0 transition print:hidden">
        {cta}
      </Link>
    </section>
  );
}

function Kpi({ icon: Icon, label, value, sub, tone }: any) {
  const tones: Record<string, string> = {
    violet: 'from-violet-500 to-purple-600 shadow-violet-500/40',
    amber: 'from-amber-500 to-orange-600 shadow-amber-500/40',
    emerald: 'from-emerald-500 to-green-600 shadow-emerald-500/40',
    rose: 'from-rose-500 to-red-600 shadow-rose-500/40',
    pink: 'from-pink-500 to-fuchsia-600 shadow-pink-500/40',
  };
  return (
    <div className="rounded-2xl bg-white dark:bg-slate-900 border-2 border-slate-200 dark:border-slate-800 p-4 shadow-sm">
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
    </div>
  );
}

function ChartCard({ icon: Icon, title, wide, children }: any) {
  return (
    <section className={`rounded-3xl bg-white dark:bg-slate-900 border-2 border-slate-200 dark:border-slate-800 shadow-sm p-4 ${wide ? 'lg:col-span-2' : ''}`}>
      <h3 className="font-black text-slate-900 dark:text-white mb-3 flex items-center gap-2">
        <Icon className="h-4 w-4 text-violet-600" /> {title}
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
      <div className="w-full max-w-lg max-h-[90vh] overflow-y-auto rounded-3xl bg-white dark:bg-slate-900 border-2 border-violet-300 dark:border-violet-500/40 shadow-2xl" onClick={(e) => e.stopPropagation()}>
        <div className="px-5 py-3 border-b-2 border-violet-200 dark:border-violet-500/30 bg-gradient-to-r from-violet-50 to-fuchsia-50 dark:from-violet-500/15 dark:to-fuchsia-500/15 flex items-center justify-between sticky top-0 z-10">
          <h3 className="font-extrabold text-violet-900 dark:text-violet-200 flex items-center gap-2">
            <GraduationCap className="h-5 w-5" /> Reports
          </h3>
          <button onClick={onClose} className="h-8 w-8 rounded-lg hover:bg-white dark:hover:bg-slate-800 flex items-center justify-center">
            <X className="h-4 w-4 text-slate-600 dark:text-slate-300" />
          </button>
        </div>
        <div className="p-5 space-y-3 text-sm">
          <p className="font-bold text-slate-700 dark:text-slate-200">
            Aam reports sirf bikri dikhate hain. Bakery ka asal hisab <strong>chaar</strong>
            cheezon se banta hai — aur teen kisi aam report me aati hi nahi.
          </p>
          <Tip icon={TrendingUp} title="1. Bikri">
            Kitna bika, kitna munafa, kitna udhaar gaya.
          </Tip>
          <Tip icon={ChefHat} title="2. Baking">
            Socha kitna tha aur bana kitna. Agar plan ka aadha hi ban raha hai to ya plan bara
            hai ya waqt kam.
          </Tip>
          <Tip icon={Flame} title="3. Zaya">
            Bakery ka sab se <strong>chupa hua nuqsaan</strong>. Jo maal phink gaya uska saamaan
            bhi gaya aur mehnat bhi — magar kisi khate me nazar nahi aata.
          </Tip>
          <Tip icon={Cake} title="4. Orders">
            Advance aaya ya sirf waada hai, aur kitne order cancel ho rahe hain.
          </Tip>
          <Tip icon={AlertTriangle} title="Har tab ke aakhir me">
            Ek seedha jumla hota hai: <strong>is se karna kya hai</strong>. Sirf number dekhne se
            kuch nahi badalta.
          </Tip>
          <div className="rounded-2xl bg-slate-50 dark:bg-slate-800 p-3">
            <div className="text-[10px] font-black uppercase tracking-widest text-slate-500 mb-2">Shortcuts</div>
            <div className="grid grid-cols-2 gap-1.5 text-[11px] font-bold text-slate-600 dark:text-slate-300">
              <div><kbd className="px-1.5 py-0.5 rounded bg-white dark:bg-slate-900 border">1-4</kbd> tab badlo</div>
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
      <div className="h-8 w-8 rounded-xl bg-violet-100 dark:bg-violet-500/20 flex items-center justify-center shrink-0">
        <Icon className="h-4 w-4 text-violet-600 dark:text-violet-400" />
      </div>
      <div className="min-w-0">
        <div className="font-extrabold text-slate-900 dark:text-white text-[13px]">{title}</div>
        <p className="text-[12px] font-semibold text-slate-600 dark:text-slate-300 leading-snug">{children}</p>
      </div>
    </div>
  );
}
