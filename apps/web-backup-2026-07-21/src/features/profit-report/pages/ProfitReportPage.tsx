import { useState, useMemo } from 'react';
import { useQuery } from '@tanstack/react-query';
import {
  TrendingUp, TrendingDown, BarChart3, Award, Package, Calendar,
  Sliders, X, Download, Search, AlertTriangle, Layers, Smartphone,
  DollarSign, Percent, ShoppingBag, RefreshCw, ArrowUpRight, ArrowDownRight,
  Star, Crown, AlertCircle, Filter, RotateCcw,
} from 'lucide-react';
import {
  ResponsiveContainer, BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip,
  PieChart, Pie, Cell, Legend,
} from 'recharts';
import {
  profitReportApi,
  type ProfitFilters,
  type ProfitPeriod,
  type ProfitSortBy,
  type ProductProfit,
} from '@/api/profit-report.api';
import { categoriesApi } from '@/api/categories.api';
import { brandsApi } from '@/api/brands.api';
import { formatPKR, formatPKRFull } from '@/lib/format';
import { Button } from '@/components/ui/Button';

const PERIOD_OPTIONS: Array<{ value: ProfitPeriod; label: string; emoji: string }> = [
  { value: 'today', label: 'Today', emoji: '📅' },
  { value: 'week', label: 'Last 7 Days', emoji: '📆' },
  { value: 'month', label: 'Last 30 Days', emoji: '🗓️' },
  { value: 'quarter', label: 'Last 3 Months', emoji: '📊' },
  { value: 'year', label: 'Last Year', emoji: '📈' },
  { value: 'all', label: 'All Time', emoji: '♾️' },
];

const SORT_OPTIONS: Array<{ value: ProfitSortBy; label: string }> = [
  { value: 'profit', label: 'Highest Profit' },
  { value: 'margin', label: 'Best Margin %' },
  { value: 'revenue', label: 'Most Revenue' },
  { value: 'quantity', label: 'Most Sold' },
];

const PIE_COLORS = ['#10b981', '#3b82f6', '#8b5cf6', '#f59e0b', '#ec4899', '#06b6d4', '#84cc16', '#f43f5e'];

export default function ProfitReportPage() {
  const [filters, setFilters] = useState<ProfitFilters>({ period: 'month', sortBy: 'profit' });
  const [search, setSearch] = useState('');
  const [showFilters, setShowFilters] = useState(false);

  const { data: summary, isLoading: summaryLoading, refetch: refetchSummary } = useQuery({
    queryKey: ['profit-summary', filters],
    queryFn: () => profitReportApi.summary(filters),
  });

  const { data: products = [], isLoading: productsLoading, refetch: refetchProducts } = useQuery({
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

  // ─── Export CSV ─────────────────────────────────────
  const exportCSV = () => {
    if (filteredProducts.length === 0) return;
    const headers = [
      'Product', 'SKU', 'Category', 'Brand', 'Industry', 'Unit',
      'Qty Sold', 'Orders', 'Revenue', 'Cost', 'Profit', 'Margin %',
      'Avg Sell Price', 'Avg Cost Price', 'Returns Qty', 'Returns Amount',
    ];
    const rows = filteredProducts.map((p) => [
      p.name, p.sku || '', p.categoryName || '', p.brandName || '',
      p.industryType, p.unit,
      p.quantitySold.toFixed(2), p.ordersCount,
      p.revenue.toFixed(2), p.cost.toFixed(2),
      p.profit.toFixed(2), p.margin.toFixed(2),
      p.avgSellPrice.toFixed(2), p.avgCostPrice.toFixed(2),
      p.returnedQty.toFixed(2), p.returnedAmount.toFixed(2),
    ]);
    const csv = [headers, ...rows].map((r) => r.map((c) => `"${String(c).replace(/"/g, '""')}"`).join(',')).join('\n');
    const blob = new Blob(['\ufeff' + csv], { type: 'text/csv;charset=utf-8' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = `profit-report-${new Date().toISOString().slice(0, 10)}.csv`;
    a.click();
    URL.revokeObjectURL(url);
  };

  return (
    <div className="space-y-6">
      {/* ───── HEADER ───── */}
      <section className="rounded-3xl bg-gradient-to-br from-slate-950 via-emerald-900 to-emerald-700 text-white p-6 shadow-2xl print:hidden">
        <div className="flex items-center justify-between flex-wrap gap-4">
          <div>
            <div className="inline-flex items-center gap-2 rounded-full bg-white/10 px-3 py-1 text-xs font-semibold backdrop-blur">
              <BarChart3 className="h-3.5 w-3.5 text-amber-300" />
              Profit Intelligence
            </div>
            <h1 className="mt-3 text-3xl font-extrabold">Profit by Product</h1>
            <p className="mt-2 text-sm text-white/80">
              Kis product se kitna kamayi ho rahi hai — full breakdown with industry-aware analytics
            </p>
          </div>
          <div className="flex gap-2 flex-wrap">
            <Button
              variant="secondary"
              onClick={refreshAll}
              className="bg-white/15 text-white hover:bg-white/25 border-white/20"
            >
              <RefreshCw className="h-4 w-4" /> Refresh
            </Button>
            <Button
              variant="secondary"
              onClick={exportCSV}
              disabled={filteredProducts.length === 0}
              className="bg-white/15 text-white hover:bg-white/25 border-white/20"
            >
              <Download className="h-4 w-4" /> Export CSV
            </Button>
          </div>
        </div>

        {/* Period quick switcher */}
        <div className="mt-5 flex gap-2 flex-wrap">
          {PERIOD_OPTIONS.map((opt) => (
            <button
              key={opt.value}
              onClick={() => setFilters({ ...filters, period: opt.value })}
              className={`px-3 py-1.5 rounded-xl text-xs font-bold transition ${
                filters.period === opt.value
                  ? 'bg-white text-slate-900 shadow-md'
                  : 'bg-white/10 text-white hover:bg-white/20'
              }`}
            >
              <span className="mr-1">{opt.emoji}</span>
              {opt.label}
            </button>
          ))}
        </div>
      </section>

      {/* ───── STATS CARDS ───── */}
      {summary && (
        <section className="grid sm:grid-cols-2 lg:grid-cols-4 gap-4">
          <StatCard
            label="Total Revenue"
            value={formatPKRFull(summary.totalRevenue)}
            sub={`${summary.totalOrders} orders`}
            color="blue"
            icon={DollarSign}
          />
          <StatCard
            label="Total Cost"
            value={formatPKRFull(summary.totalCost)}
            sub="Cost of goods"
            color="rose"
            icon={ShoppingBag}
          />
          <StatCard
            label="Gross Profit"
            value={formatPKRFull(summary.totalProfit)}
            sub={`${summary.overallMargin.toFixed(1)}% margin`}
            color="emerald"
            icon={TrendingUp}
            isHighlighted
          />
          <StatCard
            label="Products Sold"
            value={String(summary.productsCount)}
            sub={`${summary.totalQtySold.toFixed(0)} units total`}
            color="violet"
            icon={Package}
          />
        </section>
      )}

      {/* ───── SEARCH + FILTERS ───── */}
      <section className="space-y-3">
        <div className="flex gap-2 flex-wrap">
          <div className="flex-1 relative min-w-[260px]">
            <Search className="h-4 w-4 text-slate-400 absolute left-3 top-1/2 -translate-y-1/2" />
            <input
              className="h-11 w-full rounded-xl border border-slate-200 bg-white pl-10 pr-10 text-sm focus:outline-none focus:ring-2 focus:ring-emerald-500/30"
              placeholder="Search by name, SKU, category, brand..."
              value={search}
              onChange={(e) => setSearch(e.target.value)}
            />
            {search && (
              <button onClick={() => setSearch('')} className="absolute right-3 top-1/2 -translate-y-1/2">
                <X className="h-4 w-4 text-slate-400" />
              </button>
            )}
          </div>

          <select
            className="h-11 px-3 rounded-xl border border-slate-200 bg-white text-sm font-bold focus:outline-none"
            value={filters.sortBy || 'profit'}
            onChange={(e) => setFilters({ ...filters, sortBy: e.target.value as ProfitSortBy })}
          >
            {SORT_OPTIONS.map((opt) => (
              <option key={opt.value} value={opt.value}>
                Sort: {opt.label}
              </option>
            ))}
          </select>

          <button
            onClick={() => setShowFilters((v) => !v)}
            className={`h-11 px-4 rounded-xl border-2 font-bold text-sm inline-flex items-center gap-2 transition ${
              showFilters || hasActiveFilters
                ? 'border-emerald-500 bg-emerald-50 text-emerald-700'
                : 'border-slate-200 bg-white text-slate-700 hover:border-emerald-300'
            }`}
          >
            <Sliders className="h-4 w-4" /> Filters
            {hasActiveFilters && (
              <span className="h-5 w-5 rounded-full bg-emerald-600 text-white text-[10px] font-bold flex items-center justify-center">
                !
              </span>
            )}
          </button>
        </div>

        {showFilters && (
          <div className="rounded-2xl bg-white border border-slate-200 p-4 space-y-3">
            <div className="grid sm:grid-cols-3 gap-3">
              <div>
                <label className="block text-xs font-bold text-slate-600 mb-1">Category</label>
                <select
                  className="h-10 w-full rounded-lg border border-slate-200 bg-white px-3 text-sm"
                  value={filters.categoryId ?? ''}
                  onChange={(e) =>
                    setFilters({ ...filters, categoryId: e.target.value || undefined })
                  }
                >
                  <option value="">All categories</option>
                  {categories.map((c: any) => (
                    <option key={c.id} value={c.id}>{c.name}</option>
                  ))}
                </select>
              </div>
              <div>
                <label className="block text-xs font-bold text-slate-600 mb-1">Brand</label>
                <select
                  className="h-10 w-full rounded-lg border border-slate-200 bg-white px-3 text-sm"
                  value={filters.brandId ?? ''}
                  onChange={(e) =>
                    setFilters({ ...filters, brandId: e.target.value || undefined })
                  }
                >
                  <option value="">All brands</option>
                  {brands.map((b) => (
                    <option key={b.id} value={b.id}>{b.name}</option>
                  ))}
                </select>
              </div>
              <div>
                <label className="block text-xs font-bold text-slate-600 mb-1">Custom Date Range</label>
                <div className="flex gap-1">
                  <input
                    type="date"
                    className="h-10 flex-1 rounded-lg border border-slate-200 bg-white px-2 text-xs"
                    value={filters.startDate || ''}
                    onChange={(e) => setFilters({ ...filters, startDate: e.target.value || undefined })}
                  />
                  <input
                    type="date"
                    className="h-10 flex-1 rounded-lg border border-slate-200 bg-white px-2 text-xs"
                    value={filters.endDate || ''}
                    onChange={(e) => setFilters({ ...filters, endDate: e.target.value || undefined })}
                  />
                </div>
              </div>
            </div>
            {hasActiveFilters && (
              <button
                onClick={clearFilters}
                className="text-xs font-bold text-rose-600 hover:underline inline-flex items-center gap-1"
              >
                <RotateCcw className="h-3 w-3" /> Clear all filters
              </button>
            )}
          </div>
        )}
      </section>

      {/* ───── INDUSTRY BREAKDOWN ───── */}
      {summary && (summary.carpetCount > 0 || summary.mobileCount > 0) && (
        <section className="grid sm:grid-cols-3 gap-3">
          <IndustryCard
            label="Standard Products"
            value={summary.standardCount}
            icon={Package}
            color="slate"
          />
          {summary.carpetCount > 0 && (
            <IndustryCard
              label="Carpet Products"
              value={summary.carpetCount}
              icon={Layers}
              color="emerald"
            />
          )}
          {summary.mobileCount > 0 && (
            <IndustryCard
              label="Mobile Products"
              value={summary.mobileCount}
              icon={Smartphone}
              color="blue"
            />
          )}
        </section>
      )}

      {/* ───── TOP PERFORMERS + LOSSES ───── */}
      {summary && (
        <section className="grid lg:grid-cols-2 gap-4">
          {/* Top Performers */}
          <div className="rounded-3xl bg-white border-2 border-emerald-200 shadow-sm overflow-hidden">
            <div className="px-5 py-4 bg-gradient-to-r from-emerald-50 to-green-50 border-b-2 border-emerald-200 flex items-center justify-between">
              <div className="flex items-center gap-2">
                <Crown className="h-5 w-5 text-amber-500" />
                <h3 className="font-extrabold text-emerald-900">Top 5 Profitable</h3>
              </div>
              <span className="text-[10px] font-bold uppercase text-emerald-700 bg-emerald-100 px-2 py-1 rounded-full">
                Best Performers
              </span>
            </div>
            <div className="p-3 space-y-2">
              {summary.topProfitable.slice(0, 5).map((p, idx) => (
                <TopProductCard key={p.productId} product={p} rank={idx + 1} variant="profit" />
              ))}
              {summary.topProfitable.length === 0 && (
                <div className="text-center py-8 text-sm text-slate-500">No data yet</div>
              )}
            </div>
          </div>

          {/* Highest Margin */}
          <div className="rounded-3xl bg-white border-2 border-violet-200 shadow-sm overflow-hidden">
            <div className="px-5 py-4 bg-gradient-to-r from-violet-50 to-purple-50 border-b-2 border-violet-200 flex items-center justify-between">
              <div className="flex items-center gap-2">
                <Percent className="h-5 w-5 text-violet-600" />
                <h3 className="font-extrabold text-violet-900">Highest Margin %</h3>
              </div>
              <span className="text-[10px] font-bold uppercase text-violet-700 bg-violet-100 px-2 py-1 rounded-full">
                Best Margins
              </span>
            </div>
            <div className="p-3 space-y-2">
              {summary.highestMargin.slice(0, 5).map((p, idx) => (
                <TopProductCard key={p.productId} product={p} rank={idx + 1} variant="margin" />
              ))}
              {summary.highestMargin.length === 0 && (
                <div className="text-center py-8 text-sm text-slate-500">No data yet</div>
              )}
            </div>
          </div>
        </section>
      )}

      {/* ───── LOSSES ALERT ───── */}
      {summary && summary.losses.length > 0 && (
        <section className="rounded-3xl bg-gradient-to-br from-rose-50 to-pink-50 border-2 border-rose-200 p-5">
          <div className="flex items-center gap-2 mb-3">
            <AlertCircle className="h-5 w-5 text-rose-600" />
            <h3 className="font-extrabold text-rose-900">
              ⚠️ Products with Losses ({summary.losses.length})
            </h3>
          </div>
          <p className="text-xs text-rose-700 mb-3">
            Ye products lagat se kam mein bik rahe hain — review karein
          </p>
          <div className="grid sm:grid-cols-2 gap-2">
            {summary.losses.slice(0, 6).map((p) => (
              <div
                key={p.productId}
                className="rounded-xl bg-white border border-rose-200 p-3 flex items-center gap-3"
              >
                <div className="h-10 w-10 rounded-lg bg-rose-100 flex items-center justify-center shrink-0">
                  <TrendingDown className="h-4 w-4 text-rose-600" />
                </div>
                <div className="min-w-0 flex-1">
                  <div className="font-bold text-slate-900 text-sm truncate">{p.name}</div>
                  <div className="text-[11px] text-slate-500">
                    {p.quantitySold} {p.unit} sold
                  </div>
                </div>
                <div className="text-right shrink-0">
                  <div className="font-extrabold text-rose-700 text-sm tabular-nums">
                    {formatPKR(p.profit)}
                  </div>
                  <div className="text-[10px] text-rose-600 font-bold">
                    {p.margin.toFixed(1)}%
                  </div>
                </div>
              </div>
            ))}
          </div>
        </section>
      )}

      {/* ───── CHARTS ───── */}
      {summary && summary.topProfitable.length > 0 && (
        <section className="grid lg:grid-cols-2 gap-4">
          {/* Bar Chart — Top 10 */}
          <div className="rounded-3xl bg-white border border-slate-200 shadow-sm p-6">
            <div className="flex items-center justify-between mb-4">
              <div>
                <h3 className="text-lg font-bold text-slate-900">Top 10 by Profit</h3>
                <p className="text-xs text-slate-500">Revenue vs Profit comparison</p>
              </div>
              <Award className="h-5 w-5 text-amber-500" />
            </div>
            <div className="h-[320px]">
              <ResponsiveContainer width="100%" height="100%">
                <BarChart
                  data={summary.topProfitable.slice(0, 10).map((p) => ({
                    name: p.name.length > 12 ? p.name.slice(0, 12) + '…' : p.name,
                    profit: p.profit,
                    revenue: p.revenue,
                  }))}
                  layout="vertical"
                  margin={{ left: 0, right: 16, top: 8, bottom: 8 }}
                >
                  <CartesianGrid strokeDasharray="3 3" stroke="#e2e8f0" />
                  <XAxis
                    type="number"
                    stroke="#64748b"
                    fontSize={10}
                    tickFormatter={(v) => `${(v / 1000).toFixed(0)}k`}
                  />
                  <YAxis type="category" dataKey="name" stroke="#64748b" fontSize={10} width={90} />
                  <Tooltip
                    formatter={(value: any) => formatPKR(Number(value))}
                    contentStyle={{ borderRadius: 12, border: '2px solid #e2e8f0', fontSize: 12 }}
                  />
                  <Legend wrapperStyle={{ fontSize: 11 }} />
                  <Bar dataKey="revenue" fill="#94a3b8" radius={[0, 4, 4, 0]} name="Revenue" />
                  <Bar dataKey="profit" fill="#10b981" radius={[0, 4, 4, 0]} name="Profit" />
                </BarChart>
              </ResponsiveContainer>
            </div>
          </div>

          {/* Pie Chart — Category Distribution */}
          <div className="rounded-3xl bg-white border border-slate-200 shadow-sm p-6">
            <div className="flex items-center justify-between mb-4">
              <div>
                <h3 className="text-lg font-bold text-slate-900">Profit by Category</h3>
                <p className="text-xs text-slate-500">Top categories breakdown</p>
              </div>
              <BarChart3 className="h-5 w-5 text-blue-500" />
            </div>
            <div className="h-[320px]">
              {summary.categoryBreakdown.length > 0 ? (
                <ResponsiveContainer width="100%" height="100%">
                  <PieChart>
                    <Pie
                      data={summary.categoryBreakdown.slice(0, 8).map((c) => ({
                        name: c.name,
                        value: Math.max(c.profit, 0),
                      }))}
                      cx="50%"
                      cy="50%"
                      outerRadius={100}
                      innerRadius={50}
                      fill="#8884d8"
                      dataKey="value"
                      label={(entry: any) => {
                        const pct = ((entry.value / summary.totalProfit) * 100).toFixed(0);
                        return `${pct}%`;
                      }}
                      labelLine={false}
                    >
                      {summary.categoryBreakdown.slice(0, 8).map((_, idx) => (
                        <Cell key={`cell-${idx}`} fill={PIE_COLORS[idx % PIE_COLORS.length]} />
                      ))}
                    </Pie>
                    <Tooltip
                      formatter={(value: any) => formatPKR(Number(value))}
                      contentStyle={{ borderRadius: 12, border: '2px solid #e2e8f0' }}
                    />
                    <Legend
                      verticalAlign="bottom"
                      iconType="circle"
                      wrapperStyle={{ fontSize: 10, paddingTop: 12 }}
                    />
                  </PieChart>
                </ResponsiveContainer>
              ) : (
                <div className="h-full flex items-center justify-center text-sm text-slate-500">
                  No category data
                </div>
              )}
            </div>
          </div>
        </section>
      )}

      {/* ───── DETAILED TABLE ───── */}
      <section className="rounded-3xl bg-white border border-slate-200 shadow-sm overflow-hidden">
        <div className="px-6 py-5 border-b border-slate-100 flex items-center justify-between flex-wrap gap-2">
          <div>
            <h3 className="text-xl font-bold text-slate-900">Detailed Product Profit</h3>
            <p className="text-sm text-slate-500">
              {filteredProducts.length} products
              {hasActiveFilters && ' (filtered)'}
            </p>
          </div>
        </div>

        {productsLoading ? (
          <div className="p-6 space-y-2">
            {Array.from({ length: 5 }).map((_, i) => (
              <div key={i} className="h-20 rounded-xl bg-slate-100 animate-pulse" />
            ))}
          </div>
        ) : filteredProducts.length === 0 ? (
          <div className="p-12 text-center">
            <Package className="h-16 w-16 text-slate-300 mx-auto" />
            <h4 className="mt-4 text-lg font-bold text-slate-900">No sales data yet</h4>
            <p className="text-sm text-slate-500 mt-1">
              {search ? 'Try different search' : 'Make some sales to see profit analysis'}
            </p>
          </div>
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full text-sm">
              <thead className="bg-slate-50 text-slate-700 border-b-2 border-slate-200">
                <tr>
                  <th className="text-center px-3 py-3 font-bold text-[10px] uppercase tracking-wider w-12">#</th>
                  <th className="text-left px-3 py-3 font-bold text-[10px] uppercase tracking-wider">Product</th>
                  <th className="text-left px-3 py-3 font-bold text-[10px] uppercase tracking-wider">Cat / Brand</th>
                  <th className="text-center px-3 py-3 font-bold text-[10px] uppercase tracking-wider">Industry</th>
                  <th className="text-right px-3 py-3 font-bold text-[10px] uppercase tracking-wider">Sold</th>
                  <th className="text-right px-3 py-3 font-bold text-[10px] uppercase tracking-wider">Avg Price</th>
                  <th className="text-right px-3 py-3 font-bold text-[10px] uppercase tracking-wider">Revenue</th>
                  <th className="text-right px-3 py-3 font-bold text-[10px] uppercase tracking-wider">Cost</th>
                  <th className="text-right px-3 py-3 font-bold text-[10px] uppercase tracking-wider">Profit</th>
                  <th className="text-center px-3 py-3 font-bold text-[10px] uppercase tracking-wider">Margin</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-100">
                {filteredProducts.map((p, idx) => (
                  <ProfitTableRow key={p.productId} product={p} rank={idx + 1} />
                ))}
              </tbody>
              <tfoot className="bg-slate-100 border-t-2 border-slate-300 font-extrabold">
                <tr>
                  <td colSpan={6} className="px-3 py-3 text-right text-xs uppercase text-slate-700">
                    Totals ({filteredProducts.length}):
                  </td>
                  <td className="px-3 py-3 text-right text-blue-700 tabular-nums">
                    {formatPKR(filteredProducts.reduce((s, p) => s + p.revenue, 0))}
                  </td>
                  <td className="px-3 py-3 text-right text-rose-700 tabular-nums">
                    {formatPKR(filteredProducts.reduce((s, p) => s + p.cost, 0))}
                  </td>
                  <td className="px-3 py-3 text-right text-emerald-700 tabular-nums">
                    {formatPKR(filteredProducts.reduce((s, p) => s + p.profit, 0))}
                  </td>
                  <td></td>
                </tr>
              </tfoot>
            </table>
          </div>
        )}
      </section>
    </div>
  );
}

// ─── Helper Components ──────────────────────────────────────

function StatCard({
  label, value, sub, color, icon: Icon, isHighlighted,
}: { label: string; value: string; sub: string; color: string; icon: any; isHighlighted?: boolean }) {
  const colors: Record<string, string> = {
    blue: 'from-blue-500 to-blue-700 shadow-blue-500/30',
    rose: 'from-rose-500 to-rose-700 shadow-rose-500/30',
    emerald: 'from-emerald-500 to-emerald-700 shadow-emerald-500/30',
    violet: 'from-violet-500 to-violet-700 shadow-violet-500/30',
  };

  return (
    <div
      className={`rounded-2xl border-2 p-5 shadow-sm hover:shadow-md transition ${
        isHighlighted
          ? 'bg-gradient-to-br from-emerald-50 to-green-50 border-emerald-300'
          : 'bg-white border-slate-200'
      }`}
    >
      <div className="flex items-center justify-between">
        <div className="min-w-0">
          <div className="text-xs uppercase tracking-wider text-slate-500 font-bold">{label}</div>
          <div className="mt-2 text-2xl font-extrabold text-slate-900 truncate">{value}</div>
          <div className="text-xs text-slate-600 font-semibold mt-1">{sub}</div>
        </div>
        <div
          className={`h-12 w-12 rounded-2xl bg-gradient-to-br ${colors[color]} text-white flex items-center justify-center shadow-lg shrink-0`}
        >
          <Icon className="h-6 w-6" />
        </div>
      </div>
    </div>
  );
}

function IndustryCard({
  label, value, icon: Icon, color,
}: { label: string; value: number; icon: any; color: string }) {
  const colors: Record<string, string> = {
    slate: 'bg-slate-50 border-slate-300 text-slate-900',
    emerald: 'bg-emerald-50 border-emerald-300 text-emerald-900',
    blue: 'bg-blue-50 border-blue-300 text-blue-900',
  };
  return (
    <div className={`rounded-2xl border-2 p-4 ${colors[color]} flex items-center gap-3`}>
      <div className="h-10 w-10 rounded-xl bg-white flex items-center justify-center">
        <Icon className="h-5 w-5" />
      </div>
      <div>
        <div className="text-xs uppercase tracking-wider font-bold opacity-70">{label}</div>
        <div className="text-2xl font-extrabold">{value}</div>
      </div>
    </div>
  );
}

function TopProductCard({
  product, rank, variant,
}: { product: ProductProfit; rank: number; variant: 'profit' | 'margin' }) {
  const rankColors = ['bg-amber-500', 'bg-slate-400', 'bg-orange-600', 'bg-slate-300', 'bg-slate-300'];

  return (
    <div className="rounded-xl bg-slate-50 hover:bg-slate-100 transition p-3 flex items-center gap-3">
      <div
        className={`h-8 w-8 rounded-lg ${rankColors[rank - 1] || 'bg-slate-300'} text-white font-extrabold flex items-center justify-center text-sm shrink-0`}
      >
        {rank}
      </div>
      <div className="h-10 w-10 rounded-lg bg-white border border-slate-200 overflow-hidden flex items-center justify-center shrink-0">
        {product.primaryImage ? (
          <img src={product.primaryImage} alt="" className="h-full w-full object-cover" />
        ) : (
          <Package className="h-4 w-4 text-slate-400" />
        )}
      </div>
      <div className="min-w-0 flex-1">
        <div className="font-bold text-slate-900 text-sm truncate">{product.name}</div>
        <div className="text-[11px] text-slate-500">
          {product.quantitySold} {product.unit} • {product.ordersCount} orders
        </div>
      </div>
      <div className="text-right shrink-0">
        {variant === 'profit' ? (
          <>
            <div className="font-extrabold text-emerald-700 text-sm tabular-nums">
              {formatPKR(product.profit)}
            </div>
            <div className="text-[10px] text-emerald-600 font-bold">{product.margin.toFixed(1)}%</div>
          </>
        ) : (
          <>
            <div className="font-extrabold text-violet-700 text-base tabular-nums">
              {product.margin.toFixed(1)}%
            </div>
            <div className="text-[10px] text-violet-600 font-bold">{formatPKR(product.profit)}</div>
          </>
        )}
      </div>
    </div>
  );
}

function ProfitTableRow({ product: p, rank }: { product: ProductProfit; rank: number }) {
  const isProfit = p.profit > 0;
  const isHighMargin = p.margin >= 30;
  const isMediumMargin = p.margin >= 15 && p.margin < 30;
  const isLowMargin = p.margin >= 0 && p.margin < 15;
  const isLoss = p.profit < 0;

  return (
    <tr
      className={`hover:bg-slate-50 transition ${
        isLoss ? 'bg-rose-50/40' : ''
      }`}
    >
      <td className="px-3 py-3 text-center">
        <span
          className={`inline-flex items-center justify-center h-6 w-6 rounded-md text-[10px] font-extrabold ${
            rank <= 3 ? 'bg-amber-100 text-amber-700' : 'bg-slate-100 text-slate-600'
          }`}
        >
          {rank}
        </span>
      </td>
      <td className="px-3 py-3">
        <div className="flex items-center gap-2.5">
          <div className="h-10 w-10 rounded-lg bg-slate-100 overflow-hidden flex items-center justify-center shrink-0">
            {p.primaryImage ? (
              <img src={p.primaryImage} alt="" className="h-full w-full object-cover" />
            ) : (
              <Package className="h-4 w-4 text-slate-400" />
            )}
          </div>
          <div className="min-w-0">
            <div className="font-bold text-slate-900 text-sm line-clamp-1">{p.name}</div>
            <div className="flex items-center gap-1.5 mt-0.5 text-[10px]">
              {p.sku && <span className="font-mono text-slate-500">{p.sku}</span>}
              {p.variantCount > 0 && (
                <span className="px-1.5 py-0.5 rounded bg-violet-100 text-violet-700 font-bold">
                  {p.variantCount}V
                </span>
              )}
            </div>
          </div>
        </div>
      </td>
      <td className="px-3 py-3 text-xs">
        {p.categoryName && (
          <div className="font-bold text-slate-700 flex items-center gap-1">
            {p.categoryColor && (
              <span
                className="inline-block h-2 w-2 rounded-full"
                style={{ backgroundColor: p.categoryColor }}
              />
            )}
            {p.categoryName}
          </div>
        )}
        {p.brandName && (
          <div className="text-[10px] font-bold text-violet-700 mt-0.5">{p.brandName}</div>
        )}
      </td>
      <td className="px-3 py-3 text-center">
        {p.industryType === 'CARPET' ? (
          <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded-full bg-emerald-100 text-emerald-700 text-[9px] font-extrabold">
            <Layers className="h-2.5 w-2.5" /> CARPET
          </span>
        ) : p.industryType === 'MOBILE' ? (
          <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded-full bg-blue-100 text-blue-700 text-[9px] font-extrabold">
            <Smartphone className="h-2.5 w-2.5" /> MOBILE
          </span>
        ) : p.industryType === 'WEIGHT_BASED' ? (
          <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded-full bg-amber-100 text-amber-700 text-[9px] font-extrabold">
            WEIGHT
          </span>
        ) : (
          <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded-full bg-slate-100 text-slate-700 text-[9px] font-extrabold">
            <Package className="h-2.5 w-2.5" /> STANDARD
          </span>
        )}
      </td>
      <td className="px-3 py-3 text-right">
        <div className="font-extrabold text-slate-900 tabular-nums">
          {p.quantitySold.toFixed(p.quantitySold % 1 === 0 ? 0 : 2)}
        </div>
        <div className="text-[10px] text-slate-500 font-bold uppercase">{p.unit}</div>
      </td>
      <td className="px-3 py-3 text-right text-xs font-bold text-slate-700 tabular-nums">
        {formatPKR(p.avgSellPrice)}
      </td>
      <td className="px-3 py-3 text-right text-xs font-bold text-blue-700 tabular-nums">
        {formatPKR(p.revenue)}
      </td>
      <td className="px-3 py-3 text-right text-xs font-bold text-rose-700 tabular-nums">
        {formatPKR(p.cost)}
      </td>
      <td className="px-3 py-3 text-right">
        <div className={`inline-flex items-center gap-1 font-extrabold tabular-nums ${
          isProfit ? 'text-emerald-700' : 'text-rose-700'
        }`}>
          {isProfit ? <ArrowUpRight className="h-3 w-3" /> : <ArrowDownRight className="h-3 w-3" />}
          {formatPKR(p.profit)}
        </div>
      </td>
      <td className="px-3 py-3 text-center">
        <span
          className={`inline-flex items-center gap-1 px-2 py-0.5 rounded-full text-[10px] font-extrabold ${
            isHighMargin
              ? 'bg-emerald-100 text-emerald-700'
              : isMediumMargin
                ? 'bg-amber-100 text-amber-700'
                : isLowMargin
                  ? 'bg-slate-100 text-slate-700'
                  : 'bg-rose-100 text-rose-700'
          }`}
        >
          {isHighMargin && <Star className="h-2.5 w-2.5" />}
          {p.margin.toFixed(1)}%
        </span>
      </td>
    </tr>
  );
}
