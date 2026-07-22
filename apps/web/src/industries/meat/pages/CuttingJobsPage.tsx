import { useState } from 'react';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import {
  Scissors, Plus, X, Save, RefreshCw, Sparkles, User, Clock, Weight,
  CheckCircle2, TrendingDown, Activity,
} from 'lucide-react';
import { cuttingJobsApi, type CuttingJob } from '../api/cutting-jobs.api';
import { slaughterApi } from '../api/slaughter.api';
import { Button } from '@core/ui/Button';
import { toast } from 'sonner';
import { format, differenceInMinutes } from 'date-fns';

export default function CuttingJobsPage() {
  const queryClient = useQueryClient();
  const [statusFilter, setStatusFilter] = useState<string>('all');
  const [showForm, setShowForm] = useState(false);
  const [completing, setCompleting] = useState<CuttingJob | null>(null);

  const { data: jobs = [], isLoading, refetch, isRefetching } = useQuery({
    queryKey: ['cutting-jobs', statusFilter],
    queryFn: () => cuttingJobsApi.list({ status: statusFilter === 'all' ? undefined : statusFilter }),
  });

  return (
    <div className="space-y-6">
      <section className="relative overflow-hidden rounded-3xl bg-gradient-to-br from-slate-950 via-rose-900 to-red-800 text-white p-6 sm:p-8 shadow-2xl">
        <div className="absolute -top-20 -right-20 h-72 w-72 rounded-full bg-rose-400/20 blur-3xl" />
        <div className="relative flex flex-col lg:flex-row lg:items-center lg:justify-between gap-5">
          <div>
            <div className="inline-flex items-center gap-2 rounded-full bg-white/15 backdrop-blur px-3 py-1 text-xs font-extrabold border border-white/20">
              <Sparkles className="h-3.5 w-3.5 text-amber-300" />
              Butcher Workflow
            </div>
            <h1 className="mt-3 text-3xl sm:text-4xl font-extrabold leading-tight">✂️ Cutting Jobs</h1>
            <p className="mt-2 text-sm text-white/80 font-semibold">Track carcass processing & yield</p>
          </div>
          <div className="flex items-center gap-2 flex-wrap">
            <button onClick={() => refetch()} disabled={isRefetching} className="inline-flex items-center gap-2 rounded-xl bg-white/15 hover:bg-white/25 px-4 py-2.5 text-sm font-bold backdrop-blur border border-white/20">
              <RefreshCw className={'h-4 w-4 ' + (isRefetching ? 'animate-spin' : '')} />
              Refresh
            </button>
            <Button className="bg-white text-slate-900 hover:bg-slate-100" onClick={() => setShowForm(true)}>
              <Plus className="h-4 w-4" />
              Start New Job
            </Button>
          </div>
        </div>
      </section>

      <div className="flex gap-1.5 overflow-x-auto pb-1">
        {['all', 'IN_PROGRESS', 'COMPLETED'].map((s) => (
          <button key={s} onClick={() => setStatusFilter(s)} className={
            'shrink-0 px-3 py-1.5 rounded-lg text-xs font-extrabold ' +
            (statusFilter === s ? 'bg-rose-600 text-white shadow' : 'bg-slate-100 dark:bg-neutral-800 text-slate-700')
          }>{s === 'all' ? 'All' : s.replace('_', ' ')}</button>
        ))}
      </div>

      {showForm && (
        <CuttingJobForm
          onClose={() => setShowForm(false)}
          onSaved={() => { setShowForm(false); queryClient.invalidateQueries({ queryKey: ['cutting-jobs'] }); }}
        />
      )}

      {completing && (
        <CompleteJobModal
          job={completing}
          onClose={() => setCompleting(null)}
          onDone={() => { setCompleting(null); queryClient.invalidateQueries({ queryKey: ['cutting-jobs'] }); }}
        />
      )}

      {isLoading ? (
        <div className="grid gap-3">
          {[1, 2, 3].map((i) => <div key={i} className="h-32 rounded-2xl bg-slate-100 dark:bg-neutral-800 animate-pulse" />)}
        </div>
      ) : jobs.length === 0 ? (
        <div className="rounded-3xl bg-white dark:bg-neutral-900 border-2 border-dashed border-slate-200 dark:border-neutral-800 p-12 text-center">
          <Scissors className="h-16 w-16 text-slate-400 mx-auto mb-3" />
          <p className="font-extrabold text-slate-700">No cutting jobs yet</p>
        </div>
      ) : (
        <section className="grid gap-3">
          {jobs.map((job) => <JobCard key={job.id} job={job} onComplete={() => setCompleting(job)} />)}
        </section>
      )}
    </div>
  );
}

function JobCard({ job, onComplete }: { job: CuttingJob; onComplete: () => void }) {
  const isCompleted = job.status === 'COMPLETED';
  const duration = isCompleted && job.durationMin ? job.durationMin : differenceInMinutes(new Date(), new Date(job.startedAt));
  const waste = job.wasteWeightKg ?? (job.outputWeightKg ? job.inputWeightKg - job.outputWeightKg : 0);

  return (
    <div className={
      'rounded-2xl bg-white dark:bg-neutral-900 border-2 shadow-sm p-4 space-y-3 ' +
      (isCompleted ? 'border-emerald-200 dark:border-emerald-800' : 'border-amber-300 ring-2 ring-amber-100 dark:ring-amber-950/40')
    }>
      <div className="flex items-start justify-between gap-3 flex-wrap">
        <div className="flex items-start gap-3 min-w-0 flex-1">
          <div className={
            'h-12 w-12 rounded-2xl text-white flex items-center justify-center shadow shrink-0 ' +
            (isCompleted ? 'bg-gradient-to-br from-emerald-500 to-green-600' : 'bg-gradient-to-br from-amber-500 to-orange-600')
          }>
            <Scissors className="h-6 w-6" />
          </div>
          <div className="min-w-0 flex-1">
            <div className="flex items-center gap-2 flex-wrap">
              <span className="font-extrabold text-slate-900 dark:text-white">{job.jobNumber}</span>
              <span className={
                'px-2 py-0.5 rounded-full text-[9px] font-extrabold uppercase text-white ' +
                (isCompleted ? 'bg-emerald-600' : 'bg-amber-500')
              }>
                {job.status.replace('_', ' ')}
              </span>
            </div>
            {job.butcherName && (
              <div className="mt-1 text-xs text-slate-600 font-bold">
                <User className="h-3 w-3 inline mr-1" />
                Butcher: {job.butcherName}
              </div>
            )}
            <div className="text-[10px] text-slate-500 font-bold mt-0.5">
              Started: {format(new Date(job.startedAt), 'dd MMM, HH:mm')}
              {isCompleted && ' • Duration: ' + duration + 'min'}
            </div>
          </div>
        </div>

        <div className="text-right shrink-0">
          {isCompleted && job.yieldPct && (
            <>
              <div className="text-[10px] font-extrabold text-emerald-700 uppercase">Yield</div>
              <div className="text-2xl font-extrabold text-emerald-700 tabular-nums">{job.yieldPct.toFixed(1)}%</div>
            </>
          )}
          {!isCompleted && (
            <div className="text-xs font-extrabold text-amber-700 animate-pulse">
              <Activity className="h-3 w-3 inline mr-1" />
              {duration}min elapsed
            </div>
          )}
        </div>
      </div>

      <div className="grid grid-cols-3 gap-2 text-xs">
        <div className="rounded-lg bg-blue-50 dark:bg-blue-950/30 p-2">
          <div className="text-[9px] uppercase font-extrabold text-blue-700">Input</div>
          <div className="text-lg font-extrabold text-blue-800 tabular-nums">{job.inputWeightKg}kg</div>
        </div>
        <div className="rounded-lg bg-emerald-50 dark:bg-emerald-950/30 p-2">
          <div className="text-[9px] uppercase font-extrabold text-emerald-700">Output</div>
          <div className="text-lg font-extrabold text-emerald-800 tabular-nums">{job.outputWeightKg ?? '—'}kg</div>
        </div>
        <div className="rounded-lg bg-rose-50 dark:bg-rose-950/30 p-2">
          <div className="text-[9px] uppercase font-extrabold text-rose-700">Waste</div>
          <div className="text-lg font-extrabold text-rose-800 tabular-nums">{waste.toFixed(1)}kg</div>
        </div>
      </div>

      {job.notes && (
        <div className="text-xs italic text-slate-500 border-t border-slate-100 dark:border-neutral-800 pt-2">
          📝 {job.notes}
        </div>
      )}

      {!isCompleted && (
        <div className="pt-2 border-t border-slate-100 dark:border-neutral-800">
          <Button size="sm" onClick={onComplete} className="w-full bg-gradient-to-r from-emerald-600 to-green-700">
            <CheckCircle2 className="h-3.5 w-3.5" />
            Complete Job
          </Button>
        </div>
      )}
    </div>
  );
}

function CuttingJobForm({ onClose, onSaved }: any) {
  const [form, setForm] = useState<any>({
    slaughterLogId: '',
    butcherName: '',
    inputWeightKg: 0,
    notes: '',
  });

  const { data: slaughterLogs = [] } = useQuery({
    queryKey: ['slaughter-logs-for-cutting'],
    queryFn: () => slaughterApi.list({}),
  });

  const saveMutation = useMutation({
    mutationFn: () => cuttingJobsApi.create({
      ...form,
      inputWeightKg: Number(form.inputWeightKg) || 0,
    }),
    onSuccess: () => { toast.success('Cutting job started'); onSaved(); },
    onError: (e: any) => toast.error(e?.response?.data?.message || 'Failed'),
  });

  return (
    <section className="rounded-3xl bg-white dark:bg-neutral-900 border-2 border-rose-300 dark:border-rose-800 shadow-lg overflow-hidden">
      <div className="px-5 py-3 border-b border-slate-100 dark:border-neutral-800 bg-rose-50 dark:bg-rose-950/30 flex items-center justify-between">
        <h3 className="font-extrabold text-slate-900 dark:text-white">Start New Cutting Job</h3>
        <button onClick={onClose} className="h-8 w-8 rounded-lg hover:bg-white flex items-center justify-center">
          <X className="h-4 w-4" />
        </button>
      </div>
      <div className="p-5 space-y-3">
        <div>
          <label className="text-[10px] uppercase font-extrabold text-slate-600 mb-1 block">Link to Slaughter (optional)</label>
          <select value={form.slaughterLogId} onChange={(e) => {
            const log = slaughterLogs.find((l) => l.id === e.target.value);
            setForm({ ...form, slaughterLogId: e.target.value, inputWeightKg: log?.dressedWeightKg || log?.liveWeightKg || form.inputWeightKg });
          }} className="h-11 w-full rounded-xl border-2 border-slate-200 dark:border-neutral-700 bg-white dark:bg-neutral-800 px-3 text-sm font-bold focus:outline-none focus:border-rose-500">
            <option value="">-- Independent job --</option>
            {slaughterLogs.map((l) => (
              <option key={l.id} value={l.id}>
                {l.slaughterNumber} • {l.animalType} • {l.dressedWeightKg || l.liveWeightKg}kg
              </option>
            ))}
          </select>
        </div>

        <input value={form.butcherName} onChange={(e) => setForm({ ...form, butcherName: e.target.value })} placeholder="Butcher name" className="h-11 w-full rounded-xl border-2 border-slate-200 dark:border-neutral-700 bg-white dark:bg-neutral-800 px-3 text-sm font-bold focus:outline-none focus:border-rose-500" />

        <div>
          <label className="text-[10px] uppercase font-extrabold text-blue-700 mb-1 block">Input Weight (kg) *</label>
          <input type="number" step="0.1" value={form.inputWeightKg} onChange={(e) => setForm({ ...form, inputWeightKg: e.target.value })} className="h-14 w-full rounded-xl border-2 border-blue-300 bg-blue-50 dark:bg-blue-950/30 px-3 text-2xl font-extrabold tabular-nums focus:outline-none focus:border-blue-500" />
        </div>

        <textarea rows={2} value={form.notes} onChange={(e) => setForm({ ...form, notes: e.target.value })} placeholder="Notes..." className="w-full rounded-xl border-2 border-slate-200 dark:border-neutral-700 bg-white dark:bg-neutral-800 px-3 py-2 text-sm font-semibold focus:outline-none focus:border-rose-500 resize-none" />

        <div className="flex gap-2 pt-2 border-t border-slate-100 dark:border-neutral-800">
          <Button variant="secondary" className="flex-1" onClick={onClose}>Cancel</Button>
          <Button className="flex-1 bg-gradient-to-r from-rose-600 to-red-700" onClick={() => saveMutation.mutate()} loading={saveMutation.isPending} disabled={!form.inputWeightKg}>
            <Save className="h-4 w-4" />
            Start Job
          </Button>
        </div>
      </div>
    </section>
  );
}

function CompleteJobModal({ job, onClose, onDone }: any) {
  const [output, setOutput] = useState(job.inputWeightKg * 0.75);
  const [waste, setWaste] = useState(job.inputWeightKg * 0.25);
  const [notes, setNotes] = useState('');

  const yieldPct = job.inputWeightKg > 0 ? (output / job.inputWeightKg) * 100 : 0;

  const completeMutation = useMutation({
    mutationFn: () => cuttingJobsApi.complete(job.id, {
      outputWeightKg: Number(output),
      wasteWeightKg: Number(waste),
      notes,
    }),
    onSuccess: () => { toast.success('Job completed'); onDone(); },
    onError: (e: any) => toast.error(e?.response?.data?.message || 'Failed'),
  });

  return (
    <div className="fixed inset-0 z-50 bg-slate-950/70 backdrop-blur-sm flex items-center justify-center p-4">
      <div className="w-full max-w-md bg-white dark:bg-neutral-900 rounded-3xl shadow-2xl overflow-hidden">
        <div className="px-5 py-3 border-b border-slate-200 dark:border-neutral-800 bg-emerald-50 dark:bg-emerald-950/30 flex items-center justify-between">
          <div>
            <h3 className="font-extrabold text-slate-900 dark:text-white">Complete Job</h3>
            <p className="text-xs text-slate-500 font-semibold">{job.jobNumber} • Input: {job.inputWeightKg}kg</p>
          </div>
          <button onClick={onClose} className="h-8 w-8 rounded-lg hover:bg-white flex items-center justify-center">
            <X className="h-4 w-4" />
          </button>
        </div>
        <div className="p-5 space-y-3">
          <div>
            <label className="text-[10px] uppercase font-extrabold text-emerald-700 mb-1 block">Output Weight (kg) *</label>
            <input type="number" step="0.1" value={output} onChange={(e) => { setOutput(Number(e.target.value)); setWaste(Math.max(job.inputWeightKg - Number(e.target.value), 0)); }} className="h-14 w-full rounded-xl border-2 border-emerald-300 bg-emerald-50 dark:bg-emerald-950/30 px-4 text-2xl font-extrabold tabular-nums focus:outline-none focus:border-emerald-500" />
          </div>
          <div>
            <label className="text-[10px] uppercase font-extrabold text-rose-700 mb-1 block">Waste (kg)</label>
            <input type="number" step="0.1" value={waste} onChange={(e) => setWaste(Number(e.target.value))} className="h-14 w-full rounded-xl border-2 border-rose-300 bg-rose-50 dark:bg-rose-950/30 px-4 text-2xl font-extrabold tabular-nums focus:outline-none focus:border-rose-500" />
          </div>
          <div className="rounded-lg bg-gradient-to-br from-emerald-500 to-green-600 text-white p-4 text-center">
            <div className="text-xs uppercase font-extrabold text-white/80">Yield %</div>
            <div className="text-4xl font-extrabold tabular-nums">{yieldPct.toFixed(1)}%</div>
          </div>
          <textarea rows={2} value={notes} onChange={(e) => setNotes(e.target.value)} placeholder="Completion notes..." className="w-full rounded-xl border-2 border-slate-200 dark:border-neutral-700 bg-white dark:bg-neutral-800 px-3 py-2 text-sm font-semibold focus:outline-none focus:border-emerald-500 resize-none" />
          <div className="flex gap-2">
            <Button variant="secondary" className="flex-1" onClick={onClose}>Cancel</Button>
            <Button className="flex-1 bg-gradient-to-r from-emerald-600 to-green-700" onClick={() => completeMutation.mutate()} loading={completeMutation.isPending} disabled={output <= 0}>
              <CheckCircle2 className="h-4 w-4" />
              Complete
            </Button>
          </div>
        </div>
      </div>
    </div>
  );
}
