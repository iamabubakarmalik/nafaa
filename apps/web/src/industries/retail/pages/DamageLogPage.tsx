import { useState, useMemo } from 'react';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import {
  AlertTriangle, Plus, Search, X, Check, RefreshCw, TrendingDown,
  CheckCircle2, XCircle, DollarSign, ShieldAlert, Package, Calendar,
  Image as ImageIcon, Filter, Download, Eye, ChevronDown, ChevronUp,
} from 'lucide-react';
import { damageApi, type DamageLog, type DamageReasonCode } from '../api/damage.api';
import { formatPKR, formatPKRFull } from '@core/lib/format';
import { DamageCreateModal } from '../components/DamageCreateModal';
import { Button } from '@core/ui/Button';
import { toast } from 'sonner';
import { useCostHidden, PrivacyToggle } from '@core/ui/HiddenValue';

const REASON_META: Record<DamageReasonCode, { label: string; emoji: string; color: string }> = {
  EXPIRY: { label: 'Expired', emoji: '⏰', color: 'amber' },
  BREAKAGE: { label: 'Toota Hua', emoji: '💔', color: 'orange' },
  SPOILAGE: { label: 'Kharaab', emoji: '🤢', color: 'lime' },
  PEST_DAMAGE: { label: 'Keeray', emoji: '🪲', color: 'rose' },
  WATER_DAMAGE: { label: 'Pani se kharab', emoji: '💧', color: 'blue' },
  THEFT: { label: 'Chori', emoji: '🚨', color: 'red' },
  MISHANDLING: { label: 'Ghalat rakha', emoji: '📉', color: 'slate' },
  MANUFACTURING_DEFECT: { label: 'Company defect', emoji: '🏭', color: 'violet' },
  OTHER: { label: 'Aur', emoji: '❓', color: 'slate' },
};

const REASON_TONES: Record<string, string> = {
  amber: 'bg-amber-100 text-amber-800 border-amber-300',
  orange: 'bg-orange-100 text-orange-800 border-orange-300',
  lime: 'bg-lime-100 text-lime-800 border-lime-300',
  rose: 'bg-rose-100 text-rose-800 border-rose-300',
  blue: 'bg-blue-100 text-blue-800 border-blue-300',
  red: 'bg-red-100 text-red-800 border-red-300',
  slate: 'bg-slate-100 text-slate-800 border-slate-300',
  violet: 'bg-violet-100 text-violet-800 border-violet-300',
};

const STATUS_CONFIG: Record<string, { label: string; color: string; icon: any }> = {
  REPORTED: { label: 'Report Hua', color: 'bg-amber-500 text-white', icon: AlertTriangle },
  APPROVED: { label: 'Manzoor', color: 'bg-emerald-500 text-white', icon: CheckCircle2 },
  REJECTED: { label: 'Rad', color: 'bg-rose-500 text-white', icon: XCircle },
  WRITTEN_OFF: { label: 'Written Off', color: 'bg-slate-600 text-white', icon: ShieldAlert },
};

export default function DamageLogPage() {
  const queryClient = useQueryClient();
  const hideCost = useCostHidden();
  const [search, setSearch] = useState('');
  const [statusFilter, setStatusFilter] = useState<string>('all');
  const [reasonFilter, setReasonFilter] = useState<string>('all');
  const [showCreateModal, setShowCreateModal] = useState(false);
  const [expandedId, setExpandedId] = useState<string | null>(null);

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
      toast.success('Damage manzoor — stock adjust ho gaya');
      queryClient.invalidateQueries({ queryKey: ['damage-list'] });
      queryClient.invalidateQueries({ queryKey: ['damage-summary'] });
      queryClient.invalidateQueries({ queryKey: ['retail-products'] });
    },
    onError: (e: any) => toast.error(e?.response?.data?.message || 'Approval fail'),
  });

  const rejectMutation = useMutation({
    mutationFn: ({ id, reason }: { id: string; reason?: string }) => damageApi.reject(id, reason),
    onSuccess: () => {
      toast.success('Damage rad kar diya');
      queryClient.invalidateQueries({ queryKey: ['damage-list'] });
      queryClient.invalidateQueries({ queryKey: ['damage-summary'] });
    },
  });

  const filtered = useMemo(() => {
    if (!search.trim()) return damages;
    const q = search.toLowerCase();
    return damages.filter((d) =>
      d.damageNumber.toLowerCase().includes(q) ||
      d.product?.name?.toLowerCase().includes(q) ||
      d.reason.toLowerCase().includes(q)
    );
  }, [damages, search]);

  const stats = useMemo(() => {
    const pending = damages.filter((d) => d.status === 'REPORTED');
    return {
      pending: pending.length,
      pendingLoss: pending.reduce((a, d) => a + Number(d.netLoss || 0), 0),
    };
  }, [damages]);

  const exportCSV = () => {
    if (filtered.length === 0) return toast.error('Koi data nahi');
    const head = ['Damage #', 'Date', 'Product', 'Qty', 'Reason', 'Status', 'Cost Loss', 'Salvage', 'Net Loss', 'Notes'];
    const rows = filtered.map((d) => [
      d.damageNumber,
      new Date(d.createdAt).toLocaleDateString('en-PK'),
      d.product?.name || '',
      d.quantity,
      REASON_META[d.reasonCode]?.label || d.reasonCode,
      d.status,
      d.costImpact.toFixed(2),
      d.salvageValue.toFixed(2),
      d.netLoss.toFixed(2),
      d.reason,
    ]);
    const csv = [head, ...rows].map((r) => r.map((c) => `"${String(c).replace(/"/g, '""')}"`).join(',')).join('\n');
    const blob = new Blob(['\ufeff' + csv], { type: 'text/csv;charset=utf-8' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = `damage-log-${new Date().toISOString().slice(0, 10)}.csv`;
    a.click();
    URL.revokeObjectURL(url);
    toast.success('Export ho gaya');
  };

  return (
    <div className="space-y-5">
      {/* HERO */}
      <section className="relative overflow-hidden rounded-3xl bg-gradient-to-br from-slate-950 via-rose-900 to-red-700 text-white p-6 shadow-2xl">
        <div className="absolute -top-20 -right-20 h-64 w-64 rounded-full bg-rose-400/20 blur-3xl" />
        <div className="absolute -bottom-20 -left-20 h-64 w-64 rounded-full bg-amber-400/15 blur-3xl" />

        <div className="relative flex items-start justify-between gap-4 flex-wrap">
          <div>
            <div className="inline-flex items-center gap-2 rounded-full bg-white/15 backdrop-blur px-3 py-1 text-xs font-extrabold border border-white/20">
              <ShieldAlert className="h-3.5 w-3.5 text-amber-300" /> Damage & Wastage
            </div>
            <h1 className="mt-3 text-3xl sm:text-4xl font-extrabold leading-tight">🛡️ Damage Tracking</h1>
            <p className="mt-2 text-sm text-white/80">
              {stats.pending > 0 ? (
                <>
                  <strong className="text-amber-300">{stats.pending} damage</strong> approval ka intezaar —{' '}
                  {!hideCost && <>net loss <strong className="text-rose-300">{formatPKR(stats.pendingLoss)}</strong></>}
                </>
              ) : (
                <>Kharaab / toota maal report karo, stock accurate rakho</>
              )}
            </p>
          </div>
          <div className="flex gap-2 flex-wrap">
            <button
              onClick={() => refetch()}
              disabled={isRefetching}
              className="inline-flex items-center gap-2 rounded-xl bg-white/10 hover:bg-white/20 px-4 py-2.5 text-sm font-bold backdrop-blur disabled:opacity-50"
            >
              <RefreshCw className={`h-4 w-4 ${isRefetching ? 'animate-spin' : ''}`} /> Refresh
            </button>
            <PrivacyToggle />
            <button
              onClick={exportCSV}
              className="inline-flex items-center gap-2 rounded-xl bg-white/15 hover:bg-white/25 px-4 py-2.5 text-sm font-bold backdrop-blur border border-white/20"
            >
              <Download className="h-4 w-4" /> Export
            </button>
            <Button
              onClick={() => setShowCreateModal(true)}
              className="bg-white text-slate-900 hover:bg-slate-100"
            >
              <Plus className="h-4 w-4" /> Damage Report Karo
            </Button>
          </div>
        </div>
      </section>

      {/* KPIs */}
      {summary && (
        <section className="grid grid-cols-2 lg:grid-cols-4 gap-3">
          <Kpi label="Reported" value={summary.totalReported ?? 0} sub={`${stats.pending} pending`} icon={AlertTriangle} tone="amber" />
          <Kpi label="Approved" value={summary.totalApproved ?? 0} sub="Confirmed" icon={CheckCircle2} tone="emerald" />
          <Kpi
            label="Net Loss"
            value={hideCost ? '••••' : formatPKR(summary.totalNetLoss ?? 0)}
            sub={hideCost ? 'PIN se dekho' : 'Confirmed damages'}
            icon={TrendingDown}
            tone="rose"
          />
          <Kpi
            label="Salvage"
            value={hideCost ? '••••' : formatPKR(summary.totalSalvageValue ?? 0)}
            sub="Bacha hua"
            icon={DollarSign}
            tone="blue"
          />
        </section>
      )}

      {/* TOOLBAR */}
      <section className="rounded-3xl bg-white border-2 border-slate-200 shadow-sm p-4 space-y-3">
        <div className="flex gap-2 flex-wrap">
          <div className="relative flex-1 min-w-[240px]">
            <Search className="h-5 w-5 text-slate-400 absolute left-3.5 top-1/2 -translate-y-1/2" />
            <input
              value={search}
              onChange={(e) => setSearch(e.target.value)}
              placeholder="Damage #, product, reason..."
              className="h-12 w-full rounded-2xl border-2 border-slate-200 bg-white pl-11 pr-10 text-sm font-semibold focus:outline-none focus:border-rose-500 focus:ring-2 focus:ring-rose-200"
            />
            {search && (
              <button onClick={() => setSearch('')} className="absolute right-3 top-1/2 -translate-y-1/2 h-7 w-7 rounded-lg hover:bg-slate-100 flex items-center justify-center">
                <X className="h-4 w-4" />
              </button>
            )}
          </div>
        </div>

        <div className="flex gap-1.5 flex-wrap items-center">
          <div className="flex gap-1 bg-slate-100 rounded-xl p-1">
            {[
              { v: 'all', l: 'Sab' },
              { v: 'REPORTED', l: 'Pending' },
              { v: 'APPROVED', l: 'Manzoor' },
              { v: 'REJECTED', l: 'Rad' },
            ].map((o) => (
              <button
                key={o.v}
                onClick={() => setStatusFilter(o.v)}
                className={`px-3 py-1.5 rounded-lg text-xs font-extrabold transition ${
                  statusFilter === o.v ? 'bg-rose-600 text-white shadow-sm' : 'text-slate-600 hover:text-slate-900'
                }`}
              >
                {o.l}
              </button>
            ))}
          </div>

          <select
            value={reasonFilter}
            onChange={(e) => setReasonFilter(e.target.value)}
            className="h-10 rounded-xl border-2 border-slate-200 bg-white px-3 text-xs font-bold focus:outline-none focus:border-rose-500"
          >
            <option value="all">Sab reasons</option>
            {Object.entries(REASON_META).map(([k, m]) => (
              <option key={k} value={k}>{m.emoji} {m.label}</option>
            ))}
          </select>

          <div className="ml-auto text-xs font-extrabold text-slate-500">
            {filtered.length} damages
          </div>
        </div>
      </section>

      {/* LIST */}
      {isLoading ? (
        <div className="space-y-2">
          {[1, 2, 3, 4].map((i) => <div key={i} className="h-28 rounded-2xl bg-slate-100 animate-pulse" />)}
        </div>
      ) : filtered.length === 0 ? (
        <div className="rounded-3xl bg-white border-2 border-dashed border-slate-200 p-16 text-center">
          <div className="h-20 w-20 rounded-3xl bg-gradient-to-br from-emerald-100 to-teal-200 mx-auto flex items-center justify-center">
            <CheckCircle2 className="h-10 w-10 text-emerald-600" />
          </div>
          <h3 className="mt-4 text-lg font-extrabold text-slate-900">
            {search || statusFilter !== 'all' || reasonFilter !== 'all' ? 'Kuch nahi mila' : 'Alhamdulillah! Koi damage nahi'}
          </h3>
          <p className="mt-1 text-sm text-slate-500 font-semibold">
            {search || statusFilter !== 'all' ? 'Filter change karo' : 'Ab tak koi damage report nahi hua'}
          </p>
        </div>
      ) : (
        <div className="rounded-3xl bg-white border-2 border-slate-200 shadow-sm overflow-hidden">
          <div className="divide-y-2 divide-slate-100">
            {filtered.map((d) => (
              <DamageRow
                key={d.id}
                damage={d}
                expanded={expandedId === d.id}
                hideCost={hideCost}
                onToggleExpand={() => setExpandedId(expandedId === d.id ? null : d.id)}
                onApprove={() => {
                  if (confirm(`"${d.damageNumber}" manzoor karein? Stock adjust ho jayegi.`)) {
                    approveMutation.mutate(d.id);
                  }
                }}
                onReject={() => {
                  const reason = prompt('Rad karne ka reason?');
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

/* ══════════ ROW ══════════ */
function DamageRow({ damage, expanded, hideCost, onToggleExpand, onApprove, onReject }: {
  damage: DamageLog;
  expanded: boolean;
  hideCost: boolean;
  onToggleExpand: () => void;
  onApprove: () => void;
  onReject: () => void;
}) {
  const statusCfg = STATUS_CONFIG[damage.status];
  const StatusIcon = statusCfg.icon;
  const reasonMeta = REASON_META[damage.reasonCode];
  const reasonTone = REASON_TONES[reasonMeta.color];

  return (
    <div className="hover:bg-slate-50/60 transition">
      <div className="px-5 py-4">
        <div className="flex items-start justify-between gap-3 flex-wrap">
          <div className="flex items-start gap-3 min-w-0 flex-1">
            <div className="h-12 w-12 rounded-xl bg-slate-100 overflow-hidden flex items-center justify-center shrink-0 border border-slate-200">
              {damage.product?.images?.[0]?.url ? (
                <img src={damage.product.images[0].url} alt="" loading="lazy" className="h-full w-full object-cover" />
              ) : (
                <Package className="h-5 w-5 text-slate-400" />
              )}
            </div>

            <div className="min-w-0 flex-1">
              <div className="flex items-center gap-2 flex-wrap">
                <span className="font-mono font-extrabold text-sm text-slate-900">{damage.damageNumber}</span>
                <span className={`px-2 py-0.5 rounded-full text-[9px] font-extrabold uppercase inline-flex items-center gap-1 ${statusCfg.color}`}>
                  <StatusIcon className="h-2.5 w-2.5" /> {statusCfg.label}
                </span>
                <span className={`px-2 py-0.5 rounded-md text-[9px] font-extrabold border ${reasonTone}`}>
                  {reasonMeta.emoji} {reasonMeta.label}
                </span>
                {damage.supplierClaim && (
                  <span className="px-2 py-0.5 rounded-md text-[9px] font-extrabold bg-blue-100 text-blue-700 border border-blue-300">
                    SUPPLIER CLAIM
                  </span>
                )}
              </div>

              <div className="mt-1 font-extrabold text-slate-900 text-sm truncate">
                {damage.product?.name || 'Product'}
                {damage.variant && (<span className="text-violet-700 font-bold ml-1">({damage.variant.name})</span>)}
              </div>

              <div className="flex items-center gap-3 mt-1 text-xs text-slate-600 font-bold flex-wrap">
                <span>Qty: <strong className="text-slate-900 tabular-nums">{damage.quantity}</strong></span>
                {!hideCost && (
                  <>
                    <span className="text-slate-300">•</span>
                    <span>Cost: <strong className="text-rose-700 tabular-nums">{formatPKR(damage.costImpact)}</strong></span>
                    {damage.salvageValue > 0 && (
                      <>
                        <span className="text-slate-300">•</span>
                        <span>Bacha: <strong className="text-blue-700 tabular-nums">{formatPKR(damage.salvageValue)}</strong></span>
                      </>
                    )}
                  </>
                )}
                <span className="text-slate-300">•</span>
                <span className="inline-flex items-center gap-0.5">
                  <Calendar className="h-2.5 w-2.5" />
                  {new Date(damage.createdAt).toLocaleDateString('en-PK', { day: 'numeric', month: 'short', year: 'numeric' })}
                </span>
              </div>

              <div className="text-xs text-slate-700 mt-1 italic line-clamp-1">
                "{damage.reason}"
              </div>
            </div>
          </div>

          <div className="text-right shrink-0">
            {!hideCost ? (
              <>
                <div className="text-2xl font-extrabold text-rose-700 tabular-nums">
                  -{formatPKR(damage.netLoss)}
                </div>
                <div className="text-[10px] uppercase font-extrabold text-slate-500">Net Loss</div>
              </>
            ) : (
              <div className="text-lg font-extrabold text-slate-400 tabular-nums">••••</div>
            )}

            <div className="mt-2 flex gap-1 justify-end">
              {damage.photos?.length > 0 && (
                <button
                  onClick={onToggleExpand}
                  title="Photos"
                  className="h-8 w-8 rounded-lg bg-slate-100 hover:bg-slate-200 text-slate-600 flex items-center justify-center relative"
                >
                  <ImageIcon className="h-3.5 w-3.5" />
                  <span className="absolute -top-1 -right-1 h-4 w-4 rounded-full bg-slate-900 text-white text-[9px] font-extrabold flex items-center justify-center">
                    {damage.photos.length}
                  </span>
                </button>
              )}

              {damage.status === 'REPORTED' && (
                <>
                  <button
                    onClick={onApprove}
                    className="px-3 py-1.5 rounded-lg bg-emerald-600 hover:bg-emerald-700 text-white text-xs font-extrabold inline-flex items-center gap-1 shadow-sm"
                  >
                    <Check className="h-3 w-3" /> Manzoor
                  </button>
                  <button
                    onClick={onReject}
                    title="Rad karo"
                    className="h-8 w-8 rounded-lg bg-rose-50 hover:bg-rose-100 text-rose-700 flex items-center justify-center"
                  >
                    <X className="h-3.5 w-3.5" />
                  </button>
                </>
              )}
            </div>
          </div>
        </div>

        {/* Expanded photos */}
        {expanded && damage.photos?.length > 0 && (
          <div className="mt-4 pt-4 border-t-2 border-slate-100">
            <div className="text-[10px] uppercase tracking-wider font-extrabold text-slate-600 mb-2">
              Photos ({damage.photos.length})
            </div>
            <div className="grid grid-cols-4 sm:grid-cols-6 gap-2">
              {damage.photos.map((url, i) => (
                <a
                  key={i}
                  href={url}
                  target="_blank"
                  rel="noreferrer"
                  className="aspect-square rounded-xl bg-slate-100 overflow-hidden border-2 border-slate-200 hover:border-rose-400 hover:shadow-md transition"
                >
                  <img src={url} alt={`photo-${i}`} loading="lazy" className="h-full w-full object-cover" />
                </a>
              ))}
            </div>
            {damage.notes && (
              <div className="mt-3 rounded-xl bg-slate-50 border border-slate-200 p-3">
                <div className="text-[10px] uppercase font-extrabold text-slate-500 mb-1">Notes</div>
                <div className="text-xs text-slate-700 font-semibold">{damage.notes}</div>
              </div>
            )}
          </div>
        )}
      </div>
    </div>
  );
}

/* ══════════ KPI ══════════ */
function Kpi({ label, value, sub, icon: Icon, tone }: any) {
  const tones: Record<string, string> = {
    amber: 'from-amber-500 to-orange-600 shadow-amber-500/30',
    emerald: 'from-emerald-500 to-emerald-700 shadow-emerald-500/30',
    rose: 'from-rose-500 to-red-600 shadow-rose-500/30',
    blue: 'from-blue-500 to-blue-700 shadow-blue-500/30',
  };
  return (
    <div className="rounded-2xl bg-white border-2 border-slate-200 p-4 shadow-sm hover:shadow-md transition">
      <div className="flex items-center justify-between gap-2">
        <div className="min-w-0">
          <div className="text-[10px] uppercase tracking-wider text-slate-500 font-extrabold">{label}</div>
          <div className="mt-1.5 text-xl font-extrabold text-slate-900 tabular-nums truncate">{value}</div>
          {sub && <div className="text-[10px] text-slate-500 font-bold mt-0.5 truncate">{sub}</div>}
        </div>
        <div className={`h-11 w-11 rounded-2xl bg-gradient-to-br ${tones[tone]} text-white flex items-center justify-center shadow-lg shrink-0`}>
          <Icon className="h-5 w-5" />
        </div>
      </div>
    </div>
  );
}
