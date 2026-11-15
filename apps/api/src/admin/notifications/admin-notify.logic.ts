/**
 * Admin notifications: categories, severity, dedupe and per-admin alert
 * preferences. Pure functions only, so they are covered by jest without a
 * database (admin-notify.logic.spec.ts).
 */

import { tzParts } from '../../common/helpers/business-time.helper';

export const ADMIN_NOTIFY_CATEGORIES = ['shops', 'billing', 'commerce', 'social', 'system', 'marketing', 'support', 'general'] as const;
export type AdminNotifyCategory = (typeof ADMIN_NOTIFY_CATEGORIES)[number];

export const ADMIN_NOTIFY_SEVERITIES = ['info', 'warning', 'critical'] as const;
export type AdminNotifySeverity = (typeof ADMIN_NOTIFY_SEVERITIES)[number];

export type AdminPriority = 'LOW' | 'NORMAL' | 'HIGH' | 'URGENT';

/** Quiet hours and dates are in Pakistan time. */
export const ADMIN_NOTIFY_TZ = 'Asia/Karachi';

/**
 * The admin permission that lets someone see a category. Any one of the keys
 * is enough. 'general' has none: everyone with notifications.view sees it.
 */
export const CATEGORY_PERMISSIONS: Record<AdminNotifyCategory, string[]> = {
  shops: ['tenants.view', 'deletion.view'],
  billing: ['billing.view', 'plans.view'],
  commerce: ['online_store.view', 'stores.view'],
  social: ['social.view'],
  system: ['system.view'],
  marketing: ['marketing.view'],
  support: ['support.view'],
  general: [],
};

export const isCategory = (v: unknown): v is AdminNotifyCategory =>
  typeof v === 'string' && (ADMIN_NOTIFY_CATEGORIES as readonly string[]).includes(v);

export const isSeverity = (v: unknown): v is AdminNotifySeverity =>
  typeof v === 'string' && (ADMIN_NOTIFY_SEVERITIES as readonly string[]).includes(v);

/** Categories an admin may see. Super admins see all. */
export function allowedCategories(access: { isSuperAdmin: boolean; permissions: string[] } | null | undefined): AdminNotifyCategory[] {
  if (!access) return [];
  if (access.isSuperAdmin) return [...ADMIN_NOTIFY_CATEGORIES];
  const have = new Set(access.permissions);
  return ADMIN_NOTIFY_CATEGORIES.filter((c) => CATEGORY_PERMISSIONS[c].length === 0 || CATEGORY_PERMISSIONS[c].some((k) => have.has(k)));
}

export const severityToPriority = (s: AdminNotifySeverity): AdminPriority =>
  s === 'critical' ? 'URGENT' : s === 'warning' ? 'HIGH' : 'NORMAL';

export const priorityToSeverity = (p: string | null | undefined): AdminNotifySeverity =>
  p === 'URGENT' ? 'critical' : p === 'HIGH' ? 'warning' : 'info';

/** Priorities that make up a severity filter. */
export const severityPriorities = (s: AdminNotifySeverity): AdminPriority[] =>
  s === 'critical' ? ['URGENT'] : s === 'warning' ? ['HIGH'] : ['NORMAL', 'LOW'];

/** Category for rows written without one (older code paths that still pass only a type). */
export function categoryForType(type: string | null | undefined, link?: string | null): AdminNotifyCategory {
  switch (type) {
    case 'NEW_TENANT': case 'TENANT_SUSPENDED': case 'REFERRAL_CONVERTED':
      return 'shops';
    case 'NEW_PAYMENT': case 'PAYMENT_APPROVED': case 'PAYMENT_REJECTED': case 'SUBSCRIPTION_EXPIRING':
    case 'SUBSCRIPTION_CANCELLED': case 'HIGH_VALUE_PAYMENT':
      return 'billing';
    case 'SYSTEM_ALERT': case 'ERROR':
      return 'system';
  }
  if (link) {
    if (/^\/(tenants|deletion-requests)/.test(link)) return 'shops';
    if (/^\/(billing|invoices|subscriptions|setups)/.test(link)) return 'billing';
    if (/^\/(commerce|stores)/.test(link)) return 'commerce';
    if (link.startsWith('/social')) return 'social';
    if (link.startsWith('/system')) return 'system';
    if (link.startsWith('/marketing')) return 'marketing';
    if (link.startsWith('/support')) return 'support';
  }
  return 'general';
}

/* ───────────────────────── dedupe ───────────────────────── */

export interface DedupeOptions {
  /** Occurrences within this many minutes of the first one share a row. Default 30. */
  windowMinutes?: number;
  /** Notify once for this key, ever (state changes such as "domain verified"). */
  once?: boolean;
}

export type DedupePlan = { action: 'create' } | { action: 'bump'; id: string } | { action: 'skip' };

/**
 * What to do with an event whose key matches `latest` (the newest row with
 * the same dedupe key, or null). The window counts from the row's first
 * occurrence, so a steady stream of the same event gives one row per window.
 */
export function planDedupe(
  latest: { id: string; createdAt: Date } | null,
  now: Date,
  opts: DedupeOptions = {},
): DedupePlan {
  if (!latest) return { action: 'create' };
  if (opts.once) return { action: 'skip' };
  const windowMs = Math.max(0, opts.windowMinutes ?? 30) * 60_000;
  return now.getTime() - latest.createdAt.getTime() <= windowMs ? { action: 'bump', id: latest.id } : { action: 'create' };
}

/* ───────────────────────── preferences ───────────────────────── */

export interface AdminNotifyPrefs {
  /** Categories that raise an alert (toast, sound, desktop). The inbox always lists every allowed category. */
  categories: Record<AdminNotifyCategory, boolean>;
  toast: boolean;
  sound: boolean;
  desktop: boolean;
  quietHours: { enabled: boolean; start: string; end: string };
  /** Critical alerts still sound and show on the desktop during quiet hours. */
  criticalInQuiet: boolean;
}

export const DEFAULT_PREFS: AdminNotifyPrefs = {
  categories: { shops: true, billing: true, commerce: true, social: true, system: true, marketing: true, support: true, general: true },
  toast: true,
  sound: true,
  desktop: true,
  quietHours: { enabled: false, start: '22:00', end: '08:00' },
  criticalInQuiet: true,
};

const HHMM = /^([01]\d|2[0-3]):[0-5]\d$/;
const bool = (v: unknown, fallback: boolean) => (typeof v === 'boolean' ? v : fallback);

/** Fills missing fields with defaults and drops anything unknown. */
export function normalizePrefs(input: unknown): AdminNotifyPrefs {
  const o = input && typeof input === 'object' && !Array.isArray(input) ? (input as Record<string, any>) : {};
  const cats = o.categories && typeof o.categories === 'object' ? o.categories : {};
  const q = o.quietHours && typeof o.quietHours === 'object' ? o.quietHours : {};
  return {
    categories: Object.fromEntries(
      ADMIN_NOTIFY_CATEGORIES.map((c) => [c, bool(cats[c], DEFAULT_PREFS.categories[c])]),
    ) as Record<AdminNotifyCategory, boolean>,
    toast: bool(o.toast, DEFAULT_PREFS.toast),
    sound: bool(o.sound, DEFAULT_PREFS.sound),
    desktop: bool(o.desktop, DEFAULT_PREFS.desktop),
    quietHours: {
      enabled: bool(q.enabled, DEFAULT_PREFS.quietHours.enabled),
      start: typeof q.start === 'string' && HHMM.test(q.start) ? q.start : DEFAULT_PREFS.quietHours.start,
      end: typeof q.end === 'string' && HHMM.test(q.end) ? q.end : DEFAULT_PREFS.quietHours.end,
    },
    criticalInQuiet: bool(o.criticalInQuiet, DEFAULT_PREFS.criticalInQuiet),
  };
}

const minutesOf = (hhmm: string) => Number(hhmm.slice(0, 2)) * 60 + Number(hhmm.slice(3, 5));

/** True when `now` (Pakistan time) falls inside start..end; the range may cross midnight. */
export function inQuietHours(q: AdminNotifyPrefs['quietHours'], now: Date): boolean {
  if (!q.enabled) return false;
  const p = tzParts(now, ADMIN_NOTIFY_TZ);
  const m = p.hour * 60 + p.minute;
  const s = minutesOf(q.start);
  const e = minutesOf(q.end);
  if (s === e) return false;
  return s < e ? m >= s && m < e : m >= s || m < e;
}

export interface AlertPlan { toast: boolean; sound: boolean; desktop: boolean }

/** How one new notification should reach this admin right now. */
export function alertPlan(prefs: AdminNotifyPrefs, category: AdminNotifyCategory, severity: AdminNotifySeverity, now: Date): AlertPlan {
  if (!prefs.categories[category]) return { toast: false, sound: false, desktop: false };
  const quiet = inQuietHours(prefs.quietHours, now) && !(severity === 'critical' && prefs.criticalInQuiet);
  return { toast: prefs.toast, sound: prefs.sound && !quiet, desktop: prefs.desktop && !quiet };
}

/** Pakistan date key (YYYY-MM-DD) for "once a day" markers. */
export function pktDayKey(now: Date): string {
  const p = tzParts(now, ADMIN_NOTIFY_TZ);
  return `${p.year}-${String(p.month).padStart(2, '0')}-${String(p.day).padStart(2, '0')}`;
}

export const pktHour = (now: Date) => tzParts(now, ADMIN_NOTIFY_TZ).hour;
