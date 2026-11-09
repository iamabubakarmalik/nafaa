import {
  classify, dailyStdDev, daysOfCover, festivalFactor, percentile, reorderPlan, roundToPack, safetyStock, seasonalFactor,
  stockOutDate, weeklyTotals, weightedVelocity,
} from './forecast-math';

describe('forecast math', () => {
  describe('weightedVelocity', () => {
    it('weights 7/30/90-day rates 0.5/0.3/0.2 for an old product', () => {
      // 14/7 = 2, 30/30 = 1, 45/90 = 0.5 → 1 + 0.3 + 0.1 = 1.4
      expect(weightedVelocity({ d7: 14, d30: 30, d90: 45 }, 400)).toBeCloseTo(1.4, 4);
    });
    it('drops the 90-day window for a product younger than 90 days', () => {
      // (2*0.5 + 1*0.3) / 0.8 = 1.625
      expect(weightedVelocity({ d7: 14, d30: 30, d90: 30 }, 40)).toBeCloseTo(1.625, 4);
    });
    it('spreads a 20-day-old product over its own age, not 30 days', () => {
      // d7 rate 1, d30 rate 20/20 = 1 → 1
      expect(weightedVelocity({ d7: 7, d30: 20, d90: 20 }, 20)).toBeCloseTo(1, 4);
    });
    it('uses at least 7 days for a brand-new product', () => {
      expect(weightedVelocity({ d7: 7, d30: 7, d90: 7 }, 2)).toBe(1);
    });
    it('never goes negative when returns outnumber sales', () => {
      expect(weightedVelocity({ d7: -3, d30: -3, d90: -3 }, 200)).toBe(0);
    });
  });

  describe('seasonalFactor', () => {
    it('compares the coming days last year with the 30 days before', () => {
      // base 30/30 = 1 per day, ahead 60/30 = 2 per day
      expect(seasonalFactor({ prev30: 30, ahead: 60, aheadDays: 30 })).toBe(2);
    });
    it('is null without enough history', () => {
      expect(seasonalFactor({ prev30: 2, ahead: 20, aheadDays: 30 })).toBeNull();
    });
    it('is clamped to 0.5–2.5', () => {
      expect(seasonalFactor({ prev30: 10, ahead: 300, aheadDays: 30 })).toBe(2.5);
      expect(seasonalFactor({ prev30: 100, ahead: 0, aheadDays: 30 })).toBe(0.5);
    });
  });

  describe('festivalFactor', () => {
    it('averages the lift over the days the festival window covers', () => {
      // 11.11 window: 3 days before to 1 after = 8..12 Nov → 5 days at 1.25 in a 10-day horizon from 3 Nov
      const r = festivalFactor([{ key: '11-11', date: '2026-11-11' }], new Date('2026-11-03T00:00:00Z'), 10);
      expect(r.factor).toBeCloseTo((5 * 1.25 + 5) / 10, 3);
      expect(r.names).toEqual(['11-11']);
    });
    it('ignores festivals outside the horizon and greeting days', () => {
      const r = festivalFactor([{ key: 'muharram', date: '2026-11-05' }, { key: 'eid-ul-fitr', date: '2027-03-10' }], new Date('2026-11-03T00:00:00Z'), 30);
      expect(r).toEqual({ factor: 1, names: [] });
    });
  });

  describe('safety stock and reorder', () => {
    it('computes σ of daily sales', () => {
      expect(dailyStdDev([2, 4, 4, 4, 5, 5, 7, 9])).toBe(2);
    });
    it('safety stock is z × σ × √lead', () => {
      expect(safetyStock(2, 9, 1.65)).toBeCloseTo(9.9, 3);
      expect(safetyStock(0, 9, 1.65)).toBe(0);
    });
    it('orders up to lead + cover days when at the reorder point', () => {
      // demand 2/day, lead 4, cover 10, σ 0 → ROP 8, target 28; stock 5 + 1 on order = 6 → order 22, packs of 12 → 24
      const r = reorderPlan({ demand: 2, stock: 5, onOrder: 1, stdDev: 0, leadDays: 4, coverDays: 10, z: 1.65, pack: 12, minOrder: null });
      expect(r.reorderPoint).toBe(8);
      expect(r.target).toBe(28);
      expect(r.suggestQty).toBe(24);
      expect(r.orderInDays).toBe(0);
    });
    it('waits while stock is above the reorder point and says when to order', () => {
      const r = reorderPlan({ demand: 2, stock: 20, onOrder: 0, stdDev: 0, leadDays: 4, coverDays: 10, z: 1.65 });
      expect(r.suggestQty).toBe(0);
      expect(r.orderInDays).toBe(6);
    });
    it('suggests nothing when nothing sells', () => {
      expect(reorderPlan({ demand: 0, stock: 0, onOrder: 0, stdDev: 0, leadDays: 4, coverDays: 10, z: 1.65 }).suggestQty).toBe(0);
    });
  });

  describe('roundToPack', () => {
    it('lifts to the minimum order, then whole packs', () => {
      expect(roundToPack(5, 12, 30)).toBe(36);
      expect(roundToPack(25, 12, null)).toBe(36);
      expect(roundToPack(24, 12, null)).toBe(24);
      expect(roundToPack(2.4, null, null)).toBe(3);
      expect(roundToPack(0, 12, 30)).toBe(0);
    });
  });

  describe('cover, stock-out and classes', () => {
    it('days of cover and stock-out date', () => {
      expect(daysOfCover(10, 4)).toBe(2.5);
      expect(daysOfCover(10, 0)).toBeNull();
      expect(stockOutDate('2026-11-09', 2.5)).toBe('2026-11-11');
      expect(stockOutDate('2026-11-09', null)).toBeNull();
    });
    it('percentile picks the value at the rank', () => {
      expect(percentile([1, 2, 3, 4, 5, 6, 7, 8, 9, 10], 0.8)).toBe(8);
      expect(percentile([], 0.5)).toBe(0);
    });
    const base = { ageDays: 300, fastAt: 5, slowAt: 0.5, deadDays: 90, overstockDays: 120 };
    it('dead: stock and no sale for the dead window', () => {
      expect(classify({ ...base, stock: 10, demand: 0, cover: null, daysSinceSale: null })).toBe('dead');
      expect(classify({ ...base, stock: 10, demand: 0.01, cover: 1000, daysSinceSale: 120 })).toBe('dead');
    });
    it('overstock, fast, slow, normal, new', () => {
      expect(classify({ ...base, stock: 500, demand: 1, cover: 500, daysSinceSale: 2 })).toBe('overstock');
      expect(classify({ ...base, stock: 50, demand: 6, cover: 8, daysSinceSale: 0 })).toBe('fast');
      expect(classify({ ...base, stock: 5, demand: 0.3, cover: 16, daysSinceSale: 9 })).toBe('slow');
      expect(classify({ ...base, stock: 20, demand: 2, cover: 10, daysSinceSale: 1 })).toBe('normal');
      expect(classify({ ...base, ageDays: 5, stock: 20, demand: 0, cover: null, daysSinceSale: null })).toBe('new');
    });
  });

  it('weeklyTotals sums whole weeks ending today', () => {
    const daily = Array.from({ length: 21 }, (_, i) => (i < 7 ? 1 : i < 14 ? 2 : 3));
    expect(weeklyTotals(daily, 3)).toEqual([7, 14, 21]);
    expect(weeklyTotals([1, 1], 2)).toEqual([0, 2]);
  });
});
