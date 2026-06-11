import { useQuery } from '@tanstack/react-query';
import { Link } from 'react-router-dom';
import { Receipt, TrendingUp, Wallet, CalendarDays, ArrowUpRight } from 'lucide-react';
import { salesApi } from '@/api/sales.api';
import { formatPKR } from '@/lib/format';
import { Button } from '@/components/ui/Button';

const formatDate = (value: string) =>
  new Intl.DateTimeFormat('en-PK', {
    dateStyle: 'medium',
    timeStyle: 'short',
  }).format(new Date(value));

export default function SalesPage() {
  const { data: sales = [], isLoading } = useQuery({
    queryKey: ['sales-list'],
    queryFn: salesApi.list,
  });

  const { data: summary } = useQuery({
    queryKey: ['sales-summary'],
    queryFn: salesApi.summary,
  });

  return (
    <div className="space-y-6">
      <section className="rounded-3xl bg-gradient-to-br from-slate-950 via-slate-900 to-brand-800 text-white p-6 shadow-soft">
        <div className="flex flex-col lg:flex-row lg:items-center lg:justify-between gap-5">
          <div>
            <div className="inline-flex items-center gap-2 rounded-full bg-white/10 px-3 py-1 text-xs font-medium">
              <Receipt className="h-3.5 w-3.5" />
              Sales Intelligence
            </div>
            <h2 className="mt-3 text-3xl font-bold">Sales History</h2>
            <p className="mt-2 text-sm text-white/75">
              Aap ki tamam recent sales, totals, payment methods aur printable receipts.
            </p>
          </div>
        </div>
      </section>

      <section className="grid sm:grid-cols-2 xl:grid-cols-4 gap-4">
        <div className="rounded-2xl bg-white border border-slate-200 p-5 shadow-sm">
          <div className="flex items-center justify-between">
            <div>
              <div className="text-sm text-slate-500">Aaj ki Sales</div>
              <div className="mt-2 text-2xl font-bold text-slate-900">
                {formatPKR(summary?.todaySales ?? 0)}
              </div>
            </div>
            <div className="h-11 w-11 rounded-2xl bg-emerald-100 text-emerald-700 flex items-center justify-center">
              <TrendingUp className="h-5 w-5" />
            </div>
          </div>
        </div>

        <div className="rounded-2xl bg-white border border-slate-200 p-5 shadow-sm">
          <div className="flex items-center justify-between">
            <div>
              <div className="text-sm text-slate-500">Aaj ke Orders</div>
              <div className="mt-2 text-2xl font-bold text-slate-900">
                {summary?.todayOrders ?? 0}
              </div>
            </div>
            <div className="h-11 w-11 rounded-2xl bg-blue-100 text-blue-700 flex items-center justify-center">
              <Receipt className="h-5 w-5" />
            </div>
          </div>
        </div>

        <div className="rounded-2xl bg-white border border-slate-200 p-5 shadow-sm">
          <div className="flex items-center justify-between">
            <div>
              <div className="text-sm text-slate-500">Is Mahine ki Sales</div>
              <div className="mt-2 text-2xl font-bold text-slate-900">
                {formatPKR(summary?.monthSales ?? 0)}
              </div>
            </div>
            <div className="h-11 w-11 rounded-2xl bg-violet-100 text-violet-700 flex items-center justify-center">
              <CalendarDays className="h-5 w-5" />
            </div>
          </div>
        </div>

        <div className="rounded-2xl bg-white border border-slate-200 p-5 shadow-sm">
          <div className="flex items-center justify-between">
            <div>
              <div className="text-sm text-slate-500">Total Revenue</div>
              <div className="mt-2 text-2xl font-bold text-slate-900">
                {formatPKR(summary?.totalSales ?? 0)}
              </div>
            </div>
            <div className="h-11 w-11 rounded-2xl bg-amber-100 text-amber-700 flex items-center justify-center">
              <Wallet className="h-5 w-5" />
            </div>
          </div>
        </div>
      </section>

      <section className="grid xl:grid-cols-[1.2fr_0.8fr] gap-6">
        <div className="rounded-3xl bg-white border border-slate-200 shadow-sm overflow-hidden">
          <div className="px-6 py-5 border-b border-slate-100">
            <h3 className="text-xl font-bold text-slate-900">Recent Sales</h3>
            <p className="text-sm text-slate-500">Latest 50 completed sales</p>
          </div>

          {isLoading ? (
            <div className="p-6 text-sm text-slate-500">Loading sales...</div>
          ) : sales.length === 0 ? (
            <div className="p-12 text-center">
              <div className="mx-auto h-16 w-16 rounded-3xl bg-slate-100 flex items-center justify-center">
                <Receipt className="h-7 w-7 text-slate-400" />
              </div>
              <h4 className="mt-4 text-lg font-semibold text-slate-900">Abhi koi sale nahi</h4>
              <p className="mt-1 text-sm text-slate-500">POS se sale complete karte hi yahan nazar aayegi.</p>
            </div>
          ) : (
            <div className="overflow-x-auto">
              <table className="min-w-full text-sm">
                <thead className="bg-slate-50 text-slate-600">
                  <tr>
                    <th className="text-left px-6 py-4 font-medium">Sale</th>
                    <th className="text-left px-6 py-4 font-medium">Customer</th>
                    <th className="text-left px-6 py-4 font-medium">Payment</th>
                    <th className="text-left px-6 py-4 font-medium">Date</th>
                    <th className="text-left px-6 py-4 font-medium">Total</th>
                    <th className="text-right px-6 py-4 font-medium">Receipt</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-slate-100">
                  {sales.map((sale) => (
                    <tr key={sale.id} className="hover:bg-slate-50/80">
                      <td className="px-6 py-4">
                        <div className="font-medium text-slate-900">{sale.saleNumber}</div>
                        <div className="text-xs text-slate-500">
                          {sale.items.length} item(s)
                        </div>
                      </td>
                      <td className="px-6 py-4 text-slate-700">
                        {sale.customer?.name || 'Walk-in Customer'}
                      </td>
                      <td className="px-6 py-4 text-slate-700">{sale.paymentMethod}</td>
                      <td className="px-6 py-4 text-slate-700">{formatDate(sale.soldAt)}</td>
                      <td className="px-6 py-4 font-semibold text-slate-900">
                        {formatPKR(sale.total)}
                      </td>
                      <td className="px-6 py-4 text-right">
                        <Link to={`/sales/${sale.id}/receipt`}>
                          <Button variant="secondary" size="sm">
                            <ArrowUpRight className="h-4 w-4" />
                            View
                          </Button>
                        </Link>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          )}
        </div>

        <div className="rounded-3xl bg-white border border-slate-200 shadow-sm p-6">
          <h3 className="text-xl font-bold text-slate-900">Payment Breakdown</h3>
          <p className="text-sm text-slate-500 mt-1">Kaunsi payment method zyada use ho rahi hai</p>

          <div className="mt-6 space-y-3">
            {summary?.paymentBreakdown?.length ? (
              summary.paymentBreakdown.map((item) => (
                <div
                  key={item.paymentMethod}
                  className="rounded-2xl border border-slate-200 bg-slate-50 px-4 py-4 flex items-center justify-between"
                >
                  <div>
                    <div className="font-medium text-slate-900">{item.paymentMethod}</div>
                    <div className="text-xs text-slate-500">
                      {item._count._all} transaction(s)
                    </div>
                  </div>
                  <div className="font-semibold text-slate-900">
                    {formatPKR(item._sum.total ?? 0)}
                  </div>
                </div>
              ))
            ) : (
              <div className="rounded-2xl border border-slate-200 bg-slate-50 p-5 text-sm text-slate-500">
                Abhi payment data available nahi.
              </div>
            )}
          </div>
        </div>
      </section>
    </div>
  );
}
