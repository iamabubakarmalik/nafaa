import { useState, useMemo } from 'react';
import { Link } from 'react-router-dom';
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import {
  Search, Plus, Package, Star, AlertTriangle,
  Trash2, Sliders, Image as ImageIcon, Layers, Scissors,
  ArrowRight, FileSpreadsheet,
} from 'lucide-react';
import { productsApi, type ProductsListParams, type Product } from '@/api/products.api';
import { brandsApi } from '@/api/brands.api';
import { categoriesApi } from '@/api/categories.api';
import { tagsApi } from '@/api/tags.api';
import { Button } from '@/components/ui/Button';
import { formatPKR, formatPKRFull } from '@/lib/format';
import { toast } from 'sonner';
import { useBusinessFeatures } from '@/hooks/useBusinessFeatures';
import { carpetRollsApi, type CarpetProductSummary } from '@/features/industries/carpet/api/carpet-rolls.api';

export default function ProductsListPage() {
  const queryClient = useQueryClient();
  const { businessType, features } = useBusinessFeatures();

  // Carpet business detection — type OR length×width calc feature enabled
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

  // ─── Carpet roll summary ─────────────────────────────────
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
    for (const s of carpetSummary) {
      map.set(s.productId, s);
    }
    return map;
  }, [carpetSummary]);

  // Helper: check if a specific product is carpet-style (sqft unit)
  const isCarpetProduct = (p: Product) => {
    if (!isCarpetBusiness) return false;
    return p.unit === 'sqft' || p.unit === 'sqm' || p.unit === 'sqyd';
  };

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

  const items = data?.items ?? [];

  // ─── Carpet stats summary (top banner) ───────────────────
  const carpetStats = useMemo(() => {
    if (!isCarpetBusiness) return null;
    const totalSqft = carpetSummary.reduce((acc, s) => acc + s.totalSqft, 0);
    const totalRolls = carpetSummary.reduce((acc, s) => acc + s.rollCount, 0);
    const totalCutPieces = carpetSummary.reduce((acc, s) => acc + s.cutPiecesCount, 0);
    const productsWithStock = carpetSummary.length;
    return { totalSqft, totalRolls, totalCutPieces, productsWithStock };
  }, [carpetSummary, isCarpetBusiness]);

  return (
    <div className="space-y-6">
      <section className="rounded-3xl bg-gradient-to-br from-brand-900 to-emerald-700 text-white p-6">
        <div className="flex items-center justify-between flex-wrap gap-4">
          <div>
            <div className="inline-flex items-center gap-2 rounded-full bg-white/10 px-3 py-1 text-xs font-medium">
              <Package className="h-3.5 w-3.5" /> Inventory
            </div>
            <h2 className="mt-3 text-3xl font-bold">Products</h2>
            <p className="mt-2 text-sm text-white/80">
              {data?.meta.total ?? 0} total products
            </p>
          </div>
          <div className="flex gap-2 flex-wrap">
            {isCarpetBusiness && (
              <Link to="/carpet-rolls">
                <Button variant="secondary" className="bg-white/15 text-white hover:bg-white/25 border-white/20">
                  <Layers className="h-4 w-4" /> Carpet Rolls
                </Button>
              </Link>
            )}
            <Link to="/brands">
              <Button variant="secondary">Brands</Button>
            </Link>
            <Link to="/tags">
              <Button variant="secondary">Tags</Button>
            </Link>
            <Link to="/products/bulk-import">
              <Button variant="secondary" className="bg-white/15 text-white hover:bg-white/25 border-white/20">
                <FileSpreadsheet className="h-4 w-4" /> Bulk Import
              </Button>
            </Link>
            <Link to="/products/new">
              <Button className="bg-white text-slate-900 hover:bg-slate-100">
                <Plus className="h-4 w-4" /> New Product
              </Button>
            </Link>
          </div>
        </div>

        {/* Carpet stats banner */}
        {carpetStats && carpetStats.totalRolls > 0 && (
          <div className="grid grid-cols-2 sm:grid-cols-4 gap-3 mt-5">
            <div className="rounded-xl bg-white/10 backdrop-blur p-3">
              <div className="text-[10px] uppercase tracking-wider text-white/70 font-bold">
                Carpet Stock
              </div>
              <div className="text-2xl font-extrabold mt-1">
                {carpetStats.totalSqft.toFixed(0)}
              </div>
              <div className="text-[10px] text-white/70 font-bold">sqft total</div>
            </div>
            <div className="rounded-xl bg-white/10 backdrop-blur p-3">
              <div className="text-[10px] uppercase tracking-wider text-white/70 font-bold">
                Active Rolls
              </div>
              <div className="text-2xl font-extrabold mt-1">{carpetStats.totalRolls}</div>
            </div>
            <div className="rounded-xl bg-white/10 backdrop-blur p-3">
              <div className="text-[10px] uppercase tracking-wider text-white/70 font-bold">
                Cut Pieces
              </div>
              <div className="text-2xl font-extrabold mt-1">{carpetStats.totalCutPieces}</div>
            </div>
            <div className="rounded-xl bg-white/10 backdrop-blur p-3">
              <div className="text-[10px] uppercase tracking-wider text-white/70 font-bold">
                Products w/ Stock
              </div>
              <div className="text-2xl font-extrabold mt-1">
                {carpetStats.productsWithStock}
              </div>
            </div>
          </div>
        )}
      </section>

      {/* Search + filter toggle */}
      <div className="flex gap-2">
        <div className="flex-1 relative">
          <Search className="h-4 w-4 text-slate-400 absolute left-3 top-1/2 -translate-y-1/2" />
          <input
            className="h-11 w-full rounded-xl border border-slate-200 bg-white pl-10 pr-4 text-sm focus:outline-none focus:ring-2 focus:ring-brand-500/30"
            placeholder="Search by name, SKU, barcode..."
            value={params.search ?? ''}
            onChange={(e) => setParams({ ...params, search: e.target.value, page: 1 })}
          />
        </div>
        <Button
          variant="secondary"
          onClick={() => setShowFilters((v) => !v)}
        >
          <Sliders className="h-4 w-4" /> Filters
          {(params.brandId || params.categoryId || params.tagId || params.stockStatus !== 'all') && (
            <span className="ml-1 h-5 w-5 rounded-full bg-brand-600 text-white text-xs flex items-center justify-center font-bold">
              !
            </span>
          )}
        </Button>
      </div>

      {/* Filters panel */}
      {showFilters && (
        <div className="rounded-2xl bg-white border border-slate-200 p-5 space-y-4">
          <div className="grid sm:grid-cols-2 lg:grid-cols-4 gap-3">
            <div>
              <label className="block text-xs font-bold text-slate-600 mb-1">Category</label>
              <select
                className="h-10 w-full rounded-lg border border-slate-200 bg-white px-3 text-sm"
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
              <label className="block text-xs font-bold text-slate-600 mb-1">Brand</label>
              <select
                className="h-10 w-full rounded-lg border border-slate-200 bg-white px-3 text-sm"
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
              <label className="block text-xs font-bold text-slate-600 mb-1">Tag</label>
              <select
                className="h-10 w-full rounded-lg border border-slate-200 bg-white px-3 text-sm"
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
            <div>
              <label className="block text-xs font-bold text-slate-600 mb-1">Stock</label>
              <select
                className="h-10 w-full rounded-lg border border-slate-200 bg-white px-3 text-sm"
                value={params.stockStatus ?? 'all'}
                onChange={(e) =>
                  setParams({ ...params, stockStatus: e.target.value as any, page: 1 })
                }
              >
                <option value="all">All stock</option>
                <option value="in">In stock</option>
                <option value="low">Low stock</option>
                <option value="out">Out of stock</option>
              </select>
            </div>
          </div>

          <button
            onClick={() =>
              setParams({ search: '', page: 1, limit: 24, stockStatus: 'all' })
            }
            className="text-sm text-rose-600 font-bold hover:underline"
          >
            Clear all filters
          </button>
        </div>
      )}

      {/* Bulk actions bar */}
      {selected.size > 0 && (
        <div className="rounded-2xl bg-amber-50 border border-amber-200 p-3 flex items-center justify-between gap-3">
          <div className="font-bold text-amber-900">
            {selected.size} selected
          </div>
          <div className="flex gap-2 flex-wrap">
            <button
              onClick={() => bulkMutation.mutate('activate')}
              className="px-3 py-1.5 rounded-lg bg-emerald-600 text-white text-sm font-bold hover:bg-emerald-700"
            >
              Activate
            </button>
            <button
              onClick={() => bulkMutation.mutate('deactivate')}
              className="px-3 py-1.5 rounded-lg bg-slate-600 text-white text-sm font-bold hover:bg-slate-700"
            >
              Deactivate
            </button>
            <button
              onClick={() => bulkMutation.mutate('feature')}
              className="px-3 py-1.5 rounded-lg bg-amber-600 text-white text-sm font-bold hover:bg-amber-700"
            >
              Feature
            </button>
            <button
              onClick={() => {
                if (confirm(`Delete ${selected.size} products? This cannot be undone.`))
                  bulkMutation.mutate('delete');
              }}
              className="px-3 py-1.5 rounded-lg bg-rose-600 text-white text-sm font-bold hover:bg-rose-700"
            >
              <Trash2 className="h-3.5 w-3.5 inline" /> Delete
            </button>
            <button
              onClick={() => setSelected(new Set())}
              className="px-3 py-1.5 rounded-lg border border-slate-300 text-sm font-bold"
            >
              Clear
            </button>
          </div>
        </div>
      )}

      {/* Grid */}
      {items.length === 0 ? (
        <div className="rounded-3xl bg-white border border-slate-200 p-16 text-center">
          <Package className="h-16 w-16 text-slate-300 mx-auto" />
          <h3 className="mt-4 text-lg font-bold text-slate-900">No products found</h3>
          <p className="text-sm text-slate-500 mt-1">Try adjusting filters or add a new product</p>
          <Link to="/products/new">
            <Button className="mt-5">
              <Plus className="h-4 w-4" /> Add Product
            </Button>
          </Link>
        </div>
      ) : (
        <div className="grid sm:grid-cols-2 md:grid-cols-3 lg:grid-cols-4 xl:grid-cols-5 gap-4">
          {items.map((p) => {
            const primaryImage = p.images?.[0]?.url;
            const carpetData = carpetSummaryMap.get(p.id);
            const isCarpet = isCarpetProduct(p);

            // Carpet stock logic
            const carpetTotalSqft = carpetData?.totalSqft ?? 0;
            const carpetRollCount = carpetData?.rollCount ?? 0;
            const carpetCutPieces = carpetData?.cutPiecesCount ?? 0;
            const hasCarpetStock = isCarpet && (carpetRollCount > 0 || carpetCutPieces > 0);

            // Standard stock logic
            const isLow = !isCarpet && p.stock > 0 && p.stock <= p.lowStockAlert;
            const isOut = !isCarpet && p.stock === 0;

            // Price display for carpet (range from rolls)
            const carpetPriceDisplay = carpetData && carpetData.rollCount > 0
              ? carpetData.minSalePrice === carpetData.maxSalePrice
                ? formatPKR(carpetData.avgSalePrice)
                : `${formatPKR(carpetData.minSalePrice)}–${formatPKR(carpetData.maxSalePrice)}`
              : formatPKR(p.price);

            return (
              <div
                key={p.id}
                className={`group relative rounded-2xl bg-white border-2 overflow-hidden hover:shadow-xl transition-all ${
                  selected.has(p.id) ? 'border-brand-500 ring-2 ring-brand-200' : 'border-slate-200'
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
                  onClick={() => toggleSelect(p.id)}
                  className={`absolute top-2 left-2 z-20 h-6 w-6 rounded-md border-2 flex items-center justify-center transition ${
                    selected.has(p.id)
                      ? 'bg-brand-600 border-brand-600'
                      : 'bg-white border-slate-300 opacity-0 group-hover:opacity-100'
                  } ${isCarpet ? 'translate-y-5' : ''}`}
                >
                  {selected.has(p.id) && (
                    <svg className="h-3.5 w-3.5 text-white" viewBox="0 0 20 20" fill="currentColor">
                      <path d="M16.7 5.3a1 1 0 010 1.4l-7 7a1 1 0 01-1.4 0l-3-3a1 1 0 111.4-1.4L9 11.6l6.3-6.3a1 1 0 011.4 0z" />
                    </svg>
                  )}
                </button>

                {/* Featured badge */}
                {p.isFeatured && (
                  <div className="absolute top-2 right-2 z-10 h-7 w-7 rounded-full bg-amber-500 flex items-center justify-center shadow">
                    <Star className="h-4 w-4 text-white fill-white" />
                  </div>
                )}

                {/* Image */}
                <Link to={`/products/${p.id}/edit`} className="block">
                  <div className="aspect-square bg-slate-100 overflow-hidden">
                    {primaryImage ? (
                      <img
                        src={primaryImage}
                        alt={p.name}
                        className="w-full h-full object-cover group-hover:scale-105 transition-transform"
                      />
                    ) : (
                      <div className="w-full h-full flex items-center justify-center bg-gradient-to-br from-slate-100 to-slate-200">
                        <Package className="h-10 w-10 text-slate-400" />
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
                    <h3 className="font-bold text-slate-900 line-clamp-2 hover:text-brand-700 leading-tight">
                      {p.name}
                    </h3>
                  </Link>

                  {/* Price + Stock — CARPET branch */}
                  {isCarpet ? (
                    <>
                      <div className="flex items-center justify-between pt-1">
                        <div className="font-bold text-emerald-700 text-sm">
                          {carpetPriceDisplay}
                          <span className="text-[10px] font-bold text-slate-500 ml-0.5">/{p.unit}</span>
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

                      {/* Carpet roll badges */}
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
                            {carpetCutPieces} cut piece{carpetCutPieces !== 1 ? 's' : ''}
                          </span>
                        )}
                        {!p.isActive && (
                          <span className="text-[10px] font-bold text-slate-700 bg-slate-100 px-2 py-0.5 rounded-full">
                            INACTIVE
                          </span>
                        )}
                      </div>

                      {/* View Rolls action */}
                      <Link
                        to={`/carpet-rolls?productId=${p.id}`}
                        className="mt-2 flex items-center justify-center gap-1 px-2 py-1.5 rounded-lg bg-gradient-to-r from-emerald-600 to-emerald-700 hover:from-emerald-700 hover:to-emerald-800 text-white text-[11px] font-extrabold transition"
                      >
                        {carpetRollCount > 0 ? 'View Rolls' : 'Add First Roll'}
                        <ArrowRight className="h-3 w-3" />
                      </Link>
                    </>
                  ) : (
                    <>
                      {/* Standard product price + stock */}
                      <div className="flex items-center justify-between pt-1">
                        <div className="font-bold text-emerald-700">
                          {formatPKR(p.price)}
                        </div>
                        {isOut ? (
                          <span className="text-[10px] font-bold text-rose-700 bg-rose-100 px-2 py-0.5 rounded-full">
                            OUT
                          </span>
                        ) : isLow ? (
                          <span className="inline-flex items-center gap-0.5 text-[10px] font-bold text-amber-700 bg-amber-100 px-2 py-0.5 rounded-full">
                            <AlertTriangle className="h-2.5 w-2.5" />
                            {p.stock} {p.unit}
                          </span>
                        ) : (
                          <span className="text-[10px] font-bold text-emerald-700 bg-emerald-100 px-2 py-0.5 rounded-full">
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
                        {!p.isActive && (
                          <span className="text-[10px] font-bold text-slate-700 bg-slate-100 px-2 py-0.5 rounded-full">
                            INACTIVE
                          </span>
                        )}
                      </div>
                    </>
                  )}
                </div>
              </div>
            );
          })}
        </div>
      )}

      {/* Pagination */}
      {data && data.meta.totalPages > 1 && (
        <div className="flex items-center justify-between">
          <div className="text-sm text-slate-500">
            Page {data.meta.page} of {data.meta.totalPages} • {data.meta.total} total
          </div>
          <div className="flex gap-2">
            <button
              disabled={params.page === 1}
              onClick={() => setParams({ ...params, page: (params.page ?? 1) - 1 })}
              className="px-3 py-1.5 rounded-lg border border-slate-200 text-sm font-bold disabled:opacity-50"
            >
              Previous
            </button>
            <button
              disabled={(params.page ?? 1) >= data.meta.totalPages}
              onClick={() => setParams({ ...params, page: (params.page ?? 1) + 1 })}
              className="px-3 py-1.5 rounded-lg border border-slate-200 text-sm font-bold disabled:opacity-50"
            >
              Next
            </button>
          </div>
        </div>
      )}
    </div>
  );
}
