import { useState } from 'react';
import { useQuery } from '@tanstack/react-query';
import { Link } from 'react-router-dom';
import {
  Calendar, Plus, Search, X, RefreshCw, Sparkles, Clock, User, Phone,
  CheckCircle2, AlertCircle, Ban, Award, ArrowRight, Star, Timer,
  DollarSign, Zap,
} from 'lucide-react';
import { appointmentsApi, type AppointmentStatus } from '../api/appointments.api';
import { formatPKR } from '@core/lib/format';
import { Button } from '@core/ui/Button';
import { format, differenceInMinutes, isToday, isTomorrow } from 'date-fns';

const STATUS_CONFIG: Record<AppointmentStatus, { label: string; color: string; icon: any }> = {
  DRAFT: { label: 'Draft', color: 'bg-slate-500', icon: AlertCircle },
  CONFIRMED: { label: 'Confirmed', color: 'bg-blue-500', icon: CheckCircle2 },
  ARRIVED: { label: 'Arrived', color: 'bg-cyan-500', icon: User },
  IN_PROGRESS: { label: 'In Progress', color: 'bg-amber-500', icon: Timer },
  COMPLETED: { label: 'Completed', color: 'bg-emerald-600', icon: CheckCircle2 },
  NO_SHOW: { label: 'No Show', color: 'bg-orange-600', icon: Ban },
  CANCELLED: { label: 'Cancelled', color: 'bg-rose-500', icon: X },
  RESCHEDULED: { label: 'Rescheduled', color: 'bg-violet-500', icon: Calendar },
};

export default function AppointmentsPage() {
  const [search, setSearch] = useState('');
  const [statusFilter, setStatusFilter] = useState<string>('upcoming');
  const [dateFilter, setDateFilter] = useState<string>('today');

  // Date range calculation
  const getDateRange = () => {
    const now = new Date();
    const start = new Date(now);
    const end = new Date(now);

    if (dateFilter === 'today') {
      start.setHours(0, 0, 0, 0);
      end.setHours(23, 59, 59, 999);
    } else if (dateFilter === 'tomorrow') {
      start.setDate(start.getDate() + 1);
      start.setHours(0, 0, 0, 0);
      end.setDate(end.getDate() + 1);
      end.setHours(23, 59, 59, 999);
    } else if (dateFilter === 'week') {
      start.setHours(0, 0, 0, 0);
      end.setDate(end.getDate() + 7);
      end.setHours(23, 59, 59, 999);
    } else if (dateFilter === 'month') {
      start.setHours(0, 0, 0, 0);
      end.setDate(end.getDate() + 30);
      end.setHours(23, 59, 59, 999);
    }
    return { from: start.toISOString(), to: end.toISOString() };
  };

  const { data: appointments = [], isLoading, refetch, isRefetching } = useQuery({
    queryKey: ['salon-appointments', statusFilter, dateFilter, search],
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
    ? appointments.filter((a) => ['CONFIRMED', 'ARRIVED', 'IN_PROGRESS'].includes(a.status))
    : appointments;

  const stats = {
    total: appointments.length,
    confirmed: appointments.filter((a) => a.status === 'CONFIRMED').length,
    completed: appointments.filter((a) => a.status === 'COMPLETED').length,
    revenue: appointments.filter((a) => a.status === 'COMPLETED').reduce((s, a) => s + a.total, 0),
  };

  return (
    <div className="space-y-6">
      {/* HERO */}
      <section className="relative overflow-hidden rounded-3xl bg-gradient-to-br from-slate-950 via-pink-900 to-rose-700 text-white p-6 sm:p-8 shadow-2xl">
        <div className="absolute -top-20 -right-20 h-72 w-72 rounded-full bg-pink-400/20 blur-3xl" />
        <div className="relative flex flex-col lg:flex-row lg:items-center lg:justify-between gap-5">
          <div>
            <div className="inline-flex items-center gap-2 rounded-full bg-white/15 backdrop-blur px-3 py-1 text-xs font-extrabold border border-white/20">
              <Sparkles className="h-3.5 w-3.5 text-amber-300" />
              Booking Manager
            </div>
            <h1 className="mt-3 text-3xl sm:text-4xl font-extrabold leading-tight">📅 Appointments</h1>
            <p className="mt-2 text-sm text-white/80 font-semibold">All bookings, walk-ins, and scheduled visits</p>
          </div>
          <div className="flex items-center gap-2 flex-wrap">
            <button onClick={() => refetch()} disabled={isRefetching} className="inline-flex items-center gap-2 rounded-xl bg-white/15 hover:bg-white/25 px-4 py-2.5 text-sm font-bold backdrop-blur border border-white/20">
              <RefreshCw className={'h-4 w-4 ' + (isRefetching ? 'animate-spin' : '')} />
              Refresh
            </button>
            <Link to="/salon/appointments/new">
              <Button className="bg-white text-slate-900 hover:bg-slate-100">
                <Plus className="h-4 w-4" />
                New Appointment
              </Button>
            </Link>
          </div>
        </div>
      </section>

      {/* STATS */}
      <section className="grid grid-cols-2 lg:grid-cols-4 gap-4">
        <StatCard label="Total" value={stats.total} icon={Calendar} color="pink" />
        <StatCard label="Confirmed" value={stats.confirmed} icon={CheckCircle2} color="blue" />
        <StatCard label="Completed" value={stats.completed} icon={Award} color="emerald" />
        <StatCard label="Revenue" value={formatPKR(stats.revenue)} icon={DollarSign} color="amber" />
      </section>

      {/* FILTERS */}
      <section className="rounded-3xl bg-white dark:bg-neutral-900 border border-slate-200 dark:border-neutral-800 shadow-sm p-4 space-y-3">
        <div className="relative">
          <Search className="h-4 w-4 text-slate-400 absolute left-3.5 top-1/2 -translate-y-1/2" />
          <input value={search} onChange={(e) => setSearch(e.target.value)} placeholder="Search appointment #, customer name, phone..." className="h-11 w-full rounded-xl border-2 border-slate-200 dark:border-neutral-700 bg-white dark:bg-neutral-800 pl-10 pr-3 text-sm font-semibold focus:outline-none focus:border-pink-500" />
        </div>

        <div className="flex gap-1.5 overflow-x-auto pb-1">
          {[
            { v: 'today', label: '📅 Today' },
            { v: 'tomorrow', label: 'Tomorrow' },
            { v: 'week', label: 'Next 7 days' },
            { v: 'month', label: 'Next 30 days' },
            { v: 'all', label: 'All Dates' },
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
              (statusFilter === s.v ? 'bg-pink-600 text-white shadow' : 'bg-slate-100 dark:bg-neutral-800 text-slate-700')
            }>{s.label}</button>
          ))}
        </div>
      </section>

      {isLoading ? (
        <div className="grid gap-3">
          {[1, 2, 3, 4].map((i) => <div key={i} className="h-32 rounded-2xl bg-slate-100 dark:bg-neutral-800 animate-pulse" />)}
        </div>
      ) : filtered.length === 0 ? (
        <div className="rounded-3xl bg-white dark:bg-neutral-900 border-2 border-dashed border-slate-200 dark:border-neutral-800 p-12 text-center">
          <Calendar className="h-16 w-16 text-slate-400 mx-auto mb-3" />
          <p className="font-extrabold text-slate-700">No appointments</p>
          <Link to="/salon/appointments/new">
            <Button className="mt-4 bg-gradient-to-r from-pink-600 to-rose-700">
              <Plus className="h-4 w-4" />
              Book First Appointment
            </Button>
          </Link>
        </div>
      ) : (
        <section className="grid gap-3">
          {filtered.map((apt) => <AppointmentCard key={apt.id} apt={apt} />)}
        </section>
      )}
    </div>
  );
}

function StatCard({ label, value, icon: Icon, color }: any) {
  const colors: Record<string, string> = {
    pink: 'from-pink-500 to-rose-600', blue: 'from-blue-500 to-blue-700',
    emerald: 'from-emerald-500 to-green-600', amber: 'from-amber-500 to-orange-600',
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

function AppointmentCard({ apt }: any) {
  const statusCfg = STATUS_CONFIG[apt.status as AppointmentStatus];
  const StatusIcon = statusCfg.icon;
  const startDate = new Date(apt.scheduledStart);
  const minsToStart = differenceInMinutes(startDate, new Date());
  const isSoon = minsToStart <= 60 && minsToStart >= 0 && ['CONFIRMED', 'ARRIVED'].includes(apt.status);
  const isPast = minsToStart < 0;
  const remaining = apt.total - apt.paidAmount;

  const dateLabel = isToday(startDate) ? 'Today' : isTomorrow(startDate) ? 'Tomorrow' : format(startDate, 'dd MMM');

  return (
    <Link to={'/salon/appointments/' + apt.id} className={
      'block rounded-2xl bg-white dark:bg-neutral-900 border-2 shadow-sm hover:shadow-lg transition p-4 ' +
      (isSoon ? 'border-amber-400 ring-2 ring-amber-100 dark:ring-amber-950/40' : 'border-slate-200 dark:border-neutral-800 hover:border-pink-300')
    }>
      <div className="flex items-start justify-between gap-3 flex-wrap">
        <div className="flex items-start gap-3 min-w-0 flex-1">
          {/* Date/Time block */}
          <div className={
            'shrink-0 rounded-2xl px-3 py-2 text-center min-w-[80px] ' +
            (isSoon ? 'bg-amber-100 dark:bg-amber-950/40' : 'bg-slate-100 dark:bg-neutral-800')
          }>
            <div className={
              'text-[10px] uppercase font-extrabold ' +
              (isSoon ? 'text-amber-700' : 'text-slate-600')
            }>{dateLabel}</div>
            <div className={
              'text-xl font-extrabold ' +
              (isSoon ? 'text-amber-900' : 'text-slate-900 dark:text-white')
            }>
              {format(startDate, 'HH:mm')}
            </div>
            <div className="text-[9px] font-bold text-slate-500">
              {differenceInMinutes(new Date(apt.scheduledEnd), startDate)}min
            </div>
          </div>

          <div className="min-w-0 flex-1">
            <div className="flex items-center gap-2 flex-wrap">
              <span className="font-extrabold text-slate-900 dark:text-white">{apt.customerName || apt.appointmentNumber}</span>
              <span className={'px-2 py-0.5 rounded-full text-[9px] font-extrabold uppercase text-white inline-flex items-center gap-1 ' + statusCfg.color}>
                <StatusIcon className="h-2.5 w-2.5" />
                {statusCfg.label}
              </span>
              {isSoon && (
                <span className="px-2 py-0.5 rounded bg-amber-500 text-white text-[9px] font-extrabold uppercase inline-flex items-center gap-0.5 animate-pulse">
                  <Zap className="h-2 w-2" />
                  IN {minsToStart}MIN
                </span>
              )}
              {apt.paymentStatus === 'PAID' && (
                <span className="px-2 py-0.5 rounded bg-emerald-100 text-emerald-700 text-[9px] font-extrabold uppercase">PAID</span>
              )}
              {apt.customerRating && (
                <span className="px-2 py-0.5 rounded bg-amber-100 text-amber-700 text-[9px] font-extrabold uppercase inline-flex items-center gap-0.5">
                  <Star className="h-2 w-2 fill-current" />
                  {apt.customerRating}
                </span>
              )}
            </div>

            <div className="mt-1 text-xs font-mono text-slate-500">{apt.appointmentNumber}</div>

            {apt.customerPhone && (
              <div className="mt-1 flex items-center gap-1 text-xs text-slate-600 font-bold">
                <Phone className="h-3 w-3" />
                {apt.customerPhone}
              </div>
            )}

            <div className="mt-2 flex flex-wrap gap-1">
              {apt.services?.slice(0, 4).map((s: any, i: number) => (
                <span key={i} className="px-2 py-0.5 rounded bg-pink-100 dark:bg-pink-950/40 text-pink-700 text-[10px] font-extrabold">
                  {s.serviceName}
                  {s.staffName && ' • ' + s.staffName}
                </span>
              ))}
              {(apt.services?.length || 0) > 4 && (
                <span className="px-2 py-0.5 rounded bg-slate-100 dark:bg-neutral-800 text-[10px] font-extrabold text-slate-500">
                  +{(apt.services?.length || 0) - 4} more
                </span>
              )}
            </div>

            {apt.customerNotes && (
              <div className="mt-1 text-xs italic text-amber-700 line-clamp-1">📝 {apt.customerNotes}</div>
            )}
          </div>
        </div>

        <div className="text-right shrink-0">
          <div className="text-xl font-extrabold text-emerald-700 dark:text-emerald-400 tabular-nums">{formatPKR(apt.total)}</div>
          {remaining > 0 && apt.paymentStatus !== 'PAID' && (
            <div className="text-[10px] font-extrabold text-amber-700">Due: {formatPKR(remaining)}</div>
          )}
          <div className="mt-2 inline-flex items-center gap-1 text-xs font-extrabold text-pink-600">
            View <ArrowRight className="h-3 w-3" />
          </div>
        </div>
      </div>
    </Link>
  );
}
