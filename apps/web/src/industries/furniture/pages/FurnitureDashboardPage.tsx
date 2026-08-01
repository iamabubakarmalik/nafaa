import { useQuery } from '@tanstack/react-query';
import { Link } from 'react-router-dom';
import {
  Sofa, TrendingUp, DollarSign, Package, ClipboardList, Truck,
  Hammer, RefreshCw, ArrowRight, AlertTriangle, Plus, ShoppingCart,
  Clock, CheckCircle2, Award, BarChart3, Users, Building2,
} from 'lucide-react';
import {
  ResponsiveContainer, BarChart, Bar, XAxis, YAxis, Tooltip,
  CartesianGrid, PieChart, Pie, Cell, Legend,
} from 'recharts';
import { furnitureDashboardApi } from '../api/dashboard.api';
import { customOrdersApi } from '../api/custom-orders.api';
import { deliveriesApi } from '../api/deliveries.api';
import { formatPKR } from '@core/lib/format';
import { Button } from '@core/ui/Button';
import { PrivacyToggle, useCostHidden } from '@core/ui/HiddenValue';

export default function FurnitureDashboardPage() {
  const hideCost = useCostHidden();

  const { data: overview, isLoading, refetch, isRefetching } = useQuery({
    queryKey: ['furniture-dashboard-overview'],
    queryFn: () => furnitureDashboardApi.overview(),
    refetchInterval: 60_000,
  });

  const { data: customOrderSummary } = useQuery({
    queryKey: ['custom-orders-summary'],
    queryFn: () => customOrdersApi.summary(),
    refetchInterval: 5 * 60_000,
  });

  const { data: deliverySummary } = useQuery({
    queryKey: ['furniture-delivery-summary'],
    queryFn: () => deliveriesApi.summary(),
    refetchInterval: 5 * 60_000,
  });

  const totals = overview?.totals ?? { totalProducts: 0, totalCarpenters: 0, activeCarpenters: 0, activeCustomOrders: 0, quotationOrders: 0, completedCustomOrders: 0 };
  const pending = overview?.pending ?? { deliveries: 0, todayDeliveries: 0, overdueOrders: 0, quotationsToApprove: 0 };
  const financial = overview?.financial ?? { monthlyCustomRevenue: 0, totalReceivable: 0, totalCollected: 0 };
  const overdueOrders = overview?.overdueOrders ?? [];
  const readyForDelivery = overview?.readyForDelivery ?? [];
  const todaySchedule = overview?.todaySchedule ?? [];
  const topProducts = overview?.topProducts ?? [];
  const topCarpenters = overview?.topCarpenters ?? [];
  const byCategory = overview?.byCategory ?? [];

  const categoryChart = byCategory.slice(0, 6).map((c: any) => ({
    name: c.categoryType?.replace(/_/g, ' ') || 'Other',
    count: c._count._all,
  }));

  const showCost = (v: number) => (hideCost ? '••••' : formatPKR(v));

  if (isLoading) {
    return (
      <div className="grid gap-4">
        {Array.from({ length: 4 }).map((_, i) => <div key={i} className="h-32 rounded-3xl bg-slate-100 animate-pulse" />)}
      </div>
    );
  }

  return (
    <div className="space-y-5">
      {/* HERO */}
      <section className="relative overflow-hidden rounded-3xl bg-gradient-to-br from-slate-950 via-amber-900 to-orange-800 text-white p-6 sm:p-8 shadow-2xl">
        <div className="absolute -top-20 -right-20 h-72 w-72 rounded-full bg-amber-400/20 blur-3xl" />
        <div className="absolute -bottom-20 -left-20 h-72 w-72 rounded-full bg-orange-400/15 blur-3xl" />

        <div className="relative flex flex-col lg:flex-row lg:items-start lg:justify-between gap-5">
          <div>
            <div className="inline-flex items-center gap-2 rounded-full bg-white/15 backdrop-blur px-3 py-1 text-xs font-extrabold border border-white/20">
              <Sofa className="h-3.5 w-3.5 text-amber-300" /> Furniture Store
            </div>
            <h1 className="mt-3 text-3xl sm:text-4xl font-extrabold leading-tight">🪑 Furniture Dashboard</h1>
            <p className="mt-2 text-sm text-white/80 font-semibold">
              Custom orders, workshop, deliveries, assembly — one screen
            </p>
          </div>
          <div className="flex items-center gap-2 flex-wrap">
            <button onClick={() => refetch()} disabled={isRefetching}
              className="inline-flex items-center gap-2 rounded-xl bg-white/15 hover:bg-white/25 px-4 py-2.5 text-sm font-bold backdrop-blur border border-white/20">
              <RefreshCw className={`h-4 w-4 ${isRefetching ? 'animate-spin' : ''}`} /> Refresh
            </button>
            <PrivacyToggle />
            <Link to="/furniture/custom-orders/new">
              <Button className="bg-white text-slate-900 hover:bg-slate-100">
                <ClipboardList className="h-4 w-4" /> New Custom Order
              </Button>
            </Link>
          </div>
        </div>

        <div className="relative mt-6 grid grid-cols-2 sm:grid-cols-4 gap-2 sm:gap-3">
          <HeroTile icon={Package} label="Products" value={String(totals.totalProducts)} sub="in catalogue" tone="amber" />
          <HeroTile icon={ClipboardList} label="Active Orders" value={String(totals.activeCustomOrders)} sub={`${totals.quotationOrders} quotations`} tone="orange" />
          <HeroTile icon={Hammer} label="Carpenters" value={`${totals.activeCarpenters}/${totals.totalCarpenters}`} sub="active team" tone="violet" />
          <HeroTile icon={DollarSign} label="Monthly Revenue" value={showCost(financial.monthlyCustomRevenue)} sub="custom orders" tone="emerald" />
        </div>
      </section>

      {/* QUICK ACTIONS */}
      <section className="grid grid-cols-3 sm:grid-cols-6 gap-2 sm:gap-3">
        <QuickAction to="/pos" icon={ShoppingCart} label="POS" tone="amber" />
        <QuickAction to="/furniture-products/new" icon={Plus} label="Add Product" tone="orange" />
        <QuickAction to="/furniture/custom-orders/new" icon={ClipboardList} label="Custom Order" tone="violet" />
        <QuickAction to="/furniture/deliveries" icon={Truck} label="Deliveries" tone="blue" />
        <QuickAction to="/furniture/carpenters" icon={Hammer} label="Carpenters" tone="rose" />
        <QuickAction to="/furniture-products" icon={Sofa} label="Products" tone="emerald" />
      </section>

      {/* ALERTS */}
      {(pending.overdueOrders > 0 || pending.quotationsToApprove > 0 || pending.todayDeliveries > 0) && (
        <section className="rounded-3xl bg-gradient-to-br from-amber-50 via-orange-50 to-red-50 border-2 border-amber-300 p-4 sm:p-5">
          <div className="flex items-center gap-2 mb-3">
            <div className="h-10 w-10 rounded-2xl bg-amber-500 text-white flex items-center justify-center shadow-lg">
              <AlertTriangle className="h-5 w-5" />
            </div>
            <div>
              <h3 className="font-extrabold text-amber-900">Needs attention</h3>
              <p className="text-xs text-amber-800 font-bold">Act on these now</p>
            </div>
          </div>
          <div className="grid sm:grid-cols-2 lg:grid-cols-3 gap-3">
            {pending.overdueOrders > 0 && (
              <AlertCard to="/furniture/custom-orders" icon={Clock}
                title={`${pending.overdueOrders} Overdue Orders`} desc="Past delivery date" tone="rose" />
            )}
            {pending.quotationsToApprove > 0 && (
              <AlertCard to="/furniture/custom-orders?status=QUOTATION" icon={ClipboardList}
                title={`${pending.quotationsToApprove} Quotations Pending`} desc="Awaiting approval" tone="amber" />
            )}
            {pending.todayDeliveries > 0 && (
              <AlertCard to="/furniture/deliveries" icon={Truck}
                title={`${pending.todayDeliveries} Deliveries Today`} desc="Scheduled for today" tone="blue" />
            )}
          </div>
        </section>
      )}

      {/* CHARTS */}
      <section className="grid lg:grid-cols-[1fr_1fr] gap-4 sm:gap-6">
        <div className="rounded-3xl bg-white border-2 border-slate-200 shadow-sm p-5 sm:p-6">
          <div className="flex items-center justify-between mb-4">
            <div>
              <h3 className="text-lg font-extrabold text-slate-900">Product Categories</h3>
              <p className="text-xs text-slate-500 font-bold">Distribution by type</p>
            </div>
            <div className="h-10 w-10 rounded-xl bg-gradient-to-br from-amber-600 to-orange-800 text-white flex items-center justify-center shadow-md">
              <BarChart3 className="h-5 w-5" />
            </div>
          </div>
          {categoryChart.length > 0 ? (
            <div className="h-[260px]">
              <ResponsiveContainer width="100%" height="100%">
                <BarChart data={categoryChart}>
                  <CartesianGrid strokeDasharray="3 3" stroke="#e2e8f0" />
                  <XAxis dataKey="name" stroke="#64748b" fontSize={10} angle={-15} textAnchor="end" height={60} />
                  <YAxis stroke="#64748b" fontSize={11} />
                  <Tooltip contentStyle={{ borderRadius: 12, border: '2px solid #e2e8f0' }} />
                  <Bar dataKey="count" name="Products" radius={[8, 8, 0, 0]}>
                    {categoryChart.map((_: any, i: number) => (
                      <Cell key={i} fill={['#a16207', '#c2410c', '#ea580c', '#f97316', '#fb923c', '#fdba74'][i % 6]} />
                    ))}
                  </Bar>
                </BarChart>
              </ResponsiveContainer>
            </div>
          ) : (
            <div className="h-[260px] flex flex-col items-center justify-center gap-2">
              <BarChart3 className="h-10 w-10 text-slate-300" />
              <p className="text-sm font-extrabold text-slate-500">No product data yet</p>
            </div>
          )}
        </div>

        <div className="rounded-3xl bg-white border-2 border-slate-200 shadow-sm p-5 sm:p-6">
          <div className="flex items-center justify-between mb-4">
            <div>
              <h3 className="text-lg font-extrabold text-slate-900">Custom Order Pipeline</h3>
              <p className="text-xs text-slate-500 font-bold">By status</p>
            </div>
            <div className="h-10 w-10 rounded-xl bg-gradient-to-br from-emerald-500 to-teal-700 text-white flex items-center justify-center shadow-md">
              <TrendingUp className="h-5 w-5" />
            </div>
          </div>
          {customOrderSummary ? (
            <div className="h-[260px]">
              <ResponsiveContainer width="100%" height="100%">
                <PieChart>
                  <Pie data={[
                    { name: 'Quotation', value: customOrderSummary.quotation, fill: '#f59e0b' },
                    { name: 'Deposit Paid', value: customOrderSummary.deposit, fill: '#3b82f6' },
                    { name: 'In Production', value: customOrderSummary.production, fill: '#8b5cf6' },
                    { name: 'Ready', value: customOrderSummary.ready, fill: '#10b981' },
                    { name: 'Delivered', value: customOrderSummary.delivered, fill: '#06b6d4' },
                    { name: 'Completed', value: customOrderSummary.completed, fill: '#059669' },
                  ].filter(x => x.value > 0)}
                    cx="50%" cy="45%" outerRadius={88} innerRadius={50}
                    dataKey="value" nameKey="name"
                    labelLine={false} />
                  <Tooltip contentStyle={{ borderRadius: 12 }} />
                  <Legend wrapperStyle={{ fontSize: 11, paddingTop: 8 }} iconType="circle" />
                </PieChart>
              </ResponsiveContainer>
            </div>
          ) : (
            <div className="h-[260px] flex flex-col items-center justify-center gap-2">
              <ClipboardList className="h-10 w-10 text-slate-300" />
              <p className="text-sm font-extrabold text-slate-500">No custom orders yet</p>
            </div>
          )}
        </div>
      </section>

      {/* FINANCIAL */}
      <section className="grid grid-cols-1 sm:grid-cols-3 gap-3">
        <FinCard label="Monthly Revenue" value={showCost(financial.monthlyCustomRevenue)} sub="From completed orders" tone="emerald" />
        <FinCard label="Total Receivable" value={showCost(financial.totalReceivable)} sub="Outstanding balance" tone="amber" />
        <FinCard label="Total Collected" value={showCost(financial.totalCollected)} sub="Deposits + payments" tone="blue" />
      </section>

      {/* OVERDUE ORDERS + TODAY DELIVERIES */}
      <section className="grid lg:grid-cols-2 gap-4 sm:gap-6">
        <div className="rounded-3xl bg-white border-2 border-slate-200 shadow-sm overflow-hidden">
          <div className="px-5 py-4 border-b-2 border-slate-100 bg-gradient-to-r from-rose-50 to-red-50 flex items-center justify-between gap-2 flex-wrap">
            <div className="flex items-center gap-3">
              <div className="h-10 w-10 rounded-xl bg-gradient-to-br from-rose-500 to-red-700 text-white flex items-center justify-center shadow-md">
                <Clock className="h-5 w-5" />
              </div>
              <div>
                <h3 className="font-extrabold text-slate-900">⏰ Overdue Orders</h3>
                <p className="text-xs text-slate-500 font-bold">Past delivery date</p>
              </div>
            </div>
            <Link to="/furniture/custom-orders" className="text-xs font-extrabold text-rose-700 hover:underline inline-flex items-center gap-1">
              View all <ArrowRight className="h-3 w-3" />
            </Link>
          </div>
          <div className="divide-y-2 divide-slate-100 max-h-[380px] overflow-y-auto">
            {overdueOrders.length === 0 ? (
              <div className="p-10 text-center">
                <CheckCircle2 className="h-12 w-12 text-emerald-300 mx-auto mb-2" />
                <div className="font-extrabold text-slate-700">All orders on track!</div>
              </div>
            ) : overdueOrders.slice(0, 8).map((o: any) => {
              const daysLate = Math.ceil((Date.now() - new Date(o.expectedDeliveryDate).getTime()) / 86400000);
              return (
                <Link key={o.id} to={`/furniture/custom-orders/${o.id}`}
                  className="px-5 py-3 flex items-center gap-3 hover:bg-rose-50/40 transition">
                  <div className="h-10 w-10 rounded-lg bg-rose-100 text-rose-700 flex items-center justify-center shrink-0">
                    <Clock className="h-4 w-4" />
                  </div>
                  <div className="flex-1 min-w-0">
                    <div className="font-mono font-extrabold text-slate-900 text-sm">{o.orderNumber}</div>
                    <div className="text-[11px] text-slate-500 font-bold truncate">
                      {o.customerName} • {o.productType}
                    </div>
                  </div>
                  <div className="text-right shrink-0">
                    <div className="text-lg font-extrabold text-rose-700 tabular-nums leading-none">{daysLate}d</div>
                    <div className="text-[9px] font-bold text-slate-500">late</div>
                  </div>
                </Link>
              );
            })}
          </div>
        </div>

        <div className="rounded-3xl bg-white border-2 border-slate-200 shadow-sm overflow-hidden">
          <div className="px-5 py-4 border-b-2 border-slate-100 bg-gradient-to-r from-blue-50 to-cyan-50 flex items-center justify-between gap-2 flex-wrap">
            <div className="flex items-center gap-3">
              <div className="h-10 w-10 rounded-xl bg-gradient-to-br from-blue-500 to-cyan-700 text-white flex items-center justify-center shadow-md">
                <Truck className="h-5 w-5" />
              </div>
              <div>
                <h3 className="font-extrabold text-slate-900">🚚 Today's Deliveries</h3>
                <p className="text-xs text-slate-500 font-bold">{todaySchedule.length} scheduled</p>
              </div>
            </div>
            <Link to="/furniture/deliveries" className="text-xs font-extrabold text-blue-700 hover:underline inline-flex items-center gap-1">
              View all <ArrowRight className="h-3 w-3" />
            </Link>
          </div>
          <div className="divide-y-2 divide-slate-100 max-h-[380px] overflow-y-auto">
            {todaySchedule.length === 0 ? (
              <div className="p-10 text-center">
                <Truck className="h-12 w-12 text-slate-300 mx-auto mb-2" />
                <div className="font-extrabold text-slate-700">No deliveries today</div>
              </div>
            ) : todaySchedule.slice(0, 8).map((d: any) => (
              <Link key={d.id} to="/furniture/deliveries"
                className="px-5 py-3 flex items-center gap-3 hover:bg-blue-50/40 transition">
                <div className="h-10 w-10 rounded-lg bg-blue-100 text-blue-700 flex items-center justify-center shrink-0">
                  <Truck className="h-4 w-4" />
                </div>
                <div className="flex-1 min-w-0">
                  <div className="font-mono font-extrabold text-slate-900 text-sm">{d.deliveryNumber}</div>
                  <div className="text-[11px] text-slate-500 font-bold truncate">
                    {d.customerName} • {d.itemsCount} items
                  </div>
                </div>
                <div className="text-right shrink-0">
                  <div className="text-xs font-extrabold text-blue-700">{d.scheduledSlot || 'Any time'}</div>
                  <div className="text-[9px] font-bold text-slate-500">{d.status}</div>
                </div>
              </Link>
            ))}
          </div>
        </div>
      </section>

      {/* TOP PRODUCTS + CARPENTERS */}
      <section className="grid lg:grid-cols-2 gap-4 sm:gap-6">
        <div className="rounded-3xl bg-white border-2 border-slate-200 shadow-sm overflow-hidden">
          <div className="px-5 py-4 border-b-2 border-slate-100 bg-gradient-to-r from-amber-50 to-orange-50 flex items-center gap-3">
            <div className="h-10 w-10 rounded-xl bg-gradient-to-br from-amber-600 to-orange-800 text-white flex items-center justify-center shadow-md">
              <Award className="h-5 w-5" />
            </div>
            <div>
              <h3 className="font-extrabold text-slate-900">🏆 Top Selling</h3>
              <p className="text-xs text-slate-500 font-bold">By units sold</p>
            </div>
          </div>
          <div className="divide-y-2 divide-slate-100 max-h-[380px] overflow-y-auto">
            {topProducts.length === 0 ? (
              <div className="p-10 text-center text-sm text-slate-500 font-semibold">No sales yet</div>
            ) : topProducts.slice(0, 8).map((p: any, i: number) => (
              <Link key={p.id ?? i} to={p.productId ? `/furniture-products/${p.productId}` : '/furniture-products'}
                className="px-5 py-3 flex items-center gap-3 hover:bg-slate-50 transition group">
                <div className={`h-8 w-8 rounded-lg text-white flex items-center justify-center font-extrabold text-xs shrink-0 ${
                  i === 0 ? 'bg-amber-500' : i === 1 ? 'bg-slate-400' : i === 2 ? 'bg-orange-600' : 'bg-slate-300'
                }`}>{i + 1}</div>
                <div className="flex-1 min-w-0">
                  <div className="font-extrabold text-sm truncate text-slate-900 group-hover:text-amber-700">
                    {p.modelNumber || 'Product'}
                  </div>
                  <div className="text-[10px] text-slate-500 font-bold">
                    {p.categoryType?.replace(/_/g, ' ')} • {p.totalSold ?? 0} sold
                  </div>
                </div>
                <div className="text-right shrink-0">
                  <div className="font-extrabold text-emerald-700 text-sm tabular-nums">{formatPKR(p.totalRevenue || 0)}</div>
                </div>
              </Link>
            ))}
          </div>
        </div>

        <div className="rounded-3xl bg-white border-2 border-slate-200 shadow-sm overflow-hidden">
          <div className="px-5 py-4 border-b-2 border-slate-100 bg-gradient-to-r from-violet-50 to-purple-50 flex items-center gap-3">
            <div className="h-10 w-10 rounded-xl bg-gradient-to-br from-violet-500 to-purple-700 text-white flex items-center justify-center shadow-md">
              <Hammer className="h-5 w-5" />
            </div>
            <div>
              <h3 className="font-extrabold text-slate-900">🔨 Top Carpenters</h3>
              <p className="text-xs text-slate-500 font-bold">By revenue</p>
            </div>
          </div>
          <div className="divide-y-2 divide-slate-100 max-h-[380px] overflow-y-auto">
            {topCarpenters.length === 0 ? (
              <div className="p-10 text-center">
                <Hammer className="h-12 w-12 text-slate-300 mx-auto mb-2" />
                <div className="text-sm font-extrabold text-slate-700">No carpenters yet</div>
                <Link to="/furniture/carpenters" className="mt-2 inline-block text-violet-600 font-extrabold hover:underline text-xs">
                  Add carpenter →
                </Link>
              </div>
            ) : topCarpenters.map((c: any, i: number) => (
              <Link key={c.id} to="/furniture/carpenters" className="px-5 py-3 flex items-center gap-3 hover:bg-violet-50/40 transition">
                <div className={`h-9 w-9 rounded-lg text-white flex items-center justify-center font-extrabold text-xs shrink-0 ${
                  i === 0 ? 'bg-amber-500' : i === 1 ? 'bg-slate-400' : i === 2 ? 'bg-orange-600' : 'bg-violet-500'
                }`}>{i + 1}</div>
                {c.photoUrl ? (
                  <img src={c.photoUrl} alt="" className="h-10 w-10 rounded-lg object-cover border border-slate-200 shrink-0" />
                ) : (
                  <div className="h-10 w-10 rounded-lg bg-violet-100 text-violet-700 flex items-center justify-center font-extrabold text-sm shrink-0">
                    {c.name.charAt(0)}
                  </div>
                )}
                <div className="flex-1 min-w-0">
                  <div className="font-extrabold text-sm truncate text-slate-900">{c.name}</div>
                  <div className="text-[10px] text-slate-500 font-bold">
                    {c.completedProjects} projects • {c.activeProjects} active
                  </div>
                </div>
                <div className="text-right shrink-0">
                  <div className="font-extrabold text-violet-700 text-sm tabular-nums">{formatPKR(c.totalRevenue || 0)}</div>
                </div>
              </Link>
            ))}
          </div>
        </div>
      </section>
    </div>
  );
}

function HeroTile({ icon: Icon, label, value, sub, tone }: any) {
  const tones: Record<string, string> = {
    amber: 'from-amber-400/30 to-amber-600/20 border-amber-300/40',
    orange: 'from-orange-400/30 to-orange-600/20 border-orange-300/40',
    violet: 'from-violet-400/30 to-violet-600/20 border-violet-300/40',
    emerald: 'from-emerald-400/30 to-emerald-600/20 border-emerald-300/40',
  };
  return (
    <div className={`rounded-xl bg-gradient-to-br ${tones[tone]} backdrop-blur border p-3 sm:p-4`}>
      <div className="flex items-center gap-1.5 mb-1">
        <Icon className="h-3 w-3 opacity-80" />
        <div className="text-[9px] uppercase tracking-wider font-extrabold opacity-90">{label}</div>
      </div>
      <div className="text-lg sm:text-xl font-extrabold text-white tabular-nums leading-none truncate">{value}</div>
      <div className="text-[10px] font-bold text-white/70 mt-0.5 truncate">{sub}</div>
    </div>
  );
}

function QuickAction({ to, icon: Icon, label, tone }: any) {
  const tones: Record<string, string> = {
    amber: 'from-amber-600 to-orange-800',
    orange: 'from-orange-500 to-red-700',
    violet: 'from-violet-500 to-purple-700',
    blue: 'from-blue-500 to-cyan-700',
    rose: 'from-rose-500 to-red-700',
    emerald: 'from-emerald-500 to-teal-700',
  };
  return (
    <Link to={to} className="group rounded-2xl bg-white border-2 border-slate-200 hover:border-amber-300 hover:shadow-lg hover:-translate-y-0.5 transition-all p-3 sm:p-4 text-center">
      <div className={`h-11 w-11 sm:h-12 sm:w-12 rounded-2xl bg-gradient-to-br ${tones[tone]} text-white flex items-center justify-center shadow-md mx-auto mb-2 group-hover:scale-110 transition-transform`}>
        <Icon className="h-5 w-5 sm:h-6 sm:w-6" />
      </div>
      <div className="text-xs sm:text-sm font-extrabold text-slate-900">{label}</div>
    </Link>
  );
}

function AlertCard({ to, icon: Icon, title, desc, tone }: any) {
  const tones: Record<string, string> = {
    rose: 'from-rose-500 to-red-700|bg-rose-50 border-rose-200',
    amber: 'from-amber-500 to-orange-700|bg-amber-50 border-amber-200',
    blue: 'from-blue-500 to-cyan-700|bg-blue-50 border-blue-200',
  };
  const [grad, box] = tones[tone].split('|');
  return (
    <Link to={to} className={`rounded-2xl bg-white border-2 ${box} p-4 flex items-center gap-3 hover:shadow-md transition group`}>
      <div className={`h-11 w-11 rounded-xl bg-gradient-to-br ${grad} text-white flex items-center justify-center shadow-md shrink-0`}>
        <Icon className="h-5 w-5" />
      </div>
      <div className="flex-1 min-w-0">
        <div className="font-extrabold text-slate-900 text-sm">{title}</div>
        <div className="text-xs text-slate-600 font-bold truncate">{desc}</div>
      </div>
      <ArrowRight className="h-4 w-4 text-slate-400 shrink-0 group-hover:translate-x-1 transition" />
    </Link>
  );
}

function FinCard({ label, value, sub, tone }: any) {
  const tones: Record<string, string> = {
    emerald: 'from-emerald-500 to-teal-700 border-emerald-300',
    amber: 'from-amber-500 to-orange-600 border-amber-300',
    blue: 'from-blue-500 to-cyan-700 border-blue-300',
  };
  const parts = tones[tone].split(' ');
  return (
    <div className={`rounded-3xl bg-gradient-to-br from-white to-slate-50 border-2 ${parts[2]} p-4 shadow-sm`}>
      <div className={`inline-flex items-center gap-1.5 rounded-full px-2 py-0.5 text-[10px] font-extrabold uppercase tracking-wider text-white bg-gradient-to-r ${parts[0]} ${parts[1]}`}>
        <DollarSign className="h-3 w-3" /> {label}
      </div>
      <div className="mt-3">
        <div className="text-2xl font-extrabold text-slate-900 tabular-nums">{value}</div>
        <div className="text-[10px] text-slate-500 font-bold mt-1">{sub}</div>
      </div>
    </div>
  );
}
