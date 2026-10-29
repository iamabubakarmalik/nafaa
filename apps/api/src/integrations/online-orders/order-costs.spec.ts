import {
  CostOrder, chargeFromBooking, codFeeOf, normalizeCostSettings, orderCosts, orderProfit, postableCosts, rateCharge,
} from './order-costs';

const settings = normalizeCostSettings({
  postExpenses: true,
  packaging: { default: 30, byChannel: { ch2: 50 } },
  couriers: {
    LEOPARDS: { base: 200, baseKg: 0.5, perKg: 80, cities: [{ city: 'Karachi', base: 150 }], codPct: 2, codFixed: 10, rtoPct: 50 },
    TCS: { base: 250, perKg: 100 },
  },
  gateways: { SAFEPAY: { pct: 2.9, fixed: 30 } },
}, false);

const order = (o: Partial<CostOrder> = {}): CostOrder => ({
  orderStatus: 'DELIVERED', isCod: true, courierCode: 'LEOPARDS', customerCity: 'Lahore', integrationId: 'ch1',
  dispatched: true, weightKg: 0.5, codAmount: 2000, links: [], saved: {}, ...o,
});

describe('order costs: settings', () => {
  it('keeps the shop choice and falls back to the default only when never chosen', () => {
    expect(normalizeCostSettings({}, true).postExpenses).toBe(true);
    expect(normalizeCostSettings({}, false).postExpenses).toBe(false);
    expect(normalizeCostSettings({ postExpenses: false }, true).postExpenses).toBe(false);
  });

  it('cleans bad numbers, duplicate cities and unknown codes', () => {
    const s = normalizeCostSettings({
      couriers: { TCS: { base: -5, perKg: 'x', cities: [{ city: 'Lahore', base: 100 }, { city: 'lahore ', base: 90 }] }, 'bad code': { base: 1 } },
    }, false);
    expect(s.couriers.TCS.base).toBe(0);
    expect(s.couriers.TCS.perKg).toBe(0);
    expect(s.couriers.TCS.cities).toEqual([{ city: 'Lahore', base: 100 }]);
    expect(s.couriers.TCS.rtoPct).toBe(100);
    expect(Object.keys(s.couriers)).toEqual(['TCS']);
  });
});

describe('order costs: rate card', () => {
  const rate = settings.couriers.LEOPARDS;
  it('base up to the base weight, then each started kilo', () => {
    expect(rateCharge(rate, 'Lahore', 0.5)).toBe(200);
    expect(rateCharge(rate, 'Lahore', 1)).toBe(280);
    expect(rateCharge(rate, 'Lahore', 1.6)).toBe(360);
    expect(rateCharge(rate, 'Lahore', null)).toBe(200);
  });
  it('a city price replaces the base', () => {
    expect(rateCharge(rate, ' karachi ', 0.5)).toBe(150);
    expect(rateCharge(rate, 'KARACHI', 1.2)).toBe(230);
  });
  it('no rate, no estimate', () => {
    expect(rateCharge(undefined, 'Lahore', 1)).toBeNull();
    expect(rateCharge(normalizeCostSettings({ couriers: { TCS: {} } }, false).couriers.TCS, 'Lahore', 1)).toBeNull();
  });
  it('COD fee is % plus fixed, nothing without COD', () => {
    expect(codFeeOf(rate, 2000)).toBe(50);
    expect(codFeeOf(rate, 0)).toBe(0);
  });
  it('reads a charge from a booking reply when the courier sends one', () => {
    expect(chargeFromBooking({ deliveryCharges: '245.5' })).toBe(245.5);
    expect(chargeFromBooking({ trackingNumber: 'X' })).toBeNull();
    expect(chargeFromBooking(null)).toBeNull();
  });
});

describe('order costs: per order', () => {
  it('delivered COD parcel: courier, COD fee and packaging from the rates', () => {
    const c = orderCosts(order(), settings);
    expect(c.courierCharge).toEqual({ value: 200, source: 'ESTIMATE' });
    expect(c.codFee.value).toBe(50);
    expect(c.packagingCost.value).toBe(30);
    expect(c.rtoCost.value).toBe(0);
    expect(c.total).toBe(280);
    expect(c.estimated).toBe(true);
  });

  it('saved values win over the rates, including a saved zero', () => {
    const c = orderCosts(order({ saved: { courierCharge: 240, codFee: 0 }, sources: { courierCharge: 'STATEMENT', codFee: 'STATEMENT' } }), settings);
    expect(c.courierCharge).toEqual({ value: 240, source: 'STATEMENT' });
    expect(c.codFee).toEqual({ value: 0, source: 'STATEMENT' });
    expect(c.total).toBe(270);
  });

  it('returned parcel: forward charge plus the return leg, no COD fee', () => {
    const c = orderCosts(order({ orderStatus: 'RETURNED' }), settings);
    expect(c.courierCharge.value).toBe(200);
    expect(c.rtoCost.value).toBe(100);
    expect(c.codFee.value).toBe(0);
    expect(c.total).toBe(330);
  });

  it('cancelled before dispatch costs nothing', () => {
    expect(orderCosts(order({ orderStatus: 'CANCELLED', dispatched: false }), settings).total).toBe(0);
  });

  it('own rider: no courier charge or COD fee; packaging per channel', () => {
    const c = orderCosts(order({ courierCode: 'RIDER', integrationId: 'ch2' }), settings);
    expect(c.courierCharge.value).toBe(0);
    expect(c.codFee.value).toBe(0);
    expect(c.packagingCost.value).toBe(50);
    expect(c.courierMissing).toBe(false);
  });

  it('flags a courier with no rate and no saved charge', () => {
    expect(orderCosts(order({ courierCode: 'POSTEX' }), settings).courierMissing).toBe(true);
  });

  it('gateway fee: the reported fee, else the shop rate', () => {
    const c = orderCosts(order({ isCod: false, codAmount: 0, links: [{ provider: 'SAFEPAY', amount: 1000 }, { provider: 'JAZZCASH', amount: 500, fee: 12 }] }), settings);
    expect(c.gatewayFee.value).toBe(71);
  });
});

describe('order costs: true profit', () => {
  it('goods − product cost + delivery collected − selling costs', () => {
    // Bill 2150 = goods 2000 + delivery 150; cost 1200; selling costs 280.
    const p = orderProfit({ net: 2150, cost: 1200, delivery: 150 }, { total: 280 });
    expect(p).toEqual({ sale: 2000, cost: 1200, deliveryCollected: 150, sellingCosts: 280, profit: 670, margin: 31.2 });
  });

  it('a returned parcel (voided bill) only loses its costs', () => {
    expect(orderProfit(null, { total: 330 })).toEqual({ sale: 0, cost: 0, deliveryCollected: 0, sellingCosts: 330, profit: -330, margin: null });
  });

  it('what gets posted as an expense', () => {
    const c = orderCosts(order(), settings);
    expect(postableCosts(c)).toEqual({ amount: 280, parts: [{ kind: 'courierCharge', value: 200 }, { kind: 'codFee', value: 50 }, { kind: 'packagingCost', value: 30 }] });
  });
});
