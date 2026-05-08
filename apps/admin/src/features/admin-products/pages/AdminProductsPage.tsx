import { useState } from 'react';
import { useQuery } from '@tanstack/react-query';
import { Package, Search, AlertTriangle, XCircle, CheckCircle2 } from 'lucide-react';
import { adminProductsApi } from '@/api/admin-products.api';
import { formatPKR } from '@nafaa/shared-utils';

export default function AdminProductsPage() {
  const [search, setSearch] = useState('');
  const [page, setPage] = useState(1);

  const { data: stats } = useQuery({
    queryKey: ['admin-products-stats'],
    queryFn: adminProductsApi.stats,
  });

  const { data } = useQuery({
    queryKey: ['admin-products', search, page],
    queryFn: () => adminProductsApi.list({ search: search || undefined, page, limit: 30 }),
  });

  return (
    <div className="space-y-6">
      <section className="rounded-3xl bg-gradient-to-br from-violet-900 to-violet-700 text-white p-6 shadow-soft">
        <div className="inline-flex items-center gap-2 rounded-full bg-white/10 px-3 py-1 text-xs font-medium">
          <Package className="h-3.5 w-3.5" />
          Cross-Tenant Inventory
        </div>
        <h2 className="mt-3 text-3xl font-bold">All Products</h2>
        <p className="mt-2 text-sm text-white/80">Sab tenants ke products ek jagah</p>
      </section>

      <section className="grid sm:grid-cols-2 lg:grid-cols-5 gap-3">
        <div className="rounded-2xl bg-white border border-slate-200 p-4">
          <div className="text-xs text-slate-500">Total Products</div>
          <div className="mt-1 text-2xl font-bold">{stats?.total ?? 0}</div>
        </div>
        <div className="rounded-2xl bg-emerald-50 border border-emerald-200 p-4">
          <div className="text-xs text-emerald-700">Active</div>
          <div className="mt-1 text-2xl font-bold text-emerald-900 flex items-center gap-1">
            <CheckCircle2 className="h-5 w-5" /> {stats?.active ?? 0}
          </div>
        </div>
        <div className="rounded-2xl bg-amber-50 border border-amber-200 p-4">
          <div className="text-xs text-amber-700">Low Stock</div>
          <div className="mt-1 text-2xl font-bold text-amber-900 flex items-center gap-1">
            <AlertTriangle className="h-5 w-5" /> {stats?.lowStock ?? 0}
          </div>
        </div>
        <div className="rounded-2xl bg-rose-50 border border-rose-200 p-4">
          <div className="text-xs text-rose-700">Out of Stock</div>
          <div className="mt-1 text-2xl font-bold text-rose-900 flex items-center gap-1">
            <XCircle className="h-5 w-5" /> {stats?.outOfStock ?? 0}
          </div>
        </div>
        <div className="rounded-2xl bg-gradient-to-br from-violet-600 to-violet-800 text-white p-4">
          <div className="text-xs text-white/80">Total Stock Units</div>
          <div className="mt-1 text-lg font-bold">{(stats?.totalStockUnits ?? 0).toLocaleString()}</div>
        </div>
      </section>

      <section className="rounded-3xl bg-white border border-slate-200 shadow-sm p-4">
        <div className="relative">
          <Search className="h-4 w-4 text-slate-400 absolute left-3 top-1/2 -translate-y-1/2" />
          <input
            className="h-11 w-full rounded-xl border border-slate-200 pl-10 pr-4 text-sm"
            placeholder="Search by name, SKU, barcode..."
            value={search}
            onChange={(e) => { setSearch(e.target.value); setPage(1); }}
          />
        </div>
      </section>

      <section className="rounded-3xl bg-white border border-slate-200 shadow-sm overflow-hidden">
        <div className="overflow-x-auto">
          <table className="min-w-full text-sm">
            <thead className="bg-slate-50 text-slate-600">
              <tr>
                <th className="text-left px-6 py-4 font-medium">Product</th>
                <th className="text-left px-6 py-4 font-medium">Tenant</th>
                <th className="text-left px-6 py-4 font-medium">Category</th>
                <th className="text-right px-6 py-4 font-medium">Price</th>
                <th className="text-right px-6 py-4 font-medium">Cost</th>
                <th className="text-right px-6 py-4 font-medium">Stock</th>
                <th className="text-left px-6 py-4 font-medium">Status</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-100">
              {(data?.items ?? []).map((p) => (
                <tr key={p.id} className="hover:bg-slate-50">
                  <td className="px-6 py-3">
                    <div className="font-semibold">{p.name}</div>
                    <div className="text-xs text-slate-500">
                      {p.sku && <span className="font-mono">{p.sku}</span>}
                      {p.barcode && <span className="ml-2 font-mono">📊 {p.barcode}</span>}
                    </div>
                  </td>
                  <td className="px-6 py-3">
                    <div className="font-medium text-slate-900 text-xs">{p.tenant.name}</div>
                  </td>
                  <td className="px-6 py-3">
                    {p.category ? (
                      <span
                        className="inline-flex px-2 py-0.5 rounded-full text-[10px] font-bold text-white"
                        style={{ backgroundColor: p.category.color }}
                      >
                        {p.category.name}
                      </span>
                    ) : <span className="text-slate-400 text-xs">—</span>}
                  </td>
                  <td className="px-6 py-3 text-right font-medium">{formatPKR(p.price)}</td>
                  <td className="px-6 py-3 text-right text-slate-600">{formatPKR(p.costPrice)}</td>
                  <td className="px-6 py-3 text-right">
                    <span className={`font-bold ${
                      p.stock === 0 ? 'text-rose-700' :
                      p.stock <= p.lowStockAlert ? 'text-amber-700' :
                      'text-emerald-700'
                    }`}>
                      {p.stock} {p.unit}
                    </span>
                  </td>
                  <td className="px-6 py-3">
                    <span className={`inline-flex px-2 py-0.5 rounded-full text-[10px] font-bold ${
                      p.isActive ? 'bg-emerald-100 text-emerald-700' : 'bg-slate-100 text-slate-700'
                    }`}>
                      {p.isActive ? 'Active' : 'Inactive'}
                    </span>
                  </td>
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
                className="px-3 py-1.5 rounded-lg border border-slate-200 text-sm disabled:opacity-50">
                Previous
              </button>
              <button onClick={() => setPage((p) => p + 1)} disabled={page >= data.meta.totalPages}
                className="px-3 py-1.5 rounded-lg border border-slate-200 text-sm disabled:opacity-50">
                Next
              </button>
            </div>
          </div>
        )}
      </section>
    </div>
  );
}
