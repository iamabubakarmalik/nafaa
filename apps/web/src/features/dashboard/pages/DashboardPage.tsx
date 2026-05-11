import { useQuery } from '@tanstack/react-query';
import { Link } from 'react-router-dom';
import {
  Package, AlertTriangle, Users, ShoppingCart, ArrowRight, Plus,
  Sparkles, Receipt, Truck, TrendingUp, TrendingDown, Wallet,
  PackagePlus, Tag, BookOpen, Award, BarChart3, Target, Boxes,
  DollarSign, Crown, Activity, Layers,
} from 'lucide-react';
import {
  ResponsiveContainer, AreaChart, Area, XAxis, YAxis, Tooltip, CartesianGrid,
} from 'recharts';
import { dashboardApi } from '@/api/dashboard.api';
import { Button } from '@/components/ui/Button';
import { formatPKR } from '@/lib/format';

const formatDate = (value: string) =>
  new Intl.DateTimeFormat('en-PK', {
    dateStyle: 'medium',
    timeStyle: 'short',
  }).format(new Date(value));

const formatPercent = (n: number) => {
  const sign = n > 0 ? '+' : '';
  return `${sign}${n.toFixed(1)}%`;
};

export default function DashboardPage() {
  const { data, isLoading } = useQuery({
    queryKey: ['dashboard-overview'],
    queryFn: dashboardApi.overview,
  });

  const stats = data?.stats;
  const trendData = (data?.salesTrend7Days ?? []).map((p) => {
    const d = new Date(p.date);
    const dayName = ['Sun', 'Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat'][d.getDay()];
    return { ...p, label: dayName };
  });

  const growthVsYesterday = stats?.salesGrowthVsYesterday ?? 0;
  const growthVsLastMonth = stats?.salesGrowthVsLastMonth ?? 0;

  return (
    <div className="space-y-6">
      {/* ===== Hero ===== */}
      <section className="relative overflow-hidden rounded-3xl bg-gradient-to-br from-slate-950 via-brand-900 to-brand-700 text-white p-6 sm:p-8 shadow-soft">
        <div className="absolute -top-16 -right-16 h-48 w-48 rounded-full bg-white/10 blur-2xl" />
        <div className="absolute -bottom-16 -left-16 h-48 w-48 rounded-full bg-accent-500/20 blur-2xl" />

        <div className="relative flex flex-col lg:flex-row lg:items-center lg:justify-between gap-6">
          <div className="max-w-2xl">
            <div className="inline-flex items-center gap-2 rounded-full bg-white/10 px-3 py-1 text-xs font-medium">
              <Sparkles className="h-3.5 w-3.5 text-accent-500" />
              Premium Retail Workspace
            </div>
            <h2 className="mt-4 text-3xl sm:text-4xl font-bold leading-tight">
              Aaj aap ka asli profit
            </h2>
            <div className="mt-3 flex items-baseline gap-3">
              <div className="text-4xl sm:text-5xl font-extrabold">
                {isLoading ? '...' : formatPKR(stats?.netProfitToday ?? 0)}
              </div>
              {growthVsYesterday !== 0 && (
                <div
                  className={`inline-flex items-center gap-1 px-2 py-1 rounded-md text-xs font-bold ${
                    growthVsYesterday >= 0
                      ? 'bg-emerald-500/20 text-emerald-200'
                      : 'bg-rose-500/20 text-rose-200'
                  }`}
                >
                  {growthVsYesterday >= 0 ? (
                    <TrendingUp className="h-3 w-3" />
                  ) : (
                    <TrendingDown className="h-3 w-3" />
                  )}
                  {formatPercent(growthVsYesterday)} vs yesterday
                </div>
              )}
            </div>
            <p className="mt-2 text-white/80 text-sm">
              Sales {formatPKR(stats?.salesToday ?? 0)} − Cost {formatPKR(stats?.cogsToday ?? 0)} − Expenses {formatPKR(stats?.expensesToday ?? 0)}
            </p>
          </div>

          <div className="flex flex-wrap gap-3">
            <Link to="/pos">
              <Button size="lg" className="bg-white text-slate-900 hover:bg-slate-100">
                <ShoppingCart className="h-4 w-4" />
                Open POS
              </Button>
            </Link>
            <Link to="/expenses">
              <Button size="lg" className="bg-rose-500 hover:bg-rose-400 text-white">
                <Wallet className="h-4 w-4" />
                Add Expense
              </Button>
            </Link>
          </div>
        </div>
      </section>

      {/* ===== 4 Hero KPI Cards ===== */}
      <section className="grid grid-cols-1 sm:grid-cols-2 xl:grid-cols-4 gap-4">
        {[
          {
            title: 'Aaj ki Sales',
            value: formatPKR(stats?.salesToday ?? 0),
            subtitle: `${stats?.ordersToday ?? 0} orders • AOV ${formatPKR(stats?.aovToday ?? 0)}`,
            icon: TrendingUp,
            color: 'from-emerald-500 to-green-600',
          },
          {
            title: 'Aaj ka Net Profit',
            value: formatPKR(stats?.netProfitToday ?? 0),
            subtitle: 'Sales − Cost − Expenses',
            icon: Target,
            color: 'from-cyan-500 to-teal-600',
          },
          {
            title: 'Aaj ke Expenses',
            value: formatPKR(stats?.expensesToday ?? 0),
            subtitle: `${stats?.expenseCountToday ?? 0} entries`,
            icon: TrendingDown,
            color: 'from-rose-500 to-red-600',
          },
          {
            title: 'Mahine ka Net Profit',
            value: formatPKR(stats?.netProfitMonth ?? 0),
            subtitle: growthVsLastMonth !== 0 ? `${formatPercent(growthVsLastMonth)} vs last month` : 'This month',
            icon: Wallet,
            color: 'from-violet-500 to-purple-600',
          },
        ].map((card) => {
          const Icon = card.icon;
          return (
            <div
              key={card.title}
              className="rounded-2xl bg-white border border-slate-200 p-5 shadow-sm hover:shadow-soft transition"
            >
              <div className="flex items-start justify-between">
                <div className="flex-1 min-w-0">
                  <p className="text-sm text-slate-500">{card.title}</p>
                  <h3 className="mt-2 text-2xl font-bold text-slate-900 truncate">
                    {isLoading ? '...' : card.value}
                  </h3>
                  <p className="mt-1 text-xs text-slate-500 truncate">{card.subtitle}</p>
                </div>
                <div className={`h-11 w-11 rounded-2xl bg-gradient-to-br ${card.color} text-white flex items-center justify-center shadow-lg shrink-0`}>
                  <Icon className="h-5 w-5" />
                </div>
              </div>
            </div>
          );
        })}
      </section>

      {/* ===== 7-Day Trend + Cash Register ===== */}
      <section className="grid lg:grid-cols-[1.5fr_1fr] gap-6">
        {/* Trend Chart */}
        <div className="rounded-3xl bg-white border border-slate-200 shadow-sm p-6">
          <div className="flex items-center justify-between mb-5">
            <div>
              <h3 className="text-xl font-bold text-slate-900">7-Day Sales Trend</h3>
              <p className="text-sm text-slate-500">Sales & profit pattern</p>
            </div>
            <Link to="/reports" className="text-brand-700 text-sm font-medium inline-flex items-center gap-1">
              Full reports <ArrowRight className="h-4 w-4" />
            </Link>
          </div>

          {trendData.length >= 2 ? (
            <div className="h-[260px]">
              <ResponsiveContainer width="100%" height="100%">
                <AreaChart data={trendData}>
                  <defs>
                    <linearGradient id="dashSalesGrad" x1="0" y1="0" x2="0" y2="1">
                      <stop offset="0%" stopColor="#2c9466" stopOpacity={0.4} />
                      <stop offset="100%" stopColor="#2c9466" stopOpacity={0} />
                    </linearGradient>
                    <linearGradient id="dashProfitGrad" x1="0" y1="0" x2="0" y2="1">
                      <stop offset="0%" stopColor="#8b5cf6" stopOpacity={0.3} />
                      <stop offset="100%" stopColor="#8b5cf6" stopOpacity={0} />
                    </linearGradient>
                  </defs>
                  <CartesianGrid strokeDasharray="3 3" stroke="#e2e8f0" />
                  <XAxis dataKey="label" stroke="#64748b" fontSize={12} />
                  <YAxis stroke="#64748b" fontSize={12} tickFormatter={(v) => `${(v / 1000).toFixed(0)}k`} />
                  <Tooltip
                    formatter={(value: any) => formatPKR(Number(value))}
                    contentStyle={{ borderRadius: 12, border: '1px solid #e2e8f0' }}
                  />
                  <Area type="monotone" dataKey="sales" name="Sales" stroke="#2c9466" fill="url(#dashSalesGrad)" strokeWidth={2.5} />
                  <Area type="monotone" dataKey="profit" name="Profit" stroke="#8b5cf6" fill="url(#dashProfitGrad)" strokeWidth={2} />
                </AreaChart>
              </ResponsiveContainer>
            </div>
          ) : (
            <div className="h-[260px] flex items-center justify-center text-sm text-slate-500">
              Need more data to show trend
            </div>
          )}
        </div>

        {/* Cash Register Status */}
        <div className="space-y-4">
          {stats?.registerOpen ? (
            <Link to="/cash-register" className="block">
              <div className="rounded-3xl bg-gradient-to-br from-emerald-500 to-green-600 text-white p-6 shadow-soft hover:shadow-lg transition">
                <div className="flex items-center gap-3 mb-3">
                  <div className="h-12 w-12 rounded-2xl bg-white/20 flex items-center justify-center">
                    <Wallet className="h-6 w-6" />
                  </div>
                  <div>
                    <div className="flex items-center gap-1.5">
                      <span className="h-2 w-2 rounded-full bg-white animate-pulse"></span>
                      <span className="text-xs font-extrabold uppercase tracking-wider opacity-90">Register Open</span>
                    </div>
                    <h3 className="text-2xl font-bold mt-1">{formatPKR(stats.registerExpected)}</h3>
                  </div>
                </div>
                <div className="pt-3 border-t border-white/20 text-xs opacity-90">
                  Opening: {formatPKR(stats.registerOpening)}
                </div>
              </div>
            </Link>
          ) : (
            <Link to="/cash-register" className="block">
              <div className="rounded-3xl bg-amber-50 border-2 border-dashed border-amber-300 p-6">
                <div className="flex items-center gap-3">
                  <div className="h-12 w-12 rounded-2xl bg-amber-500 flex items-center justify-center">
                    <Wallet className="h-6 w-6 text-white" />
                  </div>
                  <div>
                    <div className="text-xs font-extrabold uppercase tracking-wider text-amber-800">Register Closed</div>
                    <h3 className="text-base font-bold text-amber-900 mt-1">Open to start tracking</h3>
                  </div>
                </div>
              </div>
            </Link>
          )}

          {/* Inventory Value */}
          <div className="rounded-3xl bg-white border border-slate-200 p-6 shadow-sm">
            <div className="flex items-center gap-3 mb-3">
              <div className="h-11 w-11 rounded-2xl bg-blue-100 text-blue-700 flex items-center justify-center">
                <Boxes className="h-5 w-5" />
              </div>
              <div className="flex-1">
                <div className="text-xs font-bold uppercase tracking-wider text-slate-500">Stock Value</div>
                <h3 className="text-xl font-bold text-slate-900">{formatPKR(stats?.inventoryValueAtCost ?? 0)}</h3>
              </div>
            </div>
            <div className="pt-3 border-t border-slate-100 grid grid-cols-2 gap-3 text-xs">
              <div>
                <div className="text-slate-500">Sell Value</div>
                <div className="font-bold text-emerald-700">{formatPKR(stats?.inventoryValueAtPrice ?? 0)}</div>
              </div>
              <div>
                <div className="text-slate-500">Potential Profit</div>
                <div className="font-bold text-violet-700">{formatPKR(stats?.potentialProfit ?? 0)}</div>
              </div>
            </div>
          </div>
        </div>
      </section>

      {/* ===== Profit & Loss This Month ===== */}
      <section className="rounded-3xl bg-white border border-slate-200 shadow-sm p-6">
        <div className="flex items-center justify-between mb-5">
          <div>
            <h3 className="text-xl font-bold text-slate-900">Profit & Loss — Is Mahina</h3>
            <p className="text-sm text-slate-500">Sales, Cost, Expenses aur Net Profit</p>
          </div>
        </div>

        <div className="grid sm:grid-cols-4 gap-4">
          <div className="rounded-2xl bg-emerald-50 border border-emerald-200 p-5">
            <div className="text-xs font-bold uppercase tracking-wider text-emerald-700">Revenue</div>
            <div className="mt-2 text-2xl font-bold text-emerald-900">{formatPKR(stats?.salesMonth ?? 0)}</div>
            <div className="text-xs text-emerald-700 mt-1">{stats?.ordersMonth ?? 0} orders</div>
          </div>
          <div className="rounded-2xl bg-rose-50 border border-rose-200 p-5">
            <div className="text-xs font-bold uppercase tracking-wider text-rose-700">Cost of Goods</div>
            <div className="mt-2 text-2xl font-bold text-rose-900">{formatPKR(stats?.cogsMonth ?? 0)}</div>
            <div className="text-xs text-rose-700 mt-1">COGS</div>
          </div>
          <div className="rounded-2xl bg-amber-50 border border-amber-200 p-5">
            <div className="text-xs font-bold uppercase tracking-wider text-amber-700">Expenses</div>
            <div className="mt-2 text-2xl font-bold text-amber-900">{formatPKR(stats?.expensesMonth ?? 0)}</div>
            <div className="text-xs text-amber-700 mt-1">Business spending</div>
          </div>
          <div className="rounded-2xl bg-gradient-to-br from-brand-600 to-brand-800 text-white p-5">
            <div className="text-xs font-bold uppercase tracking-wider text-white/80">Net Profit</div>
            <div className="mt-2 text-2xl font-bold">{formatPKR(stats?.netProfitMonth ?? 0)}</div>
            <div className="text-xs text-white/80 mt-1">Sales − Cost − Expenses</div>
          </div>
        </div>
      </section>

      {/* ===== Operations Stats Grid ===== */}
      <section className="grid grid-cols-2 sm:grid-cols-3 xl:grid-cols-6 gap-4">
        {[
          { title: 'Orders', value: stats?.totalOrders ?? 0, icon: ShoppingCart, tone: 'bg-blue-100 text-blue-700' },
          { title: 'Products', value: stats?.totalProducts ?? 0, icon: Package, tone: 'bg-violet-100 text-violet-700' },
          { title: 'Customers', value: stats?.totalCustomers ?? 0, icon: Users, tone: 'bg-pink-100 text-pink-700' },
          { title: 'Low Stock', value: stats?.lowStockCount ?? 0, icon: AlertTriangle, tone: 'bg-amber-100 text-amber-700', link: '/low-stock' },
          { title: 'Suppliers', value: stats?.totalSuppliers ?? 0, icon: Truck, tone: 'bg-orange-100 text-orange-700' },
          { title: 'Categories', value: stats?.totalCategories ?? 0, icon: Tag, tone: 'bg-emerald-100 text-emerald-700' },
        ].map((card) => {
          const Icon = card.icon;
          const Wrapper: any = card.link ? Link : 'div';
          return (
            <Wrapper
              key={card.title}
              {...(card.link ? { to: card.link } : {})}
              className="rounded-2xl bg-white border border-slate-200 p-4 shadow-sm hover:shadow-md transition block"
            >
              <div className="flex items-center justify-between">
                <div>
                  <p className="text-xs text-slate-500">{card.title}</p>
                  <h3 className="mt-1 text-lg font-bold text-slate-900">
                    {isLoading ? '...' : card.value}
                  </h3>
                </div>
                <div className={`h-9 w-9 rounded-xl ${card.tone} flex items-center justify-center`}>
                  <Icon className="h-4 w-4" />
                </div>
              </div>
            </Wrapper>
          );
        })}
      </section>

      {/* ===== Low Stock + Top Products ===== */}
      <section className="grid lg:grid-cols-2 gap-6">
        {/* Low Stock Alerts */}
        <div className="rounded-3xl bg-white border border-slate-200 shadow-sm">
          <div className="px-6 py-5 border-b border-slate-100 flex items-center justify-between">
            <div className="flex items-center gap-2">
              <AlertTriangle className="h-5 w-5 text-amber-500" />
              <div>
                <h3 className="text-lg font-bold text-slate-900">Low Stock Alerts</h3>
                <p className="text-sm text-slate-500">{data?.lowStockProducts?.length ?? 0} items need attention</p>
              </div>
            </div>
            <Link to="/low-stock" className="text-brand-700 text-sm font-medium inline-flex items-center gap-1">
              All <ArrowRight className="h-4 w-4" />
            </Link>
          </div>
          <div className="divide-y divide-slate-100">
            {data?.lowStockProducts?.length ? (
              data.lowStockProducts.slice(0, 6).map((p) => {
                const isOut = p.stock === 0;
                return (
                  <Link
                    key={p.id}
                    to={`/products/${p.id}/edit`}
                    className="px-6 py-3 flex items-center justify-between gap-3 hover:bg-slate-50 transition"
                  >
                    <div className="flex items-center gap-3 min-w-0">
                      <div className={`h-10 w-10 rounded-xl flex items-center justify-center ${
                        isOut ? 'bg-rose-100' : 'bg-amber-100'
                      }`}>
                        <Package className={`h-4 w-4 ${isOut ? 'text-rose-700' : 'text-amber-700'}`} />
                      </div>
                      <div className="min-w-0">
                        <div className="font-medium text-slate-900 truncate">{p.name}</div>
                        <div className="text-xs text-slate-500">{formatPKR(p.price)} / {p.unit}</div>
                      </div>
                    </div>
                    <div className="text-right shrink-0">
                      <div className={`font-bold text-lg ${isOut ? 'text-rose-700' : 'text-amber-700'}`}>
                        {p.stock}
                      </div>
                      <div className={`text-[10px] font-bold uppercase ${isOut ? 'text-rose-700' : 'text-amber-700'}`}>
                        {isOut ? 'OUT' : 'LOW'}
                      </div>
                    </div>
                  </Link>
                );
              })
            ) : (
              <div className="px-6 py-12 text-center">
                <div className="mx-auto h-16 w-16 rounded-3xl bg-emerald-100 flex items-center justify-center">
                  <Package className="h-7 w-7 text-emerald-700" />
                </div>
                <h4 className="mt-4 text-lg font-semibold text-slate-900">All stock healthy! 🎉</h4>
                <p className="mt-1 text-xs text-slate-500">Koi product low stock par nahi hai</p>
              </div>
            )}
          </div>
        </div>

        {/* Top Products */}
        <div className="rounded-3xl bg-white border border-slate-200 shadow-sm">
          <div className="px-6 py-5 border-b border-slate-100 flex items-center justify-between">
            <div className="flex items-center gap-2">
              <Award className="h-5 w-5 text-amber-500" />
              <div>
                <h3 className="text-lg font-bold text-slate-900">Top Products</h3>
                <p className="text-sm text-slate-500">Best sellers this month</p>
              </div>
            </div>
            <Link to="/reports" className="text-brand-700 text-sm font-medium inline-flex items-center gap-1">
              Reports <ArrowRight className="h-4 w-4" />
            </Link>
          </div>
          <div className="divide-y divide-slate-100">
            {data?.topProducts?.length ? (
              data.topProducts.slice(0, 5).map((p, idx) => (
                <div key={p.productId} className="px-6 py-3 flex items-center justify-between gap-3">
                  <div className="flex items-center gap-3 min-w-0">
                    <div className={`h-10 w-10 rounded-xl flex items-center justify-center font-bold text-sm ${
                      idx === 0 ? 'bg-amber-100 text-amber-700' :
                      idx === 1 ? 'bg-slate-200 text-slate-700' :
                      idx === 2 ? 'bg-orange-100 text-orange-700' :
                      'bg-violet-100 text-violet-700'
                    }`}>
                      {idx < 3 ? <Crown className="h-4 w-4" /> : `#${idx + 1}`}
                    </div>
                    <div className="min-w-0">
                      <div className="font-medium text-slate-900 truncate">{p.product?.name || 'Unknown'}</div>
                      <div className="text-xs text-slate-500">{p.quantitySold} {p.product?.unit} sold</div>
                    </div>
                  </div>
                  <div className="text-right shrink-0">
                    <div className="font-bold text-emerald-700">{formatPKR(p.revenue)}</div>
                    <div className="text-xs text-slate-500">{p.orderCount} orders</div>
                  </div>
                </div>
              ))
            ) : (
              <div className="px-6 py-12 text-center text-sm text-slate-500">
                Abhi koi sales data nahi
              </div>
            )}
          </div>
        </div>
      </section>

      {/* ===== Recent Products + Recent Sales ===== */}
      <section className="grid lg:grid-cols-[1.2fr_1fr] gap-6">
        <div className="rounded-3xl bg-white border border-slate-200 shadow-sm">
          <div className="px-6 py-5 border-b border-slate-100 flex items-center justify-between">
            <div>
              <h3 className="text-lg font-bold text-slate-900">Recent Products</h3>
              <p className="text-sm text-slate-500">Naye add hone wale products</p>
            </div>
            <Link to="/products" className="text-brand-700 text-sm font-medium inline-flex items-center gap-1">
              Sab dekhein <ArrowRight className="h-4 w-4" />
            </Link>
          </div>

          <div className="divide-y divide-slate-100">
            {data?.recentProducts?.length ? (
              data.recentProducts.map((item) => (
                <Link
                  key={item.id}
                  to={`/products/${item.id}/edit`}
                  className="px-6 py-4 flex items-center justify-between gap-4 hover:bg-slate-50 transition"
                >
                  <div className="min-w-0 flex items-center gap-3">
                    {item.images?.[0]?.url ? (
                      <img src={item.images[0].url} alt="" className="h-10 w-10 rounded-xl object-cover" />
                    ) : (
                      <div className="h-10 w-10 rounded-xl bg-slate-100 flex items-center justify-center">
                        <Package className="h-4 w-4 text-slate-400" />
                      </div>
                    )}
                    <div className="min-w-0">
                      <div className="font-medium text-slate-900 truncate">{item.name}</div>
                      <div className="text-xs text-slate-500">SKU: {item.sku || '—'}</div>
                    </div>
                  </div>
                  <div className="text-right shrink-0">
                    <div className="font-semibold text-slate-900">{formatPKR(item.price)}</div>
                    <div className="text-xs text-slate-500">Stock: {item.stock} {item.unit}</div>
                  </div>
                </Link>
              ))
            ) : (
              <div className="px-6 py-12 text-center">
                <div className="mx-auto h-16 w-16 rounded-3xl bg-slate-100 flex items-center justify-center">
                  <Package className="h-7 w-7 text-slate-400" />
                </div>
                <h4 className="mt-4 text-lg font-semibold text-slate-900">Abhi koi product nahi</h4>
                <Link to="/products/new" className="inline-block mt-4">
                  <Button>
                    <Plus className="h-4 w-4" />
                    Product add karein
                  </Button>
                </Link>
              </div>
            )}
          </div>
        </div>

        <div className="rounded-3xl bg-white border border-slate-200 shadow-sm">
          <div className="px-6 py-5 border-b border-slate-100 flex items-center justify-between">
            <div>
              <h3 className="text-lg font-bold text-slate-900">Recent Sales</h3>
              <p className="text-sm text-slate-500">Latest receipts</p>
            </div>
            <Link to="/sales" className="text-brand-700 text-sm font-medium inline-flex items-center gap-1">
              View all <ArrowRight className="h-4 w-4" />
            </Link>
          </div>

          <div className="divide-y divide-slate-100">
            {data?.recentSales?.length ? (
              data.recentSales.slice(0, 6).map((sale) => (
                <Link
                  key={sale.id}
                  to={`/sales/${sale.id}/receipt`}
                  className="px-6 py-4 flex items-center justify-between gap-4 hover:bg-slate-50 transition"
                >
                  <div className="min-w-0">
                    <div className="font-medium text-slate-900 truncate font-mono text-sm">{sale.saleNumber}</div>
                    <div className="text-xs text-slate-500">
                      {sale.customer?.name || 'Walk-in'} • {formatDate(sale.soldAt)}
                    </div>
                  </div>
                  <div className="text-right shrink-0">
                    <div className="font-semibold text-emerald-700">{formatPKR(sale.total)}</div>
                    <div className="text-xs text-slate-500">{sale.paymentMethod}</div>
                  </div>
                </Link>
              ))
            ) : (
              <div className="px-6 py-12 text-center">
                <div className="mx-auto h-16 w-16 rounded-3xl bg-slate-100 flex items-center justify-center">
                  <Receipt className="h-7 w-7 text-slate-400" />
                </div>
                <h4 className="mt-4 text-lg font-semibold text-slate-900">Abhi koi sale nahi</h4>
              </div>
            )}
          </div>
        </div>
      </section>

      {/* ===== Udhaar Alert ===== */}
      {(stats?.totalUdhaar ?? 0) > 0 && (
        <section>
          <Link to="/khata" className="block">
            <div className="rounded-3xl bg-gradient-to-r from-rose-50 to-amber-50 border-2 border-rose-200 p-6 hover:shadow-soft transition">
              <div className="flex items-center justify-between gap-4">
                <div className="flex items-center gap-4">
                  <div className="h-14 w-14 rounded-2xl bg-rose-500 flex items-center justify-center">
                    <BookOpen className="h-6 w-6 text-white" />
                  </div>
                  <div>
                    <div className="text-xs font-bold uppercase tracking-wider text-rose-700">
                      Total Udhaar Outstanding
                    </div>
                    <div className="text-2xl font-bold text-rose-900">{formatPKR(stats?.totalUdhaar ?? 0)}</div>
                    <div className="text-xs text-rose-700 mt-0.5">
                      {stats?.customersWithUdhaar} customers — Collect karein
                    </div>
                  </div>
                </div>
                <ArrowRight className="h-6 w-6 text-rose-700" />
              </div>
            </div>
          </Link>
        </section>
      )}
    </div>
  );
}
