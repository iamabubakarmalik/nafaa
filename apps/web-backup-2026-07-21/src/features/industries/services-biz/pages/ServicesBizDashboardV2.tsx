import { useQuery } from '@tanstack/react-query';
import { Link } from 'react-router-dom';
import {
  Wrench, LayoutDashboard, Sparkles, RefreshCw, TrendingUp, TrendingDown,
  DollarSign, Clock, ArrowRight, MapPin, AlertCircle, CheckCircle2, Award,
  Zap, Shield, Users, Briefcase, FileText, Calendar, Star, Package,
} from 'lucide-react';
import {
  ResponsiveContainer, AreaChart, Area, XAxis, YAxis, Tooltip, CartesianGrid, Legend,
} from 'recharts';
import { dashboardApi } from '@/api/dashboard.api';
import { servicesDashboardApi } from '../api/dashboard.api';
import { jobsApi } from '../api/jobs.api';
import { amcApi } from '../api/amc.api';
import { formatPKR } from '@/lib/format';
import { SubscriptionBanner } from '@/features/dashboard/components/SubscriptionBanner';
import { EmailVerifyBanner } from '@/components/auth/EmailVerifyBanner';
import { DashboardHero, HeroKpiCard, QuickStat, PnLCard, formatPercent } from '@/features/dashboard/components/shared/DashboardShared';
import { differenceInDays } from 'date-fns';

const PRIORITY_COLORS: Record<string, string> = {
  EMERGENCY: 'bg-red-600 animate-pulse', URGENT: 'bg-red-500',
  HIGH: 'bg-amber-500', NORMAL: 'bg-blue-500', LOW: 'bg-slate-500',
};

export default function ServicesBizDashboardV2() {
  const { data, refetch, isRefetching } = useQuery({
    queryKey: ['dashboard-overview'], queryFn: dashboardApi.overview, refetchInterval: 60_000,
  });
  const { data: svcDash } = useQuery({
    queryKey: ['services-dashboard-overview'], queryFn: () => servicesDashboardApi.overview().catch(() => null), refetchInterval: 60_000,
  });
  const { data: activeJobs = [] } = useQuery({
    queryKey: ['jobs-dashboard'],
    queryFn: () => jobsApi.list({ statusIn: ['SCHEDULED', 'ASSIGNED', 'DISPATCHED', 'EN_ROUTE', 'ARRIVED', 'IN_PROGRESS'] }),
  });
  const { data: renewalDue = [] } = useQuery({
    queryKey: ['amc-renewal-due'], queryFn: () => amcApi.renewalDue(30),
  });

  const stats = data?.stats;
  const tenant = data?.tenant;

  const jobStats = (() => {
    const emergency = activeJobs.filter((j: any) => ['EMERGENCY', 'URGENT'].includes(j.priority)).length;
    const today = activeJobs.filter((j: any) => {
      if (!j.scheduledStart) return false;
      const d = new Date(j.scheduledStart);
      return d.toDateString() === new Date().toDateString();
    }).length;
    const revenue = activeJobs.reduce((s: number, j: any) => s + Number(j.totalCharge || 0), 0);
    const collected = activeJobs.reduce((s: number, j: any) => s + Number(j.paidAmount || 0), 0);
    return { active: activeJobs.length, emergency, today, revenue, pending: revenue - collected };
  })();

  const trendData = (data?.salesTrend7Days ?? []).map((p) => {
    const d = new Date(p.date);
    return { ...p, label: ['Sun', 'Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat'][d.getDay()] };
  });

  const growthVsYesterday = stats?.salesGrowthVsYesterday ?? 0;
  const growthVsLastMonth = stats?.salesGrowthVsLastMonth ?? 0;

  return (
    <div className="space-y-6">
      <SubscriptionBanner />
      <EmailVerifyBanner />

      <DashboardHero
        gradient="from-slate-950 via-cyan-900 to-blue-700"
        emoji="🛠️"
        industryLabel="Services"
        industryBadgeColor="bg-cyan-500/30 border border-cyan-300/40"
        tenantName={tenant?.name}
        netProfit={stats?.netProfitToday ?? 0}
        salesToday={stats?.salesToday ?? 0}
        cogsToday={stats?.cogsToday ?? 0}
        expensesToday={stats?.expensesToday ?? 0}
        growthVsYesterday={growthVsYesterday}
        onRefresh={() => refetch()}
        isRefetching={isRefetching}
        posLabel="Open Services POS"
        posLink="/pos"
      />

      {jobStats.emergency > 0 && (
        <section className="rounded-3xl bg-gradient-to-r from-red-600 to-rose-600 text-white p-4 shadow-lg animate-pulse">
          <div className="flex items-center gap-3">
            <Zap className="h-8 w-8" />
            <div className="flex-1">
              <div className="text-lg font-extrabold">🚨 {jobStats.emergency} EMERGENCY/URGENT jobs pending</div>
              <div className="text-xs font-bold text-white/80">Immediate attention required</div>
            </div>
            <Link to="/services-biz/jobs?priority=EMERGENCY">
              <button className="px-4 py-2 rounded-xl bg-white text-red-700 font-extrabold text-sm shadow-lg">View Now <ArrowRight className="h-4 w-4 inline" /></button>
            </Link>
          </div>
        </section>
      )}

      {jobStats.active > 0 && (
        <section className="rounded-3xl bg-gradient-to-br from-cyan-100 via-blue-50 to-cyan-100 border-2 border-cyan-300 shadow-lg p-5">
          <div className="flex items-center justify-between flex-wrap gap-3">
            <div className="flex items-center gap-3">
              <div className="h-14 w-14 rounded-2xl bg-gradient-to-br from-cyan-500 to-blue-600 text-white flex items-center justify-center shadow-lg animate-pulse">
                <Briefcase className="h-7 w-7" />
              </div>
              <div>
                <div className="text-[10px] uppercase tracking-wider font-extrabold text-cyan-700">Active Service Jobs</div>
                <div className="text-2xl font-extrabold text-slate-900">{jobStats.active} jobs in progress</div>
                <div className="text-sm text-slate-700 font-semibold mt-0.5">
                  Today: <span className="font-extrabold text-red-700">{jobStats.today}</span> •
                  Revenue: <span className="font-extrabold text-emerald-700">{formatPKR(jobStats.revenue)}</span> •
                  Pending: <span className="font-extrabold text-amber-700">{formatPKR(jobStats.pending)}</span>
                </div>
              </div>
            </div>
            <Link to="/services-biz/jobs">
              <button className="px-4 py-2 rounded-xl bg-gradient-to-r from-cyan-600 to-blue-700 text-white font-extrabold text-sm shadow-lg hover:shadow-xl hover:-translate-y-0.5 transition">
                Manage Jobs <ArrowRight className="h-3.5 w-3.5 inline ml-1" />
              </button>
            </Link>
          </div>
        </section>
      )}

      <section className="grid sm:grid-cols-2 lg:grid-cols-4 gap-4">
        <HeroKpiCard title="Active Jobs" value={jobStats.active} subtitle={`${jobStats.today} today`} icon={Briefcase} color="from-cyan-500 to-blue-600" isHighlight />
        <HeroKpiCard title="Technicians" value={svcDash?.totals?.availableTechnicians ?? 0} subtitle="Available now" icon={Users} color="from-violet-500 to-purple-600" />
        <HeroKpiCard title="Active AMC" value={svcDash?.totals?.activeAmc ?? 0} subtitle="Contracts running" icon={Shield} color="from-emerald-500 to-green-600" />
        <HeroKpiCard title="Renewal Due" value={renewalDue.length} subtitle="Next 30 days" icon={AlertCircle} color="from-amber-500 to-orange-600" trend={growthVsYesterday} />
      </section>

      <section className="rounded-3xl bg-white border border-slate-200 shadow-sm p-6">
        <div className="flex items-center justify-between mb-5">
          <div>
            <h3 className="text-xl font-bold text-slate-900">7-Day Service Sales</h3>
            <p className="text-sm text-slate-500">Revenue & profit trend</p>
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
                  <linearGradient id="svcSales" x1="0" y1="0" x2="0" y2="1">
                    <stop offset="0%" stopColor="#0891b2" stopOpacity={0.4} />
                    <stop offset="100%" stopColor="#0891b2" stopOpacity={0} />
                  </linearGradient>
                  <linearGradient id="svcProfit" x1="0" y1="0" x2="0" y2="1">
                    <stop offset="0%" stopColor="#10b981" stopOpacity={0.3} />
                    <stop offset="100%" stopColor="#10b981" stopOpacity={0} />
                  </linearGradient>
                </defs>
                <CartesianGrid strokeDasharray="3 3" stroke="#e2e8f0" />
                <XAxis dataKey="label" stroke="#64748b" fontSize={12} />
                <YAxis stroke="#64748b" fontSize={11} tickFormatter={(v) => `${(v / 1000).toFixed(0)}k`} />
                <Tooltip formatter={(value: any) => formatPKR(Number(value))} contentStyle={{ borderRadius: 12 }} />
                <Legend wrapperStyle={{ fontSize: 11 }} />
                <Area type="monotone" dataKey="sales" name="Sales" stroke="#0891b2" fill="url(#svcSales)" strokeWidth={2.5} />
                <Area type="monotone" dataKey="profit" name="Profit" stroke="#10b981" fill="url(#svcProfit)" strokeWidth={2} />
              </AreaChart>
            </ResponsiveContainer>
          </div>
        ) : <div className="h-[280px] flex items-center justify-center text-sm text-slate-500">Need more data</div>}
      </section>

      <section className="rounded-3xl bg-white border border-slate-200 shadow-sm p-6">
        <div className="flex items-center justify-between mb-5 flex-wrap gap-2">
          <div>
            <h3 className="text-xl font-bold text-slate-900">Profit & Loss — Is Mahina</h3>
            <p className="text-sm text-slate-500">Service business performance</p>
          </div>
          {growthVsLastMonth !== 0 && (
            <div className={`inline-flex items-center gap-1.5 px-3 py-1.5 rounded-xl text-sm font-extrabold ${growthVsLastMonth >= 0 ? 'bg-emerald-100 text-emerald-700' : 'bg-rose-100 text-rose-700'}`}>
              {growthVsLastMonth >= 0 ? <TrendingUp className="h-3.5 w-3.5" /> : <TrendingDown className="h-3.5 w-3.5" />}
              {formatPercent(growthVsLastMonth)} vs last month
            </div>
          )}
        </div>
        <div className="grid sm:grid-cols-4 gap-3">
          <PnLCard label="Revenue" value={formatPKR(stats?.salesMonth ?? 0)} sub={`${stats?.ordersMonth ?? 0} orders`} color="emerald" />
          <PnLCard label="Parts Cost" value={formatPKR(stats?.cogsMonth ?? 0)} sub="COGS" color="rose" />
          <PnLCard label="Expenses" value={formatPKR(stats?.expensesMonth ?? 0)} sub="Operational" color="amber" />
          <PnLCard label="Net Profit" value={formatPKR(stats?.netProfitMonth ?? 0)} sub="Bottom line" color="violet" isHighlight />
        </div>
      </section>

      <section className="grid grid-cols-2 sm:grid-cols-4 lg:grid-cols-8 gap-3">
        <QuickLink to="/services-biz/jobs/new" icon={Briefcase} label="New Job" color="cyan" badge="FAST" />
        <QuickLink to="/services-biz/jobs" icon={Package} label="Jobs" color="blue" />
        <QuickLink to="/services-biz/dispatch" icon={MapPin} label="Live Map" color="red" />
        <QuickLink to="/services-biz/catalog" icon={Wrench} label="Services" color="teal" />
        <QuickLink to="/services-biz/technicians" icon={Users} label="Technicians" color="violet" />
        <QuickLink to="/services-biz/quotes" icon={FileText} label="Quotes" color="amber" />
        <QuickLink to="/services-biz/amc" icon={Shield} label="AMC" color="emerald" />
        <QuickLink to="/services-biz-services/new" icon={Sparkles} label="+ New Service" color="rose" />
      </section>

      <section className="grid lg:grid-cols-2 gap-6">
        <div className="rounded-3xl bg-white border border-slate-200 shadow-sm overflow-hidden">
          <div className="px-6 py-4 border-b border-slate-100 flex items-center justify-between">
            <div>
              <h3 className="text-lg font-bold text-slate-900 flex items-center gap-2"><Briefcase className="h-5 w-5 text-cyan-600" /> Upcoming Jobs</h3>
              <p className="text-xs text-slate-500 font-semibold">Scheduled today</p>
            </div>
            <Link to="/services-biz/jobs" className="text-xs font-extrabold text-cyan-600 inline-flex items-center gap-1">All <ArrowRight className="h-3 w-3" /></Link>
          </div>
          <div className="divide-y divide-slate-100 max-h-96 overflow-y-auto">
            {activeJobs.length === 0 ? (
              <div className="py-12 text-center text-sm text-slate-500 font-semibold"><Calendar className="h-8 w-8 text-slate-300 mx-auto mb-2" />No active jobs</div>
            ) : (
              activeJobs.slice(0, 10).map((j: any) => (
                <Link key={j.id} to={`/services-biz/jobs/${j.id}`} className="px-6 py-3 flex items-center gap-3 hover:bg-slate-50 transition">
                  <div className={`h-10 w-10 rounded-xl text-white flex items-center justify-center shrink-0 ${PRIORITY_COLORS[j.priority] || 'bg-cyan-500'}`}>
                    <Wrench className="h-5 w-5" />
                  </div>
                  <div className="flex-1 min-w-0">
                    <div className="flex items-center gap-2 flex-wrap">
                      <span className="font-extrabold text-sm text-slate-900">{j.jobNumber}</span>
                      <span className={`px-1.5 py-0.5 rounded text-[9px] font-extrabold uppercase text-white ${PRIORITY_COLORS[j.priority] || 'bg-blue-500'}`}>{j.priority}</span>
                    </div>
                    <div className="text-xs text-slate-600 font-bold truncate">{j.customerName} • {j.serviceName}</div>
                  </div>
                  <div className="text-right shrink-0">
                    <div className="text-xs font-extrabold text-slate-700 uppercase">{j.status.replace('_', ' ')}</div>
                    <div className="text-[10px] font-bold text-emerald-700">{formatPKR(j.totalCharge)}</div>
                  </div>
                </Link>
              ))
            )}
          </div>
        </div>

        <div className="rounded-3xl bg-white border border-slate-200 shadow-sm overflow-hidden">
          <div className="px-6 py-4 border-b border-slate-100 flex items-center justify-between">
            <div>
              <h3 className="text-lg font-bold text-slate-900 flex items-center gap-2"><Shield className="h-5 w-5 text-emerald-600" /> AMC Renewal Due</h3>
              <p className="text-xs text-slate-500 font-semibold">Next 30 days</p>
            </div>
            <Link to="/services-biz/amc" className="text-xs font-extrabold text-emerald-600 inline-flex items-center gap-1">All <ArrowRight className="h-3 w-3" /></Link>
          </div>
          <div className="divide-y divide-slate-100 max-h-96 overflow-y-auto">
            {renewalDue.length === 0 ? (
              <div className="py-12 text-center text-sm text-slate-500 font-semibold"><CheckCircle2 className="h-8 w-8 text-emerald-500 mx-auto mb-2" />No renewals due</div>
            ) : (
              renewalDue.slice(0, 10).map((amc: any) => {
                const daysLeft = differenceInDays(new Date(amc.endDate), new Date());
                return (
                  <Link key={amc.id} to={`/services-biz/amc/${amc.id}`} className="px-6 py-3 flex items-center gap-3 hover:bg-slate-50 transition">
                    <div className="h-10 w-10 rounded-xl bg-gradient-to-br from-amber-500 to-orange-600 text-white flex items-center justify-center shrink-0">
                      <Shield className="h-5 w-5" />
                    </div>
                    <div className="flex-1 min-w-0">
                      <div className="flex items-center gap-2 flex-wrap">
                        <span className="font-extrabold text-sm">{amc.amcNumber}</span>
                        <span className="px-1.5 py-0.5 rounded bg-amber-100 text-amber-700 text-[9px] font-extrabold uppercase">{amc.type}</span>
                      </div>
                      <div className="text-xs text-slate-700 font-bold truncate">{amc.customerName}</div>
                    </div>
                    <div className={`text-sm font-extrabold shrink-0 ${daysLeft <= 7 ? 'text-red-700' : daysLeft <= 15 ? 'text-amber-700' : 'text-slate-700'}`}>
                      {daysLeft}d left
                    </div>
                  </Link>
                );
              })
            )}
          </div>
        </div>
      </section>

      <section className="grid grid-cols-2 sm:grid-cols-3 xl:grid-cols-6 gap-3">
        <QuickStat title="Services" value={svcDash?.totals?.totalServices ?? 0} icon={Wrench} tone="cyan" link="/services-biz/catalog" />
        <QuickStat title="Technicians" value={svcDash?.totals?.totalTechnicians ?? 0} icon={Users} tone="violet" link="/services-biz/technicians" />
        <QuickStat title="Customers" value={stats?.totalCustomers ?? 0} icon={Users} tone="blue" link="/customers" />
        <QuickStat title="Quotes" value={svcDash?.totals?.activeQuotes ?? 0} icon={FileText} tone="amber" link="/services-biz/quotes" />
        <QuickStat title="AMC Active" value={svcDash?.totals?.activeAmc ?? 0} icon={Shield} tone="emerald" link="/services-biz/amc" />
        <QuickStat title="Emergency Jobs" value={jobStats.emergency} icon={Zap} tone="rose" link="/services-biz/jobs?priority=EMERGENCY" alert={jobStats.emergency > 0} />
      </section>
    </div>
  );
}

function QuickLink({ to, icon: Icon, label, color, badge }: any) {
  const colors: Record<string, string> = {
    cyan: 'from-cyan-500 to-blue-600', blue: 'from-blue-500 to-cyan-600',
    red: 'from-red-500 to-rose-600', teal: 'from-teal-500 to-cyan-600',
    violet: 'from-violet-500 to-purple-600', amber: 'from-amber-500 to-orange-600',
    emerald: 'from-emerald-500 to-green-600', rose: 'from-rose-500 to-pink-600',
  };
  return (
    <Link to={to} className="group rounded-2xl bg-white border-2 border-slate-200 p-4 hover:border-slate-300 hover:shadow-lg hover:-translate-y-0.5 transition relative">
      {badge && <span className="absolute top-2 right-2 px-1.5 py-0.5 rounded bg-red-500 text-white text-[8px] font-extrabold uppercase animate-pulse">{badge}</span>}
      <div className={`h-11 w-11 rounded-xl bg-gradient-to-br ${colors[color]} text-white flex items-center justify-center shadow-lg group-hover:scale-110 transition-transform mb-2`}>
        <Icon className="h-5 w-5" />
      </div>
      <div className="text-xs font-extrabold text-slate-900">{label}</div>
    </Link>
  );
}
