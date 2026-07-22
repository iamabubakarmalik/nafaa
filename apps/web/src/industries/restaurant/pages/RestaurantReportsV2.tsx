import { useState, useMemo } from 'react';
import { useQuery } from '@tanstack/react-query';
import { Link } from 'react-router-dom';
import {
  BarChart3, TrendingUp, ChefHat, Utensils, Bike, ShoppingBag as Takeaway,
  Car, Home, Timer, Award, Users, Star, Clock, DollarSign,
  Target, Package, Crown, Activity, Sparkles, ArrowRight,
  CreditCard, Banknote, Smartphone, Building2, Zap, Flame,
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
import { ordersApi } from '../api/orders.api';
import { kotApi } from '../api/kot.api';
import { tablesApi } from '../api/tables.api';

const TABS = [
  { id: 'overview', label: 'Overview', icon: BarChart3 },
  { id: 'kitchen', label: 'Kitchen & KOT', icon: Timer },
  { id: 'tables', label: 'Tables', icon: Utensils },
  { id: 'modes', label: 'Order Modes', icon: ChefHat },
  { id: 'menu', label: 'Menu Items', icon: Package },
  { id: 'staff', label: 'Staff', icon: Crown },
];

const MODE_ICONS: Record<string, any> = {
  DINE_IN: Utensils, TAKEAWAY: Takeaway, DELIVERY: Bike,
  DRIVE_THRU: Car, ROOM_SERVICE: Home,
};
const MODE_COLORS: Record<string, string> = {
  DINE_IN: '#10b981', TAKEAWAY: '#3b82f6', DELIVERY: '#8b5cf6',
  DRIVE_THRU: '#f59e0b', ROOM_SERVICE: '#ec4899',
};

export default function RestaurantReportsV2() {
  const [days, setDays] = useState(14);
  const [tab, setTab] = useState('overview');
  const reports = useReportsData(days);

  const { data: allOrders = [] } = useQuery({
    queryKey: ['restaurant-orders-reports'],
    queryFn: () => ordersApi.list({}),
  });

  const { data: allKots = [] } = useQuery({
    queryKey: ['kot-reports'],
    queryFn: () => kotApi.list({}),
  });

  const { data: tables = [] } = useQuery({
    queryKey: ['restaurant-tables-reports'],
    queryFn: () => tablesApi.list(),
  });

  // ─── Restaurant-specific analytics ───
  const modeBreakdown = useMemo(() => {
    const modes = ['DINE_IN', 'TAKEAWAY', 'DELIVERY', 'DRIVE_THRU', 'ROOM_SERVICE'];
    return modes.map((mode) => {
      const modeOrders = allOrders.filter((o: any) => o.mode === mode);
      const revenue = modeOrders.reduce((s: number, o: any) => s + Number(o.total || 0), 0);
      return {
        mode,
        label: mode.replace('_', ' '),
        count: modeOrders.length,
        revenue,
        avgOrderValue: modeOrders.length > 0 ? revenue / modeOrders.length : 0,
        color: MODE_COLORS[mode],
      };
    }).filter((m) => m.count > 0);
  }, [allOrders]);

  const tableStats = useMemo(() => {
    const totalTables = tables.length;
    const orderedTables = new Set(allOrders.filter((o: any) => o.tableId).map((o: any) => o.tableId));
    const tableRevenue: Record<string, { count: number; revenue: number; tableNumber: string }> = {};

    allOrders.forEach((o: any) => {
      if (!o.tableId || !o.table) return;
      if (!tableRevenue[o.tableId]) {
        tableRevenue[o.tableId] = { count: 0, revenue: 0, tableNumber: o.table.tableNumber };
      }
      tableRevenue[o.tableId].count += 1;
      tableRevenue[o.tableId].revenue += Number(o.total || 0);
    });

    const topTables = Object.entries(tableRevenue)
      .map(([id, data]) => ({ id, ...data }))
      .sort((a, b) => b.revenue - a.revenue)
      .slice(0, 10);

    return {
      totalTables,
      usedTables: orderedTables.size,
      utilizationPct: totalTables > 0 ? (orderedTables.size / totalTables) * 100 : 0,
      topTables,
    };
  }, [allOrders, tables]);

  const kotStats = useMemo(() => {
    const completed = allKots.filter((k: any) => ['SERVED', 'READY'].includes(k.status));
    const cooking = allKots.filter((k: any) => k.status === 'COOKING').length;
    const pending = allKots.filter((k: any) => ['PENDING', 'PRINTED', 'ACKNOWLEDGED'].includes(k.status)).length;
    const cancelled = allKots.filter((k: any) => k.status === 'CANCELLED').length;

    // Calculate avg cook time
    const withTimes = completed.filter((k: any) => k.cookingStartedAt && k.readyAt);
    const avgCookMin = withTimes.length > 0
      ? withTimes.reduce((s: number, k: any) => {
          const start = new Date(k.cookingStartedAt).getTime();
          const end = new Date(k.readyAt).getTime();
          return s + (end - start) / 60000;
        }, 0) / withTimes.length
      : 0;

    return {
      total: allKots.length,
      completed: completed.length,
      cooking,
      pending,
      cancelled,
      avgCookMin,
    };
  }, [allKots]);

  const trendData = reports.trend.map((p) => ({ ...p, label: dayLabel(p.date) }));

  const totalRevenue = reports.trend.reduce((s, p) => s + p.sales, 0);
  const totalProfit = reports.trend.reduce((s, p) => s + p.profit, 0);
  const totalOrders = reports.trend.reduce((s, p) => s + p.orders, 0);
  const aov = totalOrders > 0 ? totalRevenue / totalOrders : 0;

  return (
    <div className="space-y-6">
      <ReportsHero
        gradient="from-slate-950 via-orange-900 to-red-700"
        emoji="🍽️"
        industryLabel="Restaurant"
        title="Restaurant Reports"
        subtitle="Kitchen performance, table turnover, order modes — sab kuch"
        days={days}
        setDays={setDays}
      />

      <TabSwitcher tabs={TABS} active={tab} onChange={setTab} color="orange" />

      {/* ═══ OVERVIEW TAB ═══ */}
      {tab === 'overview' && (
        <>
          <section className="grid sm:grid-cols-2 lg:grid-cols-4 gap-4">
            <KpiCard label="Total Revenue" value={formatPKR(totalRevenue)} icon={TrendingUp} color="emerald" />
            <KpiCard label="Total Profit" value={formatPKR(totalProfit)} icon={Target} color="violet" isHighlight />
            <KpiCard label="Total Orders" value={String(totalOrders)} icon={ChefHat} color="orange" />
            <KpiCard label="Avg Order Value" value={formatPKR(aov)} icon={DollarSign} color="amber" />
          </section>

          {reports.profitLoss && (
            <section className="rounded-3xl bg-white border border-slate-200 shadow-sm p-6">
              <div className="flex items-center justify-between mb-5 flex-wrap gap-2">
                <div>
                  <h3 className="text-xl font-bold text-slate-900">Restaurant P&L</h3>
                  <p className="text-sm text-slate-500">{days} days complete breakdown</p>
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
                  <PnLLine label="Food Cost (COGS)" value={-reports.profitLoss.cogs} type="negative" />
                  <PnLLine label="Gross Profit" value={reports.profitLoss.grossProfit} type="bold" sub={`${reports.profitLoss.grossMargin.toFixed(1)}% margin`} />
                  <PnLLine label="Operating Expenses" value={-reports.profitLoss.expenses} type="negative" />
                  <PnLLine label="Net Profit" value={reports.profitLoss.netProfit} type="highlight" sub={`${reports.profitLoss.netMargin.toFixed(1)}% margin`} />
                </div>
                <div className="grid grid-cols-2 gap-3">
                  <MiniStat label="Orders" value={reports.profitLoss.orderCount} color="blue" icon={ChefHat} />
                  <MiniStat label="KOTs" value={kotStats.total} color="orange" icon={Timer} />
                  <MiniStat label="Cash Paid" value={formatPKR(reports.profitLoss.paid)} color="emerald" icon={CreditCard} />
                  <MiniStat label="Udhaar" value={formatPKR(reports.profitLoss.credit)} color="amber" icon={DollarSign} />
                  <MiniStat label="Avg Cook Time" value={`${kotStats.avgCookMin.toFixed(0)}m`} color="rose" icon={Flame} />
                  <MiniStat label="Discount" value={formatPKR(reports.profitLoss.discount)} color="pink" icon={Star} />
                </div>
              </div>
            </section>
          )}

          <ChartCard title="Revenue, Profit & Orders" subtitle={`${days}-day composed trend`} icon={Activity} color="orange">
            <ResponsiveContainer width="100%" height="100%">
              <ComposedChart data={trendData}>
                <defs>
                  <linearGradient id="rsalesGrad" x1="0" y1="0" x2="0" y2="1">
                    <stop offset="0%" stopColor="#f97316" stopOpacity={0.5} />
                    <stop offset="100%" stopColor="#f97316" stopOpacity={0} />
                  </linearGradient>
                </defs>
                <CartesianGrid strokeDasharray="3 3" stroke="#e2e8f0" />
                <XAxis dataKey="label" stroke="#64748b" fontSize={11} />
                <YAxis yAxisId="left" stroke="#64748b" fontSize={11} tickFormatter={(v) => `${(v / 1000).toFixed(0)}k`} />
                <YAxis yAxisId="right" orientation="right" stroke="#64748b" fontSize={11} />
                <Tooltip formatter={(value: any, name: any) => name === 'Orders' ? value : formatPKR(Number(value))} contentStyle={{ borderRadius: 12 }} />
                <Legend wrapperStyle={{ fontSize: 12 }} />
                <Area yAxisId="left" type="monotone" dataKey="sales" name="Sales" fill="url(#rsalesGrad)" stroke="#f97316" strokeWidth={2.5} />
                <Bar yAxisId="left" dataKey="profit" name="Profit" fill="#8b5cf6" radius={[4, 4, 0, 0]} barSize={20} />
                <Line yAxisId="right" type="monotone" dataKey="orders" name="Orders" stroke="#10b981" strokeWidth={2.5} dot={{ r: 4 }} />
              </ComposedChart>
            </ResponsiveContainer>
          </ChartCard>
        </>
      )}

      {/* ═══ KITCHEN & KOT TAB ═══ */}
      {tab === 'kitchen' && (
        <>
          <section className="grid sm:grid-cols-2 lg:grid-cols-4 gap-4">
            <KpiCard label="Total KOTs" value={kotStats.total} icon={Timer} color="orange" />
            <KpiCard label="Completed" value={kotStats.completed} icon={Award} color="emerald" />
            <KpiCard label="Avg Cook Time" value={`${kotStats.avgCookMin.toFixed(0)} min`} icon={Flame} color="rose" isHighlight />
            <KpiCard label="Cancelled" value={kotStats.cancelled} icon={Activity} color="pink" />
          </section>

          <section className="rounded-3xl bg-white border border-slate-200 shadow-sm p-6">
            <div className="flex items-center justify-between mb-5">
              <div>
                <h3 className="text-xl font-bold text-slate-900">Kitchen Performance</h3>
                <p className="text-sm text-slate-500">KOT status breakdown</p>
              </div>
            </div>
            <div className="grid sm:grid-cols-2 gap-6">
              <div>
                <ResponsiveContainer width="100%" height={250}>
                  <PieChart>
                    <Pie
                      data={[
                        { name: 'Completed', value: kotStats.completed, color: '#10b981' },
                        { name: 'Cooking', value: kotStats.cooking, color: '#f59e0b' },
                        { name: 'Pending', value: kotStats.pending, color: '#3b82f6' },
                        { name: 'Cancelled', value: kotStats.cancelled, color: '#ef4444' },
                      ].filter((d) => d.value > 0)}
                      cx="50%" cy="50%" outerRadius={100} innerRadius={50}
                      dataKey="value"
                      label={(entry: any) => `${entry.value}`}
                    >
                      {['#10b981', '#f59e0b', '#3b82f6', '#ef4444'].map((c, i) => <Cell key={i} fill={c} />)}
                    </Pie>
                    <Tooltip contentStyle={{ borderRadius: 12 }} />
                    <Legend wrapperStyle={{ fontSize: 11 }} iconType="circle" />
                  </PieChart>
                </ResponsiveContainer>
              </div>
              <div className="space-y-2">
                <MiniStat label="Completed KOTs" value={kotStats.completed} color="emerald" icon={Award} />
                <MiniStat label="In Cooking" value={kotStats.cooking} color="amber" icon={Flame} />
                <MiniStat label="Pending" value={kotStats.pending} color="blue" icon={Clock} />
                <MiniStat label="Cancelled" value={kotStats.cancelled} color="rose" icon={Activity} />
              </div>
            </div>
          </section>
        </>
      )}

      {/* ═══ TABLES TAB ═══ */}
      {tab === 'tables' && (
        <>
          <section className="grid sm:grid-cols-3 gap-4">
            <KpiCard label="Total Tables" value={tableStats.totalTables} icon={Utensils} color="emerald" />
            <KpiCard label="Used Tables" value={tableStats.usedTables} icon={Users} color="orange" />
            <KpiCard label="Utilization" value={`${tableStats.utilizationPct.toFixed(1)}%`} icon={Target} color="violet" isHighlight />
          </section>

          <section className="rounded-3xl bg-white border border-slate-200 shadow-sm overflow-hidden">
            <div className="px-6 py-5 border-b border-slate-100">
              <h3 className="text-xl font-bold text-slate-900">Top Performing Tables</h3>
              <p className="text-sm text-slate-500">Revenue leaders</p>
            </div>
            {tableStats.topTables.length === 0 ? (
              <EmptyChart message="No table data yet" />
            ) : (
              <div className="overflow-x-auto">
                <table className="w-full text-sm">
                  <thead className="bg-slate-50 text-slate-600">
                    <tr>
                      <th className="text-center px-3 py-3 font-bold text-[10px] uppercase w-12">Rank</th>
                      <th className="text-left px-3 py-3 font-bold text-[10px] uppercase">Table</th>
                      <th className="text-right px-3 py-3 font-bold text-[10px] uppercase">Orders</th>
                      <th className="text-right px-3 py-3 font-bold text-[10px] uppercase">Revenue</th>
                      <th className="text-right px-3 py-3 font-bold text-[10px] uppercase">Avg Bill</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-slate-100">
                    {tableStats.topTables.map((t, idx) => (
                      <tr key={t.id} className="hover:bg-slate-50">
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
                          <div className="flex items-center gap-2">
                            <div className="h-10 w-10 rounded-xl bg-orange-100 text-orange-700 flex items-center justify-center font-extrabold">
                              {t.tableNumber}
                            </div>
                            <div className="font-bold text-slate-900">Table {t.tableNumber}</div>
                          </div>
                        </td>
                        <td className="px-3 py-3 text-right font-bold">{t.count}</td>
                        <td className="px-3 py-3 text-right font-extrabold text-emerald-700 tabular-nums">{formatPKR(t.revenue)}</td>
                        <td className="px-3 py-3 text-right text-slate-700 tabular-nums">{formatPKR(t.revenue / t.count)}</td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            )}
          </section>
        </>
      )}

      {/* ═══ MODES TAB ═══ */}
      {tab === 'modes' && (
        <>
          <ChartCard title="Order Mode Distribution" subtitle="Revenue by dine-in/takeaway/delivery" icon={ChefHat} color="orange">
            {modeBreakdown.length > 0 ? (
              <ResponsiveContainer width="100%" height="100%">
                <PieChart>
                  <Pie
                    data={modeBreakdown}
                    dataKey="revenue"
                    nameKey="label"
                    cx="50%" cy="50%"
                    outerRadius={100} innerRadius={50}
                    paddingAngle={2}
                    label={(entry: any) => {
                      const total = modeBreakdown.reduce((s, m) => s + m.revenue, 0);
                      const pct = total > 0 ? ((entry.revenue / total) * 100).toFixed(0) : '0';
                      return `${pct}%`;
                    }}
                    labelLine={false}
                  >
                    {modeBreakdown.map((m) => <Cell key={m.mode} fill={m.color} />)}
                  </Pie>
                  <Tooltip formatter={(value: any) => formatPKR(Number(value))} contentStyle={{ borderRadius: 12 }} />
                  <Legend wrapperStyle={{ fontSize: 11, paddingTop: 12 }} iconType="circle" />
                </PieChart>
              </ResponsiveContainer>
            ) : <EmptyChart message="No mode data" />}
          </ChartCard>

          <section className="grid sm:grid-cols-2 lg:grid-cols-5 gap-3">
            {modeBreakdown.map((m) => {
              const Icon = MODE_ICONS[m.mode];
              return (
                <div key={m.mode} className="rounded-2xl border-2 p-4 bg-white" style={{ borderColor: m.color + '60' }}>
                  <div className="flex items-center gap-2 mb-2">
                    <div className="h-9 w-9 rounded-lg text-white flex items-center justify-center" style={{ backgroundColor: m.color }}>
                      <Icon className="h-4 w-4" />
                    </div>
                    <div className="text-[10px] uppercase font-extrabold" style={{ color: m.color }}>{m.label}</div>
                  </div>
                  <div className="text-2xl font-extrabold text-slate-900 tabular-nums">{m.count}</div>
                  <div className="text-xs text-slate-500 font-bold">{formatPKR(m.revenue)}</div>
                  <div className="text-[10px] text-slate-500 font-bold mt-1">AOV {formatPKR(m.avgOrderValue)}</div>
                </div>
              );
            })}
          </section>
        </>
      )}

      {/* ═══ MENU ITEMS TAB ═══ */}
      {tab === 'menu' && (
        <section className="rounded-3xl bg-white border border-slate-200 shadow-sm overflow-hidden">
          <div className="px-6 py-5 border-b border-slate-100">
            <h3 className="text-xl font-bold text-slate-900">Best Selling Menu Items</h3>
            <p className="text-sm text-slate-500">Top dishes with profit analysis</p>
          </div>
          <div className="overflow-x-auto">
            <table className="w-full text-sm">
              <thead className="bg-slate-50 text-slate-600">
                <tr>
                  <th className="text-center px-3 py-3 font-bold text-[10px] uppercase w-12">#</th>
                  <th className="text-left px-3 py-3 font-bold text-[10px] uppercase">Menu Item</th>
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
                        <div className="h-10 w-10 rounded-lg bg-orange-100 overflow-hidden flex items-center justify-center">
                          {p.product?.images?.[0]?.url ? (
                            <img src={p.product.images[0].url} alt="" className="h-full w-full object-cover" />
                          ) : (
                            <ChefHat className="h-4 w-4 text-orange-400" />
                          )}
                        </div>
                        <div className="font-bold text-slate-900">{p.product?.name || 'Unknown'}</div>
                      </div>
                    </td>
                    <td className="px-3 py-3 text-right font-bold">{p.quantitySold} {p.product?.unit}</td>
                    <td className="px-3 py-3 text-right text-slate-700">{p.orderCount}</td>
                    <td className="px-3 py-3 text-right font-extrabold text-emerald-700 tabular-nums">{formatPKR(p.revenue)}</td>
                    <td className="px-3 py-3 text-right font-extrabold text-violet-700 tabular-nums">{formatPKR(p.profit)}</td>
                    <td className="px-3 py-3 text-center">
                      <span className={`inline-flex px-2 py-0.5 rounded-full text-xs font-extrabold ${
                        p.margin > 40 ? 'bg-emerald-100 text-emerald-700' :
                        p.margin > 20 ? 'bg-amber-100 text-amber-700' :
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

      {/* ═══ STAFF TAB ═══ */}
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
                        <div className="h-9 w-9 rounded-xl bg-orange-100 text-orange-700 flex items-center justify-center font-bold">
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
