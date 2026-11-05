/**
 * Third-party tag loaders used by the Analytics island (browser only).
 *
 * - Google (GTM, GA4, Google Ads) runs in Consent Mode v2: storage starts
 *   denied and is granted when the visitor accepts, so the tags may load on
 *   idle before a choice is made (ARCH 11). With a GTM id only GTM loads.
 * - Clarity, Meta, TikTok, LinkedIn and Hotjar set their own cookies and load
 *   only after consent.
 * Every loader is idempotent and does nothing for an empty id.
 */
import { pageTypeOf } from './attribution';
import type { AdsConversions } from './env';
import type { TrackEvent } from './track';

type Gtag = (...args: unknown[]) => void;
type AnyWindow = Window & Record<string, unknown> & { dataLayer?: unknown[]; gtag?: Gtag };

function win(): AnyWindow {
  return window as unknown as AnyWindow;
}

function injectScript(id: string, src: string): void {
  if (document.getElementById(id)) return;
  const script = document.createElement('script');
  script.id = id;
  script.async = true;
  script.src = src;
  document.head.appendChild(script);
}

const GRANTED = { ad_storage: 'granted', ad_user_data: 'granted', ad_personalization: 'granted', analytics_storage: 'granted' } as const;
const DENIED = { ad_storage: 'denied', ad_user_data: 'denied', ad_personalization: 'denied', analytics_storage: 'denied' } as const;

function gtag(): Gtag {
  const w = win();
  w.dataLayer = w.dataLayer ?? [];
  if (!w.gtag) {
    // gtag.js reads the `arguments` object, so this must stay a function expression.
    w.gtag = function gtagShim() {
      // eslint-disable-next-line prefer-rest-params
      w.dataLayer!.push(arguments);
    };
  }
  return w.gtag;
}

let consentReady = false;
let googleLoaded = false;

/** Event that tells GTM the visitor has just chosen (GTM custom event trigger). */
export const CONSENT_UPDATE_EVENT = 'nafaa_consent_update';

/**
 * Consent Mode v2 defaults, pushed to dataLayer before any Google script
 * loads and before any event. Everything starts denied (the banner's rule:
 * no analytics or ad cookies until the visitor accepts); Google tags still
 * load and send cookieless pings, so GA4 is not blocked, only cookieless
 * until consent. A stored "granted" from an earlier visit is applied at once.
 * Idempotent.
 */
export function initGoogleConsent(granted: boolean): void {
  if (consentReady) return;
  consentReady = true;
  const g = gtag();
  g('consent', 'default', { ...DENIED, wait_for_update: 500 });
  if (granted) g('consent', 'update', GRANTED);
}

/** A plain dataLayer event for GTM triggers. Safe before GTM loads: GTM reads the queue when it starts. */
export function pushDataLayer(event: string, params: Record<string, unknown> = {}): void {
  const w = win();
  w.dataLayer = w.dataLayer ?? [];
  w.dataLayer.push({ event, ...params });
}

/**
 * Loads Google tags. With a GTM container id, only GTM loads: the
 * container's own "GA4 - Configuration" Google tag sends GA4, so the site
 * does not load gtag.js for GA as well (that sent every pageview twice).
 * gtag.js loads only for GA4 when there is no GTM, and for Google Ads
 * (conversions only, no GA config) when an Ads id is set.
 */
export function loadGoogle(ids: { gtmId?: string; gaId?: string; adsId?: string }, granted: boolean): void {
  if (googleLoaded || !(ids.gtmId || ids.gaId || ids.adsId)) return;
  googleLoaded = true;
  const gtmMode = Boolean(ids.gtmId);
  initGoogleConsent(granted);
  const g = gtag();
  g('js', new Date());
  const gaId = gtmMode ? undefined : ids.gaId;
  if (gaId) g('config', gaId);
  if (ids.adsId) g('config', ids.adsId);
  const tagId = gaId ?? ids.adsId;
  if (tagId) injectScript('nafaa-gtag', `https://www.googletagmanager.com/gtag/js?id=${encodeURIComponent(tagId)}`);
  if (ids.gtmId) {
    win().dataLayer!.push({ 'gtm.start': Date.now(), event: 'gtm.js' });
    injectScript('nafaa-gtm', `https://www.googletagmanager.com/gtm.js?id=${encodeURIComponent(ids.gtmId)}`);
  }
}

/** The visitor's banner choice as a Consent Mode update, then a dataLayer event so GTM can fire consent-gated tags (Clarity, Meta Pixel). */
export function updateGoogleConsent(granted: boolean): void {
  initGoogleConsent(false);
  gtag()('consent', 'update', granted ? GRANTED : DENIED);
  pushDataLayer(CONSENT_UPDATE_EVENT, { consent_choice: granted ? 'granted' : 'denied' });
}

/** First-party event names → the names GTM and GA4 see. Unlisted events keep their name. */
const GTM_EVENT_NAMES: Partial<Record<TrackEvent, string>> = {
  signup_clicked: 'sign_up_start',
  demo_submit: 'demo_request',
};

/**
 * Forwards first-party events to Google. With GTM, every event becomes a
 * dataLayer event (queued until GTM starts), named as in GTM_EVENT_NAMES;
 * GTM's GA4 Event tags pick them up. Without GTM, gtag.js gets them once it
 * has loaded. Mapped Google Ads conversions go out either way when an Ads
 * id and label are set.
 */
export function googleForwarder(ids: { gtmId?: string; adsId?: string }, conversions: AdsConversions) {
  const map: Partial<Record<TrackEvent, keyof AdsConversions>> = { signup_clicked: 'signup', demo_submit: 'demo', form_start: 'lead' };
  return (eventName: TrackEvent, properties: Record<string, unknown>): void => {
    const params = { page_path: window.location.pathname, page_type: pageTypeOf(window.location.pathname), ...properties };
    if (ids.gtmId) pushDataLayer(GTM_EVENT_NAMES[eventName] ?? eventName, params);
    else if (googleLoaded) gtag()('event', eventName, params);
    const key = map[eventName];
    const label = key ? conversions[key] : undefined;
    if (googleLoaded && ids.adsId && label) gtag()('event', 'conversion', { send_to: `${ids.adsId}/${label}` });
  };
}

export function loadClarity(clarityId: string, sample: number): void {
  // Sampling is decided once per session.
  let inSample = false;
  try {
    const stored = window.sessionStorage.getItem('nafaa_clarity');
    inSample = stored ? stored === '1' : Math.random() < sample;
    window.sessionStorage.setItem('nafaa_clarity', inSample ? '1' : '0');
  } catch {
    inSample = Math.random() < sample;
  }
  if (!inSample) return;
  const w = win() as AnyWindow & { clarity?: ((...args: unknown[]) => void) & { q?: unknown[] } };
  if (!w.clarity) {
    const queue: unknown[] = [];
    w.clarity = Object.assign((...args: unknown[]) => void queue.push(args), { q: queue });
  }
  injectScript('nafaa-clarity', `https://www.clarity.ms/tag/${encodeURIComponent(clarityId)}`);
}

export interface PixelIds {
  metaPixelId?: string;
  tiktokPixelId?: string;
  linkedinPartnerId?: string;
  hotjarId?: string;
}

type Queued = ((...args: unknown[]) => void) & { q?: unknown[]; queue?: unknown[]; callMethod?: (...a: unknown[]) => void };

/** Ad and heatmap pixels; each one only when its id is set. */
export function loadPixels(ids: PixelIds): void {
  const w = win();
  if (ids.metaPixelId && !w.fbq) {
    const fbq: Queued = (...args: unknown[]) => {
      if (fbq.callMethod) fbq.callMethod(...args);
      else fbq.queue!.push(args);
    };
    Object.assign(fbq, { queue: [], loaded: true, version: '2.0', push: fbq });
    w.fbq = fbq;
    w._fbq = fbq;
    injectScript('nafaa-meta', 'https://connect.facebook.net/en_US/fbevents.js');
    fbq('init', ids.metaPixelId);
    fbq('track', 'PageView');
  }
  if (ids.tiktokPixelId && !w.ttq) {
    // TikTok's base snippet, typed: a queue with deferred methods, then load(id).
    type Ttq = unknown[] & Record<string, unknown> & { _i?: Record<string, unknown[] & Record<string, unknown>>; _t?: Record<string, number>; _o?: Record<string, unknown> };
    const ttq = [] as unknown as Ttq;
    const methods = ['page', 'track', 'identify', 'instances', 'debug', 'on', 'off', 'once', 'ready', 'alias', 'group', 'enableCookie', 'disableCookie'];
    const defer = (target: unknown[] & Record<string, unknown>, method: string) => {
      target[method] = (...args: unknown[]) => void target.push([method, ...args]);
    };
    for (const m of methods) defer(ttq, m);
    ttq.instance = (id: string) => {
      const inst = (ttq._i?.[id] ?? []) as unknown[] & Record<string, unknown>;
      for (const m of methods) defer(inst, m);
      return inst;
    };
    ttq.load = (id: string) => {
      const src = 'https://analytics.tiktok.com/i18n/pixel/events.js';
      ttq._i = ttq._i ?? {};
      ttq._i[id] = Object.assign([], { _u: src }) as unknown as unknown[] & Record<string, unknown>;
      ttq._t = { ...(ttq._t ?? {}), [id]: Date.now() };
      ttq._o = { ...(ttq._o ?? {}), [id]: {} };
      injectScript('nafaa-tiktok', `${src}?sdkid=${encodeURIComponent(id)}&lib=ttq`);
    };
    w.TiktokAnalyticsObject = 'ttq';
    w.ttq = ttq;
    (ttq.load as (id: string) => void)(ids.tiktokPixelId);
    (ttq.page as () => void)();
  }
  if (ids.linkedinPartnerId && !w.lintrk) {
    w._linkedin_partner_id = ids.linkedinPartnerId;
    const list = (w._linkedin_data_partner_ids as string[] | undefined) ?? [];
    list.push(ids.linkedinPartnerId);
    w._linkedin_data_partner_ids = list;
    const lintrk: Queued = (...args: unknown[]) => void lintrk.q!.push(args);
    lintrk.q = [];
    w.lintrk = lintrk;
    injectScript('nafaa-linkedin', 'https://snap.licdn.com/li.lms-analytics/insight.min.js');
  }
  if (ids.hotjarId && !w.hj) {
    const hj: Queued = (...args: unknown[]) => void (hj.q = hj.q ?? []).push(args);
    w.hj = hj;
    w._hjSettings = { hjid: Number(ids.hotjarId), hjsv: 6 };
    injectScript('nafaa-hotjar', `https://static.hotjar.com/c/hotjar-${encodeURIComponent(ids.hotjarId)}.js?sv=6`);
  }
}

/** Pageview for pixels that do not follow client navigation themselves. */
export function pixelPageview(): void {
  const w = win() as AnyWindow & { fbq?: Queued; ttq?: { page?: () => void } };
  w.fbq?.('track', 'PageView');
  w.ttq?.page?.();
}
