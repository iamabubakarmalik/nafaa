import { useState } from 'react';
import { useQuery } from '@tanstack/react-query';
import { Users, Search, Wallet, TrendingUp } from 'lucide-react';
import { adminCustomersApi } from '@/api/admin-customers.api';
import { formatPKR } from '@/lib/format';

export default function AdminCustomersPage() {
  const [search, setSearch] = useState('');
  const [hasCredit, setHasCredit] = useState(false);
  const [page, setPage] = useState(1);

  const { data: stats } = useQuery({
    queryKey: ['admin-customers-stats'],
    queryFn: adminCustomersApi.stats,
  });

  const { data } = useQuery({
    queryKey: ['admin-customers', search, hasCredit, page],
    queryFn: () => adminCustomersApi.list({
      search: search || undefined, hasCredit, page, limit: 30,
    }),
  });

  return (
    <div className="space-y-6">
      <section className="rounded-3xl bg-gradient-to-br from-blue-900 to-blue-700 text-white p-6 shadow-soft">
        <div className="inline-flex items-center gap-2 rounded-full bg-white/10 px-3 py-1 text-xs font-medium">
          <Users className="h-3.5 w-3.5" />
          Cross-Tenant Customers
        </div>
        <h2 className="mt-3 text-3xl font-bold">All Customers</h2>
        <p className="mt-2 text-sm text-white/80">Sab tenants ke customers</p>
      </section>

      <section className="grid sm:grid-cols-2 lg:grid-cols-4 gap-4">
        <div className="rounded-2xl bg-white border border-slate-200 p-5 shadow-sm">
          <div className="text-sm text-slate-500">Total Customers</div>
          <div className="mt-2 text-2xl font-bold">{stats?.total ?? 0}</div>
        </div>
        <div className="rounded-2xl bg-amber-50 border border-amber-200 p-5">
          <div className="text-sm text-amber-700">With Credit</div>
          <div className="mt-2 text-2xl font-bold text-amber-900">{stats?.withCredit ?? 0}</div>
        </div>
        <div className="rounded-2xl bg-gradient-to-br from-blue-600 to-blue-800 text-white p-5 shadow-sm">
          <div className="flex items-center justify-between">
            <div>
              <div className="text-sm text-white/80">Total Spent</div>
              <div className="mt-2 text-xl font-bold">{formatPKR(stats?.totalSpentPlatform ?? 0)}</div>
            </div>
            <TrendingUp className="h-5 w-5" />
          </div>
        </div>
        <div className="rounded-2xl bg-rose-50 border border-rose-200 p-5">
          <div className="flex items-center justify-between">
            <div>
              <div className="text-sm text-rose-700">Outstanding Credit</div>
              <div className="mt-2 text-xl font-bold text-rose-900">{formatPKR(stats?.totalOutstandingCredit ?? 0)}</div>
            </div>
            <Wallet className="h-5 w-5 text-rose-700" />
          </div>
        </div>
      </section>

      <section className="rounded-3xl bg-white border border-slate-200 shadow-sm p-4">
        <div className="flex items-center gap-3 flex-wrap">
          <div className="relative flex-1 min-w-[260px]">
            <Search className="h-4 w-4 text-slate-400 absolute left-3 top-1/2 -translate-y-1/2" />
            <input className="h-11 w-full rounded-xl border border-slate-200 pl-10 pr-4 text-sm"
              placeholder="Search by name, phone, email..." value={search}
              onChange={(e) => { setSearch(e.target.value); setPage(1); }} />
          </div>
          <label className="flex items-center gap-2 text-sm font-medium cursor-pointer">
            <input type="checkbox" checked={hasCredit} onChange={(e) => { setHasCredit(e.target.checked); setPage(1); }}
              className="h-5 w-5 rounded border-slate-300" />
            Only with credit
          </label>
        </div>
      </section>

      <section className="rounded-3xl bg-white border border-slate-200 shadow-sm overflow-hidden">
        <div className="overflow-x-auto">
          <table className="min-w-full text-sm">
            <thead className="bg-slate-50 text-slate-600">
              <tr>
                <th className="text-left px-6 py-4 font-medium">Customer</th>
                <th className="text-left px-6 py-4 font-medium">Tenant</th>
                <th className="text-right px-6 py-4 font-medium">Total Spent</th>
                <th className="text-right px-6 py-4 font-medium">Balance (Udhaar)</th>
                <th className="text-right px-6 py-4 font-medium">Loyalty</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-100">
              {(data?.items ?? []).map((c) => (
                <tr key={c.id} className="hover:bg-slate-50">
                  <td className="px-6 py-3">
                    <div className="font-semibold">{c.name}</div>
                    <div className="text-xs text-slate-500">
                      {c.phone && <span>{c.phone}</span>}
                      {c.email && <span className="ml-2">{c.email}</span>}
                    </div>
                  </td>
                  <td className="px-6 py-3 font-medium text-xs">{c.tenant.name}</td>
                  <td className="px-6 py-3 text-right font-medium text-emerald-700">{formatPKR(c.totalSpent)}</td>
                  <td className="px-6 py-3 text-right">
                    <span className={`font-bold ${c.balance > 0 ? 'text-rose-700' : 'text-slate-500'}`}>
                      {formatPKR(c.balance)}
                    </span>
                  </td>
                  <td className="px-6 py-3 text-right text-amber-700 font-bold">⭐ {c.loyaltyPoints}</td>
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
