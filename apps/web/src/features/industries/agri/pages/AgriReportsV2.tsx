import { useState, useMemo } from 'react';
import { useQuery } from '@tanstack/react-query';
import {
  BarChart3, Wheat, Sprout, Leaf, Package, Tractor,
  TrendingUp, Target, Award, Users, Crown, Activity,
  DollarSign, Calendar, FlaskConical, Bug, Beef,
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
import { agriProductsApi } from '../api/products.api';
import { farmersApi } from '../api/farmers.api';

const TABS = [
  { id: 'overview', label: 'Overview', icon: BarChart3 },
  { id: 'categories', label: 'Categories', icon: Package },
  { id: 'seasons', label: 'Seasons', icon: Calendar },
  { id: 'farmers', label: 'Farmers', icon: Tractor },
  { id: 'products', label: 'Top Products', icon: Wheat },
];

const CATEGORY_COLORS: Record<string, string> = {
  SEEDS: '#22c55e', FERTILIZER: '#3b82f6', PESTICIDE: '#ef4444',
  HERBICIDE: '#84cc16', FUNGICIDE: '#f59e0b', INSECTICIDE: '#ec4899',
  ANIMAL_FEED: '#8b5cf6', POULTRY_FEED: '#f97316', CATTLE_FEED: '#ec4899',
  FISH_FEED: '#06b6d4', VETERINARY_MEDICINE: '#14b8a6',
  ORGANIC_INPUT: '#10b981', OTHER: '#94a3b8',
};

export default function AgriReportsV2() {
  const [days, setDays] = useState(30);
  const [tab, setTab] = useState('overview');
  const reports = useReportsData(days);

  const { data: agriProfiles = [] } = useQuery({
    queryKey: ['agri-products-reports'],
    queryFn: () => agriProductsApi.list({}),
  });

  const { data: farmers = [] } = useQuery({
    queryKey: ['farmers-reports'],
    queryFn: () => farmersApi.list({}),
  });

  const trendData = reports.trend.map((p) => ({ ...p, label: dayLabel(p.date) }));
  const totalRevenue = reports.trend.reduce((s, p) => s + p.sales, 0);
  const totalProfit = reports.trend.reduce((s, p) => s + p.profit, 0);
  const totalOrders = reports.trend.reduce((s, p) => s + p.orders, 0);
  const aov = totalOrders > 0 ? totalRevenue / totalOrders : 0;

  const categoryData = useMemo(() => {
    const counts: Record<string, number> = {};
    agriProfiles.forEach((p: any) => {
      const cat = p.category || 'OTHER';
      counts[cat] = (counts[cat] || 0) + 1;
    });
    return Object.entries(counts)
      .map(([cat, count]) => ({
        category: cat.replace(/_/g, ' '),
        count,
        color: CATEGORY_COLORS[cat] || '#64748b',
      }))
      .sort((a, b) => b.count - a.count);
  }, [agriProfiles]);

  const organicCount = agriProfiles.filter((p: any) => p.isOrganic).length;
  const restrictedCount = agriProfiles.filter((p: any) => p.isRestricted).length;

  return (
    <div className="space-y-6">
      <ReportsHero
        gradient="from-slate-950 via-lime-900 to-green-800"
        emoji="🌾"
        industryLabel="Agri"
        title="Agri Business Reports"
        subtitle="Categories, seasons, farmers, product performance"
        days={days}
        setDays={setDays}
      />

      <TabSwitcher tabs={TABS} active={tab} onChange={setTab} color="emerald" />

      {tab === 'overview' && (
        <>
          <section className="grid sm:grid-cols-2 lg:grid-cols-4 gap-4">
            <KpiCard label="Total Revenue" value={formatPKR(totalRevenue)} icon={TrendingUp} color="emerald" isHighlight />
            <KpiCard label="Total Profit" value={formatPKR(totalProfit)} icon={Target} color="violet" />
            <KpiCard label="Total Orders" value={String(totalOrders)} icon={Wheat} color="amber" />
            <KpiCard label="Avg Order Value" value={formatPKR(aov)} icon={DollarSign} color="cyan" />
          </section>

          {reports.profitLoss && (
            <section className="rounded-3xl bg-white border border-slate-200 shadow-sm p-6">
              <div className="flex items-center justify-between mb-5 flex-wrap gap-2">
                <div>
                  <h3 className="text-xl font-bold text-slate-900">Agri Business P&L</h3>
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
                  <PnLLine label="Purchase Cost (COGS)" value={-reports.profitLoss.cogs} type="negative" />
                  <PnLLine label="Gross Profit" value={reports.profitLoss.grossProfit} type="bold" sub={`${reports.profitLoss.grossMargin.toFixed(1)}%`} />
                  <PnLLine label="Operating Expenses" value={-reports.profitLoss.expenses} type="negative" />
                  <PnLLine label="Net Profit" value={reports.profitLoss.netProfit} type="highlight" sub={`${reports.profitLoss.netMargin.toFixed(1)}%`} />
                </div>
                <div className="grid grid-cols-2 gap-3">
                  <MiniStat label="Orders" value={reports.profitLoss.orderCount} color="emerald" icon={Wheat} />
                  <MiniStat label="Registered Farmers" value={farmers.length} color="violet" icon={Tractor} />
                  <MiniStat label="Cash Paid" value={formatPKR(reports.profitLoss.paid)} color="emerald" icon={DollarSign} />
                  <MiniStat label="Udhaar" value={formatPKR(reports.profitLoss.credit)} color="amber" icon={Package} />
                  <MiniStat label="Organic Products" value={organicCount} color="emerald" icon={Leaf} />
                  <MiniStat label="Restricted" value={restrictedCount} color="rose" icon={Activity} />
                </div>
              </div>
            </section>
          )}

          <ChartCard title="Agri Sales Trend" subtitle={`${days}-day analysis`} icon={TrendingUp} color="emerald">
            <ResponsiveContainer width="100%" height="100%">
              <ComposedChart data={trendData}>
                <defs>
                  <linearGradient id="agsalesGrad" x1="0" y1="0" x2="0" y2="1">
                    <stop offset="0%" stopColor="#65a30d" stopOpacity={0.5} />
                    <stop offset="100%" stopColor="#65a30d" stopOpacity={0} />
                  </linearGradient>
                </defs>
                <CartesianGrid strokeDasharray="3 3" stroke="#e2e8f0" />
                <XAxis dataKey="label" stroke="#64748b" fontSize={11} />
                <YAxis yAxisId="left" stroke="#64748b" fontSize={11} tickFormatter={(v) => `${(v / 1000).toFixed(0)}k`} />
                <YAxis yAxisId="right" orientation="right" stroke="#64748b" fontSize={11} />
                <Tooltip formatter={(value: any, name: any) => name === 'Orders' ? value : formatPKR(Number(value))} contentStyle={{ borderRadius: 12 }} />
                <Legend wrapperStyle={{ fontSize: 12 }} />
                <Area yAxisId="left" type="monotone" dataKey="sales" name="Sales" fill="url(#agsalesGrad)" stroke="#65a30d" strokeWidth={2.5} />
                <Bar yAxisId="left" dataKey="profit" name="Profit" fill="#10b981" radius={[4, 4, 0, 0]} barSize={20} />
                <Line yAxisId="right" type="monotone" dataKey="orders" name="Orders" stroke="#f59e0b" strokeWidth={2.5} dot={{ r: 4 }} />
              </ComposedChart>
            </ResponsiveContainer>
          </ChartCard>
        </>
      )}

      {tab === 'categories' && (
        <>
          <section className="grid sm:grid-cols-4 gap-4">
            <KpiCard label="Total Categories" value={categoryData.length} icon={Package} color="emerald" />
            <KpiCard label="Organic Products" value={organicCount} icon={Leaf} color="emerald" isHighlight />
            <KpiCard label="Restricted Items" value={restrictedCount} icon={Activity} color="rose" />
            <KpiCard label="Total Agri Items" value={agriProfiles.length} icon={Wheat} color="amber" />
          </section>

          <section className="grid lg:grid-cols-2 gap-6">
            <ChartCard title="Category Distribution" subtitle="By product count" icon={Package} color="emerald">
              {categoryData.length > 0 ? (
                <ResponsiveContainer width="100%" height="100%">
                  <PieChart>
                    <Pie
                      data={categoryData}
                      dataKey="count"
                      nameKey="category"
                      cx="50%" cy="50%"
                      outerRadius={100} innerRadius={50}
                      paddingAngle={2}
                      label={(entry: any) => `${entry.count}`}
                    >
                      {categoryData.map((c) => (<Cell key={c.category} fill={c.color} />))}
                    </Pie>
                    <Tooltip contentStyle={{ borderRadius: 12 }} />
                    <Legend wrapperStyle={{ fontSize: 10, paddingTop: 12 }} iconType="circle" />
                  </PieChart>
                </ResponsiveContainer>
              ) : <EmptyChart message="No categories yet" />}
            </ChartCard>

            <ChartCard title="Category Count" subtitle="Bar view" icon={BarChart3} color="emerald">
              {categoryData.length > 0 ? (
                <ResponsiveContainer width="100%" height="100%">
                  <BarChart data={categoryData} layout="vertical">
                    <CartesianGrid strokeDasharray="3 3" stroke="#e2e8f0" />
                    <XAxis type="number" stroke="#64748b" fontSize={11} />
                    <YAxis type="category" dataKey="category" stroke="#64748b" fontSize={10} width={95} />
                    <Tooltip contentStyle={{ borderRadius: 12 }} />
                    <Bar dataKey="count" radius={[0, 6, 6, 0]}>
                      {categoryData.map((c, idx) => <Cell key={idx} fill={c.color} />)}
                    </Bar>
                  </BarChart>
                </ResponsiveContainer>
              ) : <EmptyChart message="No data" />}
            </ChartCard>
          </section>
        </>
      )}

      {tab === 'seasons' && (
        <>
          <section className="grid sm:grid-cols-2 gap-4">
            <div className="rounded-3xl bg-gradient-to-br from-blue-500 to-indigo-600 text-white p-5 shadow-lg">
              <div className="flex items-center gap-3">
                <div className="h-14 w-14 rounded-2xl bg-white/20 flex items-center justify-center">
                  <Sprout className="h-7 w-7" />
                </div>
                <div>
                  <div className="text-[10px] uppercase font-extrabold text-white/80">Kharif Season</div>
                  <h3 className="text-xl font-extrabold">🌧️ April - September</h3>
                  <p className="text-xs text-white/80">Cotton, Rice, Sugarcane, Maize</p>
                </div>
              </div>
            </div>
            <div className="rounded-3xl bg-gradient-to-br from-cyan-500 to-teal-600 text-white p-5 shadow-lg">
              <div className="flex items-center gap-3">
                <div className="h-14 w-14 rounded-2xl bg-white/20 flex items-center justify-center">
                  <Wheat className="h-7 w-7" />
                </div>
                <div>
                  <div className="text-[10px] uppercase font-extrabold text-white/80">Rabi Season</div>
                  <h3 className="text-xl font-extrabold">❄️ October - March</h3>
                  <p className="text-xs text-white/80">Wheat, Mustard, Gram, Barley</p>
                </div>
              </div>
            </div>
          </section>

          <div className="rounded-3xl bg-white border border-slate-200 shadow-sm p-8 text-center">
            <Calendar className="h-16 w-16 text-slate-300 mx-auto mb-3" />
            <h3 className="font-extrabold text-slate-700">Seasonal Analytics</h3>
            <p className="text-sm text-slate-500 mt-1">Visit Seasonal Plans page for detailed crop-wise tracking</p>
          </div>
        </>
      )}

      {tab === 'farmers' && (
        <>
          <section className="grid sm:grid-cols-3 gap-4">
            <KpiCard label="Registered Farmers" value={farmers.length} icon={Tractor} color="emerald" isHighlight />
            <KpiCard label="With Phone" value={farmers.filter((f: any) => f.phone).length} icon={Users} color="cyan" />
            <KpiCard label="With CNIC" value={farmers.filter((f: any) => f.cnic).length} icon={Award} color="violet" />
          </section>

          <div className="rounded-3xl bg-white border border-slate-200 shadow-sm overflow-hidden">
            <div className="px-6 py-5 border-b border-slate-100">
              <h3 className="text-xl font-bold text-slate-900">Registered Farmers</h3>
              <p className="text-sm text-slate-500">All farmer records</p>
            </div>
            {farmers.length === 0 ? (
              <EmptyChart message="No farmers registered yet" />
            ) : (
              <div className="overflow-x-auto">
                <table className="w-full text-sm">
                  <thead className="bg-slate-50 text-slate-600">
                    <tr>
                      <th className="text-left px-3 py-3 font-bold text-[10px] uppercase">Farmer</th>
                      <th className="text-left px-3 py-3 font-bold text-[10px] uppercase">Village</th>
                      <th className="text-left px-3 py-3 font-bold text-[10px] uppercase">Phone</th>
                      <th className="text-right px-3 py-3 font-bold text-[10px] uppercase">Land (Acres)</th>
                      <th className="text-left px-3 py-3 font-bold text-[10px] uppercase">CNIC</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-slate-100">
                    {farmers.slice(0, 20).map((f: any) => (
                      <tr key={f.id} className="hover:bg-slate-50">
                        <td className="px-3 py-3">
                          <div className="flex items-center gap-2">
                            <div className="h-9 w-9 rounded-xl bg-lime-100 text-lime-700 flex items-center justify-center font-extrabold">
                              {f.fullName?.charAt(0) || '?'}
                            </div>
                            <div>
                              <div className="font-bold text-slate-900">{f.fullName}</div>
                              {f.farmerNumber && <div className="text-[10px] text-slate-500 font-mono">{f.farmerNumber}</div>}
                            </div>
                          </div>
                        </td>
                        <td className="px-3 py-3 text-slate-700">{f.village || '—'}</td>
                        <td className="px-3 py-3 text-slate-700 font-mono">{f.phone || '—'}</td>
                        <td className="px-3 py-3 text-right font-bold">{f.landAreaAcres || '—'}</td>
                        <td className="px-3 py-3 text-[10px] font-mono text-slate-500">{f.cnic || '—'}</td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            )}
          </div>
        </>
      )}

      {tab === 'products' && (
        <section className="rounded-3xl bg-white border border-slate-200 shadow-sm overflow-hidden">
          <div className="px-6 py-5 border-b border-slate-100">
            <h3 className="text-xl font-bold text-slate-900">Top Selling Agri Products</h3>
            <p className="text-sm text-slate-500">Best sellers with profit</p>
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
                        <div className="h-10 w-10 rounded-lg bg-lime-100 overflow-hidden flex items-center justify-center">
                          {p.product?.images?.[0]?.url ? (
                            <img src={p.product.images[0].url} alt="" className="h-full w-full object-cover" />
                          ) : (
                            <Wheat className="h-4 w-4 text-lime-400" />
                          )}
                        </div>
                        <div className="font-bold text-slate-900">{p.product?.name}</div>
                      </div>
                    </td>
                    <td className="px-3 py-3 text-right font-bold">{p.quantitySold.toFixed(p.quantitySold % 1 === 0 ? 0 : 2)} {p.product?.unit}</td>
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
    </div>
  );
}
