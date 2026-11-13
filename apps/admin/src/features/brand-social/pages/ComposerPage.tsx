/**
 * Composer (/social/posts/new, /social/posts/:id): one post for every chosen
 * platform. Shared caption with per-platform versions, media from the
 * library or dropped in, carousel order, link with UTM tags, PKT schedule
 * with best-time suggestions, live previews and inline checks. The action
 * row follows the post's status and the admin's permissions.
 */

import { useEffect, useMemo, useRef, useState } from 'react';
import { Link, useNavigate, useParams, useSearchParams } from 'react-router-dom';
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import { toast } from 'sonner';
import {
  AlertTriangle, Archive, Bot, CheckCircle2, Copy, ExternalLink, Hand, Lightbulb, Link2, MoreHorizontal, RefreshCw, Rocket, Save, Send, ShieldCheck, XCircle,
} from 'lucide-react';
import {
  Alert, Badge, Button, Card, Input, Menu, MenuItem, MenuSeparator, PageHero, PageShell, Segmented, Select, Skeleton, Textarea, confirmDialog, heroButton, heroPrimaryButton,
} from '@/design-system/components';
import { isDialogOpen } from '@core/lib/shortcuts';
import {
  brandSocialApi, POST_KINDS, type PostInput, type PostKind, type PostMedia, type SocialPlatform, type SocialPost,
} from '@/api/admin-brand-social.api';
import { useCan } from '@/lib/access';
import { cn } from '@/lib/cn';
import { apiError } from '@/lib/errors';
import { PromptModal } from '@/features/marketing/lib/kit';
import { KIND_LABEL, PLATFORM, PlatformMark } from '../lib/platforms';
import { captionFor, copyText, fullText, localWarnings, utmLink, type LocalWarning } from '../lib/post';
import { KEYS, useAccounts, useInvalidate, useSettings } from '../lib/queries';
import { fmtDateTime, pkToIso } from '../lib/time';
import { LoadError, PostStatusBadge, SectionLabel } from '../components/SocialUi';
import { PlatformPicker } from '../components/composer/PlatformPicker';
import { CaptionEditor } from '../components/composer/CaptionEditor';
import { MediaStrip } from '../components/composer/MediaStrip';
import { SchedulePicker } from '../components/composer/SchedulePicker';
import { PreviewPanel, type PreviewData } from '../components/Previews';

interface Form {
  title: string;
  kind: PostKind;
  pillar: string;
  campaign: string;
  caption: string;
  captions: Partial<Record<SocialPlatform, string>>;
  hashtags: string[];
  firstComment: string;
  link: string;
  media: PostMedia[];
  platforms: SocialPlatform[];
  scheduledAt: string | null;
  notes: string;
}

const EMPTY: Form = {
  title: '', kind: 'POST', pillar: '', campaign: '', caption: '', captions: {}, hashtags: [], firstComment: '', link: '', media: [], platforms: [], scheduledAt: null, notes: '',
};

const fromPost = (p: SocialPost): Form => ({
  title: p.title, kind: p.kind, pillar: p.pillar ?? '', campaign: p.campaign ?? '', caption: p.caption, captions: p.captions ?? {}, hashtags: p.hashtags,
  firstComment: p.firstComment ?? '', link: p.link ?? '', media: p.media, platforms: p.platforms, scheduledAt: p.scheduledAt, notes: p.notes ?? '',
});

const toInput = (f: Form): PostInput => ({
  title: f.title.trim() || 'Untitled post', kind: f.kind, pillar: f.pillar || null, campaign: f.campaign || null, caption: f.caption,
  captions: Object.fromEntries(Object.entries(f.captions).filter(([, v]) => v?.trim())), hashtags: f.hashtags, firstComment: f.firstComment.trim() || null,
  link: f.link.trim() || null, media: f.media, platforms: f.platforms, scheduledAt: f.scheduledAt, notes: f.notes.trim() || null,
});

const LOCKED = ['PUBLISHING', 'PUBLISHED', 'PARTIAL', 'FAILED', 'ARCHIVED'];

export default function ComposerPage() {
  const { id = 'new' } = useParams();
  const isNew = id === 'new';
  const [params] = useSearchParams();
  const navigate = useNavigate();
  const qc = useQueryClient();
  const invalidate = useInvalidate();
  const can = useCan();
  const accountsQ = useAccounts();
  const settingsQ = useSettings();
  const settings = settingsQ.data;
  const accounts = useMemo(() => accountsQ.data?.accounts ?? [], [accountsQ.data]);
  const postQ = useQuery({ queryKey: KEYS.post(id), queryFn: () => brandSocialApi.post(id), enabled: !isNew });
  const post = postQ.data;

  const [form, setForm] = useState<Form>(EMPTY);
  const [dirty, setDirty] = useState(false);
  const loadedFor = useRef<string | null>(null);
  const [rejecting, setRejecting] = useState(false);
  const [more, setMore] = useState(false);
  const moreRef = useRef<HTMLButtonElement>(null);

  // Fill the form once per post (or from the calendar's "+" for a new one).
  useEffect(() => {
    if (isNew) {
      if (loadedFor.current === 'new') return;
      loadedFor.current = 'new';
      const date = params.get('date');
      const platform = params.get('platform') as SocialPlatform | null;
      setForm({
        ...EMPTY,
        scheduledAt: date ? pkToIso(date, params.get('time') ?? '10:00') : null,
        platforms: platform ? [platform] : [],
        kind: (params.get('kind') as PostKind) || 'POST',
      });
      setDirty(false);
    } else if (post && loadedFor.current !== post.id) {
      loadedFor.current = post.id;
      setForm(fromPost(post));
      setDirty(false);
    }
  }, [isNew, post, params]);

  // Default to every live account on a new post once accounts load.
  useEffect(() => {
    if (isNew && !form.platforms.length && accounts.length && !dirty && !params.get('platform')) {
      setForm((f) => ({ ...f, platforms: accounts.filter((a) => a.status === 'CONNECTED').map((a) => a.platform) }));
    }
  }, [isNew, accounts, dirty, form.platforms.length, params]);

  const set = <K extends keyof Form>(k: K, v: Form[K]) => { setForm((f) => ({ ...f, [k]: v })); setDirty(true); };
  const setMedia = (media: PostMedia[]) => {
    setForm((f) => {
      let kind = f.kind;
      if (media.length > 1 && kind === 'POST') kind = 'CAROUSEL';
      if (media.length <= 1 && kind === 'CAROUSEL') kind = 'POST';
      if (media.length === 1 && media[0].kind === 'video' && kind === 'POST') kind = 'REEL';
      return { ...f, media, kind };
    });
    setDirty(true);
  };

  const status = post?.status ?? 'DRAFT';
  const locked = !isNew && LOCKED.includes(status);
  const canEdit = can('social.edit');
  const readOnly = locked || !canEdit;
  const requireApproval = settings?.requireApproval ?? true;

  // Warn before leaving with unsaved changes.
  useEffect(() => {
    if (!dirty) return;
    const h = (e: BeforeUnloadEvent) => { e.preventDefault(); };
    window.addEventListener('beforeunload', h);
    return () => window.removeEventListener('beforeunload', h);
  }, [dirty]);

  // ─── Saving and status moves ─────────────────────────────────────────
  const save = async (asIdea = false): Promise<SocialPost> => {
    const body = toInput(form);
    const saved = isNew
      ? await brandSocialApi.createPost({ ...body, status: asIdea ? 'IDEA' : 'DRAFT' })
      : dirty || asIdea ? await brandSocialApi.updatePost(id, { ...body, ...(asIdea ? { status: 'IDEA' as const } : {}) }) : post!;
    setDirty(false);
    qc.setQueryData(KEYS.post(saved.id), saved);
    loadedFor.current = saved.id;
    setForm(fromPost(saved));
    if (isNew) navigate(`/social/posts/${saved.id}`, { replace: true });
    return saved;
  };

  const run = useMutation({
    mutationFn: async (action: 'draft' | 'idea' | 'submit' | 'approve' | 'publish') => {
      if (action === 'publish') {
        const ok = await confirmDialog({
          title: 'Publish now?',
          text: 'Facebook and Instagram go live within a minute. Platforms posted by hand go to the "To post by hand" queue.',
          yes: 'Publish now',
        });
        if (!ok) return null;
      }
      const saved = await save(action === 'idea');
      if (action === 'submit') return brandSocialApi.submit(saved.id);
      if (action === 'approve') return brandSocialApi.approve(saved.id);
      if (action === 'publish') return brandSocialApi.publishNow(saved.id);
      return saved;
    },
    onSuccess: (res, action) => {
      if (!res) return;
      qc.setQueryData(KEYS.post(res.id), res);
      setForm(fromPost(res));
      invalidate();
      toast.success({
        draft: 'Saved', idea: 'Saved as an idea', submit: 'Sent for review',
        approve: res.status === 'SCHEDULED' ? `Approved and scheduled for ${fmtDateTime(res.scheduledAt)}` : 'Approved',
        publish: 'Publishing started',
      }[action]);
    },
    onError: (e) => toast.error(apiError(e)),
  });

  const simple = useMutation({
    mutationFn: async (a: { kind: 'reject'; reason: string } | { kind: 'duplicate' } | { kind: 'archive' } | { kind: 'retry'; platform: SocialPlatform }) => {
      if (a.kind === 'reject') return brandSocialApi.reject(id, a.reason);
      if (a.kind === 'duplicate') return brandSocialApi.duplicatePost(id);
      if (a.kind === 'retry') return brandSocialApi.retry(id, a.platform);
      const ok = await confirmDialog({ title: 'Archive this post?', text: 'It leaves the calendar and every queue. Results already published stay on the platforms.', yes: 'Archive', danger: true });
      return ok ? brandSocialApi.archivePost(id) : null;
    },
    onSuccess: (res, a) => {
      if (!res) return;
      invalidate();
      if (a.kind === 'duplicate') { toast.success('Copy made as a draft'); navigate(`/social/posts/${res.id}`); return; }
      if (a.kind === 'archive') { toast.success('Archived'); navigate('/social/calendar'); return; }
      qc.setQueryData(KEYS.post(res.id), res);
      setForm(fromPost(res));
      toast.success(a.kind === 'reject' ? 'Rejected. The writer sees your reason.' : 'Trying again now');
    },
    onError: (e) => toast.error(apiError(e)),
  });

  // Ctrl/Cmd + S saves.
  useEffect(() => {
    const h = (e: KeyboardEvent) => {
      if ((e.metaKey || e.ctrlKey) && e.key.toLowerCase() === 's') {
        e.preventDefault();
        if (!readOnly && !run.isPending && !isDialogOpen()) run.mutate('draft');
      }
    };
    window.addEventListener('keydown', h);
    return () => window.removeEventListener('keydown', h);
  }, [readOnly, run]);

  // ─── Checks ──────────────────────────────────────────────────────────
  const warnings: LocalWarning[] = useMemo(() => {
    const local = localWarnings({ ...form });
    const server = !dirty && post ? post.warnings : [];
    const seen = new Set(local.map((w) => w.message));
    return [...local, ...server.filter((w) => !seen.has(w.message))];
  }, [form, dirty, post]);
  const errors = warnings.filter((w) => w.level === 'error');

  // ─── Previews ────────────────────────────────────────────────────────
  const code = post?.code ?? 'new';
  const campaign = form.campaign || settings?.utm.defaultCampaign || '';
  const linkFor = (p: SocialPlatform) => (!dirty && post?.links?.[p]) || utmLink(form.link, p, campaign, code, settings?.utm.medium);
  const build = (p: SocialPlatform): PreviewData => {
    let text = !dirty && post?.texts?.[p] ? post.texts[p]! : fullText(captionFor(form.caption, form.captions, p), form.hashtags);
    const link = form.link ? linkFor(p) : '';
    if ((dirty || !post?.texts?.[p]) && link && !['INSTAGRAM', 'TIKTOK'].includes(p) && !text.includes(form.link)) text = `${text}\n\n${link}`;
    return {
      platform: p, account: accounts.find((a) => a.platform === p && a.status !== 'DISCONNECTED'), text, media: form.media, kind: form.kind,
      link, firstComment: ['FACEBOOK', 'INSTAGRAM'].includes(p) ? form.firstComment : '', when: form.scheduledAt ? fmtDateTime(form.scheduledAt) : null,
    };
  };

  if (!isNew && postQ.error) {
    return <PageShell><PageHero title="Post" back="/social/calendar" /><LoadError error={postQ.error} onRetry={() => postQ.refetch()} what="this post" /></PageShell>;
  }
  const loading = (!isNew && postQ.isLoading) || accountsQ.isLoading;

  // ─── Action row ──────────────────────────────────────────────────────
  const busy = run.isPending || simple.isPending;
  const primary = (() => {
    if (readOnly) return null;
    // Editing an approved post sends it back to review, so offer to re-approve it in one go.
    if (['APPROVED', 'SCHEDULED'].includes(status) && dirty && requireApproval && can('social.approve')) return { label: 'Save & approve', icon: ShieldCheck, action: 'approve' as const };
    if (['APPROVED', 'SCHEDULED'].includes(status) && can('social.publish')) return { label: 'Publish now', icon: Rocket, action: 'publish' as const };
    if (can('social.approve') && (status === 'IN_REVIEW' || !requireApproval)) return { label: form.scheduledAt ? 'Approve & schedule' : 'Approve', icon: ShieldCheck, action: 'approve' as const };
    if (['IDEA', 'DRAFT', 'REJECTED'].includes(status) && requireApproval) return { label: 'Submit for review', icon: Send, action: 'submit' as const };
    if (can('social.approve')) return { label: form.scheduledAt ? 'Approve & schedule' : 'Approve', icon: ShieldCheck, action: 'approve' as const };
    return null;
  })();

  const pillars = settings?.pillars ?? [];
  const campaigns = (settings?.campaigns ?? []).filter((c) => c.active || c.key === form.campaign || c.label === form.campaign);
  const handoffPlatforms = (post?.platforms ?? []).filter((p) => post?.publishState?.[p]?.status === 'HANDOFF');

  return (
    <PageShell>
      <PageHero
        title={isNew ? 'New post' : form.title || 'Untitled post'}
        back="/social/calendar"
        backLabel="Calendar"
        loading={loading}
        chip={isNew ? 'Draft' : <><span>{post ? `#${post.code}` : '…'}</span></>}
        meta={post ? <span className="inline-flex items-center gap-2"><PostStatusBadge status={post.status} size="xs" />{dirty && <span>Unsaved changes</span>}{(post.aiMade || post.createdByKey) && <span className="inline-flex items-center gap-1"><Bot className="h-3.5 w-3.5" />AI marketer</span>}</span> : dirty ? 'Unsaved changes' : undefined}
        actions={<>
          {!readOnly && (
            <button type="button" className={heroButton} disabled={busy} onClick={() => run.mutate('draft')} title="Save (Ctrl+S)">
              <Save className="h-4 w-4" />{isNew || ['IDEA', 'DRAFT'].includes(status) ? 'Save draft' : 'Save changes'}
            </button>
          )}
          {status === 'IN_REVIEW' && can('social.approve') && !readOnly && (
            <button type="button" className={heroButton} disabled={busy} onClick={() => setRejecting(true)}><XCircle className="h-4 w-4" />Reject</button>
          )}
          {primary && (
            <button type="button" className={heroPrimaryButton} disabled={busy || (primary.action !== 'submit' && errors.length > 0)} onClick={() => run.mutate(primary.action)}
              title={primary.action !== 'submit' && errors.length ? 'Fix the problems in Checks first' : undefined}>
              <primary.icon className="h-4 w-4" />{primary.label}
            </button>
          )}
          {!isNew && (
            <>
              <button ref={moreRef} type="button" className={heroButton} onClick={() => setMore((v) => !v)} aria-label="More actions"><MoreHorizontal className="h-4 w-4" /></button>
              <Menu open={more} onClose={() => setMore(false)} anchorRef={moreRef} align="end" width="w-56">
                {!readOnly && <MenuItem icon={<Lightbulb className="h-4 w-4" />} onClick={() => { setMore(false); run.mutate('idea'); }}>Save as idea</MenuItem>}
                <MenuItem icon={<Copy className="h-4 w-4" />} onClick={() => { setMore(false); simple.mutate({ kind: 'duplicate' }); }}>Duplicate</MenuItem>
                {['APPROVED', 'SCHEDULED'].includes(status) && can('social.approve') && primary?.action === 'publish' && (
                  <MenuItem icon={<ShieldCheck className="h-4 w-4" />} onClick={() => { setMore(false); run.mutate('approve'); }}>Save and re-approve</MenuItem>
                )}
                {status !== 'ARCHIVED' && can('social.edit') && <><MenuSeparator /><MenuItem tone="danger" icon={<Archive className="h-4 w-4" />} onClick={() => { setMore(false); simple.mutate({ kind: 'archive' }); }}>Archive</MenuItem></>}
              </Menu>
            </>
          )}
        </>}
      />

      {post?.status === 'REJECTED' && post.rejectReason && (
        <Alert tone="danger" title={`Rejected${post.rejectedBy ? ` by ${post.rejectedBy.name}` : ''}`}>{post.rejectReason} Fix it and submit again.</Alert>
      )}
      {settings?.paused && <Alert tone="warning" title="Publishing is paused">Nothing goes out until it is switched back on in <Link to="/social/settings" className="font-semibold underline">Settings</Link>.</Alert>}
      {locked && post && status !== 'ARCHIVED' && <Alert tone="info" title="This post has gone out">Editing is closed. Duplicate it to reuse the content.</Alert>}

      {loading ? (
        <div className="grid gap-4 lg:grid-cols-12">
          <div className="space-y-4 lg:col-span-7">{[1, 2, 3].map((i) => <Skeleton key={i} className="h-48 rounded-2xl" />)}</div>
          <Skeleton className="h-[34rem] rounded-2xl lg:col-span-5" />
        </div>
      ) : (
        <div className="grid items-start gap-4 lg:grid-cols-12">
          <div className="min-w-0 space-y-4 lg:col-span-7">
            <Card title="Where" description="Pick the accounts this post goes to.">
              <PlatformPicker accounts={accounts} value={form.platforms} onChange={(v) => set('platforms', v)} disabled={readOnly} />
            </Card>

            <Card title="Post">
              <div className="grid gap-3 sm:grid-cols-2">
                <Input label="Title (only the team sees it)" value={form.title} disabled={readOnly} placeholder="e.g. Khata reminder reel" onChange={(e) => set('title', e.target.value)} wrapperClassName="sm:col-span-2" />
                <div className="sm:col-span-2">
                  <span className="mb-1 block text-[0.75rem] font-medium text-slate-600">Kind</span>
                  <Segmented value={form.kind} onChange={(v) => !readOnly && set('kind', v)} label="Kind" className="flex-wrap" items={POST_KINDS.map((k) => ({ value: k, label: KIND_LABEL[k], disabled: readOnly }))} />
                </div>
                <Select label="Pillar" value={form.pillar} disabled={readOnly} onChange={(e) => set('pillar', e.target.value)} placeholder="No pillar"
                  options={[{ value: '', label: 'No pillar' }, ...pillars.map((p) => ({ value: p.key, label: p.label })), ...(form.pillar && !pillars.some((p) => p.key === form.pillar) ? [{ value: form.pillar, label: form.pillar }] : [])]} />
                <Select label="Campaign" value={form.campaign} disabled={readOnly} onChange={(e) => set('campaign', e.target.value)}
                  options={[{ value: '', label: settings?.utm.defaultCampaign ? `Default (${settings.utm.defaultCampaign})` : 'No campaign' }, ...campaigns.map((c) => ({ value: c.key, label: c.label })), ...(form.campaign && !campaigns.some((c) => c.key === form.campaign) ? [{ value: form.campaign, label: form.campaign }] : [])]} />
              </div>
            </Card>

            <Card title="Caption" description="Write once; open a platform tab to change it just for that platform.">
              <CaptionEditor
                platforms={form.platforms} caption={form.caption} captions={form.captions} hashtags={form.hashtags} hashtagSets={settings?.hashtagSets ?? []} title={form.title}
                onCaption={(v) => set('caption', v)} onCaptions={(v) => set('captions', v)} onHashtags={(v) => set('hashtags', v)} disabled={readOnly}
              />
              {form.platforms.some((p) => p === 'FACEBOOK' || p === 'INSTAGRAM') && (
                <Textarea wrapperClassName="mt-3" label="First comment (Facebook and Instagram)" hint="Posted as a comment right after the post goes live. Good for links and extra hashtags." rows={2}
                  value={form.firstComment} disabled={readOnly} onChange={(e) => set('firstComment', e.target.value)} />
              )}
            </Card>

            <Card title="Media" description={form.kind === 'CAROUSEL' ? 'Carousel: the order here is the swipe order.' : form.kind === 'REEL' ? 'Reel: one vertical video, 9:16, 3 to 90 seconds.' : 'Images or a video.'}>
              <MediaStrip media={form.media} onChange={setMedia} disabled={readOnly} max={form.kind === 'CAROUSEL' || form.kind === 'POST' ? 10 : form.kind === 'TEXT' ? 0 : 1} />
            </Card>

            <Card title="Link" description="Tracked with UTM tags per platform, so signups show in Analytics.">
              <Input value={form.link} disabled={readOnly} leftIcon={<Link2 className="h-4 w-4" />} placeholder="https://nafaa.pk/…" onChange={(e) => set('link', e.target.value)} />
              {form.link && form.platforms.length > 0 && (
                <ul className="mt-3 divide-y divide-slate-100 rounded-xl bg-slate-50 ring-1 ring-slate-200">
                  {form.platforms.map((p) => {
                    const l = linkFor(p);
                    return (
                      <li key={p} className="flex items-center gap-2 px-3 py-2">
                        <PlatformMark p={p} size={14} />
                        <code className="min-w-0 flex-1 truncate text-[0.75rem] text-slate-600" title={l}>{l || 'Not a valid address'}</code>
                        {l && <button type="button" onClick={async () => { if (await copyText(l)) toast.success('Link copied'); }} className="rounded p-1 text-slate-400 hover:bg-slate-200 hover:text-slate-700" aria-label="Copy link"><Copy className="h-3.5 w-3.5" /></button>}
                      </li>
                    );
                  })}
                </ul>
              )}
              {form.link && form.platforms.includes('INSTAGRAM') && <p className="mt-2 text-[0.75rem] text-slate-500">Instagram captions cannot hold a clickable link; the tracked link is used in the first comment or bio instead.</p>}
            </Card>

            <Card title="Schedule" description="Pakistan time.">
              <SchedulePicker value={form.scheduledAt} onChange={(v) => set('scheduledAt', v)} platforms={form.platforms} settings={settings} disabled={readOnly} />
              <Textarea wrapperClassName="mt-3" label="Notes for the team" rows={2} value={form.notes} disabled={readOnly} onChange={(e) => set('notes', e.target.value)} />
            </Card>
          </div>

          <div className="min-w-0 space-y-4 lg:sticky lg:top-4 lg:col-span-5">
            <Checks warnings={warnings} />
            {post && Object.keys(post.publishState ?? {}).length > 0 && (
              <PublishResults post={post} onRetry={(p) => simple.mutate({ kind: 'retry', platform: p })} retrying={simple.isPending} canPublish={can('social.publish')} handoff={handoffPlatforms} />
            )}
            <Card title="Preview" description="How it looks on each platform.">
              <PreviewPanel platforms={form.platforms} build={build} />
            </Card>
            {post && (
              <p className="px-1 text-[0.75rem] text-slate-500">
                Created {fmtDateTime(post.createdAt)}{post.createdBy ? ` by ${post.createdBy.name}` : post.createdByKey ? ` by ${post.createdByKey.name}` : ''}
                {post.approvedBy && <> · approved by {post.approvedBy.name}</>}
              </p>
            )}
          </div>
        </div>
      )}

      <PromptModal open={rejecting} onClose={() => setRejecting(false)} title="Reject this post" label="Reason (the writer sees it)" placeholder="e.g. Caption is too long for X; use the new product photo" confirmLabel="Reject" danger
        onSubmit={(reason) => simple.mutate({ kind: 'reject', reason })} />
    </PageShell>
  );
}

function Checks({ warnings }: { warnings: LocalWarning[] }) {
  if (!warnings.length) {
    return (
      <div className="flex items-center gap-2 rounded-2xl bg-success-50 px-4 py-3 text-[0.8125rem] font-medium text-success-800 ring-1 ring-success-200">
        <CheckCircle2 className="h-4 w-4" />All checks pass for the chosen platforms.
      </div>
    );
  }
  const errs = warnings.filter((w) => w.level === 'error').length;
  return (
    <Card title={<span className="flex items-center gap-2">Checks {errs > 0 && <Badge variant="danger" size="xs">{errs} to fix</Badge>}{warnings.length - errs > 0 && <Badge variant="warning" size="xs">{warnings.length - errs} advice</Badge>}</span>}>
      <ul className="space-y-1.5">
        {warnings.map((w, i) => (
          <li key={i} className={cn('flex items-start gap-2 rounded-lg px-2.5 py-1.5 text-[0.8125rem]', w.level === 'error' ? 'bg-rose-50 text-rose-800' : 'bg-amber-50 text-amber-900')}>
            {w.platform ? <PlatformMark p={w.platform} size={14} className="mt-0.5 shrink-0" /> : <AlertTriangle className="mt-0.5 h-3.5 w-3.5 shrink-0" />}
            <span>{w.message}</span>
          </li>
        ))}
      </ul>
    </Card>
  );
}

function PublishResults({ post, onRetry, retrying, canPublish, handoff }: { post: SocialPost; onRetry: (p: SocialPlatform) => void; retrying: boolean; canPublish: boolean; handoff: SocialPlatform[] }) {
  return (
    <Card title="Publishing" description={post.publishedAt ? `First live ${fmtDateTime(post.publishedAt)}` : undefined}
      actions={handoff.length > 0 && <Link to="/social/handoff" className="inline-flex items-center gap-1 text-[0.8125rem] font-semibold text-brand-700 hover:underline"><Hand className="h-3.5 w-3.5" />Post by hand</Link>}>
      <ul className="space-y-2">
        {post.platforms.map((p) => {
          const s = post.publishState?.[p];
          const m = post.metrics?.[p];
          return (
            <li key={p} className="rounded-xl bg-slate-50 px-3 py-2 ring-1 ring-slate-200">
              <div className="flex items-center gap-2">
                <PlatformMark p={p} size={16} />
                <span className="text-[0.8125rem] font-semibold text-slate-800">{PLATFORM[p].label}</span>
                <span className="ms-auto flex items-center gap-1.5">
                  <Badge size="xs" variant={s?.status === 'PUBLISHED' ? 'success' : s?.status === 'FAILED' ? 'danger' : s?.status === 'HANDOFF' ? 'warning' : 'info'}>
                    {s ? ({ PUBLISHING: 'Publishing', WAITING: 'Processing video', HANDOFF: 'Post by hand', PUBLISHED: s.manual ? 'Posted by hand' : 'Live', FAILED: s.willRetry ? 'Will retry' : 'Failed', SKIPPED: 'Skipped' }[s.status]) : 'Waiting'}
                  </Badge>
                  {s?.permalink && <a href={s.permalink} target="_blank" rel="noreferrer" className="rounded p-1 text-slate-500 hover:bg-slate-200" aria-label="Open post"><ExternalLink className="h-3.5 w-3.5" /></a>}
                  {s?.status === 'FAILED' && canPublish && PLATFORM[p].api && (
                    <Button size="xs" variant="secondary" loading={retrying} leftIcon={<RefreshCw className="h-3 w-3" />} onClick={() => onRetry(p)}>Retry</Button>
                  )}
                </span>
              </div>
              {s?.error && <p className={`mt-1 text-[0.75rem] ${s.status === 'FAILED' ? 'text-rose-700' : 'text-amber-700'}`}>{s.error}{s.attempts ? ` (try ${s.attempts})` : ''}{s.nextAt ? ` · next try ${fmtDateTime(s.nextAt)}` : ''}</p>}
              {s?.commentError && <p className="mt-1 text-[0.75rem] text-amber-700">First comment: {s.commentError}</p>}
              {m && (
                <p className="mt-1 flex flex-wrap gap-x-3 text-[0.75rem] tabular-nums text-slate-500">
                  <span>Reach <b className="text-slate-800">{m.reach.toLocaleString('en-PK')}</b></span>
                  <span>Engagement <b className="text-slate-800">{m.engagement.toLocaleString('en-PK')}</b></span>
                  <span>Clicks <b className="text-slate-800">{m.clicks.toLocaleString('en-PK')}</b></span>
                </p>
              )}
            </li>
          );
        })}
      </ul>
    </Card>
  );
}
