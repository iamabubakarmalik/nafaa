import { useState, useMemo } from 'react';
import { useQuery } from '@tanstack/react-query';
import {
  BarChart3, Cake, Cookie, ChefHat, Wheat, Timer,
  TrendingUp, Target, Award, Users, Crown, Activity,
  DollarSign, Star, Sparkles, CreditCard, Heart,
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
import { cakeOrdersApi } from '../api/cake-orders.api';
import { ingredientsApi } from '../api/ingredients.api';

const TABS = [
  { id: 'overview', label: 'Overview', icon: BarChart3 },
  { id: 'products', label: 'Top Items', icon: Cookie },
  { id: 'cakes', label: 'Cake Orders', icon: Cake },
  { id: 'ingredients', label: 'Ingredients', icon: Wheat },
  { id: 'staff', label: 'Staff', icon: Crown },
];

export default function BakeryReportsV2() {
  const [days, setDays] = useState(14);
  const [tab, setTab] = useState('overview');
  const reports = useReportsData(days);

  const { data: cakeOrders = [] } = useQuery({
    queryKey: ['cake-orders-for-reports'],
    queryFn: () => cakeOrdersApi.list({}),
  });

  const { data: ingredients = [] } = useQuery({
    queryKey: ['ingredients-for-reports'],
    queryFn: () => ingredientsApi.list({}),
  });

  const trendData = reports.trend.map((p) => ({ ...p, label: dayLabel(p.date) }));

  const totalRevenue = reports.trend.reduce((s, p) => s + p.sales, 0);
  const totalProfit = reports.trend.reduce((s, p) => s + p.profit, 0);
  const totalOrders = reports.trend.reduce((s, p) => s + p.orders, 0);
  const aov = totalOrders > 0 ? totalRevenue / totalOrders : 0;

  const cakeStats = useMemo(() => {
    const total = cakeOrders.length;
    const delivered = cakeOrders.filter((o: any) => o.status === 'DELIVERED').length;
    const active = cakeOrders.filter((o: any) => ['CONFIRMED', 'IN_PRODUCTION', 'BAKING', 'DECORATING', 'READY'].includes(o.status)).length;
    const revenue = cakeOrders.filter((o: any) => o.status === 'DELIVERED').reduce((s: number, o: any) => s + Number(o.total || 0), 0);
    return { total, delivered, active, revenue };
  }, [cakeOrders]);

  const cakesByCategory = useMemo(() => {
    const grouped: Record<string, number> = {};
    cakeOrders.forEach((o: any) => {
      const cat = o.category || 'OTHER';
      grouped[cat] = (grouped[cat] || 0) + 1;
    });
    return Object.entries(grouped).map(([category, count]) => ({ category: category.replace('_', ' '), count }));
  }, [cakeOrders]);

  const cakesByFlavor = useMemo(() => {
    const grouped: Record<string, number> = {};
    cakeOrders.forEach((o: any) => {
      const flavor = o.flavor || 'MIXED';
      grouped[flavor] = (grouped[flavor] || 0) + 1;
    });
    return Object.entries(grouped)
      .map(([flavor, count]) => ({ flavor: flavor.replace('_', ' '), count }))
      .sort((a, b) => b.count - a.count)
      .slice(0, 10);
  }, [cakeOrders]);

  const ingredientStats = useMemo(() => {
    const totalValue = ingredients.reduce((s: number, i: any) => s + Number(i.currentStock * i.costPerUnit || 0), 0);
    const lowStock = ingredients.filter((i: any) => i.currentStock <= i.minStock).length;
    const critical = ingredients.filter((i: any) => i.isCritical).length;
    return { total: ingredients.length, totalValue, lowStock, critical };
  }, [ingredients]);

  return (
    <div className="space-y-6">
      <ReportsHero
        gradient="from-slate-950 via-pink-900 to-fuchsia-700"
        emoji="🍰"
        industryLabel="Bakery"
        title="Bakery Business Reports"
        subtitle="Best sellers, cake trends, ingredient usage, production insights"
        days={days}
        setDays={setDays}
      />

      <TabSwitcher tabs={TABS} active={tab} onChange={setTab} color="pink" />

      {tab === 'overview' && (
        <>
          <section className="grid sm:grid-cols-2 lg:grid-cols-4 gap-4">
            <KpiCard label="Total Revenue" value={formatPKR(totalRevenue)} icon={TrendingUp} color="pink" isHighlight />
            <KpiCard label="Total Profit" value={formatPKR(totalProfit)} icon={Target} color="emerald" />
            <KpiCard label="Total Orders" value={String(totalOrders)} icon={Cake} color="violet" />
            <KpiCard label="Avg Order Value" value={formatPKR(aov)} icon={DollarSign} color="amber" />
          </section>

          {reports.profitLoss && (
            <section className="rounded-3xl bg-white border border-slate-200 shadow-sm p-6">
              <div className="flex items-center justify-between mb-5 flex-wrap gap-2">
                <div>
                  <h3 className="text-xl font-bold text-slate-900">Bakery P&L</h3>
                  <p className="text-sm text-slate-500">{days} days breakdown</p>
                </div>
                <div className={`px-3 py-1.5 rounded-xl text-sm font-extrabold ${reports.profitLoss.netProfit >= 0 ? 'bg-emerald-100 text-emerald-700' : 'bg-rose-100 text-rose-700'}`}>
                  Net Margin: {reports.profitLoss.netMargin.toFixed(1)}%
                </div>
              </div>
              <div className="grid lg:grid-cols-2 gap-6">
                <div className="space-y-2">
                  <PnLLine label="Revenue" value={reports.profitLoss.revenue} type="positive" />
                  {reports.profitLoss.discount > 0 && <PnLLine label="Discounts" value={-reports.profitLoss.discount} type="negative" />}
                  <PnLLine label="Net Revenue" value={reports.profitLoss.netRevenue} type="bold" />
                  <PnLLine label="Ingredient/COGS" value={-reports.profitLoss.cogs} type="negative" />
                  <PnLLine label="Gross Profit" value={reports.profitLoss.grossProfit} type="bold" sub={`${reports.profitLoss.grossMargin.toFixed(1)}% margin`} />
                  <PnLLine label="Operating Expenses" value={-reports.profitLoss.expenses} type="negative" />
                  <PnLLine label="Net Profit" value={reports.profitLoss.netProfit} type="highlight" sub={`${reports.profitLoss.netMargin.toFixed(1)}% margin`} />
                </div>
                <div className="grid grid-cols-2 gap-3">
                  <MiniStat label="Orders" value={reports.profitLoss.orderCount} color="pink" icon={Cake} />
                  <MiniStat label="Cake Orders" value={cakeStats.total} color="fuchsia" icon={Cake} />
                  <MiniStat label="Cash Paid" value={formatPKR(reports.profitLoss.paid)} color="emerald" icon={CreditCard} />
                  <MiniStat label="Udhaar" value={formatPKR(reports.profitLoss.credit)} color="amber" icon={DollarSign} />
                  <MiniStat label="Delivered Cakes" value={cakeStats.delivered} color="cyan" icon={Award} />
                  <MiniStat label="Ingredients Value" value={formatPKR(ingredientStats.totalValue)} color="orange" icon={Wheat} />
                </div>
              </div>
            </section>
          )}

          <ChartCard title="Bakery Sales Trend" subtitle={`${days}-day analysis`} icon={TrendingUp} color="pink">
            <ResponsiveContainer width="100%" height="100%">
              <ComposedChart data={trendData}>
                <defs>
                  <linearGradient id="bksalesGrad" x1="0" y1="0" x2="0" y2="1">
                    <stop offset="0%" stopColor="#ec4899" stopOpacity={0.5} />
                    <stop offset="100%" stopColor="#ec4899" stopOpacity={0} />
                  </linearGradient>
                </defs>
                <CartesianGrid strokeDasharray="3 3" stroke="#e2e8f0" />
                <XAxis dataKey="label" stroke="#64748b" fontSize={11} />
                <YAxis yAxisId="left" stroke="#64748b" fontSize={11} tickFormatter={(v) => `${(v / 1000).toFixed(0)}k`} />
                <YAxis yAxisId="right" orientation="right" stroke="#64748b" fontSize={11} />
                <Tooltip formatter={(value: any, name: any) => name === 'Orders' ? value : formatPKR(Number(value))} contentStyle={{ borderRadius: 12 }} />
                <Legend wrapperStyle={{ fontSize: 12 }} />
                <Area yAxisId="left" type="monotone" dataKey="sales" name="Sales" fill="url(#bksalesGrad)" stroke="#ec4899" strokeWidth={2.5} />
                <Bar yAxisId="left" dataKey="profit" name="Profit" fill="#10b981" radius={[4, 4, 0, 0]} barSize={20} />
                <Line yAxisId="right" type="monotone" dataKey="orders" name="Orders" stroke="#f59e0b" strokeWidth={2.5} dot={{ r: 4 }} />
              </ComposedChart>
            </ResponsiveContainer>
          </ChartCard>
        </>
      )}

      {tab === 'products' && (
        <section className="rounded-3xl bg-white border border-slate-200 shadow-sm overflow-hidden">
          <div className="px-6 py-5 border-b border-slate-100">
            <h3 className="text-xl font-bold text-slate-900">Top Selling Bakery Items</h3>
            <p className="text-sm text-slate-500">Best sellers with profit margins</p>
          </div>
          <div className="overflow-x-auto">
            <table className="w-full text-sm">
              <thead className="bg-slate-50 text-slate-600">
                <tr>
                  <th className="text-center px-3 py-3 font-bold text-[10px] uppercase w-12">#</th>
                  <th className="text-left px-3 py-3 font-bold text-[10px] uppercase">Item</th>
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
                      <span className={`inline-flex h-7 w-7 rounded-lg items-center justify-center font-extrabold text-xs ${idx === 0 ? 'bg-amber-100 text-amber-700' : idx === 1 ? 'bg-slate-200 text-slate-700' : idx === 2 ? 'bg-orange-100 text-orange-700' : 'bg-slate-100 text-slate-500'}`}>
                        {idx < 3 ? <Crown className="h-3.5 w-3.5" /> : idx + 1}
                      </span>
                    </td>
                    <td className="px-3 py-3">
                      <div className="flex items-center gap-3">
                        <div className="h-10 w-10 rounded-lg bg-pink-100 overflow-hidden flex items-center justify-center">
                          {p.product?.images?.[0]?.url ? <img src={p.product.images[0].url} alt="" className="h-full w-full object-cover" /> : <Cookie className="h-4 w-4 text-pink-400" />}
                        </div>
                        <div className="font-bold text-slate-900">🍰 {p.product?.name}</div>
                      </div>
                    </td>
                    <td className="px-3 py-3 text-right font-bold">{p.quantitySold} {p.product?.unit}</td>
                    <td className="px-3 py-3 text-right text-slate-700">{p.orderCount}</td>
                    <td className="px-3 py-3 text-right font-extrabold text-emerald-700 tabular-nums">{formatPKR(p.revenue)}</td>
                    <td className="px-3 py-3 text-right font-extrabold text-violet-700 tabular-nums">{formatPKR(p.profit)}</td>
                    <td className="px-3 py-3 text-center">
                      <span className={`inline-flex px-2 py-0.5 rounded-full text-xs font-extrabold ${p.margin > 40 ? 'bg-emerald-100 text-emerald-700' : p.margin > 20 ? 'bg-amber-100 text-amber-700' : 'bg-rose-100 text-rose-700'}`}>
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

      {tab === 'cakes' && (
        <>
          <section className="grid sm:grid-cols-4 gap-4">
            <KpiCard label="Total Cake Orders" value={cakeStats.total} icon={Cake} color="pink" isHighlight />
            <KpiCard label="Delivered" value={cakeStats.delivered} icon={Award} color="emerald" />
            <KpiCard label="Active" value={cakeStats.active} icon={Activity} color="amber" />
            <KpiCard label="Revenue" value={formatPKR(cakeStats.revenue)} icon={DollarSign} color="violet" />
          </section>

          <section className="grid lg:grid-cols-2 gap-6">
            <ChartCard title="Cakes by Category" subtitle="Order distribution" icon={Cake} color="pink">
              {cakesByCategory.length > 0 ? (
                <ResponsiveContainer width="100%" height="100%">
                  <PieChart>
                    <Pie
                      data={cakesByCategory}
                      dataKey="count"
                      nameKey="category"
                      cx="50%" cy="50%"
                      outerRadius={100} innerRadius={50}
                      paddingAngle={2}
                      label={(entry: any) => entry.count}
                    >
                      {cakesByCategory.map((_: any, idx: number) => <Cell key={idx} fill={PIE_COLORS[idx % PIE_COLORS.length]} />)}
                    </Pie>
                    <Tooltip contentStyle={{ borderRadius: 12 }} />
                    <Legend wrapperStyle={{ fontSize: 11 }} iconType="circle" />
                  </PieChart>
                </ResponsiveContainer>
              ) : <EmptyChart message="No cake data" />}
            </ChartCard>

            <ChartCard title="Top Flavors" subtitle="Customer favorites" icon={Heart} color="pink">
              {cakesByFlavor.length > 0 ? (
                <ResponsiveContainer width="100%" height="100%">
                  <BarChart data={cakesByFlavor} layout="vertical">
                    <CartesianGrid strokeDasharray="3 3" stroke="#e2e8f0" />
                    <XAxis type="number" stroke="#64748b" fontSize={11} />
                    <YAxis dataKey="flavor" type="category" stroke="#64748b" fontSize={10} width={100} />
                    <Tooltip contentStyle={{ borderRadius: 12 }} />
                    <Bar dataKey="count" fill="#ec4899" radius={[0, 8, 8, 0]} />
                  </BarChart>
                </ResponsiveContainer>
              ) : <EmptyChart message="No flavor data" />}
            </ChartCard>
          </section>
        </>
      )}

      {tab === 'ingredients' && (
        <>
          <section className="grid sm:grid-cols-4 gap-4">
            <KpiCard label="Total Ingredients" value={ingredientStats.total} icon={Wheat} color="amber" isHighlight />
            <KpiCard label="Stock Value" value={formatPKR(ingredientStats.totalValue)} icon={DollarSign} color="emerald" />
            <KpiCard label="Low Stock" value={ingredientStats.lowStock} icon={Activity} color="orange" />
            <KpiCard label="Critical Items" value={ingredientStats.critical} icon={Award} color="rose" />
          </section>

          <div className="rounded-3xl bg-white border border-slate-200 shadow-sm p-8 text-center">
            <Wheat className="h-16 w-16 text-slate-300 mx-auto mb-3" />
            <h3 className="font-extrabold text-slate-700">Ingredient Analytics</h3>
            <p className="text-sm text-slate-500 mt-1">Visit Ingredients page for full inventory tracking</p>
          </div>
        </>
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
                    <span className={`inline-flex h-8 w-8 rounded-lg items-center justify-center font-extrabold text-xs ${idx === 0 ? 'bg-amber-500 text-white' : idx === 1 ? 'bg-slate-400 text-white' : idx === 2 ? 'bg-orange-600 text-white' : 'bg-slate-100 text-slate-500'}`}>
                      {idx < 3 ? <Crown className="h-4 w-4" /> : idx + 1}
                    </span>
                  </td>
                  <td className="px-6 py-3">
                    <div className="flex items-center gap-3">
                      {c.user?.avatarUrl ? <img src={c.user.avatarUrl} alt="" className="h-9 w-9 rounded-xl object-cover" /> : <div className="h-9 w-9 rounded-xl bg-pink-100 text-pink-700 flex items-center justify-center font-bold">{c.user?.fullName?.charAt(0) || '?'}</div>}
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
