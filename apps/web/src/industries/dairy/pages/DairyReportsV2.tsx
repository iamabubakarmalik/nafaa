import { useState, useMemo } from 'react';
import { useQuery } from '@tanstack/react-query';
import {
  BarChart3, Milk, Sunrise, Sunset, Users, Route as RouteIcon,
  TrendingUp, Target, Award, Crown, Activity, DollarSign,
  Package, Beaker, Warehouse, Truck,
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
import { dairyCustomersApi } from '../api/customers.api';
import { salesApi } from '@modules/sales/sales/api/sales.api';

const TABS = [
  { id: 'overview', label: 'Overview', icon: BarChart3 },
  { id: 'slots', label: 'Slots (Morning/Evening)', icon: Sunrise },
  { id: 'subscribers', label: 'Subscribers', icon: Users },
  { id: 'products', label: 'Top Products', icon: Milk },
  { id: 'staff', label: 'Staff', icon: Crown },
];

export default function DairyReportsV2() {
  const [days, setDays] = useState(14);
  const [tab, setTab] = useState('overview');
  const reports = useReportsData(days);

  const { data: dairyCustomers = [] } = useQuery({
    queryKey: ['dairy-customers-reports'],
    queryFn: () => dairyCustomersApi.list({}),
  });

  const { data: allSales = [] } = useQuery({
    queryKey: ['sales-for-dairy-reports'],
    queryFn: () => salesApi.list(),
  });

  const trendData = reports.trend.map((p) => ({ ...p, label: dayLabel(p.date) }));
  const totalRevenue = reports.trend.reduce((s, p) => s + p.sales, 0);
  const totalProfit = reports.trend.reduce((s, p) => s + p.profit, 0);
  const totalOrders = reports.trend.reduce((s, p) => s + p.orders, 0);
  const aov = totalOrders > 0 ? totalRevenue / totalOrders : 0;

  const subscribersActive = dairyCustomers.filter((c: any) => c.status === 'ACTIVE').length;
  const morningLiters = dairyCustomers.filter((c: any) => c.status === 'ACTIVE').reduce((s: number, c: any) => s + (c.morningQuantity || 0), 0);
  const eveningLiters = dairyCustomers.filter((c: any) => c.status === 'ACTIVE').reduce((s: number, c: any) => s + (c.eveningQuantity || 0), 0);

  const slotBreakdown = useMemo(() => {
    const morningSales = allSales.filter((s: any) => (s.note || '').includes('MORNING'));
    const eveningSales = allSales.filter((s: any) => (s.note || '').includes('EVENING'));
    return [
      { slot: 'Morning', count: morningSales.length, revenue: morningSales.reduce((s: number, x: any) => s + x.total, 0), color: '#f59e0b' },
      { slot: 'Evening', count: eveningSales.length, revenue: eveningSales.reduce((s: number, x: any) => s + x.total, 0), color: '#8b5cf6' },
    ];
  }, [allSales]);

  return (
    <div className="space-y-6">
      <ReportsHero
        gradient="from-slate-950 via-fuchsia-900 to-pink-700"
        emoji="🥛"
        industryLabel="Dairy"
        title="Dairy Business Reports"
        subtitle="Slot analysis, subscriber trends, route performance, quality"
        days={days}
        setDays={setDays}
      />

      <TabSwitcher tabs={TABS} active={tab} onChange={setTab} color="violet" />

      {tab === 'overview' && (
        <>
          <section className="grid sm:grid-cols-2 lg:grid-cols-4 gap-4">
            <KpiCard label="Total Revenue" value={formatPKR(totalRevenue)} icon={TrendingUp} color="emerald" isHighlight />
            <KpiCard label="Total Profit" value={formatPKR(totalProfit)} icon={Target} color="violet" />
            <KpiCard label="Active Subscribers" value={subscribersActive} icon={Users} color="pink" />
            <KpiCard label="Avg Order Value" value={formatPKR(aov)} icon={DollarSign} color="amber" />
          </section>

          {reports.profitLoss && (
            <section className="rounded-3xl bg-white border border-slate-200 shadow-sm p-6">
              <div className="flex items-center justify-between mb-5 flex-wrap gap-2">
                <div>
                  <h3 className="text-xl font-bold text-slate-900">Dairy Business P&L</h3>
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
                  <PnLLine label="Milk Cost (COGS)" value={-reports.profitLoss.cogs} type="negative" />
                  <PnLLine label="Gross Profit" value={reports.profitLoss.grossProfit} type="bold" sub={`${reports.profitLoss.grossMargin.toFixed(1)}% margin`} />
                  <PnLLine label="Operating Expenses" value={-reports.profitLoss.expenses} type="negative" />
                  <PnLLine label="Net Profit" value={reports.profitLoss.netProfit} type="highlight" sub={`${reports.profitLoss.netMargin.toFixed(1)}% margin`} />
                </div>
                <div className="grid grid-cols-2 gap-3">
                  <MiniStat label="Orders" value={reports.profitLoss.orderCount} color="pink" icon={Milk} />
                  <MiniStat label="Subscribers" value={subscribersActive} color="violet" icon={Users} />
                  <MiniStat label="Morning L" value={`${morningLiters.toFixed(0)}L`} color="amber" icon={Sunrise} />
                  <MiniStat label="Evening L" value={`${eveningLiters.toFixed(0)}L`} color="violet" icon={Sunset} />
                  <MiniStat label="Cash" value={formatPKR(reports.profitLoss.paid)} color="emerald" icon={DollarSign} />
                  <MiniStat label="Khata" value={formatPKR(reports.profitLoss.credit)} color="rose" icon={Warehouse} />
                </div>
              </div>
            </section>
          )}

          <ChartCard title="Dairy Sales Trend" subtitle={`${days}-day trend`} icon={TrendingUp} color="violet">
            <ResponsiveContainer width="100%" height="100%">
              <ComposedChart data={trendData}>
                <defs>
                  <linearGradient id="dySalesGrad" x1="0" y1="0" x2="0" y2="1">
                    <stop offset="0%" stopColor="#d946ef" stopOpacity={0.5} />
                    <stop offset="100%" stopColor="#d946ef" stopOpacity={0} />
                  </linearGradient>
                </defs>
                <CartesianGrid strokeDasharray="3 3" stroke="#e2e8f0" />
                <XAxis dataKey="label" stroke="#64748b" fontSize={11} />
                <YAxis yAxisId="left" stroke="#64748b" fontSize={11} tickFormatter={(v) => `${(v / 1000).toFixed(0)}k`} />
                <YAxis yAxisId="right" orientation="right" stroke="#64748b" fontSize={11} />
                <Tooltip formatter={(value: any, name: any) => name === 'Orders' ? value : formatPKR(Number(value))} contentStyle={{ borderRadius: 12 }} />
                <Legend wrapperStyle={{ fontSize: 12 }} />
                <Area yAxisId="left" type="monotone" dataKey="sales" name="Sales" fill="url(#dySalesGrad)" stroke="#d946ef" strokeWidth={2.5} />
                <Bar yAxisId="left" dataKey="profit" name="Profit" fill="#10b981" radius={[4, 4, 0, 0]} barSize={20} />
                <Line yAxisId="right" type="monotone" dataKey="orders" name="Orders" stroke="#f59e0b" strokeWidth={2.5} dot={{ r: 4 }} />
              </ComposedChart>
            </ResponsiveContainer>
          </ChartCard>
        </>
      )}

      {tab === 'slots' && (
        <>
          <section className="grid sm:grid-cols-3 gap-4">
            <KpiCard label="Morning Volume" value={`${morningLiters.toFixed(0)}L`} icon={Sunrise} color="amber" isHighlight sub="Daily subscription" />
            <KpiCard label="Evening Volume" value={`${eveningLiters.toFixed(0)}L`} icon={Sunset} color="violet" sub="Daily subscription" />
            <KpiCard label="Total Daily" value={`${(morningLiters + eveningLiters).toFixed(0)}L`} icon={Milk} color="pink" sub="All active subscribers" />
          </section>

          <ChartCard title="Morning vs Evening Sales" subtitle="Slot-wise breakdown" icon={Milk} color="violet">
            <ResponsiveContainer width="100%" height="100%">
              <PieChart>
                <Pie
                  data={slotBreakdown}
                  dataKey="revenue"
                  nameKey="slot"
                  cx="50%" cy="50%"
                  outerRadius={110} innerRadius={55}
                  paddingAngle={3}
                  label={(entry: any) => {
                    const total = slotBreakdown.reduce((s, m) => s + m.revenue, 0);
                    const pct = total > 0 ? ((entry.revenue / total) * 100).toFixed(0) : '0';
                    return `${entry.slot}: ${pct}%`;
                  }}
                >
                  {slotBreakdown.map((s) => <Cell key={s.slot} fill={s.color} />)}
                </Pie>
                <Tooltip formatter={(value: any) => formatPKR(Number(value))} contentStyle={{ borderRadius: 12 }} />
                <Legend wrapperStyle={{ fontSize: 11, paddingTop: 12 }} iconType="circle" />
              </PieChart>
            </ResponsiveContainer>
          </ChartCard>
        </>
      )}

      {tab === 'subscribers' && (
        <>
          <section className="grid sm:grid-cols-3 gap-4">
            <KpiCard label="Active Subscribers" value={subscribersActive} icon={Users} color="pink" isHighlight />
            <KpiCard label="Paused" value={dairyCustomers.filter((c: any) => c.status === 'SUSPENDED').length} icon={Activity} color="amber" />
            <KpiCard label="Total Customers" value={dairyCustomers.length} icon={Users} color="violet" />
          </section>

          <section className="rounded-3xl bg-white border border-slate-200 shadow-sm overflow-hidden">
            <div className="px-6 py-5 border-b border-slate-100">
              <h3 className="text-xl font-bold text-slate-900">Top Subscribers by Volume</h3>
            </div>
            <div className="divide-y divide-slate-100 max-h-[400px] overflow-y-auto">
              {dairyCustomers
                .filter((c: any) => c.status === 'ACTIVE')
                .sort((a: any, b: any) => (b.morningQuantity + b.eveningQuantity) - (a.morningQuantity + a.eveningQuantity))
                .slice(0, 20)
                .map((dc: any, idx: number) => (
                  <div key={dc.id} className="px-6 py-3 flex items-center justify-between gap-3 hover:bg-slate-50">
                    <div className="flex items-center gap-3 min-w-0">
                      <div className={`h-8 w-8 rounded-lg ${idx < 3 ? 'bg-fuchsia-500' : 'bg-slate-400'} text-white font-extrabold flex items-center justify-center text-xs shrink-0`}>
                        {idx + 1}
                      </div>
                      <div className="min-w-0">
                        <div className="font-bold text-slate-900 truncate">{dc.name}</div>
                        <div className="text-[10px] text-slate-500 font-bold">{dc.customerNumber}</div>
                      </div>
                    </div>
                    <div className="text-right shrink-0">
                      <div className="font-extrabold text-fuchsia-700 tabular-nums">{(dc.morningQuantity + dc.eveningQuantity).toFixed(1)}L/day</div>
                      <div className="text-[10px] text-slate-500 font-bold">🌅 {dc.morningQuantity} 🌆 {dc.eveningQuantity}</div>
                    </div>
                  </div>
                ))}
            </div>
          </section>
        </>
      )}

      {tab === 'products' && (
        <section className="rounded-3xl bg-white border border-slate-200 shadow-sm overflow-hidden">
          <div className="px-6 py-5 border-b border-slate-100">
            <h3 className="text-xl font-bold text-slate-900">Top Dairy Products</h3>
          </div>
          <div className="overflow-x-auto">
            <table className="w-full text-sm">
              <thead className="bg-slate-50 text-slate-600">
                <tr>
                  <th className="text-center px-3 py-3 font-bold text-[10px] uppercase w-12">#</th>
                  <th className="text-left px-3 py-3 font-bold text-[10px] uppercase">Product</th>
                  <th className="text-right px-3 py-3 font-bold text-[10px] uppercase">Sold</th>
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
                        <div className="h-10 w-10 rounded-lg bg-fuchsia-100 overflow-hidden flex items-center justify-center">
                          {p.product?.images?.[0]?.url ? (
                            <img src={p.product.images[0].url} alt="" className="h-full w-full object-cover" />
                          ) : (
                            <Milk className="h-4 w-4 text-fuchsia-400" />
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
                        <div className="h-9 w-9 rounded-xl bg-fuchsia-100 text-fuchsia-700 flex items-center justify-center font-bold">
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
