import { useQuery } from '@tanstack/react-query';
import { Link } from 'react-router-dom';
import {
  Layers, Scissors, Ruler, Package, Boxes,
  TrendingUp, TrendingDown, Target, Sparkles,
  Award, ArrowRight, Plus, Clock, Users,
  DollarSign, Activity, AlertTriangle,
  ShoppingCart, Star, Wrench,
} from 'lucide-react';
import {
  ResponsiveContainer, AreaChart, Area, XAxis, YAxis, Tooltip, CartesianGrid,
  BarChart, Bar, PieChart, Pie, Cell, Legend,
} from 'recharts';
import { dashboardApi } from '@modules/dashboard/api/dashboard.api';
import { formatPKR } from '@core/lib/format';
import { Button } from '@core/ui/Button';
import { SubscriptionBanner } from '@modules/dashboard/components/SubscriptionBanner';
import { EmailVerifyBanner } from '@core/components/auth/EmailVerifyBanner';
import {
  DashboardHero, HeroKpiCard, QuickStat, PnLCard,
  formatPercent, formatDate, PAYMENT_COLORS,
} from '@modules/dashboard/components/shared/DashboardShared';

export default function CarpetDashboardV2() {
  const { data, refetch, isRefetching } = useQuery({
    queryKey: ['dashboard-overview'],
    queryFn: dashboardApi.overview,
    refetchInterval: 60_000,
  });

  const stats = data?.stats;
  const carpetStats = data?.carpetStats;
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

  return (
    <div className="space-y-6">
      <SubscriptionBanner />
      <EmailVerifyBanner />

      <DashboardHero
        gradient="from-slate-950 via-emerald-900 to-teal-800"
        emoji="🧶"
        industryLabel="Carpet"
        industryBadgeColor="bg-emerald-500/30 border border-emerald-300/40"
        tenantName={tenant?.name}
        netProfit={stats?.netProfitToday ?? 0}
        salesToday={stats?.salesToday ?? 0}
        cogsToday={stats?.cogsToday ?? 0}
        expensesToday={stats?.expensesToday ?? 0}
        growthVsYesterday={growthVsYesterday}
        onRefresh={() => refetch()}
        isRefetching={isRefetching}
        posLabel="Open Carpet POS"
        posLink="/pos"
      />

      {/* ═══ CARPET INVENTORY KPIs ═══ */}
      <section className="grid sm:grid-cols-2 lg:grid-cols-4 gap-4">
        <HeroKpiCard
          title="Active Rolls"
          value={carpetStats?.totalActiveRolls ?? 0}
          subtitle={`${(carpetStats?.totalLengthFt ?? 0).toFixed(0)} ft total`}
          icon={Layers}
          color="from-emerald-500 to-green-600"
          isHighlight
        />
        <HeroKpiCard
          title="Total Sqft"
          value={(carpetStats?.totalSqft ?? 0).toFixed(0)}
          subtitle="Available stock"
          icon={Ruler}
          color="from-teal-500 to-cyan-600"
        />
        <HeroKpiCard
          title="Cut Pieces"
          value={carpetStats?.cutPiecesCount ?? 0}
          subtitle={`${(carpetStats?.cutPiecesSqft ?? 0).toFixed(0)} sqft`}
          icon={Scissors}
          color="from-violet-500 to-purple-600"
        />
        <HeroKpiCard
          title="Aaj ka Profit"
          value={formatPKR(stats?.netProfitToday ?? 0)}
          subtitle={`${stats?.ordersToday ?? 0} sales • AOV ${formatPKR(stats?.aovToday ?? 0)}`}
          icon={Target}
          color="from-amber-500 to-orange-600"
          trend={growthVsYesterday}
        />
      </section>

      {/* ═══ CARPET STOCK PANEL ═══ */}
      {carpetStats && (
        <section className="rounded-3xl bg-gradient-to-br from-emerald-50 via-green-50 to-teal-50 border-2 border-emerald-200 p-5 shadow-sm">
          <div className="flex items-center justify-between mb-4 flex-wrap gap-2">
            <div className="flex items-center gap-2">
              <div className="h-10 w-10 rounded-2xl bg-emerald-600 text-white flex items-center justify-center shadow-lg shadow-emerald-500/30">
                <Layers className="h-5 w-5" />
              </div>
              <div>
                <h3 className="text-lg font-extrabold text-emerald-900">Carpet Inventory Snapshot</h3>
                <p className="text-xs text-emerald-700">Roll-based tracking</p>
              </div>
            </div>
            <div className="flex gap-2">
              <Link to="/carpet-rolls">
                <Button variant="secondary" size="sm">
                  <Layers className="h-3.5 w-3.5" /> All Rolls
                </Button>
              </Link>
              <Link to="/carpet-cut-pieces">
                <Button variant="secondary" size="sm">
                  <Scissors className="h-3.5 w-3.5" /> Cut Pieces
                </Button>
              </Link>
              <Link to="/carpet-reports">
                <Button size="sm" className="bg-emerald-600 hover:bg-emerald-700">
                  <Activity className="h-3.5 w-3.5" /> Reports
                </Button>
              </Link>
            </div>
          </div>

          <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
            <div className="rounded-2xl bg-white border-2 border-emerald-200 p-3">
              <div className="text-[10px] uppercase font-extrabold text-emerald-700">Active Rolls</div>
              <div className="text-2xl font-extrabold text-emerald-900 tabular-nums mt-1">{carpetStats.totalActiveRolls}</div>
              <div className="text-[10px] font-bold text-slate-500">{carpetStats.totalLengthFt.toFixed(0)} ft total length</div>
            </div>
            <div className="rounded-2xl bg-white border-2 border-teal-200 p-3">
              <div className="text-[10px] uppercase font-extrabold text-teal-700">Available Sqft</div>
              <div className="text-2xl font-extrabold text-teal-900 tabular-nums mt-1">{carpetStats.totalSqft.toFixed(0)}</div>
              <div className="text-[10px] font-bold text-slate-500">Bechne ke liye</div>
            </div>
            <div className="rounded-2xl bg-white border-2 border-violet-200 p-3">
              <div className="text-[10px] uppercase font-extrabold text-violet-700">Cut Pieces</div>
              <div className="text-2xl font-extrabold text-violet-900 tabular-nums mt-1">{carpetStats.cutPiecesCount}</div>
              <div className="text-[10px] font-bold text-slate-500">{carpetStats.cutPiecesSqft.toFixed(0)} sqft</div>
            </div>
            <div className="rounded-2xl bg-white border-2 border-amber-200 p-3">
              <div className="text-[10px] uppercase font-extrabold text-amber-700">Piece Value</div>
              <div className="text-lg font-extrabold text-amber-900 tabular-nums mt-1">{formatPKR(carpetStats.cutPiecesValue)}</div>
              <div className="text-[10px] font-bold text-slate-500">Listed price</div>
            </div>
          </div>

          {/* Low stock rolls */}
          {carpetStats.lowStockRolls && carpetStats.lowStockRolls.length > 0 && (
            <div className="mt-4 rounded-2xl bg-white border-2 border-amber-200 p-3">
              <div className="flex items-center gap-2 mb-2">
                <AlertTriangle className="h-4 w-4 text-amber-600" />
                <h4 className="font-bold text-amber-900 text-sm">
                  {carpetStats.lowStockRolls.length} rolls chhote reh gaye (&lt; 10 ft baqi)
                </h4>
              </div>
              <div className="flex flex-wrap gap-2">
                {carpetStats.lowStockRolls.map((r) => (
                  <Link
                    key={r.id}
                    to={`/carpet-rolls/${r.id}`}
                    className="inline-flex items-center gap-1.5 px-2 py-1 rounded-lg bg-amber-50 border border-amber-200 text-xs font-bold text-amber-800 hover:bg-amber-100"
                  >
                    <span className="font-mono">{r.rollNumber}</span>
                    <span className="text-amber-600">• {r.remainingLengthFt.toFixed(1)}ft</span>
                    <span className="text-slate-500">• {r.remainingSqft.toFixed(0)} sqft</span>
                  </Link>
                ))}
              </div>
            </div>
          )}

          {/* Recent rolls */}
          {carpetStats.recentRolls && carpetStats.recentRolls.length > 0 && (
            <div className="mt-4 rounded-2xl bg-white border border-emerald-200 p-3">
              <h4 className="font-extrabold text-emerald-900 text-sm mb-2">🆕 Recently Added Rolls</h4>
              <div className="flex flex-wrap gap-2">
                {carpetStats.recentRolls.slice(0, 8).map((r) => (
                  <Link
                    key={r.id}
                    to={`/carpet-rolls/${r.id}`}
                    className="inline-flex items-center gap-1.5 px-2 py-1 rounded-lg bg-emerald-50 border border-emerald-200 text-xs font-bold text-emerald-800 hover:bg-emerald-100"
                  >
                    {r.variantColorHex && (
                      <span className="h-2.5 w-2.5 rounded-full border border-white" style={{ backgroundColor: r.variantColorHex }} />
                    )}
                    <span className="font-mono">{r.rollNumber}</span>
                    <span>• {r.remainingSqft.toFixed(0)} sqft</span>
                    <span className="text-emerald-600">• {formatPKR(r.salePricePerSqft)}/sqft</span>
                  </Link>
                ))}
              </div>
            </div>
          )}
        </section>
      )}

      {/* ═══ TRENDS ═══ */}
      <section className="grid lg:grid-cols-[1.5fr_1fr] gap-6">
        <div className="rounded-3xl bg-white border border-slate-200 shadow-sm p-6">
          <div className="flex items-center justify-between mb-5">
            <div>
              <h3 className="text-xl font-bold text-slate-900">7-Day Carpet Sales</h3>
              <p className="text-sm text-slate-500">Revenue & profit</p>
            </div>
            <Link to="/carpet-reports" className="text-emerald-700 text-sm font-bold inline-flex items-center gap-1">
              Reports <ArrowRight className="h-4 w-4" />
            </Link>
          </div>
          {trendData.length >= 2 ? (
            <div className="h-[280px]">
              <ResponsiveContainer width="100%" height="100%">
                <AreaChart data={trendData}>
                  <defs>
                    <linearGradient id="cSales" x1="0" y1="0" x2="0" y2="1">
                      <stop offset="0%" stopColor="#10b981" stopOpacity={0.4} />
                      <stop offset="100%" stopColor="#10b981" stopOpacity={0} />
                    </linearGradient>
                    <linearGradient id="cProfit" x1="0" y1="0" x2="0" y2="1">
                      <stop offset="0%" stopColor="#8b5cf6" stopOpacity={0.3} />
                      <stop offset="100%" stopColor="#8b5cf6" stopOpacity={0} />
                    </linearGradient>
                  </defs>
                  <CartesianGrid strokeDasharray="3 3" stroke="#e2e8f0" />
                  <XAxis dataKey="label" stroke="#64748b" fontSize={12} />
                  <YAxis stroke="#64748b" fontSize={11} tickFormatter={(v) => `${(v / 1000).toFixed(0)}k`} />
                  <Tooltip formatter={(value: any) => formatPKR(Number(value))} contentStyle={{ borderRadius: 12 }} />
                  <Legend wrapperStyle={{ fontSize: 11 }} />
                  <Area type="monotone" dataKey="sales" name="Sales" stroke="#10b981" fill="url(#cSales)" strokeWidth={2.5} />
                  <Area type="monotone" dataKey="profit" name="Profit" stroke="#8b5cf6" fill="url(#cProfit)" strokeWidth={2} />
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
            <Clock className="h-5 w-5 text-emerald-500" />
          </div>
          {hourlyData.length > 0 ? (
            <div className="h-[280px]">
              <ResponsiveContainer width="100%" height="100%">
                <BarChart data={hourlyData}>
                  <CartesianGrid strokeDasharray="3 3" stroke="#e2e8f0" />
                  <XAxis dataKey="label" stroke="#64748b" fontSize={9} interval={1} />
                  <YAxis stroke="#64748b" fontSize={11} tickFormatter={(v) => `${(v / 1000).toFixed(0)}k`} />
                  <Tooltip formatter={(value: any) => formatPKR(Number(value))} contentStyle={{ borderRadius: 12 }} />
                  <Bar dataKey="sales" fill="#10b981" radius={[6, 6, 0, 0]} />
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
            <p className="text-sm text-slate-500">Carpet business monthly</p>
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
          <PnLCard label="Roll Cost" value={formatPKR(stats?.cogsMonth ?? 0)} sub="Purchase cost" color="rose" />
          <PnLCard label="Expenses" value={formatPKR(stats?.expensesMonth ?? 0)} sub="Rent, cutting, labor" color="amber" />
          <PnLCard label="Net Profit" value={formatPKR(stats?.netProfitMonth ?? 0)} sub="Bottom line" color="emerald" isHighlight />
        </div>
      </section>

      {/* ═══ QUICK STATS ═══ */}
      <section className="grid grid-cols-2 sm:grid-cols-3 xl:grid-cols-6 gap-3">
        <QuickStat title="Products" value={stats?.totalProducts ?? 0} icon={Package} tone="emerald" link="/products" />
        <QuickStat title="Rolls" value={carpetStats?.totalActiveRolls ?? 0} icon={Layers} tone="cyan" link="/carpet-rolls" />
        <QuickStat title="Cut Pieces" value={carpetStats?.cutPiecesCount ?? 0} icon={Scissors} tone="violet" link="/carpet-cut-pieces" />
        <QuickStat title="Customers" value={stats?.totalCustomers ?? 0} icon={Users} tone="pink" link="/customers" />
        <QuickStat title="Suppliers" value={stats?.totalSuppliers ?? 0} icon={Wrench} tone="orange" link="/suppliers" />
        <QuickStat title="Low Stock" value={stats?.lowStockCount ?? 0} icon={AlertTriangle} tone="amber" link="/low-stock" alert />
      </section>

      {/* ═══ TOP PRODUCTS + PAYMENTS ═══ */}
      <section className="grid lg:grid-cols-2 gap-6">
        <div className="rounded-3xl bg-white border border-slate-200 shadow-sm">
          <div className="px-6 py-5 border-b border-slate-100 flex items-center gap-2">
            <Award className="h-5 w-5 text-amber-500" />
            <div>
              <h3 className="text-lg font-bold text-slate-900">Top Selling Carpets</h3>
              <p className="text-sm text-slate-500">Best designs this month</p>
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
                          <Layers className="h-4 w-4 text-slate-400" />
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
