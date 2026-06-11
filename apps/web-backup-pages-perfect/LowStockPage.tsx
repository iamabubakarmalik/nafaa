import { useQuery } from '@tanstack/react-query';
import { Link } from 'react-router-dom';
import { AlertTriangle, Package, ShoppingBag, ArrowRight } from 'lucide-react';
import { productsApi } from '@/api/products.api';
import { formatPKR } from '@/lib/format';

export default function LowStockPage() {
  const { data: lowStock = [], isLoading } = useQuery({
    queryKey: ['products-low-stock'],
    queryFn: productsApi.lowStock,
  });

  const criticalCount = lowStock.filter((p) => p.stock === 0).length;
  const warningCount = lowStock.filter((p) => p.stock > 0).length;

  return (
    <div className="space-y-6">
      <section className="rounded-3xl bg-gradient-to-br from-slate-950 via-amber-900 to-amber-700 text-white p-6 shadow-soft">
        <div className="flex items-center justify-between gap-4 flex-wrap">
          <div>
            <div className="inline-flex items-center gap-2 rounded-full bg-white/10 px-3 py-1 text-xs font-medium">
              <AlertTriangle className="h-3.5 w-3.5" />
              Stock Warning
            </div>
            <h2 className="mt-3 text-3xl font-bold">Low Stock Alerts</h2>
            <p className="mt-2 text-sm text-white/80">
              Ye products jaldi khatam hone wale hain — purchase order place karein.
            </p>
          </div>
          <Link to="/purchases">
            <button className="px-5 py-3 rounded-xl bg-white text-slate-900 font-semibold hover:bg-slate-100 transition flex items-center gap-2">
              <ShoppingBag className="h-4 w-4" />
              New Purchase
            </button>
          </Link>
        </div>
      </section>

      <section className="grid sm:grid-cols-3 gap-4">
        <div className="rounded-2xl bg-white border border-slate-200 p-5 shadow-sm">
          <div className="flex items-center justify-between">
            <div>
              <div className="text-sm text-slate-500">Out of Stock</div>
              <div className="mt-2 text-2xl font-bold text-rose-700">{criticalCount}</div>
              <div className="text-xs text-rose-600 mt-1">Stock = 0</div>
            </div>
            <div className="h-11 w-11 rounded-2xl bg-rose-100 text-rose-700 flex items-center justify-center">
              <AlertTriangle className="h-5 w-5" />
            </div>
          </div>
        </div>

        <div className="rounded-2xl bg-white border border-slate-200 p-5 shadow-sm">
          <div className="flex items-center justify-between">
            <div>
              <div className="text-sm text-slate-500">Low Stock Warning</div>
              <div className="mt-2 text-2xl font-bold text-amber-700">{warningCount}</div>
              <div className="text-xs text-amber-600 mt-1">Below threshold</div>
            </div>
            <div className="h-11 w-11 rounded-2xl bg-amber-100 text-amber-700 flex items-center justify-center">
              <AlertTriangle className="h-5 w-5" />
            </div>
          </div>
        </div>

        <div className="rounded-2xl bg-white border border-slate-200 p-5 shadow-sm">
          <div className="flex items-center justify-between">
            <div>
              <div className="text-sm text-slate-500">Total Alerts</div>
              <div className="mt-2 text-2xl font-bold text-slate-900">{lowStock.length}</div>
              <div className="text-xs text-slate-500 mt-1">Action needed</div>
            </div>
            <div className="h-11 w-11 rounded-2xl bg-slate-100 text-slate-700 flex items-center justify-center">
              <Package className="h-5 w-5" />
            </div>
          </div>
        </div>
      </section>

      <section className="rounded-3xl bg-white border border-slate-200 shadow-sm overflow-hidden">
        <div className="px-6 py-5 border-b border-slate-100">
          <h3 className="text-xl font-bold text-slate-900">Products Needing Restock</h3>
        </div>

        {isLoading ? (
          <div className="p-6 text-sm text-slate-500">Loading...</div>
        ) : lowStock.length === 0 ? (
          <div className="p-12 text-center">
            <div className="mx-auto h-16 w-16 rounded-3xl bg-emerald-100 flex items-center justify-center">
              <Package className="h-7 w-7 text-emerald-600" />
            </div>
            <h4 className="mt-4 text-lg font-semibold text-slate-900">Sab products ka stock theek hai 🎉</h4>
            <p className="mt-1 text-sm text-slate-500">Koi low stock alert nahi hai abhi.</p>
          </div>
        ) : (
          <div className="overflow-x-auto">
            <table className="min-w-full text-sm">
              <thead className="bg-slate-50 text-slate-600">
                <tr>
                  <th className="text-left px-6 py-4 font-medium">Product</th>
                  <th className="text-left px-6 py-4 font-medium">Current Stock</th>
                  <th className="text-left px-6 py-4 font-medium">Alert Level</th>
                  <th className="text-left px-6 py-4 font-medium">Status</th>
                  <th className="text-left px-6 py-4 font-medium">Price</th>
                  <th className="text-right px-6 py-4 font-medium">Action</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-100">
                {lowStock.map((p: any) => {
                  const isCritical = p.stock === 0;
                  return (
                    <tr key={p.id} className={isCritical ? 'bg-rose-50/30' : 'bg-amber-50/30'}>
                      <td className="px-6 py-4">
                        <div className="font-medium text-slate-900">{p.name}</div>
                        <div className="text-xs text-slate-500">{p.sku || p.barcode || '—'}</div>
                      </td>
                      <td className="px-6 py-4">
                        <span className={`font-bold text-lg ${isCritical ? 'text-rose-700' : 'text-amber-700'}`}>
                          {p.stock} {p.unit}
                        </span>
                      </td>
                      <td className="px-6 py-4 text-slate-700">
                        {p.lowStockAlert} {p.unit}
                      </td>
                      <td className="px-6 py-4">
                        <span className={`inline-flex items-center gap-1.5 rounded-full px-2.5 py-1 text-xs font-semibold ${isCritical ? 'bg-rose-100 text-rose-700' : 'bg-amber-100 text-amber-700'}`}>
                          <AlertTriangle className="h-3 w-3" />
                          {isCritical ? 'Out of Stock' : 'Low Stock'}
                        </span>
                      </td>
                      <td className="px-6 py-4 font-medium text-slate-900">{formatPKR(p.price)}</td>
                      <td className="px-6 py-4 text-right">
                        <Link to="/purchases">
                          <button className="inline-flex items-center gap-1 text-brand-700 hover:text-brand-800 text-sm font-medium">
                            Restock
                            <ArrowRight className="h-3.5 w-3.5" />
                          </button>
                        </Link>
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
