import { useState } from 'react';
import { useQuery } from '@tanstack/react-query';
import { Link } from 'react-router-dom';
import {
  Wrench, Plus, Search, RefreshCw, Sparkles, Clock, User, Phone, Car,
  CheckCircle2, AlertCircle, ArrowRight, Zap, DollarSign, Award,
} from 'lucide-react';
import { workshopJobsApi, type JobStatus } from '../api/workshop-jobs.api';
import { formatPKR } from '@core/lib/format';
import { Button } from '@core/ui/Button';
import { format, differenceInDays } from 'date-fns';

const STATUS_CONFIG: Record<JobStatus, { label: string; color: string }> = {
  DRAFT: { label: 'Draft', color: 'bg-slate-500' },
  QUOTED: { label: 'Quoted', color: 'bg-blue-500' },
  APPROVED: { label: 'Approved', color: 'bg-cyan-500' },
  IN_PROGRESS: { label: 'In Progress', color: 'bg-amber-500' },
  WAITING_PARTS: { label: 'Waiting Parts', color: 'bg-orange-500' },
  WAITING_APPROVAL: { label: 'Waiting Approval', color: 'bg-purple-500' },
  READY_FOR_TEST: { label: 'Ready for Test', color: 'bg-violet-500' },
  QUALITY_CHECK: { label: 'Quality Check', color: 'bg-indigo-500' },
  COMPLETED: { label: 'Completed', color: 'bg-emerald-500' },
  DELIVERED: { label: 'Delivered', color: 'bg-green-600' },
  CANCELLED: { label: 'Cancelled', color: 'bg-rose-500' },
  ON_HOLD: { label: 'On Hold', color: 'bg-slate-500' },
};

export default function WorkshopJobsPage() {
  const [search, setSearch] = useState('');
  const [statusFilter, setStatusFilter] = useState<string>('active');
  const [priorityFilter, setPriorityFilter] = useState<string>('all');

  const { data: jobs = [], isLoading, refetch, isRefetching } = useQuery({
    queryKey: ['workshop-jobs', statusFilter, priorityFilter, search],
    queryFn: () => workshopJobsApi.list({
      status: statusFilter === 'all' || statusFilter === 'active' ? undefined : statusFilter,
      priority: priorityFilter === 'all' ? undefined : priorityFilter,
      search: search.trim() || undefined,
    }),
    refetchInterval: 60_000,
  });

  const filtered = statusFilter === 'active'
    ? jobs.filter((j) => !['DELIVERED', 'CANCELLED', 'DRAFT'].includes(j.status))
    : jobs;

  return (
    <div className="space-y-6">
      <section className="relative overflow-hidden rounded-3xl bg-gradient-to-br from-slate-950 via-orange-900 to-red-700 text-white p-6 sm:p-8 shadow-2xl">
        <div className="absolute -top-20 -right-20 h-72 w-72 rounded-full bg-orange-400/20 blur-3xl" />
        <div className="relative flex flex-col lg:flex-row lg:items-center lg:justify-between gap-5">
          <div>
            <div className="inline-flex items-center gap-2 rounded-full bg-white/15 backdrop-blur px-3 py-1 text-xs font-extrabold border border-white/20">
              <Sparkles className="h-3.5 w-3.5 text-amber-300" />
              Repair & Service
            </div>
            <h1 className="mt-3 text-3xl sm:text-4xl font-extrabold leading-tight">🔧 Workshop Jobs</h1>
            <p className="mt-2 text-sm text-white/80 font-semibold">All repair, service & maintenance jobs</p>
          </div>
          <div className="flex items-center gap-2 flex-wrap">
            <button onClick={() => refetch()} disabled={isRefetching} className="inline-flex items-center gap-2 rounded-xl bg-white/15 hover:bg-white/25 px-4 py-2.5 text-sm font-bold backdrop-blur border border-white/20">
              <RefreshCw className={'h-4 w-4 ' + (isRefetching ? 'animate-spin' : '')} />
              Refresh
            </button>
            <Link to="/autoparts/jobs/new">
              <Button className="bg-white text-slate-900 hover:bg-slate-100">
                <Plus className="h-4 w-4" />
                New Job
              </Button>
            </Link>
          </div>
        </div>
      </section>

      <section className="rounded-3xl bg-white dark:bg-neutral-900 border border-slate-200 dark:border-neutral-800 shadow-sm p-4 space-y-3">
        <div className="relative">
          <Search className="h-4 w-4 text-slate-400 absolute left-3.5 top-1/2 -translate-y-1/2" />
          <input value={search} onChange={(e) => setSearch(e.target.value)} placeholder="Search by job #, registration, customer..." className="h-11 w-full rounded-xl border-2 border-slate-200 dark:border-neutral-700 bg-white dark:bg-neutral-800 pl-10 pr-3 text-sm font-semibold focus:outline-none focus:border-orange-500" />
        </div>
        <div className="flex gap-1.5 overflow-x-auto pb-1">
          {[
            { v: 'active', label: '🔥 Active' },
            { v: 'all', label: 'All' },
            ...Object.entries(STATUS_CONFIG).map(([k, v]) => ({ v: k, label: v.label })),
          ].map((s) => (
            <button key={s.v} onClick={() => setStatusFilter(s.v)} className={
              'shrink-0 px-3 py-1.5 rounded-lg text-xs font-extrabold ' +
              (statusFilter === s.v ? 'bg-orange-600 text-white shadow' : 'bg-slate-100 dark:bg-neutral-800 text-slate-700')
            }>{s.label}</button>
          ))}
        </div>
        <div className="flex gap-1.5">
          {['all', 'LOW', 'NORMAL', 'HIGH', 'URGENT', 'EMERGENCY'].map((p) => (
            <button key={p} onClick={() => setPriorityFilter(p)} className={
              'px-3 py-1.5 rounded-lg text-xs font-extrabold ' +
              (priorityFilter === p ? 'bg-slate-900 text-white shadow' : 'bg-slate-100 dark:bg-neutral-800 text-slate-700')
            }>{p === 'all' ? 'All Priority' : p}</button>
          ))}
        </div>
      </section>

      {isLoading ? (
        <div className="grid gap-3">
          {[1, 2, 3].map((i) => <div key={i} className="h-32 rounded-2xl bg-slate-100 dark:bg-neutral-800 animate-pulse" />)}
        </div>
      ) : filtered.length === 0 ? (
        <div className="rounded-3xl bg-white dark:bg-neutral-900 border-2 border-dashed p-12 text-center">
          <Wrench className="h-16 w-16 text-slate-400 mx-auto mb-3" />
          <p className="font-extrabold text-slate-700">No jobs found</p>
          <Link to="/autoparts/jobs/new">
            <Button className="mt-4 bg-gradient-to-r from-orange-600 to-red-700">
              <Plus className="h-4 w-4" />
              Create First Job
            </Button>
          </Link>
        </div>
      ) : (
        <section className="grid gap-3">
          {filtered.map((job) => {
            const cfg = STATUS_CONFIG[job.status];
            const daysLeft = job.promisedAt ? differenceInDays(new Date(job.promisedAt), new Date()) : null;
            const isOverdue = daysLeft !== null && daysLeft < 0 && !['DELIVERED', 'CANCELLED'].includes(job.status);
            const remaining = job.total - job.paidAmount;
            return (
              <Link key={job.id} to={'/autoparts/jobs/' + job.id} className={
                'block rounded-2xl bg-white dark:bg-neutral-900 border-2 shadow-sm hover:shadow-lg transition p-4 ' +
                (isOverdue ? 'border-rose-400 ring-2 ring-rose-100' : 'border-slate-200 dark:border-neutral-800 hover:border-orange-300')
              }>
                <div className="flex items-start justify-between gap-3 flex-wrap">
                  <div className="flex items-start gap-3 min-w-0 flex-1">
                    <div className="h-12 w-12 rounded-2xl bg-gradient-to-br from-orange-500 to-red-600 text-white flex items-center justify-center shadow shrink-0">
                      <Wrench className="h-6 w-6" />
                    </div>
                    <div className="min-w-0 flex-1">
                      <div className="flex items-center gap-2 flex-wrap">
                        <span className="font-extrabold text-slate-900 dark:text-white">{job.jobNumber}</span>
                        <span className={'px-2 py-0.5 rounded-full text-[9px] font-extrabold uppercase text-white ' + cfg.color}>{cfg.label}</span>
                        <span className={
                          'px-2 py-0.5 rounded text-[9px] font-extrabold uppercase text-white ' +
                          (job.priority === 'EMERGENCY' ? 'bg-red-700 animate-pulse' :
                           job.priority === 'URGENT' ? 'bg-red-600' :
                           job.priority === 'HIGH' ? 'bg-amber-500' : 'bg-slate-500')
                        }>{job.priority}</span>
                        {isOverdue && <span className="px-2 py-0.5 rounded bg-rose-500 text-white text-[9px] font-extrabold uppercase animate-pulse">OVERDUE</span>}
                        {job.paymentStatus === 'PAID' && <span className="px-2 py-0.5 rounded bg-emerald-100 text-emerald-700 text-[9px] font-extrabold uppercase">PAID</span>}
                      </div>
                      <div className="mt-1 flex items-center gap-3 text-xs text-slate-600 font-bold flex-wrap">
                        <span className="inline-flex items-center gap-1"><Car className="h-3 w-3" />{job.registrationNumber} • {job.makeName} {job.modelName}</span>
                        {job.customerName && <span className="inline-flex items-center gap-1"><User className="h-3 w-3" />{job.customerName}</span>}
                        {job.customerPhone && <span className="inline-flex items-center gap-1"><Phone className="h-3 w-3" />{job.customerPhone}</span>}
                        {job.promisedAt && (
                          <span className={'inline-flex items-center gap-1 font-extrabold ' + (isOverdue ? 'text-rose-700' : 'text-slate-700')}>
                            <Clock className="h-3 w-3" />
                            Due: {format(new Date(job.promisedAt), 'dd MMM')}
                          </span>
                        )}
                      </div>
                      {job.customerComplaint && <p className="mt-1 text-xs italic text-slate-600 line-clamp-1">"{job.customerComplaint}"</p>}
                    </div>
                  </div>
                  <div className="text-right shrink-0">
                    <div className="text-xl font-extrabold text-emerald-700 tabular-nums">{formatPKR(job.total)}</div>
                    {remaining > 0 && <div className="text-[10px] font-extrabold text-amber-700">Due: {formatPKR(remaining)}</div>}
                    <div className="mt-1 inline-flex items-center gap-1 text-xs font-extrabold text-orange-600">
                      View <ArrowRight className="h-3 w-3" />
                    </div>
                  </div>
                </div>
              </Link>
            );
          })}
        </section>
      )}
    </div>
  );
}
