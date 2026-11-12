/**
 * Meta Conversions API payloads (server-side events with the shop's own
 * pixel and access token, made in the shop's own Business Manager).
 *
 * Customer details are normalised and SHA-256 hashed as Meta asks
 * (developers.facebook.com/docs/marketing-api/conversions-api/parameters/customer-information-parameters):
 *   em       trimmed, lower case
 *   ph       digits only with the country code (03xx… → 923xx…)
 *   fn, ln   lower case, no punctuation
 *   ct       lower case, letters and digits only, no spaces
 *   country  ISO code, lower case ("pk")
 *   external_id  the buyer's phone key, hashed
 * fbc (from an fbclid on the landing page) is sent as is, not hashed.
 *
 * Pure functions; the service does the sending, logging and retries.
 */

import { createHash } from 'crypto';

export const GRAPH_VERSION = 'v21.0';
/** Meta rejects events older than seven days. */
export const MAX_EVENT_AGE_MS = 7 * 86_400_000;
export const MAX_ATTEMPTS = 6;

export const sha256 = (s: string) => createHash('sha256').update(s, 'utf8').digest('hex');

export function normEmail(v: unknown): string | null {
  const s = String(v ?? '').trim().toLowerCase();
  return /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(s) ? s : null;
}

/** Pakistani numbers get 92; other numbers keep the country code they carry. */
export function normPhone(v: unknown, countryCode = '92'): string | null {
  let d = String(v ?? '').replace(/\D/g, '');
  if (!d) return null;
  if (d.startsWith('00')) d = d.slice(2);
  if (d.startsWith('0')) d = countryCode + d.replace(/^0+/, '');
  else if (countryCode === '92' && d.length === 10 && d.startsWith('3')) d = '92' + d;
  return d.length >= 10 && d.length <= 15 ? d : null;
}

const letters = (v: unknown) => String(v ?? '').normalize('NFKC').toLowerCase().replace(/[\s\p{P}\p{S}]+/gu, '');

export function normCity(v: unknown): string | null {
  const s = letters(v);
  return s ? s : null;
}

export function splitName(v: unknown): { fn: string | null; ln: string | null } {
  const parts = String(v ?? '').trim().split(/\s+/).filter(Boolean);
  if (!parts.length || /^customer$/i.test(parts.join(' '))) return { fn: null, ln: null };
  const fn = letters(parts[0]) || null;
  const ln = parts.length > 1 ? letters(parts[parts.length - 1]) || null : null;
  return { fn, ln };
}

export interface CapiCustomer {
  phone?: string | null;
  email?: string | null;
  name?: string | null;
  city?: string | null;
  country?: string | null;
  /** Stable id of the buyer (phone key). */
  externalId?: string | null;
  fbclid?: string | null;
  /** When the click happened (order time is close enough). */
  clickAt?: Date | null;
}

/** Meta user_data with hashed fields; fields with no value are left out. */
export function userData(c: CapiCustomer): Record<string, unknown> {
  const out: Record<string, unknown> = {};
  const em = normEmail(c.email);
  const ph = normPhone(c.phone);
  const ct = normCity(c.city);
  const { fn, ln } = splitName(c.name);
  const country = String(c.country ?? 'pk').trim().toLowerCase().slice(0, 2);
  if (em) out.em = [sha256(em)];
  if (ph) out.ph = [sha256(ph)];
  if (fn) out.fn = [sha256(fn)];
  if (ln) out.ln = [sha256(ln)];
  if (ct) out.ct = [sha256(ct)];
  if (country) out.country = [sha256(country)];
  if (c.externalId) out.external_id = [sha256(String(c.externalId))];
  if (c.fbclid) out.fbc = `fb.1.${(c.clickAt ?? new Date()).getTime()}.${c.fbclid}`;
  return out;
}

export interface CapiItem { id: string; quantity: number; price: number }

export interface PurchaseInput {
  orderId: string;
  orderNumber: string;
  eventName: string;
  deliveredAt: Date;
  value: number;
  currency?: string;
  items: CapiItem[];
  customer: CapiCustomer;
  /** website for store orders; chat / phone_call for orders typed in from WhatsApp or a call. */
  actionSource: ActionSource;
  sourceUrl?: string | null;
}

export type ActionSource = 'website' | 'chat' | 'phone_call' | 'system_generated' | 'other';

/** Meta action_source for an order (manual WhatsApp/Instagram orders are chats). */
export function actionSourceOf(channelType: string, manualSource?: string | null): ActionSource {
  if (channelType === 'MANUAL') {
    const s = String(manualSource ?? '').toUpperCase();
    if (s === 'PHONE') return 'phone_call';
    if (['WHATSAPP', 'INSTAGRAM', 'FACEBOOK', 'TIKTOK'].includes(s)) return 'chat';
    return 'other';
  }
  return ['SHOPIFY', 'WOOCOMMERCE', 'CUSTOM_WEBSITE', 'NAFAA_STORE'].includes(channelType) ? 'website' : 'other';
}

const absUrl = (u: string | null | undefined) => (u && /^https?:\/\//i.test(u) ? u.slice(0, 1000) : undefined);

export function purchaseEvent(p: PurchaseInput) {
  return {
    event_name: p.eventName,
    event_time: Math.floor(p.deliveredAt.getTime() / 1000),
    event_id: `nafaa_purchase_${p.orderId}`,
    action_source: p.actionSource,
    ...(absUrl(p.sourceUrl) && { event_source_url: absUrl(p.sourceUrl) }),
    user_data: userData(p.customer),
    custom_data: {
      currency: (p.currency ?? 'PKR').toUpperCase(),
      value: Math.round(p.value * 100) / 100,
      order_id: p.orderNumber,
      content_type: 'product',
      contents: p.items.slice(0, 50).map((i) => ({ id: i.id, quantity: i.quantity, item_price: Math.round(i.price * 100) / 100 })),
      num_items: p.items.reduce((s, i) => s + i.quantity, 0),
    },
  };
}

export interface CheckoutInput {
  checkoutId: string;
  at: Date;
  value: number;
  currency?: string;
  items: CapiItem[];
  customer: CapiCustomer;
  sourceUrl?: string | null;
}

export function checkoutEvent(c: CheckoutInput) {
  return {
    event_name: 'InitiateCheckout',
    event_time: Math.floor(c.at.getTime() / 1000),
    event_id: `nafaa_checkout_${c.checkoutId}`,
    action_source: 'website' as const,
    ...(absUrl(c.sourceUrl) && { event_source_url: absUrl(c.sourceUrl) }),
    user_data: userData(c.customer),
    custom_data: {
      currency: (c.currency ?? 'PKR').toUpperCase(),
      value: Math.round(c.value * 100) / 100,
      content_type: 'product',
      contents: c.items.slice(0, 50).map((i) => ({ id: i.id, quantity: i.quantity, item_price: Math.round(i.price * 100) / 100 })),
      num_items: c.items.reduce((s, i) => s + i.quantity, 0),
    },
  };
}

/** Request for the events endpoint. The token goes in the body, not the URL, so it stays out of logs. */
export function capiRequest(pixelId: string, accessToken: string, events: unknown[], testCode?: string | null) {
  return {
    url: `https://graph.facebook.com/${GRAPH_VERSION}/${encodeURIComponent(pixelId)}/events`,
    body: { data: events, access_token: accessToken, ...(testCode && { test_event_code: testCode }) },
  };
}

/** Wait before the next try: 1 min, 5 min, 30 min, 2 h, 6 h. */
export function retryDelayMs(attempts: number): number {
  const steps = [60_000, 5 * 60_000, 30 * 60_000, 2 * 3_600_000, 6 * 3_600_000];
  return steps[Math.min(Math.max(attempts, 1), steps.length) - 1];
}

/** Errors that will not get better with a retry (bad token, bad pixel, bad data). */
export function isPermanentError(status: number, body: any): boolean {
  if (status === 400 || status === 401 || status === 403 || status === 404) {
    const code = Number(body?.error?.code);
    // 4 / 17 / 32 / 613 are rate limits; 1 and 2 are temporary server errors.
    return ![1, 2, 4, 17, 32, 613].includes(code);
  }
  return false;
}

export const validPixelId = (v: unknown) => /^\d{6,20}$/.test(String(v ?? '').trim());
