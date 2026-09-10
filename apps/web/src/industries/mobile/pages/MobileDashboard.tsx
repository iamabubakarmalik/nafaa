import { useMemo, useState, useEffect } from 'react';
import { useQuery } from '@tanstack/react-query';
import { Link } from 'react-router-dom';
import {
  Smartphone, ShieldCheck, Wrench, CreditCard, RefreshCw,
  TrendingUp, TrendingDown, Wallet, Target, Sparkles,
  Package, Award, ArrowRight, Plus, Clock, Users,
  DollarSign, Activity, AlertTriangle, ChevronRight,
  ShoppingCart, Star, Zap, Phone, Layers, Boxes,
  Receipt, Crown, Hourglass, Flame, Rocket, BookOpen,
  BadgeDollarSign, ClipboardCheck, WifiOff, Hash, BatteryCharging,
  Building2, GraduationCap, Keyboard, Printer, FileSpreadsheet, X,
  CheckCircle2, Cable, RotateCcw, PiggyBank, CalendarDays,
} from 'lucide-react';
import {
  ResponsiveContainer, AreaChart, Area, XAxis, YAxis, Tooltip, CartesianGrid,
  BarChart, Bar, PieChart, Pie, Cell, Legend,
} from 'recharts';
import { dashboardApi } from '@modules/dashboard/api/dashboard.api';
import { imeiApi } from '@industries/mobile/api/imei.api';
import { repairsApi } from '@industries/mobile/api/repairs.api';
import { usedPhonesApi } from '@industries/mobile/api/used-phones.api';
import { emiApi } from '@industries/mobile/api/emi.api';
import { mobileReportsApi, type ProfitSourceKey } from '@industries/mobile/api/mobile-reports.api';
import { toast } from 'sonner';
import { formatPKR } from '@core/lib/format';
import { Button } from '@core/ui/Button';
import { SubscriptionBanner } from '@modules/dashboard/components/SubscriptionBanner';
import { EmailVerifyBanner } from '@core/components/auth/EmailVerifyBanner';
import { useCostHidden, PrivacyToggle } from '@core/ui/HiddenValue';
import { useAuthStore } from '@core/stores/auth.store';
import { PrintStyles } from '@core/components/print/PrintStyles';

/* ═════════════════════════════════════════════════════════════
   NAFAA MOBILE DASHBOARD — FULL BEST (Final)
   ─────────────────────────────────────────────────────────────
   ✨ Perfect dark + light mode (proper contrast everywhere)
   📱 Fully responsive: mobile → tablet → desktop → 4K
   📊 Rich analytics: 7/30-day trend, hourly, P&L, payment split
   📱 Mobile-specific: IMEI, Used Phones, Repairs, EMI, PTA
   🔐 PIN-aware cost/profit hiding (HiddenValue)
   📡 Offline-aware (cached data + banner)
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
  CASH: Wallet,
  CARD: CreditCard,
  JAZZCASH: Zap,
  EASYPAISA: Activity,
  BANK_TRANSFER: Building2,
  CREDIT: BookOpen,
};

const formatPercent = (n: number) => `${n > 0 ? '+' : ''}${n.toFixed(1)}%`;
const formatDate = (v: string) =>
  new Intl.DateTimeFormat('en-PK', { dateStyle: 'medium', timeStyle: 'short' }).format(new Date(v));

type Range = 'today' | '7d' | '30d' | 'custom';

const RANGE_LABEL: Record<Range, string> = {
  today: 'Aaj',
  '7d': '7 Din',
  '30d': '30 Din',
  custom: 'Apni Tareekh',
};

/** Profit by source ke chaar raste — wahi rang jo poori app me hain. */
const SOURCE_META: Record<ProfitSourceKey, { label: string; icon: any; grad: string; chip: string }> = {
  NEW_PHONE:  { label: 'Naye Phone',  icon: Smartphone, grad: 'from-blue-600 to-indigo-700',    chip: 'bg-blue-100 text-blue-700 dark:bg-blue-500/15 dark:text-blue-300' },
  USED_PHONE: { label: 'Used Phone',  icon: RotateCcw,  grad: 'from-violet-600 to-fuchsia-700', chip: 'bg-violet-100 text-violet-700 dark:bg-violet-500/15 dark:text-violet-300' },
  ACCESSORY:  { label: 'Accessories', icon: Cable,      grad: 'from-emerald-600 to-teal-700',   chip: 'bg-emerald-100 text-emerald-700 dark:bg-emerald-500/15 dark:text-emerald-300' },
  REPAIR:     { label: 'Repair',      icon: Wrench,     grad: 'from-amber-600 to-orange-700',   chip: 'bg-amber-100 text-amber-700 dark:bg-amber-500/15 dark:text-amber-300' },
};
const SOURCE_ORDER: ProfitSourceKey[] = ['NEW_PHONE', 'USED_PHONE', 'ACCESSORY', 'REPAIR'];

const isoDay = (d: Date) => d.toISOString().slice(0, 10);

export default function MobileDashboard() {
  const hideCost = useCostHidden();
  const shopName = useAuthStore((s) => s.user?.assignedShop?.name);
  const userName = useAuthStore((s) => s.user?.fullName?.split(' ')[0] ?? 'Boss');
  // 30 din default — 7 din me aksar repair/used phone nazar hi nahi aate
  const [range, setRange] = useState<Range>('30d');
  const [customFrom, setCustomFrom] = useState(() => {
    const d = new Date(); d.setDate(d.getDate() - 7); return isoDay(d);
  });
  const [customTo, setCustomTo] = useState(() => isoDay(new Date()));
  const [showTeacher, setShowTeacher] = useState(false);
  const [showShortcuts, setShowShortcuts] = useState(false);

  /* ─── Data queries ─────────────────────────────────────── */
  const { data, refetch, isRefetching } = useQuery({
    queryKey: ['dashboard-overview'],
    queryFn: () => dashboardApi.overview(),
    refetchInterval: 60_000,
  });

  const { data: imeiStats } = useQuery({
    queryKey: ['imei-stats'],
    queryFn: () => imeiApi.stats(),
    refetchInterval: 60_000,
  });

  const { data: repairStats } = useQuery({
    queryKey: ['repair-stats'],
    queryFn: () => repairsApi.stats(),
    refetchInterval: 60_000,
  });

  const { data: usedPhonesStats } = useQuery({
    queryKey: ['used-phones-stats'],
    queryFn: () => usedPhonesApi.stats(),
    refetchInterval: 60_000,
  });

  const { data: emiStats } = useQuery({
    queryKey: ['emi-stats'],
    queryFn: () => emiApi.stats(),
    refetchInterval: 60_000,
  });

  /* ─── Kamai kis raste se aa rahi hai ─── */
  const profitRange = useMemo(() => {
    if (range === 'custom') return { from: customFrom, to: customTo };
    const to = new Date();
    const from = new Date();
    if (range === 'today') from.setHours(0, 0, 0, 0);
    else from.setDate(from.getDate() - (range === '30d' ? 30 : 7));
    return { from: from.toISOString(), to: to.toISOString() };
  }, [range, customFrom, customTo]);

  const { data: profitSplit } = useQuery({
    queryKey: ['mobile-profit-by-source', range, customFrom, customTo],
    queryFn: () => mobileReportsApi.profitBySource(profitRange),
  });

  /* ─── Keyboard: G guide • R refresh • ? shortcuts • Esc band ─── */
  useEffect(() => {
    const onKey = (e: KeyboardEvent) => {
      const tag = (e.target as HTMLElement)?.tagName;
      if (tag === 'INPUT' || tag === 'TEXTAREA' || tag === 'SELECT') return;
      if (e.key === 'Escape') {
        if (showShortcuts) return setShowShortcuts(false);
        if (showTeacher) return setShowTeacher(false);
        return;
      }
      if (e.ctrlKey || e.metaKey) return;
      if (e.key === 'g') setShowTeacher(true);
      if (e.key === 'r') refetch();
      if (e.key === '?') setShowShortcuts((v) => !v);
    };
    window.addEventListener('keydown', onKey);
    return () => window.removeEventListener('keydown', onKey);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [showTeacher, showShortcuts]);

  const anyModal = showTeacher || showShortcuts;
  useEffect(() => {
    const prev = document.body.style.overflow;
    document.body.style.overflow = anyModal ? 'hidden' : prev;
    return () => { document.body.style.overflow = prev; };
  }, [anyModal]);

  const stats = data?.stats;
  const mobileStats = data?.mobileStats;
  const tenant = data?.tenant;

  // Safe getters — never assume stats exist
  const s = stats ?? ({} as any);
  const ms = mobileStats ?? ({} as any);

  // ✅ Fix: slowMovers ko (data as any) se access karo
  const slowMovers = (data as any)?.slowMovers ?? [];

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

  const hourlyData = useMemo(() =>
    (data?.hourlySalesToday ?? [])
      .filter((h) => h.sales > 0 || (h.hour >= 8 && h.hour <= 22))
      .map((h) => ({
        ...h,
        label: h.hour === 0 ? '12A' : h.hour < 12 ? `${h.hour}A` : h.hour === 12 ? '12P' : `${h.hour - 12}P`,
      })), [data]);

  const chartData = range === '30d' ? trend30 : trend7;
  const growthYest = s.salesGrowthVsYesterday ?? 0;
  const growthMonth = s.salesGrowthVsLastMonth ?? 0;

  const paymentData = useMemo(() =>
    (data?.paymentBreakdown ?? []).map((p: any) => ({
      name: p.paymentMethod || p.method,
      value: p._sum?.total ?? p.total ?? 0,
      color: PAYMENT_COLORS[p.paymentMethod || p.method] || '#64748b',
    })).filter((p) => p.value > 0), [data]);

  const totalPayments = paymentData.reduce((sum, p) => sum + p.value, 0);

  const marginPct = s.salesMonth && s.salesMonth > 0
    ? ((s.netProfitMonth ?? 0) / s.salesMonth) * 100
    : 0;

  // Time-based greeting
  const hour = new Date().getHours();
  const greeting =
    hour < 5 ? { text: 'Late Night Grind', emoji: '🌙' } :
    hour < 12 ? { text: 'Subah Bakhair', emoji: '☀️' } :
    hour < 17 ? { text: 'Dopahar Bakhair', emoji: '🌤️' } :
    hour < 20 ? { text: 'Shaam Bakhair', emoji: '🌆' } :
                { text: 'Raat Bakhair', emoji: '🌙' };

  // PTA breakdown
  const ptaBreakdown = useMemo(() => {
    const map = new Map<string, number>();
    (imeiStats as any)?.byPtaStatus?.forEach((p: any) => {
      map.set(p.ptaStatus, p._count?._all ?? 0);
    });
    return Array.from(map.entries()).map(([status, count]) => ({
      status, count,
      color: status === 'APPROVED' ? '#10b981' : status === 'PENDING' ? '#f59e0b' : '#ef4444',
    }));
  }, [imeiStats]);

  const totalImeis = (imeiStats as any)?.total ?? 0;
  const inStockImeis = (imeiStats as any)?.inStock ?? 0;
  const soldImeis = (imeiStats as any)?.sold ?? 0;
  const stockValue = (imeiStats as any)?.stockValue ?? 0;

  const openRepairs = (repairStats as any)?.openTickets ?? 0;
  const usedPhonesInStock = (usedPhonesStats as any)?.inStock ?? 0;
  const activeEmiPlans = (emiStats as any)?.activePlans ?? 0;

  /* ─── CSV export ─── */
  const exportCsv = () => {
    const t = profitSplit?.totals;
    const rows: string[][] = [
      ['Nafaa — Mobile Dashboard', shopName ?? ''],
      [`Period: ${RANGE_LABEL[range]}`, new Date().toLocaleString('en-PK')],
      [],
      ['KAMAI KA RASTA', 'Bikri', 'Lagat', 'Munafa', 'Margin %', 'Units', 'Sales'],
      ...SOURCE_ORDER.map((k) => {
        const row = profitSplit?.sources.find((x) => x.key === k);
        return [
          SOURCE_META[k].label,
          String(Math.round(row?.revenue ?? 0)), String(Math.round(row?.cost ?? 0)),
          String(Math.round(row?.profit ?? 0)), (row?.margin ?? 0).toFixed(1),
          String(row?.units ?? 0), String(row?.sales ?? 0),
        ];
      }),
      ['TOTAL', String(Math.round(t?.revenue ?? 0)), String(Math.round(t?.cost ?? 0)),
       String(Math.round(t?.profit ?? 0)), (t?.margin ?? 0).toFixed(1),
       String(t?.units ?? 0), String(t?.salesCount ?? 0)],
      [],
      ['STOCK', 'Ginti'],
      ['IMEIs in stock', String(inStockImeis)],
      ['Used phones in stock', String(usedPhonesInStock)],
      ['Open repairs', String(openRepairs)],
      ['Active EMI plans', String(activeEmiPlans)],
    ];
    const csv = rows.map((r) => r.map((c) => `"${String(c).replace(/"/g, '""')}"`).join(',')).join('\n');
    const url = URL.createObjectURL(new Blob([csv], { type: 'text/csv;charset=utf-8;' }));
    const a = document.createElement('a');
    a.href = url;
    a.download = `mobile-dashboard-${isoDay(new Date())}.csv`;
    a.click();
    URL.revokeObjectURL(url);
    toast.success('CSV download ho gaya');
  };

  return (
    <div className="space-y-4 sm:space-y-6 pb-8 print:space-y-3">
      <PrintStyles orientation="portrait" title="Mobile Dashboard" subtitle="Aaj ka khulasa" />

      {showTeacher && <DashboardTeacher onClose={() => setShowTeacher(false)} />}
      {showShortcuts && <ShortcutsModal onClose={() => setShowShortcuts(false)} />}

      <SubscriptionBanner />
      <EmailVerifyBanner />

      {/* ═══════════════════════════════════════════════════════
          HERO — greeting + KPIs + actions
          ═══════════════════════════════════════════════════════ */}
      <section className="relative overflow-hidden rounded-2xl sm:rounded-3xl bg-gradient-to-br from-slate-950 via-blue-900 to-indigo-700 dark:from-slate-950 dark:via-blue-950 dark:to-indigo-900 text-white p-4 sm:p-6 shadow-2xl">
        {/* Glowing blobs */}
        <div className="absolute -top-32 -right-32 h-80 w-80 rounded-full bg-blue-400/30 blur-3xl pointer-events-none animate-pulse" />
        <div className="absolute -bottom-32 -left-32 h-80 w-80 rounded-full bg-amber-400/20 blur-3xl pointer-events-none" />
        <div className="absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 h-40 w-40 rounded-full bg-fuchsia-400/10 blur-3xl pointer-events-none" />

        <div className="relative flex flex-col sm:flex-row items-start justify-between gap-4">
          <div className="min-w-0 flex-1">
            <div className="inline-flex items-center gap-2 rounded-full bg-white/15 backdrop-blur-md px-3 py-1 text-[11px] font-extrabold border border-white/25 uppercase tracking-widest shadow-lg">
              <Smartphone className="h-3.5 w-3.5 text-amber-300" /> Mobile Dashboard
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
              <span className="text-cyan-200">{s.ordersToday ?? 0} sales</span>
              <span className="opacity-50 mx-2">•</span>
              <span className="text-amber-200">AOV {formatPKR(s.aovToday ?? 0)}</span>
            </p>
          </div>

          <div className="flex items-center gap-2 flex-wrap shrink-0">
            <PrivacyToggle compact />
            <button
              onClick={() => setShowTeacher(true)}
              className="h-11 px-3 rounded-xl bg-amber-400/90 hover:bg-amber-400 text-slate-900 text-xs font-extrabold inline-flex items-center gap-1.5 shadow-lg transition"
              title="Guide (G)"
            >
              <GraduationCap className="h-4 w-4" /> <span className="hidden sm:inline">Guide</span>
            </button>
            <button
              onClick={() => setShowShortcuts(true)}
              className="h-11 w-11 rounded-xl bg-white/10 hover:bg-white/20 border border-white/20 inline-flex items-center justify-center backdrop-blur-md transition"
              title="Shortcuts (?)"
            >
              <Keyboard className="h-4 w-4" />
            </button>
            <button
              onClick={() => refetch()}
              disabled={isRefetching}
              className="inline-flex items-center gap-2 rounded-xl bg-white/10 hover:bg-white/20 px-3 py-2.5 text-sm font-extrabold backdrop-blur-md disabled:opacity-50 border border-white/20 transition-all hover:scale-105"
              title="Refresh (R)"
            >
              <RefreshCw className={`h-4 w-4 ${isRefetching ? 'animate-spin' : ''}`} />
              <span className="hidden sm:inline">Refresh</span>
            </button>
            <button
              onClick={() => window.print()}
              className="h-11 px-3 rounded-xl bg-white/10 hover:bg-white/20 border border-white/20 text-xs font-extrabold inline-flex items-center gap-1.5 backdrop-blur-md transition"
            >
              <Printer className="h-4 w-4" /> <span className="hidden sm:inline">Print</span>
            </button>
            <button
              onClick={exportCsv}
              className="h-11 px-3 rounded-xl bg-white/10 hover:bg-white/20 border border-white/20 text-xs font-extrabold inline-flex items-center gap-1.5 backdrop-blur-md transition"
            >
              <FileSpreadsheet className="h-4 w-4" /> <span className="hidden sm:inline">CSV</span>
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
            icon={Smartphone}
            label="IMEIs In Stock"
            value={inStockImeis}
            sub={`${totalImeis} total registered`}
            tone="violet"
          />
          <HeroTile
            icon={Wrench}
            label="Open Repairs"
            value={openRepairs}
            sub="Tickets in queue"
            tone="amber"
            urgent={openRepairs > 0}
          />
        </div>
      </section>

      {/* ═══════════════════════════════════════════════════════
          MOBILE OPERATIONS — Used Phones + EMI + PTA
          ═══════════════════════════════════════════════════════ */}
      <section className="grid sm:grid-cols-2 lg:grid-cols-4 gap-2 sm:gap-3">
        <OpsCard to="/used-phones" icon={RefreshCw} title="Used Phones" desc={`${usedPhonesInStock} in stock`} tone="violet" />
        <OpsCard to="/emi-plans" icon={CreditCard} title="EMI Plans" desc={`${activeEmiPlans} active`} tone="pink" />
        <OpsCard to="/repair-tickets" icon={Wrench} title="Repairs" desc={`${openRepairs} open tickets`} tone="amber" />
        <OpsCard to="/imei-inventory" icon={ShieldCheck} title="IMEI Inventory" desc={`${inStockImeis} available`} tone="blue" />
      </section>

      {/* ═══════════════════════════════════════════════════════
          PAISA KAHAN SE — chaar raston ka munafa
          ═══════════════════════════════════════════════════════ */}
      <section className="rounded-2xl sm:rounded-3xl bg-white dark:bg-slate-900/80 dark:backdrop-blur-sm border-2 border-slate-200 dark:border-slate-800 shadow-sm overflow-hidden">
        <div className="px-4 sm:px-6 py-4 border-b-2 border-slate-100 dark:border-slate-800 flex items-center justify-between gap-3 flex-wrap bg-gradient-to-r from-emerald-50 to-teal-50 dark:from-emerald-500/10 dark:to-teal-500/10">
          <div className="flex items-center gap-3">
            <div className="h-10 w-10 rounded-2xl bg-gradient-to-br from-emerald-500 to-teal-600 text-white flex items-center justify-center shadow-lg shadow-emerald-500/40">
              <PiggyBank className="h-5 w-5" />
            </div>
            <div>
              <h3 className="font-extrabold text-slate-900 dark:text-white">Paisa Kahan Se Aa Raha Hai?</h3>
              <p className="text-xs text-slate-600 dark:text-slate-400 font-bold">
                {RANGE_LABEL[range]} · kul munafa{' '}
                <strong className="text-emerald-700 dark:text-emerald-400">
                  {hideCost ? '••••' : formatPKR(profitSplit?.totals.profit ?? 0)}
                </strong>
              </p>
            </div>
          </div>

          {/* Range picker — custom tareekh ke saath */}
          <div className="flex items-center gap-1.5 flex-wrap print:hidden">
            {(['today', '7d', '30d', 'custom'] as Range[]).map((r) => (
              <button
                key={r}
                onClick={() => setRange(r)}
                className={`h-9 px-3 rounded-lg text-xs font-extrabold transition border-2 inline-flex items-center gap-1 ${
                  range === r
                    ? 'bg-gradient-to-r from-emerald-600 to-teal-700 text-white border-transparent shadow'
                    : 'bg-white dark:bg-slate-800 border-slate-200 dark:border-slate-700 text-slate-600 dark:text-slate-300 hover:border-emerald-300'
                }`}
              >
                {r === 'custom' && <CalendarDays className="h-3.5 w-3.5" />}
                {RANGE_LABEL[r]}
              </button>
            ))}
          </div>
        </div>

        {range === 'custom' && (
          <div className="px-4 sm:px-6 py-3 border-b-2 border-slate-100 dark:border-slate-800 flex items-center gap-2 flex-wrap print:hidden">
            <label className="text-[10px] uppercase font-extrabold text-slate-500 dark:text-slate-400 tracking-wider">Se</label>
            <input
              type="date" value={customFrom} max={customTo}
              onChange={(e) => setCustomFrom(e.target.value)}
              className="h-10 rounded-xl border-2 border-slate-200 dark:border-slate-700 bg-white dark:bg-slate-800 px-3 text-sm font-bold text-slate-900 dark:text-white focus:outline-none focus:border-emerald-500 transition"
            />
            <label className="text-[10px] uppercase font-extrabold text-slate-500 dark:text-slate-400 tracking-wider">Tak</label>
            <input
              type="date" value={customTo} min={customFrom} max={isoDay(new Date())}
              onChange={(e) => setCustomTo(e.target.value)}
              className="h-10 rounded-xl border-2 border-slate-200 dark:border-slate-700 bg-white dark:bg-slate-800 px-3 text-sm font-bold text-slate-900 dark:text-white focus:outline-none focus:border-emerald-500 transition"
            />
          </div>
        )}

        <div className="p-4 sm:p-6 grid grid-cols-1 sm:grid-cols-2 xl:grid-cols-4 gap-3">
          {SOURCE_ORDER.map((key) => {
            const row = profitSplit?.sources.find((x) => x.key === key);
            const meta = SOURCE_META[key];
            const Icon = meta.icon;
            const total = profitSplit?.totals.profit ?? 0;
            const share = total > 0 && row ? (row.profit / total) * 100 : 0;
            return (
              <div key={key} className="rounded-2xl border-2 border-slate-200 dark:border-slate-700 p-3.5">
                <div className="flex items-center justify-between gap-2">
                  <div className="flex items-center gap-2 min-w-0">
                    <div className={`h-9 w-9 rounded-xl bg-gradient-to-br ${meta.grad} text-white flex items-center justify-center shadow shrink-0`}>
                      <Icon className="h-4 w-4" />
                    </div>
                    <div className="min-w-0">
                      <div className="font-extrabold text-slate-900 dark:text-white text-sm truncate">{meta.label}</div>
                      <div className="text-[10px] font-bold text-slate-500 dark:text-slate-400 tabular-nums">
                        {row?.units ?? 0} units
                      </div>
                    </div>
                  </div>
                  <span className={`px-1.5 py-0.5 rounded text-[10px] font-extrabold tabular-nums shrink-0 ${meta.chip}`}>
                    {(row?.margin ?? 0).toFixed(0)}%
                  </span>
                </div>

                <div className="mt-3 space-y-1 text-sm">
                  <div className="flex justify-between">
                    <span className="font-semibold text-slate-500 dark:text-slate-400">Bikri</span>
                    <span className="font-extrabold text-slate-900 dark:text-white tabular-nums">{formatPKR(row?.revenue ?? 0)}</span>
                  </div>
                  <div className="flex justify-between pt-1 border-t-2 border-slate-100 dark:border-slate-800">
                    <span className="font-extrabold text-slate-900 dark:text-white">Munafa</span>
                    <span className="font-extrabold text-emerald-700 dark:text-emerald-400 tabular-nums">
                      {hideCost ? '•••' : formatPKR(row?.profit ?? 0)}
                    </span>
                  </div>
                </div>

                <div className="mt-2.5">
                  <div className="flex justify-between text-[10px] font-bold text-slate-500 dark:text-slate-400 mb-1">
                    <span>Hissa</span>
                    <span className="tabular-nums">{share.toFixed(0)}%</span>
                  </div>
                  <div className="h-1.5 rounded-full bg-slate-100 dark:bg-slate-800 overflow-hidden">
                    <div className={`h-full bg-gradient-to-r ${meta.grad} transition-all`}
                      style={{ width: `${Math.max(Math.min(share, 100), 0)}%` }} />
                  </div>
                </div>
              </div>
            );
          })}
        </div>

        <div className="px-4 sm:px-6 pb-4 print:hidden">
          <Link to="/profit-report"
            className="inline-flex items-center gap-1.5 text-xs font-extrabold text-emerald-700 dark:text-emerald-400 hover:underline">
            Poori profit report dekho <ArrowRight className="h-3.5 w-3.5" />
          </Link>
        </div>
      </section>

      {/* ═══════════════════════════════════════════════════════
          ALERTS — sirf jab actually alerts hain
          ═══════════════════════════════════════════════════════ */}
      {((s.outOfStockCount ?? 0) > 0 ||
        (s.lowStockCount ?? 0) > 0 ||
        openRepairs > 0 ||
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
              <AlertCard to="/products?filter=out" icon={Package}
                title={`${s.outOfStockCount} Khatam`} desc="Restock karein" tone="rose" />
            )}
            {(s.lowStockCount ?? 0) > 0 && (
              <AlertCard to="/products?filter=low" icon={AlertTriangle}
                title={`${s.lowStockCount} Kam Stock`} desc="Reorder ka waqt" tone="amber" />
            )}
            {openRepairs > 0 && (
              <AlertCard to="/repair-tickets" icon={Wrench}
                title={`${openRepairs} Repairs`} desc="Open tickets" tone="blue" />
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
            icon={Activity}
            title="Sales Trend"
            subtitle={range === '30d' ? '30 din ka data' : '7 din ka data'}
            tone="blue"
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
                    <linearGradient id="mSales" x1="0" y1="0" x2="0" y2="1">
                      <stop offset="0%" stopColor="#3b82f6" stopOpacity={0.6} />
                      <stop offset="100%" stopColor="#3b82f6" stopOpacity={0} />
                    </linearGradient>
                    <linearGradient id="mProfit" x1="0" y1="0" x2="0" y2="1">
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
                  <Area type="monotone" dataKey="sales" name="Sales" stroke="#3b82f6" fill="url(#mSales)" strokeWidth={2.5} />
                  {!hideCost && <Area type="monotone" dataKey="profit" name="Profit" stroke="#10b981" fill="url(#mProfit)" strokeWidth={2} />}
                </AreaChart>
              </ResponsiveContainer>
            </div>
          ) : (
            <EmptyChart icon={Activity} message="Zyada sales data chahiye" />
          )}
          <ChartLegend items={[
            { color: '#3b82f6', label: 'Sales' },
            ...(!hideCost ? [{ color: '#10b981', label: 'Profit' }] : []),
          ]} />
        </Card>

        <Card>
          <CardHeader icon={Clock} title="Aaj Ke Peak Hours" subtitle="Kis waqt zyada bikta hai" tone="violet" />
          {hourlyData.length > 0 ? (
            <div className="h-[240px] sm:h-[300px]">
              <ResponsiveContainer width="100%" height="100%">
                <BarChart data={hourlyData} margin={{ top: 10, right: 8, left: -10, bottom: 0 }}>
                  <defs>
                    <linearGradient id="hourlyBar" x1="0" y1="0" x2="0" y2="1">
                      <stop offset="0%" stopColor="#a855f7" stopOpacity={1} />
                      <stop offset="100%" stopColor="#7c3aed" stopOpacity={0.7} />
                    </linearGradient>
                  </defs>
                  <CartesianGrid strokeDasharray="3 3" className="stroke-slate-200 dark:stroke-slate-700" opacity={0.4} />
                  <XAxis dataKey="label" className="fill-slate-500 dark:fill-slate-400" fontSize={9} interval={1} tickLine={false} axisLine={false} />
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
                    cursor={{ fill: 'rgba(168,85,247,0.1)' }}
                  />
                  <Bar dataKey="sales" fill="url(#hourlyBar)" radius={[8, 8, 0, 0]} />
                </BarChart>
              </ResponsiveContainer>
            </div>
          ) : (
            <EmptyChart icon={Clock} message="Aaj tak koi sale nahi" />
          )}
        </Card>
      </section>

      {/* ═══════════════════════════════════════════════════════
          IMEI + PTA STATUS PANEL
          ═══════════════════════════════════════════════════════ */}
      <section className="rounded-2xl sm:rounded-3xl bg-gradient-to-br from-blue-50 via-indigo-50 to-cyan-50 dark:from-blue-500/10 dark:via-indigo-500/10 dark:to-cyan-500/10 border-2 border-blue-200 dark:border-blue-500/40 p-4 sm:p-5 shadow-sm">
        <div className="flex items-center justify-between mb-4 flex-wrap gap-2">
          <div className="flex items-center gap-2">
            <div className="h-10 w-10 rounded-2xl bg-blue-600 text-white flex items-center justify-center shadow-lg shadow-blue-500/30">
              <ShieldCheck className="h-5 w-5" />
            </div>
            <div>
              <h3 className="font-extrabold text-blue-900 dark:text-blue-200 text-sm">IMEI Inventory</h3>
              <p className="text-[11px] text-blue-700 dark:text-blue-300/80 font-bold">Phone tracking snapshot</p>
            </div>
          </div>
          <div className="flex gap-2">
            <Link to="/imei-inventory">
              <Button variant="secondary" size="sm" className="font-extrabold">
                <Smartphone className="h-3.5 w-3.5" /> All IMEIs
              </Button>
            </Link>
            <Link to="/imei-inventory">
              <Button size="sm" className="bg-blue-600 hover:bg-blue-700 font-extrabold">
                <Activity className="h-3.5 w-3.5" /> Global View
              </Button>
            </Link>
          </div>
        </div>

        <div className="grid grid-cols-2 sm:grid-cols-4 gap-2 sm:gap-3">
          <MiniStat label="In Stock" value={inStockImeis} sub="Available to sell" tone="emerald" />
          <MiniStat label="Sold" value={soldImeis} sub="Lifetime sold" tone="blue" />
          <MiniStat label="Stock Value" value={hideCost ? '••••' : formatPKR(stockValue)} sub="Current inventory" tone="amber" />
          <MiniStat label="Returns/Damaged" value={(ms.returned ?? 0) + (ms.damaged ?? 0)} sub="Non-sellable" tone="rose" />
        </div>

        {ptaBreakdown.length > 0 && (
          <div className="mt-4 rounded-xl bg-white dark:bg-slate-800/60 border border-blue-200 dark:border-blue-500/30 p-3">
            <div className="text-xs font-extrabold text-blue-700 dark:text-blue-300 uppercase mb-2">PTA Status Breakdown</div>
            <div className="flex flex-wrap gap-2">
              {ptaBreakdown.map((p) => (
                <span key={p.status} className="px-2.5 py-1 rounded-lg text-xs font-extrabold inline-flex items-center gap-1.5" style={{ backgroundColor: `${p.color}20`, color: p.color, border: `1px solid ${p.color}40` }}>
                  <span className="h-2 w-2 rounded-full" style={{ backgroundColor: p.color }} />
                  {p.status}: {p.count}
                </span>
              ))}
            </div>
          </div>
        )}
      </section>

      {/* ═══════════════════════════════════════════════════════
          P&L + PAYMENT SPLIT (hidden if cost hidden)
          ═══════════════════════════════════════════════════════ */}
      {!hideCost && (
        <section className="grid lg:grid-cols-[1.5fr_1fr] gap-4 sm:gap-6">
          <Card>
            <CardHeader
              icon={Wallet}
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
              <PnLCell label="Revenue" value={formatPKR(s.salesMonth ?? 0)} sub={`${s.ordersMonth ?? 0} sales`} tone="emerald" icon={TrendingUp} />
              <PnLCell label="COGS" value={formatPKR(s.cogsMonth ?? 0)} sub="Phone/accessory cost" tone="rose" icon={TrendingDown} />
              <PnLCell label="Expenses" value={formatPKR(s.expensesMonth ?? 0)} sub="Rent, bills" tone="amber" icon={Wallet} />
              <PnLCell label="Net Profit" value={formatPKR(s.netProfitMonth ?? 0)} sub={`Margin ${marginPct.toFixed(1)}%`} tone="blue" icon={Target} highlight />
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
          QUICK ACTIONS — single unified grid
          ═══════════════════════════════════════════════════════ */}
      <section>
        <div className="flex items-center gap-2.5 mb-3">
          <div className="h-10 w-10 rounded-2xl bg-gradient-to-br from-blue-500 to-indigo-700 text-white flex items-center justify-center shadow-lg shadow-blue-500/40">
            <Rocket className="h-5 w-5" />
          </div>
          <div>
            <h3 className="text-base sm:text-lg font-extrabold text-slate-900 dark:text-white">Quick Actions 🚀</h3>
            <p className="text-xs text-slate-500 dark:text-slate-400 font-bold">Sab mobile features ek jaga</p>
          </div>
        </div>
        <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-4 xl:grid-cols-6 gap-2 sm:gap-3">
          <OpsCard to="/pos" icon={ShoppingCart} title="POS Counter" desc="Sale karo" tone="sky" primary />
          <OpsCard to="/mobile-products/new" icon={Plus} title="Add Product" desc="Naya phone" tone="emerald" />
          <OpsCard to="/products" icon={Package} title="Products" desc={`${s.totalProducts ?? 0} items`} tone="cyan" />
          <OpsCard to="/imei-inventory" icon={ShieldCheck} title="IMEI Inventory" desc={`${inStockImeis} available`} tone="blue" />
          <OpsCard to="/used-phones" icon={RefreshCw} title="Used Phones" desc={`${usedPhonesInStock} in stock`} tone="violet" />
          <OpsCard to="/repair-tickets" icon={Wrench} title="Repairs" desc={`${openRepairs} open`} tone="amber" />
          <OpsCard to="/emi-plans" icon={CreditCard} title="EMI Plans" desc={`${activeEmiPlans} active`} tone="pink" />
          <OpsCard to="/customers" icon={Users} title="Customers" desc={`${s.totalCustomers ?? 0} log`} tone="rose" />
          <OpsCard to="/khata" icon={BookOpen} title="Khata / Udhaar" desc={formatPKR(s.totalUdhaar ?? 0)} tone="orange" />
          <OpsCard to="/sales" icon={Receipt} title="Sales History" desc="Purani receipts" tone="indigo" />
          <OpsCard to="/mobile-reports" icon={Activity} title="Reports" desc="Analytics" tone="purple" />
          <OpsCard to="/products/bulk-import" icon={Zap} title="Bulk Import" desc="Excel/CSV" tone="teal" />
        </div>
      </section>

      {/* ═══════════════════════════════════════════════════════
          KPI STAT GRID (compact)
          ═══════════════════════════════════════════════════════ */}
      <section className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-6 gap-2 sm:gap-3">
        <StatCard title="Total Products" value={s.totalProducts ?? 0} icon={Package} tone="cyan" link="/products" />
        <StatCard title="Total IMEIs" value={totalImeis} icon={Smartphone} tone="blue" link="/imei-inventory" />
        <StatCard title="Used Phones" value={usedPhonesInStock} icon={RefreshCw} tone="violet" link="/used-phones" />
        <StatCard title="Customers" value={s.totalCustomers ?? 0} icon={Users} tone="pink" link="/customers" />
        <StatCard title="EMI Plans" value={activeEmiPlans} icon={CreditCard} tone="orange" link="/emi-plans" />
        <StatCard title="Repairs" value={openRepairs} icon={Wrench} tone="amber" link="/repairs" alert />
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
            <Link to="/mobile-reports" className="text-blue-700 dark:text-blue-400 text-xs font-extrabold inline-flex items-center gap-1 hover:underline">
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
                        <Smartphone className="h-4 w-4 text-slate-400 dark:text-slate-500" />
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
            {slowMovers.length === 0 ? (
              <div className="px-6 py-12 text-center">
                <div className="h-14 w-14 rounded-2xl bg-emerald-100 dark:bg-emerald-500/20 flex items-center justify-center mx-auto mb-3 shadow-sm">
                  <Star className="h-6 w-6 text-emerald-600 dark:text-emerald-400" />
                </div>
                <h4 className="font-extrabold text-slate-900 dark:text-white text-sm">Sab kuch chal raha hai! 🎉</h4>
                <p className="text-xs text-slate-600 dark:text-slate-400 mt-1 font-bold">Koi ruka hua product nahi</p>
              </div>
            ) : (
              slowMovers.slice(0, 8).map((p: any) => (
                <Link key={p.id} to={`/mobile-products/${p.id}`}
                  className="px-4 sm:px-6 py-3 flex items-center gap-3 hover:bg-slate-50 dark:hover:bg-slate-800/60 transition"
                >
                  <div className="h-10 w-10 rounded-xl bg-slate-100 dark:bg-slate-800 overflow-hidden flex items-center justify-center shrink-0 border border-slate-200 dark:border-slate-700">
                    {p.images?.[0]?.url ? (
                      <img src={p.images[0].url} alt="" loading="lazy" className="h-full w-full object-cover" />
                    ) : (
                      <Smartphone className="h-4 w-4 text-slate-400 dark:text-slate-500" />
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
            <Link to="/sales" className="text-blue-700 dark:text-blue-400 text-xs font-extrabold inline-flex items-center gap-1 hover:underline">
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
                          EMI/Udhaar: {formatPKR(sale.creditAmount)}
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
            <Link to="/products?filter=low" className="text-blue-700 dark:text-blue-400 text-xs font-extrabold inline-flex items-center gap-1 hover:underline">
              All <ArrowRight className="h-3.5 w-3.5" />
            </Link>
          </div>
          <div className="divide-y divide-slate-100 dark:divide-slate-800 max-h-[380px] overflow-y-auto">
            {data?.lowStockProducts?.length ? (
              data.lowStockProducts.slice(0, 8).map((p) => {
                const isOut = p.stock === 0;
                return (
                  <Link key={p.id} to={`/mobile-products/${p.id}`}
                    className="px-4 sm:px-6 py-3 flex items-center gap-3 hover:bg-slate-50 dark:hover:bg-slate-800/60 transition"
                  >
                    <div className={[
                      'h-10 w-10 rounded-xl overflow-hidden flex items-center justify-center shrink-0 border',
                      isOut ? 'bg-rose-100 dark:bg-rose-500/20 border-rose-200 dark:border-rose-500/30' : 'bg-amber-100 dark:bg-amber-500/20 border-amber-200 dark:border-amber-500/30',
                    ].join(' ')}>
                      {p.images?.[0]?.url ? (
                        <img src={p.images[0].url} alt="" loading="lazy" className="h-full w-full object-cover" />
                      ) : (
                        <Smartphone className={`h-4 w-4 ${isOut ? 'text-rose-700 dark:text-rose-300' : 'text-amber-700 dark:text-amber-300'}`} />
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


/* ═════════════════════════════════════════════════════════════
   GUIDE + SHORTCUTS
   ═════════════════════════════════════════════════════════════ */

function DashboardTeacher({ onClose }: { onClose: () => void }) {
  return (
    <div className="fixed inset-0 z-50 bg-black/60 backdrop-blur-sm flex items-end sm:items-center justify-center p-0 sm:p-4" onClick={onClose}>
      <div onClick={(e) => e.stopPropagation()}
        className="w-full sm:max-w-2xl bg-white dark:bg-slate-900 rounded-t-3xl sm:rounded-3xl shadow-2xl overflow-hidden max-h-[90vh] flex flex-col border-2 border-transparent dark:border-slate-800">
        <div className="px-5 py-4 bg-gradient-to-r from-amber-50 to-orange-50 dark:from-amber-500/15 dark:to-orange-500/15 border-b-2 border-amber-200 dark:border-amber-500/30 flex items-center justify-between shrink-0">
          <div className="flex items-center gap-3">
            <div className="h-10 w-10 rounded-xl bg-amber-500 text-white flex items-center justify-center shadow-lg">
              <GraduationCap className="h-5 w-5" />
            </div>
            <div>
              <div className="text-[10px] uppercase tracking-wider text-amber-700 dark:text-amber-300 font-extrabold">Guide</div>
              <h3 className="font-extrabold text-slate-900 dark:text-white">Dashboard Kaise Parhein?</h3>
            </div>
          </div>
          <button onClick={onClose} className="h-9 w-9 rounded-xl hover:bg-white dark:hover:bg-slate-800 flex items-center justify-center transition">
            <X className="h-4 w-4 text-slate-600 dark:text-slate-300" />
          </button>
        </div>

        <div className="flex-1 overflow-y-auto p-5 space-y-3.5">
          <GuideStep n={1} title="Upar ke chaar number"
            body="Aaj ki sales, aaj ka profit, stock me kitne phone (IMEI), aur kitne repair khule hain. Profit par taala laga ho to PIN se kholo."
            tips={['Profit lagat kaat kar dikhaya jata hai', 'Repair ka number laal ho to foran dekho']} />
          <GuideStep n={2} title="Paisa kahan se aa raha hai"
            body="Mobile shop ki kamai chaar raston se aati hai — naye phone, used phone, accessories aur repair. Har card batata hai kitni bikri hui, kitna munafa bacha, aur kul munafe me uska kitna hissa hai."
            tips={['Apni tareekh chun kar kisi bhi arse ka hisab dekho', 'Repair ki kamai ab khud shamil hoti hai — delivery par sale banti hai']} />
          <GuideStep n={3} title="Alerts"
            body="Kam stock, late EMI qisten aur purane repair tickets — ye sab upar alert bar me aate hain. Ek click par us page par pahunch jao."
            tips={['Alert tabhi dikhta hai jab waqai koi masla ho']} />
          <GuideStep n={4} title="Nikalo aur bhejo"
            body="Print se poora dashboard chhap sakte ho, CSV se Excel me le ja sakte ho — dono upar right me hain."
            tips={['CSV me chaaron raston ka poora hisab aata hai']} />
        </div>

        <div className="px-5 py-3.5 border-t-2 border-slate-100 dark:border-slate-800 bg-slate-50 dark:bg-slate-800/50 text-right shrink-0">
          <Button onClick={onClose} className="bg-gradient-to-r from-amber-500 to-orange-600 font-extrabold shadow-lg shadow-amber-500/30">
            <CheckCircle2 className="h-4 w-4" /> Samajh Gaya
          </Button>
        </div>
      </div>
    </div>
  );
}

function GuideStep({ n, title, body, tips }: any) {
  return (
    <div className="rounded-xl border-2 border-slate-200 dark:border-slate-700 bg-slate-50 dark:bg-slate-800/50 p-3.5">
      <div className="flex items-start gap-3">
        <div className="h-8 w-8 rounded-lg bg-gradient-to-br from-blue-500 to-indigo-600 text-white flex items-center justify-center font-extrabold text-sm shrink-0 shadow-md">
          {n}
        </div>
        <div className="flex-1 min-w-0">
          <div className="font-extrabold text-slate-900 dark:text-white">{title}</div>
          <div className="text-xs font-semibold text-slate-600 dark:text-slate-300 mt-1 leading-relaxed">{body}</div>
          {tips && (
            <ul className="mt-2 space-y-1">
              {tips.map((t: string, i: number) => (
                <li key={i} className="text-[11px] font-semibold text-slate-500 dark:text-slate-400 flex items-start gap-1.5">
                  <Sparkles className="h-2.5 w-2.5 text-amber-500 shrink-0 mt-0.5" /> {t}
                </li>
              ))}
            </ul>
          )}
        </div>
      </div>
    </div>
  );
}

function ShortcutsModal({ onClose }: { onClose: () => void }) {
  const sc = [
    ['G', 'Guide kholo'],
    ['R', 'Refresh'],
    ['?', 'Ye list'],
    ['Esc', 'Band karo'],
  ];
  return (
    <div className="fixed inset-0 z-50 bg-black/60 backdrop-blur-sm flex items-center justify-center p-4" onClick={onClose}>
      <div onClick={(e) => e.stopPropagation()}
        className="w-full max-w-md bg-white dark:bg-slate-900 rounded-3xl shadow-2xl overflow-hidden border-2 border-slate-200 dark:border-slate-700">
        <div className="px-5 py-4 border-b-2 border-slate-100 dark:border-slate-800 flex items-center justify-between">
          <div className="flex items-center gap-2">
            <div className="h-9 w-9 rounded-xl bg-blue-100 dark:bg-blue-500/20 text-blue-700 dark:text-blue-300 flex items-center justify-center">
              <Keyboard className="h-4 w-4" />
            </div>
            <h3 className="font-extrabold text-slate-900 dark:text-white">Keyboard Shortcuts</h3>
          </div>
          <button onClick={onClose} className="h-9 w-9 rounded-xl hover:bg-slate-100 dark:hover:bg-slate-800 flex items-center justify-center transition">
            <X className="h-4 w-4 text-slate-600 dark:text-slate-300" />
          </button>
        </div>
        <div className="p-5 space-y-2">
          {sc.map(([key, desc]) => (
            <div key={key} className="flex items-center justify-between text-sm">
              <span className="font-semibold text-slate-700 dark:text-slate-300">{desc}</span>
              <kbd className="px-2.5 py-1 rounded-lg bg-slate-100 dark:bg-slate-800 border-2 border-slate-200 dark:border-slate-700 font-mono text-xs font-extrabold text-slate-700 dark:text-slate-200">
                {key}
              </kbd>
            </div>
          ))}
        </div>
      </div>
    </div>
  );
}

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
    blue:    'from-blue-500 to-indigo-600',
    violet:  'from-violet-500 to-purple-600',
    emerald: 'from-emerald-500 to-teal-600',
    pink:    'from-pink-500 to-rose-600',
    amber:   'from-amber-500 to-orange-600',
  };
  return (
    <div className="flex items-center justify-between mb-4 gap-2 flex-wrap">
      <div className="flex items-center gap-2.5 min-w-0">
        <div className={`h-9 w-9 rounded-xl bg-gradient-to-br ${tones[tone] ?? tones.blue} text-white flex items-center justify-center shadow-md shrink-0`}>
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
        ? 'bg-gradient-to-br from-blue-50 to-indigo-50 dark:from-blue-500/15 dark:to-indigo-500/15 border-blue-300 dark:border-blue-500/40 shadow-lg dark:shadow-blue-500/20'
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
      {alert && value > 0 && (
        <span className="absolute -top-1 -right-1 h-3 w-3 rounded-full bg-rose-500 animate-ping" />
      )}
      <div className="flex items-center justify-between gap-2">
        <div className="min-w-0 flex-1">
          <div className="text-[10px] uppercase tracking-wider text-slate-600 dark:text-slate-400 font-extrabold">{title}</div>
          <div className="mt-1 text-lg sm:text-2xl font-extrabold text-slate-900 dark:text-white tabular-nums truncate">{value}</div>
          {sub && <div className="text-[10px] text-slate-600 dark:text-slate-400 font-bold mt-0.5 truncate">{sub}</div>}
        </div>
        <div className={`h-10 w-10 rounded-2xl bg-gradient-to-br ${tones[tone] ?? tones.blue} text-white flex items-center justify-center shadow-md shrink-0`}>
          <Icon className="h-4 w-4 sm:h-5 sm:w-5" />
        </div>
      </div>
    </div>
  );
  return link ? <Link to={link}>{inner}</Link> : inner;
}

function MiniStat({ label, value, sub, tone }: any) {
  const tones: Record<string, string> = {
    emerald: 'text-emerald-700 dark:text-emerald-400',
    blue:    'text-blue-700 dark:text-blue-400',
    amber:   'text-amber-700 dark:text-amber-400',
    rose:    'text-rose-700 dark:text-rose-400',
  };
  return (
    <div className="rounded-2xl bg-white dark:bg-slate-800/60 border-2 border-slate-200 dark:border-slate-700 p-3">
      <div className="text-[10px] uppercase font-extrabold text-slate-500 dark:text-slate-400">{label}</div>
      <div className={`text-2xl font-extrabold tabular-nums mt-1 ${tones[tone]}`}>{value}</div>
      <div className="text-[10px] font-bold text-slate-500 dark:text-slate-400">{sub}</div>
    </div>
  );
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