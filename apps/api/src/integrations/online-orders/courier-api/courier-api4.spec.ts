/**
 * InstaWorld and ShipNOC adapters (Beta). Replies are the documented shapes:
 * InstaWorld from its OpenAPI spec (merchant-api/v2/openapi.yaml), ShipNOC
 * from its Web API help pages (api.shipnoc.com/help). No real courier is called.
 */
import { instaworldAdapter, instaworldState } from './instaworld.adapter';
import { shipnocAdapter } from './shipnoc.adapter';
import { TRACKING_MAPPERS } from './tracking-events';
import { COURIER_APIS } from './registry';

type Route = (url: string, init: any) => { status?: number; body: any; pdf?: boolean } | undefined;
const realFetch = global.fetch;
let calls: { url: string; init: any }[] = [];
function mock(route: Route) {
  global.fetch = (async (url: any, init: any) => {
    calls.push({ url: String(url), init });
    const r = route(String(url), init) ?? { status: 404, body: { error: { code: 'not_found', message: 'Not found', details: [], request_id: 'req_1' } } };
    if (r.pdf) return new Response(Buffer.from('%PDF-1.4'), { status: 200, headers: { 'content-type': 'application/pdf' } });
    return new Response(JSON.stringify(r.body), { status: r.status ?? 200, headers: { 'content-type': 'application/json' } });
  }) as any;
}
const input = {
  orderRef: '#1002', customerName: 'Ayesha Khan', customerPhone: '+923311234567', customerEmail: null, address: 'House 12, Street 4, DHA Phase 5',
  city: { id: 'LAHORE', name: 'LAHORE' }, codAmount: 1500, pieces: 1, weightKg: 0.5, description: 'Kurta - Blue / M',
};

afterAll(() => { global.fetch = realFetch; });
beforeEach(() => { calls = []; });

describe('InstaWorld adapter', () => {
  const creds = { apiKey: 'iw_test' };
  const shipment = {
    id: 1, tracking_number: 'IW123', ref_no: '#1002', location_id: 812,
    status: { code: 'BOOKED', group: 'pre_transit', label: 'Booked' },
    courier: { name: 'TCS', code: '12' }, payment: { type: 'cod', amount: 1500, currency: 'PKR' },
    settlement: { status: 'PENDING', cod_settled: false, settled_at: null, invoice_number: null, charges: 210 },
  };

  it('is registered as a Beta courier', () => {
    expect(COURIER_APIS.INSTAWORLD.beta).toBe(true);
    expect(COURIER_APIS.INSTAWORLD.adapter).toBe(instaworldAdapter);
  });

  it('book: bearer key, idempotency key, CreateShipmentRequest body, CN and charge from data', async () => {
    mock((u, init) => (u.endsWith('/shipments') && init.method === 'POST' ? { status: 201, body: { data: shipment } } : undefined));
    const r = await instaworldAdapter.book(creds, { pickupAddressCode: '812' }, input);
    expect(r).toMatchObject({ trackingNumber: 'IW123', charge: 210 });
    expect(calls[0].url).toBe('https://one-be.instaworld.pk/merchant-api/v2/shipments');
    expect(calls[0].init.headers).toMatchObject({ Authorization: 'Bearer iw_test', 'Idempotency-Key': 'nafaa-#1002' });
    expect(JSON.parse(calls[0].init.body)).toMatchObject({
      location_id: 812, ref_no: '#1002', payment: { type: 'cod', amount: 1500 },
      consignee: { first_name: 'Ayesha', last_name: 'Khan', phone: '03311234567', address: 'House 12, Street 4, DHA Phase 5', city: 'LAHORE' },
      items: [{ title: 'Kurta - Blue / M', quantity: 1, kg: 0.5 }],
    });
  });

  it('book: a paid order is sent as payment type paid', async () => {
    mock(() => ({ status: 201, body: { data: shipment } }));
    await instaworldAdapter.book(creds, { pickupAddressCode: '812' }, { ...input, codAmount: 0 });
    expect(JSON.parse(calls[0].init.body).payment).toEqual({ type: 'paid', amount: 0 });
  });

  it('errors: the error code becomes a clear message; 401 is an auth error', async () => {
    mock(() => ({ status: 422, body: { error: { code: 'city_not_serviceable', message: 'Insta does not provide service in CHINIOT.', details: [{ field: 'consignee.city', issue: 'not_serviceable' }], request_id: 'req_8f' } } }));
    await expect(instaworldAdapter.book(creds, { pickupAddressCode: '812' }, input)).rejects.toMatchObject({ message: 'InstaWorld is shehar me deliver nahi karta', auth: false });
    mock(() => ({ status: 401, body: { error: { code: 'invalid_api_key', message: 'Invalid key', details: [], request_id: null } } }));
    await expect(instaworldAdapter.cities(creds)).rejects.toMatchObject({ auth: true });
    mock(() => ({ status: 502, body: { error: { code: 'booking_failed', message: 'No courier accepted', details: [], request_id: 'r' } } }));
    await expect(instaworldAdapter.book(creds, { pickupAddressCode: '812' }, input)).rejects.toThrow(/Kisi courier ne parcel qabool nahi kiya/);
  });

  it('cities, locations and connect test', async () => {
    mock((u) => {
      if (u.endsWith('/cities')) return { body: { data: [{ name: 'LAHORE' }, { name: 'KARACHI' }] } };
      if (u.endsWith('/locations')) return { body: { data: [{ id: 812, name: 'Main', address: 'Gulberg', city: 'LAHORE', is_active: true }, { id: 9, name: 'Old', is_active: false }] } };
      return undefined;
    });
    expect(await instaworldAdapter.test(creds)).toEqual({ cities: 2, pickupAddresses: [{ code: '812', address: 'Main — Gulberg', city: 'LAHORE' }] });
  });

  it('track: events with the current status and the event mapper', async () => {
    const body = {
      data: [
        { status: 'BOOKED', status_label: 'Booked', courier_status_raw: null, occurred_at: '2026-11-09T10:00:00+05:00', recorded_at: '2026-11-09T10:01:00+05:00' },
        { status: 'PICKED_UP', status_label: 'Picked up', courier_status_raw: 'Shipment picked up', occurred_at: '2026-11-09T16:00:00+05:00', recorded_at: '2026-11-09T16:05:00+05:00' },
        { status: 'OUT_FOR_DELIVERY', status_label: 'Out for delivery', courier_status_raw: 'Out for delivery - Rider: Ali 0300-1234567', occurred_at: '2026-11-10T09:00:00+05:00', recorded_at: '2026-11-10T09:02:00+05:00' },
      ],
      meta: { tracking_number: 'IW123', current_status: { code: 'OUT_FOR_DELIVERY', group: 'in_transit', label: 'Out for delivery' } },
    };
    mock((u) => (u.endsWith('/shipments/IW123/events') ? { body } : undefined));
    const [t] = await instaworldAdapter.track(creds, ['IW123']);
    expect(t).toMatchObject({ trackingNumber: 'IW123', state: 'OUT_FOR_DELIVERY', label: 'Out for delivery' });
    expect(t.events!.map((e) => e.status)).toEqual(['BOOKED', 'PICKED_UP', 'OUT_FOR_DELIVERY']);
    expect(t.events![0].at).toBe('2026-11-09T05:00:00.000Z');
    expect(t.events![2].rider).toEqual({ name: 'Ali', phone: '03001234567' });
  });

  it('maps every public status code', () => {
    expect(instaworldState('BOOKING_IN_PROCESS')).toBe('BOOKED');
    expect(instaworldState('DELIVERY_ATTEMPT_FAILED')).toBe('ATTEMPTED');
    expect(instaworldState('ON_HOLD')).toBe('ATTEMPTED');
    expect(instaworldState('RTO_RECEIVED_AT_HUB')).toBe('RETURNING');
    expect(instaworldState('RTO_RETURNED_TO_SHIPPER')).toBe('RETURNED');
    expect(instaworldState('CANCELLED')).toBe('CANCELLED');
    expect(instaworldState('CLAIM_IN_PROCESS', 'Delivered')).toBe('DELIVERED');
    const ev = TRACKING_MAPPERS.INSTAWORLD({ data: [{ status: 'RTO_RETURNED_TO_SHIPPER', status_label: 'Returned to shipper', recorded_at: '2026-11-12T10:00:00+05:00' }] });
    expect(ev).toEqual([{ at: '2026-11-12T05:00:00.000Z', status: 'RETURNED', text: 'Returned to shipper' }]);
  });

  it('cancel, label PDF, settlement and portal list', async () => {
    mock((u, init) => {
      if (u.endsWith('/shipments/IW123/cancel') && init.method === 'POST') return { body: { data: { ...shipment, status: { code: 'CANCELLED', label: 'Cancelled' } } } };
      if (u.endsWith('/shipments/IW123/awb')) return { body: null, pdf: true };
      if (u.endsWith('/shipments/IW123')) return { body: { data: { ...shipment, settlement: { status: 'PAID', cod_settled: true, invoice_number: 'INV-9' } } } };
      if (u.includes('/shipments?')) return { body: { data: [{ ...shipment, consignee: { name: 'Ayesha Khan', phone: '+923311234567', city: 'LAHORE' }, created_at: '2026-11-09T10:00:00+05:00' }], meta: { next_cursor: null, limit: 200 } } };
      return undefined;
    });
    await instaworldAdapter.cancel(creds, 'IW123');
    expect((await instaworldAdapter.label(creds, 'IW123')).pdf).toBeInstanceOf(Buffer);
    expect(await instaworldAdapter.paymentSettled!(creds, 'IW123')).toEqual({ settled: true, reference: 'INV-9' });
    const list = await instaworldAdapter.listShipments!(creds, '2026-11-01', '2026-11-09');
    expect(list[0]).toMatchObject({ trackingNumber: 'IW123', orderRef: '#1002', codAmount: 1500, statusLabel: 'Booked', city: 'LAHORE' });
    expect(calls.find((c) => c.url.includes('/shipments?'))!.url).toContain('created_from=2026-11-01&created_to=2026-11-09&limit=200');
  });

  it('cancel after pickup gives the documented reason', async () => {
    mock(() => ({ status: 409, body: { error: { code: 'shipment_not_cancellable', message: 'Picked up', details: [], request_id: 'r' } } }));
    await expect(instaworldAdapter.cancel(creds, 'IW123')).rejects.toThrow(/ab cancel nahi hota/);
  });
});

describe('ShipNOC adapter', () => {
  const creds = { apiKey: 'shop', password: 'pw', signature: 'sig' };

  it('is registered as a Beta courier', () => {
    expect(COURIER_APIS.SHIPNOC.beta).toBe(true);
  });

  it('book: credentials and one parcel in the body, CN and label from the reply', async () => {
    mock((u) => (u.endsWith('/api/BookParcel') ? { body: { Response: 'success', ErrorDescription: '', LabelURL: 'https://shipnoc.com/PrintAirWayBill.aspx?ParcelNo=N1', TrackingNo: 'N1', TrackingURL: 'https://shipnoc.com/t/N1' } } : undefined));
    const r = await shipnocAdapter.book(creds, {}, input);
    expect(r).toMatchObject({ trackingNumber: 'N1', labelUrl: 'https://shipnoc.com/PrintAirWayBill.aspx?ParcelNo=N1' });
    expect(calls[0].url).toBe('http://api.shipnoc.com/api/BookParcel');
    expect(JSON.parse(calls[0].init.body)).toEqual({
      UserName: 'shop', Password: 'pw', Signature: 'sig',
      Parcels: [{
        ConsigneeName: 'Ayesha Khan', ConsigneeAddress: 'House 12, Street 4, DHA Phase 5', ConsigneeEmail: 'no-reply@nafaa.pk', ConsigneeCellNo: '03311234567',
        ItemType: 'Kurta - Blue / M', City: 'LAHORE', Quantity: '1', CODAmount: '1500', Weight: '0.5', SpecialInstruction: 'Order #1002',
      }],
    });
  });

  it('book: "failure" reply shows ErrorDescription; login errors are auth errors', async () => {
    mock(() => ({ body: { Response: 'failure', ErrorDescription: 'City not found', LabelURL: null, TrackingNo: null, TrackingURL: null } }));
    await expect(shipnocAdapter.book(creds, {}, input)).rejects.toMatchObject({ message: 'City not found', auth: false });
    mock(() => ({ body: { Response: 'failure', ErrorDescription: 'Invalid UserName or Password', detail: [] } }));
    await expect(shipnocAdapter.cities(creds)).rejects.toMatchObject({ auth: true });
  });

  it('cities via GET with credentials in the query; signature falls back when empty', async () => {
    mock((u) => (u.includes('/api/GetCity?') ? { body: { Response: 'success', ErrorDescription: '', detail: [{ CityName: 'Lahore' }, { CityName: 'Karachi' }] } } : undefined));
    expect(await shipnocAdapter.test({ apiKey: 'shop', password: 'pw' })).toEqual({ cities: 2 });
    const q = new URL(calls[0].url).searchParams;
    expect([q.get('UserName'), q.get('Password'), q.get('Signature')]).toEqual(['shop', 'pw', 'shoppwnoc@#']);
  });

  it('track: detail rows become events, last one is the state', async () => {
    mock((u) => (u.includes('/api/GetParcelTracking?') && u.includes('ParcelNo=N1') ? { body: { Response: 'success', ErrorDescription: '', detail: [
      { PacelStatus: 'Booked', Remarks: 'Booked', DateTime: '09/11/2026 10:00 AM' },
      { PacelStatus: 'Picked', Remarks: 'Picked from shipper', DateTime: '09/11/2026 04:00 PM' },
      { PacelStatus: 'Delivered', Remarks: 'Received by Ayesha', DateTime: '10/11/2026 01:30 PM' },
    ] } } : undefined));
    const [t] = await shipnocAdapter.track(creds, ['N1']);
    expect(t).toMatchObject({ trackingNumber: 'N1', state: 'DELIVERED', label: 'Delivered — Received by Ayesha' });
    expect(t.events!.map((e) => e.status)).toEqual(['BOOKED', 'PICKED_UP', 'DELIVERED']);
    expect(t.events![0].at).toBe('2026-11-09T05:00:00.000Z');
  });

  it('cancel and label link', async () => {
    mock((u) => (u.endsWith('/api/CancelParcel') ? { body: { Response: 'success', ErrorDescription: '', detail: [{ PacelNo: 'N1', Remarks: 'Cancelled successfully' }] } } : undefined));
    await shipnocAdapter.cancel(creds, 'N1');
    expect(JSON.parse(calls[0].init.body)).toMatchObject({ Parcels: [{ ParcelNo: 'N1' }] });
    mock(() => ({ body: { Response: 'success', ErrorDescription: '', detail: [{ PacelNo: 'N1', Remarks: 'Parcel already picked, cannot cancel' }] } }));
    await expect(shipnocAdapter.cancel(creds, 'N1')).rejects.toThrow(/cannot cancel/);
    expect(await shipnocAdapter.label(creds, 'N1', null)).toEqual({ url: 'https://shipnoc.com/PrintAirWayBill.aspx?ParcelNo=N1' });
  });
});
