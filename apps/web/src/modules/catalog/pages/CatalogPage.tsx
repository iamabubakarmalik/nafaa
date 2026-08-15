import { useState, useMemo, useEffect, useRef, type ReactNode } from 'react';
import { useQuery } from '@tanstack/react-query';
import {
  Search, X, Package, Sparkles, Eye, Share2,
  Grid3x3, List as ListIcon, Star, ChevronLeft, ChevronRight,
  Filter, MessageCircle, Copy, Layers, TrendingUp,
  Image as ImageIcon, Maximize2, GraduationCap,
  Tag as TagIcon, CheckCircle2, ArrowRight, Printer,
  RefreshCw,
} from 'lucide-react';
import { productsApi, type Product } from '@modules/inventory/products/api/products.api';
import { categoriesApi } from '@modules/inventory/categories/api/categories.api';
import { brandsApi } from '@modules/inventory/brands/api/brands.api';
import { productVariantsApi } from '@modules/inventory/products/api/product-variants.api';
import { settingsApi } from '@modules/organization/settings/api/settings.api';
import { formatPKR, formatPKRFull } from '@core/lib/format';
import { toast } from 'sonner';

/* ═════════════════════════════════════════════════════════════
   NAFAA CATALOG — UNIVERSAL FULL BEST
   ─────────────────────────────────────────────────────────────
   👀 Customer-facing showcase — cost/wholesale kabhi hidden
   🔗 URL-synced filters (share link = filters bhi carry)
   💰 Price range filter • ⭐ Featured chip
   ⌨️ / search • Esc close • ← → image nav
   🌙 Dark mode complete • 🖨️ Print catalog
   💬 WhatsApp share • Copy details
   ═════════════════════════════════════════════════════════════ */

type ViewMode = 'grid' | 'list';
type SortBy = 'newest' | 'name' | 'price-low' | 'price-high' | 'featured';
type Density = 'cozy' | 'comfy' | 'compact';

const PREFS_KEY = 'nafaa-catalog-prefs-v2';

function loadPrefs() {
  try {
    const raw = localStorage.getItem(PREFS_KEY);
    return raw ? JSON.parse(raw) : null;
  } catch { return null; }
}

const GRID_COLS: Record<Density, string> = {
  cozy: 'grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4',
  comfy: 'grid-cols-2 sm:grid-cols-3 md:grid-cols-4 lg:grid-cols-5',
  compact: 'grid-cols-2 sm:grid-cols-4 md:grid-cols-5 lg:grid-cols-6',
};

const SORT_OPTIONS: { v: SortBy; l: string }[] = [
  { v: 'featured', l: '⭐ Featured pehle' },
  { v: 'newest', l: '🆕 Naye pehle' },
  { v: 'name', l: '🔤 Naam A–Z' },
  { v: 'price-low', l: '💰 Kam rate pehle' },
  { v: 'price-high', l: '💎 Mehnga pehle' },
];

export default function CatalogPage() {
  const searchRef = useRef<HTMLInputElement>(null);
  const saved = loadPrefs();

  /* ─── URL-synced filters (refresh pe bhi yaad) ─── */
  const urlParams = typeof window !== 'undefined'
    ? new URLSearchParams(window.location.search)
    : new URLSearchParams();

  const [search, setSearch] = useState(urlParams.get('q') || '');
  const [categoryId, setCategoryId] = useState(urlParams.get('cat') || '');
  const [brandId, setBrandId] = useState(urlParams.get('brand') || '');
  const [featuredOnly, setFeaturedOnly] = useState(urlParams.get('featured') === '1');
  const [minPrice, setMinPrice] = useState(urlParams.get('min') || '');
  const [maxPrice, setMaxPrice] = useState(urlParams.get('max') || '');

  const [selectedProduct, setSelectedProduct] = useState<Product | null>(null);
  const [cleanMode, setCleanMode] = useState(urlParams.get('view') === 'customer');
  const [viewMode, setViewMode] = useState<ViewMode>(saved?.viewMode || 'grid');
  const [density, setDensity] = useState<Density>(saved?.density || 'comfy');
  const [sortBy, setSortBy] = useState<SortBy>(saved?.sortBy || 'featured');
  const [showFilters, setShowFilters] = useState(false);
  const [showGuide, setShowGuide] = useState(false);

  /* ─── Persist view prefs ─── */
  useEffect(() => {
    try {
      localStorage.setItem(PREFS_KEY, JSON.stringify({ viewMode, density, sortBy }));
    } catch { /* ignore */ }
  }, [viewMode, density, sortBy]);

  /* ─── Sync filters → URL (shareable links) ─── */
  useEffect(() => {
    const p = new URLSearchParams();
    if (search) p.set('q', search);
    if (categoryId) p.set('cat', categoryId);
    if (brandId) p.set('brand', brandId);
    if (featuredOnly) p.set('featured', '1');
    if (minPrice) p.set('min', minPrice);
    if (maxPrice) p.set('max', maxPrice);
    if (cleanMode) p.set('view', 'customer');
    const qs = p.toString();
    const newUrl = qs ? `${window.location.pathname}?${qs}` : window.location.pathname;
    window.history.replaceState(null, '', newUrl);
  }, [search, categoryId, brandId, featuredOnly, minPrice, maxPrice, cleanMode]);

  /* ─── Queries ─── */
  const { data: productsData, isLoading, refetch, isRefetching } = useQuery({
    queryKey: ['catalog-products', search, categoryId, brandId],
    queryFn: () => productsApi.list({
      search,
      categoryId: categoryId || undefined,
      brandId: brandId || undefined,
      isActive: true,
      limit: 200,
    }),
  });

  const { data: categories = [] } = useQuery({
    queryKey: ['categories'],
    queryFn: categoriesApi.list,
  });

  const { data: brands = [] } = useQuery({
    queryKey: ['brands'],
    queryFn: () => brandsApi.list(),
  });

  const { data: settings } = useQuery({
    queryKey: ['settings'],
    queryFn: settingsApi.get,
  });

  const shopName = (settings as any)?.shopName || 'Our Shop';

  /* ─── Client-side: featured + price range + sort ─── */
  const products = useMemo(() => {
    let list = [...(productsData?.items ?? [])];
    if (featuredOnly) list = list.filter((p) => p.isFeatured);
    const min = Number(minPrice || 0);
    const max = Number(maxPrice || Infinity);
    if (minPrice) list = list.filter((p) => Number(p.price) >= min);
    if (maxPrice) list = list.filter((p) => Number(p.price) <= max);
    list.sort((a, b) => {
      switch (sortBy) {
        case 'name': return a.name.localeCompare(b.name);
        case 'price-low': return Number(a.price) - Number(b.price);
        case 'price-high': return Number(b.price) - Number(a.price);
        case 'featured': return (b.isFeatured ? 1 : 0) - (a.isFeatured ? 1 : 0);
        case 'newest':
        default:
          return new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime();
      }
    });
    return list;
  }, [productsData?.items, sortBy, featuredOnly, minPrice, maxPrice]);

  /* ─── Stats ─── */
  const stats = useMemo(() => {
    const all = productsData?.items ?? [];
    const featured = all.filter((p) => p.isFeatured).length;
    const totalCategories = new Set(all.map((p) => p.categoryId).filter(Boolean)).size;
    const avgPrice = all.length > 0
      ? all.reduce((s, p) => s + Number(p.price), 0) / all.length
      : 0;
    const priceMax = all.length > 0 ? Math.max(...all.map((p) => Number(p.price))) : 0;
    return { total: all.length, featured, totalCategories, avgPrice, priceMax };
  }, [productsData?.items]);

  /* ─── Share helpers ─── */
  const sharePage = () => {
    const url = window.location.href;
    if (navigator.share) {
      navigator.share({ title: `${shopName} — Catalog`, url }).catch(() => {});
    } else {
      navigator.clipboard.writeText(url);
      toast.success('✓ Catalog link copy ho gaya (filters ke sath!)');
    }
  };

  const shareOnWhatsApp = () => {
    const url = window.location.href;
    const text = `🛍️ *${shopName}*\nHamara catalog dekho (${products.length} items):\n${url}`;
    window.open(`https://wa.me/?text=${encodeURIComponent(text)}`, '_blank');
  };

  const clearFilters = () => {
    setSearch('');
    setCategoryId('');
    setBrandId('');
    setFeaturedOnly(false);
    setMinPrice('');
    setMaxPrice('');
  };

  const hasFilters = !!(search || categoryId || brandId || featuredOnly || minPrice || maxPrice);
  const activeFilterCount = [categoryId, brandId, featuredOnly, minPrice, maxPrice].filter(Boolean).length;

  /* ─── Keyboard ─── */
  useEffect(() => {
    const onKey = (e: KeyboardEvent) => {
      if (e.key === 'Escape') {
        if (showGuide) { setShowGuide(false); return; }
        if (selectedProduct) { setSelectedProduct(null); return; }
        if (cleanMode) { setCleanMode(false); return; }
        return;
      }
      const tag = document.activeElement?.tagName;
      if (tag === 'INPUT' || tag === 'TEXTAREA' || tag === 'SELECT') return;
      if (e.key === '/') { e.preventDefault(); searchRef.current?.focus(); }
      if (e.key.toLowerCase() === 'c' && !cleanMode && !selectedProduct) setCleanMode(true);
    };
    window.addEventListener('keydown', onKey);
    return () => window.removeEventListener('keydown', onKey);
  }, [showGuide, selectedProduct, cleanMode]);

  /* ─── Scroll lock ─── */
  useEffect(() => {
    const prev = document.body.style.overflow;
    document.body.style.overflow = (selectedProduct || showGuide) ? 'hidden' : prev;
    return () => { document.body.style.overflow = prev; };
  }, [selectedProduct, showGuide]);

  return (
    <div className={cleanMode
      ? 'fixed inset-0 z-50 bg-slate-50 dark:bg-slate-950 overflow-auto print:static print:bg-white'
      : 'space-y-4 sm:space-y-5 pb-10 print:space-y-3'
    }>
      {showGuide && <CatalogGuide onClose={() => setShowGuide(false)} />}

      {/* ═══ HERO (admin mode) ═══ */}
      {!cleanMode && (
        <section className="relative overflow-hidden rounded-2xl sm:rounded-3xl bg-gradient-to-br from-slate-950 via-emerald-900 to-emerald-700 dark:from-slate-950 dark:via-emerald-950 dark:to-emerald-900 text-white p-4 sm:p-6 shadow-2xl print:hidden">
          <div className="absolute -top-24 -right-24 h-72 w-72 rounded-full bg-emerald-400/25 blur-3xl pointer-events-none animate-pulse" />
          <div className="absolute -bottom-24 -left-24 h-72 w-72 rounded-full bg-amber-400/15 blur-3xl pointer-events-none" />

          <div className="relative flex items-start justify-between gap-4 flex-wrap">
            <div className="min-w-0 flex-1">
              <div className="inline-flex items-center gap-2 rounded-full bg-white/15 backdrop-blur-md px-3 py-1 text-[11px] font-extrabold border border-white/25 uppercase tracking-widest shadow-lg">
                <Sparkles className="h-3.5 w-3.5 text-amber-300" /> Product Showcase
              </div>
              <h1 className="mt-3 text-2xl sm:text-3xl lg:text-4xl font-extrabold leading-tight">🛍️ Product Catalog</h1>
              <p className="mt-1.5 text-xs sm:text-sm text-white/90 font-semibold max-w-2xl">
                Customer ko phone dikhao ya WhatsApp par bhejo — sirf sale price dikhti hai, cost kabhi nahi
              </p>
            </div>

            <div className="flex gap-2 flex-wrap items-center shrink-0">
              <button
                onClick={() => setShowGuide(true)}
                className="h-11 px-3 rounded-xl bg-amber-400/90 hover:bg-amber-400 text-slate-900 text-xs font-extrabold inline-flex items-center gap-1.5 shadow-lg transition"
              >
                <GraduationCap className="h-4 w-4" /> <span className="hidden sm:inline">Guide</span>
              </button>
              <button
                onClick={() => refetch()}
                disabled={isRefetching}
                className="h-11 px-3 rounded-xl bg-white/15 hover:bg-white/25 border border-white/25 text-xs font-extrabold inline-flex items-center gap-1.5 backdrop-blur-md disabled:opacity-50 transition"
              >
                <RefreshCw className={`h-4 w-4 ${isRefetching ? 'animate-spin' : ''}`} />
                <span className="hidden sm:inline">Refresh</span>
              </button>
              <button
                onClick={shareOnWhatsApp}
                className="h-11 px-3 rounded-xl bg-green-500/30 hover:bg-green-500/50 border border-green-300/40 text-xs font-extrabold inline-flex items-center gap-1.5 backdrop-blur-md transition"
              >
                <MessageCircle className="h-4 w-4" /> <span className="hidden sm:inline">WhatsApp</span>
              </button>
              <button
                onClick={sharePage}
                className="h-11 px-3 rounded-xl bg-white/15 hover:bg-white/25 border border-white/25 text-xs font-extrabold inline-flex items-center gap-1.5 backdrop-blur-md transition"
              >
                <Share2 className="h-4 w-4" /> <span className="hidden sm:inline">Share</span>
              </button>
              <button
                onClick={() => window.print()}
                className="h-11 px-3 rounded-xl bg-white/15 hover:bg-white/25 border border-white/25 text-xs font-extrabold inline-flex items-center gap-1.5 backdrop-blur-md transition"
              >
                <Printer className="h-4 w-4" /> <span className="hidden sm:inline">Print</span>
              </button>
              <button
                onClick={() => setCleanMode(true)}
                className="h-11 px-4 rounded-xl bg-white text-emerald-900 text-xs font-extrabold inline-flex items-center gap-1.5 shadow-lg hover:bg-emerald-50 transition"
              >
                <Eye className="h-4 w-4" /> Customer View
              </button>
            </div>
          </div>

          <div className="relative grid grid-cols-2 sm:grid-cols-4 gap-2 sm:gap-3 mt-5">
            <KpiTile label="Total Products" value={stats.total} icon={Package} tone="emerald" />
            <KpiTile label="Featured" value={stats.featured} icon={Star} tone="amber" />
            <KpiTile label="Categories" value={stats.totalCategories} icon={TagIcon} tone="violet" />
            <KpiTile label="Avg Price" value={formatPKR(stats.avgPrice)} icon={TrendingUp} tone="blue" />
          </div>
        </section>
      )}

      {/* ═══ CLEAN MODE HEADER ═══ */}
      {cleanMode && (
        <div className="sticky top-0 z-40 bg-white/95 dark:bg-slate-900/95 backdrop-blur-md border-b-2 border-slate-200 dark:border-slate-800 shadow-sm print:hidden">
          <div className="max-w-7xl mx-auto px-4 py-3 flex items-center justify-between gap-3 flex-wrap">
            <div className="flex items-center gap-3 min-w-0">
              <div className="h-10 w-10 rounded-xl bg-gradient-to-br from-emerald-500 to-emerald-700 text-white flex items-center justify-center shadow-md shrink-0">
                <Sparkles className="h-5 w-5" />
              </div>
              <div className="min-w-0">
                <h1 className="text-lg sm:text-xl font-extrabold text-slate-900 dark:text-white truncate">{shopName}</h1>
                <p className="text-xs text-slate-500 dark:text-slate-400 font-semibold tabular-nums">{products.length} items</p>
              </div>
            </div>
            <div className="flex items-center gap-2">
              <button
                onClick={shareOnWhatsApp}
                className="h-10 px-3 rounded-xl bg-green-50 dark:bg-green-500/15 hover:bg-green-100 dark:hover:bg-green-500/25 border-2 border-green-200 dark:border-green-500/30 text-green-700 dark:text-green-300 text-xs font-extrabold inline-flex items-center gap-1.5 transition"
              >
                <MessageCircle className="h-4 w-4" /> Share
              </button>
              <button
                onClick={() => setCleanMode(false)}
                className="h-10 px-3 rounded-xl bg-slate-100 dark:bg-slate-800 hover:bg-slate-200 dark:hover:bg-slate-700 text-slate-700 dark:text-slate-200 text-xs font-extrabold inline-flex items-center gap-1.5 transition"
              >
                <X className="h-4 w-4" /> Exit
              </button>
            </div>
          </div>
        </div>
      )}

      <div className={cleanMode ? 'max-w-7xl mx-auto p-4 space-y-4' : 'space-y-4'}>
        {/* ═══ SEARCH + CONTROLS ═══ */}
        <section className="rounded-2xl bg-white dark:bg-slate-900/80 dark:backdrop-blur-sm border-2 border-slate-200 dark:border-slate-800 shadow-sm p-3.5 space-y-3 print:hidden">
          <div className="flex gap-2 flex-wrap">
            <div className="flex-1 min-w-[220px] relative">
              <Search className="h-4 w-4 text-slate-400 absolute left-3 top-1/2 -translate-y-1/2 pointer-events-none" />
              <input
                ref={searchRef}
                className="h-12 w-full rounded-xl border-2 border-slate-200 dark:border-slate-700 bg-white dark:bg-slate-800 pl-10 pr-10 text-sm font-bold text-slate-900 dark:text-white placeholder:text-slate-400 dark:placeholder:text-slate-500 focus:outline-none focus:border-emerald-500 focus:ring-2 focus:ring-emerald-200 dark:focus:ring-emerald-500/30 transition"
                placeholder="Naam, SKU ya brand se dhundo... (/ dabao)"
                value={search}
                onChange={(e) => setSearch(e.target.value)}
              />
              {search && (
                <button onClick={() => setSearch('')} className="absolute right-3 top-1/2 -translate-y-1/2 h-6 w-6 rounded-lg hover:bg-slate-100 dark:hover:bg-slate-700 flex items-center justify-center">
                  <X className="h-3.5 w-3.5 text-slate-400" />
                </button>
              )}
            </div>

            <select
              value={sortBy}
              onChange={(e) => setSortBy(e.target.value as SortBy)}
              className="h-12 rounded-xl border-2 border-slate-200 dark:border-slate-700 bg-white dark:bg-slate-800 px-3 text-xs font-extrabold text-slate-900 dark:text-white focus:outline-none focus:border-emerald-500 transition"
            >
              {SORT_OPTIONS.map((o) => <option key={o.v} value={o.v}>{o.l}</option>)}
            </select>

            {viewMode === 'grid' && (
              <select
                value={density}
                onChange={(e) => setDensity(e.target.value as Density)}
                className="h-12 rounded-xl border-2 border-slate-200 dark:border-slate-700 bg-white dark:bg-slate-800 px-3 text-xs font-extrabold text-slate-900 dark:text-white focus:outline-none focus:border-emerald-500 transition"
                title="Card size"
              >
                <option value="cozy">🖼️ Bare</option>
                <option value="comfy">▦ Normal</option>
                <option value="compact">▤ Chote</option>
              </select>
            )}

            <div className="inline-flex rounded-xl border-2 border-slate-200 dark:border-slate-700 bg-white dark:bg-slate-800 overflow-hidden">
              <button
                onClick={() => setViewMode('grid')}
                className={`px-3.5 h-12 transition ${viewMode === 'grid' ? 'bg-emerald-600 text-white' : 'text-slate-700 dark:text-slate-300 hover:bg-slate-50 dark:hover:bg-slate-700'}`}
                title="Grid view"
              >
                <Grid3x3 className="h-4 w-4" />
              </button>
              <button
                onClick={() => setViewMode('list')}
                className={`px-3.5 h-12 transition border-l-2 border-slate-200 dark:border-slate-700 ${viewMode === 'list' ? 'bg-emerald-600 text-white' : 'text-slate-700 dark:text-slate-300 hover:bg-slate-50 dark:hover:bg-slate-700'}`}
                title="List view"
              >
                <ListIcon className="h-4 w-4" />
              </button>
            </div>

            <button
              onClick={() => setShowFilters((v) => !v)}
              className={`h-12 px-4 rounded-xl border-2 text-xs font-extrabold inline-flex items-center gap-1.5 transition ${
                hasFilters || showFilters
                  ? 'bg-emerald-50 dark:bg-emerald-500/15 border-emerald-300 dark:border-emerald-500/40 text-emerald-700 dark:text-emerald-300'
                  : 'border-slate-200 dark:border-slate-700 hover:bg-slate-50 dark:hover:bg-slate-700 text-slate-700 dark:text-slate-200'
              }`}
            >
              <Filter className="h-4 w-4" /> Filters
              {activeFilterCount > 0 && (
                <span className="ml-0.5 h-5 w-5 rounded-full bg-emerald-600 text-white text-[10px] flex items-center justify-center font-extrabold tabular-nums">
                  {activeFilterCount}
                </span>
              )}
            </button>
          </div>

          {/* Quick chips */}
          <div className="flex gap-1.5 flex-wrap">
            <button
              onClick={() => setFeaturedOnly(false)}
              className={`px-3 py-1.5 rounded-lg text-xs font-extrabold inline-flex items-center gap-1 transition ${
                !featuredOnly
                  ? 'bg-slate-900 dark:bg-white text-white dark:text-slate-900 shadow-sm'
                  : 'bg-slate-100 dark:bg-slate-800 text-slate-700 dark:text-slate-300 hover:bg-slate-200 dark:hover:bg-slate-700'
              }`}
            >
              <Sparkles className="h-3 w-3" /> Sab Products
            </button>
            <button
              onClick={() => setFeaturedOnly(true)}
              className={`px-3 py-1.5 rounded-lg text-xs font-extrabold inline-flex items-center gap-1 transition border-2 ${
                featuredOnly
                  ? 'bg-amber-100 dark:bg-amber-500/15 text-amber-700 dark:text-amber-300 border-amber-300 dark:border-amber-500/40 shadow-sm'
                  : 'bg-amber-50 dark:bg-amber-500/10 text-amber-700 dark:text-amber-300 hover:bg-amber-100 dark:hover:bg-amber-500/20 border-transparent'
              }`}
            >
              <Star className="h-3 w-3 fill-current" /> Sirf Featured ({stats.featured})
            </button>
            {hasFilters && (
              <button
                onClick={clearFilters}
                className="px-3 py-1.5 rounded-lg text-xs font-extrabold text-rose-600 dark:text-rose-400 inline-flex items-center gap-1 transition"
              >
                <X className="h-3 w-3" /> Clear
              </button>
            )}
          </div>

          {/* Filters panel */}
          {showFilters && (
            <div className="grid sm:grid-cols-2 lg:grid-cols-4 gap-3 pt-3 border-t-2 border-slate-100 dark:border-slate-800">
              <div>
                <label className="block text-[10px] font-extrabold text-slate-600 dark:text-slate-400 uppercase mb-1">Category</label>
                <select
                  value={categoryId}
                  onChange={(e) => setCategoryId(e.target.value)}
                  className="h-10 w-full rounded-lg border-2 border-slate-200 dark:border-slate-700 bg-white dark:bg-slate-800 px-2 text-xs font-bold text-slate-900 dark:text-white focus:outline-none focus:border-emerald-500 transition"
                >
                  <option value="">Sab categories</option>
                  {categories.map((c: any) => (
                    <option key={c.id} value={c.id}>{c.name}</option>
                  ))}
                </select>
              </div>
              <div>
                <label className="block text-[10px] font-extrabold text-slate-600 dark:text-slate-400 uppercase mb-1">Brand</label>
                <select
                  value={brandId}
                  onChange={(e) => setBrandId(e.target.value)}
                  className="h-10 w-full rounded-lg border-2 border-slate-200 dark:border-slate-700 bg-white dark:bg-slate-800 px-2 text-xs font-bold text-slate-900 dark:text-white focus:outline-none focus:border-emerald-500 transition"
                >
                  <option value="">Sab brands</option>
                  {brands.map((b) => (
                    <option key={b.id} value={b.id}>{b.name}</option>
                  ))}
                </select>
              </div>
              <div>
                <label className="block text-[10px] font-extrabold text-slate-600 dark:text-slate-400 uppercase mb-1">
                  Price Range {stats.priceMax > 0 && <span className="normal-case text-slate-400">(max {formatPKR(stats.priceMax)})</span>}
                </label>
                <div className="flex gap-1.5">
                  <input
                    type="number"
                    inputMode="numeric"
                    placeholder="Min"
                    value={minPrice}
                    onChange={(e) => setMinPrice(e.target.value)}
                    className="h-10 w-full rounded-lg border-2 border-slate-200 dark:border-slate-700 bg-white dark:bg-slate-800 px-2 text-xs font-bold text-slate-900 dark:text-white tabular-nums focus:outline-none focus:border-emerald-500 transition"
                  />
                  <input
                    type="number"
                    inputMode="numeric"
                    placeholder="Max"
                    value={maxPrice}
                    onChange={(e) => setMaxPrice(e.target.value)}
                    className="h-10 w-full rounded-lg border-2 border-slate-200 dark:border-slate-700 bg-white dark:bg-slate-800 px-2 text-xs font-bold text-slate-900 dark:text-white tabular-nums focus:outline-none focus:border-emerald-500 transition"
                  />
                </div>
              </div>
              <div className="flex items-end">
                <button
                  onClick={clearFilters}
                  disabled={!hasFilters}
                  className="h-10 w-full rounded-lg bg-rose-50 dark:bg-rose-500/10 hover:bg-rose-100 dark:hover:bg-rose-500/20 text-rose-700 dark:text-rose-300 text-xs font-extrabold disabled:opacity-50 transition border-2 border-rose-200 dark:border-rose-500/30"
                >
                  Sab Clear Karo
                </button>
              </div>
            </div>
          )}
        </section>

        {/* ═══ RESULT COUNT ═══ */}
        <div className="flex items-center justify-between flex-wrap gap-2 print:hidden">
          <div className="text-sm text-slate-600 dark:text-slate-300 font-bold tabular-nums">
            <strong className="text-slate-900 dark:text-white">{products.length}</strong> products
            {hasFilters && <span className="text-slate-500 dark:text-slate-400"> (filtered)</span>}
          </div>
          <div className="text-[10px] text-slate-500 dark:text-slate-400 font-bold">
            🔒 Cost aur purchase price customer ko kabhi nahi dikhti
          </div>
        </div>

        {/* ═══ PRINT HEADER (sirf print me dikhta hai) ═══ */}
        <div className="hidden print:block text-center mb-4">
          <h1 className="text-2xl font-extrabold text-slate-900">{shopName}</h1>
          <p className="text-xs text-slate-500 font-semibold">
            Product Catalog • {products.length} items • {new Date().toLocaleDateString('en-PK', { dateStyle: 'long' })}
          </p>
        </div>

        {/* ═══ PRODUCTS ═══ */}
        {isLoading ? (
          <div className={`grid ${GRID_COLS[density]} gap-3 sm:gap-4`}>
            {Array.from({ length: 10 }).map((_, i) => (
              <div key={i} className="aspect-square rounded-2xl bg-slate-100 dark:bg-slate-800 animate-pulse" />
            ))}
          </div>
        ) : products.length === 0 ? (
          <div className="rounded-3xl bg-white dark:bg-slate-900/80 border-2 border-dashed border-slate-300 dark:border-slate-700 p-14 text-center shadow-sm">
            <div className="h-20 w-20 rounded-3xl bg-gradient-to-br from-slate-100 to-slate-200 dark:from-slate-800 dark:to-slate-700 mx-auto flex items-center justify-center shadow-inner mb-4">
              <Package className="h-10 w-10 text-slate-400" />
            </div>
            <h3 className="text-xl font-extrabold text-slate-900 dark:text-white">
              {hasFilters ? 'Kuch nahi mila' : 'Abhi koi product nahi'}
            </h3>
            <p className="text-sm text-slate-500 dark:text-slate-400 mt-1 max-w-md mx-auto font-semibold">
              {hasFilters
                ? 'Search ya filters change karo'
                : 'Active products catalog me yahan dikhenge'}
            </p>
            {hasFilters && (
              <button
                onClick={clearFilters}
                className="mt-4 px-4 py-2 rounded-xl bg-emerald-600 hover:bg-emerald-700 text-white text-sm font-extrabold inline-flex items-center gap-1.5 transition"
              >
                <X className="h-3.5 w-3.5" /> Filters Clear Karo
              </button>
            )}
          </div>
        ) : viewMode === 'grid' ? (
          <div className={`grid ${GRID_COLS[density]} gap-3 sm:gap-4`}>
            {products.map((p) => (
              <CatalogCard key={p.id} product={p} density={density} onClick={() => setSelectedProduct(p)} />
            ))}
          </div>
        ) : (
          <div className="space-y-2">
            {products.map((p) => (
              <CatalogListItem key={p.id} product={p} onClick={() => setSelectedProduct(p)} />
            ))}
          </div>
        )}
      </div>

      {/* ═══ DETAIL MODAL ═══ */}
      {selectedProduct && (
        <ProductDetailModal
          productId={selectedProduct.id}
          shopName={shopName}
          onClose={() => setSelectedProduct(null)}
        />
      )}

      {/* ═══ PRINT CSS ═══ */}
      <style>{`
        @media print {
          @page { size: A4 portrait; margin: 10mm 8mm; }
          html, body {
            background: white !important; color: #0f172a !important;
            print-color-adjust: exact !important; -webkit-print-color-adjust: exact !important;
          }
          .dark body, .dark { background: white !important; color: #0f172a !important; }
          .print\\:hidden { display: none !important; }
          [class*="fixed"] { display: none !important; }
          html, body, #root { height: auto !important; min-height: 0 !important; overflow: visible !important; }
          [class*="sidebar"], [class*="topbar"], nav[class*="fixed"] { display: none !important; }
          .grid > button { page-break-inside: avoid !important; }
          [data-sonner-toaster], [data-sonner-toast], [class*="Toaster"] { display: none !important; visibility: hidden !important; }
        }
      `}</style>
    </div>
  );
}

/* ═════════════════════════════════════════════════════════════
   KPI TILE (hero)
   ═════════════════════════════════════════════════════════════ */
function KpiTile({ label, value, icon: Icon, tone }: { label: string; value: string | number; icon: any; tone: string }) {
  const tones: Record<string, string> = {
    emerald: 'from-emerald-400/30 to-emerald-600/20 border-emerald-300/40',
    blue: 'from-blue-400/30 to-blue-600/20 border-blue-300/40',
    violet: 'from-violet-400/30 to-violet-600/20 border-violet-300/40',
    amber: 'from-amber-400/30 to-amber-600/20 border-amber-300/40',
  };
  return (
    <div className={`rounded-2xl bg-gradient-to-br ${tones[tone]} backdrop-blur border p-3`}>
      <div className="flex items-center gap-1.5 mb-1.5">
        <Icon className="h-3 w-3 opacity-80" />
        <div className="text-[9px] uppercase tracking-wider font-extrabold opacity-90">{label}</div>
      </div>
      <div className="text-xl font-extrabold leading-none text-white tabular-nums">{value}</div>
    </div>
  );
}

/* ═════════════════════════════════════════════════════════════
   CATALOG CARD (grid) — stock badge + density aware
   ═════════════════════════════════════════════════════════════ */
function CatalogCard({ product, onClick, density }: { product: Product; onClick: () => void; density: Density }) {
  const primaryImage = product.images?.[0]?.url;
  const variantCount = product._count?.variants ?? 0;
  const imageCount = product._count?.images ?? 0;
  const isOut = Number((product as any).stock ?? 1) === 0;

  return (
    <button
      onClick={onClick}
      className="group relative rounded-2xl bg-white dark:bg-slate-900 border-2 border-slate-200 dark:border-slate-800 overflow-hidden hover:border-emerald-400 dark:hover:border-emerald-500/50 hover:shadow-xl hover:shadow-emerald-500/10 hover:-translate-y-1 transition-all text-left print:border-slate-300 print:shadow-none print:hover:translate-y-0"
    >
      {product.isFeatured && (
        <div className="absolute top-2 right-2 z-10 px-2 py-1 rounded-full bg-gradient-to-br from-amber-400 to-amber-600 text-white text-[9px] font-extrabold shadow-lg flex items-center gap-1">
          <Star className="h-2.5 w-2.5 fill-white" /> FEATURED
        </div>
      )}

      <div className="aspect-square bg-slate-100 dark:bg-slate-800 overflow-hidden relative">
        {primaryImage ? (
          <img
            src={primaryImage}
            alt={product.name}
            loading="lazy"
            className={`w-full h-full object-cover group-hover:scale-110 transition-transform duration-500 ${isOut ? 'grayscale opacity-60' : ''}`}
          />
        ) : (
          <div className="w-full h-full flex items-center justify-center bg-gradient-to-br from-slate-100 to-slate-200 dark:from-slate-800 dark:to-slate-700">
            <Package className="h-12 w-12 text-slate-400 dark:text-slate-600" />
          </div>
        )}

        {isOut && (
          <div className="absolute inset-0 flex items-center justify-center">
            <span className="px-3 py-1.5 rounded-full bg-slate-900/80 backdrop-blur text-white text-[10px] font-extrabold uppercase tracking-wider rotate-[-6deg] shadow-xl">
              Abhi Khatam
            </span>
          </div>
        )}

        <div className="absolute inset-0 bg-gradient-to-t from-slate-900/60 via-transparent to-transparent opacity-0 group-hover:opacity-100 transition-opacity flex items-end justify-center p-3 print:hidden">
          <div className="px-3 py-1.5 rounded-lg bg-white text-emerald-700 text-xs font-extrabold inline-flex items-center gap-1 shadow-lg">
            <Eye className="h-3.5 w-3.5" /> Details Dekho
          </div>
        </div>

        <div className="absolute bottom-2 left-2 right-2 flex items-center justify-between gap-1">
          {variantCount > 0 && (
            <div className="px-2 py-0.5 rounded-full bg-slate-900/80 backdrop-blur text-white text-[9px] font-extrabold inline-flex items-center gap-1">
              <Layers className="h-2.5 w-2.5" /> {variantCount}
            </div>
          )}
          {imageCount > 1 && (
            <div className="px-2 py-0.5 rounded-full bg-slate-900/80 backdrop-blur text-white text-[9px] font-extrabold inline-flex items-center gap-1 ml-auto">
              <ImageIcon className="h-2.5 w-2.5" /> {imageCount}
            </div>
          )}
        </div>
      </div>

      <div className={`${density === 'compact' ? 'p-2' : 'p-3'} space-y-1`}>
        {product.brand && density !== 'compact' && (
          <div className="text-[9px] uppercase tracking-wider text-violet-700 dark:text-violet-400 font-extrabold truncate">
            {product.brand.name}
          </div>
        )}
        <h3 className={`font-extrabold text-slate-900 dark:text-white line-clamp-2 leading-tight group-hover:text-emerald-700 dark:group-hover:text-emerald-400 transition-colors ${
          density === 'compact' ? 'text-xs' : density === 'cozy' ? 'text-base' : 'text-sm'
        }`}>
          {product.name}
        </h3>
        <div className="flex items-end justify-between pt-0.5">
          <div className={`text-emerald-700 dark:text-emerald-400 font-extrabold tabular-nums ${
            density === 'compact' ? 'text-sm' : 'text-base'
          }`}>
            {formatPKRFull(product.price)}
          </div>
          {density !== 'compact' && (
            <div className="text-[9px] text-slate-500 dark:text-slate-400 font-bold">/ {product.unit}</div>
          )}
        </div>
      </div>
    </button>
  );
}

/* ═════════════════════════════════════════════════════════════
   CATALOG LIST ITEM
   ═════════════════════════════════════════════════════════════ */
function CatalogListItem({ product, onClick }: { product: Product; onClick: () => void }) {
  const primaryImage = product.images?.[0]?.url;
  const variantCount = product._count?.variants ?? 0;
  const isOut = Number((product as any).stock ?? 1) === 0;

  return (
    <button
      onClick={onClick}
      className="group w-full rounded-2xl bg-white dark:bg-slate-900 border-2 border-slate-200 dark:border-slate-800 overflow-hidden hover:border-emerald-400 dark:hover:border-emerald-500/50 hover:shadow-lg transition-all text-left flex items-center gap-4 p-3"
    >
      <div className="h-20 w-20 rounded-xl bg-slate-100 dark:bg-slate-800 overflow-hidden shrink-0 relative">
        {primaryImage ? (
          <img src={primaryImage} alt={product.name} loading="lazy" className={`w-full h-full object-cover group-hover:scale-110 transition-transform ${isOut ? 'grayscale opacity-60' : ''}`} />
        ) : (
          <div className="w-full h-full flex items-center justify-center">
            <Package className="h-8 w-8 text-slate-400 dark:text-slate-600" />
          </div>
        )}
        {isOut && (
          <div className="absolute inset-0 flex items-center justify-center bg-slate-900/40">
            <span className="text-[8px] font-extrabold text-white uppercase">Khatam</span>
          </div>
        )}
      </div>

      <div className="flex-1 min-w-0">
        <div className="flex items-center gap-2 flex-wrap">
          {product.brand && (
            <span className="text-[10px] uppercase tracking-wider text-violet-700 dark:text-violet-400 font-extrabold">{product.brand.name}</span>
          )}
          {product.isFeatured && (
            <span className="inline-flex items-center gap-0.5 px-1.5 py-0.5 rounded-full bg-amber-100 dark:bg-amber-500/15 text-amber-700 dark:text-amber-300 text-[9px] font-extrabold">
              <Star className="h-2.5 w-2.5 fill-current" /> FEATURED
            </span>
          )}
        </div>
        <h3 className="font-extrabold text-slate-900 dark:text-white text-base mt-0.5 group-hover:text-emerald-700 dark:group-hover:text-emerald-400 transition-colors line-clamp-1">
          {product.name}
        </h3>
        {product.shortDescription && (
          <p className="text-xs text-slate-500 dark:text-slate-400 line-clamp-1 mt-0.5 font-semibold">{product.shortDescription}</p>
        )}
        <div className="flex items-center gap-2 mt-1 flex-wrap">
          {variantCount > 0 && (
            <span className="text-[10px] font-bold text-violet-700 dark:text-violet-300 bg-violet-50 dark:bg-violet-500/10 px-2 py-0.5 rounded-full inline-flex items-center gap-0.5">
              <Layers className="h-2.5 w-2.5" /> {variantCount} options
            </span>
          )}
          {product.category && (
            <span className="text-[10px] font-bold text-slate-600 dark:text-slate-400">{(product.category as any).name}</span>
          )}
        </div>
      </div>

      <div className="text-right shrink-0">
        <div className="text-xl font-extrabold text-emerald-700 dark:text-emerald-400 tabular-nums">{formatPKRFull(product.price)}</div>
        <div className="text-[10px] text-slate-500 dark:text-slate-400 font-bold">/ {product.unit}</div>
        <div className="mt-1 opacity-0 group-hover:opacity-100 transition-opacity print:hidden">
          <ArrowRight className="h-4 w-4 text-emerald-600 dark:text-emerald-400 ml-auto" />
        </div>
      </div>
    </button>
  );
}

/* ═════════════════════════════════════════════════════════════
   PRODUCT DETAIL MODAL — keyboard nav + zoom + share
   ═════════════════════════════════════════════════════════════ */
function ProductDetailModal({ productId, shopName, onClose }: { productId: string; shopName: string; onClose: () => void }) {
  const { data: product, isLoading } = useQuery({
    queryKey: ['catalog-product', productId],
    queryFn: () => productsApi.getOne(productId),
  });

  const { data: variants = [] } = useQuery({
    queryKey: ['catalog-variants', productId],
    queryFn: () => productVariantsApi.list(productId),
  });

  const activeVariants = useMemo(
    () => variants.filter((v) => v.isActive !== false),
    [variants],
  );

  const [selectedVariantId, setSelectedVariantId] = useState<string | null>(null);
  const [activeImageIndex, setActiveImageIndex] = useState(0);
  const [zoomed, setZoomed] = useState(false);

  const selectedVariant = activeVariants.find((v) => v.id === selectedVariantId);

  const allImages = useMemo(() => {
    if (!product) return [];
    const imgs = [...(product.images ?? [])];
    if (selectedVariant?.imageUrl) {
      return [{ id: 'variant', url: selectedVariant.imageUrl, isPrimary: true } as any, ...imgs];
    }
    return imgs;
  }, [product, selectedVariant]);

  const displayImage = allImages[activeImageIndex]?.url;
  const displayPrice = selectedVariant?.price ?? product?.price ?? 0;
  const isOut = Number((product as any)?.stock ?? 1) === 0;

  useEffect(() => {
    setActiveImageIndex(0);
  }, [selectedVariantId]);

  const nextImage = () => setActiveImageIndex((i) => (i + 1) % Math.max(allImages.length, 1));
  const prevImage = () => setActiveImageIndex((i) => (i - 1 + allImages.length) % Math.max(allImages.length, 1));

  /* ─── Keyboard: ← → images, Esc zoom/close ─── */
  useEffect(() => {
    const onKey = (e: KeyboardEvent) => {
      if (e.key === 'Escape') {
        if (zoomed) { setZoomed(false); return; }
        onClose();
        return;
      }
      if (e.key === 'ArrowRight') { e.preventDefault(); nextImage(); }
      if (e.key === 'ArrowLeft') { e.preventDefault(); prevImage(); }
    };
    window.addEventListener('keydown', onKey);
    return () => window.removeEventListener('keydown', onKey);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [zoomed, allImages.length, onClose]);

  const handleCopyDetails = () => {
    if (!product) return;
    const text = `${product.name}\nPrice: ${formatPKRFull(displayPrice)} / ${product.unit}${
      selectedVariant ? `\nOption: ${selectedVariant.name}` : ''
    }${product.shortDescription ? `\n${product.shortDescription}` : ''}`;
    navigator.clipboard.writeText(text);
    toast.success('✓ Product details copy ho gaye');
  };

  const handleShareWhatsApp = () => {
    if (!product) return;
    const text = `🛍️ *${product.name}* — ${shopName}\n💰 Price: ${formatPKRFull(displayPrice)} / ${product.unit}${
      selectedVariant ? `\n✨ Option: ${selectedVariant.name}` : ''
    }${product.shortDescription ? `\n📝 ${product.shortDescription}` : ''}`;
    window.open(`https://wa.me/?text=${encodeURIComponent(text)}`, '_blank');
  };

  return (
    <div
      className="fixed inset-0 z-50 bg-black/70 backdrop-blur-sm flex items-end sm:items-center justify-center p-0 sm:p-4"
      onClick={onClose}
    >
      <div
        className="bg-white dark:bg-slate-900 w-full sm:max-w-5xl sm:rounded-3xl rounded-t-3xl shadow-2xl max-h-[95vh] overflow-auto border-2 border-slate-200 dark:border-slate-800"
        onClick={(e) => e.stopPropagation()}
      >
        {/* Sticky header */}
        <div className="sticky top-0 z-10 bg-white/95 dark:bg-slate-900/95 backdrop-blur-md border-b-2 border-slate-100 dark:border-slate-800 px-4 sm:px-5 py-3 flex items-center justify-between gap-2">
          <div className="flex items-center gap-2 min-w-0">
            <div className="h-8 w-8 rounded-lg bg-gradient-to-br from-emerald-500 to-emerald-700 text-white flex items-center justify-center shrink-0 shadow-sm">
              <Package className="h-4 w-4" />
            </div>
            <div className="font-extrabold text-slate-900 dark:text-white truncate">{product?.name || 'Loading...'}</div>
          </div>
          <div className="flex items-center gap-1.5 shrink-0">
            <button
              onClick={handleShareWhatsApp}
              className="h-9 w-9 rounded-lg bg-green-50 dark:bg-green-500/15 hover:bg-green-100 dark:hover:bg-green-500/25 text-green-700 dark:text-green-300 flex items-center justify-center transition"
              title="WhatsApp par bhejo"
            >
              <MessageCircle className="h-4 w-4" />
            </button>
            <button
              onClick={onClose}
              className="h-9 w-9 rounded-full bg-slate-100 dark:bg-slate-800 hover:bg-slate-200 dark:hover:bg-slate-700 flex items-center justify-center transition"
              title="Band karo (Esc)"
            >
              <X className="h-4 w-4 text-slate-700 dark:text-slate-300" />
            </button>
          </div>
        </div>

        {isLoading || !product ? (
          <div className="p-16 text-center">
            <div className="inline-block h-12 w-12 rounded-full border-4 border-emerald-200 dark:border-emerald-500/30 border-t-emerald-600 dark:border-t-emerald-400 animate-spin" />
            <p className="text-sm text-slate-500 dark:text-slate-400 font-bold mt-3">Product load ho raha hai...</p>
          </div>
        ) : (
          <div className="grid md:grid-cols-2 gap-0">
            {/* ─── IMAGE SIDE ─── */}
            <div className="bg-gradient-to-br from-slate-100 to-slate-200 dark:from-slate-800 dark:to-slate-900 relative">
              <div className="aspect-square md:aspect-auto md:min-h-[500px] relative group">
                {displayImage ? (
                  <>
                    <img
                      src={displayImage}
                      alt={product.name}
                      onClick={() => setZoomed(true)}
                      className={`w-full h-full object-cover cursor-zoom-in ${isOut ? 'grayscale opacity-70' : ''}`}
                    />
                    <button
                      onClick={() => setZoomed(true)}
                      className="absolute top-3 right-3 h-9 w-9 rounded-full bg-white/90 dark:bg-slate-800/90 backdrop-blur hover:bg-white dark:hover:bg-slate-700 text-slate-700 dark:text-slate-200 flex items-center justify-center shadow-md transition"
                      title="Zoom"
                    >
                      <Maximize2 className="h-4 w-4" />
                    </button>
                  </>
                ) : (
                  <div className="w-full h-full flex items-center justify-center min-h-[300px]">
                    <Package className="h-24 w-24 text-slate-400 dark:text-slate-600" />
                  </div>
                )}

                {allImages.length > 1 && (
                  <>
                    <button
                      onClick={prevImage}
                      className="absolute left-3 top-1/2 -translate-y-1/2 h-10 w-10 rounded-full bg-white/90 dark:bg-slate-800/90 backdrop-blur hover:bg-white dark:hover:bg-slate-700 text-slate-700 dark:text-slate-200 flex items-center justify-center shadow-lg transition opacity-0 group-hover:opacity-100"
                    >
                      <ChevronLeft className="h-5 w-5" />
                    </button>
                    <button
                      onClick={nextImage}
                      className="absolute right-3 top-1/2 -translate-y-1/2 h-10 w-10 rounded-full bg-white/90 dark:bg-slate-800/90 backdrop-blur hover:bg-white dark:hover:bg-slate-700 text-slate-700 dark:text-slate-200 flex items-center justify-center shadow-lg transition opacity-0 group-hover:opacity-100"
                    >
                      <ChevronRight className="h-5 w-5" />
                    </button>
                    <div className="absolute bottom-3 left-1/2 -translate-x-1/2 px-2.5 py-1 rounded-full bg-slate-900/70 backdrop-blur text-white text-[10px] font-extrabold tabular-nums">
                      {activeImageIndex + 1} / {allImages.length} <span className="opacity-60 font-bold">• ← → keys</span>
                    </div>
                  </>
                )}

                {product.isFeatured && (
                  <div className="absolute top-3 left-3 px-2.5 py-1 rounded-full bg-gradient-to-br from-amber-400 to-amber-600 text-white text-[10px] font-extrabold shadow-lg flex items-center gap-1">
                    <Star className="h-3 w-3 fill-white" /> FEATURED
                  </div>
                )}

                {isOut && (
                  <div className="absolute bottom-3 right-3 px-2.5 py-1 rounded-full bg-rose-600 text-white text-[10px] font-extrabold shadow-lg">
                    Abhi Stock Khatam
                  </div>
                )}
              </div>

              {allImages.length > 1 && (
                <div className="bg-white dark:bg-slate-900 border-t-2 border-slate-100 dark:border-slate-800 p-3 flex gap-2 overflow-x-auto">
                  {allImages.map((img, i) => (
                    <button
                      key={img.id || i}
                      onClick={() => setActiveImageIndex(i)}
                      className={`h-14 w-14 rounded-lg overflow-hidden shrink-0 border-2 transition ${
                        activeImageIndex === i
                          ? 'border-emerald-500 ring-2 ring-emerald-200 dark:ring-emerald-500/30 shadow-md'
                          : 'border-slate-200 dark:border-slate-700 hover:border-emerald-300 dark:hover:border-emerald-500/50'
                      }`}
                    >
                      <img src={img.url} alt="" className="w-full h-full object-cover" />
                    </button>
                  ))}
                </div>
              )}
            </div>

            {/* ─── DETAILS SIDE ─── */}
            <div className="p-5 sm:p-6 space-y-5">
              {product.brand && (
                <div className="inline-flex items-center gap-1.5 px-2.5 py-0.5 rounded-full bg-violet-50 dark:bg-violet-500/10 border-2 border-violet-200 dark:border-violet-500/30">
                  <span className="h-1.5 w-1.5 rounded-full bg-violet-500" />
                  <span className="text-[10px] uppercase tracking-wider text-violet-700 dark:text-violet-300 font-extrabold">
                    {product.brand.name}
                  </span>
                </div>
              )}

              <div>
                <h2 className="text-2xl sm:text-3xl font-extrabold text-slate-900 dark:text-white leading-tight">{product.name}</h2>
                {product.shortDescription && (
                  <p className="text-sm text-slate-600 dark:text-slate-300 mt-2 font-semibold">{product.shortDescription}</p>
                )}
              </div>

              <div className="rounded-2xl bg-gradient-to-br from-emerald-50 to-green-50 dark:from-emerald-500/10 dark:to-green-500/10 border-2 border-emerald-200 dark:border-emerald-500/30 p-4">
                <div className="flex items-baseline gap-2 flex-wrap">
                  <div className="text-3xl sm:text-4xl font-extrabold text-emerald-700 dark:text-emerald-300 tabular-nums leading-none">
                    {formatPKRFull(displayPrice)}
                  </div>
                  <div className="text-sm text-emerald-700 dark:text-emerald-400 font-extrabold">/ {product.unit}</div>
                </div>
                {selectedVariant && (
                  <div className="text-xs text-emerald-700 dark:text-emerald-300 font-bold mt-1.5 inline-flex items-center gap-1">
                    <CheckCircle2 className="h-3 w-3" />
                    {selectedVariant.name}
                  </div>
                )}
              </div>

              {product.description && (
                <div className="rounded-xl bg-slate-50 dark:bg-slate-800/60 border border-slate-200 dark:border-slate-700 p-4">
                  <div className="text-[10px] uppercase tracking-wider font-extrabold text-slate-600 dark:text-slate-400 mb-2">Details</div>
                  <p className="text-sm text-slate-700 dark:text-slate-200 leading-relaxed whitespace-pre-line">{product.description}</p>
                </div>
              )}

              {/* Variants */}
              {activeVariants.length > 0 && (
                <div>
                  <div className="flex items-center justify-between mb-3">
                    <div className="text-sm font-extrabold text-slate-900 dark:text-white inline-flex items-center gap-1.5">
                      <Layers className="h-4 w-4 text-violet-600 dark:text-violet-400" />
                      Options ({activeVariants.length})
                    </div>
                    {selectedVariantId && (
                      <button
                        onClick={() => setSelectedVariantId(null)}
                        className="text-[10px] font-extrabold text-rose-600 dark:text-rose-400 hover:underline"
                      >
                        Clear
                      </button>
                    )}
                  </div>

                  <div className="grid grid-cols-3 sm:grid-cols-4 gap-2">
                    {activeVariants.map((v) => {
                      const isSelected = selectedVariantId === v.id;
                      return (
                        <button
                          key={v.id}
                          onClick={() => setSelectedVariantId(isSelected ? null : v.id)}
                          className={`relative rounded-xl border-2 overflow-hidden transition-all hover:-translate-y-0.5 ${
                            isSelected
                              ? 'border-emerald-500 ring-2 ring-emerald-200 dark:ring-emerald-500/30 shadow-lg'
                              : 'border-slate-200 dark:border-slate-700 hover:border-emerald-300 dark:hover:border-emerald-500/50 hover:shadow-md'
                          }`}
                        >
                          <div className="aspect-square bg-slate-100 dark:bg-slate-800">
                            {v.imageUrl ? (
                              <img src={v.imageUrl} alt={v.name} loading="lazy" className="w-full h-full object-cover" />
                            ) : v.colorHex ? (
                              <div className="w-full h-full relative" style={{ backgroundColor: v.colorHex }}>
                                <div className="absolute bottom-1 left-1 bg-black/40 backdrop-blur rounded px-1 text-white text-[8px] font-extrabold">
                                  {v.colorHex}
                                </div>
                              </div>
                            ) : (
                              <div className="w-full h-full flex items-center justify-center bg-gradient-to-br from-slate-100 to-slate-200 dark:from-slate-800 dark:to-slate-700">
                                <Package className="h-6 w-6 text-slate-400 dark:text-slate-600" />
                              </div>
                            )}
                          </div>
                          <div className="px-2 py-1.5 bg-white dark:bg-slate-900">
                            <div className="text-[11px] font-extrabold text-slate-900 dark:text-white truncate">
                              {v.size || v.color || v.name}
                            </div>
                            <div className="text-[10px] text-emerald-700 dark:text-emerald-400 font-extrabold tabular-nums">
                              {formatPKRFull(v.price)}
                            </div>
                          </div>
                          {isSelected && (
                            <div className="absolute top-1 right-1 h-5 w-5 rounded-full bg-emerald-500 text-white flex items-center justify-center shadow-md">
                              <CheckCircle2 className="h-3 w-3" />
                            </div>
                          )}
                        </button>
                      );
                    })}
                  </div>

                  {selectedVariant && (
                    <div className="mt-3 rounded-xl bg-gradient-to-br from-emerald-50 to-green-50 dark:from-emerald-500/10 dark:to-green-500/10 border-2 border-emerald-200 dark:border-emerald-500/30 p-3 text-sm">
                      <div className="font-extrabold text-emerald-900 dark:text-emerald-200 flex items-center gap-1.5">
                        <CheckCircle2 className="h-4 w-4" />
                        {selectedVariant.name}
                      </div>
                      <div className="flex items-center gap-3 mt-1.5 text-xs text-emerald-800 dark:text-emerald-300 font-semibold flex-wrap">
                        {selectedVariant.sku && <span>SKU: <strong className="font-mono">{selectedVariant.sku}</strong></span>}
                        {selectedVariant.size && <span>Size: <strong>{selectedVariant.size}</strong></span>}
                        {selectedVariant.color && <span>Color: <strong>{selectedVariant.color}</strong></span>}
                      </div>
                    </div>
                  )}
                </div>
              )}

              {/* Actions */}
              <div className="flex gap-2 pt-3 border-t-2 border-slate-100 dark:border-slate-800">
                <button
                  onClick={handleCopyDetails}
                  className="flex-1 h-12 rounded-xl bg-slate-100 dark:bg-slate-800 hover:bg-slate-200 dark:hover:bg-slate-700 text-slate-900 dark:text-white font-extrabold text-sm inline-flex items-center justify-center gap-2 transition active:scale-95"
                >
                  <Copy className="h-4 w-4" /> Copy
                </button>
                <button
                  onClick={handleShareWhatsApp}
                  className="flex-1 h-12 rounded-xl bg-gradient-to-r from-green-500 to-green-600 hover:from-green-600 hover:to-green-700 text-white font-extrabold text-sm inline-flex items-center justify-center gap-2 shadow-md transition active:scale-95"
                >
                  <MessageCircle className="h-4 w-4" /> WhatsApp
                </button>
              </div>
            </div>
          </div>
        )}
      </div>

      {/* ─── ZOOM OVERLAY ─── */}
      {zoomed && displayImage && (
        <div
          className="fixed inset-0 z-[60] bg-slate-950/95 backdrop-blur flex items-center justify-center p-4"
          onClick={() => setZoomed(false)}
        >
          <button
            onClick={() => setZoomed(false)}
            className="absolute top-4 right-4 h-10 w-10 rounded-full bg-white/15 backdrop-blur hover:bg-white/25 text-white flex items-center justify-center transition"
          >
            <X className="h-5 w-5" />
          </button>
          {allImages.length > 1 && (
            <>
              <button
                onClick={(e) => { e.stopPropagation(); prevImage(); }}
                className="absolute left-4 top-1/2 -translate-y-1/2 h-11 w-11 rounded-full bg-white/15 backdrop-blur hover:bg-white/25 text-white flex items-center justify-center transition"
              >
                <ChevronLeft className="h-6 w-6" />
              </button>
              <button
                onClick={(e) => { e.stopPropagation(); nextImage(); }}
                className="absolute right-4 top-1/2 -translate-y-1/2 h-11 w-11 rounded-full bg-white/15 backdrop-blur hover:bg-white/25 text-white flex items-center justify-center transition"
              >
                <ChevronRight className="h-6 w-6" />
              </button>
            </>
          )}
          <img
            src={displayImage}
            alt={product?.name}
            className="max-w-full max-h-full object-contain rounded-xl shadow-2xl"
            onClick={(e) => e.stopPropagation()}
          />
        </div>
      )}
    </div>
  );
}

/* ═════════════════════════════════════════════════════════════
   GUIDE — "Catalog kaise use karein"
   ═════════════════════════════════════════════════════════════ */
function CatalogGuide({ onClose }: { onClose: () => void }) {
  return (
    <div
      className="fixed inset-0 z-50 bg-black/60 backdrop-blur-sm flex items-end sm:items-center justify-center p-3"
      onClick={onClose}
    >
      <div
        className="w-full max-w-lg max-h-[90vh] overflow-y-auto rounded-3xl bg-white dark:bg-slate-900 border-2 border-emerald-300 dark:border-emerald-500/40 shadow-2xl"
        onClick={(e) => e.stopPropagation()}
      >
        <div className="px-5 py-3 border-b-2 border-emerald-200 dark:border-emerald-500/30 bg-gradient-to-r from-emerald-50 to-green-50 dark:from-emerald-500/15 dark:to-green-500/15 flex items-center justify-between sticky top-0 z-10">
          <h3 className="font-extrabold text-emerald-900 dark:text-emerald-200 flex items-center gap-2">
            <GraduationCap className="h-5 w-5" /> Catalog Kaise Use Karein?
          </h3>
          <button onClick={onClose} className="h-8 w-8 rounded-lg hover:bg-white dark:hover:bg-slate-800 flex items-center justify-center transition">
            <X className="h-4 w-4 text-slate-600 dark:text-slate-300" />
          </button>
        </div>

        <div className="p-5 space-y-4">
          <p className="text-sm font-semibold text-slate-700 dark:text-slate-200 leading-relaxed">
            Ye tumhara <strong>digital showroom</strong> hai. Customer aaye to <strong>Customer View</strong> kholo
            aur phone uske haath me de do — woh khud products dekhega, rate dekhega.
            <strong> Cost ya purchase price kabhi nahi dikhti.</strong>
          </p>

          <div className="rounded-xl bg-slate-50 dark:bg-slate-800/60 border border-slate-200 dark:border-slate-700 p-3.5">
            <div className="text-[10px] font-extrabold uppercase tracking-wider text-slate-500 dark:text-slate-400 mb-2">3 Tareeqe</div>
            <div className="space-y-2">
              <FlowRow num="👀" title="Customer View" desc="Dukan par — phone/tablet customer ko do, clean screen" />
              <FlowRow num="💬" title="WhatsApp Share" desc="Ghar baithe customer ko link bhejo — products + rate" />
              <FlowRow num="🔗" title="Filter + Share" desc="Category set karke link copy karo — filter bhi carry hota hai!" />
            </div>
          </div>

          <div className="rounded-xl bg-slate-50 dark:bg-slate-800/60 border border-slate-200 dark:border-slate-700 p-3 space-y-1.5 text-xs font-semibold text-slate-700 dark:text-slate-200">
            <TipRow><strong>⭐ Featured</strong> — products page se ⭐ mark karo, catalog me sab se upar aayenge</TipRow>
            <TipRow><strong>⌨️ Shortcuts</strong> — <span className="font-mono">/</span> search, <span className="font-mono">C</span> customer view, <span className="font-mono">Esc</span> band</TipRow>
            <TipRow><strong>🖼️ Arrows</strong> — photo khol ke <span className="font-mono">← →</span> keys se agli photo</TipRow>
            <TipRow><strong>🖨️ Print</strong> — price list ka printed catalog ban jata hai</TipRow>
          </div>

          <div className="rounded-2xl border-2 border-emerald-200 dark:border-emerald-500/30 bg-emerald-50 dark:bg-emerald-500/10 p-4">
            <div className="flex items-start gap-3">
              <div className="h-10 w-10 rounded-xl bg-emerald-600 text-white flex items-center justify-center shrink-0 shadow-lg">
                <Sparkles className="h-5 w-5" />
              </div>
              <div>
                <h4 className="font-extrabold text-emerald-900 dark:text-emerald-300">Golden Rule</h4>
                <p className="text-xs font-semibold text-emerald-800 dark:text-emerald-200 mt-1 leading-relaxed">
                  Har product ki achi photo lagao — catalog me photo wala product
                  10x zyada sell hota hai. Baghair photo ka product customer skip kar deta hai.
                </p>
              </div>
            </div>
          </div>

          <button
            onClick={onClose}
            className="w-full h-12 rounded-2xl bg-gradient-to-r from-emerald-600 to-green-700 text-white font-extrabold shadow-lg shadow-emerald-500/30 hover:shadow-xl transition"
          >
            Samajh Gaya 👍
          </button>
        </div>
      </div>
    </div>
  );
}

/* ═════════════════════════════════════════════════════════════
   SMALL COMPONENTS
   ═════════════════════════════════════════════════════════════ */
function FlowRow({ num, title, desc }: { num: string; title: string; desc: string }) {
  return (
    <div className="flex items-start gap-2.5">
      <div className="h-8 w-8 rounded-lg bg-emerald-100 dark:bg-emerald-500/20 flex items-center justify-center text-sm shrink-0">
        {num}
      </div>
      <div className="min-w-0">
        <div className="text-xs font-extrabold text-slate-900 dark:text-white">{title}</div>
        <div className="text-[11px] font-semibold text-slate-500 dark:text-slate-400">{desc}</div>
      </div>
    </div>
  );
}

function TipRow({ children }: { children: ReactNode }) {
  return (
    <div className="flex items-start gap-2">
      <CheckCircle2 className="h-4 w-4 mt-0.5 text-emerald-600 dark:text-emerald-400 shrink-0" />
      <div className="leading-relaxed">{children}</div>
    </div>
  );
}