import { useMemo, useState } from 'react';
import { useQuery } from '@tanstack/react-query';
import { Link } from 'react-router-dom';
import {
  ShoppingCart, Sparkles, Layers, AlertTriangle, Zap,
  TrendingUp, TrendingDown, Target, Award,
  Package, ArrowRight, Plus, Clock, Users,
  DollarSign, RefreshCw, Star,
  Boxes, Tag, ShoppingBag, BookOpen,
  PackageX, BarChart3, Upload, Wallet,
  CreditCard, Banknote, Smartphone, Building2,
  Receipt, Crown, ChevronRight,
  PiggyBank, Hourglass, Flame, Rocket,
} from 'lucide-react';
import {
  ResponsiveContainer, AreaChart, Area, XAxis, YAxis, Tooltip, CartesianGrid,
  BarChart, Bar, PieChart, Pie, Cell,
} from 'recharts';
import { dashboardApi } from '@modules/dashboard/api/dashboard.api';
import { retailDashboardApi } from '../api/dashboard.api';
import { formatPKR } from '@core/lib/format';
import { Button } from '@core/ui/Button';
import { SubscriptionBanner } from '@modules/dashboard/components/SubscriptionBanner';
import { EmailVerifyBanner } from '@core/components/auth/EmailVerifyBanner';
import { useCostHidden, PrivacyToggle } from '@/core/security/HiddenValue';
import { useAuthStore } from '@core/stores/auth.store';

/* ═════════════════════════════════════════════════════════════
   NAFAA RETAIL DASHBOARD — FULL BEST (Final)
   ─────────────────────────────────────────────────────────────
   ✨ Perfect dark + light mode (proper contrast everywhere)
   📱 Fully responsive: mobile → tablet → desktop → 4K
   📊 Rich analytics: 7/30-day trend, hourly, P&L, payment split
   🎨 Gen-Z modern aesthetic: gradients, glow, motion
   🔐 PIN-aware cost/profit hiding
   🖥️  Windows/Mac/Linux safe fonts, zero overflow
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

/**
 * Validated categorical fallback — jin expense categories ka apna rang
 * set nahi, unke liye. Ye aath rang colour-blindness ke sath bhi alag
 * rehte hain (light aur dark dono me check kiye hue). Har bar par naam
 * aur raqam bhi likhi hoti hai, to pehchan kabhi sirf rang par nahi.
 */
const CATEGORY_FALLBACK = [
  '#2a78d6', '#eb6834', '#1baf7a', '#eda100',
  '#e87ba4', '#008300', '#4a3aa7', '#e34948',
];
const CATEGORY_FALLBACK_DARK = [
  '#3987e5', '#d95926', '#199e70', '#c98500',
  '#d55181', '#008300', '#9085e9', '#e66767',
];

/** 14 → "2 PM", 0 → "12 AM" — dukaan-daar ki ghari wali zabaan. */
const hourLabel = (h: number) =>
  h === 0 ? '12 AM' : h < 12 ? `${h} AM` : h === 12 ? '12 PM' : `${h - 12} PM`;

/** Chart ke X-axis par chhota naap — jagah kam hoti hai. */
const hourTick = (h: number) =>
  h === 0 ? '12a' : h < 12 ? `${h}a` : h === 12 ? '12p' : `${h - 12}p`;

const formatPercent = (n: number) => `${n > 0 ? '+' : ''}${n.toFixed(1)}%`;
const formatDate = (v: string) =>
  new Intl.DateTimeFormat('en-PK', { dateStyle: 'medium', timeStyle: 'short' }).format(new Date(v));

type Range = '7d' | '30d';

export default function RetailDashboardV2() {
  const hideCost = useCostHidden();
  const shopName = useAuthStore((s) => s.user?.assignedShop?.name);
  const userName = useAuthStore((s) => s.user?.fullName?.split(' ')[0] ?? 'Boss');
  const [range, setRange] = useState<Range>('7d');
  /* Peak hours: sirf aaj, ya pichhle hafte ka rozana ausat. Ausat is liye
     ke ek din ka rush ittefaq ho sakta hai — hafte ka naqsha asli aadat
     dikhata hai. */
  const [hourDays, setHourDays] = useState<1 | 7>(1);

  /* ─── Data queries ─────────────────────────────────────── */
  const { data, refetch, isRefetching } = useQuery({
    queryKey: ['dashboard-overview'],
    queryFn: () => dashboardApi.overview(),
    refetchInterval: 60_000,
  });

  const { data: retailOverview } = useQuery({
    queryKey: ['retail-dashboard-overview'],
    queryFn: () => retailDashboardApi.overview(),
    refetchInterval: 60_000,
  });

  const { data: hourly } = useQuery({
    queryKey: ['retail-hourly', hourDays],
    queryFn: () => retailDashboardApi.salesByHour(hourDays),
    refetchInterval: 60_000,
  });

  /* Paisa kahan khara hai — stock, kharcha, lena, dena, cash. */
  const { data: money } = useQuery({
    queryKey: ['retail-money-map'],
    queryFn: () => retailDashboardApi.moneyMap(),
    refetchInterval: 60_000,
  });

  const { data: slowMovers = [] } = useQuery({
    queryKey: ['retail-slow-movers'],
    queryFn: () => retailDashboardApi.slowMovers(30),
    refetchInterval: 5 * 60_000,
  });

  const stats = data?.stats;
  const tenant = data?.tenant;

  // Safe getters — never assume stats exist
  const s = stats ?? ({} as any);

  /* ─── Chart data ───────────────────────────────────────── */
  const trend7 = useMemo(() =>
    (data?.salesTrend7Days ?? []).map((p) => {
      const d = new Date(p.date);
      return { ...p, label: ['Sun', 'Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat'][d.getDay()] };
    }), [data]);

  const trend30 = useMemo(() =>
    (data?.salesTrend30Days ?? []).map((p) => {
      const d = new Date(p.date);
      return { ...p, label: `${d.getDate()}/${d.getMonth() + 1}` };
    }), [data]);

  /**
   * Ghante ka chart.
   *
   * Ghanta ab server par dukaan ke timezone (Asia/Karachi) se nikalta
   * hai. Pehle server ke UTC se nikalta tha, is liye shaam 8 baje ka
   * rush chart me 3 baje dikhta tha — dukaan-daar theek kehta tha ke
   * "timing sahi nahi bata raha".
   */
  const hourlyRaw: any[] = (hourly as any)?.hours ?? [];
  const peakHour: number | null = (hourly as any)?.peakHour ?? null;
  const currentHour: number | undefined = (hourly as any)?.currentHour;

  const hourlyData = useMemo(() =>
    hourlyRaw
      // Band ghanton ka khali khana chart me jagah kha jata hai — sirf
      // wohi ghante jin me kuch bika, aur dukaan ka aam waqt.
      .filter((h) => h.total > 0 || (h.hour >= 8 && h.hour <= 22))
      .map((h) => ({
        ...h,
        label: hourTick(h.hour),
        fullLabel: hourLabel(h.hour),
        isPeak: h.hour === peakHour && h.total > 0,
        isNow: hourDays === 1 && h.hour === currentHour,
      })), [hourlyRaw, peakHour, currentHour, hourDays]);

  const chartData = range === '30d' ? trend30 : trend7;
  const growthYest = s.salesGrowthVsYesterday ?? 0;
  const growthMonth = s.salesGrowthVsLastMonth ?? 0;
  const retailAlerts = (retailOverview as any)?.alerts ?? {};

  const paymentData = useMemo(() =>
    (data?.paymentBreakdown ?? []).map((p: any) => ({
      name: p.paymentMethod || p.method,
      value: p._sum?.total ?? p.total ?? 0,
      color: PAYMENT_COLORS[p.paymentMethod || p.method] || '#64748b',
    })).filter((p) => p.value > 0), [data]);

  const totalPayments = paymentData.reduce((sum, p) => sum + p.value, 0);

  /**
   * P&L ka silsila.
   *
   * `money` (retail money-map) ko tarjeeh, kyunke uski din/mahine ki
   * haddein dukaan ke timezone par bani hain. Wo abhi na aaya ho to
   * purane `stats` se kaam chalta hai — khana kabhi khali nahi rehta.
   */
  const pnl = useMemo(() => {
    const revenue = money?.profit?.monthRevenue ?? s.salesMonth ?? 0;
    const cogs = money?.profit?.monthCogs ?? s.cogsMonth ?? 0;
    const expenses = money?.profit?.monthExpenses ?? s.expensesMonth ?? 0;
    const gross = revenue - cogs;
    const net = gross - expenses;
    return {
      revenue, cogs, expenses, gross, net,
      grossPct: revenue > 0 ? (gross / revenue) * 100 : 0,
      netPct: revenue > 0 ? (net / revenue) * 100 : 0,
    };
  }, [money, s.salesMonth, s.cogsMonth, s.expensesMonth]);

  const marginPct = pnl.netPct;

  // Time-based greeting
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
      <section className="relative overflow-hidden rounded-2xl sm:rounded-3xl bg-gradient-to-br from-slate-950 via-sky-900 to-cyan-700 dark:from-slate-950 dark:via-indigo-950 dark:to-cyan-900 text-white p-4 sm:p-6 shadow-2xl">
        {/* Glowing blobs */}
        <div className="absolute -top-32 -right-32 h-80 w-80 rounded-full bg-sky-400/30 blur-3xl pointer-events-none animate-pulse" />
        <div className="absolute -bottom-32 -left-32 h-80 w-80 rounded-full bg-amber-400/20 blur-3xl pointer-events-none" />
        <div className="absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 h-40 w-40 rounded-full bg-fuchsia-400/10 blur-3xl pointer-events-none" />

        <div className="relative flex flex-col sm:flex-row items-start justify-between gap-4">
          <div className="min-w-0 flex-1">
            <div className="inline-flex items-center gap-2 rounded-full bg-white/15 backdrop-blur-md px-3 py-1 text-[11px] font-extrabold border border-white/25 uppercase tracking-widest shadow-lg">
              <ShoppingCart className="h-3.5 w-3.5 text-amber-300" /> Retail Dashboard
              {shopName && (
                <>
                  <span className="opacity-40">•</span>
                  <span className="text-emerald-300">🏪 {shopName}</span>
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
              <strong className="text-emerald-300 text-base">{formatPKR(s.salesToday ?? 0)}</strong>
              <span className="opacity-50 mx-2">•</span>
              <span className="text-cyan-200">{s.ordersToday ?? 0} orders</span>
              <span className="opacity-50 mx-2">•</span>
              <span className="text-amber-200">AOV {formatPKR(s.aovToday ?? 0)}</span>
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
            value={formatPKR(s.salesToday ?? 0)}
            trend={growthYest}
            tone="emerald"
          />
          <HeroTile
            icon={Target}
            label="Aaj Ka Profit"
            value={hideCost ? '••••••' : formatPKR(s.netProfitToday ?? 0)}
            sub={hideCost ? '🔒 PIN se dekho' : 'Net (after cost)'}
            tone="blue"
          />
          <HeroTile
            icon={AlertTriangle}
            label="Kam Stock"
            value={s.lowStockCount ?? 0}
            sub={`${s.outOfStockCount ?? 0} khatam`}
            tone="amber"
            urgent={(s.lowStockCount ?? 0) > 0}
          />
          <HeroTile
            icon={Wallet}
            label="Udhaar"
            value={formatPKR(s.totalUdhaar ?? 0)}
            sub={`${s.customersWithUdhaar ?? 0} customers`}
            tone="rose"
          />
        </div>
      </section>

      {/* ═══════════════════════════════════════════════════════
          ALERTS — sirf jab actually alerts hain
          ═══════════════════════════════════════════════════════ */}
      {((s.outOfStockCount ?? 0) > 0 ||
        (s.lowStockCount ?? 0) > 0 ||
        (retailAlerts.pendingReorders ?? 0) > 0 ||
        (s.pendingTransfers ?? 0) > 0) && (
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
            {(s.outOfStockCount ?? 0) > 0 && (
              <AlertCard to="/products?filter=out" icon={PackageX}
                title={`${s.outOfStockCount} Khatam`} desc="Restock karein" tone="rose" />
            )}
            {(s.lowStockCount ?? 0) > 0 && (
              <AlertCard to="/products?filter=low" icon={AlertTriangle}
                title={`${s.lowStockCount} Kam Stock`} desc="Reorder ka waqt" tone="amber" />
            )}
            {(retailAlerts.pendingReorders ?? 0) > 0 && (
              <AlertCard to="/retail/reorders" icon={RefreshCw}
                title={`${retailAlerts.pendingReorders} Reorders`} desc="AI ne detect kiya" tone="blue" />
            )}
            {(s.pendingTransfers ?? 0) > 0 && (
              <AlertCard to="/transfers" icon={ChevronRight}
                title={`${s.pendingTransfers} Transfers`} desc="Incoming stock" tone="violet" />
            )}
          </div>
        </section>
      )}

      {/* ═══════════════════════════════════════════════════════
          MAIN CHARTS — Sales trend + Hourly
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
                        ? 'bg-white dark:bg-slate-900 text-sky-700 dark:text-sky-300 shadow-md'
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
                    <linearGradient id="rtSales" x1="0" y1="0" x2="0" y2="1">
                      <stop offset="0%" stopColor="#0ea5e9" stopOpacity={0.6} />
                      <stop offset="100%" stopColor="#0ea5e9" stopOpacity={0} />
                    </linearGradient>
                    <linearGradient id="rtProfit" x1="0" y1="0" x2="0" y2="1">
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
                    cursor={{ stroke: '#0ea5e9', strokeWidth: 1, strokeDasharray: '4 4' }}
                  />
                  <Area type="monotone" dataKey="sales" name="Sales" stroke="#0ea5e9" fill="url(#rtSales)" strokeWidth={2.5} />
                  {!hideCost && <Area type="monotone" dataKey="profit" name="Profit" stroke="#10b981" fill="url(#rtProfit)" strokeWidth={2} />}
                </AreaChart>
              </ResponsiveContainer>
            </div>
          ) : (
            <EmptyChart icon={BarChart3} message="Zyada sales data chahiye" />
          )}
          <ChartLegend items={[
            { color: '#0ea5e9', label: 'Sales' },
            ...(!hideCost ? [{ color: '#10b981', label: 'Profit' }] : []),
          ]} />
        </Card>

        <Card>
          <CardHeader
            icon={Clock}
            title="Peak Hours"
            subtitle={hourDays === 1 ? 'Aaj kis waqt zyada bika' : '7 din ka rozana ausat'}
            tone="violet"
            right={
              <div className="inline-flex rounded-xl bg-slate-100 dark:bg-slate-800 p-1 text-[11px] font-extrabold">
                {([[1, 'Aaj'], [7, '7 Din']] as const).map(([d, l]) => (
                  <button
                    key={d}
                    onClick={() => setHourDays(d as 1 | 7)}
                    className={[
                      'px-3 py-1.5 rounded-lg transition-all',
                      hourDays === d
                        ? 'bg-white dark:bg-slate-900 text-violet-700 dark:text-violet-300 shadow-md'
                        : 'text-slate-600 dark:text-slate-400 hover:text-slate-900 dark:hover:text-slate-200',
                    ].join(' ')}
                  >
                    {l}
                  </button>
                ))}
              </div>
            }
          />

          {/* Sab se zaroori jumla — chart se pehle, saaf lafzon me */}
          {peakHour !== null && (
            <div className="mb-3 rounded-2xl bg-gradient-to-r from-violet-50 to-purple-50 dark:from-violet-500/15 dark:to-purple-500/15 border-2 border-violet-200 dark:border-violet-500/30 px-3 py-2.5 flex items-center gap-2.5">
              <div className="h-9 w-9 rounded-xl bg-gradient-to-br from-violet-500 to-purple-700 text-white flex items-center justify-center shadow-md shrink-0">
                <Flame className="h-4 w-4" />
              </div>
              <div className="min-w-0">
                <div className="text-[10px] uppercase tracking-wider font-extrabold text-violet-700 dark:text-violet-300">
                  Sab se masroof waqt
                </div>
                <div className="text-sm font-extrabold text-slate-900 dark:text-white truncate">
                  {hourLabel(peakHour)} – {hourLabel((peakHour + 1) % 24)}
                  <span className="text-slate-500 dark:text-slate-400 font-bold">
                    {' • '}{formatPKR((hourly as any)?.peakTotal ?? 0)}
                    {hourDays > 1 ? ' rozana' : ''}
                  </span>
                </div>
              </div>
            </div>
          )}

          {hourlyData.length > 0 ? (
            <div className="h-[200px] sm:h-[248px]">
              <ResponsiveContainer width="100%" height="100%">
                <BarChart data={hourlyData} margin={{ top: 10, right: 8, left: -10, bottom: 0 }}>
                  <defs>
                    <linearGradient id="hourlyBar" x1="0" y1="0" x2="0" y2="1">
                      <stop offset="0%" stopColor="#a855f7" stopOpacity={1} />
                      <stop offset="100%" stopColor="#7c3aed" stopOpacity={0.7} />
                    </linearGradient>
                    <linearGradient id="hourlyPeak" x1="0" y1="0" x2="0" y2="1">
                      <stop offset="0%" stopColor="#fb923c" stopOpacity={1} />
                      <stop offset="100%" stopColor="#ea580c" stopOpacity={0.8} />
                    </linearGradient>
                  </defs>
                  <CartesianGrid strokeDasharray="3 3" className="stroke-slate-200 dark:stroke-slate-700" opacity={0.4} />
                  <XAxis dataKey="label" className="fill-slate-500 dark:fill-slate-400" fontSize={9} interval={1} tickLine={false} axisLine={false} />
                  <YAxis className="fill-slate-500 dark:fill-slate-400" fontSize={10} tickFormatter={(v) => `${(v / 1000).toFixed(0)}k`} tickLine={false} axisLine={false} />
                  <Tooltip
                    formatter={(v: any, _n: any, item: any) => [
                      formatPKR(Number(v)),
                      `${Math.round(item?.payload?.count ?? 0)} orders`,
                    ]}
                    labelFormatter={(_l: any, payload: any) => payload?.[0]?.payload?.fullLabel ?? ''}
                    contentStyle={{
                      borderRadius: 12,
                      border: '1px solid rgba(148,163,184,0.2)',
                      backgroundColor: 'rgba(15,23,42,0.95)',
                      color: '#f8fafc',
                      boxShadow: '0 20px 40px rgba(0,0,0,0.3)',
                    }}
                    labelStyle={{ color: '#94a3b8', fontWeight: 700 }}
                    cursor={{ fill: 'rgba(168,85,247,0.1)' }}
                  />
                  <Bar dataKey="total" radius={[4, 4, 0, 0]}>
                    {hourlyData.map((h: any) => (
                      <Cell
                        key={h.hour}
                        fill={h.isPeak ? 'url(#hourlyPeak)' : 'url(#hourlyBar)'}
                        stroke={h.isNow ? '#0ea5e9' : 'none'}
                        strokeWidth={h.isNow ? 2 : 0}
                      />
                    ))}
                  </Bar>
                </BarChart>
              </ResponsiveContainer>
            </div>
          ) : (
            <EmptyChart icon={Clock} message={hourDays === 1 ? 'Aaj tak koi sale nahi' : 'Is hafte koi sale nahi'} />
          )}

          <ChartLegend items={[
            { color: '#ea580c', label: 'Peak ghanta' },
            { color: '#7c3aed', label: 'Baqi ghante' },
            ...(hourDays === 1 && currentHour !== undefined
              ? [{ color: '#0ea5e9', label: 'Abhi ka ghanta' }] : []),
          ]} />
        </Card>
      </section>

      {/* ═══════════════════════════════════════════════════════
          PAISA KAHAN HAI — stock, kharcha, lena, dena, cash
          ═══════════════════════════════════════════════════════ */}
      {money && !hideCost && (
        <section>
          <div className="flex items-center gap-2.5 mb-3">
            <div className="h-10 w-10 rounded-2xl bg-gradient-to-br from-emerald-500 to-teal-700 text-white flex items-center justify-center shadow-lg shadow-emerald-500/40">
              <PiggyBank className="h-5 w-5" />
            </div>
            <div>
              <h3 className="text-base sm:text-lg font-extrabold text-slate-900 dark:text-white">Paisa Kahan Hai 💰</h3>
              <p className="text-xs text-slate-500 dark:text-slate-400 font-bold">
                Maal, kharcha, lena aur dena — sab ek nazar me
              </p>
            </div>
          </div>

          <div className="grid grid-cols-2 lg:grid-cols-3 xl:grid-cols-6 gap-2 sm:gap-3">
            <MoneyTile
              icon={Boxes} tone="teal" to="/stock-report"
              label="Maal Para Hai"
              value={formatPKR(money.inventory.valueAtCost)}
              sub={`${money.inventory.productCount} items • bikne par ${formatPKR(money.inventory.valueAtRetail)}`}
            />
            <MoneyTile
              icon={ShoppingBag} tone="violet" to="/purchases"
              label="Is Mahine Maal Aaya"
              value={formatPKR(money.purchases.monthTotal)}
              sub={`${money.purchases.monthCount} bills${money.purchases.monthUnpaid > 0 ? ` • ${formatPKR(money.purchases.monthUnpaid)} baqi` : ''}`}
            />
            <MoneyTile
              icon={Wallet} tone="amber" to="/expenses"
              label="Is Mahine Kharcha"
              value={formatPKR(money.expenses.month)}
              sub={`${money.expenses.monthCount} entries • pichhle mahine ${formatPKR(money.expenses.lastMonth)}`}
            />
            <MoneyTile
              icon={BookOpen} tone="rose" to="/khata"
              label="Logon Se Lena"
              value={formatPKR(money.receivable.total)}
              sub={`${money.receivable.customerCount} customers ka udhaar`}
              urgent={money.receivable.total > 0}
            />
            <MoneyTile
              icon={Building2} tone="orange" to="/suppliers"
              label="Supplier Ko Dena"
              value={formatPKR(money.payable.total)}
              sub={`${money.payable.supplierCount} suppliers`}
              urgent={money.payable.total > 0}
            />
            <MoneyTile
              icon={Banknote} tone="emerald" to="/cash-register"
              label="Counter Me Cash"
              value={money.cash.registerOpen ? formatPKR(money.cash.expected) : '—'}
              sub={money.cash.registerOpen
                ? `Opening ${formatPKR(money.cash.opening)}`
                : 'Register band hai'}
            />
          </div>

          {money.inventory.deadStockValue > 0 && (
            <div className="mt-3 rounded-2xl bg-gradient-to-r from-rose-50 to-orange-50 dark:from-rose-500/15 dark:to-orange-500/15 border-2 border-rose-200 dark:border-rose-500/30 px-4 py-3 flex items-center gap-3">
              <div className="h-10 w-10 rounded-xl bg-gradient-to-br from-rose-500 to-orange-600 text-white flex items-center justify-center shadow-md shrink-0">
                <Hourglass className="h-5 w-5" />
              </div>
              <div className="min-w-0 flex-1">
                <div className="font-extrabold text-slate-900 dark:text-white text-sm">
                  {formatPKR(money.inventory.deadStockValue)} ka maal phansa hua hai
                </div>
                <div className="text-xs font-bold text-rose-700 dark:text-rose-300">
                  {money.inventory.deadStockCount} products 60 din se nahi bike — discount ya bundle karke nikaalein
                </div>
              </div>
              <Link to="/retail/combos" className="shrink-0 text-rose-700 dark:text-rose-300 text-xs font-extrabold inline-flex items-center gap-1 hover:underline">
                Combo banao <ArrowRight className="h-3.5 w-3.5" />
              </Link>
            </div>
          )}
        </section>
      )}

      {/* ═══════════════════════════════════════════════════════
          KHARCHA BREAKDOWN + PURCHASES
          ═══════════════════════════════════════════════════════ */}
      {money && !hideCost && (
        <section className="grid lg:grid-cols-2 gap-4 sm:gap-6">
          <Card>
            <CardHeader
              icon={Wallet}
              title="Kharcha Kahan Gaya"
              subtitle="Is mahine, sab se bara pehle"
              tone="amber"
              right={
                <Link to="/expenses" className="text-sky-700 dark:text-sky-400 text-xs font-extrabold inline-flex items-center gap-1 hover:underline">
                  Sab <ArrowRight className="h-3.5 w-3.5" />
                </Link>
              }
            />
            {money.expenses.byCategory.length > 0 ? (
              <ExpenseBars rows={money.expenses.byCategory} total={money.expenses.month} />
            ) : (
              <EmptyList icon={Wallet} message="Is mahine koi kharcha darj nahi" />
            )}
          </Card>

          <Card noPad>
            <div className="px-4 sm:px-6 py-4 border-b-2 border-slate-100 dark:border-slate-800 flex items-center gap-3">
              <div className="h-10 w-10 rounded-2xl bg-gradient-to-br from-violet-500 to-purple-700 text-white flex items-center justify-center shadow-lg shadow-violet-500/40">
                <ShoppingBag className="h-5 w-5" />
              </div>
              <div className="flex-1 min-w-0">
                <h3 className="text-base sm:text-lg font-extrabold text-slate-900 dark:text-white">Maal Ki Kharidari</h3>
                <p className="text-xs text-slate-600 dark:text-slate-400 font-bold">
                  Aaj {formatPKR(money.purchases.todayTotal)} • mahine {formatPKR(money.purchases.monthTotal)}
                </p>
              </div>
              <Link to="/purchases" className="text-sky-700 dark:text-sky-400 text-xs font-extrabold inline-flex items-center gap-1 hover:underline shrink-0">
                Sab <ArrowRight className="h-3.5 w-3.5" />
              </Link>
            </div>
            <div className="divide-y divide-slate-100 dark:divide-slate-800 max-h-[340px] overflow-y-auto">
              {money.purchases.recent?.length ? (
                money.purchases.recent.map((pu: any) => {
                  const due = Number(pu.total) - Number(pu.paidAmount);
                  return (
                    <Link key={pu.id} to={`/purchases/${pu.id}`}
                      className="px-4 sm:px-6 py-3 flex items-center gap-3 hover:bg-slate-50 dark:hover:bg-slate-800/60 transition"
                    >
                      <div className="h-9 w-9 rounded-xl bg-violet-100 dark:bg-violet-500/20 text-violet-700 dark:text-violet-300 flex items-center justify-center shrink-0">
                        <Package className="h-4 w-4" />
                      </div>
                      <div className="min-w-0 flex-1">
                        <div className="font-extrabold text-slate-900 dark:text-white truncate text-sm">
                          {pu.supplier?.name || 'Supplier'}
                        </div>
                        <div className="text-[11px] text-slate-600 dark:text-slate-400 font-bold truncate font-mono">
                          {pu.purchaseNumber} • {formatDate(pu.purchasedAt)}
                        </div>
                      </div>
                      <div className="text-right shrink-0">
                        <div className="font-extrabold text-slate-900 dark:text-white text-sm tabular-nums">
                          {formatPKR(pu.total)}
                        </div>
                        {due > 0 && (
                          <div className="text-[10px] text-amber-700 dark:text-amber-400 font-extrabold">
                            Baqi: {formatPKR(due)}
                          </div>
                        )}
                      </div>
                    </Link>
                  );
                })
              ) : (
                <EmptyList icon={ShoppingBag} message="Abhi koi kharidari nahi" />
              )}
            </div>
          </Card>
        </section>
      )}

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
            {/* Poora silsila — bechne se le kar haath me bachne tak.
                Pehle sirf chaar khane thay aur "gross profit" gayab tha,
                to ye samajh hi nahi aata tha ke munafa maal ke rate se
                kam hua ya kharchon se. */}
            <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-5 gap-2 sm:gap-3">
              <PnLCell label="Sale" value={formatPKR(pnl.revenue)} sub={`${s.ordersMonth ?? 0} orders`} tone="emerald" icon={TrendingUp} />
              <PnLCell label="− Maal Ki Lagat" value={formatPKR(pnl.cogs)} sub="COGS" tone="rose" icon={TrendingDown} />
              <PnLCell label="= Gross Profit" value={formatPKR(pnl.gross)} sub={`${pnl.grossPct.toFixed(1)}% margin`} tone="emerald" icon={Sparkles} />
              <PnLCell label="− Kharche" value={formatPKR(pnl.expenses)} sub="Bijli, kiraya, tankhwah" tone="amber" icon={Wallet} />
              <PnLCell label="= Net Profit" value={formatPKR(pnl.net)} sub={`Margin ${pnl.netPct.toFixed(1)}%`} tone="blue" icon={Target} highlight />
            </div>

            {/* Aaj ka apna hisaab — mahine ka bara number rozmarra ka
                sawal nahi. */}
            <div className="mt-3 rounded-2xl bg-slate-50 dark:bg-slate-800/60 border-2 border-slate-200 dark:border-slate-700 px-4 py-3 flex items-center gap-3 flex-wrap">
              <div className="text-[10px] uppercase tracking-wider font-extrabold text-slate-600 dark:text-slate-400 shrink-0">
                Aaj
              </div>
              <div className="flex items-baseline gap-1.5">
                <span className="text-xs font-bold text-slate-600 dark:text-slate-400">Sale</span>
                <span className="text-sm font-extrabold text-emerald-700 dark:text-emerald-400 tabular-nums">
                  {formatPKR(s.salesToday ?? 0)}
                </span>
              </div>
              <span className="text-slate-300 dark:text-slate-600">•</span>
              <div className="flex items-baseline gap-1.5">
                <span className="text-xs font-bold text-slate-600 dark:text-slate-400">Kharcha</span>
                <span className="text-sm font-extrabold text-amber-700 dark:text-amber-400 tabular-nums">
                  {formatPKR(money?.expenses?.today ?? s.expensesToday ?? 0)}
                </span>
              </div>
              <span className="text-slate-300 dark:text-slate-600">•</span>
              <div className="flex items-baseline gap-1.5">
                <span className="text-xs font-bold text-slate-600 dark:text-slate-400">Bacha</span>
                <span className={[
                  'text-sm font-extrabold tabular-nums',
                  (money?.profit?.todayNet ?? s.netProfitToday ?? 0) >= 0
                    ? 'text-blue-700 dark:text-blue-400'
                    : 'text-rose-700 dark:text-rose-400',
                ].join(' ')}>
                  {formatPKR(money?.profit?.todayNet ?? s.netProfitToday ?? 0)}
                </span>
              </div>
            </div>
          </Card>

          <Card>
            <CardHeader icon={DollarSign} title="Payment Methods" subtitle="Is mahine ka split" tone="pink" />
            {paymentData.length > 0 ? (
              <>
                <div className="h-[180px]">
                  <ResponsiveContainer width="100%" height="100%">
                    <PieChart>
                      <Pie
                        data={paymentData}
                        cx="50%" cy="50%" outerRadius={75} innerRadius={45}
                        dataKey="value" labelLine={false} paddingAngle={3}
                      >
                        {paymentData.map((p) => <Cell key={p.name} fill={p.color} stroke="none" />)}
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
                  {paymentData.map((p) => {
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
          QUICK ACTIONS — single unified grid (no duplicates!)
          ═══════════════════════════════════════════════════════ */}
      <section>
        <div className="flex items-center gap-2.5 mb-3">
          <div className="h-10 w-10 rounded-2xl bg-gradient-to-br from-sky-500 to-cyan-700 text-white flex items-center justify-center shadow-lg shadow-sky-500/40">
            <Rocket className="h-5 w-5" />
          </div>
          <div>
            <h3 className="text-base sm:text-lg font-extrabold text-slate-900 dark:text-white">Quick Actions 🚀</h3>
            <p className="text-xs text-slate-500 dark:text-slate-400 font-bold">Sab retail features ek jaga</p>
          </div>
        </div>
        <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-4 xl:grid-cols-6 gap-2 sm:gap-3">
          <OpsCard to="/pos" icon={ShoppingCart} title="POS Counter" desc="Sale karo" tone="sky" primary />
          <OpsCard to="/retail-products/new" icon={Plus} title="Add Product" desc="Naya product" tone="emerald" />
          <OpsCard to="/products" icon={Package} title="Products" desc={`${s.totalProducts ?? 0} items`} tone="cyan" />
          <OpsCard to="/customers" icon={Users} title="Customers" desc={`${s.totalCustomers ?? 0} log`} tone="pink" />
          <OpsCard to="/khata" icon={BookOpen} title="Khata / Udhaar" desc={formatPKR(s.totalUdhaar ?? 0)} tone="rose" />
          <OpsCard to="/sales" icon={Receipt} title="Sales History" desc="Purani receipts" tone="blue" />
          <OpsCard to="/retail/combos" icon={Sparkles} title="Combos" desc="Bundle deals" tone="violet" />
          <OpsCard to="/retail/product-units" icon={Layers} title="Multi-Units" desc="Piece/Dozen" tone="teal" />
          <OpsCard to="/retail/quick-keys" icon={Zap} title="Quick Keys" desc="POS shortcuts" tone="amber" />
          <OpsCard to="/retail/damage" icon={AlertTriangle} title="Damage Log" desc={`${retailAlerts.damagesToday ?? 0} aaj`} tone="orange" />
          <OpsCard to="/retail/reorders" icon={RefreshCw} title="Smart Reorder" desc="AI suggestions" tone="indigo" />
          <OpsCard to="/retail/bulk-import" icon={Upload} title="Bulk Import" desc="Excel/CSV" tone="purple" />
          <OpsCard to="/profit-report" icon={PiggyBank} title="Profit Report" desc="Nafa-nuqsan" tone="emerald" />
          <OpsCard to="/expenses" icon={Wallet} title="Kharche" desc="Bijli, kiraya" tone="amber" />
          <OpsCard to="/purchases" icon={ShoppingBag} title="Kharidari" desc="Maal mangwao" tone="violet" />
          <OpsCard to="/suppliers" icon={Building2} title="Suppliers" desc={`${s.totalSuppliers ?? 0} parties`} tone="indigo" />
          <OpsCard to="/barcode-labels" icon={Tag} title="Barcode Labels" desc="Multi-unit bhi" tone="teal" />
          <OpsCard to="/cash-register" icon={Banknote} title="Cash Register" desc="Counter ka hisaab" tone="emerald" />
        </div>
      </section>

      {/* ═══════════════════════════════════════════════════════
          KPI STAT GRID (compact)
          ═══════════════════════════════════════════════════════ */}
      <section className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-6 gap-2 sm:gap-3">
        <StatCard title="Total Products" value={s.totalProducts ?? 0} icon={Package} tone="cyan" link="/products" />
        <StatCard title="Customers" value={s.totalCustomers ?? 0} icon={Users} tone="pink" link="/customers" />
        <StatCard title="Suppliers" value={s.totalSuppliers ?? 0} icon={ShoppingBag} tone="violet" link="/suppliers" />
        <StatCard title="Categories" value={s.totalCategories ?? 0} icon={Tag} tone="emerald" link="/categories" />
        <StatCard title="Aaj Bike" value={(s as any).itemsSoldToday ?? 0} icon={Boxes} tone="orange" sub="items today" />
        <StatCard title="Stock Value" value={hideCost ? '••••' : formatPKR(s.inventoryValueAtCost ?? 0)} icon={PiggyBank} tone="teal" link="/stock-report" />
      </section>

      {/* ═══════════════════════════════════════════════════════
          TOP MOVERS + SLOW MOVERS
          ═══════════════════════════════════════════════════════ */}
      <section className="grid lg:grid-cols-2 gap-4 sm:gap-6">
        <Card noPad>
          <div className="px-4 sm:px-6 py-4 border-b-2 border-slate-100 dark:border-slate-800 flex items-center gap-3 bg-gradient-to-r from-amber-50 to-orange-50 dark:from-amber-500/10 dark:to-orange-500/10">
            <div className="h-10 w-10 rounded-2xl bg-gradient-to-br from-amber-500 to-orange-600 text-white flex items-center justify-center shadow-lg shadow-amber-500/40">
              <Crown className="h-5 w-5" />
            </div>
            <div className="flex-1 min-w-0">
              <h3 className="text-base sm:text-lg font-extrabold text-slate-900 dark:text-white">Top Movers 🏆</h3>
              <p className="text-xs text-slate-600 dark:text-slate-400 font-bold">Is mahine ke best sellers</p>
            </div>
            <Link to="/profit-report" className="text-sky-700 dark:text-sky-400 text-xs font-extrabold inline-flex items-center gap-1 hover:underline">
              Reports <ArrowRight className="h-3.5 w-3.5" />
            </Link>
          </div>
          <div className="divide-y divide-slate-100 dark:divide-slate-800 max-h-[420px] overflow-y-auto">
            {data?.topProducts?.length ? (
              data.topProducts.slice(0, 8).map((p, idx) => {
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
                  <div key={p.productId} className="px-4 sm:px-6 py-3 flex items-center gap-3 hover:bg-slate-50 dark:hover:bg-slate-800/60 transition">
                    <div className={`h-9 w-9 rounded-xl bg-gradient-to-br ${rankGrads[idx]} text-white font-extrabold flex items-center justify-center text-sm shrink-0 shadow-md`}>
                      {idx < 3 ? <Crown className="h-4 w-4" /> : idx + 1}
                    </div>
                    <div className="h-10 w-10 rounded-xl bg-slate-100 dark:bg-slate-800 overflow-hidden flex items-center justify-center shrink-0 border border-slate-200 dark:border-slate-700">
                      {p.product?.images?.[0]?.url ? (
                        <img src={p.product.images[0].url} alt="" loading="lazy" className="h-full w-full object-cover" />
                      ) : (
                        <Package className="h-4 w-4 text-slate-400 dark:text-slate-500" />
                      )}
                    </div>
                    <div className="min-w-0 flex-1">
                      <div className="font-extrabold text-slate-900 dark:text-white truncate text-sm">{p.product?.name || 'Unknown'}</div>
                      <div className="text-[11px] text-slate-600 dark:text-slate-400 font-bold">
                        {p.quantitySold.toFixed(0)} {p.product?.unit} • {(p as any).orderCount ?? 0} orders
                      </div>
                    </div>
                    <div className="text-right shrink-0">
                      <div className="font-extrabold text-emerald-700 dark:text-emerald-400 text-sm tabular-nums">{formatPKR(p.revenue)}</div>
                    </div>
                  </div>
                );
              })
            ) : (
              <EmptyList icon={Award} message="Abhi tak koi sale nahi" />
            )}
          </div>
        </Card>

        <Card noPad>
          <div className="px-4 sm:px-6 py-4 border-b-2 border-slate-100 dark:border-slate-800 flex items-center gap-3 bg-gradient-to-r from-rose-50 to-red-50 dark:from-rose-500/10 dark:to-red-500/10">
            <div className="h-10 w-10 rounded-2xl bg-gradient-to-br from-rose-500 to-red-700 text-white flex items-center justify-center shadow-lg shadow-rose-500/40">
              <Hourglass className="h-5 w-5" />
            </div>
            <div className="flex-1 min-w-0">
              <h3 className="text-base sm:text-lg font-extrabold text-slate-900 dark:text-white">Slow Movers 🐢</h3>
              <p className="text-xs text-slate-600 dark:text-slate-400 font-bold">30+ din se koi bikri nahi</p>
            </div>
          </div>
          <div className="divide-y divide-slate-100 dark:divide-slate-800 max-h-[420px] overflow-y-auto">
            {(slowMovers as any[]).length === 0 ? (
              <div className="px-6 py-12 text-center">
                <div className="h-14 w-14 rounded-2xl bg-emerald-100 dark:bg-emerald-500/20 flex items-center justify-center mx-auto mb-3 shadow-sm">
                  <Star className="h-6 w-6 text-emerald-600 dark:text-emerald-400" />
                </div>
                <h4 className="font-extrabold text-slate-900 dark:text-white text-sm">Sab kuch chal raha hai! 🎉</h4>
                <p className="text-xs text-slate-600 dark:text-slate-400 mt-1 font-bold">Koi ruka hua product nahi</p>
              </div>
            ) : (
              (slowMovers as any[]).slice(0, 8).map((p) => (
                <Link key={p.id} to={`/retail-products/${p.id}`}
                  className="px-4 sm:px-6 py-3 flex items-center gap-3 hover:bg-slate-50 dark:hover:bg-slate-800/60 transition"
                >
                  <div className="h-10 w-10 rounded-xl bg-slate-100 dark:bg-slate-800 overflow-hidden flex items-center justify-center shrink-0 border border-slate-200 dark:border-slate-700">
                    {p.images?.[0]?.url ? (
                      <img src={p.images[0].url} alt="" loading="lazy" className="h-full w-full object-cover" />
                    ) : (
                      <Package className="h-4 w-4 text-slate-400 dark:text-slate-500" />
                    )}
                  </div>
                  <div className="flex-1 min-w-0">
                    <div className="font-extrabold text-slate-900 dark:text-white truncate text-sm">{p.name}</div>
                    <div className="text-[11px] text-slate-600 dark:text-slate-400 font-bold">
                      Stock: {p.stock} {p.unit} • {p.category?.name || 'No category'}
                    </div>
                  </div>
                  <div className="shrink-0 text-right">
                    <div className="text-[10px] font-extrabold text-rose-700 dark:text-rose-400 uppercase tracking-wider">Discount karo</div>
                    <ArrowRight className="h-3.5 w-3.5 text-slate-400 dark:text-slate-500 ml-auto mt-0.5" />
                  </div>
                </Link>
              ))
            )}
          </div>
        </Card>
      </section>

      {/* ═══════════════════════════════════════════════════════
          RECENT SALES + LOW STOCK
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
            <Link to="/sales" className="text-sky-700 dark:text-sky-400 text-xs font-extrabold inline-flex items-center gap-1 hover:underline">
              All <ArrowRight className="h-3.5 w-3.5" />
            </Link>
          </div>
          <div className="divide-y divide-slate-100 dark:divide-slate-800 max-h-[380px] overflow-y-auto">
            {data?.recentSales?.length ? (
              data.recentSales.slice(0, 8).map((sale) => {
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
          <div className="px-4 sm:px-6 py-4 border-b-2 border-slate-100 dark:border-slate-800 flex items-center gap-3">
            <div className="h-10 w-10 rounded-2xl bg-gradient-to-br from-amber-500 to-orange-600 text-white flex items-center justify-center shadow-lg shadow-amber-500/40">
              <AlertTriangle className="h-5 w-5" />
            </div>
            <div className="flex-1 min-w-0">
              <h3 className="text-base sm:text-lg font-extrabold text-slate-900 dark:text-white">Low Stock</h3>
              <p className="text-xs text-slate-600 dark:text-slate-400 font-bold">{data?.lowStockProducts?.length ?? 0} items need attention</p>
            </div>
            <Link to="/products?filter=low" className="text-sky-700 dark:text-sky-400 text-xs font-extrabold inline-flex items-center gap-1 hover:underline">
              All <ArrowRight className="h-3.5 w-3.5" />
            </Link>
          </div>
          <div className="divide-y divide-slate-100 dark:divide-slate-800 max-h-[380px] overflow-y-auto">
            {data?.lowStockProducts?.length ? (
              data.lowStockProducts.slice(0, 8).map((p) => {
                const isOut = p.stock === 0;
                return (
                  <Link key={p.id} to={`/retail-products/${p.id}`}
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
                      <div className="text-[11px] text-slate-600 dark:text-slate-400 font-bold">{formatPKR(p.price)} / {p.unit}</div>
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
   REUSABLE SUB-COMPONENTS — dark mode perfect
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

function OpsCard({ to, icon: Icon, title, desc, tone, primary }: any) {
  const tones: Record<string, string> = {
    sky:     'from-sky-500 to-cyan-600',
    emerald: 'from-emerald-500 to-green-600',
    cyan:    'from-cyan-500 to-teal-600',
    pink:    'from-pink-500 to-rose-600',
    rose:    'from-rose-500 to-red-600',
    blue:    'from-blue-500 to-indigo-600',
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
        ? 'bg-gradient-to-br from-sky-50 to-cyan-50 dark:from-sky-500/15 dark:to-cyan-500/15 border-sky-300 dark:border-sky-500/40 shadow-lg dark:shadow-sky-500/20'
        : 'bg-white dark:bg-slate-900/60 border-slate-200 dark:border-slate-800 hover:border-sky-300 dark:hover:border-sky-500/50 hover:shadow-lg dark:hover:shadow-sky-500/20',
    ].join(' ')}>
      <div className={`h-10 w-10 rounded-xl bg-gradient-to-br ${tones[tone] ?? tones.sky} text-white flex items-center justify-center shadow-md mb-2 group-hover:scale-110 group-hover:rotate-3 transition-transform duration-200`}>
        <Icon className="h-5 w-5" />
      </div>
      <div className="font-extrabold text-slate-900 dark:text-white text-xs sm:text-sm truncate">{title}</div>
      <div className="text-[10px] sm:text-[11px] text-slate-600 dark:text-slate-400 font-bold mt-0.5 truncate">{desc}</div>
    </Link>
  );
}

/**
 * Paisa-map ka khana.
 *
 * Raqam sab se bari cheez hai — is liye wohi sab se mota. Neeche ek
 * jumle me tafseel: kitne items, kitne bills, kitna baqi. Har khana
 * apni jagah le jata hai, taake sawal ka jawab do click me mil jaye.
 */
function MoneyTile({ icon: Icon, label, value, sub, tone, to, urgent }: any) {
  const tones: Record<string, { grad: string; ring: string }> = {
    teal:    { grad: 'from-teal-500 to-emerald-600',   ring: 'hover:border-teal-300 dark:hover:border-teal-500/50' },
    violet:  { grad: 'from-violet-500 to-purple-600',  ring: 'hover:border-violet-300 dark:hover:border-violet-500/50' },
    amber:   { grad: 'from-amber-500 to-orange-600',   ring: 'hover:border-amber-300 dark:hover:border-amber-500/50' },
    rose:    { grad: 'from-rose-500 to-red-600',       ring: 'hover:border-rose-300 dark:hover:border-rose-500/50' },
    orange:  { grad: 'from-orange-500 to-amber-600',   ring: 'hover:border-orange-300 dark:hover:border-orange-500/50' },
    emerald: { grad: 'from-emerald-500 to-green-600',  ring: 'hover:border-emerald-300 dark:hover:border-emerald-500/50' },
  };
  const t = tones[tone] ?? tones.teal;
  return (
    <Link to={to} className={[
      'rounded-2xl bg-white dark:bg-slate-900/60 border-2 p-3 sm:p-4',
      'shadow-sm dark:shadow-black/20 hover:shadow-lg transition-all hover:-translate-y-0.5',
      urgent ? 'border-amber-300 dark:border-amber-500/40' : 'border-slate-200 dark:border-slate-800',
      t.ring,
    ].join(' ')}>
      <div className={`h-9 w-9 rounded-xl bg-gradient-to-br ${t.grad} text-white flex items-center justify-center shadow-md mb-2`}>
        <Icon className="h-4 w-4" />
      </div>
      <div className="text-[10px] uppercase tracking-wider text-slate-600 dark:text-slate-400 font-extrabold truncate">
        {label}
      </div>
      <div className="mt-0.5 text-base sm:text-xl font-extrabold text-slate-900 dark:text-white tabular-nums truncate">
        {value}
      </div>
      <div className="text-[10px] text-slate-600 dark:text-slate-400 font-bold mt-1 leading-snug line-clamp-2">
        {sub}
      </div>
    </Link>
  );
}

/**
 * Kharche ki categories — sab se bari pehle.
 *
 * Gol chart (pie) ki jagah seedhi patiyan: dukaan-daar ka sawal
 * "kaunsa kharcha sab se bara hai" tarteeb ka sawal hai, aur lambai
 * ka muqabla gole ke tukron se kahin aasan hai.
 *
 * Har patti par naam aur raqam likhi hai — rang sirf sajawat hai,
 * pehchan nahi. Is liye rang na dikhein (colour-blindness, black &
 * white print) tab bhi chart poora parha jata hai.
 */
function ExpenseBars({ rows, total }: { rows: any[]; total: number }) {
  const max = Math.max(...rows.map((r) => r.amount), 1);
  const isDark = typeof document !== 'undefined'
    && document.documentElement.classList.contains('dark');

  return (
    <div className="space-y-2.5">
      {rows.map((r, i) => {
        const fallback = isDark ? CATEGORY_FALLBACK_DARK : CATEGORY_FALLBACK;
        const color = r.color && r.color !== '#f59e0b'
          ? r.color
          : fallback[i % fallback.length];
        const pctOfTotal = total > 0 ? (r.amount / total) * 100 : 0;
        return (
          <div key={r.categoryId ?? `none-${i}`}>
            <div className="flex items-baseline justify-between gap-2 mb-1">
              <div className="flex items-center gap-1.5 min-w-0">
                <span className="h-2.5 w-2.5 rounded-full shrink-0 shadow-sm" style={{ backgroundColor: color }} />
                <span className="text-xs font-extrabold text-slate-800 dark:text-slate-100 truncate">
                  {r.name}
                </span>
                <span className="text-[10px] font-bold text-slate-500 dark:text-slate-400 shrink-0">
                  ×{r.count}
                </span>
              </div>
              <div className="text-xs font-extrabold text-slate-900 dark:text-white tabular-nums shrink-0">
                {formatPKR(r.amount)}
                <span className="ml-1 text-[10px] font-bold text-slate-500 dark:text-slate-400">
                  {pctOfTotal.toFixed(0)}%
                </span>
              </div>
            </div>
            <div className="h-2.5 rounded-full bg-slate-100 dark:bg-slate-800 overflow-hidden">
              <div
                className="h-full rounded-full transition-all duration-500"
                style={{ width: `${Math.max((r.amount / max) * 100, 2)}%`, backgroundColor: color }}
              />
            </div>
          </div>
        );
      })}
      <div className="pt-2 mt-1 border-t-2 border-slate-100 dark:border-slate-800 flex items-baseline justify-between">
        <span className="text-[11px] font-extrabold uppercase tracking-wider text-slate-600 dark:text-slate-400">
          Kul kharcha
        </span>
        <span className="text-sm font-extrabold text-amber-700 dark:text-amber-400 tabular-nums">
          {formatPKR(total)}
        </span>
      </div>
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
      'shadow-sm dark:shadow-black/20 hover:shadow-lg dark:hover:shadow-sky-500/10',
      'transition-all hover:-translate-y-0.5 relative',
      alert ? 'border-amber-300 dark:border-amber-500/40' : 'border-slate-200 dark:border-slate-800',
    ].join(' ')}>
      {alert && value > 0 && (
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
