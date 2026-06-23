import { useState, useMemo } from 'react';
import { useQuery } from '@tanstack/react-query';
import {
  Activity, ArrowDown, ArrowUp, Search, X, Download, Calendar, Package,
  TrendingUp, TrendingDown, FileSpreadsheet, FileText, RefreshCw, BarChart3,
  Sparkles, Layers, Smartphone, Hash,
} from 'lucide-react';
import {
  ResponsiveContainer, AreaChart, Area, BarChart, Bar, PieChart, Pie, Cell,
  XAxis, YAxis, Tooltip, CartesianGrid, Legend,
} from 'recharts';
import { stockMovementsApi, type StockMovementType } from '@/api/stock-movements.api';

const formatDate = (value: string) =>
  new Intl.DateTimeFormat('en-PK', { dateStyle: 'medium', timeStyle: 'short' }).format(new Date(value));

const formatDateShort = (value: string) =>
  new Intl.DateTimeFormat('en-PK', { month: 'short', day: 'numeric' }).format(new Date(value));

const formatQty = (q: number) => q.toFixed(q % 1 === 0 ? 0 : 2);

const typeConfig: Record<StockMovementType, { label: string; tone: string; icon: any; isPositive: boolean; color: string }> = {
  PURCHASE_IN: { label: 'Purchase In', tone: 'bg-emerald-100 text-emerald-700 border-emerald-200', icon: ArrowUp, isPositive: true, color: '#10b981' },
  SALE_OUT: { label: 'Sale Out', tone: 'bg-rose-100 text-rose-700 border-rose-200', icon: ArrowDown, isPositive: false, color: '#ef4444' },
  ADJUSTMENT_IN: { label: 'Adjustment In', tone: 'bg-blue-100 text-blue-700 border-blue-200', icon: ArrowUp, isPositive: true, color: '#3b82f6' },
  ADJUSTMENT_OUT: { label: 'Adjustment Out', tone: 'bg-orange-100 text-orange-700 border-orange-200', icon: ArrowDown, isPositive: false, color: '#f97316' },
  RETURN_IN: { label: 'Return In', tone: 'bg-violet-100 text-violet-700 border-violet-200', icon: ArrowUp, isPositive: true, color: '#8b5cf6' },
  OPENING_BALANCE: { label: 'Opening', tone: 'bg-slate-100 text-slate-700 border-slate-200', icon: ArrowUp, isPositive: true, color: '#64748b' },
};

type DateFilter = 'all' | 'today' | 'week' | 'month';

export default function StockMovementsPage() {
  const [search, setSearch] = useState('');
  const [typeFilter, setTypeFilter] = useState<StockMovementType | 'all'>('all');
  const [dateFilter, setDateFilter] = useState<DateFilter>('week');

  const { data: movements = [], isLoading, refetch, isRefetching } = useQuery({
    queryKey: ['stock-movements'],
    queryFn: stockMovementsApi.list,
  });

  const filtered = useMemo(() => {
    let result = [...movements];
    const q = search.toLowerCase().trim();
    if (q) {
      result = result.filter((m: any) =>
        m.product.name.toLowerCase().includes(q) ||
        (m.reference || '').toLowerCase().includes(q) ||
        (m.product.sku || '').toLowerCase().includes(q)
      );
    }
    if (typeFilter !== 'all') result = result.filter((m) => m.type === typeFilter);
    if (dateFilter !== 'all') {
      const now = new Date();
      let cutoff = new Date();
      if (dateFilter === 'today') cutoff.setHours(0, 0, 0, 0);
      else if (dateFilter === 'week') cutoff.setDate(now.getDate() - 7);
      else if (dateFilter === 'month') cutoff.setMonth(now.getMonth() - 1);
      result = result.filter((m: any) => new Date(m.createdAt) >= cutoff);
    }
    return result;
  }, [movements, search, typeFilter, dateFilter]);

  const stats = useMemo(() => {
    const today = new Date().toDateString();
    const todayMovements = movements.filter((m: any) => new Date(m.createdAt).toDateString() === today);
    const totalIn = movements.filter((m) => m.quantity > 0).reduce((s, m) => s + m.quantity, 0);
    const totalOut = movements.filter((m) => m.quantity < 0).reduce((s, m) => s + Math.abs(m.quantity), 0);
    return { total: movements.length, today: todayMovements.length, totalIn, totalOut };
  }, [movements]);

  // 7-day trend chart
  const trendData = useMemo(() => {
    const buckets: Record<string, { date: string; label: string; in: number; out: number }> = {};
    for (let i = 6; i >= 0; i--) {
      const d = new Date();
      d.setDate(d.getDate() - i);
      d.setHours(0, 0, 0, 0);
      const key = d.toISOString().slice(0, 10);
      buckets[key] = { date: key, label: formatDateShort(d.toISOString()), in: 0, out: 0 };
    }
    for (const m of movements) {
      const key = new Date(m.createdAt).toISOString().slice(0, 10);
      if (buckets[key]) {
        if (m.quantity > 0) buckets[key].in += m.quantity;
        else buckets[key].out += Math.abs(m.quantity);
      }
    }
    return Object.values(buckets);
  }, [movements]);

  // Type breakdown for pie chart
  const typeBreakdown = useMemo(() => {
    const map = new Map<string, number>();
    for (const m of movements) {
      map.set(m.type, (map.get(m.type) || 0) + 1);
    }
    return Array.from(map.entries()).map(([type, count]) => ({
      name: typeConfig[type as StockMovementType]?.label || type,
      value: count,
      color: typeConfig[type as StockMovementType]?.color || '#64748b',
    }));
  }, [movements]);

  const exportCSV = () => {
    if (filtered.length === 0) return;
    const headers = ['Date', 'Type', 'Product', 'SKU', 'Quantity', 'Balance After', 'Reference', 'Note'];
    const rows = filtered.map((m: any) => [
      new Date(m.createdAt).toLocaleString('en-PK'),
      typeConfig[m.type as StockMovementType]?.label || m.type,
      m.product.name,
      m.product.sku || '',
      formatQty(m.quantity),
      formatQty(m.balanceAfter),
      m.reference || '',
      m.note || '',
    ]);
    const csv = [headers, ...rows].map((r) => r.map((c) => `"${String(c).replace(/"/g, '""')}"`).join(',')).join('\n');
    const blob = new Blob(['\ufeff' + csv], { type: 'text/csv;charset=utf-8' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = `stock-movements-${new Date().toISOString().slice(0, 10)}.csv`;
    a.click();
    URL.revokeObjectURL(url);
  };

  const exportPDF = () => window.print();

  return (
    <div className="space-y-6">
      {/* ═══ HERO ═══ */}
      <section className="relative overflow-hidden rounded-3xl bg-gradient-to-br from-slate-950 via-blue-900 to-blue-700 text-white p-6 sm:p-8 shadow-2xl print:hidden">
        <div className="absolute -top-20 -right-20 h-64 w-64 rounded-full bg-blue-400/20 blur-3xl" />
        <div className="absolute -bottom-20 -left-20 h-64 w-64 rounded-full bg-cyan-400/15 blur-3xl" />

        <div className="relative flex items-center justify-between gap-4 flex-wrap">
          <div>
            <div className="inline-flex items-center gap-2 rounded-full bg-white/10 backdrop-blur px-3 py-1 text-xs font-extrabold">
              <Activity className="h-3.5 w-3.5 text-amber-300" />
              Inventory Audit Trail
            </div>
            <h2 className="mt-3 text-3xl sm:text-4xl font-extrabold leading-tight">Stock Movements</h2>
            <p className="mt-2 text-sm text-white/80">
              Har stock IN/OUT ka complete record — full traceability with analytics
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
              className="inline-flex items-center gap-2 rounded-xl bg-white/15 hover:bg-white/25 px-4 py-2.5 text-sm font-bold transition border border-white/20"
            >
              <FileText className="h-4 w-4" /> PDF
            </button>
            <button
              onClick={exportCSV}
              className="inline-flex items-center gap-2 rounded-xl bg-white/15 hover:bg-white/25 px-4 py-2.5 text-sm font-bold transition border border-white/20"
            >
              <FileSpreadsheet className="h-4 w-4" /> CSV
            </button>
          </div>
        </div>
      </section>

      {/* PRINT HEADER */}
      <div className="hidden print:block">
        <div className="text-center border-b-2 border-slate-700 pb-3 mb-4">
          <h1 className="text-2xl font-extrabold">Stock Movements Report</h1>
          <p className="text-xs text-slate-500 mt-1">Generated: {new Date().toLocaleString('en-PK')}</p>
        </div>
      </div>

      {/* ═══ STATS ═══ */}
      <section className="grid sm:grid-cols-2 xl:grid-cols-4 gap-4">
        <StatCard label="Today" value={stats.today} icon={Calendar} color="blue" />
        <StatCard label="Total Movements" value={stats.total} icon={Activity} color="violet" />
        <StatCard label="Total Stock In" value={`+${formatQty(stats.totalIn)}`} icon={TrendingUp} color="emerald" />
        <StatCard label="Total Stock Out" value={`−${formatQty(stats.totalOut)}`} icon={TrendingDown} color="rose" />
      </section>

      {/* ═══ CHARTS ═══ */}
      <section className="grid lg:grid-cols-[1.5fr_1fr] gap-6 print:hidden">
        <div className="rounded-3xl bg-white border border-slate-200 shadow-sm p-6">
          <div className="flex items-center justify-between mb-4">
            <div>
              <h3 className="text-lg font-bold text-slate-900">7-Day Movement Trend</h3>
              <p className="text-xs text-slate-500">Stock In vs Out daily pattern</p>
            </div>
            <BarChart3 className="h-5 w-5 text-blue-500" />
          </div>
          <div className="h-[280px]">
            <ResponsiveContainer width="100%" height="100%">
              <AreaChart data={trendData}>
                <defs>
                  <linearGradient id="inGrad" x1="0" y1="0" x2="0" y2="1">
                    <stop offset="0%" stopColor="#10b981" stopOpacity={0.5} />
                    <stop offset="100%" stopColor="#10b981" stopOpacity={0} />
                  </linearGradient>
                  <linearGradient id="outGrad" x1="0" y1="0" x2="0" y2="1">
                    <stop offset="0%" stopColor="#ef4444" stopOpacity={0.5} />
                    <stop offset="100%" stopColor="#ef4444" stopOpacity={0} />
                  </linearGradient>
                </defs>
                <CartesianGrid strokeDasharray="3 3" stroke="#e2e8f0" />
                <XAxis dataKey="label" stroke="#64748b" fontSize={11} />
                <YAxis stroke="#64748b" fontSize={11} />
                <Tooltip contentStyle={{ borderRadius: 12, border: '2px solid #e2e8f0' }} />
                <Legend wrapperStyle={{ fontSize: 12 }} />
                <Area type="monotone" dataKey="in" name="Stock In" stroke="#10b981" fill="url(#inGrad)" strokeWidth={2.5} />
                <Area type="monotone" dataKey="out" name="Stock Out" stroke="#ef4444" fill="url(#outGrad)" strokeWidth={2.5} />
              </AreaChart>
            </ResponsiveContainer>
          </div>
        </div>

        <div className="rounded-3xl bg-white border border-slate-200 shadow-sm p-6">
          <div className="flex items-center justify-between mb-4">
            <div>
              <h3 className="text-lg font-bold text-slate-900">By Type</h3>
              <p className="text-xs text-slate-500">Movement breakdown</p>
            </div>
          </div>
          {typeBreakdown.length > 0 ? (
            <div className="h-[280px]">
              <ResponsiveContainer width="100%" height="100%">
                <PieChart>
                  <Pie
                    data={typeBreakdown}
                    cx="50%" cy="45%" outerRadius={90} innerRadius={45}
                    dataKey="value"
                    label={(entry: any) => `${entry.value}`}
                    labelLine={false}
                  >
                    {typeBreakdown.map((entry, idx) => (
                      <Cell key={`cell-${idx}`} fill={entry.color} />
                    ))}
                  </Pie>
                  <Tooltip contentStyle={{ borderRadius: 12 }} />
                  <Legend wrapperStyle={{ fontSize: 10, paddingTop: 12 }} iconType="circle" />
                </PieChart>
              </ResponsiveContainer>
            </div>
          ) : (
            <div className="h-[280px] flex items-center justify-center text-sm text-slate-500">No data</div>
          )}
        </div>
      </section>

      {/* ═══ FILTERS ═══ */}
      <div className="rounded-3xl bg-white border border-slate-200 shadow-sm p-4 space-y-3 print:hidden">
        <div className="flex gap-2 flex-wrap">
          <div className="flex-1 min-w-[240px] relative">
            <Search className="h-4 w-4 text-slate-400 absolute left-3 top-1/2 -translate-y-1/2" />
            <input
              className="h-11 w-full rounded-xl border border-slate-200 bg-white pl-10 pr-10 text-sm focus:outline-none focus:ring-2 focus:ring-blue-500/30 focus:border-blue-500"
              placeholder="Search product, reference, SKU..."
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
            <span className="text-[10px] uppercase tracking-wider text-slate-500 font-bold mr-2">Type:</span>
            <button
              onClick={() => setTypeFilter('all')}
              className={`px-3 py-1.5 rounded-lg text-xs font-bold transition ${
                typeFilter === 'all' ? 'bg-slate-900 text-white shadow-sm' : 'bg-slate-100 text-slate-700 hover:bg-slate-200'
              }`}
            >
              All
            </button>
            {(Object.entries(typeConfig) as [StockMovementType, any][]).map(([key, cfg]) => (
              <button
                key={key}
                onClick={() => setTypeFilter(key)}
                className={`px-3 py-1.5 rounded-lg text-xs font-bold transition inline-flex items-center gap-1 ${
                  typeFilter === key ? cfg.tone + ' shadow-sm border-2' : 'bg-slate-100 text-slate-700 hover:bg-slate-200'
                }`}
              >
                <cfg.icon className="h-3 w-3" />
                {cfg.label}
              </button>
            ))}
          </div>
          <div className="flex gap-1 flex-wrap items-center">
            <span className="text-[10px] uppercase tracking-wider text-slate-500 font-bold mr-2">Date:</span>
            {[
              { v: 'all' as DateFilter, l: 'All Time' },
              { v: 'today' as DateFilter, l: 'Today' },
              { v: 'week' as DateFilter, l: 'Last 7 Days' },
              { v: 'month' as DateFilter, l: 'Last 30 Days' },
            ].map((opt) => (
              <button
                key={opt.v}
                onClick={() => setDateFilter(opt.v)}
                className={`px-3 py-1.5 rounded-lg text-xs font-bold transition ${
                  dateFilter === opt.v ? 'bg-blue-600 text-white shadow-sm' : 'bg-slate-100 text-slate-700 hover:bg-slate-200'
                }`}
              >
                {opt.l}
              </button>
            ))}
          </div>
        </div>
      </div>

      {/* ═══ TABLE ═══ */}
      <section className="rounded-3xl bg-white border border-slate-200 shadow-sm overflow-hidden">
        <div className="px-6 py-5 border-b border-slate-100">
          <h3 className="text-xl font-bold text-slate-900">All Movements</h3>
          <p className="text-sm text-slate-500">{filtered.length} of {movements.length} events</p>
        </div>

        {isLoading ? (
          <div className="p-6 space-y-2">
            {Array.from({ length: 5 }).map((_, i) => <div key={i} className="h-12 rounded-xl bg-slate-100 animate-pulse" />)}
          </div>
        ) : filtered.length === 0 ? (
          <div className="p-12 text-center">
            <Activity className="h-12 w-12 text-slate-300 mx-auto mb-2" />
            <h4 className="font-bold text-slate-900">No movements found</h4>
            <p className="text-xs text-slate-500 mt-1">Try different filter</p>
          </div>
        ) : (
          <div className="overflow-x-auto">
            <table className="min-w-full text-sm">
              <thead className="bg-slate-50 text-slate-700 border-b-2 border-slate-200">
                <tr>
                  <th className="text-left px-4 py-3 font-extrabold text-[10px] uppercase tracking-wider">Type</th>
                  <th className="text-left px-4 py-3 font-extrabold text-[10px] uppercase tracking-wider">Product</th>
                  <th className="text-right px-4 py-3 font-extrabold text-[10px] uppercase tracking-wider">Quantity</th>
                  <th className="text-right px-4 py-3 font-extrabold text-[10px] uppercase tracking-wider">Balance After</th>
                  <th className="text-left px-4 py-3 font-extrabold text-[10px] uppercase tracking-wider">Reference</th>
                  <th className="text-left px-4 py-3 font-extrabold text-[10px] uppercase tracking-wider">Date</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-100">
                {filtered.map((m: any) => {
                  const cfg = typeConfig[m.type as StockMovementType] ?? {
  label: m.type,
  tone: 'bg-slate-100 text-slate-700 border-slate-200',
  icon: Package,
  isPositive: m.quantity > 0,
  color: '#64748b',
};

const Icon = cfg.icon || Package;
                  const isPositive = m.quantity > 0;
                  return (
                    <tr key={m.id} className="hover:bg-slate-50 transition">
                      <td className="px-4 py-3">
                        <span className={`inline-flex items-center gap-1.5 rounded-full px-2.5 py-1 text-xs font-bold border ${cfg.tone}`}>
                          <Icon className="h-3 w-3" />
                          {cfg.label}
                        </span>
                      </td>
                      <td className="px-4 py-3">
                        <div className="font-bold text-slate-900">{m.product.name}</div>
                        <div className="text-xs text-slate-500 font-mono">{m.product.sku || '—'}</div>
                      </td>
                      <td className="px-4 py-3 text-right">
                        <span className={`font-extrabold text-base tabular-nums ${isPositive ? 'text-emerald-700' : 'text-rose-700'}`}>
                          {isPositive ? '+' : ''}{formatQty(m.quantity)} {m.product.unit}
                        </span>
                      </td>
                      <td className="px-4 py-3 text-right font-bold text-slate-900 tabular-nums">
                        {formatQty(m.balanceAfter)} {m.product.unit}
                      </td>
                      <td className="px-4 py-3 text-slate-700 font-mono text-xs">{m.reference || '—'}</td>
                      <td className="px-4 py-3 text-slate-500 text-xs">{formatDate(m.createdAt)}</td>
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

function StatCard({ label, value, icon: Icon, color }: any) {
  const colors: any = {
    blue: 'from-blue-500 to-blue-700 shadow-blue-500/30',
    violet: 'from-violet-500 to-purple-600 shadow-violet-500/30',
    emerald: 'from-emerald-500 to-emerald-700 shadow-emerald-500/30',
    rose: 'from-rose-500 to-rose-700 shadow-rose-500/30',
  };
  return (
    <div className="rounded-2xl bg-white border-2 border-slate-200 p-5 shadow-sm hover:shadow-md transition">
      <div className="flex items-center justify-between">
        <div>
          <div className="text-xs uppercase tracking-wider text-slate-500 font-bold">{label}</div>
          <div className="mt-2 text-2xl font-extrabold text-slate-900 tabular-nums">{value}</div>
        </div>
        <div className={`h-12 w-12 rounded-2xl bg-gradient-to-br ${colors[color]} text-white flex items-center justify-center shadow-lg`}>
          <Icon className="h-6 w-6" />
        </div>
      </div>
    </div>
  );
}
