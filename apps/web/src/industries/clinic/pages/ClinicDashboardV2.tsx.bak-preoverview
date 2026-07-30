import { useQuery } from '@tanstack/react-query';
import { Link } from 'react-router-dom';
import {
  Stethoscope, Calendar, Users, DollarSign, TrendingUp, TrendingDown,
  RefreshCw, ArrowRight, UserCog, Pill, TestTube, Syringe, Activity,
  Timer, CheckCircle2, Video, Home, Zap, Sparkles, BarChart3, AlertCircle,
} from 'lucide-react';
import {
  ResponsiveContainer, AreaChart, Area, XAxis, YAxis, Tooltip, CartesianGrid, Legend,
} from 'recharts';
import { dashboardApi } from '@modules/dashboard/api/dashboard.api';
import { clinicDashboardApi } from '../api/dashboard.api';
import { appointmentsApi } from '../api/appointments.api';
import { doctorsApi } from '../api/doctors.api';
import { formatPKR } from '@core/lib/format';
import { SubscriptionBanner } from '@modules/dashboard/components/SubscriptionBanner';
import { EmailVerifyBanner } from '@core/components/auth/EmailVerifyBanner';
import {
  DashboardHero, HeroKpiCard, QuickStat, PnLCard,
  formatPercent,
} from '@modules/dashboard/components/shared/DashboardShared';
import { differenceInMinutes, format } from 'date-fns';

export default function ClinicDashboardV2() {
  const { data, refetch, isRefetching } = useQuery({
    queryKey: ['dashboard-overview'],
    queryFn: dashboardApi.overview,
    refetchInterval: 60_000,
  });

  const { data: clinicOverview } = useQuery({
    queryKey: ['clinic-dashboard'],
    queryFn: () => clinicDashboardApi.overview().catch(() => null),
    refetchInterval: 60_000,
  });

  const { data: doctors = [] } = useQuery({
    queryKey: ['clinic-doctors-dash'],
    queryFn: () => doctorsApi.list({ active: true }),
  });

  const { data: todayApts = [] } = useQuery({
    queryKey: ['clinic-today-apts'],
    queryFn: () => {
      const now = new Date();
      const start = new Date(now); start.setHours(0, 0, 0, 0);
      const end = new Date(now); end.setHours(23, 59, 59, 999);
      return appointmentsApi.list({ from: start.toISOString(), to: end.toISOString() });
    },
    refetchInterval: 60_000,
  });

  const stats = data?.stats;
  const tenant = data?.tenant;

  const aptStats = (() => {
    const scheduled = todayApts.filter((a: any) => ['SCHEDULED', 'CONFIRMED'].includes(a.status));
    const inQueue = todayApts.filter((a: any) => ['ARRIVED', 'IN_CONSULTATION'].includes(a.status));
    const completed = todayApts.filter((a: any) => a.status === 'COMPLETED');
    const emergency = todayApts.filter((a: any) => a.isEmergency);
    return { total: todayApts.length, scheduled: scheduled.length, inQueue: inQueue.length, completed: completed.length, emergency: emergency.length };
  })();

  const upcomingSoon = todayApts
    .filter((a: any) => ['CONFIRMED', 'SCHEDULED', 'ARRIVED'].includes(a.status))
    .sort((a: any, b: any) => new Date(a.scheduledStart).getTime() - new Date(b.scheduledStart).getTime())
    .slice(0, 8);

  const trendData = (data?.salesTrend7Days ?? []).map((p) => {
    const d = new Date(p.date);
    const dayName = ['Sun', 'Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat'][d.getDay()];
    return { ...p, label: dayName };
  });

  const growthVsYesterday = stats?.salesGrowthVsYesterday ?? 0;
  const growthVsLastMonth = stats?.salesGrowthVsLastMonth ?? 0;

  return (
    <div className="space-y-6">
      <SubscriptionBanner />
      <EmailVerifyBanner />

      <DashboardHero
        gradient="from-slate-950 via-cyan-900 to-blue-700"
        emoji="🩺"
        industryLabel="Clinic"
        industryBadgeColor="bg-cyan-500/30 border border-cyan-300/40"
        tenantName={tenant?.name}
        netProfit={stats?.netProfitToday ?? 0}
        salesToday={stats?.salesToday ?? 0}
        cogsToday={stats?.cogsToday ?? 0}
        expensesToday={stats?.expensesToday ?? 0}
        growthVsYesterday={growthVsYesterday}
        onRefresh={() => refetch()}
        isRefetching={isRefetching}
        posLabel="Open Clinic POS"
        posLink="/pos"
      />

      {aptStats.emergency > 0 && (
        <section className="rounded-3xl bg-gradient-to-br from-red-100 via-rose-50 to-orange-100 border-2 border-red-300 shadow-lg p-5">
          <div className="flex items-center gap-3">
            <div className="h-14 w-14 rounded-2xl bg-gradient-to-br from-red-500 to-rose-600 text-white flex items-center justify-center shadow-lg animate-pulse">
              <Zap className="h-7 w-7" />
            </div>
            <div className="flex-1">
              <div className="text-[10px] uppercase tracking-wider font-extrabold text-red-700">Emergency Alert</div>
              <div className="text-xl font-extrabold text-slate-900">{aptStats.emergency} emergency case(s) today</div>
              <div className="text-sm text-slate-700 font-semibold">Requires immediate attention</div>
            </div>
            <Link to="/clinic/appointments" className="px-4 py-2 rounded-xl bg-red-600 hover:bg-red-700 text-white font-extrabold text-sm shadow-lg">View</Link>
          </div>
        </section>
      )}

      <section className="grid sm:grid-cols-2 lg:grid-cols-4 gap-4">
        <HeroKpiCard title="Today Appointments" value={aptStats.total} subtitle={aptStats.completed + ' completed'} icon={Calendar} color="from-cyan-500 to-blue-600" isHighlight />
        <HeroKpiCard title="In Queue" value={aptStats.inQueue} subtitle="Currently waiting" icon={Timer} color="from-amber-500 to-orange-600" />
        <HeroKpiCard title="Doctors" value={doctors.length} subtitle="Active team" icon={UserCog} color="from-blue-500 to-indigo-700" />
        <HeroKpiCard title="Emergency" value={aptStats.emergency} subtitle="Priority cases" icon={Zap} color="from-red-500 to-rose-600" trend={growthVsYesterday} />
      </section>

      <section className="rounded-3xl bg-white border border-slate-200 shadow-sm p-6">
        <div className="flex items-center justify-between mb-5">
          <div>
            <h3 className="text-xl font-bold text-slate-900">7-Day Revenue</h3>
            <p className="text-sm text-slate-500">Clinic earnings trend</p>
          </div>
          <Link to="/reports" className="text-cyan-700 text-sm font-bold inline-flex items-center gap-1">
            Reports <ArrowRight className="h-4 w-4" />
          </Link>
        </div>
        {trendData.length >= 2 ? (
          <div className="h-[280px]">
            <ResponsiveContainer width="100%" height="100%">
              <AreaChart data={trendData}>
                <defs>
                  <linearGradient id="clSales" x1="0" y1="0" x2="0" y2="1">
                    <stop offset="0%" stopColor="#06b6d4" stopOpacity={0.4} />
                    <stop offset="100%" stopColor="#06b6d4" stopOpacity={0} />
                  </linearGradient>
                  <linearGradient id="clProfit" x1="0" y1="0" x2="0" y2="1">
                    <stop offset="0%" stopColor="#10b981" stopOpacity={0.3} />
                    <stop offset="100%" stopColor="#10b981" stopOpacity={0} />
                  </linearGradient>
                </defs>
                <CartesianGrid strokeDasharray="3 3" stroke="#e2e8f0" />
                <XAxis dataKey="label" stroke="#64748b" fontSize={12} />
                <YAxis stroke="#64748b" fontSize={11} tickFormatter={(v) => (v / 1000).toFixed(0) + 'k'} />
                <Tooltip formatter={(value: any) => formatPKR(Number(value))} contentStyle={{ borderRadius: 12 }} />
                <Legend wrapperStyle={{ fontSize: 11 }} />
                <Area type="monotone" dataKey="sales" name="Revenue" stroke="#06b6d4" fill="url(#clSales)" strokeWidth={2.5} />
                <Area type="monotone" dataKey="profit" name="Profit" stroke="#10b981" fill="url(#clProfit)" strokeWidth={2} />
              </AreaChart>
            </ResponsiveContainer>
          </div>
        ) : <div className="h-[280px] flex items-center justify-center text-sm text-slate-500">Need more data</div>}
      </section>

      <section className="rounded-3xl bg-white border border-slate-200 shadow-sm p-6">
        <div className="flex items-center justify-between mb-5 flex-wrap gap-2">
          <div>
            <h3 className="text-xl font-bold text-slate-900">P&L — Is Mahina</h3>
            <p className="text-sm text-slate-500">Clinic monthly performance</p>
          </div>
          {growthVsLastMonth !== 0 && (
            <div className={'inline-flex items-center gap-1.5 px-3 py-1.5 rounded-xl text-sm font-extrabold ' + (growthVsLastMonth >= 0 ? 'bg-emerald-100 text-emerald-700' : 'bg-rose-100 text-rose-700')}>
              {growthVsLastMonth >= 0 ? <TrendingUp className="h-3.5 w-3.5" /> : <TrendingDown className="h-3.5 w-3.5" />}
              {formatPercent(growthVsLastMonth)} vs last month
            </div>
          )}
        </div>
        <div className="grid sm:grid-cols-4 gap-3">
          <PnLCard label="Revenue" value={formatPKR(stats?.salesMonth ?? 0)} sub={(stats?.ordersMonth ?? 0) + ' bills'} color="emerald" />
          <PnLCard label="Costs" value={formatPKR(stats?.cogsMonth ?? 0)} sub="Supplies, meds" color="rose" />
          <PnLCard label="Expenses" value={formatPKR(stats?.expensesMonth ?? 0)} sub="Rent, staff" color="amber" />
          <PnLCard label="Net Profit" value={formatPKR(stats?.netProfitMonth ?? 0)} sub="Bottom line" color="violet" isHighlight />
        </div>
      </section>

      <section className="grid grid-cols-2 sm:grid-cols-4 lg:grid-cols-8 gap-3">
        <QuickLink to="/clinic/appointments/new" icon={Calendar} label="New Appointment" color="cyan" badge="FAST" />
        <QuickLink to="/clinic/appointments" icon={Calendar} label="Appointments" color="blue" />
        <QuickLink to="/clinic/queue" icon={Timer} label="Live Queue" color="amber" />
        <QuickLink to="/clinic/doctors" icon={UserCog} label="Doctors" color="indigo" />
        <QuickLink to="/clinic/patients" icon={Users} label="Patients" color="fuchsia" />
        <QuickLink to="/clinic/prescriptions" icon={Pill} label="Prescriptions" color="emerald" />
        <QuickLink to="/clinic/lab-orders" icon={TestTube} label="Lab Orders" color="violet" />
        <QuickLink to="/clinic-services/new" icon={Sparkles} label="+ Add Service" color="rose" />
      </section>

      <section className="grid lg:grid-cols-2 gap-6">
        <div className="rounded-3xl bg-white border border-slate-200 shadow-sm overflow-hidden">
          <div className="px-6 py-4 border-b border-slate-100 flex items-center justify-between">
            <div>
              <h3 className="text-lg font-bold text-slate-900 flex items-center gap-2"><Calendar className="h-5 w-5 text-cyan-600" /> Today's Queue</h3>
              <p className="text-xs text-slate-500 font-semibold">Upcoming appointments</p>
            </div>
            <Link to="/clinic/appointments" className="text-xs font-extrabold text-cyan-600 inline-flex items-center gap-1">All <ArrowRight className="h-3 w-3" /></Link>
          </div>
          <div className="divide-y divide-slate-100 max-h-96 overflow-y-auto">
            {upcomingSoon.length === 0 ? (
              <div className="py-12 text-center text-sm text-slate-500 font-semibold">
                <CheckCircle2 className="h-8 w-8 text-emerald-500 mx-auto mb-2" />
                No pending appointments
              </div>
            ) : (
              upcomingSoon.map((apt: any) => {
                const minsToStart = differenceInMinutes(new Date(apt.scheduledStart), new Date());
                const isSoon = minsToStart <= 30 && minsToStart >= 0;
                return (
                  <Link key={apt.id} to={'/clinic/appointments/' + apt.id} className="px-6 py-3 flex items-center gap-3 hover:bg-slate-50 transition">
                    <div className={'h-10 w-10 rounded-xl bg-gradient-to-br from-cyan-500 to-blue-600 text-white flex items-center justify-center shrink-0 text-xs font-extrabold ' + (isSoon ? 'animate-pulse' : '')}>
                      #{apt.tokenNumber || '?'}
                    </div>
                    <div className="flex-1 min-w-0">
                      <div className="flex items-center gap-2 flex-wrap">
                        <span className="font-extrabold text-sm text-slate-900 truncate">{apt.patient?.fullName || 'Patient'}</span>
                        {apt.isEmergency && <span className="px-1.5 py-0.5 rounded bg-red-500 text-white text-[9px] font-extrabold uppercase">EMERGENCY</span>}
                        {apt.isTelemedicine && <span className="px-1.5 py-0.5 rounded bg-purple-100 text-purple-700 text-[9px] font-extrabold uppercase inline-flex items-center gap-0.5"><Video className="h-2 w-2" />TELE</span>}
                      </div>
                      <div className="text-xs text-slate-500 font-semibold truncate">Dr. {apt.doctor?.fullName || 'Unknown'}</div>
                    </div>
                    <div className="text-right shrink-0">
                      <div className="text-sm font-extrabold text-slate-900">{format(new Date(apt.scheduledStart), 'HH:mm')}</div>
                      <div className={'text-[10px] font-bold ' + (apt.status === 'ARRIVED' ? 'text-cyan-700' : apt.status === 'IN_CONSULTATION' ? 'text-amber-700 animate-pulse' : 'text-slate-500')}>
                        {apt.status?.replace(/_/g, ' ')}
                      </div>
                    </div>
                  </Link>
                );
              })
            )}
          </div>
        </div>

        <div className="rounded-3xl bg-white border border-slate-200 shadow-sm overflow-hidden">
          <div className="px-6 py-4 border-b border-slate-100 flex items-center justify-between">
            <div>
              <h3 className="text-lg font-bold text-slate-900 flex items-center gap-2"><UserCog className="h-5 w-5 text-blue-600" /> Doctors On Duty</h3>
              <p className="text-xs text-slate-500 font-semibold">Active medical team</p>
            </div>
            <Link to="/clinic/doctors" className="text-xs font-extrabold text-blue-600 inline-flex items-center gap-1">All <ArrowRight className="h-3 w-3" /></Link>
          </div>
          <div className="divide-y divide-slate-100 max-h-96 overflow-y-auto">
            {doctors.slice(0, 8).map((d: any) => (
              <div key={d.id} className="px-6 py-3 flex items-center gap-3">
                {d.photoUrl ? (
                  <img src={d.photoUrl} alt="" className="h-10 w-10 rounded-xl object-cover ring-2 ring-slate-200" />
                ) : (
                  <div className="h-10 w-10 rounded-xl bg-gradient-to-br from-blue-500 to-cyan-600 text-white flex items-center justify-center font-extrabold text-sm">
                    {d.fullName?.charAt(0)?.toUpperCase() || '?'}
                  </div>
                )}
                <div className="flex-1 min-w-0">
                  <div className="font-extrabold text-sm truncate">{d.title || 'Dr.'} {d.fullName}</div>
                  <div className="text-[10px] font-bold text-slate-500 uppercase truncate">
                    {d.specialties?.[0]?.replace(/_/g, ' ')}
                  </div>
                </div>
                <div className="text-right shrink-0 text-xs">
                  <div className="font-extrabold text-emerald-700">Rs {formatPKR(d.consultationFee).replace('Rs', '').trim()}</div>
                  <div className="text-[9px] font-bold text-slate-500">{d.totalPatients} patients</div>
                </div>
              </div>
            ))}
            {doctors.length === 0 && (
              <div className="py-12 text-center text-sm text-slate-500 font-semibold">
                <UserCog className="h-8 w-8 text-slate-300 mx-auto mb-2" />
                No doctors yet
              </div>
            )}
          </div>
        </div>
      </section>

      <section className="grid grid-cols-2 sm:grid-cols-3 xl:grid-cols-6 gap-3">
        <QuickStat title="Services" value={stats?.totalProducts ?? 0} icon={Stethoscope} tone="cyan" link="/products" />
        <QuickStat title="Patients" value={stats?.totalCustomers ?? 0} icon={Users} tone="blue" link="/customers" />
        <QuickStat title="Doctors" value={doctors.length} icon={UserCog} tone="indigo" link="/clinic/doctors" />
        <QuickStat title="Prescriptions" value={clinicOverview?.totals?.pendingLabOrders ?? 0} icon={Pill} tone="emerald" link="/clinic/prescriptions" />
        <QuickStat title="Lab Orders" value={clinicOverview?.totals?.pendingLabOrders ?? 0} icon={TestTube} tone="violet" link="/clinic/lab-orders" />
        <QuickStat title="Due Vaccines" value={clinicOverview?.totals?.dueVaccinations ?? 0} icon={Syringe} tone="rose" link="/clinic/vaccinations" alert />
      </section>
    </div>
  );
}

function QuickLink({ to, icon: Icon, label, color, badge }: any) {
  const colors: Record<string, string> = {
    cyan: 'from-cyan-500 to-blue-600', blue: 'from-blue-500 to-indigo-600',
    amber: 'from-amber-500 to-orange-600', indigo: 'from-indigo-500 to-violet-600',
    fuchsia: 'from-fuchsia-500 to-pink-600', emerald: 'from-emerald-500 to-green-600',
    violet: 'from-violet-500 to-purple-600', rose: 'from-rose-500 to-pink-700',
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
