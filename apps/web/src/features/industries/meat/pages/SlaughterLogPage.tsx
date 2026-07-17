import { useState } from 'react';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import {
  ShieldCheck, Plus, Search, X, Save, RefreshCw, Sparkles, Calendar,
  User, Camera, FileText, Award, AlertCircle, CheckCircle2, Weight,
  Thermometer, Building2,
} from 'lucide-react';
import { slaughterApi, type SlaughterLog } from '../api/slaughter.api';
import { liveAnimalsApi } from '../api/live-animals.api';
import { Button } from '@/components/ui/Button';
import { UploadDropzone } from '@/components/uploads';
import { toast } from 'sonner';
import { format } from 'date-fns';

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
];

const METHODS = [
  { value: 'HALAL_HAND', label: 'Halal (Hand)', emoji: '🕌' },
  { value: 'HALAL_MACHINE', label: 'Halal (Machine)', emoji: '⚙️' },
  { value: 'KOSHER', label: 'Kosher', emoji: '✡️' },
  { value: 'STANDARD', label: 'Standard', emoji: '📋' },
  { value: 'ORGANIC', label: 'Organic', emoji: '🌿' },
  { value: 'FREE_RANGE', label: 'Free Range', emoji: '🌾' },
];

const GRADES = [
  { value: 'PREMIUM', label: 'Premium', color: 'bg-amber-500' },
  { value: 'GRADE_A', label: 'Grade A', color: 'bg-emerald-500' },
  { value: 'GRADE_B', label: 'Grade B', color: 'bg-blue-500' },
  { value: 'GRADE_C', label: 'Grade C', color: 'bg-slate-500' },
  { value: 'STANDARD', label: 'Standard', color: 'bg-slate-400' },
];

export default function SlaughterLogPage() {
  const queryClient = useQueryClient();
  const [search, setSearch] = useState('');
  const [animalFilter, setAnimalFilter] = useState<string>('all');
  const [showForm, setShowForm] = useState(false);

  const { data: logs = [], isLoading, refetch, isRefetching } = useQuery({
    queryKey: ['slaughter-logs', animalFilter, search],
    queryFn: () => slaughterApi.list({
      animalType: animalFilter === 'all' ? undefined : animalFilter,
      search: search.trim() || undefined,
    }),
  });

  const { data: compliance } = useQuery({
    queryKey: ['halal-compliance'],
    queryFn: () => slaughterApi.halalCompliance(),
  });

  return (
    <div className="space-y-6">
      {/* HERO */}
      <section className="relative overflow-hidden rounded-3xl bg-gradient-to-br from-slate-950 via-emerald-900 to-green-800 text-white p-6 sm:p-8 shadow-2xl">
        <div className="absolute -top-20 -right-20 h-72 w-72 rounded-full bg-emerald-400/20 blur-3xl" />
        <div className="relative flex flex-col lg:flex-row lg:items-center lg:justify-between gap-5">
          <div>
            <div className="inline-flex items-center gap-2 rounded-full bg-white/15 backdrop-blur px-3 py-1 text-xs font-extrabold border border-white/20">
              <ShieldCheck className="h-3.5 w-3.5 text-amber-300" />
              Halal Compliance
            </div>
            <h1 className="mt-3 text-3xl sm:text-4xl font-extrabold leading-tight">🕌 Slaughter Log</h1>
            <p className="mt-2 text-sm text-white/80 font-semibold">Halal certification, vet inspection, documentation</p>
          </div>
          <div className="flex items-center gap-2 flex-wrap">
            <button onClick={() => refetch()} disabled={isRefetching} className="inline-flex items-center gap-2 rounded-xl bg-white/15 hover:bg-white/25 px-4 py-2.5 text-sm font-bold backdrop-blur border border-white/20">
              <RefreshCw className={'h-4 w-4 ' + (isRefetching ? 'animate-spin' : '')} />
              Refresh
            </button>
            <Button className="bg-white text-slate-900 hover:bg-slate-100" onClick={() => setShowForm(true)}>
              <Plus className="h-4 w-4" />
              New Log Entry
            </Button>
          </div>
        </div>
      </section>

      {/* Compliance Stats */}
      {compliance && (
        <section className="grid grid-cols-2 lg:grid-cols-4 gap-4">
          <ComplianceCard label="Total Slaughters" value={compliance.total} icon={ShieldCheck} color="slate" />
          <ComplianceCard label="Halal Compliance" value={compliance.halalPct.toFixed(1) + '%'} icon={Award} color="emerald" sub={compliance.halal + ' / ' + compliance.total} />
          <ComplianceCard label="With Certificate" value={compliance.certPct.toFixed(1) + '%'} icon={FileText} color="blue" sub={compliance.withCert + ' certified'} />
          <ComplianceCard label="Vet Inspected" value={compliance.vetPct.toFixed(1) + '%'} icon={CheckCircle2} color="violet" sub={compliance.withVet + ' inspected'} />
        </section>
      )}

      {/* Filters */}
      <section className="rounded-3xl bg-white dark:bg-neutral-900 border border-slate-200 dark:border-neutral-800 shadow-sm p-4 space-y-3">
        <div className="relative">
          <Search className="h-4 w-4 text-slate-400 absolute left-3.5 top-1/2 -translate-y-1/2" />
          <input value={search} onChange={(e) => setSearch(e.target.value)} placeholder="Search log #, tag, slaughterer..." className="h-11 w-full rounded-xl border-2 border-slate-200 dark:border-neutral-700 bg-white dark:bg-neutral-800 pl-10 pr-3 text-sm font-semibold focus:outline-none focus:border-emerald-500" />
        </div>
        <div className="flex gap-1.5 overflow-x-auto pb-1">
          <button onClick={() => setAnimalFilter('all')} className={
            'shrink-0 px-3 py-1.5 rounded-lg text-xs font-extrabold ' +
            (animalFilter === 'all' ? 'bg-emerald-600 text-white shadow' : 'bg-slate-100 dark:bg-neutral-800 text-slate-700')
          }>All</button>
          {ANIMAL_TYPES.map((a) => (
            <button key={a.value} onClick={() => setAnimalFilter(a.value)} className={
              'shrink-0 px-3 py-1.5 rounded-lg text-xs font-extrabold ' +
              (animalFilter === a.value ? 'bg-emerald-600 text-white shadow' : 'bg-slate-100 dark:bg-neutral-800 text-slate-700')
            }>{a.emoji} {a.label}</button>
          ))}
        </div>
      </section>

      {showForm && (
        <SlaughterForm
          onClose={() => setShowForm(false)}
          onSaved={() => {
            setShowForm(false);
            queryClient.invalidateQueries({ queryKey: ['slaughter-logs'] });
            queryClient.invalidateQueries({ queryKey: ['halal-compliance'] });
            queryClient.invalidateQueries({ queryKey: ['live-animals'] });
          }}
        />
      )}

      {isLoading ? (
        <div className="grid gap-3">
          {[1, 2, 3].map((i) => <div key={i} className="h-40 rounded-2xl bg-slate-100 dark:bg-neutral-800 animate-pulse" />)}
        </div>
      ) : logs.length === 0 ? (
        <div className="rounded-3xl bg-white dark:bg-neutral-900 border-2 border-dashed border-slate-200 dark:border-neutral-800 p-12 text-center">
          <ShieldCheck className="h-16 w-16 text-slate-400 mx-auto mb-3" />
          <p className="font-extrabold text-slate-700">No slaughter logs yet</p>
        </div>
      ) : (
        <section className="grid gap-3">
          {logs.map((log) => <LogCard key={log.id} log={log} />)}
        </section>
      )}
    </div>
  );
}

function ComplianceCard({ label, value, sub, icon: Icon, color }: any) {
  const colors: Record<string, string> = {
    slate: 'from-slate-500 to-slate-700',
    emerald: 'from-emerald-500 to-green-600',
    blue: 'from-blue-500 to-cyan-600',
    violet: 'from-violet-500 to-purple-600',
  };
  return (
    <div className="rounded-2xl bg-white dark:bg-neutral-900 border-2 border-slate-200 dark:border-neutral-800 p-5 shadow-sm">
      <div className="flex items-center justify-between">
        <div>
          <div className="text-xs uppercase tracking-wider text-slate-500 font-bold">{label}</div>
          <div className="mt-2 text-2xl font-extrabold text-slate-900 dark:text-white tabular-nums">{value}</div>
          {sub && <div className="text-xs text-slate-600 dark:text-slate-400 font-semibold mt-1">{sub}</div>}
        </div>
        <div className={'h-12 w-12 rounded-2xl bg-gradient-to-br ' + colors[color] + ' text-white flex items-center justify-center shadow-lg'}>
          <Icon className="h-6 w-6" />
        </div>
      </div>
    </div>
  );
}

function LogCard({ log }: { log: SlaughterLog }) {
  const method = METHODS.find((m) => m.value === log.slaughterMethod);
  const animal = ANIMAL_TYPES.find((a) => a.value === log.animalType);
  const grade = GRADES.find((g) => g.value === log.qualityGrade);

  return (
    <div className={
      'rounded-2xl bg-white dark:bg-neutral-900 border-2 shadow-sm p-4 space-y-3 ' +
      (log.isHalal ? 'border-emerald-200 dark:border-emerald-800' : 'border-slate-200 dark:border-neutral-800')
    }>
      <div className="flex items-start justify-between gap-3 flex-wrap">
        <div className="flex items-start gap-3 min-w-0 flex-1">
          <div className={
            'h-12 w-12 rounded-2xl text-white flex items-center justify-center shadow shrink-0 text-2xl ' +
            (log.isHalal ? 'bg-gradient-to-br from-emerald-500 to-green-600' : 'bg-gradient-to-br from-slate-500 to-slate-700')
          }>
            {animal?.emoji}
          </div>
          <div className="min-w-0 flex-1">
            <div className="flex items-center gap-2 flex-wrap">
              <span className="font-extrabold text-slate-900 dark:text-white">{log.slaughterNumber}</span>
              {log.isHalal && (
                <span className="px-2 py-0.5 rounded-full bg-emerald-600 text-white text-[9px] font-extrabold uppercase inline-flex items-center gap-0.5">
                  <ShieldCheck className="h-2.5 w-2.5" />
                  HALAL
                </span>
              )}
              {method && (
                <span className="px-2 py-0.5 rounded bg-slate-100 dark:bg-neutral-800 text-slate-700 text-[9px] font-extrabold uppercase">
                  {method.emoji} {method.label}
                </span>
              )}
              {grade && (
                <span className={'px-2 py-0.5 rounded text-white text-[9px] font-extrabold uppercase ' + grade.color}>
                  {grade.label}
                </span>
              )}
              {log.vetInspection && (
                <span className="px-2 py-0.5 rounded bg-blue-100 dark:bg-blue-950/40 text-blue-700 text-[9px] font-extrabold uppercase inline-flex items-center gap-0.5">
                  <CheckCircle2 className="h-2 w-2" />
                  VET OK
                </span>
              )}
            </div>

            <div className="mt-2 grid sm:grid-cols-2 gap-1 text-xs">
              <div className="text-slate-600 font-bold">
                <Calendar className="h-3 w-3 inline mr-1" />
                {format(new Date(log.slaughterDate), 'dd MMM yyyy, HH:mm')}
              </div>
              {log.animalTag && (
                <div className="text-slate-600 font-bold font-mono">
                  Tag: {log.animalTag}
                </div>
              )}
              {log.slaughteredBy && (
                <div className="text-slate-600 font-bold">
                  <User className="h-3 w-3 inline mr-1" />
                  By: {log.slaughteredBy}
                </div>
              )}
              {log.facilityName && (
                <div className="text-slate-600 font-bold truncate">
                  <Building2 className="h-3 w-3 inline mr-1" />
                  {log.facilityName}
                </div>
              )}
            </div>

            {log.halalCertNumber && (
              <div className="mt-1 text-xs font-extrabold text-emerald-700 inline-flex items-center gap-1">
                <FileText className="h-3 w-3" />
                Cert: {log.halalCertNumber}
                {log.religiousAuthority && ' • ' + log.religiousAuthority}
              </div>
            )}
          </div>
        </div>

        <div className="text-right shrink-0 space-y-1">
          <div>
            <div className="text-[10px] font-extrabold text-slate-500 uppercase">Live Wt</div>
            <div className="text-lg font-extrabold text-slate-900 dark:text-white tabular-nums">{log.liveWeightKg}kg</div>
          </div>
          {log.dressedWeightKg && (
            <div>
              <div className="text-[10px] font-extrabold text-emerald-700 uppercase">Yield</div>
              <div className="text-sm font-extrabold text-emerald-700 tabular-nums">{log.dressedWeightKg}kg</div>
              {log.yieldPct && (
                <div className="text-[10px] font-bold text-emerald-600">{log.yieldPct.toFixed(1)}%</div>
              )}
            </div>
          )}
        </div>
      </div>

      {log.photoUrls?.length > 0 && (
        <div className="flex gap-1 pt-2 border-t border-slate-100 dark:border-neutral-800">
          {log.photoUrls.slice(0, 5).map((url: string, i: number) => (
            <a key={i} href={url} target="_blank" rel="noreferrer" className="h-12 w-12 rounded-lg overflow-hidden border border-slate-200">
              <img src={url} alt="" className="w-full h-full object-cover" />
            </a>
          ))}
        </div>
      )}

      {log.notes && (
        <div className="text-xs italic text-slate-500 border-t border-slate-100 dark:border-neutral-800 pt-2">
          📝 {log.notes}
        </div>
      )}
    </div>
  );
}

function SlaughterForm({ onClose, onSaved }: any) {
  const [form, setForm] = useState<any>({
    liveAnimalId: '',
    animalType: 'GOAT',
    animalTag: '',
    slaughterDate: new Date().toISOString().slice(0, 16),
    slaughterMethod: 'HALAL_HAND',
    slaughteredBy: '',
    slaughtererCertNumber: '',
    witnessedBy: '',
    liveWeightKg: 0,
    dressedWeightKg: '',
    facilityName: '',
    facilityLicense: '',
    isHalal: true,
    halalCertNumber: '',
    religiousAuthority: '',
    vetInspection: false,
    vetInspectorName: '',
    vetCertNumber: '',
    postMortemNotes: '',
    qualityGrade: 'GRADE_A',
    temperature: '',
    storageLocation: '',
    photoUrls: [] as string[],
    documentUrls: [] as string[],
    notes: '',
  });

  const [animalSearch, setAnimalSearch] = useState('');
  const [showAnimalPicker, setShowAnimalPicker] = useState(false);
  const [selectedAnimal, setSelectedAnimal] = useState<any>(null);

  const { data: liveAnimals = [] } = useQuery({
    queryKey: ['live-animals-for-slaughter', animalSearch],
    queryFn: () => liveAnimalsApi.list({ isSlaughtered: false, search: animalSearch || undefined }),
    enabled: showAnimalPicker,
  });

  const saveMutation = useMutation({
    mutationFn: () => slaughterApi.create({
      ...form,
      liveWeightKg: Number(form.liveWeightKg) || 0,
      dressedWeightKg: form.dressedWeightKg ? Number(form.dressedWeightKg) : undefined,
      temperature: form.temperature ? Number(form.temperature) : undefined,
    }),
    onSuccess: () => { toast.success('Slaughter log created'); onSaved(); },
    onError: (e: any) => toast.error(e?.response?.data?.message || 'Failed'),
  });

  return (
    <section className="rounded-3xl bg-white dark:bg-neutral-900 border-2 border-emerald-300 dark:border-emerald-800 shadow-lg overflow-hidden">
      <div className="px-5 py-3 border-b border-slate-100 dark:border-neutral-800 bg-emerald-50 dark:bg-emerald-950/30 flex items-center justify-between">
        <h3 className="font-extrabold text-slate-900 dark:text-white">🕌 New Slaughter Log</h3>
        <button onClick={onClose} className="h-8 w-8 rounded-lg hover:bg-white flex items-center justify-center">
          <X className="h-4 w-4" />
        </button>
      </div>
      <div className="p-5 space-y-4 max-h-[85vh] overflow-y-auto">
        {/* Live animal picker */}
        {selectedAnimal ? (
          <div className="rounded-xl bg-emerald-50 dark:bg-emerald-950/30 border-2 border-emerald-200 p-3 flex items-center gap-3">
            <div className="text-2xl">{ANIMAL_TYPES.find((a) => a.value === selectedAnimal.animalType)?.emoji}</div>
            <div className="flex-1">
              <div className="font-extrabold">{selectedAnimal.tagNumber}</div>
              <div className="text-xs text-slate-600 font-bold">{selectedAnimal.animalType} • {selectedAnimal.weightKg}kg</div>
            </div>
            <button onClick={() => { setSelectedAnimal(null); setForm({ ...form, liveAnimalId: '' }); }} className="text-xs font-extrabold text-emerald-600 hover:underline">Change</button>
          </div>
        ) : (
          <>
            <button onClick={() => setShowAnimalPicker(!showAnimalPicker)} className="w-full h-11 rounded-xl border-2 border-dashed border-slate-300 bg-slate-50 text-sm font-extrabold text-slate-600 hover:border-emerald-400">
              <Search className="h-4 w-4 inline mr-1" />
              Link to Live Animal (optional)
            </button>
            {showAnimalPicker && (
              <div className="rounded-xl border-2 border-emerald-300 bg-emerald-50/50 p-3 space-y-2">
                <input value={animalSearch} onChange={(e) => setAnimalSearch(e.target.value)} placeholder="Search tag #..." className="h-10 w-full rounded-lg border border-slate-200 bg-white px-3 text-sm font-bold focus:outline-none focus:border-emerald-500" />
                <div className="max-h-52 overflow-y-auto space-y-1">
                  {liveAnimals.map((a) => {
                    const cfg = ANIMAL_TYPES.find((x) => x.value === a.animalType);
                    return (
                      <button
                        key={a.id}
                        onClick={() => {
                          setSelectedAnimal(a);
                          setForm({ ...form, liveAnimalId: a.id, animalType: a.animalType, animalTag: a.tagNumber, liveWeightKg: a.weightKg });
                          setShowAnimalPicker(false);
                        }}
                        className="w-full px-3 py-2 flex items-center gap-2 rounded hover:bg-white text-left"
                      >
                        <span className="text-lg">{cfg?.emoji}</span>
                        <div className="flex-1 min-w-0">
                          <div className="text-sm font-extrabold truncate">{a.tagNumber}</div>
                          <div className="text-[10px] text-slate-500 font-bold">{a.weightKg}kg • {a.breed}</div>
                        </div>
                      </button>
                    );
                  })}
                </div>
              </div>
            )}
          </>
        )}

        <div className="grid sm:grid-cols-3 gap-3">
          <select value={form.animalType} onChange={(e) => setForm({ ...form, animalType: e.target.value })} className="h-11 rounded-xl border-2 border-slate-200 dark:border-neutral-700 bg-white dark:bg-neutral-800 px-3 text-sm font-bold focus:outline-none focus:border-emerald-500">
            {ANIMAL_TYPES.map((a) => <option key={a.value} value={a.value}>{a.emoji} {a.label}</option>)}
          </select>
          <input value={form.animalTag} onChange={(e) => setForm({ ...form, animalTag: e.target.value })} placeholder="Animal Tag" className="h-11 rounded-xl border-2 border-slate-200 dark:border-neutral-700 bg-white dark:bg-neutral-800 px-3 text-sm font-mono font-bold focus:outline-none focus:border-emerald-500" />
          <input type="datetime-local" value={form.slaughterDate} onChange={(e) => setForm({ ...form, slaughterDate: e.target.value })} className="h-11 rounded-xl border-2 border-slate-200 dark:border-neutral-700 bg-white dark:bg-neutral-800 px-3 text-sm font-bold focus:outline-none focus:border-emerald-500" />
        </div>

        <div>
          <label className="text-[10px] uppercase font-extrabold text-slate-600 mb-2 block">Slaughter Method *</label>
          <div className="grid grid-cols-2 sm:grid-cols-3 gap-2">
            {METHODS.map((m) => (
              <button key={m.value} onClick={() => setForm({ ...form, slaughterMethod: m.value, isHalal: m.value.startsWith('HALAL') })} className={
                'p-3 rounded-xl border-2 text-center transition ' +
                (form.slaughterMethod === m.value ? 'border-emerald-500 bg-emerald-50 dark:bg-emerald-950/40 shadow' : 'border-slate-200 dark:border-neutral-700 bg-white dark:bg-neutral-800 hover:border-emerald-300')
              }>
                <div className="text-2xl mb-1">{m.emoji}</div>
                <div className="text-[10px] font-extrabold">{m.label}</div>
              </button>
            ))}
          </div>
        </div>

        <div className="grid sm:grid-cols-2 gap-3">
          <div>
            <label className="text-[10px] uppercase font-extrabold text-blue-700 mb-1 block">Live Weight (kg) *</label>
            <input type="number" step="0.1" value={form.liveWeightKg} onChange={(e) => setForm({ ...form, liveWeightKg: e.target.value })} className="h-14 w-full rounded-xl border-2 border-blue-300 bg-blue-50 dark:bg-blue-950/30 px-3 text-xl font-extrabold tabular-nums focus:outline-none focus:border-blue-500" />
          </div>
          <div>
            <label className="text-[10px] uppercase font-extrabold text-emerald-700 mb-1 block">Dressed Weight (kg)</label>
            <input type="number" step="0.1" value={form.dressedWeightKg} onChange={(e) => setForm({ ...form, dressedWeightKg: e.target.value })} className="h-14 w-full rounded-xl border-2 border-emerald-300 bg-emerald-50 dark:bg-emerald-950/30 px-3 text-xl font-extrabold tabular-nums focus:outline-none focus:border-emerald-500" />
          </div>
        </div>

        <div className="grid sm:grid-cols-2 gap-3">
          <input value={form.slaughteredBy} onChange={(e) => setForm({ ...form, slaughteredBy: e.target.value })} placeholder="Slaughtered by (name)" className="h-11 rounded-xl border-2 border-slate-200 dark:border-neutral-700 bg-white dark:bg-neutral-800 px-3 text-sm font-bold focus:outline-none focus:border-emerald-500" />
          <input value={form.slaughtererCertNumber} onChange={(e) => setForm({ ...form, slaughtererCertNumber: e.target.value })} placeholder="Slaughterer Cert #" className="h-11 rounded-xl border-2 border-slate-200 dark:border-neutral-700 bg-white dark:bg-neutral-800 px-3 text-sm font-mono font-bold focus:outline-none focus:border-emerald-500" />
          <input value={form.witnessedBy} onChange={(e) => setForm({ ...form, witnessedBy: e.target.value })} placeholder="Witnessed by" className="h-11 rounded-xl border-2 border-slate-200 dark:border-neutral-700 bg-white dark:bg-neutral-800 px-3 text-sm font-bold focus:outline-none focus:border-emerald-500" />
          <select value={form.qualityGrade} onChange={(e) => setForm({ ...form, qualityGrade: e.target.value })} className="h-11 rounded-xl border-2 border-slate-200 dark:border-neutral-700 bg-white dark:bg-neutral-800 px-3 text-sm font-bold focus:outline-none focus:border-emerald-500">
            {GRADES.map((g) => <option key={g.value} value={g.value}>{g.label}</option>)}
          </select>
        </div>

        {/* Halal cert */}
        {form.isHalal && (
          <div className="rounded-xl border-2 border-emerald-200 dark:border-emerald-800 bg-emerald-50 dark:bg-emerald-950/30 p-4 space-y-3">
            <div className="text-sm font-extrabold text-emerald-900 flex items-center gap-2">
              <ShieldCheck className="h-4 w-4" />
              Halal Certification
            </div>
            <div className="grid sm:grid-cols-2 gap-2">
              <input value={form.halalCertNumber} onChange={(e) => setForm({ ...form, halalCertNumber: e.target.value })} placeholder="Halal Cert #" className="h-10 rounded-lg border-2 border-emerald-300 bg-white dark:bg-emerald-950/40 px-3 text-sm font-mono font-bold focus:outline-none focus:border-emerald-500" />
              <input value={form.religiousAuthority} onChange={(e) => setForm({ ...form, religiousAuthority: e.target.value })} placeholder="Authority (JAKIM, ISWA...)" className="h-10 rounded-lg border-2 border-emerald-300 bg-white dark:bg-emerald-950/40 px-3 text-sm font-bold focus:outline-none focus:border-emerald-500" />
            </div>
          </div>
        )}

        {/* Facility */}
        <div className="grid sm:grid-cols-2 gap-3">
          <input value={form.facilityName} onChange={(e) => setForm({ ...form, facilityName: e.target.value })} placeholder="Facility name" className="h-11 rounded-xl border-2 border-slate-200 dark:border-neutral-700 bg-white dark:bg-neutral-800 px-3 text-sm font-bold focus:outline-none focus:border-emerald-500" />
          <input value={form.facilityLicense} onChange={(e) => setForm({ ...form, facilityLicense: e.target.value })} placeholder="Facility License #" className="h-11 rounded-xl border-2 border-slate-200 dark:border-neutral-700 bg-white dark:bg-neutral-800 px-3 text-sm font-mono font-bold focus:outline-none focus:border-emerald-500" />
        </div>

        {/* Vet */}
        <div className="rounded-xl border-2 border-blue-200 dark:border-blue-800 bg-blue-50 dark:bg-blue-950/30 p-4 space-y-3">
          <label className="flex items-center gap-2 cursor-pointer">
            <input type="checkbox" checked={form.vetInspection} onChange={(e) => setForm({ ...form, vetInspection: e.target.checked })} className="h-5 w-5 rounded" />
            <CheckCircle2 className={'h-5 w-5 ' + (form.vetInspection ? 'text-blue-600' : 'text-slate-400')} />
            <span className="text-sm font-extrabold text-blue-900">Vet Inspection Passed</span>
          </label>
          {form.vetInspection && (
            <div className="grid sm:grid-cols-2 gap-2">
              <input value={form.vetInspectorName} onChange={(e) => setForm({ ...form, vetInspectorName: e.target.value })} placeholder="Vet inspector name" className="h-10 rounded-lg border-2 border-blue-300 bg-white dark:bg-blue-950/40 px-3 text-sm font-bold focus:outline-none focus:border-blue-500" />
              <input value={form.vetCertNumber} onChange={(e) => setForm({ ...form, vetCertNumber: e.target.value })} placeholder="Vet Cert #" className="h-10 rounded-lg border-2 border-blue-300 bg-white dark:bg-blue-950/40 px-3 text-sm font-mono font-bold focus:outline-none focus:border-blue-500" />
            </div>
          )}
          <textarea rows={2} value={form.postMortemNotes} onChange={(e) => setForm({ ...form, postMortemNotes: e.target.value })} placeholder="Post-mortem notes..." className="w-full rounded-lg border-2 border-slate-200 dark:border-neutral-700 bg-white dark:bg-neutral-800 px-3 py-2 text-sm font-semibold focus:outline-none focus:border-blue-500 resize-none" />
        </div>

        {/* Photos */}
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

        <textarea rows={2} value={form.notes} onChange={(e) => setForm({ ...form, notes: e.target.value })} placeholder="Notes..." className="w-full rounded-xl border-2 border-slate-200 dark:border-neutral-700 bg-white dark:bg-neutral-800 px-3 py-2 text-sm font-semibold focus:outline-none focus:border-emerald-500 resize-none" />

        <div className="flex gap-2 pt-2 border-t border-slate-100 dark:border-neutral-800">
          <Button variant="secondary" className="flex-1" onClick={onClose}>Cancel</Button>
          <Button className="flex-1 bg-gradient-to-r from-emerald-600 to-green-700" onClick={() => saveMutation.mutate()} loading={saveMutation.isPending} disabled={!form.liveWeightKg}>
            <Save className="h-4 w-4" />
            Create Log
          </Button>
        </div>
      </div>
    </section>
  );
}
