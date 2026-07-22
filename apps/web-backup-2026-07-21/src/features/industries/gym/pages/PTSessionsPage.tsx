import { useState } from 'react';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import {
  Flame, Plus, X, Save, RefreshCw, Sparkles, User, Clock, Star,
  DollarSign, Zap, CheckCircle2, Ban, Award,
} from 'lucide-react';
import { ptApi } from '../api/personal-training.api';
import { gymMembersApi } from '../api/members.api';
import { trainersApi } from '../api/trainers.api';
import { formatPKR } from '@/lib/format';
import { Button } from '@/components/ui/Button';
import { toast } from 'sonner';
import { format, differenceInMinutes } from 'date-fns';

const STATUS_COLORS: Record<string, string> = {
  SCHEDULED: 'bg-blue-500', IN_PROGRESS: 'bg-amber-500',
  COMPLETED: 'bg-emerald-600', CANCELLED: 'bg-rose-500', NO_SHOW: 'bg-orange-500',
};

export default function PTSessionsPage() {
  const queryClient = useQueryClient();
  const [statusFilter, setStatusFilter] = useState<string>('SCHEDULED');
  const [showForm, setShowForm] = useState(false);

  const { data: sessions = [], isLoading, refetch, isRefetching } = useQuery({
    queryKey: ['pt-sessions', statusFilter],
    queryFn: () => ptApi.list({ status: statusFilter === 'all' ? undefined : statusFilter }),
    refetchInterval: 60_000,
  });

  const statusMutation = useMutation({
    mutationFn: ({ id, status }: any) => ptApi.updateStatus(id, status),
    onSuccess: () => { toast.success('Status updated'); queryClient.invalidateQueries({ queryKey: ['pt-sessions'] }); },
  });

  return (
    <div className="space-y-6">
      <section className="relative overflow-hidden rounded-3xl bg-gradient-to-br from-slate-950 via-rose-900 to-red-700 text-white p-6 sm:p-8 shadow-2xl">
        <div className="absolute -top-20 -right-20 h-72 w-72 rounded-full bg-rose-400/20 blur-3xl" />
        <div className="relative flex flex-col lg:flex-row lg:items-center lg:justify-between gap-5">
          <div>
            <div className="inline-flex items-center gap-2 rounded-full bg-white/15 backdrop-blur px-3 py-1 text-xs font-extrabold border border-white/20">
              <Flame className="h-3.5 w-3.5 text-amber-300" />
              1-on-1 Training
            </div>
            <h1 className="mt-3 text-3xl sm:text-4xl font-extrabold leading-tight">🔥 PT Sessions</h1>
            <p className="mt-2 text-sm text-white/80 font-semibold">Personal training with commission tracking</p>
          </div>
          <div className="flex items-center gap-2 flex-wrap">
            <button onClick={() => refetch()} disabled={isRefetching} className="inline-flex items-center gap-2 rounded-xl bg-white/15 hover:bg-white/25 px-4 py-2.5 text-sm font-bold backdrop-blur border border-white/20">
              <RefreshCw className={'h-4 w-4 ' + (isRefetching ? 'animate-spin' : '')} />
              Refresh
            </button>
            <Button className="bg-white text-slate-900 hover:bg-slate-100" onClick={() => setShowForm(true)}>
              <Plus className="h-4 w-4" />
              Book Session
            </Button>
          </div>
        </div>
      </section>

      <div className="flex gap-1.5 flex-wrap">
        {['SCHEDULED', 'all', 'IN_PROGRESS', 'COMPLETED', 'CANCELLED', 'NO_SHOW'].map((s) => (
          <button key={s} onClick={() => setStatusFilter(s)} className={
            'px-3 py-1.5 rounded-lg text-xs font-extrabold ' +
            (statusFilter === s ? 'bg-rose-600 text-white shadow' : 'bg-slate-100 dark:bg-neutral-800 text-slate-700')
          }>{s === 'all' ? 'All' : s.replace('_', ' ')}</button>
        ))}
      </div>

      {showForm && (
        <PTForm
          onClose={() => setShowForm(false)}
          onSaved={() => { setShowForm(false); queryClient.invalidateQueries({ queryKey: ['pt-sessions'] }); }}
        />
      )}

      {isLoading ? (
        <div className="grid gap-3">{[1, 2, 3].map((i) => <div key={i} className="h-32 rounded-2xl bg-slate-100 dark:bg-neutral-800 animate-pulse" />)}</div>
      ) : sessions.length === 0 ? (
        <div className="rounded-3xl bg-white dark:bg-neutral-900 border-2 border-dashed p-12 text-center">
          <Flame className="h-16 w-16 text-slate-400 mx-auto mb-3" />
          <p className="font-extrabold text-slate-700">No sessions</p>
        </div>
      ) : (
        <section className="grid gap-3">
          {sessions.map((s) => {
            const remaining = s.price - s.paidAmount;
            const trainerName = s.trainer?.staff ? ((s.trainer.staff.firstName || '') + ' ' + (s.trainer.staff.lastName || '')).trim() : 'Trainer';
            return (
              <div key={s.id} className="rounded-2xl bg-white dark:bg-neutral-900 border-2 border-slate-200 dark:border-neutral-800 shadow-sm p-4 space-y-3">
                <div className="flex items-start justify-between gap-3 flex-wrap">
                  <div className="flex items-start gap-3 min-w-0 flex-1">
                    <div className="h-12 w-12 rounded-2xl bg-gradient-to-br from-rose-500 to-red-600 text-white flex items-center justify-center shadow shrink-0">
                      <Flame className="h-6 w-6" />
                    </div>
                    <div className="min-w-0 flex-1">
                      <div className="flex items-center gap-2 flex-wrap">
                        <span className="font-extrabold text-slate-900">{s.sessionNumber}</span>
                        <span className={'px-2 py-0.5 rounded-full text-[9px] font-extrabold uppercase text-white ' + STATUS_COLORS[s.status]}>
                          {s.status.replace('_', ' ')}
                        </span>
                        {s.memberRating && (
                          <span className="px-2 py-0.5 rounded bg-amber-100 text-amber-700 text-[9px] font-extrabold inline-flex items-center gap-0.5">
                            <Star className="h-2 w-2 fill-current" />
                            {s.memberRating}
                          </span>
                        )}
                      </div>
                      <div className="text-sm text-slate-700 font-bold mt-1">
                        Trainer: <span className="text-violet-700">{trainerName}</span>
                      </div>
                      <div className="text-xs text-slate-500 font-semibold">
                        {format(new Date(s.scheduledStart), 'dd MMM, HH:mm')} • {s.durationMinutes}min
                      </div>
                      {s.focusArea && (
                        <div className="text-xs font-bold text-rose-700 mt-0.5">Focus: {s.focusArea}</div>
                      )}
                    </div>
                  </div>
                  <div className="text-right shrink-0">
                    <div className="text-lg font-extrabold text-emerald-700 tabular-nums">{formatPKR(s.price)}</div>
                    {s.commissionAmount > 0 && (
                      <div className="text-[10px] font-extrabold text-amber-700 inline-flex items-center gap-0.5">
                        <Award className="h-2.5 w-2.5" />
                        Comm: {formatPKR(s.commissionAmount)}
                      </div>
                    )}
                    {remaining > 0 && <div className="text-[10px] font-extrabold text-amber-700">Due: {formatPKR(remaining)}</div>}
                  </div>
                </div>

                {s.trainerNotes && (
                  <div className="rounded-lg bg-slate-50 p-2 text-xs italic text-slate-700">
                    📝 {s.trainerNotes}
                  </div>
                )}

                {s.status === 'SCHEDULED' && (
                  <div className="flex gap-1 pt-2 border-t border-slate-100 dark:border-neutral-800">
                    <button onClick={() => statusMutation.mutate({ id: s.id, status: 'IN_PROGRESS' })} className="flex-1 h-9 rounded-lg bg-amber-100 hover:bg-amber-200 text-amber-700 text-xs font-extrabold">
                      <Zap className="h-3 w-3 inline mr-1" />
                      Start
                    </button>
                    <button onClick={() => statusMutation.mutate({ id: s.id, status: 'CANCELLED' })} className="h-9 w-9 rounded-lg bg-rose-50 hover:bg-rose-100 text-rose-600 flex items-center justify-center">
                      <Ban className="h-3.5 w-3.5" />
                    </button>
                  </div>
                )}
                {s.status === 'IN_PROGRESS' && (
                  <button onClick={() => statusMutation.mutate({ id: s.id, status: 'COMPLETED' })} className="w-full h-9 rounded-lg bg-emerald-100 hover:bg-emerald-200 text-emerald-700 text-xs font-extrabold">
                    <CheckCircle2 className="h-3 w-3 inline mr-1" />
                    Complete
                  </button>
                )}
              </div>
            );
          })}
        </section>
      )}
    </div>
  );
}

function PTForm({ onClose, onSaved }: any) {
  const [form, setForm] = useState<any>({
    memberId: '',
    trainerId: '',
    scheduledDate: new Date().toISOString().split('T')[0],
    scheduledTime: '18:00',
    durationMinutes: 60,
    focusArea: '',
    price: 0,
  });
  const [memberSearch, setMemberSearch] = useState('');
  const [showMemberPicker, setShowMemberPicker] = useState(false);
  const [selectedMember, setSelectedMember] = useState<any>(null);

  const { data: members = [] } = useQuery({
    queryKey: ['members-for-pt', memberSearch],
    queryFn: () => gymMembersApi.list({ search: memberSearch || undefined, status: 'ACTIVE' }),
    enabled: showMemberPicker,
  });

  const { data: trainers = [] } = useQuery({
    queryKey: ['trainers-for-pt'],
    queryFn: () => trainersApi.list({ available: true }),
  });

  const saveMutation = useMutation({
    mutationFn: () => {
      const start = new Date(form.scheduledDate + 'T' + form.scheduledTime);
      const end = new Date(start.getTime() + form.durationMinutes * 60 * 1000);
      return ptApi.create({
        memberId: form.memberId,
        trainerId: form.trainerId,
        scheduledStart: start.toISOString(),
        scheduledEnd: end.toISOString(),
        durationMinutes: Number(form.durationMinutes),
        focusArea: form.focusArea || undefined,
        price: Number(form.price) || undefined,
      });
    },
    onSuccess: () => { toast.success('Session booked'); onSaved(); },
    onError: (e: any) => toast.error(e?.response?.data?.message || 'Failed'),
  });

  return (
    <section className="rounded-3xl bg-white dark:bg-neutral-900 border-2 border-rose-300 dark:border-rose-800 shadow-lg overflow-hidden">
      <div className="px-5 py-3 border-b bg-rose-50 dark:bg-rose-950/30 flex items-center justify-between">
        <h3 className="font-extrabold">Book PT Session</h3>
        <button onClick={onClose} className="h-8 w-8 rounded-lg hover:bg-white flex items-center justify-center">
          <X className="h-4 w-4" />
        </button>
      </div>
      <div className="p-5 space-y-4 max-h-[85vh] overflow-y-auto">
        {selectedMember ? (
          <div className="rounded-xl bg-rose-50 border-2 border-rose-200 p-3 flex items-center gap-3">
            <User className="h-5 w-5 text-rose-600" />
            <div className="flex-1">
              <div className="font-extrabold">{selectedMember.customer?.name}</div>
              <div className="text-xs text-slate-600 font-mono font-bold">{selectedMember.memberNumber}</div>
            </div>
            <button onClick={() => { setSelectedMember(null); setForm({ ...form, memberId: '' }); }} className="text-xs font-extrabold text-rose-600 hover:underline">Change</button>
          </div>
        ) : (
          <div>
            <label className="text-[10px] uppercase font-extrabold mb-1 block">Select Member *</label>
            <input value={memberSearch} onChange={(e) => { setMemberSearch(e.target.value); setShowMemberPicker(true); }} placeholder="Search member..." className="h-11 w-full rounded-xl border-2 border-rose-200 bg-rose-50 dark:bg-rose-950/30 px-3 text-sm font-bold focus:outline-none focus:border-rose-500" />
            {showMemberPicker && (
              <div className="mt-2 max-h-52 overflow-y-auto space-y-1 rounded-xl border border-slate-200 p-1">
                {members.map((m: any) => (
                  <button key={m.id} onClick={() => { setSelectedMember(m); setForm({ ...form, memberId: m.id }); setShowMemberPicker(false); }} className="w-full px-3 py-2 flex items-center gap-2 rounded hover:bg-rose-50 text-left">
                    <User className="h-3.5 w-3.5 text-slate-400" />
                    <span className="text-sm font-extrabold flex-1 truncate">{m.customer?.name}</span>
                  </button>
                ))}
              </div>
            )}
          </div>
        )}

        <div>
          <label className="text-[10px] uppercase font-extrabold text-slate-600 mb-1 block">Trainer *</label>
          <select value={form.trainerId} onChange={(e) => {
            const t = trainers.find((x: any) => x.id === e.target.value);
            setForm({ ...form, trainerId: e.target.value, price: t?.perSessionRate || 0 });
          }} className="h-11 w-full rounded-xl border-2 border-slate-200 dark:border-neutral-700 bg-white dark:bg-neutral-800 px-3 text-sm font-bold focus:outline-none focus:border-rose-500">
            <option value="">-- Select trainer --</option>
            {trainers.map((t: any) => {
              const nm = t.staff ? ((t.staff.firstName || '') + ' ' + (t.staff.lastName || '')).trim() : '';
              return <option key={t.id} value={t.id}>{nm} • {formatPKR(t.perSessionRate)}/session</option>;
            })}
          </select>
        </div>

        <div className="grid sm:grid-cols-3 gap-3">
          <div>
            <label className="text-[10px] uppercase font-extrabold text-slate-600 mb-1 block">Date *</label>
            <input type="date" value={form.scheduledDate} onChange={(e) => setForm({ ...form, scheduledDate: e.target.value })} className="h-11 w-full rounded-xl border-2 border-slate-200 dark:border-neutral-700 bg-white dark:bg-neutral-800 px-3 text-sm font-bold focus:outline-none focus:border-rose-500" />
          </div>
          <div>
            <label className="text-[10px] uppercase font-extrabold text-slate-600 mb-1 block">Time *</label>
            <input type="time" value={form.scheduledTime} onChange={(e) => setForm({ ...form, scheduledTime: e.target.value })} className="h-11 w-full rounded-xl border-2 border-slate-200 dark:border-neutral-700 bg-white dark:bg-neutral-800 px-3 text-sm font-bold focus:outline-none focus:border-rose-500" />
          </div>
          <div>
            <label className="text-[10px] uppercase font-extrabold text-slate-600 mb-1 block">Duration (min)</label>
            <input type="number" value={form.durationMinutes} onChange={(e) => setForm({ ...form, durationMinutes: e.target.value })} className="h-11 w-full rounded-xl border-2 border-slate-200 dark:border-neutral-700 bg-white dark:bg-neutral-800 px-3 text-sm font-extrabold tabular-nums focus:outline-none focus:border-rose-500" />
          </div>
        </div>

        <input value={form.focusArea} onChange={(e) => setForm({ ...form, focusArea: e.target.value })} placeholder="Focus area (chest & triceps, legs, cardio...)" className="h-11 w-full rounded-xl border-2 border-slate-200 dark:border-neutral-700 bg-white dark:bg-neutral-800 px-3 text-sm font-bold focus:outline-none focus:border-rose-500" />

        <div>
          <label className="text-[10px] uppercase font-extrabold text-emerald-700 mb-1 block">Price</label>
          <input type="number" value={form.price} onChange={(e) => setForm({ ...form, price: e.target.value })} className="h-14 w-full rounded-xl border-2 border-emerald-300 bg-emerald-50 dark:bg-emerald-950/30 px-4 text-2xl font-extrabold tabular-nums focus:outline-none focus:border-emerald-500" />
        </div>

        <div className="flex gap-2 pt-2 border-t border-slate-100 dark:border-neutral-800">
          <Button variant="secondary" className="flex-1" onClick={onClose}>Cancel</Button>
          <Button className="flex-1 bg-gradient-to-r from-rose-600 to-red-700" onClick={() => saveMutation.mutate()} loading={saveMutation.isPending} disabled={!form.memberId || !form.trainerId}>
            <Save className="h-4 w-4" />
            Book Session
          </Button>
        </div>
      </div>
    </section>
  );
}
