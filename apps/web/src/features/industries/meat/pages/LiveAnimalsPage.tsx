import { useState } from 'react';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import {
  Heart, Plus, Search, X, Save, Edit3, Trash2, RefreshCw, Sparkles,
  DollarSign, Calendar, Weight, Activity, CheckCircle2, AlertCircle,
  User, Camera, TrendingUp, Package,
} from 'lucide-react';
import { liveAnimalsApi, type LiveAnimal } from '../api/live-animals.api';
import { formatPKR } from '@/lib/format';
import { Button } from '@/components/ui/Button';
import { UploadDropzone } from '@/components/uploads';
import { toast } from 'sonner';
import { format, differenceInDays } from 'date-fns';

const ANIMAL_TYPES = [
  { value: 'BEEF', label: 'Cow/Beef', emoji: '🐄' },
  { value: 'BUFFALO', label: 'Buffalo', emoji: '🐃' },
  { value: 'MUTTON', label: 'Sheep/Mutton', emoji: '🐑' },
  { value: 'GOAT', label: 'Goat', emoji: '🐐' },
  { value: 'LAMB', label: 'Lamb', emoji: '🐏' },
  { value: 'CAMEL', label: 'Camel', emoji: '🐫' },
  { value: 'CHICKEN', label: 'Chicken', emoji: '🐔' },
  { value: 'DUCK', label: 'Duck', emoji: '🦆' },
  { value: 'TURKEY', label: 'Turkey', emoji: '🦃' },
  { value: 'QUAIL', label: 'Quail', emoji: '🐦' },
  { value: 'OTHER', label: 'Other', emoji: '🥩' },
];

export default function LiveAnimalsPage() {
  const queryClient = useQueryClient();
  const [search, setSearch] = useState('');
  const [animalFilter, setAnimalFilter] = useState<string>('all');
  const [statusFilter, setStatusFilter] = useState<string>('alive');
  const [showForm, setShowForm] = useState(false);
  const [editing, setEditing] = useState<LiveAnimal | null>(null);
  const [addingFeed, setAddingFeed] = useState<LiveAnimal | null>(null);

  const { data: animals = [], isLoading, refetch, isRefetching } = useQuery({
    queryKey: ['live-animals', animalFilter, statusFilter, search],
    queryFn: () => liveAnimalsApi.list({
      animalType: animalFilter === 'all' ? undefined : animalFilter,
      isSlaughtered: statusFilter === 'alive' ? false : statusFilter === 'slaughtered' ? true : undefined,
      isSold: statusFilter === 'sold' ? true : undefined,
      search: search.trim() || undefined,
    }),
  });

  const { data: summary } = useQuery({
    queryKey: ['live-animals-summary'],
    queryFn: () => liveAnimalsApi.summary(),
  });

  const removeMutation = useMutation({
    mutationFn: (id: string) => liveAnimalsApi.remove(id),
    onSuccess: () => {
      toast.success('Animal deactivated');
      queryClient.invalidateQueries({ queryKey: ['live-animals'] });
      queryClient.invalidateQueries({ queryKey: ['live-animals-summary'] });
    },
  });

  const totalInvestment = (summary?.totalCost?._sum?.purchasePrice ?? 0) + (summary?.totalCost?._sum?.totalFeedCost ?? 0);

  return (
    <div className="space-y-6">
      {/* HERO */}
      <section className="relative overflow-hidden rounded-3xl bg-gradient-to-br from-slate-950 via-amber-900 to-orange-800 text-white p-6 sm:p-8 shadow-2xl">
        <div className="absolute -top-20 -right-20 h-72 w-72 rounded-full bg-amber-400/20 blur-3xl" />
        <div className="relative flex flex-col lg:flex-row lg:items-center lg:justify-between gap-5">
          <div>
            <div className="inline-flex items-center gap-2 rounded-full bg-white/15 backdrop-blur px-3 py-1 text-xs font-extrabold border border-white/20">
              <Heart className="h-3.5 w-3.5 text-amber-300" />
              Livestock Inventory
            </div>
            <h1 className="mt-3 text-3xl sm:text-4xl font-extrabold leading-tight">🐄 Live Animals</h1>
            <p className="mt-2 text-sm text-white/80 font-semibold">Purchase → Feeding → Slaughter tracking</p>
          </div>
          <div className="flex items-center gap-2 flex-wrap">
            <button onClick={() => refetch()} disabled={isRefetching} className="inline-flex items-center gap-2 rounded-xl bg-white/15 hover:bg-white/25 px-4 py-2.5 text-sm font-bold backdrop-blur border border-white/20">
              <RefreshCw className={'h-4 w-4 ' + (isRefetching ? 'animate-spin' : '')} />
              Refresh
            </button>
            <Button className="bg-white text-slate-900 hover:bg-slate-100" onClick={() => { setEditing(null); setShowForm(true); }}>
              <Plus className="h-4 w-4" />
              Add Animal
            </Button>
          </div>
        </div>
      </section>

      {/* Stats */}
      <section className="grid grid-cols-2 lg:grid-cols-4 gap-4">
        <StatCard label="Alive Animals" value={summary?.aliveCount ?? 0} icon={Heart} color="emerald" />
        <StatCard label="Total Investment" value={formatPKR(totalInvestment)} icon={DollarSign} color="amber" />
        <StatCard label="Purchase Cost" value={formatPKR(summary?.totalCost?._sum?.purchasePrice ?? 0)} icon={Package} color="blue" />
        <StatCard label="Feed Cost" value={formatPKR(summary?.totalCost?._sum?.totalFeedCost ?? 0)} icon={Activity} color="orange" />
      </section>

      {/* Filters */}
      <section className="rounded-3xl bg-white dark:bg-neutral-900 border border-slate-200 dark:border-neutral-800 shadow-sm p-4 space-y-3">
        <div className="relative">
          <Search className="h-4 w-4 text-slate-400 absolute left-3.5 top-1/2 -translate-y-1/2" />
          <input value={search} onChange={(e) => setSearch(e.target.value)} placeholder="Search tag #, breed, vendor..." className="h-11 w-full rounded-xl border-2 border-slate-200 dark:border-neutral-700 bg-white dark:bg-neutral-800 pl-10 pr-3 text-sm font-semibold focus:outline-none focus:border-amber-500" />
        </div>
        <div className="flex gap-1.5 overflow-x-auto pb-1">
          <button onClick={() => setAnimalFilter('all')} className={
            'shrink-0 px-3 py-1.5 rounded-lg text-xs font-extrabold ' +
            (animalFilter === 'all' ? 'bg-amber-600 text-white shadow' : 'bg-slate-100 dark:bg-neutral-800 text-slate-700')
          }>All</button>
          {ANIMAL_TYPES.map((a) => (
            <button key={a.value} onClick={() => setAnimalFilter(a.value)} className={
              'shrink-0 px-3 py-1.5 rounded-lg text-xs font-extrabold ' +
              (animalFilter === a.value ? 'bg-amber-600 text-white shadow' : 'bg-slate-100 dark:bg-neutral-800 text-slate-700')
            }>{a.emoji} {a.label}</button>
          ))}
        </div>
        <div className="flex gap-1.5">
          {[
            { v: 'alive', label: '🐄 Alive' },
            { v: 'slaughtered', label: '⚔️ Slaughtered' },
            { v: 'sold', label: '💰 Sold' },
            { v: 'all', label: 'All' },
          ].map((s) => (
            <button key={s.v} onClick={() => setStatusFilter(s.v)} className={
              'px-3 py-1.5 rounded-lg text-xs font-extrabold ' +
              (statusFilter === s.v ? 'bg-slate-900 text-white shadow' : 'bg-slate-100 dark:bg-neutral-800 text-slate-700')
            }>{s.label}</button>
          ))}
        </div>
      </section>

      {showForm && (
        <AnimalForm
          editing={editing}
          onClose={() => { setShowForm(false); setEditing(null); }}
          onSaved={() => {
            setShowForm(false);
            setEditing(null);
            queryClient.invalidateQueries({ queryKey: ['live-animals'] });
            queryClient.invalidateQueries({ queryKey: ['live-animals-summary'] });
          }}
        />
      )}

      {addingFeed && (
        <FeedCostModal
          animal={addingFeed}
          onClose={() => setAddingFeed(null)}
          onSaved={() => {
            setAddingFeed(null);
            queryClient.invalidateQueries({ queryKey: ['live-animals'] });
          }}
        />
      )}

      {isLoading ? (
        <div className="grid sm:grid-cols-2 lg:grid-cols-3 gap-4">
          {[1, 2, 3, 4, 5, 6].map((i) => <div key={i} className="h-64 rounded-2xl bg-slate-100 dark:bg-neutral-800 animate-pulse" />)}
        </div>
      ) : animals.length === 0 ? (
        <div className="rounded-3xl bg-white dark:bg-neutral-900 border-2 border-dashed border-slate-200 dark:border-neutral-800 p-12 text-center">
          <Heart className="h-16 w-16 text-slate-400 mx-auto mb-3" />
          <p className="font-extrabold text-slate-700">No animals in inventory</p>
          <Button className="mt-4 bg-gradient-to-r from-amber-600 to-orange-700" onClick={() => { setEditing(null); setShowForm(true); }}>
            <Plus className="h-4 w-4" />
            Add First Animal
          </Button>
        </div>
      ) : (
        <section className="grid sm:grid-cols-2 lg:grid-cols-3 gap-4">
          {animals.map((animal) => (
            <AnimalCard
              key={animal.id}
              animal={animal}
              onEdit={() => { setEditing(animal); setShowForm(true); }}
              onAddFeed={() => setAddingFeed(animal)}
              onDelete={() => { if (confirm('Remove ' + animal.tagNumber + '?')) removeMutation.mutate(animal.id); }}
            />
          ))}
        </section>
      )}
    </div>
  );
}

function StatCard({ label, value, icon: Icon, color }: any) {
  const colors: Record<string, string> = {
    emerald: 'from-emerald-500 to-green-600',
    amber: 'from-amber-500 to-orange-600',
    blue: 'from-blue-500 to-cyan-600',
    orange: 'from-orange-500 to-red-600',
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

function AnimalCard({ animal, onEdit, onAddFeed, onDelete }: any) {
  const animalCfg = ANIMAL_TYPES.find((a) => a.value === animal.animalType);
  const daysHeld = differenceInDays(new Date(), new Date(animal.purchaseDate));
  const totalCost = animal.purchasePrice + animal.totalFeedCost;
  const costPerKg = animal.weightKg > 0 ? totalCost / animal.weightKg : 0;

  return (
    <div className={
      'rounded-2xl bg-white dark:bg-neutral-900 border-2 shadow-sm hover:shadow-lg transition p-4 space-y-3 ' +
      (animal.isSlaughtered ? 'border-slate-300 opacity-70' : animal.isSold ? 'border-blue-300' : 'border-emerald-200')
    }>
      <div className="flex items-start gap-3">
        {animal.photoUrls?.[0] ? (
          <img src={animal.photoUrls[0]} alt="" className="h-16 w-16 rounded-2xl object-cover ring-2 ring-slate-200 shrink-0" />
        ) : (
          <div className="h-16 w-16 rounded-2xl bg-gradient-to-br from-amber-500 to-orange-600 text-white flex items-center justify-center text-3xl shrink-0">
            {animalCfg?.emoji}
          </div>
        )}
        <div className="flex-1 min-w-0">
          <div className="flex items-center gap-2 flex-wrap">
            <span className="font-extrabold text-slate-900 dark:text-white">{animal.tagNumber}</span>
            {animal.isSlaughtered ? (
              <span className="px-1.5 py-0.5 rounded bg-slate-600 text-white text-[9px] font-extrabold uppercase">SLAUGHTERED</span>
            ) : animal.isSold ? (
              <span className="px-1.5 py-0.5 rounded bg-blue-600 text-white text-[9px] font-extrabold uppercase">SOLD</span>
            ) : (
              <span className="px-1.5 py-0.5 rounded bg-emerald-600 text-white text-[9px] font-extrabold uppercase">ALIVE</span>
            )}
            {!animal.isHealthy && (
              <span className="px-1.5 py-0.5 rounded bg-rose-600 text-white text-[9px] font-extrabold uppercase inline-flex items-center gap-0.5">
                <AlertCircle className="h-2 w-2" />
                SICK
              </span>
            )}
          </div>
          <div className="text-xs font-bold text-slate-600 mt-0.5">
            {animalCfg?.label} {animal.breed && '• ' + animal.breed}
          </div>
          {animal.sex && (
            <div className="text-[10px] font-bold text-slate-500">
              {animal.sex} {animal.ageMonths && '• ' + animal.ageMonths + ' months'}
            </div>
          )}
        </div>
      </div>

      <div className="grid grid-cols-2 gap-2 text-xs">
        <div className="rounded-lg bg-slate-50 dark:bg-neutral-800/50 p-2">
          <div className="text-[9px] uppercase font-extrabold text-slate-500">Weight</div>
          <div className="text-lg font-extrabold tabular-nums">{animal.weightKg}kg</div>
        </div>
        <div className="rounded-lg bg-blue-50 dark:bg-blue-950/30 p-2">
          <div className="text-[9px] uppercase font-extrabold text-blue-700">Days Held</div>
          <div className="text-lg font-extrabold text-blue-800 tabular-nums">{daysHeld || animal.daysHeld}d</div>
        </div>
      </div>

      <div className="grid grid-cols-3 gap-1.5 text-xs">
        <div className="rounded-lg bg-amber-50 dark:bg-amber-950/30 p-2 text-center">
          <div className="text-[9px] uppercase font-extrabold text-amber-700">Purchase</div>
          <div className="text-xs font-extrabold text-amber-800 tabular-nums">{formatPKR(animal.purchasePrice).replace('Rs', '').trim()}</div>
        </div>
        <div className="rounded-lg bg-orange-50 dark:bg-orange-950/30 p-2 text-center">
          <div className="text-[9px] uppercase font-extrabold text-orange-700">Feed</div>
          <div className="text-xs font-extrabold text-orange-800 tabular-nums">{formatPKR(animal.totalFeedCost).replace('Rs', '').trim()}</div>
        </div>
        <div className="rounded-lg bg-emerald-50 dark:bg-emerald-950/30 p-2 text-center">
          <div className="text-[9px] uppercase font-extrabold text-emerald-700">Total</div>
          <div className="text-xs font-extrabold text-emerald-800 tabular-nums">{formatPKR(totalCost).replace('Rs', '').trim()}</div>
        </div>
      </div>

      {costPerKg > 0 && (
        <div className="text-center text-xs">
          <span className="text-slate-500 font-semibold">Cost/kg:</span>{' '}
          <span className="font-extrabold text-emerald-700 tabular-nums">{formatPKR(costPerKg)}</span>
        </div>
      )}

      {animal.vendorName && (
        <div className="text-[10px] text-slate-500 font-bold truncate">
          <User className="h-2.5 w-2.5 inline mr-0.5" />
          From: {animal.vendorName}
        </div>
      )}

      {/* Actions */}
      {!animal.isSlaughtered && !animal.isSold && (
        <div className="flex gap-1 pt-2 border-t border-slate-100 dark:border-neutral-800">
          <button onClick={onAddFeed} className="flex-1 h-9 rounded-lg bg-orange-100 dark:bg-orange-950/40 hover:bg-orange-200 text-orange-700 text-xs font-extrabold inline-flex items-center justify-center gap-1">
            <Activity className="h-3 w-3" />
            Feed Cost
          </button>
          <button onClick={onEdit} className="h-9 w-9 rounded-lg bg-slate-100 dark:bg-neutral-800 hover:bg-slate-200 text-slate-700 flex items-center justify-center">
            <Edit3 className="h-3.5 w-3.5" />
          </button>
          <button onClick={onDelete} className="h-9 w-9 rounded-lg bg-rose-50 dark:bg-rose-950/40 hover:bg-rose-100 text-rose-600 flex items-center justify-center">
            <Trash2 className="h-3.5 w-3.5" />
          </button>
        </div>
      )}
    </div>
  );
}

function AnimalForm({ editing, onClose, onSaved }: any) {
  const [form, setForm] = useState<any>({
    tagNumber: editing?.tagNumber ?? '',
    animalType: editing?.animalType ?? 'GOAT',
    breed: editing?.breed ?? '',
    color: editing?.color ?? '',
    sex: editing?.sex ?? '',
    ageMonths: editing?.ageMonths ?? '',
    weightKg: editing?.weightKg ?? 0,
    purchasePrice: editing?.purchasePrice ?? 0,
    purchaseDate: editing?.purchaseDate ? editing.purchaseDate.slice(0, 10) : new Date().toISOString().split('T')[0],
    vendorName: editing?.vendorName ?? '',
    sourceName: editing?.sourceName ?? '',
    vaccinationStatus: editing?.vaccinationStatus ?? '',
    isHealthy: editing?.isHealthy ?? true,
    healthNotes: editing?.healthNotes ?? '',
    feedingType: editing?.feedingType ?? '',
    dailyFeedCost: editing?.dailyFeedCost ?? 0,
    photoUrls: editing?.photoUrls ?? [],
    notes: editing?.notes ?? '',
  });

  const saveMutation = useMutation({
    mutationFn: () => {
      const payload: any = {
        ...form,
        weightKg: Number(form.weightKg) || 0,
        purchasePrice: Number(form.purchasePrice) || 0,
        ageMonths: form.ageMonths ? Number(form.ageMonths) : undefined,
        dailyFeedCost: Number(form.dailyFeedCost) || 0,
      };
      return editing ? liveAnimalsApi.update(editing.id, payload) : liveAnimalsApi.create(payload);
    },
    onSuccess: () => { toast.success(editing ? 'Animal updated' : 'Animal added'); onSaved(); },
    onError: (e: any) => toast.error(e?.response?.data?.message || 'Failed'),
  });

  return (
    <section className="rounded-3xl bg-white dark:bg-neutral-900 border-2 border-amber-300 dark:border-amber-800 shadow-lg overflow-hidden">
      <div className="px-5 py-3 border-b border-slate-100 dark:border-neutral-800 bg-amber-50 dark:bg-amber-950/30 flex items-center justify-between">
        <h3 className="font-extrabold text-slate-900 dark:text-white">{editing ? 'Edit Animal' : 'Add Live Animal'}</h3>
        <button onClick={onClose} className="h-8 w-8 rounded-lg hover:bg-white flex items-center justify-center">
          <X className="h-4 w-4" />
        </button>
      </div>
      <div className="p-5 space-y-4 max-h-[85vh] overflow-y-auto">
        <div className="grid sm:grid-cols-2 gap-3">
          <input value={form.tagNumber} onChange={(e) => setForm({ ...form, tagNumber: e.target.value })} placeholder="Tag # (auto if blank)" className="h-11 rounded-xl border-2 border-slate-200 dark:border-neutral-700 bg-white dark:bg-neutral-800 px-3 text-sm font-mono font-bold focus:outline-none focus:border-amber-500" />
          <select value={form.animalType} onChange={(e) => setForm({ ...form, animalType: e.target.value })} className="h-11 rounded-xl border-2 border-slate-200 dark:border-neutral-700 bg-white dark:bg-neutral-800 px-3 text-sm font-bold focus:outline-none focus:border-amber-500">
            {ANIMAL_TYPES.map((a) => <option key={a.value} value={a.value}>{a.emoji} {a.label}</option>)}
          </select>
          <input value={form.breed} onChange={(e) => setForm({ ...form, breed: e.target.value })} placeholder="Breed (Sahiwal, Beetal, Kajli...)" className="h-11 rounded-xl border-2 border-slate-200 dark:border-neutral-700 bg-white dark:bg-neutral-800 px-3 text-sm font-bold focus:outline-none focus:border-amber-500" />
          <input value={form.color} onChange={(e) => setForm({ ...form, color: e.target.value })} placeholder="Color" className="h-11 rounded-xl border-2 border-slate-200 dark:border-neutral-700 bg-white dark:bg-neutral-800 px-3 text-sm font-bold focus:outline-none focus:border-amber-500" />
          <select value={form.sex} onChange={(e) => setForm({ ...form, sex: e.target.value })} className="h-11 rounded-xl border-2 border-slate-200 dark:border-neutral-700 bg-white dark:bg-neutral-800 px-3 text-sm font-bold focus:outline-none focus:border-amber-500">
            <option value="">-- Sex --</option>
            <option value="Male">♂️ Male</option>
            <option value="Female">♀️ Female</option>
          </select>
          <input type="number" value={form.ageMonths} onChange={(e) => setForm({ ...form, ageMonths: e.target.value })} placeholder="Age (months)" className="h-11 rounded-xl border-2 border-slate-200 dark:border-neutral-700 bg-white dark:bg-neutral-800 px-3 text-sm font-bold tabular-nums focus:outline-none focus:border-amber-500" />
        </div>

        <div className="grid grid-cols-3 gap-3">
          <div>
            <label className="text-[10px] uppercase font-extrabold text-blue-700 mb-1 block">Weight (kg) *</label>
            <input type="number" step="0.1" value={form.weightKg} onChange={(e) => setForm({ ...form, weightKg: e.target.value })} className="h-14 w-full rounded-xl border-2 border-blue-300 bg-blue-50 dark:bg-blue-950/30 px-3 text-xl font-extrabold tabular-nums focus:outline-none focus:border-blue-500" />
          </div>
          <div>
            <label className="text-[10px] uppercase font-extrabold text-emerald-700 mb-1 block">Purchase Price *</label>
            <input type="number" step="0.01" value={form.purchasePrice} onChange={(e) => setForm({ ...form, purchasePrice: e.target.value })} className="h-14 w-full rounded-xl border-2 border-emerald-300 bg-emerald-50 dark:bg-emerald-950/30 px-3 text-xl font-extrabold tabular-nums focus:outline-none focus:border-emerald-500" />
          </div>
          <div>
            <label className="text-[10px] uppercase font-extrabold text-slate-600 mb-1 block">Purchase Date</label>
            <input type="date" value={form.purchaseDate} onChange={(e) => setForm({ ...form, purchaseDate: e.target.value })} className="h-14 w-full rounded-xl border-2 border-slate-200 dark:border-neutral-700 bg-white dark:bg-neutral-800 px-3 text-sm font-bold focus:outline-none focus:border-amber-500" />
          </div>
        </div>

        <div className="grid sm:grid-cols-2 gap-3">
          <input value={form.vendorName} onChange={(e) => setForm({ ...form, vendorName: e.target.value })} placeholder="Vendor / Seller name" className="h-11 rounded-xl border-2 border-slate-200 dark:border-neutral-700 bg-white dark:bg-neutral-800 px-3 text-sm font-bold focus:outline-none focus:border-amber-500" />
          <input value={form.sourceName} onChange={(e) => setForm({ ...form, sourceName: e.target.value })} placeholder="Source (Mandi, Farm...)" className="h-11 rounded-xl border-2 border-slate-200 dark:border-neutral-700 bg-white dark:bg-neutral-800 px-3 text-sm font-bold focus:outline-none focus:border-amber-500" />
        </div>

        <div className="rounded-xl border-2 border-emerald-200 dark:border-emerald-800 bg-emerald-50 dark:bg-emerald-950/30 p-4 space-y-2">
          <div className="text-sm font-extrabold text-emerald-900 flex items-center gap-2">
            <Activity className="h-4 w-4" />
            Health & Vaccination
          </div>
          <input value={form.vaccinationStatus} onChange={(e) => setForm({ ...form, vaccinationStatus: e.target.value })} placeholder="Vaccination status" className="h-10 w-full rounded-lg border-2 border-emerald-300 bg-white dark:bg-emerald-950/40 px-3 text-sm font-bold focus:outline-none focus:border-emerald-500" />
          <label className="flex items-center gap-2 p-2 rounded-lg cursor-pointer">
            <input type="checkbox" checked={form.isHealthy} onChange={(e) => setForm({ ...form, isHealthy: e.target.checked })} className="h-4 w-4 rounded" />
            <span className="text-sm font-extrabold text-emerald-900">Animal is healthy</span>
          </label>
          <textarea rows={2} value={form.healthNotes} onChange={(e) => setForm({ ...form, healthNotes: e.target.value })} placeholder="Health notes..." className="w-full rounded-lg border-2 border-emerald-300 bg-white dark:bg-emerald-950/40 px-3 py-2 text-sm font-semibold focus:outline-none focus:border-emerald-500 resize-none" />
        </div>

        <div className="rounded-xl border-2 border-orange-200 dark:border-orange-800 bg-orange-50 dark:bg-orange-950/30 p-4 space-y-2">
          <div className="text-sm font-extrabold text-orange-900 flex items-center gap-2">
            <Package className="h-4 w-4" />
            Feeding
          </div>
          <div className="grid sm:grid-cols-2 gap-2">
            <input value={form.feedingType} onChange={(e) => setForm({ ...form, feedingType: e.target.value })} placeholder="Feed type (grass, wanda, khal)" className="h-10 rounded-lg border-2 border-orange-300 bg-white dark:bg-orange-950/40 px-3 text-sm font-bold focus:outline-none focus:border-orange-500" />
            <input type="number" value={form.dailyFeedCost} onChange={(e) => setForm({ ...form, dailyFeedCost: e.target.value })} placeholder="Daily feed cost (Rs)" className="h-10 rounded-lg border-2 border-orange-300 bg-white dark:bg-orange-950/40 px-3 text-sm font-extrabold tabular-nums focus:outline-none focus:border-orange-500" />
          </div>
        </div>

        <div>
          <label className="text-[10px] uppercase font-extrabold text-slate-600 mb-1 block flex items-center gap-1">
            <Camera className="h-3 w-3" />
            Photos
          </label>
          {form.photoUrls.length > 0 && (
            <div className="grid grid-cols-4 gap-1 mb-2">
              {form.photoUrls.map((url: string, i: number) => (
                <div key={i} className="relative aspect-square rounded-lg overflow-hidden border border-slate-200">
                  <img src={url} alt="" className="w-full h-full object-cover" />
                  <button onClick={() => setForm({ ...form, photoUrls: form.photoUrls.filter((_: any, idx: number) => idx !== i) })} className="absolute top-0 right-0 h-5 w-5 rounded-bl bg-rose-600 text-white flex items-center justify-center">
                    <X className="h-2.5 w-2.5" />
                  </button>
                </div>
              ))}
            </div>
          )}
          <UploadDropzone onUploaded={(records) => {
            const urls = Array.isArray(records) ? records.map((r: any) => r.url || r).filter(Boolean) : [(records as any)?.url || records];
            setForm({ ...form, photoUrls: [...form.photoUrls, ...urls] });
          }} />
        </div>

        <textarea rows={2} value={form.notes} onChange={(e) => setForm({ ...form, notes: e.target.value })} placeholder="Notes..." className="w-full rounded-xl border-2 border-slate-200 dark:border-neutral-700 bg-white dark:bg-neutral-800 px-3 py-2 text-sm font-semibold focus:outline-none focus:border-amber-500 resize-none" />

        <div className="flex gap-2 pt-2 border-t border-slate-100 dark:border-neutral-800">
          <Button variant="secondary" className="flex-1" onClick={onClose}>Cancel</Button>
          <Button className="flex-1 bg-gradient-to-r from-amber-600 to-orange-700" onClick={() => saveMutation.mutate()} loading={saveMutation.isPending} disabled={!form.weightKg || !form.purchasePrice}>
            <Save className="h-4 w-4" />
            {editing ? 'Update' : 'Add Animal'}
          </Button>
        </div>
      </div>
    </section>
  );
}

function FeedCostModal({ animal, onClose, onSaved }: any) {
  const [days, setDays] = useState(1);
  const [costPerDay, setCostPerDay] = useState(animal.dailyFeedCost || 0);

  const feedMutation = useMutation({
    mutationFn: () => liveAnimalsApi.addFeedCost(animal.id, days, costPerDay),
    onSuccess: () => { toast.success('Feed cost added'); onSaved(); },
    onError: (e: any) => toast.error(e?.response?.data?.message || 'Failed'),
  });

  return (
    <div className="fixed inset-0 z-50 bg-slate-950/70 backdrop-blur-sm flex items-center justify-center p-4">
      <div className="w-full max-w-md bg-white dark:bg-neutral-900 rounded-3xl shadow-2xl overflow-hidden">
        <div className="px-5 py-3 border-b border-slate-200 dark:border-neutral-800 bg-orange-50 dark:bg-orange-950/30 flex items-center justify-between">
          <div>
            <h3 className="font-extrabold text-slate-900 dark:text-white">Add Feed Cost</h3>
            <p className="text-xs text-slate-500 font-semibold">{animal.tagNumber} • {animal.animalType}</p>
          </div>
          <button onClick={onClose} className="h-8 w-8 rounded-lg hover:bg-white flex items-center justify-center">
            <X className="h-4 w-4" />
          </button>
        </div>
        <div className="p-5 space-y-3">
          <div>
            <label className="text-[10px] uppercase font-extrabold text-orange-700 mb-1 block">Days</label>
            <input type="number" min="1" value={days} onChange={(e) => setDays(Number(e.target.value))} className="h-14 w-full rounded-xl border-2 border-orange-300 bg-orange-50 dark:bg-orange-950/30 px-4 text-2xl font-extrabold tabular-nums text-center focus:outline-none focus:border-orange-500" />
          </div>
          <div>
            <label className="text-[10px] uppercase font-extrabold text-orange-700 mb-1 block">Cost per Day (Rs)</label>
            <input type="number" step="0.01" value={costPerDay} onChange={(e) => setCostPerDay(Number(e.target.value))} className="h-14 w-full rounded-xl border-2 border-orange-300 bg-orange-50 dark:bg-orange-950/30 px-4 text-2xl font-extrabold tabular-nums focus:outline-none focus:border-orange-500" />
          </div>
          <div className="rounded-lg bg-emerald-50 dark:bg-emerald-950/30 border-2 border-emerald-200 p-3 text-center">
            <div className="text-[10px] uppercase font-extrabold text-emerald-700">Total to add</div>
            <div className="text-2xl font-extrabold text-emerald-800 tabular-nums">{formatPKR(days * costPerDay)}</div>
          </div>
          <div className="flex gap-2">
            <Button variant="secondary" className="flex-1" onClick={onClose}>Cancel</Button>
            <Button className="flex-1 bg-gradient-to-r from-orange-600 to-red-700" onClick={() => feedMutation.mutate()} loading={feedMutation.isPending} disabled={days <= 0 || costPerDay <= 0}>
              <CheckCircle2 className="h-4 w-4" />
              Add Cost
            </Button>
          </div>
        </div>
      </div>
    </div>
  );
}
