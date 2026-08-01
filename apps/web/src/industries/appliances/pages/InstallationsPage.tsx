import { useState, useMemo } from 'react';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import {
  HardHat, Search, X, RefreshCw, Calendar, Clock, CheckCircle2,
  MapPin, Phone, User, ArrowRight, Filter, AlertTriangle,
  Eye, Play, XCircle, RotateCw, Award, Zap,
} from 'lucide-react';
import { toast } from 'sonner';
import { installationsApi, type ApplianceInstallationStatus } from '../api/installations.api';
import { techniciansApi } from '../api/technicians.api';
import { formatPKR } from '@core/lib/format';
import { Button } from '@core/ui/Button';

const STATUS_META: Record<ApplianceInstallationStatus, { label: string; color: string; bg: string; icon: any }> = {
  PENDING: { label: 'Pending', color: 'text-slate-700', bg: 'bg-slate-100', icon: Clock },
  SCHEDULED: { label: 'Scheduled', color: 'text-amber-700', bg: 'bg-amber-100', icon: Calendar },
  ASSIGNED: { label: 'Assigned', color: 'text-blue-700', bg: 'bg-blue-100', icon: User },
  IN_PROGRESS: { label: 'In Progress', color: 'text-cyan-700', bg: 'bg-cyan-100', icon: Play },
  COMPLETED: { label: 'Completed', color: 'text-emerald-700', bg: 'bg-emerald-100', icon: CheckCircle2 },
  RESCHEDULED: { label: 'Rescheduled', color: 'text-violet-700', bg: 'bg-violet-100', icon: RotateCw },
  CANCELLED: { label: 'Cancelled', color: 'text-rose-700', bg: 'bg-rose-100', icon: XCircle },
  FAILED: { label: 'Failed', color: 'text-red-700', bg: 'bg-red-100', icon: AlertTriangle },
};

export default function InstallationsPage() {
  const qc = useQueryClient();
  const [search, setSearch] = useState('');
  const [statusFilter, setStatusFilter] = useState<string>('all');
  const [selected, setSelected] = useState<any>(null);

  const { data: installs = [], isLoading, refetch, isRefetching } = useQuery({
    queryKey: ['installations-list', statusFilter],
    queryFn: () => installationsApi.list({
      status: statusFilter === 'all' ? undefined : statusFilter,
    }),
  });

  const { data: summary } = useQuery({
    queryKey: ['installations-summary'],
    queryFn: () => installationsApi.summary(),
  });

  const filtered = useMemo(() => {
    const q = search.toLowerCase().trim();
    if (!q) return installs;
    return installs.filter((i) =>
      i.installationNumber.toLowerCase().includes(q) ||
      i.customerName.toLowerCase().includes(q) ||
      i.customerPhone.includes(q) ||
      i.productName.toLowerCase().includes(q) ||
      (i.serialNumber || '').toLowerCase().includes(q) ||
      (i.technicianName || '').toLowerCase().includes(q)
    );
  }, [installs, search]);

  return (
    <div className="space-y-5">
      {selected && (
        <InstallationDetailModal
          installation={selected}
          onClose={() => setSelected(null)}
          onUpdate={() => {
            qc.invalidateQueries({ queryKey: ['installations-list'] });
            qc.invalidateQueries({ queryKey: ['installations-summary'] });
          }}
        />
      )}

      {/* HERO */}
      <section className="relative overflow-hidden rounded-3xl bg-gradient-to-br from-slate-950 via-amber-900 to-orange-700 text-white p-6 shadow-2xl">
        <div className="absolute -top-20 -right-20 h-64 w-64 rounded-full bg-amber-400/20 blur-3xl" />
        <div className="relative flex items-start justify-between gap-4 flex-wrap">
          <div>
            <div className="inline-flex items-center gap-2 rounded-full bg-white/15 backdrop-blur px-3 py-1 text-xs font-extrabold border border-white/20">
              <HardHat className="h-3.5 w-3.5 text-amber-300" /> Installation Management
            </div>
            <h1 className="mt-3 text-3xl sm:text-4xl font-extrabold leading-tight">🔧 Installations</h1>
            <p className="mt-2 text-sm text-white/80">
              {summary?.pendingCount ?? 0} pending • {summary?.todayCount ?? 0} today • {summary?.completedCount ?? 0} completed
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

      {/* KPIs */}
      {summary && (
        <section className="grid grid-cols-2 lg:grid-cols-4 gap-3">
          <StatCard label="Pending" value={summary.pendingCount ?? 0} icon={Clock} tone="amber" onClick={() => setStatusFilter('PENDING')} />
          <StatCard label="Today" value={summary.todayCount ?? 0} icon={Calendar} tone="blue" />
          <StatCard label="Completed" value={summary.completedCount ?? 0} icon={CheckCircle2} tone="emerald" onClick={() => setStatusFilter('COMPLETED')} />
          <StatCard label="This Month" value={summary.thisMonthCount ?? 0} icon={HardHat} tone="violet" />
        </section>
      )}

      {/* TOOLBAR */}
      <section className="rounded-3xl bg-white border-2 border-slate-200 shadow-sm p-4 space-y-3">
        <div className="relative">
          <Search className="h-5 w-5 text-slate-400 absolute left-3.5 top-1/2 -translate-y-1/2" />
          <input value={search} onChange={(e) => setSearch(e.target.value)}
            placeholder="Installation #, customer, product, serial, technician..."
            className="h-12 w-full rounded-2xl border-2 border-slate-200 bg-white pl-11 pr-10 text-sm font-semibold focus:outline-none focus:border-amber-500 focus:ring-2 focus:ring-amber-200" />
          {search && (
            <button onClick={() => setSearch('')} className="absolute right-3 top-1/2 -translate-y-1/2 h-7 w-7 rounded-lg hover:bg-slate-100 flex items-center justify-center">
              <X className="h-4 w-4" />
            </button>
          )}
        </div>

        <div className="flex gap-1 bg-slate-100 rounded-xl p-1 overflow-x-auto">
          {[
            { v: 'all', l: 'All' },
            { v: 'PENDING', l: 'Pending' },
            { v: 'SCHEDULED', l: 'Scheduled' },
            { v: 'ASSIGNED', l: 'Assigned' },
            { v: 'IN_PROGRESS', l: 'In Progress' },
            { v: 'COMPLETED', l: 'Completed' },
            { v: 'CANCELLED', l: 'Cancelled' },
          ].map((o) => (
            <button key={o.v} onClick={() => setStatusFilter(o.v)}
              className={['shrink-0 px-3 py-1.5 rounded-lg text-xs font-extrabold transition',
                statusFilter === o.v ? 'bg-amber-600 text-white shadow-sm' : 'text-slate-600 hover:text-slate-900'].join(' ')}>
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
          <HardHat className="h-16 w-16 text-slate-300 mx-auto mb-3" />
          <h3 className="text-lg font-extrabold text-slate-900">
            {statusFilter === 'all' ? 'No installations yet' : 'No installations match filter'}
          </h3>
          <p className="text-sm text-slate-500 font-semibold mt-1">
            Installations get created automatically during POS checkout
          </p>
        </div>
      ) : (
        <div className="space-y-3">
          {filtered.map((inst) => (
            <InstallationCard key={inst.id} installation={inst} onView={() => setSelected(inst)} />
          ))}
        </div>
      )}
    </div>
  );
}

function InstallationCard({ installation: inst, onView }: any) {
  const meta = STATUS_META[inst.status as ApplianceInstallationStatus] || STATUS_META.PENDING;
  const StatusIcon = meta.icon;

  return (
    <div className="rounded-2xl bg-white border-2 border-slate-200 shadow-sm p-4 hover:shadow-md transition">
      <div className="flex items-start gap-4 flex-wrap sm:flex-nowrap">
        <div className={`h-14 w-14 rounded-2xl ${meta.bg} flex items-center justify-center shrink-0`}>
          <StatusIcon className={`h-6 w-6 ${meta.color}`} />
        </div>

        <div className="flex-1 min-w-0">
          <div className="flex items-center gap-2 flex-wrap">
            <span className="font-mono font-extrabold text-slate-900 text-sm">{inst.installationNumber}</span>
            <span className={`px-2 py-0.5 rounded-full text-[9px] font-extrabold uppercase inline-flex items-center gap-1 ${meta.bg} ${meta.color}`}>
              <StatusIcon className="h-2.5 w-2.5" /> {meta.label}
            </span>
            <span className="px-2 py-0.5 rounded-full bg-slate-100 text-slate-700 text-[9px] font-extrabold">
              {inst.serviceType}
            </span>
          </div>

          <div className="mt-1 font-extrabold text-slate-900 text-sm truncate">{inst.productName}</div>

          <div className="flex items-center gap-3 mt-2 text-xs text-slate-600 font-bold flex-wrap">
            <span className="inline-flex items-center gap-1">
              <User className="h-3 w-3" /> {inst.customerName}
            </span>
            <span className="inline-flex items-center gap-1">
              <Phone className="h-3 w-3" /> {inst.customerPhone}
            </span>
            {inst.serialNumber && (
              <span className="inline-flex items-center gap-1 font-mono">
                S/N: {inst.serialNumber}
              </span>
            )}
          </div>

          <div className="mt-1 flex items-center gap-3 text-[10px] text-slate-500 font-bold flex-wrap">
            <span className="inline-flex items-center gap-1">
              <MapPin className="h-2.5 w-2.5" /> {inst.customerAddress?.slice(0, 60)}{inst.customerAddress?.length > 60 ? '...' : ''}
            </span>
          </div>

          <div className="mt-1.5 flex items-center gap-3 text-[10px] text-slate-500 font-bold flex-wrap">
            {inst.scheduledDate && (
              <span className="inline-flex items-center gap-1 text-amber-700">
                <Calendar className="h-2.5 w-2.5" />
                {new Date(inst.scheduledDate).toLocaleDateString('en-PK', { day: 'numeric', month: 'short' })}
                {inst.scheduledTimeSlot && ` • ${inst.scheduledTimeSlot}`}
              </span>
            )}
            {inst.technicianName && (
              <span className="inline-flex items-center gap-1 text-violet-700">
                <Zap className="h-2.5 w-2.5" /> {inst.technicianName}
              </span>
            )}
          </div>
        </div>

        <div className="text-right shrink-0">
          {inst.totalCharge > 0 && (
            <div>
              <div className="text-[10px] uppercase font-extrabold text-slate-500">Charge</div>
              <div className="text-lg font-extrabold text-emerald-700 tabular-nums">
                {formatPKR(inst.totalCharge)}
              </div>
            </div>
          )}
          <button onClick={onView}
            className="mt-2 h-9 px-3 rounded-lg bg-amber-50 hover:bg-amber-100 text-amber-700 text-xs font-extrabold inline-flex items-center gap-1">
            <Eye className="h-3.5 w-3.5" /> View
          </button>
        </div>
      </div>
    </div>
  );
}

function InstallationDetailModal({ installation: inst, onClose, onUpdate }: any) {
  const [status, setStatus] = useState(inst.status);
  const [technicianId, setTechnicianId] = useState(inst.technicianId || '');
  const [notes, setNotes] = useState('');

  const { data: technicians = [] } = useQuery({
    queryKey: ['technicians-active'],
    queryFn: () => techniciansApi.list({ active: true }),
  });

  const assignTech = useMutation({
    mutationFn: () => installationsApi.assignTechnician(inst.id, { technicianId }),
    onSuccess: () => {
      toast.success('Technician assigned');
      onUpdate();
      onClose();
    },
    onError: (e: any) => toast.error(e?.response?.data?.message || 'Assign failed'),
  });

  const updateStatus = useMutation({
    mutationFn: () => installationsApi.updateStatus(inst.id, { status, notes }),
    onSuccess: () => {
      toast.success('Status updated');
      onUpdate();
      onClose();
    },
  });

  return (
    <div className="fixed inset-0 z-50 bg-slate-950/80 backdrop-blur-sm flex items-center justify-center p-4">
      <div className="w-full max-w-3xl bg-white rounded-3xl shadow-2xl overflow-hidden max-h-[92vh] flex flex-col">
        <div className="shrink-0 px-5 py-4 bg-gradient-to-br from-amber-600 to-orange-700 text-white flex items-center justify-between">
          <div>
            <div className="text-[10px] uppercase font-extrabold text-white/70 tracking-wider">Installation</div>
            <h3 className="text-xl font-extrabold font-mono">{inst.installationNumber}</h3>
          </div>
          <button onClick={onClose} className="h-11 w-11 rounded-2xl bg-white/15 hover:bg-white/25 flex items-center justify-center">
            <X className="h-5 w-5" />
          </button>
        </div>

        <div className="flex-1 overflow-y-auto p-5 space-y-4">
          <div className="grid sm:grid-cols-2 gap-4">
            <InfoBox label="Product" value={inst.productName} />
            <InfoBox label="Serial #" value={inst.serialNumber || '—'} mono />
            <InfoBox label="Customer" value={inst.customerName} />
            <InfoBox label="Phone" value={inst.customerPhone} />
            <InfoBox label="Service Type" value={inst.serviceType} />
            <InfoBox label="Current Status" value={STATUS_META[inst.status as ApplianceInstallationStatus]?.label || inst.status} />
          </div>

          <div>
            <label className="block text-xs font-extrabold uppercase text-slate-600 mb-1.5">Address</label>
            <div className="rounded-xl bg-slate-50 border-2 border-slate-200 p-3 text-sm font-semibold text-slate-700">
              📍 {inst.customerAddress}
              {inst.landmark && <div className="text-xs text-slate-500 mt-1">Landmark: {inst.landmark}</div>}
            </div>
          </div>

          {inst.scheduledDate && (
            <div className="rounded-xl bg-amber-50 border-2 border-amber-200 p-3">
              <div className="text-[10px] uppercase font-extrabold text-amber-700">Scheduled</div>
              <div className="text-lg font-extrabold text-amber-900 mt-0.5">
                📅 {new Date(inst.scheduledDate).toLocaleDateString('en-PK', { day: 'numeric', month: 'long', year: 'numeric' })}
                {inst.scheduledTimeSlot && ` • ${inst.scheduledTimeSlot}`}
              </div>
            </div>
          )}

          {/* Assign technician */}
          {(inst.status === 'PENDING' || inst.status === 'SCHEDULED') && (
            <div className="rounded-2xl bg-violet-50 border-2 border-violet-200 p-4 space-y-3">
              <div className="font-extrabold text-violet-900">Assign Technician</div>
              <select value={technicianId} onChange={(e) => setTechnicianId(e.target.value)}
                className="h-12 w-full rounded-xl border-2 border-violet-300 bg-white px-3 text-sm font-bold focus:outline-none focus:border-violet-500">
                <option value="">Select technician</option>
                {(technicians as any[]).map((t) => (
                  <option key={t.id} value={t.id}>
                    {t.name} • {t.currentZone || 'Any zone'}
                    {t.avgRating && ` • ⭐ ${t.avgRating.toFixed(1)}`}
                  </option>
                ))}
              </select>
              <button onClick={() => assignTech.mutate()} disabled={!technicianId || assignTech.isPending}
                className="w-full h-12 rounded-xl bg-violet-600 hover:bg-violet-700 text-white font-extrabold disabled:opacity-50 inline-flex items-center justify-center gap-2">
                <User className="h-4 w-4" /> Assign
              </button>
            </div>
          )}

          <div>
            <label className="block text-xs font-extrabold uppercase text-slate-600 mb-1.5">Update Status</label>
            <select value={status} onChange={(e) => setStatus(e.target.value as any)}
              className="h-11 w-full rounded-xl border-2 border-slate-200 bg-white px-3 text-sm font-bold focus:outline-none focus:border-amber-500">
              {Object.entries(STATUS_META).map(([k, v]) => <option key={k} value={k}>{v.label}</option>)}
            </select>
          </div>

          <div>
            <label className="block text-xs font-extrabold uppercase text-slate-600 mb-1.5">Notes</label>
            <textarea rows={3} value={notes} onChange={(e) => setNotes(e.target.value)}
              placeholder="Additional notes..."
              className="w-full rounded-xl border-2 border-slate-200 px-3 py-2 text-sm font-semibold focus:outline-none focus:border-amber-500" />
          </div>

          {inst.completedAt && (
            <div className="rounded-2xl bg-emerald-50 border-2 border-emerald-200 p-4">
              <div className="flex items-center gap-2 mb-2">
                <CheckCircle2 className="h-5 w-5 text-emerald-700" />
                <div className="font-extrabold text-emerald-900">Completed</div>
              </div>
              <div className="text-xs font-bold text-emerald-700">
                {new Date(inst.completedAt).toLocaleString('en-PK')}
              </div>
              {inst.customerRating && (
                <div className="mt-2 text-sm font-extrabold text-amber-700">
                  {'⭐'.repeat(inst.customerRating)} ({inst.customerRating}/5)
                </div>
              )}
              {inst.customerFeedback && (
                <div className="mt-1 text-xs text-slate-700 italic">"{inst.customerFeedback}"</div>
              )}
            </div>
          )}
        </div>

        <div className="shrink-0 px-5 py-3 border-t-2 border-slate-100 bg-slate-50 flex gap-2">
          <Button variant="secondary" className="flex-1" onClick={onClose}>Close</Button>
          <Button className="flex-1 bg-gradient-to-r from-amber-600 to-orange-700"
            onClick={() => updateStatus.mutate()} loading={updateStatus.isPending}>
            Update
          </Button>
        </div>
      </div>
    </div>
  );
}

function StatCard({ label, value, icon: Icon, tone, onClick }: any) {
  const tones: Record<string, string> = {
    amber: 'from-amber-500 to-orange-600',
    blue: 'from-blue-500 to-blue-700',
    emerald: 'from-emerald-500 to-emerald-700',
    violet: 'from-violet-500 to-purple-700',
  };
  const Comp: any = onClick ? 'button' : 'div';
  return (
    <Comp onClick={onClick}
      className={['rounded-2xl bg-white border-2 border-slate-200 p-4 text-left w-full',
        onClick ? 'hover:border-amber-300 hover:shadow-md transition' : ''].join(' ')}>
      <div className="flex items-center justify-between gap-2">
        <div>
          <div className="text-[10px] uppercase font-extrabold text-slate-500">{label}</div>
          <div className="text-2xl font-extrabold text-slate-900 tabular-nums mt-1">{value}</div>
        </div>
        <div className={`h-10 w-10 rounded-xl bg-gradient-to-br ${tones[tone]} text-white flex items-center justify-center shadow-md`}>
          <Icon className="h-4 w-4" />
        </div>
      </div>
    </Comp>
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
