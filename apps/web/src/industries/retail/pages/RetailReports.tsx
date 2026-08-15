import { useState, useMemo } from 'react';
import {
  BarChart3, ShoppingCart, TrendingUp, Target, Award, Users,
  Crown, Activity, DollarSign, Star, Package, Boxes,
  Printer, TrendingDown, AlertTriangle, Percent,
  Calendar, Zap, Sparkles, Clock, Trophy, FileSpreadsheet,
  Flame, RefreshCw, CalendarDays, CalendarRange,
  Filter, X, Sun, Moon, Coffee, Sunrise,
} from 'lucide-react';
import {
  ResponsiveContainer, AreaChart, Area, BarChart, Bar, PieChart, Pie, Cell,
  XAxis, YAxis, Tooltip, CartesianGrid, Legend, Line,
  ComposedChart, RadarChart, Radar, PolarGrid, PolarAngleAxis, PolarRadiusAxis,
} from 'recharts';
import { formatPKR } from '@core/lib/format';
import { useReportsData } from '@modules/reports/reports/hooks/useReportsData';
import {
  ReportsHero, TabSwitcher, KpiCard, ChartCard, EmptyChart,
  PnLLine, MiniStat, dayLabel, PIE_COLORS,
} from '@modules/reports/reports/components/ReportsShared';
import { useCostHidden, PrivacyToggle } from '@core/ui/HiddenValue';
import { useAuthStore } from '@core/stores/auth.store';
import { toast } from 'sonner';

/* ═════════════════════════════════════════════════════════════
   NAFAA RETAIL REPORTS — FULL BEST v3 (Final)
   ─────────────────────────────────────────────────────────────
   💯 Perfect dark + light mode (chart colors WCAG AA)
   📅 Custom date range picker in header
   🖨️ Fixed print/PDF — clean multi-page output
   📊 4 CSV exports (Overview / Products / Customers / Full)
   🎨 Patterns tab fully redesigned with rich analytics
   ═════════════════════════════════════════════════════════════ */

const TABS = [
  { id: 'overview',   label: 'Overview',   icon: BarChart3 },
  { id: 'sales',      label: 'Sales',      icon: TrendingUp },
  { id: 'products',   label: 'Products',   icon: Package },
  { id: 'customers',  label: 'Customers',  icon: Users },
  { id: 'inventory',  label: 'Inventory',  icon: Boxes },
  { id: 'patterns',   label: 'Patterns',   icon: Activity },
  { id: 'insights',   label: 'Insights',   icon: Sparkles },
];

// Weekday emojis for Patterns
const WEEKDAY_META: Record<string, { emoji: string; color: string }> = {
  Sun: { emoji: '🌞', color: '#f59e0b' },
  Mon: { emoji: '☕', color: '#3b82f6' },
  Tue: { emoji: '⚡', color: '#8b5cf6' },
  Wed: { emoji: '🎯', color: '#06b6d4' },
  Thu: { emoji: '🚀', color: '#10b981' },
  Fri: { emoji: '🎉', color: '#ec4899' },
  Sat: { emoji: '🏆', color: '#f97316' },
};

// Chart tooltip style (dark-mode friendly)
const TOOLTIP_STYLE = {
  borderRadius: 12,
  border: '1px solid rgba(148,163,184,0.2)',
  backgroundColor: 'rgba(15,23,42,0.95)',
  color: '#f8fafc',
  boxShadow: '0 20px 40px rgba(0,0,0,0.3)',
  fontSize: 12,
};
const TOOLTIP_LABEL = { color: '#94a3b8', fontWeight: 700 };

export default function RetailReportsV2() {
  const [days, setDays] = useState(30);
  const [tab, setTab] = useState('overview');
  const hideCost = useCostHidden();
  const tenantName = useAuthStore((s) => s.tenant?.name);
  const shopName = useAuthStore((s) => s.user?.assignedShop?.name);
  const [csvMenuOpen, setCsvMenuOpen] = useState(false);

  // Custom date range
  const [customRange, setCustomRange] = useState(false);
  const [customStart, setCustomStart] = useState<string>('');
  const [customEnd, setCustomEnd] = useState<string>('');

  // Compute effective days based on custom range
  const effectiveDays = useMemo(() => {
    if (customRange && customStart && customEnd) {
      const start = new Date(customStart);
      const end = new Date(customEnd);
      const diff = Math.ceil((end.getTime() - start.getTime()) / (1000 * 86400)) + 1;
      return Math.max(diff, 1);
    }
    return days;
  }, [customRange, customStart, customEnd, days]);

  const reports = useReportsData(effectiveDays);

  const trendData = useMemo(
    () => reports.trend.map((p: any) => ({ ...p, label: dayLabel(p.date) })),
    [reports.trend],
  );
  const sveData = useMemo(
    () => reports.salesVsExpenses.map((p: any) => ({ ...p, label: dayLabel(p.date) })),
    [reports.salesVsExpenses],
  );

  const totals = useMemo(() => {
    const totalRevenue = reports.trend.reduce((s: number, p: any) => s + p.sales, 0);
    const totalProfit  = reports.trend.reduce((s: number, p: any) => s + p.profit, 0);
    const totalOrders  = reports.trend.reduce((s: number, p: any) => s + p.orders, 0);
    const totalPaid    = reports.trend.reduce((s: number, p: any) => s + (p.paid   || 0), 0);
    const totalCredit  = reports.trend.reduce((s: number, p: any) => s + (p.credit || 0), 0);
    const aov = totalOrders > 0 ? totalRevenue / totalOrders : 0;
    const profitMargin = totalRevenue > 0 ? (totalProfit / totalRevenue) * 100 : 0;
    return { totalRevenue, totalProfit, totalOrders, totalPaid, totalCredit, aov, profitMargin };
  }, [reports.trend]);

  const { totalRevenue, totalProfit, totalOrders, totalPaid, totalCredit, aov, profitMargin } = totals;

  const bestDay = useMemo(() => {
    if (trendData.length === 0) return { label: '—', sales: 0 };
    return trendData.reduce((best: any, day: any) => (day.sales > best.sales ? day : best), trendData[0]);
  }, [trendData]);

  const worstDay = useMemo(() => {
    const withSales = trendData.filter((d: any) => d.sales > 0);
    if (withSales.length === 0) return { label: '—', sales: 0 };
    return withSales.reduce((worst: any, day: any) => (day.sales < worst.sales ? day : worst), withSales[0]);
  }, [trendData]);

  const showCost = (v: number) => (hideCost ? '•••••' : formatPKR(v));

  const exportPDF = () => {
    toast.success('Print dialog khul raha hai...');
    setTimeout(() => window.print(), 100);
  };

  const downloadCSV = (rows: any[][], filename: string) => {
    const csv = rows
      .map((r) => r.map((c) => `"${String(c ?? '').replace(/"/g, '""')}"`).join(','))
      .join('\n');
    const blob = new Blob(['\ufeff' + csv], { type: 'text/csv;charset=utf-8' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = `${filename}-${new Date().toISOString().slice(0, 10)}.csv`;
    a.click();
    URL.revokeObjectURL(url);
    toast.success(`${filename}.csv download ho gaya`);
    setCsvMenuOpen(false);
  };

  const rangeLabel = customRange && customStart && customEnd
    ? `${new Date(customStart).toLocaleDateString('en-PK', { day: 'numeric', month: 'short' })} — ${new Date(customEnd).toLocaleDateString('en-PK', { day: 'numeric', month: 'short', year: 'numeric' })}`
    : `Last ${days} days`;

  const buildHeader = () => [
    [`Retail Report — ${tenantName || 'Nafaa'}`],
    [`Shop: ${shopName || 'All'}  •  Period: ${rangeLabel}  •  Generated: ${new Date().toLocaleString('en-PK')}`],
    [`Total Revenue: ${totalRevenue.toFixed(2)}`],
    [`Total Profit: ${totalProfit.toFixed(2)}`],
    [`Total Orders: ${totalOrders}`],
    [`Avg Order Value: ${aov.toFixed(2)}`],
    [`Profit Margin: ${profitMargin.toFixed(1)}%`],
    [''],
  ];

  const exportOverviewCSV = () => {
    const headers = ['Date', 'Sales', 'Profit', 'Orders', 'Paid (Cash)', 'Udhaar', 'Expenses'];
    const rows = trendData.map((d: any) => [
      d.label, d.sales.toFixed(2), d.profit.toFixed(2), d.orders,
      (d.paid || 0).toFixed(2), (d.credit || 0).toFixed(2), (d.expenses || 0).toFixed(2),
    ]);
    downloadCSV([...buildHeader(), ['DAILY TREND'], headers, ...rows], `retail-overview-${effectiveDays}days`);
  };

  const exportProductsCSV = () => {
    const headers = ['#', 'Product', 'Qty Sold', 'Unit', 'Orders', 'Revenue', 'Profit', 'Margin %'];
    const rows = reports.topProducts.map((p: any, i: number) => [
      i + 1, p.product?.name || '', p.quantitySold, p.product?.unit || '',
      p.orderCount, p.revenue.toFixed(2), p.profit.toFixed(2), (p.margin ?? 0).toFixed(1),
    ]);
    downloadCSV([...buildHeader(), ['TOP PRODUCTS'], headers, ...rows], `retail-products-${effectiveDays}days`);
  };

  const exportCustomersCSV = () => {
    const headers = ['#', 'Customer', 'Phone', 'Orders', 'Total Spent', 'AOV'];
    const rows = reports.topCustomers.map((c: any, i: number) => [
      i + 1, c.customer?.name || 'Unknown', c.customer?.phone || '',
      c.orderCount, c.totalSpent.toFixed(2), c.avgOrderValue.toFixed(2),
    ]);
    downloadCSV([...buildHeader(), ['TOP CUSTOMERS'], headers, ...rows], `retail-customers-${effectiveDays}days`);
  };

  const exportFullCSV = () => {
    const sections: any[][] = [...buildHeader()];
    sections.push(['═══ DAILY TREND ═══']);
    sections.push(['Date', 'Sales', 'Profit', 'Orders', 'Paid', 'Udhaar']);
    trendData.forEach((d: any) => {
      sections.push([d.label, d.sales.toFixed(2), d.profit.toFixed(2), d.orders, (d.paid || 0).toFixed(2), (d.credit || 0).toFixed(2)]);
    });
    sections.push(['']);
    sections.push(['═══ TOP PRODUCTS ═══']);
    sections.push(['#', 'Product', 'Qty', 'Orders', 'Revenue', 'Profit', 'Margin %']);
    reports.topProducts.forEach((p: any, i: number) => {
      sections.push([i + 1, p.product?.name, p.quantitySold, p.orderCount, p.revenue.toFixed(2), p.profit.toFixed(2), (p.margin ?? 0).toFixed(1)]);
    });
    sections.push(['']);
    sections.push(['═══ TOP CUSTOMERS ═══']);
    sections.push(['#', 'Customer', 'Phone', 'Orders', 'Spent', 'AOV']);
    reports.topCustomers.forEach((c: any, i: number) => {
      sections.push([i + 1, c.customer?.name, c.customer?.phone || '', c.orderCount, c.totalSpent.toFixed(2), c.avgOrderValue.toFixed(2)]);
    });
    sections.push(['']);
    if (reports.categoryBreakdown.length > 0) {
      sections.push(['═══ CATEGORY BREAKDOWN ═══']);
      sections.push(['Category', 'Revenue', '% of Total']);
      const catTotal = reports.categoryBreakdown.reduce((s: number, c: any) => s + c.revenue, 0);
      reports.categoryBreakdown.forEach((c: any) => {
        const pct = catTotal > 0 ? (c.revenue / catTotal) * 100 : 0;
        sections.push([c.name, c.revenue.toFixed(2), pct.toFixed(1)]);
      });
      sections.push(['']);
    }
    if (reports.weekdayPattern.length > 0) {
      sections.push(['═══ WEEKDAY PATTERN ═══']);
      sections.push(['Day', 'Total Sales', 'Avg Sales']);
      reports.weekdayPattern.forEach((w: any) => {
        sections.push([w.day, w.sales.toFixed(2), w.avg.toFixed(2)]);
      });
    }
    downloadCSV(sections, `retail-full-report-${effectiveDays}days`);
  };

  const applyCustomRange = () => {
    if (!customStart || !customEnd) {
      toast.error('Start aur End date dono select karo');
      return;
    }
    if (new Date(customStart) > new Date(customEnd)) {
      toast.error('Start date End date se pehle honi chahiye');
      return;
    }
    setCustomRange(true);
    toast.success(`Custom range apply: ${effectiveDays} days`);
  };

  const clearCustomRange = () => {
    setCustomRange(false);
    setCustomStart('');
    setCustomEnd('');
  };

  const printDate = new Date().toLocaleString('en-PK', { dateStyle: 'full', timeStyle: 'short' });

  return (
    <div className="space-y-4 sm:space-y-5 pb-8 print:space-y-3">
      {/* ═══════════════════════════════════════════════════════
          PRINT-ONLY HEADER
          ═══════════════════════════════════════════════════════ */}
      <div className="hidden print:block print-header">
        <div className="flex items-center justify-between border-b-4 border-sky-600 pb-3 mb-4">
          <div>
            <h1 className="text-2xl font-black text-slate-900 leading-tight">
              🛒 {tenantName || 'My Store'}
            </h1>
            <p className="text-xs text-slate-600 font-semibold mt-1">
              {shopName ? `Shop: ${shopName}  •  ` : ''}Retail Analytics • {rangeLabel}
            </p>
          </div>
          <div className="text-right">
            <div className="text-[10px] uppercase font-bold text-slate-500">Generated</div>
            <div className="text-xs font-bold text-slate-900">{printDate}</div>
          </div>
        </div>

        <div className="grid grid-cols-4 gap-2 mb-4">
          <div className="border-2 border-sky-500 p-2 rounded">
            <div className="text-[9px] uppercase font-bold text-slate-600">Revenue</div>
            <div className="text-sm font-black text-sky-700">{formatPKR(totalRevenue)}</div>
          </div>
          <div className="border-2 border-emerald-500 p-2 rounded">
            <div className="text-[9px] uppercase font-bold text-slate-600">Profit</div>
            <div className="text-sm font-black text-emerald-700">{showCost(totalProfit)}</div>
          </div>
          <div className="border-2 border-violet-500 p-2 rounded">
            <div className="text-[9px] uppercase font-bold text-slate-600">Orders</div>
            <div className="text-sm font-black text-violet-700">{totalOrders}</div>
          </div>
          <div className="border-2 border-amber-500 p-2 rounded">
            <div className="text-[9px] uppercase font-bold text-slate-600">AOV</div>
            <div className="text-sm font-black text-amber-700">{formatPKR(aov)}</div>
          </div>
        </div>
      </div>

      {/* ═══════════════════════════════════════════════════════
          HERO
          ═══════════════════════════════════════════════════════ */}
      <div className="print:hidden">
        <ReportsHero
          gradient="from-slate-950 via-sky-900 to-cyan-700"
          emoji="🛒"
          industryLabel="Retail"
          title="Retail Reports"
          subtitle="Sales analysis, best sellers, customers, inventory, cash flow"
          days={days}
          setDays={(d: number) => { setDays(d); clearCustomRange(); }}
        />
      </div>

      {/* ═══════════════════════════════════════════════════════
          ACTION BAR — CSV, Print, Custom Date Range
          ═══════════════════════════════════════════════════════ */}
      <section className="print:hidden rounded-2xl bg-white dark:bg-slate-900/80 dark:backdrop-blur-sm border-2 border-slate-200 dark:border-slate-800 shadow-sm p-3 space-y-3">
        <div className="flex items-center justify-between gap-2 flex-wrap">
          <div className="text-xs sm:text-sm text-slate-600 dark:text-slate-300 font-bold flex items-center gap-2 flex-wrap">
            <CalendarRange className="h-4 w-4 text-sky-600 dark:text-sky-400" />
            <span>{customRange ? '🎯 Custom:' : '📅 Last'}</span>
            <strong className="text-sky-700 dark:text-sky-400">
              {customRange ? '' : `${days} days`}
            </strong>
            <span className="opacity-60">•</span>
            <span>{rangeLabel}</span>
            {customRange && (
              <button
                onClick={clearCustomRange}
                className="inline-flex items-center gap-1 h-6 px-2 rounded-md bg-rose-100 dark:bg-rose-500/20 text-rose-700 dark:text-rose-300 text-[10px] font-extrabold hover:bg-rose-200 dark:hover:bg-rose-500/30 transition"
              >
                <X className="h-3 w-3" /> Clear
              </button>
            )}
          </div>
          <div className="flex items-center gap-1.5 flex-wrap">
            <PrivacyToggle compact />

            {/* CSV dropdown */}
            <div className="relative">
              <button
                onClick={() => setCsvMenuOpen((v) => !v)}
                onBlur={() => setTimeout(() => setCsvMenuOpen(false), 200)}
                className="inline-flex items-center gap-1.5 h-9 px-3 rounded-xl bg-gradient-to-r from-emerald-600 to-teal-600 hover:from-emerald-700 hover:to-teal-700 text-white text-xs font-extrabold transition active:scale-95 shadow-md shadow-emerald-500/30"
              >
                <FileSpreadsheet className="h-3.5 w-3.5" /> Export CSV
                <span className="text-[10px] opacity-80">▼</span>
              </button>
              {csvMenuOpen && (
                <div className="absolute right-0 top-full mt-1 w-60 rounded-xl bg-white dark:bg-slate-900 border-2 border-slate-200 dark:border-slate-700 shadow-2xl z-20 overflow-hidden">
                  <CsvMenuItem icon={BarChart3} label="Overview / Daily Trend" onClick={exportOverviewCSV} />
                  <CsvMenuItem icon={Package} label="Top Products" onClick={exportProductsCSV} />
                  <CsvMenuItem icon={Users} label="Top Customers" onClick={exportCustomersCSV} />
                  <div className="border-t border-slate-200 dark:border-slate-700" />
                  <CsvMenuItem icon={Sparkles} label="Full Report (all data)" onClick={exportFullCSV} highlight />
                </div>
              )}
            </div>

            <button
              onClick={exportPDF}
              className="inline-flex items-center gap-1.5 h-9 px-3 rounded-xl bg-gradient-to-r from-slate-800 to-slate-900 dark:from-white dark:to-slate-100 text-white dark:text-slate-900 hover:from-slate-900 hover:to-slate-950 dark:hover:from-slate-100 dark:hover:to-slate-200 text-xs font-extrabold transition active:scale-95 shadow-md"
            >
              <Printer className="h-3.5 w-3.5" /> Print / PDF
            </button>
          </div>
        </div>

        {/* Custom date range picker */}
        <div className="border-t-2 border-slate-100 dark:border-slate-800 pt-3 flex items-center gap-2 flex-wrap">
          <div className="text-xs font-extrabold text-slate-600 dark:text-slate-400 inline-flex items-center gap-1.5">
            <CalendarDays className="h-3.5 w-3.5" /> Custom Range:
          </div>
          <input
            type="date"
            value={customStart}
            onChange={(e) => setCustomStart(e.target.value)}
            max={new Date().toISOString().slice(0, 10)}
            className="h-9 px-2.5 rounded-lg border-2 border-slate-200 dark:border-slate-700 bg-white dark:bg-slate-800 text-xs font-bold text-slate-900 dark:text-white focus:outline-none focus:border-sky-500 transition"
          />
          <span className="text-slate-400 dark:text-slate-500 font-bold text-xs">→</span>
          <input
            type="date"
            value={customEnd}
            onChange={(e) => setCustomEnd(e.target.value)}
            max={new Date().toISOString().slice(0, 10)}
            className="h-9 px-2.5 rounded-lg border-2 border-slate-200 dark:border-slate-700 bg-white dark:bg-slate-800 text-xs font-bold text-slate-900 dark:text-white focus:outline-none focus:border-sky-500 transition"
          />
          <button
            onClick={applyCustomRange}
            disabled={!customStart || !customEnd}
            className="h-9 px-4 rounded-lg bg-sky-600 hover:bg-sky-700 disabled:bg-slate-300 dark:disabled:bg-slate-700 disabled:cursor-not-allowed text-white text-xs font-extrabold transition inline-flex items-center gap-1.5 shadow-sm"
          >
            <Filter className="h-3.5 w-3.5" /> Apply
          </button>

          {/* Quick presets */}
          <div className="ml-auto flex items-center gap-1 flex-wrap">
            <QuickPreset label="Today"       onClick={() => { const d = new Date().toISOString().slice(0,10); setCustomStart(d); setCustomEnd(d); }} />
            <QuickPreset label="Yesterday"   onClick={() => { const d = new Date(Date.now() - 86400000).toISOString().slice(0,10); setCustomStart(d); setCustomEnd(d); }} />
            <QuickPreset label="This Month"  onClick={() => { const now = new Date(); setCustomStart(new Date(now.getFullYear(), now.getMonth(), 1).toISOString().slice(0,10)); setCustomEnd(now.toISOString().slice(0,10)); }} />
            <QuickPreset label="Last Month"  onClick={() => { const now = new Date(); setCustomStart(new Date(now.getFullYear(), now.getMonth() - 1, 1).toISOString().slice(0,10)); setCustomEnd(new Date(now.getFullYear(), now.getMonth(), 0).toISOString().slice(0,10)); }} />
          </div>
        </div>
      </section>

      <div className="print:hidden">
        <TabSwitcher tabs={TABS} active={tab} onChange={setTab} color="sky" />
      </div>

      {/* ═══════════════════════════════════════════════════════
          OVERVIEW
          ═══════════════════════════════════════════════════════ */}
      {tab === 'overview' && (
        <>
          <section className="grid grid-cols-2 lg:grid-cols-4 gap-3">
            <KpiCard label="Total Revenue" value={formatPKR(totalRevenue)} icon={TrendingUp} color="sky" isHighlight />
            <KpiCard label="Total Profit" value={showCost(totalProfit)} icon={Target} color="emerald" />
            <KpiCard label="Total Orders" value={String(totalOrders)} icon={ShoppingCart} color="violet" />
            <KpiCard label="Avg Order Value" value={formatPKR(aov)} icon={DollarSign} color="amber" />
          </section>

          <section className="grid grid-cols-2 lg:grid-cols-4 gap-3">
            <KpiCard label="Paid (Cash)" value={formatPKR(totalPaid)} icon={DollarSign} color="emerald" />
            <KpiCard label="Udhaar" value={formatPKR(totalCredit)} icon={Clock} color="amber" />
            <KpiCard label="Profit Margin" value={hideCost ? '•••' : `${profitMargin.toFixed(1)}%`} icon={Percent} color="blue" />
            <KpiCard label="Daily Avg Sales" value={formatPKR(totalRevenue / Math.max(effectiveDays, 1))} icon={Activity} color="pink" />
          </section>

          {reports.profitLoss && (
            <section className="rounded-2xl sm:rounded-3xl bg-white dark:bg-slate-900/80 dark:backdrop-blur-sm border-2 border-slate-200 dark:border-slate-800 shadow-sm p-5 sm:p-6">
              <div className="flex items-center justify-between mb-4 flex-wrap gap-2">
                <div className="flex items-center gap-2.5">
                  <div className="h-10 w-10 rounded-2xl bg-gradient-to-br from-amber-500 to-orange-600 text-white flex items-center justify-center shadow-lg shadow-amber-500/40">
                    <Trophy className="h-5 w-5" />
                  </div>
                  <div>
                    <h3 className="text-lg sm:text-xl font-extrabold text-slate-900 dark:text-white">Profit & Loss Statement</h3>
                    <p className="text-xs sm:text-sm text-slate-500 dark:text-slate-400 font-bold">{effectiveDays} din ka detailed breakdown</p>
                  </div>
                </div>
                <div className={[
                  'px-3 py-1.5 rounded-xl text-sm font-extrabold border-2',
                  reports.profitLoss.netProfit >= 0
                    ? 'bg-emerald-100 dark:bg-emerald-500/15 text-emerald-700 dark:text-emerald-300 border-emerald-300 dark:border-emerald-500/40'
                    : 'bg-rose-100 dark:bg-rose-500/15 text-rose-700 dark:text-rose-300 border-rose-300 dark:border-rose-500/40',
                ].join(' ')}>
                  Net Margin: {hideCost ? '•••' : `${reports.profitLoss.netMargin.toFixed(1)}%`}
                </div>
              </div>
              <div className="grid lg:grid-cols-2 gap-6">
                <div className="space-y-2">
                  <PnLLine label="Revenue" value={reports.profitLoss.revenue} type="positive" />
                  {reports.profitLoss.discount > 0 && <PnLLine label="Discounts" value={-reports.profitLoss.discount} type="negative" />}
                  {reports.profitLoss.returns > 0 && <PnLLine label="Returns" value={-reports.profitLoss.returns} type="negative" />}
                  <PnLLine label="Net Revenue" value={reports.profitLoss.netRevenue} type="bold" />
                  {!hideCost && <PnLLine label="Cost of Goods (COGS)" value={-reports.profitLoss.cogs} type="negative" />}
                  {!hideCost && <PnLLine label="Gross Profit" value={reports.profitLoss.grossProfit} type="bold" sub={`${reports.profitLoss.grossMargin.toFixed(1)}% margin`} />}
                  {!hideCost && <PnLLine label="Operating Expenses" value={-reports.profitLoss.expenses} type="negative" />}
                  {!hideCost && <PnLLine label="Net Profit" value={reports.profitLoss.netProfit} type="highlight" sub={`${reports.profitLoss.netMargin.toFixed(1)}% margin`} />}
                </div>
                <div className="grid grid-cols-2 gap-2 sm:gap-3">
                  <MiniStat label="Orders" value={reports.profitLoss.orderCount} color="blue" icon={ShoppingCart} />
                  <MiniStat label="Returns" value={reports.profitLoss.returnCount} color="rose" icon={Activity} />
                  <MiniStat label="Cash Paid" value={formatPKR(reports.profitLoss.paid)} color="emerald" icon={DollarSign} />
                  <MiniStat label="Udhaar" value={formatPKR(reports.profitLoss.credit)} color="amber" icon={Package} />
                  {!hideCost && <MiniStat label="Purchases" value={formatPKR(reports.profitLoss.purchases)} color="violet" icon={Package} />}
                  <MiniStat label="Discount" value={formatPKR(reports.profitLoss.discount)} color="pink" icon={Star} />
                </div>
              </div>
            </section>
          )}

          <ChartCard title="Sales & Profit Trend" subtitle={`${effectiveDays}-day dual analysis`} icon={TrendingUp} color="sky">
            <ResponsiveContainer width="100%" height="100%">
              <ComposedChart data={trendData}>
                <defs>
                  <linearGradient id="rtsalesGrad" x1="0" y1="0" x2="0" y2="1">
                    <stop offset="0%" stopColor="#0ea5e9" stopOpacity={0.5} />
                    <stop offset="100%" stopColor="#0ea5e9" stopOpacity={0} />
                  </linearGradient>
                </defs>
                <CartesianGrid strokeDasharray="3 3" className="stroke-slate-200 dark:stroke-slate-700" opacity={0.5} />
                <XAxis dataKey="label" className="fill-slate-500 dark:fill-slate-400" fontSize={10} tickLine={false} axisLine={false} />
                <YAxis yAxisId="left" className="fill-slate-500 dark:fill-slate-400" fontSize={10} tickFormatter={(v) => `${(v / 1000).toFixed(0)}k`} tickLine={false} axisLine={false} />
                <YAxis yAxisId="right" orientation="right" className="fill-slate-500 dark:fill-slate-400" fontSize={10} tickLine={false} axisLine={false} />
                <Tooltip
                  formatter={(value: any, name: any) => name === 'Orders' ? value : formatPKR(Number(value))}
                  contentStyle={TOOLTIP_STYLE}
                  labelStyle={TOOLTIP_LABEL}
                />
                <Legend wrapperStyle={{ fontSize: 11 }} />
                <Area yAxisId="left" type="monotone" dataKey="sales" name="Sales" fill="url(#rtsalesGrad)" stroke="#0ea5e9" strokeWidth={2.5} />
                {!hideCost && <Bar yAxisId="left" dataKey="profit" name="Profit" fill="#10b981" radius={[4, 4, 0, 0]} barSize={18} />}
                <Line yAxisId="right" type="monotone" dataKey="orders" name="Orders" stroke="#f59e0b" strokeWidth={2.5} dot={{ r: 3 }} />
              </ComposedChart>
            </ResponsiveContainer>
          </ChartCard>

          {/* Best/Worst days */}
          <section className="grid sm:grid-cols-2 gap-3">
            <div className="rounded-2xl sm:rounded-3xl bg-gradient-to-br from-emerald-50 to-green-50 dark:from-emerald-500/10 dark:to-teal-500/10 border-2 border-emerald-300 dark:border-emerald-500/40 p-4 sm:p-5 shadow-sm">
              <div className="flex items-center gap-2 text-emerald-700 dark:text-emerald-300">
                <div className="h-9 w-9 rounded-xl bg-gradient-to-br from-emerald-500 to-teal-600 text-white flex items-center justify-center shadow-md">
                  <Trophy className="h-5 w-5" />
                </div>
                <span className="text-xs uppercase font-extrabold tracking-wider">Best Day 🏆</span>
              </div>
              <div className="mt-2 text-2xl sm:text-3xl font-extrabold text-emerald-900 dark:text-emerald-100">{bestDay.label}</div>
              <div className="mt-1 text-xl font-extrabold text-emerald-700 dark:text-emerald-400 tabular-nums">{formatPKR(bestDay.sales)}</div>
            </div>
            <div className="rounded-2xl sm:rounded-3xl bg-gradient-to-br from-rose-50 to-red-50 dark:from-rose-500/10 dark:to-red-500/10 border-2 border-rose-300 dark:border-rose-500/40 p-4 sm:p-5 shadow-sm">
              <div className="flex items-center gap-2 text-rose-700 dark:text-rose-300">
                <div className="h-9 w-9 rounded-xl bg-gradient-to-br from-rose-500 to-red-600 text-white flex items-center justify-center shadow-md">
                  <TrendingDown className="h-5 w-5" />
                </div>
                <span className="text-xs uppercase font-extrabold tracking-wider">Slowest Day 🐢</span>
              </div>
              <div className="mt-2 text-2xl sm:text-3xl font-extrabold text-rose-900 dark:text-rose-100">{worstDay.label}</div>
              <div className="mt-1 text-xl font-extrabold text-rose-700 dark:text-rose-400 tabular-nums">{formatPKR(worstDay.sales)}</div>
            </div>
          </section>
        </>
      )}

      {/* ═══════════════════════════════════════════════════════
          SALES
          ═══════════════════════════════════════════════════════ */}
      {tab === 'sales' && (
        <>
          <ChartCard title="Sales vs Expenses" subtitle="Net profit visualization" icon={TrendingUp} color="sky">
            <ResponsiveContainer width="100%" height="100%">
              <ComposedChart data={sveData}>
                <defs>
                  <linearGradient id="sveSales" x1="0" y1="0" x2="0" y2="1">
                    <stop offset="0%" stopColor="#0ea5e9" stopOpacity={0.5} />
                    <stop offset="100%" stopColor="#0ea5e9" stopOpacity={0} />
                  </linearGradient>
                </defs>
                <CartesianGrid strokeDasharray="3 3" className="stroke-slate-200 dark:stroke-slate-700" opacity={0.5} />
                <XAxis dataKey="label" className="fill-slate-500 dark:fill-slate-400" fontSize={10} tickLine={false} axisLine={false} />
                <YAxis className="fill-slate-500 dark:fill-slate-400" fontSize={10} tickFormatter={(v) => `${(v / 1000).toFixed(0)}k`} tickLine={false} axisLine={false} />
                <Tooltip formatter={(v: any) => formatPKR(Number(v))} contentStyle={TOOLTIP_STYLE} labelStyle={TOOLTIP_LABEL} />
                <Legend wrapperStyle={{ fontSize: 11 }} />
                <Area type="monotone" dataKey="sales" name="Sales" fill="url(#sveSales)" stroke="#0ea5e9" strokeWidth={2.5} />
                {!hideCost && <Bar dataKey="expenses" name="Expenses" fill="#ef4444" radius={[4, 4, 0, 0]} barSize={15} />}
                {!hideCost && <Line type="monotone" dataKey="profit" name="Net Profit" stroke="#10b981" strokeWidth={3} dot={{ r: 4 }} />}
              </ComposedChart>
            </ResponsiveContainer>
          </ChartCard>

          <ChartCard title="Cash vs Udhaar Split" subtitle="Cash flow analysis" icon={DollarSign} color="sky">
            <ResponsiveContainer width="100%" height="100%">
              <AreaChart data={trendData}>
                <defs>
                  <linearGradient id="paidGradRt" x1="0" y1="0" x2="0" y2="1">
                    <stop offset="0%" stopColor="#10b981" stopOpacity={0.6} />
                    <stop offset="100%" stopColor="#10b981" stopOpacity={0.1} />
                  </linearGradient>
                  <linearGradient id="creditGradRt" x1="0" y1="0" x2="0" y2="1">
                    <stop offset="0%" stopColor="#f59e0b" stopOpacity={0.6} />
                    <stop offset="100%" stopColor="#f59e0b" stopOpacity={0.1} />
                  </linearGradient>
                </defs>
                <CartesianGrid strokeDasharray="3 3" className="stroke-slate-200 dark:stroke-slate-700" opacity={0.5} />
                <XAxis dataKey="label" className="fill-slate-500 dark:fill-slate-400" fontSize={10} tickLine={false} axisLine={false} />
                <YAxis className="fill-slate-500 dark:fill-slate-400" fontSize={10} tickFormatter={(v) => `${(v / 1000).toFixed(0)}k`} tickLine={false} axisLine={false} />
                <Tooltip formatter={(v: any) => formatPKR(Number(v))} contentStyle={TOOLTIP_STYLE} labelStyle={TOOLTIP_LABEL} />
                <Legend wrapperStyle={{ fontSize: 11 }} />
                <Area type="monotone" dataKey="paid" name="Cash Paid" stackId="1" stroke="#10b981" fill="url(#paidGradRt)" strokeWidth={2} />
                <Area type="monotone" dataKey="credit" name="Udhaar" stackId="1" stroke="#f59e0b" fill="url(#creditGradRt)" strokeWidth={2} />
              </AreaChart>
            </ResponsiveContainer>
          </ChartCard>

          <ChartCard title="Orders Trend" subtitle="Number of sales per day (best day highlighted)" icon={ShoppingCart} color="sky">
            <ResponsiveContainer width="100%" height="100%">
              <BarChart data={trendData}>
                <CartesianGrid strokeDasharray="3 3" className="stroke-slate-200 dark:stroke-slate-700" opacity={0.5} />
                <XAxis dataKey="label" className="fill-slate-500 dark:fill-slate-400" fontSize={10} tickLine={false} axisLine={false} />
                <YAxis className="fill-slate-500 dark:fill-slate-400" fontSize={10} tickLine={false} axisLine={false} />
                <Tooltip contentStyle={TOOLTIP_STYLE} labelStyle={TOOLTIP_LABEL} />
                <Bar dataKey="orders" name="Orders" radius={[6, 6, 0, 0]}>
                  {trendData.map((entry: any, idx: number) => {
                    const max = Math.max(...trendData.map((t: any) => t.orders));
                    return <Cell key={idx} fill={entry.orders === max ? '#10b981' : '#8b5cf6'} />;
                  })}
                </Bar>
              </BarChart>
            </ResponsiveContainer>
          </ChartCard>
        </>
      )}

      {/* ═══════════════════════════════════════════════════════
          PRODUCTS
          ═══════════════════════════════════════════════════════ */}
      {tab === 'products' && (
        <>
          <section className="grid lg:grid-cols-2 gap-4">
            <ChartCard title="Top 10 Products by Revenue" subtitle="Best sellers" icon={Award} color="sky">
              {reports.topProducts.length === 0 ? (
                <EmptyChart message="No product sales" />
              ) : (
                <ResponsiveContainer width="100%" height="100%">
                  <BarChart
                    data={reports.topProducts.slice(0, 10).map((p: any) => ({
                      name: (p.product?.name || '').slice(0, 15),
                      revenue: p.revenue,
                      profit: p.profit,
                    }))}
                    layout="vertical"
                  >
                    <CartesianGrid strokeDasharray="3 3" className="stroke-slate-200 dark:stroke-slate-700" opacity={0.5} />
                    <XAxis type="number" className="fill-slate-500 dark:fill-slate-400" fontSize={10} tickFormatter={(v) => `${(v / 1000).toFixed(0)}k`} tickLine={false} axisLine={false} />
                    <YAxis type="category" dataKey="name" className="fill-slate-500 dark:fill-slate-400" fontSize={10} width={100} tickLine={false} axisLine={false} />
                    <Tooltip formatter={(v: any) => formatPKR(Number(v))} contentStyle={TOOLTIP_STYLE} labelStyle={TOOLTIP_LABEL} />
                    <Legend wrapperStyle={{ fontSize: 11 }} />
                    <Bar dataKey="revenue" name="Revenue" fill="#0ea5e9" radius={[0, 6, 6, 0]} />
                    {!hideCost && <Bar dataKey="profit" name="Profit" fill="#10b981" radius={[0, 6, 6, 0]} />}
                  </BarChart>
                </ResponsiveContainer>
              )}
            </ChartCard>

            <ChartCard title="Category Distribution" subtitle="Revenue split" icon={Package} color="sky">
              {reports.categoryBreakdown.length > 0 ? (
                <ResponsiveContainer width="100%" height="100%">
                  <PieChart>
                    <Pie
                      data={reports.categoryBreakdown}
                      dataKey="revenue" nameKey="name"
                      cx="50%" cy="50%"
                      outerRadius={100} innerRadius={50}
                      paddingAngle={2}
                      label={(entry: any) => {
                        const total = reports.categoryBreakdown.reduce((s: number, c: any) => s + c.revenue, 0);
                        const pct = total > 0 ? ((entry.revenue / total) * 100).toFixed(0) : '0';
                        return `${pct}%`;
                      }}
                      labelLine={false}
                    >
                      {reports.categoryBreakdown.map((c: any, idx: number) => (
                        <Cell key={c.id} fill={c.color || PIE_COLORS[idx % PIE_COLORS.length]} stroke="none" />
                      ))}
                    </Pie>
                    <Tooltip formatter={(v: any) => formatPKR(Number(v))} contentStyle={TOOLTIP_STYLE} labelStyle={TOOLTIP_LABEL} />
                    <Legend wrapperStyle={{ fontSize: 10, paddingTop: 12 }} iconType="circle" />
                  </PieChart>
                </ResponsiveContainer>
              ) : <EmptyChart message="No category data" />}
            </ChartCard>
          </section>

          <section className="rounded-2xl sm:rounded-3xl bg-white dark:bg-slate-900/80 dark:backdrop-blur-sm border-2 border-slate-200 dark:border-slate-800 shadow-sm overflow-hidden">
            <div className="px-4 sm:px-6 py-4 border-b-2 border-slate-100 dark:border-slate-800 bg-gradient-to-r from-sky-50 to-cyan-50 dark:from-sky-500/10 dark:to-cyan-500/10 flex items-center gap-3">
              <div className="h-10 w-10 rounded-2xl bg-gradient-to-br from-sky-500 to-cyan-600 text-white flex items-center justify-center shadow-lg shadow-sky-500/40">
                <Award className="h-5 w-5" />
              </div>
              <div>
                <h3 className="text-base sm:text-lg font-extrabold text-slate-900 dark:text-white">Top Products — Detailed</h3>
                <p className="text-xs text-slate-500 dark:text-slate-400 font-bold">Complete performance breakdown</p>
              </div>
            </div>
            {reports.topProducts.length === 0 ? (
              <div className="p-12 text-center">
                <Package className="h-12 w-12 text-slate-300 dark:text-slate-600 mx-auto mb-2" />
                <p className="font-extrabold text-slate-700 dark:text-slate-300">No product sales yet</p>
              </div>
            ) : (
              <div className="overflow-x-auto">
                <table className="w-full text-sm print:text-[10px]">
                  <thead className="bg-slate-50 dark:bg-slate-800/60 text-slate-700 dark:text-slate-300 border-b-2 border-slate-200 dark:border-slate-700">
                    <tr>
                      <th className="text-center px-3 py-3 font-extrabold text-[10px] uppercase w-12">#</th>
                      <th className="text-left px-3 py-3 font-extrabold text-[10px] uppercase">Product</th>
                      <th className="text-right px-3 py-3 font-extrabold text-[10px] uppercase">Qty</th>
                      <th className="text-right px-3 py-3 font-extrabold text-[10px] uppercase">Orders</th>
                      <th className="text-right px-3 py-3 font-extrabold text-[10px] uppercase">Revenue</th>
                      {!hideCost && <th className="text-right px-3 py-3 font-extrabold text-[10px] uppercase">Profit</th>}
                      {!hideCost && <th className="text-center px-3 py-3 font-extrabold text-[10px] uppercase">Margin</th>}
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-slate-100 dark:divide-slate-800">
                    {reports.topProducts.map((p: any, idx: number) => (
                      <tr key={p.productId} className="hover:bg-sky-50/40 dark:hover:bg-sky-500/5 transition">
                        <td className="px-3 py-2.5 text-center">
                          <span className={[
                            'inline-flex h-7 w-7 rounded-lg items-center justify-center font-extrabold text-xs',
                            idx === 0 ? 'bg-amber-100 dark:bg-amber-500/20 text-amber-700 dark:text-amber-300' :
                            idx === 1 ? 'bg-slate-200 dark:bg-slate-700 text-slate-700 dark:text-slate-200' :
                            idx === 2 ? 'bg-orange-100 dark:bg-orange-500/20 text-orange-700 dark:text-orange-300' :
                            'bg-slate-100 dark:bg-slate-800 text-slate-500 dark:text-slate-400',
                          ].join(' ')}>
                            {idx < 3 ? <Crown className="h-3.5 w-3.5" /> : idx + 1}
                          </span>
                        </td>
                        <td className="px-3 py-2.5">
                          <div className="flex items-center gap-2.5">
                            <div className="h-9 w-9 rounded-lg bg-sky-100 dark:bg-sky-500/15 overflow-hidden flex items-center justify-center shrink-0 print:hidden">
                              {p.product?.images?.[0]?.url ? (
                                <img src={p.product.images[0].url} alt="" loading="lazy" className="h-full w-full object-cover" />
                              ) : (
                                <Package className="h-4 w-4 text-sky-400" />
                              )}
                            </div>
                            <div className="font-extrabold text-slate-900 dark:text-white truncate max-w-[220px]">{p.product?.name}</div>
                          </div>
                        </td>
                        <td className="px-3 py-2.5 text-right font-extrabold tabular-nums text-slate-700 dark:text-slate-200">
                          {p.quantitySold} {p.product?.unit}
                        </td>
                        <td className="px-3 py-2.5 text-right font-bold tabular-nums text-slate-600 dark:text-slate-400">{p.orderCount}</td>
                        <td className="px-3 py-2.5 text-right font-extrabold text-emerald-700 dark:text-emerald-400 tabular-nums">{formatPKR(p.revenue)}</td>
                        {!hideCost && <td className="px-3 py-2.5 text-right font-extrabold text-violet-700 dark:text-violet-400 tabular-nums">{formatPKR(p.profit)}</td>}
                        {!hideCost && (
                          <td className="px-3 py-2.5 text-center">
                            <span className={[
                              'inline-flex px-2 py-0.5 rounded-full text-[10px] font-extrabold',
                              p.margin > 30 ? 'bg-emerald-100 dark:bg-emerald-500/20 text-emerald-700 dark:text-emerald-300' :
                              p.margin > 10 ? 'bg-amber-100 dark:bg-amber-500/20 text-amber-700 dark:text-amber-300' :
                              'bg-rose-100 dark:bg-rose-500/20 text-rose-700 dark:text-rose-300',
                            ].join(' ')}>
                              {p.margin.toFixed(1)}%
                            </span>
                          </td>
                        )}
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            )}
          </section>
        </>
      )}

      {/* ═══════════════════════════════════════════════════════
          CUSTOMERS
          ═══════════════════════════════════════════════════════ */}
      {tab === 'customers' && (
        <section className="rounded-2xl sm:rounded-3xl bg-white dark:bg-slate-900/80 dark:backdrop-blur-sm border-2 border-slate-200 dark:border-slate-800 shadow-sm overflow-hidden">
          <div className="px-4 sm:px-6 py-4 border-b-2 border-slate-100 dark:border-slate-800 bg-gradient-to-r from-violet-50 to-purple-50 dark:from-violet-500/10 dark:to-purple-500/10 flex items-center gap-3">
            <div className="h-10 w-10 rounded-2xl bg-gradient-to-br from-violet-500 to-purple-600 text-white flex items-center justify-center shadow-lg shadow-violet-500/40">
              <Trophy className="h-5 w-5" />
            </div>
            <div>
              <h3 className="text-base sm:text-lg font-extrabold text-slate-900 dark:text-white">Top Customers 🏆</h3>
              <p className="text-xs text-slate-500 dark:text-slate-400 font-bold">Most valuable buyers</p>
            </div>
          </div>
          {reports.topCustomers.length === 0 ? (
            <div className="p-12 text-center">
              <Users className="h-12 w-12 text-slate-300 dark:text-slate-600 mx-auto mb-2" />
              <p className="font-extrabold text-slate-700 dark:text-slate-300">No customer data</p>
              <p className="text-xs text-slate-500 dark:text-slate-400 font-semibold mt-1">Sales karo, customers automatically dikhein ge</p>
            </div>
          ) : (
            <div className="divide-y-2 divide-slate-100 dark:divide-slate-800">
              {reports.topCustomers.map((tc: any, idx: number) => {
                const rankGrads = [
                  'from-amber-400 via-yellow-500 to-amber-600',
                  'from-slate-300 via-slate-400 to-slate-500',
                  'from-orange-400 via-orange-500 to-orange-700',
                ];
                return (
                  <div key={tc.customerId} className="px-4 sm:px-6 py-3 flex items-center justify-between gap-3 hover:bg-violet-50/40 dark:hover:bg-violet-500/5 transition">
                    <div className="flex items-center gap-3 min-w-0 flex-1">
                      <div className={`h-11 w-11 rounded-2xl ${idx < 3 ? `bg-gradient-to-br ${rankGrads[idx]}` : 'bg-violet-500'} text-white font-extrabold flex items-center justify-center shadow-md shrink-0 text-sm`}>
                        {idx < 3 ? <Crown className="h-5 w-5" /> : `#${idx + 1}`}
                      </div>
                      <div className="h-10 w-10 rounded-xl bg-slate-100 dark:bg-slate-800 flex items-center justify-center font-extrabold text-slate-600 dark:text-slate-300 shrink-0">
                        {tc.customer?.name?.charAt(0) || '?'}
                      </div>
                      <div className="min-w-0 flex-1">
                        <div className="font-extrabold text-slate-900 dark:text-white truncate">{tc.customer?.name || 'Unknown'}</div>
                        <div className="text-xs text-slate-500 dark:text-slate-400 font-bold truncate">
                          {tc.customer?.phone || 'No phone'} • {tc.orderCount} orders
                        </div>
                      </div>
                    </div>
                    <div className="text-right shrink-0">
                      <div className="font-extrabold text-violet-700 dark:text-violet-400 text-lg tabular-nums">{formatPKR(tc.totalSpent)}</div>
                      <div className="text-[10px] text-slate-500 dark:text-slate-400 font-bold">AOV {formatPKR(tc.avgOrderValue)}</div>
                    </div>
                  </div>
                );
              })}
            </div>
          )}
        </section>
      )}

      {/* ═══════════════════════════════════════════════════════
          INVENTORY
          ═══════════════════════════════════════════════════════ */}
      {tab === 'inventory' && reports.inventoryValue && (
        <>
          <section className="grid grid-cols-2 sm:grid-cols-4 gap-3">
            <KpiCard label="Total Products" value={reports.inventoryValue.totals.totalProducts} icon={Package} color="sky" />
            <KpiCard label="Total Units" value={reports.inventoryValue.totals.totalUnits} icon={Boxes} color="violet" />
            <KpiCard label="Cost Value" value={showCost(reports.inventoryValue.totals.totalCostValue)} icon={DollarSign} color="emerald" />
            <KpiCard label="Potential Profit" value={showCost(reports.inventoryValue.totals.potentialProfit)} icon={Target} color="amber" isHighlight />
          </section>

          <ChartCard title="Inventory Value by Category" subtitle="Cost vs Sell value" icon={BarChart3} color="sky">
            <ResponsiveContainer width="100%" height="100%">
              <BarChart data={reports.inventoryValue.byCategory}>
                <CartesianGrid strokeDasharray="3 3" className="stroke-slate-200 dark:stroke-slate-700" opacity={0.5} />
                <XAxis dataKey="name" className="fill-slate-500 dark:fill-slate-400" fontSize={11} tickLine={false} axisLine={false} />
                <YAxis className="fill-slate-500 dark:fill-slate-400" fontSize={11} tickFormatter={(v) => `${(v / 1000).toFixed(0)}k`} tickLine={false} axisLine={false} />
                <Tooltip formatter={(v: any) => formatPKR(Number(v))} contentStyle={TOOLTIP_STYLE} labelStyle={TOOLTIP_LABEL} />
                <Legend wrapperStyle={{ fontSize: 11 }} />
                {!hideCost && <Bar dataKey="costValue" name="Cost Value" fill="#0ea5e9" radius={[6, 6, 0, 0]} />}
                <Bar dataKey="sellValue" name="Sell Value" fill="#10b981" radius={[6, 6, 0, 0]} />
              </BarChart>
            </ResponsiveContainer>
          </ChartCard>
        </>
      )}

      {/* ═══════════════════════════════════════════════════════
          PATTERNS — FULLY REDESIGNED (Gen-Z best)
          ═══════════════════════════════════════════════════════ */}
      {tab === 'patterns' && (
        <>
          {/* Weekday cards grid */}
          {reports.weekdayPattern.length > 0 && (
            <section>
              <div className="flex items-center gap-2.5 mb-3">
                <div className="h-10 w-10 rounded-2xl bg-gradient-to-br from-sky-500 to-cyan-600 text-white flex items-center justify-center shadow-lg shadow-sky-500/40">
                  <CalendarDays className="h-5 w-5" />
                </div>
                <div>
                  <h3 className="text-base sm:text-lg font-extrabold text-slate-900 dark:text-white">Weekday Performance 📅</h3>
                  <p className="text-xs text-slate-500 dark:text-slate-400 font-bold">Kis din kitni sale hoti hai</p>
                </div>
              </div>
              <div className="grid grid-cols-2 sm:grid-cols-4 lg:grid-cols-7 gap-2 sm:gap-3">
                                {reports.weekdayPattern.map((w: any) => {
                  const maxSales = Math.max(...reports.weekdayPattern.map((x: any) => x.sales));
                  const isBest = w.sales === maxSales && w.sales > 0;
                  const meta = WEEKDAY_META[w.day] || { emoji: '📅', color: '#64748b' };
                  const pct = maxSales > 0 ? (w.sales / maxSales) * 100 : 0;
                  return (
                    <div
                      key={w.day}
                      className={[
                        'relative rounded-2xl border-2 p-3 sm:p-4 transition-all hover:-translate-y-1 hover:shadow-lg',
                        isBest
                          ? 'bg-gradient-to-br from-emerald-50 to-teal-50 dark:from-emerald-500/15 dark:to-teal-500/10 border-emerald-400 dark:border-emerald-500/50 shadow-lg shadow-emerald-500/20'
                          : 'bg-white dark:bg-slate-900/70 border-slate-200 dark:border-slate-800',
                      ].join(' ')}
                    >
                      {isBest && (
                        <div className="absolute -top-2 -right-2 h-6 w-6 rounded-full bg-gradient-to-br from-amber-400 to-orange-500 text-white flex items-center justify-center shadow-md">
                          <Crown className="h-3 w-3" />
                        </div>
                      )}
                      <div className="flex items-center justify-between mb-2">
                        <div className="text-2xl">{meta.emoji}</div>
                        <div className="text-[10px] uppercase font-extrabold tracking-widest text-slate-500 dark:text-slate-400">{w.day}</div>
                      </div>
                      <div className="text-base sm:text-lg font-extrabold text-slate-900 dark:text-white tabular-nums leading-tight truncate">
                        {formatPKR(w.sales)}
                      </div>
                      <div className="text-[10px] text-slate-500 dark:text-slate-400 font-bold mt-0.5">
                        Avg {formatPKR(w.avg)}
                      </div>
                      {/* progress bar */}
                      <div className="mt-2 h-1.5 bg-slate-100 dark:bg-slate-800 rounded-full overflow-hidden">
                        <div
                          className="h-full rounded-full transition-all"
                          style={{
                            width: `${Math.max(pct, 3)}%`,
                            backgroundColor: isBest ? '#10b981' : meta.color,
                          }}
                        />
                      </div>
                    </div>
                  );
                })}
              </div>
            </section>
          )}

          {/* Radar + bar comparison */}
          {reports.weekdayPattern.length > 0 && (
            <section className="grid lg:grid-cols-2 gap-4">
              <ChartCard title="Weekday Radar" subtitle="Sales distribution shape" icon={Activity} color="sky">
                <ResponsiveContainer width="100%" height="100%">
                  <RadarChart data={reports.weekdayPattern}>
                    <PolarGrid className="stroke-slate-200 dark:stroke-slate-700" />
                    <PolarAngleAxis dataKey="day" className="fill-slate-600 dark:fill-slate-300" fontSize={12} />
                    <PolarRadiusAxis className="fill-slate-500 dark:fill-slate-400" fontSize={10} tickFormatter={(v) => `${(v / 1000).toFixed(0)}k`} />
                    <Radar name="Sales" dataKey="sales" stroke="#0ea5e9" fill="#0ea5e9" fillOpacity={0.35} strokeWidth={2.5} />
                    <Tooltip formatter={(v: any) => formatPKR(Number(v))} contentStyle={TOOLTIP_STYLE} labelStyle={TOOLTIP_LABEL} />
                  </RadarChart>
                </ResponsiveContainer>
              </ChartCard>

              <ChartCard title="Average per Weekday" subtitle="Best day highlighted in green" icon={BarChart3} color="sky">
                <ResponsiveContainer width="100%" height="100%">
                  <BarChart data={reports.weekdayPattern}>
                    <CartesianGrid strokeDasharray="3 3" className="stroke-slate-200 dark:stroke-slate-700" opacity={0.5} />
                    <XAxis dataKey="day" className="fill-slate-500 dark:fill-slate-400" fontSize={11} tickLine={false} axisLine={false} />
                    <YAxis className="fill-slate-500 dark:fill-slate-400" fontSize={11} tickFormatter={(v) => `${(v / 1000).toFixed(0)}k`} tickLine={false} axisLine={false} />
                    <Tooltip formatter={(v: any) => formatPKR(Number(v))} contentStyle={TOOLTIP_STYLE} labelStyle={TOOLTIP_LABEL} cursor={{ fill: 'rgba(14,165,233,0.1)' }} />
                    <Bar dataKey="avg" name="Avg Sales" radius={[6, 6, 0, 0]}>
                      {reports.weekdayPattern.map((entry: any, idx: number) => {
                        const max = Math.max(...reports.weekdayPattern.map((w: any) => w.avg));
                        return <Cell key={idx} fill={entry.avg === max ? '#10b981' : (WEEKDAY_META[entry.day]?.color || '#8b5cf6')} />;
                      })}
                    </Bar>
                  </BarChart>
                </ResponsiveContainer>
              </ChartCard>
            </section>
          )}

          {/* Expense breakdown */}
          {reports.expenseBreakdown && reports.expenseBreakdown.byCategory.length > 0 && !hideCost && (
            <ChartCard
              title="Expense Breakdown"
              subtitle={`Total: ${formatPKR(reports.expenseBreakdown.total)}`}
              icon={DollarSign}
              color="sky"
            >
              <ResponsiveContainer width="100%" height="100%">
                <PieChart>
                  <Pie
                    data={reports.expenseBreakdown.byCategory}
                    dataKey="amount" nameKey="name"
                    cx="50%" cy="50%"
                    outerRadius={110} innerRadius={55}
                    paddingAngle={2}
                    label={(entry: any) => `${entry.name} (${entry.percent.toFixed(0)}%)`}
                  >
                    {reports.expenseBreakdown.byCategory.map((c: any, idx: number) => (
                      <Cell key={c.id} fill={c.color || PIE_COLORS[idx % PIE_COLORS.length]} stroke="none" />
                    ))}
                  </Pie>
                  <Tooltip formatter={(v: any) => formatPKR(Number(v))} contentStyle={TOOLTIP_STYLE} labelStyle={TOOLTIP_LABEL} />
                  <Legend wrapperStyle={{ fontSize: 11 }} iconType="circle" />
                </PieChart>
              </ResponsiveContainer>
            </ChartCard>
          )}
        </>
      )}

      {/* ═══════════════════════════════════════════════════════
          INSIGHTS
          ═══════════════════════════════════════════════════════ */}
      {tab === 'insights' && (
        <>
          <section className="relative overflow-hidden rounded-2xl sm:rounded-3xl bg-gradient-to-br from-slate-950 via-sky-900 to-cyan-700 dark:from-slate-950 dark:via-indigo-950 dark:to-cyan-900 text-white p-5 sm:p-6 shadow-2xl">
            <div className="absolute -top-24 -right-24 h-72 w-72 rounded-full bg-sky-400/25 blur-3xl pointer-events-none animate-pulse" />
            <div className="absolute -bottom-24 -left-24 h-72 w-72 rounded-full bg-amber-400/20 blur-3xl pointer-events-none" />

            <div className="relative flex items-center gap-2.5 mb-4">
              <div className="h-11 w-11 rounded-2xl bg-white/15 backdrop-blur-md border border-white/25 flex items-center justify-center shadow-lg">
                <Sparkles className="h-5 w-5 text-amber-300" />
              </div>
              <div>
                <h3 className="text-lg sm:text-xl font-extrabold">Smart Insights ✨</h3>
                <p className="text-xs sm:text-sm text-white/80 font-bold">Aap ki dukaan ka AI analysis</p>
              </div>
            </div>

            <div className="relative grid sm:grid-cols-2 lg:grid-cols-3 gap-3">
              <InsightCard
                icon={TrendingUp}
                label={totalRevenue > 0 ? 'Zabardast performance!' : 'Sales barhao'}
                value={formatPKR(totalRevenue)}
                sub={`${totalOrders} orders in ${effectiveDays} days`}
                tone="emerald"
              />
              {!hideCost && (
                <InsightCard
                  icon={Target}
                  label={profitMargin > 20 ? 'Bohat acha margin' : profitMargin > 10 ? 'Theek margin' : 'Margin kam hai'}
                  value={`${profitMargin.toFixed(1)}%`}
                  sub={`Profit: ${formatPKR(totalProfit)}`}
                  tone={profitMargin > 20 ? 'emerald' : profitMargin > 10 ? 'amber' : 'rose'}
                />
              )}
              <InsightCard
                icon={Users}
                label={reports.topCustomers.length > 0 ? 'Top customer' : 'Customer database chhoti hai'}
                value={reports.topCustomers[0]?.customer?.name || '—'}
                sub={reports.topCustomers[0] ? `${formatPKR(reports.topCustomers[0].totalSpent)} spent` : 'Naye customers add karo'}
                tone="violet"
              />
              <InsightCard
                icon={Package}
                label={reports.topProducts.length > 0 ? 'Best seller' : 'Sales record'}
                value={reports.topProducts[0]?.product?.name || '—'}
                sub={reports.topProducts[0] ? `${reports.topProducts[0].quantitySold} sold` : 'Products import karo'}
                tone="sky"
              />
              <InsightCard
                icon={Calendar}
                label="Best day"
                value={bestDay.label}
                sub={formatPKR(bestDay.sales)}
                tone="amber"
              />
              <InsightCard
                icon={Clock}
                label={totalCredit > 0 ? 'Udhaar collect karo' : 'Sab paid'}
                value={formatPKR(totalCredit)}
                sub={totalCredit > 0 ? `${totalRevenue > 0 ? ((totalCredit / totalRevenue) * 100).toFixed(1) : 0}% credit sales` : 'Sab paid — zabardast!'}
                tone={totalCredit > totalPaid ? 'rose' : 'emerald'}
              />
            </div>
          </section>

          {/* Recommendations */}
          <section className="rounded-2xl sm:rounded-3xl bg-white dark:bg-slate-900/80 dark:backdrop-blur-sm border-2 border-slate-200 dark:border-slate-800 shadow-sm p-5 sm:p-6">
            <div className="flex items-center gap-2.5 mb-4">
              <div className="h-10 w-10 rounded-2xl bg-gradient-to-br from-amber-500 to-orange-600 text-white flex items-center justify-center shadow-lg shadow-amber-500/40">
                <Zap className="h-5 w-5" />
              </div>
              <div>
                <h3 className="text-base sm:text-lg font-extrabold text-slate-900 dark:text-white">Recommendations 💡</h3>
                <p className="text-xs text-slate-500 dark:text-slate-400 font-bold">Actionable tips</p>
              </div>
            </div>
            <div className="space-y-2">
              {profitMargin < 15 && !hideCost && totalRevenue > 0 && (
                <TipRow tone="amber" icon={AlertTriangle}
                  title="Profit margin bohat kam hai"
                  desc="Kharid rate check karo, wholesale suppliers explore karo, ya bikri rate slightly barhao. Target: 20%+"
                />
              )}
              {totalCredit > totalPaid * 0.5 && totalPaid > 0 && (
                <TipRow tone="rose" icon={Clock}
                  title="Udhaar zyada hai"
                  desc="Khata Book se udhaar customers ko WhatsApp karo aur payment collect karo"
                />
              )}
              {reports.topProducts.length > 0 && (
                <TipRow tone="emerald" icon={Star}
                  title="Top products ka stock rakhein"
                  desc={`"${reports.topProducts[0]?.product?.name}" bohat bik raha hai. Reorder page check karo.`}
                />
              )}
              {totalOrders < effectiveDays && totalOrders > 0 && (
                <TipRow tone="sky" icon={TrendingDown}
                  title="Orders kam ho rahe hain"
                  desc="Combos banao, quick keys use karo, aur featured products highlight karo POS pe"
                />
              )}
              <TipRow tone="violet" icon={Sparkles}
                title="Pro tip: Reports roz check karein"
                desc="Best-selling products aur customers ka data dekh kar smart decisions lo"
              />
            </div>
          </section>
        </>
      )}

      {/* ═══════════════════════════════════════════════════════
          PRINT CSS — battle-tested, clean multi-page
          ═══════════════════════════════════════════════════════ */}
      <style>{`
        @media print {
          @page { size: A4 landscape; margin: 10mm 8mm; }
          html, body {
            background: white !important;
            color: #0f172a !important;
            print-color-adjust: exact !important;
            -webkit-print-color-adjust: exact !important;
          }
          .dark body, .dark {
            background: white !important;
            color: #0f172a !important;
          }
          .print\\:hidden { display: none !important; }
          .print\\:block  { display: block !important; }
          section, div { box-shadow: none !important; }

          /* Kill overflow constraints (critical for multi-page) */
          .overflow-x-auto, .overflow-y-auto, .overflow-hidden, .overflow-auto {
            overflow: visible !important;
            max-height: none !important;
            height: auto !important;
          }
          main, aside, header, nav, [class*="max-h-"] {
            max-height: none !important;
            height: auto !important;
            overflow: visible !important;
          }
          html, body, #root, #__next {
            height: auto !important;
            min-height: 0 !important;
            overflow: visible !important;
          }
          [class*="sidebar"], [class*="topbar"], nav[class*="fixed"] {
            display: none !important;
          }
          [class*="rounded-2xl"], [class*="rounded-3xl"] {
            overflow: visible !important;
            border-radius: 6px !important;
          }

          /* Tables */
          table {
            font-size: 9px !important;
            border-collapse: collapse !important;
            width: 100% !important;
            page-break-inside: auto !important;
          }
          thead { display: table-header-group !important; }
          thead th {
            background: #0ea5e9 !important;
            color: white !important;
            padding: 5px 4px !important;
            font-size: 8px !important;
            font-weight: 800 !important;
            border: 1px solid #0284c7 !important;
          }
          tbody tr { page-break-inside: avoid !important; }
          tbody td {
            padding: 5px 4px !important;
            border: 1px solid #e2e8f0 !important;
            color: #0f172a !important;
          }
          tbody tr:nth-child(even) td { background: #f8fafc !important; }

          /* Status colors */
          .bg-emerald-100, [class*="emerald-500/20"] { background: #d1fae5 !important; color: #047857 !important; }
          .bg-amber-100,   [class*="amber-500/20"]   { background: #fef3c7 !important; color: #b45309 !important; }
          .bg-rose-100,    [class*="rose-500/20"]    { background: #ffe4e6 !important; color: #be123c !important; }
          .text-emerald-700, [class*="emerald-400"] { color: #047857 !important; }
          .text-amber-700,   [class*="amber-400"]   { color: #b45309 !important; }
          .text-rose-700,    [class*="rose-400"]    { color: #be123c !important; }
          .text-sky-700,     [class*="sky-400"]     { color: #0284c7 !important; }
          .text-violet-700,  [class*="violet-400"]  { color: #6d28d9 !important; }
          .text-blue-700,    [class*="blue-400"]    { color: #1d4ed8 !important; }

          /* Charts — keep visible, avoid mid-break */
          .recharts-wrapper {
            page-break-inside: avoid !important;
            break-inside: avoid !important;
          }

          tbody td img { display: none !important; }
          .print-header {
            page-break-after: avoid !important;
            margin-bottom: 8px !important;
          }
        }
      `}</style>
    </div>
  );
}

/* ═════════════════════════════════════════════════════════════
   SUB-COMPONENTS
   ═════════════════════════════════════════════════════════════ */

function CsvMenuItem({ icon: Icon, label, onClick, highlight }: any) {
  return (
    <button
      onMouseDown={onClick}
      className={[
        'w-full px-3 py-2.5 flex items-center gap-2.5 text-left transition',
        highlight
          ? 'bg-emerald-50 dark:bg-emerald-500/10 hover:bg-emerald-100 dark:hover:bg-emerald-500/20 text-emerald-700 dark:text-emerald-300'
          : 'hover:bg-slate-100 dark:hover:bg-slate-800 text-slate-700 dark:text-slate-200',
      ].join(' ')}
    >
      <Icon className="h-4 w-4 shrink-0" />
      <span className="text-xs font-extrabold">{label}</span>
    </button>
  );
}

function QuickPreset({ label, onClick }: { label: string; onClick: () => void }) {
  return (
    <button
      onClick={onClick}
      className="h-7 px-2.5 rounded-md bg-slate-100 dark:bg-slate-800 hover:bg-sky-100 dark:hover:bg-sky-500/20 text-slate-700 dark:text-slate-300 hover:text-sky-700 dark:hover:text-sky-300 text-[10px] font-extrabold transition"
    >
      {label}
    </button>
  );
}

function InsightCard({ icon: Icon, label, value, sub, tone }: any) {
  const tones: Record<string, string> = {
    emerald: 'from-emerald-500/40 to-emerald-700/25 border-emerald-300/50',
    amber:   'from-amber-500/40 to-orange-600/25 border-amber-300/50',
    rose:    'from-rose-500/40 to-red-600/25 border-rose-300/50',
    violet:  'from-violet-500/40 to-purple-700/25 border-violet-300/50',
    sky:     'from-sky-500/40 to-cyan-700/25 border-sky-300/50',
  };
  return (
    <div className={`rounded-2xl bg-gradient-to-br ${tones[tone]} backdrop-blur-md border p-4 shadow-lg`}>
      <div className="flex items-center gap-2 text-white/90">
        <Icon className="h-4 w-4" />
        <span className="text-[10px] uppercase tracking-widest font-extrabold">{label}</span>
      </div>
      <div className="mt-1.5 text-xl sm:text-2xl font-extrabold tabular-nums leading-tight truncate drop-shadow-sm">{value}</div>
      {sub && <div className="text-[11px] font-bold text-white/80 mt-0.5 truncate">{sub}</div>}
    </div>
  );
}

function TipRow({ tone, icon: Icon, title, desc }: any) {
  const tones: Record<string, { bg: string; text: string; icon: string }> = {
    amber:   { bg: 'bg-amber-50 dark:bg-amber-500/10 border-amber-300 dark:border-amber-500/40',       text: 'text-amber-800 dark:text-amber-200',   icon: 'from-amber-500 to-orange-600' },
    rose:    { bg: 'bg-rose-50 dark:bg-rose-500/10 border-rose-300 dark:border-rose-500/40',           text: 'text-rose-800 dark:text-rose-200',     icon: 'from-rose-500 to-red-600' },
    emerald: { bg: 'bg-emerald-50 dark:bg-emerald-500/10 border-emerald-300 dark:border-emerald-500/40', text: 'text-emerald-800 dark:text-emerald-200', icon: 'from-emerald-500 to-teal-600' },
    sky:     { bg: 'bg-sky-50 dark:bg-sky-500/10 border-sky-300 dark:border-sky-500/40',               text: 'text-sky-800 dark:text-sky-200',       icon: 'from-sky-500 to-cyan-600' },
    violet:  { bg: 'bg-violet-50 dark:bg-violet-500/10 border-violet-300 dark:border-violet-500/40',   text: 'text-violet-800 dark:text-violet-200', icon: 'from-violet-500 to-purple-600' },
  };
  const t = tones[tone];
  return (
    <div className={`rounded-2xl border-2 p-3 flex items-start gap-3 ${t.bg} ${t.text}`}>
      <div className={`h-9 w-9 rounded-xl bg-gradient-to-br ${t.icon} text-white flex items-center justify-center shrink-0 shadow-md`}>
        <Icon className="h-4 w-4" />
      </div>
      <div className="flex-1 min-w-0">
        <div className="font-extrabold text-sm">{title}</div>
        <div className="text-xs font-semibold opacity-90 mt-0.5 leading-relaxed">{desc}</div>
      </div>
    </div>
  );
}
