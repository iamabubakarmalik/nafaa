import { test } from 'node:test';
import assert from 'node:assert/strict';
import {
  agingBucket, balanceAfter, balanceState, checkDiscountCode, daysSince, directoryTest, discountAmount, isOverLimit, khataReminder,
  limitUsedPercent, loyaltyTier, nextTier, oldestUnpaid, paymentTooMuch, quickAmounts, salutationFor, statementText, statementTotals, toneFor,
  waLink, waNumber, type DiscountRule,
} from './index';

test('balance state ignores fractions of a paisa', () => {
  assert.equal(balanceState(0.004), 'clear');
  assert.equal(balanceState(500), 'owes');
  assert.equal(balanceState(-20), 'advance');
  assert.equal(balanceState(null), 'clear');
});

test('oldest unpaid: payments settle the oldest credit first', () => {
  const e = [
    { amount: 1000, createdAt: '2026-01-01T10:00:00Z' },
    { amount: 500, createdAt: '2026-01-10T10:00:00Z' },
    { amount: -1200, createdAt: '2026-01-15T10:00:00Z' },
  ];
  assert.equal(oldestUnpaid(e), '2026-01-10T10:00:00Z');
  assert.equal(oldestUnpaid([...e, { amount: -300, createdAt: '2026-02-01T10:00:00Z' }]), null);
});

test('oldest unpaid: an advance absorbs the next credit', () => {
  const e = [
    { amount: -400, createdAt: '2026-01-01T10:00:00Z' },
    { amount: 400, createdAt: '2026-01-05T10:00:00Z' },
    { amount: 100, createdAt: '2026-01-09T10:00:00Z' },
  ];
  assert.equal(oldestUnpaid(e), '2026-01-09T10:00:00Z');
});

test('ageing buckets follow the khata book', () => {
  assert.equal(agingBucket(0), 'd0');
  assert.equal(agingBucket(6), 'd0');
  assert.equal(agingBucket(7), 'd7');
  assert.equal(agingBucket(30), 'd30');
  assert.equal(agingBucket(90), 'd90');
  assert.equal(agingBucket(400), 'd90');
  assert.equal(agingBucket(null), null);
  const now = Date.parse('2026-03-10T12:00:00Z');
  assert.equal(daysSince('2026-03-01T12:00:00Z', now), 9);
  assert.equal(daysSince(null, now), null);
});

test('credit limit: 0 means no limit', () => {
  assert.equal(isOverLimit({ balance: 5000, creditLimit: 0 }), false);
  assert.equal(isOverLimit({ balance: 5000, creditLimit: 4000 }), true);
  assert.equal(limitUsedPercent({ balance: 1000, creditLimit: 4000 }), 25);
  assert.equal(limitUsedPercent({ balance: 9000, creditLimit: 4000 }), 100);
  assert.equal(limitUsedPercent({ balance: 9000, creditLimit: null }), null);
});

test('directory tabs', () => {
  const c = { balance: 100, creditLimit: 50, isVip: true };
  assert.deepEqual(
    (['all', 'vip', 'khata', 'advance', 'overLimit', 'clear'] as const).map((t) => directoryTest[t](c)),
    [true, true, true, false, true, false],
  );
});

test('payment bounds and balance after', () => {
  assert.equal(balanceAfter(1000, 400, 'payment'), 600);
  assert.equal(balanceAfter(1000, 400, 'udhaar'), 1400);
  assert.equal(paymentTooMuch(1000, 1000), false);
  assert.equal(paymentTooMuch(1000, 1000.5), true);
  assert.equal(paymentTooMuch(0, 10), true);
  assert.deepEqual(quickAmounts(1000, 'payment'), [1000, 500]);
  assert.deepEqual(quickAmounts(0, 'udhaar'), [500, 1000, 2000, 5000, 10000]);
});

test('statement totals', () => {
  const t = statementTotals([
    { amount: 1000, createdAt: 'a', type: 'SALE_CREDIT' },
    { amount: 200, createdAt: 'b', type: 'OPENING_BALANCE' },
    { amount: -500, createdAt: 'c', type: 'PAYMENT_RECEIVED' },
    { amount: -100, createdAt: 'd', type: 'REFUND' },
  ], 600);
  assert.deepEqual(t, { taken: 1200, paid: 500, reduced: 100, balance: 600 });
});

test('reminder follows tone and language', () => {
  assert.equal(toneFor(3), 'polite');
  assert.equal(toneFor(10), 'firm');
  assert.equal(toneFor(45), 'final');
  const c = { name: 'Ali Raza', gender: 'MALE' as const, amount: 'Rs 1,500', dueDays: 12 };
  const roman = khataReminder(c, 'Noor Store', 'roman');
  assert.match(roman, /Ali Raza bhai/);
  assert.match(roman, /\*Rs 1,500\*/);
  assert.match(roman, /12 din/);
  const en = khataReminder(c, 'Noor Store', 'en');
  assert.match(en, /Hello Ali Raza,/);
  assert.doesNotMatch(en, /bhai/);
  assert.match(khataReminder(c, 'Noor Store', 'ur'), /Noor Store/);
  assert.equal(salutationFor('Ayesha Khan'), 'baji');
  assert.equal(salutationFor('Ali', 'FEMALE'), 'baji');
  assert.equal(salutationFor('Ali', null, 'none'), '');
});

test('statement text and links', () => {
  const text = statementText({ name: 'Ali', shop: 'Noor', balance: 'Rs 100', state: 'owes', taken: 'Rs 300', paid: 'Rs 200', lines: [{ date: '1 Jan', label: 'Payment', amount: '-Rs 200', balance: 'Rs 100' }] }, 'en');
  assert.match(text, /Balance due: Rs 100/);
  assert.equal(waNumber('0300-1234567'), '923001234567');
  assert.equal(waNumber('+92 300 1234567'), '923001234567');
  assert.equal(waNumber(''), null);
  assert.match(waLink('03001234567', 'hi there')!, /^https:\/\/wa\.me\/923001234567\?text=hi%20there$/);
});

test('loyalty levels', () => {
  assert.equal(loyaltyTier(50).id, 'starter');
  assert.equal(loyaltyTier(500).id, 'silver');
  assert.equal(loyaltyTier(9999).id, 'diamond');
  assert.deepEqual(nextTier(480)?.needed, 20);
  assert.equal(nextTier(6000), null);
});

const rule = (over: Partial<DiscountRule> = {}): DiscountRule => ({
  id: '1', code: 'EID20', type: 'PERCENTAGE', value: 20, minPurchase: 1000, maxDiscount: 500, usageLimit: null, usageCount: 0, isActive: true, ...over,
});

test('discount codes', () => {
  assert.equal(discountAmount(rule(), 1000), 200);
  assert.equal(discountAmount(rule(), 5000), 500);
  assert.equal(discountAmount(rule({ type: 'FIXED_AMOUNT', value: 700, maxDiscount: null }), 300), 300);
  const ok = checkDiscountCode([rule()], ' eid 20 ', 2000);
  assert.deepEqual(ok, { ok: true, discount: 400, finalAmount: 1600 });
  assert.deepEqual(checkDiscountCode([rule()], 'EID20', 500), { ok: false, problem: { code: 'minimum', minPurchase: 1000 } });
  assert.deepEqual(checkDiscountCode([rule()], 'NOPE', 2000), { ok: false, problem: { code: 'not_found' } });
  assert.deepEqual(checkDiscountCode([rule({ isActive: false })], 'EID20', 2000), { ok: false, problem: { code: 'not_found' } });
  assert.deepEqual(checkDiscountCode([rule({ usageLimit: 5, usageCount: 5 })], 'EID20', 2000), { ok: false, problem: { code: 'used_up' } });
  assert.deepEqual(checkDiscountCode([rule({ validUntil: '2026-01-01' })], 'EID20', 2000, null, Date.parse('2026-02-01')), { ok: false, problem: { code: 'ended' } });
  assert.deepEqual(checkDiscountCode([rule({ validFrom: '2026-03-01' })], 'EID20', 2000, null, Date.parse('2026-02-01')), { ok: false, problem: { code: 'not_started' } });
  assert.deepEqual(checkDiscountCode([rule({ shopIds: ['a'] })], 'EID20', 2000, 'b'), { ok: false, problem: { code: 'other_branch' } });
});
