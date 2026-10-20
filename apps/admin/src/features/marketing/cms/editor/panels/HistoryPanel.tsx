/**
 * History tab: revisions (who, when, action, note, revalidation result), a
 * side-by-side diff against the current draft, and restore into the draft.
 */
import { useState } from 'react';
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import { toast } from 'sonner';
import { CalendarClock, CircleAlert, CloudCheck, EyeOff, History, RotateCcw, Rocket, Save, Undo2 } from 'lucide-react';
import { cn } from '@/lib/cn';
import { apiErrorMessage, cmsApi, cmsKeys } from '@/api/marketing/marketing-cms.api';
import type { AdminEntry, RevisionAction, RevisionListItem } from '../../contract/cms-contract';
import { Btn, Modal } from '../../fields/ui';
import { BLOCK_META } from '../../blocks/registry';
import { formatPkt, relativeTime } from '../lib';

const ACTION: Record<RevisionAction, { label: string; icon: typeof Save; tone: string }> = {
  SAVE: { label: 'Save', icon: Save, tone: 'bg-neutral-100 text-neutral-600' },
  PUBLISH: { label: 'Publish', icon: Rocket, tone: 'bg-emerald-100 text-emerald-700' },
  UNPUBLISH: { label: 'Unpublish', icon: EyeOff, tone: 'bg-rose-100 text-rose-700' },
  SCHEDULE: { label: 'Schedule', icon: CalendarClock, tone: 'bg-blue-100 text-blue-700' },
  RESTORE: { label: 'Restore', icon: Undo2, tone: 'bg-violet-100 text-violet-700' },
};

export function HistoryPanel({ entry, onRestored, beforeRestore }: { entry: AdminEntry; onRestored: (e: AdminEntry) => void; beforeRestore: () => Promise<boolean> }) {
  const { data, isLoading, isError } = useQuery({ queryKey: cmsKeys.revisions(entry.id), queryFn: () => cmsApi.revisions(entry.id), retry: false });
  const [open, setOpen] = useState<RevisionListItem | null>(null);
  if (isLoading) return <div className="space-y-2">{Array.from({ length: 4 }).map((_, i) => <div key={i} className="h-14 animate-pulse rounded-xl bg-neutral-100" />)}</div>;
  if (isError) return <p className="text-sm text-neutral-500">History load nahi hui (API).</p>;
  const list = data ?? [];
  if (list.length === 0) return <p className="text-sm text-neutral-500">Abhi koi revision nahi.</p>;
  return (
    <>
      <ol className="relative space-y-1 before:absolute before:bottom-3 before:left-[15px] before:top-3 before:w-px before:bg-neutral-200">
        {list.map((r) => {
          const a = ACTION[r.action];
          const Icon = a.icon;
          return (
            <li key={r.id}>
              <button type="button" onClick={() => setOpen(r)} className="relative flex w-full items-start gap-3 rounded-xl px-1 py-2 text-left hover:bg-neutral-50">
                <span className={cn('z-10 grid h-7 w-7 shrink-0 place-items-center rounded-full ring-4 ring-white', a.tone)}>
                  <Icon className="h-3.5 w-3.5" />
                </span>
                <span className="min-w-0 flex-1">
                  <span className="flex items-center gap-2 text-sm">
                    <b className="font-medium text-neutral-900">{a.label}</b>
                    <span className="text-xs text-neutral-400">v{r.version}</span>
                  </span>
                  <span className="block text-xs text-neutral-500" title={formatPkt(r.createdAt)}>
                    {r.createdByName ?? 'System'} · {relativeTime(r.createdAt)}
                  </span>
                  {r.note && <span className="mt-0.5 block text-xs italic text-neutral-600">“{r.note}”</span>}
                  {(r.action === 'PUBLISH' || r.action === 'UNPUBLISH') && (
                    <span className={cn('mt-1 inline-flex items-center gap-1 text-[11px]', r.revalidateError ? 'text-rose-600' : r.revalidatedAt ? 'text-emerald-700' : 'text-neutral-400')}>
                      {r.revalidateError ? <CircleAlert className="h-3 w-3" /> : <CloudCheck className="h-3 w-3" />}
                      {r.revalidateError ? `Site update fail: ${r.revalidateError}` : r.revalidatedAt ? 'Site update ho gayi' : 'Site update ka intezar'}
                    </span>
                  )}
                </span>
              </button>
            </li>
          );
        })}
      </ol>
      {open && <RevisionDiffModal entry={entry} revision={open} onClose={() => setOpen(null)} onRestored={onRestored} beforeRestore={beforeRestore} />}
    </>
  );
}

const show = (v: unknown) => (v === undefined || v === null || v === '' ? '—' : typeof v === 'string' ? v : JSON.stringify(v, null, 2));

function RevisionDiffModal({ entry, revision, onClose, onRestored, beforeRestore }: { entry: AdminEntry; revision: RevisionListItem; onClose: () => void; onRestored: (e: AdminEntry) => void; beforeRestore: () => Promise<boolean> }) {
  const qc = useQueryClient();
  const diff = useQuery({ queryKey: ['cms', 'diff', entry.id, revision.id], queryFn: () => cmsApi.revisionDiff(entry.id, revision.id) });
  const restore = useMutation({
    mutationFn: async () => {
      const ok = await beforeRestore();
      if (!ok) throw new Error('Pehle draft save hona chahiye');
      return cmsApi.restoreRevision(entry.id, revision.id);
    },
    onSuccess: (r) => {
      onRestored(r.entry);
      qc.invalidateQueries({ queryKey: cmsKeys.revisions(entry.id) });
      toast.success('Revision draft me wapas aa gayi. Live karne ke liye Publish karein.');
      onClose();
    },
    onError: (e) => toast.error(e instanceof Error && !('response' in e) ? e.message : apiErrorMessage(e)),
  });
  const d = diff.data;
  const changeTone = { added: 'bg-emerald-100 text-emerald-800', removed: 'bg-rose-100 text-rose-800', changed: 'bg-amber-100 text-amber-800', moved: 'bg-blue-100 text-blue-800' } as const;
  return (
    <Modal
      open
      onClose={onClose}
      width="xl"
      title={
        <span className="flex items-center gap-2">
          <History className="h-4 w-4 text-neutral-400" /> v{revision.version} · {ACTION[revision.action].label}
        </span>
      }
      description={`${revision.createdByName ?? 'System'} · ${formatPkt(revision.createdAt)} — maujooda draft se muqabla`}
      footer={
        <>
          <Btn variant="ghost" onClick={onClose}>
            Band karein
          </Btn>
          <Btn variant="primary" loading={restore.isPending} onClick={() => restore.mutate()}>
            <RotateCcw className="h-4 w-4" /> Draft me wapas laayein
          </Btn>
        </>
      }
    >
      {diff.isLoading && <p className="text-sm text-neutral-500">Diff ban raha hai…</p>}
      {diff.isError && <p className="text-sm text-rose-600">Diff load nahi hua (API).</p>}
      {d && d.fields.length === 0 && d.blocks.length === 0 && <p className="text-sm text-neutral-500">Koi farq nahi — ye revision maujooda draft jaisi hai.</p>}
      {d && (
        <div className="space-y-6">
          {d.fields.length > 0 && (
            <div>
              <h4 className="mb-2 text-xs font-semibold uppercase tracking-wide text-neutral-500">Fields</h4>
              <div className="overflow-hidden rounded-xl border border-neutral-200">
                <div className="grid grid-cols-[160px_1fr_1fr] bg-neutral-50 text-[11px] font-semibold uppercase text-neutral-500">
                  <div className="px-3 py-2">Field</div>
                  <div className="px-3 py-2">Is revision me</div>
                  <div className="px-3 py-2">Maujooda draft</div>
                </div>
                {d.fields.map((f) => (
                  <div key={f.field} className="grid grid-cols-[160px_1fr_1fr] border-t border-neutral-100 text-xs">
                    <div className="px-3 py-2 font-mono text-neutral-600">{f.field}</div>
                    <pre className="whitespace-pre-wrap break-words bg-rose-50/40 px-3 py-2 font-sans text-neutral-800">{show(f.before)}</pre>
                    <pre className="whitespace-pre-wrap break-words bg-emerald-50/40 px-3 py-2 font-sans text-neutral-800">{show(f.after)}</pre>
                  </div>
                ))}
              </div>
            </div>
          )}
          {d.blocks.length > 0 && (
            <div>
              <h4 className="mb-2 text-xs font-semibold uppercase tracking-wide text-neutral-500">Blocks</h4>
              <div className="space-y-2">
                {d.blocks.map((b) => {
                  const type = ((b.after ?? b.before) as { type?: string } | undefined)?.type ?? entry.blocks.find((x) => x.id === b.id)?.type;
                  if (b.change === 'moved') {
                    return (
                      <div key={`${b.id}-moved`} className="flex items-center gap-2 rounded-xl border border-neutral-200 px-3 py-2 text-sm">
                        <span className={cn('rounded px-1.5 py-0.5 text-[10px] font-semibold uppercase', changeTone.moved)}>moved</span>
                        <span className="font-medium text-neutral-800">{type ? BLOCK_META[type as keyof typeof BLOCK_META]?.label ?? type : 'Block'}</span>
                        <span className="text-xs text-neutral-500">
                          jagah {Number(b.before) + 1} → {Number(b.after) + 1}
                        </span>
                      </div>
                    );
                  }
                  return (
                    <details key={`${b.id}-${b.change}`} className="rounded-xl border border-neutral-200">
                      <summary className="flex cursor-pointer items-center gap-2 px-3 py-2 text-sm">
                        <span className={cn('rounded px-1.5 py-0.5 text-[10px] font-semibold uppercase', changeTone[b.change])}>{b.change}</span>
                        <span className="font-medium text-neutral-800">{type ? BLOCK_META[type as keyof typeof BLOCK_META]?.label ?? type : 'Block'}</span>
                        <span className="font-mono text-[11px] text-neutral-400">{b.id}</span>
                      </summary>
                      <div className="grid grid-cols-2 gap-px border-t border-neutral-100 bg-neutral-100 text-[11px]">
                        <pre className="max-h-72 overflow-auto whitespace-pre-wrap break-words bg-rose-50/60 p-3">{show(b.before)}</pre>
                        <pre className="max-h-72 overflow-auto whitespace-pre-wrap break-words bg-emerald-50/60 p-3">{show(b.after)}</pre>
                      </div>
                    </details>
                  );
                })}
              </div>
            </div>
          )}
        </div>
      )}
    </Modal>
  );
}
