import { allocateTierRows, foldTierSplit, type TierSplitRow } from './price-tier-split.helper';

const whole = (tier: string | null, bills: number, net: number, cost: number, qty = 1, gross = net): TierSplitRow =>
  ({ tier, saleId: null, bills, qty, gross, net, cost });

const part = (saleId: string, tier: string, line: { net: number; cost: number; weight: number; qty?: number; gross?: number },
  bill: { net: number; cost: number; gross?: number }): TierSplitRow => ({
  tier, saleId, bills: 1, qty: line.qty ?? 1, gross: line.gross ?? line.net, net: line.net, cost: line.cost, weight: line.weight,
  billGross: bill.gross ?? bill.net, billNet: bill.net, billCost: bill.cost,
});

describe('price tier split', () => {
  it('counts null and unknown tiers as retail', () => {
    const s = foldTierSplit([whole(null, 3, 300, 200), whole('WHATEVER', 1, 100, 50)]);
    expect(s.mixed).toBe(false);
    expect(s.tiers.map((t) => t.tier)).toEqual(['RETAIL', 'WHOLESALE', 'CREDIT']);
    expect(s.tiers[0]).toMatchObject({ bills: 4, net: 400, cost: 250, profit: 150, margin: 37.5 });
    expect(s.tiers[1]).toMatchObject({ bills: 0, net: 0, profit: 0, margin: 0 });
  });

  it('keeps single-tier bills whole and flags mixed when a non-retail tier sold', () => {
    const s = foldTierSplit([whole('RETAIL', 2, 500, 300), whole('WHOLESALE', 1, 900, 800, 10)]);
    expect(s.mixed).toBe(true);
    expect(s.tiers[1]).toMatchObject({ bills: 1, qty: 10, net: 900, cost: 800, profit: 100 });
  });

  it('shares what a mixed bill holds beyond its lines by line totals', () => {
    // Bill: retail line 100, wholesale line 300 (after bill discount), plus a
    // service charge of 40 and 20 of cost kept on the bill only.
    const bill = { net: 440, cost: 220 };
    const sums = allocateTierRows([
      part('a', 'RETAIL', { net: 100, cost: 50, weight: 100 }, bill),
      part('a', 'WHOLESALE', { net: 300, cost: 150, weight: 300 }, bill),
    ]);
    expect(sums.RETAIL.net).toBeCloseTo(110);
    expect(sums.WHOLESALE.net).toBeCloseTo(330);
    expect(sums.RETAIL.cost).toBeCloseTo(55);
    expect(sums.WHOLESALE.cost).toBeCloseTo(165);
    expect(sums.RETAIL.bills).toBe(1);
    expect(sums.WHOLESALE.bills).toBe(1);
    expect(sums.RETAIL.net + sums.WHOLESALE.net).toBeCloseTo(bill.net);
  });

  it('shares evenly when the lines of a mixed bill total zero', () => {
    const bill = { net: 10, cost: 0 };
    const sums = allocateTierRows([
      part('b', 'RETAIL', { net: 0, cost: 0, weight: 0 }, bill),
      part('b', 'CREDIT', { net: 0, cost: 0, weight: 0 }, bill),
    ]);
    expect(sums.RETAIL.net).toBeCloseTo(5);
    expect(sums.CREDIT.net).toBeCloseTo(5);
  });

  it('adds up to the bill after a return that is not tied to a line', () => {
    const bill = { net: 350, cost: 100, gross: 400 };
    const sums = allocateTierRows([
      part('c', 'RETAIL', { net: 100, cost: 25, weight: 100, gross: 100 }, bill),
      part('c', 'WHOLESALE', { net: 300, cost: 75, weight: 300, gross: 300 }, bill),
    ]);
    expect(sums.RETAIL.net + sums.WHOLESALE.net).toBeCloseTo(350);
    expect(sums.RETAIL.gross + sums.WHOLESALE.gross).toBeCloseTo(400);
    expect(sums.RETAIL.net).toBeCloseTo(87.5);
  });

  it('closes a paisa rounding gap against the headline on the largest tier', () => {
    const bill = { net: 100, cost: 0 };
    const rows = [
      part('d', 'RETAIL', { net: 33.333, cost: 0, weight: 1 }, bill),
      part('d', 'WHOLESALE', { net: 33.333, cost: 0, weight: 1 }, bill),
      part('d', 'CREDIT', { net: 33.334, cost: 0, weight: 1 }, bill),
      whole('RETAIL', 1, 0.004, 0),
    ];
    const s = foldTierSplit(rows, { net: 100.01 });
    expect(r(s.tiers.reduce((a, t) => a + t.net, 0))).toBe(100.01);
  });

  it('leaves a large gap alone instead of hiding it', () => {
    const s = foldTierSplit([whole('RETAIL', 1, 100, 0)], { net: 150 });
    expect(s.tiers[0].net).toBe(100);
  });
});

const r = (v: number) => Math.round(v * 100) / 100;
