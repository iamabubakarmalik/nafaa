import { addOrder, blankTally, budgetMoves, fatigueOf, finishTally, outcomeOf } from './marketing-math';

describe('marketing math', () => {
  it('judges spend on delivered orders', () => {
    const t = blankTally();
    t.spend = 10_000;
    addOrder(t, { outcome: 'DELIVERED', total: 5000, sale: 4800, profit: 1500, newCustomer: true });
    addOrder(t, { outcome: 'DELIVERED', total: 5000, profit: 1600 });
    addOrder(t, { outcome: 'RETURNED', total: 5000, profit: -400 });
    addOrder(t, { outcome: 'OPEN', total: 5000, profit: null });
    addOrder(t, { outcome: 'CANCELLED', total: 3000 });
    const f = finishTally(t, true);
    expect(f.placed).toBe(5);
    expect(f.delivered).toBe(2);
    expect(f.deliveredSales).toBe(9800);
    expect(f.roas).toBe(0.98);
    expect(f.costPerOrder).toBe(5000);
    expect(f.cac).toBe(10_000);
    expect(f.deliveryRate).toBe(66.7);
    expect(f.profitBeforeAds).toBe(2700);
    expect(f.profitAfterAds).toBe(-7300);
    expect(finishTally(t, false).profitAfterAds).toBeNull();
  });

  it('maps order statuses to outcomes', () => {
    expect(outcomeOf('DELIVERED')).toBe('DELIVERED');
    expect(outcomeOf('REJECTED')).toBe('CANCELLED');
    expect(outcomeOf('OUT_FOR_DELIVERY')).toBe('OPEN');
  });

  it('flags cost per order rising three days in a row', () => {
    const up = [
      { day: '2026-11-01', spend: 1000, orders: 10 },
      { day: '2026-11-02', spend: 1000, orders: 8 },
      { day: '2026-11-03', spend: 1000, orders: 5 },
      { day: '2026-11-04', spend: 1000, orders: 2 },
    ];
    expect(fatigueOf(up)).toMatchObject({ from: 100, to: 500 });
    expect(fatigueOf(up.slice(1))).toBeNull();
    expect(fatigueOf([...up.slice(0, 3), { day: '2026-11-04', spend: 1000, orders: 9 }])).toBeNull();
    // A day with spend and no order counts its whole spend.
    expect(fatigueOf([...up.slice(0, 3), { day: '2026-11-04', spend: 300, orders: 0 }])).toMatchObject({ to: 300 });
  });

  it('suggests moving spend from ROAS under 1 to the best campaign', () => {
    const moves = budgetMoves([
      { key: 'a', name: 'Weak', spend: 7000, roas: 0.6, spendDays: 7, closed: 8 },
      { key: 'b', name: 'Strong', spend: 5000, roas: 3.2, spendDays: 5, closed: 12 },
      { key: 'c', name: 'Okay', spend: 5000, roas: 2.1, spendDays: 5, closed: 9 },
      { key: 'd', name: 'Too new', spend: 500, roas: 0.2, spendDays: 1, closed: 1 },
    ]);
    expect(moves).toEqual([{ kind: 'MOVE', from: { key: 'a', name: 'Weak', roas: 0.6 }, to: { key: 'b', name: 'Strong', roas: 3.2 }, dailyAmount: 1000 }]);
    expect(budgetMoves([{ key: 'a', name: 'Weak', spend: 4000, roas: 0, spendDays: 4, closed: 0 }])[0]).toMatchObject({ kind: 'CUT', to: null });
  });
});
