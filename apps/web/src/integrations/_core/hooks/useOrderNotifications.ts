import { useEffect, useRef } from 'react';
import { useQuery } from '@tanstack/react-query';
import { toast } from 'sonner';
import { integrationsApi } from '../api/integrations.api';

const SEEN_KEY = 'nafaa-seen-channel-orders';

const loadSeen = (): Set<string> => {
  try {
    const raw = localStorage.getItem(SEEN_KEY);
    return new Set(raw ? JSON.parse(raw) : []);
  } catch { return new Set(); }
};

const saveSeen = (seen: Set<string>) => {
  try {
    // Sirf last 500 IDs rakho
    const arr = Array.from(seen).slice(-500);
    localStorage.setItem(SEEN_KEY, JSON.stringify(arr));
  } catch {}
};

/**
 * Polls dashboard har 20 sec, aur naye pending orders pe:
 * - Browser notification (agar permission hai)
 * - Toast alert
 * - Beep sound
 */
export function useOrderNotifications() {
  const seenRef = useRef<Set<string>>(loadSeen());
  const audioRef = useRef<HTMLAudioElement | null>(null);
  const firstRunRef = useRef(true);

  useEffect(() => {
    // Beep sound (base64 short bell tone)
    audioRef.current = new Audio(
      'data:audio/wav;base64,UklGRhwMAABXQVZFZm10IBAAAAABAAEAQB8AAEAfAAABAAgAZGF0YfgLAACBgIB/f39+fn5+fX19fHx8e3t7ent7ent7ent7ent7fHx8fHx8fX19fn5+fn5+f39/gICAgIGBgYGBgYGBgYGBgYGBgYGBgYCAgICAgH9/f39+fn5+fX19fXx8fHx8fHx8fHx8fH19fX19fn5+fn5+f39/f4CAgICAgYGBgYGBgYGBgYGBgYGBgYGBgYCAgICAgH9/f39+fn5+fX19fXx8fHx8fHx8fHx8fH19fX19fn5+fn5+f39/f4CAgICAgYGBgYGBgYGBgYGBgYGBgYGBgYCAgICAgH9/f39+fn5+fX19fXx8fHx8fHx8fHx8fH19fX19fn5+fn5+f39/f4CAgICAgYGBgYGBgYGBgYGBgYGBgYGBgYCAgICAgH9/f39+fn5+fX19fXx8fHx8fHx8fHx8fH19fX19fn5+fn5+f39/f4CAgICAgYGBgYGBgYGBgYGBgYGBgYGBgYCAgICAgH9/f39+fn5+fX19fXx8fHx8fHx8fHx8fH19fX19fn5+fn5+f39/f4CAgICAgYGBgYGBgYGBgYGBgYGBgYGBgYCAgICAgH9/f39+fn5+fX19fXx8fHx8fHx8fHx8fH19fX19fn5+fn5+f39/f4CAgICAgYGBgYGBgYGBgYGBgYGBgYGBgYCAgICAgH9/f39+fn5+fX19fXx8fHx8fHx8fHx8fH19fX19fn5+fn5+f39/f4CAgICAgYGBgYGBgYGBgYGBgYGBgYGBgYCAgICAgH9/f39+fn5+fX19fXx8fHx8fHx8fHx8fH19fX19fn5+fn5+f39/f4CAgICAgYGBgYGBgYGBgYGBgYGBgYGBgYCAgICAgH9/f39+fn5+fX19fXx8fHx8fHx8fHx8fH19fX19fn5+fn5+f39/f4CAgICAgYGBgYGBgYGBgYGBgYGBgYGBgYCAgICAgH9/f39+fn5+fX19fXx8fHx8fHx8fHx8fH19fX19fn5+fn5+f39/f4CAgICAgYGBgYGBgYGBgYGBgYGBgYGBgYCAgICAgH9/f39+fn5+fX19fXx8fHx8fHx8fHx8fH19fX19fn5+fn5+f39/f4CAgICAgYGBgYGBgYGBgYGBgYGBgYGBgYCAgICAgH9/f39+fn5+fX19fXx8fHx8fHx8fHx=='
    );

    // Ask for notification permission on mount
    if ('Notification' in window && Notification.permission === 'default') {
      Notification.requestPermission();
    }
  }, []);

  useQuery({
    queryKey: ['channel-orders-poll'],
    queryFn: () => integrationsApi.dashboard(),
    refetchInterval: 20_000,
    onSuccess: (data: any) => {
      // First run — sirf existing orders "seen" mark karo
      if (firstRunRef.current) {
        firstRunRef.current = false;
        return;
      }

      const pendingCount = data?.orderCounts?.PENDING ?? 0;
      // Simple detection: agar counts badhe hain
      const currentSeenSize = seenRef.current.size;

      // Fetch actual orders — thin ping check
      integrationsApi.list().then((res: any) => {
        const integrations = res?.items ?? [];
        integrations.forEach((integration: any) => {
          if (integration.status !== 'CONNECTED') return;
          integrationsApi.listOrders(integration.id, 'PENDING', 10, 0).then((ordersRes: any) => {
            const orders = ordersRes?.items ?? [];
            orders.forEach((order: any) => {
              if (seenRef.current.has(order.id)) return;
              seenRef.current.add(order.id);
              saveSeen(seenRef.current);

              // 🔔 Beep
              audioRef.current?.play().catch(() => {});

              // 🍞 Toast
              toast.success(`🛍️ Naya order — ${integration.displayName}`, {
                description: `${order.customerName} · Rs ${Number(order.total).toFixed(0)}`,
                duration: 8000,
              });

              // 🖥️ Browser notification
              if ('Notification' in window && Notification.permission === 'granted') {
                new Notification(`Naya order — ${integration.displayName}`, {
                  body: `${order.customerName} · Rs ${Number(order.total).toFixed(0)} · ${order.items?.length ?? 0} items`,
                  icon: '/favicon.ico',
                  tag: order.id,
                });
              }
            });
          }).catch(() => {});
        });
      }).catch(() => {});
    },
  } as any);
}
