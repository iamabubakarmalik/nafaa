import { test } from 'node:test';
import assert from 'node:assert/strict';
import { amountForKg, autoWaste, bumpRate, checkoutSplit, cutsTooHeavy, deliveriesPerMonth, gramsToKg, isLateOrder, kgForAmount, mandiTotal, nextOrderStep, orderTotals, planMonthly, sharesOk, weighedTotal, yieldPct } from './index';

test('weight and amount convert both ways to the gram', () => {
  assert.equal(amountForKg(1.25, 800), 1000);
  assert.equal(kgForAmount(500, 800), 0.625);
  assert.equal(kgForAmount(100, 0), 0);
  assert.equal(kgForAmount(100, 300), 0.333);
  assert.equal(gramsToKg(250), 0.25);
  assert.equal(bumpRate(520, 5), 546);
  assert.equal(bumpRate(520, -10), 468);
});

test('cutting yield and waste', () => {
  assert.equal(yieldPct(8.4, 10), 84);
  assert.equal(yieldPct(5, 0), null);
  assert.equal(autoWaste(10, 8.4), 1.6);
  assert.equal(autoWaste(10, 11), 0);
  assert.equal(cutsTooHeavy(10, 9.5, 0.6), true);
  assert.equal(cutsTooHeavy(10, 9.5, 0.5), false);
});

test('order money and the weighed total', () => {
  const t = orderTotals([{ kg: 2.5, rate: 1200 }, { kg: 1, rate: 800 }], { deliveryCharges: 200, discount: 100 });
  assert.deepEqual(t, { subtotal: 3800, total: 3900 });
  assert.equal(orderTotals([{ kg: 1, rate: 100 }], { discount: 500 }).total, 0);
  assert.equal(weighedTotal([{ requestedKg: 2, actualKg: 2.2, pricePerKg: 1000 }, { requestedKg: 1, pricePerKg: 500 }], 100), 2800);
});

test('order steps and lateness', () => {
  assert.deepEqual(nextOrderStep('CONFIRMED', false), { status: 'CUTTING', step: 'cutting' });
  assert.equal(nextOrderStep('READY', false), null);
  assert.equal(nextOrderStep('READY', true)?.status, 'OUT_FOR_DELIVERY');
  assert.equal(nextOrderStep('DELIVERED', true), null);
  const now = Date.parse('2026-11-03T12:00:00Z');
  assert.equal(isLateOrder({ status: 'CUTTING', neededBy: '2026-11-03T09:00:00Z' }, now), true);
  assert.equal(isLateOrder({ status: 'CUTTING', neededBy: '2026-11-03T11:30:00Z' }, now), false);
  assert.equal(isLateOrder({ status: 'DELIVERED', neededBy: '2026-11-01T09:00:00Z' }, now), false);
});

test('hand-over split leaves the rest on khata', () => {
  assert.deepEqual(checkoutSplit(5000, 1000, 0, [2000]), { due: 4000, paid: 2000, credit: 2000, over: false });
  assert.equal(checkoutSplit(5000, 1000, 500, [3600]).over, true);
});

test('shares, plans and mandi', () => {
  assert.equal(sharesOk('BEEF', 7), true);
  assert.equal(sharesOk('BEEF', 8), false);
  assert.equal(sharesOk('MUTTON', 0), true);
  assert.equal(deliveriesPerMonth('ALTERNATE_DAY'), 15);
  assert.equal(deliveriesPerMonth('CUSTOM', [1, 3, 5]), 13);
  assert.deepEqual(planMonthly([{ kg: 2, rate: 500 }], 'WEEKLY', 10), { kg: 8, estimate: 3600 });
  assert.equal(mandiTotal(120, 260, 500), 31700);
});
