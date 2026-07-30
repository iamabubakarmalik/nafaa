import { useQuery } from '@tanstack/react-query';
import { Link } from 'react-router-dom';
import {
  Beef, ShieldCheck, Weight, Heart, Scissors, Building2,
  TrendingUp, TrendingDown, Wallet, Target, Sparkles,
  Package, Award, ArrowRight, Plus, Clock, Users,
  DollarSign, Activity, AlertTriangle, ChevronRight,
  ShoppingCart, Star, Snowflake, Leaf,
} from 'lucide-react';
import {
  ResponsiveContainer, AreaChart, Area, XAxis, YAxis, Tooltip, CartesianGrid,
  BarChart, Bar, PieChart, Pie, Cell, Legend,
} from 'recharts';
import { dashboardApi } from '@modules/dashboard/api/dashboard.api';
import { liveAnimalsApi } from '../api/live-animals.api';
import { slaughterApi } from '../api/slaughter.api';
import { formatPKR } from '@core/lib/format';
import { Button } from '@core/ui/Button';
import { SubscriptionBanner } from '@modules/dashboard/components/SubscriptionBanner';
import { EmailVerifyBanner } from '@core/components/auth/EmailVerifyBanner';
import {
  DashboardHero, HeroKpiCard, QuickStat, PnLCard,
  formatPercent, formatDate, PAYMENT_COLORS,
} from '@modules/dashboard/components/shared/DashboardShared';

export default function MeatDashboardV2() {
  const { data, refetch, isRefetching } = useQuery({
    queryKey: ['dashboard-overview'],
    queryFn: dashboardApi.overview,
    refetchInterval: 60_000,
  });

  const { data: liveAnimalsSummary } = useQuery({
    queryKey: ['live-animals-summary'],
    queryFn: () => liveAnimalsApi.summary(),
    refetchInterval: 60_000,
  });

  const { data: halalCompliance } = useQuery({
    queryKey: ['halal-compliance'],
    queryFn: () => slaughterApi.halalCompliance(),
    refetchInterval: 60_000,
  });

  const stats = data?.stats;
  const tenant = data?.tenant;

  const trendData = (data?.salesTrend7Days ?? []).map((p) => {
    const d = new Date(p.date);
    const dayName = ['Sun', 'Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat'][d.getDay()];
    return { ...p, label: dayName };
  });

  const hourlyData = (data?.hourlySalesToday ?? [])
    .filter((h) => h.sales > 0 || (h.hour >= 7 && h.hour <= 21))
    .map((h) => ({
      ...h,
      label: h.hour === 0 ? '12 AM' : h.hour < 12 ? `${h.hour} AM` : h.hour === 12 ? '12 PM' : `${h.hour - 12} PM`,
    }));

  const growthVsYesterday = stats?.salesGrowthVsYesterday ?? 0;
  const growthVsLastMonth = stats?.salesGrowthVsLastMonth ?? 0;

  const totalInvestment = (liveAnimalsSummary?.totalCost?._sum?.purchasePrice ?? 0) + (liveAnimalsSummary?.totalCost?._sum?.totalFeedCost ?? 0);

  return (
    <div className="space-y-6">
      <SubscriptionBanner />
      <EmailVerifyBanner />

      <DashboardHero
        gradient="from-slate-950 via-red-900 to-rose-800"
        emoji="🥩"
        industryLabel="Meat"
        industryBadgeColor="bg-red-500/30 border border-red-300/40"
        tenantName={tenant?.name}
        netProfit={stats?.netProfitToday ?? 0}
        salesToday={stats?.salesToday ?? 0}
        cogsToday={stats?.cogsToday ?? 0}
        expensesToday={stats?.expensesToday ?? 0}
        growthVsYesterday={growthVsYesterday}
        onRefresh={() => refetch()}
        isRefetching={isRefetching}
        posLabel="Open Meat POS"
        posLink="/pos"
      />

      <section className="grid sm:grid-cols-2 lg:grid-cols-4 gap-4">
        <HeroKpiCard
          title="Alive Animals"
          value={liveAnimalsSummary?.aliveCount ?? 0}
          subtitle="Livestock in stock"
          icon={Heart}
          color="from-emerald-500 to-green-600"
          isHighlight
        />
        <HeroKpiCard
          title="Halal Compliance"
          value={`${(halalCompliance?.halalPct ?? 100).toFixed(0)}%`}
          subtitle={`${halalCompliance?.halal ?? 0} halal slaughters`}
          icon={ShieldCheck}
          color="from-green-500 to-emerald-600"
        />
        <HeroKpiCard
          title="Total Investment"
          value={formatPKR(totalInvestment)}
          subtitle="Purchase + feed cost"
          icon={DollarSign}
          color="from-amber-500 to-orange-600"
        />
        <HeroKpiCard
          title="Aaj ka Profit"
          value={formatPKR(stats?.netProfitToday ?? 0)}
          subtitle={`${stats?.ordersToday ?? 0} orders • AOV ${formatPKR(stats?.aovToday ?? 0)}`}
          icon={Target}
          color="from-red-500 to-rose-700"
          trend={growthVsYesterday}
        />
      </section>

      <section className="rounded-3xl bg-gradient-to-br from-red-50 via-rose-50 to-orange-50 border-2 border-red-200 p-5 shadow-sm">
        <div className="flex items-center justify-between mb-4 flex-wrap gap-2">
          <div className="flex items-center gap-2">
            <div className="h-10 w-10 rounded-2xl bg-red-600 text-white flex items-center justify-center shadow-lg shadow-red-500/30">
              <Beef className="h-5 w-5" />
            </div>
            <div>
              <h3 className="text-lg font-extrabold text-red-900">Livestock & Slaughter Operations</h3>
              <p className="text-xs text-red-700">Farm to shop pipeline</p>
            </div>
          </div>
          <div className="flex gap-2">
            <Link to="/meat/live-animals">
              <Button variant="secondary" size="sm">
                <Heart className="h-3.5 w-3.5" /> Animals
              </Button>
            </Link>
            <Link to="/meat/slaughter">
              <Button size="sm" className="bg-red-600 hover:bg-red-700">
                <ShieldCheck className="h-3.5 w-3.5" /> Slaughter Log
              </Button>
            </Link>
          </div>
        </div>

        <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
          <div className="rounded-2xl bg-white border-2 border-emerald-200 p-3">
            <div className="text-[10px] uppercase font-extrabold text-emerald-700">Alive</div>
            <div className="text-2xl font-extrabold text-emerald-900 tabular-nums mt-1">{liveAnimalsSummary?.aliveCount ?? 0}</div>
            <div className="text-[10px] font-bold text-slate-500">In inventory</div>
          </div>
          <div className="rounded-2xl bg-white border-2 border-amber-200 p-3">
            <div className="text-[10px] uppercase font-extrabold text-amber-700">Feed Cost</div>
            <div className="text-lg font-extrabold text-amber-900 tabular-nums mt-1">{formatPKR(liveAnimalsSummary?.totalCost?._sum?.totalFeedCost ?? 0)}</div>
            <div className="text-[10px] font-bold text-slate-500">Total spent</div>
          </div>
          <div className="rounded-2xl bg-white border-2 border-green-200 p-3">
            <div className="text-[10px] uppercase font-extrabold text-green-700">Halal Cert</div>
            <div className="text-2xl font-extrabold text-green-900 tabular-nums mt-1">{halalCompliance?.withCert ?? 0}</div>
            <div className="text-[10px] font-bold text-slate-500">With certificates</div>
          </div>
          <div className="rounded-2xl bg-white border-2 border-blue-200 p-3">
            <div className="text-[10px] uppercase font-extrabold text-blue-700">Vet Inspected</div>
            <div className="text-2xl font-extrabold text-blue-900 tabular-nums mt-1">{halalCompliance?.withVet ?? 0}</div>
            <div className="text-[10px] font-bold text-slate-500">Passed inspection</div>
          </div>
        </div>
      </section>

      <section className="grid sm:grid-cols-2 gap-4">
        <Link to="/meat/cutting" className="rounded-3xl bg-gradient-to-br from-violet-500 to-purple-600 text-white p-5 shadow-lg shadow-violet-500/30 hover:shadow-xl transition">
          <div className="flex items-center gap-3 mb-3">
            <div className="h-12 w-12 rounded-2xl bg-white/20 flex items-center justify-center">
              <Scissors className="h-6 w-6" />
            </div>
            <div>
              <div className="text-[10px] font-extrabold uppercase tracking-wider opacity-90">Cutting Jobs</div>
              <h3 className="text-2xl font-bold mt-1">Cut Orders</h3>
            </div>
          </div>
          <div className="pt-3 border-t border-white/20 text-xs opacity-90 flex items-center justify-between">
            <span>Manage cutting jobs</span>
            <ArrowRight className="h-4 w-4" />
          </div>
        </Link>

        <Link to="/meat/wholesale" className="rounded-3xl bg-gradient-to-br from-amber-500 to-orange-600 text-white p-5 shadow-lg shadow-amber-500/30 hover:shadow-xl transition">
          <div className="flex items-center gap-3 mb-3">
            <div className="h-12 w-12 rounded-2xl bg-white/20 flex items-center justify-center">
              <Building2 className="h-6 w-6" />
            </div>
            <div>
              <div className="text-[10px] font-extrabold uppercase tracking-wider opacity-90">Wholesale</div>
              <h3 className="text-2xl font-bold mt-1">B2B Accounts</h3>
            </div>
          </div>
          <div className="pt-3 border-t border-white/20 text-xs opacity-90 flex items-center justify-between">
            <span>Restaurant/hotel clients</span>
            <ArrowRight className="h-4 w-4" />
          </div>
        </Link>
      </section>

      <section className="grid lg:grid-cols-[1.5fr_1fr] gap-6">
        <div className="rounded-3xl bg-white border border-slate-200 shadow-sm p-6">
          <div className="flex items-center justify-between mb-5">
            <div>
              <h3 className="text-xl font-bold text-slate-900">7-Day Meat Sales</h3>
              <p className="text-sm text-slate-500">Revenue & profit</p>
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
                    <linearGradient id="mtSales" x1="0" y1="0" x2="0" y2="1">
                      <stop offset="0%" stopColor="#dc2626" stopOpacity={0.4} />
                      <stop offset="100%" stopColor="#dc2626" stopOpacity={0} />
                    </linearGradient>
                    <linearGradient id="mtProfit" x1="0" y1="0" x2="0" y2="1">
                      <stop offset="0%" stopColor="#10b981" stopOpacity={0.3} />
                      <stop offset="100%" stopColor="#10b981" stopOpacity={0} />
                    </linearGradient>
                  </defs>
                  <CartesianGrid strokeDasharray="3 3" stroke="#e2e8f0" />
                  <XAxis dataKey="label" stroke="#64748b" fontSize={12} />
                  <YAxis stroke="#64748b" fontSize={11} tickFormatter={(v) => `${(v / 1000).toFixed(0)}k`} />
                  <Tooltip formatter={(value: any) => formatPKR(Number(value))} contentStyle={{ borderRadius: 12 }} />
                  <Legend wrapperStyle={{ fontSize: 11 }} />
                  <Area type="monotone" dataKey="sales" name="Sales" stroke="#dc2626" fill="url(#mtSales)" strokeWidth={2.5} />
                  <Area type="monotone" dataKey="profit" name="Profit" stroke="#10b981" fill="url(#mtProfit)" strokeWidth={2} />
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
              <p className="text-sm text-slate-500">Rush time patterns</p>
            </div>
            <Clock className="h-5 w-5 text-red-500" />
          </div>
          {hourlyData.length > 0 ? (
            <div className="h-[280px]">
              <ResponsiveContainer width="100%" height="100%">
                <BarChart data={hourlyData}>
                  <CartesianGrid strokeDasharray="3 3" stroke="#e2e8f0" />
                  <XAxis dataKey="label" stroke="#64748b" fontSize={9} interval={1} />
                  <YAxis stroke="#64748b" fontSize={11} tickFormatter={(v) => `${(v / 1000).toFixed(0)}k`} />
                  <Tooltip formatter={(value: any) => formatPKR(Number(value))} contentStyle={{ borderRadius: 12 }} />
                  <Bar dataKey="sales" fill="#dc2626" radius={[6, 6, 0, 0]} />
                </BarChart>
              </ResponsiveContainer>
            </div>
          ) : (
            <div className="h-[280px] flex items-center justify-center text-sm text-slate-500">No sales today</div>
          )}
        </div>
      </section>

      <section className="rounded-3xl bg-white border border-slate-200 shadow-sm p-6">
        <div className="flex items-center justify-between mb-5 flex-wrap gap-2">
          <div>
            <h3 className="text-xl font-bold text-slate-900">Profit & Loss — Is Mahina</h3>
            <p className="text-sm text-slate-500">Meat business monthly</p>
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
          <PnLCard label="Meat Cost" value={formatPKR(stats?.cogsMonth ?? 0)} sub="COGS" color="rose" />
          <PnLCard label="Expenses" value={formatPKR(stats?.expensesMonth ?? 0)} sub="Rent, feed, labor" color="amber" />
          <PnLCard label="Net Profit" value={formatPKR(stats?.netProfitMonth ?? 0)} sub="Bottom line" color="orange" isHighlight />
        </div>
      </section>

      <section className="grid grid-cols-2 sm:grid-cols-3 xl:grid-cols-6 gap-3">
        <QuickStat title="Meat Products" value={stats?.totalProducts ?? 0} icon={Beef} tone="rose" link="/meat/products" />
        <QuickStat title="Animals" value={liveAnimalsSummary?.aliveCount ?? 0} icon={Heart} tone="emerald" link="/meat/live-animals" />
        <QuickStat title="Customers" value={stats?.totalCustomers ?? 0} icon={Users} tone="pink" link="/customers" />
        <QuickStat title="Suppliers" value={stats?.totalSuppliers ?? 0} icon={Building2} tone="violet" link="/suppliers" />
        <QuickStat title="Low Stock" value={stats?.lowStockCount ?? 0} icon={AlertTriangle} tone="amber" link="/low-stock" alert />
        <QuickStat title="Wholesale" value={0} icon={ShoppingCart} tone="orange" link="/meat/wholesale" />
      </section>

      <section className="grid lg:grid-cols-2 gap-6">
        <div className="rounded-3xl bg-white border border-slate-200 shadow-sm">
          <div className="px-6 py-5 border-b border-slate-100 flex items-center gap-2">
            <Award className="h-5 w-5 text-amber-500" />
            <div>
              <h3 className="text-lg font-bold text-slate-900">Best Selling Cuts</h3>
              <p className="text-sm text-slate-500">Top meat items</p>
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
                      <div className="h-10 w-10 rounded-xl bg-red-100 overflow-hidden flex items-center justify-center shrink-0">
                        {p.product?.images?.[0]?.url ? (
                          <img src={p.product.images[0].url} alt="" className="h-full w-full object-cover" />
                        ) : (
                          <Beef className="h-4 w-4 text-red-400" />
                        )}
                      </div>
                      <div className="min-w-0">
                        <div className="font-bold text-slate-900 truncate text-sm">{p.product?.name}</div>
                        <div className="text-xs text-slate-500">{p.quantitySold.toFixed(1)} {p.product?.unit} • {p.orderCount} orders</div>
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
              <p className="text-sm text-slate-500">This month split</p>
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
