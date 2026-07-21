import { useState } from 'react';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import {
  Calendar, Plus, X, Save, Edit3, RefreshCw, Sparkles, Clock, Users,
  DollarSign, User, Trash2, CheckCircle2, MapPin, Zap,
} from 'lucide-react';
import { classesApi, type ClassType, type ClassStatus, type GymClass } from '../api/classes.api';
import { trainersApi } from '../api/trainers.api';
import { formatPKR } from '@/lib/format';
import { Button } from '@/components/ui/Button';
import { UploadDropzone } from '@/components/uploads';
import { toast } from 'sonner';
import { format, differenceInMinutes } from 'date-fns';

const CLASS_TYPES: { value: ClassType; label: string; emoji: string }[] = [
  { value: 'YOGA', label: 'Yoga', emoji: '🧘' },
  { value: 'ZUMBA', label: 'Zumba', emoji: '💃' },
  { value: 'AEROBICS', label: 'Aerobics', emoji: '💃' },
  { value: 'CROSSFIT', label: 'CrossFit', emoji: '🏋️' },
  { value: 'HIIT', label: 'HIIT', emoji: '🔥' },
  { value: 'SPINNING', label: 'Spinning', emoji: '🚴' },
  { value: 'BOXING', label: 'Boxing', emoji: '🥊' },
  { value: 'KICKBOXING', label: 'Kickboxing', emoji: '🥋' },
  { value: 'MMA', label: 'MMA', emoji: '🥊' },
  { value: 'KARATE', label: 'Karate', emoji: '🥋' },
  { value: 'DANCE', label: 'Dance', emoji: '💃' },
  { value: 'PILATES', label: 'Pilates', emoji: '🧘' },
  { value: 'STRETCHING', label: 'Stretching', emoji: '🤸' },
  { value: 'BOOTCAMP', label: 'Bootcamp', emoji: '⚡' },
  { value: 'MEDITATION', label: 'Meditation', emoji: '🧘' },
  { value: 'BODY_PUMP', label: 'Body Pump', emoji: '💪' },
  { value: 'OTHER', label: 'Other', emoji: '⭐' },
];

const STATUS_COLORS: Record<ClassStatus, string> = {
  SCHEDULED: 'bg-blue-500',
  IN_PROGRESS: 'bg-amber-500',
  COMPLETED: 'bg-emerald-600',
  CANCELLED: 'bg-rose-500',
  RESCHEDULED: 'bg-violet-500',
};

export default function ClassesPage() {
  const queryClient = useQueryClient();
  const [typeFilter, setTypeFilter] = useState<string>('all');
  const [statusFilter, setStatusFilter] = useState<string>('SCHEDULED');
  const [showForm, setShowForm] = useState(false);
  const [editing, setEditing] = useState<GymClass | null>(null);

  const { data: classes = [], isLoading, refetch, isRefetching } = useQuery({
    queryKey: ['gym-classes', typeFilter, statusFilter],
    queryFn: () => classesApi.list({
      classType: typeFilter === 'all' ? undefined : typeFilter,
      status: statusFilter === 'all' ? undefined : statusFilter,
    }),
    refetchInterval: 60_000,
  });

  const statusMutation = useMutation({
    mutationFn: ({ id, status }: any) => classesApi.updateStatus(id, status),
    onSuccess: () => { toast.success('Status updated'); queryClient.invalidateQueries({ queryKey: ['gym-classes'] }); },
  });

  return (
    <div className="space-y-6">
      <section className="relative overflow-hidden rounded-3xl bg-gradient-to-br from-slate-950 via-blue-900 to-cyan-700 text-white p-6 sm:p-8 shadow-2xl">
        <div className="absolute -top-20 -right-20 h-72 w-72 rounded-full bg-blue-400/20 blur-3xl" />
        <div className="relative flex flex-col lg:flex-row lg:items-center lg:justify-between gap-5">
          <div>
            <div className="inline-flex items-center gap-2 rounded-full bg-white/15 backdrop-blur px-3 py-1 text-xs font-extrabold border border-white/20">
              <Calendar className="h-3.5 w-3.5 text-amber-300" />
              Group Classes
            </div>
            <h1 className="mt-3 text-3xl sm:text-4xl font-extrabold leading-tight">📅 Classes</h1>
            <p className="mt-2 text-sm text-white/80 font-semibold">Yoga, Zumba, HIIT, CrossFit</p>
          </div>
          <div className="flex items-center gap-2 flex-wrap">
            <button onClick={() => refetch()} disabled={isRefetching} className="inline-flex items-center gap-2 rounded-xl bg-white/15 hover:bg-white/25 px-4 py-2.5 text-sm font-bold backdrop-blur border border-white/20">
              <RefreshCw className={'h-4 w-4 ' + (isRefetching ? 'animate-spin' : '')} />
              Refresh
            </button>
            <Button className="bg-white text-slate-900 hover:bg-slate-100" onClick={() => { setEditing(null); setShowForm(true); }}>
              <Plus className="h-4 w-4" />
              Schedule Class
            </Button>
          </div>
        </div>
      </section>

      <section className="rounded-3xl bg-white dark:bg-neutral-900 border border-slate-200 dark:border-neutral-800 shadow-sm p-4 space-y-3">
        <div className="flex gap-1.5 overflow-x-auto pb-1">
          <button onClick={() => setTypeFilter('all')} className={
            'shrink-0 px-3 py-1.5 rounded-lg text-xs font-extrabold ' +
            (typeFilter === 'all' ? 'bg-blue-600 text-white shadow' : 'bg-slate-100 dark:bg-neutral-800 text-slate-700')
          }>All Types</button>
          {CLASS_TYPES.map((t) => (
            <button key={t.value} onClick={() => setTypeFilter(t.value)} className={
              'shrink-0 px-3 py-1.5 rounded-lg text-xs font-extrabold ' +
              (typeFilter === t.value ? 'bg-blue-600 text-white shadow' : 'bg-slate-100 dark:bg-neutral-800 text-slate-700')
            }>{t.emoji} {t.label}</button>
          ))}
        </div>
        <div className="flex gap-1.5 flex-wrap">
          {['SCHEDULED', 'all', 'IN_PROGRESS', 'COMPLETED', 'CANCELLED'].map((s) => (
            <button key={s} onClick={() => setStatusFilter(s)} className={
              'px-3 py-1.5 rounded-lg text-xs font-extrabold ' +
              (statusFilter === s ? 'bg-cyan-600 text-white shadow' : 'bg-slate-100 dark:bg-neutral-800 text-slate-700')
            }>{s === 'all' ? 'All Status' : s.replace('_', ' ')}</button>
          ))}
        </div>
      </section>

      {showForm && (
        <ClassForm
          editing={editing}
          onClose={() => { setShowForm(false); setEditing(null); }}
          onSaved={() => { setShowForm(false); setEditing(null); queryClient.invalidateQueries({ queryKey: ['gym-classes'] }); }}
        />
      )}

      {isLoading ? (
        <div className="grid sm:grid-cols-2 lg:grid-cols-3 gap-4">
          {[1, 2, 3].map((i) => <div key={i} className="h-64 rounded-2xl bg-slate-100 dark:bg-neutral-800 animate-pulse" />)}
        </div>
      ) : classes.length === 0 ? (
        <div className="rounded-3xl bg-white dark:bg-neutral-900 border-2 border-dashed p-12 text-center">
          <Calendar className="h-16 w-16 text-slate-400 mx-auto mb-3" />
          <p className="font-extrabold text-slate-700">No classes scheduled</p>
        </div>
      ) : (
        <section className="grid sm:grid-cols-2 lg:grid-cols-3 gap-4">
          {classes.map((cls) => (
            <ClassCard
              key={cls.id}
              cls={cls}
              onEdit={() => { setEditing(cls); setShowForm(true); }}
              onStatusChange={(status: any) => statusMutation.mutate({ id: cls.id, status })}
            />
          ))}
        </section>
      )}
    </div>
  );
}

function ClassCard({ cls, onEdit, onStatusChange }: any) {
  const type = CLASS_TYPES.find((t) => t.value === cls.classType);
  const isFull = cls.currentEnrolled >= cls.maxParticipants;
  const minsToStart = differenceInMinutes(new Date(cls.scheduledStart), new Date());
  const isSoon = minsToStart <= 30 && minsToStart >= 0;
  const enrollmentPct = (cls.currentEnrolled / cls.maxParticipants) * 100;

  return (
    <div className={
      'rounded-2xl bg-white dark:bg-neutral-900 border-2 shadow-sm overflow-hidden ' +
      (isSoon ? 'border-amber-400 ring-2 ring-amber-100' : 'border-slate-200 dark:border-neutral-800')
    }>
      <div className="relative aspect-video bg-gradient-to-br from-blue-500 via-cyan-600 to-blue-700 overflow-hidden">
        {cls.imageUrl ? (
          <img src={cls.imageUrl} alt="" className="w-full h-full object-cover" />
        ) : (
          <div className="w-full h-full flex items-center justify-center">
            <span className="text-6xl">{type?.emoji}</span>
          </div>
        )}
        <div className="absolute top-2 left-2 flex flex-col gap-1">
          <span className={'px-2 py-0.5 rounded text-white text-[9px] font-extrabold uppercase shadow ' + STATUS_COLORS[cls.status as keyof typeof STATUS_COLORS]}>
            {cls.status.replace('_', ' ')}
          </span>
          {isFull && <span className="px-2 py-0.5 rounded bg-rose-500 text-white text-[9px] font-extrabold uppercase shadow">FULL</span>}
          {isSoon && <span className="px-2 py-0.5 rounded bg-amber-500 text-white text-[9px] font-extrabold uppercase shadow animate-pulse">SOON</span>}
        </div>
        <div className="absolute top-2 right-2">
          <button onClick={onEdit} className="h-8 w-8 rounded-lg bg-white/20 hover:bg-white/30 backdrop-blur text-white flex items-center justify-center">
            <Edit3 className="h-3.5 w-3.5" />
          </button>
        </div>
      </div>

      <div className="p-4 space-y-3">
        <div>
          <h3 className="font-extrabold text-slate-900 dark:text-white line-clamp-1">{cls.name}</h3>
          <div className="text-[10px] font-extrabold uppercase text-blue-600">{type?.label}</div>
        </div>

        <div className="grid grid-cols-2 gap-2 text-xs">
          <div>
            <div className="text-[9px] uppercase font-extrabold text-slate-500">When</div>
            <div className="font-extrabold">{format(new Date(cls.scheduledStart), 'dd MMM, HH:mm')}</div>
          </div>
          <div>
            <div className="text-[9px] uppercase font-extrabold text-slate-500">Duration</div>
            <div className="font-extrabold">{cls.durationMinutes}min</div>
          </div>
        </div>

        {cls.trainer && (
          <div className="text-xs">
            <span className="text-slate-500 font-semibold">Trainer: </span>
            <span className="font-extrabold text-violet-700">
              {cls.trainer.staff ? ((cls.trainer.staff.firstName || '') + ' ' + (cls.trainer.staff.lastName || '')).trim() : 'TBD'}
            </span>
          </div>
        )}

        {cls.location && (
          <div className="text-xs flex items-center gap-1 text-slate-600">
            <MapPin className="h-3 w-3" />
            <span className="font-bold">{cls.location} {cls.roomName ? '• ' + cls.roomName : ''}</span>
          </div>
        )}

        <div>
          <div className="flex items-center justify-between text-[10px] font-extrabold mb-1">
            <span className="text-slate-600 inline-flex items-center gap-1">
              <Users className="h-3 w-3" />
              Enrollment
            </span>
            <span className={enrollmentPct >= 100 ? 'text-rose-700' : enrollmentPct >= 80 ? 'text-amber-700' : 'text-emerald-700'}>
              {cls.currentEnrolled} / {cls.maxParticipants}
            </span>
          </div>
          <div className="h-2 rounded-full bg-slate-100 overflow-hidden">
            <div className={
              'h-full ' +
              (enrollmentPct >= 100 ? 'bg-gradient-to-r from-rose-500 to-red-600' :
               enrollmentPct >= 80 ? 'bg-gradient-to-r from-amber-500 to-orange-600' :
               'bg-gradient-to-r from-emerald-500 to-green-600')
            } style={{ width: Math.min(enrollmentPct, 100) + '%' }} />
          </div>
        </div>

        {!cls.isFree && (
          <div className="flex items-center justify-between text-xs pt-2 border-t border-slate-100">
            <span className="text-slate-500 font-semibold">Member: </span>
            <span className="font-extrabold text-emerald-700 tabular-nums">{formatPKR(cls.memberPrice)}</span>
          </div>
        )}

        {cls.status === 'SCHEDULED' && (
          <div className="flex gap-1 pt-2 border-t border-slate-100 dark:border-neutral-800">
            <button onClick={() => onStatusChange('IN_PROGRESS')} className="flex-1 h-9 rounded-lg bg-amber-100 hover:bg-amber-200 text-amber-700 text-xs font-extrabold">
              <Zap className="h-3 w-3 inline mr-1" />
              Start Class
            </button>
            <button onClick={() => onStatusChange('CANCELLED')} className="h-9 w-9 rounded-lg bg-rose-50 hover:bg-rose-100 text-rose-600 flex items-center justify-center">
              <X className="h-3.5 w-3.5" />
            </button>
          </div>
        )}
        {cls.status === 'IN_PROGRESS' && (
          <button onClick={() => onStatusChange('COMPLETED')} className="w-full h-9 rounded-lg bg-emerald-100 hover:bg-emerald-200 text-emerald-700 text-xs font-extrabold">
            <CheckCircle2 className="h-3 w-3 inline mr-1" />
            Complete Class
          </button>
        )}
      </div>
    </div>
  );
}

function ClassForm({ editing, onClose, onSaved }: any) {
  const [form, setForm] = useState<any>({
    trainerId: editing?.trainerId ?? '',
    name: editing?.name ?? '',
    classType: editing?.classType ?? 'YOGA',
    description: editing?.description ?? '',
    scheduledDate: editing?.scheduledStart ? new Date(editing.scheduledStart).toISOString().split('T')[0] : new Date().toISOString().split('T')[0],
    scheduledTime: editing?.scheduledStart ? new Date(editing.scheduledStart).toTimeString().slice(0, 5) : '18:00',
    durationMinutes: editing?.durationMinutes ?? 60,
    maxParticipants: editing?.maxParticipants ?? 20,
    minParticipants: editing?.minParticipants ?? 1,
    isFree: editing?.isFree ?? true,
    dropInPrice: editing?.dropInPrice ?? 0,
    memberPrice: editing?.memberPrice ?? 0,
    location: editing?.location ?? '',
    roomName: editing?.roomName ?? '',
    difficultyLevel: editing?.difficultyLevel ?? 'BEGINNER',
    targetAudience: editing?.targetAudience ?? '',
    imageUrl: editing?.imageUrl ?? '',
    notes: editing?.notes ?? '',
  });

  const { data: trainers = [] } = useQuery({
    queryKey: ['trainers-for-class'],
    queryFn: () => trainersApi.list({ available: true }),
  });

  const saveMutation = useMutation({
    mutationFn: () => {
      const start = new Date(form.scheduledDate + 'T' + form.scheduledTime);
      const end = new Date(start.getTime() + form.durationMinutes * 60 * 1000);
      const payload: any = {
        ...form,
        scheduledStart: start.toISOString(),
        scheduledEnd: end.toISOString(),
        durationMinutes: Number(form.durationMinutes),
        maxParticipants: Number(form.maxParticipants),
        minParticipants: Number(form.minParticipants),
        dropInPrice: Number(form.dropInPrice) || 0,
        memberPrice: Number(form.memberPrice) || 0,
      };
      return editing ? classesApi.update(editing.id, payload) : classesApi.create(payload);
    },
    onSuccess: () => { toast.success(editing ? 'Updated' : 'Class scheduled'); onSaved(); },
    onError: (e: any) => toast.error(e?.response?.data?.message || 'Failed'),
  });

  return (
    <section className="rounded-3xl bg-white dark:bg-neutral-900 border-2 border-blue-300 dark:border-blue-800 shadow-lg overflow-hidden">
      <div className="px-5 py-3 border-b bg-blue-50 dark:bg-blue-950/30 flex items-center justify-between">
        <h3 className="font-extrabold">{editing ? 'Edit Class' : 'Schedule New Class'}</h3>
        <button onClick={onClose} className="h-8 w-8 rounded-lg hover:bg-white flex items-center justify-center">
          <X className="h-4 w-4" />
        </button>
      </div>
      <div className="p-5 space-y-4 max-h-[85vh] overflow-y-auto">
        <div className="grid sm:grid-cols-2 gap-3">
          <input autoFocus value={form.name} onChange={(e) => setForm({ ...form, name: e.target.value })} placeholder="Class name *" className="h-11 rounded-xl border-2 border-slate-200 dark:border-neutral-700 bg-white dark:bg-neutral-800 px-3 text-sm font-bold focus:outline-none focus:border-blue-500" />
          <select value={form.classType} onChange={(e) => setForm({ ...form, classType: e.target.value })} className="h-11 rounded-xl border-2 border-slate-200 dark:border-neutral-700 bg-white dark:bg-neutral-800 px-3 text-sm font-bold focus:outline-none focus:border-blue-500">
            {CLASS_TYPES.map((t) => <option key={t.value} value={t.value}>{t.emoji} {t.label}</option>)}
          </select>
        </div>

        <textarea rows={2} value={form.description} onChange={(e) => setForm({ ...form, description: e.target.value })} placeholder="Description..." className="w-full rounded-xl border-2 border-slate-200 dark:border-neutral-700 bg-white dark:bg-neutral-800 px-3 py-2 text-sm font-semibold focus:outline-none focus:border-blue-500 resize-none" />

        <div>
          <label className="text-[10px] uppercase font-extrabold text-slate-600 mb-1 block">Trainer</label>
          <select value={form.trainerId} onChange={(e) => setForm({ ...form, trainerId: e.target.value })} className="h-11 w-full rounded-xl border-2 border-slate-200 dark:border-neutral-700 bg-white dark:bg-neutral-800 px-3 text-sm font-bold focus:outline-none focus:border-blue-500">
            <option value="">-- Select trainer --</option>
            {trainers.map((t: any) => {
              const nm = t.staff ? ((t.staff.firstName || '') + ' ' + (t.staff.lastName || '')).trim() : '';
              return <option key={t.id} value={t.id}>{nm} ({t.role})</option>;
            })}
          </select>
        </div>

        <div className="grid sm:grid-cols-3 gap-3">
          <div>
            <label className="text-[10px] uppercase font-extrabold text-slate-600 mb-1 block">Date *</label>
            <input type="date" value={form.scheduledDate} onChange={(e) => setForm({ ...form, scheduledDate: e.target.value })} className="h-11 w-full rounded-xl border-2 border-slate-200 dark:border-neutral-700 bg-white dark:bg-neutral-800 px-3 text-sm font-bold focus:outline-none focus:border-blue-500" />
          </div>
          <div>
            <label className="text-[10px] uppercase font-extrabold text-slate-600 mb-1 block">Time *</label>
            <input type="time" value={form.scheduledTime} onChange={(e) => setForm({ ...form, scheduledTime: e.target.value })} className="h-11 w-full rounded-xl border-2 border-slate-200 dark:border-neutral-700 bg-white dark:bg-neutral-800 px-3 text-sm font-bold focus:outline-none focus:border-blue-500" />
          </div>
          <div>
            <label className="text-[10px] uppercase font-extrabold text-slate-600 mb-1 block">Duration (min)</label>
            <input type="number" value={form.durationMinutes} onChange={(e) => setForm({ ...form, durationMinutes: e.target.value })} className="h-11 w-full rounded-xl border-2 border-slate-200 dark:border-neutral-700 bg-white dark:bg-neutral-800 px-3 text-sm font-extrabold tabular-nums focus:outline-none focus:border-blue-500" />
          </div>
        </div>

        <div className="grid sm:grid-cols-2 gap-3">
          <div>
            <label className="text-[10px] uppercase font-extrabold text-slate-600 mb-1 block">Max Participants</label>
            <input type="number" value={form.maxParticipants} onChange={(e) => setForm({ ...form, maxParticipants: e.target.value })} className="h-11 w-full rounded-xl border-2 border-slate-200 dark:border-neutral-700 bg-white dark:bg-neutral-800 px-3 text-sm font-extrabold tabular-nums focus:outline-none focus:border-blue-500" />
          </div>
          <div>
            <label className="text-[10px] uppercase font-extrabold text-slate-600 mb-1 block">Min Participants</label>
            <input type="number" value={form.minParticipants} onChange={(e) => setForm({ ...form, minParticipants: e.target.value })} className="h-11 w-full rounded-xl border-2 border-slate-200 dark:border-neutral-700 bg-white dark:bg-neutral-800 px-3 text-sm font-extrabold tabular-nums focus:outline-none focus:border-blue-500" />
          </div>
        </div>

        <div className="grid sm:grid-cols-2 gap-3">
          <input value={form.location} onChange={(e) => setForm({ ...form, location: e.target.value })} placeholder="Location" className="h-11 rounded-xl border-2 border-slate-200 dark:border-neutral-700 bg-white dark:bg-neutral-800 px-3 text-sm font-bold focus:outline-none focus:border-blue-500" />
          <input value={form.roomName} onChange={(e) => setForm({ ...form, roomName: e.target.value })} placeholder="Room name" className="h-11 rounded-xl border-2 border-slate-200 dark:border-neutral-700 bg-white dark:bg-neutral-800 px-3 text-sm font-bold focus:outline-none focus:border-blue-500" />
        </div>

        <label className="flex items-center gap-2 cursor-pointer">
          <input type="checkbox" checked={form.isFree} onChange={(e) => setForm({ ...form, isFree: e.target.checked })} className="h-4 w-4 rounded" />
          <span className="text-sm font-extrabold">Free class</span>
        </label>

        {!form.isFree && (
          <div className="grid sm:grid-cols-2 gap-3">
            <div>
              <label className="text-[10px] uppercase font-extrabold text-emerald-700 mb-1 block">Member Price</label>
              <input type="number" value={form.memberPrice} onChange={(e) => setForm({ ...form, memberPrice: e.target.value })} className="h-11 w-full rounded-xl border-2 border-emerald-300 bg-emerald-50 dark:bg-emerald-950/30 px-3 text-sm font-extrabold tabular-nums focus:outline-none focus:border-emerald-500" />
            </div>
            <div>
              <label className="text-[10px] uppercase font-extrabold text-amber-700 mb-1 block">Drop-in Price</label>
              <input type="number" value={form.dropInPrice} onChange={(e) => setForm({ ...form, dropInPrice: e.target.value })} className="h-11 w-full rounded-xl border-2 border-amber-300 bg-amber-50 dark:bg-amber-950/30 px-3 text-sm font-extrabold tabular-nums focus:outline-none focus:border-amber-500" />
            </div>
          </div>
        )}

        <div>
          <label className="text-[10px] uppercase font-extrabold text-slate-600 mb-1 block">Difficulty</label>
          <select value={form.difficultyLevel} onChange={(e) => setForm({ ...form, difficultyLevel: e.target.value })} className="h-11 w-full rounded-xl border-2 border-slate-200 dark:border-neutral-700 bg-white dark:bg-neutral-800 px-3 text-sm font-bold focus:outline-none focus:border-blue-500">
            <option>BEGINNER</option>
            <option>INTERMEDIATE</option>
            <option>ADVANCED</option>
            <option>ALL_LEVELS</option>
          </select>
        </div>

        <div>
          <label className="text-[10px] uppercase font-extrabold text-slate-600 mb-1 block">Image</label>
          {form.imageUrl ? (
            <div className="relative w-full aspect-video rounded-xl overflow-hidden border-2 border-slate-200">
              <img src={form.imageUrl} alt="" className="w-full h-full object-cover" />
              <button onClick={() => setForm({ ...form, imageUrl: '' })} className="absolute top-2 right-2 h-8 w-8 rounded bg-rose-600 text-white flex items-center justify-center">
                <X className="h-4 w-4" />
              </button>
            </div>
          ) : (
            <UploadDropzone onUploaded={(records) => {
              const first = Array.isArray(records) ? records[0] : records;
              const url = typeof first === 'string' ? first : (first as any)?.url;
              if (url) setForm({ ...form, imageUrl: url });
            }} />
          )}
        </div>

        <textarea rows={2} value={form.notes} onChange={(e) => setForm({ ...form, notes: e.target.value })} placeholder="Notes..." className="w-full rounded-xl border-2 border-slate-200 dark:border-neutral-700 bg-white dark:bg-neutral-800 px-3 py-2 text-sm font-semibold focus:outline-none focus:border-blue-500 resize-none" />

        <div className="flex gap-2 pt-2 border-t border-slate-100 dark:border-neutral-800">
          <Button variant="secondary" className="flex-1" onClick={onClose}>Cancel</Button>
          <Button className="flex-1 bg-gradient-to-r from-blue-600 to-cyan-700" onClick={() => saveMutation.mutate()} loading={saveMutation.isPending} disabled={!form.name}>
            <Save className="h-4 w-4" />
            {editing ? 'Update' : 'Schedule'}
          </Button>
        </div>
      </div>
    </section>
  );
}
