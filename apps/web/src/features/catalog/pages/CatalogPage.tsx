import { useState, useMemo, useEffect } from 'react';
import { useQuery } from '@tanstack/react-query';
import {
  Search, X, Package, Sparkles, Eye, ShoppingBag, Share2,
  Grid3x3, List as ListIcon, Star, ChevronLeft, ChevronRight,
  Filter, SortAsc, Download, Copy, MessageCircle, ZoomIn,
  CheckCircle2, ArrowRight, Tag as TagIcon, Layers, TrendingUp,
  Image as ImageIcon, ExternalLink, Maximize2,
} from 'lucide-react';
import { productsApi, type Product } from '@/api/products.api';
import { categoriesApi } from '@/api/categories.api';
import { brandsApi } from '@/api/brands.api';
import { productVariantsApi } from '@/api/product-variants.api';
import { formatPKR, formatPKRFull } from '@/lib/format';
import { toast } from 'sonner';

type ViewMode = 'grid' | 'list';
type SortBy = 'newest' | 'name' | 'price-low' | 'price-high' | 'featured';

export default function CatalogPage() {
  const [search, setSearch] = useState('');
  const [categoryId, setCategoryId] = useState<string>('');
  const [brandId, setBrandId] = useState<string>('');
  const [selectedProduct, setSelectedProduct] = useState<Product | null>(null);
  const [cleanMode, setCleanMode] = useState(false);
  const [viewMode, setViewMode] = useState<ViewMode>('grid');
  const [sortBy, setSortBy] = useState<SortBy>('featured');
  const [showFilters, setShowFilters] = useState(false);
  const [featuredOnly, setFeaturedOnly] = useState(false);

  const { data: productsData, isLoading } = useQuery({
    queryKey: ['catalog-products', search, categoryId, brandId, featuredOnly],
    queryFn: () => productsApi.list({
      search,
      categoryId: categoryId || undefined,
      brandId: brandId || undefined,
      isActive: true,
      limit: 100,
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

  // ─── Sorted + filtered products ────────────────────────
  const products = useMemo(() => {
    let list = productsData?.items ?? [];
    if (featuredOnly) {
      list = list.filter((p) => p.isFeatured);
    }
    list = [...list].sort((a, b) => {
      switch (sortBy) {
        case 'name':
          return a.name.localeCompare(b.name);
        case 'price-low':
          return Number(a.price) - Number(b.price);
        case 'price-high':
          return Number(b.price) - Number(a.price);
        case 'featured':
          return (b.isFeatured ? 1 : 0) - (a.isFeatured ? 1 : 0);
        case 'newest':
        default:
          return new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime();
      }
    });
    return list;
  }, [productsData?.items, sortBy, featuredOnly]);

  // ─── Stats ─────────────────────────────────────────────
  const stats = useMemo(() => {
    const all = productsData?.items ?? [];
    const featured = all.filter((p) => p.isFeatured).length;
    const totalCategories = new Set(all.map((p) => p.categoryId).filter(Boolean)).size;
    const totalBrands = new Set(all.map((p) => p.brandId).filter(Boolean)).size;
    const avgPrice = all.length > 0
      ? all.reduce((s, p) => s + Number(p.price), 0) / all.length
      : 0;
    return { total: all.length, featured, totalCategories, totalBrands, avgPrice };
  }, [productsData?.items]);

  const sharePage = () => {
    const url = window.location.href;
    if (navigator.share) {
      navigator.share({ title: 'Our Catalog', url }).catch(() => {});
    } else {
      navigator.clipboard.writeText(url);
      toast.success('Catalog link copied to clipboard');
    }
  };

  const shareOnWhatsApp = () => {
    const url = window.location.href;
    const text = `Check out our product catalog: ${url}`;
    window.open(`https://wa.me/?text=${encodeURIComponent(text)}`, '_blank');
  };

  const clearFilters = () => {
    setSearch('');
    setCategoryId('');
    setBrandId('');
    setFeaturedOnly(false);
  };

  const hasFilters = search || categoryId || brandId || featuredOnly;

  return (
    <div className={cleanMode ? 'fixed inset-0 z-50 bg-slate-50 overflow-auto' : 'space-y-5'}>
      {/* ═══════════════ HERO HEADER (admin mode) ═══════════════ */}
      {!cleanMode && (
        <section className="relative overflow-hidden rounded-3xl bg-gradient-to-br from-slate-950 via-emerald-900 to-emerald-700 text-white p-6 shadow-2xl">
          <div className="absolute -top-20 -right-20 h-64 w-64 rounded-full bg-emerald-400/20 blur-3xl" />
          <div className="absolute -bottom-20 -left-20 h-64 w-64 rounded-full bg-amber-400/15 blur-3xl" />

          <div className="relative flex items-center justify-between gap-4 flex-wrap">
            <div className="min-w-0">
              <div className="inline-flex items-center gap-2 rounded-full bg-white/15 backdrop-blur px-3 py-1 text-xs font-extrabold border border-white/20">
                <Sparkles className="h-3.5 w-3.5 text-amber-300" />
                Product Catalog
              </div>
              <h1 className="mt-3 text-3xl sm:text-4xl font-extrabold leading-tight">
                Showcase Your Products
              </h1>
              <p className="mt-2 text-sm text-white/80 max-w-2xl">
                Customer ko apna phone/laptop dikhao — products beautifully dikhenge. Cost / wholesale hidden hain.
              </p>
            </div>

            <div className="flex gap-2 flex-wrap">
              <button
                onClick={shareOnWhatsApp}
                className="inline-flex items-center gap-2 px-3 py-2.5 rounded-xl bg-green-500/20 backdrop-blur hover:bg-green-500/30 border border-green-300/40 text-white text-sm font-extrabold transition"
              >
                <MessageCircle className="h-4 w-4" /> WhatsApp
              </button>
              <button
                onClick={sharePage}
                className="inline-flex items-center gap-2 px-3 py-2.5 rounded-xl bg-white/15 backdrop-blur hover:bg-white/25 border border-white/20 text-white text-sm font-extrabold transition"
              >
                <Share2 className="h-4 w-4" /> Share
              </button>
              <button
                onClick={() => setCleanMode(true)}
                className="inline-flex items-center gap-2 px-4 py-2.5 rounded-xl bg-white text-emerald-900 text-sm font-extrabold hover:bg-emerald-50 shadow-lg shadow-black/20"
              >
                <Eye className="h-4 w-4" /> Customer View
              </button>
            </div>
          </div>

          {/* KPI Grid */}
          <div className="relative grid grid-cols-2 sm:grid-cols-4 gap-3 mt-6">
            <KpiTile label="Total Products" value={stats.total} icon={Package} tone="emerald" />
            <KpiTile label="Featured" value={stats.featured} icon={Star} tone="amber" />
            <KpiTile label="Categories" value={stats.totalCategories} icon={TagIcon} tone="violet" />
            <KpiTile label="Avg Price" value={formatPKR(stats.avgPrice)} icon={TrendingUp} tone="blue" />
          </div>
        </section>
      )}

      {/* ═══════════════ CLEAN MODE HEADER ═══════════════ */}
      {cleanMode && (
        <div className="sticky top-0 z-40 bg-white/95 backdrop-blur border-b-2 border-slate-200 shadow-sm">
          <div className="max-w-7xl mx-auto px-4 py-3 flex items-center justify-between gap-3 flex-wrap">
            <div className="flex items-center gap-3">
              <div className="h-10 w-10 rounded-xl bg-gradient-to-br from-emerald-500 to-emerald-700 text-white flex items-center justify-center shadow-md">
                <Sparkles className="h-5 w-5" />
              </div>
              <div>
                <h1 className="text-xl font-extrabold text-slate-900">Our Products</h1>
                <p className="text-xs text-slate-500 font-semibold">{products.length} items available</p>
              </div>
            </div>
            <div className="flex items-center gap-2">
              <button
                onClick={shareOnWhatsApp}
                className="h-9 px-3 rounded-lg bg-green-50 hover:bg-green-100 border-2 border-green-200 text-green-700 text-xs font-extrabold inline-flex items-center gap-1 transition"
              >
                <MessageCircle className="h-3.5 w-3.5" /> Share
              </button>
              <button
                onClick={() => setCleanMode(false)}
                className="h-9 px-3 rounded-lg bg-slate-100 hover:bg-slate-200 text-slate-700 text-xs font-extrabold inline-flex items-center gap-1 transition"
              >
                <X className="h-3.5 w-3.5" /> Exit View
              </button>
            </div>
          </div>
        </div>
      )}

      <div className={cleanMode ? 'max-w-7xl mx-auto p-4 space-y-5' : 'space-y-5'}>
        {/* ═══════════════ SEARCH + CONTROLS ═══════════════ */}
        <section className={`rounded-3xl bg-white border-2 border-slate-200 shadow-sm p-4 space-y-3 ${cleanMode ? '' : ''}`}>
          <div className="flex gap-2 flex-wrap">
            <div className="flex-1 min-w-[240px] relative">
              <Search className="h-4 w-4 text-slate-400 absolute left-3 top-1/2 -translate-y-1/2" />
              <input
                className="h-12 w-full rounded-xl border-2 border-slate-200 bg-white pl-10 pr-10 text-sm font-semibold focus:outline-none focus:border-emerald-500 focus:ring-2 focus:ring-emerald-200 transition"
                placeholder="Search products by name, SKU, brand..."
                value={search}
                onChange={(e) => setSearch(e.target.value)}
              />
              {search && (
                <button
                  onClick={() => setSearch('')}
                  className="absolute right-3 top-1/2 -translate-y-1/2 h-6 w-6 rounded hover:bg-slate-100 flex items-center justify-center"
                >
                  <X className="h-3.5 w-3.5 text-slate-500" />
                </button>
              )}
            </div>

            <select
              value={sortBy}
              onChange={(e) => setSortBy(e.target.value as SortBy)}
              className="h-12 rounded-xl border-2 border-slate-200 bg-white px-3 text-xs font-extrabold focus:outline-none focus:border-emerald-500"
            >
              <option value="featured">Featured first</option>
              <option value="newest">Newest first</option>
              <option value="name">Name A-Z</option>
              <option value="price-low">Price (low → high)</option>
              <option value="price-high">Price (high → low)</option>
            </select>

            <div className="inline-flex rounded-xl border-2 border-slate-200 bg-white overflow-hidden">
              <button
                onClick={() => setViewMode('grid')}
                className={`px-3 h-12 text-xs font-extrabold transition ${
                  viewMode === 'grid' ? 'bg-emerald-600 text-white' : 'text-slate-700 hover:bg-slate-50'
                }`}
                title="Grid view"
              >
                <Grid3x3 className="h-4 w-4" />
              </button>
              <button
                onClick={() => setViewMode('list')}
                className={`px-3 h-12 text-xs font-extrabold transition border-l-2 border-slate-200 ${
                  viewMode === 'list' ? 'bg-emerald-600 text-white' : 'text-slate-700 hover:bg-slate-50'
                }`}
                title="List view"
              >
                <ListIcon className="h-4 w-4" />
              </button>
            </div>

            <button
              onClick={() => setShowFilters((v) => !v)}
              className={`h-12 px-4 rounded-xl border-2 text-xs font-extrabold inline-flex items-center gap-1.5 transition ${
                hasFilters || showFilters
                  ? 'bg-emerald-50 border-emerald-300 text-emerald-700'
                  : 'border-slate-200 hover:bg-slate-50 text-slate-700'
              }`}
            >
              <Filter className="h-4 w-4" /> Filters
              {hasFilters && (
                <span className="ml-1 h-5 w-5 rounded-full bg-emerald-600 text-white text-[10px] flex items-center justify-center font-extrabold">
                  !
                </span>
              )}
            </button>
          </div>

          {/* Featured chip */}
          <div className="flex gap-1.5 flex-wrap">
            <button
              onClick={() => setFeaturedOnly(false)}
              className={`px-3 py-1.5 rounded-lg text-xs font-extrabold inline-flex items-center gap-1 transition ${
                !featuredOnly ? 'bg-slate-900 text-white shadow-sm' : 'bg-slate-100 text-slate-700 hover:bg-slate-200'
              }`}
            >
              <Sparkles className="h-3 w-3" /> All Products
            </button>
            <button
              onClick={() => setFeaturedOnly(true)}
              className={`px-3 py-1.5 rounded-lg text-xs font-extrabold inline-flex items-center gap-1 transition border ${
                featuredOnly
                  ? 'bg-amber-100 text-amber-700 border-amber-300 shadow-sm'
                  : 'bg-amber-50 text-amber-700 hover:bg-amber-100 border-transparent'
              }`}
            >
              <Star className="h-3 w-3 fill-current" /> Featured Only
            </button>
          </div>

          {/* Filters panel */}
          {showFilters && (
            <div className="grid sm:grid-cols-3 gap-3 pt-2 border-t-2 border-slate-100">
              <div>
                <label className="block text-[10px] font-extrabold text-slate-600 uppercase mb-1">Category</label>
                <select
                  value={categoryId}
                  onChange={(e) => setCategoryId(e.target.value)}
                  className="h-10 w-full rounded-lg border-2 border-slate-200 bg-white px-2 text-xs font-bold focus:outline-none focus:border-emerald-500"
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
                  value={brandId}
                  onChange={(e) => setBrandId(e.target.value)}
                  className="h-10 w-full rounded-lg border-2 border-slate-200 bg-white px-2 text-xs font-bold focus:outline-none focus:border-emerald-500"
                >
                  <option value="">All brands</option>
                  {brands.map((b) => (
                    <option key={b.id} value={b.id}>{b.name}</option>
                  ))}
                </select>
              </div>
              <div className="flex items-end">
                <button
                  onClick={clearFilters}
                  disabled={!hasFilters}
                  className="h-10 w-full rounded-lg bg-rose-50 hover:bg-rose-100 text-rose-700 text-xs font-extrabold disabled:opacity-50 transition border-2 border-rose-200"
                >
                  Clear all filters
                </button>
              </div>
            </div>
          )}
        </section>

        {/* ═══════════════ RESULT COUNT ═══════════════ */}
        <div className="flex items-center justify-between flex-wrap gap-2">
          <div className="text-sm text-slate-600 font-bold">
            Showing <strong className="text-slate-900">{products.length}</strong> products
            {hasFilters && <span className="text-slate-500"> (filtered)</span>}
          </div>
          {!cleanMode && products.length > 0 && (
            <div className="text-[10px] text-slate-500 font-bold inline-flex items-center gap-1">
              <ExternalLink className="h-3 w-3" />
              Click any product to view full details
            </div>
          )}
        </div>

        {/* ═══════════════ PRODUCTS GRID / LIST ═══════════════ */}
        {isLoading ? (
          <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 lg:grid-cols-5 gap-4">
            {Array.from({ length: 10 }).map((_, i) => (
              <div key={i} className="aspect-square rounded-2xl bg-gradient-to-br from-slate-100 to-slate-200 animate-pulse" />
            ))}
          </div>
        ) : products.length === 0 ? (
          <div className="rounded-3xl bg-white border-2 border-dashed border-slate-200 p-16 text-center shadow-sm">
            <div className="h-20 w-20 rounded-3xl bg-gradient-to-br from-slate-100 to-slate-200 mx-auto flex items-center justify-center shadow-inner mb-4">
              <Package className="h-10 w-10 text-slate-400" />
            </div>
            <h3 className="text-xl font-extrabold text-slate-900">No products found</h3>
            <p className="text-sm text-slate-500 mt-1 max-w-md mx-auto">
              {hasFilters ? 'Try changing search or filters' : 'No active products in catalog yet'}
            </p>
            {hasFilters && (
              <button
                onClick={clearFilters}
                className="mt-4 px-4 py-2 rounded-lg bg-emerald-600 hover:bg-emerald-700 text-white text-sm font-extrabold inline-flex items-center gap-1"
              >
                <X className="h-3.5 w-3.5" /> Clear filters
              </button>
            )}
          </div>
        ) : viewMode === 'grid' ? (
          <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 lg:grid-cols-5 gap-3 sm:gap-4">
            {products.map((p) => (
              <CatalogCard
                key={p.id}
                product={p}
                onClick={() => setSelectedProduct(p)}
              />
            ))}
          </div>
        ) : (
          <div className="space-y-2">
            {products.map((p) => (
              <CatalogListItem
                key={p.id}
                product={p}
                onClick={() => setSelectedProduct(p)}
              />
            ))}
          </div>
        )}
      </div>

      {/* ═══════════════ PRODUCT DETAIL MODAL ═══════════════ */}
      {selectedProduct && (
        <ProductDetailModal
          productId={selectedProduct.id}
          onClose={() => setSelectedProduct(null)}
        />
      )}
    </div>
  );
}

// ═════════════════════════════════════════════════════════════
// COMPONENTS
// ═════════════════════════════════════════════════════════════

function KpiTile({
  label, value, icon: Icon, tone,
}: { label: string; value: string | number; icon: any; tone: string }) {
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

// ─── Catalog Card (Grid) ────────────────────────────────────
function CatalogCard({ product, onClick }: { product: Product; onClick: () => void }) {
  const primaryImage = product.images?.[0]?.url;
  const variantCount = product._count?.variants ?? 0;
  const imageCount = product._count?.images ?? 0;

  return (
    <button
      onClick={onClick}
      className="group relative rounded-2xl bg-white border-2 border-slate-200 overflow-hidden hover:border-emerald-400 hover:shadow-xl hover:shadow-emerald-500/10 hover:-translate-y-1 transition-all text-left"
    >
      {product.isFeatured && (
        <div className="absolute top-2 right-2 z-10 px-2 py-1 rounded-full bg-gradient-to-br from-amber-400 to-amber-600 text-white text-[10px] font-extrabold shadow-lg flex items-center gap-1">
          <Star className="h-2.5 w-2.5 fill-white" /> FEATURED
        </div>
      )}

      <div className="aspect-square bg-slate-100 overflow-hidden relative">
        {primaryImage ? (
          <img
            src={primaryImage}
            alt={product.name}
            className="w-full h-full object-cover group-hover:scale-110 transition-transform duration-500"
          />
        ) : (
          <div className="w-full h-full flex items-center justify-center bg-gradient-to-br from-slate-100 to-slate-200">
            <Package className="h-12 w-12 text-slate-400" />
          </div>
        )}

        {/* Hover overlay */}
        <div className="absolute inset-0 bg-gradient-to-t from-slate-900/60 via-transparent to-transparent opacity-0 group-hover:opacity-100 transition-opacity flex items-end justify-center p-3">
          <div className="px-3 py-1.5 rounded-lg bg-white text-emerald-700 text-xs font-extrabold inline-flex items-center gap-1 shadow-lg">
            <Eye className="h-3.5 w-3.5" /> View Details
          </div>
        </div>

        {/* Bottom badges */}
        <div className="absolute bottom-2 left-2 right-2 flex items-center justify-between gap-1">
          {variantCount > 0 && (
            <div className="px-2 py-0.5 rounded-full bg-slate-900/80 backdrop-blur text-white text-[10px] font-extrabold inline-flex items-center gap-1">
              <Layers className="h-2.5 w-2.5" />
              {variantCount}
            </div>
          )}
          {imageCount > 1 && (
            <div className="px-2 py-0.5 rounded-full bg-slate-900/80 backdrop-blur text-white text-[10px] font-extrabold inline-flex items-center gap-1 ml-auto">
              <ImageIcon className="h-2.5 w-2.5" />
              {imageCount}
            </div>
          )}
        </div>
      </div>

      <div className="p-3 space-y-1">
        {product.brand && (
          <div className="text-[10px] uppercase tracking-wider text-violet-700 font-extrabold truncate">
            {product.brand.name}
          </div>
        )}
        <h3 className="font-extrabold text-slate-900 line-clamp-2 leading-tight text-sm group-hover:text-emerald-700 transition-colors">
          {product.name}
        </h3>
        <div className="flex items-end justify-between pt-1">
          <div className="text-emerald-700 font-extrabold text-base tabular-nums">
            {formatPKRFull(product.price)}
          </div>
          <div className="text-[10px] text-slate-500 font-bold">
            / {product.unit}
          </div>
        </div>
      </div>
    </button>
  );
}

// ─── Catalog List Item ────────────────────────────────────
function CatalogListItem({ product, onClick }: { product: Product; onClick: () => void }) {
  const primaryImage = product.images?.[0]?.url;
  const variantCount = product._count?.variants ?? 0;

  return (
    <button
      onClick={onClick}
      className="group w-full rounded-2xl bg-white border-2 border-slate-200 overflow-hidden hover:border-emerald-400 hover:shadow-lg transition-all text-left flex items-center gap-4 p-3"
    >
      <div className="h-20 w-20 rounded-xl bg-slate-100 overflow-hidden shrink-0 ring-2 ring-white shadow-sm">
        {primaryImage ? (
          <img
            src={primaryImage}
            alt={product.name}
            className="w-full h-full object-cover group-hover:scale-110 transition-transform"
          />
        ) : (
          <div className="w-full h-full flex items-center justify-center bg-gradient-to-br from-slate-100 to-slate-200">
            <Package className="h-8 w-8 text-slate-400" />
          </div>
        )}
      </div>

      <div className="flex-1 min-w-0">
        <div className="flex items-center gap-2 flex-wrap">
          {product.brand && (
            <span className="text-[10px] uppercase tracking-wider text-violet-700 font-extrabold">
              {product.brand.name}
            </span>
          )}
          {product.isFeatured && (
            <span className="inline-flex items-center gap-0.5 px-1.5 py-0.5 rounded-full bg-amber-100 text-amber-700 text-[9px] font-extrabold">
              <Star className="h-2.5 w-2.5 fill-current" /> FEATURED
            </span>
          )}
        </div>
        <h3 className="font-extrabold text-slate-900 text-base mt-0.5 group-hover:text-emerald-700 transition-colors line-clamp-1">
          {product.name}
        </h3>
        {product.shortDescription && (
          <p className="text-xs text-slate-500 line-clamp-1 mt-0.5">{product.shortDescription}</p>
        )}
        <div className="flex items-center gap-2 mt-1 flex-wrap">
          {variantCount > 0 && (
            <span className="text-[10px] font-bold text-violet-700 bg-violet-50 px-2 py-0.5 rounded-full inline-flex items-center gap-0.5">
              <Layers className="h-2.5 w-2.5" /> {variantCount} variants
            </span>
          )}
          {product.category && (
            <span className="text-[10px] font-bold text-slate-600">{product.category.name}</span>
          )}
        </div>
      </div>

      <div className="text-right shrink-0">
        <div className="text-xl font-extrabold text-emerald-700 tabular-nums">
          {formatPKRFull(product.price)}
        </div>
        <div className="text-[10px] text-slate-500 font-bold">/ {product.unit}</div>
        <div className="mt-1 opacity-0 group-hover:opacity-100 transition-opacity">
          <ArrowRight className="h-4 w-4 text-emerald-600 ml-auto" />
        </div>
      </div>
    </button>
  );
}

// ─── Product Detail Modal (Enhanced) ────────────────────────
function ProductDetailModal({ productId, onClose }: { productId: string; onClose: () => void }) {
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
    [variants]
  );

  const [selectedVariantId, setSelectedVariantId] = useState<string | null>(null);
  const [activeImageIndex, setActiveImageIndex] = useState(0);
  const [zoomed, setZoomed] = useState(false);

  const selectedVariant = activeVariants.find((v) => v.id === selectedVariantId);

  const allImages = useMemo(() => {
    if (!product) return [];
    const imgs = [...(product.images ?? [])];
    if (selectedVariant?.imageUrl) {
      return [{ id: 'variant', url: selectedVariant.imageUrl, isPrimary: true }, ...imgs];
    }
    return imgs;
  }, [product, selectedVariant]);

  const displayImage = allImages[activeImageIndex]?.url;
  const displayPrice = selectedVariant?.price ?? product?.price ?? 0;

  // Reset image index when variant changes
  useEffect(() => {
    setActiveImageIndex(0);
  }, [selectedVariantId]);

  const handleCopyDetails = () => {
    if (!product) return;
    const text = `${product.name}\nPrice: ${formatPKRFull(displayPrice)} / ${product.unit}${
      selectedVariant ? `\nVariant: ${selectedVariant.name}` : ''
    }${product.shortDescription ? `\n${product.shortDescription}` : ''}`;
    navigator.clipboard.writeText(text);
    toast.success('Product details copied');
  };

  const handleShareWhatsApp = () => {
    if (!product) return;
    const text = `*${product.name}*\nPrice: ${formatPKRFull(displayPrice)} / ${product.unit}${
      selectedVariant ? `\nVariant: ${selectedVariant.name}` : ''
    }${product.shortDescription ? `\n${product.shortDescription}` : ''}`;
    window.open(`https://wa.me/?text=${encodeURIComponent(text)}`, '_blank');
  };

  const nextImage = () => {
    setActiveImageIndex((i) => (i + 1) % allImages.length);
  };

  const prevImage = () => {
    setActiveImageIndex((i) => (i - 1 + allImages.length) % allImages.length);
  };

  return (
    <div
      className="fixed inset-0 z-50 bg-slate-900/80 backdrop-blur-sm flex items-end sm:items-center justify-center p-0 sm:p-4 animate-in fade-in duration-200"
      onClick={onClose}
    >
      <div
        className="bg-white w-full sm:max-w-5xl sm:rounded-3xl rounded-t-3xl shadow-2xl max-h-[95vh] overflow-auto"
        onClick={(e) => e.stopPropagation()}
      >
        {/* Sticky header */}
        <div className="sticky top-0 z-10 bg-white/95 backdrop-blur border-b-2 border-slate-100 px-5 py-3 flex items-center justify-between">
          <div className="flex items-center gap-2 min-w-0">
            <div className="h-8 w-8 rounded-lg bg-gradient-to-br from-emerald-500 to-emerald-700 text-white flex items-center justify-center shrink-0 shadow-sm">
              <Package className="h-4 w-4" />
            </div>
            <div className="font-extrabold text-slate-900 truncate">{product?.name}</div>
          </div>
          <div className="flex items-center gap-1.5">
            <button
              onClick={handleShareWhatsApp}
              className="h-9 w-9 rounded-lg bg-green-50 hover:bg-green-100 text-green-700 flex items-center justify-center transition"
              title="Share on WhatsApp"
            >
              <MessageCircle className="h-4 w-4" />
            </button>
            <button
              onClick={onClose}
              className="h-9 w-9 rounded-full bg-slate-100 hover:bg-slate-200 flex items-center justify-center transition"
            >
              <X className="h-4 w-4 text-slate-700" />
            </button>
          </div>
        </div>

        {isLoading || !product ? (
          <div className="p-16 text-center">
            <div className="inline-block h-12 w-12 rounded-full border-4 border-emerald-200 border-t-emerald-600 animate-spin" />
            <p className="text-sm text-slate-500 font-bold mt-3">Loading product...</p>
          </div>
        ) : (
          <div className="grid md:grid-cols-2 gap-0">
            {/* ─── IMAGE SIDE ─── */}
            <div className="bg-gradient-to-br from-slate-100 to-slate-200 relative">
              <div className="aspect-square md:aspect-auto md:min-h-[500px] relative group">
                {displayImage ? (
                  <>
                    <img
                      src={displayImage}
                      alt={product.name}
                      onClick={() => setZoomed(true)}
                      className="w-full h-full object-cover cursor-zoom-in"
                    />
                    <button
                      onClick={() => setZoomed(true)}
                      className="absolute top-3 right-3 h-9 w-9 rounded-full bg-white/90 backdrop-blur hover:bg-white text-slate-700 flex items-center justify-center shadow-md transition"
                      title="Zoom"
                    >
                      <Maximize2 className="h-4 w-4" />
                    </button>
                  </>
                ) : (
                  <div className="w-full h-full flex items-center justify-center">
                    <Package className="h-24 w-24 text-slate-400" />
                  </div>
                )}

                {/* Image navigation */}
                {allImages.length > 1 && (
                  <>
                    <button
                      onClick={prevImage}
                      className="absolute left-3 top-1/2 -translate-y-1/2 h-10 w-10 rounded-full bg-white/90 backdrop-blur hover:bg-white text-slate-700 flex items-center justify-center shadow-lg transition opacity-0 group-hover:opacity-100"
                    >
                      <ChevronLeft className="h-5 w-5" />
                    </button>
                    <button
                      onClick={nextImage}
                      className="absolute right-3 top-1/2 -translate-y-1/2 h-10 w-10 rounded-full bg-white/90 backdrop-blur hover:bg-white text-slate-700 flex items-center justify-center shadow-lg transition opacity-0 group-hover:opacity-100"
                    >
                      <ChevronRight className="h-5 w-5" />
                    </button>
                    <div className="absolute bottom-3 left-1/2 -translate-x-1/2 px-2.5 py-1 rounded-full bg-slate-900/70 backdrop-blur text-white text-[10px] font-extrabold">
                      {activeImageIndex + 1} / {allImages.length}
                    </div>
                  </>
                )}

                {product.isFeatured && (
                  <div className="absolute top-3 left-3 px-2.5 py-1 rounded-full bg-gradient-to-br from-amber-400 to-amber-600 text-white text-[10px] font-extrabold shadow-lg flex items-center gap-1">
                    <Star className="h-3 w-3 fill-white" /> FEATURED
                  </div>
                )}
              </div>

              {/* Thumbnail strip */}
              {allImages.length > 1 && (
                <div className="bg-white border-t-2 border-slate-100 p-3 flex gap-2 overflow-x-auto">
                  {allImages.map((img, i) => (
                    <button
                      key={img.id || i}
                      onClick={() => setActiveImageIndex(i)}
                      className={`h-14 w-14 rounded-lg overflow-hidden shrink-0 border-2 transition ${
                        activeImageIndex === i
                          ? 'border-emerald-500 ring-2 ring-emerald-200 shadow-md'
                          : 'border-slate-200 hover:border-emerald-300'
                      }`}
                    >
                      <img src={img.url} alt="" className="w-full h-full object-cover" />
                    </button>
                  ))}
                </div>
              )}
            </div>

            {/* ─── DETAILS SIDE ─── */}
            <div className="p-6 space-y-5">
              {product.brand && (
                <div className="inline-flex items-center gap-1.5 px-2.5 py-0.5 rounded-full bg-violet-50 border-2 border-violet-200">
                  <span className="h-1.5 w-1.5 rounded-full bg-violet-500" />
                  <span className="text-[10px] uppercase tracking-wider text-violet-700 font-extrabold">
                    {product.brand.name}
                  </span>
                </div>
              )}

              <div>
                <h2 className="text-2xl sm:text-3xl font-extrabold text-slate-900 leading-tight">{product.name}</h2>
                {product.shortDescription && (
                  <p className="text-sm text-slate-600 mt-2 font-semibold">{product.shortDescription}</p>
                )}
              </div>

              <div className="rounded-2xl bg-gradient-to-br from-emerald-50 to-green-50 border-2 border-emerald-200 p-4">
                <div className="flex items-baseline gap-2">
                  <div className="text-4xl font-extrabold text-emerald-700 tabular-nums leading-none">
                    {formatPKRFull(displayPrice)}
                  </div>
                  <div className="text-sm text-emerald-700 font-extrabold">/ {product.unit}</div>
                </div>
                {selectedVariant && (
                  <div className="text-xs text-emerald-700 font-bold mt-1.5 inline-flex items-center gap-1">
                    <CheckCircle2 className="h-3 w-3" />
                    {selectedVariant.name}
                  </div>
                )}
              </div>

              {product.description && (
                <div className="rounded-xl bg-slate-50 border border-slate-200 p-4">
                  <div className="text-[10px] uppercase tracking-wider font-extrabold text-slate-600 mb-2">Description</div>
                  <p className="text-sm text-slate-700 leading-relaxed whitespace-pre-line">{product.description}</p>
                </div>
              )}

              {/* Variants */}
              {activeVariants.length > 0 && (
                <div>
                  <div className="flex items-center justify-between mb-3">
                    <div className="text-sm font-extrabold text-slate-900 inline-flex items-center gap-1.5">
                      <Layers className="h-4 w-4 text-violet-600" />
                      Available Options ({activeVariants.length})
                    </div>
                    {selectedVariantId && (
                      <button
                        onClick={() => setSelectedVariantId(null)}
                        className="text-[10px] font-extrabold text-rose-600 hover:underline"
                      >
                        Clear selection
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
                              ? 'border-emerald-500 ring-2 ring-emerald-200 shadow-lg'
                              : 'border-slate-200 hover:border-emerald-300 hover:shadow-md'
                          }`}
                        >
                          <div className="aspect-square bg-slate-100">
                            {v.imageUrl ? (
                              <img src={v.imageUrl} alt={v.name} className="w-full h-full object-cover" />
                            ) : v.colorHex ? (
                              <div className="w-full h-full relative" style={{ backgroundColor: v.colorHex }}>
                                <div className="absolute bottom-1 left-1 bg-black/40 backdrop-blur rounded px-1 text-white text-[8px] font-extrabold">
                                  {v.colorHex}
                                </div>
                              </div>
                            ) : (
                              <div className="w-full h-full flex items-center justify-center bg-gradient-to-br from-slate-100 to-slate-200">
                                <Package className="h-6 w-6 text-slate-400" />
                              </div>
                            )}
                          </div>
                          <div className="px-2 py-1.5 bg-white">
                            <div className="text-[11px] font-extrabold text-slate-900 truncate">
                              {v.size || v.color || v.name}
                            </div>
                            <div className="text-[10px] text-emerald-700 font-extrabold tabular-nums">
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
                    <div className="mt-3 rounded-xl bg-gradient-to-br from-emerald-50 to-green-50 border-2 border-emerald-200 p-3 text-sm">
                      <div className="font-extrabold text-emerald-900 flex items-center gap-1.5">
                        <CheckCircle2 className="h-4 w-4" />
                        {selectedVariant.name}
                      </div>
                      <div className="flex items-center gap-3 mt-1.5 text-xs text-emerald-800 font-semibold flex-wrap">
                        {selectedVariant.sku && <span>SKU: <strong className="font-mono">{selectedVariant.sku}</strong></span>}
                        {selectedVariant.size && <span>Code: <strong>{selectedVariant.size}</strong></span>}
                        {selectedVariant.color && <span>Color: <strong>{selectedVariant.color}</strong></span>}
                      </div>
                    </div>
                  )}
                </div>
              )}

              {/* Action buttons */}
              <div className="flex gap-2 pt-3 border-t-2 border-slate-100">
                <button
                  onClick={handleCopyDetails}
                  className="flex-1 h-12 rounded-xl bg-slate-100 hover:bg-slate-200 text-slate-900 font-extrabold text-sm inline-flex items-center justify-center gap-2 transition"
                >
                  <Copy className="h-4 w-4" /> Copy
                </button>
                <button
                  onClick={handleShareWhatsApp}
                  className="flex-1 h-12 rounded-xl bg-gradient-to-r from-green-500 to-green-600 hover:from-green-600 hover:to-green-700 text-white font-extrabold text-sm inline-flex items-center justify-center gap-2 shadow-md transition"
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
            className="absolute top-4 right-4 h-10 w-10 rounded-full bg-white/15 backdrop-blur hover:bg-white/25 text-white flex items-center justify-center"
          >
            <X className="h-5 w-5" />
          </button>
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
