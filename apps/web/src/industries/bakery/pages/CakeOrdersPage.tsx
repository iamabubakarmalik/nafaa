import { useState } from 'react';
import { useQuery } from '@tanstack/react-query';
import { Link } from 'react-router-dom';
import {
  Cake, Plus, Search, X, RefreshCw, Sparkles, Clock, User, Phone,
  CheckCircle2, AlertCircle, ArrowRight, Star, Timer, DollarSign,
  Zap, Calendar, Truck, Heart, Flame,
} from 'lucide-react';
import { cakeOrdersApi, type BakeryOrderStatus } from '../api/cake-orders.api';
import { CATEGORY_EMOJI, OCCASION_EMOJI, FLAVORS } from '../api/constants';
import { formatPKR } from '@core/lib/format';
import { Button } from '@core/ui/Button';
import { format, differenceInHours, isToday, isTomorrow } from 'date-fns';

const STATUS_CONFIG: Record<BakeryOrderStatus, { label: string; color: string; icon: any }> = {
  DRAFT: { label: 'Draft', color: 'bg-slate-500', icon: AlertCircle },
  QUOTED: { label: 'Quoted', color: 'bg-blue-500', icon: Clock },
  CONFIRMED: { label: 'Confirmed', color: 'bg-cyan-500', icon: CheckCircle2 },
  DEPOSIT_PAID: { label: 'Deposit Paid', color: 'bg-teal-500', icon: DollarSign },
  IN_PRODUCTION: { label: 'In Production', color: 'bg-amber-500', icon: Timer },
  BAKING: { label: 'Baking', color: 'bg-orange-500', icon: Flame },
  DECORATING: { label: 'Decorating', color: 'bg-fuchsia-500', icon: Sparkles },
  QUALITY_CHECK: { label: 'Quality Check', color: 'bg-violet-500', icon: CheckCircle2 },
  READY: { label: 'Ready', color: 'bg-emerald-500', icon: CheckCircle2 },
  OUT_FOR_DELIVERY: { label: 'Out for Delivery', color: 'bg-blue-600', icon: Truck },
  DELIVERED: { label: 'Delivered', color: 'bg-green-600', icon: CheckCircle2 },
  CANCELLED: { label: 'Cancelled', color: 'bg-rose-500', icon: X },
  REFUNDED: { label: 'Refunded', color: 'bg-slate-600', icon: X },
};

export default function CakeOrdersPage() {
  const [search, setSearch] = useState('');
  const [statusFilter, setStatusFilter] = useState<string>('active');
  const [dateFilter, setDateFilter] = useState<string>('week');

  const getDateRange = () => {
    const now = new Date();
    const start = new Date(now);
    const end = new Date(now);

    if (dateFilter === 'today') {
      start.setHours(0, 0, 0, 0);
      end.setHours(23, 59, 59, 999);
    } else if (dateFilter === 'tomorrow') {
      start.setDate(start.getDate() + 1);
      start.setHours(0, 0, 0, 0);
      end.setDate(end.getDate() + 1);
      end.setHours(23, 59, 59, 999);
    } else if (dateFilter === 'week') {
      start.setHours(0, 0, 0, 0);
      end.setDate(end.getDate() + 7);
      end.setHours(23, 59, 59, 999);
    } else if (dateFilter === 'month') {
      start.setHours(0, 0, 0, 0);
      end.setDate(end.getDate() + 30);
      end.setHours(23, 59, 59, 999);
    }
    return { from: start.toISOString(), to: end.toISOString() };
  };

  const { data: orders = [], isLoading, refetch, isRefetching } = useQuery({
    queryKey: ['cake-orders', statusFilter, dateFilter, search],
    queryFn: () => {
      const range = dateFilter === 'all' ? {} : getDateRange();
      return cakeOrdersApi.list({
        status: statusFilter === 'active' || statusFilter === 'urgent' || statusFilter === 'all' ? undefined : statusFilter,
        search: search.trim() || undefined,
        ...range,
      });
    },
    refetchInterval: 60_000,
  });

  const filtered = (() => {
    if (statusFilter === 'active') return orders.filter((o) => !['DELIVERED', 'CANCELLED', 'REFUNDED'].includes(o.status));
    if (statusFilter === 'urgent') {
      return orders.filter((o) => {
        const hoursLeft = differenceInHours(new Date(o.neededBy), new Date());
        return hoursLeft <= 6 && hoursLeft >= 0 && !['DELIVERED', 'CANCELLED', 'REFUNDED'].includes(o.status);
      });
    }
    return orders;
  })();

  const stats = {
    total: orders.length,
    active: orders.filter((o) => ['CONFIRMED', 'IN_PRODUCTION', 'BAKING', 'DECORATING'].includes(o.status)).length,
    ready: orders.filter((o) => ['READY', 'OUT_FOR_DELIVERY'].includes(o.status)).length,
    revenue: orders.filter((o) => o.status === 'DELIVERED').reduce((s, o) => s + o.total, 0),
  };

  return (
    <div className="space-y-6">
      <section className="relative overflow-hidden rounded-3xl bg-gradient-to-br from-slate-950 via-pink-900 to-fuchsia-800 text-white p-6 sm:p-8 shadow-2xl">
        <div className="absolute -top-20 -right-20 h-72 w-72 rounded-full bg-pink-400/20 blur-3xl" />
        <div className="relative flex flex-col lg:flex-row lg:items-center lg:justify-between gap-5">
          <div>
            <div className="inline-flex items-center gap-2 rounded-full bg-white/15 backdrop-blur px-3 py-1 text-xs font-extrabold border border-white/20">
              <Sparkles className="h-3.5 w-3.5 text-amber-300" />
              Cake Orders
            </div>
            <h1 className="mt-3 text-3xl sm:text-4xl font-extrabold leading-tight">🎂 Cake Orders</h1>
            <p className="mt-2 text-sm text-white/80 font-semibold">Custom cakes, birthday, wedding orders</p>
          </div>
          <div className="flex items-center gap-2 flex-wrap">
            <button onClick={() => refetch()} disabled={isRefetching} className="inline-flex items-center gap-2 rounded-xl bg-white/15 hover:bg-white/25 px-4 py-2.5 text-sm font-bold backdrop-blur border border-white/20">
              <RefreshCw className={'h-4 w-4 ' + (isRefetching ? 'animate-spin' : '')} />
              Refresh
            </button>
            <Link to="/bakery/cake-orders/new">
              <Button className="bg-white text-slate-900 hover:bg-slate-100">
                <Plus className="h-4 w-4" />
                New Cake Order
              </Button>
            </Link>
          </div>
        </div>
      </section>

      <section className="grid grid-cols-2 lg:grid-cols-4 gap-4">
        <StatCard label="Total" value={stats.total} icon={Cake} color="pink" />
        <StatCard label="Active" value={stats.active} icon={Timer} color="amber" />
        <StatCard label="Ready" value={stats.ready} icon={CheckCircle2} color="emerald" />
        <StatCard label="Revenue" value={formatPKR(stats.revenue)} icon={DollarSign} color="fuchsia" />
      </section>

      <section className="rounded-3xl bg-white dark:bg-neutral-900 border border-slate-200 dark:border-neutral-800 shadow-sm p-4 space-y-3">
        <div className="relative">
          <Search className="h-4 w-4 text-slate-400 absolute left-3.5 top-1/2 -translate-y-1/2" />
          <input value={search} onChange={(e) => setSearch(e.target.value)} placeholder="Search order #, customer, celebrant..." className="h-11 w-full rounded-xl border-2 border-slate-200 dark:border-neutral-700 bg-white dark:bg-neutral-800 pl-10 pr-3 text-sm font-semibold focus:outline-none focus:border-pink-500" />
        </div>

        <div className="flex gap-1.5 overflow-x-auto pb-1">
          {[
            { v: 'today', label: '📅 Today' },
            { v: 'tomorrow', label: 'Tomorrow' },
            { v: 'week', label: 'Next 7 days' },
            { v: 'month', label: 'Next 30 days' },
            { v: 'all', label: 'All Dates' },
          ].map((d) => (
            <button key={d.v} onClick={() => setDateFilter(d.v)} className={
              'shrink-0 px-3 py-1.5 rounded-lg text-xs font-extrabold ' +
              (dateFilter === d.v ? 'bg-slate-900 text-white shadow' : 'bg-slate-100 dark:bg-neutral-800 text-slate-700')
            }>{d.label}</button>
          ))}
        </div>

        <div className="flex gap-1.5 overflow-x-auto pb-1">
          {[
            { v: 'active', label: '🔥 Active' },
            { v: 'urgent', label: '⚡ Urgent' },
            { v: 'all', label: 'All Status' },
            ...Object.entries(STATUS_CONFIG).map(([k, v]) => ({ v: k, label: v.label })),
          ].map((s) => (
            <button key={s.v} onClick={() => setStatusFilter(s.v)} className={
              'shrink-0 px-3 py-1.5 rounded-lg text-xs font-extrabold ' +
              (statusFilter === s.v ? 'bg-pink-600 text-white shadow' : 'bg-slate-100 dark:bg-neutral-800 text-slate-700')
            }>{s.label}</button>
          ))}
        </div>
      </section>

      {isLoading ? (
        <div className="grid gap-3">
          {[1, 2, 3, 4].map((i) => <div key={i} className="h-40 rounded-2xl bg-slate-100 dark:bg-neutral-800 animate-pulse" />)}
        </div>
      ) : filtered.length === 0 ? (
        <div className="rounded-3xl bg-white dark:bg-neutral-900 border-2 border-dashed border-slate-200 dark:border-neutral-800 p-12 text-center">
          <Cake className="h-16 w-16 text-slate-400 mx-auto mb-3" />
          <p className="font-extrabold text-slate-700">No cake orders</p>
          <Link to="/bakery/cake-orders/new">
            <Button className="mt-4 bg-gradient-to-r from-pink-600 to-fuchsia-700">
              <Plus className="h-4 w-4" />
              Design Your First Cake
            </Button>
          </Link>
        </div>
      ) : (
        <section className="grid gap-3">
          {filtered.map((order) => <OrderCard key={order.id} order={order} />)}
        </section>
      )}
    </div>
  );
}

function StatCard({ label, value, icon: Icon, color }: any) {
  const colors: Record<string, string> = {
    pink: 'from-pink-500 to-rose-600',
    amber: 'from-amber-500 to-orange-600',
    emerald: 'from-emerald-500 to-green-600',
    fuchsia: 'from-fuchsia-500 to-pink-600',
  };
  return (
    <div className="rounded-2xl bg-white dark:bg-neutral-900 border-2 border-slate-200 dark:border-neutral-800 p-5 shadow-sm">
      <div className="flex items-center justify-between">
        <div>
          <div className="text-xs uppercase tracking-wider text-slate-500 font-bold">{label}</div>
          <div className="mt-2 text-2xl font-extrabold text-slate-900 dark:text-white tabular-nums">{value}</div>
        </div>
        <div className={'h-12 w-12 rounded-2xl bg-gradient-to-br ' + colors[color] + ' text-white flex items-center justify-center shadow-lg'}>
          <Icon className="h-6 w-6" />
        </div>
      </div>
    </div>
  );
}

function OrderCard({ order }: any) {
  const statusCfg = STATUS_CONFIG[order.status as BakeryOrderStatus];
  const StatusIcon = statusCfg.icon;
  const needed = new Date(order.neededBy);
  const hoursLeft = differenceInHours(needed, new Date());
  const isUrgent = hoursLeft <= 6 && hoursLeft >= 0 && !['DELIVERED', 'CANCELLED', 'REFUNDED'].includes(order.status);
  const isTod = isToday(needed);
  const isTom = isTomorrow(needed);
  const flavor = FLAVORS.find((f) => f.value === order.flavor);
  const remaining = order.total - order.paidAmount;

  return (
    <Link to={'/bakery/cake-orders/' + order.id} className={
      'block rounded-2xl bg-white dark:bg-neutral-900 border-2 shadow-sm hover:shadow-lg transition p-4 ' +
      (isUrgent ? 'border-rose-400 ring-2 ring-rose-100 dark:ring-rose-950/40 animate-pulse' :
       isTod ? 'border-amber-400 ring-1 ring-amber-100' :
       'border-slate-200 dark:border-neutral-800 hover:border-pink-300')
    }>
      <div className="flex items-start justify-between gap-3 flex-wrap">
        <div className="flex items-start gap-3 min-w-0 flex-1">
          <div className={
            'shrink-0 h-16 w-16 rounded-2xl text-white flex items-center justify-center shadow text-3xl ' +
            (flavor ? 'bg-gradient-to-br ' + flavor.color : 'bg-gradient-to-br from-pink-500 to-fuchsia-600')
          }>
            {OCCASION_EMOJI[order.occasion] || CATEGORY_EMOJI[order.category] || '🎂'}
          </div>

          <div className="min-w-0 flex-1">
            <div className="flex items-center gap-2 flex-wrap">
              <span className="font-extrabold text-slate-900 dark:text-white">{order.customerName}</span>
              <span className={'px-2 py-0.5 rounded-full text-[9px] font-extrabold uppercase text-white inline-flex items-center gap-1 ' + statusCfg.color}>
                <StatusIcon className="h-2.5 w-2.5" />
                {statusCfg.label}
              </span>
              {isUrgent && (
                <span className="px-2 py-0.5 rounded bg-rose-500 text-white text-[9px] font-extrabold uppercase inline-flex items-center gap-0.5">
                  <Zap className="h-2 w-2" />
                  URGENT {hoursLeft}H
                </span>
              )}
              {isTod && !isUrgent && (
                <span className="px-2 py-0.5 rounded bg-amber-500 text-white text-[9px] font-extrabold uppercase">TODAY</span>
              )}
              {isTom && (
                <span className="px-2 py-0.5 rounded bg-blue-500 text-white text-[9px] font-extrabold uppercase">TOMORROW</span>
              )}
              {order.paymentStatus === 'PAID' && (
                <span className="px-2 py-0.5 rounded bg-emerald-100 text-emerald-700 text-[9px] font-extrabold uppercase">PAID</span>
              )}
              {order.paymentStatus === 'DEPOSIT_PAID' && (
                <span className="px-2 py-0.5 rounded bg-teal-100 text-teal-700 text-[9px] font-extrabold uppercase">DEPOSIT</span>
              )}
              {order.customerRating && (
                <span className="px-2 py-0.5 rounded bg-amber-100 text-amber-700 text-[9px] font-extrabold uppercase inline-flex items-center gap-0.5">
                  <Star className="h-2 w-2 fill-current" />
                  {order.customerRating}
                </span>
              )}
            </div>

            <div className="mt-1 text-[10px] font-mono text-slate-500">{order.orderNumber}</div>

            <div className="mt-1 flex items-center gap-1 text-xs text-slate-600 font-bold">
              <Phone className="h-3 w-3" />
              {order.customerPhone}
            </div>

            {order.celebrantName && (
              <div className="mt-1 text-xs font-bold text-fuchsia-700">
                🎉 {order.celebrantName}{order.celebrantAge ? ' (' + order.celebrantAge + ')' : ''}
              </div>
            )}

            <div className="mt-2 flex flex-wrap gap-1">
              <span className="px-2 py-0.5 rounded bg-pink-100 dark:bg-pink-950/40 text-pink-700 text-[10px] font-extrabold">
                {order.size?.replace('_', ' ')}
              </span>
              <span className="px-2 py-0.5 rounded bg-fuchsia-100 dark:bg-fuchsia-950/40 text-fuchsia-700 text-[10px] font-extrabold">
                {flavor?.emoji} {order.flavor?.replace('_', ' ')}
              </span>
              <span className="px-2 py-0.5 rounded bg-violet-100 dark:bg-violet-950/40 text-violet-700 text-[10px] font-extrabold">
                {order.shape?.replace('_', ' ')}
              </span>
              {order.isEggless && <span className="px-2 py-0.5 rounded bg-emerald-100 text-emerald-700 text-[10px] font-extrabold">🥚 Eggless</span>}
              {order.hasPhotoOnCake && <span className="px-2 py-0.5 rounded bg-blue-100 text-blue-700 text-[10px] font-extrabold">📸 Photo</span>}
            </div>

            {order.messageOnCake && (
              <div className="mt-1 text-xs italic text-slate-600 line-clamp-1">"{order.messageOnCake}"</div>
            )}
          </div>
        </div>

        <div className="text-right shrink-0">
          <div className="text-[10px] uppercase font-extrabold text-slate-500">Needed by</div>
          <div className="text-sm font-extrabold text-slate-900 dark:text-white">
            {format(needed, 'HH:mm')}
          </div>
          <div className="text-[10px] font-bold text-slate-500 mb-2">
            {isTod ? 'Today' : isTom ? 'Tomorrow' : format(needed, 'dd MMM')}
          </div>
          <div className="text-xl font-extrabold text-emerald-700 dark:text-emerald-400 tabular-nums">{formatPKR(order.total)}</div>
          {remaining > 0 && order.paymentStatus !== 'PAID' && (
            <div className="text-[10px] font-extrabold text-amber-700">Due: {formatPKR(remaining)}</div>
          )}
          <div className="mt-2 inline-flex items-center gap-1 text-xs font-extrabold text-pink-600">
            View <ArrowRight className="h-3 w-3" />
          </div>
        </div>
      </div>
    </Link>
  );
}
