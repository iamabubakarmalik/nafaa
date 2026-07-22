import { useState } from 'react';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { Link } from 'react-router-dom';
import {
  Beef, Search, X, RefreshCw, Sparkles, Star, TrendingUp, Zap, Package,
  ShieldCheck, Snowflake, Award, Eye, Edit3, Trash2, Filter,
} from 'lucide-react';
import { meatProductsApi, type AnimalType, type CutCategory, type FreshnessType } from '../api/products.api';
import { formatPKR } from '@core/lib/format';
import { toast } from 'sonner';

const ANIMAL_TYPES: { value: AnimalType; label: string; emoji: string }[] = [
  { value: 'BEEF', label: 'Beef', emoji: '🐄' },
  { value: 'MUTTON', label: 'Mutton', emoji: '🐑' },
  { value: 'GOAT', label: 'Goat', emoji: '🐐' },
  { value: 'LAMB', label: 'Lamb', emoji: '🐏' },
  { value: 'CHICKEN', label: 'Chicken', emoji: '🐔' },
  { value: 'DUCK', label: 'Duck', emoji: '🦆' },
  { value: 'TURKEY', label: 'Turkey', emoji: '🦃' },
  { value: 'QUAIL', label: 'Quail', emoji: '🐦' },
  { value: 'CAMEL', label: 'Camel', emoji: '🐫' },
  { value: 'BUFFALO', label: 'Buffalo', emoji: '🐃' },
  { value: 'FISH', label: 'Fish', emoji: '🐟' },
  { value: 'PRAWN', label: 'Prawn', emoji: '🦐' },
];

const CUT_CATEGORIES: { value: CutCategory; label: string }[] = [
  { value: 'WHOLE_ANIMAL', label: 'Whole Animal' },
  { value: 'HALF_ANIMAL', label: 'Half' },
  { value: 'QUARTER', label: 'Quarter' },
  { value: 'PRIMAL_CUT', label: 'Primal Cut' },
  { value: 'RETAIL_CUT', label: 'Retail Cut' },
  { value: 'BONELESS', label: 'Boneless' },
  { value: 'WITH_BONE', label: 'With Bone' },
  { value: 'MINCE', label: 'Mince/Qeema' },
  { value: 'UNDERCUT', label: 'Undercut' },
  { value: 'RIBS', label: 'Ribs' },
  { value: 'CHOPS', label: 'Chops' },
  { value: 'BREAST', label: 'Breast' },
  { value: 'LEG', label: 'Leg/Raan' },
  { value: 'THIGH', label: 'Thigh' },
  { value: 'WING', label: 'Wing' },
  { value: 'DRUMSTICK', label: 'Drumstick' },
  { value: 'LIVER', label: 'Liver/Kaleji' },
  { value: 'KIDNEY', label: 'Kidney/Gurda' },
  { value: 'HEART', label: 'Heart' },
  { value: 'BRAIN', label: 'Brain/Maghaz' },
  { value: 'TONGUE', label: 'Tongue' },
  { value: 'TROTTERS', label: 'Trotters/Paye' },
  { value: 'HEAD', label: 'Head/Sri' },
  { value: 'OFFAL', label: 'Offal' },
  { value: 'BONES', label: 'Bones' },
];

const FRESHNESS: { value: FreshnessType; label: string; emoji: string }[] = [
  { value: 'LIVE', label: 'Live', emoji: '🐄' },
  { value: 'FRESH_SLAUGHTERED', label: 'Fresh Slaughtered', emoji: '✨' },
  { value: 'FRESH_CHILLED', label: 'Fresh Chilled', emoji: '❄️' },
  { value: 'FROZEN', label: 'Frozen', emoji: '🧊' },
  { value: 'MARINATED', label: 'Marinated', emoji: '🌶️' },
  { value: 'SMOKED', label: 'Smoked', emoji: '💨' },
  { value: 'DRIED', label: 'Dried', emoji: '🌾' },
];

export default function MeatProductsPage() {
  const queryClient = useQueryClient();
  const [search, setSearch] = useState('');
  const [animalFilter, setAnimalFilter] = useState<string>('all');
  const [cutFilter, setCutFilter] = useState<string>('all');
  const [freshnessFilter, setFreshnessFilter] = useState<string>('all');
  const [tagFilter, setTagFilter] = useState<string>('all');

  const { data: profiles = [], isLoading, refetch, isRefetching } = useQuery({
    queryKey: ['meat-products', animalFilter, cutFilter, freshnessFilter, tagFilter, search],
    queryFn: () => meatProductsApi.list({
      animalType: animalFilter === 'all' ? undefined : animalFilter,
      cutCategory: cutFilter === 'all' ? undefined : cutFilter,
      freshnessType: freshnessFilter === 'all' ? undefined : freshnessFilter,
      featured: tagFilter === 'featured' ? true : undefined,
      popular: tagFilter === 'popular' ? true : undefined,
      onSale: tagFilter === 'sale' ? true : undefined,
      search: search.trim() || undefined,
    }),
  });

  const removeMutation = useMutation({
    mutationFn: (id: string) => meatProductsApi.remove(id),
    onSuccess: () => {
      toast.success('Product removed');
      queryClient.invalidateQueries({ queryKey: ['meat-products'] });
    },
  });

  const stats = {
    total: profiles.length,
    halal: profiles.filter((p) => p.isHalalCertified).length,
    onSale: profiles.filter((p) => p.isOnSale).length,
    featured: profiles.filter((p) => p.isFeatured).length,
  };

  return (
    <div className="space-y-6">
      {/* HERO */}
      <section className="relative overflow-hidden rounded-3xl bg-gradient-to-br from-slate-950 via-red-900 to-rose-800 text-white p-6 sm:p-8 shadow-2xl">
        <div className="absolute -top-20 -right-20 h-72 w-72 rounded-full bg-red-400/20 blur-3xl" />
        <div className="relative flex flex-col lg:flex-row lg:items-center lg:justify-between gap-5">
          <div>
            <div className="inline-flex items-center gap-2 rounded-full bg-white/15 backdrop-blur px-3 py-1 text-xs font-extrabold border border-white/20">
              <Sparkles className="h-3.5 w-3.5 text-amber-300" />
              Meat Catalog
            </div>
            <h1 className="mt-3 text-3xl sm:text-4xl font-extrabold leading-tight">🥩 Meat Products</h1>
            <p className="mt-2 text-sm text-white/80 font-semibold">Cuts, halal certification, weight-based pricing</p>
          </div>
          <button onClick={() => refetch()} disabled={isRefetching} className="inline-flex items-center gap-2 rounded-xl bg-white/15 hover:bg-white/25 px-4 py-2.5 text-sm font-bold backdrop-blur border border-white/20">
            <RefreshCw className={'h-4 w-4 ' + (isRefetching ? 'animate-spin' : '')} />
            Refresh
          </button>
        </div>
      </section>

      {/* Stats */}
      <section className="grid grid-cols-2 lg:grid-cols-4 gap-4">
        <StatCard label="Total Items" value={stats.total} icon={Beef} color="red" />
        <StatCard label="Halal Certified" value={stats.halal} icon={ShieldCheck} color="emerald" />
        <StatCard label="Featured" value={stats.featured} icon={Star} color="amber" />
        <StatCard label="On Sale" value={stats.onSale} icon={Zap} color="rose" />
      </section>

      {/* Filters */}
      <section className="rounded-3xl bg-white dark:bg-neutral-900 border border-slate-200 dark:border-neutral-800 shadow-sm p-4 space-y-3">
        <div className="relative">
          <Search className="h-4 w-4 text-slate-400 absolute left-3.5 top-1/2 -translate-y-1/2" />
          <input
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            placeholder="Search products..."
            className="h-11 w-full rounded-xl border-2 border-slate-200 dark:border-neutral-700 bg-white dark:bg-neutral-800 pl-10 pr-3 text-sm font-semibold focus:outline-none focus:border-red-500"
          />
        </div>

        <div className="flex gap-1.5 overflow-x-auto pb-1">
          <button onClick={() => setAnimalFilter('all')} className={
            'shrink-0 px-3 py-1.5 rounded-lg text-xs font-extrabold ' +
            (animalFilter === 'all' ? 'bg-red-600 text-white shadow' : 'bg-slate-100 dark:bg-neutral-800 text-slate-700')
          }>All Animals</button>
          {ANIMAL_TYPES.map((a) => (
            <button key={a.value} onClick={() => setAnimalFilter(a.value)} className={
              'shrink-0 px-3 py-1.5 rounded-lg text-xs font-extrabold ' +
              (animalFilter === a.value ? 'bg-red-600 text-white shadow' : 'bg-slate-100 dark:bg-neutral-800 text-slate-700')
            }>
              {a.emoji} {a.label}
            </button>
          ))}
        </div>

        <div className="flex gap-1.5 overflow-x-auto pb-1">
          <button onClick={() => setCutFilter('all')} className={
            'shrink-0 px-3 py-1.5 rounded-lg text-xs font-extrabold ' +
            (cutFilter === 'all' ? 'bg-rose-600 text-white shadow' : 'bg-slate-100 dark:bg-neutral-800 text-slate-700')
          }>All Cuts</button>
          {CUT_CATEGORIES.map((c) => (
            <button key={c.value} onClick={() => setCutFilter(c.value)} className={
              'shrink-0 px-3 py-1.5 rounded-lg text-xs font-extrabold ' +
              (cutFilter === c.value ? 'bg-rose-600 text-white shadow' : 'bg-slate-100 dark:bg-neutral-800 text-slate-700')
            }>{c.label}</button>
          ))}
        </div>

        <div className="flex gap-1.5 flex-wrap">
          {FRESHNESS.map((f) => (
            <button key={f.value} onClick={() => setFreshnessFilter(freshnessFilter === f.value ? 'all' : f.value)} className={
              'px-3 py-1.5 rounded-lg text-xs font-extrabold ' +
              (freshnessFilter === f.value ? 'bg-blue-600 text-white shadow' : 'bg-slate-100 dark:bg-neutral-800 text-slate-700')
            }>
              {f.emoji} {f.label}
            </button>
          ))}
          <div className="w-px bg-slate-200 mx-1" />
          {[
            { v: 'all', label: 'All' },
            { v: 'featured', label: '⭐ Featured' },
            { v: 'popular', label: '🔥 Popular' },
            { v: 'sale', label: '💥 On Sale' },
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
          <Beef className="h-16 w-16 text-slate-400 mx-auto mb-3" />
          <p className="font-extrabold text-slate-700">No meat products yet</p>
          <p className="text-xs text-slate-500 mt-1">Go to Products page to add meat cuts with halal info</p>
        </div>
      ) : (
        <section className="grid sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-4">
          {profiles.map((profile) => (
            <ProductCard
              key={profile.id}
              profile={profile}
              onDelete={() => {
                if (confirm('Remove this meat profile?')) removeMutation.mutate(profile.id);
              }}
            />
          ))}
        </section>
      )}
    </div>
  );
}

function StatCard({ label, value, icon: Icon, color }: any) {
  const colors: Record<string, string> = {
    red: 'from-red-500 to-rose-600',
    emerald: 'from-emerald-500 to-green-600',
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
  const animal = ANIMAL_TYPES.find((a) => a.value === profile.animalType);

  return (
    <Link
      to={'/products/' + profile.productId + '/edit'}
      className={
        'group rounded-2xl bg-white dark:bg-neutral-900 border-2 shadow-sm hover:shadow-xl hover:-translate-y-1 transition-all overflow-hidden ' +
        (profile.isFeatured ? 'border-amber-400 ring-2 ring-amber-100 dark:ring-amber-950/40' : 'border-slate-200 dark:border-neutral-800')
      }
    >
      <div className="relative aspect-square bg-gradient-to-br from-red-500 via-rose-600 to-red-700 overflow-hidden">
        {product?.images?.[0]?.url ? (
          <img src={product.images[0].url} alt="" className="w-full h-full object-cover group-hover:scale-110 transition-transform duration-500" />
        ) : (
          <div className="w-full h-full flex items-center justify-center">
            <span className="text-6xl">{animal?.emoji || '🥩'}</span>
          </div>
        )}

        <div className="absolute top-2 left-2 flex flex-col gap-1">
          {profile.isHalalCertified && (
            <span className="px-1.5 py-0.5 rounded bg-emerald-600 text-white text-[9px] font-extrabold uppercase inline-flex items-center gap-0.5 shadow">
              <ShieldCheck className="h-2 w-2" /> HALAL
            </span>
          )}
          {profile.isFeatured && (
            <span className="px-1.5 py-0.5 rounded bg-amber-500 text-white text-[9px] font-extrabold uppercase shadow">
              <Star className="h-2 w-2 fill-current inline" /> Featured
            </span>
          )}
          {profile.isOnSale && (
            <span className="px-1.5 py-0.5 rounded bg-rose-500 text-white text-[9px] font-extrabold uppercase shadow">
              <Zap className="h-2 w-2 inline" /> SALE
            </span>
          )}
          {profile.isPopular && (
            <span className="px-1.5 py-0.5 rounded bg-red-500 text-white text-[9px] font-extrabold uppercase shadow">
              <TrendingUp className="h-2 w-2 inline" /> POPULAR
            </span>
          )}
        </div>

        <div className="absolute top-2 right-2 flex flex-col gap-1">
          {profile.isFrozen && (
            <span className="h-7 w-7 rounded-full bg-blue-500/80 backdrop-blur text-white flex items-center justify-center shadow" title="Frozen">
              <Snowflake className="h-4 w-4" />
            </span>
          )}
          {profile.isBoneless && (
            <span className="px-1.5 py-0.5 rounded bg-slate-900/80 backdrop-blur text-white text-[9px] font-extrabold uppercase shadow">
              Boneless
            </span>
          )}
        </div>

        <div className="absolute bottom-2 left-2 right-2 flex items-end justify-between">
          <div className="text-white">
            <div className="text-[10px] font-extrabold uppercase text-white/80">{animal?.label}</div>
            <div className="text-[10px] font-bold text-white/70">{profile.cutCategory?.replace('_', ' ')}</div>
          </div>
          <div className="opacity-0 group-hover:opacity-100 transition-opacity">
            <button
              onClick={(e) => { e.preventDefault(); onDelete(); }}
              className="h-7 w-7 rounded-lg bg-rose-600 text-white flex items-center justify-center shadow"
            >
              <Trash2 className="h-3.5 w-3.5" />
            </button>
          </div>
        </div>
      </div>

      <div className="p-3 space-y-2">
        <h3 className="font-extrabold text-sm text-slate-900 dark:text-white line-clamp-1">{product?.name}</h3>

        <div className="flex flex-wrap gap-1">
          {profile.qualityGrade && (
            <span className="px-1.5 py-0.5 rounded bg-amber-100 dark:bg-amber-950/40 text-amber-700 text-[9px] font-extrabold uppercase">
              {profile.qualityGrade.replace('_', ' ')}
            </span>
          )}
          {profile.isOrganic && (
            <span className="px-1.5 py-0.5 rounded bg-green-100 dark:bg-green-950/40 text-green-700 text-[9px] font-extrabold uppercase">ORGANIC</span>
          )}
          {profile.isFreeRange && (
            <span className="px-1.5 py-0.5 rounded bg-blue-100 dark:bg-blue-950/40 text-blue-700 text-[9px] font-extrabold uppercase">FREE RANGE</span>
          )}
        </div>

        {profile.halalCertNumber && (
          <div className="text-[10px] font-mono text-emerald-700 font-bold">
            <ShieldCheck className="h-2.5 w-2.5 inline mr-0.5" />
            Cert: {profile.halalCertNumber}
          </div>
        )}

        <div className="pt-2 border-t border-slate-100 dark:border-neutral-800 flex items-end justify-between">
          <div>
            <div className="text-lg font-extrabold text-emerald-700 dark:text-emerald-400 tabular-nums leading-none">
              {formatPKR(profile.pricePerKg)}
              <span className="text-xs font-bold text-slate-500">/kg</span>
            </div>
            {profile.pricePerPiece && (
              <div className="text-xs font-extrabold text-slate-600 tabular-nums">
                {formatPKR(profile.pricePerPiece)}/piece
              </div>
            )}
          </div>
          {profile.totalSoldKg > 0 && (
            <div className="text-right">
              <div className="text-[10px] font-extrabold text-slate-500">Sold</div>
              <div className="text-xs font-extrabold text-slate-700 tabular-nums">{profile.totalSoldKg.toFixed(1)}kg</div>
            </div>
          )}
        </div>
      </div>
    </Link>
  );
}
