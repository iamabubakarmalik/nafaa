import { useState, useMemo } from 'react';
import { Link } from 'react-router-dom';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import {
  Gift, Plus, Search, X, Edit3, Trash2, Star, Copy,
  RefreshCw, Package, Percent, TrendingUp, Sparkles, Award,
} from 'lucide-react';
import { toast } from 'sonner';
import { toyGiftPacksApi } from '../api/gift-packs.api';
import { formatPKR } from '@core/lib/format';
import { Button } from '@core/ui/Button';

export default function ToyGiftPacksPage() {
  const qc = useQueryClient();
  const [search, setSearch] = useState('');
  const [activeOnly, setActiveOnly] = useState(true);
  const [featuredOnly, setFeaturedOnly] = useState(false);
  const [seasonalOnly, setSeasonalOnly] = useState(false);

  const { data: packs = [], isLoading, refetch, isRefetching } = useQuery({
    queryKey: ['gift-packs-list', activeOnly, featuredOnly, seasonalOnly],
    queryFn: () => toyGiftPacksApi.list({
      active: activeOnly ? true : undefined,
      featured: featuredOnly ? true : undefined,
      seasonal: seasonalOnly ? true : undefined,
    }),
  });

  const { data: summary } = useQuery({
    queryKey: ['gift-packs-summary'],
    queryFn: () => toyGiftPacksApi.summary(),
  });

  const filtered = useMemo(() => {
    const q = search.toLowerCase().trim();
    if (!q) return packs;
    return packs.filter((p) => p.name.toLowerCase().includes(q));
  }, [packs, search]);

  const remove = useMutation({
    mutationFn: (id: string) => toyGiftPacksApi.remove(id),
    onSuccess: () => {
      toast.success('Gift pack deleted');
      qc.invalidateQueries({ queryKey: ['gift-packs-list'] });
      qc.invalidateQueries({ queryKey: ['gift-packs-summary'] });
    },
  });

  const duplicate = useMutation({
    mutationFn: (id: string) => toyGiftPacksApi.duplicate(id),
    onSuccess: () => {
      toast.success('Gift pack duplicated');
      qc.invalidateQueries({ queryKey: ['gift-packs-list'] });
    },
  });

  return (
    <div className="space-y-5">
      <section className="relative overflow-hidden rounded-3xl bg-gradient-to-br from-slate-950 via-violet-900 to-purple-700 text-white p-6 shadow-2xl">
        <div className="absolute -top-20 -right-20 h-64 w-64 rounded-full bg-violet-400/20 blur-3xl" />
        <div className="relative flex items-start justify-between gap-4 flex-wrap">
          <div>
            <div className="inline-flex items-center gap-2 rounded-full bg-white/15 backdrop-blur px-3 py-1 text-xs font-extrabold border border-white/20">
              <Gift className="h-3.5 w-3.5 text-amber-300" /> Bundle Deals
            </div>
            <h1 className="mt-3 text-3xl sm:text-4xl font-extrabold leading-tight">🎁 Gift Packs</h1>
            <p className="mt-2 text-sm text-white/80">
              {summary?.total ?? 0} packs • {summary?.active ?? 0} active •{' '}
              <strong className="text-emerald-300">Avg savings {Number(summary?.avgSavingsPct || 0).toFixed(0)}%</strong>
            </p>
          </div>
          <div className="flex gap-2 flex-wrap">
            <button onClick={() => refetch()} disabled={isRefetching}
              className="inline-flex items-center gap-2 rounded-xl bg-white/10 hover:bg-white/20 px-4 py-2.5 text-sm font-bold">
              <RefreshCw className={`h-4 w-4 ${isRefetching ? 'animate-spin' : ''}`} /> Refresh
            </button>
            <Link to="/toystore/gift-packs/new">
              <Button className="bg-white text-slate-900 hover:bg-slate-100">
                <Plus className="h-4 w-4" /> New Gift Pack
              </Button>
            </Link>
          </div>
        </div>
      </section>

      {summary && (
        <section className="grid grid-cols-2 lg:grid-cols-4 gap-3">
          <StatCard label="Total Packs" value={summary.total} icon={Gift} tone="violet" />
          <StatCard label="Active" value={summary.active} icon={Package} tone="emerald" />
          <StatCard label="Total Sold" value={summary.totalSold} icon={TrendingUp} tone="pink" />
          <StatCard label="Featured" value={summary.featured} icon={Star} tone="amber" />
        </section>
      )}

      <section className="rounded-3xl bg-white border-2 border-slate-200 shadow-sm p-4 space-y-3">
        <div className="relative">
          <Search className="h-5 w-5 text-slate-400 absolute left-3.5 top-1/2 -translate-y-1/2" />
          <input value={search} onChange={(e) => setSearch(e.target.value)}
            placeholder="Search gift packs..."
            className="h-12 w-full rounded-2xl border-2 border-slate-200 bg-white pl-11 pr-10 text-sm font-semibold focus:outline-none focus:border-violet-500 focus:ring-2 focus:ring-violet-200" />
          {search && (
            <button onClick={() => setSearch('')} className="absolute right-3 top-1/2 -translate-y-1/2 h-7 w-7 rounded-lg hover:bg-slate-100 flex items-center justify-center">
              <X className="h-4 w-4" />
            </button>
          )}
        </div>

        <div className="flex gap-2 flex-wrap">
          <button onClick={() => setActiveOnly(!activeOnly)}
            className={`h-10 px-3 rounded-xl border-2 text-xs font-extrabold inline-flex items-center gap-1.5 transition ${
              activeOnly ? 'border-emerald-500 bg-emerald-50 text-emerald-700' : 'border-slate-200 bg-white text-slate-700'}`}>
            Active Only
          </button>
          <button onClick={() => setFeaturedOnly(!featuredOnly)}
            className={`h-10 px-3 rounded-xl border-2 text-xs font-extrabold inline-flex items-center gap-1.5 transition ${
              featuredOnly ? 'border-amber-500 bg-amber-50 text-amber-700' : 'border-slate-200 bg-white text-slate-700'}`}>
            <Star className="h-3.5 w-3.5" /> Featured
          </button>
          <button onClick={() => setSeasonalOnly(!seasonalOnly)}
            className={`h-10 px-3 rounded-xl border-2 text-xs font-extrabold inline-flex items-center gap-1.5 transition ${
              seasonalOnly ? 'border-rose-500 bg-rose-50 text-rose-700' : 'border-slate-200 bg-white text-slate-700'}`}>
            <Sparkles className="h-3.5 w-3.5" /> Seasonal
          </button>
          <div className="ml-auto text-xs font-extrabold text-slate-500">{filtered.length} packs</div>
        </div>
      </section>

      {isLoading ? (
        <div className="grid sm:grid-cols-2 lg:grid-cols-3 gap-3">
          {Array.from({ length: 6 }).map((_, i) => <div key={i} className="h-72 rounded-2xl bg-slate-100 animate-pulse" />)}
        </div>
      ) : filtered.length === 0 ? (
        <div className="rounded-3xl bg-white border-2 border-dashed border-slate-300 p-16 text-center">
          <Gift className="h-16 w-16 text-slate-300 mx-auto mb-3" />
          <h3 className="text-lg font-extrabold text-slate-900">No gift packs yet</h3>
          <p className="text-sm text-slate-500 font-semibold mt-1">Create bundles like "Birthday Special" or "Eid Combo"</p>
          <Link to="/toystore/gift-packs/new">
            <Button className="mt-4 bg-gradient-to-r from-violet-600 to-purple-700">
              <Plus className="h-4 w-4" /> Create First Pack
            </Button>
          </Link>
        </div>
      ) : (
        <section className="grid sm:grid-cols-2 lg:grid-cols-3 gap-3">
          {filtered.map((p) => (
            <GiftPackCard key={p.id} pack={p}
              onDuplicate={() => duplicate.mutate(p.id)}
              onDelete={() => { if (confirm(`Delete "${p.name}"?`)) remove.mutate(p.id); }} />
          ))}
        </section>
      )}
    </div>
  );
}

function GiftPackCard({ pack: p, onDuplicate, onDelete }: any) {
  return (
    <div className={`rounded-2xl bg-white border-2 shadow-sm hover:shadow-xl transition overflow-hidden ${
      p.isFeatured ? 'border-amber-300 ring-2 ring-amber-100' : 'border-slate-200 hover:border-violet-300'}`}>
      <div className="relative aspect-video bg-gradient-to-br from-violet-500 via-purple-600 to-fuchsia-600 overflow-hidden">
        {p.imageUrl ? (
          <img src={p.imageUrl} alt={p.name} className="w-full h-full object-cover" />
        ) : (
          <div className="w-full h-full flex items-center justify-center">
            <Gift className="h-16 w-16 text-white/40" />
          </div>
        )}
        <div className="absolute top-2 left-2 flex gap-1.5">
          {p.isFeatured && (
            <span className="px-2 py-0.5 rounded-full bg-amber-500 text-white text-[9px] font-extrabold uppercase inline-flex items-center gap-0.5">
              <Star className="h-2.5 w-2.5 fill-white" /> Featured
            </span>
          )}
          {p.isSeasonal && p.seasonName && (
            <span className="px-2 py-0.5 rounded-full bg-rose-500 text-white text-[9px] font-extrabold uppercase">
              {p.seasonName}
            </span>
          )}
        </div>
        {p.savingsPct > 0 && (
          <div className="absolute bottom-2 left-2 px-2.5 py-1 rounded-full bg-emerald-500 text-white text-xs font-extrabold shadow-lg">
            SAVE {Number(p.savingsPct).toFixed(0)}%
          </div>
        )}
        <div className="absolute bottom-2 right-2 px-2.5 py-1 rounded-full bg-slate-900/80 backdrop-blur text-white text-xs font-extrabold">
          {p.itemCount} items
        </div>
      </div>

      <div className="p-3 space-y-2">
        <h3 className="font-extrabold text-slate-900 text-base truncate">{p.name}</h3>
        {p.description && <p className="text-xs text-slate-500 font-semibold line-clamp-2">{p.description}</p>}

        {p.computed && (
          <div className={`rounded-lg p-2 text-center ${
            p.computed.allInStock ? 'bg-emerald-50 border border-emerald-200' : 'bg-amber-50 border border-amber-200'}`}>
            <div className={`text-[10px] uppercase font-extrabold ${p.computed.allInStock ? 'text-emerald-700' : 'text-amber-700'}`}>
              {p.computed.allInStock ? '✓ Ready to build' : '⚠ Missing stock'}
            </div>
            <div className={`text-sm font-extrabold ${p.computed.allInStock ? 'text-emerald-900' : 'text-amber-900'}`}>
              {p.computed.buildableUnits} buildable units
            </div>
          </div>
        )}

        <div className="flex items-end justify-between gap-2 pt-2 border-t border-slate-100">
          <div>
            {p.originalPrice > p.giftPackPrice && (
              <div className="text-[10px] text-slate-400 line-through font-bold">{formatPKR(p.originalPrice)}</div>
            )}
            <div className="text-xl font-extrabold text-emerald-700 tabular-nums leading-none">{formatPKR(p.giftPackPrice)}</div>
            {p.savings > 0 && (
              <div className="text-[10px] font-extrabold text-amber-700 mt-0.5">Save {formatPKR(p.savings)}</div>
            )}
          </div>
          <div className="text-right">
            <div className="text-[10px] uppercase font-extrabold text-slate-500">Sold</div>
            <div className="text-lg font-extrabold text-slate-900 tabular-nums">{p.totalSold || 0}</div>
          </div>
        </div>

        <div className="flex gap-1.5">
          <Link to={`/toystore/gift-packs/${p.id}/edit`}
            className="flex-1 h-9 rounded-lg bg-violet-50 hover:bg-violet-100 text-violet-700 text-xs font-extrabold inline-flex items-center justify-center gap-1">
            <Edit3 className="h-3.5 w-3.5" /> Edit
          </Link>
          <button onClick={onDuplicate}
            className="h-9 w-9 rounded-lg bg-blue-50 hover:bg-blue-100 text-blue-700 flex items-center justify-center" title="Duplicate">
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

function StatCard({ label, value, icon: Icon, tone }: any) {
  const tones: Record<string, string> = {
    violet: 'from-violet-500 to-purple-700', emerald: 'from-emerald-500 to-teal-700',
    pink: 'from-pink-500 to-rose-700', amber: 'from-amber-500 to-orange-600',
  };
  return (
    <div className="rounded-2xl bg-white border-2 border-slate-200 p-4 shadow-sm">
      <div className="flex items-center justify-between gap-2">
        <div>
          <div className="text-[10px] uppercase font-extrabold text-slate-500">{label}</div>
          <div className="text-2xl font-extrabold text-slate-900 tabular-nums mt-1">{value}</div>
        </div>
        <div className={`h-10 w-10 rounded-xl bg-gradient-to-br ${tones[tone]} text-white flex items-center justify-center shadow-md`}>
          <Icon className="h-4 w-4" />
        </div>
      </div>
    </div>
  );
}
