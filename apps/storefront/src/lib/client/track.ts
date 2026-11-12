/**
 * Shopper events: Nafaa's own store analytics (batched, sent with
 * sendBeacon) plus the merchant's Meta Pixel, GA4 / Google Ads and TikTok
 * pixel when their IDs are set. Nothing personal is sent to Nafaa.
 */
import type { StoreEvent, Utm } from '../api';

type Kind = StoreEvent['type'];

interface Extra {
  productId?: string;
  value?: number;
  query?: string;
  name?: string;
  quantity?: number;
  orderNumber?: string;
  contentIds?: string[];
}

declare global {
  interface Window {
    fbq?: (...args: unknown[]) => void;
    gtag?: (...args: unknown[]) => void;
    ttq?: { track: (...args: unknown[]) => void; page: () => void };
    __nfAds?: { googleAdsId?: string | null; googleAdsLabel?: string | null };
  }
}

const queue: StoreEvent[] = [];
let timer: ReturnType<typeof setTimeout> | null = null;

function safeStorage(kind: 'local' | 'session'): Storage | null {
  try {
    return kind === 'local' ? window.localStorage : window.sessionStorage;
  } catch {
    return null;
  }
}

function rand(): string {
  return Math.random().toString(36).slice(2) + Date.now().toString(36);
}

function ids(): { visitorId: string; sessionId: string; newVisitor: boolean } {
  const ls = safeStorage('local');
  const ss = safeStorage('session');
  let visitorId = ls?.getItem('nf_vid') ?? '';
  const newVisitor = !visitorId;
  if (!visitorId) {
    visitorId = rand();
    ls?.setItem('nf_vid', visitorId);
  }
  let sessionId = ss?.getItem('nf_sid') ?? '';
  if (!sessionId) {
    sessionId = rand();
    ss?.setItem('nf_sid', sessionId);
  }
  return { visitorId, sessionId, newVisitor };
}

/** UTM and click ids from the landing URL, kept for the session. */
export function utm(): Utm | undefined {
  const ss = safeStorage('session');
  const saved = ss?.getItem('nf_utm');
  if (saved) return JSON.parse(saved) as Utm;
  const p = new URLSearchParams(window.location.search);
  const u: Utm = {};
  for (const [k, key] of [
    ['utm_source', 'source'],
    ['utm_medium', 'medium'],
    ['utm_campaign', 'campaign'],
    ['utm_content', 'content'],
    ['utm_term', 'term'],
    ['fbclid', 'fbclid'],
    ['gclid', 'gclid'],
    ['ttclid', 'ttclid'],
  ] as const) {
    const v = p.get(k);
    if (v) u[key] = v.slice(0, 200);
  }
  if (Object.keys(u).length) {
    ss?.setItem('nf_utm', JSON.stringify(u));
    return u;
  }
  return undefined;
}

function device(): StoreEvent['device'] {
  const w = window.innerWidth;
  return w < 768 ? 'mobile' : w < 1024 ? 'tablet' : 'desktop';
}

function flush() {
  timer = null;
  if (!queue.length) return;
  const body = JSON.stringify({ events: queue.splice(0, 20) });
  const sent = typeof navigator.sendBeacon === 'function' && navigator.sendBeacon('/api/sf/events', new Blob([body], { type: 'application/json' }));
  if (!sent) fetch('/api/sf/events', { method: 'POST', body, headers: { 'Content-Type': 'application/json' }, keepalive: true }).catch(() => undefined);
}

const PIXEL: Record<Kind, { fb?: string; ga?: string; tt?: string }> = {
  page_view: {},
  product_view: { fb: 'ViewContent', ga: 'view_item', tt: 'ViewContent' },
  collection_view: { ga: 'view_item_list' },
  search: { fb: 'Search', ga: 'search', tt: 'Search' },
  add_to_cart: { fb: 'AddToCart', ga: 'add_to_cart', tt: 'AddToCart' },
  checkout_started: { fb: 'InitiateCheckout', ga: 'begin_checkout', tt: 'InitiateCheckout' },
  purchase: { fb: 'Purchase', ga: 'purchase', tt: 'CompletePayment' },
};

export function track(type: Kind, extra: Extra = {}) {
  if (typeof window === 'undefined') return;
  const { visitorId, sessionId, newVisitor } = ids();
  queue.push({
    type,
    visitorId,
    sessionId,
    newVisitor: type === 'page_view' ? newVisitor : undefined,
    path: window.location.pathname,
    productId: extra.productId,
    value: extra.value,
    query: extra.query,
    utm: type === 'page_view' ? utm() : undefined,
    referrer: type === 'page_view' && document.referrer && !document.referrer.includes(window.location.host) ? document.referrer : undefined,
    device: type === 'page_view' ? device() : undefined,
  });
  if (type === 'purchase' || queue.length >= 10) flush();
  else if (!timer) timer = setTimeout(flush, 4000);

  const p = PIXEL[type];
  const value = extra.value;
  const ids2 = extra.contentIds ?? (extra.productId ? [extra.productId] : undefined);
  try {
    if (p.fb && window.fbq) window.fbq('track', p.fb, { value, currency: 'PKR', content_ids: ids2, content_type: 'product', search_string: extra.query, content_name: extra.name }, extra.orderNumber ? { eventID: extra.orderNumber } : undefined);
    if (p.ga && window.gtag) {
      window.gtag('event', p.ga, { value, currency: 'PKR', search_term: extra.query, transaction_id: extra.orderNumber, items: ids2?.map((id) => ({ item_id: id, item_name: extra.name, quantity: extra.quantity ?? 1 })) });
      const ads = window.__nfAds;
      if (type === 'purchase' && ads?.googleAdsId && ads.googleAdsLabel) window.gtag('event', 'conversion', { send_to: `${ads.googleAdsId}/${ads.googleAdsLabel}`, value, currency: 'PKR', transaction_id: extra.orderNumber });
    }
    if (p.tt && window.ttq) window.ttq.track(p.tt, { value, currency: 'PKR', content_id: ids2?.[0], query: extra.query });
  } catch {
    /* a broken pixel must never break the shop */
  }
}

if (typeof window !== 'undefined') {
  window.addEventListener('pagehide', flush);
}
