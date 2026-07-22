import { useQuery } from '@tanstack/react-query';
import { Link } from 'react-router-dom';
import {
  Wrench, Car, Package, Bell, Users, Truck, Cog,
  TrendingUp, Target, Award, ArrowRight, Clock,
  AlertTriangle, Activity, ShoppingCart, Zap, ShieldCheck,
} from 'lucide-react';
import {
  ResponsiveContainer, AreaChart, Area, XAxis, YAxis, Tooltip, CartesianGrid,
  BarChart, Bar, PieChart, Pie, Cell, Legend,
} from 'recharts';
import { dashboardApi } from '@/api/dashboard.api';
import { workshopJobsApi } from '../api/workshop-jobs.api';
import { serviceRemindersApi } from '../api/service-reminders.api';
import { customerVehiclesApi } from '../api/customer-vehicles.api';
import { formatPKR } from '@/lib/format';
import { Button } from '@/components/ui/Button';
import { SubscriptionBanner } from '@/features/dashboard/components/SubscriptionBanner';
import { EmailVerifyBanner } from '@/components/auth/EmailVerifyBanner';
import {
  DashboardHero, HeroKpiCard, QuickStat, PnLCard,
  formatPercent, formatDate, PAYMENT_COLORS,
} from '@/features/dashboard/components/shared/DashboardShared';

export default function AutoPartsDashboardV2() {
  const { data, refetch, isRefetching } = useQuery({
    queryKey: ['dashboard-overview'],
    queryFn: dashboardApi.overview,
    refetchInterval: 60_000,
  });

  const { data: activeJobs = [] } = useQuery({
    queryKey: ['workshop-jobs-dash'],
    queryFn: () => workshopJobsApi.list({}),
    refetchInterval: 30_000,
  });

  const { data: upcomingReminders = [] } = useQuery({
    queryKey: ['service-reminders-dash'],
    queryFn: () => serviceRemindersApi.list({ upcoming: true }),
    refetchInterval: 60_000,
  });

  const { data: overdueReminders = [] } = useQuery({
    queryKey: ['service-reminders-overdue'],
    queryFn: () => serviceRemindersApi.list({ overdue: true }),
    refetchInterval: 60_000,
  });

  const { data: vehicles = [] } = useQuery({
    queryKey: ['customer-vehicles-dash'],
    queryFn: () => customerVehiclesApi.list({}),
  });

  const stats = data?.stats;
  const tenant = data?.tenant;

  const jobStats = {
    total: activeJobs.length,
    inProgress: activeJobs.filter((j: any) => j.status === 'IN_PROGRESS').length,
    waiting: activeJobs.filter((j: any) => ['WAITING_PARTS', 'WAITING_APPROVAL'].includes(j.status)).length,
    ready: activeJobs.filter((j: any) => ['READY_FOR_TEST', 'QUALITY_CHECK', 'COMPLETED'].includes(j.status)).length,
    completed: activeJobs.filter((j: any) => j.status === 'DELIVERED').length,
    urgent: activeJobs.filter((j: any) => ['URGENT', 'EMERGENCY'].includes(j.priority) && !['DELIVERED', 'CANCELLED'].includes(j.status)).length,
  };

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
        gradient="from-slate-950 via-slate-800 to-slate-700"
        emoji="🔧"
        industryLabel="Auto Parts"
        industryBadgeColor="bg-slate-500/30 border border-slate-300/40"
        tenantName={tenant?.name}
        netProfit={stats?.netProfitToday ?? 0}
        salesToday={stats?.salesToday ?? 0}
        cogsToday={stats?.cogsToday ?? 0}
        expensesToday={stats?.expensesToday ?? 0}
        growthVsYesterday={growthVsYesterday}
        onRefresh={() => refetch()}
        isRefetching={isRefetching}
        posLabel="Open Auto Parts POS"
        posLink="/pos"
      />

      {/* Workshop KPIs */}
      <section className="grid sm:grid-cols-2 lg:grid-cols-4 gap-4">
        <HeroKpiCard
          title="Active Jobs"
          value={jobStats.inProgress + jobStats.waiting}
          subtitle={`${jobStats.inProgress} in progress • ${jobStats.waiting} waiting`}
          icon={Wrench}
          color="from-orange-500 to-red-600"
          isHighlight
        />
        <HeroKpiCard
          title="Urgent Jobs"
          value={jobStats.urgent}
          subtitle="Emergency/Urgent priority"
          icon={AlertTriangle}
          color="from-rose-500 to-red-600"
        />
        <HeroKpiCard
          title="Ready for Delivery"
          value={jobStats.ready}
          subtitle="Completed jobs"
          icon={Award}
          color="from-emerald-500 to-teal-600"
        />
        <HeroKpiCard
          title="Aaj ka Profit"
          value={formatPKR(stats?.netProfitToday ?? 0)}
          subtitle={`${stats?.ordersToday ?? 0} sales • AOV ${formatPKR(stats?.aovToday ?? 0)}`}
          icon={Target}
          color="from-slate-600 to-slate-800"
          trend={growthVsYesterday}
        />
      </section>

      {/* Workshop Operations Panel */}
      <section className="rounded-3xl bg-gradient-to-br from-slate-50 via-orange-50 to-red-50 border-2 border-slate-200 p-5 shadow-sm">
        <div className="flex items-center justify-between mb-4 flex-wrap gap-2">
          <div className="flex items-center gap-2">
            <div className="h-10 w-10 rounded-2xl bg-slate-800 text-white flex items-center justify-center shadow-lg shadow-slate-500/30">
              <Wrench className="h-5 w-5" />
            </div>
            <div>
              <h3 className="text-lg font-extrabold text-slate-900">Workshop Live Operations</h3>
              <p className="text-xs text-slate-700">Repair jobs pipeline</p>
            </div>
          </div>
          <div className="flex gap-2">
            <Link to="/autoparts/jobs/new">
              <Button size="sm" className="bg-slate-800 hover:bg-slate-900">
                <Zap className="h-3.5 w-3.5" /> New Job
              </Button>
            </Link>
            <Link to="/autoparts/jobs">
              <Button variant="secondary" size="sm">
                <Activity className="h-3.5 w-3.5" /> All Jobs
              </Button>
            </Link>
          </div>
        </div>

        <div className="grid grid-cols-2 sm:grid-cols-5 gap-3">
          <div className="rounded-2xl bg-white border-2 border-slate-200 p-3">
            <div className="text-[10px] uppercase font-extrabold text-slate-700">Total Active</div>
            <div className="text-2xl font-extrabold text-slate-900 tabular-nums mt-1">{jobStats.total}</div>
          </div>
          <div className="rounded-2xl bg-white border-2 border-amber-200 p-3">
            <div className="text-[10px] uppercase font-extrabold text-amber-700">In Progress</div>
            <div className="text-2xl font-extrabold text-amber-900 tabular-nums mt-1">{jobStats.inProgress}</div>
          </div>
          <div className="rounded-2xl bg-white border-2 border-orange-200 p-3">
            <div className="text-[10px] uppercase font-extrabold text-orange-700">Waiting</div>
            <div className="text-2xl font-extrabold text-orange-900 tabular-nums mt-1">{jobStats.waiting}</div>
          </div>
          <div className="rounded-2xl bg-white border-2 border-emerald-200 p-3">
            <div className="text-[10px] uppercase font-extrabold text-emerald-700">Ready</div>
            <div className="text-2xl font-extrabold text-emerald-900 tabular-nums mt-1">{jobStats.ready}</div>
          </div>
          <div className="rounded-2xl bg-white border-2 border-rose-200 p-3">
            <div className="text-[10px] uppercase font-extrabold text-rose-700">Urgent</div>
            <div className="text-2xl font-extrabold text-rose-900 tabular-nums mt-1">{jobStats.urgent}</div>
          </div>
        </div>
      </section>

      {/* Reminders & Alerts */}
      {(overdueReminders.length > 0 || upcomingReminders.length > 0) && (
        <section className="grid sm:grid-cols-2 gap-4">
          {overdueReminders.length > 0 && (
            <div className="rounded-3xl bg-gradient-to-br from-rose-500 to-red-600 text-white p-5 shadow-lg shadow-rose-500/30">
              <div className="flex items-center gap-3 mb-3">
                <div className="h-12 w-12 rounded-2xl bg-white/20 flex items-center justify-center">
                  <AlertTriangle className="h-6 w-6" />
                </div>
                <div>
                  <div className="text-[10px] font-extrabold uppercase tracking-wider opacity-90">⚠️ Overdue Alerts</div>
                  <h3 className="text-2xl font-bold mt-1">{overdueReminders.length}</h3>
                </div>
              </div>
              <Link to="/autoparts/reminders" className="pt-3 border-t border-white/20 text-xs opacity-90 flex items-center justify-between">
                <span>Insurance, token, fitness overdue</span>
                <ArrowRight className="h-4 w-4" />
              </Link>
            </div>
          )}

          <div className="rounded-3xl bg-gradient-to-br from-cyan-500 to-blue-600 text-white p-5 shadow-lg shadow-cyan-500/30">
            <div className="flex items-center gap-3 mb-3">
              <div className="h-12 w-12 rounded-2xl bg-white/20 flex items-center justify-center">
                <Bell className="h-6 w-6" />
              </div>
              <div>
                <div className="text-[10px] font-extrabold uppercase tracking-wider opacity-90">📅 Upcoming</div>
                <h3 className="text-2xl font-bold mt-1">{upcomingReminders.length}</h3>
              </div>
            </div>
            <Link to="/autoparts/reminders" className="pt-3 border-t border-white/20 text-xs opacity-90 flex items-center justify-between">
              <span>Service reminders</span>
              <ArrowRight className="h-4 w-4" />
            </Link>
          </div>
        </section>
      )}

      {/* Trends */}
      <section className="rounded-3xl bg-white border border-slate-200 shadow-sm p-6">
        <div className="flex items-center justify-between mb-5">
          <div>
            <h3 className="text-xl font-bold text-slate-900">7-Day Sales & Profit</h3>
            <p className="text-sm text-slate-500">Parts + labor revenue</p>
          </div>
          <Link to="/reports" className="text-slate-700 text-sm font-bold inline-flex items-center gap-1">
            Reports <ArrowRight className="h-4 w-4" />
          </Link>
        </div>
        {trendData.length >= 2 ? (
          <div className="h-[280px]">
            <ResponsiveContainer width="100%" height="100%">
              <AreaChart data={trendData}>
                <defs>
                  <linearGradient id="apSales" x1="0" y1="0" x2="0" y2="1">
                    <stop offset="0%" stopColor="#475569" stopOpacity={0.4} />
                    <stop offset="100%" stopColor="#475569" stopOpacity={0} />
                  </linearGradient>
                  <linearGradient id="apProfit" x1="0" y1="0" x2="0" y2="1">
                    <stop offset="0%" stopColor="#10b981" stopOpacity={0.3} />
                    <stop offset="100%" stopColor="#10b981" stopOpacity={0} />
                  </linearGradient>
                </defs>
                <CartesianGrid strokeDasharray="3 3" stroke="#e2e8f0" />
                <XAxis dataKey="label" stroke="#64748b" fontSize={12} />
                <YAxis stroke="#64748b" fontSize={11} tickFormatter={(v) => `${(v / 1000).toFixed(0)}k`} />
                <Tooltip formatter={(value: any) => formatPKR(Number(value))} contentStyle={{ borderRadius: 12 }} />
                <Legend wrapperStyle={{ fontSize: 11 }} />
                <Area type="monotone" dataKey="sales" name="Sales" stroke="#475569" fill="url(#apSales)" strokeWidth={2.5} />
                <Area type="monotone" dataKey="profit" name="Profit" stroke="#10b981" fill="url(#apProfit)" strokeWidth={2} />
              </AreaChart>
            </ResponsiveContainer>
          </div>
        ) : (
          <div className="h-[280px] flex items-center justify-center text-sm text-slate-500">Need more data</div>
        )}
      </section>

      {/* P&L */}
      <section className="rounded-3xl bg-white border border-slate-200 shadow-sm p-6">
        <div className="flex items-center justify-between mb-5 flex-wrap gap-2">
          <div>
            <h3 className="text-xl font-bold text-slate-900">Profit & Loss — Is Mahina</h3>
            <p className="text-sm text-slate-500">Workshop monthly performance</p>
          </div>
          {growthVsLastMonth !== 0 && (
            <div className={`inline-flex items-center gap-1.5 px-3 py-1.5 rounded-xl text-sm font-extrabold ${
              growthVsLastMonth >= 0 ? 'bg-emerald-100 text-emerald-700' : 'bg-rose-100 text-rose-700'
            }`}>
              {formatPercent(growthVsLastMonth)}
            </div>
          )}
        </div>
        <div className="grid sm:grid-cols-4 gap-3">
          <PnLCard label="Revenue" value={formatPKR(stats?.salesMonth ?? 0)} sub={`${stats?.ordersMonth ?? 0} sales`} color="emerald" />
          <PnLCard label="Parts Cost" value={formatPKR(stats?.cogsMonth ?? 0)} sub="Purchase cost" color="rose" />
          <PnLCard label="Expenses" value={formatPKR(stats?.expensesMonth ?? 0)} sub="Rent, mechanics, utilities" color="amber" />
          <PnLCard label="Net Profit" value={formatPKR(stats?.netProfitMonth ?? 0)} sub="Bottom line" color="blue" isHighlight />
        </div>
      </section>

      {/* Quick Stats */}
      <section className="grid grid-cols-2 sm:grid-cols-3 xl:grid-cols-6 gap-3">
        <QuickStat title="Parts" value={stats?.totalProducts ?? 0} icon={Package} tone="slate" link="/autoparts/parts" />
        <QuickStat title="Vehicles" value={vehicles.length} icon={Car} tone="pink" link="/autoparts/vehicles" />
        <QuickStat title="Makes" value={0} icon={Truck} tone="rose" link="/autoparts/makes" />
        <QuickStat title="Models" value={0} icon={Cog} tone="violet" link="/autoparts/models" />
        <QuickStat title="Customers" value={stats?.totalCustomers ?? 0} icon={Users} tone="blue" link="/customers" />
        <QuickStat title="Reminders" value={upcomingReminders.length + overdueReminders.length} icon={Bell} tone="amber" link="/autoparts/reminders" alert />
      </section>

      {/* Active Jobs Feed */}
      {activeJobs.length > 0 && (
        <section className="rounded-3xl bg-white border border-slate-200 shadow-sm">
          <div className="px-6 py-5 border-b border-slate-100 flex items-center justify-between">
            <div className="flex items-center gap-2">
              <Activity className="h-5 w-5 text-slate-700" />
              <div>
                <h3 className="text-lg font-bold text-slate-900">Active Jobs Feed</h3>
                <p className="text-sm text-slate-500">Latest workshop jobs</p>
              </div>
            </div>
            <Link to="/autoparts/jobs" className="text-slate-700 text-sm font-bold inline-flex items-center gap-1">
              All <ArrowRight className="h-4 w-4" />
            </Link>
          </div>
          <div className="divide-y divide-slate-100 max-h-[420px] overflow-y-auto">
            {activeJobs.slice(0, 8).map((job: any) => {
              const statusColor =
                job.status === 'COMPLETED' || job.status === 'DELIVERED' ? 'bg-emerald-100 text-emerald-700' :
                job.status === 'CANCELLED' ? 'bg-rose-100 text-rose-700' :
                job.status === 'IN_PROGRESS' ? 'bg-amber-100 text-amber-700' :
                'bg-blue-100 text-blue-700';
              const priorityColor =
                job.priority === 'EMERGENCY' ? 'bg-red-600 text-white animate-pulse' :
                job.priority === 'URGENT' ? 'bg-red-500 text-white' :
                job.priority === 'HIGH' ? 'bg-amber-500 text-white' :
                'bg-slate-100 text-slate-700';
              return (
                <Link key={job.id} to={`/autoparts/jobs/${job.id}`}
                  className="px-6 py-3 flex items-center justify-between gap-3 hover:bg-slate-50 transition">
                  <div className="flex items-center gap-3 min-w-0">
                    <div className="h-10 w-10 rounded-xl bg-slate-100 text-slate-700 flex items-center justify-center shrink-0">
                      <Wrench className="h-5 w-5" />
                    </div>
                    <div className="min-w-0">
                      <div className="flex items-center gap-2 flex-wrap">
                        <span className="font-mono font-extrabold text-slate-900 text-sm">{job.jobNumber}</span>
                        <span className={`px-1.5 py-0.5 rounded text-[9px] font-extrabold uppercase ${statusColor}`}>{job.status}</span>
                        <span className={`px-1.5 py-0.5 rounded text-[9px] font-extrabold uppercase ${priorityColor}`}>{job.priority}</span>
                      </div>
                      <div className="text-xs text-slate-600 font-semibold mt-0.5 flex items-center gap-1">
                        <Car className="h-3 w-3" />
                        {job.registrationNumber} • {job.makeName} {job.modelName}
                      </div>
                    </div>
                  </div>
                  <div className="text-right shrink-0">
                    <div className="font-extrabold text-emerald-700 tabular-nums">{formatPKR(job.total)}</div>
                    <div className="text-[10px] text-slate-500 font-bold mt-0.5">{formatDate(job.createdAt)}</div>
                  </div>
                </Link>
              );
            })}
          </div>
        </section>
      )}

      {/* Top Parts */}
      <section className="rounded-3xl bg-white border border-slate-200 shadow-sm">
        <div className="px-6 py-5 border-b border-slate-100 flex items-center gap-2">
          <Award className="h-5 w-5 text-amber-500" />
          <div>
            <h3 className="text-lg font-bold text-slate-900">Best Selling Parts</h3>
            <p className="text-sm text-slate-500">Top parts this month</p>
          </div>
        </div>
        <div className="divide-y divide-slate-100">
          {data?.topProducts?.length ? (
            data.topProducts.slice(0, 5).map((p, idx) => {
              const rankColors = ['bg-amber-500', 'bg-slate-400', 'bg-orange-600', 'bg-violet-500', 'bg-blue-500'];
              return (
                <div key={p.productId} className="px-6 py-3 flex items-center justify-between gap-3 hover:bg-slate-50">
                  <div className="flex items-center gap-3 min-w-0">
                    <div className={`h-8 w-8 rounded-lg ${rankColors[idx]} text-white font-extrabold flex items-center justify-center text-sm shrink-0`}>{idx + 1}</div>
                    <div className="h-10 w-10 rounded-xl bg-slate-100 overflow-hidden flex items-center justify-center shrink-0">
                      {p.product?.images?.[0]?.url ? (
                        <img src={p.product.images[0].url} alt="" className="h-full w-full object-cover" />
                      ) : (
                        <Wrench className="h-4 w-4 text-slate-400" />
                      )}
                    </div>
                    <div className="min-w-0">
                      <div className="font-bold text-slate-900 truncate text-sm">{p.product?.name}</div>
                      <div className="text-xs text-slate-500">{p.quantitySold} sold • {p.orderCount} orders</div>
                    </div>
                  </div>
                  <div className="font-extrabold text-emerald-700 text-sm">{formatPKR(p.revenue)}</div>
                </div>
              );
            })
          ) : (
            <div className="px-6 py-12 text-center text-sm text-slate-500">No sales yet</div>
          )}
        </div>
      </section>
    </div>
  );
}
