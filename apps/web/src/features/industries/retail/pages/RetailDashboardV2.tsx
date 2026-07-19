import { useQuery } from '@tanstack/react-query';
import { Link } from 'react-router-dom';
import {
  ShoppingCart, Sparkles, Layers, AlertTriangle, Zap,
  TrendingUp, TrendingDown, Target, Award,
  Package, ArrowRight, Plus, Clock, Users,
  DollarSign, Activity, RefreshCw, Star,
  Boxes, Tag, ShoppingBag, Wrench,
} from 'lucide-react';
import {
  ResponsiveContainer, AreaChart, Area, XAxis, YAxis, Tooltip, CartesianGrid,
  BarChart, Bar, PieChart, Pie, Cell, Legend,
} from 'recharts';
import { dashboardApi } from '@/api/dashboard.api';
import { retailDashboardApi } from '../api/dashboard.api';
import { formatPKR } from '@/lib/format';
import { Button } from '@/components/ui/Button';
import { SubscriptionBanner } from '@/features/dashboard/components/SubscriptionBanner';
import { EmailVerifyBanner } from '@/components/auth/EmailVerifyBanner';
import {
  DashboardHero, HeroKpiCard, QuickStat, PnLCard,
  formatPercent, formatDate, PAYMENT_COLORS,
} from '@/features/dashboard/components/shared/DashboardShared';

export default function RetailDashboardV2() {
  const { data, refetch, isRefetching } = useQuery({
    queryKey: ['dashboard-overview'],
    queryFn: dashboardApi.overview,
    refetchInterval: 60_000,
  });

  const { data: retailOverview } = useQuery({
    queryKey: ['retail-dashboard-overview'],
    queryFn: () => retailDashboardApi.overview(),
    refetchInterval: 60_000,
  });

  const { data: hourly = [] } = useQuery({
    queryKey: ['retail-hourly'],
    queryFn: () => retailDashboardApi.salesByHour(),
    refetchInterval: 60_000,
  });

  const { data: slowMovers = [] } = useQuery({
    queryKey: ['retail-slow-movers'],
    queryFn: () => retailDashboardApi.slowMovers(30),
    refetchInterval: 5 * 60_000,
  });

  const stats = data?.stats;
  const tenant = data?.tenant;

  const trendData = (data?.salesTrend7Days ?? []).map((p) => {
    const d = new Date(p.date);
    const dayName = ['Sun', 'Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat'][d.getDay()];
    return { ...p, label: dayName };
  });

  const hourlyData = (hourly as any[])
    .filter((h: any) => h.total > 0 || (h.hour >= 8 && h.hour <= 22))
    .map((h: any) => ({
      ...h,
      label: h.hour === 0 ? '12 AM' : h.hour < 12 ? `${h.hour} AM` : h.hour === 12 ? '12 PM' : `${h.hour - 12} PM`,
    }));

  const growthVsYesterday = stats?.salesGrowthVsYesterday ?? 0;
  const growthVsLastMonth = stats?.salesGrowthVsLastMonth ?? 0;

  const retailAlerts = (retailOverview as any)?.alerts ?? {};

  return (
    <div className="space-y-6">
      <SubscriptionBanner />
      <EmailVerifyBanner />

      <DashboardHero
        gradient="from-slate-950 via-sky-900 to-cyan-700"
        emoji="🛒"
        industryLabel="Retail"
        industryBadgeColor="bg-sky-500/30 border border-sky-300/40"
        tenantName={tenant?.name}
        netProfit={stats?.netProfitToday ?? 0}
        salesToday={stats?.salesToday ?? 0}
        cogsToday={stats?.cogsToday ?? 0}
        expensesToday={stats?.expensesToday ?? 0}
        growthVsYesterday={growthVsYesterday}
        onRefresh={() => refetch()}
        isRefetching={isRefetching}
        posLabel="Open Retail POS"
        posLink="/pos"
      />

      {/* ═══ RETAIL KPIs ═══ */}
      <section className="grid sm:grid-cols-2 lg:grid-cols-4 gap-4">
        <HeroKpiCard
          title="Aaj ki Sales"
          value={formatPKR(stats?.salesToday ?? 0)}
          subtitle={`${stats?.ordersToday ?? 0} orders • AOV ${formatPKR(stats?.aovToday ?? 0)}`}
          icon={TrendingUp}
          color="from-sky-500 to-cyan-600"
          isHighlight
          trend={growthVsYesterday}
        />
        <HeroKpiCard
          title="Aaj ka Profit"
          value={formatPKR(stats?.netProfitToday ?? 0)}
          subtitle="Sales − Cost − Expenses"
          icon={Target}
          color="from-emerald-500 to-green-600"
        />
        <HeroKpiCard
          title="Low Stock Items"
          value={stats?.lowStockCount ?? 0}
          subtitle={`${stats?.outOfStockCount ?? 0} out of stock`}
          icon={AlertTriangle}
          color="from-amber-500 to-orange-600"
        />
        <HeroKpiCard
          title="Slow Movers (30d)"
          value={slowMovers.length}
          subtitle="Not sold in 30 days"
          icon={Clock}
          color="from-rose-500 to-red-600"
        />
      </section>

      {/* ═══ RETAIL OPERATIONS ═══ */}
      <section className="rounded-3xl bg-gradient-to-br from-sky-50 via-cyan-50 to-blue-50 border-2 border-sky-200 p-5 shadow-sm">
        <div className="flex items-center justify-between mb-4 flex-wrap gap-2">
          <div className="flex items-center gap-2">
            <div className="h-10 w-10 rounded-2xl bg-sky-600 text-white flex items-center justify-center shadow-lg shadow-sky-500/30">
              <ShoppingCart className="h-5 w-5" />
            </div>
            <div>
              <h3 className="text-lg font-extrabold text-sky-900">Retail Operations</h3>
              <p className="text-xs text-sky-700">Combos, quick keys, damage, reorders</p>
            </div>
          </div>
          <div className="flex gap-2">
            <Link to="/retail/combos">
              <Button variant="secondary" size="sm">
                <Sparkles className="h-3.5 w-3.5" /> Combos
              </Button>
            </Link>
            <Link to="/retail/reorders">
              <Button size="sm" className="bg-sky-600 hover:bg-sky-700">
                <RefreshCw className="h-3.5 w-3.5" /> Smart Reorder
              </Button>
            </Link>
          </div>
        </div>

        <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
          <Link to="/retail/combos" className="rounded-2xl bg-white border-2 border-violet-200 hover:border-violet-400 p-3 transition">
            <div className="h-8 w-8 rounded-lg bg-violet-100 text-violet-700 flex items-center justify-center mb-1">
              <Sparkles className="h-4 w-4" />
            </div>
            <div className="text-[10px] uppercase font-extrabold text-violet-700">Combo Deals</div>
            <div className="text-lg font-extrabold text-slate-900 mt-0.5">Manage</div>
          </Link>
          <Link to="/retail/product-units" className="rounded-2xl bg-white border-2 border-emerald-200 hover:border-emerald-400 p-3 transition">
            <div className="h-8 w-8 rounded-lg bg-emerald-100 text-emerald-700 flex items-center justify-center mb-1">
              <Layers className="h-4 w-4" />
            </div>
            <div className="text-[10px] uppercase font-extrabold text-emerald-700">Multi-Units</div>
            <div className="text-lg font-extrabold text-slate-900 mt-0.5">Piece/Dozen</div>
          </Link>
          <Link to="/retail/damage" className="rounded-2xl bg-white border-2 border-rose-200 hover:border-rose-400 p-3 transition">
            <div className="h-8 w-8 rounded-lg bg-rose-100 text-rose-700 flex items-center justify-center mb-1">
              <AlertTriangle className="h-4 w-4" />
            </div>
            <div className="text-[10px] uppercase font-extrabold text-rose-700">Damage Log</div>
            <div className="text-lg font-extrabold text-slate-900 mt-0.5">{retailAlerts.damagesToday ?? 0} today</div>
          </Link>
          <Link to="/retail/quick-keys" className="rounded-2xl bg-white border-2 border-amber-200 hover:border-amber-400 p-3 transition">
            <div className="h-8 w-8 rounded-lg bg-amber-100 text-amber-700 flex items-center justify-center mb-1">
              <Zap className="h-4 w-4" />
            </div>
            <div className="text-[10px] uppercase font-extrabold text-amber-700">Quick Keys</div>
            <div className="text-lg font-extrabold text-slate-900 mt-0.5">POS shortcuts</div>
          </Link>
        </div>

        {retailAlerts.pendingReorders > 0 && (
          <div className="mt-4 rounded-2xl bg-white border-2 border-blue-200 p-3 flex items-center gap-3">
            <RefreshCw className="h-5 w-5 text-blue-600" />
            <div className="flex-1">
              <div className="font-bold text-blue-900 text-sm">{retailAlerts.pendingReorders} pending reorder suggestions</div>
              <div className="text-xs text-blue-700">AI ne detect kiya — kaunsi cheez khatam hone wali hai</div>
            </div>
            <Link to="/retail/reorders">
              <Button size="sm" className="bg-blue-600 hover:bg-blue-700">
                Review <ArrowRight className="h-3.5 w-3.5" />
              </Button>
            </Link>
          </div>
        )}
      </section>

      {/* ═══ TRENDS ═══ */}
      <section className="grid lg:grid-cols-[1.5fr_1fr] gap-6">
        <div className="rounded-3xl bg-white border border-slate-200 shadow-sm p-6">
          <div className="flex items-center justify-between mb-5">
            <div>
              <h3 className="text-xl font-bold text-slate-900">7-Day Retail Sales</h3>
              <p className="text-sm text-slate-500">Sales + profit trend</p>
            </div>
            <Link to="/reports" className="text-sky-700 text-sm font-bold inline-flex items-center gap-1">
              Reports <ArrowRight className="h-4 w-4" />
            </Link>
          </div>
          {trendData.length >= 2 ? (
            <div className="h-[280px]">
              <ResponsiveContainer width="100%" height="100%">
                <AreaChart data={trendData}>
                  <defs>
                    <linearGradient id="rtSales" x1="0" y1="0" x2="0" y2="1">
                      <stop offset="0%" stopColor="#0ea5e9" stopOpacity={0.4} />
                      <stop offset="100%" stopColor="#0ea5e9" stopOpacity={0} />
                    </linearGradient>
                    <linearGradient id="rtProfit" x1="0" y1="0" x2="0" y2="1">
                      <stop offset="0%" stopColor="#10b981" stopOpacity={0.3} />
                      <stop offset="100%" stopColor="#10b981" stopOpacity={0} />
                    </linearGradient>
                  </defs>
                  <CartesianGrid strokeDasharray="3 3" stroke="#e2e8f0" />
                  <XAxis dataKey="label" stroke="#64748b" fontSize={12} />
                  <YAxis stroke="#64748b" fontSize={11} tickFormatter={(v) => `${(v / 1000).toFixed(0)}k`} />
                  <Tooltip formatter={(value: any) => formatPKR(Number(value))} contentStyle={{ borderRadius: 12 }} />
                  <Legend wrapperStyle={{ fontSize: 11 }} />
                  <Area type="monotone" dataKey="sales" name="Sales" stroke="#0ea5e9" fill="url(#rtSales)" strokeWidth={2.5} />
                  <Area type="monotone" dataKey="profit" name="Profit" stroke="#10b981" fill="url(#rtProfit)" strokeWidth={2} />
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
              <h3 className="text-lg font-bold text-slate-900">Hourly Sales Today</h3>
              <p className="text-sm text-slate-500">Peak hours</p>
            </div>
            <Clock className="h-5 w-5 text-sky-500" />
          </div>
          {hourlyData.length > 0 ? (
            <div className="h-[280px]">
              <ResponsiveContainer width="100%" height="100%">
                <BarChart data={hourlyData}>
                  <CartesianGrid strokeDasharray="3 3" stroke="#e2e8f0" />
                  <XAxis dataKey="label" stroke="#64748b" fontSize={9} interval={1} />
                  <YAxis stroke="#64748b" fontSize={11} tickFormatter={(v) => `${(v / 1000).toFixed(0)}k`} />
                  <Tooltip formatter={(value: any) => formatPKR(Number(value))} contentStyle={{ borderRadius: 12 }} />
                  <Bar dataKey="total" fill="#0ea5e9" radius={[6, 6, 0, 0]} />
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
            <p className="text-sm text-slate-500">Retail shop monthly performance</p>
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
          <PnLCard label="Revenue" value={formatPKR(stats?.salesMonth ?? 0)} sub={`${stats?.ordersMonth ?? 0} orders`} color="emerald" />
          <PnLCard label="COGS" value={formatPKR(stats?.cogsMonth ?? 0)} sub="Purchase cost" color="rose" />
          <PnLCard label="Expenses" value={formatPKR(stats?.expensesMonth ?? 0)} sub="Rent, staff, utilities" color="amber" />
          <PnLCard label="Net Profit" value={formatPKR(stats?.netProfitMonth ?? 0)} sub="Bottom line" color="blue" isHighlight />
        </div>
      </section>

      {/* ═══ QUICK STATS ═══ */}
      <section className="grid grid-cols-2 sm:grid-cols-3 xl:grid-cols-6 gap-3">
        <QuickStat title="Products" value={stats?.totalProducts ?? 0} icon={Package} tone="cyan" link="/products" />
        <QuickStat title="Customers" value={stats?.totalCustomers ?? 0} icon={Users} tone="pink" link="/customers" />
        <QuickStat title="Suppliers" value={stats?.totalSuppliers ?? 0} icon={ShoppingBag} tone="violet" link="/suppliers" />
        <QuickStat title="Low Stock" value={stats?.lowStockCount ?? 0} icon={AlertTriangle} tone="amber" link="/low-stock" alert />
        <QuickStat title="Categories" value={stats?.totalCategories ?? 0} icon={Tag} tone="emerald" link="/categories" />
        <QuickStat title="Combos" value={0} icon={Sparkles} tone="orange" link="/retail/combos" />
      </section>

      {/* ═══ TOP + SLOW MOVERS ═══ */}
      <section className="grid lg:grid-cols-2 gap-6">
        <div className="rounded-3xl bg-white border border-slate-200 shadow-sm">
          <div className="px-6 py-5 border-b border-slate-100 flex items-center gap-2">
            <Award className="h-5 w-5 text-amber-500" />
            <div>
              <h3 className="text-lg font-bold text-slate-900">🏆 Best Sellers</h3>
              <p className="text-sm text-slate-500">This month top products</p>
            </div>
          </div>
          <div className="divide-y divide-slate-100 max-h-[400px] overflow-y-auto">
            {data?.topProducts?.length ? (
              data.topProducts.slice(0, 8).map((p, idx) => {
                const rankColors = ['bg-amber-500', 'bg-slate-400', 'bg-orange-600', 'bg-violet-500', 'bg-blue-500', 'bg-slate-500', 'bg-slate-500', 'bg-slate-500'];
                return (
                  <div key={p.productId} className="px-6 py-2.5 flex items-center justify-between gap-3 hover:bg-slate-50">
                    <div className="flex items-center gap-3 min-w-0">
                      <div className={`h-7 w-7 rounded-lg ${rankColors[idx]} text-white font-extrabold flex items-center justify-center text-xs shrink-0`}>
                        {idx + 1}
                      </div>
                      <div className="h-9 w-9 rounded-lg bg-slate-100 overflow-hidden flex items-center justify-center shrink-0">
                        {p.product?.images?.[0]?.url ? (
                          <img src={p.product.images[0].url} alt="" className="h-full w-full object-cover" />
                        ) : (
                          <Package className="h-4 w-4 text-slate-400" />
                        )}
                      </div>
                      <div className="min-w-0">
                        <div className="font-bold text-slate-900 truncate text-sm">{p.product?.name}</div>
                        <div className="text-[10px] text-slate-500">{p.quantitySold.toFixed(0)} {p.product?.unit}</div>
                      </div>
                    </div>
                    <div className="font-extrabold text-emerald-700 text-sm tabular-nums">{formatPKR(p.revenue)}</div>
                  </div>
                );
              })
            ) : (
              <div className="px-6 py-12 text-center text-sm text-slate-500">No sales yet</div>
            )}
          </div>
        </div>

        <div className="rounded-3xl bg-white border border-slate-200 shadow-sm">
          <div className="px-6 py-5 border-b border-slate-100 flex items-center gap-2">
            <Clock className="h-5 w-5 text-rose-500" />
            <div>
              <h3 className="text-lg font-bold text-slate-900">🐢 Slow Movers</h3>
              <p className="text-sm text-slate-500">Not sold in 30 days — discount karo</p>
            </div>
          </div>
          <div className="divide-y divide-slate-100 max-h-[400px] overflow-y-auto">
            {slowMovers.length === 0 ? (
              <div className="px-6 py-12 text-center">
                <Star className="h-10 w-10 text-emerald-400 mx-auto mb-2" />
                <p className="font-extrabold text-slate-700 text-sm">🎉 All products moving well!</p>
              </div>
            ) : (
              slowMovers.slice(0, 8).map((p: any) => (
                <Link
                  key={p.id}
                  to={`/products/${p.id}/edit`}
                  className="px-6 py-2.5 flex items-center gap-3 hover:bg-slate-50 transition"
                >
                  <div className="h-9 w-9 rounded-lg bg-slate-100 overflow-hidden flex items-center justify-center shrink-0">
                    {p.images?.[0]?.url ? (
                      <img src={p.images[0].url} alt="" className="h-full w-full object-cover" />
                    ) : (
                      <Package className="h-4 w-4 text-slate-400" />
                    )}
                  </div>
                  <div className="flex-1 min-w-0">
                    <div className="font-bold text-slate-900 truncate text-sm">{p.name}</div>
                    <div className="text-[10px] text-slate-500">{p.stock} {p.unit} • {p.category?.name || '—'}</div>
                  </div>
                  <ArrowRight className="h-4 w-4 text-slate-400 shrink-0" />
                </Link>
              ))
            )}
          </div>
        </div>
      </section>
    </div>
  );
}
