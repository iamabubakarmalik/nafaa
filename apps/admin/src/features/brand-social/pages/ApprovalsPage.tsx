/**
 * Approvals (/social/approvals): posts waiting for review, one at a time
 * with a big preview, or several at once with the checkboxes.
 * Keys: A approve, R reject, E edit, X select, → / J next, ← / K previous.
 */

import { useEffect, useMemo, useState } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import { useMutation } from '@tanstack/react-query';
import { toast } from 'sonner';
import { AlertTriangle, Bot, CalendarClock, CheckCheck, CheckCircle2, ChevronLeft, ChevronRight, Pencil, ShieldCheck, XCircle } from 'lucide-react';
import { Alert, Badge, Button, Card, Checkbox, EmptyState, Kbd, PageHero, PageShell, Skeleton } from '@/design-system/components';
import { isDialogOpen, isTyping } from '@core/lib/shortcuts';
import { brandSocialApi, type SocialPlatform, type SocialPost } from '@/api/admin-brand-social.api';
import { useCan } from '@/lib/access';
import { cn } from '@/lib/cn';
import { apiError } from '@/lib/errors';
import { PromptModal } from '@/features/marketing/lib/kit';
import { KIND_LABEL, PlatformMark, PlatformStack } from '../lib/platforms';
import { captionFor, fullText } from '../lib/post';
import { useAccounts, useInvalidate, usePosts, useSettings } from '../lib/queries';
import { fmtDateTime, relative } from '../lib/time';
import { LoadError, PillarDot, PostThumb } from '../components/SocialUi';
import { PreviewPanel, type PreviewData } from '../components/Previews';

export default function ApprovalsPage() {
  const can = useCan();
  const canApprove = can('social.approve');
  const navigate = useNavigate();
  const invalidate = useInvalidate();
  const q = usePosts({ status: 'IN_REVIEW' }, { refetchInterval: 60_000 });
  const accounts = useAccounts().data?.accounts ?? [];
  const pillars = useSettings().data?.pillars;
  const queue = useMemo(() => [...(q.data?.posts ?? [])].sort((a, b) => (a.scheduledAt ?? '9').localeCompare(b.scheduledAt ?? '9')), [q.data]);
  const [currentId, setCurrentId] = useState<string | null>(null);
  const [selected, setSelected] = useState<Set<string>>(new Set());
  const [rejecting, setRejecting] = useState<string[] | null>(null);
  const [done, setDone] = useState<Set<string>>(new Set());

  const visible = queue.filter((p) => !done.has(p.id));
  const idx = Math.max(0, visible.findIndex((p) => p.id === currentId));
  const current = visible[idx] ?? null;
  const go = (d: 1 | -1) => { const n = visible[Math.min(visible.length - 1, Math.max(0, idx + d))]; if (n) setCurrentId(n.id); };
  const after = (ids: string[]) => {
    const next = visible.find((p, i) => i > idx && !ids.includes(p.id)) ?? visible.find((p) => !ids.includes(p.id));
    setDone((prev) => new Set([...prev, ...ids]));
    setSelected((prev) => new Set([...prev].filter((x) => !ids.includes(x))));
    setCurrentId(next?.id ?? null);
  };

  const approve = useMutation({
    mutationFn: async (ids: string[]) => (ids.length === 1 ? brandSocialApi.approve(ids[0]).then(() => ({ done: ids, failed: [] })) : brandSocialApi.bulk({ ids, action: 'approve' })),
    onSuccess: (r, ids) => {
      after(r.done);
      if (r.failed.length) toast.error(`${r.failed.length} could not be approved: ${r.failed[0].error}`);
      if (r.done.length) toast.success(ids.length === 1 ? 'Approved' : `${r.done.length} approved`);
      invalidate();
    },
    onError: (e) => toast.error(apiError(e)),
  });
  const reject = useMutation({
    mutationFn: async (v: { ids: string[]; reason: string }) => (v.ids.length === 1 ? brandSocialApi.reject(v.ids[0], v.reason).then(() => ({ done: v.ids, failed: [] })) : brandSocialApi.bulk({ ids: v.ids, action: 'reject', reason: v.reason })),
    onSuccess: (r) => { after(r.done); toast.success(r.done.length === 1 ? 'Rejected. The writer sees your reason.' : `${r.done.length} rejected`); invalidate(); },
    onError: (e) => toast.error(apiError(e)),
  });
  const busy = approve.isPending || reject.isPending;

  useEffect(() => {
    const h = (e: KeyboardEvent) => {
      if (e.metaKey || e.ctrlKey || e.altKey || isTyping() || isDialogOpen() || !current) return;
      const k = e.key.toLowerCase();
      if (k === 'arrowright' || k === 'j') go(1);
      else if (k === 'arrowleft' || k === 'k') go(-1);
      else if (k === 'a' && canApprove && !busy) approve.mutate([current.id]);
      else if (k === 'r' && canApprove && !busy) setRejecting([current.id]);
      else if (k === 'e') navigate(`/social/posts/${current.id}`);
      else if (k === 'x') setSelected((s) => { const n = new Set(s); if (n.has(current.id)) n.delete(current.id); else n.add(current.id); return n; });
      else return;
      e.preventDefault();
    };
    window.addEventListener('keydown', h);
    return () => window.removeEventListener('keydown', h);
  });

  const build = (p: SocialPlatform): PreviewData => ({
    platform: p, account: accounts.find((a) => a.platform === p && a.status !== 'DISCONNECTED'),
    text: current?.texts?.[p] ?? fullText(captionFor(current!.caption, current!.captions, p), current!.hashtags),
    media: current!.media, kind: current!.kind, link: current?.links?.[p] ?? current?.link ?? '',
    firstComment: ['FACEBOOK', 'INSTAGRAM'].includes(p) ? current?.firstComment ?? '' : '', when: current?.scheduledAt ? fmtDateTime(current.scheduledAt) : null,
  });

  const sel = [...selected].filter((id) => visible.some((p) => p.id === id));
  const errors = current?.warnings.filter((w) => w.level === 'error') ?? [];

  return (
    <PageShell>
      <PageHero
        title="Approvals"
        chip={`${visible.length} waiting`}
        busy={q.isFetching}
        loading={q.isLoading}
        stats={q.data ? [
          { label: 'Waiting', value: visible.length },
          { label: 'Due in 24 h', value: visible.filter((p) => p.scheduledAt && new Date(p.scheduledAt).getTime() - Date.now() < 86_400_000).length },
          { label: 'From AI marketer', value: visible.filter((p) => p.aiMade).length },
          { label: 'With problems', value: visible.filter((p) => p.warnings.some((w) => w.level === 'error')).length },
        ] : undefined}
      />
      {!canApprove && <Alert tone="info" title="View only">You can read the queue. Approving needs the "Approve social posts" permission.</Alert>}

      {q.error ? <LoadError error={q.error} onRetry={() => q.refetch()} what="the approval queue" />
        : q.isLoading ? (
          <div className="grid gap-4 lg:grid-cols-[20rem_minmax(0,1fr)]"><Skeleton className="h-[30rem] rounded-2xl" /><Skeleton className="h-[30rem] rounded-2xl" /></div>
        ) : !visible.length ? (
          <Card><EmptyState icon={<CheckCircle2 className="h-7 w-7 text-success-600" />} title="All caught up" description="Nothing is waiting for review. New drafts from the team and the AI marketer show up here." action={<Link to="/social/calendar"><Button size="sm" variant="secondary">Open calendar</Button></Link>} /></Card>
        ) : (
          <div className="grid items-start gap-4 lg:grid-cols-[20rem_minmax(0,1fr)]">
            <Card flush title="Queue" actions={canApprove && (
              <Checkbox aria-label="Select all" checked={sel.length === visible.length} onChange={(e) => setSelected(e.target.checked ? new Set(visible.map((p) => p.id)) : new Set())} />
            )}>
              {sel.length > 0 && canApprove && (
                <div className="flex items-center gap-2 border-b border-slate-100 bg-brand-50 px-3 py-2">
                  <span className="me-auto text-[0.8125rem] font-semibold text-brand-800">{sel.length} selected</span>
                  <Button size="xs" variant="success" loading={approve.isPending} leftIcon={<CheckCheck className="h-3.5 w-3.5" />} onClick={() => approve.mutate(sel)}>Approve</Button>
                  <Button size="xs" variant="critical" onClick={() => setRejecting(sel)}>Reject</Button>
                </div>
              )}
              <ul className="max-h-[70vh] divide-y divide-slate-100 overflow-y-auto">
                {visible.map((p) => (
                  <li key={p.id} className={cn('flex items-center gap-2.5 px-3 py-2.5', p.id === current?.id ? 'bg-brand-50/70' : 'hover:bg-slate-50')}>
                    {canApprove && <Checkbox aria-label={`Select ${p.title}`} checked={selected.has(p.id)} onChange={(e) => setSelected((s) => { const n = new Set(s); if (e.target.checked) n.add(p.id); else n.delete(p.id); return n; })} />}
                    <button type="button" onClick={() => setCurrentId(p.id)} className="flex min-w-0 flex-1 items-center gap-2.5 text-start">
                      <PostThumb media={p.media} kind={p.kind} size={44} />
                      <span className="min-w-0 flex-1">
                        <span className="flex items-center gap-1 truncate text-[0.8125rem] font-semibold text-slate-900">{p.title}{p.aiMade && <Bot className="h-3.5 w-3.5 shrink-0 text-violet-500" />}</span>
                        <span className="mt-0.5 flex items-center gap-1.5 text-[0.6875rem] text-slate-500">
                          <PlatformStack platforms={p.platforms} size={12} />
                          {p.scheduledAt ? fmtDateTime(p.scheduledAt) : 'No time'}
                        </span>
                      </span>
                      {p.warnings.some((w) => w.level === 'error') && <AlertTriangle className="h-4 w-4 shrink-0 text-rose-500" aria-label="Has problems" />}
                    </button>
                  </li>
                ))}
              </ul>
            </Card>

            {current && (
              <div className="min-w-0 space-y-4">
                <Card>
                  <div className="flex flex-wrap items-start gap-3">
                    <div className="min-w-0 flex-1">
                      <div className="flex flex-wrap items-center gap-2">
                        <h2 className="truncate text-lg font-bold text-slate-900">{current.title}</h2>
                        <Badge size="xs">{KIND_LABEL[current.kind]}</Badge>
                        {current.aiMade && <Badge size="xs" variant="brand"><Bot className="me-1 h-3 w-3" />AI marketer</Badge>}
                      </div>
                      <p className="mt-1 flex flex-wrap items-center gap-x-3 gap-y-1 text-[0.8125rem] text-slate-500">
                        <span className="inline-flex items-center gap-1"><CalendarClock className="h-3.5 w-3.5" />{current.scheduledAt ? `${fmtDateTime(current.scheduledAt)} PKT (${relative(current.scheduledAt)})` : 'No time yet: approving keeps it unscheduled'}</span>
                        <PillarDot pillar={current.pillar} pillars={pillars} withLabel />
                        {current.campaign && <span>Campaign: {current.campaign}</span>}
                        {current.createdBy && <span>By {current.createdBy.name}</span>}
                      </p>
                    </div>
                    <div className="flex items-center gap-1.5">
                      <Button size="sm" variant="ghost" onClick={() => go(-1)} disabled={idx === 0} aria-label="Previous (←)"><ChevronLeft className="h-4 w-4" /></Button>
                      <span className="text-[0.75rem] tabular-nums text-slate-500">{idx + 1} / {visible.length}</span>
                      <Button size="sm" variant="ghost" onClick={() => go(1)} disabled={idx >= visible.length - 1} aria-label="Next (→)"><ChevronRight className="h-4 w-4" /></Button>
                    </div>
                  </div>
                  {current.notes && <p className="mt-3 rounded-lg bg-amber-50 px-3 py-2 text-[0.8125rem] text-amber-900 ring-1 ring-amber-200"><b>Note:</b> {current.notes}</p>}
                  {current.warnings.length > 0 && (
                    <ul className="mt-3 space-y-1">
                      {current.warnings.map((w, i) => (
                        <li key={i} className={cn('flex items-start gap-2 rounded-lg px-2.5 py-1.5 text-[0.8125rem]', w.level === 'error' ? 'bg-rose-50 text-rose-800' : 'bg-amber-50 text-amber-900')}>
                          {w.platform ? <PlatformMark p={w.platform} size={14} className="mt-0.5 shrink-0" /> : <AlertTriangle className="mt-0.5 h-3.5 w-3.5 shrink-0" />}{w.message}
                        </li>
                      ))}
                    </ul>
                  )}
                  <div className="mt-4 flex flex-wrap items-center gap-2 border-t border-slate-100 pt-4">
                    {canApprove && (
                      <>
                        <Button variant="success" loading={approve.isPending} disabled={busy || errors.length > 0} leftIcon={<ShieldCheck className="h-4 w-4" />} onClick={() => approve.mutate([current.id])}
                          title={errors.length ? 'Fix the problems first (Edit)' : undefined}>
                          {current.scheduledAt ? 'Approve & schedule' : 'Approve'} <Kbd className="ms-1">A</Kbd>
                        </Button>
                        <Button variant="critical" disabled={busy} leftIcon={<XCircle className="h-4 w-4" />} onClick={() => setRejecting([current.id])}>Reject <Kbd className="ms-1">R</Kbd></Button>
                      </>
                    )}
                    <Link to={`/social/posts/${current.id}`}><Button variant="secondary" leftIcon={<Pencil className="h-4 w-4" />}>Edit <Kbd className="ms-1">E</Kbd></Button></Link>
                    <span className="ms-auto hidden text-[0.75rem] text-slate-400 sm:inline">Next <Kbd>→</Kbd></span>
                  </div>
                </Card>
                <Card title="Preview">
                  <PreviewPanel key={current.id} platforms={current.platforms} build={build} />
                </Card>
              </div>
            )}
          </div>
        )}

      <PromptModal open={!!rejecting} onClose={() => setRejecting(null)} title={rejecting && rejecting.length > 1 ? `Reject ${rejecting.length} posts` : 'Reject this post'}
        label="Reason (the writer sees it)" placeholder="e.g. Use the new product photo; caption too long for X" confirmLabel="Reject" danger
        onSubmit={(reason) => rejecting && reject.mutate({ ids: rejecting, reason })} />
    </PageShell>
  );
}
