import { test } from 'node:test';
import assert from 'node:assert/strict';
import { addDays, advanceFor, daysTo, deliveryCharges, dueDate, floorCharge, paidPercent } from './index';

test('days to a date count whole days and go negative when late', () => {
  assert.equal(daysTo('2026-11-05T09:00:00', '2026-11-03'), 2);
  assert.equal(daysTo('2026-11-01T09:00:00', '2026-11-03'), -2);
  assert.equal(daysTo(null), null);
  assert.equal(addDays('2026-11-28', 5), '2026-12-03');
  assert.equal(dueDate('2026-11-03', 21), '2026-11-24');
});

test('stairs are charged by floor only without a lift', () => {
  assert.equal(floorCharge(3, false), 1500);
  assert.equal(floorCharge(3, true), 0);
  assert.equal(floorCharge(0, false), 0);
});

test('delivery charges add up with the staircase fallback', () => {
  assert.equal(deliveryCharges({ delivery: 2000, loading: 300, unloading: 300, assembly: 1000, floor: 2, hasLift: false }), 4600);
  assert.equal(deliveryCharges({ delivery: 2000, floorCharge: 0, floor: 2 }), 2000);
});

test('order money helpers', () => {
  assert.equal(paidPercent(40000, 10000), 25);
  assert.equal(paidPercent(0, 100), 0);
  assert.equal(paidPercent(100, 500), 100);
  assert.equal(advanceFor(45000, 40), 18000);
});
