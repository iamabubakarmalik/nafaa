import { useQuery } from '@tanstack/react-query';
import { Link } from 'react-router-dom';
import {
  Package, AlertTriangle, Users, ShoppingCart, ArrowRight, Plus,
  Sparkles, Receipt, Truck, TrendingUp, TrendingDown, Wallet,
  Tag, BookOpen, Award, Target, Boxes, DollarSign, Crown,
  Layers, Scissors, Smartphone, Wrench, RefreshCw, CreditCard,
  ArrowRightLeft, RotateCcw, Banknote, Building2, Zap, Activity,
  Star, Clock, ChevronRight,
} from 'lucide-react';
import {
  ResponsiveContainer, AreaChart, Area, XAxis, YAxis, Tooltip, CartesianGrid,
  BarChart, Bar, PieChart, Pie, Cell, Legend,
} from 'recharts';
import { dashboardApi } from '@/api/dashboard.api';
import { Button } from '@/components/ui/Button';
import { formatPKR, formatPKRFull } from '@/lib/format';
import { SubscriptionBanner } from '../components/SubscriptionBanner';
import { EmailVerifyBanner } from '@/components/auth/EmailVerifyBanner';

const formatDate = (value: string) =>
  new Intl.DateTimeFormat('en-PK', { dateStyle: 'medium', timeStyle: 'short' }).format(new Date(value));

const formatPercent = (n: number) => {
  const sign = n > 0 ? '+' : '';
  return `${sign}${n.toFixed(1)}%`;
};

const PAYMENT_COLORS: Record<string, string> = {
  CASH: '#10b981',
  CARD: '#3b82f6',
  JAZZCASH: '#f97316',
  EASYPAISA: '#22c55e',
  BANK_TRANSFER: '#8b5cf6',
};

const PAYMENT_ICONS: Record<string, any> = {
  CASH: Banknote, CARD: CreditCard, JAZZCASH: Smartphone,
  EASYPAISA: Zap, BANK_TRANSFER: Building2,
};

export default function DashboardPage() {
  const { data, isLoading, refetch, isRefetching } = useQuery({
    queryKey: ['dashboard-overview'],
    queryFn: dashboardApi.overview,
    refetchInterval: 60 * 1000, // Auto-refresh every minute
  });

  const stats = data?.stats;
  const tenant = data?.tenant;
  const isCarpet = tenant?.isCarpet;
  const isMobile = tenant?.isMobile;

  const trendData = (data?.salesTrend7Days ?? []).map((p) => {
    const d = new Date(p.date);
    const dayName = ['Sun', 'Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat'][d.getDay()];
    return { ...p, label: dayName };
  });

  const trend30Data = (data?.salesTrend30Days ?? []).map((p) => {
    const d = new Date(p.date);
    return { ...p, label: `${d.getDate()}/${d.getMonth() + 1}` };
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
      {/* ═══ SUBSCRIPTION BANNER (top) ═══ */}
      <SubscriptionBanner />

      {/* ═══ EMAIL VERIFY BANNER ═══ */}
      <EmailVerifyBanner />

      {/* ═══ HERO SECTION ═══ */}
      <section className="relative overflow-hidden rounded-3xl bg-gradient-to-br from-slate-950 via-brand-900 to-emerald-800 text-white p-6 sm:p-8 shadow-2xl">
        <div className="absolute -top-16 -right-16 h-48 w-48 rounded-full bg-emerald-400/20 blur-3xl" />
        <div className="absolute -bottom-16 -left-16 h-48 w-48 rounded-full bg-amber-400/15 blur-3xl" />

        <div className="relative flex flex-col lg:flex-row lg:items-center lg:justify-between gap-6">
          <div className="max-w-2xl">
            <div className="inline-flex items-center gap-2 rounded-full bg-white/10 backdrop-blur px-3 py-1 text-xs font-semibold">
              <Sparkles className="h-3.5 w-3.5 text-amber-300" />
              {tenant?.name || 'Your Shop'}
              {isCarpet && <span className="ml-1 px-1.5 py-0.5 rounded bg-emerald-500/30 text-[10px] font-extrabold uppercase">Carpet</span>}
              {isMobile && <span className="ml-1 px-1.5 py-0.5 rounded bg-blue-500/30 text-[10px] font-extrabold uppercase">Mobile</span>}
            </div>
            <h2 className="mt-4 text-3xl sm:text-4xl font-extrabold leading-tight">
              Aaj ka asli profit
            </h2>
            <div className="mt-3 flex items-baseline gap-3 flex-wrap">
              <div className="text-4xl sm:text-5xl font-extrabold tabular-nums">
                {isLoading ? '...' : formatPKR(stats?.netProfitToday ?? 0)}
              </div>
              {growthVsYesterday !== 0 && (
                <div className={`inline-flex items-center gap-1 px-2.5 py-1 rounded-xl text-xs font-extrabold ${
                  growthVsYesterday >= 0 ? 'bg-emerald-500/20 text-emerald-200' : 'bg-rose-500/20 text-rose-200'
                }`}>
                  {growthVsYesterday >= 0 ? <TrendingUp className="h-3 w-3" /> : <TrendingDown className="h-3 w-3" />}
                  {formatPercent(growthVsYesterday)} vs yesterday
                </div>
              )}
            </div>
            <p className="mt-2 text-white/80 text-sm">
              Sales <strong>{formatPKR(stats?.salesToday ?? 0)}</strong> − Cost <strong>{formatPKR(stats?.cogsToday ?? 0)}</strong> − Expenses <strong>{formatPKR(stats?.expensesToday ?? 0)}</strong>
            </p>
          </div>

          <div className="flex flex-wrap gap-2">
            <button
              onClick={() => refetch()}
              disabled={isRefetching}
              className="inline-flex items-center gap-2 px-3 py-2.5 rounded-xl bg-white/10 hover:bg-white/20 text-white text-sm font-bold backdrop-blur transition disabled:opacity-50"
            >
              <RefreshCw className={`h-4 w-4 ${isRefetching ? 'animate-spin' : ''}`} />
              Refresh
            </button>
            <Link to="/pos">
              <Button size="lg" className="bg-white text-slate-900 hover:bg-slate-100">
                <ShoppingCart className="h-4 w-4" /> Open POS
              </Button>
            </Link>
            <Link to="/expenses">
              <Button size="lg" className="bg-rose-500 hover:bg-rose-400 text-white">
                <Wallet className="h-4 w-4" /> Add Expense
              </Button>
            </Link>
          </div>
        </div>
      </section>

      {/* ═══ HERO KPI CARDS (4 cards) ═══ */}
      <section className="grid grid-cols-1 sm:grid-cols-2 xl:grid-cols-4 gap-4">
        <HeroKpiCard
          title="Aaj ki Sales"
          value={formatPKR(stats?.salesToday ?? 0)}
          subtitle={`${stats?.ordersToday ?? 0} orders • AOV ${formatPKR(stats?.aovToday ?? 0)}`}
          icon={TrendingUp}
          color="from-emerald-500 to-green-600"
          trend={growthVsYesterday}
        />
        <HeroKpiCard
          title="Aaj ka Net Profit"
          value={formatPKR(stats?.netProfitToday ?? 0)}
          subtitle="Sales − Cost − Expenses"
          icon={Target}
          color="from-cyan-500 to-teal-600"
          isHighlight
        />
        <HeroKpiCard
          title="Aaj ke Expenses"
          value={formatPKR(stats?.expensesToday ?? 0)}
          subtitle={`${stats?.expenseCountToday ?? 0} entries`}
          icon={TrendingDown}
          color="from-rose-500 to-red-600"
        />
        <HeroKpiCard
          title="Mahine ka Net Profit"
          value={formatPKR(stats?.netProfitMonth ?? 0)}
          subtitle={growthVsLastMonth !== 0 ? `${formatPercent(growthVsLastMonth)} vs last month` : 'This month'}
          icon={Wallet}
          color="from-violet-500 to-purple-600"
          trend={growthVsLastMonth}
        />
      </section>

      {/* ═══ INDUSTRY-SPECIFIC STATS (Carpet) ═══ */}
      {isCarpet && data?.carpetStats && (
        <section className="rounded-3xl bg-gradient-to-br from-emerald-50 via-green-50 to-teal-50 border-2 border-emerald-200 p-5 shadow-sm">
          <div className="flex items-center justify-between mb-4 flex-wrap gap-2">
            <div className="flex items-center gap-2">
              <div className="h-10 w-10 rounded-2xl bg-emerald-600 text-white flex items-center justify-center shadow-lg shadow-emerald-500/30">
                <Layers className="h-5 w-5" />
              </div>
              <div>
                <h3 className="text-lg font-extrabold text-emerald-900">Carpet Stock Overview</h3>
                <p className="text-xs text-emerald-700">Roll-based inventory snapshot</p>
              </div>
            </div>
            <div className="flex gap-2">
              <Link to="/carpet-rolls">
                <Button variant="secondary" size="sm">
                  <Layers className="h-3.5 w-3.5" /> All Rolls
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
            <IndustryStatCard
              label="Active Rolls"
              value={String(data.carpetStats.totalActiveRolls)}
              sub={`${data.carpetStats.totalLengthFt.toFixed(0)} ft total`}
              icon={Layers}
              color="emerald"
            />
            <IndustryStatCard
              label="Total Sqft"
              value={data.carpetStats.totalSqft.toFixed(0)}
              sub="Available stock"
              icon={Boxes}
              color="green"
            />
            <IndustryStatCard
              label="Cut Pieces"
              value={String(data.carpetStats.cutPiecesCount)}
              sub={`${data.carpetStats.cutPiecesSqft.toFixed(0)} sqft`}
              icon={Scissors}
              color="violet"
            />
            <IndustryStatCard
              label="Cut Piece Value"
              value={formatPKR(data.carpetStats.cutPiecesValue)}
              sub="Listed price"
              icon={DollarSign}
              color="amber"
            />
          </div>

          {/* Low rolls alert */}
          {data.carpetStats.lowStockRolls.length > 0 && (
            <div className="mt-4 rounded-2xl bg-white border-2 border-amber-200 p-3">
              <div className="flex items-center gap-2 mb-2">
                <AlertTriangle className="h-4 w-4 text-amber-600" />
                <h4 className="font-bold text-amber-900 text-sm">
                  {data.carpetStats.lowStockRolls.length} rolls have less than 10ft left
                </h4>
              </div>
              <div className="flex flex-wrap gap-2">
                {data.carpetStats.lowStockRolls.map((r) => (
                  <Link
                    key={r.id}
                    to={`/carpet-rolls/${r.id}`}
                    className="inline-flex items-center gap-1.5 px-2 py-1 rounded-lg bg-amber-50 border border-amber-200 text-xs font-bold text-amber-800 hover:bg-amber-100"
                  >
                    <span className="font-mono">{r.rollNumber}</span>
                    <span className="text-amber-600">• {r.remainingLengthFt.toFixed(1)}ft</span>
                  </Link>
                ))}
              </div>
            </div>
          )}
        </section>
      )}

      {/* ═══ INDUSTRY-SPECIFIC STATS (Mobile) ═══ */}
      {isMobile && data?.mobileStats && (
        <section className="rounded-3xl bg-gradient-to-br from-blue-50 via-indigo-50 to-cyan-50 border-2 border-blue-200 p-5 shadow-sm">
          <div className="flex items-center justify-between mb-4 flex-wrap gap-2">
            <div className="flex items-center gap-2">
              <div className="h-10 w-10 rounded-2xl bg-blue-600 text-white flex items-center justify-center shadow-lg shadow-blue-500/30">
                <Smartphone className="h-5 w-5" />
              </div>
              <div>
                <h3 className="text-lg font-extrabold text-blue-900">Mobile Shop Overview</h3>
                <p className="text-xs text-blue-700">IMEI tracking & services</p>
              </div>
            </div>
            <div className="flex gap-2">
              <Link to="/imei-inventory">
                <Button variant="secondary" size="sm">
                  <Smartphone className="h-3.5 w-3.5" /> IMEIs
                </Button>
              </Link>
              <Link to="/mobile-reports">
                <Button size="sm" className="bg-blue-600 hover:bg-blue-700">
                  <Activity className="h-3.5 w-3.5" /> Reports
                </Button>
              </Link>
            </div>
          </div>

          <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
            <IndustryStatCard
              label="IMEIs In Stock"
              value={String(data.mobileStats.inStock)}
              sub={`${data.mobileStats.total} total registered`}
              icon={Smartphone}
              color="blue"
            />
            <IndustryStatCard
              label="Sold Today"
              value={String(data.mobileStats.soldToday)}
              sub={`${data.mobileStats.sold} total sold`}
              icon={TrendingUp}
              color="emerald"
            />
            <IndustryStatCard
              label="Used Phones"
              value={String(data.mobileStats.usedPhonesInStock)}
              sub="In stock"
              icon={RefreshCw}
              color="violet"
            />
            <IndustryStatCard
              label="Open Repairs"
              value={String(data.mobileStats.repairTicketsOpen)}
              sub={`${data.mobileStats.emiActivePlans} EMI plans`}
              icon={Wrench}
              color="amber"
            />
          </div>
        </section>
      )}

      {/* ═══ TRENDS — 7-DAY + HOURLY ═══ */}
      <section className="grid lg:grid-cols-[1.5fr_1fr] gap-6">
        {/* 7-Day Trend Chart */}
        <div className="rounded-3xl bg-white border border-slate-200 shadow-sm p-6">
          <div className="flex items-center justify-between mb-5">
            <div>
              <h3 className="text-xl font-bold text-slate-900">7-Day Sales Trend</h3>
              <p className="text-sm text-slate-500">Sales & profit pattern</p>
            </div>
            <Link to="/reports" className="text-brand-700 text-sm font-bold inline-flex items-center gap-1">
              Full reports <ArrowRight className="h-4 w-4" />
            </Link>
          </div>

          {trendData.length >= 2 ? (
            <div className="h-[280px]">
              <ResponsiveContainer width="100%" height="100%">
                <AreaChart data={trendData}>
                  <defs>
                    <linearGradient id="salesGrad" x1="0" y1="0" x2="0" y2="1">
                      <stop offset="0%" stopColor="#10b981" stopOpacity={0.4} />
                      <stop offset="100%" stopColor="#10b981" stopOpacity={0} />
                    </linearGradient>
                    <linearGradient id="profitGrad" x1="0" y1="0" x2="0" y2="1">
                      <stop offset="0%" stopColor="#8b5cf6" stopOpacity={0.3} />
                      <stop offset="100%" stopColor="#8b5cf6" stopOpacity={0} />
                    </linearGradient>
                  </defs>
                  <CartesianGrid strokeDasharray="3 3" stroke="#e2e8f0" />
                  <XAxis dataKey="label" stroke="#64748b" fontSize={12} />
                  <YAxis stroke="#64748b" fontSize={11} tickFormatter={(v) => `${(v / 1000).toFixed(0)}k`} />
                  <Tooltip
                    formatter={(value: any) => formatPKR(Number(value))}
                    contentStyle={{ borderRadius: 12, border: '2px solid #e2e8f0', fontSize: 12 }}
                  />
                  <Legend wrapperStyle={{ fontSize: 11 }} />
                  <Area type="monotone" dataKey="sales" name="Sales" stroke="#10b981" fill="url(#salesGrad)" strokeWidth={2.5} />
                  <Area type="monotone" dataKey="profit" name="Profit" stroke="#8b5cf6" fill="url(#profitGrad)" strokeWidth={2} />
                </AreaChart>
              </ResponsiveContainer>
            </div>
          ) : (
            <div className="h-[280px] flex items-center justify-center text-sm text-slate-500">
              Need more data to show trend
            </div>
          )}
        </div>

        {/* Hourly Sales Today */}
        <div className="rounded-3xl bg-white border border-slate-200 shadow-sm p-6">
          <div className="flex items-center justify-between mb-5">
            <div>
              <h3 className="text-lg font-bold text-slate-900">Today's Activity</h3>
              <p className="text-sm text-slate-500">Hourly sales pattern</p>
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
                  <Tooltip
                    formatter={(value: any) => formatPKR(Number(value))}
                    contentStyle={{ borderRadius: 12, border: '2px solid #e2e8f0', fontSize: 12 }}
                  />
                  <Bar dataKey="sales" fill="#3b82f6" radius={[6, 6, 0, 0]} />
                </BarChart>
              </ResponsiveContainer>
            </div>
          ) : (
            <div className="h-[280px] flex items-center justify-center text-sm text-slate-500">
              No sales yet today
            </div>
          )}
        </div>
      </section>

      {/* ═══ REGISTER + INVENTORY + UDHAAR ═══ */}
      <section className="grid sm:grid-cols-2 lg:grid-cols-3 gap-4">
        {/* Cash Register */}
        {stats?.registerOpen ? (
          <Link to="/cash-register" className="block">
            <div className="rounded-3xl bg-gradient-to-br from-emerald-500 to-green-600 text-white p-5 shadow-lg shadow-emerald-500/30 hover:shadow-xl transition h-full">
              <div className="flex items-center gap-3 mb-3">
                <div className="h-12 w-12 rounded-2xl bg-white/20 flex items-center justify-center">
                  <Wallet className="h-6 w-6" />
                </div>
                <div>
                  <div className="flex items-center gap-1.5">
                    <span className="h-2 w-2 rounded-full bg-white animate-pulse" />
                    <span className="text-[10px] font-extrabold uppercase tracking-wider opacity-90">Register Open</span>
                  </div>
                  <h3 className="text-2xl font-bold mt-1">{formatPKR(stats.registerExpected)}</h3>
                </div>
              </div>
              <div className="pt-3 border-t border-white/20 text-xs opacity-90">
                Opening: {formatPKR(stats.registerOpening)}
              </div>
            </div>
          </Link>
        ) : (
          <Link to="/cash-register" className="block">
            <div className="rounded-3xl bg-amber-50 border-2 border-dashed border-amber-300 p-5 hover:border-amber-500 transition h-full">
              <div className="flex items-center gap-3">
                <div className="h-12 w-12 rounded-2xl bg-amber-500 flex items-center justify-center">
                  <Wallet className="h-6 w-6 text-white" />
                </div>
                <div>
                  <div className="text-[10px] font-extrabold uppercase tracking-wider text-amber-800">Register Closed</div>
                  <h3 className="text-base font-bold text-amber-900 mt-1">Open to start</h3>
                </div>
              </div>
              <div className="mt-3 text-xs text-amber-700">
                POS use karne ke liye register kholo
              </div>
            </div>
          </Link>
        )}

        {/* Inventory Value */}
        <Link to="/stock-report" className="block">
          <div className="rounded-3xl bg-white border border-slate-200 p-5 shadow-sm hover:shadow-md transition h-full">
            <div className="flex items-center gap-3 mb-3">
              <div className="h-12 w-12 rounded-2xl bg-blue-100 text-blue-700 flex items-center justify-center">
                <Boxes className="h-6 w-6" />
              </div>
              <div className="flex-1">
                <div className="text-[10px] font-extrabold uppercase tracking-wider text-slate-500">Stock Value</div>
                <h3 className="text-2xl font-bold text-slate-900">{formatPKR(stats?.inventoryValueAtCost ?? 0)}</h3>
              </div>
            </div>
            <div className="pt-3 border-t border-slate-100 grid grid-cols-2 gap-2 text-xs">
              <div>
                <div className="text-slate-500">Sell Value</div>
                <div className="font-extrabold text-emerald-700">{formatPKR(stats?.inventoryValueAtPrice ?? 0)}</div>
              </div>
              <div>
                <div className="text-slate-500">Potential</div>
                <div className="font-extrabold text-violet-700">{formatPKR(stats?.potentialProfit ?? 0)}</div>
              </div>
            </div>
          </div>
        </Link>

        {/* Udhaar */}
        {(stats?.totalUdhaar ?? 0) > 0 ? (
          <Link to="/khata" className="block">
            <div className="rounded-3xl bg-gradient-to-br from-rose-500 to-pink-600 text-white p-5 shadow-lg shadow-rose-500/30 hover:shadow-xl transition h-full">
              <div className="flex items-center gap-3 mb-3">
                <div className="h-12 w-12 rounded-2xl bg-white/20 flex items-center justify-center">
                  <BookOpen className="h-6 w-6" />
                </div>
                <div>
                  <div className="text-[10px] font-extrabold uppercase tracking-wider opacity-90">Total Udhaar</div>
                  <h3 className="text-2xl font-bold mt-1">{formatPKR(stats?.totalUdhaar ?? 0)}</h3>
                </div>
              </div>
              <div className="pt-3 border-t border-white/20 text-xs opacity-90">
                {stats?.customersWithUdhaar ?? 0} customers — Collect karein
              </div>
            </div>
          </Link>
        ) : (
          <div className="rounded-3xl bg-emerald-50 border border-emerald-200 p-5 h-full">
            <div className="flex items-center gap-3 mb-3">
              <div className="h-12 w-12 rounded-2xl bg-emerald-500 flex items-center justify-center">
                <BookOpen className="h-6 w-6 text-white" />
              </div>
              <div>
                <div className="text-[10px] font-extrabold uppercase tracking-wider text-emerald-700">All Clear!</div>
                <h3 className="text-base font-bold text-emerald-900">No Udhaar Outstanding</h3>
              </div>
            </div>
            <div className="mt-3 text-xs text-emerald-700">
              Sab customers ne payments clear kar diye
            </div>
          </div>
        )}
      </section>

      {/* ═══ PROFIT & LOSS THIS MONTH ═══ */}
      <section className="rounded-3xl bg-white border border-slate-200 shadow-sm p-6">
        <div className="flex items-center justify-between mb-5 flex-wrap gap-2">
          <div>
            <h3 className="text-xl font-bold text-slate-900">Profit & Loss — Is Mahina</h3>
            <p className="text-sm text-slate-500">Complete breakdown: Sales, Cost, Expenses, Net Profit</p>
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
          <PnLCard label="Revenue" value={formatPKR(stats?.salesMonth ?? 0)} sub={`${stats?.ordersMonth ?? 0} orders`} color="emerald" />
          <PnLCard label="Cost of Goods" value={formatPKR(stats?.cogsMonth ?? 0)} sub="COGS" color="rose" />
          <PnLCard label="Expenses" value={formatPKR(stats?.expensesMonth ?? 0)} sub="Business spending" color="amber" />
          <PnLCard
            label="Net Profit"
            value={formatPKR(stats?.netProfitMonth ?? 0)}
            sub="Sales − Cost − Expenses"
            color="brand"
            isHighlight
          />
        </div>
      </section>

      {/* ═══ OPERATIONS QUICK STATS ═══ */}
      <section className="grid grid-cols-2 sm:grid-cols-3 xl:grid-cols-6 gap-3">
        <QuickStat title="Orders" value={stats?.totalOrders ?? 0} icon={ShoppingCart} tone="blue" link="/sales" />
        <QuickStat title="Products" value={stats?.totalProducts ?? 0} icon={Package} tone="violet" link="/products" />
        <QuickStat title="Customers" value={stats?.totalCustomers ?? 0} icon={Users} tone="pink" link="/customers" />
        <QuickStat title="Low Stock" value={stats?.lowStockCount ?? 0} icon={AlertTriangle} tone="amber" link="/low-stock" alert />
        <QuickStat title="Suppliers" value={stats?.totalSuppliers ?? 0} icon={Truck} tone="orange" link="/suppliers" />
        <QuickStat title="Returns" value={stats?.returnsMonthCount ?? 0} icon={RotateCcw} tone="rose" link="/returns" />
      </section>

      {/* ═══ PENDING TASKS ALERT ═══ */}
      {(stats?.pendingTransfers ?? 0) > 0 && (
        <section className="rounded-3xl bg-blue-50 border-2 border-blue-200 p-4">
          <div className="flex items-center justify-between gap-3 flex-wrap">
            <div className="flex items-center gap-3">
              <div className="h-10 w-10 rounded-xl bg-blue-500 text-white flex items-center justify-center">
                <ArrowRightLeft className="h-5 w-5" />
              </div>
              <div>
                <div className="font-bold text-blue-900">
                  {stats?.pendingTransfers} pending stock transfer{stats?.pendingTransfers !== 1 ? 's' : ''}
                </div>
                <div className="text-xs text-blue-700">Review and accept incoming stock</div>
              </div>
            </div>
            <Link to="/transfers">
              <Button size="sm" className="bg-blue-600 hover:bg-blue-700">
                View <ArrowRight className="h-3.5 w-3.5" />
              </Button>
            </Link>
          </div>
        </section>
      )}

      {/* ═══ LOW STOCK + TOP PRODUCTS ═══ */}
      <section className="grid lg:grid-cols-2 gap-6">
        {/* Low Stock */}
        <div className="rounded-3xl bg-white border border-slate-200 shadow-sm">
          <div className="px-6 py-5 border-b border-slate-100 flex items-center justify-between">
            <div className="flex items-center gap-2">
              <AlertTriangle className="h-5 w-5 text-amber-500" />
              <div>
                <h3 className="text-lg font-bold text-slate-900">Low Stock Alerts</h3>
                <p className="text-sm text-slate-500">{data?.lowStockProducts?.length ?? 0} items need attention</p>
              </div>
            </div>
            <Link to="/low-stock" className="text-brand-700 text-sm font-bold inline-flex items-center gap-1">
              All <ArrowRight className="h-4 w-4" />
            </Link>
          </div>
          <div className="divide-y divide-slate-100 max-h-[420px] overflow-y-auto">
            {data?.lowStockProducts?.length ? (
              data.lowStockProducts.slice(0, 6).map((p) => {
                const isOut = p.stock === 0;
                return (
                  <Link
                    key={p.id}
                    to={`/products/${p.id}/edit`}
                    className="px-6 py-3 flex items-center justify-between gap-3 hover:bg-slate-50 transition"
                  >
                    <div className="flex items-center gap-3 min-w-0">
                      <div className={`h-10 w-10 rounded-xl overflow-hidden flex items-center justify-center ${
                        isOut ? 'bg-rose-100' : 'bg-amber-100'
                      }`}>
                        {p.images?.[0]?.url ? (
                          <img src={p.images[0].url} alt="" className="h-full w-full object-cover" />
                        ) : (
                          <Package className={`h-4 w-4 ${isOut ? 'text-rose-700' : 'text-amber-700'}`} />
                        )}
                      </div>
                      <div className="min-w-0">
                        <div className="font-bold text-slate-900 truncate text-sm">{p.name}</div>
                        <div className="text-xs text-slate-500">{formatPKR(p.price)} / {p.unit}</div>
                      </div>
                    </div>
                    <div className="text-right shrink-0">
                      <div className={`font-extrabold text-lg ${isOut ? 'text-rose-700' : 'text-amber-700'}`}>
                        {p.stock}
                      </div>
                      <div className={`text-[10px] font-extrabold uppercase ${isOut ? 'text-rose-700' : 'text-amber-700'}`}>
                        {isOut ? 'OUT' : 'LOW'}
                      </div>
                    </div>
                  </Link>
                );
              })
            ) : (
              <div className="px-6 py-12 text-center">
                <div className="mx-auto h-16 w-16 rounded-3xl bg-emerald-100 flex items-center justify-center">
                  <Package className="h-7 w-7 text-emerald-700" />
                </div>
                <h4 className="mt-4 text-lg font-extrabold text-slate-900">All stock healthy! 🎉</h4>
                <p className="mt-1 text-xs text-slate-500">Koi product low stock par nahi</p>
              </div>
            )}
          </div>
        </div>

        {/* Top Products */}
        <div className="rounded-3xl bg-white border border-slate-200 shadow-sm">
          <div className="px-6 py-5 border-b border-slate-100 flex items-center justify-between">
            <div className="flex items-center gap-2">
              <Award className="h-5 w-5 text-amber-500" />
              <div>
                <h3 className="text-lg font-bold text-slate-900">Top Products</h3>
                <p className="text-sm text-slate-500">Best sellers this month</p>
              </div>
            </div>
            <Link to="/profit-report" className="text-brand-700 text-sm font-bold inline-flex items-center gap-1">
              Reports <ArrowRight className="h-4 w-4" />
            </Link>
          </div>
          <div className="divide-y divide-slate-100">
            {data?.topProducts?.length ? (
              data.topProducts.slice(0, 5).map((p, idx) => {
                const rankColors = ['bg-amber-500', 'bg-slate-400', 'bg-orange-600', 'bg-violet-500', 'bg-blue-500'];
                return (
                  <div key={p.productId} className="px-6 py-3 flex items-center justify-between gap-3 hover:bg-slate-50 transition">
                    <div className="flex items-center gap-3 min-w-0">
                      <div className={`h-8 w-8 rounded-lg ${rankColors[idx]} text-white font-extrabold flex items-center justify-center text-sm shrink-0`}>
                        {idx < 3 ? <Crown className="h-4 w-4" /> : idx + 1}
                      </div>
                      <div className="h-10 w-10 rounded-xl bg-slate-100 overflow-hidden flex items-center justify-center shrink-0">
                        {p.product?.images?.[0]?.url ? (
                          <img src={p.product.images[0].url} alt="" className="h-full w-full object-cover" />
                        ) : (
                          <Package className="h-4 w-4 text-slate-400" />
                        )}
                      </div>
                      <div className="min-w-0">
                        <div className="font-bold text-slate-900 truncate text-sm">{p.product?.name || 'Unknown'}</div>
                        <div className="text-xs text-slate-500">{p.quantitySold} {p.product?.unit} • {p.orderCount} orders</div>
                      </div>
                    </div>
                    <div className="text-right shrink-0">
                      <div className="font-extrabold text-emerald-700 text-sm">{formatPKR(p.revenue)}</div>
                    </div>
                  </div>
                );
              })
            ) : (
              <div className="px-6 py-12 text-center text-sm text-slate-500">
                Abhi koi sales data nahi
              </div>
            )}
          </div>
        </div>
      </section>

      {/* ═══ PAYMENT BREAKDOWN + RECENT SALES ═══ */}
      <section className="grid lg:grid-cols-[1fr_1.5fr] gap-6">
        {/* Payment Methods Pie */}
        <div className="rounded-3xl bg-white border border-slate-200 shadow-sm p-6">
          <div className="flex items-center justify-between mb-4">
            <div>
              <h3 className="text-lg font-bold text-slate-900">Payment Methods</h3>
              <p className="text-sm text-slate-500">This month breakdown</p>
            </div>
          </div>
          {data?.paymentBreakdown?.length ? (
            <div className="h-[260px]">
              <ResponsiveContainer width="100%" height="100%">
                <PieChart>
                  <Pie
                    data={data.paymentBreakdown}
                    cx="50%"
                    cy="45%"
                    outerRadius={80}
                    innerRadius={40}
                    dataKey="total"
                    label={(entry: any) => {
                      const totalSum = data.paymentBreakdown.reduce((s, p) => s + p.total, 0);
                      const pct = totalSum > 0 ? ((entry.total / totalSum) * 100).toFixed(0) : '0';
                      return `${pct}%`;
                    }}
                    labelLine={false}
                  >
                    {data.paymentBreakdown.map((p) => (
                      <Cell key={p.method} fill={PAYMENT_COLORS[p.method] || '#64748b'} />
                    ))}
                  </Pie>
                  <Tooltip formatter={(value: any) => formatPKR(Number(value))} contentStyle={{ borderRadius: 12, border: '2px solid #e2e8f0' }} />
                  <Legend wrapperStyle={{ fontSize: 10, paddingTop: 12 }} iconType="circle" />
                </PieChart>
              </ResponsiveContainer>
            </div>
          ) : (
            <div className="h-[260px] flex items-center justify-center text-sm text-slate-500">
              No payment data yet
            </div>
          )}
        </div>

        {/* Recent Sales */}
        <div className="rounded-3xl bg-white border border-slate-200 shadow-sm">
          <div className="px-6 py-5 border-b border-slate-100 flex items-center justify-between">
            <div>
              <h3 className="text-lg font-bold text-slate-900">Recent Sales</h3>
              <p className="text-sm text-slate-500">Latest receipts</p>
            </div>
            <Link to="/sales" className="text-brand-700 text-sm font-bold inline-flex items-center gap-1">
              View all <ArrowRight className="h-4 w-4" />
            </Link>
          </div>
          <div className="divide-y divide-slate-100 max-h-[260px] overflow-y-auto">
            {data?.recentSales?.length ? (
              data.recentSales.slice(0, 6).map((sale) => {
                const PayIcon = PAYMENT_ICONS[sale.paymentMethod] || CreditCard;
                return (
                  <Link
                    key={sale.id}
                    to={`/sales/${sale.id}/receipt`}
                    className="px-6 py-3 flex items-center justify-between gap-3 hover:bg-slate-50 transition"
                  >
                    <div className="flex items-center gap-3 min-w-0">
                      <div className="h-9 w-9 rounded-xl bg-slate-100 flex items-center justify-center shrink-0">
                        <PayIcon className="h-4 w-4 text-slate-600" />
                      </div>
                      <div className="min-w-0">
                        <div className="font-bold text-slate-900 truncate font-mono text-xs">{sale.saleNumber}</div>
                        <div className="text-[11px] text-slate-500 truncate">
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
                );
              })
            ) : (
              <div className="px-6 py-12 text-center text-sm text-slate-500">
                Abhi koi sale nahi
              </div>
            )}
          </div>
        </div>
      </section>

      {/* ═══ RECENT PRODUCTS ═══ */}
      <section className="rounded-3xl bg-white border border-slate-200 shadow-sm">
        <div className="px-6 py-5 border-b border-slate-100 flex items-center justify-between">
          <div>
            <h3 className="text-lg font-bold text-slate-900">Recently Added Products</h3>
            <p className="text-sm text-slate-500">New items in your inventory</p>
          </div>
          <Link to="/products" className="text-brand-700 text-sm font-bold inline-flex items-center gap-1">
            All products <ArrowRight className="h-4 w-4" />
          </Link>
        </div>
        <div className="divide-y divide-slate-100">
          {data?.recentProducts?.length ? (
            data.recentProducts.map((item) => (
              <Link
                key={item.id}
                to={`/products/${item.id}/edit`}
                className="px-6 py-4 flex items-center justify-between gap-4 hover:bg-slate-50 transition"
              >
                <div className="min-w-0 flex items-center gap-3">
                  {item.images?.[0]?.url ? (
                    <img src={item.images[0].url} alt="" className="h-12 w-12 rounded-xl object-cover" />
                  ) : (
                    <div className="h-12 w-12 rounded-xl bg-slate-100 flex items-center justify-center">
                      <Package className="h-5 w-5 text-slate-400" />
                    </div>
                  )}
                  <div className="min-w-0">
                    <div className="font-bold text-slate-900 truncate">{item.name}</div>
                    <div className="text-xs text-slate-500 font-mono">SKU: {item.sku || '—'}</div>
                  </div>
                </div>
                <div className="text-right shrink-0">
                  <div className="font-extrabold text-slate-900">{formatPKR(item.price)}</div>
                  <div className="text-xs text-slate-500">Stock: {item.stock} {item.unit}</div>
                </div>
              </Link>
            ))
          ) : (
            <div className="px-6 py-12 text-center">
              <Package className="h-12 w-12 text-slate-300 mx-auto" />
              <h4 className="mt-4 text-lg font-bold text-slate-900">No products yet</h4>
              <Link to="/products/new" className="inline-block mt-4">
                <Button>
                  <Plus className="h-4 w-4" /> Add Product
                </Button>
              </Link>
            </div>
          )}
        </div>
      </section>
    </div>
  );
}

// ─── Helper Components ──────────────────────────────────────

function HeroKpiCard({ title, value, subtitle, icon: Icon, color, isHighlight, trend }: any) {
  return (
    <div className={`rounded-2xl border-2 p-5 shadow-sm hover:shadow-md transition ${
      isHighlight ? 'bg-gradient-to-br from-emerald-50 to-green-50 border-emerald-300' : 'bg-white border-slate-200'
    }`}>
      <div className="flex items-start justify-between gap-3">
        <div className="flex-1 min-w-0">
          <p className="text-xs uppercase tracking-wider font-bold text-slate-500">{title}</p>
          <h3 className="mt-2 text-2xl font-extrabold text-slate-900 truncate tabular-nums">{value}</h3>
          <p className="mt-1 text-xs text-slate-500 truncate">{subtitle}</p>
          {trend !== undefined && trend !== 0 && (
            <div className={`mt-1.5 inline-flex items-center gap-1 px-1.5 py-0.5 rounded-md text-[10px] font-extrabold ${
              trend >= 0 ? 'bg-emerald-100 text-emerald-700' : 'bg-rose-100 text-rose-700'
            }`}>
              {trend >= 0 ? <TrendingUp className="h-2.5 w-2.5" /> : <TrendingDown className="h-2.5 w-2.5" />}
              {formatPercent(trend)}
            </div>
          )}
        </div>
        <div className={`h-12 w-12 rounded-2xl bg-gradient-to-br ${color} text-white flex items-center justify-center shadow-lg shrink-0`}>
          <Icon className="h-5 w-5" />
        </div>
      </div>
    </div>
  );
}

function IndustryStatCard({ label, value, sub, icon: Icon, color }: any) {
  const colors: Record<string, string> = {
    emerald: 'bg-white border-emerald-300',
    green: 'bg-white border-green-300',
    violet: 'bg-white border-violet-300',
    amber: 'bg-white border-amber-300',
    blue: 'bg-white border-blue-300',
  };
  const iconColors: Record<string, string> = {
    emerald: 'bg-emerald-100 text-emerald-700',
    green: 'bg-green-100 text-green-700',
    violet: 'bg-violet-100 text-violet-700',
    amber: 'bg-amber-100 text-amber-700',
    blue: 'bg-blue-100 text-blue-700',
  };
  return (
    <div className={`rounded-2xl border-2 ${colors[color]} p-3 flex items-center gap-3`}>
      <div className={`h-10 w-10 rounded-xl ${iconColors[color]} flex items-center justify-center shrink-0`}>
        <Icon className="h-4 w-4" />
      </div>
      <div className="min-w-0">
        <div className="text-[10px] uppercase tracking-wider font-bold text-slate-500">{label}</div>
        <div className="text-lg font-extrabold text-slate-900 tabular-nums">{value}</div>
        <div className="text-[10px] text-slate-500 font-bold">{sub}</div>
      </div>
    </div>
  );
}

function PnLCard({ label, value, sub, color, isHighlight }: any) {
  const colors: Record<string, string> = {
    emerald: 'bg-emerald-50 border-emerald-200 text-emerald-900',
    rose: 'bg-rose-50 border-rose-200 text-rose-900',
    amber: 'bg-amber-50 border-amber-200 text-amber-900',
    brand: 'bg-gradient-to-br from-brand-600 to-emerald-700 text-white border-brand-700',
  };
  return (
    <div className={`rounded-2xl border-2 p-5 ${colors[color]} ${isHighlight ? 'shadow-lg' : ''}`}>
      <div className={`text-xs font-extrabold uppercase tracking-wider ${isHighlight ? 'opacity-90' : 'opacity-80'}`}>{label}</div>
      <div className="mt-2 text-2xl font-extrabold tabular-nums">{value}</div>
      <div className={`text-xs mt-1 ${isHighlight ? 'opacity-90' : 'opacity-70'}`}>{sub}</div>
    </div>
  );
}

function QuickStat({ title, value, icon: Icon, tone, link, alert }: any) {
  const tones: Record<string, string> = {
    blue: 'bg-blue-100 text-blue-700',
    violet: 'bg-violet-100 text-violet-700',
    pink: 'bg-pink-100 text-pink-700',
    amber: 'bg-amber-100 text-amber-700',
    orange: 'bg-orange-100 text-orange-700',
    emerald: 'bg-emerald-100 text-emerald-700',
    rose: 'bg-rose-100 text-rose-700',
  };
  return (
    <Link to={link} className="rounded-2xl bg-white border border-slate-200 p-4 shadow-sm hover:shadow-md transition block relative">
      {alert && value > 0 && (
        <span className="absolute -top-1 -right-1 h-3 w-3 rounded-full bg-rose-500 animate-pulse" />
      )}
      <div className="flex items-center justify-between">
        <div>
          <p className="text-xs text-slate-500 font-bold uppercase">{title}</p>
          <h3 className="mt-1 text-lg font-extrabold text-slate-900">{value}</h3>
        </div>
        <div className={`h-9 w-9 rounded-xl ${tones[tone]} flex items-center justify-center`}>
          <Icon className="h-4 w-4" />
        </div>
      </div>
    </Link>
  );
}
