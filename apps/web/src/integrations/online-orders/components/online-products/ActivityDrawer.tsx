/**
 * Background catalog jobs (import all, link all, push, publish). The page
 * shows one small "Activity" chip and a thin progress line while something
 * runs; the drawer lists every job with progress, errors and cancel. A job
 * that finishes reloads the grid once and leaves a toast.
 */

import { useEffect, useRef, useState } from 'react';
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import { toast } from 'sonner';
import { Activity, AlertTriangle, CheckCircle2, ChevronDown, Loader2, XCircle } from 'lucide-react';
import { Button, Drawer, EmptyState } from '@/design-system/components';
import { cn } from '@core/lib/cn';
import { t } from '@core/i18n';
import { apiErrorMessage } from '../../api/online-orders.api';
import { ONLINE_PRODUCTS_KEY, onlineProductsApi, type CatalogJob, type OnlineChannel } from '../../api/online-products.api';
import { timeAgo } from '../../lib/labels';
import { ChannelMark, channelName, refreshOnlineProducts } from './meta';
import { causeInfo, isNafaaText, syncCause } from './syncErrors';

export const JOBS_KEY = [ONLINE_PRODUCTS_KEY, 'jobs'] as const;
export const jobActive = (j: CatalogJob) => j.status === 'QUEUED' || j.status === 'RUNNING';
const jobBad = (j: CatalogJob) => j.status === 'FAILED' || (j.status === 'DONE' && j.failed > 0);

/** "Shirt: <stored error>" with the stored error in the screen language. */
function jobError(e: string) {
  const at = e.indexOf(': ');
  const [head, tail] = at > 0 ? [e.slice(0, at), e.slice(at + 2)] : ['', e];
  if (!isNafaaText(tail)) return e;
  const title = causeInfo(syncCause(tail)).title;
  return head ? `${head}: ${title}` : title;
}

export function useCatalogJobs() {
  return useQuery({
    queryKey: JOBS_KEY,
    queryFn: onlineProductsApi.jobs,
    refetchInterval: (q) => ((q.state.data?.jobs ?? []).some(jobActive) ? 2000 : 30_000),
  });
}

export function jobTitle(j: CatalogJob, channels: OnlineChannel[]) {
  const ch = channels.find((c) => c.id === j.integrationId);
  const where = ch ? channelName(ch) : t('sab channels');
  switch (j.kind) {
    case 'IMPORT_ALL': return t('{{where}} se products Nafaa me', { where });
    case 'LINK_ALL': return t('{{where}}: pakke match jor rahe hain', { where });
    case 'PUBLISH': return t('{{where}} par naye products', { where });
    default: return t('{{where}} par bhej rahe hain', { where });
  }
}

/** Jobs state for the page: the list, what is running, and the toast when one ends. */
export function useJobsActivity(channels: OnlineChannel[]) {
  const qc = useQueryClient();
  const q = useCatalogJobs();
  const jobs = q.data?.jobs ?? [];
  const wasActive = useRef(new Set<string>());
  useEffect(() => {
    for (const j of jobs) {
      if (jobActive(j)) { wasActive.current.add(j.id); continue; }
      if (!wasActive.current.has(j.id)) continue;
      wasActive.current.delete(j.id);
      refreshOnlineProducts(qc);
      const title = jobTitle(j, channels);
      if (j.status === 'DONE' && !j.failed) toast.success(t('{{title}} — mukammal ({{done}} theek)', { title, done: j.done }));
      else if (j.status === 'DONE') toast.warning(t('{{title}} — {{done}} theek, {{failed}} nahi hue', { title, done: j.done, failed: j.failed }));
      else if (j.status === 'FAILED') toast.error(t('{{title}} — ruk gaya', { title }));
    }
  }, [jobs, channels, qc]);
  const running = jobs.filter(jobActive);
  const problems = jobs.filter((j) => !jobActive(j) && jobBad(j)).length;
  const percent = running.length ? Math.round(running.reduce((n, j) => n + j.percent, 0) / running.length) : 0;
  return { jobs, running, problems, percent, loading: q.isLoading };
}

/** "1 chal raha · 2 masle" chip that opens the drawer. */
export function ActivityChip({ running, problems, onClick }: { running: number; problems: number; onClick: () => void }) {
  return (
    <button type="button" onClick={onClick} title={t('Activity')}
      className={cn('inline-flex h-9 shrink-0 items-center gap-1.5 rounded-xl px-3 text-[0.8125rem] font-semibold ring-1 transition',
        running ? 'bg-brand-50 text-brand-800 ring-brand-200 hover:bg-brand-100'
          : problems ? 'bg-amber-50 text-amber-800 ring-amber-200 hover:bg-amber-100'
            : 'bg-white text-slate-600 ring-slate-200 hover:bg-slate-50')}>
      {running ? <Loader2 className="h-4 w-4 animate-spin" /> : problems ? <AlertTriangle className="h-4 w-4" /> : <Activity className="h-4 w-4" />}
      {running ? t('{{count}} chal raha', { count: running }) : t('Activity')}
      {problems > 0 && <span className="rounded-full bg-amber-500 px-1.5 text-[0.6875rem] font-bold tabular-nums text-white" title={t('Masle')}>{problems}</span>}
    </button>
  );
}

/** Thin line under the toolbar while a job runs. */
export function ProgressLine({ percent, active }: { percent: number; active: boolean }) {
  if (!active) return null;
  return (
    <div className="h-0.5 overflow-hidden rounded-full bg-brand-100" role="progressbar" aria-valuenow={percent} aria-valuemin={0} aria-valuemax={100} aria-label={t('Kaam chal raha hai')}>
      <div className="h-full rounded-full bg-brand-600 transition-all duration-500" style={{ width: `${Math.max(4, percent)}%` }} />
    </div>
  );
}

export function ActivityDrawer({ open, onClose, jobs, channels }: { open: boolean; onClose: () => void; jobs: CatalogJob[]; channels: OnlineChannel[] }) {
  const qc = useQueryClient();
  const [openErrors, setOpenErrors] = useState<string | null>(null);
  const cancel = useMutation({
    mutationFn: (id: string) => onlineProductsApi.cancelJob(id),
    onSuccess: () => qc.invalidateQueries({ queryKey: JOBS_KEY }),
    onError: (e) => toast.error(apiErrorMessage(e)),
  });
  const byId = new Map(channels.map((c) => [c.id, c]));

  return (
    <Drawer open={open} onClose={onClose} title={t('Activity')} description={t('Import, link, bhejna aur publish — har kaam ki progress')} size="md">
      {!jobs.length ? (
        <div className="p-6"><EmptyState icon={<Activity className="h-5 w-5" />} title={t('Abhi koi kaam nahi')} description={t('"Sab le aayein", "Sab pakke jorein" ya chune products par koi kaam yahan dikhega.')} /></div>
      ) : (
        <ul className="divide-y divide-slate-100">
          {jobs.map((j) => {
            const active = jobActive(j);
            const bad = jobBad(j);
            const ch = j.integrationId ? byId.get(j.integrationId) : undefined;
            return (
              <li key={j.id} className="px-4 py-3 sm:px-5">
                <div className="flex items-center gap-2.5">
                  {ch ? <ChannelMark channel={ch} size="sm" /> : <span className="flex h-6 w-6 items-center justify-center rounded-md bg-slate-100"><Activity className="h-3.5 w-3.5 text-slate-500" /></span>}
                  <div className="min-w-0 flex-1">
                    <p className="truncate text-[0.8125rem] font-semibold text-slate-900">{jobTitle(j, channels)}</p>
                    <p className="flex items-center gap-1.5 text-[0.75rem] text-slate-500">
                      {active ? <Loader2 className="h-3 w-3 animate-spin text-brand-600" /> : bad ? <AlertTriangle className="h-3 w-3 text-amber-600" /> : j.status === 'CANCELLED' ? <XCircle className="h-3 w-3" /> : <CheckCircle2 className="h-3 w-3 text-success-600" />}
                      <span className="tabular-nums">{t('{{done}} / {{total}}', { done: (j.done + j.failed).toLocaleString('en-PK'), total: j.total.toLocaleString('en-PK') })}</span>
                      {j.failed ? <span className="font-semibold text-amber-700">{t('· {{failed}} nahi hue', { failed: j.failed })}</span> : null}
                      <span>· {timeAgo(j.finishedAt ?? j.startedAt ?? j.createdAt)}</span>
                    </p>
                  </div>
                  {active && <Button size="xs" variant="ghost" loading={cancel.isPending && cancel.variables === j.id} onClick={() => cancel.mutate(j.id)}>{t('Rokein')}</Button>}
                </div>
                <div className="mt-2 h-1.5 overflow-hidden rounded-full bg-slate-100">
                  <div className={cn('h-full rounded-full transition-all', bad ? 'bg-amber-500' : active ? 'bg-brand-600' : j.status === 'CANCELLED' ? 'bg-slate-300' : 'bg-success-500')} style={{ width: `${j.percent}%` }} />
                </div>
                {!!j.errors.length && (
                  <div className="mt-1.5">
                    <button type="button" onClick={() => setOpenErrors(openErrors === j.id ? null : j.id)} aria-expanded={openErrors === j.id}
                      className="inline-flex items-center gap-1 text-[0.75rem] font-semibold text-amber-700 hover:underline">
                      <ChevronDown className={cn('h-3.5 w-3.5 transition', openErrors === j.id && 'rotate-180')} />{t('{{count}} masle dekhein', { count: j.errors.length })}
                    </button>
                    {openErrors === j.id && (
                      <ul className="mt-1 max-h-48 space-y-1 overflow-y-auto rounded-xl bg-slate-50 p-2 text-[0.75rem] text-slate-600 ring-1 ring-slate-200/80">
                        {j.errors.map((e, i) => <li key={i} className="break-words">{jobError(e)}</li>)}
                      </ul>
                    )}
                  </div>
                )}
              </li>
            );
          })}
        </ul>
      )}
    </Drawer>
  );
}
