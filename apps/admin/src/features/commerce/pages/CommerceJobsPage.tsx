/**
 * Catalog jobs (import all, link all, push, publish) across shops, with
 * progress and errors. Running jobs can be cancelled; failed or cancelled
 * ones can be started again with the same work list.
 */

import { useState } from 'react';
import { Link } from 'react-router-dom';
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import { toast } from 'sonner';
import { RotateCcw, XCircle } from 'lucide-react';
import { adminCommerceApi } from '@/api/admin-commerce.api';
import { Button } from '@/components/ui/Button';
import { cn } from '@/lib/cn';
import { Card, CommerceHero, dateTime, Empty, enumLabel, JobStatus, kindLabel, Progress, Stat, when } from '../components/CommerceUi';

const TABS = [['active', 'Running'], ['failed', 'With failures'], ['DONE', 'Finished'], ['CANCELLED', 'Cancelled'], ['all', 'All']] as const;
const errMsg = (e: any) => e?.response?.data?.message ?? e?.message ?? 'Action failed';

export default function CommerceJobsPage() {
  const qc = useQueryClient();
  const [status, setStatus] = useState<string>('active');
  const [openErrors, setOpenErrors] = useState<string | null>(null);
  const { data, isLoading, error } = useQuery({
    queryKey: ['admin-commerce-jobs', status],
    queryFn: () => adminCommerceApi.jobs({ status }),
    refetchInterval: status === 'active' ? 5000 : false,
  });
  const done = () => qc.invalidateQueries({ queryKey: ['admin-commerce-jobs'] });
  const cancel = useMutation({ mutationFn: adminCommerceApi.cancelJob, onSuccess: () => { toast.success('Job cancelled'); done(); }, onError: (e) => toast.error(errMsg(e)) });
  const retry = useMutation({
    mutationFn: adminCommerceApi.retryJob,
    onSuccess: (r) => { toast.success(r.existing ? 'The same job is already running' : 'Job started again'); done(); },
    onError: (e) => toast.error(errMsg(e)),
  });
  const counts = data?.counts ?? {};

  return (
    <div className="space-y-6">
      <CommerceHero title="Catalog jobs" subtitle="Background catalog work in every shop: import all, link all, push and publish. Jobs run in small chunks with a pause per platform." />

      <section className="grid grid-cols-2 gap-3 lg:grid-cols-5">
        <Stat label="Queued" value={counts.QUEUED ?? 0} />
        <Stat label="Running" value={counts.RUNNING ?? 0} tone="brand" />
        <Stat label="Finished" value={counts.DONE ?? 0} tone="emerald" />
        <Stat label="Failed" value={counts.FAILED ?? 0} tone={counts.FAILED ? 'rose' : undefined} />
        <Stat label="Cancelled" value={counts.CANCELLED ?? 0} />
      </section>

      <div className="inline-flex flex-wrap rounded-xl bg-slate-200/70 p-1">
        {TABS.map(([k, label]) => (
          <button key={k} type="button" onClick={() => setStatus(k)}
            className={cn('rounded-lg px-3 py-1.5 text-xs font-semibold transition', status === k ? 'bg-white text-slate-900 shadow-sm' : 'text-slate-600 hover:text-slate-900')}>{label}</button>
        ))}
      </div>

      <Card className="p-0">
        {isLoading ? <Empty>Loading…</Empty> : error ? <Empty>Could not load jobs.</Empty> : !data?.jobs.length ? <Empty>No jobs here.</Empty> : (
          <ul className="divide-y divide-slate-100">
            {data.jobs.map((j) => {
              const active = j.status === 'QUEUED' || j.status === 'RUNNING';
              return (
                <li key={j.id} className="px-5 py-4">
                  <div className="flex flex-wrap items-center gap-2">
                    <JobStatus status={j.status} stalled={j.stalled} />
                    <span className="font-semibold text-slate-900">{enumLabel(j.kind)}</span>
                    <Link to={`/tenants/${j.tenantId}`} className="text-sm text-slate-700 hover:text-indigo-700">{j.tenantName ?? j.tenantId}</Link>
                    {j.channel && <Link to={`/commerce/channels?channel=${j.channel.id}`} className="text-xs text-slate-500 hover:text-indigo-700">{j.channel.displayName} · {kindLabel(j.channel.type)}</Link>}
                    <div className="ml-auto flex gap-2">
                      {active && <Button size="sm" variant="secondary" loading={cancel.isPending && cancel.variables === j.id} onClick={() => window.confirm('Cancel this job? Work already done stays.') && cancel.mutate(j.id)}><XCircle className="h-4 w-4" />Cancel</Button>}
                      {!active && (j.status !== 'DONE' || j.failed > 0) && <Button size="sm" variant="secondary" loading={retry.isPending && retry.variables === j.id} onClick={() => window.confirm(`Start this ${enumLabel(j.kind)} job again with all ${j.total} items?`) && retry.mutate(j.id)}><RotateCcw className="h-4 w-4" />Retry</Button>}
                    </div>
                  </div>
                  <div className="mt-3 flex items-center gap-3">
                    <div className="flex-1"><Progress percent={j.percent} failed={j.failed} /></div>
                    <span className="whitespace-nowrap text-xs tabular-nums text-slate-600">{j.done}/{j.total} done{j.failed ? <span className="font-semibold text-rose-700">, {j.failed} failed</span> : null} · {j.percent}%</span>
                  </div>
                  <div className="mt-1 text-xs text-slate-500">
                    Created {dateTime(j.createdAt)}{j.startedAt ? ` · started ${when(j.startedAt)}` : ''}{j.finishedAt ? ` · finished ${when(j.finishedAt)}` : ''}{(j.params as any)?.by === 'admin' ? ' · started by admin' : ''}
                  </div>
                  {!!j.errors.length && (
                    <div className="mt-2">
                      <button type="button" onClick={() => setOpenErrors(openErrors === j.id ? null : j.id)} className="text-xs font-semibold text-rose-700 hover:underline">
                        {openErrors === j.id ? 'Hide' : 'Show'} {j.errors.length} error{j.errors.length === 1 ? '' : 's'}
                      </button>
                      {openErrors === j.id && (
                        <ul className="mt-2 space-y-1 rounded-xl bg-rose-50 p-3 text-xs text-rose-800">
                          {j.errors.map((e, i) => <li key={i} className="break-words">{e}</li>)}
                        </ul>
                      )}
                    </div>
                  )}
                </li>
              );
            })}
          </ul>
        )}
      </Card>
    </div>
  );
}
