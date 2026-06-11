import { useMemo, useState } from 'react';
import { useQuery } from '@tanstack/react-query';
import { Link } from 'react-router-dom';
import {
  AlertTriangle, Package, ShoppingBag, ArrowRight, Search, X,
  Download, RefreshCw, Edit3, Filter,
} from 'lucide-react';
import { productsApi } from '@/api/products.api';
import { formatPKR } from '@/lib/format';
import { Button } from '@/components/ui/Button';
import { toast } from 'sonner';

const formatQty = (qty: number) => qty.toFixed(qty % 1 === 0 ? 0 : 2);

type Filter = 'all' | 'critical' | 'warning';

export default function LowStockPage() {
  const [search, setSearch] = useState('');
  const [filter, setFilter] = useState<Filter>('all');

  const { data: lowStock = [], isLoading, refetch, isRefetching } = useQuery({
    queryKey: ['products-low-stock'],
    queryFn: productsApi.lowStock,
  });

  const filtered = useMemo(() => {
    let result = [...lowStock];
    const q = search.toLowerCase().trim();
    if (q) {
      result = result.filter((p: any) =>
        p.name.toLowerCase().includes(q) ||
        (p.sku || '').toLowerCase().includes(q) ||
        (p.barcode || '').toLowerCase().includes(q)
      );
    }
    if (filter === 'critical') result = result.filter((p: any) => p.stock === 0);
    else if (filter === 'warning') result = result.filter((p: any) => p.stock > 0);
    return result;
  }, [lowStock, search, filter]);

  const stats = useMemo(() => {
    const critical = lowStock.filter((p: any) => p.stock === 0).length;
    const warning = lowStock.filter((p: any) => p.stock > 0).length;
    const totalValue = lowStock.reduce((s: number, p: any) => s + (p.price * p.stock), 0);
    return { critical, warning, total: lowStock.length, totalValue };
  }, [lowStock]);

  const exportCSV = () => {
    if (filtered.length === 0) return toast.error('No data');
    const headers = ['Name', 'SKU', 'Current Stock', 'Unit', 'Low Alert', 'Status', 'Price', 'Value'];
    const rows = filtered.map((p: any) => [
      p.name, p.sku || '', p.stock, p.unit, p.lowStockAlert,
      p.stock === 0 ? 'Out of Stock' : 'Low Stock',
      p.price.toFixed(2),
      (p.price * p.stock).toFixed(2),
    ]);
    const csv = [headers, ...rows].map((r) => r.map((c) => `"${c}"`).join(',')).join('\n');
    const blob = new Blob([csv], { type: 'text/csv' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = `low-stock-${new Date().toISOString().slice(0, 10)}.csv`;
    a.click();
    toast.success('Exported');
  };

  return (
    <div className="space-y-6">
      <section className="rounded-3xl bg-gradient-to-br from-slate-950 via-amber-900 to-amber-700 text-white p-6 shadow-2xl">
        <div className="flex items-center justify-between gap-4 flex-wrap">
          <div>
            <div className="inline-flex items-center gap-2 rounded-full bg-white/10 px-3 py-1 text-xs font-semibold backdrop-blur">
              <AlertTriangle className="h-3.5 w-3.5 text-amber-300" /> Stock Warning
            </div>
            <h2 className="mt-3 text-3xl font-extrabold">Low Stock Alerts</h2>
            <p className="mt-2 text-sm text-white/80">
              Yeh products jaldi khatam hone wale hain — purchase order place karein.
            </p>
          </div>
          <div className="flex gap-2 flex-wrap">
            <button
              onClick={() => refetch()}
              disabled={isRefetching}
              className="inline-flex items-center gap-2 rounded-xl bg-white/10 hover:bg-white/20 px-4 py-2.5 text-sm font-bold transition disabled:opacity-50"
            >
              <RefreshCw className={`h-4 w-4 ${isRefetching ? 'animate-spin' : ''}`} />
              Refresh
            </button>
            <Link to="/purchases">
              <Button className="bg-white text-slate-900 hover:bg-slate-100">
                <ShoppingBag className="h-4 w-4" /> New Purchase
              </Button>
            </Link>
          </div>
        </div>
      </section>

      <section className="grid sm:grid-cols-2 xl:grid-cols-4 gap-4">
        <StatCard label="Out of Stock" value={stats.critical} icon={AlertTriangle} color="rose" hint="Stock = 0" />
        <StatCard label="Low Stock" value={stats.warning} icon={AlertTriangle} color="amber" hint="Below threshold" />
        <StatCard label="Total Alerts" value={stats.total} icon={Package} color="slate" hint="Action needed" />
        <StatCard label="Stock Value" value={formatPKR(stats.totalValue)} icon={Package} color="emerald" hint="At cost" isText />
      </section>

      <div className="rounded-3xl bg-white border border-slate-200 shadow-sm p-4 space-y-3">
        <div className="flex gap-2 flex-wrap">
          <div className="flex-1 min-w-[240px] relative">
            <Search className="h-4 w-4 text-slate-400 absolute left-3 top-1/2 -translate-y-1/2" />
            <input
              className="h-11 w-full rounded-xl border border-slate-200 bg-white pl-10 pr-10 text-sm focus:outline-none focus:ring-2 focus:ring-amber-500/30 focus:border-amber-500"
              placeholder="Search by name, SKU, barcode..."
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
        <div className="flex gap-1 bg-slate-100 rounded-xl p-1 w-fit">
          {[
            { v: 'all' as Filter, l: 'All', c: 'bg-slate-900', count: stats.total },
            { v: 'critical' as Filter, l: 'Out of Stock', c: 'bg-rose-600', count: stats.critical },
            { v: 'warning' as Filter, l: 'Low', c: 'bg-amber-600', count: stats.warning },
          ].map((opt) => (
            <button
              key={opt.v}
              onClick={() => setFilter(opt.v)}
              className={`px-4 py-1.5 rounded-lg text-xs font-bold transition inline-flex items-center gap-1.5 ${
                filter === opt.v ? `${opt.c} text-white shadow-sm` : 'text-slate-600 hover:text-slate-900'
              }`}
            >
              {opt.l}
              <span className={`px-1.5 rounded-full text-[10px] ${filter === opt.v ? 'bg-white/20' : 'bg-slate-200'}`}>
                {opt.count}
              </span>
            </button>
          ))}
        </div>
      </div>

      <section className="rounded-3xl bg-white border border-slate-200 shadow-sm overflow-hidden">
        <div className="px-6 py-5 border-b border-slate-100">
          <h3 className="text-xl font-bold text-slate-900">Products Needing Restock</h3>
          <p className="text-sm text-slate-500">{filtered.length} of {lowStock.length} alerts</p>
        </div>

        {isLoading ? (
          <div className="p-6 space-y-2">
            {Array.from({ length: 5 }).map((_, i) => <div key={i} className="h-16 rounded-xl bg-slate-100 animate-pulse" />)}
          </div>
        ) : filtered.length === 0 ? (
          <div className="p-12 text-center">
            <div className="mx-auto h-20 w-20 rounded-3xl bg-emerald-100 flex items-center justify-center">
              <Package className="h-9 w-9 text-emerald-600" />
            </div>
            <h4 className="mt-5 text-xl font-bold text-slate-900">
              {search || filter !== 'all' ? 'No matches' : 'Sab products ka stock theek hai 🎉'}
            </h4>
            <p className="mt-2 text-sm text-slate-500">
              {search || filter !== 'all' ? 'Try different filter' : 'Koi low stock alert nahi hai abhi'}
            </p>
          </div>
        ) : (
          <div className="overflow-x-auto">
            <table className="min-w-full text-sm">
              <thead className="bg-slate-50 text-slate-600">
                <tr>
                  <th className="text-left px-6 py-3 font-bold text-xs uppercase tracking-wider">Product</th>
                  <th className="text-left px-6 py-3 font-bold text-xs uppercase tracking-wider">Current Stock</th>
                  <th className="text-left px-6 py-3 font-bold text-xs uppercase tracking-wider">Alert Level</th>
                  <th className="text-left px-6 py-3 font-bold text-xs uppercase tracking-wider">Status</th>
                  <th className="text-right px-6 py-3 font-bold text-xs uppercase tracking-wider">Price</th>
                  <th className="text-right px-6 py-3 font-bold text-xs uppercase tracking-wider">Action</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-100">
                {filtered.map((p: any) => {
                  const isCritical = p.stock === 0;
                  return (
                    <tr key={p.id} className={isCritical ? 'bg-rose-50/30 hover:bg-rose-50/60' : 'bg-amber-50/30 hover:bg-amber-50/60'}>
                      <td className="px-6 py-3">
                        <div className="font-bold text-slate-900">{p.name}</div>
                        <div className="text-xs text-slate-500 font-mono">{p.sku || p.barcode || '—'}</div>
                      </td>
                      <td className="px-6 py-3">
                        <span className={`font-extrabold text-lg ${isCritical ? 'text-rose-700' : 'text-amber-700'}`}>
                          {formatQty(p.stock)} {p.unit}
                        </span>
                      </td>
                      <td className="px-6 py-3 text-slate-700 font-bold">
                        {formatQty(p.lowStockAlert)} {p.unit}
                      </td>
                      <td className="px-6 py-3">
                        <span className={`inline-flex items-center gap-1.5 rounded-full px-2.5 py-1 text-xs font-bold ${isCritical ? 'bg-rose-100 text-rose-700' : 'bg-amber-100 text-amber-700'}`}>
                          <AlertTriangle className="h-3 w-3" />
                          {isCritical ? 'Out of Stock' : 'Low Stock'}
                        </span>
                      </td>
                      <td className="px-6 py-3 text-right font-bold text-slate-900">{formatPKR(p.price)}</td>
                      <td className="px-6 py-3 text-right">
                        <div className="flex justify-end gap-1">
                          <Link to={`/products/${p.id}/edit`}>
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
    </div>
  );
}

function StatCard({ label, value, icon: Icon, color, hint, isText }: any) {
  const colors: any = {
    rose: 'from-rose-500 to-rose-700 shadow-rose-500/30',
    amber: 'from-amber-500 to-amber-700 shadow-amber-500/30',
    emerald: 'from-emerald-500 to-emerald-700 shadow-emerald-500/30',
    slate: 'from-slate-500 to-slate-700',
  };
  return (
    <div className="rounded-2xl bg-white border border-slate-200 p-5 shadow-sm">
      <div className="flex items-center justify-between">
        <div className="min-w-0 flex-1">
          <div className="text-xs uppercase tracking-wider text-slate-500 font-bold">{label}</div>
          <div className={`mt-2 font-extrabold text-slate-900 ${isText ? 'text-xl truncate' : 'text-2xl'}`}>{value}</div>
          {hint && <div className="text-xs text-slate-500 font-semibold mt-1">{hint}</div>}
        </div>
        <div className={`h-12 w-12 rounded-2xl bg-gradient-to-br ${colors[color]} text-white flex items-center justify-center shadow-lg shrink-0 ml-2`}>
          <Icon className="h-6 w-6" />
        </div>
      </div>
    </div>
  );
}
