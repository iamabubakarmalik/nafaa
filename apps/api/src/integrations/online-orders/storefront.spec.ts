import { StorefrontService } from './storefront.service';

const ch: any = { id: 'ch1', tenantId: 't1', isActive: true, apiKey: 'nfk_1', webhookSecret: 's', displayName: 'Web', shopId: 's1', webhookVerified: false,
  config: { form: { enabled: true, key: 'f_abcdefghijkl', deliveryFee: 200, freeAbove: 3000 } } };
const products = [
  { id: 'p1', name: 'Hub', sku: 'HUB', price: 799, hasVariants: false, variants: [], images: [] },
  { id: 'p2', name: 'Shirt', sku: 'SH', price: 1000, hasVariants: true, variants: [{ id: 'v1', name: 'M', sku: 'SH-M', price: 1200 }], images: [] },
];

function make() {
  const received: any[] = [];
  const prisma: any = {
    integration: { findFirst: async () => ch, findUnique: async () => ch, update: async () => ch },
    product: { findMany: async () => products },
    shopStock: { findMany: async () => [] },
    tenant: { findUnique: async () => ({ name: 'Key Phantom' }) },
    channelOrder: { findFirst: async () => null },
    shop: { findMany: async () => [] },
  };
  const orders: any = { receive: async (_c: any, o: any) => { received.push(o); return { id: 'o1' }; }, createTestOrder: async () => 'o2' };
  const setup: any = { requireChannel: async () => ch, assertCanManage: () => undefined, apiBase: () => 'https://api.nafaa.pk/api', urls: () => ({}) };
  return { svc: new StorefrontService(prisma, orders, setup), received };
}
const customer = { name: 'Ali', phone: '0300-1234567', address: 'House 5, Street 9', city: 'Lahore' };

describe('Storefront order form', () => {
  it('qeemat DB se — customer ki bheji qeemat nahi', async () => {
    const { svc, received } = make();
    const r = await svc.publicOrder('f_abcdefghijkl', { customer, items: [{ productId: 'p1', quantity: 2, price: 1 }, { productId: 'p2', variantId: 'v1', quantity: 1 }] });
    expect(r.success).toBe(true);
    const o = received[0];
    expect(o.subtotal).toBe(799 * 2 + 1200);
    expect(o.deliveryFee).toBe(200); // 2798 < 3000 → fee lagti hai
  });
  it('free delivery sirf had se upar', async () => {
    const { svc, received } = make();
    await svc.publicOrder('f_abcdefghijkl', { customer, items: [{ productId: 'p1', quantity: 1 }] });
    expect(received[0].deliveryFee).toBe(200);
    expect(received[0].total).toBe(999);
    expect(received[0].customerPhone).toBe('03001234567');
  });
  it('variant wale product par size zaroori', async () => {
    const { svc } = make();
    await expect(svc.publicOrder('f_abcdefghijkl', { customer, items: [{ productId: 'p2', quantity: 1 }] })).rejects.toMatchObject({ status: 400 });
  });
  it('bot (honeypot) → chup chaap ok, order nahi', async () => {
    const { svc, received } = make();
    const r = await svc.publicOrder('f_abcdefghijkl', { website: 'http://spam', customer, items: [{ productId: 'p1', quantity: 1 }] });
    expect(r.success).toBe(true);
    expect(received.length).toBe(0);
  });
  it('ghalat phone → 400', async () => {
    const { svc } = make();
    await expect(svc.publicOrder('f_abcdefghijkl', { customer: { ...customer, phone: '123' }, items: [{ productId: 'p1', quantity: 1 }] })).rejects.toMatchObject({ status: 400 });
  });
  it('ghalat form key format → 404', async () => {
    const { svc } = make();
    await expect(svc.publicCatalog('../../etc')).rejects.toMatchObject({ status: 404 });
  });
});

describe('Developer invite link', () => {
  it('bana link chalta hai; key badli to band', async () => {
    const { svc } = make();
    const { url } = await svc.createInvite({ tenantId: 't1', role: 'OWNER' } as any, 'ch1');
    const token = url.split('/connect/dev/')[1];
    const info = await svc.inviteInfo(token);
    expect(info.apiKey).toBe('nfk_1');
    ch.apiKey = 'nfk_2';
    await expect(svc.inviteInfo(token)).rejects.toMatchObject({ status: 401 });
    ch.apiKey = 'nfk_1';
    await expect(svc.inviteInfo(token.slice(0, -2) + 'xx')).rejects.toMatchObject({ status: 401 });
  });
});

import { couponDiscount } from './storefront.service';
describe('Coupons', () => {
  const coupons: any[] = [
    { code: 'EID10', type: 'PERCENT', value: 10, minOrder: 1000, maxUses: null, uses: 0, active: true },
    { code: 'FLAT200', type: 'FLAT', value: 200, minOrder: null, maxUses: 2, uses: 2, active: true },
    { code: 'OFF', type: 'FLAT', value: 50, minOrder: null, maxUses: null, uses: 0, active: false },
  ];
  it('percent + had', () => {
    expect(couponDiscount(coupons, 'eid10', 2000)).toMatchObject({ discount: 200 });
    expect(couponDiscount(coupons, 'EID10', 500)).toMatchObject({ error: expect.stringContaining('1,000') });
  });
  it('khatam / band / ghalat', () => {
    expect(couponDiscount(coupons, 'FLAT200', 5000)).toMatchObject({ error: 'Ye code khatam ho chuka' });
    expect(couponDiscount(coupons, 'OFF', 5000)).toMatchObject({ error: 'Ye code sahi nahi' });
    expect(couponDiscount(coupons, 'NOPE', 5000)).toMatchObject({ error: 'Ye code sahi nahi' });
  });
  it('flat discount subtotal se zyada nahi', () => {
    expect(couponDiscount([{ ...coupons[1], uses: 0 }], 'FLAT200', 150)).toMatchObject({ discount: 150 });
  });
});

describe('Customer tracking', () => {
  it('phone ke aakhri 4 na milen to order nahi dikhta', async () => {
    const { svc } = make();
    (svc as any).prisma.channelOrder.findFirst = async () => ({ orderStatus: 'OUT_FOR_DELIVERY', paymentStatus: 'PENDING', customerPhone: '03001234567', receivedAt: new Date(), total: 998, courierCode: 'POSTEX', courierName: 'PostEx', trackingNumber: 'PX1' });
    const ok = await svc.track('f_abcdefghijkl', { no: 'nf123', phone: '4567' });
    expect(ok).toMatchObject({ label: 'Raste me hai', courier: { trackingNumber: 'PX1' } });
    await expect(svc.track('f_abcdefghijkl', { no: 'nf123', phone: '9999' })).rejects.toMatchObject({ status: 404 });
  });
});
