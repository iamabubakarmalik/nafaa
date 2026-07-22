import { useState } from 'react';
import { useQuery } from '@tanstack/react-query';
import { Link } from 'react-router-dom';
import {
  Scissors, Plus, Search, X, RefreshCw, Sparkles, Clock, Award,
  DollarSign, User, Phone, Calendar, AlertCircle, CheckCircle2,
  Package, Timer, Eye, ArrowRight, Zap,
} from 'lucide-react';
import { tailoringApi, type TailoringStatus } from '../api/tailoring.api';
import { formatPKR } from '@core/lib/format';
import { Button } from '@core/ui/Button';
import { format, differenceInDays } from 'date-fns';

const STATUS_CONFIG: Record<TailoringStatus, { label: string; color: string; icon: any; group: string }> = {
  DRAFT: { label: 'Draft', color: 'bg-slate-500', icon: AlertCircle, group: 'pending' },
  QUOTED: { label: 'Quoted', color: 'bg-blue-500', icon: Clock, group: 'pending' },
  CONFIRMED: { label: 'Confirmed', color: 'bg-cyan-500', icon: CheckCircle2, group: 'active' },
  FABRIC_PENDING: { label: 'Fabric Pending', color: 'bg-orange-500', icon: Package, group: 'active' },
  CUTTING: { label: 'Cutting', color: 'bg-amber-500', icon: Scissors, group: 'active' },
  STITCHING: { label: 'Stitching', color: 'bg-purple-500', icon: Scissors, group: 'active' },
  EMBROIDERY: { label: 'Embroidery', color: 'bg-fuchsia-500', icon: Sparkles, group: 'active' },
  QUALITY_CHECK: { label: 'Quality Check', color: 'bg-violet-500', icon: Award, group: 'active' },
  READY: { label: 'Ready', color: 'bg-emerald-500', icon: CheckCircle2, group: 'ready' },
  DELIVERED: { label: 'Delivered', color: 'bg-green-600', icon: CheckCircle2, group: 'done' },
  CANCELLED: { label: 'Cancelled', color: 'bg-rose-500', icon: X, group: 'done' },
  ON_HOLD: { label: 'On Hold', color: 'bg-slate-500', icon: Timer, group: 'pending' },
};

const PRIORITY_CONFIG: Record<string, { label: string; color: string }> = {
  LOW: { label: 'Low', color: 'bg-slate-500' },
  NORMAL: { label: 'Normal', color: 'bg-blue-500' },
  HIGH: { label: 'High', color: 'bg-amber-500' },
  URGENT: { label: 'Urgent', color: 'bg-red-600' },
};

export default function TailoringPage() {
  const [search, setSearch] = useState('');
  const [statusFilter, setStatusFilter] = useState<string>('active');
  const [priorityFilter, setPriorityFilter] = useState<string>('all');

  const { data: orders = [], isLoading, refetch, isRefetching } = useQuery({
    queryKey: ['tailoring-orders', statusFilter, priorityFilter, search],
    queryFn: () => tailoringApi.list({
      status: statusFilter === 'all' || statusFilter === 'active' ? undefined : statusFilter,
      priority: priorityFilter === 'all' ? undefined : priorityFilter,
      search: search.trim() || undefined,
    }),
    refetchInterval: 60_000,
  });

  const filtered = statusFilter === 'active'
    ? orders.filter((o) => !['DELIVERED', 'CANCELLED', 'DRAFT'].includes(o.orderStatus))
    : orders;

  const stats = {
    pending: orders.filter((o) => ['CONFIRMED', 'FABRIC_PENDING'].includes(o.orderStatus)).length,
    active: orders.filter((o) => ['CUTTING', 'STITCHING', 'EMBROIDERY', 'QUALITY_CHECK'].includes(o.orderStatus)).length,
    ready: orders.filter((o) => o.orderStatus === 'READY').length,
    urgent: orders.filter((o) => o.priority === 'URGENT' && !['DELIVERED', 'CANCELLED'].includes(o.orderStatus)).length,
  };

  return (
    <div className="space-y-6">
      <section className="relative overflow-hidden rounded-3xl bg-gradient-to-br from-slate-950 via-purple-900 to-violet-700 text-white p-6 sm:p-8 shadow-2xl">
        <div className="absolute -top-20 -right-20 h-72 w-72 rounded-full bg-purple-400/20 blur-3xl" />
        <div className="relative flex flex-col lg:flex-row lg:items-center lg:justify-between gap-5">
          <div>
            <div className="inline-flex items-center gap-2 rounded-full bg-white/15 backdrop-blur px-3 py-1 text-xs font-extrabold border border-white/20">
              <Sparkles className="h-3.5 w-3.5 text-amber-300" />
              Custom Stitching
            </div>
            <h1 className="mt-3 text-3xl sm:text-4xl font-extrabold leading-tight">✂️ Tailoring Orders</h1>
            <p className="mt-2 text-sm text-white/80 font-semibold">Bespoke stitching workflow — order to delivery</p>
          </div>
          <div className="flex items-center gap-2 flex-wrap">
            <button onClick={() => refetch()} disabled={isRefetching} className="inline-flex items-center gap-2 rounded-xl bg-white/15 hover:bg-white/25 px-4 py-2.5 text-sm font-bold backdrop-blur border border-white/20">
              <RefreshCw className={'h-4 w-4 ' + (isRefetching ? 'animate-spin' : '')} />
              Refresh
            </button>
            <Link to="/garments/tailoring/new">
              <Button className="bg-white text-slate-900 hover:bg-slate-100">
                <Plus className="h-4 w-4" />
                New Tailoring Order
              </Button>
            </Link>
          </div>
        </div>
      </section>

      <section className="grid grid-cols-2 lg:grid-cols-4 gap-4">
        <StatCard label="Confirmed / Waiting" value={stats.pending} icon={Clock} color="cyan" />
        <StatCard label="In Progress" value={stats.active} icon={Scissors} color="purple" />
        <StatCard label="Ready for Pickup" value={stats.ready} icon={CheckCircle2} color="emerald" />
        <StatCard label="Urgent Orders" value={stats.urgent} icon={Zap} color="rose" highlight={stats.urgent > 0} />
      </section>

      <section className="rounded-3xl bg-white dark:bg-neutral-900 border border-slate-200 dark:border-neutral-800 shadow-sm p-4 space-y-3">
        <div className="relative">
          <Search className="h-4 w-4 text-slate-400 absolute left-3.5 top-1/2 -translate-y-1/2" />
          <input
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            placeholder="Search order #, customer name, phone..."
            className="h-11 w-full rounded-xl border-2 border-slate-200 dark:border-neutral-700 bg-white dark:bg-neutral-800 pl-10 pr-3 text-sm font-semibold focus:outline-none focus:border-purple-500"
          />
        </div>

        <div className="flex gap-1.5 overflow-x-auto pb-1">
          {[
            { v: 'active', label: '🔥 Active' },
            { v: 'all', label: 'All' },
            { v: 'CONFIRMED', label: 'Confirmed' },
            { v: 'CUTTING', label: 'Cutting' },
            { v: 'STITCHING', label: 'Stitching' },
            { v: 'EMBROIDERY', label: 'Embroidery' },
            { v: 'READY', label: 'Ready' },
            { v: 'DELIVERED', label: 'Delivered' },
            { v: 'CANCELLED', label: 'Cancelled' },
          ].map((s) => (
            <button key={s.v} onClick={() => setStatusFilter(s.v)} className={
              'shrink-0 px-3 py-1.5 rounded-lg text-xs font-extrabold ' +
              (statusFilter === s.v ? 'bg-purple-600 text-white shadow' : 'bg-slate-100 dark:bg-neutral-800 text-slate-700')
            }>{s.label}</button>
          ))}
        </div>

        <div className="flex gap-1.5">
          {['all', 'LOW', 'NORMAL', 'HIGH', 'URGENT'].map((p) => (
            <button key={p} onClick={() => setPriorityFilter(p)} className={
              'px-3 py-1.5 rounded-lg text-xs font-extrabold ' +
              (priorityFilter === p ? 'bg-slate-900 text-white shadow' : 'bg-slate-100 dark:bg-neutral-800 text-slate-700')
            }>
              {p === 'all' ? 'All Priority' : PRIORITY_CONFIG[p]?.label || p}
            </button>
          ))}
        </div>
      </section>

      {isLoading ? (
        <div className="grid gap-3">
          {[1, 2, 3, 4].map((i) => <div key={i} className="h-40 rounded-2xl bg-slate-100 dark:bg-neutral-800 animate-pulse" />)}
        </div>
      ) : filtered.length === 0 ? (
        <div className="rounded-3xl bg-white dark:bg-neutral-900 border-2 border-dashed border-slate-200 dark:border-neutral-800 p-12 text-center">
          <Scissors className="h-16 w-16 text-slate-400 mx-auto mb-3" />
          <p className="font-extrabold text-slate-700">No tailoring orders</p>
          <Link to="/garments/tailoring/new">
            <Button className="mt-4 bg-gradient-to-r from-purple-600 to-violet-700">
              <Plus className="h-4 w-4" />
              Create First Order
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

function StatCard({ label, value, icon: Icon, color, highlight }: any) {
  const colors: Record<string, string> = {
    cyan: 'from-cyan-500 to-blue-600', purple: 'from-purple-500 to-violet-600',
    emerald: 'from-emerald-500 to-green-600', rose: 'from-rose-500 to-red-600',
  };
  return (
    <div className={
      'rounded-2xl border-2 p-5 shadow-sm ' +
      (highlight ? 'bg-gradient-to-br from-rose-50 to-red-50 dark:from-rose-950/40 dark:to-red-950/40 border-rose-300 animate-pulse' : 'bg-white dark:bg-neutral-900 border-slate-200 dark:border-neutral-800')
    }>
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

function OrderCard({ order }: { order: any }) {
  const statusCfg = STATUS_CONFIG[order.orderStatus as TailoringStatus];
  const priorityCfg = PRIORITY_CONFIG[order.priority] || PRIORITY_CONFIG.NORMAL;
  const StatusIcon = statusCfg.icon;
  const daysLeft = order.promisedDate ? differenceInDays(new Date(order.promisedDate), new Date()) : null;
  const remaining = order.total - order.paidAmount;

  return (
    <Link to={'/garments/tailoring/' + order.id} className="block rounded-2xl bg-white dark:bg-neutral-900 border-2 border-slate-200 dark:border-neutral-800 shadow-sm hover:shadow-lg hover:border-purple-300 transition p-4">
      <div className="flex items-start justify-between gap-3 flex-wrap">
        <div className="flex items-start gap-3 min-w-0 flex-1">
          <div className="h-12 w-12 rounded-2xl bg-gradient-to-br from-purple-500 to-violet-600 text-white flex items-center justify-center shadow shrink-0">
            <Scissors className="h-6 w-6" />
          </div>
          <div className="min-w-0 flex-1">
            <div className="flex items-center gap-2 flex-wrap">
              <span className="font-extrabold text-slate-900 dark:text-white">{order.orderNumber}</span>
              <span className={'px-2 py-0.5 rounded-full text-[9px] font-extrabold uppercase inline-flex items-center gap-1 text-white ' + statusCfg.color}>
                <StatusIcon className="h-2.5 w-2.5" />
                {statusCfg.label}
              </span>
              <span className={'px-2 py-0.5 rounded-md text-[9px] font-extrabold uppercase text-white ' + priorityCfg.color}>
                {priorityCfg.label}
              </span>
              {order.paymentStatus === 'PAID' && (
                <span className="px-2 py-0.5 rounded-md bg-emerald-100 dark:bg-emerald-950/40 text-emerald-700 text-[9px] font-extrabold uppercase inline-flex items-center gap-0.5">
                  <CheckCircle2 className="h-2 w-2" />
                  Paid
                </span>
              )}
              {order.paymentStatus === 'PARTIALLY_PAID' && (
                <span className="px-2 py-0.5 rounded-md bg-amber-100 dark:bg-amber-950/40 text-amber-700 text-[9px] font-extrabold uppercase">
                  Partial
                </span>
              )}
            </div>

            <div className="mt-2 flex items-center gap-3 text-xs text-slate-600 font-semibold flex-wrap">
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
              <span className="inline-flex items-center gap-1">
                <Calendar className="h-3 w-3" />
                {format(new Date(order.createdAt), 'dd MMM')}
              </span>
              {order.promisedDate && (
                <span className={
                  'inline-flex items-center gap-1 font-extrabold ' +
                  (daysLeft !== null && daysLeft < 0 ? 'text-rose-700' : daysLeft !== null && daysLeft <= 2 ? 'text-amber-700' : 'text-slate-700')
                }>
                  <Clock className="h-3 w-3" />
                  Due: {format(new Date(order.promisedDate), 'dd MMM')}
                  {daysLeft !== null && (daysLeft < 0 ? ' (OVERDUE)' : daysLeft <= 2 ? ' (' + daysLeft + 'd)' : '')}
                </span>
              )}
            </div>

            <div className="mt-2 flex flex-wrap gap-1">
              {order.items?.slice(0, 4).map((it: any, i: number) => (
                <span key={i} className="px-2 py-0.5 rounded bg-slate-100 dark:bg-neutral-800 text-[10px] font-extrabold text-slate-700">
                  {it.garmentName} × {it.quantity}
                </span>
              ))}
              {(order.items?.length || 0) > 4 && (
                <span className="px-2 py-0.5 rounded bg-slate-100 dark:bg-neutral-800 text-[10px] font-extrabold text-slate-500">
                  +{(order.items?.length || 0) - 4} more
                </span>
              )}
            </div>
          </div>
        </div>

        <div className="text-right shrink-0">
          <div className="text-xl font-extrabold text-emerald-700 dark:text-emerald-400 tabular-nums">{formatPKR(order.total)}</div>
          {remaining > 0 && order.paymentStatus !== 'PAID' && (
            <div className="text-[10px] font-extrabold text-amber-700">Due: {formatPKR(remaining)}</div>
          )}
          {order.paidAmount > 0 && (
            <div className="text-[10px] font-bold text-emerald-600">Paid: {formatPKR(order.paidAmount)}</div>
          )}
          <div className="mt-2 inline-flex items-center gap-1 text-xs font-extrabold text-purple-600">
            View <ArrowRight className="h-3 w-3" />
          </div>
        </div>
      </div>
    </Link>
  );
}
