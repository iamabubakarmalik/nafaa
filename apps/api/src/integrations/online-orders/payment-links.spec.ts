import { PaymentLinksService, advancePaid } from './payment-links.service';
import { PAY_GATEWAYS } from './pay-api/registry';
import { safepayAdapter } from './pay-api/safepay.adapter';
import { ShopScope } from '../../common/shop-scope';

const user: any = { id: 'u1', tenantId: 't1', role: 'OWNER' };

function make(order: any, statusResult: any = { paid: false }) {
  const settings: Record<string, string> = {};
  const marked: string[] = [];
  const prisma: any = {
    systemSetting: {
      findUnique: async (q: any) => (settings[q.where.key] ? { value: settings[q.where.key] } : null),
      upsert: async (q: any) => { settings[q.where.key] = q.create.value; },
    },
    channelOrder: {
      findFirst: async () => order,
      findUnique: async () => order,
      update: async (q: any) => { order.metadata = q.data.metadata; return order; },
    },
    tenant: { findUnique: async () => ({ name: 'Key Phantom' }) },
  };
  const orders: any = { systemActor: async () => user, markPaid: async (_u: any, _s: any, id: string) => { marked.push(id); order.paymentStatus = 'PAID'; } };
  const setup: any = { assertCanManage: () => undefined, apiBase: () => 'https://api.nafaa.pk/api' };
  // Gateway ko fake karo
  const real = PAY_GATEWAYS.SAFEPAY.adapter;
  PAY_GATEWAYS.SAFEPAY.adapter = { ...real, test: async () => undefined, create: async () => ({ kind: 'redirect', url: 'https://pay', providerRef: 'track_1' }), status: async () => statusResult } as any;
  return { svc: new PaymentLinksService(prisma, orders, setup), marked, restore: () => { PAY_GATEWAYS.SAFEPAY.adapter = real; } };
}
const baseOrder = () => ({ id: 'o1', tenantId: 't1', total: 3000, orderStatus: 'PENDING', paymentStatus: 'PENDING', metadata: {}, customerName: 'Sara Ali', externalOrderNumber: '1002', externalOrderId: '1' });

describe('Payment links', () => {
  it('advance → COD ghatta hai; poora → order PAID', async () => {
    const order = baseOrder();
    const { svc, marked, restore } = make(order, { paid: true, amount: 200 });
    await svc.connect(user, 'SAFEPAY', { credentials: { publicKey: 'sec_x', secretKey: 's' }, env: 'sandbox' });
    const l = await svc.createLink(user, new ShopScope(null, true), 'o1', { provider: 'SAFEPAY', amount: 200 });
    expect(l.kind).toBe('ADVANCE');
    const token = l.url.split('/pay/')[1];
    await svc.start(token);
    await svc.handleReturn(token, {});
    expect(advancePaid(order.metadata)).toBe(200);
    expect(marked.length).toBe(0); // sirf advance — order abhi PAID nahi
    restore();
  });

  it('kam paisa aaya to paid nahi', async () => {
    const order = baseOrder();
    const { svc, marked, restore } = make(order, { paid: true, amount: 100 });
    await svc.connect(user, 'SAFEPAY', { credentials: { publicKey: 'sec_x', secretKey: 's' }, env: 'sandbox' });
    const l = await svc.createLink(user, new ShopScope(null, true), 'o1', { provider: 'SAFEPAY' });
    const token = l.url.split('/pay/')[1];
    await svc.start(token);
    await svc.handleReturn(token, {});
    expect(advancePaid(order.metadata)).toBe(0);
    expect(marked.length).toBe(0);
    restore();
  });

  it('poori raqam mili → markPaid', async () => {
    const order = baseOrder();
    const { svc, marked, restore } = make(order, { paid: true, amount: 3000 });
    await svc.connect(user, 'SAFEPAY', { credentials: { publicKey: 'sec_x', secretKey: 's' }, env: 'sandbox' });
    const l = await svc.createLink(user, new ShopScope(null, true), 'o1', { provider: 'SAFEPAY' });
    expect(l.kind).toBe('FULL');
    const token = l.url.split('/pay/')[1];
    await svc.start(token);
    const back = await svc.handleReturn(token, {});
    expect(back.endsWith(`/pay/${token}`)).toBe(true); // ?check nahi = tasdeeq kamyab
    expect(marked).toEqual(['o1']);
    restore();
  });

  it('baqi se zyada ka link nahi; token badla to ghalat', async () => {
    const order = baseOrder();
    const { svc, restore } = make(order);
    await svc.connect(user, 'SAFEPAY', { credentials: { publicKey: 'sec_x', secretKey: 's' }, env: 'sandbox' });
    await expect(svc.createLink(user, new ShopScope(null, true), 'o1', { provider: 'SAFEPAY', amount: 5000 })).rejects.toMatchObject({ status: 400 });
    const l = await svc.createLink(user, new ShopScope(null, true), 'o1', { provider: 'SAFEPAY' });
    const token = l.url.split('/pay/')[1];
    await expect(svc.publicInfo(token.slice(0, -2) + 'zz')).rejects.toMatchObject({ status: 401 });
    restore();
  });
});

describe('Safepay adapter (fetch mock)', () => {
  const realFetch = global.fetch;
  afterAll(() => { global.fetch = realFetch; });
  it('v3 tracker paisa me + passport + embedded URL', async () => {
    const calls: any[] = [];
    global.fetch = (async (url: any, init: any) => {
      calls.push({ url: String(url), init });
      const u = String(url);
      const body = u.includes('/order/payments/v3/') ? { data: { tracker: { token: 'track_abc' } }, status: { message: 'success' } } : { data: 'TBT123', status: { message: 'success' } };
      return new Response(JSON.stringify(body), { status: 200 });
    }) as any;
    const c: any = await safepayAdapter.create({ publicKey: 'sec_1', secretKey: 'S' }, 'sandbox', { ref: 'NP1', amount: 998, description: 'x', customer: { name: 'A' }, returnUrl: 'https://r', cancelUrl: 'https://c' });
    expect(JSON.parse(calls[0].init.body)).toMatchObject({ merchant_api_key: 'sec_1', amount: 99800, currency: 'PKR', mode: 'payment' });
    expect(calls[0].init.headers['X-SFPY-MERCHANT-SECRET']).toBe('S');
    expect(c.url).toContain('https://sandbox.api.getsafepay.com/embedded/?environment=sandbox&tracker=track_abc&tbt=TBT123');
  });
  it('status: TRACKER_ENDED = paid, raqam rupay me', async () => {
    global.fetch = (async () => new Response(JSON.stringify({ data: { state: 'TRACKER_ENDED', purchase_totals: { quote_amount: { amount: 99800 } } } }), { status: 200 })) as any;
    expect(await safepayAdapter.status({ publicKey: 'sec_1', secretKey: 'S' }, 'live', 'track_abc', 'NP1')).toMatchObject({ paid: true, amount: 998 });
  });
});
