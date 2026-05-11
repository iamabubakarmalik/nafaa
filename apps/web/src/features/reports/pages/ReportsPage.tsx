import { useState } from 'react';
import { useQuery } from '@tanstack/react-query';
import { Link } from 'react-router-dom';
import {
  BarChart3, TrendingUp, TrendingDown, Award, PieChart as PieIcon,
  CreditCard, Users, Package, Target, ShoppingCart, Crown, Activity,
  DollarSign, ArrowRight, Calendar, Receipt,
} from 'lucide-react';
import {
  ResponsiveContainer, AreaChart, Area, BarChart, Bar, PieChart, Pie, Cell,
  XAxis, YAxis, Tooltip, CartesianGrid, Legend,
} from 'recharts';
import { reportsApi } from '@/api/reports.api';
import { formatPKR } from '@/lib/format';

const dayLabel = (date: string) => {
  const d = new Date(date);
  return new Intl.DateTimeFormat('en-PK', { weekday: 'short', day: 'numeric' }).format(d);
};

type Tab = 'overview' | 'products' | 'customers' | 'staff' | 'inventory';

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

  const trendData = trend.map((p) => ({ ...p, label: dayLabel(p.date) }));
  const PIE_COLORS = ['#2c9466', '#3b82f6', '#f59e0b', '#ef4444', '#8b5cf6', '#ec4899', '#06b6d4', '#84cc16'];

  const totalRevenue = trend.reduce((s, p) => s + p.sales, 0);
  const totalProfit = trend.reduce((s, p) => s + p.profit, 0);
  const totalOrders = trend.reduce((s, p) => s + p.orders, 0);
  const aov = totalOrders > 0 ? totalRevenue / totalOrders : 0;

  const tabs: { id: Tab; label: string; icon: any }[] = [
    { id: 'overview', label: 'Overview', icon: BarChart3 },
    { id: 'products', label: 'Products', icon: Package },
    { id: 'customers', label: 'Customers', icon: Users },
    { id: 'staff', label: 'Staff', icon: Crown },
    { id: 'inventory', label: 'Inventory', icon: Activity },
  ];

  return (
    <div className="space-y-6">
      {/* Hero */}
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

          <div className="flex gap-2 flex-wrap">
            {[7, 14, 30, 90].map((d) => (
              <button
                key={d}
                onClick={() => setDays(d)}
                className={`px-4 py-2 rounded-xl text-sm font-medium transition ${
                  days === d ? 'bg-white text-slate-900' : 'bg-white/10 text-white hover:bg-white/20'
                }`}
              >
                {d} days
              </button>
            ))}
          </div>
        </div>
      </section>

      {/* Tab Switcher */}
      <section className="flex gap-2 overflow-x-auto pb-2">
        {tabs.map((t) => {
          const Icon = t.icon;
          const active = tab === t.id;
          return (
            <button
              key={t.id}
              onClick={() => setTab(t.id)}
              className={`inline-flex items-center gap-2 px-4 py-2.5 rounded-xl text-sm font-semibold whitespace-nowrap transition border-2 ${
                active
                  ? 'bg-violet-600 text-white border-violet-600'
                  : 'bg-white text-slate-700 border-slate-200 hover:border-slate-300'
              }`}
            >
              <Icon className="h-4 w-4" />
              {t.label}
            </button>
          );
        })}
      </section>

      {/* OVERVIEW TAB */}
      {tab === 'overview' && (
        <>
          {/* Hero Stats */}
          <section className="grid sm:grid-cols-4 gap-4">
            <div className="rounded-2xl bg-white border border-slate-200 p-5 shadow-sm">
              <div className="flex items-center justify-between">
                <div>
                  <div className="text-sm text-slate-500">Revenue</div>
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
                  <div className="text-sm text-slate-500">Profit</div>
                  <div className="mt-2 text-2xl font-bold text-slate-900">{formatPKR(totalProfit)}</div>
                </div>
                <div className="h-11 w-11 rounded-2xl bg-violet-100 text-violet-700 flex items-center justify-center">
                  <Target className="h-5 w-5" />
                </div>
              </div>
            </div>
            <div className="rounded-2xl bg-white border border-slate-200 p-5 shadow-sm">
              <div className="flex items-center justify-between">
                <div>
                  <div className="text-sm text-slate-500">Orders</div>
                  <div className="mt-2 text-2xl font-bold text-slate-900">{totalOrders}</div>
                </div>
                <div className="h-11 w-11 rounded-2xl bg-blue-100 text-blue-700 flex items-center justify-center">
                  <ShoppingCart className="h-5 w-5" />
                </div>
              </div>
            </div>
            <div className="rounded-2xl bg-white border border-slate-200 p-5 shadow-sm">
              <div className="flex items-center justify-between">
                <div>
                  <div className="text-sm text-slate-500">AOV</div>
                  <div className="mt-2 text-2xl font-bold text-slate-900">{formatPKR(aov)}</div>
                </div>
                <div className="h-11 w-11 rounded-2xl bg-amber-100 text-amber-700 flex items-center justify-center">
                  <DollarSign className="h-5 w-5" />
                </div>
              </div>
            </div>
          </section>

          {/* Profit & Loss */}
          {profitLoss && (
            <section className="rounded-3xl bg-white border border-slate-200 shadow-sm p-6">
              <div className="flex items-center justify-between mb-5">
                <div>
                  <h3 className="text-xl font-bold text-slate-900">Profit & Loss Statement</h3>
                  <p className="text-sm text-slate-500">{days} days summary</p>
                </div>
                <div className={`px-3 py-1.5 rounded-xl text-sm font-bold ${
                  profitLoss.netProfit >= 0 ? 'bg-emerald-100 text-emerald-700' : 'bg-rose-100 text-rose-700'
                }`}>
                  Net Margin: {profitLoss.netMargin.toFixed(1)}%
                </div>
              </div>

              <div className="grid sm:grid-cols-2 gap-6">
                <div className="space-y-3">
                  <div className="flex justify-between">
                    <span className="text-sm text-slate-500">Revenue</span>
                    <span className="font-bold text-emerald-700">+{formatPKR(profitLoss.revenue)}</span>
                  </div>
                  {profitLoss.returns > 0 && (
                    <div className="flex justify-between">
                      <span className="text-sm text-slate-500">Returns</span>
                      <span className="font-bold text-rose-700">-{formatPKR(profitLoss.returns)}</span>
                    </div>
                  )}
                  <div className="flex justify-between pt-2 border-t border-slate-200">
                    <span className="text-sm font-medium text-slate-700">Net Revenue</span>
                    <span className="font-bold text-slate-900">{formatPKR(profitLoss.netRevenue)}</span>
                  </div>
                  <div className="flex justify-between">
                    <span className="text-sm text-slate-500">Cost of Goods</span>
                    <span className="font-bold text-rose-700">-{formatPKR(profitLoss.cogs)}</span>
                  </div>
                  <div className="flex justify-between pt-2 border-t border-slate-200">
                    <span className="text-sm font-medium text-slate-700">Gross Profit</span>
                    <span className="font-bold text-slate-900">
                      {formatPKR(profitLoss.grossProfit)} ({profitLoss.grossMargin.toFixed(1)}%)
                    </span>
                  </div>
                  <div className="flex justify-between">
                    <span className="text-sm text-slate-500">Expenses</span>
                    <span className="font-bold text-rose-700">-{formatPKR(profitLoss.expenses)}</span>
                  </div>
                  <div className="flex justify-between pt-3 border-t-2 border-slate-300">
                    <span className="font-bold text-slate-900">Net Profit</span>
                    <span className={`font-bold text-xl ${
                      profitLoss.netProfit >= 0 ? 'text-emerald-700' : 'text-rose-700'
                    }`}>
                      {formatPKR(profitLoss.netProfit)}
                    </span>
                  </div>
                </div>

                <div className="grid grid-cols-2 gap-3">
                  <div className="rounded-2xl bg-emerald-50 border border-emerald-200 p-4">
                    <div className="text-xs text-emerald-700 font-bold uppercase">Paid</div>
                    <div className="mt-1 text-xl font-bold text-emerald-900">{formatPKR(profitLoss.paid)}</div>
                  </div>
                  <div className="rounded-2xl bg-amber-50 border border-amber-200 p-4">
                    <div className="text-xs text-amber-700 font-bold uppercase">Credit</div>
                    <div className="mt-1 text-xl font-bold text-amber-900">{formatPKR(profitLoss.credit)}</div>
                  </div>
                  <div className="rounded-2xl bg-blue-50 border border-blue-200 p-4">
                    <div className="text-xs text-blue-700 font-bold uppercase">Orders</div>
                    <div className="mt-1 text-xl font-bold text-blue-900">{profitLoss.orderCount}</div>
                  </div>
                  <div className="rounded-2xl bg-rose-50 border border-rose-200 p-4">
                    <div className="text-xs text-rose-700 font-bold uppercase">Returns</div>
                    <div className="mt-1 text-xl font-bold text-rose-900">{profitLoss.returnCount}</div>
                  </div>
                </div>
              </div>
            </section>
          )}

          {/* Sales Trend */}
          <section className="rounded-3xl bg-white border border-slate-200 shadow-sm p-6">
            <h3 className="text-xl font-bold text-slate-900 mb-5">Sales Trend</h3>
            <div className="h-[320px]">
              <ResponsiveContainer width="100%" height="100%">
                <AreaChart data={trendData}>
                  <defs>
                    <linearGradient id="rptSalesGrad" x1="0" y1="0" x2="0" y2="1">
                      <stop offset="0%" stopColor="#2c9466" stopOpacity={0.4} />
                      <stop offset="100%" stopColor="#2c9466" stopOpacity={0} />
                    </linearGradient>
                    <linearGradient id="rptProfitGrad" x1="0" y1="0" x2="0" y2="1">
                      <stop offset="0%" stopColor="#8b5cf6" stopOpacity={0.4} />
                      <stop offset="100%" stopColor="#8b5cf6" stopOpacity={0} />
                    </linearGradient>
                  </defs>
                  <CartesianGrid strokeDasharray="3 3" stroke="#e2e8f0" />
                  <XAxis dataKey="label" stroke="#64748b" fontSize={12} />
                  <YAxis stroke="#64748b" fontSize={12} tickFormatter={(v) => `${(v / 1000).toFixed(0)}k`} />
                  <Tooltip formatter={(value: any) => formatPKR(Number(value))} contentStyle={{ borderRadius: 12 }} />
                  <Legend />
                  <Area type="monotone" dataKey="sales" name="Sales" stroke="#2c9466" fill="url(#rptSalesGrad)" strokeWidth={2.5} />
                  <Area type="monotone" dataKey="profit" name="Profit" stroke="#8b5cf6" fill="url(#rptProfitGrad)" strokeWidth={2} />
                </AreaChart>
              </ResponsiveContainer>
            </div>
          </section>

          {/* Hourly Today + Payment Methods */}
          <section className="grid lg:grid-cols-2 gap-6">
            <div className="rounded-3xl bg-white border border-slate-200 shadow-sm p-6">
              <h3 className="text-xl font-bold text-slate-900 mb-5">Today's Hourly Sales</h3>
              <div className="h-[280px]">
                <ResponsiveContainer width="100%" height="100%">
                  <BarChart data={hourlyToday.map((h) => ({ hour: `${h.hour}:00`, sales: h.sales }))}>
                    <CartesianGrid strokeDasharray="3 3" stroke="#e2e8f0" />
                    <XAxis dataKey="hour" stroke="#64748b" fontSize={10} />
                    <YAxis stroke="#64748b" fontSize={11} tickFormatter={(v) => `${(v / 1000).toFixed(0)}k`} />
                    <Tooltip formatter={(value: any) => formatPKR(Number(value))} />
                    <Bar dataKey="sales" fill="#3b82f6" radius={[6, 6, 0, 0]} />
                  </BarChart>
                </ResponsiveContainer>
              </div>
            </div>

            <div className="rounded-3xl bg-white border border-slate-200 shadow-sm p-6">
              <h3 className="text-xl font-bold text-slate-900 mb-5">Payment Methods</h3>
              {paymentMethods.length === 0 ? (
                <div className="py-12 text-center text-sm text-slate-500">No data</div>
              ) : (
                <div className="space-y-3">
                  {paymentMethods.map((pm, idx) => (
                    <div key={pm.paymentMethod} className="space-y-1.5">
                      <div className="flex justify-between text-sm">
                        <span className="font-medium text-slate-700">{pm.paymentMethod}</span>
                        <span className="font-bold text-slate-900">{formatPKR(pm.total)}</span>
                      </div>
                      <div className="h-2 bg-slate-100 rounded-full overflow-hidden">
                        <div
                          className="h-full rounded-full transition-all"
                          style={{
                            width: `${pm.percent}%`,
                            backgroundColor: PIE_COLORS[idx % PIE_COLORS.length],
                          }}
                        />
                      </div>
                      <div className="text-xs text-slate-500">
                        {pm.count} transactions • {pm.percent.toFixed(1)}%
                      </div>
                    </div>
                  ))}
                </div>
              )}
            </div>
          </section>
        </>
      )}

      {/* PRODUCTS TAB */}
      {tab === 'products' && (
        <>
          <section className="grid lg:grid-cols-2 gap-6">
            <div className="rounded-3xl bg-white border border-slate-200 shadow-sm p-6">
              <h3 className="text-xl font-bold text-slate-900 mb-5">Top Products</h3>
              {topProducts.length === 0 ? (
                <div className="text-center py-12 text-sm text-slate-500">No sales data</div>
              ) : (
                <div className="h-[320px]">
                  <ResponsiveContainer width="100%" height="100%">
                    <BarChart
                      data={topProducts.slice(0, 8).map((p) => ({
                        name: p.product?.name?.slice(0, 14) || 'Unknown',
                        revenue: p.revenue,
                      }))}
                      layout="vertical"
                    >
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
              <h3 className="text-xl font-bold text-slate-900 mb-5">Category Breakdown</h3>
              {categoryBreakdown.length === 0 ? (
                <div className="text-center py-12 text-sm text-slate-500">No data</div>
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

          <section className="rounded-3xl bg-white border border-slate-200 shadow-sm overflow-hidden">
            <div className="px-6 py-5 border-b border-slate-100">
              <h3 className="text-xl font-bold text-slate-900">Top Products with Profit</h3>
            </div>
            <table className="w-full text-sm">
              <thead className="bg-slate-50 text-slate-600">
                <tr>
                  <th className="text-left px-6 py-3 font-medium">Product</th>
                  <th className="text-right px-6 py-3 font-medium">Qty Sold</th>
                  <th className="text-right px-6 py-3 font-medium">Revenue</th>
                  <th className="text-right px-6 py-3 font-medium">Profit</th>
                  <th className="text-right px-6 py-3 font-medium">Margin</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-100">
                {topProducts.map((p) => (
                  <tr key={p.productId} className="hover:bg-slate-50">
                    <td className="px-6 py-3 font-medium text-slate-900">{p.product?.name || 'Unknown'}</td>
                    <td className="px-6 py-3 text-right">{p.quantitySold}</td>
                    <td className="px-6 py-3 text-right font-semibold">{formatPKR(p.revenue)}</td>
                    <td className="px-6 py-3 text-right font-semibold text-emerald-700">{formatPKR(p.profit)}</td>
                    <td className="px-6 py-3 text-right">
                      <span className={`inline-flex px-2 py-0.5 rounded-md text-xs font-bold ${
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
          </section>
        </>
      )}

      {/* CUSTOMERS TAB */}
      {tab === 'customers' && (
        <section className="rounded-3xl bg-white border border-slate-200 shadow-sm overflow-hidden">
          <div className="px-6 py-5 border-b border-slate-100">
            <h3 className="text-xl font-bold text-slate-900">Top Customers</h3>
            <p className="text-sm text-slate-500">Most valuable customers by total spent</p>
          </div>
          {topCustomers.length === 0 ? (
            <div className="py-12 text-center text-sm text-slate-500">No customer data</div>
          ) : (
            <div className="divide-y divide-slate-100">
              {topCustomers.map((tc, idx) => (
                <Link
                  key={tc.customerId}
                  to={tc.customerId ? `/customers/${tc.customerId}` : '#'}
                  className="px-6 py-4 flex items-center justify-between gap-4 hover:bg-slate-50 transition"
                >
                  <div className="flex items-center gap-3">
                    <div className={`h-11 w-11 rounded-2xl flex items-center justify-center font-bold text-sm ${
                      idx === 0 ? 'bg-amber-100 text-amber-700' :
                      idx === 1 ? 'bg-slate-200 text-slate-700' :
                      idx === 2 ? 'bg-orange-100 text-orange-700' :
                      'bg-violet-100 text-violet-700'
                    }`}>
                      {idx < 3 ? <Crown className="h-5 w-5" /> : `#${idx + 1}`}
                    </div>
                    <div>
                      <div className="flex items-center gap-2">
                        <span className="font-medium text-slate-900">{tc.customer?.name || 'Unknown'}</span>
                        {tc.customer?.isVip && (
                          <span className="inline-flex px-2 py-0.5 rounded-md text-xs font-bold bg-amber-100 text-amber-700">VIP</span>
                        )}
                      </div>
                      <div className="text-xs text-slate-500">
                        {tc.customer?.phone || 'No phone'} • {tc.orderCount} orders
                      </div>
                    </div>
                  </div>
                  <div className="text-right">
                    <div className="font-bold text-violet-700">{formatPKR(tc.totalSpent)}</div>
                    <div className="text-xs text-slate-500">AOV {formatPKR(tc.avgOrderValue)}</div>
                    {(tc.customer?.balance ?? 0) > 0 && (
                      <div className="text-xs text-amber-700 font-semibold">
                        Udhaar: {formatPKR(tc.customer?.balance ?? 0)}
                      </div>
                    )}
                  </div>
                </Link>
              ))}
            </div>
          )}
        </section>
      )}

      {/* STAFF TAB */}
      {tab === 'staff' && (
        <section className="rounded-3xl bg-white border border-slate-200 shadow-sm overflow-hidden">
          <div className="px-6 py-5 border-b border-slate-100">
            <h3 className="text-xl font-bold text-slate-900">Cashier / Staff Performance</h3>
            <p className="text-sm text-slate-500">Last {days} days</p>
          </div>
          {cashiers.length === 0 ? (
            <div className="py-12 text-center text-sm text-slate-500">No data</div>
          ) : (
            <table className="w-full text-sm">
              <thead className="bg-slate-50 text-slate-600">
                <tr>
                  <th className="text-left px-6 py-3 font-medium">Staff</th>
                  <th className="text-left px-6 py-3 font-medium">Role</th>
                  <th className="text-right px-6 py-3 font-medium">Orders</th>
                  <th className="text-right px-6 py-3 font-medium">Total Sales</th>
                  <th className="text-right px-6 py-3 font-medium">AOV</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-100">
                {cashiers.map((c, idx) => (
                  <tr key={c.userId || idx} className="hover:bg-slate-50">
                    <td className="px-6 py-3 font-medium text-slate-900">{c.user?.fullName || 'Unknown'}</td>
                    <td className="px-6 py-3">
                      <span className="inline-flex px-2 py-0.5 rounded-md text-xs font-bold bg-violet-100 text-violet-700">
                        {c.user?.role}
                      </span>
                    </td>
                    <td className="px-6 py-3 text-right">{c.orderCount}</td>
                    <td className="px-6 py-3 text-right font-bold text-emerald-700">{formatPKR(c.totalSales)}</td>
                    <td className="px-6 py-3 text-right text-slate-700">{formatPKR(c.avgOrderValue)}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          )}
        </section>
      )}

      {/* INVENTORY TAB */}
      {tab === 'inventory' && inventoryValue && (
        <>
          <section className="grid sm:grid-cols-4 gap-4">
            <div className="rounded-2xl bg-white border border-slate-200 p-5">
              <div className="text-xs text-slate-500 font-bold uppercase">Total Products</div>
              <div className="mt-2 text-2xl font-bold">{inventoryValue.totals.totalProducts}</div>
            </div>
            <div className="rounded-2xl bg-white border border-slate-200 p-5">
              <div className="text-xs text-slate-500 font-bold uppercase">Total Units</div>
              <div className="mt-2 text-2xl font-bold">{inventoryValue.totals.totalUnits}</div>
            </div>
            <div className="rounded-2xl bg-emerald-50 border border-emerald-200 p-5">
              <div className="text-xs text-emerald-700 font-bold uppercase">Cost Value</div>
              <div className="mt-2 text-2xl font-bold text-emerald-900">{formatPKR(inventoryValue.totals.totalCostValue)}</div>
            </div>
            <div className="rounded-2xl bg-violet-50 border border-violet-200 p-5">
              <div className="text-xs text-violet-700 font-bold uppercase">Potential Profit</div>
              <div className="mt-2 text-2xl font-bold text-violet-900">{formatPKR(inventoryValue.totals.potentialProfit)}</div>
              <div className="text-xs text-violet-700 mt-1">
                {inventoryValue.totals.potentialMargin.toFixed(1)}% margin
              </div>
            </div>
          </section>

          <section className="rounded-3xl bg-white border border-slate-200 shadow-sm overflow-hidden">
            <div className="px-6 py-5 border-b border-slate-100">
              <h3 className="text-xl font-bold text-slate-900">Inventory Value by Category</h3>
            </div>
            <table className="w-full text-sm">
              <thead className="bg-slate-50 text-slate-600">
                <tr>
                  <th className="text-left px-6 py-3 font-medium">Category</th>
                  <th className="text-right px-6 py-3 font-medium">Products</th>
                  <th className="text-right px-6 py-3 font-medium">Stock</th>
                  <th className="text-right px-6 py-3 font-medium">Cost Value</th>
                  <th className="text-right px-6 py-3 font-medium">Sell Value</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-100">
                {inventoryValue.byCategory.map((c) => (
                  <tr key={c.id} className="hover:bg-slate-50">
                    <td className="px-6 py-3">
                      <div className="flex items-center gap-2">
                        <span className="h-3 w-3 rounded-full" style={{ backgroundColor: c.color }} />
                        <span className="font-medium text-slate-900">{c.name}</span>
                      </div>
                    </td>
                    <td className="px-6 py-3 text-right">{c.productCount}</td>
                    <td className="px-6 py-3 text-right">{c.totalStock}</td>
                    <td className="px-6 py-3 text-right font-semibold text-emerald-700">{formatPKR(c.costValue)}</td>
                    <td className="px-6 py-3 text-right font-semibold text-violet-700">{formatPKR(c.sellValue)}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </section>
        </>
      )}
    </div>
  );
}
