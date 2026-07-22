import { useQuery } from '@tanstack/react-query';
import { Link } from 'react-router-dom';
import {
  Smartphone, ShieldCheck, Wrench, CreditCard, RefreshCw,
  TrendingUp, TrendingDown, Wallet, Target, Sparkles,
  Package, Award, ArrowRight, Plus, Clock, Users,
  DollarSign, Activity, AlertTriangle, ChevronRight,
  ShoppingCart, Star, Zap, Phone,
} from 'lucide-react';
import {
  ResponsiveContainer, AreaChart, Area, XAxis, YAxis, Tooltip, CartesianGrid,
  BarChart, Bar, PieChart, Pie, Cell, Legend,
} from 'recharts';
import { dashboardApi } from '@modules/dashboard/api/dashboard.api';
import { imeiApi } from '../api/imei.api';
import { formatPKR } from '@core/lib/format';
import { Button } from '@core/ui/Button';
import { SubscriptionBanner } from '@modules/dashboard/components/SubscriptionBanner';
import { EmailVerifyBanner } from '@core/components/auth/EmailVerifyBanner';
import {
  DashboardHero, HeroKpiCard, QuickStat, PnLCard,
  formatPercent, formatDate, PAYMENT_COLORS,
} from '@modules/dashboard/components/shared/DashboardShared';

export default function MobileDashboardV2() {
  const { data, refetch, isRefetching } = useQuery({
    queryKey: ['dashboard-overview'],
    queryFn: dashboardApi.overview,
    refetchInterval: 60_000,
  });

  const { data: imeiStats } = useQuery({
    queryKey: ['imei-stats'],
    queryFn: () => imeiApi.stats(),
    refetchInterval: 60_000,
  });

  const stats = data?.stats;
  const mobileStats = data?.mobileStats;
  const tenant = data?.tenant;

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

  // PTA breakdown from imeiStats if available
  const ptaBreakdown = (imeiStats as any)?.byPtaStatus ?? [];

  return (
    <div className="space-y-6">
      <SubscriptionBanner />
      <EmailVerifyBanner />

      <DashboardHero
        gradient="from-slate-950 via-blue-900 to-indigo-800"
        emoji="📱"
        industryLabel="Mobile"
        industryBadgeColor="bg-blue-500/30 border border-blue-300/40"
        tenantName={tenant?.name}
        netProfit={stats?.netProfitToday ?? 0}
        salesToday={stats?.salesToday ?? 0}
        cogsToday={stats?.cogsToday ?? 0}
        expensesToday={stats?.expensesToday ?? 0}
        growthVsYesterday={growthVsYesterday}
        onRefresh={() => refetch()}
        isRefetching={isRefetching}
        posLabel="Open Mobile POS"
        posLink="/pos"
      />

      {/* ═══ MOBILE OPERATIONS ═══ */}
      <section className="grid sm:grid-cols-2 lg:grid-cols-4 gap-4">
        <HeroKpiCard
          title="IMEIs In Stock"
          value={mobileStats?.inStock ?? 0}
          subtitle={`${mobileStats?.total ?? 0} total registered`}
          icon={Smartphone}
          color="from-blue-500 to-indigo-600"
          isHighlight
        />
        <HeroKpiCard
          title="Sold Today"
          value={mobileStats?.soldToday ?? 0}
          subtitle={`${mobileStats?.sold ?? 0} total lifetime`}
          icon={TrendingUp}
          color="from-emerald-500 to-green-600"
          trend={growthVsYesterday}
        />
        <HeroKpiCard
          title="Open Repairs"
          value={mobileStats?.repairTicketsOpen ?? 0}
          subtitle="Tickets in queue"
          icon={Wrench}
          color="from-amber-500 to-orange-600"
        />
        <HeroKpiCard
          title="Active EMI Plans"
          value={mobileStats?.emiActivePlans ?? 0}
          subtitle="Installment customers"
          icon={CreditCard}
          color="from-violet-500 to-purple-600"
        />
      </section>

      {/* ═══ IMEI STATS PANEL ═══ */}
      <section className="rounded-3xl bg-gradient-to-br from-blue-50 via-indigo-50 to-cyan-50 border-2 border-blue-200 p-5 shadow-sm">
        <div className="flex items-center justify-between mb-4 flex-wrap gap-2">
          <div className="flex items-center gap-2">
            <div className="h-10 w-10 rounded-2xl bg-blue-600 text-white flex items-center justify-center shadow-lg shadow-blue-500/30">
              <ShieldCheck className="h-5 w-5" />
            </div>
            <div>
              <h3 className="text-lg font-extrabold text-blue-900">IMEI Inventory</h3>
              <p className="text-xs text-blue-700">Phone tracking snapshot</p>
            </div>
          </div>
          <div className="flex gap-2">
            <Link to="/imei-inventory">
              <Button variant="secondary" size="sm">
                <Smartphone className="h-3.5 w-3.5" /> All IMEIs
              </Button>
            </Link>
            <Link to="/imei-inventory/global">
              <Button size="sm" className="bg-blue-600 hover:bg-blue-700">
                <Activity className="h-3.5 w-3.5" /> Global View
              </Button>
            </Link>
          </div>
        </div>

        <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
          <div className="rounded-2xl bg-white border-2 border-blue-200 p-3">
            <div className="text-[10px] uppercase font-extrabold text-blue-700">In Stock</div>
            <div className="text-2xl font-extrabold text-blue-900 tabular-nums mt-1">{imeiStats?.inStock ?? 0}</div>
            <div className="text-[10px] font-bold text-slate-500">Available to sell</div>
          </div>
          <div className="rounded-2xl bg-white border-2 border-emerald-200 p-3">
            <div className="text-[10px] uppercase font-extrabold text-emerald-700">Sold</div>
            <div className="text-2xl font-extrabold text-emerald-900 tabular-nums mt-1">{imeiStats?.sold ?? 0}</div>
            <div className="text-[10px] font-bold text-slate-500">Lifetime sold</div>
          </div>
          <div className="rounded-2xl bg-white border-2 border-amber-200 p-3">
            <div className="text-[10px] uppercase font-extrabold text-amber-700">Stock Value</div>
            <div className="text-lg font-extrabold text-amber-900 tabular-nums mt-1">{formatPKR((imeiStats as any)?.stockValue ?? 0)}</div>
            <div className="text-[10px] font-bold text-slate-500">Current inventory</div>
          </div>
          <div className="rounded-2xl bg-white border-2 border-rose-200 p-3">
            <div className="text-[10px] uppercase font-extrabold text-rose-700">Returns/Damaged</div>
            <div className="text-2xl font-extrabold text-rose-900 tabular-nums mt-1">
              {((mobileStats?.returned ?? 0) + (mobileStats?.damaged ?? 0))}
            </div>
            <div className="text-[10px] font-bold text-slate-500">Non-sellable</div>
          </div>
        </div>

        {ptaBreakdown.length > 0 && (
          <div className="mt-4 rounded-xl bg-white border border-blue-200 p-3">
            <div className="text-xs font-extrabold text-blue-700 uppercase mb-2">PTA Status Breakdown</div>
            <div className="flex flex-wrap gap-2">
              {ptaBreakdown.map((p: any) => (
                <span key={p.ptaStatus} className="px-2 py-1 rounded-lg bg-blue-50 border border-blue-200 text-xs font-extrabold text-blue-800">
                  {p.ptaStatus}: {p._count?._all ?? 0}
                </span>
              ))}
            </div>
          </div>
        )}
      </section>

      {/* ═══ USED PHONES + REPAIRS ═══ */}
      <section className="grid sm:grid-cols-2 gap-4">
        <Link to="/used-phones" className="rounded-3xl bg-gradient-to-br from-violet-500 to-purple-600 text-white p-5 shadow-lg shadow-violet-500/30 hover:shadow-xl transition">
          <div className="flex items-center gap-3 mb-3">
            <div className="h-12 w-12 rounded-2xl bg-white/20 flex items-center justify-center">
              <RefreshCw className="h-6 w-6" />
            </div>
            <div>
              <div className="text-[10px] font-extrabold uppercase tracking-wider opacity-90">Used Phones</div>
              <h3 className="text-2xl font-bold mt-1">{mobileStats?.usedPhonesInStock ?? 0}</h3>
            </div>
          </div>
          <div className="pt-3 border-t border-white/20 text-xs opacity-90 flex items-center justify-between">
            <span>Trade-ins in stock</span>
            <ArrowRight className="h-4 w-4" />
          </div>
        </Link>

        <Link to="/repairs" className="rounded-3xl bg-gradient-to-br from-amber-500 to-orange-600 text-white p-5 shadow-lg shadow-amber-500/30 hover:shadow-xl transition">
          <div className="flex items-center gap-3 mb-3">
            <div className="h-12 w-12 rounded-2xl bg-white/20 flex items-center justify-center">
              <Wrench className="h-6 w-6" />
            </div>
            <div>
              <div className="text-[10px] font-extrabold uppercase tracking-wider opacity-90">Open Repairs</div>
              <h3 className="text-2xl font-bold mt-1">{mobileStats?.repairTicketsOpen ?? 0}</h3>
            </div>
          </div>
          <div className="pt-3 border-t border-white/20 text-xs opacity-90 flex items-center justify-between">
            <span>Active tickets</span>
            <ArrowRight className="h-4 w-4" />
          </div>
        </Link>
      </section>

      {/* ═══ TRENDS ═══ */}
      <section className="grid lg:grid-cols-[1.5fr_1fr] gap-6">
        <div className="rounded-3xl bg-white border border-slate-200 shadow-sm p-6">
          <div className="flex items-center justify-between mb-5">
            <div>
              <h3 className="text-xl font-bold text-slate-900">7-Day Mobile Sales</h3>
              <p className="text-sm text-slate-500">Revenue & profit trend</p>
            </div>
            <Link to="/mobile-reports" className="text-blue-700 text-sm font-bold inline-flex items-center gap-1">
              Reports <ArrowRight className="h-4 w-4" />
            </Link>
          </div>
          {trendData.length >= 2 ? (
            <div className="h-[280px]">
              <ResponsiveContainer width="100%" height="100%">
                <AreaChart data={trendData}>
                  <defs>
                    <linearGradient id="mSales" x1="0" y1="0" x2="0" y2="1">
                      <stop offset="0%" stopColor="#3b82f6" stopOpacity={0.4} />
                      <stop offset="100%" stopColor="#3b82f6" stopOpacity={0} />
                    </linearGradient>
                    <linearGradient id="mProfit" x1="0" y1="0" x2="0" y2="1">
                      <stop offset="0%" stopColor="#10b981" stopOpacity={0.3} />
                      <stop offset="100%" stopColor="#10b981" stopOpacity={0} />
                    </linearGradient>
                  </defs>
                  <CartesianGrid strokeDasharray="3 3" stroke="#e2e8f0" />
                  <XAxis dataKey="label" stroke="#64748b" fontSize={12} />
                  <YAxis stroke="#64748b" fontSize={11} tickFormatter={(v) => `${(v / 1000).toFixed(0)}k`} />
                  <Tooltip formatter={(value: any) => formatPKR(Number(value))} contentStyle={{ borderRadius: 12 }} />
                  <Legend wrapperStyle={{ fontSize: 11 }} />
                  <Area type="monotone" dataKey="sales" name="Sales" stroke="#3b82f6" fill="url(#mSales)" strokeWidth={2.5} />
                  <Area type="monotone" dataKey="profit" name="Profit" stroke="#10b981" fill="url(#mProfit)" strokeWidth={2} />
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
              <p className="text-sm text-slate-500">When customers buy</p>
            </div>
            <Clock className="h-5 w-5 text-blue-500" />
          </div>
          {hourlyData.length > 0 ? (
            <div className="h-[280px]">
              <ResponsiveContainer width="100%" height="100%">
                <BarChart data={hourlyData}>
                  <CartesianGrid strokeDasharray="3 3" stroke="#e2e8f0" />
                  <XAxis dataKey="label" stroke="#64748b" fontSize={9} interval={1} />
                  <YAxis stroke="#64748b" fontSize={11} tickFormatter={(v) => `${(v / 1000).toFixed(0)}k`} />
                  <Tooltip formatter={(value: any) => formatPKR(Number(value))} contentStyle={{ borderRadius: 12 }} />
                  <Bar dataKey="sales" fill="#3b82f6" radius={[6, 6, 0, 0]} />
                </BarChart>
              </ResponsiveContainer>
            </div>
          ) : (
            <div className="h-[280px] flex items-center justify-center text-sm text-slate-500">No sales today</div>
          )}
        </div>
      </section>

      {/* ═══ P&L ═══ */}
      <section className="rounded-3xl bg-white border border-slate-200 shadow-sm p-6">
        <div className="flex items-center justify-between mb-5 flex-wrap gap-2">
          <div>
            <h3 className="text-xl font-bold text-slate-900">Profit & Loss — Is Mahina</h3>
            <p className="text-sm text-slate-500">Mobile shop monthly performance</p>
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
          <PnLCard label="Purchase Cost" value={formatPKR(stats?.cogsMonth ?? 0)} sub="Phone/accessory cost" color="rose" />
          <PnLCard label="Expenses" value={formatPKR(stats?.expensesMonth ?? 0)} sub="Rent, staff, utilities" color="amber" />
          <PnLCard label="Net Profit" value={formatPKR(stats?.netProfitMonth ?? 0)} sub="Bottom line" color="blue" isHighlight />
        </div>
      </section>

      {/* ═══ QUICK STATS ═══ */}
      <section className="grid grid-cols-2 sm:grid-cols-3 xl:grid-cols-6 gap-3">
        <QuickStat title="Products" value={stats?.totalProducts ?? 0} icon={Package} tone="blue" link="/products" />
        <QuickStat title="Total IMEIs" value={mobileStats?.total ?? 0} icon={Smartphone} tone="cyan" link="/imei-inventory" />
        <QuickStat title="Used Phones" value={mobileStats?.usedPhonesInStock ?? 0} icon={RefreshCw} tone="violet" link="/used-phones" />
        <QuickStat title="Customers" value={stats?.totalCustomers ?? 0} icon={Users} tone="pink" link="/customers" />
        <QuickStat title="EMI Plans" value={mobileStats?.emiActivePlans ?? 0} icon={CreditCard} tone="orange" link="/emi-plans" />
        <QuickStat title="Repairs" value={mobileStats?.repairTicketsOpen ?? 0} icon={Wrench} tone="amber" link="/repairs" alert />
      </section>

      {/* ═══ TOP MODELS + PAYMENTS ═══ */}
      <section className="grid lg:grid-cols-2 gap-6">
        <div className="rounded-3xl bg-white border border-slate-200 shadow-sm">
          <div className="px-6 py-5 border-b border-slate-100 flex items-center gap-2">
            <Award className="h-5 w-5 text-amber-500" />
            <div>
              <h3 className="text-lg font-bold text-slate-900">Top Selling Phones</h3>
              <p className="text-sm text-slate-500">Best models this month</p>
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
                          <Smartphone className="h-4 w-4 text-slate-400" />
                        )}
                      </div>
                      <div className="min-w-0">
                        <div className="font-bold text-slate-900 truncate text-sm">{p.product?.name}</div>
                        <div className="text-xs text-slate-500">{p.quantitySold} units • {p.orderCount} orders</div>
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
              <h3 className="text-lg font-bold text-slate-900">Payment Breakdown</h3>
              <p className="text-sm text-slate-500">Cash vs EMI vs Card</p>
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

      {/* ═══ RECENT SALES ═══ */}
      <section className="rounded-3xl bg-white border border-slate-200 shadow-sm">
        <div className="px-6 py-5 border-b border-slate-100 flex items-center justify-between">
          <div>
            <h3 className="text-lg font-bold text-slate-900">Recent Mobile Sales</h3>
            <p className="text-sm text-slate-500">Latest phone sales with IMEIs</p>
          </div>
          <Link to="/sales" className="text-blue-700 text-sm font-bold inline-flex items-center gap-1">
            All <ArrowRight className="h-4 w-4" />
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
                  <div className="h-9 w-9 rounded-xl bg-blue-100 text-blue-700 flex items-center justify-center shrink-0">
                    <Smartphone className="h-4 w-4" />
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
                    <div className="text-[10px] text-amber-700 font-bold">EMI/Udhaar: {formatPKR(sale.creditAmount)}</div>
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
