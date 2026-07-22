import { useQuery } from '@tanstack/react-query';
import { Link } from 'react-router-dom';
import {
  Dumbbell, Users, Award, Calendar, Flame, Activity, TrendingUp, TrendingDown,
  Clock, ArrowRight, LogIn, Target, Zap, Star, Sparkles, AlertTriangle,
  CheckCircle2, Wrench, DollarSign, BarChart3, UserPlus, Heart,
} from 'lucide-react';
import {
  ResponsiveContainer, AreaChart, Area, BarChart, Bar, PieChart, Pie, Cell,
  XAxis, YAxis, Tooltip, CartesianGrid, Legend,
} from 'recharts';
import { dashboardApi } from '@modules/dashboard/api/dashboard.api';
import { gymDashboardApi } from '../api/dashboard.api';
import { gymMembersApi } from '../api/members.api';
import { attendanceApi } from '../api/attendance.api';
import { classesApi } from '../api/classes.api';
import { equipmentApi } from '../api/equipment.api';
import { membershipsApi } from '../api/memberships.api';
import { formatPKR } from '@core/lib/format';
import { SubscriptionBanner } from '@modules/dashboard/components/SubscriptionBanner';
import { EmailVerifyBanner } from '@core/components/auth/EmailVerifyBanner';
import {
  DashboardHero, HeroKpiCard, QuickStat, PnLCard,
  formatPercent,
} from '@modules/dashboard/components/shared/DashboardShared';
import { format, differenceInDays, differenceInMinutes } from 'date-fns';

export default function GymDashboardV2() {
  const { data, refetch, isRefetching } = useQuery({
    queryKey: ['dashboard-overview'],
    queryFn: dashboardApi.overview,
    refetchInterval: 60_000,
  });

  const { data: gDash } = useQuery({
    queryKey: ['gym-dashboard'],
    queryFn: () => gymDashboardApi.overview().catch(() => null),
    refetchInterval: 60_000,
  });

  const { data: currentlyInside = [] } = useQuery({
    queryKey: ['currently-inside'],
    queryFn: () => attendanceApi.currentlyInside(),
    refetchInterval: 15_000,
  });

  const { data: membersSummary } = useQuery({
    queryKey: ['gym-members-summary'],
    queryFn: () => gymMembersApi.summary(),
  });

  const { data: todayClasses = [] } = useQuery({
    queryKey: ['classes-today'],
    queryFn: () => {
      const start = new Date(); start.setHours(0, 0, 0, 0);
      const end = new Date(); end.setHours(23, 59, 59, 999);
      return classesApi.calendar(start.toISOString(), end.toISOString());
    },
    refetchInterval: 60_000,
  });

  const { data: allMembers = [] } = useQuery({
    queryKey: ['members-all-for-dash'],
    queryFn: () => gymMembersApi.list({ status: 'ACTIVE' }),
  });

  const { data: equipmentSummary } = useQuery({
    queryKey: ['equipment-summary'],
    queryFn: () => equipmentApi.summary().catch(() => null),
  });

  const { data: allMemberships = [] } = useQuery({
    queryKey: ['memberships-all'],
    queryFn: () => membershipsApi.list({}),
  });

  const stats = data?.stats;
  const tenant = data?.tenant;

  // Compute streaks & churn
  const streakLeaders = [...allMembers].sort((a, b) => (b.currentStreak || 0) - (a.currentStreak || 0)).slice(0, 5);

  const expiringMemberships = allMemberships.filter((m: any) => {
    if (m.status !== 'ACTIVE') return false;
    const days = differenceInDays(new Date(m.endDate), new Date());
    return days >= 0 && days <= 7;
  });

  const overdueMemberships = allMemberships.filter((m: any) => m.balanceDue > 0);

  const trendData = (data?.salesTrend7Days ?? []).map((p) => {
    const d = new Date(p.date);
    const dayName = ['Sun', 'Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat'][d.getDay()];
    return { ...p, label: dayName };
  });

  const growthVsYesterday = stats?.salesGrowthVsYesterday ?? 0;
  const growthVsLastMonth = stats?.salesGrowthVsLastMonth ?? 0;

  // Occupancy percentage (assume 100 = full for viz)
  const maxCapacity = 100;
  const occupancyPct = Math.min((currentlyInside.length / maxCapacity) * 100, 100);

  return (
    <div className="space-y-6">
      <SubscriptionBanner />
      <EmailVerifyBanner />

      <DashboardHero
        gradient="from-slate-950 via-red-900 to-orange-700"
        emoji="💪"
        industryLabel="Gym"
        industryBadgeColor="bg-red-500/30 border border-red-300/40"
        tenantName={tenant?.name}
        netProfit={stats?.netProfitToday ?? 0}
        salesToday={stats?.salesToday ?? 0}
        cogsToday={stats?.cogsToday ?? 0}
        expensesToday={stats?.expensesToday ?? 0}
        growthVsYesterday={growthVsYesterday}
        onRefresh={() => refetch()}
        isRefetching={isRefetching}
        posLabel="Open Gym POS"
        posLink="/pos"
      />

      {/* ─── LIVE OCCUPANCY BANNER ─── */}
      <section className="rounded-3xl bg-gradient-to-br from-emerald-100 via-green-50 to-teal-100 border-2 border-emerald-300 shadow-lg p-5">
        <div className="flex items-center justify-between flex-wrap gap-3">
          <div className="flex items-center gap-4">
            <div className="h-16 w-16 rounded-2xl bg-gradient-to-br from-emerald-500 to-green-600 text-white flex items-center justify-center shadow-lg animate-pulse">
              <Activity className="h-8 w-8" />
            </div>
            <div>
              <div className="text-[10px] uppercase tracking-wider font-extrabold text-emerald-700">Live Occupancy</div>
              <div className="text-3xl font-extrabold text-slate-900">{currentlyInside.length} members inside</div>
              <div className="text-sm text-slate-700 font-semibold mt-0.5">
                {occupancyPct.toFixed(0)}% of capacity • Real-time
              </div>
            </div>
          </div>
          <Link to="/gym/attendance">
            <button className="px-4 py-2 rounded-xl bg-gradient-to-r from-emerald-600 to-green-700 text-white font-extrabold text-sm shadow-lg hover:shadow-xl hover:-translate-y-0.5 transition inline-flex items-center gap-2">
              <LogIn className="h-4 w-4" /> Check-in Kiosk <ArrowRight className="h-3.5 w-3.5" />
            </button>
          </Link>
        </div>
        <div className="mt-4 h-3 rounded-full bg-white/60 overflow-hidden">
          <div
            className="h-full bg-gradient-to-r from-emerald-500 via-green-500 to-teal-600 transition-all"
            style={{ width: occupancyPct + '%' }}
          />
        </div>
      </section>

      {/* ─── KPI GRID ─── */}
      <section className="grid sm:grid-cols-2 lg:grid-cols-4 gap-4">
        <HeroKpiCard title="Active Members" value={membersSummary?.active ?? allMembers.length} subtitle="Currently training" icon={Users} color="from-red-500 to-orange-600" isHighlight />
        <HeroKpiCard title="Today Check-ins" value={currentlyInside.length} subtitle="Live count" icon={LogIn} color="from-emerald-500 to-green-600" />
        <HeroKpiCard title="Classes Today" value={todayClasses.length} subtitle={todayClasses.filter((c: any) => c.status === 'SCHEDULED').length + ' scheduled'} icon={Calendar} color="from-blue-500 to-cyan-600" />
        <HeroKpiCard title="Expiring Soon" value={expiringMemberships.length} subtitle="Next 7 days" icon={AlertTriangle} color="from-amber-500 to-orange-700" trend={growthVsYesterday} />
      </section>

      {/* ─── EXPIRING/OVERDUE ALERTS ─── */}
      {(expiringMemberships.length > 0 || overdueMemberships.length > 0) && (
        <section className="grid lg:grid-cols-2 gap-5">
          {expiringMemberships.length > 0 && (
            <div className="rounded-3xl bg-gradient-to-br from-amber-50 to-orange-50 border-2 border-amber-300 shadow-lg p-5">
              <div className="flex items-center gap-3 mb-3">
                <div className="h-11 w-11 rounded-2xl bg-gradient-to-br from-amber-500 to-orange-600 text-white flex items-center justify-center shadow">
                  <AlertTriangle className="h-5 w-5" />
                </div>
                <div>
                  <h3 className="font-extrabold text-amber-900">Expiring Memberships</h3>
                  <p className="text-xs text-amber-700 font-bold">{expiringMemberships.length} members need renewal</p>
                </div>
              </div>
              <div className="space-y-1.5 max-h-56 overflow-y-auto">
                {expiringMemberships.slice(0, 5).map((m: any) => {
                  const days = differenceInDays(new Date(m.endDate), new Date());
                  return (
                    <Link key={m.id} to={'/gym-members/' + m.memberId} className="flex items-center justify-between p-2 rounded-lg bg-white hover:bg-amber-100 transition">
                      <div className="text-sm font-extrabold truncate">{m.member?.customer?.name || 'Member'}</div>
                      <div className={'text-xs font-extrabold ' + (days <= 2 ? 'text-red-700' : 'text-amber-700')}>
                        {days === 0 ? '⚠️ Today' : days + 'd left'}
                      </div>
                    </Link>
                  );
                })}
              </div>
            </div>
          )}

          {overdueMemberships.length > 0 && (
            <div className="rounded-3xl bg-gradient-to-br from-rose-50 to-red-50 border-2 border-rose-300 shadow-lg p-5">
              <div className="flex items-center gap-3 mb-3">
                <div className="h-11 w-11 rounded-2xl bg-gradient-to-br from-rose-500 to-red-600 text-white flex items-center justify-center shadow">
                  <DollarSign className="h-5 w-5" />
                </div>
                <div>
                  <h3 className="font-extrabold text-rose-900">Outstanding Balances</h3>
                  <p className="text-xs text-rose-700 font-bold">{overdueMemberships.length} members with dues</p>
                </div>
              </div>
              <div className="space-y-1.5 max-h-56 overflow-y-auto">
                {overdueMemberships.slice(0, 5).map((m: any) => (
                  <Link key={m.id} to={'/gym-members/' + m.memberId} className="flex items-center justify-between p-2 rounded-lg bg-white hover:bg-rose-100 transition">
                    <div className="text-sm font-extrabold truncate">{m.member?.customer?.name || 'Member'}</div>
                    <div className="text-xs font-extrabold text-rose-700 tabular-nums">{formatPKR(m.balanceDue)}</div>
                  </Link>
                ))}
              </div>
            </div>
          )}
        </section>
      )}

      {/* ─── SALES TREND ─── */}
      <section className="rounded-3xl bg-white border border-slate-200 shadow-sm p-6">
        <div className="flex items-center justify-between mb-5">
          <div>
            <h3 className="text-xl font-bold text-slate-900">7-Day Gym Revenue</h3>
            <p className="text-sm text-slate-500">Memberships, PT, retail</p>
          </div>
          <Link to="/reports" className="text-red-700 text-sm font-bold inline-flex items-center gap-1">
            Reports <ArrowRight className="h-4 w-4" />
          </Link>
        </div>
        {trendData.length >= 2 ? (
          <div className="h-[280px]">
            <ResponsiveContainer width="100%" height="100%">
              <AreaChart data={trendData}>
                <defs>
                  <linearGradient id="gSales" x1="0" y1="0" x2="0" y2="1">
                    <stop offset="0%" stopColor="#dc2626" stopOpacity={0.4} />
                    <stop offset="100%" stopColor="#dc2626" stopOpacity={0} />
                  </linearGradient>
                  <linearGradient id="gProfit" x1="0" y1="0" x2="0" y2="1">
                    <stop offset="0%" stopColor="#10b981" stopOpacity={0.3} />
                    <stop offset="100%" stopColor="#10b981" stopOpacity={0} />
                  </linearGradient>
                </defs>
                <CartesianGrid strokeDasharray="3 3" stroke="#e2e8f0" />
                <XAxis dataKey="label" stroke="#64748b" fontSize={12} />
                <YAxis stroke="#64748b" fontSize={11} tickFormatter={(v) => (v / 1000).toFixed(0) + 'k'} />
                <Tooltip formatter={(v: any) => formatPKR(Number(v))} contentStyle={{ borderRadius: 12 }} />
                <Legend wrapperStyle={{ fontSize: 11 }} />
                <Area type="monotone" dataKey="sales" name="Sales" stroke="#dc2626" fill="url(#gSales)" strokeWidth={2.5} />
                <Area type="monotone" dataKey="profit" name="Profit" stroke="#10b981" fill="url(#gProfit)" strokeWidth={2} />
              </AreaChart>
            </ResponsiveContainer>
          </div>
        ) : <div className="h-[280px] flex items-center justify-center text-sm text-slate-500">Need more data</div>}
      </section>

      {/* ─── P&L ─── */}
      <section className="rounded-3xl bg-white border border-slate-200 shadow-sm p-6">
        <div className="flex items-center justify-between mb-5 flex-wrap gap-2">
          <div>
            <h3 className="text-xl font-bold text-slate-900">Profit & Loss — This Month</h3>
            <p className="text-sm text-slate-500">Gym monthly performance</p>
          </div>
          {growthVsLastMonth !== 0 && (
            <div className={'inline-flex items-center gap-1.5 px-3 py-1.5 rounded-xl text-sm font-extrabold ' + (growthVsLastMonth >= 0 ? 'bg-emerald-100 text-emerald-700' : 'bg-rose-100 text-rose-700')}>
              {growthVsLastMonth >= 0 ? <TrendingUp className="h-3.5 w-3.5" /> : <TrendingDown className="h-3.5 w-3.5" />}
              {formatPercent(growthVsLastMonth)} vs last month
            </div>
          )}
        </div>
        <div className="grid sm:grid-cols-4 gap-3">
          <PnLCard label="Revenue" value={formatPKR(stats?.salesMonth ?? 0)} sub={(stats?.ordersMonth ?? 0) + ' orders'} color="emerald" />
          <PnLCard label="Trainer Commission" value={formatPKR(stats?.cogsMonth ?? 0)} sub="Paid to trainers" color="rose" />
          <PnLCard label="Expenses" value={formatPKR(stats?.expensesMonth ?? 0)} sub="Rent, utility, staff" color="amber" />
          <PnLCard label="Net Profit" value={formatPKR(stats?.netProfitMonth ?? 0)} sub="Bottom line" color="violet" isHighlight />
        </div>
      </section>

      {/* ─── QUICK ACCESS ─── */}
      <section className="grid grid-cols-2 sm:grid-cols-4 lg:grid-cols-8 gap-3">
        <QuickLink to="/gym/attendance" icon={LogIn} label="Check-in" color="emerald" badge="HOT" />
        <QuickLink to="/gym-members/new" icon={UserPlus} label="+ Member" color="red" />
        <QuickLink to="/gym/members" icon={Users} label="Members" color="orange" />
        <QuickLink to="/gym/plans" icon={Target} label="Plans" color="fuchsia" />
        <QuickLink to="/gym/trainers" icon={Dumbbell} label="Trainers" color="violet" />
        <QuickLink to="/gym/classes" icon={Calendar} label="Classes" color="blue" />
        <QuickLink to="/gym/personal-training" icon={Flame} label="PT" color="rose" />
        <QuickLink to="/gym/equipment" icon={Wrench} label="Equipment" color="amber" />
      </section>

      {/* ─── STREAK LEADERS + TODAY CLASSES ─── */}
      <section className="grid lg:grid-cols-2 gap-6">
        <div className="rounded-3xl bg-white border border-slate-200 shadow-sm overflow-hidden">
          <div className="px-6 py-4 border-b border-slate-100 flex items-center justify-between">
            <div>
              <h3 className="text-lg font-bold flex items-center gap-2">
                <Flame className="h-5 w-5 text-orange-600" />
                Streak Leaders 🔥
              </h3>
              <p className="text-xs text-slate-500 font-semibold">Consistent members</p>
            </div>
            <Link to="/gym/members" className="text-xs font-extrabold text-orange-600 inline-flex items-center gap-1">All <ArrowRight className="h-3 w-3" /></Link>
          </div>
          <div className="divide-y divide-slate-100">
            {streakLeaders.length === 0 ? (
              <div className="py-12 text-center text-sm text-slate-500 font-semibold">No streak data</div>
            ) : (
              streakLeaders.map((m: any, idx: number) => (
                <Link key={m.id} to={'/gym-members/' + m.id} className="px-6 py-3 flex items-center gap-3 hover:bg-orange-50 transition">
                  <div className={
                    'h-8 w-8 rounded-lg flex items-center justify-center font-extrabold text-white text-sm ' +
                    (idx === 0 ? 'bg-amber-500' : idx === 1 ? 'bg-slate-400' : idx === 2 ? 'bg-orange-600' : 'bg-slate-300')
                  }>
                    {idx < 3 ? '🏆' : idx + 1}
                  </div>
                  {m.photoUrl ? (
                    <img src={m.photoUrl} className="h-10 w-10 rounded-xl object-cover" />
                  ) : (
                    <div className="h-10 w-10 rounded-xl bg-gradient-to-br from-red-500 to-orange-600 text-white flex items-center justify-center font-extrabold">
                      {m.customer?.name?.charAt(0).toUpperCase()}
                    </div>
                  )}
                  <div className="flex-1 min-w-0">
                    <div className="font-extrabold text-sm truncate">{m.customer?.name}</div>
                    <div className="text-[10px] font-mono font-bold text-slate-500">{m.memberNumber}</div>
                  </div>
                  <div className="text-right">
                    <div className="text-lg font-extrabold text-orange-700 tabular-nums">🔥 {m.currentStreak}d</div>
                    <div className="text-[9px] font-bold text-slate-500">Best: {m.longestStreak}d</div>
                  </div>
                </Link>
              ))
            )}
          </div>
        </div>

        <div className="rounded-3xl bg-white border border-slate-200 shadow-sm overflow-hidden">
          <div className="px-6 py-4 border-b border-slate-100 flex items-center justify-between">
            <div>
              <h3 className="text-lg font-bold flex items-center gap-2">
                <Calendar className="h-5 w-5 text-blue-600" />
                Today's Classes
              </h3>
              <p className="text-xs text-slate-500 font-semibold">{todayClasses.length} scheduled</p>
            </div>
            <Link to="/gym/classes" className="text-xs font-extrabold text-blue-600 inline-flex items-center gap-1">All <ArrowRight className="h-3 w-3" /></Link>
          </div>
          <div className="divide-y divide-slate-100 max-h-96 overflow-y-auto">
            {todayClasses.length === 0 ? (
              <div className="py-12 text-center text-sm text-slate-500 font-semibold">
                <Calendar className="h-8 w-8 text-slate-300 mx-auto mb-2" />
                No classes today
              </div>
            ) : (
              todayClasses
                .sort((a: any, b: any) => new Date(a.scheduledStart).getTime() - new Date(b.scheduledStart).getTime())
                .slice(0, 8)
                .map((cls: any) => {
                  const now = new Date();
                  const start = new Date(cls.scheduledStart);
                  const minsToStart = differenceInMinutes(start, now);
                  const isSoon = minsToStart >= 0 && minsToStart <= 30;
                  const isPast = start < now && cls.status !== 'IN_PROGRESS';
                  return (
                    <div key={cls.id} className="px-6 py-3 flex items-center gap-3">
                      <div className={
                        'h-10 w-10 rounded-xl text-white flex items-center justify-center shrink-0 ' +
                        (cls.status === 'IN_PROGRESS' ? 'bg-amber-500 animate-pulse'
                          : cls.status === 'COMPLETED' ? 'bg-emerald-600'
                          : isSoon ? 'bg-blue-500 animate-pulse'
                          : 'bg-gradient-to-br from-blue-500 to-cyan-600')
                      }>
                        <Calendar className="h-5 w-5" />
                      </div>
                      <div className="flex-1 min-w-0">
                        <div className="flex items-center gap-2 flex-wrap">
                          <span className="font-extrabold text-sm truncate">{cls.name}</span>
                          <span className="px-1.5 py-0.5 rounded bg-slate-100 text-slate-600 text-[9px] font-extrabold uppercase">{cls.classType.replace('_', ' ')}</span>
                        </div>
                        <div className="text-xs text-slate-500 font-semibold">
                          {format(start, 'HH:mm')} • {cls.durationMinutes}min • {cls.currentEnrolled}/{cls.maxParticipants} enrolled
                        </div>
                      </div>
                      <div className="text-right">
                        {isSoon && <div className="text-[10px] font-extrabold text-blue-700">🚨 in {minsToStart}m</div>}
                        {cls.status === 'IN_PROGRESS' && <div className="text-[10px] font-extrabold text-amber-700">▶ Live</div>}
                      </div>
                    </div>
                  );
                })
            )}
          </div>
        </div>
      </section>

      {/* ─── QUICK STATS ─── */}
      <section className="grid grid-cols-2 sm:grid-cols-3 xl:grid-cols-6 gap-3">
        <QuickStat title="Members" value={membersSummary?.total ?? allMembers.length} icon={Users} tone="red" link="/gym/members" />
        <QuickStat title="Active Plans" value={allMemberships.filter((m: any) => m.status === 'ACTIVE').length} icon={Award} tone="fuchsia" link="/gym/memberships" />
        <QuickStat title="Trainers" value={gDash?.totalTrainers ?? 0} icon={Dumbbell} tone="violet" link="/gym/trainers" />
        <QuickStat title="Equipment" value={equipmentSummary?.total ?? 0} icon={Wrench} tone="orange" link="/gym/equipment" />
        <QuickStat title="Maintenance" value={equipmentSummary?.needsMaintenance ?? 0} icon={AlertTriangle} tone="amber" link="/gym/equipment" alert />
        <QuickStat title="Customers" value={stats?.totalCustomers ?? 0} icon={Heart} tone="blue" link="/customers" />
      </section>
    </div>
  );
}

function QuickLink({ to, icon: Icon, label, color, badge }: any) {
  const colors: Record<string, string> = {
    red: 'from-red-500 to-orange-600', orange: 'from-orange-500 to-red-600',
    emerald: 'from-emerald-500 to-green-600', fuchsia: 'from-fuchsia-500 to-pink-600',
    violet: 'from-violet-500 to-purple-600', blue: 'from-blue-500 to-cyan-600',
    rose: 'from-rose-500 to-pink-600', amber: 'from-amber-500 to-orange-600',
  };
  return (
    <Link to={to} className="group rounded-2xl bg-white border-2 border-slate-200 p-4 hover:border-slate-300 hover:shadow-lg hover:-translate-y-0.5 transition relative">
      {badge && <span className="absolute top-2 right-2 px-1.5 py-0.5 rounded bg-red-500 text-white text-[8px] font-extrabold uppercase animate-pulse">{badge}</span>}
      <div className={'h-11 w-11 rounded-xl bg-gradient-to-br ' + colors[color] + ' text-white flex items-center justify-center shadow-lg group-hover:scale-110 transition-transform mb-2'}>
        <Icon className="h-5 w-5" />
      </div>
      <div className="text-xs font-extrabold text-slate-900">{label}</div>
    </Link>
  );
}
