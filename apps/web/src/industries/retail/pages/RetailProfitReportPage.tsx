// apps/web/src/industries/retail/pages/RetailProfitReportPage.tsx
import { useState, useMemo, Fragment } from 'react';
import { useQuery } from '@tanstack/react-query';
import { Link } from 'react-router-dom';
import {
  TrendingUp, TrendingDown, BarChart3, Award, Package,
  Sliders, X, Search, RefreshCw, ArrowUpRight, ArrowDownRight,
  Star, Crown, AlertCircle, RotateCcw, Filter,
  DollarSign, Percent, ShoppingBag, Printer, FileSpreadsheet,
  ArrowUpDown, ChevronDown, ChevronRight, PiggyBank, Flame,
} from 'lucide-react';
import {
  ResponsiveContainer, BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip,
  PieChart, Pie, Cell,
} from 'recharts';
import {
  profitReportApi,
  type ProfitFilters,
  type ProfitPeriod,
  type ProfitSortBy,
  type ProductProfit,
} from '@modules/finance/profit-report/api/profit-report.api';
import { categoriesApi } from '@modules/inventory/categories/api/categories.api';
import { brandsApi } from '@modules/inventory/brands/api/brands.api';
import { formatPKR, formatPKRFull } from '@core/lib/format';
import { Button } from '@core/ui/Button';
import { useAuthStore } from '@core/stores/auth.store';
import { useCostHidden, PrivacyToggle } from '@core/ui/HiddenValue';

/* ═════════════════════════════════════════════════════════════
   NAFAA RETAIL PROFIT REPORT — FULL BEST
   ─────────────────────────────────────────────────────────────
   💰 Grocery-focused profit analytics
   🖨️ Perfect A4 landscape print + PDF
   📊 CSV export with full detail
   🌗 Dark + light mode perfect
   📱 Mobile → 4K responsive
   ═════════════════════════════════════════════════════════════ */

const PERIOD_OPTIONS: Array<{ value: ProfitPeriod; label: string; emoji: string }> = [
  { value: 'today',   label: 'Today',         emoji: '📅' },
  { value: 'week',    label: 'Last 7 Days',   emoji: '📆' },
  { value: 'month',   label: 'Last 30 Days',  emoji: '🗓️' },
  { value: 'quarter', label: 'Last 3 Months', emoji: '📊' },
  { value: 'year',    label: 'Last Year',     emoji: '📈' },
  { value: 'all',     label: 'All Time',      emoji: '♾️' },
];

const SORT_OPTIONS: Array<{ value: ProfitSortBy; label: string }> = [
  { value: 'profit',   label: 'Highest Profit' },
  { value: 'margin',   label: 'Best Margin %' },
  { value: 'revenue',  label: 'Most Revenue' },
  { value: 'quantity', label: 'Most Sold' },
];

const PIE_COLORS = ['#10b981', '#3b82f6', '#8b5cf6', '#f59e0b', '#ec4899', '#06b6d4', '#84cc16', '#f43f5e'];

export default function RetailProfitReportPage() {
  const hideCost = useCostHidden();
  const tenantName = useAuthStore((s) => s.tenant?.name);
  const shopName = useAuthStore((s) => s.user?.assignedShop?.name);

  const [filters, setFilters] = useState<ProfitFilters>({ period: 'month', sortBy: 'profit' });
  const [search, setSearch] = useState('');
  const [showFilters, setShowFilters] = useState(false);
  const [expandedRows, setExpandedRows] = useState<Set<string>>(new Set());

  const { data: summary, refetch: refetchSummary, isRefetching: refetchingSummary } = useQuery({
    queryKey: ['profit-summary', filters],
    queryFn: () => profitReportApi.summary(filters),
  });

  const { data: products = [], isLoading: productsLoading, refetch: refetchProducts, isRefetching: refetchingProducts } = useQuery({
    queryKey: ['profit-by-product', filters],
    queryFn: () => profitReportApi.byProduct(filters),
  });

  const { data: categories = [] } = useQuery({
    queryKey: ['categories'],
    queryFn: categoriesApi.list,
  });

  const { data: brands = [] } = useQuery({
    queryKey: ['brands'],
    queryFn: () => brandsApi.list(),
  });

  const isRefetching = refetchingSummary || refetchingProducts;

  const filteredProducts = useMemo(() => {
    const q = search.toLowerCase().trim();
    if (!q) return products;
    return products.filter(
      (p) =>
        p.name.toLowerCase().includes(q) ||
        p.sku?.toLowerCase().includes(q) ||
        p.categoryName?.toLowerCase().includes(q) ||
        p.brandName?.toLowerCase().includes(q),
    );
  }, [products, search]);

  const hasActiveFilters =
    filters.categoryId || filters.brandId || (filters.period && filters.period !== 'all');

  const clearFilters = () => {
    setFilters({ period: 'all', sortBy: 'profit' });
    setSearch('');
  };

  const refreshAll = () => {
    refetchSummary();
    refetchProducts();
  };

  const toggleExpand = (id: string) => {
    setExpandedRows((prev) => {
      const next = new Set(prev);
      if (next.has(id)) next.delete(id); else next.add(id);
      return next;
    });
  };
  const expandAll = () => setExpandedRows(new Set(filteredProducts.map((p) => p.productId)));
  const collapseAll = () => setExpandedRows(new Set());

  /* ─── Print ─────────────────────────────────────────── */
  const handlePrint = () => {
    const wasExpanded = expandedRows.size > 0;
    if (wasExpanded) setExpandedRows(new Set());
    setTimeout(() => {
      window.print();
      if (wasExpanded) {
        setTimeout(() => setExpandedRows(new Set(filteredProducts.map((p) => p.productId))), 500);
      }
    }, 100);
  };

  /* ─── CSV Export ────────────────────────────────────── */
  const exportCSV = () => {
    if (filteredProducts.length === 0) return;
    const totalRev = filteredProducts.reduce((s, p) => s + p.revenue, 0);
    const totalCost = filteredProducts.reduce((s, p) => s + p.cost, 0);
    const totalProfit = filteredProducts.reduce((s, p) => s + p.profit, 0);
    const avgMargin = totalRev > 0 ? (totalProfit / totalRev) * 100 : 0;

    const summaryRows = [
      [`Profit Report — ${tenantName || 'Nafaa'}`],
      [`Shop: ${shopName || 'All'}  •  Generated: ${new Date().toLocaleString('en-PK')}`],
      [`Period: ${PERIOD_OPTIONS.find((p) => p.value === filters.period)?.label ?? 'Custom'}`],
      [`Total Revenue: ${totalRev.toFixed(2)}`],
      [`Total Cost: ${totalCost.toFixed(2)}`],
      [`Total Profit: ${totalProfit.toFixed(2)}`],
      [`Avg Margin: ${avgMargin.toFixed(1)}%`],
      [''],
    ];
    const headers = [
      '#', 'Product', 'SKU', 'Category', 'Brand', 'Unit',
      'Qty Sold', 'Orders', 'Avg Sell', 'Avg Cost',
      'Revenue', 'Cost', 'Profit', 'Margin %',
      'Returns Qty', 'Returns Amount',
    ];
    const rows = filteredProducts.map((p, idx) => [
      idx + 1, p.name, p.sku || '', p.categoryName || '', p.brandName || '', p.unit,
      p.quantitySold.toFixed(2), p.ordersCount,
      p.avgSellPrice.toFixed(2), p.avgCostPrice.toFixed(2),
      p.revenue.toFixed(2), p.cost.toFixed(2),
      p.profit.toFixed(2), p.margin.toFixed(2),
      p.returnedQty.toFixed(2), p.returnedAmount.toFixed(2),
    ]);
    const csv = [...summaryRows, headers, ...rows]
      .map((r) => r.map((c) => `"${String(c).replace(/"/g, '""')}"`).join(','))
      .join('\n');
    const blob = new Blob(['\ufeff' + csv], { type: 'text/csv;charset=utf-8' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = `profit-report-${new Date().toISOString().slice(0, 10)}.csv`;
    a.click();
    URL.revokeObjectURL(url);
  };

  const printDate = new Date().toLocaleString('en-PK', { dateStyle: 'full', timeStyle: 'short' });
  const currentPeriod = PERIOD_OPTIONS.find((p) => p.value === filters.period);

  return (
    <div className="space-y-4 sm:space-y-6 pb-8 print:space-y-3">
      {/* ═══════════════════════════════════════════════════════
          PRINT-ONLY HEADER
          ═══════════════════════════════════════════════════════ */}
      <div className="hidden print:block print-header">
        <div className="flex items-center justify-between border-b-4 border-emerald-600 pb-3 mb-4">
          <div>
            <h1 className="text-2xl font-black text-slate-900 leading-tight">
              💰 {tenantName || 'My Store'}
            </h1>
            <p className="text-xs text-slate-600 font-semibold mt-1">
              {shopName ? `Shop: ${shopName}  •  ` : ''}Profit Report • {currentPeriod?.label}
            </p>
          </div>
          <div className="text-right">
            <div className="text-[10px] uppercase font-bold text-slate-500">Generated</div>
            <div className="text-xs font-bold text-slate-900">{printDate}</div>
          </div>
        </div>
      </div>

      {/* ═══════════════════════════════════════════════════════
          HERO (screen only)
          ═══════════════════════════════════════════════════════ */}
      <section className="relative overflow-hidden rounded-2xl sm:rounded-3xl bg-gradient-to-br from-slate-950 via-emerald-900 to-emerald-700 dark:from-slate-950 dark:via-emerald-950 dark:to-teal-900 text-white p-4 sm:p-6 shadow-2xl print:hidden">
        <div className="absolute -top-24 -right-24 h-72 w-72 rounded-full bg-emerald-400/30 blur-3xl pointer-events-none animate-pulse" />
        <div className="absolute -bottom-24 -left-24 h-72 w-72 rounded-full bg-amber-400/20 blur-3xl pointer-events-none" />

        <div className="relative flex items-start justify-between flex-wrap gap-4">
          <div className="min-w-0 flex-1">
            <div className="inline-flex items-center gap-2 rounded-full bg-white/15 backdrop-blur-md px-3 py-1 text-[11px] font-extrabold border border-white/25 uppercase tracking-widest shadow-lg">
              <BarChart3 className="h-3.5 w-3.5 text-amber-300" /> Profit Intelligence
              {shopName && (
                <>
                  <span className="opacity-40">•</span>
                  <span className="text-emerald-200">🏪 {shopName}</span>
                </>
              )}
            </div>
            <h1 className="mt-3 text-2xl sm:text-3xl lg:text-4xl font-extrabold leading-tight">
              💰 Profit by Product
            </h1>
            <p className="mt-1.5 text-xs sm:text-sm text-white/90 font-semibold">
              Kis product se kitna kamayi ho rahi hai — full breakdown
            </p>
          </div>

          <div className="flex items-center gap-2 flex-wrap shrink-0">
            <PrivacyToggle compact />
            <button
              onClick={refreshAll}
              disabled={isRefetching}
              className="inline-flex items-center gap-2 rounded-xl bg-white/10 hover:bg-white/20 px-3 py-2.5 text-sm font-extrabold backdrop-blur-md disabled:opacity-50 border border-white/20 transition"
            >
              <RefreshCw className={`h-4 w-4 ${isRefetching ? 'animate-spin' : ''}`} />
              <span className="hidden sm:inline">Refresh</span>
            </button>
            <Button
              variant="secondary"
              onClick={exportCSV}
              disabled={filteredProducts.length === 0}
              className="bg-white/15 text-white hover:bg-white/25 border-white/20 font-extrabold"
            >
              <FileSpreadsheet className="h-4 w-4" /> CSV
            </Button>
            <Button onClick={handlePrint} className="bg-white text-slate-900 hover:bg-slate-100 font-extrabold shadow-2xl">
              <Printer className="h-4 w-4" /> Print / PDF
            </Button>
          </div>
        </div>

        {/* Period switcher pills */}
        <div className="relative mt-5 flex gap-2 flex-wrap">
          {PERIOD_OPTIONS.map((opt) => (
            <button
              key={opt.value}
              onClick={() => setFilters({ ...filters, period: opt.value })}
              className={[
                'px-3 py-1.5 rounded-xl text-xs font-extrabold transition-all',
                filters.period === opt.value
                  ? 'bg-white text-slate-900 shadow-lg scale-105'
                  : 'bg-white/10 text-white hover:bg-white/20 backdrop-blur-sm border border-white/15',
              ].join(' ')}
            >
              <span className="mr-1">{opt.emoji}</span>
              {opt.label}
            </button>
          ))}
        </div>

        {/* Hero KPI tiles */}
        {summary && (
          <div className="relative mt-5 grid grid-cols-2 lg:grid-cols-4 gap-2 sm:gap-3">
            <HeroTile icon={DollarSign} label="Total Revenue" value={formatPKRFull(summary.totalRevenue)} sub={`${summary.totalOrders} orders`} tone="blue" />
            <HeroTile icon={ShoppingBag} label="Total Cost" value={hideCost ? '••••' : formatPKRFull(summary.totalCost)} sub="Cost of goods" tone="rose" />
            <HeroTile icon={TrendingUp} label="Gross Profit" value={hideCost ? '••••' : formatPKRFull(summary.totalProfit)} sub={`${summary.overallMargin.toFixed(1)}% margin`} tone="emerald" highlight />
            <HeroTile icon={Package} label="Products Sold" value={String(summary.productsCount)} sub={`${summary.totalQtySold.toFixed(0)} units`} tone="violet" />
          </div>
        )}
      </section>

      {/* ═══════════════════════════════════════════════════════
          SEARCH + FILTERS
          ═══════════════════════════════════════════════════════ */}
      <section className="space-y-3 print:hidden">
        <div className="flex gap-2 flex-wrap">
          <div className="flex-1 relative min-w-[260px]">
            <Search className="h-4 w-4 text-slate-400 absolute left-3 top-1/2 -translate-y-1/2 pointer-events-none" />
            <input
              className="h-11 w-full rounded-xl border-2 border-slate-200 dark:border-slate-700 bg-white dark:bg-slate-900 pl-10 pr-10 text-sm font-semibold text-slate-900 dark:text-white placeholder:text-slate-400 dark:placeholder:text-slate-500 focus:outline-none focus:border-emerald-500 transition"
              placeholder="Search: name, SKU, category, brand..."
              value={search}
              onChange={(e) => setSearch(e.target.value)}
            />
            {search && (
              <button onClick={() => setSearch('')} className="absolute right-3 top-1/2 -translate-y-1/2 h-6 w-6 rounded-md hover:bg-slate-100 dark:hover:bg-slate-800 flex items-center justify-center">
                <X className="h-3.5 w-3.5 text-slate-400" />
              </button>
            )}
          </div>

          <select
            className="h-11 px-3 rounded-xl border-2 border-slate-200 dark:border-slate-700 bg-white dark:bg-slate-900 text-sm font-extrabold text-slate-900 dark:text-white focus:outline-none focus:border-emerald-500 transition"
            value={filters.sortBy || 'profit'}
            onChange={(e) => setFilters({ ...filters, sortBy: e.target.value as ProfitSortBy })}
          >
            {SORT_OPTIONS.map((opt) => (
              <option key={opt.value} value={opt.value}>Sort: {opt.label}</option>
            ))}
          </select>

          <button
            onClick={() => setShowFilters((v) => !v)}
            className={[
              'h-11 px-4 rounded-xl border-2 font-extrabold text-sm inline-flex items-center gap-2 transition',
              showFilters || hasActiveFilters
                ? 'border-emerald-500 bg-emerald-50 dark:bg-emerald-500/15 text-emerald-700 dark:text-emerald-300'
                : 'border-slate-200 dark:border-slate-700 bg-white dark:bg-slate-900 text-slate-700 dark:text-slate-300 hover:border-emerald-300',
            ].join(' ')}
          >
            <Filter className="h-4 w-4" /> Filters
            {hasActiveFilters && (
              <span className="h-5 w-5 rounded-full bg-emerald-600 text-white text-[10px] font-extrabold flex items-center justify-center">!</span>
            )}
          </button>

          <div className="inline-flex rounded-xl bg-slate-100 dark:bg-slate-800 p-1">
            <button
              onClick={() => expandedRows.size > 0 ? collapseAll() : expandAll()}
              className="px-3 h-9 rounded-lg text-slate-700 dark:text-slate-300 hover:bg-white dark:hover:bg-slate-900 text-[11px] font-extrabold transition inline-flex items-center gap-1.5"
            >
              {expandedRows.size > 0 ? <ChevronDown className="h-3.5 w-3.5" /> : <ChevronRight className="h-3.5 w-3.5" />}
              {expandedRows.size > 0 ? 'Collapse' : 'Expand'} All
            </button>
          </div>
        </div>

        {showFilters && (
          <div className="rounded-2xl bg-white dark:bg-slate-900 border-2 border-slate-200 dark:border-slate-800 p-4 space-y-3 shadow-sm">
            <div className="grid sm:grid-cols-3 gap-3">
              <FilterField label="Category">
                <select
                  className="filter-select"
                  value={filters.categoryId ?? ''}
                  onChange={(e) => setFilters({ ...filters, categoryId: e.target.value || undefined })}
                >
                  <option value="">All categories</option>
                  {categories.map((c: any) => <option key={c.id} value={c.id}>{c.name}</option>)}
                </select>
              </FilterField>
              <FilterField label="Brand">
                <select
                  className="filter-select"
                  value={filters.brandId ?? ''}
                  onChange={(e) => setFilters({ ...filters, brandId: e.target.value || undefined })}
                >
                  <option value="">All brands</option>
                  {brands.map((b: any) => <option key={b.id} value={b.id}>{b.name}</option>)}
                </select>
              </FilterField>
              <FilterField label="Custom Date Range">
                <div className="flex gap-1">
                  <input
                    type="date"
                    className="filter-select flex-1"
                    value={filters.startDate || ''}
                    onChange={(e) => setFilters({ ...filters, startDate: e.target.value || undefined })}
                  />
                  <input
                    type="date"
                    className="filter-select flex-1"
                    value={filters.endDate || ''}
                    onChange={(e) => setFilters({ ...filters, endDate: e.target.value || undefined })}
                  />
                </div>
              </FilterField>
            </div>
            {hasActiveFilters && (
              <button onClick={clearFilters} className="text-xs font-extrabold text-rose-600 dark:text-rose-400 hover:underline inline-flex items-center gap-1">
                <RotateCcw className="h-3 w-3" /> Clear all filters
              </button>
            )}
          </div>
        )}
      </section>

      {/* ═══════════════════════════════════════════════════════
          TOP PERFORMERS + HIGHEST MARGIN
          ═══════════════════════════════════════════════════════ */}
      {summary && (summary.topProfitable.length > 0 || summary.highestMargin.length > 0) && (
        <section className="grid lg:grid-cols-2 gap-4 sm:gap-6 print:hidden">
          <Card noPad>
            <div className="px-4 sm:px-6 py-4 border-b-2 border-slate-100 dark:border-slate-800 flex items-center gap-3 bg-gradient-to-r from-emerald-50 to-teal-50 dark:from-emerald-500/10 dark:to-teal-500/10">
              <div className="h-10 w-10 rounded-2xl bg-gradient-to-br from-amber-500 to-orange-600 text-white flex items-center justify-center shadow-lg shadow-amber-500/40">
                <Crown className="h-5 w-5" />
              </div>
              <div className="flex-1 min-w-0">
                <h3 className="text-base sm:text-lg font-extrabold text-slate-900 dark:text-white">Top 5 Profitable 🏆</h3>
                <p className="text-xs text-slate-500 dark:text-slate-400 font-bold">Best profit contributors</p>
              </div>
            </div>
            <div className="p-3 space-y-1.5">
              {summary.topProfitable.slice(0, 5).map((p, idx) => (
                <TopProductCard key={p.productId} product={p} rank={idx + 1} variant="profit" hideCost={hideCost} />
              ))}
              {summary.topProfitable.length === 0 && <EmptyList message="No data yet" />}
            </div>
          </Card>

          <Card noPad>
            <div className="px-4 sm:px-6 py-4 border-b-2 border-slate-100 dark:border-slate-800 flex items-center gap-3 bg-gradient-to-r from-violet-50 to-purple-50 dark:from-violet-500/10 dark:to-purple-500/10">
              <div className="h-10 w-10 rounded-2xl bg-gradient-to-br from-violet-500 to-purple-600 text-white flex items-center justify-center shadow-lg shadow-violet-500/40">
                <Percent className="h-5 w-5" />
              </div>
              <div className="flex-1 min-w-0">
                <h3 className="text-base sm:text-lg font-extrabold text-slate-900 dark:text-white">Highest Margin % 💎</h3>
                <p className="text-xs text-slate-500 dark:text-slate-400 font-bold">Best profitability ratio</p>
              </div>
            </div>
            <div className="p-3 space-y-1.5">
              {summary.highestMargin.slice(0, 5).map((p, idx) => (
                <TopProductCard key={p.productId} product={p} rank={idx + 1} variant="margin" hideCost={hideCost} />
              ))}
              {summary.highestMargin.length === 0 && <EmptyList message="No data yet" />}
            </div>
          </Card>
        </section>
      )}

      {/* ═══════════════════════════════════════════════════════
          LOSSES ALERT
          ═══════════════════════════════════════════════════════ */}
      {summary && summary.losses.length > 0 && (
        <section className="rounded-2xl sm:rounded-3xl bg-gradient-to-br from-rose-50 to-pink-50 dark:from-rose-950/50 dark:to-pink-950/40 border-2 border-rose-300 dark:border-rose-700 p-4 sm:p-5 print:hidden shadow-lg">
          <div className="flex items-center gap-2.5 mb-3">
            <div className="h-10 w-10 rounded-2xl bg-gradient-to-br from-rose-500 to-red-600 text-white flex items-center justify-center shadow-lg shadow-rose-500/40">
              <Flame className="h-5 w-5" />
            </div>
            <div>
              <h3 className="font-extrabold text-rose-900 dark:text-rose-100">
                ⚠️ Losses Detected ({summary.losses.length})
              </h3>
              <p className="text-xs text-rose-800 dark:text-rose-300 font-bold">
                Ye products lagat se kam mein bik rahe hain — foran review karo
              </p>
            </div>
          </div>
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-2 sm:gap-3">
            {summary.losses.slice(0, 6).map((p) => (
              <div key={p.productId} className="rounded-xl bg-white dark:bg-slate-900/60 border-2 border-rose-200 dark:border-rose-500/40 p-3 flex items-center gap-3 hover:shadow-md transition">
                <div className="h-10 w-10 rounded-xl bg-gradient-to-br from-rose-500 to-red-600 text-white flex items-center justify-center shrink-0 shadow-md">
                  <TrendingDown className="h-4 w-4" />
                </div>
                <div className="min-w-0 flex-1">
                  <div className="font-extrabold text-slate-900 dark:text-white text-sm truncate">{p.name}</div>
                  <div className="text-[11px] text-slate-500 dark:text-slate-400 font-bold">{p.quantitySold} {p.unit} sold</div>
                </div>
                <div className="text-right shrink-0">
                  <div className="font-extrabold text-rose-700 dark:text-rose-400 text-sm tabular-nums">{formatPKR(p.profit)}</div>
                  <div className="text-[10px] text-rose-600 dark:text-rose-400 font-bold">{p.margin.toFixed(1)}%</div>
                </div>
              </div>
            ))}
          </div>
        </section>
      )}

      {/* ═══════════════════════════════════════════════════════
          CHARTS
          ═══════════════════════════════════════════════════════ */}
      {summary && summary.topProfitable.length > 0 && (
        <section className="grid lg:grid-cols-2 gap-4 sm:gap-6 print:hidden">
          <Card>
            <CardHeader icon={Award} title="Top 10 by Profit" subtitle="Revenue vs Profit comparison" tone="amber" />
            <div className="h-[320px]">
              <ResponsiveContainer width="100%" height="100%">
                <BarChart
                  data={summary.topProfitable.slice(0, 10).map((p) => ({
                    name: p.name.length > 14 ? p.name.slice(0, 14) + '…' : p.name,
                    profit: p.profit,
                    revenue: p.revenue,
                  }))}
                  layout="vertical"
                  margin={{ left: 0, right: 16, top: 8, bottom: 8 }}
                >
                  <CartesianGrid strokeDasharray="3 3" className="stroke-slate-200 dark:stroke-slate-700" opacity={0.4} />
                  <XAxis type="number" className="fill-slate-500 dark:fill-slate-400" fontSize={10} tickFormatter={(v) => `${(v / 1000).toFixed(0)}k`} tickLine={false} axisLine={false} />
                  <YAxis type="category" dataKey="name" className="fill-slate-500 dark:fill-slate-400" fontSize={10} width={100} tickLine={false} axisLine={false} />
                  <Tooltip
                    formatter={(value: any) => formatPKR(Number(value))}
                    contentStyle={{
                      borderRadius: 12, border: '1px solid rgba(148,163,184,0.2)',
                      backgroundColor: 'rgba(15,23,42,0.95)', color: '#f8fafc',
                      boxShadow: '0 20px 40px rgba(0,0,0,0.3)',
                    }}
                    labelStyle={{ color: '#94a3b8', fontWeight: 700 }}
                    cursor={{ fill: 'rgba(16,185,129,0.1)' }}
                  />
                  <Bar dataKey="revenue" fill="#94a3b8" radius={[0, 4, 4, 0]} name="Revenue" />
                  <Bar dataKey="profit" fill="#10b981" radius={[0, 4, 4, 0]} name="Profit" />
                </BarChart>
              </ResponsiveContainer>
            </div>
          </Card>

          <Card>
            <CardHeader icon={BarChart3} title="Profit by Category" subtitle="Top categories breakdown" tone="sky" />
            {summary.categoryBreakdown.length > 0 ? (
              <>
                <div className="h-[220px]">
                  <ResponsiveContainer width="100%" height="100%">
                    <PieChart>
                      <Pie
                        data={summary.categoryBreakdown.slice(0, 8).map((c) => ({
                          name: c.name,
                          value: Math.max(c.profit, 0),
                        }))}
                        cx="50%" cy="50%" outerRadius={85} innerRadius={45}
                        dataKey="value" labelLine={false} paddingAngle={2}
                        label={(entry: any) => summary.totalProfit > 0 ? `${((entry.value / summary.totalProfit) * 100).toFixed(0)}%` : ''}
                      >
                        {summary.categoryBreakdown.slice(0, 8).map((_, idx) => (
                          <Cell key={idx} fill={PIE_COLORS[idx % PIE_COLORS.length]} stroke="none" />
                        ))}
                      </Pie>
                      <Tooltip
                        formatter={(value: any) => formatPKR(Number(value))}
                        contentStyle={{
                          borderRadius: 12, border: '1px solid rgba(148,163,184,0.2)',
                          backgroundColor: 'rgba(15,23,42,0.95)', color: '#f8fafc',
                        }}
                      />
                    </PieChart>
                  </ResponsiveContainer>
                </div>
                <div className="mt-2 space-y-1.5 max-h-[100px] overflow-y-auto">
                  {summary.categoryBreakdown.slice(0, 8).map((c, idx) => (
                    <div key={c.name} className="flex items-center gap-2 text-xs">
                      <span className="h-2.5 w-2.5 rounded-full shadow-sm shrink-0" style={{ backgroundColor: PIE_COLORS[idx % PIE_COLORS.length] }} />
                      <span className="font-extrabold text-slate-700 dark:text-slate-200 flex-1 truncate">{c.name}</span>
                      <span className="font-extrabold text-emerald-700 dark:text-emerald-400 tabular-nums shrink-0">
                        {hideCost ? '••••' : formatPKR(c.profit)}
                      </span>
                    </div>
                  ))}
                </div>
              </>
            ) : (
              <div className="h-[220px] flex items-center justify-center text-sm font-bold text-slate-400 dark:text-slate-600">
                No category data
              </div>
            )}
          </Card>
        </section>
      )}

      {/* ═══════════════════════════════════════════════════════
          MAIN TABLE
          ═══════════════════════════════════════════════════════ */}
      <Card noPad className="print:border-0 print:rounded-none print:shadow-none">
        <div className="px-4 sm:px-6 py-4 border-b-2 border-slate-100 dark:border-slate-800 flex items-center justify-between flex-wrap gap-2 print:hidden">
          <div className="flex items-center gap-2.5">
            <div className="h-9 w-9 rounded-xl bg-gradient-to-br from-emerald-500 to-teal-700 text-white flex items-center justify-center shadow-md">
              <PiggyBank className="h-4 w-4" />
            </div>
            <div>
              <h3 className="font-extrabold text-slate-900 dark:text-white text-sm sm:text-base">
                Detailed Profit ({filteredProducts.length})
              </h3>
              <p className="text-[11px] text-slate-500 dark:text-slate-400 font-bold">
                Period: {currentPeriod?.label}{hasActiveFilters && ' (filtered)'}
              </p>
            </div>
          </div>
        </div>

        {productsLoading ? (
          <div className="p-6 space-y-2">
            {Array.from({ length: 6 }).map((_, i) => (
              <div key={i} className="h-16 rounded-xl bg-slate-100 dark:bg-slate-800 animate-pulse" />
            ))}
          </div>
        ) : filteredProducts.length === 0 ? (
          <div className="p-16 text-center">
            <div className="h-16 w-16 rounded-2xl bg-slate-100 dark:bg-slate-800 flex items-center justify-center mx-auto">
              <Package className="h-8 w-8 text-slate-400 dark:text-slate-600" />
            </div>
            <h3 className="mt-4 text-lg font-extrabold text-slate-900 dark:text-white">No sales data yet</h3>
            <p className="text-sm text-slate-500 dark:text-slate-400 mt-1 font-bold">
              {search ? 'Filter change karo' : 'Sales karo — data yahan aa jayega'}
            </p>
          </div>
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full text-sm print:text-[10px]">
              <thead className="bg-slate-50 dark:bg-slate-800/60 border-b-2 border-slate-200 dark:border-slate-700">
                <tr>
                  <th className="px-2 py-3 text-center w-10 print:hidden"></th>
                  <th className="px-3 py-3 text-center text-[10px] font-extrabold uppercase tracking-wider text-slate-700 dark:text-slate-300 w-12">#</th>
                  <th className="px-3 py-3 text-left text-[10px] font-extrabold uppercase tracking-wider text-slate-700 dark:text-slate-300">Product</th>
                  <th className="px-3 py-3 text-left text-[10px] font-extrabold uppercase tracking-wider text-slate-700 dark:text-slate-300">Cat / Brand</th>
                  <th className="px-3 py-3 text-right text-[10px] font-extrabold uppercase tracking-wider text-slate-700 dark:text-slate-300">Sold</th>
                  <th className="px-3 py-3 text-right text-[10px] font-extrabold uppercase tracking-wider text-slate-700 dark:text-slate-300">Avg Price</th>
                  <th className="px-3 py-3 text-right text-[10px] font-extrabold uppercase tracking-wider text-slate-700 dark:text-slate-300">Revenue</th>
                  {!hideCost && <th className="px-3 py-3 text-right text-[10px] font-extrabold uppercase tracking-wider text-slate-700 dark:text-slate-300">Cost</th>}
                  {!hideCost && <th className="px-3 py-3 text-right text-[10px] font-extrabold uppercase tracking-wider text-slate-700 dark:text-slate-300">Profit</th>}
                  {!hideCost && <th className="px-3 py-3 text-center text-[10px] font-extrabold uppercase tracking-wider text-slate-700 dark:text-slate-300">Margin</th>}
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-100 dark:divide-slate-800">
                {filteredProducts.map((p, idx) => {
                  const expanded = expandedRows.has(p.productId);
                  const isLoss = p.profit < 0;
                  const isHigh = p.margin >= 30;
                  const isMed = p.margin >= 15 && p.margin < 30;
                  const isLow = p.margin >= 0 && p.margin < 15;

                  return (
                    <Fragment key={p.productId}>
                      <tr className={[
                        'hover:bg-slate-50 dark:hover:bg-slate-800/40 transition',
                        isLoss ? 'bg-rose-50/40 dark:bg-rose-500/5' : '',
                        expanded ? 'bg-emerald-50/40 dark:bg-emerald-500/10 border-l-4 border-emerald-500' : '',
                      ].join(' ')}>
                        <td className="px-2 py-3 text-center print:hidden">
                          <button
                            onClick={() => toggleExpand(p.productId)}
                            className={[
                              'h-7 w-7 rounded-lg inline-flex items-center justify-center transition',
                              expanded
                                ? 'bg-emerald-600 text-white shadow-md'
                                : 'bg-slate-100 dark:bg-slate-800 hover:bg-slate-200 dark:hover:bg-slate-700 text-slate-600 dark:text-slate-300',
                            ].join(' ')}
                          >
                            {expanded ? <ChevronDown className="h-3.5 w-3.5" /> : <ChevronRight className="h-3.5 w-3.5" />}
                          </button>
                        </td>
                        <td className="px-3 py-3 text-center">
                          <span className={[
                            'inline-flex items-center justify-center h-6 w-6 rounded-md text-[10px] font-extrabold',
                            idx < 3 ? 'bg-amber-100 dark:bg-amber-500/20 text-amber-700 dark:text-amber-300' : 'bg-slate-100 dark:bg-slate-800 text-slate-600 dark:text-slate-400',
                          ].join(' ')}>
                            {idx + 1}
                          </span>
                        </td>
                        <td className="px-3 py-3">
                          <div className="flex items-center gap-2.5">
                            <div className="h-10 w-10 rounded-lg bg-slate-100 dark:bg-slate-800 overflow-hidden flex items-center justify-center shrink-0 print:hidden border border-slate-200 dark:border-slate-700">
                              {p.primaryImage ? (
                                <img src={p.primaryImage} alt="" className="h-full w-full object-cover" />
                              ) : (
                                <Package className="h-4 w-4 text-slate-400" />
                              )}
                            </div>
                            <div className="min-w-0">
                              <div className="font-extrabold text-slate-900 dark:text-white text-sm line-clamp-1">{p.name}</div>
                              <div className="flex items-center gap-1.5 mt-0.5 text-[10px]">
                                {p.sku && <span className="font-mono text-slate-500 dark:text-slate-400">{p.sku}</span>}
                                {p.variantCount > 0 && (
                                  <span className="px-1.5 py-0.5 rounded bg-violet-100 dark:bg-violet-500/20 text-violet-700 dark:text-violet-300 font-extrabold">
                                    {p.variantCount}v
                                  </span>
                                )}
                              </div>
                            </div>
                          </div>
                        </td>
                        <td className="px-3 py-3 text-xs">
                          {p.categoryName && (
                            <div className="font-extrabold text-slate-700 dark:text-slate-200 flex items-center gap-1.5">
                              {p.categoryColor && (
                                <span className="inline-block h-2 w-2 rounded-full shrink-0" style={{ backgroundColor: p.categoryColor }} />
                              )}
                              <span className="truncate">{p.categoryName}</span>
                            </div>
                          )}
                          {p.brandName && (
                            <div className="text-[10px] font-bold text-violet-700 dark:text-violet-400 mt-0.5 truncate">{p.brandName}</div>
                          )}
                        </td>
                        <td className="px-3 py-3 text-right">
                          <div className="font-extrabold text-slate-900 dark:text-white tabular-nums">
                            {p.quantitySold.toFixed(p.quantitySold % 1 === 0 ? 0 : 2)}
                          </div>
                          <div className="text-[10px] text-slate-500 dark:text-slate-400 font-bold uppercase">{p.unit}</div>
                        </td>
                        <td className="px-3 py-3 text-right text-xs font-bold text-slate-700 dark:text-slate-200 tabular-nums">
                          {formatPKR(p.avgSellPrice)}
                        </td>
                        <td className="px-3 py-3 text-right text-xs font-extrabold text-blue-700 dark:text-blue-400 tabular-nums">
                          {formatPKR(p.revenue)}
                        </td>
                        {!hideCost && (
                          <td className="px-3 py-3 text-right text-xs font-bold text-rose-700 dark:text-rose-400 tabular-nums">
                            {formatPKR(p.cost)}
                          </td>
                        )}
                        {!hideCost && (
                          <td className="px-3 py-3 text-right">
                            <div className={[
                              'inline-flex items-center gap-1 font-extrabold tabular-nums text-xs',
                              p.profit > 0 ? 'text-emerald-700 dark:text-emerald-400' : 'text-rose-700 dark:text-rose-400',
                            ].join(' ')}>
                              {p.profit > 0 ? <ArrowUpRight className="h-3 w-3" /> : <ArrowDownRight className="h-3 w-3" />}
                              {formatPKR(p.profit)}
                            </div>
                          </td>
                        )}
                        {!hideCost && (
                          <td className="px-3 py-3 text-center">
                            <span className={[
                              'inline-flex items-center gap-1 px-2 py-0.5 rounded-full text-[10px] font-extrabold',
                              isHigh ? 'bg-emerald-100 dark:bg-emerald-500/20 text-emerald-700 dark:text-emerald-300' :
                              isMed ? 'bg-amber-100 dark:bg-amber-500/20 text-amber-700 dark:text-amber-300' :
                              isLow ? 'bg-slate-100 dark:bg-slate-800 text-slate-700 dark:text-slate-300' :
                              'bg-rose-100 dark:bg-rose-500/20 text-rose-700 dark:text-rose-300',
                            ].join(' ')}>
                              {isHigh && <Star className="h-2.5 w-2.5" />}
                              {p.margin.toFixed(1)}%
                            </span>
                          </td>
                        )}
                      </tr>

                      {expanded && (
                        <tr className="print:hidden bg-emerald-50/30 dark:bg-emerald-500/5 border-l-4 border-emerald-500">
                          <td colSpan={hideCost ? 7 : 10} className="p-4">
                            <ExpandedProfitDetail product={p} hideCost={hideCost} />
                          </td>
                        </tr>
                      )}
                    </Fragment>
                  );
                })}
              </tbody>
              <tfoot className="bg-slate-100 dark:bg-slate-800 border-t-2 border-slate-300 dark:border-slate-700 font-extrabold">
                <tr>
                  <td className="print:hidden"></td>
                  <td colSpan={5} className="px-3 py-3 text-right text-xs uppercase text-slate-700 dark:text-slate-300">
                    Totals ({filteredProducts.length}):
                  </td>
                  <td className="px-3 py-3 text-right text-blue-700 dark:text-blue-400 tabular-nums text-xs">
                    {formatPKR(filteredProducts.reduce((s, p) => s + p.revenue, 0))}
                  </td>
                  {!hideCost && (
                    <td className="px-3 py-3 text-right text-rose-700 dark:text-rose-400 tabular-nums text-xs">
                      {formatPKR(filteredProducts.reduce((s, p) => s + p.cost, 0))}
                    </td>
                  )}
                  {!hideCost && (
                    <td className="px-3 py-3 text-right text-emerald-700 dark:text-emerald-400 tabular-nums text-xs">
                      {formatPKR(filteredProducts.reduce((s, p) => s + p.profit, 0))}
                    </td>
                  )}
                  {!hideCost && <td></td>}
                </tr>
              </tfoot>
            </table>
          </div>
        )}
      </Card>

      <div className="hidden print:block text-center text-[10px] text-slate-500 border-t border-slate-300 pt-2 mt-4">
        Generated by Nafaa POS • {tenantName || ''} • Auto-paginated
      </div>

      {/* Print CSS (same battle-tested as Stock Report) */}
      <style>{`
        .filter-select {
          height: 40px; width: 100%; border-radius: 10px;
          border: 2px solid rgb(226 232 240);
          background: white; padding: 0 12px; font-size: 13px;
          font-weight: 700; color: rgb(15 23 42);
          transition: border-color 0.15s;
        }
        .filter-select:focus { outline: none; border-color: rgb(16 185 129); }
        .dark .filter-select {
          background: rgb(15 23 42); border-color: rgb(51 65 85); color: white;
        }

        @media print {
          @page { size: A4 landscape; margin: 10mm 6mm; }
          html, body {
            background: white !important; color: #0f172a !important;
            print-color-adjust: exact !important;
            -webkit-print-color-adjust: exact !important;
          }
          .dark body, .dark {
            background: white !important; color: #0f172a !important;
          }
          .print\\:hidden { display: none !important; }
          .print\\:block { display: block !important; }
          .print\\:border-0 { border: 0 !important; }
          .print\\:rounded-none { border-radius: 0 !important; }
          .print\\:shadow-none { box-shadow: none !important; }
          section, div { box-shadow: none !important; }
          table {
            font-size: 9px !important;
            border-collapse: collapse !important;
            width: 100% !important;
            page-break-inside: auto !important;
          }
          thead {
            display: table-header-group !important;
          }
          thead tr {
            page-break-inside: avoid !important;
          }
          thead th {
            background: #10b981 !important;
            color: white !important;
            padding: 5px 4px !important;
            font-size: 8px !important;
            font-weight: 800 !important;
            border: 1px solid #047857 !important;
            letter-spacing: 0.5px !important;
          }
          tbody tr {
            page-break-inside: avoid !important;
          }
          tbody td {
            padding: 5px 4px !important;
            border: 1px solid #e2e8f0 !important;
            color: #0f172a !important;
          }
          tbody tr:nth-child(even) td {
            background: #f8fafc !important;
          }
          tbody tr.bg-rose-50\\/40 td, tbody tr[class*="rose-500/5"] td {
            background: #fef2f2 !important;
          }
          tfoot {
            display: table-row-group !important;
          }
          tfoot td {
            background: #1e293b !important;
            color: white !important;
            padding: 6px 4px !important;
            font-weight: 800 !important;
          }
          .bg-emerald-100, [class*="emerald-500/20"] {
            background: #d1fae5 !important; color: #047857 !important;
          }
          .bg-amber-100, [class*="amber-500/20"] {
            background: #fef3c7 !important; color: #b45309 !important;
          }
          .bg-rose-100, [class*="rose-500/20"] {
            background: #ffe4e6 !important; color: #be123c !important;
          }
          .text-emerald-700, [class*="emerald-400"] { color: #047857 !important; }
          .text-amber-700,   [class*="amber-400"]   { color: #b45309 !important; }
          .text-rose-700,    [class*="rose-400"]    { color: #be123c !important; }
          .text-blue-700,    [class*="blue-400"]    { color: #1d4ed8 !important; }
          .text-violet-700,  [class*="violet-400"]  { color: #6d28d9 !important; }
          tbody td img { display: none !important; }
          tbody td .h-10.w-10 { display: none !important; }
          /* Kill all overflow / max-height constraints */
          .overflow-x-auto, .overflow-y-auto, .overflow-hidden, .overflow-auto {
            overflow: visible !important; max-height: none !important; height: auto !important;
          }
          main, aside, header, nav, [class*="max-h-"] {
            max-height: none !important; height: auto !important; overflow: visible !important;
          }
          html, body, #root, #__next {
            height: auto !important; min-height: 0 !important; overflow: visible !important;
          }
          [class*="sidebar"], [class*="topbar"], nav[class*="fixed"] {
            display: none !important;
          }
          [class*="rounded-2xl"], [class*="rounded-3xl"] {
            overflow: visible !important; border-radius: 0 !important;
          }
          .print-header { page-break-after: avoid !important; margin-bottom: 8px !important; }
        }
      `}</style>
    </div>
  );
}

/* ═════════════════════════════════════════════════════════════
   SUB-COMPONENTS
   ═════════════════════════════════════════════════════════════ */

function Card({ children, noPad = false, className = '' }: any) {
  return (
    <div className={[
      'rounded-2xl sm:rounded-3xl bg-white dark:bg-slate-900/80 dark:backdrop-blur-sm',
      'border-2 border-slate-200 dark:border-slate-800 shadow-sm dark:shadow-black/20 overflow-hidden',
      noPad ? '' : 'p-4 sm:p-5',
      className,
    ].join(' ')}>
      {children}
    </div>
  );
}

function CardHeader({ icon: Icon, title, subtitle, tone }: any) {
  const tones: Record<string, string> = {
    sky: 'from-sky-500 to-cyan-600',
    amber: 'from-amber-500 to-orange-600',
    emerald: 'from-emerald-500 to-teal-600',
    violet: 'from-violet-500 to-purple-600',
  };
  return (
    <div className="flex items-center gap-2.5 mb-4">
      <div className={`h-9 w-9 rounded-xl bg-gradient-to-br ${tones[tone] ?? tones.emerald} text-white flex items-center justify-center shadow-md shrink-0`}>
        <Icon className="h-4 w-4" />
      </div>
      <div>
        <h3 className="text-sm sm:text-base font-extrabold text-slate-900 dark:text-white leading-tight">{title}</h3>
        <p className="text-[11px] text-slate-500 dark:text-slate-400 font-bold">{subtitle}</p>
      </div>
    </div>
  );
}

function HeroTile({ icon: Icon, label, value, sub, tone, highlight }: any) {
  const tones: Record<string, string> = {
    blue:    'from-blue-400/40 to-blue-600/25 border-blue-300/50',
    rose:    'from-rose-400/40 to-rose-600/25 border-rose-300/50',
    emerald: 'from-emerald-400/40 to-emerald-600/25 border-emerald-300/50',
    violet:  'from-violet-400/40 to-violet-600/25 border-violet-300/50',
  };
  return (
    <div className={[
      'rounded-2xl bg-gradient-to-br backdrop-blur-md border p-3 shadow-lg',
      tones[tone],
      highlight ? 'ring-2 ring-emerald-300/60' : '',
    ].join(' ')}>
      <div className="flex items-center gap-1.5 mb-1.5">
        <Icon className="h-3.5 w-3.5 text-white/90" />
        <div className="text-[10px] uppercase tracking-widest font-extrabold text-white/95">{label}</div>
      </div>
      <div className="text-lg sm:text-2xl font-extrabold text-white tabular-nums leading-tight truncate drop-shadow-sm">{value}</div>
      <div className="text-[11px] font-bold text-white/85 mt-1 truncate">{sub}</div>
    </div>
  );
}

function FilterField({ label, children }: any) {
  return (
    <div>
      <label className="block text-xs font-extrabold text-slate-600 dark:text-slate-400 mb-1">{label}</label>
      {children}
    </div>
  );
}

function TopProductCard({ product, rank, variant, hideCost }: { product: ProductProfit; rank: number; variant: 'profit' | 'margin'; hideCost: boolean }) {
  const rankGrads = [
    'from-amber-400 via-yellow-500 to-amber-600',
    'from-slate-300 via-slate-400 to-slate-500',
    'from-orange-400 via-orange-500 to-orange-700',
    'from-violet-400 to-violet-600',
    'from-blue-400 to-blue-600',
  ];

  return (
    <div className="rounded-xl bg-slate-50 dark:bg-slate-800/60 hover:bg-slate-100 dark:hover:bg-slate-800 transition p-3 flex items-center gap-3">
      <div className={`h-8 w-8 rounded-lg bg-gradient-to-br ${rankGrads[rank - 1]} text-white font-extrabold flex items-center justify-center text-sm shrink-0 shadow-md`}>
        {rank}
      </div>
      <div className="h-10 w-10 rounded-lg bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-700 overflow-hidden flex items-center justify-center shrink-0">
        {product.primaryImage ? (
          <img src={product.primaryImage} alt="" className="h-full w-full object-cover" />
        ) : (
          <Package className="h-4 w-4 text-slate-400" />
        )}
      </div>
      <div className="min-w-0 flex-1">
        <div className="font-extrabold text-slate-900 dark:text-white text-sm truncate">{product.name}</div>
        <div className="text-[11px] text-slate-500 dark:text-slate-400 font-bold">
          {product.quantitySold} {product.unit} • {product.ordersCount} orders
        </div>
      </div>
      <div className="text-right shrink-0">
        {variant === 'profit' ? (
          <>
            <div className="font-extrabold text-emerald-700 dark:text-emerald-400 text-sm tabular-nums">
              {hideCost ? '••••' : formatPKR(product.profit)}
            </div>
            <div className="text-[10px] text-emerald-600 dark:text-emerald-400 font-bold">{product.margin.toFixed(1)}%</div>
          </>
        ) : (
          <>
            <div className="font-extrabold text-violet-700 dark:text-violet-400 text-base tabular-nums">
              {product.margin.toFixed(1)}%
            </div>
            <div className="text-[10px] text-violet-600 dark:text-violet-400 font-bold">
              {hideCost ? '••••' : formatPKR(product.profit)}
            </div>
          </>
        )}
      </div>
    </div>
  );
}

function ExpandedProfitDetail({ product: p, hideCost }: { product: ProductProfit; hideCost: boolean }) {
  return (
    <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
      <DetailBox label="Orders" value={String(p.ordersCount)} />
      <DetailBox label="Avg Sell Price" value={formatPKR(p.avgSellPrice)} tone="blue" />
      {!hideCost && <DetailBox label="Avg Cost Price" value={formatPKR(p.avgCostPrice)} tone="rose" />}
      <DetailBox label="Returns" value={`${p.returnedQty.toFixed(0)} ${p.unit}`} tone={p.returnedQty > 0 ? 'rose' : 'slate'} />
      {p.returnedAmount > 0 && <DetailBox label="Return Amount" value={formatPKR(p.returnedAmount)} tone="rose" />}
      <DetailBox label="SKU" value={p.sku || '—'} mono />
      {p.variantCount > 0 && <DetailBox label="Variants" value={`${p.variantCount} variants`} tone="violet" />}
      <div className="col-span-2 sm:col-span-1 flex items-end">
        <Link to={`/retail-products/${p.productId}`} className="w-full text-center rounded-xl bg-emerald-600 hover:bg-emerald-700 text-white text-xs font-extrabold py-2 px-3 transition shadow-sm">
          View Product →
        </Link>
      </div>
    </div>
  );
}

function DetailBox({ label, value, tone = 'slate', mono }: any) {
  const tones: Record<string, string> = {
    slate: 'text-slate-900 dark:text-white',
    emerald: 'text-emerald-700 dark:text-emerald-400',
    blue: 'text-blue-700 dark:text-blue-400',
    amber: 'text-amber-700 dark:text-amber-400',
    rose: 'text-rose-700 dark:text-rose-400',
    violet: 'text-violet-700 dark:text-violet-400',
  };
  return (
    <div className="rounded-xl bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-700 p-2.5">
      <div className="text-[9px] uppercase font-extrabold text-slate-500 dark:text-slate-400 tracking-wider">{label}</div>
      <div className={`text-sm font-extrabold mt-0.5 truncate ${tones[tone]} ${mono ? 'font-mono' : ''}`}>{value}</div>
    </div>
  );
}

function EmptyList({ message }: { message: string }) {
  return (
    <div className="text-center py-8 text-sm font-bold text-slate-400 dark:text-slate-600">{message}</div>
  );
}
