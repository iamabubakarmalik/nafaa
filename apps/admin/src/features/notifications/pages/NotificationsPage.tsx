/**
 * Notifications: the admin team's inbox of platform events (new shops,
 * payments, expiring plans, alerts). Search, type, period and read filters
 * run on the server.
 */

import { Link } from 'react-router-dom';
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import { toast } from 'sonner';
import {
  AlertTriangle, ArrowRight, Bell, Building2, CheckCheck, CheckCircle2, CreditCard, DollarSign, Info, Lightbulb, Tag, Trash2, Users, XCircle, type LucideIcon,
} from 'lucide-react';
import {
  Badge, DateRangeMenu, FilterBar, FilterChip, FilterMenu, PageHero, PageShell, SearchField, ViewTabs, confirmDialog, heroButton,
} from '@/design-system/components';
import { PageGuide, usePageGuide } from '@core/components/PageGuide';
import { adminNotificationsApi, type AdminNotificationPriority, type AdminNotificationType } from '@/api/admin-notifications.api';
import { formatRelative } from '@/lib/format';
import { cn } from '@/lib/cn';
import { ListCard, statusLabel, useListParams } from '@/ui';
import { PERIOD_DEFAULTS, clearPeriod, periodChip, periodQuery, periodValue, setPeriod } from '../../shared/period';

const ICONS: Record<AdminNotificationType, LucideIcon> = {
  NEW_TENANT: Building2, NEW_PAYMENT: CreditCard, PAYMENT_APPROVED: CheckCircle2, PAYMENT_REJECTED: XCircle,
  SUBSCRIPTION_EXPIRING: AlertTriangle, SUBSCRIPTION_CANCELLED: XCircle, REFERRAL_CONVERTED: Users, TENANT_SUSPENDED: AlertTriangle,
  HIGH_VALUE_PAYMENT: DollarSign, SYSTEM_ALERT: AlertTriangle, USER_ACTION: Users, INFO: Info, WARNING: AlertTriangle, ERROR: XCircle, SUCCESS: CheckCircle2,
};
const PRIORITY_TONE: Record<AdminNotificationPriority, 'danger' | 'warning' | 'default'> = { URGENT: 'danger', HIGH: 'warning', NORMAL: 'default', LOW: 'default' };
const TABS = ['all', 'unread', 'urgent'] as const;
type Tab = (typeof TABS)[number];
const num = (n: number) => n.toLocaleString('en-PK');

export default function NotificationsPage() {
  const qc = useQueryClient();
  const guide = usePageGuide();
  const list = useListParams({ tab: 'all', type: 'ALL', ...PERIOD_DEFAULTS });
  const { tab, type } = list.filters;
  const range = periodChip(list.filters);
  const query = {
    isRead: tab === 'unread' ? false : undefined,
    priority: tab === 'urgent' ? 'URGENT' : undefined,
    type: type === 'ALL' ? undefined : type,
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
    qc.invalidateQueries({ queryKey: ['admin-notifications-count'] });
  };
  const fail = (e: any) => toast.error(e?.response?.data?.message || 'Something went wrong');
  const markAll = useMutation({ mutationFn: adminNotificationsApi.markAllRead, onSuccess: () => { toast.success('All marked as read'); refresh(); }, onError: fail });
  const clearRead = useMutation({ mutationFn: adminNotificationsApi.clearRead, onSuccess: (r) => { toast.success(`${r.deletedCount} read notifications cleared`); refresh(); }, onError: fail });
  const markRead = useMutation({ mutationFn: adminNotificationsApi.markRead, onSuccess: refresh, onError: fail });
  const remove = useMutation({ mutationFn: adminNotificationsApi.remove, onSuccess: refresh, onError: fail });

  const onClear = async () => {
    if (await confirmDialog({ title: 'Clear all read notifications?', text: 'They are deleted for good. Unread ones stay.', yes: 'Clear read', danger: true })) clearRead.mutate();
  };

  const types: Array<{ type: string; _count: number }> = s?.byType ?? [];
  const urgent = (s?.byPriority ?? []).find((p: any) => p.priority === 'URGENT')?._count ?? 0;
  const high = (s?.byPriority ?? []).find((p: any) => p.priority === 'HIGH')?._count ?? 0;
  const chips = [
    type !== 'ALL' && <FilterChip key="t" onRemove={() => list.setFilter('type', 'ALL')}>{statusLabel(type)}</FilterChip>,
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
            <button type="button" className={heroButton} onClick={() => markAll.mutate()} disabled={markAll.isPending || !s?.unread}><CheckCheck className="h-4 w-4" /> Mark all read</button>
            <button type="button" className={heroButton} onClick={onClear} disabled={clearRead.isPending}><Trash2 className="h-4 w-4" /> Clear read</button>
            <button type="button" className={heroButton} onClick={guide.open} aria-label="How this page works (G)"><Lightbulb className="h-4 w-4" /></button>
          </>
        }
        stats={s ? [
          { label: 'Unread', value: num(s.unread), hint: `of ${num(s.total)}` },
          { label: 'Urgent', value: num(urgent), hint: 'Unread' },
          { label: 'High priority', value: num(high), hint: 'Unread' },
          { label: 'Read', value: `${s.total ? Math.round(((s.total - s.unread) / s.total) * 100) : 0}%` },
        ] : undefined}
      />

      <ViewTabs
        tabs={TABS.map((t) => ({ id: t, label: statusLabel(t), count: s ? (t === 'unread' ? s.unread : t === 'urgent' ? urgent : null) : null }))}
        value={tab as Tab}
        onChange={(v) => list.setFilter('tab', v)}
      />

      <FilterBar
        search={<SearchField value={list.search} onChange={list.setSearch} placeholder="Search title or message" />}
        chips={chips.length ? chips : undefined}
        onClear={() => { clearPeriod(list); list.setFilter('type', 'ALL'); }}
      >
        <DateRangeMenu value={periodValue(list.filters)} onChange={(v) => setPeriod(list, v)} startHour={0} />
        <FilterMenu icon={Tag} label="Type" value={type} active={type !== 'ALL'} onChange={(v) => list.setFilter('type', v)} align="right" width="w-72"
          options={[{ value: 'ALL', label: 'All types' }, ...types.map((t) => ({ value: t.type, label: `${statusLabel(t.type)} (${t._count})` }))]} />
      </FilterBar>

      <ListCard
        loading={items.isLoading}
        empty={!rows.length}
        emptyIcon={<Bell className="h-6 w-6" />}
        emptyTitle="No notifications"
        emptyText={tab === 'unread' ? 'You are all caught up.' : 'Events from shops and payments appear here.'}
        page={list.page} limit={list.limit} total={items.data?.meta.total} onPage={list.setPage} onLimit={list.setLimit}
      >
        <ul className="divide-y divide-slate-100">
          {rows.map((n) => {
            const Icon = ICONS[n.type] ?? Info;
            return (
              <li key={n.id} className={cn('flex gap-3 px-4 py-3.5 sm:px-5', !n.isRead && 'bg-brand-50/40', n.priority === 'URGENT' && 'border-s-4 border-rose-500', n.priority === 'HIGH' && 'border-s-4 border-amber-500')}>
                <span className={cn('flex h-10 w-10 shrink-0 items-center justify-center rounded-xl', n.priority === 'URGENT' ? 'bg-rose-100 text-rose-700' : n.priority === 'HIGH' ? 'bg-amber-100 text-amber-700' : 'bg-slate-100 text-slate-600')}><Icon className="h-5 w-5" /></span>
                <div className="min-w-0 flex-1">
                  <div className="flex flex-wrap items-start justify-between gap-2">
                    <div className="min-w-0">
                      <h3 className={cn('text-[0.9375rem] text-slate-900', n.isRead ? 'font-medium' : 'font-bold')}>{n.title}</h3>
                      <p className="mt-0.5 text-[0.875rem] text-slate-600">{n.message}</p>
                    </div>
                    <div className="flex items-center gap-1.5">
                      {n.priority !== 'NORMAL' && <Badge variant={PRIORITY_TONE[n.priority]}>{statusLabel(n.priority)}</Badge>}
                      <Badge variant="info">{statusLabel(n.type)}</Badge>
                    </div>
                  </div>
                  <div className="mt-2 flex flex-wrap items-center gap-x-4 gap-y-1 text-[0.75rem]">
                    <span className="text-slate-500">{formatRelative(n.createdAt)}</span>
                    {n.link && (
                      <Link to={n.link} onClick={() => !n.isRead && markRead.mutate(n.id)} className="inline-flex items-center gap-1 font-semibold text-brand-700 hover:underline">
                        View details <ArrowRight className="h-3 w-3" />
                      </Link>
                    )}
                    {!n.isRead && <button type="button" onClick={() => markRead.mutate(n.id)} className="font-medium text-slate-600 hover:text-slate-900">Mark as read</button>}
                    <button type="button" onClick={() => remove.mutate(n.id)} className="inline-flex items-center gap-1 font-medium text-rose-600 hover:text-rose-700"><Trash2 className="h-3 w-3" /> Delete</button>
                  </div>
                </div>
              </li>
            );
          })}
        </ul>
      </ListCard>

      {guide.isOpen && (
        <PageGuide
          title="Notifications"
          description="Everything that needs the admin team's eyes: new shops, payments, expiring plans and alerts."
          flowTitle="From event to inbox"
          flow={[
            { label: 'Something happens', hint: 'Shop, payment, plan', icon: Building2, color: '#4f46e5' },
            { label: 'Notification arrives', icon: Bell, color: '#0284c7' },
            { label: 'You open it', hint: 'View details', icon: ArrowRight, color: '#d97706' },
            { label: 'Mark as read', icon: CheckCheck, color: '#059669' },
          ]}
          steps={[
            { icon: Bell, color: '#4f46e5', title: 'Start with unread', text: 'Use the Unread and Urgent tabs to see what still needs attention.' },
            { icon: Tag, color: '#0284c7', title: 'Filter', text: 'Narrow by type or period, or search the title and message.' },
            { icon: Trash2, color: '#e11d48', title: 'Tidy up', text: 'Mark all read, or clear read notifications to keep the inbox short.' },
          ]}
          tips={['Urgent items have a red edge, high priority ones an amber edge.']}
          shortcuts={[['/', 'Search'], ['G', 'This guide']]}
          onClose={guide.close}
        />
      )}
    </PageShell>
  );
}
