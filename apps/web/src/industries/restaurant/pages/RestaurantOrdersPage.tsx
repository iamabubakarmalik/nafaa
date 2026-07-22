import { useState } from 'react';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { Link } from 'react-router-dom';
import {
  ShoppingBag, Plus, Search, X, Filter, Clock, DollarSign,
  Utensils, Bike, Package, Car, Home, Coffee, RefreshCw,
  ChefHat, CheckCircle2, Award, Timer, User, Phone, MapPin,
  Sparkles, ArrowRight, Eye, AlertCircle, Ban, PlayCircle,
} from 'lucide-react';
import { ordersApi, type RestaurantOrder, type OrderStatus, type OrderMode } from '../api/orders.api';
import { formatPKR } from '@core/lib/format';
import { Button } from '@core/ui/Button';
import { toast } from 'sonner';

const MODE_CONFIG: Record<OrderMode, { label: string; icon: any; color: string; bg: string }> = {
  DINE_IN: { label: 'Dine-in', icon: Utensils, color: 'text-emerald-700', bg: 'bg-emerald-100 dark:bg-emerald-950/40' },
  TAKEAWAY: { label: 'Takeaway', icon: ShoppingBag, color: 'text-blue-700', bg: 'bg-blue-100 dark:bg-blue-950/40' },
  DELIVERY: { label: 'Delivery', icon: Bike, color: 'text-violet-700', bg: 'bg-violet-100 dark:bg-violet-950/40' },
  DRIVE_THRU: { label: 'Drive-thru', icon: Car, color: 'text-amber-700', bg: 'bg-amber-100 dark:bg-amber-950/40' },
  ROOM_SERVICE: { label: 'Room Service', icon: Home, color: 'text-pink-700', bg: 'bg-pink-100 dark:bg-pink-950/40' },
  PICKUP: { label: 'Pickup', icon: Package, color: 'text-cyan-700', bg: 'bg-cyan-100 dark:bg-cyan-950/40' },
};

const STATUS_CONFIG: Record<OrderStatus, { label: string; color: string; icon: any }> = {
  DRAFT: { label: 'Draft', color: 'bg-slate-500', icon: AlertCircle },
  PLACED: { label: 'Placed', color: 'bg-blue-500', icon: CheckCircle2 },
  CONFIRMED: { label: 'Confirmed', color: 'bg-cyan-500', icon: CheckCircle2 },
  COOKING: { label: 'Cooking', color: 'bg-amber-500', icon: ChefHat },
  READY: { label: 'Ready', color: 'bg-emerald-500', icon: Award },
  SERVED: { label: 'Served', color: 'bg-teal-600', icon: Utensils },
  OUT_FOR_DELIVERY: { label: 'On the way', color: 'bg-violet-500', icon: Bike },
  DELIVERED: { label: 'Delivered', color: 'bg-green-600', icon: CheckCircle2 },
  COMPLETED: { label: 'Completed', color: 'bg-emerald-700', icon: CheckCircle2 },
  CANCELLED: { label: 'Cancelled', color: 'bg-rose-500', icon: Ban },
  ON_HOLD: { label: 'On Hold', color: 'bg-orange-500', icon: PlayCircle },
};

export default function RestaurantOrdersPage() {
  const queryClient = useQueryClient();
  const [search, setSearch] = useState('');
  const [statusFilter, setStatusFilter] = useState<string>('all');
  const [modeFilter, setModeFilter] = useState<string>('all');

  const { data: orders = [], isLoading, refetch, isRefetching } = useQuery({
    queryKey: ['restaurant-orders', statusFilter, modeFilter, search],
    queryFn: () => ordersApi.list({
      status: statusFilter === 'all' ? undefined : statusFilter,
      mode: modeFilter === 'all' ? undefined : modeFilter,
      search: search.trim() || undefined,
    }),
    refetchInterval: 30_000,
  });

  const updateStatusMutation = useMutation({
    mutationFn: ({ id, status }: { id: string; status: OrderStatus }) =>
      ordersApi.updateStatus(id, status),
    onSuccess: (order) => {
      toast.success('Order updated: ' + STATUS_CONFIG[order.status].label);
      queryClient.invalidateQueries({ queryKey: ['restaurant-orders'] });
      queryClient.invalidateQueries({ queryKey: ['restaurant-dashboard-overview'] });
    },
    onError: (e: any) => toast.error(e?.response?.data?.message || 'Update failed'),
  });

  const activeOrders = orders.filter((o) =>
    ['PLACED', 'CONFIRMED', 'COOKING', 'READY', 'SERVED', 'OUT_FOR_DELIVERY'].includes(o.status),
  );
  const completedToday = orders.filter((o) => {
    if (o.status !== 'COMPLETED' && o.status !== 'DELIVERED') return false;
    const today = new Date().toDateString();
    return new Date(o.createdAt).toDateString() === today;
  });
  const totalRevenue = completedToday.reduce((sum, o) => sum + o.total, 0);

  return (
    <div className="space-y-6">
      {/* HERO */}
      <section className="relative overflow-hidden rounded-3xl bg-gradient-to-br from-slate-950 via-orange-900 to-red-700 text-white p-6 sm:p-8 shadow-2xl">
        <div className="absolute -top-20 -right-20 h-72 w-72 rounded-full bg-orange-400/20 blur-3xl" />
        <div className="absolute -bottom-20 -left-20 h-72 w-72 rounded-full bg-rose-400/15 blur-3xl" />

        <div className="relative flex flex-col lg:flex-row lg:items-center lg:justify-between gap-5">
          <div>
            <div className="inline-flex items-center gap-2 rounded-full bg-white/15 backdrop-blur px-3 py-1 text-xs font-extrabold border border-white/20">
              <Sparkles className="h-3.5 w-3.5 text-amber-300" />
              Live Orders
            </div>
            <h1 className="mt-3 text-3xl sm:text-4xl font-extrabold leading-tight">
              🍽️ Restaurant Orders
            </h1>
            <p className="mt-2 text-sm text-white/80 font-semibold">
              Dine-in, Takeaway, Delivery — sab ek jagah manage karo
            </p>
          </div>
          <div className="flex items-center gap-2 flex-wrap">
            <button
              onClick={() => refetch()}
              disabled={isRefetching}
              className="inline-flex items-center gap-2 rounded-xl bg-white/15 hover:bg-white/25 px-4 py-2.5 text-sm font-bold backdrop-blur border border-white/20"
            >
              <RefreshCw className={'h-4 w-4 ' + (isRefetching ? 'animate-spin' : '')} />
              Refresh
            </button>
            <Link to="/restaurant/orders/new">
              <Button className="bg-white text-slate-900 hover:bg-slate-100">
                <Plus className="h-4 w-4" />
                New Order
              </Button>
            </Link>
          </div>
        </div>
      </section>

      {/* STATS */}
      <section className="grid sm:grid-cols-2 lg:grid-cols-4 gap-4">
        <StatCard label="Active Orders" value={activeOrders.length} sub="In progress" icon={ChefHat} color="orange" />
        <StatCard label="Completed Today" value={completedToday.length} sub="Done" icon={CheckCircle2} color="emerald" />
        <StatCard label="Revenue Today" value={formatPKR(totalRevenue)} sub="From completed" icon={DollarSign} color="blue" />
        <StatCard label="Total Shown" value={orders.length} sub="Last 200 orders" icon={ShoppingBag} color="violet" />
      </section>

      {/* FILTERS */}
      <section className="rounded-3xl bg-white dark:bg-neutral-900 border border-slate-200 dark:border-neutral-800 shadow-sm p-4 space-y-3">
        <div className="flex gap-2 flex-wrap">
          <div className="relative flex-1 min-w-[240px]">
            <Search className="h-4 w-4 text-slate-400 absolute left-3.5 top-1/2 -translate-y-1/2" />
            <input
              className="h-11 w-full rounded-xl border-2 border-slate-200 dark:border-neutral-700 bg-white dark:bg-neutral-800 pl-10 pr-10 text-sm font-semibold focus:outline-none focus:border-orange-500"
              placeholder="Search order #, customer, phone..."
              value={search}
              onChange={(e) => setSearch(e.target.value)}
            />
            {search && (
              <button onClick={() => setSearch('')} className="absolute right-3 top-1/2 -translate-y-1/2 text-slate-400">
                <X className="h-4 w-4" />
              </button>
            )}
          </div>

          <select
            value={modeFilter}
            onChange={(e) => setModeFilter(e.target.value)}
            className="h-11 px-3 rounded-xl border-2 border-slate-200 dark:border-neutral-700 bg-white dark:bg-neutral-800 text-sm font-bold focus:outline-none focus:border-orange-500"
          >
            <option value="all">All Modes</option>
            {Object.entries(MODE_CONFIG).map(([k, v]) => (
              <option key={k} value={k}>{v.label}</option>
            ))}
          </select>
        </div>

        {/* Status quick-filter chips */}
        <div className="flex gap-1.5 overflow-x-auto pb-1">
          {['all', 'PLACED', 'CONFIRMED', 'COOKING', 'READY', 'SERVED', 'OUT_FOR_DELIVERY', 'COMPLETED', 'CANCELLED'].map((s) => (
            <button
              key={s}
              onClick={() => setStatusFilter(s)}
              className={
                'shrink-0 px-3 py-1.5 rounded-lg text-xs font-extrabold transition ' +
                (statusFilter === s
                  ? 'bg-orange-600 text-white shadow'
                  : 'bg-slate-100 dark:bg-neutral-800 text-slate-700 dark:text-slate-300 hover:bg-slate-200')
              }
            >
              {s === 'all' ? 'All' : STATUS_CONFIG[s as OrderStatus]?.label || s}
            </button>
          ))}
        </div>
      </section>

      {/* ORDERS LIST */}
      {isLoading ? (
        <div className="space-y-2">
          {[1, 2, 3, 4].map((i) => <div key={i} className="h-32 rounded-2xl bg-slate-100 dark:bg-neutral-800 animate-pulse" />)}
        </div>
      ) : orders.length === 0 ? (
        <div className="rounded-3xl bg-white dark:bg-neutral-900 border-2 border-dashed border-slate-200 dark:border-neutral-800 p-12 text-center">
          <div className="h-20 w-20 rounded-3xl bg-slate-100 dark:bg-neutral-800 mx-auto flex items-center justify-center">
            <ShoppingBag className="h-10 w-10 text-slate-400" />
          </div>
          <h3 className="mt-4 text-lg font-extrabold text-slate-900 dark:text-white">No orders</h3>
          <p className="mt-1 text-sm text-slate-500 font-semibold">
            {search || statusFilter !== 'all' || modeFilter !== 'all' ? 'No orders match filters' : 'Naya order banao'}
          </p>
        </div>
      ) : (
        <section className="grid gap-3">
          {orders.map((order) => (
            <OrderCard
              key={order.id}
              order={order}
              onStatusChange={(status) => updateStatusMutation.mutate({ id: order.id, status })}
              isUpdating={updateStatusMutation.isPending}
            />
          ))}
        </section>
      )}
    </div>
  );
}

function StatCard({ label, value, sub, icon: Icon, color }: any) {
  const colors: Record<string, string> = {
    orange: 'from-orange-500 to-red-600',
    emerald: 'from-emerald-500 to-green-600',
    blue: 'from-blue-500 to-blue-700',
    violet: 'from-violet-500 to-purple-600',
  };
  return (
    <div className="rounded-2xl bg-white dark:bg-neutral-900 border-2 border-slate-200 dark:border-neutral-800 p-5 shadow-sm">
      <div className="flex items-center justify-between">
        <div>
          <div className="text-xs uppercase tracking-wider text-slate-500 font-bold">{label}</div>
          <div className="mt-2 text-2xl font-extrabold text-slate-900 dark:text-white tabular-nums">{value}</div>
          <div className="text-xs text-slate-600 font-semibold mt-1">{sub}</div>
        </div>
        <div className={'h-12 w-12 rounded-2xl bg-gradient-to-br ' + colors[color] + ' text-white flex items-center justify-center shadow-lg'}>
          <Icon className="h-6 w-6" />
        </div>
      </div>
    </div>
  );
}

function OrderCard({ order, onStatusChange, isUpdating }: {
  order: RestaurantOrder;
  onStatusChange: (status: OrderStatus) => void;
  isUpdating: boolean;
}) {
  const modeCfg = MODE_CONFIG[order.mode];
  const statusCfg = STATUS_CONFIG[order.status];
  const ModeIcon = modeCfg.icon;
  const StatusIcon = statusCfg.icon;

  // Next status suggestion
  const nextStatus: Record<OrderStatus, OrderStatus | null> = {
    DRAFT: 'PLACED',
    PLACED: 'CONFIRMED',
    CONFIRMED: 'COOKING',
    COOKING: 'READY',
    READY: order.mode === 'DELIVERY' ? 'OUT_FOR_DELIVERY' : 'SERVED',
    SERVED: 'COMPLETED',
    OUT_FOR_DELIVERY: 'DELIVERED',
    DELIVERED: 'COMPLETED',
    COMPLETED: null,
    CANCELLED: null,
    ON_HOLD: 'PLACED',
  };
  const next = nextStatus[order.status];

  const elapsed = order.placedAt
    ? Math.floor((Date.now() - new Date(order.placedAt).getTime()) / 60000)
    : 0;

  return (
    <div className="rounded-2xl bg-white dark:bg-neutral-900 border-2 border-slate-200 dark:border-neutral-800 shadow-sm hover:shadow-lg transition p-4">
      <div className="flex items-start justify-between gap-3 flex-wrap">
        {/* LEFT */}
        <div className="flex items-start gap-3 min-w-0 flex-1">
          <div className={'h-12 w-12 rounded-2xl flex items-center justify-center shrink-0 shadow ' + modeCfg.bg + ' ' + modeCfg.color}>
            <ModeIcon className="h-6 w-6" />
          </div>

          <div className="min-w-0 flex-1">
            <div className="flex items-center gap-2 flex-wrap">
              <span className="font-extrabold text-slate-900 dark:text-white text-lg">{order.orderNumber}</span>
              <span className={'px-2 py-0.5 rounded-full text-[10px] font-extrabold uppercase inline-flex items-center gap-1 text-white ' + statusCfg.color}>
                <StatusIcon className={'h-2.5 w-2.5 ' + (order.status === 'COOKING' ? 'animate-pulse' : '')} />
                {statusCfg.label}
              </span>
              <span className={'px-2 py-0.5 rounded-md text-[10px] font-extrabold uppercase ' + modeCfg.bg + ' ' + modeCfg.color}>
                {modeCfg.label}
              </span>
              {order.status !== 'COMPLETED' && order.status !== 'CANCELLED' && elapsed > 0 && (
                <span className={
                  'inline-flex items-center gap-1 px-2 py-0.5 rounded-md text-[10px] font-extrabold ' +
                  (elapsed > 30 ? 'bg-rose-100 text-rose-700' : elapsed > 15 ? 'bg-amber-100 text-amber-700' : 'bg-slate-100 text-slate-600')
                }>
                  <Clock className="h-2.5 w-2.5" />
                  {elapsed}m
                </span>
              )}
            </div>

            <div className="flex items-center gap-3 mt-1 text-xs text-slate-500 font-semibold flex-wrap">
              {order.table && (
                <span className="inline-flex items-center gap-1">
                  <Utensils className="h-3 w-3" />
                  Table {order.table.tableNumber}
                </span>
              )}
              {order.customerName && (
                <span className="inline-flex items-center gap-1">
                  <User className="h-3 w-3" />
                  {order.customerName}
                </span>
              )}
              {order.customerPhone && (
                <span className="inline-flex items-center gap-1">
                  <Phone className="h-3 w-3" />
                  {order.customerPhone}
                </span>
              )}
              {order.numberOfGuests && (
                <span>{order.numberOfGuests} guests</span>
              )}
              <span>{order.items?.length || 0} items</span>
            </div>

            {/* Items preview */}
            <div className="mt-2 flex flex-wrap gap-1">
              {order.items?.slice(0, 4).map((item, i) => (
                <span key={i} className="px-2 py-0.5 rounded bg-slate-100 dark:bg-neutral-800 text-[10px] font-bold text-slate-700 dark:text-slate-300">
                  {item.product?.name || 'Item'} × {item.quantity}
                </span>
              ))}
              {(order.items?.length || 0) > 4 && (
                <span className="px-2 py-0.5 rounded bg-slate-100 dark:bg-neutral-800 text-[10px] font-bold text-slate-500">
                  +{(order.items?.length || 0) - 4} more
                </span>
              )}
            </div>
          </div>
        </div>

        {/* RIGHT */}
        <div className="text-right shrink-0">
          <div className="text-2xl font-extrabold text-emerald-700 dark:text-emerald-400 tabular-nums leading-none">
            {formatPKR(order.total)}
          </div>
          {order.paidAmount > 0 && order.paidAmount < order.total && (
            <div className="text-[10px] font-extrabold text-amber-700 mt-1">
              Paid: {formatPKR(order.paidAmount)}
            </div>
          )}
          {order.paidAmount >= order.total && (
            <div className="text-[10px] font-extrabold text-emerald-600 mt-1 inline-flex items-center gap-0.5">
              <CheckCircle2 className="h-2.5 w-2.5" />
              Paid
            </div>
          )}

          <div className="mt-3 flex gap-1 justify-end">
            {next && order.status !== 'CANCELLED' && (
              <button
                onClick={() => onStatusChange(next)}
                disabled={isUpdating}
                className="inline-flex items-center gap-1 px-3 py-1.5 rounded-lg bg-emerald-600 hover:bg-emerald-700 text-white text-xs font-extrabold shadow-sm"
                title={'Mark as ' + STATUS_CONFIG[next].label}
              >
                <ArrowRight className="h-3 w-3" />
                {STATUS_CONFIG[next].label}
              </button>
            )}

            <Link
              to={'/restaurant/orders/' + order.id}
              className="inline-flex items-center gap-1 px-3 py-1.5 rounded-lg bg-slate-100 dark:bg-neutral-800 hover:bg-slate-200 text-slate-700 dark:text-slate-300 text-xs font-extrabold"
            >
              <Eye className="h-3 w-3" />
              View
            </Link>
          </div>
        </div>
      </div>
    </div>
  );
}
