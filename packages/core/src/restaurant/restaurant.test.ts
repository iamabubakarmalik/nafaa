import { test } from 'node:test';
import assert from 'node:assert/strict';
import {
  ageTone, canSplitItems, chargesPreview, composerProblem, defaultPicks, equalShares, freshTickets, missingChoice, orderBill,
  pickedModifiers, readyCallouts, sameLine, splitAmount, splitProblem, togglePick, unitPrice, type ModGroup,
} from './index';

const size: ModGroup = { id: 'g1', name: 'Size', isRequired: true, minSelections: 1, maxSelections: 1, options: [{ id: 's', name: 'Small', priceAdjustment: 0, isDefault: true }, { id: 'l', name: 'Large', priceAdjustment: 150 }] };
const extras: ModGroup = { id: 'g2', name: 'Extras', isRequired: false, minSelections: 0, maxSelections: 2, options: [{ id: 'c', name: 'Cheese', priceAdjustment: 80 }, { id: 'e', name: 'Egg', priceAdjustment: 40 }, { id: 'o', name: 'Olives', priceAdjustment: 60 }] };

test('modifier picks: defaults, toggling and limits', () => {
  let p = defaultPicks([size, extras]);
  assert.deepEqual(p, { g1: ['s'], g2: [] });
  p = togglePick(p, size, 'l');
  assert.deepEqual(p.g1, ['l']);
  p = togglePick(p, extras, 'c');
  p = togglePick(p, extras, 'e');
  p = togglePick(p, extras, 'o');
  assert.deepEqual(p.g2, ['c', 'e'], 'third extra over the max is ignored');
  p = togglePick(p, extras, 'c');
  assert.deepEqual(p.g2, ['e']);
});

test('modifier pricing and required choices', () => {
  const dish = { price: 500, sizes: [{ id: 'h', name: 'Half', price: 300 }, { id: 'f', name: 'Full', price: 550 }], groups: [size, extras] };
  assert.equal(missingChoice(dish, undefined, { g1: ['s'] }), 'size');
  assert.equal(missingChoice(dish, dish.sizes[0], { g1: [] }), 'g1');
  assert.equal(missingChoice(dish, dish.sizes[0], { g1: ['l'] }), null);
  const mods = pickedModifiers([size, extras], { g1: ['l'], g2: ['c', 'e'] });
  assert.equal(mods.length, 3);
  assert.equal(unitPrice(dish.price, dish.sizes[1], mods), 550 + 150 + 80 + 40);
  assert.equal(unitPrice(dish.price, undefined, []), 500);
  assert.ok(sameLine({ productId: 'a', modifiers: [{ modifierOptionId: 'x' }, { modifierOptionId: 'y' }] }, { productId: 'a', modifiers: [{ modifierOptionId: 'y' }, { modifierOptionId: 'x' }] }));
  assert.ok(!sameLine({ productId: 'a', modifiers: [], note: 'kam mirch' }, { productId: 'a', modifiers: [] }));
});

test('order bill: service only on dine-in, packing off the table', () => {
  const dine = orderBill({ mode: 'DINE_IN', subtotal: 2000, servicePct: 10, taxPct: 5, packing: 50, discount: 100 });
  assert.equal(dine.service, 200);
  assert.equal(dine.tax, 110);
  assert.equal(dine.pack, 0);
  assert.equal(dine.total, 2000 + 200 + 110 - 100);
  const del = orderBill({ mode: 'DELIVERY', subtotal: 1000, happy: 100, servicePct: 10, deliveryFee: 150, packing: 30 });
  assert.equal(del.service, 0);
  assert.equal(del.itemsNet, 900);
  assert.equal(del.total, 900 + 150 + 30);
  assert.equal(composerProblem({ lines: 1, adding: false, mode: 'DELIVERY', address: '', phone: '0300', bill: del }), 'address');
  assert.equal(composerProblem({ lines: 1, adding: false, mode: 'DINE_IN', bill: orderBill({ mode: 'DINE_IN', subtotal: 100, discount: 200 }) }), 'discount');
  assert.equal(composerProblem({ lines: 0, adding: false, mode: 'PICKUP', bill: dine }), 'empty');
});

test('charges preview guards', () => {
  const o = { mode: 'DINE_IN' as const, subtotal: 1000, paidAmount: 500 };
  assert.deepEqual(chargesPreview(o, { servicePct: 10, taxPct: 0, discount: 0, packing: 0, deliveryFee: 0, tip: 50 }), { total: 1150, problem: null });
  assert.equal(chargesPreview(o, { servicePct: 120, taxPct: 0, discount: 0, packing: 0, deliveryFee: 0, tip: 0 }).problem, 'percent');
  assert.equal(chargesPreview(o, { servicePct: 0, taxPct: 0, discount: 700, packing: 0, deliveryFee: 0, tip: 0 }).problem, 'paid');
});

test('split bill math', () => {
  assert.deepEqual(equalShares(1000, 3), [333.34, 333.34, 333.32]);
  assert.equal(equalShares(1000, 3).reduce((a, b) => a + b, 0), 1000);
  const lines = [{ id: 'a', quantity: 2, total: 800 }, { id: 'b', quantity: 1, total: 300 }];
  assert.equal(splitAmount(lines, { a: 1 }), 400);
  assert.equal(splitAmount(lines, { a: 5, b: 1 }), 1100, 'quantity is capped at the line');
  assert.equal(splitProblem(lines, {}), 'none');
  assert.equal(splitProblem(lines, { a: 2, b: 1 }), 'all');
  assert.equal(splitProblem(lines, { a: 1 }), null);
  assert.ok(!canSplitItems({ paidAmount: 0 }, [{ quantity: 1 }]));
  assert.ok(canSplitItems({ paidAmount: 0 }, [{ quantity: 2 }]));
  assert.ok(!canSplitItems({ paidAmount: 10 }, [{ quantity: 2 }]));
});

test('kitchen display helpers', () => {
  assert.equal(ageTone(5), 'ok');
  assert.equal(ageTone(12), 'late');
  assert.equal(ageTone(25), 'very-late');
  const order = (id: string, mode: string, token?: number) => ({ id, mode, token, orderNumber: `R-${id}` });
  assert.deepEqual(readyCallouts([
    { status: 'READY', order: order('1', 'TAKEAWAY', 7) },
    { status: 'COOKING', order: order('2', 'PICKUP', 8) },
    { status: 'READY', order: order('2', 'PICKUP', 8) },
    { status: 'READY', order: order('3', 'DINE_IN') },
  ]), ['#7']);
  assert.deepEqual(freshTickets(null, [{ id: 'a', status: 'PENDING' }]), []);
  assert.deepEqual(freshTickets(new Set(['a']), [{ id: 'a', status: 'PENDING' }, { id: 'b', status: 'PENDING' }, { id: 'c', status: 'READY' }]), ['b']);
});
