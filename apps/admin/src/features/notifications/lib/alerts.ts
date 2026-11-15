/**
 * How a new notification reaches the admin: a short chime (Web Audio, no
 * file) and a desktop notification while the tab is hidden. Desktop
 * permission is only asked from a button (askDesktopPermission), never on
 * page load.
 *
 * With several admin tabs open, only the first tab to see a notification
 * plays the sound or shows the desktop alert (claimAlert, via localStorage).
 */

import type { NotifySeverity } from '@/api/admin-notifications.api';

let ctx: AudioContext | null = null;

/** Two soft notes; critical alerts play a third, higher one. */
export function playChime(severity: NotifySeverity = 'info') {
  try {
    const AC = window.AudioContext ?? (window as unknown as { webkitAudioContext?: typeof AudioContext }).webkitAudioContext;
    if (!AC) return;
    ctx ??= new AC();
    if (ctx.state === 'suspended') void ctx.resume().catch(() => undefined);
    const notes = severity === 'critical' ? [880, 660, 988] : severity === 'warning' ? [784, 988] : [659, 880];
    const start = ctx.currentTime + 0.02;
    notes.forEach((freq, i) => {
      const osc = ctx!.createOscillator();
      const gain = ctx!.createGain();
      osc.type = 'sine';
      osc.frequency.value = freq;
      const t = start + i * 0.14;
      gain.gain.setValueAtTime(0.0001, t);
      gain.gain.exponentialRampToValueAtTime(0.18, t + 0.02);
      gain.gain.exponentialRampToValueAtTime(0.0001, t + 0.35);
      osc.connect(gain).connect(ctx!.destination);
      osc.start(t);
      osc.stop(t + 0.4);
    });
  } catch {
    // Sound is a nice-to-have.
  }
}

export type DesktopState = 'unsupported' | 'default' | 'granted' | 'denied';

export function desktopState(): DesktopState {
  if (typeof window === 'undefined' || !('Notification' in window)) return 'unsupported';
  return Notification.permission as DesktopState;
}

/** Call only from a click. */
export async function askDesktopPermission(): Promise<DesktopState> {
  if (desktopState() === 'unsupported') return 'unsupported';
  try {
    return (await Notification.requestPermission()) as DesktopState;
  } catch {
    return desktopState();
  }
}

export function showDesktop(n: { id: string; title: string; message: string; link?: string | null }, onOpen: (link: string) => void) {
  if (desktopState() !== 'granted') return;
  try {
    const d = new Notification(n.title, { body: n.message.slice(0, 180), tag: `nafaa-admin-${n.id}`, icon: '/apple-touch-icon.png' });
    d.onclick = () => {
      window.focus();
      if (n.link) onOpen(n.link);
      d.close();
    };
  } catch {
    // Some browsers only allow notifications from a service worker.
  }
}

const CLAIM_KEY = 'nafaa-admin-alerted';

/** True for the first tab that alerts about this notification occurrence. */
export function claimAlert(key: string): boolean {
  try {
    const raw = localStorage.getItem(CLAIM_KEY);
    const seen: string[] = raw ? JSON.parse(raw) : [];
    if (seen.includes(key)) return false;
    localStorage.setItem(CLAIM_KEY, JSON.stringify([...seen.slice(-99), key]));
    return true;
  } catch {
    return true;
  }
}
