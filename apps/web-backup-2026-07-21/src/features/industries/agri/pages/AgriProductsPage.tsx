import { useState } from 'react';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { Link } from 'react-router-dom';
import {
  Wheat, Search, X, RefreshCw, Sparkles, Star, TrendingUp, Zap, Package,
  ShieldCheck, AlertCircle, Leaf, FlaskConical, Tractor, Edit3, Trash2,
} from 'lucide-react';
import { agriProductsApi, type AgriCategory, type SeasonType } from '../api/products.api';
import { formatPKR } from '@/lib/format';
import { toast } from 'sonner';

const CATEGORIES: { value: AgriCategory; label: string; emoji: string }[] = [
  { value: 'SEEDS', label: 'Seeds', emoji: '🌱' },
  { value: 'FERTILIZER', label: 'Fertilizer', emoji: '🧪' },
  { value: 'PESTICIDE', label: 'Pesticide', emoji: '💊' },
  { value: 'HERBICIDE', label: 'Herbicide', emoji: '🌿' },
  { value: 'FUNGICIDE', label: 'Fungicide', emoji: '🍄' },
  { value: 'INSECTICIDE', label: 'Insecticide', emoji: '🐛' },
  { value: 'ANIMAL_FEED', label: 'Animal Feed', emoji: '🐄' },
  { value: 'POULTRY_FEED', label: 'Poultry Feed', emoji: '🐔' },
  { value: 'CATTLE_FEED', label: 'Cattle Feed', emoji: '🐮' },
  { value: 'FISH_FEED', label: 'Fish Feed', emoji: '🐟' },
  { value: 'VETERINARY_MEDICINE', label: 'Vet Medicine', emoji: '💉' },
  { value: 'FARM_TOOLS', label: 'Farm Tools', emoji: '🔧' },
  { value: 'IRRIGATION', label: 'Irrigation', emoji: '💧' },
  { value: 'MACHINERY_PART', label: 'Machinery Parts', emoji: '⚙️' },
  { value: 'ORGANIC_INPUT', label: 'Organic Input', emoji: '🍃' },
  { value: 'OTHER', label: 'Other', emoji: '📦' },
];

const SEASONS: { value: SeasonType; label: string; emoji: string }[] = [
  { value: 'KHARIF', label: 'Kharif', emoji: '🌧️' },
  { value: 'RABI', label: 'Rabi', emoji: '❄️' },
  { value: 'ZAID', label: 'Zaid', emoji: '☀️' },
  { value: 'ALL_SEASON', label: 'All Season', emoji: '🌍' },
];

export default function AgriProductsPage() {
  const queryClient = useQueryClient();
  const [search, setSearch] = useState('');
  const [categoryFilter, setCategoryFilter] = useState<string>('all');
  const [seasonFilter, setSeasonFilter] = useState<string>('all');
  const [tagFilter, setTagFilter] = useState<string>('all');

  const { data: profiles = [], isLoading, refetch, isRefetching } = useQuery({
    queryKey: ['agri-products', categoryFilter, seasonFilter, tagFilter, search],
    queryFn: () => agriProductsApi.list({
      category: categoryFilter === 'all' ? undefined : categoryFilter,
      season: seasonFilter === 'all' ? undefined : seasonFilter,
      featured: tagFilter === 'featured' ? true : undefined,
      seasonal: tagFilter === 'seasonal' ? true : undefined,
      isOrganic: tagFilter === 'organic' ? true : undefined,
      search: search.trim() || undefined,
    }),
  });

  const removeMutation = useMutation({
    mutationFn: (id: string) => agriProductsApi.remove(id),
    onSuccess: () => {
      toast.success('Product removed');
      queryClient.invalidateQueries({ queryKey: ['agri-products'] });
    },
  });

  const stats = {
    total: profiles.length,
    organic: profiles.filter((p) => p.isOrganic).length,
    restricted: profiles.filter((p) => p.isRestricted).length,
    seasonal: profiles.filter((p) => p.isSeasonal).length,
  };

  return (
    <div className="space-y-6">
      <section className="relative overflow-hidden rounded-3xl bg-gradient-to-br from-slate-950 via-green-900 to-emerald-800 text-white p-6 sm:p-8 shadow-2xl">
        <div className="absolute -top-20 -right-20 h-72 w-72 rounded-full bg-green-400/20 blur-3xl" />
        <div className="relative flex flex-col lg:flex-row lg:items-center lg:justify-between gap-5">
          <div>
            <div className="inline-flex items-center gap-2 rounded-full bg-white/15 backdrop-blur px-3 py-1 text-xs font-extrabold border border-white/20">
              <Sparkles className="h-3.5 w-3.5 text-amber-300" />
              Agri Catalog
            </div>
            <h1 className="mt-3 text-3xl sm:text-4xl font-extrabold leading-tight">🌾 Agri Products</h1>
            <p className="mt-2 text-sm text-white/80 font-semibold">Seeds, fertilizers, pesticides, feed — sab products</p>
          </div>
          <button onClick={() => refetch()} disabled={isRefetching} className="inline-flex items-center gap-2 rounded-xl bg-white/15 hover:bg-white/25 px-4 py-2.5 text-sm font-bold backdrop-blur border border-white/20">
            <RefreshCw className={'h-4 w-4 ' + (isRefetching ? 'animate-spin' : '')} />
            Refresh
          </button>
        </div>
      </section>

      <section className="grid grid-cols-2 lg:grid-cols-4 gap-4">
        <StatCard label="Total Products" value={stats.total} icon={Package} color="green" />
        <StatCard label="Organic" value={stats.organic} icon={Leaf} color="emerald" />
        <StatCard label="Seasonal" value={stats.seasonal} icon={Sparkles} color="amber" />
        <StatCard label="Restricted" value={stats.restricted} icon={AlertCircle} color="rose" />
      </section>

      <section className="rounded-3xl bg-white dark:bg-neutral-900 border border-slate-200 dark:border-neutral-800 shadow-sm p-4 space-y-3">
        <div className="relative">
          <Search className="h-4 w-4 text-slate-400 absolute left-3.5 top-1/2 -translate-y-1/2" />
          <input value={search} onChange={(e) => setSearch(e.target.value)} placeholder="Search products..." className="h-11 w-full rounded-xl border-2 border-slate-200 dark:border-neutral-700 bg-white dark:bg-neutral-800 pl-10 pr-3 text-sm font-semibold focus:outline-none focus:border-green-500" />
        </div>

        <div className="flex gap-1.5 overflow-x-auto pb-1">
          <button onClick={() => setCategoryFilter('all')} className={
            'shrink-0 px-3 py-1.5 rounded-lg text-xs font-extrabold ' +
            (categoryFilter === 'all' ? 'bg-green-600 text-white shadow' : 'bg-slate-100 dark:bg-neutral-800 text-slate-700')
          }>All</button>
          {CATEGORIES.map((c) => (
            <button key={c.value} onClick={() => setCategoryFilter(c.value)} className={
              'shrink-0 px-3 py-1.5 rounded-lg text-xs font-extrabold ' +
              (categoryFilter === c.value ? 'bg-green-600 text-white shadow' : 'bg-slate-100 dark:bg-neutral-800 text-slate-700')
            }>{c.emoji} {c.label}</button>
          ))}
        </div>

        <div className="flex gap-1.5 flex-wrap">
          <button onClick={() => setSeasonFilter('all')} className={
            'px-3 py-1.5 rounded-lg text-xs font-extrabold ' +
            (seasonFilter === 'all' ? 'bg-teal-600 text-white shadow' : 'bg-slate-100 dark:bg-neutral-800 text-slate-700')
          }>All Seasons</button>
          {SEASONS.map((s) => (
            <button key={s.value} onClick={() => setSeasonFilter(s.value)} className={
              'px-3 py-1.5 rounded-lg text-xs font-extrabold ' +
              (seasonFilter === s.value ? 'bg-teal-600 text-white shadow' : 'bg-slate-100 dark:bg-neutral-800 text-slate-700')
            }>{s.emoji} {s.label}</button>
          ))}
          <div className="w-px bg-slate-200 mx-1" />
          {[
            { v: 'all', label: 'All' },
            { v: 'featured', label: '⭐ Featured' },
            { v: 'seasonal', label: '🗓️ Seasonal' },
            { v: 'organic', label: '🍃 Organic' },
          ].map((t) => (
            <button key={t.v} onClick={() => setTagFilter(t.v)} className={
              'px-3 py-1.5 rounded-lg text-xs font-extrabold ' +
              (tagFilter === t.v ? 'bg-amber-600 text-white shadow' : 'bg-slate-100 dark:bg-neutral-800 text-slate-700')
            }>{t.label}</button>
          ))}
        </div>
      </section>

      {isLoading ? (
        <div className="grid sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-4">
          {[1, 2, 3, 4, 5, 6].map((i) => <div key={i} className="h-80 rounded-2xl bg-slate-100 dark:bg-neutral-800 animate-pulse" />)}
        </div>
      ) : profiles.length === 0 ? (
        <div className="rounded-3xl bg-white dark:bg-neutral-900 border-2 border-dashed border-slate-200 dark:border-neutral-800 p-12 text-center">
          <Wheat className="h-16 w-16 text-slate-400 mx-auto mb-3" />
          <p className="font-extrabold text-slate-700">No agri products yet</p>
          <p className="text-xs text-slate-500 mt-1">Go to Products page to add agri profiles</p>
        </div>
      ) : (
        <section className="grid sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-4">
          {profiles.map((profile) => (
            <ProductCard
              key={profile.id}
              profile={profile}
              onDelete={() => { if (confirm('Remove this product?')) removeMutation.mutate(profile.id); }}
            />
          ))}
        </section>
      )}
    </div>
  );
}

function StatCard({ label, value, icon: Icon, color }: any) {
  const colors: Record<string, string> = {
    green: 'from-green-500 to-emerald-600',
    emerald: 'from-emerald-500 to-teal-600',
    amber: 'from-amber-500 to-orange-600',
    rose: 'from-rose-500 to-red-600',
  };
  return (
    <div className="rounded-2xl bg-white dark:bg-neutral-900 border-2 border-slate-200 dark:border-neutral-800 p-5 shadow-sm">
      <div className="flex items-center justify-between">
        <div>
          <div className="text-xs uppercase tracking-wider text-slate-500 font-bold">{label}</div>
          <div className="mt-2 text-2xl font-extrabold text-slate-900 dark:text-white tabular-nums">{value}</div>
        </div>
        <div className={'h-12 w-12 rounded-2xl bg-gradient-to-br ' + colors[color] + ' text-white flex items-center justify-center shadow-lg'}>
          <Icon className="h-6 w-6" />
        </div>
      </div>
    </div>
  );
}

function ProductCard({ profile, onDelete }: any) {
  const product = profile.product;
  const category = CATEGORIES.find((c) => c.value === profile.category);

  return (
    <Link
      to={'/products/' + profile.productId + '/edit'}
      className={
        'group rounded-2xl bg-white dark:bg-neutral-900 border-2 shadow-sm hover:shadow-xl hover:-translate-y-1 transition-all overflow-hidden ' +
        (profile.isFeatured ? 'border-amber-400 ring-2 ring-amber-100 dark:ring-amber-950/40' : 'border-slate-200 dark:border-neutral-800')
      }
    >
      <div className="relative aspect-square bg-gradient-to-br from-green-500 via-emerald-600 to-teal-700 overflow-hidden">
        {product?.images?.[0]?.url ? (
          <img src={product.images[0].url} alt="" className="w-full h-full object-cover group-hover:scale-110 transition-transform duration-500" />
        ) : (
          <div className="w-full h-full flex items-center justify-center">
            <span className="text-6xl">{category?.emoji || '🌾'}</span>
          </div>
        )}

        <div className="absolute top-2 left-2 flex flex-col gap-1">
          {profile.isFeatured && (
            <span className="px-1.5 py-0.5 rounded bg-amber-500 text-white text-[9px] font-extrabold uppercase shadow">
              <Star className="h-2 w-2 fill-current inline" /> Featured
            </span>
          )}
          {profile.isSeasonal && (
            <span className="px-1.5 py-0.5 rounded bg-teal-500 text-white text-[9px] font-extrabold uppercase shadow">Seasonal</span>
          )}
          {profile.isOrganic && (
            <span className="px-1.5 py-0.5 rounded bg-emerald-600 text-white text-[9px] font-extrabold uppercase shadow">
              <Leaf className="h-2 w-2 inline" /> Organic
            </span>
          )}
          {profile.isRestricted && (
            <span className="px-1.5 py-0.5 rounded bg-rose-600 text-white text-[9px] font-extrabold uppercase shadow animate-pulse">
              <AlertCircle className="h-2 w-2 inline" /> Restricted
            </span>
          )}
        </div>

        <div className="absolute top-2 right-2 opacity-0 group-hover:opacity-100 transition-opacity">
          <button onClick={(e) => { e.preventDefault(); onDelete(); }} className="h-8 w-8 rounded-lg bg-rose-600/90 text-white flex items-center justify-center shadow">
            <Trash2 className="h-3.5 w-3.5" />
          </button>
        </div>

        <div className="absolute bottom-2 left-2 right-2 flex items-end justify-between">
          <div className="text-white">
            <div className="text-[10px] font-extrabold uppercase text-white/80">{category?.label}</div>
            {profile.season && (
              <div className="text-[10px] font-bold text-white/70">{profile.season}</div>
            )}
          </div>
          {profile.brand && (
            <div className="text-[10px] font-extrabold text-white/90 bg-slate-900/60 backdrop-blur px-1.5 py-0.5 rounded">
              {profile.brand}
            </div>
          )}
        </div>
      </div>

      <div className="p-3 space-y-2">
        <h3 className="font-extrabold text-sm text-slate-900 dark:text-white line-clamp-1">{product?.name}</h3>

        {profile.npkRatio && (
          <div className="text-[10px] font-extrabold text-green-700 bg-green-50 dark:bg-green-950/30 rounded px-1.5 py-0.5 inline-block">
            NPK: {profile.npkRatio}
          </div>
        )}
        {profile.activeIngredient && (
          <div className="text-[10px] font-bold text-slate-500">
            Active: {profile.activeIngredient}
          </div>
        )}

        {profile.targetCrops?.length > 0 && (
          <div className="flex flex-wrap gap-0.5">
            {profile.targetCrops.slice(0, 3).map((c: string, i: number) => (
              <span key={i} className="px-1 py-0.5 rounded bg-slate-100 dark:bg-neutral-800 text-slate-600 text-[9px] font-bold">
                {c}
              </span>
            ))}
          </div>
        )}

        {profile.packSize && (
          <div className="text-[10px] font-bold text-slate-500">
            Pack: {profile.packSize} {profile.packUnit}
          </div>
        )}

        <div className="pt-2 border-t border-slate-100 dark:border-neutral-800 flex items-end justify-between">
          <div className="text-lg font-extrabold text-emerald-700 dark:text-emerald-400 tabular-nums leading-none">
            {formatPKR(product?.price ?? 0)}
          </div>
          {profile.totalSold > 0 && (
            <div className="text-right">
              <div className="text-[10px] font-extrabold text-slate-500">Sold</div>
              <div className="text-xs font-extrabold text-slate-700 tabular-nums">{profile.totalSold}</div>
            </div>
          )}
        </div>
      </div>
    </Link>
  );
}
