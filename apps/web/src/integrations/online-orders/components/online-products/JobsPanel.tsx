/**
 * Background catalog jobs (import all, link all, push, publish) with a
 * progress bar each. Polls every 2 seconds while one is running; when one
 * finishes the grid reloads.
 */

import { useEffect, useRef, useState } from 'react';
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import { toast } from 'sonner';
import { AlertTriangle, CheckCircle2, ChevronDown, Loader2, X } from 'lucide-react';
import { cn } from '@core/lib/cn';
import { t } from '@core/i18n';
import { apiErrorMessage } from '../../api/online-orders.api';
import { ONLINE_PRODUCTS_KEY, onlineProductsApi, type CatalogJob, type OnlineChannel } from '../../api/online-products.api';
import { channelName, refreshOnlineProducts } from './meta';

export const JOBS_KEY = [ONLINE_PRODUCTS_KEY, 'jobs'] as const;
const ACTIVE = (j: CatalogJob) => j.status === 'QUEUED' || j.status === 'RUNNING';

export function useCatalogJobs() {
  return useQuery({
    queryKey: JOBS_KEY,
    queryFn: onlineProductsApi.jobs,
    refetchInterval: (q) => ((q.state.data?.jobs ?? []).some(ACTIVE) ? 2000 : 30_000),
  });
}

function jobTitle(j: CatalogJob, channels: OnlineChannel[]) {
  const ch = channels.find((c) => c.id === j.integrationId);
  const where = ch ? channelName(ch) : t('sab channels');
  switch (j.kind) {
    case 'IMPORT_ALL': return t('{{where}} se products Nafaa me', { where });
    case 'LINK_ALL': return t('{{where}}: pakke match jor rahe hain', { where });
    case 'PUBLISH': return t('{{where}} par naye products', { where });
    default: return t('{{where}} par bhej rahe hain', { where });
  }
}

export function JobsPanel({ channels }: { channels: OnlineChannel[] }) {
  const qc = useQueryClient();
  const q = useCatalogJobs();
  const jobs = q.data?.jobs ?? [];
  const [hidden, setHidden] = useState<Set<string>>(new Set());
  const [openErrors, setOpenErrors] = useState<string | null>(null);
  const wasActive = useRef(new Set<string>());

  // A job that just finished: reload the grid once and say so.
  useEffect(() => {
    for (const j of jobs) {
      if (ACTIVE(j)) { wasActive.current.add(j.id); continue; }
      if (!wasActive.current.has(j.id)) continue;
      wasActive.current.delete(j.id);
      refreshOnlineProducts(qc);
      if (j.status === 'DONE') toast.success(t('{{title}} — mukammal ({{done}} theek{{failed}})', { title: jobTitle(j, channels), done: j.done, failed: j.failed ? t(', {{failed}} nahi hue', { failed: j.failed }) : '' }));
    }
  }, [jobs, channels, qc]);

  const cancel = useMutation({
    mutationFn: (id: string) => onlineProductsApi.cancelJob(id),
    onSuccess: () => qc.invalidateQueries({ queryKey: JOBS_KEY }),
    onError: (e) => toast.error(apiErrorMessage(e)),
  });

  const shown = jobs.filter((j) => !hidden.has(j.id));
  if (!shown.length) return null;
  return (
    <div className="space-y-2">
      {shown.map((j) => {
        const active = ACTIVE(j);
        const bad = j.status === 'FAILED' || (j.status === 'DONE' && j.failed > 0);
        return (
          <div key={j.id} className={cn('rounded-2xl bg-white p-3 shadow-sm ring-1', bad ? 'ring-amber-200' : 'ring-slate-200/80')}>
            <div className="flex items-center gap-2">
              {active ? <Loader2 className="h-4 w-4 shrink-0 animate-spin text-brand-600" />
                : bad ? <AlertTriangle className="h-4 w-4 shrink-0 text-amber-600" />
                  : <CheckCircle2 className="h-4 w-4 shrink-0 text-success-600" />}
              <p className="min-w-0 flex-1 truncate text-[0.8125rem] font-semibold text-slate-900">{jobTitle(j, channels)}</p>
              <span className="shrink-0 text-[0.75rem] tabular-nums text-slate-600">
                {t('{{done}} / {{total}}', { done: (j.done + j.failed).toLocaleString('en-PK'), total: j.total.toLocaleString('en-PK') })}
                {j.failed ? <span className="ms-1 font-semibold text-amber-700">{t('· {{failed}} nahi hue', { failed: j.failed })}</span> : null}
              </span>
              {active ? (
                <button type="button" onClick={() => cancel.mutate(j.id)} className="rounded-lg px-2 py-1 text-[0.75rem] font-semibold text-slate-500 hover:bg-slate-100 hover:text-rose-700">{t('Rokein')}</button>
              ) : (
                <button type="button" aria-label={t('Band karein')} onClick={() => setHidden((h) => new Set(h).add(j.id))} className="rounded-lg p-1 text-slate-400 hover:bg-slate-100"><X className="h-4 w-4" /></button>
              )}
            </div>
            <div className="mt-2 h-2 overflow-hidden rounded-full bg-slate-100">
              <div className={cn('h-full rounded-full transition-all', bad ? 'bg-amber-500' : active ? 'bg-brand-600' : 'bg-success-500')} style={{ width: `${j.percent}%` }} />
            </div>
            {!!j.errors.length && (
              <div className="mt-1.5">
                <button type="button" onClick={() => setOpenErrors(openErrors === j.id ? null : j.id)} className="inline-flex items-center gap-1 text-[0.75rem] font-semibold text-amber-700">
                  <ChevronDown className={cn('h-3.5 w-3.5 transition', openErrors === j.id && 'rotate-180')} />{t('{{count}} masle dekhein', { count: j.errors.length })}
                </button>
                {openErrors === j.id && (
                  <ul className="mt-1 max-h-40 space-y-0.5 overflow-y-auto text-[0.75rem] text-slate-600">
                    {j.errors.map((e, i) => <li key={i} className="truncate" title={e}>{e}</li>)}
                  </ul>
                )}
              </div>
            )}
          </div>
        );
      })}
    </div>
  );
}
