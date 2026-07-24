import { useState } from 'react';
import { useQuery } from '@tanstack/react-query';
import {
  Filter, Eye, ShoppingCart, CreditCard, PackageCheck, TrendingDown,
  Sparkles, Clock, AlertTriangle, Users,
} from 'lucide-react';
import { funnelApi } from '../shared/marketplace.api';
import { getIndustryTheme } from '../shared/industry-themes';
import { useCurrentIndustry } from '@industries/_shared/registry/useCurrentIndustry';
import { formatPKR } from '@core/lib/format';

type Range = '7d' | '30d' | '90d' | 'year';

const RANGE_LABELS: Record<Range, string> = {
  '7d': 'Last 7 Days', '30d': 'Last 30 Days', '90d': 'Last 90 Days', 'year': 'This Year',
};

export default function SalesFunnelPage() {
  const industry = useCurrentIndustry();
  const theme = getIndustryTheme(industry?.id);
  const [range, setRange] = useState<Range>('30d');

  const { data, isLoading } = useQuery({
    queryKey: ['sales-funnel', range],
    queryFn: () => funnelApi.get(range),
  });

  if (isLoading || !data) {
    return (
      <div className="min-h-[60vh] flex items-center justify-center">
        <div className="text-center">
          <Sparkles className="h-10 w-10 text-emerald-600 animate-pulse mx-auto" />
          <p className="mt-3 text-sm font-black text-slate-600">Loading funnel data...</p>
        </div>
      </div>
    );
  }

  const funnelSteps = [
    { label: 'Product Views', value: data.overview.productViews, icon: Eye, color: 'bg-blue-500' },
    { label: 'Carts Created', value: data.overview.cartsCreated, icon: ShoppingCart, color: 'bg-purple-500' },
    { label: 'Checkouts Started', value: data.overview.checkoutsStarted, icon: CreditCard, color: 'bg-orange-500' },
    { label: 'Orders Placed', value: data.overview.ordersPlaced, icon: PackageCheck, color: 'bg-emerald-500' },
    { label: 'Orders Delivered', value: data.overview.ordersDelivered, icon: PackageCheck, color: 'bg-green-600' },
  ];

  return (
    <div className="space-y-5 pb-10">
      {/* HERO */}
      <section className={`relative overflow-hidden rounded-3xl bg-gradient-to-br ${theme.gradient} text-white p-6 shadow-2xl`}>
        <div className="absolute -top-20 -right-20 h-64 w-64 rounded-full bg-white/10 blur-3xl" />
        <div className="relative flex items-center justify-between gap-4 flex-wrap">
          <div>
            <div className="inline-flex items-center gap-2 rounded-full bg-white/15 backdrop-blur px-3 py-1 text-xs font-black border border-white/20">
              <Filter className="h-3.5 w-3.5" />
              Sales Funnel Analytics
            </div>
            <h1 className="mt-3 text-3xl sm:text-4xl font-black leading-tight">Conversion Funnel</h1>
            <p className="mt-2 text-sm text-white/85 font-medium">Track customer journey se drop-off points identify karein</p>
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

        <div className="relative grid grid-cols-2 md:grid-cols-5 gap-2 mt-6">
          <HeroKpi label="Overall Conv." value={`${data.conversionRates.overallConversion.toFixed(2)}%`} icon={TrendingDown} highlight />
          <HeroKpi label="View→Cart" value={`${data.conversionRates.viewToCart.toFixed(1)}%`} icon={ShoppingCart} />
          <HeroKpi label="Cart→Checkout" value={`${data.conversionRates.cartToCheckout.toFixed(1)}%`} icon={CreditCard} />
          <HeroKpi label="Checkout→Order" value={`${data.conversionRates.checkoutToOrder.toFixed(1)}%`} icon={PackageCheck} />
          <HeroKpi label="Delivered" value={`${data.conversionRates.orderToDelivered.toFixed(1)}%`} icon={PackageCheck} />
        </div>
      </section>

      {/* Funnel Visualization */}
      <div className="rounded-3xl bg-white border-2 border-slate-200 p-6 shadow-sm">
        <h3 className="font-black text-slate-900 text-lg mb-4 flex items-center gap-2">
          <Filter className="h-5 w-5 text-purple-600" />
          Customer Journey Funnel
        </h3>
        <div className="space-y-3">
          {funnelSteps.map((step, i) => {
            const maxVal = funnelSteps[0].value || 1;
            const pct = (step.value / maxVal) * 100;
            const prevValue = i > 0 ? funnelSteps[i - 1].value : step.value;
            const dropOffPct = i > 0 && prevValue > 0 ? ((prevValue - step.value) / prevValue) * 100 : 0;
            const StepIcon = step.icon;

            return (
              <div key={step.label}>
                <div className="flex items-center justify-between mb-1">
                  <div className="flex items-center gap-2">
                    <div className={`h-8 w-8 rounded-lg ${step.color} text-white flex items-center justify-center shadow`}>
                      <StepIcon className="h-4 w-4" />
                    </div>
                    <span className="font-black text-slate-900">{step.label}</span>
                  </div>
                  <div className="flex items-center gap-3">
                    {i > 0 && dropOffPct > 0 && (
                      <span className="text-[10px] font-black px-2 py-0.5 rounded-full bg-rose-100 text-rose-700 inline-flex items-center gap-1">
                        <TrendingDown className="h-2.5 w-2.5" />
                        -{dropOffPct.toFixed(1)}% dropped
                      </span>
                    )}
                    <span className="font-black text-slate-900 tabular-nums">{step.value.toLocaleString()}</span>
                  </div>
                </div>
                <div className="h-8 rounded-lg bg-slate-100 overflow-hidden relative">
                  <div
                    className={`h-full ${step.color} rounded-lg transition-all flex items-center px-3`}
                    style={{ width: `${pct}%` }}
                  >
                    <span className="text-xs font-black text-white">{pct.toFixed(1)}%</span>
                  </div>
                </div>
              </div>
            );
          })}
        </div>

        {/* Total Revenue */}
        <div className="mt-4 pt-4 border-t-2 border-slate-100 flex items-center justify-between">
          <span className="font-black text-slate-900">Total Revenue in {RANGE_LABELS[range]}:</span>
          <span className="text-2xl font-black text-emerald-700 tabular-nums">Rs {formatPKR(data.overview.totalRevenue)}</span>
        </div>
      </div>

      {/* Drop-off Products */}
      <div className="rounded-3xl bg-white border-2 border-slate-200 p-5 shadow-sm">
        <h3 className="font-black text-slate-900 text-lg mb-4 flex items-center gap-2">
          <AlertTriangle className="h-5 w-5 text-orange-500" />
          High Drop-off Products
          <span className="text-[10px] font-bold text-slate-500 ml-auto">Products with low view→order rate</span>
        </h3>
        {data.topDroppedProducts.length === 0 ? (
          <div className="py-6 text-center text-sm text-slate-500 font-bold">No data</div>
        ) : (
          <div className="space-y-2">
            {data.topDroppedProducts.slice(0, 5).map((p) => (
              <div key={p.productId} className="flex items-center gap-3 p-3 rounded-xl bg-slate-50 hover:bg-slate-100 transition">
                <div className="h-12 w-12 rounded-lg bg-white overflow-hidden shrink-0 border border-slate-200">
                  {p.imageUrl ? (
                    <img src={p.imageUrl} alt="" className="w-full h-full object-cover" />
                  ) : (
                    <div className="w-full h-full flex items-center justify-center text-slate-400">📦</div>
                  )}
                </div>
                <div className="flex-1 min-w-0">
                  <div className="font-black text-slate-900 text-sm truncate">{p.name}</div>
                  <div className="text-[10px] text-slate-500 font-bold mt-0.5">
                    {p.views} views → {p.addedToCart} carts → {p.ordered} orders
                  </div>
                </div>
                <div className="text-right shrink-0">
                  <div className="font-black text-rose-700 tabular-nums">{p.dropOffRate.toFixed(1)}%</div>
                  <div className="text-[9px] text-slate-500 font-bold uppercase">drop-off</div>
                </div>
              </div>
            ))}
          </div>
        )}
      </div>

      {/* Hourly Activity Heatmap */}
      <div className="rounded-3xl bg-white border-2 border-slate-200 p-5 shadow-sm">
        <h3 className="font-black text-slate-900 text-lg mb-4 flex items-center gap-2">
          <Clock className="h-5 w-5 text-blue-600" />
          Peak Hours (24-hour activity)
        </h3>
        <div className="grid grid-cols-12 gap-1">
          {data.hourlyActivity.map((h) => {
            const maxOrders = Math.max(...data.hourlyActivity.map((x) => x.orders), 1);
            const intensity = h.orders / maxOrders;
            return (
              <div
                key={h.hour}
                className="rounded-lg p-2 text-center border border-slate-100"
                style={{
                  backgroundColor: intensity > 0 ? `rgba(139, 92, 246, ${0.15 + intensity * 0.7})` : '#f8fafc',
                }}
                title={`${h.hour}:00 — ${h.views} views, ${h.orders} orders`}
              >
                <div className="text-[9px] font-bold text-slate-600">{h.hour}h</div>
                <div className={`text-[10px] font-black ${intensity > 0.5 ? 'text-white' : 'text-slate-900'}`}>
                  {h.orders}
                </div>
              </div>
            );
          })}
        </div>
        <p className="text-[10px] text-slate-500 font-bold mt-3 text-center">Numbers = orders per hour · Darker = more activity</p>
      </div>

      {/* Cohort Retention */}
      {data.cohortAnalysis.length > 0 && (
        <div className="rounded-3xl bg-white border-2 border-slate-200 p-5 shadow-sm">
          <h3 className="font-black text-slate-900 text-lg mb-4 flex items-center gap-2">
            <Users className="h-5 w-5 text-emerald-600" />
            Cohort Retention Analysis
          </h3>
          <div className="overflow-x-auto">
            <table className="w-full text-xs">
              <thead>
                <tr className="border-b-2 border-slate-100">
                  <th className="text-left py-2 font-black text-slate-700">Week</th>
                  <th className="text-right py-2 font-black text-slate-700">New</th>
                  <th className="text-right py-2 font-black text-slate-700">Week 1</th>
                  <th className="text-right py-2 font-black text-slate-700">Week 2</th>
                  <th className="text-right py-2 font-black text-slate-700">Week 4</th>
                  <th className="text-right py-2 font-black text-slate-700">Retention</th>
                </tr>
              </thead>
              <tbody>
                {data.cohortAnalysis.slice(0, 8).map((c) => (
                  <tr key={c.week} className="border-b border-slate-100">
                    <td className="py-2 font-bold text-slate-700">{c.week}</td>
                    <td className="text-right py-2 font-black text-slate-900 tabular-nums">{c.newCustomers}</td>
                    <td className="text-right py-2 font-bold text-slate-600 tabular-nums">{c.returnedWeek1}</td>
                    <td className="text-right py-2 font-bold text-slate-600 tabular-nums">{c.returnedWeek2}</td>
                    <td className="text-right py-2 font-bold text-slate-600 tabular-nums">{c.returnedWeek4}</td>
                    <td className="text-right py-2">
                      <span className={`font-black tabular-nums ${
                        c.retentionRate >= 30 ? 'text-emerald-700' :
                        c.retentionRate >= 15 ? 'text-amber-700' : 'text-rose-700'
                      }`}>
                        {c.retentionRate.toFixed(1)}%
                      </span>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>
      )}

      {/* Payment Failures */}
      {data.paymentFailures.length > 0 && (
        <div className="rounded-3xl bg-white border-2 border-slate-200 p-5 shadow-sm">
          <h3 className="font-black text-slate-900 text-lg mb-4 flex items-center gap-2">
            <CreditCard className="h-5 w-5 text-rose-600" />
            Payment Failure Rate by Method
          </h3>
          <div className="space-y-2">
            {data.paymentFailures.map((p) => (
              <div key={p.method} className="flex items-center gap-3 p-3 rounded-xl bg-slate-50">
                <div className="flex-1">
                  <div className="font-black text-slate-900">{p.method}</div>
                  <div className="text-[10px] text-slate-500 font-bold">{p.attempts} attempts · {p.failures} failed</div>
                </div>
                <div className="w-32 h-2 rounded-full bg-slate-200 overflow-hidden">
                  <div
                    className={`h-full ${p.failureRate > 20 ? 'bg-rose-500' : p.failureRate > 10 ? 'bg-amber-500' : 'bg-emerald-500'}`}
                    style={{ width: `${Math.min(100, p.failureRate)}%` }}
                  />
                </div>
                <span className={`font-black tabular-nums text-sm ${
                  p.failureRate > 20 ? 'text-rose-700' : p.failureRate > 10 ? 'text-amber-700' : 'text-emerald-700'
                }`}>
                  {p.failureRate.toFixed(1)}%
                </span>
              </div>
            ))}
          </div>
        </div>
      )}
    </div>
  );
}

function HeroKpi({ label, value, icon: Icon, highlight }: any) {
  return (
    <div className={`rounded-xl backdrop-blur border p-2.5 ${
      highlight ? 'bg-emerald-500/25 border-emerald-300/50' : 'bg-white/10 border-white/20'
    }`}>
      <div className="flex items-center gap-1.5 mb-1">
        <Icon className="h-3 w-3 opacity-80" />
        <div className="text-[9px] uppercase tracking-wider font-black opacity-90 truncate">{label}</div>
      </div>
      <div className="text-xl font-black leading-none tabular-nums">{value}</div>
    </div>
  );
}
