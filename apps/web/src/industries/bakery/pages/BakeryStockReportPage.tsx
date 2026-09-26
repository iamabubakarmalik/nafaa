import { useMemo, useState, useEffect, useRef } from 'react';
import { Link } from 'react-router-dom';
import { useQuery } from '@tanstack/react-query';
import {
  Boxes, Search, X, RefreshCw, AlertTriangle, CheckCircle2, Snowflake,
  BarChart3, GraduationCap, FileSpreadsheet, Printer, Wheat, ChefHat,
  ShoppingBag, Layers, DollarSign, TrendingUp, Timer, Package, ArrowRight,
} from 'lucide-react';
import {
  ResponsiveContainer, BarChart, Bar, XAxis, YAxis, Tooltip, CartesianGrid,
  PieChart, Pie, Cell, Legend,
} from 'recharts';
import { toast } from 'sonner';
import { stockReportApi } from '@modules/inventory/stock-report/api/stock-report.api';
import { bakeryProductsApi } from '../api/products.api';
import { ingredientsApi } from '../api/ingredients.api';
import { formatPKR } from '@core/lib/format';
import { Button } from '@core/ui/Button';
import { useAuthStore } from '@core/stores/auth.store';

/* ═════════════════════════════════════════════════════════════
   STOCK REPORT — BAKERY KA POORA PAISA
   ─────────────────────────────────────────────────────────────
   Aam stock report sirf bikne wali cheezein ginti hai. Bakery me
   is se aadhi tasveer banti hai: gudaam me para maida, cheeni aur
   makkhan bhi paisa hi hai — aur aksar bana hue maal se zyada.

   Is liye yahan teenon ek sath hain: khud banaya hua, bahar se
   laya hua, aur banane ka saamaan. "Kul kitna paisa phansa hai"
   ka jawab isi jagah milta hai.
   ═════════════════════════════════════════════════════════════ */

type Tab = 'goods' | 'raw' | 'analytics';
type Filter = 'all' | 'low' | 'out' | 'ok' | 'fridge';

const GRID = '#94a3b8';
const AXIS = '#64748b';
const PIE_COLORS = ['#ec4899', '#8b5cf6', '#f59e0b', '#10b981', '#3b82f6', '#ef4444', '#14b8a6', '#f97316'];
const TOOLTIP = {
  borderRadius: 12, border: '2px solid #cbd5e1', background: '#ffffff',
  color: '#0f172a', fontWeight: 700, fontSize: 12,
};

const fmtQty = (q: number) => Number(q || 0).toFixed(Number(q || 0) % 1 === 0 ? 0 : 2);

export default function BakeryStockReportPage() {
  const tenant = useAuthStore((s) => s.tenant);
  const shopName = useAuthStore((s) => s.user?.assignedShop?.name);
  const searchRef = useRef<HTMLInputElement>(null);

  const [tab, setTab] = useState<Tab>('goods');
  const [filter, setFilter] = useState<Filter>('all');
  const [search, setSearch] = useState('');
  const [showTeacher, setShowTeacher] = useState(false);

  const stockQ = useQuery({
    queryKey: ['bakery-stock-report'],
    queryFn: () => stockReportApi.generate({ stockStatus: 'all', isActive: true }),
  });

  const profilesQ = useQuery({
    queryKey: ['bakery-profiles-all'],
    queryFn: () => bakeryProductsApi.list({}).catch(() => []),
  });

  const ingQ = useQuery({
    queryKey: ['bakery-ingredients'],
    queryFn: () => ingredientsApi.list({}).catch(() => []),
  });

  const profileBy = useMemo(() => {
    const m = new Map<string, any>();
    (profilesQ.data ?? []).forEach((p: any) => { if (p.productId) m.set(p.productId, p); });
    return m;
  }, [profilesQ.data]);

  /* ── Bikne wala maal ── */
  const goods = useMemo(() => {
    const rows = stockQ.data?.rows ?? [];
    return rows.map((r) => {
      const pr = profileBy.get(r.productId);
      return {
        ...r,
        profile: pr,
        isMade: !!(pr?.isCakeCustomizable || pr?.isCustomizable),
        fridge: !!pr?.requiresRefrigeration,
        shelfDays: pr?.shelfLifeDays ?? null,
        isOut: r.stockStatus === 'OUT_OF_STOCK',
        isLow: r.stockStatus === 'LOW_STOCK',
      };
    });
  }, [stockQ.data, profileBy]);

  /* ── Banane ka saamaan ── */
  const raw = useMemo(() => {
    const list = ingQ.data ?? [];
    return list.filter((i: any) => i.isActive !== false).map((i: any) => {
      const level = Number(i.reorderLevel ?? i.minStock ?? 0);
      const have = Number(i.currentStock || 0);
      const cost = Number(i.costPerUnit || 0);
      return { ...i, level, have, cost, value: have * cost, isOut: have <= 0, isLow: have > 0 && have <= level };
    });
  }, [ingQ.data]);

  const q = search.trim().toLowerCase();

  const shownGoods = useMemo(() => {
    let out = goods;
    if (filter === 'low') out = out.filter((r) => r.isLow);
    if (filter === 'out') out = out.filter((r) => r.isOut);
    if (filter === 'ok') out = out.filter((r) => !r.isLow && !r.isOut);
    if (filter === 'fridge') out = out.filter((r) => r.fridge);
    if (q) out = out.filter((r) =>
      (r.productName || '').toLowerCase().includes(q) ||
      (r.category || '').toLowerCase().includes(q) ||
      (r.sku || '').toLowerCase().includes(q));
    return [...out].sort((a, b) => Number(b.stockValue) - Number(a.stockValue));
  }, [goods, filter, q]);

  const shownRaw = useMemo(() => {
    let out = raw;
    if (filter === 'low') out = out.filter((r) => r.isLow);
    if (filter === 'out') out = out.filter((r) => r.isOut);
    if (filter === 'ok') out = out.filter((r) => !r.isLow && !r.isOut);
    if (filter === 'fridge') out = out.filter((r) => r.requiresRefrigeration);
    if (q) out = out.filter((r) => (r.name || '').toLowerCase().includes(q));
    return [...out].sort((a, b) => b.value - a.value);
  }, [raw, filter, q]);

  /* ── Stats ── */
  const stats = useMemo(() => {
    const madeVal = goods.filter((g) => g.isMade).reduce((s, g) => s + Number(g.stockValue || 0), 0);
    const boughtVal = goods.filter((g) => !g.isMade).reduce((s, g) => s + Number(g.stockValue || 0), 0);
    const rawVal = raw.reduce((s, r) => s + r.value, 0);
    const retail = goods.reduce((s, g) => s + Number(g.retailValue || 0), 0);
    const goodsVal = madeVal + boughtVal;
    return {
      goodsVal, madeVal, boughtVal, rawVal,
      total: goodsVal + rawVal,
      retail,
      potential: retail - goodsVal,
      out: goods.filter((g) => g.isOut).length + raw.filter((r) => r.isOut).length,
      low: goods.filter((g) => g.isLow).length + raw.filter((r) => r.isLow).length,
      fridge: goods.filter((g) => g.fridge).length + raw.filter((r) => r.requiresRefrigeration).length,
      noShelf: goods.filter((g) => g.isMade && g.shelfDays == null).length,
      noCost: goods.filter((g) => Number(g.costPrice || 0) <= 0).length,
    };
  }, [goods, raw]);

  /* ── Charts ── */
  const splitPie = useMemo(() => ([
    { name: 'Khud banaya', value: Math.round(stats.madeVal) },
    { name: 'Bahar se laya', value: Math.round(stats.boughtVal) },
    { name: 'Banane ka saamaan', value: Math.round(stats.rawVal) },
  ].filter((x) => x.value > 0)), [stats]);

  const topGoods = useMemo(
    () => [...goods].sort((a, b) => Number(b.stockValue) - Number(a.stockValue)).slice(0, 10)
      .map((g) => ({ name: (g.productName || '').slice(0, 14), lagat: Math.round(Number(g.stockValue)), bikri: Math.round(Number(g.retailValue)) })),
    [goods],
  );

  const topRaw = useMemo(
    () => [...raw].sort((a, b) => b.value - a.value).slice(0, 10)
      .map((r) => ({ name: (r.name || '').slice(0, 14), value: Math.round(r.value) })),
    [raw],
  );

  const healthPie = useMemo(() => {
    const total = goods.length + raw.length;
    const out = stats.out, low = stats.low;
    return [
      { name: 'Theek hai', value: total - out - low },
      { name: 'Kam ho gaya', value: low },
      { name: 'Khatam', value: out },
    ].filter((x) => x.value > 0);
  }, [goods, raw, stats]);

  const categoryPie = useMemo(() => {
    const m = new Map<string, number>();
    goods.forEach((g) => {
      const k = g.category || 'Bina category';
      m.set(k, (m.get(k) ?? 0) + Number(g.stockValue || 0));
    });
    return [...m.entries()].map(([name, v]) => ({ name, value: Math.round(v) }))
      .filter((x) => x.value > 0).sort((a, b) => b.value - a.value).slice(0, 8);
  }, [goods]);

  const exportCsv = () => {
    const head = tab === 'raw'
      ? ['Saamaan', 'Abhi hai', 'Unit', 'Hadd', 'Rate', 'Qeemat', 'Fridge']
      : ['Cheez', 'Category', 'Type', 'Stock', 'Unit', 'Cost', 'Rate', 'Stock ki lagat', 'Bikri par', 'Kitni der theek'];
    const body = tab === 'raw'
      ? shownRaw.map((r) => [r.name, r.have, r.unit, r.level, r.cost, Math.round(r.value), r.requiresRefrigeration ? 'Haan' : 'Nahi'])
      : shownGoods.map((g) => [
          g.productName, g.category ?? '', g.isMade ? 'Khud banaya' : 'Bahar se laya',
          g.stock, g.unit, g.costPrice, g.salePrice,
          Math.round(Number(g.stockValue)), Math.round(Number(g.retailValue)),
          g.shelfDays != null ? `${g.shelfDays} din` : '',
        ]);
    const esc = (v: any) => `"${String(v ?? '').replace(/"/g, '""')}"`;
    const csv = [head, ...body].map((r) => r.map(esc).join(',')).join('\n');
    const url = URL.createObjectURL(new Blob(['﻿' + csv], { type: 'text/csv;charset=utf-8;' }));
    const a = document.createElement('a'); a.href = url;
    a.download = `bakery-stock-${tab}-${new Date().toISOString().slice(0, 10)}.csv`;
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
      if (e.key.toLowerCase() === 'p') window.print();
      if (e.key === '1') setTab('goods');
      if (e.key === '2') setTab('raw');
      if (e.key === '3') setTab('analytics');
    };
    window.addEventListener('keydown', onKey);
    return () => window.removeEventListener('keydown', onKey);
  }, [showTeacher]);

  const loading = stockQ.isLoading || ingQ.isLoading;

  return (
    <div className="space-y-4 sm:space-y-5 pb-10">
      <div className="hidden print:block mb-4">
        <h1 className="text-xl font-extrabold">{tenant?.name || 'Bakery'} — Stock report</h1>
        <p className="text-xs text-slate-600">
          {shopName ? `${shopName} • ` : ''}{new Date().toLocaleString('en-PK', { dateStyle: 'full', timeStyle: 'short' })}
        </p>
        <p className="text-xs text-slate-600 mt-1">Kul phansa hua paisa: {formatPKR(stats.total)}</p>
      </div>

      {/* ═══ HERO ═══ */}
      <section className="relative overflow-hidden rounded-3xl bg-gradient-to-br from-slate-950 via-indigo-900 to-violet-700 text-white p-5 sm:p-6 shadow-2xl print:hidden">
        <div className="absolute -top-24 -right-20 h-72 w-72 rounded-full bg-indigo-400/25 blur-3xl" />
        <div className="absolute inset-0 opacity-[0.06]"
          style={{ backgroundImage: 'radial-gradient(circle at 1px 1px, #fff 1px, transparent 0)', backgroundSize: '22px 22px' }} />
        <div className="relative flex items-start justify-between gap-4 flex-wrap">
          <div className="min-w-0">
            <div className="inline-flex items-center gap-2 rounded-full bg-white/15 backdrop-blur px-3 py-1 text-[11px] font-black border border-white/25 uppercase tracking-widest">
              <Boxes className="h-3.5 w-3.5 text-indigo-300" /> Bakery · Stock
            </div>
            <h1 className="mt-3 text-2xl sm:text-3xl lg:text-4xl font-black leading-tight">📦 Paisa Kahan Phansa Hai</h1>
            <p className="mt-1.5 text-xs sm:text-sm font-bold text-white/90">
              Kul <strong className="text-white">{formatPKR(stats.total)}</strong> ·{' '}
              maal <strong className="text-pink-200">{formatPKR(stats.goodsVal)}</strong> ·{' '}
              saamaan <strong className="text-violet-200">{formatPKR(stats.rawVal)}</strong>
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
            <button onClick={() => { stockQ.refetch(); ingQ.refetch(); }}
              className="h-11 w-11 rounded-xl bg-white/15 hover:bg-white/25 border border-white/25 flex items-center justify-center backdrop-blur transition">
              <RefreshCw className={`h-4 w-4 ${stockQ.isRefetching ? 'animate-spin' : ''}`} />
            </button>
          </div>
        </div>
      </section>

      {/* ═══ KPI ═══ */}
      <section className="grid grid-cols-2 lg:grid-cols-4 gap-3 print:hidden">
        <Kpi icon={ChefHat} label="Khud banaya hua" value={formatPKR(stats.madeVal)} tone="pink" />
        <Kpi icon={ShoppingBag} label="Bahar se laya" value={formatPKR(stats.boughtVal)} tone="blue" />
        <Kpi icon={Wheat} label="Banane ka saamaan" value={formatPKR(stats.rawVal)}
          sub={`${raw.length} cheezein`} tone="violet" onClick={() => setTab('raw')} />
        <Kpi icon={TrendingUp} label="Sab bik jaye to" value={formatPKR(stats.retail)}
          sub={`Munafa ${formatPKR(stats.potential)}`} tone="emerald" />
      </section>

      {/* ═══ WARNINGS ═══ */}
      {(stats.noCost > 0 || stats.noShelf > 0 || stats.out > 0) && (
        <section className="rounded-3xl bg-amber-50 dark:bg-amber-500/10 border-2 border-amber-200 dark:border-amber-500/30 p-4 space-y-1.5 print:hidden">
          <div className="flex items-center gap-2">
            <AlertTriangle className="h-4 w-4 text-amber-600" />
            <h3 className="font-black text-amber-900 dark:text-amber-200">Ye theek kar lein</h3>
          </div>
          {stats.out > 0 && (
            <p className="text-[12px] font-bold text-amber-900 dark:text-amber-200">
              • <strong>{stats.out}</strong> cheezein bilkul khatam hain aur <strong>{stats.low}</strong> kam ho rahi hain.
            </p>
          )}
          {stats.noCost > 0 && (
            <p className="text-[12px] font-bold text-amber-900 dark:text-amber-200">
              • <strong>{stats.noCost}</strong> cheezon ki cost 0 hai — in ka stock is hisab me
              zero qeemat ka gina ja raha hai, yani kul paisa asal se kam dikh raha hai.
            </p>
          )}
          {stats.noShelf > 0 && (
            <p className="text-[12px] font-bold text-amber-900 dark:text-amber-200">
              • <strong>{stats.noShelf}</strong> banai hui cheezon par "kitni der theek rehti hai"
              likha nahi — in ki expiry ki warning kabhi nahi aayegi.
            </p>
          )}
        </section>
      )}

      {/* ═══ TABS ═══ */}
      <div className="grid grid-cols-3 gap-2 sm:gap-3 print:hidden">
        {([
          ['goods', 'Bikne wala maal', Package, goods.length, '1'],
          ['raw', 'Banane ka saamaan', Wheat, raw.length, '2'],
          ['analytics', 'Analytics', BarChart3, null, '3'],
        ] as const).map(([v, label, Icon, count, key]) => (
          <button key={v} onClick={() => setTab(v as Tab)}
            className={`h-14 rounded-2xl border-2 font-black text-[11px] sm:text-sm inline-flex items-center justify-center gap-1.5 transition ${
              tab === v
                ? 'bg-gradient-to-r from-indigo-500 to-violet-600 text-white border-transparent shadow-lg'
                : 'bg-white dark:bg-slate-900 text-slate-600 dark:text-slate-300 border-slate-200 dark:border-slate-800 hover:border-indigo-400'
            }`}>
            <Icon className="h-4 w-4 shrink-0" /> <span className="truncate">{label}</span>
            {count !== null && (
              <span className={`text-[10px] px-1.5 py-0.5 rounded-lg ${tab === v ? 'bg-white/25' : 'bg-slate-100 dark:bg-slate-800'}`}>{count}</span>
            )}
            <kbd className="hidden lg:inline text-[9px] opacity-60">{key}</kbd>
          </button>
        ))}
      </div>

      {tab !== 'analytics' && (
        <section className="rounded-3xl bg-white dark:bg-slate-900 border-2 border-slate-200 dark:border-slate-800 shadow-sm p-3 sm:p-4 print:hidden">
          <div className="flex gap-2 flex-wrap items-center">
            <div className="relative flex-1 min-w-[220px]">
              <Search className="h-5 w-5 text-slate-400 absolute left-3.5 top-1/2 -translate-y-1/2 pointer-events-none" />
              <input ref={searchRef} value={search} onChange={(e) => setSearch(e.target.value)}
                placeholder="Naam ya category… (/ dabao)"
                className="h-12 w-full rounded-2xl border-2 border-slate-200 dark:border-slate-700 bg-white dark:bg-slate-800 pl-11 pr-10 text-sm font-bold text-slate-900 dark:text-white focus:outline-none focus:border-indigo-500 transition" />
              {search && (
                <button onClick={() => setSearch('')} className="absolute right-3 top-1/2 -translate-y-1/2 h-7 w-7 rounded-lg hover:bg-slate-100 dark:hover:bg-slate-700 flex items-center justify-center">
                  <X className="h-4 w-4 text-slate-400" />
                </button>
              )}
            </div>
            <div className="flex gap-1.5 flex-wrap">
              {([['all', 'Sab'], ['ok', '🟢 Theek'], ['low', '🟡 Kam'], ['out', '🔴 Khatam'], ['fridge', '❄️ Fridge']] as const).map(([v, l]) => (
                <button key={v} onClick={() => setFilter(v as Filter)}
                  className={`h-12 px-3.5 rounded-2xl border-2 text-xs font-black transition ${
                    filter === v
                      ? 'border-indigo-500 bg-indigo-50 dark:bg-indigo-500/15 text-indigo-700 dark:text-indigo-300'
                      : 'border-slate-200 dark:border-slate-700 bg-white dark:bg-slate-800 text-slate-600 dark:text-slate-300 hover:border-indigo-400'
                  }`}>{l}</button>
              ))}
            </div>
          </div>
        </section>
      )}

      {loading ? (
        <div className="flex items-center justify-center py-24">
          <div className="h-12 w-12 rounded-full border-4 border-indigo-200 border-t-indigo-600 animate-spin" />
        </div>
      ) : tab === 'goods' ? (
        shownGoods.length === 0 ? <Empty text="Koi cheez nahi mili" /> : (
          <section className="rounded-3xl bg-white dark:bg-slate-900 border-2 border-slate-200 dark:border-slate-800 shadow-sm overflow-hidden">
            <div className="overflow-x-auto">
              <table className="w-full text-sm">
                <thead className="bg-slate-50 dark:bg-slate-800/60 border-b-2 border-slate-200 dark:border-slate-700">
                  <tr>
                    {['Cheez', 'Type', 'Stock', 'Cost', 'Rate', 'Lagat', 'Bikri par', 'Theek rehti'].map((h, i) => (
                      <th key={h} className={`px-3 py-2.5 text-[10px] font-black uppercase tracking-widest text-slate-500 ${i === 0 ? 'text-left' : 'text-right'}`}>{h}</th>
                    ))}
                  </tr>
                </thead>
                <tbody className="divide-y divide-slate-100 dark:divide-slate-800">
                  {shownGoods.map((g) => (
                    <tr key={g.productId} className="hover:bg-slate-50 dark:hover:bg-slate-800/40 transition avoid-break">
                      <td className="px-3 py-2.5">
                        <Link to={`/bakery-products/${g.productId}`} className="font-extrabold text-slate-900 dark:text-white hover:text-indigo-600">
                          {g.productName}
                        </Link>
                        <div className="text-[10px] font-bold text-slate-400 flex items-center gap-1">
                          {g.category ?? '—'}
                          {g.fridge && <Snowflake className="h-2.5 w-2.5 text-sky-500" />}
                        </div>
                      </td>
                      <td className="px-3 py-2.5 text-right">
                        <span className={`text-[9px] font-black uppercase px-1.5 py-0.5 rounded-md ${
                          g.isMade ? 'bg-pink-100 dark:bg-pink-500/20 text-pink-700 dark:text-pink-300'
                            : 'bg-blue-100 dark:bg-blue-500/20 text-blue-700 dark:text-blue-300'
                        }`}>{g.isMade ? 'Khud' : 'Bahar'}</span>
                      </td>
                      <td className={`px-3 py-2.5 text-right font-black tabular-nums ${
                        g.isOut ? 'text-rose-600' : g.isLow ? 'text-amber-600' : 'text-slate-900 dark:text-white'
                      }`}>{fmtQty(Number(g.stock))} <span className="text-[10px] text-slate-400">{g.unit}</span></td>
                      <td className={`px-3 py-2.5 text-right font-bold tabular-nums ${Number(g.costPrice) <= 0 ? 'text-amber-600' : 'text-slate-600 dark:text-slate-300'}`}>
                        {Number(g.costPrice) > 0 ? formatPKR(g.costPrice) : '—'}
                      </td>
                      <td className="px-3 py-2.5 text-right font-black tabular-nums text-slate-900 dark:text-white">{formatPKR(g.salePrice)}</td>
                      <td className="px-3 py-2.5 text-right font-bold tabular-nums text-violet-700 dark:text-violet-400">{formatPKR(g.stockValue)}</td>
                      <td className="px-3 py-2.5 text-right font-bold tabular-nums text-emerald-700 dark:text-emerald-400">{formatPKR(g.retailValue)}</td>
                      <td className="px-3 py-2.5 text-right font-bold tabular-nums text-slate-500">
                        {g.shelfDays != null ? `${g.shelfDays} din` : '—'}
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </section>
        )
      ) : tab === 'raw' ? (
        shownRaw.length === 0 ? (
          <div className="rounded-3xl bg-white dark:bg-slate-900 border-4 border-dashed border-slate-200 dark:border-slate-700 p-10 text-center">
            <Wheat className="h-10 w-10 text-slate-400 mx-auto" />
            <p className="mt-3 font-black text-slate-800 dark:text-slate-100 text-lg">Koi saamaan nahi mila</p>
            <Link to="/bakery/ingredients"
              className="mt-4 h-11 px-4 rounded-xl bg-violet-600 hover:bg-violet-700 text-white text-sm font-black inline-flex items-center gap-2 transition">
              Saamaan ka safha <ArrowRight className="h-4 w-4" />
            </Link>
          </div>
        ) : (
          <>
            <div className="rounded-2xl bg-violet-50 dark:bg-violet-500/10 border-2 border-violet-200 dark:border-violet-500/30 p-3 flex gap-2 print:hidden">
              <Wheat className="h-4 w-4 text-violet-600 shrink-0 mt-0.5" />
              <p className="text-[12px] font-bold text-violet-900 dark:text-violet-200">
                Ye bikne ki cheezein nahi — magar paisa yahan bhi utna hi laga hua hai. Aksar
                bakery ka sab se bara stock yehi hota hai.
              </p>
            </div>
            <section className="mt-3 rounded-3xl bg-white dark:bg-slate-900 border-2 border-slate-200 dark:border-slate-800 shadow-sm overflow-hidden">
              <div className="divide-y divide-slate-100 dark:divide-slate-800">
                {shownRaw.map((r: any) => (
                  <div key={r.id} className="p-3 sm:p-4 flex items-center gap-3 hover:bg-slate-50 dark:hover:bg-slate-800/40 transition avoid-break">
                    <span className={`h-10 w-10 rounded-2xl flex items-center justify-center shrink-0 ${
                      r.isOut ? 'bg-rose-100 dark:bg-rose-500/20' : r.isLow ? 'bg-amber-100 dark:bg-amber-500/20' : 'bg-violet-100 dark:bg-violet-500/20'
                    }`}>
                      {r.requiresRefrigeration
                        ? <Snowflake className="h-5 w-5 text-sky-600 dark:text-sky-400" />
                        : <Wheat className={`h-5 w-5 ${r.isOut ? 'text-rose-600' : 'text-violet-600 dark:text-violet-400'}`} />}
                    </span>
                    <div className="min-w-0 flex-1">
                      <div className="font-extrabold text-sm text-slate-900 dark:text-white truncate">{r.name}</div>
                      <div className="text-[11px] font-bold text-slate-400 tabular-nums">
                        {formatPKR(r.cost)} / {r.unit}{r.level > 0 ? ` · hadd ${fmtQty(r.level)}` : ''}
                      </div>
                    </div>
                    <div className="text-right shrink-0">
                      <div className={`text-lg font-black tabular-nums ${r.isOut ? 'text-rose-600' : r.isLow ? 'text-amber-600' : 'text-slate-900 dark:text-white'}`}>
                        {fmtQty(r.have)} <span className="text-xs">{r.unit}</span>
                      </div>
                      <div className="text-[11px] font-black text-violet-700 dark:text-violet-400 tabular-nums">{formatPKR(r.value)}</div>
                    </div>
                  </div>
                ))}
              </div>
            </section>
          </>
        )
      ) : (
        <div className="grid lg:grid-cols-2 gap-4">
          <ChartCard icon={Layers} title="Paisa kis me phansa hai">
            {splitPie.length > 0 ? (
              <ResponsiveContainer width="100%" height="100%">
                <PieChart>
                  <Pie data={splitPie} dataKey="value" nameKey="name" innerRadius={55} outerRadius={90} paddingAngle={3}>
                    <Cell fill="#ec4899" /><Cell fill="#3b82f6" /><Cell fill="#8b5cf6" />
                  </Pie>
                  <Tooltip contentStyle={TOOLTIP} formatter={(v: any) => formatPKR(Number(v))} />
                  <Legend />
                </PieChart>
              </ResponsiveContainer>
            ) : <EmptyBox />}
          </ChartCard>

          <ChartCard icon={CheckCircle2} title="Stock ki halat">
            {healthPie.length > 0 ? (
              <ResponsiveContainer width="100%" height="100%">
                <PieChart>
                  <Pie data={healthPie} dataKey="value" nameKey="name" innerRadius={55} outerRadius={90} paddingAngle={3}>
                    <Cell fill="#10b981" /><Cell fill="#f59e0b" /><Cell fill="#ef4444" />
                  </Pie>
                  <Tooltip contentStyle={TOOLTIP} />
                  <Legend />
                </PieChart>
              </ResponsiveContainer>
            ) : <EmptyBox />}
          </ChartCard>

          <ChartCard icon={DollarSign} title="Sab se qeemti maal" wide>
            {topGoods.length > 0 ? (
              <ResponsiveContainer width="100%" height="100%">
                <BarChart data={topGoods}>
                  <CartesianGrid strokeDasharray="3 3" stroke={GRID} vertical={false} />
                  <XAxis dataKey="name" stroke={AXIS} fontSize={10} fontWeight={700} interval={0} angle={-20} textAnchor="end" height={60} />
                  <YAxis stroke={AXIS} fontSize={11} width={78} tickFormatter={(v) => Number(v).toLocaleString('en-PK')} />
                  <Tooltip contentStyle={TOOLTIP} formatter={(v: any, n: any) => [formatPKR(Number(v)), n === 'lagat' ? 'Lagat' : 'Bikri par']} />
                  <Legend formatter={(v) => (v === 'lagat' ? 'Lagat' : 'Bikri par')} />
                  <Bar dataKey="lagat" fill="#8b5cf6" radius={[6, 6, 0, 0]} />
                  <Bar dataKey="bikri" fill="#10b981" radius={[6, 6, 0, 0]} />
                </BarChart>
              </ResponsiveContainer>
            ) : <EmptyBox />}
          </ChartCard>

          <ChartCard icon={Wheat} title="Sab se qeemti saamaan">
            {topRaw.length > 0 ? (
              <ResponsiveContainer width="100%" height="100%">
                <BarChart data={topRaw}>
                  <CartesianGrid strokeDasharray="3 3" stroke={GRID} vertical={false} />
                  <XAxis dataKey="name" stroke={AXIS} fontSize={10} fontWeight={700} interval={0} angle={-20} textAnchor="end" height={60} />
                  <YAxis stroke={AXIS} fontSize={11} width={70} tickFormatter={(v) => Number(v).toLocaleString('en-PK')} />
                  <Tooltip contentStyle={TOOLTIP} formatter={(v: any) => [formatPKR(Number(v)), 'Qeemat']} />
                  <Bar dataKey="value" fill="#8b5cf6" radius={[8, 8, 0, 0]} maxBarSize={48} />
                </BarChart>
              </ResponsiveContainer>
            ) : <EmptyBox />}
          </ChartCard>

          <ChartCard icon={Layers} title="Category me kitna paisa">
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
        </div>
      )}

      {showTeacher && <Teacher onClose={() => setShowTeacher(false)} />}
    </div>
  );
}

/* ═══ CHHOTE HISSE ═══ */
function Kpi({ icon: Icon, label, value, sub, tone, onClick }: any) {
  const tones: Record<string, string> = {
    pink: 'from-pink-500 to-fuchsia-600 shadow-pink-500/40',
    blue: 'from-blue-500 to-sky-600 shadow-blue-500/40',
    violet: 'from-violet-500 to-purple-600 shadow-violet-500/40',
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
        <Icon className="h-4 w-4 text-indigo-600" /> {title}
      </h3>
      <div className="h-64">{children}</div>
    </section>
  );
}

function EmptyBox({ text }: { text?: string }) {
  return <div className="h-full flex items-center justify-center"><p className="text-sm font-bold text-slate-400 text-center px-4">{text ?? 'Abhi dikhane ko kuch nahi'}</p></div>;
}

function Empty({ text }: { text: string }) {
  return (
    <div className="rounded-3xl bg-white dark:bg-slate-900 border-4 border-dashed border-slate-200 dark:border-slate-700 p-10 text-center">
      <Boxes className="h-10 w-10 text-slate-400 mx-auto" />
      <p className="mt-3 font-black text-slate-800 dark:text-slate-100 text-lg">{text}</p>
    </div>
  );
}

function Teacher({ onClose }: { onClose: () => void }) {
  return (
    <div className="fixed inset-0 z-50 bg-black/60 backdrop-blur-sm flex items-end sm:items-center justify-center p-3" onClick={onClose}>
      <div className="w-full max-w-lg max-h-[90vh] overflow-y-auto rounded-3xl bg-white dark:bg-slate-900 border-2 border-indigo-300 dark:border-indigo-500/40 shadow-2xl" onClick={(e) => e.stopPropagation()}>
        <div className="px-5 py-3 border-b-2 border-indigo-200 dark:border-indigo-500/30 bg-gradient-to-r from-indigo-50 to-violet-50 dark:from-indigo-500/15 dark:to-violet-500/15 flex items-center justify-between sticky top-0 z-10">
          <h3 className="font-extrabold text-indigo-900 dark:text-indigo-200 flex items-center gap-2">
            <GraduationCap className="h-5 w-5" /> Stock report
          </h3>
          <button onClick={onClose} className="h-8 w-8 rounded-lg hover:bg-white dark:hover:bg-slate-800 flex items-center justify-center">
            <X className="h-4 w-4 text-slate-600 dark:text-slate-300" />
          </button>
        </div>
        <div className="p-5 space-y-3 text-sm">
          <p className="font-bold text-slate-700 dark:text-slate-200">
            Aam stock report sirf bikne wali cheezein ginti hai. Bakery me is se <strong>aadhi
            tasveer</strong> banti hai — gudaam me para maida aur makkhan bhi paisa hi hai.
          </p>
          <Tip icon={Package} title="Bikne wala maal">
            Jo counter par hai — khud banaya hua aur bahar se laya hua, dono alag nishan ke sath.
          </Tip>
          <Tip icon={Wheat} title="Banane ka saamaan">
            Maida, cheeni, makkhan. Bikta nahi, magar paisa utna hi laga hua hai — aksar bakery ka
            sab se bara stock yehi hota hai.
          </Tip>
          <Tip icon={DollarSign} title="Do qeematein">
            <strong>Lagat</strong> = jo paisa laga hua hai. <strong>Bikri par</strong> = sab bik
            jaye to kitna aayega. Dono ka farq hi asal munafa hai.
          </Tip>
          <Tip icon={AlertTriangle} title="Cost 0 ka masla">
            Jis cheez ki cost 0 hai, uska stock is hisab me <strong>zero qeemat</strong> ka gina
            jata hai — yani kul paisa asal se kam dikhta hai. Pehle wo theek karein.
          </Tip>
          <div className="rounded-2xl bg-slate-50 dark:bg-slate-800 p-3">
            <div className="text-[10px] font-black uppercase tracking-widest text-slate-500 mb-2">Shortcuts</div>
            <div className="grid grid-cols-2 gap-1.5 text-[11px] font-bold text-slate-600 dark:text-slate-300">
              <div><kbd className="px-1.5 py-0.5 rounded bg-white dark:bg-slate-900 border">1-3</kbd> tab badlo</div>
              <div><kbd className="px-1.5 py-0.5 rounded bg-white dark:bg-slate-900 border">/</kbd> dhoondo</div>
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
      <div className="h-8 w-8 rounded-xl bg-indigo-100 dark:bg-indigo-500/20 flex items-center justify-center shrink-0">
        <Icon className="h-4 w-4 text-indigo-600 dark:text-indigo-400" />
      </div>
      <div className="min-w-0">
        <div className="font-extrabold text-slate-900 dark:text-white text-[13px]">{title}</div>
        <p className="text-[12px] font-semibold text-slate-600 dark:text-slate-300 leading-snug">{children}</p>
      </div>
    </div>
  );
}
