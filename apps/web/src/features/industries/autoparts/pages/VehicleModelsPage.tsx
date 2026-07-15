import { useState } from 'react';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { Cog, Plus, Search, X, Save, Edit3, Trash2, RefreshCw, Sparkles, Calendar } from 'lucide-react';
import { vehicleModelsApi, type VehicleModel, type VehicleType } from '../api/vehicle-models.api';
import { vehicleMakesApi } from '../api/vehicle-makes.api';
import { Button } from '@/components/ui/Button';
import { toast } from 'sonner';

const VEHICLE_TYPES: { value: VehicleType; label: string; emoji: string }[] = [
  { value: 'CAR', label: 'Car', emoji: '🚗' },
  { value: 'SUV', label: 'SUV', emoji: '🚙' },
  { value: 'VAN', label: 'Van', emoji: '🚐' },
  { value: 'PICKUP', label: 'Pickup', emoji: '🛻' },
  { value: 'TRUCK', label: 'Truck', emoji: '🚚' },
  { value: 'BUS', label: 'Bus', emoji: '🚌' },
  { value: 'MOTORCYCLE', label: 'Motorcycle', emoji: '🏍️' },
  { value: 'SCOOTER', label: 'Scooter', emoji: '🛵' },
  { value: 'RICKSHAW', label: 'Rickshaw', emoji: '🛺' },
  { value: 'TRACTOR', label: 'Tractor', emoji: '🚜' },
  { value: 'OTHER', label: 'Other', emoji: '🚗' },
];

export default function VehicleModelsPage() {
  const queryClient = useQueryClient();
  const [makeFilter, setMakeFilter] = useState<string>('');
  const [typeFilter, setTypeFilter] = useState<string>('all');
  const [search, setSearch] = useState('');
  const [showForm, setShowForm] = useState(false);
  const [editing, setEditing] = useState<VehicleModel | null>(null);

  const { data: makes = [] } = useQuery({
    queryKey: ['vehicle-makes-for-models'],
    queryFn: () => vehicleMakesApi.list({ active: true }),
  });

  const { data: models = [], isLoading, refetch, isRefetching } = useQuery({
    queryKey: ['vehicle-models', makeFilter, typeFilter, search],
    queryFn: () => vehicleModelsApi.list({
      makeId: makeFilter || undefined,
      vehicleType: typeFilter === 'all' ? undefined : typeFilter,
      search: search.trim() || undefined,
      active: true,
    }),
  });

  const removeMutation = useMutation({
    mutationFn: (id: string) => vehicleModelsApi.remove(id),
    onSuccess: () => { toast.success('Model removed'); queryClient.invalidateQueries({ queryKey: ['vehicle-models'] }); },
  });

  return (
    <div className="space-y-6">
      <section className="relative overflow-hidden rounded-3xl bg-gradient-to-br from-slate-950 via-fuchsia-900 to-pink-700 text-white p-6 sm:p-8 shadow-2xl">
        <div className="absolute -top-20 -right-20 h-72 w-72 rounded-full bg-fuchsia-400/20 blur-3xl" />
        <div className="relative flex flex-col lg:flex-row lg:items-center lg:justify-between gap-5">
          <div>
            <div className="inline-flex items-center gap-2 rounded-full bg-white/15 backdrop-blur px-3 py-1 text-xs font-extrabold border border-white/20">
              <Sparkles className="h-3.5 w-3.5 text-amber-300" />
              Vehicle Models
            </div>
            <h1 className="mt-3 text-3xl sm:text-4xl font-extrabold leading-tight">⚙️ Vehicle Models</h1>
            <p className="mt-2 text-sm text-white/80 font-semibold">Corolla, Civic, Mehran, City — full catalog</p>
          </div>
          <div className="flex items-center gap-2 flex-wrap">
            <button onClick={() => refetch()} disabled={isRefetching} className="inline-flex items-center gap-2 rounded-xl bg-white/15 hover:bg-white/25 px-4 py-2.5 text-sm font-bold backdrop-blur border border-white/20">
              <RefreshCw className={'h-4 w-4 ' + (isRefetching ? 'animate-spin' : '')} />
              Refresh
            </button>
            <Button className="bg-white text-slate-900 hover:bg-slate-100" onClick={() => { setEditing(null); setShowForm(true); }}>
              <Plus className="h-4 w-4" />
              New Model
            </Button>
          </div>
        </div>
      </section>

      <section className="rounded-3xl bg-white dark:bg-neutral-900 border border-slate-200 dark:border-neutral-800 shadow-sm p-4 space-y-3">
        <div className="relative">
          <Search className="h-4 w-4 text-slate-400 absolute left-3.5 top-1/2 -translate-y-1/2" />
          <input value={search} onChange={(e) => setSearch(e.target.value)} placeholder="Search models..." className="h-11 w-full rounded-xl border-2 border-slate-200 dark:border-neutral-700 bg-white dark:bg-neutral-800 pl-10 pr-3 text-sm font-semibold focus:outline-none focus:border-fuchsia-500" />
        </div>
        <div className="grid sm:grid-cols-2 gap-2">
          <select value={makeFilter} onChange={(e) => setMakeFilter(e.target.value)} className="h-11 rounded-xl border-2 border-slate-200 dark:border-neutral-700 bg-white dark:bg-neutral-800 px-3 text-sm font-bold focus:outline-none focus:border-fuchsia-500">
            <option value="">All Makes</option>
            {makes.map((m) => <option key={m.id} value={m.id}>{m.name}</option>)}
          </select>
          <select value={typeFilter} onChange={(e) => setTypeFilter(e.target.value)} className="h-11 rounded-xl border-2 border-slate-200 dark:border-neutral-700 bg-white dark:bg-neutral-800 px-3 text-sm font-bold focus:outline-none focus:border-fuchsia-500">
            <option value="all">All Types</option>
            {VEHICLE_TYPES.map((t) => <option key={t.value} value={t.value}>{t.emoji} {t.label}</option>)}
          </select>
        </div>
      </section>

      {showForm && (
        <ModelForm editing={editing} makes={makes} onClose={() => { setShowForm(false); setEditing(null); }} onSaved={() => { setShowForm(false); setEditing(null); queryClient.invalidateQueries({ queryKey: ['vehicle-models'] }); }} />
      )}

      {isLoading ? (
        <div className="grid sm:grid-cols-2 lg:grid-cols-3 gap-4">
          {[1, 2, 3, 4, 5, 6].map((i) => <div key={i} className="h-40 rounded-2xl bg-slate-100 dark:bg-neutral-800 animate-pulse" />)}
        </div>
      ) : models.length === 0 ? (
        <div className="rounded-3xl bg-white dark:bg-neutral-900 border-2 border-dashed p-12 text-center">
          <Cog className="h-16 w-16 text-slate-400 mx-auto mb-3" />
          <p className="font-extrabold text-slate-700">No models yet</p>
        </div>
      ) : (
        <section className="grid sm:grid-cols-2 lg:grid-cols-3 gap-4">
          {models.map((model) => {
            const type = VEHICLE_TYPES.find((t) => t.value === model.vehicleType);
            return (
              <div key={model.id} className="group rounded-2xl bg-white dark:bg-neutral-900 border-2 border-slate-200 dark:border-neutral-800 shadow-sm hover:shadow-lg transition overflow-hidden">
                <div className="aspect-video bg-gradient-to-br from-fuchsia-500 to-pink-600 flex items-center justify-center relative">
                  {model.imageUrl ? <img src={model.imageUrl} alt="" className="w-full h-full object-cover" /> : <span className="text-6xl">{type?.emoji}</span>}
                  <div className="absolute top-2 right-2 opacity-0 group-hover:opacity-100 transition flex gap-1">
                    <button onClick={() => { setEditing(model); setShowForm(true); }} className="h-8 w-8 rounded-lg bg-slate-900/90 text-white flex items-center justify-center">
                      <Edit3 className="h-3.5 w-3.5" />
                    </button>
                    <button onClick={() => { if (confirm('Remove ' + model.name + '?')) removeMutation.mutate(model.id); }} className="h-8 w-8 rounded-lg bg-rose-600/90 text-white flex items-center justify-center">
                      <Trash2 className="h-3.5 w-3.5" />
                    </button>
                  </div>
                </div>
                <div className="p-4 space-y-2">
                  <div>
                    <h3 className="font-extrabold text-slate-900 dark:text-white">{model.name}</h3>
                    <div className="text-xs font-extrabold text-fuchsia-600">{model.make?.name}</div>
                  </div>
                  <div className="flex flex-wrap gap-1">
                    <span className="px-2 py-0.5 rounded bg-fuchsia-100 dark:bg-fuchsia-950/40 text-fuchsia-700 text-[10px] font-extrabold uppercase">
                      {type?.emoji} {type?.label}
                    </span>
                    {(model.yearFrom || model.yearTo) && (
                      <span className="px-2 py-0.5 rounded bg-slate-100 dark:bg-neutral-800 text-slate-700 text-[10px] font-extrabold inline-flex items-center gap-0.5">
                        <Calendar className="h-2.5 w-2.5" />
                        {model.yearFrom || '?'} - {model.yearTo || 'Present'}
                      </span>
                    )}
                  </div>
                  {model.engineOptions?.length > 0 && (
                    <div className="text-[10px] font-bold text-slate-500">
                      Engines: {model.engineOptions.slice(0, 3).join(', ')}
                    </div>
                  )}
                </div>
              </div>
            );
          })}
        </section>
      )}
    </div>
  );
}

function ModelForm({ editing, makes, onClose, onSaved }: any) {
  const [form, setForm] = useState<any>({
    makeId: editing?.makeId ?? '',
    name: editing?.name ?? '',
    vehicleType: editing?.vehicleType ?? 'CAR',
    yearFrom: editing?.yearFrom ?? '',
    yearTo: editing?.yearTo ?? '',
    engineOptions: editing?.engineOptions?.join(', ') ?? '',
    imageUrl: editing?.imageUrl ?? '',
  });

  const saveMutation = useMutation({
    mutationFn: () => {
      const payload: any = {
        ...form,
        yearFrom: form.yearFrom ? Number(form.yearFrom) : undefined,
        yearTo: form.yearTo ? Number(form.yearTo) : undefined,
        engineOptions: form.engineOptions ? form.engineOptions.split(',').map((s: string) => s.trim()).filter(Boolean) : [],
      };
      return editing ? vehicleModelsApi.update(editing.id, payload) : vehicleModelsApi.create(payload);
    },
    onSuccess: () => { toast.success(editing ? 'Updated' : 'Created'); onSaved(); },
    onError: (e: any) => toast.error(e?.response?.data?.message || 'Failed'),
  });

  return (
    <section className="rounded-3xl bg-white dark:bg-neutral-900 border-2 border-fuchsia-300 shadow-lg overflow-hidden">
      <div className="px-5 py-3 border-b bg-fuchsia-50 dark:bg-fuchsia-950/30 flex items-center justify-between">
        <h3 className="font-extrabold text-slate-900 dark:text-white">{editing ? 'Edit Model' : 'New Model'}</h3>
        <button onClick={onClose} className="h-8 w-8 rounded-lg hover:bg-white flex items-center justify-center"><X className="h-4 w-4" /></button>
      </div>
      <div className="p-5 space-y-3">
        <select value={form.makeId} onChange={(e) => setForm({ ...form, makeId: e.target.value })} className="h-11 w-full rounded-xl border-2 border-slate-200 dark:border-neutral-700 bg-white dark:bg-neutral-800 px-3 text-sm font-bold focus:outline-none focus:border-fuchsia-500">
          <option value="">Select Make *</option>
          {makes.map((m: any) => <option key={m.id} value={m.id}>{m.name}</option>)}
        </select>
        <input value={form.name} onChange={(e) => setForm({ ...form, name: e.target.value })} placeholder="Model name * (e.g. Corolla)" className="h-11 w-full rounded-xl border-2 border-slate-200 dark:border-neutral-700 bg-white dark:bg-neutral-800 px-3 text-sm font-bold focus:outline-none focus:border-fuchsia-500" />
        <select value={form.vehicleType} onChange={(e) => setForm({ ...form, vehicleType: e.target.value })} className="h-11 w-full rounded-xl border-2 border-slate-200 dark:border-neutral-700 bg-white dark:bg-neutral-800 px-3 text-sm font-bold focus:outline-none focus:border-fuchsia-500">
          {VEHICLE_TYPES.map((t) => <option key={t.value} value={t.value}>{t.emoji} {t.label}</option>)}
        </select>
        <div className="grid grid-cols-2 gap-2">
          <input type="number" value={form.yearFrom} onChange={(e) => setForm({ ...form, yearFrom: e.target.value })} placeholder="Year from" className="h-11 rounded-xl border-2 border-slate-200 dark:border-neutral-700 bg-white dark:bg-neutral-800 px-3 text-sm font-bold tabular-nums focus:outline-none focus:border-fuchsia-500" />
          <input type="number" value={form.yearTo} onChange={(e) => setForm({ ...form, yearTo: e.target.value })} placeholder="Year to" className="h-11 rounded-xl border-2 border-slate-200 dark:border-neutral-700 bg-white dark:bg-neutral-800 px-3 text-sm font-bold tabular-nums focus:outline-none focus:border-fuchsia-500" />
        </div>
        <input value={form.engineOptions} onChange={(e) => setForm({ ...form, engineOptions: e.target.value })} placeholder="Engine options (comma separated) e.g. 1300cc, 1800cc" className="h-11 w-full rounded-xl border-2 border-slate-200 dark:border-neutral-700 bg-white dark:bg-neutral-800 px-3 text-sm font-bold focus:outline-none focus:border-fuchsia-500" />
        <div className="flex gap-2 pt-2">
          <Button variant="secondary" className="flex-1" onClick={onClose}>Cancel</Button>
          <Button className="flex-1 bg-gradient-to-r from-fuchsia-600 to-pink-700" onClick={() => saveMutation.mutate()} loading={saveMutation.isPending} disabled={!form.name.trim() || !form.makeId}>
            <Save className="h-4 w-4" />
            {editing ? 'Update' : 'Create'}
          </Button>
        </div>
      </div>
    </section>
  );
}
