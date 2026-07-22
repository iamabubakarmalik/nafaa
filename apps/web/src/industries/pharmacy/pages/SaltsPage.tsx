import { useState } from 'react';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import {
  Beaker, Plus, Search, X, Save, Edit3, Trash2, RefreshCw, Sparkles,
  Package, AlertTriangle, ShieldAlert, Ban, Heart, Baby,
} from 'lucide-react';
import { saltsApi, type Salt, type DrugScheduleClass } from '../api/salts.api';
import { Button } from '@core/ui/Button';
import { toast } from 'sonner';

const SCHEDULE_CONFIG: Record<DrugScheduleClass, { label: string; color: string; bg: string }> = {
  OTC: { label: 'OTC', color: 'text-emerald-700', bg: 'bg-emerald-100 dark:bg-emerald-950/40' },
  SCHEDULE_G: { label: 'Schedule G', color: 'text-blue-700', bg: 'bg-blue-100 dark:bg-blue-950/40' },
  SCHEDULE_H: { label: 'Schedule H', color: 'text-amber-700', bg: 'bg-amber-100 dark:bg-amber-950/40' },
  SCHEDULE_X: { label: 'Schedule X', color: 'text-rose-700', bg: 'bg-rose-100 dark:bg-rose-950/40' },
  CONTROLLED: { label: 'Controlled', color: 'text-red-700', bg: 'bg-red-100 dark:bg-red-950/40' },
  NARCOTIC: { label: 'Narcotic', color: 'text-red-800', bg: 'bg-red-200 dark:bg-red-950/60' },
  PSYCHOTROPIC: { label: 'Psychotropic', color: 'text-purple-700', bg: 'bg-purple-100 dark:bg-purple-950/40' },
};

export default function SaltsPage() {
  const queryClient = useQueryClient();
  const [search, setSearch] = useState('');
  const [scheduleFilter, setScheduleFilter] = useState<string>('all');
  const [showForm, setShowForm] = useState(false);
  const [editing, setEditing] = useState<Salt | null>(null);

  const { data: salts = [], isLoading, refetch, isRefetching } = useQuery({
    queryKey: ['salts', search, scheduleFilter],
    queryFn: () => saltsApi.list({
      search: search || undefined,
      scheduleClass: scheduleFilter === 'all' ? undefined : scheduleFilter,
    }),
  });

  const removeMutation = useMutation({
    mutationFn: (id: string) => saltsApi.remove(id),
    onSuccess: () => { toast.success('Salt deactivated'); queryClient.invalidateQueries({ queryKey: ['salts'] }); },
  });

  return (
    <div className="space-y-6">
      <section className="relative overflow-hidden rounded-3xl bg-gradient-to-br from-slate-950 via-cyan-900 to-blue-700 text-white p-6 sm:p-8 shadow-2xl">
        <div className="absolute -top-20 -right-20 h-72 w-72 rounded-full bg-cyan-400/20 blur-3xl" />
        <div className="relative flex flex-col lg:flex-row lg:items-center lg:justify-between gap-5">
          <div>
            <div className="inline-flex items-center gap-2 rounded-full bg-white/15 backdrop-blur px-3 py-1 text-xs font-extrabold border border-white/20">
              <Sparkles className="h-3.5 w-3.5 text-amber-300" />
              Drug Master
            </div>
            <h1 className="mt-3 text-3xl sm:text-4xl font-extrabold leading-tight">🧪 Salts / Drug Master</h1>
            <p className="mt-2 text-sm text-white/80 font-semibold">Generic ingredients — Paracetamol, Amoxicillin etc.</p>
          </div>
          <div className="flex items-center gap-2 flex-wrap">
            <button onClick={() => refetch()} disabled={isRefetching} className="inline-flex items-center gap-2 rounded-xl bg-white/15 hover:bg-white/25 px-4 py-2.5 text-sm font-bold border border-white/20">
              <RefreshCw className={'h-4 w-4 ' + (isRefetching ? 'animate-spin' : '')} />
              Refresh
            </button>
            <Button className="bg-white text-slate-900 hover:bg-slate-100" onClick={() => { setEditing(null); setShowForm(true); }}>
              <Plus className="h-4 w-4" />
              Add Salt
            </Button>
          </div>
        </div>
      </section>

      <section className="rounded-3xl bg-white dark:bg-neutral-900 border border-slate-200 dark:border-neutral-800 shadow-sm p-4 space-y-3">
        <div className="relative">
          <Search className="h-4 w-4 text-slate-400 absolute left-3.5 top-1/2 -translate-y-1/2" />
          <input value={search} onChange={(e) => setSearch(e.target.value)} placeholder="Search salt name, generic name..." className="h-11 w-full rounded-xl border-2 border-slate-200 dark:border-neutral-700 bg-white dark:bg-neutral-800 pl-10 pr-3 text-sm font-semibold focus:outline-none focus:border-cyan-500" />
        </div>
        <div className="flex gap-1.5 overflow-x-auto pb-1">
          {['all', ...Object.keys(SCHEDULE_CONFIG)].map((s) => (
            <button key={s} onClick={() => setScheduleFilter(s)} className={
              'shrink-0 px-3 py-1.5 rounded-lg text-xs font-extrabold transition ' +
              (scheduleFilter === s ? 'bg-cyan-600 text-white shadow' : 'bg-slate-100 dark:bg-neutral-800 text-slate-700 dark:text-slate-300')
            }>
              {s === 'all' ? 'All' : SCHEDULE_CONFIG[s as DrugScheduleClass]?.label || s}
            </button>
          ))}
        </div>
      </section>

      {showForm && (
        <SaltForm
          editing={editing}
          onClose={() => { setShowForm(false); setEditing(null); }}
          onSaved={() => { setShowForm(false); setEditing(null); queryClient.invalidateQueries({ queryKey: ['salts'] }); }}
        />
      )}

      {isLoading ? (
        <div className="grid sm:grid-cols-2 lg:grid-cols-3 gap-3">
          {[1, 2, 3, 4, 5, 6].map((i) => <div key={i} className="h-40 rounded-2xl bg-slate-100 dark:bg-neutral-800 animate-pulse" />)}
        </div>
      ) : salts.length === 0 ? (
        <div className="rounded-3xl bg-white dark:bg-neutral-900 border-2 border-dashed border-slate-200 dark:border-neutral-800 p-12 text-center">
          <Beaker className="h-16 w-16 text-slate-400 mx-auto mb-3" />
          <p className="font-extrabold text-slate-700">No salts</p>
        </div>
      ) : (
        <section className="grid sm:grid-cols-2 lg:grid-cols-3 gap-3">
          {salts.map((salt) => {
            const sCfg = SCHEDULE_CONFIG[salt.scheduleClass];
            return (
              <div key={salt.id} className="rounded-2xl bg-white dark:bg-neutral-900 border-2 border-slate-200 dark:border-neutral-800 shadow-sm p-4 space-y-2">
                <div className="flex items-start justify-between gap-2">
                  <div className="min-w-0 flex-1">
                    <h3 className="font-extrabold text-slate-900 dark:text-white truncate">{salt.name}</h3>
                    {salt.genericName && <div className="text-xs text-slate-500 font-bold truncate">{salt.genericName}</div>}
                    {salt.category && <div className="text-[10px] uppercase font-extrabold text-cyan-600 mt-0.5">{salt.category}</div>}
                  </div>
                  <span className={'px-2 py-0.5 rounded text-[9px] font-extrabold uppercase ' + sCfg.bg + ' ' + sCfg.color}>
                    {sCfg.label}
                  </span>
                </div>

                <div className="flex flex-wrap gap-1">
                  {salt.requiresPrescription && <span className="px-1.5 py-0.5 rounded bg-amber-100 dark:bg-amber-950/40 text-amber-700 text-[9px] font-extrabold uppercase">Rx</span>}
                  {salt.isNarcotic && <span className="px-1.5 py-0.5 rounded bg-red-100 dark:bg-red-950/40 text-red-700 text-[9px] font-extrabold uppercase inline-flex items-center gap-0.5"><ShieldAlert className="h-2 w-2" />Narcotic</span>}
                  {salt.isBanned && <span className="px-1.5 py-0.5 rounded bg-black text-white text-[9px] font-extrabold uppercase inline-flex items-center gap-0.5"><Ban className="h-2 w-2" />Banned</span>}
                  {!salt.isPregnancySafe && <span className="px-1.5 py-0.5 rounded bg-pink-100 text-pink-700 text-[9px] font-extrabold uppercase inline-flex items-center gap-0.5"><Heart className="h-2 w-2" />Not preg</span>}
                  {!salt.isPediatricSafe && <span className="px-1.5 py-0.5 rounded bg-orange-100 text-orange-700 text-[9px] font-extrabold uppercase inline-flex items-center gap-0.5"><Baby className="h-2 w-2" />Not ped</span>}
                </div>

                {salt.standardDose && (
                  <div className="text-xs text-slate-600 font-semibold">Dose: <span className="font-extrabold text-slate-900">{salt.standardDose}</span></div>
                )}

                <div className="flex items-center justify-between pt-2 border-t border-slate-100 dark:border-neutral-800 text-xs">
                  <span className="inline-flex items-center gap-1 text-slate-500 font-bold">
                    <Package className="h-3 w-3" />
                    {salt._count?.productSalts || 0} products
                  </span>
                  <div className="flex gap-1">
                    <button onClick={() => { setEditing(salt); setShowForm(true); }} className="h-7 w-7 rounded bg-slate-100 dark:bg-neutral-800 hover:bg-slate-200 text-slate-700 flex items-center justify-center">
                      <Edit3 className="h-3 w-3" />
                    </button>
                    <button onClick={() => { if (confirm('Deactivate ' + salt.name + '?')) removeMutation.mutate(salt.id); }} className="h-7 w-7 rounded bg-rose-50 dark:bg-rose-950/40 hover:bg-rose-100 text-rose-600 flex items-center justify-center">
                      <Trash2 className="h-3 w-3" />
                    </button>
                  </div>
                </div>
              </div>
            );
          })}
        </section>
      )}
    </div>
  );
}

function SaltForm({ editing, onClose, onSaved }: { editing: Salt | null; onClose: () => void; onSaved: () => void }) {
  const [form, setForm] = useState({
    name: editing?.name ?? '',
    genericName: editing?.genericName ?? '',
    code: editing?.code ?? '',
    category: editing?.category ?? '',
    description: editing?.description ?? '',
    standardDose: editing?.standardDose ?? '',
    maxDailyDose: editing?.maxDailyDose ?? '',
    routeOfAdmin: editing?.routeOfAdmin ?? '',
    scheduleClass: editing?.scheduleClass ?? ('OTC' as DrugScheduleClass),
    requiresPrescription: editing?.requiresPrescription ?? false,
    isNarcotic: editing?.isNarcotic ?? false,
    isBanned: editing?.isBanned ?? false,
    isPregnancySafe: editing?.isPregnancySafe ?? true,
    isLactationSafe: editing?.isLactationSafe ?? true,
    isPediatricSafe: editing?.isPediatricSafe ?? true,
    minAgeYears: editing?.minAgeYears ?? '',
    contraindications: editing?.contraindications ?? '',
    sideEffects: editing?.sideEffects ?? '',
    warnings: editing?.warnings ?? '',
  });

  const saveMutation = useMutation({
    mutationFn: () => {
      const payload: any = { ...form, minAgeYears: form.minAgeYears ? Number(form.minAgeYears) : undefined };
      return editing ? saltsApi.update(editing.id, payload) : saltsApi.create(payload);
    },
    onSuccess: () => { toast.success(editing ? 'Salt updated' : 'Salt created'); onSaved(); },
    onError: (e: any) => toast.error(e?.response?.data?.message || 'Failed'),
  });

  return (
    <section className="rounded-3xl bg-white dark:bg-neutral-900 border-2 border-cyan-300 shadow-lg overflow-hidden">
      <div className="px-5 py-3 border-b border-slate-100 dark:border-neutral-800 bg-cyan-50 dark:bg-cyan-950/30 flex items-center justify-between">
        <h3 className="font-extrabold text-slate-900 dark:text-white">{editing ? 'Edit Salt' : 'New Salt'}</h3>
        <button onClick={onClose} className="h-8 w-8 rounded-lg hover:bg-white flex items-center justify-center">
          <X className="h-4 w-4" />
        </button>
      </div>
      <div className="p-5 space-y-3 max-h-[70vh] overflow-y-auto">
        <div className="grid sm:grid-cols-2 gap-3">
          <input autoFocus value={form.name} onChange={(e) => setForm({ ...form, name: e.target.value })} placeholder="Salt Name *" className="h-11 rounded-xl border-2 border-slate-200 dark:border-neutral-700 bg-white dark:bg-neutral-800 px-3 text-sm font-bold focus:outline-none focus:border-cyan-500" />
          <input value={form.genericName} onChange={(e) => setForm({ ...form, genericName: e.target.value })} placeholder="Generic Name" className="h-11 rounded-xl border-2 border-slate-200 dark:border-neutral-700 bg-white dark:bg-neutral-800 px-3 text-sm font-bold focus:outline-none focus:border-cyan-500" />
          <input value={form.code} onChange={(e) => setForm({ ...form, code: e.target.value })} placeholder="ATC Code" className="h-11 rounded-xl border-2 border-slate-200 dark:border-neutral-700 bg-white dark:bg-neutral-800 px-3 text-sm font-mono font-bold focus:outline-none focus:border-cyan-500" />
          <input value={form.category} onChange={(e) => setForm({ ...form, category: e.target.value })} placeholder="Category (Analgesic, Antibiotic)" className="h-11 rounded-xl border-2 border-slate-200 dark:border-neutral-700 bg-white dark:bg-neutral-800 px-3 text-sm font-bold focus:outline-none focus:border-cyan-500" />
          <input value={form.standardDose} onChange={(e) => setForm({ ...form, standardDose: e.target.value })} placeholder="Standard Dose" className="h-11 rounded-xl border-2 border-slate-200 dark:border-neutral-700 bg-white dark:bg-neutral-800 px-3 text-sm font-bold focus:outline-none focus:border-cyan-500" />
          <input value={form.maxDailyDose} onChange={(e) => setForm({ ...form, maxDailyDose: e.target.value })} placeholder="Max Daily Dose" className="h-11 rounded-xl border-2 border-slate-200 dark:border-neutral-700 bg-white dark:bg-neutral-800 px-3 text-sm font-bold focus:outline-none focus:border-cyan-500" />
          <input value={form.routeOfAdmin} onChange={(e) => setForm({ ...form, routeOfAdmin: e.target.value })} placeholder="Route (Oral, IV)" className="h-11 rounded-xl border-2 border-slate-200 dark:border-neutral-700 bg-white dark:bg-neutral-800 px-3 text-sm font-bold focus:outline-none focus:border-cyan-500" />
          <input type="number" value={form.minAgeYears} onChange={(e) => setForm({ ...form, minAgeYears: e.target.value })} placeholder="Min Age (years)" className="h-11 rounded-xl border-2 border-slate-200 dark:border-neutral-700 bg-white dark:bg-neutral-800 px-3 text-sm font-bold tabular-nums focus:outline-none focus:border-cyan-500" />
        </div>

        <select value={form.scheduleClass} onChange={(e) => setForm({ ...form, scheduleClass: e.target.value as any })} className="h-11 w-full rounded-xl border-2 border-slate-200 dark:border-neutral-700 bg-white dark:bg-neutral-800 px-3 text-sm font-bold focus:outline-none focus:border-cyan-500">
          {Object.entries(SCHEDULE_CONFIG).map(([k, v]) => <option key={k} value={k}>{v.label}</option>)}
        </select>

        <div className="grid grid-cols-2 sm:grid-cols-3 gap-2">
          {[
            { key: 'requiresPrescription', label: 'Requires Rx', color: 'amber' },
            { key: 'isNarcotic', label: 'Narcotic', color: 'red' },
            { key: 'isBanned', label: 'Banned', color: 'slate' },
            { key: 'isPregnancySafe', label: 'Preg Safe', color: 'pink' },
            { key: 'isLactationSafe', label: 'Lactation Safe', color: 'purple' },
            { key: 'isPediatricSafe', label: 'Pediatric Safe', color: 'orange' },
          ].map((opt) => (
            <label key={opt.key} className={
              'flex items-center gap-2 p-2 rounded-xl border-2 cursor-pointer text-xs font-extrabold transition ' +
              ((form as any)[opt.key] ? 'border-cyan-500 bg-cyan-50 dark:bg-cyan-950/40' : 'border-slate-200 dark:border-neutral-700 bg-white dark:bg-neutral-800 hover:border-cyan-300')
            }>
              <input type="checkbox" checked={(form as any)[opt.key]} onChange={(e) => setForm({ ...form, [opt.key]: e.target.checked })} className="h-4 w-4 rounded" />
              <span>{opt.label}</span>
            </label>
          ))}
        </div>

        <textarea rows={2} value={form.description} onChange={(e) => setForm({ ...form, description: e.target.value })} placeholder="Description" className="w-full rounded-xl border-2 border-slate-200 dark:border-neutral-700 bg-white dark:bg-neutral-800 px-3 py-2 text-sm font-semibold focus:outline-none focus:border-cyan-500 resize-none" />
        <textarea rows={2} value={form.contraindications} onChange={(e) => setForm({ ...form, contraindications: e.target.value })} placeholder="Contraindications" className="w-full rounded-xl border-2 border-slate-200 dark:border-neutral-700 bg-white dark:bg-neutral-800 px-3 py-2 text-sm font-semibold focus:outline-none focus:border-cyan-500 resize-none" />
        <textarea rows={2} value={form.sideEffects} onChange={(e) => setForm({ ...form, sideEffects: e.target.value })} placeholder="Side Effects" className="w-full rounded-xl border-2 border-slate-200 dark:border-neutral-700 bg-white dark:bg-neutral-800 px-3 py-2 text-sm font-semibold focus:outline-none focus:border-cyan-500 resize-none" />
        <textarea rows={2} value={form.warnings} onChange={(e) => setForm({ ...form, warnings: e.target.value })} placeholder="Warnings" className="w-full rounded-xl border-2 border-amber-200 dark:border-amber-800 bg-amber-50 dark:bg-amber-950/30 px-3 py-2 text-sm font-semibold focus:outline-none focus:border-amber-500 resize-none" />

        <div className="flex gap-2 pt-2">
          <Button variant="secondary" className="flex-1" onClick={onClose}>Cancel</Button>
          <Button className="flex-1 bg-gradient-to-r from-cyan-600 to-blue-700" onClick={() => saveMutation.mutate()} loading={saveMutation.isPending} disabled={!form.name.trim()}>
            <Save className="h-4 w-4" />
            {editing ? 'Update' : 'Create'}
          </Button>
        </div>
      </div>
    </section>
  );
}
