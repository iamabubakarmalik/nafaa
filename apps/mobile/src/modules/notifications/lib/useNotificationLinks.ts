/**
 * A tapped push notification opens its screen: when the app was closed
 * (the tap that started it), in the background, or in use. One listener for
 * every notification type; nothing mapped falls back to the Notifications
 * list. A tap is handled once even if more than one hook instance mounts.
 */

import * as Notifications from 'expo-notifications';
import { router } from 'expo-router';
import { useEffect } from 'react';
import { Linking } from 'react-native';
import { routeForNotificationLink } from './links';

const handled = new Set<string>();
let listeners = 0;
let sub: Notifications.EventSubscription | null = null;

function linkOf(response: Notifications.NotificationResponse): unknown {
  const data = (response.notification.request.content.data ?? {}) as { link?: unknown; url?: unknown; actionUrl?: unknown };
  return data.link ?? data.url ?? data.actionUrl;
}

function open(response: Notifications.NotificationResponse | null) {
  if (!response) return;
  const id = response.notification.request.identifier;
  if (handled.has(id)) return;
  handled.add(id);
  const link = linkOf(response);
  const route = routeForNotificationLink(link);
  setTimeout(() => {
    if (route) { router.push(route as never); return; }
    if (typeof link === 'string' && /^https?:\/\//i.test(link)) { void Linking.openURL(link); return; }
    router.push('/notifications' as never);
  }, 300);
}

export function useNotificationLinks(enabled: boolean) {
  useEffect(() => {
    if (!enabled) return;
    if (listeners === 0) {
      Notifications.getLastNotificationResponseAsync().then(open).catch(() => undefined);
      sub = Notifications.addNotificationResponseReceivedListener(open);
    }
    listeners += 1;
    return () => {
      listeners -= 1;
      if (listeners === 0) { sub?.remove(); sub = null; }
    };
  }, [enabled]);
}
