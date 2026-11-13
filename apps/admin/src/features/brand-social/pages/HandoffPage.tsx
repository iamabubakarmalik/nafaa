/**
 * To post by hand (/social/handoff): posts for TikTok, YouTube, X, LinkedIn,
 * Pinterest, Threads (and any account with auto-publish off) that are due.
 * Download the media, copy the platform's caption, open the platform, then
 * paste the live URL to mark it posted. "Coming up" shows the next two days.
 */

import { useMemo, useState } from 'react';
import { Link } from 'react-router-dom';
import { useMutation, useQuery } from '@tanstack/react-query';
import { toast } from 'sonner';
import { CheckCircle2, Clipboard, Download, ExternalLink, Film, Hand, SkipForward } from 'lucide-react';
import { Badge, Button, Card, EmptyState, PageHero, PageShell, Skeleton } from '@/design-system/components';
import { brandSocialApi, type SocialAccount, type SocialPlatform, type SocialPost } from '@/api/admin-brand-social.api';
import { useCan } from '@/lib/access';
import { cn } from '@/lib/cn';
import { apiError } from '@/lib/errors';
import { KIND_LABEL, PLATFORM, PlatformMark, openPlatform } from '../lib/platforms';
import { captionFor, copyText, downloadUrl, fullText, isValidUrl } from '../lib/post';
import { KEYS, useAccounts, useInvalidate, usePosts } from '../lib/queries';
import { addDays, fmtDateTime, pkToday, relative } from '../lib/time';
import { LoadError, PostThumb } from '../components/SocialUi';

/** Platforms of a post that wait for a person. */
const handoffOf = (p: SocialPost) => p.platforms.filter((x) => p.publishState?.[x]?.status === 'HANDOFF');

/** Platforms that will need a person when the post is due. */
const manualOf = (p: SocialPost, accounts: SocialAccount[]) => p.platforms.filter((x) => {
  const a = accounts.find((acc) => acc.platform === x && acc.status !== 'DISCONNECTED');
  return !PLATFORM[x].api || !a || a.status === 'MANUAL' || !a.autoPublish;
});

export default function HandoffPage() {
  const today = pkToday();
  const q = useQuery({ queryKey: [...KEYS.all, 'handoff'], queryFn: brandSocialApi.handoff, refetchInterval: 60_000 });
  const soonQ = usePosts({ from: today, to: addDays(today, 2), status: 'SCHEDULED,APPROVED' });
  const accounts = useAccounts().data?.accounts ?? [];
  const due = useMemo(() => (q.data?.posts ?? []).filter((p) => handoffOf(p).length).sort((a, b) => (a.scheduledAt ?? '').localeCompare(b.scheduledAt ?? '')), [q.data]);
  const upcoming = useMemo(() => (soonQ.data?.posts ?? []).filter((p) => p.scheduledAt && new Date(p.scheduledAt).getTime() > Date.now() && manualOf(p, accounts).length)
    .sort((a, b) => a.scheduledAt!.localeCompare(b.scheduledAt!)), [soonQ.data, accounts]);
  const platformsWaiting = due.reduce((n, p) => n + handoffOf(p).length, 0);

  return (
    <PageShell>
      <PageHero
        title="To post by hand"
        chip={<><Hand />{platformsWaiting} waiting</>}
        busy={q.isFetching}
        loading={q.isLoading}
        stats={q.data ? [
          { label: 'Posts due', value: due.length },
          { label: 'Platform posts waiting', value: platformsWaiting },
          { label: 'Overdue (2 h+)', value: due.filter((p) => p.scheduledAt && Date.now() - new Date(p.scheduledAt).getTime() > 2 * 3_600_000).length },
          { label: 'Coming up (48 h)', value: upcoming.length },
        ] : undefined}
      />

      {q.error ? <LoadError error={q.error} onRetry={() => q.refetch()} what="the hand-posting queue" />
        : q.isLoading ? <div className="space-y-3">{[1, 2].map((i) => <Skeleton key={i} className="h-56 rounded-2xl" />)}</div>
          : (
            <>
              {!due.length ? (
                <Card><EmptyState icon={<CheckCircle2 className="h-7 w-7 text-success-600" />} title="Nothing to post by hand right now" description="When a TikTok, YouTube, X, LinkedIn, Pinterest or Threads post is due, it shows up here with everything you need." /></Card>
              ) : (
                <div className="space-y-4">{due.map((p) => <HandoffCard key={p.id} post={p} />)}</div>
              )}
              {upcoming.length > 0 && (
                <Card flush title="Coming up" description="These will land here when they are due. Get the media ready.">
                  <ul className="divide-y divide-slate-100">
                    {upcoming.map((p) => (
                      <li key={p.id}>
                        <Link to={`/social/posts/${p.id}`} className="flex items-center gap-3 px-4 py-2.5 hover:bg-slate-50">
                          <PostThumb media={p.media} kind={p.kind} size={36} />
                          <span className="min-w-0 flex-1 truncate text-[0.8125rem] font-medium text-slate-900">{p.title}</span>
                          <span className="flex items-center gap-1">{manualOf(p, accounts).map((x) => <PlatformMark key={x} p={x} size={14} />)}</span>
                          <span className="w-40 text-end text-[0.75rem] tabular-nums text-slate-500">{fmtDateTime(p.scheduledAt)}</span>
                        </Link>
                      </li>
                    ))}
                  </ul>
                </Card>
              )}
            </>
          )}
    </PageShell>
  );
}

function HandoffCard({ post }: { post: SocialPost }) {
  const platforms = handoffOf(post);
  const overdue = post.scheduledAt && Date.now() - new Date(post.scheduledAt).getTime() > 2 * 3_600_000;
  const downloadAll = async () => {
    for (const [i, m] of post.media.entries()) {
      const ext = m.url.split('?')[0].split('.').pop() ?? (m.kind === 'video' ? 'mp4' : 'jpg');
      await downloadUrl(m.url, `${post.code}-${i + 1}.${ext}`);
    }
  };
  return (
    <Card>
      <div className="flex flex-wrap items-start gap-3">
        <div className="min-w-0 flex-1">
          <div className="flex flex-wrap items-center gap-2">
            <Link to={`/social/posts/${post.id}`} className="truncate text-[1rem] font-bold text-slate-900 hover:text-brand-700">{post.title}</Link>
            <Badge size="xs">{KIND_LABEL[post.kind]}</Badge>
            {overdue && <Badge size="xs" variant="danger">Overdue</Badge>}
          </div>
          <p className="mt-0.5 text-[0.8125rem] text-slate-500">Due {fmtDateTime(post.scheduledAt)} PKT · {post.scheduledAt ? relative(post.scheduledAt) : ''} · #{post.code}</p>
        </div>
        {post.media.length > 0 && <Button size="sm" variant="secondary" leftIcon={<Download className="h-4 w-4" />} onClick={downloadAll}>Download {post.media.length > 1 ? `all ${post.media.length}` : 'media'}</Button>}
      </div>

      {post.media.length > 0 && (
        <div className="mt-3 flex gap-2 overflow-x-auto pb-1">
          {post.media.map((m, i) => (
            <button key={i} type="button" onClick={() => downloadUrl(m.url, `${post.code}-${i + 1}`)} title="Download"
              className="group relative h-24 w-24 shrink-0 overflow-hidden rounded-xl bg-slate-100 ring-1 ring-slate-200">
              {m.kind === 'video' ? (m.thumbUrl ? <img src={m.thumbUrl} alt="" className="h-full w-full object-cover" /> : <video src={m.url} muted preload="metadata" className="h-full w-full object-cover" />) : <img src={m.url} alt="" className="h-full w-full object-cover" />}
              {m.kind === 'video' && <Film className="absolute bottom-1 start-1 h-3.5 w-3.5 text-white drop-shadow" />}
              <span className="absolute inset-0 flex items-center justify-center bg-black/40 opacity-0 transition group-hover:opacity-100"><Download className="h-5 w-5 text-white" /></span>
            </button>
          ))}
        </div>
      )}

      <div className="mt-4 grid gap-3 md:grid-cols-2">
        {platforms.map((p) => <PlatformRow key={p} post={post} platform={p} />)}
      </div>
    </Card>
  );
}

function PlatformRow({ post, platform }: { post: SocialPost; platform: SocialPlatform }) {
  const can = useCan();
  const invalidate = useInvalidate();
  const [url, setUrl] = useState('');
  const text = post.texts?.[platform] ?? fullText(captionFor(post.caption, post.captions, platform), post.hashtags);
  const limit = PLATFORM[platform].limit;
  const mark = useMutation({
    mutationFn: (skipped: boolean) => brandSocialApi.markPosted(post.id, { platform, url: skipped ? null : url.trim(), skipped }),
    onSuccess: (_r, skipped) => { toast.success(skipped ? `${PLATFORM[platform].label} skipped` : `${PLATFORM[platform].label} marked as posted`); invalidate(); },
    onError: (e) => toast.error(apiError(e)),
  });
  const valid = url.trim() && isValidUrl(url.trim());
  return (
    <div className="rounded-xl bg-slate-50 p-3 ring-1 ring-slate-200">
      <div className="flex items-center gap-2">
        <PlatformMark p={platform} size={20} />
        <span className="text-[0.875rem] font-semibold text-slate-900">{PLATFORM[platform].label}</span>
        <span className={cn('ms-auto text-[0.6875rem] tabular-nums', [...text].length > limit ? 'font-semibold text-rose-600' : 'text-slate-400')}>{[...text].length}/{limit}</span>
      </div>
      <pre className="mt-2 max-h-32 overflow-y-auto whitespace-pre-wrap break-words rounded-lg bg-white p-2.5 font-sans text-[0.8125rem] leading-relaxed text-slate-700 ring-1 ring-slate-200">{text || <span className="text-slate-400">No caption</span>}</pre>
      <div className="mt-2 flex flex-wrap gap-1.5">
        <Button size="xs" variant="secondary" leftIcon={<Clipboard className="h-3.5 w-3.5" />} onClick={async () => { if (await copyText(text)) toast.success('Caption copied'); }}>Copy caption</Button>
        <Button size="xs" variant="secondary" leftIcon={<ExternalLink className="h-3.5 w-3.5" />} onClick={() => openPlatform(platform)}>Open {PLATFORM[platform].label}</Button>
        {post.links?.[platform] && <Button size="xs" variant="ghost" onClick={async () => { if (await copyText(post.links[platform]!)) toast.success('Tracked link copied'); }}>Copy link</Button>}
      </div>
      {can('social.publish') ? (
        <div className="mt-2.5 flex gap-1.5">
          <input value={url} onChange={(e) => setUrl(e.target.value)} placeholder={`Paste the ${PLATFORM[platform].label} post URL`}
            onKeyDown={(e) => { if (e.key === 'Enter' && valid) mark.mutate(false); }}
            className="h-8 min-w-0 flex-1 rounded-lg border border-slate-300 bg-white px-2.5 text-[0.8125rem] text-slate-900 placeholder:text-slate-400 focus:border-brand-500 focus:outline-none focus:ring-2 focus:ring-brand-500/20" />
          <Button size="xs" className="h-8" disabled={!valid} loading={mark.isPending && mark.variables === false} leftIcon={<CheckCircle2 className="h-3.5 w-3.5" />} onClick={() => mark.mutate(false)}>Mark posted</Button>
          <Button size="xs" className="h-8" variant="ghost" loading={mark.isPending && mark.variables === true} title="Not posting on this platform" aria-label="Skip" onClick={() => mark.mutate(true)}><SkipForward className="h-3.5 w-3.5" /></Button>
        </div>
      ) : null}
    </div>
  );
}
