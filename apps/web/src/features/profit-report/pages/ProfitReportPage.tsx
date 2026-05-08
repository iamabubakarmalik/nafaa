import { useQuery } from '@tanstack/react-query';
import {
  TrendingUp, TrendingDown, BarChart3, Award, Package,
} from 'lucide-react';
import {
  ResponsiveContainer, BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip,
} from 'recharts';
import { profitReportApi } from '@/api/profit-report.api';
import { formatPKR } from '@nafaa/shared-utils';

export default function ProfitReportPage() {
  const { data: summary } = useQuery({
    queryKey: ['profit-summary'],
    queryFn: profitReportApi.summary,
  });

  const { data: products = [] } = useQuery({
    queryKey: ['profit-by-product'],
    queryFn: profitReportApi.byProduct,
  });

  const top10 = products.slice(0, 10);

  return (
    <div className="space-y-6">
      <section className="rounded-3xl bg-gradient-to-br from-slate-950 via-emerald-900 to-emerald-700 text-white p-6 shadow-soft">
        <div>
          <div className="inline-flex items-center gap-2 rounded-full bg-white/10 px-3 py-1 text-xs font-medium">
            <BarChart3 className="h-3.5 w-3.5" />
            Profit Analysis
          </div>
          <h2 className="mt-3 text-3xl font-bold">Profit by Product</h2>
          <p className="mt-2 text-sm text-white/80">
            Kis product se kitna profit ho raha hai — tafseeli analysis.
          </p>
        </div>
      </section>

      <section className="grid sm:grid-cols-2 lg:grid-cols-4 gap-4">
        <div className="rounded-2xl bg-white border border-slate-200 p-5 shadow-sm">
          <div className="text-sm text-slate-500">Total Revenue</div>
          <div className="mt-2 text-2xl font-bold text-slate-900">
            {formatPKR(summary?.totalRevenue ?? 0)}
          </div>
          <div className="text-xs text-slate-500 mt-1">All products</div>
        </div>

        <div className="rounded-2xl bg-white border border-slate-200 p-5 shadow-sm">
          <div className="text-sm text-slate-500">Total Cost</div>
          <div className="mt-2 text-2xl font-bold text-rose-700">
            {formatPKR(summary?.totalCost ?? 0)}
          </div>
          <div className="text-xs text-slate-500 mt-1">Cost of goods sold</div>
        </div>

        <div className="rounded-2xl bg-gradient-to-br from-emerald-600 to-emerald-800 text-white p-5 shadow-sm">
          <div className="text-sm text-white/80">Gross Profit</div>
          <div className="mt-2 text-2xl font-bold">
            {formatPKR(summary?.totalProfit ?? 0)}
          </div>
          <div className="text-xs text-white/80 mt-1">
            Margin: {(summary?.overallMargin ?? 0).toFixed(1)}%
          </div>
        </div>

        <div className="rounded-2xl bg-white border border-slate-200 p-5 shadow-sm">
          <div className="text-sm text-slate-500">Products Sold</div>
          <div className="mt-2 text-2xl font-bold text-slate-900">
            {summary?.productsCount ?? 0}
          </div>
          <div className="text-xs text-slate-500 mt-1">Unique items</div>
        </div>
      </section>

      <section className="rounded-3xl bg-white border border-slate-200 shadow-sm p-6">
        <div className="flex items-center justify-between mb-5">
          <div>
            <h3 className="text-xl font-bold text-slate-900">Top 10 Most Profitable Products</h3>
            <p className="text-sm text-slate-500">Best performers</p>
          </div>
          <Award className="h-5 w-5 text-amber-500" />
        </div>

        {top10.length === 0 ? (
          <div className="text-center py-12 text-sm text-slate-500">No data yet</div>
        ) : (
          <div className="h-[360px]">
            <ResponsiveContainer width="100%" height="100%">
              <BarChart
                data={top10.map((p) => ({
                  name: p.name.slice(0, 15),
                  profit: p.profit,
                  revenue: p.revenue,
                }))}
                layout="vertical"
              >
                <CartesianGrid strokeDasharray="3 3" stroke="#e2e8f0" />
                <XAxis type="number" stroke="#64748b" fontSize={11} tickFormatter={(v) => `${(v / 1000).toFixed(0)}k`} />
                <YAxis type="category" dataKey="name" stroke="#64748b" fontSize={11} width={100} />
                <Tooltip
                  formatter={(value: any) => formatPKR(Number(value))}
                  contentStyle={{ borderRadius: 12 }}
                />
                <Bar dataKey="revenue" fill="#94a3b8" radius={[0, 4, 4, 0]} />
                <Bar dataKey="profit" fill="#10b981" radius={[0, 4, 4, 0]} />
              </BarChart>
            </ResponsiveContainer>
          </div>
        )}
      </section>

      <section className="rounded-3xl bg-white border border-slate-200 shadow-sm overflow-hidden">
        <div className="px-6 py-5 border-b border-slate-100">
          <h3 className="text-xl font-bold text-slate-900">All Products Profit</h3>
          <p className="text-sm text-slate-500">Sorted by profit (highest first)</p>
        </div>

        {products.length === 0 ? (
          <div className="p-12 text-center">
            <div className="mx-auto h-16 w-16 rounded-3xl bg-slate-100 flex items-center justify-center">
              <Package className="h-7 w-7 text-slate-400" />
            </div>
            <h4 className="mt-4 text-lg font-semibold text-slate-900">No sales data yet</h4>
          </div>
        ) : (
          <div className="overflow-x-auto">
            <table className="min-w-full text-sm">
              <thead className="bg-slate-50 text-slate-600">
                <tr>
                  <th className="text-left px-6 py-4 font-medium">Product</th>
                  <th className="text-left px-6 py-4 font-medium">Category</th>
                  <th className="text-right px-6 py-4 font-medium">Sold</th>
                  <th className="text-right px-6 py-4 font-medium">Revenue</th>
                  <th className="text-right px-6 py-4 font-medium">Cost</th>
                  <th className="text-right px-6 py-4 font-medium">Profit</th>
                  <th className="text-right px-6 py-4 font-medium">Margin</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-100">
                {products.map((p) => {
                  const isProfit = p.profit > 0;
                  return (
                    <tr key={p.productId} className="hover:bg-slate-50">
                      <td className="px-6 py-3">
                        <div className="font-medium text-slate-900">{p.name}</div>
                        <div className="text-xs text-slate-500">{p.sku || '—'}</div>
                      </td>
                      <td className="px-6 py-3">
                        {p.categoryName ? (
                          <span
                            className="inline-flex px-2 py-0.5 rounded-full text-[10px] font-medium text-white"
                            style={{ backgroundColor: p.categoryColor || '#64748b' }}
                          >
                            {p.categoryName}
                          </span>
                        ) : (
                          <span className="text-slate-400">—</span>
                        )}
                      </td>
                      <td className="px-6 py-3 text-right font-medium">
                        {p.quantitySold} {p.unit}
                      </td>
                      <td className="px-6 py-3 text-right font-medium text-slate-900">
                        {formatPKR(p.revenue)}
                      </td>
                      <td className="px-6 py-3 text-right text-rose-700">
                        {formatPKR(p.cost)}
                      </td>
                      <td className={`px-6 py-3 text-right font-bold ${isProfit ? 'text-emerald-700' : 'text-rose-700'}`}>
                        <div className="flex items-center justify-end gap-1">
                          {isProfit ? <TrendingUp className="h-3 w-3" /> : <TrendingDown className="h-3 w-3" />}
                          {formatPKR(p.profit)}
                        </div>
                      </td>
                      <td className="px-6 py-3 text-right">
                        <span className={`inline-flex px-2 py-0.5 rounded-full text-xs font-bold ${
                          p.margin >= 30 ? 'bg-emerald-100 text-emerald-700' :
                          p.margin >= 15 ? 'bg-amber-100 text-amber-700' :
                          p.margin >= 0 ? 'bg-slate-100 text-slate-700' :
                          'bg-rose-100 text-rose-700'
                        }`}>
                          {p.margin.toFixed(1)}%
                        </span>
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
