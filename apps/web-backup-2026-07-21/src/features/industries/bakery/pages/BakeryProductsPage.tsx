import { useState } from 'react';
import { useQuery } from '@tanstack/react-query';
import { Link } from 'react-router-dom';
import {
  Cake, Search, X, RefreshCw, Sparkles, Star, TrendingUp, Zap,
  Clock, Heart, Package,
} from 'lucide-react';
import { bakeryProductsApi } from '../api/products.api';
import { CATEGORIES } from '../api/constants';
import { formatPKR } from '@/lib/format';

export default function BakeryProductsPage() {
  const [search, setSearch] = useState('');
  const [categoryFilter, setCategoryFilter] = useState<string>('all');
  const [tagFilter, setTagFilter] = useState<string>('all');
  const [dietaryFilter, setDietaryFilter] = useState<string>('all');

  const { data: profiles = [], isLoading, refetch, isRefetching } = useQuery({
    queryKey: ['bakery-products', categoryFilter, tagFilter, dietaryFilter, search],
    queryFn: () => bakeryProductsApi.list({
      category: categoryFilter === 'all' ? undefined : categoryFilter,
      featured: tagFilter === 'featured' ? true : undefined,
      popular: tagFilter === 'popular' ? true : undefined,
      bestSeller: tagFilter === 'best' ? true : undefined,
      newArrival: tagFilter === 'new' ? true : undefined,
      seasonal: tagFilter === 'seasonal' ? true : undefined,
      eggless: dietaryFilter === 'eggless' ? true : undefined,
      vegan: dietaryFilter === 'vegan' ? true : undefined,
      sugarFree: dietaryFilter === 'sugar-free' ? true : undefined,
      search: search.trim() || undefined,
    }),
  });

  const stats = {
    total: profiles.length,
    featured: profiles.filter((p) => p.isFeatured).length,
    bestSellers: profiles.filter((p) => p.isBestSeller).length,
    eggless: profiles.filter((p) => p.isEggless).length,
  };

  return (
    <div className="space-y-6">
      <section className="relative overflow-hidden rounded-3xl bg-gradient-to-br from-slate-950 via-orange-900 to-amber-800 text-white p-6 sm:p-8 shadow-2xl">
        <div className="absolute -top-20 -right-20 h-72 w-72 rounded-full bg-orange-400/20 blur-3xl" />
        <div className="relative flex flex-col lg:flex-row lg:items-center lg:justify-between gap-5">
          <div>
            <div className="inline-flex items-center gap-2 rounded-full bg-white/15 backdrop-blur px-3 py-1 text-xs font-extrabold border border-white/20">
              <Sparkles className="h-3.5 w-3.5 text-amber-300" />
              Bakery Menu
            </div>
            <h1 className="mt-3 text-3xl sm:text-4xl font-extrabold leading-tight">🍰 Bakery Products</h1>
            <p className="mt-2 text-sm text-white/80 font-semibold">Cakes, pastries, breads, cookies & sweets</p>
          </div>
          <button onClick={() => refetch()} disabled={isRefetching} className="inline-flex items-center gap-2 rounded-xl bg-white/15 hover:bg-white/25 px-4 py-2.5 text-sm font-bold backdrop-blur border border-white/20">
            <RefreshCw className={'h-4 w-4 ' + (isRefetching ? 'animate-spin' : '')} />
            Refresh
          </button>
        </div>
      </section>

      <section className="grid grid-cols-2 lg:grid-cols-4 gap-4">
        <StatCard label="Total Items" value={stats.total} icon={Cake} color="orange" />
        <StatCard label="Featured" value={stats.featured} icon={Star} color="amber" />
        <StatCard label="Best Sellers" value={stats.bestSellers} icon={TrendingUp} color="rose" />
        <StatCard label="Eggless" value={stats.eggless} icon={Heart} color="emerald" />
      </section>

      <section className="rounded-3xl bg-white dark:bg-neutral-900 border border-slate-200 dark:border-neutral-800 shadow-sm p-4 space-y-3">
        <div className="relative">
          <Search className="h-4 w-4 text-slate-400 absolute left-3.5 top-1/2 -translate-y-1/2" />
          <input value={search} onChange={(e) => setSearch(e.target.value)} placeholder="Search products..." className="h-11 w-full rounded-xl border-2 border-slate-200 dark:border-neutral-700 bg-white dark:bg-neutral-800 pl-10 pr-3 text-sm font-semibold focus:outline-none focus:border-orange-500" />
        </div>

        <div className="flex gap-1.5 overflow-x-auto pb-1">
          <button onClick={() => setCategoryFilter('all')} className={
            'shrink-0 px-3 py-1.5 rounded-lg text-xs font-extrabold ' +
            (categoryFilter === 'all' ? 'bg-orange-600 text-white shadow' : 'bg-slate-100 dark:bg-neutral-800 text-slate-700')
          }>All Categories</button>
          {CATEGORIES.map((c) => (
            <button key={c.value} onClick={() => setCategoryFilter(c.value)} className={
              'shrink-0 px-3 py-1.5 rounded-lg text-xs font-extrabold ' +
              (categoryFilter === c.value ? 'bg-orange-600 text-white shadow' : 'bg-slate-100 dark:bg-neutral-800 text-slate-700')
            }>{c.emoji} {c.label}</button>
          ))}
        </div>

        <div className="flex gap-1.5 flex-wrap">
          {[
            { v: 'all', label: 'All' },
            { v: 'featured', label: '⭐ Featured' },
            { v: 'popular', label: '🔥 Popular' },
            { v: 'best', label: '🏆 Best Sellers' },
            { v: 'new', label: '✨ New Arrival' },
            { v: 'seasonal', label: '🌸 Seasonal' },
          ].map((t) => (
            <button key={t.v} onClick={() => setTagFilter(t.v)} className={
              'px-3 py-1.5 rounded-lg text-xs font-extrabold ' +
              (tagFilter === t.v ? 'bg-amber-600 text-white shadow' : 'bg-slate-100 dark:bg-neutral-800 text-slate-700')
            }>{t.label}</button>
          ))}
          <div className="w-px bg-slate-200 mx-1" />
          {[
            { v: 'all', label: 'All Diets' },
            { v: 'eggless', label: '🥚 Eggless' },
            { v: 'vegan', label: '🌱 Vegan' },
            { v: 'sugar-free', label: '🍬 Sugar-free' },
          ].map((t) => (
            <button key={t.v} onClick={() => setDietaryFilter(t.v)} className={
              'px-3 py-1.5 rounded-lg text-xs font-extrabold ' +
              (dietaryFilter === t.v ? 'bg-emerald-600 text-white shadow' : 'bg-slate-100 dark:bg-neutral-800 text-slate-700')
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
          <Cake className="h-16 w-16 text-slate-400 mx-auto mb-3" />
          <p className="font-extrabold text-slate-700">No products yet</p>
          <p className="text-xs text-slate-500 mt-1">Go to Products page to add bakery items</p>
        </div>
      ) : (
        <section className="grid sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-4">
          {profiles.map((profile) => (
            <ProductCard key={profile.id} profile={profile} />
          ))}
        </section>
      )}
    </div>
  );
}

function StatCard({ label, value, icon: Icon, color }: any) {
  const colors: Record<string, string> = {
    orange: 'from-orange-500 to-red-600',
    amber: 'from-amber-500 to-orange-600',
    rose: 'from-rose-500 to-pink-600',
    emerald: 'from-emerald-500 to-green-600',
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

function ProductCard({ profile }: any) {
  const product = profile.product;
  const category = CATEGORIES.find((c) => c.value === profile.category);

  return (
    <Link
      to={'/products/' + profile.productId + '/edit'}
      className={
        'group rounded-2xl bg-white dark:bg-neutral-900 border-2 shadow-sm hover:shadow-xl hover:-translate-y-1 transition-all overflow-hidden ' +
        (profile.isFeatured ? 'border-amber-400 ring-2 ring-amber-100' : 'border-slate-200 dark:border-neutral-800')
      }
    >
      <div className="relative aspect-square bg-gradient-to-br from-orange-400 via-pink-500 to-fuchsia-600 overflow-hidden">
        {product?.images?.[0]?.url ? (
          <img src={product.images[0].url} alt="" className="w-full h-full object-cover group-hover:scale-110 transition-transform duration-500" />
        ) : profile.imageUrls?.[0] ? (
          <img src={profile.imageUrls[0]} alt="" className="w-full h-full object-cover" />
        ) : (
          <div className="w-full h-full flex items-center justify-center">
            <span className="text-6xl">{category?.emoji || '🎂'}</span>
          </div>
        )}

        <div className="absolute top-2 left-2 flex flex-col gap-1">
          {profile.isFeatured && <span className="px-1.5 py-0.5 rounded bg-amber-500 text-white text-[9px] font-extrabold uppercase inline-flex items-center gap-0.5"><Star className="h-2 w-2 fill-current" /> Featured</span>}
          {profile.isBestSeller && <span className="px-1.5 py-0.5 rounded bg-rose-500 text-white text-[9px] font-extrabold uppercase inline-flex items-center gap-0.5"><TrendingUp className="h-2 w-2" /> Best</span>}
          {profile.isPopular && <span className="px-1.5 py-0.5 rounded bg-red-500 text-white text-[9px] font-extrabold uppercase">🔥 Popular</span>}
          {profile.isNewArrival && <span className="px-1.5 py-0.5 rounded bg-emerald-500 text-white text-[9px] font-extrabold uppercase">✨ New</span>}
          {profile.isSeasonalItem && <span className="px-1.5 py-0.5 rounded bg-fuchsia-500 text-white text-[9px] font-extrabold uppercase">🌸 {profile.seasonName || 'Season'}</span>}
        </div>

        <div className="absolute top-2 right-2 flex flex-col gap-1">
          {profile.isEggless && <span className="h-6 w-6 rounded-full bg-emerald-500/90 backdrop-blur text-white flex items-center justify-center text-xs shadow" title="Eggless">🥚</span>}
          {profile.isVegan && <span className="h-6 w-6 rounded-full bg-green-600/90 backdrop-blur text-white flex items-center justify-center text-xs shadow" title="Vegan">🌱</span>}
          {profile.isSugarFree && <span className="h-6 w-6 rounded-full bg-blue-500/90 backdrop-blur text-white flex items-center justify-center text-xs shadow" title="Sugar-free">🍬</span>}
          {profile.isCakeCustomizable && <span className="h-6 w-6 rounded-full bg-fuchsia-500/90 backdrop-blur text-white flex items-center justify-center text-xs shadow" title="Customizable">✨</span>}
        </div>
      </div>

      <div className="p-3 space-y-2">
        <div>
          <h3 className="font-extrabold text-sm text-slate-900 dark:text-white line-clamp-1">{product?.name}</h3>
          {category && (
            <span className="text-[10px] font-extrabold uppercase text-orange-600">{category.emoji} {category.label}</span>
          )}
        </div>

        {(profile.prepTimeHours || profile.advanceOrderHours) && (
          <div className="flex items-center gap-2 text-[10px] text-slate-500 font-bold">
            {profile.prepTimeHours && (
              <span className="inline-flex items-center gap-0.5">
                <Clock className="h-2.5 w-2.5" />
                {profile.prepTimeHours}h prep
              </span>
            )}
            {profile.advanceOrderHours && (
              <span className="inline-flex items-center gap-0.5">
                <Package className="h-2.5 w-2.5" />
                {profile.advanceOrderHours}h advance
              </span>
            )}
          </div>
        )}

        <div className="pt-2 border-t border-slate-100 dark:border-neutral-800 space-y-1">
          {profile.pricePerKg && (
            <div className="flex items-baseline justify-between">
              <span className="text-xs text-slate-500 font-bold">Per Kg</span>
              <span className="text-lg font-extrabold text-emerald-700 tabular-nums">{formatPKR(profile.pricePerKg)}</span>
            </div>
          )}
          {profile.pricePerPound && (
            <div className="flex items-baseline justify-between">
              <span className="text-xs text-slate-500 font-bold">Per Pound</span>
              <span className="text-lg font-extrabold text-fuchsia-700 tabular-nums">{formatPKR(profile.pricePerPound)}</span>
            </div>
          )}
          {profile.pricePerPiece && (
            <div className="flex items-baseline justify-between">
              <span className="text-xs text-slate-500 font-bold">Per Piece</span>
              <span className="text-lg font-extrabold text-amber-700 tabular-nums">{formatPKR(profile.pricePerPiece)}</span>
            </div>
          )}
          {profile.pricePerDozen && (
            <div className="flex items-baseline justify-between">
              <span className="text-xs text-slate-500 font-bold">Per Dozen</span>
              <span className="text-lg font-extrabold text-orange-700 tabular-nums">{formatPKR(profile.pricePerDozen)}</span>
            </div>
          )}
        </div>

        {profile.totalOrders > 0 && (
          <div className="text-[10px] font-bold text-slate-500 text-center pt-1">
            {profile.totalOrders} orders • {formatPKR(profile.totalRevenue)}
          </div>
        )}
      </div>
    </Link>
  );
}
