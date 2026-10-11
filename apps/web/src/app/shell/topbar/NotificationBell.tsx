/**
 * Notification bell and panel.
 *
 * Polls the unread count and the latest 20 notifications every 30 seconds,
 * plays a sound when new ones arrive (a distinct sound for urgent types), and
 * shows them in a panel with All / Unread tabs grouped into Today and Earlier.
 */

import { useCallback, useEffect, useMemo, useRef, useState } from 'react';
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import { Link, useNavigate } from 'react-router-dom';
import {
  AlertCircle, AlertTriangle, ArrowLeftRight, Bell, BellOff, CheckCheck, Crown, DollarSign, Info,
  Package, Receipt, Settings as SettingsIcon, ShoppingCart, Trash2, UserPlus, Volume2, VolumeX, Wallet,
  type LucideIcon,
} from 'lucide-react';
import { notificationsApi, type Notification, type NotificationType } from '@modules/notifications/api/notifications.api';
import { useNotificationSound } from '@core/hooks/useNotificationSound';
import { cn } from '@core/lib/cn';
import { IconButton } from '@/design-system/components';
import { Panel, useDismiss } from '../ui';

type Tone = 'info' | 'success' | 'warning' | 'danger' | 'violet' | 'cyan' | 'orange' | 'neutral';

const TYPE_META: Record<NotificationType, { icon: LucideIcon; tone: Tone }> = {
  INFO: { icon: Info, tone: 'info' },
  SUCCESS: { icon: CheckCheck, tone: 'success' },
  WARNING: { icon: AlertTriangle, tone: 'warning' },
  ERROR: { icon: AlertCircle, tone: 'danger' },
  LOW_STOCK: { icon: AlertTriangle, tone: 'warning' },
  OUT_OF_STOCK: { icon: AlertCircle, tone: 'danger' },
  NEW_SALE: { icon: ShoppingCart, tone: 'success' },
  PAYMENT_RECEIVED: { icon: DollarSign, tone: 'success' },
  PAYMENT_APPROVED: { icon: CheckCheck, tone: 'success' },
  PAYMENT_REJECTED: { icon: AlertCircle, tone: 'danger' },
  RETURN_PROCESSED: { icon: Package, tone: 'violet' },
  NEW_CUSTOMER: { icon: UserPlus, tone: 'info' },
  STOCK_TRANSFER: { icon: ArrowLeftRight, tone: 'cyan' },
  EXPENSE_ADDED: { icon: Receipt, tone: 'orange' },
  INVOICE_DUE: { icon: AlertTriangle, tone: 'warning' },
  SUBSCRIPTION_EXPIRING: { icon: Crown, tone: 'warning' },
  REGISTER_OPENED: { icon: Wallet, tone: 'info' },
  REGISTER_CLOSED: { icon: Wallet, tone: 'neutral' },
  CREDIT_ALERT: { icon: AlertTriangle, tone: 'danger' },
  SYSTEM: { icon: Info, tone: 'neutral' },
};

const TONE_CLASS: Record<Tone, string> = {
  info: 'bg-blue-50 text-blue-600',
  success: 'bg-success-50 text-success-600',
  warning: 'bg-amber-50 text-amber-600',
  danger: 'bg-rose-50 text-rose-600',
  violet: 'bg-violet-50 text-violet-600',
  cyan: 'bg-cyan-50 text-cyan-600',
  orange: 'bg-orange-50 text-orange-600',
  neutral: 'bg-slate-100 text-slate-600',
};

const URGENT_TYPES: NotificationType[] = ['OUT_OF_STOCK', 'PAYMENT_REJECTED', 'CREDIT_ALERT', 'ERROR', 'INVOICE_DUE'];

function formatTime(value: string) {
  const date = new Date(value);
  const mins = Math.floor((Date.now() - date.getTime()) / 60000);
  if (mins < 1) return 'Just now';
  if (mins < 60) return `${mins}m ago`;
  const hours = Math.floor(mins / 60);
  if (hours < 24) return `${hours}h ago`;
  const days = Math.floor(hours / 24);
  if (days < 7) return `${days}d ago`;
  return new Intl.DateTimeFormat('en-PK', { dateStyle: 'medium' }).format(date);
}

const isToday = (value: string) => new Date(value).toDateString() === new Date().toDateString();

export default function NotificationBell() {
  const [open, setOpen] = useState(false);
  const [tab, setTab] = useState<'all' | 'unread'>('all');
  const ref = useRef<HTMLDivElement>(null);
  const navigate = useNavigate();
  const queryClient = useQueryClient();
  const { play, playUrgent, isMuted, setMuted } = useNotificationSound();
  const [muted, setMutedState] = useState(false);
  const seenIds = useRef<Set<string>>(new Set());
  const initialized = useRef(false);

  const close = useCallback(() => setOpen(false), []);
  useDismiss(ref, open, close);
  useEffect(() => { setMutedState(isMuted()); }, [isMuted]);

  const { data: unreadCount = 0 } = useQuery({
    queryKey: ['notifications', 'count'],
    queryFn: () => notificationsApi.unreadCount(),
    refetchInterval: 30_000,
    refetchOnWindowFocus: true,
  });
  const { data } = useQuery({
    queryKey: ['notifications', 'list', { limit: 20 }],
    queryFn: () => notificationsApi.list({ limit: 20 }),
    refetchInterval: 30_000,
  });
  const notifications: Notification[] = useMemo(() => data?.items ?? [], [data]);

  // Play a sound for notifications that arrived since the last poll.
  useEffect(() => {
    if (!notifications.length) return;
    if (!initialized.current) {
      notifications.forEach((n) => seenIds.current.add(n.id));
      initialized.current = true;
      return;
    }
    const fresh = notifications.filter((n) => !seenIds.current.has(n.id) && !n.isRead);
    if (fresh.length) {
      if (fresh.some((n) => URGENT_TYPES.includes(n.type))) playUrgent();
      else play();
    }
    notifications.forEach((n) => seenIds.current.add(n.id));
  }, [notifications, play, playUrgent]);

  const invalidate = () => queryClient.invalidateQueries({ queryKey: ['notifications'] });
  const markRead = useMutation({ mutationFn: (id: string) => notificationsApi.markRead(id), onSuccess: invalidate });
  const markAll = useMutation({ mutationFn: () => notificationsApi.markAllRead(), onSuccess: invalidate });
  const remove = useMutation({ mutationFn: (id: string) => notificationsApi.remove(id), onSuccess: invalidate });

  const toggleSound = () => {
    const next = !muted;
    setMuted(next);
    setMutedState(next);
    if (!next) play();
  };

  const openNotification = (n: Notification) => {
    if (!n.isRead) markRead.mutate(n.id);
    if (n.link) {
      setOpen(false);
      navigate(n.link);
    }
  };

  const shown = tab === 'unread' ? notifications.filter((n) => !n.isRead) : notifications;
  const groups = [
    { label: 'Today', items: shown.filter((n) => isToday(n.createdAt)) },
    { label: 'Earlier', items: shown.filter((n) => !isToday(n.createdAt)) },
  ].filter((g) => g.items.length);

  return (
    <div className="relative" ref={ref}>
      <IconButton
        label={unreadCount ? `Notifications, ${unreadCount} unread` : 'Notifications'}
        onClick={() => setOpen((v) => !v)}
        aria-expanded={open}
        className={cn('relative h-9 w-9', open && 'bg-slate-900/5 text-slate-900')}
      >
        <Bell className="h-[1.125rem] w-[1.125rem]" />
        {unreadCount > 0 && (
          <span className="absolute -right-0.5 -top-0.5 flex h-[1.125rem] min-w-[1.125rem] items-center justify-center rounded-full bg-rose-600 px-1 text-[0.625rem] font-bold tabular-nums text-white ring-2 ring-shell-bar">
            {unreadCount > 99 ? '99+' : unreadCount}
          </span>
        )}
      </IconButton>

      <Panel open={open} onClose={close} widthClass="sm:w-[24rem]" label="Notifications">
        <div className="flex items-center justify-between gap-2 px-4 pb-2 pt-3">
          <div className="flex items-baseline gap-2">
            <h2 className="text-[0.9375rem] font-semibold text-slate-900">Notifications</h2>
            {unreadCount > 0 && <span className="text-[0.75rem] font-medium text-slate-500">{unreadCount} unread</span>}
          </div>
          <div className="flex items-center gap-0.5">
            <IconButton label={muted ? 'Turn sound on' : 'Turn sound off'} onClick={toggleSound} className="h-8 w-8">
              {muted ? <VolumeX className="h-4 w-4" /> : <Volume2 className="h-4 w-4" />}
            </IconButton>
            <Link to="/settings" onClick={close} aria-label="Notification settings" title="Notification settings"
              className="inline-flex h-8 w-8 items-center justify-center rounded-lg text-slate-500 transition hover:bg-slate-900/5 hover:text-slate-900">
              <SettingsIcon className="h-4 w-4" />
            </Link>
          </div>
        </div>

        <div className="flex items-center justify-between gap-2 border-b border-slate-200 px-4">
          <div className="flex gap-4" role="tablist">
            {(['all', 'unread'] as const).map((t) => (
              <button
                key={t}
                type="button"
                role="tab"
                aria-selected={tab === t}
                onClick={() => setTab(t)}
                className={cn(
                  '-mb-px border-b-2 py-2 text-[0.8125rem] font-semibold transition',
                  tab === t ? 'border-brand-600 text-slate-900' : 'border-transparent text-slate-500 hover:text-slate-800',
                )}
              >
                {t === 'all' ? 'All' : `Unread${unreadCount ? ` (${unreadCount})` : ''}`}
              </button>
            ))}
          </div>
          {unreadCount > 0 && (
            <button type="button" onClick={() => markAll.mutate()} disabled={markAll.isPending}
              className="inline-flex items-center gap-1 text-[0.75rem] font-semibold text-brand-700 transition hover:text-brand-800 disabled:opacity-50">
              <CheckCheck className="h-3.5 w-3.5" /> Mark all read
            </button>
          )}
        </div>

        <div className="min-h-0 flex-1 overflow-y-auto overscroll-contain sm:max-h-[28rem]">
          {groups.length === 0 ? (
            <div className="px-6 py-14 text-center">
              <span className="mx-auto flex h-12 w-12 items-center justify-center rounded-2xl bg-slate-100 text-slate-400">
                <BellOff className="h-5 w-5" />
              </span>
              <div className="mt-3 text-[0.875rem] font-semibold text-slate-900">
                {tab === 'unread' ? 'You are all caught up' : 'No notifications yet'}
              </div>
              <p className="mx-auto mt-1 max-w-[16rem] text-[0.8125rem] text-slate-500">
                Sales, stock alerts and payments will show up here.
              </p>
            </div>
          ) : (
            groups.map((g) => (
              <div key={g.label}>
                <div className="px-4 pb-1 pt-3 text-[0.6875rem] font-semibold uppercase tracking-wide text-slate-400">{g.label}</div>
                <ul>
                  {g.items.map((n) => {
                    const meta = TYPE_META[n.type] ?? TYPE_META.SYSTEM;
                    const Icon = meta.icon;
                    const urgent = URGENT_TYPES.includes(n.type) && !n.isRead;
                    return (
                      <li key={n.id}>
                        <div
                          role="button"
                          tabIndex={0}
                          onClick={() => openNotification(n)}
                          onKeyDown={(e) => { if (e.key === 'Enter') openNotification(n); }}
                          className="group relative flex cursor-pointer gap-3 px-4 py-2.5 transition-colors hover:bg-slate-50 focus-visible:bg-slate-50 focus-visible:outline-none"
                        >
                          <span className={cn('mt-0.5 flex h-8 w-8 shrink-0 items-center justify-center rounded-lg', TONE_CLASS[meta.tone])}>
                            <Icon className="h-4 w-4" />
                          </span>
                          <div className="min-w-0 flex-1">
                            <div className="flex items-start gap-2">
                              <span className={cn('min-w-0 flex-1 text-[0.8125rem] leading-snug', n.isRead ? 'font-medium text-slate-700' : 'font-semibold text-slate-900')}>
                                {n.title}
                              </span>
                              {!n.isRead && <span className="mt-1.5 h-2 w-2 shrink-0 rounded-full bg-brand-600" aria-label="Unread" />}
                            </div>
                            {n.message && <p className="mt-0.5 line-clamp-2 text-[0.75rem] leading-relaxed text-slate-500">{n.message}</p>}
                            <div className="mt-1 flex items-center gap-2 text-[0.6875rem] text-slate-400">
                              <span>{formatTime(n.createdAt)}</span>
                              {urgent && <span className="rounded bg-rose-50 px-1.5 py-0.5 font-semibold text-rose-700">Urgent</span>}
                            </div>
                          </div>
                          <button
                            type="button"
                            onClick={(e) => { e.stopPropagation(); remove.mutate(n.id); }}
                            aria-label="Delete notification"
                            title="Delete"
                            className="h-7 w-7 shrink-0 self-center rounded-md text-slate-400 opacity-0 transition hover:bg-rose-50 hover:text-rose-600 focus-visible:opacity-100 group-hover:opacity-100 [@media(hover:none)]:opacity-60"
                          >
                            <Trash2 className="mx-auto h-3.5 w-3.5" />
                          </button>
                        </div>
                      </li>
                    );
                  })}
                </ul>
              </div>
            ))
          )}
        </div>

        <Link to="/notifications" onClick={close}
          className="block border-t border-slate-200 px-4 py-2.5 text-center text-[0.8125rem] font-semibold text-brand-700 transition hover:bg-slate-50">
          View all notifications
        </Link>
      </Panel>
    </div>
  );
}
