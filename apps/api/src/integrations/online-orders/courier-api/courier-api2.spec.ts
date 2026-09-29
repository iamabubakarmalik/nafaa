import { normalizeCourierStatus } from './status';
import { traxAdapter } from './trax.adapter';
import { tcsAdapter } from './tcs.adapter';

describe('status: Trax/TCS lafz', () => {
  const cases: [string, string][] = [
    ['Shipment - Booked', 'BOOKED'], ['Shipment - Arrived at Origin', 'IN_TRANSIT'], ['Shipment - Out for Delivery', 'OUT_FOR_DELIVERY'],
    ['Shipment - Delivery Unsuccessful', 'ATTEMPTED'], ['Shipment - Delivered', 'DELIVERED'], ['Return - In Transit', 'RETURNING'],
    ['Return - Confirm', 'RETURNING'], ['Return - Delivered to Shipper', 'RETURNED'], ['Return To Origin', 'RETURNED'],
    ['Awaiting Receiver Collection', 'ATTEMPTED'], ['Arrived at TCS Facility', 'IN_TRANSIT'], ['Shipment-Arrived at origin', 'IN_TRANSIT'],
  ];
  it.each(cases)('%s → %s', (raw, want) => expect(normalizeCourierStatus(raw)).toBe(want));
});

type Route = (url: string, init: any) => { status?: number; body: any } | undefined;
const realFetch = global.fetch;
let calls: { url: string; init: any }[] = [];
function mock(route: Route) {
  global.fetch = (async (url: any, init: any) => {
    calls.push({ url: String(url), init });
    const r = route(String(url), init) ?? { status: 404, body: { message: 'not found' } };
    return new Response(JSON.stringify(r.body), { status: r.status ?? 200, headers: { 'content-type': 'application/json' } });
  }) as any;
}

const input = {
  orderRef: '1002', customerName: 'Sara Ali', customerPhone: '0300-1234567', address: 'House 5, Street 9', city: { id: '202', name: 'Karachi' },
  codAmount: 3100.6, pieces: 2, weightKg: 0.3, description: 'Shirt x2',
};

describe('Trax adapter', () => {
  beforeEach(() => { calls = []; });
  afterAll(() => { global.fetch = realFetch; });

  it('book: Authorization raw key, ids numeric, COD int', async () => {
    mock((u) => (u.endsWith('/api/shipment/book') ? { body: { status: 0, message: 'Shipment has been Booked!', tracking_number: '101234' } } : undefined));
    const r = await traxAdapter.book({ apiKey: 'KEY' }, { pickupAddressCode: '55', serviceType: '2' }, input);
    expect(r.trackingNumber).toBe('101234');
    expect(calls[0].init.headers.Authorization).toBe('KEY');
    const b = JSON.parse(calls[0].init.body);
    expect(b).toMatchObject({ pickup_address_id: 55, consignee_city_id: 202, consignee_phone_number_1: '03001234567', amount: 3101, payment_mode_id: 1, charges_mode_id: 4, shipping_mode_id: 2, order_id: '1002', item_product_type_id: 24 });
    expect(/^\d{4}-\d{2}-\d{2}$/.test(b.pickup_date)).toBe(true);
  });

  it('HTTP 200 + status 1 = error (auth)', async () => {
    mock(() => ({ body: { status: 1, message: 'Invalid API Token (Authorization).' } }));
    await expect(traxAdapter.cities({ apiKey: 'x' })).rejects.toMatchObject({ auth: true });
  });

  it('track: history[0] naya', async () => {
    mock(() => ({ body: { status: 0, details: { tracking_history: [
      { status: 'Return - Delivered to Shipper', status_reason: null, timestamp: 1759100000, date_time: '29/09/2026 10:00 AM' },
      { status: 'Shipment - Delivery Unsuccessful', status_reason: 'Address Closed', timestamp: 1759000000 },
    ] } } }));
    const [t] = await traxAdapter.track({ apiKey: 'k' }, ['101234']);
    expect(t).toMatchObject({ state: 'RETURNED', trackingNumber: '101234' });
    expect(t.history[t.history.length - 1].label).toBe('Return - Delivered to Shipper');
  });

  it('cancel: POST body tracking_number', async () => {
    mock((u) => (u.endsWith('/api/shipment/cancel') ? { body: { status: 0, message: 'Cancelled' } } : undefined));
    await traxAdapter.cancel({ apiKey: 'k' }, '101234');
    expect(calls[0].init.method).toBe('POST');
    expect(JSON.parse(calls[0].init.body)).toEqual({ tracking_number: '101234' });
  });
});

describe('TCS adapter', () => {
  beforeEach(() => { calls = []; });
  afterAll(() => { global.fetch = realFetch; });
  const creds = { apiKey: 'CID', clientSecret: 'CS', username: 'u', password: 'p', accountNo: '04011K1' };
  const tcsRoutes: Route = (u, init) => {
    if (u.endsWith('/auth/api/auth')) return { body: { result: { accessToken: 'BEARER' }, status: true, code: '0200' } };
    if (u.includes('/ecom/api/authentication/token')) return { body: { accesstoken: 'ENVIO', message: 'success' } };
    if (u.includes('/inquiry/costcenterinquiry')) return { body: { detail: [{ costcentercode: 'CC1', costcentername: 'Main shop', pickupaddress: 'Shop 1, Saddar', costcentercity: 'KARACHI', phoneno: '03211234567' }] } };
    if (u.includes('/booking/create')) return { body: { response: 'SUCCESS', consignmentNo: '99210301520', code: '200', status: true } };
    if (u.includes('/setup/citylistbycountry')) return { body: { message: 'SUCCESS', data: [{ citycode: 'KHI', cityname: 'KARACHI' }] } };
    if (u.includes('GetDynamicTrackDetail')) return { body: { message: 'SUCCESS', checkpoints: [{ status: 'Delivered', datetime: 'Thursday Oct 17, 2024 12:58' }, { status: 'Out For Delivery' }], deliveryinfo: [{ status: 'Delivered' }], shipmentsummary: 'Current Status: DELIVERED\n' } };
    return undefined;
  };

  it('book: 2 token, bearer header, accesstoken body, cost center se shipper', async () => {
    mock(tcsRoutes);
    const r = await tcsAdapter.book(creds, {}, { ...input, city: { id: 'KHI', name: 'Karachi' } });
    expect(r.trackingNumber).toBe('99210301520');
    const book = calls.find((c) => c.url.includes('/booking/create'))!;
    expect(book.init.headers.Authorization).toBe('Bearer BEARER');
    const b = JSON.parse(book.init.body);
    expect(b).toMatchObject({
      accesstoken: 'ENVIO',
      shipperinfo: { tcsaccount: '04011K1', shippername: 'Main shop', cityname: 'KARACHI', mobile: '03211234567' },
      consigneeinfo: { citycode: 'KHI', cityname: 'KARACHI', mobile: '03001234567' },
      shipmentinfo: { costcentercode: 'CC1', servicecode: 'O', codamount: 3101, weightinkg: 0.5, pieces: 2 },
    });
  });

  it('cities: code + title case', async () => {
    mock(tcsRoutes);
    const list = await tcsAdapter.cities({ ...creds, username: 'u2' });
    expect(list[0]).toEqual({ id: 'KHI', name: 'Karachi' });
  });

  it('track: DELIVERED from summary', async () => {
    mock(tcsRoutes);
    const [t] = await tcsAdapter.track(creds, ['99210301520']);
    expect(t).toMatchObject({ state: 'DELIVERED', label: 'Delivered' });
  });

  it('ghalat client id → auth error', async () => {
    mock((u) => (u.endsWith('/auth/api/auth') ? { status: 400, body: { result: null, status: false, code: '402' } } : undefined));
    await expect(tcsAdapter.test({ ...creds, apiKey: 'BAD' })).rejects.toMatchObject({ auth: true });
  });
});

describe('status: M&P / Call Courier lafz', () => {
  const cases: [string, string][] = [
    ['Un Delivered', 'ATTEMPTED'], ['Undelivered', 'ATTEMPTED'], ['Not Delivered', 'ATTEMPTED'], ['RETURN SUBMITTED', 'RETURNED'],
    ['OUT for RETURN SUBMISSION', 'RETURNING'], ['CONSIGNMENT BOOKED', 'BOOKED'], ['Booking', 'BOOKED'], ['On Delivery', 'OUT_FOR_DELIVERY'],
    ['Canceled', 'CANCELLED'], ['DELIVERED', 'DELIVERED'], ['REACHED at DEST. BRANCH', 'IN_TRANSIT'], ['CONTACTING CONSIGNEE', 'IN_TRANSIT'],
  ];
  it.each(cases)('%s → %s', (raw, want) => expect(normalizeCourierStatus(raw)).toBe(want));
});
