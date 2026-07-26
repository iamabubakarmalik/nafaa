import { useState } from 'react';
import {
  BarChart3, ShoppingCart, TrendingUp, Target, Award, Users,
  Crown, Activity, DollarSign, Star, Package, Boxes,
  Download, Printer, TrendingDown, AlertTriangle, Percent,
  Calendar, Zap, ChevronRight, Sparkles, Clock, Trophy,
} from 'lucide-react';
import {
  ResponsiveContainer, AreaChart, Area, BarChart, Bar, PieChart, Pie, Cell,
  XAxis, YAxis, Tooltip, CartesianGrid, Legend, LineChart, Line,
  ComposedChart, RadarChart, Radar, PolarGrid, PolarAngleAxis, PolarRadiusAxis,
} from 'recharts';
import { formatPKR } from '@core/lib/format';
import { useReportsData } from '@modules/reports/reports/hooks/useReportsData';
import {
  ReportsHero, TabSwitcher, KpiCard, ChartCard, EmptyChart,
  PnLLine, MiniStat, dayLabel, PIE_COLORS,
} from '@modules/reports/reports/components/ReportsShared';
import { useCostHidden, PrivacyToggle } from '@core/ui/HiddenValue';
import { toast } from 'sonner';

const TABS = [
  { id: 'overview', label: 'Overview', icon: BarChart3 },
  { id: 'sales', label: 'Sales', icon: TrendingUp },
  { id: 'products', label: 'Products', icon: Package },
  { id: 'customers', label: 'Customers', icon: Users },
  { id: 'inventory', label: 'Inventory', icon: Boxes },
  { id: 'patterns', label: 'Patterns', icon: Activity },
  { id: 'insights', label: 'Insights', icon: Sparkles },
];

export default function RetailReportsV2() {
  const [days, setDays] = useState(30);
  const [tab, setTab] = useState('overview');
  const hideCost = useCostHidden();
  const reports = useReportsData(days);

  const trendData = reports.trend.map((p) => ({ ...p, label: dayLabel(p.date) }));
  const sveData = reports.salesVsExpenses.map((p) => ({ ...p, label: dayLabel(p.date) }));

  const totalRevenue = reports.trend.reduce((s, p) => s + p.sales, 0);
  const totalProfit = reports.trend.reduce((s, p) => s + p.profit, 0);
  const totalOrders = reports.trend.reduce((s, p) => s + p.orders, 0);
  const totalPaid = reports.trend.reduce((s, p) => s + (p.paid || 0), 0);
  const totalCredit = reports.trend.reduce((s, p) => s + (p.credit || 0), 0);
  const aov = totalOrders > 0 ? totalRevenue / totalOrders : 0;
  const profitMargin = totalRevenue > 0 ? (totalProfit / totalRevenue) * 100 : 0;

  const bestDay = trendData.reduce((best, day) => day.sales > best.sales ? day : best, trendData[0] || { label: '—', sales: 0 });
  const worstDay = trendData.filter((d) => d.sales > 0).reduce((worst, day) => day.sales < worst.sales ? day : worst, trendData.find((d) => d.sales > 0) || { label: '—', sales: 0 });

  const showCost = (v: number) => hideCost ? '•••••' : formatPKR(v);

  const exportPDF = () => {
    toast.success('Print dialog khul raha hai...');
    window.print();
  };

  const exportCSV = () => {
    const headers = ['Date', 'Sales', 'Profit', 'Orders', 'Paid', 'Credit'];
    const rows = trendData.map((d) => [d.label, d.sales, d.profit, d.orders, d.paid || 0, d.credit || 0]);
    const csv = [headers, ...rows].map((r) => r.join(',')).join('\n');
    const blob = new Blob(['\ufeff' + csv], { type: 'text/csv;charset=utf-8' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = `retail-reports-${days}days-${new Date().toISOString().slice(0, 10)}.csv`;
    a.click();
    URL.revokeObjectURL(url);
    toast.success('Report export ho gaya');
  };

  return (
    <div className="space-y-5 print:space-y-3">
      <div className="print:hidden">
        <ReportsHero
          gradient="from-slate-950 via-sky-900 to-cyan-700"
          emoji="🛒"
          industryLabel="Retail"
          title="Retail Reports"
          subtitle="Sales analysis, best sellers, customers, inventory, cash flow"
          days={days}
          setDays={setDays}
        />
      </div>

      {/* Action bar */}
      <section className="print:hidden rounded-2xl bg-white border-2 border-slate-200 shadow-sm p-3 flex items-center justify-between gap-2 flex-wrap">
        <div className="text-xs sm:text-sm text-slate-600 font-bold">
          📅 Last <strong className="text-sky-700">{days} days</strong> •{' '}
          {new Date(Date.now() - days * 86400000).toLocaleDateString('en-PK', { day: 'numeric', month: 'short' })} — {new Date().toLocaleDateString('en-PK', { day: 'numeric', month: 'short', year: 'numeric' })}
        </div>
        <div className="flex items-center gap-1.5 flex-wrap">
          <PrivacyToggle compact />
          <button
            onClick={exportCSV}
            className="inline-flex items-center gap-1.5 h-9 px-3 rounded-xl bg-white border-2 border-slate-200 hover:border-sky-300 text-slate-700 text-xs font-extrabold transition active:scale-95"
          >
            <Download className="h-3.5 w-3.5" /> CSV
          </button>
          <button
            onClick={exportPDF}
            className="inline-flex items-center gap-1.5 h-9 px-3 rounded-xl bg-slate-900 hover:bg-slate-800 text-white text-xs font-extrabold transition active:scale-95"
          >
            <Printer className="h-3.5 w-3.5" /> Print
          </button>
        </div>
      </section>

      <div className="print:hidden">
        <TabSwitcher tabs={TABS} active={tab} onChange={setTab} color="sky" />
      </div>

      {/* ═══ OVERVIEW ═══ */}
      {tab === 'overview' && (
        <>
          <section className="grid grid-cols-2 lg:grid-cols-4 gap-3">
            <KpiCard label="Total Revenue" value={formatPKR(totalRevenue)} icon={TrendingUp} color="sky" isHighlight />
            <KpiCard label="Total Profit" value={showCost(totalProfit)} icon={Target} color="emerald" />
            <KpiCard label="Total Orders" value={String(totalOrders)} icon={ShoppingCart} color="violet" />
            <KpiCard label="Avg Order Value" value={formatPKR(aov)} icon={DollarSign} color="amber" />
          </section>

          <section className="grid grid-cols-2 lg:grid-cols-4 gap-3">
            <KpiCard label="Paid (Cash)" value={formatPKR(totalPaid)} icon={DollarSign} color="emerald" />
            <KpiCard label="Udhaar" value={formatPKR(totalCredit)} icon={Clock} color="amber" />
            <KpiCard label="Profit Margin" value={hideCost ? '•••' : `${profitMargin.toFixed(1)}%`} icon={Percent} color="blue" />
            <KpiCard label="Daily Avg Sales" value={formatPKR(totalRevenue / Math.max(days, 1))} icon={Activity} color="pink" />
          </section>

          {reports.profitLoss && (
            <section className="rounded-3xl bg-white border-2 border-slate-200 shadow-sm p-5 sm:p-6">
              <div className="flex items-center justify-between mb-4 flex-wrap gap-2">
                <div>
                  <h3 className="text-lg sm:text-xl font-extrabold text-slate-900 flex items-center gap-2">
                    <Trophy className="h-5 w-5 text-amber-500" />
                    Profit & Loss Statement
                  </h3>
                  <p className="text-xs sm:text-sm text-slate-500 font-bold">{days} din ka detailed breakdown</p>
                </div>
                <div className={`px-3 py-1.5 rounded-xl text-sm font-extrabold ${
                  reports.profitLoss.netProfit >= 0 ? 'bg-emerald-100 text-emerald-700 border-2 border-emerald-300' : 'bg-rose-100 text-rose-700 border-2 border-rose-300'
                }`}>
                  Net Margin: {hideCost ? '•••' : `${reports.profitLoss.netMargin.toFixed(1)}%`}
                </div>
              </div>
              <div className="grid lg:grid-cols-2 gap-6">
                <div className="space-y-2">
                  <PnLLine label="Revenue" value={reports.profitLoss.revenue} type="positive" />
                  {reports.profitLoss.discount > 0 && <PnLLine label="Discounts" value={-reports.profitLoss.discount} type="negative" />}
                  {reports.profitLoss.returns > 0 && <PnLLine label="Returns" value={-reports.profitLoss.returns} type="negative" />}
                  <PnLLine label="Net Revenue" value={reports.profitLoss.netRevenue} type="bold" />
                  {!hideCost && <PnLLine label="Cost of Goods (COGS)" value={-reports.profitLoss.cogs} type="negative" />}
                  {!hideCost && <PnLLine label="Gross Profit" value={reports.profitLoss.grossProfit} type="bold" sub={`${reports.profitLoss.grossMargin.toFixed(1)}% margin`} />}
                  {!hideCost && <PnLLine label="Operating Expenses" value={-reports.profitLoss.expenses} type="negative" />}
                  {!hideCost && <PnLLine label="Net Profit" value={reports.profitLoss.netProfit} type="highlight" sub={`${reports.profitLoss.netMargin.toFixed(1)}% margin`} />}
                </div>
                <div className="grid grid-cols-2 gap-2 sm:gap-3">
                  <MiniStat label="Orders" value={reports.profitLoss.orderCount} color="blue" icon={ShoppingCart} />
                  <MiniStat label="Returns" value={reports.profitLoss.returnCount} color="rose" icon={Activity} />
                  <MiniStat label="Cash Paid" value={formatPKR(reports.profitLoss.paid)} color="emerald" icon={DollarSign} />
                  <MiniStat label="Udhaar" value={formatPKR(reports.profitLoss.credit)} color="amber" icon={Package} />
                  {!hideCost && <MiniStat label="Purchases" value={formatPKR(reports.profitLoss.purchases)} color="violet" icon={Package} />}
                  <MiniStat label="Discount" value={formatPKR(reports.profitLoss.discount)} color="pink" icon={Star} />
                </div>
              </div>
            </section>
          )}

          <ChartCard title="Sales & Profit Trend" subtitle={`${days}-day dual analysis`} icon={TrendingUp} color="sky">
            <ResponsiveContainer width="100%" height="100%">
              <ComposedChart data={trendData}>
                <defs>
                  <linearGradient id="rtsalesGrad" x1="0" y1="0" x2="0" y2="1">
                    <stop offset="0%" stopColor="#0ea5e9" stopOpacity={0.5} />
                    <stop offset="100%" stopColor="#0ea5e9" stopOpacity={0} />
                  </linearGradient>
                </defs>
                <CartesianGrid strokeDasharray="3 3" stroke="#e2e8f0" />
                <XAxis dataKey="label" stroke="#64748b" fontSize={10} />
                <YAxis yAxisId="left" stroke="#64748b" fontSize={10} tickFormatter={(v) => `${(v / 1000).toFixed(0)}k`} />
                <YAxis yAxisId="right" orientation="right" stroke="#64748b" fontSize={10} />
                <Tooltip formatter={(value: any, name: any) => name === 'Orders' ? value : formatPKR(Number(value))} contentStyle={{ borderRadius: 12, border: '2px solid #e2e8f0' }} />
                <Legend wrapperStyle={{ fontSize: 11 }} />
                <Area yAxisId="left" type="monotone" dataKey="sales" name="Sales" fill="url(#rtsalesGrad)" stroke="#0ea5e9" strokeWidth={2.5} />
                {!hideCost && <Bar yAxisId="left" dataKey="profit" name="Profit" fill="#10b981" radius={[4, 4, 0, 0]} barSize={18} />}
                <Line yAxisId="right" type="monotone" dataKey="orders" name="Orders" stroke="#f59e0b" strokeWidth={2.5} dot={{ r: 3 }} />
              </ComposedChart>
            </ResponsiveContainer>
          </ChartCard>

          {/* Best/Worst days */}
          <section className="grid sm:grid-cols-2 gap-3">
            <div className="rounded-3xl bg-gradient-to-br from-emerald-50 to-green-50 border-2 border-emerald-300 p-4 sm:p-5">
              <div className="flex items-center gap-2 text-emerald-700">
                <Trophy className="h-5 w-5" />
                <span className="text-xs uppercase font-extrabold tracking-wider">Best Day</span>
              </div>
              <div className="mt-2 text-2xl sm:text-3xl font-extrabold text-emerald-900">{bestDay.label}</div>
              <div className="mt-1 text-xl font-extrabold text-emerald-700 tabular-nums">{formatPKR(bestDay.sales)}</div>
            </div>
            <div className="rounded-3xl bg-gradient-to-br from-rose-50 to-red-50 border-2 border-rose-300 p-4 sm:p-5">
              <div className="flex items-center gap-2 text-rose-700">
                <TrendingDown className="h-5 w-5" />
                <span className="text-xs uppercase font-extrabold tracking-wider">Slowest Day</span>
              </div>
              <div className="mt-2 text-2xl sm:text-3xl font-extrabold text-rose-900">{worstDay.label}</div>
              <div className="mt-1 text-xl font-extrabold text-rose-700 tabular-nums">{formatPKR(worstDay.sales)}</div>
            </div>
          </section>
        </>
      )}

      {/* ═══ SALES ═══ */}
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
                <YAxis stroke="#64748b" fontSize={10} tickFormatter={(v) => `${(v / 1000).toFixed(0)}k`} />
                <Tooltip formatter={(value: any) => formatPKR(Number(value))} contentStyle={{ borderRadius: 12 }} />
                <Legend wrapperStyle={{ fontSize: 11 }} />
                <Area type="monotone" dataKey="sales" name="Sales" fill="url(#sveSales)" stroke="#0ea5e9" strokeWidth={2.5} />
                {!hideCost && <Bar dataKey="expenses" name="Expenses" fill="#ef4444" radius={[4, 4, 0, 0]} barSize={15} />}
                {!hideCost && <Line type="monotone" dataKey="profit" name="Net Profit" stroke="#10b981" strokeWidth={3} dot={{ r: 4 }} />}
              </ComposedChart>
            </ResponsiveContainer>
          </ChartCard>

          <ChartCard title="Cash vs Udhaar Split" subtitle="Cash flow analysis" icon={DollarSign} color="sky">
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
                <YAxis stroke="#64748b" fontSize={10} tickFormatter={(v) => `${(v / 1000).toFixed(0)}k`} />
                <Tooltip formatter={(value: any) => formatPKR(Number(value))} contentStyle={{ borderRadius: 12 }} />
                <Legend wrapperStyle={{ fontSize: 11 }} />
                <Area type="monotone" dataKey="paid" name="Cash Paid" stackId="1" stroke="#10b981" fill="url(#paidGradRt)" strokeWidth={2} />
                <Area type="monotone" dataKey="credit" name="Udhaar" stackId="1" stroke="#f59e0b" fill="url(#creditGradRt)" strokeWidth={2} />
              </AreaChart>
            </ResponsiveContainer>
          </ChartCard>

          <ChartCard title="Orders Trend" subtitle="Number of sales per day" icon={ShoppingCart} color="sky">
            <ResponsiveContainer width="100%" height="100%">
              <BarChart data={trendData}>
                <CartesianGrid strokeDasharray="3 3" stroke="#e2e8f0" />
                <XAxis dataKey="label" stroke="#64748b" fontSize={10} />
                <YAxis stroke="#64748b" fontSize={10} />
                <Tooltip contentStyle={{ borderRadius: 12 }} />
                <Bar dataKey="orders" name="Orders" fill="#8b5cf6" radius={[6, 6, 0, 0]}>
                  {trendData.map((entry, idx) => {
                    const max = Math.max(...trendData.map((t) => t.orders));
                    return <Cell key={idx} fill={entry.orders === max ? '#10b981' : '#8b5cf6'} />;
                  })}
                </Bar>
              </BarChart>
            </ResponsiveContainer>
          </ChartCard>
        </>
      )}

      {/* ═══ PRODUCTS ═══ */}
      {tab === 'products' && (
        <>
          <section className="grid lg:grid-cols-2 gap-4">
            <ChartCard title="Top 10 Products by Revenue" subtitle="Best sellers" icon={Award} color="sky">
              {reports.topProducts.length === 0 ? (
                <EmptyChart message="No product sales" />
              ) : (
                <ResponsiveContainer width="100%" height="100%">
                  <BarChart
                    data={reports.topProducts.slice(0, 10).map((p) => ({
                      name: (p.product?.name || '').slice(0, 15),
                      revenue: p.revenue,
                      profit: p.profit,
                    }))}
                    layout="vertical"
                  >
                    <CartesianGrid strokeDasharray="3 3" stroke="#e2e8f0" />
                    <XAxis type="number" stroke="#64748b" fontSize={10} tickFormatter={(v) => `${(v / 1000).toFixed(0)}k`} />
                    <YAxis type="category" dataKey="name" stroke="#64748b" fontSize={10} width={100} />
                    <Tooltip formatter={(value: any) => formatPKR(Number(value))} contentStyle={{ borderRadius: 12 }} />
                    <Legend wrapperStyle={{ fontSize: 11 }} />
                    <Bar dataKey="revenue" name="Revenue" fill="#0ea5e9" radius={[0, 6, 6, 0]} />
                    {!hideCost && <Bar dataKey="profit" name="Profit" fill="#10b981" radius={[0, 6, 6, 0]} />}
                  </BarChart>
                </ResponsiveContainer>
              )}
            </ChartCard>

            <ChartCard title="Category Distribution" subtitle="Revenue split" icon={Package} color="sky">
              {reports.categoryBreakdown.length > 0 ? (
                <ResponsiveContainer width="100%" height="100%">
                  <PieChart>
                    <Pie
                      data={reports.categoryBreakdown}
                      dataKey="revenue" nameKey="name"
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

          <section className="rounded-3xl bg-white border-2 border-slate-200 shadow-sm overflow-hidden">
            <div className="px-5 py-4 border-b-2 border-slate-100 bg-gradient-to-r from-sky-50 to-cyan-50">
              <h3 className="text-lg font-extrabold text-slate-900">Top Products — Detailed</h3>
              <p className="text-xs text-slate-500 font-bold">Complete performance breakdown</p>
            </div>
            {reports.topProducts.length === 0 ? (
              <div className="p-12 text-center">
                <Package className="h-12 w-12 text-slate-300 mx-auto mb-2" />
                <p className="font-extrabold text-slate-700">No product sales yet</p>
              </div>
            ) : (
              <div className="overflow-x-auto">
                <table className="w-full text-sm">
                  <thead className="bg-slate-50 text-slate-600">
                    <tr>
                      <th className="text-center px-3 py-3 font-extrabold text-[10px] uppercase w-12">#</th>
                      <th className="text-left px-3 py-3 font-extrabold text-[10px] uppercase">Product</th>
                      <th className="text-right px-3 py-3 font-extrabold text-[10px] uppercase">Qty</th>
                      <th className="text-right px-3 py-3 font-extrabold text-[10px] uppercase">Orders</th>
                      <th className="text-right px-3 py-3 font-extrabold text-[10px] uppercase">Revenue</th>
                      {!hideCost && <th className="text-right px-3 py-3 font-extrabold text-[10px] uppercase">Profit</th>}
                      {!hideCost && <th className="text-center px-3 py-3 font-extrabold text-[10px] uppercase">Margin</th>}
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-slate-100">
                    {reports.topProducts.map((p, idx) => (
                      <tr key={p.productId} className="hover:bg-sky-50/40">
                        <td className="px-3 py-2.5 text-center">
                          <span className={`inline-flex h-7 w-7 rounded-lg items-center justify-center font-extrabold text-xs ${
                            idx === 0 ? 'bg-amber-100 text-amber-700' :
                            idx === 1 ? 'bg-slate-200 text-slate-700' :
                            idx === 2 ? 'bg-orange-100 text-orange-700' :
                            'bg-slate-100 text-slate-500'
                          }`}>
                            {idx < 3 ? <Crown className="h-3.5 w-3.5" /> : idx + 1}
                          </span>
                        </td>
                        <td className="px-3 py-2.5">
                          <div className="flex items-center gap-2.5">
                            <div className="h-9 w-9 rounded-lg bg-sky-100 overflow-hidden flex items-center justify-center shrink-0">
                              {p.product?.images?.[0]?.url ? (
                                <img src={p.product.images[0].url} alt="" loading="lazy" className="h-full w-full object-cover" />
                              ) : (
                                <Package className="h-4 w-4 text-sky-400" />
                              )}
                            </div>
                            <div className="font-extrabold text-slate-900 truncate max-w-[220px]">{p.product?.name}</div>
                          </div>
                        </td>
                        <td className="px-3 py-2.5 text-right font-extrabold tabular-nums text-slate-700">{p.quantitySold} {p.product?.unit}</td>
                        <td className="px-3 py-2.5 text-right font-bold tabular-nums text-slate-600">{p.orderCount}</td>
                        <td className="px-3 py-2.5 text-right font-extrabold text-emerald-700 tabular-nums">{formatPKR(p.revenue)}</td>
                        {!hideCost && <td className="px-3 py-2.5 text-right font-extrabold text-violet-700 tabular-nums">{formatPKR(p.profit)}</td>}
                        {!hideCost && (
                          <td className="px-3 py-2.5 text-center">
                            <span className={`inline-flex px-2 py-0.5 rounded-full text-[10px] font-extrabold ${
                              p.margin > 30 ? 'bg-emerald-100 text-emerald-700' :
                              p.margin > 10 ? 'bg-amber-100 text-amber-700' :
                              'bg-rose-100 text-rose-700'
                            }`}>
                              {p.margin.toFixed(1)}%
                            </span>
                          </td>
                        )}
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            )}
          </section>
        </>
      )}

      {/* ═══ CUSTOMERS ═══ */}
      {tab === 'customers' && (
        <section className="rounded-3xl bg-white border-2 border-slate-200 shadow-sm overflow-hidden">
          <div className="px-5 py-4 border-b-2 border-slate-100 bg-gradient-to-r from-violet-50 to-purple-50">
            <h3 className="text-lg font-extrabold text-slate-900 flex items-center gap-2">
              <Trophy className="h-5 w-5 text-amber-500" /> Top Customers
            </h3>
            <p className="text-xs text-slate-500 font-bold">Most valuable buyers</p>
          </div>
          {reports.topCustomers.length === 0 ? (
            <div className="p-12 text-center">
              <Users className="h-12 w-12 text-slate-300 mx-auto mb-2" />
              <p className="font-extrabold text-slate-700">No customer data</p>
              <p className="text-xs text-slate-500 font-semibold mt-1">Sales karo, customers automatically dikhein ge</p>
            </div>
          ) : (
            <div className="divide-y-2 divide-slate-100">
              {reports.topCustomers.map((tc, idx) => {
                const rankColors = ['bg-amber-500', 'bg-slate-400', 'bg-orange-600'];
                return (
                  <div key={tc.customerId} className="px-5 py-3 flex items-center justify-between gap-3 hover:bg-violet-50/40 transition">
                    <div className="flex items-center gap-3 min-w-0 flex-1">
                      <div className={`h-11 w-11 rounded-2xl ${rankColors[idx] || 'bg-violet-500'} text-white font-extrabold flex items-center justify-center shadow-md shrink-0 text-sm`}>
                        {idx < 3 ? <Crown className="h-5 w-5" /> : `#${idx + 1}`}
                      </div>
                      <div className="h-10 w-10 rounded-xl bg-slate-100 flex items-center justify-center font-extrabold text-slate-600 shrink-0">
                        {tc.customer?.name?.charAt(0) || '?'}
                      </div>
                      <div className="min-w-0 flex-1">
                        <div className="font-extrabold text-slate-900 truncate">{tc.customer?.name || 'Unknown'}</div>
                        <div className="text-xs text-slate-500 font-bold truncate">
                          {tc.customer?.phone || 'No phone'} • {tc.orderCount} orders
                        </div>
                      </div>
                    </div>
                    <div className="text-right shrink-0">
                      <div className="font-extrabold text-violet-700 text-lg tabular-nums">{formatPKR(tc.totalSpent)}</div>
                      <div className="text-[10px] text-slate-500 font-bold">AOV {formatPKR(tc.avgOrderValue)}</div>
                    </div>
                  </div>
                );
              })}
            </div>
          )}
        </section>
      )}

      {/* ═══ INVENTORY ═══ */}
      {tab === 'inventory' && reports.inventoryValue && (
        <>
          <section className="grid grid-cols-2 sm:grid-cols-4 gap-3">
            <KpiCard label="Total Products" value={reports.inventoryValue.totals.totalProducts} icon={Package} color="sky" />
            <KpiCard label="Total Units" value={reports.inventoryValue.totals.totalUnits} icon={Boxes} color="violet" />
            <KpiCard label="Cost Value" value={showCost(reports.inventoryValue.totals.totalCostValue)} icon={DollarSign} color="emerald" />
            <KpiCard label="Potential Profit" value={showCost(reports.inventoryValue.totals.potentialProfit)} icon={Target} color="amber" isHighlight />
          </section>

          <ChartCard title="Inventory Value by Category" icon={BarChart3} color="sky">
            <ResponsiveContainer width="100%" height="100%">
              <BarChart data={reports.inventoryValue.byCategory}>
                <CartesianGrid strokeDasharray="3 3" stroke="#e2e8f0" />
                <XAxis dataKey="name" stroke="#64748b" fontSize={11} />
                <YAxis stroke="#64748b" fontSize={11} tickFormatter={(v) => `${(v / 1000).toFixed(0)}k`} />
                <Tooltip formatter={(value: any) => formatPKR(Number(value))} contentStyle={{ borderRadius: 12 }} />
                <Legend wrapperStyle={{ fontSize: 11 }} />
                {!hideCost && <Bar dataKey="costValue" name="Cost Value" fill="#0ea5e9" radius={[6, 6, 0, 0]} />}
                <Bar dataKey="sellValue" name="Sell Value" fill="#10b981" radius={[6, 6, 0, 0]} />
              </BarChart>
            </ResponsiveContainer>
          </ChartCard>
        </>
      )}

      {/* ═══ PATTERNS ═══ */}
      {tab === 'patterns' && (
        <>
          {reports.weekdayPattern.length > 0 && (
            <section className="grid lg:grid-cols-2 gap-4">
              <ChartCard title="Weekday Pattern" subtitle="Kis din sab se zyada sale hoti hai" icon={Activity} color="sky">
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

              <ChartCard title="Average per Weekday" icon={BarChart3} color="sky">
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

          {reports.expenseBreakdown && reports.expenseBreakdown.byCategory.length > 0 && !hideCost && (
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
                    dataKey="amount" nameKey="name"
                    cx="50%" cy="50%"
                    outerRadius={110} innerRadius={55}
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

      {/* ═══ INSIGHTS ═══ */}
      {tab === 'insights' && (
        <>
          <section className="rounded-3xl bg-gradient-to-br from-slate-950 to-sky-900 text-white p-5 sm:p-6">
            <div className="flex items-center gap-2 mb-4">
              <div className="h-10 w-10 rounded-2xl bg-white/15 backdrop-blur flex items-center justify-center">
                <Sparkles className="h-5 w-5 text-amber-300" />
              </div>
              <div>
                <h3 className="text-lg sm:text-xl font-extrabold">Smart Insights</h3>
                <p className="text-xs sm:text-sm text-white/80 font-bold">Aap ki dukaan ka analysis</p>
              </div>
            </div>

            <div className="grid sm:grid-cols-2 gap-3">
              <InsightCard
                icon={TrendingUp}
                label={totalRevenue > 0 ? 'Zabardast performance!' : 'Sales barhao'}
                value={formatPKR(totalRevenue)}
                sub={`${totalOrders} orders in ${days} days`}
                tone="emerald"
              />
              {!hideCost && (
                <InsightCard
                  icon={Target}
                  label={profitMargin > 20 ? 'Bohat acha margin' : profitMargin > 10 ? 'Theek margin' : 'Margin kam hai'}
                  value={`${profitMargin.toFixed(1)}%`}
                  sub={`Profit: ${formatPKR(totalProfit)}`}
                  tone={profitMargin > 20 ? 'emerald' : profitMargin > 10 ? 'amber' : 'rose'}
                />
              )}
              <InsightCard
                icon={Users}
                label={reports.topCustomers.length > 0 ? 'Top customer' : 'Customer database chhoti hai'}
                value={reports.topCustomers[0]?.customer?.name || '—'}
                sub={reports.topCustomers[0] ? `${formatPKR(reports.topCustomers[0].totalSpent)} spent` : 'Naye customers add karo'}
                tone="violet"
              />
              <InsightCard
                icon={Package}
                label={reports.topProducts.length > 0 ? 'Best seller' : 'Sales record'}
                value={reports.topProducts[0]?.product?.name || '—'}
                sub={reports.topProducts[0] ? `${reports.topProducts[0].quantitySold} sold` : 'Products import karo'}
                tone="sky"
              />
              <InsightCard
                icon={Calendar}
                label="Best day"
                value={bestDay.label}
                sub={formatPKR(bestDay.sales)}
                tone="amber"
              />
              <InsightCard
                icon={Clock}
                label={totalCredit > 0 ? 'Udhaar collect karo' : 'Sab paid'}
                value={formatPKR(totalCredit)}
                sub={totalCredit > 0 ? `${((totalCredit / totalRevenue) * 100).toFixed(1)}% credit sales` : 'Sab paid — zabardast!'}
                tone={totalCredit > totalPaid ? 'rose' : 'emerald'}
              />
            </div>
          </section>

          {/* Tips */}
          <section className="rounded-3xl bg-white border-2 border-slate-200 shadow-sm p-5 sm:p-6">
            <h3 className="text-lg font-extrabold text-slate-900 flex items-center gap-2 mb-4">
              <Zap className="h-5 w-5 text-amber-500" /> Recommendations
            </h3>
            <div className="space-y-2">
              {profitMargin < 15 && !hideCost && (
                <TipRow tone="amber" icon={AlertTriangle}
                  title="Profit margin bohat kam hai"
                  desc="Kharid rate check karo, wholesale suppliers explore karo, ya bikri rate slightly barhao. Target: 20%+"
                />
              )}
              {totalCredit > totalPaid * 0.5 && (
                <TipRow tone="rose" icon={Clock}
                  title="Udhaar zyada hai"
                  desc="Khata Book se udhaar customers ko WhatsApp karo aur payment collect karo"
                />
              )}
              {reports.topProducts.length > 0 && (
                <TipRow tone="emerald" icon={Star}
                  title="Top products ka stock rakhein"
                  desc={`"${reports.topProducts[0]?.product?.name}" bohat bik raha hai. Reorder page check karo.`}
                />
              )}
              {totalOrders < days && (
                <TipRow tone="sky" icon={TrendingDown}
                  title="Orders kam ho rahe hain"
                  desc="Combos banao, quick keys use karo, aur featured products highlight karo POS pe"
                />
              )}
              <TipRow tone="violet" icon={Sparkles}
                title="Pro tip: Reports roz check karein"
                desc="Best-selling products aur customers ka data dekh kar decisions lein"
              />
            </div>
          </section>
        </>
      )}
    </div>
  );
}

function InsightCard({ icon: Icon, label, value, sub, tone }: any) {
  const tones: Record<string, string> = {
    emerald: 'from-emerald-500/30 to-emerald-700/20 border-emerald-300/40',
    amber: 'from-amber-500/30 to-orange-600/20 border-amber-300/40',
    rose: 'from-rose-500/30 to-red-600/20 border-rose-300/40',
    violet: 'from-violet-500/30 to-purple-700/20 border-violet-300/40',
    sky: 'from-sky-500/30 to-cyan-700/20 border-sky-300/40',
  };
  return (
    <div className={`rounded-2xl bg-gradient-to-br ${tones[tone]} backdrop-blur border p-4`}>
      <div className="flex items-center gap-2 text-white/80">
        <Icon className="h-4 w-4" />
        <span className="text-[10px] uppercase tracking-wider font-extrabold">{label}</span>
      </div>
      <div className="mt-1.5 text-xl sm:text-2xl font-extrabold tabular-nums leading-tight truncate">{value}</div>
      {sub && <div className="text-[11px] font-bold text-white/70 mt-0.5 truncate">{sub}</div>}
    </div>
  );
}

function TipRow({ tone, icon: Icon, title, desc }: any) {
  const tones: Record<string, string> = {
    amber: 'bg-amber-50 border-amber-300 text-amber-800',
    rose: 'bg-rose-50 border-rose-300 text-rose-800',
    emerald: 'bg-emerald-50 border-emerald-300 text-emerald-800',
    sky: 'bg-sky-50 border-sky-300 text-sky-800',
    violet: 'bg-violet-50 border-violet-300 text-violet-800',
  };
  const iconTones: Record<string, string> = {
    amber: 'bg-amber-600', rose: 'bg-rose-600', emerald: 'bg-emerald-600', sky: 'bg-sky-600', violet: 'bg-violet-600',
  };
  return (
    <div className={`rounded-2xl border-2 p-3 flex items-start gap-3 ${tones[tone]}`}>
      <div className={`h-9 w-9 rounded-xl ${iconTones[tone]} text-white flex items-center justify-center shrink-0`}>
        <Icon className="h-4 w-4" />
      </div>
      <div className="flex-1 min-w-0">
        <div className="font-extrabold text-sm">{title}</div>
        <div className="text-xs font-semibold opacity-90 mt-0.5 leading-relaxed">{desc}</div>
      </div>
    </div>
  );
}
