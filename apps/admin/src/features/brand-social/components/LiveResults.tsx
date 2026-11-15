/**
 * Results and control of a live post, per platform: the permalink, when it
 * went live, the latest numbers, and the edit / delete / comments actions
 * the platform's API allows (an action it does not allow is shown disabled
 * with the reason). Used by the Published page and the composer's Results
 * card. Every change is confirmed first.
 */

import { useState } from 'react';
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import { toast } from 'sonner';
import { Area, AreaChart, ResponsiveContainer, Tooltip, XAxis } from 'recharts';
import { ExternalLink, MessageSquare, MessageSquareOff, Pencil, RefreshCw, Trash2 } from 'lucide-react';
import { Badge, Button, Card, EmptyState, Input, Modal, Skeleton, Textarea, confirmDialog } from '@/design-system/components';
import { brandSocialApi, type LiveEditInput, type MetricKey, type MetricTotals, type PostResults, type PublishedPlatform } from '@/api/admin-brand-social.api';
import { useCan } from '@/lib/access';
import { cn } from '@/lib/cn';
import { apiError } from '@/lib/errors';
import { num } from '@/lib/format';
import { useChartColors } from '@/ui/chart';
import { PLATFORM, PlatformMark } from '../lib/platforms';
import { useInvalidate } from '../lib/queries';
import { fmtDateTime, fmtKeyDay, relative } from '../lib/time';
import { LoadError } from './SocialUi';

/** Metric columns in the order the team reads them. */
export const METRICS: Array<{ key: MetricKey; label: string; short: string }> = [
  { key: 'impressions', label: 'Views', short: 'Views' },
  { key: 'reach', label: 'Reach', short: 'Reach' },
  { key: 'likes', label: 'Likes', short: 'Likes' },
  { key: 'comments', label: 'Comments', short: 'Comm.' },
  { key: 'shares', label: 'Shares', short: 'Shares' },
  { key: 'saves', label: 'Saves', short: 'Saves' },
  { key: 'plays', label: 'Plays', short: 'Plays' },
  { key: 'clicks', label: 'Link clicks', short: 'Clicks' },
];

export const resultsKey = (id: string) => ['brand-social', 'results', id] as const;

const STATUS_TEXT: Record<PublishedPlatform['status'], string> = {
  PUBLISHED: 'Live', PUBLISHING: 'Publishing', WAITING: 'Processing', HANDOFF: 'Post by hand', FAILED: 'Failed', SKIPPED: 'Skipped',
};

export function platformStatus(v: PublishedPlatform): { label: string; variant: 'success' | 'danger' | 'warning' | 'info' | 'default' } {
  if (v.deletedAt) return { label: 'Deleted', variant: 'default' };
  if (v.status === 'PUBLISHED') return { label: v.manual ? 'Posted by hand' : 'Live', variant: 'success' };
  if (v.status === 'FAILED') return { label: 'Failed', variant: 'danger' };
  if (v.status === 'HANDOFF') return { label: STATUS_TEXT.HANDOFF, variant: 'warning' };
  if (v.status === 'SKIPPED') return { label: 'Skipped', variant: 'default' };
  return { label: STATUS_TEXT[v.status] ?? v.status, variant: 'info' };
}

/** Small grid of the eight numbers. */
export function MetricGrid({ m, className }: { m: Partial<MetricTotals> | null | undefined; className?: string }) {
  return (
    <dl className={cn('grid grid-cols-4 gap-x-3 gap-y-1.5 sm:grid-cols-8', className)}>
      {METRICS.map((x) => (
        <div key={x.key} className="min-w-0">
          <dt className="truncate text-[0.6875rem] text-slate-500">{x.label}</dt>
          <dd className="text-[0.8125rem] font-semibold tabular-nums text-slate-900">{m ? num(m[x.key] ?? 0) : '—'}</dd>
        </div>
      ))}
    </dl>
  );
}

/** Edit, delete and comment switch for one platform; refreshes the post's results after a change. */
function useLiveActions(postId: string) {
  const qc = useQueryClient();
  const invalidate = useInvalidate();
  const done = (r: PostResults, msg: string) => { qc.setQueryData(resultsKey(postId), r); invalidate(); toast.success(msg); };
  const edit = useMutation({
    mutationFn: (a: { v: PublishedPlatform; body: LiveEditInput }) => brandSocialApi.editLive(postId, a.v.platform, a.body),
    onSuccess: (r, a) => done(r, `Changed on ${PLATFORM[a.v.platform].label}`),
    onError: (e) => toast.error(apiError(e)),
  });
  const remove = useMutation({
    mutationFn: async (v: PublishedPlatform) => {
      const name = PLATFORM[v.platform].label;
      const ok = await confirmDialog({
        title: `Delete from ${name}?`,
        text: `The post is removed from ${name} for everyone, with its likes and comments. This cannot be undone. The post and its last results stay in Nafaa.`,
        yes: `Delete from ${name}`, danger: true,
      });
      return ok ? brandSocialApi.deleteLive(postId, v.platform) : null;
    },
    onSuccess: (r, v) => { if (r) done(r, `Deleted from ${PLATFORM[v.platform].label}`); },
    onError: (e) => toast.error(apiError(e)),
  });
  const toggle = useMutation({
    mutationFn: async (v: PublishedPlatform) => {
      const enable = !!v.commentsOff;
      const ok = await confirmDialog({
        title: enable ? 'Turn comments back on?' : 'Turn comments off?',
        text: enable ? 'People can comment on this Instagram post again.' : 'Nobody can comment on this Instagram post until comments are turned on again. Comments already there stay.',
        yes: enable ? 'Turn on' : 'Turn off', danger: !enable,
      });
      return ok ? brandSocialApi.toggleComments(postId, v.platform, enable) : null;
    },
    onSuccess: (r, v) => { if (r) done(r, v.commentsOff ? 'Comments are on' : 'Comments are off'); },
    onError: (e) => toast.error(apiError(e)),
  });
  return { edit, remove, toggle };
}

/** One platform of a live post: link, status, numbers and actions. */
export function PlatformResult({ postId, v, defaults, compact }: {
  postId: string; v: PublishedPlatform; defaults?: { message?: string; title?: string; description?: string; link?: string | null }; compact?: boolean;
}) {
  const can = useCan();
  const canPublish = can('social.publish');
  const { edit, remove, toggle } = useLiveActions(postId);
  const [editing, setEditing] = useState(false);
  const st = platformStatus(v);
  const name = PLATFORM[v.platform].label;
  const live = v.status === 'PUBLISHED' && !v.deletedAt;
  const noRight = 'Your admin role does not include "social.publish".';
  const why = (a: { ok: boolean; reason: string | null }) => (!canPublish ? noRight : a.reason ?? undefined);
  return (
    <li className="rounded-xl bg-slate-50 px-3 py-2.5 ring-1 ring-slate-200">
      <div className="flex flex-wrap items-center gap-2">
        <PlatformMark p={v.platform} size={18} />
        <span className="text-[0.8125rem] font-semibold text-slate-900">{name}</span>
        <Badge size="xs" variant={st.variant}>{st.label}</Badge>
        {v.at && <span className="text-[0.75rem] text-slate-500" title={fmtDateTime(v.at)}>{relative(v.at)}</span>}
        <span className="ms-auto flex items-center gap-1">
          {v.permalink && live && (
            <a href={v.permalink} target="_blank" rel="noreferrer" className="inline-flex h-7 items-center gap-1 rounded-lg px-2 text-[0.75rem] font-semibold text-brand-700 hover:bg-brand-50">
              <ExternalLink className="h-3.5 w-3.5" />Open on {name}
            </a>
          )}
        </span>
      </div>
      {live && <MetricGrid m={v.metrics} className="mt-2" />}
      {live && !v.metrics && !v.manual && <p className="mt-1 text-[0.6875rem] text-slate-500">No numbers yet. They are read every hour for new posts.</p>}
      {v.metrics && <p className="mt-1 text-[0.6875rem] text-slate-400">Updated {relative(v.metrics.fetchedAt)}</p>}
      {live && !v.manual && (
        <div className={cn('mt-2 flex flex-wrap items-center gap-1.5 border-t border-slate-200 pt-2', compact && 'pt-1.5')}>
          <Button size="xs" variant="secondary" leftIcon={<Pencil className="h-3 w-3" />} disabled={!canPublish || !v.actions.edit.ok} title={why(v.actions.edit)} onClick={() => setEditing(true)}>Edit</Button>
          {v.platform === 'INSTAGRAM' && (
            <Button size="xs" variant="secondary" leftIcon={v.commentsOff ? <MessageSquare className="h-3 w-3" /> : <MessageSquareOff className="h-3 w-3" />}
              disabled={!canPublish || !v.actions.toggleComments.ok} title={why(v.actions.toggleComments)} loading={toggle.isPending} onClick={() => toggle.mutate(v)}>
              {v.commentsOff ? 'Comments on' : 'Comments off'}
            </Button>
          )}
          <Button size="xs" variant="ghost" className="text-rose-600" leftIcon={<Trash2 className="h-3 w-3" />} disabled={!canPublish || !v.actions.delete.ok}
            title={why(v.actions.delete)} loading={remove.isPending} onClick={() => remove.mutate(v)}>Delete</Button>
        </div>
      )}
      {live && !v.manual && canPublish && (!v.actions.edit.ok || !v.actions.delete.ok) && (
        <ul className="mt-1.5 space-y-0.5 text-[0.6875rem] text-slate-500">
          {!v.actions.edit.ok && v.actions.edit.reason && <li>Edit: {v.actions.edit.reason}</li>}
          {!v.actions.delete.ok && v.actions.delete.reason && <li>Delete: {v.actions.delete.reason}</li>}
        </ul>
      )}
      {editing && (
        <EditLiveModal v={v} defaults={defaults} busy={edit.isPending} onClose={() => setEditing(false)}
          onSave={async (body) => {
            const ok = await confirmDialog({ title: `Change the live post on ${name}?`, text: `People see the new text on ${name} right away.`, yes: 'Save on ' + name });
            if (!ok) return;
            edit.mutate({ v, body }, { onSuccess: () => setEditing(false) });
          }} />
      )}
    </li>
  );
}

function EditLiveModal({ v, defaults, busy, onClose, onSave }: {
  v: PublishedPlatform; defaults?: { message?: string; title?: string; description?: string; link?: string | null }; busy: boolean;
  onClose: () => void; onSave: (b: LiveEditInput) => void;
}) {
  const f = v.actions.edit.fields;
  const [initial] = useState({ message: defaults?.message ?? '', title: defaults?.title ?? '', description: defaults?.description ?? '', link: defaults?.link ?? '' });
  const [form, setForm] = useState(initial);
  const name = PLATFORM[v.platform].label;
  // Only fields the person changed are sent, so an untouched field keeps its value on the platform.
  const changed = (k: keyof typeof initial) => f.includes(k) && form[k] !== initial[k];
  const body: LiveEditInput = {
    ...(changed('message') ? { message: form.message } : {}),
    ...(changed('title') ? { title: form.title } : {}),
    ...(changed('description') ? { description: form.description } : {}),
    ...(changed('link') ? { link: form.link.trim() || null } : {}),
  };
  const nothing = !Object.keys(body).length;
  return (
    <Modal open onClose={onClose} size="md" title={<span className="flex items-center gap-2"><PlatformMark p={v.platform} size={20} />Edit on {name}</span>}
      description={v.platform === 'FACEBOOK' ? 'Facebook lets Nafaa change only the text of posts Nafaa made.' : v.platform === 'PINTEREST' ? 'Pinterest may keep pin editing closed for some apps; if so, it says so here.' : undefined}
      footer={<>
        <Button variant="secondary" onClick={onClose}>Cancel</Button>
        <Button loading={busy} disabled={nothing} leftIcon={<Pencil className="h-4 w-4" />} onClick={() => onSave(body)}>Save on {name}</Button>
      </>}>
      <div className="space-y-3">
        {f.includes('title') && <Input label="Title" value={form.title} maxLength={100} onChange={(e) => setForm({ ...form, title: e.target.value })} />}
        {f.includes('message') && <Textarea label="Text" rows={6} value={form.message} onChange={(e) => setForm({ ...form, message: e.target.value })} />}
        {f.includes('description') && <Textarea label="Description" rows={6} value={form.description} maxLength={v.platform === 'PINTEREST' ? 500 : 5000} onChange={(e) => setForm({ ...form, description: e.target.value })} />}
        {f.includes('link') && <Input label="Link" value={form.link} placeholder="Leave as is to keep the current link" onChange={(e) => setForm({ ...form, link: e.target.value })} />}
      </div>
    </Modal>
  );
}

/** Daily trend (sum across platforms) as a small area chart. */
export function TrendChart({ trend, height = 96 }: { trend: PostResults['trend']; height?: number }) {
  const c = useChartColors();
  if (trend.length < 2) return <p className="text-[0.75rem] text-slate-500">The trend shows once there are numbers from two or more days.</p>;
  return (
    <div style={{ height }}>
      <ResponsiveContainer width="100%" height="100%">
        <AreaChart data={trend} margin={{ top: 4, right: 2, left: 2, bottom: 0 }}>
          <defs><linearGradient id="bs-trend" x1="0" y1="0" x2="0" y2="1"><stop offset="0%" stopColor={c.line} stopOpacity={0.25} /><stop offset="100%" stopColor={c.line} stopOpacity={0} /></linearGradient></defs>
          <XAxis dataKey="day" hide />
          <Tooltip cursor={{ stroke: c.grid }} contentStyle={{ borderRadius: 12, border: `1px solid ${c.grid}`, fontSize: 12 }} labelFormatter={(l) => fmtKeyDay(String(l))}
            formatter={(v, n) => [Number(v).toLocaleString('en-PK'), n === 'impressions' ? 'Views' : n === 'reach' ? 'Reach' : 'Engagement']} />
          <Area type="monotone" dataKey="impressions" stroke={c.line} strokeWidth={2} fill="url(#bs-trend)" isAnimationActive={false} />
          <Area type="monotone" dataKey="engagement" stroke={c.second} strokeWidth={1.5} fill="none" isAnimationActive={false} />
        </AreaChart>
      </ResponsiveContainer>
    </div>
  );
}

/** "Refresh results" with the server's 2-minute limit per post. */
export function useRefreshResults(postId: string) {
  const qc = useQueryClient();
  const invalidate = useInvalidate();
  return useMutation({
    mutationFn: () => brandSocialApi.refreshResults(postId),
    onSuccess: (r) => { qc.setQueryData(resultsKey(postId), r); invalidate(); toast.success('Results refreshed'); },
    onError: (e) => toast.error(apiError(e)),
  });
}

/** Composer card: totals, trend, per-platform results and actions for a post that went out. */
export function ResultsCard({ postId, defaults }: { postId: string; defaults: (p: PublishedPlatform['platform']) => { message?: string; title?: string; description?: string; link?: string | null } }) {
  const q = useQuery({ queryKey: resultsKey(postId), queryFn: () => brandSocialApi.results(postId), refetchInterval: 5 * 60_000 });
  const refresh = useRefreshResults(postId);
  const d = q.data;
  const waiting = !!d?.refreshAfter && new Date(d.refreshAfter).getTime() > Date.now();
  return (
    <Card title="Results" description="Latest numbers per platform; read every hour for new posts."
      actions={<Button size="xs" variant="secondary" loading={refresh.isPending} disabled={!d || waiting} title={waiting ? 'Refreshed a moment ago; try again in two minutes.' : undefined}
        leftIcon={<RefreshCw className="h-3.5 w-3.5" />} onClick={() => refresh.mutate()}>Refresh results</Button>}>
      {q.error ? <LoadError error={q.error} onRetry={() => q.refetch()} what="the results" /> : !d ? (
        <div className="space-y-2"><Skeleton className="h-16 rounded-xl" /><Skeleton className="h-24 rounded-xl" /></div>
      ) : !d.platforms.length ? (
        <EmptyState title="Nothing went out yet" description="Results show once the post is live." />
      ) : (
        <div className="space-y-3">
          <div className="rounded-xl bg-white p-3 ring-1 ring-slate-200">
            <p className="mb-1.5 text-[0.75rem] font-semibold uppercase tracking-wide text-slate-500">All platforms</p>
            <MetricGrid m={d.totals} />
            <div className="mt-3"><TrendChart trend={d.trend} /></div>
          </div>
          <ul className="space-y-2">
            {d.platforms.map((v) => <PlatformResult key={v.platform} postId={postId} v={v} defaults={defaults(v.platform)} />)}
          </ul>
          {d.notes.length > 0 && (
            <ul className="space-y-1 text-[0.75rem] text-slate-500">
              {d.notes.map((n, i) => <li key={i} className="flex items-start gap-1.5"><PlatformMark p={n.platform} size={12} className="mt-0.5 shrink-0" />{n.message}</li>)}
            </ul>
          )}
        </div>
      )}
    </Card>
  );
}

