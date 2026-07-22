import { useState } from 'react';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { Link } from 'react-router-dom';
import {
  Shirt, Search, X, RefreshCw, Sparkles, Star, TrendingUp, Tag,
  Package, Eye, Palette, Scissors, Filter, Award, Zap,
} from 'lucide-react';
import { garmentProductsApi, type GarmentGender, type GarmentCategoryType } from '../api/products.api';
import { formatPKR } from '@/lib/format';

const GENDERS: { value: GarmentGender; label: string; emoji: string }[] = [
  { value: 'MEN', label: 'Men', emoji: '👨' },
  { value: 'WOMEN', label: 'Women', emoji: '👩' },
  { value: 'BOYS', label: 'Boys', emoji: '👦' },
  { value: 'GIRLS', label: 'Girls', emoji: '👧' },
  { value: 'UNISEX', label: 'Unisex', emoji: '👥' },
  { value: 'KIDS', label: 'Kids', emoji: '🧒' },
];

const POPULAR_CATEGORIES: { value: GarmentCategoryType; label: string; emoji: string }[] = [
  { value: 'KURTA', label: 'Kurta', emoji: '👘' },
  { value: 'SHALWAR_KAMEEZ', label: 'Shalwar Kameez', emoji: '👗' },
  { value: 'THREE_PIECE', label: '3-Piece', emoji: '🧥' },
  { value: 'SHIRT', label: 'Shirt', emoji: '👔' },
  { value: 'T_SHIRT', label: 'T-Shirt', emoji: '👕' },
  { value: 'TROUSER', label: 'Trouser', emoji: '👖' },
  { value: 'ABAYA', label: 'Abaya', emoji: '🧕' },
  { value: 'LEHENGA', label: 'Lehenga', emoji: '💃' },
  { value: 'FROCK', label: 'Frock', emoji: '👗' },
  { value: 'JEANS', label: 'Jeans', emoji: '👖' },
];

export default function GarmentProductsPage() {
  const [search, setSearch] = useState('');
  const [genderFilter, setGenderFilter] = useState<string>('all');
  const [categoryFilter, setCategoryFilter] = useState<string>('all');
  const [tagFilter, setTagFilter] = useState<string>('all');

  const { data: profiles = [], isLoading, refetch, isRefetching } = useQuery({
    queryKey: ['garment-products', genderFilter, categoryFilter, tagFilter],
    queryFn: () => garmentProductsApi.list({
      gender: genderFilter === 'all' ? undefined : genderFilter,
      categoryType: categoryFilter === 'all' ? undefined : categoryFilter,
      featured: tagFilter === 'featured' ? true : undefined,
      newArrival: tagFilter === 'new' ? true : undefined,
      bestSeller: tagFilter === 'bestseller' ? true : undefined,
      onSale: tagFilter === 'sale' ? true : undefined,
    }),
  });

  const filtered = profiles.filter((p) => {
    if (!search.trim()) return true;
    const q = search.toLowerCase();
    return p.product?.name?.toLowerCase().includes(q) || p.styleCode?.toLowerCase().includes(q);
  });

  const stats = {
    total: profiles.length,
    newArrivals: profiles.filter((p) => p.isNewArrival).length,
    bestSellers: profiles.filter((p) => p.isBestSeller).length,
    onSale: profiles.filter((p) => p.isOnSale).length,
  };

  return (
    <div className="space-y-6">
      {/* HERO */}
      <section className="relative overflow-hidden rounded-3xl bg-gradient-to-br from-slate-950 via-pink-900 to-rose-700 text-white p-6 sm:p-8 shadow-2xl">
        <div className="absolute -top-20 -right-20 h-72 w-72 rounded-full bg-pink-400/20 blur-3xl" />
        <div className="relative flex flex-col lg:flex-row lg:items-center lg:justify-between gap-5">
          <div>
            <div className="inline-flex items-center gap-2 rounded-full bg-white/15 backdrop-blur px-3 py-1 text-xs font-extrabold border border-white/20">
              <Sparkles className="h-3.5 w-3.5 text-amber-300" />
              Boutique Catalog
            </div>
            <h1 className="mt-3 text-3xl sm:text-4xl font-extrabold leading-tight">👗 Garment Products</h1>
            <p className="mt-2 text-sm text-white/80 font-semibold">Ready-made stock — clothing, fabric, accessories</p>
          </div>
          <button onClick={() => refetch()} disabled={isRefetching} className="inline-flex items-center gap-2 rounded-xl bg-white/15 hover:bg-white/25 px-4 py-2.5 text-sm font-bold backdrop-blur border border-white/20">
            <RefreshCw className={'h-4 w-4 ' + (isRefetching ? 'animate-spin' : '')} />
            Refresh
          </button>
        </div>
      </section>

      {/* Stats */}
      <section className="grid grid-cols-2 sm:grid-cols-4 gap-4">
        <StatCard label="Total Items" value={stats.total} icon={Shirt} color="pink" />
        <StatCard label="New Arrivals" value={stats.newArrivals} icon={Sparkles} color="amber" />
        <StatCard label="Best Sellers" value={stats.bestSellers} icon={TrendingUp} color="emerald" />
        <StatCard label="On Sale" value={stats.onSale} icon={Tag} color="rose" />
      </section>

      {/* Filters */}
      <section className="rounded-3xl bg-white dark:bg-neutral-900 border border-slate-200 dark:border-neutral-800 shadow-sm p-4 space-y-3">
        <div className="relative">
          <Search className="h-4 w-4 text-slate-400 absolute left-3.5 top-1/2 -translate-y-1/2" />
          <input
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            placeholder="Search product name or style code..."
            className="h-11 w-full rounded-xl border-2 border-slate-200 dark:border-neutral-700 bg-white dark:bg-neutral-800 pl-10 pr-3 text-sm font-semibold focus:outline-none focus:border-pink-500"
          />
        </div>

        {/* Gender filter */}
        <div className="flex gap-1.5 overflow-x-auto pb-1">
          <button onClick={() => setGenderFilter('all')} className={
            'shrink-0 px-3 py-1.5 rounded-lg text-xs font-extrabold ' +
            (genderFilter === 'all' ? 'bg-pink-600 text-white shadow' : 'bg-slate-100 dark:bg-neutral-800 text-slate-700')
          }>All</button>
          {GENDERS.map((g) => (
            <button key={g.value} onClick={() => setGenderFilter(g.value)} className={
              'shrink-0 px-3 py-1.5 rounded-lg text-xs font-extrabold ' +
              (genderFilter === g.value ? 'bg-pink-600 text-white shadow' : 'bg-slate-100 dark:bg-neutral-800 text-slate-700')
            }>
              {g.emoji} {g.label}
            </button>
          ))}
        </div>

        {/* Category filter */}
        <div className="flex gap-1.5 overflow-x-auto pb-1">
          <button onClick={() => setCategoryFilter('all')} className={
            'shrink-0 px-3 py-1.5 rounded-lg text-xs font-extrabold ' +
            (categoryFilter === 'all' ? 'bg-fuchsia-600 text-white shadow' : 'bg-slate-100 dark:bg-neutral-800 text-slate-700')
          }>All Categories</button>
          {POPULAR_CATEGORIES.map((c) => (
            <button key={c.value} onClick={() => setCategoryFilter(c.value)} className={
              'shrink-0 px-3 py-1.5 rounded-lg text-xs font-extrabold ' +
              (categoryFilter === c.value ? 'bg-fuchsia-600 text-white shadow' : 'bg-slate-100 dark:bg-neutral-800 text-slate-700')
            }>
              {c.emoji} {c.label}
            </button>
          ))}
        </div>

        {/* Tag filter */}
        <div className="flex gap-1.5 overflow-x-auto pb-1">
          {[
            { v: 'all', label: 'All Items', color: 'bg-slate-600' },
            { v: 'featured', label: '⭐ Featured', color: 'bg-amber-600' },
            { v: 'new', label: '✨ New Arrivals', color: 'bg-emerald-600' },
            { v: 'bestseller', label: '🏆 Best Sellers', color: 'bg-blue-600' },
            { v: 'sale', label: '🔥 On Sale', color: 'bg-rose-600' },
          ].map((t) => (
            <button key={t.v} onClick={() => setTagFilter(t.v)} className={
              'shrink-0 px-3 py-1.5 rounded-lg text-xs font-extrabold transition ' +
              (tagFilter === t.v ? t.color + ' text-white shadow' : 'bg-slate-100 dark:bg-neutral-800 text-slate-700')
            }>
              {t.label}
            </button>
          ))}
        </div>
      </section>

      {isLoading ? (
        <div className="grid sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-4">
          {[1, 2, 3, 4, 5, 6, 7, 8].map((i) => <div key={i} className="h-80 rounded-2xl bg-slate-100 dark:bg-neutral-800 animate-pulse" />)}
        </div>
      ) : filtered.length === 0 ? (
        <div className="rounded-3xl bg-white dark:bg-neutral-900 border-2 border-dashed border-slate-200 dark:border-neutral-800 p-12 text-center">
          <Shirt className="h-16 w-16 text-slate-400 mx-auto mb-3" />
          <p className="font-extrabold text-slate-700">No garment products found</p>
          <p className="text-xs text-slate-500 font-semibold mt-1">Go to Products page to add garment profiles</p>
        </div>
      ) : (
        <section className="grid sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-4">
          {filtered.map((profile) => (
            <ProductCard key={profile.id} profile={profile} />
          ))}
        </section>
      )}
    </div>
  );
}

function StatCard({ label, value, icon: Icon, color }: any) {
  const colors: Record<string, string> = {
    pink: 'from-pink-500 to-rose-600', amber: 'from-amber-500 to-orange-600',
    emerald: 'from-emerald-500 to-green-600', rose: 'from-rose-500 to-red-600',
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

function ProductCard({ profile }: { profile: any }) {
  const product = profile.product;
  const gender = GENDERS.find((g) => g.value === profile.gender);
  const category = POPULAR_CATEGORIES.find((c) => c.value === profile.categoryType);

  return (
    <Link
      to={'/products/' + profile.productId + '/edit'}
      className="group rounded-2xl bg-white dark:bg-neutral-900 border-2 border-slate-200 dark:border-neutral-800 shadow-sm hover:shadow-xl hover:-translate-y-1 transition-all overflow-hidden"
    >
      <div className="relative aspect-[3/4] bg-slate-100 dark:bg-neutral-800 overflow-hidden">
        {product?.images?.[0]?.url ? (
          <img src={product.images[0].url} alt="" className="w-full h-full object-cover group-hover:scale-110 transition-transform duration-500" />
        ) : (
          <div className="w-full h-full flex items-center justify-center">
            <span className="text-5xl">{category?.emoji || '👗'}</span>
          </div>
        )}

        {/* Badges */}
        <div className="absolute top-2 left-2 flex flex-col gap-1">
          {profile.isNewArrival && (
            <span className="px-1.5 py-0.5 rounded bg-emerald-500 text-white text-[9px] font-extrabold uppercase shadow inline-flex items-center gap-0.5">
              <Sparkles className="h-2 w-2" /> NEW
            </span>
          )}
          {profile.isBestSeller && (
            <span className="px-1.5 py-0.5 rounded bg-amber-500 text-white text-[9px] font-extrabold uppercase shadow inline-flex items-center gap-0.5">
              <TrendingUp className="h-2 w-2" /> BEST
            </span>
          )}
          {profile.isOnSale && (
            <span className="px-1.5 py-0.5 rounded bg-rose-500 text-white text-[9px] font-extrabold uppercase shadow inline-flex items-center gap-0.5">
              <Zap className="h-2 w-2" /> SALE
            </span>
          )}
          {profile.isFeatured && (
            <span className="px-1.5 py-0.5 rounded bg-purple-500 text-white text-[9px] font-extrabold uppercase shadow inline-flex items-center gap-0.5">
              <Star className="h-2 w-2 fill-current" /> HOT
            </span>
          )}
        </div>

        {/* Gender badge */}
        {gender && (
          <div className="absolute top-2 right-2 h-7 w-7 rounded-full bg-slate-900/70 backdrop-blur text-white flex items-center justify-center shadow text-xs">
            {gender.emoji}
          </div>
        )}

        {/* Bottom info */}
        <div className="absolute bottom-0 left-0 right-0 p-2 bg-gradient-to-t from-slate-900/90 to-transparent">
          {profile.styleCode && (
            <div className="text-[10px] font-mono font-bold text-white/90">{profile.styleCode}</div>
          )}
        </div>
      </div>

      <div className="p-3 space-y-1">
        <h3 className="font-extrabold text-sm text-slate-900 dark:text-white line-clamp-1">{product?.name}</h3>

        <div className="flex items-center gap-1.5 flex-wrap">
          {category && (
            <span className="text-[10px] font-extrabold text-fuchsia-600">{category.label}</span>
          )}
          {profile.fabricType && (
            <span className="text-[10px] font-bold text-slate-500">• {profile.fabricType}</span>
          )}
          {profile.workType && profile.workType !== 'PLAIN' && (
            <span className="text-[10px] font-bold text-slate-500">• {profile.workType.replace('_', ' ')}</span>
          )}
        </div>

        <div className="pt-1 flex items-end justify-between">
          <div>
            <div className="text-lg font-extrabold text-emerald-700 dark:text-emerald-400 tabular-nums">{formatPKR(product?.price ?? 0)}</div>
            <div className="text-[10px] font-extrabold text-slate-500">Stock: {product?.stock ?? 0}</div>
          </div>
          <div className="text-right">
            {profile.totalSold > 0 && (
              <div className="text-[10px] font-bold text-slate-500">{profile.totalSold} sold</div>
            )}
          </div>
        </div>
      </div>
    </Link>
  );
}
