import { useState, useMemo } from 'react';
import { useQuery } from '@tanstack/react-query';
import {
  BarChart3, Stethoscope, UserCog, Users, Calendar, TrendingUp,
  Target, Award, Crown, Activity, DollarSign, Timer, Video, Home, Zap,
} from 'lucide-react';
import {
  ResponsiveContainer, BarChart, Bar, PieChart, Pie, Cell,
  XAxis, YAxis, Tooltip, CartesianGrid, Legend, ComposedChart, Area, Line,
} from 'recharts';
import { formatPKR } from '@/lib/format';
import { useReportsData } from '@/features/reports/hooks/useReportsData';
import {
  ReportsHero, TabSwitcher, KpiCard, ChartCard, EmptyChart,
  PnLLine, MiniStat, dayLabel, PIE_COLORS,
} from '@/features/reports/components/ReportsShared';
import { doctorsApi } from '../api/doctors.api';
import { appointmentsApi } from '../api/appointments.api';

const TABS = [
  { id: 'overview', label: 'Overview', icon: BarChart3 },
  { id: 'services', label: 'Top Services', icon: Stethoscope },
  { id: 'doctors', label: 'Doctor Performance', icon: UserCog },
  { id: 'visits', label: 'Visit Analytics', icon: Calendar },
];

export default function ClinicReportsV2() {
  const [days, setDays] = useState(14);
  const [tab, setTab] = useState('overview');
  const reports = useReportsData(days);

  const { data: doctors = [] } = useQuery({
    queryKey: ['clinic-doctors-reports'],
    queryFn: () => doctorsApi.list({}),
  });

  const { data: appointments = [] } = useQuery({
    queryKey: ['clinic-apts-reports'],
    queryFn: () => appointmentsApi.list({}),
  });

  const trendData = reports.trend.map((p) => ({ ...p, label: dayLabel(p.date) }));

  const totalRevenue = reports.trend.reduce((s, p) => s + p.sales, 0);
  const totalProfit = reports.trend.reduce((s, p) => s + p.profit, 0);
  const totalVisits = appointments.filter((a: any) => a.status === 'COMPLETED').length;
  const avgConsult = totalVisits > 0 ? totalRevenue / totalVisits : 0;

  const visitsByType = useMemo(() => {
    const grouped: Record<string, number> = {};
    appointments.forEach((a: any) => {
      const t = a.visitType || 'OTHER';
      grouped[t] = (grouped[t] || 0) + 1;
    });
    return Object.entries(grouped)
      .map(([visitType, count]) => ({ visitType: visitType.replace(/_/g, ' '), count }))
      .sort((a, b) => b.count - a.count)
      .slice(0, 10);
  }, [appointments]);

  const visitsByStatus = useMemo(() => {
    const grouped: Record<string, number> = {};
    appointments.forEach((a: any) => {
      grouped[a.status] = (grouped[a.status] || 0) + 1;
    });
    return Object.entries(grouped).map(([status, count]) => ({ status: status.replace(/_/g, ' '), count }));
  }, [appointments]);

  const doctorPerformance = useMemo(() => {
    return doctors.map((d: any) => {
      const docApts = appointments.filter((a: any) => a.doctorId === d.id);
      const completed = docApts.filter((a: any) => a.status === 'COMPLETED');
      const revenue = completed.reduce((s: number, a: any) => s + Number(a.total || 0), 0);
      return {
        id: d.id,
        name: (d.title || 'Dr.') + ' ' + d.fullName,
        specialty: d.specialties?.[0]?.replace(/_/g, ' '),
        photo: d.photoUrl,
        totalApts: docApts.length,
        completed: completed.length,
        revenue,
        rating: d.avgRating || 0,
      };
    }).sort((a: any, b: any) => b.revenue - a.revenue);
  }, [doctors, appointments]);

  return (
    <div className="space-y-6">
      <ReportsHero
        gradient="from-slate-950 via-cyan-900 to-blue-700"
        emoji="🩺"
        industryLabel="Clinic"
        title="Clinic Business Reports"
        subtitle="Revenue trends, doctor performance, visit analytics, top services"
        days={days}
        setDays={setDays}
      />

      <TabSwitcher tabs={TABS} active={tab} onChange={setTab} color="cyan" />

      {tab === 'overview' && (
        <>
          <section className="grid sm:grid-cols-2 lg:grid-cols-4 gap-4">
            <KpiCard label="Total Revenue" value={formatPKR(totalRevenue)} icon={TrendingUp} color="cyan" isHighlight />
            <KpiCard label="Total Profit" value={formatPKR(totalProfit)} icon={Target} color="emerald" />
            <KpiCard label="Consultations" value={String(totalVisits)} icon={Stethoscope} color="blue" />
            <KpiCard label="Avg per Visit" value={formatPKR(avgConsult)} icon={DollarSign} color="amber" />
          </section>

          {reports.profitLoss && (
            <section className="rounded-3xl bg-white border border-slate-200 shadow-sm p-6">
              <div className="flex items-center justify-between mb-5 flex-wrap gap-2">
                <div>
                  <h3 className="text-xl font-bold text-slate-900">Clinic P&L</h3>
                  <p className="text-sm text-slate-500">{days} days breakdown</p>
                </div>
                <div className={'px-3 py-1.5 rounded-xl text-sm font-extrabold ' + (reports.profitLoss.netProfit >= 0 ? 'bg-emerald-100 text-emerald-700' : 'bg-rose-100 text-rose-700')}>
                  Net Margin: {reports.profitLoss.netMargin.toFixed(1)}%
                </div>
              </div>
              <div className="grid lg:grid-cols-2 gap-6">
                <div className="space-y-2">
                  <PnLLine label="Revenue" value={reports.profitLoss.revenue} type="positive" />
                  {reports.profitLoss.discount > 0 && <PnLLine label="Discounts" value={-reports.profitLoss.discount} type="negative" />}
                  <PnLLine label="Net Revenue" value={reports.profitLoss.netRevenue} type="bold" />
                  <PnLLine label="Supply/Med Cost" value={-reports.profitLoss.cogs} type="negative" />
                  <PnLLine label="Gross Profit" value={reports.profitLoss.grossProfit} type="bold" sub={reports.profitLoss.grossMargin.toFixed(1) + '% margin'} />
                  <PnLLine label="Operating Expenses" value={-reports.profitLoss.expenses} type="negative" />
                  <PnLLine label="Net Profit" value={reports.profitLoss.netProfit} type="highlight" sub={reports.profitLoss.netMargin.toFixed(1) + '% margin'} />
                </div>
                <div className="grid grid-cols-2 gap-3">
                  <MiniStat label="Bills" value={reports.profitLoss.orderCount} color="cyan" icon={Stethoscope} />
                  <MiniStat label="Consultations" value={totalVisits} color="blue" icon={Activity} />
                  <MiniStat label="Doctors" value={doctors.length} color="indigo" icon={UserCog} />
                  <MiniStat label="Patients" value={appointments.length} color="fuchsia" icon={Users} />
                </div>
              </div>
            </section>
          )}

          <ChartCard title="Clinic Revenue Trend" subtitle={days + '-day analysis'} icon={TrendingUp} color="cyan">
            <ResponsiveContainer width="100%" height="100%">
              <ComposedChart data={trendData}>
                <defs>
                  <linearGradient id="clinicSales" x1="0" y1="0" x2="0" y2="1">
                    <stop offset="0%" stopColor="#06b6d4" stopOpacity={0.5} />
                    <stop offset="100%" stopColor="#06b6d4" stopOpacity={0} />
                  </linearGradient>
                </defs>
                <CartesianGrid strokeDasharray="3 3" stroke="#e2e8f0" />
                <XAxis dataKey="label" stroke="#64748b" fontSize={11} />
                <YAxis yAxisId="left" stroke="#64748b" fontSize={11} tickFormatter={(v) => (v / 1000).toFixed(0) + 'k'} />
                <YAxis yAxisId="right" orientation="right" stroke="#64748b" fontSize={11} />
                <Tooltip formatter={(value: any, name: any) => name === 'Bills' ? value : formatPKR(Number(value))} contentStyle={{ borderRadius: 12 }} />
                <Legend wrapperStyle={{ fontSize: 12 }} />
                <Area yAxisId="left" type="monotone" dataKey="sales" name="Revenue" fill="url(#clinicSales)" stroke="#06b6d4" strokeWidth={2.5} />
                <Bar yAxisId="left" dataKey="profit" name="Profit" fill="#10b981" radius={[4, 4, 0, 0]} barSize={20} />
                <Line yAxisId="right" type="monotone" dataKey="orders" name="Bills" stroke="#f59e0b" strokeWidth={2.5} dot={{ r: 4 }} />
              </ComposedChart>
            </ResponsiveContainer>
          </ChartCard>
        </>
      )}

      {tab === 'services' && (
        <section className="rounded-3xl bg-white border border-slate-200 shadow-sm overflow-hidden">
          <div className="px-6 py-5 border-b border-slate-100">
            <h3 className="text-xl font-bold text-slate-900">Top Clinical Services</h3>
            <p className="text-sm text-slate-500">Best performing services by revenue</p>
          </div>
          <div className="overflow-x-auto">
            <table className="w-full text-sm">
              <thead className="bg-slate-50 text-slate-600">
                <tr>
                  <th className="text-center px-3 py-3 font-bold text-[10px] uppercase w-12">#</th>
                  <th className="text-left px-3 py-3 font-bold text-[10px] uppercase">Service</th>
                  <th className="text-right px-3 py-3 font-bold text-[10px] uppercase">Sold</th>
                  <th className="text-right px-3 py-3 font-bold text-[10px] uppercase">Bills</th>
                  <th className="text-right px-3 py-3 font-bold text-[10px] uppercase">Revenue</th>
                  <th className="text-right px-3 py-3 font-bold text-[10px] uppercase">Profit</th>
                  <th className="text-center px-3 py-3 font-bold text-[10px] uppercase">Margin</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-100">
                {reports.topProducts.map((p, idx) => (
                  <tr key={p.productId} className="hover:bg-slate-50">
                    <td className="px-3 py-3 text-center">
                      <span className={'inline-flex h-7 w-7 rounded-lg items-center justify-center font-extrabold text-xs ' + (idx === 0 ? 'bg-amber-100 text-amber-700' : idx === 1 ? 'bg-slate-200 text-slate-700' : idx === 2 ? 'bg-orange-100 text-orange-700' : 'bg-slate-100 text-slate-500')}>
                        {idx < 3 ? <Crown className="h-3.5 w-3.5" /> : idx + 1}
                      </span>
                    </td>
                    <td className="px-3 py-3">
                      <div className="flex items-center gap-3">
                        <div className="h-10 w-10 rounded-lg bg-cyan-100 overflow-hidden flex items-center justify-center">
                          {p.product?.images?.[0]?.url ? <img src={p.product.images[0].url} alt="" className="h-full w-full object-cover" /> : <Stethoscope className="h-4 w-4 text-cyan-400" />}
                        </div>
                        <div className="font-bold text-slate-900">🩺 {p.product?.name}</div>
                      </div>
                    </td>
                    <td className="px-3 py-3 text-right font-bold">{p.quantitySold}</td>
                    <td className="px-3 py-3 text-right text-slate-700">{p.orderCount}</td>
                    <td className="px-3 py-3 text-right font-extrabold text-emerald-700 tabular-nums">{formatPKR(p.revenue)}</td>
                    <td className="px-3 py-3 text-right font-extrabold text-violet-700 tabular-nums">{formatPKR(p.profit)}</td>
                    <td className="px-3 py-3 text-center">
                      <span className={'inline-flex px-2 py-0.5 rounded-full text-xs font-extrabold ' + (p.margin > 40 ? 'bg-emerald-100 text-emerald-700' : p.margin > 20 ? 'bg-amber-100 text-amber-700' : 'bg-rose-100 text-rose-700')}>
                        {p.margin.toFixed(1)}%
                      </span>
                    </td>
                  </tr>
                ))}
                {reports.topProducts.length === 0 && (
                  <tr><td colSpan={7} className="px-6 py-16 text-center text-sm text-slate-500 font-semibold">No service sales yet</td></tr>
                )}
              </tbody>
            </table>
          </div>
        </section>
      )}

      {tab === 'doctors' && (
        <section className="rounded-3xl bg-white border border-slate-200 shadow-sm overflow-hidden">
          <div className="px-6 py-5 border-b border-slate-100">
            <h3 className="text-xl font-bold text-slate-900">Doctor Performance</h3>
            <p className="text-sm text-slate-500">Individual consultation stats</p>
          </div>
          <table className="w-full text-sm">
            <thead className="bg-slate-50 text-slate-600">
              <tr>
                <th className="text-center px-6 py-3 font-bold text-xs uppercase w-16">#</th>
                <th className="text-left px-6 py-3 font-bold text-xs uppercase">Doctor</th>
                <th className="text-right px-6 py-3 font-bold text-xs uppercase">Appointments</th>
                <th className="text-right px-6 py-3 font-bold text-xs uppercase">Completed</th>
                <th className="text-right px-6 py-3 font-bold text-xs uppercase">Revenue</th>
                <th className="text-center px-6 py-3 font-bold text-xs uppercase">Rating</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-100">
              {doctorPerformance.map((d: any, idx: number) => (
                <tr key={d.id} className="hover:bg-slate-50">
                  <td className="px-6 py-3 text-center">
                    <span className={'inline-flex h-8 w-8 rounded-lg items-center justify-center font-extrabold text-xs ' + (idx === 0 ? 'bg-amber-500 text-white' : idx === 1 ? 'bg-slate-400 text-white' : idx === 2 ? 'bg-orange-600 text-white' : 'bg-slate-100 text-slate-500')}>
                      {idx < 3 ? <Crown className="h-4 w-4" /> : idx + 1}
                    </span>
                  </td>
                  <td className="px-6 py-3">
                    <div className="flex items-center gap-3">
                      {d.photo ? <img src={d.photo} alt="" className="h-9 w-9 rounded-xl object-cover" /> : <div className="h-9 w-9 rounded-xl bg-cyan-100 text-cyan-700 flex items-center justify-center font-bold">{d.name.charAt(4)}</div>}
                      <div>
                        <div className="font-bold text-slate-900">{d.name}</div>
                        <div className="text-xs text-slate-500 uppercase">{d.specialty}</div>
                      </div>
                    </div>
                  </td>
                  <td className="px-6 py-3 text-right font-bold">{d.totalApts}</td>
                  <td className="px-6 py-3 text-right font-bold text-emerald-700">{d.completed}</td>
                  <td className="px-6 py-3 text-right font-extrabold text-emerald-700 tabular-nums">{formatPKR(d.revenue)}</td>
                  <td className="px-6 py-3 text-center">
                    <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded-full bg-amber-100 text-amber-700 text-xs font-extrabold">
                      ⭐ {d.rating.toFixed(1)}
                    </span>
                  </td>
                </tr>
              ))}
              {doctorPerformance.length === 0 && (
                <tr><td colSpan={6} className="px-6 py-16 text-center text-sm text-slate-500 font-semibold">No doctors yet</td></tr>
              )}
            </tbody>
          </table>
        </section>
      )}

      {tab === 'visits' && (
        <>
          <section className="grid sm:grid-cols-4 gap-4">
            <KpiCard label="Total Appointments" value={appointments.length} icon={Calendar} color="cyan" isHighlight />
            <KpiCard label="Completed" value={appointments.filter((a: any) => a.status === 'COMPLETED').length} icon={Award} color="emerald" />
            <KpiCard label="Cancelled" value={appointments.filter((a: any) => a.status === 'CANCELLED').length} icon={Activity} color="rose" />
            <KpiCard label="No-shows" value={appointments.filter((a: any) => a.status === 'NO_SHOW').length} icon={Timer} color="amber" />
          </section>

          <section className="grid lg:grid-cols-2 gap-6">
            <ChartCard title="Visits by Type" subtitle="Consultation distribution" icon={Calendar} color="cyan">
              {visitsByType.length > 0 ? (
                <ResponsiveContainer width="100%" height="100%">
                  <BarChart data={visitsByType} layout="vertical">
                    <CartesianGrid strokeDasharray="3 3" stroke="#e2e8f0" />
                    <XAxis type="number" stroke="#64748b" fontSize={11} />
                    <YAxis dataKey="visitType" type="category" stroke="#64748b" fontSize={10} width={100} />
                    <Tooltip contentStyle={{ borderRadius: 12 }} />
                    <Bar dataKey="count" fill="#06b6d4" radius={[0, 8, 8, 0]} />
                  </BarChart>
                </ResponsiveContainer>
              ) : <EmptyChart message="No visit data" />}
            </ChartCard>

            <ChartCard title="Status Distribution" subtitle="Appointment outcomes" icon={Activity} color="blue">
              {visitsByStatus.length > 0 ? (
                <ResponsiveContainer width="100%" height="100%">
                  <PieChart>
                    <Pie data={visitsByStatus} dataKey="count" nameKey="status" cx="50%" cy="50%" outerRadius={100} innerRadius={50} paddingAngle={2} label={(entry: any) => entry.count}>
                      {visitsByStatus.map((_: any, idx: number) => <Cell key={idx} fill={PIE_COLORS[idx % PIE_COLORS.length]} />)}
                    </Pie>
                    <Tooltip contentStyle={{ borderRadius: 12 }} />
                    <Legend wrapperStyle={{ fontSize: 11 }} iconType="circle" />
                  </PieChart>
                </ResponsiveContainer>
              ) : <EmptyChart message="No status data" />}
            </ChartCard>
          </section>
        </>
      )}
    </div>
  );
}
