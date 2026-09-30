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

import { jazzcashAdapter, jazzcashHash, jcRef, pkStamp } from './pay-api/jazzcash.adapter';
import { easypaisaAdapter } from './pay-api/easypaisa.adapter';
describe('JazzCash', () => {
  it('official doc hash example', () => {
    expect(jazzcashHash({ pp_Amount: '2995', pp_MerchantID: 'MER123', pp_OrderInfo: 'A48cvE28' }, '0F5DD14AE2'))
      .toBe('c7689cda7474eb1adcd343fd0c0b676bad0ba66361cc46db589bdb0da4c1c867'.toUpperCase());
  });
  it('khali values aur pp_SecureHash hash me nahi', () => {
    const a = jazzcashHash({ pp_Amount: '1', pp_B: '' }, 's');
    expect(jazzcashHash({ pp_Amount: '1', pp_SecureHash: 'X', ppmpf_1: '' }, 's')).toBe(a);
  });
  it('ref: sirf harf/number, 20 tak; waqt PKT', () => {
    expect(jcRef('NP-ABC_123456789012345678')).toBe('NPABC123456789012345');
    expect(pkStamp(new Date('2026-09-30T05:00:00Z'))).toBe('20260930100000');
  });
  it('MWALLET: paisa, CNIC 6, 000 = paid', async () => {
    const calls: any[] = [];
    global.fetch = (async (url: any, init: any) => { calls.push({ url: String(url), body: JSON.parse(init.body) }); return new Response(JSON.stringify({ pp_ResponseCode: '000', pp_ResponseMessage: 'Thank you', pp_Amount: '99800' }), { status: 200 }); }) as any;
    const r: any = await jazzcashAdapter.create({ merchantId: 'MC1', password: 'p', integritySalt: 'salt' }, 'sandbox', { ref: 'NP1X', amount: 998, description: 'Order 1/2', customer: { name: 'A' }, returnUrl: '', cancelUrl: '', wallet: { mobile: '+92 300 1234567', cnic: '35202-1234567-1' } });
    expect(calls[0].url).toBe('https://sandbox.jazzcash.com.pk/ApplicationAPI/API/2.0/Purchase/DoMWalletTransaction');
    expect(calls[0].body).toMatchObject({ pp_TxnType: 'MWALLET', pp_Amount: '99800', pp_MobileNumber: '03001234567', pp_CNIC: '345671', pp_TxnRefNo: 'NP1X', pp_Description: 'Order 1 2' });
    expect(calls[0].body.pp_SecureHash).toBe(jazzcashHash(calls[0].body, 'salt'));
    expect(r.status).toMatchObject({ paid: true, amount: 998 });
  });
  it('inquiry: pp_PaymentResponseCode dekhta hai, pp_ResponseCode nahi', async () => {
    global.fetch = (async () => new Response(JSON.stringify({ pp_ResponseCode: '000', pp_PaymentResponseCode: '157' }), { status: 200 })) as any;
    expect(await jazzcashAdapter.status({ merchantId: 'MC1', password: 'p', integritySalt: 's' }, 'live', 'NP1X', 'NP1X')).toMatchObject({ paid: false, failed: false });
  });
});

describe('Easypaisa', () => {
  it('MA initiate: Credentials header, raqam "998.0"', async () => {
    const calls: any[] = [];
    global.fetch = (async (url: any, init: any) => { calls.push({ url: String(url), init }); return new Response(JSON.stringify({ responseCode: '0000', responseDesc: 'SUCCESS' }), { status: 200 }); }) as any;
    await easypaisaAdapter.create({ storeId: '9', accountNum: '1', username: 'u', password: 'p' }, 'sandbox', { ref: 'NP1', amount: 998, description: '', customer: { name: 'A' }, returnUrl: '', cancelUrl: '', wallet: { mobile: '03001234567' } });
    expect(calls[0].url).toBe('https://easypaystg.easypaisa.com.pk/easypay-service/rest/v4/initiate-ma-transaction');
    expect(calls[0].init.headers.Credentials).toBe(Buffer.from('u:p').toString('base64'));
    expect(JSON.parse(calls[0].init.body)).toMatchObject({ orderId: 'NP1', storeId: '9', transactionAmount: '998.0', transactionType: 'MA', mobileAccountNo: '03001234567' });
  });
  it('inquiry: 0000 + PAID = paid; 0000 akela paid nahi', async () => {
    global.fetch = (async () => new Response(JSON.stringify({ responseCode: '0000', transactionStatus: 'PENDING' }), { status: 200 })) as any;
    expect((await easypaisaAdapter.status({ storeId: '9', accountNum: '1', username: 'u', password: 'p' }, 'live', 'NP1', 'NP1')).paid).toBe(false);
    global.fetch = (async () => new Response(JSON.stringify({ responseCode: '0000', transactionStatus: 'PAID', transactionAmount: 998 }), { status: 200 })) as any;
    expect(await easypaisaAdapter.status({ storeId: '9', accountNum: '1', username: 'u', password: 'p' }, 'live', 'NP1', 'NP1')).toMatchObject({ paid: true, amount: 998 });
  });
});
