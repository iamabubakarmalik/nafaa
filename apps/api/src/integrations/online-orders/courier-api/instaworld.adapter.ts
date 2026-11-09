import { TRACKING_MAPPERS } from './tracking-events';
import { courierFetch, fetchPdfOrJson } from './http';
import { normalizeCourierStatus } from './status';
import { pkPhone } from './postex.adapter';
import {
  BookInput, BookResult, CourierAdapter, CourierApiError, CourierCity, CourierCreds, CourierSettings, CourierState,
  PickupAddress, PortalShipment, TestResult, TrackResult,
} from './types';

/**
 * InstaWorld Merchant API v2 (Beta). Source: the official OpenAPI spec at
 * https://one-be.instaworld.pk/merchant-api/v2/docs (openapi.yaml, v2.0.0).
 *
 * - Auth: "Authorization: Bearer iw_..." (a v2 key from portal → API Access;
 *   the per-location v1 "location key" is not accepted).
 * - Success is { data }, lists add { meta: { next_cursor } }; errors are
 *   { error: { code, message, details, request_id } }.
 * - Booking needs location_id for brand-wide keys; the city must be a name
 *   from GET /cities. 201 is returned only with a tracking number.
 */
export const INSTAWORLD_BASE = 'https://one-be.instaworld.pk/merchant-api/v2';

const ERRORS: Record<string, string> = {
  invalid_api_key: 'InstaWorld ne API key nahi maani — portal → API Access se nayi v2 key banayein',
  account_inactive: 'InstaWorld account band hai — InstaWorld se baat karein',
  insufficient_scope: 'Is InstaWorld key ko ye kaam karne ki ijazat nahi',
  city_not_serviceable: 'InstaWorld is shehar me deliver nahi karta',
  invalid_phone: 'Customer ka phone InstaWorld ne nahi maana — 03xxxxxxxxx likhein',
  location_not_owned: 'Ye pickup location is InstaWorld account ki nahi — Settings me dobara chunein',
  shipment_not_cancellable: 'Parcel utha liya gaya — ab cancel nahi hota, return karwayein',
  booking_failed: 'Kisi courier ne parcel qabool nahi kiya — thori der baad dobara book karein',
  courier_unavailable: 'InstaWorld ka courier abhi dastyab nahi',
  rate_limited: 'InstaWorld ki had poori ho gayi — ek minute baad try karein',
  awb_unavailable: 'InstaWorld label abhi nahi bana — portal se print karein',
  not_found: 'InstaWorld par ye parcel nahi mila',
};

function errorOf(status: number, body: any): CourierApiError {
  const e = body?.error;
  const code = String(e?.code ?? '');
  const auth = status === 401 || code === 'invalid_api_key';
  if (ERRORS[code]) return new CourierApiError(ERRORS[code], auth);
  const details = Array.isArray(e?.details)
    ? e.details.map((d: any) => [d?.field, d?.issue].filter(Boolean).join(' ')).filter(Boolean).slice(0, 3).join(' · ')
    : '';
  return new CourierApiError(details || String(e?.message ?? `InstaWorld ne mana kiya (${status})`).slice(0, 200), auth);
}

async function call(creds: CourierCreds, path: string, init: RequestInit & { json?: unknown } = {}) {
  const { status, body } = await courierFetch(`${INSTAWORLD_BASE}${path}`, {
    ...init,
    headers: { Authorization: `Bearer ${creds.apiKey}`, ...(init.headers ?? {}) },
  });
  if (status >= 500 && status !== 502) throw new CourierApiError('InstaWorld ka server abhi jawab nahi de raha');
  if (status < 200 || status >= 300 || !body || body.error) throw errorOf(status, body);
  return body;
}

/** InstaWorld public status code → Nafaa state (frozen vocabulary in the spec). */
export function instaworldState(code?: string | null, label?: string | null): CourierState {
  switch (String(code ?? '').toUpperCase()) {
    case 'BOOKING_IN_PROCESS':
    case 'BOOKED': return 'BOOKED';
    case 'PICKED_UP': return 'PICKED_UP';
    case 'IN_TRANSIT': return 'IN_TRANSIT';
    case 'OUT_FOR_DELIVERY': return 'OUT_FOR_DELIVERY';
    case 'DELIVERY_ATTEMPT_FAILED':
    case 'ACTION_REQUIRED':
    case 'ON_HOLD': return 'ATTEMPTED';
    case 'DELIVERED': return 'DELIVERED';
    case 'RTO_INITIATED':
    case 'RTO_IN_TRANSIT':
    case 'RTO_RECEIVED_AT_HUB': return 'RETURNING';
    case 'RTO_RETURNED_TO_SHIPPER': return 'RETURNED';
    case 'CANCELLED': return 'CANCELLED';
    default: return normalizeCourierStatus(label);
  }
}

const splitName = (full: string) => {
  const parts = full.trim().split(/\s+/);
  return { first: parts[0] || full.trim() || 'Customer', last: parts.slice(1).join(' ') || null };
};

export const instaworldAdapter: CourierAdapter = {
  code: 'INSTAWORLD',

  async test(creds): Promise<TestResult> {
    const [cities, pickupAddresses] = await Promise.all([this.cities(creds), this.pickupAddresses!(creds)]);
    if (!pickupAddresses.length) throw new CourierApiError('Is InstaWorld key ke saath koi pickup location nahi — portal par location banayein');
    return { cities: cities.length, pickupAddresses };
  },

  async cities(creds): Promise<CourierCity[]> {
    const body = await call(creds, '/cities');
    return (Array.isArray(body.data) ? body.data : [])
      .map((c: any) => String(c?.name ?? '').trim())
      .filter(Boolean)
      .map((name: string) => ({ id: name, name }));
  },

  async pickupAddresses(creds): Promise<PickupAddress[]> {
    const body = await call(creds, '/locations');
    return (Array.isArray(body.data) ? body.data : [])
      .filter((l: any) => l?.id !== undefined && l?.is_active !== false)
      .map((l: any) => ({ code: String(l.id), address: [l.name, l.address].filter(Boolean).join(' — '), city: l.city ?? null }));
  },

  async book(creds, settings: CourierSettings, i: BookInput): Promise<BookResult> {
    const phone = pkPhone(i.customerPhone);
    if (!/^03\d{9}$/.test(phone)) throw new CourierApiError('Customer ka phone 03xxxxxxxxx jaisa hona chahiye');
    let location = settings.pickupAddressCode ? String(settings.pickupAddressCode) : '';
    if (!location) location = (await this.pickupAddresses!(creds))[0]?.code ?? '';
    if (!location) throw new CourierApiError('InstaWorld pickup location chunein (Couriers → InstaWorld → Settings)');
    const cod = Math.max(0, Math.round(i.codAmount));
    const name = splitName(i.customerName);
    const remarks = (i.notes ?? '').slice(0, 200) || undefined;
    const body = await call(creds, '/shipments', {
      method: 'POST',
      // Same order → same key, so a retry never books twice (kept 24h by InstaWorld).
      headers: { 'Idempotency-Key': `nafaa-${i.orderRef}`.slice(0, 255) },
      json: {
        location_id: Number(location),
        ref_no: i.orderRef.slice(0, 200),
        payment: { type: cod > 0 ? 'cod' : 'paid', amount: cod },
        consignee: {
          first_name: name.first.slice(0, 100),
          last_name: name.last,
          phone,
          email: i.customerEmail || null,
          address: i.address.slice(0, 200),
          city: i.city.name,
        },
        items: [{
          title: i.description.slice(0, 190) || 'Parcel',
          quantity: Math.max(1, i.pieces),
          kg: Math.max(0.1, Number(i.weightKg.toFixed(2))),
          product_detail: i.description.slice(0, 190) || null,
        }],
        remarks,
      },
    });
    const tn = body?.data?.tracking_number;
    if (!tn) throw new CourierApiError('InstaWorld ne tracking number nahi diya — portal par check karein');
    const charge = Number(body.data?.settlement?.charges);
    return { trackingNumber: String(tn), charge: Number.isFinite(charge) ? charge : null, raw: { tracking_number: tn, courier: body.data?.courier ?? null } };
  },

  async track(creds, tns): Promise<TrackResult[]> {
    const out: TrackResult[] = [];
    for (const tn of tns) {
      const body = await call(creds, `/shipments/${encodeURIComponent(tn)}/events`).catch((e) => {
        if (e instanceof CourierApiError && e.auth) throw e;
        return null;
      });
      if (!body) continue;
      const list: any[] = Array.isArray(body.data) ? body.data : [];
      const current = body.meta?.current_status ?? list[list.length - 1] ?? null;
      const code = current?.code ?? current?.status;
      const label = String(current?.label ?? current?.status_label ?? code ?? '');
      if (!label && !list.length) continue;
      const last = list[list.length - 1];
      const at = last?.occurred_at ?? last?.recorded_at;
      out.push({
        trackingNumber: tn,
        state: instaworldState(code, label),
        label,
        at: at ? new Date(at) : null,
        history: list.slice(-20).map((h) => ({ label: String(h?.courier_status_raw || h?.status_label || h?.status || ''), at: h?.occurred_at ?? h?.recorded_at ?? null })),
        events: TRACKING_MAPPERS.INSTAWORLD(body),
      });
    }
    return out;
  },

  async cancel(creds, tn) {
    await call(creds, `/shipments/${encodeURIComponent(tn)}/cancel`, { method: 'POST' });
  },

  async label(creds, tn) {
    const r = await fetchPdfOrJson(`${INSTAWORLD_BASE}/shipments/${encodeURIComponent(tn)}/awb`, { Authorization: `Bearer ${creds.apiKey}`, Accept: 'application/pdf' });
    if (r.pdf) return { pdf: r.pdf };
    throw errorOf(r.status, r.json);
  },

  async listShipments(creds, from, to): Promise<PortalShipment[]> {
    const out: PortalShipment[] = [];
    let cursor: string | null = null;
    // List endpoints allow 30 calls/min; 10 pages of 200 is plenty for one sync.
    for (let page = 0; page < 10; page++) {
      const q = new URLSearchParams({ created_from: from, created_to: to, limit: '200', ...(cursor ? { cursor } : {}) });
      const body = await call(creds, `/shipments?${q}`);
      for (const s of Array.isArray(body.data) ? body.data : []) {
        if (!s?.tracking_number) continue;
        out.push({
          trackingNumber: String(s.tracking_number),
          orderRef: s.ref_no ?? null,
          customerName: s.consignee?.name ?? null,
          customerPhone: s.consignee?.phone ?? null,
          city: s.consignee?.city ?? null,
          address: null,
          codAmount: s.payment?.type === 'cod' ? Number(s.payment?.amount ?? 0) || 0 : 0,
          statusLabel: String(s.status?.label ?? s.status?.code ?? ''),
          bookedAt: s.created_at ? new Date(s.created_at) : null,
        });
      }
      cursor = body.meta?.next_cursor ?? null;
      if (!cursor) break;
    }
    return out;
  },

  async paymentSettled(creds, tn) {
    const body = await call(creds, `/shipments/${encodeURIComponent(tn)}`).catch(() => null);
    const s = body?.data?.settlement;
    if (!s) return null;
    return { settled: s.cod_settled === true || s.status === 'PAID', reference: s.invoice_number ?? null };
  },
};
