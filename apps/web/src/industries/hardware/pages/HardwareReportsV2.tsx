import { useState } from 'react';
import { useQuery } from '@tanstack/react-query';
import {
  BarChart3, Package, Building, Truck, FileText, AlertTriangle,
  TrendingUp, Target, Award, Users, Crown, Activity,
  DollarSign, Star, Clock, Layers,
} from 'lucide-react';
import {
  ResponsiveContainer, AreaChart, Area, BarChart, Bar, PieChart, Pie, Cell,
  XAxis, YAxis, Tooltip, CartesianGrid, Legend, LineChart, Line,
  ComposedChart,
} from 'recharts';
import { formatPKR } from '@core/lib/format';
import { useReportsData } from '@modules/reports/reports/hooks/useReportsData';
import {
  ReportsHero, TabSwitcher, KpiCard, ChartCard, EmptyChart,
  PnLLine, MiniStat, dayLabel, PIE_COLORS,
} from '@modules/reports/reports/components/ReportsShared';
import { projectsApi } from '../api/projects.api';
import { deliveriesApi } from '../api/deliveries.api';
import { quotationsApi } from '../api/quotations.api';

const TABS = [
  { id: 'overview', label: 'Overview', icon: BarChart3 },
  { id: 'projects', label: 'Projects', icon: Building },
  { id: 'deliveries', label: 'Deliveries', icon: Truck },
  { id: 'quotations', label: 'Quotations', icon: FileText },
  { id: 'products', label: 'Top Products', icon: Package },
  { id: 'staff', label: 'Staff', icon: Crown },
];

export default function HardwareReportsV2() {
  const [days, setDays] = useState(14);
  const [tab, setTab] = useState('overview');
  const reports = useReportsData(days);

  const { data: allProjects = [] } = useQuery({
    queryKey: ['projects-for-reports'],
    queryFn: () => projectsApi.list({}),
  });

  const { data: deliveriesSummary } = useQuery({
    queryKey: ['deliveries-summary-reports'],
    queryFn: () => deliveriesApi.summary(),
  });

  const { data: quotationsSummary } = useQuery({
    queryKey: ['quotations-summary-reports'],
    queryFn: () => quotationsApi.summary(),
  });

  const trendData = reports.trend.map((p) => ({ ...p, label: dayLabel(p.date) }));

  const totalRevenue = reports.trend.reduce((s, p) => s + p.sales, 0);
  const totalProfit = reports.trend.reduce((s, p) => s + p.profit, 0);
  const totalOrders = reports.trend.reduce((s, p) => s + p.orders, 0);
  const aov = totalOrders > 0 ? totalRevenue / totalOrders : 0;

  const activeProjects = allProjects.filter((p: any) => !['COMPLETED', 'CANCELLED'].includes(p.status));
  const completedProjects = allProjects.filter((p: any) => p.status === 'COMPLETED');
  const totalProjectRevenue = allProjects.reduce((s: number, p: any) => s + Number(p.totalDelivered || 0), 0);

  return (
    <div className="space-y-6">
      <ReportsHero
        gradient="from-slate-950 via-amber-900 to-orange-700"
        emoji="🔨"
        industryLabel="Hardware"
        title="Hardware Business Reports"
        subtitle="Projects, deliveries, quotations, bulk sales analytics"
        days={days}
        setDays={setDays}
      />

      <TabSwitcher tabs={TABS} active={tab} onChange={setTab} color="orange" />

      {tab === 'overview' && (
        <>
          <section className="grid sm:grid-cols-2 lg:grid-cols-4 gap-4">
            <KpiCard label="Total Revenue" value={formatPKR(totalRevenue)} icon={TrendingUp} color="emerald" isHighlight />
            <KpiCard label="Total Profit" value={formatPKR(totalProfit)} icon={Target} color="amber" />
            <KpiCard label="Active Projects" value={activeProjects.length} icon={Building} color="blue" />
            <KpiCard label="Avg Order Value" value={formatPKR(aov)} icon={DollarSign} color="violet" />
          </section>

          {reports.profitLoss && (
            <section className="rounded-3xl bg-white border border-slate-200 shadow-sm p-6">
              <div className="flex items-center justify-between mb-5 flex-wrap gap-2">
                <div>
                  <h3 className="text-xl font-bold text-slate-900">Hardware Business P&L</h3>
                  <p className="text-sm text-slate-500">{days} days breakdown</p>
                </div>
                <div className={`px-3 py-1.5 rounded-xl text-sm font-extrabold ${
                  reports.profitLoss.netProfit >= 0 ? 'bg-emerald-100 text-emerald-700' : 'bg-rose-100 text-rose-700'
                }`}>
                  Net Margin: {reports.profitLoss.netMargin.toFixed(1)}%
                </div>
              </div>
              <div className="grid lg:grid-cols-2 gap-6">
                <div className="space-y-2">
                  <PnLLine label="Revenue" value={reports.profitLoss.revenue} type="positive" />
                  {reports.profitLoss.discount > 0 && <PnLLine label="Discounts" value={-reports.profitLoss.discount} type="negative" />}
                  {reports.profitLoss.returns > 0 && <PnLLine label="Returns" value={-reports.profitLoss.returns} type="negative" />}
                  <PnLLine label="Net Revenue" value={reports.profitLoss.netRevenue} type="bold" />
                  <PnLLine label="Material Cost" value={-reports.profitLoss.cogs} type="negative" />
                  <PnLLine label="Gross Profit" value={reports.profitLoss.grossProfit} type="bold" sub={`${reports.profitLoss.grossMargin.toFixed(1)}% margin`} />
                  <PnLLine label="Operating Expenses" value={-reports.profitLoss.expenses} type="negative" />
                  <PnLLine label="Net Profit" value={reports.profitLoss.netProfit} type="highlight" sub={`${reports.profitLoss.netMargin.toFixed(1)}% margin`} />
                </div>
                <div className="grid grid-cols-2 gap-3">
                  <MiniStat label="Orders" value={reports.profitLoss.orderCount} color="blue" icon={Package} />
                  <MiniStat label="Projects" value={allProjects.length} color="violet" icon={Building} />
                  <MiniStat label="Cash Paid" value={formatPKR(reports.profitLoss.paid)} color="emerald" icon={DollarSign} />
                  <MiniStat label="Udhaar" value={formatPKR(reports.profitLoss.credit)} color="amber" icon={CreditCardIcon} />
                  <MiniStat label="Deliveries" value={deliveriesSummary?.deliveredCount ?? 0} color="cyan" icon={Truck} />
                  <MiniStat label="Quotations" value={quotationsSummary?.totalQuotations ?? 0} color="pink" icon={FileText} />
                </div>
              </div>
            </section>
          )}

          <ChartCard title="Hardware Sales Trend" subtitle={`${days}-day analysis`} icon={TrendingUp} color="orange">
            <ResponsiveContainer width="100%" height="100%">
              <ComposedChart data={trendData}>
                <defs>
                  <linearGradient id="hwsalesGrad" x1="0" y1="0" x2="0" y2="1">
                    <stop offset="0%" stopColor="#a16207" stopOpacity={0.5} />
                    <stop offset="100%" stopColor="#a16207" stopOpacity={0} />
                  </linearGradient>
                </defs>
                <CartesianGrid strokeDasharray="3 3" stroke="#e2e8f0" />
                <XAxis dataKey="label" stroke="#64748b" fontSize={11} />
                <YAxis yAxisId="left" stroke="#64748b" fontSize={11} tickFormatter={(v) => `${(v / 1000).toFixed(0)}k`} />
                <YAxis yAxisId="right" orientation="right" stroke="#64748b" fontSize={11} />
                <Tooltip formatter={(value: any, name: any) => name === 'Orders' ? value : formatPKR(Number(value))} contentStyle={{ borderRadius: 12 }} />
                <Legend wrapperStyle={{ fontSize: 12 }} />
                <Area yAxisId="left" type="monotone" dataKey="sales" name="Sales" fill="url(#hwsalesGrad)" stroke="#a16207" strokeWidth={2.5} />
                <Bar yAxisId="left" dataKey="profit" name="Profit" fill="#8b5cf6" radius={[4, 4, 0, 0]} barSize={20} />
                <Line yAxisId="right" type="monotone" dataKey="orders" name="Orders" stroke="#10b981" strokeWidth={2.5} dot={{ r: 4 }} />
              </ComposedChart>
            </ResponsiveContainer>
          </ChartCard>
        </>
      )}

      {tab === 'projects' && (
        <>
          <section className="grid sm:grid-cols-3 gap-4">
            <KpiCard label="Active Projects" value={activeProjects.length} icon={Building} color="blue" isHighlight />
            <KpiCard label="Completed" value={completedProjects.length} icon={Award} color="emerald" />
            <KpiCard label="Total Delivered" value={formatPKR(totalProjectRevenue)} icon={Truck} color="amber" />
          </section>

          <section className="rounded-3xl bg-white border border-slate-200 shadow-sm overflow-hidden">
            <div className="px-6 py-5 border-b border-slate-100">
              <h3 className="text-xl font-bold text-slate-900">Top Revenue Projects</h3>
            </div>
            {allProjects.length === 0 ? (
              <EmptyChart message="No projects yet" />
            ) : (
              <div className="overflow-x-auto">
                <table className="w-full text-sm">
                  <thead className="bg-slate-50 text-slate-600">
                    <tr>
                      <th className="text-center px-3 py-3 font-bold text-[10px] uppercase w-12">#</th>
                      <th className="text-left px-3 py-3 font-bold text-[10px] uppercase">Project</th>
                      <th className="text-left px-3 py-3 font-bold text-[10px] uppercase">Customer</th>
                      <th className="text-center px-3 py-3 font-bold text-[10px] uppercase">Status</th>
                      <th className="text-right px-3 py-3 font-bold text-[10px] uppercase">Delivered</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-slate-100">
                    {[...allProjects].sort((a: any, b: any) => b.totalDelivered - a.totalDelivered).slice(0, 10).map((p: any, idx: number) => (
                      <tr key={p.id} className="hover:bg-slate-50">
                        <td className="px-3 py-3 text-center">
                          <span className={`inline-flex h-7 w-7 rounded-lg items-center justify-center font-extrabold text-xs ${
                            idx === 0 ? 'bg-amber-100 text-amber-700' :
                            idx === 1 ? 'bg-slate-200 text-slate-700' :
                            idx === 2 ? 'bg-orange-100 text-orange-700' :
                            'bg-slate-100 text-slate-500'
                          }`}>
                            {idx < 3 ? <Crown className="h-3.5 w-3.5" /> : idx + 1}
                          </span>
                        </td>
                        <td className="px-3 py-3">
                          <div className="font-mono font-extrabold text-xs text-slate-500">{p.projectNumber}</div>
                          <div className="font-bold text-slate-900">{p.name}</div>
                        </td>
                        <td className="px-3 py-3 text-slate-700">{p.customerName}</td>
                        <td className="px-3 py-3 text-center">
                          <span className="inline-flex px-2 py-0.5 rounded-full text-xs font-extrabold bg-slate-100 text-slate-700">
                            {p.status.replace('_', ' ')}
                          </span>
                        </td>
                        <td className="px-3 py-3 text-right font-extrabold text-emerald-700 tabular-nums">{formatPKR(p.totalDelivered)}</td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            )}
          </section>
        </>
      )}

      {tab === 'deliveries' && (
        <>
          <section className="grid sm:grid-cols-4 gap-4">
            <KpiCard label="Pending" value={deliveriesSummary?.pending ?? 0} icon={Clock} color="amber" />
            <KpiCard label="In Transit" value={deliveriesSummary?.inTransit ?? 0} icon={Truck} color="orange" />
            <KpiCard label="Delivered" value={deliveriesSummary?.deliveredCount ?? 0} icon={Award} color="emerald" isHighlight />
            <KpiCard label="Revenue" value={formatPKR(deliveriesSummary?.deliveredRevenue ?? 0)} icon={DollarSign} color="violet" />
          </section>

          <div className="rounded-3xl bg-white border border-slate-200 shadow-sm p-8 text-center">
            <Truck className="h-16 w-16 text-slate-300 mx-auto mb-3" />
            <h3 className="font-extrabold text-slate-700">Delivery Details</h3>
            <p className="text-sm text-slate-500 mt-1">Visit Deliveries page for detailed dispatch tracking</p>
          </div>
        </>
      )}

      {tab === 'quotations' && (
        <>
          <section className="grid sm:grid-cols-4 gap-4">
            <KpiCard label="Total Quotations" value={quotationsSummary?.totalQuotations ?? 0} icon={FileText} color="violet" />
            <KpiCard label="Accepted" value={quotationsSummary?.acceptedCount ?? 0} icon={Award} color="emerald" isHighlight />
            <KpiCard label="Pending" value={quotationsSummary?.pendingCount ?? 0} icon={Clock} color="amber" />
            <KpiCard label="Accepted Value" value={formatPKR(quotationsSummary?.acceptedValue ?? 0)} icon={DollarSign} color="cyan" />
          </section>

          <div className="rounded-3xl bg-white border border-slate-200 shadow-sm p-8 text-center">
            <FileText className="h-16 w-16 text-slate-300 mx-auto mb-3" />
            <h3 className="font-extrabold text-slate-700">Quotation Details</h3>
            <p className="text-sm text-slate-500 mt-1">Visit Quotations page for detailed estimate tracking</p>
          </div>
        </>
      )}

      {tab === 'products' && (
        <section className="rounded-3xl bg-white border border-slate-200 shadow-sm overflow-hidden">
          <div className="px-6 py-5 border-b border-slate-100">
            <h3 className="text-xl font-bold text-slate-900">Top Selling Hardware</h3>
            <p className="text-sm text-slate-500">Best products with profit</p>
          </div>
          <div className="overflow-x-auto">
            <table className="w-full text-sm">
              <thead className="bg-slate-50 text-slate-600">
                <tr>
                  <th className="text-center px-3 py-3 font-bold text-[10px] uppercase w-12">#</th>
                  <th className="text-left px-3 py-3 font-bold text-[10px] uppercase">Product</th>
                  <th className="text-right px-3 py-3 font-bold text-[10px] uppercase">Qty Sold</th>
                  <th className="text-right px-3 py-3 font-bold text-[10px] uppercase">Orders</th>
                  <th className="text-right px-3 py-3 font-bold text-[10px] uppercase">Revenue</th>
                  <th className="text-right px-3 py-3 font-bold text-[10px] uppercase">Profit</th>
                  <th className="text-center px-3 py-3 font-bold text-[10px] uppercase">Margin</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-100">
                {reports.topProducts.map((p, idx) => (
                  <tr key={p.productId} className="hover:bg-slate-50">
                    <td className="px-3 py-3 text-center">
                      <span className={`inline-flex h-7 w-7 rounded-lg items-center justify-center font-extrabold text-xs ${
                        idx === 0 ? 'bg-amber-100 text-amber-700' :
                        idx === 1 ? 'bg-slate-200 text-slate-700' :
                        idx === 2 ? 'bg-orange-100 text-orange-700' :
                        'bg-slate-100 text-slate-500'
                      }`}>
                        {idx < 3 ? <Crown className="h-3.5 w-3.5" /> : idx + 1}
                      </span>
                    </td>
                    <td className="px-3 py-3">
                      <div className="flex items-center gap-3">
                        <div className="h-10 w-10 rounded-lg bg-amber-100 overflow-hidden flex items-center justify-center">
                          {p.product?.images?.[0]?.url ? (
                            <img src={p.product.images[0].url} alt="" className="h-full w-full object-cover" />
                          ) : (
                            <Package className="h-4 w-4 text-amber-400" />
                          )}
                        </div>
                        <div className="font-bold text-slate-900">{p.product?.name}</div>
                      </div>
                    </td>
                    <td className="px-3 py-3 text-right font-bold">{p.quantitySold.toFixed(0)} {p.product?.unit}</td>
                    <td className="px-3 py-3 text-right text-slate-700">{p.orderCount}</td>
                    <td className="px-3 py-3 text-right font-extrabold text-emerald-700 tabular-nums">{formatPKR(p.revenue)}</td>
                    <td className="px-3 py-3 text-right font-extrabold text-violet-700 tabular-nums">{formatPKR(p.profit)}</td>
                    <td className="px-3 py-3 text-center">
                      <span className={`inline-flex px-2 py-0.5 rounded-full text-xs font-extrabold ${
                        p.margin > 25 ? 'bg-emerald-100 text-emerald-700' :
                        p.margin > 10 ? 'bg-amber-100 text-amber-700' :
                        'bg-rose-100 text-rose-700'
                      }`}>
                        {p.margin.toFixed(1)}%
                      </span>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </section>
      )}

      {tab === 'staff' && (
        <section className="rounded-3xl bg-white border border-slate-200 shadow-sm overflow-hidden">
          <div className="px-6 py-5 border-b border-slate-100">
            <h3 className="text-xl font-bold text-slate-900">Staff Performance</h3>
          </div>
          <table className="w-full text-sm">
            <thead className="bg-slate-50 text-slate-600">
              <tr>
                <th className="text-center px-6 py-3 font-bold text-xs uppercase w-16">Rank</th>
                <th className="text-left px-6 py-3 font-bold text-xs uppercase">Staff</th>
                <th className="text-right px-6 py-3 font-bold text-xs uppercase">Orders</th>
                <th className="text-right px-6 py-3 font-bold text-xs uppercase">Sales</th>
                <th className="text-right px-6 py-3 font-bold text-xs uppercase">AOV</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-100">
              {reports.cashiers.map((c: any, idx: number) => (
                <tr key={c.userId || idx} className="hover:bg-slate-50">
                  <td className="px-6 py-3 text-center">
                    <span className={`inline-flex h-8 w-8 rounded-lg items-center justify-center font-extrabold text-xs ${
                      idx === 0 ? 'bg-amber-500 text-white' :
                      idx === 1 ? 'bg-slate-400 text-white' :
                      idx === 2 ? 'bg-orange-600 text-white' :
                      'bg-slate-100 text-slate-500'
                    }`}>
                      {idx < 3 ? <Crown className="h-4 w-4" /> : idx + 1}
                    </span>
                  </td>
                  <td className="px-6 py-3">
                    <div className="flex items-center gap-3">
                      {c.user?.avatarUrl ? (
                        <img src={c.user.avatarUrl} alt="" className="h-9 w-9 rounded-xl object-cover" />
                      ) : (
                        <div className="h-9 w-9 rounded-xl bg-amber-100 text-amber-700 flex items-center justify-center font-bold">
                          {c.user?.fullName?.charAt(0) || '?'}
                        </div>
                      )}
                      <div>
                        <div className="font-bold text-slate-900">{c.user?.fullName || 'Unknown'}</div>
                        <div className="text-xs text-slate-500">{c.user?.role}</div>
                      </div>
                    </div>
                  </td>
                  <td className="px-6 py-3 text-right font-bold">{c.orderCount}</td>
                  <td className="px-6 py-3 text-right font-extrabold text-emerald-700 tabular-nums">{formatPKR(c.totalSales)}</td>
                  <td className="px-6 py-3 text-right text-slate-700 tabular-nums">{formatPKR(c.avgOrderValue)}</td>
                </tr>
              ))}
            </tbody>
          </table>
        </section>
      )}
    </div>
  );
}

function CreditCardIcon(props: any) {
  return <DollarSign {...props} />;
}
