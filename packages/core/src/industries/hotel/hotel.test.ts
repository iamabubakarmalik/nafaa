import { test } from 'node:test';
import assert from 'node:assert/strict';
import { bookingNext, extraNights, folioTotals, nightRates, nightsBetween, stayTotal } from './index';

test('nights between days', () => {
  assert.equal(nightsBetween('2026-11-03', '2026-11-06'), 3);
  assert.equal(nightsBetween('2026-12-30', '2027-01-02'), 3);
  assert.equal(nightsBetween('2026-11-03', '2026-11-03'), 0);
});

test('weekend nights (Fri, Sat) use the weekend rate; the room price replaces the base', () => {
  // 2026-11-05 is a Thursday: Thu, Fri, Sat nights
  const r = nightRates({ basePrice: 8000, weekendPrice: 10000 }, '2026-11-05', 3);
  assert.deepEqual(r.map((x) => x.rate), [8000, 10000, 10000]);
  assert.equal(stayTotal(r), 28000);
  assert.deepEqual(nightRates({ basePrice: 8000, weekendPrice: 10000 }, '2026-11-05', 2, 9000).map((x) => x.rate), [9000, 10000]);
});

test('extra beds are charged per night', () => {
  assert.equal(stayTotal([{ rate: 5000 }, { rate: 5000 }], 1, 1000), 12000);
});

test('folio: voided charges are left out; balance and overpaid', () => {
  const f = folioTotals({ roomAmount: 24000, taxAmount: 1200, discount: 500, charges: [{ amount: 1500 }, { amount: 800, isVoid: true }, { amount: 700 }], paid: 10000 });
  assert.equal(f.folio, 2200);
  assert.equal(f.total, 26900);
  assert.equal(f.balance, 16900);
  assert.equal(folioTotals({ roomAmount: 1000, paid: 1500 }).overpaid, 500);
});

test('steps and extra nights', () => {
  assert.equal(bookingNext('CONFIRMED'), 'check-in');
  assert.equal(bookingNext('CHECKED_IN'), 'check-out');
  assert.equal(bookingNext('CHECKED_OUT'), null);
  assert.equal(extraNights(2, 4), 2);
  assert.equal(extraNights(3, 2), 0);
});
