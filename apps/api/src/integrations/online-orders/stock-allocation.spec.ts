import { allocate, channelShare, readStockRule, StockRule } from './stock-allocation';

const ALL: StockRule = { mode: 'ALL', percent: 100, fixed: 0, buffer: 0 };
const rule = (r: Partial<StockRule>): StockRule => ({ ...ALL, ...r });

describe('stock allocation', () => {
  it('ALL gives the whole stock minus the buffer (old behaviour)', () => {
    expect(channelShare(100, ALL)).toBe(100);
    expect(channelShare(100, rule({ buffer: 5 }))).toBe(95);
    expect(channelShare(3, rule({ buffer: 5 }))).toBe(0);
  });

  it('PERCENT gives a share of the stock after the buffer, rounded down', () => {
    expect(channelShare(100, rule({ mode: 'PERCENT', percent: 30 }))).toBe(30);
    expect(channelShare(7, rule({ mode: 'PERCENT', percent: 50 }))).toBe(3);
    expect(channelShare(100, rule({ mode: 'PERCENT', percent: 50, buffer: 10 }))).toBe(45);
  });

  it('FIXED gives the channel default, a link share wins', () => {
    expect(channelShare(100, rule({ mode: 'FIXED', fixed: 20 }))).toBe(20);
    expect(channelShare(100, rule({ mode: 'FIXED', fixed: 20 }), 35)).toBe(35);
    expect(channelShare(100, ALL, 30)).toBe(30);
    expect(channelShare(100, ALL, 0)).toBe(0);
  });

  it('owner example: Nafaa 100 → Daraz 30, Shopify 20, website all', () => {
    const r = allocate(100, [
      { channelId: 'daraz', rule: ALL, allocQty: 30 },
      { channelId: 'shopify', rule: rule({ mode: 'FIXED', fixed: 20 }) },
      { channelId: 'web', rule: ALL },
    ]);
    expect(r.qty).toEqual({ daraz: 30, shopify: 20, web: 100 });
    expect(r.scaled).toBe(false);
  });

  it('never sends more than Nafaa has: fixed shares above stock are scaled down to exactly the stock', () => {
    const r = allocate(10, [
      { channelId: 'a', rule: ALL, allocQty: 30 },
      { channelId: 'b', rule: ALL, allocQty: 20 },
    ]);
    expect(r.scaled).toBe(true);
    expect(r.fixedAsked).toBe(50);
    expect(r.qty.a + r.qty.b).toBe(10);
    expect(r.qty).toEqual({ a: 6, b: 4 });
  });

  it('scaling keeps whole units and hands out the remainder by largest fraction', () => {
    const r = allocate(10, [
      { channelId: 'a', rule: ALL, allocQty: 1 },
      { channelId: 'b', rule: ALL, allocQty: 1 },
      { channelId: 'c', rule: ALL, allocQty: 1 },
      { channelId: 'd', rule: ALL, allocQty: 10 },
    ]);
    expect(Object.values(r.qty).reduce((n, q) => n + q, 0)).toBe(10);
    for (const q of Object.values(r.qty)) expect(Number.isInteger(q)).toBe(true);
    expect(r.qty.d).toBeGreaterThan(r.qty.a);
  });

  it('unlisted gets 0 and does not take part in scaling', () => {
    const r = allocate(10, [
      { channelId: 'a', rule: ALL, allocQty: 10, listed: false },
      { channelId: 'b', rule: ALL, allocQty: 8 },
      { channelId: 'c', rule: ALL },
    ]);
    expect(r.qty).toEqual({ a: 0, b: 8, c: 10 });
    expect(r.scaled).toBe(false);
  });

  it('a fixed share never goes past the stock left after the buffer', () => {
    expect(channelShare(10, rule({ buffer: 4 }), 9)).toBe(6);
  });

  it('zero, negative and broken stock give 0', () => {
    expect(channelShare(0, ALL)).toBe(0);
    expect(channelShare(-5, ALL)).toBe(0);
    expect(channelShare(Number.NaN, ALL)).toBe(0);
    expect(allocate(-3, [{ channelId: 'a', rule: ALL, allocQty: 5 }]).qty.a).toBe(0);
  });

  it('reads the channel config with safe defaults', () => {
    expect(readStockRule(undefined)).toEqual({ mode: 'ALL', percent: 100, fixed: 0, buffer: 0 });
    expect(readStockRule({ stockMode: 'PERCENT', stockPercent: 250, stockBuffer: -2 })).toEqual({ mode: 'PERCENT', percent: 100, fixed: 0, buffer: 0 });
    expect(readStockRule({ stockMode: 'FIXED', stockFixed: '12' })).toMatchObject({ mode: 'FIXED', fixed: 12 });
    expect(readStockRule({ stockMode: 'nonsense' }).mode).toBe('ALL');
  });
});
