import { courierFetch, fetchPdfOrJson, findUrl } from './http';
import { normalizeCourierStatus } from './status';
import { pkPhone } from './postex.adapter';
import {
  BookInput, BookResult, CourierAdapter, CourierApiError, CourierCity, CourierCreds, CourierSettings, PickupAddress, TestResult, TrackResult,
} from './types';

/**
 * TCS OCI API (ociconnect.tcscourier.com — naya, Envio wala). Do token:
 *  1) POST /auth/api/auth {clientid, clientsecret} → bearer (header me)
 *  2) GET /ecom/api/authentication/token?username&password → accesstoken
 *     (har ecom/tracking call ke body ya query me)
 * Shehar 3 harf ke code se (KHI, LHE). Pickup = "cost center".
 * Pehle UAT (devconnect) pass hota hai, phir TCS live deta hai.
 */
const HOSTS = { live: 'https://ociconnect.tcscourier.com', uat: 'https://devconnect.tcscourier.com' };
const TOKEN_TTL_MS = 25 * 60_000;

type Tokens = { bearer: string; access: string; at: number };
const tokenCache = new Map<string, Tokens>();

const host = (c: CourierCreds) => (c.environment === 'uat' ? HOSTS.uat : HOSTS.live);
const cacheKey = (c: CourierCreds) => `${host(c)}|${c.apiKey}|${c.username}`;

async function tokens(creds: CourierCreds, fresh = false): Promise<Tokens> {
  const key = cacheKey(creds);
  const hit = tokenCache.get(key);
  if (!fresh && hit && Date.now() - hit.at < TOKEN_TTL_MS) return hit;

  const a = await courierFetch(`${host(creds)}/auth/api/auth`, { method: 'POST', json: { clientid: creds.apiKey, clientsecret: creds.clientSecret ?? '' } });
  const bearer = a.body?.result?.accessToken;
  if (!bearer) throw new CourierApiError('TCS ne Client ID / Client Secret nahi maana — TCS se mili keys dobara check karein', true);

  const q = new URLSearchParams({ username: creds.username ?? '', password: creds.password ?? '' });
  const b = await courierFetch(`${host(creds)}/ecom/api/authentication/token?${q}`, { headers: { Authorization: `Bearer ${bearer}` } });
  const access = b.body?.accesstoken;
  if (!access) throw new CourierApiError('TCS ne Envio username / password nahi maana', true);

  const t = { bearer, access, at: Date.now() };
  tokenCache.set(key, t);
  return t;
}

/** TCS call — 401 par ek dafa naya token le kar dobara */
async function call(creds: CourierCreds, path: string, opts: { method?: 'GET' | 'POST'; query?: Record<string, string>; json?: Record<string, unknown> } = {}, retry = true): Promise<any> {
  const t = await tokens(creds);
  const q = new URLSearchParams({ ...(opts.method === 'POST' ? {} : { accesstoken: t.access }), ...(opts.query ?? {}) });
  const url = `${host(creds)}${path}${q.toString() ? `?${q}` : ''}`;
  const { status, body } = await courierFetch(url, {
    method: opts.method ?? 'GET',
    headers: { Authorization: `Bearer ${t.bearer}` },
    json: opts.method === 'POST' ? { accesstoken: t.access, ...(opts.json ?? {}) } : undefined,
  });
  if (status === 401 && retry) {
    tokenCache.delete(cacheKey(creds));
    return call(creds, path, opts, false);
  }
  if (status === 401) throw new CourierApiError('TCS ne token nahi maana — keys dobara check karein', true);
  if (status === 404) throw new CourierApiError('TCS ka ye hissa nahi mila');
  if (status >= 500 || !body) throw new CourierApiError('TCS ka server abhi jawab nahi de raha');
  if (Array.isArray(body.error) && body.error.length) {
    throw new CourierApiError(`TCS: ${body.error.map((e: any) => e?.errormessage ?? e?.message ?? JSON.stringify(e)).slice(0, 3).join(' · ')}`);
  }
  if (Array.isArray(body.errorList) && body.errorList.length) {
    throw new CourierApiError(`TCS: ${body.errorList.map((e: any) => e?.errormessage ?? e?.key).slice(0, 3).join(' · ')}`);
  }
  return body;
}

const title = (s: string) => s.toLowerCase().replace(/\b[a-z]/g, (m) => m.toUpperCase());

async function costCenters(creds: CourierCreds) {
  const body = await call(creds, '/ecom/api/inquiry/costcenterinquiry', { query: { customerno: creds.accountNo ?? '' } });
  return (Array.isArray(body.detail) ? body.detail : []) as any[];
}

export const tcsAdapter: CourierAdapter = {
  code: 'TCS',

  async test(creds): Promise<TestResult> {
    tokenCache.delete(cacheKey(creds));
    const cities = await this.cities(creds);
    const pickupAddresses = await this.pickupAddresses!(creds).catch(() => []);
    return { cities: cities.length, pickupAddresses };
  },

  async cities(creds): Promise<CourierCity[]> {
    const body = await call(creds, '/ecom/api/setup/citylistbycountry', { query: { countrycode: 'PK' } });
    return (Array.isArray(body.data) ? body.data : [])
      .filter((c: any) => c?.citycode && c?.cityname)
      .map((c: any) => ({ id: String(c.citycode), name: title(String(c.cityname)) }));
  },

  async pickupAddresses(creds): Promise<PickupAddress[]> {
    return (await costCenters(creds))
      .filter((c) => c?.costcentercode)
      .map((c) => ({ code: String(c.costcentercode), address: `${c.costcentername ?? ''}${c.pickupaddress ? ` — ${c.pickupaddress}` : ''}`, city: c.costcentercity ?? null }));
  },

  async services() {
    // TCS ne sirf "O" (Overnight) likha hai; baqi codes account manager deta hai
    return [{ code: 'O', name: 'Overnight (O)' }];
  },

  async book(creds, settings: CourierSettings, i: BookInput): Promise<BookResult> {
    const phone = pkPhone(i.customerPhone);
    if (!/^03\d{9}$/.test(phone)) throw new CourierApiError('Customer ka phone 03xxxxxxxxx jaisa hona chahiye');
    const centers = await costCenters(creds);
    const cc = centers.find((c) => String(c.costcentercode) === String(settings.pickupAddressCode ?? '')) ?? centers[0];
    if (!cc) throw new CourierApiError('TCS account me koi cost center (pickup) nahi — TCS se banwayein ya Settings me chunein');
    const shipperMobile = pkPhone(cc.phoneno) || pkPhone(String(settings.shipperPhone ?? ''));

    const body = await call(creds, '/ecom/api/booking/create', {
      method: 'POST',
      json: {
        consignmentno: '',
        shipperinfo: {
          tcsaccount: creds.accountNo,
          shippername: String(settings.shipperName || cc.costcentername || 'Shipper').slice(0, 50).padEnd(3, '.'),
          address1: String(cc.pickupaddress || settings.shipperAddress || '').slice(0, 120).padEnd(3, '.'),
          countrycode: 'PK',
          countryname: 'Pakistan',
          cityname: String(cc.costcentercity ?? ''),
          mobile: shipperMobile,
        },
        consigneeinfo: {
          firstname: i.customerName.slice(0, 50).padEnd(3, '.'),
          address1: i.address.slice(0, 120).padEnd(3, '.'),
          mobile: phone,
          email: i.customerEmail || undefined,
          countrycode: 'PK',
          countryname: 'Pakistan',
          citycode: i.city.id,
          cityname: i.city.name.toUpperCase(),
        },
        shipmentinfo: {
          costcentercode: String(cc.costcentercode),
          referenceno: i.orderRef.slice(0, 50),
          contentdesc: i.description.slice(0, 200),
          servicecode: String(settings.serviceType || 'O'),
          codamount: Math.max(0, Math.round(i.codAmount)),
          weightinkg: Math.max(0.5, Number(i.weightKg.toFixed(2))),
          pieces: Math.max(1, i.pieces),
          fragile: false,
          currency: 'PKR',
          remarks: (i.notes ?? '').slice(0, 500) || undefined,
        },
      },
    });
    const tn = body.consignmentNo ?? body.consignmentno;
    if (!tn) throw new CourierApiError(body.message ? `TCS: ${String(body.message).slice(0, 200)}` : 'TCS ne CN nahi diya');
    return { trackingNumber: String(tn), raw: { consignmentNo: tn } };
  },

  async track(creds, tns): Promise<TrackResult[]> {
    const out: TrackResult[] = [];
    for (const tn of tns) {
      const body = await call(creds, '/tracking/api/Tracking/GetDynamicTrackDetail', { query: { consignee: tn } }).catch((e) => {
        if (e instanceof CourierApiError && e.auth) throw e;
        return null;
      });
      if (!body || String(body.message).toUpperCase() === 'FAIL') continue;
      const checkpoints: any[] = Array.isArray(body.checkpoints) ? body.checkpoints : [];
      const delivery: any[] = Array.isArray(body.deliveryinfo) ? body.deliveryinfo : [];
      const summary = /Current Status:\s*([^\n]+)/i.exec(String(body.shipmentsummary ?? ''))?.[1]?.trim();
      // TCS: sab se naya pehle
      const label = String(delivery[0]?.status ?? checkpoints[0]?.status ?? summary ?? '');
      if (!label) continue;
      out.push({
        trackingNumber: tn,
        state: normalizeCourierStatus(summary ?? label),
        label,
        at: null,
        history: [...checkpoints].reverse().slice(-20).map((h) => ({ label: String(h.status ?? ''), at: h.datetime ?? null })),
      });
    }
    return out;
  },

  async cancel(creds, tn) {
    const body = await call(creds, '/ecom/api/booking/cancel', { method: 'POST', json: { consignmentnumber: tn } });
    if (!/success/i.test(String(body.message ?? ''))) throw new CourierApiError(`TCS: ${String(body.message ?? 'cancel nahi hua').slice(0, 200)}`);
  },

  async label(creds, tn) {
    const t = await tokens(creds);
    const q = new URLSearchParams({ accesstoken: t.access, consignmentno: tn, shipperDetails: 'true' });
    const r = await fetchPdfOrJson(`${host(creds)}/ecom/api/print/label?${q}`, { Authorization: `Bearer ${t.bearer}` });
    if (r.pdf) return { pdf: r.pdf };
    const url = findUrl(r.json);
    if (url) return { url };
    throw new CourierApiError(r.json?.message ? `TCS: ${String(r.json.message).slice(0, 200)}` : 'TCS se label nahi mila — Envio portal se print karein');
  },

  async paymentSettled(creds, tn) {
    const body = await call(creds, '/ecom/api/Payment/status', { query: { customerno: creds.accountNo ?? '', cnno: tn } }).catch(() => null);
    const row = Array.isArray(body?.detail) ? body.detail[0] : null;
    if (!row) return null;
    const ps = String(row['payment status'] ?? '').trim();
    return { settled: /^(y|yes|paid)$/i.test(ps), reference: row['payment date'] ? `paid ${row['payment date']}` : null };
  },
};
