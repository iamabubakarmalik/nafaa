import { useState } from 'react';
import { useQuery } from '@tanstack/react-query';
import { Link } from 'react-router-dom';
import { Milk, Search, RefreshCw, Sparkles, Star, TrendingUp, Sunrise, Sunset } from 'lucide-react';
import { dairyProductsApi, type DairyProductType } from '../api/products.api';
import { formatPKR } from '@core/lib/format';

const PRODUCT_TYPES: { value: DairyProductType; label: string; emoji: string }[] = [
  { value: 'FRESH_MILK', label: 'Fresh Milk', emoji: '🥛' },
  { value: 'BUFFALO_MILK', label: 'Buffalo', emoji: '🐃' },
  { value: 'COW_MILK', label: 'Cow', emoji: '🐄' },
  { value: 'GOAT_MILK', label: 'Goat', emoji: '🐐' },
  { value: 'YOGURT', label: 'Yogurt', emoji: '🥣' },
  { value: 'DAHI', label: 'Dahi', emoji: '🥣' },
  { value: 'LASSI', label: 'Lassi', emoji: '🥤' },
  { value: 'BUTTER', label: 'Butter', emoji: '🧈' },
  { value: 'DESI_GHEE', label: 'Desi Ghee', emoji: '🧈' },
  { value: 'CREAM', label: 'Cream', emoji: '🥛' },
  { value: 'PANEER', label: 'Paneer', emoji: '🧀' },
  { value: 'CHEESE', label: 'Cheese', emoji: '🧀' },
  { value: 'KHEER', label: 'Kheer', emoji: '🍚' },
  { value: 'KULFI', label: 'Kulfi', emoji: '🍦' },
  { value: 'ICE_CREAM', label: 'Ice Cream', emoji: '🍨' },
  { value: 'SWEETS', label: 'Sweets', emoji: '🍬' },
  { value: 'OTHER', label: 'Other', emoji: '📦' },
];

export default function DairyProductsPage() {
  const [search, setSearch] = useState('');
  const [typeFilter, setTypeFilter] = useState<string>('all');

  const { data: products = [], isLoading, refetch, isRefetching } = useQuery({
    queryKey: ['dairy-products', typeFilter, search],
    queryFn: () => dairyProductsApi.list({
      productType: typeFilter === 'all' ? undefined : typeFilter,
      search: search.trim() || undefined,
    }),
  });

  return (
    <div className="space-y-6">
      <section className="relative overflow-hidden rounded-3xl bg-gradient-to-br from-slate-950 via-fuchsia-900 to-pink-700 text-white p-6 sm:p-8 shadow-2xl">
        <div className="absolute -top-20 -right-20 h-72 w-72 rounded-full bg-fuchsia-400/20 blur-3xl" />
        <div className="relative flex flex-col lg:flex-row lg:items-center lg:justify-between gap-5">
          <div>
            <div className="inline-flex items-center gap-2 rounded-full bg-white/15 backdrop-blur px-3 py-1 text-xs font-extrabold border border-white/20">
              <Sparkles className="h-3.5 w-3.5 text-amber-300" />
              Product Catalog
            </div>
            <h1 className="mt-3 text-3xl sm:text-4xl font-extrabold leading-tight">🥛 Dairy Products</h1>
            <p className="mt-2 text-sm text-white/80 font-semibold">Milk, dahi, ghee, paneer & sweets</p>
          </div>
          <button onClick={() => refetch()} disabled={isRefetching} className="inline-flex items-center gap-2 rounded-xl bg-white/15 hover:bg-white/25 px-4 py-2.5 text-sm font-bold backdrop-blur border border-white/20">
            <RefreshCw className={'h-4 w-4 ' + (isRefetching ? 'animate-spin' : '')} />Refresh
          </button>
        </div>
      </section>

      <section className="rounded-3xl bg-white dark:bg-neutral-900 border border-slate-200 dark:border-neutral-800 shadow-sm p-4 space-y-3">
        <div className="relative">
          <Search className="h-4 w-4 text-slate-400 absolute left-3.5 top-1/2 -translate-y-1/2" />
          <input value={search} onChange={(e) => setSearch(e.target.value)} placeholder="Search products..." className="h-11 w-full rounded-xl border-2 border-slate-200 dark:border-neutral-700 bg-white dark:bg-neutral-800 pl-10 pr-3 text-sm font-semibold focus:outline-none focus:border-fuchsia-500" />
        </div>
        <div className="flex gap-1.5 overflow-x-auto pb-1">
          <button onClick={() => setTypeFilter('all')} className={
            'shrink-0 px-3 py-1.5 rounded-lg text-xs font-extrabold ' +
            (typeFilter === 'all' ? 'bg-fuchsia-600 text-white shadow' : 'bg-slate-100 dark:bg-neutral-800 text-slate-700')
          }>All</button>
          {PRODUCT_TYPES.map((t) => (
            <button key={t.value} onClick={() => setTypeFilter(t.value)} className={
              'shrink-0 px-3 py-1.5 rounded-lg text-xs font-extrabold ' +
              (typeFilter === t.value ? 'bg-fuchsia-600 text-white shadow' : 'bg-slate-100 dark:bg-neutral-800 text-slate-700')
            }>{t.emoji} {t.label}</button>
          ))}
        </div>
      </section>

      {isLoading ? (
        <div className="grid sm:grid-cols-2 lg:grid-cols-4 gap-4">
          {[1, 2, 3, 4, 5, 6, 7, 8].map((i) => <div key={i} className="h-56 rounded-2xl bg-slate-100 dark:bg-neutral-800 animate-pulse" />)}
        </div>
      ) : products.length === 0 ? (
        <div className="rounded-3xl bg-white dark:bg-neutral-900 border-2 border-dashed p-12 text-center">
          <Milk className="h-16 w-16 text-slate-400 mx-auto mb-3" />
          <p className="font-extrabold text-slate-700">No dairy products yet</p>
          <p className="text-xs text-slate-500 mt-1">Add products from Products module, then set dairy profile</p>
        </div>
      ) : (
        <section className="grid sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-4">
          {products.map((p) => {
            const type = PRODUCT_TYPES.find((t) => t.value === p.productType);
            const prod = p.product;
            return (
              <Link key={p.id} to={'/products/' + p.productId + '/edit'} className={
                'group rounded-2xl bg-white dark:bg-neutral-900 border-2 shadow-sm hover:shadow-xl hover:-translate-y-1 transition-all overflow-hidden ' +
                (p.isFeatured ? 'border-amber-400' : 'border-slate-200 dark:border-neutral-800')
              }>
                <div className="relative aspect-video bg-gradient-to-br from-fuchsia-500 to-pink-600 overflow-hidden">
                  {prod?.images?.[0]?.url ? (
                    <img src={prod.images[0].url} alt="" className="w-full h-full object-cover group-hover:scale-110 transition" />
                  ) : (
                    <div className="w-full h-full flex items-center justify-center">
                      <span className="text-5xl">{type?.emoji || '🥛'}</span>
                    </div>
                  )}
                  <div className="absolute top-2 left-2 flex flex-col gap-1">
                    {p.isFeatured && (
                      <span className="px-1.5 py-0.5 rounded bg-amber-500 text-white text-[9px] font-extrabold uppercase inline-flex items-center gap-0.5">
                        <Star className="h-2 w-2 fill-current" />Featured
                      </span>
                    )}
                    {p.isBestSeller && (
                      <span className="px-1.5 py-0.5 rounded bg-emerald-500 text-white text-[9px] font-extrabold uppercase inline-flex items-center gap-0.5">
                        <TrendingUp className="h-2 w-2" />Best
                      </span>
                    )}
                    {p.isFresh && <span className="px-1.5 py-0.5 rounded bg-cyan-500 text-white text-[9px] font-extrabold uppercase">Fresh</span>}
                    {p.isPasteurized && <span className="px-1.5 py-0.5 rounded bg-blue-500 text-white text-[9px] font-extrabold uppercase">Past.</span>}
                    {p.isOrganic && <span className="px-1.5 py-0.5 rounded bg-green-500 text-white text-[9px] font-extrabold uppercase">Organic</span>}
                  </div>
                  <div className="absolute top-2 right-2 flex flex-col gap-1">
                    {p.availableMorning && <span className="h-6 w-6 rounded-full bg-amber-500 text-white flex items-center justify-center text-xs shadow" title="Morning"><Sunrise className="h-3 w-3" /></span>}
                    {p.availableEvening && <span className="h-6 w-6 rounded-full bg-indigo-500 text-white flex items-center justify-center text-xs shadow" title="Evening"><Sunset className="h-3 w-3" /></span>}
                  </div>
                </div>

                <div className="p-3 space-y-1">
                  <h3 className="font-extrabold text-slate-900 dark:text-white line-clamp-1">{prod?.name}</h3>
                  <div className="flex items-center gap-1 text-xs text-slate-500 font-bold">
                    {type && <span>{type.label}</span>}
                    <span>• {p.unit}</span>
                  </div>

                  <div className="grid grid-cols-2 gap-1 mt-2 text-xs">
                    {p.fatContent && (
                      <div className="rounded bg-amber-50 p-1.5">
                        <div className="text-[8px] uppercase font-extrabold text-amber-700">Fat</div>
                        <div className="font-extrabold text-amber-900">{p.fatContent}%</div>
                      </div>
                    )}
                    {p.snfContent && (
                      <div className="rounded bg-blue-50 p-1.5">
                        <div className="text-[8px] uppercase font-extrabold text-blue-700">SNF</div>
                        <div className="font-extrabold text-blue-900">{p.snfContent}%</div>
                      </div>
                    )}
                  </div>

                  <div className="pt-2 border-t border-slate-100 dark:border-neutral-800 flex items-end justify-between">
                    <div>
                      <div className="text-lg font-extrabold text-emerald-700 tabular-nums">{formatPKR(prod?.price ?? 0)}</div>
                    </div>
                    <div className="text-right">
                      <div className="text-[10px] font-bold text-slate-500">Stock</div>
                      <div className="text-sm font-extrabold tabular-nums">{prod?.stock ?? 0}</div>
                    </div>
                  </div>
                </div>
              </Link>
            );
          })}
        </section>
      )}
    </div>
  );
}
