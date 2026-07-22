import { useQuery } from '@tanstack/react-query';
import { Link } from 'react-router-dom';
import {
  Car, Wrench, Users, DollarSign, Clock, Star, Award, TrendingUp,
  Sparkles, RefreshCw, ArrowRight, User, Package, AlertCircle, Bell,
  CheckCircle2, Timer, Calendar, Zap, Settings, Truck, Cog,
} from 'lucide-react';
import { autoPartsDashboardApi } from '../api/dashboard.api';
import { formatPKR } from '@/lib/format';
import { Button } from '@/components/ui/Button';
import { format, differenceInDays } from 'date-fns';

export default function AutoPartsDashboardPage() {
  const { data: overview, isLoading, refetch, isRefetching } = useQuery({
    queryKey: ['autoparts-dashboard'],
    queryFn: () => autoPartsDashboardApi.overview(),
    refetchInterval: 60_000,
  });

  const totals = overview?.totals ?? { totalVehicles: 0, totalMechanics: 0, activeJobs: 0, waitingParts: 0, readyDelivery: 0 };
  const today = overview?.today ?? { revenue: 0, collected: 0, deliveredCount: 0 };
  const monthly = overview?.monthly ?? { revenue: 0, collected: 0, jobCount: 0 };
  const expiring = overview?.expiring ?? { insurance: 0, tokenTax: 0, fitness: 0 };
  const upcomingJobs = overview?.upcomingJobs ?? [];
  const overdueJobs = overview?.overdueJobs ?? [];
  const topMechanics = overview?.topMechanics ?? [];
  const jobsByType = overview?.jobsByType ?? [];

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
      <section className="relative overflow-hidden rounded-3xl bg-gradient-to-br from-slate-950 via-orange-900 to-red-700 text-white p-6 sm:p-8 shadow-2xl">
        <div className="absolute -top-20 -right-20 h-72 w-72 rounded-full bg-orange-400/20 blur-3xl" />
        <div className="absolute -bottom-20 -left-20 h-72 w-72 rounded-full bg-red-400/15 blur-3xl" />

        <div className="relative flex flex-col lg:flex-row lg:items-center lg:justify-between gap-5">
          <div>
            <div className="inline-flex items-center gap-2 rounded-full bg-white/15 backdrop-blur px-3 py-1 text-xs font-extrabold border border-white/20">
              <Sparkles className="h-3.5 w-3.5 text-amber-300" />
              Workshop Command Center
            </div>
            <h1 className="mt-3 text-3xl sm:text-4xl font-extrabold leading-tight">
              🚗 Auto Parts & Workshop
            </h1>
            <p className="mt-2 text-sm text-white/80 font-semibold">
              Vehicles, jobs, spare parts, mechanics — poori garage ek jagah
            </p>
          </div>
          <div className="flex items-center gap-2 flex-wrap">
            <button onClick={() => refetch()} disabled={isRefetching} className="inline-flex items-center gap-2 rounded-xl bg-white/15 hover:bg-white/25 px-4 py-2.5 text-sm font-bold backdrop-blur border border-white/20">
              <RefreshCw className={'h-4 w-4 ' + (isRefetching ? 'animate-spin' : '')} />
              Refresh
            </button>
            <Link to="/autoparts/jobs/new">
              <Button className="bg-white text-slate-900 hover:bg-slate-100">
                <Wrench className="h-4 w-4" />
                New Job
              </Button>
            </Link>
          </div>
        </div>
      </section>

      {/* URGENT ALERTS */}
      {(overdueJobs.length > 0 || expiring.insurance > 0 || expiring.tokenTax > 0 || expiring.fitness > 0) && (
        <section className="grid sm:grid-cols-2 lg:grid-cols-4 gap-3">
          {overdueJobs.length > 0 && (
            <AlertCard label="Overdue Jobs" value={overdueJobs.length} icon={AlertCircle} to="/autoparts/jobs?status=overdue" color="rose" />
          )}
          {expiring.insurance > 0 && (
            <AlertCard label="Insurance Expiring" value={expiring.insurance} icon={Bell} to="/autoparts/vehicles?filter=insurance-expiring" color="amber" sub="Next 30 days" />
          )}
          {expiring.tokenTax > 0 && (
            <AlertCard label="Token Tax Due" value={expiring.tokenTax} icon={Bell} to="/autoparts/vehicles?filter=token-expiring" color="orange" sub="Next 30 days" />
          )}
          {expiring.fitness > 0 && (
            <AlertCard label="Fitness Expiring" value={expiring.fitness} icon={Bell} to="/autoparts/vehicles?filter=fitness-expiring" color="red" sub="Next 30 days" />
          )}
        </section>
      )}

      {/* KPI GRID */}
      <section className="grid grid-cols-2 lg:grid-cols-5 gap-4">
        <KpiCard label="Registered Vehicles" value={totals.totalVehicles} icon={Car} color="blue" />
        <KpiCard label="Active Jobs" value={totals.activeJobs} icon={Wrench} color="orange" />
        <KpiCard label="Waiting Parts" value={totals.waitingParts} icon={Package} color="amber" />
        <KpiCard label="Ready for Delivery" value={totals.readyDelivery} icon={CheckCircle2} color="emerald" />
        <KpiCard label="Mechanics" value={totals.totalMechanics} icon={Users} color="violet" />
      </section>

      {/* REVENUE BANNER */}
      <section className="rounded-3xl bg-gradient-to-br from-slate-950 to-orange-900 text-white p-6 shadow-xl">
        <div className="flex items-center justify-between mb-4">
          <div>
            <div className="inline-flex items-center gap-2 rounded-full bg-white/15 backdrop-blur px-3 py-1 text-xs font-extrabold border border-white/20">
              <TrendingUp className="h-3.5 w-3.5 text-amber-300" />
              Revenue Overview
            </div>
            <h3 className="mt-2 text-2xl font-extrabold">Business Performance</h3>
          </div>
        </div>

        <div className="grid sm:grid-cols-2 gap-4">
          <div className="rounded-2xl bg-white/10 backdrop-blur border border-white/20 p-4">
            <div className="text-[10px] uppercase tracking-wider font-extrabold text-white/70">Today</div>
            <div className="mt-2 grid grid-cols-2 gap-3">
              <div>
                <div className="text-[10px] font-bold text-white/60">Revenue</div>
                <div className="text-2xl font-extrabold tabular-nums text-emerald-300">{formatPKR(today.revenue)}</div>
              </div>
              <div>
                <div className="text-[10px] font-bold text-white/60">Collected</div>
                <div className="text-2xl font-extrabold tabular-nums text-cyan-300">{formatPKR(today.collected)}</div>
              </div>
            </div>
            <div className="text-xs text-white/60 font-semibold mt-2">{today.deliveredCount} jobs delivered today</div>
          </div>
          <div className="rounded-2xl bg-white/10 backdrop-blur border border-white/20 p-4">
            <div className="text-[10px] uppercase tracking-wider font-extrabold text-white/70">Last 30 Days</div>
            <div className="mt-2 grid grid-cols-2 gap-3">
              <div>
                <div className="text-[10px] font-bold text-white/60">Revenue</div>
                <div className="text-2xl font-extrabold tabular-nums text-emerald-300">{formatPKR(monthly.revenue)}</div>
              </div>
              <div>
                <div className="text-[10px] font-bold text-white/60">Collected</div>
                <div className="text-2xl font-extrabold tabular-nums text-cyan-300">{formatPKR(monthly.collected)}</div>
              </div>
            </div>
            <div className="text-xs text-white/60 font-semibold mt-2">{monthly.jobCount} total jobs</div>
          </div>
        </div>
      </section>

      {/* QUICK LINKS */}
      <section className="grid grid-cols-2 sm:grid-cols-4 lg:grid-cols-8 gap-3">
        <QuickLink to="/autoparts/jobs" icon={Wrench} label="Jobs" color="orange" />
        <QuickLink to="/autoparts/vehicles" icon={Car} label="Vehicles" color="blue" />
        <QuickLink to="/autoparts/parts" icon={Package} label="Parts Catalog" color="amber" />
        <QuickLink to="/autoparts/makes" icon={Truck} label="Makes" color="rose" />
        <QuickLink to="/autoparts/models" icon={Cog} label="Models" color="fuchsia" />
        <QuickLink to="/autoparts/mechanics" icon={Users} label="Mechanics" color="violet" />
        <QuickLink to="/autoparts/reminders" icon={Bell} label="Reminders" color="cyan" />
        <QuickLink to="/autoparts/jobs/new" icon={Zap} label="Quick Job" color="emerald" />
      </section>

      {/* TWO COLUMNS */}
      <div className="grid lg:grid-cols-2 gap-6">
        {/* UPCOMING JOBS */}
        <div className="rounded-3xl bg-white dark:bg-neutral-900 border border-slate-200 dark:border-neutral-800 shadow-sm overflow-hidden">
          <div className="px-6 py-4 border-b border-slate-100 dark:border-neutral-800 flex items-center justify-between">
            <div>
              <h3 className="text-lg font-bold text-slate-900 dark:text-white flex items-center gap-2">
                <Clock className="h-5 w-5 text-orange-600" />
                Upcoming Jobs
              </h3>
              <p className="text-xs text-slate-500 font-semibold">Promised deliveries coming up</p>
            </div>
            <Link to="/autoparts/jobs" className="text-xs font-extrabold text-orange-600 inline-flex items-center gap-1">
              All <ArrowRight className="h-3 w-3" />
            </Link>
          </div>
          <div className="divide-y divide-slate-100 dark:divide-neutral-800 max-h-96 overflow-y-auto">
            {upcomingJobs.length === 0 ? (
              <div className="py-12 text-center text-sm text-slate-500 font-semibold">
                <CheckCircle2 className="h-8 w-8 text-emerald-500 mx-auto mb-2" />
                No upcoming deliveries
              </div>
            ) : (
              upcomingJobs.map((job: any) => {
                const daysLeft = job.promisedAt ? differenceInDays(new Date(job.promisedAt), new Date()) : null;
                return (
                  <Link key={job.id} to={'/autoparts/jobs/' + job.id} className="px-6 py-3 flex items-center gap-3 hover:bg-slate-50 dark:hover:bg-neutral-800/50 transition">
                    <div className="h-10 w-10 rounded-xl bg-gradient-to-br from-orange-500 to-red-600 text-white flex items-center justify-center shrink-0">
                      <Wrench className="h-5 w-5" />
                    </div>
                    <div className="flex-1 min-w-0">
                      <div className="flex items-center gap-2 flex-wrap">
                        <span className="font-extrabold text-sm text-slate-900 dark:text-white">{job.jobNumber}</span>
                        <span className={
                          'px-1.5 py-0.5 rounded text-[9px] font-extrabold uppercase text-white ' +
                          (job.priority === 'EMERGENCY' || job.priority === 'URGENT' ? 'bg-red-600 animate-pulse' :
                           job.priority === 'HIGH' ? 'bg-amber-500' : 'bg-slate-500')
                        }>
                          {job.priority}
                        </span>
                      </div>
                      <div className="text-xs text-slate-600 font-bold">
                        {job.registrationNumber} • {job.makeName} {job.modelName}
                      </div>
                    </div>
                    <div className="text-right shrink-0">
                      {daysLeft !== null && (
                        <div className={
                          'text-xs font-extrabold ' +
                          (daysLeft <= 0 ? 'text-rose-700' : daysLeft <= 2 ? 'text-amber-700' : 'text-slate-700')
                        }>
                          {daysLeft <= 0 ? 'TODAY' : daysLeft + ' days'}
                        </div>
                      )}
                      <div className="text-[10px] font-bold text-slate-500">{formatPKR(job.total)}</div>
                    </div>
                  </Link>
                );
              })
            )}
          </div>
        </div>

        {/* OVERDUE JOBS */}
        <div className="rounded-3xl bg-white dark:bg-neutral-900 border border-slate-200 dark:border-neutral-800 shadow-sm overflow-hidden">
          <div className="px-6 py-4 border-b border-slate-100 dark:border-neutral-800 flex items-center justify-between">
            <div>
              <h3 className="text-lg font-bold text-slate-900 dark:text-white flex items-center gap-2">
                <AlertCircle className="h-5 w-5 text-rose-600" />
                Overdue Jobs
              </h3>
              <p className="text-xs text-slate-500 font-semibold">Past their promised date</p>
            </div>
            {overdueJobs.length > 0 && (
              <span className="px-2 py-0.5 rounded-full bg-rose-100 text-rose-700 text-xs font-extrabold">
                {overdueJobs.length}
              </span>
            )}
          </div>
          <div className="divide-y divide-slate-100 dark:divide-neutral-800 max-h-96 overflow-y-auto">
            {overdueJobs.length === 0 ? (
              <div className="py-12 text-center text-sm text-slate-500 font-semibold">
                <CheckCircle2 className="h-8 w-8 text-emerald-500 mx-auto mb-2" />
                No overdue jobs
              </div>
            ) : (
              overdueJobs.map((job: any) => {
                const daysOverdue = Math.abs(differenceInDays(new Date(job.promisedAt), new Date()));
                return (
                  <Link key={job.id} to={'/autoparts/jobs/' + job.id} className="px-6 py-3 flex items-center gap-3 hover:bg-rose-50 dark:hover:bg-rose-950/30 transition">
                    <div className="h-10 w-10 rounded-xl bg-rose-500 text-white flex items-center justify-center shrink-0">
                      <AlertCircle className="h-5 w-5" />
                    </div>
                    <div className="flex-1 min-w-0">
                      <div className="font-extrabold text-sm text-slate-900 dark:text-white">{job.jobNumber}</div>
                      <div className="text-xs text-slate-600 font-bold">
                        {job.registrationNumber} • {job.customerName || 'Walk-in'}
                      </div>
                    </div>
                    <div className="text-right shrink-0">
                      <div className="text-xs font-extrabold text-rose-700">{daysOverdue}d overdue</div>
                      <div className="text-[10px] font-bold text-slate-500">Due: {format(new Date(job.promisedAt), 'dd MMM')}</div>
                    </div>
                  </Link>
                );
              })
            )}
          </div>
        </div>
      </div>

      {/* TOP MECHANICS + JOBS BY TYPE */}
      <div className="grid lg:grid-cols-2 gap-6">
        <div className="rounded-3xl bg-white dark:bg-neutral-900 border border-slate-200 dark:border-neutral-800 shadow-sm overflow-hidden">
          <div className="px-6 py-4 border-b border-slate-100 dark:border-neutral-800">
            <h3 className="text-lg font-bold text-slate-900 dark:text-white flex items-center gap-2">
              <Award className="h-5 w-5 text-amber-600" />
              Top Mechanics (30 days)
            </h3>
          </div>
          <div className="divide-y divide-slate-100 dark:divide-neutral-800">
            {topMechanics.length === 0 ? (
              <div className="py-12 text-center text-sm text-slate-500 font-semibold">
                <Users className="h-8 w-8 text-slate-300 mx-auto mb-2" />
                No completed jobs yet
              </div>
            ) : (
              topMechanics.map((m: any, i: number) => (
                <div key={m.mechanicId} className="px-6 py-3 flex items-center gap-3">
                  <div className="h-8 w-8 rounded-lg bg-gradient-to-br from-amber-500 to-orange-600 text-white flex items-center justify-center font-extrabold text-sm shadow shrink-0">
                    {i + 1}
                  </div>
                  {m.photoUrl ? (
                    <img src={m.photoUrl} alt="" className="h-10 w-10 rounded-xl object-cover ring-2 ring-slate-200" />
                  ) : (
                    <div className="h-10 w-10 rounded-xl bg-gradient-to-br from-orange-500 to-red-600 text-white flex items-center justify-center font-extrabold text-sm">
                      {m.name?.charAt(0).toUpperCase() || '?'}
                    </div>
                  )}
                  <div className="flex-1 min-w-0">
                    <div className="font-extrabold text-sm truncate">{m.name}</div>
                    <div className="text-[10px] font-bold text-slate-500">{m.jobs} jobs</div>
                  </div>
                  <div className="text-right shrink-0">
                    <div className="font-extrabold text-emerald-700 tabular-nums text-sm">{formatPKR(m.revenue)}</div>
                  </div>
                </div>
              ))
            )}
          </div>
        </div>

        <div className="rounded-3xl bg-white dark:bg-neutral-900 border border-slate-200 dark:border-neutral-800 shadow-sm p-6">
          <h3 className="text-lg font-bold text-slate-900 dark:text-white mb-4 flex items-center gap-2">
            <Settings className="h-5 w-5 text-orange-600" />
            Jobs by Type (30 days)
          </h3>
          {jobsByType.length === 0 ? (
            <p className="text-sm text-slate-500 font-semibold text-center py-8">No jobs yet</p>
          ) : (
            <div className="space-y-2">
              {jobsByType.slice(0, 8).map((j: any) => (
                <div key={j.jobType} className="flex items-center justify-between p-2 rounded-lg bg-slate-50 dark:bg-neutral-800/50">
                  <span className="text-sm font-extrabold text-slate-700 dark:text-slate-300">{j.jobType.replace(/_/g, ' ')}</span>
                  <span className="text-lg font-extrabold text-orange-700 tabular-nums">{j._count._all}</span>
                </div>
              ))}
            </div>
          )}
        </div>
      </div>
    </div>
  );
}

function KpiCard({ label, value, icon: Icon, color }: any) {
  const colors: Record<string, string> = {
    blue: 'from-blue-500 to-cyan-600',
    orange: 'from-orange-500 to-red-600',
    amber: 'from-amber-500 to-orange-600',
    emerald: 'from-emerald-500 to-green-600',
    violet: 'from-violet-500 to-purple-600',
  };
  return (
    <div className="rounded-2xl bg-white dark:bg-neutral-900 border-2 border-slate-200 dark:border-neutral-800 p-5 shadow-sm hover:shadow-md transition">
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

function AlertCard({ label, value, sub, icon: Icon, to, color }: any) {
  const colors: Record<string, string> = {
    rose: 'from-rose-500 to-red-600',
    amber: 'from-amber-500 to-orange-600',
    orange: 'from-orange-500 to-red-600',
    red: 'from-red-500 to-rose-700',
  };
  return (
    <Link to={to} className="group rounded-2xl bg-white dark:bg-neutral-900 border-2 border-slate-200 dark:border-neutral-800 p-4 hover:shadow-lg hover:-translate-y-0.5 transition">
      <div className="flex items-center justify-between">
        <div>
          <div className="text-xs uppercase tracking-wider text-slate-500 font-bold">{label}</div>
          <div className="mt-1 text-2xl font-extrabold text-slate-900 dark:text-white tabular-nums">{value}</div>
          {sub && <div className="text-xs text-slate-500 font-semibold">{sub}</div>}
        </div>
        <div className={'h-10 w-10 rounded-xl bg-gradient-to-br ' + colors[color] + ' text-white flex items-center justify-center shadow group-hover:scale-110 transition-transform'}>
          <Icon className="h-5 w-5" />
        </div>
      </div>
    </Link>
  );
}

function QuickLink({ to, icon: Icon, label, color }: any) {
  const colors: Record<string, string> = {
    orange: 'from-orange-500 to-red-600',
    blue: 'from-blue-500 to-cyan-600',
    amber: 'from-amber-500 to-orange-600',
    rose: 'from-rose-500 to-red-600',
    fuchsia: 'from-fuchsia-500 to-pink-600',
    violet: 'from-violet-500 to-purple-600',
    cyan: 'from-cyan-500 to-blue-600',
    emerald: 'from-emerald-500 to-green-600',
  };
  return (
    <Link to={to} className="group rounded-2xl bg-white dark:bg-neutral-900 border-2 border-slate-200 dark:border-neutral-800 p-4 hover:border-slate-300 hover:shadow-lg hover:-translate-y-0.5 transition">
      <div className={'h-11 w-11 rounded-xl bg-gradient-to-br ' + colors[color] + ' text-white flex items-center justify-center shadow-lg group-hover:scale-110 transition-transform mb-2'}>
        <Icon className="h-5 w-5" />
      </div>
      <div className="text-xs font-extrabold text-slate-900 dark:text-white">{label}</div>
    </Link>
  );
}
