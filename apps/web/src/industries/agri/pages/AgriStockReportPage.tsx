import { useMemo, useState, useEffect, useRef } from 'react';
import { Link } from 'react-router-dom';
import { useQuery } from '@tanstack/react-query';
import {
  Boxes, Search, X, RefreshCw, AlertTriangle, CheckCircle2, Wheat,
  BarChart3, GraduationCap, FileSpreadsheet, Printer, Sprout, FlaskConical,
  Bug, Tractor, Layers, DollarSign, TrendingUp, Package, ShieldAlert,
  Calendar, Scale, Leaf, Landmark, ArrowRight,
} from 'lucide-react';
import {
  ResponsiveContainer, BarChart, Bar, XAxis, YAxis, Tooltip, CartesianGrid,
  PieChart, Pie, Cell, Legend,
} from 'recharts';
import { toast } from 'sonner';
import { stockReportApi } from '@modules/inventory/stock-report/api/stock-report.api';
import { formatPKR } from '@core/lib/format';
import { Button } from '@core/ui/Button';
import { useAuthStore } from '@core/stores/auth.store';
import { PrivacyToggle, useCostHidden } from '@/core/security/HiddenValue';
import { agriProductsApi, type AgriProductProfile } from '../api/products.api';
import { certStatus, isMeasured, agriUnitLabel, SEASONS } from '../lib/agriUnits';
import {
  deriveAgriKind, prettyAgriKind, AGRI_KIND_EMOJI, needsGovtReg,
  isSeedKind, isFertKind, isSprayKind, isFeedKind, isToolKind, type AgriKind,
} from '../lib/agriCategory';

/* ═════════════════════════════════════════════════════════════
   STOCK REPORT — AGRI KA POORA PAISA
   ─────────────────────────────────────────────────────────────
   Aam stock report sirf ye batati hai ke kitna maal para hai aur
   us ki lagat kya hai. Agri wale ko do aur jawab chahiye jo kisi
   aur industry me nahi bante:

     1. WO PAISA JO BIK HI NAHI SAKTA — jis beej ya dawa ki sarkari
        registration khatam ho chuki, uska stock gudaam me hone ke
        bawajood qanooni tor par bik nahi sakta. Wo alag ginna
        parta hai, warna "kitna maal hai" ka jawab jhoota hai.

     2. MAUSAM KE HISAB SE PAISA — Rabi ka maal Kharif me para rahe
        to wo saal bhar ka phansa paisa hai. Season ke hisab se
        taqseem kiye baghair ye nazar nahi aata.

   Is ke ilawa bori/kilo dono me hisab — kyunke dukaan-daar bori
   ginta hai aur farmer kilo maangta hai.
   ═════════════════════════════════════════════════════════════ */

type Tab = 'list' | 'analytics';
type Status = 'all' | 'ok' | 'low' | 'out';
type KindFilter = 'all' | 'seed' | 'fert' | 'spray' | 'feed' | 'tool';
type CertFilter = 'all' | 'blocked' | 'soon' | 'missing';

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

export default function AgriStockReportPage() {
  const tenant = useAuthStore((s) => s.tenant);
  const shopName = useAuthStore((s) => s.user?.assignedShop?.name);
  const hideCost = useCostHidden();
  const searchRef = useRef<HTMLInputElement>(null);

  const [tab, setTab] = useState<Tab>('list');
  const [status, setStatus] = useState<Status>('all');
  const [kindFilter, setKindFilter] = useState<KindFilter>('all');
  const [certFilter, setCertFilter] = useState<CertFilter>('all');
  const [season, setSeason] = useState('all');
  const [search, setSearch] = useState('');
  const [showTeacher, setShowTeacher] = useState(false);

  const stockQ = useQuery({
    queryKey: ['agri-stock-report'],
    queryFn: () => stockReportApi.generate({ stockStatus: 'all', isActive: true }),
  });
  const profilesQ = useQuery({
    queryKey: ['agri-profiles-all'],
    queryFn: () => agriProductsApi.list({}).catch(() => [] as AgriProductProfile[]),
  });

  const isLoading = stockQ.isLoading || profilesQ.isLoading;
  const isRefetching = stockQ.isRefetching || profilesQ.isRefetching;
  const refetchAll = () => { stockQ.refetch(); profilesQ.refetch(); };

  const profileBy = useMemo(() => {
    const m = new Map<string, AgriProductProfile>();
    (profilesQ.data ?? []).forEach((p) => { if (p.productId) m.set(p.productId, p); });
    return m;
  }, [profilesQ.data]);

  /** Har row + agri tafseel */
  const rows = useMemo(() => {
    const list = stockQ.data?.rows ?? [];
    return list.map((r) => {
      const profile = profileBy.get(r.productId);
      const kind = (profile?.category as AgriKind) ?? deriveAgriKind(r.category, r.productName);
      const packSize = profile?.packSize ? Number(profile.packSize) : 0;
      const cert = certStatus(profile?.govtRegExpiry);
      const regulated = needsGovtReg(kind);
      const stockValue = Number(r.stockValue || 0);
      const retailValue = Number(r.retailValue || 0);
      return {
        ...r,
        profile, kind, group: groupOf(kind),
        cert, regulated,
        /* Registration khatam = ye paisa abhi bik hi nahi sakta */
        blocked: regulated && cert.state === 'expired',
        packSize: packSize > 0 && !isMeasured(r.unit) ? packSize : 0,
        packUnit: profile?.packUnit ?? 'kg',
        season: profile?.season ?? null,
        stockValue, retailValue,
        isOut: r.stockStatus === 'OUT_OF_STOCK',
        isLow: r.stockStatus === 'LOW_STOCK',
      };
    });
  }, [stockQ.data, profileBy]);

  /* ── Chaant ── */
  const q = search.trim().toLowerCase();
  const shown = useMemo(() => {
    let out = rows;
    if (kindFilter !== 'all') out = out.filter((r) => r.group === kindFilter);
    if (status === 'low') out = out.filter((r) => r.isLow);
    if (status === 'out') out = out.filter((r) => r.isOut);
    if (status === 'ok') out = out.filter((r) => !r.isLow && !r.isOut);
    if (certFilter !== 'all') {
      out = out.filter((r) => {
        if (!r.regulated) return false;
        if (certFilter === 'blocked') return r.cert.state === 'expired';
        if (certFilter === 'soon') return r.cert.state === 'soon';
        return r.cert.state === 'none';
      });
    }
    if (season !== 'all') out = out.filter((r) => r.season === season);
    if (q) out = out.filter((r) =>
      (r.productName || '').toLowerCase().includes(q) ||
      (r.category || '').toLowerCase().includes(q) ||
      (r.sku || '').toLowerCase().includes(q) ||
      (r.brand || '').toLowerCase().includes(q) ||
      (r.profile?.targetCrops ?? []).some((c: string) => c.toLowerCase().includes(q)));
    return [...out].sort((a, b) => b.stockValue - a.stockValue);
  }, [rows, kindFilter, status, certFilter, season, q]);

  const hasFilters = !!search || kindFilter !== 'all' || status !== 'all' || certFilter !== 'all' || season !== 'all';
  const clearFilters = () => {
    setSearch(''); setKindFilter('all'); setStatus('all'); setCertFilter('all'); setSeason('all');
  };

  /* ── Stats ── */
  const stats = useMemo(() => {
    const byGroup = (g: string) => rows.filter((r) => r.group === g).reduce((s, r) => s + r.stockValue, 0);
    const cost = rows.reduce((s, r) => s + r.stockValue, 0);
    const retail = rows.reduce((s, r) => s + r.retailValue, 0);
    const blockedRows = rows.filter((r) => r.blocked);
    return {
      count: rows.length,
      cost, retail, potential: retail - cost,
      margin: retail > 0 ? ((retail - cost) / retail) * 100 : 0,
      seed: byGroup('seed'), fert: byGroup('fert'), spray: byGroup('spray'),
      feed: byGroup('feed'), tool: byGroup('tool'),
      out: rows.filter((r) => r.isOut).length,
      low: rows.filter((r) => r.isLow).length,
      blockedCount: blockedRows.length,
      blockedCost: blockedRows.reduce((s, r) => s + r.stockValue, 0),
      blockedRetail: blockedRows.reduce((s, r) => s + r.retailValue, 0),
      soonCount: rows.filter((r) => r.regulated && r.cert.state === 'soon').length,
      soonCost: rows.filter((r) => r.regulated && r.cert.state === 'soon').reduce((s, r) => s + r.stockValue, 0),
      noPack: rows.filter((r) => r.profile && !isMeasured(r.unit) && r.unit !== 'pcs' && !r.packSize).length,
      noCost: rows.filter((r) => Number(r.costPrice || 0) <= 0).length,
      noProfile: rows.filter((r) => !r.profile).length,
    };
  }, [rows]);

  const money = (v: number) => (hideCost ? '••••' : formatPKR(v));

  /* ── Charts ── */
  const kindPie = useMemo(() => ([
    { name: '🌱 Beej', value: Math.round(stats.seed) },
    { name: '🧪 Khaad', value: Math.round(stats.fert) },
    { name: '🐛 Dawa', value: Math.round(stats.spray) },
    { name: '🐄 Feed', value: Math.round(stats.feed) },
    { name: '🔧 Auzaar', value: Math.round(stats.tool) },
  ].filter((x) => x.value > 0)), [stats]);

  const topValue = useMemo(
    () => [...rows].sort((a, b) => b.stockValue - a.stockValue).slice(0, 10)
      .map((r) => ({
        name: (r.productName || '').slice(0, 14),
        lagat: Math.round(r.stockValue),
        bikri: Math.round(r.retailValue),
      })),
    [rows],
  );

  const seasonChart = useMemo(() => {
    const m = new Map<string, number>();
    rows.forEach((r) => {
      const s = SEASONS.find((x) => x.v === r.season);
      const label = s ? `${s.e} ${s.l}` : 'Likha nahi';
      m.set(label, (m.get(label) ?? 0) + r.stockValue);
    });
    return [...m.entries()]
      .map(([name, value]) => ({ name, value: Math.round(value) }))
      .filter((x) => x.value > 0);
  }, [rows]);

  const healthPie = useMemo(() => ([
    { name: 'Theek hai', value: rows.length - stats.out - stats.low, color: '#10b981' },
    { name: 'Kam ho gaya', value: stats.low, color: '#f59e0b' },
    { name: 'Khatam', value: stats.out, color: '#ef4444' },
  ].filter((x) => x.value > 0)), [rows, stats]);

  const certPie = useMemo(() => {
    const reg = rows.filter((r) => r.regulated);
    return [
      { name: 'Bik sakta hai', value: Math.round(reg.filter((r) => r.cert.state === 'ok').reduce((s, r) => s + r.stockValue, 0)), color: '#10b981' },
      { name: 'Jald khatam', value: Math.round(stats.soonCost), color: '#f59e0b' },
      { name: 'Bik nahi sakta', value: Math.round(stats.blockedCost), color: '#ef4444' },
      { name: 'Tareekh nahi likhi', value: Math.round(reg.filter((r) => r.cert.state === 'none').reduce((s, r) => s + r.stockValue, 0)), color: '#94a3b8' },
    ].filter((x) => x.value > 0);
  }, [rows, stats]);

  const categoryChart = useMemo(() => {
    const m = new Map<string, number>();
    rows.forEach((r) => {
      const c = r.category || 'Bina category';
      m.set(c, (m.get(c) ?? 0) + r.stockValue);
    });
    return [...m.entries()]
      .map(([name, value]) => ({ name: name.slice(0, 16), value: Math.round(value) }))
      .sort((a, b) => b.value - a.value)
      .slice(0, 8);
  }, [rows]);

  /* ── CSV ── */
  const exportCsv = () => {
    if (shown.length === 0) return toast.error('Koi data nahi');
    const summary = [
      [`Agri Stock Report — ${tenant?.name || 'Nafaa'}`],
      [`Shop: ${shopName || 'All'}  •  Generated: ${new Date().toLocaleString('en-PK')}`],
      [`Kul lagat: ${formatPKR(stats.cost)}  •  Bikri par: ${formatPKR(stats.retail)}`],
      [`Registration ki wajah se ruka hua: ${formatPKR(stats.blockedCost)}`],
      [''],
    ];
    const head = ['Cheez', 'Qism', 'Category', 'Brand', 'Stock', 'Naap', '1 me kitna', 'Poora stock',
      ...(hideCost ? [] : ['Cost', 'Stock ki lagat']), 'Rate', 'Bikri par', 'Halat',
      'Registration', 'Mausam', 'Fasal'];
    const body = shown.map((r) => [
      r.productName, prettyAgriKind(r.kind), r.category || '', r.brand || '',
      r.stock, r.unit,
      r.packSize ? `${r.packSize} ${r.packUnit}` : '',
      r.packSize ? `${fmtQty(Number(r.stock) * r.packSize)} ${r.packUnit}` : '',
      ...(hideCost ? [] : [Number(r.costPrice || 0).toFixed(2), Math.round(r.stockValue)]),
      Number(r.salePrice || 0).toFixed(2), Math.round(r.retailValue),
      r.isOut ? 'Khatam' : r.isLow ? 'Kam' : 'Theek',
      !r.regulated ? '—' : r.cert.state === 'expired' ? 'Khatam' : r.cert.state === 'soon' ? `${r.cert.days} din` : r.cert.state === 'ok' ? 'OK' : 'Nahi likhi',
      SEASONS.find((s) => s.v === r.season)?.l ?? '',
      (r.profile?.targetCrops ?? []).join(' / '),
    ]);
    const esc = (v: any) => `"${String(v ?? '').replace(/"/g, '""')}"`;
    const csv = [...summary, head, ...body].map((x) => x.map(esc).join(',')).join('\n');
    const url = URL.createObjectURL(new Blob(['﻿' + csv], { type: 'text/csv;charset=utf-8;' }));
    const a = document.createElement('a');
    a.href = url;
    a.download = `agri-stock-report-${new Date().toISOString().slice(0, 10)}.csv`;
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
      if (k === 'a') setTab((x) => (x === 'analytics' ? 'list' : 'analytics'));
    };
    window.addEventListener('keydown', onKey);
    return () => window.removeEventListener('keydown', onKey);
  }, [showTeacher]);

  const printDate = new Date().toLocaleString('en-PK', { dateStyle: 'full', timeStyle: 'short' });

  return (
    <div className="space-y-4 sm:space-y-5 pb-10 print:space-y-3">
      {/* ═══ PRINT HEADER ═══ */}
      <div className="hidden print:block">
        <div className="flex items-center justify-between border-b-4 border-emerald-600 pb-3 mb-4">
          <div>
            <h1 className="text-2xl font-black text-slate-900">🌾 {tenant?.name || 'Agri'} — Stock Report</h1>
            <p className="text-xs text-slate-600 font-semibold mt-1">
              {shopName ? `${shopName} • ` : ''}{shown.length} cheezein
              {!hideCost && ` • Lagat ${formatPKR(stats.cost)} • Bikri par ${formatPKR(stats.retail)}`}
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
              <Boxes className="h-3.5 w-3.5 text-lime-300" /> Agri · Stock Report
              {shopName && (<><span className="opacity-40">•</span><span className="text-emerald-200">🏪 {shopName}</span></>)}
            </div>
            <h1 className="mt-3 text-2xl sm:text-3xl lg:text-4xl font-black leading-tight">📦 Gudaam Me Kitna Paisa</h1>
            <p className="mt-1.5 text-xs sm:text-sm font-bold text-white/90">
              <strong className="text-lime-200">{stats.count}</strong> cheezein ·{' '}
              {!hideCost && <>lagat <strong className="text-emerald-300">{formatPKR(stats.cost)}</strong> · </>}
              sab bik jaye to <strong className="text-amber-200">{formatPKR(stats.retail)}</strong>
            </p>
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
      </section>

      {/* ═══ RUKA HUA PAISA — agri ka apna sawal ═══ */}
      {stats.blockedCount > 0 && (
        <section className="rounded-3xl bg-gradient-to-br from-rose-50 to-red-50 dark:from-rose-500/10 dark:to-red-500/10 border-2 border-rose-300 dark:border-rose-500/40 p-4 flex items-start gap-3 flex-wrap print:hidden">
          <div className="h-10 w-10 rounded-xl bg-gradient-to-br from-rose-600 to-red-700 text-white flex items-center justify-center shadow-md shrink-0">
            <ShieldAlert className="h-5 w-5" />
          </div>
          <div className="flex-1 min-w-[200px]">
            <h3 className="font-extrabold text-rose-900 dark:text-rose-200 text-sm">
              🚫 {money(stats.blockedCost)} ka maal abhi bik hi nahi sakta
            </h3>
            <p className="text-[11px] font-bold text-rose-700 dark:text-rose-300 mt-0.5">
              {stats.blockedCount} cheezon ki sarkari registration khatam ho chuki. Gudaam me para
              hai, bikri par {formatPKR(stats.blockedRetail)} banta hai — magar qanooni tor par
              bech nahi sakte. Ooper ki "kul lagat" me ye paisa shaamil hai, is liye asal me
              bikne wala maal <strong>{money(stats.cost - stats.blockedCost)}</strong> ka hai.
            </p>
          </div>
          <button onClick={() => { setTab('list'); setCertFilter('blocked'); }}
            className="px-3 py-2 rounded-xl bg-rose-600 hover:bg-rose-700 text-white text-xs font-extrabold shrink-0 transition active:scale-[0.97]">
            Dekhein →
          </button>
        </section>
      )}

      {/* ═══ KPI ═══ */}
      <section className="grid grid-cols-2 lg:grid-cols-4 gap-3 print:hidden">
        <Kpi icon={DollarSign} label="Stock ki lagat" value={money(stats.cost)}
          sub={`${stats.count} cheezein`} tone="emerald" />
        <Kpi icon={TrendingUp} label="Sab bik jaye to" value={formatPKR(stats.retail)}
          sub={hideCost ? '🔒 PIN se dekho' : `munafa ${formatPKR(stats.potential)} (${stats.margin.toFixed(1)}%)`}
          tone="lime" />
        <Kpi icon={AlertTriangle} label="Kam / khatam" value={stats.low + stats.out}
          sub={`${stats.out} bilkul khatam`} tone="amber"
          onClick={() => { setTab('list'); setStatus('low'); }} active={status === 'low'} />
        <Kpi icon={ShieldAlert} label="Ruka hua paisa" value={money(stats.blockedCost)}
          sub={stats.blockedCount > 0 ? `${stats.blockedCount} cheezein bik nahi saktin` : 'Sab bik sakta hai'}
          tone="rose" onClick={() => { setTab('list'); setCertFilter('blocked'); }} active={certFilter === 'blocked'} />
      </section>

      {/* ═══ QISM KE HISAB SE PAISA ═══ */}
      <section className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-5 gap-2 sm:gap-3 print:hidden">
        <MiniStat icon={Sprout} label="🌱 Beej" value={money(stats.seed)} active={kindFilter === 'seed'}
          onClick={() => { setTab('list'); setKindFilter(kindFilter === 'seed' ? 'all' : 'seed'); }} />
        <MiniStat icon={FlaskConical} label="🧪 Khaad" value={money(stats.fert)} active={kindFilter === 'fert'}
          onClick={() => { setTab('list'); setKindFilter(kindFilter === 'fert' ? 'all' : 'fert'); }} />
        <MiniStat icon={Bug} label="🐛 Dawa" value={money(stats.spray)} active={kindFilter === 'spray'}
          onClick={() => { setTab('list'); setKindFilter(kindFilter === 'spray' ? 'all' : 'spray'); }} />
        <MiniStat icon={Wheat} label="🐄 Feed" value={money(stats.feed)} active={kindFilter === 'feed'}
          onClick={() => { setTab('list'); setKindFilter(kindFilter === 'feed' ? 'all' : 'feed'); }} />
        <MiniStat icon={Tractor} label="🔧 Auzaar" value={money(stats.tool)} active={kindFilter === 'tool'}
          onClick={() => { setTab('list'); setKindFilter(kindFilter === 'tool' ? 'all' : 'tool'); }} />
      </section>

      {/* ═══ TABS ═══ */}
      <div className="grid grid-cols-2 gap-2 sm:gap-3 print:hidden">
        {([
          ['list', 'Poori list', Package, shown.length],
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
          stats={stats} money={money} hideCost={hideCost}
          kindPie={kindPie} topValue={topValue} seasonChart={seasonChart}
          healthPie={healthPie} certPie={certPie} categoryChart={categoryChart} rows={rows}
        />
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

            <div className="flex gap-2 flex-wrap items-center">
              <Segmented value={status} onChange={setStatus} activeCls="bg-emerald-600 text-white"
                options={[
                  { v: 'all', l: 'Sab' }, { v: 'ok', l: 'Theek' },
                  { v: 'low', l: 'Kam', c: stats.low }, { v: 'out', l: 'Khatam', c: stats.out },
                ]} />

              <select value={certFilter} onChange={(e) => setCertFilter(e.target.value as CertFilter)} className={sel}>
                <option value="all">Registration — sab</option>
                <option value="blocked">Bik nahi sakta ({stats.blockedCount})</option>
                <option value="soon">Jald khatam ({stats.soonCount})</option>
                <option value="missing">Tareekh nahi likhi</option>
              </select>

              <select value={season} onChange={(e) => setSeason(e.target.value)} className={sel}>
                <option value="all">Har mausam</option>
                {SEASONS.map((s) => <option key={s.v} value={s.v}>{s.e} {s.l}</option>)}
              </select>

              {hasFilters && (
                <button onClick={clearFilters}
                  className="text-xs font-extrabold text-rose-600 dark:text-rose-400 hover:text-rose-700 inline-flex items-center gap-1 transition">
                  <X className="h-3 w-3" /> Chaant hatao
                </button>
              )}
              <div className="ml-auto text-xs font-extrabold text-slate-500 dark:text-slate-400 tabular-nums">
                {shown.length} cheezein · {money(shown.reduce((s, r) => s + r.stockValue, 0))}
              </div>
            </div>
          </section>

          {shown.length === 0 ? (
            <Empty hasFilters={hasFilters} onClear={clearFilters} />
          ) : (
            <StockTable rows={shown} hideCost={hideCost} />
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
   TABLE
   ═════════════════════════════════════════════════════════════ */
function StockTable({ rows, hideCost }: { rows: any[]; hideCost: boolean }) {
  return (
    <section className="rounded-3xl bg-white dark:bg-slate-900 border-2 border-slate-200 dark:border-slate-800 shadow-sm overflow-hidden print:border-0 print:shadow-none">
      <div className="overflow-x-auto">
        <table className="w-full text-sm">
          <thead className="bg-slate-50 dark:bg-slate-800/60 border-b-2 border-slate-200 dark:border-slate-700">
            <tr>
              <Th>Cheez</Th>
              <Th>Qism</Th>
              <Th className="text-right">Stock</Th>
              <Th className="text-right">Poora stock</Th>
              {!hideCost && <Th className="text-right">Cost</Th>}
              {!hideCost && <Th className="text-right">Lagat</Th>}
              <Th className="text-right">Rate</Th>
              <Th className="text-right">Bikri par</Th>
              <Th className="text-center">Registration</Th>
              <Th className="text-center">Halat</Th>
            </tr>
          </thead>
          <tbody className="divide-y divide-slate-100 dark:divide-slate-800">
            {rows.map((r) => (
              <tr key={r.productId}
                className={`transition avoid-break ${
                  r.blocked ? 'bg-rose-50/60 dark:bg-rose-500/5' : 'hover:bg-emerald-50/40 dark:hover:bg-emerald-500/5'
                }`}>
                <td className="px-3 py-2.5">
                  <Link to={`/agri-products/${r.productId}`} className="group flex items-center gap-2.5">
                    <span className="h-9 w-9 rounded-xl bg-slate-100 dark:bg-slate-800 flex items-center justify-center text-lg shrink-0">
                      {AGRI_KIND_EMOJI[r.kind as AgriKind]}
                    </span>
                    <span className="min-w-0">
                      <span className="block font-extrabold text-slate-900 dark:text-white text-sm truncate group-hover:text-emerald-600">
                        {r.productName}
                      </span>
                      <span className="block text-[10px] font-bold text-slate-400 truncate">
                        {r.category || '—'}{r.brand ? ` · ${r.brand}` : ''}
                        {r.season && ` · ${SEASONS.find((s) => s.v === r.season)?.e ?? ''}`}
                      </span>
                    </span>
                  </Link>
                </td>
                <td className="px-3 py-2.5">
                  <span className="text-[10px] font-black uppercase px-1.5 py-0.5 rounded-md bg-slate-100 dark:bg-slate-800 text-slate-600 dark:text-slate-300">
                    {prettyAgriKind(r.kind)}
                  </span>
                </td>
                <td className="px-3 py-2.5 text-right font-extrabold text-slate-900 dark:text-white tabular-nums">
                  {fmtQty(Number(r.stock))} <span className="text-[10px] font-bold text-slate-500">{agriUnitLabel(r.unit)}</span>
                </td>
                <td className="px-3 py-2.5 text-right text-xs font-bold text-slate-500 tabular-nums">
                  {r.packSize ? `${fmtQty(Number(r.stock) * r.packSize)} ${r.packUnit}` : '—'}
                </td>
                {!hideCost && <td className="px-3 py-2.5 text-right text-xs font-bold text-slate-600 dark:text-slate-300 tabular-nums">{formatPKR(r.costPrice || 0)}</td>}
                {!hideCost && <td className="px-3 py-2.5 text-right font-black text-slate-900 dark:text-white tabular-nums">{formatPKR(r.stockValue)}</td>}
                <td className="px-3 py-2.5 text-right text-xs font-bold text-emerald-700 dark:text-emerald-400 tabular-nums">{formatPKR(r.salePrice || 0)}</td>
                <td className="px-3 py-2.5 text-right font-extrabold text-emerald-700 dark:text-emerald-400 tabular-nums">{formatPKR(r.retailValue)}</td>
                <td className="px-3 py-2.5 text-center">
                  {!r.regulated ? <span className="text-[10px] text-slate-400 font-bold">—</span>
                    : r.cert.state === 'expired' ? <Pill tone="rose">Bik nahi sakta</Pill>
                    : r.cert.state === 'soon' ? <Pill tone="amber">{r.cert.days} din</Pill>
                    : r.cert.state === 'ok' ? <Pill tone="emerald">OK</Pill>
                    : <Pill tone="slate">Nahi likhi</Pill>}
                </td>
                <td className="px-3 py-2.5 text-center">
                  {r.isOut ? <Pill tone="rose">Khatam</Pill>
                    : r.isLow ? <Pill tone="amber">Kam</Pill>
                    : <Pill tone="emerald">Theek</Pill>}
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </section>
  );
}

/* ═════════════════════════════════════════════════════════════
   ANALYTICS
   ═════════════════════════════════════════════════════════════ */
function Analytics({ stats, money, hideCost, kindPie, topValue, seasonChart, healthPie, certPie, categoryChart, rows }: any) {
  const topList = useMemo(
    () => [...rows].sort((a: any, b: any) => b.stockValue - a.stockValue).slice(0, 5),
    [rows],
  );

  return (
    <div className="space-y-4">
      {(stats.noCost > 0 || stats.noPack > 0 || stats.noProfile > 0) && (
        <section className="rounded-3xl bg-amber-50 dark:bg-amber-500/10 border-2 border-amber-200 dark:border-amber-500/30 p-4 space-y-1.5">
          <div className="flex items-center gap-2">
            <AlertTriangle className="h-4 w-4 text-amber-600" />
            <h3 className="font-black text-amber-900 dark:text-amber-200">Ye report poori sahi nahi hogi jab tak</h3>
          </div>
          {stats.noCost > 0 && (
            <p className="text-[12px] font-bold text-amber-900 dark:text-amber-200">
              • <strong>{stats.noCost}</strong> cheezon ki cost 0 hai — un ki "lagat" 0 gini ja rahi hai,
              is liye kul lagat asal se kam dikh rahi hai.
            </p>
          )}
          {stats.noPack > 0 && (
            <p className="text-[12px] font-bold text-amber-900 dark:text-amber-200">
              • <strong>{stats.noPack}</strong> cheezon par "1 bori me kitna hai" likha nahi — un ka
              kilo wala hisab nahi ban raha.
            </p>
          )}
          {stats.noProfile > 0 && (
            <p className="text-[12px] font-bold text-amber-900 dark:text-amber-200">
              • <strong>{stats.noProfile}</strong> cheezein bina agri tafseel ke hain — un ka mausam
              aur registration ka hisab nahi ho raha.
            </p>
          )}
        </section>
      )}

      <div className="grid lg:grid-cols-2 gap-4">
        <ChartCard icon={Layers} title="Kis qism me kitna paisa">
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

        <ChartCard icon={ShieldAlert} title="Registration ke hisab se paisa">
          {hideCost ? <EmptyBox text="🔒 Cost chhupi hai — PIN se kholein" />
            : certPie.length > 0 ? (
              <ResponsiveContainer width="100%" height="100%">
                <PieChart>
                  <Pie data={certPie} dataKey="value" nameKey="name" innerRadius={55} outerRadius={90} paddingAngle={3}>
                    {certPie.map((x: any, i: number) => <Cell key={i} fill={x.color} />)}
                  </Pie>
                  <Tooltip contentStyle={TOOLTIP} formatter={(v: any) => formatPKR(Number(v))} />
                  <Legend />
                </PieChart>
              </ResponsiveContainer>
            ) : <EmptyBox text="Koi registration wali cheez nahi" />}
        </ChartCard>

        <ChartCard icon={DollarSign} title="Sab se zyada paisa kis me phansa hai" wide>
          {hideCost ? <EmptyBox text="🔒 Cost chhupi hai — PIN se kholein" />
            : topValue.length > 0 ? (
              <ResponsiveContainer width="100%" height="100%">
                <BarChart data={topValue}>
                  <CartesianGrid strokeDasharray="3 3" stroke={GRID} vertical={false} />
                  <XAxis dataKey="name" stroke={AXIS} fontSize={10} fontWeight={700} interval={0} angle={-20} textAnchor="end" height={60} />
                  <YAxis stroke={AXIS} fontSize={11} width={78} tickFormatter={(v) => Number(v).toLocaleString('en-PK')} />
                  <Tooltip contentStyle={TOOLTIP} formatter={(v: any, n: any) => [formatPKR(Number(v)), n === 'lagat' ? 'Lagat' : 'Bikri par']} />
                  <Legend formatter={(v) => (v === 'lagat' ? 'Lagat' : 'Bikri par')} />
                  <Bar dataKey="lagat" fill="#84cc16" radius={[6, 6, 0, 0]} />
                  <Bar dataKey="bikri" fill="#10b981" radius={[6, 6, 0, 0]} />
                </BarChart>
              </ResponsiveContainer>
            ) : <EmptyBox text="Abhi dikhane ko kuch nahi" />}
        </ChartCard>

        <ChartCard icon={Calendar} title="Kis mausam ka kitna maal">
          {hideCost ? <EmptyBox text="🔒 Cost chhupi hai — PIN se kholein" />
            : seasonChart.length > 0 ? (
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

        <ChartCard icon={CheckCircle2} title="Stock ki halat">
          {healthPie.length > 0 ? (
            <ResponsiveContainer width="100%" height="100%">
              <PieChart>
                <Pie data={healthPie} dataKey="value" nameKey="name" innerRadius={55} outerRadius={90} paddingAngle={3}>
                  {healthPie.map((x: any, i: number) => <Cell key={i} fill={x.color} />)}
                </Pie>
                <Tooltip contentStyle={TOOLTIP} />
                <Legend />
              </PieChart>
            </ResponsiveContainer>
          ) : <EmptyBox text="Abhi dikhane ko kuch nahi" />}
        </ChartCard>

        <ChartCard icon={Layers} title="Category me kitna paisa">
          {hideCost ? <EmptyBox text="🔒 Cost chhupi hai — PIN se kholein" />
            : categoryChart.length > 0 ? (
              <ResponsiveContainer width="100%" height="100%">
                <BarChart data={categoryChart} layout="vertical">
                  <CartesianGrid strokeDasharray="3 3" stroke={GRID} horizontal={false} />
                  <XAxis type="number" stroke={AXIS} fontSize={11} tickFormatter={(v) => Number(v).toLocaleString('en-PK')} />
                  <YAxis type="category" dataKey="name" stroke={AXIS} fontSize={10} fontWeight={700} width={100} />
                  <Tooltip contentStyle={TOOLTIP} formatter={(v: any) => [formatPKR(Number(v)), 'Lagat']} />
                  <Bar dataKey="value" radius={[0, 6, 6, 0]}>
                    {categoryChart.map((_: any, i: number) => <Cell key={i} fill={PIE_COLORS[i % PIE_COLORS.length]} />)}
                  </Bar>
                </BarChart>
              </ResponsiveContainer>
            ) : <EmptyBox text="Abhi dikhane ko kuch nahi" />}
        </ChartCard>
      </div>

      {!hideCost && (
        <section className="rounded-3xl bg-white dark:bg-slate-900 border-2 border-slate-200 dark:border-slate-800 shadow-sm overflow-hidden">
          <div className="px-4 py-3 border-b-2 border-slate-100 dark:border-slate-800 flex items-center gap-2">
            <Boxes className="h-4 w-4 text-emerald-600" />
            <h3 className="font-black text-slate-900 dark:text-white">Sab se qeemti stock</h3>
          </div>
          <div className="divide-y divide-slate-100 dark:divide-slate-800">
            {topList.map((r: any, i: number) => (
              <div key={r.productId} className="p-3 flex items-center gap-3">
                <span className="h-8 w-8 rounded-xl bg-slate-100 dark:bg-slate-800 flex items-center justify-center text-xs font-black text-slate-500 shrink-0">{i + 1}</span>
                <Link to={`/agri-products/${r.productId}`} className="min-w-0 flex-1 hover:text-emerald-600">
                  <span className="block font-extrabold text-sm text-slate-900 dark:text-white truncate">{r.productName}</span>
                  <span className="block text-[11px] font-bold text-slate-400 tabular-nums">
                    {fmtQty(Number(r.stock))} {agriUnitLabel(r.unit)}
                    {r.packSize ? ` = ${fmtQty(Number(r.stock) * r.packSize)} ${r.packUnit}` : ''}
                  </span>
                </Link>
                {r.blocked && <Pill tone="rose">Bik nahi sakta</Pill>}
                <span className="text-sm font-black tabular-nums text-slate-900 dark:text-white shrink-0">{money(r.stockValue)}</span>
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
const sel = 'h-11 rounded-xl border-2 border-slate-200 dark:border-slate-700 bg-white dark:bg-slate-800 px-3 text-xs font-bold text-slate-900 dark:text-white focus:outline-none focus:border-emerald-500 transition';

function Segmented<T extends string>({ value, onChange, options, activeCls }: {
  value: T; onChange: (v: T) => void; activeCls: string;
  options: Array<{ v: T; l: string; c?: number }>;
}) {
  return (
    <div className="flex gap-1 bg-slate-100 dark:bg-slate-800 rounded-xl p-1">
      {options.map((o) => {
        const on = value === o.v;
        return (
          <button key={o.v} onClick={() => onChange(o.v)}
            className={`px-3 py-2 rounded-lg text-xs font-extrabold transition active:scale-[0.97] ${
              on ? `${activeCls} shadow-sm` : 'text-slate-600 dark:text-slate-400 hover:text-slate-900 dark:hover:text-white'
            }`}>
            {o.l}
            {o.c != null && <span className={`ml-1 tabular-nums ${on ? 'opacity-70' : 'text-slate-400 dark:text-slate-500'}`}>{o.c}</span>}
          </button>
        );
      })}
    </div>
  );
}

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

function MiniStat({ icon: Icon, label, value, onClick, active }: any) {
  return (
    <button onClick={onClick}
      className={`rounded-2xl border-2 p-3 text-left transition active:scale-[0.98] ${
        active ? 'border-emerald-500 bg-emerald-50 dark:bg-emerald-500/10 ring-2 ring-emerald-200 dark:ring-emerald-500/20'
          : 'border-slate-200 dark:border-slate-800 bg-white dark:bg-slate-900 hover:border-emerald-400'
      }`}>
      <div className="flex items-center gap-1.5">
        <Icon className="h-3.5 w-3.5 text-emerald-600" />
        <span className="text-[10px] font-black uppercase tracking-widest text-slate-500 truncate">{label}</span>
      </div>
      <div className="mt-1 text-base font-black text-slate-900 dark:text-white tabular-nums truncate">{value}</div>
    </button>
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
    slate: 'bg-slate-200 dark:bg-slate-700 text-slate-600 dark:text-slate-300',
  };
  return <span className={`px-2 py-0.5 rounded-full text-[10px] font-extrabold whitespace-nowrap ${tones[tone]}`}>{children}</span>;
}

function Empty({ hasFilters, onClear }: { hasFilters: boolean; onClear: () => void }) {
  return (
    <section className="rounded-3xl bg-white dark:bg-slate-900 border-2 border-dashed border-slate-300 dark:border-slate-700 p-10 sm:p-16 text-center">
      <div className="mx-auto h-20 w-20 rounded-3xl bg-gradient-to-br from-emerald-500 to-lime-700 flex items-center justify-center shadow-lg shadow-emerald-500/40">
        <Boxes className="h-10 w-10 text-white" />
      </div>
      <h3 className="mt-4 text-lg font-extrabold text-slate-900 dark:text-white">
        {hasFilters ? 'Is chaant par kuch nahi mila' : 'Gudaam khali hai'}
      </h3>
      <p className="text-sm text-slate-500 dark:text-slate-400 mt-1.5 font-semibold max-w-md mx-auto">
        {hasFilters ? 'Chaant badal kar dekhein' : 'Pehle maal daaliye — phir yahan poora hisab nazar aayega'}
      </p>
      <div className="mt-5 flex gap-2 justify-center flex-wrap">
        {hasFilters ? (
          <Button variant="secondary" onClick={onClear}><X className="h-4 w-4" /> Chaant hatao</Button>
        ) : (
          <Link to="/agri-products/new"
            className="h-11 px-4 rounded-xl bg-emerald-600 hover:bg-emerald-700 text-white text-xs font-extrabold inline-flex items-center gap-1.5 transition">
            <Package className="h-4 w-4" /> Nayi cheez daalein
          </Link>
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
            <GraduationCap className="h-5 w-5" /> Ye report kya batati hai
          </h3>
          <button onClick={onClose} className="h-9 w-9 rounded-lg hover:bg-white dark:hover:bg-slate-800 flex items-center justify-center transition">
            <X className="h-4 w-4 text-slate-600 dark:text-slate-300" />
          </button>
        </div>
        <div className="p-5 space-y-3 text-sm">
          <p className="font-bold text-slate-700 dark:text-slate-200">
            Ek hi sawal ka poora jawab: <strong>gudaam me kitna paisa para hai, aur us me se
            kitna asal me bik sakta hai.</strong>
          </p>
          <Tip icon={DollarSign} title="Lagat aur bikri">
            "Stock ki lagat" wo hai jo aap ne laga rakha hai. "Sab bik jaye to" wo hai jo poora
            maal bikne par milega. Dono ka farq aap ka munafa hai.
          </Tip>
          <Tip icon={ShieldAlert} title="Ruka hua paisa — sab se ahem">
            Jis beej ya dawa ki registration khatam ho chuki, wo gudaam me hone ke bawajood
            qanooni tor par bik nahi sakti. Wo paisa alag gina jata hai — warna "kitna maal hai"
            ka jawab jhoota hota hai. Aisi koi aur report ye nahi batati.
          </Tip>
          <Tip icon={Scale} title="Bori aur kilo — dono">
            Jahan "1 bori = 50 kg" bhara hai, wahan "Poora stock" wala khana kilo me bhi bata
            deta hai. Dukaan-daar bori ginta hai, farmer kilo maangta hai.
          </Tip>
          <Tip icon={Calendar} title="Mausam ke hisab se">
            Rabi ka maal Kharif me para rahe to wo saal bhar phansa paisa hai. Analytics me
            mausam ka chart ye foran dikha deta hai.
          </Tip>
          <Tip icon={Layers} title="Qism ke hisab se">
            Beej, khaad, dawa, feed, auzaar — kis me kitna paisa. Ooper ke chhote box par click
            karke sirf wohi qism dekh sakte hain.
          </Tip>
          <Tip icon={Landmark} title="Cost 0 ho to">
            Jis cheez ki cost bhari hi nahi, uski lagat 0 gini jati hai — is se kul lagat asal
            se kam dikhti hai. Analytics tab me aisi cheezon ki ginti batai jati hai.
          </Tip>
          <div className="rounded-2xl bg-slate-50 dark:bg-slate-800 p-3">
            <div className="text-[10px] font-black uppercase tracking-widest text-slate-500 mb-2">Shortcuts</div>
            <div className="grid grid-cols-2 gap-1.5 text-[11px] font-bold text-slate-600 dark:text-slate-300">
              <div><kbd className="px-1.5 py-0.5 rounded bg-white dark:bg-slate-900 border">/</kbd> dhoondo</div>
              <div><kbd className="px-1.5 py-0.5 rounded bg-white dark:bg-slate-900 border">A</kbd> analytics</div>
              <div><kbd className="px-1.5 py-0.5 rounded bg-white dark:bg-slate-900 border">P</kbd> print</div>
              <div><kbd className="px-1.5 py-0.5 rounded bg-white dark:bg-slate-900 border">G</kbd> guide</div>
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
