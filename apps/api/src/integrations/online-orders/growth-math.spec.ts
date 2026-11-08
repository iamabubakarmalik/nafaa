import {
  ageBucket, forecastOf, matchRecoveries, normalizeWaTemplates, orderCash, parseWebsiteCheckout, profitWaterfall, settleDays,
} from './growth-math';
import { orderCosts, orderProfit, normalizeCostSettings } from './order-costs';

const d = (s: string) => new Date(s);

describe('profitWaterfall', () => {
  it('follows sales − product cost − ads − courier − returns − other expenses', () => {
    const w = profitWaterfall({ sales: 100_000, productCost: 55_000, sellingCosts: 12_000, returnCosts: 3_000, ads: 10_000, otherExpenses: 5_000 });
    expect(w.courier).toBe(9_000);
    expect(w.returns).toBe(3_000);
    expect(w.grossProfit).toBe(45_000);
    expect(w.net).toBe(100_000 - 55_000 - 10_000 - 9_000 - 3_000 - 5_000);
    expect(w.margin).toBe(18);
  });

  it('matches the order profit of order-costs when ads and expenses are zero', () => {
    const s = normalizeCostSettings({ couriers: { POSTEX: { base: 200, codPct: 2 } }, packaging: { default: 30 } }, true);
    const kept = orderCosts({
      orderStatus: 'DELIVERED', isCod: true, courierCode: 'POSTEX', customerCity: 'Lahore', integrationId: 'a', dispatched: true,
      weightKg: null, codAmount: 3000, links: [], saved: {},
    }, s);
    const back = orderCosts({
      orderStatus: 'RETURNED', isCod: true, courierCode: 'POSTEX', customerCity: 'Lahore', integrationId: 'a', dispatched: true,
      weightKg: null, codAmount: 2000, links: [], saved: {},
    }, s);
    const p1 = orderProfit({ net: 3000, cost: 1800, delivery: 200 }, kept);
    const p2 = orderProfit(null, back);
    const w = profitWaterfall({
      sales: p1.sale + p1.deliveryCollected + p2.sale + p2.deliveryCollected, productCost: p1.cost + p2.cost,
      sellingCosts: kept.total + back.total, returnCosts: back.total, ads: 0, otherExpenses: 0,
    });
    expect(w.net).toBeCloseTo(p1.profit + p2.profit, 2);
    expect(w.returns).toBe(back.total);
    expect(w.courier).toBe(kept.total);
  });

  it('never lets return costs exceed selling costs and has no margin without sales', () => {
    const w = profitWaterfall({ sales: 0, productCost: 0, sellingCosts: 100, returnCosts: 500, ads: 0, otherExpenses: 0 });
    expect(w.returns).toBe(100);
    expect(w.courier).toBe(0);
    expect(w.net).toBe(-100);
    expect(w.margin).toBeNull();
  });
});

describe('orderCash', () => {
  const base = { orderStatus: 'DELIVERED', paymentStatus: 'PENDING', isCod: true, due: 3000, advance: 500, hasBill: true, codSettled: false };
  it('counts the advance as received and the rest as COD outstanding', () => {
    expect(orderCash(base)).toEqual({ received: 500, codOutstanding: 2500 });
  });
  it('counts everything once the courier paid', () => {
    expect(orderCash({ ...base, codSettled: true })).toEqual({ received: 3000, codOutstanding: 0 });
    expect(orderCash({ ...base, paymentStatus: 'PAID', isCod: false })).toEqual({ received: 3000, codOutstanding: 0 });
  });
  it('keeps only the advance of a returned parcel', () => {
    expect(orderCash({ ...base, orderStatus: 'RETURNED' })).toEqual({ received: 500, codOutstanding: 0 });
  });
});

describe('COD age and forecast', () => {
  it('buckets ages', () => {
    expect([0, 7, 8, 14, 15, 30, 31].map(ageBucket)).toEqual(['d0_7', 'd0_7', 'd8_14', 'd8_14', 'd15_30', 'd15_30', 'd30p']);
  });
  it('uses the median settle time, else the fallback', () => {
    expect(settleDays([2, 3, 10])).toBe(3);
    expect(settleDays([2])).toBe(7);
  });
  it('places a delivery in overdue, this week or later', () => {
    const now = d('2026-11-09T12:00:00Z');
    expect(forecastOf(d('2026-10-20T12:00:00Z'), 7, now)).toBe('overdue');
    expect(forecastOf(d('2026-11-08T12:00:00Z'), 7, now)).toBe('thisWeek');
    expect(forecastOf(d('2026-11-08T12:00:00Z'), 20, now)).toBe('later');
  });
});

describe('matchRecoveries', () => {
  const cart = (id: string, phoneKey: string | null, at: string, extra: object = {}) => ({ id, phoneKey, email: null, abandonedAt: d(at), ...extra });
  const order = (id: string, phoneKey: string | null, at: string, total = 1000, email: string | null = null) => ({ id, phoneKey, email, receivedAt: d(at), total });

  it('links a later order from the same phone within 14 days', () => {
    const m = matchRecoveries([cart('c1', '3001234567', '2026-11-01T10:00:00Z')], [order('o1', '3001234567', '2026-11-03T10:00:00Z', 2500)]);
    expect(m.get('c1')).toEqual({ orderId: 'o1', at: d('2026-11-03T10:00:00Z'), value: 2500 });
  });

  it('ignores orders before the checkout, after 14 days, or from another phone', () => {
    const m = matchRecoveries([cart('c1', '3001234567', '2026-11-01T10:00:00Z')], [
      order('before', '3001234567', '2026-10-31T10:00:00Z'),
      order('late', '3001234567', '2026-11-20T10:00:00Z'),
      order('other', '3009999999', '2026-11-02T10:00:00Z'),
    ]);
    expect(m.size).toBe(0);
  });

  it('matches by email when the phone is missing', () => {
    const m = matchRecoveries(
      [{ id: 'c1', phoneKey: null, email: 'Ali@Mail.com ', abandonedAt: d('2026-11-01T10:00:00Z') }],
      [order('o1', null, '2026-11-02T10:00:00Z', 900, 'ali@mail.com')],
    );
    expect(m.get('c1')?.orderId).toBe('o1');
  });

  it('gives one order to the latest checkout before it', () => {
    const m = matchRecoveries(
      [cart('old', '3001234567', '2026-11-01T10:00:00Z'), cart('new', '3001234567', '2026-11-02T10:00:00Z')],
      [order('o1', '3001234567', '2026-11-03T10:00:00Z')],
    );
    expect(m.get('new')?.orderId).toBe('o1');
    expect(m.has('old')).toBe(false);
  });

  it('counts a checkout the channel completed, without an order link', () => {
    const m = matchRecoveries([cart('c1', null, '2026-11-01T10:00:00Z', { completedAt: d('2026-11-01T11:00:00Z') })], []);
    expect(m.get('c1')).toEqual({ orderId: null, at: d('2026-11-01T11:00:00Z'), value: 0 });
  });
});

describe('parseWebsiteCheckout', () => {
  it('reads the event shape with a nested customer', () => {
    const c = parseWebsiteCheckout({
      event: 'checkout.abandoned',
      checkout: {
        id: 'ck_1', customer: { name: 'Sana', phone: '+92 300 1234567', email: 'sana@x.pk', city: 'Lahore' },
        items: [{ name: 'Shirt', quantity: 2, price: 1500 }], recovery_url: 'https://shop.pk/cart/ck_1', abandoned_at: '2026-11-01T10:00:00Z',
      },
    })!;
    expect(c.externalId).toBe('ck_1');
    expect(c.phoneKey).toBe('3001234567');
    expect(c.total).toBe(3000);
    expect(c.recoveryUrl).toBe('https://shop.pk/cart/ck_1');
    expect(c.abandonedAt.toISOString()).toBe('2026-11-01T10:00:00.000Z');
  });
  it('rejects a payload without an id and drops unsafe links', () => {
    expect(parseWebsiteCheckout({ items: [] })).toBeNull();
    expect(parseWebsiteCheckout({ id: 1, recovery_url: 'javascript:alert(1)' })!.recoveryUrl).toBeNull();
  });
});

describe('normalizeWaTemplates', () => {
  it('keeps known keys with text only', () => {
    expect(normalizeWaTemplates({ templates: { confirm: '  Hi {name} ', cart: '', other: 'x', advance: 5 } })).toEqual({ confirm: 'Hi {name}' });
  });
});
