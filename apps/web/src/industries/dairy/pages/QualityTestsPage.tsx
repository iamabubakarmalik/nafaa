import { useState } from 'react';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { Beaker, Plus, X, Save, RefreshCw, Sparkles, CheckCircle2, AlertCircle } from 'lucide-react';
import { qualityTestsApi } from '../api/quality-tests.api';
import { Button } from '@core/ui/Button';
import { toast } from 'sonner';
import { format } from 'date-fns';

const QUALITIES = ['A_GRADE', 'B_GRADE', 'C_GRADE', 'REJECTED'];
const ADULTERATIONS = ['Water', 'Starch', 'Detergent', 'Urea', 'Sugar', 'Formalin', 'Neutralizer'];
const SOURCE_TYPES = ['FARMER', 'CUSTOMER_COMPLAINT', 'INCOMING_BATCH', 'RANDOM', 'STORAGE_TANK'];

export default function QualityTestsPage() {
  const queryClient = useQueryClient();
  const [showForm, setShowForm] = useState(false);

  const { data: tests = [], isLoading, refetch } = useQuery({
    queryKey: ['dairy-quality-tests'],
    queryFn: () => qualityTestsApi.list({}),
  });

  const { data: summary } = useQuery({
    queryKey: ['dairy-quality-summary'],
    queryFn: () => qualityTestsApi.summary(),
  });

  return (
    <div className="space-y-6">
      <section className="relative overflow-hidden rounded-3xl bg-gradient-to-br from-slate-950 via-rose-900 to-red-700 text-white p-6 sm:p-8 shadow-2xl">
        <div className="absolute -top-20 -right-20 h-72 w-72 rounded-full bg-rose-400/20 blur-3xl" />
        <div className="relative flex flex-col lg:flex-row lg:items-center lg:justify-between gap-5">
          <div>
            <div className="inline-flex items-center gap-2 rounded-full bg-white/15 backdrop-blur px-3 py-1 text-xs font-extrabold border border-white/20">
              <Sparkles className="h-3.5 w-3.5 text-amber-300" />
              Lab Testing
            </div>
            <h1 className="mt-3 text-3xl sm:text-4xl font-extrabold leading-tight">🔬 Quality Tests</h1>
            <p className="mt-2 text-sm text-white/80 font-semibold">Fat/SNF/adulteration testing</p>
          </div>
          <div className="flex items-center gap-2 flex-wrap">
            <button onClick={() => refetch()} className="inline-flex items-center gap-2 rounded-xl bg-white/15 hover:bg-white/25 px-4 py-2.5 text-sm font-bold backdrop-blur border border-white/20">
              <RefreshCw className="h-4 w-4" />Refresh
            </button>
            <Button className="bg-white text-slate-900 hover:bg-slate-100" onClick={() => setShowForm(true)}>
              <Plus className="h-4 w-4" />New Test
            </Button>
          </div>
        </div>
      </section>

      {summary && (
        <section className="grid grid-cols-2 lg:grid-cols-4 gap-4">
          <StatCard label="Total Tests" value={summary.total} icon={Beaker} color="rose" />
          <StatCard label="Passed" value={summary.passed} icon={CheckCircle2} color="emerald" />
          <StatCard label="Failed" value={summary.failed} icon={AlertCircle} color="amber" />
          <StatCard label="Adulteration" value={summary.adulteration} icon={AlertCircle} color="red" />
        </section>
      )}

      {showForm && (
        <TestForm
          onClose={() => setShowForm(false)}
          onSaved={() => { setShowForm(false); queryClient.invalidateQueries({ queryKey: ['dairy-quality-tests'] }); }}
        />
      )}

      {isLoading ? (
        <div className="grid gap-3">{[1, 2].map((i) => <div key={i} className="h-24 rounded-2xl bg-slate-100 dark:bg-neutral-800 animate-pulse" />)}</div>
      ) : tests.length === 0 ? (
        <div className="rounded-3xl bg-white dark:bg-neutral-900 border-2 border-dashed p-12 text-center">
          <Beaker className="h-16 w-16 text-slate-400 mx-auto mb-3" />
          <p className="font-extrabold text-slate-700">No quality tests recorded</p>
        </div>
      ) : (
        <section className="grid gap-2">
          {tests.map((t) => (
            <div key={t.id} className={
              'rounded-xl bg-white dark:bg-neutral-900 border-2 shadow-sm p-3 ' +
              (t.passed ? 'border-emerald-200' : 'border-rose-300')
            }>
              <div className="flex items-center justify-between gap-3 flex-wrap">
                <div className="flex items-center gap-3 min-w-0 flex-1">
                  <div className={
                    'h-10 w-10 rounded-xl text-white flex items-center justify-center shrink-0 ' +
                    (t.passed ? 'bg-emerald-500' : 'bg-rose-500')
                  }>
                    <Beaker className="h-5 w-5" />
                  </div>
                  <div className="min-w-0">
                    <div className="flex items-center gap-2 flex-wrap">
                      <span className="font-extrabold">{t.testNumber}</span>
                      <span className={
                        'px-1.5 py-0.5 rounded text-[9px] font-extrabold uppercase text-white ' +
                        (t.passed ? 'bg-emerald-600' : 'bg-rose-500')
                      }>{t.passed ? 'PASSED' : 'FAILED'}</span>
                      {t.quality && <span className="px-1.5 py-0.5 rounded bg-slate-100 text-slate-700 text-[9px] font-extrabold">{t.quality.replace('_', ' ')}</span>}
                      {t.adulterationDetected && <span className="px-1.5 py-0.5 rounded bg-red-500 text-white text-[9px] font-extrabold uppercase animate-pulse">ADULTERATION!</span>}
                    </div>
                    <div className="text-xs text-slate-500 font-semibold">
                      {t.sourceType} {t.sourceName ? '• ' + t.sourceName : ''} • {format(new Date(t.testedAt), 'dd MMM HH:mm')}
                    </div>
                    {t.adulterationTypes.length > 0 && (
                      <div className="text-xs text-red-700 font-extrabold mt-0.5">🚨 {t.adulterationTypes.join(', ')}</div>
                    )}
                  </div>
                </div>

                <div className="flex items-center gap-2 shrink-0">
                  {t.fatContent && (
                    <div className="text-center rounded-lg bg-amber-50 dark:bg-amber-950/30 p-2">
                      <div className="text-[9px] uppercase font-extrabold text-amber-700">Fat</div>
                      <div className="text-sm font-extrabold text-amber-900 tabular-nums">{t.fatContent}%</div>
                    </div>
                  )}
                  {t.snfContent && (
                    <div className="text-center rounded-lg bg-blue-50 dark:bg-blue-950/30 p-2">
                      <div className="text-[9px] uppercase font-extrabold text-blue-700">SNF</div>
                      <div className="text-sm font-extrabold text-blue-900 tabular-nums">{t.snfContent}%</div>
                    </div>
                  )}
                  {t.waterContent && (
                    <div className="text-center rounded-lg bg-cyan-50 dark:bg-cyan-950/30 p-2">
                      <div className="text-[9px] uppercase font-extrabold text-cyan-700">Water</div>
                      <div className="text-sm font-extrabold text-cyan-900 tabular-nums">{t.waterContent}%</div>
                    </div>
                  )}
                </div>
              </div>
            </div>
          ))}
        </section>
      )}
    </div>
  );
}

function StatCard({ label, value, icon: Icon, color }: any) {
  const colors: Record<string, string> = {
    rose: 'from-rose-500 to-red-600', emerald: 'from-emerald-500 to-green-600',
    amber: 'from-amber-500 to-orange-600', red: 'from-red-600 to-red-800',
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

function TestForm({ onClose, onSaved }: any) {
  const [form, setForm] = useState<any>({
    sourceType: 'FARMER',
    sourceName: '',
    fatContent: '',
    snfContent: '',
    proteinContent: '',
    waterContent: '',
    phLevel: '',
    temperature: '',
    adulterationDetected: false,
    adulterationTypes: [] as string[],
    quality: '',
    passed: true,
    actionTaken: '',
    testMethod: '',
    notes: '',
  });

  const saveMutation = useMutation({
    mutationFn: () => qualityTestsApi.create({
      ...form,
      fatContent: form.fatContent ? Number(form.fatContent) : undefined,
      snfContent: form.snfContent ? Number(form.snfContent) : undefined,
      proteinContent: form.proteinContent ? Number(form.proteinContent) : undefined,
      waterContent: form.waterContent ? Number(form.waterContent) : undefined,
      phLevel: form.phLevel ? Number(form.phLevel) : undefined,
      temperature: form.temperature ? Number(form.temperature) : undefined,
      quality: form.quality || undefined,
    }),
    onSuccess: () => { toast.success('Test recorded'); onSaved(); },
    onError: (e: any) => toast.error(e?.response?.data?.message || 'Failed'),
  });

  const toggleAdulteration = (a: string) => {
    const types = form.adulterationTypes.includes(a) ? form.adulterationTypes.filter((x: string) => x !== a) : [...form.adulterationTypes, a];
    setForm({ ...form, adulterationTypes: types, adulterationDetected: types.length > 0 });
  };

  return (
    <section className="rounded-3xl bg-white dark:bg-neutral-900 border-2 border-rose-300 shadow-lg overflow-hidden">
      <div className="px-5 py-3 border-b border-slate-100 bg-rose-50 flex items-center justify-between">
        <h3 className="font-extrabold">New Quality Test</h3>
        <button onClick={onClose} className="h-8 w-8 rounded-lg hover:bg-white flex items-center justify-center">
          <X className="h-4 w-4" />
        </button>
      </div>
      <div className="p-5 space-y-4 max-h-[85vh] overflow-y-auto">
        <div className="grid sm:grid-cols-2 gap-3">
          <div>
            <label className="text-[10px] uppercase font-extrabold text-slate-600 mb-1 block">Source Type *</label>
            <select value={form.sourceType} onChange={(e) => setForm({ ...form, sourceType: e.target.value })} className="h-11 w-full rounded-xl border-2 border-slate-200 dark:border-neutral-700 bg-white dark:bg-neutral-800 px-3 text-sm font-bold focus:outline-none focus:border-rose-500">
              {SOURCE_TYPES.map((s) => <option key={s} value={s}>{s.replace('_', ' ')}</option>)}
            </select>
          </div>
          <input value={form.sourceName} onChange={(e) => setForm({ ...form, sourceName: e.target.value })} placeholder="Source name" className="h-11 rounded-xl border-2 border-slate-200 dark:border-neutral-700 bg-white dark:bg-neutral-800 px-3 text-sm font-bold focus:outline-none focus:border-rose-500" />
        </div>

        <div className="grid grid-cols-2 sm:grid-cols-3 gap-3">
          <div>
            <label className="text-[10px] uppercase font-extrabold text-amber-700 mb-0.5 block">Fat %</label>
            <input type="number" step="0.1" value={form.fatContent} onChange={(e) => setForm({ ...form, fatContent: e.target.value })} className="h-11 w-full rounded-xl border-2 border-amber-300 bg-white px-3 text-sm font-extrabold tabular-nums focus:outline-none focus:border-amber-500" />
          </div>
          <div>
            <label className="text-[10px] uppercase font-extrabold text-blue-700 mb-0.5 block">SNF %</label>
            <input type="number" step="0.1" value={form.snfContent} onChange={(e) => setForm({ ...form, snfContent: e.target.value })} className="h-11 w-full rounded-xl border-2 border-blue-300 bg-white px-3 text-sm font-extrabold tabular-nums focus:outline-none focus:border-blue-500" />
          </div>
          <div>
            <label className="text-[10px] uppercase font-extrabold text-emerald-700 mb-0.5 block">Protein %</label>
            <input type="number" step="0.1" value={form.proteinContent} onChange={(e) => setForm({ ...form, proteinContent: e.target.value })} className="h-11 w-full rounded-xl border-2 border-emerald-300 bg-white px-3 text-sm font-extrabold tabular-nums focus:outline-none focus:border-emerald-500" />
          </div>
          <div>
            <label className="text-[10px] uppercase font-extrabold text-cyan-700 mb-0.5 block">Water %</label>
            <input type="number" step="0.1" value={form.waterContent} onChange={(e) => setForm({ ...form, waterContent: e.target.value })} className="h-11 w-full rounded-xl border-2 border-cyan-300 bg-white px-3 text-sm font-extrabold tabular-nums focus:outline-none focus:border-cyan-500" />
          </div>
          <div>
            <label className="text-[10px] uppercase font-extrabold text-slate-600 mb-0.5 block">pH</label>
            <input type="number" step="0.1" value={form.phLevel} onChange={(e) => setForm({ ...form, phLevel: e.target.value })} className="h-11 w-full rounded-xl border-2 border-slate-200 bg-white px-3 text-sm font-extrabold tabular-nums focus:outline-none focus:border-slate-500" />
          </div>
          <div>
            <label className="text-[10px] uppercase font-extrabold text-slate-600 mb-0.5 block">Temp °C</label>
            <input type="number" step="0.1" value={form.temperature} onChange={(e) => setForm({ ...form, temperature: e.target.value })} className="h-11 w-full rounded-xl border-2 border-slate-200 bg-white px-3 text-sm font-extrabold tabular-nums focus:outline-none focus:border-slate-500" />
          </div>
        </div>

        <div>
          <label className="text-[10px] uppercase font-extrabold text-slate-600 mb-2 block">Quality Grade</label>
          <div className="grid grid-cols-4 gap-2">
            {QUALITIES.map((q) => (
              <button key={q} onClick={() => setForm({ ...form, quality: q, passed: q !== 'REJECTED' })} className={
                'p-2 rounded-lg border-2 text-xs font-extrabold ' +
                (form.quality === q ? 'border-rose-500 bg-rose-50 text-rose-800' : 'border-slate-200 bg-white text-slate-700')
              }>{q.replace('_', ' ')}</button>
            ))}
          </div>
        </div>

        <div>
          <label className="text-[10px] uppercase font-extrabold text-red-700 mb-2 block">Adulteration (check if detected)</label>
          <div className="grid grid-cols-2 sm:grid-cols-4 gap-2">
            {ADULTERATIONS.map((a) => (
              <button key={a} onClick={() => toggleAdulteration(a)} className={
                'p-2 rounded-lg border-2 text-xs font-extrabold ' +
                (form.adulterationTypes.includes(a) ? 'border-red-500 bg-red-50 text-red-800' : 'border-slate-200 bg-white text-slate-700')
              }>⚠️ {a}</button>
            ))}
          </div>
        </div>

        <input value={form.actionTaken} onChange={(e) => setForm({ ...form, actionTaken: e.target.value })} placeholder="Action taken (rejected, accepted with warning...)" className="h-11 w-full rounded-xl border-2 border-slate-200 dark:border-neutral-700 bg-white dark:bg-neutral-800 px-3 text-sm font-bold focus:outline-none focus:border-rose-500" />
        <input value={form.testMethod} onChange={(e) => setForm({ ...form, testMethod: e.target.value })} placeholder="Test method (Lactometer, Gerber, Milk Analyzer)" className="h-11 w-full rounded-xl border-2 border-slate-200 dark:border-neutral-700 bg-white dark:bg-neutral-800 px-3 text-sm font-bold focus:outline-none focus:border-rose-500" />
        <textarea rows={2} value={form.notes} onChange={(e) => setForm({ ...form, notes: e.target.value })} placeholder="Notes" className="w-full rounded-xl border-2 border-slate-200 dark:border-neutral-700 bg-white dark:bg-neutral-800 px-3 py-2 text-sm font-semibold focus:outline-none focus:border-rose-500 resize-none" />

        <div className="flex gap-2 pt-2 border-t border-slate-100">
          <Button variant="secondary" className="flex-1" onClick={onClose}>Cancel</Button>
          <Button className="flex-1 bg-gradient-to-r from-rose-600 to-red-700" onClick={() => saveMutation.mutate()} loading={saveMutation.isPending}>
            <Save className="h-4 w-4" />Record Test
          </Button>
        </div>
      </div>
    </section>
  );
}
