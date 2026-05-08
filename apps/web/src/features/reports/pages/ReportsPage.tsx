import { useState } from 'react';
import { useQuery } from '@tanstack/react-query';
import {
  BarChart3,
  TrendingUp,
  Award,
  PieChart as PieIcon,
  CreditCard,
} from 'lucide-react';
import {
  ResponsiveContainer,
  LineChart,
  Line,
  AreaChart,
  Area,
  BarChart,
  Bar,
  PieChart,
  Pie,
  Cell,
  XAxis,
  YAxis,
  Tooltip,
  CartesianGrid,
  Legend,
} from 'recharts';
import { reportsApi } from '@/api/reports.api';
import { formatPKR } from '@nafaa/shared-utils';

const dayLabels = (date: string) => {
  const d = new Date(date);
  return new Intl.DateTimeFormat('en-PK', { weekday: 'short', day: 'numeric' }).format(d);
};

export default function ReportsPage() {
  const [days, setDays] = useState(14);

  const { data: trend = [] } = useQuery({
    queryKey: ['reports-sales-trend', days],
    queryFn: () => reportsApi.salesTrend(days),
  });

  const { data: topProducts = [] } = useQuery({
    queryKey: ['reports-top-products'],
    queryFn: () => reportsApi.topProducts(10),
  });

  const { data: categoryBreakdown = [] } = useQuery({
    queryKey: ['reports-category-breakdown'],
    queryFn: reportsApi.categoryBreakdown,
  });

  const { data: paymentMethods = [] } = useQuery({
    queryKey: ['reports-payment-methods'],
    queryFn: reportsApi.paymentMethods,
  });

  const trendData = trend.map((p) => ({
    ...p,
    label: dayLabels(p.date),
  }));

  const totalRevenue = trendData.reduce((sum, p) => sum + p.sales, 0);
  const totalProfit = trendData.reduce((sum, p) => sum + p.profit, 0);
  const totalOrders = trendData.reduce((sum, p) => sum + p.orders, 0);

  const PIE_COLORS = ['#2c9466', '#3b82f6', '#f59e0b', '#ef4444', '#8b5cf6', '#ec4899', '#06b6d4', '#84cc16'];

  return (
    <div className="space-y-6">
      <section className="rounded-3xl bg-gradient-to-br from-slate-950 via-slate-900 to-violet-700 text-white p-6 shadow-soft">
        <div className="flex items-center justify-between gap-4 flex-wrap">
          <div>
            <div className="inline-flex items-center gap-2 rounded-full bg-white/10 px-3 py-1 text-xs font-medium">
              <BarChart3 className="h-3.5 w-3.5" />
              Business Intelligence
            </div>
            <h2 className="mt-3 text-3xl font-bold">Reports & Analytics</h2>
            <p className="mt-2 text-sm text-white/80">
              Aap ka business kis taraf ja raha hai — graphs aur insights ke saath.
            </p>
          </div>

          <div className="flex gap-2">
            {[7, 14, 30, 90].map((d) => (
              <button
                key={d}
                onClick={() => setDays(d)}
                className={`px-4 py-2 rounded-xl text-sm font-medium transition ${
                  days === d
                    ? 'bg-white text-slate-900'
                    : 'bg-white/10 text-white hover:bg-white/20'
                }`}
              >
                {d} days
              </button>
            ))}
          </div>
        </div>
      </section>

      <section className="grid sm:grid-cols-3 gap-4">
        <div className="rounded-2xl bg-white border border-slate-200 p-5 shadow-sm">
          <div className="flex items-center justify-between">
            <div>
              <div className="text-sm text-slate-500">Total Revenue</div>
              <div className="mt-2 text-2xl font-bold text-slate-900">{formatPKR(totalRevenue)}</div>
            </div>
            <div className="h-11 w-11 rounded-2xl bg-emerald-100 text-emerald-700 flex items-center justify-center">
              <TrendingUp className="h-5 w-5" />
            </div>
          </div>
        </div>

        <div className="rounded-2xl bg-white border border-slate-200 p-5 shadow-sm">
          <div className="flex items-center justify-between">
            <div>
              <div className="text-sm text-slate-500">Total Profit</div>
              <div className="mt-2 text-2xl font-bold text-slate-900">{formatPKR(totalProfit)}</div>
            </div>
            <div className="h-11 w-11 rounded-2xl bg-violet-100 text-violet-700 flex items-center justify-center">
              <Award className="h-5 w-5" />
            </div>
          </div>
        </div>

        <div className="rounded-2xl bg-white border border-slate-200 p-5 shadow-sm">
          <div className="flex items-center justify-between">
            <div>
              <div className="text-sm text-slate-500">Total Orders</div>
              <div className="mt-2 text-2xl font-bold text-slate-900">{totalOrders}</div>
            </div>
            <div className="h-11 w-11 rounded-2xl bg-blue-100 text-blue-700 flex items-center justify-center">
              <BarChart3 className="h-5 w-5" />
            </div>
          </div>
        </div>
      </section>

      <section className="rounded-3xl bg-white border border-slate-200 shadow-sm p-6">
        <div className="flex items-center justify-between mb-5">
          <div>
            <h3 className="text-xl font-bold text-slate-900">Sales Trend</h3>
            <p className="text-sm text-slate-500">Last {days} days revenue & profit</p>
          </div>
        </div>

        <div className="h-[320px]">
          <ResponsiveContainer width="100%" height="100%">
            <AreaChart data={trendData}>
              <defs>
                <linearGradient id="salesGrad" x1="0" y1="0" x2="0" y2="1">
                  <stop offset="0%" stopColor="#2c9466" stopOpacity={0.4} />
                  <stop offset="100%" stopColor="#2c9466" stopOpacity={0} />
                </linearGradient>
                <linearGradient id="profitGrad" x1="0" y1="0" x2="0" y2="1">
                  <stop offset="0%" stopColor="#8b5cf6" stopOpacity={0.4} />
                  <stop offset="100%" stopColor="#8b5cf6" stopOpacity={0} />
                </linearGradient>
              </defs>
              <CartesianGrid strokeDasharray="3 3" stroke="#e2e8f0" />
              <XAxis dataKey="label" stroke="#64748b" fontSize={12} />
              <YAxis stroke="#64748b" fontSize={12} tickFormatter={(v) => `Rs ${(v / 1000).toFixed(0)}k`} />
              <Tooltip
                formatter={(value: any) => formatPKR(Number(value))}
                contentStyle={{ borderRadius: 12, border: '1px solid #e2e8f0' }}
              />
              <Legend />
              <Area type="monotone" dataKey="sales" name="Sales" stroke="#2c9466" fill="url(#salesGrad)" strokeWidth={2} />
              <Area type="monotone" dataKey="profit" name="Profit" stroke="#8b5cf6" fill="url(#profitGrad)" strokeWidth={2} />
            </AreaChart>
          </ResponsiveContainer>
        </div>
      </section>

      <section className="grid lg:grid-cols-2 gap-6">
        <div className="rounded-3xl bg-white border border-slate-200 shadow-sm p-6">
          <div className="flex items-center justify-between mb-5">
            <div>
              <h3 className="text-xl font-bold text-slate-900">Top Products</h3>
              <p className="text-sm text-slate-500">Best sellers by revenue</p>
            </div>
            <Award className="h-5 w-5 text-amber-500" />
          </div>

          {topProducts.length === 0 ? (
            <div className="text-center py-12 text-sm text-slate-500">Abhi koi sales data nahi</div>
          ) : (
            <div className="h-[320px]">
              <ResponsiveContainer width="100%" height="100%">
                <BarChart data={topProducts.map((p) => ({
                  name: p.product?.name?.slice(0, 14) || 'Unknown',
                  revenue: p.revenue,
                  qty: p.quantitySold,
                }))} layout="vertical">
                  <CartesianGrid strokeDasharray="3 3" stroke="#e2e8f0" />
                  <XAxis type="number" stroke="#64748b" fontSize={11} tickFormatter={(v) => `${(v / 1000).toFixed(0)}k`} />
                  <YAxis type="category" dataKey="name" stroke="#64748b" fontSize={11} width={100} />
                  <Tooltip formatter={(value: any) => formatPKR(Number(value))} />
                  <Bar dataKey="revenue" fill="#2c9466" radius={[0, 8, 8, 0]} />
                </BarChart>
              </ResponsiveContainer>
            </div>
          )}
        </div>

        <div className="rounded-3xl bg-white border border-slate-200 shadow-sm p-6">
          <div className="flex items-center justify-between mb-5">
            <div>
              <h3 className="text-xl font-bold text-slate-900">Category Breakdown</h3>
              <p className="text-sm text-slate-500">Revenue by category</p>
            </div>
            <PieIcon className="h-5 w-5 text-violet-500" />
          </div>

          {categoryBreakdown.length === 0 ? (
            <div className="text-center py-12 text-sm text-slate-500">Abhi koi data nahi</div>
          ) : (
            <div className="h-[320px]">
              <ResponsiveContainer width="100%" height="100%">
                <PieChart>
                  <Pie
                    data={categoryBreakdown}
                    dataKey="revenue"
                    nameKey="name"
                    cx="50%"
                    cy="50%"
                    outerRadius={100}
                    innerRadius={60}
                    paddingAngle={2}
                    label={(entry) => entry.name}
                  >
                    {categoryBreakdown.map((c, idx) => (
                      <Cell key={c.name} fill={c.color || PIE_COLORS[idx % PIE_COLORS.length]} />
                    ))}
                  </Pie>
                  <Tooltip formatter={(value: any) => formatPKR(Number(value))} />
                </PieChart>
              </ResponsiveContainer>
            </div>
          )}
        </div>
      </section>

      <section className="rounded-3xl bg-white border border-slate-200 shadow-sm p-6">
        <div className="flex items-center justify-between mb-5">
          <div>
            <h3 className="text-xl font-bold text-slate-900">Payment Methods</h3>
            <p className="text-sm text-slate-500">Customer kaise pay kar rahe hain</p>
          </div>
          <CreditCard className="h-5 w-5 text-blue-500" />
        </div>

        {paymentMethods.length === 0 ? (
          <div className="text-center py-12 text-sm text-slate-500">Abhi koi data nahi</div>
        ) : (
          <div className="grid sm:grid-cols-2 lg:grid-cols-5 gap-4">
            {paymentMethods.map((pm, idx) => (
              <div
                key={pm.paymentMethod}
                className="rounded-2xl border border-slate-200 p-4"
                style={{ background: `linear-gradient(135deg, ${PIE_COLORS[idx % PIE_COLORS.length]}10, transparent)` }}
              >
                <div className="text-sm font-medium text-slate-700">{pm.paymentMethod}</div>
                <div className="mt-2 text-xl font-bold text-slate-900">{formatPKR(pm.total)}</div>
                <div className="text-xs text-slate-500 mt-1">{pm.count} transactions</div>
              </div>
            ))}
          </div>
        )}
      </section>
    </div>
  );
}
