import { useMemo, useState } from 'react';
import { Link } from 'react-router-dom';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import {
  FileText, Plus, Search, X, RefreshCw, Eye, Edit3, Trash2,
  Calendar, AlertTriangle, RotateCcw, CheckCircle2, XCircle,
  User, Phone, Download, Clock,
} from 'lucide-react';
import { toast } from 'sonner';
import { prescriptionsApi, type OpticalPrescription } from '../api/prescriptions.api';
import { Button } from '@core/ui/Button';

export default function PrescriptionsPage() {
  const qc = useQueryClient();
  const [search, setSearch] = useState('');
  const [filter, setFilter] = useState<'all' | 'active' | 'expiringSoon' | 'expired'>('all');
  const [rxType, setRxType] = useState('all');

  const { data: rxs = [], isLoading, refetch, isRefetching } = useQuery({
    queryKey: ['prescriptions-list', filter, rxType],
    queryFn: () => prescriptionsApi.list({
      active: filter === 'active' ? true : undefined,
      expiringSoon: filter === 'expiringSoon',
      expired: filter === 'expired',
      prescriptionType: rxType === 'all' ? undefined : rxType,
    }),
  });

  const { data: summary } = useQuery({
    queryKey: ['prescriptions-summary'],
    queryFn: () => prescriptionsApi.summary(),
  });

  const filtered = useMemo(() => {
    const q = search.toLowerCase().trim();
    if (!q) return rxs;
    return rxs.filter((r) =>
      r.prescriptionNumber.toLowerCase().includes(q) ||
      r.customerName.toLowerCase().includes(q) ||
      (r.customerPhone || '').includes(q) ||
      (r.doctorName || '').toLowerCase().includes(q)
    );
  }, [rxs, search]);

  const remove = useMutation({
    mutationFn: (id: string) => prescriptionsApi.remove(id),
    onSuccess: () => {
      toast.success('Prescription deleted');
      qc.invalidateQueries({ queryKey: ['prescriptions-list'] });
    },
    onError: (e: any) => toast.error(e?.response?.data?.message || 'Delete failed'),
  });

  const renew = useMutation({
    mutationFn: (id: string) => prescriptionsApi.renew(id),
    onSuccess: () => {
      toast.success('New prescription created');
      qc.invalidateQueries({ queryKey: ['prescriptions-list'] });
    },
  });

  return (
    <div className="space-y-5">
      <section className="relative overflow-hidden rounded-3xl bg-gradient-to-br from-slate-950 via-blue-900 to-cyan-700 text-white p-6 shadow-2xl">
        <div className="absolute -top-20 -right-20 h-64 w-64 rounded-full bg-blue-400/20 blur-3xl" />
        <div className="relative flex items-start justify-between gap-4 flex-wrap">
          <div>
            <div className="inline-flex items-center gap-2 rounded-full bg-white/15 backdrop-blur px-3 py-1 text-xs font-extrabold border border-white/20">
              <FileText className="h-3.5 w-3.5 text-amber-300" /> Prescriptions (Rx)
            </div>
            <h1 className="mt-3 text-3xl sm:text-4xl font-extrabold leading-tight">📄 Prescriptions</h1>
            <p className="mt-2 text-sm text-white/80">
              {summary?.total ?? 0} total • {summary?.active ?? 0} active • {summary?.expiringSoon ?? 0} expiring soon
            </p>
          </div>
          <div className="flex gap-2 flex-wrap">
            <button onClick={() => refetch()} disabled={isRefetching}
              className="inline-flex items-center gap-2 rounded-xl bg-white/10 hover:bg-white/20 px-4 py-2.5 text-sm font-bold">
              <RefreshCw className={`h-4 w-4 ${isRefetching ? 'animate-spin' : ''}`} /> Refresh
            </button>
            <Link to="/optical/prescriptions/new">
              <Button className="bg-white text-slate-900 hover:bg-slate-100">
                <Plus className="h-4 w-4" /> New Rx
              </Button>
            </Link>
          </div>
        </div>
      </section>

      {summary && (
        <section className="grid grid-cols-2 lg:grid-cols-5 gap-3">
          <StatCard label="Total" value={summary.total} icon={FileText} tone="blue" onClick={() => setFilter('all')} />
          <StatCard label="Active" value={summary.active} icon={CheckCircle2} tone="emerald" onClick={() => setFilter('active')} />
          <StatCard label="Expiring Soon" value={summary.expiringSoon} icon={Clock} tone="amber" onClick={() => setFilter('expiringSoon')} />
          <StatCard label="Expired" value={summary.expired} icon={XCircle} tone="rose" onClick={() => setFilter('expired')} />
          <StatCard label="This Month" value={summary.thisMonth} icon={Calendar} tone="violet" />
        </section>
      )}

      <section className="rounded-3xl bg-white border-2 border-slate-200 shadow-sm p-4 space-y-3">
        <div className="relative">
          <Search className="h-5 w-5 text-slate-400 absolute left-3.5 top-1/2 -translate-y-1/2" />
          <input value={search} onChange={(e) => setSearch(e.target.value)}
            placeholder="Rx #, customer name, phone, doctor..."
            className="h-12 w-full rounded-2xl border-2 border-slate-200 pl-11 pr-10 text-sm font-semibold focus:outline-none focus:border-blue-500 focus:ring-2 focus:ring-blue-200" />
          {search && (
            <button onClick={() => setSearch('')} className="absolute right-3 top-1/2 -translate-y-1/2 h-7 w-7 rounded-lg hover:bg-slate-100 flex items-center justify-center">
              <X className="h-4 w-4" />
            </button>
          )}
        </div>

        <div className="flex gap-1 bg-slate-100 rounded-xl p-1 overflow-x-auto">
          {[
            { v: 'all', l: 'All' },
            { v: 'active', l: 'Active' },
            { v: 'expiringSoon', l: 'Expiring Soon' },
            { v: 'expired', l: 'Expired' },
          ].map((o) => (
            <button key={o.v} onClick={() => setFilter(o.v as any)}
              className={`shrink-0 px-3 py-1.5 rounded-lg text-xs font-extrabold transition ${
                filter === o.v ? 'bg-blue-600 text-white shadow-sm' : 'text-slate-600 hover:text-slate-900'}`}>
              {o.l}
            </button>
          ))}
          <div className="ml-auto flex items-center gap-2">
            <select value={rxType} onChange={(e) => setRxType(e.target.value)}
              className="h-8 rounded-lg border-2 border-slate-200 bg-white px-2 text-xs font-bold focus:outline-none focus:border-blue-500">
              <option value="all">All types</option>
              <option value="DISTANCE">Distance</option>
              <option value="READING">Reading</option>
              <option value="BIFOCAL">Bifocal</option>
              <option value="PROGRESSIVE">Progressive</option>
              <option value="CONTACT_LENS">Contact Lens</option>
            </select>
          </div>
        </div>
      </section>

      {isLoading ? (
        <div className="grid gap-3">
          {Array.from({ length: 6 }).map((_, i) => <div key={i} className="h-32 rounded-2xl bg-slate-100 animate-pulse" />)}
        </div>
      ) : filtered.length === 0 ? (
        <div className="rounded-3xl bg-white border-2 border-dashed border-slate-300 p-16 text-center">
          <FileText className="h-16 w-16 text-slate-300 mx-auto mb-3" />
          <h3 className="text-lg font-extrabold text-slate-900">No prescriptions found</h3>
          <p className="text-sm text-slate-500 font-semibold mt-1">Create your first prescription</p>
          <Link to="/optical/prescriptions/new">
            <Button className="mt-4 bg-gradient-to-r from-blue-600 to-cyan-700">
              <Plus className="h-4 w-4" /> Create First Rx
            </Button>
          </Link>
        </div>
      ) : (
        <div className="space-y-3">
          {filtered.map((rx) => <RxCard key={rx.id} rx={rx}
            onRenew={() => { if (confirm('Create a new Rx as renewal (this one will be deactivated)?')) renew.mutate(rx.id); }}
            onDelete={() => { if (confirm(`Delete "${rx.prescriptionNumber}"?`)) remove.mutate(rx.id); }} />)}
        </div>
      )}
    </div>
  );
}

function RxCard({ rx, onRenew, onDelete }: { rx: OpticalPrescription; onRenew: () => void; onDelete: () => void }) {
  const daysLeft = rx.expiryDate ? Math.ceil((new Date(rx.expiryDate).getTime() - Date.now()) / 86400000) : null;
  const isExpired = daysLeft != null && daysLeft < 0;
  const isExpiringSoon = daysLeft != null && daysLeft >= 0 && daysLeft <= 60;

  const formatEye = (sph?: number, cyl?: number, axis?: number, add?: number) => {
    if (sph == null && cyl == null) return null;
    const s = (v: number) => (v > 0 ? `+${v.toFixed(2)}` : v.toFixed(2));
    let out = sph != null ? `SPH ${s(sph)}` : '';
    if (cyl != null && cyl !== 0) out += ` CYL ${s(cyl)}`;
    if (axis != null) out += ` x ${axis}°`;
    if (add != null && add !== 0) out += ` ADD ${s(add)}`;
    return out.trim();
  };

  return (
    <div className={`rounded-2xl bg-white border-2 shadow-sm p-4 hover:shadow-md transition ${
      isExpired ? 'border-rose-300' : isExpiringSoon ? 'border-amber-300' : rx.isActive ? 'border-slate-200' : 'border-slate-200 opacity-60'}`}>
      <div className="flex items-start gap-4 flex-wrap sm:flex-nowrap">
        <div className={`h-14 w-14 rounded-2xl flex items-center justify-center shrink-0 ${
          isExpired ? 'bg-rose-100 text-rose-700' :
          isExpiringSoon ? 'bg-amber-100 text-amber-700' :
          rx.isActive ? 'bg-blue-100 text-blue-700' : 'bg-slate-100 text-slate-500'
        }`}>
          <FileText className="h-6 w-6" />
        </div>

        <div className="flex-1 min-w-0">
          <div className="flex items-center gap-2 flex-wrap">
            <Link to={`/optical/prescriptions/${rx.id}`} className="font-mono font-extrabold text-slate-900 text-sm hover:text-blue-700">
              {rx.prescriptionNumber}
            </Link>
            {!rx.isActive && <span className="px-2 py-0.5 rounded-full bg-slate-200 text-slate-700 text-[9px] font-extrabold uppercase">Inactive</span>}
            {rx.prescriptionType && <span className="px-2 py-0.5 rounded-full bg-blue-100 text-blue-700 text-[9px] font-extrabold uppercase">{rx.prescriptionType.replace(/_/g, ' ')}</span>}
            {isExpired && <span className="px-2 py-0.5 rounded-full bg-rose-500 text-white text-[9px] font-extrabold uppercase">Expired</span>}
            {isExpiringSoon && !isExpired && <span className="px-2 py-0.5 rounded-full bg-amber-500 text-white text-[9px] font-extrabold uppercase">Expiring {daysLeft}d</span>}
          </div>

          <div className="mt-1 flex items-center gap-3 text-sm text-slate-700 font-bold flex-wrap">
            <span className="inline-flex items-center gap-1"><User className="h-3 w-3" /> {rx.customerName}</span>
            {rx.customerPhone && <span className="inline-flex items-center gap-1"><Phone className="h-3 w-3" /> {rx.customerPhone}</span>}
            {rx.customerAge && <span className="text-slate-500">{rx.customerAge} yrs</span>}
          </div>

          {rx.doctorName && (
            <div className="mt-1 text-xs text-slate-500 font-bold">
              Dr. {rx.doctorName}{rx.clinicName && ` • ${rx.clinicName}`}
            </div>
          )}

          <div className="mt-2 grid sm:grid-cols-2 gap-2 text-xs">
            {formatEye(rx.rightSph, rx.rightCyl, rx.rightAxis, rx.rightAdd) && (
              <div className="rounded-lg bg-blue-50 border border-blue-200 p-2">
                <span className="text-[10px] uppercase font-extrabold text-blue-700">OD (Right)</span>
                <div className="font-mono font-extrabold text-slate-900 tabular-nums">{formatEye(rx.rightSph, rx.rightCyl, rx.rightAxis, rx.rightAdd)}</div>
              </div>
            )}
            {formatEye(rx.leftSph, rx.leftCyl, rx.leftAxis, rx.leftAdd) && (
              <div className="rounded-lg bg-emerald-50 border border-emerald-200 p-2">
                <span className="text-[10px] uppercase font-extrabold text-emerald-700">OS (Left)</span>
                <div className="font-mono font-extrabold text-slate-900 tabular-nums">{formatEye(rx.leftSph, rx.leftCyl, rx.leftAxis, rx.leftAdd)}</div>
              </div>
            )}
          </div>

          <div className="mt-2 flex items-center gap-3 text-[10px] text-slate-500 font-bold">
            <span className="inline-flex items-center gap-0.5">
              <Calendar className="h-2.5 w-2.5" />
              Issued {new Date(rx.prescriptionDate).toLocaleDateString('en-PK', { day: 'numeric', month: 'short', year: 'numeric' })}
            </span>
            {rx.expiryDate && (
              <span className="inline-flex items-center gap-0.5">
                Expires {new Date(rx.expiryDate).toLocaleDateString('en-PK', { day: 'numeric', month: 'short', year: 'numeric' })}
              </span>
            )}
            {rx.timesUsed > 0 && (
              <span className="text-blue-700">Used {rx.timesUsed}× in orders</span>
            )}
          </div>
        </div>

        <div className="flex gap-1.5 shrink-0">
          <Link to={`/optical/prescriptions/${rx.id}`}
            className="h-9 w-9 rounded-lg bg-blue-50 hover:bg-blue-100 text-blue-700 flex items-center justify-center">
            <Eye className="h-4 w-4" />
          </Link>
          <Link to={`/optical/prescriptions/${rx.id}/edit`}
            className="h-9 w-9 rounded-lg bg-cyan-50 hover:bg-cyan-100 text-cyan-700 flex items-center justify-center">
            <Edit3 className="h-4 w-4" />
          </Link>
          {isExpiringSoon || isExpired ? (
            <button onClick={onRenew}
              className="h-9 px-3 rounded-lg bg-emerald-50 hover:bg-emerald-100 text-emerald-700 text-xs font-extrabold inline-flex items-center gap-1">
              <RotateCcw className="h-3.5 w-3.5" /> Renew
            </button>
          ) : null}
          <button onClick={onDelete}
            className="h-9 w-9 rounded-lg bg-rose-50 hover:bg-rose-100 text-rose-600 flex items-center justify-center">
            <Trash2 className="h-4 w-4" />
          </button>
        </div>
      </div>
    </div>
  );
}

function StatCard({ label, value, icon: Icon, tone, onClick }: any) {
  const tones: Record<string, string> = {
    blue: 'from-blue-500 to-cyan-700', emerald: 'from-emerald-500 to-emerald-700',
    amber: 'from-amber-500 to-orange-600', rose: 'from-rose-500 to-red-700',
    violet: 'from-violet-500 to-fuchsia-700',
  };
  const C: any = onClick ? 'button' : 'div';
  return (
    <C onClick={onClick}
      className={`rounded-2xl bg-white border-2 border-slate-200 p-4 shadow-sm text-left w-full ${onClick ? 'hover:border-blue-300 hover:shadow-md transition' : ''}`}>
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
