import { useMemo } from 'react';
import { useQuery } from '@tanstack/react-query';
import { Link } from 'react-router-dom';
import {
  Layers, Scissors, Ruler, Package, TrendingUp, TrendingDown, Target,
  Award, ArrowRight, Plus, Clock, Users, DollarSign, RefreshCw,
  AlertTriangle, ShoppingCart, Wrench, Sparkles, BarChart3, FileText,
  Palette, Boxes, Store, Zap, Wallet, Activity, Eye, Crown, CheckCircle2,
} from 'lucide-react';
import {
  ResponsiveContainer, AreaChart, Area, XAxis, YAxis, Tooltip, CartesianGrid,
  BarChart, Bar, PieChart, Pie, Cell, Legend, RadialBarChart, RadialBar,
} from 'recharts';
import { dashboardApi } from '@modules/dashboard/api/dashboard.api';
import { formatPKR } from '@core/lib/format';
import { Button } from '@core/ui/Button';
import { SubscriptionBanner } from '@modules/dashboard/components/SubscriptionBanner';
import { EmailVerifyBanner } from '@core/components/auth/EmailVerifyBanner';
import { useCostHidden, PrivacyToggle } from '@core/ui/HiddenValue';

export default function CarpetDashboardV2() {
  const hideCost = useCostHidden();

  const { data, refetch, isRefetching } = useQuery({
    queryKey: ['dashboard-overview'],
    queryFn: () => dashboardApi.overview(),
    refetchInterval: 60_000,
  });

  const stats = data?.stats;
  const carpetStats = data?.carpetStats;
  const tenant = data?.tenant;

  const trendData = useMemo(() => (data?.salesTrend7Days ?? []).map((p) => {
    const d = new Date(p.date);
    const dayName = ['Sun', 'Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat'][d.getDay()];
    return { ...p, label: dayName };
  }), [data]);

  const hourlyData = useMemo(() => (data?.hourlySalesToday ?? [])
    .filter((h) => h.sales > 0 || (h.hour >= 8 && h.hour <= 22))
    .map((h) => ({
      ...h,
      label: h.hour === 0 ? '12A' : h.hour < 12 ? `${h.hour}A` : h.hour === 12 ? '12P' : `${h.hour - 12}P`,
    })), [data]);

  const growthVsYesterday = stats?.salesGrowthVsYesterday ?? 0;
  const growthVsLastMonth = stats?.salesGrowthVsLastMonth ?? 0;

  // ─── Derived today metrics (not in DashboardStats type) ───
  const salesToday = Number(stats?.salesToday ?? 0);
  const ordersToday = Number(stats?.ordersToday ?? 0);
  const netProfitToday = Number(stats?.netProfitToday ?? 0);
  const avgOrderValueToday = ordersToday > 0 ? salesToday / ordersToday : 0;
  const marginToday = salesToday > 0 ? (netProfitToday / salesToday) * 100 : 0;
  const sqftSoldToday = Number((stats as any)?.sqftSoldToday ?? (stats as any)?.qtySoldToday ?? 0);

  const paymentColors: Record<string, string> = {
    CASH: '#10b981', CARD: '#3b82f6', JAZZCASH: '#f97316',
    EASYPAISA: '#22c55e', BANK_TRANSFER: '#8b5cf6',
  };

  // Inventory health score (0-100)
  const inventoryScore = useMemo(() => {
    if (!carpetStats) return 0;
    const rolls = carpetStats.totalActiveRolls ?? 0;
    const low = carpetStats.lowStockRolls?.length ?? 0;
    if (rolls === 0) return 0;
    const healthyRolls = rolls - low;
    return Math.round((healthyRolls / rolls) * 100);
  }, [carpetStats]);

  return (
    <div className="space-y-4 sm:space-y-6 pb-8">
      <SubscriptionBanner />
      <EmailVerifyBanner />

      {/* ═══ HERO ═══ */}
      <section className="relative overflow-hidden rounded-2xl sm:rounded-3xl bg-gradient-to-br from-slate-950 via-emerald-900 to-teal-800 text-white p-4 sm:p-6 shadow-2xl">
        <div className="absolute -top-20 -right-20 h-64 w-64 rounded-full bg-emerald-400/20 blur-3xl" />
        <div className="absolute -bottom-20 -left-20 h-64 w-64 rounded-full bg-amber-400/15 blur-3xl" />

        <div className="relative flex flex-col sm:flex-row items-start justify-between gap-4">
          <div className="min-w-0">
            <div className="inline-flex items-center gap-2 rounded-full bg-white/15 backdrop-blur px-3 py-1 text-xs font-extrabold border border-white/20">
              <Layers className="h-3.5 w-3.5 text-amber-300" /> Carpet Dashboard
            </div>
            <h1 className="mt-3 text-2xl sm:text-3xl lg:text-4xl font-extrabold leading-tight">
              🧶 {tenant?.name || 'Carpet Store'}
            </h1>
            <p className="mt-2 text-xs sm:text-sm text-white/80 font-semibold">
              <strong className="text-emerald-300">{stats?.ordersToday ?? 0}</strong> sales •{' '}
              <strong className="text-amber-300">{carpetStats?.totalActiveRolls ?? 0}</strong> rolls •{' '}
              <strong className="text-emerald-300">{formatPKR(stats?.salesToday ?? 0)}</strong> today
            </p>
          </div>

          <div className="flex items-center gap-2 flex-wrap">
            <PrivacyToggle compact />
            <button
              onClick={() => refetch()}
              disabled={isRefetching}
              className="inline-flex items-center gap-2 rounded-xl bg-white/10 hover:bg-white/20 px-3 py-2.5 text-sm font-bold backdrop-blur disabled:opacity-50 border border-white/20 active:scale-95 transition"
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

        {/* Hero KPIs — Today focus */}
        <div className="relative mt-5 grid grid-cols-2 sm:grid-cols-4 gap-2 sm:gap-3">
          <HeroTile
            icon={DollarSign}
            label="Aaj ki Bikri"
            value={formatPKR(stats?.salesToday ?? 0)}
            trend={growthVsYesterday}
            tone="emerald"
          />
          <HeroTile
            icon={ShoppingCart}
            label="Sales Count"
            value={String(stats?.ordersToday ?? 0)}
            sub={`Avg ${formatPKR(avgOrderValueToday)}`}
            tone="cyan"
          />
          <HeroTile
            icon={Ruler}
            label="Sqft Sold (Today)"
            value={sqftSoldToday.toFixed(0)}
            sub="Length + pieces"
            tone="violet"
          />
          <HeroTile
            icon={Target}
            label="Aaj ka Profit"
            value={hideCost ? '••••' : formatPKR(stats?.netProfitToday ?? 0)}
            sub={hideCost ? '' : `Margin ${marginToday.toFixed(1)}%`}
            tone="amber"
          />
        </div>
      </section>

      {/* ═══ QUICK ACTIONS ═══ */}
      <section className="grid grid-cols-3 sm:grid-cols-6 gap-2 sm:gap-3">
        <QuickAction to="/pos" icon={ShoppingCart} label="POS" tone="emerald" />
        <QuickAction to="/carpet-products/new" icon={Plus} label="Add Product" tone="teal" />
        <QuickAction to="/carpet-rolls" icon={Layers} label="Rolls" tone="cyan" />
        <QuickAction to="/carpet-cut-pieces" icon={Scissors} label="Cut Pieces" tone="violet" />
        <QuickAction to="/carpet-reports" icon={BarChart3} label="Reports" tone="blue" />
        <QuickAction to="/customers/khata" icon={FileText} label="Khata" tone="amber" />
      </section>

      {/* ═══ LOW STOCK ALERT ═══ */}
      {carpetStats?.lowStockRolls && carpetStats.lowStockRolls.length > 0 && (
        <section className="rounded-2xl sm:rounded-3xl bg-gradient-to-br from-amber-50 via-orange-50 to-red-50 border-2 border-amber-300 p-4 sm:p-5 shadow-sm">
          <div className="flex items-center gap-2 mb-3 flex-wrap justify-between">
            <div className="flex items-center gap-2">
              <div className="h-10 w-10 rounded-2xl bg-amber-500 text-white flex items-center justify-center shadow-md animate-pulse">
                <AlertTriangle className="h-5 w-5" />
              </div>
              <div>
                <h3 className="font-extrabold text-amber-900 text-sm sm:text-base">🚨 Low Stock Alert</h3>
                <p className="text-xs text-amber-800 font-bold">{carpetStats.lowStockRolls.length} rolls chhote reh gaye (&lt; 10 ft baqi)</p>
              </div>
            </div>
            <Link to="/carpet-rolls?filter=low" className="inline-flex items-center gap-1 px-3 py-1.5 rounded-xl bg-amber-600 hover:bg-amber-700 text-white text-xs font-extrabold active:scale-95 transition">
              Sab dekhein <ArrowRight className="h-3 w-3" />
            </Link>
          </div>
          <div className="flex flex-wrap gap-2">
            {carpetStats.lowStockRolls.slice(0, 12).map((r: any) => (
              <Link
                key={r.id}
                to={`/carpet-rolls/${r.id}`}
                className="inline-flex items-center gap-1.5 px-2.5 py-1.5 rounded-xl bg-white border-2 border-amber-200 hover:bg-amber-50 hover:border-amber-400 text-xs font-bold text-amber-900 transition active:scale-95"
              >
                <span className="font-mono font-extrabold">{r.rollNumber}</span>
                <span className="text-amber-600">•</span>
                <span className="text-amber-700 tabular-nums">{r.remainingLengthFt.toFixed(1)}ft</span>
                <span className="text-slate-500">•</span>
                <span className="text-slate-600 tabular-nums">{r.remainingSqft.toFixed(0)} sqft</span>
              </Link>
            ))}
          </div>
        </section>
      )}

      {/* ═══ INVENTORY HEALTH + STOCK VALUE ═══ */}
      <section className="grid lg:grid-cols-[1fr_2fr] gap-4 sm:gap-6">
        {/* Health score */}
        <div className="rounded-2xl sm:rounded-3xl bg-white border-2 border-slate-200 shadow-sm p-4 sm:p-6">
          <div className="flex items-center gap-2 mb-3">
            <div className="h-10 w-10 rounded-2xl bg-gradient-to-br from-emerald-500 to-teal-700 text-white flex items-center justify-center shadow-md">
              <Activity className="h-5 w-5" />
            </div>
            <div>
              <h3 className="font-extrabold text-slate-900 text-sm sm:text-base">Inventory Health</h3>
              <p className="text-xs text-slate-500 font-bold">Stock condition</p>
            </div>
          </div>
          <div className="h-[180px] relative">
            <ResponsiveContainer width="100%" height="100%">
              <RadialBarChart innerRadius="65%" outerRadius="100%" data={[{ value: inventoryScore, fill: inventoryScore > 70 ? '#10b981' : inventoryScore > 40 ? '#f59e0b' : '#ef4444' }]} startAngle={90} endAngle={-270}>
                <RadialBar background={{ fill: '#e2e8f0' }} dataKey="value" cornerRadius={999} />
              </RadialBarChart>
            </ResponsiveContainer>
            <div className="absolute inset-0 flex flex-col items-center justify-center">
              <div className={`text-4xl font-extrabold tabular-nums ${inventoryScore > 70 ? 'text-emerald-700' : inventoryScore > 40 ? 'text-amber-700' : 'text-rose-700'}`}>
                {inventoryScore}%
              </div>
              <div className="text-[10px] uppercase font-extrabold text-slate-600 tracking-wider">
                {inventoryScore > 70 ? 'Excellent' : inventoryScore > 40 ? 'Warning' : 'Critical'}
              </div>
            </div>
          </div>
          <div className="mt-2 grid grid-cols-2 gap-2 text-center">
            <div className="rounded-lg bg-emerald-50 border border-emerald-200 py-1.5">
              <div className="text-[10px] font-extrabold text-emerald-700 uppercase">Healthy</div>
              <div className="text-sm font-extrabold text-emerald-900 tabular-nums">
                {(carpetStats?.totalActiveRolls ?? 0) - (carpetStats?.lowStockRolls?.length ?? 0)}
              </div>
            </div>
            <div className="rounded-lg bg-amber-50 border border-amber-200 py-1.5">
              <div className="text-[10px] font-extrabold text-amber-700 uppercase">Low</div>
              <div className="text-sm font-extrabold text-amber-900 tabular-nums">{carpetStats?.lowStockRolls?.length ?? 0}</div>
            </div>
          </div>
        </div>

        {/* Stock value breakdown */}
        <div className="rounded-2xl sm:rounded-3xl bg-gradient-to-br from-emerald-50 via-green-50 to-teal-50 border-2 border-emerald-200 p-4 sm:p-6">
          <div className="flex items-center justify-between gap-2 mb-4 flex-wrap">
            <div className="flex items-center gap-2">
              <div className="h-10 w-10 rounded-2xl bg-emerald-600 text-white flex items-center justify-center shadow-lg shadow-emerald-500/30">
                <Boxes className="h-5 w-5" />
              </div>
              <div>
                <h3 className="text-base sm:text-lg font-extrabold text-emerald-900">Total Inventory Value</h3>
                <p className="text-xs text-emerald-700 font-bold">Rolls + Cut Pieces combined</p>
              </div>
            </div>
            <Link to="/carpet-rolls" className="text-xs font-extrabold text-emerald-700 hover:underline inline-flex items-center gap-1">
              Details <ArrowRight className="h-3 w-3" />
            </Link>
          </div>

          <div className="grid grid-cols-2 sm:grid-cols-4 gap-2 sm:gap-3">
            <InvCard icon={Layers} label="Active Rolls" value={String(carpetStats?.totalActiveRolls ?? 0)} sub={`${(carpetStats?.totalLengthFt ?? 0).toFixed(0)} ft`} tone="emerald" />
            <InvCard icon={Ruler} label="Available Sqft" value={(carpetStats?.totalSqft ?? 0).toFixed(0)} sub="For sale" tone="teal" />
            <InvCard icon={Scissors} label="Cut Pieces" value={String(carpetStats?.cutPiecesCount ?? 0)} sub={`${(carpetStats?.cutPiecesSqft ?? 0).toFixed(0)} sqft`} tone="violet" />
            <InvCard icon={DollarSign} label="Piece Value" value={hideCost ? '••••' : formatPKR(carpetStats?.cutPiecesValue ?? 0)} sub="Listed price" tone="amber" highlight />
          </div>

          {carpetStats?.recentRolls && carpetStats.recentRolls.length > 0 && (
            <div className="mt-4 rounded-2xl bg-white border-2 border-emerald-200 p-3">
              <div className="flex items-center gap-2 mb-2">
                <Sparkles className="h-4 w-4 text-emerald-600" />
                <h4 className="font-extrabold text-emerald-900 text-sm">Recently Added Rolls</h4>
              </div>
              <div className="flex flex-wrap gap-1.5">
                {carpetStats.recentRolls.slice(0, 8).map((r: any) => (
                  <Link
                    key={r.id}
                    to={`/carpet-rolls/${r.id}`}
                    className="inline-flex items-center gap-1.5 px-2 py-1 rounded-lg bg-emerald-50 border border-emerald-200 hover:bg-emerald-100 hover:border-emerald-400 text-xs font-bold text-emerald-800 transition active:scale-95"
                  >
                    {r.variantColorHex && (
                      <span className="h-2.5 w-2.5 rounded-full border border-white shadow-sm" style={{ backgroundColor: r.variantColorHex }} />
                    )}
                    <span className="font-mono">{r.rollNumber}</span>
                    <span>•</span>
                    <span className="tabular-nums">{r.remainingSqft.toFixed(0)} sqft</span>
                    <span className="text-emerald-600">•</span>
                    <span className="tabular-nums">{formatPKR(r.salePricePerSqft)}/sqft</span>
                  </Link>
                ))}
              </div>
            </div>
          )}
        </div>
      </section>

      {/* ═══ TRENDS ═══ */}
      <section className="grid lg:grid-cols-[1.5fr_1fr] gap-4 sm:gap-6">
        <div className="rounded-2xl sm:rounded-3xl bg-white border-2 border-slate-200 shadow-sm p-4 sm:p-6">
          <div className="flex items-center justify-between mb-4">
            <div>
              <h3 className="text-base sm:text-lg font-extrabold text-slate-900">7-Din Ki Sales Trend</h3>
              <p className="text-xs text-slate-500 font-bold">Revenue + profit ka graph</p>
            </div>
            <div className="h-10 w-10 rounded-xl bg-gradient-to-br from-emerald-500 to-teal-700 text-white flex items-center justify-center shadow-md">
              <BarChart3 className="h-5 w-5" />
            </div>
          </div>
          {trendData.length >= 2 ? (
            <div className="h-[220px] sm:h-[280px]">
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
                  <XAxis dataKey="label" stroke="#64748b" fontSize={11} />
                  <YAxis stroke="#64748b" fontSize={10} tickFormatter={(v) => `${(v / 1000).toFixed(0)}k`} />
                  <Tooltip formatter={(value: any) => formatPKR(Number(value))} contentStyle={{ borderRadius: 12, border: '2px solid #e2e8f0' }} />
                  <Legend wrapperStyle={{ fontSize: 11 }} />
                  <Area type="monotone" dataKey="sales" name="Sales" stroke="#10b981" fill="url(#cSales)" strokeWidth={2.5} />
                  {!hideCost && <Area type="monotone" dataKey="profit" name="Profit" stroke="#8b5cf6" fill="url(#cProfit)" strokeWidth={2} />}
                </AreaChart>
              </ResponsiveContainer>
            </div>
          ) : (
            <div className="h-[220px] sm:h-[280px] flex flex-col items-center justify-center gap-2">
              <BarChart3 className="h-10 w-10 text-slate-300" />
              <p className="text-sm font-extrabold text-slate-500">Aur sales data chahiye</p>
            </div>
          )}
        </div>

        <div className="rounded-2xl sm:rounded-3xl bg-white border-2 border-slate-200 shadow-sm p-4 sm:p-6">
          <div className="flex items-center justify-between mb-4">
            <div>
              <h3 className="text-base sm:text-lg font-extrabold text-slate-900">Aaj Ke Peak Hours</h3>
              <p className="text-xs text-slate-500 font-bold">Hourly sales pattern</p>
            </div>
            <div className="h-10 w-10 rounded-xl bg-gradient-to-br from-violet-500 to-purple-700 text-white flex items-center justify-center shadow-md">
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
                  <Bar dataKey="sales" fill="#10b981" radius={[6, 6, 0, 0]} />
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
                <h3 className="text-base sm:text-lg font-extrabold text-slate-900">📊 P&L (Is Mahine)</h3>
                <p className="text-xs text-slate-500 font-bold">Monthly performance breakdown</p>
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
              <PnLCell label="Revenue" value={formatPKR(stats?.salesMonth ?? 0)} sub={`${stats?.ordersMonth ?? 0} sales`} tone="emerald" />
              <PnLCell label="Roll Cost" value={formatPKR(stats?.cogsMonth ?? 0)} sub="Material" tone="rose" />
              <PnLCell label="Expenses" value={formatPKR(stats?.expensesMonth ?? 0)} sub="Rent, labor" tone="amber" />
              <PnLCell label="Net Profit" value={formatPKR(stats?.netProfitMonth ?? 0)} sub="Bottom line" tone="blue" highlight />
            </div>
          </div>

          <div className="rounded-2xl sm:rounded-3xl bg-white border-2 border-slate-200 shadow-sm p-4 sm:p-6">
            <div className="flex items-center justify-between mb-4">
              <div>
                <h3 className="text-base sm:text-lg font-extrabold text-slate-900">💳 Payment Split</h3>
                <p className="text-xs text-slate-500 font-bold">Is mahina</p>
              </div>
              <div className="h-10 w-10 rounded-xl bg-gradient-to-br from-pink-500 to-rose-700 text-white flex items-center justify-center shadow-md">
                <Wallet className="h-5 w-5" />
              </div>
            </div>
            {data?.paymentBreakdown && data.paymentBreakdown.length > 0 ? (
              <div className="h-[220px]">
                <ResponsiveContainer width="100%" height="100%">
                  <PieChart>
                    <Pie
                      data={data.paymentBreakdown}
                      cx="50%" cy="45%" outerRadius={70} innerRadius={40}
                      dataKey="total" labelLine={false}
                      label={(entry: any) => {
                        const sum = data.paymentBreakdown.reduce((s: number, p: any) => s + p.total, 0);
                        return sum > 0 ? `${((entry.total / sum) * 100).toFixed(0)}%` : '';
                      }}
                    >
                      {data.paymentBreakdown.map((p: any) => (
                        <Cell key={p.method} fill={paymentColors[p.method] || '#64748b'} />
                      ))}
                    </Pie>
                    <Tooltip formatter={(v: any) => formatPKR(Number(v))} contentStyle={{ borderRadius: 12 }} />
                    <Legend wrapperStyle={{ fontSize: 10, paddingTop: 8 }} iconType="circle" />
                  </PieChart>
                </ResponsiveContainer>
              </div>
            ) : (
              <div className="h-[220px] flex flex-col items-center justify-center gap-2">
                <Wallet className="h-10 w-10 text-slate-300" />
                <p className="text-sm font-extrabold text-slate-500">No payment data</p>
              </div>
            )}
          </div>
        </section>
      )}

      {/* ═══ TOP DESIGNS + QUICK STATS ═══ */}
      <section className="grid lg:grid-cols-2 gap-4 sm:gap-6">
        <div className="rounded-2xl sm:rounded-3xl bg-white border-2 border-slate-200 shadow-sm overflow-hidden">
          <div className="px-4 sm:px-6 py-4 border-b-2 border-slate-100 flex items-center gap-2 bg-gradient-to-r from-amber-50 to-orange-50">
            <div className="h-10 w-10 rounded-xl bg-gradient-to-br from-amber-500 to-orange-600 text-white flex items-center justify-center shadow-md">
              <Award className="h-5 w-5" />
            </div>
            <div>
              <h3 className="text-base sm:text-lg font-extrabold text-slate-900">🏆 Top Selling Designs</h3>
              <p className="text-xs text-slate-500 font-bold">Best sellers this month</p>
            </div>
          </div>
          <div className="divide-y-2 divide-slate-100 max-h-[400px] overflow-y-auto">
            {data?.topProducts?.length ? (
              data.topProducts.slice(0, 8).map((p, idx) => {
                const rankColors = ['bg-amber-500', 'bg-slate-400', 'bg-orange-600', 'bg-violet-500', 'bg-blue-500', 'bg-slate-500', 'bg-slate-500', 'bg-slate-500'];
                return (
                  <Link key={p.productId} to={`/carpet-products/${p.productId}`}
                    className="px-4 sm:px-6 py-3 flex items-center justify-between gap-3 hover:bg-slate-50/60 transition active:scale-[0.99]">
                    <div className="flex items-center gap-3 min-w-0 flex-1">
                      <div className={`h-9 w-9 rounded-lg ${rankColors[idx]} text-white font-extrabold flex items-center justify-center text-sm shrink-0 shadow`}>
                        {idx < 3 ? <Crown className="h-4 w-4 fill-white" /> : idx + 1}
                      </div>
                      <div className="h-10 w-10 rounded-lg bg-emerald-100 overflow-hidden flex items-center justify-center shrink-0 border border-emerald-200">
                        {p.product?.images?.[0]?.url ? (
                          <img src={p.product.images[0].url} alt="" loading="lazy" className="h-full w-full object-cover" />
                        ) : (
                          <Layers className="h-4 w-4 text-emerald-400" />
                        )}
                      </div>
                      <div className="min-w-0 flex-1">
                        <div className="font-extrabold text-slate-900 truncate text-sm">{p.product?.name}</div>
                        <div className="text-[10px] text-slate-500 font-bold">
                          {p.quantitySold.toFixed(0)} {p.product?.unit} • {p.orderCount} orders
                        </div>
                      </div>
                    </div>
                    <div className="font-extrabold text-emerald-700 text-sm tabular-nums shrink-0">{formatPKR(p.revenue)}</div>
                  </Link>
                );
              })
            ) : (
              <div className="px-6 py-12 text-center">
                <Award className="h-10 w-10 text-slate-300 mx-auto mb-2" />
                <p className="font-extrabold text-slate-500 text-sm">Koi sale nahi hui abhi</p>
              </div>
            )}
          </div>
        </div>

        <div className="rounded-2xl sm:rounded-3xl bg-white border-2 border-slate-200 shadow-sm overflow-hidden">
          <div className="px-4 sm:px-6 py-4 border-b-2 border-slate-100 flex items-center gap-2 bg-gradient-to-r from-violet-50 to-purple-50">
            <div className="h-10 w-10 rounded-xl bg-gradient-to-br from-violet-500 to-purple-700 text-white flex items-center justify-center shadow-md">
              <Zap className="h-5 w-5" />
            </div>
            <div>
              <h3 className="text-base sm:text-lg font-extrabold text-slate-900">Quick Stats</h3>
              <p className="text-xs text-slate-500 font-bold">Aap ki dukaan ka snapshot</p>
            </div>
          </div>
          <div className="p-3 sm:p-4 grid grid-cols-2 gap-2 sm:gap-3">
            <QuickStat icon={Package} label="Products" value={stats?.totalProducts ?? 0} tone="emerald" link="/products" />
            <QuickStat icon={Users} label="Customers" value={stats?.totalCustomers ?? 0} tone="pink" link="/customers" />
            <QuickStat icon={Wrench} label="Suppliers" value={stats?.totalSuppliers ?? 0} tone="orange" link="/suppliers" />
            <QuickStat icon={AlertTriangle} label="Low Stock" value={stats?.lowStockCount ?? 0} tone="amber" link="/low-stock" alert />
            <QuickStat icon={Palette} label="Cut Pieces" value={carpetStats?.cutPiecesCount ?? 0} tone="violet" link="/carpet-cut-pieces" />
            <QuickStat icon={Store} label="Sales Today" value={stats?.ordersToday ?? 0} tone="cyan" link="/sales" />
          </div>
        </div>
      </section>
    </div>
  );
}

/* ══════════ Sub-components ══════════ */

function HeroTile({ icon: Icon, label, value, sub, trend, tone }: any) {
  const tones: Record<string, string> = {
    emerald: 'from-emerald-400/30 to-emerald-600/20 border-emerald-300/40',
    cyan: 'from-cyan-400/30 to-cyan-600/20 border-cyan-300/40',
    violet: 'from-violet-400/30 to-violet-600/20 border-violet-300/40',
    amber: 'from-amber-400/30 to-amber-600/20 border-amber-300/40',
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
    emerald: 'from-emerald-500 to-green-700',
    teal: 'from-teal-500 to-cyan-700',
    cyan: 'from-cyan-500 to-blue-700',
    violet: 'from-violet-500 to-purple-700',
    blue: 'from-blue-500 to-indigo-700',
    amber: 'from-amber-500 to-orange-700',
  };
  return (
    <Link
      to={to}
      className="group rounded-2xl bg-white border-2 border-slate-200 hover:border-emerald-300 hover:shadow-lg hover:-translate-y-0.5 transition-all p-3 sm:p-4 text-center active:scale-95"
    >
      <div className={`h-10 w-10 sm:h-12 sm:w-12 rounded-2xl bg-gradient-to-br ${tones[tone]} text-white flex items-center justify-center shadow-md mx-auto mb-2 group-hover:scale-110 transition-transform`}>
        <Icon className="h-5 w-5 sm:h-6 sm:w-6" />
      </div>
      <div className="text-xs sm:text-sm font-extrabold text-slate-900">{label}</div>
    </Link>
  );
}

function InvCard({ icon: Icon, label, value, sub, tone, highlight }: any) {
  const tones: Record<string, string> = {
    emerald: 'from-emerald-500 to-green-700 border-emerald-200',
    teal: 'from-teal-500 to-cyan-700 border-teal-200',
    violet: 'from-violet-500 to-purple-700 border-violet-200',
    amber: 'from-amber-500 to-orange-700 border-amber-200',
  };
  const parts = tones[tone].split(' ');
  return (
    <div className={[
      'rounded-2xl bg-white border-2 p-3 shadow-sm',
      parts[2],
      highlight ? 'ring-2 ring-amber-200' : '',
    ].join(' ')}>
      <div className={`h-9 w-9 rounded-xl bg-gradient-to-br ${parts[0]} ${parts[1]} text-white flex items-center justify-center shadow mb-2`}>
        <Icon className="h-4 w-4" />
      </div>
      <div className="text-[10px] uppercase tracking-wider font-extrabold text-slate-600">{label}</div>
      <div className="text-lg sm:text-xl font-extrabold text-slate-900 tabular-nums mt-0.5 truncate">{value}</div>
      <div className="text-[10px] font-bold text-slate-500 mt-0.5 truncate">{sub}</div>
    </div>
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
      highlight ? 'bg-gradient-to-br from-blue-50 to-cyan-50 border-blue-300 ring-2 ring-blue-100' : 'bg-slate-50 border-slate-200',
    ].join(' ')}>
      <div className="text-[10px] uppercase tracking-wider font-extrabold text-slate-600">{label}</div>
      <div className={`text-lg sm:text-xl font-extrabold tabular-nums mt-1 ${tones[tone]}`}>{value}</div>
      <div className="text-[10px] text-slate-500 font-bold mt-0.5">{sub}</div>
    </div>
  );
}

function QuickStat({ icon: Icon, label, value, tone, link, alert }: any) {
  const tones: Record<string, string> = {
    emerald: 'from-emerald-500 to-green-700',
    pink: 'from-pink-500 to-rose-700',
    orange: 'from-orange-500 to-red-700',
    amber: 'from-amber-500 to-orange-700',
    violet: 'from-violet-500 to-purple-700',
    cyan: 'from-cyan-500 to-teal-700',
  };
  return (
    <Link
      to={link}
      className={[
        'rounded-xl bg-white border-2 hover:shadow-md hover:-translate-y-0.5 transition-all p-2.5 sm:p-3 flex items-center gap-2.5 active:scale-95',
        alert && value > 0 ? 'border-amber-300 bg-amber-50/50' : 'border-slate-200',
      ].join(' ')}
    >
      <div className={`h-9 w-9 rounded-xl bg-gradient-to-br ${tones[tone]} text-white flex items-center justify-center shadow shrink-0`}>
        <Icon className="h-4 w-4" />
      </div>
      <div className="min-w-0 flex-1">
        <div className="text-[10px] uppercase font-extrabold text-slate-500 tracking-wider truncate">{label}</div>
        <div className="text-base sm:text-lg font-extrabold text-slate-900 tabular-nums truncate">{value}</div>
      </div>
    </Link>
  );
}
