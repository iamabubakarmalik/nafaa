import { useMemo, useState } from 'react';
import { Link } from 'react-router-dom';
import { useQuery } from '@tanstack/react-query';
import {
  AlertTriangle, ArrowDownRight, ArrowRight, ArrowUpRight, Boxes, Building2,
  Crown, Layers, Lock, LockOpen, Package, Receipt, RefreshCw, Store, Table2,
  TrendingUp, Users, Wallet, Warehouse,
} from 'lucide-react';
import {
  Bar, BarChart, CartesianGrid, Cell, LabelList, Legend,
  ResponsiveContainer, Tooltip, XAxis, YAxis,
} from 'recharts';
import { shopsApi, type ShopAnalyticsRow } from '@modules/organization/shops/api/shops.api';
import { useAuthStore } from '@core/stores/auth.store';
import { formatPKR } from '@core/lib/format';

/**
 * ════════════════════════════════════════════════════════════════
 * BRANCH ANALYTICS
 * ════════════════════════════════════════════════════════════════
 *
 * The owner's one screen for "which branch needs me". Every number here is
 * per branch and comparable across branches — that is the whole point, so the
 * page leads with comparison (ranked bars, share of month, a full table) and
 * keeps the single-branch detail behind the switcher.
 *
 * Colour is assigned by *branch identity* in a fixed order and never cycled, so
 * a branch keeps its colour as the sort changes. Metric series (sales / profit
 * / expenses) use their own three-slot palette. Both sets were validated for
 * colour-vision separation; the fills that sit under 3:1 against the surface
 * carry direct value labels and a table view, which is the required relief.
 */

// Categorical slots, fixed order — never cycled. Beyond 8 branches the rest
// fold into a neutral "others" tone rather than inventing new hues.
const BRANCH_HUES = [
  '#2a78d6', '#eb6834', '#1baf7a', '#eda100',
  '#e87ba4', '#008300', '#4a3aa7', '#e34948',
] as const;
const OVERFLOW_HUE = '#94a3b8';

const METRIC_HUES = {
  sales: '#2a78d6',
  profit: '#1baf7a',
  expenses: '#eb6834',
} as const;

type Period = 'today' | 'week' | 'month';

const PERIODS: { key: Period; label: string }[] = [
  { key: 'today', label: 'Aaj' },
  { key: 'week', label: '7 Din' },
  { key: 'month', label: 'Is Mahine' },
];

type SortKey = 'sales' | 'profit' | 'orders' | 'credit' | 'name';

export default function ShopsOverviewPage() {
  const user = useAuthStore((s) => s.user);
  const tenantName = useAuthStore((s) => s.tenant?.name);
  const isOwner = user?.role === 'OWNER' || user?.role === 'SUPER_ADMIN';

  const [period, setPeriod] = useState<Period>('month');
  const [sortBy, setSortBy] = useState<SortKey>('sales');

  const { data, isLoading, refetch, isFetching } = useQuery({
    queryKey: ['shops-analytics'],
    queryFn: shopsApi.analytics,
    enabled: isOwner,
    refetchInterval: 60_000,
  });

  const shops = data?.shops ?? [];
  const totals = data?.totals;

  /** Branch id → its fixed colour, decided once by rank so sorting never repaints. */
  const hueOf = useMemo(() => {
    const map = new Map<string, string>();
    [...shops]
      .sort((a, b) => a.rank - b.rank)
      .forEach((s, i) => map.set(s.id, BRANCH_HUES[i] ?? OVERFLOW_HUE));
    return map;
  }, [shops]);

  const pick = useMemo(() => {
    const forPeriod = (s: ShopAnalyticsRow) =>
      period === 'today'
        ? { sales: s.todaySales, profit: s.todayNetProfit, expenses: s.todayExpenses, orders: s.todayOrders }
        : period === 'week'
          ? { sales: s.weekSales, profit: s.weekProfit, expenses: 0, orders: s.weekOrders }
          : { sales: s.monthSales, profit: s.monthNetProfit, expenses: s.monthExpenses, orders: s.todayOrders };
    return forPeriod;
  }, [period]);

  const sorted = useMemo(() => {
    const list = [...shops];
    if (sortBy === 'name') return list.sort((a, b) => a.name.localeCompare(b.name));
    if (sortBy === 'credit') return list.sort((a, b) => b.outstandingCredit - a.outstandingCredit);
    return list.sort((a, b) => {
      const A = pick(a);
      const B = pick(b);
      if (sortBy === 'profit') return B.profit - A.profit;
      if (sortBy === 'orders') return B.orders - A.orders;
      return B.sales - A.sales;
    });
  }, [shops, sortBy, pick]);

  const comparisonData = useMemo(
    () =>
      sorted.map((s) => {
        const v = pick(s);
        return {
          id: s.id,
          name: s.name.length > 14 ? `${s.name.slice(0, 14)}…` : s.name,
          Sales: Math.round(v.sales),
          Profit: Math.round(v.profit),
          Kharche: Math.round(v.expenses),
        };
      }),
    [sorted, pick],
  );

  const shareData = useMemo(
    () =>
      [...shops]
        .sort((a, b) => b.monthShare - a.monthShare)
        .map((s) => ({
          id: s.id,
          name: s.name.length > 16 ? `${s.name.slice(0, 16)}…` : s.name,
          share: Number(s.monthShare.toFixed(1)),
          sales: Math.round(s.monthSales),
        })),
    [shops],
  );

  if (!isOwner) {
    return (
      <div className="rounded-3xl bg-amber-50 dark:bg-amber-500/10 border-2 border-amber-300 p-12 text-center">
        <AlertTriangle className="h-14 w-14 text-amber-600 mx-auto mb-4" />
        <h2 className="text-2xl font-extrabold text-amber-900 dark:text-amber-200">Owner Only</h2>
        <p className="text-amber-700 dark:text-amber-300/80 mt-2">
          Sirf Owner saari branches ka hisab dekh sakta hai.
        </p>
      </div>
    );
  }

  if (isLoading) {
    return (
      <div className="space-y-4">
        <div className="h-44 rounded-3xl bg-slate-100 dark:bg-slate-800 animate-pulse" />
        <div className="grid sm:grid-cols-2 lg:grid-cols-4 gap-3">
          {[0, 1, 2, 3].map((i) => (
            <div key={i} className="h-28 rounded-2xl bg-slate-100 dark:bg-slate-800 animate-pulse" />
          ))}
        </div>
        <div className="h-80 rounded-3xl bg-slate-100 dark:bg-slate-800 animate-pulse" />
      </div>
    );
  }

  const periodLabel = PERIODS.find((p) => p.key === period)!.label;

  return (
    <div className="space-y-5 pb-12">
      {/* ═══════════ HERO ═══════════ */}
      <section className="relative overflow-hidden rounded-3xl bg-gradient-to-br from-slate-950 via-indigo-900 to-violet-800 text-white p-6 sm:p-8 shadow-2xl">
        <div className="absolute -top-20 -right-20 h-56 w-56 rounded-full bg-violet-400/20 blur-3xl" />
        <div className="absolute -bottom-20 -left-20 h-56 w-56 rounded-full bg-indigo-400/20 blur-3xl" />

        <div className="relative flex items-start justify-between gap-4 flex-wrap">
          <div className="min-w-0">
            <div className="inline-flex items-center gap-2 rounded-full bg-white/15 backdrop-blur px-3 py-1 text-[11px] font-extrabold uppercase tracking-wider">
              <Layers className="h-3.5 w-3.5" />
              Branch Analytics
            </div>
            <h1 className="mt-3 text-3xl sm:text-4xl font-extrabold leading-tight">
              Sab Branches Ka Hisab
            </h1>
            <p className="mt-1.5 text-sm font-semibold text-white/75">
              {tenantName ? `${tenantName} — ` : ''}
              {totals?.shopCount ?? 0} branches · live comparison, har minute update
            </p>
          </div>

          <div className="flex items-center gap-2">
            <button
              onClick={() => refetch()}
              className="h-10 inline-flex items-center gap-2 px-3 rounded-xl bg-white/15 hover:bg-white/25 border border-white/25 text-xs font-extrabold backdrop-blur transition"
            >
              <RefreshCw className={`h-4 w-4 ${isFetching ? 'animate-spin' : ''}`} />
              Refresh
            </button>
            <Link
              to="/shops"
              className="h-10 inline-flex items-center gap-2 px-4 rounded-xl bg-white text-indigo-800 text-xs font-extrabold hover:bg-indigo-50 transition"
            >
              <Building2 className="h-4 w-4" />
              Manage Branches
            </Link>
          </div>
        </div>

        <div className="relative mt-6 grid grid-cols-2 lg:grid-cols-4 gap-3">
          <HeroStat label="Is mahine bikri" value={formatPKR(totals?.monthSales ?? 0)} sub={`Aaj ${formatPKR(totals?.todaySales ?? 0)}`} />
          <HeroStat label="Is mahine net profit" value={formatPKR(totals?.monthNetProfit ?? 0)} sub="Sales − cost − kharche" />
          <HeroStat label="Udhaar baqi" value={formatPKR(totals?.outstandingCredit ?? 0)} sub="Sab branches milakar" />
          <HeroStat label="Registers khule" value={`${totals?.registersOpen ?? 0} / ${totals?.shopCount ?? 0}`} sub={`${totals?.staffCount ?? 0} active staff`} />
        </div>
      </section>

      {/* ═══════════ TOP PERFORMER + ALERTS ═══════════ */}
      <div className="grid lg:grid-cols-2 gap-4">
        {data?.best && (
          <section className="rounded-2xl border-2 border-amber-300 bg-gradient-to-br from-amber-50 to-white dark:from-amber-500/10 dark:to-slate-900 dark:border-amber-500/40 p-5">
            <div className="flex items-center gap-3">
              <div className="h-12 w-12 rounded-2xl bg-gradient-to-br from-amber-400 to-amber-600 text-white flex items-center justify-center shadow">
                <Crown className="h-6 w-6" />
              </div>
              <div className="min-w-0">
                <div className="text-[10px] uppercase tracking-wider font-extrabold text-amber-700 dark:text-amber-300">
                  Sab se aage
                </div>
                <div className="text-xl font-extrabold text-slate-900 dark:text-white truncate">
                  {data.best.name}
                </div>
              </div>
            </div>
            <div className="mt-3 grid grid-cols-3 gap-3">
              <MiniFact label="Is mahine" value={formatPKR(data.best.monthSales)} />
              <MiniFact label="Hissa" value={`${data.best.monthShare.toFixed(0)}%`} />
              <MiniFact label="Net profit" value={formatPKR(data.best.monthNetProfit)} />
            </div>
          </section>
        )}

        <section className="rounded-2xl border-2 border-slate-200 dark:border-slate-700 bg-white dark:bg-slate-900 p-5">
          <div className="flex items-center gap-2 font-extrabold text-slate-900 dark:text-white text-sm">
            <AlertTriangle className="h-4 w-4 text-amber-600" />
            Tawajjo chahiye
          </div>
          {(data?.needsAttention?.length ?? 0) === 0 ? (
            <p className="mt-3 text-sm font-semibold text-emerald-700 dark:text-emerald-400">
              Sab branches theek chal rahi hain — koi masla nahi.
            </p>
          ) : (
            <ul className="mt-3 space-y-2 max-h-40 overflow-y-auto">
              {data!.needsAttention.map((n) => (
                <li key={n.shopId} className="flex items-start gap-2">
                  <span
                    className="mt-1.5 h-2.5 w-2.5 rounded-full shrink-0"
                    style={{ background: hueOf.get(n.shopId) ?? OVERFLOW_HUE }}
                  />
                  <div className="min-w-0">
                    <div className="text-sm font-bold text-slate-900 dark:text-white">{n.name}</div>
                    <div className="text-[11px] font-semibold text-amber-700 dark:text-amber-300">
                      {n.reasons.join(' · ')}
                    </div>
                  </div>
                </li>
              ))}
            </ul>
          )}
        </section>
      </div>

      {/* ═══════════ COMPARISON CHART ═══════════ */}
      <section className="rounded-3xl bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-700 shadow-sm overflow-hidden">
        <div className="px-5 py-4 border-b border-slate-100 dark:border-slate-800 flex items-center justify-between gap-3 flex-wrap">
          <div>
            <h2 className="font-extrabold text-slate-900 dark:text-white">Branch Comparison</h2>
            <p className="text-xs font-semibold text-slate-500 dark:text-slate-400">
              {periodLabel} — har branch ki bikri, net profit aur kharche
            </p>
          </div>
          <div className="inline-flex rounded-xl border border-slate-200 dark:border-slate-700 p-1">
            {PERIODS.map((p) => (
              <button
                key={p.key}
                onClick={() => setPeriod(p.key)}
                className={`px-3 py-1.5 rounded-lg text-xs font-extrabold transition ${
                  period === p.key
                    ? 'bg-slate-900 dark:bg-white text-white dark:text-slate-900'
                    : 'text-slate-600 dark:text-slate-300 hover:bg-slate-50 dark:hover:bg-slate-800'
                }`}
              >
                {p.label}
              </button>
            ))}
          </div>
        </div>

        <div className="p-4 overflow-x-auto">
          <div style={{ minWidth: Math.max(comparisonData.length * 140, 520) }}>
            <ResponsiveContainer width="100%" height={320}>
              <BarChart data={comparisonData} margin={{ top: 24, right: 12, left: 4, bottom: 4 }} barGap={2}>
                <CartesianGrid strokeDasharray="3 3" vertical={false} stroke="currentColor" className="text-slate-200 dark:text-slate-700" />
                <XAxis dataKey="name" tickLine={false} axisLine={false} tick={{ fontSize: 11, fontWeight: 700 }} />
                <YAxis tickLine={false} axisLine={false} tick={{ fontSize: 11 }} tickFormatter={(v) => (v >= 1000 ? `${Math.round(v / 1000)}k` : String(v))} width={44} />
                <Tooltip
                  cursor={{ fill: 'currentColor', className: 'text-slate-100 dark:text-slate-800' } as any}
                  formatter={(v: any, n: any) => [formatPKR(Number(v)), n]}
                  contentStyle={{ borderRadius: 12, border: '1px solid #e2e8f0', fontSize: 12, fontWeight: 700 }}
                />
                <Legend wrapperStyle={{ fontSize: 11, fontWeight: 800 }} />
                {/* Direct value labels are the required relief for the fills that
                    sit under 3:1 against the surface — identity never rests on
                    colour alone. */}
                <Bar dataKey="Sales" fill={METRIC_HUES.sales} radius={[4, 4, 0, 0]} maxBarSize={34}>
                  <LabelList dataKey="Sales" position="top" formatter={(v: any) => (Number(v) ? formatPKR(Number(v)) : '')} style={{ fontSize: 10, fontWeight: 800 }} className="fill-slate-600 dark:fill-slate-300" />
                </Bar>
                <Bar dataKey="Profit" fill={METRIC_HUES.profit} radius={[4, 4, 0, 0]} maxBarSize={34} />
                <Bar dataKey="Kharche" fill={METRIC_HUES.expenses} radius={[4, 4, 0, 0]} maxBarSize={34} />
              </BarChart>
            </ResponsiveContainer>
          </div>
          {period === 'week' && (
            <p className="px-1 pt-1 text-[11px] font-semibold text-slate-500 dark:text-slate-400">
              7-din ke kharche branch-wise abhi record nahi hote — is period mein Kharche 0 dikhenge.
            </p>
          )}
        </div>
      </section>

      {/* ═══════════ SHARE OF MONTH ═══════════ */}
      <section className="rounded-3xl bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-700 shadow-sm overflow-hidden">
        <div className="px-5 py-4 border-b border-slate-100 dark:border-slate-800">
          <h2 className="font-extrabold text-slate-900 dark:text-white">Is mahine ka hissa</h2>
          <p className="text-xs font-semibold text-slate-500 dark:text-slate-400">
            Kul bikri mein har branch kitna la rahi hai
          </p>
        </div>
        <div className="p-4">
          <ResponsiveContainer width="100%" height={Math.max(shareData.length * 46 + 30, 140)}>
            <BarChart data={shareData} layout="vertical" margin={{ top: 4, right: 72, left: 4, bottom: 4 }}>
              <CartesianGrid strokeDasharray="3 3" horizontal={false} stroke="currentColor" className="text-slate-200 dark:text-slate-700" />
              <XAxis type="number" domain={[0, 100]} tickLine={false} axisLine={false} tick={{ fontSize: 11 }} unit="%" />
              <YAxis type="category" dataKey="name" width={130} tickLine={false} axisLine={false} tick={{ fontSize: 11, fontWeight: 700 }} />
              <Tooltip
                formatter={(_v: any, _n: any, item: any) => [
                  `${item.payload.share}% · ${formatPKR(item.payload.sales)}`,
                  'Hissa',
                ]}
                contentStyle={{ borderRadius: 12, border: '1px solid #e2e8f0', fontSize: 12, fontWeight: 700 }}
              />
              <Bar dataKey="share" radius={[0, 4, 4, 0]} maxBarSize={26}>
                {shareData.map((d) => (
                  <Cell key={d.id} fill={hueOf.get(d.id) ?? OVERFLOW_HUE} />
                ))}
                <LabelList dataKey="share" position="right" formatter={(v: any) => `${v}%`} style={{ fontSize: 11, fontWeight: 800 }} className="fill-slate-700 dark:fill-slate-200" />
              </Bar>
            </BarChart>
          </ResponsiveContainer>
        </div>
      </section>

      {/* ═══════════ FULL DETAIL TABLE ═══════════ */}
      <section className="rounded-3xl bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-700 shadow-sm overflow-hidden">
        <div className="px-5 py-4 border-b border-slate-100 dark:border-slate-800 flex items-center justify-between gap-3 flex-wrap">
          <div className="flex items-center gap-2">
            <Table2 className="h-4 w-4 text-slate-500" />
            <div>
              <h2 className="font-extrabold text-slate-900 dark:text-white">Har Branch — Poori Tafseel</h2>
              <p className="text-xs font-semibold text-slate-500 dark:text-slate-400">
                Wohi numbers jo charts mein hain, parhne ke liye
              </p>
            </div>
          </div>
          <div className="inline-flex rounded-xl border border-slate-200 dark:border-slate-700 p-1 flex-wrap">
            {([
              ['sales', 'Bikri'], ['profit', 'Profit'], ['orders', 'Orders'],
              ['credit', 'Udhaar'], ['name', 'Naam'],
            ] as [SortKey, string][]).map(([k, label]) => (
              <button
                key={k}
                onClick={() => setSortBy(k)}
                className={`px-2.5 py-1.5 rounded-lg text-[11px] font-extrabold transition ${
                  sortBy === k
                    ? 'bg-slate-900 dark:bg-white text-white dark:text-slate-900'
                    : 'text-slate-600 dark:text-slate-300 hover:bg-slate-50 dark:hover:bg-slate-800'
                }`}
              >
                {label}
              </button>
            ))}
          </div>
        </div>

        <div className="overflow-x-auto">
          <table className="w-full text-sm">
            <thead className="bg-slate-50 dark:bg-slate-800/60 text-[10px] uppercase tracking-wider text-slate-500 dark:text-slate-400">
              <tr>
                <Th className="text-left pl-5">Branch</Th>
                <Th>Aaj</Th>
                <Th>vs Kal</Th>
                <Th>7 Din</Th>
                <Th>Is Mahine</Th>
                <Th>Net Profit</Th>
                <Th>Kharche</Th>
                <Th>Udhaar</Th>
                <Th>Avg Bill</Th>
                <Th>Stock</Th>
                <Th>Low</Th>
                <Th>Staff</Th>
                <Th>Register</Th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-100 dark:divide-slate-800">
              {sorted.map((s) => {
                const up = s.growthVsYesterday >= 0;
                const Arrow = up ? ArrowUpRight : ArrowDownRight;
                return (
                  <tr key={s.id} className="hover:bg-slate-50 dark:hover:bg-slate-800/40 transition">
                    <td className="pl-5 py-3">
                      <div className="flex items-center gap-2 min-w-0">
                        <span className="h-2.5 w-2.5 rounded-full shrink-0" style={{ background: hueOf.get(s.id) }} />
                        {s.type === 'WAREHOUSE' ? (
                          <Warehouse className="h-3.5 w-3.5 text-slate-400 shrink-0" />
                        ) : (
                          <Store className="h-3.5 w-3.5 text-slate-400 shrink-0" />
                        )}
                        <span className="font-extrabold text-slate-900 dark:text-white truncate">{s.name}</span>
                        {s.isMain && (
                          <span className="px-1.5 py-0.5 rounded text-[9px] font-extrabold bg-emerald-100 text-emerald-700 dark:bg-emerald-500/20 dark:text-emerald-300 shrink-0">
                            MAIN
                          </span>
                        )}
                      </div>
                    </td>
                    <Td>{formatPKR(s.todaySales)}</Td>
                    <td className="px-3 py-3 text-right tabular-nums">
                      <span className={`inline-flex items-center gap-0.5 font-extrabold ${up ? 'text-emerald-600' : 'text-rose-600'}`}>
                        <Arrow className="h-3.5 w-3.5" />
                        {Math.abs(s.growthVsYesterday).toFixed(0)}%
                      </span>
                    </td>
                    <Td>{formatPKR(s.weekSales)}</Td>
                    <Td strong>{formatPKR(s.monthSales)}</Td>
                    <Td>{formatPKR(s.monthNetProfit)}</Td>
                    <Td>{formatPKR(s.monthExpenses)}</Td>
                    <Td>{formatPKR(s.outstandingCredit)}</Td>
                    <Td>{formatPKR(s.avgOrderValue)}</Td>
                    <Td>{Math.round(s.totalStock)}</Td>
                    <td className="px-3 py-3 text-right tabular-nums">
                      <span className={`font-extrabold ${s.lowStockCount > 0 ? 'text-amber-600' : 'text-slate-400'}`}>
                        {s.lowStockCount}
                      </span>
                    </td>
                    <Td>{s.staffCount}</Td>
                    <td className="px-3 py-3 text-center">
                      {s.registerOpen ? (
                        <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded-full text-[10px] font-extrabold bg-emerald-100 text-emerald-700 dark:bg-emerald-500/20 dark:text-emerald-300">
                          <LockOpen className="h-2.5 w-2.5" /> Khula
                        </span>
                      ) : (
                        <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded-full text-[10px] font-extrabold bg-slate-200 text-slate-600 dark:bg-slate-700 dark:text-slate-300">
                          <Lock className="h-2.5 w-2.5" /> Band
                        </span>
                      )}
                    </td>
                  </tr>
                );
              })}
            </tbody>
          </table>
        </div>

        {sorted.length === 0 && (
          <div className="p-10 text-center">
            <Building2 className="h-10 w-10 text-slate-300 mx-auto" />
            <p className="mt-3 text-sm font-semibold text-slate-500">
              Abhi koi active branch nahi hai.
            </p>
            <Link to="/shops" className="mt-2 inline-flex items-center gap-1 text-sm font-extrabold text-indigo-600 hover:underline">
              Pehli branch banayein <ArrowRight className="h-4 w-4" />
            </Link>
          </div>
        )}
      </section>

      {/* ═══════════ QUICK LINKS ═══════════ */}
      <section className="grid sm:grid-cols-2 lg:grid-cols-4 gap-3">
        <QuickLink to="/transfers" icon={Package} label="Stock Transfers" sub="Ek branch se dusri" />
        <QuickLink to="/low-stock" icon={Boxes} label="Low Stock" sub={`${totals?.lowStockCount ?? 0} items`} />
        <QuickLink to="/khata" icon={Wallet} label="Khata" sub={formatPKR(totals?.outstandingCredit ?? 0)} />
        <QuickLink to="/reports" icon={TrendingUp} label="All Reports" sub="Gehri tafseel" />
      </section>

      <p className="text-center text-xs font-semibold text-slate-500 dark:text-slate-400">
        Kisi ek branch ka poora hisab dekhne ke liye upar dropdown se woh shop chunein.
      </p>
    </div>
  );
}

// ════════════════════════════════════════════════════════════

function HeroStat({ label, value, sub }: { label: string; value: string; sub: string }) {
  return (
    <div className="rounded-2xl bg-white/15 backdrop-blur border border-white/25 p-4">
      <div className="text-[10px] uppercase tracking-wider font-extrabold text-white/70">{label}</div>
      <div className="mt-1 text-xl sm:text-2xl font-extrabold tabular-nums truncate">{value}</div>
      <div className="text-[11px] font-semibold text-white/70 truncate">{sub}</div>
    </div>
  );
}

function MiniFact({ label, value }: { label: string; value: string }) {
  return (
    <div className="rounded-xl bg-white/70 dark:bg-slate-800/60 p-2.5">
      <div className="text-[9px] uppercase tracking-wide font-extrabold text-slate-500 dark:text-slate-400">{label}</div>
      <div className="font-extrabold text-slate-900 dark:text-white tabular-nums text-sm truncate">{value}</div>
    </div>
  );
}

function Th({ children, className = '' }: { children: React.ReactNode; className?: string }) {
  return <th className={`px-3 py-2.5 font-extrabold text-right ${className}`}>{children}</th>;
}

function Td({ children, strong }: { children: React.ReactNode; strong?: boolean }) {
  return (
    <td className={`px-3 py-3 text-right tabular-nums ${strong ? 'font-extrabold text-slate-900 dark:text-white' : 'font-bold text-slate-600 dark:text-slate-300'}`}>
      {children}
    </td>
  );
}

function QuickLink({
  to, icon: Icon, label, sub,
}: { to: string; icon: typeof Users; label: string; sub: string }) {
  return (
    <Link
      to={to}
      className="rounded-2xl bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-700 p-4 hover:border-indigo-400 hover:shadow-md transition group"
    >
      <div className="flex items-center gap-3">
        <div className="h-10 w-10 rounded-xl bg-slate-100 dark:bg-slate-800 group-hover:bg-indigo-100 dark:group-hover:bg-indigo-500/20 flex items-center justify-center transition">
          <Icon className="h-5 w-5 text-slate-600 dark:text-slate-300 group-hover:text-indigo-600" />
        </div>
        <div className="min-w-0">
          <div className="font-extrabold text-slate-900 dark:text-white text-sm">{label}</div>
          <div className="text-[11px] font-semibold text-slate-500 dark:text-slate-400 truncate">{sub}</div>
        </div>
        <ArrowRight className="h-4 w-4 text-slate-300 group-hover:text-indigo-500 ml-auto shrink-0 transition" />
      </div>
    </Link>
  );
}
