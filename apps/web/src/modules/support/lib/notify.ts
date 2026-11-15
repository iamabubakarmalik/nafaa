/**
 * Alerts for a new support message: the soft support tone and, while the
 * tab is hidden, a browser notification. Both follow the person's
 * notification choices (modules/notifications): nothing plays when the
 * browser is muted, in quiet hours or with the "Silent" tone; quiet hours
 * also hold back the browser notification. Calls ring regardless of quiet
 * hours but still respect "muted on this browser".
 */

import { queryClient } from '@core/lib/queryClient';
import { ALERT_PREFS_KEY, inQuietHours, isMutedHere } from '@modules/notifications/alertPrefs';
import type { AlertPrefs } from '@modules/notifications/api/notifications.api';
import { playSupportTone, startRingtone } from './sounds';

const prefs = () => queryClient.getQueryData<AlertPrefs>(ALERT_PREFS_KEY);

function soundAllowed(): boolean {
  const p = prefs();
  if (isMutedHere()) return false;
  if (p && (p.sound === 'silent' || inQuietHours(p))) return false;
  return true;
}

function quiet(): boolean {
  const p = prefs();
  return !!p && inQuietHours(p);
}

export function canShowBrowserNotice(): boolean {
  return typeof window !== 'undefined' && 'Notification' in window && Notification.permission === 'granted';
}

/** Asks once for permission to show browser notifications (from a click). */
export function askNotificationPermission() {
  try {
    if ('Notification' in window && Notification.permission === 'default') void Notification.requestPermission().catch(() => undefined);
  } catch { /* unsupported */ }
}

function browserNotice(title: string, body: string, tag: string, onClick: () => void, sticky = false) {
  if (!canShowBrowserNotice() || !document.hidden) return null;
  try {
    const n = new Notification(title, { body, tag, icon: '/favicon.ico', badge: '/favicon.ico', silent: true, requireInteraction: sticky });
    n.onclick = () => { window.focus(); onClick(); n.close(); };
    if (!sticky) window.setTimeout(() => n.close(), 15_000);
    return n;
  } catch {
    return null;
  }
}

/** New message from the team: tone, and a browser notification when the tab is hidden. */
export function alertSupportMessage(title: string, body: string, onClick: () => void) {
  if (soundAllowed()) playSupportTone();
  if (!quiet()) browserNotice(title, body, 'nafaa-support', onClick);
}

/** Incoming call: ring until the returned function is called. */
export function alertIncomingCall(title: string, body: string, onClick: () => void = () => undefined): () => void {
  const stop = isMutedHere() ? () => undefined : startRingtone(false);
  const n = browserNotice(title, body, 'nafaa-support-call', onClick, true);
  return () => { stop(); n?.close(); };
}
