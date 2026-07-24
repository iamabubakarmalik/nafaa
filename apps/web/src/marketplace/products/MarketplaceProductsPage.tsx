import { useMemo, useState } from 'react';
import { Link } from 'react-router-dom';
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import {
  Package, Search, Eye, EyeOff, CheckCircle2, XCircle,
  Star, TrendingUp, Filter, Grid3x3, List as ListIcon,
  Sparkles, ChevronLeft, ChevronRight, Globe, X, ArrowRight,
  Edit3, Layers, Info,
} from 'lucide-react';
import { toast } from 'sonner';
import { productPublishingApi, type ListMktProductsParams } from '../shared/marketplace.api';
import { getIndustryTheme } from '../shared/industry-themes';
import { useCurrentIndustry } from '@industries/_shared/registry/useCurrentIndustry';
import { formatPKR } from '@core/lib/format';
import { Button } from '@core/ui/Button';
import type { MarketplaceProductProfile } from '../shared/types';

type Filter = 'all' | 'listed' | 'unlisted';

export default function MarketplaceProductsPage() {
  const qc = useQueryClient();
  const industry = useCurrentIndustry();
  const theme = getIndustryTheme(industry?.id);

  const [params, setParams] = useState<ListMktProductsParams>({
    search: '',
    page: 1,
    limit: 24,
    sortBy: 'listed',
  });
  const [filter, setFilter] = useState<Filter>('all');
  const [viewMode, setViewMode] = useState<'grid' | 'list'>('grid');
  const [selected, setSelected] = useState<Set<string>>(new Set());

  const effectiveParams = useMemo<ListMktProductsParams>(() => ({
    ...params,
    isListedOnMarketplace: filter === 'listed' ? true : filter === 'unlisted' ? false : undefined,
  }), [params, filter]);

  const { data } = useQuery({
    queryKey: ['marketplace-products', effectiveParams],
    queryFn: () => productPublishingApi.list(effectiveParams),
  });

  const publishMutation = useMutation({
    mutationFn: (productId: string) => productPublishingApi.publish(productId),
    onSuccess: () => {
      toast.success('Product publish ho gayi ✓');
      qc.invalidateQueries({ queryKey: ['marketplace-products'] });
    },
    onError: (e: any) => toast.error(e?.response?.data?.message || 'Publish fail'),
  });

  const unpublishMutation = useMutation({
    mutationFn: (productId: string) => productPublishingApi.unpublish(productId),
    onSuccess: () => {
      toast.success('Product unpublish ho gayi');
      qc.invalidateQueries({ queryKey: ['marketplace-products'] });
    },
  });

  const bulkPublishMutation = useMutation({
    mutationFn: () => productPublishingApi.bulkPublish(Array.from(selected)),
    onSuccess: (res) => {
      toast.success(`${res.count} products publish ho gaye`);
      setSelected(new Set());
      qc.invalidateQueries({ queryKey: ['marketplace-products'] });
    },
  });

  const bulkUnpublishMutation = useMutation({
    mutationFn: () => productPublishingApi.bulkUnpublish(Array.from(selected)),
    onSuccess: (res) => {
      toast.success(`${res.count} products unpublish ho gaye`);
      setSelected(new Set());
      qc.invalidateQueries({ queryKey: ['marketplace-products'] });
    },
  });

  const items = data?.items || [];
  const counts = data?.counts || { listed: 0, unlisted: 0, total: 0 };

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
      setSelected(new Set(items.map((p) => p.productId)));
    }
  };

  return (
    <div className="space-y-5 pb-10">
      {/* HERO */}
      <section className={`relative overflow-hidden rounded-3xl bg-gradient-to-br ${theme.gradient} text-white p-6 shadow-2xl`}>
        <div className="absolute -top-20 -right-20 h-64 w-64 rounded-full bg-white/10 blur-3xl" />
        <div className="absolute -bottom-20 -left-20 h-64 w-64 rounded-full bg-amber-400/15 blur-3xl" />

        <div className="relative flex items-center justify-between gap-4 flex-wrap">
          <div className="min-w-0">
            <div className="inline-flex items-center gap-2 rounded-full bg-white/15 backdrop-blur px-3 py-1 text-xs font-black border border-white/20">
              <span>{theme.emoji}</span> Marketplace Products
            </div>
            <h1 className="mt-3 text-3xl sm:text-4xl font-black leading-tight">Products on Nafaa Bazaar</h1>
            <p className="mt-2 text-sm text-white/85 font-medium">
              Apne POS products ko marketplace pe list karein — {counts.listed}/{counts.total} listed
            </p>
          </div>

          <div className="flex gap-2 flex-wrap">
            <Link to="/products">
              <Button variant="secondary" className="bg-white/15 backdrop-blur text-white hover:bg-white/25 border-white/20">
                <Package className="h-4 w-4" /> All Products
              </Button>
            </Link>
          </div>
        </div>

        {/* KPIs */}
        <div className="relative grid grid-cols-3 gap-3 mt-6">
          <HeroKpi label="Total Products" value={counts.total} icon={Package} />
          <HeroKpi label="Listed" value={counts.listed} icon={Globe} highlight />
          <HeroKpi label="Not Listed" value={counts.unlisted} icon={EyeOff} />
        </div>
      </section>

      {/* Filter tabs */}
      <div className="flex items-center gap-2 flex-wrap">
        <FilterTab
          active={filter === 'all'}
          onClick={() => { setFilter('all'); setParams({ ...params, page: 1 }); }}
          theme={theme}
          count={counts.total}
        >
          All Products
        </FilterTab>
        <FilterTab
          active={filter === 'listed'}
          onClick={() => { setFilter('listed'); setParams({ ...params, page: 1 }); }}
          theme={theme}
          count={counts.listed}
          color="emerald"
        >
          <Globe className="h-3.5 w-3.5" />
          Listed
        </FilterTab>
        <FilterTab
          active={filter === 'unlisted'}
          onClick={() => { setFilter('unlisted'); setParams({ ...params, page: 1 }); }}
          theme={theme}
          count={counts.unlisted}
          color="slate"
        >
          <EyeOff className="h-3.5 w-3.5" />
          Not Listed
        </FilterTab>
      </div>

      {/* Search + controls */}
      <div className="rounded-3xl bg-white border-2 border-slate-200 shadow-sm p-4 flex gap-2 flex-wrap items-center">
        <div className="flex-1 min-w-[240px] relative">
          <Search className="h-4 w-4 text-slate-400 absolute left-3 top-1/2 -translate-y-1/2" />
          <input
            className="h-11 w-full rounded-xl border-2 border-slate-200 bg-white pl-10 pr-10 text-sm font-semibold outline-none focus:border-emerald-500 transition"
            placeholder="Search products..."
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
          value={params.sortBy || 'listed'}
          onChange={(e) => setParams({ ...params, sortBy: e.target.value as any })}
          className="h-11 rounded-xl border-2 border-slate-200 bg-white px-3 text-xs font-extrabold outline-none"
        >
          <option value="listed">Recently Listed</option>
          <option value="name">Name A-Z</option>
          <option value="price_asc">Price ↑</option>
          <option value="price_desc">Price ↓</option>
          <option value="sold">Best Selling</option>
          <option value="rating">Top Rated</option>
        </select>

        <div className="inline-flex rounded-xl border-2 border-slate-200 bg-white overflow-hidden">
          <button
            onClick={() => setViewMode('grid')}
            className={`px-3 h-11 text-xs font-extrabold transition ${
              viewMode === 'grid' ? 'text-white' : 'text-slate-700 hover:bg-slate-50'
            }`}
            style={viewMode === 'grid' ? { backgroundColor: theme.accentHex } : undefined}
          >
            <Grid3x3 className="h-4 w-4" />
          </button>
          <button
            onClick={() => setViewMode('list')}
            className={`px-3 h-11 text-xs font-extrabold transition border-l-2 border-slate-200 ${
              viewMode === 'list' ? 'text-white' : 'text-slate-700 hover:bg-slate-50'
            }`}
            style={viewMode === 'list' ? { backgroundColor: theme.accentHex } : undefined}
          >
            <ListIcon className="h-4 w-4" />
          </button>
        </div>
      </div>

      {/* Bulk bar */}
      {selected.size > 0 && (
        <div className="sticky top-2 z-30 rounded-2xl bg-gradient-to-r from-amber-500 to-orange-600 border-2 border-amber-300 p-3 flex items-center justify-between gap-3 flex-wrap shadow-xl">
          <div className="flex items-center gap-3">
            <div className="h-10 w-10 rounded-xl bg-white/20 backdrop-blur flex items-center justify-center text-white font-extrabold">
              {selected.size}
            </div>
            <div className="text-white">
              <div className="font-black text-sm">{selected.size} selected</div>
              <button onClick={toggleSelectAll} className="text-[10px] font-bold underline hover:text-amber-100">
                {selected.size === items.length ? 'Deselect all' : `Select all ${items.length}`}
              </button>
            </div>
          </div>
          <div className="flex gap-2 flex-wrap">
            <button
              onClick={() => bulkPublishMutation.mutate()}
              disabled={bulkPublishMutation.isPending}
              className="h-9 px-3 rounded-lg bg-emerald-600 hover:bg-emerald-700 text-white text-xs font-black inline-flex items-center gap-1 shadow-md"
            >
              <Globe className="h-3.5 w-3.5" /> Publish All
            </button>
            <button
              onClick={() => bulkUnpublishMutation.mutate()}
              disabled={bulkUnpublishMutation.isPending}
              className="h-9 px-3 rounded-lg bg-slate-700 hover:bg-slate-800 text-white text-xs font-black inline-flex items-center gap-1 shadow-md"
            >
              <EyeOff className="h-3.5 w-3.5" /> Unpublish All
            </button>
            <button
              onClick={() => setSelected(new Set())}
              className="h-9 px-3 rounded-lg bg-white/20 backdrop-blur hover:bg-white/30 text-white text-xs font-black border border-white/30"
            >
              Clear
            </button>
          </div>
        </div>
      )}

      {/* Products */}
      {items.length === 0 ? (
        <div className="rounded-3xl bg-white border-2 border-dashed border-slate-200 p-16 text-center">
          <div
            className="h-20 w-20 rounded-3xl mx-auto flex items-center justify-center shadow-inner mb-4"
            style={{ background: `linear-gradient(135deg, ${theme.accentHex}20, ${theme.accentHex}40)` }}
          >
            <Package className="h-10 w-10" style={{ color: theme.accentHex }} />
          </div>
          <h3 className="text-xl font-black text-slate-900">No products found</h3>
          <p className="text-sm text-slate-500 mt-1">
            {filter === 'unlisted'
              ? 'All aap ke products marketplace pe listed hain!'
              : filter === 'listed'
                ? 'Abhi tak koi product marketplace pe list nahi ki'
                : 'Pehle POS mein products add karein'}
          </p>
          {filter === 'listed' && (
            <button
              onClick={() => setFilter('unlisted')}
              className="mt-4 inline-flex items-center gap-1 text-sm font-black text-emerald-600 hover:text-emerald-700"
            >
              Not-listed products dekhein <ArrowRight className="h-4 w-4" />
            </button>
          )}
        </div>
      ) : items.length === 0 && filter === 'listed' && counts.total > 0 ? (
        <div className="rounded-3xl border-2 border-dashed border-amber-300 bg-amber-50 p-16 text-center">
          <div className="h-20 w-20 rounded-3xl mx-auto flex items-center justify-center shadow-inner mb-4 bg-amber-100">
            <Package className="h-10 w-10 text-amber-700" />
          </div>
          <h3 className="text-xl font-black text-amber-900">Abhi tak koi product marketplace pe list nahi ki</h3>
          <p className="text-sm text-amber-700 mt-1 font-medium">
            Aap ke POS mein <strong>{counts.total} products</strong> hain — un mein se publish karne ke liye "Not Listed" tab dekhein
          </p>
          <button
            onClick={() => setFilter('unlisted')}
            className="mt-4 inline-flex items-center gap-1 px-4 py-2 rounded-xl bg-amber-600 hover:bg-amber-700 text-white text-sm font-black transition"
          >
            Not-listed products dekhein <ArrowRight className="h-4 w-4" />
          </button>
        </div>
      ) : viewMode === 'grid' ? (
        <div className="grid sm:grid-cols-2 md:grid-cols-3 lg:grid-cols-4 xl:grid-cols-5 gap-4">
          {items.map((p) => (
            <ProductGridCard
              key={p.productId}
              product={p}
              theme={theme}
              isSelected={selected.has(p.productId)}
              onSelect={() => toggleSelect(p.productId)}
              onPublish={() => publishMutation.mutate(p.productId)}
              onUnpublish={() => unpublishMutation.mutate(p.productId)}
              isPending={publishMutation.isPending || unpublishMutation.isPending}
            />
          ))}
        </div>
      ) : (
        <ProductListView
          items={items}
          selected={selected}
          onToggleSelect={toggleSelect}
          onToggleSelectAll={toggleSelectAll}
          onPublish={(id: string) => publishMutation.mutate(id)}
          onUnpublish={(id: string) => unpublishMutation.mutate(id)}
          theme={theme}
        />
      )}

      {/* Pagination */}
      {data && data.meta.totalPages > 1 && (
        <div className="rounded-2xl bg-white border-2 border-slate-200 p-4 flex items-center justify-between flex-wrap gap-3 shadow-sm">
          <div className="text-sm text-slate-600 font-bold">
            Page <span className="text-slate-900">{data.meta.page}</span> of{' '}
            <span className="text-slate-900">{data.meta.totalPages}</span>
          </div>
          <div className="flex gap-2">
            <button
              disabled={params.page === 1}
              onClick={() => setParams({ ...params, page: (params.page ?? 1) - 1 })}
              className="h-9 px-3 rounded-lg border-2 border-slate-200 text-xs font-black disabled:opacity-40 hover:bg-slate-50 inline-flex items-center gap-1"
            >
              <ChevronLeft className="h-3.5 w-3.5" /> Previous
            </button>
            <button
              disabled={(params.page ?? 1) >= data.meta.totalPages}
              onClick={() => setParams({ ...params, page: (params.page ?? 1) + 1 })}
              className="h-9 px-3 rounded-lg text-white text-xs font-black disabled:opacity-40 inline-flex items-center gap-1"
              style={{ backgroundColor: theme.accentHex }}
            >
              Next <ChevronRight className="h-3.5 w-3.5" />
            </button>
          </div>
        </div>
      )}
    </div>
  );
}

// ─── Sub-components ─────────────────────────────────────────

function HeroKpi({ label, value, sub, icon: Icon, highlight }: any) {
  return (
    <div className={`rounded-2xl backdrop-blur border p-3 ${
      highlight ? 'bg-emerald-500/25 border-emerald-300/40' : 'bg-white/10 border-white/20'
    }`}>
      <div className="flex items-center gap-1.5 mb-1.5">
        <Icon className="h-3 w-3 opacity-80" />
        <div className="text-[9px] uppercase tracking-wider font-black opacity-90">{label}</div>
      </div>
      <div className="text-xl font-black leading-none tabular-nums">{value}</div>
      {sub && <div className="text-[10px] font-bold opacity-75 mt-0.5">{sub}</div>}
    </div>
  );
}

function FilterTab({ active, onClick, theme, count, color = 'slate', children }: any) {
  return (
    <button
      onClick={onClick}
      className={`px-4 py-2 rounded-xl text-sm font-black inline-flex items-center gap-2 transition border-2 ${
        active
          ? color === 'emerald'
            ? 'bg-emerald-600 text-white border-emerald-600 shadow'
            : color === 'slate'
              ? 'bg-slate-800 text-white border-slate-800 shadow'
              : 'text-white shadow'
          : 'bg-white text-slate-700 border-slate-200 hover:border-slate-300'
      }`}
      style={active && color !== 'emerald' && color !== 'slate' ? { backgroundColor: theme.accentHex, borderColor: theme.accentHex } : undefined}
    >
      {children}
      <span className={`px-1.5 py-0.5 rounded-full text-[9px] font-black ${
        active ? 'bg-white/20 text-white' : 'bg-slate-100 text-slate-700'
      }`}>
        {count}
      </span>
    </button>
  );
}

function ProductGridCard({ product: p, theme, isSelected, onSelect, onPublish, onUnpublish, isPending }: any) {
  const primaryImage = p.publicImages?.[0];
  const isListed = p.isListedOnMarketplace;

  return (
    <div
      className={`group relative rounded-2xl bg-white border-2 overflow-hidden hover:shadow-xl hover:-translate-y-0.5 transition-all ${
        isSelected ? 'ring-2 border-emerald-500' : 'border-slate-200 hover:border-slate-300'
      }`}
    >
      {/* Industry ribbon */}
      <div className={`absolute top-0 left-0 z-10 px-2 py-0.5 rounded-br-lg bg-gradient-to-r ${theme.ribbon} text-white text-[9px] font-black uppercase tracking-wider shadow`}>
        <span className="mr-1">{theme.emoji}</span>{theme.label}
      </div>

      {/* Select */}
      <button
        onClick={onSelect}
        className={`absolute top-2 right-2 z-20 h-6 w-6 rounded-md border-2 flex items-center justify-center transition shadow-sm ${
          isSelected ? 'bg-emerald-600 text-white border-emerald-600' : 'bg-white border-slate-300 opacity-0 group-hover:opacity-100'
        }`}
      >
        {isSelected && (
          <svg className="h-3.5 w-3.5" viewBox="0 0 20 20" fill="currentColor">
            <path d="M16.7 5.3a1 1 0 010 1.4l-7 7a1 1 0 01-1.4 0l-3-3a1 1 0 111.4-1.4L9 11.6l6.3-6.3a1 1 0 011.4 0z" />
          </svg>
        )}
      </button>

      {/* Listed badge */}
      {isListed && (
        <div className="absolute top-9 right-2 z-10 h-6 px-1.5 rounded-full bg-emerald-500 text-white flex items-center gap-1 shadow-md">
          <Globe className="h-2.5 w-2.5" />
          <span className="text-[9px] font-black">LIVE</span>
        </div>
      )}

      {/* Image */}
      <div className="aspect-square bg-slate-100 overflow-hidden relative">
        {primaryImage ? (
          <img src={primaryImage} alt={p.publicName} className="w-full h-full object-cover group-hover:scale-110 transition-transform duration-500" />
        ) : (
          <div className="w-full h-full flex items-center justify-center bg-gradient-to-br from-slate-100 to-slate-200">
            <Package className="h-10 w-10 text-slate-400" />
          </div>
        )}
        {!isListed && (
          <div className="absolute inset-0 bg-slate-900/40 backdrop-blur-[1px] flex items-center justify-center">
            <span className="px-2 py-1 rounded-md bg-slate-900 text-white text-[10px] font-black uppercase tracking-wider">
              Not Listed
            </span>
          </div>
        )}
      </div>

      {/* Body */}
      <div className="p-3 space-y-1.5">
        <h3 className="font-black text-slate-900 line-clamp-2 leading-tight text-sm">{p.publicName}</h3>

        {/* Category */}
        {p.marketplaceCategory && (
          <div className="text-[10px] font-bold text-slate-500">{p.marketplaceCategory}</div>
        )}

        {/* Price */}
        <div className="flex items-center justify-between pt-1">
          <div className="font-black tabular-nums" style={{ color: theme.accentHex }}>
            Rs {formatPKR(p.publicPrice)}
          </div>
          {p.compareAtPrice && p.compareAtPrice > p.publicPrice && (
            <div className="text-[10px] font-bold text-slate-400 line-through">
              Rs {formatPKR(p.compareAtPrice)}
            </div>
          )}
        </div>

        {/* Stats */}
        <div className="flex items-center gap-2 flex-wrap pt-1">
          {p.ratingCount > 0 && (
            <span className="inline-flex items-center gap-0.5 text-[10px] font-bold text-amber-700 bg-amber-50 px-2 py-0.5 rounded-full">
              <Star className="h-2.5 w-2.5 fill-current" />
              {p.ratingAverage.toFixed(1)} ({p.ratingCount})
            </span>
          )}
          {p.totalSold > 0 && (
            <span className="inline-flex items-center gap-0.5 text-[10px] font-bold text-emerald-700 bg-emerald-50 px-2 py-0.5 rounded-full">
              <TrendingUp className="h-2.5 w-2.5" />
              {p.totalSold} sold
            </span>
          )}
        </div>

        {/* Special features */}
        <div className="flex gap-1 flex-wrap">
          {p.bargainEnabled && (
            <span className="text-[9px] font-black px-1.5 py-0.5 rounded bg-purple-100 text-purple-700">💰</span>
          )}
          {p.groupBuyEnabled && (
            <span className="text-[9px] font-black px-1.5 py-0.5 rounded bg-orange-100 text-orange-700">👥</span>
          )}
        </div>

        {/* Actions */}
        <div className="flex gap-1 pt-2">
          {isListed ? (
            <button
              onClick={onUnpublish}
              disabled={isPending}
              className="flex-1 h-8 rounded-lg bg-slate-100 hover:bg-slate-200 text-slate-700 text-[10px] font-black inline-flex items-center justify-center gap-1 transition"
            >
              <EyeOff className="h-3 w-3" /> Unpublish
            </button>
          ) : (
            <button
              onClick={onPublish}
              disabled={isPending}
              className="flex-1 h-8 rounded-lg text-white text-[10px] font-black inline-flex items-center justify-center gap-1 shadow-sm transition"
              style={{ backgroundColor: theme.accentHex }}
            >
              <Globe className="h-3 w-3" /> Publish
            </button>
          )}
          <Link
            to={`/marketplace/products/${p.productId}`}
            title="View & edit details"
            className="px-2 h-8 rounded-lg bg-blue-50 hover:bg-blue-100 text-blue-700 inline-flex items-center justify-center gap-1 transition text-[10px] font-black"
          >
            <Info className="h-3 w-3" />
            Details
          </Link>
        </div>
      </div>
    </div>
  );
}

function ProductListView({ items, selected, onToggleSelect, onToggleSelectAll, onPublish, onUnpublish, theme }: any) {
  return (
    <div className="rounded-3xl bg-white border-2 border-slate-200 shadow-sm overflow-hidden">
      <div className="overflow-x-auto">
        <table className="w-full text-sm">
          <thead className="bg-slate-50 border-b-2 border-slate-200">
            <tr>
              <th className="px-3 py-3 text-left w-10">
                <input
                  type="checkbox"
                  checked={selected.size === items.length && items.length > 0}
                  onChange={onToggleSelectAll}
                  className="h-4 w-4 rounded border-2 border-slate-300"
                />
              </th>
              <th className="px-3 py-3 text-left text-[10px] font-black uppercase tracking-wider text-slate-700">Product</th>
              <th className="px-3 py-3 text-left text-[10px] font-black uppercase tracking-wider text-slate-700">Category</th>
              <th className="px-3 py-3 text-right text-[10px] font-black uppercase tracking-wider text-slate-700">Price</th>
              <th className="px-3 py-3 text-center text-[10px] font-black uppercase tracking-wider text-slate-700">Sold</th>
              <th className="px-3 py-3 text-center text-[10px] font-black uppercase tracking-wider text-slate-700">Rating</th>
              <th className="px-3 py-3 text-center text-[10px] font-black uppercase tracking-wider text-slate-700">Status</th>
              <th className="px-3 py-3 text-right text-[10px] font-black uppercase tracking-wider text-slate-700">Actions</th>
            </tr>
          </thead>
          <tbody className="divide-y divide-slate-100">
            {items.map((p: MarketplaceProductProfile) => (
              <tr key={p.productId} className={`hover:bg-slate-50 transition ${selected.has(p.productId) ? 'bg-slate-50' : ''}`}>
                <td className="px-3 py-3">
                  <input
                    type="checkbox"
                    checked={selected.has(p.productId)}
                    onChange={() => onToggleSelect(p.productId)}
                    className="h-4 w-4 rounded border-2 border-slate-300"
                  />
                </td>
                <td className="px-3 py-3">
                  <div className="flex items-center gap-3">
                    <div className="h-10 w-10 rounded-lg bg-slate-100 overflow-hidden shrink-0">
                      {p.publicImages?.[0] ? (
                        <img src={p.publicImages[0]} alt={p.publicName} className="w-full h-full object-cover" />
                      ) : (
                        <div className="w-full h-full flex items-center justify-center text-slate-400">
                          <Package className="h-5 w-5" />
                        </div>
                      )}
                    </div>
                    <div className="min-w-0">
                      <Link to={`/marketplace/products/${p.productId}`} className="font-black text-slate-900 text-sm truncate block hover:opacity-70">
                        {p.publicName}
                      </Link>
                    </div>
                  </div>
                </td>
                <td className="px-3 py-3 text-xs font-bold text-slate-700">
                  {p.marketplaceCategory || <span className="text-slate-400">—</span>}
                </td>
                <td className="px-3 py-3 text-right">
                  <div className="font-black text-sm tabular-nums" style={{ color: theme.accentHex }}>
                    Rs {formatPKR(p.publicPrice)}
                  </div>
                </td>
                <td className="px-3 py-3 text-center text-xs font-black">{p.totalSold}</td>
                <td className="px-3 py-3 text-center">
                  {p.ratingCount > 0 ? (
                    <span className="inline-flex items-center gap-0.5 text-xs font-black text-amber-700">
                      <Star className="h-3 w-3 fill-current" />
                      {p.ratingAverage.toFixed(1)}
                    </span>
                  ) : (
                    <span className="text-slate-400">—</span>
                  )}
                </td>
                <td className="px-3 py-3 text-center">
                  {p.isListedOnMarketplace ? (
                    <span className="px-2 py-0.5 rounded-full bg-emerald-100 text-emerald-700 text-[9px] font-black inline-flex items-center gap-1">
                      <Globe className="h-2.5 w-2.5" /> LIVE
                    </span>
                  ) : (
                    <span className="px-2 py-0.5 rounded-full bg-slate-100 text-slate-700 text-[9px] font-black">
                      NOT LISTED
                    </span>
                  )}
                </td>
                <td className="px-3 py-3">
                  <div className="flex items-center justify-end gap-1">
                    {p.isListedOnMarketplace ? (
                      <button
                        onClick={() => onUnpublish(p.productId)}
                        className="px-2 h-7 rounded-lg bg-slate-100 hover:bg-slate-200 text-slate-700 text-[10px] font-black"
                      >
                        Unpublish
                      </button>
                    ) : (
                      <button
                        onClick={() => onPublish(p.productId)}
                        className="px-2 h-7 rounded-lg text-white text-[10px] font-black"
                        style={{ backgroundColor: theme.accentHex }}
                      >
                        Publish
                      </button>
                    )}
                    <Link
                      to={`/marketplace/products/${p.productId}`}
                      title="View details & edit"
                      className="h-7 px-2 rounded-lg bg-blue-50 hover:bg-blue-100 text-blue-700 inline-flex items-center gap-1 text-[10px] font-black"
                    >
                      <Info className="h-3 w-3" />
                      Details
                    </Link>
                  </div>
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </div>
  );
}
