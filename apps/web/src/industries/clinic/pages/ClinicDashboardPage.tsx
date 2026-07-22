import { useQuery } from '@tanstack/react-query';
import { Link } from 'react-router-dom';
import {
  Stethoscope, Calendar, Users, DollarSign, Clock, Heart, TrendingUp,
  Sparkles, RefreshCw, ArrowRight, UserCog, Pill, TestTube, Syringe,
  Activity, AlertCircle, CheckCircle2, Timer, FileText, Video, Home,
} from 'lucide-react';
import { clinicDashboardApi } from '../api/dashboard.api';
import { formatPKR } from '@core/lib/format';
import { Button } from '@core/ui/Button';
import { format, differenceInMinutes } from 'date-fns';

export default function ClinicDashboardPage() {
  const { data: overview, isLoading, refetch, isRefetching } = useQuery({
    queryKey: ['clinic-dashboard'],
    queryFn: () => clinicDashboardApi.overview(),
    refetchInterval: 30_000,
  });

  const totals = overview?.totals ?? { totalDoctors: 0, totalPatients: 0, activePatients: 0, pendingLabOrders: 0, dueVaccinations: 0 };
  const today = overview?.today ?? { appointments: 0, completed: 0, inQueue: 0, revenue: 0, collected: 0 };
  const monthly = overview?.monthly ?? { revenue: 0, collected: 0 };
  const upcoming = overview?.upcomingAppointments ?? [];
  const topDoctors = overview?.topDoctors ?? [];
  const byGender = overview?.byGender ?? [];

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
      <section className="relative overflow-hidden rounded-3xl bg-gradient-to-br from-slate-950 via-blue-900 to-cyan-700 text-white p-6 sm:p-8 shadow-2xl">
        <div className="absolute -top-20 -right-20 h-72 w-72 rounded-full bg-blue-400/20 blur-3xl" />
        <div className="absolute -bottom-20 -left-20 h-72 w-72 rounded-full bg-cyan-400/15 blur-3xl" />

        <div className="relative flex flex-col lg:flex-row lg:items-center lg:justify-between gap-5">
          <div>
            <div className="inline-flex items-center gap-2 rounded-full bg-white/15 backdrop-blur px-3 py-1 text-xs font-extrabold border border-white/20">
              <Sparkles className="h-3.5 w-3.5 text-amber-300" />
              Clinic Command Center
            </div>
            <h1 className="mt-3 text-3xl sm:text-4xl font-extrabold leading-tight">
              🏥 Clinic Dashboard
            </h1>
            <p className="mt-2 text-sm text-white/80 font-semibold">
              Doctors, patients, appointments — sab track
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
            <Link to="/clinic/appointments/new">
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
        <KpiCard label="Today's Appointments" value={today.appointments} icon={Calendar} color="blue" sub={today.inQueue + ' in queue'} />
        <KpiCard label="Consulted Today" value={today.completed} icon={CheckCircle2} color="emerald" />
        <KpiCard label="Today's Revenue" value={formatPKR(today.revenue)} icon={DollarSign} color="amber" sub={formatPKR(today.collected) + ' collected'} />
        <KpiCard label="Active Patients" value={totals.activePatients} icon={Users} color="fuchsia" />
      </section>

      {/* MONTHLY */}
      <section className="rounded-3xl bg-gradient-to-br from-slate-950 to-blue-900 text-white p-6 shadow-xl">
        <div className="flex items-center justify-between mb-4">
          <div>
            <div className="inline-flex items-center gap-2 rounded-full bg-white/15 backdrop-blur px-3 py-1 text-xs font-extrabold border border-white/20">
              <TrendingUp className="h-3.5 w-3.5 text-amber-300" />
              Last 30 Days
            </div>
            <h3 className="mt-2 text-2xl font-extrabold">Monthly Revenue</h3>
          </div>
        </div>
        <div className="grid sm:grid-cols-3 gap-4">
          <div className="rounded-2xl bg-white/10 backdrop-blur border border-white/20 p-4">
            <div className="text-[10px] uppercase font-extrabold text-white/70">Total Billed</div>
            <div className="mt-1 text-3xl font-extrabold text-emerald-300 tabular-nums">{formatPKR(monthly.revenue)}</div>
          </div>
          <div className="rounded-2xl bg-white/10 backdrop-blur border border-white/20 p-4">
            <div className="text-[10px] uppercase font-extrabold text-white/70">Collected</div>
            <div className="mt-1 text-3xl font-extrabold text-cyan-300 tabular-nums">{formatPKR(monthly.collected)}</div>
          </div>
          <div className="rounded-2xl bg-white/10 backdrop-blur border border-white/20 p-4">
            <div className="text-[10px] uppercase font-extrabold text-white/70">Outstanding</div>
            <div className="mt-1 text-3xl font-extrabold text-amber-300 tabular-nums">{formatPKR(monthly.revenue - monthly.collected)}</div>
          </div>
        </div>
      </section>

      {/* MINI KPIs */}
      <section className="grid grid-cols-2 lg:grid-cols-5 gap-3">
        <MiniKpi label="Doctors" value={totals.totalDoctors} icon={UserCog} color="blue" to="/clinic/doctors" />
        <MiniKpi label="Patients" value={totals.totalPatients} icon={Users} color="cyan" to="/clinic/patients" />
        <MiniKpi label="Pending Labs" value={totals.pendingLabOrders} icon={TestTube} color="violet" to="/clinic/lab-orders" />
        <MiniKpi label="Due Vaccines" value={totals.dueVaccinations} icon={Syringe} color="rose" to="/clinic/vaccinations" />
        <MiniKpi label="Today Queue" value={today.inQueue} icon={Timer} color="amber" to="/clinic/queue" highlight={today.inQueue > 0} />
      </section>

      {/* QUICK LINKS */}
      <section className="grid grid-cols-2 sm:grid-cols-4 lg:grid-cols-8 gap-3">
        <QuickLink to="/clinic/appointments" icon={Calendar} label="Appointments" color="blue" />
        <QuickLink to="/clinic/doctors" icon={UserCog} label="Doctors" color="cyan" />
        <QuickLink to="/clinic/patients" icon={Users} label="Patients" color="fuchsia" />
        <QuickLink to="/clinic/prescriptions" icon={Pill} label="Prescriptions" color="emerald" />
        <QuickLink to="/clinic/lab-orders" icon={TestTube} label="Lab Orders" color="violet" />
        <QuickLink to="/clinic/vaccinations" icon={Syringe} label="Vaccines" color="rose" />
        <QuickLink to="/clinic/services" icon={Activity} label="Services" color="amber" />
        <QuickLink to="/clinic/queue" icon={Timer} label="Queue" color="orange" />
      </section>

      <div className="grid lg:grid-cols-2 gap-6">
        {/* UPCOMING */}
        <div className="rounded-3xl bg-white dark:bg-neutral-900 border border-slate-200 dark:border-neutral-800 shadow-sm overflow-hidden">
          <div className="px-6 py-4 border-b border-slate-100 dark:border-neutral-800 flex items-center justify-between">
            <div>
              <h3 className="text-lg font-bold text-slate-900 dark:text-white flex items-center gap-2">
                <Calendar className="h-5 w-5 text-blue-600" />
                Today's Queue
              </h3>
              <p className="text-xs text-slate-500 font-semibold">Upcoming appointments</p>
            </div>
            <Link to="/clinic/appointments" className="text-xs font-extrabold text-blue-600 inline-flex items-center gap-1">
              All <ArrowRight className="h-3 w-3" />
            </Link>
          </div>
          <div className="divide-y divide-slate-100 dark:divide-neutral-800 max-h-96 overflow-y-auto">
            {upcoming.length === 0 ? (
              <div className="py-12 text-center text-sm text-slate-500 font-semibold">
                <Calendar className="h-8 w-8 text-slate-300 mx-auto mb-2" />
                No upcoming appointments today
              </div>
            ) : (
              upcoming.map((apt: any) => {
                const minsToStart = differenceInMinutes(new Date(apt.scheduledStart), new Date());
                const isSoon = minsToStart <= 30 && minsToStart >= 0;
                return (
                  <Link key={apt.id} to={'/clinic/appointments/' + apt.id} className="px-6 py-3 flex items-center gap-3 hover:bg-slate-50 dark:hover:bg-neutral-800/50 transition">
                    <div className="h-10 w-10 rounded-xl bg-gradient-to-br from-blue-500 to-cyan-600 text-white flex items-center justify-center shrink-0 text-xs font-extrabold">
                      #{apt.tokenNumber || '?'}
                    </div>
                    <div className="flex-1 min-w-0">
                      <div className="flex items-center gap-2 flex-wrap">
                        <span className="font-extrabold text-sm text-slate-900 dark:text-white truncate">
                          {apt.patient?.fullName || apt.appointmentNumber}
                        </span>
                        {isSoon && <span className="px-1.5 py-0.5 rounded bg-amber-500 text-white text-[9px] font-extrabold uppercase animate-pulse">SOON</span>}
                        {apt.isEmergency && <span className="px-1.5 py-0.5 rounded bg-red-500 text-white text-[9px] font-extrabold uppercase">EMERGENCY</span>}
                        {apt.isTelemedicine && <span className="px-1.5 py-0.5 rounded bg-purple-100 text-purple-700 text-[9px] font-extrabold uppercase inline-flex items-center gap-0.5"><Video className="h-2 w-2" />TELE</span>}
                        {apt.isHomeVisit && <span className="px-1.5 py-0.5 rounded bg-blue-100 text-blue-700 text-[9px] font-extrabold uppercase inline-flex items-center gap-0.5"><Home className="h-2 w-2" />HOME</span>}
                      </div>
                      <div className="text-xs text-slate-500 font-semibold truncate">
                        Dr. {apt.doctor?.fullName || 'Unknown'} • {apt.visitType?.replace(/_/g, ' ')}
                      </div>
                    </div>
                    <div className="text-right shrink-0">
                      <div className="text-sm font-extrabold text-slate-900 dark:text-white">
                        {format(new Date(apt.scheduledStart), 'HH:mm')}
                      </div>
                      <div className={
                        'text-[10px] font-bold ' +
                        (apt.status === 'ARRIVED' ? 'text-cyan-700' :
                         apt.status === 'IN_CONSULTATION' ? 'text-amber-700 animate-pulse' :
                         'text-slate-500')
                      }>
                        {apt.status?.replace(/_/g, ' ')}
                      </div>
                    </div>
                  </Link>
                );
              })
            )}
          </div>
        </div>

        {/* TOP DOCTORS */}
        <div className="rounded-3xl bg-white dark:bg-neutral-900 border border-slate-200 dark:border-neutral-800 shadow-sm overflow-hidden">
          <div className="px-6 py-4 border-b border-slate-100 dark:border-neutral-800 flex items-center justify-between">
            <div>
              <h3 className="text-lg font-bold text-slate-900 dark:text-white flex items-center gap-2">
                <UserCog className="h-5 w-5 text-amber-600" />
                Top Doctors (30 days)
              </h3>
              <p className="text-xs text-slate-500 font-semibold">By revenue performance</p>
            </div>
          </div>
          <div className="divide-y divide-slate-100 dark:divide-neutral-800">
            {topDoctors.length === 0 ? (
              <div className="py-12 text-center text-sm text-slate-500 font-semibold">
                <UserCog className="h-8 w-8 text-slate-300 mx-auto mb-2" />
                No consultations completed yet
              </div>
            ) : (
              topDoctors.map((d: any, i: number) => (
                <div key={d.doctorId} className="px-6 py-3 flex items-center gap-3">
                  <div className="h-8 w-8 rounded-lg bg-gradient-to-br from-amber-500 to-orange-600 text-white flex items-center justify-center font-extrabold text-sm shadow shrink-0">
                    {i + 1}
                  </div>
                  {d.doctor?.photoUrl ? (
                    <img src={d.doctor.photoUrl} alt="" className="h-10 w-10 rounded-xl object-cover ring-2 ring-slate-200" />
                  ) : (
                    <div className="h-10 w-10 rounded-xl bg-gradient-to-br from-blue-500 to-cyan-600 text-white flex items-center justify-center font-extrabold text-sm">
                      {d.doctor?.fullName?.charAt(0)?.toUpperCase() || '?'}
                    </div>
                  )}
                  <div className="flex-1 min-w-0">
                    <div className="font-extrabold text-sm truncate">
                      {d.doctor?.title ? d.doctor.title + ' ' : ''}
                      {d.doctor?.fullName}
                    </div>
                    <div className="text-[10px] font-bold text-slate-500 uppercase truncate">
                      {d.doctor?.specialties?.[0]?.replace(/_/g, ' ')}
                    </div>
                  </div>
                  <div className="text-right shrink-0">
                    <div className="font-extrabold text-emerald-700 tabular-nums text-sm">{formatPKR(d.revenue)}</div>
                    <div className="text-[10px] font-bold text-slate-500">{d.consultations} visits</div>
                  </div>
                </div>
              ))
            )}
          </div>
        </div>
      </div>

      {/* BY GENDER */}
      {byGender.length > 0 && (
        <section className="rounded-3xl bg-white dark:bg-neutral-900 border border-slate-200 dark:border-neutral-800 shadow-sm p-6">
          <h3 className="text-lg font-bold text-slate-900 dark:text-white mb-4 flex items-center gap-2">
            <Users className="h-5 w-5 text-fuchsia-600" />
            Patients by Gender
          </h3>
          <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
            {byGender.map((g: any) => {
              const emoji = g.gender === 'MALE' ? '👨' : g.gender === 'FEMALE' ? '👩' : g.gender === 'OTHER' ? '🧑' : '❓';
              return (
                <div key={g.gender ?? 'unknown'} className="rounded-2xl bg-gradient-to-br from-slate-50 to-slate-100 dark:from-neutral-800 dark:to-neutral-800/50 p-4 border-2 border-slate-200 dark:border-neutral-700 text-center">
                  <div className="text-4xl mb-2">{emoji}</div>
                  <div className="text-xs font-extrabold uppercase text-slate-700 dark:text-slate-300 mb-1">
                    {g.gender?.replace('_', ' ') || 'Unknown'}
                  </div>
                  <div className="text-2xl font-extrabold text-slate-900 dark:text-white tabular-nums">{g._count._all}</div>
                </div>
              );
            })}
          </div>
        </section>
      )}
    </div>
  );
}

function KpiCard({ label, value, sub, icon: Icon, color }: any) {
  const colors: Record<string, string> = {
    blue: 'from-blue-500 to-cyan-600',
    emerald: 'from-emerald-500 to-green-600',
    amber: 'from-amber-500 to-orange-600',
    fuchsia: 'from-fuchsia-500 to-pink-600',
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

function MiniKpi({ label, value, icon: Icon, color, to, highlight }: any) {
  const colors: Record<string, string> = {
    blue: 'from-blue-500 to-cyan-600',
    cyan: 'from-cyan-500 to-teal-600',
    violet: 'from-violet-500 to-purple-600',
    rose: 'from-rose-500 to-red-600',
    amber: 'from-amber-500 to-orange-600',
  };
  return (
    <Link
      to={to}
      className={
        'group rounded-2xl border-2 p-4 hover:shadow-lg hover:-translate-y-0.5 transition text-center ' +
        (highlight ? 'bg-gradient-to-br from-amber-50 to-orange-50 dark:from-amber-950/40 dark:to-orange-950/40 border-amber-300 animate-pulse' : 'bg-white dark:bg-neutral-900 border-slate-200 dark:border-neutral-800')
      }
    >
      <div className={
        'h-11 w-11 rounded-xl bg-gradient-to-br ' + colors[color] +
        ' text-white flex items-center justify-center shadow-lg mx-auto mb-2 group-hover:scale-110 transition-transform'
      }>
        <Icon className="h-5 w-5" />
      </div>
      <div className="text-xl font-extrabold text-slate-900 dark:text-white tabular-nums">{value}</div>
      <div className="text-[10px] font-extrabold uppercase text-slate-500 mt-0.5">{label}</div>
    </Link>
  );
}

function QuickLink({ to, icon: Icon, label, color }: any) {
  const colors: Record<string, string> = {
    blue: 'from-blue-500 to-cyan-600',
    cyan: 'from-cyan-500 to-teal-600',
    fuchsia: 'from-fuchsia-500 to-pink-600',
    emerald: 'from-emerald-500 to-green-600',
    violet: 'from-violet-500 to-purple-600',
    rose: 'from-rose-500 to-red-600',
    amber: 'from-amber-500 to-orange-600',
    orange: 'from-orange-500 to-red-600',
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
