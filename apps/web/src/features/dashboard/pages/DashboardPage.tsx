import { useQuery } from '@tanstack/react-query';
import { Link } from 'react-router-dom';
import {
  Package,
  AlertTriangle,
  Users,
  ShoppingCart,
  ArrowRight,
  Plus,
  Sparkles,
  Receipt,
  Truck,
  TrendingUp,
  Wallet,
  PackagePlus,
  Tag,
  TrendingDown,
} from 'lucide-react';
import { dashboardApi } from '@/api/dashboard.api';
import { Button } from '@/components/ui/Button';
import { formatPKR } from '@/lib/format';

const formatDate = (value: string) =>
  new Intl.DateTimeFormat('en-PK', {
    dateStyle: 'medium',
    timeStyle: 'short',
  }).format(new Date(value));

export default function DashboardPage() {
  const { data, isLoading } = useQuery({
    queryKey: ['dashboard-overview'],
    queryFn: dashboardApi.overview,
  });

  const stats = data?.stats;

  const heroCards = [
    {
      title: 'Aaj ki Sales',
      value: formatPKR(stats?.salesToday ?? 0),
      icon: TrendingUp,
      color: 'from-emerald-500 to-green-600',
    },
    {
      title: 'Aaj ka Net Profit',
      value: formatPKR(stats?.netProfitToday ?? 0),
      icon: Sparkles,
      color: 'from-cyan-500 to-teal-600',
    },
    {
      title: 'Aaj ke Expenses',
      value: formatPKR(stats?.expensesToday ?? 0),
      icon: TrendingDown,
      color: 'from-rose-500 to-red-600',
    },
    {
      title: 'Mahine ka Net Profit',
      value: formatPKR(stats?.netProfitMonth ?? 0),
      icon: Wallet,
      color: 'from-violet-500 to-purple-600',
    },
  ];

  const operationCards = [
    { title: 'Total Orders', value: stats?.totalOrders ?? 0, icon: ShoppingCart, tone: 'bg-blue-100 text-blue-700' },
    { title: 'Products', value: stats?.totalProducts ?? 0, icon: Package, tone: 'bg-violet-100 text-violet-700' },
    { title: 'Categories', value: stats?.totalCategories ?? 0, icon: Tag, tone: 'bg-emerald-100 text-emerald-700' },
    { title: 'Low Stock', value: stats?.lowStockProducts ?? 0, icon: AlertTriangle, tone: 'bg-amber-100 text-amber-700' },
    { title: 'Suppliers', value: stats?.totalSuppliers ?? 0, icon: Truck, tone: 'bg-orange-100 text-orange-700' },
    { title: 'Users', value: stats?.totalUsers ?? 0, icon: Users, tone: 'bg-pink-100 text-pink-700' },
  ];

  return (
    <div className="space-y-6">
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
              Aaj aap ka asli profit kya hai
            </h2>
            <p className="mt-3 text-white/80 text-sm sm:text-base leading-relaxed">
              Sales − Cost − Expenses = Real Net Profit. Complete picture, ek nazar mein.
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

      <section className="grid grid-cols-1 sm:grid-cols-2 xl:grid-cols-4 gap-4">
        {heroCards.map((card) => {
          const Icon = card.icon;
          return (
            <div
              key={card.title}
              className="rounded-2xl bg-white border border-slate-200 p-5 shadow-sm hover:shadow-soft transition"
            >
              <div className="flex items-start justify-between">
                <div>
                  <p className="text-sm text-slate-500">{card.title}</p>
                  <h3 className="mt-2 text-2xl font-bold text-slate-900">
                    {isLoading ? '...' : card.value}
                  </h3>
                </div>
                <div className={`h-11 w-11 rounded-2xl bg-gradient-to-br ${card.color} text-white flex items-center justify-center shadow-lg`}>
                  <Icon className="h-5 w-5" />
                </div>
              </div>
            </div>
          );
        })}
      </section>

      <section className="rounded-3xl bg-white border border-slate-200 shadow-sm p-6">
        <div className="flex items-center justify-between mb-5">
          <div>
            <h3 className="text-xl font-bold text-slate-900">Profit & Loss — Is Mahina</h3>
            <p className="text-sm text-slate-500">Sales, Cost, Expenses aur Net Profit</p>
          </div>
        </div>

        <div className="grid sm:grid-cols-3 gap-4">
          <div className="rounded-2xl bg-emerald-50 border border-emerald-200 p-5">
            <div className="text-sm text-emerald-700">Revenue</div>
            <div className="mt-2 text-2xl font-bold text-emerald-900">
              {formatPKR(stats?.salesMonth ?? 0)}
            </div>
            <div className="text-xs text-emerald-700 mt-1">Total sales this month</div>
          </div>
          <div className="rounded-2xl bg-rose-50 border border-rose-200 p-5">
            <div className="text-sm text-rose-700">Expenses</div>
            <div className="mt-2 text-2xl font-bold text-rose-900">
              {formatPKR(stats?.expensesMonth ?? 0)}
            </div>
            <div className="text-xs text-rose-700 mt-1">Total expenses this month</div>
          </div>
          <div className="rounded-2xl bg-gradient-to-br from-brand-600 to-brand-800 text-white p-5">
            <div className="text-sm text-white/80">Net Profit</div>
            <div className="mt-2 text-2xl font-bold">
              {formatPKR(stats?.netProfitMonth ?? 0)}
            </div>
            <div className="text-xs text-white/80 mt-1">Sales − Cost − Expenses</div>
          </div>
        </div>
      </section>

      <section className="grid grid-cols-2 sm:grid-cols-3 xl:grid-cols-6 gap-4">
        {operationCards.map((card) => {
          const Icon = card.icon;
          return (
            <div
              key={card.title}
              className="rounded-2xl bg-white border border-slate-200 p-4 shadow-sm"
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
            </div>
          );
        })}
      </section>

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
                <div key={item.id} className="px-6 py-4 flex items-center justify-between gap-4">
                  <div className="min-w-0">
                    <div className="font-medium text-slate-900 truncate">{item.name}</div>
                    <div className="text-xs text-slate-500">SKU: {item.sku || '—'}</div>
                  </div>
                  <div className="text-right shrink-0">
                    <div className="font-semibold text-slate-900">{formatPKR(item.price)}</div>
                    <div className="text-xs text-slate-500">Stock: {item.stock}</div>
                  </div>
                </div>
              ))
            ) : (
              <div className="px-6 py-12 text-center">
                <div className="mx-auto h-16 w-16 rounded-3xl bg-slate-100 flex items-center justify-center">
                  <Package className="h-7 w-7 text-slate-400" />
                </div>
                <h4 className="mt-4 text-lg font-semibold text-slate-900">Abhi koi product nahi</h4>
                <Link to="/products" className="inline-block mt-4">
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
              data.recentSales.map((sale) => (
                <div key={sale.id} className="px-6 py-4 flex items-center justify-between gap-4">
                  <div className="min-w-0">
                    <div className="font-medium text-slate-900 truncate">{sale.saleNumber}</div>
                    <div className="text-xs text-slate-500">
                      {sale.customer?.name || 'Walk-in Customer'} • {formatDate(sale.soldAt)}
                    </div>
                  </div>
                  <div className="text-right shrink-0">
                    <div className="font-semibold text-slate-900">{formatPKR(sale.total)}</div>
                    <div className="text-xs text-slate-500">{sale.paymentMethod}</div>
                  </div>
                </div>
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
    </div>
  );
}
