import { useState } from 'react';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { Link } from 'react-router-dom';
import {
  Gem, Plus, Search, RefreshCw, Sparkles, User, Phone, CheckCircle2,
  DollarSign, Scale, ShieldCheck, ArrowRight, Repeat, X, Ban,
} from 'lucide-react';
import { jewelrySalesApi, type JewelryOrderStatus } from '../api/sales.api';
import { formatPKR } from '@/lib/format';
import { Button } from '@/components/ui/Button';
import { toast } from 'sonner';
import { format } from 'date-fns';

const STATUS_CONFIG: Record<string, { label: string; color: string }> = {
  DRAFT: { label: 'Draft', color: 'bg-slate-500' },
  QUOTED: { label: 'Quoted', color: 'bg-blue-500' },
  CONFIRMED: { label: 'Confirmed', color: 'bg-cyan-500' },
  DELIVERED: { label: 'Delivered', color: 'bg-emerald-600' },
  CANCELLED: { label: 'Cancelled', color: 'bg-rose-500' },
  ON_HOLD: { label: 'On Hold', color: 'bg-amber-500' },
};

export default function SalesPage() {
  const queryClient = useQueryClient();
  const [search, setSearch] = useState('');
  const [statusFilter, setStatusFilter] = useState<string>('all');

  const { data: sales = [], isLoading, refetch, isRefetching } = useQuery({
    queryKey: ['jewelry-sales', statusFilter, search],
    queryFn: () => jewelrySalesApi.list({
      status: statusFilter === 'all' ? undefined : statusFilter,
      search: search.trim() || undefined,
    }),
    refetchInterval: 60_000,
  });

  const returnMutation = useMutation({
    mutationFn: ({ id, reason }: { id: string; reason: string }) => jewelrySalesApi.markReturned(id, reason),
    onSuccess: () => { toast.success('Marked as returned'); queryClient.invalidateQueries({ queryKey: ['jewelry-sales'] }); },
  });

  const stats = {
    total: sales.length,
    delivered: sales.filter((s) => s.status === 'DELIVERED').length,
    weight: sales.reduce((s, sale) => s + (sale.netWeight || 0), 0),
    revenue: sales.filter((s) => s.status === 'DELIVERED').reduce((s, sale) => s + sale.total, 0),
  };

  return (
    <div className="space-y-6">
      <section className="relative overflow-hidden rounded-3xl bg-gradient-to-br from-slate-950 via-amber-900 to-yellow-700 text-white p-6 sm:p-8 shadow-2xl">
        <div className="absolute -top-20 -right-20 h-72 w-72 rounded-full bg-amber-400/20 blur-3xl" />
        <div className="relative flex flex-col lg:flex-row lg:items-center lg:justify-between gap-5">
          <div>
            <div className="inline-flex items-center gap-2 rounded-full bg-white/15 backdrop-blur px-3 py-1 text-xs font-extrabold border border-white/20">
              <Sparkles className="h-3.5 w-3.5 text-amber-300" />
              Sales Records
            </div>
            <h1 className="mt-3 text-3xl sm:text-4xl font-extrabold leading-tight">💎 Jewelry Sales</h1>
            <p className="mt-2 text-sm text-white/80 font-semibold">Invoices, weight tracking, exchange records</p>
          </div>
          <div className="flex items-center gap-2 flex-wrap">
            <button onClick={() => refetch()} disabled={isRefetching} className="inline-flex items-center gap-2 rounded-xl bg-white/15 hover:bg-white/25 px-4 py-2.5 text-sm font-bold backdrop-blur border border-white/20">
              <RefreshCw className={'h-4 w-4 ' + (isRefetching ? 'animate-spin' : '')} />
              Refresh
            </button>
            <Link to="/jewelry/sales/new">
              <Button className="bg-white text-slate-900 hover:bg-slate-100">
                <Plus className="h-4 w-4" />
                New Sale
              </Button>
            </Link>
          </div>
        </div>
      </section>

      <section className="grid grid-cols-2 lg:grid-cols-4 gap-4">
        <StatCard label="Total Sales" value={stats.total} icon={Gem} color="amber" />
        <StatCard label="Delivered" value={stats.delivered} icon={CheckCircle2} color="emerald" />
        <StatCard label="Weight Sold" value={stats.weight.toFixed(2) + 'g'} icon={Scale} color="yellow" />
        <StatCard label="Revenue" value={formatPKR(stats.revenue)} icon={DollarSign} color="rose" />
      </section>

      <section className="rounded-3xl bg-white dark:bg-neutral-900 border border-slate-200 dark:border-neutral-800 shadow-sm p-4 space-y-3">
        <div className="relative">
          <Search className="h-4 w-4 text-slate-400 absolute left-3.5 top-1/2 -translate-y-1/2" />
          <input value={search} onChange={(e) => setSearch(e.target.value)} placeholder="Search invoice, customer name, phone, CNIC..." className="h-11 w-full rounded-xl border-2 border-slate-200 dark:border-neutral-700 bg-white dark:bg-neutral-800 pl-10 pr-3 text-sm font-semibold focus:outline-none focus:border-amber-500" />
        </div>
        <div className="flex gap-1.5 overflow-x-auto pb-1">
          {[{ v: 'all', label: 'All' }, ...Object.entries(STATUS_CONFIG).map(([k, v]) => ({ v: k, label: v.label }))].map((s) => (
            <button key={s.v} onClick={() => setStatusFilter(s.v)} className={
              'shrink-0 px-3 py-1.5 rounded-lg text-xs font-extrabold ' +
              (statusFilter === s.v ? 'bg-amber-600 text-white shadow' : 'bg-slate-100 dark:bg-neutral-800 text-slate-700')
            }>{s.label}</button>
          ))}
        </div>
      </section>

      {isLoading ? (
        <div className="grid gap-3">{[1, 2, 3].map((i) => <div key={i} className="h-40 rounded-2xl bg-slate-100 dark:bg-neutral-800 animate-pulse" />)}</div>
      ) : sales.length === 0 ? (
        <div className="rounded-3xl bg-white dark:bg-neutral-900 border-2 border-dashed border-slate-200 dark:border-neutral-800 p-12 text-center">
          <Gem className="h-16 w-16 text-slate-400 mx-auto mb-3" />
          <p className="font-extrabold text-slate-700">No sales yet</p>
          <Link to="/jewelry/sales/new">
            <Button className="mt-4 bg-gradient-to-r from-amber-600 to-yellow-700">
              <Plus className="h-4 w-4" />
              Create First Sale
            </Button>
          </Link>
        </div>
      ) : (
        <section className="grid gap-3">
          {sales.map((sale) => {
            const cfg = STATUS_CONFIG[sale.status] ?? STATUS_CONFIG.CONFIRMED;
            const remaining = sale.total - sale.paidAmount;
            return (
              <Link key={sale.id} to={'/jewelry/sales/' + sale.id} className="block rounded-2xl bg-white dark:bg-neutral-900 border-2 border-slate-200 dark:border-neutral-800 shadow-sm hover:shadow-lg hover:border-amber-300 transition p-4">
                <div className="flex items-start justify-between gap-3 flex-wrap">
                  <div className="flex items-start gap-3 min-w-0 flex-1">
                    <div className="h-12 w-12 rounded-2xl bg-gradient-to-br from-amber-500 to-yellow-600 text-white flex items-center justify-center shadow shrink-0 text-xl">
                      💎
                    </div>
                    <div className="min-w-0 flex-1">
                      <div className="flex items-center gap-2 flex-wrap">
                        <span className="font-extrabold text-slate-900 dark:text-white">{sale.invoiceNumber}</span>
                        <span className={'px-2 py-0.5 rounded-full text-[9px] font-extrabold uppercase text-white ' + cfg.color}>{cfg.label}</span>
                        {sale.paymentStatus === 'PAID' && <span className="px-2 py-0.5 rounded bg-emerald-100 text-emerald-700 text-[9px] font-extrabold uppercase">PAID</span>}
                        {sale.hallmarkVerified && <span className="px-2 py-0.5 rounded bg-emerald-100 text-emerald-700 text-[9px] font-extrabold uppercase inline-flex items-center gap-0.5"><ShieldCheck className="h-2 w-2" /> HALLMARK</span>}
                        {sale.isExchanged && <span className="px-2 py-0.5 rounded bg-violet-100 text-violet-700 text-[9px] font-extrabold uppercase inline-flex items-center gap-0.5"><Repeat className="h-2 w-2" /> EXCHANGED</span>}
                        {sale.isReturned && <span className="px-2 py-0.5 rounded bg-rose-100 text-rose-700 text-[9px] font-extrabold uppercase">RETURNED</span>}
                      </div>
                      <div className="mt-1 flex items-center gap-3 text-xs text-slate-600 font-semibold flex-wrap">
                        {sale.customerName && <span className="inline-flex items-center gap-1"><User className="h-3 w-3" />{sale.customerName}</span>}
                        {sale.customerPhone && <span className="inline-flex items-center gap-1"><Phone className="h-3 w-3" />{sale.customerPhone}</span>}
                        <span className="inline-flex items-center gap-1"><Scale className="h-3 w-3" />{sale.netWeight.toFixed(2)}g</span>
                      </div>
                      <div className="mt-1 text-[10px] font-bold text-slate-500">
                        {format(new Date(sale.saleDate), 'dd MMM yyyy, HH:mm')} • {sale.items?.length} items
                      </div>
                    </div>
                  </div>
                  <div className="text-right shrink-0">
                    <div className="text-xl font-extrabold text-emerald-700 dark:text-emerald-400 tabular-nums">{formatPKR(sale.total)}</div>
                    {remaining > 0 && sale.paymentStatus !== 'PAID' && (
                      <div className="text-[10px] font-extrabold text-amber-700">Due: {formatPKR(remaining)}</div>
                    )}
                    {sale.exchangeValue > 0 && (
                      <div className="text-[10px] font-extrabold text-violet-700">Exchange: {formatPKR(sale.exchangeValue)}</div>
                    )}
                  </div>
                </div>
              </Link>
            );
          })}
        </section>
      )}
    </div>
  );
}

function StatCard({ label, value, icon: Icon, color }: any) {
  const colors: Record<string, string> = {
    amber: 'from-amber-500 to-yellow-600', emerald: 'from-emerald-500 to-green-600',
    yellow: 'from-yellow-500 to-amber-600', rose: 'from-rose-500 to-pink-600',
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
