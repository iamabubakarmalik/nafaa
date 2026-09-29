import { courierFetch } from './http';
import { normalizeCourierStatus } from './status';
import {
  BookInput, BookResult, CourierAdapter, CourierApiError, CourierCity, CourierCreds, CourierSettings, PickupAddress, PortalShipment, TestResult, TrackResult,
} from './types';

/**
 * PostEx merchant API (api.postex.pk). Header "token" = merchant portal se
 * mili API key. Har jawab: { statusCode: "200", statusMessage, dist }.
 */
const BASE = 'https://api.postex.pk/services/integration/api/order';

async function call(creds: CourierCreds, path: string, init: RequestInit & { json?: unknown } = {}) {
  const { status, body } = await courierFetch(`${BASE}${path}`, { ...init, headers: { token: creds.apiKey, ...(init.headers ?? {}) } });
  const code = String(body?.statusCode ?? status);
  if (code === '401' || status === 401) throw new CourierApiError('PostEx ne key nahi maani — PostEx portal se sahi API token copy karein', true);
  if (code !== '200') throw new CourierApiError(cleanMsg(body?.statusMessage) ?? `PostEx ne mana kiya (${code})`);
  return body?.dist;
}

/** Spring ka lamba validation error dukandar ko nahi dikhana */
function cleanMsg(m?: string | null) {
  if (!m) return null;
  if (/Validation failed|org\.springframework|Exception/.test(m)) return 'PostEx ne order ki maloomat nahi maani — naam, phone (03xxxxxxxxx), address aur shehar check karein';
  return String(m).slice(0, 200);
}

/** 0300-1234567 / +92300… → 03001234567 (PostEx yahi format maangta hai) */
export function pkPhone(p?: string | null) {
  let d = String(p ?? '').replace(/\D/g, '');
  if (d.startsWith('0092')) d = d.slice(4);
  if (d.startsWith('92') && d.length === 12) d = d.slice(2);
  if (d.length === 10 && d.startsWith('3')) d = '0' + d;
  return d;
}

export const postexAdapter: CourierAdapter = {
  code: 'POSTEX',

  async test(creds): Promise<TestResult> {
    const cities = await this.cities(creds);
    const pickupAddresses = await this.pickupAddresses!(creds).catch(() => []);
    return { cities: cities.length, pickupAddresses };
  },

  async cities(creds): Promise<CourierCity[]> {
    const dist = await call(creds, '/v2/get-operational-city');
    return (Array.isArray(dist) ? dist : [])
      .filter((c: any) => c?.operationalCityName && c.isDeliveryCity !== false)
      .map((c: any) => ({ id: String(c.operationalCityName), name: String(c.operationalCityName) }));
  },

  async pickupAddresses(creds): Promise<PickupAddress[]> {
    const dist = await call(creds, '/v1/get-merchant-address');
    return (Array.isArray(dist) ? dist : [])
      .filter((a: any) => a?.addressCode)
      .map((a: any) => ({ code: String(a.addressCode), address: String(a.address ?? ''), city: a.cityName ?? null }));
  },

  async book(creds, settings: CourierSettings, i: BookInput): Promise<BookResult> {
    const phone = pkPhone(i.customerPhone);
    if (!/^03\d{9}$/.test(phone)) throw new CourierApiError('Customer ka phone 03xxxxxxxxx jaisa hona chahiye');
    const dist = await call(creds, '/v3/create-order', {
      method: 'POST',
      json: {
        orderRefNumber: i.orderRef,
        invoicePayment: Math.max(0, Math.round(i.codAmount)),
        invoiceDivision: 1,
        items: Math.max(1, i.pieces),
        orderDetail: i.description.slice(0, 250),
        customerName: i.customerName.slice(0, 100),
        customerPhone: phone,
        deliveryAddress: i.address.slice(0, 300),
        cityName: i.city.name,
        orderType: 'Normal',
        transactionNotes: i.notes?.slice(0, 250) || undefined,
        pickupAddressCode: settings.pickupAddressCode || undefined,
      },
    });
    const tn = dist?.trackingNumber;
    if (!tn) throw new CourierApiError('PostEx ne tracking number nahi diya — PostEx portal par check karein');
    return { trackingNumber: String(tn), raw: dist };
  },

  async track(creds, tns): Promise<TrackResult[]> {
    const out: TrackResult[] = [];
    for (const tn of tns) {
      const d = await call(creds, `/v1/track-order/${encodeURIComponent(tn)}`).catch((e) => {
        if (e instanceof CourierApiError && e.auth) throw e;
        return null;
      });
      if (!d) continue;
      const history: any[] = Array.isArray(d.transactionStatusHistory) ? d.transactionStatusHistory : [];
      const label = String(d.transactionStatus ?? history[history.length - 1]?.transactionStatusMessage ?? '');
      const last = history[history.length - 1];
      out.push({
        trackingNumber: tn,
        state: normalizeCourierStatus(label),
        label,
        at: last?.modifiedDatetime || last?.updatedAt ? new Date(last.modifiedDatetime ?? last.updatedAt) : null,
        history: history.slice(-20).map((h) => ({ label: String(h.transactionStatusMessage ?? h.status ?? ''), at: h.modifiedDatetime ?? h.updatedAt ?? null })),
      });
    }
    return out;
  },

  async listShipments(creds, from, to): Promise<PortalShipment[]> {
    const dist = await call(creds, `/v1/get-all-order?orderStatusId=0&startDate=${from}&endDate=${to}`);
    return (Array.isArray(dist) ? dist : []).map((row: any) => {
      const t = row?.trackingResponse ?? row ?? {};
      return {
        trackingNumber: String(t.trackingNumber ?? row?.trackingNumber ?? ''),
        orderRef: t.orderRefNumber ? String(t.orderRefNumber) : null,
        customerName: t.customerName || null,
        customerPhone: t.customerPhone || null,
        city: t.cityName || null,
        address: t.deliveryAddress || null,
        codAmount: Number(t.invoicePayment ?? 0) || 0,
        statusLabel: String(t.transactionStatus ?? t.orderStatus ?? ''),
        bookedAt: t.transactionDate ? new Date(t.transactionDate) : t.orderDate ? new Date(t.orderDate) : null,
      };
    }).filter((s) => s.trackingNumber);
  },

  async bulkLabel(creds, tns) {
    return this.label(creds, tns.slice(0, 50).join(','));
  },

  async cancel(creds, tn) {
    await call(creds, '/v1/cancel-order', { method: 'PUT', json: { trackingNumber: tn } });
  },

  async label(creds, tn) {
    let res: Response;
    try {
      res = await fetch(`${BASE}/v1/get-invoice?trackingNumbers=${encodeURIComponent(tn)}`, {
        headers: { token: creds.apiKey }, signal: AbortSignal.timeout(25_000),
      });
    } catch {
      throw new CourierApiError('PostEx se label nahi mila — thori der baad try karein');
    }
    const type = res.headers.get('content-type') ?? '';
    if (res.ok && /pdf|octet-stream/.test(type)) return { pdf: Buffer.from(await res.arrayBuffer()) };
    const body: any = await res.json().catch(() => null);
    if (res.status === 401 || String(body?.statusCode) === '401') throw new CourierApiError('PostEx ne key nahi maani', true);
    const url = findUrl(body?.dist);
    if (url) return { url };
    throw new CourierApiError('PostEx se label nahi mila — PostEx portal se print karein');
  },

  async paymentSettled(creds, tn) {
    const d = await call(creds, `/v1/payment-status/${encodeURIComponent(tn)}`).catch(() => null);
    if (!d) return null;
    const settled = d.settle === true || d.settled === true || /^(settled|paid)$/i.test(String(d.paymentStatus ?? d.settlementStatus ?? ''));
    return { settled, reference: d.cprNumber_1 ?? d.cprNumber ?? d.settlementReference ?? null };
  },
};

function findUrl(o: any): string | null {
  if (!o) return null;
  if (typeof o === 'string') return /^https:\/\//.test(o) ? o : null;
  if (typeof o !== 'object') return null;
  for (const v of Object.values(o)) {
    const u = findUrl(v);
    if (u) return u;
  }
  return null;
}

