import { useQuery } from '@tanstack/react-query';
import {
  TrendingUp, DollarSign, AlertCircle, Crown,
} from 'lucide-react';
import {
  ResponsiveContainer, BarChart, Bar, XAxis, YAxis, CartesianGrid,
  Tooltip, AreaChart, Area,
} from 'recharts';
import { adminAnalyticsApi } from '@/api/admin-analytics.api';
import { formatPKR } from '@/lib/format';

export default function AnalyticsPage() {
  const { data: mrr } = useQuery({
    queryKey: ['admin-mrr-arr'],
    queryFn: adminAnalyticsApi.mrrArr,
  });

  const { data: revenue = [] } = useQuery({
    queryKey: ['admin-monthly-revenue'],
    queryFn: () => adminAnalyticsApi.monthlyRevenue(12),
  });

  const { data: churn = [] } = useQuery({
    queryKey: ['admin-churn'],
    queryFn: () => adminAnalyticsApi.churn(6),
  });

  const { data: topTenants = [] } = useQuery({
    queryKey: ['admin-top-tenants'],
    queryFn: adminAnalyticsApi.topTenants,
  });

  return (
    <div className="space-y-6">
      <section className="rounded-3xl bg-gradient-to-br from-admin-950 via-violet-900 to-admin-700 text-white p-6 shadow-soft">
        <div className="inline-flex items-center gap-2 rounded-full bg-white/10 px-3 py-1 text-xs font-medium">
          <TrendingUp className="h-3.5 w-3.5" />
          Business Intelligence
        </div>
        <h2 className="mt-3 text-3xl font-bold">Revenue Analytics</h2>
        <p className="mt-2 text-sm text-white/80">
          MRR, ARR, churn rate, top revenue tenants
        </p>
      </section>

      <section className="grid sm:grid-cols-3 gap-4">
        <div className="rounded-2xl bg-gradient-to-br from-emerald-600 to-emerald-800 text-white p-5 shadow-sm">
          <div className="text-sm text-white/80">MRR (Monthly Recurring)</div>
          <div className="mt-2 text-3xl font-bold">{formatPKR(mrr?.mrr ?? 0)}</div>
          <div className="text-xs text-white/80 mt-1">{mrr?.activeSubscriptions ?? 0} active subs</div>
        </div>
        <div className="rounded-2xl bg-gradient-to-br from-blue-600 to-blue-800 text-white p-5 shadow-sm">
          <div className="text-sm text-white/80">ARR (Annual Recurring)</div>
          <div className="mt-2 text-3xl font-bold">{formatPKR(mrr?.arr ?? 0)}</div>
          <div className="text-xs text-white/80 mt-1">Projected annual</div>
        </div>
        <div className="rounded-2xl bg-white border border-slate-200 p-5 shadow-sm">
          <div className="text-sm text-slate-500">Active Subscriptions</div>
          <div className="mt-2 text-3xl font-bold text-slate-900">{mrr?.activeSubscriptions ?? 0}</div>
          <div className="text-xs text-slate-500 mt-1">All paid plans</div>
        </div>
      </section>

      <section className="grid lg:grid-cols-2 gap-6">
        <div className="rounded-3xl bg-white border border-slate-200 shadow-sm p-6">
          <h3 className="text-lg font-bold mb-4">Monthly Revenue (12 months)</h3>
          <div className="h-[260px]">
            <ResponsiveContainer width="100%" height="100%">
              <AreaChart data={revenue}>
                <defs>
                  <linearGradient id="revGrad" x1="0" y1="0" x2="0" y2="1">
                    <stop offset="0%" stopColor="#6366f1" stopOpacity={0.4} />
                    <stop offset="100%" stopColor="#6366f1" stopOpacity={0} />
                  </linearGradient>
                </defs>
                <CartesianGrid strokeDasharray="3 3" stroke="#e2e8f0" />
                <XAxis dataKey="month" stroke="#64748b" fontSize={11} />
                <YAxis stroke="#64748b" fontSize={11} tickFormatter={(v) => `${(v / 1000).toFixed(0)}k`} />
                <Tooltip formatter={(v: any) => formatPKR(Number(v))} />
                <Area type="monotone" dataKey="revenue" stroke="#6366f1" fill="url(#revGrad)" strokeWidth={2} />
              </AreaChart>
            </ResponsiveContainer>
          </div>
        </div>

        <div className="rounded-3xl bg-white border border-slate-200 shadow-sm p-6">
          <h3 className="text-lg font-bold mb-4">Churn (Cancelled subs / month)</h3>
          <div className="h-[260px]">
            <ResponsiveContainer width="100%" height="100%">
              <BarChart data={churn}>
                <CartesianGrid strokeDasharray="3 3" stroke="#e2e8f0" />
                <XAxis dataKey="month" stroke="#64748b" fontSize={11} />
                <YAxis stroke="#64748b" fontSize={11} />
                <Tooltip />
                <Bar dataKey="churned" fill="#ef4444" radius={[8, 8, 0, 0]} />
              </BarChart>
            </ResponsiveContainer>
          </div>
        </div>
      </section>

      <section className="rounded-3xl bg-white border border-slate-200 shadow-sm overflow-hidden">
        <div className="px-6 py-4 border-b border-slate-100 flex items-center gap-2">
          <Crown className="h-5 w-5 text-amber-600" />
          <h3 className="font-bold">Top Revenue Tenants</h3>
        </div>
        <div className="divide-y divide-slate-100">
          {topTenants.length === 0 ? (
            <div className="p-6 text-sm text-slate-500 text-center">No revenue yet</div>
          ) : (
            topTenants.map((t: any, idx: number) => (
              <div key={t.tenantId} className="px-6 py-3 flex items-center justify-between">
                <div className="flex items-center gap-3 min-w-0">
                  <div className={`h-9 w-9 rounded-full flex items-center justify-center font-bold text-xs ${
                    idx === 0 ? 'bg-amber-100 text-amber-700' :
                    idx === 1 ? 'bg-slate-200 text-slate-700' :
                    idx === 2 ? 'bg-orange-100 text-orange-700' :
                    'bg-slate-100 text-slate-600'
                  }`}>
                    #{idx + 1}
                  </div>
                  <div className="min-w-0">
                    <div className="font-semibold truncate">{t.tenant?.name || '—'}</div>
                    <div className="text-xs text-slate-500">{t.paymentsCount} payments</div>
                  </div>
                </div>
                <div className="font-bold text-emerald-700">{formatPKR(t.totalPaid)}</div>
              </div>
            ))
          )}
        </div>
      </section>
    </div>
  );
}
