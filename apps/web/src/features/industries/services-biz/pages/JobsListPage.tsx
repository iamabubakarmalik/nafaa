import { useState } from 'react';
import { useQuery } from '@tanstack/react-query';
import { Link } from 'react-router-dom';
import {
  Briefcase, Plus, Search, X, RefreshCw, Sparkles, Clock, User, Phone,
  MapPin, CheckCircle2, AlertCircle, ArrowRight, Zap, Timer, DollarSign,
  Activity, Flame, Star, Truck, Ban,
} from 'lucide-react';
import { jobsApi, type JobStatus, type Priority } from '../api/jobs.api';
import { formatPKR } from '@/lib/format';
import { Button } from '@/components/ui/Button';
import { format, differenceInMinutes, isToday, isTomorrow } from 'date-fns';

const STATUS_CONFIG: Record<JobStatus, { label: string; color: string; icon: any }> = {
  DRAFT: { label: 'Draft', color: 'bg-slate-500', icon: AlertCircle },
  ENQUIRY: { label: 'Enquiry', color: 'bg-slate-500', icon: Phone },
  QUOTED: { label: 'Quoted', color: 'bg-blue-400', icon: DollarSign },
  CONFIRMED: { label: 'Confirmed', color: 'bg-blue-500', icon: CheckCircle2 },
  SCHEDULED: { label: 'Scheduled', color: 'bg-cyan-500', icon: Clock },
  ASSIGNED: { label: 'Assigned', color: 'bg-violet-500', icon: User },
  DISPATCHED: { label: 'Dispatched', color: 'bg-purple-500', icon: Truck },
  EN_ROUTE: { label: 'En Route', color: 'bg-indigo-500', icon: Truck },
  ARRIVED: { label: 'Arrived', color: 'bg-teal-500', icon: MapPin },
  IN_PROGRESS: { label: 'In Progress', color: 'bg-amber-500', icon: Activity },
  PAUSED: { label: 'Paused', color: 'bg-orange-500', icon: Timer },
  AWAITING_PARTS: { label: 'Awaiting Parts', color: 'bg-orange-600', icon: Timer },
  AWAITING_APPROVAL: { label: 'Awaiting Approval', color: 'bg-yellow-500', icon: Clock },
  QUALITY_CHECK: { label: 'Quality Check', color: 'bg-fuchsia-500', icon: Star },
  COMPLETED: { label: 'Completed', color: 'bg-emerald-600', icon: CheckCircle2 },
  UNABLE_TO_COMPLETE: { label: 'Unable', color: 'bg-red-600', icon: X },
  RESCHEDULED: { label: 'Rescheduled', color: 'bg-violet-400', icon: Clock },
  CANCELLED: { label: 'Cancelled', color: 'bg-rose-500', icon: Ban },
  WARRANTY_HOLD: { label: 'Warranty Hold', color: 'bg-slate-500', icon: Timer },
  DISPUTED: { label: 'Disputed', color: 'bg-red-500', icon: AlertCircle },
};

const PRIORITY_CONFIG: Record<Priority, { label: string; color: string; emoji: string }> = {
  EMERGENCY: { label: 'Emergency', color: 'bg-red-600 animate-pulse', emoji: '🚨' },
  URGENT: { label: 'Urgent', color: 'bg-red-500', emoji: '🔥' },
  HIGH: { label: 'High', color: 'bg-amber-500', emoji: '⚡' },
  NORMAL: { label: 'Normal', color: 'bg-blue-500', emoji: '📌' },
  LOW: { label: 'Low', color: 'bg-slate-500', emoji: '🐢' },
};

export default function JobsListPage() {
  const [search, setSearch] = useState('');
  const [statusFilter, setStatusFilter] = useState<string>('active');
  const [priorityFilter, setPriorityFilter] = useState<string>('all');
  const [dateFilter, setDateFilter] = useState<string>('all');

  const getDateRange = () => {
    if (dateFilter === 'all') return {};
    const now = new Date();
    const start = new Date(now);
    const end = new Date(now);
    if (dateFilter === 'today') {
      start.setHours(0, 0, 0, 0);
      end.setHours(23, 59, 59, 999);
    } else if (dateFilter === 'week') {
      start.setHours(0, 0, 0, 0);
      end.setDate(end.getDate() + 7);
      end.setHours(23, 59, 59, 999);
    }
    return { from: start.toISOString(), to: end.toISOString() };
  };

  const { data: jobs = [], isLoading, refetch, isRefetching } = useQuery({
    queryKey: ['services-jobs', statusFilter, priorityFilter, dateFilter, search],
    queryFn: () => jobsApi.list({
      status: statusFilter === 'active' || statusFilter === 'all' ? undefined : statusFilter,
      priority: priorityFilter === 'all' ? undefined : priorityFilter,
      search: search.trim() || undefined,
      ...getDateRange(),
    }),
    refetchInterval: 60_000,
  });

  const filtered = statusFilter === 'active'
    ? jobs.filter((j) => !['COMPLETED', 'CANCELLED', 'DRAFT'].includes(j.status))
    : jobs;

  const stats = {
    total: jobs.length,
    urgent: jobs.filter((j) => ['URGENT', 'EMERGENCY'].includes(j.priority) && !['COMPLETED', 'CANCELLED'].includes(j.status)).length,
    inProgress: jobs.filter((j) => ['DISPATCHED', 'EN_ROUTE', 'ARRIVED', 'IN_PROGRESS'].includes(j.status)).length,
    revenue: jobs.filter((j) => j.status === 'COMPLETED').reduce((s, j) => s + j.totalCharge, 0),
  };

  return (
    <div className="space-y-6">
      {/* HERO */}
      <section className="relative overflow-hidden rounded-3xl bg-gradient-to-br from-slate-950 via-blue-900 to-cyan-800 text-white p-6 sm:p-8 shadow-2xl">
        <div className="absolute -top-20 -right-20 h-72 w-72 rounded-full bg-blue-400/20 blur-3xl" />
        <div className="relative flex flex-col lg:flex-row lg:items-center lg:justify-between gap-5">
          <div>
            <div className="inline-flex items-center gap-2 rounded-full bg-white/15 backdrop-blur px-3 py-1 text-xs font-extrabold border border-white/20">
              <Sparkles className="h-3.5 w-3.5 text-amber-300" />
              Job Management
            </div>
            <h1 className="mt-3 text-3xl sm:text-4xl font-extrabold leading-tight">💼 Service Jobs</h1>
            <p className="mt-2 text-sm text-white/80 font-semibold">Track jobs from enquiry to completion</p>
          </div>
          <div className="flex items-center gap-2 flex-wrap">
            <button onClick={() => refetch()} disabled={isRefetching} className="inline-flex items-center gap-2 rounded-xl bg-white/15 hover:bg-white/25 px-4 py-2.5 text-sm font-bold backdrop-blur border border-white/20">
              <RefreshCw className={'h-4 w-4 ' + (isRefetching ? 'animate-spin' : '')} />
              Refresh
            </button>
            <Link to="/services-biz/jobs/new">
              <Button className="bg-white text-slate-900 hover:bg-slate-100">
                <Plus className="h-4 w-4" />
                New Job
              </Button>
            </Link>
          </div>
        </div>
      </section>

      {/* Stats */}
      <section className="grid grid-cols-2 lg:grid-cols-4 gap-4">
        <StatCard label="Total Jobs" value={stats.total} icon={Briefcase} color="blue" />
        <StatCard label="Urgent" value={stats.urgent} icon={Flame} color="red" highlight={stats.urgent > 0} />
        <StatCard label="In Progress" value={stats.inProgress} icon={Activity} color="amber" />
        <StatCard label="Revenue" value={formatPKR(stats.revenue)} icon={DollarSign} color="emerald" />
      </section>

      {/* Filters */}
      <section className="rounded-3xl bg-white dark:bg-neutral-900 border border-slate-200 dark:border-neutral-800 shadow-sm p-4 space-y-3">
        <div className="relative">
          <Search className="h-4 w-4 text-slate-400 absolute left-3.5 top-1/2 -translate-y-1/2" />
          <input value={search} onChange={(e) => setSearch(e.target.value)} placeholder="Search job#, customer, phone, serial..." className="h-11 w-full rounded-xl border-2 border-slate-200 dark:border-neutral-700 bg-white dark:bg-neutral-800 pl-10 pr-3 text-sm font-semibold focus:outline-none focus:border-blue-500" />
        </div>

        <div className="flex gap-1.5 overflow-x-auto pb-1">
          {[
            { v: 'active', label: '🔥 Active' },
            { v: 'all', label: 'All' },
            { v: 'ENQUIRY', label: 'Enquiry' },
            { v: 'CONFIRMED', label: 'Confirmed' },
            { v: 'ASSIGNED', label: 'Assigned' },
            { v: 'IN_PROGRESS', label: 'In Progress' },
            { v: 'AWAITING_PARTS', label: 'Awaiting Parts' },
            { v: 'COMPLETED', label: 'Completed' },
            { v: 'CANCELLED', label: 'Cancelled' },
          ].map((s) => (
            <button key={s.v} onClick={() => setStatusFilter(s.v)} className={
              'shrink-0 px-3 py-1.5 rounded-lg text-xs font-extrabold ' +
              (statusFilter === s.v ? 'bg-blue-600 text-white shadow' : 'bg-slate-100 dark:bg-neutral-800 text-slate-700')
            }>{s.label}</button>
          ))}
        </div>

        <div className="flex gap-1.5 flex-wrap">
          {['all', 'EMERGENCY', 'URGENT', 'HIGH', 'NORMAL', 'LOW'].map((p) => (
            <button key={p} onClick={() => setPriorityFilter(p)} className={
              'px-3 py-1.5 rounded-lg text-xs font-extrabold ' +
              (priorityFilter === p ? 'bg-slate-900 text-white shadow' : 'bg-slate-100 dark:bg-neutral-800 text-slate-700')
            }>
              {p === 'all' ? 'All Priority' : (PRIORITY_CONFIG[p as Priority]?.emoji || '') + ' ' + (PRIORITY_CONFIG[p as Priority]?.label || p)}
            </button>
          ))}
          <div className="w-px bg-slate-200 mx-1" />
          {[
            { v: 'all', label: 'All Time' },
            { v: 'today', label: 'Today' },
            { v: 'week', label: 'Next 7 days' },
          ].map((d) => (
            <button key={d.v} onClick={() => setDateFilter(d.v)} className={
              'px-3 py-1.5 rounded-lg text-xs font-extrabold ' +
              (dateFilter === d.v ? 'bg-cyan-600 text-white shadow' : 'bg-slate-100 dark:bg-neutral-800 text-slate-700')
            }>{d.label}</button>
          ))}
        </div>
      </section>

      {isLoading ? (
        <div className="grid gap-3">
          {[1, 2, 3, 4].map((i) => <div key={i} className="h-40 rounded-2xl bg-slate-100 dark:bg-neutral-800 animate-pulse" />)}
        </div>
      ) : filtered.length === 0 ? (
        <div className="rounded-3xl bg-white dark:bg-neutral-900 border-2 border-dashed border-slate-200 dark:border-neutral-800 p-12 text-center">
          <Briefcase className="h-16 w-16 text-slate-400 mx-auto mb-3" />
          <p className="font-extrabold text-slate-700">No jobs found</p>
          <Link to="/services-biz/jobs/new">
            <Button className="mt-4 bg-gradient-to-r from-blue-600 to-cyan-700">
              <Plus className="h-4 w-4" />
              Create First Job
            </Button>
          </Link>
        </div>
      ) : (
        <section className="grid gap-3">
          {filtered.map((job) => <JobCard key={job.id} job={job} />)}
        </section>
      )}
    </div>
  );
}

function StatCard({ label, value, icon: Icon, color, highlight }: any) {
  const colors: Record<string, string> = {
    blue: 'from-blue-500 to-cyan-600',
    red: 'from-red-500 to-rose-600',
    amber: 'from-amber-500 to-orange-600',
    emerald: 'from-emerald-500 to-green-600',
  };
  return (
    <div className={
      'rounded-2xl border-2 p-5 shadow-sm ' +
      (highlight ? 'bg-gradient-to-br from-red-50 to-rose-50 dark:from-red-950/40 dark:to-rose-950/40 border-red-300 animate-pulse' : 'bg-white dark:bg-neutral-900 border-slate-200 dark:border-neutral-800')
    }>
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

function JobCard({ job }: any) {
  const statusCfg = STATUS_CONFIG[job.status as JobStatus];
  const priorityCfg = PRIORITY_CONFIG[job.priority as Priority];
  const StatusIcon = statusCfg.icon;
  const remaining = job.totalCharge - job.paidAmount;
  const scheduled = job.scheduledStart ? new Date(job.scheduledStart) : null;
  const minsToStart = scheduled ? differenceInMinutes(scheduled, new Date()) : null;
  const isSoon = minsToStart !== null && minsToStart <= 60 && minsToStart >= 0 && ['CONFIRMED', 'SCHEDULED', 'ASSIGNED', 'DISPATCHED'].includes(job.status);

  return (
    <Link to={'/services-biz/jobs/' + job.id} className={
      'block rounded-2xl bg-white dark:bg-neutral-900 border-2 shadow-sm hover:shadow-lg transition p-4 ' +
      (isSoon ? 'border-amber-400 ring-2 ring-amber-100' :
       ['EMERGENCY', 'URGENT'].includes(job.priority) && !['COMPLETED', 'CANCELLED'].includes(job.status) ? 'border-red-300' :
       'border-slate-200 dark:border-neutral-800 hover:border-blue-300')
    }>
      <div className="flex items-start justify-between gap-3 flex-wrap">
        <div className="flex items-start gap-3 min-w-0 flex-1">
          <div className={
            'h-12 w-12 rounded-2xl text-white flex items-center justify-center shadow shrink-0 ' +
            (job.priority === 'EMERGENCY' ? 'bg-gradient-to-br from-red-500 to-rose-600 animate-pulse' :
             job.priority === 'URGENT' ? 'bg-gradient-to-br from-red-500 to-orange-600' :
             'bg-gradient-to-br from-blue-500 to-cyan-600')
          }>
            <Briefcase className="h-6 w-6" />
          </div>
          <div className="min-w-0 flex-1">
            <div className="flex items-center gap-2 flex-wrap">
              <span className="font-extrabold text-slate-900 dark:text-white">{job.jobNumber}</span>
              <span className={'px-2 py-0.5 rounded-full text-[9px] font-extrabold uppercase inline-flex items-center gap-1 text-white ' + statusCfg.color}>
                <StatusIcon className="h-2.5 w-2.5" />
                {statusCfg.label}
              </span>
              <span className={'px-2 py-0.5 rounded text-[9px] font-extrabold uppercase text-white ' + priorityCfg.color}>
                {priorityCfg.emoji} {priorityCfg.label}
              </span>
              {job.underWarranty && (
                <span className="px-2 py-0.5 rounded bg-emerald-100 dark:bg-emerald-950/40 text-emerald-700 text-[9px] font-extrabold uppercase">
                  🛡️ WARRANTY
                </span>
              )}
              {job.paymentStatus === 'PAID' && (
                <span className="px-2 py-0.5 rounded bg-emerald-100 text-emerald-700 text-[9px] font-extrabold uppercase">PAID</span>
              )}
              {isSoon && (
                <span className="px-2 py-0.5 rounded bg-amber-500 text-white text-[9px] font-extrabold uppercase animate-pulse">
                  IN {minsToStart}MIN
                </span>
              )}
            </div>

            <div className="mt-1 text-sm font-bold text-slate-900 dark:text-white">{job.serviceName}</div>
            <p className="text-xs text-slate-600 dark:text-slate-400 line-clamp-1">{job.problemDescription}</p>

            <div className="mt-2 flex items-center gap-3 text-xs text-slate-600 font-semibold flex-wrap">
              {job.customerName && <span className="inline-flex items-center gap-1"><User className="h-3 w-3" />{job.customerName}</span>}
              {job.customerPhone && <span className="inline-flex items-center gap-1"><Phone className="h-3 w-3" />{job.customerPhone}</span>}
              {job.area && <span className="inline-flex items-center gap-1"><MapPin className="h-3 w-3" />{job.area}</span>}
              {scheduled && (
                <span className="inline-flex items-center gap-1 font-extrabold">
                  <Clock className="h-3 w-3" />
                  {isToday(scheduled) ? 'Today' : isTomorrow(scheduled) ? 'Tomorrow' : format(scheduled, 'dd MMM')} {format(scheduled, 'HH:mm')}
                </span>
              )}
            </div>

            {job.brand && (
              <div className="mt-1 text-[10px] text-slate-500 font-bold">
                {job.brand} {job.modelNumber && '• ' + job.modelNumber} {job.serialNumber && '• SN: ' + job.serialNumber}
              </div>
            )}
          </div>
        </div>

        <div className="text-right shrink-0">
          <div className="text-xl font-extrabold text-emerald-700 dark:text-emerald-400 tabular-nums">{formatPKR(job.totalCharge)}</div>
          {remaining > 0 && job.paymentStatus !== 'PAID' && (
            <div className="text-[10px] font-extrabold text-amber-700">Due: {formatPKR(remaining)}</div>
          )}
          <div className="mt-2 inline-flex items-center gap-1 text-xs font-extrabold text-blue-600">
            View <ArrowRight className="h-3 w-3" />
          </div>
        </div>
      </div>
    </Link>
  );
}
