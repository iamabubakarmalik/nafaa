import { test } from 'node:test';
import assert from 'node:assert/strict';
import { counterRate, dailyLiters, fatBonus, isMilkType, previousMonth, profileUnit, slotForHour, slotRate, supplyTotal } from './index';

test('fat above the base earns the bonus per litre', () => {
  assert.equal(fatBonus(10, 6, 5), 0);
  assert.equal(fatBonus(10, 7.5, 4), 60);
  assert.equal(fatBonus(10, null, 4), 0);
  assert.equal(supplyTotal({ quantity: 10, rate: 100, fat: 7, bonusRate: 2, adjust: -50 }), 970);
});

test('rejected milk is worth nothing', () => {
  assert.equal(supplyTotal({ quantity: 10, rate: 100, quality: 'REJECTED' }), 0);
  assert.equal(supplyTotal({ quantity: 2.5, rate: 120 }), 300);
});

test('slot and counter rates', () => {
  assert.equal(slotForHour(9), 'MORNING');
  assert.equal(slotForHour(15), 'EVENING');
  const p = { morningPrice: 0, eveningPrice: 130, bulkPrice: 110, minBulkQty: 20 };
  assert.equal(slotRate(p, 120, 'MORNING'), 120);
  assert.equal(slotRate(p, 120, 'EVENING'), 130);
  assert.equal(counterRate(p, 120, 'EVENING', 5), 130);
  assert.equal(counterRate(p, 120, 'EVENING', 20), 110);
  assert.equal(counterRate(undefined, 120, 'MORNING', 99), 120);
});

test('kinds, units and subscriber litres', () => {
  assert.equal(isMilkType('BUFFALO_MILK'), true);
  assert.equal(isMilkType('DAHI'), false);
  assert.equal(profileUnit('Kg'), 'KG');
  assert.equal(profileUnit('litre'), 'LITER');
  assert.equal(dailyLiters({ deliveryFrequency: 'MORNING_ONLY', morningQuantity: 2, eveningQuantity: 1 }), 2);
  assert.equal(dailyLiters({ deliveryFrequency: 'DAILY', morningQuantity: 2, eveningQuantity: 1 }), 3);
  assert.equal(dailyLiters({ deliveryFrequency: 'ALTERNATE_DAY', morningQuantity: 2, eveningQuantity: 1 }), 1.5);
  assert.deepEqual(previousMonth(1, 2027), { month: 12, year: 2026 });
});
