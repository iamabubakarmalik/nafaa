import { useMemo, useState, useEffect, useRef } from 'react';
import { Link } from 'react-router-dom';
import { useQuery } from '@tanstack/react-query';
import {
  TrendingUp, TrendingDown, Award, AlertTriangle, Search, X, RefreshCw,
  BarChart3, GraduationCap, FileSpreadsheet, Printer, DollarSign, Wheat,
  Cake, ChefHat, ShoppingBag, Layers, Calculator, Flame, ArrowRight, Star,
} from 'lucide-react';
import {
  ResponsiveContainer, BarChart, Bar, XAxis, YAxis, Tooltip, CartesianGrid,
  PieChart, Pie, Cell, Legend,
} from 'recharts';
import { toast } from 'sonner';
import { profitReportApi, type ProfitPeriod, type ProductProfit } from '@modules/finance/profit-report/api/profit-report.api';
import { bakeryProductsApi } from '../api/products.api';
import { formatPKR } from '@core/lib/format';
import { Button } from '@core/ui/Button';
import { useAuthStore } from '@core/stores/auth.store';

/* ═════════════════════════════════════════════════════════════
   MUNAFA — KIS CHEEZ SE KYA BAN RAHA HAI
   ─────────────────────────────────────────────────────────────
   Bakery me munafa ka hisab aam dukaan se mushkil hai: cheez
   khareedi nahi jati, BANAI jati hai. Cost tabhi sahi hoti hai
   jab recipe bhari ho aur saamaan ka rate taaza ho.

   Is liye yahan ek kaam aur hota hai: jahan form wali cost aur
   recipe wala kharcha alag ho, wahan nishan lag jata hai. Aksar
   iska matlab hota hai ke maida ya makkhan mehnga ho gaya, aur
   bechne ka rate abhi purana chal raha hai — yani har bikri par
   chupa hua nuqsaan.
   ═════════════════════════════════════════════════════════════ */

type Tab = 'products' | 'analytics';

const PERIODS: Array<[ProfitPeriod, string]> = [
  ['today', 'Aaj'], ['week', 'Hafta'], ['month', 'Mahina'],
  ['quarter', '3 mahine'], ['year', 'Saal'], ['all', 'Sab'],
];

const GRID = '#94a3b8';
const AXIS = '#64748b';
const PIE_COLORS = ['#ec4899', '#8b5cf6', '#f59e0b', '#10b981', '#3b82f6', '#ef4444', '#14b8a6', '#f97316'];
const TOOLTIP = {
  borderRadius: 12, border: '2px solid #cbd5e1', background: '#ffffff',
  color: '#0f172a', fontWeight: 700, fontSize: 12,
};

export default function BakeryProfitReportPage() {
  const tenant = useAuthStore((s) => s.tenant);
  const searchRef = useRef<HTMLInputElement>(null);

  const [tab, setTab] = useState<Tab>('products');
  const [period, setPeriod] = useState<ProfitPeriod>('month');
  const [search, setSearch] = useState('');
  const [onlyProblems, setOnlyProblems] = useState(false);
  const [showTeacher, setShowTeacher] = useState(false);

  const summaryQ = useQuery({
    queryKey: ['bakery-profit-summary', period],
    queryFn: () => profitReportApi.summary({ period }),
  });

  const productsQ = useQuery({
    queryKey: ['bakery-profit-products', period],
    queryFn: () => profitReportApi.byProduct({ period, sortBy: 'profit' }),
  });

  const profilesQ = useQuery({
    queryKey: ['bakery-profiles-all'],
    queryFn: () => bakeryProductsApi.list({}).catch(() => []),
  });

  /** Recipe se ek cheez ka asli kharcha */
  const recipeCostBy = useMemo(() => {
    const m = new Map<string, number>();
    (profilesQ.data ?? []).forEach((p: any) => {
      const lines = p?.ingredients?.lines;
      if (!p.productId || !Array.isArray(lines) || lines.length === 0) return;
      const batch = lines.reduce((s: number, l: any) => s + Number(l.qty || 0) * Number(l.costPerUnit || 0), 0);
      const y = Number(p?.ingredients?.yield) > 0 ? Number(p.ingredients.yield) : 1;
      m.set(p.productId, batch / y);
    });
    return m;
  }, [profilesQ.data]);

  const madeBy = useMemo(() => {
    const m = new Set<string>();
    (profilesQ.data ?? []).forEach((p: any) => {
      if (p.productId && (p.isCakeCustomizable || p.isCustomizable)) m.add(p.productId);
    });
    return m;
  }, [profilesQ.data]);

  const rows = useMemo(() => {
    const list = productsQ.data ?? [];
    return list.map((p) => {
      const recipeCost = recipeCostBy.get(p.productId);
      /* Form wali cost aur recipe wale kharche ka farq — Rs 1 se
         ziyada ho tabhi ginte hain, warna rounding se hi warning
         aa jati. */
      const gap = recipeCost !== undefined ? recipeCost - Number(p.avgCostPrice || 0) : 0;
      return {
        ...p,
        recipeCost,
        costGap: Math.abs(gap) > 1 ? gap : 0,
        /** Agar recipe ki cost sahi maani jaye to asli munafa */
        realProfit: recipeCost !== undefined
          ? Number(p.revenue || 0) - recipeCost * Number(p.quantitySold || 0)
          : Number(p.profit || 0),
        isMade: madeBy.has(p.productId),
        noCost: Number(p.avgCostPrice || 0) <= 0,
      };
    });
  }, [productsQ.data, recipeCostBy, madeBy]);

  const q = search.trim().toLowerCase();
  const shown = useMemo(() => {
    let out = rows;
    if (onlyProblems) out = out.filter((r) => r.noCost || r.costGap > 0 || Number(r.profit) <= 0);
    if (q) out = out.filter((r) =>
      r.name.toLowerCase().includes(q) || (r.categoryName ?? '').toLowerCase().includes(q));
    return out;
  }, [rows, onlyProblems, q]);

  const s = summaryQ.data;

  const problems = useMemo(() => ({
    noCost: rows.filter((r) => r.noCost).length,
    costGap: rows.filter((r) => r.costGap > 0).length,
    losing: rows.filter((r) => Number(r.profit) <= 0 && Number(r.quantitySold) > 0).length,
    hiddenLoss: rows.reduce((acc, r) => acc + (r.costGap > 0 ? r.costGap * Number(r.quantitySold || 0) : 0), 0),
  }), [rows]);

  /* ── Charts ── */
  const topChart = useMemo(
    () => [...rows].sort((a, b) => Number(b.profit) - Number(a.profit)).slice(0, 10)
      .map((r) => ({ name: r.name.slice(0, 14), munafa: Math.round(Number(r.profit)), bikri: Math.round(Number(r.revenue)) })),
    [rows],
  );

  const categoryPie = useMemo(
    () => (s?.categoryBreakdown ?? []).filter((c) => c.profit > 0)
      .map((c) => ({ name: c.name, value: Math.round(c.profit) })),
    [s],
  );

  const kindSplit = useMemo(() => {
    const made = rows.filter((r) => r.isMade);
    const bought = rows.filter((r) => !r.isMade);
    return [
      { name: 'Khud banate hain', value: Math.round(made.reduce((x, r) => x + Number(r.profit), 0)) },
      { name: 'Bahar se laya', value: Math.round(bought.reduce((x, r) => x + Number(r.profit), 0)) },
    ].filter((x) => x.value > 0);
  }, [rows]);

  const marginChart = useMemo(
    () => [...rows].filter((r) => Number(r.quantitySold) > 0)
      .sort((a, b) => Number(b.margin) - Number(a.margin)).slice(0, 10)
      .map((r) => ({ name: r.name.slice(0, 14), value: Number(Number(r.margin).toFixed(1)) })),
    [rows],
  );

  const exportCsv = () => {
    const head = ['Cheez', 'Category', 'Bika', 'Bikri', 'Cost', 'Munafa', 'Margin %', 'Recipe ki cost', 'Farq'];
    const body = shown.map((r) => [
      r.name, r.categoryName ?? '', r.quantitySold, Math.round(Number(r.revenue)),
      Math.round(Number(r.cost)), Math.round(Number(r.profit)), Number(r.margin).toFixed(1),
      r.recipeCost !== undefined ? Math.round(r.recipeCost) : '',
      r.costGap ? Math.round(r.costGap) : '',
    ]);
    const esc = (v: any) => `"${String(v ?? '').replace(/"/g, '""')}"`;
    const csv = [head, ...body].map((r) => r.map(esc).join(',')).join('\n');
    const url = URL.createObjectURL(new Blob(['﻿' + csv], { type: 'text/csv;charset=utf-8;' }));
    const a = document.createElement('a'); a.href = url;
    a.download = `bakery-munafa-${new Date().toISOString().slice(0, 10)}.csv`;
    a.click(); URL.revokeObjectURL(url);
    toast.success('CSV nikal gayi');
  };

  useEffect(() => {
    const onKey = (e: KeyboardEvent) => {
      if (e.key === 'Escape' && showTeacher) return setShowTeacher(false);
      const t = document.activeElement?.tagName;
      if (t === 'INPUT' || t === 'TEXTAREA' || t === 'SELECT') return;
      if (e.key === '/') { e.preventDefault(); searchRef.current?.focus(); }
      if (e.key.toLowerCase() === 'g') setShowTeacher(true);
      if (e.key.toLowerCase() === 'a') setTab((x) => (x === 'analytics' ? 'products' : 'analytics'));
      if (e.key.toLowerCase() === 'p') window.print();
    };
    window.addEventListener('keydown', onKey);
    return () => window.removeEventListener('keydown', onKey);
  }, [showTeacher]);

  const loading = summaryQ.isLoading || productsQ.isLoading;

  return (
    <div className="space-y-4 sm:space-y-5 pb-10">
      <div className="hidden print:block mb-4">
        <h1 className="text-xl font-extrabold">{tenant?.name || 'Bakery'} — Munafa</h1>
        <p className="text-xs text-slate-600">{new Date().toLocaleString('en-PK', { dateStyle: 'full', timeStyle: 'short' })}</p>
      </div>

      {/* ═══ HERO ═══ */}
      <section className="relative overflow-hidden rounded-3xl bg-gradient-to-br from-slate-950 via-emerald-900 to-teal-700 text-white p-5 sm:p-6 shadow-2xl print:hidden">
        <div className="absolute -top-24 -right-20 h-72 w-72 rounded-full bg-emerald-400/25 blur-3xl" />
        <div className="absolute inset-0 opacity-[0.06]"
          style={{ backgroundImage: 'radial-gradient(circle at 1px 1px, #fff 1px, transparent 0)', backgroundSize: '22px 22px' }} />
        <div className="relative">
          <div className="flex items-start justify-between gap-4 flex-wrap">
            <div className="min-w-0">
              <div className="inline-flex items-center gap-2 rounded-full bg-white/15 backdrop-blur px-3 py-1 text-[11px] font-black border border-white/25 uppercase tracking-widest">
                <TrendingUp className="h-3.5 w-3.5 text-emerald-300" /> Bakery · Munafa
              </div>
              <h1 className="mt-3 text-2xl sm:text-3xl lg:text-4xl font-black leading-tight">💰 Kis Cheez Se Kya Bana</h1>
              <p className="mt-1.5 text-xs sm:text-sm font-bold text-white/90">
                Bikri <strong>{formatPKR(s?.totalRevenue ?? 0)}</strong> ·{' '}
                Munafa <strong className="text-emerald-200">{formatPKR(s?.totalProfit ?? 0)}</strong> ·{' '}
                <strong>{Number(s?.overallMargin ?? 0).toFixed(1)}%</strong>
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
              <button onClick={() => { summaryQ.refetch(); productsQ.refetch(); }}
                className="h-11 w-11 rounded-xl bg-white/15 hover:bg-white/25 border border-white/25 flex items-center justify-center backdrop-blur transition">
                <RefreshCw className={`h-4 w-4 ${summaryQ.isRefetching ? 'animate-spin' : ''}`} />
              </button>
            </div>
          </div>

          <div className="mt-4 flex gap-1.5 flex-wrap">
            {PERIODS.map(([v, l]) => (
              <button key={v} onClick={() => setPeriod(v)}
                className={`h-10 px-3.5 rounded-xl text-xs font-black transition ${
                  period === v ? 'bg-white text-emerald-700' : 'bg-white/15 hover:bg-white/25 border border-white/25'
                }`}>{l}</button>
            ))}
          </div>
        </div>
      </section>

      {/* ═══ KPI ═══ */}
      <section className="grid grid-cols-2 lg:grid-cols-4 gap-3 print:hidden">
        <Kpi icon={DollarSign} label="Kul bikri" value={formatPKR(s?.totalRevenue ?? 0)}
          sub={`${s?.totalOrders ?? 0} bill`} tone="violet" />
        <Kpi icon={Calculator} label="Lagat" value={formatPKR(s?.totalCost ?? 0)}
          sub={`${s?.totalQtySold ?? 0} cheezein bikin`} tone="amber" />
        <Kpi icon={Award} label="Munafa" value={formatPKR(s?.totalProfit ?? 0)}
          sub={`${Number(s?.overallMargin ?? 0).toFixed(1)}% margin`} tone="emerald" />
        <Kpi icon={AlertTriangle} label="Dhyan chahiye" value={problems.noCost + problems.costGap + problems.losing}
          sub={problems.hiddenLoss > 0 ? `${formatPKR(problems.hiddenLoss)} chupa nuqsaan` : 'Sab theek lag raha'}
          tone="rose" onClick={() => { setOnlyProblems(true); setTab('products'); }} />
      </section>

      {/* ═══ PROBLEMS ═══ */}
      {(problems.noCost > 0 || problems.costGap > 0 || problems.losing > 0) && (
        <section className="rounded-3xl bg-amber-50 dark:bg-amber-500/10 border-2 border-amber-200 dark:border-amber-500/30 p-4 space-y-1.5 print:hidden">
          <div className="flex items-center gap-2">
            <AlertTriangle className="h-4 w-4 text-amber-600" />
            <h3 className="font-black text-amber-900 dark:text-amber-200">Ye hisab kharab kar rahe hain</h3>
          </div>
          {problems.noCost > 0 && (
            <p className="text-[12px] font-bold text-amber-900 dark:text-amber-200">
              • <strong>{problems.noCost}</strong> cheezon ki cost 0 hai — in ka munafa poora dikh
              raha hai, jo sach nahi.
            </p>
          )}
          {problems.costGap > 0 && (
            <p className="text-[12px] font-bold text-amber-900 dark:text-amber-200">
              • <strong>{problems.costGap}</strong> cheezon me form wali cost aur recipe ka kharcha
              alag hai. Aksar iska matlab hai maida ya makkhan mehnga ho gaya aur rate purana chal
              raha hai — ab tak <strong>{formatPKR(problems.hiddenLoss)}</strong> ka chupa nuqsaan.
            </p>
          )}
          {problems.losing > 0 && (
            <p className="text-[12px] font-bold text-amber-900 dark:text-amber-200">
              • <strong>{problems.losing}</strong> cheezein nuqsaan par bik rahi hain.
            </p>
          )}
        </section>
      )}

      {/* ═══ TABS ═══ */}
      <div className="grid grid-cols-2 gap-2 sm:gap-3 print:hidden">
        {([['products', 'Cheez ke hisaab se', Layers], ['analytics', 'Analytics', BarChart3]] as const).map(([v, label, Icon]) => (
          <button key={v} onClick={() => setTab(v as Tab)}
            className={`h-14 rounded-2xl border-2 font-black text-sm inline-flex items-center justify-center gap-2 transition ${
              tab === v
                ? 'bg-gradient-to-r from-emerald-500 to-teal-600 text-white border-transparent shadow-lg'
                : 'bg-white dark:bg-slate-900 text-slate-600 dark:text-slate-300 border-slate-200 dark:border-slate-800 hover:border-emerald-400'
            }`}>
            <Icon className="h-4 w-4" /> {label}
          </button>
        ))}
      </div>

      {loading ? (
        <div className="flex items-center justify-center py-24">
          <div className="h-12 w-12 rounded-full border-4 border-emerald-200 border-t-emerald-600 animate-spin" />
        </div>
      ) : tab === 'products' ? (
        <>
          <section className="rounded-3xl bg-white dark:bg-slate-900 border-2 border-slate-200 dark:border-slate-800 shadow-sm p-3 sm:p-4 print:hidden">
            <div className="flex gap-2 flex-wrap items-center">
              <div className="relative flex-1 min-w-[220px]">
                <Search className="h-5 w-5 text-slate-400 absolute left-3.5 top-1/2 -translate-y-1/2 pointer-events-none" />
                <input ref={searchRef} value={search} onChange={(e) => setSearch(e.target.value)}
                  placeholder="Cheez ya category… (/ dabao)"
                  className="h-12 w-full rounded-2xl border-2 border-slate-200 dark:border-slate-700 bg-white dark:bg-slate-800 pl-11 pr-10 text-sm font-bold text-slate-900 dark:text-white focus:outline-none focus:border-emerald-500 transition" />
                {search && (
                  <button onClick={() => setSearch('')} className="absolute right-3 top-1/2 -translate-y-1/2 h-7 w-7 rounded-lg hover:bg-slate-100 dark:hover:bg-slate-700 flex items-center justify-center">
                    <X className="h-4 w-4 text-slate-400" />
                  </button>
                )}
              </div>
              <button onClick={() => setOnlyProblems((v) => !v)}
                className={`h-12 px-4 rounded-2xl border-2 text-xs font-black inline-flex items-center gap-1.5 transition ${
                  onlyProblems
                    ? 'border-amber-500 bg-amber-50 dark:bg-amber-500/15 text-amber-700 dark:text-amber-300'
                    : 'border-slate-200 dark:border-slate-700 bg-white dark:bg-slate-800 text-slate-600 dark:text-slate-300 hover:border-amber-400'
                }`}>
                <AlertTriangle className="h-4 w-4" /> Sirf masle wali
              </button>
            </div>
          </section>

          {shown.length === 0 ? (
            <EmptyState text={onlyProblems ? 'Koi masla nahi mila — sab hisab saaf hai' : 'Is arse me koi bikri nahi'} />
          ) : (
            <section className="rounded-3xl bg-white dark:bg-slate-900 border-2 border-slate-200 dark:border-slate-800 shadow-sm overflow-hidden">
              <div className="divide-y divide-slate-100 dark:divide-slate-800">
                {shown.map((r) => <ProfitRow key={r.productId} r={r} />)}
              </div>
            </section>
          )}
        </>
      ) : (
        <div className="grid lg:grid-cols-2 gap-4">
          <ChartCard icon={Award} title="Sab se zyada munafa kis se" wide>
            {topChart.length > 0 ? (
              <ResponsiveContainer width="100%" height="100%">
                <BarChart data={topChart}>
                  <CartesianGrid strokeDasharray="3 3" stroke={GRID} vertical={false} />
                  <XAxis dataKey="name" stroke={AXIS} fontSize={10} fontWeight={700} interval={0} angle={-20} textAnchor="end" height={60} />
                  <YAxis stroke={AXIS} fontSize={11} width={78} tickFormatter={(v) => Number(v).toLocaleString('en-PK')} />
                  <Tooltip contentStyle={TOOLTIP} formatter={(v: any, n: any) => [formatPKR(Number(v)), n === 'munafa' ? 'Munafa' : 'Bikri']} />
                  <Legend formatter={(v) => (v === 'munafa' ? 'Munafa' : 'Bikri')} />
                  <Bar dataKey="bikri" fill="#94a3b8" radius={[6, 6, 0, 0]} />
                  <Bar dataKey="munafa" fill="#10b981" radius={[6, 6, 0, 0]} />
                </BarChart>
              </ResponsiveContainer>
            ) : <EmptyBox />}
          </ChartCard>

          <ChartCard icon={Layers} title="Category me munafa">
            {categoryPie.length > 0 ? (
              <ResponsiveContainer width="100%" height="100%">
                <PieChart>
                  <Pie data={categoryPie} dataKey="value" nameKey="name" innerRadius={55} outerRadius={90} paddingAngle={3}>
                    {categoryPie.map((_, i) => <Cell key={i} fill={PIE_COLORS[i % PIE_COLORS.length]} />)}
                  </Pie>
                  <Tooltip contentStyle={TOOLTIP} formatter={(v: any) => formatPKR(Number(v))} />
                  <Legend />
                </PieChart>
              </ResponsiveContainer>
            ) : <EmptyBox />}
          </ChartCard>

          <ChartCard icon={ChefHat} title="Khud banaya vs bahar se laya">
            {kindSplit.length > 0 ? (
              <ResponsiveContainer width="100%" height="100%">
                <PieChart>
                  <Pie data={kindSplit} dataKey="value" nameKey="name" innerRadius={55} outerRadius={90} paddingAngle={3}>
                    <Cell fill="#ec4899" /><Cell fill="#3b82f6" />
                  </Pie>
                  <Tooltip contentStyle={TOOLTIP} formatter={(v: any) => formatPKR(Number(v))} />
                  <Legend />
                </PieChart>
              </ResponsiveContainer>
            ) : <EmptyBox />}
          </ChartCard>

          <ChartCard icon={Star} title="Sab se acha margin" wide>
            {marginChart.length > 0 ? (
              <ResponsiveContainer width="100%" height="100%">
                <BarChart data={marginChart}>
                  <CartesianGrid strokeDasharray="3 3" stroke={GRID} vertical={false} />
                  <XAxis dataKey="name" stroke={AXIS} fontSize={10} fontWeight={700} interval={0} angle={-20} textAnchor="end" height={60} />
                  <YAxis stroke={AXIS} fontSize={11} width={50} tickFormatter={(v) => `${v}%`} />
                  <Tooltip contentStyle={TOOLTIP} formatter={(v: any) => [`${v}%`, 'Margin']} />
                  <Bar dataKey="value" fill="#8b5cf6" radius={[8, 8, 0, 0]} maxBarSize={48} />
                </BarChart>
              </ResponsiveContainer>
            ) : <EmptyBox />}
          </ChartCard>
        </div>
      )}

      {showTeacher && <Teacher onClose={() => setShowTeacher(false)} />}
    </div>
  );
}

/* ═══ ROW ═══ */
function ProfitRow({ r }: { r: any }) {
  const profit = Number(r.profit || 0);
  const losing = profit <= 0 && Number(r.quantitySold) > 0;

  return (
    <div className="p-3 sm:p-4 hover:bg-slate-50 dark:hover:bg-slate-800/40 transition avoid-break">
      <div className="flex items-center gap-3 flex-wrap">
        <span className={`h-10 w-10 rounded-2xl flex items-center justify-center shrink-0 ${
          losing ? 'bg-rose-100 dark:bg-rose-500/20' : r.isMade ? 'bg-pink-100 dark:bg-pink-500/20' : 'bg-blue-100 dark:bg-blue-500/20'
        }`}>
          {losing ? <TrendingDown className="h-5 w-5 text-rose-600" />
            : r.isMade ? <ChefHat className="h-5 w-5 text-pink-600 dark:text-pink-400" />
            : <ShoppingBag className="h-5 w-5 text-blue-600 dark:text-blue-400" />}
        </span>

        <div className="min-w-0 flex-1">
          <Link to={`/bakery-products/${r.productId}`}
            className="block truncate font-extrabold text-sm text-slate-900 dark:text-white hover:text-emerald-600">
            {r.name}
          </Link>
          <div className="text-[11px] font-bold text-slate-400 truncate">
            {r.categoryName ? `${r.categoryName} · ` : ''}{r.quantitySold} {r.unit} bika · {r.ordersCount} bill
          </div>
        </div>

        <div className="text-right shrink-0">
          <div className={`text-lg font-black tabular-nums ${losing ? 'text-rose-600' : 'text-emerald-600 dark:text-emerald-400'}`}>
            {formatPKR(profit)}
          </div>
          <div className="text-[10px] font-bold text-slate-400 tabular-nums">
            {Number(r.margin).toFixed(1)}% · bikri {formatPKR(r.revenue)}
          </div>
        </div>
      </div>

      {(r.noCost || r.costGap > 0) && (
        <div className="mt-2 rounded-xl bg-amber-50 dark:bg-amber-500/10 border-2 border-amber-200 dark:border-amber-500/30 p-2.5 flex gap-2">
          <AlertTriangle className="h-4 w-4 text-amber-600 shrink-0 mt-0.5" />
          <p className="text-[11px] font-bold text-amber-900 dark:text-amber-200">
            {r.noCost
              ? 'Is ki cost bhari hi nahi — ye munafa sirf kaghazi hai.'
              : <>Recipe ka kharcha <strong>{formatPKR(r.recipeCost)}</strong> hai, magar hisab{' '}
                <strong>{formatPKR(r.avgCostPrice)}</strong> par laga hai.{' '}
                {r.costGap > 0
                  ? <>Har cheez par <strong>{formatPKR(r.costGap)}</strong> ka chupa nuqsaan — rate dobara dekhein.</>
                  : <>Cost zyada likhi hui hai, munafa asal me is se behtar hai.</>}</>}
          </p>
        </div>
      )}
    </div>
  );
}

/* ═══ CHHOTE HISSE ═══ */
function Kpi({ icon: Icon, label, value, sub, tone, onClick }: any) {
  const tones: Record<string, string> = {
    violet: 'from-violet-500 to-purple-600 shadow-violet-500/40',
    amber: 'from-amber-500 to-orange-600 shadow-amber-500/40',
    emerald: 'from-emerald-500 to-green-600 shadow-emerald-500/40',
    rose: 'from-rose-500 to-red-600 shadow-rose-500/40',
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
        <Icon className="h-4 w-4 text-emerald-600" /> {title}
      </h3>
      <div className="h-64">{children}</div>
    </section>
  );
}

function EmptyBox({ text }: { text?: string }) {
  return <div className="h-full flex items-center justify-center"><p className="text-sm font-bold text-slate-400 text-center px-4">{text ?? 'Abhi dikhane ko kuch nahi'}</p></div>;
}

function EmptyState({ text }: { text: string }) {
  return (
    <div className="rounded-3xl bg-white dark:bg-slate-900 border-4 border-dashed border-slate-200 dark:border-slate-700 p-10 text-center">
      <TrendingUp className="h-10 w-10 text-slate-400 mx-auto" />
      <p className="mt-3 font-black text-slate-800 dark:text-slate-100 text-lg">{text}</p>
    </div>
  );
}

function Teacher({ onClose }: { onClose: () => void }) {
  return (
    <div className="fixed inset-0 z-50 bg-black/60 backdrop-blur-sm flex items-end sm:items-center justify-center p-3" onClick={onClose}>
      <div className="w-full max-w-lg max-h-[90vh] overflow-y-auto rounded-3xl bg-white dark:bg-slate-900 border-2 border-emerald-300 dark:border-emerald-500/40 shadow-2xl" onClick={(e) => e.stopPropagation()}>
        <div className="px-5 py-3 border-b-2 border-emerald-200 dark:border-emerald-500/30 bg-gradient-to-r from-emerald-50 to-teal-50 dark:from-emerald-500/15 dark:to-teal-500/15 flex items-center justify-between sticky top-0 z-10">
          <h3 className="font-extrabold text-emerald-900 dark:text-emerald-200 flex items-center gap-2">
            <GraduationCap className="h-5 w-5" /> Munafa ka safha
          </h3>
          <button onClick={onClose} className="h-8 w-8 rounded-lg hover:bg-white dark:hover:bg-slate-800 flex items-center justify-center">
            <X className="h-4 w-4 text-slate-600 dark:text-slate-300" />
          </button>
        </div>
        <div className="p-5 space-y-3 text-sm">
          <p className="font-bold text-slate-700 dark:text-slate-200">
            Bakery me munafa ka hisab aam dukaan se mushkil hai — cheez khareedi nahi jati,
            <strong> banai</strong> jati hai.
          </p>
          <Tip icon={Calculator} title="Cost sahi hai to hisab sahi">
            Jis cheez ki cost 0 hai, uska munafa poora dikhta hai — jo sach nahi. Aisi cheezein
            upar warning me aa jati hain.
          </Tip>
          <Tip icon={Wheat} title="Recipe se milan">
            Jahan form wali cost aur recipe ka kharcha alag ho, wahan nishan lag jata hai. Aksar
            iska matlab hai <strong>maida ya makkhan mehnga ho gaya</strong> aur bechne ka rate
            abhi purana chal raha hai — har bikri par chupa nuqsaan.
          </Tip>
          <Tip icon={ChefHat} title="Khud banaya vs bahar se laya">
            Analytics me dono ka munafa alag dikhta hai. Agar bahar se laye maal ka munafa zyada
            hai, to shayad apni cheezon ka rate kam hai.
          </Tip>
          <Tip icon={Flame} title="Nuqsaan wali cheezein">
            Jo cheezein nuqsaan par bik rahi hain wo laal aati hain — ya to rate barhana hai ya
            banana band karna hai.
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
