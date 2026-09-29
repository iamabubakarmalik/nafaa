import { courierFetch } from './http';
import { normalizeCourierStatus } from './status';
import { pkPhone } from './postex.adapter';
import {
  BookInput, BookResult, CourierAdapter, CourierApiError, CourierCity, CourierCreds, CourierSettings, PickupAddress, TestResult, TrackResult,
} from './types';

/**
 * Call Courier API — cod.callcourier.com.pk. Pehchan sirf "LoginId" (KAM
 * deta hai, jaise LHE-1234). Booking GET query se — HAR parameter hona
 * zaroori (warna route hi nahi milta). CN "CNNO" me, ghalti "Response" me.
 * Shehar CityID se, bhejne wale ka area AreaID se. Sandbox nahi hai.
 */
const BASE = 'https://cod.callcourier.com.pk/API/CallCourier';
const COD_SERVICE = '7';

const title = (s: string) => s.toLowerCase().replace(/\b[a-z]/g, (m) => m.toUpperCase());

async function get(path: string) {
  const { status, body } = await courierFetch(`${BASE}/${path}`);
  if (status >= 500) throw new CourierApiError('Call Courier ka server abhi jawab nahi de raha');
  if (status === 404 && body?.Message) throw new CourierApiError('Call Courier ne request nahi maani');
  return body;
}

async function cityList(): Promise<CourierCity[]> {
  const body = await get(`GetCityListByService?serviceID=${COD_SERVICE}`);
  return (Array.isArray(body) ? body : [])
    .filter((c: any) => c?.CityID && c?.CityName)
    .map((c: any) => ({ id: String(c.CityID), name: title(String(c.CityName).trim()) }));
}

export const callCourierAdapter: CourierAdapter = {
  code: 'CALL_COURIER',

  async test(creds): Promise<TestResult> {
    // LoginId ki pehchan: origin list sirf sahi login par aati hai
    const origins = await get(`GetOriginListByShipper?LoginId=${encodeURIComponent(creds.apiKey)}`);
    if (!origins || (Array.isArray(origins) && !origins.length)) {
      throw new CourierApiError('Call Courier ne Login ID nahi maana — Call Courier KAM se mila Login ID (jaise LHE-1234) daalein', true);
    }
    return { cities: (await cityList()).length };
  },

  async cities(): Promise<CourierCity[]> {
    return cityList();
  },

  /** Bhejne wale ka area — Settings wale shehar ke areas */
  async pickupAddresses(_creds, settings?: CourierSettings): Promise<PickupAddress[]> {
    const cityId = settings?.originCityId;
    if (!cityId) return [];
    const body = await get(`GetAreasByCity?CityID=${encodeURIComponent(String(cityId))}`);
    return (Array.isArray(body) ? body : [])
      .filter((a: any) => a?.AreaID)
      .map((a: any) => ({ code: String(a.AreaID), address: String(a.AreaName ?? a.AreaID), city: null }));
  },

  async book(creds, settings: CourierSettings, i: BookInput): Promise<BookResult> {
    const phone = pkPhone(i.customerPhone);
    if (!/^03\d{9}$/.test(phone)) throw new CourierApiError('Customer ka phone 03xxxxxxxxx jaisa hona chahiye');
    if (!settings.originCityId || !settings.pickupAddressCode || !settings.shipperName || !settings.shipperPhone || !settings.shipperAddress) {
      throw new CourierApiError('Call Courier ki Settings poori karein: apna shehar, area, naam, phone aur address');
    }
    const cod = Math.max(0, Math.round(i.codAmount));
    if (cod <= 0) throw new CourierApiError('Call Courier COD service par 0 raqam nahi leta — paid order kisi aur courier se bhejein');
    const origin = (await cityList()).find((c) => c.id === String(settings.originCityId));
    const params = new URLSearchParams({
      loginId: creds.apiKey,
      ConsigneeName: i.customerName.slice(0, 100),
      ConsigneeRefNo: i.orderRef.slice(0, 50),
      ConsigneeCellNo: phone,
      Address: i.address.slice(0, 300),
      Origin: origin?.name ?? String(settings.originName ?? ''),
      DestCityId: i.city.id,
      ServiceTypeId: COD_SERVICE,
      Pcs: String(Math.max(1, i.pieces)),
      Weight: String(Math.max(0.1, Number(i.weightKg.toFixed(2)))),
      Description: i.description.slice(0, 200),
      SelOrigin: 'Domestic',
      CodAmount: String(cod),
      SpecialHandling: 'false',
      MyBoxId: '1',
      Holiday: 'false',
      remarks: (i.notes ?? '').slice(0, 200),
      ShipperName: String(settings.shipperName).slice(0, 100),
      ShipperCellNo: pkPhone(String(settings.shipperPhone)),
      ShipperArea: String(settings.pickupAddressCode),
      ShipperCity: String(settings.originCityId),
      ShipperAddress: String(settings.shipperAddress).slice(0, 200),
      ShipperLandLineNo: pkPhone(String(settings.shipperPhone)),
      ShipperEmail: String(settings.shipperEmail ?? ''),
      ShipperReturnAddress: String(settings.shipperAddress).slice(0, 200),
    });
    const body = await get(`SaveBooking?${params}`);
    const cn = body?.CNNO;
    if (!cn) {
      const m = String(body?.Response ?? 'Booking nahi hui');
      const auth = /login/i.test(m);
      throw new CourierApiError(auth ? 'Call Courier ne Login ID nahi maana' : `Call Courier: ${m.replace(/^false,\s*/i, '').slice(0, 200)}`, auth);
    }
    return { trackingNumber: String(cn) };
  },

  async track(_creds, tns): Promise<TrackResult[]> {
    const out: TrackResult[] = [];
    for (const tn of tns) {
      const body = await get(`GetTackingHistory?cn=${encodeURIComponent(tn)}`).catch(() => null);
      const events: any[] = Array.isArray(body) ? body : [];
      if (!events.length) continue;
      const last = events[events.length - 1];
      const label = String(last.ProcessDescForPortal ?? last.OperationDesc ?? '') + (last.ReasonDesc ? ` (${last.ReasonDesc})` : '');
      out.push({
        trackingNumber: tn,
        state: normalizeCourierStatus(String(last.OperationDesc ?? last.ProcessDescForPortal ?? '')),
        label,
        at: null,
        history: events.slice(-20).map((e) => ({ label: `${e.ProcessDescForPortal ?? e.OperationDesc ?? ''}${e.ReasonDesc ? ` (${e.ReasonDesc})` : ''}`, at: e.TransactionDate ?? null })),
      });
    }
    return out;
  },

  async cancel() {
    // CancelBooking ka jawab kahin likha nahi — andaaze par "cancel ho gaya" nahi kehna
    throw new CourierApiError('Call Courier booking portal se cancel karein');
  },

  async label() {
    throw new CourierApiError('Call Courier ka label Call Courier portal se print karein (CN copy karke)');
  },
};
