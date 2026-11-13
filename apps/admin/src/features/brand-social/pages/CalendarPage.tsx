/**
 * Calendar (/social/calendar): month, week and list views of every post in
 * Pakistan time. Drag a post to another day (month) or hour (week) to
 * reschedule it; drag an idea from the "Not scheduled" tray onto a day to
 * give it a time. "+" on a day opens the composer for that day.
 * Keys: ← → move, T today, M / W / L view, N new post.
 */

import { useEffect, useMemo, useRef, useState, type DragEvent } from 'react';
import { Link, useNavigate, useSearchParams } from 'react-router-dom';
import { useMutation, useQueryClient } from '@tanstack/react-query';
import { toast } from 'sonner';
import { Bot, CalendarDays, CalendarRange, ChevronLeft, ChevronRight, Inbox, List, Plus } from 'lucide-react';
import { Button, Card, EmptyState, FilterBar, PageHero, PageShell, Segmented, Skeleton, heroPrimaryButton } from '@/design-system/components';
import { isDialogOpen, isTyping } from '@core/lib/shortcuts';
import { brandSocialApi, type PostListResponse, type SocialPost } from '@/api/admin-brand-social.api';
import { cn } from '@/lib/cn';
import { apiError } from '@/lib/errors';
import { KEYS, usePosts, useSettings } from '../lib/queries';
import {
  addDays, addMonths, endOfMonth, fmtDateTime, fmtKeyDay, fmtKeyShort, fmtMonth, fmtTime, pkDayKey, pkTime, pkToIso, pkToday, startOfMonth, startOfWeek,
} from '../lib/time';
import { DRAG_TYPE, PostChip, canMove } from '../components/PostChip';
import { NO_FILTERS, PostFilters, filterParams, type PostFilterValue } from '../components/PostFilters';
import { LoadError, PostStatusBadge, PostThumb, PillarDot, PublishChips } from '../components/SocialUi';
import { PlatformStack } from '../lib/platforms';

type View = 'month' | 'week' | 'list';
const WEEKDAYS = ['Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat', 'Sun'];
const HOURS = Array.from({ length: 24 }, (_, h) => h);
const hourLabel = (h: number) => (h === 0 ? '12 am' : h < 12 ? `${h} am` : h === 12 ? '12 pm' : `${h - 12} pm`);
const pad = (n: number) => String(n).padStart(2, '0');

export default function CalendarPage() {
  const [sp, setSp] = useSearchParams();
  const navigate = useNavigate();
  const qc = useQueryClient();
  const today = pkToday();
  const view = (['month', 'week', 'list'].includes(sp.get('view') ?? '') ? sp.get('view') : 'month') as View;
  const anchor = /^\d{4}-\d{2}-\d{2}$/.test(sp.get('d') ?? '') ? sp.get('d')! : today;
  const [filters, setFilters] = useState<PostFilterValue>(NO_FILTERS);
  const settings = useSettings().data;
  const pillars = settings?.pillars;
  const [dragging, setDragging] = useState<SocialPost | null>(null);
  const [overKey, setOverKey] = useState<string | null>(null);
  const [expanded, setExpanded] = useState<string | null>(null);

  const setView = (v: View) => setSp((p) => { p.set('view', v); return p; }, { replace: true });
  const setAnchor = (d: string) => setSp((p) => { p.set('d', d); return p; }, { replace: true });

  const range = useMemo(() => {
    if (view === 'week') { const s = startOfWeek(anchor); return { from: s, to: addDays(s, 6) }; }
    if (view === 'list') return { from: startOfMonth(anchor), to: endOfMonth(anchor) };
    const s = startOfWeek(startOfMonth(anchor));
    return { from: s, to: addDays(s, 41) };
  }, [view, anchor]);

  const listFilters = { ...range, ...filterParams(filters) };
  const trayFilters = { ...filterParams(filters), unscheduled: '1' as const, status: filters.status !== 'ALL' ? filters.status : 'IDEA,DRAFT,IN_REVIEW,APPROVED' };
  const postsQ = usePosts(listFilters);
  const trayQ = usePosts(trayFilters);
  const posts = useMemo(() => (postsQ.data?.posts ?? []).filter((p) => p.scheduledAt && p.status !== 'ARCHIVED'), [postsQ.data]);
  const tray = trayQ.data?.posts ?? [];

  const byDay = useMemo(() => {
    const m = new Map<string, SocialPost[]>();
    for (const p of posts) {
      const k = pkDayKey(p.scheduledAt!);
      m.set(k, [...(m.get(k) ?? []), p]);
    }
    for (const list of m.values()) list.sort((a, b) => a.scheduledAt!.localeCompare(b.scheduledAt!));
    return m;
  }, [posts]);

  const step = (dir: 1 | -1) => setAnchor(view === 'week' ? addDays(anchor, 7 * dir) : addMonths(anchor, dir));

  // Keyboard shortcuts.
  useEffect(() => {
    const h = (e: KeyboardEvent) => {
      if (e.metaKey || e.ctrlKey || e.altKey || isTyping() || isDialogOpen()) return;
      const k = e.key.toLowerCase();
      if (e.key === 'ArrowLeft') step(-1);
      else if (e.key === 'ArrowRight') step(1);
      else if (k === 't') setAnchor(today);
      else if (k === 'm') setView('month');
      else if (k === 'w') setView('week');
      else if (k === 'l') setView('list');
      else if (k === 'n') navigate('/social/posts/new');
      else return;
      e.preventDefault();
    };
    window.addEventListener('keydown', h);
    return () => window.removeEventListener('keydown', h);
  });

  // ─── Reschedule by drag ──────────────────────────────────────────────
  const move = useMutation({
    mutationFn: (v: { post: SocialPost; to: string | null; undo?: boolean }) => brandSocialApi.schedule(v.post.id, v.to),
    onMutate: (v) => {
      const key = KEYS.posts(listFilters);
      const prev = qc.getQueryData<PostListResponse>(key);
      if (prev) {
        const exists = prev.posts.some((p) => p.id === v.post.id);
        const posts = exists ? prev.posts.map((p) => (p.id === v.post.id ? { ...p, scheduledAt: v.to } : p)) : [...prev.posts, { ...v.post, scheduledAt: v.to }];
        qc.setQueryData(key, { ...prev, posts });
      }
      const trayKey = KEYS.posts(trayFilters);
      const prevTray = qc.getQueryData<PostListResponse>(trayKey);
      if (prevTray && v.to) qc.setQueryData(trayKey, { ...prevTray, posts: prevTray.posts.filter((p) => p.id !== v.post.id) });
    },
    onSuccess: (res, v) => {
      if (v.undo) { toast.success('Moved back'); return; }
      toast.success(res.scheduledAt ? `Moved to ${fmtDateTime(res.scheduledAt)}` : 'Time removed', {
        description: res.status !== v.post.status ? `Status is now ${res.status.replace('_', ' ').toLowerCase()}.` : undefined,
        action: { label: 'Undo', onClick: () => move.mutate({ post: res, to: v.post.scheduledAt, undo: true }) },
      });
    },
    onError: (e) => toast.error(apiError(e, 'Could not move the post.')),
    onSettled: () => qc.invalidateQueries({ queryKey: KEYS.all }),
  });

  const findPost = (id: string) => posts.find((p) => p.id === id) ?? tray.find((p) => p.id === id) ?? null;

  const dropProps = (key: string, hour?: number) => ({
    onDragOver: (e: DragEvent) => {
      if (!e.dataTransfer.types.includes(DRAG_TYPE)) return;
      e.preventDefault();
      e.dataTransfer.dropEffect = 'move';
      const k = hour == null ? key : `${key}T${hour}`;
      if (overKey !== k) setOverKey(k);
    },
    onDragLeave: (e: DragEvent) => { if (!e.currentTarget.contains(e.relatedTarget as Node)) setOverKey(null); },
    onDrop: (e: DragEvent) => {
      const id = e.dataTransfer.getData(DRAG_TYPE);
      setOverKey(null);
      setDragging(null);
      if (!id) return;
      e.preventDefault();
      const post = findPost(id);
      if (!post || !canMove(post)) return;
      const keepTime = post.scheduledAt ? pkTime(post.scheduledAt) : (settings?.bestTimes?.[post.platforms[0]]?.[0] ?? '10:00');
      const time = hour == null ? keepTime : `${pad(hour)}:${post.scheduledAt ? keepTime.slice(3) : '00'}`;
      const iso = pkToIso(key, time);
      if (post.scheduledAt && iso === new Date(post.scheduledAt).toISOString()) return;
      if (new Date(iso).getTime() < Date.now() - 60_000) { toast.error('That time has passed. Pick a later slot.'); return; }
      move.mutate({ post, to: iso });
    },
  });

  const counts = useMemo(() => {
    const inRange = posts.filter((p) => { const k = pkDayKey(p.scheduledAt!); return k >= (view === 'month' ? startOfMonth(anchor) : range.from) && k <= (view === 'month' ? endOfMonth(anchor) : range.to); });
    const c = (s: string[]) => inRange.filter((p) => s.includes(p.status)).length;
    return { total: inRange.length, scheduled: c(['SCHEDULED', 'APPROVED']), review: c(['IN_REVIEW']), published: c(['PUBLISHED', 'PARTIAL']), failed: c(['FAILED']) };
  }, [posts, range, view, anchor]);

  const title = view === 'week' ? `${fmtKeyDay(range.from)} – ${fmtKeyDay(range.to)} ${range.to.slice(0, 4)}` : fmtMonth(anchor);
  const loading = postsQ.isLoading;
  const dragProps = { onDragStart: (p: SocialPost) => setDragging(p), onDragEnd: () => { setDragging(null); setOverKey(null); } };

  return (
    <PageShell>
      <PageHero
        title="Calendar"
        chip={<><CalendarDays />{title}</>}
        busy={postsQ.isFetching || move.isPending}
        loading={loading}
        actions={<Link to="/social/posts/new" className={heroPrimaryButton}><Plus className="h-4 w-4" />New post</Link>}
        stats={[
          { label: 'Posts', value: counts.total, hint: view === 'week' ? 'This week' : 'This month' },
          { label: 'Scheduled', value: counts.scheduled },
          { label: 'In review', value: counts.review },
          { label: 'Published', value: counts.published },
          { label: 'Failed', value: counts.failed },
        ]}
      />

      <FilterBar>
        <div className="flex items-center gap-1">
          <Button size="sm" variant="secondary" onClick={() => step(-1)} aria-label="Previous"><ChevronLeft className="h-4 w-4" /></Button>
          <Button size="sm" variant="secondary" onClick={() => setAnchor(today)}>Today</Button>
          <Button size="sm" variant="secondary" onClick={() => step(1)} aria-label="Next"><ChevronRight className="h-4 w-4" /></Button>
        </div>
        <Segmented value={view} onChange={setView} label="View" items={[
          { value: 'month', label: <><CalendarDays className="h-4 w-4" />Month</> },
          { value: 'week', label: <><CalendarRange className="h-4 w-4" />Week</> },
          { value: 'list', label: <><List className="h-4 w-4" />List</> },
        ]} />
        <PostFilters value={filters} onChange={setFilters} settings={settings} />
      </FilterBar>

      {postsQ.error ? <LoadError error={postsQ.error} onRetry={() => postsQ.refetch()} what="the calendar" /> : (
        <div className="grid items-start gap-4 xl:grid-cols-[minmax(0,1fr)_16rem]">
          <div className="min-w-0">
            {loading ? <Skeleton className="h-[40rem] w-full rounded-2xl" />
              : view === 'month' ? (
                <MonthGrid
                  from={range.from} anchor={anchor} today={today} byDay={byDay} pillars={pillars} dragging={dragging} overKey={overKey} expanded={expanded}
                  setExpanded={setExpanded} dropProps={dropProps} dragProps={dragProps}
                />
              ) : view === 'week' ? (
                <WeekGrid from={range.from} today={today} byDay={byDay} pillars={pillars} dragging={dragging} overKey={overKey} dropProps={dropProps} dragProps={dragProps} />
              ) : (
                <ListView posts={posts} pillars={pillars} />
              )}
          </div>
          <Tray posts={tray} loading={trayQ.isLoading} pillars={pillars} dragging={dragging} dragProps={dragProps} />
        </div>
      )}
      <p className="px-1 text-[0.75rem] text-slate-500">All times are Pakistan time. Keys: ← → move, T today, M W L switch view, N new post.</p>
    </PageShell>
  );
}

type DropProps = (key: string, hour?: number) => {
  onDragOver: (e: DragEvent) => void; onDragLeave: (e: DragEvent) => void; onDrop: (e: DragEvent) => void;
};
type DragProps = { onDragStart: (p: SocialPost) => void; onDragEnd: () => void };

function MonthGrid({ from, anchor, today, byDay, pillars, dragging, overKey, expanded, setExpanded, dropProps, dragProps }: {
  from: string; anchor: string; today: string; byDay: Map<string, SocialPost[]>; pillars: Parameters<typeof PostChip>[0]['pillars'];
  dragging: SocialPost | null; overKey: string | null; expanded: string | null; setExpanded: (k: string | null) => void; dropProps: DropProps; dragProps: DragProps;
}) {
  const days = Array.from({ length: 42 }, (_, i) => addDays(from, i));
  const month = anchor.slice(0, 7);
  return (
    <div className="overflow-hidden rounded-2xl bg-white ring-1 ring-slate-200">
      <div className="grid grid-cols-7 border-b border-slate-200 bg-slate-50">
        {WEEKDAYS.map((d) => <div key={d} className="px-2 py-2 text-[0.6875rem] font-semibold uppercase tracking-wide text-slate-500">{d}</div>)}
      </div>
      <div className="grid grid-cols-7">
        {days.map((k, i) => {
          const list = byDay.get(k) ?? [];
          const out = k.slice(0, 7) !== month;
          const past = k < today;
          const open = expanded === k;
          const shown = open ? list : list.slice(0, 3);
          return (
            <div key={k} {...dropProps(k)}
              className={cn('group relative min-h-[8.5rem] border-slate-100 p-1.5 transition-colors', i % 7 !== 6 && 'border-e', i < 35 && 'border-b',
                out && 'bg-slate-50/70', i % 7 >= 5 && !out && 'bg-slate-50/40',
                overKey === k && dragging && (past ? 'bg-rose-50' : 'bg-brand-50 ring-2 ring-inset ring-brand-400'))}>
              <div className="mb-1 flex items-center justify-between">
                <span className={cn('flex h-6 min-w-6 items-center justify-center rounded-full px-1 text-[0.75rem] font-semibold tabular-nums',
                  k === today ? 'bg-brand-600 text-white' : out ? 'text-slate-400' : 'text-slate-700')}>{Number(k.slice(8))}</span>
                {!past && (
                  <Link to={`/social/posts/new?date=${k}`} aria-label={`New post on ${fmtKeyShort(k)}`}
                    className="flex h-6 w-6 items-center justify-center rounded-md text-slate-400 opacity-0 transition hover:bg-brand-50 hover:text-brand-700 focus:opacity-100 group-hover:opacity-100">
                    <Plus className="h-4 w-4" />
                  </Link>
                )}
              </div>
              <div className="space-y-1">
                {shown.map((p) => <PostChip key={p.id} post={p} pillars={pillars} compact dragging={dragging?.id === p.id} {...dragProps} />)}
                {list.length > 3 && (
                  <button type="button" onClick={() => setExpanded(open ? null : k)} className="w-full rounded px-1 py-0.5 text-start text-[0.6875rem] font-semibold text-brand-700 hover:bg-brand-50">
                    {open ? 'Show less' : `+${list.length - 3} more`}
                  </button>
                )}
              </div>
            </div>
          );
        })}
      </div>
    </div>
  );
}

function WeekGrid({ from, today, byDay, pillars, dragging, overKey, dropProps, dragProps }: {
  from: string; today: string; byDay: Map<string, SocialPost[]>; pillars: Parameters<typeof PostChip>[0]['pillars'];
  dragging: SocialPost | null; overKey: string | null; dropProps: DropProps; dragProps: DragProps;
}) {
  const days = Array.from({ length: 7 }, (_, i) => addDays(from, i));
  const scroller = useRef<HTMLDivElement>(null);
  useEffect(() => { if (scroller.current) scroller.current.scrollTop = 7 * 56; }, [from]);
  const nowKey = pkDayKey(new Date());
  const nowH = Number(pkTime(new Date()).slice(0, 2));
  const nowM = Number(pkTime(new Date()).slice(3));
  return (
    <div className="overflow-hidden rounded-2xl bg-white ring-1 ring-slate-200">
      <div className="overflow-x-auto">
        <div className="min-w-[52rem]">
          <div className="grid grid-cols-[3.5rem_repeat(7,minmax(0,1fr))] border-b border-slate-200 bg-slate-50">
            <div />
            {days.map((k, i) => (
              <div key={k} className="border-s border-slate-100 px-2 py-2">
                <p className="text-[0.6875rem] font-semibold uppercase tracking-wide text-slate-500">{WEEKDAYS[i]}</p>
                <p className={cn('flex items-center gap-1.5 text-[0.9375rem] font-bold tabular-nums', k === today ? 'text-brand-700' : 'text-slate-900')}>
                  {Number(k.slice(8))}
                  {!!byDay.get(k)?.length && <span className="rounded-full bg-slate-200 px-1.5 text-[0.625rem] font-semibold text-slate-600">{byDay.get(k)!.length}</span>}
                </p>
              </div>
            ))}
          </div>
          <div ref={scroller} className="max-h-[42rem] overflow-y-auto">
            {HOURS.map((h) => (
              <div key={h} className="grid grid-cols-[3.5rem_repeat(7,minmax(0,1fr))]">
                <div className="h-14 border-b border-slate-100 pe-2 pt-1 text-end text-[0.625rem] font-medium leading-none text-slate-400">{hourLabel(h)}</div>
                {days.map((k) => {
                  const list = (byDay.get(k) ?? []).filter((p) => Number(pkTime(p.scheduledAt!).slice(0, 2)) === h);
                  const past = k < today || (k === today && h < nowH);
                  const cellKey = `${k}T${h}`;
                  return (
                    <div key={k} {...dropProps(k, h)}
                      className={cn('group relative min-h-14 border-b border-s border-slate-100 p-0.5 transition-colors', past && 'bg-slate-50/60',
                        overKey === cellKey && dragging && (past ? 'bg-rose-50' : 'bg-brand-50 ring-2 ring-inset ring-brand-400'))}>
                      {k === nowKey && h === nowH && <span className="pointer-events-none absolute inset-x-0 z-10 h-0.5 bg-rose-500" style={{ top: `${(nowM / 60) * 100}%` }} />}
                      <div className="space-y-0.5">
                        {list.map((p) => <PostChip key={p.id} post={p} pillars={pillars} compact dragging={dragging?.id === p.id} {...dragProps} />)}
                      </div>
                      {!past && !list.length && (
                        <Link to={`/social/posts/new?date=${k}&time=${pad(h)}:00`} aria-label={`New post ${fmtKeyShort(k)} ${hourLabel(h)}`}
                          className="absolute inset-0.5 flex items-center justify-center rounded-md text-slate-400 opacity-0 transition hover:bg-brand-50 hover:text-brand-700 group-hover:opacity-100">
                          <Plus className="h-4 w-4" />
                        </Link>
                      )}
                    </div>
                  );
                })}
              </div>
            ))}
          </div>
        </div>
      </div>
    </div>
  );
}

function ListView({ posts, pillars }: { posts: SocialPost[]; pillars: Parameters<typeof PostChip>[0]['pillars'] }) {
  const groups = useMemo(() => {
    const m = new Map<string, SocialPost[]>();
    for (const p of [...posts].sort((a, b) => a.scheduledAt!.localeCompare(b.scheduledAt!))) {
      const k = pkDayKey(p.scheduledAt!);
      m.set(k, [...(m.get(k) ?? []), p]);
    }
    return [...m.entries()];
  }, [posts]);
  if (!groups.length) {
    return <Card><EmptyState icon={<CalendarDays className="h-6 w-6" />} title="Nothing scheduled this month" description="Make a post, or import a content pack from Settings." action={<Link to="/social/posts/new"><Button size="sm" leftIcon={<Plus className="h-4 w-4" />}>New post</Button></Link>} /></Card>;
  }
  return (
    <div className="space-y-3">
      {groups.map(([day, list]) => (
        <Card key={day} flush title={fmtKeyShort(day)} description={`${list.length} post${list.length === 1 ? '' : 's'}`}>
          <ul className="divide-y divide-slate-100">
            {list.map((p) => (
              <li key={p.id}>
                <Link to={`/social/posts/${p.id}`} className="flex items-center gap-3 px-4 py-2.5 hover:bg-slate-50">
                  <span className="w-16 shrink-0 text-[0.8125rem] font-semibold tabular-nums text-slate-900">{fmtTime(p.scheduledAt!)}</span>
                  <PostThumb media={p.media} kind={p.kind} size={40} />
                  <span className="min-w-0 flex-1">
                    <span className="flex items-center gap-1.5 truncate text-[0.875rem] font-medium text-slate-900">
                      {p.title}{p.aiMade && <Bot className="h-3.5 w-3.5 shrink-0 text-violet-500" aria-label="AI marketer" />}
                    </span>
                    <span className="mt-0.5 flex items-center gap-2"><PillarDot pillar={p.pillar} pillars={pillars} withLabel />{['PUBLISHED', 'PARTIAL', 'FAILED', 'PUBLISHING'].includes(p.status) ? <PublishChips post={p} /> : <PlatformStack platforms={p.platforms} size={14} />}</span>
                  </span>
                  <PostStatusBadge status={p.status} size="xs" />
                </Link>
              </li>
            ))}
          </ul>
        </Card>
      ))}
    </div>
  );
}

function Tray({ posts, loading, pillars, dragging, dragProps }: { posts: SocialPost[]; loading: boolean; pillars: Parameters<typeof PostChip>[0]['pillars']; dragging: SocialPost | null; dragProps: DragProps }) {
  return (
    <Card title={<span className="flex items-center gap-1.5"><Inbox className="h-4 w-4 text-slate-500" />Not scheduled</span>} description="Drag onto a day to give it a time.">
      {loading ? <div className="space-y-1.5">{[1, 2, 3].map((i) => <Skeleton key={i} className="h-12 rounded-lg" />)}</div>
        : !posts.length ? <p className="py-4 text-center text-[0.8125rem] text-slate-500">Every post has a time. New ideas land here.</p>
          : (
            <div className="max-h-[36rem] space-y-1.5 overflow-y-auto">
              {posts.map((p) => <PostChip key={p.id} post={p} pillars={pillars} showTime={false} dragging={dragging?.id === p.id} {...dragProps} />)}
            </div>
          )}
    </Card>
  );
}
