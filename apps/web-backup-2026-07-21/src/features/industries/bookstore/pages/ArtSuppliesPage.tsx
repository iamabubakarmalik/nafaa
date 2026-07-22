import { useState } from 'react';
import { useQuery } from '@tanstack/react-query';
import { Link } from 'react-router-dom';
import { Palette, Search, RefreshCw, Sparkles, Star, Award } from 'lucide-react';
import { artSupplyProfilesApi, type ArtSupplyCategory } from '../api/art-supply-profiles.api';
import { formatPKR } from '@/lib/format';

const CATEGORIES: { value: ArtSupplyCategory; label: string; emoji: string }[] = [
  { value: 'CANVAS_STRETCHED', label: 'Canvas', emoji: '🖼️' },
  { value: 'ACRYLIC_PAINT', label: 'Acrylic Paint', emoji: '🎨' },
  { value: 'OIL_PAINT', label: 'Oil Paint', emoji: '🖌️' },
  { value: 'WATERCOLOR_PAINT', label: 'Watercolor', emoji: '💧' },
  { value: 'POSTER_PAINT', label: 'Poster Paint', emoji: '🎭' },
  { value: 'FABRIC_PAINT', label: 'Fabric Paint', emoji: '👕' },
  { value: 'BRUSH_FLAT', label: 'Flat Brush', emoji: '🖌️' },
  { value: 'BRUSH_ROUND', label: 'Round Brush', emoji: '🖌️' },
  { value: 'BRUSH_SET', label: 'Brush Set', emoji: '🎨' },
  { value: 'CHARCOAL', label: 'Charcoal', emoji: '⚫' },
  { value: 'PASTEL_OIL', label: 'Oil Pastel', emoji: '🖍️' },
  { value: 'PASTEL_SOFT', label: 'Soft Pastel', emoji: '🎨' },
  { value: 'GRAPHITE', label: 'Graphite', emoji: '✏️' },
  { value: 'CLAY', label: 'Clay', emoji: '🏺' },
  { value: 'MODELING_CLAY', label: 'Modeling Clay', emoji: '🎭' },
  { value: 'EASEL', label: 'Easel', emoji: '🖼️' },
  { value: 'PALETTE', label: 'Palette', emoji: '🎨' },
  { value: 'SKETCH_PAPER', label: 'Sketch Paper', emoji: '📄' },
  { value: 'CALLIGRAPHY_PEN', label: 'Calligraphy Pen', emoji: '✒️' },
  { value: 'QALAM', label: 'Qalam', emoji: '🖋️' },
];

export default function ArtSuppliesPage() {
  const [search, setSearch] = useState('');
  const [categoryFilter, setCategoryFilter] = useState<string>('all');
  const [tagFilter, setTagFilter] = useState<string>('all');

  const { data: items = [], isLoading, refetch, isRefetching } = useQuery({
    queryKey: ['art-supplies', search, categoryFilter, tagFilter],
    queryFn: () => artSupplyProfilesApi.list({
      search: search.trim() || undefined,
      category: categoryFilter === 'all' ? undefined : categoryFilter,
      isProfessional: tagFilter === 'pro' ? true : undefined,
      isBeginner: tagFilter === 'beginner' ? true : undefined,
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
              Creative Supplies
            </div>
            <h1 className="mt-3 text-3xl sm:text-4xl font-extrabold leading-tight">🎨 Art Supplies</h1>
            <p className="mt-2 text-sm text-white/80 font-semibold">Canvas, paints, brushes, pastels, calligraphy</p>
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
          <input value={search} onChange={(e) => setSearch(e.target.value)} placeholder="Search art supplies..." className="h-11 w-full rounded-xl border-2 border-slate-200 dark:border-neutral-700 bg-white dark:bg-neutral-800 pl-10 pr-3 text-sm font-semibold focus:outline-none focus:border-fuchsia-500" />
        </div>
        <div className="flex gap-1.5 overflow-x-auto pb-1">
          <button onClick={() => setCategoryFilter('all')} className={
            'shrink-0 px-3 py-1.5 rounded-lg text-xs font-extrabold ' +
            (categoryFilter === 'all' ? 'bg-fuchsia-600 text-white shadow' : 'bg-slate-100 dark:bg-neutral-800 text-slate-700')
          }>All</button>
          {CATEGORIES.map((c) => (
            <button key={c.value} onClick={() => setCategoryFilter(c.value)} className={
              'shrink-0 px-3 py-1.5 rounded-lg text-xs font-extrabold ' +
              (categoryFilter === c.value ? 'bg-fuchsia-600 text-white shadow' : 'bg-slate-100 dark:bg-neutral-800 text-slate-700')
            }>{c.emoji} {c.label}</button>
          ))}
        </div>
        <div className="flex gap-1.5">
          {[
            { v: 'all', label: 'All Grades' },
            { v: 'pro', label: '🎨 Professional' },
            { v: 'beginner', label: '📚 Beginner' },
          ].map((t) => (
            <button key={t.v} onClick={() => setTagFilter(t.v)} className={
              'px-3 py-1.5 rounded-lg text-xs font-extrabold ' +
              (tagFilter === t.v ? 'bg-purple-600 text-white shadow' : 'bg-slate-100 dark:bg-neutral-800 text-slate-700')
            }>{t.label}</button>
          ))}
        </div>
      </section>

      {isLoading ? (
        <div className="grid sm:grid-cols-2 lg:grid-cols-4 gap-4">
          {[1, 2, 3, 4].map((i) => <div key={i} className="h-64 rounded-2xl bg-slate-100 dark:bg-neutral-800 animate-pulse" />)}
        </div>
      ) : items.length === 0 ? (
        <div className="rounded-3xl bg-white dark:bg-neutral-900 border-2 border-dashed p-12 text-center">
          <Palette className="h-16 w-16 text-slate-400 mx-auto mb-3" />
          <p className="font-extrabold text-slate-700">No art supplies yet</p>
        </div>
      ) : (
        <section className="grid sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-4">
          {items.map((item) => {
            const cat = CATEGORIES.find((c) => c.value === item.category);
            return (
              <Link key={item.id} to={'/products/' + item.productId + '/edit'} className="group rounded-2xl bg-white dark:bg-neutral-900 border-2 border-slate-200 dark:border-neutral-800 shadow-sm hover:shadow-xl transition overflow-hidden">
                <div className="aspect-square bg-gradient-to-br from-fuchsia-500 to-pink-600 overflow-hidden relative">
                  {item.product?.images?.[0]?.url ? (
                    <img src={item.product.images[0].url} alt="" className="w-full h-full object-cover" />
                  ) : (
                    <div className="w-full h-full flex items-center justify-center text-6xl">{cat?.emoji || '🎨'}</div>
                  )}
                  {item.color && item.colorCode && (
                    <div className="absolute bottom-2 left-2 flex items-center gap-1 px-2 py-1 rounded-lg bg-slate-900/70 backdrop-blur text-white text-[10px] font-bold shadow">
                      <div className="h-3 w-3 rounded-full ring-2 ring-white" style={{ backgroundColor: item.colorCode }} />
                      {item.color}
                    </div>
                  )}
                  {item.isProfessional && (
                    <span className="absolute top-2 left-2 px-1.5 py-0.5 rounded bg-purple-500 text-white text-[9px] font-extrabold uppercase shadow">PRO</span>
                  )}
                </div>
                <div className="p-3 space-y-1">
                  <h3 className="font-extrabold text-sm text-slate-900 dark:text-white line-clamp-1">{item.product?.name}</h3>
                  <div className="text-[10px] font-extrabold uppercase text-fuchsia-600">{cat?.label}</div>
                  <div className="flex flex-wrap gap-1">
                    {item.brand && <span className="px-1.5 py-0.5 rounded bg-blue-100 text-blue-700 text-[9px] font-extrabold uppercase">{item.brand}</span>}
                    {item.grade && <span className="px-1.5 py-0.5 rounded bg-amber-100 text-amber-700 text-[9px] font-extrabold uppercase">{item.grade}</span>}
                    {item.volume && <span className="px-1.5 py-0.5 rounded bg-slate-100 text-slate-700 text-[9px] font-extrabold uppercase">{item.volume}</span>}
                  </div>
                  <div className="pt-1 flex items-end justify-between">
                    <div className="text-lg font-extrabold text-emerald-700 tabular-nums">{formatPKR(item.product?.price ?? 0)}</div>
                    <div className="text-[10px] font-extrabold text-slate-500">Stock: {item.product?.stock ?? 0}</div>
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
