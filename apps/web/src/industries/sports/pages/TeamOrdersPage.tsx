import { useState, useMemo } from 'react';
import { Link } from 'react-router-dom';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import {
  Users, Plus, Search, X, Clock, CheckCircle2, XCircle,
  RefreshCw, Calendar, Phone, DollarSign, TrendingUp,
  Edit3, Trash2, Eye, Package, Trophy, Truck, Building,
  Sparkles,
} from 'lucide-react';
import { toast } from 'sonner';
import { teamOrdersApi, type TeamOrderStatus } from '../api/team-orders.api';
import { formatPKR } from '@core/lib/format';
import { Button } from '@core/ui/Button';

const STATUS_META: Record<TeamOrderStatus, { label: string; color: string; bg: string; icon: any }> = {
  DRAFT: { label: 'Draft', color: 'text-slate-700', bg: 'bg-slate-100', icon: Edit3 },
  QUOTED: { label: 'Quoted', color: 'text-blue-700', bg: 'bg-blue-100', icon: DollarSign },
  CONFIRMED: { label: 'Confirmed', color: 'text-violet-700', bg: 'bg-violet-100', icon: CheckCircle2 },
  IN_PRODUCTION: { label: 'In Production', color: 'text-amber-700', bg: 'bg-amber-100', icon: Package },
  READY: { label: 'Ready', color: 'text-emerald-700', bg: 'bg-emerald-100', icon: Trophy },
  DELIVERED: { label: 'Delivered', color: 'text-teal-700', bg: 'bg-teal-100', icon: Truck },
  CANCELLED: { label: 'Cancelled', color: 'text-rose-700', bg: 'bg-rose-100', icon: XCircle },
};

export default function TeamOrdersPage() {
  const qc = useQueryClient();
  const [search, setSearch] = useState('');
  const [statusFilter, setStatusFilter] = useState('all');
  const [customJerseysOnly, setCustomJerseysOnly] = useState(false);

  const { data: orders = [], isLoading, refetch, isRefetching } = useQuery({
    queryKey: ['team-orders-list', statusFilter, customJerseysOnly],
    queryFn: () => teamOrdersApi.list({
      status: statusFilter === 'all' ? undefined : statusFilter,
      hasCustomJerseys: customJerseysOnly ? true : undefined,
    }),
  });

  const { data: summary } = useQuery({
    queryKey: ['team-orders-summary'],
    queryFn: () => teamOrdersApi.summary(),
    refetchInterval: 60_000,
  });

  const filtered = useMemo(() => {
    const q = search.toLowerCase().trim();
    if (!q) return orders;
    return orders.filter((o) =>
      o.orderNumber.toLowerCase().includes(q) ||
      o.teamName.toLowerCase().includes(q) ||
      o.contactPerson.toLowerCase().includes(q) ||
      (o.contactPhone || '').includes(q) ||
      (o.organization || '').toLowerCase().includes(q)
    );
  }, [orders, search]);

  const remove = useMutation({
    mutationFn: (id: string) => teamOrdersApi.remove(id),
    onSuccess: () => {
      toast.success('Order deleted');
      qc.invalidateQueries({ queryKey: ['team-orders-list'] });
    },
    onError: (e: any) => toast.error(e?.response?.data?.message || 'Delete failed'),
  });

  return (
    <div className="space-y-5">
      <section className="relative overflow-hidden rounded-3xl bg-gradient-to-br from-slate-950 via-emerald-900 to-teal-700 text-white p-6 shadow-2xl">
        <div className="absolute -top-20 -right-20 h-64 w-64 rounded-full bg-emerald-400/20 blur-3xl" />
        <div className="relative flex items-start justify-between gap-4 flex-wrap">
          <div>
            <div className="inline-flex items-center gap-2 rounded-full bg-white/15 backdrop-blur px-3 py-1 text-xs font-extrabold border border-white/20">
              <Users className="h-3.5 w-3.5 text-amber-300" /> Team Orders
            </div>
            <h1 className="mt-3 text-3xl sm:text-4xl font-extrabold leading-tight">👥 Team Orders</h1>
            <p className="mt-2 text-sm text-white/80">
              {summary?.totalOrders ?? 0} total • Revenue{' '}
              <strong className="text-emerald-300">{formatPKR(summary?.totalRevenue || 0)}</strong>
              {' • '}Pending <strong className="text-amber-300">{formatPKR(summary?.totalPending || 0)}</strong>
            </p>
          </div>
          <div className="flex gap-2 flex-wrap">
            <button onClick={() => refetch()} disabled={isRefetching}
              className="inline-flex items-center gap-2 rounded-xl bg-white/10 hover:bg-white/20 px-4 py-2.5 text-sm font-bold">
              <RefreshCw className={`h-4 w-4 ${isRefetching ? 'animate-spin' : ''}`} /> Refresh
            </button>
            <Link to="/sports/team-orders/new">
              <Button className="bg-white text-slate-900 hover:bg-slate-100">
                <Plus className="h-4 w-4" /> New Team Order
              </Button>
            </Link>
          </div>
        </div>
      </section>

      {summary && (
        <section className="grid grid-cols-2 lg:grid-cols-4 gap-3">
          <StatCard label="Draft/Quoted" value={(summary.counts?.draft || 0) + (summary.counts?.quoted || 0)} icon={Edit3} tone="blue" onClick={() => setStatusFilter('DRAFT')} />
          <StatCard label="In Production" value={summary.counts?.inProduction || 0} icon={Package} tone="amber" onClick={() => setStatusFilter('IN_PRODUCTION')} />
          <StatCard label="Ready" value={summary.counts?.ready || 0} icon={Trophy} tone="emerald" onClick={() => setStatusFilter('READY')} />
          <StatCard label="Collected" value={formatPKR(summary.totalCollected || 0)} icon={DollarSign} tone="violet" />
        </section>
      )}

      <section className="rounded-3xl bg-white border-2 border-slate-200 shadow-sm p-4 space-y-3">
        <div className="relative">
          <Search className="h-5 w-5 text-slate-400 absolute left-3.5 top-1/2 -translate-y-1/2" />
          <input value={search} onChange={(e) => setSearch(e.target.value)}
            placeholder="Order #, team, contact, organization..."
            className="h-12 w-full rounded-2xl border-2 border-slate-200 bg-white pl-11 pr-10 text-sm font-semibold focus:outline-none focus:border-emerald-500 focus:ring-2 focus:ring-emerald-200" />
          {search && (
            <button onClick={() => setSearch('')} className="absolute right-3 top-1/2 -translate-y-1/2 h-7 w-7 rounded-lg hover:bg-slate-100 flex items-center justify-center">
              <X className="h-4 w-4" />
            </button>
          )}
        </div>

        <div className="flex gap-2 flex-wrap items-center">
          <div className="flex gap-1 bg-slate-100 rounded-xl p-1 overflow-x-auto">
            {['all', 'DRAFT', 'QUOTED', 'CONFIRMED', 'IN_PRODUCTION', 'READY', 'DELIVERED'].map((v) => (
              <button key={v} onClick={() => setStatusFilter(v)}
                className={`shrink-0 px-3 py-1.5 rounded-lg text-xs font-extrabold transition ${
                  statusFilter === v ? 'bg-emerald-600 text-white shadow-sm' : 'text-slate-600 hover:text-slate-900'}`}>
                {v === 'all' ? 'All' : STATUS_META[v as TeamOrderStatus]?.label || v}
              </button>
            ))}
          </div>
          <button onClick={() => setCustomJerseysOnly(!customJerseysOnly)}
            className={`h-9 px-3 rounded-xl border-2 text-xs font-extrabold inline-flex items-center gap-1.5 ${customJerseysOnly ? 'border-violet-500 bg-violet-50 text-violet-700' : 'border-slate-200 text-slate-700'}`}>
            <Sparkles className="h-3.5 w-3.5" /> Custom Jerseys
          </button>
          <div className="ml-auto text-xs font-extrabold text-slate-500">{filtered.length} orders</div>
        </div>
      </section>

      {isLoading ? (
        <div className="space-y-2">
          {Array.from({ length: 4 }).map((_, i) => <div key={i} className="h-32 rounded-2xl bg-slate-100 animate-pulse" />)}
        </div>
      ) : filtered.length === 0 ? (
        <div className="rounded-3xl bg-white border-2 border-dashed border-slate-300 p-16 text-center">
          <Users className="h-16 w-16 text-slate-300 mx-auto mb-3" />
          <h3 className="text-lg font-extrabold text-slate-900">No team orders yet</h3>
          <p className="text-sm text-slate-500 font-semibold mt-1">Create first order for schools, clubs, corporates</p>
          <Link to="/sports/team-orders/new">
            <Button className="mt-4 bg-gradient-to-r from-emerald-600 to-teal-700">
              <Plus className="h-4 w-4" /> Create First Order
            </Button>
          </Link>
        </div>
      ) : (
        <div className="space-y-3">
          {filtered.map((o) => (
            <OrderCard key={o.id} order={o}
              onDelete={() => { if (confirm(`Delete "${o.orderNumber}"?`)) remove.mutate(o.id); }} />
          ))}
        </div>
      )}
    </div>
  );
}

function OrderCard({ order: o, onDelete }: any) {
  const meta = STATUS_META[o.status as TeamOrderStatus];
  const StatusIcon = meta.icon;

  return (
    <div className={`rounded-2xl bg-white border-2 shadow-sm p-4 hover:shadow-md transition ${
      o.status === 'READY' ? 'border-emerald-300' :
      o.status === 'IN_PRODUCTION' ? 'border-amber-300' :
      'border-slate-200'}`}>
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
            {o.hasCustomJerseys && (
              <span className="px-2 py-0.5 rounded-full bg-violet-100 text-violet-700 text-[9px] font-extrabold uppercase inline-flex items-center gap-0.5">
                <Sparkles className="h-2.5 w-2.5" /> Custom Jerseys
              </span>
            )}
          </div>

          <div className="mt-1 font-extrabold text-slate-900 text-lg truncate">{o.teamName}</div>

          <div className="flex items-center gap-3 mt-2 text-xs text-slate-600 font-bold flex-wrap">
            <span className="inline-flex items-center gap-1"><User2Icon /> {o.contactPerson}</span>
            {o.contactPhone && <span className="inline-flex items-center gap-1"><Phone className="h-3 w-3" /> {o.contactPhone}</span>}
            {o.organization && <span className="inline-flex items-center gap-1"><Building className="h-3 w-3" /> {o.organization}</span>}
          </div>

          <div className="flex items-center gap-3 mt-1 text-[10px] text-slate-500 font-bold">
            <span>{o.totalQuantity} pcs</span>
            <span className="text-slate-300">•</span>
            <span>{o.items?.length || 0} items</span>
            {o.expectedDeliveryDate && (
              <>
                <span className="text-slate-300">•</span>
                <span className="inline-flex items-center gap-0.5">
                  <Calendar className="h-2.5 w-2.5" />
                  Expected: {new Date(o.expectedDeliveryDate).toLocaleDateString('en-PK', { day: 'numeric', month: 'short' })}
                </span>
              </>
            )}
          </div>
        </div>

        <div className="text-right shrink-0">
          <div className="text-[10px] uppercase font-extrabold text-slate-500">Total</div>
          <div className="text-lg font-extrabold text-emerald-700 tabular-nums">{formatPKR(o.totalAmount)}</div>
          <div className="text-[10px] font-bold text-slate-500 mt-0.5">
            Paid: <span className="text-emerald-700">{formatPKR(o.advancePaid)}</span>
          </div>
          {o.balanceAmount > 0 && (
            <div className="text-[10px] font-extrabold text-rose-700 mt-0.5">
              Balance: {formatPKR(o.balanceAmount)}
            </div>
          )}
          <div className="mt-2 flex gap-1 justify-end">
            <Link to={`/sports/team-orders/${o.id}/edit`}
              className="h-9 px-3 rounded-lg bg-emerald-50 hover:bg-emerald-100 text-emerald-700 text-xs font-extrabold inline-flex items-center gap-1">
              <Edit3 className="h-3.5 w-3.5" /> Manage
            </Link>
            <button onClick={onDelete}
              className="h-9 w-9 rounded-lg bg-rose-50 hover:bg-rose-100 text-rose-600 flex items-center justify-center">
              <Trash2 className="h-3.5 w-3.5" />
            </button>
          </div>
        </div>
      </div>
    </div>
  );
}

function User2Icon() {
  return (
    <svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" className="h-3 w-3">
      <path d="M14 19a6 6 0 0 0-12 0"/>
      <circle cx="8" cy="9" r="4"/>
      <path d="M22 19a6 6 0 0 0-6-6 4 4 0 1 0 0-8"/>
    </svg>
  );
}

function StatCard({ label, value, icon: Icon, tone, onClick }: any) {
  const tones: Record<string, string> = {
    blue: 'from-blue-500 to-blue-700', amber: 'from-amber-500 to-orange-600',
    emerald: 'from-emerald-500 to-emerald-700', violet: 'from-violet-500 to-fuchsia-700',
  };
  const C: any = onClick ? 'button' : 'div';
  return (
    <C onClick={onClick} className={`rounded-2xl bg-white border-2 border-slate-200 p-4 shadow-sm text-left w-full ${onClick ? 'hover:border-emerald-300 hover:shadow-md transition' : ''}`}>
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
