/**
 * Pure rules for staff alerts: a person's effective choices, quiet hours,
 * sale summary windows and the Android channel for a push. No database
 * access here, so every rule is unit tested on its own.
 */

import { hasPermission } from '../../../common/constants/permissions.constants';
import { tzParts } from '../../../common/helpers/business-time.helper';
import {
  ALERT_EVENTS, EVENT_SPECS, isAlertEvent, isAlertSound,
  type AlertEvent, type AlertSound, type ChannelSwitch,
} from './alert-catalog';

export const DIGEST_CHOICES = [0, 5, 15, 30, 60] as const;

export interface AlertPrefs {
  events: Partial<Record<AlertEvent, Partial<ChannelSwitch>>>;
  sound: AlertSound;
  vibrate: boolean;
  quietHours: boolean;
  quietStart: string;
  quietEnd: string;
  saleMinAmount: number;
  saleDigestMinutes: number;
  discountPercent: number;
}

export const DEFAULT_PREFS: AlertPrefs = {
  events: {},
  sound: 'chime',
  vibrate: true,
  quietHours: false,
  quietStart: '22:00',
  quietEnd: '08:00',
  saleMinAmount: 0,
  saleDigestMinutes: 15,
  discountPercent: 20,
};

export interface AlertPerson {
  id: string;
  role: string;
  permissions: string[];
  shopId: string | null;
}

const HHMM = /^([01]\d|2[0-3]):[0-5]\d$/;

/** A stored row (or nothing) as complete, valid choices. */
export function normalizePrefs(row: Partial<Record<keyof AlertPrefs, unknown>> | null | undefined): AlertPrefs {
  if (!row) return { ...DEFAULT_PREFS, events: {} };
  const events: AlertPrefs['events'] = {};
  const raw = row.events && typeof row.events === 'object' ? (row.events as Record<string, unknown>) : {};
  for (const [key, value] of Object.entries(raw)) {
    if (!isAlertEvent(key) || !value || typeof value !== 'object') continue;
    const v = value as Record<string, unknown>;
    const entry: Partial<ChannelSwitch> = {};
    if (typeof v.inApp === 'boolean') entry.inApp = v.inApp;
    if (typeof v.push === 'boolean') entry.push = v.push;
    events[key] = entry;
  }
  const num = (v: unknown, fallback: number) => (typeof v === 'number' && Number.isFinite(v) ? v : fallback);
  return {
    events,
    sound: isAlertSound(row.sound) ? row.sound : DEFAULT_PREFS.sound,
    vibrate: typeof row.vibrate === 'boolean' ? row.vibrate : DEFAULT_PREFS.vibrate,
    quietHours: typeof row.quietHours === 'boolean' ? row.quietHours : DEFAULT_PREFS.quietHours,
    quietStart: typeof row.quietStart === 'string' && HHMM.test(row.quietStart) ? row.quietStart : DEFAULT_PREFS.quietStart,
    quietEnd: typeof row.quietEnd === 'string' && HHMM.test(row.quietEnd) ? row.quietEnd : DEFAULT_PREFS.quietEnd,
    saleMinAmount: Math.max(0, num(row.saleMinAmount, 0)),
    saleDigestMinutes: (DIGEST_CHOICES as readonly number[]).includes(num(row.saleDigestMinutes, -1)) ? num(row.saleDigestMinutes, 15) : DEFAULT_PREFS.saleDigestMinutes,
    discountPercent: Math.min(100, Math.max(1, Math.round(num(row.discountPercent, 20)))),
  };
}

/** Only the fields a person may change, checked. Unknown fields are dropped. */
export function sanitizePrefsInput(body: unknown, current: AlertPrefs): AlertPrefs {
  const src = body && typeof body === 'object' ? (body as Record<string, unknown>) : {};
  const merged: Record<string, unknown> = { ...current };
  for (const key of ['sound', 'vibrate', 'quietHours', 'quietStart', 'quietEnd', 'saleMinAmount', 'saleDigestMinutes', 'discountPercent'] as const) {
    if (key in src) merged[key] = src[key];
  }
  const events: Record<string, unknown> = { ...current.events };
  if (src.events && typeof src.events === 'object') {
    for (const [k, v] of Object.entries(src.events as Record<string, unknown>)) {
      if (isAlertEvent(k) && v && typeof v === 'object') events[k] = { ...(current.events[k] ?? {}), ...(v as object) };
    }
  }
  merged.events = events;
  const next = normalizePrefs(merged as Partial<Record<keyof AlertPrefs, unknown>>);
  // An invalid value keeps what was there, not the default.
  if ('saleDigestMinutes' in src && !(DIGEST_CHOICES as readonly number[]).includes(src.saleDigestMinutes as number)) next.saleDigestMinutes = current.saleDigestMinutes;
  return next;
}

const isLead = (role: string) => role === 'OWNER' || role === 'SUPER_ADMIN' || role === 'MANAGER';

/** Whether this person may receive the event at all. */
export function canReceive(event: AlertEvent, person: AlertPerson): boolean {
  const spec = EVENT_SPECS[event];
  if (spec.ownerOnly) return person.role === 'OWNER' || person.role === 'SUPER_ADMIN';
  if (!spec.permission) return true;
  return hasPermission(person.role, person.permissions, spec.permission);
}

/** The role default for an event (before the person's own choices). */
export function defaultSwitch(event: AlertEvent, role: string): ChannelSwitch {
  const spec = EVENT_SPECS[event];
  return { ...(isLead(role) ? spec.lead : spec.staff) };
}

/** In-app and push for one person and event, after permission and choices. */
export function eventSwitch(event: AlertEvent, person: AlertPerson, prefs: AlertPrefs): ChannelSwitch {
  if (!canReceive(event, person)) return { inApp: false, push: false };
  const base = defaultSwitch(event, person.role);
  const own = prefs.events[event] ?? {};
  const inApp = own.inApp ?? base.inApp;
  const push = own.push ?? base.push;
  return { inApp, push };
}

/** Every event with its effective switch, for the settings screens. */
export function prefsView(person: AlertPerson, prefs: AlertPrefs) {
  return ALERT_EVENTS.filter((e) => canReceive(e, person)).map((event) => ({
    event,
    ...eventSwitch(event, person, prefs),
    default: defaultSwitch(event, person.role),
  }));
}

/** A person with a shop sees only that shop's events; no shop on either side means all. */
export function inScope(person: AlertPerson, shopId: string | null | undefined): boolean {
  if (person.role === 'OWNER' || person.role === 'SUPER_ADMIN') return true;
  if (!person.shopId || !shopId) return true;
  return person.shopId === shopId;
}

const minutesOf = (hhmm: string) => {
  const [h, m] = hhmm.split(':').map(Number);
  return h * 60 + m;
};

/** True when `now` (in the business time zone) falls inside the person's quiet hours. */
export function inQuietHours(prefs: Pick<AlertPrefs, 'quietHours' | 'quietStart' | 'quietEnd'>, now: Date, tz?: string): boolean {
  if (!prefs.quietHours) return false;
  const p = tzParts(now, tz);
  const at = p.hour * 60 + p.minute;
  const start = minutesOf(prefs.quietStart);
  const end = minutesOf(prefs.quietEnd);
  if (start === end) return false;
  return start < end ? at >= start && at < end : at >= start || at < end;
}

/** The fixed window a sale belongs to, for one summary push per window. */
export function digestWindow(now: Date, minutes: number): { start: Date; end: Date } {
  const size = minutes * 60_000;
  const start = Math.floor(now.getTime() / size) * size;
  return { start: new Date(start), end: new Date(start + size) };
}

/**
 * Whether the installed app binary carries the bundled tones. iOS falls back
 * to the default sound on its own; Android channels are fixed once created,
 * so tone channels are only used from the build after 2.0.0.
 */
export function deviceHasTones(platform: string | null | undefined, runtimeVersion: string | null | undefined): boolean {
  if (platform === 'ios') return true;
  if (platform !== 'android' || !runtimeVersion) return false;
  const [a, b, c] = runtimeVersion.split('.').map((x) => parseInt(x, 10) || 0);
  return a > 2 || (a === 2 && (b > 0 || c >= 1));
}

/**
 * Android channel and iOS sound for a push. Old app builds only know the
 * "default", "sales" and "alerts" channels; unknown channels fall back to the
 * system default on the phone.
 */
export function pushSound(prefs: Pick<AlertPrefs, 'sound' | 'vibrate'>, opts: { quiet: boolean; tones: boolean; legacyChannel?: string }): { channelId: string; sound: string | null } {
  const silent = opts.quiet || prefs.sound === 'silent';
  if (silent) return { channelId: 'nafaa-silent', sound: null };
  if (!opts.tones) return { channelId: prefs.vibrate ? opts.legacyChannel ?? 'default' : 'nafaa-default-novib', sound: 'default' };
  return { channelId: `nafaa-${prefs.sound}${prefs.vibrate ? '' : '-novib'}`, sound: `${prefs.sound}.wav` };
}
