import { useState, useMemo, useRef, Fragment } from 'react';
import { useQuery } from '@tanstack/react-query';
import {
  Search, Package, AlertTriangle, CheckCircle2, XCircle, Layers,
  Smartphone, TrendingUp, DollarSign, BarChart3, Sliders, X,
  Download, Printer, FileSpreadsheet, FileText, Star, Eye, EyeOff,
  Scissors, Hash, Award, ChevronDown, ChevronRight,
} from 'lucide-react';
import { stockReportApi, type StockReportFilters, type StockStatus } from '@/api/stock-report.api';
import { ExpandableProductRow } from '../components/ExpandableProductRow';
import { categoriesApi } from '@/api/categories.api';
import { brandsApi } from '@/api/brands.api';
import { Button } from '@/components/ui/Button';
import { formatPKR, formatPKRFull } from '@/lib/format';

const statusConfig: Record<StockStatus, { label: string; color: string; bg: string; icon: any }> = {
  IN_STOCK: {
    label: 'In Stock',
    color: 'text-emerald-700',
    bg: 'bg-emerald-50 border-emerald-200',
    icon: CheckCircle2,
  },
  LOW_STOCK: {
    label: 'Low Stock',
    color: 'text-amber-700',
    bg: 'bg-amber-50 border-amber-200',
    icon: AlertTriangle,
  },
  OUT_OF_STOCK: {
    label: 'Out of Stock',
    color: 'text-rose-700',
    bg: 'bg-rose-50 border-rose-200',
    icon: XCircle,
  },
};

export default function StockReportPage() {
  const printRef = useRef<HTMLDivElement>(null);

  const [filters, setFilters] = useState<StockReportFilters>({ stockStatus: 'all' });
  const [search, setSearch] = useState('');
  const [showFilters, setShowFilters] = useState(false);
  const [expandedRows, setExpandedRows] = useState<Set<string>>(new Set());

  const toggleExpand = (productId: string) => {
    setExpandedRows((prev) => {
      const next = new Set(prev);
      if (next.has(productId)) next.delete(productId);
      else next.add(productId);
      return next;
    });
  };

  const expandAll = () => {
    setExpandedRows(new Set(filteredRows.map((r) => r.productId)));
  };

  const collapseAll = () => {
    setExpandedRows(new Set());
  };

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

  // Apply client-side search filter
  const filteredRows = useMemo(() => {
    if (!data?.rows) return [];
    const q = search.toLowerCase().trim();
    if (!q) return data.rows;
    return data.rows.filter(
      (r) =>
        r.productName.toLowerCase().includes(q) ||
        r.sku?.toLowerCase().includes(q) ||
        r.barcode?.toLowerCase().includes(q) ||
        r.category?.toLowerCase().includes(q) ||
        r.brand?.toLowerCase().includes(q),
    );
  }, [data?.rows, search]);

  const hasActiveFilters =
    filters.categoryId ||
    filters.brandId ||
    filters.stockStatus !== 'all' ||
    filters.isActive !== undefined;

  const clearFilters = () => {
    setFilters({ stockStatus: 'all' });
    setSearch('');
  };

  // ─── Export CSV ───────────────────────────────────
  const exportCSV = () => {
    if (filteredRows.length === 0) return;

    const headers = [
      'Product Name', 'SKU', 'Barcode', 'Category', 'Brand', 'Unit',
      'Industry', 'Stock', 'Low Alert', 'Cost Price', 'Sale Price',
      'Stock Value', 'Retail Value', 'Potential Profit', 'Status',
      'Carpet Rolls', 'Cut Pieces', 'IMEIs', 'Variants',
    ];

    const rows = filteredRows.map((r) => [
      r.productName,
      r.sku || '',
      r.barcode || '',
      r.category || '',
      r.brand || '',
      r.unit,
      r.industryType,
      r.stock.toFixed(2),
      r.lowStockAlert.toString(),
      r.costPrice.toFixed(2),
      r.salePrice.toFixed(2),
      r.stockValue.toFixed(2),
      r.retailValue.toFixed(2),
      r.potentialProfit.toFixed(2),
      r.stockStatus,
      r.carpetRollCount ?? '',
      r.carpetCutPiecesCount ?? '',
      r.imeiCount ?? '',
      r.variantCount ?? '',
    ]);

    const csv = [headers, ...rows]
      .map((r) => r.map((c) => `"${String(c).replace(/"/g, '""')}"`).join(','))
      .join('\n');

    const blob = new Blob(['\ufeff' + csv], { type: 'text/csv;charset=utf-8' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = `stock-report-${new Date().toISOString().slice(0, 10)}.csv`;
    a.click();
    URL.revokeObjectURL(url);
  };

  // ─── Print / PDF ──────────────────────────────────
  const handlePrint = () => {
    window.print();
  };

  const summary = data?.summary;

  return (
    <div className="space-y-6">
      {/* HEADER */}
      <section className="rounded-3xl bg-gradient-to-br from-slate-950 via-slate-900 to-brand-800 text-white p-6 shadow-2xl print:hidden">
        <div className="flex items-center justify-between flex-wrap gap-4">
          <div>
            <div className="inline-flex items-center gap-2 rounded-full bg-white/10 px-3 py-1 text-xs font-semibold backdrop-blur">
              <BarChart3 className="h-3.5 w-3.5 text-amber-300" />
              Inventory Intelligence
            </div>
            <h1 className="mt-3 text-3xl font-extrabold">Stock Report</h1>
            <p className="mt-2 text-sm text-white/80">
              Complete inventory snapshot — sab products, categories, industries ek hi report mein
            </p>
          </div>
          <div className="flex gap-2 flex-wrap">
            <Button
              variant="secondary"
              onClick={() => refetch()}
              disabled={isRefetching}
              className="bg-white/15 text-white hover:bg-white/25 border-white/20"
            >
              <BarChart3 className={`h-4 w-4 ${isRefetching ? 'animate-spin' : ''}`} />
              Refresh
            </Button>
            <Button
              variant="secondary"
              onClick={exportCSV}
              disabled={filteredRows.length === 0}
              className="bg-white/15 text-white hover:bg-white/25 border-white/20"
            >
              <FileSpreadsheet className="h-4 w-4" /> Export CSV
            </Button>
            <Button
              onClick={handlePrint}
              className="bg-white text-slate-900 hover:bg-slate-100"
            >
              <Printer className="h-4 w-4" /> Print / PDF
            </Button>
          </div>
        </div>
      </section>

      {/* PRINT HEADER (only visible in print) */}
      <div className="hidden print:block">
        <div className="text-center border-b-2 border-slate-700 pb-3 mb-4">
          <h1 className="text-2xl font-extrabold">{data?.tenantName || 'My Store'}</h1>
          <p className="text-sm text-slate-600">Complete Stock Report</p>
          <p className="text-xs text-slate-500 mt-1">
            Generated: {data?.generatedAt ? new Date(data.generatedAt).toLocaleString('en-PK') : '—'}
          </p>
        </div>
      </div>

      {/* STATS CARDS */}
      {summary && (
        <section className="grid sm:grid-cols-2 lg:grid-cols-4 gap-4 print:grid-cols-4">
          <StatCard
            label="Total Products"
            value={String(summary.totalProducts)}
            sub={`${summary.totalActiveProducts} active`}
            color="slate"
            icon={Package}
          />
          <StatCard
            label="Stock Value (Cost)"
            value={formatPKRFull(summary.totalStockValue)}
            sub="Investment value"
            color="blue"
            icon={DollarSign}
          />
          <StatCard
            label="Retail Value"
            value={formatPKRFull(summary.totalRetailValue)}
            sub="If all sold at MRP"
            color="emerald"
            icon={TrendingUp}
          />
          <StatCard
            label="Potential Profit"
            value={formatPKRFull(summary.totalPotentialProfit)}
            sub="Retail − Cost"
            color="amber"
            icon={Award}
          />
        </section>
      )}

      {/* STATUS BREAKDOWN */}
      {summary && (
        <section className="grid sm:grid-cols-3 gap-3 print:hidden">
          <button
            onClick={() => setFilters({ ...filters, stockStatus: 'in' })}
            className={`rounded-2xl border-2 p-4 text-left transition ${
              filters.stockStatus === 'in'
                ? 'border-emerald-500 bg-emerald-100 shadow-md'
                : 'border-emerald-200 bg-emerald-50 hover:border-emerald-400'
            }`}
          >
            <div className="flex items-center justify-between">
              <div>
                <div className="text-xs uppercase font-bold text-emerald-700">In Stock</div>
                <div className="text-2xl font-extrabold text-emerald-900 mt-1">
                  {summary.inStockCount}
                </div>
              </div>
              <CheckCircle2 className="h-8 w-8 text-emerald-600" />
            </div>
          </button>
          <button
            onClick={() => setFilters({ ...filters, stockStatus: 'low' })}
            className={`rounded-2xl border-2 p-4 text-left transition ${
              filters.stockStatus === 'low'
                ? 'border-amber-500 bg-amber-100 shadow-md'
                : 'border-amber-200 bg-amber-50 hover:border-amber-400'
            }`}
          >
            <div className="flex items-center justify-between">
              <div>
                <div className="text-xs uppercase font-bold text-amber-700">Low Stock</div>
                <div className="text-2xl font-extrabold text-amber-900 mt-1">
                  {summary.lowStockCount}
                </div>
              </div>
              <AlertTriangle className="h-8 w-8 text-amber-600" />
            </div>
          </button>
          <button
            onClick={() => setFilters({ ...filters, stockStatus: 'out' })}
            className={`rounded-2xl border-2 p-4 text-left transition ${
              filters.stockStatus === 'out'
                ? 'border-rose-500 bg-rose-100 shadow-md'
                : 'border-rose-200 bg-rose-50 hover:border-rose-400'
            }`}
          >
            <div className="flex items-center justify-between">
              <div>
                <div className="text-xs uppercase font-bold text-rose-700">Out of Stock</div>
                <div className="text-2xl font-extrabold text-rose-900 mt-1">
                  {summary.outOfStockCount}
                </div>
              </div>
              <XCircle className="h-8 w-8 text-rose-600" />
            </div>
          </button>
        </section>
      )}

      {/* SEARCH + FILTERS */}
      <section className="space-y-3 print:hidden">
        <div className="flex gap-2 flex-wrap">
          <div className="flex-1 relative min-w-[260px]">
            <Search className="h-4 w-4 text-slate-400 absolute left-3 top-1/2 -translate-y-1/2" />
            <input
              className="h-11 w-full rounded-xl border border-slate-200 bg-white pl-10 pr-10 text-sm focus:outline-none focus:ring-2 focus:ring-brand-500/30"
              placeholder="Search by name, SKU, barcode, category, brand..."
              value={search}
              onChange={(e) => setSearch(e.target.value)}
            />
            {search && (
              <button
                onClick={() => setSearch('')}
                className="absolute right-3 top-1/2 -translate-y-1/2"
              >
                <X className="h-4 w-4 text-slate-400" />
              </button>
            )}
          </div>
          <button
            onClick={() => setShowFilters((v) => !v)}
            className={`h-11 px-4 rounded-xl border-2 font-bold text-sm inline-flex items-center gap-2 transition ${
              showFilters || hasActiveFilters
                ? 'border-brand-500 bg-brand-50 text-brand-700'
                : 'border-slate-200 bg-white text-slate-700 hover:border-brand-300'
            }`}
          >
            <Sliders className="h-4 w-4" /> Filters
            {hasActiveFilters && (
              <span className="h-5 w-5 rounded-full bg-brand-600 text-white text-[10px] font-bold flex items-center justify-center">
                !
              </span>
            )}
          </button>
        </div>

        {showFilters && (
          <div className="rounded-2xl bg-white border border-slate-200 p-4 space-y-3">
            <div className="grid sm:grid-cols-2 lg:grid-cols-4 gap-3">
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
                    <option key={c.id} value={c.id}>
                      {c.name}
                    </option>
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
                    <option key={b.id} value={b.id}>
                      {b.name}
                    </option>
                  ))}
                </select>
              </div>
              <div>
                <label className="block text-xs font-bold text-slate-600 mb-1">Stock Status</label>
                <select
                  className="h-10 w-full rounded-lg border border-slate-200 bg-white px-3 text-sm"
                  value={filters.stockStatus ?? 'all'}
                  onChange={(e) =>
                    setFilters({ ...filters, stockStatus: e.target.value as any })
                  }
                >
                  <option value="all">All stock</option>
                  <option value="in">In stock only</option>
                  <option value="low">Low stock only</option>
                  <option value="out">Out of stock only</option>
                </select>
              </div>
              <div>
                <label className="block text-xs font-bold text-slate-600 mb-1">Active Status</label>
                <select
                  className="h-10 w-full rounded-lg border border-slate-200 bg-white px-3 text-sm"
                  value={filters.isActive === undefined ? '' : String(filters.isActive)}
                  onChange={(e) =>
                    setFilters({
                      ...filters,
                      isActive: e.target.value === '' ? undefined : e.target.value === 'true',
                    })
                  }
                >
                  <option value="">All products</option>
                  <option value="true">Active only</option>
                  <option value="false">Inactive only</option>
                </select>
              </div>
            </div>
            {hasActiveFilters && (
              <button
                onClick={clearFilters}
                className="text-xs font-bold text-rose-600 hover:underline inline-flex items-center gap-1"
              >
                <X className="h-3 w-3" /> Clear all filters
              </button>
            )}
          </div>
        )}
      </section>

      {/* CATEGORY BREAKDOWN */}
      {summary && summary.categoryBreakdown.length > 0 && (
        <section className="rounded-3xl bg-white border border-slate-200 p-5 print:hidden">
          <h3 className="font-bold text-slate-900 mb-3 flex items-center gap-2">
            <BarChart3 className="h-4 w-4" /> Category-wise Stock Value
          </h3>
          <div className="space-y-2">
            {summary.categoryBreakdown.slice(0, 8).map((cat) => {
              const pct = summary.totalStockValue > 0
                ? (cat.stockValue / summary.totalStockValue) * 100
                : 0;
              return (
                <div key={cat.categoryName} className="flex items-center gap-3">
                  <div className="w-40 text-sm font-bold text-slate-700 truncate">
                    {cat.categoryName}
                  </div>
                  <div className="flex-1 relative h-6 bg-slate-100 rounded-full overflow-hidden">
                    <div
                      className="h-full bg-gradient-to-r from-brand-500 to-emerald-500"
                      style={{ width: `${Math.max(pct, 1)}%` }}
                    />
                    <div className="absolute inset-0 flex items-center px-3 text-[11px] font-bold text-slate-900">
                      {cat.productCount} products
                    </div>
                  </div>
                  <div className="w-32 text-right text-sm font-extrabold text-slate-900 tabular-nums">
                    {formatPKR(cat.stockValue)}
                  </div>
                </div>
              );
            })}
          </div>
        </section>
      )}

      {/* MAIN TABLE */}
      <div ref={printRef} className="rounded-3xl bg-white border border-slate-200 shadow-sm overflow-hidden">
        <div className="px-6 py-4 border-b border-slate-100 flex items-center justify-between flex-wrap gap-2 print:hidden">
          <h3 className="font-bold text-slate-900">
            Detailed Stock Report ({filteredRows.length})
          </h3>
          <div className="text-xs text-slate-500">
            Generated: {data?.generatedAt ? new Date(data.generatedAt).toLocaleString('en-PK') : '—'}
          </div>
        </div>

        {isLoading ? (
          <div className="p-6 space-y-2">
            {Array.from({ length: 8 }).map((_, i) => (
              <div key={i} className="h-16 rounded-xl bg-slate-100 animate-pulse" />
            ))}
          </div>
        ) : filteredRows.length === 0 ? (
          <div className="p-16 text-center">
            <Package className="h-16 w-16 text-slate-300 mx-auto" />
            <h3 className="mt-4 text-lg font-bold text-slate-900">No products found</h3>
            <p className="text-sm text-slate-500 mt-1">
              {hasActiveFilters ? 'Try adjusting filters' : 'Add products to see report'}
            </p>
          </div>
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full text-sm">
              <thead className="bg-slate-50 border-b-2 border-slate-200">
                <tr>
                  <th className="px-2 py-3 text-center text-[10px] font-bold uppercase tracking-wider text-slate-700 w-10 print:hidden">
                    <button
                      onClick={() => expandedRows.size > 0 ? collapseAll() : expandAll()}
                      className="h-6 w-6 rounded-md bg-slate-200 hover:bg-slate-300 text-slate-700 inline-flex items-center justify-center transition"
                      title={expandedRows.size > 0 ? 'Collapse all' : 'Expand all'}
                    >
                      {expandedRows.size > 0 ? (
                        <ChevronDown className="h-3.5 w-3.5" />
                      ) : (
                        <ChevronRight className="h-3.5 w-3.5" />
                      )}
                    </button>
                  </th>
                  <th className="px-3 py-3 text-left text-[10px] font-bold uppercase tracking-wider text-slate-700">#</th>
                  <th className="px-3 py-3 text-left text-[10px] font-bold uppercase tracking-wider text-slate-700">Product</th>
                  <th className="px-3 py-3 text-left text-[10px] font-bold uppercase tracking-wider text-slate-700">Category / Brand</th>
                  <th className="px-3 py-3 text-center text-[10px] font-bold uppercase tracking-wider text-slate-700">Industry</th>
                  <th className="px-3 py-3 text-right text-[10px] font-bold uppercase tracking-wider text-slate-700">Stock</th>
                  <th className="px-3 py-3 text-right text-[10px] font-bold uppercase tracking-wider text-slate-700">Cost</th>
                  <th className="px-3 py-3 text-right text-[10px] font-bold uppercase tracking-wider text-slate-700">Sale</th>
                  <th className="px-3 py-3 text-right text-[10px] font-bold uppercase tracking-wider text-slate-700">Stock Value</th>
                  <th className="px-3 py-3 text-right text-[10px] font-bold uppercase tracking-wider text-slate-700">Profit</th>
                  <th className="px-3 py-3 text-center text-[10px] font-bold uppercase tracking-wider text-slate-700">Status</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-100">
                {filteredRows.map((row, idx) => {
                  const statusInfo = statusConfig[row.stockStatus];
                  const StatusIcon = statusInfo.icon;

                  return (
                    <Fragment key={row.productId}>
                    <tr
                      className={`hover:bg-slate-50 transition ${
                        row.stockStatus === 'OUT_OF_STOCK'
                          ? 'bg-rose-50/40'
                          : row.stockStatus === 'LOW_STOCK'
                            ? 'bg-amber-50/40'
                            : ''
                      } ${!row.isActive ? 'opacity-60' : ''} ${
                        expandedRows.has(row.productId) ? 'bg-blue-50/30 border-l-4 border-blue-500' : ''
                      }`}
                    >
                      {/* Expand button */}
                      <td className="px-2 py-3 text-center print:hidden">
                        <button
                          onClick={() => toggleExpand(row.productId)}
                          className={`h-7 w-7 rounded-lg inline-flex items-center justify-center transition ${
                            expandedRows.has(row.productId)
                              ? 'bg-blue-600 text-white shadow-md'
                              : 'bg-slate-100 hover:bg-slate-200 text-slate-600'
                          }`}
                          title={expandedRows.has(row.productId) ? 'Collapse' : 'Expand details'}
                        >
                          {expandedRows.has(row.productId) ? (
                            <ChevronDown className="h-3.5 w-3.5" />
                          ) : (
                            <ChevronRight className="h-3.5 w-3.5" />
                          )}
                        </button>
                      </td>
                      {/* # */}
                      <td className="px-3 py-3 text-xs text-slate-500 font-mono">
                        {idx + 1}
                      </td>

                      {/* Product */}
                      <td className="px-3 py-3">
                        <div className="flex items-start gap-2.5">
                          <div className="h-10 w-10 rounded-lg bg-slate-100 overflow-hidden flex items-center justify-center shrink-0 print:hidden">
                            {row.primaryImage ? (
                              <img src={row.primaryImage} alt="" className="h-full w-full object-cover" />
                            ) : (
                              <Package className="h-4 w-4 text-slate-400" />
                            )}
                          </div>
                          <div className="min-w-0">
                            <div className="font-bold text-slate-900 text-sm line-clamp-1 flex items-center gap-1.5">
                              {row.productName}
                              {row.isFeatured && <Star className="h-3 w-3 text-amber-500 fill-amber-500" />}
                            </div>
                            <div className="flex items-center gap-1.5 mt-0.5 text-[10px]">
                              {row.sku && (
                                <span className="font-mono text-slate-500">{row.sku}</span>
                              )}
                              {row.variantCount && row.variantCount > 0 && (
                                <span className="px-1.5 py-0.5 rounded bg-violet-100 text-violet-700 font-bold">
                                  {row.variantCount} variants
                                </span>
                              )}
                            </div>
                          </div>
                        </div>
                      </td>

                      {/* Category / Brand */}
                      <td className="px-3 py-3 text-xs">
                        {row.category && (
                          <div className="font-bold text-slate-700">
                            {row.categoryColor && (
                              <span
                                className="inline-block h-2 w-2 rounded-full mr-1"
                                style={{ backgroundColor: row.categoryColor }}
                              />
                            )}
                            {row.category}
                          </div>
                        )}
                        {row.brand && (
                          <div className="text-[10px] font-bold text-violet-700 mt-0.5">
                            {row.brand}
                          </div>
                        )}
                      </td>

                      {/* Industry */}
                      <td className="px-3 py-3 text-center">
                        <IndustryBadge row={row} />
                      </td>

                      {/* Stock */}
                      <td className="px-3 py-3 text-right">
                        <div className="font-extrabold text-slate-900 tabular-nums">
                          {row.stock.toFixed(row.stock % 1 === 0 ? 0 : 2)}
                        </div>
                        <div className="text-[10px] text-slate-500 font-bold uppercase">
                          {row.unit}
                        </div>
                      </td>

                      {/* Cost */}
                      <td className="px-3 py-3 text-right text-xs font-bold text-slate-700 tabular-nums">
                        {formatPKR(row.costPrice)}
                      </td>

                      {/* Sale */}
                      <td className="px-3 py-3 text-right text-xs font-bold text-emerald-700 tabular-nums">
                        {formatPKR(row.salePrice)}
                      </td>

                      {/* Stock Value */}
                      <td className="px-3 py-3 text-right text-xs font-extrabold text-slate-900 tabular-nums">
                        {formatPKR(row.stockValue)}
                      </td>

                      {/* Profit */}
                      <td className="px-3 py-3 text-right text-xs font-extrabold text-amber-700 tabular-nums">
                        {formatPKR(row.potentialProfit)}
                      </td>

                      {/* Status */}
                      <td className="px-3 py-3 text-center">
                        <span
                          className={`inline-flex items-center gap-1 px-2 py-0.5 rounded-full border text-[10px] font-extrabold ${statusInfo.bg} ${statusInfo.color}`}
                        >
                          <StatusIcon className="h-2.5 w-2.5" />
                          {statusInfo.label}
                        </span>
                      </td>
                    </tr>
                    {/* Expanded detail row */}
                    {expandedRows.has(row.productId) && (
                      <tr className="print:hidden">
                        <td colSpan={11} className="p-4 bg-gradient-to-br from-blue-50/40 to-white border-l-4 border-blue-500">
                          <ExpandableProductRow
                            productId={row.productId}
                            industryType={row.industryType}
                            productUnit={row.unit}
                            productName={row.productName}
                          />
                        </td>
                      </tr>
                    )}
                    </Fragment>
                  );
                })}
              </tbody>

              {/* Footer with totals */}
              {summary && (
                <tfoot className="bg-slate-100 border-t-2 border-slate-300 font-bold">
                  <tr>
                    <td colSpan={5} className="px-3 py-3 text-right text-xs uppercase text-slate-700">
                      Total ({filteredRows.length} products):
                    </td>
                    <td className="px-3 py-3 text-right text-sm font-extrabold text-slate-900 tabular-nums">
                      —
                    </td>
                    <td className="px-3 py-3"></td>
                    <td className="px-3 py-3"></td>
                    <td className="px-3 py-3 text-right text-sm font-extrabold text-blue-700 tabular-nums">
                      {formatPKR(summary.totalStockValue)}
                    </td>
                    <td className="px-3 py-3 text-right text-sm font-extrabold text-amber-700 tabular-nums">
                      {formatPKR(summary.totalPotentialProfit)}
                    </td>
                    <td className="px-3 py-3"></td>
                  </tr>
                </tfoot>
              )}
            </table>
          </div>
        )}
      </div>

      <style>{`
        @media print {
          @page { size: A4 landscape; margin: 1cm; }
          body { background: white !important; print-color-adjust: exact; -webkit-print-color-adjust: exact; }
          .print\\:hidden { display: none !important; }
          table { font-size: 10px; }
        }
      `}</style>
    </div>
  );
}

// ─── Helper Components ─────────────────────────────────

function StatCard({
  label, value, sub, color, icon: Icon,
}: { label: string; value: string; sub: string; color: string; icon: any }) {
  const colors: Record<string, string> = {
    slate: 'from-slate-700 to-slate-900 shadow-slate-500/30',
    blue: 'from-blue-500 to-blue-700 shadow-blue-500/30',
    emerald: 'from-emerald-500 to-emerald-700 shadow-emerald-500/30',
    amber: 'from-amber-500 to-amber-700 shadow-amber-500/30',
  };

  return (
    <div className="rounded-2xl bg-white border border-slate-200 p-5 shadow-sm hover:shadow-md transition">
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

function IndustryBadge({ row }: { row: any }) {
  if (row.industryType === 'CARPET') {
    return (
      <div className="inline-flex flex-col items-center gap-0.5">
        <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded-full bg-emerald-100 text-emerald-700 text-[9px] font-extrabold">
          <Layers className="h-2.5 w-2.5" /> CARPET
        </span>
        <div className="text-[9px] text-slate-500 font-bold">
          {row.carpetRollCount}R / {row.carpetCutPiecesCount}CP
        </div>
      </div>
    );
  }
  if (row.industryType === 'MOBILE') {
    return (
      <div className="inline-flex flex-col items-center gap-0.5">
        <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded-full bg-blue-100 text-blue-700 text-[9px] font-extrabold">
          <Smartphone className="h-2.5 w-2.5" /> MOBILE
        </span>
        <div className="text-[9px] text-slate-500 font-bold">
          {row.imeiCount} IMEIs
        </div>
      </div>
    );
  }
  if (row.industryType === 'WEIGHT_BASED') {
    return (
      <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded-full bg-amber-100 text-amber-700 text-[9px] font-extrabold">
        <Hash className="h-2.5 w-2.5" /> WEIGHT
      </span>
    );
  }
  return (
    <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded-full bg-slate-100 text-slate-700 text-[9px] font-extrabold">
      <Package className="h-2.5 w-2.5" /> STANDARD
    </span>
  );
}
