/**
 * Comments inbox (/social/inbox): recent comments and replies on Nafaa's
 * own posts from Facebook, Instagram, Threads, YouTube and X, read every 15
 * minutes. Reply from Nafaa, hide or delete where the platform allows it,
 * and mark done. A platform the inbox could not read says why at the top.
 */

import { Fragment, useState } from 'react';
import { Link } from 'react-router-dom';
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import { toast } from 'sonner';
import { AlertTriangle, CheckCheck, CheckCircle2, CornerDownRight, ExternalLink, Eye, EyeOff, Inbox, MessageSquareReply, RefreshCw, RotateCcw, Send, Share2, Trash2 } from 'lucide-react';
import {
  Alert, Badge, Button, Card, EmptyState, FilterBar, FilterMenu, PageHero, PageShell, SearchField, Skeleton, Table, TBody, THead, Td, Textarea, Th, Tr, ViewTabs,
  confirmDialog, heroButton,
} from '@/design-system/components';
import { brandSocialApi, type SocialComment, type SocialPlatform } from '@/api/admin-brand-social.api';
import { useCan } from '@/lib/access';
import { cn } from '@/lib/cn';
import { apiError } from '@/lib/errors';
import { num } from '@/lib/format';
import { PLATFORM, PlatformMark } from '../lib/platforms';
import { fmtDateTime, relative } from '../lib/time';
import { LoadError, PostThumb } from '../components/SocialUi';
import { INBOX_UNREAD_KEY } from '../components/InboxBadge';

type Tab = 'NEW' | 'DONE' | 'HIDDEN' | 'ALL';
const INBOX: SocialPlatform[] = ['FACEBOOK', 'INSTAGRAM', 'THREADS', 'YOUTUBE', 'X'];
const LIMITS: Partial<Record<SocialPlatform, number>> = { X: 280, THREADS: 500, INSTAGRAM: 2200, FACEBOOK: 8000, YOUTUBE: 10000 };

export default function InboxPage() {
  const qc = useQueryClient();
  const can = useCan();
  const canPublish = can('social.publish');
  const [tab, setTab] = useState<Tab>('NEW');
  const [platform, setPlatform] = useState('ALL');
  const [search, setSearch] = useState('');
  const [replying, setReplying] = useState<string | null>(null);
  const filters = { status: tab, platform: platform === 'ALL' ? undefined : platform, search: search.trim() || undefined };
  const q = useQuery({ queryKey: ['brand-social', 'inbox', filters], queryFn: () => brandSocialApi.comments(filters), placeholderData: (p) => p, refetchInterval: 2 * 60_000 });
  const d = q.data;
  const refresh = () => { qc.invalidateQueries({ queryKey: ['brand-social', 'inbox'] }); qc.invalidateQueries({ queryKey: INBOX_UNREAD_KEY }); };

  const check = useMutation({
    mutationFn: () => brandSocialApi.checkComments(),
    onSuccess: (r) => { toast.success(r.added ? `${r.added} new comment${r.added === 1 ? '' : 's'}` : 'No new comments'); refresh(); },
    onError: (e) => toast.error(apiError(e)),
  });
  const doneAll = useMutation({
    mutationFn: async () => {
      const ids = (d?.comments ?? []).filter((c) => c.status === 'NEW').map((c) => c.id);
      if (!ids.length) return null;
      const ok = await confirmDialog({ title: `Mark ${ids.length} comment${ids.length === 1 ? '' : 's'} done?`, text: 'They move to Done. Nothing changes on the platforms.', yes: 'Mark done' });
      return ok ? brandSocialApi.commentsDone(ids) : null;
    },
    onSuccess: (r) => { if (r) { toast.success(`${r.count} marked done`); refresh(); } },
    onError: (e) => toast.error(apiError(e)),
  });

  const broken = (d?.sources ?? []).filter((s) => !s.ok && s.message);
  const lastRead = (d?.sources ?? []).map((s) => s.checkedAt).filter((x): x is string => !!x).sort().pop();

  return (
    <PageShell>
      <PageHero
        title="Comments"
        chip="Nafaa's own posts"
        busy={q.isFetching}
        loading={q.isLoading}
        meta={lastRead ? `Read ${relative(lastRead)} · every 15 minutes` : 'Read every 15 minutes'}
        actions={<>
          <button type="button" className={heroButton} disabled={check.isPending} onClick={() => check.mutate()}><RefreshCw className={cn('h-4 w-4', check.isPending && 'animate-spin')} />Check now</button>
          {tab === 'NEW' && !!d?.comments.length && <button type="button" className={heroButton} disabled={doneAll.isPending} onClick={() => doneAll.mutate()}><CheckCheck className="h-4 w-4" />Mark all done</button>}
        </>}
        stats={d ? [
          { label: 'New', value: num(d.unread) },
          { label: 'Showing', value: num(d.comments.length) },
          { label: 'Platforms read', value: num(d.sources.filter((s) => s.ok).length), hint: `of ${d.sources.length} connected` },
        ] : undefined}
      />

      {broken.map((s) => (
        <Alert key={s.platform} tone="warning" title={`${PLATFORM[s.platform].label} comments could not be read`}>
          {s.message}{s.checkedAt ? ` (${relative(s.checkedAt)})` : ''}
        </Alert>
      ))}

      <ViewTabs<Tab> value={tab} onChange={setTab}
        tabs={[{ id: 'NEW', label: 'New', icon: Inbox, count: d?.unread ?? null }, { id: 'DONE', label: 'Done', icon: CheckCircle2 }, { id: 'HIDDEN', label: 'Hidden', icon: EyeOff }, { id: 'ALL', label: 'All' }]}
        hint="Pinterest and TikTok do not give comments through their APIs." />

      <FilterBar search={<SearchField value={search} onChange={setSearch} placeholder="Search comment or author" />}
        onClear={platform !== 'ALL' || search ? () => { setPlatform('ALL'); setSearch(''); } : undefined}>
        <FilterMenu icon={Share2} label="Platform" value={platform} active={platform !== 'ALL'} onChange={setPlatform} align="right"
          options={[{ value: 'ALL', label: 'All platforms' }, ...INBOX.map((p) => ({ value: p, label: PLATFORM[p].label }))]} />
      </FilterBar>

      {q.error ? <LoadError error={q.error} onRetry={() => q.refetch()} what="comments" /> : q.isLoading || !d ? (
        <Card flush><div className="space-y-2 p-4">{[1, 2, 3, 4].map((i) => <Skeleton key={i} className="h-16 rounded-xl" />)}</div></Card>
      ) : !d.comments.length ? (
        <Card>
          <EmptyState icon={<Inbox className="h-6 w-6" />}
            title={tab === 'NEW' ? 'No new comments' : 'No comments here'}
            description={!d.sources.length ? 'Connect Facebook, Instagram, Threads, YouTube or X on the Accounts page to read comments.' : tab === 'NEW' ? 'New comments on live posts show up here within 15 minutes.' : 'Change the tab or the filters.'}
            action={!d.sources.length && <Link to="/social/accounts" className="text-[0.8125rem] font-semibold text-brand-700 underline">Open accounts</Link>} />
        </Card>
      ) : (
        <Card flush>
          <Table minWidth="64rem">
            <THead><Tr><Th>Platform</Th><Th>Post</Th><Th>Author</Th><Th>Comment</Th><Th>Time</Th><Th align="right">Actions</Th></Tr></THead>
            <TBody>
              {d.comments.map((c) => (
                <Fragment key={c.id}>
                  <CommentRow c={c} canPublish={canPublish} replyOpen={replying === c.id} onReply={() => setReplying(replying === c.id ? null : c.id)} onChanged={refresh} />
                  {replying === c.id && (
                    <tr className="bg-slate-50/60"><td colSpan={6} className="px-4 pb-3 pt-1"><ReplyBox c={c} onDone={() => { setReplying(null); refresh(); }} /></td></tr>
                  )}
                </Fragment>
              ))}
            </TBody>
          </Table>
        </Card>
      )}
    </PageShell>
  );
}

function CommentRow({ c, canPublish, replyOpen, onReply, onChanged }: { c: SocialComment; canPublish: boolean; replyOpen: boolean; onReply: () => void; onChanged: () => void }) {
  const name = PLATFORM[c.platform].label;
  const act = useMutation({
    mutationFn: async (a: 'hide' | 'unhide' | 'delete' | 'done' | 'undone') => {
      if (a === 'delete') {
        const ok = await confirmDialog({ title: `Delete this comment on ${name}?`, text: `It is removed from ${name} for everyone. This cannot be undone.`, yes: 'Delete', danger: true });
        return ok ? brandSocialApi.deleteComment(c.id) : null;
      }
      if (a === 'hide' || a === 'unhide') {
        const hide = a === 'hide';
        const ok = await confirmDialog({
          title: hide ? `Hide this comment on ${name}?` : `Show this comment again on ${name}?`,
          text: hide ? (c.platform === 'YOUTUBE' ? 'YouTube removes it from the public page (rejected).' : 'Only the writer and their friends still see it.') : 'Everyone sees it again.',
          yes: hide ? 'Hide' : 'Show', danger: hide,
        });
        return ok ? brandSocialApi.hideComment(c.id, hide) : null;
      }
      return brandSocialApi.commentDone(c.id, a === 'done');
    },
    onSuccess: (r, a) => { if (!r) return; toast.success({ hide: 'Hidden', unhide: 'Shown again', delete: 'Deleted', done: 'Marked done', undone: 'Moved back to New' }[a]); onChanged(); },
    onError: (e) => toast.error(apiError(e)),
  });
  const reason = !canPublish ? 'Your admin role does not include "social.publish".' : c.can.reason ?? undefined;
  return (
    <Tr className={cn(c.status === 'NEW' && 'bg-brand-50/30', c.deletedAt && 'opacity-60')}>
      <Td><span className="inline-flex items-center gap-1.5 whitespace-nowrap"><PlatformMark p={c.platform} size={16} />{name}</span></Td>
      <Td>
        <Link to={`/social/posts/${c.post.id}`} className="flex max-w-[13rem] items-center gap-2 hover:text-brand-700">
          <PostThumb media={c.post.thumbUrl ? [{ url: c.post.thumbUrl, kind: 'image' }] : []} size={30} />
          <span className="truncate text-[0.8125rem] font-medium text-slate-800">{c.post.title || `#${c.post.code}`}</span>
        </Link>
      </Td>
      <Td><span className="block max-w-[10rem] truncate text-[0.8125rem] font-semibold text-slate-900" title={c.author.handle ?? c.author.name}>{c.author.name}</span>{c.author.handle && c.author.handle !== c.author.name && <span className="block truncate text-[0.6875rem] text-slate-500">{c.author.handle}</span>}</Td>
      <Td className="max-w-[26rem]">
        <p className="whitespace-pre-wrap break-words text-[0.8125rem] text-slate-800">{c.text || <span className="italic text-slate-400">No text</span>}</p>
        <span className="mt-1 flex flex-wrap gap-1">
          {c.parentId && <Badge size="xs" variant="outline">Reply</Badge>}
          {c.hidden && <Badge size="xs" variant="warning">Hidden</Badge>}
          {c.deletedAt && <Badge size="xs" variant="default">Deleted</Badge>}
          {c.repliedAt && <Badge size="xs" variant="success">Answered</Badge>}
        </span>
        {c.replies.map((r) => (
          <p key={r.id} className="mt-1.5 flex items-start gap-1.5 rounded-lg bg-slate-50 px-2 py-1 text-[0.75rem] text-slate-700 ring-1 ring-slate-200">
            <CornerDownRight className="mt-0.5 h-3 w-3 shrink-0 text-slate-400" /><span className="min-w-0 break-words"><b className="font-semibold">Nafaa:</b> {r.text}</span>
          </p>
        ))}
      </Td>
      <Td><span className="whitespace-nowrap text-[0.75rem] text-slate-600" title={fmtDateTime(c.commentedAt)}>{relative(c.commentedAt)}</span></Td>
      <Td align="right">
        <span className="inline-flex flex-wrap justify-end gap-1">
          {c.permalink && <a href={c.permalink} target="_blank" rel="noreferrer" className="inline-flex h-7 items-center gap-1 rounded-lg px-2 text-[0.75rem] font-semibold text-brand-700 hover:bg-brand-50" title={`Open on ${name}`}><ExternalLink className="h-3.5 w-3.5" />Open</a>}
          {!c.deletedAt && <>
            <Button size="xs" variant={replyOpen ? 'primary' : 'secondary'} leftIcon={<MessageSquareReply className="h-3 w-3" />} disabled={!canPublish || !c.can.reply} title={!c.can.reply || !canPublish ? reason : undefined} onClick={onReply}>Reply</Button>
            <Button size="xs" variant="ghost" leftIcon={c.hidden ? <Eye className="h-3 w-3" /> : <EyeOff className="h-3 w-3" />} disabled={!canPublish || !c.can.hide || act.isPending}
              title={!c.can.hide || !canPublish ? reason ?? `${name} does not allow hiding this comment.` : undefined} onClick={() => act.mutate(c.hidden ? 'unhide' : 'hide')}>{c.hidden ? 'Show' : 'Hide'}</Button>
            <Button size="xs" variant="ghost" className="text-rose-600" leftIcon={<Trash2 className="h-3 w-3" />} disabled={!canPublish || !c.can.delete || act.isPending}
              title={!c.can.delete || !canPublish ? reason ?? `${name} does not allow deleting this comment from Nafaa.` : undefined} onClick={() => act.mutate('delete')}>Delete</Button>
          </>}
          {c.status === 'NEW'
            ? <Button size="xs" variant="secondary" leftIcon={<CheckCircle2 className="h-3 w-3" />} disabled={act.isPending} onClick={() => act.mutate('done')}>Done</Button>
            : <Button size="xs" variant="ghost" leftIcon={<RotateCcw className="h-3 w-3" />} disabled={act.isPending} onClick={() => act.mutate('undone')}>New</Button>}
        </span>
      </Td>
    </Tr>
  );
}

function ReplyBox({ c, onDone }: { c: SocialComment; onDone: () => void }) {
  const [text, setText] = useState('');
  const limit = LIMITS[c.platform] ?? 2000;
  const length = [...text].length;
  const send = useMutation({
    mutationFn: () => brandSocialApi.replyComment(c.id, text.trim()),
    onSuccess: () => { toast.success(`Reply posted on ${PLATFORM[c.platform].label}`); onDone(); },
    onError: (e) => toast.error(apiError(e)),
  });
  return (
    <div className="rounded-xl bg-white p-3 ring-1 ring-slate-200">
      <Textarea label={`Reply as Nafaa on ${PLATFORM[c.platform].label}`} rows={3} value={text} autoFocus onChange={(e) => setText(e.target.value)}
        hint={(c.platform === 'INSTAGRAM' || c.platform === 'YOUTUBE') && c.parentId ? `${PLATFORM[c.platform].label} replies go under the first comment of the thread.` : undefined} />
      <div className="mt-2 flex items-center justify-between gap-2">
        <span className={cn('text-[0.75rem] tabular-nums', length > limit ? 'text-rose-600' : 'text-slate-500')}><AlertTriangle className={cn('me-1 inline h-3 w-3', length <= limit && 'hidden')} />{length} / {limit}</span>
        <Button size="sm" leftIcon={<Send className="h-3.5 w-3.5" />} loading={send.isPending} disabled={!text.trim() || length > limit} onClick={() => send.mutate()}>Send reply</Button>
      </div>
    </div>
  );
}
