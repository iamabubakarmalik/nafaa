import { test } from 'node:test';
import assert from 'node:assert/strict';
import { discountIssue, doctorShare, feeDue, feePayBody, isLate, queueOrder, visitNext, visitTotal } from './index';

test('visit fee adds charges, takes discount and never goes negative', () => {
  assert.equal(visitTotal(1500, 300, 200), 1600);
  assert.equal(visitTotal(500, 0, 900), 0);
  assert.equal(discountIssue(1000, 200, 1300), 'too_high');
  assert.equal(discountIssue(1000, 200, 1200), '');
  assert.equal(discountIssue(1000, 0, -1), 'negative');
});

test('fee still to collect', () => {
  assert.equal(feeDue({ total: 1600, paidAmount: 600 }), 1000);
  assert.equal(feeDue({ total: 1600, paidAmount: 2000 }), 0);
});

test('fee payment: full, part (rest on khata) and all on khata', () => {
  assert.deepEqual(feePayBody(1000, 1000, 'CASH'), { amount: 1000, paymentMethod: 'CASH' });
  assert.deepEqual(feePayBody(1000, 400, 'CASH'), { amount: 1000, paid: 400, paymentMethod: 'CASH' });
  assert.deepEqual(feePayBody(1000, 0, 'CASH'), { amount: 1000, onCredit: true });
  assert.deepEqual(feePayBody(1000, 5000, 'CASH'), { amount: 1000, paymentMethod: 'CASH' });
});

test('visit steps', () => {
  assert.equal(visitNext('CONFIRMED'), 'arrive');
  assert.equal(visitNext('ARRIVED'), 'call');
  assert.equal(visitNext('IN_CONSULTATION'), 'finish');
  assert.equal(visitNext('COMPLETED'), null);
});

test('queue: emergency, in room, waiting, then slot time; finished visits drop out', () => {
  const q = queueOrder([
    { status: 'CONFIRMED', scheduledStart: '2026-11-03T10:00:00Z' },
    { status: 'ARRIVED', scheduledStart: '2026-11-03T09:00:00Z' },
    { status: 'IN_CONSULTATION', scheduledStart: '2026-11-03T08:00:00Z' },
    { status: 'ARRIVED', isEmergency: true, scheduledStart: '2026-11-03T11:00:00Z' },
    { status: 'COMPLETED', scheduledStart: '2026-11-03T07:00:00Z' },
  ]);
  assert.deepEqual(q.map((x) => x.status), ['ARRIVED', 'IN_CONSULTATION', 'ARRIVED', 'CONFIRMED']);
  assert.equal(q[0].isEmergency, true);
});

test('late booking', () => {
  const now = Date.parse('2026-11-03T10:20:00Z');
  assert.equal(isLate({ status: 'CONFIRMED', scheduledStart: '2026-11-03T10:00:00Z' }, now), true);
  assert.equal(isLate({ status: 'CONFIRMED', scheduledStart: '2026-11-03T10:10:00Z' }, now), false);
  assert.equal(isLate({ status: 'ARRIVED', scheduledStart: '2026-11-03T09:00:00Z' }, now), false);
});

test('doctor share', () => {
  assert.equal(doctorShare({ type: 'PERCENTAGE', pct: 60, fees: 10000, labFees: 2000, seen: 10 }), 7200);
  assert.equal(doctorShare({ type: 'FIXED', pct: 300, fees: 10000, seen: 10 }), 3000);
});
