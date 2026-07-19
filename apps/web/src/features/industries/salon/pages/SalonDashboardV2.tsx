import { useMemo } from 'react';
import { useQuery } from '@tanstack/react-query';
import { Link } from 'react-router-dom';
import {
  Scissors, Calendar, Users, Award, Crown, Package, Heart,
  TrendingUp, TrendingDown, Target, Sparkles, Timer, Clock,
  DollarSign, ArrowRight, Plus, RefreshCw, Star, UserCheck,
  Activity, AlertTriangle, ChevronRight, BookmarkPlus, Zap,
  ShoppingCart, CheckCircle2, Ban, User, Phone,
} from 'lucide-react';
import {
  ResponsiveContainer, AreaChart, Area, XAxis, YAxis, Tooltip, CartesianGrid,
  BarChart, Bar, PieChart, Pie, Cell, Legend,
} from 'recharts';
import { dashboardApi } from '@/api/dashboard.api';
import { appointmentsApi } from '../api/appointments.api';
import { staffProfilesApi } from '../api/staff-profiles.api';
import { salonServicesApi } from '../api/services.api';
import { membershipsApi } from '../api/memberships.api';
import { packagesApi } from '../api/packages.api';
import { salonDashboardApi } from '../api/dashboard.api';
import { formatPKR } from '@/lib/format';
import { Button } from '@/components/ui/Button';
import { SubscriptionBanner } from '@/features/dashboard/components/SubscriptionBanner';
import { EmailVerifyBanner } from '@/components/auth/EmailVerifyBanner';
import {
  DashboardHero, HeroKpiCard, QuickStat, PnLCard,
  formatPercent, formatDate, PAYMENT_COLORS,
} from '@/features/dashboard/components/shared/DashboardShared';
import { format, differenceInMinutes, isToday, addDays, startOfDay, endOfDay } from 'date-fns';

const APPT_STATUS_COLORS: Record<string, string> = {
  CONFIRMED: '#3b82f6', ARRIVED: '#06b6d4', IN_PROGRESS: '#f59e0b',
  COMPLETED: '#10b981', NO_SHOW: '#ea580c', CANCELLED: '#f43f5e',
  DRAFT: '#64748b', RESCHEDULED: '#8b5cf6',
};

const TIER_EMOJI: Record<string, string> = {
  BRONZE: '🥉', SILVER: '🥈', GOLD: '🥇', PLATINUM: '💎', DIAMOND: '💠', CUSTOM: '⭐',
};

export default function SalonDashboardV2() {
  const { data, refetch, isRefetching } = useQuery({
    queryKey: ['dashboard-overview'],
    queryFn: dashboardApi.overview,
    refetchInterval: 60_000,
  });

  const { data: sDash } = useQuery({
    queryKey: ['salon-dashboard-overview'],
    queryFn: () => salonDashboardApi.overview(),
    refetchInterval: 60_000,
  });

  // Today's appointments
  const todayStart = startOfDay(new Date()).toISOString();
  const todayEnd = endOfDay(new Date()).toISOString();
  const { data: todayAppointments = [] } = useQuery({
    queryKey: ['salon-appointments-today'],
    queryFn: () => appointmentsApi.calendar(todayStart, todayEnd),
    refetchInterval: 30_000,
  });

  // Upcoming (next 7 days)
  const weekEnd = endOfDay(addDays(new Date(), 7)).toISOString();
  const { data: upcomingAppointments = [] } = useQuery({
    queryKey: ['salon-appointments-upcoming'],
    queryFn: () => appointmentsApi.calendar(todayStart, weekEnd),
    refetchInterval: 60_000,
  });

  // Staff, services, memberships, packages
  const { data: staff = [] } = useQuery({
    queryKey: ['salon-staff-dash'],
    queryFn: () => staffProfilesApi.list({ bookable: true }),
    refetchInterval: 5 * 60_000,
  });

  const { data: services = [] } = useQuery({
    queryKey: ['salon-services-dash'],
    queryFn: () => salonServicesApi.list({ active: true }),
    refetchInterval: 5 * 60_000,
  });

  const { data: memberships = [] } = useQuery({
    queryKey: ['salon-active-memberships'],
    queryFn: () => membershipsApi.list({ status: 'ACTIVE' }),
    refetchInterval: 5 * 60_000,
  });

  const { data: packagePurchases = [] } = useQuery({
    queryKey: ['salon-active-packages'],
    queryFn: () => packagesApi.purchases({ status: 'ACTIVE' }),
    refetchInterval: 5 * 60_000,
  });

  const stats = data?.stats;
  const tenant = data?.tenant;

  // ─── Salon-specific stats ────────────────────────────
  const appointmentStats = useMemo(() => {
    const total = todayAppointments.length;
    const confirmed = todayAppointments.filter((a: any) => a.status === 'CONFIRMED').length;
    const inProgress = todayAppointments.filter((a: any) => a.status === 'IN_PROGRESS').length;
    const completed = todayAppointments.filter((a: any) => a.status === 'COMPLETED').length;
    const arrived = todayAppointments.filter((a: any) => a.status === 'ARRIVED').length;
    const cancelled = todayAppointments.filter((a: any) => a.status === 'CANCELLED').length;
    const noShow = todayAppointments.filter((a: any) => a.status === 'NO_SHOW').length;
    const revenue = todayAppointments
      .filter((a: any) => a.status === 'COMPLETED')
      .reduce((s: number, a: any) => s + Number(a.total || 0), 0);
    const pending = confirmed + arrived + inProgress;

    return { total, confirmed, arrived, inProgress, completed, cancelled, noShow, revenue, pending };
  }, [todayAppointments]);

  // Next appointment (upcoming today or later)
  const nextAppointment = useMemo(() => {
    const now = new Date();
    const upcoming = todayAppointments
      .filter((a: any) => ['CONFIRMED', 'ARRIVED'].includes(a.status))
      .filter((a: any) => new Date(a.scheduledStart) >= now)
      .sort((a: any, b: any) => new Date(a.scheduledStart).getTime() - new Date(b.scheduledStart).getTime());
    return upcoming[0];
  }, [todayAppointments]);

  // Status breakdown for pie chart
  const statusBreakdown = useMemo(() => {
    const counts: Record<string, number> = {};
    for (const a of todayAppointments) {
      counts[a.status] = (counts[a.status] || 0) + 1;
    }
    return Object.entries(counts).map(([status, count]) => ({
      status,
      label: status.replace(/_/g, ' '),
      count,
      color: APPT_STATUS_COLORS[status] || '#64748b',
    }));
  }, [todayAppointments]);

  // Top staff by bookings
  const topStaff = useMemo(() => {
    return staff
      .slice()
      .sort((a: any, b: any) => (b.totalAppointments || 0) - (a.totalAppointments || 0))
      .slice(0, 5);
  }, [staff]);

  // Top services
  const topServices = useMemo(() => {
    return services
      .slice()
      .sort((a: any, b: any) => (b.totalBookings || 0) - (a.totalBookings || 0))
      .slice(0, 5);
  }, [services]);

  // Membership tier breakdown
  const membershipTiers = useMemo(() => {
    const counts: Record<string, { count: number; revenue: number }> = {};
    for (const m of memberships) {
      const tier = m.plan?.tier || 'CUSTOM';
      if (!counts[tier]) counts[tier] = { count: 0, revenue: 0 };
      counts[tier].count += 1;
      counts[tier].revenue += Number(m.amountPaid || 0);
    }
    return Object.entries(counts).map(([tier, data]) => ({ tier, ...data }));
  }, [memberships]);

  // Expiring memberships (next 15 days)
  const expiringMemberships = useMemo(() => {
    return memberships.filter((m: any) => {
      if (m.status !== 'ACTIVE') return false;
      const days = differenceInMinutes(new Date(m.expiryDate), new Date()) / (60 * 24);
      return days > 0 && days <= 15;
    });
  }, [memberships]);

  const trendData = (data?.salesTrend7Days ?? []).map((p) => {
    const d = new Date(p.date);
    const dayName = ['Sun', 'Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat'][d.getDay()];
    return { ...p, label: dayName };
  });

  const hourlyData = (data?.hourlySalesToday ?? [])
    .filter((h) => h.sales > 0 || (h.hour >= 9 && h.hour <= 22))
    .map((h) => ({
      ...h,
      label: h.hour === 0 ? '12 AM' : h.hour < 12 ? `${h.hour} AM` : h.hour === 12 ? '12 PM' : `${h.hour - 12} PM`,
    }));

  const growthVsYesterday = stats?.salesGrowthVsYesterday ?? 0;
  const growthVsLastMonth = stats?.salesGrowthVsLastMonth ?? 0;

  return (
    <div className="space-y-6">
      <SubscriptionBanner />
      <EmailVerifyBanner />

      {/* HERO */}
      <DashboardHero
        gradient="from-slate-950 via-pink-900 to-rose-700"
        emoji="💇"
        industryLabel="Salon"
        industryBadgeColor="bg-pink-500/30 border border-pink-300/40"
        tenantName={tenant?.name}
        netProfit={stats?.netProfitToday ?? 0}
        salesToday={stats?.salesToday ?? 0}
        cogsToday={stats?.cogsToday ?? 0}
        expensesToday={stats?.expensesToday ?? 0}
        growthVsYesterday={growthVsYesterday}
        onRefresh={() => refetch()}
        isRefetching={isRefetching}
        posLabel="New Appointment"
        posLink="/salon/appointments/new"
      />

      {/* ═══ NEXT APPOINTMENT ALERT ═══ */}
      {nextAppointment && (
        <NextAppointmentBanner appointment={nextAppointment} />
      )}

      {/* ═══ SALON LIVE KPIs ═══ */}
      <section className="grid sm:grid-cols-2 lg:grid-cols-4 gap-4">
        <HeroKpiCard
          title="Today's Appointments"
          value={appointmentStats.total}
          subtitle={`${appointmentStats.pending} active • ${appointmentStats.completed} done`}
          icon={Calendar}
          color="from-pink-500 to-rose-600"
          isHighlight
        />
        <HeroKpiCard
          title="Chairs Busy Right Now"
          value={appointmentStats.inProgress}
          subtitle={`${appointmentStats.arrived} arrived • ${appointmentStats.confirmed} confirmed`}
          icon={Scissors}
          color="from-amber-500 to-orange-600"
        />
        <HeroKpiCard
          title="Today's Revenue"
          value={formatPKR(appointmentStats.revenue)}
          subtitle={`From ${appointmentStats.completed} completed services`}
          icon={DollarSign}
          color="from-emerald-500 to-green-600"
          trend={growthVsYesterday}
        />
        <HeroKpiCard
          title="Active Members"
          value={memberships.length}
          subtitle={`${expiringMemberships.length} expiring soon`}
          icon={Crown}
          color="from-violet-500 to-purple-600"
        />
      </section>

      {/* ═══ APPOINTMENT STATUS BREAKDOWN ═══ */}
      <section className="rounded-3xl bg-gradient-to-br from-pink-50 via-rose-50 to-amber-50 border-2 border-pink-200 p-5 shadow-sm">
        <div className="flex items-center justify-between mb-4 flex-wrap gap-2">
          <div className="flex items-center gap-2">
            <div className="h-10 w-10 rounded-2xl bg-pink-600 text-white flex items-center justify-center shadow-lg shadow-pink-500/30">
              <Activity className="h-5 w-5" />
            </div>
            <div>
              <h3 className="text-lg font-extrabold text-pink-900">Today's Appointment Status</h3>
              <p className="text-xs text-pink-700">Live salon operations</p>
            </div>
          </div>
          <div className="flex gap-2">
            <Link to="/salon/appointments">
              <Button variant="secondary" size="sm">
                <Calendar className="h-3.5 w-3.5" /> All Appointments
              </Button>
            </Link>
            <Link to="/salon/calendar">
              <Button size="sm" className="bg-pink-600 hover:bg-pink-700">
                <Clock className="h-3.5 w-3.5" /> Calendar View
              </Button>
            </Link>
          </div>
        </div>

        {statusBreakdown.length > 0 ? (
          <div className="grid grid-cols-2 sm:grid-cols-4 lg:grid-cols-7 gap-3">
            {statusBreakdown.map((s) => (
              <div key={s.status} className="rounded-2xl bg-white border-2 p-3" style={{ borderColor: s.color + '60' }}>
                <div className="text-[10px] uppercase font-extrabold" style={{ color: s.color }}>{s.label}</div>
                <div className="text-2xl font-extrabold text-slate-900 tabular-nums mt-1">{s.count}</div>
                <div className="h-1 rounded-full mt-1" style={{ backgroundColor: s.color, opacity: 0.3 }}>
                  <div className="h-full rounded-full" style={{ backgroundColor: s.color, width: `${(s.count / appointmentStats.total) * 100}%` }} />
                </div>
              </div>
            ))}
          </div>
        ) : (
          <div className="rounded-xl bg-white border-2 border-dashed border-pink-200 p-6 text-center">
            <Calendar className="h-10 w-10 text-slate-400 mx-auto mb-2" />
            <p className="font-extrabold text-slate-700 text-sm">Aaj koi appointment nahi</p>
            <p className="text-xs text-slate-500 mt-1">Naya appointment book karo</p>
            <Link to="/salon/appointments/new">
              <Button size="sm" className="mt-3 bg-gradient-to-r from-pink-600 to-rose-700">
                <Plus className="h-3.5 w-3.5" /> Book Now
              </Button>
            </Link>
          </div>
        )}
      </section>

      {/* ═══ EXPIRING MEMBERSHIPS ALERT ═══ */}
      {expiringMemberships.length > 0 && (
        <section className="rounded-3xl bg-amber-50 border-2 border-amber-300 p-4">
          <div className="flex items-center justify-between gap-3 flex-wrap">
            <div className="flex items-center gap-3">
              <div className="h-10 w-10 rounded-xl bg-amber-500 text-white flex items-center justify-center animate-pulse">
                <AlertTriangle className="h-5 w-5" />
              </div>
              <div>
                <div className="font-extrabold text-amber-900">
                  {expiringMemberships.length} membership{expiringMemberships.length !== 1 ? 's' : ''} expiring in next 15 days
                </div>
                <div className="text-xs text-amber-700 font-semibold">Renew karne ki koshish karo — customers ko WhatsApp karo</div>
              </div>
            </div>
            <Link to="/salon/memberships">
              <Button size="sm" className="bg-amber-600 hover:bg-amber-700">
                Review <ArrowRight className="h-3.5 w-3.5" />
              </Button>
            </Link>
          </div>
        </section>
      )}

      {/* ═══ TRENDS + PEAK HOURS ═══ */}
      <section className="grid lg:grid-cols-[1.5fr_1fr] gap-6">
        <div className="rounded-3xl bg-white border border-slate-200 shadow-sm p-6">
          <div className="flex items-center justify-between mb-5">
            <div>
              <h3 className="text-xl font-bold text-slate-900">7-Day Salon Sales</h3>
              <p className="text-sm text-slate-500">Revenue & profit trend</p>
            </div>
            <Link to="/reports" className="text-pink-700 text-sm font-bold inline-flex items-center gap-1">
              Reports <ArrowRight className="h-4 w-4" />
            </Link>
          </div>
          {trendData.length >= 2 ? (
            <div className="h-[280px]">
              <ResponsiveContainer width="100%" height="100%">
                <AreaChart data={trendData}>
                  <defs>
                    <linearGradient id="sSales" x1="0" y1="0" x2="0" y2="1">
                      <stop offset="0%" stopColor="#db2777" stopOpacity={0.4} />
                      <stop offset="100%" stopColor="#db2777" stopOpacity={0} />
                    </linearGradient>
                    <linearGradient id="sProfit" x1="0" y1="0" x2="0" y2="1">
                      <stop offset="0%" stopColor="#10b981" stopOpacity={0.3} />
                      <stop offset="100%" stopColor="#10b981" stopOpacity={0} />
                    </linearGradient>
                  </defs>
                  <CartesianGrid strokeDasharray="3 3" stroke="#e2e8f0" />
                  <XAxis dataKey="label" stroke="#64748b" fontSize={12} />
                  <YAxis stroke="#64748b" fontSize={11} tickFormatter={(v) => `${(v / 1000).toFixed(0)}k`} />
                  <Tooltip formatter={(value: any) => formatPKR(Number(value))} contentStyle={{ borderRadius: 12, border: '2px solid #e2e8f0', fontSize: 12 }} />
                  <Legend wrapperStyle={{ fontSize: 11 }} />
                  <Area type="monotone" dataKey="sales" name="Sales" stroke="#db2777" fill="url(#sSales)" strokeWidth={2.5} />
                  <Area type="monotone" dataKey="profit" name="Profit" stroke="#10b981" fill="url(#sProfit)" strokeWidth={2} />
                </AreaChart>
              </ResponsiveContainer>
            </div>
          ) : (
            <div className="h-[280px] flex items-center justify-center text-sm text-slate-500">Need more data</div>
          )}
        </div>

        <div className="rounded-3xl bg-white border border-slate-200 shadow-sm p-6">
          <div className="flex items-center justify-between mb-5">
            <div>
              <h3 className="text-lg font-bold text-slate-900">Peak Hours Today</h3>
              <p className="text-sm text-slate-500">Rush time booking pattern</p>
            </div>
            <Clock className="h-5 w-5 text-pink-500" />
          </div>
          {hourlyData.length > 0 ? (
            <div className="h-[280px]">
              <ResponsiveContainer width="100%" height="100%">
                <BarChart data={hourlyData}>
                  <CartesianGrid strokeDasharray="3 3" stroke="#e2e8f0" />
                  <XAxis dataKey="label" stroke="#64748b" fontSize={9} interval={1} />
                  <YAxis stroke="#64748b" fontSize={11} tickFormatter={(v) => `${(v / 1000).toFixed(0)}k`} />
                  <Tooltip formatter={(value: any) => formatPKR(Number(value))} contentStyle={{ borderRadius: 12, fontSize: 12 }} />
                  <Bar dataKey="sales" fill="#db2777" radius={[6, 6, 0, 0]} />
                </BarChart>
              </ResponsiveContainer>
            </div>
          ) : (
            <div className="h-[280px] flex items-center justify-center text-sm text-slate-500">No sales yet today</div>
          )}
        </div>
      </section>

      {/* ═══ P&L THIS MONTH ═══ */}
      <section className="rounded-3xl bg-white border border-slate-200 shadow-sm p-6">
        <div className="flex items-center justify-between mb-5 flex-wrap gap-2">
          <div>
            <h3 className="text-xl font-bold text-slate-900">Profit & Loss — Is Mahina</h3>
            <p className="text-sm text-slate-500">Salon monthly performance</p>
          </div>
          {growthVsLastMonth !== 0 && (
            <div className={`inline-flex items-center gap-1.5 px-3 py-1.5 rounded-xl text-sm font-extrabold ${
              growthVsLastMonth >= 0 ? 'bg-emerald-100 text-emerald-700' : 'bg-rose-100 text-rose-700'
            }`}>
              {growthVsLastMonth >= 0 ? <TrendingUp className="h-3.5 w-3.5" /> : <TrendingDown className="h-3.5 w-3.5" />}
              {formatPercent(growthVsLastMonth)} vs last month
            </div>
          )}
        </div>
        <div className="grid sm:grid-cols-4 gap-3">
          <PnLCard label="Revenue" value={formatPKR(stats?.salesMonth ?? 0)} sub={`${stats?.ordersMonth ?? 0} services`} color="emerald" />
          <PnLCard label="Product Cost" value={formatPKR(stats?.cogsMonth ?? 0)} sub="Shampoo, color, etc." color="rose" />
          <PnLCard label="Expenses" value={formatPKR(stats?.expensesMonth ?? 0)} sub="Rent, utilities, staff" color="amber" />
          <PnLCard label="Net Profit" value={formatPKR(stats?.netProfitMonth ?? 0)} sub="Bottom line" color="violet" isHighlight />
        </div>
      </section>

      {/* ═══ QUICK STATS ═══ */}
      <section className="grid grid-cols-2 sm:grid-cols-3 xl:grid-cols-6 gap-3">
        <QuickStat title="Services" value={services.length} icon={Scissors} tone="pink" link="/salon/services" />
        <QuickStat title="Staff" value={staff.length} icon={UserCheck} tone="violet" link="/salon/staff" />
        <QuickStat title="Members" value={memberships.length} icon={Crown} tone="amber" link="/salon/memberships" />
        <QuickStat title="Active Packages" value={packagePurchases.length} icon={BookmarkPlus} tone="emerald" link="/salon/packages" />
        <QuickStat title="Customers" value={stats?.totalCustomers ?? 0} icon={Users} tone="blue" link="/salon/customers" />
        <QuickStat title="Products" value={stats?.totalProducts ?? 0} icon={Package} tone="orange" link="/products" />
      </section>

      {/* ═══ UPCOMING APPOINTMENTS + STAFF LEADERBOARD ═══ */}
      <section className="grid lg:grid-cols-2 gap-6">
        <UpcomingAppointmentsCard appointments={todayAppointments.filter((a: any) => ['CONFIRMED', 'ARRIVED', 'IN_PROGRESS'].includes(a.status))} />
        <StaffLeaderboardCard staff={topStaff} />
      </section>

      {/* ═══ TOP SERVICES + MEMBERSHIP TIERS ═══ */}
      <section className="grid lg:grid-cols-2 gap-6">
        <TopServicesCard services={topServices} />
        <MembershipTiersCard tiers={membershipTiers} totalMembers={memberships.length} />
      </section>

      {/* ═══ RECENT SALES ═══ */}
      <section className="rounded-3xl bg-white border border-slate-200 shadow-sm">
        <div className="px-6 py-5 border-b border-slate-100 flex items-center justify-between">
          <div>
            <h3 className="text-lg font-bold text-slate-900">Recent Salon Sales</h3>
            <p className="text-sm text-slate-500">Latest completed transactions</p>
          </div>
          <Link to="/sales" className="text-pink-700 text-sm font-bold inline-flex items-center gap-1">
            All Sales <ArrowRight className="h-4 w-4" />
          </Link>
        </div>
        <div className="divide-y divide-slate-100 max-h-[400px] overflow-y-auto">
          {data?.recentSales?.length ? (
            data.recentSales.slice(0, 6).map((sale) => (
              <Link
                key={sale.id}
                to={`/sales/${sale.id}/receipt`}
                className="px-6 py-3 flex items-center justify-between gap-3 hover:bg-slate-50 transition"
              >
                <div className="flex items-center gap-3 min-w-0">
                  <div className="h-9 w-9 rounded-xl bg-pink-100 text-pink-700 flex items-center justify-center shrink-0">
                    <Scissors className="h-4 w-4" />
                  </div>
                  <div className="min-w-0">
                    <div className="font-mono font-extrabold text-slate-900 text-sm">{sale.saleNumber}</div>
                    <div className="text-[11px] text-slate-500">
                      {sale.customer?.name || 'Walk-in'} • {formatDate(sale.soldAt)}
                    </div>
                  </div>
                </div>
                <div className="text-right shrink-0">
                  <div className="font-extrabold text-emerald-700 text-sm">{formatPKR(sale.total)}</div>
                  {sale.creditAmount > 0 && (
                    <div className="text-[10px] text-amber-700 font-bold">Udhaar: {formatPKR(sale.creditAmount)}</div>
                  )}
                </div>
              </Link>
            ))
          ) : (
            <div className="px-6 py-12 text-center text-sm text-slate-500">No sales yet</div>
          )}
        </div>
      </section>
    </div>
  );
}

// ═══════════════════════════════════════════════════════════════
// SUB-COMPONENTS
// ═══════════════════════════════════════════════════════════════

function NextAppointmentBanner({ appointment }: { appointment: any }) {
  const start = new Date(appointment.scheduledStart);
  const minsToStart = differenceInMinutes(start, new Date());
  const isImminent = minsToStart <= 15 && minsToStart >= 0;

  return (
    <section className={`relative overflow-hidden rounded-3xl p-5 shadow-lg ${
      isImminent
        ? 'bg-gradient-to-r from-amber-500 via-orange-500 to-red-500 text-white animate-pulse'
        : 'bg-gradient-to-r from-blue-500 via-cyan-500 to-teal-500 text-white'
    }`}>
      <div className="absolute -top-10 -right-10 h-40 w-40 rounded-full bg-white/20 blur-2xl" />
      <div className="relative flex flex-wrap items-center justify-between gap-4">
        <div className="flex items-center gap-4">
          <div className="h-14 w-14 rounded-2xl bg-white/20 backdrop-blur flex items-center justify-center shadow-lg">
            {isImminent ? <Zap className="h-7 w-7" /> : <Clock className="h-7 w-7" />}
          </div>
          <div>
            <div className="text-[10px] uppercase tracking-wider font-extrabold opacity-90">
              {isImminent ? '⚡ Coming Up NOW' : 'Next Appointment'}
            </div>
            <div className="text-2xl font-extrabold mt-0.5">
              {appointment.customerName || 'Customer'}
              <span className="text-base opacity-90 ml-2">
                @ {format(start, 'HH:mm')}
              </span>
            </div>
            <div className="text-sm opacity-90 font-semibold mt-0.5">
              {appointment.services?.[0]?.serviceName || 'Service'}
              {(appointment.services?.length || 0) > 1 && ` +${appointment.services.length - 1} more`}
              {' • '}
              {minsToStart > 0 ? `${minsToStart} min baaki` : 'Right now'}
            </div>
          </div>
        </div>
        <Link to={`/salon/appointments/${appointment.id}`}>
          <button className="inline-flex items-center gap-2 px-4 py-2.5 rounded-xl bg-white text-slate-900 text-sm font-extrabold hover:bg-slate-100 transition shadow">
            View Details
            <ArrowRight className="h-4 w-4" />
          </button>
        </Link>
      </div>
    </section>
  );
}

function UpcomingAppointmentsCard({ appointments }: { appointments: any[] }) {
  return (
    <div className="rounded-3xl bg-white border border-slate-200 shadow-sm">
      <div className="px-6 py-5 border-b border-slate-100 flex items-center justify-between">
        <div className="flex items-center gap-2">
          <Calendar className="h-5 w-5 text-pink-500" />
          <div>
            <h3 className="text-lg font-bold text-slate-900">Today's Bookings</h3>
            <p className="text-sm text-slate-500">{appointments.length} active appointments</p>
          </div>
        </div>
        <Link to="/salon/appointments" className="text-pink-700 text-sm font-bold inline-flex items-center gap-1">
          All <ArrowRight className="h-4 w-4" />
        </Link>
      </div>
      <div className="divide-y divide-slate-100 max-h-[400px] overflow-y-auto">
        {appointments.length === 0 ? (
          <div className="px-6 py-12 text-center">
            <Calendar className="h-12 w-12 text-slate-300 mx-auto mb-2" />
            <p className="font-extrabold text-slate-700">No pending appointments</p>
            <p className="text-xs text-slate-500 mt-1">All done or none scheduled</p>
          </div>
        ) : (
          appointments
            .sort((a, b) => new Date(a.scheduledStart).getTime() - new Date(b.scheduledStart).getTime())
            .map((apt: any) => {
              const start = new Date(apt.scheduledStart);
              const minsToStart = differenceInMinutes(start, new Date());
              const isSoon = minsToStart <= 30 && minsToStart >= 0;
              const statusColor = APPT_STATUS_COLORS[apt.status] || '#64748b';

              return (
                <Link
                  key={apt.id}
                  to={`/salon/appointments/${apt.id}`}
                  className="px-6 py-3 flex items-center justify-between gap-3 hover:bg-slate-50 transition"
                >
                  <div className="flex items-center gap-3 min-w-0 flex-1">
                    <div className={`shrink-0 rounded-xl px-2 py-1.5 text-center ${
                      isSoon ? 'bg-amber-100' : 'bg-slate-100'
                    }`}>
                      <div className={`text-lg font-extrabold ${isSoon ? 'text-amber-900' : 'text-slate-900'}`}>
                        {format(start, 'HH:mm')}
                      </div>
                    </div>
                    <div className="min-w-0">
                      <div className="flex items-center gap-2 flex-wrap">
                        <span className="font-extrabold text-slate-900 truncate">
                          {apt.customerName || 'Walk-in'}
                        </span>
                        <span className="px-1.5 py-0.5 rounded text-[9px] font-extrabold uppercase text-white"
                          style={{ backgroundColor: statusColor }}>
                          {apt.status}
                        </span>
                      </div>
                      <div className="text-xs text-slate-500 font-semibold mt-0.5 truncate">
                        {apt.services?.[0]?.serviceName || 'Service'}
                        {(apt.services?.length || 0) > 1 && ` +${apt.services.length - 1}`}
                      </div>
                    </div>
                  </div>
                  <div className="text-right shrink-0">
                    <div className="font-extrabold text-emerald-700 tabular-nums text-sm">{formatPKR(apt.total)}</div>
                    {isSoon && (
                      <div className="text-[9px] font-extrabold text-amber-700 uppercase animate-pulse">In {minsToStart}m</div>
                    )}
                  </div>
                </Link>
              );
            })
        )}
      </div>
    </div>
  );
}

function StaffLeaderboardCard({ staff }: { staff: any[] }) {
  return (
    <div className="rounded-3xl bg-white border border-slate-200 shadow-sm">
      <div className="px-6 py-5 border-b border-slate-100 flex items-center justify-between">
        <div className="flex items-center gap-2">
          <Award className="h-5 w-5 text-amber-500" />
          <div>
            <h3 className="text-lg font-bold text-slate-900">🏆 Top Staff</h3>
            <p className="text-sm text-slate-500">Ranked by total appointments</p>
          </div>
        </div>
        <Link to="/salon/staff" className="text-pink-700 text-sm font-bold inline-flex items-center gap-1">
          All <ArrowRight className="h-4 w-4" />
        </Link>
      </div>
      <div className="divide-y divide-slate-100">
        {staff.length === 0 ? (
          <div className="px-6 py-12 text-center">
            <UserCheck className="h-12 w-12 text-slate-300 mx-auto mb-2" />
            <p className="font-extrabold text-slate-700">No staff yet</p>
            <Link to="/salon/staff">
              <Button size="sm" className="mt-3 bg-gradient-to-r from-pink-600 to-rose-700">
                <Plus className="h-3.5 w-3.5" /> Add Staff
              </Button>
            </Link>
          </div>
        ) : (
          staff.map((s, idx) => {
            const rankColors = ['bg-amber-500', 'bg-slate-400', 'bg-orange-600', 'bg-violet-500', 'bg-blue-500'];
            const name = s.staff
              ? `${s.staff.firstName || ''} ${s.staff.lastName || ''}`.trim()
              : 'Unknown';
            return (
              <div key={s.id} className="px-6 py-3 flex items-center justify-between gap-3">
                <div className="flex items-center gap-3 min-w-0">
                  <div className={`h-8 w-8 rounded-lg ${rankColors[idx]} text-white font-extrabold flex items-center justify-center text-sm shrink-0`}>
                    {idx < 3 ? <Crown className="h-4 w-4" /> : idx + 1}
                  </div>
                  {s.photoUrl ? (
                    <img src={s.photoUrl} alt="" className="h-10 w-10 rounded-xl object-cover shrink-0" />
                  ) : (
                    <div className="h-10 w-10 rounded-xl bg-gradient-to-br from-pink-500 to-rose-600 text-white flex items-center justify-center font-extrabold shrink-0">
                      {name.charAt(0).toUpperCase() || '?'}
                    </div>
                  )}
                  <div className="min-w-0">
                    <div className="font-bold text-slate-900 truncate text-sm">{name}</div>
                    <div className="text-[10px] text-slate-500 font-bold uppercase">{s.role}</div>
                  </div>
                </div>
                <div className="text-right shrink-0">
                  <div className="text-sm font-extrabold text-slate-900 tabular-nums">{s.totalAppointments || 0}</div>
                  <div className="text-[10px] font-bold text-emerald-700 tabular-nums">
                    {formatPKR(s.totalCommission || 0)}
                  </div>
                </div>
              </div>
            );
          })
        )}
      </div>
    </div>
  );
}

function TopServicesCard({ services }: { services: any[] }) {
  return (
    <div className="rounded-3xl bg-white border border-slate-200 shadow-sm">
      <div className="px-6 py-5 border-b border-slate-100 flex items-center justify-between">
        <div className="flex items-center gap-2">
          <Scissors className="h-5 w-5 text-pink-500" />
          <div>
            <h3 className="text-lg font-bold text-slate-900">💇 Popular Services</h3>
            <p className="text-sm text-slate-500">Most booked services</p>
          </div>
        </div>
        <Link to="/salon/services" className="text-pink-700 text-sm font-bold inline-flex items-center gap-1">
          All <ArrowRight className="h-4 w-4" />
        </Link>
      </div>
      <div className="divide-y divide-slate-100">
        {services.length === 0 ? (
          <div className="px-6 py-12 text-center">
            <Scissors className="h-12 w-12 text-slate-300 mx-auto mb-2" />
            <p className="font-extrabold text-slate-700">No services yet</p>
            <Link to="/salon-services/new">
              <Button size="sm" className="mt-3 bg-gradient-to-r from-pink-600 to-rose-700">
                <Plus className="h-3.5 w-3.5" /> Add Service
              </Button>
            </Link>
          </div>
        ) : (
          services.map((s, idx) => {
            const rankColors = ['bg-amber-500', 'bg-slate-400', 'bg-orange-600', 'bg-violet-500', 'bg-blue-500'];
            return (
              <Link
                key={s.id}
                to={`/salon-services/${s.id}`}
                className="px-6 py-3 flex items-center justify-between gap-3 hover:bg-slate-50 transition"
              >
                <div className="flex items-center gap-3 min-w-0">
                  <div className={`h-8 w-8 rounded-lg ${rankColors[idx]} text-white font-extrabold flex items-center justify-center text-sm shrink-0`}>
                    {idx + 1}
                  </div>
                  {s.imageUrl ? (
                    <img src={s.imageUrl} alt="" className="h-10 w-10 rounded-xl object-cover shrink-0" />
                  ) : (
                    <div className="h-10 w-10 rounded-xl bg-pink-100 text-pink-700 flex items-center justify-center shrink-0">
                      <Scissors className="h-4 w-4" />
                    </div>
                  )}
                  <div className="min-w-0">
                    <div className="font-bold text-slate-900 truncate text-sm">{s.name}</div>
                    <div className="text-[10px] text-slate-500 font-bold flex items-center gap-1">
                      <Clock className="h-2.5 w-2.5" />
                      {s.durationMinutes}m • {s.totalBookings || 0} bookings
                    </div>
                  </div>
                </div>
                <div className="text-right shrink-0">
                  <div className="font-extrabold text-emerald-700 text-sm tabular-nums">
                    {formatPKR(s.totalRevenue || 0)}
                  </div>
                  <div className="text-[10px] font-bold text-slate-500 tabular-nums">
                    {formatPKR(s.price)}/service
                  </div>
                </div>
              </Link>
            );
          })
        )}
      </div>
    </div>
  );
}

function MembershipTiersCard({ tiers, totalMembers }: { tiers: any[]; totalMembers: number }) {
  return (
    <div className="rounded-3xl bg-white border border-slate-200 shadow-sm p-6">
      <div className="flex items-center justify-between mb-4">
        <div className="flex items-center gap-2">
          <Crown className="h-5 w-5 text-amber-500" />
          <div>
            <h3 className="text-lg font-bold text-slate-900">👑 Membership Tiers</h3>
            <p className="text-sm text-slate-500">{totalMembers} active members</p>
          </div>
        </div>
        <Link to="/salon/memberships" className="text-pink-700 text-sm font-bold inline-flex items-center gap-1">
          Manage <ArrowRight className="h-4 w-4" />
        </Link>
      </div>

      {tiers.length === 0 ? (
        <div className="py-12 text-center">
          <Crown className="h-12 w-12 text-slate-300 mx-auto mb-2" />
          <p className="font-extrabold text-slate-700">No memberships yet</p>
          <Link to="/salon/memberships">
            <Button size="sm" className="mt-3 bg-gradient-to-r from-amber-600 to-orange-700">
              <Plus className="h-3.5 w-3.5" /> Create Plan
            </Button>
          </Link>
        </div>
      ) : (
        <div className="space-y-2">
          {tiers.map((t) => {
            const pct = totalMembers > 0 ? (t.count / totalMembers) * 100 : 0;
            return (
              <div key={t.tier} className="rounded-xl bg-slate-50 p-3">
                <div className="flex items-center justify-between mb-1.5">
                  <div className="flex items-center gap-2">
                    <span className="text-2xl">{TIER_EMOJI[t.tier] || '⭐'}</span>
                    <div>
                      <div className="font-extrabold text-slate-900 text-sm">{t.tier}</div>
                      <div className="text-[10px] font-bold text-slate-500">{t.count} members</div>
                    </div>
                  </div>
                  <div className="text-right">
                    <div className="font-extrabold text-emerald-700 text-sm tabular-nums">
                      {formatPKR(t.revenue)}
                    </div>
                    <div className="text-[10px] font-bold text-slate-500">{pct.toFixed(0)}% of members</div>
                  </div>
                </div>
                <div className="h-1.5 rounded-full bg-slate-200 overflow-hidden">
                  <div className="h-full bg-gradient-to-r from-amber-500 to-orange-600 rounded-full"
                    style={{ width: `${pct}%` }} />
                </div>
              </div>
            );
          })}
        </div>
      )}
    </div>
  );
}
