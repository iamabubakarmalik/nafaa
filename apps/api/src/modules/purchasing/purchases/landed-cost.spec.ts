import { allocate, cleanLandedCost, perUnit, recostRemaining } from './landed-cost';

const lines = [
  { id: 'a', value: 60_000, qty: 100, weightKg: 50 },
  { id: 'b', value: 30_000, qty: 300, weightKg: 150 },
  { id: 'c', value: 10_000, qty: 100, weightKg: null },
];

describe('landed cost', () => {
  it('spreads by value', () => {
    const m = allocate(lines, 10_000, 'VALUE');
    expect(m.get('a')).toBe(6000);
    expect(m.get('b')).toBe(3000);
    expect(m.get('c')).toBe(1000);
  });

  it('spreads by quantity', () => {
    const m = allocate(lines, 10_000, 'QTY');
    expect(m.get('a')).toBe(2000);
    expect(m.get('b')).toBe(6000);
    expect(m.get('c')).toBe(2000);
  });

  it('spreads by weight; a line without weight takes nothing', () => {
    const m = allocate(lines, 10_000, 'WEIGHT');
    expect(m.get('a')).toBe(2500);
    expect(m.get('b')).toBe(7500);
    expect(m.get('c')).toBe(0);
  });

  it('falls back to value when no line has a weight', () => {
    const m = allocate(lines.map((l) => ({ ...l, weightKg: null })), 100, 'WEIGHT');
    expect(m.get('a')).toBe(60);
  });

  it('parts always add up to the total to the paisa', () => {
    const m = allocate([{ id: 'x', value: 1, qty: 1, weightKg: null }, { id: 'y', value: 1, qty: 1, weightKg: null }, { id: 'z', value: 1, qty: 1, weightKg: null }], 100, 'VALUE');
    const sum = [...m.values()].reduce((s, v) => s + v, 0);
    expect(Math.round(sum * 100)).toBe(10_000);
  });

  it('turns a foreign amount into rupees', () => {
    expect(cleanLandedCost({ kind: 'FREIGHT', currency: 'USD', foreignAmount: 250, exchangeRate: 280.5 }))
      .toMatchObject({ kind: 'FREIGHT', amount: 70_125, currency: 'USD', foreignAmount: 250, exchangeRate: 280.5 });
    expect(cleanLandedCost({ kind: 'CUSTOMS', amount: '12,000'.replace(',', '') })).toMatchObject({ amount: 12_000, currency: null });
    expect(() => cleanLandedCost({ kind: 'FREIGHT', currency: 'CNY', foreignAmount: 100 })).toThrow('CNY');
    expect(() => cleanLandedCost({ kind: 'FREIGHT', amount: 0 })).toThrow();
  });

  it('gives the per-unit extra cost', () => {
    expect(perUnit(6000, 100)).toBe(60);
    expect(perUnit(100, 0)).toBe(0);
  });

  it('re-costs only stock still on hand after receipt', () => {
    // 100 bought at 600 each; 40 sold; stock now 60 (all from this purchase) at average 600.
    const r = recostRemaining({ share: 6000, baseQty: 100, receivedQty: 100, keptQty: 100, stockNow: 60, avgCost: 600 });
    expect(r.unit).toBe(60);
    expect(r.added).toBe(3600);
    expect(r.newAvg).toBe(660);
    expect(r.soldShare).toBe(2400);
  });

  it('leaves units not yet received to take their share on arrival', () => {
    const r = recostRemaining({ share: 6000, baseQty: 100, receivedQty: 50, keptQty: 50, stockNow: 50, avgCost: 600 });
    expect(r.added).toBe(3000);
    expect(r.soldShare).toBe(0);
  });

  it('never re-costs more units than the shop has', () => {
    const r = recostRemaining({ share: 1000, baseQty: 10, receivedQty: 10, keptQty: 10, stockNow: 0, avgCost: 500 });
    expect(r.added).toBe(0);
    expect(r.newAvg).toBe(500);
    expect(r.soldShare).toBe(1000);
  });
});
