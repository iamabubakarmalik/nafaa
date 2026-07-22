import { useState } from 'react';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { Link } from 'react-router-dom';
import {
  FileText, Plus, Search, X, RefreshCw, Sparkles, User, Phone,
  Stethoscope, Clock, CheckCircle2, Ban, Package, Eye,
  AlertCircle, Calendar, DollarSign, Repeat, Award, ClipboardCheck,
} from 'lucide-react';
import { prescriptionsApi, type PrescriptionStatus, type Prescription } from '../api/prescriptions.api';
import { formatPKR } from '@core/lib/format';
import { Button } from '@core/ui/Button';
import { toast } from 'sonner';
import { format } from 'date-fns';

const STATUS_CONFIG: Record<PrescriptionStatus, { label: string; color: string; icon: any }> = {
  PENDING: { label: 'Pending', color: 'bg-blue-500', icon: Clock },
  VERIFIED: { label: 'Verified', color: 'bg-cyan-500', icon: ClipboardCheck },
  PARTIALLY_DISPENSED: { label: 'Partial', color: 'bg-amber-500', icon: Package },
  DISPENSED: { label: 'Dispensed', color: 'bg-emerald-600', icon: CheckCircle2 },
  REJECTED: { label: 'Rejected', color: 'bg-rose-500', icon: Ban },
  CANCELLED: { label: 'Cancelled', color: 'bg-slate-500', icon: X },
};

const TYPE_LABELS: Record<string, string> = {
  WALK_IN: 'Walk-in', ONLINE: 'Online', REFILL: 'Refill', HOSPITAL: 'Hospital',
  INSURANCE: 'Insurance', EMERGENCY: 'Emergency',
};

export default function PrescriptionsPage() {
  const queryClient = useQueryClient();
  const [search, setSearch] = useState('');
  const [statusFilter, setStatusFilter] = useState<string>('all');

  const { data: prescriptions = [], isLoading, refetch, isRefetching } = useQuery({
    queryKey: ['prescriptions', statusFilter, search],
    queryFn: () => prescriptionsApi.list({
      status: statusFilter === 'all' ? undefined : statusFilter,
      search: search.trim() || undefined,
    }),
    refetchInterval: 30_000,
  });

  const counts = {
    pending: prescriptions.filter((p) => p.status === 'PENDING').length,
    verified: prescriptions.filter((p) => p.status === 'VERIFIED').length,
    partial: prescriptions.filter((p) => p.status === 'PARTIALLY_DISPENSED').length,
    dispensed: prescriptions.filter((p) => p.status === 'DISPENSED').length,
  };

  return (
    <div className="space-y-6">
      {/* HERO */}
      <section className="relative overflow-hidden rounded-3xl bg-gradient-to-br from-slate-950 via-violet-900 to-purple-700 text-white p-6 sm:p-8 shadow-2xl">
        <div className="absolute -top-20 -right-20 h-72 w-72 rounded-full bg-violet-400/20 blur-3xl" />
        <div className="absolute -bottom-20 -left-20 h-72 w-72 rounded-full bg-purple-400/15 blur-3xl" />
        <div className="relative flex flex-col lg:flex-row lg:items-center lg:justify-between gap-5">
          <div>
            <div className="inline-flex items-center gap-2 rounded-full bg-white/15 backdrop-blur px-3 py-1 text-xs font-extrabold border border-white/20">
              <Sparkles className="h-3.5 w-3.5 text-amber-300" />
              Prescriptions
            </div>
            <h1 className="mt-3 text-3xl sm:text-4xl font-extrabold leading-tight">
              📋 Prescriptions
            </h1>
            <p className="mt-2 text-sm text-white/80 font-semibold">
              Doctor prescriptions — verify, dispense, refill
            </p>
          </div>
          <div className="flex items-center gap-2 flex-wrap">
            <button
              onClick={() => refetch()}
              disabled={isRefetching}
              className="inline-flex items-center gap-2 rounded-xl bg-white/15 hover:bg-white/25 px-4 py-2.5 text-sm font-bold backdrop-blur border border-white/20"
            >
              <RefreshCw className={'h-4 w-4 ' + (isRefetching ? 'animate-spin' : '')} />
              Refresh
            </button>
            <Link to="/pharmacy/prescriptions/new">
              <Button className="bg-white text-slate-900 hover:bg-slate-100">
                <Plus className="h-4 w-4" />
                New Prescription
              </Button>
            </Link>
          </div>
        </div>
      </section>

      {/* STATS */}
      <section className="grid grid-cols-2 lg:grid-cols-4 gap-4">
        <StatCard label="Pending" value={counts.pending} icon={Clock} color="blue" />
        <StatCard label="Verified" value={counts.verified} icon={ClipboardCheck} color="cyan" />
        <StatCard label="Partial" value={counts.partial} icon={Package} color="amber" />
        <StatCard label="Dispensed" value={counts.dispensed} icon={CheckCircle2} color="emerald" />
      </section>

      {/* FILTERS */}
      <section className="rounded-3xl bg-white dark:bg-neutral-900 border border-slate-200 dark:border-neutral-800 shadow-sm p-4 space-y-3">
        <div className="relative">
          <Search className="h-4 w-4 text-slate-400 absolute left-3.5 top-1/2 -translate-y-1/2" />
          <input
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            placeholder="Search Rx#, patient, phone, doctor..."
            className="h-11 w-full rounded-xl border-2 border-slate-200 dark:border-neutral-700 bg-white dark:bg-neutral-800 pl-10 pr-10 text-sm font-semibold focus:outline-none focus:border-violet-500"
          />
          {search && (
            <button onClick={() => setSearch('')} className="absolute right-3 top-1/2 -translate-y-1/2 text-slate-400">
              <X className="h-4 w-4" />
            </button>
          )}
        </div>

        <div className="flex gap-1.5 overflow-x-auto pb-1">
          {['all', 'PENDING', 'VERIFIED', 'PARTIALLY_DISPENSED', 'DISPENSED', 'REJECTED', 'CANCELLED'].map((s) => (
            <button
              key={s}
              onClick={() => setStatusFilter(s)}
              className={
                'shrink-0 px-3 py-1.5 rounded-lg text-xs font-extrabold transition ' +
                (statusFilter === s
                  ? 'bg-violet-600 text-white shadow'
                  : 'bg-slate-100 dark:bg-neutral-800 text-slate-700 dark:text-slate-300')
              }
            >
              {s === 'all' ? 'All' : STATUS_CONFIG[s as PrescriptionStatus]?.label || s}
            </button>
          ))}
        </div>
      </section>

      {/* LIST */}
      {isLoading ? (
        <div className="grid gap-3">
          {[1, 2, 3, 4].map((i) => <div key={i} className="h-32 rounded-2xl bg-slate-100 dark:bg-neutral-800 animate-pulse" />)}
        </div>
      ) : prescriptions.length === 0 ? (
        <div className="rounded-3xl bg-white dark:bg-neutral-900 border-2 border-dashed border-slate-200 dark:border-neutral-800 p-12 text-center">
          <div className="h-20 w-20 rounded-3xl bg-violet-100 dark:bg-violet-950/40 mx-auto flex items-center justify-center">
            <FileText className="h-10 w-10 text-violet-600" />
          </div>
          <h3 className="mt-4 text-lg font-extrabold text-slate-900 dark:text-white">No prescriptions</h3>
          <p className="mt-1 text-sm text-slate-500 font-semibold">Pehla prescription banao</p>
        </div>
      ) : (
        <section className="grid gap-3">
          {prescriptions.map((rx) => <RxCard key={rx.id} rx={rx} />)}
        </section>
      )}
    </div>
  );
}

function StatCard({ label, value, icon: Icon, color }: any) {
  const colors: Record<string, string> = {
    blue: 'from-blue-500 to-blue-700', cyan: 'from-cyan-500 to-blue-600',
    amber: 'from-amber-500 to-orange-600', emerald: 'from-emerald-500 to-green-600',
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

function RxCard({ rx }: { rx: Prescription }) {
  const statusCfg = STATUS_CONFIG[rx.status];
  const StatusIcon = statusCfg.icon;
  const dispensed = rx.items?.filter((i) => i.isDispensed).length || 0;
  const total = rx.items?.length || 0;

  return (
    <Link
      to={'/pharmacy/prescriptions/' + rx.id}
      className="block rounded-2xl bg-white dark:bg-neutral-900 border-2 border-slate-200 dark:border-neutral-800 shadow-sm hover:shadow-lg hover:border-violet-300 transition p-4"
    >
      <div className="flex items-start justify-between gap-3 flex-wrap">
        <div className="flex items-start gap-3 min-w-0 flex-1">
          <div className="h-12 w-12 rounded-2xl bg-gradient-to-br from-violet-500 to-purple-600 text-white flex items-center justify-center shadow-lg shrink-0">
            <FileText className="h-6 w-6" />
          </div>
          <div className="min-w-0 flex-1">
            <div className="flex items-center gap-2 flex-wrap">
              <span className="font-extrabold text-slate-900 dark:text-white">{rx.prescriptionNumber}</span>
              <span className={'px-2 py-0.5 rounded-full text-[9px] font-extrabold uppercase inline-flex items-center gap-1 text-white ' + statusCfg.color}>
                <StatusIcon className="h-2.5 w-2.5" />
                {statusCfg.label}
              </span>
              <span className="px-2 py-0.5 rounded-md bg-slate-100 dark:bg-neutral-800 text-slate-700 dark:text-slate-300 text-[9px] font-extrabold uppercase">
                {TYPE_LABELS[rx.type] || rx.type}
              </span>
              {rx.isRefillable && (
                <span className="px-2 py-0.5 rounded-md bg-emerald-100 dark:bg-emerald-950/40 text-emerald-700 text-[9px] font-extrabold uppercase inline-flex items-center gap-0.5">
                  <Repeat className="h-2 w-2" />
                  Refills: {rx.refillsAllowed - rx.refillsUsed}/{rx.refillsAllowed}
                </span>
              )}
              {rx.isInsuranceClaim && (
                <span className="px-2 py-0.5 rounded-md bg-blue-100 dark:bg-blue-950/40 text-blue-700 text-[9px] font-extrabold uppercase">
                  Insurance
                </span>
              )}
            </div>

            <div className="mt-2 flex items-center gap-3 text-xs text-slate-600 dark:text-slate-400 font-semibold flex-wrap">
              {rx.patientName && (
                <span className="inline-flex items-center gap-1">
                  <User className="h-3 w-3" />
                  {rx.patientName}
                  {rx.patientAge && ' (' + rx.patientAge + 'y)'}
                </span>
              )}
              {rx.patientPhone && (
                <span className="inline-flex items-center gap-1">
                  <Phone className="h-3 w-3" />
                  {rx.patientPhone}
                </span>
              )}
              {(rx.doctor?.name || rx.doctorName) && (
                <span className="inline-flex items-center gap-1">
                  <Stethoscope className="h-3 w-3" />
                  {rx.doctor?.name || rx.doctorName}
                </span>
              )}
              <span className="inline-flex items-center gap-1">
                <Calendar className="h-3 w-3" />
                {format(new Date(rx.createdAt), 'dd MMM, HH:mm')}
              </span>
            </div>

            {rx.diagnosis && (
              <div className="mt-2 text-xs text-slate-500 italic line-clamp-1">Dx: {rx.diagnosis}</div>
            )}

            <div className="mt-2 flex flex-wrap gap-1">
              {rx.items?.slice(0, 4).map((it, i) => (
                <span key={i} className={
                  'px-2 py-0.5 rounded text-[10px] font-extrabold ' +
                  (it.isDispensed ? 'bg-emerald-100 text-emerald-700' : 'bg-slate-100 dark:bg-neutral-800 text-slate-700')
                }>
                  {it.medicineName} × {it.prescribedQty}
                </span>
              ))}
              {(rx.items?.length || 0) > 4 && (
                <span className="px-2 py-0.5 rounded bg-slate-100 dark:bg-neutral-800 text-[10px] font-extrabold text-slate-500">
                  +{(rx.items?.length || 0) - 4} more
                </span>
              )}
            </div>
          </div>
        </div>

        <div className="text-right shrink-0">
          <div className="text-lg font-extrabold text-emerald-700 dark:text-emerald-400 tabular-nums">{formatPKR(rx.totalAmount)}</div>
          <div className="text-[10px] font-extrabold text-slate-500">
            {dispensed}/{total} items dispensed
          </div>
          <div className="mt-2 inline-flex items-center gap-1 text-xs font-extrabold text-violet-600">
            View <Eye className="h-3 w-3" />
          </div>
        </div>
      </div>
    </Link>
  );
}
