import { useState } from 'react';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import {
  Sparkle, Plus, X, Save, RefreshCw, Sparkles, Home, User,
  Clock, CheckCircle2, Play, AlertCircle, Timer,
} from 'lucide-react';
import { housekeepingApi } from '../api/housekeeping.api';
import { roomsApi } from '../api/rooms.api';
import { Button } from '@/components/ui/Button';
import { toast } from 'sonner';
import { format, differenceInMinutes } from 'date-fns';

const TASK_TYPES = [
  'Full Cleaning', 'Quick Turnover', 'Deep Cleaning', 'Linen Change',
  'Bathroom Cleaning', 'Vacuum', 'Dusting', 'Trash Removal',
  'Restocking', 'Inspection', 'Maintenance Check', 'Other',
];

const PRIORITIES = [
  { value: 'LOW', label: 'Low', color: 'bg-slate-500' },
  { value: 'NORMAL', label: 'Normal', color: 'bg-blue-500' },
  { value: 'HIGH', label: 'High', color: 'bg-amber-500' },
  { value: 'URGENT', label: 'Urgent', color: 'bg-rose-500' },
];

const STATUS_CONFIG: Record<string, { label: string; color: string }> = {
  PENDING: { label: 'Pending', color: 'bg-slate-500' },
  ASSIGNED: { label: 'Assigned', color: 'bg-blue-500' },
  IN_PROGRESS: { label: 'In Progress', color: 'bg-amber-500' },
  COMPLETED: { label: 'Completed', color: 'bg-emerald-600' },
};

export default function HousekeepingPage() {
  const queryClient = useQueryClient();
  const [statusFilter, setStatusFilter] = useState<string>('active');
  const [showForm, setShowForm] = useState(false);
  const [completing, setCompleting] = useState<any>(null);

  const { data: tasks = [], isLoading, refetch, isRefetching } = useQuery({
    queryKey: ['housekeeping-tasks', statusFilter],
    queryFn: () => housekeepingApi.list({
      status: statusFilter === 'active' || statusFilter === 'all' ? undefined : statusFilter,
    }),
    refetchInterval: 30_000,
  });

  const { data: summary } = useQuery({
    queryKey: ['housekeeping-summary'],
    queryFn: () => housekeepingApi.summary(),
  });

  const filtered = statusFilter === 'active'
    ? tasks.filter((t) => ['PENDING', 'ASSIGNED', 'IN_PROGRESS'].includes(t.status))
    : tasks;

  const startMutation = useMutation({
    mutationFn: (id: string) => housekeepingApi.start(id),
    onSuccess: () => { toast.success('Task started'); queryClient.invalidateQueries({ queryKey: ['housekeeping-tasks'] }); },
  });

  return (
    <div className="space-y-6">
      <section className="relative overflow-hidden rounded-3xl bg-gradient-to-br from-slate-950 via-emerald-900 to-teal-800 text-white p-6 sm:p-8 shadow-2xl">
        <div className="absolute -top-20 -right-20 h-72 w-72 rounded-full bg-emerald-400/20 blur-3xl" />
        <div className="relative flex flex-col lg:flex-row lg:items-center lg:justify-between gap-5">
          <div>
            <div className="inline-flex items-center gap-2 rounded-full bg-white/15 backdrop-blur px-3 py-1 text-xs font-extrabold border border-white/20">
              <Sparkle className="h-3.5 w-3.5 text-amber-300" />
              Cleaning Operations
            </div>
            <h1 className="mt-3 text-3xl sm:text-4xl font-extrabold leading-tight">🧹 Housekeeping</h1>
            <p className="mt-2 text-sm text-white/80 font-semibold">Room cleaning tasks & workflow</p>
          </div>
          <div className="flex items-center gap-2 flex-wrap">
            <button onClick={() => refetch()} disabled={isRefetching} className="inline-flex items-center gap-2 rounded-xl bg-white/15 hover:bg-white/25 px-4 py-2.5 text-sm font-bold backdrop-blur border border-white/20">
              <RefreshCw className={'h-4 w-4 ' + (isRefetching ? 'animate-spin' : '')} />
              Refresh
            </button>
            <Button className="bg-white text-slate-900 hover:bg-slate-100" onClick={() => setShowForm(true)}>
              <Plus className="h-4 w-4" />
              New Task
            </Button>
          </div>
        </div>
      </section>

      {summary && (
        <section className="grid grid-cols-3 gap-4">
          <SummaryCard label="Pending" value={summary.pending} color="slate" icon={Clock} />
          <SummaryCard label="In Progress" value={summary.inProgress} color="amber" icon={Timer} />
          <SummaryCard label="Completed" value={summary.completed} color="emerald" icon={CheckCircle2} />
        </section>
      )}

      <section className="rounded-3xl bg-white dark:bg-neutral-900 border border-slate-200 dark:border-neutral-800 shadow-sm p-4">
        <div className="flex gap-1.5 overflow-x-auto pb-1">
          {[
            { v: 'active', label: '🔥 Active' },
            { v: 'all', label: 'All' },
            ...Object.entries(STATUS_CONFIG).map(([k, v]) => ({ v: k, label: v.label })),
          ].map((s) => (
            <button key={s.v} onClick={() => setStatusFilter(s.v)} className={
              'shrink-0 px-3 py-1.5 rounded-lg text-xs font-extrabold ' +
              (statusFilter === s.v ? 'bg-emerald-600 text-white shadow' : 'bg-slate-100 dark:bg-neutral-800 text-slate-700')
            }>{s.label}</button>
          ))}
        </div>
      </section>

      {showForm && (
        <TaskForm
          onClose={() => setShowForm(false)}
          onSaved={() => { setShowForm(false); queryClient.invalidateQueries({ queryKey: ['housekeeping-tasks'] }); queryClient.invalidateQueries({ queryKey: ['housekeeping-summary'] }); }}
        />
      )}

      {completing && (
        <CompleteModal
          task={completing}
          onClose={() => setCompleting(null)}
          onDone={() => { setCompleting(null); queryClient.invalidateQueries({ queryKey: ['housekeeping-tasks'] }); queryClient.invalidateQueries({ queryKey: ['hotel-rooms'] }); }}
        />
      )}

      {isLoading ? (
        <div className="grid sm:grid-cols-2 gap-3">{[1, 2, 3, 4].map((i) => <div key={i} className="h-40 rounded-2xl bg-slate-100 dark:bg-neutral-800 animate-pulse" />)}</div>
      ) : filtered.length === 0 ? (
        <div className="rounded-3xl bg-white dark:bg-neutral-900 border-2 border-dashed border-slate-200 dark:border-neutral-800 p-12 text-center">
          <Sparkle className="h-16 w-16 text-slate-400 mx-auto mb-3" />
          <p className="font-extrabold text-slate-700">No tasks</p>
        </div>
      ) : (
        <section className="grid sm:grid-cols-2 gap-3">
          {filtered.map((task) => (
            <TaskCard
              key={task.id}
              task={task}
              onStart={() => startMutation.mutate(task.id)}
              onComplete={() => setCompleting(task)}
            />
          ))}
        </section>
      )}
    </div>
  );
}

function SummaryCard({ label, value, icon: Icon, color }: any) {
  const colors: Record<string, string> = {
    slate: 'from-slate-500 to-slate-700',
    amber: 'from-amber-500 to-orange-600',
    emerald: 'from-emerald-500 to-green-600',
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

function TaskCard({ task, onStart, onComplete }: any) {
  const cfg = STATUS_CONFIG[task.status] ?? STATUS_CONFIG.PENDING;
  const priority = PRIORITIES.find((p) => p.value === task.priority);
  const elapsed = task.startedAt && !task.completedAt ? differenceInMinutes(new Date(), new Date(task.startedAt)) : null;

  return (
    <div className={
      'rounded-2xl bg-white dark:bg-neutral-900 border-2 shadow-sm p-4 space-y-3 ' +
      (task.status === 'IN_PROGRESS' ? 'border-amber-300 ring-2 ring-amber-100 animate-pulse-slow' :
       task.status === 'COMPLETED' ? 'border-emerald-200' :
       task.priority === 'URGENT' ? 'border-rose-300 ring-2 ring-rose-100' : 'border-slate-200 dark:border-neutral-800')
    }>
      <div className="flex items-start justify-between gap-3">
        <div className="flex items-start gap-3 min-w-0 flex-1">
          <div className={
            'h-12 w-12 rounded-2xl text-white flex items-center justify-center shadow shrink-0 ' +
            (task.status === 'COMPLETED' ? 'bg-gradient-to-br from-emerald-500 to-green-600' :
             task.status === 'IN_PROGRESS' ? 'bg-gradient-to-br from-amber-500 to-orange-600' :
             'bg-gradient-to-br from-slate-500 to-slate-700')
          }>
            <Sparkle className="h-6 w-6" />
          </div>
          <div className="min-w-0 flex-1">
            <div className="flex items-center gap-2 flex-wrap">
              <span className="text-2xl font-extrabold">Room {task.roomNumber}</span>
              <span className={'px-2 py-0.5 rounded-full text-[9px] font-extrabold uppercase text-white ' + cfg.color}>
                {cfg.label}
              </span>
              {priority && (
                <span className={'px-2 py-0.5 rounded text-[9px] font-extrabold uppercase text-white ' + priority.color}>
                  {priority.label}
                </span>
              )}
            </div>
            <div className="text-[10px] font-mono font-bold text-slate-500">{task.taskNumber}</div>
            <div className="mt-1 text-xs font-bold text-slate-600">{task.taskType}</div>
            {task.assignedName && (
              <div className="flex items-center gap-1 text-xs text-slate-600 font-bold mt-1">
                <User className="h-3 w-3" />
                {task.assignedName}
              </div>
            )}
            {elapsed !== null && (
              <div className="text-xs font-extrabold text-amber-700 mt-1">
                <Timer className="h-3 w-3 inline mr-1" />
                {elapsed} min elapsed
              </div>
            )}
            {task.completedAt && task.durationMin && (
              <div className="text-xs font-extrabold text-emerald-700 mt-1">
                Completed in {task.durationMin} min
              </div>
            )}
          </div>
        </div>
      </div>

      {task.notes && (
        <div className="text-xs italic text-slate-500 border-t border-slate-100 dark:border-neutral-800 pt-2">
          📝 {task.notes}
        </div>
      )}

      {task.issueFound && (
        <div className="rounded-lg bg-rose-50 border border-rose-200 p-2 text-xs font-bold text-rose-700">
          ⚠️ Issue: {task.issueFound}
        </div>
      )}

      {task.status !== 'COMPLETED' && (
        <div className="flex gap-1 pt-2 border-t border-slate-100 dark:border-neutral-800">
          {task.status === 'PENDING' || task.status === 'ASSIGNED' ? (
            <button onClick={onStart} className="flex-1 h-9 rounded-lg bg-amber-100 hover:bg-amber-200 text-amber-700 text-xs font-extrabold inline-flex items-center justify-center gap-1">
              <Play className="h-3 w-3" />
              Start
            </button>
          ) : null}
          {task.status === 'IN_PROGRESS' && (
            <button onClick={onComplete} className="flex-1 h-9 rounded-lg bg-emerald-600 text-white text-xs font-extrabold inline-flex items-center justify-center gap-1">
              <CheckCircle2 className="h-3 w-3" />
              Complete
            </button>
          )}
        </div>
      )}
    </div>
  );
}

function TaskForm({ onClose, onSaved }: any) {
  const [form, setForm] = useState<any>({
    roomId: '',
    roomNumber: '',
    taskType: 'Full Cleaning',
    priority: 'NORMAL',
    scheduledFor: '',
    assignedTo: '',
    assignedName: '',
    notes: '',
  });

  const { data: rooms = [] } = useQuery({
    queryKey: ['rooms-for-hk'],
    queryFn: () => roomsApi.list({}),
  });

  const saveMutation = useMutation({
    mutationFn: () => housekeepingApi.create({
      ...form,
      scheduledFor: form.scheduledFor || undefined,
      status: form.assignedTo ? 'ASSIGNED' : 'PENDING',
    }),
    onSuccess: () => { toast.success('Task created'); onSaved(); },
    onError: (e: any) => toast.error(e?.response?.data?.message || 'Failed'),
  });

  return (
    <section className="rounded-3xl bg-white dark:bg-neutral-900 border-2 border-emerald-300 dark:border-emerald-800 shadow-lg overflow-hidden">
      <div className="px-5 py-3 border-b bg-emerald-50 dark:bg-emerald-950/30 flex items-center justify-between">
        <h3 className="font-extrabold">🧹 New Housekeeping Task</h3>
        <button onClick={onClose} className="h-8 w-8 rounded-lg hover:bg-white flex items-center justify-center">
          <X className="h-4 w-4" />
        </button>
      </div>
      <div className="p-5 space-y-3">
        <div>
          <label className="text-[10px] uppercase font-extrabold text-slate-600 mb-1 block">Room *</label>
          <select value={form.roomId} onChange={(e) => {
            const r = rooms.find((x) => x.id === e.target.value);
            setForm({ ...form, roomId: e.target.value, roomNumber: r?.roomNumber || '' });
          }} className="h-11 w-full rounded-xl border-2 border-slate-200 dark:border-neutral-700 bg-white dark:bg-neutral-800 px-3 text-sm font-bold focus:outline-none focus:border-emerald-500">
            <option value="">-- Select Room --</option>
            {rooms.map((r) => <option key={r.id} value={r.id}>Room {r.roomNumber} • {r.status}</option>)}
          </select>
        </div>

        <div className="grid sm:grid-cols-2 gap-3">
          <select value={form.taskType} onChange={(e) => setForm({ ...form, taskType: e.target.value })} className="h-11 rounded-xl border-2 border-slate-200 dark:border-neutral-700 bg-white dark:bg-neutral-800 px-3 text-sm font-bold focus:outline-none focus:border-emerald-500">
            {TASK_TYPES.map((t) => <option key={t} value={t}>{t}</option>)}
          </select>
          <div>
            <div className="text-[10px] uppercase font-extrabold text-slate-600 mb-1">Priority</div>
            <div className="grid grid-cols-4 gap-1">
              {PRIORITIES.map((p) => (
                <button key={p.value} onClick={() => setForm({ ...form, priority: p.value })} className={
                  'p-2 rounded-lg text-[10px] font-extrabold uppercase text-white ' + p.color +
                  (form.priority === p.value ? ' ring-2 ring-slate-900' : ' opacity-70 hover:opacity-100')
                }>{p.label}</button>
              ))}
            </div>
          </div>
        </div>

        <div className="grid sm:grid-cols-2 gap-3">
          <input type="datetime-local" value={form.scheduledFor} onChange={(e) => setForm({ ...form, scheduledFor: e.target.value })} className="h-11 rounded-xl border-2 border-slate-200 dark:border-neutral-700 bg-white dark:bg-neutral-800 px-3 text-sm font-bold focus:outline-none focus:border-emerald-500" />
          <input value={form.assignedName} onChange={(e) => setForm({ ...form, assignedName: e.target.value, assignedTo: e.target.value })} placeholder="Assign to (staff name)" className="h-11 rounded-xl border-2 border-slate-200 dark:border-neutral-700 bg-white dark:bg-neutral-800 px-3 text-sm font-bold focus:outline-none focus:border-emerald-500" />
        </div>

        <textarea rows={2} value={form.notes} onChange={(e) => setForm({ ...form, notes: e.target.value })} placeholder="Notes / special instructions..." className="w-full rounded-xl border-2 border-slate-200 dark:border-neutral-700 bg-white dark:bg-neutral-800 px-3 py-2 text-sm font-semibold focus:outline-none focus:border-emerald-500 resize-none" />

        <div className="flex gap-2 pt-2 border-t border-slate-100 dark:border-neutral-800">
          <Button variant="secondary" className="flex-1" onClick={onClose}>Cancel</Button>
          <Button className="flex-1 bg-gradient-to-r from-emerald-600 to-teal-700" onClick={() => saveMutation.mutate()} loading={saveMutation.isPending} disabled={!form.roomNumber}>
            <Save className="h-4 w-4" />
            Create Task
          </Button>
        </div>
      </div>
    </section>
  );
}

function CompleteModal({ task, onClose, onDone }: any) {
  const [notes, setNotes] = useState('');
  const [issueFound, setIssueFound] = useState('');
  const [hasIssue, setHasIssue] = useState(false);

  const completeMutation = useMutation({
    mutationFn: () => housekeepingApi.complete(task.id, {
      notes,
      issueFound: hasIssue ? issueFound : undefined,
    }),
    onSuccess: () => { toast.success('Task completed'); onDone(); },
    onError: (e: any) => toast.error(e?.response?.data?.message || 'Failed'),
  });

  return (
    <div className="fixed inset-0 z-50 bg-slate-950/70 backdrop-blur-sm flex items-center justify-center p-4">
      <div className="w-full max-w-md bg-white dark:bg-neutral-900 rounded-3xl shadow-2xl overflow-hidden">
        <div className="px-5 py-3 border-b bg-emerald-50 dark:bg-emerald-950/30 flex items-center justify-between">
          <div>
            <h3 className="font-extrabold">Complete Task</h3>
            <p className="text-xs text-slate-500 font-semibold">Room {task.roomNumber} • {task.taskType}</p>
          </div>
          <button onClick={onClose} className="h-8 w-8 rounded-lg hover:bg-white flex items-center justify-center">
            <X className="h-4 w-4" />
          </button>
        </div>
        <div className="p-5 space-y-3">
          <textarea rows={3} value={notes} onChange={(e) => setNotes(e.target.value)} placeholder="Completion notes..." className="w-full rounded-xl border-2 border-slate-200 dark:border-neutral-700 bg-white dark:bg-neutral-800 px-3 py-2 text-sm font-semibold focus:outline-none focus:border-emerald-500 resize-none" />

          <label className="flex items-center gap-2 p-3 rounded-xl border-2 border-rose-200 bg-rose-50 dark:bg-rose-950/30 cursor-pointer">
            <input type="checkbox" checked={hasIssue} onChange={(e) => setHasIssue(e.target.checked)} className="h-5 w-5 rounded" />
            <AlertCircle className={'h-5 w-5 ' + (hasIssue ? 'text-rose-600' : 'text-slate-400')} />
            <span className="text-sm font-extrabold text-rose-900">Report an issue</span>
          </label>

          {hasIssue && (
            <textarea rows={3} value={issueFound} onChange={(e) => setIssueFound(e.target.value)} placeholder="Describe the issue (leak, broken TV, damage...)..." className="w-full rounded-xl border-2 border-rose-300 bg-rose-50 dark:bg-rose-950/30 px-3 py-2 text-sm font-semibold focus:outline-none focus:border-rose-500 resize-none" />
          )}

          <div className="flex gap-2">
            <Button variant="secondary" className="flex-1" onClick={onClose}>Cancel</Button>
            <Button className="flex-1 bg-gradient-to-r from-emerald-600 to-green-700" onClick={() => completeMutation.mutate()} loading={completeMutation.isPending}>
              <CheckCircle2 className="h-4 w-4" />
              Complete
            </Button>
          </div>
        </div>
      </div>
    </div>
  );
}
