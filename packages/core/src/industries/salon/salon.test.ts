import { test } from 'node:test';
import assert from 'node:assert/strict';
import { appointmentNext, commissionOf, daysLeft, membershipState, salonBillTotals } from './index';

test('membership discount applies to services, package sessions are free', () => {
  const t = salonBillTotals({ services: [{ list: 2000, price: null, fromPackage: false }, { list: 1500, price: null, fromPackage: true }], memberPct: 10 });
  assert.equal(t.services, 1800);
  assert.equal(t.memberSaved, 200);
  assert.equal(t.packageCovered, 1500);
  assert.equal(t.total, 1800);
});

test('agreed price beats member price; tip adds, discount and voucher take off, advance reduces due', () => {
  const t = salonBillTotals({ services: [{ list: 3000, price: 2500, fromPackage: false }], memberPct: 20, tip: 200, discount: 100, voucher: 400, advance: 1000 });
  assert.equal(t.total, 2200);
  assert.equal(t.due, 1200);
});

test('total never goes below zero', () => {
  assert.equal(salonBillTotals({ services: [{ list: 500, price: null, fromPackage: false }], discount: 900 }).total, 0);
});

test('commission by rule', () => {
  assert.equal(commissionOf(2000, { type: 'PERCENTAGE', pct: 15 }), 300);
  assert.equal(commissionOf(2000, { type: 'FIXED_PER_SERVICE', fixed: 150 }), 150);
  assert.equal(commissionOf(2000, { type: 'HYBRID', pct: 10, fixed: 50 }), 250);
  assert.equal(commissionOf(2000, { type: 'NONE' }), 0);
});

test('membership state and days', () => {
  assert.equal(daysLeft('2026-11-20', '2026-11-03'), 17);
  assert.equal(membershipState('2026-11-10', '2026-11-03'), 'expiring');
  assert.equal(membershipState('2026-12-31', '2026-11-03'), 'active');
  assert.equal(membershipState('2026-11-01', '2026-11-03'), 'expired');
});

test('appointment steps', () => {
  assert.equal(appointmentNext('CONFIRMED'), 'arrive');
  assert.equal(appointmentNext('ARRIVED'), 'start');
  assert.equal(appointmentNext('IN_PROGRESS'), 'bill');
  assert.equal(appointmentNext('COMPLETED'), null);
});
