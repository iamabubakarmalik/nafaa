import { bundleIdeas, classifyTrend, countPairs, marginOpportunities, marginPct, median, windows } from './radar-math';

describe('classifyTrend', () => {
  it('finds rising and falling by the change limit', () => {
    expect(classifyTrend(20, 10)).toEqual({ trend: 'rising', changePct: 100, delta: 10 });
    expect(classifyTrend(7, 10).trend).toBe('falling');
    expect(classifyTrend(11, 10).trend).toBe('steady');
  });
  it('marks new and stopped products', () => {
    expect(classifyTrend(5, 0)).toEqual({ trend: 'new', changePct: null, delta: 5 });
    expect(classifyTrend(0, 6).trend).toBe('stopped');
  });
  it('ignores noise below the minimum units', () => {
    expect(classifyTrend(2, 1).trend).toBe('steady');
    expect(classifyTrend(1, 0).trend).toBe('steady');
    expect(classifyTrend(0, 2).trend).toBe('steady');
  });
});

describe('windows', () => {
  it('builds two equal back-to-back periods', () => {
    const w = windows(new Date('2026-11-10T00:00:00Z'), 14);
    expect(w.recentFrom.toISOString()).toBe('2026-10-27T00:00:00.000Z');
    expect(w.priorFrom.toISOString()).toBe('2026-10-13T00:00:00.000Z');
  });
});

describe('marginPct', () => {
  it('is a percent of the price and null without a cost', () => {
    expect(marginPct(200, 150)).toBe(25);
    expect(marginPct(200, 0)).toBeNull();
    expect(marginPct(0, 5)).toBeNull();
    expect(marginPct(100, 120)).toBe(-20);
  });
  it('median handles even and empty lists', () => {
    expect(median([])).toBe(0);
    expect(median([1, 3, 2, 4])).toBe(2.5);
  });
});

const row = (id: string, price: number, cost: number, units: number, stock = 10) => ({ productId: id, name: id, price, cost, units, stock });

describe('marginOpportunities', () => {
  const base = [row('a', 100, 60, 10), row('b', 100, 60, 8), row('c', 100, 60, 6), row('d', 100, 60, 5), row('e', 100, 60, 4)];
  it('flags selling below cost', () => {
    const r = marginOpportunities([...base, row('loss', 90, 100, 7)]);
    const l = r.list.find((x) => x.kind === 'loss')!;
    expect(l.productId).toBe('loss');
    expect(l.suggestedPrice).toBeGreaterThan(100);
    expect(l.gain).toBeGreaterThan(0);
  });
  it('suggests a small raise for a best seller with a thin margin', () => {
    const r = marginOpportunities([...base, row('hot', 100, 85, 30)]);
    const x = r.list.find((o) => o.kind === 'raise_price')!;
    expect(x.productId).toBe('hot');
    expect(x.suggestedPrice).toBeLessThanOrEqual(110);
    expect(x.suggestedPrice).toBeGreaterThan(100);
  });
  it('suggests pushing a high margin slow seller that has stock', () => {
    const r = marginOpportunities([...base, row('rich', 100, 20, 1, 40)]);
    const x = r.list.find((o) => o.kind === 'push')!;
    expect(x.productId).toBe('rich');
    expect(x.gain).toBe(3200);
  });
  it('skips products without a cost and needs enough sellers', () => {
    expect(marginOpportunities([row('x', 100, 0, 50)]).list).toEqual([]);
    expect(marginOpportunities([row('hot', 100, 85, 30), row('b', 100, 60, 8)]).list.filter((o) => o.kind !== 'loss')).toEqual([]);
  });
});

describe('bundles', () => {
  const bills = [
    ['tea', 'sugar'], ['tea', 'sugar', 'milk'], ['tea', 'sugar'], ['tea', 'biscuit'], ['milk'], ['rice'], ['rice'], ['oil'], ['flour'], ['salt'],
  ];
  const { pairs, counts, bills: n } = countPairs(bills);
  it('counts bills and pairs once per bill', () => {
    expect(n).toBe(10);
    expect(counts.get('tea')).toBe(4);
    expect(pairs.find((p) => p.a === 'sugar' && p.b === 'tea')!.together).toBe(3);
    expect(countPairs([['a', 'a', 'b']]).pairs[0].together).toBe(1);
  });
  it('skips huge bills', () => {
    const big = Array.from({ length: 20 }, (_, i) => `p${i}`);
    expect(countPairs([big, big]).pairs).toEqual([]);
  });
  it('offers a small discount kept inside the margin', () => {
    const info = new Map([['tea', { name: 'Tea', price: 500, cost: 400 }], ['sugar', { name: 'Sugar', price: 200, cost: 150 }]]);
    const ideas = bundleIdeas(pairs, counts, n, info);
    expect(ideas).toHaveLength(1);
    expect(ideas[0]).toMatchObject({ aName: 'Sugar', bName: 'Tea', together: 3, regularPrice: 700 });
    expect(ideas[0].discountPct).toBe(Math.floor((((700 - 550) / 700) * 100) / 3));
    expect(ideas[0].bundlePrice).toBeLessThan(700);
    expect(ideas[0].marginPct!).toBeGreaterThan(0);
  });
  it('offers 5% when a cost is unknown', () => {
    const info = new Map([['tea', { name: 'Tea', price: 500, cost: 0 }], ['sugar', { name: 'Sugar', price: 200, cost: 150 }]]);
    const i = bundleIdeas(pairs, counts, n, info)[0];
    expect(i.discountPct).toBe(5);
    expect(i.marginPct).toBeNull();
  });
});
