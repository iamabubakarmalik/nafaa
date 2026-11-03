import { test } from 'node:test';
import assert from 'node:assert/strict';
import { balanceDue, daysRemaining, endAfterFreeze, freezeLeft, membershipState, planEndKey, renewalStartKey } from './index';

test('a 30-day plan from the 1st ends on the 30th', () => {
  assert.equal(planEndKey('2026-11-01', 30), '2026-11-30');
  assert.equal(planEndKey('2026-11-01', 1), '2026-11-01');
});

test('early renewal starts the day after the running period ends', () => {
  assert.equal(renewalStartKey('2026-11-10', '2026-11-03', true), '2026-11-11');
  assert.equal(renewalStartKey('2026-11-30', '2026-11-30', true), '2026-12-01');
});

test('an ended membership renews from today', () => {
  assert.equal(renewalStartKey('2026-10-20', '2026-11-03', false), '2026-11-03');
  assert.equal(renewalStartKey('2026-10-20', '2026-11-03', true), '2026-11-03');
});

test('days remaining, freeze and balance', () => {
  assert.equal(daysRemaining('2026-11-05', '2026-11-03'), 3);
  assert.equal(daysRemaining('2026-11-01', '2026-11-03'), 0);
  assert.equal(endAfterFreeze('2026-11-30', 7), '2026-12-07');
  assert.equal(freezeLeft(30, 12), 18);
  assert.equal(balanceDue({ totalPrice: 5000, paidAmount: 3500.5 }), 1499.5);
});

test('member state', () => {
  const m = (status: string, startDate: string, endDate: string) => ({ status, startDate, endDate });
  assert.equal(membershipState(null, '2026-11-03'), 'NONE');
  assert.equal(membershipState(m('ACTIVE', '2026-10-01', '2026-10-30'), '2026-11-03'), 'EXPIRED');
  assert.equal(membershipState(m('ACTIVE', '2026-10-20', '2026-11-08'), '2026-11-03'), 'EXPIRING');
  assert.equal(membershipState(m('ACTIVE', '2026-10-20', '2026-12-20'), '2026-11-03'), 'ACTIVE');
  assert.equal(membershipState(m('FROZEN', '2026-10-20', '2026-12-20'), '2026-11-03'), 'FROZEN');
  assert.equal(membershipState(m('ACTIVE', '2026-11-10', '2026-12-10'), '2026-11-03'), 'UPCOMING');
});
