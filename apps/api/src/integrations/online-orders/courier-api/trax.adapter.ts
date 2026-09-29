import { courierFetch, fetchPdfOrJson, pkToday } from './http';
import { normalizeCourierStatus } from './status';
import { pkPhone } from './postex.adapter';
import {
  BookInput, BookResult, CourierAdapter, CourierApiError, CourierCity, CourierCreds, CourierSettings, PickupAddress, TestResult, TrackResult,
} from './types';

/**
 * Trax (Sonic) API — sonic.pk/api. Header "Authorization: <api key>" (Bearer
 * NAHI). Ghalti bhi HTTP 200 me aati hai: { status: 1, message } — kamyabi
 * status: 0. Shehar aur pickup address numeric id se.
 */
const BASE = 'https://sonic.pk/api';

async function call(creds: CourierCreds, path: string, init: RequestInit & { json?: unknown } = {}) {
  const { status, body } = await courierFetch(`${BASE}${path}`, { ...init, headers: { Authorization: creds.apiKey, ...(init.headers ?? {}) } });
  if (status === 404) throw new CourierApiError('Trax ka ye hissa nahi mila');
  if (status >= 500 || !body) throw new CourierApiError('Trax ka server abhi jawab nahi de raha');
  if (Number(body.status) !== 0) {
    const m = String(body.message ?? 'Trax ne mana kiya');
    const auth = /api token|authorization/i.test(m);
    throw new CourierApiError(auth ? 'Trax ne API key nahi maani — Sonic portal (Profile) se dobara copy karein' : errText(body) ?? m.slice(0, 200), auth);
  }
  return body;
}

/** Laravel validation: { errors: { field: ["…"] } } */
function errText(body: any): string | null {
  const e = body?.errors;
  if (!e || typeof e !== 'object') return null;
  return Object.values(e).flat().map(String).slice(0, 3).join(' · ') || null;
}

export const traxAdapter: CourierAdapter = {
  code: 'TRAX',

  async test(creds): Promise<TestResult> {
    const [cities, pickupAddresses] = await Promise.all([this.cities(creds), this.pickupAddresses!(creds)]);
    if (!pickupAddresses.length) throw new CourierApiError('Trax account me koi pickup address nahi — Sonic portal par pehle pickup address banayein');
    return { cities: cities.length, pickupAddresses };
  },

  async cities(creds): Promise<CourierCity[]> {
    const body = await call(creds, '/cities');
    return (Array.isArray(body.cities) ? body.cities : [])
      .filter((c: any) => c?.id && c?.name)
      .map((c: any) => ({ id: String(c.id), name: String(c.name) }));
  },

  async pickupAddresses(creds): Promise<PickupAddress[]> {
    const body = await call(creds, '/pickup_addresses');
    return (Array.isArray(body.pickup_addresses) ? body.pickup_addresses : [])
      .filter((a: any) => a?.id)
      .sort((a: any, b: any) => Number(!!b.default) - Number(!!a.default))
      .map((a: any) => ({ code: String(a.id), address: String(a.address ?? a.person_of_contact ?? ''), city: a.city?.name ?? null }));
  },

  async services() {
    return [
      { code: '1', name: 'Rush' },
      { code: '2', name: 'Saver Plus' },
      { code: '3', name: 'Swift' },
      { code: '4', name: 'Same day' },
    ];
  },

  async book(creds, settings: CourierSettings, i: BookInput): Promise<BookResult> {
    const phone = pkPhone(i.customerPhone);
    if (!/^03\d{9}$/.test(phone)) throw new CourierApiError('Customer ka phone 03xxxxxxxxx jaisa hona chahiye');
    let pickup = settings.pickupAddressCode ? String(settings.pickupAddressCode) : '';
    if (!pickup) pickup = (await this.pickupAddresses!(creds))[0]?.code ?? '';
    if (!pickup) throw new CourierApiError('Trax pickup address chunein (Couriers → Trax → Settings)');
    const corporate = String(settings.chargesMode ?? '4') === '3';
    const cod = Math.max(0, Math.round(i.codAmount));
    const body = await call(creds, '/shipment/book', {
      method: 'POST',
      json: {
        service_type_id: 1,
        pickup_address_id: Number(pickup),
        information_display: 0,
        consignee_city_id: Number(i.city.id),
        consignee_name: i.customerName.slice(0, 100),
        consignee_address: i.address.slice(0, 190),
        consignee_phone_number_1: phone,
        // Trax email lazmi maangta hai — customer ka na ho to Nafaa ka no-reply
        consignee_email_address: i.customerEmail || 'no-reply@nafaa.pk',
        order_id: i.orderRef.slice(0, 100),
        item_product_type_id: Number(settings.productTypeId ?? 24),
        item_description: i.description.slice(0, 190),
        item_quantity: Math.max(1, i.pieces),
        item_insurance: 0,
        pickup_date: pkToday(),
        special_instructions: (i.notes ?? '').slice(0, 190) || undefined,
        estimated_weight: Math.max(0.1, Number(i.weightKg.toFixed(2))),
        shipping_mode_id: Number(settings.serviceType ?? 1),
        amount: cod,
        payment_mode_id: cod > 0 ? 1 : 4,
        charges_mode_id: corporate ? 3 : 4,
        ...(corporate ? { delivery_type_id: 1 } : {}),
        pieces_quantity: Math.min(10, Math.max(1, i.pieces)),
      },
    });
    const tn = body.tracking_number ?? body['tracking number'];
    if (!tn) throw new CourierApiError('Trax ne tracking number nahi diya — Sonic portal par check karein');
    return { trackingNumber: String(tn), raw: { tracking_number: tn } };
  },

  async track(creds, tns): Promise<TrackResult[]> {
    const out: TrackResult[] = [];
    for (const tn of tns) {
      const body = await call(creds, `/shipment/track?tracking_number=${encodeURIComponent(tn)}&type=0`).catch((e) => {
        if (e instanceof CourierApiError && e.auth) throw e;
        return null;
      });
      const hist: any[] = Array.isArray(body?.details?.tracking_history) ? body.details.tracking_history : [];
      if (!hist.length) continue;
      // Trax: sab se naya pehle
      const last = hist[0];
      const label = String(last.status ?? '') + (last.status_reason ? ` (${last.status_reason})` : '');
      out.push({
        trackingNumber: tn,
        state: normalizeCourierStatus(String(last.status ?? '')),
        label,
        at: last.timestamp ? new Date(Number(last.timestamp) * 1000) : null,
        history: [...hist].reverse().slice(-20).map((h) => ({ label: `${h.status ?? ''}${h.status_reason ? ` (${h.status_reason})` : ''}`, at: h.date_time ?? null })),
      });
    }
    return out;
  },

  async cancel(creds, tn) {
    await call(creds, '/shipment/cancel', { method: 'POST', json: { tracking_number: tn } });
  },

  async label(creds, tn) {
    const r = await fetchPdfOrJson(`${BASE}/shipment/air_waybill?tracking_number=${encodeURIComponent(tn)}&type=1`, { Authorization: creds.apiKey });
    if (r.pdf) return { pdf: r.pdf };
    if (/api token|authorization/i.test(String(r.json?.message ?? ''))) throw new CourierApiError('Trax ne API key nahi maani', true);
    throw new CourierApiError(r.json?.message ? String(r.json.message).slice(0, 200) : 'Trax se label nahi mila — Sonic portal se print karein');
  },

  async paymentSettled(creds, tn) {
    const body = await call(creds, `/shipment/payment_status?tracking_number=${encodeURIComponent(tn)}`).catch(() => null);
    if (!body) return null;
    return { settled: /processed|paid|settled/i.test(String(body.current_payment_status ?? '')), reference: null };
  },
};
