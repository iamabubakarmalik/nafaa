import { useState, useMemo } from 'react';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import {
  PackageOpen, Plus, Search, X, Clock, CheckCircle2, XCircle,
  RefreshCw, AlertTriangle, Phone, Calendar, User, DollarSign,
  ArrowRight, Eye, RotateCcw, Play, Package, Timer,
} from 'lucide-react';
import { toast } from 'sonner';
import { gamingRentalsApi, type GamingRentalStatus } from '../api/rentals.api';
import { formatPKR } from '@core/lib/format';
import { Button } from '@core/ui/Button';

const STATUS_META: Record<GamingRentalStatus, { label: string; color: string; bg: string; icon: any }> = {
  RESERVED: { label: 'Reserved', color: 'text-amber-700', bg: 'bg-amber-100', icon: Clock },
  ACTIVE: { label: 'Active', color: 'text-emerald-700', bg: 'bg-emerald-100', icon: Play },
  RETURNED: { label: 'Returned', color: 'text-blue-700', bg: 'bg-blue-100', icon: CheckCircle2 },
  OVERDUE: { label: 'Overdue', color: 'text-rose-700', bg: 'bg-rose-100', icon: AlertTriangle },
  DAMAGED: { label: 'Damaged', color: 'text-orange-700', bg: 'bg-orange-100', icon: XCircle },
  LOST: { label: 'Lost', color: 'text-red-700', bg: 'bg-red-100', icon: XCircle },
  CANCELLED: { label: 'Cancelled', color: 'text-slate-700', bg: 'bg-slate-100', icon: XCircle },
};

export default function GamingRentalsPage() {
  const qc = useQueryClient();
  const [search, setSearch] = useState('');
  const [statusFilter, setStatusFilter] = useState('all');
  const [showReturnModal, setShowReturnModal] = useState<any>(null);

  const { data: rentals = [], isLoading, refetch, isRefetching } = useQuery({
    queryKey: ['gaming-rentals-list', statusFilter],
    queryFn: () => gamingRentalsApi.list({
      status: statusFilter === 'all' ? undefined : statusFilter,
    }),
  });

  const { data: summary } = useQuery({
    queryKey: ['gaming-rentals-summary-page'],
    queryFn: () => gamingRentalsApi.summary(),
    refetchInterval: 60_000,
  });

  const filtered = useMemo(() => {
    const q = search.toLowerCase().trim();
    if (!q) return rentals;
    return rentals.filter((r) =>
      r.rentalNumber.toLowerCase().includes(q) ||
      r.customerName.toLowerCase().includes(q) ||
      r.productName.toLowerCase().includes(q) ||
      (r.customerPhone || '').includes(q) ||
      (r.serialNumber || '').toLowerCase().includes(q)
    );
  }, [rentals, search]);

  const markOverdue = useMutation({
    mutationFn: () => gamingRentalsApi.markOverdue(),
    onSuccess: (result: any) => {
      toast.success(`${result?.count || 0} rentals marked overdue`);
      qc.invalidateQueries({ queryKey: ['gaming-rentals-list'] });
      qc.invalidateQueries({ queryKey: ['gaming-rentals-summary-page'] });
    },
  });

  return (
    <div className="space-y-5">
      {showReturnModal && (
        <ReturnRentalModal rental={showReturnModal}
          onClose={() => setShowReturnModal(null)}
          onReturned={() => {
            setShowReturnModal(null);
            qc.invalidateQueries({ queryKey: ['gaming-rentals-list'] });
            qc.invalidateQueries({ queryKey: ['gaming-rentals-summary-page'] });
          }} />
      )}

      <section className="relative overflow-hidden rounded-3xl bg-gradient-to-br from-slate-950 via-violet-900 to-fuchsia-700 text-white p-6 shadow-2xl">
        <div className="absolute -top-20 -right-20 h-64 w-64 rounded-full bg-violet-400/20 blur-3xl" />
        <div className="relative flex items-start justify-between gap-4 flex-wrap">
          <div>
            <div className="inline-flex items-center gap-2 rounded-full bg-white/15 backdrop-blur px-3 py-1 text-xs font-extrabold border border-white/20">
              <PackageOpen className="h-3.5 w-3.5 text-amber-300" /> Console & Game Rentals
            </div>
            <h1 className="mt-3 text-3xl sm:text-4xl font-extrabold leading-tight">📦 Rentals</h1>
            <p className="mt-2 text-sm text-white/80">
              {summary?.active ?? 0} active • {summary?.overdue ?? 0} overdue • Revenue{' '}
              <strong className="text-emerald-300">{formatPKR(summary?.totalRevenue || 0)}</strong>
            </p>
          </div>
          <div className="flex gap-2 flex-wrap">
            <button onClick={() => markOverdue.mutate()} disabled={markOverdue.isPending}
              className="inline-flex items-center gap-2 rounded-xl bg-white/15 hover:bg-white/25 px-4 py-2.5 text-sm font-bold border border-white/20">
              <AlertTriangle className="h-4 w-4" /> Mark Overdue
            </button>
            <button onClick={() => refetch()} disabled={isRefetching}
              className="inline-flex items-center gap-2 rounded-xl bg-white/10 hover:bg-white/20 px-4 py-2.5 text-sm font-bold">
              <RefreshCw className={`h-4 w-4 ${isRefetching ? 'animate-spin' : ''}`} /> Refresh
            </button>
          </div>
        </div>
      </section>

      {summary && (
        <section className="grid grid-cols-2 lg:grid-cols-4 gap-3">
          <StatCard label="Active" value={summary.active} icon={Play} tone="emerald" onClick={() => setStatusFilter('ACTIVE')} />
          <StatCard label="Overdue" value={summary.overdue} icon={AlertTriangle} tone="rose" onClick={() => setStatusFilter('OVERDUE')} />
          <StatCard label="Returned" value={summary.returned} icon={CheckCircle2} tone="blue" onClick={() => setStatusFilter('RETURNED')} />
          <StatCard label="Collected" value={formatPKR(summary.collected)} icon={DollarSign} tone="violet" />
        </section>
      )}

      <section className="rounded-3xl bg-white border-2 border-slate-200 shadow-sm p-4 space-y-3">
        <div className="relative">
          <Search className="h-5 w-5 text-slate-400 absolute left-3.5 top-1/2 -translate-y-1/2" />
          <input value={search} onChange={(e) => setSearch(e.target.value)}
            placeholder="Rental #, customer, product, phone..."
            className="h-12 w-full rounded-2xl border-2 border-slate-200 bg-white pl-11 pr-10 text-sm font-semibold focus:outline-none focus:border-violet-500 focus:ring-2 focus:ring-violet-200" />
          {search && (
            <button onClick={() => setSearch('')} className="absolute right-3 top-1/2 -translate-y-1/2 h-7 w-7 rounded-lg hover:bg-slate-100 flex items-center justify-center">
              <X className="h-4 w-4" />
            </button>
          )}
        </div>

        <div className="flex gap-1 bg-slate-100 rounded-xl p-1 overflow-x-auto">
          {[
            { v: 'all', l: 'All' },
            { v: 'ACTIVE', l: 'Active' },
            { v: 'OVERDUE', l: 'Overdue' },
            { v: 'RESERVED', l: 'Reserved' },
            { v: 'RETURNED', l: 'Returned' },
            { v: 'DAMAGED', l: 'Damaged' },
            { v: 'CANCELLED', l: 'Cancelled' },
          ].map((o) => (
            <button key={o.v} onClick={() => setStatusFilter(o.v)}
              className={`shrink-0 px-3 py-1.5 rounded-lg text-xs font-extrabold transition ${
                statusFilter === o.v ? 'bg-violet-600 text-white shadow-sm' : 'text-slate-600 hover:text-slate-900'}`}>
              {o.l}
            </button>
          ))}
        </div>
      </section>

      {isLoading ? (
        <div className="space-y-2">
          {Array.from({ length: 4 }).map((_, i) => <div key={i} className="h-32 rounded-2xl bg-slate-100 animate-pulse" />)}
        </div>
      ) : filtered.length === 0 ? (
        <div className="rounded-3xl bg-white border-2 border-dashed border-slate-300 p-16 text-center">
          <PackageOpen className="h-16 w-16 text-slate-300 mx-auto mb-3" />
          <h3 className="text-lg font-extrabold text-slate-900">
            {statusFilter === 'all' ? 'No rentals yet' : 'No rentals match filter'}
          </h3>
          <p className="text-sm text-slate-500 font-semibold mt-1">
            Rentals will appear here when customers rent consoles or games
          </p>
        </div>
      ) : (
        <div className="space-y-3">
          {filtered.map((r) => (
            <RentalCard key={r.id} rental={r}
              onReturn={() => setShowReturnModal(r)} />
          ))}
        </div>
      )}
    </div>
  );
}

function RentalCard({ rental, onReturn }: any) {
  const meta = STATUS_META[rental.status as GamingRentalStatus];
  const StatusIcon = meta.icon;
  const isActive = rental.status === 'ACTIVE' || rental.status === 'OVERDUE';
  const endDate = new Date(rental.rentalEndDate);
  const now = new Date();
  const daysLate = isActive && now > endDate ? Math.ceil((now.getTime() - endDate.getTime()) / 86400000) : 0;

  return (
    <div className={`rounded-2xl bg-white border-2 shadow-sm p-4 hover:shadow-md transition ${
      rental.status === 'OVERDUE' ? 'border-rose-300' : 'border-slate-200'}`}>
      <div className="flex items-start gap-4 flex-wrap sm:flex-nowrap">
        <div className={`h-14 w-14 rounded-2xl ${meta.bg} flex items-center justify-center shrink-0`}>
          <StatusIcon className={`h-6 w-6 ${meta.color}`} />
        </div>

        <div className="flex-1 min-w-0">
          <div className="flex items-center gap-2 flex-wrap">
            <span className="font-mono font-extrabold text-slate-900 text-sm">{rental.rentalNumber}</span>
            <span className={`px-2 py-0.5 rounded-full text-[9px] font-extrabold uppercase inline-flex items-center gap-1 ${meta.bg} ${meta.color}`}>
              <StatusIcon className="h-2.5 w-2.5" /> {meta.label}
            </span>
            {daysLate > 0 && (
              <span className="px-2 py-0.5 rounded-full bg-rose-500 text-white text-[9px] font-extrabold">
                {daysLate} days late
              </span>
            )}
          </div>

          <div className="mt-1 font-extrabold text-slate-900 text-sm truncate">{rental.productName}</div>

          <div className="flex items-center gap-3 mt-2 text-xs text-slate-600 font-bold flex-wrap">
            <span className="inline-flex items-center gap-1"><User className="h-3 w-3" /> {rental.customerName}</span>
            {rental.customerPhone && (<span className="inline-flex items-center gap-1"><Phone className="h-3 w-3" /> {rental.customerPhone}</span>)}
            {rental.serialNumber && (<span className="font-mono">S/N: {rental.serialNumber}</span>)}
          </div>

          <div className="flex items-center gap-3 mt-1 text-[10px] text-slate-500 font-bold">
            <span className="inline-flex items-center gap-0.5">
              <Calendar className="h-2.5 w-2.5" />
              {new Date(rental.rentalStartDate).toLocaleDateString('en-PK', { day: 'numeric', month: 'short' })}
              {' → '}
              {new Date(rental.rentalEndDate).toLocaleDateString('en-PK', { day: 'numeric', month: 'short' })}
            </span>
            <span>{rental.daysRented} days</span>
            <span>{formatPKR(rental.pricePerDay)}/day</span>
          </div>
        </div>

        <div className="text-right shrink-0">
          <div className="text-[10px] uppercase font-extrabold text-slate-500">Total</div>
          <div className="text-lg font-extrabold text-emerald-700 tabular-nums">{formatPKR(rental.totalPrice)}</div>
          {rental.depositAmount > 0 && (
            <div className="text-[10px] font-bold text-amber-700">
              Deposit {formatPKR(rental.depositAmount)}
            </div>
          )}
          {rental.remainingAmount > 0 && (
            <div className="text-[10px] font-bold text-rose-700 mt-0.5">
              Balance {formatPKR(rental.remainingAmount)}
            </div>
          )}
          {isActive && (
            <button onClick={onReturn}
              className="mt-2 h-9 px-3 rounded-lg bg-blue-50 hover:bg-blue-100 text-blue-700 text-xs font-extrabold inline-flex items-center gap-1">
              <RotateCcw className="h-3.5 w-3.5" /> Return
            </button>
          )}
        </div>
      </div>
    </div>
  );
}

function ReturnRentalModal({ rental, onClose, onReturned }: any) {
  const [condition, setCondition] = useState('');
  const [damageFee, setDamageFee] = useState(0);
  const [lateFee, setLateFee] = useState(0);
  const [depositRefunded, setDepositRefunded] = useState(rental.depositAmount || 0);

  const endDate = new Date(rental.rentalEndDate);
  const now = new Date();
  const daysLate = now > endDate ? Math.ceil((now.getTime() - endDate.getTime()) / 86400000) : 0;

  const returnRental = useMutation({
    mutationFn: () => gamingRentalsApi.returnRental(rental.id, {
      conditionAtReturn: condition || undefined,
      damageFee, lateFee, depositRefunded,
    }),
    onSuccess: () => {
      toast.success('Rental returned');
      onReturned();
    },
  });

  return (
    <div className="fixed inset-0 z-50 bg-slate-950/80 backdrop-blur-sm flex items-center justify-center p-4">
      <div className="w-full max-w-lg bg-white rounded-3xl shadow-2xl overflow-hidden max-h-[92vh] flex flex-col">
        <div className="shrink-0 px-5 py-4 bg-gradient-to-br from-blue-600 to-cyan-700 text-white">
          <div className="flex items-center justify-between">
            <h3 className="font-extrabold text-xl">Return Rental</h3>
            <button onClick={onClose} className="h-11 w-11 rounded-2xl bg-white/15 hover:bg-white/25 flex items-center justify-center">
              <X className="h-5 w-5" />
            </button>
          </div>
          <p className="text-sm font-bold text-white/85 mt-1">{rental.productName}</p>
        </div>

        <div className="flex-1 overflow-y-auto p-5 space-y-4">
          {daysLate > 0 && (
            <div className="rounded-2xl bg-rose-50 border-2 border-rose-300 p-3 text-sm font-extrabold text-rose-800">
              ⚠️ {daysLate} days late — suggested late fee {formatPKR(daysLate * rental.pricePerDay)}
              <button onClick={() => setLateFee(daysLate * rental.pricePerDay)}
                className="ml-2 px-2 py-0.5 rounded-lg bg-white text-rose-700 text-xs">Apply</button>
            </div>
          )}

          <div>
            <Lbl>Condition at Return</Lbl>
            <textarea rows={2} value={condition} onChange={(e) => setCondition(e.target.value)}
              placeholder="Any damage, scratches, missing items..."
              className="w-full rounded-xl border-2 border-slate-200 px-3 py-2 text-sm font-semibold focus:outline-none focus:border-blue-500" />
          </div>

          <div className="grid sm:grid-cols-2 gap-3">
            <div>
              <Lbl>Damage Fee</Lbl>
              <input type="number" value={damageFee}
                onChange={(e) => setDamageFee(Math.max(0, Number(e.target.value)))}
                className="h-11 w-full rounded-xl border-2 border-slate-200 px-3 text-sm font-bold focus:outline-none focus:border-rose-500" />
            </div>
            <div>
              <Lbl>Late Fee</Lbl>
              <input type="number" value={lateFee}
                onChange={(e) => setLateFee(Math.max(0, Number(e.target.value)))}
                className="h-11 w-full rounded-xl border-2 border-slate-200 px-3 text-sm font-bold focus:outline-none focus:border-rose-500" />
            </div>
          </div>

          {rental.depositAmount > 0 && (
            <div>
              <Lbl>Deposit Refund <span className="text-slate-400 normal-case font-bold">(originally {formatPKR(rental.depositAmount)})</span></Lbl>
              <input type="number" value={depositRefunded}
                onChange={(e) => setDepositRefunded(Math.max(0, Number(e.target.value)))}
                className="h-11 w-full rounded-xl border-2 border-emerald-300 bg-emerald-50 px-3 text-sm font-extrabold tabular-nums focus:outline-none focus:border-emerald-500" />
              <p className="mt-1 text-[10px] text-slate-500 font-bold">
                Auto-suggested: {formatPKR(Math.max(0, rental.depositAmount - damageFee - lateFee))}
              </p>
            </div>
          )}
        </div>

        <div className="shrink-0 px-5 py-3 border-t-2 border-slate-100 bg-slate-50 flex gap-2">
          <Button variant="secondary" className="flex-1" onClick={onClose}>Cancel</Button>
          <Button className="flex-1 bg-gradient-to-r from-blue-600 to-cyan-700"
            onClick={() => returnRental.mutate()} loading={returnRental.isPending}>
            <CheckCircle2 className="h-4 w-4" /> Complete Return
          </Button>
        </div>
      </div>
    </div>
  );
}

function StatCard({ label, value, icon: Icon, tone, onClick }: any) {
  const tones: Record<string, string> = {
    emerald: 'from-emerald-500 to-emerald-700', rose: 'from-rose-500 to-red-700',
    blue: 'from-blue-500 to-blue-700', violet: 'from-violet-500 to-fuchsia-700',
  };
  const C: any = onClick ? 'button' : 'div';
  return (
    <C onClick={onClick}
      className={`rounded-2xl bg-white border-2 border-slate-200 p-4 shadow-sm text-left w-full ${onClick ? 'hover:border-violet-300 hover:shadow-md transition' : ''}`}>
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

function Lbl({ children }: any) {
  return <label className="block text-xs font-extrabold uppercase tracking-wider text-slate-600 mb-1.5">{children}</label>;
}
