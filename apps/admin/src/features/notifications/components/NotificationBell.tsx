/**
 * Top-bar bell: unread count from the live feed, the latest notifications in
 * a panel, and the alert settings. It also runs the live feed that shows
 * toasts, plays the chime and raises desktop alerts.
 */

import { useCallback, useRef, useState } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import { ArrowRight, Bell, BellRing, CheckCheck, Settings2 } from 'lucide-react';
import { IconButton } from '@/design-system/components';
import { Panel, useDismiss } from '@web-shell/ui';
import { adminNotificationsApi, type AdminNotification } from '@/api/admin-notifications.api';
import { useCan } from '@/lib/access';
import { formatRelative } from '@/lib/format';
import { cn } from '@/lib/cn';
import { FEED_KEY, useNotificationFeed } from '../hooks/useNotificationFeed';
import { SEVERITY_META, categoryMeta } from '../lib/meta';
import { AlertSettingsDrawer } from './AlertSettingsDrawer';

export default function NotificationBell() {
  const [open, setOpen] = useState(false);
  const [settings, setSettings] = useState(false);
  const ref = useRef<HTMLDivElement>(null);
  const close = useCallback(() => setOpen(false), []);
  useDismiss(ref, open, close);
  const qc = useQueryClient();
  const can = useCan();
  const navigate = useNavigate();
  const { enabled, unread } = useNotificationFeed();

  const list = useQuery({
    queryKey: ['admin-notifications-list'],
    queryFn: () => adminNotificationsApi.list({ limit: 12 }),
    enabled: open && enabled,
  });

  const refresh = () => {
    qc.invalidateQueries({ queryKey: FEED_KEY });
    qc.invalidateQueries({ queryKey: ['admin-notifications-list'] });
    qc.invalidateQueries({ queryKey: ['admin-notifications-page'] });
    qc.invalidateQueries({ queryKey: ['admin-notifications-stats'] });
  };
  const markRead = useMutation({ mutationFn: adminNotificationsApi.markRead, onSuccess: refresh });
  const markAll = useMutation({ mutationFn: () => adminNotificationsApi.markAllRead(), onSuccess: refresh });
  const canManage = can('notifications.manage');

  if (!enabled) return null;

  const onItem = (n: AdminNotification) => {
    if (!n.isRead && canManage) markRead.mutate(n.id);
    setOpen(false);
    if (n.link) navigate(n.link);
  };

  const rows = list.data?.items ?? [];
  const urgent = unread.urgent > 0;

  return (
    <div ref={ref} className="relative">
      <IconButton
        label={unread.total ? `Notifications, ${unread.total} unread` : 'Notifications'}
        onClick={() => setOpen((v) => !v)}
        className={cn('relative h-9 w-9', urgent && 'text-rose-600')}
      >
        {urgent ? <BellRing className="h-[1.125rem] w-[1.125rem]" /> : <Bell className="h-[1.125rem] w-[1.125rem]" />}
        {unread.total > 0 && (
          <span className={cn('absolute -end-0.5 -top-0.5 flex h-[1.125rem] min-w-[1.125rem] items-center justify-center rounded-full px-1 text-[0.625rem] font-bold text-white', urgent ? 'bg-rose-600' : 'bg-brand-600')}>
            {unread.total > 99 ? '99+' : unread.total}
          </span>
        )}
      </IconButton>

      <Panel open={open} onClose={close} widthClass="sm:w-[26rem]" label="Notifications">
        <div className="flex items-center justify-between gap-2 border-b border-slate-200 px-4 py-3">
          <div className="min-w-0">
            <div className="text-[0.875rem] font-semibold text-slate-900">Notifications</div>
            <div className="text-[0.75rem] text-slate-500">
              {unread.total ? `${unread.total} unread` : 'All caught up'}
              {urgent && <span className="font-semibold text-rose-600"> · {unread.urgent} critical</span>}
            </div>
          </div>
          <div className="flex items-center gap-1">
            {canManage && unread.total > 0 && (
              <button type="button" onClick={() => markAll.mutate()} disabled={markAll.isPending} className="inline-flex items-center gap-1 rounded-lg px-2 py-1.5 text-[0.75rem] font-medium text-brand-700 hover:bg-brand-50">
                <CheckCheck className="h-3.5 w-3.5" /> Mark all read
              </button>
            )}
            <IconButton label="Alert settings" onClick={() => { setOpen(false); setSettings(true); }} className="h-8 w-8">
              <Settings2 className="h-4 w-4" />
            </IconButton>
          </div>
        </div>

        <div className="max-h-[min(28rem,60vh)] overflow-y-auto">
          {list.isLoading ? (
            <div className="space-y-2 p-4">{[0, 1, 2].map((i) => <div key={i} className="h-14 animate-pulse rounded-lg bg-slate-100" />)}</div>
          ) : !rows.length ? (
            <div className="px-6 py-10 text-center">
              <Bell className="mx-auto h-8 w-8 text-slate-300" />
              <p className="mt-2 text-[0.8125rem] text-slate-500">No notifications yet</p>
            </div>
          ) : (
            <ul className="divide-y divide-slate-100">
              {rows.map((n) => {
                const cat = categoryMeta(n.category);
                const sev = SEVERITY_META[n.severity] ?? SEVERITY_META.info;
                const Icon = n.severity === 'info' ? cat.icon : sev.icon;
                return (
                  <li key={n.id}>
                    <button type="button" onClick={() => onItem(n)} className={cn('flex w-full gap-3 px-4 py-3 text-start transition hover:bg-slate-50', sev.edge, !n.isRead && 'bg-brand-50/40')}>
                      <span className={cn('flex h-9 w-9 shrink-0 items-center justify-center rounded-lg', n.severity === 'info' ? cat.tone : sev.iconTone)}>
                        <Icon className="h-4 w-4" />
                      </span>
                      <span className="min-w-0 flex-1">
                        <span className={cn('block text-[0.8125rem] text-slate-900', n.isRead ? 'font-medium' : 'font-semibold')}>
                          {n.title}
                          {n.occurrences > 1 && <span className="ms-1.5 rounded bg-slate-100 px-1 text-[0.6875rem] font-semibold text-slate-600">×{n.occurrences}</span>}
                        </span>
                        <span className="mt-0.5 line-clamp-2 block text-[0.75rem] text-slate-600">{n.message}</span>
                        <span className="mt-1 block text-[0.6875rem] text-slate-400">{cat.label} · {formatRelative(n.lastAt ?? n.createdAt)}</span>
                      </span>
                      {!n.isRead && <span className="mt-1.5 h-2 w-2 shrink-0 rounded-full bg-brand-600" aria-label="Unread" />}
                    </button>
                  </li>
                );
              })}
            </ul>
          )}
        </div>

        <Link to="/notifications" onClick={close} className="flex items-center justify-center gap-1 border-t border-slate-200 px-4 py-3 text-[0.8125rem] font-semibold text-brand-700 hover:bg-slate-50">
          Open notification center <ArrowRight className="h-3.5 w-3.5" />
        </Link>
      </Panel>

      <AlertSettingsDrawer open={settings} onClose={() => setSettings(false)} />
    </div>
  );
}
