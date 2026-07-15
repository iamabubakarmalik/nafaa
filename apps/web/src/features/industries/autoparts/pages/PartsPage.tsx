import { useState } from 'react';
import { useQuery } from '@tanstack/react-query';
import { Link } from 'react-router-dom';
import {
  Package, Search, RefreshCw, Sparkles, Zap, Award, Star,
  ShieldCheck, TrendingUp, AlertCircle,
} from 'lucide-react';
import { partProfilesApi, type PartCategory, type PartCondition } from '../api/part-profiles.api';
import { formatPKR } from '@/lib/format';

const CATEGORIES: { value: PartCategory; label: string; emoji: string }[] = [
  { value: 'ENGINE', label: 'Engine', emoji: '⚙️' },
  { value: 'BRAKES', label: 'Brakes', emoji: '🛑' },
  { value: 'SUSPENSION', label: 'Suspension', emoji: '🔧' },
  { value: 'ELECTRICAL', label: 'Electrical', emoji: '⚡' },
  { value: 'BATTERY', label: 'Battery', emoji: '🔋' },
  { value: 'COOLING', label: 'Cooling', emoji: '❄️' },
  { value: 'FILTERS', label: 'Filters', emoji: '🌀' },
  { value: 'OILS_FLUIDS', label: 'Oils/Fluids', emoji: '🛢️' },
  { value: 'TIRES_WHEELS', label: 'Tires/Wheels', emoji: '🛞' },
  { value: 'LIGHTING', label: 'Lighting', emoji: '💡' },
  { value: 'AC_HEATING', label: 'A/C', emoji: '❄️' },
  { value: 'BODY', label: 'Body', emoji: '🚗' },
  { value: 'OTHER', label: 'Other', emoji: '📦' },
];

const CONDITIONS: PartCondition[] = ['NEW', 'USED', 'REFURBISHED', 'GENUINE', 'OEM', 'AFTERMARKET', 'LOCAL'];

export default function PartsPage() {
  const [search, setSearch] = useState('');
  const [categoryFilter, setCategoryFilter] = useState<string>('all');
  const [conditionFilter, setConditionFilter] = useState<string>('all');
  const [tagFilter, setTagFilter] = useState<string>('all');

  const { data: parts = [], isLoading, refetch, isRefetching } = useQuery({
    queryKey: ['auto-parts', search, categoryFilter, conditionFilter, tagFilter],
    queryFn: () => partProfilesApi.list({
      search: search.trim() || undefined,
      category: categoryFilter === 'all' ? undefined : categoryFilter,
      condition: conditionFilter === 'all' ? undefined : conditionFilter,
      fastMoving: tagFilter === 'fast' ? true : undefined,
      critical: tagFilter === 'critical' ? true : undefined,
    }),
  });

  return (
    <div className="space-y-6">
      <section className="relative overflow-hidden rounded-3xl bg-gradient-to-br from-slate-950 via-amber-900 to-orange-700 text-white p-6 sm:p-8 shadow-2xl">
        <div className="absolute -top-20 -right-20 h-72 w-72 rounded-full bg-amber-400/20 blur-3xl" />
        <div className="relative flex flex-col lg:flex-row lg:items-center lg:justify-between gap-5">
          <div>
            <div className="inline-flex items-center gap-2 rounded-full bg-white/15 backdrop-blur px-3 py-1 text-xs font-extrabold border border-white/20">
              <Sparkles className="h-3.5 w-3.5 text-amber-300" />
              Spare Parts Catalog
            </div>
            <h1 className="mt-3 text-3xl sm:text-4xl font-extrabold leading-tight">📦 Parts Catalog</h1>
            <p className="mt-2 text-sm text-white/80 font-semibold">Complete inventory with part numbers & compatibility</p>
          </div>
          <button onClick={() => refetch()} disabled={isRefetching} className="inline-flex items-center gap-2 rounded-xl bg-white/15 hover:bg-white/25 px-4 py-2.5 text-sm font-bold backdrop-blur border border-white/20">
            <RefreshCw className={'h-4 w-4 ' + (isRefetching ? 'animate-spin' : '')} />
            Refresh
          </button>
        </div>
      </section>

      <section className="rounded-3xl bg-white dark:bg-neutral-900 border border-slate-200 dark:border-neutral-800 shadow-sm p-4 space-y-3">
        <div className="relative">
          <Search className="h-4 w-4 text-slate-400 absolute left-3.5 top-1/2 -translate-y-1/2" />
          <input value={search} onChange={(e) => setSearch(e.target.value)} placeholder="Search by name, part #, OEM #, brand..." className="h-11 w-full rounded-xl border-2 border-slate-200 dark:border-neutral-700 bg-white dark:bg-neutral-800 pl-10 pr-3 text-sm font-semibold focus:outline-none focus:border-amber-500" />
        </div>
        <div className="flex gap-1.5 overflow-x-auto pb-1">
          <button onClick={() => setCategoryFilter('all')} className={
            'shrink-0 px-3 py-1.5 rounded-lg text-xs font-extrabold ' +
            (categoryFilter === 'all' ? 'bg-amber-600 text-white shadow' : 'bg-slate-100 dark:bg-neutral-800 text-slate-700')
          }>All Categories</button>
          {CATEGORIES.map((c) => (
            <button key={c.value} onClick={() => setCategoryFilter(c.value)} className={
              'shrink-0 px-3 py-1.5 rounded-lg text-xs font-extrabold ' +
              (categoryFilter === c.value ? 'bg-amber-600 text-white shadow' : 'bg-slate-100 dark:bg-neutral-800 text-slate-700')
            }>
              {c.emoji} {c.label}
            </button>
          ))}
        </div>
        <div className="flex gap-1.5 flex-wrap">
          <select value={conditionFilter} onChange={(e) => setConditionFilter(e.target.value)} className="h-9 rounded-lg border-2 border-slate-200 dark:border-neutral-700 bg-white dark:bg-neutral-800 px-3 text-xs font-bold focus:outline-none focus:border-amber-500">
            <option value="all">All Conditions</option>
            {CONDITIONS.map((c) => <option key={c} value={c}>{c}</option>)}
          </select>
          {[
            { v: 'all', label: 'All' },
            { v: 'fast', label: '🔥 Fast Moving' },
            { v: 'critical', label: '⚠️ Critical' },
          ].map((t) => (
            <button key={t.v} onClick={() => setTagFilter(t.v)} className={
              'px-3 py-1.5 rounded-lg text-xs font-extrabold ' +
              (tagFilter === t.v ? 'bg-orange-600 text-white shadow' : 'bg-slate-100 dark:bg-neutral-800 text-slate-700')
            }>{t.label}</button>
          ))}
        </div>
      </section>

      {isLoading ? (
        <div className="grid sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-4">
          {[1, 2, 3, 4, 5, 6, 7, 8].map((i) => <div key={i} className="h-72 rounded-2xl bg-slate-100 dark:bg-neutral-800 animate-pulse" />)}
        </div>
      ) : parts.length === 0 ? (
        <div className="rounded-3xl bg-white dark:bg-neutral-900 border-2 border-dashed p-12 text-center">
          <Package className="h-16 w-16 text-slate-400 mx-auto mb-3" />
          <p className="font-extrabold text-slate-700">No parts found</p>
          <p className="text-xs text-slate-500 mt-1">Go to Products page to add auto part profiles</p>
        </div>
      ) : (
        <section className="grid sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-4">
          {parts.map((part) => {
            const cat = CATEGORIES.find((c) => c.value === part.category);
            return (
              <Link key={part.id} to={'/products/' + part.productId + '/edit'} className="group rounded-2xl bg-white dark:bg-neutral-900 border-2 border-slate-200 dark:border-neutral-800 shadow-sm hover:shadow-xl transition overflow-hidden">
                <div className="relative aspect-video bg-gradient-to-br from-amber-500 to-orange-600 overflow-hidden">
                  {part.product?.images?.[0]?.url ? (
                    <img src={part.product.images[0].url} alt="" className="w-full h-full object-cover" />
                  ) : (
                    <div className="w-full h-full flex items-center justify-center text-5xl">{cat?.emoji || '📦'}</div>
                  )}
                  <div className="absolute top-2 left-2 flex gap-1 flex-wrap">
                    {part.isFastMoving && (
                      <span className="px-1.5 py-0.5 rounded bg-red-500 text-white text-[9px] font-extrabold uppercase inline-flex items-center gap-0.5 shadow">
                        <TrendingUp className="h-2 w-2" />
                        FAST
                      </span>
                    )}
                    {part.isCritical && (
                      <span className="px-1.5 py-0.5 rounded bg-rose-600 text-white text-[9px] font-extrabold uppercase inline-flex items-center gap-0.5 shadow">
                        <AlertCircle className="h-2 w-2" />
                        CRITICAL
                      </span>
                    )}
                    {part.condition === 'GENUINE' && (
                      <span className="px-1.5 py-0.5 rounded bg-emerald-500 text-white text-[9px] font-extrabold uppercase shadow">GENUINE</span>
                    )}
                  </div>
                </div>
                <div className="p-4 space-y-2">
                  <div>
                    <h3 className="font-extrabold text-slate-900 dark:text-white line-clamp-1">{part.product?.name}</h3>
                    <div className="text-[10px] font-extrabold uppercase text-amber-600">{cat?.label}</div>
                  </div>
                  {(part.partNumber || part.oemNumber) && (
                    <div className="space-y-0.5">
                      {part.partNumber && <div className="text-[10px] font-mono font-bold text-slate-600">Part: {part.partNumber}</div>}
                      {part.oemNumber && <div className="text-[10px] font-mono font-bold text-slate-500">OEM: {part.oemNumber}</div>}
                    </div>
                  )}
                  <div className="flex flex-wrap gap-1">
                    <span className="px-1.5 py-0.5 rounded bg-slate-100 dark:bg-neutral-800 text-slate-700 text-[9px] font-extrabold uppercase">{part.condition}</span>
                    {part.brand && <span className="px-1.5 py-0.5 rounded bg-blue-100 text-blue-700 text-[9px] font-extrabold uppercase">{part.brand}</span>}
                    {part.warrantyMonths > 0 && (
                      <span className="px-1.5 py-0.5 rounded bg-emerald-100 text-emerald-700 text-[9px] font-extrabold uppercase inline-flex items-center gap-0.5">
                        <ShieldCheck className="h-2 w-2" />
                        {part.warrantyMonths}m
                      </span>
                    )}
                  </div>
                  <div className="pt-2 border-t border-slate-100 dark:border-neutral-800 flex items-end justify-between">
                    <div className="text-lg font-extrabold text-emerald-700 tabular-nums">{formatPKR(part.product?.price ?? 0)}</div>
                    <div className="text-right">
                      <div className="text-[10px] font-extrabold text-slate-500">Stock: {part.product?.stock ?? 0}</div>
                      {part.totalInstalled > 0 && (
                        <div className="text-[10px] font-bold text-slate-500">Installed: {part.totalInstalled}</div>
                      )}
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
