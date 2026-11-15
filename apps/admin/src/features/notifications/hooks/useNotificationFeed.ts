/**
 * Live admin notifications: polls /admin/notifications/feed every 15 seconds
 * (also while the tab is hidden, so desktop alerts arrive), keeps the bell's
 * unread count, and alerts for each new notification the way the API says
 * this admin wants (toast, chime, desktop). Mounted once, by the bell.
 */

import { useEffect, useRef } from 'react';
import { useQuery, useQueryClient } from '@tanstack/react-query';
import { useNavigate } from 'react-router-dom';
import { toast } from 'sonner';
import { adminNotificationsApi, type FeedItem, type NotifySeverity } from '@/api/admin-notifications.api';
import { useCan } from '@/lib/access';
import { claimAlert, playChime, showDesktop } from '../lib/alerts';
import { useSupportLive } from '@/features/support/lib/live';
import { playSupportMessage } from '@/features/support/lib/tones';

export const FEED_KEY = ['admin-notify-feed'] as const;
const POLL_MS = 15_000;
const RANK: Record<NotifySeverity, number> = { info: 0, warning: 1, critical: 2 };

export function useNotificationFeed() {
  const can = useCan();
  const enabled = can('notifications.view');
  const cursor = useRef<string | undefined>(undefined);
  const qc = useQueryClient();
  const navigate = useNavigate();

  const feed = useQuery({
    queryKey: FEED_KEY,
    queryFn: async () => {
      const data = await adminNotificationsApi.feed(cursor.current);
      cursor.current = data.now;
      return data;
    },
    enabled,
    refetchInterval: POLL_MS,
    refetchIntervalInBackground: true,
    refetchOnWindowFocus: true,
    staleTime: 5_000,
  });

  const handled = useRef(0);
  useEffect(() => {
    const data = feed.data;
    if (!data || feed.dataUpdatedAt === handled.current) return;
    handled.current = feed.dataUpdatedAt;
    if (!data.items.length) return;
    qc.invalidateQueries({ queryKey: ['admin-notifications-page'] });
    qc.invalidateQueries({ queryKey: ['admin-notifications-stats'] });
    qc.invalidateQueries({ queryKey: ['admin-notifications-list'] });
    alertFor(data.items, (link) => navigate(link));
  }, [feed.data, feed.dataUpdatedAt, qc, navigate]);

  return { enabled, unread: feed.data?.unread ?? { total: 0, urgent: 0, high: 0 }, refresh: () => feed.refetch() };
}

function alertFor(items: FeedItem[], open: (link: string) => void) {
  const fresh = items.filter((n) => claimAlert(`${n.id}:${n.lastAt}`));
  if (!fresh.length) return;

  // Live support has its own tone; while its socket is connected it also shows its own desktop alerts.
  const supportLive = useSupportLive.getState().connected;
  const loud = fresh.filter((n) => n.alert.sound && n.category !== 'support');
  if (loud.length) playChime(loud.reduce<NotifySeverity>((s, n) => (RANK[n.severity] > RANK[s] ? n.severity : s), 'info'));
  if (!supportLive && fresh.some((n) => n.alert.sound && n.category === 'support')) playSupportMessage();

  if (document.visibilityState === 'hidden') {
    for (const n of fresh.filter((x) => x.alert.desktop && !(supportLive && x.category === 'support')).slice(-3)) showDesktop({ ...n, title: titleOf(n) }, open);
  }

  const toasts = fresh.filter((n) => n.alert.toast);
  if (toasts.length > 3) {
    toast.message(`${toasts.length} new notifications`, {
      description: toasts.slice(-3).map((n) => titleOf(n)).join(' · '),
      action: { label: 'Open', onClick: () => open('/notifications?status=unread') },
    });
    return;
  }
  for (const n of toasts) {
    const opts = {
      description: n.message.length > 160 ? `${n.message.slice(0, 157)}…` : n.message,
      duration: n.severity === 'critical' ? 15_000 : 7_000,
      action: n.link ? { label: 'Open', onClick: () => open(n.link!) } : undefined,
    };
    if (n.severity === 'critical') toast.error(titleOf(n), opts);
    else if (n.severity === 'warning') toast.warning(titleOf(n), opts);
    else toast.info(titleOf(n), opts);
  }
}

const titleOf = (n: { title: string; occurrences: number }) => (n.occurrences > 1 ? `${n.title} (×${n.occurrences})` : n.title);
