import { test } from 'node:test';
import assert from 'node:assert/strict';
import { daysFromPickup, heldAmount, isOpenBooking, paidPercent, paymentProblem, pickupState, shareAmounts, udhaarAtPickup } from './index';

const DAY = 86_400_000;
const today = Date.parse('2026-05-10T00:00:00Z');

test('pickup state by business day', () => {
  const at = (n: number) => new Date(today + n * DAY + 3600_000).toISOString();
  const open = (n: number) => pickupState({ status: 'PENDING', expectedPickupAt: at(n) }, today);
  assert.equal(open(-1), 'overdue');
  assert.equal(open(0), 'today');
  assert.equal(open(1), 'tomorrow');
  assert.equal(open(4), 'soon');
  assert.equal(open(9), 'later');
  assert.equal(pickupState({ status: 'CONVERTED', expectedPickupAt: at(-3) }, today), 'none');
  assert.equal(pickupState({ status: 'PENDING', expectedPickupAt: null }, today), 'none');
  assert.equal(daysFromPickup(today - 3 * DAY, today), 3);
});

test('booking money', () => {
  assert.equal(isOpenBooking({ status: 'READY_FOR_PICKUP' }), true);
  assert.equal(isOpenBooking({ status: 'CANCELLED' }), false);
  assert.equal(paidPercent({ total: 1000, totalPaid: 250 }), 25);
  assert.equal(paidPercent({ total: 0, totalPaid: 0 }), 0);
  assert.equal(heldAmount({ totalPaid: 500, totalRefunded: 600 }), 0);
  assert.equal(paymentProblem(300, 0), 'empty');
  assert.equal(paymentProblem(300, 301), 'too_much');
  assert.equal(paymentProblem(300, 300), null);
  assert.equal(udhaarAtPickup(1000, 400), 600);
  assert.equal(udhaarAtPickup(1000, 1000), 0);
  assert.deepEqual(shareAmounts(1000), [1000, 500, 250]);
  assert.deepEqual(shareAmounts(1), [1]);
});

import { bookingMessage } from './index';

test('booking message follows state and language', () => {
  const base = { customer: 'Ali', shop: 'Noor', number: 'BK-1', status: 'ADVANCE_PAID', pickupState: 'tomorrow' as const, pickupDay: 'Tue, 4 Nov', items: ['Suit × 2'], total: 'Rs 5,000', paid: 'Rs 2,000', due: 'Rs 3,000' };
  assert.match(bookingMessage(base, 'en'), /due for pickup tomorrow/);
  assert.match(bookingMessage({ ...base, status: 'READY_FOR_PICKUP' }, 'en'), /order is ready/);
  assert.match(bookingMessage({ ...base, pickupState: 'overdue' }, 'roman'), /pickup Tue, 4 Nov tha/);
  assert.match(bookingMessage(base, 'ur'), /BK-1/);
  assert.ok(!bookingMessage({ ...base, pickupDay: undefined }, 'en').includes('Pickup:'));
});
