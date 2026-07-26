import { useState, useMemo } from 'react';
import {
  BarChart3, Layers, Scissors, Ruler, Package, TrendingUp, Target,
  Award, Users, Crown, Activity, DollarSign, Star, Clock, ArrowRight,
  Download, Printer, TrendingDown, AlertTriangle, Percent, Calendar,
  Zap, Sparkles, Trophy,
} from 'lucide-react';
import {
  ResponsiveContainer, AreaChart, Area, BarChart, Bar, PieChart, Pie, Cell,
  XAxis, YAxis, Tooltip, CartesianGrid, Legend, LineChart, Line, ComposedChart,
} from 'recharts';
import { toast } from 'sonner';
import { formatPKR } from '@core/lib/format';
import { useReportsData } from '@modules/reports/reports/hooks/useReportsData';
import {
  ReportsHero, TabSwitcher, KpiCard, ChartCard, EmptyChart,
  PnLLine, MiniStat, dayLabel, PIE_COLORS,
} from '@modules/reports/reports/components/ReportsShared';
import { useCostHidden, PrivacyToggle } from '@core/ui/HiddenValue';

const TABS = [
  { id: 'overview', label: 'Overview', icon: BarChart3 },
  { id: 'rolls', label: 'Rolls', icon: Layers },
  { id: 'designs', label: 'Designs', icon: Package },
  { id: 'customers', label: 'Customers', icon: Users },
  { id: 'staff', label: 'Staff', icon: Crown },
  { id: 'insights', label: 'Insights', icon: Sparkles },
];

export default function CarpetReportsV2() {
  const [days, setDays] = useState(30);
  const [tab, setTab] = useState('overview');
  const hideCost = useCostHidden();
  const reports = useReportsData(days);

  const trendData = reports.trend.map((p) => ({ ...p, label: dayLabel(p.date) }));

  const totalRevenue = reports.trend.reduce((s, p) => s + p.sales, 0);
  const totalProfit = reports.trend.reduce((s, p) => s + p.profit, 0);
  const totalOrders = reports.trend.reduce((s, p) => s + p.orders, 0);
  const totalPaid = reports.trend.reduce((s, p) => s + (p.paid || 0), 0);
  const totalCredit = reports.trend.reduce((s, p) => s + (p.credit || 0), 0);
  const aov = totalOrders > 0 ? totalRevenue / totalOrders : 0;
  const profitMargin = totalRevenue > 0 ? (totalProfit / totalRevenue) * 100 : 0;

  const carpetProducts = reports.topProducts.filter(
    (p) => p.product && ['sqft', 'sqm', 'sqyd'].includes(p.product.unit),
  );
  const totalSqftSold = carpetProducts.reduce((s, p) => s + p.quantitySold, 0);

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
    a.download = `carpet-reports-${days}days-${new Date().toISOString().slice(0, 10)}.csv`;
    a.click();
    URL.revokeObjectURL(url);
    toast.success('Report export ho gaya');
  };

  return (
    <div className="space-y-5 print:space-y-3">
      <div className="print:hidden">
        <ReportsHero
          gradient="from-slate-950 via-emerald-900 to-teal-800"
          emoji="🧶"
          industryLabel="Carpet"
          title="Carpet Reports"
          subtitle="Sqft sold, roll efficiency, top designs, staff performance"
          days={days}
          setDays={setDays}
        />
      </div>

      {/* Action bar */}
      <section className="print:hidden rounded-2xl bg-white border-2 border-slate-200 shadow-sm p-3 flex items-center justify-between gap-2 flex-wrap">
        <div className="text-xs sm:text-sm text-slate-600 font-bold">
          📅 Last <strong className="text-emerald-700">{days} days</strong> •{' '}
          {new Date(Date.now() - days * 86400000).toLocaleDateString('en-PK', { day: 'numeric', month: 'short' })} — {new Date().toLocaleDateString('en-PK', { day: 'numeric', month: 'short', year: 'numeric' })}
        </div>
        <div className="flex items-center gap-1.5 flex-wrap">
          <PrivacyToggle compact />
          <button
            onClick={exportCSV}
            className="inline-flex items-center gap-1.5 h-9 px-3 rounded-xl bg-white border-2 border-slate-200 hover:border-emerald-300 text-slate-700 text-xs font-extrabold transition active:scale-95"
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
        <TabSwitcher tabs={TABS} active={tab} onChange={setTab} color="emerald" />
      </div>

      {/* ═══ OVERVIEW ═══ */}
      {tab === 'overview' && (
        <>
          <section className="grid grid-cols-2 lg:grid-cols-4 gap-3">
            <KpiCard label="Total Revenue" value={formatPKR(totalRevenue)} icon={TrendingUp} color="emerald" isHighlight />
            <KpiCard label="Total Profit" value={showCost(totalProfit)} icon={Target} color="violet" />
            <KpiCard label="Sqft Sold" value={totalSqftSold.toFixed(0)} icon={Ruler} color="cyan" />
            <KpiCard label="Total Orders" value={String(totalOrders)} icon={Package} color="amber" />
          </section>

          <section className="grid grid-cols-2 lg:grid-cols-4 gap-3">
            <KpiCard label="Paid (Cash)" value={formatPKR(totalPaid)} icon={DollarSign} color="emerald" />
            <KpiCard label="Udhaar" value={formatPKR(totalCredit)} icon={Clock} color="amber" />
            <KpiCard label="Profit Margin" value={hideCost ? '•••' : `${profitMargin.toFixed(1)}%`} icon={Percent} color="blue" />
            <KpiCard label="Avg Order Value" value={formatPKR(aov)} icon={Activity} color="pink" />
          </section>

          {reports.profitLoss && (
            <section className="rounded-3xl bg-white border-2 border-slate-200 shadow-sm p-5 sm:p-6">
              <div className="flex items-center justify-between mb-4 flex-wrap gap-2">
                <div>
                  <h3 className="text-lg sm:text-xl font-extrabold text-slate-900 flex items-center gap-2">
                    <Trophy className="h-5 w-5 text-amber-500" />
                    Carpet Business P&L
                  </h3>
                  <p className="text-xs sm:text-sm text-slate-500 font-bold">{days} din ka breakdown</p>
                </div>
                <div className={`px-3 py-1.5 rounded-xl text-sm font-extrabold ${
                  reports.profitLoss.netProfit >= 0 ? 'bg-emerald-100 text-emerald-700 border-2 border-emerald-300' : 'bg-rose-100 text-rose-700 border-2 border-rose-300'
                }`}>
                  Margin: {hideCost ? '•••' : `${reports.profitLoss.netMargin.toFixed(1)}%`}
                </div>
              </div>
              <div className="grid lg:grid-cols-2 gap-6">
                <div className="space-y-2">
                  <PnLLine label="Revenue" value={reports.profitLoss.revenue} type="positive" />
                  {reports.profitLoss.discount > 0 && <PnLLine label="Discounts" value={-reports.profitLoss.discount} type="negative" />}
                  {reports.profitLoss.returns > 0 && <PnLLine label="Returns" value={-reports.profitLoss.returns} type="negative" />}
                  <PnLLine label="Net Revenue" value={reports.profitLoss.netRevenue} type="bold" />
                  {!hideCost && <PnLLine label="Roll/Material Cost" value={-reports.profitLoss.cogs} type="negative" />}
                  {!hideCost && <PnLLine label="Gross Profit" value={reports.profitLoss.grossProfit} type="bold" sub={`${reports.profitLoss.grossMargin.toFixed(1)}% margin`} />}
                  {!hideCost && <PnLLine label="Operating Expenses" value={-reports.profitLoss.expenses} type="negative" />}
                  {!hideCost && <PnLLine label="Net Profit" value={reports.profitLoss.netProfit} type="highlight" sub={`${reports.profitLoss.netMargin.toFixed(1)}% margin`} />}
                </div>
                <div className="grid grid-cols-2 gap-2 sm:gap-3">
                  <MiniStat label="Orders" value={reports.profitLoss.orderCount} color="emerald" icon={TrendingUp} />
                  <MiniStat label="Sqft Sold" value={totalSqftSold.toFixed(0)} color="cyan" icon={Ruler} />
                  <MiniStat label="Cash Paid" value={formatPKR(reports.profitLoss.paid)} color="emerald" icon={DollarSign} />
                  <MiniStat label="Udhaar" value={formatPKR(reports.profitLoss.credit)} color="amber" icon={Package} />
                  {!hideCost && <MiniStat label="Purchases" value={formatPKR(reports.profitLoss.purchases)} color="violet" icon={Layers} />}
                  <MiniStat label="Returns" value={reports.profitLoss.returnCount} color="rose" icon={Activity} />
                </div>
              </div>
            </section>
          )}

          <ChartCard title="Carpet Sales & Profit Trend" subtitle={`${days}-day analysis`} icon={TrendingUp} color="emerald">
            <ResponsiveContainer width="100%" height="100%">
              <ComposedChart data={trendData}>
                <defs>
                  <linearGradient id="csalesGrad" x1="0" y1="0" x2="0" y2="1">
                    <stop offset="0%" stopColor="#10b981" stopOpacity={0.5} />
                    <stop offset="100%" stopColor="#10b981" stopOpacity={0} />
                  </linearGradient>
                </defs>
                <CartesianGrid strokeDasharray="3 3" stroke="#e2e8f0" />
                <XAxis dataKey="label" stroke="#64748b" fontSize={10} />
                <YAxis yAxisId="left" stroke="#64748b" fontSize={10} tickFormatter={(v) => `${(v / 1000).toFixed(0)}k`} />
                <YAxis yAxisId="right" orientation="right" stroke="#64748b" fontSize={10} />
                <Tooltip formatter={(value: any, name: any) => name === 'Orders' ? value : formatPKR(Number(value))} contentStyle={{ borderRadius: 12 }} />
                <Legend wrapperStyle={{ fontSize: 11 }} />
                <Area yAxisId="left" type="monotone" dataKey="sales" name="Sales" fill="url(#csalesGrad)" stroke="#10b981" strokeWidth={2.5} />
                {!hideCost && <Bar yAxisId="left" dataKey="profit" name="Profit" fill="#8b5cf6" radius={[4, 4, 0, 0]} barSize={18} />}
                <Line yAxisId="right" type="monotone" dataKey="orders" name="Orders" stroke="#f59e0b" strokeWidth={2.5} dot={{ r: 3 }} />
              </ComposedChart>
            </ResponsiveContainer>
          </ChartCard>

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

      {/* ═══ ROLLS ═══ */}
      {tab === 'rolls' && (
        <>
          <section className="grid grid-cols-2 sm:grid-cols-4 gap-3">
            <KpiCard label="Sqft Sold" value={totalSqftSold.toFixed(0)} icon={Ruler} color="emerald" isHighlight />
            <KpiCard label="Roll Sales" value={carpetProducts.length} icon={Layers} color="cyan" />
            <KpiCard label="Avg per Sale" value={totalOrders > 0 ? (totalSqftSold / totalOrders).toFixed(1) : '0'} icon={Target} color="violet" sub="sqft" />
            <KpiCard label="Revenue" value={formatPKR(carpetProducts.reduce((s, p) => s + p.revenue, 0))} icon={DollarSign} color="amber" />
          </section>

          <div className="rounded-3xl bg-gradient-to-br from-emerald-50 to-white border-2 border-emerald-200 p-6 text-center">
            <div className="h-20 w-20 rounded-3xl bg-emerald-100 mx-auto flex items-center justify-center">
              <Layers className="h-10 w-10 text-emerald-600" />
            </div>
            <h3 className="mt-4 font-extrabold text-emerald-900 text-lg">Roll Details</h3>
            <p className="text-sm text-emerald-800 mt-1 font-semibold">Visit Carpet Rolls page for detailed inventory tracking</p>
            <a href="/carpet-rolls" className="mt-4 inline-flex items-center gap-2 px-4 py-2 rounded-xl bg-emerald-600 hover:bg-emerald-700 text-white text-sm font-extrabold transition active:scale-95">
              <Layers className="h-4 w-4" /> Go to Rolls <ArrowRight className="h-4 w-4" />
            </a>
          </div>
        </>
      )}

      {/* ═══ DESIGNS ═══ */}
      {tab === 'designs' && (
        <>
          <section className="grid lg:grid-cols-2 gap-4">
            <ChartCard title="Top 10 Designs by Revenue" subtitle="Best sellers" icon={Award} color="emerald">
              {reports.topProducts.length === 0 ? (
                <EmptyChart message="No sales" />
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
                    <Bar dataKey="revenue" name="Revenue" fill="#10b981" radius={[0, 6, 6, 0]} />
                    {!hideCost && <Bar dataKey="profit" name="Profit" fill="#8b5cf6" radius={[0, 6, 6, 0]} />}
                  </BarChart>
                </ResponsiveContainer>
              )}
            </ChartCard>

            <ChartCard title="Category Distribution" subtitle="Revenue split" icon={Package} color="emerald">
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
            <div className="px-4 sm:px-6 py-4 border-b-2 border-slate-100 bg-gradient-to-r from-emerald-50 to-teal-50">
              <h3 className="text-lg font-extrabold text-slate-900">Top Selling Carpet Designs</h3>
              <p className="text-xs text-slate-500 font-bold">Complete performance breakdown</p>
            </div>
            {reports.topProducts.length === 0 ? (
              <div className="p-12 text-center">
                <Package className="h-12 w-12 text-slate-300 mx-auto mb-2" />
                <p className="font-extrabold text-slate-700">Abhi tak koi sale nahi</p>
              </div>
            ) : (
              <div className="overflow-x-auto">
                <table className="w-full text-sm">
                  <thead className="bg-slate-50 text-slate-600">
                    <tr>
                      <th className="text-center px-3 py-3 font-extrabold text-[10px] uppercase w-12">#</th>
                      <th className="text-left px-3 py-3 font-extrabold text-[10px] uppercase">Design</th>
                      <th className="text-right px-3 py-3 font-extrabold text-[10px] uppercase">Sqft Sold</th>
                      <th className="text-right px-3 py-3 font-extrabold text-[10px] uppercase">Orders</th>
                      <th className="text-right px-3 py-3 font-extrabold text-[10px] uppercase">Revenue</th>
                      {!hideCost && <th className="text-right px-3 py-3 font-extrabold text-[10px] uppercase">Profit</th>}
                      {!hideCost && <th className="text-center px-3 py-3 font-extrabold text-[10px] uppercase">Margin</th>}
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-slate-100">
                    {reports.topProducts.map((p, idx) => (
                      <tr key={p.productId} className="hover:bg-emerald-50/40">
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
                            <div className="h-9 w-9 rounded-lg bg-emerald-100 overflow-hidden flex items-center justify-center shrink-0">
                              {p.product?.images?.[0]?.url ? (
                                <img src={p.product.images[0].url} alt="" loading="lazy" className="h-full w-full object-cover" />
                              ) : (
                                <Layers className="h-4 w-4 text-emerald-400" />
                              )}
                            </div>
                            <div className="font-extrabold text-slate-900 truncate max-w-[220px]">{p.product?.name}</div>
                          </div>
                        </td>
                        <td className="px-3 py-2.5 text-right font-extrabold tabular-nums text-slate-700">{p.quantitySold.toFixed(0)} {p.product?.unit}</td>
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
            <p className="text-xs text-slate-500 font-bold">Sab se zyada khareedne wale</p>
          </div>
          {reports.topCustomers.length === 0 ? (
            <div className="p-12 text-center">
              <Users className="h-12 w-12 text-slate-300 mx-auto mb-2" />
              <p className="font-extrabold text-slate-700">Koi customer data nahi</p>
              <p className="text-xs text-slate-500 font-semibold mt-1">Sales karo, customers automatically dikhein ge</p>
            </div>
          ) : (
            <div className="divide-y-2 divide-slate-100">
              {reports.topCustomers.map((tc, idx) => {
                const rankColors = ['bg-amber-500', 'bg-slate-400', 'bg-orange-600'];
                return (
                  <div key={tc.customerId} className="px-4 sm:px-5 py-3 flex items-center justify-between gap-3 hover:bg-violet-50/40 transition">
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

      {/* ═══ STAFF ═══ */}
      {tab === 'staff' && (
        <section className="rounded-3xl bg-white border-2 border-slate-200 shadow-sm overflow-hidden">
          <div className="px-5 py-4 border-b-2 border-slate-100 bg-gradient-to-r from-emerald-50 to-teal-50">
            <h3 className="text-lg font-extrabold text-slate-900 flex items-center gap-2">
              <Crown className="h-5 w-5 text-amber-500" /> Staff Performance
            </h3>
            <p className="text-xs text-slate-500 font-bold">Kis ne kitni sale ki</p>
          </div>
          {reports.cashiers.length === 0 ? (
            <div className="p-12 text-center">
              <Crown className="h-12 w-12 text-slate-300 mx-auto mb-2" />
              <p className="font-extrabold text-slate-700">Koi staff sale data nahi</p>
            </div>
          ) : (
            <div className="overflow-x-auto">
              <table className="w-full text-sm">
                <thead className="bg-slate-50 text-slate-600">
                  <tr>
                    <th className="text-center px-4 sm:px-6 py-3 font-extrabold text-xs uppercase w-16">Rank</th>
                    <th className="text-left px-4 sm:px-6 py-3 font-extrabold text-xs uppercase">Staff</th>
                    <th className="text-right px-4 sm:px-6 py-3 font-extrabold text-xs uppercase">Orders</th>
                    <th className="text-right px-4 sm:px-6 py-3 font-extrabold text-xs uppercase">Sales</th>
                    <th className="text-right px-4 sm:px-6 py-3 font-extrabold text-xs uppercase">AOV</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-slate-100">
                  {reports.cashiers.map((c, idx) => (
                    <tr key={c.userId || idx} className="hover:bg-emerald-50/40">
                      <td className="px-4 sm:px-6 py-3 text-center">
                        <span className={`inline-flex h-9 w-9 rounded-lg items-center justify-center font-extrabold text-xs ${
                          idx === 0 ? 'bg-amber-500 text-white' :
                          idx === 1 ? 'bg-slate-400 text-white' :
                          idx === 2 ? 'bg-orange-600 text-white' :
                          'bg-slate-100 text-slate-500'
                        }`}>
                          {idx < 3 ? <Crown className="h-4 w-4" /> : idx + 1}
                        </span>
                      </td>
                      <td className="px-4 sm:px-6 py-3">
                        <div className="flex items-center gap-3">
                          {c.user?.avatarUrl ? (
                            <img src={c.user.avatarUrl} alt="" className="h-10 w-10 rounded-xl object-cover" />
                          ) : (
                            <div className="h-10 w-10 rounded-xl bg-emerald-100 text-emerald-700 flex items-center justify-center font-bold">
                              {c.user?.fullName?.charAt(0) || '?'}
                            </div>
                          )}
                          <div>
                            <div className="font-extrabold text-slate-900">{c.user?.fullName || 'Unknown'}</div>
                            <div className="text-xs text-slate-500 font-bold">{c.user?.role}</div>
                          </div>
                        </div>
                      </td>
                      <td className="px-4 sm:px-6 py-3 text-right font-extrabold tabular-nums">{c.orderCount}</td>
                      <td className="px-4 sm:px-6 py-3 text-right font-extrabold text-emerald-700 tabular-nums">{formatPKR(c.totalSales)}</td>
                      <td className="px-4 sm:px-6 py-3 text-right text-slate-700 tabular-nums font-bold">{formatPKR(c.avgOrderValue)}</td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          )}
        </section>
      )}

      {/* ═══ INSIGHTS ═══ */}
      {tab === 'insights' && (
        <>
          <section className="rounded-3xl bg-gradient-to-br from-slate-950 to-emerald-900 text-white p-5 sm:p-6">
            <div className="flex items-center gap-2 mb-4">
              <div className="h-10 w-10 rounded-2xl bg-white/15 backdrop-blur flex items-center justify-center">
                <Sparkles className="h-5 w-5 text-amber-300" />
              </div>
              <div>
                <h3 className="text-lg sm:text-xl font-extrabold">Smart Insights</h3>
                <p className="text-xs sm:text-sm text-white/80 font-bold">Aap ki carpet business ka analysis</p>
              </div>
            </div>

            <div className="grid sm:grid-cols-2 gap-3">
              <InsightCard
                icon={TrendingUp}
                label={totalRevenue > 0 ? 'Zabardast!' : 'Sales barhao'}
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
                icon={Ruler}
                label="Total Area Sold"
                value={`${totalSqftSold.toFixed(0)} sqft`}
                sub={totalOrders > 0 ? `Avg ${(totalSqftSold / totalOrders).toFixed(1)} sqft/sale` : 'No sales'}
                tone="cyan"
              />
              <InsightCard
                icon={Users}
                label={reports.topCustomers.length > 0 ? 'Top customer' : 'Customer database chhoti'}
                value={reports.topCustomers[0]?.customer?.name || '—'}
                sub={reports.topCustomers[0] ? `${formatPKR(reports.topCustomers[0].totalSpent)} spent` : 'Naye customers add karo'}
                tone="violet"
              />
              <InsightCard
                icon={Layers}
                label={reports.topProducts.length > 0 ? 'Best seller' : 'Sales record'}
                value={reports.topProducts[0]?.product?.name || '—'}
                sub={reports.topProducts[0] ? `${reports.topProducts[0].quantitySold.toFixed(0)} ${reports.topProducts[0].product?.unit}` : 'Products add karo'}
                tone="emerald"
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

          <section className="rounded-3xl bg-white border-2 border-slate-200 shadow-sm p-5 sm:p-6">
            <h3 className="text-lg font-extrabold text-slate-900 flex items-center gap-2 mb-4">
              <Zap className="h-5 w-5 text-amber-500" /> Recommendations
            </h3>
            <div className="space-y-2">
              {profitMargin < 15 && !hideCost && (
                <TipRow tone="amber" icon={AlertTriangle}
                  title="Profit margin kam hai"
                  desc="Roll suppliers negotiate karo, wholesale rates check karo, ya sale rate slightly barhao. Target: 20%+"
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
                  title="Popular designs ka stock rakhein"
                  desc={`"${reports.topProducts[0]?.product?.name}" bohat bik raha hai. Reorder karo pehle stock khatam ho.`}
                />
              )}
              {totalOrders < days && (
                <TipRow tone="cyan" icon={TrendingDown}
                  title="Sales kam ho rahi hain"
                  desc="Featured designs highlight karo, combos banao, aur repeat customers ko discount offer karo"
                />
              )}
              <TipRow tone="violet" icon={Sparkles}
                title="Pro tip: Roll efficiency track karo"
                desc="Har roll ki utilization dekh kar decisions lein — kaunsa design zyada bik raha hai"
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
    cyan: 'from-cyan-500/30 to-teal-700/20 border-cyan-300/40',
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
    cyan: 'bg-cyan-50 border-cyan-300 text-cyan-800',
    violet: 'bg-violet-50 border-violet-300 text-violet-800',
  };
  const iconTones: Record<string, string> = {
    amber: 'bg-amber-600', rose: 'bg-rose-600', emerald: 'bg-emerald-600', cyan: 'bg-cyan-600', violet: 'bg-violet-600',
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
