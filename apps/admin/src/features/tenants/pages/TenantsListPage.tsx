import { useState } from 'react';
import { useQuery } from '@tanstack/react-query';
import { Link } from 'react-router-dom';
import {
  Building2, Search, ChevronRight, Users, Package, ShoppingCart,
} from 'lucide-react';
import { adminTenantsApi, type TenantStatus } from '@/api/admin-tenants.api';

const statusColors: Record<string, string> = {
  ACTIVE: 'bg-emerald-100 text-emerald-700',
  TRIAL: 'bg-blue-100 text-blue-700',
  SUSPENDED: 'bg-rose-100 text-rose-700',
  EXPIRED: 'bg-slate-100 text-slate-700',
};

export default function TenantsListPage() {
  const [search, setSearch] = useState('');
  const [status, setStatus] = useState<TenantStatus | ''>('');
  const [page, setPage] = useState(1);

  const { data, isLoading } = useQuery({
    queryKey: ['admin-tenants', search, status, page],
    queryFn: () =>
      adminTenantsApi.list({
        search: search || undefined,
        status: status || undefined,
        page,
        limit: 20,
      }),
  });

  return (
    <div className="space-y-6">
      <section className="rounded-3xl bg-gradient-to-br from-admin-950 via-admin-900 to-admin-700 text-white p-6 shadow-soft">
        <div>
          <div className="inline-flex items-center gap-2 rounded-full bg-white/10 px-3 py-1 text-xs font-medium">
            <Building2 className="h-3.5 w-3.5" />
            Tenant Management
          </div>
          <h2 className="mt-3 text-3xl font-bold">All Shops / Tenants</h2>
          <p className="mt-2 text-sm text-white/80">
            Pakistan ke saare registered shopkeepers
          </p>
        </div>
      </section>

      <section className="rounded-3xl bg-white border border-slate-200 shadow-sm p-6">
        <div className="flex items-center gap-3 flex-wrap">
          <div className="relative flex-1 min-w-[260px]">
            <Search className="h-4 w-4 text-slate-400 absolute left-3 top-1/2 -translate-y-1/2" />
            <input
              className="h-11 w-full rounded-xl border border-slate-200 pl-10 pr-4 text-sm focus:outline-none focus:ring-2 focus:ring-admin-500/30"
              placeholder="Search by name, slug, phone..."
              value={search}
              onChange={(e) => {
                setSearch(e.target.value);
                setPage(1);
              }}
            />
          </div>

          <select
            value={status}
            onChange={(e) => {
              setStatus(e.target.value as TenantStatus | '');
              setPage(1);
            }}
            className="h-11 rounded-xl border border-slate-200 bg-white px-4 text-sm"
          >
            <option value="">All Statuses</option>
            <option value="ACTIVE">Active</option>
            <option value="TRIAL">Trial</option>
            <option value="SUSPENDED">Suspended</option>
            <option value="EXPIRED">Expired</option>
          </select>
        </div>
      </section>

      <section className="rounded-3xl bg-white border border-slate-200 shadow-sm overflow-hidden">
        {isLoading ? (
          <div className="p-6 text-sm text-slate-500">Loading...</div>
        ) : !data || data.items.length === 0 ? (
          <div className="p-12 text-center">
            <Building2 className="h-12 w-12 text-slate-300 mx-auto" />
            <h4 className="mt-4 text-lg font-semibold text-slate-900">No tenants found</h4>
          </div>
        ) : (
          <>
            <div className="overflow-x-auto">
              <table className="min-w-full text-sm">
                <thead className="bg-slate-50 text-slate-600">
                  <tr>
                    <th className="text-left px-6 py-4 font-medium">Shop Name</th>
                    <th className="text-left px-6 py-4 font-medium">Status</th>
                    <th className="text-left px-6 py-4 font-medium">Plan</th>
                    <th className="text-left px-6 py-4 font-medium">Stats</th>
                    <th className="text-left px-6 py-4 font-medium">Joined</th>
                    <th className="text-right px-6 py-4 font-medium"></th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-slate-100">
                  {data.items.map((t) => {
                    const sub = t.subscriptions[0];
                    return (
                      <tr key={t.id} className="hover:bg-slate-50">
                        <td className="px-6 py-3">
                          <div className="font-semibold text-slate-900">{t.name}</div>
                          <div className="text-xs text-slate-500 font-mono">{t.slug}</div>
                          {t.phone && (
                            <div className="text-xs text-slate-500">{t.phone}</div>
                          )}
                        </td>
                        <td className="px-6 py-3">
                          <span className={`inline-flex px-2.5 py-1 rounded-full text-[10px] font-bold ${statusColors[t.status]}`}>
                            {t.status}
                          </span>
                        </td>
                        <td className="px-6 py-3">
                          {sub ? (
                            <div>
                              <div className="font-medium text-slate-900">{sub.plan.name}</div>
                              <div className="text-xs text-slate-500">
                                {sub.status} • {sub.interval}
                              </div>
                            </div>
                          ) : (
                            <span className="text-slate-400 text-xs">No active plan</span>
                          )}
                        </td>
                        <td className="px-6 py-3">
                          <div className="flex gap-3 text-xs text-slate-600">
                            <span title="Users" className="inline-flex items-center gap-1">
                              <Users className="h-3 w-3" /> {t._count.users}
                            </span>
                            <span title="Products" className="inline-flex items-center gap-1">
                              <Package className="h-3 w-3" /> {t._count.products}
                            </span>
                            <span title="Sales" className="inline-flex items-center gap-1">
                              <ShoppingCart className="h-3 w-3" /> {t._count.sales}
                            </span>
                          </div>
                        </td>
                        <td className="px-6 py-3 text-slate-600 text-xs">
                          {new Intl.DateTimeFormat('en-PK', { dateStyle: 'medium' }).format(new Date(t.createdAt))}
                        </td>
                        <td className="px-6 py-3 text-right">
                          <Link
                            to={`/tenants/${t.id}`}
                            className="inline-flex items-center gap-1 text-admin-600 hover:text-admin-700 text-sm font-semibold"
                          >
                            View <ChevronRight className="h-4 w-4" />
                          </Link>
                        </td>
                      </tr>
                    );
                  })}
                </tbody>
              </table>
            </div>

            <div className="px-6 py-4 border-t border-slate-100 flex items-center justify-between">
              <div className="text-sm text-slate-500">
                Page {data.meta.page} of {data.meta.totalPages} • {data.meta.total} total
              </div>
              <div className="flex gap-2">
                <button
                  onClick={() => setPage((p) => Math.max(1, p - 1))}
                  disabled={page === 1}
                  className="px-3 py-1.5 rounded-lg border border-slate-200 text-sm disabled:opacity-50"
                >
                  Previous
                </button>
                <button
                  onClick={() => setPage((p) => p + 1)}
                  disabled={page >= data.meta.totalPages}
                  className="px-3 py-1.5 rounded-lg border border-slate-200 text-sm disabled:opacity-50"
                >
                  Next
                </button>
              </div>
            </div>
          </>
        )}
      </section>
    </div>
  );
}
