import { mnpAdapter } from './mnp.adapter';
import { callCourierAdapter } from './callcourier.adapter';

type Route = (url: string, init: any) => { status?: number; body: any } | undefined;
const realFetch = global.fetch;
let calls: { url: string; init: any }[] = [];
function mock(route: Route) {
  global.fetch = (async (url: any, init: any) => {
    calls.push({ url: String(url), init });
    const r = route(String(url), init) ?? { status: 404, body: { Message: 'No action was found' } };
    return new Response(JSON.stringify(r.body), { status: r.status ?? 200, headers: { 'content-type': 'application/json' } });
  }) as any;
}
const input = {
  orderRef: '#1002', customerName: 'Sara Ali', customerPhone: '+923001234567', address: 'House 5', city: { id: 'LAHORE', name: 'LAHORE' },
  codAmount: 2500, pieces: 1, weightKg: 0.5, description: 'Shirt x1',
};

describe('M&P adapter', () => {
  beforeEach(() => { calls = []; });
  afterAll(() => { global.fetch = realFetch; });
  const creds = { apiKey: 'mnpuser', password: 'pw', accountNo: '4T154' };

  it('book: body me credentials, shehar naam, CN = orderReferenceId', async () => {
    mock((u) => (u.endsWith('/Booking/InsertBookingData') ? { body: [{ isSuccess: 'true', message: 'Order saved successfully!', orderReferenceId: '544794010101495' }] } : undefined));
    const r = await mnpAdapter.book(creds, { pickupAddressCode: '04' }, input);
    expect(r.trackingNumber).toBe('544794010101495');
    const b = JSON.parse(calls[0].init.body);
    expect(b).toMatchObject({ username: 'mnpuser', password: 'pw', AccountNo: '4T154', locationID: '04', ReturnLocation: '04', destinationCityName: 'LAHORE', consigneeMobNo: '03001234567', codAmount: 2500, service: 'Overnight', consigneeEmail: '' });
  });

  it('ghalat login → auth error', async () => {
    mock(() => ({ body: [{ isSuccess: 'false', message: 'Kindly Enter correct credentials', orderReferenceId: '' }] }));
    await expect(mnpAdapter.book(creds, { pickupAddressCode: '04' }, input)).rejects.toMatchObject({ auth: true });
  });

  it('cities: "Login credentials not valid!" → auth', async () => {
    mock(() => ({ body: [{ City: ['Login credentials not valid!'] }] }));
    await expect(mnpAdapter.cities(creds)).rejects.toMatchObject({ auth: true });
  });

  it('track: public CNStatus', async () => {
    mock(() => ({ body: [{ isSuccess: true, tracking_Details: [{ CN: '5447', CNStatus: 'On Delivery', Details: [{ Status: 'Booking', DateTime: 'x' }, { Status: 'On Delivery' }] }] }] }));
    const [t] = await mnpAdapter.track(creds, ['5447']);
    expect(t).toMatchObject({ state: 'OUT_FOR_DELIVERY', label: 'On Delivery' });
  });
});

describe('Call Courier adapter', () => {
  beforeEach(() => { calls = []; });
  afterAll(() => { global.fetch = realFetch; });
  const settings = { originCityId: '1', pickupAddressCode: '12', shipperName: 'Ahmed Store', shipperPhone: '0321-1234567', shipperAddress: 'Shop 1' };
  const routes: Route = (u) => {
    if (u.includes('GetCityListByService')) return { body: [{ CityID: 1, CityName: 'LAHORE' }, { CityID: 18, CityName: 'KARACHI' }] };
    if (u.includes('SaveBooking')) return { body: { CNNO: '1011234567', Response: 'true' } };
    return undefined;
  };

  it('book: GET query me sab parameter, CN = CNNO', async () => {
    mock(routes);
    const r = await callCourierAdapter.book({ apiKey: 'LHE-1234' }, settings, { ...input, city: { id: '18', name: 'Karachi' } });
    expect(r.trackingNumber).toBe('1011234567');
    const url = new URL(calls.find((c) => c.url.includes('SaveBooking'))!.url);
    const p = Object.fromEntries(url.searchParams);
    expect(p).toMatchObject({ loginId: 'LHE-1234', DestCityId: '18', ServiceTypeId: '7', Origin: 'Lahore', ShipperCity: '1', ShipperArea: '12', CodAmount: '2500', ConsigneeCellNo: '03001234567', ShipperCellNo: '03211234567', SelOrigin: 'Domestic', MyBoxId: '1' });
    for (const k of ['SpecialHandling', 'Holiday', 'remarks', 'ShipperLandLineNo', 'ShipperEmail', 'Description', 'Pcs', 'Weight']) expect(k in p).toBe(true);
  });

  it('booking error Response me', async () => {
    mock((u) => (u.includes('SaveBooking') ? { body: { CNNO: null, Response: 'false, loginId is wrong' } } : routes(u, {})));
    await expect(callCourierAdapter.book({ apiKey: 'bad' }, settings, { ...input, city: { id: '18', name: 'Karachi' } })).rejects.toMatchObject({ auth: true });
  });

  it('settings adhoori → booking nahi', async () => {
    mock(routes);
    await expect(callCourierAdapter.book({ apiKey: 'x' }, { originCityId: '1' }, input)).rejects.toMatchObject({ auth: false });
  });

  it('track: aakhri event, "Un Delivered" = ATTEMPTED', async () => {
    mock(() => ({ body: [{ OperationDesc: 'Booked', ProcessDescForPortal: 'CONSIGNMENT BOOKED' }, { OperationDesc: 'Un Delivered', ProcessDescForPortal: 'UN DELIVERED', ReasonDesc: 'Customer not available' }] }));
    const [t] = await callCourierAdapter.track({ apiKey: 'x' }, ['1011']);
    expect(t).toMatchObject({ state: 'ATTEMPTED' });
  });
});
