import { useState, useMemo, useEffect, useRef } from 'react';
import { Link } from 'react-router-dom';
import { useQuery } from '@tanstack/react-query';
import {
  Activity, ArrowDown, ArrowUp, Search, X, Calendar, Package,
  TrendingUp, TrendingDown, FileSpreadsheet, RefreshCw, BarChart3,
  Printer, GraduationCap, CheckCircle2, Info, Filter, Zap,
} from 'lucide-react';
import {
  ResponsiveContainer, AreaChart, Area, PieChart, Pie, Cell,
  XAxis, YAxis, Tooltip, CartesianGrid, Legend,
} from 'recharts';
import { stockMovementsApi, type StockMovementType } from '@modules/inventory/stock-movements/api/stock-movements.api';
import { Button } from '@core/ui/Button';
import { useAuthStore } from '@core/stores/auth.store';

/* ═════════════════════════════════════════════════════════════
   NAFAA STOCK MOVEMENTS — GLOBAL FULL BEST v3
   ─────────────────────────────────────────────────────────────
   🌍 GLOBAL — har industry ka ledger same (IN/OUT rows)
   🌙 Dark mode complete
   🎓 Teacher modal — "audit trail kya hai" universal
   ⌨️  / = search • R = refresh • Esc = teacher band
   📅 Smart date presets • 🖨️ Print/PDF perfect
   ═════════════════════════════════════════════════════════════ */

const formatDate = (v: string) =>
  new Intl.DateTimeFormat('en-PK', { dateStyle: 'medium', timeStyle: 'short' }).format(new Date(v));

const formatDateShort = (v: string) =>
  new Intl.DateTimeFormat('en-PK', { month: 'short', day: 'numeric' }).format(new Date(v));

const formatQty = (q: number) => q.toFixed(q % 1 === 0 ? 0 : 2);

const typeConfig: Record<StockMovementType, { label: string; light: string; dark: string; icon: any; isPositive: boolean; color: string; emoji: string }> = {
  PURCHASE_IN: {
    label: 'Purchase',
    light: 'bg-emerald-100 text-emerald-700 border-emerald-200',
    dark: 'dark:bg-emerald-500/20 dark:text-emerald-300 dark:border-emerald-500/40',
    icon: ArrowUp, isPositive: true, color: '#10b981', emoji: '📦',
  },
  SALE_OUT: {
    label: 'Sale',
    light: 'bg-rose-100 text-rose-700 border-rose-200',
    dark: 'dark:bg-rose-500/20 dark:text-rose-300 dark:border-rose-500/40',
    icon: ArrowDown, isPositive: false, color: '#ef4444', emoji: '💰',
  },
  ADJUSTMENT_IN: {
    label: 'Adjustment +',
    light: 'bg-blue-100 text-blue-700 border-blue-200',
    dark: 'dark:bg-blue-500/20 dark:text-blue-300 dark:border-blue-500/40',
    icon: ArrowUp, isPositive: true, color: '#3b82f6', emoji: '➕',
  },
  ADJUSTMENT_OUT: {
    label: 'Adjustment −',
    light: 'bg-orange-100 text-orange-700 border-orange-200',
    dark: 'dark:bg-orange-500/20 dark:text-orange-300 dark:border-orange-500/40',
    icon: ArrowDown, isPositive: false, color: '#f97316', emoji: '➖',
  },
  RETURN_IN: {
    label: 'Return',
    light: 'bg-violet-100 text-violet-700 border-violet-200',
    dark: 'dark:bg-violet-500/20 dark:text-violet-300 dark:border-violet-500/40',
    icon: ArrowUp, isPositive: true, color: '#8b5cf6', emoji: '↩️',
  },
  OPENING_BALANCE: {
    label: 'Opening',
    light: 'bg-slate-100 text-slate-700 border-slate-200',
    dark: 'dark:bg-slate-700 dark:text-slate-200 dark:border-slate-600',
    icon: ArrowUp, isPositive: true, color: '#64748b', emoji: '🎬',
  },
};

type DateFilter = 'all' | 'today' | 'yesterday' | 'week' | 'month';

const DATE_PRESETS: { v: DateFilter; l: string }[] = [
  { v: 'today',     l: 'Aaj' },
  { v: 'yesterday', l: 'Kal' },
  { v: 'week',      l: '7 Din' },
  { v: 'month',     l: '30 Din' },
  { v: 'all',       l: 'Sab' },
];

export default function StockMovementsPage() {
  const tenantName = useAuthStore((s) => s.tenant?.name);
  const shopName = useAuthStore((s) => s.user?.assignedShop?.name);
  const searchRef = useRef<HTMLInputElement>(null);

  const [search, setSearch] = useState('');
  const [typeFilter, setTypeFilter] = useState<StockMovementType | 'all'>('all');
  const [dateFilter, setDateFilter] = useState<DateFilter>('week');
  const [showTeacher, setShowTeacher] = useState(false);

  const { data: movements = [], isLoading, refetch, isRefetching } = useQuery({
    queryKey: ['stock-movements'],
    queryFn: stockMovementsApi.list,
  });

  const filtered = useMemo(() => {
    let result = [...movements];
    const q = search.toLowerCase().trim();
    if (q) {
      result = result.filter((m: any) =>
        m.product?.name?.toLowerCase().includes(q) ||
        (m.reference || '').toLowerCase().includes(q) ||
        (m.product?.sku || '').toLowerCase().includes(q) ||
        (m.note || '').toLowerCase().includes(q),
      );
    }
    if (typeFilter !== 'all') result = result.filter((m) => m.type === typeFilter);
    if (dateFilter !== 'all') {
      const now = new Date();
      let cutoff = new Date();
      let end: Date | null = null;
      if (dateFilter === 'today') {
        cutoff.setHours(0, 0, 0, 0);
      } else if (dateFilter === 'yesterday') {
        cutoff.setDate(now.getDate() - 1);
        cutoff.setHours(0, 0, 0, 0);
        end = new Date(cutoff); end.setHours(23, 59, 59, 999);
      } else if (dateFilter === 'week') {
        cutoff.setDate(now.getDate() - 7);
      } else if (dateFilter === 'month') {
        cutoff.setMonth(now.getMonth() - 1);
      }
      result = result.filter((m: any) => {
        const d = new Date(m.createdAt);
        if (end) return d >= cutoff && d <= end;
        return d >= cutoff;
      });
    }
    return result;
  }, [movements, search, typeFilter, dateFilter]);

  const stats = useMemo(() => {
    const today = new Date().toDateString();
    const todayMovements = movements.filter((m: any) => new Date(m.createdAt).toDateString() === today);
    const totalIn = filtered.filter((m: any) => m.quantity > 0).reduce((s: number, m: any) => s + m.quantity, 0);
    const totalOut = filtered.filter((m: any) => m.quantity < 0).reduce((s: number, m: any) => s + Math.abs(m.quantity), 0);
    const netChange = totalIn - totalOut;
    // Biggest movement
    const biggest = [...filtered].sort((a: any, b: any) => Math.abs(b.quantity) - Math.abs(a.quantity))[0];
    return {
      total: movements.length,
      filtered: filtered.length,
      today: todayMovements.length,
      totalIn, totalOut, netChange,
      biggest,
    };
  }, [movements, filtered]);

  // 7-day trend
  const trendData = useMemo(() => {
    const buckets: Record<string, { date: string; label: string; in: number; out: number }> = {};
    for (let i = 6; i >= 0; i--) {
      const d = new Date();
      d.setDate(d.getDate() - i);
      d.setHours(0, 0, 0, 0);
      const key = d.toISOString().slice(0, 10);
      buckets[key] = { date: key, label: formatDateShort(d.toISOString()), in: 0, out: 0 };
    }
    for (const m of movements as any[]) {
      const key = new Date(m.createdAt).toISOString().slice(0, 10);
      if (buckets[key]) {
        if (m.quantity > 0) buckets[key].in += m.quantity;
        else buckets[key].out += Math.abs(m.quantity);
      }
    }
    return Object.values(buckets);
  }, [movements]);

  // Type breakdown
  const typeBreakdown = useMemo(() => {
    const map = new Map<string, number>();
    for (const m of movements as any[]) {
      map.set(m.type, (map.get(m.type) || 0) + 1);
    }
    return Array.from(map.entries())
      .sort((a, b) => b[1] - a[1])
      .map(([type, count]) => ({
        name: typeConfig[type as StockMovementType]?.label || type,
        value: count,
        color: typeConfig[type as StockMovementType]?.color || '#64748b',
      }));
  }, [movements]);

  const typeCounts = useMemo(() => {
    const m: Record<string, number> = { all: movements.length };
    (movements as any[]).forEach((mov) => { m[mov.type] = (m[mov.type] || 0) + 1; });
    return m;
  }, [movements]);

  const exportCSV = () => {
    if (filtered.length === 0) return;
    const summary = [
      [`Stock Movements — ${tenantName || 'Nafaa'}`],
      [`Shop: ${shopName || 'All'}  •  Generated: ${new Date().toLocaleString('en-PK')}`],
      [`Total: ${filtered.length}  •  IN: +${formatQty(stats.totalIn)}  •  OUT: -${formatQty(stats.totalOut)}  •  Net: ${stats.netChange > 0 ? '+' : ''}${formatQty(stats.netChange)}`],
      [''],
    ];
    const headers = ['Date', 'Type', 'Product', 'SKU', 'Quantity', 'Balance After', 'Reference', 'Note'];
    const rows = filtered.map((m: any) => [
      new Date(m.createdAt).toLocaleString('en-PK'),
      typeConfig[m.type as StockMovementType]?.label || m.type,
      m.product?.name || '',
      m.product?.sku || '',
      formatQty(m.quantity),
      formatQty(m.balanceAfter),
      m.reference || '',
      m.note || '',
    ]);
    const csv = [...summary, headers, ...rows].map((r) => r.map((c) => `"${String(c).replace(/"/g, '""')}"`).join(',')).join('\n');
    const blob = new Blob(['\ufeff' + csv], { type: 'text/csv;charset=utf-8' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = `stock-movements-${new Date().toISOString().slice(0, 10)}.csv`;
    a.click();
    URL.revokeObjectURL(url);
  };

  /* Keyboard shortcuts */
  useEffect(() => {
    const onKey = (e: KeyboardEvent) => {
      if (e.key === 'Escape' && showTeacher) return setShowTeacher(false);
      const tag = document.activeElement?.tagName;
      if (tag === 'INPUT' || tag === 'TEXTAREA' || tag === 'SELECT') return;
      if (e.key === '/') { e.preventDefault(); searchRef.current?.focus(); }
      if (e.key.toLowerCase() === 'r') { e.preventDefault(); refetch(); }
    };
    window.addEventListener('keydown', onKey);
    return () => window.removeEventListener('keydown', onKey);
  }, [showTeacher, refetch]);

  /* Body scroll lock */
  useEffect(() => {
    const prev = document.body.style.overflow;
    document.body.style.overflow = showTeacher ? 'hidden' : prev;
    return () => { document.body.style.overflow = prev; };
  }, [showTeacher]);

  const hasFilters = !!search || typeFilter !== 'all' || dateFilter !== 'week';
  const clearFilters = () => { setSearch(''); setTypeFilter('all'); setDateFilter('week'); };
  const printDate = new Date().toLocaleString('en-PK', { dateStyle: 'full', timeStyle: 'short' });

  return (
    <div className="space-y-4 sm:space-y-5 pb-10 print:space-y-3">
      {showTeacher && <MovementsTeacher onClose={() => setShowTeacher(false)} />}

      {/* ═══ PRINT-ONLY HEADER ═══ */}
      <div className="hidden print:block">
        <div className="border-b-4 border-blue-600 pb-3 mb-4">
          <h1 className="text-2xl font-black text-slate-900 leading-tight">
            📊 {tenantName || 'My Store'} — Stock Movements
          </h1>
          <p className="text-xs text-slate-600 font-semibold mt-1">
            {shopName ? `Shop: ${shopName}  •  ` : ''}{filtered.length} movements • IN: +{formatQty(stats.totalIn)} • OUT: -{formatQty(stats.totalOut)}
          </p>
          <p className="text-xs text-slate-500 mt-0.5">Generated: {printDate}</p>
        </div>
      </div>

      {/* ═══ HERO ═══ */}
      <section className="relative overflow-hidden rounded-2xl sm:rounded-3xl bg-gradient-to-br from-slate-950 via-blue-900 to-cyan-700 dark:from-slate-950 dark:via-blue-950 dark:to-cyan-900 text-white p-4 sm:p-6 shadow-2xl print:hidden">
        <div className="absolute -top-24 -right-24 h-72 w-72 rounded-full bg-blue-400/25 blur-3xl pointer-events-none animate-pulse" />
        <div className="absolute -bottom-24 -left-24 h-72 w-72 rounded-full bg-cyan-400/20 blur-3xl pointer-events-none" />

        <div className="relative flex items-start justify-between gap-4 flex-wrap">
          <div className="min-w-0 flex-1">
            <div className="inline-flex items-center gap-2 rounded-full bg-white/15 backdrop-blur-md px-3 py-1 text-[11px] font-extrabold border border-white/25 uppercase tracking-widest shadow-lg">
              <Activity className="h-3.5 w-3.5 text-amber-300" /> Audit Trail
              {shopName && (
                <>
                  <span className="opacity-40">•</span>
                  <span className="text-cyan-200">🏪 {shopName}</span>
                </>
              )}
            </div>
            <h1 className="mt-3 text-2xl sm:text-3xl lg:text-4xl font-extrabold leading-tight">📊 Stock Movements</h1>
            <p className="mt-1.5 text-xs sm:text-sm text-white/90 font-semibold">
              <strong className="text-cyan-200">{stats.total}</strong> total
              <span className="opacity-50 mx-1.5">•</span>
              <strong className="text-amber-300">{stats.today}</strong> aaj
              <span className="opacity-50 mx-1.5">•</span>
              Net <strong className={stats.netChange >= 0 ? 'text-emerald-300' : 'text-rose-300'}>
                {stats.netChange > 0 ? '+' : ''}{formatQty(stats.netChange)}
              </strong>
            </p>
          </div>
          <div className="flex gap-2 flex-wrap items-center shrink-0">
            <button
              onClick={() => setShowTeacher(true)}
              className="h-11 px-3 rounded-xl bg-amber-400/90 hover:bg-amber-400 text-slate-900 text-xs font-extrabold inline-flex items-center gap-1.5 shadow-lg transition"
              title="Kaise kaam karta hai?"
            >
              <GraduationCap className="h-4 w-4" /> <span className="hidden sm:inline">Guide</span>
            </button>
            <button
              onClick={() => refetch()}
              disabled={isRefetching}
              className="h-11 px-3 rounded-xl bg-white/15 hover:bg-white/25 border border-white/25 text-xs font-extrabold inline-flex items-center gap-1.5 backdrop-blur-md disabled:opacity-50 transition"
            >
              <RefreshCw className={`h-4 w-4 ${isRefetching ? 'animate-spin' : ''}`} />
              <span className="hidden sm:inline">Refresh</span>
            </button>
            <button
              onClick={() => window.print()}
              className="h-11 px-3 rounded-xl bg-white/15 hover:bg-white/25 border border-white/25 text-xs font-extrabold inline-flex items-center gap-1.5 backdrop-blur-md transition"
            >
              <Printer className="h-4 w-4" /> <span className="hidden sm:inline">Print</span>
            </button>
            <button
              onClick={exportCSV}
              disabled={filtered.length === 0}
              className="h-11 px-3 rounded-xl bg-white text-slate-900 hover:bg-slate-100 text-xs font-extrabold inline-flex items-center gap-1.5 shadow-2xl transition disabled:opacity-50"
            >
              <FileSpreadsheet className="h-4 w-4" /> <span className="hidden sm:inline">CSV</span>
            </button>
          </div>
        </div>

        {/* Biggest movement callout */}
        {stats.biggest && (
          <div className="relative mt-4 rounded-xl bg-white/10 backdrop-blur-md border border-white/20 p-3 flex items-center gap-3 flex-wrap">
            <div className="h-9 w-9 rounded-xl bg-amber-500 flex items-center justify-center shrink-0 shadow-lg">
              <Zap className="h-4 w-4" />
            </div>
            <div className="flex-1 min-w-0">
              <div className="text-[10px] uppercase font-extrabold text-white/70 tracking-wider">Sab se bara movement</div>
              <div className="font-extrabold text-sm truncate">
                {stats.biggest.product?.name} — <span className={stats.biggest.quantity > 0 ? 'text-emerald-300' : 'text-rose-300'}>
                  {stats.biggest.quantity > 0 ? '+' : ''}{formatQty(stats.biggest.quantity)} {stats.biggest.product?.unit}
                </span>
                <span className="text-white/60 text-xs font-semibold ml-1">
                  ({typeConfig[stats.biggest.type as StockMovementType]?.label})
                </span>
              </div>
            </div>
          </div>
        )}

        {/* Keyboard hints */}
        <div className="relative mt-3 hidden sm:flex flex-wrap gap-1.5 text-[10px] font-bold items-center">
          <Kbd>/</Kbd><span className="text-white/60">Search</span>
          <span className="text-white/30 mx-1">•</span>
          <Kbd>R</Kbd><span className="text-white/60">Refresh</span>
        </div>
      </section>

      {/* ═══ KPIs ═══ */}
      <section className="grid grid-cols-2 xl:grid-cols-4 gap-2 sm:gap-3">
        <Kpi icon={Calendar} tone="blue" label="Aaj" value={stats.today} sub="Movements today" />
        <Kpi icon={TrendingUp} tone="emerald" label="Stock IN" value={`+${formatQty(stats.totalIn)}`} sub="Filtered range" />
        <Kpi icon={TrendingDown} tone="rose" label="Stock OUT" value={`−${formatQty(stats.totalOut)}`} sub="Filtered range" />
        <Kpi
          icon={Activity} tone="violet"
          label="Net Change"
          value={`${stats.netChange > 0 ? '+' : ''}${formatQty(stats.netChange)}`}
          sub={stats.netChange > 0 ? '📈 Stock barh raha' : stats.netChange < 0 ? '📉 Stock kam ho raha' : 'Balanced'}
          isPositive={stats.netChange > 0}
          isNegative={stats.netChange < 0}
        />
      </section>

      {/* ═══ CHARTS ═══ */}
      {movements.length > 0 && (
        <section className="grid lg:grid-cols-[1.5fr_1fr] gap-4 print:hidden">
          <div className="rounded-2xl sm:rounded-3xl bg-white dark:bg-slate-900/80 dark:backdrop-blur-sm border-2 border-slate-200 dark:border-slate-800 shadow-sm p-5">
            <div className="flex items-center justify-between mb-4">
              <div>
                <h3 className="text-base font-extrabold text-slate-900 dark:text-white">7-Din Movement Trend</h3>
                <p className="text-[11px] text-slate-500 dark:text-slate-400 font-semibold">Stock IN vs OUT daily</p>
              </div>
              <BarChart3 className="h-5 w-5 text-blue-500" />
            </div>
            <div className="h-[260px]">
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
                  <CartesianGrid strokeDasharray="3 3" stroke="#e2e8f0" className="dark:opacity-20" />
                  <XAxis dataKey="label" stroke="#64748b" fontSize={11} />
                  <YAxis stroke="#64748b" fontSize={11} />
                  <Tooltip contentStyle={{ borderRadius: 12, border: '2px solid #e2e8f0' }} />
                  <Legend wrapperStyle={{ fontSize: 12 }} />
                  <Area type="monotone" dataKey="in" name="Stock IN" stroke="#10b981" fill="url(#inGrad)" strokeWidth={2.5} />
                  <Area type="monotone" dataKey="out" name="Stock OUT" stroke="#ef4444" fill="url(#outGrad)" strokeWidth={2.5} />
                </AreaChart>
              </ResponsiveContainer>
            </div>
          </div>

          <div className="rounded-2xl sm:rounded-3xl bg-white dark:bg-slate-900/80 dark:backdrop-blur-sm border-2 border-slate-200 dark:border-slate-800 shadow-sm p-5">
            <div className="flex items-center justify-between mb-4">
              <div>
                <h3 className="text-base font-extrabold text-slate-900 dark:text-white">Type Breakdown</h3>
                <p className="text-[11px] text-slate-500 dark:text-slate-400 font-semibold">Movement types split</p>
              </div>
              <Filter className="h-5 w-5 text-violet-500" />
            </div>
            {typeBreakdown.length > 0 ? (
              <div className="h-[260px]">
                <ResponsiveContainer width="100%" height="100%">
                  <PieChart>
                    <Pie
                      data={typeBreakdown}
                      cx="50%" cy="45%" outerRadius={85} innerRadius={42}
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
              <div className="h-[260px] flex items-center justify-center text-sm text-slate-500 dark:text-slate-400 font-semibold">
                Koi data nahi
              </div>
            )}
          </div>
        </section>
      )}

      {/* ═══ TOOLBAR ═══ */}
      <section className="rounded-2xl sm:rounded-3xl bg-white dark:bg-slate-900/80 dark:backdrop-blur-sm border-2 border-slate-200 dark:border-slate-800 shadow-sm p-4 space-y-3 print:hidden">
        <div className="flex gap-2 flex-wrap">
          <div className="relative flex-1 min-w-[240px]">
            <Search className="h-5 w-5 text-slate-400 absolute left-3.5 top-1/2 -translate-y-1/2 pointer-events-none" />
            <input
              ref={searchRef}
              value={search}
              onChange={(e) => setSearch(e.target.value)}
              placeholder="Product, SKU, reference, note... (/ shortcut)"
              className="h-12 w-full rounded-2xl border-2 border-slate-200 dark:border-slate-700 bg-white dark:bg-slate-800 pl-11 pr-10 text-sm font-semibold text-slate-900 dark:text-white placeholder:text-slate-400 dark:placeholder:text-slate-500 focus:outline-none focus:border-blue-500 focus:ring-2 focus:ring-blue-200 dark:focus:ring-blue-500/30 transition"
            />
            {search && (
              <button onClick={() => setSearch('')} className="absolute right-3 top-1/2 -translate-y-1/2 h-7 w-7 rounded-lg hover:bg-slate-100 dark:hover:bg-slate-700 flex items-center justify-center">
                <X className="h-4 w-4 text-slate-400" />
              </button>
            )}
          </div>
        </div>

        {/* Date presets */}
        <div className="flex gap-2 flex-wrap items-center">
          <div className="flex gap-1 bg-slate-100 dark:bg-slate-800 rounded-xl p-1 items-center">
            <Calendar className="h-3.5 w-3.5 text-slate-400 ml-1.5 shrink-0" />
            {DATE_PRESETS.map((o) => (
              <button
                key={o.v}
                onClick={() => setDateFilter(o.v)}
                className={`px-2.5 py-1.5 rounded-lg text-[11px] font-extrabold transition whitespace-nowrap ${
                  dateFilter === o.v ? 'bg-blue-600 text-white shadow-sm' : 'text-slate-600 dark:text-slate-400 hover:text-slate-900 dark:hover:text-white'
                }`}
              >
                {o.l}
              </button>
            ))}
          </div>

          {hasFilters && (
            <button
              onClick={clearFilters}
              className="text-xs font-extrabold text-rose-600 dark:text-rose-400 hover:text-rose-700 inline-flex items-center gap-1 transition"
            >
              <X className="h-3 w-3" /> Filters clear
            </button>
          )}

          <div className="ml-auto text-xs font-extrabold text-slate-500 dark:text-slate-400 tabular-nums">
            {filtered.length} / {movements.length} movements
          </div>
        </div>

        {/* Type pills */}
        <div className="flex gap-1.5 flex-wrap items-center">
          <button
            onClick={() => setTypeFilter('all')}
            className={`px-3 py-1.5 rounded-lg text-xs font-extrabold transition ${
              typeFilter === 'all' ? 'bg-slate-900 dark:bg-white text-white dark:text-slate-900 shadow-sm' : 'bg-slate-100 dark:bg-slate-800 text-slate-700 dark:text-slate-300 hover:bg-slate-200 dark:hover:bg-slate-700'
            }`}
          >
            Sab <span className={`ml-1 tabular-nums ${typeFilter === 'all' ? 'opacity-70' : 'text-slate-400 dark:text-slate-500'}`}>{typeCounts.all}</span>
          </button>
          {(Object.entries(typeConfig) as [StockMovementType, any][]).map(([key, cfg]) => {
            const count = typeCounts[key] || 0;
            if (count === 0) return null;
            const active = typeFilter === key;
            return (
              <button
                key={key}
                onClick={() => setTypeFilter(key)}
                className={`px-3 py-1.5 rounded-lg text-xs font-extrabold transition inline-flex items-center gap-1 border ${
                  active ? `${cfg.light} ${cfg.dark} shadow-sm ring-2` : 'bg-white dark:bg-slate-800 border-slate-200 dark:border-slate-700 text-slate-700 dark:text-slate-300 hover:border-slate-300 dark:hover:border-slate-600'
                }`}
              >
                <span>{cfg.emoji}</span>
                {cfg.label}
                <span className={`ml-0.5 tabular-nums ${active ? 'opacity-70' : 'text-slate-400 dark:text-slate-500'}`}>{count}</span>
              </button>
            );
          })}
        </div>
      </section>

      {/* ═══ TABLE ═══ */}
      <section className="rounded-2xl sm:rounded-3xl bg-white dark:bg-slate-900/80 dark:backdrop-blur-sm border-2 border-slate-200 dark:border-slate-800 shadow-sm overflow-hidden print:border-0 print:rounded-none print:shadow-none">
        <div className="px-5 sm:px-6 py-4 border-b-2 border-slate-100 dark:border-slate-800 flex items-center justify-between flex-wrap gap-2 print:hidden">
          <div>
            <h3 className="text-lg font-extrabold text-slate-900 dark:text-white">Sab Movements</h3>
            <p className="text-xs text-slate-500 dark:text-slate-400 font-semibold">
              {filtered.length} events dikh rahi hain
            </p>
          </div>
        </div>

        {isLoading ? (
          <div className="p-6 space-y-2">
            {Array.from({ length: 5 }).map((_, i) => <div key={i} className="h-14 rounded-xl bg-slate-100 dark:bg-slate-800 animate-pulse" />)}
          </div>
        ) : filtered.length === 0 ? (
          <div className="p-12 sm:p-16 text-center">
            <div className="mx-auto h-16 w-16 rounded-3xl bg-gradient-to-br from-blue-100 to-cyan-200 dark:from-blue-500/20 dark:to-cyan-500/20 flex items-center justify-center">
              <Activity className="h-8 w-8 text-blue-600 dark:text-blue-400" />
            </div>
            <h4 className="mt-4 text-lg font-extrabold text-slate-900 dark:text-white">
              {hasFilters ? 'Filter me kuch nahi mila' : 'Koi movement record nahi'}
            </h4>
            <p className="text-sm text-slate-500 dark:text-slate-400 mt-1.5 font-semibold max-w-md mx-auto">
              {hasFilters
                ? 'Date range badhao ya filters clear karo'
                : 'Sales aur purchases ke saath movements automatic record hote hain — abhi shuruwat karo'}
            </p>
            {hasFilters && (
              <Button variant="secondary" className="mt-4 font-extrabold" onClick={clearFilters}>
                <X className="h-4 w-4" /> Filters Clear
              </Button>
            )}
          </div>
        ) : (
          <div className="overflow-x-auto">
            <table className="min-w-full text-sm print:text-[10px]">
              <thead className="bg-slate-50 dark:bg-slate-800/60 border-b-2 border-slate-200 dark:border-slate-700">
                <tr>
                  <th className="text-left px-4 py-3 text-[10px] font-extrabold uppercase tracking-wider text-slate-700 dark:text-slate-300">Type</th>
                  <th className="text-left px-4 py-3 text-[10px] font-extrabold uppercase tracking-wider text-slate-700 dark:text-slate-300">Product</th>
                  <th className="text-right px-4 py-3 text-[10px] font-extrabold uppercase tracking-wider text-slate-700 dark:text-slate-300">Quantity</th>
                  <th className="text-right px-4 py-3 text-[10px] font-extrabold uppercase tracking-wider text-slate-700 dark:text-slate-300">Balance After</th>
                  <th className="text-left px-4 py-3 text-[10px] font-extrabold uppercase tracking-wider text-slate-700 dark:text-slate-300">Reference</th>
                  <th className="text-left px-4 py-3 text-[10px] font-extrabold uppercase tracking-wider text-slate-700 dark:text-slate-300">Date</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-100 dark:divide-slate-800">
                {filtered.map((m: any) => {
                  const cfg = typeConfig[m.type as StockMovementType] ?? {
                    label: m.type,
                    light: 'bg-slate-100 text-slate-700 border-slate-200',
                    dark: 'dark:bg-slate-700 dark:text-slate-200 dark:border-slate-600',
                    icon: Package,
                    isPositive: m.quantity > 0,
                    color: '#64748b',
                    emoji: '📦',
                  };
                  const Icon = cfg.icon || Package;
                  const isPositive = m.quantity > 0;
                  return (
                    <tr key={m.id} className="hover:bg-blue-50/40 dark:hover:bg-blue-500/5 transition">
                      <td className="px-4 py-3">
                        <span className={`inline-flex items-center gap-1.5 rounded-full px-2.5 py-1 text-xs font-extrabold border ${cfg.light} ${cfg.dark}`}>
                          <Icon className="h-3 w-3" />
                          {cfg.label}
                        </span>
                      </td>
                      <td className="px-4 py-3">
                        <Link to={`/products/${m.productId}`} className="hover:underline">
                          <div className="font-extrabold text-slate-900 dark:text-white">{m.product?.name}</div>
                          <div className="text-[10px] text-slate-500 dark:text-slate-400 font-mono">{m.product?.sku || '—'}</div>
                        </Link>
                      </td>
                      <td className="px-4 py-3 text-right">
                        <span className={`font-extrabold text-base tabular-nums ${
                          isPositive ? 'text-emerald-700 dark:text-emerald-400' : 'text-rose-700 dark:text-rose-400'
                        }`}>
                          {isPositive ? '+' : ''}{formatQty(m.quantity)} <span className="text-[10px] text-slate-500 dark:text-slate-400 font-bold">{m.product?.unit}</span>
                        </span>
                      </td>
                      <td className="px-4 py-3 text-right font-bold text-slate-900 dark:text-white tabular-nums">
                        {formatQty(m.balanceAfter)} <span className="text-[10px] text-slate-500 dark:text-slate-400 font-bold">{m.product?.unit}</span>
                      </td>
                      <td className="px-4 py-3 text-slate-700 dark:text-slate-300 font-mono text-xs">{m.reference || '—'}</td>
                      <td className="px-4 py-3 text-slate-500 dark:text-slate-400 text-xs font-semibold">{formatDate(m.createdAt)}</td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>
        )}
      </section>

      {/* ═══ PRINT CSS ═══ */}
      <style>{`
        @media print {
          @page { size: A4 landscape; margin: 10mm 8mm; }
          html, body {
            background: white !important; color: #0f172a !important;
            print-color-adjust: exact !important; -webkit-print-color-adjust: exact !important;
          }
          .dark body, .dark { background: white !important; color: #0f172a !important; }
          .print\\:hidden { display: none !important; }
          .print\\:block { display: block !important; }
          section, div { box-shadow: none !important; }
          [class*="fixed"] { display: none !important; }
          html, body, #root { height: auto !important; min-height: 0 !important; overflow: visible !important; }
          [class*="sidebar"], [class*="topbar"], nav[class*="fixed"] { display: none !important; }
          table { font-size: 9px !important; border-collapse: collapse !important; width: 100% !important; }
          thead { display: table-header-group !important; }
          thead th { background: #0ea5e9 !important; color: white !important; padding: 5px 4px !important; font-size: 8px !important; font-weight: 800 !important; border: 1px solid #0284c7 !important; }
          tbody tr { page-break-inside: avoid !important; }
          tbody td { padding: 5px 4px !important; border: 1px solid #e2e8f0 !important; color: #0f172a !important; }
          tbody tr:nth-child(even) td { background: #f8fafc !important; }
          .text-emerald-700, [class*="emerald-400"] { color: #047857 !important; }
          .text-rose-700, [class*="rose-400"] { color: #be123c !important; }
          [data-sonner-toaster], [data-sonner-toast], [class*="Toaster"] { display: none !important; visibility: hidden !important; }
        }
      `}</style>
    </div>
  );
}

/* ═════════════════════════════════════════════════════════════
   MOVEMENTS TEACHER — Universal guide
   ═════════════════════════════════════════════════════════════ */
function MovementsTeacher({ onClose }: { onClose: () => void }) {
  return (
    <div
      className="fixed inset-0 z-50 bg-black/60 backdrop-blur-sm flex items-end sm:items-center justify-center p-3"
      onClick={onClose}
    >
      <div
        className="w-full max-w-lg max-h-[90vh] overflow-y-auto rounded-3xl bg-white dark:bg-slate-900 border-2 border-blue-300 dark:border-blue-500/40 shadow-2xl"
        onClick={(e) => e.stopPropagation()}
      >
        <div className="px-5 py-3 border-b-2 border-blue-200 dark:border-blue-500/30 bg-gradient-to-r from-blue-50 to-cyan-50 dark:from-blue-500/15 dark:to-cyan-500/15 flex items-center justify-between sticky top-0 z-10">
          <h3 className="font-extrabold text-blue-900 dark:text-blue-200 flex items-center gap-2">
            <GraduationCap className="h-5 w-5" /> Stock Movements — Guide
          </h3>
          <button onClick={onClose} className="h-8 w-8 rounded-lg hover:bg-white dark:hover:bg-slate-800 flex items-center justify-center transition">
            <X className="h-4 w-4 text-slate-600 dark:text-slate-300" />
          </button>
        </div>

        <div className="p-5 space-y-4">
          <p className="text-sm font-semibold text-slate-700 dark:text-slate-200 leading-relaxed">
            Ye <strong>stock ka poora hisaab-kitab</strong> hai — har baar jab maal andar aata hai
            ya bahar jata hai, yahan record ho jata hai <strong>automatic</strong>. Kuch bhi manually
            nahi karna!
          </p>

          <div className="rounded-2xl border-2 border-blue-200 dark:border-blue-500/30 bg-blue-50/60 dark:bg-blue-500/5 p-4 space-y-2 text-xs font-semibold text-slate-700 dark:text-slate-200">
            <div className="text-[10px] uppercase tracking-widest font-extrabold text-blue-700 dark:text-blue-300 mb-1">
              📋 6 Types ka Ledger
            </div>
            <TypeRow emoji="📦" label="Purchase" color="text-emerald-700 dark:text-emerald-400" desc="Supplier se maal aaya → stock +" />
            <TypeRow emoji="💰" label="Sale" color="text-rose-700 dark:text-rose-400" desc="Customer ko bika → stock −" />
            <TypeRow emoji="➕" label="Adjustment +" color="text-blue-700 dark:text-blue-400" desc="Manually barhaya (ganti-mistake fix)" />
            <TypeRow emoji="➖" label="Adjustment −" color="text-orange-700 dark:text-orange-400" desc="Manually kam (damage, chori, kharaab)" />
            <TypeRow emoji="↩️" label="Return" color="text-violet-700 dark:text-violet-400" desc="Customer ne wapas kiya → stock +" />
            <TypeRow emoji="🎬" label="Opening" color="text-slate-700 dark:text-slate-300" desc="Product banate waqt initial stock" />
          </div>

          <div className="rounded-xl bg-slate-50 dark:bg-slate-800/60 border border-slate-200 dark:border-slate-700 p-3 space-y-1.5 text-xs font-semibold text-slate-700 dark:text-slate-200">
            <TipRow><strong>Balance After</strong> — us movement ke baad us product ka total stock</TipRow>
            <TipRow><strong>Reference</strong> — sale/purchase ka number, click karke original bill dekh sakte ho</TipRow>
            <TipRow><strong>Sab se bara movement</strong> hero me highlight — kaunsa event sab se important tha</TipRow>
            <TipRow><strong>Kab check karein?</strong> — jab stock number galat lage, "kal 50 tha, aaj 40 kaise?" → yahan pura history</TipRow>
            <TipRow><strong>⌨️ /</strong> — search &nbsp;•&nbsp; <strong>R</strong> — refresh</TipRow>
          </div>

          <div className="rounded-xl bg-amber-50 dark:bg-amber-500/10 border-2 border-amber-200 dark:border-amber-500/40 p-3 text-xs font-semibold text-amber-900 dark:text-amber-200">
            💡 <strong>Ye read-only hai</strong> — yahan se kuch add/edit nahi hota. Stock change ke liye
            Sales/Purchases/Adjustments use karo — record khud yahan aa jayega.
          </div>

          <Button
            className="w-full bg-gradient-to-r from-blue-600 to-cyan-600 hover:from-blue-700 hover:to-cyan-700 font-extrabold shadow-lg shadow-blue-500/40 h-12"
            onClick={onClose}
          >
            <CheckCircle2 className="h-4 w-4" /> Samajh Gaya!
          </Button>
        </div>
      </div>
    </div>
  );
}

function TypeRow({ emoji, label, color, desc }: { emoji: string; label: string; color: string; desc: string }) {
  return (
    <div className="flex items-start gap-2 rounded-lg bg-white dark:bg-slate-800 border border-blue-100 dark:border-blue-500/20 p-2">
      <span className="text-base shrink-0">{emoji}</span>
      <div className="min-w-0 flex-1">
        <div className={`text-xs font-extrabold ${color}`}>{label}</div>
        <div className="text-[10px] text-slate-600 dark:text-slate-400 font-semibold">{desc}</div>
      </div>
    </div>
  );
}

function TipRow({ children }: { children: React.ReactNode }) {
  return (
    <div className="flex items-start gap-2">
      <CheckCircle2 className="h-3.5 w-3.5 text-emerald-500 shrink-0 mt-0.5" />
      <span>{children}</span>
    </div>
  );
}

function Kbd({ children }: { children: React.ReactNode }) {
  return (
    <kbd className="px-1.5 py-0.5 rounded bg-white/15 border border-white/25 text-white font-mono font-bold shadow-sm">
      {children}
    </kbd>
  );
}

function Kpi({ icon: Icon, label, value, sub, tone, isPositive, isNegative }: any) {
  const tones: Record<string, string> = {
    blue: 'from-blue-500 to-blue-700 shadow-blue-500/40',
    emerald: 'from-emerald-500 to-emerald-700 shadow-emerald-500/40',
    rose: 'from-rose-500 to-rose-700 shadow-rose-500/40',
    violet: 'from-violet-500 to-purple-600 shadow-violet-500/40',
  };
  return (
    <div className={[
      'rounded-2xl bg-white dark:bg-slate-900/80 dark:backdrop-blur-sm border-2 p-3 sm:p-4 shadow-sm transition-all',
      isPositive ? 'border-emerald-300 dark:border-emerald-500/40' : isNegative ? 'border-rose-300 dark:border-rose-500/40' : 'border-slate-200 dark:border-slate-800',
    ].join(' ')}>
      <div className="flex items-center justify-between gap-2">
        <div className="min-w-0">
          <div className="text-[10px] uppercase tracking-widest text-slate-500 dark:text-slate-400 font-extrabold">{label}</div>
          <div className="mt-1.5 text-xl sm:text-2xl font-extrabold text-slate-900 dark:text-white tabular-nums truncate">{value}</div>
          {sub && <div className="text-[10px] text-slate-500 dark:text-slate-400 font-bold mt-0.5 truncate">{sub}</div>}
        </div>
        <div className={`h-11 w-11 rounded-2xl bg-gradient-to-br ${tones[tone]} text-white flex items-center justify-center shadow-lg shrink-0`}>
          <Icon className="h-5 w-5" />
        </div>
      </div>
    </div>
  );
}
