import { useState } from 'react';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import {
  Calendar, Plus, X, Save, RefreshCw, Sparkles, Sprout,
  CheckCircle2, Trash2,
} from 'lucide-react';
import { seasonalPlansApi } from '../api/seasonal-plans.api';
import { Button } from '@/components/ui/Button';
import { toast } from 'sonner';
import { format } from 'date-fns';

const SEASONS = [
  { value: 'KHARIF', label: 'Kharif', emoji: '🌧️', color: 'from-blue-500 to-cyan-600' },
  { value: 'RABI', label: 'Rabi', emoji: '❄️', color: 'from-cyan-500 to-teal-600' },
  { value: 'ZAID', label: 'Zaid', emoji: '☀️', color: 'from-amber-500 to-orange-600' },
  { value: 'ALL_SEASON', label: 'All Season', emoji: '🌍', color: 'from-emerald-500 to-green-600' },
];

const CROPS = ['Wheat', 'Rice', 'Cotton', 'Sugarcane', 'Maize', 'Potato', 'Tomato', 'Onion', 'Chilli', 'Pulses', 'Fodder', 'Soybean', 'Mustard', 'Sunflower'];

export default function SeasonalPlansPage() {
  const queryClient = useQueryClient();
  const [seasonFilter, setSeasonFilter] = useState<string>('all');
  const [showForm, setShowForm] = useState(false);

  const { data: plans = [], isLoading, refetch, isRefetching } = useQuery({
    queryKey: ['seasonal-plans', seasonFilter],
    queryFn: () => seasonalPlansApi.list({
      season: seasonFilter === 'all' ? undefined : seasonFilter,
      active: true,
    }),
  });

  const removeMutation = useMutation({
    mutationFn: (id: string) => seasonalPlansApi.remove(id),
    onSuccess: () => { toast.success('Plan deactivated'); queryClient.invalidateQueries({ queryKey: ['seasonal-plans'] }); },
  });

  return (
    <div className="space-y-6">
      <section className="relative overflow-hidden rounded-3xl bg-gradient-to-br from-slate-950 via-cyan-900 to-blue-800 text-white p-6 sm:p-8 shadow-2xl">
        <div className="absolute -top-20 -right-20 h-72 w-72 rounded-full bg-cyan-400/20 blur-3xl" />
        <div className="relative flex flex-col lg:flex-row lg:items-center lg:justify-between gap-5">
          <div>
            <div className="inline-flex items-center gap-2 rounded-full bg-white/15 backdrop-blur px-3 py-1 text-xs font-extrabold border border-white/20">
              <Calendar className="h-3.5 w-3.5 text-amber-300" />
              Crop Calendar
            </div>
            <h1 className="mt-3 text-3xl sm:text-4xl font-extrabold leading-tight">📅 Seasonal Plans</h1>
            <p className="mt-2 text-sm text-white/80 font-semibold">Kharif/Rabi/Zaid crop schedules</p>
          </div>
          <div className="flex items-center gap-2 flex-wrap">
            <button onClick={() => refetch()} disabled={isRefetching} className="inline-flex items-center gap-2 rounded-xl bg-white/15 hover:bg-white/25 px-4 py-2.5 text-sm font-bold backdrop-blur border border-white/20">
              <RefreshCw className={'h-4 w-4 ' + (isRefetching ? 'animate-spin' : '')} />
              Refresh
            </button>
            <Button className="bg-white text-slate-900 hover:bg-slate-100" onClick={() => setShowForm(true)}>
              <Plus className="h-4 w-4" />
              New Plan
            </Button>
          </div>
        </div>
      </section>

      <div className="flex gap-1.5">
        <button onClick={() => setSeasonFilter('all')} className={
          'px-3 py-1.5 rounded-lg text-xs font-extrabold ' +
          (seasonFilter === 'all' ? 'bg-cyan-600 text-white shadow' : 'bg-slate-100 dark:bg-neutral-800 text-slate-700')
        }>All Seasons</button>
        {SEASONS.map((s) => (
          <button key={s.value} onClick={() => setSeasonFilter(s.value)} className={
            'px-3 py-1.5 rounded-lg text-xs font-extrabold ' +
            (seasonFilter === s.value ? 'bg-cyan-600 text-white shadow' : 'bg-slate-100 dark:bg-neutral-800 text-slate-700')
          }>{s.emoji} {s.label}</button>
        ))}
      </div>

      {showForm && (
        <SeasonalPlanForm
          onClose={() => setShowForm(false)}
          onSaved={() => { setShowForm(false); queryClient.invalidateQueries({ queryKey: ['seasonal-plans'] }); }}
        />
      )}

      {isLoading ? (
        <div className="grid sm:grid-cols-2 lg:grid-cols-3 gap-4">
          {[1, 2, 3].map((i) => <div key={i} className="h-48 rounded-2xl bg-slate-100 dark:bg-neutral-800 animate-pulse" />)}
        </div>
      ) : plans.length === 0 ? (
        <div className="rounded-3xl bg-white dark:bg-neutral-900 border-2 border-dashed border-slate-200 dark:border-neutral-800 p-12 text-center">
          <Calendar className="h-16 w-16 text-slate-400 mx-auto mb-3" />
          <p className="font-extrabold text-slate-700">No seasonal plans yet</p>
        </div>
      ) : (
        <section className="grid sm:grid-cols-2 lg:grid-cols-3 gap-4">
          {plans.map((plan) => {
            const season = SEASONS.find((s) => s.value === plan.season);
            return (
              <div key={plan.id} className="rounded-2xl bg-white dark:bg-neutral-900 border-2 border-slate-200 dark:border-neutral-800 shadow-sm hover:shadow-lg transition overflow-hidden">
                <div className={'p-4 text-white bg-gradient-to-br ' + (season?.color ?? 'from-slate-500 to-slate-700')}>
                  <div className="flex items-center justify-between">
                    <div className="text-3xl">{season?.emoji}</div>
                    <span className="px-2 py-0.5 rounded bg-white/20 text-white text-[10px] font-extrabold uppercase">{plan.year}</span>
                  </div>
                  <div className="mt-2 text-xs uppercase font-extrabold text-white/80">{season?.label}</div>
                  <div className="text-xl font-extrabold">{plan.cropName}</div>
                </div>
                <div className="p-4 space-y-2">
                  <div className="grid grid-cols-2 gap-2 text-xs">
                    <div>
                      <div className="text-[9px] uppercase font-extrabold text-green-700">Sowing</div>
                      <div className="font-bold">{format(new Date(plan.sowingStart), 'dd MMM')} – {format(new Date(plan.sowingEnd), 'dd MMM')}</div>
                    </div>
                    <div>
                      <div className="text-[9px] uppercase font-extrabold text-amber-700">Harvest</div>
                      <div className="font-bold">{format(new Date(plan.harvestStart), 'dd MMM')} – {format(new Date(plan.harvestEnd), 'dd MMM')}</div>
                    </div>
                  </div>
                  <button onClick={() => { if (confirm('Remove this plan?')) removeMutation.mutate(plan.id); }} className="w-full h-8 rounded-lg bg-rose-50 hover:bg-rose-100 text-rose-600 text-xs font-extrabold inline-flex items-center justify-center gap-1">
                    <Trash2 className="h-3 w-3" />
                    Remove
                  </button>
                </div>
              </div>
            );
          })}
        </section>
      )}
    </div>
  );
}

function SeasonalPlanForm({ onClose, onSaved }: any) {
  const [form, setForm] = useState<any>({
    season: 'KHARIF',
    year: new Date().getFullYear(),
    cropName: 'Wheat',
    sowingStart: '',
    sowingEnd: '',
    harvestStart: '',
    harvestEnd: '',
  });

  const saveMutation = useMutation({
    mutationFn: () => seasonalPlansApi.create({
      ...form,
      year: Number(form.year),
    }),
    onSuccess: () => { toast.success('Plan created'); onSaved(); },
    onError: (e: any) => toast.error(e?.response?.data?.message || 'Failed'),
  });

  return (
    <section className="rounded-3xl bg-white dark:bg-neutral-900 border-2 border-cyan-300 dark:border-cyan-800 shadow-lg overflow-hidden">
      <div className="px-5 py-3 border-b bg-cyan-50 dark:bg-cyan-950/30 flex items-center justify-between">
        <h3 className="font-extrabold">📅 New Seasonal Plan</h3>
        <button onClick={onClose} className="h-8 w-8 rounded-lg hover:bg-white flex items-center justify-center">
          <X className="h-4 w-4" />
        </button>
      </div>
      <div className="p-5 space-y-4">
        <div className="grid sm:grid-cols-3 gap-3">
          <select value={form.season} onChange={(e) => setForm({ ...form, season: e.target.value })} className="h-11 rounded-xl border-2 border-slate-200 dark:border-neutral-700 bg-white dark:bg-neutral-800 px-3 text-sm font-bold focus:outline-none focus:border-cyan-500">
            {SEASONS.map((s) => <option key={s.value} value={s.value}>{s.emoji} {s.label}</option>)}
          </select>
          <input type="number" value={form.year} onChange={(e) => setForm({ ...form, year: e.target.value })} className="h-11 rounded-xl border-2 border-slate-200 dark:border-neutral-700 bg-white dark:bg-neutral-800 px-3 text-sm font-extrabold tabular-nums focus:outline-none focus:border-cyan-500" />
          <select value={form.cropName} onChange={(e) => setForm({ ...form, cropName: e.target.value })} className="h-11 rounded-xl border-2 border-slate-200 dark:border-neutral-700 bg-white dark:bg-neutral-800 px-3 text-sm font-bold focus:outline-none focus:border-cyan-500">
            {CROPS.map((c) => <option key={c} value={c}>{c}</option>)}
          </select>
        </div>
        <div className="grid sm:grid-cols-2 gap-3">
          <div>
            <label className="text-[10px] uppercase font-extrabold text-green-700 mb-1 block">Sowing Start</label>
            <input type="date" value={form.sowingStart} onChange={(e) => setForm({ ...form, sowingStart: e.target.value })} className="h-11 w-full rounded-xl border-2 border-green-300 bg-green-50 dark:bg-green-950/30 px-3 text-sm font-bold focus:outline-none focus:border-green-500" />
          </div>
          <div>
            <label className="text-[10px] uppercase font-extrabold text-green-700 mb-1 block">Sowing End</label>
            <input type="date" value={form.sowingEnd} onChange={(e) => setForm({ ...form, sowingEnd: e.target.value })} className="h-11 w-full rounded-xl border-2 border-green-300 bg-green-50 dark:bg-green-950/30 px-3 text-sm font-bold focus:outline-none focus:border-green-500" />
          </div>
          <div>
            <label className="text-[10px] uppercase font-extrabold text-amber-700 mb-1 block">Harvest Start</label>
            <input type="date" value={form.harvestStart} onChange={(e) => setForm({ ...form, harvestStart: e.target.value })} className="h-11 w-full rounded-xl border-2 border-amber-300 bg-amber-50 dark:bg-amber-950/30 px-3 text-sm font-bold focus:outline-none focus:border-amber-500" />
          </div>
          <div>
            <label className="text-[10px] uppercase font-extrabold text-amber-700 mb-1 block">Harvest End</label>
            <input type="date" value={form.harvestEnd} onChange={(e) => setForm({ ...form, harvestEnd: e.target.value })} className="h-11 w-full rounded-xl border-2 border-amber-300 bg-amber-50 dark:bg-amber-950/30 px-3 text-sm font-bold focus:outline-none focus:border-amber-500" />
          </div>
        </div>
        <div className="flex gap-2 pt-2 border-t border-slate-100 dark:border-neutral-800">
          <Button variant="secondary" className="flex-1" onClick={onClose}>Cancel</Button>
          <Button className="flex-1 bg-gradient-to-r from-cyan-600 to-blue-700" onClick={() => saveMutation.mutate()} loading={saveMutation.isPending} disabled={!form.sowingStart || !form.sowingEnd || !form.harvestStart || !form.harvestEnd}>
            <Save className="h-4 w-4" />
            Create Plan
          </Button>
        </div>
      </div>
    </section>
  );
}
