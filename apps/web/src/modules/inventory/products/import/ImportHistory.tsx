/** Earlier product and price imports, with their failed rows and price changes to download. */

import { useState } from 'react';
import { useQuery } from '@tanstack/react-query';
import { toast } from 'sonner';
import { Download, History, Loader2 } from 'lucide-react';
import { cn } from '@core/lib/cn';
import { importApi, type ImportJob } from './api';
import { downloadJobChanges, downloadJobErrors } from './columns';

const STATUS: Record<string, { label: string; cls: string }> = {
  COMPLETED: { label: 'Mukammal', cls: 'bg-emerald-50 text-emerald-700 ring-emerald-200' },
  PARTIAL: { label: 'Kuch lines reh gayin', cls: 'bg-amber-50 text-amber-700 ring-amber-200' },
  FAILED: { label: 'Fail', cls: 'bg-rose-50 text-rose-700 ring-rose-200' },
  PROCESSING: { label: 'Chal raha hai', cls: 'bg-sky-50 text-sky-700 ring-sky-200' },
  PENDING: { label: 'Intezar', cls: 'bg-slate-100 text-slate-600 ring-slate-200' },
};

/** A run left open for half an hour was closed in the middle (tab closed, internet gone). */
const stale = (j: ImportJob) => j.status === 'PROCESSING' && Date.now() - new Date(j.updatedAt).getTime() > 30 * 60_000;

const when = (iso: string) => new Intl.DateTimeFormat('en-PK', { dateStyle: 'medium', timeStyle: 'short' }).format(new Date(iso));

export function ImportHistory({ withCost }: { withCost: boolean }) {
  const { data: jobs = [], isLoading } = useQuery({ queryKey: ['product-import-jobs'], queryFn: importApi.jobs, staleTime: 30_000 });
  const [busy, setBusy] = useState<string | null>(null);

  const download = async (j: ImportJob) => {
    setBusy(j.id);
    try {
      const d = await importApi.job(j.id);
      if (j.jobType === 'PRICE_UPDATE' && d.changes.length) await downloadJobChanges(j.fileName, d.changes, withCost);
      if (d.errors.length) await downloadJobErrors(j.fileName, d.errors);
      if (!d.errors.length && !(j.jobType === 'PRICE_UPDATE' && d.changes.length)) toast.info('Is import me download ke liye kuch nahi');
    } catch {
      toast.error('Download nahi hua');
    } finally {
      setBusy(null);
    }
  };

  if (isLoading || !jobs.length) return null;
  return (
    <div className="rounded-3xl bg-white p-4 shadow-sm ring-1 ring-slate-200/80 sm:p-5">
      <h2 className="mb-3 flex items-center gap-2 text-[0.9375rem] font-semibold text-slate-900"><History className="h-4 w-4 text-brand-600" />Pichhle import</h2>
      <ul className="divide-y divide-slate-100">
        {jobs.map((j) => {
          const st = stale(j) ? { label: 'Beech me ruk gaya', cls: 'bg-rose-50 text-rose-700 ring-rose-200' } : STATUS[j.status] ?? STATUS.PENDING;
          const hasFile = j.errorCount + j.skipCount > 0 || j.jobType === 'PRICE_UPDATE';
          return (
            <li key={j.id} className="flex flex-wrap items-center gap-x-4 gap-y-1 py-2.5 text-[0.8125rem]">
              <div className="min-w-0 flex-1">
                <p className="truncate font-semibold text-slate-900">
                  {j.jobType === 'PRICE_UPDATE' ? 'Price update' : 'Naye products'} · <span className="font-normal text-slate-600">{j.fileName}</span>
                </p>
                <p className="text-[0.75rem] text-slate-500">{when(j.createdAt)}{j.userName ? ` · ${j.userName}` : ''}</p>
              </div>
              <p className="text-[0.75rem] tabular-nums text-slate-600">
                <b className="text-emerald-700">{j.successCount}</b> {j.jobType === 'PRICE_UPDATE' ? 'badli' : 'bane'}
                {j.skipCount > 0 && <> · {j.skipCount} {j.jobType === 'PRICE_UPDATE' ? 'wesi hi' : 'pehle se'}</>}
                {j.errorCount > 0 && <> · <b className="text-rose-700">{j.errorCount}</b> ghalti</>}
                {j.processedRows < j.totalRows && <> · {j.processedRows}/{j.totalRows} lines</>}
              </p>
              <span className={cn('inline-flex h-6 items-center rounded-full px-2 text-[0.6875rem] font-semibold ring-1', st.cls)}>{st.label}</span>
              {hasFile && (
                <button type="button" onClick={() => void download(j)} disabled={busy === j.id}
                  className="inline-flex h-8 items-center gap-1.5 rounded-lg px-2.5 text-[0.75rem] font-semibold text-brand-700 hover:bg-brand-50 disabled:opacity-60">
                  {busy === j.id ? <Loader2 className="h-3.5 w-3.5 animate-spin" /> : <Download className="h-3.5 w-3.5" />}Download
                </button>
              )}
            </li>
          );
        })}
      </ul>
    </div>
  );
}
