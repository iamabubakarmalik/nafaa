import { useState, useMemo } from 'react';
import { Link } from 'react-router-dom';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import {
  Layers, Plus, Search, X, Edit3, Trash2, Star, StarOff,
  RefreshCw, Sparkles, Package, Percent, TrendingUp,
  Copy, Eye, Award,
} from 'lucide-react';
import { toast } from 'sonner';
import { electronicsBundlesApi } from '../api/bundles.api';
import { formatPKR } from '@core/lib/format';
import { Button } from '@core/ui/Button';

export default function ElectronicsBundlesPage() {
  const qc = useQueryClient();
  const [search, setSearch] = useState('');
  const [featuredOnly, setFeaturedOnly] = useState(false);
  const [activeOnly, setActiveOnly] = useState(true);

  const { data: bundles = [], isLoading, refetch, isRefetching } = useQuery({
    queryKey: ['electronics-bundles-list', featuredOnly, activeOnly],
    queryFn: () => electronicsBundlesApi.list({
      featured: featuredOnly ? true : undefined,
      active: activeOnly ? true : undefined,
    }),
  });

  const filtered = useMemo(() => {
    const q = search.toLowerCase().trim();
    if (!q) return bundles;
    return bundles.filter((b) => b.name.toLowerCase().includes(q));
  }, [bundles, search]);

  const stats = useMemo(() => ({
    total: bundles.length,
    featured: bundles.filter((b) => b.isFeatured).length,
    totalSold: bundles.reduce((s, b) => s + Number(b.soldCount || 0), 0),
    totalRevenue: bundles.reduce((s, b) => s + Number(b.totalRevenue || 0), 0),
    avgSavings: bundles.length > 0
      ? bundles.reduce((s, b) => s + Number(b.savingsPct || 0), 0) / bundles.length
      : 0,
  }), [bundles]);

  const remove = useMutation({
    mutationFn: (id: string) => electronicsBundlesApi.remove(id),
    onSuccess: () => {
      toast.success('Bundle deleted');
      qc.invalidateQueries({ queryKey: ['electronics-bundles-list'] });
    },
  });

  const duplicate = useMutation({
    mutationFn: async (bundle: any) => {
      return electronicsBundlesApi.create({
        name: `${bundle.name} (Copy)`,
        description: bundle.description,
        imageUrl: bundle.imageUrl,
        items: bundle.items.map((it: any) => ({
          productId: it.productId,
          quantity: it.quantity,
          unitPrice: it.unitPrice,
        })),
        originalPrice: bundle.originalPrice,
        bundlePrice: bundle.bundlePrice,
        savings: bundle.savings,
        savingsPct: bundle.savingsPct,
        isActive: false,
        isFeatured: false,
      });
    },
    onSuccess: () => {
      toast.success('Bundle duplicated');
      qc.invalidateQueries({ queryKey: ['electronics-bundles-list'] });
    },
  });

  return (
    <div className="space-y-5">
      {/* HERO */}
      <section className="relative overflow-hidden rounded-3xl bg-gradient-to-br from-slate-950 via-pink-900 to-rose-700 text-white p-6 shadow-2xl">
        <div className="absolute -top-20 -right-20 h-64 w-64 rounded-full bg-pink-400/20 blur-3xl" />
        <div className="relative flex items-start justify-between gap-4 flex-wrap">
          <div>
            <div className="inline-flex items-center gap-2 rounded-full bg-white/15 backdrop-blur px-3 py-1 text-xs font-extrabold border border-white/20">
              <Layers className="h-3.5 w-3.5 text-amber-300" /> Electronics Bundles
            </div>
            <h1 className="mt-3 text-3xl sm:text-4xl font-extrabold leading-tight">🎁 Bundle Deals</h1>
            <p className="mt-2 text-sm text-white/80">
              {stats.total} bundles • {stats.totalSold} sold • Revenue{' '}
              <strong className="text-emerald-300">{formatPKR(stats.totalRevenue)}</strong>
            </p>
          </div>
          <div className="flex gap-2 flex-wrap">
            <button onClick={() => refetch()} disabled={isRefetching}
              className="inline-flex items-center gap-2 rounded-xl bg-white/10 hover:bg-white/20 px-4 py-2.5 text-sm font-bold">
              <RefreshCw className={`h-4 w-4 ${isRefetching ? 'animate-spin' : ''}`} /> Refresh
            </button>
            <Link to="/electronics/bundles/new">
              <Button className="bg-white text-slate-900 hover:bg-slate-100">
                <Plus className="h-4 w-4" /> New Bundle
              </Button>
            </Link>
          </div>
        </div>
      </section>

      {/* KPIs */}
      <section className="grid grid-cols-2 lg:grid-cols-4 gap-3">
        <Kpi icon={Layers} label="Total Bundles" value={stats.total} sub={`${stats.featured} featured`} tone="pink" />
        <Kpi icon={TrendingUp} label="Sold" value={stats.totalSold} sub="Total units sold" tone="emerald" />
        <Kpi icon={Award} label="Revenue" value={formatPKR(stats.totalRevenue)} sub="From bundles" tone="blue" />
        <Kpi icon={Percent} label="Avg Savings" value={`${stats.avgSavings.toFixed(1)}%`} sub="Customer bachat" tone="amber" />
      </section>

      {/* TOOLBAR */}
      <section className="rounded-3xl bg-white border-2 border-slate-200 shadow-sm p-4 space-y-3">
        <div className="relative">
          <Search className="h-5 w-5 text-slate-400 absolute left-3.5 top-1/2 -translate-y-1/2" />
          <input value={search} onChange={(e) => setSearch(e.target.value)}
            placeholder="Bundle name..."
            className="h-12 w-full rounded-2xl border-2 border-slate-200 bg-white pl-11 pr-10 text-sm font-semibold focus:outline-none focus:border-pink-500 focus:ring-2 focus:ring-pink-200" />
          {search && (
            <button onClick={() => setSearch('')} className="absolute right-3 top-1/2 -translate-y-1/2 h-7 w-7 rounded-lg hover:bg-slate-100 flex items-center justify-center">
              <X className="h-4 w-4" />
            </button>
          )}
        </div>

        <div className="flex gap-2 flex-wrap items-center">
          <button onClick={() => setFeaturedOnly(!featuredOnly)}
            className={['h-10 px-3 rounded-xl border-2 text-xs font-extrabold inline-flex items-center gap-1.5 transition',
              featuredOnly ? 'border-amber-500 bg-amber-50 text-amber-700' : 'border-slate-200 bg-white text-slate-700'].join(' ')}>
            <Star className={`h-3.5 w-3.5 ${featuredOnly ? 'fill-current' : ''}`} /> Featured Only
          </button>
          <button onClick={() => setActiveOnly(!activeOnly)}
            className={['h-10 px-3 rounded-xl border-2 text-xs font-extrabold inline-flex items-center gap-1.5 transition',
              activeOnly ? 'border-emerald-500 bg-emerald-50 text-emerald-700' : 'border-slate-200 bg-white text-slate-700'].join(' ')}>
            Active Only
          </button>
          <div className="ml-auto text-xs font-extrabold text-slate-500">{filtered.length} bundles</div>
        </div>
      </section>

      {/* CONTENT */}
      {isLoading ? (
        <div className="grid sm:grid-cols-2 lg:grid-cols-3 gap-4">
          {Array.from({ length: 6 }).map((_, i) => <div key={i} className="h-80 rounded-2xl bg-slate-100 animate-pulse" />)}
        </div>
      ) : filtered.length === 0 ? (
        <div className="rounded-3xl bg-white border-2 border-dashed border-slate-300 p-16 text-center">
          <div className="mx-auto h-20 w-20 rounded-3xl bg-gradient-to-br from-pink-100 to-rose-200 flex items-center justify-center">
            <Layers className="h-10 w-10 text-pink-600" />
          </div>
          <h3 className="mt-4 text-lg font-extrabold text-slate-900">No bundles yet</h3>
          <p className="text-sm text-slate-500 mt-2 font-semibold">Create bundles jaise "Phone + Case + Charger" combo deals</p>
          <Link to="/electronics/bundles/new">
            <Button className="mt-4 bg-gradient-to-r from-pink-600 to-rose-700">
              <Plus className="h-4 w-4" /> Create First Bundle
            </Button>
          </Link>
        </div>
      ) : (
        <section className="grid sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-3">
          {filtered.map((b) => <BundleCard key={b.id} bundle={b}
            onDuplicate={() => duplicate.mutate(b)}
            onDelete={() => { if (confirm(`Delete "${b.name}"?`)) remove.mutate(b.id); }} />)}
        </section>
      )}
    </div>
  );
}

function BundleCard({ bundle: b, onDuplicate, onDelete }: any) {
  return (
    <div className={['group relative rounded-2xl bg-white border-2 shadow-sm hover:shadow-xl hover:-translate-y-0.5 transition overflow-hidden',
      b.isFeatured ? 'border-amber-400 ring-2 ring-amber-100' : 'border-slate-200'].join(' ')}>

      <div className="relative aspect-video bg-gradient-to-br from-pink-500 via-rose-600 to-red-600 overflow-hidden">
        {b.imageUrl ? (
          <img src={b.imageUrl} alt={b.name} className="w-full h-full object-cover group-hover:scale-105 transition-transform duration-300" />
        ) : (
          <div className="w-full h-full flex items-center justify-center">
            <Layers className="h-16 w-16 text-white/40" />
          </div>
        )}
        {b.savingsPct > 0 && (
          <div className="absolute bottom-2 left-2 px-2.5 py-1 rounded-full bg-emerald-500 text-white text-xs font-extrabold shadow-lg">
            SAVE {Number(b.savingsPct).toFixed(0)}%
          </div>
        )}
        {b.isFeatured && (
          <div className="absolute top-2 right-2 h-8 w-8 rounded-lg bg-amber-500 flex items-center justify-center shadow">
            <Star className="h-4 w-4 fill-white text-white" />
          </div>
        )}
      </div>

      <div className="p-3 space-y-2.5">
        <h3 className="font-extrabold text-slate-900 text-sm truncate">{b.name}</h3>
        {b.description && <p className="text-xs text-slate-500 font-semibold line-clamp-2">{b.description}</p>}

        <div className="rounded-xl bg-slate-50 border border-slate-100 p-2">
          <div className="text-[10px] uppercase tracking-wider font-extrabold text-slate-500 mb-1">
            {b.items?.length || 0} items
          </div>
          <div className="space-y-0.5">
            {(b.items ?? []).slice(0, 2).map((item: any, i: number) => (
              <div key={i} className="flex items-center gap-1.5 text-[11px]">
                <Package className="h-2.5 w-2.5 text-slate-400 shrink-0" />
                <span className="font-bold text-slate-700 truncate flex-1">{item.product?.name || 'Product'}</span>
                <span className="text-slate-500 font-bold shrink-0">× {item.quantity}</span>
              </div>
            ))}
            {(b.items?.length || 0) > 2 && (
              <div className="text-[10px] font-extrabold text-pink-700">+ {b.items.length - 2} more</div>
            )}
          </div>
        </div>

        <div className="flex items-end justify-between gap-2">
          <div>
            {b.originalPrice > b.bundlePrice && (
              <div className="text-xs text-slate-400 line-through font-bold">{formatPKR(b.originalPrice)}</div>
            )}
            <div className="text-lg font-extrabold text-emerald-700 tabular-nums leading-none">
              {formatPKR(b.bundlePrice)}
            </div>
            {b.savings > 0 && (
              <div className="text-[10px] font-extrabold text-amber-700 mt-0.5">
                Save {formatPKR(b.savings)}
              </div>
            )}
          </div>
          <div className="text-right">
            <div className="text-[10px] uppercase font-extrabold text-slate-500">Sold</div>
            <div className="text-lg font-extrabold text-slate-900 tabular-nums">{b.soldCount || 0}</div>
          </div>
        </div>

        <div className="flex gap-1.5 pt-2 border-t border-slate-100">
          <Link to={`/electronics/bundles/${b.id}/edit`}
            className="flex-1 h-9 rounded-lg bg-pink-50 hover:bg-pink-100 text-pink-700 text-xs font-extrabold inline-flex items-center justify-center gap-1">
            <Edit3 className="h-3.5 w-3.5" /> Edit
          </Link>
          <button onClick={onDuplicate}
            className="h-9 w-9 rounded-lg bg-blue-50 hover:bg-blue-100 text-blue-700 flex items-center justify-center">
            <Copy className="h-3.5 w-3.5" />
          </button>
          <button onClick={onDelete}
            className="h-9 w-9 rounded-lg bg-rose-50 hover:bg-rose-100 text-rose-600 flex items-center justify-center">
            <Trash2 className="h-3.5 w-3.5" />
          </button>
        </div>
      </div>
    </div>
  );
}

function Kpi({ icon: Icon, label, value, sub, tone }: any) {
  const tones: Record<string, string> = {
    pink: 'from-pink-500 to-rose-700',
    emerald: 'from-emerald-500 to-emerald-700',
    blue: 'from-blue-500 to-blue-700',
    amber: 'from-amber-500 to-orange-600',
  };
  return (
    <div className="rounded-2xl bg-white border-2 border-slate-200 p-4 shadow-sm">
      <div className="flex items-center justify-between gap-2">
        <div className="min-w-0">
          <div className="text-[10px] uppercase tracking-wider text-slate-500 font-extrabold">{label}</div>
          <div className="mt-1.5 text-xl font-extrabold text-slate-900 tabular-nums truncate">{value}</div>
          {sub && <div className="text-[10px] text-slate-500 font-bold mt-0.5">{sub}</div>}
        </div>
        <div className={`h-11 w-11 rounded-2xl bg-gradient-to-br ${tones[tone]} text-white flex items-center justify-center shadow-lg shrink-0`}>
          <Icon className="h-5 w-5" />
        </div>
      </div>
    </div>
  );
}
