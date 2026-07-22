import { useState, useMemo } from 'react';
import { useQuery } from '@tanstack/react-query';
import {
  BarChart3, Gem, Coins, Scale, ShieldCheck, Repeat, Users,
  TrendingUp, Target, Award, Crown, Activity, DollarSign,
  Star, Clock, Package, ArrowRight, Diamond, Palette,
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
import { jewelrySalesApi } from '../api/sales.api';
import { metalRatesApi } from '../api/metal-rates.api';

const TABS = [
  { id: 'overview', label: 'Overview', icon: BarChart3 },
  { id: 'metals', label: 'Metal Analysis', icon: Coins },
  { id: 'purity', label: 'Purity Split', icon: ShieldCheck },
  { id: 'exchanges', label: 'Exchanges', icon: Repeat },
  { id: 'designs', label: 'Top Designs', icon: Package },
  { id: 'staff', label: 'Staff & Karigar', icon: Crown },
];

const METAL_COLORS: Record<string, string> = {
  GOLD: '#d97706', SILVER: '#94a3b8', PLATINUM: '#06b6d4',
  ROSE_GOLD: '#f43f5e', WHITE_GOLD: '#cbd5e1', PALLADIUM: '#64748b',
};

const METAL_ICONS: Record<string, string> = {
  GOLD: '🥇', SILVER: '🥈', PLATINUM: '💠',
  ROSE_GOLD: '🌹', WHITE_GOLD: '⚪', PALLADIUM: '⬜',
};

export default function JewelryReportsV2() {
  const [days, setDays] = useState(30);
  const [tab, setTab] = useState('overview');
  const reports = useReportsData(days);

  const { data: jewelrySales = [] } = useQuery({
    queryKey: ['jewelry-sales-for-reports'],
    queryFn: () => jewelrySalesApi.list({}),
  });

  const { data: rates = [] } = useQuery({
    queryKey: ['metal-rates-current'],
    queryFn: () => metalRatesApi.current(),
  });

  const trendData = reports.trend.map((p) => ({ ...p, label: dayLabel(p.date) }));

  const totalRevenue = reports.trend.reduce((s, p) => s + p.sales, 0);
  const totalProfit = reports.trend.reduce((s, p) => s + p.profit, 0);
  const totalOrders = reports.trend.reduce((s, p) => s + p.orders, 0);
  const aov = totalOrders > 0 ? totalRevenue / totalOrders : 0;

  // Jewelry-specific analytics
  const jewelryMetrics = useMemo(() => {
    const salesList = jewelrySales as any[];
    let totalWeight = 0;
    let hallmarkedSales = 0;
    let exchangeCount = 0;
    let exchangeValue = 0;

    salesList.forEach((s) => {
      (s.items || []).forEach((it: any) => {
        totalWeight += Number(it.netWeight || 0) * Number(it.quantity || 0);
      });
      if (s.hallmarkVerified) hallmarkedSales++;
      if (s.exchangeValue > 0) {
        exchangeCount++;
        exchangeValue += Number(s.exchangeValue || 0);
      }
    });

    return {
      totalWeight,
      hallmarkedSales,
      hallmarkPct: salesList.length > 0 ? (hallmarkedSales / salesList.length) * 100 : 0,
      exchangeCount,
      exchangeValue,
    };
  }, [jewelrySales]);

  const metalBreakdown = useMemo(() => {
    const map = new Map<string, { count: number; weight: number; revenue: number }>();
    (jewelrySales as any[]).forEach((s: any) => {
      (s.items || []).forEach((it: any) => {
        const key = it.metalType || 'OTHER';
        const existing = map.get(key) ?? { count: 0, weight: 0, revenue: 0 };
        existing.count += Number(it.quantity || 1);
        existing.weight += Number(it.netWeight || 0) * Number(it.quantity || 0);
        existing.revenue += (Number(it.netWeight || 0) * Number(it.ratePerGram || 0)) * Number(it.quantity || 0);
        map.set(key, existing);
      });
    });
    return Array.from(map.entries())
      .map(([metal, data]) => ({ metal, ...data, color: METAL_COLORS[metal] || '#64748b' }))
      .sort((a, b) => b.revenue - a.revenue);
  }, [jewelrySales]);

  const purityBreakdown = useMemo(() => {
    const map = new Map<string, number>();
    (jewelrySales as any[]).forEach((s: any) => {
      (s.items || []).forEach((it: any) => {
        const key = `${it.metalType} ${it.purity.replace('KARAT_', '').replace('SILVER_', 'S').replace('PLATINUM_', 'Pt-')}K`;
        map.set(key, (map.get(key) || 0) + (Number(it.netWeight || 0) * Number(it.quantity || 0)));
      });
    });
    return Array.from(map.entries())
      .map(([label, weight]) => ({ label, weight }))
      .sort((a, b) => b.weight - a.weight)
      .slice(0, 10);
  }, [jewelrySales]);

  return (
    <div className="space-y-6">
      <ReportsHero
        gradient="from-slate-950 via-amber-900 to-yellow-700"
        emoji="💎"
        industryLabel="Jewelry"
        title="Jewelry Business Reports"
        subtitle="Metal sales, purity split, hallmark rate, exchange analysis"
        days={days}
        setDays={setDays}
      />

      <TabSwitcher tabs={TABS} active={tab} onChange={setTab} color="orange" />

      {tab === 'overview' && (
        <>
          <section className="grid sm:grid-cols-2 lg:grid-cols-4 gap-4">
            <KpiCard label="Total Revenue" value={formatPKR(totalRevenue)} icon={TrendingUp} color="emerald" isHighlight />
            <KpiCard label="Weight Sold" value={`${jewelryMetrics.totalWeight.toFixed(0)}g`} icon={Scale} color="amber" />
            <KpiCard label="Total Profit" value={formatPKR(totalProfit)} icon={Target} color="violet" />
            <KpiCard label="Avg Order Value" value={formatPKR(aov)} icon={DollarSign} color="orange" />
          </section>

          {reports.profitLoss && (
            <section className="rounded-3xl bg-white border border-slate-200 shadow-sm p-6">
              <div className="flex items-center justify-between mb-5 flex-wrap gap-2">
                <div>
                  <h3 className="text-xl font-bold text-slate-900">Jewelry Shop P&L</h3>
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
                  {jewelryMetrics.exchangeValue > 0 && <PnLLine label="Exchange Credits" value={-jewelryMetrics.exchangeValue} type="negative" />}
                  <PnLLine label="Net Revenue" value={reports.profitLoss.netRevenue} type="bold" />
                  <PnLLine label="Metal Cost (COGS)" value={-reports.profitLoss.cogs} type="negative" />
                  <PnLLine label="Gross Profit" value={reports.profitLoss.grossProfit} type="bold" sub={`${reports.profitLoss.grossMargin.toFixed(1)}% margin`} />
                  <PnLLine label="Operating Expenses" value={-reports.profitLoss.expenses} type="negative" />
                  <PnLLine label="Net Profit" value={reports.profitLoss.netProfit} type="highlight" sub={`${reports.profitLoss.netMargin.toFixed(1)}% margin`} />
                </div>
                <div className="grid grid-cols-2 gap-3">
                  <MiniStat label="Sales" value={reports.profitLoss.orderCount} color="amber" icon={Gem} />
                  <MiniStat label="Weight Sold" value={`${jewelryMetrics.totalWeight.toFixed(0)}g`} color="orange" icon={Scale} />
                  <MiniStat label="Hallmark %" value={`${jewelryMetrics.hallmarkPct.toFixed(0)}%`} color="emerald" icon={ShieldCheck} />
                  <MiniStat label="Exchanges" value={jewelryMetrics.exchangeCount} color="violet" icon={Repeat} />
                  <MiniStat label="Cash Paid" value={formatPKR(reports.profitLoss.paid)} color="emerald" icon={DollarSign} />
                  <MiniStat label="Balance Due" value={formatPKR(reports.profitLoss.credit)} color="rose" icon={Package} />
                </div>
              </div>
            </section>
          )}

          <ChartCard title="Jewelry Sales Trend" subtitle={`${days}-day analysis`} icon={TrendingUp} color="orange">
            <ResponsiveContainer width="100%" height="100%">
              <ComposedChart data={trendData}>
                <defs>
                  <linearGradient id="jrsalesGrad" x1="0" y1="0" x2="0" y2="1">
                    <stop offset="0%" stopColor="#d97706" stopOpacity={0.5} />
                    <stop offset="100%" stopColor="#d97706" stopOpacity={0} />
                  </linearGradient>
                </defs>
                <CartesianGrid strokeDasharray="3 3" stroke="#e2e8f0" />
                <XAxis dataKey="label" stroke="#64748b" fontSize={11} />
                <YAxis yAxisId="left" stroke="#64748b" fontSize={11} tickFormatter={(v) => `${(v / 1000).toFixed(0)}k`} />
                <YAxis yAxisId="right" orientation="right" stroke="#64748b" fontSize={11} />
                <Tooltip formatter={(value: any, name: any) => name === 'Orders' ? value : formatPKR(Number(value))} contentStyle={{ borderRadius: 12 }} />
                <Legend wrapperStyle={{ fontSize: 12 }} />
                <Area yAxisId="left" type="monotone" dataKey="sales" name="Sales" fill="url(#jrsalesGrad)" stroke="#d97706" strokeWidth={2.5} />
                <Bar yAxisId="left" dataKey="profit" name="Profit" fill="#8b5cf6" radius={[4, 4, 0, 0]} barSize={20} />
                <Line yAxisId="right" type="monotone" dataKey="orders" name="Orders" stroke="#10b981" strokeWidth={2.5} dot={{ r: 4 }} />
              </ComposedChart>
            </ResponsiveContainer>
          </ChartCard>
        </>
      )}

      {tab === 'metals' && (
        <>
          <ChartCard title="Metal Type Revenue" subtitle="Revenue split by metal" icon={Coins} color="orange">
            {metalBreakdown.length > 0 ? (
              <ResponsiveContainer width="100%" height="100%">
                <PieChart>
                  <Pie
                    data={metalBreakdown}
                    dataKey="revenue"
                    nameKey="metal"
                    cx="50%" cy="50%"
                    outerRadius={100} innerRadius={50}
                    paddingAngle={2}
                    label={(entry: any) => {
                      const total = metalBreakdown.reduce((s, m) => s + m.revenue, 0);
                      const pct = total > 0 ? ((entry.revenue / total) * 100).toFixed(0) : '0';
                      return `${pct}%`;
                    }}
                    labelLine={false}
                  >
                    {metalBreakdown.map((m) => <Cell key={m.metal} fill={m.color} />)}
                  </Pie>
                  <Tooltip formatter={(value: any) => formatPKR(Number(value))} contentStyle={{ borderRadius: 12 }} />
                  <Legend wrapperStyle={{ fontSize: 11, paddingTop: 12 }} iconType="circle" />
                </PieChart>
              </ResponsiveContainer>
            ) : <EmptyChart message="No metal sales data yet" />}
          </ChartCard>

          <section className="grid sm:grid-cols-2 lg:grid-cols-3 gap-3">
            {metalBreakdown.map((m) => (
              <div key={m.metal} className="rounded-2xl border-2 p-4 bg-white" style={{ borderColor: m.color + '60' }}>
                <div className="flex items-center gap-2 mb-2">
                  <div className="text-2xl">{METAL_ICONS[m.metal]}</div>
                  <div className="text-[10px] uppercase font-extrabold" style={{ color: m.color }}>{m.metal.replace('_', ' ')}</div>
                </div>
                <div className="grid grid-cols-3 gap-2">
                  <div>
                    <div className="text-[9px] uppercase text-slate-500">Sales</div>
                    <div className="text-lg font-extrabold text-slate-900 tabular-nums">{m.count}</div>
                  </div>
                  <div>
                    <div className="text-[9px] uppercase text-slate-500">Weight</div>
                    <div className="text-lg font-extrabold text-slate-900 tabular-nums">{m.weight.toFixed(0)}g</div>
                  </div>
                  <div>
                    <div className="text-[9px] uppercase text-slate-500">Revenue</div>
                    <div className="text-xs font-extrabold text-emerald-700 tabular-nums">{formatPKR(m.revenue)}</div>
                  </div>
                </div>
              </div>
            ))}
          </section>

          {/* Live rates card */}
          {rates.length > 0 && (
            <section className="rounded-3xl bg-gradient-to-br from-amber-50 to-yellow-50 border-2 border-amber-300 p-5 shadow-sm">
              <div className="flex items-center gap-2 mb-3">
                <Coins className="h-5 w-5 text-amber-700" />
                <h3 className="font-extrabold text-amber-900">Current Metal Rates</h3>
              </div>
              <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-6 gap-2">
                {(rates as any[]).map((r: any) => (
                  <div key={r.id} className="rounded-xl bg-white border border-amber-200 p-2">
                    <div className="text-lg">{METAL_ICONS[r.metalType]}</div>
                    <div className="text-[9px] font-extrabold uppercase text-slate-600">
                      {r.metalType.replace('_', ' ')} {r.purity.replace('KARAT_', '').replace('SILVER_', 'S')}K
                    </div>
                    <div className="text-sm font-extrabold text-amber-700 tabular-nums">Rs {r.ratePerGram.toLocaleString()}/g</div>
                  </div>
                ))}
              </div>
            </section>
          )}
        </>
      )}

      {tab === 'purity' && (
        <>
          <ChartCard title="Purity Distribution by Weight" subtitle="Which purity sells most?" icon={ShieldCheck} color="orange">
            {purityBreakdown.length > 0 ? (
              <ResponsiveContainer width="100%" height="100%">
                <BarChart data={purityBreakdown} layout="vertical">
                  <CartesianGrid strokeDasharray="3 3" stroke="#e2e8f0" />
                  <XAxis type="number" stroke="#64748b" fontSize={10} tickFormatter={(v) => `${v.toFixed(0)}g`} />
                  <YAxis type="category" dataKey="label" stroke="#64748b" fontSize={10} width={140} />
                  <Tooltip formatter={(value: any) => `${Number(value).toFixed(2)}g`} contentStyle={{ borderRadius: 12 }} />
                  <Bar dataKey="weight" fill="#d97706" radius={[0, 6, 6, 0]} />
                </BarChart>
              </ResponsiveContainer>
            ) : <EmptyChart message="No purity data yet" />}
          </ChartCard>

          <section className="grid sm:grid-cols-3 gap-4">
            <KpiCard label="Hallmark %" value={`${jewelryMetrics.hallmarkPct.toFixed(0)}%`} icon={ShieldCheck} color="emerald" isHighlight />
            <KpiCard label="Certified Sales" value={jewelryMetrics.hallmarkedSales} icon={Award} color="blue" />
            <KpiCard label="Total Weight" value={`${jewelryMetrics.totalWeight.toFixed(2)}g`} icon={Scale} color="amber" />
          </section>
        </>
      )}

      {tab === 'exchanges' && (
        <>
          <section className="grid sm:grid-cols-3 gap-4">
            <KpiCard label="Total Exchanges" value={jewelryMetrics.exchangeCount} icon={Repeat} color="violet" isHighlight />
            <KpiCard label="Exchange Value" value={formatPKR(jewelryMetrics.exchangeValue)} icon={DollarSign} color="emerald" />
            <KpiCard label="Avg Exchange" value={jewelryMetrics.exchangeCount > 0 ? formatPKR(jewelryMetrics.exchangeValue / jewelryMetrics.exchangeCount) : formatPKR(0)} icon={Target} color="amber" />
          </section>

          <section className="rounded-3xl bg-white border border-slate-200 shadow-sm overflow-hidden">
            <div className="px-6 py-5 border-b border-slate-100">
              <h3 className="text-xl font-bold text-slate-900">Recent Exchanges</h3>
              <p className="text-sm text-slate-500">Old gold trade-ins</p>
            </div>
            {(jewelrySales as any[]).filter((s) => s.exchangeValue > 0).length === 0 ? (
              <EmptyChart message="No exchanges recorded" />
            ) : (
              <div className="divide-y divide-slate-100 max-h-[400px] overflow-y-auto">
                {(jewelrySales as any[]).filter((s) => s.exchangeValue > 0).slice(0, 20).map((sale: any) => (
                  <div key={sale.id} className="px-6 py-3 flex items-center justify-between gap-3 hover:bg-slate-50">
                    <div className="flex items-center gap-3 min-w-0">
                      <div className="h-10 w-10 rounded-xl bg-violet-100 text-violet-700 flex items-center justify-center shrink-0">
                        <Repeat className="h-5 w-5" />
                      </div>
                      <div className="min-w-0">
                        <div className="font-mono font-extrabold text-slate-900 text-sm">{sale.invoiceNumber}</div>
                        <div className="text-xs text-slate-500">
                          {sale.customerName || 'Walk-in'}
                          {sale.exchangeMetalGrams > 0 && ` • ${Number(sale.exchangeMetalGrams).toFixed(2)}g ${sale.exchangeMetalPurity || ''}`}
                        </div>
                      </div>
                    </div>
                    <div className="text-right shrink-0">
                      <div className="font-extrabold text-violet-700 tabular-nums">{formatPKR(sale.exchangeValue)}</div>
                      <div className="text-[10px] text-slate-500">exchange value</div>
                    </div>
                  </div>
                ))}
              </div>
            )}
          </section>
        </>
      )}

      {tab === 'designs' && (
        <section className="rounded-3xl bg-white border border-slate-200 shadow-sm overflow-hidden">
          <div className="px-6 py-5 border-b border-slate-100">
            <h3 className="text-xl font-bold text-slate-900">Top Selling Designs</h3>
            <p className="text-sm text-slate-500">Best sellers with profit</p>
          </div>
          <div className="overflow-x-auto">
            <table className="w-full text-sm">
              <thead className="bg-slate-50 text-slate-600">
                <tr>
                  <th className="text-center px-3 py-3 font-bold text-[10px] uppercase w-12">#</th>
                  <th className="text-left px-3 py-3 font-bold text-[10px] uppercase">Design</th>
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
                        <div className="h-10 w-10 rounded-lg bg-amber-100 overflow-hidden flex items-center justify-center">
                          {p.product?.images?.[0]?.url ? (
                            <img src={p.product.images[0].url} alt="" className="h-full w-full object-cover" />
                          ) : (
                            <Gem className="h-4 w-4 text-amber-400" />
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
            <p className="text-sm text-slate-500">Sales staff & karigars</p>
          </div>
          <table className="w-full text-sm">
            <thead className="bg-slate-50 text-slate-600">
              <tr>
                <th className="text-center px-6 py-3 font-bold text-xs uppercase w-16">Rank</th>
                <th className="text-left px-6 py-3 font-bold text-xs uppercase">Staff</th>
                <th className="text-right px-6 py-3 font-bold text-xs uppercase">Sales</th>
                <th className="text-right px-6 py-3 font-bold text-xs uppercase">Revenue</th>
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
