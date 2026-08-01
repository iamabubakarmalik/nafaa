import { useState, useMemo } from 'react';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import {
  Wrench, Search, X, RefreshCw, Clock, CheckCircle2, XCircle,
  AlertTriangle, Phone, User, MapPin, Calendar, Eye, Zap,
  Truck, Home as HomeIcon, Play, PhoneCall, ArrowRight,
} from 'lucide-react';
import { toast } from 'sonner';
import { serviceRequestsApi, type ApplianceServiceStatus } from '../api/service-requests.api';
import { techniciansApi } from '../api/technicians.api';
import { formatPKR } from '@core/lib/format';
import { Button } from '@core/ui/Button';

const STATUS_META: Record<ApplianceServiceStatus, { label: string; color: string; bg: string; icon: any }> = {
  REQUESTED: { label: 'Requested', color: 'text-slate-700', bg: 'bg-slate-100', icon: Clock },
  SCHEDULED: { label: 'Scheduled', color: 'text-amber-700', bg: 'bg-amber-100', icon: Calendar },
  TECHNICIAN_ASSIGNED: { label: 'Assigned', color: 'text-blue-700', bg: 'bg-blue-100', icon: User },
  EN_ROUTE: { label: 'En Route', color: 'text-violet-700', bg: 'bg-violet-100', icon: Truck },
  ON_SITE: { label: 'On Site', color: 'text-cyan-700', bg: 'bg-cyan-100', icon: HomeIcon },
  IN_PROGRESS: { label: 'In Progress', color: 'text-orange-700', bg: 'bg-orange-100', icon: Play },
  COMPLETED: { label: 'Completed', color: 'text-emerald-700', bg: 'bg-emerald-100', icon: CheckCircle2 },
  PENDING_PARTS: { label: 'Pending Parts', color: 'text-amber-700', bg: 'bg-amber-100', icon: AlertTriangle },
  CANCELLED: { label: 'Cancelled', color: 'text-rose-700', bg: 'bg-rose-100', icon: XCircle },
  UNRESOLVED: { label: 'Unresolved', color: 'text-red-700', bg: 'bg-red-100', icon: AlertTriangle },
};

export default function ServiceRequestsPage() {
  const qc = useQueryClient();
  const [search, setSearch] = useState('');
  const [statusFilter, setStatusFilter] = useState('all');
  const [priorityFilter, setPriorityFilter] = useState('all');
  const [selected, setSelected] = useState<any>(null);

  const { data: requests = [], isLoading, refetch, isRefetching } = useQuery({
    queryKey: ['service-requests-list', statusFilter, priorityFilter],
    queryFn: () => serviceRequestsApi.list({
      status: statusFilter === 'all' ? undefined : statusFilter,
      priority: priorityFilter === 'all' ? undefined : priorityFilter,
    }),
  });

  const { data: summary } = useQuery({
    queryKey: ['service-requests-summary'],
    queryFn: () => serviceRequestsApi.summary(),
  });

  const filtered = useMemo(() => {
    const q = search.toLowerCase().trim();
    if (!q) return requests;
    return requests.filter((r) =>
      r.requestNumber.toLowerCase().includes(q) ||
      r.customerName.toLowerCase().includes(q) ||
      r.customerPhone.includes(q) ||
      r.productName.toLowerCase().includes(q) ||
      r.reportedIssue.toLowerCase().includes(q)
    );
  }, [requests, search]);

  return (
    <div className="space-y-5">
      {selected && (
        <ServiceDetailModal
          request={selected}
          onClose={() => setSelected(null)}
          onUpdate={() => {
            qc.invalidateQueries({ queryKey: ['service-requests-list'] });
            qc.invalidateQueries({ queryKey: ['service-requests-summary'] });
          }}
        />
      )}

      <section className="relative overflow-hidden rounded-3xl bg-gradient-to-br from-slate-950 via-rose-900 to-red-700 text-white p-6 shadow-2xl">
        <div className="absolute -top-20 -right-20 h-64 w-64 rounded-full bg-rose-400/20 blur-3xl" />
        <div className="relative flex items-start justify-between gap-4 flex-wrap">
          <div>
            <div className="inline-flex items-center gap-2 rounded-full bg-white/15 backdrop-blur px-3 py-1 text-xs font-extrabold border border-white/20">
              <Wrench className="h-3.5 w-3.5 text-amber-300" /> Service Requests
            </div>
            <h1 className="mt-3 text-3xl sm:text-4xl font-extrabold leading-tight">🛠️ Service Requests</h1>
            <p className="mt-2 text-sm text-white/80">
              {summary?.pendingCount ?? 0} open • {summary?.urgentCount ?? 0} urgent • {summary?.resolvedCount ?? 0} resolved
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

      {summary && (
        <section className="grid grid-cols-2 lg:grid-cols-4 gap-3">
          <StatCard label="Open" value={summary.pendingCount ?? 0} icon={Clock} tone="rose" />
          <StatCard label="Urgent" value={summary.urgentCount ?? 0} icon={AlertTriangle} tone="amber" onClick={() => setPriorityFilter('URGENT')} />
          <StatCard label="Resolved" value={summary.resolvedCount ?? 0} icon={CheckCircle2} tone="emerald" />
          <StatCard label="This Month" value={summary.thisMonthCount ?? 0} icon={Wrench} tone="violet" />
        </section>
      )}

      <section className="rounded-3xl bg-white border-2 border-slate-200 shadow-sm p-4 space-y-3">
        <div className="relative">
          <Search className="h-5 w-5 text-slate-400 absolute left-3.5 top-1/2 -translate-y-1/2" />
          <input value={search} onChange={(e) => setSearch(e.target.value)}
            placeholder="Request #, customer, product, issue..."
            className="h-12 w-full rounded-2xl border-2 border-slate-200 bg-white pl-11 pr-10 text-sm font-semibold focus:outline-none focus:border-rose-500 focus:ring-2 focus:ring-rose-200" />
          {search && (
            <button onClick={() => setSearch('')} className="absolute right-3 top-1/2 -translate-y-1/2 h-7 w-7 rounded-lg hover:bg-slate-100 flex items-center justify-center">
              <X className="h-4 w-4" />
            </button>
          )}
        </div>

        <div className="flex gap-2 flex-wrap">
          <div className="flex gap-1 bg-slate-100 rounded-xl p-1 overflow-x-auto">
            {[
              { v: 'all', l: 'All Status' },
              { v: 'REQUESTED', l: 'Requested' },
              { v: 'TECHNICIAN_ASSIGNED', l: 'Assigned' },
              { v: 'IN_PROGRESS', l: 'In Progress' },
              { v: 'COMPLETED', l: 'Completed' },
              { v: 'PENDING_PARTS', l: 'Parts' },
            ].map((o) => (
              <button key={o.v} onClick={() => setStatusFilter(o.v)}
                className={['shrink-0 px-3 py-1.5 rounded-lg text-xs font-extrabold transition',
                  statusFilter === o.v ? 'bg-rose-600 text-white shadow-sm' : 'text-slate-600 hover:text-slate-900'].join(' ')}>
                {o.l}
              </button>
            ))}
          </div>

          <div className="flex gap-1 bg-slate-100 rounded-xl p-1">
            {['all', 'URGENT', 'HIGH', 'NORMAL', 'LOW'].map((p) => (
              <button key={p} onClick={() => setPriorityFilter(p)}
                className={['shrink-0 px-3 py-1.5 rounded-lg text-xs font-extrabold transition',
                  priorityFilter === p ? 'bg-amber-600 text-white shadow-sm' : 'text-slate-600 hover:text-slate-900'].join(' ')}>
                {p === 'all' ? 'All Priority' : p}
              </button>
            ))}
          </div>
        </div>
      </section>

      {isLoading ? (
        <div className="space-y-2">
          {Array.from({ length: 4 }).map((_, i) => <div key={i} className="h-32 rounded-2xl bg-slate-100 animate-pulse" />)}
        </div>
      ) : filtered.length === 0 ? (
        <div className="rounded-3xl bg-white border-2 border-dashed border-slate-300 p-16 text-center">
          <Wrench className="h-16 w-16 text-slate-300 mx-auto mb-3" />
          <h3 className="text-lg font-extrabold text-slate-900">No service requests</h3>
          <p className="text-sm text-slate-500 font-semibold mt-1">Customer complaints yahan aayenge</p>
        </div>
      ) : (
        <div className="space-y-3">
          {filtered.map((req) => (
            <ServiceRequestCard key={req.id} request={req} onView={() => setSelected(req)} />
          ))}
        </div>
      )}
    </div>
  );
}

function ServiceRequestCard({ request: req, onView }: any) {
  const meta = STATUS_META[req.status as ApplianceServiceStatus] || STATUS_META.REQUESTED;
  const StatusIcon = meta.icon;
  const isUrgent = req.priority === 'URGENT' || req.priority === 'HIGH';

  return (
    <div className={['rounded-2xl bg-white border-2 shadow-sm p-4 hover:shadow-md transition',
      isUrgent ? 'border-rose-300 ring-2 ring-rose-100' : 'border-slate-200'].join(' ')}>
      <div className="flex items-start gap-4 flex-wrap sm:flex-nowrap">
        <div className={`h-14 w-14 rounded-2xl ${meta.bg} flex items-center justify-center shrink-0`}>
          <StatusIcon className={`h-6 w-6 ${meta.color}`} />
        </div>

        <div className="flex-1 min-w-0">
          <div className="flex items-center gap-2 flex-wrap">
            <span className="font-mono font-extrabold text-slate-900 text-sm">{req.requestNumber}</span>
            <span className={`px-2 py-0.5 rounded-full text-[9px] font-extrabold uppercase inline-flex items-center gap-1 ${meta.bg} ${meta.color}`}>
              <StatusIcon className="h-2.5 w-2.5" /> {meta.label}
            </span>
            {isUrgent && (
              <span className="px-2 py-0.5 rounded-full bg-rose-500 text-white text-[9px] font-extrabold uppercase inline-flex items-center gap-1 animate-pulse">
                <AlertTriangle className="h-2.5 w-2.5" /> {req.priority}
              </span>
            )}
            <span className="px-2 py-0.5 rounded-full bg-slate-100 text-slate-700 text-[9px] font-extrabold">
              {req.serviceType}
            </span>
            {req.coveredUnderWarranty && (
              <span className="px-2 py-0.5 rounded-full bg-emerald-100 text-emerald-700 text-[9px] font-extrabold">
                🛡️ WARRANTY
              </span>
            )}
            {req.coveredUnderAmc && (
              <span className="px-2 py-0.5 rounded-full bg-violet-100 text-violet-700 text-[9px] font-extrabold">
                📄 AMC
              </span>
            )}
          </div>

          <div className="mt-1 font-extrabold text-slate-900 text-sm truncate">{req.productName}</div>

          <div className="mt-1 text-sm text-slate-700 font-semibold italic line-clamp-2">
            "{req.reportedIssue}"
          </div>

          <div className="flex items-center gap-3 mt-2 text-xs text-slate-600 font-bold flex-wrap">
            <span className="inline-flex items-center gap-1">
              <User className="h-3 w-3" /> {req.customerName}
            </span>
            <a href={`tel:${req.customerPhone}`} className="inline-flex items-center gap-1 text-emerald-700 hover:underline">
              <PhoneCall className="h-3 w-3" /> {req.customerPhone}
            </a>
            {req.city && (
              <span className="inline-flex items-center gap-1">
                <MapPin className="h-3 w-3" /> {req.city}
              </span>
            )}
          </div>

          {req.technicianName && (
            <div className="mt-1.5 inline-flex items-center gap-1 text-[10px] text-violet-700 font-extrabold">
              <Zap className="h-2.5 w-2.5" /> {req.technicianName}
              {req.scheduledDate && (
                <span className="text-slate-500">
                  • {new Date(req.scheduledDate).toLocaleDateString('en-PK', { day: 'numeric', month: 'short' })}
                  {req.scheduledTimeSlot && ` • ${req.scheduledTimeSlot}`}
                </span>
              )}
            </div>
          )}
        </div>

        <div className="text-right shrink-0">
          {req.totalCharge > 0 && (
            <div>
              <div className="text-[10px] uppercase font-extrabold text-slate-500">Charge</div>
              <div className="text-lg font-extrabold text-emerald-700 tabular-nums">
                {formatPKR(req.totalCharge)}
              </div>
            </div>
          )}
          <button onClick={onView}
            className="mt-2 h-9 px-3 rounded-lg bg-rose-50 hover:bg-rose-100 text-rose-700 text-xs font-extrabold inline-flex items-center gap-1">
            <Eye className="h-3.5 w-3.5" /> View
          </button>
        </div>
      </div>
    </div>
  );
}

function ServiceDetailModal({ request: req, onClose, onUpdate }: any) {
  const [status, setStatus] = useState(req.status);
  const [technicianId, setTechnicianId] = useState(req.technicianId || '');
  const [notes, setNotes] = useState('');

  const { data: technicians = [] } = useQuery({
    queryKey: ['technicians-active'],
    queryFn: () => techniciansApi.list({ active: true }),
  });

  const assign = useMutation({
    mutationFn: () => serviceRequestsApi.assignTechnician(req.id, { technicianId }),
    onSuccess: () => { toast.success('Technician assigned'); onUpdate(); onClose(); },
    onError: (e: any) => toast.error(e?.response?.data?.message || 'Assign failed'),
  });

  const updateStatus = useMutation({
    mutationFn: () => serviceRequestsApi.updateStatus(req.id, { status, notes }),
    onSuccess: () => { toast.success('Status updated'); onUpdate(); onClose(); },
  });

  return (
    <div className="fixed inset-0 z-50 bg-slate-950/80 backdrop-blur-sm flex items-center justify-center p-4">
      <div className="w-full max-w-3xl bg-white rounded-3xl shadow-2xl overflow-hidden max-h-[92vh] flex flex-col">
        <div className="shrink-0 px-5 py-4 bg-gradient-to-br from-rose-600 to-red-700 text-white flex items-center justify-between">
          <div>
            <div className="text-[10px] uppercase font-extrabold text-white/70 tracking-wider">Service Request</div>
            <h3 className="text-xl font-extrabold font-mono">{req.requestNumber}</h3>
          </div>
          <button onClick={onClose} className="h-11 w-11 rounded-2xl bg-white/15 hover:bg-white/25 flex items-center justify-center">
            <X className="h-5 w-5" />
          </button>
        </div>

        <div className="flex-1 overflow-y-auto p-5 space-y-4">
          <div className="grid sm:grid-cols-2 gap-3">
            <InfoBox label="Product" value={req.productName} />
            <InfoBox label="Serial #" value={req.serialNumber || '—'} mono />
            <InfoBox label="Customer" value={req.customerName} />
            <InfoBox label="Phone" value={req.customerPhone} />
            <InfoBox label="Service Type" value={req.serviceType} />
            <InfoBox label="Priority" value={req.priority} />
          </div>

          <div>
            <label className="block text-xs font-extrabold uppercase text-slate-600 mb-1.5">Reported Issue</label>
            <div className="rounded-xl bg-rose-50 border-2 border-rose-200 p-3 text-sm font-semibold text-rose-900 italic">
              "{req.reportedIssue}"
            </div>
          </div>

          <div>
            <label className="block text-xs font-extrabold uppercase text-slate-600 mb-1.5">Address</label>
            <div className="rounded-xl bg-slate-50 border-2 border-slate-200 p-3 text-sm font-semibold text-slate-700">
              📍 {req.customerAddress}
            </div>
          </div>

          {(req.status === 'REQUESTED' || req.status === 'SCHEDULED') && (
            <div className="rounded-2xl bg-violet-50 border-2 border-violet-200 p-4 space-y-3">
              <div className="font-extrabold text-violet-900">Assign Technician</div>
              <select value={technicianId} onChange={(e) => setTechnicianId(e.target.value)}
                className="h-12 w-full rounded-xl border-2 border-violet-300 bg-white px-3 text-sm font-bold focus:outline-none focus:border-violet-500">
                <option value="">Select technician</option>
                {(technicians as any[]).map((t) => (
                  <option key={t.id} value={t.id}>{t.name} • {t.currentZone || 'Any zone'}</option>
                ))}
              </select>
              <button onClick={() => assign.mutate()} disabled={!technicianId || assign.isPending}
                className="w-full h-12 rounded-xl bg-violet-600 hover:bg-violet-700 text-white font-extrabold disabled:opacity-50">
                Assign
              </button>
            </div>
          )}

          <div>
            <label className="block text-xs font-extrabold uppercase text-slate-600 mb-1.5">Update Status</label>
            <select value={status} onChange={(e) => setStatus(e.target.value as any)}
              className="h-11 w-full rounded-xl border-2 border-slate-200 bg-white px-3 text-sm font-bold focus:outline-none focus:border-rose-500">
              {Object.entries(STATUS_META).map(([k, v]) => <option key={k} value={k}>{v.label}</option>)}
            </select>
          </div>

          <div>
            <label className="block text-xs font-extrabold uppercase text-slate-600 mb-1.5">Notes</label>
            <textarea rows={3} value={notes} onChange={(e) => setNotes(e.target.value)}
              placeholder="Diagnosis, work done..."
              className="w-full rounded-xl border-2 border-slate-200 px-3 py-2 text-sm font-semibold focus:outline-none focus:border-rose-500" />
          </div>
        </div>

        <div className="shrink-0 px-5 py-3 border-t-2 border-slate-100 bg-slate-50 flex gap-2">
          <Button variant="secondary" className="flex-1" onClick={onClose}>Close</Button>
          <Button className="flex-1 bg-gradient-to-r from-rose-600 to-red-700"
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
    rose: 'from-rose-500 to-red-700',
    amber: 'from-amber-500 to-orange-600',
    emerald: 'from-emerald-500 to-emerald-700',
    violet: 'from-violet-500 to-purple-700',
  };
  const Comp: any = onClick ? 'button' : 'div';
  return (
    <Comp onClick={onClick}
      className={['rounded-2xl bg-white border-2 border-slate-200 p-4 text-left w-full',
        onClick ? 'hover:border-rose-300 hover:shadow-md transition' : ''].join(' ')}>
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
