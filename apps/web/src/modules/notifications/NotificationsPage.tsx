/**
 * Notifications: everything the app told this person, grouped by business
 * day. Tabs for daily summary, sales, online orders, stock and alerts; filter
 * by read state, period and text; open the linked page, send the daily
 * summary on WhatsApp, mark read or unread, delete, and act on many at once.
 *
 * Keys: / search · R all read · S select · M sound · G guide · Esc stop selecting.
 */

import { useEffect, useMemo, useRef, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { useInfiniteQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { toast } from 'sonner';
import {
  AlertTriangle, Bell, BellOff, CalendarCheck, CheckCheck, CheckSquare, ExternalLink, Eye, EyeOff, Globe, GraduationCap, Inbox,
  ListFilter, MessageCircle, MousePointerClick, Package, ShoppingCart, Square, Trash2, Volume2, VolumeX, X, type LucideIcon,
} from 'lucide-react';
import {
  Button, DateRangeMenu, FilterBar, FilterChip, FilterMenu, Kbd, KpiCard, KpiRow, PageHero, PageShell, SearchField, Skeleton, ViewTabs,
  heroButton, heroIconButton, resolveRange, type DateRangeValue,
} from '@/design-system/components';
import { PageGuide, usePageGuide } from '@core/components/PageGuide';
import { PrintButton, type PrintDoc } from '@core/print';
import { useNotificationSound } from '@core/hooks/useNotificationSound';
import { businessDayKey, useBusinessDayStart } from '@core/lib/business-day';
import { rangeLabel } from '@core/lib/dateRange';
import { isDialogOpen, isTyping } from '@core/lib/shortcuts';
import { cn } from '@core/lib/cn';
import { notificationsApi, type Notification, type NotificationFeed, type NotificationFeedFilters, type NotificationGroup } from './api/notifications.api';
import { GROUPS, isSummary, metaOf, waUrlOf } from './meta';

type Group = 'all' | NotificationGroup;
type ReadFilter = 'all' | 'unread';

const GROUP_ICON: Record<Group, LucideIcon> = { all: Inbox, summary: CalendarCheck, sales: ShoppingCart, online: Globe, stock: Package, alerts: AlertTriangle };
const PAGE = 50;
const ALL_TIME: DateRangeValue = { preset: 'all', custom: { from: '', to: '' } };

const timeOf = (v: string) => new Intl.DateTimeFormat('en-PK', { hour: 'numeric', minute: '2-digit' }).format(new Date(v));
const stamp = (v: string) => new Intl.DateTimeFormat('en-PK', { dateStyle: 'medium', timeStyle: 'short' }).format(new Date(v));

export default function NotificationsPage() {
  const navigate = useNavigate();
  const qc = useQueryClient();
  const startHour = useBusinessDayStart();
  const guide = usePageGuide();
  const searchRef = useRef<HTMLInputElement>(null);
  const sound = useNotificationSound();

  const [group, setGroup] = useState<Group>('all');
  const [read, setRead] = useState<ReadFilter>('all');
  const [range, setRange] = useState<DateRangeValue>(ALL_TIME);
  const [search, setSearch] = useState('');
  const [needle, setNeedle] = useState('');
  const [muted, setMuted] = useState(() => sound.isMuted());
  const [selecting, setSelecting] = useState(false);
  const [picked, setPicked] = useState<Set<string>>(new Set());
  const [expanded, setExpanded] = useState<string | null>(null);

  useEffect(() => { const t = setTimeout(() => setNeedle(search.trim()), 300); return () => clearTimeout(t); }, [search]);

  const period = resolveRange(range, startHour);
  const pFrom = period?.from;
  const pTo = period?.to;
  const filters: NotificationFeedFilters = useMemo(() => ({
    ...(group !== 'all' && { group }), ...(read === 'unread' && { unreadOnly: true }),
    ...(pFrom && pTo && { from: pFrom, to: pTo }), ...(needle && { search: needle }),
  }), [group, read, pFrom, pTo, needle]);

  const q = useInfiniteQuery({
    queryKey: ['notifications', 'feed', filters],
    queryFn: ({ pageParam }) => notificationsApi.feed(filters, pageParam, PAGE),
    initialPageParam: undefined as string | undefined,
    getNextPageParam: (last: NotificationFeed) => last.nextCursor ?? undefined,
    placeholderData: (p) => p,
    refetchInterval: 60_000,
  });
  const first = q.data?.pages[0];
  const items = useMemo(() => q.data?.pages.flatMap((p) => p.items) ?? [], [q.data]);
  const counts = first?.counts;

  const refresh = () => qc.invalidateQueries({ queryKey: ['notifications'] });
  const fail = () => toast.error('Nahi hua — internet check karein');
  const setRead1 = useMutation({
    mutationFn: async ({ id, on }: { id: string; on: boolean }) => { if (on) await notificationsApi.markRead(id); else await notificationsApi.markUnread(id); },
    onSuccess: refresh, onError: fail,
  });
  const remove1 = useMutation({ mutationFn: (id: string) => notificationsApi.remove(id), onSuccess: () => { toast.success('Mita di'); refresh(); }, onError: fail });
  const allRead = useMutation({ mutationFn: () => notificationsApi.markAllRead(), onSuccess: () => { toast.success('Sab parh li gayin'); refresh(); }, onError: fail });
  const bulk = useMutation({
    mutationFn: (action: 'read' | 'unread' | 'delete') => notificationsApi.bulk([...picked], action),
    onSuccess: (r, action) => {
      toast.success(action === 'delete' ? `${r.count} mita di gayin` : `${r.count} ${action === 'read' ? 'parhi hui' : 'bina parhi'} ho gayin`);
      setPicked(new Set()); setSelecting(false); refresh();
    },
    onError: fail,
  });
  const stockCheck = useMutation({ mutationFn: () => notificationsApi.checkLowStock(), onSuccess: () => { toast.success('Stock check ho gaya'); refresh(); }, onError: fail });

  const openOne = (n: Notification) => {
    if (selecting) return togglePick(n.id);
    if (!n.isRead) setRead1.mutate({ id: n.id, on: true });
    if (n.link) navigate(n.link);
    else setExpanded(expanded === n.id ? null : n.id);
  };
  const togglePick = (id: string) => setPicked((s) => { const x = new Set(s); if (x.has(id)) x.delete(id); else x.add(id); return x; });
  const toggleMute = () => { const next = !muted; sound.setMuted(next); setMuted(next); toast.success(next ? 'Awaaz band' : 'Awaaz chalu'); };

  useEffect(() => {
    const onKey = (e: KeyboardEvent) => {
      if (e.key === 'Escape' && selecting) { setSelecting(false); setPicked(new Set()); return; }
      if (e.metaKey || e.ctrlKey || e.altKey || isTyping() || isDialogOpen()) return;
      const k = e.key.toLowerCase();
      if (e.key === '/') { e.preventDefault(); searchRef.current?.focus(); }
      if (k === 'r' && (counts?.unread ?? 0) > 0) { e.preventDefault(); allRead.mutate(); }
      if (k === 's') { e.preventDefault(); setSelecting((v) => !v); setPicked(new Set()); }
      if (k === 'm') { e.preventDefault(); toggleMute(); }
    };
    window.addEventListener('keydown', onKey);
    return () => window.removeEventListener('keydown', onKey);
  });

  const days = useMemo(() => {
    const map = new Map<string, Notification[]>();
    for (const n of items) {
      const k = businessDayKey(new Date(n.createdAt), startHour);
      map.set(k, [...(map.get(k) ?? []), n]);
    }
    return [...map.entries()];
  }, [items, startHour]);
  const dayTitle = (key: string) => {
    const today = businessDayKey(new Date(), startHour);
    const y = new Date(); y.setDate(y.getDate() - 1);
    if (key === today) return 'Aaj';
    if (key === businessDayKey(y, startHour)) return 'Kal';
    return new Intl.DateTimeFormat('en-PK', { weekday: 'long', day: 'numeric', month: 'long' }).format(new Date(`${key}T12:00:00`));
  };

  const hasFilters = read !== 'all' || range.preset !== 'all' || !!needle;
  const clear = () => { setRead('all'); setRange(ALL_TIME); setSearch(''); };
  const label = period ? rangeLabel(period.from, period.to) : 'Sab waqt';
  const printDoc = (): PrintDoc => ({
    title: 'Notifications',
    subtitle: `${GROUPS.find((g) => g.id === group)?.label} · ${label}`,
    meta: [['Kul', String(items.length)], ['Bina parhe', String(items.filter((n) => !n.isRead).length)]],
    sections: [{ kind: 'table', columns: [{ label: 'Waqt' }, { label: 'Notification' }, { label: 'Details', wideOnly: true }], rows: items.map((n) => [stamp(n.createdAt), n.title, n.message]) }],
  });
  const allPicked = items.length > 0 && items.every((n) => picked.has(n.id));

  return (
    <PageShell>
      <PageHero
        title="Notifications"
        chip={<><Bell />{counts ? `${counts.unread} bina parhe` : '…'}</>}
        meta={label}
        busy={q.isFetching && !q.isLoading && !q.isFetchingNextPage}
        actions={<>
          <button type="button" onClick={() => allRead.mutate()} disabled={!counts?.unread || allRead.isPending} title="Sab parh liye (R)" className={heroButton}><CheckCheck className="h-4 w-4" /><span className="hidden sm:inline">Sab parh liye</span></button>
          <button type="button" onClick={() => { setSelecting((v) => !v); setPicked(new Set()); }} title="Chunein (S)" className={heroButton}><CheckSquare className="h-4 w-4" /><span className="hidden sm:inline">{selecting ? 'Chunna band' : 'Chunein'}</span></button>
          <span className="[&_button]:border-white/25 [&_button]:bg-white [&_button]:text-slate-800"><PrintButton doc={printDoc} disabled={!items.length} /></span>
          <button type="button" onClick={toggleMute} title={muted ? 'Awaaz chalu karein (M)' : 'Awaaz band karein (M)'} aria-label="Awaaz" className={heroIconButton}>{muted ? <VolumeX className="h-4 w-4" /> : <Volume2 className="h-4 w-4" />}</button>
          <button type="button" onClick={guide.open} title="Guide (G)" aria-label="Guide" className={heroIconButton}><GraduationCap className="h-4 w-4" /></button>
        </>}
      />

      <KpiRow cols={4}>
        {!counts ? Array.from({ length: 4 }, (_, i) => <Skeleton key={i} className="h-[5.25rem] rounded-2xl" />) : (
          <>
            <KpiCard icon={Bell} color="#2563eb" label="Bina parhe" value={String(counts.unread)} hint={read === 'unread' ? 'Sab dikhane ke liye dabayein' : 'Sirf yeh dekhne ke liye dabayein'}
              onClick={() => setRead(read === 'unread' ? 'all' : 'unread')} active={read === 'unread'} />
            <KpiCard icon={CalendarCheck} color="#0891b2" label="Din ka hisaab" value={String(counts.groups.summary)} hint="Roz ki summary"
              onClick={() => setGroup(group === 'summary' ? 'all' : 'summary')} active={group === 'summary'} />
            <KpiCard icon={AlertTriangle} color="#e11d48" label="Alerts" value={String(counts.groups.alerts)} hint="Warning aur ghalti"
              onClick={() => setGroup(group === 'alerts' ? 'all' : 'alerts')} active={group === 'alerts'} />
            <KpiCard icon={Inbox} color="#64748b" label="Kul" value={String(counts.all)} hint={label} />
          </>
        )}
      </KpiRow>

      <FilterBar
        search={<SearchField ref={searchRef} value={search} onChange={setSearch} placeholder="Notification me search…" label="Notification search" />}
        chips={hasFilters ? <>
          {read !== 'all' && <FilterChip onRemove={() => setRead('all')}>Bina parhe</FilterChip>}
          {range.preset !== 'all' && <FilterChip onRemove={() => setRange(ALL_TIME)}>{label}</FilterChip>}
          {needle && <FilterChip onRemove={() => setSearch('')}>"{needle}"</FilterChip>}
        </> : undefined}
        onClear={clear}>
        <FilterMenu icon={ListFilter} label="Haal" value={read} active={read !== 'all'} onChange={setRead}
          options={[{ value: 'all', label: 'Sab' }, { value: 'unread', label: 'Sirf bina parhe' }]} />
        <DateRangeMenu value={range} onChange={setRange} startHour={startHour} defaultPreset="all" />
      </FilterBar>

      <ViewTabs value={group} onChange={(g) => { setGroup(g); setPicked(new Set()); }}
        tabs={GROUPS.map((g) => ({ id: g.id, label: g.label, icon: GROUP_ICON[g.id], count: counts ? (g.id === 'all' ? (read === 'unread' ? counts.unread : counts.all) : counts.groups[g.id]) : null }))}
        right={group === 'stock' ? <Button size="sm" variant="secondary" loading={stockCheck.isPending} onClick={() => stockCheck.mutate()}><Package className="h-4 w-4" />Kam stock abhi check karein</Button> : undefined} />

      {selecting && (
        <div className="sticky top-2 z-20 flex flex-wrap items-center gap-2 rounded-2xl bg-slate-900 px-3 py-2 text-white shadow-lg">
          <button type="button" onClick={() => setPicked(allPicked ? new Set() : new Set(items.map((n) => n.id)))} className="inline-flex h-8 items-center gap-1.5 rounded-lg px-2 text-[0.8125rem] font-semibold hover:bg-white/10">
            {allPicked ? <CheckSquare className="h-4 w-4" /> : <Square className="h-4 w-4" />}{picked.size} chuni
          </button>
          <span className="mx-1 h-5 w-px bg-white/20" />
          <button type="button" disabled={!picked.size || bulk.isPending} onClick={() => bulk.mutate('read')} className="inline-flex h-8 items-center gap-1.5 rounded-lg px-2 text-[0.8125rem] hover:bg-white/10 disabled:opacity-50"><Eye className="h-4 w-4" />Parh liya</button>
          <button type="button" disabled={!picked.size || bulk.isPending} onClick={() => bulk.mutate('unread')} className="inline-flex h-8 items-center gap-1.5 rounded-lg px-2 text-[0.8125rem] hover:bg-white/10 disabled:opacity-50"><EyeOff className="h-4 w-4" />Bina parha</button>
          <button type="button" disabled={!picked.size || bulk.isPending} onClick={() => bulk.mutate('delete')} className="inline-flex h-8 items-center gap-1.5 rounded-lg px-2 text-[0.8125rem] text-rose-300 hover:bg-white/10 disabled:opacity-50"><Trash2 className="h-4 w-4" />Mitayein</button>
          <button type="button" onClick={() => { setSelecting(false); setPicked(new Set()); }} aria-label="Band (Esc)" className="ml-auto flex h-8 w-8 items-center justify-center rounded-lg hover:bg-white/10"><X className="h-4 w-4" /></button>
        </div>
      )}

      {q.isError && !first ? (
        <p className="rounded-3xl bg-white px-6 py-14 text-center text-sm text-slate-500 ring-1 ring-slate-200/80">Notifications load nahi huin — internet check karein aur dobara kholein.</p>
      ) : q.isLoading ? (
        <div className="space-y-2 rounded-3xl bg-white p-4 ring-1 ring-slate-200/80">{Array.from({ length: 6 }, (_, i) => <Skeleton key={i} className="h-16 rounded-xl" />)}</div>
      ) : items.length === 0 ? (
        <div className="flex flex-col items-center rounded-3xl bg-white px-6 py-16 text-center ring-1 ring-slate-200/80">
          <span className="flex h-16 w-16 items-center justify-center rounded-2xl bg-gradient-to-br from-brand-500 to-brand-700 text-brand-fg shadow-lg"><BellOff className="h-7 w-7" /></span>
          <h3 className="mt-4 text-lg font-semibold text-slate-900">{hasFilters || group !== 'all' ? 'Is filter me koi notification nahi' : 'Koi notification nahi'}</h3>
          <p className="mt-1 text-[0.875rem] text-slate-500">{read === 'unread' ? 'Sab parh li gayi hain' : 'Nayi sale, kam stock, online order ya din ka hisaab aaye ga to yahan dikhega'}</p>
          {(hasFilters || group !== 'all') && <Button className="mt-4" variant="secondary" onClick={() => { clear(); setGroup('all'); }}>Filter hatayein</Button>}
        </div>
      ) : (
        <div className="space-y-4">
          {days.map(([key, list]) => (
            <section key={key} className="overflow-hidden rounded-3xl bg-white shadow-sm ring-1 ring-slate-200/80">
              <header className="flex items-center justify-between gap-3 border-b border-slate-100 bg-slate-50/70 px-4 py-2.5 sm:px-5">
                <h2 className="text-[0.875rem] font-semibold text-slate-900">{dayTitle(key)}</h2>
                <span className="text-[0.75rem] text-slate-500">{list.length}{list.some((n) => !n.isRead) ? ` · ${list.filter((n) => !n.isRead).length} bina parhe` : ''}</span>
              </header>
              <ul className="divide-y divide-slate-100">
                {list.map((n) => (
                  <Row key={n.id} n={n} selecting={selecting} picked={picked.has(n.id)} open={expanded === n.id || isSummary(n)}
                    onOpen={() => openOne(n)} onRead={(on) => setRead1.mutate({ id: n.id, on })} onDelete={() => remove1.mutate(n.id)} onMore={() => setExpanded(expanded === n.id ? null : n.id)} />
                ))}
              </ul>
            </section>
          ))}
          {q.hasNextPage && (
            <button type="button" onClick={() => void q.fetchNextPage()} disabled={q.isFetchingNextPage}
              className="w-full rounded-2xl bg-white py-3 text-[0.875rem] font-semibold text-brand-700 ring-1 ring-slate-200 hover:bg-brand-50 disabled:opacity-60">
              {q.isFetchingNextPage ? 'Aa rahi hain…' : `Aur dikhayein (${items.length} / ${first?.total ?? 0})`}
            </button>
          )}
        </div>
      )}

      {guide.isOpen && (
        <PageGuide title="Notifications — aasaan tareeqa" onClose={guide.close}
          steps={[
            { icon: Inbox, color: '#2563eb', title: 'Tabs', text: 'Din ka hisaab, sale, online orders, stock aur alerts alag alag. Har tab par ginti likhi hai.' },
            { icon: MousePointerClick, color: '#16a34a', title: 'Kholein', text: 'Notification par click karein — us ka page khul jata hai aur woh parhi hui ho jati hai.' },
            { icon: MessageCircle, color: '#22c55e', title: 'WhatsApp', text: 'Din ke hisaab par WhatsApp ka button hota hai — ek click me malik ya partner ko bhej dein.' },
            { icon: Eye, color: '#7c3aed', title: 'Parha / bina parha', text: 'Aankh ke button se parhi ya bina parhi karein. Upar "Sab parh liye" se sab ek saath.' },
            { icon: CheckSquare, color: '#d97706', title: 'Kai ek saath', text: '"Chunein" dabayein, notifications chunein, phir parh liya, bina parha ya mitayein.' },
            { icon: Volume2, color: '#0891b2', title: 'Awaaz', text: 'Nayi notification par awaaz aati hai. Speaker ke button se band ya chalu karein.' },
          ]}
          tips={['Sab ke liye bheji gayi notification (jaise kam stock) ek bande ke parhne se sab ke liye parhi hui ho jati hai.', 'Rozana closing report Settings → Reports se chalu hoti hai.']}
          shortcuts={[['/', 'dhoondein'], ['R', 'sab parh liye'], ['S', 'chunein'], ['M', 'awaaz'], ['G', 'guide']]}
        />
      )}
    </PageShell>
  );
}

function Row({ n, selecting, picked, open, onOpen, onRead, onDelete, onMore }: {
  n: Notification; selecting: boolean; picked: boolean; open: boolean;
  onOpen: () => void; onRead: (on: boolean) => void; onDelete: () => void; onMore: () => void;
}) {
  const { icon: Icon, color } = metaOf(n);
  const wa = waUrlOf(n);
  const long = n.message.length > 140 || n.message.includes('\n');
  return (
    <li className={cn('group relative flex items-start gap-3 px-4 py-3 transition sm:px-5', !n.isRead && 'bg-brand-50/40', picked && 'bg-brand-50')}>
      {selecting && (
        <button type="button" onClick={onOpen} aria-label={picked ? 'Hatayein' : 'Chunein'} className="mt-2 text-brand-700">{picked ? <CheckSquare className="h-5 w-5" /> : <Square className="h-5 w-5 text-slate-400" />}</button>
      )}
      <span className="relative mt-0.5 flex h-10 w-10 shrink-0 items-center justify-center rounded-xl" style={{ backgroundColor: `${color}17`, color }}>
        <Icon className="h-5 w-5" />
        {!n.isRead && <span className="absolute -right-0.5 -top-0.5 h-2.5 w-2.5 rounded-full bg-brand-600 ring-2 ring-white" aria-label="Bina parhi" />}
      </span>
      <div className="min-w-0 flex-1">
        <button type="button" onClick={onOpen} className="block w-full text-left">
          <span className={cn('block text-[0.875rem] text-slate-900', n.isRead ? 'font-medium' : 'font-semibold')}>{n.title}</span>
          <span className={cn('mt-0.5 block whitespace-pre-line text-[0.8125rem] text-slate-600', !open && 'line-clamp-2')}>{n.message}</span>
        </button>
        <div className="mt-2 flex flex-wrap items-center gap-1.5">
          <span className="mr-1 text-[0.75rem] tabular-nums text-slate-500">{timeOf(n.createdAt)}</span>
          {n.link && !selecting && <button type="button" onClick={onOpen} className="inline-flex h-7 items-center gap-1 rounded-lg bg-white px-2 text-[0.75rem] font-semibold text-brand-700 ring-1 ring-slate-200 hover:bg-brand-50"><ExternalLink className="h-3.5 w-3.5" />Kholein</button>}
          {wa && !selecting && <a href={wa} target="_blank" rel="noreferrer" className="inline-flex h-7 items-center gap-1 rounded-lg bg-emerald-600 px-2 text-[0.75rem] font-semibold text-white hover:bg-emerald-700"><MessageCircle className="h-3.5 w-3.5" />WhatsApp par bhejein</a>}
          {long && !isSummary(n) && !selecting && <button type="button" onClick={onMore} className="h-7 rounded-lg px-2 text-[0.75rem] font-medium text-slate-500 hover:bg-slate-100">{open ? 'Kam dikhayein' : 'Poora parhein'}</button>}
        </div>
      </div>
      {!selecting && (
        <div className="flex shrink-0 items-center gap-0.5 opacity-100 sm:opacity-0 sm:transition sm:group-focus-within:opacity-100 sm:group-hover:opacity-100">
          <button type="button" onClick={() => onRead(!n.isRead)} title={n.isRead ? 'Bina parhi karein' : 'Parh li'} aria-label={n.isRead ? 'Bina parhi karein' : 'Parh li'} className="flex h-8 w-8 items-center justify-center rounded-lg text-slate-500 hover:bg-slate-100">{n.isRead ? <EyeOff className="h-4 w-4" /> : <Eye className="h-4 w-4" />}</button>
          <button type="button" onClick={onDelete} title="Mitayein" aria-label="Mitayein" className="flex h-8 w-8 items-center justify-center rounded-lg text-slate-400 hover:bg-rose-50 hover:text-rose-600"><Trash2 className="h-4 w-4" /></button>
        </div>
      )}
    </li>
  );
}
