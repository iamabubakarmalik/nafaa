import { useState, useMemo } from 'react';
import {
  BarChart3, BookOpen, Pencil, Palette, TrendingUp, Target,
  Award, Users, Crown, Activity, DollarSign, Star,
  Package, Building2, GraduationCap, School,
} from 'lucide-react';
import {
  ResponsiveContainer, AreaChart, Area, BarChart, Bar, PieChart, Pie, Cell,
  XAxis, YAxis, Tooltip, CartesianGrid, Legend, LineChart, Line, ComposedChart,
} from 'recharts';
import { formatPKR } from '@/lib/format';
import { useReportsData } from '@/features/reports/hooks/useReportsData';
import {
  ReportsHero, TabSwitcher, KpiCard, ChartCard, EmptyChart,
  PnLLine, MiniStat, dayLabel, PIE_COLORS,
} from '@/features/reports/components/ReportsShared';

const TABS = [
  { id: 'overview', label: 'Overview', icon: BarChart3 },
  { id: 'books', label: 'Books', icon: BookOpen },
  { id: 'stationery', label: 'Stationery', icon: Pencil },
  { id: 'art', label: 'Art Supplies', icon: Palette },
  { id: 'customers', label: 'Customers', icon: Users },
  { id: 'staff', label: 'Staff', icon: Crown },
];

export default function BookstoreReportsV2() {
  const [days, setDays] = useState(14);
  const [tab, setTab] = useState('overview');
  const reports = useReportsData(days);

  const trendData = reports.trend.map((p) => ({ ...p, label: dayLabel(p.date) }));

  const totalRevenue = reports.trend.reduce((s, p) => s + p.sales, 0);
  const totalProfit = reports.trend.reduce((s, p) => s + p.profit, 0);
  const totalOrders = reports.trend.reduce((s, p) => s + p.orders, 0);
  const aov = totalOrders > 0 ? totalRevenue / totalOrders : 0;

  // Categorize products by type
  const bookProducts = reports.topProducts.filter((p) => {
    const cat = ((p.product as any)?.category?.name || '').toLowerCase();
    const name = (p.product?.name || '').toLowerCase();
    return cat.includes('book') || cat.includes('textbook') || name.includes('book');
  });
  const stationeryProducts = reports.topProducts.filter((p) => {
    const cat = ((p.product as any)?.category?.name || '').toLowerCase();
    return cat.includes('stationery') || cat.includes('pen') || cat.includes('notebook');
  });
  const artProducts = reports.topProducts.filter((p) => {
    const cat = ((p.product as any)?.category?.name || '').toLowerCase();
    return cat.includes('art') || cat.includes('paint') || cat.includes('brush');
  });

  return (
    <div className="space-y-6">
      <ReportsHero
        gradient="from-slate-950 via-amber-900 to-orange-700"
        emoji="📚"
        industryLabel="Bookstore"
        title="Bookstore Reports"
        subtitle="Books, stationery, art supplies analytics — sab ek jagah"
        days={days}
        setDays={setDays}
      />

      <TabSwitcher tabs={TABS} active={tab} onChange={setTab} color="orange" />

      {tab === 'overview' && (
        <>
          <section className="grid sm:grid-cols-2 lg:grid-cols-4 gap-4">
            <KpiCard label="Total Revenue" value={formatPKR(totalRevenue)} icon={TrendingUp} color="amber" isHighlight />
            <KpiCard label="Total Profit" value={formatPKR(totalProfit)} icon={Target} color="emerald" />
            <KpiCard label="Total Orders" value={String(totalOrders)} icon={BookOpen} color="orange" />
            <KpiCard label="Avg Order Value" value={formatPKR(aov)} icon={DollarSign} color="violet" />
          </section>

          {reports.profitLoss && (
            <section className="rounded-3xl bg-white border border-slate-200 shadow-sm p-6">
              <div className="flex items-center justify-between mb-5 flex-wrap gap-2">
                <div>
                  <h3 className="text-xl font-bold text-slate-900">Bookstore P&L</h3>
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
                  <PnLLine label="Book/Product Cost" value={-reports.profitLoss.cogs} type="negative" />
                  <PnLLine label="Gross Profit" value={reports.profitLoss.grossProfit} type="bold" sub={`${reports.profitLoss.grossMargin.toFixed(1)}% margin`} />
                  <PnLLine label="Operating Expenses" value={-reports.profitLoss.expenses} type="negative" />
                  <PnLLine label="Net Profit" value={reports.profitLoss.netProfit} type="highlight" sub={`${reports.profitLoss.netMargin.toFixed(1)}% margin`} />
                </div>
                <div className="grid grid-cols-2 gap-3">
                  <MiniStat label="Orders" value={reports.profitLoss.orderCount} color="amber" icon={BookOpen} />
                  <MiniStat label="Books Sold" value={bookProducts.reduce((s, p) => s + p.quantitySold, 0)} color="orange" icon={BookOpen} />
                  <MiniStat label="Cash Paid" value={formatPKR(reports.profitLoss.paid)} color="emerald" icon={DollarSign} />
                  <MiniStat label="Udhaar" value={formatPKR(reports.profitLoss.credit)} color="amber" icon={Package} />
                  <MiniStat label="Stationery Sold" value={stationeryProducts.reduce((s, p) => s + p.quantitySold, 0)} color="blue" icon={Pencil} />
                  <MiniStat label="Art Supplies Sold" value={artProducts.reduce((s, p) => s + p.quantitySold, 0)} color="pink" icon={Palette} />
                </div>
              </div>
            </section>
          )}

          <ChartCard title="Bookstore Sales Trend" subtitle={`${days}-day analysis`} icon={TrendingUp} color="orange">
            <ResponsiveContainer width="100%" height="100%">
              <ComposedChart data={trendData}>
                <defs>
                  <linearGradient id="bkSalesGrad" x1="0" y1="0" x2="0" y2="1">
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
                <Area yAxisId="left" type="monotone" dataKey="sales" name="Sales" fill="url(#bkSalesGrad)" stroke="#d97706" strokeWidth={2.5} />
                <Bar yAxisId="left" dataKey="profit" name="Profit" fill="#8b5cf6" radius={[4, 4, 0, 0]} barSize={20} />
                <Line yAxisId="right" type="monotone" dataKey="orders" name="Orders" stroke="#10b981" strokeWidth={2.5} dot={{ r: 4 }} />
              </ComposedChart>
            </ResponsiveContainer>
          </ChartCard>
        </>
      )}

      {tab === 'books' && (
        <>
          <section className="grid sm:grid-cols-3 gap-4">
            <KpiCard label="Books Sold" value={bookProducts.reduce((s, p) => s + p.quantitySold, 0)} icon={BookOpen} color="amber" isHighlight />
            <KpiCard label="Book Revenue" value={formatPKR(bookProducts.reduce((s, p) => s + p.revenue, 0))} icon={TrendingUp} color="emerald" />
            <KpiCard label="Book Titles" value={bookProducts.length} icon={Package} color="orange" />
          </section>

          <section className="rounded-3xl bg-white border border-slate-200 shadow-sm overflow-hidden">
            <div className="px-6 py-5 border-b border-slate-100">
              <h3 className="text-xl font-bold text-slate-900">Top Selling Books</h3>
            </div>
            <div className="overflow-x-auto">
              <table className="w-full text-sm">
                <thead className="bg-slate-50 text-slate-600">
                  <tr>
                    <th className="text-center px-3 py-3 font-bold text-[10px] uppercase w-12">#</th>
                    <th className="text-left px-3 py-3 font-bold text-[10px] uppercase">Book</th>
                    <th className="text-right px-3 py-3 font-bold text-[10px] uppercase">Sold</th>
                    <th className="text-right px-3 py-3 font-bold text-[10px] uppercase">Revenue</th>
                    <th className="text-right px-3 py-3 font-bold text-[10px] uppercase">Profit</th>
                    <th className="text-center px-3 py-3 font-bold text-[10px] uppercase">Margin</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-slate-100">
                  {bookProducts.map((p, idx) => (
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
                              <BookOpen className="h-4 w-4 text-amber-400" />
                            )}
                          </div>
                          <div className="font-bold text-slate-900">{p.product?.name}</div>
                        </div>
                      </td>
                      <td className="px-3 py-3 text-right font-bold">{p.quantitySold}</td>
                      <td className="px-3 py-3 text-right font-extrabold text-emerald-700 tabular-nums">{formatPKR(p.revenue)}</td>
                      <td className="px-3 py-3 text-right font-extrabold text-violet-700 tabular-nums">{formatPKR(p.profit)}</td>
                      <td className="px-3 py-3 text-center">
                        <span className={`inline-flex px-2 py-0.5 rounded-full text-xs font-extrabold ${
                          p.margin > 20 ? 'bg-emerald-100 text-emerald-700' :
                          p.margin > 10 ? 'bg-amber-100 text-amber-700' :
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

      {tab === 'stationery' && (
        <>
          <section className="grid sm:grid-cols-3 gap-4">
            <KpiCard label="Items Sold" value={stationeryProducts.reduce((s, p) => s + p.quantitySold, 0)} icon={Pencil} color="blue" isHighlight />
            <KpiCard label="Revenue" value={formatPKR(stationeryProducts.reduce((s, p) => s + p.revenue, 0))} icon={TrendingUp} color="emerald" />
            <KpiCard label="Products" value={stationeryProducts.length} icon={Package} color="violet" />
          </section>

          {stationeryProducts.length === 0 ? (
            <div className="rounded-3xl bg-white border border-slate-200 shadow-sm p-8 text-center">
              <Pencil className="h-16 w-16 text-slate-300 mx-auto mb-3" />
              <p className="font-extrabold text-slate-700">No stationery sales yet</p>
            </div>
          ) : (
            <section className="rounded-3xl bg-white border border-slate-200 shadow-sm overflow-hidden">
              <div className="px-6 py-5 border-b border-slate-100">
                <h3 className="text-xl font-bold text-slate-900">Top Stationery Items</h3>
              </div>
              <ProductTable products={stationeryProducts} iconType="stationery" />
            </section>
          )}
        </>
      )}

      {tab === 'art' && (
        <>
          <section className="grid sm:grid-cols-3 gap-4">
            <KpiCard label="Items Sold" value={artProducts.reduce((s, p) => s + p.quantitySold, 0)} icon={Palette} color="pink" isHighlight />
            <KpiCard label="Revenue" value={formatPKR(artProducts.reduce((s, p) => s + p.revenue, 0))} icon={TrendingUp} color="emerald" />
            <KpiCard label="Products" value={artProducts.length} icon={Package} color="violet" />
          </section>

          {artProducts.length === 0 ? (
            <div className="rounded-3xl bg-white border border-slate-200 shadow-sm p-8 text-center">
              <Palette className="h-16 w-16 text-slate-300 mx-auto mb-3" />
              <p className="font-extrabold text-slate-700">No art supply sales yet</p>
            </div>
          ) : (
            <section className="rounded-3xl bg-white border border-slate-200 shadow-sm overflow-hidden">
              <div className="px-6 py-5 border-b border-slate-100">
                <h3 className="text-xl font-bold text-slate-900">Top Art Supplies</h3>
              </div>
              <ProductTable products={artProducts} iconType="art" />
            </section>
          )}
        </>
      )}

      {tab === 'customers' && (
        <section className="rounded-3xl bg-white border border-slate-200 shadow-sm overflow-hidden">
          <div className="px-6 py-5 border-b border-slate-100">
            <h3 className="text-xl font-bold text-slate-900">Top Customers</h3>
          </div>
          {reports.topCustomers.length === 0 ? (
            <EmptyChart message="No customer data" />
          ) : (
            <div className="divide-y divide-slate-100">
              {reports.topCustomers.map((tc, idx) => (
                <div key={tc.customerId} className="px-6 py-4 flex items-center justify-between gap-4 hover:bg-slate-50">
                  <div className="flex items-center gap-3 min-w-0">
                    <div className={`h-12 w-12 rounded-2xl text-white font-extrabold flex items-center justify-center shadow-md shrink-0 ${
                      idx === 0 ? 'bg-amber-500' : idx === 1 ? 'bg-slate-400' : idx === 2 ? 'bg-orange-600' : 'bg-amber-500'
                    }`}>
                      {idx < 3 ? <Crown className="h-5 w-5" /> : `#${idx + 1}`}
                    </div>
                    <div className="min-w-0">
                      <div className="font-bold text-slate-900">{tc.customer?.name || 'Unknown'}</div>
                      <div className="text-xs text-slate-500">{tc.customer?.phone || 'No phone'} • {tc.orderCount} orders</div>
                    </div>
                  </div>
                  <div className="text-right shrink-0">
                    <div className="font-extrabold text-amber-700 text-lg tabular-nums">{formatPKR(tc.totalSpent)}</div>
                  </div>
                </div>
              ))}
            </div>
          )}
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
                      <div className="h-9 w-9 rounded-xl bg-amber-100 text-amber-700 flex items-center justify-center font-bold">
                        {c.user?.fullName?.charAt(0) || '?'}
                      </div>
                      <div>
                        <div className="font-bold text-slate-900">{c.user?.fullName || 'Unknown'}</div>
                        <div className="text-xs text-slate-500">{c.user?.role}</div>
                      </div>
                    </div>
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

function ProductTable({ products, iconType }: { products: any[]; iconType: 'stationery' | 'art' }) {
  const Icon = iconType === 'stationery' ? Pencil : Palette;
  const bgColor = iconType === 'stationery' ? 'bg-blue-100 text-blue-400' : 'bg-pink-100 text-pink-400';

  return (
    <div className="overflow-x-auto">
      <table className="w-full text-sm">
        <thead className="bg-slate-50 text-slate-600">
          <tr>
            <th className="text-left px-3 py-3 font-bold text-[10px] uppercase">Product</th>
            <th className="text-right px-3 py-3 font-bold text-[10px] uppercase">Sold</th>
            <th className="text-right px-3 py-3 font-bold text-[10px] uppercase">Revenue</th>
            <th className="text-right px-3 py-3 font-bold text-[10px] uppercase">Profit</th>
          </tr>
        </thead>
        <tbody className="divide-y divide-slate-100">
          {products.map((p) => (
            <tr key={p.productId} className="hover:bg-slate-50">
              <td className="px-3 py-3">
                <div className="flex items-center gap-3">
                  <div className={`h-10 w-10 rounded-lg overflow-hidden flex items-center justify-center ${bgColor}`}>
                    {p.product?.images?.[0]?.url ? (
                      <img src={p.product.images[0].url} alt="" className="h-full w-full object-cover" />
                    ) : (
                      <Icon className="h-4 w-4" />
                    )}
                  </div>
                  <div className="font-bold text-slate-900">{p.product?.name}</div>
                </div>
              </td>
              <td className="px-3 py-3 text-right font-bold">{p.quantitySold}</td>
              <td className="px-3 py-3 text-right font-extrabold text-emerald-700 tabular-nums">{formatPKR(p.revenue)}</td>
              <td className="px-3 py-3 text-right font-extrabold text-violet-700 tabular-nums">{formatPKR(p.profit)}</td>
            </tr>
          ))}
        </tbody>
      </table>
    </div>
  );
}
