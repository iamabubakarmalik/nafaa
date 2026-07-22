import { useQuery } from '@tanstack/react-query';
import { Link } from 'react-router-dom';
import {
  Wrench, Sparkles, RefreshCw, TrendingUp, DollarSign, Users, Clock,
  ArrowRight, MapPin, AlertCircle, CheckCircle2, Award, Zap, Flame,
  UserCheck, Shield, Calendar, Star, Activity, Timer, Package,
  Briefcase, PhoneCall, FileText,
} from 'lucide-react';
import { servicesDashboardApi } from '../api/dashboard.api';
import { formatPKR } from '@/lib/format';
import { Button } from '@/components/ui/Button';
import { format, differenceInMinutes, differenceInDays } from 'date-fns';

const BIZ_EMOJI: Record<string, string> = {
  ELECTRICIAN: '⚡', PLUMBER: '🔧', AC_TECHNICIAN: '❄️', APPLIANCE_REPAIR: '📺',
  MOBILE_REPAIR: '📱', COMPUTER_REPAIR: '💻', IT_SERVICES: '🖥️', CLEANING: '🧹',
  PEST_CONTROL: '🐜', CARPENTRY: '🪚', PAINTING: '🎨', MASONRY: '🧱',
  WELDING: '🔩', GLASS_WORK: '🪟', CCTV_INSTALLATION: '📹', SOLAR_INSTALLATION: '☀️',
  GENERATOR_SERVICE: '⚙️', UPS_SERVICE: '🔋', WATER_TANK_CLEANING: '💧',
  HOME_MAINTENANCE: '🏠', OFFICE_MAINTENANCE: '🏢', AUTOMOBILE_MECHANIC: '🚗',
  MOTORCYCLE_MECHANIC: '🏍️', MOVERS_PACKERS: '📦', INTERIOR_DESIGN: '🛋️',
  LANDSCAPING: '🌳', HVAC: '🌬️', ELEVATOR_MAINTENANCE: '🛗',
  FIRE_SAFETY: '🚨', SECURITY_SYSTEMS: '🔒', OTHER: '🛠️',
};

const PRIORITY_COLORS: Record<string, string> = {
  EMERGENCY: 'bg-red-600 animate-pulse',
  URGENT: 'bg-red-500',
  HIGH: 'bg-amber-500',
  NORMAL: 'bg-blue-500',
  LOW: 'bg-slate-500',
};

export default function ServicesDashboardPage() {
  const { data: overview, isLoading, refetch, isRefetching } = useQuery({
    queryKey: ['services-dashboard'],
    queryFn: () => servicesDashboardApi.overview(),
    refetchInterval: 30_000,
  });

  const totals = overview?.totals ?? { totalServices: 0, totalTechnicians: 0, availableTechnicians: 0, activeAmc: 0, activeQuotes: 0 };
  const today = overview?.today ?? { newJobs: 0, pending: 0, inProgress: 0, urgent: 0, revenue: 0, collected: 0 };
  const monthly = overview?.monthly ?? { revenue: 0, collected: 0, labour: 0, parts: 0 };
  const quality = overview?.quality ?? { avgRating: null, ratedJobs: 0 };
  const upcomingToday = overview?.upcomingToday ?? [];
  const emergencyQueue = overview?.emergencyQueue ?? [];
  const renewalDue = overview?.renewalDue ?? [];
  const topTechnicians = overview?.topTechnicians ?? [];
  const byBusinessType = overview?.byBusinessType ?? [];

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
      <section className="relative overflow-hidden rounded-3xl bg-gradient-to-br from-slate-950 via-blue-900 to-cyan-800 text-white p-6 sm:p-8 shadow-2xl">
        <div className="absolute -top-20 -right-20 h-72 w-72 rounded-full bg-blue-400/20 blur-3xl" />
        <div className="absolute -bottom-20 -left-20 h-72 w-72 rounded-full bg-cyan-400/15 blur-3xl" />

        <div className="relative flex flex-col lg:flex-row lg:items-center lg:justify-between gap-5">
          <div>
            <div className="inline-flex items-center gap-2 rounded-full bg-white/15 backdrop-blur px-3 py-1 text-xs font-extrabold border border-white/20">
              <Sparkles className="h-3.5 w-3.5 text-amber-300" />
              Service Command Center
            </div>
            <h1 className="mt-3 text-3xl sm:text-4xl font-extrabold leading-tight">
              🛠️ Service Business
            </h1>
            <p className="mt-2 text-sm text-white/80 font-semibold">
              Jobs, technicians, dispatch, AMC — sab kuch ek jagah
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
            <Link to="/services-biz/jobs/new">
              <Button className="bg-white text-slate-900 hover:bg-slate-100">
                <Briefcase className="h-4 w-4" />
                New Job
              </Button>
            </Link>
          </div>
        </div>
      </section>

      {/* Emergency alert if any */}
      {today.urgent > 0 && (
        <section className="rounded-3xl bg-gradient-to-r from-red-600 to-rose-600 text-white p-4 shadow-lg animate-pulse">
          <div className="flex items-center gap-3">
            <Flame className="h-8 w-8" />
            <div className="flex-1">
              <div className="text-lg font-extrabold">🚨 {today.urgent} URGENT/EMERGENCY jobs pending</div>
              <div className="text-xs font-bold text-white/80">Immediate attention required</div>
            </div>
            <Link to="/services-biz/jobs?priority=EMERGENCY">
              <Button className="bg-white text-red-700 hover:bg-red-50">
                View Now <ArrowRight className="h-4 w-4" />
              </Button>
            </Link>
          </div>
        </section>
      )}

      {/* TODAY KPIs */}
      <section className="grid grid-cols-2 lg:grid-cols-4 gap-4">
        <KpiCard label="New Jobs Today" value={today.newJobs} icon={Briefcase} color="blue" sub="Enquiries received" />
        <KpiCard label="Pending" value={today.pending} icon={Clock} color="amber" sub="Waiting assignment" />
        <KpiCard label="In Progress" value={today.inProgress} icon={Activity} color="cyan" sub="Active jobs" />
        <KpiCard label="Today Revenue" value={formatPKR(today.revenue)} icon={DollarSign} color="emerald" />
      </section>

      {/* MONTHLY + QUALITY */}
      <section className="grid lg:grid-cols-3 gap-6">
        <div className="lg:col-span-2 rounded-3xl bg-gradient-to-br from-slate-950 to-blue-900 text-white p-6 shadow-xl">
          <div className="flex items-center justify-between mb-4">
            <div>
              <div className="inline-flex items-center gap-2 rounded-full bg-white/15 backdrop-blur px-3 py-1 text-xs font-extrabold border border-white/20">
                <TrendingUp className="h-3.5 w-3.5 text-amber-300" />
                Last 30 Days
              </div>
              <h3 className="mt-2 text-2xl font-extrabold">Monthly Performance</h3>
            </div>
          </div>

          <div className="grid sm:grid-cols-2 lg:grid-cols-4 gap-3">
            <div className="rounded-2xl bg-white/10 backdrop-blur border border-white/20 p-4">
              <div className="text-[10px] uppercase font-extrabold text-white/70">Total Revenue</div>
              <div className="mt-1 text-2xl font-extrabold text-emerald-300 tabular-nums">{formatPKR(monthly.revenue)}</div>
            </div>
            <div className="rounded-2xl bg-white/10 backdrop-blur border border-white/20 p-4">
              <div className="text-[10px] uppercase font-extrabold text-white/70">Collected</div>
              <div className="mt-1 text-2xl font-extrabold text-cyan-300 tabular-nums">{formatPKR(monthly.collected)}</div>
            </div>
            <div className="rounded-2xl bg-white/10 backdrop-blur border border-white/20 p-4">
              <div className="text-[10px] uppercase font-extrabold text-white/70">Labour</div>
              <div className="mt-1 text-2xl font-extrabold text-amber-300 tabular-nums">{formatPKR(monthly.labour)}</div>
            </div>
            <div className="rounded-2xl bg-white/10 backdrop-blur border border-white/20 p-4">
              <div className="text-[10px] uppercase font-extrabold text-white/70">Parts Sold</div>
              <div className="mt-1 text-2xl font-extrabold text-purple-300 tabular-nums">{formatPKR(monthly.parts)}</div>
            </div>
          </div>
        </div>

        {/* Quality metrics */}
        <div className="rounded-3xl bg-gradient-to-br from-amber-500 to-orange-600 text-white p-6 shadow-xl">
          <div className="inline-flex items-center gap-2 rounded-full bg-white/15 backdrop-blur px-3 py-1 text-xs font-extrabold border border-white/20 mb-3">
            <Star className="h-3.5 w-3.5 fill-current" />
            Service Quality
          </div>
          <div className="flex items-center gap-2">
            <div className="text-6xl font-extrabold tabular-nums">
              {quality.avgRating ? quality.avgRating.toFixed(1) : '—'}
            </div>
            <div className="flex flex-col">
              {[1, 2, 3, 4, 5].map((n) => (
                <Star key={n} className={
                  'h-3 w-3 ' + ((quality.avgRating ?? 0) >= n ? 'text-white fill-white' : 'text-white/30')
                } />
              ))}
            </div>
          </div>
          <div className="mt-2 text-sm font-bold text-white/80">
            {quality.ratedJobs} rated jobs (30d)
          </div>
          <div className="mt-4 rounded-xl bg-white/15 backdrop-blur border border-white/20 p-3">
            <div className="text-[10px] uppercase font-extrabold text-white/70">Overall Status</div>
            <div className="mt-1 font-extrabold flex items-center gap-1">
              {(quality.avgRating ?? 0) >= 4.5 ? (
                <><Award className="h-4 w-4" /> Excellent</>
              ) : (quality.avgRating ?? 0) >= 4 ? (
                <><CheckCircle2 className="h-4 w-4" /> Very Good</>
              ) : (quality.avgRating ?? 0) >= 3 ? (
                <><Star className="h-4 w-4" /> Average</>
              ) : (
                <><AlertCircle className="h-4 w-4 text-amber-200" /> Needs Improvement</>
              )}
            </div>
          </div>
        </div>
      </section>

      {/* MINI KPI GRID */}
      <section className="grid grid-cols-2 lg:grid-cols-5 gap-3">
        <MiniKpi label="Services" value={totals.totalServices} icon={Wrench} color="blue" to="/services-biz/catalog" />
        <MiniKpi label="Technicians" value={totals.totalTechnicians} icon={UserCheck} color="violet" to="/services-biz/technicians" />
        <MiniKpi label="Available Now" value={totals.availableTechnicians} icon={Activity} color="emerald" to="/services-biz/technicians?status=AVAILABLE" />
        <MiniKpi label="Active AMC" value={totals.activeAmc} icon={Shield} color="amber" to="/services-biz/amc" />
        <MiniKpi label="Pending Quotes" value={totals.activeQuotes} icon={FileText} color="cyan" to="/services-biz/quotes" />
      </section>

      {/* QUICK LINKS */}
      <section className="grid grid-cols-2 sm:grid-cols-5 lg:grid-cols-10 gap-3">
        <QuickLink to="/services-biz/jobs" icon={Briefcase} label="Jobs" color="blue" />
        <QuickLink to="/services-biz/dispatch" icon={MapPin} label="Live Map" color="red" />
        <QuickLink to="/services-biz/catalog" icon={Wrench} label="Services" color="cyan" />
        <QuickLink to="/services-biz/technicians" icon={UserCheck} label="Technicians" color="violet" />
        <QuickLink to="/services-biz/quotes" icon={FileText} label="Quotes" color="amber" />
        <QuickLink to="/services-biz/amc" icon={Shield} label="AMC" color="emerald" />
        <QuickLink to="/services-biz/warranty" icon={Award} label="Warranty" color="orange" />
        <QuickLink to="/services-biz/zones" icon={MapPin} label="Zones" color="rose" />
        <QuickLink to="/services-biz/customers" icon={Users} label="Customers" color="fuchsia" />
        <QuickLink to="/services-biz/jobs/new" icon={PhoneCall} label="New Job" color="green" />
      </section>

      <div className="grid lg:grid-cols-2 gap-6">
        {/* UPCOMING TODAY */}
        <div className="rounded-3xl bg-white dark:bg-neutral-900 border border-slate-200 dark:border-neutral-800 shadow-sm overflow-hidden">
          <div className="px-6 py-4 border-b border-slate-100 dark:border-neutral-800 flex items-center justify-between">
            <div>
              <h3 className="text-lg font-bold text-slate-900 dark:text-white flex items-center gap-2">
                <Timer className="h-5 w-5 text-blue-600" />
                Upcoming Today
              </h3>
              <p className="text-xs text-slate-500 font-semibold">Scheduled jobs</p>
            </div>
            <Link to="/services-biz/jobs" className="text-xs font-extrabold text-blue-600 inline-flex items-center gap-1">
              All <ArrowRight className="h-3 w-3" />
            </Link>
          </div>
          <div className="divide-y divide-slate-100 dark:divide-neutral-800 max-h-96 overflow-y-auto">
            {upcomingToday.length === 0 ? (
              <div className="py-12 text-center text-sm text-slate-500 font-semibold">
                <Calendar className="h-8 w-8 text-slate-300 mx-auto mb-2" />
                No scheduled jobs
              </div>
            ) : (
              upcomingToday.map((job: any) => {
                const minsToStart = job.scheduledStart ? differenceInMinutes(new Date(job.scheduledStart), new Date()) : null;
                const isSoon = minsToStart !== null && minsToStart <= 60 && minsToStart >= 0;
                return (
                  <Link key={job.id} to={'/services-biz/jobs/' + job.id} className="px-6 py-3 flex items-center gap-3 hover:bg-slate-50 dark:hover:bg-neutral-800/50 transition">
                    <div className={
                      'h-10 w-10 rounded-xl text-white flex items-center justify-center shrink-0 text-lg ' +
                      (isSoon ? 'bg-gradient-to-br from-amber-500 to-orange-600' : 'bg-gradient-to-br from-blue-500 to-cyan-600')
                    }>
                      {BIZ_EMOJI[job.businessType] || '🛠️'}
                    </div>
                    <div className="flex-1 min-w-0">
                      <div className="flex items-center gap-2 flex-wrap">
                        <span className="font-extrabold text-sm text-slate-900 dark:text-white">{job.jobNumber}</span>
                        {isSoon && <span className="px-1.5 py-0.5 rounded bg-amber-500 text-white text-[9px] font-extrabold uppercase animate-pulse">SOON</span>}
                        <span className={'px-1.5 py-0.5 rounded text-[9px] font-extrabold uppercase text-white ' + (PRIORITY_COLORS[job.priority] || 'bg-blue-500')}>
                          {job.priority}
                        </span>
                      </div>
                      <div className="text-xs text-slate-600 font-bold truncate">{job.customerName} • {job.serviceName}</div>
                      {job.area && <div className="text-[10px] text-slate-500 font-semibold truncate">📍 {job.area}</div>}
                    </div>
                    <div className="text-right shrink-0">
                      <div className="text-sm font-extrabold text-slate-900 dark:text-white">
                        {job.scheduledStart && format(new Date(job.scheduledStart), 'HH:mm')}
                      </div>
                      <div className="text-[10px] font-bold text-slate-500 uppercase">{job.status}</div>
                    </div>
                  </Link>
                );
              })
            )}
          </div>
        </div>

        {/* EMERGENCY QUEUE */}
        <div className="rounded-3xl bg-white dark:bg-neutral-900 border-2 border-red-200 dark:border-red-800 shadow-sm overflow-hidden">
          <div className="px-6 py-4 border-b border-red-100 dark:border-red-800 flex items-center justify-between bg-red-50 dark:bg-red-950/30">
            <div>
              <h3 className="text-lg font-bold text-red-900 dark:text-red-300 flex items-center gap-2">
                <Flame className="h-5 w-5 text-red-600" />
                Emergency Queue
              </h3>
              <p className="text-xs text-red-700 dark:text-red-400 font-semibold">Urgent & Emergency jobs</p>
            </div>
            <span className="px-3 py-1 rounded-full bg-red-600 text-white text-xs font-extrabold animate-pulse">
              {emergencyQueue.length}
            </span>
          </div>
          <div className="divide-y divide-slate-100 dark:divide-neutral-800 max-h-96 overflow-y-auto">
            {emergencyQueue.length === 0 ? (
              <div className="py-12 text-center text-sm text-slate-500 font-semibold">
                <CheckCircle2 className="h-8 w-8 text-emerald-500 mx-auto mb-2" />
                No emergencies — clear! ✅
              </div>
            ) : (
              emergencyQueue.map((job: any) => (
                <Link key={job.id} to={'/services-biz/jobs/' + job.id} className="px-6 py-3 flex items-center gap-3 hover:bg-red-50/50 dark:hover:bg-red-950/20 transition">
                  <div className={
                    'h-10 w-10 rounded-xl text-white flex items-center justify-center shrink-0 shadow-lg ' +
                    (PRIORITY_COLORS[job.priority] || 'bg-red-500')
                  }>
                    <Zap className="h-5 w-5" />
                  </div>
                  <div className="flex-1 min-w-0">
                    <div className="flex items-center gap-2 flex-wrap">
                      <span className="font-extrabold text-sm">{job.jobNumber}</span>
                      <span className={'px-1.5 py-0.5 rounded text-[9px] font-extrabold uppercase text-white ' + (PRIORITY_COLORS[job.priority] || 'bg-red-500')}>
                        {job.priority}
                      </span>
                    </div>
                    <div className="text-xs text-slate-700 dark:text-slate-300 font-bold truncate">{job.customerName}</div>
                    <div className="text-[10px] text-slate-500 font-semibold truncate">{job.serviceName}</div>
                    {job.urgencyReason && (
                      <div className="text-[10px] italic text-red-700 truncate">⚠️ {job.urgencyReason}</div>
                    )}
                  </div>
                  <ArrowRight className="h-4 w-4 text-red-600" />
                </Link>
              ))
            )}
          </div>
        </div>
      </div>

      <div className="grid lg:grid-cols-2 gap-6">
        {/* TOP TECHNICIANS */}
        <div className="rounded-3xl bg-white dark:bg-neutral-900 border border-slate-200 dark:border-neutral-800 shadow-sm overflow-hidden">
          <div className="px-6 py-4 border-b border-slate-100 dark:border-neutral-800">
            <h3 className="text-lg font-bold text-slate-900 dark:text-white flex items-center gap-2">
              <Award className="h-5 w-5 text-amber-600" />
              Top Technicians (30 days)
            </h3>
            <p className="text-xs text-slate-500 font-semibold">By revenue generated</p>
          </div>
          <div className="divide-y divide-slate-100 dark:divide-neutral-800">
            {topTechnicians.length === 0 ? (
              <div className="py-12 text-center text-sm text-slate-500 font-semibold">
                <UserCheck className="h-8 w-8 text-slate-300 mx-auto mb-2" />
                No completed jobs yet
              </div>
            ) : (
              topTechnicians.map((t: any, i: number) => {
                const name = t.name ? ((t.name.firstName || '') + ' ' + (t.name.lastName || '')).trim() || t.name.staffNumber : 'Technician';
                return (
                  <div key={t.technicianId} className="px-6 py-3 flex items-center gap-3">
                    <div className={
                      'h-8 w-8 rounded-lg text-white flex items-center justify-center font-extrabold text-sm shadow shrink-0 ' +
                      (i === 0 ? 'bg-gradient-to-br from-amber-500 to-yellow-600' :
                       i === 1 ? 'bg-gradient-to-br from-slate-400 to-slate-500' :
                       i === 2 ? 'bg-gradient-to-br from-orange-600 to-amber-700' :
                       'bg-gradient-to-br from-slate-300 to-slate-400')
                    }>
                      {i === 0 ? '🥇' : i === 1 ? '🥈' : i === 2 ? '🥉' : i + 1}
                    </div>
                    <div className="h-10 w-10 rounded-xl bg-gradient-to-br from-violet-500 to-purple-600 text-white flex items-center justify-center font-extrabold shrink-0">
                      {name.charAt(0).toUpperCase()}
                    </div>
                    <div className="flex-1 min-w-0">
                      <div className="font-extrabold text-sm truncate">{name}</div>
                      <div className="text-[10px] font-bold text-slate-500">{t.completedJobs} completed jobs</div>
                    </div>
                    <div className="text-right shrink-0">
                      <div className="font-extrabold text-emerald-700 tabular-nums text-sm">{formatPKR(t.revenue)}</div>
                    </div>
                  </div>
                );
              })
            )}
          </div>
        </div>

        {/* AMC RENEWAL DUE */}
        <div className="rounded-3xl bg-white dark:bg-neutral-900 border-2 border-amber-200 dark:border-amber-800 shadow-sm overflow-hidden">
          <div className="px-6 py-4 border-b border-amber-100 dark:border-amber-800 flex items-center justify-between bg-amber-50 dark:bg-amber-950/30">
            <div>
              <h3 className="text-lg font-bold text-amber-900 dark:text-amber-300 flex items-center gap-2">
                <Shield className="h-5 w-5 text-amber-600" />
                AMC Renewal Due
              </h3>
              <p className="text-xs text-amber-700 dark:text-amber-400 font-semibold">Expiring in next 30 days</p>
            </div>
            <span className="px-3 py-1 rounded-full bg-amber-600 text-white text-xs font-extrabold">
              {renewalDue.length}
            </span>
          </div>
          <div className="divide-y divide-slate-100 dark:divide-neutral-800 max-h-96 overflow-y-auto">
            {renewalDue.length === 0 ? (
              <div className="py-12 text-center text-sm text-slate-500 font-semibold">
                <Shield className="h-8 w-8 text-emerald-500 mx-auto mb-2" />
                No renewals due
              </div>
            ) : (
              renewalDue.map((amc: any) => {
                const daysLeft = differenceInDays(new Date(amc.endDate), new Date());
                return (
                  <Link key={amc.id} to={'/services-biz/amc/' + amc.id} className="px-6 py-3 flex items-center gap-3 hover:bg-amber-50/50 dark:hover:bg-amber-950/20 transition">
                    <div className="h-10 w-10 rounded-xl bg-gradient-to-br from-amber-500 to-orange-600 text-white flex items-center justify-center shrink-0">
                      <Shield className="h-5 w-5" />
                    </div>
                    <div className="flex-1 min-w-0">
                      <div className="flex items-center gap-2 flex-wrap">
                        <span className="font-extrabold text-sm">{amc.amcNumber}</span>
                        <span className="px-1.5 py-0.5 rounded bg-amber-100 dark:bg-amber-950/40 text-amber-700 text-[9px] font-extrabold uppercase">{amc.type}</span>
                      </div>
                      <div className="text-xs text-slate-700 dark:text-slate-300 font-bold truncate">{amc.customerName}</div>
                    </div>
                    <div className="text-right shrink-0">
                      <div className={
                        'text-sm font-extrabold ' +
                        (daysLeft <= 7 ? 'text-red-700' : daysLeft <= 15 ? 'text-amber-700' : 'text-slate-700')
                      }>
                        {daysLeft}d left
                      </div>
                      <div className="text-[10px] font-bold text-slate-500">
                        {format(new Date(amc.endDate), 'dd MMM')}
                      </div>
                    </div>
                  </Link>
                );
              })
            )}
          </div>
        </div>
      </div>

      {/* BY BUSINESS TYPE BREAKDOWN */}
      <section className="rounded-3xl bg-white dark:bg-neutral-900 border border-slate-200 dark:border-neutral-800 shadow-sm p-6">
        <h3 className="text-lg font-bold text-slate-900 dark:text-white mb-4 flex items-center gap-2">
          <Wrench className="h-5 w-5 text-blue-600" />
          Jobs by Business Type
        </h3>
        {byBusinessType.length === 0 ? (
          <p className="text-sm text-slate-500 font-semibold text-center py-8">No job data yet</p>
        ) : (
          <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-6 gap-3">
            {byBusinessType
              .filter((b: any) => b.businessType)
              .sort((a: any, b: any) => (b._sum.totalCharge ?? 0) - (a._sum.totalCharge ?? 0))
              .slice(0, 12)
              .map((b: any) => (
                <div key={b.businessType} className="rounded-2xl bg-gradient-to-br from-slate-50 to-slate-100 dark:from-neutral-800 dark:to-neutral-800/50 p-4 border-2 border-slate-200 dark:border-neutral-700 text-center">
                  <div className="text-4xl mb-2">{BIZ_EMOJI[b.businessType] || '🛠️'}</div>
                  <div className="text-[10px] font-extrabold uppercase text-slate-700 dark:text-slate-300 mb-1 truncate">
                    {b.businessType.replace(/_/g, ' ')}
                  </div>
                  <div className="text-2xl font-extrabold text-slate-900 dark:text-white tabular-nums">{b._count._all}</div>
                  <div className="text-[10px] font-bold text-slate-500">jobs</div>
                  {b._sum.totalCharge > 0 && (
                    <div className="mt-1 text-xs font-extrabold text-emerald-700 tabular-nums">
                      {formatPKR(b._sum.totalCharge)}
                    </div>
                  )}
                </div>
              ))}
          </div>
        )}
      </section>
    </div>
  );
}

function KpiCard({ label, value, sub, icon: Icon, color }: any) {
  const colors: Record<string, string> = {
    blue: 'from-blue-500 to-cyan-600',
    amber: 'from-amber-500 to-orange-600',
    cyan: 'from-cyan-500 to-blue-600',
    emerald: 'from-emerald-500 to-green-600',
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

function MiniKpi({ label, value, icon: Icon, color, to }: any) {
  const colors: Record<string, string> = {
    blue: 'from-blue-500 to-cyan-600',
    violet: 'from-violet-500 to-purple-600',
    emerald: 'from-emerald-500 to-green-600',
    amber: 'from-amber-500 to-orange-600',
    cyan: 'from-cyan-500 to-blue-600',
  };
  return (
    <Link
      to={to}
      className="group rounded-2xl bg-white dark:bg-neutral-900 border-2 border-slate-200 dark:border-neutral-800 p-4 hover:shadow-lg hover:-translate-y-0.5 transition text-center"
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
    red: 'from-red-500 to-rose-600',
    cyan: 'from-cyan-500 to-blue-600',
    violet: 'from-violet-500 to-purple-600',
    amber: 'from-amber-500 to-orange-600',
    emerald: 'from-emerald-500 to-green-600',
    orange: 'from-orange-500 to-red-600',
    rose: 'from-rose-500 to-pink-600',
    fuchsia: 'from-fuchsia-500 to-pink-600',
    green: 'from-green-500 to-emerald-600',
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
