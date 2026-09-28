import { useMemo, useState, useEffect, useRef } from 'react';
import { Link } from 'react-router-dom';
import { useQuery } from '@tanstack/react-query';
import {
  TrendingUp, TrendingDown, Award, AlertTriangle, Search, X, RefreshCw,
  BarChart3, GraduationCap, FileSpreadsheet, Printer, DollarSign, Wheat,
  Sprout, FlaskConical, Bug, Tractor, Layers, Calculator, Star, Scale,
  Calendar, ShieldAlert, Package, ArrowRight,
} from 'lucide-react';
import {
  ResponsiveContainer, BarChart, Bar, XAxis, YAxis, Tooltip, CartesianGrid,
  PieChart, Pie, Cell, Legend,
} from 'recharts';
import { toast } from 'sonner';
import { profitReportApi, type ProfitPeriod } from '@modules/finance/profit-report/api/profit-report.api';
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
   MUNAFA — KIS CHEEZ SE KYA BAN RAHA HAI
   ─────────────────────────────────────────────────────────────
   Agri me munafa ka hisab do jagah se ghalat hota hai, aur dono
   ka ta'alluq bori se hai:

     1. THOK KI CHHOOT — farmer 20 bori leta hai to rate kam hota
        hai. Agar dukaan-daar ne product par sirf khudra rate bhara
        hai, to report kehti hai "munafa 18%" jab ke asal me 11%
        bana. Yahan thok ka rate bhi saath dikhta hai.

     2. BORI KA HISAB — ek bori urea = 50 kg. Munafa "per bori"
        bara nazar aata hai magar "per kilo" chhota hota hai.
        Do dukaan ki cheezein isi wajah se ghalat milai jati hain.
        Yahan dono dikhte hain.

   Is ke ilawa mausam ka hisab: Rabi me jo maal munafa deta hai
   zaroori nahi Kharif me bhi de.
   ═════════════════════════════════════════════════════════════ */

type Tab = 'products' | 'analytics';
type KindFilter = 'all' | 'seed' | 'fert' | 'spray' | 'feed' | 'tool';

const PERIODS: Array<[ProfitPeriod, string]> = [
  ['today', 'Aaj'], ['week', 'Hafta'], ['month', 'Mahina'],
  ['quarter', '3 mahine'], ['year', 'Saal'], ['all', 'Sab'],
];

const GRID = '#94a3b8';
const AXIS = '#64748b';
const PIE_COLORS = ['#10b981', '#84cc16', '#f59e0b', '#8b5cf6', '#3b82f6', '#ef4444', '#14b8a6', '#f97316'];
const TOOLTIP = {
  borderRadius: 12, border: '2px solid #cbd5e1', background: '#ffffff',
  color: '#0f172a', fontWeight: 700, fontSize: 12,
};

const fmtQty = (q: number) => Number(q || 0).toFixed(Number(q || 0) % 1 === 0 ? 0 : 2);

function groupOf(k: AgriKind): Exclude<KindFilter, 'all'> {
  if (isSeedKind(k)) return 'seed';
  if (isFertKind(k)) return 'fert';
  if (isSprayKind(k)) return 'spray';
  if (isFeedKind(k)) return 'feed';
  if (isToolKind(k)) return 'tool';
  return 'tool';
}

const GROUP_LABEL: Record<string, string> = {
  seed: '🌱 Beej', fert: '🧪 Khaad', spray: '🐛 Dawa', feed: '🐄 Feed', tool: '🔧 Auzaar',
};

export default function AgriProfitReportPage() {
  const tenant = useAuthStore((s) => s.tenant);
  const shopName = useAuthStore((s) => s.user?.assignedShop?.name);
  const hideCost = useCostHidden();
  const searchRef = useRef<HTMLInputElement>(null);

  const [tab, setTab] = useState<Tab>('products');
  const [period, setPeriod] = useState<ProfitPeriod>('month');
  const [search, setSearch] = useState('');
  const [kindFilter, setKindFilter] = useState<KindFilter>('all');
  const [onlyProblems, setOnlyProblems] = useState(false);
  const [perPack, setPerPack] = useState(false);
  const [showTeacher, setShowTeacher] = useState(false);

  const summaryQ = useQuery({
    queryKey: ['agri-profit-summary', period],
    queryFn: () => profitReportApi.summary({ period }),
  });
  const productsQ = useQuery({
    queryKey: ['agri-profit-products', period],
    queryFn: () => profitReportApi.byProduct({ period, sortBy: 'profit' }),
  });
  const profilesQ = useQuery({
    queryKey: ['agri-profiles-all'],
    queryFn: () => agriProductsApi.list({}).catch(() => [] as AgriProductProfile[]),
  });

  const isRefetching = summaryQ.isRefetching || productsQ.isRefetching;
  const refetchAll = () => { summaryQ.refetch(); productsQ.refetch(); profilesQ.refetch(); };

  const profileBy = useMemo(() => {
    const m = new Map<string, AgriProductProfile>();
    (profilesQ.data ?? []).forEach((p) => { if (p.productId) m.set(p.productId, p); });
    return m;
  }, [profilesQ.data]);

  const rows = useMemo(() => {
    const list = productsQ.data ?? [];
    return list.map((p) => {
      const profile = profileBy.get(p.productId);
      const kind = (profile?.category as AgriKind) ?? deriveAgriKind(p.categoryName, p.name);
      const packSizeRaw = profile?.packSize ? Number(profile.packSize) : 0;
      const packSize = packSizeRaw > 0 && !isMeasured(p.unit) ? packSizeRaw : 0;
      const profit = Number(p.profit || 0);
      const qty = Number(p.quantitySold || 0);

      /* Thok ki chhoot — agar thok rate bhara hai to us par munafa
         kya banta hai. Ye wo number hai jo report me kabhi nahi
         dikhta aur farmer 20 bori le jata hai. */
      const bulkPct = Number(profile?.bulkDiscountPct || 0);
      const cost = Number(p.avgCostPrice || 0);
      const sell = Number(p.avgSellPrice || 0);
      const bulkPrice = bulkPct > 0 ? sell * (1 - bulkPct / 100) : 0;
      const bulkMargin = bulkPrice > 0 ? ((bulkPrice - cost) / bulkPrice) * 100 : null;

      return {
        ...p,
        profile, kind, group: groupOf(kind),
        packSize,
        packUnit: profile?.packUnit ?? 'kg',
        season: profile?.season ?? null,
        /** Per-kilo munafa — bori wali cheez ka asli muqabla isi se hota hai */
        profitPerPack: packSize > 0 ? Number(p.profit || 0) / Math.max(qty * packSize, 1) : null,
        sellPerPack: packSize > 0 ? sell / packSize : null,
        qtyPack: packSize > 0 ? qty * packSize : null,
        bulkPct, bulkPrice, bulkMargin,
        /* Thok par munafa aadha se kam reh jaye to ye chhupa hua masla hai */
        bulkRisk: bulkMargin !== null && bulkMargin < Number(p.margin || 0) / 2,
        losing: profit <= 0 && qty > 0,
        noCost: cost <= 0,
        noProfile: !profile,
      };
    });
  }, [productsQ.data, profileBy]);

  const q = search.trim().toLowerCase();
  const shown = useMemo(() => {
    let out = rows;
    if (kindFilter !== 'all') out = out.filter((r) => r.group === kindFilter);
    if (onlyProblems) out = out.filter((r) => r.noCost || r.losing || r.bulkRisk);
    if (q) out = out.filter((r) =>
      r.name.toLowerCase().includes(q)
      || (r.categoryName ?? '').toLowerCase().includes(q)
      || (r.brandName ?? '').toLowerCase().includes(q)
      || (r.profile?.targetCrops ?? []).some((c: string) => c.toLowerCase().includes(q)));
    return out;
  }, [rows, kindFilter, onlyProblems, q]);

  const s = summaryQ.data;
  const money = (v: number) => (hideCost ? '••••' : formatPKR(v));

  const problems = useMemo(() => ({
    noCost: rows.filter((r) => r.noCost).length,
    losing: rows.filter((r) => r.losing).length,
    bulkRisk: rows.filter((r) => r.bulkRisk).length,
    noProfile: rows.filter((r) => r.noProfile).length,
    /* Thok par jo munafa kam hota hai — agar saara maal thok par
       bikta to kitna kam milta. Ye andaza hai, pakka nahi. */
    bulkGap: rows.reduce((acc, r) => {
      if (!r.bulkPrice) return acc;
      return acc + (Number(r.avgSellPrice || 0) - r.bulkPrice) * Number(r.quantitySold || 0);
    }, 0),
  }), [rows]);

  /* ── Charts ── */
  const topChart = useMemo(
    () => [...rows].sort((a, b) => Number(b.profit) - Number(a.profit)).slice(0, 10)
      .map((r) => ({
        name: r.name.slice(0, 14),
        munafa: Math.round(Number(r.profit)),
        bikri: Math.round(Number(r.revenue)),
      })),
    [rows],
  );

  const kindPie = useMemo(() => {
    const m = new Map<string, number>();
    rows.forEach((r) => {
      const p = Number(r.profit || 0);
      if (p <= 0) return;
      m.set(GROUP_LABEL[r.group], (m.get(GROUP_LABEL[r.group]) ?? 0) + p);
    });
    return [...m.entries()].map(([name, value]) => ({ name, value: Math.round(value) }));
  }, [rows]);

  const seasonChart = useMemo(() => {
    const m = new Map<string, { bikri: number; munafa: number }>();
    rows.forEach((r) => {
      const def = SEASONS.find((x) => x.v === r.season);
      const label = def ? `${def.e} ${def.l}` : 'Likha nahi';
      const e = m.get(label) ?? { bikri: 0, munafa: 0 };
      e.bikri += Number(r.revenue || 0);
      e.munafa += Number(r.profit || 0);
      m.set(label, e);
    });
    return [...m.entries()]
      .map(([name, v]) => ({ name, bikri: Math.round(v.bikri), munafa: Math.round(v.munafa) }))
      .filter((x) => x.bikri > 0);
  }, [rows]);

  const categoryPie = useMemo(
    () => (s?.categoryBreakdown ?? []).filter((c: any) => c.profit > 0)
      .map((c: any) => ({ name: c.name, value: Math.round(c.profit) })),
    [s],
  );

  const marginChart = useMemo(
    () => [...rows]
      .filter((r) => Number(r.quantitySold) > 0 && Number(r.margin) !== 0)
      .sort((a, b) => Number(b.margin) - Number(a.margin))
      .slice(0, 10)
      .map((r) => ({ name: r.name.slice(0, 14), margin: Number(Number(r.margin).toFixed(1)) })),
    [rows],
  );

  /* ── CSV ── */
  const exportCsv = () => {
    if (shown.length === 0) return toast.error('Koi data nahi');
    const summary = [
      [`Agri Munafa Report — ${tenant?.name || 'Nafaa'}`],
      [`Shop: ${shopName || 'All'}  •  Period: ${PERIODS.find(([v]) => v === period)?.[1]}`],
      [`Generated: ${new Date().toLocaleString('en-PK')}`],
      ...(s ? [[`Kul bikri: ${formatPKR(s.totalRevenue)}  •  Munafa: ${formatPKR(s.totalProfit)} (${s.overallMargin.toFixed(1)}%)`]] : []),
      [''],
    ];
    const head = ['Cheez', 'Qism', 'Category', 'Bika', 'Naap', 'Poora bika', 'Bikri',
      ...(hideCost ? [] : ['Lagat']), 'Munafa', 'Margin %', 'Per naap munafa',
      'Thok rate', 'Thok margin %', 'Mausam'];
    const body = shown.map((r) => [
      r.name, prettyAgriKind(r.kind), r.categoryName ?? '',
      r.quantitySold, r.unit,
      r.qtyPack ? `${fmtQty(r.qtyPack)} ${r.packUnit}` : '',
      Math.round(Number(r.revenue)),
      ...(hideCost ? [] : [Math.round(Number(r.cost))]),
      Math.round(Number(r.profit)), Number(r.margin).toFixed(1),
      r.profitPerPack !== null ? `${r.profitPerPack.toFixed(2)} / ${r.packUnit}` : '',
      r.bulkPrice ? Math.round(r.bulkPrice) : '',
      r.bulkMargin !== null ? r.bulkMargin.toFixed(1) : '',
      SEASONS.find((x) => x.v === r.season)?.l ?? '',
    ]);
    const esc = (v: any) => `"${String(v ?? '').replace(/"/g, '""')}"`;
    const csv = [...summary, head, ...body].map((x) => x.map(esc).join(',')).join('\n');
    const url = URL.createObjectURL(new Blob(['﻿' + csv], { type: 'text/csv;charset=utf-8;' }));
    const a = document.createElement('a');
    a.href = url;
    a.download = `agri-munafa-${period}-${new Date().toISOString().slice(0, 10)}.csv`;
    a.click();
    URL.revokeObjectURL(url);
    toast.success(`${shown.length} cheezein CSV me`);
  };

  const doPrint = () => window.print();

  /* ── Keyboard ── */
  useEffect(() => {
    const onKey = (e: KeyboardEvent) => {
      if (e.key === 'Escape') { if (showTeacher) setShowTeacher(false); return; }
      const t = document.activeElement?.tagName;
      if (t === 'INPUT' || t === 'TEXTAREA' || t === 'SELECT') return;
      if (e.metaKey || e.ctrlKey || e.altKey) return;
      if (e.key === '/') { e.preventDefault(); searchRef.current?.focus(); }
      const k = e.key.toLowerCase();
      if (k === 'g') setShowTeacher(true);
      if (k === 'p') doPrint();
      if (k === 'a') setTab((x) => (x === 'analytics' ? 'products' : 'analytics'));
      if (k === 'k') setPerPack((v) => !v);
    };
    window.addEventListener('keydown', onKey);
    return () => window.removeEventListener('keydown', onKey);
  }, [showTeacher]);

  const isLoading = summaryQ.isLoading || productsQ.isLoading;
  const printDate = new Date().toLocaleString('en-PK', { dateStyle: 'full', timeStyle: 'short' });
  const periodLabel = PERIODS.find(([v]) => v === period)?.[1] ?? '';

  return (
    <div className="space-y-4 sm:space-y-5 pb-10 print:space-y-3">
      {/* ═══ PRINT HEADER ═══ */}
      <div className="hidden print:block">
        <div className="flex items-center justify-between border-b-4 border-emerald-600 pb-3 mb-4">
          <div>
            <h1 className="text-2xl font-black text-slate-900">🌾 {tenant?.name || 'Agri'} — Munafa Report</h1>
            <p className="text-xs text-slate-600 font-semibold mt-1">
              {shopName ? `${shopName} • ` : ''}{periodLabel}
              {s && ` • Bikri ${formatPKR(s.totalRevenue)} • Munafa ${formatPKR(s.totalProfit)}`}
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
              <TrendingUp className="h-3.5 w-3.5 text-lime-300" /> Agri · Munafa
              {shopName && (<><span className="opacity-40">•</span><span className="text-emerald-200">🏪 {shopName}</span></>)}
            </div>
            <h1 className="mt-3 text-2xl sm:text-3xl lg:text-4xl font-black leading-tight">💰 Kis Cheez Se Kya Bana</h1>
            {s && (
              <p className="mt-1.5 text-xs sm:text-sm font-bold text-white/90">
                {periodLabel} me bikri <strong className="text-amber-200">{formatPKR(s.totalRevenue)}</strong> ·
                munafa <strong className="text-emerald-300">{money(s.totalProfit)}</strong>
                {!hideCost && <> (<strong className="text-lime-200">{s.overallMargin.toFixed(1)}%</strong>)</>}
              </p>
            )}
          </div>

          <div className="flex gap-2 flex-wrap items-center shrink-0">
            <button onClick={() => setShowTeacher(true)} title="Sikhein (G)"
              className="h-11 px-3 rounded-xl bg-amber-400/90 hover:bg-amber-400 text-slate-900 text-xs font-black inline-flex items-center gap-1.5 shadow-lg transition">
              <GraduationCap className="h-4 w-4" /> <span className="hidden sm:inline">Sikhein</span>
            </button>
            <PrivacyToggle compact />
            <button onClick={exportCsv}
              className="h-11 px-3 rounded-xl bg-white/15 hover:bg-white/25 border border-white/25 text-xs font-black inline-flex items-center gap-1.5 backdrop-blur transition">
              <FileSpreadsheet className="h-4 w-4" /> <span className="hidden sm:inline">CSV</span>
            </button>
            <button onClick={doPrint} title="Print (P)"
              className="h-11 w-11 rounded-xl bg-white/15 hover:bg-white/25 border border-white/25 flex items-center justify-center backdrop-blur transition">
              <Printer className="h-4 w-4" />
            </button>
            <button onClick={refetchAll} disabled={isRefetching} title="Taaza"
              className="h-11 w-11 rounded-xl bg-white/15 hover:bg-white/25 border border-white/25 flex items-center justify-center backdrop-blur disabled:opacity-50 transition">
              <RefreshCw className={`h-4 w-4 ${isRefetching ? 'animate-spin' : ''}`} />
            </button>
          </div>
        </div>

        {/* Period */}
        <div className="relative mt-4 flex gap-1.5 flex-wrap">
          {PERIODS.map(([v, l]) => (
            <button key={v} onClick={() => setPeriod(v)}
              className={`h-9 px-3 rounded-xl text-xs font-black transition ${
                period === v ? 'bg-white text-emerald-700 shadow-lg'
                  : 'bg-white/15 hover:bg-white/25 border border-white/25 text-white backdrop-blur'
              }`}>{l}</button>
          ))}
        </div>
      </section>

      {/* ═══ KPI ═══ */}
      {s && (
        <section className="grid grid-cols-2 lg:grid-cols-4 gap-3 print:hidden">
          <Kpi icon={DollarSign} label="Kul bikri" value={formatPKR(s.totalRevenue)}
            sub={`${s.totalOrders} orders · ${fmtQty(s.totalQtySold)} cheezein`} tone="lime" />
          <Kpi icon={TrendingUp} label="Kul munafa" value={money(s.totalProfit)}
            sub={hideCost ? '🔒 PIN se dekho' : `${s.overallMargin.toFixed(1)}% margin`} tone="emerald" />
          <Kpi icon={Calculator} label="Lagat" value={money(s.totalCost)}
            sub={`${s.productsCount} cheezein bikin`} tone="amber" />
          <Kpi icon={AlertTriangle} label="Masle" value={problems.noCost + problems.losing + problems.bulkRisk}
            sub={`${problems.losing} par nuqsaan · ${problems.noCost} bina cost`} tone="rose"
            onClick={() => { setTab('products'); setOnlyProblems(true); }} active={onlyProblems} />
        </section>
      )}

      {/* ═══ THOK KA MASLA — agri ka apna ═══ */}
      {problems.bulkRisk > 0 && (
        <section className="rounded-3xl bg-gradient-to-br from-amber-50 to-orange-50 dark:from-amber-500/10 dark:to-orange-500/10 border-2 border-amber-300 dark:border-amber-500/40 p-4 flex items-start gap-3 flex-wrap print:hidden">
          <div className="h-10 w-10 rounded-xl bg-gradient-to-br from-amber-500 to-orange-600 text-white flex items-center justify-center shadow-md shrink-0">
            <Scale className="h-5 w-5" />
          </div>
          <div className="flex-1 min-w-[200px]">
            <h3 className="font-extrabold text-amber-900 dark:text-amber-200 text-sm">
              ⚠️ {problems.bulkRisk} cheezon par thok ki chhoot munafa aadha kar deti hai
            </h3>
            <p className="text-[11px] font-bold text-amber-800 dark:text-amber-300 mt-0.5">
              Ye report khudra rate par bani hai. Jab farmer 20 bori leta hai aur chhoot lagti
              hai, to asal munafa yahan dikhne wale se bohat kam reh jata hai. Neeche har cheez
              par thok wala margin alag dikhaya gaya hai — jahan wo aadhe se kam hai wahan
              nishan laga hai.
            </p>
          </div>
          <button onClick={() => { setTab('products'); setOnlyProblems(true); }}
            className="px-3 py-2 rounded-xl bg-amber-600 hover:bg-amber-700 text-white text-xs font-extrabold shrink-0 transition active:scale-[0.97]">
            Dekhein →
          </button>
        </section>
      )}

      {/* ═══ TABS ═══ */}
      <div className="grid grid-cols-2 gap-2 sm:gap-3 print:hidden">
        {([
          ['products', 'Cheez ke hisab se', Package, shown.length],
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

      {isLoading ? (
        <div className="flex items-center justify-center py-24">
          <div className="h-12 w-12 rounded-full border-4 border-emerald-200 border-t-emerald-600 animate-spin" />
        </div>
      ) : tab === 'analytics' ? (
        <Analytics
          s={s} rows={rows} hideCost={hideCost} money={money} problems={problems}
          topChart={topChart} kindPie={kindPie} seasonChart={seasonChart}
          categoryPie={categoryPie} marginChart={marginChart} />
      ) : (
        <>
          {/* ═══ TOOLBAR ═══ */}
          <section className="rounded-3xl bg-white dark:bg-slate-900 border-2 border-slate-200 dark:border-slate-800 shadow-sm p-3 sm:p-4 space-y-3 print:hidden">
            <div className="relative">
              <Search className="h-5 w-5 text-slate-400 absolute left-3.5 top-1/2 -translate-y-1/2 pointer-events-none" />
              <input ref={searchRef} value={search} onChange={(e) => setSearch(e.target.value)}
                placeholder="Naam, category, brand, fasal… (/ dabao)"
                className="h-12 w-full rounded-2xl border-2 border-slate-200 dark:border-slate-700 bg-white dark:bg-slate-800 pl-11 pr-10 text-sm font-bold text-slate-900 dark:text-white placeholder:text-slate-400 focus:outline-none focus:border-emerald-500 transition" />
              {search && (
                <button onClick={() => setSearch('')}
                  className="absolute right-3 top-1/2 -translate-y-1/2 h-7 w-7 rounded-lg hover:bg-slate-100 dark:hover:bg-slate-700 flex items-center justify-center">
                  <X className="h-4 w-4 text-slate-400" />
                </button>
              )}
            </div>

            <div className="flex gap-1.5 flex-wrap items-center">
              {([
                ['all', `Sab (${rows.length})`, Package],
                ['seed', GROUP_LABEL.seed, Sprout],
                ['fert', GROUP_LABEL.fert, FlaskConical],
                ['spray', GROUP_LABEL.spray, Bug],
                ['feed', GROUP_LABEL.feed, Wheat],
                ['tool', GROUP_LABEL.tool, Tractor],
              ] as const).map(([v, label, Icon]) => (
                <button key={v} onClick={() => setKindFilter(v as KindFilter)}
                  className={`h-10 px-3 rounded-xl border-2 text-[11px] font-black inline-flex items-center gap-1.5 transition ${
                    kindFilter === v ? 'border-emerald-500 bg-emerald-50 dark:bg-emerald-500/15 text-emerald-700 dark:text-emerald-300'
                      : 'border-slate-200 dark:border-slate-700 bg-white dark:bg-slate-800 text-slate-600 dark:text-slate-300 hover:border-emerald-400'
                  }`}>
                  <Icon className="h-3.5 w-3.5" /> {label}
                </button>
              ))}

              <button onClick={() => setPerPack((v) => !v)} title="Per kilo / per bori (K)"
                className={`h-10 px-3 rounded-xl border-2 text-[11px] font-black inline-flex items-center gap-1.5 transition ${
                  perPack ? 'border-lime-500 bg-lime-50 dark:bg-lime-500/15 text-lime-700 dark:text-lime-300'
                    : 'border-slate-200 dark:border-slate-700 bg-white dark:bg-slate-800 text-slate-600 dark:text-slate-300 hover:border-lime-400'
                }`}>
                <Scale className="h-3.5 w-3.5" /> {perPack ? 'Per kilo' : 'Per bori'}
              </button>

              <button onClick={() => setOnlyProblems((v) => !v)}
                className={`h-10 px-3 rounded-xl border-2 text-[11px] font-black inline-flex items-center gap-1.5 transition ${
                  onlyProblems ? 'border-rose-500 bg-rose-50 dark:bg-rose-500/15 text-rose-700 dark:text-rose-300'
                    : 'border-slate-200 dark:border-slate-700 bg-white dark:bg-slate-800 text-slate-600 dark:text-slate-300 hover:border-rose-400'
                }`}>
                <AlertTriangle className="h-3.5 w-3.5" /> Sirf masle
              </button>

              <div className="ml-auto text-xs font-extrabold text-slate-500 dark:text-slate-400 tabular-nums">
                {shown.length} cheezein
              </div>
            </div>
          </section>

          {shown.length === 0 ? (
            <Empty onlyProblems={onlyProblems} onClear={() => { setOnlyProblems(false); setSearch(''); setKindFilter('all'); }} />
          ) : (
            <ProfitTable rows={shown} hideCost={hideCost} perPack={perPack} />
          )}
        </>
      )}

      {showTeacher && <Teacher onClose={() => setShowTeacher(false)} />}

      <style>{`
        @media print {
          @page { size: A4 landscape; margin: 10mm 8mm; }
          html, body { background: white !important; color: #0f172a !important;
            print-color-adjust: exact !important; -webkit-print-color-adjust: exact !important; }
          .dark body, .dark { background: white !important; color: #0f172a !important; }
          .print\\:hidden { display: none !important; }
          .print\\:block { display: block !important; }
          section, div { box-shadow: none !important; }
          .overflow-x-auto, .overflow-y-auto, .overflow-hidden { overflow: visible !important; }
          [class*="fixed"] { display: none !important; }
          html, body, #root { height: auto !important; overflow: visible !important; }
          table { font-size: 9px !important; border-collapse: collapse !important; width: 100% !important; }
          thead { display: table-header-group !important; }
          thead th { background: #059669 !important; color: white !important; padding: 5px 4px !important; border: 1px solid #047857 !important; }
          tbody tr { page-break-inside: avoid !important; }
          tbody td { padding: 5px 4px !important; border: 1px solid #e2e8f0 !important; color: #0f172a !important; }
          .avoid-break { page-break-inside: avoid !important; }
          [data-sonner-toaster] { display: none !important; }
        }
      `}</style>
    </div>
  );
}

/* ═════════════════════════════════════════════════════════════
   TABLE — har cheez ka munafa
   ═════════════════════════════════════════════════════════════ */
function ProfitTable({ rows, hideCost, perPack }: { rows: any[]; hideCost: boolean; perPack: boolean }) {
  return (
    <section className="rounded-3xl bg-white dark:bg-slate-900 border-2 border-slate-200 dark:border-slate-800 shadow-sm overflow-hidden print:border-0 print:shadow-none">
      <div className="overflow-x-auto">
        <table className="w-full text-sm">
          <thead className="bg-slate-50 dark:bg-slate-800/60 border-b-2 border-slate-200 dark:border-slate-700">
            <tr>
              <Th>Cheez</Th>
              <Th>Qism</Th>
              <Th className="text-right">Bika</Th>
              <Th className="text-right">Bikri</Th>
              {!hideCost && <Th className="text-right">Lagat</Th>}
              <Th className="text-right">Munafa</Th>
              <Th className="text-right">{perPack ? 'Per kilo munafa' : 'Margin'}</Th>
              <Th className="text-right">Thok par</Th>
              <Th className="text-center">Halat</Th>
            </tr>
          </thead>
          <tbody className="divide-y divide-slate-100 dark:divide-slate-800">
            {rows.map((r) => {
              const profit = Number(r.profit || 0);
              const bad = r.losing || r.noCost;
              return (
                <tr key={r.productId}
                  className={`transition avoid-break ${
                    r.losing ? 'bg-rose-50/60 dark:bg-rose-500/5'
                      : r.bulkRisk ? 'bg-amber-50/50 dark:bg-amber-500/5'
                      : 'hover:bg-emerald-50/40 dark:hover:bg-emerald-500/5'
                  }`}>
                  <td className="px-3 py-2.5">
                    <Link to={`/agri-products/${r.productId}`} className="group flex items-center gap-2.5">
                      <span className="h-9 w-9 rounded-xl bg-slate-100 dark:bg-slate-800 flex items-center justify-center text-lg shrink-0">
                        {AGRI_KIND_EMOJI[r.kind as AgriKind]}
                      </span>
                      <span className="min-w-0">
                        <span className="block font-extrabold text-slate-900 dark:text-white text-sm truncate group-hover:text-emerald-600">
                          {r.name}
                        </span>
                        <span className="block text-[10px] font-bold text-slate-400 truncate">
                          {r.categoryName || '—'}
                          {r.packSize ? ` · 1 ${agriUnitLabel(r.unit)} = ${r.packSize} ${r.packUnit}` : ''}
                        </span>
                      </span>
                    </Link>
                  </td>
                  <td className="px-3 py-2.5">
                    <span className="text-[10px] font-black uppercase px-1.5 py-0.5 rounded-md bg-slate-100 dark:bg-slate-800 text-slate-600 dark:text-slate-300">
                      {prettyAgriKind(r.kind)}
                    </span>
                  </td>
                  <td className="px-3 py-2.5 text-right">
                    <div className="font-extrabold text-slate-900 dark:text-white tabular-nums">
                      {fmtQty(Number(r.quantitySold))} <span className="text-[10px] font-bold text-slate-500">{agriUnitLabel(r.unit)}</span>
                    </div>
                    {r.qtyPack !== null && (
                      <div className="text-[10px] font-bold text-slate-400 tabular-nums">
                        = {fmtQty(r.qtyPack)} {r.packUnit}
                      </div>
                    )}
                  </td>
                  <td className="px-3 py-2.5 text-right font-extrabold text-slate-900 dark:text-white tabular-nums">
                    {formatPKR(Number(r.revenue))}
                  </td>
                  {!hideCost && (
                    <td className="px-3 py-2.5 text-right text-xs font-bold text-slate-600 dark:text-slate-300 tabular-nums">
                      {formatPKR(Number(r.cost))}
                    </td>
                  )}
                  <td className={`px-3 py-2.5 text-right font-black tabular-nums ${
                    profit > 0 ? 'text-emerald-700 dark:text-emerald-400' : 'text-rose-700 dark:text-rose-400'
                  }`}>
                    {hideCost ? '••••' : formatPKR(profit)}
                  </td>
                  <td className="px-3 py-2.5 text-right">
                    {perPack ? (
                      r.profitPerPack !== null ? (
                        <div className="font-extrabold text-lime-700 dark:text-lime-400 tabular-nums">
                          {hideCost ? '••••' : `${formatPKR(r.profitPerPack)}`}
                          <span className="text-[10px] font-bold text-slate-500"> / {r.packUnit}</span>
                        </div>
                      ) : <span className="text-[10px] font-bold text-slate-400">—</span>
                    ) : (
                      <div className={`font-extrabold tabular-nums ${
                        Number(r.margin) > 20 ? 'text-emerald-700 dark:text-emerald-400'
                          : Number(r.margin) > 0 ? 'text-amber-700 dark:text-amber-400'
                          : 'text-rose-700 dark:text-rose-400'
                      }`}>
                        {hideCost ? '••••' : `${Number(r.margin).toFixed(1)}%`}
                      </div>
                    )}
                  </td>
                  <td className="px-3 py-2.5 text-right">
                    {r.bulkPrice > 0 ? (
                      <>
                        <div className="font-extrabold text-slate-700 dark:text-slate-200 tabular-nums text-xs">
                          {formatPKR(r.bulkPrice)}
                        </div>
                        <div className={`text-[10px] font-black tabular-nums ${
                          r.bulkRisk ? 'text-amber-600 dark:text-amber-400' : 'text-slate-400'
                        }`}>
                          {hideCost ? '••••' : `${(r.bulkMargin ?? 0).toFixed(1)}% margin`}
                        </div>
                      </>
                    ) : <span className="text-[10px] font-bold text-slate-400">—</span>}
                  </td>
                  <td className="px-3 py-2.5 text-center">
                    <div className="inline-flex flex-col gap-1 items-center">
                      {r.losing && <Pill tone="rose">Nuqsaan</Pill>}
                      {r.noCost && <Pill tone="amber">Cost nahi</Pill>}
                      {r.bulkRisk && <Pill tone="amber">Thok me kam</Pill>}
                      {!bad && !r.bulkRisk && <Pill tone="emerald">Theek</Pill>}
                    </div>
                  </td>
                </tr>
              );
            })}
          </tbody>
        </table>
      </div>
    </section>
  );
}

/* ═════════════════════════════════════════════════════════════
   ANALYTICS
   ═════════════════════════════════════════════════════════════ */
function Analytics({ s, rows, hideCost, money, problems, topChart, kindPie, seasonChart, categoryPie, marginChart }: any) {
  const best = useMemo(
    () => [...rows].filter((r: any) => Number(r.profit) > 0)
      .sort((a: any, b: any) => Number(b.profit) - Number(a.profit)).slice(0, 5),
    [rows],
  );
  const worst = useMemo(
    () => [...rows].filter((r: any) => Number(r.quantitySold) > 0)
      .sort((a: any, b: any) => Number(a.profit) - Number(b.profit)).slice(0, 5),
    [rows],
  );

  return (
    <div className="space-y-4">
      {(problems.noCost > 0 || problems.losing > 0 || problems.bulkRisk > 0 || problems.noProfile > 0) && (
        <section className="rounded-3xl bg-amber-50 dark:bg-amber-500/10 border-2 border-amber-200 dark:border-amber-500/30 p-4 space-y-1.5">
          <div className="flex items-center gap-2">
            <AlertTriangle className="h-4 w-4 text-amber-600" />
            <h3 className="font-black text-amber-900 dark:text-amber-200">Ye report poori sahi nahi hogi jab tak</h3>
          </div>
          {problems.noCost > 0 && (
            <p className="text-[12px] font-bold text-amber-900 dark:text-amber-200">
              • <strong>{problems.noCost}</strong> cheezon ki cost bhari hi nahi — un ka munafa poora
              rate dikh raha hai, jo sach nahi.
            </p>
          )}
          {problems.losing > 0 && (
            <p className="text-[12px] font-bold text-amber-900 dark:text-amber-200">
              • <strong>{problems.losing}</strong> cheezein nuqsaan par bik rahi hain — rate ya cost
              me se koi ek ghalat hai.
            </p>
          )}
          {problems.bulkRisk > 0 && (
            <p className="text-[12px] font-bold text-amber-900 dark:text-amber-200">
              • <strong>{problems.bulkRisk}</strong> cheezon par thok ki chhoot munafa aadha kar deti hai.
              {!hideCost && problems.bulkGap > 0 && (
                <> Agar saara maal thok par bikta to takreeban <strong>{formatPKR(problems.bulkGap)}</strong> kam milta.</>
              )}
            </p>
          )}
          {problems.noProfile > 0 && (
            <p className="text-[12px] font-bold text-amber-900 dark:text-amber-200">
              • <strong>{problems.noProfile}</strong> cheezein bina agri tafseel ke hain — un ka thok
              aur mausam ka hisab nahi ho raha.
            </p>
          )}
        </section>
      )}

      <div className="grid lg:grid-cols-2 gap-4">
        <ChartCard icon={Award} title="Sab se zyada munafa kis se" wide>
          {hideCost ? <EmptyBox text="🔒 Cost chhupi hai — PIN se kholein" />
            : topChart.length > 0 ? (
              <ResponsiveContainer width="100%" height="100%">
                <BarChart data={topChart}>
                  <CartesianGrid strokeDasharray="3 3" stroke={GRID} vertical={false} />
                  <XAxis dataKey="name" stroke={AXIS} fontSize={10} fontWeight={700} interval={0} angle={-20} textAnchor="end" height={60} />
                  <YAxis stroke={AXIS} fontSize={11} width={78} tickFormatter={(v) => Number(v).toLocaleString('en-PK')} />
                  <Tooltip contentStyle={TOOLTIP} formatter={(v: any, n: any) => [formatPKR(Number(v)), n === 'munafa' ? 'Munafa' : 'Bikri']} />
                  <Legend formatter={(v) => (v === 'munafa' ? 'Munafa' : 'Bikri')} />
                  <Bar dataKey="bikri" fill="#84cc16" radius={[6, 6, 0, 0]} />
                  <Bar dataKey="munafa" fill="#10b981" radius={[6, 6, 0, 0]} />
                </BarChart>
              </ResponsiveContainer>
            ) : <EmptyBox text="Is muddat me koi bikri nahi" />}
        </ChartCard>

        <ChartCard icon={Layers} title="Kis qism se kitna munafa">
          {hideCost ? <EmptyBox text="🔒 Cost chhupi hai — PIN se kholein" />
            : kindPie.length > 0 ? (
              <ResponsiveContainer width="100%" height="100%">
                <PieChart>
                  <Pie data={kindPie} dataKey="value" nameKey="name" innerRadius={55} outerRadius={90} paddingAngle={3}>
                    {kindPie.map((_: any, i: number) => <Cell key={i} fill={PIE_COLORS[i % PIE_COLORS.length]} />)}
                  </Pie>
                  <Tooltip contentStyle={TOOLTIP} formatter={(v: any) => formatPKR(Number(v))} />
                  <Legend />
                </PieChart>
              </ResponsiveContainer>
            ) : <EmptyBox text="Abhi dikhane ko kuch nahi" />}
        </ChartCard>

        <ChartCard icon={Calendar} title="Kis mausam me kitna bana">
          {seasonChart.length > 0 ? (
            <ResponsiveContainer width="100%" height="100%">
              <BarChart data={seasonChart}>
                <CartesianGrid strokeDasharray="3 3" stroke={GRID} vertical={false} />
                <XAxis dataKey="name" stroke={AXIS} fontSize={10} fontWeight={700} />
                <YAxis stroke={AXIS} fontSize={11} width={70} tickFormatter={(v) => Number(v).toLocaleString('en-PK')} />
                <Tooltip contentStyle={TOOLTIP} formatter={(v: any, n: any) => [formatPKR(Number(v)), n === 'munafa' ? 'Munafa' : 'Bikri']} />
                <Legend formatter={(v) => (v === 'munafa' ? 'Munafa' : 'Bikri')} />
                <Bar dataKey="bikri" fill="#84cc16" radius={[6, 6, 0, 0]} />
                <Bar dataKey="munafa" fill="#10b981" radius={[6, 6, 0, 0]} />
              </BarChart>
            </ResponsiveContainer>
          ) : <EmptyBox text="Mausam likha hi nahi gaya" />}
        </ChartCard>

        <ChartCard icon={TrendingUp} title="Sab se behtar margin">
          {hideCost ? <EmptyBox text="🔒 Cost chhupi hai — PIN se kholein" />
            : marginChart.length > 0 ? (
              <ResponsiveContainer width="100%" height="100%">
                <BarChart data={marginChart} layout="vertical">
                  <CartesianGrid strokeDasharray="3 3" stroke={GRID} horizontal={false} />
                  <XAxis type="number" stroke={AXIS} fontSize={11} tickFormatter={(v) => `${v}%`} />
                  <YAxis type="category" dataKey="name" stroke={AXIS} fontSize={10} fontWeight={700} width={95} />
                  <Tooltip contentStyle={TOOLTIP} formatter={(v: any) => [`${v}%`, 'Margin']} />
                  <Bar dataKey="margin" radius={[0, 6, 6, 0]}>
                    {marginChart.map((x: any, i: number) => (
                      <Cell key={i} fill={x.margin > 0 ? PIE_COLORS[i % PIE_COLORS.length] : '#ef4444'} />
                    ))}
                  </Bar>
                </BarChart>
              </ResponsiveContainer>
            ) : <EmptyBox text="Abhi dikhane ko kuch nahi" />}
        </ChartCard>

        <ChartCard icon={Layers} title="Category me munafa">
          {hideCost ? <EmptyBox text="🔒 Cost chhupi hai — PIN se kholein" />
            : categoryPie.length > 0 ? (
              <ResponsiveContainer width="100%" height="100%">
                <PieChart>
                  <Pie data={categoryPie} dataKey="value" nameKey="name" innerRadius={55} outerRadius={90} paddingAngle={3}>
                    {categoryPie.map((_: any, i: number) => <Cell key={i} fill={PIE_COLORS[i % PIE_COLORS.length]} />)}
                  </Pie>
                  <Tooltip contentStyle={TOOLTIP} formatter={(v: any) => formatPKR(Number(v))} />
                  <Legend />
                </PieChart>
              </ResponsiveContainer>
            ) : <EmptyBox text="Abhi dikhane ko kuch nahi" />}
        </ChartCard>
      </div>

      {!hideCost && (
        <div className="grid lg:grid-cols-2 gap-4">
          <ListCard icon={Star} tone="emerald" title="Sab se zyada munafa" rows={best} />
          <ListCard icon={TrendingDown} tone="rose" title="Sab se kam munafa" rows={worst} />
        </div>
      )}

      {s && (
        <section className="rounded-3xl bg-white dark:bg-slate-900 border-2 border-slate-200 dark:border-slate-800 shadow-sm p-5">
          <h3 className="font-black text-slate-900 dark:text-white mb-3 flex items-center gap-2">
            <Calculator className="h-4 w-4 text-emerald-600" /> Kul hisab
          </h3>
          <div className="grid sm:grid-cols-2 lg:grid-cols-4 gap-3">
            <Box label="Kul bikri" value={formatPKR(s.totalRevenue)} tone="lime" />
            <Box label="Kul lagat" value={money(s.totalCost)} tone="amber" />
            <Box label="Kul munafa" value={money(s.totalProfit)} tone="emerald" />
            <Box label="Margin" value={hideCost ? '••••' : `${s.overallMargin.toFixed(1)}%`} tone="emerald" />
          </div>
          <div className="mt-3 grid sm:grid-cols-3 gap-3">
            <Box label="Orders" value={String(s.totalOrders)} tone="slate" />
            <Box label="Kul cheezein bikin" value={fmtQty(s.totalQtySold)} tone="slate" />
            <Box label="Wapas aayin" value={String(s.totalReturns)} tone="slate" />
          </div>
        </section>
      )}
    </div>
  );
}

function ListCard({ icon: Icon, tone, title, rows }: any) {
  const head = tone === 'emerald'
    ? 'text-emerald-600' : 'text-rose-600';
  return (
    <section className="rounded-3xl bg-white dark:bg-slate-900 border-2 border-slate-200 dark:border-slate-800 shadow-sm overflow-hidden">
      <div className="px-4 py-3 border-b-2 border-slate-100 dark:border-slate-800 flex items-center gap-2">
        <Icon className={`h-4 w-4 ${head}`} />
        <h3 className="font-black text-slate-900 dark:text-white">{title}</h3>
      </div>
      {rows.length === 0 ? (
        <div className="p-8 text-center text-sm font-bold text-slate-400">Abhi kuch nahi</div>
      ) : (
        <div className="divide-y divide-slate-100 dark:divide-slate-800">
          {rows.map((r: any, i: number) => (
            <div key={r.productId} className="p-3 flex items-center gap-3">
              <span className="h-8 w-8 rounded-xl bg-slate-100 dark:bg-slate-800 flex items-center justify-center text-xs font-black text-slate-500 shrink-0">
                {i + 1}
              </span>
              <Link to={`/agri-products/${r.productId}`} className="min-w-0 flex-1 hover:text-emerald-600">
                <span className="block font-extrabold text-sm text-slate-900 dark:text-white truncate">{r.name}</span>
                <span className="block text-[11px] font-bold text-slate-400 tabular-nums">
                  {fmtQty(Number(r.quantitySold))} {agriUnitLabel(r.unit)} bika · {Number(r.margin).toFixed(1)}% margin
                </span>
              </Link>
              <span className={`text-sm font-black tabular-nums shrink-0 ${
                Number(r.profit) > 0 ? 'text-emerald-700 dark:text-emerald-400' : 'text-rose-700 dark:text-rose-400'
              }`}>{formatPKR(Number(r.profit))}</span>
            </div>
          ))}
        </div>
      )}
    </section>
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

function Box({ label, value, tone }: any) {
  const tones: Record<string, string> = {
    emerald: 'bg-emerald-50 dark:bg-emerald-500/10 border-emerald-200 dark:border-emerald-500/30 text-emerald-900 dark:text-emerald-200',
    lime: 'bg-lime-50 dark:bg-lime-500/10 border-lime-200 dark:border-lime-500/30 text-lime-900 dark:text-lime-200',
    amber: 'bg-amber-50 dark:bg-amber-500/10 border-amber-200 dark:border-amber-500/30 text-amber-900 dark:text-amber-200',
    slate: 'bg-slate-50 dark:bg-slate-800 border-slate-200 dark:border-slate-700 text-slate-900 dark:text-white',
  };
  return (
    <div className={`rounded-2xl border-2 p-3 ${tones[tone] ?? tones.slate}`}>
      <div className="text-[10px] font-black uppercase tracking-widest opacity-70">{label}</div>
      <div className="mt-0.5 text-lg font-black tabular-nums break-words">{value}</div>
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

function Th({ children, className = '' }: any) {
  return <th className={`px-3 py-3 text-left text-[10px] font-extrabold uppercase tracking-wider text-slate-700 dark:text-slate-300 ${className}`}>{children}</th>;
}

function Pill({ tone, children }: any) {
  const tones: Record<string, string> = {
    emerald: 'bg-emerald-100 dark:bg-emerald-500/20 text-emerald-700 dark:text-emerald-300',
    amber: 'bg-amber-100 dark:bg-amber-500/20 text-amber-700 dark:text-amber-300',
    rose: 'bg-rose-100 dark:bg-rose-500/20 text-rose-700 dark:text-rose-300',
  };
  return <span className={`px-2 py-0.5 rounded-full text-[10px] font-extrabold whitespace-nowrap ${tones[tone]}`}>{children}</span>;
}

function Empty({ onlyProblems, onClear }: { onlyProblems: boolean; onClear: () => void }) {
  return (
    <section className="rounded-3xl bg-white dark:bg-slate-900 border-2 border-dashed border-slate-300 dark:border-slate-700 p-10 sm:p-16 text-center">
      <div className="mx-auto h-20 w-20 rounded-3xl bg-gradient-to-br from-emerald-500 to-lime-700 flex items-center justify-center shadow-lg shadow-emerald-500/40">
        {onlyProblems ? <Award className="h-10 w-10 text-white" /> : <TrendingUp className="h-10 w-10 text-white" />}
      </div>
      <h3 className="mt-4 text-lg font-extrabold text-slate-900 dark:text-white">
        {onlyProblems ? 'Koi masla nahi mila' : 'Is muddat me koi bikri nahi'}
      </h3>
      <p className="text-sm text-slate-500 dark:text-slate-400 mt-1.5 font-semibold max-w-md mx-auto">
        {onlyProblems
          ? 'Sab cheezon ki cost bhari hui hai, koi nuqsaan par nahi bik rahi, aur thok ki chhoot bhi theek hai.'
          : 'Ooper se koi doosri muddat chun kar dekhein.'}
      </p>
      <div className="mt-5">
        <Button variant="secondary" onClick={onClear}><X className="h-4 w-4" /> Chaant hatao</Button>
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
            <GraduationCap className="h-5 w-5" /> Ye report kya batati hai
          </h3>
          <button onClick={onClose} className="h-9 w-9 rounded-lg hover:bg-white dark:hover:bg-slate-800 flex items-center justify-center transition">
            <X className="h-4 w-4 text-slate-600 dark:text-slate-300" />
          </button>
        </div>
        <div className="p-5 space-y-3 text-sm">
          <p className="font-bold text-slate-700 dark:text-slate-200">
            Sirf "kitna bika" nahi — <strong>kis cheez se kitna bacha.</strong>
          </p>
          <Tip icon={Scale} title="Thok par munafa — sab se ahem">
            Ye report khudra rate par banti hai. Farmer 20 bori le to chhoot lagti hai aur munafa
            bohat kam reh jata hai. Har cheez par thok wala rate aur us par margin alag dikhaya
            gaya hai. Jahan wo aadhe se kam hai, wahan <strong>"Thok me kam"</strong> ka nishan
            lagta hai — un ka rate dobara sochna chahiye.
          </Tip>
          <Tip icon={Calculator} title="Per bori ya per kilo">
            "Per bori" ka button dabayein to munafa <strong>per kilo</strong> ban jata hai.
            Ek bori urea par munafa bara lagta hai, magar 50 kg par taqseem karein to asal
            tasveer nazar aati hai. Do alag cheezon ka muqabla isi tarah hota hai.
          </Tip>
          <Tip icon={Calendar} title="Mausam ka hisab">
            Rabi me jo cheez munafa deti hai, zaroori nahi Kharif me bhi de. Analytics me
            mausam ka chart ye farq dikha deta hai — agle season ki kharidari isi se tay karein.
          </Tip>
          <Tip icon={AlertTriangle} title="Cost bhari hi nahi?">
            Jis cheez ki cost 0 hai, us ka munafa poora rate dikhta hai — jo sach nahi. "Sirf
            masle" ka button dabayein to sirf wohi cheezein saamne aa jayengi.
          </Tip>
          <Tip icon={Layers} title="Qism ke hisab se">
            Beej, khaad, dawa, feed, auzaar — kis se sab se zyada bacha. Aksar dawa ka margin
            khaad se kayi guna zyada hota hai; ye chart wohi batata hai.
          </Tip>
          <div className="rounded-2xl bg-slate-50 dark:bg-slate-800 p-3">
            <div className="text-[10px] font-black uppercase tracking-widest text-slate-500 mb-2">Shortcuts</div>
            <div className="grid grid-cols-2 gap-1.5 text-[11px] font-bold text-slate-600 dark:text-slate-300">
              <div><kbd className="px-1.5 py-0.5 rounded bg-white dark:bg-slate-900 border">/</kbd> dhoondo</div>
              <div><kbd className="px-1.5 py-0.5 rounded bg-white dark:bg-slate-900 border">K</kbd> per kilo / bori</div>
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
