import { useState } from 'react';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import {
  Truck, Plus, Search, X, Save, Edit3, Trash2, RefreshCw, Sparkles,
  Globe, Package, Zap,
} from 'lucide-react';
import { vehicleMakesApi, type VehicleMake } from '../api/vehicle-makes.api';
import { Button } from '@core/ui/Button';
import { UploadDropzone } from '@core/components/uploads';
import { toast } from 'sonner';

export default function VehicleMakesPage() {
  const queryClient = useQueryClient();
  const [search, setSearch] = useState('');
  const [showForm, setShowForm] = useState(false);
  const [editing, setEditing] = useState<VehicleMake | null>(null);

  const { data: makes = [], isLoading, refetch, isRefetching } = useQuery({
    queryKey: ['vehicle-makes', search],
    queryFn: () => vehicleMakesApi.list({ search: search.trim() || undefined, active: true }),
  });

  const removeMutation = useMutation({
    mutationFn: (id: string) => vehicleMakesApi.remove(id),
    onSuccess: () => { toast.success('Make removed'); queryClient.invalidateQueries({ queryKey: ['vehicle-makes'] }); },
  });

  const seedMutation = useMutation({
    mutationFn: () => vehicleMakesApi.seedPakistani(),
    onSuccess: (data) => { toast.success('Added ' + data.created + ' Pakistani makes'); queryClient.invalidateQueries({ queryKey: ['vehicle-makes'] }); },
  });

  return (
    <div className="space-y-6">
      <section className="relative overflow-hidden rounded-3xl bg-gradient-to-br from-slate-950 via-rose-900 to-red-700 text-white p-6 sm:p-8 shadow-2xl">
        <div className="absolute -top-20 -right-20 h-72 w-72 rounded-full bg-rose-400/20 blur-3xl" />
        <div className="relative flex flex-col lg:flex-row lg:items-center lg:justify-between gap-5">
          <div>
            <div className="inline-flex items-center gap-2 rounded-full bg-white/15 backdrop-blur px-3 py-1 text-xs font-extrabold border border-white/20">
              <Sparkles className="h-3.5 w-3.5 text-amber-300" />
              Vehicle Brands
            </div>
            <h1 className="mt-3 text-3xl sm:text-4xl font-extrabold leading-tight">🚛 Vehicle Makes</h1>
            <p className="mt-2 text-sm text-white/80 font-semibold">Toyota, Honda, Suzuki, KIA — sab brands</p>
          </div>
          <div className="flex items-center gap-2 flex-wrap">
            <button onClick={() => seedMutation.mutate()} disabled={seedMutation.isPending} className="inline-flex items-center gap-2 rounded-xl bg-white/15 hover:bg-white/25 px-4 py-2.5 text-sm font-bold backdrop-blur border border-white/20">
              <Zap className="h-4 w-4" />
              Seed 30 Pakistani Makes
            </button>
            <button onClick={() => refetch()} disabled={isRefetching} className="inline-flex items-center gap-2 rounded-xl bg-white/15 hover:bg-white/25 px-4 py-2.5 text-sm font-bold backdrop-blur border border-white/20">
              <RefreshCw className={'h-4 w-4 ' + (isRefetching ? 'animate-spin' : '')} />
              Refresh
            </button>
            <Button className="bg-white text-slate-900 hover:bg-slate-100" onClick={() => { setEditing(null); setShowForm(true); }}>
              <Plus className="h-4 w-4" />
              New Make
            </Button>
          </div>
        </div>
      </section>

      <section className="rounded-3xl bg-white dark:bg-neutral-900 border border-slate-200 dark:border-neutral-800 shadow-sm p-4">
        <div className="relative">
          <Search className="h-4 w-4 text-slate-400 absolute left-3.5 top-1/2 -translate-y-1/2" />
          <input value={search} onChange={(e) => setSearch(e.target.value)} placeholder="Search makes..." className="h-11 w-full rounded-xl border-2 border-slate-200 dark:border-neutral-700 bg-white dark:bg-neutral-800 pl-10 pr-3 text-sm font-semibold focus:outline-none focus:border-rose-500" />
        </div>
      </section>

      {showForm && (
        <MakeForm editing={editing} onClose={() => { setShowForm(false); setEditing(null); }} onSaved={() => { setShowForm(false); setEditing(null); queryClient.invalidateQueries({ queryKey: ['vehicle-makes'] }); }} />
      )}

      {isLoading ? (
        <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-4 gap-4">
          {[1, 2, 3, 4, 5, 6, 7, 8].map((i) => <div key={i} className="h-40 rounded-2xl bg-slate-100 dark:bg-neutral-800 animate-pulse" />)}
        </div>
      ) : makes.length === 0 ? (
        <div className="rounded-3xl bg-white dark:bg-neutral-900 border-2 border-dashed border-slate-200 dark:border-neutral-800 p-12 text-center">
          <Truck className="h-16 w-16 text-slate-400 mx-auto mb-3" />
          <p className="font-extrabold text-slate-700">No vehicle makes yet</p>
          <div className="mt-4 flex gap-2 justify-center">
            <Button className="bg-gradient-to-r from-rose-600 to-red-700" onClick={() => seedMutation.mutate()} loading={seedMutation.isPending}>
              <Zap className="h-4 w-4" />
              Auto-Add Pakistani Makes
            </Button>
            <Button variant="secondary" onClick={() => { setEditing(null); setShowForm(true); }}>
              <Plus className="h-4 w-4" />
              Add Manually
            </Button>
          </div>
        </div>
      ) : (
        <section className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-4 gap-4">
          {makes.map((make) => (
            <div key={make.id} className="group rounded-2xl bg-white dark:bg-neutral-900 border-2 border-slate-200 dark:border-neutral-800 shadow-sm hover:shadow-lg transition p-4 space-y-2">
              <div className="flex items-start justify-between">
                <div className="h-14 w-14 rounded-2xl bg-gradient-to-br from-rose-500 to-red-600 text-white flex items-center justify-center shadow overflow-hidden">
                  {make.logoUrl ? <img src={make.logoUrl} alt="" className="w-full h-full object-cover" /> : <Truck className="h-7 w-7" />}
                </div>
                <div className="opacity-0 group-hover:opacity-100 transition flex gap-1">
                  <button onClick={() => { setEditing(make); setShowForm(true); }} className="h-8 w-8 rounded-lg bg-slate-100 hover:bg-slate-200 text-slate-700 flex items-center justify-center">
                    <Edit3 className="h-3.5 w-3.5" />
                  </button>
                  <button onClick={() => { if (confirm('Remove ' + make.name + '?')) removeMutation.mutate(make.id); }} className="h-8 w-8 rounded-lg bg-rose-50 hover:bg-rose-100 text-rose-600 flex items-center justify-center">
                    <Trash2 className="h-3.5 w-3.5" />
                  </button>
                </div>
              </div>
              <div>
                <h3 className="font-extrabold text-slate-900 dark:text-white">{make.name}</h3>
                {make.country && (
                  <div className="flex items-center gap-1 text-xs text-slate-500 font-bold">
                    <Globe className="h-3 w-3" />
                    {make.country}
                  </div>
                )}
              </div>
              <div className="pt-2 border-t border-slate-100 dark:border-neutral-800 flex items-center justify-between">
                <span className="inline-flex items-center gap-1 text-xs text-slate-600 font-bold">
                  <Package className="h-3 w-3" />
                  {make._count?.models || 0} models
                </span>
              </div>
            </div>
          ))}
        </section>
      )}
    </div>
  );
}

function MakeForm({ editing, onClose, onSaved }: any) {
  const [form, setForm] = useState<any>({
    name: editing?.name ?? '',
    country: editing?.country ?? '',
    logoUrl: editing?.logoUrl ?? '',
    displayOrder: editing?.displayOrder ?? 0,
  });

  const saveMutation = useMutation({
    mutationFn: () => editing ? vehicleMakesApi.update(editing.id, form) : vehicleMakesApi.create(form),
    onSuccess: () => { toast.success(editing ? 'Updated' : 'Created'); onSaved(); },
    onError: (e: any) => toast.error(e?.response?.data?.message || 'Failed'),
  });

  return (
    <section className="rounded-3xl bg-white dark:bg-neutral-900 border-2 border-rose-300 shadow-lg overflow-hidden">
      <div className="px-5 py-3 border-b border-slate-100 dark:border-neutral-800 bg-rose-50 dark:bg-rose-950/30 flex items-center justify-between">
        <h3 className="font-extrabold text-slate-900 dark:text-white">{editing ? 'Edit Make' : 'New Make'}</h3>
        <button onClick={onClose} className="h-8 w-8 rounded-lg hover:bg-white flex items-center justify-center">
          <X className="h-4 w-4" />
        </button>
      </div>
      <div className="p-5 space-y-3">
        <input autoFocus value={form.name} onChange={(e) => setForm({ ...form, name: e.target.value })} placeholder="Make name *" className="h-11 w-full rounded-xl border-2 border-slate-200 dark:border-neutral-700 bg-white dark:bg-neutral-800 px-3 text-sm font-bold focus:outline-none focus:border-rose-500" />
        <input value={form.country} onChange={(e) => setForm({ ...form, country: e.target.value })} placeholder="Country of origin" className="h-11 w-full rounded-xl border-2 border-slate-200 dark:border-neutral-700 bg-white dark:bg-neutral-800 px-3 text-sm font-bold focus:outline-none focus:border-rose-500" />
        <div>
          <label className="text-[10px] uppercase font-extrabold text-slate-600 mb-1 block">Logo</label>
          {form.logoUrl ? (
            <div className="relative w-24 h-24 rounded-xl overflow-hidden border-2 border-slate-200">
              <img src={form.logoUrl} alt="" className="w-full h-full object-cover" />
              <button onClick={() => setForm({ ...form, logoUrl: '' })} className="absolute top-1 right-1 h-6 w-6 rounded bg-rose-600 text-white flex items-center justify-center">
                <X className="h-3 w-3" />
              </button>
            </div>
          ) : (
            <UploadDropzone onUploaded={(records) => {
              const first = Array.isArray(records) ? records[0] : records;
              const url = typeof first === 'string' ? first : (first as any)?.url;
              if (url) setForm({ ...form, logoUrl: url });
            }} />
          )}
        </div>
        <div className="flex gap-2 pt-2">
          <Button variant="secondary" className="flex-1" onClick={onClose}>Cancel</Button>
          <Button className="flex-1 bg-gradient-to-r from-rose-600 to-red-700" onClick={() => saveMutation.mutate()} loading={saveMutation.isPending} disabled={!form.name.trim()}>
            <Save className="h-4 w-4" />
            {editing ? 'Update' : 'Create'}
          </Button>
        </div>
      </div>
    </section>
  );
}
