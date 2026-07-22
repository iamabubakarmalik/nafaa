import { useQuery } from '@tanstack/react-query';
import { Link } from 'react-router-dom';
import {
  Dumbbell, Users, UserCheck, Calendar, DollarSign, TrendingUp, Sparkles,
  RefreshCw, ArrowRight, Activity, Zap, Award, AlertCircle, Clock, Flame,
  Target, Heart, LogIn, LogOut,
} from 'lucide-react';
import { gymDashboardApi } from '../api/dashboard.api';
import { formatPKR } from '@/lib/format';
import { Button } from '@/components/ui/Button';
import { format, differenceInMinutes, differenceInDays } from 'date-fns';

const GOAL_EMOJI: Record<string, string> = {
  WEIGHT_LOSS: '🔥', MUSCLE_GAIN: '💪', BODY_BUILDING: '🏆', STRENGTH: '⚡',
  ENDURANCE: '🏃', CARDIO: '❤️', FLEXIBILITY: '🧘', REHABILITATION: '🩹',
  GENERAL_FITNESS: '🎯', COMPETITION_PREP: '🥇', WEIGHT_GAIN: '📈', TONING: '✨', OTHER: '⭐',
};

export default function GymDashboardPage() {
  const { data: overview, isLoading, refetch, isRefetching } = useQuery({
    queryKey: ['gym-dashboard'],
    queryFn: () => gymDashboardApi.overview(),
    refetchInterval: 30_000,
  });

  const totals = overview?.totals ?? { totalMembers: 0, activeMembers: 0, totalTrainers: 0, activeMemberships: 0 };
  const today = overview?.today ?? { checkIns: 0, currentlyInside: 0, classes: 0, classBookings: 0, revenue: 0 };
  const monthly = overview?.monthly ?? { revenue: 0, collected: 0 };
  const alerts = overview?.alerts ?? { expiringMemberships: 0 };
  const upcomingClasses = overview?.upcomingClasses ?? [];
  const byGoal = overview?.byGoal ?? [];
  const recentCheckIns = overview?.recentCheckIns ?? [];

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
      <section className="relative overflow-hidden rounded-3xl bg-gradient-to-br from-slate-950 via-red-900 to-orange-700 text-white p-6 sm:p-8 shadow-2xl">
        <div className="absolute -top-20 -right-20 h-72 w-72 rounded-full bg-red-400/20 blur-3xl" />
        <div className="absolute -bottom-20 -left-20 h-72 w-72 rounded-full bg-orange-400/15 blur-3xl" />

        <div className="relative flex flex-col lg:flex-row lg:items-center lg:justify-between gap-5">
          <div>
            <div className="inline-flex items-center gap-2 rounded-full bg-white/15 backdrop-blur px-3 py-1 text-xs font-extrabold border border-white/20">
              <Sparkles className="h-3.5 w-3.5 text-amber-300" />
              Fitness Command Center
            </div>
            <h1 className="mt-3 text-3xl sm:text-4xl font-extrabold leading-tight">
              🏋️ Gym Dashboard
            </h1>
            <p className="mt-2 text-sm text-white/80 font-semibold">
              Members, classes, trainers — poori fitness club ek jagah
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
            <Link to="/gym/attendance">
              <Button className="bg-white text-slate-900 hover:bg-slate-100">
                <LogIn className="h-4 w-4" />
                Check-in Member
              </Button>
            </Link>
          </div>
        </div>
      </section>

      {/* TODAY KPIs */}
      <section className="grid grid-cols-2 lg:grid-cols-4 gap-4">
        <KpiCard label="Today's Check-ins" value={today.checkIns} icon={LogIn} color="red" sub="Total visits today" />
        <KpiCard label="Currently Inside" value={today.currentlyInside} icon={Activity} color="emerald" sub="Live count" pulse={today.currentlyInside > 0} />
        <KpiCard label="Classes Today" value={today.classes} icon={Calendar} color="orange" sub={today.classBookings + ' bookings'} />
        <KpiCard label="Today's Revenue" value={formatPKR(today.revenue)} icon={DollarSign} color="amber" />
      </section>

      {/* MONTHLY + ALERTS */}
      <section className="grid lg:grid-cols-3 gap-6">
        <div className="lg:col-span-2 rounded-3xl bg-gradient-to-br from-slate-950 to-red-900 text-white p-6 shadow-xl">
          <div className="flex items-center justify-between mb-4">
            <div>
              <div className="inline-flex items-center gap-2 rounded-full bg-white/15 backdrop-blur px-3 py-1 text-xs font-extrabold border border-white/20">
                <TrendingUp className="h-3.5 w-3.5 text-amber-300" />
                Last 30 Days
              </div>
              <h3 className="mt-2 text-2xl font-extrabold">Monthly Overview</h3>
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
        </div>

        {/* Alerts card */}
        <div className={
          'rounded-3xl shadow-xl p-6 text-white ' +
          (alerts.expiringMemberships > 0 ? 'bg-gradient-to-br from-amber-500 to-red-600' : 'bg-gradient-to-br from-emerald-500 to-green-700')
        }>
          <div className="inline-flex items-center gap-2 rounded-full bg-white/15 backdrop-blur px-3 py-1 text-xs font-extrabold border border-white/20 mb-3">
            <AlertCircle className="h-3.5 w-3.5 text-amber-300" />
            Alerts
          </div>
          <div className="text-6xl font-extrabold tabular-nums">{alerts.expiringMemberships}</div>
          <div className="mt-2 text-sm font-bold text-white/80">
            Memberships expiring in 7 days
          </div>
          {alerts.expiringMemberships > 0 ? (
            <Link to="/gym/memberships?expiringDays=7">
              <button className="mt-4 w-full rounded-xl bg-white/15 hover:bg-white/25 backdrop-blur border border-white/20 py-2 text-sm font-extrabold">
                View Renewals →
              </button>
            </Link>
          ) : (
            <div className="mt-4 rounded-xl bg-white/15 backdrop-blur border border-white/20 py-2 px-3 text-sm font-extrabold flex items-center gap-2">
              <Award className="h-4 w-4" />
              All good!
            </div>
          )}
        </div>
      </section>

      {/* MINI KPIs */}
      <section className="grid grid-cols-2 lg:grid-cols-4 gap-3">
        <MiniKpi label="Total Members" value={totals.totalMembers} icon={Users} color="red" to="/gym/members" />
        <MiniKpi label="Active Members" value={totals.activeMembers} icon={UserCheck} color="emerald" to="/gym/members?status=ACTIVE" />
        <MiniKpi label="Trainers" value={totals.totalTrainers} icon={Dumbbell} color="violet" to="/gym/trainers" />
        <MiniKpi label="Active Memberships" value={totals.activeMemberships} icon={Award} color="amber" to="/gym/memberships" />
      </section>

      {/* QUICK LINKS */}
      <section className="grid grid-cols-2 sm:grid-cols-4 lg:grid-cols-8 gap-3">
        <QuickLink to="/gym/members" icon={Users} label="Members" color="red" />
        <QuickLink to="/gym/attendance" icon={LogIn} label="Check-in" color="emerald" />
        <QuickLink to="/gym/memberships" icon={Award} label="Memberships" color="amber" />
        <QuickLink to="/gym/plans" icon={Target} label="Plans" color="fuchsia" />
        <QuickLink to="/gym/trainers" icon={Dumbbell} label="Trainers" color="violet" />
        <QuickLink to="/gym/classes" icon={Calendar} label="Classes" color="blue" />
        <QuickLink to="/gym/equipment" icon={Zap} label="Equipment" color="orange" />
        <QuickLink to="/gym/personal-training" icon={Flame} label="PT Sessions" color="rose" />
      </section>

      <div className="grid lg:grid-cols-2 gap-6">
        {/* UPCOMING CLASSES */}
        <div className="rounded-3xl bg-white dark:bg-neutral-900 border border-slate-200 dark:border-neutral-800 shadow-sm overflow-hidden">
          <div className="px-6 py-4 border-b border-slate-100 dark:border-neutral-800 flex items-center justify-between">
            <div>
              <h3 className="text-lg font-bold text-slate-900 dark:text-white flex items-center gap-2">
                <Calendar className="h-5 w-5 text-blue-600" />
                Upcoming Classes Today
              </h3>
              <p className="text-xs text-slate-500 font-semibold">Yoga, Zumba, HIIT, etc.</p>
            </div>
            <Link to="/gym/classes" className="text-xs font-extrabold text-blue-600 inline-flex items-center gap-1">
              All <ArrowRight className="h-3 w-3" />
            </Link>
          </div>
          <div className="divide-y divide-slate-100 dark:divide-neutral-800 max-h-96 overflow-y-auto">
            {upcomingClasses.length === 0 ? (
              <div className="py-12 text-center text-sm text-slate-500 font-semibold">
                <Calendar className="h-8 w-8 text-slate-300 mx-auto mb-2" />
                No classes scheduled today
              </div>
            ) : (
              upcomingClasses.map((cls: any) => {
                const minsToStart = differenceInMinutes(new Date(cls.scheduledStart), new Date());
                const isSoon = minsToStart <= 30 && minsToStart >= 0;
                const isFull = cls.currentEnrolled >= cls.maxParticipants;
                return (
                  <Link key={cls.id} to={'/gym/classes/' + cls.id} className="px-6 py-3 flex items-center gap-3 hover:bg-slate-50 dark:hover:bg-neutral-800/50 transition">
                    <div className="h-10 w-10 rounded-xl bg-gradient-to-br from-blue-500 to-cyan-600 text-white flex items-center justify-center shrink-0">
                      <Calendar className="h-5 w-5" />
                    </div>
                    <div className="flex-1 min-w-0">
                      <div className="flex items-center gap-2 flex-wrap">
                        <span className="font-extrabold text-sm">{cls.name}</span>
                        <span className="px-1.5 py-0.5 rounded bg-slate-100 dark:bg-neutral-800 text-slate-700 text-[9px] font-extrabold uppercase">
                          {cls.classType?.replace('_', ' ')}
                        </span>
                        {isSoon && <span className="px-1.5 py-0.5 rounded bg-amber-500 text-white text-[9px] font-extrabold uppercase animate-pulse">SOON</span>}
                        {isFull && <span className="px-1.5 py-0.5 rounded bg-rose-500 text-white text-[9px] font-extrabold uppercase">FULL</span>}
                      </div>
                      <div className="text-xs text-slate-500 font-semibold truncate">
                        {cls.trainer?.staff?.firstName || cls.trainer?.staff?.name || 'No trainer'} • {cls.currentEnrolled}/{cls.maxParticipants} enrolled
                      </div>
                    </div>
                    <div className="text-right shrink-0">
                      <div className="text-sm font-extrabold text-slate-900">
                        {format(new Date(cls.scheduledStart), 'HH:mm')}
                      </div>
                      <div className="text-[10px] font-bold text-slate-500">
                        {cls.durationMinutes}min
                      </div>
                    </div>
                  </Link>
                );
              })
            )}
          </div>
        </div>

        {/* RECENT CHECK-INS */}
        <div className="rounded-3xl bg-white dark:bg-neutral-900 border border-slate-200 dark:border-neutral-800 shadow-sm overflow-hidden">
          <div className="px-6 py-4 border-b border-slate-100 dark:border-neutral-800 flex items-center justify-between">
            <div>
              <h3 className="text-lg font-bold text-slate-900 dark:text-white flex items-center gap-2">
                <Activity className="h-5 w-5 text-emerald-600" />
                Recent Check-ins
              </h3>
              <p className="text-xs text-slate-500 font-semibold">Latest gym activity</p>
            </div>
            <Link to="/gym/attendance" className="text-xs font-extrabold text-emerald-600 inline-flex items-center gap-1">
              All <ArrowRight className="h-3 w-3" />
            </Link>
          </div>
          <div className="divide-y divide-slate-100 dark:divide-neutral-800 max-h-96 overflow-y-auto">
            {recentCheckIns.length === 0 ? (
              <div className="py-12 text-center text-sm text-slate-500 font-semibold">
                <LogIn className="h-8 w-8 text-slate-300 mx-auto mb-2" />
                No recent check-ins
              </div>
            ) : (
              recentCheckIns.map((att: any) => {
                const isInside = !att.checkOutAt;
                const duration = att.checkOutAt
                  ? differenceInMinutes(new Date(att.checkOutAt), new Date(att.checkInAt))
                  : differenceInMinutes(new Date(), new Date(att.checkInAt));
                return (
                  <div key={att.id} className="px-6 py-3 flex items-center gap-3">
                    <div className={
                      'h-10 w-10 rounded-xl text-white flex items-center justify-center shrink-0 ' +
                      (isInside ? 'bg-gradient-to-br from-emerald-500 to-green-600' : 'bg-gradient-to-br from-slate-400 to-slate-600')
                    }>
                      {isInside ? <LogIn className="h-5 w-5" /> : <LogOut className="h-5 w-5" />}
                    </div>
                    <div className="flex-1 min-w-0">
                      <div className="flex items-center gap-2 flex-wrap">
                        <span className="font-extrabold text-sm">{att.member?.memberNumber || 'Guest'}</span>
                        {isInside && <span className="px-1.5 py-0.5 rounded bg-emerald-600 text-white text-[9px] font-extrabold uppercase">INSIDE</span>}
                        <span className="px-1.5 py-0.5 rounded bg-slate-100 dark:bg-neutral-800 text-slate-600 text-[9px] font-extrabold uppercase">{att.method}</span>
                      </div>
                      <div className="text-xs text-slate-500 font-semibold">
                        {format(new Date(att.checkInAt), 'HH:mm')} • {duration}min {isInside ? '(ongoing)' : ''}
                      </div>
                    </div>
                  </div>
                );
              })
            )}
          </div>
        </div>
      </div>

      {/* MEMBERS BY GOAL */}
      <section className="rounded-3xl bg-white dark:bg-neutral-900 border border-slate-200 dark:border-neutral-800 shadow-sm p-6">
        <h3 className="text-lg font-bold text-slate-900 dark:text-white mb-4 flex items-center gap-2">
          <Target className="h-5 w-5 text-fuchsia-600" />
          Members by Goal
        </h3>
        {byGoal.length === 0 ? (
          <p className="text-sm text-slate-500 font-semibold text-center py-8">No data yet</p>
        ) : (
          <div className="grid grid-cols-2 sm:grid-cols-4 lg:grid-cols-6 gap-3">
            {byGoal.map((g: any) => (
              <div key={g.primaryGoal} className="rounded-2xl bg-gradient-to-br from-slate-50 to-slate-100 dark:from-neutral-800 dark:to-neutral-800/50 p-4 border-2 border-slate-200 dark:border-neutral-700 text-center">
                <div className="text-4xl mb-2">{GOAL_EMOJI[g.primaryGoal] || '🎯'}</div>
                <div className="text-[10px] font-extrabold uppercase text-slate-700 mb-1">
                  {g.primaryGoal.replace('_', ' ')}
                </div>
                <div className="text-2xl font-extrabold text-slate-900 dark:text-white tabular-nums">{g._count._all}</div>
                <div className="text-[10px] font-bold text-slate-500">members</div>
              </div>
            ))}
          </div>
        )}
      </section>
    </div>
  );
}

function KpiCard({ label, value, sub, icon: Icon, color, pulse }: any) {
  const colors: Record<string, string> = {
    red: 'from-red-500 to-rose-600',
    emerald: 'from-emerald-500 to-green-600',
    orange: 'from-orange-500 to-red-600',
    amber: 'from-amber-500 to-orange-600',
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
          ' text-white flex items-center justify-center shadow-lg shrink-0 ' +
          (pulse ? 'animate-pulse' : '')
        }>
          <Icon className="h-6 w-6" />
        </div>
      </div>
    </div>
  );
}

function MiniKpi({ label, value, icon: Icon, color, to }: any) {
  const colors: Record<string, string> = {
    red: 'from-red-500 to-rose-600',
    emerald: 'from-emerald-500 to-green-600',
    violet: 'from-violet-500 to-purple-600',
    amber: 'from-amber-500 to-orange-600',
  };
  return (
    <Link to={to} className="group rounded-2xl bg-white dark:bg-neutral-900 border-2 border-slate-200 dark:border-neutral-800 p-4 hover:shadow-lg hover:-translate-y-0.5 transition text-center">
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
    red: 'from-red-500 to-rose-600',
    emerald: 'from-emerald-500 to-green-600',
    amber: 'from-amber-500 to-orange-600',
    fuchsia: 'from-fuchsia-500 to-pink-600',
    violet: 'from-violet-500 to-purple-600',
    blue: 'from-blue-500 to-cyan-600',
    orange: 'from-orange-500 to-red-600',
    rose: 'from-rose-500 to-red-600',
  };
  return (
    <Link to={to} className="group rounded-2xl bg-white dark:bg-neutral-900 border-2 border-slate-200 dark:border-neutral-800 p-4 hover:border-slate-300 hover:shadow-lg hover:-translate-y-0.5 transition">
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
