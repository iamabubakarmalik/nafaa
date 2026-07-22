import { useState } from 'react';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import {
  Flame, Plus, Edit3, Trash2, X, Save, RefreshCw, Sparkles,
  Printer, Tag, Eye, EyeOff, ChefHat,
} from 'lucide-react';
import { stationsApi, type KitchenStation } from '../api/stations.api';
import { categoriesApi } from '@modules/inventory/categories/api/categories.api';
import { Button } from '@core/ui/Button';
import { toast } from 'sonner';

const STATION_PRESETS = [
  { name: 'Grill', code: 'GRL', emoji: '🔥' },
  { name: 'Tandoor', code: 'TND', emoji: '🍢' },
  { name: 'Cold Kitchen', code: 'CLD', emoji: '🥗' },
  { name: 'Bar', code: 'BAR', emoji: '🍹' },
  { name: 'Dessert', code: 'DES', emoji: '🍰' },
  { name: 'Bakery', code: 'BKY', emoji: '🥐' },
  { name: 'Curry Section', code: 'CRY', emoji: '🍛' },
  { name: 'BBQ Section', code: 'BBQ', emoji: '🍖' },
];

export default function StationsPage() {
  const queryClient = useQueryClient();
  const [showForm, setShowForm] = useState(false);
  const [editing, setEditing] = useState<KitchenStation | null>(null);

  const { data: stations = [], isLoading, refetch, isRefetching } = useQuery({
    queryKey: ['kitchen-stations'],
    queryFn: () => stationsApi.list(),
  });

  const removeMutation = useMutation({
    mutationFn: (id: string) => stationsApi.remove(id),
    onSuccess: () => {
      toast.success('Station removed');
      queryClient.invalidateQueries({ queryKey: ['kitchen-stations'] });
    },
  });

  return (
    <div className="space-y-6">
      {/* HERO */}
      <section className="relative overflow-hidden rounded-3xl bg-gradient-to-br from-slate-950 via-orange-900 to-red-700 text-white p-6 sm:p-8 shadow-2xl">
        <div className="absolute -top-20 -right-20 h-72 w-72 rounded-full bg-orange-400/20 blur-3xl" />
        <div className="absolute -bottom-20 -left-20 h-72 w-72 rounded-full bg-red-400/15 blur-3xl" />

        <div className="relative flex flex-col lg:flex-row lg:items-center lg:justify-between gap-5">
          <div>
            <div className="inline-flex items-center gap-2 rounded-full bg-white/15 backdrop-blur px-3 py-1 text-xs font-extrabold border border-white/20">
              <Sparkles className="h-3.5 w-3.5 text-amber-300" />
              Kitchen Setup
            </div>
            <h1 className="mt-3 text-3xl sm:text-4xl font-extrabold leading-tight">
              🔥 Kitchen Stations
            </h1>
            <p className="mt-2 text-sm text-white/80 font-semibold">
              Grill, tandoor, bar — printer routing for KOTs
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
              Add Station
            </Button>
          </div>
        </div>
      </section>

      {showForm && (
        <StationForm
          editing={editing}
          onClose={() => { setShowForm(false); setEditing(null); }}
          onSaved={() => {
            setShowForm(false);
            setEditing(null);
            queryClient.invalidateQueries({ queryKey: ['kitchen-stations'] });
          }}
        />
      )}

      {isLoading ? (
        <div className="grid sm:grid-cols-2 lg:grid-cols-3 gap-4">
          {[1, 2, 3].map((i) => <div key={i} className="h-40 rounded-2xl bg-slate-100 dark:bg-neutral-800 animate-pulse" />)}
        </div>
      ) : stations.length === 0 ? (
        <div className="rounded-3xl bg-white dark:bg-neutral-900 border-2 border-dashed border-slate-200 dark:border-neutral-800 p-12 text-center">
          <div className="h-20 w-20 rounded-3xl bg-orange-100 dark:bg-orange-950/40 mx-auto flex items-center justify-center">
            <Flame className="h-10 w-10 text-orange-600" />
          </div>
          <h3 className="mt-4 text-lg font-extrabold text-slate-900 dark:text-white">No stations</h3>
          <p className="mt-1 text-sm text-slate-500 font-semibold">Setup grill, tandoor, bar sections to route KOTs</p>
          <Button
            className="mt-4 bg-gradient-to-r from-orange-600 to-red-700"
            onClick={() => { setEditing(null); setShowForm(true); }}
          >
            <Plus className="h-4 w-4" />
            Add First Station
          </Button>
        </div>
      ) : (
        <section className="grid sm:grid-cols-2 lg:grid-cols-3 gap-4">
          {stations.map((station) => (
            <StationCard
              key={station.id}
              station={station}
              onEdit={() => { setEditing(station); setShowForm(true); }}
              onDelete={() => {
                if (confirm('Delete "' + station.name + '"?')) removeMutation.mutate(station.id);
              }}
            />
          ))}
        </section>
      )}
    </div>
  );
}

function StationCard({ station, onEdit, onDelete }: any) {
  const preset = STATION_PRESETS.find((p) => p.name.toLowerCase() === station.name.toLowerCase());
  return (
    <div className={
      'rounded-2xl bg-white dark:bg-neutral-900 border-2 border-slate-200 dark:border-neutral-800 shadow-sm hover:shadow-lg transition p-4 ' +
      (!station.isActive ? 'opacity-60' : '')
    }>
      <div className="flex items-start justify-between mb-3">
        <div className="h-14 w-14 rounded-2xl bg-gradient-to-br from-orange-500 to-red-600 text-white flex items-center justify-center shadow-lg text-2xl">
          {preset?.emoji || '🔥'}
        </div>
        <div className="flex gap-1">
          <button onClick={onEdit} className="h-8 w-8 rounded-lg bg-slate-100 dark:bg-neutral-800 hover:bg-slate-200 text-slate-700 flex items-center justify-center">
            <Edit3 className="h-3.5 w-3.5" />
          </button>
          <button onClick={onDelete} className="h-8 w-8 rounded-lg bg-rose-50 dark:bg-rose-950/40 hover:bg-rose-100 text-rose-600 flex items-center justify-center">
            <Trash2 className="h-3.5 w-3.5" />
          </button>
        </div>
      </div>

      <h3 className="font-extrabold text-slate-900 dark:text-white text-lg">{station.name}</h3>
      {station.code && (
        <div className="mt-0.5 text-xs font-mono font-extrabold text-orange-600">Code: {station.code}</div>
      )}
      {station.printerName && (
        <div className="mt-2 flex items-center gap-1.5 text-xs text-slate-600 dark:text-slate-400 font-semibold">
          <Printer className="h-3 w-3" />
          {station.printerName}
        </div>
      )}
      {station.categoryIds?.length > 0 && (
        <div className="mt-2 flex items-center gap-1 text-xs text-slate-500 font-semibold">
          <Tag className="h-3 w-3" />
          {station.categoryIds.length} categories linked
        </div>
      )}
    </div>
  );
}

function StationForm({ editing, onClose, onSaved }: any) {
  const [form, setForm] = useState({
    name: editing?.name ?? '',
    code: editing?.code ?? '',
    printerName: editing?.printerName ?? '',
    categoryIds: editing?.categoryIds ?? [],
    displayOrder: editing?.displayOrder ?? 0,
    isActive: editing?.isActive ?? true,
  });

  const { data: categories = [] } = useQuery({
    queryKey: ['categories'],
    queryFn: () => categoriesApi.list(),
  });

  const saveMutation = useMutation({
    mutationFn: () => editing ? stationsApi.update(editing.id, form) : stationsApi.create(form),
    onSuccess: () => {
      toast.success(editing ? 'Station updated' : 'Station created');
      onSaved();
    },
    onError: (e: any) => toast.error(e?.response?.data?.message || 'Save failed'),
  });

  const toggleCategory = (id: string) => {
    setForm((f: any) => ({
      ...f,
      categoryIds: f.categoryIds.includes(id) ? f.categoryIds.filter((c: string) => c !== id) : [...f.categoryIds, id],
    }));
  };

  return (
    <section className="rounded-3xl bg-white dark:bg-neutral-900 border-2 border-orange-300 dark:border-orange-800 shadow-lg overflow-hidden">
      <div className="px-5 py-3 border-b border-slate-100 dark:border-neutral-800 bg-orange-50 dark:bg-orange-950/30 flex items-center justify-between">
        <h3 className="font-extrabold text-slate-900 dark:text-white">
          {editing ? 'Edit Station' : 'New Kitchen Station'}
        </h3>
        <button onClick={onClose} className="h-8 w-8 rounded-lg hover:bg-white dark:hover:bg-neutral-800 flex items-center justify-center">
          <X className="h-4 w-4" />
        </button>
      </div>

      <div className="p-5 space-y-4 max-h-[80vh] overflow-y-auto">
        {/* Presets */}
        {!editing && (
          <div>
            <label className="text-[10px] uppercase font-extrabold text-slate-600 mb-2 block">Quick Presets</label>
            <div className="grid grid-cols-4 gap-2">
              {STATION_PRESETS.map((p) => (
                <button
                  key={p.name}
                  onClick={() => setForm({ ...form, name: p.name, code: p.code })}
                  className="p-2 rounded-lg border-2 border-slate-200 dark:border-neutral-700 hover:border-orange-400 text-center transition"
                >
                  <div className="text-2xl">{p.emoji}</div>
                  <div className="text-[10px] font-extrabold text-slate-700 dark:text-slate-300 mt-1">{p.name}</div>
                </button>
              ))}
            </div>
          </div>
        )}

        <div className="grid sm:grid-cols-2 gap-3">
          <div>
            <label className="text-[10px] uppercase font-extrabold text-slate-600 mb-1 block">Station Name *</label>
            <input
              value={form.name}
              onChange={(e) => setForm({ ...form, name: e.target.value })}
              placeholder="Grill / Tandoor / Bar"
              className="h-11 w-full rounded-xl border-2 border-slate-200 dark:border-neutral-700 bg-white dark:bg-neutral-800 px-3 text-sm font-bold focus:outline-none focus:border-orange-500"
            />
          </div>
          <div>
            <label className="text-[10px] uppercase font-extrabold text-slate-600 mb-1 block">Short Code (KOT)</label>
            <input
              value={form.code}
              onChange={(e) => setForm({ ...form, code: e.target.value.toUpperCase() })}
              placeholder="GRL"
              maxLength={5}
              className="h-11 w-full rounded-xl border-2 border-slate-200 dark:border-neutral-700 bg-white dark:bg-neutral-800 px-3 text-sm font-mono font-bold uppercase focus:outline-none focus:border-orange-500"
            />
          </div>
        </div>

        <div>
          <label className="text-[10px] uppercase font-extrabold text-slate-600 mb-1 block">Printer Name (optional)</label>
          <input
            value={form.printerName}
            onChange={(e) => setForm({ ...form, printerName: e.target.value })}
            placeholder="Epson-Grill-01 / Kitchen-Printer-Main"
            className="h-11 w-full rounded-xl border-2 border-slate-200 dark:border-neutral-700 bg-white dark:bg-neutral-800 px-3 text-sm font-bold focus:outline-none focus:border-orange-500"
          />
          <p className="mt-1 text-[10px] text-slate-500 font-semibold">KOTs for this station will print to this printer</p>
        </div>

        <div>
          <label className="text-[10px] uppercase font-extrabold text-slate-600 mb-2 block">Auto-route Categories to this station</label>
          {categories.length === 0 ? (
            <div className="text-xs text-slate-500 font-semibold italic">No categories exist. Create categories first.</div>
          ) : (
            <div className="grid grid-cols-2 sm:grid-cols-3 gap-2">
              {(categories as any[]).map((cat: any) => {
                const active = form.categoryIds.includes(cat.id);
                return (
                  <button
                    key={cat.id}
                    onClick={() => toggleCategory(cat.id)}
                    className={
                      'p-2 rounded-lg border-2 text-xs font-extrabold transition inline-flex items-center gap-1 ' +
                      (active
                        ? 'border-orange-500 bg-orange-50 dark:bg-orange-950/40 text-orange-800 shadow'
                        : 'border-slate-200 dark:border-neutral-700 bg-white dark:bg-neutral-800 text-slate-700 hover:border-orange-300')
                    }
                  >
                    <span className="h-2.5 w-2.5 rounded-full shrink-0" style={{ backgroundColor: cat.color || '#94a3b8' }} />
                    <span className="truncate">{cat.name}</span>
                  </button>
                );
              })}
            </div>
          )}
        </div>

        <label className="flex items-center gap-3 p-3 rounded-xl border-2 border-emerald-200 dark:border-emerald-800 bg-emerald-50 dark:bg-emerald-950/30 cursor-pointer">
          <input
            type="checkbox"
            checked={form.isActive}
            onChange={(e) => setForm({ ...form, isActive: e.target.checked })}
            className="h-5 w-5 rounded"
          />
          <div className="flex-1">
            <div className="text-sm font-extrabold text-emerald-900 dark:text-emerald-300">Active Station</div>
            <div className="text-xs text-emerald-700 dark:text-emerald-400 font-semibold">Inactive stations won't receive KOTs</div>
          </div>
        </label>

        <div className="flex gap-2 pt-2 border-t border-slate-100 dark:border-neutral-800">
          <Button variant="secondary" className="flex-1" onClick={onClose}>Cancel</Button>
          <Button
            className="flex-1 bg-gradient-to-r from-orange-600 to-red-700"
            onClick={() => saveMutation.mutate()}
            loading={saveMutation.isPending}
            disabled={!form.name.trim()}
          >
            <Save className="h-4 w-4" />
            {editing ? 'Update Station' : 'Create Station'}
          </Button>
        </div>
      </div>
    </section>
  );
}
