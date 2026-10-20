/**
 * First-party analytics (ARCH 11). Browser-only helpers shared by the
 * Analytics island and other islands (PricingToggle, LeadForm, tools):
 *
 *   import { track } from '@/lib/analytics/track';
 *   track('pricing_toggle', { period: 'yearly' });
 *
 * Posts to the existing API endpoints (/public/marketing/pageview and /event)
 * with fetch keepalive. Storage keys match apps/api/public/nafaa-tracker.js
 * (nafaa_vid in localStorage, nafaa_sid in sessionStorage), so visitors keep
 * their ids across the old and the new site.
 */
import { PUBLIC_API_URL } from '@/lib/cms/env';

export type TrackEvent =
  | 'cta_click'
  | 'signup_clicked'
  | 'demo_submit'
  | 'whatsapp_click'
  | 'pricing_toggle'
  | 'tool_used'
  | 'outbound_click'
  | 'form_start'
  | 'theme_change';

export const STORAGE_KEYS = { visitor: 'nafaa_vid', session: 'nafaa_sid', consent: 'nafaa_consent' } as const;

function uuid(): string {
  if (typeof crypto !== 'undefined' && 'randomUUID' in crypto) return crypto.randomUUID();
  return 'xxxxxxxx-xxxx-4xxx-yxxx-xxxxxxxxxxxx'.replace(/[xy]/g, (c) => {
    const r = (Math.random() * 16) | 0;
    return (c === 'x' ? r : (r & 0x3) | 0x8).toString(16);
  });
}

function readOrCreate(store: () => Storage, key: string): string {
  try {
    const existing = store().getItem(key);
    if (existing) return existing;
    const created = uuid();
    store().setItem(key, created);
    return created;
  } catch {
    return uuid();
  }
}

let ids: { visitorId: string; sessionId: string } | null = null;

export function visitorIds(): { visitorId: string; sessionId: string } {
  if (!ids) {
    ids = {
      visitorId: readOrCreate(() => window.localStorage, STORAGE_KEYS.visitor),
      sessionId: readOrCreate(() => window.sessionStorage, STORAGE_KEYS.session),
    };
  }
  return ids;
}

function post(path: string, body: Record<string, unknown>): void {
  try {
    void fetch(`${PUBLIC_API_URL}${path}`, {
      method: 'POST',
      headers: { 'content-type': 'application/json' },
      body: JSON.stringify(body),
      keepalive: true,
      credentials: 'omit',
    }).catch(() => undefined);
  } catch {
    // Analytics never breaks the page.
  }
}

export function utmParams(search: string = window.location.search): Record<string, string> {
  const q = new URLSearchParams(search);
  const out: Record<string, string> = {};
  for (const [param, field] of [
    ['utm_source', 'utmSource'],
    ['utm_medium', 'utmMedium'],
    ['utm_campaign', 'utmCampaign'],
    ['utm_term', 'utmTerm'],
    ['utm_content', 'utmContent'],
  ] as const) {
    const value = q.get(param);
    if (value) out[field] = value;
  }
  return out;
}

function device(): { deviceType: string; browser: string; os: string } {
  const ua = navigator.userAgent;
  const deviceType = /Tablet|iPad/i.test(ua) ? 'tablet' : /Mobi|Android/i.test(ua) ? 'mobile' : 'desktop';
  const browser = /Edg\//.test(ua) ? 'Edge' : /Firefox\//.test(ua) ? 'Firefox' : /Chrome\//.test(ua) ? 'Chrome' : /Safari\//.test(ua) ? 'Safari' : 'unknown';
  const os = /Windows/.test(ua) ? 'Windows' : /Android/.test(ua) ? 'Android' : /iPhone|iPad/.test(ua) ? 'iOS' : /Mac OS/.test(ua) ? 'macOS' : /Linux/.test(ua) ? 'Linux' : 'unknown';
  return { deviceType, browser, os };
}

/** One pageview (TrackPageviewDto). */
export function trackPageview(referrer?: string): void {
  const { visitorId, sessionId } = visitorIds();
  post('/public/marketing/pageview', {
    visitorId,
    sessionId,
    path: window.location.pathname,
    fullUrl: window.location.href,
    title: document.title,
    referrer: referrer || undefined,
    screenWidth: window.innerWidth,
    screenHeight: window.innerHeight,
    language: navigator.language,
    loadTimeMs: Math.round(performance.now()),
    ...device(),
    ...utmParams(),
  });
}

type Forwarder = (eventName: TrackEvent, properties: Record<string, string | number | boolean | undefined>) => void;
let forwarder: Forwarder | null = null;

/** Set by the Analytics island once Google tags load: events also go to GA4 and Ads conversions. */
export function setTrackForwarder(next: Forwarder | null): void {
  forwarder = next;
}

/** One event (TrackEventDto). `label` fills eventLabel for the admin funnels. */
export function track(eventName: TrackEvent, properties: Record<string, string | number | boolean | undefined> = {}): void {
  const { visitorId, sessionId } = visitorIds();
  const label = typeof properties.label === 'string' ? properties.label : undefined;
  post('/public/marketing/event', {
    eventName,
    visitorId,
    sessionId,
    path: window.location.pathname,
    eventLabel: label,
    properties,
  });
  forwarder?.(eventName, properties);
}
