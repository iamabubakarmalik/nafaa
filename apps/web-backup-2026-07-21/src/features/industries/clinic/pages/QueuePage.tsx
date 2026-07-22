import { useState } from 'react';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { Link } from 'react-router-dom';
import {
  Timer, RefreshCw, Sparkles, User, ArrowRight, CheckCircle2, Play,
  Clock, Zap, Video, Home,
} from 'lucide-react';
import { appointmentsApi } from '../api/appointments.api';
import { doctorsApi } from '../api/doctors.api';
import { Button } from '@/components/ui/Button';
import { toast } from 'sonner';
import { format, differenceInYears } from 'date-fns';

export default function QueuePage() {
  const queryClient = useQueryClient();
  const [selectedDoctorId, setSelectedDoctorId] = useState<string>('');
  const [selectedDate, setSelectedDate] = useState<string>(new Date().toISOString().split('T')[0]);

  const { data: doctors = [] } = useQuery({
    queryKey: ['doctors-for-queue'],
    queryFn: () => doctorsApi.list({ active: true }),
  });

  const { data: queue = [], isLoading, refetch, isRefetching } = useQuery({
    queryKey: ['clinic-queue', selectedDoctorId, selectedDate],
    queryFn: () => appointmentsApi.queue(selectedDoctorId, selectedDate),
    enabled: !!selectedDoctorId,
    refetchInterval: 15_000,
  });

  const statusMutation = useMutation({
    mutationFn: ({ id, status }: { id: string; status: string }) => appointmentsApi.updateStatus(id, status),
    onSuccess: () => { toast.success('Status updated'); queryClient.invalidateQueries({ queryKey: ['clinic-queue'] }); },
  });

  const inConsultation = queue.find((q) => q.status === 'IN_CONSULTATION');
  const waiting = queue.filter((q) => ['CONFIRMED', 'ARRIVED'].includes(q.status));
  const completed = queue.filter((q) => q.status === 'COMPLETED');

  return (
    <div className="space-y-6">
      <section className="relative overflow-hidden rounded-3xl bg-gradient-to-br from-slate-950 via-orange-900 to-red-700 text-white p-6 sm:p-8 shadow-2xl">
        <div className="absolute -top-20 -right-20 h-72 w-72 rounded-full bg-orange-400/20 blur-3xl" />
        <div className="relative flex flex-col lg:flex-row lg:items-center lg:justify-between gap-5">
          <div>
            <div className="inline-flex items-center gap-2 rounded-full bg-white/15 backdrop-blur px-3 py-1 text-xs font-extrabold border border-white/20">
              <Timer className="h-3.5 w-3.5 text-amber-300" />
              Live Queue
            </div>
            <h1 className="mt-3 text-3xl sm:text-4xl font-extrabold leading-tight">⏰ Today's Queue</h1>
            <p className="mt-2 text-sm text-white/80 font-semibold">Real-time patient queue management</p>
          </div>
          <button onClick={() => refetch()} disabled={isRefetching} className="inline-flex items-center gap-2 rounded-xl bg-white/15 hover:bg-white/25 px-4 py-2.5 text-sm font-bold backdrop-blur border border-white/20">
            <RefreshCw className={'h-4 w-4 ' + (isRefetching ? 'animate-spin' : '')} />
            Refresh
          </button>
        </div>
      </section>

      <section className="rounded-3xl bg-white dark:bg-neutral-900 border border-slate-200 dark:border-neutral-800 shadow-sm p-4 space-y-3">
        <div className="grid sm:grid-cols-2 gap-3">
          <select value={selectedDoctorId} onChange={(e) => setSelectedDoctorId(e.target.value)} className="h-11 rounded-xl border-2 border-slate-200 dark:border-neutral-700 bg-white dark:bg-neutral-800 px-3 text-sm font-bold focus:outline-none focus:border-orange-500">
            <option value="">-- Select Doctor --</option>
            {doctors.map((d) => (
              <option key={d.id} value={d.id}>{d.title} {d.fullName} • {d.specialties[0]?.replace(/_/g, ' ')}</option>
            ))}
          </select>
          <input type="date" value={selectedDate} onChange={(e) => setSelectedDate(e.target.value)} className="h-11 rounded-xl border-2 border-slate-200 dark:border-neutral-700 bg-white dark:bg-neutral-800 px-3 text-sm font-bold focus:outline-none focus:border-orange-500" />
        </div>
      </section>

      {!selectedDoctorId ? (
        <div className="rounded-3xl bg-white dark:bg-neutral-900 border-2 border-dashed border-slate-200 dark:border-neutral-800 p-12 text-center">
          <Timer className="h-16 w-16 text-slate-400 mx-auto mb-3" />
          <p className="font-extrabold text-slate-700">Select a doctor to view queue</p>
        </div>
      ) : (
        <>
          {/* Now Serving */}
          {inConsultation && (
            <section className="rounded-3xl bg-gradient-to-br from-amber-500 to-orange-600 text-white p-6 shadow-xl">
              <div className="flex items-center justify-between gap-4 flex-wrap">
                <div>
                  <div className="text-[10px] uppercase tracking-wider font-extrabold text-white/70">Now Serving</div>
                  <div className="text-6xl font-extrabold tabular-nums animate-pulse">#{inConsultation.tokenNumber || '?'}</div>
                  <div className="mt-2 flex items-center gap-2 text-sm font-extrabold">
                    <User className="h-4 w-4" />
                    {inConsultation.patient?.fullName || '—'}
                  </div>
                </div>
                <Button onClick={() => statusMutation.mutate({ id: inConsultation.id, status: 'COMPLETED' })} className="bg-white text-orange-700 hover:bg-slate-100 shadow-lg">
                  <CheckCircle2 className="h-4 w-4" />
                  Mark Complete
                </Button>
              </div>
            </section>
          )}

          {/* Waiting Queue */}
          <div className="grid lg:grid-cols-2 gap-4">
            <div className="rounded-3xl bg-white dark:bg-neutral-900 border-2 border-blue-200 dark:border-blue-800 shadow-sm overflow-hidden">
              <div className="px-5 py-3 bg-blue-50 dark:bg-blue-950/30 border-b border-blue-100">
                <h3 className="font-extrabold text-blue-900 flex items-center gap-2">
                  <Clock className="h-4 w-4" />
                  Waiting ({waiting.length})
                </h3>
              </div>
              <div className="divide-y divide-slate-100 dark:divide-neutral-800 max-h-96 overflow-y-auto">
                {waiting.length === 0 ? (
                  <div className="py-12 text-center text-sm text-slate-500 font-semibold">No patients waiting</div>
                ) : (
                  waiting.map((q) => {
                    const age = q.patient?.dateOfBirth ? differenceInYears(new Date(), new Date(q.patient.dateOfBirth)) : null;
                    return (
                      <div key={q.id} className="px-5 py-3 flex items-center gap-3">
                        <div className={
                          'shrink-0 h-12 w-12 rounded-2xl text-white flex items-center justify-center font-extrabold ' +
                          (q.isEmergency ? 'bg-gradient-to-br from-red-500 to-rose-600' : 'bg-gradient-to-br from-blue-500 to-cyan-600')
                        }>
                          #{q.tokenNumber || '?'}
                        </div>
                        <div className="flex-1 min-w-0">
                          <div className="flex items-center gap-2 flex-wrap">
                            <span className="font-extrabold text-sm truncate">{q.patient?.fullName}</span>
                            {q.isEmergency && <span className="px-1.5 py-0.5 rounded bg-red-500 text-white text-[9px] font-extrabold uppercase">EMERGENCY</span>}
                            {q.status === 'ARRIVED' && <span className="px-1.5 py-0.5 rounded bg-cyan-500 text-white text-[9px] font-extrabold uppercase">ARRIVED</span>}
                          </div>
                          <div className="text-[10px] text-slate-500 font-bold">
                            {age !== null && age + 'y'} {q.patient?.gender && '• ' + q.patient.gender}
                            {q.chiefComplaint && ' • ' + q.chiefComplaint.slice(0, 40)}
                          </div>
                          <div className="text-[10px] font-mono font-bold text-blue-600">{q.patient?.mrn}</div>
                        </div>
                        <div className="flex flex-col gap-1 shrink-0">
                          {q.status === 'CONFIRMED' && (
                            <Button size="sm" onClick={() => statusMutation.mutate({ id: q.id, status: 'ARRIVED' })} className="bg-cyan-600 text-white text-[10px] px-2 py-1">
                              <User className="h-3 w-3" />
                              Arrived
                            </Button>
                          )}
                          {q.status === 'ARRIVED' && (
                            <Button size="sm" onClick={() => statusMutation.mutate({ id: q.id, status: 'IN_CONSULTATION' })} className="bg-amber-600 text-white text-[10px] px-2 py-1">
                              <Play className="h-3 w-3" />
                              Start
                            </Button>
                          )}
                        </div>
                      </div>
                    );
                  })
                )}
              </div>
            </div>

            <div className="rounded-3xl bg-white dark:bg-neutral-900 border-2 border-emerald-200 dark:border-emerald-800 shadow-sm overflow-hidden">
              <div className="px-5 py-3 bg-emerald-50 dark:bg-emerald-950/30 border-b border-emerald-100">
                <h3 className="font-extrabold text-emerald-900 flex items-center gap-2">
                  <CheckCircle2 className="h-4 w-4" />
                  Completed ({completed.length})
                </h3>
              </div>
              <div className="divide-y divide-slate-100 dark:divide-neutral-800 max-h-96 overflow-y-auto">
                {completed.length === 0 ? (
                  <div className="py-12 text-center text-sm text-slate-500 font-semibold">No consultations completed yet</div>
                ) : (
                  completed.map((q) => (
                    <Link key={q.id} to={'/clinic/appointments/' + q.id} className="px-5 py-3 flex items-center gap-3 hover:bg-emerald-50 dark:hover:bg-emerald-950/20">
                      <div className="shrink-0 h-10 w-10 rounded-xl bg-emerald-100 dark:bg-emerald-950/40 text-emerald-700 flex items-center justify-center font-extrabold text-sm">
                        #{q.tokenNumber || '?'}
                      </div>
                      <div className="flex-1 min-w-0">
                        <div className="font-extrabold text-sm truncate">{q.patient?.fullName}</div>
                        <div className="text-[10px] text-slate-500 font-bold">
                          {q.consultationEnd && format(new Date(q.consultationEnd), 'HH:mm')}
                        </div>
                      </div>
                      <ArrowRight className="h-4 w-4 text-emerald-600" />
                    </Link>
                  ))
                )}
              </div>
            </div>
          </div>
        </>
      )}
    </div>
  );
}
