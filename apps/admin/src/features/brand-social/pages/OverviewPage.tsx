/**
 * Nafaa Social overview (/social): followers, this week's output, reach and
 * engagement, the next seven days of posts, what needs a person now
 * (approvals, failures, hand posting) and the health of every account.
 */

import { useMemo } from 'react';
import { Link } from 'react-router-dom';
import { useQuery } from '@tanstack/react-query';
import { AlertTriangle, ArrowRight, Bot, CalendarDays, CheckCircle2, Hand, Lightbulb, Plus, ShieldCheck, XCircle } from 'lucide-react';
import { Alert, Badge, Button, Card, EmptyState, PageHero, PageShell, Skeleton, heroButton, heroPrimaryButton } from '@/design-system/components';
import { PageGuide, usePageGuide } from '@core/components/PageGuide';
import { brandSocialApi, type SocialPost } from '@/api/admin-brand-social.api';
import { cn } from '@/lib/cn';
import { num } from '@/lib/format';
import { PLATFORM, PlatformMark, PlatformStack } from '../lib/platforms';
import { useSettings } from '../lib/queries';
import { fmtDateTime, fmtKeyShort, fmtTime, pkDayKey, pkToday, addDays, relative } from '../lib/time';
import { AccountAvatar, LoadError, PillarDot, PostStatusBadge, PostThumb } from '../components/SocialUi';

export default function OverviewPage() {
  const guide = usePageGuide();
  const q = useQuery({ queryKey: ['brand-social', 'overview'], queryFn: brandSocialApi.overview, refetchInterval: 60_000 });
  const pillars = useSettings().data?.pillars;
  const d = q.data;
  const today = pkToday();

  const days = useMemo(() => {
    const m = new Map<string, SocialPost[]>();
    for (let i = 0; i < 8; i++) m.set(addDays(today, i), []);
    for (const p of d?.queue ?? []) if (p.scheduledAt) { const k = pkDayKey(p.scheduledAt); if (m.has(k)) m.get(k)!.push(p); }
    for (const l of m.values()) l.sort((a, b) => a.scheduledAt!.localeCompare(b.scheduledAt!));
    return [...m.entries()];
  }, [d, today]);

  const needs = d ? d.needsYou.approvals.length + d.needsYou.failed.length + d.needsYou.handoff.length : 0;

  return (
    <PageShell>
      <PageHero
        title="Nafaa Social"
        chip="Nafaa's own accounts"
        busy={q.isFetching}
        loading={q.isLoading}
        actions={<>
          <button type="button" className={heroButton} onClick={guide.open} aria-label="How this page works (G)"><Lightbulb className="h-4 w-4" /></button>
          <Link to="/social/calendar" className={heroButton}><CalendarDays className="h-4 w-4" />Calendar</Link>
          <Link to="/social/posts/new" className={heroPrimaryButton}><Plus className="h-4 w-4" />New post</Link>
        </>}
        stats={d ? [
          { label: 'Followers', value: num(d.followers.total), hint: `${d.followers.byPlatform.filter((f) => f.followers != null).length} platforms` },
          { label: 'Posts this week', value: num(d.postsThisWeek) },
          { label: 'Reach, 7 days', value: num(d.reach7d) },
          { label: 'Engagement rate', value: `${(d.engagementRate7d ?? 0).toFixed(1)}%`, hint: 'Last 7 days' },
          { label: 'Waiting approval', value: num(d.pendingApprovals) },
          { label: 'Failed', value: num(d.failed) },
        ] : undefined}
      />

      {d?.paused && <Alert tone="danger" title="Publishing is paused" action={<Link to="/social/settings" className="text-[0.8125rem] font-semibold underline">Open settings</Link>}>Nothing goes out to any platform until it is switched back on.</Alert>}

      {q.error ? <LoadError error={q.error} onRetry={() => q.refetch()} what="the overview" /> : q.isLoading ? (
        <div className="grid gap-4 lg:grid-cols-3"><Skeleton className="h-96 rounded-2xl lg:col-span-2" /><Skeleton className="h-96 rounded-2xl" /></div>
      ) : d && (
        <>
          {/* Followers per platform */}
          <div className="grid grid-cols-2 gap-2.5 sm:grid-cols-3 xl:grid-cols-6">
            {d.followers.byPlatform.map((f) => (
              <div key={f.platform} className="flex items-center gap-3 rounded-2xl bg-white px-3.5 py-3 ring-1 ring-slate-200">
                <PlatformMark p={f.platform} size={28} />
                <div className="min-w-0">
                  <p className="text-[1.0625rem] font-bold tabular-nums text-slate-900">{f.followers == null ? '—' : num(f.followers)}</p>
                  <p className="truncate text-[0.75rem] text-slate-500">{PLATFORM[f.platform].label}</p>
                </div>
              </div>
            ))}
            {!d.followers.byPlatform.length && <p className="col-span-full text-[0.8125rem] text-slate-500">No follower numbers yet. They appear after accounts are connected and the daily sync runs.</p>}
          </div>

          <div className="grid items-start gap-4 lg:grid-cols-3">
            <Card flush className="lg:col-span-2" title="Today and the next 7 days" description="Pakistan time"
              actions={<Link to="/social/calendar?view=week" className="inline-flex items-center gap-1 text-[0.8125rem] font-semibold text-brand-700 hover:underline">Week view<ArrowRight className="h-3.5 w-3.5" /></Link>}>
              {!(d.queue ?? []).length ? (
                <EmptyState icon={<CalendarDays className="h-6 w-6" />} title="Nothing scheduled this week" description="Plan the week in the calendar, or import a content pack from Settings."
                  action={<Link to="/social/posts/new"><Button size="sm" leftIcon={<Plus className="h-4 w-4" />}>New post</Button></Link>} />
              ) : (
                <ul className="divide-y divide-slate-100">
                  {days.map(([k, list]) => (
                    <li key={k} className="flex gap-3 px-4 py-3">
                      <div className="w-20 shrink-0">
                        <p className={cn('text-[0.8125rem] font-semibold', k === today ? 'text-brand-700' : 'text-slate-900')}>{k === today ? 'Today' : k === addDays(today, 1) ? 'Tomorrow' : fmtKeyShort(k).split(' ')[0]}</p>
                        <p className="text-[0.75rem] text-slate-500">{fmtKeyShort(k).split(' ').slice(1).join(' ')}</p>
                      </div>
                      <div className="min-w-0 flex-1 space-y-1.5">
                        {!list.length ? (
                          <Link to={`/social/posts/new?date=${k}`} className="inline-flex items-center gap-1 text-[0.75rem] text-slate-400 hover:text-brand-700"><Plus className="h-3.5 w-3.5" />Nothing yet</Link>
                        ) : list.map((p) => (
                          <Link key={p.id} to={`/social/posts/${p.id}`} className="flex items-center gap-2.5 rounded-lg p-1 hover:bg-slate-50">
                            <span className="w-14 shrink-0 text-[0.75rem] font-semibold tabular-nums text-slate-700">{fmtTime(p.scheduledAt!)}</span>
                            <PostThumb media={p.media} kind={p.kind} size={32} />
                            <span className="min-w-0 flex-1">
                              <span className="flex items-center gap-1 truncate text-[0.8125rem] font-medium text-slate-900">{p.title}{p.aiMade && <Bot className="h-3.5 w-3.5 shrink-0 text-violet-500" />}</span>
                              <span className="flex items-center gap-2"><PlatformStack platforms={p.platforms} size={12} /><PillarDot pillar={p.pillar} pillars={pillars} withLabel /></span>
                            </span>
                            <PostStatusBadge status={p.status} post={p} size="xs" />
                          </Link>
                        ))}
                      </div>
                    </li>
                  ))}
                </ul>
              )}
            </Card>

            <Card flush title={<span className="flex items-center gap-2">Needs you {needs > 0 && <Badge size="xs" variant="danger">{needs}</Badge>}</span>}>
              {!needs ? (
                <EmptyState icon={<CheckCircle2 className="h-6 w-6 text-success-600" />} title="Nothing waiting" description="Approvals, failures and hand posting show up here." />
              ) : (
                <div className="divide-y divide-slate-100">
                  <NeedsGroup icon={ShieldCheck} tone="text-amber-600" title="Waiting approval" to="/social/approvals" posts={d.needsYou.approvals} total={d.pendingApprovals} />
                  <NeedsGroup icon={XCircle} tone="text-rose-600" title="Failed" to="/social/calendar?view=list" posts={d.needsYou.failed} total={d.failed} detail={(p) => Object.values(p.publishState ?? {}).find((s) => s?.status === 'FAILED')?.error ?? undefined} />
                  <NeedsGroup icon={Hand} tone="text-sky-600" title="To post by hand" to="/social/handoff" posts={d.needsYou.handoff} total={d.handoffDue} />
                </div>
              )}
            </Card>
          </div>

          <Card title="Accounts" actions={<Link to="/social/accounts" className="inline-flex items-center gap-1 text-[0.8125rem] font-semibold text-brand-700 hover:underline">Manage<ArrowRight className="h-3.5 w-3.5" /></Link>}>
            {!d.accounts.length ? (
              <p className="text-[0.8125rem] text-slate-500">No accounts yet. <Link to="/social/accounts" className="font-semibold text-brand-700 underline">Connect Facebook & Instagram</Link> and add the others.</p>
            ) : (
              <div className="flex flex-wrap gap-2">
                {d.accounts.filter((a) => a.status !== 'DISCONNECTED').map((a) => {
                  const bad = a.status === 'NEEDS_RECONNECT' || a.tokenHealth === 'expired';
                  const warn = a.tokenHealth === 'expiring' || !!a.lastError;
                  return (
                    <Link key={a.id} to="/social/accounts" title={a.lastError ?? undefined}
                      className={cn('flex items-center gap-2 rounded-xl py-1.5 pe-3 ps-1.5 ring-1', bad ? 'bg-rose-50 ring-rose-200' : warn ? 'bg-amber-50 ring-amber-200' : 'bg-white ring-slate-200 hover:ring-slate-300')}>
                      <AccountAvatar account={a} platform={a.platform} size={30} />
                      <span className="leading-tight">
                        <span className="block text-[0.8125rem] font-semibold text-slate-900">{PLATFORM[a.platform].label}</span>
                        <span className={cn('flex items-center gap-1 text-[0.6875rem]', bad ? 'text-rose-700' : warn ? 'text-amber-800' : 'text-slate-500')}>
                          {bad ? <><AlertTriangle className="h-3 w-3" />Reconnect</> : warn ? <><AlertTriangle className="h-3 w-3" />{a.lastError ? 'Check' : 'Token expiring'}</> : a.status === 'MANUAL' || !a.autoPublish ? 'By hand' : 'Auto-publish'}
                        </span>
                      </span>
                    </Link>
                  );
                })}
              </div>
            )}
          </Card>
        </>
      )}

      {guide.isOpen && (
        <PageGuide
          title="Nafaa Social"
          description="Plan, approve, publish and measure Nafaa's own social media in one place."
          flowTitle="How a post moves"
          flow={[
            { label: 'Draft', hint: 'Composer or content pack', icon: Plus, color: '#64748b' },
            { label: 'Review', hint: 'Approvals queue', icon: ShieldCheck, color: '#d97706' },
            { label: 'Scheduled', hint: 'Calendar', icon: CalendarDays, color: '#4f46e5' },
            { label: 'Live', hint: 'Auto or by hand', icon: CheckCircle2, color: '#16a34a' },
          ]}
          steps={[
            { icon: CalendarDays, color: '#4f46e5', title: 'Plan in the calendar', text: 'Drag posts between days. "+" on a day starts a new post for it.' },
            { icon: ShieldCheck, color: '#d97706', title: 'Approve', text: 'Every draft waits in Approvals. Press A to approve and R to reject with a reason.' },
            { icon: Hand, color: '#0284c7', title: 'Post by hand', text: 'TikTok, YouTube, X, LinkedIn, Pinterest and Threads posts land in "To post by hand" when due.' },
            { icon: XCircle, color: '#e11d48', title: 'Fix failures', text: 'A failed post shows the reason in plain words. Open it and press Retry.' },
          ]}
          tips={['Facebook and Instagram publish on their own once approved.', 'Pause all publishing from Settings if anything looks wrong.']}
          shortcuts={[['G', 'This guide']]}
          onClose={guide.close}
        />
      )}
    </PageShell>
  );
}

function NeedsGroup({ icon: Icon, tone, title, to, posts, total, detail }: {
  icon: typeof ShieldCheck; tone: string; title: string; to: string; posts: SocialPost[]; total: number; detail?: (p: SocialPost) => string | undefined;
}) {
  if (!total && !posts.length) return null;
  return (
    <div className="px-4 py-3">
      <Link to={to} className="mb-1.5 flex items-center gap-2 text-[0.8125rem] font-semibold text-slate-900 hover:text-brand-700">
        <Icon className={cn('h-4 w-4', tone)} />{title}<span className="ms-auto rounded-full bg-slate-100 px-2 text-[0.75rem] tabular-nums text-slate-600">{total || posts.length}</span>
      </Link>
      <ul className="space-y-1">
        {posts.slice(0, 4).map((p) => (
          <li key={p.id}>
            <Link to={to === '/social/handoff' || to === '/social/approvals' ? to : `/social/posts/${p.id}`} className="flex items-center gap-2 rounded-lg p-1 hover:bg-slate-50">
              <PostThumb media={p.media} kind={p.kind} size={28} />
              <span className="min-w-0 flex-1">
                <span className="block truncate text-[0.75rem] font-medium text-slate-800">{p.title}</span>
                <span className="block truncate text-[0.6875rem] text-slate-500">{detail?.(p) ?? (p.scheduledAt ? `${fmtDateTime(p.scheduledAt)} · ${relative(p.scheduledAt)}` : 'No time')}</span>
              </span>
            </Link>
          </li>
        ))}
      </ul>
    </div>
  );
}
