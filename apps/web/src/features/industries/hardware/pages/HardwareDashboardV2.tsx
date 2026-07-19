import { useQuery } from '@tanstack/react-query';
import { Link } from 'react-router-dom';
import {
  Package, Building, Truck, FileText, AlertTriangle, Award,
  TrendingUp, TrendingDown, Target, Users, Layers,
  ArrowRight, Plus, Clock, DollarSign, Activity, Sparkles,
} from 'lucide-react';
import {
  ResponsiveContainer, AreaChart, Area, XAxis, YAxis, Tooltip, CartesianGrid,
  BarChart, Bar, PieChart, Pie, Cell, Legend,
} from 'recharts';
import { dashboardApi } from '@/api/dashboard.api';
import { projectsApi } from '../api/projects.api';
import { deliveriesApi } from '../api/deliveries.api';
import { quotationsApi } from '../api/quotations.api';
import { formatPKR } from '@/lib/format';
import { Button } from '@/components/ui/Button';
import { SubscriptionBanner } from '@/features/dashboard/components/SubscriptionBanner';
import { EmailVerifyBanner } from '@/components/auth/EmailVerifyBanner';
import {
  DashboardHero, HeroKpiCard, QuickStat, PnLCard,
  formatPercent, formatDate, PAYMENT_COLORS,
} from '@/features/dashboard/components/shared/DashboardShared';

export default function HardwareDashboardV2() {
  const { data, refetch, isRefetching } = useQuery({
    queryKey: ['dashboard-overview'],
    queryFn: dashboardApi.overview,
    refetchInterval: 60_000,
  });

  const { data: projects = [] } = useQuery({
    queryKey: ['hardware-projects-dash'],
    queryFn: () => projectsApi.list({ active: true }),
    refetchInterval: 60_000,
  });

  const { data: deliveriesSummary } = useQuery({
    queryKey: ['hardware-deliveries-summary'],
    queryFn: () => deliveriesApi.summary(),
    refetchInterval: 30_000,
  });

  const { data: quotationsSummary } = useQuery({
    queryKey: ['hardware-quotations-summary'],
    queryFn: () => quotationsApi.summary(),
    refetchInterval: 60_000,
  });

  const stats = data?.stats;
  const tenant = data?.tenant;

  const activeProjects = projects.filter((p: any) => !['COMPLETED', 'CANCELLED'].includes(p.status));
  const totalProjectValue = activeProjects.reduce((s: number, p: any) => s + Number(p.totalDelivered || 0), 0);

  const trendData = (data?.salesTrend7Days ?? []).map((p) => {
    const d = new Date(p.date);
    const dayName = ['Sun', 'Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat'][d.getDay()];
    return { ...p, label: dayName };
  });

  const hourlyData = (data?.hourlySalesToday ?? [])
    .filter((h) => h.sales > 0 || (h.hour >= 8 && h.hour <= 22))
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

      <DashboardHero
        gradient="from-slate-950 via-amber-900 to-orange-700"
        emoji="🔨"
        industryLabel="Hardware"
        industryBadgeColor="bg-amber-500/30 border border-amber-300/40"
        tenantName={tenant?.name}
        netProfit={stats?.netProfitToday ?? 0}
        salesToday={stats?.salesToday ?? 0}
        cogsToday={stats?.cogsToday ?? 0}
        expensesToday={stats?.expensesToday ?? 0}
        growthVsYesterday={growthVsYesterday}
        onRefresh={() => refetch()}
        isRefetching={isRefetching}
        posLabel="Open Hardware POS"
        posLink="/pos"
      />

      {/* Hardware KPIs */}
      <section className="grid sm:grid-cols-2 lg:grid-cols-4 gap-4">
        <HeroKpiCard
          title="Active Projects"
          value={activeProjects.length}
          subtitle={`${projects.length} total • ${formatPKR(totalProjectValue)} delivered`}
          icon={Building}
          color="from-blue-500 to-indigo-600"
          isHighlight
        />
        <HeroKpiCard
          title="Pending Deliveries"
          value={deliveriesSummary?.pending ?? 0}
          subtitle={`${deliveriesSummary?.inTransit ?? 0} in transit`}
          icon={Truck}
          color="from-emerald-500 to-teal-600"
        />
        <HeroKpiCard
          title="Active Quotations"
          value={quotationsSummary?.pendingCount ?? 0}
          subtitle={`${formatPKR(quotationsSummary?.acceptedValue ?? 0)} accepted`}
          icon={FileText}
          color="from-violet-500 to-purple-600"
        />
        <HeroKpiCard
          title="Aaj ka Profit"
          value={formatPKR(stats?.netProfitToday ?? 0)}
          subtitle={`${stats?.ordersToday ?? 0} orders`}
          icon={Target}
          color="from-amber-500 to-orange-600"
          trend={growthVsYesterday}
        />
      </section>

      {/* Projects Panel */}
      <section className="rounded-3xl bg-gradient-to-br from-blue-50 via-indigo-50 to-cyan-50 border-2 border-blue-200 p-5 shadow-sm">
        <div className="flex items-center justify-between mb-4 flex-wrap gap-2">
          <div className="flex items-center gap-2">
            <div className="h-10 w-10 rounded-2xl bg-blue-600 text-white flex items-center justify-center shadow-lg shadow-blue-500/30">
              <Building className="h-5 w-5" />
            </div>
            <div>
              <h3 className="text-lg font-extrabold text-blue-900">Active Construction Sites</h3>
              <p className="text-xs text-blue-700">Ongoing projects with material tracking</p>
            </div>
          </div>
          <Link to="/hardware/projects">
            <Button size="sm" className="bg-blue-600 hover:bg-blue-700">
              <Building className="h-3.5 w-3.5" /> All Projects
            </Button>
          </Link>
        </div>

        {activeProjects.length === 0 ? (
          <div className="rounded-xl bg-white border-2 border-dashed border-blue-200 p-6 text-center">
            <Building className="h-10 w-10 text-slate-400 mx-auto mb-2" />
            <p className="font-extrabold text-slate-700 text-sm">No active projects</p>
            <Link to="/hardware/projects" className="mt-2 inline-block text-xs font-extrabold text-blue-600 hover:underline">+ Add first project</Link>
          </div>
        ) : (
          <div className="grid sm:grid-cols-2 lg:grid-cols-3 gap-3">
            {activeProjects.slice(0, 6).map((p: any) => (
              <Link key={p.id} to={`/hardware/projects/${p.id}`}
                className="rounded-2xl bg-white border-2 border-blue-200 hover:border-blue-400 hover:shadow-md p-3 transition group">
                <div className="flex items-start gap-2">
                  <div className="h-10 w-10 rounded-xl bg-gradient-to-br from-blue-500 to-indigo-600 text-white flex items-center justify-center shrink-0">
                    <Building className="h-5 w-5" />
                  </div>
                  <div className="flex-1 min-w-0">
                    <div className="font-mono font-extrabold text-xs text-slate-500">{p.projectNumber}</div>
                    <div className="font-bold text-slate-900 truncate group-hover:text-blue-700">{p.name}</div>
                    <div className="text-[10px] text-slate-500 font-semibold truncate">{p.customerName}</div>
                  </div>
                </div>
                {p.totalOrdered > 0 && (
                  <div className="mt-2">
                    <div className="flex justify-between text-[9px] font-extrabold text-slate-500 mb-1">
                      <span>Delivered</span>
                      <span>{((p.totalDelivered / p.totalOrdered) * 100).toFixed(0)}%</span>
                    </div>
                    <div className="h-1.5 rounded-full bg-slate-100 overflow-hidden">
                      <div className="h-full bg-gradient-to-r from-blue-500 to-indigo-600" style={{ width: `${(p.totalDelivered / p.totalOrdered) * 100}%` }} />
                    </div>
                  </div>
                )}
                <div className="mt-2 text-xs font-extrabold text-emerald-700">{formatPKR(p.totalDelivered)} delivered</div>
              </Link>
            ))}
          </div>
        )}
      </section>

      {/* Deliveries Panel */}
      {deliveriesSummary && (
        <section className="grid sm:grid-cols-4 gap-3">
          <Link to="/hardware/deliveries" className="rounded-2xl bg-white border-2 border-slate-200 hover:border-amber-400 hover:shadow-md p-4 transition">
            <div className="h-9 w-9 rounded-xl bg-amber-100 text-amber-700 flex items-center justify-center mb-2">
              <Clock className="h-4 w-4" />
            </div>
            <div className="text-[10px] uppercase font-extrabold text-amber-700">Pending Dispatch</div>
            <div className="text-2xl font-extrabold text-slate-900 tabular-nums">{deliveriesSummary.pending}</div>
          </Link>
          <Link to="/hardware/deliveries" className="rounded-2xl bg-white border-2 border-slate-200 hover:border-orange-400 hover:shadow-md p-4 transition">
            <div className="h-9 w-9 rounded-xl bg-orange-100 text-orange-700 flex items-center justify-center mb-2">
              <Truck className="h-4 w-4" />
            </div>
            <div className="text-[10px] uppercase font-extrabold text-orange-700">In Transit</div>
            <div className="text-2xl font-extrabold text-slate-900 tabular-nums">{deliveriesSummary.inTransit}</div>
          </Link>
          <Link to="/hardware/deliveries" className="rounded-2xl bg-white border-2 border-slate-200 hover:border-blue-400 hover:shadow-md p-4 transition">
            <div className="h-9 w-9 rounded-xl bg-blue-100 text-blue-700 flex items-center justify-center mb-2">
              <Activity className="h-4 w-4" />
            </div>
            <div className="text-[10px] uppercase font-extrabold text-blue-700">Today Scheduled</div>
            <div className="text-2xl font-extrabold text-slate-900 tabular-nums">{deliveriesSummary.todayScheduled}</div>
          </Link>
          <Link to="/hardware/deliveries" className="rounded-2xl bg-white border-2 border-slate-200 hover:border-emerald-400 hover:shadow-md p-4 transition">
            <div className="h-9 w-9 rounded-xl bg-emerald-100 text-emerald-700 flex items-center justify-center mb-2">
              <Award className="h-4 w-4" />
            </div>
            <div className="text-[10px] uppercase font-extrabold text-emerald-700">Delivered</div>
            <div className="text-2xl font-extrabold text-slate-900 tabular-nums">{deliveriesSummary.deliveredCount}</div>
            <div className="text-[10px] font-bold text-emerald-700">{formatPKR(deliveriesSummary.deliveredRevenue)}</div>
          </Link>
        </section>
      )}

      {/* Trends */}
      <section className="grid lg:grid-cols-[1.5fr_1fr] gap-6">
        <div className="rounded-3xl bg-white border border-slate-200 shadow-sm p-6">
          <div className="flex items-center justify-between mb-5">
            <div>
              <h3 className="text-xl font-bold text-slate-900">7-Day Hardware Sales</h3>
              <p className="text-sm text-slate-500">Revenue & profit trend</p>
            </div>
            <Link to="/reports" className="text-amber-700 text-sm font-bold inline-flex items-center gap-1">
              Reports <ArrowRight className="h-4 w-4" />
            </Link>
          </div>
          {trendData.length >= 2 ? (
            <div className="h-[280px]">
              <ResponsiveContainer width="100%" height="100%">
                <AreaChart data={trendData}>
                  <defs>
                    <linearGradient id="hSales" x1="0" y1="0" x2="0" y2="1">
                      <stop offset="0%" stopColor="#a16207" stopOpacity={0.4} />
                      <stop offset="100%" stopColor="#a16207" stopOpacity={0} />
                    </linearGradient>
                    <linearGradient id="hProfit" x1="0" y1="0" x2="0" y2="1">
                      <stop offset="0%" stopColor="#10b981" stopOpacity={0.3} />
                      <stop offset="100%" stopColor="#10b981" stopOpacity={0} />
                    </linearGradient>
                  </defs>
                  <CartesianGrid strokeDasharray="3 3" stroke="#e2e8f0" />
                  <XAxis dataKey="label" stroke="#64748b" fontSize={12} />
                  <YAxis stroke="#64748b" fontSize={11} tickFormatter={(v) => `${(v / 1000).toFixed(0)}k`} />
                  <Tooltip formatter={(value: any) => formatPKR(Number(value))} contentStyle={{ borderRadius: 12 }} />
                  <Legend wrapperStyle={{ fontSize: 11 }} />
                  <Area type="monotone" dataKey="sales" name="Sales" stroke="#a16207" fill="url(#hSales)" strokeWidth={2.5} />
                  <Area type="monotone" dataKey="profit" name="Profit" stroke="#10b981" fill="url(#hProfit)" strokeWidth={2} />
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
              <h3 className="text-lg font-bold text-slate-900">Today's Peak Hours</h3>
              <p className="text-sm text-slate-500">Hourly sales</p>
            </div>
            <Clock className="h-5 w-5 text-amber-500" />
          </div>
          {hourlyData.length > 0 ? (
            <div className="h-[280px]">
              <ResponsiveContainer width="100%" height="100%">
                <BarChart data={hourlyData}>
                  <CartesianGrid strokeDasharray="3 3" stroke="#e2e8f0" />
                  <XAxis dataKey="label" stroke="#64748b" fontSize={9} interval={1} />
                  <YAxis stroke="#64748b" fontSize={11} tickFormatter={(v) => `${(v / 1000).toFixed(0)}k`} />
                  <Tooltip formatter={(value: any) => formatPKR(Number(value))} contentStyle={{ borderRadius: 12 }} />
                  <Bar dataKey="sales" fill="#a16207" radius={[6, 6, 0, 0]} />
                </BarChart>
              </ResponsiveContainer>
            </div>
          ) : (
            <div className="h-[280px] flex items-center justify-center text-sm text-slate-500">No sales today</div>
          )}
        </div>
      </section>

      {/* P&L */}
      <section className="rounded-3xl bg-white border border-slate-200 shadow-sm p-6">
        <div className="flex items-center justify-between mb-5 flex-wrap gap-2">
          <div>
            <h3 className="text-xl font-bold text-slate-900">Profit & Loss — Is Mahina</h3>
            <p className="text-sm text-slate-500">Hardware business monthly</p>
          </div>
          {growthVsLastMonth !== 0 && (
            <div className={`inline-flex items-center gap-1.5 px-3 py-1.5 rounded-xl text-sm font-extrabold ${
              growthVsLastMonth >= 0 ? 'bg-emerald-100 text-emerald-700' : 'bg-rose-100 text-rose-700'
            }`}>
              {growthVsLastMonth >= 0 ? <TrendingUp className="h-3.5 w-3.5" /> : <TrendingDown className="h-3.5 w-3.5" />}
              {formatPercent(growthVsLastMonth)}
            </div>
          )}
        </div>
        <div className="grid sm:grid-cols-4 gap-3">
          <PnLCard label="Revenue" value={formatPKR(stats?.salesMonth ?? 0)} sub={`${stats?.ordersMonth ?? 0} sales`} color="emerald" />
          <PnLCard label="Material Cost" value={formatPKR(stats?.cogsMonth ?? 0)} sub="Purchase cost" color="rose" />
          <PnLCard label="Expenses" value={formatPKR(stats?.expensesMonth ?? 0)} sub="Rent, delivery, staff" color="amber" />
          <PnLCard label="Net Profit" value={formatPKR(stats?.netProfitMonth ?? 0)} sub="Bottom line" color="orange" isHighlight />
        </div>
      </section>

      {/* Quick Stats */}
      <section className="grid grid-cols-2 sm:grid-cols-3 xl:grid-cols-6 gap-3">
        <QuickStat title="Products" value={stats?.totalProducts ?? 0} icon={Package} tone="amber" link="/products" />
        <QuickStat title="Brands" value={0} icon={Award} tone="orange" link="/hardware/brands" />
        <QuickStat title="Projects" value={activeProjects.length} icon={Building} tone="blue" link="/hardware/projects" />
        <QuickStat title="Deliveries" value={deliveriesSummary?.pending ?? 0} icon={Truck} tone="emerald" link="/hardware/deliveries" alert />
        <QuickStat title="Quotations" value={quotationsSummary?.pendingCount ?? 0} icon={FileText} tone="violet" link="/hardware/quotations" />
        <QuickStat title="Low Stock" value={stats?.lowStockCount ?? 0} icon={AlertTriangle} tone="rose" link="/hardware/reorder-rules" alert />
      </section>

      {/* Top Products + Payments */}
      <section className="grid lg:grid-cols-2 gap-6">
        <div className="rounded-3xl bg-white border border-slate-200 shadow-sm">
          <div className="px-6 py-5 border-b border-slate-100 flex items-center gap-2">
            <Award className="h-5 w-5 text-amber-500" />
            <div>
              <h3 className="text-lg font-bold text-slate-900">Top Selling Hardware</h3>
              <p className="text-sm text-slate-500">Best products this month</p>
            </div>
          </div>
          <div className="divide-y divide-slate-100">
            {data?.topProducts?.length ? (
              data.topProducts.slice(0, 5).map((p, idx) => {
                const rankColors = ['bg-amber-500', 'bg-slate-400', 'bg-orange-600', 'bg-violet-500', 'bg-blue-500'];
                return (
                  <div key={p.productId} className="px-6 py-3 flex items-center justify-between gap-3 hover:bg-slate-50">
                    <div className="flex items-center gap-3 min-w-0">
                      <div className={`h-8 w-8 rounded-lg ${rankColors[idx]} text-white font-extrabold flex items-center justify-center text-sm shrink-0`}>
                        {idx + 1}
                      </div>
                      <div className="h-10 w-10 rounded-xl bg-slate-100 overflow-hidden flex items-center justify-center shrink-0">
                        {p.product?.images?.[0]?.url ? (
                          <img src={p.product.images[0].url} alt="" className="h-full w-full object-cover" />
                        ) : (
                          <Package className="h-4 w-4 text-slate-400" />
                        )}
                      </div>
                      <div className="min-w-0">
                        <div className="font-bold text-slate-900 truncate text-sm">{p.product?.name}</div>
                        <div className="text-xs text-slate-500">{p.quantitySold.toFixed(0)} {p.product?.unit} • {p.orderCount} orders</div>
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
        </div>

        <div className="rounded-3xl bg-white border border-slate-200 shadow-sm p-6">
          <div className="flex items-center justify-between mb-4">
            <div>
              <h3 className="text-lg font-bold text-slate-900">Payment Methods</h3>
              <p className="text-sm text-slate-500">This month</p>
            </div>
          </div>
          {data?.paymentBreakdown?.length ? (
            <div className="h-[260px]">
              <ResponsiveContainer width="100%" height="100%">
                <PieChart>
                  <Pie
                    data={data.paymentBreakdown}
                    cx="50%" cy="45%" outerRadius={80} innerRadius={40} dataKey="total"
                    label={(entry: any) => {
                      const sum = data.paymentBreakdown.reduce((s, p) => s + p.total, 0);
                      const pct = sum > 0 ? ((entry.total / sum) * 100).toFixed(0) : '0';
                      return `${pct}%`;
                    }}
                    labelLine={false}
                  >
                    {data.paymentBreakdown.map((p) => (
                      <Cell key={p.method} fill={PAYMENT_COLORS[p.method] || '#64748b'} />
                    ))}
                  </Pie>
                  <Tooltip formatter={(value: any) => formatPKR(Number(value))} contentStyle={{ borderRadius: 12 }} />
                  <Legend wrapperStyle={{ fontSize: 10, paddingTop: 12 }} iconType="circle" />
                </PieChart>
              </ResponsiveContainer>
            </div>
          ) : (
            <div className="h-[260px] flex items-center justify-center text-sm text-slate-500">No payment data</div>
          )}
        </div>
      </section>
    </div>
  );
}
