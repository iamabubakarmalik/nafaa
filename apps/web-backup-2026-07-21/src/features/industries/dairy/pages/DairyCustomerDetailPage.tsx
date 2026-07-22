import { useParams, Link } from 'react-router-dom';
import { useQuery } from '@tanstack/react-query';
import { Milk, Sunrise, Sunset, Award, Route as RouteIcon, Users } from 'lucide-react';
import { salesApi } from '@/api/sales.api';
import { dairyCustomersApi } from '../api/customers.api';
import CustomerDetailPage from '@/features/customers/pages/CustomerDetailPage';
import { formatPKR } from '@/lib/format';
import { formatDateTime } from '@/features/customers/components/shared/CustomerShared';

export default function DairyCustomerDetailPage() {
  const { id } = useParams();

  const { data: allSales = [] } = useQuery({
    queryKey: ['sales-for-dairy-customer', id],
    queryFn: () => salesApi.list(),
    enabled: !!id,
  });

  const { data: dairyCustomers = [] } = useQuery({
    queryKey: ['dairy-customers-detail'],
    queryFn: () => dairyCustomersApi.list({}),
    enabled: !!id,
  });

  const customerSales = allSales.filter((s: any) => s.customer?.id === id);
  const dairyProfile = dairyCustomers.find((dc: any) => dc.customerId === id);

  const morningSales = customerSales.filter((s: any) => (s.note || '').includes('MORNING'));
  const eveningSales = customerSales.filter((s: any) => (s.note || '').includes('EVENING'));
  const totalLiters = customerSales.reduce((sum: number, sale: any) => {
    return sum + sale.items.reduce((s: number, it: any) => {
      if (it.product?.unit === 'liter' || it.product?.name?.toLowerCase().includes('milk')) {
        return s + Number(it.quantity || 0);
      }
      return s;
    }, 0);
  }, 0);

  return (
    <div className="space-y-6">
      {dairyProfile && (
        <section className="rounded-3xl bg-gradient-to-br from-fuchsia-50 to-pink-50 border-2 border-fuchsia-200 p-5 space-y-4">
          <div className="flex items-center gap-2">
            <Milk className="h-5 w-5 text-fuchsia-600" />
            <h3 className="font-extrabold text-fuchsia-900">🥛 Dairy Subscription Profile</h3>
          </div>

          <div className="grid sm:grid-cols-4 gap-3">
            <div className="rounded-xl bg-white border-2 border-amber-200 p-3">
              <div className="text-[10px] uppercase font-extrabold text-amber-700 inline-flex items-center gap-1">
                <Sunrise className="h-3 w-3" /> Morning
              </div>
              <div className="text-2xl font-extrabold text-amber-900 mt-1">{dairyProfile.morningQuantity}L</div>
              <div className="text-[10px] font-bold text-slate-500">Daily quantity</div>
            </div>
            <div className="rounded-xl bg-white border-2 border-indigo-200 p-3">
              <div className="text-[10px] uppercase font-extrabold text-indigo-700 inline-flex items-center gap-1">
                <Sunset className="h-3 w-3" /> Evening
              </div>
              <div className="text-2xl font-extrabold text-indigo-900 mt-1">{dairyProfile.eveningQuantity}L</div>
              <div className="text-[10px] font-bold text-slate-500">Daily quantity</div>
            </div>
            <div className="rounded-xl bg-white border-2 border-emerald-200 p-3">
              <div className="text-[10px] uppercase font-extrabold text-emerald-700">Custom Rate</div>
              <div className="text-lg font-extrabold text-emerald-900 mt-1">{dairyProfile.customRate ? formatPKR(dairyProfile.customRate) : '—'}</div>
              <div className="text-[10px] font-bold text-slate-500">per liter</div>
            </div>
            <div className="rounded-xl bg-white border-2 border-violet-200 p-3">
              <div className="text-[10px] uppercase font-extrabold text-violet-700 inline-flex items-center gap-1">
                <RouteIcon className="h-3 w-3" /> Route
              </div>
              <div className="text-sm font-extrabold text-violet-900 mt-1 truncate">{dairyProfile.route?.name || 'Not assigned'}</div>
              <div className="text-[10px] font-bold text-slate-500">{dairyProfile.deliveryFrequency}</div>
            </div>
          </div>

          <div className="grid sm:grid-cols-3 gap-3">
            <div className="rounded-xl bg-white border-2 border-slate-200 p-3">
              <div className="text-[10px] uppercase font-extrabold text-slate-600">Total Milk</div>
              <div className="text-lg font-extrabold text-slate-900 mt-1">{totalLiters.toFixed(1)}L</div>
              <div className="text-[10px] font-bold text-slate-500">All time</div>
            </div>
            <div className="rounded-xl bg-white border-2 border-amber-200 p-3">
              <div className="text-[10px] uppercase font-extrabold text-amber-700">Morning Sales</div>
              <div className="text-lg font-extrabold text-amber-900 mt-1">{morningSales.length}</div>
            </div>
            <div className="rounded-xl bg-white border-2 border-indigo-200 p-3">
              <div className="text-[10px] uppercase font-extrabold text-indigo-700">Evening Sales</div>
              <div className="text-lg font-extrabold text-indigo-900 mt-1">{eveningSales.length}</div>
            </div>
          </div>

          {customerSales.length > 0 && (
            <div className="rounded-2xl bg-white border-2 border-fuchsia-200 overflow-hidden">
              <div className="px-4 py-3 border-b border-fuchsia-100">
                <h4 className="font-bold text-slate-900 text-sm">Recent Dairy Purchases</h4>
              </div>
              <div className="divide-y divide-slate-100 max-h-[300px] overflow-y-auto">
                {customerSales.slice(0, 10).map((sale: any) => {
                  const isMorning = (sale.note || '').includes('MORNING');
                  const isEvening = (sale.note || '').includes('EVENING');
                  return (
                    <Link key={sale.id} to={`/sales/${sale.id}/receipt`}
                      className="block px-4 py-3 hover:bg-fuchsia-50 transition">
                      <div className="flex items-center justify-between gap-3">
                        <div className="flex items-center gap-2 min-w-0">
                          {isMorning && <Sunrise className="h-4 w-4 text-amber-600 shrink-0" />}
                          {isEvening && <Sunset className="h-4 w-4 text-indigo-600 shrink-0" />}
                          {!isMorning && !isEvening && <Milk className="h-4 w-4 text-fuchsia-600 shrink-0" />}
                          <div className="min-w-0">
                            <div className="font-mono font-extrabold text-sm text-slate-900">{sale.saleNumber}</div>
                            <div className="text-[11px] text-slate-500 truncate">{sale.items.length} items</div>
                          </div>
                        </div>
                        <div className="text-right shrink-0">
                          <div className="font-extrabold text-emerald-700 text-sm">{formatPKR(sale.total)}</div>
                          <div className="text-[10px] text-slate-500">{formatDateTime(sale.soldAt)}</div>
                        </div>
                      </div>
                    </Link>
                  );
                })}
              </div>
            </div>
          )}
        </section>
      )}

      <CustomerDetailPage />
    </div>
  );
}
