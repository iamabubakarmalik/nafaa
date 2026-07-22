import { useState, useMemo } from 'react';
import { useQuery } from '@tanstack/react-query';
import {
  BarChart3, Smartphone, ShieldCheck, CreditCard, Wrench,
  TrendingUp, Target, Package, Crown, Activity, DollarSign,
  Award, Users, Clock, Star, ArrowRight, RefreshCw,
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
import { imeiApi } from '../api/imei.api';

const TABS = [
  { id: 'overview', label: 'Overview', icon: BarChart3 },
  { id: 'imei', label: 'IMEI Analytics', icon: Smartphone },
  { id: 'emi', label: 'EMI Plans', icon: CreditCard },
  { id: 'repairs', label: 'Repairs', icon: Wrench },
  { id: 'models', label: 'Top Models', icon: Package },
];

const PTA_COLORS: Record<string, string> = {
  APPROVED: '#10b981',
  NON_PTA: '#ef4444',
  PATCH: '#f59e0b',
  PENDING: '#3b82f6',
  EXEMPT: '#8b5cf6',
};

export default function MobileReportsV2() {
  const [days, setDays] = useState(14);
  const [tab, setTab] = useState('overview');
  const reports = useReportsData(days);

  const { data: imeiStats } = useQuery({
    queryKey: ['imei-stats-reports'],
    queryFn: () => imeiApi.stats(),
  });

  const ptaBreakdown = (imeiStats as any)?.byPtaStatus ?? [];
  const trendData = reports.trend.map((p) => ({ ...p, label: dayLabel(p.date) }));

  const totalRevenue = reports.trend.reduce((s, p) => s + p.sales, 0);
  const totalProfit = reports.trend.reduce((s, p) => s + p.profit, 0);
  const totalOrders = reports.trend.reduce((s, p) => s + p.orders, 0);
  const aov = totalOrders > 0 ? totalRevenue / totalOrders : 0;

  const imeiMetrics = useMemo(() => {
    if (!imeiStats) return null;
    const total = imeiStats.total || 0;
    const sold = imeiStats.sold || 0;
    const inStock = imeiStats.inStock || 0;
    const turnoverRate = total > 0 ? (sold / total) * 100 : 0;
    return {
      total, sold, inStock, turnoverRate,
      returned: imeiStats.returned || 0,
      damaged: imeiStats.damaged || 0,
      stockValue: (imeiStats as any).stockValue || 0,
    };
  }, [imeiStats]);

  return (
    <div className="space-y-6">
      <ReportsHero
        gradient="from-slate-950 via-blue-900 to-indigo-800"
        emoji="📱"
        industryLabel="Mobile"
        title="Mobile Shop Reports"
        subtitle="IMEI turnover, EMI performance, PTA breakdown, repair analytics"
        days={days}
        setDays={setDays}
      />

      <TabSwitcher tabs={TABS} active={tab} onChange={setTab} color="blue" />

      {tab === 'overview' && (
        <>
          <section className="grid sm:grid-cols-2 lg:grid-cols-4 gap-4">
            <KpiCard label="Total Revenue" value={formatPKR(totalRevenue)} icon={TrendingUp} color="emerald" />
            <KpiCard label="Total Profit" value={formatPKR(totalProfit)} icon={Target} color="blue" isHighlight />
            <KpiCard label="Phones Sold" value={imeiMetrics?.sold ?? 0} icon={Smartphone} color="cyan" />
            <KpiCard label="Avg Order Value" value={formatPKR(aov)} icon={DollarSign} color="amber" />
          </section>

          {reports.profitLoss && (
            <section className="rounded-3xl bg-white border border-slate-200 shadow-sm p-6">
              <div className="flex items-center justify-between mb-5 flex-wrap gap-2">
                <div>
                  <h3 className="text-xl font-bold text-slate-900">Mobile Shop P&L</h3>
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
                  <PnLLine label="Phone/Accessory Cost" value={-reports.profitLoss.cogs} type="negative" />
                  <PnLLine label="Gross Profit" value={reports.profitLoss.grossProfit} type="bold" sub={`${reports.profitLoss.grossMargin.toFixed(1)}% margin`} />
                  <PnLLine label="Operating Expenses" value={-reports.profitLoss.expenses} type="negative" />
                  <PnLLine label="Net Profit" value={reports.profitLoss.netProfit} type="highlight" sub={`${reports.profitLoss.netMargin.toFixed(1)}% margin`} />
                </div>
                <div className="grid grid-cols-2 gap-3">
                  <MiniStat label="Orders" value={reports.profitLoss.orderCount} color="blue" icon={Smartphone} />
                  <MiniStat label="Returns" value={reports.profitLoss.returnCount} color="rose" icon={Activity} />
                  <MiniStat label="Cash Paid" value={formatPKR(reports.profitLoss.paid)} color="emerald" icon={CreditCard} />
                  <MiniStat label="EMI/Udhaar" value={formatPKR(reports.profitLoss.credit)} color="amber" icon={DollarSign} />
                  <MiniStat label="IMEIs Sold" value={imeiMetrics?.sold ?? 0} color="violet" icon={ShieldCheck} />
                  <MiniStat label="Turnover Rate" value={`${(imeiMetrics?.turnoverRate ?? 0).toFixed(1)}%`} color="cyan" icon={RefreshCw} />
                </div>
              </div>
            </section>
          )}

          <ChartCard title="Mobile Sales Trend" subtitle={`${days}-day analysis`} icon={TrendingUp} color="blue">
            <ResponsiveContainer width="100%" height="100%">
              <ComposedChart data={trendData}>
                <defs>
                  <linearGradient id="msalesGrad" x1="0" y1="0" x2="0" y2="1">
                    <stop offset="0%" stopColor="#3b82f6" stopOpacity={0.5} />
                    <stop offset="100%" stopColor="#3b82f6" stopOpacity={0} />
                  </linearGradient>
                </defs>
                <CartesianGrid strokeDasharray="3 3" stroke="#e2e8f0" />
                <XAxis dataKey="label" stroke="#64748b" fontSize={11} />
                <YAxis yAxisId="left" stroke="#64748b" fontSize={11} tickFormatter={(v) => `${(v / 1000).toFixed(0)}k`} />
                <YAxis yAxisId="right" orientation="right" stroke="#64748b" fontSize={11} />
                <Tooltip formatter={(value: any, name: any) => name === 'Orders' ? value : formatPKR(Number(value))} contentStyle={{ borderRadius: 12 }} />
                <Legend wrapperStyle={{ fontSize: 12 }} />
                <Area yAxisId="left" type="monotone" dataKey="sales" name="Sales" fill="url(#msalesGrad)" stroke="#3b82f6" strokeWidth={2.5} />
                <Bar yAxisId="left" dataKey="profit" name="Profit" fill="#8b5cf6" radius={[4, 4, 0, 0]} barSize={20} />
                <Line yAxisId="right" type="monotone" dataKey="orders" name="Orders" stroke="#10b981" strokeWidth={2.5} dot={{ r: 4 }} />
              </ComposedChart>
            </ResponsiveContainer>
          </ChartCard>
        </>
      )}

      {tab === 'imei' && (
        <>
          <section className="grid sm:grid-cols-2 lg:grid-cols-4 gap-4">
            <KpiCard label="Total IMEIs" value={imeiMetrics?.total ?? 0} icon={Smartphone} color="blue" />
            <KpiCard label="In Stock" value={imeiMetrics?.inStock ?? 0} icon={Package} color="cyan" />
            <KpiCard label="Sold Lifetime" value={imeiMetrics?.sold ?? 0} icon={TrendingUp} color="emerald" isHighlight />
            <KpiCard label="Turnover Rate" value={`${(imeiMetrics?.turnoverRate ?? 0).toFixed(1)}%`} icon={RefreshCw} color="violet" />
          </section>

          <section className="grid lg:grid-cols-2 gap-6">
            <ChartCard title="PTA Status Distribution" subtitle="Approved vs Non-PTA vs Patched" icon={ShieldCheck} color="blue">
              {ptaBreakdown.length > 0 ? (
                <ResponsiveContainer width="100%" height="100%">
                  <PieChart>
                    <Pie
                      data={ptaBreakdown.map((p: any) => ({ name: p.ptaStatus, value: p._count?._all || 0 }))}
                      dataKey="value"
                      nameKey="name"
                      cx="50%" cy="50%"
                      outerRadius={100} innerRadius={50}
                      paddingAngle={2}
                      label={(entry: any) => entry.value}
                    >
                      {ptaBreakdown.map((p: any, idx: number) => (
                        <Cell key={idx} fill={PTA_COLORS[p.ptaStatus] || PIE_COLORS[idx]} />
                      ))}
                    </Pie>
                    <Tooltip contentStyle={{ borderRadius: 12 }} />
                    <Legend wrapperStyle={{ fontSize: 11, paddingTop: 12 }} iconType="circle" />
                  </PieChart>
                </ResponsiveContainer>
              ) : <EmptyChart message="No PTA data yet" />}
            </ChartCard>

            <ChartCard title="IMEI Status Breakdown" subtitle="Stock vs Sold vs Returns" icon={Package} color="blue">
              <div className="h-full flex flex-col justify-center gap-3">
                <MiniStat label="In Stock" value={imeiMetrics?.inStock ?? 0} color="blue" icon={Package} />
                <MiniStat label="Sold" value={imeiMetrics?.sold ?? 0} color="emerald" icon={TrendingUp} />
                <MiniStat label="Returned" value={imeiMetrics?.returned ?? 0} color="amber" icon={RefreshCw} />
                <MiniStat label="Damaged" value={imeiMetrics?.damaged ?? 0} color="rose" icon={Activity} />
                <div className="rounded-xl bg-blue-50 border-2 border-blue-200 p-3">
                  <div className="text-[10px] uppercase font-extrabold text-blue-700">Stock Value</div>
                  <div className="text-2xl font-extrabold text-blue-900 tabular-nums mt-1">
                    {formatPKR(imeiMetrics?.stockValue ?? 0)}
                  </div>
                </div>
              </div>
            </ChartCard>
          </section>
        </>
      )}

      {tab === 'emi' && (
        <>
          <section className="grid sm:grid-cols-3 gap-4">
            <KpiCard label="Active EMI Plans" value={0} icon={CreditCard} color="violet" isHighlight />
            <KpiCard label="Monthly EMI Revenue" value={formatPKR(0)} icon={DollarSign} color="emerald" />
            <KpiCard label="Overdue Payments" value={0} icon={Activity} color="rose" />
          </section>

          <div className="rounded-3xl bg-white border border-slate-200 shadow-sm p-8 text-center">
            <CreditCard className="h-16 w-16 text-slate-300 mx-auto mb-3" />
            <h3 className="font-extrabold text-slate-700">EMI Details</h3>
            <p className="text-sm text-slate-500 mt-1">Visit EMI Plans page for detailed installment tracking</p>
          </div>
        </>
      )}

      {tab === 'repairs' && (
        <>
          <section className="grid sm:grid-cols-3 gap-4">
            <KpiCard label="Open Tickets" value={0} icon={Wrench} color="amber" isHighlight />
            <KpiCard label="Completed" value={0} icon={Award} color="emerald" />
            <KpiCard label="Repair Revenue" value={formatPKR(0)} icon={DollarSign} color="violet" />
          </section>

          <div className="rounded-3xl bg-white border border-slate-200 shadow-sm p-8 text-center">
            <Wrench className="h-16 w-16 text-slate-300 mx-auto mb-3" />
            <h3 className="font-extrabold text-slate-700">Repair Analytics</h3>
            <p className="text-sm text-slate-500 mt-1">Visit Repairs page for detailed ticket management</p>
          </div>
        </>
      )}

      {tab === 'models' && (
        <section className="rounded-3xl bg-white border border-slate-200 shadow-sm overflow-hidden">
          <div className="px-6 py-5 border-b border-slate-100">
            <h3 className="text-xl font-bold text-slate-900">Top Selling Phone Models</h3>
            <p className="text-sm text-slate-500">Best sellers with profit analysis</p>
          </div>
          <div className="overflow-x-auto">
            <table className="w-full text-sm">
              <thead className="bg-slate-50 text-slate-600">
                <tr>
                  <th className="text-center px-3 py-3 font-bold text-[10px] uppercase w-12">#</th>
                  <th className="text-left px-3 py-3 font-bold text-[10px] uppercase">Model</th>
                  <th className="text-right px-3 py-3 font-bold text-[10px] uppercase">Units Sold</th>
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
                        <div className="h-10 w-10 rounded-lg bg-blue-100 overflow-hidden flex items-center justify-center">
                          {p.product?.images?.[0]?.url ? (
                            <img src={p.product.images[0].url} alt="" className="h-full w-full object-cover" />
                          ) : (
                            <Smartphone className="h-4 w-4 text-blue-400" />
                          )}
                        </div>
                        <div className="font-bold text-slate-900">{p.product?.name}</div>
                      </div>
                    </td>
                    <td className="px-3 py-3 text-right font-bold">{p.quantitySold}</td>
                    <td className="px-3 py-3 text-right text-slate-700">{p.orderCount}</td>
                    <td className="px-3 py-3 text-right font-extrabold text-emerald-700 tabular-nums">{formatPKR(p.revenue)}</td>
                    <td className="px-3 py-3 text-right font-extrabold text-violet-700 tabular-nums">{formatPKR(p.profit)}</td>
                    <td className="px-3 py-3 text-center">
                      <span className={`inline-flex px-2 py-0.5 rounded-full text-xs font-extrabold ${
                        p.margin > 15 ? 'bg-emerald-100 text-emerald-700' :
                        p.margin > 5 ? 'bg-amber-100 text-amber-700' :
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
    </div>
  );
}
