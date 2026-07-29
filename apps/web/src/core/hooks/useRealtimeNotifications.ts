import { useEffect, useRef } from 'react';
import { useQuery, useQueryClient } from '@tanstack/react-query';
import { toast } from 'sonner';
import { notificationsApi, type Notification } from '@modules/notifications/api/notifications.api';
import { useNotificationSound } from './useNotificationSound';

const SEEN_KEY = 'nafaa-notifications-seen-v2';
const URGENT_TYPES = ['OUT_OF_STOCK', 'PAYMENT_REJECTED', 'CREDIT_ALERT', 'ERROR', 'INVOICE_DUE', 'LOW_STOCK'];

const loadSeen = (): Set<string> => {
  try {
    const raw = localStorage.getItem(SEEN_KEY);
    return new Set(raw ? JSON.parse(raw) : []);
  } catch { return new Set(); }
};

const saveSeen = (seen: Set<string>) => {
  try {
    const arr = Array.from(seen).slice(-500); // keep last 500
    localStorage.setItem(SEEN_KEY, JSON.stringify(arr));
  } catch {}
};

/**
 * Realtime notification poller:
 * - Polls every 10 seconds for fresh notifications
 * - Plays LOUD sound + shows toast + browser notification for each NEW one
 * - Auto-requests browser notification permission on mount
 */
export function useRealtimeNotifications() {
  const queryClient = useQueryClient();
  const { play, playUrgent } = useNotificationSound();
  const seenRef = useRef<Set<string>>(loadSeen());
  const initializedRef = useRef(false);

  // Request browser notification permission on mount
  useEffect(() => {
    if (typeof window !== 'undefined' && 'Notification' in window) {
      if (Notification.permission === 'default') {
        Notification.requestPermission().catch(() => {});
      }
    }
  }, []);

  useQuery({
    queryKey: ['notifications-realtime-poll'],
    queryFn: async () => {
      const data = await notificationsApi.list({ limit: 20 });
      const items: Notification[] = data?.items ?? [];

      // First run — mark existing as seen, don't play sound
      if (!initializedRef.current) {
        items.forEach((n) => seenRef.current.add(n.id));
        saveSeen(seenRef.current);
        initializedRef.current = true;
        return items;
      }

      // Find new notifications
      const newOnes = items.filter((n) => !seenRef.current.has(n.id));

      if (newOnes.length > 0) {
        // Mark them as seen
        newOnes.forEach((n) => seenRef.current.add(n.id));
        saveSeen(seenRef.current);

        // Play sound (urgent if any is urgent)
        const hasUrgent = newOnes.some((n) => URGENT_TYPES.includes(n.type));
        if (hasUrgent) playUrgent();
        else play();

        // Show toast for each (max 3 to avoid spam)
        newOnes.slice(0, 3).forEach((n) => {
          const isUrgent = URGENT_TYPES.includes(n.type);
          const toastFn = isUrgent ? toast.error : toast.success;
          toastFn(n.title, {
            description: n.message,
            duration: isUrgent ? 10000 : 6000,
            action: n.link ? {
              label: 'View',
              onClick: () => { window.location.href = n.link!; },
            } : undefined,
          });

          // Browser notification
          if (typeof window !== 'undefined' && 'Notification' in window && Notification.permission === 'granted') {
            try {
              const notif = new Notification(n.title, {
                body: n.message,
                icon: '/favicon.ico',
                badge: '/favicon.ico',
                tag: n.id,
                requireInteraction: isUrgent,
                silent: false,
              });
              notif.onclick = () => {
                window.focus();
                if (n.link) window.location.href = n.link;
                notif.close();
              };
              // Auto-close after 15 sec (non-urgent)
              if (!isUrgent) {
                setTimeout(() => notif.close(), 15000);
              }
            } catch {}
          }
        });

        // Refresh notification queries
        queryClient.invalidateQueries({ queryKey: ['notifications'] });
      }

      return items;
    },
    refetchInterval: 10_000, // Every 10 seconds
    refetchIntervalInBackground: true,
    refetchOnWindowFocus: true,
    staleTime: 5_000,
  });
}
