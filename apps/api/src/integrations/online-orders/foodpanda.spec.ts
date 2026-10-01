import * as crypto from 'crypto';
import { acceptanceTime, foodpandaOrderType, normalizeFoodpanda, rejectReason, verifyMiddlewareJwt } from './foodpanda';
import { FoodpandaService } from './foodpanda.service';

const jwt = (payload: object, secret: string, alg = 'HS512') => {
  const h = Buffer.from(JSON.stringify({ alg, typ: 'JWT' })).toString('base64url');
  const p = Buffer.from(JSON.stringify(payload)).toString('base64url');
  const sig = crypto.createHmac('sha512', secret).update(`${h}.${p}`).digest('base64url');
  return `Bearer ${h}.${p}.${sig}`;
};

// Delivery Hero ka apna example (genericOrderExample.yaml), thora PK shakal me
const example = {
  token: '5f373562-591a-4db9-8609-7eec7880f28d', code: 'n0s1-w0k1', shortCode: '42',
  comments: { customerComment: 'Please hurry' }, createdAt: '2026-10-01T12:00:00.000Z',
  customer: { firstName: 'food', lastName: 'panda', mobilePhone: '+923001234567', email: 'x@y.pk' },
  delivery: { address: null, expectedDeliveryTime: '2026-10-01T12:50:00.000Z', riderPickupTime: '2026-10-01T12:35:00.000Z' },
  discounts: [{ name: 'First Order', amount: '90.00' }],
  expeditionType: 'delivery', expiryDate: '2026-10-01T12:15:00.000Z',
  localInfo: { countryCode: 'PK', platform: 'Foodpanda', platformKey: 'FP_PK' },
  payment: { status: 'paid', type: 'paid' }, test: false, preOrder: false,
  platformRestaurant: { id: 'abcd' },
  price: { deliveryFees: [{ name: 'packaging', value: 25 }], grandTotal: '1185.00', payRestaurant: '1185.00', collectFromCustomer: '0' },
  products: [{
    name: 'Double Cheese Burger', quantity: '2', unitPrice: '500.00', paidPrice: '1000.00', remoteCode: 'BRG-DC', sku: 'x', comment: 'No onion', id: 'p1',
    variation: { name: 'Double Cheese Burger' },
    selectedToppings: [{ name: 'extra cheese', price: '75.00', quantity: 1, remoteCode: 'CHZ', id: 't1', type: 'PRODUCT', children: [] }],
  }],
  callbackUrls: { orderAcceptedUrl: 'https://dh.test/accept', orderRejectedUrl: 'https://dh.test/reject', orderPreparedUrl: 'https://dh.test/prepared', orderPickedUpUrl: 'http://not-https' },
};

describe('Foodpanda helpers', () => {
  it('JWT: sahi HS512 + service=middleware hi qabool', () => {
    expect(verifyMiddlewareJwt(jwt({ service: 'middleware' }, 's3cret'), 's3cret')).toBe(true);
    expect(verifyMiddlewareJwt(jwt({ service: 'middleware' }, 'ghalat'), 's3cret')).toBe(false);
    expect(verifyMiddlewareJwt(jwt({ service: 'other' }, 's3cret'), 's3cret')).toBe(false);
    expect(verifyMiddlewareJwt(jwt({ service: 'middleware', exp: 1000 }, 's3cret'), 's3cret')).toBe(false);
    expect(verifyMiddlewareJwt(undefined, 's3cret')).toBe(false);
    expect(verifyMiddlewareJwt(jwt({ service: 'middleware' }, ''), '')).toBe(false);
  });

  it('order → Nafaa ki shakal (topping alag line, qty guna)', () => {
    const { order, meta } = normalizeFoodpanda(example);
    expect(foodpandaOrderType(example)).toBe('platform_delivery');
    expect(order).toMatchObject({ platform: 'foodpanda', externalOrderId: example.token, externalOrderNumber: 'n0s1-w0k1', customerName: 'food panda', total: 1185, deliveryFee: 25, discount: 90, paymentStatus: 'PAID' });
    expect(order.items).toEqual([
      expect.objectContaining({ name: 'Double Cheese Burger', sku: 'BRG-DC', quantity: 2, price: 500 }),
      expect.objectContaining({ name: '+ extra cheese', sku: 'CHZ', quantity: 2, price: 75 }),
    ]);
    expect(order.notes).toContain('No onion');
    expect(meta).toMatchObject({ platformRider: true, shortCode: '42', test: false });
    // Sirf https callback URLs
    expect(Object.keys(meta.callbackUrls).sort()).toEqual(['orderAcceptedUrl', 'orderPreparedUrl', 'orderRejectedUrl']);
  });

  it('accept ka waqt: kam az kam 3 min aage, rider waqt agar aage ho to wahi', () => {
    const now = new Date('2026-10-01T12:00:00Z');
    expect(acceptanceTime({ platformRider: true, riderPickupTime: '2026-10-01T12:35:00Z' }, 20, now)).toBe('2026-10-01T12:35:00Z');
    expect(acceptanceTime({ platformRider: true, riderPickupTime: '2026-10-01T12:01:00Z' }, 20, now)).toBe('2026-10-01T12:20:00Z');
    expect(acceptanceTime({ platformRider: false }, 1, now)).toBe('2026-10-01T12:03:00Z');
  });

  it('reject reason', () => {
    expect(rejectReason('Item stock me nahi')).toBe('ITEM_UNAVAILABLE');
    expect(rejectReason('Dukaan band hai')).toBe('CLOSED');
    expect(rejectReason('NO_COURIER')).toBe('NO_COURIER');
    expect(rejectReason('kuch bhi', true)).toBe('TEST_ORDER');
    expect(rejectReason(null)).toBe('TOO_BUSY');
  });
});

describe('FoodpandaService.handleStatus', () => {
  const env = { ...process.env };
  afterEach(() => { process.env = { ...env }; (global as any).fetch = undefined; });

  const make = (meta: any, order: Partial<any> = {}) => {
    let stored = { foodpanda: meta };
    const prisma = {
      channelOrder: {
        findUnique: async (q: any) => (q.include
          ? { id: 'o1', externalOrderId: 'tok', orderStatus: 'CONFIRMED', cancelReason: null, metadata: stored, integration: { type: 'FOODPANDA', config: { foodpanda: { prepMinutes: 15 } } }, ...order }
          : { metadata: stored }),
        update: async (q: any) => { stored = q.data.metadata; },
      },
    } as any;
    return { svc: new FoodpandaService(prisma, {} as any, {} as any), get: () => stored };
  };

  it('accept bhejta hai (login + callback URL + remoteOrderId)', async () => {
    Object.assign(process.env, { FOODPANDA_USERNAME: 'u', FOODPANDA_PASSWORD: 'p', FOODPANDA_SECRET: 's' });
    const calls: any[] = [];
    (global as any).fetch = async (url: string, o: any) => {
      calls.push({ url, body: o.body });
      if (url.endsWith('/v2/login')) return { ok: true, status: 200, json: async () => ({ access_token: 'AT', expires_in: 1800 }) };
      return { ok: true, status: 202, text: async () => '' };
    };
    const { svc, get } = make({ callbackUrls: { orderAcceptedUrl: 'https://dh.test/accept' }, platformRider: false, test: false });
    await svc.handleStatus({ integrationId: 'i', orderId: 'o1', event: 'order.confirmed' });
    expect(calls[0].body).toContain('grant_type=client_credentials');
    expect(calls[1].url).toBe('https://dh.test/accept');
    expect(JSON.parse(calls[1].body)).toMatchObject({ status: 'order_accepted', remoteOrderId: 'o1' });
    expect(get().foodpanda.acceptStatus).toBe('SENT');
  });

  it('Foodpanda ne khud cancel kiya ho to reject wapas nahi bhejta', async () => {
    Object.assign(process.env, { FOODPANDA_USERNAME: 'u', FOODPANDA_PASSWORD: 'p', FOODPANDA_SECRET: 's' });
    const calls: string[] = [];
    (global as any).fetch = async (url: string) => { calls.push(url); return { ok: true, status: 200, json: async () => ({ access_token: 'AT' }), text: async () => '' }; };
    const { svc } = make({ callbackUrls: { orderRejectedUrl: 'https://dh.test/reject' }, cancelledByPlatform: true });
    await svc.handleStatus({ integrationId: 'i', orderId: 'o1', event: 'order.cancelled' });
    expect(calls).toEqual([]);
  });
});
