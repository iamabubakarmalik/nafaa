import { OrderEntryService, combineProblem, mergeLines } from './order-entry.service';
import { ShopScope } from '../../common/shop-scope';

const user: any = { id: 'u1', tenantId: 't1', role: 'OWNER' };
const scope = new ShopScope(null, true);
const row = (o: Partial<any> = {}) => ({
  externalOrderNumber: '1001', externalOrderId: '1001', nafaaSaleId: null, orderStatus: 'PENDING',
  customerPhone: '0300-1234567', paymentStatus: 'PENDING', metadata: {}, ...o,
});

describe('combine guards', () => {
  it('allows new orders of one phone', () => {
    expect(combineProblem([row(), row({ externalOrderNumber: '1002', customerPhone: '+92 300 1234567' })])).toBeNull();
  });
  it('refuses billed, non-new, other customers and mixed payment', () => {
    expect(combineProblem([row(), row({ nafaaSaleId: 's1' })])).toContain('bill ban chuka');
    expect(combineProblem([row(), row({ orderStatus: 'CONFIRMED' })])).toContain('naya order nahi');
    expect(combineProblem([row(), row({ customerPhone: '03111111111' })])).toContain('same phone');
    expect(combineProblem([row(), row({ customerPhone: null })])).toContain('same phone');
    expect(combineProblem([row(), row({ paymentStatus: 'PAID' })])).toContain('Paid aur COD');
  });
  it('adds up identical lines', () => {
    const merged = mergeLines([
      { name: 'Shirt', variant: 'M', quantity: 1, price: 900, productId: 'p1', variantId: 'v1' },
      { name: 'Shirt', variant: 'M', quantity: 2, price: 900, productId: 'p1', variantId: 'v1' },
      { name: 'Shirt', variant: 'L', quantity: 1, price: 900, productId: 'p1', variantId: 'v2' },
    ]);
    expect(merged.map((m) => [m.variant, m.quantity])).toEqual([['M', 3], ['L', 1]]);
  });
});

describe('split guards', () => {
  function svc(order: any) {
    const prisma: any = {
      channelOrder: {
        findFirst: async () => order,
        count: async () => 0,
        findUnique: async () => null,
        create: async (q: any) => ({ id: 'new1', ...q.data }),
        update: async () => ({}),
      },
    };
    const orders: any = { addTimeline: async () => ({ id: order.id }), view: async (id: string) => ({ id }) };
    return { s: new OrderEntryService(prisma, orders, {} as any, {} as any, {} as any), prisma };
  }
  const base = {
    id: 'o1', integrationId: 'i1', tenantId: 't1', externalOrderId: '5001', externalOrderNumber: '#5001', orderStatus: 'PENDING', nafaaSaleId: null,
    deletedAt: null, discount: 100, deliveryFee: 200, metadata: {}, receivedAt: new Date(),
    items: [{ name: 'A', quantity: 1, price: 500 }, { name: 'B', quantity: 2, price: 300 }],
  };

  it('refuses after accept, empty or all items', async () => {
    await expect(svc({ ...base, nafaaSaleId: 's1', orderStatus: 'CONFIRMED' }).s.split(user, scope, 'o1', { itemIndexes: [1] })).rejects.toThrow('accept se pehle');
    await expect(svc(base).s.split(user, scope, 'o1', { itemIndexes: [] })).rejects.toThrow('chunein');
    await expect(svc(base).s.split(user, scope, 'o1', { itemIndexes: [0, 1] })).rejects.toThrow('pehle order me');
    await expect(svc(base).s.split(user, scope, 'o1', { itemIndexes: [5] })).rejects.toThrow('chunein');
  });

  it('moves the chosen items into <orig>-S1; discount and delivery stay on the original', async () => {
    let created: any;
    let updated: any;
    const { s, prisma } = svc(base);
    prisma.channelOrder.create = async (q: any) => { created = q.data; return { id: 'new1', ...q.data }; };
    prisma.channelOrder.update = async (q: any) => { updated = q.data; return {}; };
    const r = await s.split(user, scope, 'o1', { itemIndexes: [1] });
    expect(created.externalOrderId).toBe('5001-S1');
    expect(created.externalOrderNumber).toBe('5001-S1');
    expect(created.total).toBe(600);
    expect(created.metadata.splitFrom).toEqual({ id: 'o1', number: '5001' });
    expect(updated.total).toBe(600); // 500 - 100 discount + 200 delivery
    expect(r.newOrder).toEqual({ id: 'new1' });
  });
});
