import { useMemo, useState } from 'react';
import { Link } from 'react-router-dom';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import {
  FlaskConical, Plus, Search, X, RefreshCw, Clock, CheckCircle2,
  XCircle, AlertTriangle, User, Phone, Calendar, DollarSign,
  Eye, Package, Send, Trash2, ArrowRight,
} from 'lucide-react';
import { toast } from 'sonner';
import { lensOrdersApi, type OpticalLensOrder } from '../api/lens-orders.api';
import { formatPKR } from '@core/lib/format';
import { Button } from '@core/ui/Button';

const STATUS_META: Record<string, { label: string; color: string; bg: string; icon: any }> = {
  ORDERED: { label: 'Ordered', color: 'text-slate-700', bg: 'bg-slate-100', icon: Clock },
  SENT_TO_LAB: { label: 'Sent to Lab', color: 'text-amber-700', bg: 'bg-amber-100', icon: Send },
  AT_LAB: { label: 'At Lab', color: 'text-amber-700', bg: 'bg-amber-100', icon: FlaskConical },
  RECEIVED: { label: 'Received', color: 'text-blue-700', bg: 'bg-blue-100', icon: Package },
  QC_PASSED: { label: 'QC Passed', color: 'text-cyan-700', bg: 'bg-cyan-100', icon: CheckCircle2 },
  FITTED: { label: 'Fitted', color: 'text-violet-700', bg: 'bg-violet-100', icon: CheckCircle2 },
  READY: { label: 'Ready', color: 'text-emerald-700', bg: 'bg-emerald-100', icon: CheckCircle2 },
  DELIVERED: { label: 'Delivered', color: 'text-slate-700', bg: 'bg-slate-100', icon: CheckCircle2 },
  CANCELLED: { label: 'Cancelled', color: 'text-rose-700', bg: 'bg-rose-100', icon: XCircle },
};

export default function LensOrdersPage() {
  const qc = useQueryClient();
  const [search, setSearch] = useState('');
  const [statusFilter, setStatusFilter] = useState('all');
  const [pendingPayment, setPendingPayment] = useState(false);
  const [overdue, setOverdue] = useState(false);

  const { data: orders = [], isLoading, refetch, isRefetching } = useQuery({
    queryKey: ['lens-orders-list', statusFilter, pendingPayment, overdue],
    queryFn: () => lensOrdersApi.list({
      status: statusFilter === 'all' ? undefined : statusFilter,
      pendingPayment: pendingPayment ? true : undefined,
      overdue: overdue ? true : undefined,
    }),
  });

  const { data: summary } = useQuery({
    queryKey: ['lens-orders-summary-page'],
    queryFn: () => lensOrdersApi.summary(),
    refetchInterval: 60_000,
  });

  const filtered = useMemo(() => {
    const q = search.toLowerCase().trim();
    if (!q) return orders;
    return orders.filter((o) =>
      o.orderNumber.toLowerCase().includes(q) ||
      o.customerName.toLowerCase().includes(q) ||
      (o.customerPhone || '').includes(q) ||
      o.frameName.toLowerCase().includes(q) ||
      (o.labName || '').toLowerCase().includes(q)
    );
  }, [orders, search]);

  const remove = useMutation({
    mutationFn: (id: string) => lensOrdersApi.remove(id),
    onSuccess: () => {
      toast.success('Order deleted');
      qc.invalidateQueries({ queryKey: ['lens-orders-list'] });
    },
    onError: (e: any) => toast.error(e?.response?.data?.message || 'Delete failed'),
  });

  return (
    <div className="space-y-5">
      <section className="relative overflow-hidden rounded-3xl bg-gradient-to-br from-slate-950 via-violet-900 to-fuchsia-700 text-white p-6 shadow-2xl">
        <div className="absolute -top-20 -right-20 h-64 w-64 rounded-full bg-violet-400/20 blur-3xl" />
        <div className="relative flex items-start justify-between gap-4 flex-wrap">
          <div>
            <div className="inline-flex items-center gap-2 rounded-full bg-white/15 backdrop-blur px-3 py-1 text-xs font-extrabold border border-white/20">
              <FlaskConical className="h-3.5 w-3.5 text-amber-300" /> Lens Orders — Lab Workflow
            </div>
            <h1 className="mt-3 text-3xl sm:text-4xl font-extrabold leading-tight">🔬 Lens Orders</h1>
            <p className="mt-2 text-sm text-white/80">
              {summary?.atLab ?? 0} at lab • {summary?.ready ?? 0} ready • {summary?.overdue ?? 0} overdue
            </p>
          </div>
          <div className="flex gap-2 flex-wrap">
            <button onClick={() => refetch()} disabled={isRefetching}
              className="inline-flex items-center gap-2 rounded-xl bg-white/10 hover:bg-white/20 px-4 py-2.5 text-sm font-bold">
              <RefreshCw className={`h-4 w-4 ${isRefetching ? 'animate-spin' : ''}`} /> Refresh
            </button>
            <Link to="/optical/lens-orders/new">
              <Button className="bg-white text-slate-900 hover:bg-slate-100">
                <Plus className="h-4 w-4" /> New Order
              </Button>
            </Link>
          </div>
        </div>
      </section>

      {summary && (
        <section className="grid grid-cols-2 lg:grid-cols-6 gap-3">
          <StatCard label="Ordered" value={summary.ordered} icon={Clock} tone="slate" onClick={() => setStatusFilter('ORDERED')} />
          <StatCard label="At Lab" value={summary.atLab} icon={FlaskConical} tone="amber" onClick={() => setStatusFilter('AT_LAB')} />
          <StatCard label="Received" value={summary.received} icon={Package} tone="blue" onClick={() => setStatusFilter('RECEIVED')} />
          <StatCard label="Ready" value={summary.ready} icon={CheckCircle2} tone="emerald" onClick={() => setStatusFilter('READY')} />
          <StatCard label="Overdue" value={summary.overdue} icon={AlertTriangle} tone="rose" onClick={() => setOverdue(!overdue)} />
          <StatCard label="Receivable" value={formatPKR(summary.totalReceivable)} icon={DollarSign} tone="violet" onClick={() => setPendingPayment(!pendingPayment)} />
        </section>
      )}

      <section className="rounded-3xl bg-white border-2 border-slate-200 shadow-sm p-4 space-y-3">
        <div className="relative">
          <Search className="h-5 w-5 text-slate-400 absolute left-3.5 top-1/2 -translate-y-1/2" />
          <input value={search} onChange={(e) => setSearch(e.target.value)}
            placeholder="Order #, customer, frame, lab..."
            className="h-12 w-full rounded-2xl border-2 border-slate-200 pl-11 pr-10 text-sm font-semibold focus:outline-none focus:border-violet-500 focus:ring-2 focus:ring-violet-200" />
          {search && (
            <button onClick={() => setSearch('')} className="absolute right-3 top-1/2 -translate-y-1/2 h-7 w-7 rounded-lg hover:bg-slate-100 flex items-center justify-center">
              <X className="h-4 w-4" />
            </button>
          )}
        </div>

        <div className="flex gap-1 bg-slate-100 rounded-xl p-1 overflow-x-auto">
          {['all', 'ORDERED', 'SENT_TO_LAB', 'AT_LAB', 'RECEIVED', 'FITTED', 'READY', 'DELIVERED', 'CANCELLED'].map((v) => (
            <button key={v} onClick={() => setStatusFilter(v)}
              className={`shrink-0 px-3 py-1.5 rounded-lg text-xs font-extrabold ${statusFilter === v ? 'bg-violet-600 text-white shadow-sm' : 'text-slate-600'}`}>
              {v === 'all' ? 'All' : v.replace(/_/g, ' ')}
            </button>
          ))}
        </div>

        <div className="flex gap-2 flex-wrap">
          <button onClick={() => setPendingPayment(!pendingPayment)}
            className={`h-9 px-3 rounded-lg border-2 text-xs font-extrabold inline-flex items-center gap-1.5 ${pendingPayment ? 'border-amber-500 bg-amber-50 text-amber-700' : 'border-slate-200'}`}>
            <DollarSign className="h-3 w-3" /> Pending Payment
          </button>
          <button onClick={() => setOverdue(!overdue)}
            className={`h-9 px-3 rounded-lg border-2 text-xs font-extrabold inline-flex items-center gap-1.5 ${overdue ? 'border-rose-500 bg-rose-50 text-rose-700' : 'border-slate-200'}`}>
            <AlertTriangle className="h-3 w-3" /> Overdue only
          </button>
        </div>
      </section>

      {isLoading ? (
        <div className="grid gap-3">
          {Array.from({ length: 6 }).map((_, i) => <div key={i} className="h-32 rounded-2xl bg-slate-100 animate-pulse" />)}
        </div>
      ) : filtered.length === 0 ? (
        <div className="rounded-3xl bg-white border-2 border-dashed border-slate-300 p-16 text-center">
          <FlaskConical className="h-16 w-16 text-slate-300 mx-auto mb-3" />
          <h3 className="text-lg font-extrabold text-slate-900">No lens orders yet</h3>
          <p className="text-sm text-slate-500 font-semibold mt-1">Create your first order to send to lab</p>
          <Link to="/optical/lens-orders/new">
            <Button className="mt-4 bg-gradient-to-r from-violet-600 to-fuchsia-700">
              <Plus className="h-4 w-4" /> Create First Order
            </Button>
          </Link>
        </div>
      ) : (
        <div className="space-y-3">
          {filtered.map((o) => <OrderCard key={o.id} order={o}
            onDelete={() => { if (confirm(`Delete "${o.orderNumber}"?`)) remove.mutate(o.id); }} />)}
        </div>
      )}
    </div>
  );
}

function OrderCard({ order, onDelete }: any) {
  const meta = STATUS_META[order.status] || STATUS_META.ORDERED;
  const StatusIcon = meta.icon;
  const isOverdue = order.expectedDate && new Date(order.expectedDate) < new Date() && !['DELIVERED', 'CANCELLED'].includes(order.status);

  return (
    <div className={`rounded-2xl bg-white border-2 shadow-sm p-4 hover:shadow-md transition ${isOverdue ? 'border-rose-300' : 'border-slate-200'}`}>
      <div className="flex items-start gap-4 flex-wrap sm:flex-nowrap">
        <div className={`h-14 w-14 rounded-2xl ${meta.bg} flex items-center justify-center shrink-0`}>
          <StatusIcon className={`h-6 w-6 ${meta.color}`} />
        </div>

        <div className="flex-1 min-w-0">
          <div className="flex items-center gap-2 flex-wrap">
            <Link to={`/optical/lens-orders/${order.id}`} className="font-mono font-extrabold text-slate-900 text-sm hover:text-violet-700">
              {order.orderNumber}
            </Link>
            <span className={`px-2 py-0.5 rounded-full text-[9px] font-extrabold uppercase inline-flex items-center gap-1 ${meta.bg} ${meta.color}`}>
              <StatusIcon className="h-2.5 w-2.5" /> {meta.label}
            </span>
            {isOverdue && <span className="px-2 py-0.5 rounded-full bg-rose-500 text-white text-[9px] font-extrabold uppercase">Overdue</span>}
          </div>

          <div className="mt-1 font-extrabold text-slate-900 text-sm truncate">
            {order.frameName} • {order.lensType}
          </div>

          <div className="mt-1 flex items-center gap-3 text-xs text-slate-600 font-bold flex-wrap">
            <span className="inline-flex items-center gap-1"><User className="h-3 w-3" /> {order.customerName}</span>
            <span className="inline-flex items-center gap-1"><Phone className="h-3 w-3" /> {order.customerPhone}</span>
            {order.labName && <span>Lab: {order.labName}</span>}
            {order.labOrderRef && <span className="font-mono">Ref: {order.labOrderRef}</span>}
          </div>

          <div className="mt-2 flex items-center gap-3 text-[10px] text-slate-500 font-bold">
            <span className="inline-flex items-center gap-0.5">
              <Calendar className="h-2.5 w-2.5" />
              Ordered {new Date(order.orderedAt).toLocaleDateString('en-PK', { day: 'numeric', month: 'short' })}
            </span>
            {order.expectedDate && (
              <span className={`inline-flex items-center gap-0.5 ${isOverdue ? 'text-rose-700' : ''}`}>
                Expected {new Date(order.expectedDate).toLocaleDateString('en-PK', { day: 'numeric', month: 'short' })}
              </span>
            )}
          </div>
        </div>

        <div className="text-right shrink-0">
          <div className="text-[10px] uppercase font-extrabold text-slate-500">Total</div>
          <div className="text-lg font-extrabold text-emerald-700 tabular-nums">{formatPKR(order.totalPrice)}</div>
          {order.remainingAmount > 0 && (
            <div className="text-[10px] font-bold text-rose-700 mt-0.5">Due {formatPKR(order.remainingAmount)}</div>
          )}
          <div className="mt-2 flex gap-1 justify-end">
            <Link to={`/optical/lens-orders/${order.id}`}
              className="h-9 w-9 rounded-lg bg-violet-50 hover:bg-violet-100 text-violet-700 flex items-center justify-center">
              <Eye className="h-4 w-4" />
            </Link>
            {!['FITTED', 'DELIVERED'].includes(order.status) && (
              <button onClick={onDelete}
                className="h-9 w-9 rounded-lg bg-rose-50 hover:bg-rose-100 text-rose-600 flex items-center justify-center">
                <Trash2 className="h-4 w-4" />
              </button>
            )}
          </div>
        </div>
      </div>
    </div>
  );
}

function StatCard({ label, value, icon: Icon, tone, onClick }: any) {
  const tones: Record<string, string> = {
    slate: 'from-slate-500 to-slate-700', amber: 'from-amber-500 to-orange-600',
    blue: 'from-blue-500 to-cyan-700', emerald: 'from-emerald-500 to-teal-700',
    rose: 'from-rose-500 to-red-700', violet: 'from-violet-500 to-fuchsia-700',
  };
  const C: any = onClick ? 'button' : 'div';
  return (
    <C onClick={onClick}
      className={`rounded-2xl bg-white border-2 border-slate-200 p-4 shadow-sm text-left w-full ${onClick ? 'hover:border-violet-300 hover:shadow-md transition' : ''}`}>
      <div className="flex items-center justify-between gap-2">
        <div className="min-w-0">
          <div className="text-[10px] uppercase font-extrabold text-slate-500">{label}</div>
          <div className="text-xl font-extrabold text-slate-900 tabular-nums mt-1 truncate">{value}</div>
        </div>
        <div className={`h-10 w-10 rounded-xl bg-gradient-to-br ${tones[tone]} text-white flex items-center justify-center shadow-md shrink-0`}>
          <Icon className="h-4 w-4" />
        </div>
      </div>
    </C>
  );
}
