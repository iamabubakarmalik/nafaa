import { useState, useMemo } from 'react';
import { Link } from 'react-router-dom';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import {
  FileSignature, Plus, Search, X, RefreshCw, CheckCircle2, XCircle,
  Clock, AlertTriangle, Phone, User, Calendar, Eye, Bell,
  DollarSign, TrendingUp, RotateCw, Edit3, Trash2,
} from 'lucide-react';
import { toast } from 'sonner';
import { amcContractsApi, type ApplianceAmcStatus } from '../api/amc-contracts.api';
import { formatPKR } from '@core/lib/format';
import { Button } from '@core/ui/Button';

const STATUS_META: Record<ApplianceAmcStatus, { label: string; color: string; bg: string; icon: any }> = {
  ACTIVE: { label: 'Active', color: 'text-emerald-700', bg: 'bg-emerald-100', icon: CheckCircle2 },
  EXPIRED: { label: 'Expired', color: 'text-slate-700', bg: 'bg-slate-100', icon: XCircle },
  CANCELLED: { label: 'Cancelled', color: 'text-rose-700', bg: 'bg-rose-100', icon: XCircle },
  RENEWED: { label: 'Renewed', color: 'text-blue-700', bg: 'bg-blue-100', icon: RotateCw },
  SUSPENDED: { label: 'Suspended', color: 'text-amber-700', bg: 'bg-amber-100', icon: AlertTriangle },
};

const TYPE_META: Record<string, { color: string; bg: string }> = {
  BASIC: { color: 'text-slate-700', bg: 'bg-slate-100' },
  STANDARD: { color: 'text-blue-700', bg: 'bg-blue-100' },
  PREMIUM: { color: 'text-violet-700', bg: 'bg-violet-100' },
  COMPREHENSIVE: { color: 'text-amber-700', bg: 'bg-amber-100' },
};

export default function AmcContractsPage() {
  const qc = useQueryClient();
  const [search, setSearch] = useState('');
  const [statusFilter, setStatusFilter] = useState('all');
  const [expiringOnly, setExpiringOnly] = useState(false);

  const { data: contracts = [], isLoading, refetch, isRefetching } = useQuery({
    queryKey: ['amc-contracts-list', statusFilter, expiringOnly],
    queryFn: () => amcContractsApi.list({
      status: statusFilter === 'all' ? undefined : statusFilter,
      expiringSoon: expiringOnly ? true : undefined,
    }),
  });

  const { data: summary } = useQuery({
    queryKey: ['amc-contracts-summary'],
    queryFn: () => amcContractsApi.summary(),
  });

  const filtered = useMemo(() => {
    const q = search.toLowerCase().trim();
    if (!q) return contracts;
    return contracts.filter((c) =>
      c.contractNumber.toLowerCase().includes(q) ||
      c.customerName.toLowerCase().includes(q) ||
      c.customerPhone.includes(q) ||
      (c.productName || '').toLowerCase().includes(q) ||
      (c.serialNumber || '').toLowerCase().includes(q)
    );
  }, [contracts, search]);

  const sendReminder = useMutation({
    mutationFn: (id: string) => amcContractsApi.sendReminder(id),
    onSuccess: () => {
      toast.success('Reminder sent');
      qc.invalidateQueries({ queryKey: ['amc-contracts-list'] });
    },
  });

  return (
    <div className="space-y-5">
      <section className="relative overflow-hidden rounded-3xl bg-gradient-to-br from-slate-950 via-pink-900 to-rose-700 text-white p-6 shadow-2xl">
        <div className="absolute -top-20 -right-20 h-64 w-64 rounded-full bg-pink-400/20 blur-3xl" />
        <div className="relative flex items-start justify-between gap-4 flex-wrap">
          <div>
            <div className="inline-flex items-center gap-2 rounded-full bg-white/15 backdrop-blur px-3 py-1 text-xs font-extrabold border border-white/20">
              <FileSignature className="h-3.5 w-3.5 text-amber-300" /> AMC Contracts
            </div>
            <h1 className="mt-3 text-3xl sm:text-4xl font-extrabold leading-tight">📄 AMC Contracts</h1>
            <p className="mt-2 text-sm text-white/80">
              {summary?.activeCount ?? 0} active • {summary?.expiringSoonCount ?? 0} expiring soon • Revenue{' '}
              <strong className="text-emerald-300">{formatPKR(summary?.totalCollected ?? 0)}</strong>
            </p>
          </div>
          <div className="flex gap-2 flex-wrap">
            <button onClick={() => refetch()} disabled={isRefetching}
              className="inline-flex items-center gap-2 rounded-xl bg-white/10 hover:bg-white/20 px-4 py-2.5 text-sm font-bold">
              <RefreshCw className={`h-4 w-4 ${isRefetching ? 'animate-spin' : ''}`} /> Refresh
            </button>
            <Link to="/appliances/amc-contracts/new">
              <Button className="bg-white text-slate-900 hover:bg-slate-100">
                <Plus className="h-4 w-4" /> New Contract
              </Button>
            </Link>
          </div>
        </div>
      </section>

      {summary && (
        <section className="grid grid-cols-2 lg:grid-cols-4 gap-3">
          <Kpi icon={CheckCircle2} label="Active" value={summary.activeCount ?? 0} sub="Currently running" tone="emerald" />
          <Kpi icon={AlertTriangle} label="Expiring Soon" value={summary.expiringSoonCount ?? 0} sub="Next 30 days" tone="amber" onClick={() => setExpiringOnly(true)} />
          <Kpi icon={XCircle} label="Expired" value={summary.expiredCount ?? 0} sub="Renewal opportunity" tone="rose" />
          <Kpi icon={DollarSign} label="Total Value" value={formatPKR(summary.totalContractValue ?? 0)} sub="Active contracts" tone="violet" />
        </section>
      )}

      <section className="rounded-3xl bg-white border-2 border-slate-200 shadow-sm p-4 space-y-3">
        <div className="relative">
          <Search className="h-5 w-5 text-slate-400 absolute left-3.5 top-1/2 -translate-y-1/2" />
          <input value={search} onChange={(e) => setSearch(e.target.value)}
            placeholder="Contract #, customer, product, serial..."
            className="h-12 w-full rounded-2xl border-2 border-slate-200 bg-white pl-11 pr-10 text-sm font-semibold focus:outline-none focus:border-pink-500" />
          {search && (
            <button onClick={() => setSearch('')} className="absolute right-3 top-1/2 -translate-y-1/2 h-7 w-7 rounded-lg hover:bg-slate-100 flex items-center justify-center">
              <X className="h-4 w-4" />
            </button>
          )}
        </div>

        <div className="flex gap-2 flex-wrap">
          <div className="flex gap-1 bg-slate-100 rounded-xl p-1 overflow-x-auto">
            {[
              { v: 'all', l: 'All' },
              { v: 'ACTIVE', l: 'Active' },
              { v: 'EXPIRED', l: 'Expired' },
              { v: 'CANCELLED', l: 'Cancelled' },
              { v: 'RENEWED', l: 'Renewed' },
            ].map((o) => (
              <button key={o.v} onClick={() => setStatusFilter(o.v)}
                className={['shrink-0 px-3 py-1.5 rounded-lg text-xs font-extrabold transition',
                  statusFilter === o.v ? 'bg-pink-600 text-white shadow-sm' : 'text-slate-600 hover:text-slate-900'].join(' ')}>
                {o.l}
              </button>
            ))}
          </div>
          <button onClick={() => setExpiringOnly(!expiringOnly)}
            className={['h-10 px-3 rounded-xl border-2 text-xs font-extrabold inline-flex items-center gap-1.5 transition',
              expiringOnly ? 'border-amber-500 bg-amber-50 text-amber-700' : 'border-slate-200 bg-white text-slate-700'].join(' ')}>
            <Bell className="h-3.5 w-3.5" /> Expiring Soon
          </button>
        </div>
      </section>

      {isLoading ? (
        <div className="space-y-2">
          {Array.from({ length: 4 }).map((_, i) => <div key={i} className="h-32 rounded-2xl bg-slate-100 animate-pulse" />)}
        </div>
      ) : filtered.length === 0 ? (
        <div className="rounded-3xl bg-white border-2 border-dashed border-slate-300 p-16 text-center">
          <FileSignature className="h-16 w-16 text-slate-300 mx-auto mb-3" />
          <h3 className="text-lg font-extrabold text-slate-900">No AMC contracts</h3>
          <p className="text-sm text-slate-500 font-semibold mt-1">Sell annual maintenance contracts to customers</p>
          <Link to="/appliances/amc-contracts/new">
            <Button className="mt-4 bg-gradient-to-r from-pink-600 to-rose-700">
              <Plus className="h-4 w-4" /> Create First Contract
            </Button>
          </Link>
        </div>
      ) : (
        <div className="grid sm:grid-cols-2 lg:grid-cols-3 gap-3">
          {filtered.map((c) => (
            <AmcCard key={c.id} contract={c} onReminder={() => sendReminder.mutate(c.id)} />
          ))}
        </div>
      )}
    </div>
  );
}

function AmcCard({ contract: c, onReminder }: any) {
  const meta = STATUS_META[c.status as ApplianceAmcStatus] || STATUS_META.ACTIVE;
  const typeMeta = TYPE_META[c.amcType] || TYPE_META.STANDARD;
  const StatusIcon = meta.icon;

  const expiryDate = new Date(c.expiryDate);
  const daysRemaining = Math.floor((expiryDate.getTime() - Date.now()) / 86400000);
  const isExpiringSoon = daysRemaining >= 0 && daysRemaining <= 30;
  const isExpired = daysRemaining < 0;

  const visitsRemaining = Math.max(c.freeVisitsAllowed - c.freeVisitsUsed, 0);

  return (
    <div className={['rounded-2xl bg-white border-2 shadow-sm p-4 hover:shadow-md transition',
      isExpiringSoon ? 'border-amber-300 ring-2 ring-amber-100' : isExpired ? 'border-rose-200' : 'border-slate-200'].join(' ')}>
      <div className="flex items-start justify-between gap-2 mb-3">
        <div>
          <div className="flex items-center gap-2 flex-wrap">
            <span className={`px-2 py-0.5 rounded-full text-[9px] font-extrabold uppercase ${typeMeta.bg} ${typeMeta.color}`}>
              {c.amcType}
            </span>
            <span className={`px-2 py-0.5 rounded-full text-[9px] font-extrabold uppercase inline-flex items-center gap-1 ${meta.bg} ${meta.color}`}>
              <StatusIcon className="h-2.5 w-2.5" /> {meta.label}
            </span>
          </div>
          <div className="font-mono font-extrabold text-slate-900 text-sm mt-1">{c.contractNumber}</div>
        </div>
        <Link to={`/appliances/amc-contracts/${c.id}/edit`}
          className="h-8 w-8 rounded-lg bg-slate-50 hover:bg-slate-100 text-slate-600 flex items-center justify-center">
          <Edit3 className="h-3.5 w-3.5" />
        </Link>
      </div>

      <div className="space-y-1.5 mb-3">
        <div className="text-sm font-extrabold text-slate-900 truncate">{c.customerName}</div>
        <div className="text-xs font-bold text-slate-600 inline-flex items-center gap-1">
          <Phone className="h-3 w-3 text-emerald-600" /> {c.customerPhone}
        </div>
        {c.productName && (
          <div className="text-xs font-bold text-slate-700 truncate">📦 {c.productName}</div>
        )}
        {c.serialNumber && (
          <div className="text-[10px] font-mono text-slate-500">S/N: {c.serialNumber}</div>
        )}
      </div>

      <div className="rounded-xl bg-slate-50 border border-slate-100 p-2.5 space-y-1.5">
        <div className="flex items-center justify-between text-xs">
          <span className="text-slate-600 font-bold">Start</span>
          <span className="font-extrabold text-slate-900">
            {new Date(c.startDate).toLocaleDateString('en-PK', { day: 'numeric', month: 'short', year: 'numeric' })}
          </span>
        </div>
        <div className="flex items-center justify-between text-xs">
          <span className="text-slate-600 font-bold">Expiry</span>
          <span className={['font-extrabold', isExpired ? 'text-rose-700' : isExpiringSoon ? 'text-amber-700' : 'text-slate-900'].join(' ')}>
            {expiryDate.toLocaleDateString('en-PK', { day: 'numeric', month: 'short', year: 'numeric' })}
          </span>
        </div>
        {!isExpired && (
          <div className={['text-[10px] text-center font-extrabold pt-1 border-t',
            isExpiringSoon ? 'text-amber-700 border-amber-200' : 'text-slate-500 border-slate-200'].join(' ')}>
            {daysRemaining === 0 ? 'Expires TODAY' : `${daysRemaining} days remaining`}
          </div>
        )}
      </div>

      <div className="mt-3 grid grid-cols-3 gap-2 text-center">
        <div className="rounded-lg bg-emerald-50 border border-emerald-200 p-2">
          <div className="text-[9px] uppercase font-extrabold text-emerald-700">Value</div>
          <div className="text-xs font-extrabold text-emerald-900 tabular-nums">{formatPKR(c.contractValue)}</div>
        </div>
        <div className="rounded-lg bg-blue-50 border border-blue-200 p-2">
          <div className="text-[9px] uppercase font-extrabold text-blue-700">Visits</div>
          <div className="text-xs font-extrabold text-blue-900 tabular-nums">{visitsRemaining}/{c.freeVisitsAllowed}</div>
        </div>
        <div className="rounded-lg bg-violet-50 border border-violet-200 p-2">
          <div className="text-[9px] uppercase font-extrabold text-violet-700">Duration</div>
          <div className="text-xs font-extrabold text-violet-900 tabular-nums">{c.durationMonths}m</div>
        </div>
      </div>

      {isExpiringSoon && !c.renewalReminderSent && (
        <button onClick={onReminder}
          className="mt-3 w-full h-10 rounded-xl bg-amber-600 hover:bg-amber-700 text-white text-xs font-extrabold inline-flex items-center justify-center gap-1 transition">
          <Bell className="h-3.5 w-3.5" /> Send Renewal Reminder
        </button>
      )}
      {c.renewalReminderSent && (
        <div className="mt-3 text-center text-[10px] font-extrabold text-emerald-700 py-2">
          ✓ Reminder sent
        </div>
      )}
    </div>
  );
}

function Kpi({ icon: Icon, label, value, sub, tone, onClick }: any) {
  const tones: Record<string, string> = {
    emerald: 'from-emerald-500 to-emerald-700',
    amber: 'from-amber-500 to-orange-600',
    rose: 'from-rose-500 to-red-700',
    violet: 'from-violet-500 to-purple-700',
  };
  const Comp: any = onClick ? 'button' : 'div';
  return (
    <Comp onClick={onClick}
      className={['rounded-2xl bg-white border-2 border-slate-200 p-4 shadow-sm text-left w-full',
        onClick ? 'hover:border-amber-300 hover:shadow-md transition' : ''].join(' ')}>
      <div className="flex items-center justify-between gap-2">
        <div className="min-w-0">
          <div className="text-[10px] uppercase tracking-wider text-slate-500 font-extrabold">{label}</div>
          <div className="mt-1.5 text-xl font-extrabold text-slate-900 tabular-nums truncate">{value}</div>
          {sub && <div className="text-[10px] text-slate-500 font-bold mt-0.5">{sub}</div>}
        </div>
        <div className={`h-11 w-11 rounded-2xl bg-gradient-to-br ${tones[tone]} text-white flex items-center justify-center shadow-lg shrink-0`}>
          <Icon className="h-5 w-5" />
        </div>
      </div>
    </Comp>
  );
}
