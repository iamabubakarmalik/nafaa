import { useState, useMemo } from 'react';
import { useQuery } from '@tanstack/react-query';
import {
  BarChart3, Wrench, Car, Package, Users, Crown, Activity,
  TrendingUp, Target, Award, DollarSign, Clock, AlertTriangle,
} from 'lucide-react';
import {
  ResponsiveContainer, AreaChart, Area, BarChart, Bar, PieChart, Pie, Cell,
  XAxis, YAxis, Tooltip, CartesianGrid, Legend, LineChart, Line, ComposedChart,
} from 'recharts';
import { formatPKR } from '@core/lib/format';
import { useReportsData } from '@modules/reports/reports/hooks/useReportsData';
import {
  ReportsHero, TabSwitcher, KpiCard, ChartCard, EmptyChart,
  PnLLine, MiniStat, dayLabel, PIE_COLORS,
} from '@modules/reports/reports/components/ReportsShared';
import { workshopJobsApi } from '../api/workshop-jobs.api';
import { partProfilesApi } from '../api/part-profiles.api';

const TABS = [
  { id: 'overview', label: 'Overview', icon: BarChart3 },
  { id: 'jobs', label: 'Workshop Jobs', icon: Wrench },
  { id: 'parts', label: 'Parts', icon: Package },
  { id: 'vehicles', label: 'Vehicles', icon: Car },
  { id: 'staff', label: 'Staff', icon: Crown },
];

export default function AutoPartsReportsV2() {
  const [days, setDays] = useState(14);
  const [tab, setTab] = useState('overview');
  const reports = useReportsData(days);

  const { data: allJobs = [] } = useQuery({
    queryKey: ['workshop-jobs-reports'],
    queryFn: () => workshopJobsApi.list({}),
  });

  const { data: parts = [] } = useQuery({
    queryKey: ['parts-reports'],
    queryFn: () => partProfilesApi.list({}),
  });

  const trendData = reports.trend.map((p) => ({ ...p, label: dayLabel(p.date) }));

  const totalRevenue = reports.trend.reduce((s, p) => s + p.sales, 0);
  const totalProfit = reports.trend.reduce((s, p) => s + p.profit, 0);
  const totalOrders = reports.trend.reduce((s, p) => s + p.orders, 0);
  const aov = totalOrders > 0 ? totalRevenue / totalOrders : 0;

  const jobStats = useMemo(() => {
    const completed = allJobs.filter((j: any) => ['DELIVERED', 'COMPLETED'].includes(j.status)).length;
    const cancelled = allJobs.filter((j: any) => j.status === 'CANCELLED').length;
    const inProgress = allJobs.filter((j: any) => j.status === 'IN_PROGRESS').length;
    const totalRevenue = allJobs.filter((j: any) => j.status === 'DELIVERED').reduce((s: number, j: any) => s + Number(j.total || 0), 0);
    return { total: allJobs.length, completed, cancelled, inProgress, totalRevenue };
  }, [allJobs]);

  const fastMovingCount = parts.filter((p: any) => p.isFastMoving).length;
  const criticalCount = parts.filter((p: any) => p.isCritical).length;

  return (
    <div className="space-y-6">
      <ReportsHero
        gradient="from-slate-950 via-slate-800 to-slate-700"
        emoji="🔧"
        industryLabel="Auto Parts"
        title="Auto Parts / Workshop Reports"
        subtitle="Job pipeline, parts velocity, mechanic performance"
        days={days}
        setDays={setDays}
      />

      <TabSwitcher tabs={TABS} active={tab} onChange={setTab} color="violet" />

      {tab === 'overview' && (
        <>
          <section className="grid sm:grid-cols-2 lg:grid-cols-4 gap-4">
            <KpiCard label="Total Revenue" value={formatPKR(totalRevenue)} icon={TrendingUp} color="emerald" />
            <KpiCard label="Total Profit" value={formatPKR(totalProfit)} icon={Target} color="violet" isHighlight />
            <KpiCard label="Jobs Completed" value={jobStats.completed} icon={Wrench} color="orange" />
            <KpiCard label="Avg Sale" value={formatPKR(aov)} icon={DollarSign} color="amber" />
          </section>

          {reports.profitLoss && (
            <section className="rounded-3xl bg-white border border-slate-200 shadow-sm p-6">
              <div className="flex items-center justify-between mb-5 flex-wrap gap-2">
                <div>
                  <h3 className="text-xl font-bold text-slate-900">Auto Parts P&L</h3>
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
                  <PnLLine label="Net Revenue" value={reports.profitLoss.netRevenue} type="bold" />
                  <PnLLine label="Parts Cost (COGS)" value={-reports.profitLoss.cogs} type="negative" />
                  <PnLLine label="Gross Profit" value={reports.profitLoss.grossProfit} type="bold" sub={`${reports.profitLoss.grossMargin.toFixed(1)}%`} />
                  <PnLLine label="Operating Expenses" value={-reports.profitLoss.expenses} type="negative" />
                  <PnLLine label="Net Profit" value={reports.profitLoss.netProfit} type="highlight" sub={`${reports.profitLoss.netMargin.toFixed(1)}% margin`} />
                </div>
                <div className="grid grid-cols-2 gap-3">
                  <MiniStat label="Sales" value={reports.profitLoss.orderCount} color="blue" icon={TrendingUp} />
                  <MiniStat label="Jobs Done" value={jobStats.completed} color="orange" icon={Wrench} />
                  <MiniStat label="Cash" value={formatPKR(reports.profitLoss.paid)} color="emerald" icon={DollarSign} />
                  <MiniStat label="Udhaar" value={formatPKR(reports.profitLoss.credit)} color="amber" icon={Package} />
                  <MiniStat label="Fast Moving" value={fastMovingCount} color="rose" icon={Activity} />
                  <MiniStat label="Critical Parts" value={criticalCount} color="pink" icon={AlertTriangle} />
                </div>
              </div>
            </section>
          )}

          <ChartCard title="Sales & Profit Trend" subtitle={`${days} days`} icon={TrendingUp}>
            <ResponsiveContainer width="100%" height="100%">
              <ComposedChart data={trendData}>
                <defs>
                  <linearGradient id="apSGrad" x1="0" y1="0" x2="0" y2="1">
                    <stop offset="0%" stopColor="#475569" stopOpacity={0.5} />
                    <stop offset="100%" stopColor="#475569" stopOpacity={0} />
                  </linearGradient>
                </defs>
                <CartesianGrid strokeDasharray="3 3" stroke="#e2e8f0" />
                <XAxis dataKey="label" stroke="#64748b" fontSize={11} />
                <YAxis yAxisId="left" stroke="#64748b" fontSize={11} tickFormatter={(v) => `${(v / 1000).toFixed(0)}k`} />
                <YAxis yAxisId="right" orientation="right" stroke="#64748b" fontSize={11} />
                <Tooltip formatter={(value: any, name: any) => name === 'Orders' ? value : formatPKR(Number(value))} contentStyle={{ borderRadius: 12 }} />
                <Legend wrapperStyle={{ fontSize: 12 }} />
                <Area yAxisId="left" type="monotone" dataKey="sales" name="Sales" fill="url(#apSGrad)" stroke="#475569" strokeWidth={2.5} />
                <Bar yAxisId="left" dataKey="profit" name="Profit" fill="#8b5cf6" radius={[4, 4, 0, 0]} barSize={20} />
                <Line yAxisId="right" type="monotone" dataKey="orders" name="Orders" stroke="#10b981" strokeWidth={2.5} dot={{ r: 4 }} />
              </ComposedChart>
            </ResponsiveContainer>
          </ChartCard>
        </>
      )}

      {tab === 'jobs' && (
        <>
          <section className="grid sm:grid-cols-2 lg:grid-cols-4 gap-4">
            <KpiCard label="Total Jobs" value={jobStats.total} icon={Wrench} color="orange" />
            <KpiCard label="Completed" value={jobStats.completed} icon={Award} color="emerald" isHighlight />
            <KpiCard label="In Progress" value={jobStats.inProgress} icon={Clock} color="amber" />
            <KpiCard label="Job Revenue" value={formatPKR(jobStats.totalRevenue)} icon={DollarSign} color="violet" />
          </section>

          <div className="rounded-3xl bg-white border border-slate-200 shadow-sm p-8 text-center">
            <Wrench className="h-16 w-16 text-slate-300 mx-auto mb-3" />
            <h3 className="font-extrabold text-slate-700">Job Analytics</h3>
            <p className="text-sm text-slate-500 mt-1">Visit Workshop Jobs for detailed tracking</p>
          </div>
        </>
      )}

      {tab === 'parts' && (
        <>
          <section className="grid sm:grid-cols-3 gap-4">
            <KpiCard label="Total Parts" value={parts.length} icon={Package} color="violet" isHighlight />
            <KpiCard label="Fast Moving" value={fastMovingCount} icon={Activity} color="rose" />
            <KpiCard label="Critical" value={criticalCount} icon={AlertTriangle} color="amber" />
          </section>

          <section className="rounded-3xl bg-white border border-slate-200 shadow-sm overflow-hidden">
            <div className="px-6 py-5 border-b border-slate-100">
              <h3 className="text-xl font-bold text-slate-900">Best Selling Parts</h3>
            </div>
            <div className="overflow-x-auto">
              <table className="w-full text-sm">
                <thead className="bg-slate-50 text-slate-600">
                  <tr>
                    <th className="text-center px-3 py-3 font-bold text-[10px] uppercase w-12">#</th>
                    <th className="text-left px-3 py-3 font-bold text-[10px] uppercase">Part</th>
                    <th className="text-right px-3 py-3 font-bold text-[10px] uppercase">Qty Sold</th>
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
                        }`}>{idx < 3 ? <Crown className="h-3.5 w-3.5" /> : idx + 1}</span>
                      </td>
                      <td className="px-3 py-3">
                        <div className="flex items-center gap-3">
                          <div className="h-10 w-10 rounded-lg bg-slate-100 overflow-hidden flex items-center justify-center">
                            {p.product?.images?.[0]?.url ? (
                              <img src={p.product.images[0].url} alt="" className="h-full w-full object-cover" />
                            ) : (
                              <Wrench className="h-4 w-4 text-slate-400" />
                            )}
                          </div>
                          <div className="font-bold text-slate-900">{p.product?.name}</div>
                        </div>
                      </td>
                      <td className="px-3 py-3 text-right font-bold">{p.quantitySold} {p.product?.unit}</td>
                      <td className="px-3 py-3 text-right font-extrabold text-emerald-700 tabular-nums">{formatPKR(p.revenue)}</td>
                      <td className="px-3 py-3 text-right font-extrabold text-violet-700 tabular-nums">{formatPKR(p.profit)}</td>
                      <td className="px-3 py-3 text-center">
                        <span className={`inline-flex px-2 py-0.5 rounded-full text-xs font-extrabold ${
                          p.margin > 30 ? 'bg-emerald-100 text-emerald-700' :
                          p.margin > 15 ? 'bg-amber-100 text-amber-700' :
                          'bg-rose-100 text-rose-700'
                        }`}>{p.margin.toFixed(1)}%</span>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </section>
        </>
      )}

      {tab === 'vehicles' && (
        <div className="rounded-3xl bg-white border border-slate-200 shadow-sm p-8 text-center">
          <Car className="h-16 w-16 text-slate-300 mx-auto mb-3" />
          <h3 className="font-extrabold text-slate-700">Vehicle Analytics</h3>
          <p className="text-sm text-slate-500 mt-1">Visit Customer Vehicles for detailed tracking</p>
        </div>
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
                <th className="text-right px-6 py-3 font-bold text-xs uppercase">Sales</th>
                <th className="text-right px-6 py-3 font-bold text-xs uppercase">Total</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-100">
              {reports.cashiers.map((c, idx) => (
                <tr key={c.userId || idx} className="hover:bg-slate-50">
                  <td className="px-6 py-3 text-center">
                    <span className={`inline-flex h-8 w-8 rounded-lg items-center justify-center font-extrabold text-xs ${
                      idx === 0 ? 'bg-amber-500 text-white' :
                      idx === 1 ? 'bg-slate-400 text-white' :
                      idx === 2 ? 'bg-orange-600 text-white' :
                      'bg-slate-100 text-slate-500'
                    }`}>{idx < 3 ? <Crown className="h-4 w-4" /> : idx + 1}</span>
                  </td>
                  <td className="px-6 py-3">
                    <div className="font-bold text-slate-900">{c.user?.fullName || 'Unknown'}</div>
                    <div className="text-xs text-slate-500">{c.user?.role}</div>
                  </td>
                  <td className="px-6 py-3 text-right font-bold">{c.orderCount}</td>
                  <td className="px-6 py-3 text-right font-extrabold text-emerald-700 tabular-nums">{formatPKR(c.totalSales)}</td>
                </tr>
              ))}
            </tbody>
          </table>
        </section>
      )}
    </div>
  );
}
