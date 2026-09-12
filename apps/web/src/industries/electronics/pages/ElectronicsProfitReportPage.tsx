// apps/web/src/industries/electronics/pages/ElectronicsProfitReportPage.tsx
import { useState, useMemo, useEffect, useRef } from 'react';
import { Link } from 'react-router-dom';
import { useQuery } from '@tanstack/react-query';
import {
  ResponsiveContainer, ComposedChart, Area, Line, BarChart, Bar,
  XAxis, YAxis, CartesianGrid, Tooltip, Cell, Legend,
} from 'recharts';
import {
  TrendingUp, Wallet, Coins, Percent, Receipt, Boxes, Barcode,
  RefreshCw, FileSpreadsheet, Printer, Calendar, Search, X,
  GraduationCap, Keyboard, CheckCircle2, Sparkles, Trophy, Tag,
  Layers, ArrowRight, ArrowUpRight, ArrowDownRight, Cpu, AlertTriangle,
} from 'lucide-react';
import { toast } from 'sonner';
import { Button } from '@core/ui/Button';
import { formatPKR } from '@core/lib/format';
import { useAuthStore, useShopParam } from '@core/stores/auth.store';
import { useCostHidden, PrivacyToggle } from '@core/ui/HiddenValue';
import { PrintStyles } from '@core/components/print/PrintStyles';
import { electronicsAnalyticsApi } from '../api/analytics.api';
import { CATEGORY_META, CONDITION_META, type CategoryType, type ConditionType } from '../constants';

/* ═════════════════════════════════════════════════════════════
   NAFAA ELECTRONICS — PROFIT REPORT
   ─────────────────────────────────────────────────────────────
   💰 Kis cheez se asli kamai hoti hai
   🏷️ Category • ✨ Condition (naya/used/refurb) • 🏭 Brand • 📦 Product
   📈 Rozana trend  •  🔖 Serial wale vs normal
   🎓 Guide • ⌨️ Shortcuts • 🖨️ Print + CSV • 📅 Custom date
   ═════════════════════════════════════════════════════════════ */

const PRESETS = [
  { key: '7', label: '7 Din' },
  { key: '30', label: '30 Din' },
  { key: '90', label: '3 Mahine' },
  { key: '365', label: '1 Saal' },
] as const;

const PALETTE = ['#2563eb', '#7c3aed', '#059669', '#f59e0b', '#e11d48', '#0891b2', '#db2777', '#65a30d'];

const isoDaysAgo = (d: number) => {
  const x = new Date();
  x.setHours(0, 0, 0, 0);
  x.setDate(x.getDate() - d + 1);
  return x.toISOString().slice(0, 10);
};
const todayIso = () => new Date().toISOString().slice(0, 10);

type Dim = 'category' | 'condition' | 'brand' | 'product';

export default function ElectronicsProfitReportPage() {
  const hideCost = useCostHidden();
  const currentShopId = useShopParam();
  const shopName = useAuthStore((s: any) => s.user?.assignedShop?.name);
  const tenantName = useAuthStore((s: any) => s.tenant?.name);

  const [preset, setPreset] = useState<string>('30');
  const [custom, setCustom] = useState(false);
  const [from, setFrom] = useState(isoDaysAgo(30));
  const [to, setTo] = useState(todayIso());
  const [dim, setDim] = useState<Dim>('category');
  const [search, setSearch] = useState('');
  const [showTeacher, setShowTeacher] = useState(false);
  const [showShortcuts, setShowShortcuts] = useState(false);
  const searchRef = useRef<HTMLInputElement>(null);

  const range = useMemo(
    () => (custom ? { from, to } : { from: isoDaysAgo(Number(preset)), to: todayIso() }),
    [custom, from, to, preset],
  );

  const { data, isLoading, refetch, isRefetching } = useQuery({
    queryKey: ['electronics-profit', currentShopId, range.from, range.to],
    queryFn: () => electronicsAnalyticsApi.profit({ ...range, shopId: currentShopId || undefined }),
  });

  /* ─── Shortcuts ─── */
  useEffect(() => {
    const onKey = (e: KeyboardEvent) => {
      const tag = (e.target as HTMLElement)?.tagName;
      const typing = tag === 'INPUT' || tag === 'TEXTAREA' || tag === 'SELECT';
      if (e.key === 'Escape') {
        if (showShortcuts) return setShowShortcuts(false);
        if (showTeacher) return setShowTeacher(false);
        return;
      }
      if (typing || e.ctrlKey || e.metaKey) return;
      if (e.key === '/') { e.preventDefault(); searchRef.current?.focus(); }
      if (e.key === 'g') setShowTeacher(true);
      if (e.key === 'r') refetch();
      if (e.key === '?') setShowShortcuts((v) => !v);
      if (e.key === 'p') window.print();
      if (['1', '2', '3', '4'].includes(e.key)) {
        const d: Dim[] = ['category', 'condition', 'brand', 'product'];
        setDim(d[Number(e.key) - 1]);
      }
    };
    window.addEventListener('keydown', onKey);
    return () => window.removeEventListener('keydown', onKey);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [showTeacher, showShortcuts]);

  const anyModal = showTeacher || showShortcuts;
  useEffect(() => {
    const prev = document.body.style.overflow;
    document.body.style.overflow = anyModal ? 'hidden' : prev;
    return () => { document.body.style.overflow = prev; };
  }, [anyModal]);

  const t = data?.totals;

  /* ─── Rows for the selected dimension ─── */
  const rows = useMemo(() => {
    if (!data) return [];
    const q = search.toLowerCase().trim();
    let list: { id: string; label: string; emoji: string; sub?: string; link?: string;
      revenue: number; cost: number; profit: number; units: number; margin: number }[] = [];

    if (dim === 'category') {
      list = data.byCategory.map((r) => {
        const m = CATEGORY_META[r.categoryType as CategoryType];
        return { id: r.categoryType, label: m?.label ?? r.categoryType, emoji: m?.emoji ?? '📦',
          sub: m?.urdu, revenue: r.revenue, cost: r.cost, profit: r.profit, units: r.units, margin: r.margin };
      });
    } else if (dim === 'condition') {
      list = data.byCondition.map((r) => {
        const m = CONDITION_META[r.conditionType as ConditionType];
        return { id: r.conditionType, label: m?.label ?? r.conditionType, emoji: m?.emoji ?? '✨',
          sub: m?.hint, revenue: r.revenue, cost: r.cost, profit: r.profit, units: r.units, margin: r.margin };
      });
    } else if (dim === 'brand') {
      list = data.topBrands.map((r) => ({ id: r.id, label: r.name, emoji: '🏭',
        revenue: r.revenue, cost: r.cost, profit: r.profit, units: r.units, margin: r.margin }));
    } else {
      list = data.topProducts.map((r) => {
        const m = r.category ? CATEGORY_META[r.category as CategoryType] : null;
        return { id: r.id, label: r.name, emoji: m?.emoji ?? '📦', sub: m?.label,
          link: `/electronics-products/${r.id}`,
          revenue: r.revenue, cost: r.cost, profit: r.profit, units: r.units, margin: r.margin };
      });
    }

    if (q) list = list.filter((r) => r.label.toLowerCase().includes(q) || (r.sub ?? '').toLowerCase().includes(q));
    return list.sort((a, b) => b.profit - a.profit);
  }, [data, dim, search]);

  const maxProfit = useMemo(() => Math.max(1, ...rows.map((r) => Math.abs(r.profit))), [rows]);
  const chartRows = useMemo(() => rows.slice(0, 8).map((r) => ({
    name: r.label.length > 14 ? r.label.slice(0, 13) + '…' : r.label,
    Munafa: Math.round(r.profit), Bikri: Math.round(r.revenue),
  })), [rows]);

  const daily = useMemo(
    () => (data?.daily ?? []).map((d) => ({
      date: new Date(d.date).toLocaleDateString('en-PK', { day: 'numeric', month: 'short' }),
      Bikri: Math.round(d.revenue), Munafa: Math.round(d.profit),
    })),
    [data],
  );

  const bestDay = useMemo(() => {
    if (!data?.daily?.length) return null;
    return data.daily.reduce((a, b) => (b.profit > a.profit ? b : a));
  }, [data]);

  const serialShare = useMemo(() => {
    if (!t?.revenue || !data?.serialTracked) return 0;
    return Math.round((data.serialTracked.revenue / t.revenue) * 100);
  }, [t, data]);

  const DIM_LABEL: Record<Dim, string> = {
    category: 'Category', condition: 'Condition', brand: 'Brand', product: 'Product',
  };

  const exportCsv = () => {
    const out: string[][] = [
      [`${tenantName ?? 'Nafaa'} — Electronics Profit Report`],
      [`Shop: ${shopName ?? 'All'}`, `${range.from} se ${range.to} tak`, new Date().toLocaleString('en-PK')],
      [],
      ['KHULASA'],
      ['Bikri', String(Math.round(t?.revenue ?? 0))],
      ['Lagat', String(Math.round(t?.cost ?? 0))],
      ['Munafa', String(Math.round(t?.profit ?? 0))],
      ['Margin %', String((t?.margin ?? 0).toFixed(1))],
      ['Sales', String(t?.salesCount ?? 0)],
      ['Units bikay', String(t?.units ?? 0)],
      ['Serial wale units', String(data?.serialTracked.units ?? 0)],
      ['Serial wali bikri', String(Math.round(data?.serialTracked.revenue ?? 0))],
      [],
      [DIM_LABEL[dim].toUpperCase(), 'Units', 'Bikri', 'Lagat', 'Munafa', 'Margin %'],
      ...rows.map((r) => [r.label, String(r.units), String(Math.round(r.revenue)),
        String(Math.round(r.cost)), String(Math.round(r.profit)), r.margin.toFixed(1)]),
      [],
      ['ROZANA', 'Bikri', 'Munafa'],
      ...(data?.daily ?? []).map((d) => [d.date.slice(0, 10), String(Math.round(d.revenue)), String(Math.round(d.profit))]),
    ];
    const csv = out.map((r) => r.map((c) => `"${String(c).replace(/"/g, '""')}"`).join(',')).join('\n');
    const url = URL.createObjectURL(new Blob(['﻿' + csv], { type: 'text/csv;charset=utf-8;' }));
    const a = document.createElement('a');
    a.href = url;
    a.download = `electronics-profit-${range.from}-to-${range.to}.csv`;
    a.click();
    URL.revokeObjectURL(url);
    toast.success('CSV download ho gaya');
  };

  if (isLoading) {
    return (
      <div className="space-y-4">
        <div className="h-48 rounded-3xl bg-slate-200 animate-pulse" />
        <div className="grid grid-cols-2 lg:grid-cols-4 gap-3">
          {Array.from({ length: 4 }).map((_, i) => <div key={i} className="h-24 rounded-2xl bg-slate-200 animate-pulse" />)}
        </div>
        <div className="h-72 rounded-3xl bg-slate-200 animate-pulse" />
      </div>
    );
  }

  const noSales = (t?.salesCount ?? 0) === 0;

  return (
    <div className="space-y-5 pb-10 print:space-y-3">
      <PrintStyles orientation="portrait" title="Electronics Profit Report"
        subtitle={`${range.from} se ${range.to} tak${shopName ? ` — ${shopName}` : ''}`} />
      {showTeacher && <ProfitTeacher onClose={() => setShowTeacher(false)} />}
      {showShortcuts && <ShortcutsModal onClose={() => setShowShortcuts(false)} />}

      {/* ═══ HERO ═══ */}
      <section className="relative overflow-hidden rounded-3xl bg-gradient-to-br from-emerald-950 via-teal-800 to-cyan-600 text-white p-6 shadow-2xl print:hidden">
        <div className="absolute -top-24 -right-16 h-72 w-72 rounded-full bg-emerald-400/25 blur-3xl animate-pulse" />
        <div className="relative">
          <div className="flex items-start justify-between gap-4 flex-wrap">
            <div className="min-w-0">
              <div className="inline-flex items-center gap-2 rounded-full bg-white/15 backdrop-blur px-3 py-1 text-xs font-extrabold border border-white/20">
                <Coins className="h-3.5 w-3.5 text-amber-300" /> Profit Report
                {shopName && <><span className="opacity-40">•</span><span className="text-emerald-200">🏪 {shopName}</span></>}
              </div>
              <h1 className="mt-3 text-3xl sm:text-4xl font-extrabold leading-tight">💰 Asli Kamai Kahan Se?</h1>
              <p className="mt-2 text-sm text-white/85 font-semibold">
                Category, condition, brand aur product — har cheez ka munafa alag alag
              </p>
            </div>

            <div className="flex items-center gap-1.5 flex-wrap print:hidden">
              <button onClick={() => setShowTeacher(true)}
                className="h-11 px-3 rounded-xl bg-amber-400 hover:bg-amber-300 text-slate-900 text-xs font-extrabold inline-flex items-center gap-1.5 shadow-lg transition" title="Guide (G)">
                <GraduationCap className="h-4 w-4" /> Guide
              </button>
              <button onClick={() => setShowShortcuts(true)}
                className="h-11 w-11 rounded-xl bg-white/15 hover:bg-white/25 border border-white/25 inline-flex items-center justify-center backdrop-blur transition" title="Shortcuts (?)">
                <Keyboard className="h-4 w-4" />
              </button>
              <PrivacyToggle compact />
              <button onClick={() => refetch()} disabled={isRefetching}
                className="h-11 w-11 rounded-xl bg-white/15 hover:bg-white/25 border border-white/25 flex items-center justify-center transition disabled:opacity-50" title="Refresh (R)">
                <RefreshCw className={`h-4 w-4 ${isRefetching ? 'animate-spin' : ''}`} />
              </button>
              <button onClick={exportCsv}
                className="h-11 px-3 rounded-xl bg-white/15 hover:bg-white/25 border border-white/25 text-xs font-extrabold inline-flex items-center gap-1.5 backdrop-blur transition">
                <FileSpreadsheet className="h-4 w-4" /> CSV
              </button>
              <button onClick={() => window.print()}
                className="h-11 px-3 rounded-xl bg-white/15 hover:bg-white/25 border border-white/25 text-xs font-extrabold inline-flex items-center gap-1.5 backdrop-blur transition">
                <Printer className="h-4 w-4" /> Print
              </button>
            </div>
          </div>

          {/* Date range */}
          <div className="mt-5 flex items-center gap-1.5 flex-wrap">
            {PRESETS.map((p) => (
              <button key={p.key} onClick={() => { setPreset(p.key); setCustom(false); }}
                className={`h-9 px-3.5 rounded-xl text-xs font-extrabold transition border ${
                  !custom && preset === p.key
                    ? 'bg-white text-emerald-900 border-white shadow-lg'
                    : 'bg-white/10 border-white/25 hover:bg-white/20'
                }`}>
                {p.label}
              </button>
            ))}
            <button onClick={() => setCustom((v) => !v)}
              className={`h-9 px-3.5 rounded-xl text-xs font-extrabold inline-flex items-center gap-1.5 transition border ${
                custom ? 'bg-white text-emerald-900 border-white shadow-lg' : 'bg-white/10 border-white/25 hover:bg-white/20'
              }`}>
              <Calendar className="h-3.5 w-3.5" /> Apni Tareekh
            </button>
            {custom && (
              <div className="flex items-center gap-1.5">
                <input type="date" value={from} max={to} onChange={(e) => setFrom(e.target.value)}
                  className="h-9 rounded-xl bg-white/15 border border-white/25 px-2.5 text-xs font-bold text-white [color-scheme:dark] focus:outline-none focus:border-white" />
                <span className="text-xs font-extrabold text-white/60">se</span>
                <input type="date" value={to} min={from} max={todayIso()} onChange={(e) => setTo(e.target.value)}
                  className="h-9 rounded-xl bg-white/15 border border-white/25 px-2.5 text-xs font-bold text-white [color-scheme:dark] focus:outline-none focus:border-white" />
              </div>
            )}
          </div>

          {/* Big numbers */}
          <div className="mt-5 grid sm:grid-cols-2 lg:grid-cols-4 gap-3">
            <HeroStat label="Bikri" value={formatPKR(t?.revenue ?? 0)} icon={Receipt} sub={`${t?.salesCount ?? 0} sales`} />
            <HeroStat label="Lagat" value={hideCost ? '••••••' : formatPKR(t?.cost ?? 0)} icon={Wallet} sub={`${t?.units ?? 0} units bikay`} />
            <HeroStat label="Munafa" value={hideCost ? '••••••' : formatPKR(t?.profit ?? 0)} icon={Coins} highlight sub="bikri − lagat" />
            <HeroStat label="Margin" value={`${(t?.margin ?? 0).toFixed(1)}%`} icon={Percent}
              sub={(t?.margin ?? 0) >= 20 ? 'sehatmand 👍' : (t?.margin ?? 0) >= 10 ? 'theek hai' : 'kam hai ⚠️'} />
          </div>
        </div>
      </section>

      {noSales ? (
        <div className="rounded-3xl bg-white border-2 border-slate-200 p-12 text-center shadow-sm">
          <Receipt className="h-12 w-12 text-slate-300 mx-auto mb-3" />
          <h3 className="font-extrabold text-slate-900 text-lg">Is duration me koi sale nahi hui</h3>
          <p className="text-sm font-semibold text-slate-500 mt-1.5 max-w-md mx-auto">
            Upar se koi lamba duration chunein, ya POS se pehli sale karein — uske baad
            yahan har category aur brand ka munafa nazar aayega.
          </p>
          <Link to="/pos" className="mt-4 inline-flex items-center gap-1.5 h-11 px-5 rounded-xl bg-gradient-to-r from-emerald-600 to-teal-700 text-white text-sm font-extrabold shadow-lg hover:shadow-xl transition">
            POS kholo <ArrowRight className="h-4 w-4" />
          </Link>
        </div>
      ) : (
        <>
          {/* ═══ INSIGHT STRIP ═══ */}
          <div className="grid sm:grid-cols-3 gap-3 print:hidden">
            <InsightCard
              icon={Trophy} tone="amber" title="Sab Se Zyada Munafa"
              main={rows[0]?.label ?? '—'}
              sub={rows[0] ? `${hideCost ? '•••' : formatPKR(rows[0].profit)} · ${rows[0].margin.toFixed(1)}% margin` : ''}
            />
            <InsightCard
              icon={Barcode} tone="violet" title="Serial Wali Cheezein"
              main={`${data?.serialTracked.units ?? 0} units`}
              sub={`${formatPKR(data?.serialTracked.revenue ?? 0)} — kul bikri ka ${serialShare}%`}
            />
            <InsightCard
              icon={TrendingUp} tone="emerald" title="Behtareen Din"
              main={bestDay ? new Date(bestDay.date).toLocaleDateString('en-PK', { day: 'numeric', month: 'short' }) : '—'}
              sub={bestDay ? `${hideCost ? '•••' : formatPKR(bestDay.profit)} munafa` : ''}
            />
          </div>

          {/* ═══ DAILY TREND ═══ */}
          <div className="rounded-3xl bg-white border-2 border-slate-200 shadow-sm p-5">
            <div className="flex items-center gap-2 mb-4">
              <div className="h-9 w-9 rounded-xl bg-emerald-100 text-emerald-700 flex items-center justify-center">
                <TrendingUp className="h-5 w-5" />
              </div>
              <div>
                <h3 className="font-extrabold text-slate-900">Rozana Bikri aur Munafa</h3>
                <p className="text-[11px] font-bold text-slate-500">
                  {range.from} se {range.to} tak
                </p>
              </div>
            </div>
            <div className="h-64 w-full">
              <ResponsiveContainer width="100%" height="100%">
                <ComposedChart data={daily} margin={{ top: 4, right: 8, left: -12, bottom: 0 }}>
                  <defs>
                    <linearGradient id="elecRev" x1="0" y1="0" x2="0" y2="1">
                      <stop offset="0%" stopColor="#0891b2" stopOpacity={0.35} />
                      <stop offset="100%" stopColor="#0891b2" stopOpacity={0.02} />
                    </linearGradient>
                  </defs>
                  <CartesianGrid strokeDasharray="3 3" stroke="#e2e8f0" vertical={false} />
                  <XAxis dataKey="date" tick={{ fontSize: 10, fontWeight: 700 }} stroke="#64748b" tickLine={false} axisLine={false} minTickGap={18} />
                  <YAxis tick={{ fontSize: 10, fontWeight: 700 }} stroke="#64748b" tickLine={false} axisLine={false} width={52}
                    tickFormatter={(v) => (Math.abs(v) >= 1000 ? `${Math.round(v / 1000)}k` : String(v))} />
                  <Tooltip formatter={(v: any, n: any) => [formatPKR(Number(v)), n]}
                    contentStyle={{ borderRadius: 12, border: '2px solid #e2e8f0', fontWeight: 700, fontSize: 12 }} />
                  <Legend wrapperStyle={{ fontSize: 11, fontWeight: 800 }} />
                  <Area type="monotone" dataKey="Bikri" stroke="#0891b2" strokeWidth={2.5} fill="url(#elecRev)" />
                  <Line type="monotone" dataKey="Munafa" stroke="#059669" strokeWidth={2.5} dot={false} />
                </ComposedChart>
              </ResponsiveContainer>
            </div>
          </div>

          {/* ═══ BREAKDOWN ═══ */}
          <div className="rounded-3xl bg-white border-2 border-slate-200 shadow-sm overflow-hidden">
            <div className="p-5 border-b-2 border-slate-100 space-y-3">
              <div className="flex items-center justify-between gap-3 flex-wrap">
                <div className="flex items-center gap-2">
                  <div className="h-9 w-9 rounded-xl bg-violet-100 text-violet-700 flex items-center justify-center">
                    <Layers className="h-5 w-5" />
                  </div>
                  <div>
                    <h3 className="font-extrabold text-slate-900">{DIM_LABEL[dim]} Ke Hisab Se Munafa</h3>
                    <p className="text-[11px] font-bold text-slate-500">{rows.length} entries · zyada munafe wala upar</p>
                  </div>
                </div>
                <div className="relative print:hidden">
                  <Search className="h-4 w-4 text-slate-400 absolute left-3 top-1/2 -translate-y-1/2" />
                  <input ref={searchRef} value={search} onChange={(e) => setSearch(e.target.value)}
                    placeholder="Dhoondein... (/)"
                    className="h-10 w-full sm:w-60 rounded-xl border-2 border-slate-200 bg-white pl-9 pr-3 text-sm font-bold text-slate-900 focus:outline-none focus:border-emerald-500 transition" />
                </div>
              </div>

              <div className="flex gap-1.5 flex-wrap print:hidden">
                {([
                  { v: 'category', label: 'Category', icon: Boxes, n: data?.byCategory.length ?? 0 },
                  { v: 'condition', label: 'Condition', icon: Sparkles, n: data?.byCondition.length ?? 0 },
                  { v: 'brand', label: 'Brand', icon: Tag, n: data?.topBrands.length ?? 0 },
                  { v: 'product', label: 'Product', icon: Cpu, n: data?.topProducts.length ?? 0 },
                ] as { v: Dim; label: string; icon: any; n: number }[]).map((k, i) => (
                  <button key={k.v} onClick={() => setDim(k.v)} title={`Shortcut: ${i + 1}`}
                    className={`h-9 px-3 rounded-lg text-xs font-extrabold inline-flex items-center gap-1.5 transition border-2 ${
                      dim === k.v ? 'bg-gradient-to-r from-emerald-600 to-teal-700 text-white border-transparent shadow'
                        : 'bg-white border-slate-200 text-slate-600 hover:border-emerald-300'
                    }`}>
                    <k.icon className="h-3.5 w-3.5" /> {k.label}
                    <span className={`px-1.5 rounded-full text-[10px] tabular-nums ${dim === k.v ? 'bg-black/20' : 'bg-slate-100'}`}>{k.n}</span>
                  </button>
                ))}
              </div>
            </div>

            {rows.length === 0 ? (
              <div className="p-12 text-center">
                <Boxes className="h-10 w-10 text-slate-300 mx-auto mb-2" />
                <p className="text-sm font-bold text-slate-700">
                  {search ? 'Is naam se kuch nahi mila' : `Is duration me ${DIM_LABEL[dim].toLowerCase()} ka koi data nahi`}
                </p>
              </div>
            ) : (
              <>
                {chartRows.length > 1 && (
                  <div className="px-5 pt-5 print:hidden">
                    <div className="h-56 w-full">
                      <ResponsiveContainer width="100%" height="100%">
                        <BarChart data={chartRows} margin={{ top: 4, right: 8, left: -12, bottom: 0 }}>
                          <CartesianGrid strokeDasharray="3 3" stroke="#e2e8f0" vertical={false} />
                          <XAxis dataKey="name" tick={{ fontSize: 10, fontWeight: 700 }} stroke="#64748b" tickLine={false} axisLine={false} interval={0} angle={-12} height={44} textAnchor="end" />
                          <YAxis tick={{ fontSize: 10, fontWeight: 700 }} stroke="#64748b" tickLine={false} axisLine={false} width={52}
                            tickFormatter={(v) => (Math.abs(v) >= 1000 ? `${Math.round(v / 1000)}k` : String(v))} />
                          <Tooltip formatter={(v: any, n: any) => [formatPKR(Number(v)), n]}
                            contentStyle={{ borderRadius: 12, border: '2px solid #e2e8f0', fontWeight: 700, fontSize: 12 }} />
                          <Bar dataKey="Munafa" radius={[6, 6, 0, 0]}>
                            {chartRows.map((_, i) => <Cell key={i} fill={PALETTE[i % PALETTE.length]} />)}
                          </Bar>
                        </BarChart>
                      </ResponsiveContainer>
                    </div>
                  </div>
                )}

                <div className="divide-y divide-slate-100 mt-2">
                  {rows.map((r, i) => {
                    const share = Math.round((Math.abs(r.profit) / maxProfit) * 100);
                    const good = r.margin >= 20;
                    const bad = r.margin < 8;
                    const Row = (
                      <div className="px-4 py-3 flex items-center gap-3 hover:bg-slate-50 transition">
                        <div className="w-6 text-center text-xs font-extrabold text-slate-400 tabular-nums shrink-0">{i + 1}</div>
                        <div className="h-10 w-10 rounded-xl bg-slate-100 flex items-center justify-center text-xl shrink-0">{r.emoji}</div>
                        <div className="flex-1 min-w-0">
                          <div className="font-extrabold text-slate-900 text-sm truncate">{r.label}</div>
                          <div className="mt-0.5 flex items-center gap-2 text-[11px] font-bold text-slate-500 flex-wrap">
                            {r.sub && <span className="truncate">{r.sub}</span>}
                            <span className="tabular-nums">{r.units} units</span>
                            <span className="tabular-nums">Bikri {formatPKR(r.revenue)}</span>
                          </div>
                          <div className="mt-1.5 h-1.5 rounded-full bg-slate-100 overflow-hidden print:hidden">
                            <div className={`h-full rounded-full ${r.profit >= 0 ? 'bg-gradient-to-r from-emerald-500 to-teal-500' : 'bg-rose-500'}`}
                              style={{ width: `${share}%` }} />
                          </div>
                        </div>
                        <div className="text-right shrink-0">
                          <div className={`text-base font-extrabold tabular-nums ${r.profit >= 0 ? 'text-emerald-700' : 'text-rose-600'}`}>
                            {hideCost ? '•••••' : formatPKR(r.profit)}
                          </div>
                          <div className={`text-[10px] font-extrabold tabular-nums inline-flex items-center gap-0.5 ${
                            good ? 'text-emerald-600' : bad ? 'text-rose-600' : 'text-amber-600'
                          }`}>
                            {good ? <ArrowUpRight className="h-3 w-3" /> : bad ? <ArrowDownRight className="h-3 w-3" /> : null}
                            {r.margin.toFixed(1)}% margin
                          </div>
                        </div>
                      </div>
                    );
                    return r.link
                      ? <Link key={r.id} to={r.link} className="block">{Row}</Link>
                      : <div key={r.id}>{Row}</div>;
                  })}
                </div>
              </>
            )}
          </div>

          {/* ═══ CONDITION NOTE — electronics-specific ═══ */}
          {dim !== 'condition' && (data?.byCondition.length ?? 0) > 1 && (
            <div className="rounded-2xl bg-blue-50 border-2 border-blue-200 p-4 flex items-start gap-3 print:hidden">
              <AlertTriangle className="h-5 w-5 text-blue-600 shrink-0 mt-0.5" />
              <div className="text-sm font-semibold text-blue-900">
                Aap naya, open-box aur used — sab bech rahe hain.{' '}
                <button onClick={() => setDim('condition')} className="font-extrabold underline">
                  Condition wala tab
                </button>{' '}
                dekhein — aksar refurbished/used par margin naye maal se zyada hota hai.
              </div>
            </div>
          )}
        </>
      )}
    </div>
  );
}

/* ═════════════════════════════════════════════════════════════
   HELPERS
   ═════════════════════════════════════════════════════════════ */

function HeroStat({ label, value, sub, icon: Icon, highlight }: any) {
  return (
    <div className={`rounded-2xl backdrop-blur border p-4 ${
      highlight ? 'bg-white/25 border-white/40 shadow-lg' : 'bg-white/10 border-white/20'
    }`}>
      <div className="flex items-center gap-1.5 text-[10px] uppercase font-extrabold text-white/70 tracking-wider">
        <Icon className="h-3.5 w-3.5" /> {label}
      </div>
      <div className="mt-1 text-2xl font-extrabold tabular-nums truncate">{value}</div>
      {sub && <div className="mt-0.5 text-[11px] font-bold text-white/70 truncate">{sub}</div>}
    </div>
  );
}

const INSIGHT_TONES: Record<string, string> = {
  amber: 'from-amber-500 to-orange-600',
  violet: 'from-violet-600 to-purple-700',
  emerald: 'from-emerald-500 to-teal-600',
};

function InsightCard({ icon: Icon, tone, title, main, sub }: any) {
  return (
    <div className="rounded-2xl bg-white border-2 border-slate-200 shadow-sm p-4 flex items-center gap-3">
      <div className={`h-11 w-11 rounded-xl bg-gradient-to-br ${INSIGHT_TONES[tone]} text-white flex items-center justify-center shadow-lg shrink-0`}>
        <Icon className="h-5 w-5" />
      </div>
      <div className="min-w-0">
        <div className="text-[10px] uppercase font-extrabold text-slate-500 tracking-wider">{title}</div>
        <div className="font-extrabold text-slate-900 truncate">{main}</div>
        {sub && <div className="text-[11px] font-bold text-slate-500 truncate">{sub}</div>}
      </div>
    </div>
  );
}

function ProfitTeacher({ onClose }: { onClose: () => void }) {
  const steps = [
    {
      icon: Coins, title: 'Munafa kaise nikalta hai',
      body: 'Har sale par: bechne ka rate − khareed ka rate = munafa. Agar sale par discount diya to wo discount har item par uske hisse ke mutabiq baant diya jata hai — is liye number bilkul theek aata hai.',
      tips: ['Margin % = munafa ÷ bikri × 100', 'Lagat chupi ho to 🔒 se kholo'],
    },
    {
      icon: Sparkles, title: 'Condition wala tab sab se ahem',
      body: 'Electronics me sirf category kaafi nahi. Ek hi headphone brand-new me 12% margin de sakta hai aur open-box/refurbished me 30%. Condition tab se pata chalta hai kis halat ka maal asal me kamai deta hai.',
      tips: ['Brand New • Open Box • Refurbished • Used', 'Zyada margin wali condition ka stock barhao'],
    },
    {
      icon: Tag, title: 'Brand aur Product',
      body: 'Brand tab batata hai kaunsi company ka maal chal raha hai — supplier se rate baat karte waqt kaam aata hai. Product tab me kisi bhi row par click karke seedha uska page khul jata hai.',
      tips: ['Top par sab se zyada munafe wala', 'Search se koi bhi brand/product dhoondein'],
    },
    {
      icon: Calendar, title: 'Duration aur download',
      body: 'Upar 7 din / 30 din / 3 mahine / 1 saal ya "Apni Tareekh" se koi bhi duration chunein. CSV me poora data Excel ke liye, aur Print se saaf report nikal aati hai.',
      tips: ['1 2 3 4 dabakar tab badlein', 'P dabao to print'],
    },
  ];

  return (
    <div className="fixed inset-0 z-50 bg-black/60 backdrop-blur-sm flex items-end sm:items-center justify-center p-0 sm:p-4" onClick={onClose}>
      <div onClick={(e) => e.stopPropagation()}
        className="w-full sm:max-w-2xl bg-white rounded-t-3xl sm:rounded-3xl shadow-2xl overflow-hidden max-h-[92vh] flex flex-col">
        <div className="px-5 py-4 bg-gradient-to-r from-amber-50 to-orange-50 border-b-2 border-amber-200 flex items-center justify-between shrink-0">
          <div className="flex items-center gap-3">
            <div className="h-10 w-10 rounded-xl bg-amber-500 text-white flex items-center justify-center shadow-lg">
              <GraduationCap className="h-5 w-5" />
            </div>
            <div>
              <div className="text-[10px] uppercase tracking-wider text-amber-700 font-extrabold">Guide</div>
              <h3 className="font-extrabold text-slate-900">Profit Report Kaise Parhein?</h3>
            </div>
          </div>
          <button onClick={onClose} className="h-9 w-9 rounded-xl hover:bg-white flex items-center justify-center transition">
            <X className="h-4 w-4 text-slate-600" />
          </button>
        </div>
        <div className="flex-1 overflow-y-auto p-5 space-y-3.5">
          {steps.map((st, i) => (
            <div key={i} className="rounded-xl border-2 border-slate-200 bg-slate-50 p-3.5 flex items-start gap-3">
              <div className="h-9 w-9 rounded-xl bg-gradient-to-br from-emerald-600 to-teal-700 text-white flex items-center justify-center shrink-0 shadow-md">
                <st.icon className="h-4 w-4" />
              </div>
              <div className="min-w-0">
                <div className="font-extrabold text-slate-900">{st.title}</div>
                <div className="text-xs font-semibold text-slate-600 mt-1 leading-relaxed">{st.body}</div>
                <ul className="mt-2 space-y-1">
                  {st.tips.map((tp, j) => (
                    <li key={j} className="text-[11px] font-semibold text-slate-500 flex items-start gap-1.5">
                      <Sparkles className="h-2.5 w-2.5 text-amber-500 shrink-0 mt-0.5" /> {tp}
                    </li>
                  ))}
                </ul>
              </div>
            </div>
          ))}
        </div>
        <div className="px-5 py-3.5 border-t-2 border-slate-100 bg-slate-50 text-right shrink-0">
          <Button onClick={onClose} className="bg-gradient-to-r from-amber-500 to-orange-600 font-extrabold shadow-lg">
            <CheckCircle2 className="h-4 w-4" /> Samajh Gaya
          </Button>
        </div>
      </div>
    </div>
  );
}

function ShortcutsModal({ onClose }: { onClose: () => void }) {
  const sc = [
    ['/', 'Search par jao'], ['1 – 4', 'Category / Condition / Brand / Product'],
    ['G', 'Guide kholo'], ['R', 'Refresh'], ['P', 'Print'], ['?', 'Ye list'], ['Esc', 'Band karo'],
  ];
  return (
    <div className="fixed inset-0 z-50 bg-black/60 backdrop-blur-sm flex items-center justify-center p-4" onClick={onClose}>
      <div onClick={(e) => e.stopPropagation()}
        className="w-full max-w-md bg-white rounded-3xl shadow-2xl overflow-hidden border-2 border-slate-200">
        <div className="px-5 py-4 border-b-2 border-slate-100 flex items-center justify-between">
          <div className="flex items-center gap-2">
            <div className="h-9 w-9 rounded-xl bg-emerald-100 text-emerald-700 flex items-center justify-center">
              <Keyboard className="h-4 w-4" />
            </div>
            <h3 className="font-extrabold text-slate-900">Keyboard Shortcuts</h3>
          </div>
          <button onClick={onClose} className="h-9 w-9 rounded-xl hover:bg-slate-100 flex items-center justify-center transition">
            <X className="h-4 w-4 text-slate-600" />
          </button>
        </div>
        <div className="p-5 space-y-2">
          {sc.map(([key, desc]) => (
            <div key={key} className="flex items-center justify-between text-sm">
              <span className="font-semibold text-slate-700">{desc}</span>
              <kbd className="px-2.5 py-1 rounded-lg bg-slate-100 border-2 border-slate-200 font-mono text-xs font-extrabold text-slate-700">{key}</kbd>
            </div>
          ))}
        </div>
      </div>
    </div>
  );
}
