import { useState, useMemo } from 'react';
import { Link } from 'react-router-dom';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import {
  ClipboardList, Plus, Search, X, RefreshCw, Clock, CheckCircle2,
  XCircle, AlertTriangle, User, Phone, Calendar, DollarSign,
  ArrowRight, Hammer, Truck, Percent,
} from 'lucide-react';
import { toast } from 'sonner';
import { customOrdersApi, type FurnitureOrderStatus } from '../api/custom-orders.api';
import { formatPKR } from '@core/lib/format';
import { Button } from '@core/ui/Button';

const STATUS_META: Record<FurnitureOrderStatus, { label: string; color: string; bg: string; icon: any }> = {
  QUOTATION: { label: 'Quotation', color: 'text-slate-700', bg: 'bg-slate-100', icon: ClipboardList },
  DEPOSIT_PAID: { label: 'Deposit Paid', color: 'text-blue-700', bg: 'bg-blue-100', icon: DollarSign },
  IN_PRODUCTION: { label: 'In Production', color: 'text-amber-700', bg: 'bg-amber-100', icon: Hammer },
  READY_FOR_DELIVERY: { label: 'Ready', color: 'text-violet-700', bg: 'bg-violet-100', icon: CheckCircle2 },
  OUT_FOR_DELIVERY: { label: 'Out for Delivery', color: 'text-cyan-700', bg: 'bg-cyan-100', icon: Truck },
  DELIVERED: { label: 'Delivered', color: 'text-emerald-700', bg: 'bg-emerald-100', icon: CheckCircle2 },
  ASSEMBLED: { label: 'Assembled', color: 'text-teal-700', bg: 'bg-teal-100', icon: Hammer },
  COMPLETED: { label: 'Completed', color: 'text-green-700', bg: 'bg-green-100', icon: CheckCircle2 },
  CANCELLED: { label: 'Cancelled', color: 'text-slate-700', bg: 'bg-slate-100', icon: XCircle },
  REFUNDED: { label: 'Refunded', color: 'text-rose-700', bg: 'bg-rose-100', icon: XCircle },
};

export default function CustomOrdersPage() {
  const qc = useQueryClient();
  const [search, setSearch] = useState('');
  const [statusFilter, setStatusFilter] = useState('all');

  const { data: orders = [], isLoading, refetch, isRefetching } = useQuery({
    queryKey: ['custom-orders-list', statusFilter],
    queryFn: () => customOrdersApi.list({ status: statusFilter === 'all' ? undefined : statusFilter }),
  });

  const { data: summary } = useQuery({
    queryKey: ['custom-orders-summary'],
    queryFn: () => customOrdersApi.summary(),
    refetchInterval: 60_000,
  });

  const filtered = useMemo(() => {
    const q = search.toLowerCase().trim();
    if (!q) return orders;
    return orders.filter((o) =>
      o.orderNumber.toLowerCase().includes(q) ||
      o.customerName.toLowerCase().includes(q) ||
      o.productType.toLowerCase().includes(q) ||
      (o.customerPhone || '').includes(q)
    );
  }, [orders, search]);

  return (
    <div className="space-y-5">
      <section className="relative overflow-hidden rounded-3xl bg-gradient-to-br from-slate-950 via-violet-900 to-purple-800 text-white p-6 shadow-2xl">
        <div className="absolute -top-20 -right-20 h-64 w-64 rounded-full bg-violet-400/20 blur-3xl" />
        <div className="relative flex items-start justify-between gap-4 flex-wrap">
          <div>
            <div className="inline-flex items-center gap-2 rounded-full bg-white/15 backdrop-blur px-3 py-1 text-xs font-extrabold border border-white/20">
              <ClipboardList className="h-3.5 w-3.5 text-amber-300" /> Custom Furniture Orders
            </div>
            <h1 className="mt-3 text-3xl sm:text-4xl font-extrabold leading-tight">📋 Custom Orders</h1>
            <p className="mt-2 text-sm text-white/80">
              {summary?.quotation ?? 0} quotations • {summary?.production ?? 0} in production • Receivable{' '}
              <strong className="text-emerald-300">{formatPKR(summary?.totalReceivable || 0)}</strong>
            </p>
          </div>
          <div className="flex gap-2 flex-wrap">
            <button onClick={() => refetch()} disabled={isRefetching}
              className="inline-flex items-center gap-2 rounded-xl bg-white/10 hover:bg-white/20 px-4 py-2.5 text-sm font-bold">
              <RefreshCw className={`h-4 w-4 ${isRefetching ? 'animate-spin' : ''}`} /> Refresh
            </button>
            <Link to="/furniture/custom-orders/new">
              <Button className="bg-white text-slate-900 hover:bg-slate-100">
                <Plus className="h-4 w-4" /> New Order
              </Button>
            </Link>
          </div>
        </div>
      </section>

      {summary && (
        <section className="grid grid-cols-2 lg:grid-cols-4 gap-3">
          <StatCard label="Quotation" value={summary.quotation} icon={ClipboardList} tone="slate" onClick={() => setStatusFilter('QUOTATION')} />
          <StatCard label="In Production" value={summary.production} icon={Hammer} tone="amber" onClick={() => setStatusFilter('IN_PRODUCTION')} />
          <StatCard label="Ready" value={summary.ready} icon={CheckCircle2} tone="violet" onClick={() => setStatusFilter('READY_FOR_DELIVERY')} />
          <StatCard label="Collected" value={formatPKR(summary.totalCollected)} icon={DollarSign} tone="emerald" />
        </section>
      )}

      <section className="rounded-3xl bg-white border-2 border-slate-200 shadow-sm p-4 space-y-3">
        <div className="relative">
          <Search className="h-5 w-5 text-slate-400 absolute left-3.5 top-1/2 -translate-y-1/2" />
          <input value={search} onChange={(e) => setSearch(e.target.value)}
            placeholder="Order #, customer, product, phone..."
            className="h-12 w-full rounded-2xl border-2 border-slate-200 bg-white pl-11 pr-10 text-sm font-semibold focus:outline-none focus:border-violet-500 focus:ring-2 focus:ring-violet-200" />
          {search && (
            <button onClick={() => setSearch('')} className="absolute right-3 top-1/2 -translate-y-1/2 h-7 w-7 rounded-lg hover:bg-slate-100 flex items-center justify-center">
              <X className="h-4 w-4" />
            </button>
          )}
        </div>
        <div className="flex gap-1 bg-slate-100 rounded-xl p-1 overflow-x-auto">
          {['all', 'QUOTATION', 'DEPOSIT_PAID', 'IN_PRODUCTION', 'READY_FOR_DELIVERY', 'DELIVERED', 'COMPLETED', 'CANCELLED'].map((v) => (
            <button key={v} onClick={() => setStatusFilter(v)}
              className={`shrink-0 px-3 py-1.5 rounded-lg text-xs font-extrabold transition ${
                statusFilter === v ? 'bg-violet-600 text-white shadow-sm' : 'text-slate-600'}`}>
              {v === 'all' ? 'All' : v.replace(/_/g, ' ')}
            </button>
          ))}
        </div>
      </section>

      {isLoading ? (
        <div className="space-y-2">{Array.from({ length: 4 }).map((_, i) => <div key={i} className="h-32 rounded-2xl bg-slate-100 animate-pulse" />)}</div>
      ) : filtered.length === 0 ? (
        <div className="rounded-3xl bg-white border-2 border-dashed border-slate-300 p-16 text-center">
          <ClipboardList className="h-16 w-16 text-slate-300 mx-auto mb-3" />
          <h3 className="text-lg font-extrabold text-slate-900">{statusFilter === 'all' ? 'No custom orders yet' : 'No orders match filter'}</h3>
          <p className="text-sm text-slate-500 font-semibold mt-1">Create your first custom furniture order</p>
          <Link to="/furniture/custom-orders/new">
            <Button className="mt-4 bg-gradient-to-r from-violet-600 to-purple-800"><Plus className="h-4 w-4" /> Create First Order</Button>
          </Link>
        </div>
      ) : (
        <div className="space-y-3">
          {filtered.map((o) => <OrderCard key={o.id} order={o} />)}
        </div>
      )}
    </div>
  );
}

function OrderCard({ order: o }: any) {
  const meta = STATUS_META[o.status as FurnitureOrderStatus];
  const StatusIcon = meta.icon;
  const isOverdue = o.expectedDeliveryDate && new Date(o.expectedDeliveryDate) < new Date() && !['DELIVERED', 'COMPLETED', 'CANCELLED', 'REFUNDED'].includes(o.status);
  const daysLeft = o.expectedDeliveryDate ? Math.ceil((new Date(o.expectedDeliveryDate).getTime() - Date.now()) / 86400000) : null;

  return (
    <Link to={`/furniture/custom-orders/${o.id}`}
      className={`block rounded-2xl bg-white border-2 shadow-sm hover:shadow-md transition ${isOverdue ? 'border-rose-300' : 'border-slate-200'}`}>
      <div className="p-4">
        <div className="flex items-start gap-4 flex-wrap sm:flex-nowrap">
          <div className={`h-14 w-14 rounded-2xl ${meta.bg} flex items-center justify-center shrink-0`}>
            <StatusIcon className={`h-6 w-6 ${meta.color}`} />
          </div>
          <div className="flex-1 min-w-0">
            <div className="flex items-center gap-2 flex-wrap">
              <span className="font-mono font-extrabold text-slate-900 text-sm">{o.orderNumber}</span>
              <span className={`px-2 py-0.5 rounded-full text-[9px] font-extrabold uppercase inline-flex items-center gap-1 ${meta.bg} ${meta.color}`}>
                <StatusIcon className="h-2.5 w-2.5" /> {meta.label}
              </span>
              {isOverdue && (
                <span className="px-2 py-0.5 rounded-full bg-rose-500 text-white text-[9px] font-extrabold">OVERDUE</span>
              )}
              {o.progressPct > 0 && o.progressPct < 100 && (
                <span className="px-2 py-0.5 rounded-full bg-amber-100 text-amber-700 text-[9px] font-extrabold">
                  {o.progressPct}% complete
                </span>
              )}
            </div>
            <div className="mt-1 font-extrabold text-slate-900 text-base truncate">{o.productType}</div>
            <div className="flex items-center gap-3 mt-2 text-xs text-slate-600 font-bold flex-wrap">
              <span className="inline-flex items-center gap-1"><User className="h-3 w-3" /> {o.customerName}</span>
              {o.customerPhone && <span className="inline-flex items-center gap-1"><Phone className="h-3 w-3" /> {o.customerPhone}</span>}
              {o.carpenterName && <span className="inline-flex items-center gap-1"><Hammer className="h-3 w-3" /> {o.carpenterName}</span>}
            </div>
            <div className="flex items-center gap-3 mt-1 text-[10px] text-slate-500 font-bold">
              {o.expectedDeliveryDate && (
                <span className="inline-flex items-center gap-0.5">
                  <Calendar className="h-2.5 w-2.5" />
                  Due {new Date(o.expectedDeliveryDate).toLocaleDateString('en-PK', { day: 'numeric', month: 'short', year: 'numeric' })}
                  {daysLeft !== null && daysLeft > 0 && ` (${daysLeft}d)`}
                </span>
              )}
              <span>{o.estimatedDays} days est.</span>
            </div>
          </div>
          <div className="text-right shrink-0">
            <div className="text-[10px] uppercase font-extrabold text-slate-500">Total</div>
            <div className="text-lg font-extrabold text-emerald-700 tabular-nums">{formatPKR(o.finalPrice ?? o.quotedPrice)}</div>
            {o.balanceAmount > 0 && (
              <div className="text-[10px] font-bold text-rose-700 mt-0.5">
                Balance {formatPKR(o.balanceAmount)}
              </div>
            )}
            {o.depositPaid && o.balanceAmount > 0 && (
              <div className="text-[10px] font-bold text-emerald-700 mt-0.5">
                Deposit ✓
              </div>
            )}
          </div>
          <ArrowRight className="h-4 w-4 text-slate-400 self-center shrink-0" />
        </div>

        {o.progressPct > 0 && (
          <div className="mt-3 pt-3 border-t border-slate-100">
            <div className="h-2 rounded-full bg-slate-200 overflow-hidden">
              <div className="h-full bg-gradient-to-r from-violet-500 to-purple-700 transition-all"
                style={{ width: `${o.progressPct}%` }} />
            </div>
          </div>
        )}
      </div>
    </Link>
  );
}

function StatCard({ label, value, icon: Icon, tone, onClick }: any) {
  const tones: Record<string, string> = {
    slate: 'from-slate-500 to-slate-700', amber: 'from-amber-500 to-orange-700',
    violet: 'from-violet-500 to-purple-700', emerald: 'from-emerald-500 to-emerald-700',
  };
  const C: any = onClick ? 'button' : 'div';
  return (
    <C onClick={onClick} className={`rounded-2xl bg-white border-2 border-slate-200 p-4 shadow-sm text-left w-full ${onClick ? 'hover:border-violet-300 hover:shadow-md transition' : ''}`}>
      <div className="flex items-center justify-between gap-2">
        <div>
          <div className="text-[10px] uppercase font-extrabold text-slate-500">{label}</div>
          <div className="text-2xl font-extrabold text-slate-900 tabular-nums mt-1">{value}</div>
        </div>
        <div className={`h-10 w-10 rounded-xl bg-gradient-to-br ${tones[tone]} text-white flex items-center justify-center shadow-md`}>
          <Icon className="h-4 w-4" />
        </div>
      </div>
    </C>
  );
}
