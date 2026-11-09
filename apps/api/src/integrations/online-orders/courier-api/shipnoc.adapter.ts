import { TRACKING_MAPPERS } from './tracking-events';
import { courierFetch } from './http';
import { normalizeCourierStatus } from './status';
import { pkPhone } from './postex.adapter';
import {
  BookInput, BookResult, CourierAdapter, CourierApiError, CourierCity, CourierCreds, CourierSettings, TestResult, TrackResult,
} from './types';

/**
 * ShipNOC API (Beta). Source: ShipNOC's own ASP.NET Web API help pages at
 * http://api.shipnoc.com/help (BookParcel, CancelParcel, GetCity,
 * GetParcelTracking), read 9 Nov 2026.
 *
 * - Every call carries UserName, Password and Signature (body for POST,
 *   query string for GET). The host answers on plain HTTP only.
 * - Replies: { Response, ErrorDescription, ... }; Response "failure" means
 *   the call was refused and ErrorDescription says why.
 * - Booking returns TrackingNo, LabelURL and TrackingURL. There is no order
 *   reference field, so the order number goes into SpecialInstruction.
 */
export const SHIPNOC_BASE = 'http://api.shipnoc.com/api';

/**
 * ShipNOC issues the signature with the login. When the shop leaves it
 * empty, the form seen in a public ShipNOC integration is used:
 * user name + password + "noc@#".
 */
const signature = (c: CourierCreds) => c.signature?.trim() || `${c.apiKey}${c.password ?? ''}noc@#`;
const auth = (c: CourierCreds) => ({ UserName: c.apiKey, Password: c.password ?? '', Signature: signature(c) });

const failed = (body: any) => /fail|error|invalid/i.test(String(body?.Response ?? '')) || (!!body?.ErrorDescription && !body?.TrackingNo && !Array.isArray(body?.detail));

function errorOf(body: any): CourierApiError {
  const m = String(body?.ErrorDescription || body?.Response || 'ShipNOC ne mana kiya').slice(0, 200);
  const isAuth = /user|password|signature|credential|login|unauthori[sz]ed/i.test(m);
  return new CourierApiError(isAuth ? 'ShipNOC ne username / password / signature nahi maana' : m, isAuth);
}

async function call(path: string, init: RequestInit & { json?: unknown } = {}) {
  const { status, body } = await courierFetch(`${SHIPNOC_BASE}${path}`, init);
  if (status === 404) throw new CourierApiError('ShipNOC ka ye hissa nahi mila');
  if (status >= 500 || !body) throw new CourierApiError('ShipNOC ka server abhi jawab nahi de raha');
  if (status === 401) throw new CourierApiError('ShipNOC ne username / password / signature nahi maana', true);
  if (failed(body)) throw errorOf(body);
  return body;
}

const query = (c: CourierCreds, extra: Record<string, string> = {}) => new URLSearchParams({ ...auth(c), ...extra }).toString();

export const shipnocAdapter: CourierAdapter = {
  code: 'SHIPNOC',

  async test(creds): Promise<TestResult> {
    const cities = await this.cities(creds);
    if (!cities.length) throw new CourierApiError('ShipNOC ne shehron ki list nahi di — login details check karein');
    return { cities: cities.length };
  },

  async cities(creds): Promise<CourierCity[]> {
    const body = await call(`/GetCity?${query(creds)}`);
    return (Array.isArray(body.detail) ? body.detail : [])
      .map((c: any) => String(c?.CityName ?? '').trim())
      .filter(Boolean)
      .map((name: string) => ({ id: name, name }));
  },

  async book(creds, _settings: CourierSettings, i: BookInput): Promise<BookResult> {
    const phone = pkPhone(i.customerPhone);
    if (!/^03\d{9}$/.test(phone)) throw new CourierApiError('Customer ka phone 03xxxxxxxxx jaisa hona chahiye');
    const note = [`Order ${i.orderRef}`, i.notes].filter(Boolean).join(' · ');
    const body = await call('/BookParcel', {
      method: 'POST',
      json: {
        ...auth(creds),
        Parcels: [{
          ConsigneeName: i.customerName.slice(0, 100),
          ConsigneeAddress: i.address.slice(0, 250),
          // ShipNOC asks for an email; Nafaa's no-reply when the customer has none.
          ConsigneeEmail: i.customerEmail || 'no-reply@nafaa.pk',
          ConsigneeCellNo: phone,
          ItemType: i.description.slice(0, 150) || 'Parcel',
          City: i.city.name,
          Quantity: String(Math.max(1, i.pieces)),
          CODAmount: String(Math.max(0, Math.round(i.codAmount))),
          Weight: String(Math.max(0.1, Number(i.weightKg.toFixed(2)))),
          SpecialInstruction: note.slice(0, 250),
        }],
      },
    });
    const tn = String(body.TrackingNo ?? '').trim();
    if (!tn) throw errorOf({ ...body, ErrorDescription: body.ErrorDescription || 'ShipNOC ne tracking number nahi diya — portal par check karein' });
    return { trackingNumber: tn, labelUrl: body.LabelURL || null, raw: { TrackingNo: tn, TrackingURL: body.TrackingURL ?? null } };
  },

  async track(creds, tns): Promise<TrackResult[]> {
    const out: TrackResult[] = [];
    for (const tn of tns) {
      const body = await call(`/GetParcelTracking?${query(creds, { ParcelNo: tn })}`).catch((e) => {
        if (e instanceof CourierApiError && e.auth) throw e;
        return null;
      });
      const events = body ? TRACKING_MAPPERS.SHIPNOC(body) : [];
      if (!events.length) continue;
      const last = events[events.length - 1];
      out.push({
        trackingNumber: tn,
        state: normalizeCourierStatus(last.text),
        label: last.text,
        at: last.at ? new Date(last.at) : null,
        history: events.slice(-20).map((e) => ({ label: e.text, at: e.at })),
        events,
      });
    }
    return out;
  },

  async cancel(creds, tn) {
    const body = await call('/CancelParcel', { method: 'POST', json: { ...auth(creds), Parcels: [{ ParcelNo: tn }] } });
    const row = (Array.isArray(body.detail) ? body.detail : []).find((d: any) => String(d?.PacelNo ?? d?.ParcelNo ?? '') === tn);
    if (row && /not|fail|already|cannot|can't/i.test(String(row.Remarks ?? '')) && !/success|cancel(l)?ed/i.test(String(row.Remarks ?? ''))) {
      throw new CourierApiError(String(row.Remarks).slice(0, 200));
    }
  },

  async label(_creds, tn, savedUrl) {
    // The airway bill page ShipNOC links from its portal; the booking reply's LabelURL wins when saved.
    return { url: savedUrl || `https://shipnoc.com/PrintAirWayBill.aspx?ParcelNo=${encodeURIComponent(tn)}` };
  },
};
