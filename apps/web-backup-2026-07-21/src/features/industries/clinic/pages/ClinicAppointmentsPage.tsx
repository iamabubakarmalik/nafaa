import { useState } from 'react';
import { useQuery } from '@tanstack/react-query';
import { Link } from 'react-router-dom';
import {
  Calendar, Plus, Search, RefreshCw, Sparkles, Clock, User,
  CheckCircle2, ArrowRight, Video, Home, Zap, Timer, AlertCircle,
} from 'lucide-react';
import { appointmentsApi, type AppointmentStatus } from '../api/appointments.api';
import { formatPKR } from '@/lib/format';
import { Button } from '@/components/ui/Button';
import { format, differenceInMinutes, isToday } from 'date-fns';

const STATUS_CONFIG: Record<AppointmentStatus, { label: string; color: string; icon: any }> = {
  SCHEDULED: { label: 'Scheduled', color: 'bg-slate-500', icon: Calendar },
  CONFIRMED: { label: 'Confirmed', color: 'bg-blue-500', icon: CheckCircle2 },
  ARRIVED: { label: 'Arrived', color: 'bg-cyan-500', icon: User },
  IN_CONSULTATION: { label: 'In Consultation', color: 'bg-amber-500', icon: Timer },
  COMPLETED: { label: 'Completed', color: 'bg-emerald-600', icon: CheckCircle2 },
  NO_SHOW: { label: 'No Show', color: 'bg-orange-600', icon: AlertCircle },
  CANCELLED: { label: 'Cancelled', color: 'bg-rose-500', icon: AlertCircle },
  RESCHEDULED: { label: 'Rescheduled', color: 'bg-violet-500', icon: Calendar },
};

export default function ClinicAppointmentsPage() {
  const [search, setSearch] = useState('');
  const [statusFilter, setStatusFilter] = useState<string>('upcoming');
  const [dateFilter, setDateFilter] = useState<string>('today');

  const getDateRange = () => {
    const now = new Date();
    const start = new Date(now);
    const end = new Date(now);
    if (dateFilter === 'today') { start.setHours(0,0,0,0); end.setHours(23,59,59,999); }
    else if (dateFilter === 'tomorrow') { start.setDate(start.getDate()+1); start.setHours(0,0,0,0); end.setDate(end.getDate()+1); end.setHours(23,59,59,999); }
    else if (dateFilter === 'week') { start.setHours(0,0,0,0); end.setDate(end.getDate()+7); }
    else if (dateFilter === 'month') { start.setHours(0,0,0,0); end.setDate(end.getDate()+30); }
    return { from: start.toISOString(), to: end.toISOString() };
  };

  const { data: appointments = [], isLoading, refetch, isRefetching } = useQuery({
    queryKey: ['clinic-appointments', statusFilter, dateFilter, search],
    queryFn: () => {
      const range = dateFilter === 'all' ? {} : getDateRange();
      return appointmentsApi.list({
        status: statusFilter === 'upcoming' || statusFilter === 'all' ? undefined : statusFilter,
        search: search.trim() || undefined,
        ...range,
      });
    },
    refetchInterval: 60_000,
  });

  const filtered = statusFilter === 'upcoming'
    ? appointments.filter((a) => ['SCHEDULED', 'CONFIRMED', 'ARRIVED', 'IN_CONSULTATION'].includes(a.status))
    : appointments;

  return (
    <div className="space-y-6">
      <section className="relative overflow-hidden rounded-3xl bg-gradient-to-br from-slate-950 via-blue-900 to-cyan-700 text-white p-6 sm:p-8 shadow-2xl">
        <div className="absolute -top-20 -right-20 h-72 w-72 rounded-full bg-blue-400/20 blur-3xl" />
        <div className="relative flex flex-col lg:flex-row lg:items-center lg:justify-between gap-5">
          <div>
            <div className="inline-flex items-center gap-2 rounded-full bg-white/15 backdrop-blur px-3 py-1 text-xs font-extrabold border border-white/20">
              <Sparkles className="h-3.5 w-3.5 text-amber-300" />
              Booking Manager
            </div>
            <h1 className="mt-3 text-3xl sm:text-4xl font-extrabold leading-tight">📅 Appointments</h1>
            <p className="mt-2 text-sm text-white/80 font-semibold">All appointments with token queue</p>
          </div>
          <div className="flex items-center gap-2 flex-wrap">
            <button onClick={() => refetch()} disabled={isRefetching} className="inline-flex items-center gap-2 rounded-xl bg-white/15 hover:bg-white/25 px-4 py-2.5 text-sm font-bold backdrop-blur border border-white/20">
              <RefreshCw className={'h-4 w-4 ' + (isRefetching ? 'animate-spin' : '')} />
              Refresh
            </button>
            <Link to="/clinic/appointments/new">
              <Button className="bg-white text-slate-900 hover:bg-slate-100">
                <Plus className="h-4 w-4" />
                New Appointment
              </Button>
            </Link>
          </div>
        </div>
      </section>

      <section className="rounded-3xl bg-white dark:bg-neutral-900 border border-slate-200 dark:border-neutral-800 shadow-sm p-4 space-y-3">
        <div className="relative">
          <Search className="h-4 w-4 text-slate-400 absolute left-3.5 top-1/2 -translate-y-1/2" />
          <input value={search} onChange={(e) => setSearch(e.target.value)} placeholder="Search appointment #, complaint..." className="h-11 w-full rounded-xl border-2 border-slate-200 dark:border-neutral-700 bg-white dark:bg-neutral-800 pl-10 pr-3 text-sm font-semibold focus:outline-none focus:border-blue-500" />
        </div>
        <div className="flex gap-1.5 overflow-x-auto pb-1">
          {[
            { v: 'today', label: '📅 Today' },
            { v: 'tomorrow', label: 'Tomorrow' },
            { v: 'week', label: 'Next 7 days' },
            { v: 'month', label: 'Next 30 days' },
            { v: 'all', label: 'All' },
          ].map((d) => (
            <button key={d.v} onClick={() => setDateFilter(d.v)} className={
              'shrink-0 px-3 py-1.5 rounded-lg text-xs font-extrabold ' +
              (dateFilter === d.v ? 'bg-slate-900 text-white shadow' : 'bg-slate-100 dark:bg-neutral-800 text-slate-700')
            }>{d.label}</button>
          ))}
        </div>
        <div className="flex gap-1.5 overflow-x-auto pb-1">
          {[
            { v: 'upcoming', label: '🔥 Upcoming' },
            { v: 'all', label: 'All Status' },
            ...Object.entries(STATUS_CONFIG).map(([k, v]) => ({ v: k, label: v.label })),
          ].map((s) => (
            <button key={s.v} onClick={() => setStatusFilter(s.v)} className={
              'shrink-0 px-3 py-1.5 rounded-lg text-xs font-extrabold ' +
              (statusFilter === s.v ? 'bg-blue-600 text-white shadow' : 'bg-slate-100 dark:bg-neutral-800 text-slate-700')
            }>{s.label}</button>
          ))}
        </div>
      </section>

      {isLoading ? (
        <div className="grid gap-3">{[1, 2, 3, 4].map((i) => <div key={i} className="h-32 rounded-2xl bg-slate-100 dark:bg-neutral-800 animate-pulse" />)}</div>
      ) : filtered.length === 0 ? (
        <div className="rounded-3xl bg-white dark:bg-neutral-900 border-2 border-dashed border-slate-200 dark:border-neutral-800 p-12 text-center">
          <Calendar className="h-16 w-16 text-slate-400 mx-auto mb-3" />
          <p className="font-extrabold text-slate-700">No appointments</p>
        </div>
      ) : (
        <section className="grid gap-3">
          {filtered.map((apt) => <AppointmentCard key={apt.id} apt={apt} />)}
        </section>
      )}
    </div>
  );
}

function AppointmentCard({ apt }: any) {
  const statusCfg = STATUS_CONFIG[apt.status as AppointmentStatus];
  const StatusIcon = statusCfg.icon;
  const startDate = new Date(apt.scheduledStart);
  const minsToStart = differenceInMinutes(startDate, new Date());
  const isSoon = minsToStart <= 30 && minsToStart >= 0 && ['CONFIRMED', 'ARRIVED'].includes(apt.status);
  const remaining = apt.total - apt.paidAmount;

  return (
    <Link to={'/clinic/appointments/' + apt.id} className={
      'block rounded-2xl bg-white dark:bg-neutral-900 border-2 shadow-sm hover:shadow-lg transition p-4 ' +
      (isSoon ? 'border-amber-400 ring-2 ring-amber-100' : 'border-slate-200 dark:border-neutral-800 hover:border-blue-300')
    }>
      <div className="flex items-start justify-between gap-3 flex-wrap">
        <div className="flex items-start gap-3 min-w-0 flex-1">
          <div className={
            'shrink-0 rounded-2xl px-3 py-2 text-center min-w-[80px] ' +
            (isSoon ? 'bg-amber-100' : 'bg-blue-100 dark:bg-blue-950/40')
          }>
            <div className="text-[10px] uppercase font-extrabold text-blue-700">Token</div>
            <div className="text-2xl font-extrabold text-blue-900">#{apt.tokenNumber || '?'}</div>
            <div className="text-[10px] font-bold text-blue-700 mt-1">{format(startDate, 'HH:mm')}</div>
          </div>
          <div className="min-w-0 flex-1">
            <div className="flex items-center gap-2 flex-wrap">
              <span className="font-extrabold text-slate-900 dark:text-white">{apt.appointmentNumber}</span>
              <span className={'px-2 py-0.5 rounded-full text-[9px] font-extrabold uppercase text-white inline-flex items-center gap-1 ' + statusCfg.color}>
                <StatusIcon className="h-2.5 w-2.5" />
                {statusCfg.label}
              </span>
              {isSoon && <span className="px-2 py-0.5 rounded bg-amber-500 text-white text-[9px] font-extrabold uppercase animate-pulse">SOON</span>}
              {apt.isEmergency && <span className="px-2 py-0.5 rounded bg-red-500 text-white text-[9px] font-extrabold uppercase inline-flex items-center gap-0.5"><Zap className="h-2 w-2" />EMERGENCY</span>}
              {apt.isTelemedicine && <span className="px-2 py-0.5 rounded bg-purple-100 text-purple-700 text-[9px] font-extrabold uppercase inline-flex items-center gap-0.5"><Video className="h-2 w-2" />TELE</span>}
              {apt.isHomeVisit && <span className="px-2 py-0.5 rounded bg-blue-100 text-blue-700 text-[9px] font-extrabold uppercase inline-flex items-center gap-0.5"><Home className="h-2 w-2" />HOME</span>}
              {apt.paymentStatus === 'PAID' && <span className="px-2 py-0.5 rounded bg-emerald-100 text-emerald-700 text-[9px] font-extrabold uppercase">PAID</span>}
            </div>

            {apt.chiefComplaint && (
              <div className="mt-2 text-xs font-bold text-slate-700 line-clamp-1">💬 {apt.chiefComplaint}</div>
            )}

            <div className="mt-1 text-xs text-slate-500 font-semibold">
              {isToday(startDate) ? 'Today' : format(startDate, 'dd MMM yyyy')} • {apt.visitType?.replace(/_/g, ' ')}
            </div>
          </div>
        </div>

        <div className="text-right shrink-0">
          <div className="text-lg font-extrabold text-emerald-700 tabular-nums">{formatPKR(apt.total)}</div>
          {remaining > 0 && apt.paymentStatus !== 'PAID' && (
            <div className="text-[10px] font-extrabold text-amber-700">Due: {formatPKR(remaining)}</div>
          )}
          <div className="mt-2 inline-flex items-center gap-1 text-xs font-extrabold text-blue-600">
            View <ArrowRight className="h-3 w-3" />
          </div>
        </div>
      </div>
    </Link>
  );
}
