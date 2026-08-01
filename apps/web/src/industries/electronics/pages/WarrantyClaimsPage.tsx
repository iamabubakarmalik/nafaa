import { useState, useMemo } from 'react';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import {
  Shield, Plus, Search, X, Clock, CheckCircle2, XCircle,
  RefreshCw, AlertTriangle, Phone, Mail, Package, Calendar,
  ArrowRight, Eye, Trash2, Sparkles, FileText, Image as ImageIcon,
} from 'lucide-react';
import { toast } from 'sonner';
import { warrantyClaimsApi } from '../api/warranty-claims.api';
import { formatPKR } from '@core/lib/format';
import { Button } from '@core/ui/Button';

const STATUS_META: Record<string, { label: string; color: string; bg: string; icon: any }> = {
  ACTIVE: { label: 'Active', color: 'text-blue-700', bg: 'bg-blue-100', icon: Clock },
  CLAIMED: { label: 'Claimed', color: 'text-amber-700', bg: 'bg-amber-100', icon: AlertTriangle },
  EXPIRED: { label: 'Expired', color: 'text-slate-700', bg: 'bg-slate-100', icon: XCircle },
  VOID: { label: 'Void', color: 'text-rose-700', bg: 'bg-rose-100', icon: XCircle },
  NO_WARRANTY: { label: 'No Warranty', color: 'text-red-700', bg: 'bg-red-100', icon: XCircle },
};

export default function WarrantyClaimsPage() {
  const qc = useQueryClient();
  const [search, setSearch] = useState('');
  const [statusFilter, setStatusFilter] = useState('all');
  const [selected, setSelected] = useState<any>(null);

  const { data: claims = [], isLoading, refetch, isRefetching } = useQuery({
    queryKey: ['warranty-claims-list', statusFilter],
    queryFn: () => warrantyClaimsApi.list({
      status: statusFilter === 'all' ? undefined : statusFilter,
    }),
  });

  const { data: summary } = useQuery({
    queryKey: ['warranty-claims-summary'],
    queryFn: () => warrantyClaimsApi.summary(),
  });

  const filtered = useMemo(() => {
    const q = search.toLowerCase().trim();
    if (!q) return claims;
    return claims.filter((c) =>
      c.claimNumber.toLowerCase().includes(q) ||
      c.customerName.toLowerCase().includes(q) ||
      c.productName.toLowerCase().includes(q) ||
      (c.serialNumber || '').toLowerCase().includes(q) ||
      (c.imei || '').toLowerCase().includes(q)
    );
  }, [claims, search]);

  const remove = useMutation({
    mutationFn: (id: string) => warrantyClaimsApi.remove(id),
    onSuccess: () => {
      toast.success('Claim deleted');
      qc.invalidateQueries({ queryKey: ['warranty-claims-list'] });
    },
  });

  return (
    <div className="space-y-5">
      {selected && (
        <ClaimDetailModal claim={selected} onClose={() => setSelected(null)}
          onUpdate={() => { qc.invalidateQueries({ queryKey: ['warranty-claims-list'] }); qc.invalidateQueries({ queryKey: ['warranty-claims-summary'] }); }} />
      )}

      {/* HERO */}
      <section className="relative overflow-hidden rounded-3xl bg-gradient-to-br from-slate-950 via-rose-900 to-red-700 text-white p-6 shadow-2xl">
        <div className="absolute -top-20 -right-20 h-64 w-64 rounded-full bg-rose-400/20 blur-3xl" />
        <div className="relative flex items-start justify-between gap-4 flex-wrap">
          <div>
            <div className="inline-flex items-center gap-2 rounded-full bg-white/15 backdrop-blur px-3 py-1 text-xs font-extrabold border border-white/20">
              <Shield className="h-3.5 w-3.5 text-amber-300" /> Warranty Claims
            </div>
            <h1 className="mt-3 text-3xl sm:text-4xl font-extrabold leading-tight">🛡️ Warranty Claims</h1>
            <p className="mt-2 text-sm text-white/80">
              {summary?.pendingCount ?? 0} pending • {summary?.resolvedCount ?? 0} resolved • {summary?.totalCount ?? 0} total
            </p>
          </div>
          <div className="flex gap-2 flex-wrap">
            <button onClick={() => refetch()} disabled={isRefetching}
              className="inline-flex items-center gap-2 rounded-xl bg-white/10 hover:bg-white/20 px-4 py-2.5 text-sm font-bold">
              <RefreshCw className={`h-4 w-4 ${isRefetching ? 'animate-spin' : ''}`} /> Refresh
            </button>
          </div>
        </div>
      </section>

      {/* STATS */}
      {summary && (
        <section className="grid grid-cols-2 lg:grid-cols-4 gap-3">
          <StatCard label="Total Claims" value={summary.totalCount ?? 0} icon={Shield} tone="blue" />
          <StatCard label="Pending" value={summary.pendingCount ?? 0} icon={Clock} tone="amber" />
          <StatCard label="Resolved" value={summary.resolvedCount ?? 0} icon={CheckCircle2} tone="emerald" />
          <StatCard label="This Month" value={summary.thisMonthCount ?? 0} icon={Calendar} tone="violet" />
        </section>
      )}

      {/* TOOLBAR */}
      <section className="rounded-3xl bg-white border-2 border-slate-200 shadow-sm p-4 space-y-3">
        <div className="relative">
          <Search className="h-5 w-5 text-slate-400 absolute left-3.5 top-1/2 -translate-y-1/2" />
          <input value={search} onChange={(e) => setSearch(e.target.value)}
            placeholder="Claim #, customer, product, serial..."
            className="h-12 w-full rounded-2xl border-2 border-slate-200 bg-white pl-11 pr-10 text-sm font-semibold focus:outline-none focus:border-rose-500 focus:ring-2 focus:ring-rose-200" />
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
            { v: 'CLAIMED', l: 'Pending' },
            { v: 'EXPIRED', l: 'Expired' },
            { v: 'VOID', l: 'Void' },
          ].map((o) => (
            <button key={o.v} onClick={() => setStatusFilter(o.v)}
              className={['shrink-0 px-3 py-1.5 rounded-lg text-xs font-extrabold transition',
                statusFilter === o.v ? 'bg-rose-600 text-white shadow-sm' : 'text-slate-600 hover:text-slate-900'].join(' ')}>
              {o.l}
            </button>
          ))}
        </div>
      </section>

      {/* LIST */}
      {isLoading ? (
        <div className="space-y-2">
          {Array.from({ length: 4 }).map((_, i) => <div key={i} className="h-32 rounded-2xl bg-slate-100 animate-pulse" />)}
        </div>
      ) : filtered.length === 0 ? (
        <div className="rounded-3xl bg-white border-2 border-dashed border-slate-300 p-16 text-center">
          <Shield className="h-16 w-16 text-slate-300 mx-auto mb-3" />
          <h3 className="text-lg font-extrabold text-slate-900">
            {statusFilter === 'all' ? 'No warranty claims yet' : 'No claims match filter'}
          </h3>
          <p className="text-sm text-slate-500 font-semibold mt-1">
            {statusFilter === 'all' ? 'Claims will appear here when customers report issues' : 'Change filter'}
          </p>
        </div>
      ) : (
        <div className="space-y-3">
          {filtered.map((claim) => (
            <ClaimCard key={claim.id} claim={claim} onView={() => setSelected(claim)}
              onDelete={() => { if (confirm(`Delete claim ${claim.claimNumber}?`)) remove.mutate(claim.id); }} />
          ))}
        </div>
      )}
    </div>
  );
}

function ClaimCard({ claim, onView, onDelete }: any) {
  const meta = STATUS_META[claim.status] || STATUS_META.ACTIVE;
  const StatusIcon = meta.icon;

  return (
    <div className="rounded-2xl bg-white border-2 border-slate-200 shadow-sm p-4 hover:shadow-md transition">
      <div className="flex items-start gap-4 flex-wrap sm:flex-nowrap">
        <div className={`h-14 w-14 rounded-2xl ${meta.bg} flex items-center justify-center shrink-0`}>
          <StatusIcon className={`h-6 w-6 ${meta.color}`} />
        </div>

        <div className="flex-1 min-w-0">
          <div className="flex items-center gap-2 flex-wrap">
            <span className="font-mono font-extrabold text-slate-900 text-sm">{claim.claimNumber}</span>
            <span className={`px-2 py-0.5 rounded-full text-[9px] font-extrabold uppercase inline-flex items-center gap-1 ${meta.bg} ${meta.color}`}>
              <StatusIcon className="h-2.5 w-2.5" /> {meta.label}
            </span>
            {claim.sentToBrand && (
              <span className="px-2 py-0.5 rounded-full bg-blue-100 text-blue-700 text-[9px] font-extrabold">Sent to Brand</span>
            )}
          </div>

          <div className="mt-1 font-extrabold text-slate-900 text-sm truncate">{claim.productName}</div>

          <div className="flex items-center gap-3 mt-2 text-xs text-slate-600 font-bold flex-wrap">
            <span>👤 {claim.customerName}</span>
            {claim.customerPhone && (<><span className="text-slate-300">•</span><span>📞 {claim.customerPhone}</span></>)}
            {claim.serialNumber && (<><span className="text-slate-300">•</span><span className="font-mono">S/N: {claim.serialNumber}</span></>)}
            {claim.imei && (<><span className="text-slate-300">•</span><span className="font-mono">IMEI: {claim.imei}</span></>)}
          </div>

          <div className="mt-1 text-xs text-slate-500 font-semibold italic line-clamp-1">
            "{claim.issueDescription}"
          </div>

          <div className="flex items-center gap-3 mt-1.5 text-[10px] text-slate-500 font-bold">
            <span className="inline-flex items-center gap-0.5">
              <Calendar className="h-2.5 w-2.5" />
              {new Date(claim.claimDate).toLocaleDateString('en-PK', { day: 'numeric', month: 'short', year: 'numeric' })}
            </span>
            {claim.imageUrls?.length > 0 && (
              <span className="inline-flex items-center gap-0.5">
                <ImageIcon className="h-2.5 w-2.5" /> {claim.imageUrls.length} photos
              </span>
            )}
          </div>
        </div>

        <div className="text-right shrink-0">
          {(claim.refundAmount > 0 || claim.repairCost > 0) && (
            <div>
              <div className="text-[10px] uppercase font-extrabold text-slate-500">Cost</div>
              <div className="text-lg font-extrabold text-slate-900 tabular-nums">
                {formatPKR(claim.refundAmount + claim.repairCost)}
              </div>
            </div>
          )}
          <div className="mt-2 flex gap-1 justify-end">
            <button onClick={onView}
              className="h-9 px-3 rounded-lg bg-blue-50 hover:bg-blue-100 text-blue-700 text-xs font-extrabold inline-flex items-center gap-1">
              <Eye className="h-3.5 w-3.5" /> View
            </button>
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

function ClaimDetailModal({ claim, onClose, onUpdate }: any) {
  const [status, setStatus] = useState(claim.status);
  const [diagnosis, setDiagnosis] = useState(claim.diagnosis || '');
  const [resolution, setResolution] = useState(claim.resolution || '');

  const update = useMutation({
    mutationFn: () => warrantyClaimsApi.updateStatus(claim.id, { status, diagnosis, resolution }),
    onSuccess: () => {
      toast.success('Updated');
      onUpdate();
      onClose();
    },
  });

  return (
    <div className="fixed inset-0 z-50 bg-slate-950/80 backdrop-blur-sm flex items-center justify-center p-4">
      <div className="w-full max-w-3xl bg-white rounded-3xl shadow-2xl overflow-hidden max-h-[92vh] flex flex-col">
        <div className="shrink-0 px-5 py-4 bg-gradient-to-br from-rose-600 to-red-700 text-white flex items-center justify-between">
          <div>
            <div className="text-[10px] uppercase font-extrabold text-white/70 tracking-wider">Warranty Claim</div>
            <h3 className="text-xl font-extrabold font-mono">{claim.claimNumber}</h3>
          </div>
          <button onClick={onClose} className="h-11 w-11 rounded-2xl bg-white/15 hover:bg-white/25 flex items-center justify-center">
            <X className="h-5 w-5" />
          </button>
        </div>

        <div className="flex-1 overflow-y-auto p-5 space-y-4">
          <div className="grid sm:grid-cols-2 gap-4">
            <InfoBox label="Product" value={claim.productName} />
            <InfoBox label="Customer" value={claim.customerName} />
            {claim.customerPhone && <InfoBox label="Phone" value={claim.customerPhone} />}
            {claim.customerEmail && <InfoBox label="Email" value={claim.customerEmail} />}
            {claim.serialNumber && <InfoBox label="Serial" value={claim.serialNumber} mono />}
            {claim.imei && <InfoBox label="IMEI" value={claim.imei} mono />}
            {claim.invoiceNumber && <InfoBox label="Invoice" value={claim.invoiceNumber} />}
            <InfoBox label="Purchase Date" value={new Date(claim.purchaseDate).toLocaleDateString('en-PK')} />
          </div>

          <div>
            <label className="block text-xs font-extrabold uppercase text-slate-600 mb-1.5">Issue Description</label>
            <div className="rounded-xl bg-slate-50 border-2 border-slate-200 p-3 text-sm font-semibold text-slate-700">
              {claim.issueDescription}
            </div>
          </div>

          {claim.imageUrls?.length > 0 && (
            <div>
              <label className="block text-xs font-extrabold uppercase text-slate-600 mb-2">Photos ({claim.imageUrls.length})</label>
              <div className="grid grid-cols-4 gap-2">
                {claim.imageUrls.map((url: string, i: number) => (
                  <a key={i} href={url} target="_blank" rel="noreferrer" className="aspect-square rounded-xl overflow-hidden border-2 border-slate-200 hover:border-rose-400">
                    <img src={url} alt="" className="w-full h-full object-cover" />
                  </a>
                ))}
              </div>
            </div>
          )}

          <div>
            <label className="block text-xs font-extrabold uppercase text-slate-600 mb-1.5">Status</label>
            <select value={status} onChange={(e) => setStatus(e.target.value as any)}
              className="h-11 w-full rounded-xl border-2 border-slate-200 bg-white px-3 text-sm font-bold focus:outline-none focus:border-rose-500">
              {Object.entries(STATUS_META).map(([k, v]) => <option key={k} value={k}>{v.label}</option>)}
            </select>
          </div>

          <div>
            <label className="block text-xs font-extrabold uppercase text-slate-600 mb-1.5">Diagnosis</label>
            <textarea rows={3} value={diagnosis} onChange={(e) => setDiagnosis(e.target.value)}
              placeholder="Diagnosis details..."
              className="w-full rounded-xl border-2 border-slate-200 px-3 py-2 text-sm font-semibold focus:outline-none focus:border-rose-500" />
          </div>

          <div>
            <label className="block text-xs font-extrabold uppercase text-slate-600 mb-1.5">Resolution</label>
            <textarea rows={3} value={resolution} onChange={(e) => setResolution(e.target.value)}
              placeholder="How was it resolved..."
              className="w-full rounded-xl border-2 border-slate-200 px-3 py-2 text-sm font-semibold focus:outline-none focus:border-rose-500" />
          </div>
        </div>

        <div className="shrink-0 px-5 py-3 border-t-2 border-slate-100 bg-slate-50 flex gap-2">
          <Button variant="secondary" className="flex-1" onClick={onClose}>Close</Button>
          <Button className="flex-1 bg-gradient-to-r from-rose-600 to-red-700"
            onClick={() => update.mutate()} loading={update.isPending}>
            Update Claim
          </Button>
        </div>
      </div>
    </div>
  );
}

function StatCard({ label, value, icon: Icon, tone }: any) {
  const tones: Record<string, string> = {
    blue: 'from-blue-500 to-blue-700',
    amber: 'from-amber-500 to-orange-600',
    emerald: 'from-emerald-500 to-emerald-700',
    violet: 'from-violet-500 to-purple-700',
  };
  return (
    <div className="rounded-2xl bg-white border-2 border-slate-200 p-4 shadow-sm">
      <div className="flex items-center justify-between gap-2">
        <div>
          <div className="text-[10px] uppercase font-extrabold text-slate-500">{label}</div>
          <div className="text-2xl font-extrabold text-slate-900 tabular-nums mt-1">{value}</div>
        </div>
        <div className={`h-10 w-10 rounded-xl bg-gradient-to-br ${tones[tone]} text-white flex items-center justify-center shadow-md`}>
          <Icon className="h-4 w-4" />
        </div>
      </div>
    </div>
  );
}

function InfoBox({ label, value, mono }: any) {
  return (
    <div className="rounded-xl bg-slate-50 border-2 border-slate-200 p-3">
      <div className="text-[10px] uppercase font-extrabold text-slate-500">{label}</div>
      <div className={['text-sm font-extrabold text-slate-900 mt-0.5', mono ? 'font-mono' : ''].join(' ')}>{value}</div>
    </div>
  );
}
