/**
 * Social media studio (/online-store/social): content calendar, "Post
 * karein" reminders, Nafaa AI content, the creative maker and social
 * analytics. Posting is by hand from the reminder sheet, or by Nafaa itself
 * on a connected Facebook page / Instagram account (auto-post); the inbox
 * and comment replies live at /online-store/inbox for connected shops.
 *
 * `?post=<id>` (from a reminder) opens that post's "Post karein" sheet.
 * Keys: N new post · G guide.
 */

import { useEffect, useMemo, useState } from 'react';
import { Link, useSearchParams } from 'react-router-dom';
import { useQuery } from '@tanstack/react-query';
import {
  Bell, CalendarDays, ChevronLeft, ChevronRight, GraduationCap, ImagePlus, Inbox, Lightbulb, MessageCircle, Plus, Rocket, Send, Share2, Sparkles, TrendingUp,
} from 'lucide-react';
import { Button, PageHero, PageShell, Segmented, Skeleton, ViewTabs, heroButton, heroIconButton, heroPrimaryButton } from '@/design-system/components';
import { PageGuide, usePageGuide } from '@core/components/PageGuide';
import { isDialogOpen, isTyping } from '@core/lib/shortcuts';
import { t } from '@core/i18n';
import { socialApi, type SocialPost } from './social.api';
import { PlatformMark, addDaysKey, dayKey, whenLabel } from './platforms';
import { CalendarView, monthGrid, weekDays } from './CalendarView';
import { PostEditor, type EditorSeed } from './PostEditor';
import { PostNowSheet } from './PostNowSheet';
import { AiStudio } from './AiStudio';
import { CreativeMaker } from './CreativeMaker';
import { SocialAnalytics } from './SocialAnalytics';
import { useAutoPostLive } from './MetaPublish';

type Tab = 'calendar' | 'ai' | 'creative' | 'analytics';

export default function SocialPage() {
  const guide = usePageGuide();
  const [params, setParams] = useSearchParams();
  const [tab, setTab] = useState<Tab>('calendar');
  const [view, setView] = useState<'month' | 'week'>('month');
  const [anchor, setAnchor] = useState(() => dayKey(new Date()));
  const [editing, setEditing] = useState<{ post: SocialPost | null; seed?: EditorSeed } | null>(null);
  const [posting, setPosting] = useState<SocialPost | null>(null);

  const days = useMemo(() => (view === 'month' ? monthGrid(anchor) : weekDays(anchor)), [view, anchor]);
  const from = days[0];
  const to = days[days.length - 1];
  const q = useQuery({ queryKey: ['social', 'posts', from, to], queryFn: () => socialApi.list({ from, to }), placeholderData: (p) => p });
  const due = useQuery({ queryKey: ['social', 'due'], queryFn: socialApi.due, refetchInterval: 60_000 });
  const d = q.data;
  const today = d?.today ?? dayKey(new Date());

  // A reminder link opens the post's sheet.
  const linked = params.get('post');
  useEffect(() => {
    if (!linked) return;
    socialApi.get(linked).then(setPosting).catch(() => undefined).finally(() => { params.delete('post'); setParams(params, { replace: true }); });
  }, [linked]); // eslint-disable-line react-hooks/exhaustive-deps

  useEffect(() => {
    const onKey = (e: KeyboardEvent) => {
      if (e.metaKey || e.ctrlKey || e.altKey || isTyping() || isDialogOpen()) return;
      if (e.key === 'n' || e.key === 'N') { e.preventDefault(); setEditing({ post: null }); }
    };
    window.addEventListener('keydown', onKey);
    return () => window.removeEventListener('keydown', onKey);
  }, []);

  const move = (n: number) => {
    if (view === 'week') { setAnchor((a) => addDaysKey(a, n * 7)); return; }
    const dt = new Date(`${anchor.slice(0, 7)}-01T12:00:00`);
    dt.setMonth(dt.getMonth() + n);
    setAnchor(dayKey(dt));
  };
  const title = view === 'month'
    ? new Date(`${anchor.slice(0, 7)}-01T12:00:00`).toLocaleDateString('en-PK', { month: 'long', year: 'numeric' })
    : `${new Date(`${from}T12:00:00`).toLocaleDateString('en-PK', { day: 'numeric', month: 'short' })} – ${new Date(`${to}T12:00:00`).toLocaleDateString('en-PK', { day: 'numeric', month: 'short' })}`;
  const s = d?.stats;
  const dueNow = (due.data?.items ?? []).filter((p) => p.scheduledAt && new Date(p.scheduledAt).getTime() <= Date.now() + 60 * 60_000);

  return (
    <PageShell>
      <PageHero
        title={t('Social media')}
        chip={<><Share2 />{t('Facebook · Instagram · TikTok · YouTube · WhatsApp')}</>}
        meta={t('Posts ka calendar, waqt par yaad, Nafaa AI se caption aur design')}
        busy={q.isFetching && !q.isLoading}
        loading={q.isLoading}
        actions={<>
          <button type="button" onClick={() => setEditing({ post: null })} title={t('Nayi post (N)')} className={heroPrimaryButton}>
            <Plus className="h-4 w-4" /> <span className="hidden sm:inline">{t('Nayi post')}</span>
          </button>
          <button type="button" onClick={() => setTab('ai')} className={heroButton}><Sparkles className="h-4 w-4" /> <span className="hidden sm:inline">{t('Nafaa AI')}</span></button>
          <button type="button" onClick={guide.open} title={t('Guide (G)')} className={heroIconButton}><GraduationCap className="h-4 w-4" /></button>
        </>}
        stats={s ? [
          { label: t('Is hafte'), value: String(s.thisWeek), hint: t('{{count}} posted', { count: s.postedWeek }) },
          { label: t('Ready'), value: String(s.ready), hint: t('aage ke liye') },
          { label: t('Reh gayi'), value: String(s.overdue), hint: t('waqt guzar gaya') },
          { label: t('Ideas'), value: String(s.ideas) },
        ] : [{ label: t('Is hafte'), value: '' }, { label: t('Ready'), value: '' }, { label: t('Reh gayi'), value: '' }, { label: t('Ideas'), value: '' }]}
      />

      {dueNow.length > 0 && (
        <section className="rounded-2xl bg-sky-50 p-3 ring-1 ring-sky-200">
          <p className="mb-2 flex items-center gap-2 text-[0.8125rem] font-semibold text-sky-900"><Bell className="h-4 w-4" />{t('Ye posts abhi karni hain')}</p>
          <ul className="space-y-1.5">
            {dueNow.slice(0, 5).map((p) => (
              <li key={p.id} className="flex flex-wrap items-center gap-2 rounded-xl bg-white px-3 py-2 ring-1 ring-sky-100">
                <span className="flex -space-x-1">{p.platforms.map((pl) => <PlatformMark key={pl} p={pl} size={18} />)}</span>
                <span className="min-w-0 flex-1 truncate text-[0.8125rem] font-medium text-slate-900">{p.title || p.caption.split('\n')[0] || t('Post')}</span>
                <span className="text-[0.75rem] text-slate-500">{whenLabel(p.scheduledAt)}</span>
                <Button size="xs" variant="success" onClick={() => setPosting(p)} leftIcon={<Send className="h-3.5 w-3.5" />}>{t('Post karein')}</Button>
              </li>
            ))}
          </ul>
        </section>
      )}

      <ViewTabs value={tab} onChange={setTab}
        tabs={[
          { id: 'calendar', label: t('Calendar'), icon: CalendarDays },
          { id: 'ai', label: t('Nafaa AI'), icon: Sparkles },
          { id: 'creative', label: t('Design'), icon: ImagePlus },
          { id: 'analytics', label: t('Nateeje'), icon: TrendingUp },
        ]}
        right={tab === 'calendar' ? (
          <div className="flex items-center gap-2">
            <Segmented value={view} onChange={setView} items={[{ value: 'month', label: t('Mahina') }, { value: 'week', label: t('7 din') }]} label={t('Calendar view')} />
            <div className="flex items-center gap-1">
              <button type="button" onClick={() => move(-1)} aria-label={t('Pichhla')} className="rounded-lg p-1.5 text-slate-600 hover:bg-slate-100"><ChevronLeft className="h-4 w-4" /></button>
              <button type="button" onClick={() => setAnchor(today)} className="rounded-lg px-2 py-1 text-[0.8125rem] font-semibold text-slate-700 hover:bg-slate-100">{t('Aaj')}</button>
              <button type="button" onClick={() => move(1)} aria-label={t('Agla')} className="rounded-lg p-1.5 text-slate-600 hover:bg-slate-100"><ChevronRight className="h-4 w-4" /></button>
            </div>
          </div>
        ) : undefined} />

      {tab === 'calendar' && (
        <>
          <div className="flex flex-wrap items-baseline justify-between gap-2">
            <h2 className="text-[1.0625rem] font-bold text-slate-900">{title}</h2>
            {!!d?.upcomingFestivals.length && (
              <p className="flex flex-wrap items-center gap-1.5 text-[0.75rem] text-slate-500">
                <Lightbulb className="h-3.5 w-3.5 text-amber-500" />{t('Aage aa rahe hain')}:
                {d.upcomingFestivals.slice(0, 4).map((f) => (
                  <button key={f.key + f.date} type="button" onClick={() => setEditing({ post: null, seed: { day: addDaysKey(f.date, -Math.min(3, f.leadDays)), title: f.name, festivalKey: f.key, hashtags: f.hashtags } })}
                    className="rounded-full bg-rose-50 px-2 py-0.5 font-semibold text-rose-700 ring-1 ring-rose-100 hover:bg-rose-100" title={f.idea}>
                    {f.name} · {new Date(`${f.date}T12:00:00`).toLocaleDateString('en-PK', { day: 'numeric', month: 'short' })}
                  </button>
                ))}
              </p>
            )}
          </div>
          {q.isLoading ? <Skeleton className="h-[34rem] rounded-3xl" /> : (
            <CalendarView view={view} days={days} anchorMonth={anchor.slice(0, 7)} today={today} posts={d?.items ?? []} festivals={d?.festivals ?? []}
              onOpen={(p) => setEditing({ post: p })} onNew={(day) => setEditing({ post: null, seed: { day } })} />
          )}
          <IdeasStrip posts={(d?.items ?? []).filter((p) => !p.scheduledAt)} onOpen={(p) => setEditing({ post: p })} />
          <ComingSoon />
        </>
      )}
      {tab === 'ai' && <AiStudio festivals={d?.upcomingFestivals ?? []} today={today} onDraft={(seed) => setEditing({ post: null, seed })} />}
      {tab === 'creative' && (
        <CreativeMaker useLabel={t('Is se post banayein')}
          onUse={(url, p) => setEditing({ post: null, seed: { media: [{ url, kind: 'image', source: 'creative', productId: p?.id ?? null }], productIds: p ? [p.id] : [], title: p?.name } })} />
      )}
      {tab === 'analytics' && <SocialAnalytics today={today} />}

      {editing && (
        <PostEditor key={editing.post?.id ?? 'new'} post={editing.post} seed={editing.seed} onClose={() => setEditing(null)}
          onPostNow={(p) => { setEditing(null); setPosting(p); }} />
      )}
      {posting && <PostNowSheet post={posting} onClose={() => setPosting(null)} onEdit={() => { const p = posting; setPosting(null); setEditing({ post: p }); }} />}

      {guide.isOpen && (
        <PageGuide
          title={t('Social media — aasaan tareeqa')}
          description={t('Pehle se plan karein, waqt par post karein, aur dekhein kis post se order aaya.')}
          onClose={guide.close}
          flow={[
            { label: t('Plan'), hint: t('Calendar ya Nafaa AI'), icon: CalendarDays, color: '#2563eb' },
            { label: t('Design'), hint: t('Photo + price'), icon: ImagePlus, color: '#7c3aed' },
            { label: t('Yaad'), hint: t('Waqt par phone par'), icon: Bell, color: '#ea580c' },
            { label: t('Post karein'), hint: t('Copy, app kholein'), icon: Send, color: '#16a34a' },
            { label: t('Nateeje'), hint: t('Kis post se order'), icon: TrendingUp, color: '#0d9488' },
          ]}
          steps={[
            { icon: CalendarDays, color: '#2563eb', title: t('Calendar'), text: t('Kisi bhi din par click karein aur post rakhein. Eid, 11.11, White Friday jaise din calendar me khud dikhte hain.') },
            { icon: Sparkles, color: '#7c3aed', title: t('Nafaa AI'), text: t('Product chunein — caption, hashtags, reel ka script ya 7/30 din ka plan ban jata hai.') },
            { icon: ImagePlus, color: '#db2777', title: t('Design'), text: t('Product ki photo par price, Sale %, COD ka nishan aur aap ka logo — 1:1, 4:5 ya 9:16.') },
            { icon: Bell, color: '#ea580c', title: t('Yaad dihani'), text: t('"Ready" ya "Draft" post ke waqt par Nafaa notification aur phone par push bhejta hai.') },
            { icon: Send, color: '#16a34a', title: t('Post karein'), text: t('Caption copy, photo download, app kholein. Post ke baad "Post ho gayi" dabayein aur link paste karein.') },
            { icon: TrendingUp, color: '#0d9488', title: t('Nateeje'), text: t('Post ke product link me nishan hota hai — us se aane wale orders "Nateeje" me us post ke saath dikhte hain.') },
          ]}
          shortcuts={[['N', t('Nayi post')], ['G', t('Guide')]]}
        />
      )}
    </PageShell>
  );
}

function IdeasStrip({ posts, onOpen }: { posts: SocialPost[]; onOpen: (p: SocialPost) => void }) {
  if (!posts.length) return null;
  return (
    <section className="rounded-3xl bg-white p-4 shadow-sm ring-1 ring-slate-200/80">
      <p className="mb-2 flex items-center gap-2 text-[0.875rem] font-semibold text-slate-900"><Lightbulb className="h-4 w-4 text-amber-500" />{t('Ideas (tareekh ke baghair)')}</p>
      <div className="flex flex-wrap gap-2">
        {posts.map((p) => (
          <button key={p.id} type="button" onClick={() => onOpen(p)} className="flex max-w-xs items-center gap-2 rounded-xl bg-slate-50 px-3 py-2 text-start text-[0.8125rem] ring-1 ring-slate-200 hover:bg-white hover:shadow-sm">
            <span className="flex -space-x-1">{p.platforms.slice(0, 3).map((pl) => <PlatformMark key={pl} p={pl} size={14} />)}</span>
            <span className="truncate font-medium text-slate-800">{p.title || p.caption.split('\n')[0] || t('Idea')}</span>
          </button>
        ))}
      </div>
    </section>
  );
}

/** Auto-post, inbox and comment replies: live for shops with Facebook joined, otherwise said plainly as coming soon. */
function ComingSoon() {
  const meta = useAutoPostLive();
  const live = meta.live;
  const items = [
    { icon: Rocket, title: t('Khud post (auto-publish)'), to: meta.connected ? null : '/settings/facebook',
      text: live ? (meta.connected ? t('Post me "Khud post karein" chalu karein — Facebook aur Instagram par waqt par khud.') : t('Facebook joren — phir Nafaa khud Facebook aur Instagram par post karega.')) : t('Facebook, Instagram, TikTok par Nafaa khud post kare — Meta aur TikTok ki manzoori ke baad.') },
    { icon: Inbox, title: t('Social inbox'), to: live ? '/online-store/inbox' : null,
      text: live ? t('Messenger, Instagram DMs aur comments ek jagah — Inbox kholein.') : t('Sab DMs aur comments ek jagah — Meta Business verification ke baad.') },
    { icon: MessageCircle, title: t('Comment ka jawab'), to: live ? '/online-store/inbox' : null,
      text: live ? t('Comments ka jawab, chhupana aur private message Inbox se.') : t('Comments ka jawab yahin se — Meta aur TikTok ki manzoori ke baad.') },
  ];
  return (
    <section className="grid gap-2 sm:grid-cols-3">
      {items.map((x) => {
        const body = (
          <>
            <x.icon className="mt-0.5 h-4 w-4 shrink-0 text-slate-500" />
            <div>
              <p className="flex items-center gap-2 text-[0.8125rem] font-semibold text-slate-800">{x.title}
                {live
                  ? <span className="rounded-full bg-success-100 px-1.5 py-px text-[0.625rem] font-semibold uppercase text-success-800">{t('Live')}</span>
                  : <span className="rounded-full bg-amber-100 px-1.5 py-px text-[0.625rem] font-semibold uppercase text-amber-800">{t('Soon')}</span>}
              </p>
              <p className="text-[0.75rem] text-slate-500">{x.text}</p>
            </div>
          </>
        );
        const cls = 'flex items-start gap-3 rounded-2xl bg-slate-50/80 p-3 ring-1 ring-slate-200/80';
        return x.to
          ? <Link key={x.title} to={x.to} className={`${cls} hover:bg-white hover:shadow-sm`}>{body}</Link>
          : <div key={x.title} className={cls}>{body}</div>;
      })}
    </section>
  );
}

