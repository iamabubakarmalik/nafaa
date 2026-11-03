import { test } from 'node:test';
import assert from 'node:assert/strict';
import {
  advanceAsk, advanceShort, balanceAfter, bulkLines, bulkNext, cakeMessage, cakeNext, cakeTotal, deriveBakeryCategory, deriveSize,
  dueOf, flowIndex, heldMoney, ingredientNeeds, isLow, isOut, kitchenList, leftOf, liveBatches, marginPct, netOfChange, orderBill,
  payChips, planStats, qtyValue, rateBetween, rawStats, recipeCost, shelfState,
} from './index';

test('cake order flow follows pickup or delivery', () => {
  assert.deepEqual(cakeNext({ status: 'QUOTED' }), { to: 'CONFIRMED', step: 'confirm' });
  assert.deepEqual(cakeNext({ status: 'READY', deliveryType: 'SELF_PICKUP' }), { to: 'DELIVER', step: 'deliver' });
  assert.deepEqual(cakeNext({ status: 'READY', deliveryType: 'HOME_DELIVERY' }), { to: 'OUT_FOR_DELIVERY', step: 'send' });
  assert.equal(cakeNext({ status: 'DELIVERED' }), null);
  assert.equal(flowIndex('BAKING'), 1);
  assert.equal(bulkNext('READY')?.to, 'DELIVER');
});

test('cake money: total, advance ask, balance', () => {
  const total = cakeTotal({ basePrice: 3000, customizationCharges: 500, deliveryCharges: 200, discount: 100, deliveryType: 'SELF_PICKUP' });
  assert.equal(total, 3400); // pickup: delivery charges do not count
  assert.equal(cakeTotal({ basePrice: 3000, deliveryCharges: 200, deliveryType: 'HOME_DELIVERY' }), 3200);
  assert.equal(advanceAsk(3400, null), 1700);
  assert.equal(advanceAsk(3400, 1000), 1000);
  assert.equal(balanceAfter(3400, 0, 1000), 2400);
  assert.equal(dueOf({ total: 3400, paidAmount: 3500 }), 0);
  assert.equal(advanceShort({ status: 'CONFIRMED', advanceRequired: 1700, paidAmount: 1000 }), 700);
  assert.equal(advanceShort({ status: 'QUOTED', advanceRequired: 1700, paidAmount: 0 }), 0);
  assert.deepEqual(payChips(2400, 700).map((c) => c.value), [2400, 700, 1200]);
});

test('bill at hand-over equals the order total', () => {
  const over = orderBill([{ productId: 'p', qty: 1, rate: 3500 }], 3400);
  assert.equal(over.discount, 100);
  assert.equal(over.extra, 0);
  const under = orderBill([{ productId: 'p', qty: 1, rate: 3000 }, { qty: 1, rate: 200 }], 3400);
  assert.equal(under.discount, 0);
  assert.equal(under.extra, 400); // 200 unlinked + 200 shortfall
  assert.equal(under.linked.length, 1);
  assert.deepEqual(heldMoney(1000, 600), { khata: 600, legacy: 400 });
  assert.deepEqual(netOfChange([{ method: 'CARD', amount: 500 }, { method: 'CASH', amount: 1000 }], 1200), [{ method: 'CARD', amount: 500 }, { method: 'CASH', amount: 700 }]);
});

test('time left wording kinds', () => {
  assert.deepEqual(leftOf(-30), { kind: 'daysLate', value: 1 });
  assert.deepEqual(leftOf(0.5), { kind: 'minutes', value: 30 });
  assert.deepEqual(leftOf(5), { kind: 'hours', value: 5 });
  assert.deepEqual(leftOf(null), { kind: 'none', value: 0 });
});

test('bulk lines and the kitchen list', () => {
  const lines = bulkLines([{ productId: 'a', name: 'Patties', qty: 100, rate: 40 }, { name: 'Cake', quantity: 2, price: 3000 }]);
  assert.equal(lines[1].qty, 2);
  const list = kitchenList([
    { items: [{ productId: 'a', name: 'Patties', qty: 100, rate: 40 }], eventDate: '2026-11-10', orderNumber: 'B1' },
    { items: [{ productId: 'a', name: 'Patties', qty: 50, rate: 40 }], eventDate: '2026-11-08', orderNumber: 'B2' },
  ]);
  assert.equal(list[0].qty, 150);
  assert.deepEqual(list[0].orders, ['B1', 'B2']);
  assert.equal(list[0].first, '2026-11-08');
});

test('plan progress and fail rate', () => {
  const s = planStats([
    { status: 'COMPLETED', plannedQty: 50, producedQty: 45, failedQty: 5 },
    { status: 'BAKING', plannedQty: 20, producedQty: 0, failedQty: 0 },
    { status: 'PLANNED', plannedQty: 30, producedQty: 0, failedQty: 0 },
  ]);
  assert.equal(s.planned, 100);
  assert.equal(s.toMake, 50);
  assert.equal(s.inOven, 1);
  assert.equal(s.donePct, 45);
  assert.equal(s.failRate, 10);
  assert.equal(s.linePct, 33);
});

test('recipe cost at today rates and what the store can make', () => {
  const lines = [
    { ingredientId: 'flour', name: 'Maida', qty: 2, unit: 'kg', costPerUnit: 100 },
    { ingredientId: 'egg', name: 'Anday', qty: 12, unit: 'piece', costPerUnit: 20 },
  ];
  const store = [{ id: 'flour', currentStock: 10, costPerUnit: 120 }, { id: 'egg', currentStock: 30, costPerUnit: 20 }];
  const r = recipeCost(lines, 24, store);
  assert.equal(r.batchCost, 2 * 120 + 12 * 20);
  assert.equal(r.perUnit, 480 / 24);
  assert.equal(r.canMake, 2 * 24); // eggs run out after 2 batches
  assert.equal(r.limiting?.ingredientId, 'egg');
  assert.equal(r.rows[0].changed, true);
  assert.equal(marginPct(40, 20), 50);
  assert.equal(marginPct(0, 20), null);
});

test('ingredient needs of a plan and shortages', () => {
  const recipes = { cake: { yieldQty: 4, lines: [{ ingredientId: 'flour', name: 'Maida', qty: 1, unit: 'kg', costPerUnit: 100 }] } };
  const n = ingredientNeeds([{ productId: 'cake', plannedQty: 10 }, { productId: 'none', plannedQty: 5 }], recipes, [{ id: 'flour', currentStock: 2, costPerUnit: 100 }]);
  assert.equal(n.rows[0].qty, 2.5);
  assert.equal(n.rows[0].short, 0.5);
  assert.equal(n.cost, 250);
  assert.equal(n.short.length, 1);
});

test('raw material levels', () => {
  const items = [
    { currentStock: 0, minStock: 5, costPerUnit: 10, isCritical: true },
    { currentStock: 3, minStock: 5, costPerUnit: 10 },
    { currentStock: 20, minStock: 5, costPerUnit: 10 },
  ];
  assert.equal(isOut(items[0]), true);
  assert.equal(isLow(items[1]), true);
  const s = rawStats(items);
  assert.equal(s.low, 1);
  assert.equal(s.out, 1);
  assert.equal(s.critical, 1);
  assert.equal(s.value, 230);
  assert.equal(s.orderCost, 5 * 10 + 2 * 10);
});

test('shelf batches by time left', () => {
  const now = Date.parse('2026-11-03T10:00:00Z');
  const live = liveBatches([
    { status: 'FRESH', currentQty: 5, bestBefore: '2026-11-03T14:00:00Z' },
    { status: 'EXPIRED', currentQty: 2, bestBefore: '2026-11-03T08:00:00Z' },
    { status: 'DISCARDED', currentQty: 3, bestBefore: '2026-11-03T08:00:00Z' },
    { status: 'FRESH', currentQty: 0, bestBefore: '2026-11-05T08:00:00Z' },
  ], now);
  assert.equal(live.length, 2);
  assert.equal(live[0].left, -2);
  assert.equal(shelfState(live[0].left), 'expired');
  assert.equal(shelfState(live[1].left), 'soon');
  assert.equal(qtyValue('12.3456', true), 12.346);
  assert.equal(qtyValue('12.6', false), 13);
});

test('units, sizes and categories', () => {
  assert.equal(rateBetween('dozen', 'pcs'), 12);
  assert.equal(rateBetween('slice', 'pcs', { slices: 10 }), 0.1);
  assert.equal(rateBetween('pound', 'kg'), 0.4536);
  assert.equal(deriveSize('pound', 907), 'TWO_POUND');
  assert.equal(deriveSize('pcs'), 'MEDIUM');
  assert.equal(deriveBakeryCategory('Cakes', 'Chocolate birthday cake'), 'BIRTHDAY_CAKE');
  assert.equal(deriveBakeryCategory(null, 'Chicken patties'), 'PATTY');
  assert.equal(deriveBakeryCategory('', ''), 'OTHER');
});

test('cake WhatsApp text in three languages', () => {
  const base = { customer: 'Ayesha', shop: 'Sweet Home', number: 'CK-1', confirmed: true, cake: 'Birthday · 2 Pound · Chocolate', delivered: false, when: 'Mon, 3 Nov, 7:00 pm', total: 'Rs 3,400', paid: 'Rs 1,000', due: 'Rs 2,400', status: 'Pakka hua' };
  const roman = cakeMessage(base, 'roman');
  assert.match(roman, /pakka hai/);
  assert.match(roman, /Baqi: Rs 2,400/);
  assert.match(cakeMessage({ ...base, due: null }, 'en'), /Fully paid/);
  assert.match(cakeMessage(base, 'ur'), /کیک|آرڈر/);
  assert.doesNotMatch(roman, /\n\n\n/);
});
