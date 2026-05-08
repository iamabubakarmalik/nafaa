import { useState } from 'react';
import { useQuery } from '@tanstack/react-query';
import { ShoppingCart, Search, TrendingUp, DollarSign } from 'lucide-react';
import { adminSalesApi } from '@/api/admin-sales.api';
import { formatPKR } from '@nafaa/shared-utils';

const formatDate = (v: string) =>
  new Intl.DateTimeFormat('en-PK', { dateStyle: 'medium', timeStyle: 'short' }).format(new Date(v));

export default function AdminSalesPage() {
  const [search, setSearch] = useState('');
  const [page, setPage] = useState(1);

  const { data: stats } = useQuery({
    queryKey: ['admin-sales-stats'],
    queryFn: adminSalesApi.stats,
  });

  const { data } = useQuery({
    queryKey: ['admin-sales', search, page],
    queryFn: () => adminSalesApi.list({ search: search || undefined, page, limit: 30 }),
  });

  return (
    <div className="space-y-6">
      <section className="rounded-3xl bg-gradient-to-br from-emerald-900 to-emerald-700 text-white p-6 shadow-soft">
        <div className="inline-flex items-center gap-2 rounded-full bg-white/10 px-3 py-1 text-xs font-medium">
          <ShoppingCart className="h-3.5 w-3.5" />
          Platform Sales
        </div>
        <h2 className="mt-3 text-3xl font-bold">All Sales</h2>
        <p className="mt-2 text-sm text-white/80">Sab tenants ki sales overview</p>
      </section>

      <section className="grid sm:grid-cols-2 lg:grid-cols-4 gap-4">
        <div className="rounded-2xl bg-white border border-slate-200 p-5 shadow-sm">
          <div className="flex items-center justify-between">
            <div>
              <div className="text-sm text-slate-500">Today's Sales</div>
              <div className="mt-2 text-2xl font-bold text-emerald-700">{formatPKR(stats?.todayRevenue ?? 0)}</div>
              <div className="text-xs text-slate-500 mt-1">{stats?.todayCount ?? 0} orders</div>
            </div>
            <TrendingUp className="h-5 w-5 text-emerald-600" />
          </div>
        </div>
        <div className="rounded-2xl bg-white border border-slate-200 p-5 shadow-sm">
          <div className="text-sm text-slate-500">This Month</div>
          <div className="mt-2 text-2xl font-bold text-slate-900">{formatPKR(stats?.monthRevenue ?? 0)}</div>
          <div className="text-xs text-slate-500 mt-1">{stats?.monthCount ?? 0} orders</div>
        </div>
        <div className="rounded-2xl bg-gradient-to-br from-emerald-600 to-emerald-800 text-white p-5 shadow-sm">
          <div className="flex items-center justify-between">
            <div>
              <div className="text-sm text-white/80">Total Revenue</div>
              <div className="mt-2 text-2xl font-bold">{formatPKR(stats?.totalRevenue ?? 0)}</div>
              <div className="text-xs text-white/80 mt-1">{stats?.totalCount ?? 0} all-time</div>
            </div>
            <DollarSign className="h-5 w-5" />
          </div>
        </div>
        <div className="rounded-2xl bg-white border border-slate-200 p-5 shadow-sm">
          <div className="text-sm text-slate-500">Total Profit</div>
          <div className="mt-2 text-2xl font-bold text-violet-700">{formatPKR(stats?.totalProfit ?? 0)}</div>
          <div className="text-xs text-slate-500 mt-1">Lifetime</div>
        </div>
      </section>

      <section className="rounded-3xl bg-white border border-slate-200 shadow-sm p-4">
        <div className="relative">
          <Search className="h-4 w-4 text-slate-400 absolute left-3 top-1/2 -translate-y-1/2" />
          <input className="h-11 w-full rounded-xl border border-slate-200 pl-10 pr-4 text-sm"
            placeholder="Search by sale number..." value={search}
            onChange={(e) => { setSearch(e.target.value); setPage(1); }} />
        </div>
      </section>

      <section className="rounded-3xl bg-white border border-slate-200 shadow-sm overflow-hidden">
        <div className="overflow-x-auto">
          <table className="min-w-full text-sm">
            <thead className="bg-slate-50 text-slate-600">
              <tr>
                <th className="text-left px-6 py-4 font-medium">Sale #</th>
                <th className="text-left px-6 py-4 font-medium">Tenant</th>
                <th className="text-left px-6 py-4 font-medium">Customer</th>
                <th className="text-right px-6 py-4 font-medium">Total</th>
                <th className="text-right px-6 py-4 font-medium">Paid</th>
                <th className="text-left px-6 py-4 font-medium">Method</th>
                <th className="text-left px-6 py-4 font-medium">Date</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-100">
              {(data?.items ?? []).map((s) => (
                <tr key={s.id} className="hover:bg-slate-50">
                  <td className="px-6 py-3 font-mono text-xs">{s.saleNumber}</td>
                  <td className="px-6 py-3 font-medium">{s.tenant.name}</td>
                  <td className="px-6 py-3">{s.customer?.name || <span className="text-slate-400">Walk-in</span>}</td>
                  <td className="px-6 py-3 text-right font-bold">{formatPKR(s.total)}</td>
                  <td className="px-6 py-3 text-right text-emerald-700">{formatPKR(s.paidAmount)}</td>
                  <td className="px-6 py-3">
                    <span className="inline-flex px-2 py-0.5 rounded-full text-[10px] font-bold bg-slate-100 text-slate-700">
                      {s.paymentMethod}
                    </span>
                  </td>
                  <td className="px-6 py-3 text-xs text-slate-600">{formatDate(s.soldAt)}</td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>

        {data && (
          <div className="px-6 py-4 border-t border-slate-100 flex items-center justify-between">
            <div className="text-sm text-slate-500">
              Page {data.meta.page} of {data.meta.totalPages} • {data.meta.total} total
            </div>
            <div className="flex gap-2">
              <button onClick={() => setPage((p) => Math.max(1, p - 1))} disabled={page === 1}
                className="px-3 py-1.5 rounded-lg border border-slate-200 text-sm disabled:opacity-50">Previous</button>
              <button onClick={() => setPage((p) => p + 1)} disabled={page >= data.meta.totalPages}
                className="px-3 py-1.5 rounded-lg border border-slate-200 text-sm disabled:opacity-50">Next</button>
            </div>
          </div>
        )}
      </section>
    </div>
  );
}
