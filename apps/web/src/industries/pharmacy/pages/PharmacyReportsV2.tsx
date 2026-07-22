import { useState, useMemo } from 'react';
import { useQuery } from '@tanstack/react-query';
import {
  BarChart3, Pill, FileText, ShieldAlert, Snowflake, Beaker,
  TrendingUp, Target, Package, Crown, Activity, DollarSign,
  Award, Users, Clock, Star, ArrowRight, Calendar, AlertTriangle,
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
import { medicinesApi } from '../api/medicines.api';
import { batchesApi } from '../api/batches.api';

const TABS = [
  { id: 'overview', label: 'Overview', icon: BarChart3 },
  { id: 'medicines', label: 'Medicines', icon: Pill },
  { id: 'expiry', label: 'Expiry Report', icon: Calendar },
  { id: 'rx', label: 'Rx Analytics', icon: FileText },
  { id: 'staff', label: 'Staff', icon: Crown },
];

export default function PharmacyReportsV2() {
  const [days, setDays] = useState(14);
  const [tab, setTab] = useState('overview');
  const reports = useReportsData(days);

  const { data: medicines = [] } = useQuery({
    queryKey: ['pharmacy-medicines'],
    queryFn: () => medicinesApi.list({}),
  });

  const { data: expiringBatches = [] } = useQuery({
    queryKey: ['pharmacy-batches-expiring'],
    queryFn: async () => { try { return await batchesApi.expiringSoon(90); } catch { return []; } },
  });

  const trendData = reports.trend.map((p) => ({ ...p, label: dayLabel(p.date) }));
  const totalRevenue = reports.trend.reduce((s, p) => s + p.sales, 0);
  const totalProfit = reports.trend.reduce((s, p) => s + p.profit, 0);
  const totalOrders = reports.trend.reduce((s, p) => s + p.orders, 0);
  const aov = totalOrders > 0 ? totalRevenue / totalOrders : 0;

  const rxCount = medicines.filter((m: any) => m.requiresPrescription).length;
  const otcCount = medicines.filter((m: any) => !m.requiresPrescription).length;
  const narcoticCount = medicines.filter((m: any) => m.isNarcotic).length;
  const coldChainCount = medicines.filter((m: any) => m.requiresColdChain).length;

  const now = Date.now();
  const expired = expiringBatches.filter((b: any) => b.expiryDate && new Date(b.expiryDate).getTime() < now).length;
  const expiring30 = expiringBatches.filter((b: any) => {
    if (!b.expiryDate) return false;
    const days = (new Date(b.expiryDate).getTime() - now) / (1000 * 60 * 60 * 24);
    return days > 0 && days <= 30;
  }).length;
  const expiring90 = expiringBatches.filter((b: any) => {
    if (!b.expiryDate) return false;
    const days = (new Date(b.expiryDate).getTime() - now) / (1000 * 60 * 60 * 24);
    return days > 30 && days <= 90;
  }).length;

  return (
    <div className="space-y-6">
      <ReportsHero
        gradient="from-slate-950 via-teal-900 to-cyan-700"
        emoji="💊"
        industryLabel="Pharmacy"
        title="Pharmacy Reports"
        subtitle="Rx analytics, expiry tracking, medicine sales, doctor performance"
        days={days}
        setDays={setDays}
      />

      <TabSwitcher tabs={TABS} active={tab} onChange={setTab} color="emerald" />

      {tab === 'overview' && (
        <>
          <section className="grid sm:grid-cols-2 lg:grid-cols-4 gap-4">
            <KpiCard label="Total Revenue" value={formatPKR(totalRevenue)} icon={TrendingUp} color="emerald" isHighlight />
            <KpiCard label="Total Profit" value={formatPKR(totalProfit)} icon={Target} color="cyan" />
            <KpiCard label="Prescriptions" value={rxCount} icon={FileText} color="amber" />
            <KpiCard label="Avg Order Value" value={formatPKR(aov)} icon={DollarSign} color="blue" />
          </section>

          {reports.profitLoss && (
            <section className="rounded-3xl bg-white border border-slate-200 shadow-sm p-6">
              <div className="flex items-center justify-between mb-5 flex-wrap gap-2">
                <div>
                  <h3 className="text-xl font-bold text-slate-900">Pharmacy P&L</h3>
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
                  <PnLLine label="Medicine Cost (COGS)" value={-reports.profitLoss.cogs} type="negative" />
                  <PnLLine label="Gross Profit" value={reports.profitLoss.grossProfit} type="bold" sub={`${reports.profitLoss.grossMargin.toFixed(1)}% margin`} />
                  <PnLLine label="Operating Expenses" value={-reports.profitLoss.expenses} type="negative" />
                  <PnLLine label="Net Profit" value={reports.profitLoss.netProfit} type="highlight" sub={`${reports.profitLoss.netMargin.toFixed(1)}% margin`} />
                </div>
                <div className="grid grid-cols-2 gap-3">
                  <MiniStat label="Orders" value={reports.profitLoss.orderCount} color="emerald" icon={FileText} />
                  <MiniStat label="Rx Medicines" value={rxCount} color="amber" icon={FileText} />
                  <MiniStat label="OTC" value={otcCount} color="cyan" icon={Pill} />
                  <MiniStat label="Cold Chain" value={coldChainCount} color="blue" icon={Snowflake} />
                  <MiniStat label="Narcotic" value={narcoticCount} color="rose" icon={ShieldAlert} />
                  <MiniStat label="Expiring" value={expiring30 + expiring90} color="orange" icon={AlertTriangle} />
                </div>
              </div>
            </section>
          )}

          <ChartCard title="Pharmacy Sales Trend" subtitle={`${days}-day analysis`} icon={TrendingUp} color="emerald">
            <ResponsiveContainer width="100%" height="100%">
              <ComposedChart data={trendData}>
                <defs>
                  <linearGradient id="phrsalesGrad" x1="0" y1="0" x2="0" y2="1">
                    <stop offset="0%" stopColor="#0d9488" stopOpacity={0.5} />
                    <stop offset="100%" stopColor="#0d9488" stopOpacity={0} />
                  </linearGradient>
                </defs>
                <CartesianGrid strokeDasharray="3 3" stroke="#e2e8f0" />
                <XAxis dataKey="label" stroke="#64748b" fontSize={11} />
                <YAxis yAxisId="left" stroke="#64748b" fontSize={11} tickFormatter={(v) => `${(v / 1000).toFixed(0)}k`} />
                <YAxis yAxisId="right" orientation="right" stroke="#64748b" fontSize={11} />
                <Tooltip formatter={(value: any, name: any) => name === 'Orders' ? value : formatPKR(Number(value))} contentStyle={{ borderRadius: 12 }} />
                <Legend wrapperStyle={{ fontSize: 12 }} />
                <Area yAxisId="left" type="monotone" dataKey="sales" name="Sales" fill="url(#phrsalesGrad)" stroke="#0d9488" strokeWidth={2.5} />
                <Bar yAxisId="left" dataKey="profit" name="Profit" fill="#8b5cf6" radius={[4, 4, 0, 0]} barSize={20} />
                <Line yAxisId="right" type="monotone" dataKey="orders" name="Orders" stroke="#10b981" strokeWidth={2.5} dot={{ r: 4 }} />
              </ComposedChart>
            </ResponsiveContainer>
          </ChartCard>
        </>
      )}

      {tab === 'medicines' && (
        <>
          <section className="grid sm:grid-cols-4 gap-4">
            <KpiCard label="Total Medicines" value={medicines.length} icon={Pill} color="cyan" />
            <KpiCard label="Rx Only" value={rxCount} icon={FileText} color="amber" isHighlight />
            <KpiCard label="OTC" value={otcCount} icon={Pill} color="emerald" />
            <KpiCard label="Cold Chain" value={coldChainCount} icon={Snowflake} color="blue" />
          </section>

          <section className="rounded-3xl bg-white border border-slate-200 shadow-sm overflow-hidden">
            <div className="px-6 py-5 border-b border-slate-100">
              <h3 className="text-xl font-bold text-slate-900">Top Selling Medicines</h3>
            </div>
            <div className="overflow-x-auto">
              <table className="w-full text-sm">
                <thead className="bg-slate-50 text-slate-600">
                  <tr>
                    <th className="text-center px-3 py-3 font-bold text-[10px] uppercase w-12">#</th>
                    <th className="text-left px-3 py-3 font-bold text-[10px] uppercase">Medicine</th>
                    <th className="text-right px-3 py-3 font-bold text-[10px] uppercase">Sold</th>
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
                          <div className="h-10 w-10 rounded-lg bg-teal-100 overflow-hidden flex items-center justify-center">
                            {p.product?.images?.[0]?.url ? (
                              <img src={p.product.images[0].url} alt="" className="h-full w-full object-cover" />
                            ) : <Pill className="h-4 w-4 text-teal-400" />}
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
        </>
      )}

      {tab === 'expiry' && (
        <>
          <section className="grid sm:grid-cols-3 gap-4">
            <KpiCard label="Expired" value={expired} icon={AlertTriangle} color="rose" />
            <KpiCard label="Expiring &lt; 30 days" value={expiring30} icon={Clock} color="amber" isHighlight />
            <KpiCard label="Expiring &lt; 90 days" value={expiring90} icon={Calendar} color="orange" />
          </section>

          <section className="rounded-3xl bg-white border border-slate-200 shadow-sm overflow-hidden">
            <div className="px-6 py-5 border-b border-slate-100">
              <h3 className="text-xl font-bold text-slate-900">Expiring Batches</h3>
              <p className="text-sm text-slate-500">Priority dispensing needed</p>
            </div>
            {expiringBatches.length === 0 ? (
              <EmptyChart message="No expiring batches — all good!" />
            ) : (
              <div className="overflow-x-auto">
                <table className="w-full text-sm">
                  <thead className="bg-slate-50 text-slate-600">
                    <tr>
                      <th className="text-left px-3 py-3 font-bold text-[10px] uppercase">Medicine</th>
                      <th className="text-left px-3 py-3 font-bold text-[10px] uppercase">Batch #</th>
                      <th className="text-left px-3 py-3 font-bold text-[10px] uppercase">Expiry Date</th>
                      <th className="text-right px-3 py-3 font-bold text-[10px] uppercase">Qty</th>
                      <th className="text-center px-3 py-3 font-bold text-[10px] uppercase">Status</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-slate-100">
                    {expiringBatches.slice(0, 20).map((b: any) => {
                      const isExpired = b.expiryDate && new Date(b.expiryDate).getTime() < now;
                      const days = b.expiryDate ? Math.floor((new Date(b.expiryDate).getTime() - now) / (1000 * 60 * 60 * 24)) : 0;
                      return (
                        <tr key={b.id} className={isExpired ? 'bg-rose-50' : days <= 30 ? 'bg-amber-50' : 'bg-orange-50/50'}>
                          <td className="px-3 py-3 font-bold text-slate-900">{b.product?.name || 'Unknown'}</td>
                          <td className="px-3 py-3 font-mono text-xs">{b.batchNumber}</td>
                          <td className="px-3 py-3 font-bold">{b.expiryDate ? new Date(b.expiryDate).toLocaleDateString('en-PK') : '—'}</td>
                          <td className="px-3 py-3 text-right font-bold">{b.quantity}</td>
                          <td className="px-3 py-3 text-center">
                            <span className={`inline-flex px-2 py-0.5 rounded-full text-xs font-extrabold ${
                              isExpired ? 'bg-rose-100 text-rose-700' :
                              days <= 30 ? 'bg-amber-100 text-amber-700' :
                              'bg-orange-100 text-orange-700'
                            }`}>
                              {isExpired ? 'EXPIRED' : `${days}d left`}
                            </span>
                          </td>
                        </tr>
                      );
                    })}
                  </tbody>
                </table>
              </div>
            )}
          </section>
        </>
      )}

      {tab === 'rx' && (
        <>
          <section className="grid sm:grid-cols-3 gap-4">
            <KpiCard label="Rx Medicines" value={rxCount} icon={FileText} color="amber" isHighlight />
            <KpiCard label="Narcotic Items" value={narcoticCount} icon={ShieldAlert} color="rose" />
            <KpiCard label="OTC Items" value={otcCount} icon={Pill} color="emerald" />
          </section>

          <div className="rounded-3xl bg-white border border-slate-200 shadow-sm p-8 text-center">
            <FileText className="h-16 w-16 text-slate-300 mx-auto mb-3" />
            <h3 className="font-extrabold text-slate-700">Prescription Analytics</h3>
            <p className="text-sm text-slate-500 mt-1">Visit Prescriptions page for detailed Rx management</p>
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
                      <div className="h-9 w-9 rounded-xl bg-teal-100 text-teal-700 flex items-center justify-center font-bold">
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
