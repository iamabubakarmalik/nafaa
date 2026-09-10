// apps/web/src/industries/mobile/pages/MobileProfitReportPage.tsx
import { useState, useMemo } from 'react';
import { useQuery } from '@tanstack/react-query';
import {
  ResponsiveContainer, BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip,
  PieChart, Pie, Cell, Legend,
} from 'recharts';
import {
  TrendingUp, Smartphone, RefreshCw as RefreshIcon, Cable, Wrench, Search,
  Printer, FileSpreadsheet, PiggyBank, Percent, ShoppingBag, Crown,
  ArrowUpRight, ArrowDownRight, AlertCircle, BarChart3, Package,
} from 'lucide-react';
import { toast } from 'sonner';
import { Button } from '@core/ui/Button';
import { formatPKR } from '@core/lib/format';
import { useAuthStore } from '@core/stores/auth.store';
import { useCostHidden, PrivacyToggle } from '@core/ui/HiddenValue';
import { PrintStyles } from '@core/components/print/PrintStyles';
import {
  mobileReportsApi,
  type ProfitSourceKey,
  type ProfitByProductRow,
} from '../api/mobile-reports.api';

/* ═════════════════════════════════════════════════════════════
   NAFAA MOBILE — PROFIT REPORT
   ─────────────────────────────────────────────────────────────
   Mobile shop ki kamai 4 raston se aati hai. Ye report batati hai
   asli paisa kahan se ban raha hai — naya phone, used phone,
   accessory ya repair.
   📊 Source split + daily trend + top models
   🖨️ Print + CSV export • 🌗 Dark/light • 📱 Mobile → 4K
   ═════════════════════════════════════════════════════════════ */

type Period = 'today' | 'week' | 'month' | 'quarter' | 'year';

const PERIODS: { value: Period; label: string; emoji: string; days: number }[] = [
  { value: 'today', label: 'Aaj', emoji: '📅', days: 0 },
  { value: 'week', label: '7 Din', emoji: '📆', days: 7 },
  { value: 'month', label: '30 Din', emoji: '🗓️', days: 30 },
  { value: 'quarter', label: '3 Mahine', emoji: '📊', days: 90 },
  { value: 'year', label: '1 Saal', emoji: '📈', days: 365 },
];

const SOURCE_META: Record<ProfitSourceKey, {
  label: string; icon: any; color: string;
  chip: string; ring: string; grad: string;
}> = {
  NEW_PHONE: {
    label: 'Naye Phone', icon: Smartphone, color: '#2563eb',
    chip: 'bg-blue-100 text-blue-700 dark:bg-blue-500/15 dark:text-blue-300',
    ring: 'border-blue-200 dark:border-blue-500/30',
    grad: 'from-blue-600 to-indigo-700',
  },
  USED_PHONE: {
    label: 'Used Phone', icon: RefreshIcon, color: '#7c3aed',
    chip: 'bg-violet-100 text-violet-700 dark:bg-violet-500/15 dark:text-violet-300',
    ring: 'border-violet-200 dark:border-violet-500/30',
    grad: 'from-violet-600 to-fuchsia-700',
  },
  ACCESSORY: {
    label: 'Accessories', icon: Cable, color: '#059669',
    chip: 'bg-emerald-100 text-emerald-700 dark:bg-emerald-500/15 dark:text-emerald-300',
    ring: 'border-emerald-200 dark:border-emerald-500/30',
    grad: 'from-emerald-600 to-teal-700',
  },
  REPAIR: {
    label: 'Repair', icon: Wrench, color: '#d97706',
    chip: 'bg-amber-100 text-amber-700 dark:bg-amber-500/15 dark:text-amber-300',
    ring: 'border-amber-200 dark:border-amber-500/30',
    grad: 'from-amber-600 to-orange-700',
  },
};

const SOURCE_ORDER: ProfitSourceKey[] = ['NEW_PHONE', 'USED_PHONE', 'ACCESSORY', 'REPAIR'];

type SortBy = 'profit' | 'margin' | 'revenue' | 'units';

const rangeFor = (period: Period) => {
  const to = new Date();
  const from = new Date();
  const days = PERIODS.find((p) => p.value === period)?.days ?? 30;
  if (days === 0) from.setHours(0, 0, 0, 0);
  else from.setDate(from.getDate() - days);
  return { from: from.toISOString(), to: to.toISOString() };
};

const shortDate = (iso: string) =>
  new Intl.DateTimeFormat('en-PK', { day: 'numeric', month: 'short' }).format(new Date(iso));

export default function MobileProfitReportPage() {
  const hideCost = useCostHidden();
  const tenantName = useAuthStore((s: any) => s.tenant?.name);
  const shopName = useAuthStore((s: any) => s.user?.assignedShop?.name);

  const [period, setPeriod] = useState<Period>('month');
  const [search, setSearch] = useState('');
  const [sortBy, setSortBy] = useState<SortBy>('profit');

  const range = useMemo(() => rangeFor(period), [period]);

  const { data, isLoading, refetch, isRefetching } = useQuery({
    queryKey: ['mobile-profit-by-source', period],
    queryFn: () => mobileReportsApi.profitBySource(range),
  });

  const sources = data?.sources ?? [];
  const totals = data?.totals;

  const sourceMap = useMemo(
    () => Object.fromEntries(sources.map((s) => [s.key, s])) as Record<ProfitSourceKey, typeof sources[number]>,
    [sources],
  );

  /* Sab se zyada munafa dene wala rasta */
  const bestSource = useMemo(() => {
    if (sources.length === 0) return null;
    return [...sources].sort((a, b) => b.profit - a.profit)[0];
  }, [sources]);

  const pieData = useMemo(
    () => sources.filter((s) => s.profit > 0).map((s) => ({
      name: SOURCE_META[s.key].label,
      value: Math.round(s.profit),
      color: SOURCE_META[s.key].color,
    })),
    [sources],
  );

  const trend = useMemo(
    () => (data?.daily ?? []).map((d) => ({
      date: shortDate(d.date),
      Revenue: Math.round(d.revenue),
      Profit: Math.round(d.profit),
    })),
    [data],
  );

  const products = useMemo(() => {
    let rows: ProfitByProductRow[] = data?.topProducts ?? [];
    const q = search.toLowerCase().trim();
    if (q) {
      rows = rows.filter(
        (r) => r.name.toLowerCase().includes(q) || (r.brand ?? '').toLowerCase().includes(q),
      );
    }
    return [...rows].sort((a, b) => {
      if (sortBy === 'margin') return b.margin - a.margin;
      if (sortBy === 'revenue') return b.revenue - a.revenue;
      if (sortBy === 'units') return b.units - a.units;
      return b.profit - a.profit;
    });
  }, [data, search, sortBy]);

  /* ─── Export ─── */
  const exportCsv = () => {
    if (!data) return;
    const rows: string[][] = [
      [`${tenantName ?? 'Nafaa'} — Mobile Profit Report`],
      [`Shop: ${shopName ?? 'All'}`, `Period: ${PERIODS.find((p) => p.value === period)?.label}`],
      [],
      ['SOURCE', 'Revenue', 'Cost', 'Profit', 'Margin %', 'Units', 'Sales'],
      ...SOURCE_ORDER.map((k) => {
        const s = sourceMap[k];
        return s
          ? [SOURCE_META[k].label, s.revenue.toFixed(0), s.cost.toFixed(0), s.profit.toFixed(0), s.margin.toFixed(1), String(s.units), String(s.sales)]
          : [SOURCE_META[k].label, '0', '0', '0', '0', '0', '0'];
      }),
      [],
      ['TOTAL', String(totals?.revenue.toFixed(0) ?? 0), String(totals?.cost.toFixed(0) ?? 0), String(totals?.profit.toFixed(0) ?? 0), String(totals?.margin.toFixed(1) ?? 0), String(totals?.units ?? 0), String(totals?.salesCount ?? 0)],
      [],
      ['TOP MODELS', 'Brand', 'Units', 'Revenue', 'Cost', 'Profit', 'Margin %'],
      ...products.map((p) => [p.name, p.brand ?? '', String(p.units), p.revenue.toFixed(0), p.cost.toFixed(0), p.profit.toFixed(0), p.margin.toFixed(1)]),
    ];
    const csv = rows.map((r) => r.map((c) => `"${String(c).replace(/"/g, '""')}"`).join(',')).join('\n');
    const url = URL.createObjectURL(new Blob([csv], { type: 'text/csv;charset=utf-8;' }));
    const a = document.createElement('a');
    a.href = url;
    a.download = `mobile-profit-${period}-${new Date().toISOString().slice(0, 10)}.csv`;
    a.click();
    URL.revokeObjectURL(url);
    toast.success('CSV download ho gaya');
  };

  /* ─── Loading ─── */
  if (isLoading) {
    return (
      <div className="space-y-4">
        <div className="h-40 rounded-3xl bg-slate-200 dark:bg-slate-800 animate-pulse" />
        <div className="grid grid-cols-2 lg:grid-cols-4 gap-3">
          {Array.from({ length: 4 }).map((_, i) => (
            <div key={i} className="h-32 rounded-2xl bg-slate-200 dark:bg-slate-800 animate-pulse" />
          ))}
        </div>
        <div className="h-72 rounded-3xl bg-slate-200 dark:bg-slate-800 animate-pulse" />
      </div>
    );
  }

  const noData = !totals || totals.salesCount === 0;

  return (
    <div className="space-y-4 sm:space-y-5 pb-10 print:space-y-3">
      <PrintStyles orientation="portrait" title="Profit Report" subtitle="Paisa kahan se ban raha hai" />

      {/* ═══ HERO ═══ */}
      <section className="relative overflow-hidden rounded-2xl sm:rounded-3xl bg-gradient-to-br from-slate-950 via-emerald-900 to-teal-700 dark:from-slate-950 dark:via-emerald-950 dark:to-teal-900 text-white p-4 sm:p-6 shadow-2xl">
        <div className="absolute -top-24 -right-24 h-72 w-72 rounded-full bg-emerald-400/25 blur-3xl pointer-events-none" />
        <div className="absolute -bottom-24 -left-24 h-72 w-72 rounded-full bg-teal-400/20 blur-3xl pointer-events-none" />

        <div className="relative">
          <div className="flex items-start justify-between gap-4 flex-wrap">
            <div className="min-w-0">
              <div className="inline-flex items-center gap-2 rounded-full bg-white/15 backdrop-blur-md px-3 py-1 text-[11px] font-extrabold border border-white/25 uppercase tracking-widest shadow-lg">
                <PiggyBank className="h-3.5 w-3.5 text-emerald-300" /> Mobile Profit
              </div>
              <h1 className="mt-3 text-2xl sm:text-3xl font-extrabold">Paisa kahan se ban raha hai?</h1>
              <p className="mt-1 text-xs sm:text-sm font-semibold text-white/80">
                {shopName ? `${shopName} · ` : ''}
                {PERIODS.find((p) => p.value === period)?.label}
              </p>
            </div>

            <div className="flex items-center gap-1.5 flex-wrap print:hidden">
              <PrivacyToggle />
              <button
                onClick={() => refetch()}
                disabled={isRefetching}
                className="h-10 w-10 rounded-xl bg-white/15 hover:bg-white/25 border border-white/25 flex items-center justify-center transition disabled:opacity-50"
                title="Refresh"
              >
                <RefreshIcon className={`h-4 w-4 ${isRefetching ? 'animate-spin' : ''}`} />
              </button>
              <button
                onClick={exportCsv}
                className="h-10 px-3 rounded-xl bg-white/15 hover:bg-white/25 border border-white/25 text-xs font-extrabold inline-flex items-center gap-1.5 transition"
              >
                <FileSpreadsheet className="h-4 w-4" /> CSV
              </button>
              <button
                onClick={() => window.print()}
                className="h-10 px-3 rounded-xl bg-white/15 hover:bg-white/25 border border-white/25 text-xs font-extrabold inline-flex items-center gap-1.5 transition"
              >
                <Printer className="h-4 w-4" /> Print
              </button>
            </div>
          </div>

          {/* Big numbers */}
          <div className="mt-5 grid grid-cols-2 lg:grid-cols-4 gap-3">
            <HeroStat label="Kul Bikri" value={formatPKR(totals?.revenue ?? 0)} icon={ShoppingBag} />
            <HeroStat
              label="Kul Munafa"
              value={hideCost ? '•••••' : formatPKR(totals?.profit ?? 0)}
              icon={TrendingUp}
              accent
            />
            <HeroStat
              label="Margin"
              value={hideCost ? '••%' : `${(totals?.margin ?? 0).toFixed(1)}%`}
              icon={Percent}
            />
            <HeroStat label="Sales" value={String(totals?.salesCount ?? 0)} icon={BarChart3} />
          </div>

          {bestSource && bestSource.profit > 0 && (
            <div className="mt-4 inline-flex items-center gap-2 rounded-xl bg-white/15 backdrop-blur border border-white/25 px-3 py-2 text-xs sm:text-sm font-bold">
              <Crown className="h-4 w-4 text-amber-300 shrink-0" />
              Sab se zyada munafa: <strong>{SOURCE_META[bestSource.key].label}</strong>
              {!hideCost && <span className="text-emerald-200">{formatPKR(bestSource.profit)}</span>}
            </div>
          )}
        </div>
      </section>

      {/* ═══ PERIOD ═══ */}
      <div className="flex gap-1.5 overflow-x-auto pb-1 print:hidden">
        {PERIODS.map((p) => (
          <button
            key={p.value}
            onClick={() => setPeriod(p.value)}
            className={`shrink-0 h-10 px-3.5 rounded-xl text-xs font-extrabold transition border-2 ${
              period === p.value
                ? 'bg-gradient-to-r from-emerald-600 to-teal-700 text-white border-transparent shadow-lg shadow-emerald-500/30'
                : 'bg-white dark:bg-slate-900 border-slate-200 dark:border-slate-700 text-slate-600 dark:text-slate-300 hover:border-emerald-300 dark:hover:border-emerald-500/40'
            }`}
          >
            <span className="mr-1">{p.emoji}</span>{p.label}
          </button>
        ))}
      </div>

      {noData ? (
        <div className="rounded-3xl bg-white dark:bg-slate-900/80 border-2 border-slate-200 dark:border-slate-800 p-14 text-center">
          <div className="mx-auto h-16 w-16 rounded-3xl bg-slate-100 dark:bg-slate-800 flex items-center justify-center mb-3">
            <AlertCircle className="h-8 w-8 text-slate-400" />
          </div>
          <h3 className="font-extrabold text-slate-900 dark:text-white text-lg">Is arse me koi sale nahi</h3>
          <p className="text-xs text-slate-500 dark:text-slate-400 mt-1 font-semibold">
            Doosra period chuno, ya POS se pehli sale karo
          </p>
        </div>
      ) : (
        <>
          {/* ═══ 4 SOURCES ═══ */}
          <div className="grid grid-cols-1 sm:grid-cols-2 xl:grid-cols-4 gap-3">
            {SOURCE_ORDER.map((key) => {
              const s = sourceMap[key];
              const meta = SOURCE_META[key];
              const Icon = meta.icon;
              const shareOfProfit =
                totals && totals.profit > 0 && s ? (s.profit / totals.profit) * 100 : 0;
              return (
                <div
                  key={key}
                  className={`rounded-2xl bg-white dark:bg-slate-900/80 dark:backdrop-blur-sm border-2 ${meta.ring} shadow-sm p-4 flex flex-col`}
                >
                  <div className="flex items-center justify-between gap-2">
                    <div className="flex items-center gap-2 min-w-0">
                      <div className={`h-10 w-10 rounded-xl bg-gradient-to-br ${meta.grad} text-white flex items-center justify-center shadow-lg shrink-0`}>
                        <Icon className="h-5 w-5" />
                      </div>
                      <div className="min-w-0">
                        <div className="font-extrabold text-slate-900 dark:text-white text-sm truncate">
                          {meta.label}
                        </div>
                        <div className="text-[10px] font-bold text-slate-500 dark:text-slate-400 tabular-nums">
                          {s?.units ?? 0} units · {s?.sales ?? 0} sales
                        </div>
                      </div>
                    </div>
                    <span className={`px-1.5 py-0.5 rounded text-[10px] font-extrabold tabular-nums shrink-0 ${meta.chip}`}>
                      {(s?.margin ?? 0).toFixed(0)}%
                    </span>
                  </div>

                  <div className="mt-3 space-y-1.5 text-sm">
                    <div className="flex justify-between">
                      <span className="font-semibold text-slate-500 dark:text-slate-400">Bikri</span>
                      <span className="font-extrabold text-slate-900 dark:text-white tabular-nums">
                        {formatPKR(s?.revenue ?? 0)}
                      </span>
                    </div>
                    <div className="flex justify-between">
                      <span className="font-semibold text-slate-500 dark:text-slate-400">Lagat</span>
                      <span className="font-bold text-slate-600 dark:text-slate-300 tabular-nums">
                        {hideCost ? '•••' : formatPKR(s?.cost ?? 0)}
                      </span>
                    </div>
                    <div className="flex justify-between pt-1.5 border-t-2 border-slate-100 dark:border-slate-800">
                      <span className="font-extrabold text-slate-900 dark:text-white">Munafa</span>
                      <span className={`font-extrabold tabular-nums ${(s?.profit ?? 0) >= 0 ? 'text-emerald-700 dark:text-emerald-400' : 'text-rose-600 dark:text-rose-400'}`}>
                        {hideCost ? '•••' : formatPKR(s?.profit ?? 0)}
                      </span>
                    </div>
                  </div>

                  {/* Share of total profit */}
                  <div className="mt-3">
                    <div className="flex justify-between text-[10px] font-bold text-slate-500 dark:text-slate-400 mb-1">
                      <span>Kul munafe ka hissa</span>
                      <span className="tabular-nums">{shareOfProfit.toFixed(0)}%</span>
                    </div>
                    <div className="h-1.5 rounded-full bg-slate-100 dark:bg-slate-800 overflow-hidden">
                      <div
                        className={`h-full bg-gradient-to-r ${meta.grad} transition-all`}
                        style={{ width: `${Math.max(Math.min(shareOfProfit, 100), 0)}%` }}
                      />
                    </div>
                  </div>
                </div>
              );
            })}
          </div>

          {/* ═══ CHARTS ═══ */}
          <div className="grid lg:grid-cols-[1fr_360px] gap-3 items-start">
            {/* Daily trend */}
            <div className="rounded-2xl sm:rounded-3xl bg-white dark:bg-slate-900/80 dark:backdrop-blur-sm border-2 border-slate-200 dark:border-slate-800 shadow-sm p-4 sm:p-5">
              <div className="flex items-center gap-2 mb-4">
                <div className="h-9 w-9 rounded-xl bg-emerald-100 dark:bg-emerald-500/20 text-emerald-700 dark:text-emerald-300 flex items-center justify-center">
                  <BarChart3 className="h-5 w-5" />
                </div>
                <h3 className="font-extrabold text-slate-900 dark:text-white">Rozana Bikri aur Munafa</h3>
              </div>
              <div className="h-72 w-full">
                <ResponsiveContainer width="100%" height="100%">
                  <BarChart data={trend} margin={{ top: 4, right: 8, left: -12, bottom: 0 }}>
                    <CartesianGrid strokeDasharray="3 3" className="stroke-slate-200 dark:stroke-slate-800" vertical={false} />
                    <XAxis dataKey="date" tick={{ fontSize: 11, fontWeight: 700 }} className="fill-slate-500" tickLine={false} axisLine={false} />
                    <YAxis tick={{ fontSize: 11, fontWeight: 700 }} className="fill-slate-500" tickLine={false} axisLine={false} width={56}
                      tickFormatter={(v: number) => (v >= 1000 ? `${Math.round(v / 1000)}k` : String(v))} />
                    <Tooltip
                      formatter={(v: any, n: any) => [formatPKR(Number(v)), n]}
                      contentStyle={{ borderRadius: 12, border: '2px solid #e2e8f0', fontWeight: 700, fontSize: 12 }}
                    />
                    <Legend wrapperStyle={{ fontSize: 12, fontWeight: 700 }} />
                    <Bar dataKey="Revenue" fill="#94a3b8" radius={[6, 6, 0, 0]} />
                    <Bar dataKey="Profit" fill="#10b981" radius={[6, 6, 0, 0]} />
                  </BarChart>
                </ResponsiveContainer>
              </div>
            </div>

            {/* Profit share pie */}
            <div className="rounded-2xl sm:rounded-3xl bg-white dark:bg-slate-900/80 dark:backdrop-blur-sm border-2 border-slate-200 dark:border-slate-800 shadow-sm p-4 sm:p-5">
              <div className="flex items-center gap-2 mb-4">
                <div className="h-9 w-9 rounded-xl bg-violet-100 dark:bg-violet-500/20 text-violet-700 dark:text-violet-300 flex items-center justify-center">
                  <PiggyBank className="h-5 w-5" />
                </div>
                <h3 className="font-extrabold text-slate-900 dark:text-white">Munafe ka Hissa</h3>
              </div>
              {pieData.length === 0 ? (
                <div className="h-64 flex items-center justify-center text-center">
                  <p className="text-sm font-semibold text-slate-500 dark:text-slate-400">
                    Is arse me koi munafa record nahi hua
                  </p>
                </div>
              ) : (
                <div className="h-64 w-full">
                  <ResponsiveContainer width="100%" height="100%">
                    <PieChart>
                      <Pie data={pieData} dataKey="value" nameKey="name" innerRadius={52} outerRadius={88} paddingAngle={3}>
                        {pieData.map((d) => <Cell key={d.name} fill={d.color} />)}
                      </Pie>
                      <Tooltip
                        formatter={(v: any, n: any) => [formatPKR(Number(v)), n]}
                        contentStyle={{ borderRadius: 12, border: '2px solid #e2e8f0', fontWeight: 700, fontSize: 12 }}
                      />
                      <Legend wrapperStyle={{ fontSize: 11, fontWeight: 700 }} />
                    </PieChart>
                  </ResponsiveContainer>
                </div>
              )}
            </div>
          </div>

          {/* ═══ TOP MODELS ═══ */}
          <div className="rounded-2xl sm:rounded-3xl bg-white dark:bg-slate-900/80 dark:backdrop-blur-sm border-2 border-slate-200 dark:border-slate-800 shadow-sm overflow-hidden">
            <div className="p-4 sm:p-5 flex items-center justify-between gap-3 flex-wrap border-b-2 border-slate-100 dark:border-slate-800">
              <div className="flex items-center gap-2">
                <div className="h-9 w-9 rounded-xl bg-blue-100 dark:bg-blue-500/20 text-blue-700 dark:text-blue-300 flex items-center justify-center">
                  <Package className="h-5 w-5" />
                </div>
                <h3 className="font-extrabold text-slate-900 dark:text-white">
                  Top Models{' '}
                  <span className="text-slate-500 dark:text-slate-400 font-bold tabular-nums">({products.length})</span>
                </h3>
              </div>
              <div className="flex gap-2 flex-wrap print:hidden">
                <div className="relative">
                  <Search className="h-4 w-4 text-slate-400 absolute left-3 top-1/2 -translate-y-1/2" />
                  <input
                    value={search}
                    onChange={(e) => setSearch(e.target.value)}
                    placeholder="Model ya brand..."
                    className="h-10 w-44 sm:w-56 rounded-xl border-2 border-slate-200 dark:border-slate-700 bg-white dark:bg-slate-800 pl-9 pr-3 text-sm font-bold text-slate-900 dark:text-white focus:outline-none focus:border-emerald-500 transition"
                  />
                </div>
                <select
                  value={sortBy}
                  onChange={(e) => setSortBy(e.target.value as SortBy)}
                  className="h-10 rounded-xl border-2 border-slate-200 dark:border-slate-700 bg-white dark:bg-slate-800 px-3 text-sm font-bold text-slate-900 dark:text-white focus:outline-none focus:border-emerald-500"
                >
                  <option value="profit">Sab se zyada munafa</option>
                  <option value="margin">Behtareen margin</option>
                  <option value="revenue">Sab se zyada bikri</option>
                  <option value="units">Sab se zyada bika</option>
                </select>
              </div>
            </div>

            {products.length === 0 ? (
              <div className="p-10 text-center">
                <Package className="h-8 w-8 text-slate-300 dark:text-slate-600 mx-auto mb-2" />
                <p className="text-sm font-semibold text-slate-500 dark:text-slate-400">
                  {search ? `"${search}" se koi model nahi mila` : 'Koi model data nahi'}
                </p>
              </div>
            ) : (
              <div className="overflow-x-auto">
                <table className="w-full text-sm">
                  <thead className="bg-slate-50 dark:bg-slate-800/60">
                    <tr className="text-left">
                      <th className="px-4 py-2.5 text-[10px] uppercase font-extrabold text-slate-500 dark:text-slate-400 tracking-wider">#</th>
                      <th className="px-4 py-2.5 text-[10px] uppercase font-extrabold text-slate-500 dark:text-slate-400 tracking-wider">Model</th>
                      <th className="px-4 py-2.5 text-[10px] uppercase font-extrabold text-slate-500 dark:text-slate-400 tracking-wider text-right">Units</th>
                      <th className="px-4 py-2.5 text-[10px] uppercase font-extrabold text-slate-500 dark:text-slate-400 tracking-wider text-right">Bikri</th>
                      <th className="px-4 py-2.5 text-[10px] uppercase font-extrabold text-slate-500 dark:text-slate-400 tracking-wider text-right">Munafa</th>
                      <th className="px-4 py-2.5 text-[10px] uppercase font-extrabold text-slate-500 dark:text-slate-400 tracking-wider text-right">Margin</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-slate-100 dark:divide-slate-800">
                    {products.map((p, i) => (
                      <tr key={p.productId} className="hover:bg-slate-50 dark:hover:bg-slate-800/40 transition">
                        <td className="px-4 py-2.5">
                          <span className={`inline-flex h-6 w-6 items-center justify-center rounded-lg text-[10px] font-extrabold tabular-nums ${
                            i === 0 ? 'bg-amber-100 text-amber-700 dark:bg-amber-500/20 dark:text-amber-300'
                              : 'bg-slate-100 text-slate-500 dark:bg-slate-800 dark:text-slate-400'
                          }`}>
                            {i + 1}
                          </span>
                        </td>
                        <td className="px-4 py-2.5">
                          <div className="font-extrabold text-slate-900 dark:text-white">{p.name}</div>
                          {p.brand && (
                            <div className="text-[11px] font-bold text-slate-500 dark:text-slate-400">{p.brand}</div>
                          )}
                        </td>
                        <td className="px-4 py-2.5 text-right font-bold text-slate-700 dark:text-slate-300 tabular-nums">{p.units}</td>
                        <td className="px-4 py-2.5 text-right font-extrabold text-slate-900 dark:text-white tabular-nums">{formatPKR(p.revenue)}</td>
                        <td className={`px-4 py-2.5 text-right font-extrabold tabular-nums ${p.profit >= 0 ? 'text-emerald-700 dark:text-emerald-400' : 'text-rose-600 dark:text-rose-400'}`}>
                          {hideCost ? '•••' : formatPKR(p.profit)}
                        </td>
                        <td className="px-4 py-2.5 text-right">
                          <span className={`inline-flex items-center gap-0.5 px-1.5 py-0.5 rounded text-[11px] font-extrabold tabular-nums ${
                            p.margin >= 15
                              ? 'bg-emerald-100 text-emerald-700 dark:bg-emerald-500/15 dark:text-emerald-300'
                              : p.margin >= 5
                                ? 'bg-amber-100 text-amber-700 dark:bg-amber-500/15 dark:text-amber-300'
                                : 'bg-rose-100 text-rose-700 dark:bg-rose-500/15 dark:text-rose-300'
                          }`}>
                            {p.margin >= 10 ? <ArrowUpRight className="h-3 w-3" /> : <ArrowDownRight className="h-3 w-3" />}
                            {p.margin.toFixed(1)}%
                          </span>
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            )}
          </div>

          <p className="text-[11px] font-semibold text-slate-400 dark:text-slate-500 text-center">
            Repair ki kamai bhi isi report me shamil hai — delivery par har repair apni sale banati hai.
          </p>
        </>
      )}
    </div>
  );
}

/* ═════════════════════════════════════════════════════════════
   HELPERS
   ═════════════════════════════════════════════════════════════ */

function HeroStat({ label, value, icon: Icon, accent }: any) {
  return (
    <div className={`rounded-2xl backdrop-blur-md border p-3 ${
      accent ? 'bg-emerald-400/20 border-emerald-300/40' : 'bg-white/10 border-white/20'
    }`}>
      <div className="flex items-center gap-1.5 text-[10px] uppercase font-extrabold text-white/70 tracking-wider">
        <Icon className="h-3.5 w-3.5" /> {label}
      </div>
      <div className="mt-1 text-xl sm:text-2xl font-extrabold tabular-nums truncate">{value}</div>
    </div>
  );
}
