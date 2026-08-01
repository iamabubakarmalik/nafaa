import { useQuery } from '@tanstack/react-query';
import { Link } from 'react-router-dom';
import {
  Flower2, TrendingUp, DollarSign, Package, Truck, Heart,
  Repeat, RefreshCw, ArrowRight, AlertTriangle, Plus,
  ShoppingCart, Clock, Leaf, Sparkles, Calendar, Star,
  BarChart3, MapPin, Phone,
} from 'lucide-react';
import {
  ResponsiveContainer, BarChart, Bar, XAxis, YAxis, Tooltip,
  CartesianGrid, PieChart, Pie, Cell, Legend,
} from 'recharts';
import { floristDashboardApi } from '../api/dashboard.api';
import { floristOrdersApi } from '../api/orders.api';
import { formatPKR } from '@core/lib/format';
import { Button } from '@core/ui/Button';
import { PrivacyToggle, useCostHidden } from '@core/ui/HiddenValue';

const SLOT_META: Record<string, { label: string; color: string; emoji: string }> = {
  MORNING: { label: 'Morning', color: 'bg-amber-100 text-amber-700', emoji: '🌅' },
  AFTERNOON: { label: 'Afternoon', color: 'bg-blue-100 text-blue-700', emoji: '☀️' },
  EVENING: { label: 'Evening', color: 'bg-violet-100 text-violet-700', emoji: '🌆' },
  EXPRESS: { label: 'Express', color: 'bg-rose-100 text-rose-700', emoji: '⚡' },
  SCHEDULED: { label: 'Scheduled', color: 'bg-slate-100 text-slate-700', emoji: '📅' },
};

export default function FloristDashboardPage() {
  const hideCost = useCostHidden();

  const { data: overview, isLoading, refetch, isRefetching } = useQuery({
    queryKey: ['florist-dashboard-overview'],
    queryFn: () => floristDashboardApi.overview(),
    refetchInterval: 60_000,
  });

  const { data: orderSummary } = useQuery({
    queryKey: ['florist-orders-summary'],
    queryFn: () => floristOrdersApi.summary(),
    refetchInterval: 5 * 60_000,
  });

  const totals = overview?.totals ?? {
    totalProducts: 0, activeOrders: 0, deliveredToday: 0,
    activeSubscriptions: 0, upcomingWeddings: 0, witheringSoon: 0,
  };
  const monthly = overview?.monthly ?? {
    orders: { count: 0, revenue: 0, collected: 0 },
    weddings: { count: 0, revenue: 0, collected: 0 },
    subscriptions: { count: 0 },
    totalRevenue: 0,
  };
  const todayDeliveries = overview?.todayScheduledDeliveries ?? [];
  const upcomingWeddings = overview?.upcomingWeddingList ?? [];
  const dueSubscriptions = overview?.dueSubscriptions ?? [];
  const witheringProducts = overview?.witheringProducts ?? [];
  const topProducts = overview?.topProducts ?? [];
  const byCategory = overview?.byCategory ?? [];

  const revenueSplit = [
    { name: 'Orders', value: monthly.orders.revenue },
    { name: 'Weddings', value: monthly.weddings.revenue },
  ].filter((x) => x.value > 0);

  const categoryBars = (byCategory as any[])
    .map((c) => ({ label: (c.categoryType || 'OTHER').replace(/_/g, ' '), count: c._count?._all ?? 0 }))
    .sort((a, b) => b.count - a.count)
    .slice(0, 8);

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
      <section className="relative overflow-hidden rounded-3xl bg-gradient-to-br from-slate-950 via-pink-900 to-rose-700 text-white p-6 sm:p-8 shadow-2xl">
        <div className="absolute -top-20 -right-20 h-72 w-72 rounded-full bg-pink-400/20 blur-3xl" />
        <div className="absolute -bottom-20 -left-20 h-72 w-72 rounded-full bg-rose-400/15 blur-3xl" />

        <div className="relative flex flex-col lg:flex-row lg:items-start lg:justify-between gap-5">
          <div>
            <div className="inline-flex items-center gap-2 rounded-full bg-white/15 backdrop-blur px-3 py-1 text-xs font-extrabold border border-white/20">
              <Flower2 className="h-3.5 w-3.5 text-amber-300" /> Florist / Flower Shop
            </div>
            <h1 className="mt-3 text-3xl sm:text-4xl font-extrabold leading-tight">🌸 Florist Dashboard</h1>
            <p className="mt-2 text-sm text-white/80 font-semibold">
              Deliveries, weddings, subscriptions and freshness — all in one place
            </p>
          </div>
          <div className="flex items-center gap-2 flex-wrap">
            <button onClick={() => refetch()} disabled={isRefetching}
              className="inline-flex items-center gap-2 rounded-xl bg-white/15 hover:bg-white/25 px-4 py-2.5 text-sm font-bold backdrop-blur border border-white/20">
              <RefreshCw className={`h-4 w-4 ${isRefetching ? 'animate-spin' : ''}`} /> Refresh
            </button>
            <PrivacyToggle />
            <Link to="/pos">
              <Button className="bg-white text-slate-900 hover:bg-slate-100">
                <ShoppingCart className="h-4 w-4" /> Open POS
              </Button>
            </Link>
          </div>
        </div>

        <div className="relative mt-6 grid grid-cols-2 sm:grid-cols-4 gap-2 sm:gap-3">
          <HeroTile icon={Truck} label="Today Deliveries" value={String(todayDeliveries.length)} sub={`${totals.deliveredToday} delivered`} tone="amber" />
          <HeroTile icon={Package} label="Active Orders" value={String(totals.activeOrders)} sub="in pipeline" tone="blue" />
          <HeroTile icon={Heart} label="Upcoming Weddings" value={String(totals.upcomingWeddings)} sub="next 30 days" tone="rose" />
          <HeroTile icon={Leaf} label="Withering Soon" value={String(totals.witheringSoon)} sub="within 3 days" tone={totals.witheringSoon > 0 ? 'rose' : 'emerald'} />
        </div>
      </section>

      {/* QUICK ACTIONS */}
      <section className="grid grid-cols-3 sm:grid-cols-6 gap-2 sm:gap-3">
        <QuickAction to="/pos" icon={ShoppingCart} label="POS" tone="pink" />
        <QuickAction to="/florist/orders" icon={Package} label="Orders" tone="blue" />
        <QuickAction to="/florist/deliveries" icon={Truck} label="Deliveries" tone="amber" />
        <QuickAction to="/florist/weddings" icon={Heart} label="Weddings" tone="rose" />
        <QuickAction to="/florist/subscriptions" icon={Repeat} label="Subscriptions" tone="violet" />
        <QuickAction to="/florist-products/new" icon={Plus} label="Add Product" tone="emerald" />
      </section>

      {/* ALERTS */}
      {(totals.witheringSoon > 0 || dueSubscriptions.length > 0) && (
        <section className="rounded-3xl bg-gradient-to-br from-amber-50 via-orange-50 to-red-50 border-2 border-amber-300 p-4 sm:p-5">
          <div className="flex items-center gap-2 mb-3">
            <div className="h-10 w-10 rounded-2xl bg-amber-500 text-white flex items-center justify-center shadow-lg">
              <AlertTriangle className="h-5 w-5" />
            </div>
            <div>
              <h3 className="font-extrabold text-amber-900">Needs attention</h3>
              <p className="text-xs text-amber-800 font-bold">Act on these today</p>
            </div>
          </div>
          <div className="grid sm:grid-cols-2 gap-3">
            {totals.witheringSoon > 0 && (
              <AlertCard to="/florist/freshness" icon={Leaf}
                title={`${totals.witheringSoon} products withering soon`} desc="Discount or clear stock" tone="rose" />
            )}
            {dueSubscriptions.length > 0 && (
              <AlertCard to="/florist/subscriptions" icon={Repeat}
                title={`${dueSubscriptions.length} subscriptions due`} desc="Prepare recurring bouquets" tone="amber" />
            )}
          </div>
        </section>
      )}

      {/* TODAY DELIVERIES */}
      <section className="rounded-3xl bg-white border-2 border-slate-200 shadow-sm overflow-hidden">
        <div className="px-5 py-4 border-b-2 border-slate-100 bg-gradient-to-r from-amber-50 to-orange-50 flex items-center justify-between gap-2 flex-wrap">
          <div className="flex items-center gap-3">
            <div className="h-10 w-10 rounded-xl bg-gradient-to-br from-amber-500 to-orange-700 text-white flex items-center justify-center shadow-md">
              <Truck className="h-5 w-5" />
            </div>
            <div>
              <h3 className="font-extrabold text-slate-900 inline-flex items-center gap-2">
                Today's Deliveries
                {todayDeliveries.length > 0 && (
                  <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded-full bg-amber-500 text-white text-[9px] font-extrabold uppercase">
                    <span className="h-1.5 w-1.5 rounded-full bg-white animate-pulse" /> {todayDeliveries.length} pending
                  </span>
                )}
              </h3>
              <p className="text-xs text-slate-500 font-bold">Sorted by time slot</p>
            </div>
          </div>
          <Link to="/florist/deliveries" className="text-xs font-extrabold text-amber-700 hover:underline inline-flex items-center gap-1">
            Full schedule <ArrowRight className="h-3 w-3" />
          </Link>
        </div>

        {todayDeliveries.length === 0 ? (
          <div className="p-10 text-center">
            <Truck className="h-12 w-12 text-slate-300 mx-auto mb-2" />
            <div className="font-extrabold text-slate-700">No deliveries scheduled for today</div>
            <p className="text-xs text-slate-500 font-semibold mt-1">Create an order with delivery from the POS</p>
          </div>
        ) : (
          <div className="p-4 grid sm:grid-cols-2 lg:grid-cols-3 gap-3">
            {todayDeliveries.slice(0, 9).map((o: any) => {
              const slot = SLOT_META[o.deliveryTimeSlot || 'SCHEDULED'];
              return (
                <Link key={o.id} to="/florist/orders"
                  className="rounded-2xl border-2 border-slate-200 hover:border-amber-400 hover:shadow-md p-3 transition">
                  <div className="flex items-center justify-between gap-2">
                    <span className="font-mono font-extrabold text-slate-900 text-xs">{o.orderNumber}</span>
                    <span className={`px-2 py-0.5 rounded-full text-[9px] font-extrabold uppercase ${slot.color}`}>
                      {slot.emoji} {slot.label}
                    </span>
                  </div>
                  <div className="mt-1.5 font-extrabold text-sm text-slate-900 truncate">
                    {o.recipientName || o.customerName}
                  </div>
                  <div className="text-[11px] font-bold text-slate-500 truncate flex items-center gap-1 mt-0.5">
                    <Phone className="h-2.5 w-2.5" /> {o.recipientPhone || o.customerPhone}
                  </div>
                  {o.deliveryAddress && (
                    <div className="text-[11px] font-semibold text-slate-500 truncate flex items-center gap-1 mt-0.5">
                      <MapPin className="h-2.5 w-2.5 shrink-0" /> {o.area || o.deliveryAddress}
                    </div>
                  )}
                  <div className="mt-2 flex items-end justify-between">
                    <span className="text-[10px] uppercase font-extrabold text-slate-500">{o.status.replace(/_/g, ' ')}</span>
                    <span className="text-base font-extrabold text-emerald-700 tabular-nums">{formatPKR(o.totalAmount)}</span>
                  </div>
                </Link>
              );
            })}
          </div>
        )}
      </section>

      {/* CHARTS */}
      <section className="grid lg:grid-cols-[1fr_1fr] gap-4 sm:gap-6">
        <div className="rounded-3xl bg-white border-2 border-slate-200 shadow-sm p-5 sm:p-6">
          <div className="flex items-center justify-between mb-4">
            <div>
              <h3 className="text-lg font-extrabold text-slate-900">Products by Category</h3>
              <p className="text-xs text-slate-500 font-bold">Catalogue distribution</p>
            </div>
            <div className="h-10 w-10 rounded-xl bg-gradient-to-br from-pink-500 to-rose-700 text-white flex items-center justify-center shadow-md">
              <BarChart3 className="h-5 w-5" />
            </div>
          </div>
          {categoryBars.length > 0 ? (
            <div className="h-[260px]">
              <ResponsiveContainer width="100%" height="100%">
                <BarChart data={categoryBars} layout="vertical" margin={{ left: 20 }}>
                  <CartesianGrid strokeDasharray="3 3" stroke="#e2e8f0" />
                  <XAxis type="number" stroke="#64748b" fontSize={11} />
                  <YAxis type="category" dataKey="label" stroke="#64748b" fontSize={10} width={100} />
                  <Tooltip contentStyle={{ borderRadius: 12, border: '2px solid #e2e8f0' }} />
                  <Bar dataKey="count" name="Products" radius={[0, 8, 8, 0]} fill="#ec4899" />
                </BarChart>
              </ResponsiveContainer>
            </div>
          ) : (
            <div className="h-[260px] flex flex-col items-center justify-center gap-2">
              <BarChart3 className="h-10 w-10 text-slate-300" />
              <p className="text-sm font-extrabold text-slate-500">No products yet</p>
            </div>
          )}
        </div>

        <div className="rounded-3xl bg-white border-2 border-slate-200 shadow-sm p-5 sm:p-6">
          <div className="flex items-center justify-between mb-4">
            <div>
              <h3 className="text-lg font-extrabold text-slate-900">This Month Revenue</h3>
              <p className="text-xs text-slate-500 font-bold">Total {formatPKR(monthly.totalRevenue)}</p>
            </div>
            <div className="h-10 w-10 rounded-xl bg-gradient-to-br from-emerald-500 to-teal-700 text-white flex items-center justify-center shadow-md">
              <TrendingUp className="h-5 w-5" />
            </div>
          </div>
          {revenueSplit.length > 0 ? (
            <div className="h-[260px]">
              <ResponsiveContainer width="100%" height="100%">
                <PieChart>
                  <Pie data={revenueSplit} cx="50%" cy="45%" outerRadius={88} innerRadius={50}
                    dataKey="value" nameKey="name"
                    label={(e: any) => {
                      const t = revenueSplit.reduce((s, x) => s + x.value, 0);
                      return t > 0 ? `${((e.value / t) * 100).toFixed(0)}%` : '';
                    }}
                    labelLine={false}>
                    {revenueSplit.map((_, i) => (
                      <Cell key={i} fill={['#ec4899', '#f43f5e'][i % 2]} />
                    ))}
                  </Pie>
                  <Tooltip formatter={(v: any) => formatPKR(Number(v))} contentStyle={{ borderRadius: 12 }} />
                  <Legend wrapperStyle={{ fontSize: 11, paddingTop: 8 }} iconType="circle" />
                </PieChart>
              </ResponsiveContainer>
            </div>
          ) : (
            <div className="h-[260px] flex flex-col items-center justify-center gap-2">
              <TrendingUp className="h-10 w-10 text-slate-300" />
              <p className="text-sm font-extrabold text-slate-500">No revenue this month yet</p>
            </div>
          )}
        </div>
      </section>

      {/* STREAM CARDS */}
      <section className="grid grid-cols-1 sm:grid-cols-3 gap-3">
        <StreamCard label="Orders" icon={Package} tone="pink"
          count={monthly.orders.count} revenue={monthly.orders.revenue}
          extra={hideCost ? 'collected hidden' : `collected ${formatPKR(monthly.orders.collected)}`} />
        <StreamCard label="Weddings" icon={Heart} tone="rose"
          count={monthly.weddings.count} revenue={monthly.weddings.revenue}
          extra={hideCost ? 'advance hidden' : `advance ${formatPKR(monthly.weddings.collected)}`} />
        <StreamCard label="Subscriptions" icon={Repeat} tone="violet"
          count={monthly.subscriptions.count} revenue={0}
          extra={`${totals.activeSubscriptions} active plans`} />
      </section>

      {/* THREE PANELS */}
      <section className="grid lg:grid-cols-3 gap-4 sm:gap-6">
        {/* WITHERING */}
        <div className="rounded-3xl bg-white border-2 border-slate-200 shadow-sm overflow-hidden">
          <div className="px-5 py-4 border-b-2 border-slate-100 bg-gradient-to-r from-rose-50 to-red-50 flex items-center justify-between gap-2">
            <div className="flex items-center gap-3">
              <div className="h-10 w-10 rounded-xl bg-gradient-to-br from-rose-500 to-red-700 text-white flex items-center justify-center shadow-md">
                <Leaf className="h-5 w-5" />
              </div>
              <div>
                <h3 className="font-extrabold text-slate-900">🥀 Withering Soon</h3>
                <p className="text-xs text-slate-500 font-bold">Next 3 days</p>
              </div>
            </div>
          </div>
          <div className="divide-y divide-slate-100 max-h-[320px] overflow-y-auto">
            {witheringProducts.length === 0 ? (
              <div className="p-10 text-center text-sm text-slate-500 font-semibold">
                <Leaf className="h-10 w-10 text-emerald-300 mx-auto mb-2" />
                All stock is fresh
              </div>
            ) : witheringProducts.map((p: any) => {
              const days = p.freshUntil ? Math.ceil((new Date(p.freshUntil).getTime() - Date.now()) / 86400000) : null;
              return (
                <Link key={p.id} to={`/florist-products/${p.productId}`}
                  className="px-5 py-3 flex items-center gap-3 hover:bg-rose-50/40 transition">
                  <div className="h-9 w-9 rounded-lg bg-rose-100 text-rose-700 flex items-center justify-center shrink-0">
                    <Leaf className="h-4 w-4" />
                  </div>
                  <div className="flex-1 min-w-0">
                    <div className="font-extrabold text-sm truncate text-slate-900">
                      {p.flowerType || p.categoryType?.replace(/_/g, ' ') || 'Product'}
                    </div>
                    <div className="text-[10px] text-slate-500 font-bold">
                      {p.color ? `${p.color} • ` : ''}{p.freshnessGrade?.replace(/_/g, ' ')}
                    </div>
                  </div>
                  <div className="text-right shrink-0">
                    <div className={`text-xs font-extrabold ${days !== null && days <= 0 ? 'text-rose-700' : 'text-amber-700'}`}>
                      {days === null ? '—' : days <= 0 ? 'Withered' : `${days}d left`}
                    </div>
                  </div>
                </Link>
              );
            })}
          </div>
        </div>

        {/* UPCOMING WEDDINGS */}
        <div className="rounded-3xl bg-white border-2 border-slate-200 shadow-sm overflow-hidden">
          <div className="px-5 py-4 border-b-2 border-slate-100 bg-gradient-to-r from-pink-50 to-rose-50 flex items-center justify-between gap-2 flex-wrap">
            <div className="flex items-center gap-3">
              <div className="h-10 w-10 rounded-xl bg-gradient-to-br from-pink-500 to-rose-700 text-white flex items-center justify-center shadow-md">
                <Heart className="h-5 w-5" />
              </div>
              <div>
                <h3 className="font-extrabold text-slate-900">💒 Weddings</h3>
                <p className="text-xs text-slate-500 font-bold">Next 30 days</p>
              </div>
            </div>
            <Link to="/florist/weddings" className="text-xs font-extrabold text-pink-700 hover:underline">All</Link>
          </div>
          <div className="divide-y divide-slate-100 max-h-[320px] overflow-y-auto">
            {upcomingWeddings.length === 0 ? (
              <div className="p-10 text-center text-sm text-slate-500 font-semibold">
                <Heart className="h-10 w-10 text-slate-300 mx-auto mb-2" />
                No weddings booked
              </div>
            ) : upcomingWeddings.map((w: any) => {
              const days = Math.ceil((new Date(w.weddingDate).getTime() - Date.now()) / 86400000);
              return (
                <Link key={w.id} to="/florist/weddings"
                  className="px-5 py-3 flex items-center gap-3 hover:bg-pink-50/40 transition">
                  <div className="h-9 w-9 rounded-lg bg-pink-100 text-pink-700 flex items-center justify-center shrink-0">
                    <Heart className="h-4 w-4" />
                  </div>
                  <div className="flex-1 min-w-0">
                    <div className="font-extrabold text-sm truncate text-slate-900">
                      {w.brideName} & {w.groomName}
                    </div>
                    <div className="text-[10px] text-slate-500 font-bold">
                      {new Date(w.weddingDate).toLocaleDateString('en-PK', { day: 'numeric', month: 'short' })}
                      {days >= 0 && ` • ${days}d to go`}
                    </div>
                  </div>
                  <div className="text-right shrink-0">
                    <div className="font-extrabold text-pink-700 text-sm tabular-nums">{formatPKR(w.quotedAmount)}</div>
                    <div className="text-[9px] font-bold text-slate-500">{w.status}</div>
                  </div>
                </Link>
              );
            })}
          </div>
        </div>

        {/* TOP PRODUCTS */}
        <div className="rounded-3xl bg-white border-2 border-slate-200 shadow-sm overflow-hidden">
          <div className="px-5 py-4 border-b-2 border-slate-100 bg-gradient-to-r from-emerald-50 to-teal-50 flex items-center gap-3">
            <div className="h-10 w-10 rounded-xl bg-gradient-to-br from-emerald-500 to-teal-700 text-white flex items-center justify-center shadow-md">
              <Star className="h-5 w-5" />
            </div>
            <div>
              <h3 className="font-extrabold text-slate-900">🏆 Top Sellers</h3>
              <p className="text-xs text-slate-500 font-bold">By units sold</p>
            </div>
          </div>
          <div className="divide-y divide-slate-100 max-h-[320px] overflow-y-auto">
            {topProducts.length === 0 ? (
              <div className="p-10 text-center text-sm text-slate-500 font-semibold">No sales recorded yet</div>
            ) : topProducts.slice(0, 8).map((p: any, i: number) => (
              <Link key={p.id} to={`/florist-products/${p.productId}`}
                className="px-5 py-3 flex items-center gap-3 hover:bg-emerald-50/40 transition">
                <div className={`h-8 w-8 rounded-lg text-white flex items-center justify-center font-extrabold text-xs shrink-0 ${
                  i === 0 ? 'bg-amber-500' : i === 1 ? 'bg-slate-400' : i === 2 ? 'bg-orange-600' : 'bg-slate-300'
                }`}>{i + 1}</div>
                <div className="flex-1 min-w-0">
                  <div className="font-extrabold text-sm truncate text-slate-900">
                    {p.flowerType || p.categoryType?.replace(/_/g, ' ') || 'Product'}
                  </div>
                  <div className="text-[10px] text-slate-500 font-bold">{p.totalSold ?? 0} sold</div>
                </div>
                {p.color && (
                  <span className="h-4 w-4 rounded-full border border-slate-300 shrink-0"
                    style={{ backgroundColor: p.colorHex || '#ec4899' }} />
                )}
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
    emerald: 'from-emerald-400/30 to-emerald-600/20 border-emerald-300/40',
    blue: 'from-blue-400/30 to-blue-600/20 border-blue-300/40',
    amber: 'from-amber-400/30 to-amber-600/20 border-amber-300/40',
    rose: 'from-rose-400/40 to-rose-600/25 border-rose-300/50',
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
    pink: 'from-pink-500 to-rose-600',
    blue: 'from-blue-500 to-cyan-700',
    amber: 'from-amber-500 to-orange-700',
    rose: 'from-rose-500 to-red-700',
    violet: 'from-violet-500 to-purple-700',
    emerald: 'from-emerald-500 to-teal-700',
  };
  return (
    <Link to={to} className="group rounded-2xl bg-white border-2 border-slate-200 hover:border-pink-300 hover:shadow-lg hover:-translate-y-0.5 transition-all p-3 sm:p-4 text-center">
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

function StreamCard({ label, icon: Icon, tone, count, revenue, extra }: any) {
  const tones: Record<string, string> = {
    pink: 'from-pink-500 to-rose-600 border-pink-300',
    rose: 'from-rose-500 to-red-700 border-rose-300',
    violet: 'from-violet-500 to-purple-700 border-violet-300',
  };
  const parts = tones[tone].split(' ');
  return (
    <div className={`rounded-3xl bg-gradient-to-br from-white to-slate-50 border-2 ${parts[2]} p-4 shadow-sm`}>
      <div className={`inline-flex items-center gap-1.5 rounded-full px-2 py-0.5 text-[10px] font-extrabold uppercase tracking-wider text-white bg-gradient-to-r ${parts[0]} ${parts[1]}`}>
        <Icon className="h-3 w-3" /> {label}
      </div>
      <div className="mt-3 grid grid-cols-2 gap-2">
        <div>
          <div className="text-[9px] uppercase font-extrabold text-slate-500">This month</div>
          <div className="text-2xl font-extrabold text-slate-900 tabular-nums leading-none mt-1">{count}</div>
        </div>
        {revenue > 0 && (
          <div>
            <div className="text-[9px] uppercase font-extrabold text-slate-500">Revenue</div>
            <div className="text-base font-extrabold text-emerald-700 tabular-nums leading-none mt-1">{formatPKR(revenue)}</div>
          </div>
        )}
      </div>
      <div className="mt-2 text-[10px] font-bold text-slate-500">{extra}</div>
    </div>
  );
}
