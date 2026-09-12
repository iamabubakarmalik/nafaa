// src/industries/electronics/pages/ElectronicsDashboardPage.tsx
import { useMemo, useState } from 'react';
import { useQuery } from '@tanstack/react-query';
import { Link } from 'react-router-dom';
import {
  Cpu, TrendingUp, TrendingDown, Target, Package, Shield, Sparkles,
  Barcode, Award, RefreshCw, ArrowRight, AlertTriangle, ChevronRight,
  Zap, Layers, Users, BarChart3, ShoppingCart, Plus,
  CheckCircle2, Clock, Activity, Star, PackageX, Upload,
  DollarSign, Wallet, Receipt, Crown, Hourglass, Flame, Rocket,
  PiggyBank, CreditCard, Banknote, Smartphone, Building2, BookOpen,
  ShoppingBag, Tag, Boxes, Wrench, Store,
} from 'lucide-react';
import {
  ResponsiveContainer, AreaChart, Area, BarChart, Bar,
  XAxis, YAxis, Tooltip, CartesianGrid, PieChart, Pie, Cell, Legend,
} from 'recharts';
import { dashboardApi } from '@modules/dashboard/api/dashboard.api';
import { electronicsDashboardApi } from '../api/dashboard.api';
import { warrantyClaimsApi } from '../api/warranty-claims.api';
import { serialTrackingApi } from '../api/serial-tracking.api';
import { formatPKR } from '@core/lib/format';
import { Button } from '@core/ui/Button';
import { SubscriptionBanner } from '@modules/dashboard/components/SubscriptionBanner';
import { EmailVerifyBanner } from '@core/components/auth/EmailVerifyBanner';
import { PrivacyToggle, useCostHidden } from '@core/ui/HiddenValue';
import { useAuthStore } from '@core/stores/auth.store';

/* ═════════════════════════════════════════════════════════════
   🔌 NAFAA ELECTRONICS DASHBOARD — FULL BEST (Retail-grade v2)
   ─────────────────────────────────────────────────────────────
   ✨ Dark + light mode perfect • 📱 mobile → 4K responsive
   📊 7/30-day trend • P&L • payment split • category donut
   🔢 Serial/IMEI stats • 🛡️ warranty claims • 🎖️ top brands
   🔐 PIN-aware cost/profit hiding • 🚀 quick actions grid
   ═════════════════════════════════════════════════════════════ */

const PAYMENT_COLORS: Record<string, string> = {
  CASH: '#10b981',
  CARD: '#3b82f6',
  JAZZCASH: '#f97316',
  EASYPAISA: '#22c55e',
  BANK_TRANSFER: '#8b5cf6',
  CREDIT: '#f43f5e',
};
const PAYMENT_ICONS: Record<string, any> = {
  CASH: Banknote,
  CARD: CreditCard,
  JAZZCASH: Smartphone,
  EASYPAISA: Zap,
  BANK_TRANSFER: Building2,
  CREDIT: BookOpen,
};
const CATEGORY_PALETTE = ['#3b82f6', '#8b5cf6', '#f59e0b', '#10b981', '#ec4899', '#06b6d4', '#f97316'];

const formatPercent = (n: number) => `${n > 0 ? '+' : ''}${n.toFixed(1)}%`;
const formatDate = (v: string) =>
  new Intl.DateTimeFormat('en-PK', { dateStyle: 'medium', timeStyle: 'short' }).format(new Date(v));

type Range = '7d' | '30d';

export default function ElectronicsDashboardPage() {
  const hideCost = useCostHidden();
  const shopName = useAuthStore((s) => s.user?.assignedShop?.name);
  const userName = useAuthStore((s) => s.user?.fullName?.split(' ')[0] ?? 'Boss');
  const [range, setRange] = useState<Range>('7d');

  /* ─── Data queries ─────────────────────────────────────── */
  // Shared core: stats, trends, payments, recent sales, low stock
  const { data: core, refetch, isRefetching } = useQuery({
    queryKey: ['dashboard-overview'],
    queryFn: () => dashboardApi.overview(),
    refetchInterval: 60_000,
  });

  // Electronics-specific: serials, inventory, category split, brands, top products
  const { data: overview } = useQuery({
    queryKey: ['electronics-dashboard-overview'],
    queryFn: () => electronicsDashboardApi.overview(),
    refetchInterval: 60_000,
  });

  const { data: warrantySummary } = useQuery({
    queryKey: ['warranty-claims-summary'],
    queryFn: () => warrantyClaimsApi.summary(),
    refetchInterval: 5 * 60_000,
  });

  const { data: recentSerials = [] } = useQuery({
    queryKey: ['recent-serials'],
    queryFn: () => serialTrackingApi.list({ status: 'IN_STOCK' }),
    refetchInterval: 60_000,
  });

  /* ─── Safe getters ─────────────────────────────────────── */
  const s = (core?.stats ?? {}) as any;
  const today = overview?.today ?? { revenue: s.salesToday ?? 0, profit: s.netProfitToday ?? 0, orders: s.ordersToday ?? 0, itemsSold: s.itemsSoldToday ?? 0 };
  const week = overview?.week ?? { revenue: 0, profit: 0, orders: 0 };
  const month = overview?.month ?? { revenue: 0, profit: 0, orders: 0 };
  const inventory = overview?.inventory ?? { totalProducts: 0, totalStock: 0, lowStock: 0, outOfStock: 0, stockValue: 0 };
  const serials = overview?.serials ?? { total: 0, inStock: 0, sold: 0, warrantyActive: 0 };
  const salesByCategory = overview?.salesByCategory ?? [];
  const topProducts = overview?.topProducts ?? core?.topProducts ?? [];
  const topBrands = overview?.topBrands ?? [];

  const growthYest = s.salesGrowthVsYesterday ?? 0;
  const growthMonth = s.salesGrowthVsLastMonth ?? 0;
  const lowStockCount = inventory.lowStock || s.lowStockCount || 0;
  const outOfStockCount = inventory.outOfStock || s.outOfStockCount || 0;
  const totalUdhaar = s.totalUdhaar ?? 0;

  /* ─── Chart data ───────────────────────────────────────── */
  const trend7 = useMemo(() =>
    (core?.salesTrend7Days ?? overview?.dailyTrend7Days ?? []).map((p: any) => {
      const d = new Date(p.date);
      return { label: ['Sun', 'Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat'][d.getDay()], sales: p.sales ?? p.revenue ?? 0, profit: p.profit ?? 0 };
    }), [core, overview]);

  const trend30 = useMemo(() =>
    (core?.salesTrend30Days ?? []).map((p: any) => {
      const d = new Date(p.date);
      return { label: `${d.getDate()}/${d.getMonth() + 1}`, sales: p.sales ?? p.revenue ?? 0, profit: p.profit ?? 0 };
    }), [core]);

  const chartData = range === '30d' ? trend30 : trend7;

  const paymentData = useMemo(() =>
    (core?.paymentBreakdown ?? []).map((p: any) => ({
      name: p.paymentMethod || p.method,
      value: p._sum?.total ?? p.total ?? 0,
      color: PAYMENT_COLORS[p.paymentMethod || p.method] || '#64748b',
    })).filter((p: any) => p.value > 0), [core]);

  const totalPayments = paymentData.reduce((sum: number, p: any) => sum + p.value, 0);

  const marginPct = s.salesMonth && s.salesMonth > 0
    ? ((s.netProfitMonth ?? 0) / s.salesMonth) * 100
    : 0;

  /* Time-based greeting */
  const hour = new Date().getHours();
  const greeting =
    hour < 5 ? { text: 'Late Night Grind', emoji: '🌙' } :
    hour < 12 ? { text: 'Subah Bakhair', emoji: '☀️' } :
    hour < 17 ? { text: 'Dopahar Bakhair', emoji: '🌤️' } :
    hour < 20 ? { text: 'Shaam Bakhair', emoji: '🌆' } :
                { text: 'Raat Bakhair', emoji: '🌙' };

  return (
    <div className="space-y-4 sm:space-y-6 pb-8">
      <SubscriptionBanner />
      <EmailVerifyBanner />

      {/* ═══════════════════════════════════════════════════════
          HERO — greeting + KPIs + actions
          ═══════════════════════════════════════════════════════ */}
      <section className="relative overflow-hidden rounded-2xl sm:rounded-3xl bg-gradient-to-br from-slate-950 via-blue-900 to-cyan-700 dark:from-slate-950 dark:via-indigo-950 dark:to-cyan-900 text-white p-4 sm:p-6 shadow-2xl">
        <div className="absolute -top-32 -right-32 h-80 w-80 rounded-full bg-blue-400/30 blur-3xl pointer-events-none animate-pulse" />
        <div className="absolute -bottom-32 -left-32 h-80 w-80 rounded-full bg-cyan-400/20 blur-3xl pointer-events-none" />
        <div className="absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 h-40 w-40 rounded-full bg-amber-400/10 blur-3xl pointer-events-none" />

        <div className="relative flex flex-col sm:flex-row items-start justify-between gap-4">
          <div className="min-w-0 flex-1">
            <div className="inline-flex items-center gap-2 rounded-full bg-white/15 backdrop-blur-md px-3 py-1 text-[11px] font-extrabold border border-white/25 uppercase tracking-widest shadow-lg">
              <Cpu className="h-3.5 w-3.5 text-amber-300" /> Electronics Dashboard
              {shopName && (
                <>
                  <span className="opacity-40">•</span>
                  <span className="text-cyan-200">🏪 {shopName}</span>
                </>
              )}
            </div>
            <h1 className="mt-3 text-2xl sm:text-3xl lg:text-4xl font-extrabold leading-tight">
              <span className="opacity-90">{greeting.text}, </span>
              <span className="bg-gradient-to-r from-amber-200 to-white bg-clip-text text-transparent">
                {userName}
              </span>{' '}
              {greeting.emoji}
            </h1>
            <p className="mt-1.5 text-xs sm:text-sm text-white/90 font-semibold">
              <span className="opacity-70">Aaj: </span>
              <strong className="text-emerald-300 text-base">{formatPKR(today.revenue)}</strong>
              <span className="opacity-50 mx-2">•</span>
              <span className="text-cyan-200">{today.orders} orders</span>
              <span className="opacity-50 mx-2">•</span>
              <span className="text-amber-200">{today.itemsSold} items bike</span>
            </p>
          </div>

          <div className="flex items-center gap-2 flex-wrap shrink-0">
            <PrivacyToggle compact />
            <button
              onClick={() => refetch()}
              disabled={isRefetching}
              className="inline-flex items-center gap-2 rounded-xl bg-white/10 hover:bg-white/20 px-3 py-2.5 text-sm font-extrabold backdrop-blur-md disabled:opacity-50 border border-white/20 transition-all hover:scale-105"
            >
              <RefreshCw className={`h-4 w-4 ${isRefetching ? 'animate-spin' : ''}`} />
              <span className="hidden sm:inline">Refresh</span>
            </button>
            <Link to="/pos">
              <Button className="bg-white text-slate-900 hover:bg-slate-100 font-extrabold shadow-2xl shadow-black/20 hover:scale-105 transition">
                <ShoppingCart className="h-4 w-4" />
                <span className="hidden sm:inline">Open POS</span>
                <span className="sm:hidden">POS</span>
              </Button>
            </Link>
          </div>
        </div>

        {/* Hero KPI tiles */}
        <div className="relative mt-5 grid grid-cols-2 lg:grid-cols-4 gap-2 sm:gap-3">
          <HeroTile
            icon={TrendingUp}
            label="Aaj Ki Sales"
            value={formatPKR(today.revenue)}
            trend={growthYest}
            tone="emerald"
          />
          <HeroTile
            icon={Target}
            label="Aaj Ka Profit"
            value={hideCost ? '••••••' : formatPKR(today.profit)}
            sub={hideCost ? '🔒 PIN se dekho' : 'Net (after cost)'}
            tone="blue"
          />
          <HeroTile
            icon={AlertTriangle}
            label="Kam Stock"
            value={lowStockCount}
            sub={`${outOfStockCount} khatam`}
            tone="amber"
            urgent={lowStockCount > 0}
          />
          <HeroTile
            icon={Barcode}
            label="Serials Tracked"
            value={serials.total}
            sub={`${serials.inStock} in stock • ${serials.warrantyActive} warranty`}
            tone="violet"
          />
        </div>
      </section>

      {/* ═══════════════════════════════════════════════════════
          ALERTS — sirf jab actually alerts hain
          ═══════════════════════════════════════════════════════ */}
      {(outOfStockCount > 0 || lowStockCount > 0 || (warrantySummary?.pending ?? 0) > 0 || (s.pendingTransfers ?? 0) > 0) && (
        <section className="rounded-2xl sm:rounded-3xl bg-gradient-to-br from-amber-50 via-orange-50 to-rose-50 dark:from-amber-950/50 dark:via-orange-950/40 dark:to-rose-950/50 border-2 border-amber-300 dark:border-amber-700 p-4 sm:p-5 shadow-lg">
          <div className="flex items-center gap-2.5 mb-3">
            <div className="h-10 w-10 rounded-2xl bg-gradient-to-br from-amber-500 to-orange-600 text-white flex items-center justify-center shadow-lg shadow-amber-500/40">
              <Flame className="h-5 w-5" />
            </div>
            <div>
              <h3 className="font-extrabold text-amber-900 dark:text-amber-100">Zaroori Alerts 🔥</h3>
              <p className="text-xs text-amber-800 dark:text-amber-300 font-bold">Foran attention chahiye</p>
            </div>
          </div>
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-2 sm:gap-3">
            {outOfStockCount > 0 && (
              <AlertCard to="/electronics-products?filter=out" icon={PackageX}
                title={`${outOfStockCount} Khatam`} desc="Restock karein" tone="rose" />
            )}
            {lowStockCount > 0 && (
              <AlertCard to="/electronics-products?filter=low" icon={AlertTriangle}
                title={`${lowStockCount} Kam Stock`} desc="Reorder ka waqt" tone="amber" />
            )}
            {(warrantySummary?.pending ?? 0) > 0 && (
              <AlertCard to="/electronics/warranty-claims" icon={Shield}
                title={`${warrantySummary?.pending} Warranty Claims`} desc="Abhi khule hue hain" tone="blue" />
            )}
            {(s.pendingTransfers ?? 0) > 0 && (
              <AlertCard to="/transfers" icon={ChevronRight}
                title={`${s.pendingTransfers} Transfers`} desc="Incoming stock" tone="violet" />
            )}
          </div>
        </section>
      )}

      {/* ═══════════════════════════════════════════════════════
          MAIN CHARTS — Sales trend + Category split
          ═══════════════════════════════════════════════════════ */}
      <section className="grid lg:grid-cols-[1.5fr_1fr] gap-4 sm:gap-6">
        <Card>
          <CardHeader
            icon={BarChart3}
            title="Sales Trend"
            subtitle={range === '30d' ? '30 din ka data' : '7 din ka data'}
            tone="sky"
            right={
              <div className="inline-flex rounded-xl bg-slate-100 dark:bg-slate-800 p-1 text-[11px] font-extrabold">
                {(['7d', '30d'] as Range[]).map((r) => (
                  <button
                    key={r}
                    onClick={() => setRange(r)}
                    className={[
                      'px-3 py-1.5 rounded-lg transition-all',
                      range === r
                        ? 'bg-white dark:bg-slate-900 text-blue-700 dark:text-blue-300 shadow-md'
                        : 'text-slate-600 dark:text-slate-400 hover:text-slate-900 dark:hover:text-slate-200',
                    ].join(' ')}
                  >
                    {r === '7d' ? '7 Din' : '30 Din'}
                  </button>
                ))}
              </div>
            }
          />
          {chartData.length >= 2 ? (
            <div className="h-[240px] sm:h-[300px]">
              <ResponsiveContainer width="100%" height="100%">
                <AreaChart data={chartData} margin={{ top: 10, right: 8, left: -10, bottom: 0 }}>
                  <defs>
                    <linearGradient id="elSales" x1="0" y1="0" x2="0" y2="1">
                      <stop offset="0%" stopColor="#3b82f6" stopOpacity={0.6} />
                      <stop offset="100%" stopColor="#3b82f6" stopOpacity={0} />
                    </linearGradient>
                    <linearGradient id="elProfit" x1="0" y1="0" x2="0" y2="1">
                      <stop offset="0%" stopColor="#10b981" stopOpacity={0.5} />
                      <stop offset="100%" stopColor="#10b981" stopOpacity={0} />
                    </linearGradient>
                  </defs>
                  <CartesianGrid strokeDasharray="3 3" className="stroke-slate-200 dark:stroke-slate-700" opacity={0.4} />
                  <XAxis dataKey="label" className="fill-slate-500 dark:fill-slate-400" fontSize={11} tickLine={false} axisLine={false} />
                  <YAxis className="fill-slate-500 dark:fill-slate-400" fontSize={10} tickFormatter={(v) => `${(v / 1000).toFixed(0)}k`} tickLine={false} axisLine={false} />
                  <Tooltip
                    formatter={(v: any) => formatPKR(Number(v))}
                    contentStyle={{
                      borderRadius: 12,
                      border: '1px solid rgba(148,163,184,0.2)',
                      backgroundColor: 'rgba(15,23,42,0.95)',
                      color: '#f8fafc',
                      boxShadow: '0 20px 40px rgba(0,0,0,0.3)',
                    }}
                    labelStyle={{ color: '#94a3b8', fontWeight: 700 }}
                    cursor={{ stroke: '#3b82f6', strokeWidth: 1, strokeDasharray: '4 4' }}
                  />
                  <Area type="monotone" dataKey="sales" name="Sales" stroke="#3b82f6" fill="url(#elSales)" strokeWidth={2.5} />
                  {!hideCost && <Area type="monotone" dataKey="profit" name="Profit" stroke="#10b981" fill="url(#elProfit)" strokeWidth={2} />}
                </AreaChart>
              </ResponsiveContainer>
            </div>
          ) : (
            <EmptyChart icon={BarChart3} message="Zyada sales data chahiye" />
          )}
          <ChartLegend items={[
            { color: '#3b82f6', label: 'Sales' },
            ...(!hideCost ? [{ color: '#10b981', label: 'Profit' }] : []),
          ]} />
        </Card>

        <Card>
          <CardHeader icon={Layers} title="Sales by Category" subtitle="Is mahine ka split" tone="violet" />
          {salesByCategory.length > 0 ? (
            <>
              <div className="h-[200px]">
                <ResponsiveContainer width="100%" height="100%">
                  <PieChart>
                    <Pie
                      data={salesByCategory}
                      cx="50%" cy="50%" outerRadius={80} innerRadius={48}
                      dataKey="revenue" nameKey="category" labelLine={false} paddingAngle={3}
                    >
                      {salesByCategory.map((_: any, idx: number) => (
                        <Cell key={idx} fill={CATEGORY_PALETTE[idx % CATEGORY_PALETTE.length]} stroke="none" />
                      ))}
                    </Pie>
                    <Tooltip
                      formatter={(v: any) => formatPKR(Number(v))}
                      contentStyle={{
                        borderRadius: 12,
                        border: '1px solid rgba(148,163,184,0.2)',
                        backgroundColor: 'rgba(15,23,42,0.95)',
                        color: '#f8fafc',
                      }}
                      labelStyle={{ color: '#94a3b8', fontWeight: 700 }}
                    />
                  </PieChart>
                </ResponsiveContainer>
              </div>
              <div className="mt-2 space-y-1.5 max-h-[120px] overflow-y-auto">
                {salesByCategory.map((c: any, idx: number) => {
                  const totalCat = salesByCategory.reduce((sum: number, x: any) => sum + x.revenue, 0);
                  const pct = totalCat > 0 ? (c.revenue / totalCat) * 100 : 0;
                  return (
                    <div key={c.category} className="flex items-center gap-2 text-xs">
                      <span className="h-2.5 w-2.5 rounded-full shrink-0 shadow-sm" style={{ backgroundColor: CATEGORY_PALETTE[idx % CATEGORY_PALETTE.length] }} />
                      <span className="font-extrabold text-slate-700 dark:text-slate-200 min-w-0 flex-1 truncate">{c.category}</span>
                      <span className="text-slate-500 dark:text-slate-400 font-bold tabular-nums">{pct.toFixed(0)}%</span>
                      <span className="font-extrabold text-slate-900 dark:text-white tabular-nums shrink-0">{formatPKR(c.revenue)}</span>
                    </div>
                  );
                })}
              </div>
            </>
          ) : (
            <EmptyChart icon={Layers} message="Category data nahi" />
          )}
        </Card>
      </section>

      {/* ═══════════════════════════════════════════════════════
          P&L + PAYMENT SPLIT (hidden if cost hidden)
          ═══════════════════════════════════════════════════════ */}
      {!hideCost && (
        <section className="grid lg:grid-cols-[1.5fr_1fr] gap-4 sm:gap-6">
          <Card>
            <CardHeader
              icon={PiggyBank}
              title="Profit & Loss (Mahina)"
              subtitle="Monthly performance breakdown"
              tone="emerald"
              right={
                growthMonth !== 0 && (
                  <div className={[
                    'inline-flex items-center gap-1.5 px-3 py-1.5 rounded-xl text-sm font-extrabold shadow-sm',
                    growthMonth >= 0
                      ? 'bg-emerald-100 dark:bg-emerald-500/20 text-emerald-700 dark:text-emerald-300 border border-emerald-200 dark:border-emerald-500/30'
                      : 'bg-rose-100 dark:bg-rose-500/20 text-rose-700 dark:text-rose-300 border border-rose-200 dark:border-rose-500/30',
                  ].join(' ')}>
                    {growthMonth >= 0 ? <TrendingUp className="h-3.5 w-3.5" /> : <TrendingDown className="h-3.5 w-3.5" />}
                    {formatPercent(growthMonth)}
                  </div>
                )
              }
            />
            <div className="grid grid-cols-2 sm:grid-cols-4 gap-2 sm:gap-3">
              <PnLCell label="Revenue" value={formatPKR(s.salesMonth ?? month.revenue)} sub={`${s.ordersMonth ?? month.orders} orders`} tone="emerald" icon={TrendingUp} />
              <PnLCell label="COGS" value={formatPKR(s.cogsMonth ?? 0)} sub="Purchase cost" tone="rose" icon={TrendingDown} />
              <PnLCell label="Expenses" value={formatPKR(s.expensesMonth ?? 0)} sub="Rent, bills" tone="amber" icon={Wallet} />
              <PnLCell label="Net Profit" value={formatPKR(s.netProfitMonth ?? month.profit)} sub={`Margin ${marginPct.toFixed(1)}%`} tone="blue" icon={Target} highlight />
            </div>
          </Card>

          <Card>
            <CardHeader icon={DollarSign} title="Payment Methods" subtitle="Is mahine ka split" tone="pink" />
            {paymentData.length > 0 ? (
              <>
                <div className="h-[160px]">
                  <ResponsiveContainer width="100%" height="100%">
                    <PieChart>
                      <Pie
                        data={paymentData}
                        cx="50%" cy="50%" outerRadius={70} innerRadius={42}
                        dataKey="value" labelLine={false} paddingAngle={3}
                      >
                        {paymentData.map((p: any) => <Cell key={p.name} fill={p.color} stroke="none" />)}
                      </Pie>
                      <Tooltip
                        formatter={(v: any) => formatPKR(Number(v))}
                        contentStyle={{
                          borderRadius: 12,
                          border: '1px solid rgba(148,163,184,0.2)',
                          backgroundColor: 'rgba(15,23,42,0.95)',
                          color: '#f8fafc',
                        }}
                        labelStyle={{ color: '#94a3b8', fontWeight: 700 }}
                      />
                    </PieChart>
                  </ResponsiveContainer>
                </div>
                <div className="mt-2 space-y-1.5">
                  {paymentData.map((p: any) => {
                    const Icon = PAYMENT_ICONS[p.name] || CreditCard;
                    const pct = totalPayments > 0 ? (p.value / totalPayments) * 100 : 0;
                    return (
                      <div key={p.name} className="flex items-center gap-2 text-xs">
                        <div className="h-7 w-7 rounded-lg flex items-center justify-center text-white shrink-0 shadow-sm" style={{ backgroundColor: p.color }}>
                          <Icon className="h-3.5 w-3.5" />
                        </div>
                        <span className="font-extrabold text-slate-700 dark:text-slate-200 min-w-0 flex-1 truncate">{p.name}</span>
                        <span className="text-slate-500 dark:text-slate-400 font-bold tabular-nums">{pct.toFixed(0)}%</span>
                        <span className="font-extrabold text-slate-900 dark:text-white tabular-nums shrink-0">{formatPKR(p.value)}</span>
                      </div>
                    );
                  })}
                </div>
              </>
            ) : (
              <EmptyChart icon={DollarSign} message="Payment data nahi" />
            )}
          </Card>
        </section>
      )}

      {/* ═══════════════════════════════════════════════════════
          QUICK ACTIONS — electronics features ek jaga
          ═══════════════════════════════════════════════════════ */}
      <section>
        <div className="flex items-center gap-2.5 mb-3">
          <div className="h-10 w-10 rounded-2xl bg-gradient-to-br from-blue-500 to-cyan-700 text-white flex items-center justify-center shadow-lg shadow-blue-500/40">
            <Rocket className="h-5 w-5" />
          </div>
          <div>
            <h3 className="text-base sm:text-lg font-extrabold text-slate-900 dark:text-white">Quick Actions 🚀</h3>
            <p className="text-xs text-slate-500 dark:text-slate-400 font-bold">Sab electronics features ek jaga</p>
          </div>
        </div>
        <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-4 xl:grid-cols-6 gap-2 sm:gap-3">
          <OpsCard to="/pos" icon={ShoppingCart} title="POS Counter" desc="Sale karo" tone="blue" primary />
          <OpsCard to="/electronics-products/new" icon={Plus} title="Add Product" desc="Naya product" tone="emerald" />
          <OpsCard to="/electronics/serials" icon={Barcode} title="Serials / IMEI" desc={`${serials.inStock} in stock`} tone="amber" />
          <OpsCard to="/electronics/warranty-claims" icon={Shield} title="Warranty" desc={`${warrantySummary?.pending ?? 0} khule`} tone="rose" />
          <OpsCard to="/brands" icon={Award} title="Brands" desc={`${topBrands.length || 0} brands`} tone="violet" />
          <OpsCard to="/electronics/bundles" icon={Layers} title="Bundles" desc="Combo deals" tone="pink" />
          <OpsCard to="/products" icon={Package} title="Products" desc={`${inventory.totalProducts || 0} items`} tone="cyan" />
          <OpsCard to="/customers" icon={Users} title="Customers" desc={`${s.totalCustomers ?? 0} log`} tone="indigo" />
          <OpsCard to="/khata" icon={BookOpen} title="Khata / Udhaar" desc={formatPKR(totalUdhaar)} tone="orange" />
          <OpsCard to="/sales" icon={Receipt} title="Sales History" desc="Purani receipts" tone="teal" />
          <OpsCard to="/electronics/repairs" icon={Wrench} title="Repairs" desc="Repair tickets" tone="purple" />
          <OpsCard to="/reports/profit" icon={BarChart3} title="Reports" desc="Profit / stock" tone="sky" />
        </div>
      </section>

      {/* ═══════════════════════════════════════════════════════
          SERIAL + WARRANTY + PERIOD STATS
          ═══════════════════════════════════════════════════════ */}
      <section className="grid lg:grid-cols-3 gap-4 sm:gap-6">
        {/* Serial tracking */}
        <Card noPad>
          <div className="px-4 sm:px-6 py-4 border-b-2 border-slate-100 dark:border-slate-800 flex items-center gap-3 bg-gradient-to-r from-amber-50 to-orange-50 dark:from-amber-500/10 dark:to-orange-500/10">
            <div className="h-10 w-10 rounded-2xl bg-gradient-to-br from-amber-500 to-orange-600 text-white flex items-center justify-center shadow-lg shadow-amber-500/40">
              <Barcode className="h-5 w-5" />
            </div>
            <div className="flex-1 min-w-0">
              <h3 className="text-base font-extrabold text-slate-900 dark:text-white">Serial / IMEI 🔢</h3>
              <p className="text-xs text-slate-600 dark:text-slate-400 font-bold">Har piece unique tracked</p>
            </div>
          </div>
          <div className="p-4 grid grid-cols-2 gap-2">
            <StatBox label="Total Serials" value={serials.total} icon={Barcode} tone="amber" />
            <StatBox label="In Stock" value={serials.inStock} icon={Package} tone="emerald" />
            <StatBox label="Sold" value={serials.sold} icon={CheckCircle2} tone="blue" />
            <StatBox label="Warranty Active" value={serials.warrantyActive} icon={Shield} tone="violet" />
          </div>
          <div className="px-4 pb-4">
            <Link to="/electronics/serials" className="w-full inline-flex items-center justify-center gap-2 h-11 rounded-xl bg-gradient-to-r from-amber-600 to-orange-700 hover:from-amber-700 hover:to-orange-700 text-white font-extrabold text-sm shadow-md transition active:scale-[0.98]">
              Serial Lookup <ArrowRight className="h-4 w-4" />
            </Link>
          </div>
        </Card>

        {/* Warranty claims */}
        <Card noPad>
          <div className="px-4 sm:px-6 py-4 border-b-2 border-slate-100 dark:border-slate-800 flex items-center gap-3 bg-gradient-to-r from-rose-50 to-red-50 dark:from-rose-500/10 dark:to-red-500/10">
            <div className="h-10 w-10 rounded-2xl bg-gradient-to-br from-rose-500 to-red-700 text-white flex items-center justify-center shadow-lg shadow-rose-500/40">
              <Shield className="h-5 w-5" />
            </div>
            <div className="flex-1 min-w-0">
              <h3 className="text-base font-extrabold text-slate-900 dark:text-white">Warranty Claims 🛡️</h3>
              <p className="text-xs text-slate-600 dark:text-slate-400 font-bold">Customer service</p>
            </div>
          </div>
          <div className="p-4 grid grid-cols-2 gap-2">
            <StatBox label="Kul Claims" value={warrantySummary?.total ?? 0} icon={Shield} tone="blue" />
            <StatBox label="Khule Hue" value={warrantySummary?.pending ?? 0} icon={Clock} tone="amber" />
            <StatBox label="Hal Ho Gaye" value={warrantySummary?.resolved ?? 0} icon={CheckCircle2} tone="emerald" />
            <StatBox label="Is Mahine" value={warrantySummary?.thisMonth ?? 0} icon={Activity} tone="violet" />
          </div>
          <div className="px-4 pb-4">
            <Link to="/electronics/warranty-claims" className="w-full inline-flex items-center justify-center gap-2 h-11 rounded-xl bg-gradient-to-r from-rose-600 to-red-700 hover:from-rose-700 hover:to-red-700 text-white font-extrabold text-sm shadow-md transition active:scale-[0.98]">
              Manage Claims <ArrowRight className="h-4 w-4" />
            </Link>
          </div>
        </Card>

        {/* Period comparison */}
        <Card noPad>
          <div className="px-4 sm:px-6 py-4 border-b-2 border-slate-100 dark:border-slate-800 flex items-center gap-3 bg-gradient-to-r from-blue-50 to-cyan-50 dark:from-blue-500/10 dark:to-cyan-500/10">
            <div className="h-10 w-10 rounded-2xl bg-gradient-to-br from-blue-500 to-cyan-700 text-white flex items-center justify-center shadow-lg shadow-blue-500/40">
              <TrendingUp className="h-5 w-5" />
            </div>
            <div className="flex-1 min-w-0">
              <h3 className="text-base font-extrabold text-slate-900 dark:text-white">Period Compare 📊</h3>
              <p className="text-xs text-slate-600 dark:text-slate-400 font-bold">Aaj / hafta / mahina</p>
            </div>
          </div>
          <div className="p-4 space-y-2">
            <PeriodRow label="Aaj" revenue={today.revenue} profit={today.profit} orders={today.orders} tone="emerald" hideCost={hideCost} />
            <PeriodRow label="Hafta" revenue={week.revenue} profit={week.profit} orders={week.orders} tone="blue" hideCost={hideCost} />
            <PeriodRow label="Mahina" revenue={month.revenue} profit={month.profit} orders={month.orders} tone="violet" hideCost={hideCost} />
          </div>
        </Card>
      </section>

      {/* ═══════════════════════════════════════════════════════
          KPI STAT GRID (compact)
          ═══════════════════════════════════════════════════════ */}
      <section className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-6 gap-2 sm:gap-3">
        <StatCard title="Products" value={inventory.totalProducts || s.totalProducts || 0} icon={Package} tone="cyan" link="/products" />
        <StatCard title="Stock Pcs" value={inventory.totalStock} icon={Boxes} tone="blue" link="/stock-report" />
        <StatCard title="Stock Value" value={hideCost ? '••••' : formatPKR(inventory.stockValue)} icon={PiggyBank} tone="teal" link="/stock-report" />
        <StatCard title="Customers" value={s.totalCustomers ?? 0} icon={Users} tone="pink" link="/customers" />
        <StatCard title="Suppliers" value={s.totalSuppliers ?? 0} icon={ShoppingBag} tone="violet" link="/suppliers" />
        <StatCard title="Udhaar" value={formatPKR(totalUdhaar)} icon={Wallet} tone="orange" link="/khata" alert={totalUdhaar > 0} />
      </section>

      {/* ═══════════════════════════════════════════════════════
          TOP PRODUCTS + TOP BRANDS
          ═══════════════════════════════════════════════════════ */}
      <section className="grid lg:grid-cols-2 gap-4 sm:gap-6">
        <Card noPad>
          <div className="px-4 sm:px-6 py-4 border-b-2 border-slate-100 dark:border-slate-800 flex items-center gap-3 bg-gradient-to-r from-amber-50 to-orange-50 dark:from-amber-500/10 dark:to-orange-500/10">
            <div className="h-10 w-10 rounded-2xl bg-gradient-to-br from-amber-500 to-orange-600 text-white flex items-center justify-center shadow-lg shadow-amber-500/40">
              <Crown className="h-5 w-5" />
            </div>
            <div className="flex-1 min-w-0">
              <h3 className="text-base sm:text-lg font-extrabold text-slate-900 dark:text-white">Top Products 🏆</h3>
              <p className="text-xs text-slate-600 dark:text-slate-400 font-bold">Is mahine ke best sellers</p>
            </div>
            <Link to="/reports/profit" className="text-blue-700 dark:text-blue-400 text-xs font-extrabold inline-flex items-center gap-1 hover:underline">
              Reports <ArrowRight className="h-3.5 w-3.5" />
            </Link>
          </div>
          <div className="divide-y divide-slate-100 dark:divide-slate-800 max-h-[420px] overflow-y-auto">
            {topProducts.length ? (
              topProducts.slice(0, 8).map((p: any, idx: number) => {
                const rankGrads = [
                  'from-amber-400 via-yellow-500 to-amber-600',
                  'from-slate-300 via-slate-400 to-slate-500',
                  'from-orange-400 via-orange-500 to-orange-700',
                  'from-violet-400 to-violet-600',
                  'from-blue-400 to-blue-600',
                  'from-slate-400 to-slate-600',
                  'from-slate-400 to-slate-600',
                  'from-slate-400 to-slate-600',
                ];
                return (
                  <Link key={p.productId ?? idx} to={`/electronics-products/${p.productId}`} className="px-4 sm:px-6 py-3 flex items-center gap-3 hover:bg-slate-50 dark:hover:bg-slate-800/60 transition group">
                    <div className={`h-9 w-9 rounded-xl bg-gradient-to-br ${rankGrads[idx]} text-white font-extrabold flex items-center justify-center text-sm shrink-0 shadow-md`}>
                      {idx < 3 ? <Crown className="h-4 w-4" /> : idx + 1}
                    </div>
                    <div className="h-10 w-10 rounded-xl bg-slate-100 dark:bg-slate-800 overflow-hidden flex items-center justify-center shrink-0 border border-slate-200 dark:border-slate-700">
                      {p.product?.images?.[0]?.url ? (
                        <img src={p.product.images[0].url} alt="" loading="lazy" className="h-full w-full object-cover" />
                      ) : (
                        <Cpu className="h-4 w-4 text-slate-400 dark:text-slate-500" />
                      )}
                    </div>
                    <div className="min-w-0 flex-1">
                      <div className="font-extrabold text-slate-900 dark:text-white truncate text-sm group-hover:text-blue-700 dark:group-hover:text-blue-400">{p.product?.name || 'Unknown'}</div>
                      <div className="text-[11px] text-slate-600 dark:text-slate-400 font-bold">
                        {Number(p.quantitySold ?? 0).toFixed(0)} bike{(p as any).orderCount ? ` • ${(p as any).orderCount} orders` : ''}
                      </div>
                    </div>
                    <div className="text-right shrink-0">
                      <div className="font-extrabold text-emerald-700 dark:text-emerald-400 text-sm tabular-nums">{formatPKR(p.revenue ?? 0)}</div>
                    </div>
                  </Link>
                );
              })
            ) : (
              <EmptyList icon={Award} message="Abhi tak koi sale nahi" />
            )}
          </div>
        </Card>

        <Card noPad>
          <div className="px-4 sm:px-6 py-4 border-b-2 border-slate-100 dark:border-slate-800 flex items-center gap-3 bg-gradient-to-r from-violet-50 to-purple-50 dark:from-violet-500/10 dark:to-purple-500/10">
            <div className="h-10 w-10 rounded-2xl bg-gradient-to-br from-violet-500 to-purple-700 text-white flex items-center justify-center shadow-lg shadow-violet-500/40">
              <Award className="h-5 w-5" />
            </div>
            <div className="flex-1 min-w-0">
              <h3 className="text-base sm:text-lg font-extrabold text-slate-900 dark:text-white">Top Brands 🎖️</h3>
              <p className="text-xs text-slate-600 dark:text-slate-400 font-bold">Revenue ke hisaab se</p>
            </div>
            <Link to="/brands" className="text-blue-700 dark:text-blue-400 text-xs font-extrabold inline-flex items-center gap-1 hover:underline">
              All <ArrowRight className="h-3.5 w-3.5" />
            </Link>
          </div>
          <div className="divide-y divide-slate-100 dark:divide-slate-800 max-h-[420px] overflow-y-auto">
            {topBrands.length === 0 ? (
              <div className="px-6 py-12 text-center">
                <div className="h-14 w-14 rounded-2xl bg-violet-100 dark:bg-violet-500/20 flex items-center justify-center mx-auto mb-3 shadow-sm">
                  <Award className="h-6 w-6 text-violet-600 dark:text-violet-400" />
                </div>
                <h4 className="font-extrabold text-slate-900 dark:text-white text-sm">Koi brand nahi abhi</h4>
                <Link to="/brands" className="mt-2 inline-block text-blue-600 dark:text-blue-400 text-xs font-extrabold hover:underline">Brands add karo →</Link>
              </div>
            ) : (
              topBrands.slice(0, 8).map((b: any, i: number) => (
                <Link key={b.id} to="/brands" className="px-4 sm:px-6 py-3 flex items-center gap-3 hover:bg-slate-50 dark:hover:bg-slate-800/60 transition group">
                  <div className={`h-9 w-9 rounded-xl bg-gradient-to-br text-white font-extrabold flex items-center justify-center text-sm shrink-0 shadow-md ${
                    i === 0 ? 'from-amber-400 to-amber-600' : i === 1 ? 'from-slate-400 to-slate-500' : i === 2 ? 'from-orange-400 to-orange-600' : 'from-violet-400 to-violet-600'
                  }`}>
                    {i + 1}
                  </div>
                  {b.logoUrl ? (
                    <img src={b.logoUrl} alt="" loading="lazy" className="h-10 w-10 rounded-xl object-contain bg-white p-1 border border-slate-200 dark:border-slate-700 shrink-0" />
                  ) : (
                    <div className="h-10 w-10 rounded-xl bg-violet-100 dark:bg-violet-500/20 text-violet-700 dark:text-violet-300 flex items-center justify-center font-extrabold text-sm shrink-0">
                      {b.name?.charAt(0)}
                    </div>
                  )}
                  <div className="flex-1 min-w-0">
                    <div className="font-extrabold text-sm truncate text-slate-900 dark:text-white group-hover:text-violet-700 dark:group-hover:text-violet-400">{b.name}</div>
                    <div className="flex items-center gap-1.5 mt-0.5">
                      {b.authorizedDealer && (
                        <span className="px-1.5 py-0.5 rounded bg-emerald-100 dark:bg-emerald-500/20 text-emerald-700 dark:text-emerald-300 text-[9px] font-extrabold">AUTHORIZED</span>
                      )}
                      <span className="text-[10px] text-slate-500 dark:text-slate-400 font-bold">{b.productCount || 0} products</span>
                    </div>
                  </div>
                  <div className="text-right shrink-0">
                    <div className="font-extrabold text-violet-700 dark:text-violet-400 text-sm tabular-nums">{formatPKR(b.totalRevenue || 0)}</div>
                  </div>
                </Link>
              ))
            )}
          </div>
        </Card>
      </section>

      {/* ═══════════════════════════════════════════════════════
          RECENT SALES + RECENT SERIALS
          ═══════════════════════════════════════════════════════ */}
      <section className="grid lg:grid-cols-2 gap-4 sm:gap-6">
        <Card noPad>
          <div className="px-4 sm:px-6 py-4 border-b-2 border-slate-100 dark:border-slate-800 flex items-center gap-3">
            <div className="h-10 w-10 rounded-2xl bg-gradient-to-br from-emerald-500 to-teal-600 text-white flex items-center justify-center shadow-lg shadow-emerald-500/40">
              <Receipt className="h-5 w-5" />
            </div>
            <div className="flex-1 min-w-0">
              <h3 className="text-base sm:text-lg font-extrabold text-slate-900 dark:text-white">Recent Sales</h3>
              <p className="text-xs text-slate-600 dark:text-slate-400 font-bold">Latest receipts</p>
            </div>
            <Link to="/sales" className="text-blue-700 dark:text-blue-400 text-xs font-extrabold inline-flex items-center gap-1 hover:underline">
              All <ArrowRight className="h-3.5 w-3.5" />
            </Link>
          </div>
          <div className="divide-y divide-slate-100 dark:divide-slate-800 max-h-[380px] overflow-y-auto">
            {core?.recentSales?.length ? (
              core.recentSales.slice(0, 8).map((sale: any) => {
                const PayIcon = PAYMENT_ICONS[sale.paymentMethod] || CreditCard;
                const payColor = PAYMENT_COLORS[sale.paymentMethod] || '#64748b';
                return (
                  <Link key={sale.id} to={`/sales/${sale.id}/receipt`}
                    className="px-4 sm:px-6 py-3 flex items-center gap-3 hover:bg-slate-50 dark:hover:bg-slate-800/60 transition"
                  >
                    <div className="h-9 w-9 rounded-xl flex items-center justify-center shrink-0 text-white shadow-md" style={{ backgroundColor: payColor }}>
                      <PayIcon className="h-4 w-4" />
                    </div>
                    <div className="min-w-0 flex-1">
                      <div className="font-extrabold text-slate-900 dark:text-white truncate font-mono text-xs">{sale.saleNumber}</div>
                      <div className="text-[11px] text-slate-600 dark:text-slate-400 truncate font-bold">
                        {sale.customer?.name || 'Walk-in'} • {formatDate(sale.soldAt)}
                      </div>
                    </div>
                    <div className="text-right shrink-0">
                      <div className="font-extrabold text-emerald-700 dark:text-emerald-400 text-sm tabular-nums">{formatPKR(sale.total)}</div>
                      {sale.creditAmount > 0 && (
                        <div className="text-[10px] text-amber-700 dark:text-amber-400 font-extrabold">
                          Udhaar: {formatPKR(sale.creditAmount)}
                        </div>
                      )}
                    </div>
                  </Link>
                );
              })
            ) : (
              <EmptyList icon={Receipt} message="Abhi koi sale nahi" />
            )}
          </div>
        </Card>

        <Card noPad>
          <div className="px-4 sm:px-6 py-4 border-b-2 border-slate-100 dark:border-slate-800 flex items-center gap-3 bg-gradient-to-r from-blue-50 to-cyan-50 dark:from-blue-500/10 dark:to-cyan-500/10">
            <div className="h-10 w-10 rounded-2xl bg-gradient-to-br from-blue-500 to-cyan-700 text-white flex items-center justify-center shadow-lg shadow-blue-500/40">
              <Barcode className="h-5 w-5" />
            </div>
            <div className="flex-1 min-w-0">
              <h3 className="text-base sm:text-lg font-extrabold text-slate-900 dark:text-white">Recent Stock (Serial)</h3>
              <p className="text-xs text-slate-600 dark:text-slate-400 font-bold">Latest units in inventory</p>
            </div>
            <Link to="/electronics/serials" className="text-blue-700 dark:text-blue-400 text-xs font-extrabold inline-flex items-center gap-1 hover:underline">
              All <ArrowRight className="h-3.5 w-3.5" />
            </Link>
          </div>
          <div className="divide-y divide-slate-100 dark:divide-slate-800 max-h-[380px] overflow-y-auto">
            {recentSerials.length > 0 ? (
              recentSerials.slice(0, 8).map((sr: any) => (
                <Link key={sr.id} to="/electronics/serials" className="px-4 sm:px-6 py-3 flex items-center gap-3 hover:bg-slate-50 dark:hover:bg-slate-800/60 transition group">
                  <div className="h-10 w-10 rounded-xl bg-blue-100 dark:bg-blue-500/20 text-blue-700 dark:text-blue-300 flex items-center justify-center shrink-0">
                    <Barcode className="h-4 w-4" />
                  </div>
                  <div className="flex-1 min-w-0">
                    <div className="font-mono font-extrabold text-sm text-slate-900 dark:text-white truncate group-hover:text-blue-700 dark:group-hover:text-blue-400">{sr.serialNumber}</div>
                    <div className="text-[10px] text-slate-500 dark:text-slate-400 font-bold truncate">
                      {sr.product?.name} {sr.imei && `• IMEI: ${sr.imei}`}
                    </div>
                  </div>
                  <span className="px-2 py-0.5 rounded-full bg-emerald-100 dark:bg-emerald-500/20 text-emerald-700 dark:text-emerald-300 text-[9px] font-extrabold uppercase shrink-0">
                    In Stock
                  </span>
                </Link>
              ))
            ) : (
              <EmptyList icon={Barcode} message="Koi serial stock me nahi" />
            )}
          </div>
        </Card>
      </section>

      {/* ═══════════════════════════════════════════════════════
          LOW STOCK
          ═══════════════════════════════════════════════════════ */}
      <section>
        <Card noPad>
          <div className="px-4 sm:px-6 py-4 border-b-2 border-slate-100 dark:border-slate-800 flex items-center gap-3">
            <div className="h-10 w-10 rounded-2xl bg-gradient-to-br from-amber-500 to-orange-600 text-white flex items-center justify-center shadow-lg shadow-amber-500/40">
              <AlertTriangle className="h-5 w-5" />
            </div>
            <div className="flex-1 min-w-0">
              <h3 className="text-base sm:text-lg font-extrabold text-slate-900 dark:text-white">Low Stock</h3>
              <p className="text-xs text-slate-600 dark:text-slate-400 font-bold">{core?.lowStockProducts?.length ?? 0} items need attention</p>
            </div>
            <Link to="/electronics-products?filter=low" className="text-blue-700 dark:text-blue-400 text-xs font-extrabold inline-flex items-center gap-1 hover:underline">
              All <ArrowRight className="h-3.5 w-3.5" />
            </Link>
          </div>
          <div className="divide-y divide-slate-100 dark:divide-slate-800 max-h-[380px] overflow-y-auto">
            {core?.lowStockProducts?.length ? (
              core.lowStockProducts.slice(0, 8).map((p: any) => {
                const isOut = p.stock === 0;
                return (
                  <Link key={p.id} to={`/electronics-products/${p.id}`}
                    className="px-4 sm:px-6 py-3 flex items-center gap-3 hover:bg-slate-50 dark:hover:bg-slate-800/60 transition"
                  >
                    <div className={[
                      'h-10 w-10 rounded-xl overflow-hidden flex items-center justify-center shrink-0 border',
                      isOut ? 'bg-rose-100 dark:bg-rose-500/20 border-rose-200 dark:border-rose-500/30' : 'bg-amber-100 dark:bg-amber-500/20 border-amber-200 dark:border-amber-500/30',
                    ].join(' ')}>
                      {p.images?.[0]?.url ? (
                        <img src={p.images[0].url} alt="" loading="lazy" className="h-full w-full object-cover" />
                      ) : (
                        <Package className={`h-4 w-4 ${isOut ? 'text-rose-700 dark:text-rose-300' : 'text-amber-700 dark:text-amber-300'}`} />
                      )}
                    </div>
                    <div className="min-w-0 flex-1">
                      <div className="font-extrabold text-slate-900 dark:text-white truncate text-sm">{p.name}</div>
                      <div className="text-[11px] text-slate-600 dark:text-slate-400 font-bold">{formatPKR(p.price)}</div>
                    </div>
                    <div className="text-right shrink-0">
                      <div className={`text-lg font-extrabold tabular-nums ${isOut ? 'text-rose-700 dark:text-rose-400' : 'text-amber-700 dark:text-amber-400'}`}>
                        {p.stock}
                      </div>
                      <div className={`text-[9px] font-extrabold uppercase tracking-wider ${isOut ? 'text-rose-700 dark:text-rose-400' : 'text-amber-700 dark:text-amber-400'}`}>
                        {isOut ? 'OUT' : 'LOW'}
                      </div>
                    </div>
                  </Link>
                );
              })
            ) : (
              <div className="px-6 py-12 text-center">
                <div className="h-14 w-14 rounded-2xl bg-emerald-100 dark:bg-emerald-500/20 flex items-center justify-center mx-auto mb-3 shadow-sm">
                  <Package className="h-6 w-6 text-emerald-600 dark:text-emerald-400" />
                </div>
                <h4 className="font-extrabold text-slate-900 dark:text-white text-sm">All stock healthy! 🎉</h4>
                <p className="text-xs text-slate-600 dark:text-slate-400 mt-1 font-bold">Koi product low nahi</p>
              </div>
            )}
          </div>
        </Card>
      </section>
    </div>
  );
}

/* ═════════════════════════════════════════════════════════════
   REUSABLE SUB-COMPONENTS — dark mode perfect (retail system)
   ═════════════════════════════════════════════════════════════ */

function Card({ children, noPad = false }: any) {
  return (
    <div className={[
      'rounded-2xl sm:rounded-3xl bg-white dark:bg-slate-900/80 dark:backdrop-blur-sm',
      'border-2 border-slate-200 dark:border-slate-800',
      'shadow-sm dark:shadow-black/20 overflow-hidden',
      noPad ? '' : 'p-4 sm:p-5',
    ].join(' ')}>
      {children}
    </div>
  );
}

function CardHeader({ icon: Icon, title, subtitle, tone, right }: any) {
  const tones: Record<string, string> = {
    sky:     'from-sky-500 to-cyan-600',
    blue:    'from-blue-500 to-indigo-600',
    violet:  'from-violet-500 to-purple-600',
    emerald: 'from-emerald-500 to-teal-600',
    pink:    'from-pink-500 to-rose-600',
    amber:   'from-amber-500 to-orange-600',
  };
  return (
    <div className="flex items-center justify-between mb-4 gap-2 flex-wrap">
      <div className="flex items-center gap-2.5 min-w-0">
        <div className={`h-9 w-9 rounded-xl bg-gradient-to-br ${tones[tone] ?? tones.sky} text-white flex items-center justify-center shadow-md shrink-0`}>
          <Icon className="h-4 w-4" />
        </div>
        <div className="min-w-0">
          <h3 className="text-sm sm:text-base font-extrabold text-slate-900 dark:text-white leading-tight">{title}</h3>
          <p className="text-[11px] text-slate-600 dark:text-slate-400 font-bold">{subtitle}</p>
        </div>
      </div>
      {right}
    </div>
  );
}

function ChartLegend({ items }: { items: { color: string; label: string }[] }) {
  return (
    <div className="mt-2 flex items-center justify-center gap-4 flex-wrap">
      {items.map((it) => (
        <div key={it.label} className="inline-flex items-center gap-1.5 text-[11px] font-extrabold text-slate-600 dark:text-slate-300">
          <span className="h-2.5 w-2.5 rounded-full shadow-sm" style={{ backgroundColor: it.color }} />
          {it.label}
        </div>
      ))}
    </div>
  );
}

function HeroTile({ icon: Icon, label, value, sub, trend, tone, urgent }: any) {
  const tones: Record<string, string> = {
    emerald: 'from-emerald-400/40 to-emerald-600/25 border-emerald-300/50',
    blue:    'from-blue-400/40 to-blue-600/25 border-blue-300/50',
    amber:   'from-amber-400/40 to-amber-600/25 border-amber-300/50',
    violet:  'from-violet-400/40 to-violet-600/25 border-violet-300/50',
    rose:    'from-rose-400/40 to-rose-600/25 border-rose-300/50',
  };
  return (
    <div className={[
      'relative rounded-2xl bg-gradient-to-br backdrop-blur-md border p-3 shadow-lg',
      tones[tone],
      urgent ? 'ring-2 ring-amber-300/60' : '',
    ].join(' ')}>
      <div className="flex items-center gap-1.5 mb-1.5">
        <Icon className="h-3.5 w-3.5 text-white/90" />
        <div className="text-[10px] uppercase tracking-widest font-extrabold text-white/95">{label}</div>
      </div>
      <div className="text-lg sm:text-2xl font-extrabold text-white tabular-nums leading-tight truncate drop-shadow-sm">{value}</div>
      <div className="text-[11px] font-bold text-white/85 mt-1 truncate">
        {trend !== undefined ? (
          <span className={`inline-flex items-center gap-0.5 ${trend >= 0 ? 'text-emerald-200' : 'text-rose-200'}`}>
            {trend >= 0 ? <TrendingUp className="h-3 w-3" /> : <TrendingDown className="h-3 w-3" />}
            {formatPercent(trend)} vs kal
          </span>
        ) : sub}
      </div>
    </div>
  );
}

function AlertCard({ to, icon: Icon, title, desc, tone }: any) {
  const tones: Record<string, { grad: string; border: string; text: string; iconBg: string }> = {
    rose: {
      grad: 'from-rose-500 to-red-600',
      border: 'border-rose-200 dark:border-rose-500/40',
      text: 'text-rose-700 dark:text-rose-300',
      iconBg: 'shadow-rose-500/40',
    },
    amber: {
      grad: 'from-amber-500 to-orange-600',
      border: 'border-amber-200 dark:border-amber-500/40',
      text: 'text-amber-700 dark:text-amber-300',
      iconBg: 'shadow-amber-500/40',
    },
    blue: {
      grad: 'from-blue-500 to-indigo-600',
      border: 'border-blue-200 dark:border-blue-500/40',
      text: 'text-blue-700 dark:text-blue-300',
      iconBg: 'shadow-blue-500/40',
    },
    violet: {
      grad: 'from-violet-500 to-purple-600',
      border: 'border-violet-200 dark:border-violet-500/40',
      text: 'text-violet-700 dark:text-violet-300',
      iconBg: 'shadow-violet-500/40',
    },
  };
  const t = tones[tone] ?? tones.amber;
  return (
    <Link to={to} className={`rounded-2xl bg-white dark:bg-slate-900/60 border-2 ${t.border} p-3 flex items-center gap-3 hover:shadow-lg hover:-translate-y-0.5 transition-all group`}>
      <div className={`h-11 w-11 rounded-xl bg-gradient-to-br ${t.grad} text-white flex items-center justify-center shadow-lg ${t.iconBg} shrink-0`}>
        <Icon className="h-5 w-5" />
      </div>
      <div className="flex-1 min-w-0">
        <div className="font-extrabold text-slate-900 dark:text-white text-sm truncate">{title}</div>
        <div className={`text-xs font-bold ${t.text} truncate`}>{desc}</div>
      </div>
      <ArrowRight className="h-4 w-4 text-slate-400 dark:text-slate-500 shrink-0 group-hover:translate-x-1 transition-transform" />
    </Link>
  );
}

function PnLCell({ label, value, sub, tone, icon: Icon, highlight }: any) {
  const tones: Record<string, string> = {
    emerald: 'text-emerald-700 dark:text-emerald-400',
    rose:    'text-rose-700 dark:text-rose-400',
    amber:   'text-amber-700 dark:text-amber-400',
    blue:    'text-blue-700 dark:text-blue-400',
  };
  return (
    <div className={[
      'rounded-2xl p-3 border-2',
      highlight
        ? 'bg-gradient-to-br from-blue-50 to-cyan-50 dark:from-blue-500/15 dark:to-cyan-500/15 border-blue-300 dark:border-blue-500/40'
        : 'bg-slate-50 dark:bg-slate-800/60 border-slate-200 dark:border-slate-700',
    ].join(' ')}>
      <div className="flex items-center gap-1.5 mb-1">
        <Icon className={`h-3 w-3 ${tones[tone]}`} />
        <div className="text-[10px] uppercase tracking-wider font-extrabold text-slate-600 dark:text-slate-400">{label}</div>
      </div>
      <div className={`text-base sm:text-xl font-extrabold tabular-nums leading-tight ${tones[tone]}`}>{value}</div>
      <div className="text-[10px] text-slate-600 dark:text-slate-400 font-bold mt-1 truncate">{sub}</div>
    </div>
  );
}

function PeriodRow({ label, revenue, profit, orders, tone, hideCost }: any) {
  const tones: Record<string, string> = {
    emerald: 'bg-emerald-500',
    blue:    'bg-blue-500',
    violet:  'bg-violet-500',
  };
  return (
    <div className="rounded-2xl bg-slate-50 dark:bg-slate-800/60 border-2 border-slate-200 dark:border-slate-700 p-3">
      <div className="flex items-center gap-2 mb-1.5">
        <span className={`h-2 w-2 rounded-full ${tones[tone]}`} />
        <span className="text-[10px] uppercase tracking-wider font-extrabold text-slate-600 dark:text-slate-400">{label}</span>
        <span className="ml-auto text-[10px] font-extrabold text-slate-500 dark:text-slate-400 tabular-nums">{orders} orders</span>
      </div>
      <div className="flex items-end justify-between gap-2">
        <div className="text-base sm:text-lg font-extrabold text-slate-900 dark:text-white tabular-nums truncate">{formatPKR(revenue)}</div>
        <div className="text-xs font-extrabold text-emerald-700 dark:text-emerald-400 tabular-nums shrink-0">
          {hideCost ? '••••' : `+${formatPKR(profit)}`}
        </div>
      </div>
    </div>
  );
}

function OpsCard({ to, icon: Icon, title, desc, tone, primary }: any) {
  const tones: Record<string, string> = {
    sky:     'from-sky-500 to-cyan-600',
    blue:    'from-blue-500 to-indigo-600',
    emerald: 'from-emerald-500 to-green-600',
    cyan:    'from-cyan-500 to-teal-600',
    pink:    'from-pink-500 to-rose-600',
    rose:    'from-rose-500 to-red-600',
    violet:  'from-violet-500 to-purple-600',
    teal:    'from-teal-500 to-emerald-600',
    amber:   'from-amber-500 to-orange-500',
    orange:  'from-orange-500 to-red-500',
    indigo:  'from-indigo-500 to-blue-600',
    purple:  'from-purple-500 to-fuchsia-600',
  };
  return (
    <Link to={to} className={[
      'rounded-2xl border-2 p-3 sm:p-4 group hover:-translate-y-1 transition-all duration-200',
      primary
        ? 'bg-gradient-to-br from-blue-50 to-cyan-50 dark:from-blue-500/15 dark:to-cyan-500/15 border-blue-300 dark:border-blue-500/40 shadow-lg dark:shadow-blue-500/20'
        : 'bg-white dark:bg-slate-900/60 border-slate-200 dark:border-slate-800 hover:border-blue-300 dark:hover:border-blue-500/50 hover:shadow-lg dark:hover:shadow-blue-500/20',
    ].join(' ')}>
      <div className={`h-10 w-10 rounded-xl bg-gradient-to-br ${tones[tone] ?? tones.blue} text-white flex items-center justify-center shadow-md mb-2 group-hover:scale-110 group-hover:rotate-3 transition-transform duration-200`}>
        <Icon className="h-5 w-5" />
      </div>
      <div className="font-extrabold text-slate-900 dark:text-white text-xs sm:text-sm truncate">{title}</div>
      <div className="text-[10px] sm:text-[11px] text-slate-600 dark:text-slate-400 font-bold mt-0.5 truncate">{desc}</div>
    </Link>
  );
}

function StatBox({ label, value, icon: Icon, tone }: any) {
  const tones: Record<string, string> = {
    amber:   'bg-amber-50 dark:bg-amber-500/10 border-amber-200 dark:border-amber-500/30 text-amber-700 dark:text-amber-300',
    emerald: 'bg-emerald-50 dark:bg-emerald-500/10 border-emerald-200 dark:border-emerald-500/30 text-emerald-700 dark:text-emerald-300',
    blue:    'bg-blue-50 dark:bg-blue-500/10 border-blue-200 dark:border-blue-500/30 text-blue-700 dark:text-blue-300',
    violet:  'bg-violet-50 dark:bg-violet-500/10 border-violet-200 dark:border-violet-500/30 text-violet-700 dark:text-violet-300',
  };
  return (
    <div className={`rounded-xl border-2 p-3 ${tones[tone]}`}>
      <div className="flex items-center gap-1.5 mb-1">
        <Icon className="h-3 w-3" />
        <div className="text-[9px] uppercase tracking-wider font-extrabold">{label}</div>
      </div>
      <div className="text-xl font-extrabold tabular-nums text-slate-900 dark:text-white">{value}</div>
    </div>
  );
}

function StatCard({ title, value, icon: Icon, tone, link, alert, sub }: any) {
  const tones: Record<string, string> = {
    cyan:    'from-cyan-500 to-teal-600',
    pink:    'from-pink-500 to-rose-600',
    violet:  'from-violet-500 to-purple-600',
    emerald: 'from-emerald-500 to-green-600',
    amber:   'from-amber-500 to-orange-600',
    orange:  'from-orange-500 to-red-600',
    teal:    'from-teal-500 to-emerald-600',
    blue:    'from-blue-500 to-indigo-600',
  };
  const inner = (
    <div className={[
      'rounded-2xl bg-white dark:bg-slate-900/60 border-2 p-3 sm:p-4',
      'shadow-sm dark:shadow-black/20 hover:shadow-lg dark:hover:shadow-blue-500/10',
      'transition-all hover:-translate-y-0.5 relative',
      alert ? 'border-amber-300 dark:border-amber-500/40' : 'border-slate-200 dark:border-slate-800',
    ].join(' ')}>
      {alert && (
        <span className="absolute -top-1 -right-1 h-3 w-3 rounded-full bg-rose-500 animate-ping" />
      )}
      <div className="flex items-center justify-between gap-2">
        <div className="min-w-0 flex-1">
          <div className="text-[10px] uppercase tracking-wider text-slate-600 dark:text-slate-400 font-extrabold">{title}</div>
          <div className="mt-1 text-lg sm:text-2xl font-extrabold text-slate-900 dark:text-white tabular-nums truncate">{value}</div>
          {sub && <div className="text-[10px] text-slate-600 dark:text-slate-400 font-bold mt-0.5 truncate">{sub}</div>}
        </div>
        <div className={`h-10 w-10 rounded-2xl bg-gradient-to-br ${tones[tone] ?? tones.cyan} text-white flex items-center justify-center shadow-md shrink-0`}>
          <Icon className="h-4 w-4 sm:h-5 sm:w-5" />
        </div>
      </div>
    </div>
  );
  return link ? <Link to={link}>{inner}</Link> : inner;
}

function EmptyChart({ icon: Icon, message }: any) {
  return (
    <div className="h-[240px] sm:h-[300px] flex flex-col items-center justify-center gap-2 text-slate-400 dark:text-slate-500">
      <Icon className="h-10 w-10" />
      <p className="text-sm font-extrabold">{message}</p>
    </div>
  );
}

function EmptyList({ icon: Icon, message }: any) {
  return (
    <div className="px-6 py-12 text-center">
      <div className="h-14 w-14 rounded-2xl bg-slate-100 dark:bg-slate-800 flex items-center justify-center mx-auto mb-3">
        <Icon className="h-6 w-6 text-slate-400 dark:text-slate-500" />
      </div>
      <p className="font-extrabold text-slate-500 dark:text-slate-400 text-sm">{message}</p>
    </div>
  );
}
