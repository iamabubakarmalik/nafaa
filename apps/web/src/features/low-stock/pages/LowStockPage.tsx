import { useMemo, useState } from 'react';
import { useQuery } from '@tanstack/react-query';
import { Link } from 'react-router-dom';
import {
  AlertTriangle, Package, ShoppingBag, ArrowRight, Search, X,
  Download, RefreshCw, Edit3, Filter, Layers, Smartphone, Scissors,
  TrendingDown, FileSpreadsheet, FileText, Sparkles, Eye, Hash,
  XCircle, AlertCircle, CheckCircle2, BarChart3,
} from 'lucide-react';
import {
  ResponsiveContainer, BarChart, Bar, XAxis, YAxis, Tooltip, CartesianGrid,
  PieChart, Pie, Cell,
} from 'recharts';
import { stockReportApi } from '@/api/stock-report.api';
import { formatPKR, formatPKRFull } from '@/lib/format';
import { Button } from '@/components/ui/Button';
import { toast } from 'sonner';

const formatQty = (qty: number) => qty.toFixed(qty % 1 === 0 ? 0 : 2);

type Filter = 'all' | 'critical' | 'warning';
type IndustryFilter = 'all' | 'STANDARD' | 'CARPET' | 'MOBILE' | 'WEIGHT_BASED';

const industryConfig: Record<string, { label: string; icon: any; color: string; bg: string }> = {
  STANDARD: { label: 'Standard', icon: Package, color: '#64748b', bg: 'bg-slate-100 text-slate-700' },
  CARPET: { label: 'Carpet', icon: Layers, color: '#10b981', bg: 'bg-emerald-100 text-emerald-700' },
  MOBILE: { label: 'Mobile', icon: Smartphone, color: '#3b82f6', bg: 'bg-blue-100 text-blue-700' },
  WEIGHT_BASED: { label: 'Weight', icon: Hash, color: '#f59e0b', bg: 'bg-amber-100 text-amber-700' },
};

export default function LowStockPage() {
  const [search, setSearch] = useState('');
  const [filter, setFilter] = useState<Filter>('all');
  const [industryFilter, setIndustryFilter] = useState<IndustryFilter>('all');

  // Use stock-report API which already has industry-aware low/out detection
  const { data, isLoading, refetch, isRefetching } = useQuery({
    queryKey: ['low-stock-report'],
    queryFn: () => stockReportApi.generate({ stockStatus: 'all', isActive: true }),
  });

  // Filter only LOW_STOCK + OUT_OF_STOCK
  const lowStockRows = useMemo(() => {
    if (!data?.rows) return [];
    return data.rows.filter(
      (r) => r.stockStatus === 'LOW_STOCK' || r.stockStatus === 'OUT_OF_STOCK'
    );
  }, [data]);

  const filtered = useMemo(() => {
    let result = [...lowStockRows];
    const q = search.toLowerCase().trim();
    if (q) {
      result = result.filter((p) =>
        p.productName.toLowerCase().includes(q) ||
        (p.sku || '').toLowerCase().includes(q) ||
        (p.barcode || '').toLowerCase().includes(q) ||
        (p.category || '').toLowerCase().includes(q) ||
        (p.brand || '').toLowerCase().includes(q)
      );
    }
    if (filter === 'critical') result = result.filter((p) => p.stockStatus === 'OUT_OF_STOCK');
    else if (filter === 'warning') result = result.filter((p) => p.stockStatus === 'LOW_STOCK');
    if (industryFilter !== 'all') result = result.filter((p) => p.industryType === industryFilter);
    return result;
  }, [lowStockRows, search, filter, industryFilter]);

  const stats = useMemo(() => {
    const critical = lowStockRows.filter((p) => p.stockStatus === 'OUT_OF_STOCK').length;
    const warning = lowStockRows.filter((p) => p.stockStatus === 'LOW_STOCK').length;
    const totalRetailValue = lowStockRows.reduce((s, p) => s + p.retailValue, 0);
    const totalCostValue = lowStockRows.reduce((s, p) => s + p.stockValue, 0);
    const carpetCount = lowStockRows.filter((p) => p.industryType === 'CARPET').length;
    const mobileCount = lowStockRows.filter((p) => p.industryType === 'MOBILE').length;
    return {
      critical, warning, total: lowStockRows.length,
      totalRetailValue, totalCostValue, carpetCount, mobileCount,
    };
  }, [lowStockRows]);

  // Industry breakdown for pie chart
  const industryBreakdown = useMemo(() => {
    const map = new Map<string, number>();
    for (const r of lowStockRows) {
      map.set(r.industryType, (map.get(r.industryType) || 0) + 1);
    }
    return Array.from(map.entries()).map(([key, count]) => ({
      name: industryConfig[key]?.label || key,
      value: count,
      color: industryConfig[key]?.color || '#64748b',
    }));
  }, [lowStockRows]);

  // Top 10 lowest stock for bar chart
  const topLowChart = useMemo(() => {
    return [...filtered]
      .sort((a, b) => a.stock - b.stock)
      .slice(0, 10)
      .map((r) => ({
        name: r.productName.length > 14 ? r.productName.slice(0, 14) + '…' : r.productName,
        stock: r.stock,
        alert: r.lowStockAlert,
      }));
  }, [filtered]);

  const exportCSV = () => {
    if (filtered.length === 0) return toast.error('No data');
    const headers = [
      'Product', 'SKU', 'Barcode', 'Category', 'Brand', 'Industry', 'Unit',
      'Current Stock', 'Low Alert', 'Status', 'Cost Price', 'Sale Price',
      'Stock Value', 'Retail Value',
    ];
    const rows = filtered.map((p) => [
      p.productName, p.sku || '', p.barcode || '', p.category || '', p.brand || '',
      p.industryType, p.unit, formatQty(p.stock), formatQty(p.lowStockAlert),
      p.stockStatus === 'OUT_OF_STOCK' ? 'Out of Stock' : 'Low Stock',
      p.costPrice.toFixed(2), p.salePrice.toFixed(2),
      p.stockValue.toFixed(2), p.retailValue.toFixed(2),
    ]);
    const csv = [headers, ...rows].map((r) => r.map((c) => `"${String(c).replace(/"/g, '""')}"`).join(',')).join('\n');
    const blob = new Blob(['\ufeff' + csv], { type: 'text/csv;charset=utf-8' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = `low-stock-${new Date().toISOString().slice(0, 10)}.csv`;
    a.click();
    URL.revokeObjectURL(url);
    toast.success('CSV exported');
  };

  const exportPDF = () => {
    if (filtered.length === 0) return toast.error('No data');
    window.print();
    toast.success('Use browser print → Save as PDF');
  };

  return (
    <div className="space-y-6">
      {/* ═══ HERO ═══ */}
      <section className="relative overflow-hidden rounded-3xl bg-gradient-to-br from-slate-950 via-amber-900 to-amber-700 text-white p-6 sm:p-8 shadow-2xl print:hidden">
        <div className="absolute -top-20 -right-20 h-64 w-64 rounded-full bg-amber-400/20 blur-3xl" />
        <div className="absolute -bottom-20 -left-20 h-64 w-64 rounded-full bg-rose-400/15 blur-3xl" />

        <div className="relative flex items-center justify-between gap-4 flex-wrap">
          <div>
            <div className="inline-flex items-center gap-2 rounded-full bg-white/10 backdrop-blur px-3 py-1 text-xs font-extrabold">
              <AlertTriangle className="h-3.5 w-3.5 text-amber-300" />
              Critical Stock Alerts
            </div>
            <h2 className="mt-3 text-3xl sm:text-4xl font-extrabold leading-tight">Low Stock Alerts</h2>
            <p className="mt-2 text-sm text-white/80">
              Industry-aware tracking — carpet sqft, mobile IMEIs, standard stock — sab ek jagah
            </p>
          </div>
          <div className="flex gap-2 flex-wrap">
            <button
              onClick={() => refetch()}
              disabled={isRefetching}
              className="inline-flex items-center gap-2 rounded-xl bg-white/10 hover:bg-white/20 px-4 py-2.5 text-sm font-bold transition disabled:opacity-50 backdrop-blur"
            >
              <RefreshCw className={`h-4 w-4 ${isRefetching ? 'animate-spin' : ''}`} />
              Refresh
            </button>
            <button
              onClick={exportPDF}
              className="inline-flex items-center gap-2 rounded-xl bg-white/15 hover:bg-white/25 px-4 py-2.5 text-sm font-bold transition backdrop-blur border border-white/20"
            >
              <FileText className="h-4 w-4" />
              PDF
            </button>
            <button
              onClick={exportCSV}
              className="inline-flex items-center gap-2 rounded-xl bg-white/15 hover:bg-white/25 px-4 py-2.5 text-sm font-bold transition backdrop-blur border border-white/20"
            >
              <FileSpreadsheet className="h-4 w-4" />
              CSV
            </button>
            <Link to="/purchases">
              <Button className="bg-white text-slate-900 hover:bg-slate-100">
                <ShoppingBag className="h-4 w-4" /> New Purchase
              </Button>
            </Link>
          </div>
        </div>
      </section>

      {/* PRINT HEADER */}
      <div className="hidden print:block">
        <div className="text-center border-b-2 border-slate-700 pb-3 mb-4">
          <h1 className="text-2xl font-extrabold">{data?.tenantName || 'My Store'}</h1>
          <p className="text-sm text-slate-600">Low Stock Alert Report</p>
          <p className="text-xs text-slate-500 mt-1">
            Generated: {new Date().toLocaleString('en-PK')}
          </p>
        </div>
      </div>

      {/* ═══ STATS ═══ */}
      <section className="grid sm:grid-cols-2 lg:grid-cols-4 gap-4">
        <StatCard
          label="Out of Stock"
          value={String(stats.critical)}
          sub="Stock = 0 (urgent)"
          icon={XCircle}
          color="rose"
          isAlert={stats.critical > 0}
        />
        <StatCard
          label="Low Stock"
          value={String(stats.warning)}
          sub="Below threshold"
          icon={AlertTriangle}
          color="amber"
        />
        <StatCard
          label="Carpet Affected"
          value={String(stats.carpetCount)}
          sub={`Mobile: ${stats.mobileCount}`}
          icon={Layers}
          color="emerald"
        />
        <StatCard
          label="Lost Revenue Potential"
          value={formatPKR(stats.totalRetailValue)}
          sub={`Cost: ${formatPKR(stats.totalCostValue)}`}
          icon={TrendingDown}
          color="violet"
          isText
        />
      </section>

      {/* ═══ CHARTS ═══ */}
      {stats.total > 0 && (
        <section className="grid lg:grid-cols-[1.5fr_1fr] gap-6 print:hidden">
          <div className="rounded-3xl bg-white border border-slate-200 shadow-sm p-6">
            <div className="flex items-center justify-between mb-4">
              <div>
                <h3 className="text-lg font-bold text-slate-900">Top 10 Critical Items</h3>
                <p className="text-xs text-slate-500">Lowest stock vs alert threshold</p>
              </div>
              <BarChart3 className="h-5 w-5 text-amber-500" />
            </div>
            {topLowChart.length > 0 ? (
              <div className="h-[280px]">
                <ResponsiveContainer width="100%" height="100%">
                  <BarChart data={topLowChart}>
                    <CartesianGrid strokeDasharray="3 3" stroke="#e2e8f0" />
                    <XAxis dataKey="name" stroke="#64748b" fontSize={10} angle={-15} textAnchor="end" height={70} />
                    <YAxis stroke="#64748b" fontSize={11} />
                    <Tooltip contentStyle={{ borderRadius: 12, border: '2px solid #e2e8f0' }} />
                    <Bar dataKey="stock" name="Current Stock" fill="#ef4444" radius={[6, 6, 0, 0]} />
                    <Bar dataKey="alert" name="Alert Level" fill="#f59e0b" radius={[6, 6, 0, 0]} />
                  </BarChart>
                </ResponsiveContainer>
              </div>
            ) : (
              <EmptyChart />
            )}
          </div>

          <div className="rounded-3xl bg-white border border-slate-200 shadow-sm p-6">
            <div className="flex items-center justify-between mb-4">
              <div>
                <h3 className="text-lg font-bold text-slate-900">By Industry</h3>
                <p className="text-xs text-slate-500">Distribution breakdown</p>
              </div>
              <Filter className="h-5 w-5 text-violet-500" />
            </div>
            {industryBreakdown.length > 0 ? (
              <div className="h-[280px]">
                <ResponsiveContainer width="100%" height="100%">
                  <PieChart>
                    <Pie
                      data={industryBreakdown}
                      cx="50%" cy="45%" outerRadius={90} innerRadius={45}
                      dataKey="value"
                      label={(entry: any) => `${entry.name} (${entry.value})`}
                      labelLine={false}
                    >
                      {industryBreakdown.map((entry, idx) => (
                        <Cell key={`cell-${idx}`} fill={entry.color} />
                      ))}
                    </Pie>
                    <Tooltip contentStyle={{ borderRadius: 12 }} />
                  </PieChart>
                </ResponsiveContainer>
              </div>
            ) : (
              <EmptyChart />
            )}
          </div>
        </section>
      )}

      {/* ═══ SEARCH + FILTERS ═══ */}
      <div className="rounded-3xl bg-white border border-slate-200 shadow-sm p-4 space-y-3 print:hidden">
        <div className="flex gap-2 flex-wrap">
          <div className="flex-1 min-w-[240px] relative">
            <Search className="h-4 w-4 text-slate-400 absolute left-3 top-1/2 -translate-y-1/2" />
            <input
              className="h-11 w-full rounded-xl border border-slate-200 bg-white pl-10 pr-10 text-sm focus:outline-none focus:ring-2 focus:ring-amber-500/30 focus:border-amber-500"
              placeholder="Search by name, SKU, barcode, category, brand..."
              value={search}
              onChange={(e) => setSearch(e.target.value)}
            />
            {search && (
              <button onClick={() => setSearch('')} className="absolute right-3 top-1/2 -translate-y-1/2">
                <X className="h-4 w-4 text-slate-400" />
              </button>
            )}
          </div>
        </div>

        <div className="space-y-2">
          <div className="flex gap-1 flex-wrap items-center">
            <span className="text-[10px] uppercase tracking-wider text-slate-500 font-bold mr-2">Status:</span>
            {[
              { v: 'all' as Filter, l: 'All', c: 'bg-slate-900', count: stats.total },
              { v: 'critical' as Filter, l: 'Out of Stock', c: 'bg-rose-600', count: stats.critical },
              { v: 'warning' as Filter, l: 'Low', c: 'bg-amber-600', count: stats.warning },
            ].map((opt) => (
              <button
                key={opt.v}
                onClick={() => setFilter(opt.v)}
                className={`px-3 py-1.5 rounded-lg text-xs font-bold transition inline-flex items-center gap-1.5 ${
                  filter === opt.v ? `${opt.c} text-white shadow-sm` : 'bg-slate-100 text-slate-700 hover:bg-slate-200'
                }`}
              >
                {opt.l}
                <span className={`px-1.5 rounded-full text-[10px] ${filter === opt.v ? 'bg-white/20' : 'bg-slate-200'}`}>
                  {opt.count}
                </span>
              </button>
            ))}
          </div>

          <div className="flex gap-1 flex-wrap items-center">
            <span className="text-[10px] uppercase tracking-wider text-slate-500 font-bold mr-2">Industry:</span>
            <button
              onClick={() => setIndustryFilter('all')}
              className={`px-3 py-1.5 rounded-lg text-xs font-bold transition ${
                industryFilter === 'all' ? 'bg-violet-600 text-white shadow-sm' : 'bg-slate-100 text-slate-700 hover:bg-slate-200'
              }`}
            >
              All
            </button>
            {Object.entries(industryConfig).map(([key, cfg]) => {
              const Icon = cfg.icon;
              const active = industryFilter === key;
              return (
                <button
                  key={key}
                  onClick={() => setIndustryFilter(key as IndustryFilter)}
                  className={`px-3 py-1.5 rounded-lg text-xs font-bold transition inline-flex items-center gap-1 ${
                    active ? cfg.bg + ' shadow-sm border-2 border-current' : 'bg-slate-100 text-slate-700 hover:bg-slate-200'
                  }`}
                >
                  <Icon className="h-3 w-3" />
                  {cfg.label}
                </button>
              );
            })}
          </div>
        </div>
      </div>

      {/* ═══ TABLE ═══ */}
      <section className="rounded-3xl bg-white border border-slate-200 shadow-sm overflow-hidden">
        <div className="px-6 py-5 border-b border-slate-100 flex items-center justify-between">
          <div>
            <h3 className="text-xl font-bold text-slate-900">Products Needing Restock</h3>
            <p className="text-sm text-slate-500">
              {filtered.length} of {stats.total} alerts
            </p>
          </div>
        </div>

        {isLoading ? (
          <div className="p-6 space-y-2">
            {Array.from({ length: 5 }).map((_, i) => (
              <div key={i} className="h-16 rounded-xl bg-slate-100 animate-pulse" />
            ))}
          </div>
        ) : filtered.length === 0 ? (
          <div className="p-12 text-center">
            <div className="mx-auto h-20 w-20 rounded-3xl bg-gradient-to-br from-emerald-100 to-green-200 flex items-center justify-center">
              <CheckCircle2 className="h-9 w-9 text-emerald-700" />
            </div>
            <h4 className="mt-5 text-xl font-bold text-slate-900">
              {search || filter !== 'all' || industryFilter !== 'all'
                ? 'No matches'
                : 'Sab products ka stock theek hai 🎉'}
            </h4>
            <p className="mt-2 text-sm text-slate-500">
              {search || filter !== 'all' || industryFilter !== 'all'
                ? 'Try different filter'
                : 'Koi low stock alert nahi hai abhi'}
            </p>
          </div>
        ) : (
          <div className="overflow-x-auto">
            <table className="min-w-full text-sm">
              <thead className="bg-slate-50 text-slate-700 border-b-2 border-slate-200">
                <tr>
                  <th className="text-left px-4 py-3 font-extrabold text-[10px] uppercase tracking-wider">Product</th>
                  <th className="text-left px-4 py-3 font-extrabold text-[10px] uppercase tracking-wider">Category / Brand</th>
                  <th className="text-center px-4 py-3 font-extrabold text-[10px] uppercase tracking-wider">Industry</th>
                  <th className="text-right px-4 py-3 font-extrabold text-[10px] uppercase tracking-wider">Current Stock</th>
                  <th className="text-right px-4 py-3 font-extrabold text-[10px] uppercase tracking-wider">Alert</th>
                  <th className="text-center px-4 py-3 font-extrabold text-[10px] uppercase tracking-wider">Status</th>
                  <th className="text-right px-4 py-3 font-extrabold text-[10px] uppercase tracking-wider">Sale Price</th>
                  <th className="text-right px-4 py-3 font-extrabold text-[10px] uppercase tracking-wider print:hidden">Action</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-100">
                {filtered.map((p) => {
                  const isCritical = p.stockStatus === 'OUT_OF_STOCK';
                  const indCfg = industryConfig[p.industryType];
                  const IndIcon = indCfg?.icon || Package;
                  return (
                    <tr
                      key={p.productId}
                      className={isCritical ? 'bg-rose-50/40 hover:bg-rose-50/60' : 'bg-amber-50/40 hover:bg-amber-50/60'}
                    >
                      <td className="px-4 py-3">
                        <div className="flex items-center gap-2.5">
                          <div className="h-10 w-10 rounded-lg bg-slate-100 overflow-hidden flex items-center justify-center shrink-0 print:hidden">
                            {p.primaryImage ? (
                              <img src={p.primaryImage} alt="" className="h-full w-full object-cover" />
                            ) : (
                              <Package className="h-4 w-4 text-slate-400" />
                            )}
                          </div>
                          <div>
                            <div className="font-bold text-slate-900 line-clamp-1">{p.productName}</div>
                            <div className="text-[10px] text-slate-500 font-mono">{p.sku || p.barcode || '—'}</div>
                          </div>
                        </div>
                      </td>
                      <td className="px-4 py-3 text-xs">
                        {p.category && (
                          <div className="font-bold text-slate-700 flex items-center gap-1">
                            {p.categoryColor && (
                              <span className="h-2 w-2 rounded-full" style={{ backgroundColor: p.categoryColor }} />
                            )}
                            {p.category}
                          </div>
                        )}
                        {p.brand && (
                          <div className="text-[10px] font-bold text-violet-700 mt-0.5">{p.brand}</div>
                        )}
                      </td>
                      <td className="px-4 py-3 text-center">
                        <span className={`inline-flex items-center gap-1 px-2 py-0.5 rounded-full text-[9px] font-extrabold ${indCfg?.bg}`}>
                          <IndIcon className="h-2.5 w-2.5" />
                          {indCfg?.label?.toUpperCase()}
                        </span>
                        {p.industryType === 'CARPET' && (p.carpetRollCount || p.carpetCutPiecesCount) && (
                          <div className="text-[9px] text-emerald-600 font-bold mt-0.5">
                            {p.carpetRollCount}R / {p.carpetCutPiecesCount}CP
                          </div>
                        )}
                      </td>
                      <td className="px-4 py-3 text-right">
                        <div className={`font-extrabold text-lg ${isCritical ? 'text-rose-700' : 'text-amber-700'}`}>
                          {formatQty(p.stock)}
                        </div>
                        <div className="text-[10px] text-slate-500 font-bold uppercase">{p.unit}</div>
                      </td>
                      <td className="px-4 py-3 text-right text-slate-700 font-bold">
                        {formatQty(p.lowStockAlert)} {p.unit}
                      </td>
                      <td className="px-4 py-3 text-center">
                        <span className={`inline-flex items-center gap-1 px-2 py-0.5 rounded-full text-[10px] font-extrabold ${
                          isCritical ? 'bg-rose-100 text-rose-700' : 'bg-amber-100 text-amber-700'
                        }`}>
                          {isCritical ? <XCircle className="h-2.5 w-2.5" /> : <AlertTriangle className="h-2.5 w-2.5" />}
                          {isCritical ? 'OUT' : 'LOW'}
                        </span>
                      </td>
                      <td className="px-4 py-3 text-right font-bold text-emerald-700 tabular-nums">
                        {formatPKR(p.salePrice)}
                      </td>
                      <td className="px-4 py-3 text-right print:hidden">
                        <div className="flex justify-end gap-1">
                          <Link to={`/products/${p.productId}/edit`}>
                            <button className="h-8 w-8 rounded-lg bg-slate-100 hover:bg-blue-100 hover:text-blue-700 flex items-center justify-center transition" title="Edit">
                              <Edit3 className="h-3.5 w-3.5" />
                            </button>
                          </Link>
                          <Link to="/purchases">
                            <button className="inline-flex items-center gap-1 px-2.5 h-8 rounded-lg bg-emerald-600 hover:bg-emerald-700 text-white text-xs font-bold transition">
                              Restock
                              <ArrowRight className="h-3 w-3" />
                            </button>
                          </Link>
                        </div>
                      </td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>
        )}
      </section>

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

function StatCard({ label, value, sub, icon: Icon, color, isAlert, isText }: any) {
  const colors: Record<string, string> = {
    rose: 'from-rose-500 to-rose-700 shadow-rose-500/30',
    amber: 'from-amber-500 to-amber-700 shadow-amber-500/30',
    emerald: 'from-emerald-500 to-emerald-700 shadow-emerald-500/30',
    violet: 'from-violet-500 to-purple-600 shadow-violet-500/30',
  };
  return (
    <div className={`rounded-2xl border-2 p-5 shadow-sm hover:shadow-md transition ${
      isAlert ? 'bg-gradient-to-br from-rose-50 to-pink-50 border-rose-300' : 'bg-white border-slate-200'
    }`}>
      <div className="flex items-center justify-between">
        <div className="min-w-0 flex-1">
          <div className="text-xs uppercase tracking-wider text-slate-500 font-bold">{label}</div>
          <div className={`mt-2 font-extrabold text-slate-900 tabular-nums truncate ${isText ? 'text-xl' : 'text-2xl'}`}>
            {value}
          </div>
          <div className="text-xs text-slate-600 font-semibold mt-1">{sub}</div>
        </div>
        <div className={`h-12 w-12 rounded-2xl bg-gradient-to-br ${colors[color]} text-white flex items-center justify-center shadow-lg shrink-0 ml-2`}>
          <Icon className="h-6 w-6" />
        </div>
      </div>
    </div>
  );
}

function EmptyChart() {
  return (
    <div className="h-[280px] flex items-center justify-center text-sm text-slate-500">
      No data
    </div>
  );
}
