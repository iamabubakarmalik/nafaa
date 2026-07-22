import { useState } from 'react';
import { useQuery } from '@tanstack/react-query';
import { Link } from 'react-router-dom';
import {
  Truck, Plus, Search, RefreshCw, Sparkles, Clock, User, Phone, MapPin,
  CheckCircle2, X, ArrowRight, Package, Calendar, AlertCircle,
} from 'lucide-react';
import { deliveriesApi, type DeliveryStatus } from '../api/deliveries.api';
import { formatPKR } from '@/lib/format';
import { Button } from '@/components/ui/Button';
import { format, differenceInDays } from 'date-fns';

const STATUS_CONFIG: Record<DeliveryStatus, { label: string; color: string }> = {
  PENDING: { label: 'Pending', color: 'bg-slate-500' },
  SCHEDULED: { label: 'Scheduled', color: 'bg-blue-500' },
  LOADED: { label: 'Loaded', color: 'bg-cyan-500' },
  DISPATCHED: { label: 'Dispatched', color: 'bg-amber-500' },
  IN_TRANSIT: { label: 'In Transit', color: 'bg-orange-500' },
  DELIVERED: { label: 'Delivered', color: 'bg-emerald-600' },
  PARTIALLY_DELIVERED: { label: 'Partial', color: 'bg-amber-600' },
  FAILED: { label: 'Failed', color: 'bg-rose-500' },
  CANCELLED: { label: 'Cancelled', color: 'bg-rose-500' },
  RETURNED: { label: 'Returned', color: 'bg-slate-600' },
};

export default function DeliveriesPage() {
  const [search, setSearch] = useState('');
  const [statusFilter, setStatusFilter] = useState<string>('active');

  const { data: deliveries = [], isLoading, refetch, isRefetching } = useQuery({
    queryKey: ['hardware-deliveries', statusFilter, search],
    queryFn: () => deliveriesApi.list({
      status: statusFilter === 'active' || statusFilter === 'all' ? undefined : statusFilter,
      search: search.trim() || undefined,
    }),
    refetchInterval: 60_000,
  });

  const { data: summary } = useQuery({
    queryKey: ['hardware-deliveries-summary'],
    queryFn: () => deliveriesApi.summary(),
  });

  const filtered = statusFilter === 'active'
    ? deliveries.filter((d) => !['DELIVERED', 'CANCELLED', 'RETURNED'].includes(d.status))
    : deliveries;

  return (
    <div className="space-y-6">
      <section className="relative overflow-hidden rounded-3xl bg-gradient-to-br from-slate-950 via-emerald-900 to-teal-700 text-white p-6 sm:p-8 shadow-2xl">
        <div className="absolute -top-20 -right-20 h-72 w-72 rounded-full bg-emerald-400/20 blur-3xl" />
        <div className="relative flex flex-col lg:flex-row lg:items-center lg:justify-between gap-5">
          <div>
            <div className="inline-flex items-center gap-2 rounded-full bg-white/15 backdrop-blur px-3 py-1 text-xs font-extrabold border border-white/20">
              <Sparkles className="h-3.5 w-3.5 text-amber-300" />
              Dispatch Manager
            </div>
            <h1 className="mt-3 text-3xl sm:text-4xl font-extrabold leading-tight">🚚 Deliveries</h1>
            <p className="mt-2 text-sm text-white/80 font-semibold">Truck dispatch with driver + POD tracking</p>
          </div>
          <button onClick={() => refetch()} disabled={isRefetching} className="inline-flex items-center gap-2 rounded-xl bg-white/15 hover:bg-white/25 px-4 py-2.5 text-sm font-bold backdrop-blur border border-white/20">
            <RefreshCw className={'h-4 w-4 ' + (isRefetching ? 'animate-spin' : '')} />
            Refresh
          </button>
        </div>
      </section>

      {summary && (
        <section className="grid grid-cols-2 lg:grid-cols-4 gap-4">
          <StatCard label="Pending" value={summary.pending} icon={Clock} color="amber" />
          <StatCard label="In Transit" value={summary.inTransit} icon={Truck} color="orange" />
          <StatCard label="Today Scheduled" value={summary.todayScheduled} icon={Calendar} color="blue" />
          <StatCard label="Delivered" value={summary.deliveredCount} icon={CheckCircle2} color="emerald" sub={formatPKR(summary.deliveredRevenue)} />
        </section>
      )}

      <section className="rounded-3xl bg-white dark:bg-neutral-900 border border-slate-200 dark:border-neutral-800 shadow-sm p-4 space-y-3">
        <div className="relative">
          <Search className="h-4 w-4 text-slate-400 absolute left-3.5 top-1/2 -translate-y-1/2" />
          <input value={search} onChange={(e) => setSearch(e.target.value)} placeholder="Search delivery #, customer, vehicle, driver..." className="h-11 w-full rounded-xl border-2 border-slate-200 dark:border-neutral-700 bg-white dark:bg-neutral-800 pl-10 pr-3 text-sm font-semibold focus:outline-none focus:border-emerald-500" />
        </div>
        <div className="flex gap-1.5 overflow-x-auto pb-1">
          {['active', 'all', ...Object.keys(STATUS_CONFIG)].map((s) => (
            <button key={s} onClick={() => setStatusFilter(s)} className={
              'shrink-0 px-3 py-1.5 rounded-lg text-xs font-extrabold ' +
              (statusFilter === s ? 'bg-emerald-600 text-white shadow' : 'bg-slate-100 dark:bg-neutral-800 text-slate-700')
            }>
              {s === 'active' ? '🔥 Active' : s === 'all' ? 'All' : STATUS_CONFIG[s as DeliveryStatus]?.label || s}
            </button>
          ))}
        </div>
      </section>

      {isLoading ? (
        <div className="grid gap-3">
          {[1, 2, 3].map((i) => <div key={i} className="h-40 rounded-2xl bg-slate-100 dark:bg-neutral-800 animate-pulse" />)}
        </div>
      ) : filtered.length === 0 ? (
        <div className="rounded-3xl bg-white dark:bg-neutral-900 border-2 border-dashed border-slate-200 dark:border-neutral-800 p-12 text-center">
          <Truck className="h-16 w-16 text-slate-400 mx-auto mb-3" />
          <p className="font-extrabold text-slate-700">No deliveries</p>
        </div>
      ) : (
        <section className="grid gap-3">
          {filtered.map((d) => <DeliveryCard key={d.id} d={d} />)}
        </section>
      )}
    </div>
  );
}

function StatCard({ label, value, sub, icon: Icon, color }: any) {
  const colors: Record<string, string> = {
    amber: 'from-amber-500 to-orange-600', orange: 'from-orange-500 to-red-600',
    blue: 'from-blue-500 to-indigo-600', emerald: 'from-emerald-500 to-green-600',
  };
  return (
    <div className="rounded-2xl bg-white dark:bg-neutral-900 border-2 border-slate-200 dark:border-neutral-800 p-5 shadow-sm">
      <div className="flex items-center justify-between">
        <div>
          <div className="text-xs uppercase tracking-wider text-slate-500 font-bold">{label}</div>
          <div className="mt-2 text-2xl font-extrabold text-slate-900 dark:text-white tabular-nums">{value}</div>
          {sub && <div className="text-xs font-semibold text-slate-600 mt-1">{sub}</div>}
        </div>
        <div className={'h-12 w-12 rounded-2xl bg-gradient-to-br ' + colors[color] + ' text-white flex items-center justify-center shadow-lg'}>
          <Icon className="h-6 w-6" />
        </div>
      </div>
    </div>
  );
}

function DeliveryCard({ d }: any) {
  const cfg = STATUS_CONFIG[d.status as DeliveryStatus];
  const daysLeft = d.scheduledDate ? differenceInDays(new Date(d.scheduledDate), new Date()) : null;

  return (
    <Link to={'/hardware/deliveries/' + d.id} className="block rounded-2xl bg-white dark:bg-neutral-900 border-2 border-slate-200 dark:border-neutral-800 shadow-sm hover:shadow-lg hover:border-emerald-300 transition p-4">
      <div className="flex items-start justify-between gap-3 flex-wrap">
        <div className="flex items-start gap-3 min-w-0 flex-1">
          <div className="h-12 w-12 rounded-2xl bg-gradient-to-br from-emerald-500 to-teal-600 text-white flex items-center justify-center shadow shrink-0">
            <Truck className="h-6 w-6" />
          </div>
          <div className="min-w-0 flex-1">
            <div className="flex items-center gap-2 flex-wrap">
              <span className="font-extrabold">{d.deliveryNumber}</span>
              <span className={'px-2 py-0.5 rounded-full text-[9px] font-extrabold uppercase text-white ' + cfg.color}>{cfg.label}</span>
              <span className="px-2 py-0.5 rounded bg-slate-100 text-slate-700 text-[9px] font-extrabold uppercase">{d.vehicleType}</span>
            </div>
            <div className="mt-1 font-bold">{d.customerName}</div>
            <div className="mt-1 flex items-center gap-3 text-xs text-slate-600 font-semibold flex-wrap">
              {d.customerPhone && <span className="inline-flex items-center gap-1"><Phone className="h-3 w-3" />{d.customerPhone}</span>}
              {d.city && <span className="inline-flex items-center gap-1"><MapPin className="h-3 w-3" />{d.city}</span>}
              {d.vehicleNumber && <span className="inline-flex items-center gap-1 text-blue-700"><Truck className="h-3 w-3" />{d.vehicleNumber}</span>}
              {d.driverName && <span className="inline-flex items-center gap-1"><User className="h-3 w-3" />{d.driverName}</span>}
            </div>
            <div className="mt-1 text-xs text-slate-500 font-semibold">{d.items?.length || 0} items</div>
          </div>
        </div>
        <div className="text-right shrink-0">
          <div className="text-lg font-extrabold text-emerald-700 tabular-nums">{formatPKR(d.totalCharges)}</div>
          {daysLeft !== null && d.scheduledDate && (
            <div className={
              'text-xs font-extrabold ' +
              (daysLeft < 0 ? 'text-rose-700' : daysLeft === 0 ? 'text-amber-700' : 'text-slate-700')
            }>
              {daysLeft < 0 ? 'OVERDUE' : daysLeft === 0 ? 'TODAY' : daysLeft + 'd'}
            </div>
          )}
        </div>
      </div>
    </Link>
  );
}
