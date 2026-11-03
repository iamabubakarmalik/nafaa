/**
 * The signed-in person's notification choices (shared with the mobile app)
 * and the bundled tones (`public/sounds`). Live notifications play the
 * chosen tone, stay quiet in quiet hours and when muted on this browser.
 */

import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import { toast } from 'sonner';
import { t as tr } from '@core/i18n';
import { notificationsApi, type AlertPrefs, type AlertPrefsPatch, type AlertSound } from './api/notifications.api';

export const ALERT_PREFS_KEY = ['notification-prefs'];

const MUTE_KEY = 'nafaa-notifications-muted';
const VOLUME_KEY = 'nafaa-notifications-volume';

export function useAlertPrefs(enabled = true) {
  const qc = useQueryClient();
  const q = useQuery({ queryKey: ALERT_PREFS_KEY, queryFn: notificationsApi.prefs, staleTime: 5 * 60_000, enabled });
  const m = useMutation({
    mutationFn: notificationsApi.updatePrefs,
    onMutate: async (patch: AlertPrefsPatch) => {
      await qc.cancelQueries({ queryKey: ALERT_PREFS_KEY });
      const prev = qc.getQueryData<AlertPrefs>(ALERT_PREFS_KEY);
      if (prev) {
        const { events, ...rest } = patch;
        qc.setQueryData<AlertPrefs>(ALERT_PREFS_KEY, {
          ...prev, ...rest,
          events: prev.events.map((e) => (events?.[e.event] ? { ...e, ...events[e.event] } : e)),
        });
      }
      return { prev };
    },
    onError: (_e, _p, ctx) => {
      if (ctx?.prev) qc.setQueryData(ALERT_PREFS_KEY, ctx.prev);
      toast.error(tr('Save nahi hua'));
    },
    onSuccess: (data) => qc.setQueryData(ALERT_PREFS_KEY, data),
  });
  return { q, prefs: q.data, save: m.mutate };
}

export const toneLabel = (s: AlertSound): string =>
  ({ chime: tr('Nafaa chime'), cash: tr('Cash register'), bell: tr('Soft bell'), alert: tr('Alert'), silent: tr('Silent') })[s];

const cache = new Map<string, HTMLAudioElement>();

/** Plays a bundled tone; browsers may block it until the page was clicked once. */
export function playTone(sound: AlertSound) {
  if (sound === 'silent' || typeof window === 'undefined') return;
  try {
    let a = cache.get(sound);
    if (!a) { a = new Audio(`/sounds/${sound}.wav`); cache.set(sound, a); }
    const v = Number(localStorage.getItem(VOLUME_KEY));
    a.volume = Number.isFinite(v) && localStorage.getItem(VOLUME_KEY) !== null ? Math.min(1, Math.max(0, v)) : 0.9;
    a.currentTime = 0;
    void a.play().catch(() => undefined);
  } catch { /* audio unavailable */ }
}

export function isMutedHere(): boolean {
  try { return localStorage.getItem(MUTE_KEY) === '1'; } catch { return false; }
}

/** Quiet hours on this computer's clock ("HH:mm", may cross midnight). */
export function inQuietHours(p: Pick<AlertPrefs, 'quietHours' | 'quietStart' | 'quietEnd'>, now = new Date()): boolean {
  if (!p.quietHours) return false;
  const at = now.getHours() * 60 + now.getMinutes();
  const mins = (s: string) => { const [h, m] = s.split(':').map(Number); return (h || 0) * 60 + (m || 0); };
  const start = mins(p.quietStart);
  const end = mins(p.quietEnd);
  if (start === end) return false;
  return start < end ? at >= start && at < end : at >= start || at < end;
}
