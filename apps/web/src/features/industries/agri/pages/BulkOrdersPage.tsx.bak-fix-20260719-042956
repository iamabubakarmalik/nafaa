import { useState } from 'react';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { Link } from 'react-router-dom';
import {
  Package, Plus, Search, X, RefreshCw, Sparkles, Clock, User, Phone,
  Tractor, CheckCircle2, ArrowRight, MapPin, Calendar, DollarSign,
  Ban, Truck, TrendingUp,
} from 'lucide-react';
import { bulkOrdersApi, type OrderStatus } from '../api/bulk-orders.api';
import { formatPKR } from '@/lib/format';
import { Button } from '@/components/ui/Button';
import { toast } from 'sonner';
import { format, differenceInHours } from 'date-fns';

const STATUS_CONFIG: Record<OrderStatus, { label: string; color: string; next?: OrderStatus }> = {
  DRAFT: { label: 'Draft', color: 'bg-slate-500', next: 'CONFIRMED' },
  PENDING: { label: 'Pending', color: 'bg-amber-500', next: 'CONFIRMED' },
  CONFIRMED: { label: 'Confirmed', color: 'bg-blue-500', next: 'PROCESSING' },
  PROCESSING: { label: 'Processing', color: 'bg-cyan-500', next: 'READY' },
  READY: { label: 'Ready', color: 'bg-emerald-500', next: 'OUT_FOR_DELIVERY' },
  OUT_FOR_DELIVERY: { label: 'In Transit', color: 'bg-teal-600', next: 'DELIVERED' },
  DELIVERED: { label: 'Delivered', color: 'bg-green-600' },
  RETURNED: { label: 'Returned', color: 'bg-orange-600' },
  CANCELLED: { label: 'Cancelled', color: 'bg-rose-500' },
};

const SEASON_EMOJI: Record<string, string> = {
  KHARIF: '🌧️', RABI: '❄️', ZAID: '☀️', ALL_SEASON: '🌍',
};

export default function BulkOrdersPage() {
  const queryClient = useQueryClient();
  const [search, setSearch] = useState('');
  const [statusFilter, setStatusFilter] = useState<string>('active');
  const [seasonFilter, setSeasonFilter] = useState<string>('all');

  const { data: orders = [], isLoading, refetch, isRefetching } = useQuery({
    queryKey: ['agri-bulk-orders', statusFilter, seasonFilter, search],
    queryFn: () => bulkOrdersApi.list({
      status: statusFilter === 'active' || statusFilter === 'all' ? undefined : statusFilter,
      season: seasonFilter === 'all' ? undefined : seasonFilter,
      search: search.trim() || undefined,
    }),
    refetchInterval: 60_000,
  });

  const filtered = statusFilter === 'active'
    ? orders.filter((o) => !['DELIVERED', 'CANCELLED', 'RETURNED'].includes(o.status))
    : orders;

  const statusMutation = useMutation({
    mutationFn: ({ id, status }: { id: string; status: string }) => bulkOrdersApi.updateStatus(id, status),
    onSuccess: () => { toast.success('Status updated'); queryClient.invalidateQueries({ queryKey: ['agri-bulk-orders'] }); },
  });

  const stats = {
    pending: orders.filter((o) => ['CONFIRMED', 'PROCESSING'].includes(o.status)).length,
    transit: orders.filter((o) => o.status === 'OUT_FOR_DELIVERY').length,
    delivered: orders.filter((o) => o.status === 'DELIVERED').length,
    revenue: orders.filter((o) => o.status === 'DELIVERED').reduce((s, o) => s + o.total, 0),
  };

  return (
    <div className="space-y-6">
      <section className="relative overflow-hidden rounded-3xl bg-gradient-to-br from-slate-950 via-teal-900 to-cyan-800 text-white p-6 sm:p-8 shadow-2xl">
        <div className="absolute -top-20 -right-20 h-72 w-72 rounded-full bg-teal-400/20 blur-3xl" />
        <div className="relative flex flex-col lg:flex-row lg:items-center lg:justify-between gap-5">
          <div>
            <div className="inline-flex items-center gap-2 rounded-full bg-white/15 backdrop-blur px-3 py-1 text-xs font-extrabold border border-white/20">
              <Tractor className="h-3.5 w-3.5 text-amber-300" />
              Bulk Orders
            </div>
            <h1 className="mt-3 text-3xl sm:text-4xl font-extrabold leading-tight">📦 Agri Bulk Orders</h1>
            <p className="mt-2 text-sm text-white/80 font-semibold">Large quantity orders for farmers</p>
          </div>
          <div className="flex items-center gap-2 flex-wrap">
            <button onClick={() => refetch()} disabled={isRefetching} className="inline-flex items-center gap-2 rounded-xl bg-white/15 hover:bg-white/25 px-4 py-2.5 text-sm font-bold backdrop-blur border border-white/20">
              <RefreshCw className={'h-4 w-4 ' + (isRefetching ? 'animate-spin' : '')} />
              Refresh
            </button>
            <Link to="/agri/bulk-orders/new">
              <Button className="bg-white text-slate-900 hover:bg-slate-100">
                <Plus className="h-4 w-4" />
                New Order
              </Button>
            </Link>
          </div>
        </div>
      </section>

      <section className="grid grid-cols-2 lg:grid-cols-4 gap-4">
        <StatCard label="Processing" value={stats.pending} icon={Clock} color="cyan" />
        <StatCard label="In Transit" value={stats.transit} icon={Truck} color="teal" />
        <StatCard label="Delivered" value={stats.delivered} icon={CheckCircle2} color="emerald" />
        <StatCard label="Revenue" value={formatPKR(stats.revenue)} icon={DollarSign} color="amber" />
      </section>

      <section className="rounded-3xl bg-white dark:bg-neutral-900 border border-slate-200 dark:border-neutral-800 shadow-sm p-4 space-y-3">
        <div className="relative">
          <Search className="h-4 w-4 text-slate-400 absolute left-3.5 top-1/2 -translate-y-1/2" />
          <input value={search} onChange={(e) => setSearch(e.target.value)} placeholder="Search order #, farmer name, phone..." className="h-11 w-full rounded-xl border-2 border-slate-200 dark:border-neutral-700 bg-white dark:bg-neutral-800 pl-10 pr-3 text-sm font-semibold focus:outline-none focus:border-teal-500" />
        </div>
        <div className="flex gap-1.5 overflow-x-auto pb-1">
          {[
            { v: 'active', label: '🔥 Active' },
            { v: 'all', label: 'All' },
            ...Object.entries(STATUS_CONFIG).map(([k, v]) => ({ v: k, label: v.label })),
          ].map((s) => (
            <button key={s.v} onClick={() => setStatusFilter(s.v)} className={
              'shrink-0 px-3 py-1.5 rounded-lg text-xs font-extrabold ' +
              (statusFilter === s.v ? 'bg-teal-600 text-white shadow' : 'bg-slate-100 dark:bg-neutral-800 text-slate-700')
            }>{s.label}</button>
          ))}
        </div>
        <div className="flex gap-1.5">
          <button onClick={() => setSeasonFilter('all')} className={
            'px-3 py-1.5 rounded-lg text-xs font-extrabold ' +
            (seasonFilter === 'all' ? 'bg-green-600 text-white shadow' : 'bg-slate-100 dark:bg-neutral-800 text-slate-700')
          }>All Seasons</button>
          {['KHARIF', 'RABI', 'ZAID', 'ALL_SEASON'].map((s) => (
            <button key={s} onClick={() => setSeasonFilter(s)} className={
              'px-3 py-1.5 rounded-lg text-xs font-extrabold ' +
              (seasonFilter === s ? 'bg-green-600 text-white shadow' : 'bg-slate-100 dark:bg-neutral-800 text-slate-700')
            }>{SEASON_EMOJI[s]} {s.replace('_', ' ')}</button>
          ))}
        </div>
      </section>

      {isLoading ? (
        <div className="grid gap-3">{[1, 2, 3].map((i) => <div key={i} className="h-40 rounded-2xl bg-slate-100 dark:bg-neutral-800 animate-pulse" />)}</div>
      ) : filtered.length === 0 ? (
        <div className="rounded-3xl bg-white dark:bg-neutral-900 border-2 border-dashed border-slate-200 dark:border-neutral-800 p-12 text-center">
          <Package className="h-16 w-16 text-slate-400 mx-auto mb-3" />
          <p className="font-extrabold text-slate-700">No bulk orders yet</p>
          <Link to="/agri/bulk-orders/new">
            <Button className="mt-4 bg-gradient-to-r from-teal-600 to-cyan-700">
              <Plus className="h-4 w-4" />
              Create First Order
            </Button>
          </Link>
        </div>
      ) : (
        <section className="grid gap-3">
          {filtered.map((order) => (
            <OrderCard
              key={order.id}
              order={order}
              onAdvance={(next) => statusMutation.mutate({ id: order.id, status: next })}
            />
          ))}
        </section>
      )}
    </div>
  );
}

function StatCard({ label, value, icon: Icon, color }: any) {
  const colors: Record<string, string> = {
    cyan: 'from-cyan-500 to-blue-600', teal: 'from-teal-500 to-cyan-600',
    emerald: 'from-emerald-500 to-green-600', amber: 'from-amber-500 to-orange-600',
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

function OrderCard({ order, onAdvance }: any) {
  const statusCfg = STATUS_CONFIG[order.status as OrderStatus];
  const remaining = order.total - order.paidAmount;
  const totalQty = order.items.reduce((s: number, it: any) => s + it.quantity, 0);
  const hoursToDelivery = order.deliveryDate ? differenceInHours(new Date(order.deliveryDate), new Date()) : null;

  return (
    <Link to={'/agri/bulk-orders/' + order.id} className="block rounded-2xl bg-white dark:bg-neutral-900 border-2 border-slate-200 dark:border-neutral-800 shadow-sm hover:shadow-lg hover:border-teal-300 transition p-4">
      <div className="flex items-start justify-between gap-3 flex-wrap">
        <div className="flex items-start gap-3 min-w-0 flex-1">
          <div className="h-12 w-12 rounded-2xl bg-gradient-to-br from-teal-500 to-cyan-600 text-white flex items-center justify-center shadow shrink-0">
            <Package className="h-6 w-6" />
          </div>
          <div className="min-w-0 flex-1">
            <div className="flex items-center gap-2 flex-wrap">
              <span className="font-extrabold text-slate-900 dark:text-white">{order.orderNumber}</span>
              <span className={'px-2 py-0.5 rounded-full text-[9px] font-extrabold uppercase text-white ' + statusCfg.color}>
                {statusCfg.label}
              </span>
              {order.season && (
                <span className="px-2 py-0.5 rounded bg-green-100 dark:bg-green-950/40 text-green-700 text-[9px] font-extrabold uppercase">
                  {SEASON_EMOJI[order.season]} {order.season.replace('_', ' ')}
                </span>
              )}
              {order.isCredit && (
                <span className="px-2 py-0.5 rounded bg-amber-100 text-amber-700 text-[9px] font-extrabold uppercase">CREDIT</span>
              )}
              {order.isDelivery && (
                <span className="px-2 py-0.5 rounded bg-blue-100 dark:bg-blue-950/40 text-blue-700 text-[9px] font-extrabold uppercase inline-flex items-center gap-0.5">
                  <Truck className="h-2 w-2" /> DELIVERY
                </span>
              )}
              {order.cropTarget && (
                <span className="px-2 py-0.5 rounded bg-lime-100 dark:bg-lime-950/40 text-lime-700 text-[9px] font-extrabold uppercase">
                  🌱 {order.cropTarget}
                </span>
              )}
            </div>

            <div className="mt-2 flex items-center gap-3 text-xs text-slate-600 font-semibold flex-wrap">
              {order.customerName && <span className="inline-flex items-center gap-1"><User className="h-3 w-3" />{order.customerName}</span>}
              {order.customerPhone && <span className="inline-flex items-center gap-1"><Phone className="h-3 w-3" />{order.customerPhone}</span>}
              {order.deliveryDate && (
                <span className={
                  'inline-flex items-center gap-1 font-extrabold ' +
                  (hoursToDelivery !== null && hoursToDelivery < 24 && hoursToDelivery >= 0 ? 'text-amber-700' : 'text-slate-700')
                }>
                  <Calendar className="h-3 w-3" />
                  {format(new Date(order.deliveryDate), 'dd MMM, HH:mm')}
                </span>
              )}
            </div>

            <div className="mt-2 flex flex-wrap gap-1">
              {order.items?.slice(0, 3).map((it: any, i: number) => (
                <span key={i} className="px-2 py-0.5 rounded bg-teal-100 dark:bg-teal-950/40 text-teal-700 text-[10px] font-extrabold">
                  {it.productName} • {it.quantity} {it.unit}
                </span>
              ))}
              {(order.items?.length || 0) > 3 && (
                <span className="px-2 py-0.5 rounded bg-slate-100 dark:bg-neutral-800 text-slate-500 text-[10px] font-extrabold">
                  +{(order.items?.length || 0) - 3} more
                </span>
              )}
            </div>
          </div>
        </div>

        <div className="text-right shrink-0">
          <div className="text-[10px] uppercase font-extrabold text-slate-500">{totalQty} units</div>
          <div className="text-xl font-extrabold text-emerald-700 dark:text-emerald-400 tabular-nums">{formatPKR(order.total)}</div>
          {remaining > 0 && order.paymentStatus !== 'PAID' && (
            <div className="text-[10px] font-extrabold text-amber-700">Due: {formatPKR(remaining)}</div>
          )}
          {statusCfg.next && !['CANCELLED', 'DELIVERED', 'RETURNED'].includes(order.status) && (
            <button
              onClick={(e) => { e.preventDefault(); onAdvance(statusCfg.next); }}
              className={'mt-2 px-3 py-1 rounded-lg text-[10px] font-extrabold uppercase text-white ' + STATUS_CONFIG[statusCfg.next].color}
            >
              → {STATUS_CONFIG[statusCfg.next].label}
            </button>
          )}
        </div>
      </div>
    </Link>
  );
}
