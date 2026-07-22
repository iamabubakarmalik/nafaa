import { useState } from 'react';
import { useQuery } from '@tanstack/react-query';
import { Link } from 'react-router-dom';
import {
  FileText, Plus, Search, RefreshCw, Sparkles, Clock, User, Phone,
  CheckCircle2, X, Eye, ArrowRight, Building, DollarSign, TrendingUp,
} from 'lucide-react';
import { quotationsApi, type QuotationStatus } from '../api/quotations.api';
import { formatPKR } from '@/lib/format';
import { Button } from '@/components/ui/Button';
import { format, differenceInDays } from 'date-fns';

const STATUS_CONFIG: Record<QuotationStatus, { label: string; color: string }> = {
  DRAFT: { label: 'Draft', color: 'bg-slate-500' },
  SENT: { label: 'Sent', color: 'bg-blue-500' },
  VIEWED: { label: 'Viewed', color: 'bg-cyan-500' },
  ACCEPTED: { label: 'Accepted', color: 'bg-emerald-600' },
  REJECTED: { label: 'Rejected', color: 'bg-rose-500' },
  EXPIRED: { label: 'Expired', color: 'bg-slate-400' },
  CONVERTED: { label: 'Converted', color: 'bg-purple-600' },
  REVISED: { label: 'Revised', color: 'bg-amber-500' },
};

export default function QuotationsPage() {
  const [search, setSearch] = useState('');
  const [statusFilter, setStatusFilter] = useState<string>('all');

  const { data: quotations = [], isLoading, refetch, isRefetching } = useQuery({
    queryKey: ['hardware-quotations', statusFilter, search],
    queryFn: () => quotationsApi.list({
      status: statusFilter === 'all' ? undefined : statusFilter,
      search: search.trim() || undefined,
    }),
  });

  const { data: summary } = useQuery({
    queryKey: ['hardware-quotations-summary'],
    queryFn: () => quotationsApi.summary(),
  });

  return (
    <div className="space-y-6">
      <section className="relative overflow-hidden rounded-3xl bg-gradient-to-br from-slate-950 via-violet-900 to-purple-700 text-white p-6 sm:p-8 shadow-2xl">
        <div className="absolute -top-20 -right-20 h-72 w-72 rounded-full bg-violet-400/20 blur-3xl" />
        <div className="relative flex flex-col lg:flex-row lg:items-center lg:justify-between gap-5">
          <div>
            <div className="inline-flex items-center gap-2 rounded-full bg-white/15 backdrop-blur px-3 py-1 text-xs font-extrabold border border-white/20">
              <Sparkles className="h-3.5 w-3.5 text-amber-300" />
              Estimates & Quotes
            </div>
            <h1 className="mt-3 text-3xl sm:text-4xl font-extrabold leading-tight">📄 Quotations</h1>
            <p className="mt-2 text-sm text-white/80 font-semibold">Send price estimates with items, discounts, terms</p>
          </div>
          <div className="flex items-center gap-2 flex-wrap">
            <button onClick={() => refetch()} disabled={isRefetching} className="inline-flex items-center gap-2 rounded-xl bg-white/15 hover:bg-white/25 px-4 py-2.5 text-sm font-bold backdrop-blur border border-white/20">
              <RefreshCw className={'h-4 w-4 ' + (isRefetching ? 'animate-spin' : '')} />
              Refresh
            </button>
            <Link to="/hardware/quotations/new">
              <Button className="bg-white text-slate-900 hover:bg-slate-100">
                <Plus className="h-4 w-4" />
                New Quotation
              </Button>
            </Link>
          </div>
        </div>
      </section>

      {summary && (
        <section className="grid grid-cols-2 lg:grid-cols-4 gap-4">
          <StatCard label="Total Quotations" value={summary.totalQuotations} icon={FileText} color="violet" />
          <StatCard label="Accepted" value={summary.acceptedCount} icon={CheckCircle2} color="emerald" sub={formatPKR(summary.acceptedValue)} />
          <StatCard label="Pending" value={summary.pendingCount} icon={Clock} color="amber" />
          <StatCard label="Expired" value={summary.expiredCount} icon={X} color="slate" />
        </section>
      )}

      <section className="rounded-3xl bg-white dark:bg-neutral-900 border border-slate-200 dark:border-neutral-800 shadow-sm p-4 space-y-3">
        <div className="relative">
          <Search className="h-4 w-4 text-slate-400 absolute left-3.5 top-1/2 -translate-y-1/2" />
          <input value={search} onChange={(e) => setSearch(e.target.value)} placeholder="Search quotation #, customer..." className="h-11 w-full rounded-xl border-2 border-slate-200 dark:border-neutral-700 bg-white dark:bg-neutral-800 pl-10 pr-3 text-sm font-semibold focus:outline-none focus:border-violet-500" />
        </div>
        <div className="flex gap-1.5 overflow-x-auto pb-1">
          <button onClick={() => setStatusFilter('all')} className={
            'shrink-0 px-3 py-1.5 rounded-lg text-xs font-extrabold ' +
            (statusFilter === 'all' ? 'bg-violet-600 text-white shadow' : 'bg-slate-100 dark:bg-neutral-800 text-slate-700')
          }>All</button>
          {Object.entries(STATUS_CONFIG).map(([k, v]) => (
            <button key={k} onClick={() => setStatusFilter(k)} className={
              'shrink-0 px-3 py-1.5 rounded-lg text-xs font-extrabold ' +
              (statusFilter === k ? 'bg-violet-600 text-white shadow' : 'bg-slate-100 dark:bg-neutral-800 text-slate-700')
            }>{v.label}</button>
          ))}
        </div>
      </section>

      {isLoading ? (
        <div className="grid gap-3">
          {[1, 2, 3].map((i) => <div key={i} className="h-32 rounded-2xl bg-slate-100 dark:bg-neutral-800 animate-pulse" />)}
        </div>
      ) : quotations.length === 0 ? (
        <div className="rounded-3xl bg-white dark:bg-neutral-900 border-2 border-dashed border-slate-200 dark:border-neutral-800 p-12 text-center">
          <FileText className="h-16 w-16 text-slate-400 mx-auto mb-3" />
          <p className="font-extrabold text-slate-700">No quotations</p>
        </div>
      ) : (
        <section className="grid gap-3">
          {quotations.map((q) => <QuotationCard key={q.id} q={q} />)}
        </section>
      )}
    </div>
  );
}

function StatCard({ label, value, sub, icon: Icon, color }: any) {
  const colors: Record<string, string> = {
    violet: 'from-violet-500 to-purple-600', emerald: 'from-emerald-500 to-green-600',
    amber: 'from-amber-500 to-orange-600', slate: 'from-slate-500 to-slate-700',
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

function QuotationCard({ q }: any) {
  const cfg = STATUS_CONFIG[q.status as QuotationStatus];
  const daysLeft = differenceInDays(new Date(q.validUntil), new Date());
  const isExpiring = daysLeft <= 3 && daysLeft >= 0 && ['SENT', 'VIEWED'].includes(q.status);

  return (
    <Link to={'/hardware/quotations/' + q.id} className={
      'block rounded-2xl bg-white dark:bg-neutral-900 border-2 shadow-sm hover:shadow-lg transition p-4 ' +
      (isExpiring ? 'border-amber-400 ring-2 ring-amber-100' : 'border-slate-200 dark:border-neutral-800 hover:border-violet-300')
    }>
      <div className="flex items-start justify-between gap-3 flex-wrap">
        <div className="flex items-start gap-3 min-w-0 flex-1">
          <div className="h-12 w-12 rounded-2xl bg-gradient-to-br from-violet-500 to-purple-600 text-white flex items-center justify-center shadow shrink-0">
            <FileText className="h-6 w-6" />
          </div>
          <div className="min-w-0 flex-1">
            <div className="flex items-center gap-2 flex-wrap">
              <span className="font-extrabold text-slate-900 dark:text-white">{q.quotationNumber}</span>
              <span className={'px-2 py-0.5 rounded-full text-[9px] font-extrabold uppercase text-white ' + cfg.color}>{cfg.label}</span>
              {q.revisionNumber > 1 && <span className="px-2 py-0.5 rounded bg-amber-100 text-amber-700 text-[9px] font-extrabold uppercase">Rev {q.revisionNumber}</span>}
              {isExpiring && <span className="px-2 py-0.5 rounded bg-amber-500 text-white text-[9px] font-extrabold uppercase animate-pulse">Expires in {daysLeft}d</span>}
            </div>
            <div className="mt-1 text-sm font-bold text-slate-900 dark:text-white">{q.customerName}</div>
            <div className="text-xs text-slate-500 font-semibold">
              {q.items?.length || 0} items • {format(new Date(q.quotationDate), 'dd MMM yyyy')}
              {q.project && ' • ' + q.project.name}
            </div>
          </div>
        </div>
        <div className="text-right shrink-0">
          <div className="text-xl font-extrabold text-emerald-700 tabular-nums">{formatPKR(q.total)}</div>
          <div className="text-[10px] font-bold text-slate-500">Valid till {format(new Date(q.validUntil), 'dd MMM')}</div>
        </div>
      </div>
    </Link>
  );
}
