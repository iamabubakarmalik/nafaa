import { OrderToolsService } from './order-tools.service';
import { ShopScope } from '../../common/shop-scope';

const user: any = { id: 'u1', tenantId: 't1', role: 'OWNER' };
const scope = new ShopScope(null, true);
const d = (s: string) => new Date(s);
const ch = { id: 'c1', displayName: 'keyphantom.store', type: 'WOOCOMMERCE' };

function svc(rows: any[], extra: any = {}) {
  const store: Record<string, string> = {};
  const prisma: any = {
    channelOrder: { findMany: async (q: any) => (q.where.paymentStatus === 'COLLECTED' ? extra.collected ?? [] : rows), findFirst: async () => extra.order ?? null, update: async (q: any) => { extra.updated = q; return {}; } },
    sale: { findMany: async () => [] },
    systemSetting: { findUnique: async (q: any) => (store[q.where.key] ? { value: store[q.where.key] } : null), upsert: async (q: any) => { store[q.where.key] = q.create.value; } },
    user: { findUnique: async () => ({ fullName: 'Urwa', email: 'x' }) },
  };
  return new OrderToolsService(prisma);
}

describe('OrderTools report', () => {
  it('RTO %, shehar, courier, products', async () => {
    const base = { acceptedAt: d('2026-09-10T10:05:00Z'), receivedAt: d('2026-09-10T10:00:00Z'), integration: ch, metadata: {}, customerPhone: '03001234567', items: [{ name: 'Hub', quantity: 1, price: 799 }] };
    const rows = [
      { ...base, orderStatus: 'DELIVERED', paymentStatus: 'PAID', total: 998, customerCity: 'Lahore', courierCode: 'POSTEX', dispatchedAt: d('2026-09-11T10:00:00Z'), deliveredAt: d('2026-09-13T10:00:00Z') },
      { ...base, orderStatus: 'RETURNED', paymentStatus: 'NOT_COLLECTED', total: 998, customerCity: 'lahore', courierCode: 'POSTEX', dispatchedAt: d('2026-09-11T10:00:00Z'), deliveredAt: null },
      { ...base, orderStatus: 'CANCELLED', paymentStatus: 'PENDING', total: 500, customerCity: 'Karachi', courierCode: null, dispatchedAt: null, deliveredAt: null, acceptedAt: null },
      { ...base, orderStatus: 'PENDING', paymentStatus: 'PENDING', total: 100, customerCity: 'Karachi', courierCode: null, dispatchedAt: null, deliveredAt: null, acceptedAt: null, metadata: { test: true } },
    ];
    const r = await svc(rows).report(user, scope, { from: '2026-09-01', to: '2026-09-29' });
    expect(r.totals.orders).toBe(3); // test order nahi gina
    expect(r.totals.rtoRate).toBe(50);
    expect(r.totals.avgAcceptMinutes).toBe(5);
    expect(r.totals.avgDeliveryDays).toBe(2);
    expect(r.byCity[0]).toMatchObject({ city: 'Lahore', orders: 2, returned: 1, rtoRate: 50 });
    expect(r.byCourier[0]).toMatchObject({ code: 'POSTEX', dispatched: 2, delivered: 1, returned: 1 });
    expect(r.topProducts[0]).toMatchObject({ name: 'Hub', qty: 1 }); // wapas / cancel bika nahi mana jata
    expect(r.byDay.length).toBe(29);
  });
});

describe('OrderTools CSV + blocklist + edit', () => {
  it('CSV: formula injection band, BOM, quotes', async () => {
    const csv = await svc([{
      externalOrderNumber: '#2938', externalOrderId: '1', receivedAt: d('2026-09-29T14:12:00Z'), customerName: '=HYPERLINK("x")', customerPhone: '03001234567',
      customerCity: 'Lahore', customerAddress: 'Al Rehman, 184 d', items: [{ name: 'Hub', quantity: 1 }], subtotal: 799, deliveryFee: 199, discount: 0, total: 998,
      paymentMethod: 'CASH', paymentStatus: 'PENDING', orderStatus: 'PENDING', courierCode: null, courierName: null, trackingNumber: null, nafaaSaleId: null,
      dispatchedAt: null, deliveredAt: null, codSettledAt: null, codSettlementRef: null, integration: ch,
    }]).exportCsv(user, scope, {});
    expect(csv.charCodeAt(0)).toBe(0xfeff);
    const line = csv.split('\r\n')[1];
    expect(line.startsWith('2938,')).toBe(true);
    expect(line).toContain(`"'=HYPERLINK(""x"")"`);
    expect(line).toContain('"Al Rehman, 184 d"');
  });

  it('block → isBlocked (har format), unblock', async () => {
    const s = svc([]);
    await s.block(user, { phone: '0300-1234567', reason: 'Fake' });
    expect((await s.isBlocked('t1', '+92 300 1234567'))?.reason).toBe('Fake');
    await s.unblock(user, '03001234567');
    expect(await s.isBlocked('t1', '03001234567')).toBe(null);
  });

  it('edit: bhejne ke baad mana, pehle theek + history', async () => {
    const extra: any = { order: { id: 'o1', orderStatus: 'CONFIRMED', customerName: 'Ali', customerPhone: '0300', customerAddress: 'A', customerCity: 'Lahore', notes: null, metadata: {}, dispatchedAt: null, courierBookedAt: null } };
    const s = svc([], extra);
    const r = await s.editOrder(user, scope, 'o1', { customerAddress: 'B block', customerCity: 'Lahore' });
    expect(r.changed).toBe(1);
    expect(extra.updated.data.metadata.edits[0].changes.customerAddress).toEqual({ from: 'A', to: 'B block' });
    extra.order = { ...extra.order, dispatchedAt: new Date() };
    await expect(s.editOrder(user, scope, 'o1', { customerAddress: 'C' })).rejects.toMatchObject({ status: 400 });
  });
});
