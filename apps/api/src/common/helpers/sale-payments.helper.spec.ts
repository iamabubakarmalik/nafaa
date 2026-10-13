import { splitTender } from './sale-payments.helper';

describe('splitTender', () => {
  it('keeps one row of paid − change when no parts are sent', () => {
    const t = splitTender(900, { method: 'CASH', paidAmount: 1000 });
    expect(t).toMatchObject({ paidAmount: 1000, changeAmount: 100, mainMethod: 'CASH' });
    expect(t.rows).toEqual([{ method: 'CASH', amount: 900 }]);
  });

  it('stores no row for a full udhaar bill', () => {
    expect(splitTender(500, { method: 'CASH', paidAmount: 0 }).rows).toEqual([]);
  });

  it('takes change off the cash part of a split bill', () => {
    const t = splitTender(3500, {
      method: 'CASH', paidAmount: 0,
      parts: [{ method: 'CASH', amount: 2500 }, { method: 'CARD', amount: 1500 }],
    });
    expect(t.paidAmount).toBe(4000);
    expect(t.changeAmount).toBe(500);
    expect(t.rows.map((r) => [r.method, r.amount])).toEqual([['CASH', 2000], ['CARD', 1500]]);
    expect(t.mainMethod).toBe('CASH');
  });

  it('refuses change on card, wallet or trade-in', () => {
    expect(() => splitTender(1000, { method: 'CASH', paidAmount: 0, parts: [{ method: 'CARD', amount: 1200 }] })).toThrow();
  });

  it('counts a trade-in as paid but never as the main method when money was paid', () => {
    const t = splitTender(100000, {
      method: 'CASH', paidAmount: 0,
      parts: [{ method: 'TRADE_IN', amount: 70000, note: 'Purana sona' }, { method: 'JAZZCASH', amount: 30000 }],
    });
    expect(t.changeAmount).toBe(0);
    expect(t.mainMethod).toBe('JAZZCASH');
    expect(t.rows).toHaveLength(2);
  });

  it('uses TRADE_IN as the main method only when nothing else was paid', () => {
    const t = splitTender(5000, { method: 'CASH', paidAmount: 0, parts: [{ method: 'TRADE_IN', amount: 5000 }] });
    expect(t.mainMethod).toBe('TRADE_IN');
  });
});
