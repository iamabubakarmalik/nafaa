/**
 * Publish / schedule and unpublish / archive dialogs. Publish runs Validate
 * first and shows the API's issues: errors block, warnings don't. Schedule
 * times are entered in PKT and sent as UTC.
 */
import { useEffect, useState } from 'react';
import { useMutation, useQuery } from '@tanstack/react-query';
import { toast } from 'sonner';
import { CalendarClock, CircleCheck, Rocket } from 'lucide-react';
import { cn } from '@/lib/cn';
import { apiErrorBody, apiErrorMessage, cmsApi } from '@/api/marketing/marketing-cms.api';
import { ENTRY_TYPE_META, type AdminEntry, type Issue, type PublishEntryResponse } from '../contract/cms-contract';
import { Btn, Field, Modal, Segmented, TextArea, Toggle } from '../fields/ui';
import { HrefField } from '../fields/LinkFields';
import { IssueRow, GateBar } from './panels/SeoPanel';
import { formatPkt, fromPktInput, toPktInput } from './lib';

export function PublishDialog({
  open,
  onClose,
  entry,
  flush,
  onDone,
  initialMode = 'now',
  onSelectBlock,
}: {
  open: boolean;
  onClose: () => void;
  entry: AdminEntry;
  flush: () => Promise<boolean>;
  onDone: (entry: AdminEntry, info?: PublishEntryResponse) => void;
  initialMode?: 'now' | 'schedule';
  onSelectBlock: (id: string) => void;
}) {
  const [mode, setMode] = useState<'now' | 'schedule'>(initialMode);
  const [note, setNote] = useState('');
  const [contentUpdated, setContentUpdated] = useState(entry.status !== 'PUBLISHED');
  const [publishFaqs, setPublishFaqs] = useState(true);
  const [when, setWhen] = useState(() => toPktInput(entry.publishAt ?? new Date(Date.now() + 3_600_000).toISOString()));
  const [serverIssues, setServerIssues] = useState<Issue[] | null>(null);

  useEffect(() => {
    if (open) {
      setMode(initialMode);
      setServerIssues(null);
    }
  }, [open, initialMode]);

  const check = useQuery({
    queryKey: ['cms', 'validate', entry.id, entry.version],
    queryFn: async () => {
      const saved = await flush();
      if (!saved) throw new Error('Draft save nahi hua; pehle save ka masla hal karein');
      return cmsApi.validate(entry.id);
    },
    enabled: open,
    retry: false,
    staleTime: 0,
  });

  const publishAt = fromPktInput(when);
  const future = !!publishAt && new Date(publishAt).getTime() > Date.now() + 30_000;

  const act = useMutation({
    mutationFn: async () => {
      const saved = await flush();
      if (!saved) throw new Error('Draft save nahi hua');
      const fresh = await cmsApi.entry(entry.id);
      if (mode === 'now') return { kind: 'publish' as const, res: await cmsApi.publish(entry.id, { version: fresh.version, note: note || undefined, contentUpdated, publishFaqs }) };
      return { kind: 'schedule' as const, res: await cmsApi.schedule(entry.id, { version: fresh.version, publishAt: publishAt as string, note: note || undefined, contentUpdated }) };
    },
    onSuccess: (r) => {
      if (r.kind === 'publish') {
        const rv = r.res.revalidation;
        if (rv.ok) toast.success('Publish ho gaya. Site update ho gayi.');
        else toast.warning(`Publish ho gaya, magar site update fail: ${rv.error ?? ''}. Dobara try hoga.`);
        if (r.res.redirectCreated) toast.info(`Redirect bana: ${r.res.redirectCreated.from} → ${r.res.redirectCreated.to ?? ''}`);
        onDone(r.res.entry, r.res);
      } else {
        toast.success(`Schedule ho gaya: ${formatPkt(publishAt)} (PKT)`);
        onDone(r.res.entry);
      }
      onClose();
    },
    onError: (e) => {
      const issues = apiErrorBody(e)?.issues;
      if (issues?.length) setServerIssues(issues);
      else void check.refetch();
      toast.error(e instanceof Error && !('response' in e) ? e.message : apiErrorMessage(e, 'Publish nahi hua'));
    },
  });

  const issues = serverIssues ?? check.data?.seo.issues ?? [];
  const errors = issues.filter((i) => i.severity === 'error');
  const warnings = issues.filter((i) => i.severity === 'warning');
  const canPublish = check.data ? check.data.canPublish && errors.length === 0 : false;
  const robots = check.data?.seo.robots;

  return (
    <Modal
      open={open}
      onClose={onClose}
      width="md"
      title={mode === 'now' ? 'Publish karein' : 'Schedule karein'}
      description={`${entry.title} · ${entry.path}`}
      footer={
        <>
          <Btn variant="ghost" onClick={onClose}>
            Cancel
          </Btn>
          <Btn variant="primary" disabled={!canPublish || (mode === 'schedule' && !future)} loading={act.isPending} onClick={() => act.mutate()}>
            {mode === 'now' ? <Rocket className="h-4 w-4" /> : <CalendarClock className="h-4 w-4" />}
            {mode === 'now' ? 'Abhi publish' : 'Schedule'}
          </Btn>
        </>
      }
    >
      <div className="space-y-5">
        <Segmented
          value={mode}
          onChange={setMode}
          options={[
            { value: 'now', label: 'Abhi' },
            { value: 'schedule', label: 'Baad me (schedule)' },
          ]}
        />
        {mode === 'schedule' && (
          <Field label="Kab (Pakistan time)" error={when && !future ? 'Aane wala waqt chunein' : undefined} hint={publishAt ? `UTC: ${new Date(publishAt).toISOString().slice(0, 16).replace('T', ' ')}` : undefined}>
            <input type="datetime-local" value={when} onChange={(e) => setWhen(e.target.value)} className="h-9 w-full rounded-lg border border-neutral-300 px-3 text-sm focus:border-emerald-500 focus:outline-none focus:ring-2 focus:ring-emerald-500/20" />
          </Field>
        )}

        <div className="space-y-2">
          <p className="text-xs font-semibold text-neutral-700">Checks</p>
          {check.isLoading || check.isFetching ? (
            <p className="rounded-lg bg-neutral-50 px-3 py-2 text-xs text-neutral-500">Save aur checks chal rahe hain…</p>
          ) : check.isError ? (
            <p className="rounded-lg bg-rose-50 px-3 py-2 text-xs text-rose-700">{check.error instanceof Error && !('response' in check.error) ? check.error.message : apiErrorMessage(check.error, 'Validate nahi hua')}</p>
          ) : errors.length === 0 && warnings.length === 0 ? (
            <p className="flex items-center gap-1.5 rounded-lg bg-emerald-50 px-3 py-2 text-xs text-emerald-800">
              <CircleCheck className="h-3.5 w-3.5" /> Sab theek hai
            </p>
          ) : (
            <ul className="max-h-56 space-y-1.5 overflow-y-auto">
              {[...errors, ...warnings].map((i, n) => (
                <IssueRow
                  key={n}
                  issue={i}
                  onSelectBlock={(id) => {
                    onSelectBlock(id);
                    onClose();
                  }}
                />
              ))}
            </ul>
          )}
          {errors.length > 0 && <p className="text-xs font-medium text-rose-700">{errors.length} error(s) publish rok rahe hain.</p>}
          {check.data && <GateBar words={check.data.seo.gate.words} required={check.data.seo.gate.required} />}
          {robots && !robots.index && <p className="text-xs text-violet-700">Ye page noindex publish hoga ({robots.reason ?? 'editor'}).</p>}
        </div>

        <TextArea label="Note (history me)" value={note} onChange={setNote} rows={2} placeholder="Kya badla?" maxLength={500} />
        <Toggle checked={contentUpdated} onChange={setContentUpdated} label="Content asal me update hua" hint="'Updated' date aaj ki ho jayegi. Sirf typo theek kiya ho to band rakhein." />
        {mode === 'now' && entry.faqIds.length > 0 && <Toggle checked={publishFaqs} onChange={setPublishFaqs} label="Jure hue draft FAQs bhi publish karein" />}
      </div>
    </Modal>
  );
}

export function UnpublishDialog({
  open,
  onClose,
  entry,
  action,
  onDone,
}: {
  open: boolean;
  onClose: () => void;
  entry: AdminEntry;
  action: 'unpublish' | 'archive';
  onDone: (entry: AdminEntry) => void;
}) {
  const meta = ENTRY_TYPE_META[entry.type];
  const parentRef = entry.parentId ? entry.refs[entry.parentId] : undefined;
  const suggestion = parentRef?.path ?? (meta.prefix ? `/${meta.prefix.split('/')[0]}` : '/');
  const [redirectTo, setRedirectTo] = useState<string | undefined>(suggestion);
  const [statusCode, setStatusCode] = useState<301 | 302 | 410>(301);
  const [note, setNote] = useState('');
  const wasLive = !!entry.publishedPath;

  const run = useMutation({
    mutationFn: () =>
      action === 'unpublish'
        ? cmsApi.unpublish(entry.id, { redirectTo: statusCode === 410 ? undefined : redirectTo, statusCode: wasLive ? statusCode : undefined, note: note || undefined }).then((r) => r.entry)
        : cmsApi.archive(entry.id, { redirectTo: wasLive ? redirectTo : undefined, note: note || undefined }).then((r) => r.entry),
    onSuccess: (e) => {
      toast.success(action === 'unpublish' ? 'Unpublish ho gaya' : 'Archive ho gaya');
      onDone(e);
      onClose();
    },
    onError: (e) => toast.error(apiErrorMessage(e)),
  });

  return (
    <Modal
      open={open}
      onClose={onClose}
      title={action === 'unpublish' ? 'Unpublish karein' : 'Archive karein'}
      description={wasLive ? `${entry.publishedPath} site se hat jayega. Purane link ka kya ho?` : 'Ye entry live nahi hai.'}
      footer={
        <>
          <Btn variant="ghost" onClick={onClose}>
            Cancel
          </Btn>
          <Btn variant="danger" loading={run.isPending} onClick={() => run.mutate()}>
            {action === 'unpublish' ? 'Unpublish' : 'Archive'}
          </Btn>
        </>
      }
    >
      <div className="space-y-4">
        {wasLive && (
          <>
            {action === 'unpublish' && (
              <Segmented
                label="Purana URL"
                value={statusCode}
                onChange={setStatusCode}
                options={[
                  { value: 301, label: '301 redirect' },
                  { value: 302, label: '302 (thori der)' },
                  { value: 410, label: '410 (khatam)' },
                ]}
              />
            )}
            {statusCode !== 410 && <HrefField label="Kahan bhejein" keywords={false} value={redirectTo} onChange={setRedirectTo} hint={`Mashwara: ${suggestion} (parent hub)`} />}
          </>
        )}
        <TextArea label="Note" value={note} onChange={setNote} rows={2} maxLength={500} />
        <p className={cn('rounded-lg px-3 py-2 text-xs', 'bg-amber-50 text-amber-800')}>Draft mehfooz rehta hai; dobara publish kar sakte hain.</p>
      </div>
    </Modal>
  );
}
