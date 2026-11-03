import { test } from 'node:test';
import assert from 'node:assert/strict';
import {
  addComboLine, addItemLine, billTotals, cartToSaleItems, counterCheck, creditStatus, deliveryCharge, derivePosUnits,
  keypad, mainMethod, NO_LIMIT, parseQtyPrefix, parseScaleLabel, partsForTotal, priceCutOf, retier, roundOffOptions,
  salePayment, scaleQuantity, setLineDiscount, setLinePrice, setLineQty, splitParts, splitSummary, stepLine, taxCharge,
  tenderSummary, tierPrice, type CounterRules, type PosCartLine,
} from './index';

const product = { id: 'p1', name: 'Sugar', unit: 'pcs', wholesalePrice: 90, creditPrice: 110 };
const units = derivePosUnits({ unit: 'pcs', price: 100, wholesalePrice: 90, creditPrice: 110 }, [
  { id: 'u-dz', unitName: 'dozen', conversionRate: 12, price: 1100 },
  { id: 'u-ct', unitName: 'carton', conversionRate: 24, price: null },
  { id: 'u-base', unitName: 'pcs', conversionRate: 1, price: 100, isBase: true },
]);

const add = (lines: PosCartLine[], unitIdx = 0, qty = 1, limit = NO_LIMIT, tier: 'RETAIL' | 'WHOLESALE' | 'CREDIT' = 'RETAIL') => {
  const r = addItemLine(lines, { product, unit: units[unitIdx], qty, limit, tier });
  assert.ok(r.ok);
  return r.lines;
};

test('units: base first, packs after, base pack skipped, missing pack price = base × size', () => {
  assert.deepEqual(units.map((u) => u.unitName), ['pcs', 'dozen', 'carton']);
  assert.equal(units[2].price, 2400);
});

test('tiers fall back to retail and re-price lines', () => {
  assert.equal(tierPrice({ price: 100, wholesalePrice: 0 }, 'WHOLESALE'), 100);
  assert.equal(tierPrice({ price: 100, creditPrice: 120 }, 'CREDIT'), 120);
  const [line] = add([]);
  const w = retier(line, 'WHOLESALE');
  assert.equal(w.unitPrice, 90);
  assert.equal(retier({ ...line, priceEdited: true }, 'WHOLESALE').unitPrice, 100);
  // A pack without its own wholesale price uses the product's times the size.
  const [pack] = add([], 1, 1, NO_LIMIT, 'WHOLESALE');
  assert.equal(pack.unitPrice, 1080);
});

test('adding merges equal lines and respects stock', () => {
  let lines = add([], 0, 2, 5);
  lines = add(lines, 0, 1, 5);
  assert.equal(lines.length, 1);
  assert.equal(lines[0].quantity, 3);
  const over = addItemLine(lines, { product, unit: units[0], qty: 3, limit: 5, tier: 'RETAIL' });
  assert.deepEqual(over, { ok: false, reason: 'stock', available: 5 });
  // A dozen is 12 base units.
  const dz = addItemLine([], { product, unit: units[1], qty: 1, limit: 10, tier: 'RETAIL' });
  assert.equal(dz.ok, false);
});

test('quantity steps, limits and removal', () => {
  const lines = add([], 0, 1, 2);
  const up = stepLine(lines, lines[0].id, 1);
  assert.ok(up.ok && up.lines[0].quantity === 2);
  const tooMany = setLineQty(lines, lines[0].id, 3);
  assert.equal(tooMany.ok, false);
  const gone = stepLine(lines, lines[0].id, -1);
  assert.ok(gone.ok && gone.lines.length === 0);
  const kg = addItemLine([], { product: { ...product, unit: 'kg' }, unit: { ...units[0], unitName: 'kg' }, qty: 1, limit: NO_LIMIT, tier: 'RETAIL' });
  assert.ok(kg.ok);
  const k = stepLine(kg.lines, kg.lines[0].id, 1);
  assert.ok(k.ok && k.lines[0].quantity === 1.25);
});

test('line rate and line discount count as a price cut', () => {
  let lines = add([], 0, 4);
  lines = setLineDiscount(lines, lines[0].id, 40);
  assert.equal(lines[0].unitPrice, 90);
  assert.equal(lines[0].priceEdited, true);
  assert.equal(priceCutOf(lines), 40);
  lines = setLinePrice(lines, lines[0].id, 100);
  assert.equal(lines[0].priceEdited, false);
});

test('bill totals: percent, rupees, code, points, charges', () => {
  const lines = add([], 0, 10); // Rs 1,000
  assert.equal(billTotals({ lines, discountMode: 'pct', discountPct: 10, discountRs: 0 }).total, 900);
  assert.equal(billTotals({ lines, discountMode: 'rs', discountPct: 0, discountRs: 5000 }).total, 0);
  const t = billTotals({
    lines, discountMode: 'rs', discountPct: 0, discountRs: 100, codeDiscount: 50,
    loyalty: { on: true, available: 1000, rate: 1, maxRedeemPercent: 50, minRedeem: 10 }, pointsWanted: 999,
    charges: [{ type: 'DELIVERY', label: 'Delivery', amount: 150 }, { type: 'DELIVERY', label: 'Delivery (rider)', amount: 200, passThrough: true }],
  });
  assert.equal(t.discount, 100);
  assert.equal(t.codeDiscount, 50);
  assert.equal(t.pointsMax, 425);
  assert.equal(t.pointsUsed, 425);
  assert.equal(t.charges, 150);
  assert.equal(t.total, 1000 - 100 - 50 - 425 + 150);
  const few = billTotals({ lines, discountMode: 'pct', discountPct: 0, discountRs: 0, loyalty: { on: true, available: 5, rate: 1, maxRedeemPercent: 100, minRedeem: 10 }, pointsWanted: 5 });
  assert.equal(few.pointsUsed, 0);
});

test('round off and tax', () => {
  assert.deepEqual(roundOffOptions(1234).map((o) => o.total), [1230, 1200, 1200]);
  assert.deepEqual(taxCharge(1000, 17), { type: 'TAX', label: 'Tax 17%', amount: 170, cost: 170 });
  assert.equal(taxCharge(1000, 0), null);
});

test('counter rules: discount limit, PIN, credit limit', () => {
  const rules: CounterRules = { allowDiscount: true, maxDiscountPercent: 10, pinForDiscount: false, allowCredit: true, requireCustomer: false, hasPin: true, discountTrusted: false };
  assert.deepEqual(counterCheck(rules, { manualDiscount: 50, priceCut: 0, subtotal: 1000, credit: 0 }), { stop: null, pin: null });
  assert.deepEqual(counterCheck(rules, { manualDiscount: 100, priceCut: 50, subtotal: 950, credit: 0 }).pin, { kind: 'discount', reason: 'over_limit', maxPercent: 10 });
  assert.deepEqual(counterCheck({ ...rules, hasPin: false }, { manualDiscount: 200, priceCut: 0, subtotal: 1000, credit: 0 }).stop, { code: 'discount_limit', maxPercent: 10 });
  assert.equal(counterCheck({ ...rules, discountTrusted: true }, { manualDiscount: 900, priceCut: 0, subtotal: 1000, credit: 0 }).pin, null);
  assert.deepEqual(counterCheck({ ...rules, allowDiscount: false }, { manualDiscount: 1, priceCut: 0, subtotal: 1000, credit: 0 }).stop, { code: 'discount_off' });
  assert.deepEqual(counterCheck({ ...rules, pinForDiscount: true }, { manualDiscount: 10, priceCut: 0, subtotal: 1000, credit: 0 }).pin, { kind: 'discount', reason: 'discount' });
  const customer = { balance: 4000, creditLimit: 5000 };
  assert.deepEqual(counterCheck(rules, { manualDiscount: 0, priceCut: 0, subtotal: 2000, credit: 2000, customer }).pin, { kind: 'credit', reason: 'credit_limit', limit: 5000 });
  assert.equal(counterCheck(rules, { manualDiscount: 0, priceCut: 0, subtotal: 900, credit: 900, customer }).pin, null);
  assert.deepEqual(creditStatus(customer, 2000), { balance: 4000, limit: 5000, after: 6000, room: 1000, over: true, near: true });
});

test('tender: change, part payment, khata', () => {
  assert.deepEqual(tenderSummary('full', 950, 1000), { paid: 1000, change: 50, credit: 0 });
  assert.deepEqual(tenderSummary('full', 950, 0), { paid: 950, change: 0, credit: 0 });
  assert.deepEqual(tenderSummary('partial', 950, 500), { paid: 500, change: 0, credit: 450 });
  assert.deepEqual(tenderSummary('credit', 950, 500), { paid: 0, change: 0, credit: 950 });
  assert.equal(salePayment({ paymentMethod: 'CASH', paidAmount: 1000, isCredit: false, depositExtra: true }, 950).paidAmount, 950);
  assert.equal(keypad('0', '5'), '5');
  assert.equal(keypad('12', '00'), '1200');
  assert.equal(keypad('12', '⌫'), '1');
});

test('split payments: change only from cash, parts for an exact total', () => {
  const ok = splitSummary([{ method: 'CASH', amount: '600' }, { method: 'CARD', amount: '400' }], 950);
  assert.deepEqual(ok, { paid: 1000, cash: 600, change: 50, remaining: 0, problem: null });
  const bad = splitSummary([{ method: 'CASH', amount: '0' }, { method: 'CARD', amount: '1000' }], 950);
  assert.equal(bad.problem, 'change_not_cash');
  const parts = splitParts([{ method: 'CASH', amount: '600' }, { method: 'JAZZCASH', amount: '' }, { method: 'CARD', amount: '400' }]);
  assert.equal(parts.length, 2);
  assert.equal(mainMethod(parts), 'CASH');
  assert.deepEqual(partsForTotal(parts, 950), [{ method: 'CASH', amount: 550 }, { method: 'CARD', amount: 400 }]);
});

test('combo lines spread their price over the products', () => {
  const combo = { id: 'c1', name: 'Breakfast', price: 450, items: [{ productId: 'egg', quantity: 6, originalPrice: 50 }, { productId: 'bread', quantity: 1, originalPrice: 200 }] };
  let { lines } = addComboLine([], combo);
  ({ lines } = addComboLine(lines, combo));
  assert.equal(lines.length, 1);
  assert.equal(lines[0].quantity, 2);
  const items = cartToSaleItems(lines);
  assert.equal(items.length, 2);
  const egg = items.find((i) => i.productId === 'egg')!;
  assert.equal(egg.quantity, 12);
  assert.ok(Math.abs(egg.priceOverride! - 45) < 1e-9);
  const sum = items.reduce((s, i) => s + i.quantity * (i.priceOverride ?? 0), 0);
  assert.ok(Math.abs(sum - 900) < 1e-6);
});

test('pack lines go out in base units with the pack named', () => {
  const lines = add([], 1, 2);
  const [item] = cartToSaleItems(lines);
  assert.equal(item.quantity, 24);
  assert.ok(Math.abs(item.priceOverride! - 1100 / 12) < 1e-9);
  assert.deepEqual([item.unitName, item.unitQty, item.conversionRate], ['dozen', 2, 12]);
});

test('qty prefix, scale labels and delivery', () => {
  assert.deepEqual(parseQtyPrefix('3*maggi'), { qty: 3, rest: 'maggi' });
  assert.deepEqual(parseQtyPrefix('x2'), { qty: 2, rest: '' });
  assert.deepEqual(parseQtyPrefix('maggi'), { qty: null, rest: 'maggi' });
  const label = parseScaleLabel('2100123012505');
  assert.deepEqual(label, { codes: ['00123', '123', '2100123'], grams: 1250 });
  assert.equal(parseScaleLabel('8964000000001'), null);
  assert.equal(scaleQuantity('kg', 1250), 1.25);
  assert.equal(scaleQuantity('pcs', 1250), null);
  assert.deepEqual(deliveryCharge({ on: true, charge: 150, riderCost: 100, address: '', byRider: false }), { type: 'DELIVERY', label: 'Delivery', amount: 150, cost: 100, note: undefined });
  assert.equal(deliveryCharge({ on: true, charge: 150, riderCost: 0, address: '', byRider: true })?.passThrough, true);
  assert.equal(deliveryCharge({ on: false, charge: 150, riderCost: 0, address: '' }), null);
});
