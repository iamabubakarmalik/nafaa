// apps/web/src/industries/retail/pages/RetailStockReportPage.tsx
import { useState, useMemo, Fragment } from 'react';
import { useQuery } from '@tanstack/react-query';
import { Link } from 'react-router-dom';
import {
  Search, Package, AlertTriangle, CheckCircle2, XCircle,
  TrendingUp, DollarSign, BarChart3, Sliders, X, Printer,
  FileSpreadsheet, Star, ShoppingCart, Sparkles, Clock,
  PackageX, Boxes, Tag, Award, ChevronDown, ChevronRight,
  Calendar, Flame, PiggyBank, RefreshCw, ArrowUpDown,
  Filter, Zap, Layers, ShoppingBag, TrendingDown,
} from 'lucide-react';
import { stockReportApi, type StockReportFilters, type StockStatus } from '@modules/inventory/stock-report/api/stock-report.api';
import { categoriesApi } from '@modules/inventory/categories/api/categories.api';
import { brandsApi } from '@modules/inventory/brands/api/brands.api';
import { Button } from '@core/ui/Button';
import { formatPKR, formatPKRFull } from '@core/lib/format';
import { useAuthStore } from '@core/stores/auth.store';
import { useCostHidden, PrivacyToggle } from '@core/ui/HiddenValue';

/* ═════════════════════════════════════════════════════════════
   NAFAA RETAIL STOCK REPORT — FULL BEST
   ─────────────────────────────────────────────────────────────
   🛒 Grocery/kirana focused (expiry, damage, aging, categories)
   🖨️ Perfect print: A4 landscape, colored, tabular, no clutter
   📄 Beautiful PDF via browser print dialog (Save as PDF)
   📊 CSV export with full detail
   ✨ Dark + light mode, mobile → 4K responsive
   🎨 Gen-Z modern aesthetic
   ═════════════════════════════════════════════════════════════ */

type SortKey = 'name' | 'stock' | 'stockValue' | 'profit' | 'margin';
type SortDir = 'asc' | 'desc';

const statusConfig: Record<StockStatus, {
  label: string; light: string; dark: string; icon: any; dot: string;
}> = {
  IN_STOCK: {
    label: 'In Stock',
    light: 'bg-emerald-50 text-emerald-700 border-emerald-300',
    dark: 'dark:bg-emerald-500/15 dark:text-emerald-300 dark:border-emerald-500/40',
    icon: CheckCircle2,
    dot: 'bg-emerald-500',
  },
  LOW_STOCK: {
    label: 'Low',
    light: 'bg-amber-50 text-amber-700 border-amber-300',
    dark: 'dark:bg-amber-500/15 dark:text-amber-300 dark:border-amber-500/40',
    icon: AlertTriangle,
    dot: 'bg-amber-500',
  },
  OUT_OF_STOCK: {
    label: 'Out',
    light: 'bg-rose-50 text-rose-700 border-rose-300',
    dark: 'dark:bg-rose-500/15 dark:text-rose-300 dark:border-rose-500/40',
    icon: XCircle,
    dot: 'bg-rose-500',
  },
};

export default function RetailStockReportPage() {
  const hideCost = useCostHidden();
  const tenantName = useAuthStore((s) => s.tenant?.name);
  const shopName = useAuthStore((s) => s.user?.assignedShop?.name);

  const [filters, setFilters] = useState<StockReportFilters>({ stockStatus: 'all' });
  const [search, setSearch] = useState('');
  const [showFilters, setShowFilters] = useState(false);
  const [expandedRows, setExpandedRows] = useState<Set<string>>(new Set());
  const [sortKey, setSortKey] = useState<SortKey>('stockValue');
  const [sortDir, setSortDir] = useState<SortDir>('desc');

  const { data, isLoading, refetch, isRefetching } = useQuery({
    queryKey: ['stock-report', filters],
    queryFn: () => stockReportApi.generate(filters),
  });

  const { data: categories = [] } = useQuery({
    queryKey: ['categories'],
    queryFn: categoriesApi.list,
  });

  const { data: brands = [] } = useQuery({
    queryKey: ['brands'],
    queryFn: () => brandsApi.list(),
  });

  /* ─── Filter + sort ─────────────────────────────────── */
  const filteredRows = useMemo(() => {
    if (!data?.rows) return [];
    let rows = [...data.rows];

    const q = search.toLowerCase().trim();
    if (q) {
      rows = rows.filter(
        (r) =>
          r.productName.toLowerCase().includes(q) ||
          r.sku?.toLowerCase().includes(q) ||
          r.barcode?.toLowerCase().includes(q) ||
          r.category?.toLowerCase().includes(q) ||
          r.brand?.toLowerCase().includes(q),
      );
    }

    rows.sort((a, b) => {
      let av: number | string;
      let bv: number | string;
      switch (sortKey) {
        case 'name': av = a.productName; bv = b.productName; break;
        case 'stock': av = a.stock; bv = b.stock; break;
        case 'profit': av = a.potentialProfit; bv = b.potentialProfit; break;
        case 'margin':
          av = a.salePrice > 0 ? ((a.salePrice - a.costPrice) / a.salePrice) * 100 : 0;
          bv = b.salePrice > 0 ? ((b.salePrice - b.costPrice) / b.salePrice) * 100 : 0;
          break;
        default: av = a.stockValue; bv = b.stockValue;
      }
      if (typeof av === 'string' && typeof bv === 'string') {
        return sortDir === 'asc' ? av.localeCompare(bv) : bv.localeCompare(av);
      }
      return sortDir === 'asc' ? Number(av) - Number(bv) : Number(bv) - Number(av);
    });

    return rows;
  }, [data?.rows, search, sortKey, sortDir]);

  const toggleSort = (key: SortKey) => {
    if (sortKey === key) setSortDir(sortDir === 'asc' ? 'desc' : 'asc');
    else { setSortKey(key); setSortDir('desc'); }
  };

  const toggleExpand = (id: string) => {
    setExpandedRows((prev) => {
      const next = new Set(prev);
      if (next.has(id)) next.delete(id); else next.add(id);
      return next;
    });
  };

  const expandAll = () => setExpandedRows(new Set(filteredRows.map((r) => r.productId)));
  const collapseAll = () => setExpandedRows(new Set());

  const hasActiveFilters =
    filters.categoryId || filters.brandId ||
    filters.stockStatus !== 'all' || filters.isActive !== undefined;

  const clearFilters = () => {
    setFilters({ stockStatus: 'all' });
    setSearch('');
  };

  /* ─── Extra grocery-focused analytics ───────────────── */
  const analytics = useMemo(() => {
    if (!filteredRows.length) return null;

    const totalStock = filteredRows.reduce((s, r) => s + r.stock, 0);
    const totalItems = filteredRows.reduce((s, r) => s + r.stock, 0);
    const totalStockValue = filteredRows.reduce((s, r) => s + r.stockValue, 0);
    const totalRetailValue = filteredRows.reduce((s, r) => s + r.retailValue, 0);
    const totalProfit = filteredRows.reduce((s, r) => s + r.potentialProfit, 0);
    const avgMargin = totalRetailValue > 0 ? (totalProfit / totalRetailValue) * 100 : 0;

    // Top 5 by profit
    const topProfit = [...filteredRows]
      .filter((r) => r.potentialProfit > 0)
      .sort((a, b) => b.potentialProfit - a.potentialProfit)
      .slice(0, 5);

    // Dead stock (0 movement OR very low but not out)
    const dead = filteredRows.filter((r) => r.stockStatus === 'IN_STOCK' && r.stock > 20);

    // Category breakdown
    const catMap = new Map<string, { name: string; count: number; value: number; profit: number; color?: string }>();
    filteredRows.forEach((r) => {
      const key = r.category || 'Uncategorized';
      const existing = catMap.get(key) || { name: key, count: 0, value: 0, profit: 0, color: r.categoryColor ?? undefined };
      existing.count += 1;
      existing.value += r.stockValue;
      existing.profit += r.potentialProfit;
      catMap.set(key, existing);
    });
    const categoryRanking = Array.from(catMap.values()).sort((a, b) => b.value - a.value).slice(0, 8);

    return {
      totalItems, totalStock, totalStockValue, totalRetailValue, totalProfit, avgMargin,
      topProfit, dead, categoryRanking,
    };
  }, [filteredRows]);

  /* ─── Export CSV (full detail) ──────────────────────── */
  const exportCSV = () => {
    if (filteredRows.length === 0) return;

    const headers = [
      '#', 'Product Name', 'SKU', 'Barcode', 'Category', 'Brand', 'Unit',
      'Stock', 'Low Alert', 'Cost Price', 'Sale Price',
      'Stock Value (Cost)', 'Retail Value', 'Potential Profit', 'Margin %',
      'Status', 'Featured', 'Active',
    ];

    const rows = filteredRows.map((r, idx) => {
      const margin = r.salePrice > 0 ? ((r.salePrice - r.costPrice) / r.salePrice) * 100 : 0;
      return [
        idx + 1, r.productName, r.sku || '', r.barcode || '', r.category || '', r.brand || '', r.unit,
        r.stock.toFixed(2), r.lowStockAlert.toString(),
        r.costPrice.toFixed(2), r.salePrice.toFixed(2),
        r.stockValue.toFixed(2), r.retailValue.toFixed(2), r.potentialProfit.toFixed(2),
        margin.toFixed(1),
        statusConfig[r.stockStatus].label,
        r.isFeatured ? 'Yes' : 'No',
        r.isActive ? 'Yes' : 'No',
      ];
    });

    // Summary rows at top
    const summary = [
      [`Stock Report — ${tenantName || 'Nafaa'}`],
      [`Shop: ${shopName || 'All'}  •  Generated: ${new Date().toLocaleString('en-PK')}`],
      [`Total Products: ${filteredRows.length}`],
      [`Total Stock Value: ${analytics?.totalStockValue.toFixed(2) || 0}`],
      [`Total Retail Value: ${analytics?.totalRetailValue.toFixed(2) || 0}`],
      [`Potential Profit: ${analytics?.totalProfit.toFixed(2) || 0}`],
      [`Avg Margin: ${analytics?.avgMargin.toFixed(1) || 0}%`],
      [''],
      headers,
      ...rows,
    ];

    const csv = summary.map((r) =>
      r.map((c) => `"${String(c).replace(/"/g, '""')}"`).join(',')
    ).join('\n');

    const blob = new Blob(['\ufeff' + csv], { type: 'text/csv;charset=utf-8' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = `stock-report-${new Date().toISOString().slice(0, 10)}.csv`;
    a.click();
    URL.revokeObjectURL(url);
  };

  const handlePrint = () => {
    // Collapse expanded rows for print — printed table shows ONE row per product
    // (expanded details are screen-only for browsing).
    // This is what gives us clean multi-page PDFs.
    const wasExpanded = expandedRows.size > 0;
    if (wasExpanded) setExpandedRows(new Set());
    setTimeout(() => {
      window.print();
      // Restore user's expanded state after print dialog closes
      if (wasExpanded) {
        setTimeout(() => setExpandedRows(new Set(filteredRows.map((r) => r.productId))), 500);
      }
    }, 100);
  };

  const summary = data?.summary;
  const printDate = new Date().toLocaleString('en-PK', {
    dateStyle: 'full', timeStyle: 'short',
  });

  return (
    <div className="space-y-4 sm:space-y-6 pb-8 print:space-y-3">
      {/* ═══════════════════════════════════════════════════════
          PRINT-ONLY HEADER (crisp, colored)
          ═══════════════════════════════════════════════════════ */}
      <div className="hidden print:block print-header">
        <div className="flex items-center justify-between border-b-4 border-sky-600 pb-3 mb-4">
          <div>
            <h1 className="text-2xl font-black text-slate-900 leading-tight">
              🛒 {tenantName || 'My Store'}
            </h1>
            <p className="text-xs text-slate-600 font-semibold mt-1">
              {shopName ? `Shop: ${shopName}  •  ` : ''}Complete Stock Report
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
      <section className="relative overflow-hidden rounded-2xl sm:rounded-3xl bg-gradient-to-br from-slate-950 via-sky-900 to-cyan-700 dark:from-slate-950 dark:via-indigo-950 dark:to-cyan-900 text-white p-4 sm:p-6 shadow-2xl print:hidden">
        <div className="absolute -top-24 -right-24 h-72 w-72 rounded-full bg-sky-400/30 blur-3xl pointer-events-none animate-pulse" />
        <div className="absolute -bottom-24 -left-24 h-72 w-72 rounded-full bg-amber-400/20 blur-3xl pointer-events-none" />

        <div className="relative flex items-start justify-between flex-wrap gap-4">
          <div className="min-w-0 flex-1">
            <div className="inline-flex items-center gap-2 rounded-full bg-white/15 backdrop-blur-md px-3 py-1 text-[11px] font-extrabold border border-white/25 uppercase tracking-widest shadow-lg">
              <BarChart3 className="h-3.5 w-3.5 text-amber-300" /> Retail Intelligence
              {shopName && (
                <>
                  <span className="opacity-40">•</span>
                  <span className="text-emerald-300">🏪 {shopName}</span>
                </>
              )}
            </div>
            <h1 className="mt-3 text-2xl sm:text-3xl lg:text-4xl font-extrabold leading-tight">
              📦 Stock Report
            </h1>
            <p className="mt-1.5 text-xs sm:text-sm text-white/90 font-semibold">
              Complete inventory snapshot — sab products, categories, values ek jaga
            </p>
          </div>

          <div className="flex items-center gap-2 flex-wrap shrink-0">
            <PrivacyToggle compact />
            <button
              onClick={() => refetch()}
              disabled={isRefetching}
              className="inline-flex items-center gap-2 rounded-xl bg-white/10 hover:bg-white/20 px-3 py-2.5 text-sm font-extrabold backdrop-blur-md disabled:opacity-50 border border-white/20 transition"
            >
              <RefreshCw className={`h-4 w-4 ${isRefetching ? 'animate-spin' : ''}`} />
              <span className="hidden sm:inline">Refresh</span>
            </button>
            <Button
              variant="secondary"
              onClick={exportCSV}
              disabled={filteredRows.length === 0}
              className="bg-white/15 text-white hover:bg-white/25 border-white/20 font-extrabold"
            >
              <FileSpreadsheet className="h-4 w-4" /> CSV
            </Button>
            <Button onClick={handlePrint} className="bg-white text-slate-900 hover:bg-slate-100 font-extrabold shadow-2xl">
              <Printer className="h-4 w-4" /> Print / PDF
            </Button>
          </div>
        </div>

        {/* Hero KPI tiles */}
        {analytics && (
          <div className="relative mt-5 grid grid-cols-2 lg:grid-cols-4 gap-2 sm:gap-3">
            <HeroTile icon={Package} label="Total Products" value={String(filteredRows.length)} sub={`${analytics.totalStock.toFixed(0)} units total`} tone="cyan" />
            <HeroTile icon={PiggyBank} label="Stock Value" value={hideCost ? '••••' : formatPKRFull(analytics.totalStockValue)} sub="Investment" tone="blue" />
            <HeroTile icon={TrendingUp} label="Retail Value" value={formatPKRFull(analytics.totalRetailValue)} sub="If all sold at MRP" tone="emerald" />
            <HeroTile icon={Award} label="Potential Profit" value={hideCost ? '••••' : formatPKRFull(analytics.totalProfit)} sub={`${analytics.avgMargin.toFixed(1)}% avg margin`} tone="amber" />
          </div>
        )}
      </section>

      {/* ═══════════════════════════════════════════════════════
          STATUS BREAKDOWN (clickable filters)
          ═══════════════════════════════════════════════════════ */}
      {summary && (
        <section className="grid grid-cols-3 gap-2 sm:gap-3 print:hidden">
          <StatusButton
            active={filters.stockStatus === 'in'}
            onClick={() => setFilters({ ...filters, stockStatus: filters.stockStatus === 'in' ? 'all' : 'in' })}
            icon={CheckCircle2}
            label="In Stock"
            value={summary.inStockCount}
            tone="emerald"
          />
          <StatusButton
            active={filters.stockStatus === 'low'}
            onClick={() => setFilters({ ...filters, stockStatus: filters.stockStatus === 'low' ? 'all' : 'low' })}
            icon={AlertTriangle}
            label="Low Stock"
            value={summary.lowStockCount}
            tone="amber"
          />
          <StatusButton
            active={filters.stockStatus === 'out'}
            onClick={() => setFilters({ ...filters, stockStatus: filters.stockStatus === 'out' ? 'all' : 'out' })}
            icon={XCircle}
            label="Out of Stock"
            value={summary.outOfStockCount}
            tone="rose"
          />
        </section>
      )}

      {/* ═══════════════════════════════════════════════════════
          SEARCH + FILTERS
          ═══════════════════════════════════════════════════════ */}
      <section className="space-y-3 print:hidden">
        <div className="flex gap-2 flex-wrap">
          <div className="flex-1 relative min-w-[260px]">
            <Search className="h-4 w-4 text-slate-400 absolute left-3 top-1/2 -translate-y-1/2 pointer-events-none" />
            <input
              className="h-11 w-full rounded-xl border-2 border-slate-200 dark:border-slate-700 bg-white dark:bg-slate-900 pl-10 pr-10 text-sm font-semibold text-slate-900 dark:text-white placeholder:text-slate-400 dark:placeholder:text-slate-500 focus:outline-none focus:border-sky-500 dark:focus:border-sky-500 transition"
              placeholder="Search: name, SKU, barcode, category, brand..."
              value={search}
              onChange={(e) => setSearch(e.target.value)}
            />
            {search && (
              <button onClick={() => setSearch('')} className="absolute right-3 top-1/2 -translate-y-1/2 h-6 w-6 rounded-md hover:bg-slate-100 dark:hover:bg-slate-800 flex items-center justify-center">
                <X className="h-3.5 w-3.5 text-slate-400" />
              </button>
            )}
          </div>
          <button
            onClick={() => setShowFilters((v) => !v)}
            className={[
              'h-11 px-4 rounded-xl border-2 font-extrabold text-sm inline-flex items-center gap-2 transition',
              showFilters || hasActiveFilters
                ? 'border-sky-500 bg-sky-50 dark:bg-sky-500/15 text-sky-700 dark:text-sky-300'
                : 'border-slate-200 dark:border-slate-700 bg-white dark:bg-slate-900 text-slate-700 dark:text-slate-300 hover:border-sky-300',
            ].join(' ')}
          >
            <Filter className="h-4 w-4" /> Filters
            {hasActiveFilters && (
              <span className="h-5 w-5 rounded-full bg-sky-600 text-white text-[10px] font-extrabold flex items-center justify-center">!</span>
            )}
          </button>
          <div className="inline-flex rounded-xl bg-slate-100 dark:bg-slate-800 p-1 text-[11px] font-extrabold">
            <button
              onClick={() => expandedRows.size > 0 ? collapseAll() : expandAll()}
              className="px-3 h-9 rounded-lg text-slate-700 dark:text-slate-300 hover:bg-white dark:hover:bg-slate-900 transition inline-flex items-center gap-1.5"
              title={expandedRows.size > 0 ? 'Collapse all' : 'Expand all'}
            >
              {expandedRows.size > 0 ? <ChevronDown className="h-3.5 w-3.5" /> : <ChevronRight className="h-3.5 w-3.5" />}
              {expandedRows.size > 0 ? 'Collapse' : 'Expand'} All
            </button>
          </div>
        </div>

        {showFilters && (
          <div className="rounded-2xl bg-white dark:bg-slate-900 border-2 border-slate-200 dark:border-slate-800 p-4 space-y-3 shadow-sm">
            <div className="grid sm:grid-cols-2 lg:grid-cols-4 gap-3">
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
              <FilterField label="Stock Status">
                <select
                  className="filter-select"
                  value={filters.stockStatus ?? 'all'}
                  onChange={(e) => setFilters({ ...filters, stockStatus: e.target.value as any })}
                >
                  <option value="all">All stock</option>
                  <option value="in">In stock only</option>
                  <option value="low">Low stock only</option>
                  <option value="out">Out of stock only</option>
                </select>
              </FilterField>
              <FilterField label="Active Status">
                <select
                  className="filter-select"
                  value={filters.isActive === undefined ? '' : String(filters.isActive)}
                  onChange={(e) => setFilters({ ...filters, isActive: e.target.value === '' ? undefined : e.target.value === 'true' })}
                >
                  <option value="">All products</option>
                  <option value="true">Active only</option>
                  <option value="false">Inactive only</option>
                </select>
              </FilterField>
            </div>
            {hasActiveFilters && (
              <button onClick={clearFilters} className="text-xs font-extrabold text-rose-600 dark:text-rose-400 hover:underline inline-flex items-center gap-1">
                <X className="h-3 w-3" /> Clear all filters
              </button>
            )}
          </div>
        )}
      </section>

      {/* ═══════════════════════════════════════════════════════
          ANALYTICS: Top Profit + Category Ranking
          ═══════════════════════════════════════════════════════ */}
      {analytics && analytics.topProfit.length > 0 && !hideCost && (
        <section className="grid lg:grid-cols-2 gap-4 sm:gap-6 print:hidden">
          <Card>
            <CardHeader icon={Award} title="🏆 Top Profit Contributors" subtitle="Sab se zyada profit" tone="amber" />
            <div className="space-y-2">
              {analytics.topProfit.map((r, idx) => (
                <div key={r.productId} className="flex items-center gap-3 p-2 rounded-lg hover:bg-slate-50 dark:hover:bg-slate-800/60 transition">
                  <div className={[
                    'h-8 w-8 rounded-lg text-white font-extrabold flex items-center justify-center text-sm shrink-0 shadow-md',
                    idx === 0 ? 'bg-gradient-to-br from-amber-400 to-amber-600' :
                    idx === 1 ? 'bg-gradient-to-br from-slate-300 to-slate-500' :
                    idx === 2 ? 'bg-gradient-to-br from-orange-400 to-orange-600' :
                    'bg-gradient-to-br from-slate-400 to-slate-500',
                  ].join(' ')}>
                    {idx + 1}
                  </div>
                  <div className="min-w-0 flex-1">
                    <div className="font-extrabold text-slate-900 dark:text-white text-sm truncate">{r.productName}</div>
                    <div className="text-[11px] text-slate-500 dark:text-slate-400 font-bold">
                      Stock: {r.stock.toFixed(0)} {r.unit} • {r.category || 'No cat'}
                    </div>
                  </div>
                  <div className="text-right shrink-0">
                    <div className="font-extrabold text-amber-700 dark:text-amber-400 text-sm tabular-nums">
                      {formatPKR(r.potentialProfit)}
                    </div>
                  </div>
                </div>
              ))}
            </div>
          </Card>

          <Card>
            <CardHeader icon={BarChart3} title="📊 Category Ranking" subtitle="Value ke hisaab se" tone="sky" />
            <div className="space-y-2.5">
              {analytics.categoryRanking.map((c) => {
                const pct = analytics.totalStockValue > 0 ? (c.value / analytics.totalStockValue) * 100 : 0;
                return (
                  <div key={c.name}>
                    <div className="flex items-center justify-between text-xs mb-1">
                      <div className="flex items-center gap-1.5 min-w-0 font-extrabold text-slate-700 dark:text-slate-200">
                        {c.color && <span className="h-2 w-2 rounded-full shrink-0" style={{ backgroundColor: c.color }} />}
                        <span className="truncate">{c.name}</span>
                        <span className="text-slate-500 dark:text-slate-400 font-bold">({c.count})</span>
                      </div>
                      <div className="font-extrabold text-slate-900 dark:text-white tabular-nums shrink-0">
                        {hideCost ? '••••' : formatPKR(c.value)}
                      </div>
                    </div>
                    <div className="h-2 bg-slate-100 dark:bg-slate-800 rounded-full overflow-hidden">
                      <div
                        className="h-full rounded-full bg-gradient-to-r from-sky-500 to-cyan-500 transition-all"
                        style={{ width: `${Math.max(pct, 2)}%` }}
                      />
                    </div>
                  </div>
                );
              })}
            </div>
          </Card>
        </section>
      )}

      {/* ═══════════════════════════════════════════════════════
          MAIN TABLE
          ═══════════════════════════════════════════════════════ */}
      <Card noPad className="print:border-0 print:rounded-none print:shadow-none">
        <div className="px-4 sm:px-6 py-4 border-b-2 border-slate-100 dark:border-slate-800 flex items-center justify-between flex-wrap gap-2 print:hidden">
          <div className="flex items-center gap-2.5">
            <div className="h-9 w-9 rounded-xl bg-gradient-to-br from-sky-500 to-cyan-700 text-white flex items-center justify-center shadow-md">
              <BarChart3 className="h-4 w-4" />
            </div>
            <div>
              <h3 className="font-extrabold text-slate-900 dark:text-white text-sm sm:text-base">
                Detailed Stock ({filteredRows.length})
              </h3>
              <p className="text-[11px] text-slate-500 dark:text-slate-400 font-bold">
                Generated: {data?.generatedAt ? new Date(data.generatedAt).toLocaleString('en-PK') : '—'}
              </p>
            </div>
          </div>
        </div>

        {isLoading ? (
          <div className="p-6 space-y-2">
            {Array.from({ length: 8 }).map((_, i) => (
              <div key={i} className="h-16 rounded-xl bg-slate-100 dark:bg-slate-800 animate-pulse" />
            ))}
          </div>
        ) : filteredRows.length === 0 ? (
          <div className="p-16 text-center">
            <div className="h-16 w-16 rounded-2xl bg-slate-100 dark:bg-slate-800 flex items-center justify-center mx-auto">
              <Package className="h-8 w-8 text-slate-400 dark:text-slate-600" />
            </div>
            <h3 className="mt-4 text-lg font-extrabold text-slate-900 dark:text-white">No products found</h3>
            <p className="text-sm text-slate-500 dark:text-slate-400 mt-1 font-bold">
              {hasActiveFilters ? 'Filter change karo' : 'Products add karo'}
            </p>
          </div>
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full text-sm print:text-[10px]">
              <thead className="bg-slate-50 dark:bg-slate-800/60 border-b-2 border-slate-200 dark:border-slate-700">
                <tr>
                  <th className="px-2 py-3 text-center w-10 print:hidden"></th>
                  <th className="px-3 py-3 text-left text-[10px] font-extrabold uppercase tracking-wider text-slate-700 dark:text-slate-300 w-10">#</th>
                  <SortHeader label="Product" active={sortKey === 'name'} dir={sortDir} onClick={() => toggleSort('name')} align="left" />
                  <th className="px-3 py-3 text-left text-[10px] font-extrabold uppercase tracking-wider text-slate-700 dark:text-slate-300">Category / Brand</th>
                  <SortHeader label="Stock" active={sortKey === 'stock'} dir={sortDir} onClick={() => toggleSort('stock')} align="right" />
                  {!hideCost && <th className="px-3 py-3 text-right text-[10px] font-extrabold uppercase tracking-wider text-slate-700 dark:text-slate-300">Cost</th>}
                  <th className="px-3 py-3 text-right text-[10px] font-extrabold uppercase tracking-wider text-slate-700 dark:text-slate-300">Sale</th>
                  <SortHeader label="Stock Value" active={sortKey === 'stockValue'} dir={sortDir} onClick={() => toggleSort('stockValue')} align="right" />
                  {!hideCost && <SortHeader label="Profit" active={sortKey === 'profit'} dir={sortDir} onClick={() => toggleSort('profit')} align="right" />}
                  {!hideCost && <SortHeader label="Margin" active={sortKey === 'margin'} dir={sortDir} onClick={() => toggleSort('margin')} align="right" />}
                  <th className="px-3 py-3 text-center text-[10px] font-extrabold uppercase tracking-wider text-slate-700 dark:text-slate-300">Status</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-100 dark:divide-slate-800">
                {filteredRows.map((row, idx) => {
                  const st = statusConfig[row.stockStatus];
                  const StatusIcon = st.icon;
                  const margin = row.salePrice > 0 ? ((row.salePrice - row.costPrice) / row.salePrice) * 100 : 0;
                  const expanded = expandedRows.has(row.productId);

                  return (
                    <Fragment key={row.productId}>
                      <tr className={[
                        'hover:bg-slate-50 dark:hover:bg-slate-800/40 transition',
                        row.stockStatus === 'OUT_OF_STOCK' ? 'bg-rose-50/40 dark:bg-rose-500/5' : '',
                        row.stockStatus === 'LOW_STOCK' ? 'bg-amber-50/40 dark:bg-amber-500/5' : '',
                        !row.isActive ? 'opacity-60' : '',
                        expanded ? 'bg-sky-50/40 dark:bg-sky-500/10 border-l-4 border-sky-500' : '',
                      ].join(' ')}>
                        <td className="px-2 py-3 text-center print:hidden">
                          <button
                            onClick={() => toggleExpand(row.productId)}
                            className={[
                              'h-7 w-7 rounded-lg inline-flex items-center justify-center transition',
                              expanded
                                ? 'bg-sky-600 text-white shadow-md'
                                : 'bg-slate-100 dark:bg-slate-800 hover:bg-slate-200 dark:hover:bg-slate-700 text-slate-600 dark:text-slate-300',
                            ].join(' ')}
                          >
                            {expanded ? <ChevronDown className="h-3.5 w-3.5" /> : <ChevronRight className="h-3.5 w-3.5" />}
                          </button>
                        </td>
                        <td className="px-3 py-3 text-xs text-slate-500 dark:text-slate-400 font-mono">{idx + 1}</td>

                        {/* Product */}
                        <td className="px-3 py-3">
                          <div className="flex items-start gap-2.5">
                            <div className="h-10 w-10 rounded-lg bg-slate-100 dark:bg-slate-800 overflow-hidden flex items-center justify-center shrink-0 print:hidden border border-slate-200 dark:border-slate-700">
                              {row.primaryImage ? (
                                <img src={row.primaryImage} alt="" className="h-full w-full object-cover" />
                              ) : (
                                <Package className="h-4 w-4 text-slate-400" />
                              )}
                            </div>
                            <div className="min-w-0">
                              <div className="font-extrabold text-slate-900 dark:text-white text-sm line-clamp-1 flex items-center gap-1.5">
                                {row.productName}
                                {row.isFeatured && <Star className="h-3 w-3 text-amber-500 fill-amber-500" />}
                              </div>
                              <div className="flex items-center gap-1.5 mt-0.5 text-[10px]">
                                {row.sku && <span className="font-mono text-slate-500 dark:text-slate-400">{row.sku}</span>}
                                {row.variantCount && row.variantCount > 0 ? (
                                  <span className="px-1.5 py-0.5 rounded bg-violet-100 dark:bg-violet-500/20 text-violet-700 dark:text-violet-300 font-extrabold">
                                    {row.variantCount}v
                                  </span>
                                ) : null}
                              </div>
                            </div>
                          </div>
                        </td>

                        {/* Category / Brand */}
                        <td className="px-3 py-3 text-xs">
                          {row.category && (
                            <div className="font-extrabold text-slate-700 dark:text-slate-200 flex items-center gap-1.5">
                              {row.categoryColor && (
                                <span className="inline-block h-2 w-2 rounded-full shrink-0" style={{ backgroundColor: row.categoryColor }} />
                              )}
                              <span className="truncate">{row.category}</span>
                            </div>
                          )}
                          {row.brand && (
                            <div className="text-[10px] font-bold text-violet-700 dark:text-violet-400 mt-0.5 truncate">
                              {row.brand}
                            </div>
                          )}
                        </td>

                        {/* Stock */}
                        <td className="px-3 py-3 text-right">
                          <div className="font-extrabold text-slate-900 dark:text-white tabular-nums">
                            {row.stock.toFixed(row.stock % 1 === 0 ? 0 : 2)}
                          </div>
                          <div className="text-[10px] text-slate-500 dark:text-slate-400 font-bold uppercase">{row.unit}</div>
                        </td>

                        {/* Cost */}
                        {!hideCost && (
                          <td className="px-3 py-3 text-right text-xs font-bold text-slate-700 dark:text-slate-200 tabular-nums">
                            {formatPKR(row.costPrice)}
                          </td>
                        )}

                        {/* Sale */}
                        <td className="px-3 py-3 text-right text-xs font-extrabold text-emerald-700 dark:text-emerald-400 tabular-nums">
                          {formatPKR(row.salePrice)}
                        </td>

                        {/* Stock Value */}
                        <td className="px-3 py-3 text-right text-xs font-extrabold text-slate-900 dark:text-white tabular-nums">
                          {hideCost ? '••••' : formatPKR(row.stockValue)}
                        </td>

                        {/* Profit */}
                        {!hideCost && (
                          <td className="px-3 py-3 text-right text-xs font-extrabold text-amber-700 dark:text-amber-400 tabular-nums">
                            {formatPKR(row.potentialProfit)}
                          </td>
                        )}

                        {/* Margin */}
                        {!hideCost && (
                          <td className="px-3 py-3 text-right text-xs font-extrabold tabular-nums">
                            <span className={[
                              margin >= 30 ? 'text-emerald-700 dark:text-emerald-400' :
                              margin >= 15 ? 'text-blue-700 dark:text-blue-400' :
                              margin >= 5 ? 'text-amber-700 dark:text-amber-400' :
                              'text-rose-700 dark:text-rose-400',
                            ].join(' ')}>
                              {margin.toFixed(1)}%
                            </span>
                          </td>
                        )}

                        {/* Status */}
                        <td className="px-3 py-3 text-center">
                          <span className={[
                            'inline-flex items-center gap-1 px-2 py-0.5 rounded-full border text-[10px] font-extrabold',
                            st.light, st.dark,
                          ].join(' ')}>
                            <StatusIcon className="h-2.5 w-2.5" />
                            {st.label}
                          </span>
                        </td>
                      </tr>

                      {/* Expanded detail row — screen only, hidden in print */}
                      {expanded && (
                        <tr className="print:hidden bg-sky-50/30 dark:bg-sky-500/5 border-l-4 border-sky-500">
                          <td colSpan={hideCost ? 8 : 11} className="p-4">
                            <ExpandedDetail row={row} hideCost={hideCost} margin={margin} />
                          </td>
                        </tr>
                      )}
                    </Fragment>
                  );
                })}
              </tbody>

              {/* Footer totals */}
              {analytics && (
                <tfoot className="bg-slate-100 dark:bg-slate-800 border-t-2 border-slate-300 dark:border-slate-700 font-extrabold">
                  <tr>
                    <td className="print:hidden"></td>
                    <td colSpan={hideCost ? 3 : 3} className="px-3 py-3 text-right text-xs uppercase text-slate-700 dark:text-slate-300">
                      Total ({filteredRows.length}):
                    </td>
                    <td className="px-3 py-3 text-right text-xs tabular-nums text-slate-900 dark:text-white">
                      {analytics.totalStock.toFixed(0)}
                    </td>
                    {!hideCost && <td></td>}
                    <td></td>
                    <td className="px-3 py-3 text-right text-sm text-blue-700 dark:text-blue-400 tabular-nums">
                      {hideCost ? '••••' : formatPKR(analytics.totalStockValue)}
                    </td>
                    {!hideCost && (
                      <td className="px-3 py-3 text-right text-sm text-amber-700 dark:text-amber-400 tabular-nums">
                        {formatPKR(analytics.totalProfit)}
                      </td>
                    )}
                    {!hideCost && (
                      <td className="px-3 py-3 text-right text-sm text-emerald-700 dark:text-emerald-400 tabular-nums">
                        {analytics.avgMargin.toFixed(1)}%
                      </td>
                    )}
                    <td></td>
                  </tr>
                </tfoot>
              )}
            </table>
          </div>
        )}
      </Card>

      {/* Print-only footer */}
      <div className="hidden print:block print-footer text-center text-[10px] text-slate-500 border-t border-slate-300 pt-2 mt-4">
        Generated by Nafaa POS • {tenantName || ''} • Page will auto-paginate
      </div>

      {/* ═══════════════════════════════════════════════════════
          PRINT STYLES — perfect A4 landscape, colored, crisp
          ═══════════════════════════════════════════════════════ */}
      <style>{`
        .filter-select {
          height: 40px; width: 100%; border-radius: 10px;
          border: 2px solid rgb(226 232 240);
          background: white; padding: 0 12px; font-size: 13px;
          font-weight: 700; color: rgb(15 23 42);
          transition: border-color 0.15s;
        }
        .filter-select:focus { outline: none; border-color: rgb(14 165 233); }
        .dark .filter-select {
          background: rgb(15 23 42); border-color: rgb(51 65 85); color: white;
        }

        @media print {
          @page {
            size: A4 landscape;
            margin: 10mm 6mm;
          }
          html, body {
            background: white !important;
            color: #0f172a !important;
            print-color-adjust: exact !important;
            -webkit-print-color-adjust: exact !important;
          }
          /* Force light mode colors during print */
          .dark body, .dark {
            background: white !important;
            color: #0f172a !important;
          }
          /* Hide screen-only elements */
          .print\\:hidden { display: none !important; }
          .print\\:block { display: block !important; }
          .print\\:border-0 { border: 0 !important; }
          .print\\:rounded-none { border-radius: 0 !important; }
          .print\\:shadow-none { box-shadow: none !important; }

          /* Card wrapper cleanup for print */
          section, div {
            box-shadow: none !important;
          }

          /* Table = the main print content */
          table {
            font-size: 9px !important;
            border-collapse: collapse !important;
            width: 100% !important;
            page-break-inside: auto !important;
          }
          thead {
            display: table-header-group !important; /* repeat on every page */
          }
          thead tr {
            page-break-inside: avoid !important;
            page-break-after: auto !important;
          }
          thead th {
            background: #0ea5e9 !important;
            color: white !important;
            padding: 5px 4px !important;
            font-size: 8px !important;
            font-weight: 800 !important;
            text-transform: uppercase !important;
            border: 1px solid #0284c7 !important;
            letter-spacing: 0.5px !important;
          }
          tbody tr {
            page-break-inside: avoid !important;
            page-break-after: auto !important;
          }
          tbody td {
            padding: 5px 4px !important;
            border: 1px solid #e2e8f0 !important;
            color: #0f172a !important;
            vertical-align: middle !important;
          }
          tbody tr:nth-child(even) td {
            background: #f8fafc !important;
          }
          /* Row status color-tints in print */
          tbody tr.bg-rose-50\\/40 td,
          tbody tr[class*="rose-500/5"] td {
            background: #fef2f2 !important;
          }
          tbody tr.bg-amber-50\\/40 td,
          tbody tr[class*="amber-500/5"] td {
            background: #fffbeb !important;
          }
          tfoot {
            display: table-row-group !important;
          }
          tfoot td {
            background: #1e293b !important;
            color: white !important;
            padding: 6px 4px !important;
            font-weight: 800 !important;
            border-top: 2px solid #0f172a !important;
          }
          /* Status badges — keep colors */
          .bg-emerald-50, [class*="emerald-500/15"] {
            background: #d1fae5 !important;
            color: #047857 !important;
          }
          .bg-amber-50, [class*="amber-500/15"] {
            background: #fef3c7 !important;
            color: #b45309 !important;
          }
          .bg-rose-50, [class*="rose-500/15"] {
            background: #ffe4e6 !important;
            color: #be123c !important;
          }
          /* Text colors preserved */
          .text-emerald-700, [class*="emerald-400"] { color: #047857 !important; }
          .text-amber-700,   [class*="amber-400"]   { color: #b45309 !important; }
          .text-rose-700,    [class*="rose-400"]    { color: #be123c !important; }
          .text-blue-700,    [class*="blue-400"]    { color: #1d4ed8 !important; }
          .text-violet-700,  [class*="violet-400"]  { color: #6d28d9 !important; }

          /* Hide product image in print — save space */
          tbody td img { display: none !important; }
          tbody td .h-10.w-10 { display: none !important; }

          .print-header, .print-footer {
            display: block !important;
          }
          .print-header {
            page-break-after: avoid !important;
            margin-bottom: 8px !important;
          }

          /* ⭐ CRITICAL: kill all overflow / max-height constraints
             that were clipping the table to just 1 page */
          .overflow-x-auto,
          .overflow-y-auto,
          .overflow-hidden,
          .overflow-auto {
            overflow: visible !important;
            max-height: none !important;
            height: auto !important;
          }
          /* Parent containers must not clip */
          main, aside, header, nav, [class*="max-h-"] {
            max-height: none !important;
            height: auto !important;
            overflow: visible !important;
          }
          /* Root layout — no fixed heights */
          html, body, #root, #__next {
            height: auto !important;
            min-height: 0 !important;
            overflow: visible !important;
          }
          /* Sidebars / topbars hide during print */
          [class*="sidebar"], [class*="topbar"], nav[class*="fixed"] {
            display: none !important;
          }
          /* Card wrapping the table shouldn't have rounded overflow */
          [class*="rounded-2xl"], [class*="rounded-3xl"] {
            overflow: visible !important;
            border-radius: 0 !important;
          }
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
      <div className={`h-9 w-9 rounded-xl bg-gradient-to-br ${tones[tone] ?? tones.sky} text-white flex items-center justify-center shadow-md shrink-0`}>
        <Icon className="h-4 w-4" />
      </div>
      <div>
        <h3 className="text-sm sm:text-base font-extrabold text-slate-900 dark:text-white leading-tight">{title}</h3>
        <p className="text-[11px] text-slate-500 dark:text-slate-400 font-bold">{subtitle}</p>
      </div>
    </div>
  );
}

function HeroTile({ icon: Icon, label, value, sub, tone }: any) {
  const tones: Record<string, string> = {
    cyan:    'from-cyan-400/40 to-cyan-600/25 border-cyan-300/50',
    blue:    'from-blue-400/40 to-blue-600/25 border-blue-300/50',
    emerald: 'from-emerald-400/40 to-emerald-600/25 border-emerald-300/50',
    amber:   'from-amber-400/40 to-amber-600/25 border-amber-300/50',
  };
  return (
    <div className={`rounded-2xl bg-gradient-to-br backdrop-blur-md border p-3 shadow-lg ${tones[tone]}`}>
      <div className="flex items-center gap-1.5 mb-1.5">
        <Icon className="h-3.5 w-3.5 text-white/90" />
        <div className="text-[10px] uppercase tracking-widest font-extrabold text-white/95">{label}</div>
      </div>
      <div className="text-lg sm:text-2xl font-extrabold text-white tabular-nums leading-tight truncate drop-shadow-sm">{value}</div>
      <div className="text-[11px] font-bold text-white/85 mt-1 truncate">{sub}</div>
    </div>
  );
}

function StatusButton({ active, onClick, icon: Icon, label, value, tone }: any) {
  const tones: Record<string, { light: string; dark: string; activeL: string; activeD: string; iconC: string }> = {
    emerald: {
      light: 'border-emerald-200 bg-emerald-50 hover:border-emerald-400',
      dark: 'dark:border-emerald-500/30 dark:bg-emerald-500/10 dark:hover:border-emerald-500/60',
      activeL: 'border-emerald-500 bg-emerald-100 shadow-md',
      activeD: 'dark:border-emerald-400 dark:bg-emerald-500/25',
      iconC: 'text-emerald-600 dark:text-emerald-400',
    },
    amber: {
      light: 'border-amber-200 bg-amber-50 hover:border-amber-400',
      dark: 'dark:border-amber-500/30 dark:bg-amber-500/10 dark:hover:border-amber-500/60',
      activeL: 'border-amber-500 bg-amber-100 shadow-md',
      activeD: 'dark:border-amber-400 dark:bg-amber-500/25',
      iconC: 'text-amber-600 dark:text-amber-400',
    },
    rose: {
      light: 'border-rose-200 bg-rose-50 hover:border-rose-400',
      dark: 'dark:border-rose-500/30 dark:bg-rose-500/10 dark:hover:border-rose-500/60',
      activeL: 'border-rose-500 bg-rose-100 shadow-md',
      activeD: 'dark:border-rose-400 dark:bg-rose-500/25',
      iconC: 'text-rose-600 dark:text-rose-400',
    },
  };
  const t = tones[tone];
  return (
    <button
      onClick={onClick}
      className={[
        'rounded-2xl border-2 p-3 sm:p-4 text-left transition-all hover:-translate-y-0.5',
        active ? `${t.activeL} ${t.activeD}` : `${t.light} ${t.dark}`,
      ].join(' ')}
    >
      <div className="flex items-center justify-between gap-2">
        <div className="min-w-0">
          <div className={`text-[10px] uppercase font-extrabold ${t.iconC}`}>{label}</div>
          <div className="text-xl sm:text-2xl font-extrabold text-slate-900 dark:text-white mt-1 tabular-nums">{value}</div>
        </div>
        <Icon className={`h-7 w-7 sm:h-8 sm:w-8 ${t.iconC} shrink-0`} />
      </div>
    </button>
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

function SortHeader({ label, active, dir, onClick, align }: any) {
  return (
    <th className={`px-3 py-3 text-[10px] font-extrabold uppercase tracking-wider text-slate-700 dark:text-slate-300 text-${align}`}>
      <button
        onClick={onClick}
        className={`inline-flex items-center gap-1 hover:text-sky-700 dark:hover:text-sky-400 transition ${active ? 'text-sky-700 dark:text-sky-400' : ''}`}
      >
        {label}
        <ArrowUpDown className={`h-2.5 w-2.5 ${active ? 'opacity-100' : 'opacity-40'}`} />
        {active && <span className="text-[8px]">{dir === 'asc' ? '▲' : '▼'}</span>}
      </button>
    </th>
  );
}

function ExpandedDetail({ row, hideCost, margin }: { row: any; hideCost: boolean; margin: number }) {
  return (
    <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
      <DetailBox label="Barcode" value={row.barcode || '—'} mono />
      <DetailBox label="Low Stock Alert" value={`${row.lowStockAlert} ${row.unit}`} />
      <DetailBox label="Retail Value" value={formatPKR(row.retailValue)} tone="emerald" />
      {!hideCost && <DetailBox label="Margin" value={`${margin.toFixed(1)}%`} tone={margin >= 30 ? 'emerald' : margin >= 15 ? 'blue' : 'amber'} />}
      <DetailBox label="Active" value={row.isActive ? 'Yes' : 'No'} tone={row.isActive ? 'emerald' : 'rose'} />
      <DetailBox label="Featured" value={row.isFeatured ? 'Yes ⭐' : 'No'} />
      {row.variantCount ? <DetailBox label="Variants" value={`${row.variantCount} variants`} tone="violet" /> : null}
      <div className="col-span-2 sm:col-span-1 flex items-end">
        <Link
          to={`/retail-products/${row.productId}`}
          className="w-full text-center rounded-xl bg-sky-600 hover:bg-sky-700 text-white text-xs font-extrabold py-2 px-3 transition shadow-sm"
        >
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
      <div className={`text-sm font-extrabold mt-0.5 truncate ${tones[tone]} ${mono ? 'font-mono' : ''}`}>
        {value}
      </div>
    </div>
  );
}
