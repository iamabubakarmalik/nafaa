import { listPrice, priceOrder, type PricingCatalog, type PricingList, type PricingProduct, type PricingUnit } from './pricing';
import { creditStatus, ageing, formatRs, openDebts } from './credit';
import { distanceMetres, docNumber, splitPacks } from './logistics';

const soap: PricingProduct = { id: 'soap', name: 'Lifebuoy', price: 120, wholesalePrice: 105, costPrice: 95, unit: 'pcs', brandId: 'unilever', categoryId: 'care' };
const carton: PricingUnit = { id: 'ctn', productId: 'soap', unitName: 'Carton', conversionRate: 72, price: 8400, wholesalePrice: 7400, costPrice: 6800 };

function catalog(): PricingCatalog {
  return {
    products: new Map([[soap.id, soap]]),
    variants: new Map(),
    units: new Map([[carton.id, carton]]),
    unitsByProduct: new Map([[soap.id, [carton]]]),
  };
}

describe('list price', () => {
  it('without a list: the tier price of the pack, falling back to base × size', () => {
    expect(listPrice({ product: soap, tier: 'WHOLESALE' }).price).toBe(105);
    expect(listPrice({ product: soap, unit: carton, tier: 'WHOLESALE' }).price).toBe(7400);
    expect(listPrice({ product: soap, unit: { ...carton, price: 0, wholesalePrice: null }, tier: 'WHOLESALE' }).price).toBe(7560);
    expect(listPrice({ product: soap, tier: 'RETAIL' }).price).toBe(120);
  });

  it('a list row wins; a base row covers packs; minQty rows apply from their quantity', () => {
    const list: PricingList = {
      id: 'l', basedOn: 'WHOLESALE', adjustPct: 0,
      items: [{ productId: 'soap', price: 100 }, { productId: 'soap', price: 98, minQty: 144 }, { productId: 'soap', unitId: 'ctn', price: 7000 }],
    };
    expect(listPrice({ product: soap, list, qty: 10 })).toEqual({ price: 100, source: 'LIST_ITEM' });
    expect(listPrice({ product: soap, list, qty: 200 }).price).toBe(98);
    expect(listPrice({ product: soap, unit: carton, list, qty: 1 }).price).toBe(7000);
    const baseOnly: PricingList = { ...list, items: [{ productId: 'soap', price: 100 }] };
    expect(listPrice({ product: soap, unit: carton, list: baseOnly, qty: 1 }).price).toBe(7200);
  });

  it('the list rule: base price plus the percent', () => {
    const list: PricingList = { id: 'l', basedOn: 'COST', adjustPct: 10, items: [] };
    expect(listPrice({ product: soap, list }).price).toBe(104.5);
    expect(listPrice({ product: soap, unit: carton, list }).price).toBe(7480);
    expect(listPrice({ product: soap, list: { ...list, basedOn: 'PRICE', adjustPct: -5 } }).price).toBe(114);
  });
});

describe('order pricing', () => {
  it('prices packs, keeps base quantities and applies the scheme', () => {
    const res = priceOrder([{ productId: 'soap', unitId: 'ctn', qty: 2 }, { productId: 'soap', qty: 10 }], catalog(), {
      tier: 'WHOLESALE',
      schemes: [{ id: 's', name: '5% carton', type: 'PERCENT_OFF', value: 5, buyQty: 1, buyUnitName: 'Carton', isActive: true }],
    });
    expect(res.lines[0]).toMatchObject({ baseQty: 144, price: 7400, gross: 14800, schemeDiscount: 740, total: 14060, unitName: 'Carton' });
    expect(res.lines[1]).toMatchObject({ baseQty: 10, gross: 1050, schemeDiscount: 0, total: 1050 });
    expect(res.total).toBe(15110);
    expect(res.schemeDiscount).toBe(740);
  });

  it('keeps a typed price only with the override permission, and warns otherwise', () => {
    const typed = [{ productId: 'soap', qty: 10, price: 90, discount: 20 }];
    const no = priceOrder(typed, catalog(), { tier: 'WHOLESALE' });
    expect(no.lines[0].price).toBe(105);
    expect(no.lines[0].discount).toBe(0);
    expect(no.warnings.length).toBe(2);
    const yes = priceOrder(typed, catalog(), { tier: 'WHOLESALE', canOverride: true });
    expect(yes.lines[0]).toMatchObject({ price: 90, priceSource: 'OVERRIDE', discount: 20, total: 880 });
  });

  it('drops unknown items and wrong packs with a warning', () => {
    const res = priceOrder([{ productId: 'nope', qty: 1 }, { productId: 'soap', unitId: 'x', qty: 1 }, { productId: 'soap', qty: 1 }], catalog());
    expect(res.lines).toHaveLength(1);
    expect(res.warnings).toHaveLength(2);
  });
});

describe('credit and ageing', () => {
  const d = (s: string) => new Date(`${s}T10:00:00Z`);
  it('payments settle the oldest credit first', () => {
    const debts = openDebts([
      { amount: 1000, createdAt: d('2026-09-01') },
      { amount: 500, createdAt: d('2026-10-01') },
      { amount: -1200, createdAt: d('2026-10-05') },
    ]);
    expect(debts).toEqual([{ left: 300, at: d('2026-10-01') }]);
  });

  it('an advance taken before is used by the next credit', () => {
    expect(openDebts([{ amount: -200, createdAt: d('2026-09-01') }, { amount: 500, createdAt: d('2026-09-02') }])).toEqual([{ left: 300, at: d('2026-09-02') }]);
  });

  it('buckets open debts by age', () => {
    const now = d('2026-10-29');
    const b = ageing([{ left: 100, at: d('2026-10-27') }, { left: 200, at: d('2026-10-10') }, { left: 300, at: d('2026-08-01') }], now);
    expect(b).toEqual({ d0_7: 100, d8_15: 0, d16_30: 200, d31_60: 0, d60_plus: 300 });
  });

  it('flags over limit and overdue', () => {
    const now = d('2026-10-29');
    const s = creditStatus({ balance: 9000, creditLimit: 10000, creditDays: 15, oldestDueAt: d('2026-10-01'), orderTotal: 2000, now });
    expect(s.overLimit).toBe(true);
    expect(s.overdue).toBe(true);
    expect(s.dueDays).toBe(28);
    expect(s.message).toContain('Credit limit Rs 10,000 se zyada (is Order ke baad Rs 11,000)');
    const ok = creditStatus({ balance: 0, creditLimit: 0, creditDays: 0, orderTotal: 99999, now });
    expect(ok).toMatchObject({ overLimit: false, overdue: false, message: null });
  });

  it('writes rupees with thousands commas and drops empty paisa', () => {
    expect(formatRs(150000)).toBe('Rs 150,000');
    expect(formatRs(239841.52)).toBe('Rs 239,841.52');
    expect(formatRs(1234567.5)).toBe('Rs 1,234,567.50');
    expect(formatRs(-999.999)).toBe('Rs -1,000');
    expect(formatRs(0)).toBe('Rs 0');
  });
});

describe('logistics', () => {
  it('splits base quantity into the biggest pack and loose pieces', () => {
    expect(splitPacks(77, [{ unitName: 'Carton', conversionRate: 24 }, { unitName: 'Dozen', conversionRate: 12 }]).text).toBe('3 Carton + 5 pcs');
    expect(splitPacks(48, [{ unitName: 'Carton', conversionRate: 24 }]).text).toBe('2 Carton');
    expect(splitPacks(7, []).text).toBe('7 pcs');
  });

  it('measures GPS distance and numbers documents', () => {
    expect(distanceMetres(31.5204, 74.3587, 31.5204, 74.3587)).toBe(0);
    const m = distanceMetres(31.5204, 74.3587, 31.5213, 74.3587);
    expect(m).toBeGreaterThan(95);
    expect(m).toBeLessThan(105);
    expect(docNumber('SO-', 42)).toBe('SO-000042');
  });
});
