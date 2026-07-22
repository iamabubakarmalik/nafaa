import { useState } from 'react';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { Link } from 'react-router-dom';
import {
  Palette, Plus, Search, X, Save, Edit3, Trash2, RefreshCw, Sparkles,
  Star, Calendar, Package, Eye, EyeOff, TrendingUp, Award, Image as ImageIcon,
} from 'lucide-react';
import { collectionsApi, type GarmentCollection, type GarmentSeason } from '../api/collections.api';
import { formatPKR } from '@core/lib/format';
import { Button } from '@core/ui/Button';
import { UploadDropzone } from '@core/components/uploads';
import { toast } from 'sonner';
import { format } from 'date-fns';

const SEASONS: { value: GarmentSeason; label: string; emoji: string; gradient: string }[] = [
  { value: 'SPRING', label: 'Spring', emoji: '🌸', gradient: 'from-pink-400 to-rose-400' },
  { value: 'SUMMER', label: 'Summer', emoji: '☀️', gradient: 'from-amber-400 to-orange-500' },
  { value: 'AUTUMN', label: 'Autumn', emoji: '🍂', gradient: 'from-orange-500 to-red-600' },
  { value: 'WINTER', label: 'Winter', emoji: '❄️', gradient: 'from-blue-400 to-cyan-500' },
  { value: 'ALL_SEASON', label: 'All Season', emoji: '🌍', gradient: 'from-emerald-400 to-teal-500' },
  { value: 'EID_COLLECTION', label: 'Eid Collection', emoji: '🌙', gradient: 'from-purple-500 to-violet-600' },
  { value: 'WEDDING_COLLECTION', label: 'Wedding', emoji: '💒', gradient: 'from-rose-500 to-pink-600' },
  { value: 'FESTIVE_COLLECTION', label: 'Festive', emoji: '🎉', gradient: 'from-fuchsia-500 to-pink-600' },
  { value: 'RAMADAN_COLLECTION', label: 'Ramadan', emoji: '🕌', gradient: 'from-indigo-500 to-purple-600' },
  { value: 'SCHOOL_COLLECTION', label: 'School', emoji: '🎒', gradient: 'from-blue-500 to-indigo-600' },
];

export default function CollectionsPage() {
  const queryClient = useQueryClient();
  const [search, setSearch] = useState('');
  const [seasonFilter, setSeasonFilter] = useState<string>('all');
  const [showForm, setShowForm] = useState(false);
  const [editing, setEditing] = useState<GarmentCollection | null>(null);

  const { data: collections = [], isLoading, refetch, isRefetching } = useQuery({
    queryKey: ['collections', seasonFilter, search],
    queryFn: () => collectionsApi.list({
      season: seasonFilter === 'all' ? undefined : seasonFilter,
      search: search.trim() || undefined,
      active: true,
    }),
  });

  const toggleMutation = useMutation({
    mutationFn: (id: string) => collectionsApi.toggleFeatured(id),
    onSuccess: () => queryClient.invalidateQueries({ queryKey: ['collections'] }),
  });

  const removeMutation = useMutation({
    mutationFn: (id: string) => collectionsApi.remove(id),
    onSuccess: () => {
      toast.success('Collection deactivated');
      queryClient.invalidateQueries({ queryKey: ['collections'] });
    },
  });

  return (
    <div className="space-y-6">
      {/* HERO */}
      <section className="relative overflow-hidden rounded-3xl bg-gradient-to-br from-slate-950 via-fuchsia-900 to-pink-700 text-white p-6 sm:p-8 shadow-2xl">
        <div className="absolute -top-20 -right-20 h-72 w-72 rounded-full bg-fuchsia-400/20 blur-3xl" />
        <div className="absolute -bottom-20 -left-20 h-72 w-72 rounded-full bg-pink-400/15 blur-3xl" />

        <div className="relative flex flex-col lg:flex-row lg:items-center lg:justify-between gap-5">
          <div>
            <div className="inline-flex items-center gap-2 rounded-full bg-white/15 backdrop-blur px-3 py-1 text-xs font-extrabold border border-white/20">
              <Sparkles className="h-3.5 w-3.5 text-amber-300" />
              Seasonal Collections
            </div>
            <h1 className="mt-3 text-3xl sm:text-4xl font-extrabold leading-tight">
              🎨 Collections
            </h1>
            <p className="mt-2 text-sm text-white/80 font-semibold">
              Eid, Summer Lawn, Winter, Wedding — sab collections yahaan
            </p>
          </div>
          <div className="flex items-center gap-2 flex-wrap">
            <button
              onClick={() => refetch()}
              disabled={isRefetching}
              className="inline-flex items-center gap-2 rounded-xl bg-white/15 hover:bg-white/25 px-4 py-2.5 text-sm font-bold backdrop-blur border border-white/20"
            >
              <RefreshCw className={'h-4 w-4 ' + (isRefetching ? 'animate-spin' : '')} />
              Refresh
            </button>
            <Button
              className="bg-white text-slate-900 hover:bg-slate-100"
              onClick={() => { setEditing(null); setShowForm(true); }}
            >
              <Plus className="h-4 w-4" />
              New Collection
            </Button>
          </div>
        </div>
      </section>

      {/* FILTERS */}
      <section className="rounded-3xl bg-white dark:bg-neutral-900 border border-slate-200 dark:border-neutral-800 shadow-sm p-4 space-y-3">
        <div className="relative">
          <Search className="h-4 w-4 text-slate-400 absolute left-3.5 top-1/2 -translate-y-1/2" />
          <input
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            placeholder="Search collections..."
            className="h-11 w-full rounded-xl border-2 border-slate-200 dark:border-neutral-700 bg-white dark:bg-neutral-800 pl-10 pr-10 text-sm font-semibold focus:outline-none focus:border-fuchsia-500"
          />
          {search && (
            <button onClick={() => setSearch('')} className="absolute right-3 top-1/2 -translate-y-1/2 text-slate-400">
              <X className="h-4 w-4" />
            </button>
          )}
        </div>

        <div className="flex gap-1.5 overflow-x-auto pb-1">
          <button
            onClick={() => setSeasonFilter('all')}
            className={
              'shrink-0 px-3 py-1.5 rounded-lg text-xs font-extrabold transition ' +
              (seasonFilter === 'all' ? 'bg-fuchsia-600 text-white shadow' : 'bg-slate-100 dark:bg-neutral-800 text-slate-700')
            }
          >
            All Seasons
          </button>
          {SEASONS.map((s) => (
            <button
              key={s.value}
              onClick={() => setSeasonFilter(s.value)}
              className={
                'shrink-0 px-3 py-1.5 rounded-lg text-xs font-extrabold transition ' +
                (seasonFilter === s.value ? 'bg-fuchsia-600 text-white shadow' : 'bg-slate-100 dark:bg-neutral-800 text-slate-700')
              }
            >
              {s.emoji} {s.label}
            </button>
          ))}
        </div>
      </section>

      {showForm && (
        <CollectionForm
          editing={editing}
          onClose={() => { setShowForm(false); setEditing(null); }}
          onSaved={() => {
            setShowForm(false);
            setEditing(null);
            queryClient.invalidateQueries({ queryKey: ['collections'] });
          }}
        />
      )}

      {isLoading ? (
        <div className="grid sm:grid-cols-2 lg:grid-cols-3 gap-4">
          {[1, 2, 3, 4, 5, 6].map((i) => <div key={i} className="h-80 rounded-3xl bg-slate-100 dark:bg-neutral-800 animate-pulse" />)}
        </div>
      ) : collections.length === 0 ? (
        <div className="rounded-3xl bg-white dark:bg-neutral-900 border-2 border-dashed border-slate-200 dark:border-neutral-800 p-12 text-center">
          <div className="h-20 w-20 rounded-3xl bg-fuchsia-100 dark:bg-fuchsia-950/40 mx-auto flex items-center justify-center">
            <Palette className="h-10 w-10 text-fuchsia-600" />
          </div>
          <h3 className="mt-4 text-lg font-extrabold text-slate-900 dark:text-white">No collections yet</h3>
          <p className="mt-1 text-sm text-slate-500 font-semibold">Pehla seasonal collection banao</p>
          <Button
            className="mt-4 bg-gradient-to-r from-fuchsia-600 to-pink-700"
            onClick={() => { setEditing(null); setShowForm(true); }}
          >
            <Plus className="h-4 w-4" />
            Create First Collection
          </Button>
        </div>
      ) : (
        <section className="grid sm:grid-cols-2 lg:grid-cols-3 gap-4">
          {collections.map((collection) => (
            <CollectionCard
              key={collection.id}
              collection={collection}
              onEdit={() => { setEditing(collection); setShowForm(true); }}
              onToggleFeatured={() => toggleMutation.mutate(collection.id)}
              onDelete={() => {
                if (confirm('Deactivate "' + collection.name + '"?')) removeMutation.mutate(collection.id);
              }}
            />
          ))}
        </section>
      )}
    </div>
  );
}

function CollectionCard({ collection, onEdit, onToggleFeatured, onDelete }: {
  collection: GarmentCollection;
  onEdit: () => void;
  onToggleFeatured: () => void;
  onDelete: () => void;
}) {
  const season = SEASONS.find((s) => s.value === collection.season);

  return (
    <div className={
      'group rounded-3xl bg-white dark:bg-neutral-900 border-2 shadow-sm hover:shadow-xl hover:-translate-y-1 transition-all overflow-hidden ' +
      (collection.isFeatured ? 'border-amber-400 ring-2 ring-amber-100 dark:ring-amber-950/40' : 'border-slate-200 dark:border-neutral-800')
    }>
      {/* Cover */}
      <div className={'relative aspect-[16/9] overflow-hidden bg-gradient-to-br ' + (season?.gradient ?? 'from-fuchsia-500 to-pink-600')}>
        {collection.coverImageUrl ? (
          <img src={collection.coverImageUrl} alt={collection.name} className="w-full h-full object-cover" />
        ) : (
          <div className="w-full h-full flex items-center justify-center">
            <span className="text-6xl">{season?.emoji || '👗'}</span>
          </div>
        )}

        {/* Badges */}
        <div className="absolute top-3 left-3 flex gap-1 flex-wrap">
          {collection.isFeatured && (
            <span className="px-2 py-0.5 rounded-md bg-amber-500 text-white text-[9px] font-extrabold uppercase inline-flex items-center gap-0.5 shadow">
              <Star className="h-2 w-2 fill-current" />
              Featured
            </span>
          )}
          <span className="px-2 py-0.5 rounded-md bg-slate-900/80 backdrop-blur text-white text-[9px] font-extrabold uppercase shadow">
            {season?.label}
          </span>
        </div>

        {/* Featured toggle */}
        <button
          onClick={onToggleFeatured}
          className={
            'absolute top-3 right-3 h-8 w-8 rounded-lg backdrop-blur flex items-center justify-center transition shadow-lg ' +
            (collection.isFeatured ? 'bg-amber-500 text-white' : 'bg-slate-900/60 text-white hover:bg-amber-500')
          }
        >
          <Star className={'h-4 w-4 ' + (collection.isFeatured ? 'fill-current' : '')} />
        </button>

        {/* Hover actions */}
        <div className="absolute bottom-3 right-3 opacity-0 group-hover:opacity-100 transition-opacity flex gap-1">
          <button
            onClick={onEdit}
            className="h-8 w-8 rounded-lg bg-slate-900/90 text-white flex items-center justify-center hover:bg-slate-900 shadow"
          >
            <Edit3 className="h-3.5 w-3.5" />
          </button>
          <button
            onClick={onDelete}
            className="h-8 w-8 rounded-lg bg-rose-600/90 text-white flex items-center justify-center hover:bg-rose-600 shadow"
          >
            <Trash2 className="h-3.5 w-3.5" />
          </button>
        </div>
      </div>

      {/* Body */}
      <div className="p-4 space-y-2">
        <div>
          <h3 className="font-extrabold text-slate-900 dark:text-white text-lg leading-tight">{collection.name}</h3>
          {collection.code && (
            <div className="text-[10px] font-mono font-bold text-slate-500">{collection.code}</div>
          )}
          {collection.year && (
            <div className="text-xs font-extrabold text-fuchsia-600 mt-0.5">{collection.year}</div>
          )}
        </div>

        {collection.description && (
          <p className="text-xs text-slate-500 dark:text-slate-400 font-semibold line-clamp-2">{collection.description}</p>
        )}

        {(collection.launchDate || collection.endDate) && (
          <div className="text-xs text-slate-500 font-bold inline-flex items-center gap-1">
            <Calendar className="h-3 w-3" />
            {collection.launchDate && format(new Date(collection.launchDate), 'dd MMM')}
            {collection.launchDate && collection.endDate && ' – '}
            {collection.endDate && format(new Date(collection.endDate), 'dd MMM yyyy')}
          </div>
        )}

        <div className="pt-2 border-t border-slate-100 dark:border-neutral-800 flex items-center justify-between">
          <span className="inline-flex items-center gap-1 text-xs text-slate-600 font-bold">
            <Package className="h-3 w-3" />
            {collection.totalProducts || 0} products
          </span>
          {collection.totalSales > 0 && (
            <span className="text-xs font-extrabold text-emerald-700 tabular-nums inline-flex items-center gap-1">
              <TrendingUp className="h-3 w-3" />
              {formatPKR(collection.totalSales)}
            </span>
          )}
        </div>
      </div>
    </div>
  );
}

function CollectionForm({ editing, onClose, onSaved }: {
  editing: GarmentCollection | null;
  onClose: () => void;
  onSaved: () => void;
}) {
  const [form, setForm] = useState({
    name: editing?.name ?? '',
    code: editing?.code ?? '',
    description: editing?.description ?? '',
    season: editing?.season ?? ('ALL_SEASON' as GarmentSeason),
    year: editing?.year ?? new Date().getFullYear(),
    launchDate: editing?.launchDate ? editing.launchDate.slice(0, 10) : '',
    endDate: editing?.endDate ? editing.endDate.slice(0, 10) : '',
    coverImageUrl: editing?.coverImageUrl ?? '',
    bannerImageUrl: editing?.bannerImageUrl ?? '',
    colorTheme: editing?.colorTheme ?? '',
    isFeatured: editing?.isFeatured ?? false,
    displayOrder: editing?.displayOrder ?? 0,
  });

  const saveMutation = useMutation({
    mutationFn: () => {
      const payload: any = {
        ...form,
        year: form.year ? Number(form.year) : undefined,
        launchDate: form.launchDate || undefined,
        endDate: form.endDate || undefined,
      };
      return editing ? collectionsApi.update(editing.id, payload) : collectionsApi.create(payload);
    },
    onSuccess: () => {
      toast.success(editing ? 'Collection updated' : 'Collection created');
      onSaved();
    },
    onError: (e: any) => toast.error(e?.response?.data?.message || 'Save failed'),
  });

  return (
    <section className="rounded-3xl bg-white dark:bg-neutral-900 border-2 border-fuchsia-300 dark:border-fuchsia-800 shadow-lg overflow-hidden">
      <div className="px-5 py-3 border-b border-slate-100 dark:border-neutral-800 bg-fuchsia-50 dark:bg-fuchsia-950/30 flex items-center justify-between">
        <h3 className="font-extrabold text-slate-900 dark:text-white">
          {editing ? 'Edit Collection' : 'New Collection'}
        </h3>
        <button onClick={onClose} className="h-8 w-8 rounded-lg hover:bg-white dark:hover:bg-neutral-800 flex items-center justify-center">
          <X className="h-4 w-4" />
        </button>
      </div>

      <div className="p-5 space-y-4 max-h-[80vh] overflow-y-auto">
        <div className="grid sm:grid-cols-2 gap-3">
          <div className="sm:col-span-2">
            <label className="text-[10px] uppercase tracking-wider font-extrabold text-slate-600 mb-1 block">Collection Name *</label>
            <input
              autoFocus
              value={form.name}
              onChange={(e) => setForm({ ...form, name: e.target.value })}
              placeholder="e.g. Eid Luxury 2026, Summer Lawn 2026"
              className="h-11 w-full rounded-xl border-2 border-slate-200 dark:border-neutral-700 bg-white dark:bg-neutral-800 px-3 text-sm font-bold focus:outline-none focus:border-fuchsia-500"
            />
          </div>

          <div>
            <label className="text-[10px] uppercase tracking-wider font-extrabold text-slate-600 mb-1 block">Code</label>
            <input
              value={form.code}
              onChange={(e) => setForm({ ...form, code: e.target.value })}
              placeholder="EID26"
              className="h-11 w-full rounded-xl border-2 border-slate-200 dark:border-neutral-700 bg-white dark:bg-neutral-800 px-3 text-sm font-mono font-bold focus:outline-none focus:border-fuchsia-500"
            />
          </div>

          <div>
            <label className="text-[10px] uppercase tracking-wider font-extrabold text-slate-600 mb-1 block">Year</label>
            <input
              type="number"
              value={form.year}
              onChange={(e) => setForm({ ...form, year: Number(e.target.value) })}
              className="h-11 w-full rounded-xl border-2 border-slate-200 dark:border-neutral-700 bg-white dark:bg-neutral-800 px-3 text-sm font-extrabold tabular-nums focus:outline-none focus:border-fuchsia-500"
            />
          </div>
        </div>

        {/* Season picker */}
        <div>
          <label className="text-[10px] uppercase tracking-wider font-extrabold text-slate-600 mb-2 block">Season *</label>
          <div className="grid grid-cols-2 sm:grid-cols-5 gap-2">
            {SEASONS.map((s) => {
              const active = form.season === s.value;
              return (
                <button
                  key={s.value}
                  onClick={() => setForm({ ...form, season: s.value })}
                  className={
                    'p-3 rounded-xl border-2 text-center transition ' +
                    (active
                      ? 'border-fuchsia-500 bg-fuchsia-50 dark:bg-fuchsia-950/40 shadow'
                      : 'border-slate-200 dark:border-neutral-700 bg-white dark:bg-neutral-800 hover:border-fuchsia-300')
                  }
                >
                  <div className="text-2xl mb-1">{s.emoji}</div>
                  <div className="text-[10px] font-extrabold text-slate-700 dark:text-slate-300">{s.label}</div>
                </button>
              );
            })}
          </div>
        </div>

        <div>
          <label className="text-[10px] uppercase tracking-wider font-extrabold text-slate-600 mb-1 block">Description</label>
          <textarea
            rows={3}
            value={form.description}
            onChange={(e) => setForm({ ...form, description: e.target.value })}
            placeholder="Collection ka theme aur inspiration..."
            className="w-full rounded-xl border-2 border-slate-200 dark:border-neutral-700 bg-white dark:bg-neutral-800 px-3 py-2 text-sm font-semibold focus:outline-none focus:border-fuchsia-500 resize-none"
          />
        </div>

        <div className="grid sm:grid-cols-2 gap-3">
          <div>
            <label className="text-[10px] uppercase tracking-wider font-extrabold text-slate-600 mb-1 block">Launch Date</label>
            <input
              type="date"
              value={form.launchDate}
              onChange={(e) => setForm({ ...form, launchDate: e.target.value })}
              className="h-11 w-full rounded-xl border-2 border-slate-200 dark:border-neutral-700 bg-white dark:bg-neutral-800 px-3 text-sm font-bold focus:outline-none focus:border-fuchsia-500"
            />
          </div>
          <div>
            <label className="text-[10px] uppercase tracking-wider font-extrabold text-slate-600 mb-1 block">End Date</label>
            <input
              type="date"
              value={form.endDate}
              onChange={(e) => setForm({ ...form, endDate: e.target.value })}
              className="h-11 w-full rounded-xl border-2 border-slate-200 dark:border-neutral-700 bg-white dark:bg-neutral-800 px-3 text-sm font-bold focus:outline-none focus:border-fuchsia-500"
            />
          </div>
        </div>

        <div>
          <label className="text-[10px] uppercase tracking-wider font-extrabold text-slate-600 mb-1 block">Cover Image</label>
          {form.coverImageUrl ? (
            <div className="relative w-full aspect-video rounded-xl overflow-hidden border-2 border-slate-200 dark:border-neutral-700">
              <img src={form.coverImageUrl} alt="" className="w-full h-full object-cover" />
              <button
                onClick={() => setForm({ ...form, coverImageUrl: '' })}
                className="absolute top-2 right-2 h-8 w-8 rounded-lg bg-rose-600 text-white flex items-center justify-center"
              >
                <X className="h-4 w-4" />
              </button>
            </div>
          ) : (
            <UploadDropzone
              onUploaded={(records) => {
                const first = Array.isArray(records) ? records[0] : records;
                const url = typeof first === 'string' ? first : (first as any)?.url;
                if (url) setForm({ ...form, coverImageUrl: url });
              }}
            />
          )}
        </div>

        <div className="grid sm:grid-cols-2 gap-3">
          <div>
            <label className="text-[10px] uppercase tracking-wider font-extrabold text-slate-600 mb-1 block">Color Theme</label>
            <input
              value={form.colorTheme}
              onChange={(e) => setForm({ ...form, colorTheme: e.target.value })}
              placeholder="Pink, gold, ivory..."
              className="h-11 w-full rounded-xl border-2 border-slate-200 dark:border-neutral-700 bg-white dark:bg-neutral-800 px-3 text-sm font-bold focus:outline-none focus:border-fuchsia-500"
            />
          </div>
          <div>
            <label className="text-[10px] uppercase tracking-wider font-extrabold text-slate-600 mb-1 block">Display Order</label>
            <input
              type="number"
              value={form.displayOrder}
              onChange={(e) => setForm({ ...form, displayOrder: Number(e.target.value) })}
              className="h-11 w-full rounded-xl border-2 border-slate-200 dark:border-neutral-700 bg-white dark:bg-neutral-800 px-3 text-sm font-bold tabular-nums focus:outline-none focus:border-fuchsia-500"
            />
          </div>
        </div>

        <label className="flex items-center gap-3 p-3 rounded-xl border-2 border-amber-200 dark:border-amber-800 bg-amber-50 dark:bg-amber-950/30 cursor-pointer">
          <input
            type="checkbox"
            checked={form.isFeatured}
            onChange={(e) => setForm({ ...form, isFeatured: e.target.checked })}
            className="h-5 w-5 rounded"
          />
          <Star className={'h-5 w-5 ' + (form.isFeatured ? 'text-amber-500 fill-amber-500' : 'text-slate-400')} />
          <div className="flex-1">
            <div className="text-sm font-extrabold text-amber-900 dark:text-amber-300">Featured Collection</div>
            <div className="text-xs text-amber-700 dark:text-amber-400 font-semibold">Show prominently on homepage/dashboard</div>
          </div>
        </label>

        <div className="flex gap-2 pt-2 border-t border-slate-100 dark:border-neutral-800">
          <Button variant="secondary" className="flex-1" onClick={onClose}>Cancel</Button>
          <Button
            className="flex-1 bg-gradient-to-r from-fuchsia-600 to-pink-700"
            onClick={() => saveMutation.mutate()}
            loading={saveMutation.isPending}
            disabled={!form.name.trim()}
          >
            <Save className="h-4 w-4" />
            {editing ? 'Update Collection' : 'Create Collection'}
          </Button>
        </div>
      </div>
    </section>
  );
}
