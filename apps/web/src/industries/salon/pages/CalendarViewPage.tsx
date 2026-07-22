import { useState } from 'react';
import { useQuery } from '@tanstack/react-query';
import { Link } from 'react-router-dom';
import {
  Calendar as CalIcon, ChevronLeft, ChevronRight, Sparkles, RefreshCw,
  Plus, Clock, User, Scissors,
} from 'lucide-react';
import { appointmentsApi } from '../api/appointments.api';
import { staffProfilesApi } from '../api/staff-profiles.api';
import { formatPKR } from '@core/lib/format';
import { Button } from '@core/ui/Button';
import { format, addDays, startOfWeek, endOfWeek, addWeeks, subWeeks, isSameDay } from 'date-fns';

const HOURS = Array.from({ length: 15 }, (_, i) => 8 + i); // 8am to 10pm

export default function CalendarViewPage() {
  const [currentWeek, setCurrentWeek] = useState(startOfWeek(new Date(), { weekStartsOn: 1 }));
  const [staffFilter, setStaffFilter] = useState<string>('');

  const weekStart = currentWeek;
  const weekEnd = endOfWeek(currentWeek, { weekStartsOn: 1 });
  const days = Array.from({ length: 7 }, (_, i) => addDays(weekStart, i));

  const { data: appointments = [], isLoading, refetch, isRefetching } = useQuery({
    queryKey: ['salon-calendar', weekStart.toISOString(), staffFilter],
    queryFn: () => appointmentsApi.calendar(weekStart.toISOString(), weekEnd.toISOString(), staffFilter || undefined),
  });

  const { data: allStaff = [] } = useQuery({
    queryKey: ['salon-staff-for-calendar'],
    queryFn: () => staffProfilesApi.list({ bookable: true }),
  });

  const getAppointmentsForSlot = (day: Date, hour: number) => {
    return appointments.filter((apt) => {
      const start = new Date(apt.scheduledStart);
      return isSameDay(start, day) && start.getHours() === hour;
    });
  };

  return (
    <div className="space-y-6">
      <section className="relative overflow-hidden rounded-3xl bg-gradient-to-br from-slate-950 via-rose-900 to-pink-700 text-white p-6 sm:p-8 shadow-2xl">
        <div className="absolute -top-20 -right-20 h-72 w-72 rounded-full bg-rose-400/20 blur-3xl" />
        <div className="relative flex flex-col lg:flex-row lg:items-center lg:justify-between gap-5">
          <div>
            <div className="inline-flex items-center gap-2 rounded-full bg-white/15 backdrop-blur px-3 py-1 text-xs font-extrabold border border-white/20">
              <Sparkles className="h-3.5 w-3.5 text-amber-300" />
              Week View
            </div>
            <h1 className="mt-3 text-3xl sm:text-4xl font-extrabold leading-tight">📅 Calendar</h1>
            <p className="mt-2 text-sm text-white/80 font-semibold">Weekly appointments grid view</p>
          </div>
          <div className="flex items-center gap-2 flex-wrap">
            <button onClick={() => refetch()} disabled={isRefetching} className="inline-flex items-center gap-2 rounded-xl bg-white/15 hover:bg-white/25 px-4 py-2.5 text-sm font-bold backdrop-blur border border-white/20">
              <RefreshCw className={'h-4 w-4 ' + (isRefetching ? 'animate-spin' : '')} />
              Refresh
            </button>
            <Link to="/salon/appointments/new">
              <Button className="bg-white text-slate-900 hover:bg-slate-100">
                <Plus className="h-4 w-4" />
                New
              </Button>
            </Link>
          </div>
        </div>
      </section>

      <section className="rounded-3xl bg-white dark:bg-neutral-900 border border-slate-200 dark:border-neutral-800 shadow-sm p-4 flex flex-wrap items-center gap-3">
        <button onClick={() => setCurrentWeek(subWeeks(currentWeek, 1))} className="h-10 w-10 rounded-lg bg-slate-100 dark:bg-neutral-800 hover:bg-slate-200 flex items-center justify-center">
          <ChevronLeft className="h-4 w-4" />
        </button>
        <div className="text-lg font-extrabold text-slate-900 dark:text-white">
          {format(weekStart, 'dd MMM')} – {format(weekEnd, 'dd MMM yyyy')}
        </div>
        <button onClick={() => setCurrentWeek(addWeeks(currentWeek, 1))} className="h-10 w-10 rounded-lg bg-slate-100 dark:bg-neutral-800 hover:bg-slate-200 flex items-center justify-center">
          <ChevronRight className="h-4 w-4" />
        </button>
        <button onClick={() => setCurrentWeek(startOfWeek(new Date(), { weekStartsOn: 1 }))} className="px-3 py-2 rounded-lg bg-pink-100 text-pink-700 text-xs font-extrabold hover:bg-pink-200">
          Today
        </button>

        <select value={staffFilter} onChange={(e) => setStaffFilter(e.target.value)} className="ml-auto h-10 rounded-lg border-2 border-slate-200 dark:border-neutral-700 bg-white dark:bg-neutral-800 px-3 text-xs font-bold focus:outline-none focus:border-pink-500">
          <option value="">All Staff</option>
          {allStaff.map((s) => {
            const nm = s.staff ? ((s.staff.firstName || '') + ' ' + (s.staff.lastName || '')).trim() : '';
            return <option key={s.id} value={s.id}>{nm}</option>;
          })}
        </select>
      </section>

      <section className="rounded-3xl bg-white dark:bg-neutral-900 border border-slate-200 dark:border-neutral-800 shadow-sm overflow-x-auto">
        <div className="min-w-[900px]">
          <div className="grid grid-cols-[80px_repeat(7,1fr)] border-b-2 border-slate-200 dark:border-neutral-800">
            <div className="p-3"></div>
            {days.map((day) => (
              <div key={day.toISOString()} className={
                'p-3 text-center border-l border-slate-100 dark:border-neutral-800 ' +
                (isSameDay(day, new Date()) ? 'bg-pink-50 dark:bg-pink-950/30' : '')
              }>
                <div className="text-[10px] uppercase font-extrabold text-slate-500">{format(day, 'EEE')}</div>
                <div className={
                  'text-lg font-extrabold ' +
                  (isSameDay(day, new Date()) ? 'text-pink-700' : 'text-slate-900 dark:text-white')
                }>
                  {format(day, 'dd')}
                </div>
              </div>
            ))}
          </div>

          {HOURS.map((hour) => (
            <div key={hour} className="grid grid-cols-[80px_repeat(7,1fr)] border-b border-slate-100 dark:border-neutral-800 min-h-[80px]">
              <div className="p-2 border-r border-slate-100 dark:border-neutral-800 text-right">
                <span className="text-xs font-extrabold text-slate-500">
                  {hour === 12 ? '12 PM' : hour > 12 ? (hour - 12) + ' PM' : hour + ' AM'}
                </span>
              </div>
              {days.map((day) => {
                const apts = getAppointmentsForSlot(day, hour);
                return (
                  <div key={day.toISOString()} className="p-1 border-l border-slate-100 dark:border-neutral-800 space-y-1">
                    {apts.map((apt) => (
                      <Link
                        key={apt.id}
                        to={'/salon/appointments/' + apt.id}
                        className={
                          'block rounded-lg p-1.5 text-[10px] hover:shadow-md transition ' +
                          (apt.status === 'CONFIRMED' ? 'bg-blue-100 dark:bg-blue-950/40 text-blue-800 hover:bg-blue-200' :
                           apt.status === 'ARRIVED' ? 'bg-cyan-100 dark:bg-cyan-950/40 text-cyan-800 hover:bg-cyan-200' :
                           apt.status === 'IN_PROGRESS' ? 'bg-amber-100 dark:bg-amber-950/40 text-amber-800 hover:bg-amber-200' :
                           apt.status === 'COMPLETED' ? 'bg-emerald-100 dark:bg-emerald-950/40 text-emerald-800 hover:bg-emerald-200' :
                           'bg-slate-100 dark:bg-neutral-800 text-slate-700 hover:bg-slate-200')
                        }
                      >
                        <div className="font-extrabold">{format(new Date(apt.scheduledStart), 'HH:mm')}</div>
                        <div className="font-bold truncate">{apt.customerName || apt.appointmentNumber}</div>
                        <div className="opacity-75 truncate">{apt.services?.[0]?.serviceName}</div>
                      </Link>
                    ))}
                  </div>
                );
              })}
            </div>
          ))}
        </div>
      </section>

      <section className="flex flex-wrap gap-2 text-xs font-bold">
        {[
          { color: 'bg-blue-100 text-blue-800', label: 'Confirmed' },
          { color: 'bg-cyan-100 text-cyan-800', label: 'Arrived' },
          { color: 'bg-amber-100 text-amber-800', label: 'In Progress' },
          { color: 'bg-emerald-100 text-emerald-800', label: 'Completed' },
        ].map((l) => (
          <span key={l.label} className={'px-3 py-1 rounded-lg ' + l.color}>{l.label}</span>
        ))}
      </section>
    </div>
  );
}
