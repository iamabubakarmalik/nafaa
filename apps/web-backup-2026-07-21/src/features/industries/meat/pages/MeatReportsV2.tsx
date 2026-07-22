import { useState, useMemo } from 'react';
import { useQuery } from '@tanstack/react-query';
import {
  BarChart3, Beef, ShieldCheck, Weight, Heart,
  TrendingUp, Target, Award, Users, Crown, Activity,
  DollarSign, Star, Clock, Package, Scissors,
} from 'lucide-react';
import {
  ResponsiveContainer, AreaChart, Area, BarChart, Bar, PieChart, Pie, Cell,
  XAxis, YAxis, Tooltip, CartesianGrid, Legend, LineChart, Line,
  ComposedChart,
} from 'recharts';
import { formatPKR } from '@/lib/format';
import { useReportsData } from '@/features/reports/hooks/useReportsData';
import {
  ReportsHero, TabSwitcher, KpiCard, ChartCard, EmptyChart,
  PnLLine, MiniStat, dayLabel, PIE_COLORS,
} from '@/features/reports/components/ReportsShared';
import { liveAnimalsApi } from '../api/live-animals.api';
import { slaughterApi } from '../api/slaughter.api';

const TABS = [
  { id: 'overview', label: 'Overview', icon: BarChart3 },
  { id: 'livestock', label: 'Livestock', icon: Heart },
  { id: 'halal', label: 'Halal Compliance', icon: ShieldCheck },
  { id: 'cuts', label: 'Top Cuts', icon: Beef },
  { id: 'staff', label: 'Staff', icon: Crown },
];

const MEAT_UNITS = new Set(['kg', 'gram', 'pound', 'piece', 'dozen', 'whole', 'half', 'quarter']);

export default function MeatReportsV2() {
  const [days, setDays] = useState(14);
  const [tab, setTab] = useState('overview');
  const reports = useReportsData(days);

  const { data: liveAnimalsSummary } = useQuery({
    queryKey: ['live-animals-summary-reports'],
    queryFn: () => liveAnimalsApi.summary(),
  });

  const { data: halalCompliance } = useQuery({
    queryKey: ['halal-compliance-reports'],
    queryFn: () => slaughterApi.halalCompliance(),
  });

  const trendData = reports.trend.map((p) => ({ ...p, label: dayLabel(p.date) }));

  const totalRevenue = reports.trend.reduce((s, p) => s + p.sales, 0);
  const totalProfit = reports.trend.reduce((s, p) => s + p.profit, 0);
  const totalOrders = reports.trend.reduce((s, p) => s + p.orders, 0);
  const aov = totalOrders > 0 ? totalRevenue / totalOrders : 0;

  const meatProducts = reports.topProducts.filter(
    (p) => p.product && MEAT_UNITS.has(p.product.unit || ''),
  );
  const totalKgSold = meatProducts.reduce((s, p) => s + p.quantitySold, 0);

  return (
    <div className="space-y-6">
      <ReportsHero
        gradient="from-slate-950 via-red-900 to-rose-800"
        emoji="🥩"
        industryLabel="Meat"
        title="Meat Business Reports"
        subtitle="Kg sold, halal compliance, livestock costs, top cuts"
        days={days}
        setDays={setDays}
      />

      <TabSwitcher tabs={TABS} active={tab} onChange={setTab} color="orange" />

      {tab === 'overview' && (
        <>
          <section className="grid sm:grid-cols-2 lg:grid-cols-4 gap-4">
            <KpiCard label="Total Revenue" value={formatPKR(totalRevenue)} icon={TrendingUp} color="emerald" isHighlight />
            <KpiCard label="Total Profit" value={formatPKR(totalProfit)} icon={Target} color="orange" />
            <KpiCard label="Kg Sold" value={totalKgSold.toFixed(0)} icon={Weight} color="rose" />
            <KpiCard label="Avg Order Value" value={formatPKR(aov)} icon={DollarSign} color="amber" />
          </section>

          {reports.profitLoss && (
            <section className="rounded-3xl bg-white border border-slate-200 shadow-sm p-6">
              <div className="flex items-center justify-between mb-5 flex-wrap gap-2">
                <div>
                  <h3 className="text-xl font-bold text-slate-900">Meat Business P&L</h3>
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
                  <PnLLine label="Meat/Livestock Cost" value={-reports.profitLoss.cogs} type="negative" />
                  <PnLLine label="Gross Profit" value={reports.profitLoss.grossProfit} type="bold" sub={`${reports.profitLoss.grossMargin.toFixed(1)}% margin`} />
                  <PnLLine label="Operating Expenses" value={-reports.profitLoss.expenses} type="negative" />
                  <PnLLine label="Net Profit" value={reports.profitLoss.netProfit} type="highlight" sub={`${reports.profitLoss.netMargin.toFixed(1)}% margin`} />
                </div>
                <div className="grid grid-cols-2 gap-3">
                  <MiniStat label="Orders" value={reports.profitLoss.orderCount} color="rose" icon={TrendingUp} />
                  <MiniStat label="Kg Sold" value={totalKgSold.toFixed(0)} color="orange" icon={Weight} />
                  <MiniStat label="Cash Paid" value={formatPKR(reports.profitLoss.paid)} color="emerald" icon={DollarSign} />
                  <MiniStat label="Udhaar" value={formatPKR(reports.profitLoss.credit)} color="amber" icon={Package} />
                  <MiniStat label="Purchases" value={formatPKR(reports.profitLoss.purchases)} color="violet" icon={Package} />
                  <MiniStat label="Discount" value={formatPKR(reports.profitLoss.discount)} color="pink" icon={Star} />
                </div>
              </div>
            </section>
          )}

          <ChartCard title="Meat Sales Trend" subtitle={`${days}-day analysis`} icon={TrendingUp} color="orange">
            <ResponsiveContainer width="100%" height="100%">
              <ComposedChart data={trendData}>
                <defs>
                  <linearGradient id="meatSalesGrad" x1="0" y1="0" x2="0" y2="1">
                    <stop offset="0%" stopColor="#dc2626" stopOpacity={0.5} />
                    <stop offset="100%" stopColor="#dc2626" stopOpacity={0} />
                  </linearGradient>
                </defs>
                <CartesianGrid strokeDasharray="3 3" stroke="#e2e8f0" />
                <XAxis dataKey="label" stroke="#64748b" fontSize={11} />
                <YAxis yAxisId="left" stroke="#64748b" fontSize={11} tickFormatter={(v) => `${(v / 1000).toFixed(0)}k`} />
                <YAxis yAxisId="right" orientation="right" stroke="#64748b" fontSize={11} />
                <Tooltip formatter={(value: any, name: any) => name === 'Orders' ? value : formatPKR(Number(value))} contentStyle={{ borderRadius: 12 }} />
                <Legend wrapperStyle={{ fontSize: 12 }} />
                <Area yAxisId="left" type="monotone" dataKey="sales" name="Sales" fill="url(#meatSalesGrad)" stroke="#dc2626" strokeWidth={2.5} />
                <Bar yAxisId="left" dataKey="profit" name="Profit" fill="#10b981" radius={[4, 4, 0, 0]} barSize={20} />
                <Line yAxisId="right" type="monotone" dataKey="orders" name="Orders" stroke="#f59e0b" strokeWidth={2.5} dot={{ r: 4 }} />
              </ComposedChart>
            </ResponsiveContainer>
          </ChartCard>
        </>
      )}

      {tab === 'livestock' && liveAnimalsSummary && (
        <>
          <section className="grid sm:grid-cols-4 gap-4">
            <KpiCard label="Alive Animals" value={liveAnimalsSummary.aliveCount ?? 0} icon={Heart} color="emerald" isHighlight />
            <KpiCard label="Purchase Cost" value={formatPKR(liveAnimalsSummary.totalCost?._sum?.purchasePrice ?? 0)} icon={DollarSign} color="blue" />
            <KpiCard label="Feed Cost" value={formatPKR(liveAnimalsSummary.totalCost?._sum?.totalFeedCost ?? 0)} icon={Package} color="orange" />
            <KpiCard label="Total Investment" value={formatPKR((liveAnimalsSummary.totalCost?._sum?.purchasePrice ?? 0) + (liveAnimalsSummary.totalCost?._sum?.totalFeedCost ?? 0))} icon={Target} color="amber" />
          </section>

          <div className="rounded-3xl bg-white border border-slate-200 shadow-sm p-8 text-center">
            <Heart className="h-16 w-16 text-red-300 mx-auto mb-3" />
            <h3 className="font-extrabold text-slate-700">Livestock Analytics</h3>
            <p className="text-sm text-slate-500 mt-1">Visit Live Animals page for detailed tracking</p>
          </div>
        </>
      )}

      {tab === 'halal' && halalCompliance && (
        <>
          <section className="grid sm:grid-cols-4 gap-4">
            <KpiCard label="Total Slaughters" value={halalCompliance.total} icon={ShieldCheck} color="rose" />
            <KpiCard label="Halal Compliance" value={`${halalCompliance.halalPct.toFixed(1)}%`} icon={ShieldCheck} color="emerald" isHighlight sub={`${halalCompliance.halal} halal`} />
            <KpiCard label="With Certificate" value={`${halalCompliance.certPct.toFixed(1)}%`} icon={Award} color="blue" sub={`${halalCompliance.withCert} certified`} />
            <KpiCard label="Vet Inspected" value={`${halalCompliance.vetPct.toFixed(1)}%`} icon={ShieldCheck} color="violet" sub={`${halalCompliance.withVet} inspected`} />
          </section>

          <ChartCard title="Halal Compliance Breakdown" icon={ShieldCheck} color="orange">
            <ResponsiveContainer width="100%" height="100%">
              <PieChart>
                <Pie
                  data={[
                    { name: 'Halal', value: halalCompliance.halal, color: '#10b981' },
                    { name: 'With Cert', value: halalCompliance.withCert, color: '#3b82f6' },
                    { name: 'Vet Passed', value: halalCompliance.withVet, color: '#8b5cf6' },
                  ].filter((d) => d.value > 0)}
                  dataKey="value"
                  cx="50%" cy="50%"
                  outerRadius={100} innerRadius={50}
                  paddingAngle={2}
                  label={(entry: any) => entry.value}
                >
                  {['#10b981', '#3b82f6', '#8b5cf6'].map((c, i) => <Cell key={i} fill={c} />)}
                </Pie>
                <Tooltip contentStyle={{ borderRadius: 12 }} />
                <Legend wrapperStyle={{ fontSize: 11 }} iconType="circle" />
              </PieChart>
            </ResponsiveContainer>
          </ChartCard>
        </>
      )}

      {tab === 'cuts' && (
        <section className="rounded-3xl bg-white border border-slate-200 shadow-sm overflow-hidden">
          <div className="px-6 py-5 border-b border-slate-100">
            <h3 className="text-xl font-bold text-slate-900">Top Selling Meat Cuts</h3>
            <p className="text-sm text-slate-500">Best sellers with kg & profit</p>
          </div>
          <div className="overflow-x-auto">
            <table className="w-full text-sm">
              <thead className="bg-slate-50 text-slate-600">
                <tr>
                  <th className="text-center px-3 py-3 font-bold text-[10px] uppercase w-12">#</th>
                  <th className="text-left px-3 py-3 font-bold text-[10px] uppercase">Cut</th>
                  <th className="text-right px-3 py-3 font-bold text-[10px] uppercase">Kg Sold</th>
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
                        <div className="h-10 w-10 rounded-lg bg-red-100 overflow-hidden flex items-center justify-center">
                          {p.product?.images?.[0]?.url ? (
                            <img src={p.product.images[0].url} alt="" className="h-full w-full object-cover" />
                          ) : (
                            <Beef className="h-4 w-4 text-red-400" />
                          )}
                        </div>
                        <div className="font-bold text-slate-900">{p.product?.name}</div>
                      </div>
                    </td>
                    <td className="px-3 py-3 text-right font-bold">{p.quantitySold.toFixed(1)} {p.product?.unit}</td>
                    <td className="px-3 py-3 text-right text-slate-700">{p.orderCount}</td>
                    <td className="px-3 py-3 text-right font-extrabold text-emerald-700 tabular-nums">{formatPKR(p.revenue)}</td>
                    <td className="px-3 py-3 text-right font-extrabold text-violet-700 tabular-nums">{formatPKR(p.profit)}</td>
                    <td className="px-3 py-3 text-center">
                      <span className={`inline-flex px-2 py-0.5 rounded-full text-xs font-extrabold ${
                        p.margin > 30 ? 'bg-emerald-100 text-emerald-700' :
                        p.margin > 15 ? 'bg-amber-100 text-amber-700' :
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
              {reports.cashiers.map((c, idx) => (
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
                        <div className="h-9 w-9 rounded-xl bg-red-100 text-red-700 flex items-center justify-center font-bold">
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
