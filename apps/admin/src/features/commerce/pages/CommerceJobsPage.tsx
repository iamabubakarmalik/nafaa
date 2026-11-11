/**
 * Catalog jobs (import all, link all, push, publish) across shops, with
 * progress and errors. Running jobs can be cancelled; failed or cancelled
 * ones can be started again with the same work list. Paged on the server.
 */

import { useState } from 'react';
import { Link } from 'react-router-dom';
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import { toast } from 'sonner';
import { CheckCircle2, Layers, Lightbulb, Play, RotateCcw, XCircle } from 'lucide-react';
import { Button, FilterBar, FilterMenu, PageHero, PageShell, SearchField, Tabs, confirmDialog, heroButton } from '@/design-system/components';
import { PageGuide, usePageGuide } from '@core/components/PageGuide';
import { adminCommerceApi } from '@/api/admin-commerce.api';
import { ListCard, useListParams } from '@/ui';
import { errMsg, num } from '@/features/shared/kit';
import { dateTime, enumLabel, JobStatus, kindLabel, Progress, when } from '../components/CommerceUi';

const TABS = [['active', 'Running'], ['failed', 'With failures'], ['DONE', 'Finished'], ['CANCELLED', 'Cancelled'], ['all', 'All']] as const;
const JOB_KINDS = ['ALL', 'IMPORT_ALL', 'LINK_ALL', 'PUSH', 'PUBLISH'];

export default function CommerceJobsPage() {
  const qc = useQueryClient();
  const guide = usePageGuide();
  const [openErrors, setOpenErrors] = useState<string | null>(null);
  const list = useListParams({ status: 'active', kind: 'ALL' });
  const { status, kind } = list.filters;
  const { data, isLoading, isFetching, error } = useQuery({
    queryKey: ['admin-commerce-jobs', status, kind, list.debouncedSearch, list.page, list.limit],
    queryFn: () => adminCommerceApi.jobs({ status, kind: kind === 'ALL' ? undefined : kind, search: list.debouncedSearch || undefined, page: list.page, limit: list.limit }),
    placeholderData: (prev) => prev,
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
  const jobs = data?.jobs ?? [];

  return (
    <PageShell>
      <PageHero
        title="Catalog jobs"
        chip={data ? `${num(data.meta.total)} in this view` : undefined}
        busy={isFetching}
        loading={isLoading}
        actions={<button type="button" className={heroButton} onClick={guide.open} aria-label="How this page works (G)"><Lightbulb className="h-4 w-4" /></button>}
        stats={data ? [
          { label: 'Queued', value: num(counts.QUEUED) },
          { label: 'Running', value: num(counts.RUNNING) },
          { label: 'Finished', value: num(counts.DONE) },
          { label: 'Failed', value: num(counts.FAILED), hint: counts.CANCELLED ? `${num(counts.CANCELLED)} cancelled` : undefined },
        ] : undefined}
      />

      <Tabs value={status as (typeof TABS)[number][0]} onChange={(v) => list.setFilter('status', v)} label="Job state"
        items={TABS.map(([value, label]) => ({ value, label, ...(value === 'active' ? { count: (counts.QUEUED ?? 0) + (counts.RUNNING ?? 0) } : value === 'DONE' ? { count: counts.DONE ?? 0 } : {}) }))} />

      <FilterBar search={<SearchField value={list.search} onChange={list.setSearch} placeholder="Search by shop name" />}>
        <FilterMenu icon={Layers} label="Work" value={kind} active={kind !== 'ALL'} onChange={(v) => list.setFilter('kind', v)} align="right"
          options={JOB_KINDS.map((k) => ({ value: k, label: k === 'ALL' ? 'All kinds of work' : enumLabel(k) }))} />
      </FilterBar>

      <ListCard
        loading={isLoading}
        empty={!!error || !jobs.length}
        emptyIcon={<CheckCircle2 className="h-6 w-6" />}
        emptyTitle={error ? 'Could not load jobs' : 'No jobs here'}
        emptyText={error ? 'Try again in a moment.' : 'Nothing matches this view.'}
        page={list.page} limit={list.limit} total={data?.meta.total} onPage={list.setPage} onLimit={list.setLimit}
      >
        <ul className="divide-y divide-slate-100">
          {jobs.map((j) => {
            const active = j.status === 'QUEUED' || j.status === 'RUNNING';
            return (
              <li key={j.id} className="px-4 py-4 sm:px-5">
                <div className="flex flex-wrap items-center gap-2">
                  <JobStatus status={j.status} stalled={j.stalled} />
                  <span className="font-semibold text-slate-900">{enumLabel(j.kind)}</span>
                  <Link to={`/tenants/${j.tenantId}`} className="text-[0.875rem] text-slate-700 hover:text-brand-700">{j.tenantName ?? j.tenantId}</Link>
                  {j.channel && <Link to={`/commerce/channels?channel=${j.channel.id}`} className="text-[0.75rem] text-slate-500 hover:text-brand-700">{j.channel.displayName} · {kindLabel(j.channel.type)}</Link>}
                  <div className="ms-auto flex gap-2">
                    {active && (
                      <Button size="sm" variant="secondary" leftIcon={<XCircle className="h-4 w-4" />} loading={cancel.isPending && cancel.variables === j.id}
                        onClick={async () => { if (await confirmDialog({ title: 'Cancel this job?', text: 'Work already done stays.', yes: 'Cancel job', danger: true })) cancel.mutate(j.id); }}>Cancel</Button>
                    )}
                    {!active && (j.status !== 'DONE' || j.failed > 0) && (
                      <Button size="sm" variant="secondary" leftIcon={<RotateCcw className="h-4 w-4" />} loading={retry.isPending && retry.variables === j.id}
                        onClick={async () => { if (await confirmDialog({ title: 'Start again?', text: `Run this ${enumLabel(j.kind)} job again with all ${j.total} items.`, yes: 'Start again' })) retry.mutate(j.id); }}>Retry</Button>
                    )}
                  </div>
                </div>
                <div className="mt-3 flex items-center gap-3">
                  <div className="flex-1"><Progress percent={j.percent} failed={j.failed} /></div>
                  <span className="whitespace-nowrap text-[0.75rem] tabular-nums text-slate-600">{j.done}/{j.total} done{j.failed ? <span className="font-semibold text-rose-700">, {j.failed} failed</span> : null} · {j.percent}%</span>
                </div>
                <div className="mt-1 text-[0.75rem] text-slate-500">
                  Created {dateTime(j.createdAt)}{j.startedAt ? ` · started ${when(j.startedAt)}` : ''}{j.finishedAt ? ` · finished ${when(j.finishedAt)}` : ''}{(j.params as { by?: string } | null)?.by === 'admin' ? ' · started by admin' : ''}
                </div>
                {!!j.errors.length && (
                  <div className="mt-2">
                    <button type="button" onClick={() => setOpenErrors(openErrors === j.id ? null : j.id)} className="text-[0.75rem] font-semibold text-rose-700 hover:underline">
                      {openErrors === j.id ? 'Hide' : 'Show'} {j.errors.length} error{j.errors.length === 1 ? '' : 's'}
                    </button>
                    {openErrors === j.id && (
                      <ul className="mt-2 space-y-1 rounded-xl bg-rose-50 p-3 text-[0.75rem] text-rose-800">
                        {j.errors.map((e, i) => <li key={i} className="break-words">{e}</li>)}
                      </ul>
                    )}
                  </div>
                )}
              </li>
            );
          })}
        </ul>
      </ListCard>

      {guide.isOpen && (
        <PageGuide
          title="Catalog jobs"
          description="Background work on shop catalogs: import all, link all, push and publish."
          flowTitle="Life of a job"
          flow={[
            { label: 'Queued', hint: 'Waiting for a worker', icon: Layers, color: '#0284c7' },
            { label: 'Running', hint: 'Small chunks, pause per channel', icon: Play, color: '#4f46e5' },
            { label: 'Finished', hint: 'All items done', icon: CheckCircle2, color: '#059669' },
            { label: 'Failed', hint: 'Retry with the same list', icon: RotateCcw, color: '#e11d48' },
          ]}
          steps={[
            { icon: Layers, color: '#4f46e5', title: 'Watch running jobs', text: 'The Running tab refreshes every 5 seconds. "Stalled" means no worker has touched the job for 10 minutes.' },
            { icon: XCircle, color: '#e11d48', title: 'Cancel', text: 'Cancel stops the job. Work already done stays.' },
            { icon: RotateCcw, color: '#059669', title: 'Retry', text: 'Retry starts the same work again. Items already done are skipped.' },
          ]}
          tips={['Search by shop name to see one shop’s jobs.', 'Open "Show errors" on a row to read why items failed.']}
          shortcuts={[['/', 'Search'], ['G', 'This guide']]}
          onClose={guide.close}
        />
      )}
    </PageShell>
  );
}
