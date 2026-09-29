import { courierFetch } from './http';
import { normalizeCourierStatus } from './status';
import { pkPhone } from './postex.adapter';
import {
  BookInput, BookResult, CourierAdapter, CourierApiError, CourierCity, CourierCreds, CourierSettings, TestResult, TrackResult,
} from './types';

/**
 * Leopards merchant API (merchantapi.leopardscourier.com). api_key +
 * api_password har request ke body me. Jawab: { status: 1|0, error, … }.
 * Wazan GRAM me; shipper ke khane "self" = account wali maloomat.
 */
const BASE = 'https://merchantapi.leopardscourier.com/api';

async function call(creds: CourierCreds, endpoint: string, payload: Record<string, unknown> = {}) {
  const { status, body } = await courierFetch(`${BASE}/${endpoint}/format/json/`, {
    method: 'POST',
    json: { api_key: creds.apiKey, api_password: creds.apiSecret ?? '', ...payload },
  });
  if (status >= 500 || !body) throw new CourierApiError('Leopards ka server abhi jawab nahi de raha');
  if (Number(body.status) !== 1) {
    const err = Array.isArray(body.error) ? body.error.join(', ') : String(body.error ?? 'Leopards ne mana kiya');
    const auth = /api key|api password|invalid|unauthori/i.test(err);
    throw new CourierApiError(auth ? 'Leopards ne API key / password nahi maana — Leopards portal se dobara copy karein' : err.slice(0, 200), auth);
  }
  return body;
}

export const leopardsAdapter: CourierAdapter = {
  code: 'LEOPARDS',

  async test(creds): Promise<TestResult> {
    return { cities: (await this.cities(creds)).length };
  },

  async cities(creds): Promise<CourierCity[]> {
    const body = await call(creds, 'getAllCities');
    return (Array.isArray(body.city_list) ? body.city_list : [])
      .filter((c: any) => c?.id && c?.name && c.allow_as_destination !== false && c.allow_as_destination !== 0)
      .map((c: any) => ({ id: String(c.id), name: String(c.name) }));
  },

  async book(creds, settings: CourierSettings, i: BookInput): Promise<BookResult> {
    const phone = pkPhone(i.customerPhone);
    if (phone.length < 10) throw new CourierApiError('Customer ka phone sahi nahi');
    const body = await call(creds, 'bookPacket', {
      booked_packet_weight: Math.max(1, Math.round(i.weightKg * 1000)),
      booked_packet_no_piece: Math.max(1, i.pieces),
      booked_packet_collect_amount: Math.max(0, Math.round(i.codAmount)),
      booked_packet_order_id: i.orderRef,
      origin_city: settings.originCityId || 'self',
      destination_city: i.city.id,
      shipment_name_eng: 'self',
      shipment_email: 'self',
      shipment_phone: 'self',
      shipment_address: 'self',
      consignment_name_eng: i.customerName.slice(0, 100),
      consignment_email: i.customerEmail || '',
      consignment_phone: phone,
      consignment_address: i.address.slice(0, 300),
      special_instructions: (i.notes || i.description).slice(0, 250),
    });
    if (!body.track_number) throw new CourierApiError('Leopards ne CN nahi diya — Leopards portal par check karein');
    return { trackingNumber: String(body.track_number), labelUrl: body.slip_link ?? null, raw: { track_number: body.track_number, slip_link: body.slip_link } };
  },

  async track(creds, tns): Promise<TrackResult[]> {
    const out: TrackResult[] = [];
    // Leopards ek call me kai CN leta hai
    for (let k = 0; k < tns.length; k += 50) {
      const body = await call(creds, 'trackBookedPacket', { track_numbers: tns.slice(k, k + 50).join(',') }).catch((e) => {
        if (e instanceof CourierApiError && e.auth) throw e;
        return null;
      });
      for (const p of (body?.packet_list ?? []) as any[]) {
        const detail: any[] = Array.isArray(p['Tracking Detail']) ? p['Tracking Detail'] : [];
        const label = String(p.booked_packet_status ?? detail[detail.length - 1]?.Status ?? '');
        const last = detail[detail.length - 1];
        out.push({
          trackingNumber: String(p.track_number ?? ''),
          state: normalizeCourierStatus(label),
          label,
          at: last?.Activity_datetime ? new Date(last.Activity_datetime) : null,
          history: detail.slice(-20).map((d) => ({ label: String(d.Status ?? ''), at: d.Activity_datetime ?? d.Activity_Date ?? null })),
        });
      }
    }
    return out.filter((r) => r.trackingNumber);
  },

  async cancel(creds, tn) {
    await call(creds, 'cancelBookedPackets', { cn_numbers: tn });
  },

  async label(_creds, _tn, savedUrl) {
    if (savedUrl && /^https:\/\//.test(savedUrl)) return { url: savedUrl };
    throw new CourierApiError('Leopards ka label link nahi mila — Leopards portal se print karein');
  },
};
