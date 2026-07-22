import { useState } from 'react';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import {
  AlertTriangle, Plus, Search, X, Check, Eye, Filter,
  Calendar, Package, Camera, RefreshCw, TrendingDown,
  CheckCircle2, XCircle, DollarSign, ShieldAlert,
} from 'lucide-react';
import { damageApi, type DamageLog, type DamageReasonCode } from '../api/damage.api';
import { formatPKR } from '@core/lib/format';
import { DamageCreateModal } from '../components/DamageCreateModal';
import { Button } from '@core/ui/Button';
import { toast } from 'sonner';

const REASON_LABELS: Record<DamageReasonCode, string> = {
  EXPIRY: 'Expiry',
  BREAKAGE: 'Breakage',
  SPOILAGE: 'Spoilage',
  PEST_DAMAGE: 'Pest Damage',
  WATER_DAMAGE: 'Water Damage',
  THEFT: 'Theft',
  MISHANDLING: 'Mishandling',
  MANUFACTURING_DEFECT: 'Manufacturing Defect',
  OTHER: 'Other',
};

const REASON_COLORS: Record<DamageReasonCode, string> = {
  EXPIRY: 'bg-amber-100 text-amber-800 border-amber-300 dark:bg-amber-950/40',
  BREAKAGE: 'bg-orange-100 text-orange-800 border-orange-300 dark:bg-orange-950/40',
  SPOILAGE: 'bg-lime-100 text-lime-800 border-lime-300 dark:bg-lime-950/40',
  PEST_DAMAGE: 'bg-rose-100 text-rose-800 border-rose-300 dark:bg-rose-950/40',
  WATER_DAMAGE: 'bg-blue-100 text-blue-800 border-blue-300 dark:bg-blue-950/40',
  THEFT: 'bg-red-100 text-red-800 border-red-300 dark:bg-red-950/40',
  MISHANDLING: 'bg-slate-100 text-slate-800 border-slate-300 dark:bg-neutral-800',
  MANUFACTURING_DEFECT: 'bg-violet-100 text-violet-800 border-violet-300 dark:bg-violet-950/40',
  OTHER: 'bg-slate-100 text-slate-800 border-slate-300 dark:bg-neutral-800',
};

const STATUS_CONFIG = {
  REPORTED: { label: 'Reported', color: 'bg-amber-500 text-white', icon: AlertTriangle },
  APPROVED: { label: 'Approved', color: 'bg-emerald-500 text-white', icon: CheckCircle2 },
  REJECTED: { label: 'Rejected', color: 'bg-rose-500 text-white', icon: XCircle },
  WRITTEN_OFF: { label: 'Written Off', color: 'bg-slate-600 text-white', icon: ShieldAlert },
};

export default function DamageLogPage() {
  const queryClient = useQueryClient();
  const [search, setSearch] = useState('');
  const [statusFilter, setStatusFilter] = useState<string>('all');
  const [reasonFilter, setReasonFilter] = useState<string>('all');
  const [showCreateModal, setShowCreateModal] = useState(false);

  const { data: damages = [], isLoading, refetch, isRefetching } = useQuery({
    queryKey: ['damage-list', statusFilter, reasonFilter],
    queryFn: () => damageApi.list({
      status: statusFilter === 'all' ? undefined : statusFilter,
      reasonCode: reasonFilter === 'all' ? undefined : reasonFilter,
    }),
  });

  const { data: summary } = useQuery({
    queryKey: ['damage-summary'],
    queryFn: () => damageApi.summary(),
  });

  const approveMutation = useMutation({
    mutationFn: (id: string) => damageApi.approve(id),
    onSuccess: () => {
      toast.success('Damage approved — stock adjusted');
      queryClient.invalidateQueries({ queryKey: ['damage-list'] });
      queryClient.invalidateQueries({ queryKey: ['damage-summary'] });
    },
    onError: (e: any) => toast.error(e?.response?.data?.message || 'Approval failed'),
  });

  const rejectMutation = useMutation({
    mutationFn: ({ id, reason }: { id: string; reason?: string }) => damageApi.reject(id, reason),
    onSuccess: () => {
      toast.success('Damage rejected');
      queryClient.invalidateQueries({ queryKey: ['damage-list'] });
      queryClient.invalidateQueries({ queryKey: ['damage-summary'] });
    },
  });

  const filtered = damages.filter((d) => {
    if (!search.trim()) return true;
    const q = search.toLowerCase();
    return (
      d.damageNumber.toLowerCase().includes(q) ||
      d.product?.name?.toLowerCase().includes(q) ||
      d.reason.toLowerCase().includes(q)
    );
  });

  return (
    <div className="space-y-6">
      {/* HERO */}
      <section className="relative overflow-hidden rounded-3xl bg-gradient-to-br from-slate-950 via-rose-900 to-red-700 text-white p-6 sm:p-8 shadow-2xl">
        <div className="absolute -top-20 -right-20 h-72 w-72 rounded-full bg-rose-400/20 blur-3xl" />
        <div className="absolute -bottom-20 -left-20 h-72 w-72 rounded-full bg-amber-400/15 blur-3xl" />

        <div className="relative flex flex-col lg:flex-row lg:items-center lg:justify-between gap-5">
          <div>
            <div className="inline-flex items-center gap-2 rounded-full bg-white/15 backdrop-blur px-3 py-1 text-xs font-extrabold border border-white/20">
              <ShieldAlert className="h-3.5 w-3.5 text-amber-300" />
              Damage & Wastage
            </div>
            <h1 className="mt-3 text-3xl sm:text-4xl font-extrabold leading-tight">
              🛡️ Damage Tracking
            </h1>
            <p className="mt-2 text-sm text-white/80 font-semibold">
              Report, review, approve — stock accurate rakho
            </p>
          </div>
          <div className="flex items-center gap-2 flex-wrap">
            <button
              onClick={() => refetch()}
              disabled={isRefetching}
              className="inline-flex items-center gap-2 rounded-xl bg-white/15 hover:bg-white/25 px-4 py-2.5 text-sm font-bold transition backdrop-blur border border-white/20"
            >
              <RefreshCw className={'h-4 w-4 ' + (isRefetching ? 'animate-spin' : '')} />
              Refresh
            </button>
            <Button
              onClick={() => setShowCreateModal(true)}
              className="bg-white text-slate-900 hover:bg-slate-100"
            >
              <Plus className="h-4 w-4" />
              Report Damage
            </Button>
          </div>
        </div>
      </section>

      {/* SUMMARY */}
      {summary && (
        <section className="grid sm:grid-cols-2 lg:grid-cols-4 gap-4">
          <SummaryCard
            label="Reported"
            value={summary.totalReported}
            icon={AlertTriangle}
            color="amber"
          />
          <SummaryCard
            label="Approved"
            value={summary.totalApproved}
            icon={CheckCircle2}
            color="emerald"
          />
          <SummaryCard
            label="Net Loss"
            value={formatPKR(summary.totalNetLoss)}
            sub="Confirmed damages"
            icon={TrendingDown}
            color="rose"
          />
          <SummaryCard
            label="Salvage Value"
            value={formatPKR(summary.totalSalvageValue)}
            sub="Recovered"
            icon={DollarSign}
            color="blue"
          />
        </section>
      )}

      {/* FILTERS */}
      <section className="rounded-3xl bg-white dark:bg-neutral-900 border border-slate-200 dark:border-neutral-800 shadow-sm p-4">
        <div className="flex gap-2 flex-wrap">
          <div className="relative flex-1 min-w-[240px]">
            <Search className="h-4 w-4 text-slate-400 absolute left-3.5 top-1/2 -translate-y-1/2" />
            <input
              className="h-11 w-full rounded-xl border-2 border-slate-200 dark:border-neutral-700 bg-white dark:bg-neutral-800 pl-10 pr-10 text-sm font-semibold focus:outline-none focus:border-rose-500"
              placeholder="Search damage #, product, reason..."
              value={search}
              onChange={(e) => setSearch(e.target.value)}
            />
            {search && (
              <button onClick={() => setSearch('')} className="absolute right-3 top-1/2 -translate-y-1/2 text-slate-400">
                <X className="h-4 w-4" />
              </button>
            )}
          </div>

          <select
            value={statusFilter}
            onChange={(e) => setStatusFilter(e.target.value)}
            className="h-11 px-3 rounded-xl border-2 border-slate-200 dark:border-neutral-700 bg-white dark:bg-neutral-800 text-sm font-bold focus:outline-none focus:border-rose-500"
          >
            <option value="all">All Status</option>
            <option value="REPORTED">Reported</option>
            <option value="APPROVED">Approved</option>
            <option value="REJECTED">Rejected</option>
            <option value="WRITTEN_OFF">Written Off</option>
          </select>

          <select
            value={reasonFilter}
            onChange={(e) => setReasonFilter(e.target.value)}
            className="h-11 px-3 rounded-xl border-2 border-slate-200 dark:border-neutral-700 bg-white dark:bg-neutral-800 text-sm font-bold focus:outline-none focus:border-rose-500"
          >
            <option value="all">All Reasons</option>
            {Object.entries(REASON_LABELS).map(([k, v]) => (
              <option key={k} value={k}>{v}</option>
            ))}
          </select>
        </div>
      </section>

      {/* DAMAGE LIST */}
      {isLoading ? (
        <div className="space-y-2">
          {Array.from({ length: 5 }).map((_, i) => (
            <div key={i} className="h-24 rounded-2xl bg-slate-100 dark:bg-neutral-800 animate-pulse" />
          ))}
        </div>
      ) : filtered.length === 0 ? (
        <div className="rounded-3xl bg-white dark:bg-neutral-900 border-2 border-dashed border-slate-200 dark:border-neutral-800 p-12 text-center">
          <div className="h-20 w-20 rounded-3xl bg-emerald-100 dark:bg-emerald-950/40 mx-auto flex items-center justify-center">
            <CheckCircle2 className="h-10 w-10 text-emerald-600" />
          </div>
          <h3 className="mt-4 text-lg font-extrabold text-slate-900 dark:text-white">
            {search || statusFilter !== 'all' ? 'No damages match' : 'Clean record!'}
          </h3>
          <p className="mt-1 text-sm text-slate-500 font-semibold">
            {search || statusFilter !== 'all' ? 'Try different filters' : 'No damages reported yet'}
          </p>
        </div>
      ) : (
        <div className="rounded-3xl bg-white dark:bg-neutral-900 border border-slate-200 dark:border-neutral-800 shadow-sm overflow-hidden">
          <div className="divide-y divide-slate-100 dark:divide-neutral-800">
            {filtered.map((d) => (
              <DamageRow
                key={d.id}
                damage={d}
                onApprove={() => {
                  if (confirm('Damage "' + d.damageNumber + '" approve karein? Stock adjust ho jayegi.')) {
                    approveMutation.mutate(d.id);
                  }
                }}
                onReject={() => {
                  const reason = prompt('Rejection ka reason?');
                  if (reason !== null) rejectMutation.mutate({ id: d.id, reason });
                }}
              />
            ))}
          </div>
        </div>
      )}

      {showCreateModal && (
        <DamageCreateModal
          onClose={() => setShowCreateModal(false)}
          onCreated={() => {
            setShowCreateModal(false);
            queryClient.invalidateQueries({ queryKey: ['damage-list'] });
            queryClient.invalidateQueries({ queryKey: ['damage-summary'] });
          }}
        />
      )}
    </div>
  );
}

function SummaryCard({ label, value, sub, icon: Icon, color }: any) {
  const colors: Record<string, string> = {
    amber: 'from-amber-500 to-orange-600 shadow-amber-500/30',
    emerald: 'from-emerald-500 to-green-600 shadow-emerald-500/30',
    rose: 'from-rose-500 to-red-600 shadow-rose-500/30',
    blue: 'from-blue-500 to-blue-700 shadow-blue-500/30',
  };
  return (
    <div className="rounded-2xl bg-white dark:bg-neutral-900 border-2 border-slate-200 dark:border-neutral-800 p-5 shadow-sm">
      <div className="flex items-center justify-between">
        <div>
          <div className="text-xs uppercase tracking-wider text-slate-500 font-bold">{label}</div>
          <div className="mt-2 text-2xl font-extrabold text-slate-900 dark:text-white tabular-nums">{value}</div>
          {sub && <div className="text-xs text-slate-600 font-semibold mt-1">{sub}</div>}
        </div>
        <div className={'h-12 w-12 rounded-2xl bg-gradient-to-br ' + colors[color] + ' text-white flex items-center justify-center shadow-lg'}>
          <Icon className="h-6 w-6" />
        </div>
      </div>
    </div>
  );
}

function DamageRow({ damage, onApprove, onReject }: {
  damage: DamageLog;
  onApprove: () => void;
  onReject: () => void;
}) {
  const statusCfg = STATUS_CONFIG[damage.status];
  const StatusIcon = statusCfg.icon;
  const reasonColor = REASON_COLORS[damage.reasonCode];

  return (
    <div className="px-6 py-4 hover:bg-slate-50 dark:hover:bg-neutral-800/50 transition">
      <div className="flex items-start justify-between gap-3 flex-wrap">
        <div className="flex items-start gap-3 min-w-0 flex-1">
          <div className="h-11 w-11 rounded-2xl bg-slate-100 dark:bg-neutral-800 overflow-hidden flex items-center justify-center shrink-0">
            {damage.product?.images?.[0]?.url ? (
              <img src={damage.product.images[0].url} alt="" className="h-full w-full object-cover" />
            ) : (
              <Package className="h-5 w-5 text-slate-400" />
            )}
          </div>

          <div className="min-w-0 flex-1">
            <div className="flex items-center gap-2 flex-wrap">
              <span className="font-mono font-extrabold text-sm text-slate-900 dark:text-white">
                {damage.damageNumber}
              </span>
              <span className={
                'px-2 py-0.5 rounded-full text-[9px] font-extrabold uppercase inline-flex items-center gap-1 ' +
                statusCfg.color
              }>
                <StatusIcon className="h-2.5 w-2.5" />
                {statusCfg.label}
              </span>
              <span className={
                'px-2 py-0.5 rounded-md text-[9px] font-extrabold uppercase border ' + reasonColor
              }>
                {REASON_LABELS[damage.reasonCode]}
              </span>
              {damage.supplierClaim && (
                <span className="px-2 py-0.5 rounded-md text-[9px] font-extrabold bg-blue-100 text-blue-700 border border-blue-300">
                  SUPPLIER CLAIM
                </span>
              )}
            </div>

            <div className="mt-1 font-extrabold text-slate-900 dark:text-white text-sm truncate">
              {damage.product?.name || 'Unknown Product'}
              {damage.variant && (
                <span className="text-violet-700 dark:text-violet-400 font-bold ml-1">
                  ({damage.variant.name})
                </span>
              )}
            </div>

            <div className="flex items-center gap-3 mt-1 text-xs text-slate-500 font-semibold flex-wrap">
              <span>Qty: <strong className="text-slate-700 dark:text-slate-300 tabular-nums">{damage.quantity}</strong></span>
              <span>•</span>
              <span>Cost: <strong className="text-rose-700 dark:text-rose-400 tabular-nums">{formatPKR(damage.costImpact)}</strong></span>
              {damage.salvageValue > 0 && (
                <>
                  <span>•</span>
                  <span>Salvage: <strong className="text-blue-700 tabular-nums">{formatPKR(damage.salvageValue)}</strong></span>
                </>
              )}
              <span>•</span>
              <span className="inline-flex items-center gap-0.5">
                <Calendar className="h-2.5 w-2.5" />
                {new Date(damage.createdAt).toLocaleDateString('en-PK', { day: 'numeric', month: 'short', year: 'numeric' })}
              </span>
            </div>

            <div className="text-xs text-slate-600 dark:text-slate-400 mt-1 italic">
              "{damage.reason}"
            </div>

            {damage.photos?.length > 0 && (
              <div className="mt-2 flex gap-1">
                {damage.photos.slice(0, 4).map((url, i) => (
                  <div key={i} className="h-12 w-12 rounded-lg bg-slate-100 dark:bg-neutral-800 overflow-hidden">
                    <img src={url} alt="" className="h-full w-full object-cover" />
                  </div>
                ))}
                {damage.photos.length > 4 && (
                  <div className="h-12 w-12 rounded-lg bg-slate-100 dark:bg-neutral-800 flex items-center justify-center text-xs font-extrabold text-slate-500">
                    +{damage.photos.length - 4}
                  </div>
                )}
              </div>
            )}
          </div>
        </div>

        <div className="text-right shrink-0">
          <div className="text-2xl font-extrabold text-rose-700 dark:text-rose-400 tabular-nums">
            -{formatPKR(damage.netLoss)}
          </div>
          <div className="text-[10px] uppercase font-extrabold text-slate-500">Net Loss</div>

          {damage.status === 'REPORTED' && (
            <div className="mt-2 flex gap-1 justify-end">
              <button
                onClick={onApprove}
                className="px-3 py-1.5 rounded-lg bg-emerald-600 hover:bg-emerald-700 text-white text-xs font-extrabold inline-flex items-center gap-1 shadow-sm"
              >
                <Check className="h-3 w-3" />
                Approve
              </button>
              <button
                onClick={onReject}
                className="px-3 py-1.5 rounded-lg bg-rose-50 dark:bg-rose-950/40 hover:bg-rose-100 text-rose-700 dark:text-rose-400 text-xs font-extrabold inline-flex items-center gap-1"
              >
                <X className="h-3 w-3" />
                Reject
              </button>
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
