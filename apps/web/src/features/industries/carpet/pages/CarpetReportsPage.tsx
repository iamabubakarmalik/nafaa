import { useState, useMemo } from 'react';
import { Link } from 'react-router-dom';
import { useQuery } from '@tanstack/react-query';
import {
  BarChart, Bar, LineChart, Line, AreaChart, Area, PieChart, Pie, Cell,
  XAxis, YAxis, CartesianGrid, Tooltip, Legend, ResponsiveContainer,
  ComposedChart, RadialBarChart, RadialBar,
} from 'recharts';
import {
  BarChart3, Layers, TrendingUp, Clock, Scissors, Sparkles,
  ArrowLeft, DollarSign, Package, AlertTriangle, Award, RefreshCw,
  Search, X, Download, Calendar, Activity, Target, TrendingDown,
  ChevronRight, Eye, Hash, MapPin, PieChart as PieIcon, ArrowUpRight,
  ArrowDownRight, CheckCircle2, Zap, Flame, Snowflake, Crown,
  BarChart2, LineChart as LineIcon,
} from 'lucide-react';
import { Button } from '@/components/ui/Button';
import { formatPKR, formatPKRFull } from '@/lib/format';
import { carpetReportsApi } from '../api/carpet-reports.api';

type Tab = 'overview' | 'profit' | 'today' | 'designs' | 'slow' | 'pieces';

const tabs: { id: Tab; label: string; icon: any; color: string }[] = [
  { id: 'overview', label: 'Overview', icon: BarChart3, color: 'emerald' },
  { id: 'profit', label: 'Roll Profit', icon: TrendingUp, color: 'blue' },
  { id: 'today', label: "Today's Activity", icon: Clock, color: 'violet' },
  { id: 'designs', label: 'Top Designs', icon: Award, color: 'amber' },
  { id: 'slow', label: 'Slow Movers', icon: AlertTriangle, color: 'rose' },
  { id: 'pieces', label: 'Cut Pieces', icon: Scissors, color: 'purple' },
];

const CHART_COLORS = ['#10b981', '#3b82f6', '#8b5cf6', '#f59e0b', '#ef4444', '#06b6d4', '#ec4899', '#84cc16'];

export default function CarpetReportsPage() {
  const [tab, setTab] = useState<Tab>('overview');
  const [slowDays, setSlowDays] = useState(30);
  const [topDays, setTopDays] = useState(30);
  const [search, setSearch] = useState('');

  const { data: overview, refetch: refetchOverview } = useQuery({
    queryKey: ['carpet-reports', 'overview'],
    queryFn: () => carpetReportsApi.overview(),
    enabled: tab === 'overview',
  });

  const { data: profit = [], refetch: refetchProfit } = useQuery({
    queryKey: ['carpet-reports', 'profit'],
    queryFn: () => carpetReportsApi.rollProfit(),
    enabled: tab === 'profit',
  });

  const { data: slow = [], refetch: refetchSlow } = useQuery({
    queryKey: ['carpet-reports', 'slow', slowDays],
    queryFn: () => carpetReportsApi.slowMoving(slowDays),
    enabled: tab === 'slow',
  });

  const { data: today, refetch: refetchToday } = useQuery({
    queryKey: ['carpet-reports', 'today'],
    queryFn: () => carpetReportsApi.todaysCuts(),
    enabled: tab === 'today',
  });

  const { data: top = [], refetch: refetchTop } = useQuery({
    queryKey: ['carpet-reports', 'top', topDays],
    queryFn: () => carpetReportsApi.topDesigns(topDays),
    enabled: tab === 'designs',
  });

  const { data: pieces, refetch: refetchPieces } = useQuery({
    queryKey: ['carpet-reports', 'pieces'],
    queryFn: () => carpetReportsApi.cutPiecesReport(),
    enabled: tab === 'pieces',
  });

  const handleRefresh = () => {
    if (tab === 'overview') refetchOverview();
    if (tab === 'profit') refetchProfit();
    if (tab === 'slow') refetchSlow();
    if (tab === 'today') refetchToday();
    if (tab === 'designs') refetchTop();
    if (tab === 'pieces') refetchPieces();
  };

  // ─── Profit analytics ────────────────────────────────────
  const profitAnalytics = useMemo(() => {
    if (profit.length === 0) return null;
    const totalRevenue = profit.reduce((s, r) => s + r.revenue, 0);
    const totalCost = profit.reduce((s, r) => s + r.cost, 0);
    const totalProfit = profit.reduce((s, r) => s + r.profit, 0);
    const avgMargin = profit.reduce((s, r) => s + r.profitMargin, 0) / profit.length;
    const topProfitable = [...profit].sort((a, b) => b.profit - a.profit).slice(0, 10);
    const lowestMargin = [...profit].filter((r) => r.profit > 0).sort((a, b) => a.profitMargin - b.profitMargin).slice(0, 5);

    // Profit distribution buckets
    const buckets = { lossy: 0, low: 0, medium: 0, high: 0, excellent: 0 };
    profit.forEach((r) => {
      if (r.profitMargin < 0) buckets.lossy++;
      else if (r.profitMargin < 10) buckets.low++;
      else if (r.profitMargin < 20) buckets.medium++;
      else if (r.profitMargin < 30) buckets.high++;
      else buckets.excellent++;
    });
    const distData = [
      { name: 'Loss (<0%)', value: buckets.lossy, color: '#ef4444' },
      { name: 'Low (0-10%)', value: buckets.low, color: '#f59e0b' },
      { name: 'Medium (10-20%)', value: buckets.medium, color: '#3b82f6' },
      { name: 'High (20-30%)', value: buckets.high, color: '#10b981' },
      { name: 'Excellent (>30%)', value: buckets.excellent, color: '#059669' },
    ].filter((d) => d.value > 0);

    return { totalRevenue, totalCost, totalProfit, avgMargin, topProfitable, lowestMargin, distData };
  }, [profit]);

  // ─── Today hourly breakdown ───────────────────────────────
  const todayAnalytics = useMemo(() => {
    if (!today?.cuts.length) return null;
    const hourlyMap: Record<number, { hour: number; cuts: number; sqft: number }> = {};
    for (let h = 0; h < 24; h++) hourlyMap[h] = { hour: h, cuts: 0, sqft: 0 };

    today.cuts.forEach((c) => {
      const h = new Date(c.createdAt).getHours();
      hourlyMap[h].cuts++;
      hourlyMap[h].sqft += c.sqft;
    });

    const hourlyData = Object.values(hourlyMap).map((d) => ({
      hour: `${String(d.hour).padStart(2, '0')}:00`,
      cuts: d.cuts,
      sqft: Number(d.sqft.toFixed(2)),
    }));

    const peakHour = [...Object.values(hourlyMap)].sort((a, b) => b.sqft - a.sqft)[0];
    const avgSqftPerCut = today.totalSqftSold / today.cutCount;

    return { hourlyData, peakHour, avgSqftPerCut };
  }, [today]);

  // ─── Top designs analytics ────────────────────────────────
  const designAnalytics = useMemo(() => {
    if (top.length === 0) return null;
    const totalRevenue = top.reduce((s, d) => s + d.revenue, 0);
    const totalSqft = top.reduce((s, d) => s + d.totalSqft, 0);
    const totalSales = top.reduce((s, d) => s + d.salesCount, 0);

    const top10 = top.slice(0, 10).map((d) => ({
      name: d.variantName ? `${d.productName.substring(0, 12)} - ${d.variantName.substring(0, 8)}` : d.productName.substring(0, 18),
      revenue: d.revenue,
      sqft: d.totalSqft,
      sales: d.salesCount,
    }));

    // Revenue share pie
    const pieData = top.slice(0, 8).map((d, i) => ({
      name: d.variantName ? `${d.productName} - ${d.variantName}` : d.productName,
      value: d.revenue,
      color: CHART_COLORS[i % CHART_COLORS.length],
    }));
    if (top.length > 8) {
      const othersRevenue = top.slice(8).reduce((s, d) => s + d.revenue, 0);
      pieData.push({ name: `${top.length - 8} others`, value: othersRevenue, color: '#94a3b8' });
    }

    return { totalRevenue, totalSqft, totalSales, top10, pieData };
  }, [top]);

  // ─── Slow movers analytics ────────────────────────────────
  const slowAnalytics = useMemo(() => {
    if (slow.length === 0) return null;
    const totalLocked = slow.reduce((s, r) => s + r.stockValueCost, 0);
    const totalSqft = slow.reduce((s, r) => s + r.remainingSqft, 0);
    const avgDays = slow.reduce((s, r) => s + r.daysSinceLastActivity, 0) / slow.length;

    // Days distribution
    const buckets = { '30-60': 0, '60-90': 0, '90-180': 0, '180+': 0 };
    slow.forEach((r) => {
      if (r.daysSinceLastActivity < 60) buckets['30-60']++;
      else if (r.daysSinceLastActivity < 90) buckets['60-90']++;
      else if (r.daysSinceLastActivity < 180) buckets['90-180']++;
      else buckets['180+']++;
    });
    const distData = [
      { name: '30-60 days', value: buckets['30-60'], color: '#f59e0b' },
      { name: '60-90 days', value: buckets['60-90'], color: '#f97316' },
      { name: '90-180 days', value: buckets['90-180'], color: '#ef4444' },
      { name: '180+ days', value: buckets['180+'], color: '#dc2626' },
    ].filter((d) => d.value > 0);

    // Top 10 most idle by locked capital
    const top10Locked = [...slow].sort((a, b) => b.stockValueCost - a.stockValueCost).slice(0, 10);

    return { totalLocked, totalSqft, avgDays, distData, top10Locked };
  }, [slow]);

  // ─── Filtered profit ──────────────────────────────────────
  const filteredProfit = useMemo(() => {
    const q = search.toLowerCase().trim();
    if (!q) return profit;
    return profit.filter(
      (r) =>
        r.rollNumber.toLowerCase().includes(q) ||
        r.productName.toLowerCase().includes(q) ||
        (r.variantName || '').toLowerCase().includes(q),
    );
  }, [profit, search]);

  const exportCSV = (data: any[], filename: string) => {
    if (!data.length) return;
    const keys = Object.keys(data[0]);
    const csv = [
      keys.join(','),
      ...data.map((row) => keys.map((k) => JSON.stringify(row[k] ?? '')).join(',')),
    ].join('\n');
    const blob = new Blob([csv], { type: 'text/csv' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = `${filename}-${new Date().toISOString().slice(0, 10)}.csv`;
    a.click();
  };

  return (
    <div className="space-y-5">
      <Link to="/carpet-rolls" className="inline-flex items-center gap-2 text-sm text-slate-600 hover:text-emerald-600 font-bold transition">
        <ArrowLeft className="h-4 w-4" /> Back to Carpet Rolls
      </Link>

      {/* ═══ HERO HEADER ═══ */}
      <section className="relative overflow-hidden rounded-3xl bg-gradient-to-br from-slate-950 via-emerald-900 to-emerald-700 text-white p-6 shadow-2xl">
        <div className="absolute -top-20 -right-20 h-64 w-64 rounded-full bg-emerald-400/20 blur-3xl" />
        <div className="absolute -bottom-20 -left-20 h-64 w-64 rounded-full bg-amber-400/15 blur-3xl" />

        <div className="relative flex items-center justify-between gap-4 flex-wrap">
          <div className="min-w-0">
            <div className="inline-flex items-center gap-2 rounded-full bg-white/15 backdrop-blur px-3 py-1 text-xs font-extrabold border border-white/20">
              <BarChart3 className="h-3.5 w-3.5 text-amber-300" />
              Business Intelligence Dashboard
            </div>
            <h1 className="mt-3 text-3xl sm:text-4xl font-extrabold leading-tight">
              Carpet Analytics
            </h1>
            <p className="mt-2 text-sm text-white/80 max-w-xl">
              Real-time profit analysis, sales trends, design performance, and stock health metrics
            </p>
          </div>
          <Button variant="secondary" onClick={handleRefresh} className="bg-white/15 backdrop-blur text-white hover:bg-white/25 border-white/20">
            <RefreshCw className="h-4 w-4" /> Refresh Data
          </Button>
        </div>
      </section>

      {/* ═══ TABS ═══ */}
      <div className="rounded-3xl bg-white border-2 border-slate-200 shadow-sm p-2 overflow-x-auto">
        <div className="flex gap-1.5 min-w-max">
          {tabs.map((t) => {
            const Icon = t.icon;
            const active = tab === t.id;
            return (
              <button
                key={t.id}
                onClick={() => setTab(t.id)}
                className={`px-4 py-2.5 rounded-xl text-xs font-extrabold whitespace-nowrap transition inline-flex items-center gap-2 ${
                  active
                    ? 'bg-gradient-to-br from-emerald-600 to-emerald-700 text-white shadow-md shadow-emerald-500/30'
                    : 'text-slate-700 hover:bg-slate-100'
                }`}
              >
                <Icon className="h-4 w-4" />
                {t.label}
              </button>
            );
          })}
        </div>
      </div>

      {/* ═══ OVERVIEW TAB ═══ */}
      {tab === 'overview' && overview && (
        <div className="space-y-5">
          {/* Big KPIs */}
          <div className="grid sm:grid-cols-2 lg:grid-cols-4 gap-3">
            <BigKpi label="Total Stock" value={overview.grandTotalSqft.toFixed(0)} unit="sqft" sub={`${overview.activeRollCount} rolls + ${overview.cutPieceAvailableCount} pieces`} tone="emerald" icon={Layers} />
            <BigKpi label="Stock Cost" value={formatPKRFull(overview.totalStockCost)} sub="Investment locked" tone="blue" icon={DollarSign} />
            <BigKpi label="Sale Value" value={formatPKRFull(overview.totalStockSaleValue)} sub="At retail prices" tone="violet" icon={Package} />
            <BigKpi label="Potential Profit" value={formatPKRFull(overview.potentialProfit)} sub={`${((overview.potentialProfit / Math.max(overview.totalStockSaleValue, 1)) * 100).toFixed(1)}% margin`} tone="amber" icon={TrendingUp} trend="up" />
          </div>

          {/* Stock health chart */}
          <div className="grid lg:grid-cols-2 gap-4">
            {/* Roll status donut */}
            <ChartCard title="Roll Status Distribution" icon={PieIcon} desc="Active vs Finished vs Damaged">
              <ResponsiveContainer width="100%" height={260}>
                <PieChart>
                  <Pie
                    data={[
                      { name: 'Active', value: overview.activeRollCount, color: '#10b981' },
                      { name: 'Finished', value: overview.finishedRollCount, color: '#94a3b8' },
                      { name: 'Damaged', value: overview.damagedRollCount, color: '#ef4444' },
                    ].filter((d) => d.value > 0)}
                    cx="50%"
                    cy="50%"
                    innerRadius={50}
                    outerRadius={90}
                    paddingAngle={3}
                    dataKey="value"
                  >
                    {[
                      { color: '#10b981' },
                      { color: '#94a3b8' },
                      { color: '#ef4444' },
                    ].map((entry, i) => (
                      <Cell key={i} fill={entry.color} />
                    ))}
                  </Pie>
                  <Tooltip />
                  <Legend />
                </PieChart>
              </ResponsiveContainer>
              <div className="grid grid-cols-3 gap-2 mt-3">
                <StatusMini label="Active" value={overview.activeRollCount} color="emerald" />
                <StatusMini label="Finished" value={overview.finishedRollCount} color="slate" />
                <StatusMini label="Damaged" value={overview.damagedRollCount} color="rose" />
              </div>
            </ChartCard>

            {/* Capital allocation bar */}
            <ChartCard title="Capital Allocation" icon={BarChart2} desc="Cost vs Sale value comparison">
              <ResponsiveContainer width="100%" height={260}>
                <BarChart
                  data={[
                    { name: 'Rolls', cost: overview.totalStockCost - overview.cutPiecesCost, sale: overview.totalStockSaleValue - overview.cutPiecesSaleValue },
                    { name: 'Cut Pieces', cost: overview.cutPiecesCost, sale: overview.cutPiecesSaleValue },
                  ]}
                  margin={{ top: 10, right: 10, left: 0, bottom: 0 }}
                >
                  <CartesianGrid strokeDasharray="3 3" stroke="#e2e8f0" />
                  <XAxis dataKey="name" stroke="#64748b" fontSize={11} />
                  <YAxis stroke="#64748b" fontSize={11} tickFormatter={(v) => `${(v / 1000).toFixed(0)}K`} />
                  <Tooltip formatter={(v: any) => formatPKR(v)} />
                  <Legend wrapperStyle={{ fontSize: 11 }} />
                  <Bar dataKey="cost" fill="#3b82f6" name="Cost" radius={[4, 4, 0, 0]} />
                  <Bar dataKey="sale" fill="#10b981" name="Sale Value" radius={[4, 4, 0, 0]} />
                </BarChart>
              </ResponsiveContainer>
            </ChartCard>
          </div>

          {/* Cut pieces overview */}
          <div className="rounded-3xl bg-gradient-to-br from-violet-50 via-purple-50 to-fuchsia-50 border-2 border-violet-200 p-5 shadow-sm">
            <div className="flex items-center gap-2 mb-4">
              <div className="h-10 w-10 rounded-xl bg-gradient-to-br from-violet-600 to-purple-700 text-white flex items-center justify-center shadow-md">
                <Scissors className="h-5 w-5" />
              </div>
              <div className="flex-1">
                <h3 className="font-extrabold text-violet-900 text-lg">Cut Pieces Inventory</h3>
                <p className="text-xs text-violet-700 font-semibold">Leftover material + customer returns ready for resale</p>
              </div>
              <Link to="/carpet-cut-pieces" className="text-xs font-bold text-violet-700 hover:underline inline-flex items-center gap-1 bg-white px-3 py-1.5 rounded-lg border border-violet-200">
                Manage <ChevronRight className="h-3 w-3" />
              </Link>
            </div>
            <div className="grid sm:grid-cols-4 gap-3">
              <MiniStat label="Available" value={overview.cutPieceAvailableCount} sub={`${overview.cutPiecesSqft.toFixed(0)} sqft`} tone="violet" />
              <MiniStat label="Cost Value" value={formatPKRFull(overview.cutPiecesCost)} tone="blue" />
              <MiniStat label="Sale Value" value={formatPKRFull(overview.cutPiecesSaleValue)} tone="emerald" />
              <MiniStat label="Potential Profit" value={formatPKRFull(overview.cutPiecesSaleValue - overview.cutPiecesCost)} tone="amber" />
            </div>
          </div>
        </div>
      )}

      {/* ═══ PROFIT TAB ═══ */}
      {tab === 'profit' && profitAnalytics && (
        <div className="space-y-5">
          <div className="grid sm:grid-cols-4 gap-3">
            <BigKpi label="Total Revenue" value={formatPKRFull(profitAnalytics.totalRevenue)} sub={`${profit.length} rolls`} tone="emerald" icon={DollarSign} />
            <BigKpi label="Total Cost" value={formatPKRFull(profitAnalytics.totalCost)} tone="blue" icon={Package} />
            <BigKpi label="Net Profit" value={formatPKRFull(profitAnalytics.totalProfit)} sub={`${((profitAnalytics.totalProfit / Math.max(profitAnalytics.totalRevenue, 1)) * 100).toFixed(1)}% overall`} tone="amber" icon={TrendingUp} trend="up" />
            <BigKpi label="Avg Margin" value={`${profitAnalytics.avgMargin.toFixed(1)}%`} sub="Per roll average" tone="violet" icon={Target} />
          </div>

          {/* Charts grid */}
          <div className="grid lg:grid-cols-[1fr_1fr] gap-4">
            <ChartCard title="Top 10 Most Profitable Rolls" icon={Crown} desc="Highest profit earners">
              <ResponsiveContainer width="100%" height={320}>
                <BarChart
                  data={profitAnalytics.topProfitable.map((r) => ({
                    name: r.rollNumber,
                    profit: r.profit,
                    revenue: r.revenue,
                  }))}
                  layout="vertical"
                  margin={{ top: 5, right: 10, left: 50, bottom: 5 }}
                >
                  <CartesianGrid strokeDasharray="3 3" stroke="#e2e8f0" />
                  <XAxis type="number" stroke="#64748b" fontSize={10} tickFormatter={(v) => `${(v / 1000).toFixed(0)}K`} />
                  <YAxis dataKey="name" type="category" stroke="#64748b" fontSize={10} width={70} />
                  <Tooltip formatter={(v: any) => formatPKR(v)} />
                  <Bar dataKey="profit" fill="#10b981" radius={[0, 4, 4, 0]} name="Profit" />
                </BarChart>
              </ResponsiveContainer>
            </ChartCard>

            <ChartCard title="Profit Margin Distribution" icon={PieIcon} desc="How rolls perform on margin">
              <ResponsiveContainer width="100%" height={320}>
                <PieChart>
                  <Pie
                    data={profitAnalytics.distData}
                    cx="50%"
                    cy="50%"
                    outerRadius={100}
                    dataKey="value"
                    label={(entry: any) => `${entry.value}`}
                  >
                    {profitAnalytics.distData.map((entry, i) => (
                      <Cell key={i} fill={entry.color} />
                    ))}
                  </Pie>
                  <Tooltip />
                  <Legend wrapperStyle={{ fontSize: 11 }} />
                </PieChart>
              </ResponsiveContainer>
            </ChartCard>
          </div>

          {/* Lowest margin alert */}
          {profitAnalytics.lowestMargin.length > 0 && (
            <div className="rounded-2xl bg-amber-50 border-2 border-amber-300 p-4 shadow-sm">
              <div className="flex items-center gap-2 mb-3">
                <AlertTriangle className="h-5 w-5 text-amber-700" />
                <h3 className="font-extrabold text-amber-900">Rolls with Lowest Margin</h3>
                <p className="text-xs text-amber-700 font-semibold ml-auto">Consider price adjustment</p>
              </div>
              <div className="grid sm:grid-cols-2 lg:grid-cols-5 gap-2">
                {profitAnalytics.lowestMargin.map((r) => (
                  <Link key={r.id} to={`/carpet-rolls/${r.id}`} className="rounded-xl bg-white border-2 border-amber-200 p-2.5 hover:border-amber-400 transition">
                    <div className="font-mono font-extrabold text-xs text-amber-900">{r.rollNumber}</div>
                    <div className="text-[10px] text-slate-600 font-bold truncate mt-0.5">{r.productName}</div>
                    <div className="text-lg font-extrabold text-amber-700 tabular-nums mt-1">{r.profitMargin.toFixed(1)}%</div>
                  </Link>
                ))}
              </div>
            </div>
          )}

          {/* Detailed table */}
          <div className="rounded-2xl bg-white border-2 border-slate-200 p-3 flex items-center gap-2 flex-wrap shadow-sm">
            <div className="relative flex-1 min-w-[240px]">
              <Search className="h-4 w-4 text-slate-400 absolute left-3 top-1/2 -translate-y-1/2" />
              <input
                value={search}
                onChange={(e) => setSearch(e.target.value)}
                placeholder="Search by roll, product, variant..."
                className="h-10 w-full rounded-lg border-2 border-slate-200 pl-10 pr-10 text-sm font-semibold focus:outline-none focus:border-emerald-500"
              />
              {search && (
                <button onClick={() => setSearch('')} className="absolute right-3 top-1/2 -translate-y-1/2">
                  <X className="h-4 w-4 text-slate-400" />
                </button>
              )}
            </div>
            <button
              onClick={() => exportCSV(filteredProfit, 'roll-profit')}
              className="h-10 px-3 rounded-lg bg-emerald-50 hover:bg-emerald-100 text-emerald-700 text-xs font-extrabold inline-flex items-center gap-1 border-2 border-emerald-200"
            >
              <Download className="h-3.5 w-3.5" /> Export CSV
            </button>
          </div>

          <div className="rounded-3xl bg-white border-2 border-slate-200 overflow-hidden shadow-sm">
            <div className="overflow-x-auto">
              <table className="w-full text-sm">
                <thead className="bg-slate-50 border-b-2 border-slate-200">
                  <tr>
                    <th className="px-3 py-2 text-left text-[10px] font-extrabold uppercase tracking-wider text-slate-700">Roll #</th>
                    <th className="px-3 py-2 text-left text-[10px] font-extrabold uppercase tracking-wider text-slate-700">Product</th>
                    <th className="px-3 py-2 text-right text-[10px] font-extrabold uppercase tracking-wider text-slate-700">Sold</th>
                    <th className="px-3 py-2 text-right text-[10px] font-extrabold uppercase tracking-wider text-slate-700">Revenue</th>
                    <th className="px-3 py-2 text-right text-[10px] font-extrabold uppercase tracking-wider text-slate-700">Profit</th>
                    <th className="px-3 py-2 text-center text-[10px] font-extrabold uppercase tracking-wider text-slate-700">Margin</th>
                    <th className="px-3 py-2 text-right text-[10px] font-extrabold uppercase tracking-wider text-slate-700">Usage</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-slate-100">
                  {filteredProfit.map((r) => (
                    <tr key={r.id} className="hover:bg-slate-50 transition">
                      <td className="px-3 py-2.5">
                        <Link to={`/carpet-rolls/${r.id}`} className="font-mono font-extrabold text-emerald-700 hover:underline text-xs">
                          {r.rollNumber}
                        </Link>
                      </td>
                      <td className="px-3 py-2.5">
                        <div className="font-bold text-slate-900 text-xs">{r.productName}</div>
                        {r.variantName && (
                          <div className="text-[10px] text-violet-700 font-bold flex items-center gap-1">
                            {r.variantColor && <span className="h-2 w-2 rounded-full" style={{ backgroundColor: r.variantColor }} />}
                            {r.variantName}
                          </div>
                        )}
                      </td>
                      <td className="px-3 py-2.5 text-right">
                        <div className="font-extrabold text-slate-900 text-xs tabular-nums">{r.soldSqft.toFixed(2)} sqft</div>
                        <div className="text-[9px] text-slate-500 font-bold">{r.salesCount} sales</div>
                      </td>
                      <td className="px-3 py-2.5 text-right text-xs font-extrabold text-emerald-700 tabular-nums">{formatPKRFull(r.revenue)}</td>
                      <td className="px-3 py-2.5 text-right">
                        <div className={`text-xs font-extrabold tabular-nums ${r.profit > 0 ? 'text-emerald-700' : 'text-rose-700'}`}>
                          {formatPKRFull(r.profit)}
                        </div>
                      </td>
                      <td className="px-3 py-2.5 text-center">
                        <span className={`px-2 py-0.5 rounded-full text-[10px] font-extrabold ${
                          r.profitMargin > 25 ? 'bg-emerald-100 text-emerald-700' :
                          r.profitMargin > 10 ? 'bg-amber-100 text-amber-700' :
                          r.profitMargin > 0 ? 'bg-slate-100 text-slate-700' :
                          'bg-rose-100 text-rose-700'
                        }`}>
                          {r.profitMargin.toFixed(1)}%
                        </span>
                      </td>
                      <td className="px-3 py-2.5 text-right">
                        <div className="text-xs font-bold text-slate-700">{r.usagePercent.toFixed(0)}%</div>
                        <div className="h-1 w-12 rounded-full bg-slate-200 overflow-hidden mt-0.5 ml-auto">
                          <div className={`h-full ${r.usagePercent > 75 ? 'bg-rose-500' : r.usagePercent > 50 ? 'bg-amber-500' : 'bg-emerald-500'}`} style={{ width: `${r.usagePercent}%` }} />
                        </div>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </div>
        </div>
      )}

      {/* ═══ TODAY TAB ═══ */}
      {tab === 'today' && today && (
        <div className="space-y-5">
          <div className="grid sm:grid-cols-4 gap-3">
            <BigKpi label="Total Cuts" value={today.cutCount} sub="today" tone="violet" icon={Scissors} />
            <BigKpi label="Sqft Sold" value={today.totalSqftSold.toFixed(2)} unit="sqft" tone="emerald" icon={Layers} />
            <BigKpi label="Length Sold" value={today.totalLengthSoldFt.toFixed(1)} unit="ft" tone="blue" icon={Sparkles} />
            <BigKpi
              label="Avg per Cut"
              value={todayAnalytics?.avgSqftPerCut?.toFixed(2) ?? '0'}
              unit="sqft"
              sub={todayAnalytics?.peakHour ? `Peak: ${String(todayAnalytics.peakHour.hour).padStart(2, '0')}:00` : ''}
              tone="amber"
              icon={Zap}
            />
          </div>

          {todayAnalytics && (
            <ChartCard title="Hourly Activity Chart" icon={LineIcon} desc="When are the busiest hours?">
              <ResponsiveContainer width="100%" height={300}>
                <ComposedChart data={todayAnalytics.hourlyData}>
                  <CartesianGrid strokeDasharray="3 3" stroke="#e2e8f0" />
                  <XAxis dataKey="hour" stroke="#64748b" fontSize={10} />
                  <YAxis yAxisId="left" stroke="#10b981" fontSize={10} />
                  <YAxis yAxisId="right" orientation="right" stroke="#8b5cf6" fontSize={10} />
                  <Tooltip />
                  <Legend wrapperStyle={{ fontSize: 11 }} />
                  <Bar yAxisId="left" dataKey="sqft" fill="#10b981" radius={[4, 4, 0, 0]} name="Sqft" />
                  <Line yAxisId="right" type="monotone" dataKey="cuts" stroke="#8b5cf6" strokeWidth={3} name="Cut count" dot={{ r: 4 }} />
                </ComposedChart>
              </ResponsiveContainer>
            </ChartCard>
          )}

          <div className="rounded-3xl bg-white border-2 border-slate-200 overflow-hidden shadow-sm">
            <div className="p-4 border-b-2 border-slate-100 bg-gradient-to-r from-violet-50/50 to-white">
              <h3 className="font-extrabold text-slate-900 flex items-center gap-2">
                <Clock className="h-4 w-4 text-violet-600" /> Activity Timeline
              </h3>
              <p className="text-xs text-slate-500 font-semibold mt-0.5">{today.cuts.length} cuts today</p>
            </div>
            {today.cuts.length === 0 ? (
              <div className="p-12 text-center">
                <Clock className="h-12 w-12 text-slate-300 mx-auto mb-2" />
                <div className="font-bold text-slate-700">Aaj koi cut nahi</div>
                <p className="text-xs text-slate-500 mt-1">POS se sale karte hi yahan show hoga</p>
              </div>
            ) : (
              <div className="divide-y divide-slate-100 max-h-[500px] overflow-y-auto">
                {today.cuts.map((c) => (
                  <div key={c.id} className="p-3 flex items-center gap-3 hover:bg-slate-50 transition">
                    <div className="h-10 w-10 rounded-xl bg-gradient-to-br from-emerald-500 to-emerald-700 text-white flex items-center justify-center shadow-md shrink-0">
                      <Scissors className="h-4 w-4" />
                    </div>
                    <div className="flex-1 min-w-0">
                      <div className="flex items-center gap-2 flex-wrap">
                        <span className="font-mono font-extrabold text-emerald-700 text-sm">{c.rollNumber}</span>
                        <span className="text-xs text-slate-400">•</span>
                        <span className="font-bold text-slate-900 text-sm truncate">{c.productName}</span>
                        {c.variantName && <span className="text-[11px] font-bold text-violet-700">— {c.variantName}</span>}
                      </div>
                      {c.note && <div className="text-[11px] text-slate-500 mt-0.5 italic">{c.note}</div>}
                    </div>
                    <div className="text-right shrink-0">
                      <div className="font-extrabold text-emerald-700 text-sm tabular-nums">{c.sqft.toFixed(2)} sqft</div>
                      <div className="text-[10px] text-slate-500 font-bold">{new Date(c.createdAt).toLocaleTimeString('en-PK', { hour: '2-digit', minute: '2-digit' })}</div>
                    </div>
                  </div>
                ))}
              </div>
            )}
          </div>
        </div>
      )}

      {/* ═══ DESIGNS TAB ═══ */}
      {tab === 'designs' && (
        <div className="space-y-5">
          <div className="rounded-2xl bg-white border-2 border-slate-200 p-3 flex items-center gap-2 flex-wrap shadow-sm">
            <div className="text-xs font-extrabold text-slate-700">Period:</div>
            {[7, 30, 90, 180].map((d) => (
              <button
                key={d}
                onClick={() => setTopDays(d)}
                className={`px-3 py-1.5 rounded-lg text-xs font-extrabold transition ${
                  topDays === d ? 'bg-amber-600 text-white shadow-sm' : 'bg-slate-100 text-slate-700 hover:bg-slate-200'
                }`}
              >
                Last {d} days
              </button>
            ))}
          </div>

          {!designAnalytics ? (
            <div className="rounded-3xl bg-white border-2 border-dashed border-slate-200 p-12 text-center">
              <Award className="h-12 w-12 text-slate-300 mx-auto mb-2" />
              <div className="font-bold text-slate-700">No sales data yet</div>
              <p className="text-xs text-slate-500 mt-1">Top designs will appear after sales activity</p>
            </div>
          ) : (
            <>
              <div className="grid sm:grid-cols-3 gap-3">
                <BigKpi label="Total Designs" value={top.length} sub="Variants sold" tone="amber" icon={Award} />
                <BigKpi label="Revenue" value={formatPKRFull(designAnalytics.totalRevenue)} sub={`${designAnalytics.totalSales} sales`} tone="emerald" icon={DollarSign} />
                <BigKpi label="Sqft Sold" value={designAnalytics.totalSqft.toFixed(0)} unit="sqft" sub="Total volume" tone="blue" icon={Layers} />
              </div>

              <div className="grid lg:grid-cols-[1.5fr_1fr] gap-4">
                <ChartCard title="Top 10 Designs by Revenue" icon={BarChart2} desc="Highest earning variants">
                  <ResponsiveContainer width="100%" height={320}>
                    <BarChart data={designAnalytics.top10} margin={{ top: 5, right: 10, left: 0, bottom: 60 }}>
                      <CartesianGrid strokeDasharray="3 3" stroke="#e2e8f0" />
                      <XAxis dataKey="name" stroke="#64748b" fontSize={9} angle={-30} textAnchor="end" height={70} />
                      <YAxis stroke="#64748b" fontSize={10} tickFormatter={(v) => `${(v / 1000).toFixed(0)}K`} />
                      <Tooltip formatter={(v: any) => formatPKR(v)} />
                      <Bar dataKey="revenue" fill="#f59e0b" radius={[4, 4, 0, 0]} name="Revenue" />
                    </BarChart>
                  </ResponsiveContainer>
                </ChartCard>

                <ChartCard title="Revenue Share" icon={PieIcon} desc="Top 8 designs vs others">
                  <ResponsiveContainer width="100%" height={320}>
                    <PieChart>
                      <Pie
                        data={designAnalytics.pieData}
                        cx="50%"
                        cy="50%"
                        outerRadius={100}
                        dataKey="value"
                      >
                        {designAnalytics.pieData.map((entry, i) => (
                          <Cell key={i} fill={entry.color} />
                        ))}
                      </Pie>
                      <Tooltip formatter={(v: any) => formatPKR(v)} />
                    </PieChart>
                  </ResponsiveContainer>
                </ChartCard>
              </div>

              {/* Top 3 medals */}
              <div className="grid sm:grid-cols-3 gap-3">
                {top.slice(0, 3).map((d, i) => (
                  <div
                    key={`${d.productId}:${d.variantId}`}
                    className={`rounded-2xl border-2 p-4 shadow-md ${
                      i === 0 ? 'bg-gradient-to-br from-amber-100 to-amber-50 border-amber-400' :
                      i === 1 ? 'bg-gradient-to-br from-slate-100 to-white border-slate-300' :
                      'bg-gradient-to-br from-orange-100 to-orange-50 border-orange-400'
                    }`}
                  >
                    <div className="flex items-center justify-between mb-2">
                      <div className={`h-12 w-12 rounded-2xl font-extrabold flex items-center justify-center shadow-lg ${
                        i === 0 ? 'bg-gradient-to-br from-amber-500 to-amber-700 text-white' :
                        i === 1 ? 'bg-gradient-to-br from-slate-400 to-slate-600 text-white' :
                        'bg-gradient-to-br from-orange-500 to-orange-700 text-white'
                      }`}>
                        <Crown className="h-6 w-6" />
                      </div>
                      <div className={`text-3xl font-extrabold ${i === 0 ? 'text-amber-700' : i === 1 ? 'text-slate-500' : 'text-orange-700'}`}>
                        #{i + 1}
                      </div>
                    </div>
                    <div className="font-extrabold text-slate-900 text-base line-clamp-1">{d.productName}</div>
                    {d.variantName && (
                      <div className="text-xs font-extrabold text-violet-700 flex items-center gap-1 mt-1">
                        {d.variantColor && <span className="h-2 w-2 rounded-full" style={{ backgroundColor: d.variantColor }} />}
                        {d.variantName}
                      </div>
                    )}
                    <div className="mt-3 pt-3 border-t-2 border-current/10">
                      <div className="text-[10px] uppercase font-extrabold opacity-70">Revenue</div>
                      <div className="text-2xl font-extrabold tabular-nums">{formatPKRFull(d.revenue)}</div>
                      <div className="text-xs font-bold opacity-75 mt-0.5">{d.totalSqft.toFixed(0)} sqft • {d.salesCount} sales</div>
                    </div>
                  </div>
                ))}
              </div>
            </>
          )}
        </div>
      )}

      {/* ═══ SLOW MOVERS TAB ═══ */}
      {tab === 'slow' && (
        <div className="space-y-5">
          <div className="rounded-2xl bg-white border-2 border-slate-200 p-3 flex items-center gap-2 flex-wrap shadow-sm">
            <div className="text-xs font-extrabold text-slate-700">Idle threshold:</div>
            {[30, 60, 90, 180].map((d) => (
              <button
                key={d}
                onClick={() => setSlowDays(d)}
                className={`px-3 py-1.5 rounded-lg text-xs font-extrabold transition ${
                  slowDays === d ? 'bg-rose-600 text-white shadow-sm' : 'bg-slate-100 text-slate-700 hover:bg-slate-200'
                }`}
              >
                {d}+ days
              </button>
            ))}
          </div>

          {!slowAnalytics ? (
            <div className="rounded-3xl bg-white border-2 border-dashed border-emerald-300 p-12 text-center">
              <div className="h-16 w-16 rounded-3xl bg-emerald-100 text-emerald-600 mx-auto flex items-center justify-center mb-3">
                <Sparkles className="h-8 w-8" />
              </div>
              <div className="font-extrabold text-emerald-900 text-lg">All rolls active!</div>
              <p className="text-sm text-emerald-700 mt-1">Koi roll {slowDays}+ din se idle nahi hai — bohut acha bhai 🎉</p>
            </div>
          ) : (
            <>
              <div className="grid sm:grid-cols-4 gap-3">
                <BigKpi label="Slow Rolls" value={slow.length} sub={`${slowDays}+ days idle`} tone="rose" icon={Snowflake} />
                <BigKpi label="Locked Capital" value={formatPKRFull(slowAnalytics.totalLocked)} sub="In idle stock" tone="amber" icon={Target} />
                <BigKpi label="Idle Sqft" value={slowAnalytics.totalSqft.toFixed(0)} unit="sqft" tone="violet" icon={Layers} />
                <BigKpi label="Avg Days Idle" value={Math.round(slowAnalytics.avgDays)} unit="days" tone="blue" icon={Calendar} />
              </div>

              <div className="grid lg:grid-cols-2 gap-4">
                <ChartCard title="Idle Duration Distribution" icon={PieIcon} desc="How long are rolls sitting?">
                  <ResponsiveContainer width="100%" height={280}>
                    <PieChart>
                      <Pie
                        data={slowAnalytics.distData}
                        cx="50%"
                        cy="50%"
                        outerRadius={100}
                        dataKey="value"
                        label={(entry: any) => `${entry.name}: ${entry.value}`}
                      >
                        {slowAnalytics.distData.map((entry, i) => (
                          <Cell key={i} fill={entry.color} />
                        ))}
                      </Pie>
                      <Tooltip />
                    </PieChart>
                  </ResponsiveContainer>
                </ChartCard>

                <ChartCard title="Top 10 Locked Capital" icon={Target} desc="Most stuck investment">
                  <ResponsiveContainer width="100%" height={280}>
                    <BarChart
                      data={slowAnalytics.top10Locked.map((r) => ({
                        name: r.rollNumber,
                        capital: r.stockValueCost,
                        days: r.daysSinceLastActivity,
                      }))}
                      layout="vertical"
                      margin={{ top: 5, right: 10, left: 50, bottom: 5 }}
                    >
                      <CartesianGrid strokeDasharray="3 3" stroke="#e2e8f0" />
                      <XAxis type="number" stroke="#64748b" fontSize={10} tickFormatter={(v) => `${(v / 1000).toFixed(0)}K`} />
                      <YAxis dataKey="name" type="category" stroke="#64748b" fontSize={10} width={70} />
                      <Tooltip formatter={(v: any) => formatPKR(v)} />
                      <Bar dataKey="capital" fill="#ef4444" radius={[0, 4, 4, 0]} name="Locked Capital" />
                    </BarChart>
                  </ResponsiveContainer>
                </ChartCard>
              </div>

              <div className="rounded-3xl bg-white border-2 border-rose-200 overflow-hidden shadow-sm">
                <div className="p-4 border-b-2 border-rose-100 bg-gradient-to-r from-rose-50 to-orange-50">
                  <h3 className="font-extrabold text-rose-900 flex items-center gap-2">
                    <Flame className="h-4 w-4" /> {slow.length} rolls need attention
                  </h3>
                  <p className="text-xs text-rose-700 font-semibold mt-0.5">
                    Consider clearance, discount sale, or move to high-traffic shop
                  </p>
                </div>
                <div className="divide-y divide-slate-100 max-h-[500px] overflow-y-auto">
                  {slow.map((r) => (
                    <Link key={r.id} to={`/carpet-rolls/${r.id}`} className="p-3 flex items-center gap-3 hover:bg-rose-50/30 transition group">
                      <div className="h-12 w-12 rounded-xl bg-gradient-to-br from-rose-500 to-rose-700 text-white flex items-center justify-center font-extrabold shadow-md shrink-0">
                        <div className="text-center leading-none">
                          <div className="text-base">{r.daysSinceLastActivity}</div>
                          <div className="text-[8px] opacity-90">days</div>
                        </div>
                      </div>
                      <div className="flex-1 min-w-0">
                        <div className="font-mono font-extrabold text-slate-900 text-sm">{r.rollNumber}</div>
                        <div className="text-xs text-slate-600 truncate">
                          {r.productName}
                          {r.variantName && <span className="text-violet-700 font-bold"> — {r.variantName}</span>}
                        </div>
                      </div>
                      <div className="text-right shrink-0">
                        <div className="font-extrabold text-slate-900 text-sm tabular-nums">{r.remainingSqft.toFixed(0)} sqft</div>
                        <div className="text-[10px] text-amber-700 font-bold">Locked: {formatPKRFull(r.stockValueCost)}</div>
                      </div>
                      <ChevronRight className="h-4 w-4 text-slate-400 group-hover:text-rose-500 shrink-0" />
                    </Link>
                  ))}
                </div>
              </div>
            </>
          )}
        </div>
      )}

      {/* ═══ CUT PIECES TAB ═══ */}
      {tab === 'pieces' && pieces && (
        <div className="space-y-5">
          <div className="grid sm:grid-cols-2 lg:grid-cols-4 gap-3">
            <BigKpi label="Available" value={pieces.availableCount} sub={`${pieces.availableSqft.toFixed(2)} sqft`} tone="emerald" icon={CheckCircle2} />
            <BigKpi label="Sold" value={pieces.soldCount} sub={formatPKRFull(pieces.soldRevenue)} tone="violet" icon={Award} />
            <BigKpi label="Stock Value" value={formatPKRFull(pieces.availableValue)} sub={`Cost: ${formatPKRFull(pieces.availableCost)}`} tone="blue" icon={DollarSign} />
            <BigKpi label="Potential Profit" value={formatPKRFull(pieces.potentialProfit)} sub="if all sold" tone="amber" icon={TrendingUp} trend="up" />
          </div>

          {/* Status pie chart */}
          {pieces.pieces.length > 0 && (
            <div className="grid lg:grid-cols-2 gap-4">
              <ChartCard title="Status Distribution" icon={PieIcon} desc="Cut pieces by status">
                <ResponsiveContainer width="100%" height={280}>
                  <PieChart>
                    <Pie
                      data={[
                        { name: 'Available', value: pieces.availableCount, color: '#10b981' },
                        { name: 'Sold', value: pieces.soldCount, color: '#8b5cf6' },
                      ].filter((d) => d.value > 0)}
                      cx="50%"
                      cy="50%"
                      innerRadius={60}
                      outerRadius={100}
                      paddingAngle={3}
                      dataKey="value"
                    >
                      <Cell fill="#10b981" />
                      <Cell fill="#8b5cf6" />
                    </Pie>
                    <Tooltip />
                    <Legend />
                  </PieChart>
                </ResponsiveContainer>
              </ChartCard>

              <ChartCard title="Value Comparison" icon={BarChart2} desc="Cost vs Sale value">
                <ResponsiveContainer width="100%" height={280}>
                  <BarChart
                    data={[
                      { name: 'Available', cost: pieces.availableCost, value: pieces.availableValue },
                      { name: 'Sold', cost: 0, value: pieces.soldRevenue },
                    ]}
                  >
                    <CartesianGrid strokeDasharray="3 3" stroke="#e2e8f0" />
                    <XAxis dataKey="name" stroke="#64748b" fontSize={11} />
                    <YAxis stroke="#64748b" fontSize={10} tickFormatter={(v) => `${(v / 1000).toFixed(0)}K`} />
                    <Tooltip formatter={(v: any) => formatPKR(v)} />
                    <Legend wrapperStyle={{ fontSize: 11 }} />
                    <Bar dataKey="cost" fill="#3b82f6" name="Cost" radius={[4, 4, 0, 0]} />
                    <Bar dataKey="value" fill="#10b981" name="Value" radius={[4, 4, 0, 0]} />
                  </BarChart>
                </ResponsiveContainer>
              </ChartCard>
            </div>
          )}

          <div className="rounded-3xl bg-white border-2 border-slate-200 overflow-hidden shadow-sm">
            <div className="p-4 border-b-2 border-slate-100 bg-gradient-to-r from-violet-50/50 to-white flex items-center justify-between flex-wrap gap-2">
              <h3 className="font-extrabold text-slate-900">All Cut Pieces ({pieces.pieces.length})</h3>
              <Link to="/carpet-cut-pieces" className="text-xs font-bold text-violet-700 hover:underline inline-flex items-center gap-1">
                Manage all <ChevronRight className="h-3 w-3" />
              </Link>
            </div>
            {pieces.pieces.length === 0 ? (
              <div className="p-12 text-center">
                <Scissors className="h-12 w-12 text-slate-300 mx-auto mb-2" />
                <div className="font-bold text-slate-700">No cut pieces yet</div>
              </div>
            ) : (
              <div className="overflow-x-auto">
                <table className="w-full text-sm">
                  <thead className="bg-slate-50 border-b-2 border-slate-200">
                    <tr>
                      <th className="px-3 py-2 text-left text-[10px] font-extrabold uppercase tracking-wider text-slate-700">Code</th>
                      <th className="px-3 py-2 text-left text-[10px] font-extrabold uppercase tracking-wider text-slate-700">Product</th>
                      <th className="px-3 py-2 text-right text-[10px] font-extrabold uppercase tracking-wider text-slate-700">Size</th>
                      <th className="px-3 py-2 text-right text-[10px] font-extrabold uppercase tracking-wider text-slate-700">Price</th>
                      <th className="px-3 py-2 text-center text-[10px] font-extrabold uppercase tracking-wider text-slate-700">Status</th>
                      <th className="px-3 py-2 text-left text-[10px] font-extrabold uppercase tracking-wider text-slate-700">Source</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-slate-100">
                    {pieces.pieces.map((p) => (
                      <tr key={p.id} className="hover:bg-slate-50">
                        <td className="px-3 py-2.5 font-mono font-extrabold text-xs text-violet-700">{p.pieceCode}</td>
                        <td className="px-3 py-2.5">
                          <div className="font-bold text-slate-900 text-xs">{p.productName}</div>
                          {p.variantName && (
                            <div className="text-[10px] text-violet-700 font-bold flex items-center gap-1">
                              {p.variantColor && <span className="h-2 w-2 rounded-full" style={{ backgroundColor: p.variantColor }} />}
                              {p.variantName}
                            </div>
                          )}
                        </td>
                        <td className="px-3 py-2.5 text-right text-xs">
                          <div className="font-bold text-slate-900">{p.widthFt}×{p.lengthFt}ft</div>
                          <div className="text-[10px] text-violet-700 font-bold">{p.totalSqft.toFixed(2)} sqft</div>
                        </td>
                        <td className="px-3 py-2.5 text-right text-xs font-extrabold text-emerald-700">{formatPKRFull(p.salePrice)}</td>
                        <td className="px-3 py-2.5 text-center">
                          <span className={`px-2 py-0.5 rounded-full text-[10px] font-extrabold ${
                            p.status === 'AVAILABLE' ? 'bg-emerald-100 text-emerald-700' :
                            p.status === 'SOLD' ? 'bg-violet-100 text-violet-700' :
                            p.status === 'DAMAGED' ? 'bg-rose-100 text-rose-700' :
                            'bg-amber-100 text-amber-700'
                          }`}>
                            {p.status}
                          </span>
                        </td>
                        <td className="px-3 py-2.5 text-xs font-mono font-bold text-slate-600">{p.sourceRoll || '—'}</td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            )}
          </div>
        </div>
      )}
    </div>
  );
}

// ═════════════════════════════════════════════════════════════
// HELPER COMPONENTS
// ═════════════════════════════════════════════════════════════

function ChartCard({ title, icon: Icon, desc, children }: { title: string; icon: any; desc: string; children: React.ReactNode }) {
  return (
    <div className="rounded-3xl bg-white border-2 border-slate-200 p-5 shadow-sm">
      <div className="flex items-center gap-2 mb-3">
        <div className="h-9 w-9 rounded-xl bg-gradient-to-br from-slate-700 to-slate-900 text-white flex items-center justify-center shadow-md">
          <Icon className="h-4 w-4" />
        </div>
        <div>
          <h3 className="font-extrabold text-slate-900">{title}</h3>
          <p className="text-[10px] text-slate-500 font-semibold">{desc}</p>
        </div>
      </div>
      {children}
    </div>
  );
}

function BigKpi({
  label, value, unit, sub, tone, icon: Icon, trend,
}: {
  label: string;
  value: string | number;
  unit?: string;
  sub?: string;
  tone: string;
  icon: any;
  trend?: 'up' | 'down';
}) {
  const tones: Record<string, string> = {
    emerald: 'from-emerald-50 to-green-50 border-emerald-200 text-emerald-900',
    blue: 'from-blue-50 to-indigo-50 border-blue-200 text-blue-900',
    violet: 'from-violet-50 to-purple-50 border-violet-200 text-violet-900',
    amber: 'from-amber-50 to-orange-50 border-amber-200 text-amber-900',
    rose: 'from-rose-50 to-pink-50 border-rose-200 text-rose-900',
  };
  const iconTones: Record<string, string> = {
    emerald: 'from-emerald-500 to-emerald-700',
    blue: 'from-blue-500 to-blue-700',
    violet: 'from-violet-500 to-violet-700',
    amber: 'from-amber-500 to-amber-700',
    rose: 'from-rose-500 to-rose-700',
  };
  return (
    <div className={`rounded-2xl bg-gradient-to-br border-2 p-4 shadow-sm ${tones[tone]}`}>
      <div className="flex items-center justify-between mb-2">
        <div className={`h-10 w-10 rounded-xl bg-gradient-to-br ${iconTones[tone]} text-white flex items-center justify-center shadow-md`}>
          <Icon className="h-5 w-5" />
        </div>
        {trend === 'up' && <ArrowUpRight className="h-4 w-4 opacity-60" />}
        {trend === 'down' && <ArrowDownRight className="h-4 w-4 opacity-60" />}
      </div>
      <div className="text-[10px] uppercase tracking-wider font-extrabold opacity-75">{label}</div>
      <div className="mt-1 flex items-baseline gap-1">
        <div className="text-2xl font-extrabold tabular-nums leading-none">{value}</div>
        {unit && <div className="text-xs font-extrabold opacity-70">{unit}</div>}
      </div>
      {sub && <div className="text-[10px] font-bold opacity-70 mt-1">{sub}</div>}
    </div>
  );
}

function StatusMini({ label, value, color }: { label: string; value: number; color: string }) {
  const tones: Record<string, string> = {
    emerald: 'bg-emerald-50 border-emerald-200 text-emerald-900',
    slate: 'bg-slate-50 border-slate-200 text-slate-700',
    rose: 'bg-rose-50 border-rose-200 text-rose-900',
  };
  return (
    <div className={`rounded-lg border p-2 text-center ${tones[color]}`}>
      <div className="text-[9px] uppercase font-extrabold opacity-75">{label}</div>
      <div className="text-lg font-extrabold tabular-nums mt-0.5">{value}</div>
    </div>
  );
}

function MiniStat({ label, value, sub, tone }: { label: string; value: string | number; sub?: string; tone: string }) {
  const tones: Record<string, string> = {
    emerald: 'text-emerald-900',
    blue: 'text-blue-900',
    violet: 'text-violet-900',
    amber: 'text-amber-900',
  };
  return (
    <div className="rounded-xl bg-white border border-violet-200 p-3 shadow-sm">
      <div className="text-[10px] uppercase font-extrabold text-slate-500">{label}</div>
      <div className={`text-lg font-extrabold tabular-nums mt-0.5 ${tones[tone]}`}>{value}</div>
      {sub && <div className="text-[10px] font-bold text-slate-500 mt-0.5">{sub}</div>}
    </div>
  );
}
