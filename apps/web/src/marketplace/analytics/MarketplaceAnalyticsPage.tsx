import { useState } from 'react';
import { useQuery } from '@tanstack/react-query';
import {
  BarChart3, TrendingUp, TrendingDown, ShoppingCart, DollarSign, Users,
  Star, Package, Sparkles, Award, Target,
} from 'lucide-react';
import { analyticsApi } from '../shared/marketplace.api';
import { ORDER_STATUS_META } from '../shared/status-utils';
import { getIndustryTheme } from '../shared/industry-themes';
import { useCurrentIndustry } from '@industries/_shared/registry/useCurrentIndustry';
import { formatPKR } from '@core/lib/format';

type Range = '7d' | '30d' | '90d' | 'year';

const RANGE_LABELS: Record<Range, string> = {
  '7d': 'Last 7 Days',
  '30d': 'Last 30 Days',
  '90d': 'Last 90 Days',
  'year': 'This Year',
};

export default function MarketplaceAnalyticsPage() {
  const industry = useCurrentIndustry();
  const theme = getIndustryTheme(industry?.id);
  const [range, setRange] = useState<Range>('30d');

  const { data, isLoading } = useQuery({
    queryKey: ['marketplace-analytics', range],
    queryFn: () => analyticsApi.get(range),
  });

  if (isLoading || !data) {
    return (
      <div className="min-h-[60vh] flex items-center justify-center">
        <div className="text-center">
          <Sparkles className="h-10 w-10 text-emerald-600 animate-pulse mx-auto" />
          <p className="mt-3 text-sm font-black text-slate-600">Loading analytics...</p>
        </div>
      </div>
    );
  }

  return (
    <div className="space-y-5 pb-10">
      <section className={`relative overflow-hidden rounded-3xl bg-gradient-to-br ${theme.gradient} text-white p-6 shadow-2xl`}>
        <div className="absolute -top-20 -right-20 h-64 w-64 rounded-full bg-white/10 blur-3xl" />
        <div className="relative flex items-center justify-between gap-4 flex-wrap">
          <div>
            <div className="inline-flex items-center gap-2 rounded-full bg-white/15 backdrop-blur px-3 py-1 text-xs font-black border border-white/20">
              <BarChart3 className="h-3.5 w-3.5" />
              Marketplace Analytics
            </div>
            <h1 className="mt-3 text-3xl sm:text-4xl font-black leading-tight">Insights & Reports</h1>
            <p className="mt-2 text-sm text-white/85 font-medium">Marketplace performance ka detailed breakdown</p>
          </div>
          <div className="flex gap-1">
            {(Object.entries(RANGE_LABELS) as [Range, string][]).map(([r, label]) => (
              <button
                key={r}
                onClick={() => setRange(r)}
                className={`px-3 py-1.5 rounded-lg text-xs font-black transition ${
                  range === r ? 'bg-white text-slate-900' : 'bg-white/15 text-white hover:bg-white/25'
                }`}
              >
                {label}
              </button>
            ))}
          </div>
        </div>
      </section>

      {/* Overview KPIs */}
      <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
        <BigKpi
          icon={ShoppingCart}
          label="Total Orders"
          value={data.overview.totalOrders}
          color="emerald"
        />
        <BigKpi
          icon={DollarSign}
          label="Total Revenue"
          value={`Rs ${formatPKR(data.overview.totalRevenue)}`}
          color="amber"
        />
        <BigKpi
          icon={Target}
          label="Avg Order Value"
          value={`Rs ${formatPKR(data.overview.avgOrderValue)}`}
          color="blue"
        />
        <BigKpi
          icon={Users}
          label="Total Customers"
          value={data.overview.totalCustomers}
          sub={`${data.overview.returningCustomers} returning`}
          color="purple"
        />
      </div>

      <div className="grid md:grid-cols-2 gap-4">
        <div className="rounded-3xl bg-white border-2 border-slate-200 p-5 shadow-sm">
          <div className="flex items-center gap-2 mb-3">
            <Award className="h-5 w-5 text-amber-600" />
            <h3 className="font-black text-slate-900">Performance</h3>
          </div>
          <div className="space-y-3">
            <PerfBar
              label="Conversion Rate"
              value={data.overview.conversionRate}
              max={100}
              color="emerald"
              suffix="%"
            />
            <PerfBar
              label="Avg Rating"
              value={data.overview.avgRating}
              max={5}
              color="amber"
              suffix="⭐"
            />
            <div className="pt-2 border-t border-slate-100">
              <div className="text-xs text-slate-600 font-bold">Active Products</div>
              <div className="text-2xl font-black text-slate-900 tabular-nums">{data.overview.activeProducts}</div>
            </div>
          </div>
        </div>

        <div className="rounded-3xl bg-white border-2 border-slate-200 p-5 shadow-sm">
          <div className="flex items-center gap-2 mb-3">
            <TrendingUp className="h-5 w-5 text-emerald-600" />
            <h3 className="font-black text-slate-900">Orders Trend</h3>
          </div>
          <div className="space-y-1">
            {data.ordersTrend.slice(-7).map((day) => {
              const maxCount = Math.max(...data.ordersTrend.map((d) => d.count), 1);
              const pct = (day.count / maxCount) * 100;
              return (
                <div key={day.date} className="flex items-center gap-2 text-xs">
                  <span className="w-16 text-slate-600 font-bold shrink-0">
                    {new Date(day.date).toLocaleDateString('en-PK', { day: 'numeric', month: 'short' })}
                  </span>
                  <div className="flex-1 h-6 rounded-lg bg-slate-100 overflow-hidden relative">
                    <div
                      className="h-full bg-gradient-to-r from-emerald-400 to-emerald-600 rounded-lg transition-all"
                      style={{ width: `${pct}%` }}
                    />
                    <div className="absolute inset-0 flex items-center px-2">
                      <span className="text-[10px] font-black text-slate-700">{day.count} orders</span>
                    </div>
                  </div>
                  <span className="w-20 text-right text-emerald-700 font-black tabular-nums shrink-0">
                    Rs {formatPKR(day.revenue)}
                  </span>
                </div>
              );
            })}
          </div>
        </div>
      </div>

      <div className="grid md:grid-cols-2 gap-4">
        <div className="rounded-3xl bg-white border-2 border-slate-200 p-5 shadow-sm">
          <div className="flex items-center gap-2 mb-3">
            <Package className="h-5 w-5 text-blue-600" />
            <h3 className="font-black text-slate-900">Top Products</h3>
          </div>
          <div className="space-y-2">
            {data.topProducts.slice(0, 5).map((p, i) => (
              <div key={p.productId} className="flex items-center gap-2 p-2 rounded-lg hover:bg-slate-50 transition">
                <div className="w-6 text-center font-black text-slate-600">#{i + 1}</div>
                <div className="h-10 w-10 rounded-lg bg-slate-100 overflow-hidden shrink-0">
                  {p.imageUrl ? (
                    <img src={p.imageUrl} alt="" className="w-full h-full object-cover" />
                  ) : (
                    <div className="w-full h-full flex items-center justify-center text-slate-400">
                      <Package className="h-4 w-4" />
                    </div>
                  )}
                </div>
                <div className="flex-1 min-w-0">
                  <div className="font-black text-sm text-slate-900 truncate">{p.name}</div>
                  <div className="text-[10px] text-slate-500 font-bold">{p.totalSold} sold</div>
                </div>
                <div className="text-right">
                  <div className="font-black text-emerald-700 text-sm tabular-nums">Rs {formatPKR(p.revenue)}</div>
                </div>
              </div>
            ))}
          </div>
        </div>

        <div className="rounded-3xl bg-white border-2 border-slate-200 p-5 shadow-sm">
          <div className="flex items-center gap-2 mb-3">
            <Users className="h-5 w-5 text-purple-600" />
            <h3 className="font-black text-slate-900">Top Customers</h3>
          </div>
          <div className="space-y-2">
            {data.topCustomers.slice(0, 5).map((c, i) => (
              <div key={c.customerId} className="flex items-center gap-2 p-2 rounded-lg hover:bg-slate-50 transition">
                <div className="w-6 text-center font-black text-slate-600">#{i + 1}</div>
                <div className="h-10 w-10 rounded-full bg-purple-100 text-purple-700 flex items-center justify-center font-black shrink-0">
                  {c.fullName.charAt(0)}
                </div>
                <div className="flex-1 min-w-0">
                  <div className="font-black text-sm text-slate-900 truncate">{c.fullName}</div>
                  <div className="text-[10px] text-slate-500 font-bold">{c.orderCount} orders</div>
                </div>
                <div className="text-right">
                  <div className="font-black text-purple-700 text-sm tabular-nums">Rs {formatPKR(c.totalSpent)}</div>
                </div>
              </div>
            ))}
          </div>
        </div>
      </div>

      <div className="grid md:grid-cols-2 gap-4">
        <div className="rounded-3xl bg-white border-2 border-slate-200 p-5 shadow-sm">
          <h3 className="font-black text-slate-900 mb-3">Orders by Status</h3>
          <div className="space-y-1.5">
            {Object.entries(data.ordersByStatus).map(([status, count]) => {
              const meta = ORDER_STATUS_META[status as keyof typeof ORDER_STATUS_META];
              if (!meta) return null;
              const total = Object.values(data.ordersByStatus).reduce((a, b) => a + b, 0);
              const pct = total > 0 ? (count / total) * 100 : 0;
              return (
                <div key={status} className="flex items-center gap-2 text-xs">
                  <span className="w-32 truncate">
                    <span className={`text-[10px] font-black px-1.5 py-0.5 rounded ${meta.bg} ${meta.color}`}>
                      {meta.label}
                    </span>
                  </span>
                  <div className="flex-1 h-5 rounded bg-slate-100 overflow-hidden relative">
                    <div className={`h-full ${meta.color.replace('text-', 'bg-')} opacity-30 rounded`} style={{ width: `${pct}%` }} />
                    <div className="absolute inset-0 flex items-center px-2 text-[10px] font-black">
                      {count} ({pct.toFixed(0)}%)
                    </div>
                  </div>
                </div>
              );
            })}
          </div>
        </div>

        <div className="rounded-3xl bg-white border-2 border-slate-200 p-5 shadow-sm">
          <h3 className="font-black text-slate-900 mb-3">Payment Methods</h3>
          <div className="space-y-2">
            {Object.entries(data.paymentMethodBreakdown).map(([method, stats]) => (
              <div key={method} className="flex items-center justify-between p-2 rounded-lg bg-slate-50 border border-slate-200">
                <div>
                  <div className="text-xs font-black text-slate-900">{method}</div>
                  <div className="text-[10px] text-slate-500 font-bold">{stats.count} orders</div>
                </div>
                <div className="text-sm font-black text-emerald-700 tabular-nums">Rs {formatPKR(stats.total)}</div>
              </div>
            ))}
          </div>
        </div>
      </div>

      <div className="rounded-3xl bg-white border-2 border-slate-200 p-5 shadow-sm">
        <div className="flex items-center gap-2 mb-3">
          <Star className="h-5 w-5 text-amber-500 fill-amber-500" />
          <h3 className="font-black text-slate-900">Ratings Breakdown</h3>
        </div>
        <div className="space-y-1.5">
          {data.reviewsBreakdown.map((r) => {
            const total = data.reviewsBreakdown.reduce((s, x) => s + x.count, 0);
            const pct = total > 0 ? (r.count / total) * 100 : 0;
            return (
              <div key={r.rating} className="flex items-center gap-2 text-xs">
                <span className="w-16 inline-flex items-center gap-0.5 font-black text-amber-700">
                  {r.rating} <Star className="h-3 w-3 fill-current" />
                </span>
                <div className="flex-1 h-5 rounded bg-slate-100 overflow-hidden relative">
                  <div className="h-full bg-gradient-to-r from-amber-400 to-amber-500 rounded" style={{ width: `${pct}%` }} />
                  <div className="absolute inset-0 flex items-center px-2 text-[10px] font-black text-slate-700">
                    {r.count} reviews ({pct.toFixed(0)}%)
                  </div>
                </div>
              </div>
            );
          })}
        </div>
      </div>
    </div>
  );
}

const KPI_COLORS: any = {
  emerald: 'bg-emerald-500',
  amber: 'bg-amber-500',
  blue: 'bg-blue-500',
  purple: 'bg-purple-500',
};

function BigKpi({ icon: Icon, label, value, sub, color }: any) {
  return (
    <div className="rounded-2xl bg-white border-2 border-slate-200 p-4 shadow-sm">
      <div className={`h-10 w-10 rounded-xl ${KPI_COLORS[color]} text-white flex items-center justify-center shadow-md`}>
        <Icon className="h-5 w-5" />
      </div>
      <div className="text-2xl font-black text-slate-900 tabular-nums mt-3">{value}</div>
      <div className="text-xs font-black text-slate-600 uppercase tracking-wide">{label}</div>
      {sub && <div className="text-[10px] text-slate-500 font-bold mt-0.5">{sub}</div>}
    </div>
  );
}

function PerfBar({ label, value, max, color, suffix }: any) {
  const pct = Math.min(100, (value / max) * 100);
  return (
    <div>
      <div className="flex items-center justify-between text-xs font-black mb-1">
        <span className="text-slate-700">{label}</span>
        <span className={`text-${color}-700`}>{value.toFixed(1)}{suffix}</span>
      </div>
      <div className="h-2 rounded-full bg-slate-100 overflow-hidden">
        <div className={`h-full bg-${color}-500 rounded-full transition-all`} style={{ width: `${pct}%` }} />
      </div>
    </div>
  );
}
