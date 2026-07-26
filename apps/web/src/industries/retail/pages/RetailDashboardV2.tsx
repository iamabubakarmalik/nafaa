import { useMemo } from 'react';
import { useQuery } from '@tanstack/react-query';
import { Link } from 'react-router-dom';
import {
  ShoppingCart, Sparkles, Layers, AlertTriangle, Zap,
  TrendingUp, TrendingDown, Target, Award,
  Package, ArrowRight, Plus, Clock, Users,
  DollarSign, Activity, RefreshCw, Star,
  Boxes, Tag, ShoppingBag, BookOpen, Barcode,
  Percent, PackageX, FileText, BarChart3, Upload,
} from 'lucide-react';
import {
  ResponsiveContainer, AreaChart, Area, XAxis, YAxis, Tooltip, CartesianGrid,
  BarChart, Bar, PieChart, Pie, Cell, Legend,
} from 'recharts';
import { dashboardApi } from '@modules/dashboard/api/dashboard.api';
import { retailDashboardApi } from '../api/dashboard.api';
import { formatPKR } from '@core/lib/format';
import { Button } from '@core/ui/Button';
import { SubscriptionBanner } from '@modules/dashboard/components/SubscriptionBanner';
import { EmailVerifyBanner } from '@core/components/auth/EmailVerifyBanner';
import { useCostHidden, PrivacyToggle } from '@core/ui/HiddenValue';

/**
 * RETAIL DASHBOARD V2 — Full Best
 *
 * - Full responsive: mobile / tablet / desktop
 * - PIN-aware profit/cost hiding
 * - Rich KPIs, trend charts, hourly chart, payment split
 * - Quick actions grid, alerts panel, top/slow movers
 * - Retail operations panel with all key modules
 */

export default function RetailDashboardV2() {
  const hideCost = useCostHidden();

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

  const trendData = useMemo(() => (data?.salesTrend7Days ?? []).map((p) => {
    const d = new Date(p.date);
    const dayName = ['Sun', 'Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat'][d.getDay()];
    return { ...p, label: dayName };
  }), [data]);

  const hourlyData = useMemo(() => (hourly as any[])
    .filter((h: any) => h.total > 0 || (h.hour >= 8 && h.hour <= 22))
    .map((h: any) => ({
      ...h,
      label: h.hour === 0 ? '12A' : h.hour < 12 ? `${h.hour}A` : h.hour === 12 ? '12P' : `${h.hour - 12}P`,
    })), [hourly]);

  const growthVsYesterday = stats?.salesGrowthVsYesterday ?? 0;
  const growthVsLastMonth = stats?.salesGrowthVsLastMonth ?? 0;

  const retailAlerts = (retailOverview as any)?.alerts ?? {};

  const paymentColors = ['#10b981', '#3b82f6', '#f97316', '#22c55e', '#8b5cf6'];
  const paymentData = data?.paymentBreakdown?.map((p: any, i: number) => ({
    name: p.paymentMethod,
    value: p._sum?.total ?? 0,
    color: paymentColors[i % paymentColors.length],
  })) ?? [];

  return (
    <div className="space-y-4 sm:space-y-6">
      <SubscriptionBanner />
      <EmailVerifyBanner />

      {/* ═══ HERO ═══ */}
      <section className="relative overflow-hidden rounded-2xl sm:rounded-3xl bg-gradient-to-br from-slate-950 via-sky-900 to-cyan-700 text-white p-4 sm:p-6 shadow-2xl">
        <div className="absolute -top-20 -right-20 h-64 w-64 rounded-full bg-sky-400/20 blur-3xl" />
        <div className="absolute -bottom-20 -left-20 h-64 w-64 rounded-full bg-amber-400/15 blur-3xl" />

        <div className="relative flex flex-col sm:flex-row items-start justify-between gap-4">
          <div className="min-w-0">
            <div className="inline-flex items-center gap-2 rounded-full bg-white/15 backdrop-blur px-3 py-1 text-xs font-extrabold border border-white/20">
              <ShoppingCart className="h-3.5 w-3.5 text-amber-300" /> Retail Dashboard
            </div>
            <h1 className="mt-3 text-2xl sm:text-3xl lg:text-4xl font-extrabold leading-tight">
              🛒 {tenant?.name || 'My Shop'}
            </h1>
            <p className="mt-2 text-xs sm:text-sm text-white/80">
              {stats?.ordersToday ?? 0} orders • {stats?.totalProducts ?? 0} products •{' '}
              <strong className="text-emerald-300">{formatPKR(stats?.salesToday ?? 0)}</strong> today
            </p>
          </div>

          <div className="flex items-center gap-2 flex-wrap">
            <PrivacyToggle compact />
            <button
              onClick={() => refetch()}
              disabled={isRefetching}
              className="inline-flex items-center gap-2 rounded-xl bg-white/10 hover:bg-white/20 px-3 py-2.5 text-sm font-bold backdrop-blur disabled:opacity-50 border border-white/20"
            >
              <RefreshCw className={`h-4 w-4 ${isRefetching ? 'animate-spin' : ''}`} />
              <span className="hidden sm:inline">Refresh</span>
            </button>
            <Link to="/pos">
              <Button className="bg-white text-slate-900 hover:bg-slate-100">
                <ShoppingCart className="h-4 w-4" />
                <span className="hidden sm:inline">Open POS</span>
                <span className="sm:hidden">POS</span>
              </Button>
            </Link>
          </div>
        </div>

        {/* Hero KPIs inline */}
        <div className="relative mt-5 grid grid-cols-2 sm:grid-cols-4 gap-2 sm:gap-3">
          <HeroTile
            icon={TrendingUp}
            label="Aaj ki Sales"
            value={formatPKR(stats?.salesToday ?? 0)}
            trend={growthVsYesterday}
            tone="emerald"
          />
          <HeroTile
            icon={Target}
            label="Aaj ka Profit"
            value={hideCost ? '••••' : formatPKR(stats?.netProfitToday ?? 0)}
            sub={hideCost ? 'PIN se dekho' : 'Net after cost'}
            tone="blue"
          />
          <HeroTile
            icon={AlertTriangle}
            label="Kam Stock"
            value={stats?.lowStockCount ?? 0}
            sub={`${stats?.outOfStockCount ?? 0} khatam`}
            tone="amber"
          />
          <HeroTile
            icon={Users}
            label="Customers"
            value={stats?.totalCustomers ?? 0}
            sub="Total"
            tone="violet"
          />
        </div>
      </section>

      {/* ═══ QUICK ACTIONS ═══ */}
      <section className="grid grid-cols-3 sm:grid-cols-4 lg:grid-cols-6 gap-2 sm:gap-3">
        <QuickAction to="/pos" icon={ShoppingCart} label="POS" tone="sky" />
        <QuickAction to="/retail-products/new" icon={Plus} label="Add Product" tone="emerald" />
        <QuickAction to="/retail/bulk-import" icon={Upload} label="Bulk Import" tone="blue" />
        <QuickAction to="/retail/combos" icon={Sparkles} label="Combos" tone="violet" />
        <QuickAction to="/retail/reorder" icon={RefreshCw} label="Reorder" tone="pink" />
        <QuickAction to="/customers" icon={BookOpen} label="Khata" tone="amber" />
      </section>

      {/* ═══ ALERTS ═══ */}
      {(retailAlerts.pendingReorders > 0 || (stats?.lowStockCount ?? 0) > 0 || (stats?.outOfStockCount ?? 0) > 0) && (
        <section className="rounded-2xl sm:rounded-3xl bg-gradient-to-br from-amber-50 via-orange-50 to-red-50 border-2 border-amber-300 p-4 sm:p-5">
          <div className="flex items-center gap-2 mb-3">
            <div className="h-9 w-9 rounded-xl bg-amber-500 text-white flex items-center justify-center shadow-md">
              <AlertTriangle className="h-5 w-5" />
            </div>
            <div>
              <h3 className="font-extrabold text-amber-900">Zaroori Alerts</h3>
              <p className="text-xs text-amber-800 font-bold">Foran attention chahiye</p>
            </div>
          </div>
          <div className="grid sm:grid-cols-2 lg:grid-cols-3 gap-2 sm:gap-3">
            {(stats?.outOfStockCount ?? 0) > 0 && (
              <AlertCard
                to="/products?filter=out"
                icon={PackageX}
                title={`${stats?.outOfStockCount} Products Khatam`}
                desc="Foran restock karein"
                tone="rose"
              />
            )}
            {(stats?.lowStockCount ?? 0) > 0 && (
              <AlertCard
                to="/products?filter=low"
                icon={AlertTriangle}
                title={`${stats?.lowStockCount} Kam Stock`}
                desc="Reorder ka waqt"
                tone="amber"
              />
            )}
            {retailAlerts.pendingReorders > 0 && (
              <AlertCard
                to="/retail/reorder"
                icon={RefreshCw}
                title={`${retailAlerts.pendingReorders} Reorder Suggestions`}
                desc="AI ne detect kiya"
                tone="blue"
              />
            )}
          </div>
        </section>
      )}

      {/* ═══ TRENDS ═══ */}
      <section className="grid lg:grid-cols-[1.5fr_1fr] gap-4 sm:gap-6">
        <div className="rounded-2xl sm:rounded-3xl bg-white border-2 border-slate-200 shadow-sm p-4 sm:p-6">
          <div className="flex items-center justify-between mb-4">
            <div>
              <h3 className="text-base sm:text-lg font-extrabold text-slate-900">7-Din Ki Sales</h3>
              <p className="text-xs text-slate-500 font-bold">Sales + profit trend</p>
            </div>
            <div className="h-9 w-9 rounded-xl bg-gradient-to-br from-sky-500 to-cyan-700 text-white flex items-center justify-center shadow-md">
              <BarChart3 className="h-5 w-5" />
            </div>
          </div>
          {trendData.length >= 2 ? (
            <div className="h-[220px] sm:h-[280px]">
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
                  <XAxis dataKey="label" stroke="#64748b" fontSize={11} />
                  <YAxis stroke="#64748b" fontSize={10} tickFormatter={(v) => `${(v / 1000).toFixed(0)}k`} />
                  <Tooltip formatter={(value: any) => formatPKR(Number(value))} contentStyle={{ borderRadius: 12, border: '2px solid #e2e8f0' }} />
                  <Legend wrapperStyle={{ fontSize: 11 }} />
                  <Area type="monotone" dataKey="sales" name="Sales" stroke="#0ea5e9" fill="url(#rtSales)" strokeWidth={2.5} />
                  {!hideCost && <Area type="monotone" dataKey="profit" name="Profit" stroke="#10b981" fill="url(#rtProfit)" strokeWidth={2} />}
                </AreaChart>
              </ResponsiveContainer>
            </div>
          ) : (
            <div className="h-[220px] sm:h-[280px] flex flex-col items-center justify-center gap-2">
              <BarChart3 className="h-10 w-10 text-slate-300" />
              <p className="text-sm font-extrabold text-slate-500">Need more sales data</p>
            </div>
          )}
        </div>

        <div className="rounded-2xl sm:rounded-3xl bg-white border-2 border-slate-200 shadow-sm p-4 sm:p-6">
          <div className="flex items-center justify-between mb-4">
            <div>
              <h3 className="text-base sm:text-lg font-extrabold text-slate-900">Aaj Ke Peak Hours</h3>
              <p className="text-xs text-slate-500 font-bold">Kis waqt zyada bikta hai</p>
            </div>
            <div className="h-9 w-9 rounded-xl bg-gradient-to-br from-violet-500 to-purple-700 text-white flex items-center justify-center shadow-md">
              <Clock className="h-5 w-5" />
            </div>
          </div>
          {hourlyData.length > 0 ? (
            <div className="h-[220px] sm:h-[280px]">
              <ResponsiveContainer width="100%" height="100%">
                <BarChart data={hourlyData}>
                  <CartesianGrid strokeDasharray="3 3" stroke="#e2e8f0" />
                  <XAxis dataKey="label" stroke="#64748b" fontSize={9} interval={1} />
                  <YAxis stroke="#64748b" fontSize={10} tickFormatter={(v) => `${(v / 1000).toFixed(0)}k`} />
                  <Tooltip formatter={(value: any) => formatPKR(Number(value))} contentStyle={{ borderRadius: 12 }} />
                  <Bar dataKey="total" fill="#0ea5e9" radius={[6, 6, 0, 0]} />
                </BarChart>
              </ResponsiveContainer>
            </div>
          ) : (
            <div className="h-[220px] sm:h-[280px] flex flex-col items-center justify-center gap-2">
              <Clock className="h-10 w-10 text-slate-300" />
              <p className="text-sm font-extrabold text-slate-500">Aaj tak koi sale nahi</p>
            </div>
          )}
        </div>
      </section>

      {/* ═══ P&L + PAYMENT SPLIT ═══ */}
      {!hideCost && (
        <section className="grid lg:grid-cols-[1.5fr_1fr] gap-4 sm:gap-6">
          <div className="rounded-2xl sm:rounded-3xl bg-white border-2 border-slate-200 shadow-sm p-4 sm:p-6">
            <div className="flex items-center justify-between mb-4 flex-wrap gap-2">
              <div>
                <h3 className="text-base sm:text-lg font-extrabold text-slate-900">Profit & Loss (Mahina)</h3>
                <p className="text-xs text-slate-500 font-bold">Monthly performance</p>
              </div>
              {growthVsLastMonth !== 0 && (
                <div className={`inline-flex items-center gap-1.5 px-3 py-1.5 rounded-xl text-sm font-extrabold ${
                  growthVsLastMonth >= 0 ? 'bg-emerald-100 text-emerald-700' : 'bg-rose-100 text-rose-700'
                }`}>
                  {growthVsLastMonth >= 0 ? <TrendingUp className="h-3.5 w-3.5" /> : <TrendingDown className="h-3.5 w-3.5" />}
                  {growthVsLastMonth >= 0 ? '+' : ''}{growthVsLastMonth.toFixed(1)}%
                </div>
              )}
            </div>
            <div className="grid grid-cols-2 sm:grid-cols-4 gap-2 sm:gap-3">
              <PnLCell label="Revenue" value={formatPKR(stats?.salesMonth ?? 0)} sub={`${stats?.ordersMonth ?? 0} orders`} tone="emerald" />
              <PnLCell label="COGS" value={formatPKR(stats?.cogsMonth ?? 0)} sub="Purchase cost" tone="rose" />
              <PnLCell label="Expenses" value={formatPKR(stats?.expensesMonth ?? 0)} sub="Rent, staff" tone="amber" />
              <PnLCell label="Net Profit" value={formatPKR(stats?.netProfitMonth ?? 0)} sub="Bottom line" tone="blue" highlight />
            </div>
          </div>

          <div className="rounded-2xl sm:rounded-3xl bg-white border-2 border-slate-200 shadow-sm p-4 sm:p-6">
            <div className="flex items-center justify-between mb-4">
              <div>
                <h3 className="text-base sm:text-lg font-extrabold text-slate-900">Payment Methods</h3>
                <p className="text-xs text-slate-500 font-bold">Is mahina ka split</p>
              </div>
              <div className="h-9 w-9 rounded-xl bg-gradient-to-br from-pink-500 to-rose-700 text-white flex items-center justify-center shadow-md">
                <DollarSign className="h-5 w-5" />
              </div>
            </div>
            {paymentData.length > 0 ? (
              <div className="h-[220px]">
                <ResponsiveContainer width="100%" height="100%">
                  <PieChart>
                    <Pie
                      data={paymentData}
                      cx="50%" cy="45%" outerRadius={70} innerRadius={40}
                      dataKey="value" labelLine={false}
                      label={(entry: any) => {
                        const total = paymentData.reduce((s: number, p: any) => s + p.value, 0);
                        return total > 0 ? `${((entry.value / total) * 100).toFixed(0)}%` : '';
                      }}
                    >
                      {paymentData.map((p: any) => <Cell key={p.name} fill={p.color} />)}
                    </Pie>
                    <Tooltip formatter={(v: any) => formatPKR(Number(v))} contentStyle={{ borderRadius: 12 }} />
                    <Legend wrapperStyle={{ fontSize: 10, paddingTop: 8 }} iconType="circle" />
                  </PieChart>
                </ResponsiveContainer>
              </div>
            ) : (
              <div className="h-[220px] flex flex-col items-center justify-center gap-2">
                <DollarSign className="h-10 w-10 text-slate-300" />
                <p className="text-sm font-extrabold text-slate-500">No payment data</p>
              </div>
            )}
          </div>
        </section>
      )}

      {/* ═══ RETAIL OPERATIONS ═══ */}
      <section className="rounded-2xl sm:rounded-3xl bg-gradient-to-br from-sky-50 via-cyan-50 to-blue-50 border-2 border-sky-200 p-4 sm:p-5">
        <div className="flex items-center gap-2 mb-4">
          <div className="h-10 w-10 rounded-2xl bg-sky-600 text-white flex items-center justify-center shadow-lg shadow-sky-500/30">
            <Zap className="h-5 w-5" />
          </div>
          <div>
            <h3 className="text-base sm:text-lg font-extrabold text-sky-900">Retail Operations</h3>
            <p className="text-xs text-sky-700 font-bold">Sab retail features ek jaga</p>
          </div>
        </div>

        <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-4 gap-2 sm:gap-3">
          <OpsCard to="/retail/combos" icon={Sparkles} title="Combos" desc="Bundle deals" tone="violet" />
          <OpsCard to="/retail/product-units" icon={Layers} title="Multi-Units" desc="Piece/Dozen/Carton" tone="emerald" />
          <OpsCard to="/retail/damage" icon={AlertTriangle} title="Damage Log" desc={`${retailAlerts.damagesToday ?? 0} aaj`} tone="rose" />
          <OpsCard to="/retail/quick-keys" icon={Zap} title="Quick Keys" desc="POS shortcuts" tone="amber" />
          <OpsCard to="/retail/barcode-labels" icon={Barcode} title="Barcode Labels" desc="Print labels" tone="purple" />
          <OpsCard to="/retail/bulk-import" icon={Upload} title="Bulk Import" desc="Excel/CSV" tone="blue" />
          <OpsCard to="/retail/reorder" icon={RefreshCw} title="Smart Reorder" desc="AI suggestions" tone="cyan" />
          <OpsCard to="/customers" icon={BookOpen} title="Khata / Udhaar" desc="Credit tracking" tone="orange" />
        </div>
      </section>

      {/* ═══ STAT GRID ═══ */}
      <section className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-6 gap-2 sm:gap-3">
        <StatCard title="Products" value={stats?.totalProducts ?? 0} icon={Package} tone="cyan" link="/products" />
        <StatCard title="Customers" value={stats?.totalCustomers ?? 0} icon={Users} tone="pink" link="/customers" />
        <StatCard title="Suppliers" value={stats?.totalSuppliers ?? 0} icon={ShoppingBag} tone="violet" link="/suppliers" />
        <StatCard title="Categories" value={stats?.totalCategories ?? 0} icon={Tag} tone="emerald" link="/categories" />
        <StatCard title="Kam Stock" value={stats?.lowStockCount ?? 0} icon={AlertTriangle} tone="amber" link="/low-stock" alert />
        <StatCard title="Aaj Bike" value={(stats as any)?.itemsSoldToday ?? 0} icon={Boxes} tone="orange" />
      </section>

      {/* ═══ TOP + SLOW MOVERS ═══ */}
      <section className="grid lg:grid-cols-2 gap-4 sm:gap-6">
        <div className="rounded-2xl sm:rounded-3xl bg-white border-2 border-slate-200 shadow-sm overflow-hidden">
          <div className="px-4 sm:px-6 py-4 border-b-2 border-slate-100 flex items-center gap-2 bg-gradient-to-r from-amber-50 to-orange-50">
            <div className="h-9 w-9 rounded-xl bg-gradient-to-br from-amber-500 to-orange-600 text-white flex items-center justify-center shadow-md">
              <Award className="h-5 w-5" />
            </div>
            <div>
              <h3 className="text-base sm:text-lg font-extrabold text-slate-900">🏆 Sab Se Zyada Bikay</h3>
              <p className="text-xs text-slate-500 font-bold">Is mahine ke best sellers</p>
            </div>
          </div>
          <div className="divide-y-2 divide-slate-100 max-h-[400px] overflow-y-auto">
            {data?.topProducts?.length ? (
              data.topProducts.slice(0, 8).map((p, idx) => {
                const rankColors = ['bg-amber-500', 'bg-slate-400', 'bg-orange-600', 'bg-violet-500', 'bg-blue-500', 'bg-slate-500', 'bg-slate-500', 'bg-slate-500'];
                return (
                  <div key={p.productId} className="px-4 sm:px-6 py-3 flex items-center justify-between gap-3 hover:bg-slate-50/60 transition">
                    <div className="flex items-center gap-3 min-w-0 flex-1">
                      <div className={`h-8 w-8 rounded-lg ${rankColors[idx]} text-white font-extrabold flex items-center justify-center text-sm shrink-0 shadow`}>
                        {idx + 1}
                      </div>
                      <div className="h-10 w-10 rounded-lg bg-slate-100 overflow-hidden flex items-center justify-center shrink-0 border border-slate-200">
                        {p.product?.images?.[0]?.url ? (
                          <img src={p.product.images[0].url} alt="" loading="lazy" className="h-full w-full object-cover" />
                        ) : (
                          <Package className="h-4 w-4 text-slate-400" />
                        )}
                      </div>
                      <div className="min-w-0 flex-1">
                        <div className="font-extrabold text-slate-900 truncate text-sm">{p.product?.name}</div>
                        <div className="text-[10px] text-slate-500 font-bold">{p.quantitySold.toFixed(0)} {p.product?.unit} bike</div>
                      </div>
                    </div>
                    <div className="font-extrabold text-emerald-700 text-sm tabular-nums shrink-0">{formatPKR(p.revenue)}</div>
                  </div>
                );
              })
            ) : (
              <div className="px-6 py-12 text-center">
                <Award className="h-10 w-10 text-slate-300 mx-auto mb-2" />
                <p className="font-extrabold text-slate-500 text-sm">Abhi tak koi sale nahi</p>
              </div>
            )}
          </div>
        </div>

        <div className="rounded-2xl sm:rounded-3xl bg-white border-2 border-slate-200 shadow-sm overflow-hidden">
          <div className="px-4 sm:px-6 py-4 border-b-2 border-slate-100 flex items-center gap-2 bg-gradient-to-r from-rose-50 to-red-50">
            <div className="h-9 w-9 rounded-xl bg-gradient-to-br from-rose-500 to-red-700 text-white flex items-center justify-center shadow-md">
              <Clock className="h-5 w-5" />
            </div>
            <div>
              <h3 className="text-base sm:text-lg font-extrabold text-slate-900">🐢 Ruke Huay Products</h3>
              <p className="text-xs text-slate-500 font-bold">30 din se koi bikri nahi</p>
            </div>
          </div>
          <div className="divide-y-2 divide-slate-100 max-h-[400px] overflow-y-auto">
            {slowMovers.length === 0 ? (
              <div className="px-6 py-12 text-center">
                <Star className="h-10 w-10 text-emerald-400 mx-auto mb-2" />
                <p className="font-extrabold text-slate-700 text-sm">🎉 Sab kuch chal raha hai!</p>
                <p className="text-xs text-slate-500 mt-1">Koi ruka hua product nahi</p>
              </div>
            ) : (
              slowMovers.slice(0, 8).map((p: any) => (
                <Link
                  key={p.id}
                  to={`/retail-products/${p.id}`}
                  className="px-4 sm:px-6 py-3 flex items-center gap-3 hover:bg-slate-50/60 transition"
                >
                  <div className="h-10 w-10 rounded-lg bg-slate-100 overflow-hidden flex items-center justify-center shrink-0 border border-slate-200">
                    {p.images?.[0]?.url ? (
                      <img src={p.images[0].url} alt="" loading="lazy" className="h-full w-full object-cover" />
                    ) : (
                      <Package className="h-4 w-4 text-slate-400" />
                    )}
                  </div>
                  <div className="flex-1 min-w-0">
                    <div className="font-extrabold text-slate-900 truncate text-sm">{p.name}</div>
                    <div className="text-[10px] text-slate-500 font-bold">
                      Stock: {p.stock} {p.unit} • {p.category?.name || 'No cat'}
                    </div>
                  </div>
                  <div className="text-right shrink-0">
                    <div className="text-xs font-extrabold text-rose-700">Discount karo</div>
                    <ArrowRight className="h-4 w-4 text-slate-400 ml-auto" />
                  </div>
                </Link>
              ))
            )}
          </div>
        </div>
      </section>
    </div>
  );
}

/* ══════════ Components ══════════ */

function HeroTile({ icon: Icon, label, value, sub, trend, tone }: any) {
  const tones: Record<string, string> = {
    emerald: 'from-emerald-400/30 to-emerald-600/20 border-emerald-300/40',
    blue: 'from-blue-400/30 to-blue-600/20 border-blue-300/40',
    amber: 'from-amber-400/30 to-amber-600/20 border-amber-300/40',
    violet: 'from-violet-400/30 to-violet-600/20 border-violet-300/40',
  };
  return (
    <div className={`rounded-xl bg-gradient-to-br ${tones[tone]} backdrop-blur border p-2.5 sm:p-3`}>
      <div className="flex items-center gap-1.5 mb-1">
        <Icon className="h-3 w-3 opacity-80" />
        <div className="text-[9px] uppercase tracking-wider font-extrabold opacity-90">{label}</div>
      </div>
      <div className="text-base sm:text-xl font-extrabold text-white tabular-nums leading-none truncate">{value}</div>
      <div className="text-[10px] font-bold text-white/70 mt-0.5 truncate">
        {trend !== undefined ? (
          <span className={`inline-flex items-center gap-0.5 ${trend >= 0 ? 'text-emerald-300' : 'text-rose-300'}`}>
            {trend >= 0 ? <TrendingUp className="h-2.5 w-2.5" /> : <TrendingDown className="h-2.5 w-2.5" />}
            {trend >= 0 ? '+' : ''}{trend.toFixed(1)}%
          </span>
        ) : sub}
      </div>
    </div>
  );
}

function QuickAction({ to, icon: Icon, label, tone }: any) {
  const tones: Record<string, string> = {
    sky: 'from-sky-500 to-cyan-700',
    emerald: 'from-emerald-500 to-green-700',
    blue: 'from-blue-500 to-blue-700',
    violet: 'from-violet-500 to-purple-700',
    pink: 'from-pink-500 to-rose-700',
    amber: 'from-amber-500 to-orange-700',
  };
  return (
    <Link
      to={to}
      className="group rounded-2xl bg-white border-2 border-slate-200 hover:border-sky-300 hover:shadow-lg hover:-translate-y-0.5 transition-all p-3 sm:p-4 text-center"
    >
      <div className={`h-10 w-10 sm:h-12 sm:w-12 rounded-2xl bg-gradient-to-br ${tones[tone]} text-white flex items-center justify-center shadow-md mx-auto mb-2 group-hover:scale-110 transition-transform`}>
        <Icon className="h-5 w-5 sm:h-6 sm:w-6" />
      </div>
      <div className="text-xs sm:text-sm font-extrabold text-slate-900">{label}</div>
    </Link>
  );
}

function AlertCard({ to, icon: Icon, title, desc, tone }: any) {
  const tones: Record<string, string> = {
    rose: 'from-rose-500 to-red-700 bg-rose-50 border-rose-200 text-rose-700',
    amber: 'from-amber-500 to-orange-700 bg-amber-50 border-amber-200 text-amber-700',
    blue: 'from-blue-500 to-blue-700 bg-blue-50 border-blue-200 text-blue-700',
  };
  const [grad, ...bg] = tones[tone].split(' ');
  return (
    <Link to={to} className={`rounded-2xl bg-white border-2 ${bg.slice(0, 2).join(' ')} p-3 sm:p-4 flex items-center gap-3 hover:shadow-md transition group`}>
      <div className={`h-11 w-11 rounded-xl bg-gradient-to-br ${grad} to-${grad.replace('from-', '').split('-')[0]}-700 text-white flex items-center justify-center shadow-md shrink-0`}>
        <Icon className="h-5 w-5" />
      </div>
      <div className="flex-1 min-w-0">
        <div className="font-extrabold text-slate-900 text-sm">{title}</div>
        <div className="text-xs text-slate-600 font-bold truncate">{desc}</div>
      </div>
      <ArrowRight className="h-4 w-4 text-slate-400 shrink-0 group-hover:translate-x-1 transition" />
    </Link>
  );
}

function PnLCell({ label, value, sub, tone, highlight }: any) {
  const tones: Record<string, string> = {
    emerald: 'text-emerald-700',
    rose: 'text-rose-700',
    amber: 'text-amber-700',
    blue: 'text-blue-700',
  };
  return (
    <div className={[
      'rounded-xl p-3 border-2',
      highlight ? 'bg-gradient-to-br from-blue-50 to-cyan-50 border-blue-300' : 'bg-slate-50 border-slate-200',
    ].join(' ')}>
      <div className="text-[10px] uppercase tracking-wider font-extrabold text-slate-600">{label}</div>
      <div className={`text-lg sm:text-xl font-extrabold tabular-nums mt-1 ${tones[tone]}`}>{value}</div>
      <div className="text-[10px] text-slate-500 font-bold mt-0.5">{sub}</div>
    </div>
  );
}

function OpsCard({ to, icon: Icon, title, desc, tone }: any) {
  const tones: Record<string, string> = {
    violet: 'from-violet-500 to-purple-700 bg-violet-100 text-violet-700',
    emerald: 'from-emerald-500 to-green-700 bg-emerald-100 text-emerald-700',
    rose: 'from-rose-500 to-red-700 bg-rose-100 text-rose-700',
    amber: 'from-amber-500 to-orange-700 bg-amber-100 text-amber-700',
    purple: 'from-purple-500 to-fuchsia-700 bg-purple-100 text-purple-700',
    blue: 'from-blue-500 to-blue-700 bg-blue-100 text-blue-700',
    cyan: 'from-cyan-500 to-teal-700 bg-cyan-100 text-cyan-700',
    orange: 'from-orange-500 to-red-700 bg-orange-100 text-orange-700',
  };
  const parts = tones[tone].split(' ');
  const grad = `${parts[0]} ${parts[1]}`;
  return (
    <Link to={to} className="rounded-2xl bg-white border-2 border-slate-200 hover:border-sky-300 hover:shadow-md hover:-translate-y-0.5 transition-all p-3 sm:p-4 group">
      <div className={`h-9 w-9 sm:h-10 sm:w-10 rounded-xl bg-gradient-to-br ${grad} text-white flex items-center justify-center shadow-md mb-2 group-hover:scale-110 transition-transform`}>
        <Icon className="h-4 w-4 sm:h-5 sm:w-5" />
      </div>
      <div className="font-extrabold text-slate-900 text-xs sm:text-sm">{title}</div>
      <div className="text-[10px] sm:text-xs text-slate-500 font-bold mt-0.5 truncate">{desc}</div>
    </Link>
  );
}

function StatCard({ title, value, icon: Icon, tone, link, alert }: any) {
  const tones: Record<string, string> = {
    cyan: 'from-cyan-500 to-teal-700',
    pink: 'from-pink-500 to-rose-700',
    violet: 'from-violet-500 to-purple-700',
    emerald: 'from-emerald-500 to-green-700',
    amber: 'from-amber-500 to-orange-700',
    orange: 'from-orange-500 to-red-700',
  };
  const inner = (
    <div className={[
      'rounded-2xl bg-white border-2 p-3 sm:p-4 shadow-sm hover:shadow-md transition',
      alert ? 'border-amber-300' : 'border-slate-200',
    ].join(' ')}>
      <div className="flex items-center justify-between gap-2">
        <div className="min-w-0">
          <div className="text-[10px] uppercase tracking-wider text-slate-500 font-extrabold">{title}</div>
          <div className="mt-1 text-xl sm:text-2xl font-extrabold text-slate-900 tabular-nums truncate">{value}</div>
        </div>
        <div className={`h-10 w-10 sm:h-11 sm:w-11 rounded-2xl bg-gradient-to-br ${tones[tone]} text-white flex items-center justify-center shadow-md shrink-0`}>
          <Icon className="h-4 w-4 sm:h-5 sm:w-5" />
        </div>
      </div>
    </div>
  );
  return link ? <Link to={link}>{inner}</Link> : inner;
}
