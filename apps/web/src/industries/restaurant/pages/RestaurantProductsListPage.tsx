import { useMemo, useState, useEffect, useRef } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import {
  UtensilsCrossed, Plus, Search, X, RefreshCw, Download, Grid3x3, List as ListIcon,
  Package, AlertTriangle, CheckCircle2, XCircle, Star, Flame, Timer,
  GraduationCap, Printer, Barcode, Edit3, ShoppingCart, Trash2,
  SlidersHorizontal, ChefHat, Soup, Leaf, TrendingUp, EyeOff, Eye,
} from 'lucide-react';
import { toast } from 'sonner';
import { Button } from '@core/ui/Button';
import { formatPKR } from '@core/lib/format';
import { productsApi } from '@modules/inventory/products/api/products.api';
import { fetchAllProducts } from '@modules/inventory/products/api/fetchAllProducts';
import { productEmoji, productTint } from '@modules/inventory/products/lib/productEmoji';
import { categoriesApi } from '@modules/inventory/categories/api/categories.api';
import { forceRefreshProducts } from '@core/lib/offline/offlineProducts';
import { ProductDeleteButton } from '@core/components/ProductDeleteButton';
import { PrivacyToggle, useCostHidden } from '@/core/security/HiddenValue';
import { useAuthStore } from '@core/stores/auth.store';
import BarcodeScanner from '@core/components/barcode/BarcodeScanner';
import { QuickStockModal } from '@industries/retail/components/QuickStockModal';
import { menuItemsApi, type RestaurantMenuItem } from '../api/menu-items.api';
import { recipesApi } from '../api/recipes.api';

/* ═════════════════════════════════════════════════════════════
   MENU — RESTAURANT KA "MAAL"
   ─────────────────────────────────────────────────────────────
   Kirana ki dukaan me maal ginti ka hota hai. Restaurant me nahi:
   biryani ka stock nahi hota, wo banti hai. Is liye yahan "kitne
   bache hain" ki jagah teen aur sawal ahem hain:

     🔥 BAN SAKTI HAI YA NAHI — recipe ka saamaan hai to dish zinda
        hai, warna menu par hote hue bhi bik nahi sakti

     💰 FOOD COST — rate ka kitna hissa saamaan me chala gaya.
        30–35% aam hai; 45% se upar jaye to ya rate kam hai ya
        recipe mehngi

     👁️ MENU PAR HAI YA NAHI — ek switch se dish band ho jati hai
        (jise kitchen "86" kehti hai). Ye sab se zyada istemal hone
        wala button hai, is liye har khane par samne hai.

   Baqi sab wohi hai jo retail aur bakery ke safhe par: bari
   tasveer, chaant ki pattiyan, scan, CSV, print, dark mode.
   ═════════════════════════════════════════════════════════════ */

type View = 'grid' | 'table';
type Kind = 'all' | 'live' | 'off' | 'dead' | 'norecipe';
type SortKey = 'name' | 'newest' | 'price-low' | 'price-high' | 'sold' | 'cost-high';

const VIEW_KEY = 'restaurant-menu-view';
const PAGE_SIZE = 48;

const SORTS: Array<{ v: SortKey; l: string }> = [
  { v: 'name',       l: '🔤 Naam A–Z' },
  { v: 'sold',       l: '🔥 Sab se zyada bikne wali' },
  { v: 'newest',     l: '🆕 Nayi pehle' },
  { v: 'price-low',  l: '💰 Sasti pehle' },
  { v: 'price-high', l: '💎 Mehngi pehle' },
  { v: 'cost-high',  l: '⚠️ Food cost zyada pehle' },
];

const SPICE: Record<string, string> = {
  NONE: '', MILD: '🌶️', MEDIUM: '🌶️🌶️', HOT: '🌶️🌶️🌶️', EXTRA_HOT: '🌶️🌶️🌶️🌶️',
};

const DIET_CHIP: Record<string, { l: string; c: string }> = {
  VEGETARIAN: { l: '🥬 Veg', c: 'bg-emerald-100 dark:bg-emerald-500/20 text-emerald-700 dark:text-emerald-300' },
  VEGAN: { l: '🌱 Vegan', c: 'bg-green-100 dark:bg-green-500/20 text-green-700 dark:text-green-300' },
  HALAL: { l: '☪️ Halal', c: 'bg-teal-100 dark:bg-teal-500/20 text-teal-700 dark:text-teal-300' },
  CHICKEN: { l: '🍗 Chicken', c: 'bg-amber-100 dark:bg-amber-500/20 text-amber-700 dark:text-amber-300' },
  BEEF: { l: '🥩 Beef', c: 'bg-rose-100 dark:bg-rose-500/20 text-rose-700 dark:text-rose-300' },
  MUTTON: { l: '🐐 Mutton', c: 'bg-orange-100 dark:bg-orange-500/20 text-orange-700 dark:text-orange-300' },
  CONTAINS_SEAFOOD: { l: '🦐 Seafood', c: 'bg-sky-100 dark:bg-sky-500/20 text-sky-700 dark:text-sky-300' },
  GLUTEN_FREE: { l: '🌾 GF', c: 'bg-violet-100 dark:bg-violet-500/20 text-violet-700 dark:text-violet-300' },
};

export default function RestaurantProductsListPage() {
  const navigate = useNavigate();
  const qc = useQueryClient();
  const hideCost = useCostHidden();
  const searchRef = useRef<HTMLInputElement>(null);
  const tenantName = useAuthStore((s) => s.tenant?.name);
  const shopName = useAuthStore((s) => s.user?.assignedShop?.name);

  const [search, setSearch] = useState('');
  const [kind, setKind] = useState<Kind>('all');
  const [categoryId, setCategoryId] = useState('all');
  const [sortKey, setSortKey] = useState<SortKey>('name');
  const [view, setView] = useState<View>('grid');
  const [visibleCount, setVisibleCount] = useState(PAGE_SIZE);
  const [stockModal, setStockModal] = useState<any>(null);
  const [scannerOpen, setScannerOpen] = useState(false);
  const [showTeacher, setShowTeacher] = useState(false);
  const [showFilters, setShowFilters] = useState(false);

  useEffect(() => {
    const s = localStorage.getItem(VIEW_KEY);
    if (s === 'grid' || s === 'table') setView(s);
  }, []);
  useEffect(() => { localStorage.setItem(VIEW_KEY, view); }, [view]);

  const productsQ = useQuery({
    queryKey: ['restaurant-all-products'],
    queryFn: () => fetchAllProducts({ isActive: true }),
  });
  const menuQ = useQuery({
    queryKey: ['restaurant-menu-items'],
    queryFn: () => menuItemsApi.list({}).catch(() => [] as RestaurantMenuItem[]),
  });
  const cookQ = useQuery({
    queryKey: ['restaurant-cookability'],
    queryFn: () => recipesApi.cookability().catch(() => null),
    staleTime: 60_000,
  });
  const { data: categories = [] } = useQuery({ queryKey: ['categories'], queryFn: categoriesApi.list });

  /* ── Har product + uska menu profile + "ban sakti hai ya nahi" ── */
  const rows = useMemo(() => {
    const menuBy = new Map<string, RestaurantMenuItem>();
    (menuQ.data ?? []).forEach((m) => { if (m.productId) menuBy.set(m.productId, m); });

    const cookBy = new Map<string, any>();
    (cookQ.data?.rows ?? []).forEach((c) => { if (c.productId) cookBy.set(c.productId, c); });

    return (productsQ.data?.items ?? []).map((p: any) => {
      const m = menuBy.get(p.id);
      const c = cookBy.get(p.id);
      const price = Number(p.price || 0);
      const cost = c ? Number(c.cost || 0) : Number(p.costPrice || 0);
      return {
        ...p,
        _menu: m,
        _cook: c,
        _onMenu: m?.isAvailable ?? true,
        _hasProfile: !!m,
        _hasRecipe: !!c,
        /* 0 = ab ban hi nahi sakti; null = recipe hi nahi */
        _canMake: c ? c.canMake : null,
        _blocker: c?.blocker ?? null,
        _cost: cost,
        _foodCostPct: price > 0 && cost > 0 ? (cost / price) * 100 : 0,
        _sold: Number(m?.totalOrdered ?? 0),
        _prep: m?.prepTimeMinutes ?? null,
        _spice: m?.isSpicy ? (SPICE[m.spiceLevel ?? 'MILD'] || '🌶️') : '',
        _diet: (m?.dietaryTags ?? []).filter((d) => DIET_CHIP[d]).slice(0, 2),
      };
    });
  }, [productsQ.data, menuQ.data, cookQ.data]);

  const stats = useMemo(() => ({
    total: rows.length,
    live: rows.filter((r) => r._onMenu).length,
    off: rows.filter((r) => !r._onMenu).length,
    dead: rows.filter((r) => r._canMake === 0).length,
    /* Menu par chaalu magar ban nahi sakti — sab se bura haal */
    liveButDead: rows.filter((r) => r._onMenu && r._canMake === 0),
    noRecipe: rows.filter((r) => !r._hasRecipe).length,
    noProfile: rows.filter((r) => !r._hasProfile).length,
    costHigh: rows.filter((r) => r._foodCostPct > 45).length,
  }), [rows]);

  const filtered = useMemo(() => {
    const q = search.trim().toLowerCase();
    let list = rows;
    if (kind === 'live') list = list.filter((r) => r._onMenu);
    if (kind === 'off') list = list.filter((r) => !r._onMenu);
    if (kind === 'dead') list = list.filter((r) => r._canMake === 0);
    if (kind === 'norecipe') list = list.filter((r) => !r._hasRecipe);
    if (categoryId !== 'all') {
      list = categoryId === 'none'
        ? list.filter((r) => !r.categoryId)
        : list.filter((r) => r.categoryId === categoryId);
    }
    if (q) list = list.filter((r) =>
      (r.name || '').toLowerCase().includes(q)
      || (r.sku || '').toLowerCase().includes(q)
      || (r.barcode || '').toLowerCase().includes(q)
      || (r.category?.name || '').toLowerCase().includes(q));

    return [...list].sort((a, b) => {
      switch (sortKey) {
        case 'sold': return b._sold - a._sold;
        case 'price-low': return Number(a.price || 0) - Number(b.price || 0);
        case 'price-high': return Number(b.price || 0) - Number(a.price || 0);
        case 'cost-high': return b._foodCostPct - a._foodCostPct;
        case 'newest': return new Date(b.createdAt || 0).getTime() - new Date(a.createdAt || 0).getTime();
        default: return (a.name || '').localeCompare(b.name || '');
      }
    });
  }, [rows, search, kind, categoryId, sortKey]);

  const visible = filtered.slice(0, visibleCount);
  useEffect(() => { setVisibleCount(PAGE_SIZE); }, [search, kind, categoryId, sortKey]);

  const hasFilters = !!search || kind !== 'all' || categoryId !== 'all';
  const clearFilters = () => { setSearch(''); setKind('all'); setCategoryId('all'); };

  /* ── Menu par chaalu / band — sab se zyada chalne wala button ── */
  const toggleMenu = useMutation({
    mutationFn: (menuItemId: string) => menuItemsApi.toggleAvailable(menuItemId),
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ['restaurant-menu-items'] });
      toast.success('Menu update ho gaya');
    },
    onError: () => toast.error('Nahi ho saka'),
  });

  const exportCsv = () => {
    if (filtered.length === 0) return toast.error('Koi dish nahi');
    const head = ['Dish', 'Category', 'Menu par', 'Ban sakti hai', 'Rok kaun raha',
      'Rate', 'Lagat', 'Food cost %', 'Kitni dafa biki', 'Banane ka waqt'];
    const body = filtered.map((r) => [
      r.name, r.category?.name ?? '', r._onMenu ? 'Haan' : 'Nahi',
      r._canMake === null ? 'Recipe nahi' : r._canMake,
      r._blocker?.name ?? '',
      Number(r.price || 0).toFixed(2), r._cost.toFixed(2),
      r._foodCostPct ? r._foodCostPct.toFixed(1) : '',
      r._sold, r._prep ?? '',
    ]);
    const csv = [
      [`Menu — ${tenantName ?? 'Nafaa'}`],
      [`${shopName ? shopName + '  •  ' : ''}${new Date().toLocaleString('en-PK')}`],
      [`${stats.total} dish · ${stats.live} menu par · ${stats.dead} ban nahi sakti`],
      [''], head, ...body,
    ].map((r) => r.map((c) => `"${String(c).replace(/"/g, '""')}"`).join(',')).join('\n');
    const blob = new Blob(['﻿' + csv], { type: 'text/csv;charset=utf-8' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url; a.download = `menu-${new Date().toISOString().slice(0, 10)}.csv`;
    a.click(); URL.revokeObjectURL(url);
    toast.success(`${filtered.length} dish export ho gayin`);
  };

  useEffect(() => {
    const onKey = (e: KeyboardEvent) => {
      const t = document.activeElement?.tagName;
      const typing = t === 'INPUT' || t === 'TEXTAREA' || t === 'SELECT';
      if (e.key === 'Escape') {
        if (scannerOpen) return setScannerOpen(false);
        if (showTeacher) return setShowTeacher(false);
        if (showFilters) return setShowFilters(false);
        return;
      }
      if (typing || e.metaKey || e.ctrlKey || e.altKey) return;
      if (e.key === '/') { e.preventDefault(); searchRef.current?.focus(); }
      const k = e.key.toLowerCase();
      if (k === 'b') { e.preventDefault(); setScannerOpen(true); }
      if (k === 'g') setShowTeacher(true);
      if (k === 'r') productsQ.refetch();
    };
    window.addEventListener('keydown', onKey);
    return () => window.removeEventListener('keydown', onKey);
  }, [scannerOpen, showTeacher, showFilters, productsQ]);

  if (productsQ.isLoading) {
    return (
      <div className="space-y-4 pb-24 animate-pulse">
        <div className="rounded-3xl bg-slate-200 dark:bg-slate-800 h-44" />
        <div className="grid grid-cols-2 lg:grid-cols-4 gap-3">
          {[0, 1, 2, 3].map((i) => <div key={i} className="rounded-2xl bg-slate-200 dark:bg-slate-800 h-24" />)}
        </div>
        <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-4 xl:grid-cols-5 gap-3">
          {Array.from({ length: 10 }).map((_, i) => (
            <div key={i} className="rounded-2xl bg-white dark:bg-slate-900 border-2 border-slate-100 dark:border-slate-800 overflow-hidden">
              <div className="aspect-[4/3] bg-slate-200 dark:bg-slate-800" />
              <div className="p-2.5 space-y-2">
                <div className="h-3 rounded bg-slate-200 dark:bg-slate-800 w-4/5" />
                <div className="h-3 rounded bg-slate-200 dark:bg-slate-800 w-2/5" />
              </div>
            </div>
          ))}
        </div>
      </div>
    );
  }

  return (
    <div className="space-y-4 sm:space-y-5 pb-24 print:space-y-3">
      {stockModal && <QuickStockModal product={stockModal} onClose={() => setStockModal(null)} />}
      {showTeacher && <Teacher onClose={() => setShowTeacher(false)} />}

      {scannerOpen && (
        <BarcodeScanner onClose={() => setScannerOpen(false)}
          onDetected={(code: string) => {
            const clean = code.trim();
            setScannerOpen(false);
            const hit = rows.find((p) => p.barcode === clean || p.sku === clean);
            clearFilters(); setSearch(clean); setVisibleCount(PAGE_SIZE);
            toast[hit ? 'success' : 'error'](hit ? `${hit.name} mil gaya` : `${clean} kisi dish se nahi mila`);
          }} />
      )}

      {/* ═══ PRINT HEADER ═══ */}
      <div className="hidden print:block">
        <div className="flex items-center justify-between border-b-4 border-orange-600 pb-3 mb-4">
          <div>
            <h1 className="text-2xl font-black text-slate-900">🍽️ {tenantName ?? 'Hotel'}</h1>
            <p className="text-xs font-bold text-slate-600 mt-1">
              {shopName ? `${shopName}  •  ` : ''}Menu • {filtered.length} dish
            </p>
          </div>
          <div className="text-right text-xs font-bold text-slate-900">
            {new Date().toLocaleString('en-PK', { dateStyle: 'full' })}
          </div>
        </div>
      </div>

      {/* ═══ HERO ═══ */}
      <section className="relative overflow-hidden rounded-2xl sm:rounded-3xl bg-gradient-to-br from-slate-950 via-orange-900 to-amber-700 text-white p-4 sm:p-6 shadow-2xl print:hidden">
        <div className="absolute -top-24 -right-24 h-72 w-72 rounded-full bg-amber-400/25 blur-3xl pointer-events-none" />
        <div className="absolute inset-0 opacity-[0.06] pointer-events-none"
          style={{ backgroundImage: 'radial-gradient(circle, #fff 1px, transparent 1px)', backgroundSize: '22px 22px' }} />
        <div className="relative flex items-start justify-between gap-4 flex-wrap">
          <div className="min-w-0 flex-1">
            <div className="inline-flex items-center gap-2 rounded-full bg-white/15 backdrop-blur px-3 py-1 text-[11px] font-black border border-white/25 uppercase tracking-widest">
              <UtensilsCrossed className="h-3.5 w-3.5 text-amber-300" /> Hotel
              {shopName && <><span className="opacity-40">•</span><span className="text-emerald-200">🏪 {shopName}</span></>}
            </div>
            <h1 className="mt-2.5 text-2xl sm:text-3xl lg:text-4xl font-black leading-tight">🍽️ Menu</h1>
            <p className="mt-1.5 text-xs sm:text-sm font-bold text-white/90 flex flex-wrap items-center gap-x-1.5 gap-y-1">
              <span className="inline-flex items-center gap-1 rounded-lg bg-white/10 px-2 py-0.5">
                <strong className="text-amber-200">{stats.total}</strong> dish
              </span>
              <span className="inline-flex items-center gap-1 rounded-lg bg-white/10 px-2 py-0.5">
                <strong className="text-emerald-300">{stats.live}</strong> menu par
              </span>
              {stats.dead > 0 && (
                <span className="inline-flex items-center gap-1 rounded-lg bg-rose-400/20 px-2 py-0.5">
                  <strong className="text-rose-300">{stats.dead}</strong> ban nahi sakti
                </span>
              )}
              {stats.costHigh > 0 && !hideCost && (
                <span className="inline-flex items-center gap-1 rounded-lg bg-amber-400/20 px-2 py-0.5">
                  <strong className="text-amber-300">{stats.costHigh}</strong> mehngi par rahi
                </span>
              )}
            </p>
          </div>

          <div className="flex gap-2 flex-wrap items-center shrink-0">
            <button onClick={() => setShowTeacher(true)} title="Sikhein (G)"
              className="h-11 px-3 rounded-xl bg-amber-400/90 hover:bg-amber-400 text-slate-900 text-xs font-black inline-flex items-center gap-1.5 shadow-lg transition">
              <GraduationCap className="h-4 w-4" /> <span className="hidden sm:inline">Sikhein</span>
            </button>
            <PrivacyToggle compact />
            <button onClick={() => productsQ.refetch()} disabled={productsQ.isRefetching} title="Taaza (R)" className={heroBtn}>
              <RefreshCw className={`h-4 w-4 ${productsQ.isRefetching ? 'animate-spin' : ''}`} />
            </button>
            <button onClick={() => window.print()} title="Print" className={heroBtn}><Printer className="h-4 w-4" /></button>
            <Link to="/restaurant/recipes" className={heroBtn}>
              <Soup className="h-4 w-4" /> <span className="hidden lg:inline">Recipe</span>
            </Link>
            <Link to="/restaurant-menu/new"
              className="h-11 px-4 rounded-xl bg-white text-orange-700 hover:bg-orange-50 text-xs font-black inline-flex items-center gap-1.5 shadow-2xl transition active:scale-[0.97]">
              <Plus className="h-4 w-4" /> Nayi dish
            </Link>
          </div>
        </div>
      </section>

      {/* ═══ MENU PAR HAI MAGAR BAN NAHI SAKTI ═══ */}
      {stats.liveButDead.length > 0 && (
        <section className="rounded-2xl sm:rounded-3xl bg-gradient-to-br from-rose-50 to-orange-50 dark:from-rose-500/10 dark:to-orange-500/10 border-2 border-rose-300 dark:border-rose-500/40 p-4 print:hidden">
          <div className="flex items-start gap-3 flex-wrap">
            <span className="h-10 w-10 rounded-xl bg-gradient-to-br from-rose-600 to-red-700 text-white flex items-center justify-center shadow-md shrink-0">
              <Flame className="h-5 w-5" />
            </span>
            <div className="flex-1 min-w-0">
              <h3 className="font-black text-rose-900 dark:text-rose-200 text-sm">
                ⚠️ {stats.liveButDead.length} dish menu par chaalu hai magar saamaan khatam
              </h3>
              <p className="mt-0.5 text-[11px] font-bold text-rose-700 dark:text-rose-300/80">
                Order aa jayega aur kitchen mana kar degi. Switch band kar dein.
              </p>
              <div className="mt-2 flex flex-wrap gap-1.5">
                {stats.liveButDead.slice(0, 6).map((r) => (
                  <button key={r.id}
                    onClick={() => r._menu && toggleMenu.mutate(r._menu.id)}
                    disabled={toggleMenu.isPending}
                    className="px-2.5 py-1.5 rounded-lg bg-white dark:bg-slate-800 border-2 border-rose-200 dark:border-rose-500/40 hover:border-rose-400 text-[11px] font-black text-rose-900 dark:text-rose-200 inline-flex items-center gap-1 disabled:opacity-50 transition">
                    <EyeOff className="h-3 w-3" /> {r.name}
                  </button>
                ))}
              </div>
            </div>
            <button onClick={() => { setKind('dead'); }}
              className="px-3 py-2 rounded-xl bg-rose-600 hover:bg-rose-700 text-white text-xs font-black shrink-0 transition">
              Sab dekhein →
            </button>
          </div>
        </section>
      )}

      {/* ═══ TOOLBAR ═══ */}
      <section className="sticky top-0 z-30 -mx-1 px-1 py-1 print:hidden">
        <div className="rounded-2xl sm:rounded-3xl bg-white/95 dark:bg-slate-900/95 backdrop-blur-xl border-2 border-slate-200 dark:border-slate-800 shadow-lg p-3 sm:p-4 space-y-3">
          <div className="flex gap-2 flex-wrap">
            <div className="relative flex-1 min-w-[200px]">
              <Search className="h-5 w-5 text-slate-400 absolute left-3.5 top-1/2 -translate-y-1/2 pointer-events-none" />
              <input ref={searchRef} value={search} onChange={(e) => setSearch(e.target.value)}
                placeholder="Dish ka naam, SKU, barcode… (/ dabao)"
                className="h-12 w-full rounded-2xl border-2 border-slate-200 dark:border-slate-700 bg-white dark:bg-slate-800 pl-11 pr-10 text-sm font-semibold text-slate-900 dark:text-white focus:outline-none focus:border-orange-500 focus:ring-2 focus:ring-orange-200 dark:focus:ring-orange-500/30 transition" />
              {search && (
                <button onClick={() => setSearch('')} className="absolute right-3 top-1/2 -translate-y-1/2 h-7 w-7 rounded-lg hover:bg-slate-100 dark:hover:bg-slate-700 flex items-center justify-center">
                  <X className="h-4 w-4 text-slate-400" />
                </button>
              )}
            </div>

            <button onClick={() => setScannerOpen(true)} title="Barcode scan (B)"
              className="h-12 px-4 rounded-2xl bg-gradient-to-r from-orange-600 to-amber-700 hover:from-orange-500 hover:to-amber-600 text-white text-sm font-extrabold inline-flex items-center gap-1.5 shadow-lg shadow-orange-500/30 shrink-0 transition active:scale-[0.97]">
              <Barcode className="h-4 w-4" /> <span className="hidden sm:inline">Scan</span>
            </button>

            <button onClick={() => setShowFilters((v) => !v)}
              className={`lg:hidden h-12 px-4 rounded-2xl border-2 text-sm font-extrabold inline-flex items-center gap-1.5 transition ${
                showFilters ? 'border-orange-500 bg-orange-50 dark:bg-orange-500/10 text-orange-700 dark:text-orange-300'
                  : 'border-slate-200 dark:border-slate-700 bg-white dark:bg-slate-800 text-slate-700 dark:text-slate-200'
              }`}>
              <SlidersHorizontal className="h-4 w-4" /> Chaant
              {hasFilters && <span className="h-2 w-2 rounded-full bg-amber-500" />}
            </button>

            <div className="inline-flex rounded-2xl border-2 border-slate-200 dark:border-slate-700 bg-white dark:bg-slate-800 overflow-hidden">
              {([['grid', Grid3x3], ['table', ListIcon]] as const).map(([v, Icon], i) => (
                <button key={v} onClick={() => setView(v)} title={v === 'grid' ? 'Khane' : 'List'}
                  className={`px-4 h-12 transition ${i ? 'border-l-2 border-slate-200 dark:border-slate-700' : ''} ${
                    view === v ? 'bg-orange-600 text-white' : 'text-slate-600 dark:text-slate-300 hover:bg-slate-50 dark:hover:bg-slate-700'
                  }`}><Icon className="h-4 w-4" /></button>
              ))}
            </div>

            <button onClick={exportCsv}
              className="h-12 px-4 rounded-2xl border-2 border-slate-200 dark:border-slate-700 hover:border-orange-300 bg-white dark:bg-slate-800 text-sm font-extrabold text-slate-700 dark:text-slate-200 inline-flex items-center gap-1.5 transition">
              <Download className="h-4 w-4" /> <span className="hidden sm:inline">Export</span>
            </button>
          </div>

          {/* Haalat ki patti */}
          <div className="flex gap-1.5 flex-wrap">
            {([
              ['all', `Sab (${stats.total})`, Package],
              ['live', `Menu par (${stats.live})`, Eye],
              ['off', `Band (${stats.off})`, EyeOff],
              ['dead', `Ban nahi sakti (${stats.dead})`, Flame],
              ['norecipe', `Recipe nahi (${stats.noRecipe})`, Soup],
            ] as const).map(([v, label, Icon]) => (
              <button key={v} onClick={() => setKind(v as Kind)}
                className={`h-10 px-3 rounded-xl border-2 text-[11px] font-black inline-flex items-center gap-1.5 transition active:scale-[0.97] ${
                  kind === v
                    ? v === 'dead'
                      ? 'border-rose-500 bg-rose-50 dark:bg-rose-500/15 text-rose-700 dark:text-rose-300'
                      : 'border-orange-500 bg-orange-50 dark:bg-orange-500/15 text-orange-700 dark:text-orange-300'
                    : 'border-slate-200 dark:border-slate-700 bg-white dark:bg-slate-800 text-slate-600 dark:text-slate-300 hover:border-orange-400'
                }`}>
                <Icon className="h-3.5 w-3.5" /> {label}
              </button>
            ))}
          </div>

          <div className={`gap-2 flex-wrap items-center ${showFilters ? 'flex' : 'hidden lg:flex'}`}>
            <select value={categoryId} onChange={(e) => setCategoryId(e.target.value)} className={sel}>
              <option value="all">Sab Categories ({(categories as any[]).length})</option>
              <option value="none">Bina category</option>
              {(categories as any[]).map((c) => <option key={c.id} value={c.id}>{c.name}</option>)}
            </select>
            <select value={sortKey} onChange={(e) => setSortKey(e.target.value as SortKey)} className={sel}>
              {SORTS.map((s) => <option key={s.v} value={s.v}>{s.l}</option>)}
            </select>
            {hasFilters && (
              <button onClick={clearFilters}
                className="text-xs font-extrabold text-rose-600 dark:text-rose-400 inline-flex items-center gap-1 transition">
                <X className="h-3 w-3" /> Chaant hatao
              </button>
            )}
            <div className="ml-auto text-xs font-extrabold text-slate-500 dark:text-slate-400 tabular-nums">
              {filtered.length} dish
            </div>
          </div>
        </div>
      </section>

      {/* ═══ LIST ═══ */}
      {filtered.length === 0 ? (
        <div className="rounded-3xl bg-white dark:bg-slate-900 border-2 border-dashed border-slate-300 dark:border-slate-700 p-12 text-center">
          <UtensilsCrossed className="h-12 w-12 text-slate-300 mx-auto mb-3" />
          <p className="text-base font-black text-slate-700 dark:text-slate-200">Kuch nahi mila</p>
          <p className="text-xs font-bold text-slate-400 mt-1">
            {hasFilters ? 'Chaant badal kar dekhein' : 'Pehli dish menu me daalein'}
          </p>
          <div className="mt-4 flex gap-2 justify-center flex-wrap">
            {hasFilters && (
              <button onClick={clearFilters} className="h-11 px-4 rounded-xl bg-slate-900 dark:bg-slate-700 text-white text-xs font-black transition">
                Chaant hatayein
              </button>
            )}
            <Link to="/restaurant-menu/new"
              className="h-11 px-4 rounded-xl bg-gradient-to-r from-orange-600 to-amber-700 text-white text-xs font-black inline-flex items-center gap-1.5 transition">
              <Plus className="h-4 w-4" /> Nayi dish
            </Link>
          </div>
        </div>
      ) : view === 'grid' ? (
        <>
          <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-4 xl:grid-cols-5 gap-2.5 sm:gap-3">
            {visible.map((r) => (
              <DishCard key={r.id} r={r} hideCost={hideCost}
                busy={toggleMenu.isPending}
                onToggleMenu={() => r._menu && toggleMenu.mutate(r._menu.id)}
                onStock={() => setStockModal(r)} />
            ))}
          </div>
          {filtered.length > visible.length && (
            <button onClick={() => setVisibleCount((c) => c + PAGE_SIZE)}
              className="w-full h-12 rounded-2xl border-2 border-dashed border-slate-300 dark:border-slate-700 bg-white dark:bg-slate-900 text-sm font-black text-slate-600 dark:text-slate-300 hover:border-orange-400 transition print:hidden">
              Aur {Math.min(PAGE_SIZE, filtered.length - visible.length)} dikhayein
              <span className="text-slate-400"> · {filtered.length - visible.length} baqi</span>
            </button>
          )}
        </>
      ) : (
        <section className="rounded-3xl bg-white dark:bg-slate-900 border-2 border-slate-200 dark:border-slate-800 shadow-sm overflow-hidden">
          <div className="overflow-x-auto">
            <table className="w-full text-sm">
              <thead className="bg-slate-50 dark:bg-slate-800/60 border-b-2 border-slate-100 dark:border-slate-800">
                <tr>
                  <Th>Dish</Th><Th>Category</Th>
                  <Th className="text-right">Rate</Th>
                  <Th className="text-right">Food cost</Th>
                  <Th className="text-right">Ban sakti</Th>
                  <Th className="text-right">Biki</Th>
                  <Th className="text-right print:hidden">Menu par</Th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-100 dark:divide-slate-800">
                {visible.map((r) => (
                  <tr key={r.id} className="hover:bg-slate-50 dark:hover:bg-slate-800/40 transition">
                    <td className="px-3 py-2.5">
                      <Link to={`/restaurant-menu/${r.id}`} className="flex items-center gap-2 min-w-0 group">
                        <Thumb p={r} />
                        <span className="min-w-0">
                          <span className="block text-[13px] font-extrabold text-slate-900 dark:text-white truncate group-hover:text-orange-600 transition">
                            {r.name} {r._spice}
                          </span>
                          <span className="block text-[10px] font-bold text-slate-400 truncate">
                            {r._prep ? `${r._prep} min` : r.sku || '—'}
                          </span>
                        </span>
                      </Link>
                    </td>
                    <td className="px-3 py-2.5 text-[11px] font-bold text-slate-600 dark:text-slate-300 truncate">
                      {r.category?.name ?? '—'}
                    </td>
                    <td className="px-3 py-2.5 text-right text-[13px] font-black text-slate-900 dark:text-white tabular-nums">
                      {formatPKR(r.price)}
                    </td>
                    <td className="px-3 py-2.5 text-right">
                      {hideCost || !r._foodCostPct ? <span className="text-slate-300">—</span> : (
                        <span className={`text-[12px] font-black tabular-nums ${
                          r._foodCostPct > 45 ? 'text-rose-600 dark:text-rose-400' : 'text-emerald-600 dark:text-emerald-400'
                        }`}>{r._foodCostPct.toFixed(0)}%</span>
                      )}
                    </td>
                    <td className="px-3 py-2.5 text-right">
                      {r._canMake === null
                        ? <span className="text-[10px] font-bold text-slate-300">recipe nahi</span>
                        : <span className={`text-[12px] font-black tabular-nums ${
                            r._canMake === 0 ? 'text-rose-600 dark:text-rose-400'
                              : r._canMake <= 5 ? 'text-amber-600 dark:text-amber-400'
                                : 'text-slate-600 dark:text-slate-300'
                          }`}>{r._canMake}</span>}
                    </td>
                    <td className="px-3 py-2.5 text-right text-[12px] font-bold text-slate-600 dark:text-slate-300 tabular-nums">
                      {r._sold || '—'}
                    </td>
                    <td className="px-3 py-2.5 text-right print:hidden">
                      <button onClick={() => r._menu && toggleMenu.mutate(r._menu.id)}
                        disabled={!r._menu || toggleMenu.isPending}
                        role="switch" aria-checked={r._onMenu}
                        className={`relative h-6 w-11 rounded-full shrink-0 disabled:opacity-40 transition ${
                          r._onMenu ? 'bg-emerald-600' : 'bg-slate-300 dark:bg-slate-600'
                        }`}>
                        <span className={`absolute top-0.5 h-5 w-5 rounded-full bg-white shadow transition-all ${
                          r._onMenu ? 'left-[22px]' : 'left-0.5'
                        }`} />
                      </button>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </section>
      )}

      {stats.noProfile > 0 && (
        <section className="rounded-2xl bg-sky-50 dark:bg-sky-500/10 border-2 border-sky-200 dark:border-sky-500/30 p-3 flex items-center gap-2.5 flex-wrap print:hidden">
          <ChefHat className="h-4 w-4 text-sky-600 shrink-0" />
          <p className="flex-1 min-w-[220px] text-[12px] font-bold text-sky-900 dark:text-sky-200">
            <strong>{stats.noProfile} cheezon</strong> ki menu tafseel nahi bhari — na banane ka waqt,
            na masale ka darja, na veg/non-veg. Grahak yehi poochta hai.
          </p>
        </section>
      )}
    </div>
  );
}

/* ════════════════ CHHOTE HISSE ════════════════ */

const heroBtn = 'h-11 px-3 rounded-xl bg-white/15 hover:bg-white/25 border border-white/25 text-xs font-black inline-flex items-center gap-1.5 backdrop-blur transition';
const sel = 'h-11 rounded-xl border-2 border-slate-200 dark:border-slate-700 bg-white dark:bg-slate-800 px-3 text-xs font-bold text-slate-900 dark:text-white focus:outline-none focus:border-orange-500 transition';

function Th({ children, className = '' }: any) {
  return (
    <th className={`px-3 py-2.5 text-left text-[10px] font-black uppercase tracking-wide text-slate-500 dark:text-slate-400 whitespace-nowrap ${className}`}>
      {children}
    </th>
  );
}

function Thumb({ p }: any) {
  const img = p.images?.find((i: any) => i.isPrimary)?.url ?? p.images?.[0]?.url ?? p._menu?.imageUrl;
  return (
    <span className="h-10 w-10 rounded-lg bg-slate-100 dark:bg-slate-800 flex items-center justify-center overflow-hidden shrink-0">
      {img ? <img src={img} alt="" loading="lazy" className="h-full w-full object-cover" />
        : <span className="text-base">{productEmoji(p.name, p.category?.name)}</span>}
    </span>
  );
}

/* ── Ek dish ka khana ──
   Bakery/retail jaisa dhancha, magar neeche ka sab se bara button
   "menu par hai ya nahi" ka switch hai — kitchen din me dus dafa
   ye dabati hai, aur baqi sab us ke baad aata hai. */
function DishCard({ r, hideCost, busy, onToggleMenu, onStock }: any) {
  const img = r.images?.find((i: any) => i.isPrimary)?.url ?? r.images?.[0]?.url ?? r._menu?.imageUrl;
  const dead = r._canMake === 0;
  const tight = r._canMake !== null && r._canMake > 0 && r._canMake <= 5;
  const costHigh = r._foodCostPct > 45;

  return (
    <div className={[
      'group relative rounded-2xl bg-white dark:bg-slate-900/80 border-2 overflow-hidden transition-all duration-200 hover:shadow-xl hover:shadow-orange-500/10 hover:-translate-y-1 avoid-break',
      dead ? 'border-rose-300 dark:border-rose-500/40'
        : tight ? 'border-amber-300 dark:border-amber-500/40'
          : 'border-slate-200 dark:border-slate-800 hover:border-orange-300 dark:hover:border-orange-500/40',
      !r._onMenu ? 'opacity-60' : '',
    ].join(' ')}>
      <Link to={`/restaurant-menu/${r.id}`} className="block">
        <div className="relative aspect-[4/3] bg-slate-100 dark:bg-slate-800 overflow-hidden">
          {img ? (
            <img src={img} alt={r.name} loading="lazy"
              className="h-full w-full object-cover group-hover:scale-105 transition-transform duration-300" />
          ) : (
            <div className={`w-full h-full flex items-center justify-center bg-gradient-to-br ${productTint(r.name)}`}>
              <span className="text-5xl drop-shadow-sm">{productEmoji(r.name, r.category?.name)}</span>
            </div>
          )}

          <div className="absolute top-2 left-2 flex flex-col items-start gap-1">
            {r._menu?.chefSpecial && (
              <span className="px-1.5 py-0.5 rounded-md bg-violet-600 text-white text-[9px] font-black inline-flex items-center gap-0.5">
                <ChefHat className="h-2.5 w-2.5" /> Khaas
              </span>
            )}
            {r._menu?.bestSeller && (
              <span className="px-1.5 py-0.5 rounded-md bg-amber-500 text-white text-[9px] font-black inline-flex items-center gap-0.5">
                <Star className="h-2.5 w-2.5 fill-white" /> Hit
              </span>
            )}
            {r._spice && (
              <span className="px-1.5 py-0.5 rounded-md bg-rose-600 text-white text-[9px] font-black">{r._spice}</span>
            )}
          </div>

          <div className="absolute top-2 right-2 flex flex-col items-end gap-1">
            {r._prep && (
              <span className="px-1.5 py-0.5 rounded-md bg-slate-900/80 text-white text-[9px] font-black inline-flex items-center gap-0.5">
                <Timer className="h-2.5 w-2.5" /> {r._prep}m
              </span>
            )}
            {costHigh && !hideCost && (
              <span className="px-1.5 py-0.5 rounded-md bg-rose-600 text-white text-[9px] font-black">
                {r._foodCostPct.toFixed(0)}%
              </span>
            )}
          </div>

          {/* Neeche patti — kitchen ka sab se ahem paigham */}
          {dead ? (
            <div className="absolute inset-x-0 bottom-0 py-1 text-center text-[10px] font-extrabold text-white bg-rose-600">
              {r._blocker ? `${r._blocker.name.toUpperCase()} KHATAM` : 'BAN NAHI SAKTI'}
            </div>
          ) : tight ? (
            <div className="absolute inset-x-0 bottom-0 py-1 text-center text-[10px] font-extrabold text-white bg-amber-500">
              SIRF {r._canMake} AUR BAN SAKTI
            </div>
          ) : !r._onMenu ? (
            <div className="absolute inset-x-0 bottom-0 py-1 text-center text-[10px] font-extrabold text-white bg-slate-700">
              MENU PAR NAHI
            </div>
          ) : null}
        </div>

        <div className="p-2.5">
          <div className="font-extrabold text-slate-900 dark:text-white text-xs leading-tight line-clamp-2 min-h-[2rem] group-hover:text-orange-600">
            {r.name}
          </div>

          <div className="mt-1 flex items-center gap-1 flex-wrap">
            {r._diet.map((d: string) => (
              <span key={d} className={`text-[9px] font-extrabold px-1.5 py-0.5 rounded-md ${DIET_CHIP[d].c}`}>
                {DIET_CHIP[d].l}
              </span>
            ))}
            {r.category && (
              <span className="text-[9px] font-extrabold px-1.5 py-0.5 rounded-md text-white truncate max-w-[7rem]"
                style={{ backgroundColor: r.category.color || '#64748b' }}>
                {r.category.name}
              </span>
            )}
            {!r._hasRecipe && (
              <span className="text-[9px] font-extrabold px-1.5 py-0.5 rounded-md bg-slate-100 dark:bg-slate-800 text-slate-500">
                recipe nahi
              </span>
            )}
          </div>

          <div className="mt-1.5 flex items-end justify-between gap-1">
            <div className="min-w-0">
              <div className="text-base font-extrabold text-orange-700 dark:text-orange-400 tabular-nums leading-none">
                {formatPKR(r.price || 0)}
              </div>
              <div className="text-[9px] font-bold text-slate-500 dark:text-slate-400 truncate">
                {hideCost || !r._cost ? `per ${r.unit}` : `lagat ${formatPKR(r._cost)}`}
              </div>
            </div>
            <div className="text-right shrink-0">
              <div className="text-sm font-extrabold tabular-nums leading-none text-slate-700 dark:text-slate-300">
                {r._sold || 0}
              </div>
              <div className="text-[9px] font-bold text-slate-500 dark:text-slate-400">biki</div>
            </div>
          </div>
        </div>
      </Link>

      <div className="px-2.5 pb-2.5 flex items-center gap-1 print:hidden">
        {/* Sab se bara button — din me dus dafa dabta hai */}
        <button onClick={onToggleMenu} disabled={!r._menu || busy}
          className={`flex-1 h-9 rounded-lg text-[10px] font-extrabold inline-flex items-center justify-center gap-1 disabled:opacity-40 transition active:scale-[0.97] ${
            r._onMenu
              ? 'bg-emerald-50 dark:bg-emerald-500/15 hover:bg-emerald-100 text-emerald-800 dark:text-emerald-300'
              : 'bg-slate-100 dark:bg-slate-800 hover:bg-slate-200 text-slate-600 dark:text-slate-300'
          }`}>
          {r._onMenu ? <><Eye className="h-3 w-3" /> Menu par</> : <><EyeOff className="h-3 w-3" /> Band hai</>}
        </button>
        <Link to={`/restaurant-menu/${r.id}/edit`} title="Badlein"
          className="h-9 w-9 rounded-lg bg-violet-50 dark:bg-violet-500/15 hover:bg-violet-100 text-violet-700 dark:text-violet-300 flex items-center justify-center transition">
          <Edit3 className="h-3.5 w-3.5" />
        </Link>
        <Link to="/pos" title="POS"
          className="h-9 w-9 rounded-lg bg-orange-50 dark:bg-orange-500/15 hover:bg-orange-100 text-orange-700 dark:text-orange-300 flex items-center justify-center transition">
          <ShoppingCart className="h-3.5 w-3.5" />
        </Link>
        <ProductDeleteButton id={r.id} name={r.name} />
      </div>
    </div>
  );
}

/* ── Sikhein ── */
function Teacher({ onClose }: any) {
  return (
    <div className="fixed inset-0 z-[60] bg-slate-950/75 backdrop-blur-sm flex items-end sm:items-center justify-center p-0 sm:p-4" onClick={onClose}>
      <div onClick={(e) => e.stopPropagation()}
        className="w-full sm:max-w-lg max-h-[88vh] rounded-t-3xl sm:rounded-3xl bg-white dark:bg-slate-900 shadow-2xl flex flex-col overflow-hidden">
        <header className="p-5 bg-gradient-to-br from-amber-500 to-orange-600 text-white shrink-0 flex items-center justify-between gap-2">
          <div>
            <h3 className="text-lg font-black inline-flex items-center gap-2">
              <GraduationCap className="h-5 w-5" /> Menu kaise chalta hai
            </h3>
            <p className="text-xs font-bold text-white/80 mt-0.5">Hotel ke liye banaya gaya</p>
          </div>
          <button onClick={onClose} className="h-9 w-9 rounded-xl bg-white/20 hover:bg-white/30 flex items-center justify-center shrink-0 transition">
            <X className="h-4 w-4" />
          </button>
        </header>
        <div className="flex-1 overflow-y-auto p-5 space-y-3">
          {[
            { i: Eye, t: 'Sab se bara button: menu par hai ya nahi', d: 'Har khane ke neeche hara button. Saamaan khatam ho jaye to dabayein — dish menu se hat jayegi aur POS par nazar nahi aayegi. Kitchen ise din me kai dafa dabati hai, is liye ye sab se samne hai.' },
            { i: Flame, t: 'Laal patti = saamaan khatam', d: 'Recipe ka koi saamaan khatam ho to tasveer ke neeche laal patti aa jati hai, aur us ingredient ka naam bhi. Us dish ka order lena bekaar hai.' },
            { i: TrendingUp, t: 'Food cost 30–35% rakhein', d: 'Rate ka kitna hissa saamaan me gaya — upar daayen likha hota hai. 45% se upar jaye to laal ho jata hai: ya rate kam hai ya recipe mehngi.' },
            { i: Soup, t: 'Recipe ke baghair kuch pata nahi chalta', d: '"Recipe nahi" ka nishan matlab us dish ka food cost bhi pata nahi aur saamaan khatam hone ka pata bhi nahi chalega. Recipe bana dein.' },
            { i: Timer, t: 'Banane ka waqt likh dein', d: 'Har dish par minute likhe hon to counter wala grahak ko sach bata sakta hai, aur KOT par kitchen ko tarteeb samajh aati hai.' },
            { i: Barcode, t: 'Scan bhi chalta hai', d: 'Packed cheezein (bottle, chips) barcode se foran mil jati hain — B dabayein.' },
          ].map((x, n) => (
            <div key={n} className="flex gap-3 rounded-2xl bg-slate-50 dark:bg-slate-800/60 p-3">
              <span className="h-9 w-9 rounded-xl bg-gradient-to-br from-orange-600 to-amber-700 text-white flex items-center justify-center shrink-0">
                <x.i className="h-4 w-4" />
              </span>
              <div className="min-w-0">
                <p className="text-sm font-black text-slate-900 dark:text-white">{x.t}</p>
                <p className="text-[12px] font-bold text-slate-600 dark:text-slate-400 mt-0.5">{x.d}</p>
              </div>
            </div>
          ))}
          <div className="rounded-2xl bg-slate-900 dark:bg-slate-800 p-3">
            <p className="text-[10px] font-black uppercase tracking-widest text-white/60 mb-2">Tez tareeqa</p>
            <div className="flex flex-wrap gap-2">
              {[['/', 'Dhoondein'], ['B', 'Scan'], ['G', 'Ye safha'], ['R', 'Taaza'], ['Esc', 'Band']].map(([k, l]) => (
                <span key={k} className="inline-flex items-center gap-1.5 text-[11px] font-bold text-white/80">
                  <kbd className="px-1.5 py-0.5 rounded bg-white/15 font-black">{k}</kbd> {l}
                </span>
              ))}
            </div>
          </div>
        </div>
        <footer className="p-4 border-t-2 border-slate-100 dark:border-slate-800 shrink-0">
          <Button onClick={onClose} className="w-full bg-gradient-to-r from-orange-600 to-amber-700">Samajh gaya</Button>
        </footer>
      </div>
    </div>
  );
}
