import { test } from 'node:test';
import assert from 'node:assert/strict';
import { animalProfit, categoryGroup, daysInShop, expiryDays, groomingDue, groomingNext, groomingTotal, nextDueDate, slotLabel } from './index';

test('grooming total never goes negative and due follows advance', () => {
  assert.equal(groomingTotal(1500, 300, 200), 1600);
  assert.equal(groomingTotal(100, 0, 500), 0);
  assert.equal(groomingDue({ totalFee: 1600, paidAmount: 500 }), 1100);
  assert.equal(groomingDue({ totalFee: 1600, paidAmount: 2000 }), 0);
});

test('grooming steps follow the visit', () => {
  assert.equal(groomingNext('CONFIRMED'), 'start');
  assert.equal(groomingNext('IN_PROGRESS'), 'ready');
  assert.equal(groomingNext('READY_FOR_PICKUP'), 'pickup');
  assert.equal(groomingNext('COMPLETED'), null);
});

test('animal profit uses the sold price once sold', () => {
  assert.equal(animalProfit({ status: 'AVAILABLE', askingPrice: 30000, costPrice: 20000 }), 10000);
  assert.equal(animalProfit({ status: 'SOLD', askingPrice: 30000, soldPrice: 27000, costPrice: 20000 }), 7000);
  assert.equal(animalProfit({ status: 'SOLD', askingPrice: 30000, soldPrice: 27000 }), null);
});

test('days and dates', () => {
  assert.equal(daysInShop('2026-10-01', '2026-11-03'), 33);
  assert.equal(expiryDays('2026-11-01', '2026-11-03'), -2);
  assert.equal(nextDueDate([{ nextDueDate: '2026-12-01' }, { nextDueDate: null }, { nextDueDate: '2026-11-20' }]), '2026-11-20');
  assert.equal(slotLabel('13:30'), '1:30 PM');
  assert.equal(slotLabel('09:00'), '9:00 AM');
});

test('category groups feed the counter filters', () => {
  assert.equal(categoryGroup('DOG_FOOD_DRY'), 'food');
  assert.equal(categoryGroup('VET_VACCINE'), 'medicine');
  assert.equal(categoryGroup('AQUARIUM_TANK'), 'aquarium');
  assert.equal(categoryGroup('CAT_LITTER'), 'care');
  assert.equal(categoryGroup('DOG_LEASH_COLLAR'), 'gear');
});
