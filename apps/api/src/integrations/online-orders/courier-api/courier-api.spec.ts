import { normalizeCourierStatus } from './status';
import { pkPhone, postexAdapter } from './postex.adapter';
import { leopardsAdapter } from './leopards.adapter';
import { matchCity } from '../courier-accounts.service';

describe('normalizeCourierStatus', () => {
  const cases: [string, string][] = [
    ['Booked', 'BOOKED'], ['Unbooked', 'BOOKED'], ['Pickup Request Sent', 'BOOKED'],
    ['Picked By PostEx', 'PICKED_UP'], ['PostEx WareHouse', 'IN_TRANSIT'], ['Arrived at Station', 'IN_TRANSIT'],
    ['Out For Delivery', 'OUT_FOR_DELIVERY'], ['Delivery Under Review', 'IN_TRANSIT'], ['Attempted', 'ATTEMPTED'],
    ['Delivered', 'DELIVERED'], ['Out For Return', 'RETURNING'], ['Being Return', 'RETURNING'],
    ['Ready for Return', 'RETURNING'], ['Returned', 'RETURNED'], ['Returned to shipper', 'RETURNED'],
    ['Cancelled', 'CANCELLED'], ['Un-Assigned By Me', 'CANCELLED'], ['', 'UNKNOWN'],
  ];
  it.each(cases)('%s → %s', (raw, want) => expect(normalizeCourierStatus(raw)).toBe(want));
});

describe('helpers', () => {
  it('pkPhone', () => {
    expect(pkPhone('+92 300 1234567')).toBe('03001234567');
    expect(pkPhone('0300-1234567')).toBe('03001234567');
    expect(pkPhone('3001234567')).toBe('03001234567');
  });
  it('matchCity', () => {
    const list = [{ id: '1', name: 'Lahore' }, { id: '2', name: 'Islamabad' }, { id: '3', name: 'D.G. Khan' }, { id: '4', name: 'Rawalpindi' }];
    expect(matchCity(list, ' lahore ')?.id).toBe('1');
    expect(matchCity(list, 'ISB')?.id).toBe('2');
    expect(matchCity(list, 'dg khan')?.id).toBe('3');
    expect(matchCity(list, 'Pindi')?.id).toBe('4');
    expect(matchCity(list, 'Karachi')).toBeUndefined();
    expect(matchCity(list, '')).toBeUndefined();
  });
});

describe('adapters (fetch mock)', () => {
  const realFetch = global.fetch;
  let calls: { url: string; init: any }[] = [];
  const reply = (body: any, status = 200) => {
    global.fetch = (async (url: any, init: any) => {
      calls.push({ url: String(url), init });
      return new Response(JSON.stringify(body), { status, headers: { 'content-type': 'application/json' } });
    }) as any;
  };
  beforeEach(() => { calls = []; });
  afterAll(() => { global.fetch = realFetch; });

  const input = {
    orderRef: '1002', customerName: 'Sara', customerPhone: '+923001234567', address: 'House 5', city: { id: '789', name: 'Lahore' },
    codAmount: 2500.4, pieces: 2, weightKg: 1.25, description: 'Shirt x2',
  };

  it('PostEx book: token header, v3, 03 phone', async () => {
    reply({ statusCode: '200', dist: { trackingNumber: 'PX123' } });
    const r = await postexAdapter.book({ apiKey: 'tok' }, { pickupAddressCode: '001' }, input);
    expect(r.trackingNumber).toBe('PX123');
    expect(calls[0].url).toBe('https://api.postex.pk/services/integration/api/order/v3/create-order');
    expect(calls[0].init.headers.token).toBe('tok');
    const b = JSON.parse(calls[0].init.body);
    expect(b).toMatchObject({ customerPhone: '03001234567', cityName: 'Lahore', invoicePayment: 2500, items: 2, pickupAddressCode: '001', orderRefNumber: '1002' });
  });

  it('PostEx: 401 → auth error', async () => {
    reply({ statusCode: '401', statusMessage: 'TOKEN IS INVALID' });
    await expect(postexAdapter.cities({ apiKey: 'bad' })).rejects.toMatchObject({ auth: true });
  });

  it('PostEx cancel: PUT body me trackingNumber', async () => {
    reply({ statusCode: '200' });
    await postexAdapter.cancel({ apiKey: 't' }, 'PX1');
    expect(calls[0].init.method).toBe('PUT');
    expect(calls[0].url.endsWith('/v1/cancel-order')).toBe(true);
    expect(JSON.parse(calls[0].init.body)).toEqual({ trackingNumber: 'PX1' });
  });

  it('Leopards book: grams, city id, self shipper', async () => {
    reply({ status: 1, track_number: 'LE9', slip_link: 'https://x/slip' });
    const r = await leopardsAdapter.book({ apiKey: 'k', apiSecret: 'p' }, {}, input);
    expect(r).toMatchObject({ trackingNumber: 'LE9', labelUrl: 'https://x/slip' });
    expect(calls[0].url).toBe('https://merchantapi.leopardscourier.com/api/bookPacket/format/json/');
    const b = JSON.parse(calls[0].init.body);
    expect(b).toMatchObject({ api_key: 'k', api_password: 'p', booked_packet_weight: 1250, destination_city: '789', origin_city: 'self', shipment_phone: 'self', booked_packet_collect_amount: 2500 });
  });

  it('Leopards: Invalid API Key → auth error', async () => {
    reply({ status: 0, error: 'Invalid API Key' });
    await expect(leopardsAdapter.cities({ apiKey: 'x', apiSecret: 'y' })).rejects.toMatchObject({ auth: true });
  });

  it('Leopards track: packet_list', async () => {
    reply({ status: 1, packet_list: [{ track_number: 'LE9', booked_packet_status: 'Returned to shipper', 'Tracking Detail': [{ Status: 'Being Return', Activity_datetime: '2026-09-28 10:00' }] }] });
    const [t] = await leopardsAdapter.track({ apiKey: 'k', apiSecret: 'p' }, ['LE9']);
    expect(t).toMatchObject({ trackingNumber: 'LE9', state: 'RETURNED' });
  });
});
