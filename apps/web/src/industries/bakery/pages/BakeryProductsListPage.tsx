import { useMemo, useState, useEffect, useRef } from 'react';
import { Link } from 'react-router-dom';
import { useQuery } from '@tanstack/react-query';
import {
  Cake, Search, X, RefreshCw, Plus, Package, ChefHat, ShoppingBag,
  Wheat, Timer, Snowflake, AlertTriangle, CheckCircle2, BarChart3,
  FileSpreadsheet, Printer, GraduationCap, TrendingUp, Award,
  Layers, Tag, Grid3x3, List as ListIcon, ChevronDown, Star,
  Sparkles, DollarSign, Boxes, Flame,
} from 'lucide-react';
import {
  ResponsiveContainer, BarChart, Bar, XAxis, YAxis, Tooltip, CartesianGrid,
  PieChart, Pie, Cell, Legend, AreaChart, Area,
} from 'recharts';
import { toast } from 'sonner';
import { formatPKR } from '@core/lib/format';
import { Button } from '@core/ui/Button';
import { useAuthStore } from '@core/stores/auth.store';
import { fetchAllProducts } from '@modules/inventory/products/api/fetchAllProducts';
import type { Product } from '@modules/inventory/products/api/products.api';
import { bakeryProductsApi, type BakeryProduct } from '../api/products.api';
import { ingredientsApi } from '../api/ingredients.api';
import { deriveBakeryCategory, isCakeLike, prettyCategory } from '../lib/bakeryCategory';

/* ═════════════════════════════════════════════════════════════
   BAKERY — SAARA MAAL EK JAGAH
   ─────────────────────────────────────────────────────────────
   Pehle bakery ka apna list page tha hi nahi: /products par aam
   wala safha khulta tha, aur `BakeryProductsPage` — jo maujood
   tha — kisi route se juda hi nahi tha.

   Us purane safhe me ek aur kharabi thi: wo sirf `bakeryProductsApi`
   se list laata tha, yani SIRF wo cheezein jin ka bakery profile
   bana ho. Bakery me bikne wali Lays, bottle aur juice us list se
   chup-chaap gayab rehte.

   Ab yahan SAARE products aate hain (chahe 2000 hon), aur bakery
   ki tafseel upar se juR jati hai — jis ki hai us ki, jis ki nahi
   us ki nahi.
   ═════════════════════════════════════════════════════════════ */

type Tab = 'list' | 'analytics';
type Kind = 'all' | 'made' | 'bought' | 'raw';
type View = 'grid' | 'table';
type SortKey = 'name' | 'stock-asc' | 'stock-desc' | 'price-desc' | 'value-desc';

const GRID_COLOR = '#94a3b8';
const AXIS = '#64748b';
const PIE_COLORS = ['#ec4899', '#f59e0b', '#8b5cf6', '#10b981', '#3b82f6', '#ef4444', '#14b8a6', '#f97316'];
const TOOLTIP = {
  borderRadius: 12,
  border: '2px solid #cbd5e1',
  background: '#ffffff',
  color: '#0f172a',
  fontWeight: 700,
  fontSize: 12,
};

const fmtQty = (q: number) => q.toFixed(q % 1 === 0 ? 0 : 2);

/** Cheez ka type — profile se, warna naam se andaza */
function kindOf(p: Product, profile?: BakeryProduct): Kind {
  if (!profile) return 'bought';
  return profile.isCakeCustomizable || profile.isCustomizable ? 'made' : 'bought';
}

export default function BakeryProductsListPage() {
  const tenant = useAuthStore((s) => s.tenant);
  const shopName = useAuthStore((s) => s.user?.assignedShop?.name);
  const searchRef = useRef<HTMLInputElement>(null);

  const [tab, setTab] = useState<Tab>('list');
  const [view, setView] = useState<View>('grid');
  const [search, setSearch] = useState('');
  const [kind, setKind] = useState<Kind>('all');
  const [categoryId, setCategoryId] = useState('all');
  const [stockFilter, setStockFilter] = useState<'all' | 'low' | 'out' | 'ok'>('all');
  const [sortKey, setSortKey] = useState<SortKey>('name');
  const [showFilters, setShowFilters] = useState(false);
  const [showTeacher, setShowTeacher] = useState(false);

  /* ── Data ── */
  const productsQ = useQuery({
    queryKey: ['bakery-all-products'],
    queryFn: () => fetchAllProducts({ isActive: undefined }),
  });

  const profilesQ = useQuery({
    queryKey: ['bakery-profiles-all'],
    queryFn: () => bakeryProductsApi.list({}),
  });

  const ingredientsQ = useQuery({
    queryKey: ['bakery-ingredients-list'],
    queryFn: () => ingredientsApi.list({}),
  });

  const isLoading = productsQ.isLoading || profilesQ.isLoading;
  const isRefetching = productsQ.isRefetching || profilesQ.isRefetching || ingredientsQ.isRefetching;
  const refetchAll = () => { productsQ.refetch(); profilesQ.refetch(); ingredientsQ.refetch(); };

  const profileByProduct = useMemo(() => {
    const m = new Map<string, BakeryProduct>();
    (profilesQ.data ?? []).forEach((p) => { if (p.productId) m.set(p.productId, p); });
    return m;
  }, [profilesQ.data]);

  /** Har product + uski bakery tafseel */
  const rows = useMemo(() => {
    const items = productsQ.data?.items ?? [];
    return items.map((p) => {
      const profile = profileByProduct.get(p.id);
      const cat = deriveBakeryCategory(p.category?.name, p.name);
      const stock = Number(p.shopStock ?? p.stock ?? 0);
      return {
        product: p,
        profile,
        kind: kindOf(p, profile),
        derived: cat,
        stock,
        isOut: stock <= 0,
        isLow: stock > 0 && stock <= Number(p.lowStockAlert ?? 0),
        stockValue: stock * Number(p.costPrice ?? 0),
        retailValue: stock * Number(p.price ?? 0),
        shelfDays: profile?.shelfLifeDays ?? null,
        fridge: profile?.requiresRefrigeration ?? false,
      };
    });
  }, [productsQ.data, profileByProduct]);

  /** Category ki list — jo asal me istemal ho rahi hain */
  const categories = useMemo(() => {
    const m = new Map<string, { id: string; name: string; color: string; count: number }>();
    rows.forEach((r) => {
      const c = r.product.category;
      if (!c) return;
      const e = m.get(c.id);
      if (e) e.count += 1;
      else m.set(c.id, { id: c.id, name: c.name, color: c.color, count: 1 });
    });
    return [...m.values()].sort((a, b) => b.count - a.count);
  }, [rows]);

  /* ── Chaant ── */
  const q = search.trim().toLowerCase();
  const shown = useMemo(() => {
    let out = rows;
    if (kind === 'raw') return [];
    if (kind !== 'all') out = out.filter((r) => r.kind === kind);
    if (categoryId !== 'all') out = out.filter((r) => r.product.categoryId === categoryId);
    if (stockFilter === 'low') out = out.filter((r) => r.isLow);
    if (stockFilter === 'out') out = out.filter((r) => r.isOut);
    if (stockFilter === 'ok') out = out.filter((r) => !r.isLow && !r.isOut);
    if (q) {
      out = out.filter((r) =>
        r.product.name.toLowerCase().includes(q) ||
        (r.product.sku ?? '').toLowerCase().includes(q) ||
        (r.product.barcode ?? '').toLowerCase().includes(q) ||
        (r.product.category?.name ?? '').toLowerCase().includes(q));
    }
    const sorted = [...out];
    sorted.sort((a, b) => {
      switch (sortKey) {
        case 'stock-asc': return a.stock - b.stock;
        case 'stock-desc': return b.stock - a.stock;
        case 'price-desc': return Number(b.product.price) - Number(a.product.price);
        case 'value-desc': return b.stockValue - a.stockValue;
        default: return a.product.name.localeCompare(b.product.name);
      }
    });
    return sorted;
  }, [rows, kind, categoryId, stockFilter, q, sortKey]);

  const shownIngredients = useMemo(() => {
    if (kind !== 'raw' && kind !== 'all') return [];
    const list = ingredientsQ.data ?? [];
    if (!q) return kind === 'raw' ? list : [];
    return (kind === 'raw' ? list : []).filter((i) => i.name.toLowerCase().includes(q));
  }, [ingredientsQ.data, kind, q]);

  /* ── Stats ── */
  const stats = useMemo(() => {
    const made = rows.filter((r) => r.kind === 'made');
    const bought = rows.filter((r) => r.kind === 'bought');
    const ing = ingredientsQ.data ?? [];
    return {
      total: rows.length,
      made: made.length,
      bought: bought.length,
      raw: ing.length,
      out: rows.filter((r) => r.isOut).length,
      low: rows.filter((r) => r.isLow).length,
      stockValue: rows.reduce((s, r) => s + r.stockValue, 0),
      retailValue: rows.reduce((s, r) => s + r.retailValue, 0),
      rawValue: ing.reduce((s, i) => s + Number(i.currentStock || 0) * Number(i.costPerUnit || 0), 0),
      cakeCount: rows.filter((r) => isCakeLike(r.derived)).length,
      fridgeCount: rows.filter((r) => r.fridge).length,
      noCost: rows.filter((r) => Number(r.product.costPrice ?? 0) <= 0).length,
    };
  }, [rows, ingredientsQ.data]);

  const potentialProfit = stats.retailValue - stats.stockValue;
  const margin = stats.retailValue > 0 ? (potentialProfit / stats.retailValue) * 100 : 0;

  /* ── Charts ── */
  const categoryChart = useMemo(
    () => categories.slice(0, 8).map((c) => ({ name: c.name, count: c.count })),
    [categories],
  );

  const kindPie = useMemo(() => ([
    { name: 'Khud banate hain', value: stats.made },
    { name: 'Bahar se laya', value: stats.bought },
    { name: 'Banane ka saamaan', value: stats.raw },
  ].filter((x) => x.value > 0)), [stats]);

  const valueChart = useMemo(
    () => [...rows]
      .sort((a, b) => b.stockValue - a.stockValue)
      .slice(0, 10)
      .map((r) => ({
        name: r.product.name.slice(0, 14),
        lagat: Math.round(r.stockValue),
        bikri: Math.round(r.retailValue),
      })),
    [rows],
  );

  const shelfChart = useMemo(() => {
    const buckets = [
      { name: '1 din', value: 0 },
      { name: '2-3 din', value: 0 },
      { name: '4-7 din', value: 0 },
      { name: '1 haftay se zyada', value: 0 },
      { name: 'Likha hi nahi', value: 0 },
    ];
    rows.forEach((r) => {
      const d = r.shelfDays;
      if (d == null) buckets[4].value += 1;
      else if (d <= 1) buckets[0].value += 1;
      else if (d <= 3) buckets[1].value += 1;
      else if (d <= 7) buckets[2].value += 1;
      else buckets[3].value += 1;
    });
    return buckets.filter((b) => b.value > 0);
  }, [rows]);

  const stockHealth = useMemo(() => ([
    { name: 'Theek', value: rows.filter((r) => !r.isLow && !r.isOut).length },
    { name: 'Kam ho gaya', value: stats.low },
    { name: 'Khatam', value: stats.out },
  ].filter((x) => x.value > 0)), [rows, stats]);

  /* ── CSV / print ── */
  const exportCsv = () => {
    const head = ['Naam', 'Category', 'Type', 'Stock', 'Unit', 'Cost', 'Rate', 'Stock ki lagat', 'Kitni der theek', 'Fridge'];
    const body = shown.map((r) => [
      r.product.name,
      r.product.category?.name ?? '',
      r.kind === 'made' ? 'Khud banate hain' : 'Bahar se laya',
      r.stock,
      r.product.unit,
      r.product.costPrice,
      r.product.price,
      Math.round(r.stockValue),
      r.shelfDays != null ? `${r.shelfDays} din` : '',
      r.fridge ? 'Haan' : 'Nahi',
    ]);
    const esc = (v: any) => `"${String(v ?? '').replace(/"/g, '""')}"`;
    const csv = [head, ...body].map((r) => r.map(esc).join(',')).join('\n');
    const url = URL.createObjectURL(new Blob(['﻿' + csv], { type: 'text/csv;charset=utf-8;' }));
    const a = document.createElement('a');
    a.href = url;
    a.download = `bakery-products-${new Date().toISOString().slice(0, 10)}.csv`;
    a.click();
    URL.revokeObjectURL(url);
    toast.success(`${shown.length} cheezein CSV me`);
  };

  const doPrint = () => window.print();

  /* ── Keyboard ── */
  useEffect(() => {
    const onKey = (e: KeyboardEvent) => {
      if (e.key === 'Escape' && showTeacher) return setShowTeacher(false);
      const t = document.activeElement?.tagName;
      if (t === 'INPUT' || t === 'TEXTAREA' || t === 'SELECT') return;
      if (e.key === '/') { e.preventDefault(); searchRef.current?.focus(); }
      if (e.key.toLowerCase() === 'a') setTab((x) => (x === 'analytics' ? 'list' : 'analytics'));
      if (e.key.toLowerCase() === 'g') setShowTeacher(true);
      if (e.key.toLowerCase() === 'p') doPrint();
      if (e.key.toLowerCase() === 'v') setView((v) => (v === 'grid' ? 'table' : 'grid'));
    };
    window.addEventListener('keydown', onKey);
    return () => window.removeEventListener('keydown', onKey);
  }, [showTeacher]);

  const printDate = new Date().toLocaleString('en-PK', { dateStyle: 'full', timeStyle: 'short' });
  const activeFilters = [
    kind !== 'all', categoryId !== 'all', stockFilter !== 'all', sortKey !== 'name',
  ].filter(Boolean).length;

  return (
    <div className="space-y-4 sm:space-y-5 pb-10">
      {/* ═══ PRINT HEADER ═══ */}
      <div className="hidden print:block mb-4">
        <h1 className="text-xl font-extrabold">{tenant?.name || 'Bakery'} — Saara maal</h1>
        <p className="text-xs text-slate-600">{shopName ? `${shopName} • ` : ''}{printDate}</p>
        <p className="text-xs text-slate-600 mt-1">
          {shown.length} cheezein • Stock ki lagat {formatPKR(stats.stockValue)}
        </p>
      </div>

      {/* ═══ HERO ═══ */}
      <section className="relative overflow-hidden rounded-3xl bg-gradient-to-br from-slate-950 via-pink-900 to-fuchsia-700 text-white p-5 sm:p-6 shadow-2xl print:hidden">
        <div className="absolute -top-24 -right-20 h-72 w-72 rounded-full bg-pink-400/25 blur-3xl" />
        <div className="absolute -bottom-24 -left-20 h-64 w-64 rounded-full bg-amber-300/15 blur-3xl" />
        <div className="absolute inset-0 opacity-[0.06]"
          style={{ backgroundImage: 'radial-gradient(circle at 1px 1px, #fff 1px, transparent 0)', backgroundSize: '22px 22px' }} />

        <div className="relative flex items-start justify-between gap-4 flex-wrap">
          <div className="min-w-0">
            <div className="inline-flex items-center gap-2 rounded-full bg-white/15 backdrop-blur px-3 py-1 text-[11px] font-black border border-white/25 uppercase tracking-widest">
              <Cake className="h-3.5 w-3.5 text-amber-300" /> Bakery · Saara maal
            </div>
            <h1 className="mt-3 text-2xl sm:text-3xl lg:text-4xl font-black leading-tight">🍰 Maal ki List</h1>
            <p className="mt-1.5 text-xs sm:text-sm font-bold text-white/90">
              <strong className="text-pink-200">{stats.made}</strong> khud banate hain ·{' '}
              <strong className="text-blue-200">{stats.bought}</strong> bahar se ·{' '}
              <strong className="text-violet-200">{stats.raw}</strong> banane ka saamaan
            </p>
          </div>

          <div className="flex gap-2 flex-wrap items-center shrink-0">
            <Link to="/bakery-products/new"
              className="h-11 px-3.5 rounded-xl bg-white text-pink-700 hover:bg-pink-50 text-xs font-black inline-flex items-center gap-1.5 shadow-lg transition">
              <Plus className="h-4 w-4" /> Nayi cheez
            </Link>
            <button onClick={() => setShowTeacher(true)} title="Sikhein (G)"
              className="h-11 px-3 rounded-xl bg-amber-400/90 hover:bg-amber-400 text-slate-900 text-xs font-black inline-flex items-center gap-1.5 shadow-lg transition">
              <GraduationCap className="h-4 w-4" /> <span className="hidden sm:inline">Sikhein</span>
            </button>
            <button onClick={exportCsv} title="CSV"
              className="h-11 w-11 rounded-xl bg-white/15 hover:bg-white/25 border border-white/25 flex items-center justify-center backdrop-blur transition">
              <FileSpreadsheet className="h-4 w-4" />
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

      {/* ═══ KPI ═══ */}
      <section className="grid grid-cols-2 lg:grid-cols-4 gap-3 print:hidden">
        <Kpi icon={Package} label="Kul cheezein" value={stats.total}
          sub={`${stats.cakeCount} cake wali`} tone="pink" />
        <Kpi icon={DollarSign} label="Stock ki lagat" value={formatPKR(stats.stockValue)}
          sub={`Bikri par ${formatPKR(stats.retailValue)}`} tone="violet" />
        <Kpi icon={TrendingUp} label="Munafa bane ga" value={formatPKR(potentialProfit)}
          sub={`${margin.toFixed(1)}% margin`} tone="emerald" />
        <Kpi icon={AlertTriangle} label="Dhyan chahiye" value={stats.out + stats.low}
          sub={`${stats.out} khatam · ${stats.low} kam`} tone="amber"
          onClick={() => { setStockFilter(stats.out > 0 ? 'out' : 'low'); setTab('list'); }} />
      </section>

      {/* ═══ TABS ═══ */}
      <div className="grid grid-cols-2 gap-2 sm:gap-3 print:hidden">
        {([['list', 'List', ListIcon], ['analytics', 'Analytics', BarChart3]] as const).map(([id, label, Icon]) => (
          <button key={id} onClick={() => setTab(id as Tab)}
            className={`h-14 rounded-2xl border-2 font-black text-sm inline-flex items-center justify-center gap-2 transition ${
              tab === id
                ? 'bg-gradient-to-r from-pink-500 to-fuchsia-600 text-white border-transparent shadow-lg'
                : 'bg-white dark:bg-slate-900 text-slate-600 dark:text-slate-300 border-slate-200 dark:border-slate-800 hover:border-pink-400'
            }`}>
            <Icon className="h-4 w-4" /> {label}
            {id === 'list' && (
              <span className={`text-[10px] px-1.5 py-0.5 rounded-lg ${tab === id ? 'bg-white/25' : 'bg-slate-100 dark:bg-slate-800'}`}>
                {shown.length}
              </span>
            )}
          </button>
        ))}
      </div>

      {/* ═══ SEARCH + FILTERS ═══ */}
      <section className="rounded-3xl bg-white dark:bg-slate-900 border-2 border-slate-200 dark:border-slate-800 shadow-sm p-3 sm:p-4 space-y-3 print:hidden">
        <div className="flex gap-2 flex-wrap items-center">
          <div className="relative flex-1 min-w-[220px]">
            <Search className="h-5 w-5 text-slate-400 absolute left-3.5 top-1/2 -translate-y-1/2 pointer-events-none" />
            <input ref={searchRef} value={search} onChange={(e) => setSearch(e.target.value)}
              placeholder="Naam, SKU, barcode, category… (/ dabao)"
              className="h-12 w-full rounded-2xl border-2 border-slate-200 dark:border-slate-700 bg-white dark:bg-slate-800 pl-11 pr-10 text-sm font-bold text-slate-900 dark:text-white placeholder:text-slate-400 focus:outline-none focus:border-pink-500 transition" />
            {search && (
              <button onClick={() => setSearch('')}
                className="absolute right-3 top-1/2 -translate-y-1/2 h-7 w-7 rounded-lg hover:bg-slate-100 dark:hover:bg-slate-700 flex items-center justify-center">
                <X className="h-4 w-4 text-slate-400" />
              </button>
            )}
          </div>

          <button onClick={() => setShowFilters((v) => !v)}
            className={`h-12 px-4 rounded-2xl border-2 text-sm font-black inline-flex items-center gap-2 transition ${
              activeFilters > 0
                ? 'border-pink-500 bg-pink-50 dark:bg-pink-500/15 text-pink-700 dark:text-pink-300'
                : 'border-slate-200 dark:border-slate-700 bg-white dark:bg-slate-800 text-slate-700 dark:text-slate-200 hover:border-pink-400'
            }`}>
            <Layers className="h-4 w-4" /> Chaant
            {activeFilters > 0 && <span className="text-[10px] px-1.5 py-0.5 rounded-lg bg-pink-600 text-white">{activeFilters}</span>}
            <ChevronDown className={`h-4 w-4 transition ${showFilters ? 'rotate-180' : ''}`} />
          </button>

          <button onClick={() => setView((v) => (v === 'grid' ? 'table' : 'grid'))} title="View (V)"
            className="h-12 w-12 rounded-2xl border-2 border-slate-200 dark:border-slate-700 bg-white dark:bg-slate-800 flex items-center justify-center hover:border-pink-400 transition">
            {view === 'grid' ? <ListIcon className="h-4 w-4 text-slate-500" /> : <Grid3x3 className="h-4 w-4 text-slate-500" />}
          </button>
        </div>

        {/* Type ki patti — hamesha samne */}
        <div className="flex gap-1.5 flex-wrap">
          {([
            ['all', `Sab (${stats.total + stats.raw})`, Package],
            ['made', `Khud banate hain (${stats.made})`, ChefHat],
            ['bought', `Bahar se laya (${stats.bought})`, ShoppingBag],
            ['raw', `Banane ka saamaan (${stats.raw})`, Wheat],
          ] as const).map(([v, label, Icon]) => (
            <button key={v} onClick={() => setKind(v as Kind)}
              className={`h-10 px-3 rounded-xl border-2 text-[11px] font-black inline-flex items-center gap-1.5 transition ${
                kind === v
                  ? 'border-pink-500 bg-pink-50 dark:bg-pink-500/15 text-pink-700 dark:text-pink-300'
                  : 'border-slate-200 dark:border-slate-700 bg-white dark:bg-slate-800 text-slate-600 dark:text-slate-300 hover:border-pink-400'
              }`}>
              <Icon className="h-3.5 w-3.5" /> {label}
            </button>
          ))}
        </div>

        {showFilters && (
          <div className="grid sm:grid-cols-3 gap-3 pt-2 border-t-2 border-slate-100 dark:border-slate-800">
            <div>
              <label className="block text-[10px] font-black uppercase tracking-widest text-slate-500 mb-1.5">Category</label>
              <select value={categoryId} onChange={(e) => setCategoryId(e.target.value)}
                className="h-11 w-full rounded-xl border-2 border-slate-200 dark:border-slate-700 bg-white dark:bg-slate-800 px-3 text-sm font-bold text-slate-900 dark:text-white focus:outline-none focus:border-pink-500">
                <option value="all">Sab category</option>
                {categories.map((c) => <option key={c.id} value={c.id}>{c.name} ({c.count})</option>)}
              </select>
            </div>
            <div>
              <label className="block text-[10px] font-black uppercase tracking-widest text-slate-500 mb-1.5">Stock</label>
              <select value={stockFilter} onChange={(e) => setStockFilter(e.target.value as any)}
                className="h-11 w-full rounded-xl border-2 border-slate-200 dark:border-slate-700 bg-white dark:bg-slate-800 px-3 text-sm font-bold text-slate-900 dark:text-white focus:outline-none focus:border-pink-500">
                <option value="all">Sab</option>
                <option value="ok">Theek hai</option>
                <option value="low">Kam ho gaya</option>
                <option value="out">Khatam</option>
              </select>
            </div>
            <div>
              <label className="block text-[10px] font-black uppercase tracking-widest text-slate-500 mb-1.5">Tarteeb</label>
              <select value={sortKey} onChange={(e) => setSortKey(e.target.value as SortKey)}
                className="h-11 w-full rounded-xl border-2 border-slate-200 dark:border-slate-700 bg-white dark:bg-slate-800 px-3 text-sm font-bold text-slate-900 dark:text-white focus:outline-none focus:border-pink-500">
                <option value="name">Naam se</option>
                <option value="stock-asc">Stock kam se zyada</option>
                <option value="stock-desc">Stock zyada se kam</option>
                <option value="price-desc">Mehnga pehle</option>
                <option value="value-desc">Lagat zyada pehle</option>
              </select>
            </div>
          </div>
        )}
      </section>

      {isLoading ? (
        <div className="flex items-center justify-center py-24">
          <div className="h-12 w-12 rounded-full border-4 border-pink-200 border-t-pink-600 animate-spin" />
        </div>
      ) : tab === 'analytics' ? (
        <Analytics
          stats={stats} margin={margin} potentialProfit={potentialProfit}
          categoryChart={categoryChart} kindPie={kindPie} valueChart={valueChart}
          shelfChart={shelfChart} stockHealth={stockHealth} rows={rows}
        />
      ) : kind === 'raw' ? (
        <RawList rows={shownIngredients} />
      ) : shown.length === 0 ? (
        <Empty search={search} onClear={() => { setSearch(''); setKind('all'); setCategoryId('all'); setStockFilter('all'); }} />
      ) : view === 'grid' ? (
        <ProductGrid rows={shown} />
      ) : (
        <ProductTable rows={shown} />
      )}

      {showTeacher && <Teacher onClose={() => setShowTeacher(false)} />}
    </div>
  );
}

/* ═════════════════════════════════════════════════════════════
   GRID
   ═════════════════════════════════════════════════════════════ */
function ProductGrid({ rows }: { rows: any[] }) {
  return (
    <section className="grid grid-cols-2 md:grid-cols-3 xl:grid-cols-4 gap-3">
      {rows.map((r) => {
        const p = r.product as Product;
        const img = p.images?.find((i: any) => i.isPrimary)?.url ?? p.images?.[0]?.url;
        return (
          <Link key={p.id} to={`/bakery-products/${p.id}`}
            className="group rounded-2xl bg-white dark:bg-slate-900 border-2 border-slate-200 dark:border-slate-800 shadow-sm hover:shadow-md hover:-translate-y-0.5 hover:border-pink-400 transition-all overflow-hidden avoid-break">
            <div className="relative aspect-[4/3] bg-gradient-to-br from-pink-50 to-fuchsia-50 dark:from-pink-500/10 dark:to-fuchsia-500/10 flex items-center justify-center overflow-hidden">
              {img ? (
                <img src={img} alt={p.name} className="h-full w-full object-cover group-hover:scale-105 transition-transform" />
              ) : (
                <span className="text-4xl">{r.kind === 'made' ? '🧁' : '📦'}</span>
              )}
              <div className="absolute top-2 left-2 flex flex-col gap-1">
                {r.isOut && <Badge tone="rose">Khatam</Badge>}
                {r.isLow && <Badge tone="amber">Kam ho gaya</Badge>}
                {r.fridge && <Badge tone="sky"><Snowflake className="h-2.5 w-2.5" /> Fridge</Badge>}
              </div>
              {r.shelfDays != null && (
                <div className="absolute top-2 right-2">
                  <Badge tone="violet"><Timer className="h-2.5 w-2.5" /> {r.shelfDays}d</Badge>
                </div>
              )}
            </div>

            <div className="p-3">
              <div className="font-extrabold text-sm text-slate-900 dark:text-white truncate group-hover:text-pink-600">{p.name}</div>
              <div className="flex items-center gap-1.5 mt-0.5 flex-wrap">
                {p.category && (
                  <span className="text-[10px] font-black uppercase tracking-wider text-slate-400 truncate">{p.category.name}</span>
                )}
                <span className={`text-[9px] font-black uppercase px-1.5 py-0.5 rounded-md ${
                  r.kind === 'made'
                    ? 'bg-pink-100 dark:bg-pink-500/20 text-pink-700 dark:text-pink-300'
                    : 'bg-blue-100 dark:bg-blue-500/20 text-blue-700 dark:text-blue-300'
                }`}>
                  {r.kind === 'made' ? 'Khud' : 'Bahar'}
                </span>
              </div>
              <div className="mt-2 flex items-end justify-between gap-2">
                <div>
                  <div className="text-lg font-black text-slate-900 dark:text-white tabular-nums leading-none">
                    {formatPKR(p.price)}
                  </div>
                  <div className="text-[10px] font-bold text-slate-400 mt-0.5">per {p.unit}</div>
                </div>
                <div className="text-right">
                  <div className={`text-sm font-black tabular-nums ${
                    r.isOut ? 'text-rose-600' : r.isLow ? 'text-amber-600' : 'text-emerald-600'
                  }`}>{fmtQty(r.stock)}</div>
                  <div className="text-[10px] font-bold text-slate-400">{p.unit}</div>
                </div>
              </div>
            </div>
          </Link>
        );
      })}
    </section>
  );
}

/* ═════════════════════════════════════════════════════════════
   TABLE
   ═════════════════════════════════════════════════════════════ */
function ProductTable({ rows }: { rows: any[] }) {
  return (
    <section className="rounded-3xl bg-white dark:bg-slate-900 border-2 border-slate-200 dark:border-slate-800 shadow-sm overflow-hidden">
      <div className="overflow-x-auto">
        <table className="w-full text-sm">
          <thead className="bg-slate-50 dark:bg-slate-800/60 border-b-2 border-slate-200 dark:border-slate-700">
            <tr>
              {['Cheez', 'Type', 'Stock', 'Cost', 'Rate', 'Stock ki lagat', 'Theek rehti'].map((h, i) => (
                <th key={h} className={`px-3 py-2.5 text-[10px] font-black uppercase tracking-widest text-slate-500 ${i === 0 ? 'text-left' : 'text-right'}`}>{h}</th>
              ))}
            </tr>
          </thead>
          <tbody className="divide-y divide-slate-100 dark:divide-slate-800">
            {rows.map((r) => {
              const p = r.product as Product;
              return (
                <tr key={p.id} className="hover:bg-slate-50 dark:hover:bg-slate-800/40 transition avoid-break">
                  <td className="px-3 py-2.5">
                    <Link to={`/bakery-products/${p.id}`} className="font-extrabold text-slate-900 dark:text-white hover:text-pink-600">
                      {p.name}
                    </Link>
                    {p.category && <div className="text-[10px] font-bold text-slate-400">{p.category.name}</div>}
                  </td>
                  <td className="px-3 py-2.5 text-right">
                    <span className={`text-[9px] font-black uppercase px-1.5 py-0.5 rounded-md ${
                      r.kind === 'made'
                        ? 'bg-pink-100 dark:bg-pink-500/20 text-pink-700 dark:text-pink-300'
                        : 'bg-blue-100 dark:bg-blue-500/20 text-blue-700 dark:text-blue-300'
                    }`}>{r.kind === 'made' ? 'Khud' : 'Bahar'}</span>
                  </td>
                  <td className={`px-3 py-2.5 text-right font-black tabular-nums ${
                    r.isOut ? 'text-rose-600' : r.isLow ? 'text-amber-600' : 'text-slate-900 dark:text-white'
                  }`}>{fmtQty(r.stock)} <span className="text-[10px] text-slate-400">{p.unit}</span></td>
                  <td className="px-3 py-2.5 text-right font-bold tabular-nums text-slate-600 dark:text-slate-300">{formatPKR(p.costPrice)}</td>
                  <td className="px-3 py-2.5 text-right font-black tabular-nums text-slate-900 dark:text-white">{formatPKR(p.price)}</td>
                  <td className="px-3 py-2.5 text-right font-bold tabular-nums text-slate-600 dark:text-slate-300">{formatPKR(r.stockValue)}</td>
                  <td className="px-3 py-2.5 text-right font-bold tabular-nums text-slate-500">{r.shelfDays != null ? `${r.shelfDays} din` : '—'}</td>
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
   RAW LIST
   ═════════════════════════════════════════════════════════════ */
function RawList({ rows }: { rows: any[] }) {
  if (rows.length === 0) {
    return (
      <div className="rounded-3xl bg-white dark:bg-slate-900 border-4 border-dashed border-slate-200 dark:border-slate-700 p-10 text-center">
        <Wheat className="h-10 w-10 text-slate-400 mx-auto" />
        <p className="mt-3 font-black text-slate-800 dark:text-slate-100 text-lg">Abhi koi saamaan nahi</p>
        <p className="text-sm text-slate-500 dark:text-slate-400 font-bold mt-1">
          Maida, cheeni, makkhan daalein — phir cake ki recipe me lag sakenge.
        </p>
        <Link to="/bakery-products/new"
          className="mt-4 h-11 px-4 rounded-xl bg-violet-600 hover:bg-violet-700 text-white text-sm font-black inline-flex items-center gap-2 transition">
          <Plus className="h-4 w-4" /> Saamaan daalein
        </Link>
      </div>
    );
  }

  return (
    <>
      <div className="rounded-2xl bg-violet-50 dark:bg-violet-500/10 border-2 border-violet-200 dark:border-violet-500/30 p-3 flex gap-2 print:hidden">
        <Wheat className="h-4 w-4 text-violet-600 shrink-0 mt-0.5" />
        <p className="text-[12px] font-bold text-violet-900 dark:text-violet-200">
          Ye bechne ki cheezein nahi. POS aur catalog me nazar nahi aatin — inka kaam
          sirf recipe me lagna aur khatam hone par batana hai.
        </p>
      </div>

      <section className="mt-3 rounded-3xl bg-white dark:bg-slate-900 border-2 border-slate-200 dark:border-slate-800 shadow-sm overflow-hidden">
        <div className="divide-y divide-slate-100 dark:divide-slate-800">
          {rows.map((i: any) => {
            const level = Number(i.reorderLevel ?? i.minStock ?? 0);
            const have = Number(i.currentStock || 0);
            const low = have <= level;
            return (
              <div key={i.id} className="p-3 sm:p-4 flex items-center gap-3 hover:bg-slate-50 dark:hover:bg-slate-800/50 transition avoid-break">
                <span className={`h-11 w-11 rounded-2xl flex items-center justify-center shrink-0 ${
                  low ? 'bg-rose-100 dark:bg-rose-500/20' : 'bg-violet-100 dark:bg-violet-500/20'
                }`}>
                  {i.requiresRefrigeration
                    ? <Snowflake className="h-5 w-5 text-sky-600 dark:text-sky-400" />
                    : <Wheat className={`h-5 w-5 ${low ? 'text-rose-600' : 'text-violet-600 dark:text-violet-400'}`} />}
                </span>
                <div className="min-w-0 flex-1">
                  <div className="flex items-center gap-1.5 flex-wrap">
                    <span className="font-extrabold text-sm text-slate-900 dark:text-white truncate">{i.name}</span>
                    {i.isCritical && (
                      <span className="text-[9px] font-black uppercase px-1.5 py-0.5 rounded-md bg-rose-100 dark:bg-rose-500/20 text-rose-700 dark:text-rose-300">Zaroori</span>
                    )}
                  </div>
                  <div className="text-[11px] font-bold text-slate-400">
                    {formatPKR(i.costPerUnit)} / {i.unit}{i.supplierName ? ` · ${i.supplierName}` : ''}
                  </div>
                </div>
                <div className="text-right shrink-0">
                  <div className={`text-lg font-black tabular-nums ${low ? 'text-rose-600' : 'text-slate-900 dark:text-white'}`}>
                    {fmtQty(have)} <span className="text-xs">{i.unit}</span>
                  </div>
                  <div className="text-[10px] font-bold text-slate-400 tabular-nums">{formatPKR(have * Number(i.costPerUnit || 0))}</div>
                </div>
              </div>
            );
          })}
        </div>
      </section>
    </>
  );
}

/* ═════════════════════════════════════════════════════════════
   ANALYTICS
   ═════════════════════════════════════════════════════════════ */
function Analytics({ stats, margin, potentialProfit, categoryChart, kindPie, valueChart, shelfChart, stockHealth, rows }: any) {
  const topByValue = useMemo(
    () => [...rows].sort((a: any, b: any) => b.stockValue - a.stockValue).slice(0, 5),
    [rows],
  );
  const noShelf = rows.filter((r: any) => r.kind === 'made' && r.shelfDays == null).length;

  return (
    <div className="space-y-4">
      {/* Kaam ki baatein */}
      <section className="grid sm:grid-cols-2 lg:grid-cols-4 gap-3">
        <MiniStat icon={Boxes} label="Gudaam ki qeemat" value={formatPKR(stats.stockValue)} tone="violet" />
        <MiniStat icon={TrendingUp} label="Sab bik jaye to" value={formatPKR(stats.retailValue)} tone="emerald" />
        <MiniStat icon={Award} label="Munafa" value={`${margin.toFixed(1)}%`} sub={formatPKR(potentialProfit)} tone="pink" />
        <MiniStat icon={Wheat} label="Saamaan ki qeemat" value={formatPKR(stats.rawValue)} sub={`${stats.raw} cheezein`} tone="amber" />
      </section>

      {/* Warnings */}
      {(stats.noCost > 0 || noShelf > 0) && (
        <section className="rounded-3xl bg-amber-50 dark:bg-amber-500/10 border-2 border-amber-200 dark:border-amber-500/30 p-4 space-y-2">
          <div className="flex items-center gap-2">
            <AlertTriangle className="h-4 w-4 text-amber-600" />
            <h3 className="font-black text-amber-900 dark:text-amber-200">Ye theek kar lein</h3>
          </div>
          {stats.noCost > 0 && (
            <p className="text-[12px] font-bold text-amber-900 dark:text-amber-200">
              • <strong>{stats.noCost}</strong> cheezon ki cost 0 hai — in ka munafa poora dikhta hai,
              jo sach nahi. Har report ghalat jayegi.
            </p>
          )}
          {noShelf > 0 && (
            <p className="text-[12px] font-bold text-amber-900 dark:text-amber-200">
              • <strong>{noShelf}</strong> banai hui cheezon par "kitni der theek rehti hai" likha hi
              nahi — in ki expiry ki warning kabhi nahi aayegi.
            </p>
          )}
        </section>
      )}

      <div className="grid lg:grid-cols-2 gap-4">
        <ChartCard icon={Layers} title="Category me kitni cheezein" tone="pink">
          {categoryChart.length > 0 ? (
            <ResponsiveContainer width="100%" height="100%">
              <BarChart data={categoryChart}>
                <CartesianGrid strokeDasharray="3 3" stroke={GRID_COLOR} vertical={false} />
                <XAxis dataKey="name" stroke={AXIS} fontSize={10} fontWeight={700} interval={0} angle={-20} textAnchor="end" height={60} />
                <YAxis stroke={AXIS} fontSize={11} width={45} allowDecimals={false} />
                <Tooltip contentStyle={TOOLTIP} formatter={(v: any) => [v, 'Cheezein']} />
                <Bar dataKey="count" fill="#ec4899" radius={[8, 8, 0, 0]} maxBarSize={48} />
              </BarChart>
            </ResponsiveContainer>
          ) : <EmptyChart />}
        </ChartCard>

        <ChartCard icon={Package} title="Kis tarah ka maal" tone="violet">
          {kindPie.length > 0 ? (
            <ResponsiveContainer width="100%" height="100%">
              <PieChart>
                <Pie data={kindPie} dataKey="value" nameKey="name" innerRadius={55} outerRadius={90} paddingAngle={3}>
                  {kindPie.map((_: any, i: number) => <Cell key={i} fill={PIE_COLORS[i % PIE_COLORS.length]} />)}
                </Pie>
                <Tooltip contentStyle={TOOLTIP} />
                <Legend />
              </PieChart>
            </ResponsiveContainer>
          ) : <EmptyChart />}
        </ChartCard>

        <ChartCard icon={DollarSign} title="Sab se zyada paisa kis me phansa hai" tone="emerald" wide>
          {valueChart.length > 0 ? (
            <ResponsiveContainer width="100%" height="100%">
              <BarChart data={valueChart}>
                <CartesianGrid strokeDasharray="3 3" stroke={GRID_COLOR} vertical={false} />
                <XAxis dataKey="name" stroke={AXIS} fontSize={10} fontWeight={700} interval={0} angle={-20} textAnchor="end" height={60} />
                <YAxis stroke={AXIS} fontSize={11} width={78} tickFormatter={(v) => Number(v).toLocaleString('en-PK')} />
                <Tooltip contentStyle={TOOLTIP} formatter={(v: any, n: any) => [formatPKR(Number(v)), n === 'lagat' ? 'Lagat' : 'Bikri par']} />
                <Legend formatter={(v) => (v === 'lagat' ? 'Lagat' : 'Bikri par')} />
                <Bar dataKey="lagat" fill="#8b5cf6" radius={[6, 6, 0, 0]} />
                <Bar dataKey="bikri" fill="#10b981" radius={[6, 6, 0, 0]} />
              </BarChart>
            </ResponsiveContainer>
          ) : <EmptyChart />}
        </ChartCard>

        <ChartCard icon={Timer} title="Kitni der theek rehti hain" tone="amber">
          {shelfChart.length > 0 ? (
            <ResponsiveContainer width="100%" height="100%">
              <PieChart>
                <Pie data={shelfChart} dataKey="value" nameKey="name" innerRadius={55} outerRadius={90} paddingAngle={3}>
                  {shelfChart.map((_: any, i: number) => <Cell key={i} fill={PIE_COLORS[i % PIE_COLORS.length]} />)}
                </Pie>
                <Tooltip contentStyle={TOOLTIP} />
                <Legend />
              </PieChart>
            </ResponsiveContainer>
          ) : <EmptyChart />}
        </ChartCard>

        <ChartCard icon={Flame} title="Stock ki halat" tone="rose">
          {stockHealth.length > 0 ? (
            <ResponsiveContainer width="100%" height="100%">
              <PieChart>
                <Pie data={stockHealth} dataKey="value" nameKey="name" innerRadius={55} outerRadius={90} paddingAngle={3}>
                  <Cell fill="#10b981" /><Cell fill="#f59e0b" /><Cell fill="#ef4444" />
                </Pie>
                <Tooltip contentStyle={TOOLTIP} />
                <Legend />
              </PieChart>
            </ResponsiveContainer>
          ) : <EmptyChart />}
        </ChartCard>
      </div>

      {/* Top 5 */}
      <section className="rounded-3xl bg-white dark:bg-slate-900 border-2 border-slate-200 dark:border-slate-800 shadow-sm overflow-hidden">
        <div className="px-4 py-3 border-b-2 border-slate-100 dark:border-slate-800 flex items-center gap-2">
          <Star className="h-4 w-4 text-amber-500" />
          <h3 className="font-black text-slate-900 dark:text-white">Sab se qeemti stock</h3>
        </div>
        <div className="divide-y divide-slate-100 dark:divide-slate-800">
          {topByValue.map((r: any, i: number) => (
            <div key={r.product.id} className="p-3 flex items-center gap-3">
              <span className="h-8 w-8 rounded-xl bg-slate-100 dark:bg-slate-800 flex items-center justify-center text-xs font-black text-slate-500 shrink-0">
                {i + 1}
              </span>
              <Link to={`/bakery-products/${r.product.id}`} className="min-w-0 flex-1 font-extrabold text-sm text-slate-900 dark:text-white truncate hover:text-pink-600">
                {r.product.name}
              </Link>
              <span className="text-sm font-black tabular-nums text-slate-900 dark:text-white shrink-0">{formatPKR(r.stockValue)}</span>
            </div>
          ))}
        </div>
      </section>
    </div>
  );
}

/* ═════════════════════════════════════════════════════════════
   CHHOTE HISSE
   ═════════════════════════════════════════════════════════════ */
function Kpi({ icon: Icon, label, value, sub, tone, onClick }: any) {
  const tones: Record<string, string> = {
    pink: 'from-pink-500 to-fuchsia-600 shadow-pink-500/40',
    violet: 'from-violet-500 to-purple-600 shadow-violet-500/40',
    emerald: 'from-emerald-500 to-green-600 shadow-emerald-500/40',
    amber: 'from-amber-500 to-orange-600 shadow-amber-500/40',
  };
  const Comp: any = onClick ? 'button' : 'div';
  return (
    <Comp onClick={onClick}
      className={`rounded-2xl border-2 border-slate-200 dark:border-slate-800 bg-white dark:bg-slate-900 p-4 shadow-sm text-left w-full transition-all ${
        onClick ? 'hover:-translate-y-0.5 hover:shadow-md cursor-pointer' : ''
      }`}>
      <div className="flex items-start justify-between gap-2">
        <div className="min-w-0 flex-1">
          <div className="text-[10px] uppercase tracking-[0.15em] text-slate-500 dark:text-slate-400 font-black">{label}</div>
          <div className="mt-2 text-lg sm:text-xl lg:text-2xl font-black text-slate-900 dark:text-white tabular-nums leading-tight break-words">{value}</div>
          {sub && <div className="text-[10px] sm:text-[11px] text-slate-500 dark:text-slate-400 font-bold mt-1.5 leading-snug line-clamp-2">{sub}</div>}
        </div>
        <div className={`h-11 w-11 rounded-2xl bg-gradient-to-br ${tones[tone]} text-white flex items-center justify-center shadow-lg shrink-0`}>
          <Icon className="h-5 w-5" />
        </div>
      </div>
    </Comp>
  );
}

function MiniStat({ icon: Icon, label, value, sub, tone }: any) {
  const tones: Record<string, string> = {
    pink: 'text-pink-600 dark:text-pink-400',
    violet: 'text-violet-600 dark:text-violet-400',
    emerald: 'text-emerald-600 dark:text-emerald-400',
    amber: 'text-amber-600 dark:text-amber-400',
  };
  return (
    <div className="rounded-2xl bg-white dark:bg-slate-900 border-2 border-slate-200 dark:border-slate-800 p-4">
      <div className="flex items-center gap-1.5">
        <Icon className={`h-4 w-4 ${tones[tone]}`} />
        <span className="text-[10px] font-black uppercase tracking-widest text-slate-500">{label}</span>
      </div>
      <div className="mt-1.5 text-xl font-black text-slate-900 dark:text-white tabular-nums break-words">{value}</div>
      {sub && <div className="text-[11px] font-bold text-slate-400 mt-0.5">{sub}</div>}
    </div>
  );
}

function ChartCard({ icon: Icon, title, tone, wide, children }: any) {
  const tones: Record<string, string> = {
    pink: 'text-pink-600', violet: 'text-violet-600',
    emerald: 'text-emerald-600', amber: 'text-amber-600', rose: 'text-rose-600',
  };
  return (
    <section className={`rounded-3xl bg-white dark:bg-slate-900 border-2 border-slate-200 dark:border-slate-800 shadow-sm p-4 ${wide ? 'lg:col-span-2' : ''}`}>
      <h3 className="font-black text-slate-900 dark:text-white mb-3 flex items-center gap-2">
        <Icon className={`h-4 w-4 ${tones[tone]}`} /> {title}
      </h3>
      <div className="h-64">{children}</div>
    </section>
  );
}

function EmptyChart() {
  return (
    <div className="h-full flex items-center justify-center">
      <p className="text-sm font-bold text-slate-400">Abhi dikhane ko kuch nahi</p>
    </div>
  );
}

function Badge({ tone, children }: any) {
  const tones: Record<string, string> = {
    rose: 'bg-rose-600 text-white',
    amber: 'bg-amber-500 text-white',
    sky: 'bg-sky-600 text-white',
    violet: 'bg-violet-600 text-white',
  };
  return (
    <span className={`text-[9px] font-black uppercase px-1.5 py-0.5 rounded-md inline-flex items-center gap-1 shadow ${tones[tone]}`}>
      {children}
    </span>
  );
}

function Empty({ search, onClear }: any) {
  return (
    <div className="rounded-3xl bg-white dark:bg-slate-900 border-4 border-dashed border-slate-200 dark:border-slate-700 p-10 sm:p-14 text-center">
      <div className="h-16 w-16 rounded-3xl bg-slate-100 dark:bg-slate-800 mx-auto flex items-center justify-center">
        <Cake className="h-8 w-8 text-slate-400" />
      </div>
      <p className="mt-4 font-black text-slate-800 dark:text-slate-100 text-lg sm:text-xl">
        {search ? 'Kuch nahi mila' : 'Abhi koi cheez nahi'}
      </p>
      <p className="text-xs sm:text-sm text-slate-500 dark:text-slate-400 font-bold mt-1.5">
        {search ? `"${search}" se koi cheez nahi mili` : 'Pehli cheez banaiye — cake, pastry ya bahar se laya maal'}
      </p>
      <div className="mt-4 flex gap-2 justify-center flex-wrap">
        {search && <Button variant="secondary" onClick={onClear}>Chaant hataiye</Button>}
        <Link to="/bakery-products/new"
          className="h-11 px-4 rounded-xl bg-pink-600 hover:bg-pink-700 text-white text-sm font-black inline-flex items-center gap-2 transition">
          <Plus className="h-4 w-4" /> Nayi cheez
        </Link>
      </div>
    </div>
  );
}

function Teacher({ onClose }: { onClose: () => void }) {
  return (
    <div className="fixed inset-0 z-50 bg-black/60 backdrop-blur-sm flex items-end sm:items-center justify-center p-3" onClick={onClose}>
      <div className="w-full max-w-lg max-h-[90vh] overflow-y-auto rounded-3xl bg-white dark:bg-slate-900 border-2 border-pink-300 dark:border-pink-500/40 shadow-2xl"
        onClick={(e) => e.stopPropagation()}>
        <div className="px-5 py-3 border-b-2 border-pink-200 dark:border-pink-500/30 bg-gradient-to-r from-pink-50 to-fuchsia-50 dark:from-pink-500/15 dark:to-fuchsia-500/15 flex items-center justify-between sticky top-0 z-10">
          <h3 className="font-extrabold text-pink-900 dark:text-pink-200 flex items-center gap-2">
            <GraduationCap className="h-5 w-5" /> Ye safha kya dikhata hai
          </h3>
          <button onClick={onClose} className="h-8 w-8 rounded-lg hover:bg-white dark:hover:bg-slate-800 flex items-center justify-center transition">
            <X className="h-4 w-4 text-slate-600 dark:text-slate-300" />
          </button>
        </div>
        <div className="p-5 space-y-3 text-sm">
          <p className="font-bold text-slate-700 dark:text-slate-200">
            Aap ki bakery ka <strong>saara maal</strong> ek jagah — chahe 2000 cheezein hon.
          </p>
          <Tip icon={ChefHat} title="Khud banate hain">
            Cake, pastry, patties. In par "kitni der theek rehti hai" ka nishan aata hai.
          </Tip>
          <Tip icon={ShoppingBag} title="Bahar se laya">
            Lays, bottle, juice. Seedha bik jate hain — na recipe, na production.
          </Tip>
          <Tip icon={Wheat} title="Banane ka saamaan">
            Maida, cheeni, makkhan. <strong>Ye bikte nahi</strong>, is liye POS aur catalog me
            nazar nahi aate. Yahan sirf dekhne ke liye hain.
          </Tip>
          <Tip icon={BarChart3} title="Analytics">
            Gudaam me kitna paisa phansa hai, kaun si cheez me sab se zyada, munafa kitna banega,
            aur kis cheez ki cost ya expiry likhna reh gayi hai.
          </Tip>
          <div className="rounded-2xl bg-slate-50 dark:bg-slate-800 p-3">
            <div className="text-[10px] font-black uppercase tracking-widest text-slate-500 mb-2">Shortcuts</div>
            <div className="grid grid-cols-2 gap-1.5 text-[11px] font-bold text-slate-600 dark:text-slate-300">
              <div><kbd className="px-1.5 py-0.5 rounded bg-white dark:bg-slate-900 border">/</kbd> dhoondo</div>
              <div><kbd className="px-1.5 py-0.5 rounded bg-white dark:bg-slate-900 border">A</kbd> analytics</div>
              <div><kbd className="px-1.5 py-0.5 rounded bg-white dark:bg-slate-900 border">V</kbd> grid / table</div>
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
