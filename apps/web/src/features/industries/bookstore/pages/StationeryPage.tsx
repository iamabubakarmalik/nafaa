import { useState } from 'react';
import { useQuery } from '@tanstack/react-query';
import { Link } from 'react-router-dom';
import {
  PenTool, Search, RefreshCw, Sparkles, Package, TrendingUp,
  School as SchoolIcon, Briefcase,
} from 'lucide-react';
import { stationeryProfilesApi, type StationeryCategory } from '../api/stationery-profiles.api';
import { formatPKR } from '@/lib/format';

const CATEGORIES: { value: StationeryCategory; label: string; emoji: string }[] = [
  { value: 'PEN_BALLPOINT', label: 'Ballpoint', emoji: '🖊️' },
  { value: 'PEN_GEL', label: 'Gel Pen', emoji: '✒️' },
  { value: 'PENCIL_HB', label: 'Pencil HB', emoji: '✏️' },
  { value: 'PENCIL_COLOR', label: 'Color Pencils', emoji: '🖍️' },
  { value: 'HIGHLIGHTER', label: 'Highlighter', emoji: '🌟' },
  { value: 'MARKER_PERMANENT', label: 'Marker', emoji: '🖊️' },
  { value: 'NOTEBOOK', label: 'Notebook', emoji: '📓' },
  { value: 'REGISTER', label: 'Register', emoji: '📕' },
  { value: 'DIARY', label: 'Diary', emoji: '📔' },
  { value: 'ERASER', label: 'Eraser', emoji: '🧽' },
  { value: 'RULER', label: 'Ruler', emoji: '📏' },
  { value: 'GEOMETRY_BOX', label: 'Geometry Box', emoji: '📐' },
  { value: 'CALCULATOR', label: 'Calculator', emoji: '🧮' },
  { value: 'SCISSORS', label: 'Scissors', emoji: '✂️' },
  { value: 'STAPLER', label: 'Stapler', emoji: '📎' },
  { value: 'GLUE', label: 'Glue', emoji: '💧' },
  { value: 'TAPE', label: 'Tape', emoji: '📼' },
  { value: 'FILE_FOLDER', label: 'File Folder', emoji: '📁' },
  { value: 'SCHOOL_BAG', label: 'School Bag', emoji: '🎒' },
  { value: 'LUNCH_BOX', label: 'Lunch Box', emoji: '🍱' },
  { value: 'WATER_BOTTLE', label: 'Water Bottle', emoji: '🍶' },
];

export default function StationeryPage() {
  const [search, setSearch] = useState('');
  const [categoryFilter, setCategoryFilter] = useState<string>('all');
  const [tagFilter, setTagFilter] = useState<string>('all');

  const { data: items = [], isLoading, refetch, isRefetching } = useQuery({
    queryKey: ['stationery', search, categoryFilter, tagFilter],
    queryFn: () => stationeryProfilesApi.list({
      search: search.trim() || undefined,
      category: categoryFilter === 'all' ? undefined : categoryFilter,
      isSchoolItem: tagFilter === 'school' ? true : undefined,
      isOfficeItem: tagFilter === 'office' ? true : undefined,
      isFastMoving: tagFilter === 'fast' ? true : undefined,
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
              School & Office Supplies
            </div>
            <h1 className="mt-3 text-3xl sm:text-4xl font-extrabold leading-tight">✏️ Stationery</h1>
            <p className="mt-2 text-sm text-white/80 font-semibold">Pens, pencils, notebooks, filing, tools</p>
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
          <input value={search} onChange={(e) => setSearch(e.target.value)} placeholder="Search stationery items..." className="h-11 w-full rounded-xl border-2 border-slate-200 dark:border-neutral-700 bg-white dark:bg-neutral-800 pl-10 pr-3 text-sm font-semibold focus:outline-none focus:border-amber-500" />
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
            }>{c.emoji} {c.label}</button>
          ))}
        </div>
        <div className="flex gap-1.5">
          {[
            { v: 'all', label: 'All' },
            { v: 'school', label: '🎒 School Items' },
            { v: 'office', label: '💼 Office Items' },
            { v: 'fast', label: '🔥 Fast Moving' },
          ].map((t) => (
            <button key={t.v} onClick={() => setTagFilter(t.v)} className={
              'px-3 py-1.5 rounded-lg text-xs font-extrabold ' +
              (tagFilter === t.v ? 'bg-orange-600 text-white shadow' : 'bg-slate-100 dark:bg-neutral-800 text-slate-700')
            }>{t.label}</button>
          ))}
        </div>
      </section>

      {isLoading ? (
        <div className="grid sm:grid-cols-2 lg:grid-cols-4 gap-4">
          {[1, 2, 3, 4, 5, 6, 7, 8].map((i) => <div key={i} className="h-64 rounded-2xl bg-slate-100 dark:bg-neutral-800 animate-pulse" />)}
        </div>
      ) : items.length === 0 ? (
        <div className="rounded-3xl bg-white dark:bg-neutral-900 border-2 border-dashed p-12 text-center">
          <PenTool className="h-16 w-16 text-slate-400 mx-auto mb-3" />
          <p className="font-extrabold text-slate-700">No stationery items yet</p>
        </div>
      ) : (
        <section className="grid sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-4">
          {items.map((item) => {
            const cat = CATEGORIES.find((c) => c.value === item.category);
            return (
              <Link key={item.id} to={'/products/' + item.productId + '/edit'} className="group rounded-2xl bg-white dark:bg-neutral-900 border-2 border-slate-200 dark:border-neutral-800 shadow-sm hover:shadow-xl transition overflow-hidden">
                <div className="aspect-square bg-gradient-to-br from-amber-500 to-orange-600 overflow-hidden">
                  {item.product?.images?.[0]?.url ? (
                    <img src={item.product.images[0].url} alt="" className="w-full h-full object-cover" />
                  ) : (
                    <div className="w-full h-full flex items-center justify-center text-6xl">{cat?.emoji || '📎'}</div>
                  )}
                </div>
                <div className="p-3 space-y-1">
                  <h3 className="font-extrabold text-sm text-slate-900 dark:text-white line-clamp-1">{item.product?.name}</h3>
                  <div className="text-[10px] font-extrabold uppercase text-amber-600">{cat?.label}</div>
                  <div className="flex flex-wrap gap-1">
                    {item.brand && <span className="px-1.5 py-0.5 rounded bg-blue-100 text-blue-700 text-[9px] font-extrabold uppercase">{item.brand}</span>}
                    {item.color && <span className="px-1.5 py-0.5 rounded bg-slate-100 text-slate-700 text-[9px] font-extrabold uppercase">{item.color}</span>}
                    {item.isSchoolItem && <span className="px-1.5 py-0.5 rounded bg-emerald-100 text-emerald-700 text-[9px] font-extrabold uppercase">🎒 School</span>}
                    {item.isOfficeItem && <span className="px-1.5 py-0.5 rounded bg-violet-100 text-violet-700 text-[9px] font-extrabold uppercase">💼 Office</span>}
                    {item.isFastMoving && <span className="px-1.5 py-0.5 rounded bg-rose-100 text-rose-700 text-[9px] font-extrabold uppercase">🔥 Fast</span>}
                  </div>
                  {item.packSize && (
                    <div className="text-[10px] font-bold text-slate-500">Pack of {item.packSize} {item.packUnit}</div>
                  )}
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
