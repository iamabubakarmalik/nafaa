import { test } from 'node:test';
import assert from 'node:assert/strict';
import { currentSession, draftPrice, isbnValid, lateDays, lineRate, nextSession, rentalFine, rentalPrice, returnSettlement, setPrice } from './index';

test('isbn check digits', () => {
  assert.equal(isbnValid('978-0-306-40615-7'), true);
  assert.equal(isbnValid('9780306406158'), false);
  assert.equal(isbnValid('0-306-40615-2'), true);
  assert.equal(isbnValid('12345'), false);
});

test('school sessions start in spring', () => {
  assert.equal(currentSession(new Date(2026, 10, 3)), '2026-2027');
  assert.equal(currentSession(new Date(2026, 0, 15)), '2025-2026');
  assert.equal(nextSession('2026-2027'), '2027-2028');
});

test('school set price: fixed price or discounted lines', () => {
  assert.equal(draftPrice([{ quantity: 2, unitPrice: 500 }, { quantity: 1, unitPrice: 300, isOptional: true }], 10, null), 900);
  assert.equal(draftPrice([{ quantity: 1, unitPrice: 500 }], 10, 400), 400);
  assert.equal(lineRate({ total: 1000, quantity: 2 }, 10), 450);
  const items = [{ productId: 'a', isOptional: false, quantity: 1, total: 500 }, { productId: null, isOptional: false, quantity: 1, total: 300 }];
  assert.equal(setPrice(items, 700, 0), 500);
  assert.equal(setPrice([items[0]], 700, 0), 700);
});

test('rentals: late days, fine out of the deposit', () => {
  const now = Date.parse('2026-11-10T12:00:00Z');
  assert.equal(lateDays('2026-11-07T12:00:00Z', now), 3);
  assert.equal(lateDays('2026-11-12T12:00:00Z', now), 0);
  assert.equal(rentalFine('2026-11-07T12:00:00Z', 50, 2, now), 300);
  assert.deepEqual(returnSettlement(500, 150, false), { fine: 150, refund: 350, extra: 0 });
  assert.deepEqual(returnSettlement(100, 150, false), { fine: 150, refund: 0, extra: 50 });
  assert.deepEqual(returnSettlement(500, 150, true), { fine: 0, refund: 500, extra: 0 });
  assert.equal(rentalPrice(40, 2), 80);
});
