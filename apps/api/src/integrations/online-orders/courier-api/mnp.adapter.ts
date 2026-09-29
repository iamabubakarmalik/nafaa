import { courierFetch } from './http';
import { normalizeCourierStatus } from './status';
import { pkPhone } from './postex.adapter';
import {
  BookInput, BookResult, CourierAdapter, CourierApiError, CourierCity, CourierCreds, CourierSettings, PickupAddress, TestResult, TrackResult,
} from './types';

/**
 * M&P (Muller & Phipps) COD API — mnpcourier.com/mycodapi. Username +
 * password body/query me (header nahi). Har jawab HTTP 200 + "isSuccess"
 * (kabhi "true" string, kabhi boolean, kabhi "isSucces" typo). Shehar NAAM
 * se. Staging nahi hai. Keys ki casing har endpoint par alag — jaisi docs.
 */
const BASE = 'https://mnpcourier.com/mycodapi/api';

const ok = (b: any) => {
  const r = Array.isArray(b) ? b[0] : b;
  const v = r?.isSuccess ?? r?.isSucces;
  return v === true || String(v).toLowerCase() === 'true';
};
const first = (b: any) => (Array.isArray(b) ? b[0] : b);
const authMsg = (m: string) => /credential|password|username|login/i.test(m);

function fail(body: any, fallback: string): never {
  const m = String(first(body)?.message ?? fallback);
  throw new CourierApiError(authMsg(m) ? 'M&P ne username / password nahi maana — M&P se mili details dobara check karein' : `M&P: ${m.slice(0, 200)}`, authMsg(m));
}

const q = (o: Record<string, string | undefined>) => new URLSearchParams(Object.entries(o).map(([k, v]) => [k, v ?? ''])).toString();

export const mnpAdapter: CourierAdapter = {
  code: 'MNP',

  async test(creds): Promise<TestResult> {
    const [cities, pickupAddresses] = await Promise.all([this.cities(creds), this.pickupAddresses!(creds)]);
    return { cities: cities.length, pickupAddresses };
  },

  async cities(creds): Promise<CourierCity[]> {
    const { body } = await courierFetch(`${BASE}/Branches/Get_Cities_All?${q({ username: creds.apiKey, password: creds.password, AccountNo: creds.accountNo })}`);
    const list: string[] = first(body)?.City ?? [];
    if (list.length === 1 && authMsg(list[0])) throw new CourierApiError('M&P ne username / password / account number nahi maana', true);
    return list.filter((n) => n && !/object reference|not valid/i.test(n)).map((n) => ({ id: n, name: n }));
  },

  async pickupAddresses(creds): Promise<PickupAddress[]> {
    const { body } = await courierFetch(`${BASE}/Locations/Get_locations?${q({ username: creds.apiKey, password: creds.password, AccountNo: creds.accountNo })}`);
    if (!ok(body)) fail(body, 'Locations nahi mili');
    return (first(body)?.locationList ?? []).map((l: any) => ({ code: String(l.locationID), address: `${l.locationName ?? ''}${l.locationAddress ? ` — ${l.locationAddress}` : ''}`, city: null }));
  },

  async services() {
    return [{ code: 'Overnight', name: 'Overnight' }, { code: 'Second Day', name: 'Second Day' }];
  },

  async book(creds, settings: CourierSettings, i: BookInput): Promise<BookResult> {
    const phone = pkPhone(i.customerPhone);
    if (!/^03\d{9}$/.test(phone)) throw new CourierApiError('Customer ka phone 03xxxxxxxxx jaisa hona chahiye');
    let location = settings.pickupAddressCode ? String(settings.pickupAddressCode) : '';
    if (!location) location = (await this.pickupAddresses!(creds))[0]?.code ?? '';
    if (!location) throw new CourierApiError('M&P location chunein (Couriers → M&P → Settings)');
    const { body } = await courierFetch(`${BASE}/Booking/InsertBookingData`, {
      method: 'POST',
      json: {
        username: creds.apiKey,
        password: creds.password,
        consigneeName: i.customerName.slice(0, 50),
        consigneeAddress: i.address.slice(0, 255),
        consigneeMobNo: phone,
        consigneeEmail: i.customerEmail ?? '',
        destinationCityName: i.city.name,
        pieces: Math.min(99, Math.max(1, i.pieces)),
        weight: Math.max(0.1, Number(i.weightKg.toFixed(2))),
        codAmount: Math.max(0, Math.round(i.codAmount)),
        custRefNo: i.orderRef.slice(0, 50),
        productDetails: i.description.slice(0, 50),
        fragile: 'NO',
        service: String(settings.serviceType || 'Overnight'),
        remarks: (i.notes ?? '').slice(0, 400),
        insuranceValue: '0',
        locationID: location,
        AccountNo: creds.accountNo,
        ReturnLocation: creds.returnLocation || location,
        subAccountId: Number(creds.subAccountId || 0),
        ...(creds.insertType ? { InsertType: Number(creds.insertType) } : {}),
      },
    });
    if (!ok(body)) fail(body, 'Booking nahi hui');
    const tn = first(body)?.orderReferenceId;
    if (!tn) throw new CourierApiError('M&P ne CN nahi diya — M&P portal par check karein');
    return { trackingNumber: String(tn) };
  },

  async track(_creds, tns): Promise<TrackResult[]> {
    const out: TrackResult[] = [];
    for (const tn of tns) {
      // Public tracking — live par jawab ki shakal tasdeeq shuda
      const { body } = await courierFetch(`${BASE}/Tracking/Tracking?consignment=${encodeURIComponent(tn)}`).catch(() => ({ body: null } as any));
      const d = first(body)?.tracking_Details?.[0];
      if (!d) continue;
      const details: any[] = Array.isArray(d.Details) ? d.Details : [];
      const label = String(d.CNStatus ?? details[details.length - 1]?.Status ?? '');
      if (!label) continue;
      out.push({
        trackingNumber: tn,
        state: normalizeCourierStatus(label),
        label,
        at: null,
        history: details.slice(-20).map((h) => ({ label: `${h.Status ?? ''}${h.Detail ? ` — ${h.Detail}` : ''}${h.Location ? ` (${h.Location})` : ''}`, at: h.DateTime ?? null })),
      });
    }
    return out;
  },

  async cancel(creds, tn, settings) {
    const { body } = await courierFetch(`${BASE}/Booking/VoidConsignment`, {
      method: 'POST',
      json: { Username: creds.apiKey, password: creds.password, locationID: String(settings?.pickupAddressCode ?? ''), consignmentNumberList: [tn] },
    });
    if (!ok(body)) fail(body, 'Cancel nahi hua');
    const row = first(body)?.orderReferenceIdList?.[0];
    if (row && row.success === false) throw new CourierApiError(`M&P: ${String(row.message ?? 'cancel nahi hua').slice(0, 200)}`);
  },

  async label() {
    // M&P label API ka jawab (PDF/URL) docs me nahi — portal se print
    throw new CourierApiError('M&P ka label M&P portal se print karein (CN copy karke)');
  },
};
