import { useMemo, useState, useEffect, useRef } from 'react';
import { Link } from 'react-router-dom';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import {
  Timer, Plus, X, RefreshCw, Package, AlertTriangle, CheckCircle2,
  TrendingDown, Zap, Search, Clock, Flame, Trash2, Tag, BarChart3,
  GraduationCap, FileSpreadsheet, Printer, ChefHat, Calendar, Loader2,
  ArrowRight, Percent,
} from 'lucide-react';
import {
  ResponsiveContainer, BarChart, Bar, XAxis, YAxis, Tooltip, CartesianGrid,
  PieChart, Pie, Cell, Legend,
} from 'recharts';
import { toast } from 'sonner';
import { freshnessApi, type FreshnessLog, type FreshnessStatus } from '../api/freshness.api';
import { fetchAllProducts } from '@modules/inventory/products/api/fetchAllProducts';
import { formatPKR } from '@core/lib/format';
import { Button } from '@core/ui/Button';
import { useAuthStore } from '@core/stores/auth.store';

/* ═════════════════════════════════════════════════════════════
   TAAZGI — BAKERY KA SAB SE BARA NUQSAAN
   ─────────────────────────────────────────────────────────────
   Kiryana wale ka maal mahinon chalta hai. Bakery wale ka maal
   subah banta hai aur shaam tak na bika to raddi hai — saamaan ka
   paisa bhi gaya, mehnat bhi.

   Purana safha sirf ek list dikhata tha. Us se do sawal ka jawab
   nahi milta tha, jo asal me ahem hain:

     1. Abhi is waqt kya jaldi bechna chahiye?
     2. Mahine me kitna paisa phinka? (ye kisi ko pata hi nahi hota)

   Ab dono upar hain — aur har batch par seedha bechne, discount
   lagane aur phenkne ke button.
   ═════════════════════════════════════════════════════════════ */

type Tab = 'live' | 'analytics';
type Filter = 'urgent' | 'active' | 'all' | 'expired';

const STATUS: Record<FreshnessStatus, { label: string; dot: string; chip: string; emoji: string }> = {
  FRESH:       { label: 'Taaza', dot: 'bg-emerald-500', chip: 'bg-emerald-100 dark:bg-emerald-500/20 text-emerald-700 dark:text-emerald-300', emoji: '✨' },
  DAY_OLD:     { label: 'Kal ka', dot: 'bg-amber-500', chip: 'bg-amber-100 dark:bg-amber-500/20 text-amber-700 dark:text-amber-300', emoji: '📅' },
  NEAR_EXPIRY: { label: 'Waqt ho raha', dot: 'bg-orange-500', chip: 'bg-orange-100 dark:bg-orange-500/20 text-orange-700 dark:text-orange-300', emoji: '⚠️' },
  EXPIRED:     { label: 'Waqt guzar gaya', dot: 'bg-rose-500', chip: 'bg-rose-100 dark:bg-rose-500/20 text-rose-700 dark:text-rose-300', emoji: '🚫' },
  DISCARDED:   { label: 'Phenk diya', dot: 'bg-slate-500', chip: 'bg-slate-100 dark:bg-slate-700 text-slate-600 dark:text-slate-300', emoji: '🗑️' },
};

const GRID = '#94a3b8';
const AXIS = '#64748b';
const TOOLTIP = {
  borderRadius: 12, border: '2px solid #cbd5e1', background: '#ffffff',
  color: '#0f172a', fontWeight: 700, fontSize: 12,
};

const fmtQty = (q: number) => Number(q || 0).toFixed(Number(q || 0) % 1 === 0 ? 0 : 2);

function hoursLeft(iso?: string | null): number {
  if (!iso) return 0;
  const t = new Date(iso).getTime();
  return Number.isNaN(t) ? 0 : (t - Date.now()) / 3_600_000;
}

function phrase(h: number): string {
  if (h < 0) {
    const p = Math.abs(h);
    return p < 24 ? `${Math.round(p)} ghante guzar gaye` : `${Math.round(p / 24)} din guzar gaye`;
  }
  if (h < 1) return `${Math.round(h * 60)} minute baqi`;
  if (h < 24) return `${Math.round(h)} ghante baqi`;
  return `${Math.round(h / 24)} din baqi`;
}

export default function FreshnessPage() {
  const qc = useQueryClient();
  const tenant = useAuthStore((s) => s.tenant);
  const searchRef = useRef<HTMLInputElement>(null);

  const [tab, setTab] = useState<Tab>('live');
  const [filter, setFilter] = useState<Filter>('urgent');
  const [search, setSearch] = useState('');
  const [showTeacher, setShowTeacher] = useState(false);
  const [actionOn, setActionOn] = useState<{ log: any; mode: 'sale' | 'discount' | 'discard' } | null>(null);
  const [showNew, setShowNew] = useState(false);

  const logsQ = useQuery({
    queryKey: ['freshness-logs'],
    queryFn: () => freshnessApi.list({}),
    refetchInterval: 60_000,
  });

  const productsQ = useQuery({
    queryKey: ['bakery-all-products'],
    queryFn: () => fetchAllProducts({}),
  });

  const costByProduct = useMemo(() => {
    const m = new Map<string, number>();
    (productsQ.data?.items ?? []).forEach((p) => m.set(p.id, Number(p.costPrice ?? 0)));
    return m;
  }, [productsQ.data]);

  const runCheck = useMutation({
    mutationFn: () => freshnessApi.runCheck(),
    onSuccess: (res: any) => {
      toast.success(`${res?.checked ?? 0} batch dekhe — ${res?.expired ?? 0} ka waqt guzar gaya`);
      qc.invalidateQueries({ queryKey: ['freshness-logs'] });
    },
    onError: () => toast.error('Check nahi ho saka'),
  });

  /* ── Rows ── */
  const rows = useMemo(() => {
    const list = logsQ.data ?? [];
    return list.map((f) => {
      const left = hoursLeft(f.expiryDate || f.bestBefore);
      const cost = costByProduct.get(f.productId) ?? 0;
      return {
        ...f,
        left,
        cost,
        atRiskValue: Number(f.currentQty || 0) * cost,
        wastedValue: Number(f.wastedQty || 0) * cost,
      };
    });
  }, [logsQ.data, costByProduct]);

  const q = search.trim().toLowerCase();
  const shown = useMemo(() => {
    let out = rows;
    if (filter === 'urgent') out = out.filter((r) => r.status !== 'DISCARDED' && Number(r.currentQty) > 0 && r.left < 24);
    if (filter === 'active') out = out.filter((r) => r.status !== 'DISCARDED' && Number(r.currentQty) > 0);
    if (filter === 'expired') out = out.filter((r) => r.left <= 0 && r.status !== 'DISCARDED');
    if (q) out = out.filter((r) => (r.productName || '').toLowerCase().includes(q) || (r.batchNumber || '').toLowerCase().includes(q));
    return [...out].sort((a, b) => a.left - b.left);
  }, [rows, filter, q]);

  /* ── Stats ── */
  const stats = useMemo(() => {
    const live = rows.filter((r) => r.status !== 'DISCARDED' && Number(r.currentQty) > 0);
    const expired = live.filter((r) => r.left <= 0);
    const soon = live.filter((r) => r.left > 0 && r.left <= 6);
    const made = rows.reduce((s, r) => s + Number(r.initialQty || 0), 0);
    const sold = rows.reduce((s, r) => s + Number(r.soldQty || 0), 0);
    const wasted = rows.reduce((s, r) => s + Number(r.wastedQty || 0), 0);
    const discounted = rows.reduce((s, r) => s + Number(r.discountedQty || 0), 0);
    return {
      liveCount: live.length,
      expiredCount: expired.length,
      soonCount: soon.length,
      atRisk: live.reduce((s, r) => s + r.atRiskValue, 0),
      expiredValue: expired.reduce((s, r) => s + r.atRiskValue, 0),
      made, sold, wasted, discounted,
      wastePct: made > 0 ? (wasted / made) * 100 : 0,
      wasteValue: rows.reduce((s, r) => s + r.wastedValue, 0),
      savedByDiscount: discounted,
    };
  }, [rows]);

  /* ── Charts ── */
  const fatePie = useMemo(() => ([
    { name: 'Bik gaya', value: stats.sold },
    { name: 'Discount par', value: stats.discounted },
    { name: 'Phinka', value: stats.wasted },
  ].filter((x) => x.value > 0)), [stats]);

  const worstProducts = useMemo(() => {
    const m = new Map<string, { name: string; wasted: number; value: number }>();
    rows.forEach((r) => {
      const w = Number(r.wastedQty || 0);
      if (w <= 0) return;
      const e = m.get(r.productId);
      if (e) { e.wasted += w; e.value += r.wastedValue; }
      else m.set(r.productId, { name: r.productName, wasted: w, value: r.wastedValue });
    });
    return [...m.values()].sort((a, b) => b.value - a.value).slice(0, 8)
      .map((x) => ({ name: x.name.slice(0, 14), value: Math.round(x.value) }));
  }, [rows]);

  const urgencyChart = useMemo(() => {
    const live = rows.filter((r) => r.status !== 'DISCARDED' && Number(r.currentQty) > 0);
    return [
      { name: 'Guzar gaya', value: live.filter((r) => r.left <= 0).length },
      { name: '0-2 ghante', value: live.filter((r) => r.left > 0 && r.left <= 2).length },
      { name: '2-6 ghante', value: live.filter((r) => r.left > 2 && r.left <= 6).length },
      { name: 'Aaj shaam', value: live.filter((r) => r.left > 6 && r.left <= 12).length },
      { name: 'Kal', value: live.filter((r) => r.left > 12 && r.left <= 36).length },
      { name: 'Baad me', value: live.filter((r) => r.left > 36).length },
    ].filter((x) => x.value > 0);
  }, [rows]);

  /* ── CSV / print ── */
  const exportCsv = () => {
    const head = ['Cheez', 'Batch', 'Bana', 'Bacha hua', 'Bik gaya', 'Phinka', 'Kab tak', 'Halat', 'Risk par paisa'];
    const body = shown.map((r) => [
      r.productName, r.batchNumber || '', r.initialQty, r.currentQty, r.soldQty, r.wastedQty,
      new Date(r.expiryDate || r.bestBefore).toLocaleString('en-PK'),
      STATUS[r.status]?.label ?? r.status,
      Math.round(r.atRiskValue),
    ]);
    const esc = (v: any) => `"${String(v ?? '').replace(/"/g, '""')}"`;
    const csv = [head, ...body].map((r) => r.map(esc).join(',')).join('\n');
    const url = URL.createObjectURL(new Blob(['﻿' + csv], { type: 'text/csv;charset=utf-8;' }));
    const a = document.createElement('a'); a.href = url;
    a.download = `taazgi-${new Date().toISOString().slice(0, 10)}.csv`;
    a.click(); URL.revokeObjectURL(url);
    toast.success('CSV nikal gayi');
  };

  useEffect(() => {
    const onKey = (e: KeyboardEvent) => {
      if (e.key === 'Escape') {
        if (actionOn) return setActionOn(null);
        if (showNew) return setShowNew(false);
        if (showTeacher) return setShowTeacher(false);
        return;
      }
      const t = document.activeElement?.tagName;
      if (t === 'INPUT' || t === 'TEXTAREA' || t === 'SELECT') return;
      if (e.key === '/') { e.preventDefault(); searchRef.current?.focus(); }
      if (e.key.toLowerCase() === 'g') setShowTeacher(true);
      if (e.key.toLowerCase() === 'a') setTab((x) => (x === 'analytics' ? 'live' : 'analytics'));
      if (e.key.toLowerCase() === 'p') window.print();
    };
    window.addEventListener('keydown', onKey);
    return () => window.removeEventListener('keydown', onKey);
  }, [actionOn, showNew, showTeacher]);

  return (
    <div className="space-y-4 sm:space-y-5 pb-10">
      <div className="hidden print:block mb-4">
        <h1 className="text-xl font-extrabold">{tenant?.name || 'Bakery'} — Taazgi ka hisab</h1>
        <p className="text-xs text-slate-600">{new Date().toLocaleString('en-PK', { dateStyle: 'full', timeStyle: 'short' })}</p>
      </div>

      {/* ═══ HERO ═══ */}
      <section className="relative overflow-hidden rounded-3xl bg-gradient-to-br from-slate-950 via-emerald-900 to-teal-700 text-white p-5 sm:p-6 shadow-2xl print:hidden">
        <div className="absolute -top-24 -right-20 h-72 w-72 rounded-full bg-emerald-400/25 blur-3xl" />
        <div className="absolute inset-0 opacity-[0.06]"
          style={{ backgroundImage: 'radial-gradient(circle at 1px 1px, #fff 1px, transparent 0)', backgroundSize: '22px 22px' }} />
        <div className="relative flex items-start justify-between gap-4 flex-wrap">
          <div className="min-w-0">
            <div className="inline-flex items-center gap-2 rounded-full bg-white/15 backdrop-blur px-3 py-1 text-[11px] font-black border border-white/25 uppercase tracking-widest">
              <Timer className="h-3.5 w-3.5 text-emerald-300" /> Bakery · Taazgi
            </div>
            <h1 className="mt-3 text-2xl sm:text-3xl lg:text-4xl font-black leading-tight">⏱️ Kya Jaldi Bechna Hai</h1>
            <p className="mt-1.5 text-xs sm:text-sm font-bold text-white/90">
              <strong className="text-rose-200">{stats.expiredCount}</strong> ka waqt guzar gaya ·{' '}
              <strong className="text-amber-200">{stats.soonCount}</strong> agle 6 ghante me ·{' '}
              <strong className="text-white">{formatPKR(stats.atRisk)}</strong> risk par
            </p>
          </div>
          <div className="flex gap-2 flex-wrap items-center shrink-0">
            <button onClick={() => setShowNew(true)}
              className="h-11 px-3.5 rounded-xl bg-white text-emerald-700 hover:bg-emerald-50 text-xs font-black inline-flex items-center gap-1.5 shadow-lg transition">
              <Plus className="h-4 w-4" /> Naya batch
            </button>
            <button onClick={() => runCheck.mutate()} disabled={runCheck.isPending}
              className="h-11 px-3 rounded-xl bg-amber-400/90 hover:bg-amber-400 text-slate-900 text-xs font-black inline-flex items-center gap-1.5 shadow-lg disabled:opacity-60 transition">
              {runCheck.isPending ? <Loader2 className="h-4 w-4 animate-spin" /> : <Zap className="h-4 w-4" />}
              <span className="hidden sm:inline">Dobara check</span>
            </button>
            <button onClick={() => setShowTeacher(true)}
              className="h-11 w-11 rounded-xl bg-white/15 hover:bg-white/25 border border-white/25 flex items-center justify-center backdrop-blur transition">
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
            <button onClick={() => logsQ.refetch()} disabled={logsQ.isRefetching}
              className="h-11 w-11 rounded-xl bg-white/15 hover:bg-white/25 border border-white/25 flex items-center justify-center backdrop-blur disabled:opacity-50 transition">
              <RefreshCw className={`h-4 w-4 ${logsQ.isRefetching ? 'animate-spin' : ''}`} />
            </button>
          </div>
        </div>
      </section>

      {/* ═══ KPI ═══ */}
      <section className="grid grid-cols-2 lg:grid-cols-4 gap-3 print:hidden">
        <Kpi icon={AlertTriangle} label="Risk par paisa" value={formatPKR(stats.atRisk)}
          sub={`${stats.liveCount} batch para hua`} tone="amber" />
        <Kpi icon={Flame} label="Ab tak phinka" value={formatPKR(stats.wasteValue)}
          sub={`${stats.wastePct.toFixed(1)}% maal`} tone={stats.wastePct > 10 ? 'rose' : 'emerald'} />
        <Kpi icon={Percent} label="Discount se bacha" value={fmtQty(stats.savedByDiscount)}
          sub="Warna phinkta" tone="violet" />
        <Kpi icon={CheckCircle2} label="Bik gaya" value={fmtQty(stats.sold)}
          sub={`${fmtQty(stats.made)} bana tha`} tone="emerald" />
      </section>

      {/* ═══ TABS ═══ */}
      <div className="grid grid-cols-2 gap-2 sm:gap-3 print:hidden">
        {([['live', 'Abhi ka maal', Timer], ['analytics', 'Analytics', BarChart3]] as const).map(([v, label, Icon]) => (
          <button key={v} onClick={() => setTab(v as Tab)}
            className={`h-14 rounded-2xl border-2 font-black text-sm inline-flex items-center justify-center gap-2 transition ${
              tab === v
                ? 'bg-gradient-to-r from-emerald-500 to-teal-600 text-white border-transparent shadow-lg'
                : 'bg-white dark:bg-slate-900 text-slate-600 dark:text-slate-300 border-slate-200 dark:border-slate-800 hover:border-emerald-400'
            }`}>
            <Icon className="h-4 w-4" /> {label}
            {v === 'live' && (
              <span className={`text-[10px] px-1.5 py-0.5 rounded-lg ${tab === v ? 'bg-white/25' : 'bg-slate-100 dark:bg-slate-800'}`}>
                {shown.length}
              </span>
            )}
          </button>
        ))}
      </div>

      {tab === 'live' ? (
        <>
          {/* ── Search + filter ── */}
          <section className="rounded-3xl bg-white dark:bg-slate-900 border-2 border-slate-200 dark:border-slate-800 shadow-sm p-3 sm:p-4 print:hidden">
            <div className="flex gap-2 flex-wrap items-center">
              <div className="relative flex-1 min-w-[220px]">
                <Search className="h-5 w-5 text-slate-400 absolute left-3.5 top-1/2 -translate-y-1/2 pointer-events-none" />
                <input ref={searchRef} value={search} onChange={(e) => setSearch(e.target.value)}
                  placeholder="Cheez ya batch dhoondein… (/ dabao)"
                  className="h-12 w-full rounded-2xl border-2 border-slate-200 dark:border-slate-700 bg-white dark:bg-slate-800 pl-11 pr-10 text-sm font-bold text-slate-900 dark:text-white placeholder:text-slate-400 focus:outline-none focus:border-emerald-500 transition" />
                {search && (
                  <button onClick={() => setSearch('')} className="absolute right-3 top-1/2 -translate-y-1/2 h-7 w-7 rounded-lg hover:bg-slate-100 dark:hover:bg-slate-700 flex items-center justify-center">
                    <X className="h-4 w-4 text-slate-400" />
                  </button>
                )}
              </div>
              <div className="flex gap-1.5 flex-wrap">
                {([['urgent', '🔥 Jaldi bechein'], ['active', 'Sab para hua'], ['expired', '🚫 Waqt guzar gaya'], ['all', 'Poora record']] as const).map(([v, l]) => (
                  <button key={v} onClick={() => setFilter(v as Filter)}
                    className={`h-12 px-3.5 rounded-2xl border-2 text-xs font-black transition ${
                      filter === v
                        ? 'border-emerald-500 bg-emerald-50 dark:bg-emerald-500/15 text-emerald-700 dark:text-emerald-300'
                        : 'border-slate-200 dark:border-slate-700 bg-white dark:bg-slate-800 text-slate-600 dark:text-slate-300 hover:border-emerald-400'
                    }`}>{l}</button>
                ))}
              </div>
            </div>
          </section>

          {logsQ.isLoading ? (
            <div className="flex items-center justify-center py-24">
              <div className="h-12 w-12 rounded-full border-4 border-emerald-200 border-t-emerald-600 animate-spin" />
            </div>
          ) : shown.length === 0 ? (
            <div className="rounded-3xl bg-white dark:bg-slate-900 border-4 border-dashed border-slate-200 dark:border-slate-700 p-10 sm:p-14 text-center">
              <div className="h-16 w-16 rounded-3xl bg-emerald-100 dark:bg-emerald-500/20 mx-auto flex items-center justify-center">
                <CheckCircle2 className="h-8 w-8 text-emerald-600 dark:text-emerald-400" />
              </div>
              <p className="mt-4 font-black text-slate-800 dark:text-slate-100 text-lg sm:text-xl">
                {filter === 'urgent' ? 'Abhi kuch jaldi bechne ko nahi' : 'Koi batch nahi mila'}
              </p>
              <p className="text-xs sm:text-sm text-slate-500 dark:text-slate-400 font-bold mt-1.5 max-w-md mx-auto">
                {filter === 'urgent'
                  ? 'Sab maal abhi theek hai — agle 24 ghante me kisi ki tareekh nahi guzar rahi.'
                  : 'Jab batch banega, uska hisab yahan aa jayega.'}
              </p>
            </div>
          ) : (
            <section className="space-y-2">
              {shown.map((r) => {
                const gone = r.left <= 0;
                const soon = r.left > 0 && r.left <= 6;
                const st = STATUS[r.status] ?? STATUS.FRESH;
                const soldPct = Number(r.initialQty) > 0 ? (Number(r.soldQty) / Number(r.initialQty)) * 100 : 0;
                return (
                  <div key={r.id}
                    className={`rounded-2xl bg-white dark:bg-slate-900 border-2 shadow-sm p-3 sm:p-4 avoid-break ${
                      gone ? 'border-rose-300 dark:border-rose-500/40' : soon ? 'border-amber-300 dark:border-amber-500/40' : 'border-slate-200 dark:border-slate-800'
                    }`}>
                    <div className="flex items-center gap-3 flex-wrap">
                      <span className={`h-11 w-11 rounded-2xl flex items-center justify-center shrink-0 ${
                        gone ? 'bg-rose-100 dark:bg-rose-500/20' : soon ? 'bg-amber-100 dark:bg-amber-500/20' : 'bg-emerald-100 dark:bg-emerald-500/20'
                      }`}>
                        <Clock className={`h-5 w-5 ${gone ? 'text-rose-600' : soon ? 'text-amber-600' : 'text-emerald-600'}`} />
                      </span>

                      <div className="min-w-0 flex-1">
                        <div className="flex items-center gap-1.5 flex-wrap">
                          <Link to={`/bakery-products/${r.productId}`} className="font-extrabold text-sm text-slate-900 dark:text-white truncate hover:text-emerald-600">
                            {r.productName}
                          </Link>
                          <span className={`text-[9px] font-black uppercase px-1.5 py-0.5 rounded-md ${st.chip}`}>{st.emoji} {st.label}</span>
                          {r.batchNumber && <span className="text-[10px] font-black text-slate-400">#{r.batchNumber}</span>}
                        </div>
                        <div className={`text-[11px] font-black mt-0.5 ${gone ? 'text-rose-600' : soon ? 'text-amber-600' : 'text-slate-500'}`}>
                          {phrase(r.left)} · {new Date(r.expiryDate || r.bestBefore).toLocaleString('en-PK', { dateStyle: 'short', timeStyle: 'short' })}
                        </div>
                      </div>

                      <div className="text-right shrink-0">
                        <div className="text-lg font-black text-slate-900 dark:text-white tabular-nums">{fmtQty(Number(r.currentQty))}</div>
                        <div className="text-[10px] font-bold text-slate-400">{fmtQty(Number(r.initialQty))} me se</div>
                        {r.atRiskValue > 0 && (
                          <div className="text-[10px] font-black text-amber-600 tabular-nums">{formatPKR(r.atRiskValue)}</div>
                        )}
                      </div>
                    </div>

                    <div className="mt-2.5 h-2 rounded-full bg-slate-100 dark:bg-slate-800 overflow-hidden">
                      <div className="h-full bg-emerald-500 rounded-full transition-all" style={{ width: `${Math.min(soldPct, 100)}%` }} />
                    </div>
                    <div className="mt-1 text-[10px] font-bold text-slate-400">{soldPct.toFixed(0)}% bik chuka</div>

                    {Number(r.currentQty) > 0 && r.status !== 'DISCARDED' && (
                      <div className="mt-2.5 flex gap-1.5 flex-wrap print:hidden">
                        <button onClick={() => setActionOn({ log: r, mode: 'sale' })}
                          className="h-9 px-3 rounded-xl bg-emerald-600 hover:bg-emerald-700 text-white text-[11px] font-black inline-flex items-center gap-1.5 transition">
                          <CheckCircle2 className="h-3.5 w-3.5" /> Bik gaya
                        </button>
                        <button onClick={() => setActionOn({ log: r, mode: 'discount' })}
                          className="h-9 px-3 rounded-xl bg-amber-500 hover:bg-amber-600 text-white text-[11px] font-black inline-flex items-center gap-1.5 transition">
                          <Tag className="h-3.5 w-3.5" /> Discount par
                        </button>
                        <button onClick={() => setActionOn({ log: r, mode: 'discard' })}
                          className="h-9 px-3 rounded-xl border-2 border-rose-200 dark:border-rose-500/30 text-rose-600 dark:text-rose-400 text-[11px] font-black inline-flex items-center gap-1.5 hover:bg-rose-50 dark:hover:bg-rose-500/10 transition">
                          <Trash2 className="h-3.5 w-3.5" /> Phenk diya
                        </button>
                      </div>
                    )}
                  </div>
                );
              })}
            </section>
          )}
        </>
      ) : (
        <div className="space-y-4">
          {stats.wastePct > 10 && (
            <section className="rounded-3xl bg-rose-50 dark:bg-rose-500/10 border-2 border-rose-200 dark:border-rose-500/30 p-4 flex gap-2.5">
              <TrendingDown className="h-5 w-5 text-rose-600 shrink-0 mt-0.5" />
              <div>
                <h3 className="font-black text-rose-900 dark:text-rose-200">Zaya zyada ho raha hai</h3>
                <p className="text-[12px] font-bold text-rose-800 dark:text-rose-300 mt-0.5">
                  Har 100 me se <strong>{stats.wastePct.toFixed(0)}</strong> phink rahe hain — ab tak{' '}
                  <strong>{formatPKR(stats.wasteValue)}</strong> ka nuqsaan. Neeche dekhein kis cheez par
                  sab se zyada — shayad us ka batch chhota karna chahiye.
                </p>
              </div>
            </section>
          )}

          <div className="grid lg:grid-cols-2 gap-4">
            <ChartCard icon={Flame} title="Bana hua maal kahan gaya">
              {fatePie.length > 0 ? (
                <ResponsiveContainer width="100%" height="100%">
                  <PieChart>
                    <Pie data={fatePie} dataKey="value" nameKey="name" innerRadius={55} outerRadius={90} paddingAngle={3}>
                      <Cell fill="#10b981" /><Cell fill="#f59e0b" /><Cell fill="#ef4444" />
                    </Pie>
                    <Tooltip contentStyle={TOOLTIP} />
                    <Legend />
                  </PieChart>
                </ResponsiveContainer>
              ) : <EmptyBox />}
            </ChartCard>

            <ChartCard icon={Clock} title="Kitna waqt bacha hai">
              {urgencyChart.length > 0 ? (
                <ResponsiveContainer width="100%" height="100%">
                  <BarChart data={urgencyChart}>
                    <CartesianGrid strokeDasharray="3 3" stroke={GRID} vertical={false} />
                    <XAxis dataKey="name" stroke={AXIS} fontSize={10} fontWeight={700} interval={0} angle={-20} textAnchor="end" height={60} />
                    <YAxis stroke={AXIS} fontSize={11} width={45} allowDecimals={false} />
                    <Tooltip contentStyle={TOOLTIP} formatter={(v: any) => [v, 'Batch']} />
                    <Bar dataKey="value" fill="#10b981" radius={[8, 8, 0, 0]} maxBarSize={48} />
                  </BarChart>
                </ResponsiveContainer>
              ) : <EmptyBox />}
            </ChartCard>

            <ChartCard icon={TrendingDown} title="Kis cheez ka sab se zyada phinka" wide>
              {worstProducts.length > 0 ? (
                <ResponsiveContainer width="100%" height="100%">
                  <BarChart data={worstProducts}>
                    <CartesianGrid strokeDasharray="3 3" stroke={GRID} vertical={false} />
                    <XAxis dataKey="name" stroke={AXIS} fontSize={10} fontWeight={700} interval={0} angle={-20} textAnchor="end" height={60} />
                    <YAxis stroke={AXIS} fontSize={11} width={78} tickFormatter={(v) => Number(v).toLocaleString('en-PK')} />
                    <Tooltip contentStyle={TOOLTIP} formatter={(v: any) => [formatPKR(Number(v)), 'Nuqsaan']} />
                    <Bar dataKey="value" fill="#ef4444" radius={[8, 8, 0, 0]} maxBarSize={56} />
                  </BarChart>
                </ResponsiveContainer>
              ) : <EmptyBox text="Abhi tak kuch nahi phinka — shabash" />}
            </ChartCard>
          </div>
        </div>
      )}

      {actionOn && (
        <QtyModal
          log={actionOn.log}
          mode={actionOn.mode}
          onClose={() => setActionOn(null)}
          onDone={() => { setActionOn(null); qc.invalidateQueries({ queryKey: ['freshness-logs'] }); }}
        />
      )}
      {showNew && <NewBatchModal onClose={() => setShowNew(false)} onDone={() => { setShowNew(false); qc.invalidateQueries({ queryKey: ['freshness-logs'] }); }} />}
      {showTeacher && <Teacher onClose={() => setShowTeacher(false)} />}
    </div>
  );
}

/* ═══ QTY MODAL ═══ */
function QtyModal({ log, mode, onClose, onDone }: any) {
  const max = Number(log.currentQty) || 0;
  const [qty, setQty] = useState<number | ''>(max);
  const [reason, setReason] = useState('');

  const cfg = {
    sale:     { title: 'Kitna bik gaya?', btn: 'Bikri darj karein', tone: 'bg-emerald-600 hover:bg-emerald-700', icon: CheckCircle2 },
    discount: { title: 'Kitna discount par daala?', btn: 'Discount darj karein', tone: 'bg-amber-500 hover:bg-amber-600', icon: Tag },
    discard:  { title: 'Kitna phenkna para?', btn: 'Phenka hua darj karein', tone: 'bg-rose-600 hover:bg-rose-700', icon: Trash2 },
  }[mode as 'sale' | 'discount' | 'discard'];

  const mut = useMutation({
    mutationFn: () => {
      const n = Number(qty) || 0;
      if (mode === 'sale') return freshnessApi.sale(log.id, n);
      if (mode === 'discount') return freshnessApi.discount(log.id, n);
      return freshnessApi.discard(log.id, n, reason || 'Waqt guzar gaya');
    },
    onSuccess: () => { toast.success('Darj ho gaya'); onDone(); },
    onError: (e: any) => toast.error(e?.response?.data?.message || 'Nahi ho saka'),
  });

  const bad = qty === '' || Number(qty) <= 0 || Number(qty) > max || (mode === 'discard' && !reason.trim());
  const Icon = cfg.icon;

  return (
    <div className="fixed inset-0 z-50 bg-black/60 backdrop-blur-sm flex items-end sm:items-center justify-center p-3" onClick={onClose}>
      <div className="w-full max-w-sm rounded-3xl bg-white dark:bg-slate-900 border-2 border-slate-200 dark:border-slate-700 shadow-2xl p-5" onClick={(e) => e.stopPropagation()}>
        <div className="flex items-center gap-2.5">
          <span className="h-10 w-10 rounded-2xl bg-slate-100 dark:bg-slate-800 flex items-center justify-center">
            <Icon className="h-5 w-5 text-slate-600 dark:text-slate-300" />
          </span>
          <div className="min-w-0">
            <h3 className="font-black text-slate-900 dark:text-white">{cfg.title}</h3>
            <p className="text-[11px] font-bold text-slate-500 truncate">{log.productName} · {fmtQty(max)} para hua</p>
          </div>
        </div>

        <input type="number" min={0} max={max} step="any" autoFocus
          value={qty} onChange={(e) => setQty(e.target.value === '' ? '' : Number(e.target.value))}
          className="mt-4 h-14 w-full rounded-2xl border-2 border-slate-200 dark:border-slate-700 bg-white dark:bg-slate-800 px-3 text-2xl font-black text-center tabular-nums text-slate-900 dark:text-white focus:outline-none focus:border-emerald-500" />

        <div className="mt-2 grid grid-cols-4 gap-1.5">
          {[max, max / 2, max / 4, 1].map((v, i) => {
            const val = Math.round(v * 100) / 100;
            if (val <= 0 || val > max) return null;
            return (
              <button key={i} onClick={() => setQty(val)}
                className="h-10 rounded-xl bg-slate-100 dark:bg-slate-800 hover:bg-slate-200 text-xs font-black text-slate-700 dark:text-slate-200 tabular-nums transition">
                {i === 0 ? 'Poora' : fmtQty(val)}
              </button>
            );
          })}
        </div>

        {mode === 'discard' && (
          <input value={reason} onChange={(e) => setReason(e.target.value)}
            placeholder="Wajah likhein — waqt guzar gaya, jal gaya…"
            className="mt-3 h-11 w-full rounded-xl border-2 border-slate-200 dark:border-slate-700 bg-white dark:bg-slate-800 px-3 text-sm font-bold text-slate-900 dark:text-white focus:outline-none focus:border-rose-500" />
        )}

        <div className="mt-4 flex gap-2">
          <Button variant="secondary" className="flex-1" onClick={onClose}>Rehne dein</Button>
          <Button className={`flex-[2] ${cfg.tone}`} disabled={bad} loading={mut.isPending} onClick={() => mut.mutate()}>
            {cfg.btn}
          </Button>
        </div>
      </div>
    </div>
  );
}

/* ═══ NEW BATCH ═══ */
function NewBatchModal({ onClose, onDone }: any) {
  const [productId, setProductId] = useState('');
  const [qty, setQty] = useState<number | ''>('');
  const [hours, setHours] = useState<number | ''>(24);
  const [batchNumber, setBatchNumber] = useState('');
  const [search, setSearch] = useState('');

  const { data } = useQuery({ queryKey: ['bakery-all-products'], queryFn: () => fetchAllProducts({}) });
  const products = data?.items ?? [];
  const q = search.trim().toLowerCase();
  const options = useMemo(
    () => products.filter((p) => (q ? p.name.toLowerCase().includes(q) : true)).slice(0, 20),
    [products, q],
  );
  const chosen = products.find((p) => p.id === productId);

  const mut = useMutation({
    mutationFn: () => {
      const now = new Date();
      const best = new Date(now.getTime() + Number(hours || 24) * 3_600_000);
      return freshnessApi.create({
        productId,
        productName: chosen?.name,
        batchNumber: batchNumber || undefined,
        productionDate: now.toISOString(),
        bestBefore: best.toISOString(),
        expiryDate: best.toISOString(),
        initialQty: Number(qty) || 0,
        currentQty: Number(qty) || 0,
      } as any);
    },
    onSuccess: () => { toast.success('Batch darj ho gaya'); onDone(); },
    onError: (e: any) => toast.error(e?.response?.data?.message || 'Nahi ho saka'),
  });

  const bad = !productId || qty === '' || Number(qty) <= 0 || hours === '' || Number(hours) <= 0;

  return (
    <div className="fixed inset-0 z-50 bg-black/60 backdrop-blur-sm flex items-end sm:items-center justify-center p-3" onClick={onClose}>
      <div className="w-full max-w-md max-h-[90vh] overflow-y-auto rounded-3xl bg-white dark:bg-slate-900 border-2 border-emerald-300 dark:border-emerald-500/40 shadow-2xl" onClick={(e) => e.stopPropagation()}>
        <div className="px-5 py-3 border-b-2 border-emerald-200 dark:border-emerald-500/30 bg-gradient-to-r from-emerald-50 to-teal-50 dark:from-emerald-500/15 dark:to-teal-500/15 flex items-center justify-between sticky top-0 z-10">
          <h3 className="font-extrabold text-emerald-900 dark:text-emerald-200 flex items-center gap-2">
            <ChefHat className="h-5 w-5" /> Naya batch
          </h3>
          <button onClick={onClose} className="h-8 w-8 rounded-lg hover:bg-white dark:hover:bg-slate-800 flex items-center justify-center">
            <X className="h-4 w-4 text-slate-600 dark:text-slate-300" />
          </button>
        </div>

        <div className="p-5 space-y-3">
          <div>
            <label className="block text-[11px] font-black uppercase tracking-widest text-slate-500 mb-1.5">Kaun si cheez</label>
            {chosen ? (
              <div className="flex items-center gap-2 rounded-xl border-2 border-emerald-400 bg-emerald-50 dark:bg-emerald-500/10 p-2.5">
                <Package className="h-4 w-4 text-emerald-600 shrink-0" />
                <span className="font-extrabold text-sm text-slate-900 dark:text-white truncate flex-1">{chosen.name}</span>
                <button onClick={() => setProductId('')} className="h-8 w-8 rounded-lg bg-white dark:bg-slate-800 flex items-center justify-center shrink-0">
                  <X className="h-3.5 w-3.5 text-slate-500" />
                </button>
              </div>
            ) : (
              <>
                <input value={search} onChange={(e) => setSearch(e.target.value)} placeholder="Naam likhein…"
                  className="h-11 w-full rounded-xl border-2 border-slate-200 dark:border-slate-700 bg-white dark:bg-slate-800 px-3 text-sm font-bold text-slate-900 dark:text-white focus:outline-none focus:border-emerald-500" />
                <div className="mt-1.5 max-h-40 overflow-y-auto space-y-1">
                  {options.map((p) => (
                    <button key={p.id} onClick={() => setProductId(p.id)}
                      className="w-full text-left px-3 py-2 rounded-lg hover:bg-slate-100 dark:hover:bg-slate-800 text-sm font-bold text-slate-700 dark:text-slate-200 truncate transition">
                      {p.name}
                    </button>
                  ))}
                </div>
              </>
            )}
          </div>

          <div className="grid grid-cols-2 gap-3">
            <div>
              <label className="block text-[11px] font-black uppercase tracking-widest text-slate-500 mb-1.5">Kitne banaye</label>
              <input type="number" min={1} step="any" value={qty} onChange={(e) => setQty(e.target.value === '' ? '' : Number(e.target.value))}
                className="h-11 w-full rounded-xl border-2 border-slate-200 dark:border-slate-700 bg-white dark:bg-slate-800 px-3 text-sm font-extrabold tabular-nums text-slate-900 dark:text-white focus:outline-none focus:border-emerald-500" />
            </div>
            <div>
              <label className="block text-[11px] font-black uppercase tracking-widest text-slate-500 mb-1.5">Kitne ghante theek</label>
              <input type="number" min={1} value={hours} onChange={(e) => setHours(e.target.value === '' ? '' : Number(e.target.value))}
                className="h-11 w-full rounded-xl border-2 border-slate-200 dark:border-slate-700 bg-white dark:bg-slate-800 px-3 text-sm font-extrabold tabular-nums text-slate-900 dark:text-white focus:outline-none focus:border-emerald-500" />
            </div>
          </div>

          <div className="flex gap-1.5">
            {[6, 12, 24, 48, 72].map((h) => (
              <button key={h} onClick={() => setHours(h)}
                className={`flex-1 h-9 rounded-lg text-[11px] font-black transition ${
                  hours === h ? 'bg-emerald-600 text-white' : 'bg-slate-100 dark:bg-slate-800 text-slate-600 dark:text-slate-300'
                }`}>{h}h</button>
            ))}
          </div>

          <div>
            <label className="block text-[11px] font-black uppercase tracking-widest text-slate-500 mb-1.5">Batch number (optional)</label>
            <input value={batchNumber} onChange={(e) => setBatchNumber(e.target.value)} placeholder="Subah wala"
              className="h-11 w-full rounded-xl border-2 border-slate-200 dark:border-slate-700 bg-white dark:bg-slate-800 px-3 text-sm font-bold text-slate-900 dark:text-white focus:outline-none focus:border-emerald-500" />
          </div>

          <div className="flex gap-2 pt-1">
            <Button variant="secondary" className="flex-1" onClick={onClose}>Rehne dein</Button>
            <Button className="flex-[2] bg-emerald-600 hover:bg-emerald-700" disabled={bad} loading={mut.isPending} onClick={() => mut.mutate()}>
              <Plus className="h-4 w-4" /> Batch banao
            </Button>
          </div>
        </div>
      </div>
    </div>
  );
}

/* ═══ CHHOTE HISSE ═══ */
function Kpi({ icon: Icon, label, value, sub, tone }: any) {
  const tones: Record<string, string> = {
    emerald: 'from-emerald-500 to-green-600 shadow-emerald-500/40',
    amber: 'from-amber-500 to-orange-600 shadow-amber-500/40',
    rose: 'from-rose-500 to-red-600 shadow-rose-500/40',
    violet: 'from-violet-500 to-purple-600 shadow-violet-500/40',
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
        <Icon className="h-4 w-4 text-emerald-600" /> {title}
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
      <div className="w-full max-w-lg max-h-[90vh] overflow-y-auto rounded-3xl bg-white dark:bg-slate-900 border-2 border-emerald-300 dark:border-emerald-500/40 shadow-2xl" onClick={(e) => e.stopPropagation()}>
        <div className="px-5 py-3 border-b-2 border-emerald-200 dark:border-emerald-500/30 bg-gradient-to-r from-emerald-50 to-teal-50 dark:from-emerald-500/15 dark:to-teal-500/15 flex items-center justify-between sticky top-0 z-10">
          <h3 className="font-extrabold text-emerald-900 dark:text-emerald-200 flex items-center gap-2">
            <GraduationCap className="h-5 w-5" /> Taazgi ka safha
          </h3>
          <button onClick={onClose} className="h-8 w-8 rounded-lg hover:bg-white dark:hover:bg-slate-800 flex items-center justify-center">
            <X className="h-4 w-4 text-slate-600 dark:text-slate-300" />
          </button>
        </div>
        <div className="p-5 space-y-3 text-sm">
          <p className="font-bold text-slate-700 dark:text-slate-200">
            Bakery ka maal subah banta hai aur shaam tak na bika to raddi hai. Ye safha
            wohi nuqsaan rokne ke liye hai.
          </p>
          <Tip icon={ChefHat} title="Naya batch">
            Jab koi cheez banayein, yahan darj kar dein — kitni bani aur kitne ghante theek
            rahegi. Bas itna hi.
          </Tip>
          <Tip icon={Flame} title="Jaldi bechein">
            Jis ka waqt sab se pehle khatam ho raha hai wo sab se upar. Yehi wo maal hai jise
            aaj hi nikalna hai.
          </Tip>
          <Tip icon={Tag} title="Discount par daalo">
            Poore rate par na bik raha ho to <strong>discount par</strong> daal dein. Aadha
            paisa poore nuqsaan se behtar hai — aur record me bhi aa jata hai ke discount se
            kitna bacha.
          </Tip>
          <Tip icon={Trash2} title="Phenk diya">
            Phenkna pare to wajah ke sath darj karein. Yahi se analytics me pata chalta hai ke
            kis cheez ka batch chhota karna chahiye.
          </Tip>
          <Tip icon={Zap} title="Dobara check">
            System khud waqt dekh kar halat badal deta hai. Jaldi chahiye to ye button dabayein.
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
