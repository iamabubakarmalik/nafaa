import { boughtWith, couponApplies, couponCode, freeShippingAdvice, friendlyAmount, topPairs } from './conversion-math';

describe('bought together', () => {
  // 100 bills: A in 20, B in 10, C in 50; A+B together 8, A+C together 10.
  const counts = new Map([['A', 20], ['B', 10], ['C', 50], ['D', 3]]);
  const pairs = [
    { a: 'A', b: 'B', together: 8 },
    { a: 'A', b: 'C', together: 10 },
    { a: 'A', b: 'D', together: 1 },
  ];

  it('keeps pairs that sell together more than by chance, best first', () => {
    const r = boughtWith('A', pairs, counts, 100);
    // B: confidence 40%, lift 4. C: confidence 50% but lift 1 (C is in half of all bills) → dropped.
    expect(r.map((x) => x.productId)).toEqual(['B']);
    expect(r[0]).toMatchObject({ together: 8, confidence: 40, lift: 4 });
  });

  it('needs at least two shared bills', () => {
    expect(boughtWith('D', pairs, counts, 100)).toEqual([]);
  });

  it('lists the strongest shop pairs', () => {
    expect(topPairs(pairs, counts, 100).map((p) => `${p.a}+${p.b}`)).toEqual(['A+B']);
  });
});

describe('free shipping threshold', () => {
  it('suggests a friendly amount a little above the typical order', () => {
    const values = Array.from({ length: 100 }, (_, i) => 1000 + i * 30); // 1,000 … 3,970
    const a = freeShippingAdvice(values, 250);
    expect(a.threshold).toBe(3000);
    expect(a.alreadyAbove).toBeGreaterThan(25);
    expect(a.alreadyAbove).toBeLessThan(45);
    expect(a.nearBelow).toBeGreaterThan(20);
    expect(a.liftPerOrder).toBeGreaterThan(0);
    expect(a.bands.reduce((s, b) => s + b.orders, 0)).toBe(100);
  });

  it('gives no threshold with too few orders', () => {
    expect(freeShippingAdvice([1200, 1500], 200).threshold).toBeNull();
  });

  it('rounds to price steps', () => {
    expect(friendlyAmount(1234)).toBe(1300);
    expect(friendlyAmount(2710)).toBe(3000);
    expect(friendlyAmount(12_300)).toBe(13_000);
  });
});

describe('coupons', () => {
  const now = new Date('2026-11-20T10:00:00Z');
  const base = { code: 'WBABCDE', type: 'PERCENT', value: 10, minSubtotal: 1000, shared: false, phoneKey: '3001234567', expiresAt: new Date('2026-11-30'), usedAt: null };

  it('makes readable codes with the prefix', () => {
    expect(couponCode('wb')).toMatch(/^WB[A-HJ-NP-Z2-9]{5}$/);
  });

  it('gives the discount and refuses used, expired, small or other-customer orders', () => {
    expect(couponApplies(base, 2000, '3001234567', now)).toEqual({ discount: 200 });
    expect(couponApplies({ ...base, usedAt: now }, 2000, null, now)).toHaveProperty('error');
    expect(couponApplies({ ...base, expiresAt: new Date('2026-11-01') }, 2000, null, now)).toHaveProperty('error');
    expect(couponApplies(base, 500, null, now)).toHaveProperty('error');
    expect(couponApplies(base, 2000, '3009999999', now)).toHaveProperty('error');
    expect(couponApplies({ ...base, type: 'FIXED', value: 5000 }, 2000, null, now)).toEqual({ discount: 2000 });
  });
});
