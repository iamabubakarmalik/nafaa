import { useState } from 'react';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import {
  Leaf, Plus, Search, X, Save, RefreshCw, Sparkles, User, Calendar,
  CheckCircle2, Clock, MapPin, FlaskConical, ArrowRight,
} from 'lucide-react';
import { advisoryApi } from '../api/advisory.api';
import { farmersApi } from '../api/farmers.api';
import { Button } from '@core/ui/Button';
import { toast } from 'sonner';
import { format } from 'date-fns';

const CROPS = ['Wheat', 'Rice', 'Cotton', 'Sugarcane', 'Maize', 'Potato', 'Tomato', 'Onion', 'Chilli', 'Pulses', 'Fodder', 'Cotton', 'Soybean', 'Mustard', 'Sunflower'];
const STAGES = ['Pre-sowing', 'Sowing', 'Germination', 'Vegetative', 'Flowering', 'Fruiting', 'Harvest', 'Post-harvest'];

export default function AdvisoryPage() {
  const queryClient = useQueryClient();
  const [search, setSearch] = useState('');
  const [completedFilter, setCompletedFilter] = useState<string>('pending');
  const [showForm, setShowForm] = useState(false);

  const { data: advisories = [], isLoading, refetch, isRefetching } = useQuery({
    queryKey: ['agri-advisories', completedFilter, search],
    queryFn: () => advisoryApi.list({
      completed: completedFilter === 'pending' ? false : completedFilter === 'completed' ? true : undefined,
      cropName: search.trim() || undefined,
    }),
  });

  const completeMutation = useMutation({
    mutationFn: (id: string) => advisoryApi.complete(id),
    onSuccess: () => { toast.success('Advisory completed'); queryClient.invalidateQueries({ queryKey: ['agri-advisories'] }); },
  });

  return (
    <div className="space-y-6">
      <section className="relative overflow-hidden rounded-3xl bg-gradient-to-br from-slate-950 via-lime-900 to-green-800 text-white p-6 sm:p-8 shadow-2xl">
        <div className="absolute -top-20 -right-20 h-72 w-72 rounded-full bg-lime-400/20 blur-3xl" />
        <div className="relative flex flex-col lg:flex-row lg:items-center lg:justify-between gap-5">
          <div>
            <div className="inline-flex items-center gap-2 rounded-full bg-white/15 backdrop-blur px-3 py-1 text-xs font-extrabold border border-white/20">
              <Leaf className="h-3.5 w-3.5 text-amber-300" />
              Crop Consultation
            </div>
            <h1 className="mt-3 text-3xl sm:text-4xl font-extrabold leading-tight">🌿 Crop Advisory</h1>
            <p className="mt-2 text-sm text-white/80 font-semibold">Soil tests, recommendations, follow-ups</p>
          </div>
          <div className="flex items-center gap-2 flex-wrap">
            <button onClick={() => refetch()} disabled={isRefetching} className="inline-flex items-center gap-2 rounded-xl bg-white/15 hover:bg-white/25 px-4 py-2.5 text-sm font-bold backdrop-blur border border-white/20">
              <RefreshCw className={'h-4 w-4 ' + (isRefetching ? 'animate-spin' : '')} />
              Refresh
            </button>
            <Button className="bg-white text-slate-900 hover:bg-slate-100" onClick={() => setShowForm(true)}>
              <Plus className="h-4 w-4" />
              New Advisory
            </Button>
          </div>
        </div>
      </section>

      <section className="rounded-3xl bg-white dark:bg-neutral-900 border border-slate-200 dark:border-neutral-800 shadow-sm p-4 space-y-3">
        <div className="relative">
          <Search className="h-4 w-4 text-slate-400 absolute left-3.5 top-1/2 -translate-y-1/2" />
          <input value={search} onChange={(e) => setSearch(e.target.value)} placeholder="Search by crop name..." className="h-11 w-full rounded-xl border-2 border-slate-200 dark:border-neutral-700 bg-white dark:bg-neutral-800 pl-10 pr-3 text-sm font-semibold focus:outline-none focus:border-lime-500" />
        </div>
        <div className="flex gap-1.5">
          {[
            { v: 'pending', label: '⏳ Pending' },
            { v: 'completed', label: '✅ Completed' },
            { v: 'all', label: 'All' },
          ].map((f) => (
            <button key={f.v} onClick={() => setCompletedFilter(f.v)} className={
              'px-3 py-1.5 rounded-lg text-xs font-extrabold ' +
              (completedFilter === f.v ? 'bg-lime-600 text-white shadow' : 'bg-slate-100 dark:bg-neutral-800 text-slate-700')
            }>{f.label}</button>
          ))}
        </div>
      </section>

      {showForm && (
        <AdvisoryForm
          onClose={() => setShowForm(false)}
          onSaved={() => { setShowForm(false); queryClient.invalidateQueries({ queryKey: ['agri-advisories'] }); }}
        />
      )}

      {isLoading ? (
        <div className="grid gap-3">{[1, 2, 3].map((i) => <div key={i} className="h-40 rounded-2xl bg-slate-100 dark:bg-neutral-800 animate-pulse" />)}</div>
      ) : advisories.length === 0 ? (
        <div className="rounded-3xl bg-white dark:bg-neutral-900 border-2 border-dashed border-slate-200 dark:border-neutral-800 p-12 text-center">
          <Leaf className="h-16 w-16 text-slate-400 mx-auto mb-3" />
          <p className="font-extrabold text-slate-700">No advisories yet</p>
        </div>
      ) : (
        <section className="grid gap-3">
          {advisories.map((adv) => (
            <div key={adv.id} className={
              'rounded-2xl bg-white dark:bg-neutral-900 border-2 shadow-sm p-4 space-y-3 ' +
              (adv.completed ? 'border-emerald-200 dark:border-emerald-800' : 'border-amber-300 ring-2 ring-amber-100 dark:ring-amber-950/40')
            }>
              <div className="flex items-start justify-between gap-3 flex-wrap">
                <div className="flex items-start gap-3 min-w-0 flex-1">
                  <div className={
                    'h-12 w-12 rounded-2xl text-white flex items-center justify-center shadow shrink-0 ' +
                    (adv.completed ? 'bg-gradient-to-br from-emerald-500 to-green-600' : 'bg-gradient-to-br from-lime-500 to-green-600')
                  }>
                    <Leaf className="h-6 w-6" />
                  </div>
                  <div className="min-w-0 flex-1">
                    <div className="flex items-center gap-2 flex-wrap">
                      <span className="font-extrabold text-slate-900 dark:text-white">{adv.advisoryNumber}</span>
                      <span className={'px-2 py-0.5 rounded-full text-[9px] font-extrabold uppercase text-white ' + (adv.completed ? 'bg-emerald-600' : 'bg-amber-500')}>
                        {adv.completed ? 'DONE' : 'PENDING'}
                      </span>
                      <span className="px-2 py-0.5 rounded bg-green-100 dark:bg-green-950/40 text-green-700 text-[9px] font-extrabold uppercase">
                        🌱 {adv.cropName}
                      </span>
                      {adv.cropVariety && (
                        <span className="px-2 py-0.5 rounded bg-slate-100 dark:bg-neutral-800 text-slate-700 text-[9px] font-extrabold uppercase">
                          {adv.cropVariety}
                        </span>
                      )}
                      {adv.stage && (
                        <span className="px-2 py-0.5 rounded bg-blue-100 dark:bg-blue-950/40 text-blue-700 text-[9px] font-extrabold uppercase">
                          {adv.stage}
                        </span>
                      )}
                    </div>
                    {adv.advisorName && (
                      <div className="mt-1 text-xs text-slate-600 font-bold">
                        <User className="h-3 w-3 inline mr-1" />
                        Advisor: {adv.advisorName}
                      </div>
                    )}
                    {adv.currentIssues && (
                      <div className="mt-1 text-xs italic text-amber-700">
                        ⚠️ {adv.currentIssues}
                      </div>
                    )}
                    <div className="mt-1 flex items-center gap-3 text-xs text-slate-500 font-bold flex-wrap">
                      {adv.sowingDate && (
                        <span className="inline-flex items-center gap-1">
                          <Calendar className="h-3 w-3" />
                          Sowing: {format(new Date(adv.sowingDate), 'dd MMM')}
                        </span>
                      )}
                      {adv.expectedHarvest && (
                        <span className="inline-flex items-center gap-1">
                          <Calendar className="h-3 w-3" />
                          Harvest: {format(new Date(adv.expectedHarvest), 'dd MMM')}
                        </span>
                      )}
                      {adv.followUpDate && !adv.completed && (
                        <span className="inline-flex items-center gap-1 font-extrabold text-rose-700">
                          <Clock className="h-3 w-3" />
                          Follow-up: {format(new Date(adv.followUpDate), 'dd MMM')}
                        </span>
                      )}
                    </div>
                  </div>
                </div>
                {!adv.completed && (
                  <button onClick={() => completeMutation.mutate(adv.id)} className="px-3 py-1.5 rounded-lg bg-emerald-600 text-white text-xs font-extrabold inline-flex items-center gap-1">
                    <CheckCircle2 className="h-3 w-3" />
                    Complete
                  </button>
                )}
              </div>
              {adv.notes && (
                <div className="text-xs italic text-slate-500 border-t border-slate-100 dark:border-neutral-800 pt-2">
                  📝 {adv.notes}
                </div>
              )}
            </div>
          ))}
        </section>
      )}
    </div>
  );
}

function AdvisoryForm({ onClose, onSaved }: any) {
  const [form, setForm] = useState<any>({
    farmerId: '',
    advisorName: '',
    cropName: 'Wheat',
    cropVariety: '',
    season: '',
    landAreaAcres: '',
    stage: '',
    sowingDate: '',
    expectedHarvest: '',
    currentIssues: '',
    followUpDate: '',
    notes: '',
  });

  const [farmerSearch, setFarmerSearch] = useState('');
  const [showFarmerPicker, setShowFarmerPicker] = useState(false);
  const [selectedFarmer, setSelectedFarmer] = useState<any>(null);

  const { data: farmers = [] } = useQuery({
    queryKey: ['farmers-for-advisory', farmerSearch],
    queryFn: () => farmersApi.list({ search: farmerSearch || undefined }),
    enabled: showFarmerPicker,
  });

  const saveMutation = useMutation({
    mutationFn: () => advisoryApi.create({
      ...form,
      landAreaAcres: form.landAreaAcres ? Number(form.landAreaAcres) : null,
      sowingDate: form.sowingDate || undefined,
      expectedHarvest: form.expectedHarvest || undefined,
      followUpDate: form.followUpDate || undefined,
    }),
    onSuccess: () => { toast.success('Advisory created'); onSaved(); },
    onError: (e: any) => toast.error(e?.response?.data?.message || 'Failed'),
  });

  return (
    <section className="rounded-3xl bg-white dark:bg-neutral-900 border-2 border-lime-300 dark:border-lime-800 shadow-lg overflow-hidden">
      <div className="px-5 py-3 border-b bg-lime-50 dark:bg-lime-950/30 flex items-center justify-between">
        <h3 className="font-extrabold">🌿 New Crop Advisory</h3>
        <button onClick={onClose} className="h-8 w-8 rounded-lg hover:bg-white flex items-center justify-center">
          <X className="h-4 w-4" />
        </button>
      </div>
      <div className="p-5 space-y-4 max-h-[85vh] overflow-y-auto">
        {/* Farmer picker */}
        {selectedFarmer ? (
          <div className="rounded-xl bg-lime-50 border-2 border-lime-200 p-3 flex items-center gap-3">
            <User className="h-5 w-5 text-lime-600" />
            <div className="flex-1"><div className="font-extrabold">{selectedFarmer.fullName}</div><div className="text-xs text-slate-600 font-bold">{selectedFarmer.farmerNumber}</div></div>
            <button onClick={() => { setSelectedFarmer(null); setForm({ ...form, farmerId: '' }); }} className="text-xs font-extrabold text-lime-600 hover:underline">Change</button>
          </div>
        ) : (
          <>
            <button onClick={() => setShowFarmerPicker(!showFarmerPicker)} className="w-full h-11 rounded-xl border-2 border-dashed border-slate-300 bg-slate-50 text-sm font-extrabold text-slate-600 hover:border-lime-400">
              <Search className="h-4 w-4 inline mr-1" /> Link to Farmer (optional)
            </button>
            {showFarmerPicker && (
              <div className="rounded-xl border-2 border-lime-300 bg-lime-50/50 p-3 space-y-2">
                <input autoFocus value={farmerSearch} onChange={(e) => setFarmerSearch(e.target.value)} placeholder="Search farmer..." className="h-10 w-full rounded-lg border border-slate-200 bg-white px-3 text-sm font-bold focus:outline-none focus:border-lime-500" />
                <div className="max-h-52 overflow-y-auto space-y-1">
                  {farmers.map((f) => (
                    <button key={f.id} onClick={() => { setSelectedFarmer(f); setForm({ ...form, farmerId: f.id }); setShowFarmerPicker(false); }} className="w-full px-3 py-2 flex items-center gap-2 rounded hover:bg-white text-left">
                      <User className="h-3.5 w-3.5 text-slate-400" />
                      <span className="text-sm font-extrabold flex-1 truncate">{f.fullName}</span>
                    </button>
                  ))}
                </div>
              </div>
            )}
          </>
        )}

        <div className="grid sm:grid-cols-2 gap-3">
          <select value={form.cropName} onChange={(e) => setForm({ ...form, cropName: e.target.value })} className="h-11 rounded-xl border-2 border-slate-200 dark:border-neutral-700 bg-white dark:bg-neutral-800 px-3 text-sm font-bold focus:outline-none focus:border-lime-500">
            {CROPS.map((c) => <option key={c} value={c}>{c}</option>)}
          </select>
          <input value={form.cropVariety} onChange={(e) => setForm({ ...form, cropVariety: e.target.value })} placeholder="Variety (e.g. Sehar-2006)" className="h-11 rounded-xl border-2 border-slate-200 dark:border-neutral-700 bg-white dark:bg-neutral-800 px-3 text-sm font-bold focus:outline-none focus:border-lime-500" />
          <select value={form.stage} onChange={(e) => setForm({ ...form, stage: e.target.value })} className="h-11 rounded-xl border-2 border-slate-200 dark:border-neutral-700 bg-white dark:bg-neutral-800 px-3 text-sm font-bold focus:outline-none focus:border-lime-500">
            <option value="">-- Growth Stage --</option>
            {STAGES.map((s) => <option key={s} value={s}>{s}</option>)}
          </select>
          <input type="number" step="0.1" value={form.landAreaAcres} onChange={(e) => setForm({ ...form, landAreaAcres: e.target.value })} placeholder="Land (acres)" className="h-11 rounded-xl border-2 border-slate-200 dark:border-neutral-700 bg-white dark:bg-neutral-800 px-3 text-sm font-extrabold tabular-nums focus:outline-none focus:border-lime-500" />
        </div>

        <input value={form.advisorName} onChange={(e) => setForm({ ...form, advisorName: e.target.value })} placeholder="Advisor name" className="h-11 w-full rounded-xl border-2 border-slate-200 dark:border-neutral-700 bg-white dark:bg-neutral-800 px-3 text-sm font-bold focus:outline-none focus:border-lime-500" />

        <div className="grid sm:grid-cols-3 gap-3">
          <input type="date" value={form.sowingDate} onChange={(e) => setForm({ ...form, sowingDate: e.target.value })} className="h-11 rounded-xl border-2 border-slate-200 dark:border-neutral-700 bg-white dark:bg-neutral-800 px-3 text-sm font-bold focus:outline-none focus:border-lime-500" />
          <input type="date" value={form.expectedHarvest} onChange={(e) => setForm({ ...form, expectedHarvest: e.target.value })} className="h-11 rounded-xl border-2 border-slate-200 dark:border-neutral-700 bg-white dark:bg-neutral-800 px-3 text-sm font-bold focus:outline-none focus:border-lime-500" />
          <input type="date" value={form.followUpDate} onChange={(e) => setForm({ ...form, followUpDate: e.target.value })} className="h-11 rounded-xl border-2 border-rose-300 bg-rose-50 dark:bg-rose-950/30 px-3 text-sm font-bold focus:outline-none focus:border-rose-500" />
        </div>

        <textarea rows={3} value={form.currentIssues} onChange={(e) => setForm({ ...form, currentIssues: e.target.value })} placeholder="Current issues (pest attack, yellowing, water stress...)" className="w-full rounded-xl border-2 border-amber-300 bg-amber-50 dark:bg-amber-950/30 px-3 py-2 text-sm font-semibold focus:outline-none focus:border-amber-500 resize-none" />
        <textarea rows={3} value={form.notes} onChange={(e) => setForm({ ...form, notes: e.target.value })} placeholder="Recommendations & notes..." className="w-full rounded-xl border-2 border-slate-200 dark:border-neutral-700 bg-white dark:bg-neutral-800 px-3 py-2 text-sm font-semibold focus:outline-none focus:border-lime-500 resize-none" />

        <div className="flex gap-2 pt-2 border-t border-slate-100 dark:border-neutral-800">
          <Button variant="secondary" className="flex-1" onClick={onClose}>Cancel</Button>
          <Button className="flex-1 bg-gradient-to-r from-lime-600 to-green-700" onClick={() => saveMutation.mutate()} loading={saveMutation.isPending} disabled={!form.cropName}>
            <Save className="h-4 w-4" />
            Create Advisory
          </Button>
        </div>
      </div>
    </section>
  );
}
