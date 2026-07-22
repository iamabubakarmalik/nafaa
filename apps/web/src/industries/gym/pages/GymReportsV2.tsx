import { useState, useMemo } from 'react';
import { useQuery } from '@tanstack/react-query';
import {
  BarChart3, Dumbbell, Users, Award, Target, TrendingUp, DollarSign,
  Calendar, Flame, Activity, Crown, Star,
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
import { gymMembersApi } from '../api/members.api';
import { membershipsApi } from '../api/memberships.api';
import { classesApi } from '../api/classes.api';

const TABS = [
  { id: 'overview', label: 'Overview', icon: BarChart3 },
  { id: 'members', label: 'Members', icon: Users },
  { id: 'memberships', label: 'Plans', icon: Target },
  { id: 'classes', label: 'Classes', icon: Calendar },
  { id: 'staff', label: 'Staff', icon: Crown },
];

export default function GymReportsV2() {
  const [days, setDays] = useState(14);
  const [tab, setTab] = useState('overview');
  const reports = useReportsData(days);

  const { data: allMembers = [] } = useQuery({
    queryKey: ['members-for-reports'],
    queryFn: () => gymMembersApi.list({}),
  });

  const { data: memberships = [] } = useQuery({
    queryKey: ['memberships-for-reports'],
    queryFn: () => membershipsApi.list({}),
  });

  const { data: classes = [] } = useQuery({
    queryKey: ['classes-for-reports'],
    queryFn: () => classesApi.list({}),
  });

  const trendData = reports.trend.map((p) => ({ ...p, label: dayLabel(p.date) }));

  const totalRevenue = reports.trend.reduce((s, p) => s + p.sales, 0);
  const totalProfit = reports.trend.reduce((s, p) => s + p.profit, 0);
  const totalOrders = reports.trend.reduce((s, p) => s + p.orders, 0);
  const aov = totalOrders > 0 ? totalRevenue / totalOrders : 0;

  const memberStats = useMemo(() => {
    const active = allMembers.filter((m: any) => m.status === 'ACTIVE').length;
    const total = allMembers.length;
    const totalStreak = allMembers.reduce((s: number, m: any) => s + (m.currentStreak || 0), 0);
    const avgStreak = allMembers.length ? Math.round(totalStreak / allMembers.length) : 0;
    const totalVisits = allMembers.reduce((s: number, m: any) => s + (m.totalVisits || 0), 0);
    return { active, total, avgStreak, totalVisits };
  }, [allMembers]);

  const membersByGoal = useMemo(() => {
    const grouped: Record<string, number> = {};
    allMembers.forEach((m: any) => {
      const g = m.primaryGoal || 'OTHER';
      grouped[g] = (grouped[g] || 0) + 1;
    });
    return Object.entries(grouped).map(([goal, count]) => ({ goal: goal.replace('_', ' '), count }));
  }, [allMembers]);

  const membershipStats = useMemo(() => {
    const active = memberships.filter((m: any) => m.status === 'ACTIVE').length;
    const revenue = memberships.filter((m: any) => m.status === 'ACTIVE').reduce((s: number, m: any) => s + Number(m.totalPrice || 0), 0);
    const collected = memberships.filter((m: any) => m.status === 'ACTIVE').reduce((s: number, m: any) => s + Number(m.paidAmount || 0), 0);
    const outstanding = revenue - collected;
    return { total: memberships.length, active, revenue, collected, outstanding };
  }, [memberships]);

  const classStats = useMemo(() => {
    const total = classes.length;
    const completed = classes.filter((c: any) => c.status === 'COMPLETED').length;
    const upcoming = classes.filter((c: any) => c.status === 'SCHEDULED').length;
    return { total, completed, upcoming };
  }, [classes]);

  const classesByType = useMemo(() => {
    const grouped: Record<string, number> = {};
    classes.forEach((c: any) => {
      const t = c.classType || 'OTHER';
      grouped[t] = (grouped[t] || 0) + 1;
    });
    return Object.entries(grouped)
      .map(([type, count]) => ({ type: type.replace('_', ' '), count }))
      .sort((a, b) => b.count - a.count)
      .slice(0, 8);
  }, [classes]);

  return (
    <div className="space-y-6">
      <ReportsHero
        gradient="from-slate-950 via-red-900 to-orange-700"
        emoji="💪"
        industryLabel="Gym"
        title="Gym Business Reports"
        subtitle="Members, retention, classes, trainer performance"
        days={days}
        setDays={setDays}
      />

      <TabSwitcher tabs={TABS} active={tab} onChange={setTab} color="red" />

      {tab === 'overview' && (
        <>
          <section className="grid sm:grid-cols-2 lg:grid-cols-4 gap-4">
            <KpiCard label="Total Revenue" value={formatPKR(totalRevenue)} icon={TrendingUp} color="red" isHighlight />
            <KpiCard label="Total Profit" value={formatPKR(totalProfit)} icon={Target} color="emerald" />
            <KpiCard label="Total Orders" value={String(totalOrders)} icon={DollarSign} color="fuchsia" />
            <KpiCard label="Avg Order Value" value={formatPKR(aov)} icon={Award} color="amber" />
          </section>

          {reports.profitLoss && (
            <section className="rounded-3xl bg-white border border-slate-200 shadow-sm p-6">
              <div className="flex items-center justify-between mb-5 flex-wrap gap-2">
                <div>
                  <h3 className="text-xl font-bold">Gym P&L</h3>
                  <p className="text-sm text-slate-500">{days} days breakdown</p>
                </div>
                <div className={'px-3 py-1.5 rounded-xl text-sm font-extrabold ' + (reports.profitLoss.netProfit >= 0 ? 'bg-emerald-100 text-emerald-700' : 'bg-rose-100 text-rose-700')}>
                  Margin: {reports.profitLoss.netMargin.toFixed(1)}%
                </div>
              </div>
              <div className="grid lg:grid-cols-2 gap-6">
                <div className="space-y-2">
                  <PnLLine label="Revenue" value={reports.profitLoss.revenue} type="positive" />
                  {reports.profitLoss.discount > 0 && <PnLLine label="Discounts" value={-reports.profitLoss.discount} type="negative" />}
                  <PnLLine label="Net Revenue" value={reports.profitLoss.netRevenue} type="bold" />
                  <PnLLine label="Trainer Commission" value={-reports.profitLoss.cogs} type="negative" />
                  <PnLLine label="Gross Profit" value={reports.profitLoss.grossProfit} type="bold" sub={reports.profitLoss.grossMargin.toFixed(1) + '% margin'} />
                  <PnLLine label="Operating Expenses" value={-reports.profitLoss.expenses} type="negative" />
                  <PnLLine label="Net Profit" value={reports.profitLoss.netProfit} type="highlight" sub={reports.profitLoss.netMargin.toFixed(1) + '% margin'} />
                </div>
                <div className="grid grid-cols-2 gap-3">
                  <MiniStat label="Orders" value={reports.profitLoss.orderCount} color="red" icon={DollarSign} />
                  <MiniStat label="Active Members" value={memberStats.active} color="orange" icon={Users} />
                  <MiniStat label="Avg Streak" value={memberStats.avgStreak + 'd'} color="amber" icon={Flame} />
                  <MiniStat label="Total Visits" value={memberStats.totalVisits} color="emerald" icon={Activity} />
                  <MiniStat label="Classes Held" value={classStats.completed} color="cyan" icon={Calendar} />
                  <MiniStat label="Outstanding" value={formatPKR(membershipStats.outstanding)} color="rose" icon={DollarSign} />
                </div>
              </div>
            </section>
          )}

          <ChartCard title="Gym Sales Trend" subtitle={days + '-day analysis'} icon={TrendingUp} color="red">
            <ResponsiveContainer width="100%" height="100%">
              <ComposedChart data={trendData}>
                <defs>
                  <linearGradient id="gymsalesGrad" x1="0" y1="0" x2="0" y2="1">
                    <stop offset="0%" stopColor="#dc2626" stopOpacity={0.5} />
                    <stop offset="100%" stopColor="#dc2626" stopOpacity={0} />
                  </linearGradient>
                </defs>
                <CartesianGrid strokeDasharray="3 3" stroke="#e2e8f0" />
                <XAxis dataKey="label" stroke="#64748b" fontSize={11} />
                <YAxis yAxisId="left" stroke="#64748b" fontSize={11} tickFormatter={(v) => (v / 1000).toFixed(0) + 'k'} />
                <YAxis yAxisId="right" orientation="right" stroke="#64748b" fontSize={11} />
                <Tooltip formatter={(value: any, name: any) => name === 'Orders' ? value : formatPKR(Number(value))} contentStyle={{ borderRadius: 12 }} />
                <Legend wrapperStyle={{ fontSize: 12 }} />
                <Area yAxisId="left" type="monotone" dataKey="sales" name="Sales" fill="url(#gymsalesGrad)" stroke="#dc2626" strokeWidth={2.5} />
                <Bar yAxisId="left" dataKey="profit" name="Profit" fill="#10b981" radius={[4, 4, 0, 0]} barSize={20} />
                <Line yAxisId="right" type="monotone" dataKey="orders" name="Orders" stroke="#f59e0b" strokeWidth={2.5} dot={{ r: 4 }} />
              </ComposedChart>
            </ResponsiveContainer>
          </ChartCard>
        </>
      )}

      {tab === 'members' && (
        <>
          <section className="grid sm:grid-cols-4 gap-4">
            <KpiCard label="Total Members" value={memberStats.total} icon={Users} color="red" isHighlight />
            <KpiCard label="Active" value={memberStats.active} icon={Award} color="emerald" />
            <KpiCard label="Avg Streak" value={memberStats.avgStreak + ' days'} icon={Flame} color="orange" />
            <KpiCard label="Total Visits" value={memberStats.totalVisits} icon={Activity} color="amber" />
          </section>

          <ChartCard title="Members by Goal" subtitle="Primary fitness goal distribution" icon={Target} color="fuchsia">
            {membersByGoal.length > 0 ? (
              <ResponsiveContainer width="100%" height="100%">
                <PieChart>
                  <Pie data={membersByGoal} dataKey="count" nameKey="goal" cx="50%" cy="50%" outerRadius={100} innerRadius={50} paddingAngle={2} label={(e: any) => e.count}>
                    {membersByGoal.map((_: any, i: number) => <Cell key={i} fill={PIE_COLORS[i % PIE_COLORS.length]} />)}
                  </Pie>
                  <Tooltip contentStyle={{ borderRadius: 12 }} />
                  <Legend wrapperStyle={{ fontSize: 11 }} iconType="circle" />
                </PieChart>
              </ResponsiveContainer>
            ) : <EmptyChart message="No member data" />}
          </ChartCard>
        </>
      )}

      {tab === 'memberships' && (
        <>
          <section className="grid sm:grid-cols-4 gap-4">
            <KpiCard label="Total Sold" value={membershipStats.total} icon={Target} color="fuchsia" isHighlight />
            <KpiCard label="Active" value={membershipStats.active} icon={Award} color="emerald" />
            <KpiCard label="Revenue" value={formatPKR(membershipStats.revenue)} icon={DollarSign} color="red" />
            <KpiCard label="Outstanding" value={formatPKR(membershipStats.outstanding)} icon={Activity} color="amber" />
          </section>

          <div className="rounded-3xl bg-white border border-slate-200 shadow-sm p-8 text-center">
            <Target className="h-16 w-16 text-slate-300 mx-auto mb-3" />
            <h3 className="font-extrabold text-slate-700">Membership Analytics</h3>
            <p className="text-sm text-slate-500 mt-1">Visit Plans page for detailed subscriber tracking</p>
          </div>
        </>
      )}

      {tab === 'classes' && (
        <>
          <section className="grid sm:grid-cols-4 gap-4">
            <KpiCard label="Total Classes" value={classStats.total} icon={Calendar} color="blue" isHighlight />
            <KpiCard label="Completed" value={classStats.completed} icon={Award} color="emerald" />
            <KpiCard label="Upcoming" value={classStats.upcoming} icon={Activity} color="amber" />
            <KpiCard label="Types" value={classesByType.length} icon={Star} color="fuchsia" />
          </section>

          <ChartCard title="Popular Class Types" subtitle="Most scheduled classes" icon={Calendar} color="blue">
            {classesByType.length > 0 ? (
              <ResponsiveContainer width="100%" height="100%">
                <BarChart data={classesByType} layout="vertical">
                  <CartesianGrid strokeDasharray="3 3" stroke="#e2e8f0" />
                  <XAxis type="number" stroke="#64748b" fontSize={11} />
                  <YAxis dataKey="type" type="category" stroke="#64748b" fontSize={10} width={100} />
                  <Tooltip contentStyle={{ borderRadius: 12 }} />
                  <Bar dataKey="count" fill="#3b82f6" radius={[0, 8, 8, 0]} />
                </BarChart>
              </ResponsiveContainer>
            ) : <EmptyChart message="No class data" />}
          </ChartCard>
        </>
      )}

      {tab === 'staff' && (
        <section className="rounded-3xl bg-white border border-slate-200 shadow-sm overflow-hidden">
          <div className="px-6 py-5 border-b border-slate-100">
            <h3 className="text-xl font-bold">Staff Performance</h3>
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
                    <span className={'inline-flex h-8 w-8 rounded-lg items-center justify-center font-extrabold text-xs ' + (idx === 0 ? 'bg-amber-500 text-white' : idx === 1 ? 'bg-slate-400 text-white' : idx === 2 ? 'bg-orange-600 text-white' : 'bg-slate-100 text-slate-500')}>
                      {idx < 3 ? <Crown className="h-4 w-4" /> : idx + 1}
                    </span>
                  </td>
                  <td className="px-6 py-3">
                    <div className="flex items-center gap-3">
                      {c.user?.avatarUrl ? <img src={c.user.avatarUrl} alt="" className="h-9 w-9 rounded-xl object-cover" /> : <div className="h-9 w-9 rounded-xl bg-red-100 text-red-700 flex items-center justify-center font-bold">{c.user?.fullName?.charAt(0) || '?'}</div>}
                      <div>
                        <div className="font-bold">{c.user?.fullName || 'Unknown'}</div>
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
