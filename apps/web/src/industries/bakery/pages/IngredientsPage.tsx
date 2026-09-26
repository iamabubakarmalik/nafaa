import { useMemo, useState, useEffect, useRef } from 'react';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { Link } from 'react-router-dom';
import {
  Wheat, Plus, X, Search, RefreshCw, AlertTriangle, CheckCircle2,
  Snowflake, Truck, Phone, Trash2, Edit3, BarChart3, GraduationCap,
  FileSpreadsheet, Printer, Package, DollarSign, TrendingDown,
  ArrowDownToLine, ArrowUpFromLine, Scale, Boxes, Loader2, Copy,
  MessageCircle, Flame, Layers, ChevronDown,
} from 'lucide-react';
import {
  ResponsiveContainer, BarChart, Bar, XAxis, YAxis, Tooltip, CartesianGrid,
  PieChart, Pie, Cell, Legend,
} from 'recharts';
import { toast } from 'sonner';
import { ingredientsApi, type Ingredient } from '../api/ingredients.api';
import { formatPKR } from '@core/lib/format';
import { Button } from '@core/ui/Button';
import { useAuthStore } from '@core/stores/auth.store';

/* ═════════════════════════════════════════════════════════════
   SAAMAAN — BAKERY KA GUDAAM
   ─────────────────────────────────────────────────────────────
   Maida, cheeni, makkhan. Ye bikne ki cheezein nahi — is liye
   POS aur catalog me kabhi nazar nahi aatin.

   Teen kaam roz ke hain, aur teenon yahin se ho jate hain:
     • Kya khatam ho raha hai (aur supplier ko list bhejni hai)
     • Maal aaya — stock barhao, naya rate lagao
     • Kharab hua ya gir gaya — zaya darj karo

   Purane safhe par sirf list thi; rate barhne ka asar kahin
   nazar nahi aata tha.
   ═════════════════════════════════════════════════════════════ */

type Tab = 'list' | 'analytics';
type Filter = 'all' | 'low' | 'out' | 'critical' | 'fridge';

const CATEGORIES = [
  { value: 'FLOUR', label: 'Aata / Maida', emoji: '🌾' },
  { value: 'SUGAR', label: 'Cheeni', emoji: '🍬' },
  { value: 'DAIRY', label: 'Doodh / Cream', emoji: '🥛' },
  { value: 'EGG', label: 'Anday', emoji: '🥚' },
  { value: 'FAT', label: 'Ghee / Oil', emoji: '🫒' },
  { value: 'CHOCOLATE', label: 'Chocolate', emoji: '🍫' },
  { value: 'FRUIT', label: 'Phal / Nuts', emoji: '🍓' },
  { value: 'FLAVOR', label: 'Flavour', emoji: '🧪' },
  { value: 'DECORATION', label: 'Sajawat', emoji: '✨' },
  { value: 'PACKAGING', label: 'Packing', emoji: '📦' },
  { value: 'GENERAL', label: 'Aur koi', emoji: '🧺' },
];

const UNITS = ['kg', 'gram', 'litre', 'ml', 'packet', 'dozen', 'piece', 'bag', 'tin', 'bottle'];

const GRID = '#94a3b8';
const AXIS = '#64748b';
const PIE_COLORS = ['#8b5cf6', '#ec4899', '#f59e0b', '#10b981', '#3b82f6', '#ef4444', '#14b8a6', '#f97316'];
const TOOLTIP = {
  borderRadius: 12, border: '2px solid #cbd5e1', background: '#ffffff',
  color: '#0f172a', fontWeight: 700, fontSize: 12,
};

const fmtQty = (q: number) => Number(q || 0).toFixed(Number(q || 0) % 1 === 0 ? 0 : 2);
const catOf = (v?: string) => CATEGORIES.find((c) => c.value === v) ?? CATEGORIES[CATEGORIES.length - 1];

export default function IngredientsPage() {
  const qc = useQueryClient();
  const tenant = useAuthStore((s) => s.tenant);
  const searchRef = useRef<HTMLInputElement>(null);

  const [tab, setTab] = useState<Tab>('list');
  const [search, setSearch] = useState('');
  const [filter, setFilter] = useState<Filter>('all');
  const [categoryFilter, setCategoryFilter] = useState('all');
  const [showFilters, setShowFilters] = useState(false);
  const [showTeacher, setShowTeacher] = useState(false);
  const [editing, setEditing] = useState<Ingredient | null>(null);
  const [creating, setCreating] = useState(false);
  const [stockOn, setStockOn] = useState<{ item: Ingredient; mode: 'purchase' | 'waste' | 'adjust' } | null>(null);
  const [copied, setCopied] = useState(false);

  const listQ = useQuery({
    queryKey: ['bakery-ingredients'],
    queryFn: () => ingredientsApi.list({}),
  });

  const removeMut = useMutation({
    mutationFn: (id: string) => ingredientsApi.remove(id),
    onSuccess: () => { toast.success('Hata diya'); qc.invalidateQueries({ queryKey: ['bakery-ingredients'] }); },
    onError: (e: any) => toast.error(e?.response?.data?.message || 'Nahi hata'),
  });

  /* ── Rows ── */
  const rows = useMemo(() => {
    const list = listQ.data ?? [];
    return list.map((i) => {
      const level = Number(i.reorderLevel ?? i.minStock ?? 0);
      const have = Number(i.currentStock || 0);
      const cost = Number(i.costPerUnit || 0);
      return {
        ...i,
        level,
        have,
        cost,
        short: Math.max(level - have, 0),
        value: have * cost,
        isOut: have <= 0,
        isLow: have > 0 && have <= level,
      };
    });
  }, [listQ.data]);

  const q = search.trim().toLowerCase();
  const shown = useMemo(() => {
    let out = rows.filter((r) => r.isActive !== false);
    if (filter === 'low') out = out.filter((r) => r.isLow);
    if (filter === 'out') out = out.filter((r) => r.isOut);
    if (filter === 'critical') out = out.filter((r) => r.isCritical);
    if (filter === 'fridge') out = out.filter((r) => r.requiresRefrigeration);
    if (categoryFilter !== 'all') out = out.filter((r) => r.category === categoryFilter);
    if (q) out = out.filter((r) =>
      r.name.toLowerCase().includes(q) ||
      (r.supplierName ?? '').toLowerCase().includes(q) ||
      (r.brand ?? '').toLowerCase().includes(q));
    return [...out].sort((a, b) => {
      if (a.isOut !== b.isOut) return a.isOut ? -1 : 1;
      if (a.isLow !== b.isLow) return a.isLow ? -1 : 1;
      return a.name.localeCompare(b.name);
    });
  }, [rows, filter, categoryFilter, q]);

  /* ── Stats ── */
  const stats = useMemo(() => {
    const live = rows.filter((r) => r.isActive !== false);
    const low = live.filter((r) => r.isLow || r.isOut);
    return {
      total: live.length,
      out: live.filter((r) => r.isOut).length,
      low: live.filter((r) => r.isLow).length,
      critical: live.filter((r) => r.isCritical && (r.isLow || r.isOut)).length,
      value: live.reduce((s, r) => s + r.value, 0),
      orderCost: low.reduce((s, r) => s + r.short * r.cost, 0),
      wasted: live.reduce((s, r) => s + Number(r.totalWasted || 0) * r.cost, 0),
      consumed: live.reduce((s, r) => s + Number(r.totalConsumed || 0) * r.cost, 0),
      fridge: live.filter((r) => r.requiresRefrigeration).length,
    };
  }, [rows]);

  /* ── Charts ── */
  const categoryChart = useMemo(() => {
    const m = new Map<string, number>();
    rows.filter((r) => r.isActive !== false).forEach((r) => {
      m.set(r.category, (m.get(r.category) ?? 0) + r.value);
    });
    return [...m.entries()]
      .map(([k, v]) => ({ name: catOf(k).label, value: Math.round(v) }))
      .filter((x) => x.value > 0)
      .sort((a, b) => b.value - a.value);
  }, [rows]);

  const topValue = useMemo(
    () => [...rows].filter((r) => r.isActive !== false)
      .sort((a, b) => b.value - a.value).slice(0, 10)
      .map((r) => ({ name: r.name.slice(0, 14), value: Math.round(r.value) })),
    [rows],
  );

  const wasteChart = useMemo(
    () => [...rows].filter((r) => Number(r.totalWasted || 0) > 0)
      .sort((a, b) => Number(b.totalWasted) * b.cost - Number(a.totalWasted) * a.cost)
      .slice(0, 8)
      .map((r) => ({ name: r.name.slice(0, 14), value: Math.round(Number(r.totalWasted) * r.cost) })),
    [rows],
  );

  const healthPie = useMemo(() => ([
    { name: 'Theek hai', value: rows.filter((r) => r.isActive !== false && !r.isLow && !r.isOut).length },
    { name: 'Kam ho gaya', value: stats.low },
    { name: 'Khatam', value: stats.out },
  ].filter((x) => x.value > 0)), [rows, stats]);

  /* ── Order list ── */
  const orderText = useMemo(() => {
    const need = rows.filter((r) => r.isActive !== false && (r.isLow || r.isOut));
    const lines = need.map((r, i) => `${i + 1}. ${r.name} — ${fmtQty(r.short || r.level || 1)} ${r.unit}`);
    return [
      `🛒 *${tenant?.name || 'Bakery'}* — saamaan ki list`,
      '',
      ...lines,
      '',
      `Andazan kharcha: ${formatPKR(stats.orderCost)}`,
    ].join('\n');
  }, [rows, tenant, stats.orderCost]);

  const copyOrder = async () => {
    try {
      await navigator.clipboard.writeText(orderText);
      setCopied(true); setTimeout(() => setCopied(false), 1800);
      toast.success('List copy ho gayi');
    } catch { toast.error('Copy nahi hui'); }
  };

  const exportCsv = () => {
    const head = ['Naam', 'Category', 'Abhi hai', 'Hadd', 'Kami', 'Unit', 'Rate', 'Qeemat', 'Supplier', 'Phone', 'Fridge', 'Zaroori'];
    const body = shown.map((r) => [
      r.name, catOf(r.category).label, r.have, r.level, r.short, r.unit, r.cost,
      Math.round(r.value), r.supplierName ?? '', r.supplierPhone ?? '',
      r.requiresRefrigeration ? 'Haan' : 'Nahi', r.isCritical ? 'Haan' : 'Nahi',
    ]);
    const esc = (v: any) => `"${String(v ?? '').replace(/"/g, '""')}"`;
    const csv = [head, ...body].map((r) => r.map(esc).join(',')).join('\n');
    const url = URL.createObjectURL(new Blob(['﻿' + csv], { type: 'text/csv;charset=utf-8;' }));
    const a = document.createElement('a'); a.href = url;
    a.download = `saamaan-${new Date().toISOString().slice(0, 10)}.csv`;
    a.click(); URL.revokeObjectURL(url);
    toast.success('CSV nikal gayi');
  };

  useEffect(() => {
    const onKey = (e: KeyboardEvent) => {
      if (e.key === 'Escape') {
        if (stockOn) return setStockOn(null);
        if (editing) return setEditing(null);
        if (creating) return setCreating(false);
        if (showTeacher) return setShowTeacher(false);
        return;
      }
      const t = document.activeElement?.tagName;
      if (t === 'INPUT' || t === 'TEXTAREA' || t === 'SELECT') return;
      if (e.key === '/') { e.preventDefault(); searchRef.current?.focus(); }
      if (e.key.toLowerCase() === 'g') setShowTeacher(true);
      if (e.key.toLowerCase() === 'a') setTab((x) => (x === 'analytics' ? 'list' : 'analytics'));
      if (e.key.toLowerCase() === 'n') setCreating(true);
      if (e.key.toLowerCase() === 'p') window.print();
    };
    window.addEventListener('keydown', onKey);
    return () => window.removeEventListener('keydown', onKey);
  }, [stockOn, editing, creating, showTeacher]);

  const activeFilters = [filter !== 'all', categoryFilter !== 'all'].filter(Boolean).length;

  return (
    <div className="space-y-4 sm:space-y-5 pb-10">
      <div className="hidden print:block mb-4">
        <h1 className="text-xl font-extrabold">{tenant?.name || 'Bakery'} — Saamaan</h1>
        <p className="text-xs text-slate-600">{new Date().toLocaleString('en-PK', { dateStyle: 'full', timeStyle: 'short' })}</p>
      </div>

      {/* ═══ HERO ═══ */}
      <section className="relative overflow-hidden rounded-3xl bg-gradient-to-br from-slate-950 via-violet-900 to-purple-700 text-white p-5 sm:p-6 shadow-2xl print:hidden">
        <div className="absolute -top-24 -right-20 h-72 w-72 rounded-full bg-violet-400/25 blur-3xl" />
        <div className="absolute inset-0 opacity-[0.06]"
          style={{ backgroundImage: 'radial-gradient(circle at 1px 1px, #fff 1px, transparent 0)', backgroundSize: '22px 22px' }} />
        <div className="relative flex items-start justify-between gap-4 flex-wrap">
          <div className="min-w-0">
            <div className="inline-flex items-center gap-2 rounded-full bg-white/15 backdrop-blur px-3 py-1 text-[11px] font-black border border-white/25 uppercase tracking-widest">
              <Wheat className="h-3.5 w-3.5 text-violet-300" /> Bakery · Gudaam
            </div>
            <h1 className="mt-3 text-2xl sm:text-3xl lg:text-4xl font-black leading-tight">🌾 Banane ka Saamaan</h1>
            <p className="mt-1.5 text-xs sm:text-sm font-bold text-white/90">
              <strong className="text-white">{formatPKR(stats.value)}</strong> ka para hua ·{' '}
              <strong className="text-rose-200">{stats.out}</strong> khatam ·{' '}
              <strong className="text-amber-200">{stats.low}</strong> kam ho raha
            </p>
          </div>
          <div className="flex gap-2 flex-wrap items-center shrink-0">
            <button onClick={() => setCreating(true)}
              className="h-11 px-3.5 rounded-xl bg-white text-violet-700 hover:bg-violet-50 text-xs font-black inline-flex items-center gap-1.5 shadow-lg transition">
              <Plus className="h-4 w-4" /> Naya saamaan
            </button>
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
        <Kpi icon={Boxes} label="Gudaam ki qeemat" value={formatPKR(stats.value)} sub={`${stats.total} cheezein`} tone="violet" />
        <Kpi icon={AlertTriangle} label="Mangwana hai" value={formatPKR(stats.orderCost)}
          sub={`${stats.out + stats.low} cheezein kam`} tone="amber"
          onClick={() => { setFilter('low'); setTab('list'); }} />
        <Kpi icon={Flame} label="Zaya hua" value={formatPKR(stats.wasted)} sub="Ab tak ka nuqsaan" tone="rose" />
        <Kpi icon={Snowflake} label="Fridge wale" value={stats.fridge} sub={`${stats.critical} zaroori cheez kam hai`} tone="sky"
          onClick={() => { setFilter('fridge'); setTab('list'); }} />
      </section>

      {/* ═══ ORDER BANNER ═══ */}
      {(stats.out + stats.low) > 0 && (
        <section className="rounded-3xl bg-gradient-to-br from-amber-50 to-orange-50 dark:from-amber-500/10 dark:to-orange-500/10 border-2 border-amber-200 dark:border-amber-500/30 p-4 flex items-center gap-3 flex-wrap print:hidden">
          <AlertTriangle className="h-5 w-5 text-amber-600 shrink-0" />
          <p className="text-sm font-extrabold text-amber-900 dark:text-amber-200 min-w-0 flex-1">
            <strong>{stats.out + stats.low}</strong> cheezein mangwani hain — andazan{' '}
            <strong>{formatPKR(stats.orderCost)}</strong> ka kharcha
            {stats.critical > 0 && <span className="text-rose-700 dark:text-rose-300"> · {stats.critical} zaroori cheez khatam hai</span>}
          </p>
          <div className="flex gap-1.5">
            <button onClick={copyOrder}
              className="h-10 px-3 rounded-xl bg-white dark:bg-slate-800 border-2 border-amber-300 dark:border-amber-500/40 text-xs font-black text-amber-800 dark:text-amber-200 inline-flex items-center gap-1.5 transition">
              {copied ? <CheckCircle2 className="h-4 w-4 text-emerald-500" /> : <Copy className="h-4 w-4" />}
              {copied ? 'Copy hui' : 'List copy'}
            </button>
            <a href={`https://wa.me/?text=${encodeURIComponent(orderText)}`} target="_blank" rel="noreferrer"
              className="h-10 px-3 rounded-xl bg-emerald-600 hover:bg-emerald-700 text-white text-xs font-black inline-flex items-center gap-1.5 transition">
              <MessageCircle className="h-4 w-4" /> WhatsApp
            </a>
          </div>
        </section>
      )}

      {/* ═══ TABS ═══ */}
      <div className="grid grid-cols-2 gap-2 sm:gap-3 print:hidden">
        {([['list', 'Saamaan', Wheat], ['analytics', 'Analytics', BarChart3]] as const).map(([v, label, Icon]) => (
          <button key={v} onClick={() => setTab(v as Tab)}
            className={`h-14 rounded-2xl border-2 font-black text-sm inline-flex items-center justify-center gap-2 transition ${
              tab === v
                ? 'bg-gradient-to-r from-violet-500 to-purple-600 text-white border-transparent shadow-lg'
                : 'bg-white dark:bg-slate-900 text-slate-600 dark:text-slate-300 border-slate-200 dark:border-slate-800 hover:border-violet-400'
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
          <section className="rounded-3xl bg-white dark:bg-slate-900 border-2 border-slate-200 dark:border-slate-800 shadow-sm p-3 sm:p-4 space-y-3 print:hidden">
            <div className="flex gap-2 flex-wrap items-center">
              <div className="relative flex-1 min-w-[220px]">
                <Search className="h-5 w-5 text-slate-400 absolute left-3.5 top-1/2 -translate-y-1/2 pointer-events-none" />
                <input ref={searchRef} value={search} onChange={(e) => setSearch(e.target.value)}
                  placeholder="Naam, supplier, brand… (/ dabao)"
                  className="h-12 w-full rounded-2xl border-2 border-slate-200 dark:border-slate-700 bg-white dark:bg-slate-800 pl-11 pr-10 text-sm font-bold text-slate-900 dark:text-white placeholder:text-slate-400 focus:outline-none focus:border-violet-500 transition" />
                {search && (
                  <button onClick={() => setSearch('')} className="absolute right-3 top-1/2 -translate-y-1/2 h-7 w-7 rounded-lg hover:bg-slate-100 dark:hover:bg-slate-700 flex items-center justify-center">
                    <X className="h-4 w-4 text-slate-400" />
                  </button>
                )}
              </div>
              <button onClick={() => setShowFilters((v) => !v)}
                className={`h-12 px-4 rounded-2xl border-2 text-sm font-black inline-flex items-center gap-2 transition ${
                  activeFilters > 0
                    ? 'border-violet-500 bg-violet-50 dark:bg-violet-500/15 text-violet-700 dark:text-violet-300'
                    : 'border-slate-200 dark:border-slate-700 bg-white dark:bg-slate-800 text-slate-700 dark:text-slate-200 hover:border-violet-400'
                }`}>
                <Layers className="h-4 w-4" /> Chaant
                {activeFilters > 0 && <span className="text-[10px] px-1.5 py-0.5 rounded-lg bg-violet-600 text-white">{activeFilters}</span>}
                <ChevronDown className={`h-4 w-4 transition ${showFilters ? 'rotate-180' : ''}`} />
              </button>
            </div>

            <div className="flex gap-1.5 flex-wrap">
              {([['all', 'Sab'], ['low', '🟡 Kam ho gaya'], ['out', '🔴 Khatam'], ['critical', '⚠️ Zaroori'], ['fridge', '❄️ Fridge']] as const).map(([v, l]) => (
                <button key={v} onClick={() => setFilter(v as Filter)}
                  className={`h-10 px-3 rounded-xl border-2 text-[11px] font-black transition ${
                    filter === v
                      ? 'border-violet-500 bg-violet-50 dark:bg-violet-500/15 text-violet-700 dark:text-violet-300'
                      : 'border-slate-200 dark:border-slate-700 bg-white dark:bg-slate-800 text-slate-600 dark:text-slate-300 hover:border-violet-400'
                  }`}>{l}</button>
              ))}
            </div>

            {showFilters && (
              <div className="pt-2 border-t-2 border-slate-100 dark:border-slate-800">
                <label className="block text-[10px] font-black uppercase tracking-widest text-slate-500 mb-1.5">Category</label>
                <div className="flex gap-1.5 flex-wrap">
                  <button onClick={() => setCategoryFilter('all')}
                    className={`h-9 px-2.5 rounded-lg border-2 text-[11px] font-black transition ${
                      categoryFilter === 'all' ? 'border-violet-500 bg-violet-50 dark:bg-violet-500/15 text-violet-700' : 'border-slate-200 dark:border-slate-700 text-slate-600 dark:text-slate-300'
                    }`}>Sab</button>
                  {CATEGORIES.map((c) => (
                    <button key={c.value} onClick={() => setCategoryFilter(c.value)}
                      className={`h-9 px-2.5 rounded-lg border-2 text-[11px] font-black inline-flex items-center gap-1 transition ${
                        categoryFilter === c.value ? 'border-violet-500 bg-violet-50 dark:bg-violet-500/15 text-violet-700' : 'border-slate-200 dark:border-slate-700 text-slate-600 dark:text-slate-300'
                      }`}>{c.emoji} {c.label}</button>
                  ))}
                </div>
              </div>
            )}
          </section>

          {listQ.isLoading ? (
            <div className="flex items-center justify-center py-24">
              <div className="h-12 w-12 rounded-full border-4 border-violet-200 border-t-violet-600 animate-spin" />
            </div>
          ) : shown.length === 0 ? (
            <div className="rounded-3xl bg-white dark:bg-slate-900 border-4 border-dashed border-slate-200 dark:border-slate-700 p-10 sm:p-14 text-center">
              <div className="h-16 w-16 rounded-3xl bg-violet-100 dark:bg-violet-500/20 mx-auto flex items-center justify-center">
                <Wheat className="h-8 w-8 text-violet-600 dark:text-violet-400" />
              </div>
              <p className="mt-4 font-black text-slate-800 dark:text-slate-100 text-lg sm:text-xl">
                {search || activeFilters > 0 ? 'Kuch nahi mila' : 'Abhi koi saamaan nahi'}
              </p>
              <p className="text-xs sm:text-sm text-slate-500 dark:text-slate-400 font-bold mt-1.5 max-w-md mx-auto">
                Maida, cheeni, makkhan daalein — phir cake ki recipe me lag sakenge aur khatam
                hone par khud warning aa jayegi.
              </p>
              <Button className="mt-4 bg-violet-600 hover:bg-violet-700" onClick={() => setCreating(true)}>
                <Plus className="h-4 w-4" /> Naya saamaan
              </Button>
            </div>
          ) : (
            <section className="rounded-3xl bg-white dark:bg-slate-900 border-2 border-slate-200 dark:border-slate-800 shadow-sm overflow-hidden">
              <div className="divide-y divide-slate-100 dark:divide-slate-800">
                {shown.map((r) => {
                  const cat = catOf(r.category);
                  return (
                    <div key={r.id} className="p-3 sm:p-4 hover:bg-slate-50 dark:hover:bg-slate-800/40 transition avoid-break">
                      <div className="flex items-center gap-3 flex-wrap">
                        <span className={`h-11 w-11 rounded-2xl flex items-center justify-center shrink-0 text-lg ${
                          r.isOut ? 'bg-rose-100 dark:bg-rose-500/20' : r.isLow ? 'bg-amber-100 dark:bg-amber-500/20' : 'bg-violet-100 dark:bg-violet-500/20'
                        }`}>{cat.emoji}</span>

                        <div className="min-w-0 flex-1">
                          <div className="flex items-center gap-1.5 flex-wrap">
                            <span className="font-extrabold text-sm text-slate-900 dark:text-white truncate">{r.name}</span>
                            {r.isCritical && <Chip tone="rose">Zaroori</Chip>}
                            {r.requiresRefrigeration && <Chip tone="sky"><Snowflake className="h-2.5 w-2.5" /> Fridge</Chip>}
                            {r.isOut && <Chip tone="rose">Khatam</Chip>}
                            {r.isLow && <Chip tone="amber">Kam ho gaya</Chip>}
                          </div>
                          <div className="text-[11px] font-bold text-slate-400 mt-0.5 truncate">
                            {formatPKR(r.cost)} / {r.unit}
                            {r.supplierName ? ` · ${r.supplierName}` : ''}
                            {r.level > 0 ? ` · hadd ${fmtQty(r.level)}` : ''}
                          </div>
                        </div>

                        <div className="text-right shrink-0">
                          <div className={`text-lg font-black tabular-nums ${
                            r.isOut ? 'text-rose-600' : r.isLow ? 'text-amber-600' : 'text-slate-900 dark:text-white'
                          }`}>{fmtQty(r.have)} <span className="text-xs">{r.unit}</span></div>
                          <div className="text-[10px] font-bold text-slate-400 tabular-nums">{formatPKR(r.value)}</div>
                        </div>
                      </div>

                      <div className="mt-2.5 flex gap-1.5 flex-wrap print:hidden">
                        <button onClick={() => setStockOn({ item: r, mode: 'purchase' })}
                          className="h-9 px-3 rounded-xl bg-emerald-600 hover:bg-emerald-700 text-white text-[11px] font-black inline-flex items-center gap-1.5 transition">
                          <ArrowDownToLine className="h-3.5 w-3.5" /> Maal aaya
                        </button>
                        <button onClick={() => setStockOn({ item: r, mode: 'waste' })}
                          className="h-9 px-3 rounded-xl border-2 border-rose-200 dark:border-rose-500/30 text-rose-600 dark:text-rose-400 text-[11px] font-black inline-flex items-center gap-1.5 hover:bg-rose-50 dark:hover:bg-rose-500/10 transition">
                          <Trash2 className="h-3.5 w-3.5" /> Zaya hua
                        </button>
                        <button onClick={() => setStockOn({ item: r, mode: 'adjust' })}
                          className="h-9 px-3 rounded-xl border-2 border-slate-200 dark:border-slate-700 text-slate-600 dark:text-slate-300 text-[11px] font-black inline-flex items-center gap-1.5 hover:border-violet-400 transition">
                          <Scale className="h-3.5 w-3.5" /> Gin kar theek
                        </button>
                        <button onClick={() => setEditing(r)}
                          className="h-9 px-3 rounded-xl border-2 border-slate-200 dark:border-slate-700 text-slate-600 dark:text-slate-300 text-[11px] font-black inline-flex items-center gap-1.5 hover:border-violet-400 transition">
                          <Edit3 className="h-3.5 w-3.5" /> Edit
                        </button>
                        {r.supplierPhone && (
                          <a href={`https://wa.me/${r.supplierPhone.replace(/\D/g, '')}?text=${encodeURIComponent(`Assalam o alaikum, ${r.name} chahiye — ${fmtQty(r.short || r.level || 1)} ${r.unit}`)}`}
                            target="_blank" rel="noreferrer"
                            className="h-9 px-3 rounded-xl bg-emerald-50 dark:bg-emerald-500/15 text-emerald-700 dark:text-emerald-300 text-[11px] font-black inline-flex items-center gap-1.5 transition">
                            <Phone className="h-3.5 w-3.5" /> Supplier
                          </a>
                        )}
                        <button onClick={() => { if (confirm(`"${r.name}" hata dein?`)) removeMut.mutate(r.id); }}
                          className="h-9 w-9 rounded-xl border-2 border-slate-200 dark:border-slate-700 flex items-center justify-center hover:border-rose-400 ml-auto transition">
                          <Trash2 className="h-3.5 w-3.5 text-rose-500" />
                        </button>
                      </div>
                    </div>
                  );
                })}
              </div>
            </section>
          )}
        </>
      ) : (
        <div className="grid lg:grid-cols-2 gap-4">
          <ChartCard icon={Layers} title="Kis category me kitna paisa">
            {categoryChart.length > 0 ? (
              <ResponsiveContainer width="100%" height="100%">
                <PieChart>
                  <Pie data={categoryChart} dataKey="value" nameKey="name" innerRadius={55} outerRadius={90} paddingAngle={3}>
                    {categoryChart.map((_, i) => <Cell key={i} fill={PIE_COLORS[i % PIE_COLORS.length]} />)}
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

          <ChartCard icon={DollarSign} title="Sab se zyada paisa kis saamaan me" wide>
            {topValue.length > 0 ? (
              <ResponsiveContainer width="100%" height="100%">
                <BarChart data={topValue}>
                  <CartesianGrid strokeDasharray="3 3" stroke={GRID} vertical={false} />
                  <XAxis dataKey="name" stroke={AXIS} fontSize={10} fontWeight={700} interval={0} angle={-20} textAnchor="end" height={60} />
                  <YAxis stroke={AXIS} fontSize={11} width={78} tickFormatter={(v) => Number(v).toLocaleString('en-PK')} />
                  <Tooltip contentStyle={TOOLTIP} formatter={(v: any) => [formatPKR(Number(v)), 'Qeemat']} />
                  <Bar dataKey="value" fill="#8b5cf6" radius={[8, 8, 0, 0]} maxBarSize={56} />
                </BarChart>
              </ResponsiveContainer>
            ) : <EmptyBox />}
          </ChartCard>

          <ChartCard icon={TrendingDown} title="Kis saamaan ka zaya sab se zyada" wide>
            {wasteChart.length > 0 ? (
              <ResponsiveContainer width="100%" height="100%">
                <BarChart data={wasteChart}>
                  <CartesianGrid strokeDasharray="3 3" stroke={GRID} vertical={false} />
                  <XAxis dataKey="name" stroke={AXIS} fontSize={10} fontWeight={700} interval={0} angle={-20} textAnchor="end" height={60} />
                  <YAxis stroke={AXIS} fontSize={11} width={78} tickFormatter={(v) => Number(v).toLocaleString('en-PK')} />
                  <Tooltip contentStyle={TOOLTIP} formatter={(v: any) => [formatPKR(Number(v)), 'Nuqsaan']} />
                  <Bar dataKey="value" fill="#ef4444" radius={[8, 8, 0, 0]} maxBarSize={56} />
                </BarChart>
              </ResponsiveContainer>
            ) : <EmptyBox text="Abhi tak kuch zaya nahi hua — shabash" />}
          </ChartCard>
        </div>
      )}

      {(creating || editing) && (
        <IngredientForm
          item={editing}
          onClose={() => { setCreating(false); setEditing(null); }}
          onDone={() => { setCreating(false); setEditing(null); qc.invalidateQueries({ queryKey: ['bakery-ingredients'] }); }}
        />
      )}
      {stockOn && (
        <StockModal item={stockOn.item} mode={stockOn.mode}
          onClose={() => setStockOn(null)}
          onDone={() => { setStockOn(null); qc.invalidateQueries({ queryKey: ['bakery-ingredients'] }); }} />
      )}
      {showTeacher && <Teacher onClose={() => setShowTeacher(false)} />}
    </div>
  );
}

/* ═══ FORM ═══ */
function IngredientForm({ item, onClose, onDone }: any) {
  const isEdit = Boolean(item);
  const [f, setF] = useState({
    name: item?.name ?? '',
    category: item?.category ?? 'GENERAL',
    unit: item?.unit ?? 'kg',
    costPerUnit: item?.costPerUnit ?? '',
    currentStock: item?.currentStock ?? '',
    minStock: item?.minStock ?? '',
    supplierName: item?.supplierName ?? '',
    supplierPhone: item?.supplierPhone ?? '',
    shelfLifeDays: item?.shelfLifeDays ?? '',
    requiresRefrigeration: item?.requiresRefrigeration ?? false,
    isCritical: item?.isCritical ?? false,
    notes: item?.notes ?? '',
  });
  const set = (p: any) => setF((x) => ({ ...x, ...p }));

  const mut = useMutation({
    mutationFn: () => {
      const payload: any = {
        name: f.name.trim(),
        category: f.category,
        unit: f.unit,
        costPerUnit: Number(f.costPerUnit) || 0,
        minStock: Number(f.minStock) || 0,
        supplierName: f.supplierName || undefined,
        supplierPhone: f.supplierPhone || undefined,
        shelfLifeDays: f.shelfLifeDays === '' ? undefined : Number(f.shelfLifeDays),
        requiresRefrigeration: f.requiresRefrigeration,
        isCritical: f.isCritical,
        notes: f.notes || undefined,
      };
      /* Stock sirf naya banate waqt. Edit me haath lagayenge to
         gudaam ka asal number ur jayega — us ke liye "Maal aaya"
         aur "Gin kar theek" ke apne raaste hain. */
      if (!isEdit) payload.currentStock = Number(f.currentStock) || 0;
      return isEdit ? ingredientsApi.update(item.id, payload) : ingredientsApi.create(payload);
    },
    onSuccess: () => { toast.success(isEdit ? 'Update ho gaya' : 'Saamaan ban gaya'); onDone(); },
    onError: (e: any) => toast.error(e?.response?.data?.message || 'Save nahi hua'),
  });

  const bad = !f.name.trim() || Number(f.costPerUnit) <= 0;

  return (
    <div className="fixed inset-0 z-50 bg-black/60 backdrop-blur-sm flex items-end sm:items-center justify-center p-3" onClick={onClose}>
      <div className="w-full max-w-md max-h-[90vh] overflow-y-auto rounded-3xl bg-white dark:bg-slate-900 border-2 border-violet-300 dark:border-violet-500/40 shadow-2xl" onClick={(e) => e.stopPropagation()}>
        <div className="px-5 py-3 border-b-2 border-violet-200 dark:border-violet-500/30 bg-gradient-to-r from-violet-50 to-purple-50 dark:from-violet-500/15 dark:to-purple-500/15 flex items-center justify-between sticky top-0 z-10">
          <h3 className="font-extrabold text-violet-900 dark:text-violet-200 flex items-center gap-2">
            <Wheat className="h-5 w-5" /> {isEdit ? 'Saamaan edit karein' : 'Naya saamaan'}
          </h3>
          <button onClick={onClose} className="h-8 w-8 rounded-lg hover:bg-white dark:hover:bg-slate-800 flex items-center justify-center">
            <X className="h-4 w-4 text-slate-600 dark:text-slate-300" />
          </button>
        </div>

        <div className="p-5 space-y-3">
          <Field label="Naam *">
            <input value={f.name} onChange={(e) => set({ name: e.target.value })} autoFocus
              placeholder="Maida, Cheeni, Makkhan…" className={inp} />
          </Field>

          <Field label="Kis qism ka">
            <div className="grid grid-cols-3 gap-1.5">
              {CATEGORIES.map((c) => (
                <button key={c.value} onClick={() => set({ category: c.value })}
                  className={`h-10 px-1 rounded-lg border-2 text-[10px] font-black inline-flex items-center justify-center gap-1 transition ${
                    f.category === c.value ? 'border-violet-500 bg-violet-50 dark:bg-violet-500/15 text-violet-700 dark:text-violet-300' : 'border-slate-200 dark:border-slate-700 text-slate-600 dark:text-slate-300'
                  }`}>{c.emoji} <span className="truncate">{c.label}</span></button>
              ))}
            </div>
          </Field>

          <div className="grid grid-cols-2 gap-3">
            <Field label="Unit *">
              <select value={f.unit} onChange={(e) => set({ unit: e.target.value })} className={inp}>
                {UNITS.map((u) => <option key={u} value={u}>{u}</option>)}
              </select>
            </Field>
            <Field label={`Ek ${f.unit} ka rate *`}>
              <input type="number" min={0} step="any" value={f.costPerUnit}
                onChange={(e) => set({ costPerUnit: e.target.value === '' ? '' : Number(e.target.value) })} className={inp} />
            </Field>
          </div>

          <div className="grid grid-cols-2 gap-3">
            {!isEdit && (
              <Field label="Abhi kitna hai">
                <input type="number" min={0} step="any" value={f.currentStock}
                  onChange={(e) => set({ currentStock: e.target.value === '' ? '' : Number(e.target.value) })} className={inp} />
              </Field>
            )}
            <Field label="Itna reh jaye to batao">
              <input type="number" min={0} step="any" value={f.minStock}
                onChange={(e) => set({ minStock: e.target.value === '' ? '' : Number(e.target.value) })} className={inp} />
            </Field>
          </div>

          {isEdit && (
            <p className="text-[11px] font-bold text-slate-500 dark:text-slate-400 -mt-1">
              Stock yahan se nahi badalta — "Maal aaya" ya "Gin kar theek" se badlein, taake
              record me wajah bhi aa jaye.
            </p>
          )}

          <div className="grid grid-cols-2 gap-3">
            <Field label="Supplier"><input value={f.supplierName} onChange={(e) => set({ supplierName: e.target.value })} className={inp} /></Field>
            <Field label="WhatsApp"><input value={f.supplierPhone} onChange={(e) => set({ supplierPhone: e.target.value })} placeholder="03001234567" className={inp} /></Field>
          </div>

          <Field label="Kitne din theek rehta hai">
            <input type="number" min={0} value={f.shelfLifeDays}
              onChange={(e) => set({ shelfLifeDays: e.target.value === '' ? '' : Number(e.target.value) })} className={inp} />
          </Field>

          <div className="grid grid-cols-2 gap-2">
            <Toggle icon={Snowflake} label="Fridge chahiye" value={f.requiresRefrigeration} onChange={(v: boolean) => set({ requiresRefrigeration: v })} />
            <Toggle icon={AlertTriangle} label="Bagair kaam nahi chalta" value={f.isCritical} onChange={(v: boolean) => set({ isCritical: v })} />
          </div>

          <Field label="Note"><input value={f.notes} onChange={(e) => set({ notes: e.target.value })} className={inp} /></Field>

          <div className="flex gap-2 pt-1">
            <Button variant="secondary" className="flex-1" onClick={onClose}>Rehne dein</Button>
            <Button className="flex-[2] bg-violet-600 hover:bg-violet-700" disabled={bad} loading={mut.isPending} onClick={() => mut.mutate()}>
              <CheckCircle2 className="h-4 w-4" /> {isEdit ? 'Save karein' : 'Banao'}
            </Button>
          </div>
        </div>
      </div>
    </div>
  );
}

/* ═══ STOCK MODAL ═══ */
function StockModal({ item, mode, onClose, onDone }: any) {
  const [qty, setQty] = useState<number | ''>('');
  const [rate, setRate] = useState<number | ''>(item.costPerUnit ?? '');
  const [vendor, setVendor] = useState(item.supplierName ?? '');
  const [reason, setReason] = useState('');
  const [newStock, setNewStock] = useState<number | ''>(item.currentStock ?? 0);

  const cfg = {
    purchase: { title: 'Maal aaya', tone: 'bg-emerald-600 hover:bg-emerald-700', icon: ArrowDownToLine },
    waste:    { title: 'Zaya hua', tone: 'bg-rose-600 hover:bg-rose-700', icon: Trash2 },
    adjust:   { title: 'Gin kar theek karein', tone: 'bg-violet-600 hover:bg-violet-700', icon: Scale },
  }[mode as 'purchase' | 'waste' | 'adjust'];

  const mut = useMutation({
    mutationFn: () => {
      if (mode === 'purchase') {
        return ingredientsApi.purchase(item.id, {
          quantity: Number(qty) || 0,
          costPerUnit: Number(rate) || 0,
          vendorName: vendor || undefined,
        });
      }
      if (mode === 'waste') {
        return ingredientsApi.waste(item.id, { quantity: Number(qty) || 0, reason: reason || 'Kharab ho gaya' });
      }
      return ingredientsApi.adjust(item.id, { newStock: Number(newStock) || 0, reason: reason || 'Gin kar theek kiya' });
    },
    onSuccess: () => { toast.success('Darj ho gaya'); onDone(); },
    onError: (e: any) => toast.error(e?.response?.data?.message || 'Nahi ho saka'),
  });

  const bad = mode === 'adjust'
    ? newStock === '' || Number(newStock) < 0 || !reason.trim()
    : qty === '' || Number(qty) <= 0 || (mode === 'waste' && !reason.trim());

  const Icon = cfg.icon;
  const rateChanged = mode === 'purchase' && rate !== '' && Number(rate) !== Number(item.costPerUnit);

  return (
    <div className="fixed inset-0 z-50 bg-black/60 backdrop-blur-sm flex items-end sm:items-center justify-center p-3" onClick={onClose}>
      <div className="w-full max-w-sm rounded-3xl bg-white dark:bg-slate-900 border-2 border-slate-200 dark:border-slate-700 shadow-2xl p-5" onClick={(e) => e.stopPropagation()}>
        <div className="flex items-center gap-2.5">
          <span className="h-10 w-10 rounded-2xl bg-slate-100 dark:bg-slate-800 flex items-center justify-center">
            <Icon className="h-5 w-5 text-slate-600 dark:text-slate-300" />
          </span>
          <div className="min-w-0">
            <h3 className="font-black text-slate-900 dark:text-white">{cfg.title}</h3>
            <p className="text-[11px] font-bold text-slate-500 truncate">
              {item.name} · abhi {fmtQty(Number(item.currentStock))} {item.unit}
            </p>
          </div>
        </div>

        <div className="mt-4 space-y-3">
          {mode === 'adjust' ? (
            <Field label={`Gin kar kitna nikla (${item.unit})`}>
              <input type="number" min={0} step="any" autoFocus value={newStock}
                onChange={(e) => setNewStock(e.target.value === '' ? '' : Number(e.target.value))}
                className="h-14 w-full rounded-2xl border-2 border-slate-200 dark:border-slate-700 bg-white dark:bg-slate-800 px-3 text-2xl font-black text-center tabular-nums text-slate-900 dark:text-white focus:outline-none focus:border-violet-500" />
            </Field>
          ) : (
            <Field label={`Kitna (${item.unit})`}>
              <input type="number" min={0} step="any" autoFocus value={qty}
                onChange={(e) => setQty(e.target.value === '' ? '' : Number(e.target.value))}
                className="h-14 w-full rounded-2xl border-2 border-slate-200 dark:border-slate-700 bg-white dark:bg-slate-800 px-3 text-2xl font-black text-center tabular-nums text-slate-900 dark:text-white focus:outline-none focus:border-violet-500" />
            </Field>
          )}

          {mode === 'purchase' && (
            <>
              <Field label={`Ab ek ${item.unit} kitne ka aaya`}>
                <input type="number" min={0} step="any" value={rate}
                  onChange={(e) => setRate(e.target.value === '' ? '' : Number(e.target.value))} className={inp} />
              </Field>
              {rateChanged && (
                <div className="rounded-xl bg-amber-50 dark:bg-amber-500/10 border-2 border-amber-200 dark:border-amber-500/30 p-2.5 flex gap-2">
                  <AlertTriangle className="h-4 w-4 text-amber-600 shrink-0 mt-0.5" />
                  <p className="text-[11px] font-bold text-amber-900 dark:text-amber-200">
                    Rate {formatPKR(item.costPerUnit)} se {formatPKR(Number(rate))} ho gaya. Jin cheezon
                    ki recipe me ye saamaan lagta hai, un ki cost bhi dobara dekh lein.
                  </p>
                </div>
              )}
              <Field label="Kahan se aaya"><input value={vendor} onChange={(e) => setVendor(e.target.value)} className={inp} /></Field>
            </>
          )}

          {(mode === 'waste' || mode === 'adjust') && (
            <Field label="Wajah *">
              <input value={reason} onChange={(e) => setReason(e.target.value)}
                placeholder={mode === 'waste' ? 'Kharab ho gaya, gir gaya…' : 'Ginti me farq nikla'} className={inp} />
            </Field>
          )}
        </div>

        <div className="mt-4 flex gap-2">
          <Button variant="secondary" className="flex-1" onClick={onClose}>Rehne dein</Button>
          <Button className={`flex-[2] ${cfg.tone}`} disabled={bad} loading={mut.isPending} onClick={() => mut.mutate()}>
            Darj karein
          </Button>
        </div>
      </div>
    </div>
  );
}

/* ═══ CHHOTE HISSE ═══ */
const inp = 'h-11 w-full rounded-xl border-2 border-slate-200 dark:border-slate-700 bg-white dark:bg-slate-800 px-3 text-sm font-bold text-slate-900 dark:text-white focus:outline-none focus:border-violet-500';

function Field({ label, children }: any) {
  return (
    <div>
      <label className="block text-[11px] font-black uppercase tracking-widest text-slate-500 mb-1.5">{label}</label>
      {children}
    </div>
  );
}

function Toggle({ icon: Icon, label, value, onChange }: any) {
  return (
    <button type="button" onClick={() => onChange(!value)}
      className={`text-left rounded-xl border-2 p-2.5 flex items-center gap-2 transition ${
        value ? 'border-violet-500 bg-violet-50 dark:bg-violet-500/10' : 'border-slate-200 dark:border-slate-700 bg-white dark:bg-slate-800'
      }`}>
      <span className={`h-8 w-8 rounded-lg flex items-center justify-center shrink-0 ${
        value ? 'bg-violet-600 text-white' : 'bg-slate-100 dark:bg-slate-700 text-slate-500'
      }`}><Icon className="h-4 w-4" /></span>
      <span className="text-[11px] font-extrabold text-slate-900 dark:text-white leading-tight">{label}</span>
    </button>
  );
}

function Chip({ tone, children }: any) {
  const tones: Record<string, string> = {
    rose: 'bg-rose-100 dark:bg-rose-500/20 text-rose-700 dark:text-rose-300',
    amber: 'bg-amber-100 dark:bg-amber-500/20 text-amber-700 dark:text-amber-300',
    sky: 'bg-sky-100 dark:bg-sky-500/20 text-sky-700 dark:text-sky-300',
  };
  return <span className={`text-[9px] font-black uppercase px-1.5 py-0.5 rounded-md inline-flex items-center gap-1 ${tones[tone]}`}>{children}</span>;
}

function Kpi({ icon: Icon, label, value, sub, tone, onClick }: any) {
  const tones: Record<string, string> = {
    violet: 'from-violet-500 to-purple-600 shadow-violet-500/40',
    amber: 'from-amber-500 to-orange-600 shadow-amber-500/40',
    rose: 'from-rose-500 to-red-600 shadow-rose-500/40',
    sky: 'from-sky-500 to-blue-600 shadow-sky-500/40',
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
        <div className="px-5 py-3 border-b-2 border-violet-200 dark:border-violet-500/30 bg-gradient-to-r from-violet-50 to-purple-50 dark:from-violet-500/15 dark:to-purple-500/15 flex items-center justify-between sticky top-0 z-10">
          <h3 className="font-extrabold text-violet-900 dark:text-violet-200 flex items-center gap-2">
            <GraduationCap className="h-5 w-5" /> Saamaan ka safha
          </h3>
          <button onClick={onClose} className="h-8 w-8 rounded-lg hover:bg-white dark:hover:bg-slate-800 flex items-center justify-center">
            <X className="h-4 w-4 text-slate-600 dark:text-slate-300" />
          </button>
        </div>
        <div className="p-5 space-y-3 text-sm">
          <p className="font-bold text-slate-700 dark:text-slate-200">
            Maida, cheeni, makkhan. <strong>Ye bikne ki cheezein nahi</strong> — POS aur catalog
            me kabhi nazar nahi aatin.
          </p>
          <Tip icon={ArrowDownToLine} title="Maal aaya">
            Supplier se saamaan aaye to yahan darj karein. Naya rate bhi wahin likh dein — rate
            badla to system aap ko bata dega ke jin cheezon ki recipe me ye lagta hai, un ki cost
            dobara dekhni chahiye.
          </Tip>
          <Tip icon={Trash2} title="Zaya hua">
            Kharab ho gaya ya gir gaya to wajah ke sath darj karein. Analytics me pata chal jata
            hai ke kis saamaan ka zaya sab se zyada hai.
          </Tip>
          <Tip icon={Scale} title="Gin kar theek">
            Mahine me ek baar gudaam gin lein. Ginti aur system me farq ho to yahan se theek
            karein — wajah ke sath, taake record saaf rahe.
          </Tip>
          <Tip icon={MessageCircle} title="Supplier ko list">
            Upar wali patti se poori list ek click me WhatsApp par. Har cheez ka apna supplier
            number ho to us ke saamne seedha button bhi aa jata hai.
          </Tip>
          <Tip icon={AlertTriangle} title="Zaroori cheez">
            "Bagair kaam nahi chalta" laga dein — khatam hone par sab se upar aayegi.
          </Tip>
          <div className="rounded-2xl bg-slate-50 dark:bg-slate-800 p-3">
            <div className="text-[10px] font-black uppercase tracking-widest text-slate-500 mb-2">Shortcuts</div>
            <div className="grid grid-cols-2 gap-1.5 text-[11px] font-bold text-slate-600 dark:text-slate-300">
              <div><kbd className="px-1.5 py-0.5 rounded bg-white dark:bg-slate-900 border">N</kbd> naya saamaan</div>
              <div><kbd className="px-1.5 py-0.5 rounded bg-white dark:bg-slate-900 border">/</kbd> dhoondo</div>
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
