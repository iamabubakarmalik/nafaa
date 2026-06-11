import { useState, useMemo } from 'react';
import { useQuery } from '@tanstack/react-query';
import {
  Activity, ArrowDown, ArrowUp, Search, X, Download,
  Calendar, Package, Filter, TrendingUp, TrendingDown,
} from 'lucide-react';
import { stockMovementsApi, type StockMovementType } from '@/api/stock-movements.api';

const formatDate = (value: string) =>
  new Intl.DateTimeFormat('en-PK', { dateStyle: 'medium', timeStyle: 'short' }).format(new Date(value));

const formatQty = (q: number) => q.toFixed(q % 1 === 0 ? 0 : 2);

const typeConfig: Record<StockMovementType, { label: string; tone: string; icon: typeof ArrowUp; isPositive: boolean }> = {
  PURCHASE_IN: { label: 'Purchase In', tone: 'bg-emerald-100 text-emerald-700', icon: ArrowUp, isPositive: true },
  SALE_OUT: { label: 'Sale Out', tone: 'bg-rose-100 text-rose-700', icon: ArrowDown, isPositive: false },
  ADJUSTMENT_IN: { label: 'Adjustment In', tone: 'bg-blue-100 text-blue-700', icon: ArrowUp, isPositive: true },
  ADJUSTMENT_OUT: { label: 'Adjustment Out', tone: 'bg-orange-100 text-orange-700', icon: ArrowDown, isPositive: false },
  RETURN_IN: { label: 'Return In', tone: 'bg-violet-100 text-violet-700', icon: ArrowUp, isPositive: true },
  OPENING_BALANCE: { label: 'Opening', tone: 'bg-slate-100 text-slate-700', icon: ArrowUp, isPositive: true },
};

type DateFilter = 'all' | 'today' | 'week' | 'month';

export default function StockMovementsPage() {
  const [search, setSearch] = useState('');
  const [typeFilter, setTypeFilter] = useState<StockMovementType | 'all'>('all');
  const [dateFilter, setDateFilter] = useState<DateFilter>('all');

  const { data: movements = [], isLoading } = useQuery({
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
    if (typeFilter !== 'all') {
      result = result.filter((m) => m.type === typeFilter);
    }
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
    const csv = [headers, ...rows].map((r) => r.map((c) => `"${c}"`).join(',')).join('\n');
    const blob = new Blob([csv], { type: 'text/csv' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = `stock-movements-${new Date().toISOString().slice(0, 10)}.csv`;
    a.click();
  };

  return (
    <div className="space-y-6">
      <section className="rounded-3xl bg-gradient-to-br from-slate-950 via-slate-900 to-blue-700 text-white p-6 shadow-2xl">
        <div>
          <div className="inline-flex items-center gap-2 rounded-full bg-white/10 px-3 py-1 text-xs font-semibold backdrop-blur">
            <Activity className="h-3.5 w-3.5 text-amber-300" /> Inventory Audit Trail
          </div>
          <h2 className="mt-3 text-3xl font-extrabold">Stock Movements</h2>
          <p className="mt-2 text-sm text-white/80">
            Har stock IN aur OUT ka complete record — har transaction trackable.
          </p>
        </div>
      </section>

      <section className="grid sm:grid-cols-2 xl:grid-cols-4 gap-4">
        <StatCard label="Today" value={stats.today} icon={Calendar} color="blue" />
        <StatCard label="Total Movements" value={stats.total} icon={Activity} color="violet" />
        <StatCard label="Total Stock In" value={`+${formatQty(stats.totalIn)}`} icon={TrendingUp} color="emerald" />
        <StatCard label="Total Stock Out" value={`−${formatQty(stats.totalOut)}`} icon={TrendingDown} color="rose" />
      </section>

      <div className="rounded-3xl bg-white border border-slate-200 shadow-sm p-4 space-y-3">
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
          {filtered.length > 0 && (
            <button onClick={exportCSV} className="h-11 px-4 rounded-xl border border-slate-200 hover:bg-slate-50 text-sm font-bold text-slate-700 inline-flex items-center gap-1.5">
              <Download className="h-4 w-4" /> Export
            </button>
          )}
        </div>
        <div className="space-y-2">
          <div className="flex gap-1 flex-wrap">
            <span className="text-[10px] uppercase tracking-wider text-slate-500 font-bold self-center mr-2">Type:</span>
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
                  typeFilter === key ? cfg.tone + ' shadow-sm' : 'bg-slate-100 text-slate-700 hover:bg-slate-200'
                }`}
              >
                <cfg.icon className="h-3 w-3" />
                {cfg.label}
              </button>
            ))}
          </div>
          <div className="flex gap-1 flex-wrap">
            <span className="text-[10px] uppercase tracking-wider text-slate-500 font-bold self-center mr-2">Date:</span>
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
            <div className="mx-auto h-16 w-16 rounded-3xl bg-slate-100 flex items-center justify-center">
              <Activity className="h-7 w-7 text-slate-400" />
            </div>
            <h4 className="mt-4 text-lg font-bold text-slate-900">
              {search || typeFilter !== 'all' || dateFilter !== 'all' ? 'No matches' : 'Abhi koi movement nahi'}
            </h4>
            <p className="text-xs text-slate-500 mt-1">
              {search || typeFilter !== 'all' || dateFilter !== 'all' ? 'Try different filter' : 'POS ya purchase se stock change ho to yahan record aayega'}
            </p>
          </div>
        ) : (
          <div className="overflow-x-auto">
            <table className="min-w-full text-sm">
              <thead className="bg-slate-50 text-slate-600">
                <tr>
                  <th className="text-left px-6 py-3 font-bold text-xs uppercase tracking-wider">Type</th>
                  <th className="text-left px-6 py-3 font-bold text-xs uppercase tracking-wider">Product</th>
                  <th className="text-right px-6 py-3 font-bold text-xs uppercase tracking-wider">Quantity</th>
                  <th className="text-right px-6 py-3 font-bold text-xs uppercase tracking-wider">Balance After</th>
                  <th className="text-left px-6 py-3 font-bold text-xs uppercase tracking-wider">Reference</th>
                  <th className="text-left px-6 py-3 font-bold text-xs uppercase tracking-wider">Date</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-100">
                {filtered.map((m: any) => {
                  const cfg = typeConfig[m.type as StockMovementType];
                  const Icon = cfg.icon;
                  const isPositive = m.quantity > 0;
                  return (
                    <tr key={m.id} className="hover:bg-slate-50 transition">
                      <td className="px-6 py-3">
                        <span className={`inline-flex items-center gap-1.5 rounded-full px-2.5 py-1 text-xs font-bold ${cfg.tone}`}>
                          <Icon className="h-3 w-3" />
                          {cfg.label}
                        </span>
                      </td>
                      <td className="px-6 py-3">
                        <div className="font-bold text-slate-900">{m.product.name}</div>
                        <div className="text-xs text-slate-500 font-mono">{m.product.sku || '—'}</div>
                      </td>
                      <td className="px-6 py-3 text-right">
                        <span className={`font-extrabold text-base ${isPositive ? 'text-emerald-700' : 'text-rose-700'}`}>
                          {isPositive ? '+' : ''}{formatQty(m.quantity)} {m.product.unit}
                        </span>
                      </td>
                      <td className="px-6 py-3 text-right font-bold text-slate-900">
                        {formatQty(m.balanceAfter)} {m.product.unit}
                      </td>
                      <td className="px-6 py-3 text-slate-700 font-mono text-xs">{m.reference || '—'}</td>
                      <td className="px-6 py-3 text-slate-500 text-xs">{formatDate(m.createdAt)}</td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>
        )}
      </section>
    </div>
  );
}

function StatCard({ label, value, icon: Icon, color }: any) {
  const colors: any = {
    blue: 'from-blue-500 to-blue-700 shadow-blue-500/30',
    violet: 'from-violet-500 to-violet-700 shadow-violet-500/30',
    emerald: 'from-emerald-500 to-emerald-700 shadow-emerald-500/30',
    rose: 'from-rose-500 to-rose-700 shadow-rose-500/30',
  };
  return (
    <div className="rounded-2xl bg-white border border-slate-200 p-5 shadow-sm">
      <div className="flex items-center justify-between">
        <div>
          <div className="text-xs uppercase tracking-wider text-slate-500 font-bold">{label}</div>
          <div className="mt-2 text-2xl font-extrabold text-slate-900">{value}</div>
        </div>
        <div className={`h-12 w-12 rounded-2xl bg-gradient-to-br ${colors[color]} text-white flex items-center justify-center shadow-lg`}>
          <Icon className="h-6 w-6" />
        </div>
      </div>
    </div>
  );
}
