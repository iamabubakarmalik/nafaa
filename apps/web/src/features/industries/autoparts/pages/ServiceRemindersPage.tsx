import { useState } from 'react';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { Bell, RefreshCw, Sparkles, CheckCircle2, AlertCircle, Clock, Car } from 'lucide-react';
import { serviceRemindersApi } from '../api/service-reminders.api';
import { Button } from '@/components/ui/Button';
import { toast } from 'sonner';
import { format, differenceInDays } from 'date-fns';

export default function ServiceRemindersPage() {
  const queryClient = useQueryClient();
  const [filter, setFilter] = useState<string>('upcoming');

  const { data: reminders = [], isLoading, refetch, isRefetching } = useQuery({
    queryKey: ['service-reminders', filter],
    queryFn: () => serviceRemindersApi.list({
      upcoming: filter === 'upcoming',
      overdue: filter === 'overdue',
      status: filter === 'all' ? undefined : (filter === 'upcoming' || filter === 'overdue' ? undefined : filter),
    }),
  });

  const statusMutation = useMutation({
    mutationFn: ({ id, status }: any) => serviceRemindersApi.updateStatus(id, status),
    onSuccess: () => { toast.success('Updated'); queryClient.invalidateQueries({ queryKey: ['service-reminders'] }); },
  });

  return (
    <div className="space-y-6">
      <section className="relative overflow-hidden rounded-3xl bg-gradient-to-br from-slate-950 via-cyan-900 to-blue-700 text-white p-6 sm:p-8 shadow-2xl">
        <div className="absolute -top-20 -right-20 h-72 w-72 rounded-full bg-cyan-400/20 blur-3xl" />
        <div className="relative flex flex-col lg:flex-row lg:items-center lg:justify-between gap-5">
          <div>
            <div className="inline-flex items-center gap-2 rounded-full bg-white/15 backdrop-blur px-3 py-1 text-xs font-extrabold border border-white/20">
              <Sparkles className="h-3.5 w-3.5 text-amber-300" />
              Service Alerts
            </div>
            <h1 className="mt-3 text-3xl sm:text-4xl font-extrabold leading-tight">🔔 Service Reminders</h1>
            <p className="mt-2 text-sm text-white/80 font-semibold">Insurance, token tax, fitness alerts</p>
          </div>
          <button onClick={() => refetch()} disabled={isRefetching} className="inline-flex items-center gap-2 rounded-xl bg-white/15 hover:bg-white/25 px-4 py-2.5 text-sm font-bold backdrop-blur border border-white/20">
            <RefreshCw className={'h-4 w-4 ' + (isRefetching ? 'animate-spin' : '')} />
            Refresh
          </button>
        </div>
      </section>

      <div className="flex gap-1.5 overflow-x-auto pb-1">
        {[
          { v: 'upcoming', label: '📅 Upcoming' },
          { v: 'overdue', label: '⚠️ Overdue' },
          { v: 'all', label: 'All' },
          { v: 'PENDING', label: 'Pending' },
          { v: 'SENT', label: 'Sent' },
          { v: 'DONE', label: 'Done' },
        ].map((f) => (
          <button key={f.v} onClick={() => setFilter(f.v)} className={
            'shrink-0 px-3 py-1.5 rounded-lg text-xs font-extrabold ' +
            (filter === f.v ? 'bg-cyan-600 text-white shadow' : 'bg-slate-100 dark:bg-neutral-800 text-slate-700')
          }>{f.label}</button>
        ))}
      </div>

      {isLoading ? (
        <div className="grid gap-3">
          {[1, 2, 3].map((i) => <div key={i} className="h-24 rounded-2xl bg-slate-100 dark:bg-neutral-800 animate-pulse" />)}
        </div>
      ) : reminders.length === 0 ? (
        <div className="rounded-3xl bg-white dark:bg-neutral-900 border-2 border-dashed p-12 text-center">
          <CheckCircle2 className="h-16 w-16 text-emerald-400 mx-auto mb-3" />
          <p className="font-extrabold text-slate-700">No reminders</p>
        </div>
      ) : (
        <section className="grid gap-3">
          {reminders.map((r) => {
            const daysLeft = r.dueDate ? differenceInDays(new Date(r.dueDate), new Date()) : null;
            const isOverdue = daysLeft !== null && daysLeft < 0;
            const isSoon = daysLeft !== null && daysLeft >= 0 && daysLeft <= 7;
            return (
              <div key={r.id} className={
                'rounded-2xl bg-white dark:bg-neutral-900 border-2 shadow-sm p-4 ' +
                (isOverdue ? 'border-rose-400 ring-2 ring-rose-100' : isSoon ? 'border-amber-400 ring-2 ring-amber-100' : 'border-slate-200 dark:border-neutral-800')
              }>
                <div className="flex items-start justify-between gap-3 flex-wrap">
                  <div className="flex items-start gap-3 flex-1 min-w-0">
                    <div className={
                      'h-10 w-10 rounded-xl flex items-center justify-center shrink-0 text-white ' +
                      (isOverdue ? 'bg-rose-500' : isSoon ? 'bg-amber-500' : 'bg-cyan-500')
                    }>
                      <Bell className="h-5 w-5" />
                    </div>
                    <div className="flex-1 min-w-0">
                      <div className="flex items-center gap-2 flex-wrap">
                        <span className="font-extrabold text-slate-900 dark:text-white">{r.title}</span>
                        <span className="px-2 py-0.5 rounded bg-slate-100 text-slate-700 text-[9px] font-extrabold uppercase">{r.reminderType}</span>
                        <span className={
                          'px-2 py-0.5 rounded text-[9px] font-extrabold uppercase text-white ' +
                          (r.status === 'DONE' ? 'bg-emerald-500' : r.status === 'PENDING' ? 'bg-blue-500' : 'bg-amber-500')
                        }>{r.status}</span>
                      </div>
                      {r.description && <p className="mt-1 text-sm text-slate-600">{r.description}</p>}
                      <div className="mt-1 flex items-center gap-3 text-xs text-slate-500 font-bold flex-wrap">
                        {r.dueDate && (
                          <span className={'inline-flex items-center gap-1 ' + (isOverdue ? 'text-rose-700 font-extrabold' : isSoon ? 'text-amber-700 font-extrabold' : '')}>
                            <Clock className="h-3 w-3" />
                            {format(new Date(r.dueDate), 'dd MMM yyyy')}
                            {daysLeft !== null && ' (' + (isOverdue ? Math.abs(daysLeft) + 'd overdue' : daysLeft + 'd left') + ')'}
                          </span>
                        )}
                      </div>
                    </div>
                  </div>
                  <div className="flex gap-1 shrink-0">
                    {r.status === 'PENDING' && (
                      <Button size="sm" onClick={() => statusMutation.mutate({ id: r.id, status: 'SENT' })}>
                        Mark Sent
                      </Button>
                    )}
                    {(r.status === 'PENDING' || r.status === 'SENT') && (
                      <Button size="sm" onClick={() => statusMutation.mutate({ id: r.id, status: 'DONE' })} className="bg-emerald-600 text-white">
                        <CheckCircle2 className="h-3.5 w-3.5" />
                        Done
                      </Button>
                    )}
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
