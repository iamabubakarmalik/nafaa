import { useState } from 'react';
import { useQuery } from '@tanstack/react-query';
import { Link } from 'react-router-dom';
import {
  BarChart3, TrendingUp, TrendingDown, Award, Users, Package, Target,
  ShoppingCart, Crown, Activity, DollarSign, Calendar, Receipt, Sparkles,
  PieChart as PieIcon, LineChart as LineIcon, BarChart2, Zap, Star,
  RefreshCw, Download, Filter, Wallet, ArrowRight, ArrowUpRight, ArrowDownRight,
  CreditCard, Banknote, Smartphone, Building2, Layers, Boxes,
} from 'lucide-react';
import {
  ResponsiveContainer, AreaChart, Area, BarChart, Bar, PieChart, Pie, Cell,
  XAxis, YAxis, Tooltip, CartesianGrid, Legend, LineChart, Line,
  ComposedChart, RadarChart, Radar, PolarGrid, PolarAngleAxis, PolarRadiusAxis,
  ScatterChart, Scatter,
} from 'recharts';
import { reportsApi } from '@/api/reports.api';
import { formatPKR, formatPKRFull } from '@/lib/format';
import { Button } from '@/components/ui/Button';

const dayLabel = (date: string) => {
  const d = new Date(date);
  return new Intl.DateTimeFormat('en-PK', { month: 'short', day: 'numeric' }).format(d);
};

type Tab = 'overview' | 'sales' | 'products' | 'customers' | 'staff' | 'inventory' | 'patterns';

const TAB_CONFIG: Array<{ id: Tab; label: string; icon: any; color: string }> = [
  { id: 'overview', label: 'Overview', icon: BarChart3, color: 'violet' },
  { id: 'sales', label: 'Sales Analytics', icon: TrendingUp, color: 'emerald' },
  { id: 'products', label: 'Products', icon: Package, color: 'blue' },
  { id: 'customers', label: 'Customers', icon: Users, color: 'pink' },
  { id: 'staff', label: 'Staff', icon: Crown, color: 'amber' },
  { id: 'inventory', label: 'Inventory', icon: Boxes, color: 'orange' },
  { id: 'patterns', label: 'Patterns', icon: Activity, color: 'cyan' },
];

const PIE_COLORS = ['#10b981', '#3b82f6', '#f59e0b', '#ef4444', '#8b5cf6', '#ec4899', '#06b6d4', '#84cc16', '#f97316', '#14b8a6'];

const PAYMENT_ICONS: Record<string, any> = {
  CASH: Banknote, CARD: CreditCard, JAZZCASH: Smartphone,
  EASYPAISA: Zap, BANK_TRANSFER: Building2,
};

export default function ReportsPage() {
  const [days, setDays] = useState(14);
  const [tab, setTab] = useState<Tab>('overview');

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
  const { data: topCustomers = [] } = useQuery({
    queryKey: ['reports-top-customers'],
    queryFn: () => reportsApi.topCustomers(10),
  });
  const { data: cashiers = [] } = useQuery({
    queryKey: ['reports-cashiers', days],
    queryFn: () => reportsApi.cashierPerformance(days),
  });
  const { data: profitLoss } = useQuery({
    queryKey: ['reports-pl', days],
    queryFn: () => reportsApi.profitLoss(days),
  });
  const { data: inventoryValue } = useQuery({
    queryKey: ['reports-inventory'],
    queryFn: reportsApi.inventoryValue,
  });
  const { data: hourlyToday = [] } = useQuery({
    queryKey: ['reports-hourly'],
    queryFn: reportsApi.hourlyToday,
  });
  const { data: expenseBreakdown } = useQuery({
    queryKey: ['reports-expenses', days],
    queryFn: () => reportsApi.expenseBreakdown(days),
  });
  const { data: weekdayPattern = [] } = useQuery({
    queryKey: ['reports-weekday', days],
    queryFn: () => reportsApi.weekdayPattern(Math.max(days, 30)),
  });
  const { data: monthlyComparison = [] } = useQuery({
    queryKey: ['reports-monthly'],
    queryFn: reportsApi.monthlyComparison,
  });
  const { data: salesVsExpenses = [] } = useQuery({
    queryKey: ['reports-sve', days],
    queryFn: () => reportsApi.salesVsExpenses(days),
  });
  const { data: customerAcquisition = [] } = useQuery({
    queryKey: ['reports-acq', days],
    queryFn: () => reportsApi.customerAcquisition(days),
  });

  const trendData = trend.map((p) => ({ ...p, label: dayLabel(p.date) }));
  const sveData = salesVsExpenses.map((p) => ({ ...p, label: dayLabel(p.date) }));
  const acqData = customerAcquisition.map((p) => ({ ...p, label: dayLabel(p.date) }));

  const totalRevenue = trend.reduce((s, p) => s + p.sales, 0);
  const totalProfit = trend.reduce((s, p) => s + p.profit, 0);
  const totalOrders = trend.reduce((s, p) => s + p.orders, 0);
  const aov = totalOrders > 0 ? totalRevenue / totalOrders : 0;

  return (
    <div className="space-y-6">
      {/* ═══ HERO ═══ */}
      <section className="relative overflow-hidden rounded-3xl bg-gradient-to-br from-slate-950 via-violet-900 to-purple-700 text-white p-6 sm:p-8 shadow-2xl">
        <div className="absolute -top-16 -right-16 h-48 w-48 rounded-full bg-violet-400/20 blur-3xl" />
        <div className="absolute -bottom-16 -left-16 h-48 w-48 rounded-full bg-pink-400/15 blur-3xl" />

        <div className="relative flex flex-col lg:flex-row lg:items-center lg:justify-between gap-6">
          <div>
            <div className="inline-flex items-center gap-2 rounded-full bg-white/10 backdrop-blur px-3 py-1 text-xs font-semibold">
              <Sparkles className="h-3.5 w-3.5 text-amber-300" />
              Business Intelligence Center
            </div>
            <h1 className="mt-3 text-3xl sm:text-4xl font-extrabold leading-tight">
              Reports & Analytics
            </h1>
            <p className="mt-2 text-sm text-white/80">
              Complete business insights — charts, trends, patterns aur predictions
            </p>
          </div>

          <div className="flex gap-2 flex-wrap">
            {[7, 14, 30, 90].map((d) => (
              <button
                key={d}
                onClick={() => setDays(d)}
                className={`px-4 py-2 rounded-xl text-sm font-bold transition ${
                  days === d
                    ? 'bg-white text-slate-900 shadow-lg'
                    : 'bg-white/10 text-white hover:bg-white/20 backdrop-blur'
                }`}
              >
                {d} days
              </button>
            ))}
          </div>
        </div>
      </section>

      {/* ═══ TAB SWITCHER ═══ */}
      <section className="flex gap-2 overflow-x-auto pb-2">
        {TAB_CONFIG.map((t) => {
          const Icon = t.icon;
          const active = tab === t.id;
          return (
            <button
              key={t.id}
              onClick={() => setTab(t.id)}
              className={`inline-flex items-center gap-2 px-4 py-2.5 rounded-xl text-sm font-extrabold whitespace-nowrap transition border-2 ${
                active
                  ? 'bg-violet-600 text-white border-violet-600 shadow-lg shadow-violet-500/30'
                  : 'bg-white text-slate-700 border-slate-200 hover:border-violet-300'
              }`}
            >
              <Icon className="h-4 w-4" />
              {t.label}
            </button>
          );
        })}
      </section>

      {/* ═══ OVERVIEW TAB ═══ */}
      {tab === 'overview' && (
        <>
          {/* Hero Stats */}
          <section className="grid sm:grid-cols-2 lg:grid-cols-4 gap-4">
            <KpiCard label="Total Revenue" value={formatPKR(totalRevenue)} icon={TrendingUp} color="emerald" />
            <KpiCard label="Total Profit" value={formatPKR(totalProfit)} icon={Target} color="violet" isHighlight />
            <KpiCard label="Total Orders" value={String(totalOrders)} icon={ShoppingCart} color="blue" />
            <KpiCard label="Avg Order Value" value={formatPKR(aov)} icon={DollarSign} color="amber" />
          </section>

          {/* P&L Statement */}
          {profitLoss && (
            <section className="rounded-3xl bg-white border border-slate-200 shadow-sm p-6">
              <div className="flex items-center justify-between mb-5 flex-wrap gap-2">
                <div>
                  <h3 className="text-xl font-bold text-slate-900">Profit & Loss Statement</h3>
                  <p className="text-sm text-slate-500">{days} days complete breakdown</p>
                </div>
                <div className={`px-3 py-1.5 rounded-xl text-sm font-extrabold ${
                  profitLoss.netProfit >= 0 ? 'bg-emerald-100 text-emerald-700' : 'bg-rose-100 text-rose-700'
                }`}>
                  Net Margin: {profitLoss.netMargin.toFixed(1)}%
                </div>
              </div>

              <div className="grid lg:grid-cols-2 gap-6">
                {/* Left: P&L lines */}
                <div className="space-y-2">
                  <PnLLine label="Revenue" value={profitLoss.revenue} type="positive" />
                  {profitLoss.discount > 0 && (
                    <PnLLine label="Discount Given" value={-profitLoss.discount} type="negative" />
                  )}
                  {profitLoss.returns > 0 && (
                    <PnLLine label="Returns" value={-profitLoss.returns} type="negative" />
                  )}
                  <PnLLine label="Net Revenue" value={profitLoss.netRevenue} type="bold" />
                  <PnLLine label="Cost of Goods (COGS)" value={-profitLoss.cogs} type="negative" />
                  <PnLLine
                    label="Gross Profit"
                    value={profitLoss.grossProfit}
                    type="bold"
                    sub={`${profitLoss.grossMargin.toFixed(1)}% margin`}
                  />
                  <PnLLine label="Operating Expenses" value={-profitLoss.expenses} type="negative" />
                  <PnLLine
                    label="Net Profit"
                    value={profitLoss.netProfit}
                    type="highlight"
                    sub={`${profitLoss.netMargin.toFixed(1)}% margin`}
                  />
                </div>

                {/* Right: Mini stats */}
                <div className="grid grid-cols-2 gap-3">
                  <MiniStat label="Orders" value={profitLoss.orderCount} color="blue" icon={ShoppingCart} />
                  <MiniStat label="Returns" value={profitLoss.returnCount} color="rose" icon={ArrowDownRight} />
                  <MiniStat label="Paid" value={formatPKR(profitLoss.paid)} color="emerald" icon={CreditCard} />
                  <MiniStat label="Credit" value={formatPKR(profitLoss.credit)} color="amber" icon={Wallet} />
                  <MiniStat label="Purchases" value={formatPKR(profitLoss.purchases)} color="violet" icon={Package} />
                  <MiniStat label="Discount" value={formatPKR(profitLoss.discount)} color="pink" icon={Star} />
                </div>
              </div>
            </section>
          )}

          {/* Composed Chart: Sales + Profit + Orders */}
          <section className="rounded-3xl bg-white border border-slate-200 shadow-sm p-6">
            <div className="flex items-center justify-between mb-5">
              <div>
                <h3 className="text-xl font-bold text-slate-900">Revenue, Profit & Orders Trend</h3>
                <p className="text-sm text-slate-500">Composed analysis ({days} days)</p>
              </div>
            </div>
            <div className="h-[360px]">
              <ResponsiveContainer width="100%" height="100%">
                <ComposedChart data={trendData}>
                  <defs>
                    <linearGradient id="salesGradOv" x1="0" y1="0" x2="0" y2="1">
                      <stop offset="0%" stopColor="#10b981" stopOpacity={0.5} />
                      <stop offset="100%" stopColor="#10b981" stopOpacity={0} />
                    </linearGradient>
                  </defs>
                  <CartesianGrid strokeDasharray="3 3" stroke="#e2e8f0" />
                  <XAxis dataKey="label" stroke="#64748b" fontSize={11} />
                  <YAxis yAxisId="left" stroke="#64748b" fontSize={11} tickFormatter={(v) => `${(v / 1000).toFixed(0)}k`} />
                  <YAxis yAxisId="right" orientation="right" stroke="#64748b" fontSize={11} />
                  <Tooltip
                    formatter={(value: any, name: any) =>
                      name === 'Orders' ? value : formatPKR(Number(value))
                    }
                    contentStyle={{ borderRadius: 12, border: '2px solid #e2e8f0' }}
                  />
                  <Legend wrapperStyle={{ fontSize: 12 }} />
                  <Area yAxisId="left" type="monotone" dataKey="sales" name="Sales" fill="url(#salesGradOv)" stroke="#10b981" strokeWidth={2.5} />
                  <Bar yAxisId="left" dataKey="profit" name="Profit" fill="#8b5cf6" radius={[4, 4, 0, 0]} barSize={20} />
                  <Line yAxisId="right" type="monotone" dataKey="orders" name="Orders" stroke="#f59e0b" strokeWidth={2.5} dot={{ r: 4 }} />
                </ComposedChart>
              </ResponsiveContainer>
            </div>
          </section>

          {/* Hourly + Payment Methods */}
          <section className="grid lg:grid-cols-2 gap-6">
            <ChartCard title="Today's Hourly Activity" subtitle="Hour-by-hour sales pattern" icon={Activity}>
              {hourlyToday.length > 0 ? (
                <ResponsiveContainer width="100%" height="100%">
                  <BarChart data={hourlyToday.filter((h) => h.sales > 0 || (h.hour >= 9 && h.hour <= 22)).map((h) => ({
                    hour: h.hour < 12 ? `${h.hour}AM` : h.hour === 12 ? '12PM' : `${h.hour - 12}PM`,
                    sales: h.sales,
                    orders: h.orders,
                  }))}>
                    <CartesianGrid strokeDasharray="3 3" stroke="#e2e8f0" />
                    <XAxis dataKey="hour" stroke="#64748b" fontSize={10} />
                    <YAxis stroke="#64748b" fontSize={11} tickFormatter={(v) => `${(v / 1000).toFixed(0)}k`} />
                    <Tooltip formatter={(value: any) => formatPKR(Number(value))} contentStyle={{ borderRadius: 12 }} />
                    <Bar dataKey="sales" fill="#3b82f6" radius={[6, 6, 0, 0]} />
                  </BarChart>
                </ResponsiveContainer>
              ) : (
                <EmptyState message="No sales today" />
              )}
            </ChartCard>

            <ChartCard title="Payment Methods" subtitle="Distribution breakdown" icon={CreditCard}>
              {paymentMethods.length > 0 ? (
                <div className="space-y-4 px-1 pt-2">
                  {paymentMethods.map((pm, idx) => {
                    const Icon = PAYMENT_ICONS[pm.paymentMethod] || CreditCard;
                    return (
                      <div key={pm.paymentMethod}>
                        <div className="flex items-center justify-between mb-1.5">
                          <div className="flex items-center gap-2">
                            <div className="h-8 w-8 rounded-lg flex items-center justify-center" style={{ backgroundColor: `${PIE_COLORS[idx]}20` }}>
                              <Icon className="h-4 w-4" style={{ color: PIE_COLORS[idx] }} />
                            </div>
                            <div>
                              <div className="font-bold text-slate-900 text-sm">{pm.paymentMethod}</div>
                              <div className="text-[10px] text-slate-500 font-bold">{pm.count} transactions</div>
                            </div>
                          </div>
                          <div className="text-right">
                            <div className="font-extrabold text-slate-900 text-sm">{formatPKR(pm.total)}</div>
                            <div className="text-[10px] text-slate-500 font-bold">{pm.percent.toFixed(1)}%</div>
                          </div>
                        </div>
                        <div className="h-2 bg-slate-100 rounded-full overflow-hidden">
                          <div
                            className="h-full rounded-full transition-all"
                            style={{ width: `${pm.percent}%`, backgroundColor: PIE_COLORS[idx % PIE_COLORS.length] }}
                          />
                        </div>
                      </div>
                    );
                  })}
                </div>
              ) : (
                <EmptyState message="No payment data" />
              )}
            </ChartCard>
          </section>

          {/* Monthly Comparison Bar */}
          {monthlyComparison.length > 0 && (
            <ChartCard title="Last 6 Months Comparison" subtitle="Sales, Profit & Expenses" icon={BarChart2} fullWidth>
              <ResponsiveContainer width="100%" height="100%">
                <BarChart data={monthlyComparison}>
                  <CartesianGrid strokeDasharray="3 3" stroke="#e2e8f0" />
                  <XAxis dataKey="month" stroke="#64748b" fontSize={11} />
                  <YAxis stroke="#64748b" fontSize={11} tickFormatter={(v) => `${(v / 1000).toFixed(0)}k`} />
                  <Tooltip formatter={(value: any) => formatPKR(Number(value))} contentStyle={{ borderRadius: 12 }} />
                  <Legend wrapperStyle={{ fontSize: 12 }} />
                  <Bar dataKey="sales" name="Sales" fill="#10b981" radius={[6, 6, 0, 0]} />
                  <Bar dataKey="profit" name="Profit" fill="#8b5cf6" radius={[6, 6, 0, 0]} />
                  <Bar dataKey="expenses" name="Expenses" fill="#ef4444" radius={[6, 6, 0, 0]} />
                </BarChart>
              </ResponsiveContainer>
            </ChartCard>
          )}
        </>
      )}

      {/* ═══ SALES ANALYTICS TAB ═══ */}
      {tab === 'sales' && (
        <>
          {/* Sales vs Expenses */}
          <ChartCard title="Sales vs Expenses Trend" subtitle="Net profit visualization" icon={LineIcon} fullWidth>
            <ResponsiveContainer width="100%" height="100%">
              <ComposedChart data={sveData}>
                <defs>
                  <linearGradient id="salesGradSE" x1="0" y1="0" x2="0" y2="1">
                    <stop offset="0%" stopColor="#10b981" stopOpacity={0.5} />
                    <stop offset="100%" stopColor="#10b981" stopOpacity={0} />
                  </linearGradient>
                </defs>
                <CartesianGrid strokeDasharray="3 3" stroke="#e2e8f0" />
                <XAxis dataKey="label" stroke="#64748b" fontSize={10} />
                <YAxis stroke="#64748b" fontSize={11} tickFormatter={(v) => `${(v / 1000).toFixed(0)}k`} />
                <Tooltip formatter={(value: any) => formatPKR(Number(value))} contentStyle={{ borderRadius: 12 }} />
                <Legend wrapperStyle={{ fontSize: 12 }} />
                <Area type="monotone" dataKey="sales" name="Sales" fill="url(#salesGradSE)" stroke="#10b981" strokeWidth={2.5} />
                <Bar dataKey="expenses" name="Expenses" fill="#ef4444" radius={[4, 4, 0, 0]} barSize={15} />
                <Line type="monotone" dataKey="profit" name="Net Profit" stroke="#8b5cf6" strokeWidth={3} dot={{ r: 4 }} />
              </ComposedChart>
            </ResponsiveContainer>
          </ChartCard>

          {/* Sales Trend Line */}
          <ChartCard title="Sales Trend Detail" subtitle="Daily sales with paid vs credit split" icon={LineIcon} fullWidth>
            <ResponsiveContainer width="100%" height="100%">
              <AreaChart data={trendData}>
                <defs>
                  <linearGradient id="paidGrad" x1="0" y1="0" x2="0" y2="1">
                    <stop offset="0%" stopColor="#10b981" stopOpacity={0.6} />
                    <stop offset="100%" stopColor="#10b981" stopOpacity={0.1} />
                  </linearGradient>
                  <linearGradient id="creditGrad" x1="0" y1="0" x2="0" y2="1">
                    <stop offset="0%" stopColor="#f59e0b" stopOpacity={0.6} />
                    <stop offset="100%" stopColor="#f59e0b" stopOpacity={0.1} />
                  </linearGradient>
                </defs>
                <CartesianGrid strokeDasharray="3 3" stroke="#e2e8f0" />
                <XAxis dataKey="label" stroke="#64748b" fontSize={10} />
                <YAxis stroke="#64748b" fontSize={11} tickFormatter={(v) => `${(v / 1000).toFixed(0)}k`} />
                <Tooltip formatter={(value: any) => formatPKR(Number(value))} contentStyle={{ borderRadius: 12 }} />
                <Legend wrapperStyle={{ fontSize: 12 }} />
                <Area type="monotone" dataKey="paid" name="Paid" stackId="1" stroke="#10b981" fill="url(#paidGrad)" strokeWidth={2} />
                <Area type="monotone" dataKey="credit" name="Credit (Udhaar)" stackId="1" stroke="#f59e0b" fill="url(#creditGrad)" strokeWidth={2} />
              </AreaChart>
            </ResponsiveContainer>
          </ChartCard>

          {/* Customer Acquisition */}
          {customerAcquisition.length > 0 && (
            <ChartCard title="New Customer Acquisition" subtitle="Daily new customer signups" icon={Users} fullWidth>
              <ResponsiveContainer width="100%" height="100%">
                <BarChart data={acqData}>
                  <CartesianGrid strokeDasharray="3 3" stroke="#e2e8f0" />
                  <XAxis dataKey="label" stroke="#64748b" fontSize={10} />
                  <YAxis stroke="#64748b" fontSize={11} />
                  <Tooltip contentStyle={{ borderRadius: 12 }} />
                  <Bar dataKey="newCustomers" name="New Customers" fill="#ec4899" radius={[6, 6, 0, 0]} />
                </BarChart>
              </ResponsiveContainer>
            </ChartCard>
          )}
        </>
      )}

      {/* ═══ PRODUCTS TAB ═══ */}
      {tab === 'products' && (
        <>
          <section className="grid lg:grid-cols-2 gap-6">
            <ChartCard title="Top Products Revenue" subtitle="Best sellers by revenue" icon={Award}>
              {topProducts.length > 0 ? (
                <ResponsiveContainer width="100%" height="100%">
                  <BarChart
                    data={topProducts.slice(0, 8).map((p) => ({
                      name: p.product?.name?.slice(0, 14) || 'Unknown',
                      revenue: p.revenue,
                      profit: p.profit,
                    }))}
                    layout="vertical"
                  >
                    <CartesianGrid strokeDasharray="3 3" stroke="#e2e8f0" />
                    <XAxis type="number" stroke="#64748b" fontSize={10} tickFormatter={(v) => `${(v / 1000).toFixed(0)}k`} />
                    <YAxis type="category" dataKey="name" stroke="#64748b" fontSize={10} width={95} />
                    <Tooltip formatter={(value: any) => formatPKR(Number(value))} contentStyle={{ borderRadius: 12 }} />
                    <Legend wrapperStyle={{ fontSize: 11 }} />
                    <Bar dataKey="revenue" name="Revenue" fill="#10b981" radius={[0, 6, 6, 0]} />
                    <Bar dataKey="profit" name="Profit" fill="#8b5cf6" radius={[0, 6, 6, 0]} />
                  </BarChart>
                </ResponsiveContainer>
              ) : (
                <EmptyState message="No sales data" />
              )}
            </ChartCard>

            <ChartCard title="Category Distribution" subtitle="Revenue by category" icon={PieIcon}>
              {categoryBreakdown.length > 0 ? (
                <ResponsiveContainer width="100%" height="100%">
                  <PieChart>
                    <Pie
                      data={categoryBreakdown}
                      dataKey="revenue"
                      nameKey="name"
                      cx="50%"
                      cy="50%"
                      outerRadius={100}
                      innerRadius={50}
                      paddingAngle={2}
                      label={(entry: any) => {
                        const total = categoryBreakdown.reduce((s, c) => s + c.revenue, 0);
                        const pct = total > 0 ? ((entry.revenue / total) * 100).toFixed(0) : '0';
                        return `${pct}%`;
                      }}
                      labelLine={false}
                    >
                      {categoryBreakdown.map((c, idx) => (
                        <Cell key={c.id} fill={c.color || PIE_COLORS[idx % PIE_COLORS.length]} />
                      ))}
                    </Pie>
                    <Tooltip formatter={(value: any) => formatPKR(Number(value))} contentStyle={{ borderRadius: 12 }} />
                    <Legend wrapperStyle={{ fontSize: 10, paddingTop: 12 }} iconType="circle" />
                  </PieChart>
                </ResponsiveContainer>
              ) : (
                <EmptyState message="No category data" />
              )}
            </ChartCard>
          </section>

          {/* Top Products Table */}
          <section className="rounded-3xl bg-white border border-slate-200 shadow-sm overflow-hidden">
            <div className="px-6 py-5 border-b border-slate-100">
              <h3 className="text-xl font-bold text-slate-900">Top Products with Profit Analysis</h3>
              <p className="text-sm text-slate-500">Detailed breakdown of best sellers</p>
            </div>
            <div className="overflow-x-auto">
              <table className="w-full text-sm">
                <thead className="bg-slate-50 text-slate-600">
                  <tr>
                    <th className="text-center px-3 py-3 font-bold text-[10px] uppercase tracking-wider w-12">#</th>
                    <th className="text-left px-3 py-3 font-bold text-[10px] uppercase tracking-wider">Product</th>
                    <th className="text-right px-3 py-3 font-bold text-[10px] uppercase tracking-wider">Qty Sold</th>
                    <th className="text-right px-3 py-3 font-bold text-[10px] uppercase tracking-wider">Orders</th>
                    <th className="text-right px-3 py-3 font-bold text-[10px] uppercase tracking-wider">Revenue</th>
                    <th className="text-right px-3 py-3 font-bold text-[10px] uppercase tracking-wider">Profit</th>
                    <th className="text-center px-3 py-3 font-bold text-[10px] uppercase tracking-wider">Margin</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-slate-100">
                  {topProducts.map((p, idx) => (
                    <tr key={p.productId} className="hover:bg-slate-50 transition">
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
                          <div className="h-10 w-10 rounded-lg bg-slate-100 overflow-hidden flex items-center justify-center">
                            {p.product?.images?.[0]?.url ? (
                              <img src={p.product.images[0].url} alt="" className="h-full w-full object-cover" />
                            ) : (
                              <Package className="h-4 w-4 text-slate-400" />
                            )}
                          </div>
                          <div>
                            <div className="font-bold text-slate-900 text-sm">{p.product?.name || 'Unknown'}</div>
                            <div className="text-[10px] text-slate-500 font-mono">{p.product?.sku || '—'}</div>
                          </div>
                        </div>
                      </td>
                      <td className="px-3 py-3 text-right font-bold">{p.quantitySold} {p.product?.unit}</td>
                      <td className="px-3 py-3 text-right text-slate-700">{p.orderCount}</td>
                      <td className="px-3 py-3 text-right font-extrabold text-emerald-700 tabular-nums">{formatPKR(p.revenue)}</td>
                      <td className="px-3 py-3 text-right font-extrabold text-violet-700 tabular-nums">{formatPKR(p.profit)}</td>
                      <td className="px-3 py-3 text-center">
                        <span className={`inline-flex px-2 py-0.5 rounded-full text-xs font-extrabold ${
                          p.margin > 30 ? 'bg-emerald-100 text-emerald-700' :
                          p.margin > 10 ? 'bg-amber-100 text-amber-700' :
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

          {/* Category breakdown bars */}
          <ChartCard title="Category Performance" subtitle="Revenue & Profit per category" icon={BarChart2} fullWidth>
            <ResponsiveContainer width="100%" height="100%">
              <BarChart data={categoryBreakdown.slice(0, 8)}>
                <CartesianGrid strokeDasharray="3 3" stroke="#e2e8f0" />
                <XAxis dataKey="name" stroke="#64748b" fontSize={11} />
                <YAxis stroke="#64748b" fontSize={11} tickFormatter={(v) => `${(v / 1000).toFixed(0)}k`} />
                <Tooltip formatter={(value: any) => formatPKR(Number(value))} contentStyle={{ borderRadius: 12 }} />
                <Legend wrapperStyle={{ fontSize: 11 }} />
                <Bar dataKey="revenue" name="Revenue" fill="#10b981" radius={[6, 6, 0, 0]} />
                <Bar dataKey="profit" name="Profit" fill="#8b5cf6" radius={[6, 6, 0, 0]} />
              </BarChart>
            </ResponsiveContainer>
          </ChartCard>
        </>
      )}

      {/* ═══ CUSTOMERS TAB ═══ */}
      {tab === 'customers' && (
        <section className="rounded-3xl bg-white border border-slate-200 shadow-sm overflow-hidden">
          <div className="px-6 py-5 border-b border-slate-100">
            <h3 className="text-xl font-bold text-slate-900">Top Customers Leaderboard</h3>
            <p className="text-sm text-slate-500">Most valuable customers by total spent</p>
          </div>
          {topCustomers.length === 0 ? (
            <EmptyState message="No customer data" />
          ) : (
            <div className="divide-y divide-slate-100">
              {topCustomers.map((tc, idx) => {
                const rankColors = ['bg-amber-500', 'bg-slate-400', 'bg-orange-600'];
                return (
                  <Link
                    key={tc.customerId}
                    to={tc.customerId ? `/customers/${tc.customerId}` : '#'}
                    className="px-6 py-4 flex items-center justify-between gap-4 hover:bg-slate-50 transition"
                  >
                    <div className="flex items-center gap-3 min-w-0">
                      <div className={`h-12 w-12 rounded-2xl ${rankColors[idx] || 'bg-violet-500'} text-white font-extrabold flex items-center justify-center shadow-md shrink-0`}>
                        {idx < 3 ? <Crown className="h-5 w-5" /> : `#${idx + 1}`}
                      </div>
                      {tc.customer?.avatarUrl ? (
                        <img src={tc.customer.avatarUrl} alt="" className="h-10 w-10 rounded-xl object-cover" />
                      ) : (
                        <div className="h-10 w-10 rounded-xl bg-slate-100 flex items-center justify-center font-bold text-slate-600">
                          {tc.customer?.name?.charAt(0) || '?'}
                        </div>
                      )}
                      <div className="min-w-0">
                        <div className="flex items-center gap-2">
                          <span className="font-bold text-slate-900 truncate">{tc.customer?.name || 'Unknown'}</span>
                          {tc.customer?.isVip && (
                            <span className="inline-flex items-center gap-0.5 px-1.5 py-0.5 rounded-md text-[9px] font-extrabold bg-amber-100 text-amber-700">
                              <Star className="h-2.5 w-2.5 fill-amber-500" /> VIP
                            </span>
                          )}
                        </div>
                        <div className="text-xs text-slate-500 truncate">
                          {tc.customer?.phone || 'No phone'} • {tc.orderCount} orders
                        </div>
                        {tc.customer && tc.customer.loyaltyPoints > 0 && (
                          <div className="text-[10px] font-bold text-violet-700 mt-0.5">
                            🎯 {tc.customer.loyaltyPoints} loyalty points
                          </div>
                        )}
                      </div>
                    </div>
                    <div className="text-right shrink-0">
                      <div className="font-extrabold text-violet-700 text-lg tabular-nums">{formatPKR(tc.totalSpent)}</div>
                      <div className="text-[10px] text-slate-500 font-bold">AOV {formatPKR(tc.avgOrderValue)}</div>
                      {(tc.customer?.balance ?? 0) > 0 && (
                        <div className="text-[10px] text-amber-700 font-extrabold mt-0.5">
                          Udhaar: {formatPKR(tc.customer?.balance ?? 0)}
                        </div>
                      )}
                    </div>
                  </Link>
                );
              })}
            </div>
          )}
        </section>
      )}

      {/* ═══ STAFF TAB ═══ */}
      {tab === 'staff' && (
        <>
          <ChartCard title="Cashier Performance" subtitle={`Last ${days} days`} icon={Crown} fullWidth>
            <ResponsiveContainer width="100%" height="100%">
              <BarChart
                data={cashiers.slice(0, 8).map((c) => ({
                  name: c.user?.fullName?.split(' ')[0] || 'Unknown',
                  totalSales: c.totalSales,
                  orders: c.orderCount,
                }))}
              >
                <CartesianGrid strokeDasharray="3 3" stroke="#e2e8f0" />
                <XAxis dataKey="name" stroke="#64748b" fontSize={11} />
                <YAxis yAxisId="left" stroke="#64748b" fontSize={11} tickFormatter={(v) => `${(v / 1000).toFixed(0)}k`} />
                <YAxis yAxisId="right" orientation="right" stroke="#64748b" fontSize={11} />
                <Tooltip formatter={(value: any, name: any) => name === 'Orders' ? value : formatPKR(Number(value))} contentStyle={{ borderRadius: 12 }} />
                <Legend wrapperStyle={{ fontSize: 11 }} />
                <Bar yAxisId="left" dataKey="totalSales" name="Total Sales" fill="#f59e0b" radius={[6, 6, 0, 0]} />
                <Bar yAxisId="right" dataKey="orders" name="Orders" fill="#8b5cf6" radius={[6, 6, 0, 0]} />
              </BarChart>
            </ResponsiveContainer>
          </ChartCard>

          <section className="rounded-3xl bg-white border border-slate-200 shadow-sm overflow-hidden">
            <div className="px-6 py-5 border-b border-slate-100">
              <h3 className="text-xl font-bold text-slate-900">Staff Leaderboard</h3>
            </div>
            {cashiers.length === 0 ? (
              <EmptyState message="No staff data" />
            ) : (
              <table className="w-full text-sm">
                <thead className="bg-slate-50 text-slate-600">
                  <tr>
                    <th className="text-center px-6 py-3 font-bold text-xs uppercase w-16">Rank</th>
                    <th className="text-left px-6 py-3 font-bold text-xs uppercase">Staff Member</th>
                    <th className="text-center px-6 py-3 font-bold text-xs uppercase">Role</th>
                    <th className="text-right px-6 py-3 font-bold text-xs uppercase">Orders</th>
                    <th className="text-right px-6 py-3 font-bold text-xs uppercase">Total Sales</th>
                    <th className="text-right px-6 py-3 font-bold text-xs uppercase">AOV</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-slate-100">
                  {cashiers.map((c, idx) => (
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
                          {c.user?.avatarUrl ? (
                            <img src={c.user.avatarUrl} alt="" className="h-9 w-9 rounded-xl object-cover" />
                          ) : (
                            <div className="h-9 w-9 rounded-xl bg-violet-100 text-violet-700 flex items-center justify-center font-bold">
                              {c.user?.fullName?.charAt(0) || '?'}
                            </div>
                          )}
                          <div>
                            <div className="font-bold text-slate-900">{c.user?.fullName || 'Unknown'}</div>
                            <div className="text-xs text-slate-500">{c.user?.email}</div>
                          </div>
                        </div>
                      </td>
                      <td className="px-6 py-3 text-center">
                        <span className="inline-flex px-2 py-0.5 rounded-md text-xs font-bold bg-violet-100 text-violet-700">
                          {c.user?.role}
                        </span>
                      </td>
                      <td className="px-6 py-3 text-right font-bold">{c.orderCount}</td>
                      <td className="px-6 py-3 text-right font-extrabold text-emerald-700 tabular-nums">{formatPKR(c.totalSales)}</td>
                      <td className="px-6 py-3 text-right text-slate-700 tabular-nums">{formatPKR(c.avgOrderValue)}</td>
                    </tr>
                  ))}
                </tbody>
              </table>
            )}
          </section>
        </>
      )}

      {/* ═══ INVENTORY TAB ═══ */}
      {tab === 'inventory' && inventoryValue && (
        <>
          <section className="grid sm:grid-cols-4 gap-4">
            <KpiCard label="Total Products" value={String(inventoryValue.totals.totalProducts)} icon={Package} color="blue" />
            <KpiCard label="Total Units" value={String(inventoryValue.totals.totalUnits)} icon={Boxes} color="violet" />
            <KpiCard label="Cost Value" value={formatPKR(inventoryValue.totals.totalCostValue)} icon={DollarSign} color="emerald" />
            <KpiCard
              label="Potential Profit"
              value={formatPKR(inventoryValue.totals.potentialProfit)}
              icon={Target}
              color="amber"
              isHighlight
              sub={`${inventoryValue.totals.potentialMargin.toFixed(1)}% margin`}
            />
          </section>

          <ChartCard title="Inventory Value by Category" subtitle="Cost vs Sell Value" icon={BarChart2} fullWidth>
            <ResponsiveContainer width="100%" height="100%">
              <BarChart data={inventoryValue.byCategory}>
                <CartesianGrid strokeDasharray="3 3" stroke="#e2e8f0" />
                <XAxis dataKey="name" stroke="#64748b" fontSize={11} />
                <YAxis stroke="#64748b" fontSize={11} tickFormatter={(v) => `${(v / 1000).toFixed(0)}k`} />
                <Tooltip formatter={(value: any) => formatPKR(Number(value))} contentStyle={{ borderRadius: 12 }} />
                <Legend wrapperStyle={{ fontSize: 11 }} />
                <Bar dataKey="costValue" name="Cost Value" fill="#10b981" radius={[6, 6, 0, 0]} />
                <Bar dataKey="sellValue" name="Sell Value" fill="#8b5cf6" radius={[6, 6, 0, 0]} />
              </BarChart>
            </ResponsiveContainer>
          </ChartCard>

          <section className="rounded-3xl bg-white border border-slate-200 shadow-sm overflow-hidden">
            <div className="px-6 py-5 border-b border-slate-100">
              <h3 className="text-xl font-bold text-slate-900">Inventory Value Detail</h3>
            </div>
            <table className="w-full text-sm">
              <thead className="bg-slate-50 text-slate-600">
                <tr>
                  <th className="text-left px-6 py-3 font-bold text-xs uppercase">Category</th>
                  <th className="text-right px-6 py-3 font-bold text-xs uppercase">Products</th>
                  <th className="text-right px-6 py-3 font-bold text-xs uppercase">Stock</th>
                  <th className="text-right px-6 py-3 font-bold text-xs uppercase">Cost Value</th>
                  <th className="text-right px-6 py-3 font-bold text-xs uppercase">Sell Value</th>
                  <th className="text-right px-6 py-3 font-bold text-xs uppercase">Profit Potential</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-100">
                {inventoryValue.byCategory.map((c) => (
                  <tr key={c.id} className="hover:bg-slate-50">
                    <td className="px-6 py-3">
                      <div className="flex items-center gap-2">
                        <span className="h-3 w-3 rounded-full" style={{ backgroundColor: c.color }} />
                        <span className="font-bold text-slate-900">{c.name}</span>
                      </div>
                    </td>
                    <td className="px-6 py-3 text-right font-bold">{c.productCount}</td>
                    <td className="px-6 py-3 text-right font-bold">{c.totalStock}</td>
                    <td className="px-6 py-3 text-right font-bold text-emerald-700 tabular-nums">{formatPKR(c.costValue)}</td>
                    <td className="px-6 py-3 text-right font-bold text-violet-700 tabular-nums">{formatPKR(c.sellValue)}</td>
                    <td className="px-6 py-3 text-right font-extrabold text-amber-700 tabular-nums">{formatPKR(c.sellValue - c.costValue)}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </section>
        </>
      )}

      {/* ═══ PATTERNS TAB ═══ */}
      {tab === 'patterns' && (
        <>
          {/* Weekday Radar */}
          {weekdayPattern.length > 0 && (
            <section className="grid lg:grid-cols-2 gap-6">
              <ChartCard title="Weekday Sales Pattern" subtitle="Which days perform best (radar)" icon={Activity}>
                <ResponsiveContainer width="100%" height="100%">
                  <RadarChart data={weekdayPattern}>
                    <PolarGrid stroke="#e2e8f0" />
                    <PolarAngleAxis dataKey="day" stroke="#64748b" fontSize={11} />
                    <PolarRadiusAxis stroke="#64748b" fontSize={10} tickFormatter={(v) => `${(v / 1000).toFixed(0)}k`} />
                    <Radar name="Sales" dataKey="sales" stroke="#8b5cf6" fill="#8b5cf6" fillOpacity={0.4} strokeWidth={2} />
                    <Tooltip formatter={(value: any) => formatPKR(Number(value))} contentStyle={{ borderRadius: 12 }} />
                  </RadarChart>
                </ResponsiveContainer>
              </ChartCard>

              <ChartCard title="Average Per Weekday" subtitle="Sales avg by day of week" icon={BarChart2}>
                <ResponsiveContainer width="100%" height="100%">
                  <BarChart data={weekdayPattern}>
                    <CartesianGrid strokeDasharray="3 3" stroke="#e2e8f0" />
                    <XAxis dataKey="day" stroke="#64748b" fontSize={11} />
                    <YAxis stroke="#64748b" fontSize={11} tickFormatter={(v) => `${(v / 1000).toFixed(0)}k`} />
                    <Tooltip formatter={(value: any) => formatPKR(Number(value))} contentStyle={{ borderRadius: 12 }} />
                    <Bar dataKey="avg" name="Avg Sales" radius={[6, 6, 0, 0]}>
                      {weekdayPattern.map((entry, idx) => {
                        const max = Math.max(...weekdayPattern.map((w) => w.avg));
                        return (
                          <Cell
                            key={`cell-${idx}`}
                            fill={entry.avg === max ? '#10b981' : '#94a3b8'}
                          />
                        );
                      })}
                    </Bar>
                  </BarChart>
                </ResponsiveContainer>
              </ChartCard>
            </section>
          )}

          {/* Expense breakdown pie */}
          {expenseBreakdown && expenseBreakdown.byCategory.length > 0 && (
            <ChartCard title="Expense Breakdown by Category" subtitle={`Total: ${formatPKR(expenseBreakdown.total)}`} icon={PieIcon} fullWidth>
              <ResponsiveContainer width="100%" height="100%">
                <PieChart>
                  <Pie
                    data={expenseBreakdown.byCategory}
                    dataKey="amount"
                    nameKey="name"
                    cx="50%"
                    cy="50%"
                    outerRadius={120}
                    innerRadius={60}
                    paddingAngle={2}
                    label={(entry: any) => `${entry.name} (${entry.percent.toFixed(0)}%)`}
                  >
                    {expenseBreakdown.byCategory.map((c, idx) => (
                      <Cell key={c.id} fill={c.color || PIE_COLORS[idx % PIE_COLORS.length]} />
                    ))}
                  </Pie>
                  <Tooltip formatter={(value: any) => formatPKR(Number(value))} contentStyle={{ borderRadius: 12 }} />
                  <Legend wrapperStyle={{ fontSize: 11 }} iconType="circle" />
                </PieChart>
              </ResponsiveContainer>
            </ChartCard>
          )}

          {/* Sales scatter (revenue vs orders) */}
          <ChartCard title="Sales Distribution Scatter" subtitle="Each dot = one day (orders vs sales)" icon={Activity} fullWidth>
            <ResponsiveContainer width="100%" height="100%">
              <ScatterChart>
                <CartesianGrid strokeDasharray="3 3" stroke="#e2e8f0" />
                <XAxis type="number" dataKey="orders" name="Orders" stroke="#64748b" fontSize={11} />
                <YAxis type="number" dataKey="sales" name="Sales" stroke="#64748b" fontSize={11} tickFormatter={(v) => `${(v / 1000).toFixed(0)}k`} />
                <Tooltip
                  cursor={{ strokeDasharray: '3 3' }}
                  formatter={(value: any, name: any) => name === 'Sales' ? formatPKR(Number(value)) : value}
                  contentStyle={{ borderRadius: 12 }}
                />
                <Scatter name="Daily Sales" data={trend} fill="#10b981" />
              </ScatterChart>
            </ResponsiveContainer>
          </ChartCard>
        </>
      )}
    </div>
  );
}

// ─── Helper Components ──────────────────────────────────

function KpiCard({ label, value, icon: Icon, color, isHighlight, sub }: any) {
  const colors: Record<string, string> = {
    emerald: 'from-emerald-500 to-green-600 shadow-emerald-500/30',
    violet: 'from-violet-500 to-purple-600 shadow-violet-500/30',
    blue: 'from-blue-500 to-blue-700 shadow-blue-500/30',
    amber: 'from-amber-500 to-orange-600 shadow-amber-500/30',
  };
  return (
    <div className={`rounded-2xl border-2 p-5 shadow-sm hover:shadow-md transition ${
      isHighlight ? 'bg-gradient-to-br from-amber-50 to-orange-50 border-amber-300' : 'bg-white border-slate-200'
    }`}>
      <div className="flex items-center justify-between">
        <div className="min-w-0">
          <p className="text-xs uppercase tracking-wider font-bold text-slate-500">{label}</p>
          <h3 className="mt-2 text-2xl font-extrabold text-slate-900 tabular-nums truncate">{value}</h3>
          {sub && <p className="text-xs text-slate-600 font-semibold mt-1">{sub}</p>}
        </div>
        <div className={`h-12 w-12 rounded-2xl bg-gradient-to-br ${colors[color]} text-white flex items-center justify-center shadow-lg shrink-0`}>
          <Icon className="h-5 w-5" />
        </div>
      </div>
    </div>
  );
}

function PnLLine({ label, value, type, sub }: { label: string; value: number; type: 'positive' | 'negative' | 'bold' | 'highlight'; sub?: string }) {
  if (type === 'highlight') {
    return (
      <div className="flex items-center justify-between p-3 rounded-xl bg-gradient-to-r from-emerald-50 to-green-50 border-2 border-emerald-300">
        <div>
          <div className="font-extrabold text-emerald-900">{label}</div>
          {sub && <div className="text-[10px] text-emerald-700 font-bold">{sub}</div>}
        </div>
        <div className={`font-extrabold text-xl tabular-nums ${value >= 0 ? 'text-emerald-700' : 'text-rose-700'}`}>
          {formatPKR(value)}
        </div>
      </div>
    );
  }
  return (
    <div className={`flex items-center justify-between py-2 ${type === 'bold' ? 'border-t border-slate-200 pt-3 font-bold' : ''}`}>
      <div>
        <span className={`text-sm ${type === 'bold' ? 'font-bold text-slate-900' : 'text-slate-600'}`}>{label}</span>
        {sub && <span className="ml-2 text-[10px] text-slate-500 font-bold">({sub})</span>}
      </div>
      <span className={`font-bold tabular-nums ${
        type === 'positive' ? 'text-emerald-700' :
        type === 'negative' ? 'text-rose-700' :
        'text-slate-900'
      }`}>
        {value < 0 ? '-' : ''}{formatPKR(Math.abs(value))}
      </span>
    </div>
  );
}

function MiniStat({ label, value, color, icon: Icon }: any) {
  const colors: Record<string, string> = {
    blue: 'bg-blue-50 border-blue-200 text-blue-900',
    rose: 'bg-rose-50 border-rose-200 text-rose-900',
    emerald: 'bg-emerald-50 border-emerald-200 text-emerald-900',
    amber: 'bg-amber-50 border-amber-200 text-amber-900',
    violet: 'bg-violet-50 border-violet-200 text-violet-900',
    pink: 'bg-pink-50 border-pink-200 text-pink-900',
  };
  return (
    <div className={`rounded-xl border-2 ${colors[color]} p-3`}>
      <div className="flex items-center gap-1.5 mb-1">
        <Icon className="h-3 w-3 opacity-70" />
        <div className="text-[9px] uppercase tracking-wider font-extrabold opacity-80">{label}</div>
      </div>
      <div className="text-lg font-extrabold tabular-nums">{value}</div>
    </div>
  );
}

function ChartCard({ title, subtitle, icon: Icon, children, fullWidth }: any) {
  return (
    <div className={`rounded-3xl bg-white border border-slate-200 shadow-sm p-6 ${fullWidth ? '' : ''}`}>
      <div className="flex items-center justify-between mb-5">
        <div className="flex items-center gap-2">
          {Icon && (
            <div className="h-9 w-9 rounded-xl bg-violet-100 text-violet-700 flex items-center justify-center">
              <Icon className="h-4 w-4" />
            </div>
          )}
          <div>
            <h3 className="text-lg font-bold text-slate-900">{title}</h3>
            {subtitle && <p className="text-xs text-slate-500">{subtitle}</p>}
          </div>
        </div>
      </div>
      <div className="h-[320px]">{children}</div>
    </div>
  );
}

function EmptyState({ message }: { message: string }) {
  return (
    <div className="h-full flex items-center justify-center text-sm text-slate-500">
      <div className="text-center">
        <Activity className="h-10 w-10 text-slate-300 mx-auto mb-2" />
        <p>{message}</p>
      </div>
    </div>
  );
}
