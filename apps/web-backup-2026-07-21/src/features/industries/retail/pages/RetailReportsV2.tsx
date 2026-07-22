import { useState } from 'react';
import {
  BarChart3, ShoppingCart, Sparkles, Layers, AlertTriangle, Zap,
  TrendingUp, Target, Award, Users, Crown, Activity,
  DollarSign, Star, Clock, Package, ArrowRight, Boxes,
} from 'lucide-react';
import {
  ResponsiveContainer, AreaChart, Area, BarChart, Bar, PieChart, Pie, Cell,
  XAxis, YAxis, Tooltip, CartesianGrid, Legend, LineChart, Line,
  ComposedChart, RadarChart, Radar, PolarGrid, PolarAngleAxis, PolarRadiusAxis,
} from 'recharts';
import { formatPKR } from '@/lib/format';
import { useReportsData } from '@/features/reports/hooks/useReportsData';
import {
  ReportsHero, TabSwitcher, KpiCard, ChartCard, EmptyChart,
  PnLLine, MiniStat, dayLabel, PIE_COLORS,
} from '@/features/reports/components/ReportsShared';

const TABS = [
  { id: 'overview', label: 'Overview', icon: BarChart3 },
  { id: 'sales', label: 'Sales Analytics', icon: TrendingUp },
  { id: 'products', label: 'Products', icon: Package },
  { id: 'customers', label: 'Customers', icon: Users },
  { id: 'inventory', label: 'Inventory', icon: Boxes },
  { id: 'patterns', label: 'Patterns', icon: Activity },
];

export default function RetailReportsV2() {
  const [days, setDays] = useState(14);
  const [tab, setTab] = useState('overview');
  const reports = useReportsData(days);

  const trendData = reports.trend.map((p) => ({ ...p, label: dayLabel(p.date) }));
  const sveData = reports.salesVsExpenses.map((p) => ({ ...p, label: dayLabel(p.date) }));

  const totalRevenue = reports.trend.reduce((s, p) => s + p.sales, 0);
  const totalProfit = reports.trend.reduce((s, p) => s + p.profit, 0);
  const totalOrders = reports.trend.reduce((s, p) => s + p.orders, 0);
  const aov = totalOrders > 0 ? totalRevenue / totalOrders : 0;

  return (
    <div className="space-y-6">
      <ReportsHero
        gradient="from-slate-950 via-sky-900 to-cyan-700"
        emoji="🛒"
        industryLabel="Retail"
        title="Retail Store Reports"
        subtitle="Best sellers, combos, quick keys, damage tracking, slow movers"
        days={days}
        setDays={setDays}
      />

      <TabSwitcher tabs={TABS} active={tab} onChange={setTab} color="sky" />

      {tab === 'overview' && (
        <>
          <section className="grid sm:grid-cols-2 lg:grid-cols-4 gap-4">
            <KpiCard label="Total Revenue" value={formatPKR(totalRevenue)} icon={TrendingUp} color="sky" isHighlight />
            <KpiCard label="Total Profit" value={formatPKR(totalProfit)} icon={Target} color="emerald" />
            <KpiCard label="Total Orders" value={String(totalOrders)} icon={ShoppingCart} color="violet" />
            <KpiCard label="Avg Order Value" value={formatPKR(aov)} icon={DollarSign} color="amber" />
          </section>

          {reports.profitLoss && (
            <section className="rounded-3xl bg-white border border-slate-200 shadow-sm p-6">
              <div className="flex items-center justify-between mb-5 flex-wrap gap-2">
                <div>
                  <h3 className="text-xl font-bold text-slate-900">Retail Store P&L</h3>
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
                  <PnLLine label="Cost of Goods (COGS)" value={-reports.profitLoss.cogs} type="negative" />
                  <PnLLine label="Gross Profit" value={reports.profitLoss.grossProfit} type="bold" sub={`${reports.profitLoss.grossMargin.toFixed(1)}% margin`} />
                  <PnLLine label="Operating Expenses" value={-reports.profitLoss.expenses} type="negative" />
                  <PnLLine label="Net Profit" value={reports.profitLoss.netProfit} type="highlight" sub={`${reports.profitLoss.netMargin.toFixed(1)}% margin`} />
                </div>
                <div className="grid grid-cols-2 gap-3">
                  <MiniStat label="Orders" value={reports.profitLoss.orderCount} color="blue" icon={ShoppingCart} />
                  <MiniStat label="Returns" value={reports.profitLoss.returnCount} color="rose" icon={Activity} />
                  <MiniStat label="Cash Paid" value={formatPKR(reports.profitLoss.paid)} color="emerald" icon={DollarSign} />
                  <MiniStat label="Udhaar" value={formatPKR(reports.profitLoss.credit)} color="amber" icon={Package} />
                  <MiniStat label="Purchases" value={formatPKR(reports.profitLoss.purchases)} color="violet" icon={Package} />
                  <MiniStat label="Discount" value={formatPKR(reports.profitLoss.discount)} color="pink" icon={Star} />
                </div>
              </div>
            </section>
          )}

          <ChartCard title="Retail Sales Trend" subtitle={`${days}-day analysis`} icon={TrendingUp} color="sky">
            <ResponsiveContainer width="100%" height="100%">
              <ComposedChart data={trendData}>
                <defs>
                  <linearGradient id="rtsalesGrad" x1="0" y1="0" x2="0" y2="1">
                    <stop offset="0%" stopColor="#0ea5e9" stopOpacity={0.5} />
                    <stop offset="100%" stopColor="#0ea5e9" stopOpacity={0} />
                  </linearGradient>
                </defs>
                <CartesianGrid strokeDasharray="3 3" stroke="#e2e8f0" />
                <XAxis dataKey="label" stroke="#64748b" fontSize={11} />
                <YAxis yAxisId="left" stroke="#64748b" fontSize={11} tickFormatter={(v) => `${(v / 1000).toFixed(0)}k`} />
                <YAxis yAxisId="right" orientation="right" stroke="#64748b" fontSize={11} />
                <Tooltip formatter={(value: any, name: any) => name === 'Orders' ? value : formatPKR(Number(value))} contentStyle={{ borderRadius: 12 }} />
                <Legend wrapperStyle={{ fontSize: 12 }} />
                <Area yAxisId="left" type="monotone" dataKey="sales" name="Sales" fill="url(#rtsalesGrad)" stroke="#0ea5e9" strokeWidth={2.5} />
                <Bar yAxisId="left" dataKey="profit" name="Profit" fill="#10b981" radius={[4, 4, 0, 0]} barSize={20} />
                <Line yAxisId="right" type="monotone" dataKey="orders" name="Orders" stroke="#f59e0b" strokeWidth={2.5} dot={{ r: 4 }} />
              </ComposedChart>
            </ResponsiveContainer>
          </ChartCard>
        </>
      )}

      {tab === 'sales' && (
        <>
          <ChartCard title="Sales vs Expenses" subtitle="Net profit visualization" icon={TrendingUp} color="sky">
            <ResponsiveContainer width="100%" height="100%">
              <ComposedChart data={sveData}>
                <defs>
                  <linearGradient id="sveSales" x1="0" y1="0" x2="0" y2="1">
                    <stop offset="0%" stopColor="#0ea5e9" stopOpacity={0.5} />
                    <stop offset="100%" stopColor="#0ea5e9" stopOpacity={0} />
                  </linearGradient>
                </defs>
                <CartesianGrid strokeDasharray="3 3" stroke="#e2e8f0" />
                <XAxis dataKey="label" stroke="#64748b" fontSize={10} />
                <YAxis stroke="#64748b" fontSize={11} tickFormatter={(v) => `${(v / 1000).toFixed(0)}k`} />
                <Tooltip formatter={(value: any) => formatPKR(Number(value))} contentStyle={{ borderRadius: 12 }} />
                <Legend wrapperStyle={{ fontSize: 12 }} />
                <Area type="monotone" dataKey="sales" name="Sales" fill="url(#sveSales)" stroke="#0ea5e9" strokeWidth={2.5} />
                <Bar dataKey="expenses" name="Expenses" fill="#ef4444" radius={[4, 4, 0, 0]} barSize={15} />
                <Line type="monotone" dataKey="profit" name="Net Profit" stroke="#10b981" strokeWidth={3} dot={{ r: 4 }} />
              </ComposedChart>
            </ResponsiveContainer>
          </ChartCard>

          <ChartCard title="Paid vs Credit Split" subtitle="Cash flow analysis" icon={DollarSign} color="sky">
            <ResponsiveContainer width="100%" height="100%">
              <AreaChart data={trendData}>
                <defs>
                  <linearGradient id="paidGradRt" x1="0" y1="0" x2="0" y2="1">
                    <stop offset="0%" stopColor="#10b981" stopOpacity={0.6} />
                    <stop offset="100%" stopColor="#10b981" stopOpacity={0.1} />
                  </linearGradient>
                  <linearGradient id="creditGradRt" x1="0" y1="0" x2="0" y2="1">
                    <stop offset="0%" stopColor="#f59e0b" stopOpacity={0.6} />
                    <stop offset="100%" stopColor="#f59e0b" stopOpacity={0.1} />
                  </linearGradient>
                </defs>
                <CartesianGrid strokeDasharray="3 3" stroke="#e2e8f0" />
                <XAxis dataKey="label" stroke="#64748b" fontSize={10} />
                <YAxis stroke="#64748b" fontSize={11} tickFormatter={(v) => `${(v / 1000).toFixed(0)}k`} />
                <Tooltip formatter={(value: any) => formatPKR(Number(value))} contentStyle={{ borderRadius: 12 }} />
                <Legend wrapperStyle={{ fontSize: 12 }} />
                <Area type="monotone" dataKey="paid" name="Paid" stackId="1" stroke="#10b981" fill="url(#paidGradRt)" strokeWidth={2} />
                <Area type="monotone" dataKey="credit" name="Udhaar" stackId="1" stroke="#f59e0b" fill="url(#creditGradRt)" strokeWidth={2} />
              </AreaChart>
            </ResponsiveContainer>
          </ChartCard>
        </>
      )}

      {tab === 'products' && (
        <>
          <section className="grid lg:grid-cols-2 gap-6">
            <ChartCard title="Top Products Revenue" subtitle="Best sellers" icon={Award} color="sky">
              <ResponsiveContainer width="100%" height="100%">
                <BarChart
                  data={reports.topProducts.slice(0, 8).map((p) => ({
                    name: p.product?.name?.slice(0, 14) || 'Unknown',
                    revenue: p.revenue,
                    profit: p.profit,
                  }))}
                  layout="vertical"
                >
                  <CartesianGrid strokeDasharray="3 3" stroke="#e2e8f0" />
                  <XAxis type="number" stroke="#64748b" fontSize={10} tickFormatter={(v) => `${(v / 1000).toFixed(0)}k`} />
                  <YAxis type="category" dataKey="name" stroke="#64748b" fontSize={10} width={95} />
                  <Tooltip formatter={(value: any) => formatPKR(Number(value))} contentStyle={{ borderRadius: 12 }} />
                  <Legend wrapperStyle={{ fontSize: 11 }} />
                  <Bar dataKey="revenue" name="Revenue" fill="#0ea5e9" radius={[0, 6, 6, 0]} />
                  <Bar dataKey="profit" name="Profit" fill="#10b981" radius={[0, 6, 6, 0]} />
                </BarChart>
              </ResponsiveContainer>
            </ChartCard>

            <ChartCard title="Category Distribution" subtitle="Revenue split" icon={Package} color="sky">
              {reports.categoryBreakdown.length > 0 ? (
                <ResponsiveContainer width="100%" height="100%">
                  <PieChart>
                    <Pie
                      data={reports.categoryBreakdown}
                      dataKey="revenue"
                      nameKey="name"
                      cx="50%" cy="50%"
                      outerRadius={100} innerRadius={50}
                      paddingAngle={2}
                      label={(entry: any) => {
                        const total = reports.categoryBreakdown.reduce((s, c) => s + c.revenue, 0);
                        const pct = total > 0 ? ((entry.revenue / total) * 100).toFixed(0) : '0';
                        return `${pct}%`;
                      }}
                      labelLine={false}
                    >
                      {reports.categoryBreakdown.map((c, idx) => (
                        <Cell key={c.id} fill={c.color || PIE_COLORS[idx % PIE_COLORS.length]} />
                      ))}
                    </Pie>
                    <Tooltip formatter={(value: any) => formatPKR(Number(value))} contentStyle={{ borderRadius: 12 }} />
                    <Legend wrapperStyle={{ fontSize: 10, paddingTop: 12 }} iconType="circle" />
                  </PieChart>
                </ResponsiveContainer>
              ) : <EmptyChart message="No category data" />}
            </ChartCard>
          </section>

          <section className="rounded-3xl bg-white border border-slate-200 shadow-sm overflow-hidden">
            <div className="px-6 py-5 border-b border-slate-100">
              <h3 className="text-xl font-bold text-slate-900">Top Products Details</h3>
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
                          <div className="h-10 w-10 rounded-lg bg-sky-100 overflow-hidden flex items-center justify-center">
                            {p.product?.images?.[0]?.url ? (
                              <img src={p.product.images[0].url} alt="" className="h-full w-full object-cover" />
                            ) : (
                              <Package className="h-4 w-4 text-sky-400" />
                            )}
                          </div>
                          <div className="font-bold text-slate-900">{p.product?.name}</div>
                        </div>
                      </td>
                      <td className="px-3 py-3 text-right font-bold">{p.quantitySold} {p.product?.unit}</td>
                      <td className="px-3 py-3 text-right text-slate-700">{p.orderCount}</td>
                      <td className="px-3 py-3 text-right font-extrabold text-emerald-700 tabular-nums">{formatPKR(p.revenue)}</td>
                      <td className="px-3 py-3 text-right font-extrabold text-violet-700 tabular-nums">{formatPKR(p.profit)}</td>
                      <td className="px-3 py-3 text-center">
                        <span className={`inline-flex px-2 py-0.5 rounded-full text-xs font-extrabold ${
                          p.margin > 30 ? 'bg-emerald-100 text-emerald-700' :
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
        </>
      )}

      {tab === 'customers' && (
        <section className="rounded-3xl bg-white border border-slate-200 shadow-sm overflow-hidden">
          <div className="px-6 py-5 border-b border-slate-100">
            <h3 className="text-xl font-bold text-slate-900">Top Customers</h3>
            <p className="text-sm text-slate-500">Most valuable buyers</p>
          </div>
          {reports.topCustomers.length === 0 ? (
            <EmptyChart message="No customer data" />
          ) : (
            <div className="divide-y divide-slate-100">
              {reports.topCustomers.map((tc, idx) => {
                const rankColors = ['bg-amber-500', 'bg-slate-400', 'bg-orange-600'];
                return (
                  <div key={tc.customerId} className="px-6 py-4 flex items-center justify-between gap-4 hover:bg-slate-50">
                    <div className="flex items-center gap-3 min-w-0">
                      <div className={`h-12 w-12 rounded-2xl ${rankColors[idx] || 'bg-sky-500'} text-white font-extrabold flex items-center justify-center shadow-md shrink-0`}>
                        {idx < 3 ? <Crown className="h-5 w-5" /> : `#${idx + 1}`}
                      </div>
                      <div className="h-10 w-10 rounded-xl bg-slate-100 flex items-center justify-center font-bold text-slate-600">
                        {tc.customer?.name?.charAt(0) || '?'}
                      </div>
                      <div className="min-w-0">
                        <div className="font-bold text-slate-900">{tc.customer?.name || 'Unknown'}</div>
                        <div className="text-xs text-slate-500">
                          {tc.customer?.phone || 'No phone'} • {tc.orderCount} orders
                        </div>
                      </div>
                    </div>
                    <div className="text-right shrink-0">
                      <div className="font-extrabold text-sky-700 text-lg tabular-nums">{formatPKR(tc.totalSpent)}</div>
                      <div className="text-[10px] text-slate-500 font-bold">AOV {formatPKR(tc.avgOrderValue)}</div>
                    </div>
                  </div>
                );
              })}
            </div>
          )}
        </section>
      )}

      {tab === 'inventory' && reports.inventoryValue && (
        <>
          <section className="grid sm:grid-cols-4 gap-4">
            <KpiCard label="Total Products" value={reports.inventoryValue.totals.totalProducts} icon={Package} color="sky" />
            <KpiCard label="Total Units" value={reports.inventoryValue.totals.totalUnits} icon={Boxes} color="violet" />
            <KpiCard label="Cost Value" value={formatPKR(reports.inventoryValue.totals.totalCostValue)} icon={DollarSign} color="emerald" />
            <KpiCard label="Potential Profit" value={formatPKR(reports.inventoryValue.totals.potentialProfit)} icon={Target} color="amber" isHighlight />
          </section>

          <ChartCard title="Inventory Value by Category" icon={BarChart3} color="sky">
            <ResponsiveContainer width="100%" height="100%">
              <BarChart data={reports.inventoryValue.byCategory}>
                <CartesianGrid strokeDasharray="3 3" stroke="#e2e8f0" />
                <XAxis dataKey="name" stroke="#64748b" fontSize={11} />
                <YAxis stroke="#64748b" fontSize={11} tickFormatter={(v) => `${(v / 1000).toFixed(0)}k`} />
                <Tooltip formatter={(value: any) => formatPKR(Number(value))} contentStyle={{ borderRadius: 12 }} />
                <Legend wrapperStyle={{ fontSize: 11 }} />
                <Bar dataKey="costValue" name="Cost Value" fill="#0ea5e9" radius={[6, 6, 0, 0]} />
                <Bar dataKey="sellValue" name="Sell Value" fill="#10b981" radius={[6, 6, 0, 0]} />
              </BarChart>
            </ResponsiveContainer>
          </ChartCard>
        </>
      )}

      {tab === 'patterns' && (
        <>
          {reports.weekdayPattern.length > 0 && (
            <section className="grid lg:grid-cols-2 gap-6">
              <ChartCard title="Weekday Pattern" subtitle="Which days perform best" icon={Activity} color="sky">
                <ResponsiveContainer width="100%" height="100%">
                  <RadarChart data={reports.weekdayPattern}>
                    <PolarGrid stroke="#e2e8f0" />
                    <PolarAngleAxis dataKey="day" stroke="#64748b" fontSize={11} />
                    <PolarRadiusAxis stroke="#64748b" fontSize={10} tickFormatter={(v) => `${(v / 1000).toFixed(0)}k`} />
                    <Radar name="Sales" dataKey="sales" stroke="#0ea5e9" fill="#0ea5e9" fillOpacity={0.4} strokeWidth={2} />
                    <Tooltip formatter={(value: any) => formatPKR(Number(value))} contentStyle={{ borderRadius: 12 }} />
                  </RadarChart>
                </ResponsiveContainer>
              </ChartCard>

              <ChartCard title="Average Per Weekday" icon={BarChart3} color="sky">
                <ResponsiveContainer width="100%" height="100%">
                  <BarChart data={reports.weekdayPattern}>
                    <CartesianGrid strokeDasharray="3 3" stroke="#e2e8f0" />
                    <XAxis dataKey="day" stroke="#64748b" fontSize={11} />
                    <YAxis stroke="#64748b" fontSize={11} tickFormatter={(v) => `${(v / 1000).toFixed(0)}k`} />
                    <Tooltip formatter={(value: any) => formatPKR(Number(value))} contentStyle={{ borderRadius: 12 }} />
                    <Bar dataKey="avg" name="Avg Sales" radius={[6, 6, 0, 0]}>
                      {reports.weekdayPattern.map((entry, idx) => {
                        const max = Math.max(...reports.weekdayPattern.map((w) => w.avg));
                        return <Cell key={idx} fill={entry.avg === max ? '#10b981' : '#94a3b8'} />;
                      })}
                    </Bar>
                  </BarChart>
                </ResponsiveContainer>
              </ChartCard>
            </section>
          )}

          {reports.expenseBreakdown && reports.expenseBreakdown.byCategory.length > 0 && (
            <ChartCard
              title="Expense Breakdown"
              subtitle={`Total: ${formatPKR(reports.expenseBreakdown.total)}`}
              icon={DollarSign}
              color="sky"
            >
              <ResponsiveContainer width="100%" height="100%">
                <PieChart>
                  <Pie
                    data={reports.expenseBreakdown.byCategory}
                    dataKey="amount"
                    nameKey="name"
                    cx="50%" cy="50%"
                    outerRadius={120} innerRadius={60}
                    paddingAngle={2}
                    label={(entry: any) => `${entry.name} (${entry.percent.toFixed(0)}%)`}
                  >
                    {reports.expenseBreakdown.byCategory.map((c, idx) => (
                      <Cell key={c.id} fill={c.color || PIE_COLORS[idx % PIE_COLORS.length]} />
                    ))}
                  </Pie>
                  <Tooltip formatter={(value: any) => formatPKR(Number(value))} contentStyle={{ borderRadius: 12 }} />
                  <Legend wrapperStyle={{ fontSize: 11 }} iconType="circle" />
                </PieChart>
              </ResponsiveContainer>
            </ChartCard>
          )}
        </>
      )}
    </div>
  );
}
