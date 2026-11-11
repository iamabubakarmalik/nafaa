/**
 * Background jobs: every scheduled job the API runs, grouped by area, with
 * its schedule, last run and result. Admins can pause a job (it skips its
 * runs until resumed) or run it once now. Run counts start again at each deploy.
 */

import { useMemo } from 'react';
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import { toast } from 'sonner';
import { AlertTriangle, CheckCircle2, Clock, Filter, Layers, Lightbulb, Loader2, Pause, Play, RotateCw, Timer } from 'lucide-react';
import {
  Card, FilterBar, FilterChip, FilterMenu, IconButton, PageHero, PageShell, SearchField, Skeleton, Switch, Table, TBody, Td, Th, THead, Tr, confirmDialog, heroButton,
} from '@/design-system/components';
import { PageGuide, usePageGuide } from '@core/components/PageGuide';
import { adminSystemApi, type SystemJob } from '@/api/admin-system.api';
import { useCan } from '@/lib/access';
import { apiError } from '@/lib/errors';
import { formatDateTime, formatRelative, num } from '@/lib/format';
import { StatusBadge, useListParams } from '@/ui';
import { JOB_AREAS, describeSchedule, formatDuration, jobInfo } from '../lib/jobs';

const KEY = ['admin', 'system', 'jobs'];
const STATES = [
  { value: 'ALL', label: 'All jobs' },
  { value: 'paused', label: 'Paused' },
  { value: 'failing', label: 'Last run failed' },
  { value: 'running', label: 'Running now' },
  { value: 'never', label: 'Not run since deploy' },
];

function Result({ job }: { job: SystemJob }) {
  if (job.running) return <StatusBadge value="RUNNING" label="Running" variant="info" />;
  if (job.lastOk === false) return <StatusBadge value="FAILED" label="Failed" />;
  if (job.lastOk === true) return <StatusBadge value="OK" label="OK" variant="success" />;
  return <span className="text-[0.75rem] text-slate-400">Not run yet</span>;
}

export default function JobsPage() {
  const qc = useQueryClient();
  const guide = usePageGuide();
  const can = useCan();
  const canManage = can('system.manage');
  const list = useListParams({ area: 'ALL', state: 'ALL' });
  const { area, state } = list.filters;
  const jobs = useQuery({ queryKey: KEY, queryFn: adminSystemApi.jobs, refetchInterval: 15_000 });
  const all = useMemo(() => jobs.data ?? [], [jobs.data]);

  // The job list is fixed and small (one row per scheduled job), so it is filtered here.
  const shown = useMemo(() => {
    const term = list.debouncedSearch.trim().toLowerCase();
    return all.filter((j) => {
      const info = jobInfo(j.key);
      if (area !== 'ALL' && info.area !== area) return false;
      if (state === 'paused' && !j.paused) return false;
      if (state === 'failing' && j.lastOk !== false) return false;
      if (state === 'running' && !j.running) return false;
      if (state === 'never' && j.runs > 0) return false;
      return !term || `${info.label} ${info.text} ${j.key}`.toLowerCase().includes(term);
    });
  }, [all, area, state, list.debouncedSearch]);

  const groups = JOB_AREAS.map((a) => ({ area: a, items: shown.filter((j) => jobInfo(j.key).area === a) })).filter((g) => g.items.length);

  const pause = useMutation({
    mutationFn: ({ key, paused }: { key: string; paused: boolean }) => adminSystemApi.pauseJob(key, paused),
    onSuccess: (job) => {
      qc.setQueryData<SystemJob[]>(KEY, (prev) => prev?.map((j) => (j.key === job.key ? job : j)));
      qc.invalidateQueries({ queryKey: ['admin', 'system', 'controls'] });
      toast.success(job.paused ? `${jobInfo(job.key).label} paused` : `${jobInfo(job.key).label} resumed`);
    },
    onError: (e) => toast.error(apiError(e)),
  });
  const run = useMutation({
    mutationFn: adminSystemApi.runJob,
    onSuccess: (_r, key) => { toast.success(`${jobInfo(key).label} started`); setTimeout(() => qc.invalidateQueries({ queryKey: KEY }), 1500); },
    onError: (e) => toast.error(apiError(e)),
  });

  const togglePause = async (job: SystemJob, paused: boolean) => {
    const info = jobInfo(job.key);
    if (paused && !(await confirmDialog({ title: `Pause “${info.label}”?`, text: `${info.text} It will not run until you resume it, even after a deploy.`, yes: 'Pause', danger: true }))) return;
    pause.mutate({ key: job.key, paused });
  };
  const runNow = async (job: SystemJob) => {
    const info = jobInfo(job.key);
    if (!(await confirmDialog({ title: `Run “${info.label}” now?`, text: `${info.text} It runs once in the background${job.paused ? ', even though it is paused' : ''}.`, yes: 'Run now' }))) return;
    run.mutate(job.key);
  };

  const paused = all.filter((j) => j.paused).length;
  const failing = all.filter((j) => j.lastOk === false).length;
  const running = all.filter((j) => j.running).length;
  const chips = [
    area !== 'ALL' && <FilterChip key="a" onRemove={() => list.setFilter('area', 'ALL')}>{area}</FilterChip>,
    state !== 'ALL' && <FilterChip key="s" onRemove={() => list.setFilter('state', 'ALL')}>{STATES.find((s) => s.value === state)?.label}</FilterChip>,
  ].filter(Boolean);

  return (
    <PageShell>
      <PageHero
        title="Background jobs"
        chip={jobs.data ? `${all.length} jobs` : undefined}
        busy={jobs.isFetching}
        loading={jobs.isLoading}
        actions={
          <>
            <button type="button" className={heroButton} onClick={() => jobs.refetch()}><RotateCw className="h-4 w-4" /> Refresh</button>
            <button type="button" className={heroButton} onClick={guide.open} aria-label="How this page works (G)"><Lightbulb className="h-4 w-4" /></button>
          </>
        }
        stats={jobs.data ? [
          { label: 'Running now', value: running },
          { label: 'Paused', value: paused, hint: paused ? 'Not running' : 'None paused' },
          { label: 'Last run failed', value: failing },
          { label: 'Runs since deploy', value: num(all.reduce((n, j) => n + j.runs, 0)) },
        ] : undefined}
      />

      <FilterBar
        search={<SearchField value={list.search} onChange={list.setSearch} placeholder="Search jobs" />}
        chips={chips.length ? chips : undefined}
        onClear={list.clear}
      >
        <FilterMenu icon={Layers} label="Area" value={area} active={area !== 'ALL'} onChange={(v) => list.setFilter('area', v)}
          options={[{ value: 'ALL', label: 'All areas' }, ...JOB_AREAS.map((a) => ({ value: a, label: a }))]} />
        <FilterMenu icon={Filter} label="State" value={state} active={state !== 'ALL'} onChange={(v) => list.setFilter('state', v)} options={STATES} align="right" />
      </FilterBar>

      {jobs.isLoading && <Skeleton className="h-96 rounded-3xl" />}
      {jobs.data && !groups.length && (
        <Card><p className="py-8 text-center text-[0.875rem] text-slate-500">No jobs match. Clear the filters to see all.</p></Card>
      )}

      {groups.map((g) => (
        <Card key={g.area} title={g.area} description={`${g.items.length} ${g.items.length === 1 ? 'job' : 'jobs'}`} flush>
          <Table minWidth="56rem">
            <THead>
              <Tr>
                <Th>Job</Th><Th>Schedule</Th><Th>Last run</Th><Th>Result</Th><Th align="right">Runs</Th><Th align="right">Running</Th><Th align="right"><span className="sr-only">Run now</span></Th>
              </Tr>
            </THead>
            <TBody>
              {g.items.map((j) => {
                const info = jobInfo(j.key);
                return (
                  <Tr key={j.key} className={j.paused ? 'bg-slate-50/70' : undefined}>
                    <Td className="max-w-[22rem]">
                      <div className="flex items-center gap-1.5 font-semibold text-slate-900">
                        {info.label}
                        {j.paused && <StatusBadge value="PAUSED" label="Paused" variant="warning" />}
                      </div>
                      {info.text && <div className="text-[0.75rem] leading-snug text-slate-500">{info.text}</div>}
                      {j.lastOk === false && j.lastError && (
                        <div className="mt-1 flex items-start gap-1 text-[0.75rem] text-rose-600"><AlertTriangle className="mt-0.5 h-3 w-3 shrink-0" /><span className="line-clamp-2 break-all">{j.lastError}</span></div>
                      )}
                    </Td>
                    <Td className="whitespace-nowrap text-[0.8125rem] text-slate-700" title={`${j.schedule}${j.timeZone ? ` (${j.timeZone})` : ' (UTC)'}`}>{describeSchedule(j.schedule, j.timeZone)}</Td>
                    <Td className="whitespace-nowrap text-[0.8125rem]">
                      {j.lastStartedAt ? (
                        <span title={formatDateTime(j.lastStartedAt)}>
                          <span className="text-slate-800">{formatRelative(j.lastStartedAt)}</span>
                          <span className="block text-[0.6875rem] text-slate-400">{j.running ? 'still running' : `took ${formatDuration(j.lastDurationMs)}`}</span>
                        </span>
                      ) : <span className="text-slate-400">—</span>}
                    </Td>
                    <Td><Result job={j} /></Td>
                    <Td align="right" className="whitespace-nowrap tabular-nums text-[0.8125rem]">
                      {num(j.runs)}
                      {(j.failures > 0 || j.skipped > 0) && (
                        <span className="block text-[0.6875rem] text-slate-400">
                          {j.failures > 0 && <span className="text-rose-600">{num(j.failures)} failed</span>}
                          {j.failures > 0 && j.skipped > 0 && ' · '}
                          {j.skipped > 0 && `${num(j.skipped)} skipped`}
                        </span>
                      )}
                    </Td>
                    <Td align="right">
                      <Switch size="sm" checked={!j.paused} disabled={!canManage || pause.isPending} aria-label={j.paused ? `Resume ${info.label}` : `Pause ${info.label}`}
                        onChange={(e) => togglePause(j, !e.target.checked)} />
                    </Td>
                    <Td align="right">
                      {canManage && j.canRunNow && (
                        <IconButton label={`Run ${info.label} now`} size="sm" variant="ghost" disabled={j.running || (run.isPending && run.variables === j.key)} onClick={() => runNow(j)}>
                          {j.running ? <Loader2 className="h-4 w-4 animate-spin" /> : <Play className="h-4 w-4" />}
                        </IconButton>
                      )}
                    </Td>
                  </Tr>
                );
              })}
            </TBody>
          </Table>
        </Card>
      ))}

      {guide.isOpen && (
        <PageGuide
          title="Background jobs"
          description="Work the server does on its own on a schedule: online store syncs, reminders, expiry checks and clean-ups."
          flowTitle="How a job runs"
          flow={[
            { label: 'Its time comes', hint: 'Schedule', icon: Clock, color: '#4f46e5' },
            { label: 'Paused?', hint: 'Then skip', icon: Pause, color: '#d97706' },
            { label: 'Runs', icon: Play, color: '#0284c7' },
            { label: 'Result saved', hint: 'Errors to the error log', icon: CheckCircle2, color: '#059669' },
          ]}
          steps={[
            { icon: Pause, color: '#d97706', title: 'Pause', text: 'Switch a job off to stop it, for example when a channel misbehaves. It stays paused after deploys until you switch it back on.' },
            { icon: Play, color: '#0284c7', title: 'Run now', text: 'Runs the job once in the background, even if it is paused. The result shows here in a few seconds.' },
            { icon: Timer, color: '#059669', title: 'Times', text: 'Schedules are shown in Pakistan time. Run counts start again after each deploy.' },
          ]}
          tips={['A failed run also shows in System → Errors with the full detail.', 'Some jobs can also be switched off on the server; those show runs that finish at once.']}
          shortcuts={[['/', 'Search'], ['G', 'This guide']]}
          onClose={guide.close}
        />
      )}
    </PageShell>
  );
}
