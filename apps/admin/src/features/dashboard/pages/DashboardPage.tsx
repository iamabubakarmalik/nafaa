import { useState } from 'react';
import { useQuery } from '@tanstack/react-query';
import { Link } from 'react-router-dom';
import {
  Building2, Users, ShoppingCart, DollarSign, TrendingUp,
  CheckCircle2, Clock, AlertCircle, Sparkles, ArrowRight,
} from 'lucide-react';
import {
  ResponsiveContainer, AreaChart, Area, XAxis, YAxis,
  CartesianGrid, Tooltip, Legend, PieChart, Pie, Cell,
} from 'recharts';
import { adminSystemApi } from '@/api/admin-system.api';
import { formatPKR } from '@nafaa/shared-utils';

const PIE_COLORS = ['#6366f1', '#10b981', '#f59e0b', '#ef4444', '#8b5cf6'];

const dayLabel = (d: string) =>
  new Intl.DateTimeFormat('en-PK', { month: 'short', day: 'numeric' }).format(new Date(d));

export default function DashboardPage() {
  const [days, setDays] = useState(30);

  const { data: overview } = useQuery({
    queryKey: ['admin-overview'],
    queryFn: adminSystemApi.overview,
  });

  const { data: signupTrend = [] } = useQuery({
    queryKey: ['admin-signup-trend', days],
    queryFn: () => adminSystemApi.signupTrend(days),
  });

  const { data: revenueTrend = [] } = useQuery({
    queryKey: ['admin-revenue-trend', days],
    queryFn: () => adminSystemApi.revenueTrend(days),
  });

  const { data: planDist = [] } = useQuery({
    queryKey: ['admin-plan-distribution'],
    queryFn: adminSystemApi.planDistribution,
  });

  const { data: activity } = useQuery({
    queryKey: ['admin-recent-activity'],
    queryFn: adminSystemApi.recentActivity,
  });

  const heroCards = [
    {
      title: 'Total Tenants',
      value: overview?.tenants.total ?? 0,
      sub: `${overview?.tenants.newToday ?? 0} new today`,
      icon: Building2,
      color: 'from-admin-500 to-admin-700',
    },
    {
      title: 'Active Subscriptions',
      value: overview?.subscriptions.active ?? 0,
      sub: `${overview?.subscriptions.total ?? 0} total`,
      icon: CheckCircle2,
      color: 'from-emerald-500 to-emerald-700',
    },
    {
      title: 'Pending Payments',
      value: overview?.payments.pendingCount ?? 0,
      sub: 'awaiting approval',
      icon: Clock,
      color: 'from-amber-500 to-amber-700',
    },
    {
      title: 'Platform Revenue',
      value: formatPKR(overview?.payments.totalApprovedRevenue ?? 0),
      sub: 'lifetime',
      icon: DollarSign,
      color: 'from-violet-500 to-violet-700',
    },
  ];

  const subStats = [
    { label: 'Active', value: overview?.tenants.active ?? 0, color: 'bg-emerald-100 text-emerald-700' },
    { label: 'Trial', value: overview?.tenants.trial ?? 0, color: 'bg-blue-100 text-blue-700' },
    { label: 'Suspended', value: overview?.tenants.suspended ?? 0, color: 'bg-rose-100 text-rose-700' },
    { label: 'New (Month)', value: overview?.tenants.newThisMonth ?? 0, color: 'bg-amber-100 text-amber-700' },
  ];

  return (
    <div className="space-y-6">
      <section className="rounded-3xl bg-gradient-to-br from-admin-950 via-admin-900 to-admin-700 text-white p-6 shadow-soft">
        <div className="flex items-center justify-between gap-4 flex-wrap">
          <div>
            <div className="inline-flex items-center gap-2 rounded-full bg-white/10 px-3 py-1 text-xs font-medium">
              <Sparkles className="h-3.5 w-3.5" />
              Platform Control Center
            </div>
            <h2 className="mt-3 text-3xl font-bold">System Overview</h2>
            <p className="mt-2 text-sm text-white/80">
              Pakistan ke har shopkeeper ka dashboard ek nazar mein
            </p>
          </div>
          <div className="flex gap-2">
            {[7, 14, 30, 90].map((d) => (
              <button
                key={d}
                onClick={() => setDays(d)}
                className={`px-3 py-1.5 rounded-lg text-xs font-semibold ${
                  days === d ? 'bg-white text-slate-900' : 'bg-white/10 text-white hover:bg-white/20'
                }`}
              >
                {d}d
              </button>
            ))}
          </div>
        </div>
      </section>

      <section className="grid sm:grid-cols-2 lg:grid-cols-4 gap-4">
        {heroCards.map((card) => {
          const Icon = card.icon;
          return (
            <div key={card.title} className="rounded-2xl bg-white border border-slate-200 p-5 shadow-sm">
              <div className="flex items-start justify-between">
                <div>
                  <p className="text-sm text-slate-500">{card.title}</p>
                  <h3 className="mt-2 text-2xl font-bold text-slate-900">{card.value}</h3>
                  <p className="text-xs text-slate-500 mt-1">{card.sub}</p>
                </div>
                <div className={`h-11 w-11 rounded-2xl bg-gradient-to-br ${card.color} text-white flex items-center justify-center shadow-lg`}>
                  <Icon className="h-5 w-5" />
                </div>
              </div>
            </div>
          );
        })}
      </section>

      <section className="grid grid-cols-2 lg:grid-cols-4 gap-3">
        {subStats.map((s) => (
          <div key={s.label} className={`rounded-xl ${s.color} px-4 py-3`}>
            <div className="text-xs font-medium opacity-80">{s.label}</div>
            <div className="mt-1 text-xl font-bold">{s.value}</div>
          </div>
        ))}
      </section>

      <section className="grid lg:grid-cols-2 gap-6">
        <div className="rounded-3xl bg-white border border-slate-200 shadow-sm p-6">
          <div className="flex items-center justify-between mb-4">
            <div>
              <h3 className="text-lg font-bold text-slate-900">Signup Trend</h3>
              <p className="text-xs text-slate-500">New tenants per day</p>
            </div>
            <Users className="h-5 w-5 text-admin-600" />
          </div>
          <div className="h-[260px]">
            <ResponsiveContainer width="100%" height="100%">
              <AreaChart data={signupTrend.map((p) => ({ ...p, label: dayLabel(p.date) }))}>
                <defs>
                  <linearGradient id="signupGrad" x1="0" y1="0" x2="0" y2="1">
                    <stop offset="0%" stopColor="#6366f1" stopOpacity={0.4} />
                    <stop offset="100%" stopColor="#6366f1" stopOpacity={0} />
                  </linearGradient>
                </defs>
                <CartesianGrid strokeDasharray="3 3" stroke="#e2e8f0" />
                <XAxis dataKey="label" stroke="#64748b" fontSize={11} />
                <YAxis stroke="#64748b" fontSize={11} />
                <Tooltip contentStyle={{ borderRadius: 12 }} />
                <Area type="monotone" dataKey="count" stroke="#6366f1" fill="url(#signupGrad)" strokeWidth={2} />
              </AreaChart>
            </ResponsiveContainer>
          </div>
        </div>

        <div className="rounded-3xl bg-white border border-slate-200 shadow-sm p-6">
          <div className="flex items-center justify-between mb-4">
            <div>
              <h3 className="text-lg font-bold text-slate-900">Revenue Trend</h3>
              <p className="text-xs text-slate-500">Approved payments per day</p>
            </div>
            <TrendingUp className="h-5 w-5 text-emerald-600" />
          </div>
          <div className="h-[260px]">
            <ResponsiveContainer width="100%" height="100%">
              <AreaChart data={revenueTrend.map((p) => ({ ...p, label: dayLabel(p.date) }))}>
                <defs>
                  <linearGradient id="revGrad" x1="0" y1="0" x2="0" y2="1">
                    <stop offset="0%" stopColor="#10b981" stopOpacity={0.4} />
                    <stop offset="100%" stopColor="#10b981" stopOpacity={0} />
                  </linearGradient>
                </defs>
                <CartesianGrid strokeDasharray="3 3" stroke="#e2e8f0" />
                <XAxis dataKey="label" stroke="#64748b" fontSize={11} />
                <YAxis stroke="#64748b" fontSize={11} tickFormatter={(v) => `${(v / 1000).toFixed(0)}k`} />
                <Tooltip formatter={(v: any) => formatPKR(Number(v))} contentStyle={{ borderRadius: 12 }} />
                <Area type="monotone" dataKey="amount" stroke="#10b981" fill="url(#revGrad)" strokeWidth={2} />
              </AreaChart>
            </ResponsiveContainer>
          </div>
        </div>
      </section>

      <section className="grid lg:grid-cols-2 gap-6">
        <div className="rounded-3xl bg-white border border-slate-200 shadow-sm p-6">
          <h3 className="text-lg font-bold text-slate-900 mb-4">Plan Distribution</h3>
          {planDist.length === 0 ? (
            <div className="text-center py-12 text-sm text-slate-500">No active subscriptions</div>
          ) : (
            <div className="h-[260px]">
              <ResponsiveContainer width="100%" height="100%">
                <PieChart>
                  <Pie
                    data={planDist}
                    dataKey="count"
                    nameKey="name"
                    cx="50%"
                    cy="50%"
                    outerRadius={90}
                    innerRadius={50}
                    paddingAngle={3}
                    label={(e) => `${e.name}: ${e.count}`}
                  >
                    {planDist.map((_, idx) => (
                      <Cell key={idx} fill={PIE_COLORS[idx % PIE_COLORS.length]} />
                    ))}
                  </Pie>
                  <Tooltip />
                </PieChart>
              </ResponsiveContainer>
            </div>
          )}
        </div>

        <div className="rounded-3xl bg-white border border-slate-200 shadow-sm overflow-hidden">
          <div className="px-6 py-5 border-b border-slate-100 flex items-center justify-between">
            <div>
              <h3 className="text-lg font-bold text-slate-900">Recent Tenants</h3>
              <p className="text-xs text-slate-500">Newest signups</p>
            </div>
            <Link to="/tenants" className="text-admin-600 text-xs font-semibold inline-flex items-center gap-1">
              View all <ArrowRight className="h-3 w-3" />
            </Link>
          </div>
          <div className="divide-y divide-slate-100 max-h-[260px] overflow-y-auto">
            {(activity?.recentTenants ?? []).map((t: any) => (
              <Link
                key={t.id}
                to={`/tenants/${t.id}`}
                className="px-6 py-3 flex items-center justify-between hover:bg-slate-50"
              >
                <div className="min-w-0">
                  <div className="font-medium text-slate-900 truncate">{t.name}</div>
                  <div className="text-xs text-slate-500">
                    {new Intl.DateTimeFormat('en-PK', { dateStyle: 'medium' }).format(new Date(t.createdAt))}
                  </div>
                </div>
                <span className={`inline-flex px-2 py-0.5 rounded-full text-[10px] font-bold ${
                  t.status === 'ACTIVE' ? 'bg-emerald-100 text-emerald-700' :
                  t.status === 'TRIAL' ? 'bg-blue-100 text-blue-700' :
                  t.status === 'SUSPENDED' ? 'bg-rose-100 text-rose-700' :
                  'bg-slate-100 text-slate-700'
                }`}>
                  {t.status}
                </span>
              </Link>
            ))}
            {(!activity?.recentTenants || activity.recentTenants.length === 0) && (
              <div className="p-6 text-sm text-slate-500 text-center">No tenants yet</div>
            )}
          </div>
        </div>
      </section>
    </div>
  );
}
