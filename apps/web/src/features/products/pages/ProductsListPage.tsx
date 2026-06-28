import { useState, useMemo } from 'react';
import { Link } from 'react-router-dom';
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import {
  Search, Plus, Package, Star, AlertTriangle, Trash2, Sliders,
  Image as ImageIcon, Layers, Scissors, ArrowRight, FileSpreadsheet,
  Grid3x3, List as ListIcon, X, Edit3, Save, DollarSign,
  TrendingUp, ChevronLeft, ChevronRight, Filter, Tag as TagIcon,
  Eye, MoreVertical, Sparkles, CheckCircle2, XCircle,
} from 'lucide-react';
import { productsApi, type ProductsListParams, type Product } from '@/api/products.api';
import { brandsApi } from '@/api/brands.api';
import { categoriesApi } from '@/api/categories.api';
import { tagsApi } from '@/api/tags.api';
import { Button } from '@/components/ui/Button';
import { Input } from '@/components/ui/Input';
import { formatPKR, formatPKRFull } from '@/lib/format';
import { toast } from 'sonner';
import { useBusinessFeatures } from '@/hooks/useBusinessFeatures';
import { carpetRollsApi, type CarpetProductSummary } from '@/features/industries/carpet/api/carpet-rolls.api';

type ViewMode = 'grid' | 'list';
type SortBy = 'newest' | 'oldest' | 'name' | 'price-low' | 'price-high' | 'stock-low' | 'stock-high';

export default function ProductsListPage() {
  const queryClient = useQueryClient();
  const { businessType, features } = useBusinessFeatures();

  const isCarpetBusiness = useMemo(() => {
    const type = (businessType ?? '').toUpperCase();
    return type === 'CARPET' || type === 'FLOORING' || features?.lengthWidthCalc === true;
  }, [businessType, features]);

  const [params, setParams] = useState<ProductsListParams>({
    search: '',
    page: 1,
    limit: 24,
    stockStatus: 'all',
  });
  const [showFilters, setShowFilters] = useState(false);
  const [selected, setSelected] = useState<Set<string>>(new Set());
  const [viewMode, setViewMode] = useState<ViewMode>('grid');
  const [sortBy, setSortBy] = useState<SortBy>('newest');
  const [quickEditProduct, setQuickEditProduct] = useState<Product | null>(null);

  const { data } = useQuery({
    queryKey: ['products', params],
    queryFn: () => productsApi.list(params),
  });

  const { data: brands = [] } = useQuery({
    queryKey: ['brands'],
    queryFn: () => brandsApi.list(),
  });

  const { data: categories = [] } = useQuery({
    queryKey: ['categories'],
    queryFn: categoriesApi.list,
  });

  const { data: tags = [] } = useQuery({
    queryKey: ['tags'],
    queryFn: tagsApi.list,
  });

  const productIds = useMemo(
    () => (data?.items ?? []).map((p) => p.id),
    [data?.items],
  );

  const { data: carpetSummary = [] } = useQuery({
    queryKey: ['carpet-product-summary', productIds],
    queryFn: () => carpetRollsApi.productSummary(productIds),
    enabled: isCarpetBusiness && productIds.length > 0,
  });

  const carpetSummaryMap = useMemo(() => {
    const map = new Map<string, CarpetProductSummary>();
    for (const s of carpetSummary) map.set(s.productId, s);
    return map;
  }, [carpetSummary]);

  const isCarpetProduct = (p: Product) => {
    if (!isCarpetBusiness) return false;
    return p.unit === 'sqft' || p.unit === 'sqm' || p.unit === 'sqyd';
  };

  // ─── Sorted items ────────────────────────────────────────
  const items = useMemo(() => {
    let list = data?.items ?? [];
    list = [...list].sort((a, b) => {
      switch (sortBy) {
        case 'oldest':
          return new Date(a.createdAt).getTime() - new Date(b.createdAt).getTime();
        case 'name':
          return a.name.localeCompare(b.name);
        case 'price-low':
          return Number(a.price) - Number(b.price);
        case 'price-high':
          return Number(b.price) - Number(a.price);
        case 'stock-low':
          return (a.stock ?? 0) - (b.stock ?? 0);
        case 'stock-high':
          return (b.stock ?? 0) - (a.stock ?? 0);
        case 'newest':
        default:
          return new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime();
      }
    });
    return list;
  }, [data?.items, sortBy]);

  const bulkMutation = useMutation({
    mutationFn: (action: 'activate' | 'deactivate' | 'delete' | 'feature' | 'unfeature') =>
      productsApi.bulkAction(Array.from(selected), action),
    onSuccess: (_, action) => {
      toast.success(`${action} done for ${selected.size} products`);
      setSelected(new Set());
      queryClient.invalidateQueries({ queryKey: ['products'] });
      queryClient.invalidateQueries({ queryKey: ['carpet-product-summary'] });
    },
  });

  const toggleSelect = (id: string) => {
    setSelected((prev) => {
      const next = new Set(prev);
      if (next.has(id)) next.delete(id);
      else next.add(id);
      return next;
    });
  };

  const toggleSelectAll = () => {
    if (selected.size === items.length) {
      setSelected(new Set());
    } else {
      setSelected(new Set(items.map((p) => p.id)));
    }
  };

  // ─── Stats ───────────────────────────────────────────────
  const stats = useMemo(() => {
    const all = data?.items ?? [];
    const active = all.filter((p) => p.isActive).length;
    const featured = all.filter((p) => p.isFeatured).length;
    const lowStock = all.filter((p) => !isCarpetProduct(p) && p.stock > 0 && p.stock <= p.lowStockAlert).length;
    const outOfStock = all.filter((p) => !isCarpetProduct(p) && p.stock === 0).length;
    const totalValue = all.reduce((s, p) => s + Number(p.price) * (p.stock ?? 0), 0);
    return { active, featured, lowStock, outOfStock, totalValue };
  }, [data?.items]);

  const carpetStats = useMemo(() => {
    if (!isCarpetBusiness) return null;
    const totalSqft = carpetSummary.reduce((acc, s) => acc + s.totalSqft, 0);
    const totalRolls = carpetSummary.reduce((acc, s) => acc + s.rollCount, 0);
    const totalCutPieces = carpetSummary.reduce((acc, s) => acc + s.cutPiecesCount, 0);
    const productsWithStock = carpetSummary.length;
    return { totalSqft, totalRolls, totalCutPieces, productsWithStock };
  }, [carpetSummary, isCarpetBusiness]);

  const hasActiveFilters =
    params.brandId || params.categoryId || params.tagId || (params.stockStatus && params.stockStatus !== 'all');

  return (
    <div className="space-y-5">
      {quickEditProduct && (
        <QuickEditProductModal
          product={quickEditProduct}
          onClose={() => setQuickEditProduct(null)}
          onSuccess={() => {
            queryClient.invalidateQueries({ queryKey: ['products'] });
            setQuickEditProduct(null);
          }}
        />
      )}

      {/* ═══════════════ HERO HEADER ═══════════════ */}
      <section className="relative overflow-hidden rounded-3xl bg-gradient-to-br from-slate-950 via-emerald-900 to-emerald-700 text-white p-6 shadow-2xl">
        <div className="absolute -top-20 -right-20 h-64 w-64 rounded-full bg-emerald-400/20 blur-3xl" />
        <div className="absolute -bottom-20 -left-20 h-64 w-64 rounded-full bg-amber-400/15 blur-3xl" />

        <div className="relative flex items-center justify-between gap-4 flex-wrap">
          <div className="min-w-0">
            <div className="inline-flex items-center gap-2 rounded-full bg-white/15 backdrop-blur px-3 py-1 text-xs font-extrabold border border-white/20">
              <Package className="h-3.5 w-3.5 text-amber-300" />
              Inventory Management
            </div>
            <h1 className="mt-3 text-3xl sm:text-4xl font-extrabold leading-tight">Products</h1>
            <p className="mt-2 text-sm text-white/80">
              {data?.meta.total ?? 0} total products • {stats.active} active • Stock value: <strong>{formatPKR(stats.totalValue)}</strong>
            </p>
          </div>

          <div className="flex gap-2 flex-wrap">
            {isCarpetBusiness && (
              <Link to="/carpet-rolls">
                <Button variant="secondary" className="bg-white/15 backdrop-blur text-white hover:bg-white/25 border-white/20">
                  <Layers className="h-4 w-4" /> Carpet Rolls
                </Button>
              </Link>
            )}
            <Link to="/brands">
              <Button variant="secondary" className="bg-white/15 backdrop-blur text-white hover:bg-white/25 border-white/20">
                Brands
              </Button>
            </Link>
            <Link to="/tags">
              <Button variant="secondary" className="bg-white/15 backdrop-blur text-white hover:bg-white/25 border-white/20">
                Tags
              </Button>
            </Link>
            <Link to="/products/bulk-import">
              <Button variant="secondary" className="bg-white/15 backdrop-blur text-white hover:bg-white/25 border-white/20">
                <FileSpreadsheet className="h-4 w-4" /> Bulk Import
              </Button>
            </Link>
            <Link to="/products/new">
              <Button className="bg-white text-slate-900 hover:bg-slate-100 shadow-lg shadow-black/20">
                <Plus className="h-4 w-4" /> New Product
              </Button>
            </Link>
          </div>
        </div>

        {/* ─── KPI GRID ─── */}
        <div className="relative grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-5 gap-3 mt-6">
          <KpiTile label="Total" value={data?.meta.total ?? 0} icon={Package} tone="emerald" />
          <KpiTile label="Active" value={stats.active} icon={CheckCircle2} tone="blue" />
          <KpiTile label="Featured" value={stats.featured} icon={Star} tone="amber" />
          <KpiTile label="Low Stock" value={stats.lowStock} sub="needs restock" icon={AlertTriangle} tone="amber" />
          <KpiTile label="Out of Stock" value={stats.outOfStock} icon={XCircle} tone="rose" />
        </div>

        {/* ─── Carpet stats (if carpet business) ─── */}
        {carpetStats && carpetStats.totalRolls > 0 && (
          <div className="relative mt-4 rounded-2xl bg-white/10 backdrop-blur border border-white/20 p-3">
            <div className="flex items-center gap-2 mb-2">
              <Layers className="h-4 w-4 text-amber-300" />
              <div className="text-xs font-extrabold text-amber-200 uppercase tracking-wider">Carpet Inventory</div>
            </div>
            <div className="grid grid-cols-2 sm:grid-cols-4 gap-2">
              <div>
                <div className="text-[10px] uppercase font-extrabold text-white/70">Total Sqft</div>
                <div className="text-lg font-extrabold tabular-nums">{carpetStats.totalSqft.toFixed(0)}</div>
              </div>
              <div>
                <div className="text-[10px] uppercase font-extrabold text-white/70">Active Rolls</div>
                <div className="text-lg font-extrabold tabular-nums">{carpetStats.totalRolls}</div>
              </div>
              <div>
                <div className="text-[10px] uppercase font-extrabold text-white/70">Cut Pieces</div>
                <div className="text-lg font-extrabold tabular-nums">{carpetStats.totalCutPieces}</div>
              </div>
              <div>
                <div className="text-[10px] uppercase font-extrabold text-white/70">w/ Stock</div>
                <div className="text-lg font-extrabold tabular-nums">{carpetStats.productsWithStock}</div>
              </div>
            </div>
          </div>
        )}
      </section>

      {/* ═══════════════ SEARCH + CONTROLS ═══════════════ */}
      <section className="rounded-3xl bg-white border-2 border-slate-200 shadow-sm p-4 space-y-3">
        <div className="flex gap-2 flex-wrap">
          <div className="flex-1 min-w-[240px] relative">
            <Search className="h-4 w-4 text-slate-400 absolute left-3 top-1/2 -translate-y-1/2" />
            <input
              className="h-11 w-full rounded-xl border-2 border-slate-200 bg-white pl-10 pr-10 text-sm font-semibold focus:outline-none focus:border-emerald-500 focus:ring-2 focus:ring-emerald-200 transition"
              placeholder="Search by name, SKU, barcode..."
              value={params.search ?? ''}
              onChange={(e) => setParams({ ...params, search: e.target.value, page: 1 })}
            />
            {params.search && (
              <button
                onClick={() => setParams({ ...params, search: '', page: 1 })}
                className="absolute right-3 top-1/2 -translate-y-1/2 h-6 w-6 rounded hover:bg-slate-100 flex items-center justify-center"
              >
                <X className="h-3.5 w-3.5 text-slate-500" />
              </button>
            )}
          </div>

          <select
            value={sortBy}
            onChange={(e) => setSortBy(e.target.value as SortBy)}
            className="h-11 rounded-xl border-2 border-slate-200 bg-white px-3 text-xs font-extrabold focus:outline-none focus:border-emerald-500"
          >
            <option value="newest">Newest first</option>
            <option value="oldest">Oldest first</option>
            <option value="name">Name A-Z</option>
            <option value="price-low">Price (low → high)</option>
            <option value="price-high">Price (high → low)</option>
            <option value="stock-low">Stock (low → high)</option>
            <option value="stock-high">Stock (high → low)</option>
          </select>

          <div className="inline-flex rounded-xl border-2 border-slate-200 bg-white overflow-hidden">
            <button
              onClick={() => setViewMode('grid')}
              className={`px-3 h-11 text-xs font-extrabold transition ${
                viewMode === 'grid' ? 'bg-emerald-600 text-white' : 'text-slate-700 hover:bg-slate-50'
              }`}
              title="Grid view"
            >
              <Grid3x3 className="h-4 w-4" />
            </button>
            <button
              onClick={() => setViewMode('list')}
              className={`px-3 h-11 text-xs font-extrabold transition border-l-2 border-slate-200 ${
                viewMode === 'list' ? 'bg-emerald-600 text-white' : 'text-slate-700 hover:bg-slate-50'
              }`}
              title="List view"
            >
              <ListIcon className="h-4 w-4" />
            </button>
          </div>

          <Button
            variant="secondary"
            onClick={() => setShowFilters((v) => !v)}
            className={hasActiveFilters || showFilters ? 'bg-emerald-50 border-emerald-300 text-emerald-700' : ''}
          >
            <Filter className="h-4 w-4" /> Filters
            {hasActiveFilters && (
              <span className="ml-1 h-5 w-5 rounded-full bg-emerald-600 text-white text-xs flex items-center justify-center font-bold">
                !
              </span>
            )}
          </Button>
        </div>

        {/* Stock status chips */}
        <div className="flex gap-1.5 flex-wrap">
          <button
            onClick={() => setParams({ ...params, stockStatus: 'all', page: 1 })}
            className={`px-3 py-1.5 rounded-lg text-xs font-extrabold inline-flex items-center gap-1 transition ${
              params.stockStatus === 'all' || !params.stockStatus
                ? 'bg-slate-900 text-white shadow-sm'
                : 'bg-slate-100 text-slate-700 hover:bg-slate-200'
            }`}
          >
            <Sparkles className="h-3 w-3" /> All
          </button>
          <button
            onClick={() => setParams({ ...params, stockStatus: 'in', page: 1 })}
            className={`px-3 py-1.5 rounded-lg text-xs font-extrabold inline-flex items-center gap-1 transition border ${
              params.stockStatus === 'in'
                ? 'bg-emerald-100 text-emerald-700 border-emerald-300 shadow-sm'
                : 'bg-emerald-50 text-emerald-700 hover:bg-emerald-100 border-transparent'
            }`}
          >
            <CheckCircle2 className="h-3 w-3" /> In Stock
          </button>
          <button
            onClick={() => setParams({ ...params, stockStatus: 'low', page: 1 })}
            className={`px-3 py-1.5 rounded-lg text-xs font-extrabold inline-flex items-center gap-1 transition border ${
              params.stockStatus === 'low'
                ? 'bg-amber-100 text-amber-700 border-amber-300 shadow-sm'
                : 'bg-amber-50 text-amber-700 hover:bg-amber-100 border-transparent'
            }`}
          >
            <AlertTriangle className="h-3 w-3" /> Low Stock
          </button>
          <button
            onClick={() => setParams({ ...params, stockStatus: 'out', page: 1 })}
            className={`px-3 py-1.5 rounded-lg text-xs font-extrabold inline-flex items-center gap-1 transition border ${
              params.stockStatus === 'out'
                ? 'bg-rose-100 text-rose-700 border-rose-300 shadow-sm'
                : 'bg-rose-50 text-rose-700 hover:bg-rose-100 border-transparent'
            }`}
          >
            <XCircle className="h-3 w-3" /> Out of Stock
          </button>
        </div>

        {/* Filters panel */}
        {showFilters && (
          <div className="grid sm:grid-cols-2 lg:grid-cols-4 gap-3 pt-2 border-t-2 border-slate-100">
            <div>
              <label className="block text-[10px] font-extrabold text-slate-600 uppercase mb-1">Category</label>
              <select
                className="h-10 w-full rounded-lg border-2 border-slate-200 bg-white px-2 text-xs font-bold focus:outline-none focus:border-emerald-500"
                value={params.categoryId ?? ''}
                onChange={(e) =>
                  setParams({ ...params, categoryId: e.target.value || undefined, page: 1 })
                }
              >
                <option value="">All categories</option>
                {categories.map((c: any) => (
                  <option key={c.id} value={c.id}>{c.name}</option>
                ))}
              </select>
            </div>
            <div>
              <label className="block text-[10px] font-extrabold text-slate-600 uppercase mb-1">Brand</label>
              <select
                className="h-10 w-full rounded-lg border-2 border-slate-200 bg-white px-2 text-xs font-bold focus:outline-none focus:border-emerald-500"
                value={params.brandId ?? ''}
                onChange={(e) =>
                  setParams({ ...params, brandId: e.target.value || undefined, page: 1 })
                }
              >
                <option value="">All brands</option>
                {brands.map((b) => (
                  <option key={b.id} value={b.id}>{b.name}</option>
                ))}
              </select>
            </div>
            <div>
              <label className="block text-[10px] font-extrabold text-slate-600 uppercase mb-1">Tag</label>
              <select
                className="h-10 w-full rounded-lg border-2 border-slate-200 bg-white px-2 text-xs font-bold focus:outline-none focus:border-emerald-500"
                value={params.tagId ?? ''}
                onChange={(e) =>
                  setParams({ ...params, tagId: e.target.value || undefined, page: 1 })
                }
              >
                <option value="">All tags</option>
                {tags.map((t) => (
                  <option key={t.id} value={t.id}>{t.name}</option>
                ))}
              </select>
            </div>
            <div className="flex items-end">
              <button
                onClick={() => setParams({ search: '', page: 1, limit: 24, stockStatus: 'all' })}
                className="h-10 w-full rounded-lg bg-rose-50 hover:bg-rose-100 text-rose-700 text-xs font-extrabold transition border-2 border-rose-200"
              >
                Clear all filters
              </button>
            </div>
          </div>
        )}
      </section>

      {/* ═══════════════ BULK ACTIONS BAR ═══════════════ */}
      {selected.size > 0 && (
        <div className="sticky top-2 z-30 rounded-2xl bg-gradient-to-r from-amber-500 to-orange-600 border-2 border-amber-300 p-3 flex items-center justify-between gap-3 flex-wrap shadow-xl">
          <div className="flex items-center gap-3">
            <div className="h-10 w-10 rounded-xl bg-white/20 backdrop-blur flex items-center justify-center text-white font-extrabold">
              {selected.size}
            </div>
            <div className="text-white">
              <div className="font-extrabold text-sm">{selected.size} selected</div>
              <button
                onClick={toggleSelectAll}
                className="text-[10px] font-bold underline hover:text-amber-100"
              >
                {selected.size === items.length ? 'Deselect all' : `Select all ${items.length}`}
              </button>
            </div>
          </div>
          <div className="flex gap-2 flex-wrap">
            <button
              onClick={() => bulkMutation.mutate('activate')}
              className="h-9 px-3 rounded-lg bg-emerald-600 hover:bg-emerald-700 text-white text-xs font-extrabold inline-flex items-center gap-1 shadow-md"
            >
              <CheckCircle2 className="h-3.5 w-3.5" /> Activate
            </button>
            <button
              onClick={() => bulkMutation.mutate('deactivate')}
              className="h-9 px-3 rounded-lg bg-slate-700 hover:bg-slate-800 text-white text-xs font-extrabold inline-flex items-center gap-1 shadow-md"
            >
              <XCircle className="h-3.5 w-3.5" /> Deactivate
            </button>
            <button
              onClick={() => bulkMutation.mutate('feature')}
              className="h-9 px-3 rounded-lg bg-amber-700 hover:bg-amber-800 text-white text-xs font-extrabold inline-flex items-center gap-1 shadow-md"
            >
              <Star className="h-3.5 w-3.5" /> Feature
            </button>
            <button
              onClick={() => {
                if (confirm(`Delete ${selected.size} products? This cannot be undone.`))
                  bulkMutation.mutate('delete');
              }}
              className="h-9 px-3 rounded-lg bg-rose-600 hover:bg-rose-700 text-white text-xs font-extrabold inline-flex items-center gap-1 shadow-md"
            >
              <Trash2 className="h-3.5 w-3.5" /> Delete
            </button>
            <button
              onClick={() => setSelected(new Set())}
              className="h-9 px-3 rounded-lg bg-white/20 backdrop-blur hover:bg-white/30 text-white text-xs font-extrabold border border-white/30"
            >
              Clear
            </button>
          </div>
        </div>
      )}

      {/* ═══════════════ GRID / LIST ═══════════════ */}
      {items.length === 0 ? (
        <div className="rounded-3xl bg-white border-2 border-dashed border-slate-200 p-16 text-center">
          <div className="h-20 w-20 rounded-3xl bg-gradient-to-br from-emerald-100 to-green-200 mx-auto flex items-center justify-center shadow-inner mb-4">
            <Package className="h-10 w-10 text-emerald-600" />
          </div>
          <h3 className="text-xl font-extrabold text-slate-900">No products found</h3>
          <p className="text-sm text-slate-500 mt-1 max-w-md mx-auto">
            {params.search || hasActiveFilters
              ? 'Try different search or clear filters'
              : 'Add your first product to start tracking inventory'}
          </p>
          <Link to="/products/new">
            <Button className="mt-5 bg-emerald-600 hover:bg-emerald-700">
              <Plus className="h-4 w-4" /> Add Product
            </Button>
          </Link>
        </div>
      ) : viewMode === 'grid' ? (
        <div className="grid sm:grid-cols-2 md:grid-cols-3 lg:grid-cols-4 xl:grid-cols-5 gap-4">
          {items.map((p) => (
            <ProductCard
              key={p.id}
              product={p}
              isCarpet={isCarpetProduct(p)}
              carpetData={carpetSummaryMap.get(p.id)}
              isSelected={selected.has(p.id)}
              onSelect={() => toggleSelect(p.id)}
              onQuickEdit={() => setQuickEditProduct(p)}
            />
          ))}
        </div>
      ) : (
        <div className="rounded-3xl bg-white border-2 border-slate-200 shadow-sm overflow-hidden">
          <div className="overflow-x-auto">
            <table className="w-full text-sm">
              <thead className="bg-slate-50 border-b-2 border-slate-200">
                <tr>
                  <th className="px-3 py-3 text-left w-10">
                    <input
                      type="checkbox"
                      checked={selected.size === items.length && items.length > 0}
                      onChange={toggleSelectAll}
                      className="h-4 w-4 rounded border-2 border-slate-300"
                    />
                  </th>
                  <th className="px-3 py-3 text-left text-[10px] font-extrabold uppercase tracking-wider text-slate-700">Product</th>
                  <th className="px-3 py-3 text-left text-[10px] font-extrabold uppercase tracking-wider text-slate-700">Category</th>
                  <th className="px-3 py-3 text-left text-[10px] font-extrabold uppercase tracking-wider text-slate-700">SKU</th>
                  <th className="px-3 py-3 text-right text-[10px] font-extrabold uppercase tracking-wider text-slate-700">Price</th>
                  <th className="px-3 py-3 text-right text-[10px] font-extrabold uppercase tracking-wider text-slate-700">Stock</th>
                  <th className="px-3 py-3 text-center text-[10px] font-extrabold uppercase tracking-wider text-slate-700">Status</th>
                  <th className="px-3 py-3 text-right text-[10px] font-extrabold uppercase tracking-wider text-slate-700">Actions</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-100">
                {items.map((p) => {
                  const isCarpet = isCarpetProduct(p);
                  const carpetData = carpetSummaryMap.get(p.id);
                  const primaryImage = p.images?.[0]?.url;
                  const isLow = !isCarpet && p.stock > 0 && p.stock <= p.lowStockAlert;
                  const isOut = !isCarpet && p.stock === 0;

                  return (
                    <tr key={p.id} className={`hover:bg-slate-50 transition ${selected.has(p.id) ? 'bg-emerald-50/30' : ''}`}>
                      <td className="px-3 py-3">
                        <input
                          type="checkbox"
                          checked={selected.has(p.id)}
                          onChange={() => toggleSelect(p.id)}
                          className="h-4 w-4 rounded border-2 border-slate-300"
                        />
                      </td>
                      <td className="px-3 py-3">
                        <div className="flex items-center gap-3">
                          <div className="h-10 w-10 rounded-lg bg-slate-100 overflow-hidden shrink-0">
                            {primaryImage ? (
                              <img src={primaryImage} alt={p.name} className="w-full h-full object-cover" />
                            ) : (
                              <div className="w-full h-full flex items-center justify-center text-slate-400">
                                <Package className="h-5 w-5" />
                              </div>
                            )}
                          </div>
                          <div className="min-w-0">
                            <Link to={`/products/${p.id}/edit`} className="font-bold text-slate-900 hover:text-emerald-700 text-sm truncate block">
                              {p.name}
                            </Link>
                            <div className="flex items-center gap-1 flex-wrap mt-0.5">
                              {p.brand && (
                                <span className="text-[10px] font-bold text-violet-700">{p.brand.name}</span>
                              )}
                              {isCarpet && (
                                <span className="text-[9px] font-extrabold text-emerald-700 bg-emerald-100 px-1.5 py-0.5 rounded">CARPET</span>
                              )}
                              {p.isFeatured && (
                                <Star className="h-2.5 w-2.5 text-amber-500 fill-amber-500" />
                              )}
                            </div>
                          </div>
                        </div>
                      </td>
                      <td className="px-3 py-3 text-xs font-semibold text-slate-700">
                        {p.category?.name || <span className="text-slate-400">—</span>}
                      </td>
                      <td className="px-3 py-3 text-xs font-mono font-bold text-slate-700">
                        {p.sku || <span className="text-slate-400">—</span>}
                      </td>
                      <td className="px-3 py-3 text-right">
                        <div className="font-extrabold text-emerald-700 text-sm tabular-nums">{formatPKR(p.price)}</div>
                        {p.wholesalePrice && (
                          <div className="text-[9px] text-amber-700 font-bold">W: {formatPKR(p.wholesalePrice)}</div>
                        )}
                      </td>
                      <td className="px-3 py-3 text-right">
                        {isCarpet ? (
                          <div>
                            <div className="font-extrabold text-emerald-700 tabular-nums">
                              {carpetData ? carpetData.totalSqft.toFixed(0) : 0} <span className="text-[10px]">{p.unit}</span>
                            </div>
                            <div className="text-[9px] text-slate-500 font-bold">
                              {carpetData?.rollCount ?? 0} rolls
                            </div>
                          </div>
                        ) : (
                          <div className={`font-extrabold tabular-nums ${
                            isOut ? 'text-rose-700' : isLow ? 'text-amber-700' : 'text-slate-900'
                          }`}>
                            {p.stock} <span className="text-[10px] font-bold opacity-70">{p.unit}</span>
                          </div>
                        )}
                      </td>
                      <td className="px-3 py-3 text-center">
                        {!p.isActive ? (
                          <span className="px-2 py-0.5 rounded-full bg-slate-100 text-slate-700 text-[9px] font-extrabold">INACTIVE</span>
                        ) : isCarpet && carpetData && carpetData.rollCount === 0 ? (
                          <span className="px-2 py-0.5 rounded-full bg-rose-100 text-rose-700 text-[9px] font-extrabold">NO ROLLS</span>
                        ) : isOut ? (
                          <span className="px-2 py-0.5 rounded-full bg-rose-100 text-rose-700 text-[9px] font-extrabold">OUT</span>
                        ) : isLow ? (
                          <span className="px-2 py-0.5 rounded-full bg-amber-100 text-amber-700 text-[9px] font-extrabold">LOW</span>
                        ) : (
                          <span className="px-2 py-0.5 rounded-full bg-emerald-100 text-emerald-700 text-[9px] font-extrabold">ACTIVE</span>
                        )}
                      </td>
                      <td className="px-3 py-3">
                        <div className="flex items-center justify-end gap-1">
                          <Link
                            to={`/products/${p.id}/edit`}
                            className="h-7 w-7 rounded-lg bg-slate-100 hover:bg-slate-200 text-slate-700 flex items-center justify-center"
                            title="Edit"
                          >
                            <Eye className="h-3 w-3" />
                          </Link>
                          <button
                            onClick={() => setQuickEditProduct(p)}
                            className="h-7 w-7 rounded-lg bg-blue-50 hover:bg-blue-100 text-blue-600 flex items-center justify-center"
                            title="Quick edit"
                          >
                            <Edit3 className="h-3 w-3" />
                          </button>
                          {isCarpet && (
                            <Link
                              to={`/carpet-rolls?productId=${p.id}`}
                              className="h-7 w-7 rounded-lg bg-emerald-50 hover:bg-emerald-100 text-emerald-700 flex items-center justify-center"
                              title="View rolls"
                            >
                              <Layers className="h-3 w-3" />
                            </Link>
                          )}
                        </div>
                      </td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>
        </div>
      )}

      {/* ═══════════════ PAGINATION ═══════════════ */}
      {data && data.meta.totalPages > 1 && (
        <div className="rounded-2xl bg-white border-2 border-slate-200 p-4 flex items-center justify-between flex-wrap gap-3 shadow-sm">
          <div className="text-sm text-slate-600 font-bold">
            Page <span className="text-slate-900">{data.meta.page}</span> of{' '}
            <span className="text-slate-900">{data.meta.totalPages}</span> •{' '}
            <span className="text-emerald-700">{data.meta.total}</span> total products
          </div>
          <div className="flex gap-2">
            <button
              disabled={params.page === 1}
              onClick={() => setParams({ ...params, page: (params.page ?? 1) - 1 })}
              className="h-9 px-3 rounded-lg border-2 border-slate-200 text-xs font-extrabold disabled:opacity-40 hover:bg-slate-50 inline-flex items-center gap-1"
            >
              <ChevronLeft className="h-3.5 w-3.5" /> Previous
            </button>
            <button
              disabled={(params.page ?? 1) >= data.meta.totalPages}
              onClick={() => setParams({ ...params, page: (params.page ?? 1) + 1 })}
              className="h-9 px-3 rounded-lg bg-emerald-600 hover:bg-emerald-700 text-white text-xs font-extrabold disabled:opacity-40 inline-flex items-center gap-1"
            >
              Next <ChevronRight className="h-3.5 w-3.5" />
            </button>
          </div>
        </div>
      )}
    </div>
  );
}

// ═════════════════════════════════════════════════════════════
// HELPER COMPONENTS
// ═════════════════════════════════════════════════════════════

function KpiTile({
  label, value, sub, icon: Icon, tone,
}: { label: string; value: string | number; sub?: string; icon: any; tone: string }) {
  const tones: Record<string, string> = {
    emerald: 'from-emerald-400/30 to-emerald-600/20 border-emerald-300/40',
    blue: 'from-blue-400/30 to-blue-600/20 border-blue-300/40',
    violet: 'from-violet-400/30 to-violet-600/20 border-violet-300/40',
    amber: 'from-amber-400/30 to-amber-600/20 border-amber-300/40',
    rose: 'from-rose-400/30 to-rose-600/20 border-rose-300/40',
  };
  return (
    <div className={`rounded-2xl bg-gradient-to-br ${tones[tone]} backdrop-blur border p-3`}>
      <div className="flex items-center gap-1.5 mb-1.5">
        <Icon className="h-3 w-3 opacity-80" />
        <div className="text-[9px] uppercase tracking-wider font-extrabold opacity-90">{label}</div>
      </div>
      <div className="text-xl font-extrabold leading-none text-white tabular-nums">{value}</div>
      {sub && <div className="text-[10px] font-bold opacity-75 mt-0.5">{sub}</div>}
    </div>
  );
}

function ProductCard({
  product: p, isCarpet, carpetData, isSelected, onSelect, onQuickEdit,
}: {
  product: Product;
  isCarpet: boolean;
  carpetData?: CarpetProductSummary;
  isSelected: boolean;
  onSelect: () => void;
  onQuickEdit: () => void;
}) {
  const primaryImage = p.images?.[0]?.url;
  const carpetTotalSqft = carpetData?.totalSqft ?? 0;
  const carpetRollCount = carpetData?.rollCount ?? 0;
  const carpetCutPieces = carpetData?.cutPiecesCount ?? 0;
  const hasCarpetStock = isCarpet && (carpetRollCount > 0 || carpetCutPieces > 0);
  const isLow = !isCarpet && p.stock > 0 && p.stock <= p.lowStockAlert;
  const isOut = !isCarpet && p.stock === 0;

  const carpetPriceDisplay = carpetData && carpetData.rollCount > 0
    ? carpetData.minSalePrice === carpetData.maxSalePrice
      ? formatPKR(carpetData.avgSalePrice)
      : `${formatPKR(carpetData.minSalePrice)}–${formatPKR(carpetData.maxSalePrice)}`
    : formatPKR(p.price);

  return (
    <div
      className={`group relative rounded-2xl bg-white border-2 overflow-hidden hover:shadow-xl hover:-translate-y-0.5 transition-all ${
        isSelected ? 'border-emerald-500 ring-2 ring-emerald-200' : 'border-slate-200 hover:border-emerald-300'
      }`}
    >
      {/* Carpet ribbon */}
      {isCarpet && (
        <div className="absolute top-0 left-0 z-10 px-2 py-0.5 rounded-br-lg bg-gradient-to-r from-emerald-600 to-emerald-700 text-white text-[9px] font-extrabold uppercase tracking-wider shadow">
          Carpet
        </div>
      )}

      {/* Select checkbox */}
      <button
        onClick={onSelect}
        className={`absolute top-2 left-2 z-20 h-6 w-6 rounded-md border-2 flex items-center justify-center transition shadow-sm ${
          isSelected
            ? 'bg-emerald-600 border-emerald-600'
            : 'bg-white border-slate-300 opacity-0 group-hover:opacity-100'
        } ${isCarpet ? 'translate-y-5' : ''}`}
      >
        {isSelected && (
          <svg className="h-3.5 w-3.5 text-white" viewBox="0 0 20 20" fill="currentColor">
            <path d="M16.7 5.3a1 1 0 010 1.4l-7 7a1 1 0 01-1.4 0l-3-3a1 1 0 111.4-1.4L9 11.6l6.3-6.3a1 1 0 011.4 0z" />
          </svg>
        )}
      </button>

      {/* Featured badge */}
      {p.isFeatured && (
        <div className="absolute top-2 right-2 z-10 h-7 w-7 rounded-full bg-gradient-to-br from-amber-400 to-amber-600 flex items-center justify-center shadow-lg">
          <Star className="h-3.5 w-3.5 text-white fill-white" />
        </div>
      )}

      {/* Image */}
      <Link to={`/products/${p.id}/edit`} className="block">
        <div className="aspect-square bg-slate-100 overflow-hidden relative">
          {primaryImage ? (
            <img
              src={primaryImage}
              alt={p.name}
              className="w-full h-full object-cover group-hover:scale-110 transition-transform duration-500"
            />
          ) : (
            <div className="w-full h-full flex items-center justify-center bg-gradient-to-br from-slate-100 to-slate-200">
              <Package className="h-10 w-10 text-slate-400" />
            </div>
          )}

          {/* Inactive overlay */}
          {!p.isActive && (
            <div className="absolute inset-0 bg-slate-900/50 backdrop-blur-sm flex items-center justify-center">
              <span className="px-2 py-1 rounded-md bg-slate-900 text-white text-[10px] font-extrabold uppercase tracking-wider">
                Inactive
              </span>
            </div>
          )}
        </div>
      </Link>

      {/* Body */}
      <div className="p-3 space-y-1.5">
        {p.brand && (
          <div className="text-[10px] uppercase tracking-wider text-violet-700 font-bold">
            {p.brand.name}
          </div>
        )}
        <Link to={`/products/${p.id}/edit`}>
          <h3 className="font-extrabold text-slate-900 line-clamp-2 hover:text-emerald-700 leading-tight text-sm">
            {p.name}
          </h3>
        </Link>

        {/* Price + Stock — CARPET branch */}
        {isCarpet ? (
          <>
            <div className="flex items-center justify-between pt-1">
              <div className="font-extrabold text-emerald-700 text-sm tabular-nums">
                {carpetPriceDisplay}
                <span className="text-[9px] font-bold text-slate-500 ml-0.5">/{p.unit}</span>
              </div>
              {hasCarpetStock ? (
                <span className="text-[10px] font-extrabold text-emerald-700 bg-emerald-100 px-2 py-0.5 rounded-full">
                  {carpetTotalSqft.toFixed(0)} {p.unit}
                </span>
              ) : (
                <span className="text-[10px] font-extrabold text-rose-700 bg-rose-100 px-2 py-0.5 rounded-full">
                  NO ROLLS
                </span>
              )}
            </div>

            <div className="flex flex-wrap gap-1 pt-1">
              {carpetRollCount > 0 && (
                <span className="inline-flex items-center gap-0.5 text-[10px] font-bold text-emerald-700 bg-emerald-50 border border-emerald-200 px-2 py-0.5 rounded-full">
                  <Layers className="h-2.5 w-2.5" />
                  {carpetRollCount} roll{carpetRollCount !== 1 ? 's' : ''}
                </span>
              )}
              {carpetCutPieces > 0 && (
                <span className="inline-flex items-center gap-0.5 text-[10px] font-bold text-violet-700 bg-violet-50 border border-violet-200 px-2 py-0.5 rounded-full">
                  <Scissors className="h-2.5 w-2.5" />
                  {carpetCutPieces} piece{carpetCutPieces !== 1 ? 's' : ''}
                </span>
              )}
            </div>

            <div className="flex gap-1 pt-1">
              <Link
                to={`/carpet-rolls?productId=${p.id}`}
                className="flex-1 px-2 py-1.5 rounded-lg bg-gradient-to-r from-emerald-600 to-emerald-700 hover:from-emerald-700 hover:to-emerald-800 text-white text-[10px] font-extrabold inline-flex items-center justify-center gap-1 transition shadow-sm"
              >
                {carpetRollCount > 0 ? 'View Rolls' : 'Add Roll'}
                <ArrowRight className="h-2.5 w-2.5" />
              </Link>
              <button
                onClick={onQuickEdit}
                className="px-2 py-1.5 rounded-lg bg-blue-50 hover:bg-blue-100 text-blue-700 inline-flex items-center justify-center transition"
                title="Quick edit"
              >
                <Edit3 className="h-3 w-3" />
              </button>
            </div>
          </>
        ) : (
          <>
            <div className="flex items-center justify-between pt-1">
              <div className="font-extrabold text-emerald-700 tabular-nums">
                {formatPKR(p.price)}
              </div>
              {isOut ? (
                <span className="text-[10px] font-extrabold text-rose-700 bg-rose-100 px-2 py-0.5 rounded-full">
                  OUT
                </span>
              ) : isLow ? (
                <span className="inline-flex items-center gap-0.5 text-[10px] font-extrabold text-amber-700 bg-amber-100 px-2 py-0.5 rounded-full">
                  <AlertTriangle className="h-2.5 w-2.5" />
                  {p.stock} {p.unit}
                </span>
              ) : (
                <span className="text-[10px] font-extrabold text-emerald-700 bg-emerald-100 px-2 py-0.5 rounded-full">
                  {p.stock} {p.unit}
                </span>
              )}
            </div>

            <div className="flex flex-wrap gap-1 pt-1">
              {p._count && p._count.variants! > 0 && (
                <span className="text-[10px] font-bold text-violet-700 bg-violet-50 px-2 py-0.5 rounded-full">
                  {p._count.variants} variants
                </span>
              )}
              {p._count && p._count.images! > 0 && (
                <span className="inline-flex items-center gap-0.5 text-[10px] font-bold text-blue-700 bg-blue-50 px-2 py-0.5 rounded-full">
                  <ImageIcon className="h-2.5 w-2.5" />
                  {p._count.images}
                </span>
              )}
              {p.wholesalePrice && (
                <span className="text-[10px] font-bold text-amber-700 bg-amber-50 px-2 py-0.5 rounded-full">
                  W/S
                </span>
              )}
            </div>

            <div className="flex gap-1 pt-1">
              <Link
                to={`/products/${p.id}/edit`}
                className="flex-1 px-2 py-1.5 rounded-lg bg-slate-100 hover:bg-slate-200 text-slate-700 text-[10px] font-extrabold inline-flex items-center justify-center gap-1 transition"
              >
                <Eye className="h-3 w-3" /> View
              </Link>
              <button
                onClick={onQuickEdit}
                className="px-2 py-1.5 rounded-lg bg-blue-50 hover:bg-blue-100 text-blue-700 inline-flex items-center justify-center transition"
                title="Quick edit"
              >
                <Edit3 className="h-3 w-3" />
              </button>
            </div>
          </>
        )}
      </div>
    </div>
  );
}

// ─── Quick Edit Modal — fast price + stock + status update ───
function QuickEditProductModal({
  product, onClose, onSuccess,
}: {
  product: Product;
  onClose: () => void;
  onSuccess: () => void;
}) {
  const [form, setForm] = useState({
    price: Number(product.price) || 0,
    costPrice: Number(product.costPrice) || 0,
    wholesalePrice: Number(product.wholesalePrice) || 0,
    stock: Number(product.stock) || 0,
    lowStockAlert: Number(product.lowStockAlert) || 5,
    isActive: product.isActive,
    isFeatured: product.isFeatured,
  });

  const updateMutation = useMutation({
    mutationFn: () => productsApi.update(product.id, form),
    onSuccess: () => {
      toast.success(`${product.name} updated`);
      onSuccess();
    },
    onError: (e: any) => toast.error(e?.response?.data?.message || 'Update failed'),
  });

  const profitMargin =
    form.costPrice > 0 && form.price > 0
      ? ((form.price - form.costPrice) / form.price) * 100
      : 0;

  return (
    <div className="fixed inset-0 z-50 bg-slate-900/60 backdrop-blur-sm flex items-center justify-center p-4">
      <div className="bg-white rounded-3xl shadow-2xl w-full max-w-lg overflow-hidden max-h-[90vh] flex flex-col">
        <div className="bg-gradient-to-br from-blue-700 to-blue-600 text-white p-5 flex items-center justify-between shrink-0">
          <div className="min-w-0">
            <div className="inline-flex items-center gap-2 rounded-full bg-white/15 backdrop-blur px-3 py-1 text-xs font-extrabold">
              <Edit3 className="h-3 w-3" />
              Quick Edit
            </div>
            <h2 className="mt-2 text-xl font-extrabold truncate">{product.name}</h2>
            {product.sku && <p className="text-xs text-white/80 font-mono mt-0.5">{product.sku}</p>}
          </div>
          <button
            onClick={onClose}
            className="h-9 w-9 rounded-full bg-white/15 hover:bg-white/25 backdrop-blur flex items-center justify-center shrink-0"
          >
            <X className="h-5 w-5" />
          </button>
        </div>

        <div className="flex-1 overflow-y-auto p-5 space-y-4">
          {/* Pricing */}
          <div className="rounded-xl bg-blue-50 border-2 border-blue-200 p-3 space-y-3">
            <div className="text-[10px] uppercase tracking-wider font-extrabold text-blue-700 flex items-center gap-1">
              <DollarSign className="h-3 w-3" />
              Pricing
            </div>
            <Input
              label="Sell Price (PKR)"
              type="number"
              step="0.01"
              value={form.price}
              onChange={(e) => setForm({ ...form, price: Number(e.target.value) })}
            />
            <Input
              label="Cost Price (PKR)"
              type="number"
              step="0.01"
              value={form.costPrice}
              onChange={(e) => setForm({ ...form, costPrice: Number(e.target.value) })}
            />
            <Input
              label="Wholesale Price (PKR)"
              type="number"
              step="0.01"
              value={form.wholesalePrice}
              onChange={(e) => setForm({ ...form, wholesalePrice: Number(e.target.value) })}
            />
            {profitMargin > 0 && (
              <div className="rounded-lg bg-emerald-100 border border-emerald-300 p-2 text-xs">
                <span className="font-bold text-emerald-900">
                  Profit margin: {profitMargin.toFixed(1)}%
                </span>
                <span className="text-emerald-700 ml-2">
                  (Rs {(form.price - form.costPrice).toFixed(2)} per {product.unit})
                </span>
              </div>
            )}
          </div>

          {/* Stock */}
          <div className="rounded-xl bg-emerald-50 border-2 border-emerald-200 p-3 space-y-3">
            <div className="text-[10px] uppercase tracking-wider font-extrabold text-emerald-700 flex items-center gap-1">
              <Package className="h-3 w-3" />
              Stock
            </div>
            <div className="grid sm:grid-cols-2 gap-3">
              <Input
                label={`Stock (${product.unit})`}
                type="number"
                step="0.01"
                value={form.stock}
                onChange={(e) => setForm({ ...form, stock: Number(e.target.value) })}
              />
              <Input
                label="Low Stock Alert"
                type="number"
                step="1"
                value={form.lowStockAlert}
                onChange={(e) => setForm({ ...form, lowStockAlert: Number(e.target.value) })}
                hint="Warning when stock drops to this"
              />
            </div>
          </div>

          {/* Status */}
          <div className="rounded-xl bg-slate-50 border-2 border-slate-200 p-3 space-y-2">
            <div className="text-[10px] uppercase tracking-wider font-extrabold text-slate-700 flex items-center gap-1">
              <Sparkles className="h-3 w-3" />
              Status
            </div>
            <label className="flex items-center gap-2 cursor-pointer p-2 rounded-lg hover:bg-white transition">
              <input
                type="checkbox"
                checked={form.isActive}
                onChange={(e) => setForm({ ...form, isActive: e.target.checked })}
                className="h-4 w-4 rounded"
              />
              <Eye className="h-4 w-4 text-slate-600" />
              <span className="text-sm font-bold">Active (visible in catalog)</span>
            </label>
            <label className="flex items-center gap-2 cursor-pointer p-2 rounded-lg hover:bg-white transition">
              <input
                type="checkbox"
                checked={form.isFeatured}
                onChange={(e) => setForm({ ...form, isFeatured: e.target.checked })}
                className="h-4 w-4 rounded"
              />
              <Star className="h-4 w-4 text-amber-500" />
              <span className="text-sm font-bold">Featured product</span>
            </label>
          </div>

          <Link
            to={`/products/${product.id}/edit`}
            className="block text-center text-xs text-blue-600 font-bold hover:underline"
          >
            Need full edit (images, variants, tags, etc.)? → Open full editor
          </Link>
        </div>

        <div className="bg-slate-50 border-t border-slate-200 p-4 flex items-center justify-between gap-2 shrink-0">
          <button
            onClick={onClose}
            className="px-4 py-2 rounded-xl text-sm font-bold text-slate-600 hover:bg-slate-200"
          >
            Cancel
          </button>
          <Button
            onClick={() => updateMutation.mutate()}
            loading={updateMutation.isPending}
            className="bg-gradient-to-r from-blue-700 to-blue-600"
          >
            <Save className="h-4 w-4" /> Save Changes
          </Button>
        </div>
      </div>
    </div>
  );
}
