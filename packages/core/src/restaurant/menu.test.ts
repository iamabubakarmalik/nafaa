import { test } from 'node:test';
import assert from 'node:assert/strict';
import {
  clock12, convertQty, cookUnit, daysKind, dishClass, foodCostPct, foodCostTone, groupProblem, happyLiveAt, happyPercent, happyProblem,
  platesFromStock, recipeProblem, recipeTotals, settleTotals, unitChoices, windowParts, type RecipeLineDraft,
} from './menu';

const line = (p: Partial<RecipeLineDraft>): RecipeLineDraft => ({
  ingredientProductId: 'x', name: 'Chicken', stockUnit: 'kg', rate: 800, stock: 10, quantity: 250, unit: 'gram', wastagePercent: 0, isOptional: false, notes: '', ...p,
});

test('recipe units', () => {
  assert.equal(convertQty(250, 'gram', 'kg'), 0.25);
  assert.equal(convertQty(2, 'dozen', 'pcs'), 24);
  assert.equal(convertQty(500, 'ml', 'liter'), 0.5);
  assert.equal(convertQty(3, 'cup', 'kg'), 3, 'unrelated units stay');
  assert.deepEqual(unitChoices('kg'), ['kg', 'gram']);
  assert.deepEqual(unitChoices('liter'), ['liter', 'ml']);
  assert.equal(cookUnit('kg'), 'gram');
  assert.equal(cookUnit('pcs'), 'pcs');
});

test('plate cost with wastage, optional lines and yield', () => {
  const d = { yieldQuantity: 2, lines: [line({}), line({ name: 'Oil', stockUnit: 'liter', rate: 500, quantity: 100, unit: 'ml', wastagePercent: 10 }), line({ name: 'Cream', isOptional: true })] };
  // chicken 0.25 kg × 800 = 200; oil 0.11 l × 500 = 55; cream optional.
  assert.deepEqual(recipeTotals(d), { batch: 255, perPlate: 127.5 });
  assert.equal(platesFromStock(line({ stock: 1 }), 1), 4);
  assert.equal(platesFromStock(line({ stock: null }), 1), null);
  assert.deepEqual(recipeProblem({ yieldQuantity: 1, lines: [line({ quantity: 0 })] }), { code: 'quantity', name: 'Chicken' });
  assert.deepEqual(recipeProblem({ yieldQuantity: 0, lines: [line({})] }), { code: 'yield' });
  assert.equal(recipeProblem({ yieldQuantity: 1, lines: [] }), null);
});

test('food cost and menu engineering', () => {
  assert.equal(foodCostPct(300, 1000), 30);
  assert.equal(foodCostPct(300, 0), null);
  assert.equal(foodCostTone(30), 'good');
  assert.equal(foodCostTone(40), 'warn');
  assert.equal(foodCostTone(50), 'bad');
  const th = { popularAt: 10, marginAt: 200 };
  assert.equal(dishClass(20, 300, th), 'star');
  assert.equal(dishClass(20, 100, th), 'workhorse');
  assert.equal(dishClass(2, 300, th), 'puzzle');
  assert.equal(dishClass(2, 100, th), 'dog');
});

test('add-on group rules', () => {
  const base = { name: 'Extra', type: 'ADDON' as const, isRequired: false, minSelections: 0, maxSelections: 2, options: [{ name: 'Cheese' }, { name: 'Raita' }] };
  assert.equal(groupProblem(base), null);
  assert.deepEqual(groupProblem({ ...base, name: ' ' }), { code: 'name' });
  assert.deepEqual(groupProblem({ ...base, options: [{ name: 'A' }, { name: 'a ' }] }), { code: 'duplicate' });
  assert.deepEqual(groupProblem({ ...base, type: 'VARIATION' }), { code: 'singleOnly' });
  assert.deepEqual(groupProblem({ ...base, isRequired: true, minSelections: 3, maxSelections: 3 }), { code: 'minOverOptions', count: 2, min: 3 });
  assert.deepEqual(groupProblem({ ...base, options: [{ name: 'Cheese', ingredientProductId: 'p', ingredientQty: 0 }] }), { code: 'ingredientQty', name: 'Cheese' });
  assert.equal(groupProblem({ ...base, type: 'NOTE', options: [] }), null);
});

test('happy hours: window, wrap past midnight and checks', () => {
  assert.equal(clock12('15:30'), '3:30 PM');
  assert.equal(clock12('00:05'), '12:05 AM');
  assert.deepEqual(windowParts('22:00', '02:00').length, 2);
  const late = { startTime: '22:00', endTime: '02:00', daysOfWeek: [5] };
  assert.ok(happyLiveAt(late, 23 * 60, 5));
  assert.ok(happyLiveAt(late, 60, 6), 'after midnight counts for Friday');
  assert.ok(!happyLiveAt(late, 60, 5));
  assert.ok(happyLiveAt({ startTime: '15:00', endTime: '18:00', daysOfWeek: [] }, 16 * 60, 2));
  assert.equal(daysKind([1, 2, 3, 4, 5]), 'weekdays');
  assert.equal(daysKind([0, 6]), 'weekend');
  assert.equal(daysKind([]), 'everyday');
  const ok = { name: 'Chai', startTime: '15:00', endTime: '18:00', discountType: 'PERCENTAGE' as const, discountValue: 20, pick: false, categoryIds: [], productIds: [] };
  assert.equal(happyProblem(ok), null);
  assert.equal(happyProblem({ ...ok, discountValue: 120 }), 'percent');
  assert.equal(happyProblem({ ...ok, endTime: '15:00' }), 'sameTime');
  assert.equal(happyProblem({ ...ok, pick: true }), 'scope');
  assert.equal(happyPercent({ discountType: 'BUY_ONE_GET_ONE', discountValue: 0 }), 50);
});

test('rider cash hand-over', () => {
  const orders = [{ id: 'a', due: 1200, riderFee: 100 }, { id: 'b', due: 800, riderFee: 100 }, { id: 'c', due: 500 }];
  assert.deepEqual(settleTotals(orders, new Set(['a', 'b']), true), { amount: 2000, fee: 200, drawer: 1800 });
  assert.deepEqual(settleTotals(orders, new Set(['a', 'c']), false), { amount: 1700, fee: 100, drawer: 1700 });
});
