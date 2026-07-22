import { useQuery } from '@tanstack/react-query';
import { Link } from 'react-router-dom';
import {
  Scissors, Calendar, Users, DollarSign, Clock, Star, Award, TrendingUp,
  Sparkles, RefreshCw, ArrowRight, User, Package, CreditCard, Gift,
  UserCheck, CheckCircle2, Timer, Heart, Palette,
} from 'lucide-react';
import { salonDashboardApi } from '../api/dashboard.api';
import { formatPKR } from '@/lib/format';
import { Button } from '@/components/ui/Button';
import { format, differenceInMinutes } from 'date-fns';

export default function SalonDashboardPage() {
  const { data: overview, isLoading, refetch, isRefetching } = useQuery({
    queryKey: ['salon-dashboard'],
    queryFn: () => salonDashboardApi.overview(),
    refetchInterval: 30_000,
  });

  const totals = overview?.totals ?? { totalServices: 0, totalStaff: 0, activeMemberships: 0 };
  const today = overview?.today ?? { appointments: 0, upcoming: 0, completed: 0, revenue: 0, collected: 0 };
  const monthly = overview?.monthly ?? { revenue: 0, collected: 0 };
  const upcomingAppointments = overview?.upcomingAppointments ?? [];
  const topStaff = overview?.topStaff ?? [];
  const topServices = overview?.topServices ?? [];

  if (isLoading) {
    return (
      <div className="grid gap-4">
        {[1, 2, 3, 4].map((i) => <div key={i} className="h-32 rounded-3xl bg-slate-100 dark:bg-neutral-800 animate-pulse" />)}
      </div>
    );
  }

  return (
    <div className="space-y-6">
      {/* HERO */}
      <section className="relative overflow-hidden rounded-3xl bg-gradient-to-br from-slate-950 via-pink-900 to-rose-700 text-white p-6 sm:p-8 shadow-2xl">
        <div className="absolute -top-20 -right-20 h-72 w-72 rounded-full bg-pink-400/20 blur-3xl" />
        <div className="absolute -bottom-20 -left-20 h-72 w-72 rounded-full bg-rose-400/15 blur-3xl" />

        <div className="relative flex flex-col lg:flex-row lg:items-center lg:justify-between gap-5">
          <div>
            <div className="inline-flex items-center gap-2 rounded-full bg-white/15 backdrop-blur px-3 py-1 text-xs font-extrabold border border-white/20">
              <Sparkles className="h-3.5 w-3.5 text-amber-300" />
              Salon Command Center
            </div>
            <h1 className="mt-3 text-3xl sm:text-4xl font-extrabold leading-tight">
              💇 Salon Dashboard
            </h1>
            <p className="mt-2 text-sm text-white/80 font-semibold">
              Appointments, services, staff — poori parlour ek jagah
            </p>
          </div>
          <div className="flex items-center gap-2 flex-wrap">
            <button
              onClick={() => refetch()}
              disabled={isRefetching}
              className="inline-flex items-center gap-2 rounded-xl bg-white/15 hover:bg-white/25 px-4 py-2.5 text-sm font-bold backdrop-blur border border-white/20"
            >
              <RefreshCw className={'h-4 w-4 ' + (isRefetching ? 'animate-spin' : '')} />
              Refresh
            </button>
            <Link to="/salon/appointments/new">
              <Button className="bg-white text-slate-900 hover:bg-slate-100">
                <Calendar className="h-4 w-4" />
                New Appointment
              </Button>
            </Link>
          </div>
        </div>
      </section>

      {/* TODAY KPIs */}
      <section className="grid grid-cols-2 lg:grid-cols-4 gap-4">
        <KpiCard label="Today's Appointments" value={today.appointments} icon={Calendar} color="pink" sub={today.upcoming + ' upcoming'} />
        <KpiCard label="Completed Today" value={today.completed} icon={CheckCircle2} color="emerald" sub="Sessions done" />
        <KpiCard label="Today's Revenue" value={formatPKR(today.revenue)} icon={DollarSign} color="amber" sub={formatPKR(today.collected) + ' collected'} />
        <KpiCard label="Active Members" value={totals.activeMemberships} icon={Award} color="violet" sub="Loyalty members" />
      </section>

      {/* MONTHLY REVENUE */}
      <section className="rounded-3xl bg-gradient-to-br from-slate-950 to-pink-900 text-white p-6 shadow-xl">
        <div className="flex items-center justify-between mb-4">
          <div>
            <div className="inline-flex items-center gap-2 rounded-full bg-white/15 backdrop-blur px-3 py-1 text-xs font-extrabold border border-white/20">
              <TrendingUp className="h-3.5 w-3.5 text-amber-300" />
              Last 30 Days
            </div>
            <h3 className="mt-2 text-2xl font-extrabold">Monthly Business Overview</h3>
          </div>
        </div>

        <div className="grid sm:grid-cols-3 gap-4">
          <div className="rounded-2xl bg-white/10 backdrop-blur border border-white/20 p-4">
            <div className="text-[10px] uppercase tracking-wider font-extrabold text-white/70">Total Revenue</div>
            <div className="mt-1 text-3xl font-extrabold tabular-nums text-emerald-300">{formatPKR(monthly.revenue)}</div>
          </div>
          <div className="rounded-2xl bg-white/10 backdrop-blur border border-white/20 p-4">
            <div className="text-[10px] uppercase tracking-wider font-extrabold text-white/70">Collected</div>
            <div className="mt-1 text-3xl font-extrabold tabular-nums text-cyan-300">{formatPKR(monthly.collected)}</div>
          </div>
          <div className="rounded-2xl bg-white/10 backdrop-blur border border-white/20 p-4">
            <div className="text-[10px] uppercase tracking-wider font-extrabold text-white/70">Outstanding</div>
            <div className="mt-1 text-3xl font-extrabold tabular-nums text-amber-300">{formatPKR(monthly.revenue - monthly.collected)}</div>
          </div>
        </div>
      </section>

      {/* QUICK LINKS */}
      <section className="grid grid-cols-2 sm:grid-cols-4 lg:grid-cols-7 gap-3">
        <QuickLink to="/salon/appointments" icon={Calendar} label="Appointments" color="pink" />
        <QuickLink to="/salon/calendar" icon={Timer} label="Calendar" color="rose" />
        <QuickLink to="/salon/services" icon={Scissors} label="Services" color="fuchsia" />
        <QuickLink to="/salon/staff" icon={UserCheck} label="Staff" color="violet" />
        <QuickLink to="/salon/memberships" icon={Award} label="Memberships" color="amber" />
        <QuickLink to="/salon/packages" icon={Package} label="Packages" color="emerald" />
        <QuickLink to="/salon/customers" icon={Heart} label="Customers" color="cyan" />
      </section>

      <div className="grid lg:grid-cols-2 gap-6">
        {/* UPCOMING APPOINTMENTS */}
        <div className="rounded-3xl bg-white dark:bg-neutral-900 border border-slate-200 dark:border-neutral-800 shadow-sm overflow-hidden">
          <div className="px-6 py-4 border-b border-slate-100 dark:border-neutral-800 flex items-center justify-between">
            <div>
              <h3 className="text-lg font-bold text-slate-900 dark:text-white flex items-center gap-2">
                <Calendar className="h-5 w-5 text-pink-600" />
                Upcoming Appointments
              </h3>
              <p className="text-xs text-slate-500 font-semibold">Next scheduled bookings</p>
            </div>
            <Link to="/salon/appointments" className="text-xs font-extrabold text-pink-600 inline-flex items-center gap-1">
              All <ArrowRight className="h-3 w-3" />
            </Link>
          </div>
          <div className="divide-y divide-slate-100 dark:divide-neutral-800 max-h-96 overflow-y-auto">
            {upcomingAppointments.length === 0 ? (
              <div className="py-12 text-center text-sm text-slate-500 font-semibold">
                <Calendar className="h-8 w-8 text-slate-300 mx-auto mb-2" />
                No upcoming appointments
              </div>
            ) : (
              upcomingAppointments.map((apt: any) => {
                const minsToStart = differenceInMinutes(new Date(apt.scheduledStart), new Date());
                const isSoon = minsToStart <= 60 && minsToStart >= 0;
                return (
                  <Link key={apt.id} to={'/salon/appointments/' + apt.id} className="px-6 py-3 flex items-center gap-3 hover:bg-slate-50 dark:hover:bg-neutral-800/50 transition">
                    <div className="h-10 w-10 rounded-xl bg-gradient-to-br from-pink-500 to-rose-600 text-white flex items-center justify-center shrink-0">
                      <User className="h-5 w-5" />
                    </div>
                    <div className="flex-1 min-w-0">
                      <div className="flex items-center gap-2 flex-wrap">
                        <span className="font-extrabold text-sm text-slate-900 dark:text-white">{apt.customerName || apt.appointmentNumber}</span>
                        {isSoon && <span className="px-1.5 py-0.5 rounded bg-amber-500 text-white text-[9px] font-extrabold uppercase animate-pulse">SOON</span>}
                        <span className={
                          'px-1.5 py-0.5 rounded text-[9px] font-extrabold uppercase text-white ' +
                          (apt.status === 'CONFIRMED' ? 'bg-blue-500' : apt.status === 'ARRIVED' ? 'bg-cyan-500' : 'bg-slate-500')
                        }>
                          {apt.status}
                        </span>
                      </div>
                      <div className="text-xs text-slate-500 font-semibold truncate">
                        {apt.services?.map((s: any) => s.serviceName).join(', ')}
                      </div>
                    </div>
                    <div className="text-right shrink-0">
                      <div className="text-sm font-extrabold text-slate-900 dark:text-white">
                        {format(new Date(apt.scheduledStart), 'HH:mm')}
                      </div>
                      <div className="text-[10px] font-bold text-slate-500">
                        {format(new Date(apt.scheduledStart), 'dd MMM')}
                      </div>
                    </div>
                  </Link>
                );
              })
            )}
          </div>
        </div>

        {/* TOP STAFF */}
        <div className="rounded-3xl bg-white dark:bg-neutral-900 border border-slate-200 dark:border-neutral-800 shadow-sm overflow-hidden">
          <div className="px-6 py-4 border-b border-slate-100 dark:border-neutral-800 flex items-center justify-between">
            <div>
              <h3 className="text-lg font-bold text-slate-900 dark:text-white flex items-center gap-2">
                <Award className="h-5 w-5 text-amber-600" />
                Top Staff (30 days)
              </h3>
              <p className="text-xs text-slate-500 font-semibold">By revenue performance</p>
            </div>
          </div>
          <div className="divide-y divide-slate-100 dark:divide-neutral-800">
            {topStaff.length === 0 ? (
              <div className="py-12 text-center text-sm text-slate-500 font-semibold">
                <Users className="h-8 w-8 text-slate-300 mx-auto mb-2" />
                No completed appointments yet
              </div>
            ) : (
              topStaff.map((s: any, i: number) => (
                <div key={s.staffProfileId} className="px-6 py-3 flex items-center gap-3">
                  <div className="h-8 w-8 rounded-lg bg-gradient-to-br from-amber-500 to-orange-600 text-white flex items-center justify-center font-extrabold text-sm shadow shrink-0">
                    {i + 1}
                  </div>
                  {s.photoUrl ? (
                    <img src={s.photoUrl} alt="" className="h-10 w-10 rounded-xl object-cover ring-2 ring-slate-200" />
                  ) : (
                    <div className="h-10 w-10 rounded-xl bg-gradient-to-br from-pink-500 to-rose-600 text-white flex items-center justify-center font-extrabold text-sm">
                      {s.name?.charAt(0).toUpperCase() || '?'}
                    </div>
                  )}
                  <div className="flex-1 min-w-0">
                    <div className="font-extrabold text-sm truncate">{s.name}</div>
                    <div className="text-[10px] font-bold text-slate-500 uppercase">{s.role}</div>
                  </div>
                  <div className="text-right shrink-0">
                    <div className="font-extrabold text-emerald-700 tabular-nums text-sm">{formatPKR(s.revenue)}</div>
                    <div className="text-[10px] font-bold text-slate-500">{s.appointmentCount} services</div>
                  </div>
                </div>
              ))
            )}
          </div>
        </div>
      </div>

      {/* TOP SERVICES */}
      <div className="rounded-3xl bg-white dark:bg-neutral-900 border border-slate-200 dark:border-neutral-800 shadow-sm overflow-hidden">
        <div className="px-6 py-4 border-b border-slate-100 dark:border-neutral-800">
          <h3 className="text-lg font-bold text-slate-900 dark:text-white flex items-center gap-2">
            <TrendingUp className="h-5 w-5 text-fuchsia-600" />
            Popular Services (30 days)
          </h3>
        </div>
        <div className="grid sm:grid-cols-2 lg:grid-cols-5 gap-2 p-4">
          {topServices.length === 0 ? (
            <div className="col-span-full py-8 text-center text-sm text-slate-500 font-semibold">No completed services yet</div>
          ) : (
            topServices.map((s: any, i: number) => (
              <div key={s.serviceId} className="rounded-xl bg-slate-50 dark:bg-neutral-800/50 p-3">
                <div className="flex items-center gap-2 mb-2">
                  <div className="h-8 w-8 rounded-lg bg-gradient-to-br from-fuchsia-500 to-pink-600 text-white flex items-center justify-center font-extrabold text-xs shadow">
                    {i + 1}
                  </div>
                  <div className="text-[9px] uppercase font-extrabold text-slate-500">{s.service?.category?.replace('_', ' ')}</div>
                </div>
                <div className="font-extrabold text-sm text-slate-900 dark:text-white line-clamp-1">{s.service?.name}</div>
                <div className="mt-2 grid grid-cols-2 gap-1">
                  <div>
                    <div className="text-[9px] uppercase font-extrabold text-slate-500">Bookings</div>
                    <div className="text-lg font-extrabold text-slate-900 dark:text-white tabular-nums">{s._count._all}</div>
                  </div>
                  <div>
                    <div className="text-[9px] uppercase font-extrabold text-emerald-700">Revenue</div>
                    <div className="text-sm font-extrabold text-emerald-700 tabular-nums">{formatPKR(s._sum.total ?? 0)}</div>
                  </div>
                </div>
              </div>
            ))
          )}
        </div>
      </div>
    </div>
  );
}

function KpiCard({ label, value, sub, icon: Icon, color }: any) {
  const colors: Record<string, string> = {
    pink: 'from-pink-500 to-rose-600',
    emerald: 'from-emerald-500 to-green-600',
    amber: 'from-amber-500 to-orange-600',
    violet: 'from-violet-500 to-purple-600',
  };
  return (
    <div className="rounded-2xl bg-white dark:bg-neutral-900 border-2 border-slate-200 dark:border-neutral-800 p-5 shadow-sm hover:shadow-md transition">
      <div className="flex items-center justify-between">
        <div className="min-w-0">
          <div className="text-xs uppercase tracking-wider text-slate-500 font-bold">{label}</div>
          <div className="mt-2 text-2xl font-extrabold text-slate-900 dark:text-white tabular-nums">{value}</div>
          {sub && <div className="text-xs text-slate-600 dark:text-slate-400 font-semibold mt-1">{sub}</div>}
        </div>
        <div className={
          'h-12 w-12 rounded-2xl bg-gradient-to-br ' + colors[color] +
          ' text-white flex items-center justify-center shadow-lg shrink-0'
        }>
          <Icon className="h-6 w-6" />
        </div>
      </div>
    </div>
  );
}

function QuickLink({ to, icon: Icon, label, color }: any) {
  const colors: Record<string, string> = {
    pink: 'from-pink-500 to-rose-600',
    rose: 'from-rose-500 to-red-600',
    fuchsia: 'from-fuchsia-500 to-pink-600',
    violet: 'from-violet-500 to-purple-600',
    amber: 'from-amber-500 to-yellow-600',
    emerald: 'from-emerald-500 to-green-600',
    cyan: 'from-cyan-500 to-blue-600',
  };
  return (
    <Link
      to={to}
      className="group rounded-2xl bg-white dark:bg-neutral-900 border-2 border-slate-200 dark:border-neutral-800 p-4 hover:border-slate-300 hover:shadow-lg hover:-translate-y-0.5 transition"
    >
      <div className={
        'h-11 w-11 rounded-xl bg-gradient-to-br ' + colors[color] +
        ' text-white flex items-center justify-center shadow-lg group-hover:scale-110 transition-transform mb-2'
      }>
        <Icon className="h-5 w-5" />
      </div>
      <div className="text-xs font-extrabold text-slate-900 dark:text-white">{label}</div>
    </Link>
  );
}
