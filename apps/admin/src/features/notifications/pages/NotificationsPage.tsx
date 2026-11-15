/**
 * Notification center: the admin team's inbox of platform events (shops,
 * billing, online store, Nafaa Social, system, marketing). Category tabs,
 * read state, severity, period and search all run on the server; each admin
 * only sees the categories their role allows. Alert settings (toast, sound,
 * desktop, quiet hours) open from the hero.
 */

import { useState } from 'react';
import { Link } from 'react-router-dom';
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import { toast } from 'sonner';
import { ArrowRight, Bell, BellRing, CheckCheck, Eye, Filter, Lightbulb, Settings2, ShieldAlert, Tag, Trash2 } from 'lucide-react';
import {
  Badge, DateRangeMenu, FilterBar, FilterChip, FilterMenu, PageHero, PageShell, SearchField, ViewTabs, confirmDialog, heroButton,
} from '@/design-system/components';
import { PageGuide, usePageGuide } from '@core/components/PageGuide';
import { adminNotificationsApi, NOTIFY_CATEGORIES, type AdminNotification, type NotifyCategory, type NotifySeverity } from '@/api/admin-notifications.api';
import { formatPkDateTime, formatRelative, num } from '@/lib/format';
import { cn } from '@/lib/cn';
import { useCan } from '@/lib/access';
import { ListCard, useListParams } from '@/ui';
import { PERIOD_DEFAULTS, clearPeriod, periodChip, periodQuery, periodValue, setPeriod } from '../../shared/period';
import { CATEGORY_META, SEVERITY_META, categoryMeta } from '../lib/meta';
import { AlertSettingsDrawer } from '../components/AlertSettingsDrawer';
import { FEED_KEY } from '../hooks/useNotificationFeed';

type Tab = 'all' | NotifyCategory;
const STATUS_LABEL: Record<string, string> = { all: 'All', unread: 'Unread', read: 'Read' };

export default function NotificationsPage() {
  const qc = useQueryClient();
  const guide = usePageGuide();
  const can = useCan();
  const canManage = can('notifications.manage');
  const [settings, setSettings] = useState(false);
  const list = useListParams({ tab: 'all', status: 'all', severity: 'all', ...PERIOD_DEFAULTS });
  const { tab, status, severity } = list.filters;
  const range = periodChip(list.filters);
  const category = tab === 'all' ? undefined : (tab as NotifyCategory);
  const query = {
    category,
    isRead: status === 'unread' ? false : status === 'read' ? true : undefined,
    severity: severity === 'all' ? undefined : (severity as NotifySeverity),
    search: list.debouncedSearch || undefined,
    ...periodQuery(list.filters),
  };

  const items = useQuery({
    queryKey: ['admin-notifications-page', query, list.page, list.limit],
    queryFn: () => adminNotificationsApi.list({ ...query, page: list.page, limit: list.limit }),
    placeholderData: (prev) => prev,
  });
  const stats = useQuery({ queryKey: ['admin-notifications-stats'], queryFn: adminNotificationsApi.stats, staleTime: 30_000 });
  const s = stats.data;
  const rows = items.data?.items ?? [];

  const refresh = () => {
    qc.invalidateQueries({ queryKey: ['admin-notifications-page'] });
    qc.invalidateQueries({ queryKey: ['admin-notifications-stats'] });
    qc.invalidateQueries({ queryKey: ['admin-notifications-list'] });
    qc.invalidateQueries({ queryKey: FEED_KEY });
  };
  const fail = (e: any) => toast.error(e?.response?.data?.message || 'Something went wrong');
  const markAll = useMutation({
    mutationFn: () => adminNotificationsApi.markAllRead(category),
    onSuccess: (r) => { toast.success(r.updatedCount ? `${num(r.updatedCount)} marked as read` : 'Nothing unread'); refresh(); },
    onError: fail,
  });
  const clearRead = useMutation({ mutationFn: adminNotificationsApi.clearRead, onSuccess: (r) => { toast.success(`${num(r.deletedCount)} read notifications cleared`); refresh(); }, onError: fail });
  const markRead = useMutation({ mutationFn: adminNotificationsApi.markRead, onSuccess: refresh, onError: fail });
  const remove = useMutation({ mutationFn: adminNotificationsApi.remove, onSuccess: refresh, onError: fail });

  const onClear = async () => {
    if (await confirmDialog({ title: 'Clear all read notifications?', text: 'They are deleted for good. Unread ones stay.', yes: 'Clear read', danger: true })) clearRead.mutate();
  };
  const open = (n: AdminNotification) => { if (!n.isRead && canManage) markRead.mutate(n.id); };

  const allowed = s?.categories ?? NOTIFY_CATEGORIES.filter((c) => c !== 'general');
  const unreadIn = (c: string) => s?.byCategory.find((x) => x.category === c)?._count ?? 0;
  const critical = s?.byPriority.find((p) => p.priority === 'URGENT')?._count ?? 0;
  const warnings = s?.byPriority.find((p) => p.priority === 'HIGH')?._count ?? 0;
  const tabs = [
    { id: 'all' as Tab, label: 'All', count: s ? s.unread || null : null },
    ...allowed.filter((c) => c !== 'general' || unreadIn('general') > 0).map((c) => ({ id: c as Tab, label: CATEGORY_META[c].label, icon: CATEGORY_META[c].icon, count: unreadIn(c) || null })),
  ];
  const chips = [
    status !== 'all' && <FilterChip key="st" onRemove={() => list.setFilter('status', 'all')}>{STATUS_LABEL[status]}</FilterChip>,
    severity !== 'all' && <FilterChip key="sv" onRemove={() => list.setFilter('severity', 'all')}>{SEVERITY_META[severity as NotifySeverity]?.label}</FilterChip>,
    range && <FilterChip key="d" onRemove={() => clearPeriod(list)}>{range}</FilterChip>,
  ].filter(Boolean);

  return (
    <PageShell>
      <PageHero
        title="Notifications"
        chip={s ? `${num(s.unread)} unread` : undefined}
        busy={items.isFetching}
        loading={stats.isLoading}
        actions={
          <>
            {canManage && <button type="button" className={heroButton} onClick={() => markAll.mutate()} disabled={markAll.isPending || !s?.unread}><CheckCheck className="h-4 w-4" /> {category ? `Mark ${CATEGORY_META[category].label.toLowerCase()} read` : 'Mark all read'}</button>}
            {canManage && <button type="button" className={heroButton} onClick={onClear} disabled={clearRead.isPending}><Trash2 className="h-4 w-4" /> Clear read</button>}
            <button type="button" className={heroButton} onClick={() => setSettings(true)}><Settings2 className="h-4 w-4" /> Alert settings</button>
            <button type="button" className={heroButton} onClick={guide.open} aria-label="How this page works (G)"><Lightbulb className="h-4 w-4" /></button>
          </>
        }
        stats={s ? [
          { label: 'Unread', value: num(s.unread), hint: `of ${num(s.total)}` },
          { label: 'Critical', value: num(critical), hint: 'Unread' },
          { label: 'Warnings', value: num(warnings), hint: 'Unread' },
          { label: 'Last 24 hours', value: num(s.today) },
        ] : undefined}
      />

      <ViewTabs tabs={tabs} value={(tabs.some((t) => t.id === tab) ? tab : 'all') as Tab} onChange={(v) => list.setFilter('tab', v)} />

      <FilterBar
        search={<SearchField value={list.search} onChange={list.setSearch} placeholder="Search title or message" />}
        chips={chips.length ? chips : undefined}
        onClear={() => { clearPeriod(list); list.setFilter('status', 'all'); list.setFilter('severity', 'all'); }}
      >
        <FilterMenu icon={Eye} label="Status" value={status} active={status !== 'all'} onChange={(v) => list.setFilter('status', v)}
          options={[{ value: 'all', label: 'All' }, { value: 'unread', label: 'Unread' }, { value: 'read', label: 'Read' }]} />
        <FilterMenu icon={Filter} label="Severity" value={severity} active={severity !== 'all'} onChange={(v) => list.setFilter('severity', v)}
          options={[{ value: 'all', label: 'Any severity' }, { value: 'critical', label: 'Critical' }, { value: 'warning', label: 'Warning' }, { value: 'info', label: 'Info' }]} />
        <DateRangeMenu value={periodValue(list.filters)} onChange={(v) => setPeriod(list, v)} startHour={0} />
      </FilterBar>

      <ListCard
        loading={items.isLoading}
        empty={!rows.length}
        emptyIcon={<Bell className="h-6 w-6" />}
        emptyTitle="No notifications"
        emptyText={status === 'unread' ? 'You are all caught up.' : 'New shops, payments, store and social events appear here as they happen.'}
        page={list.page} limit={list.limit} total={items.data?.meta.total} onPage={list.setPage} onLimit={list.setLimit}
      >
        <ul className="divide-y divide-slate-100">
          {rows.map((n) => {
            const cat = categoryMeta(n.category);
            const sev = SEVERITY_META[n.severity] ?? SEVERITY_META.info;
            const Icon = n.severity === 'info' ? cat.icon : sev.icon;
            return (
              <li key={n.id} className={cn('flex gap-3 px-4 py-3.5 sm:px-5', !n.isRead && 'bg-brand-50/40', sev.edge)}>
                <span className={cn('flex h-10 w-10 shrink-0 items-center justify-center rounded-xl', n.severity === 'info' ? cat.tone : sev.iconTone)}><Icon className="h-5 w-5" /></span>
                <div className="min-w-0 flex-1">
                  <div className="flex flex-wrap items-start justify-between gap-2">
                    <div className="min-w-0">
                      <h3 className={cn('text-[0.9375rem] text-slate-900', n.isRead ? 'font-medium' : 'font-bold')}>
                        {n.title}
                        {n.occurrences > 1 && <span className="ms-2 rounded-md bg-slate-100 px-1.5 py-0.5 align-middle text-[0.75rem] font-semibold text-slate-600" title="Times this happened">×{num(n.occurrences)}</span>}
                      </h3>
                      <p className="mt-0.5 break-words text-[0.875rem] text-slate-600">{n.message}</p>
                    </div>
                    <div className="flex items-center gap-1.5">
                      {n.severity !== 'info' && <Badge variant={sev.badge}>{sev.label}</Badge>}
                      <Badge variant="outline">{cat.label}</Badge>
                    </div>
                  </div>
                  <div className="mt-2 flex flex-wrap items-center gap-x-4 gap-y-1 text-[0.75rem]">
                    <span className="text-slate-500" title={formatPkDateTime(n.lastAt ?? n.createdAt)}>
                      {formatRelative(n.lastAt ?? n.createdAt)}
                      {n.occurrences > 1 && ` · first ${formatRelative(n.createdAt)}`}
                    </span>
                    {n.isRead && n.readBy && <span className="text-slate-400">Read by {n.readBy.fullName}</span>}
                    {n.link && (
                      <Link to={n.link} onClick={() => open(n)} className="inline-flex items-center gap-1 font-semibold text-brand-700 hover:underline">
                        Open <ArrowRight className="h-3 w-3" />
                      </Link>
                    )}
                    {canManage && !n.isRead && <button type="button" onClick={() => markRead.mutate(n.id)} className="font-medium text-slate-600 hover:text-slate-900">Mark as read</button>}
                    {canManage && <button type="button" onClick={() => remove.mutate(n.id)} className="inline-flex items-center gap-1 font-medium text-rose-600 hover:text-rose-700"><Trash2 className="h-3 w-3" /> Delete</button>}
                  </div>
                </div>
              </li>
            );
          })}
        </ul>
      </ListCard>

      <AlertSettingsDrawer open={settings} onClose={() => setSettings(false)} />

      {guide.isOpen && (
        <PageGuide
          title="Notifications"
          description="Everything that needs the admin team's eyes: new shops, payments, store and social problems, system errors and new leads."
          flowTitle="From event to you"
          flow={[
            { label: 'Something happens', hint: 'Shop, payment, post', icon: Tag, color: '#4f46e5' },
            { label: 'Grouped', hint: 'Repeats add a count', icon: Bell, color: '#0284c7' },
            { label: 'You are alerted', hint: 'Pop-up, sound, desktop', icon: BellRing, color: '#d97706' },
            { label: 'Open and mark read', icon: CheckCheck, color: '#059669' },
          ]}
          steps={[
            { icon: Bell, color: '#4f46e5', title: 'Pick a category', text: 'The tabs split the inbox by area; the number is what is still unread. You only see areas your role allows.' },
            { icon: ShieldAlert, color: '#e11d48', title: 'Critical first', text: 'Filter by severity. Critical items have a red edge, warnings an amber edge.' },
            { icon: Settings2, color: '#0284c7', title: 'Choose your alerts', text: 'Alert settings decide which areas pop up, the sound, desktop alerts and quiet hours. They are yours only.' },
            { icon: Trash2, color: '#64748b', title: 'Tidy up', text: 'Mark read when handled. Read state is shared by the whole team.' },
          ]}
          tips={[
            'New notifications appear within about 15 seconds, without reloading.',
            'The same event happening again shortly after shows as one row with a ×count.',
            'Desktop alerts need a one-time "Allow" in Alert settings.',
          ]}
          shortcuts={[['/', 'Search'], ['G', 'This guide']]}
          onClose={guide.close}
        />
      )}
    </PageShell>
  );
}
