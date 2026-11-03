import { test } from 'node:test';
import assert from 'node:assert/strict';
import { billPlan, bulkBreak, confirmProblem, deliveredPct, limitUsed, lineTotal, modeRate, overLimit, quoteProblems, quoteTotals, rateFor, remainingToSend, ruleProblem, severityOf, slipUnit, sumAging, tierFor } from './index';

const tiers = [{ id: 'a', minQuantity: 50, price: 1180 }, { id: 'b', minQuantity: 200, price: 1150 }, { id: 'c', minQuantity: 10, maxQuantity: 49, price: 1200 }];

test('quantity rates: highest reached tier, only when cheaper than the base', () => {
  assert.equal(tierFor(tiers, 5), null);
  assert.equal(tierFor(tiers, 10)?.id, 'c');
  assert.equal(tierFor(tiers, 60)?.id, 'a');
  assert.equal(tierFor(tiers, 500)?.id, 'b');
  assert.deepEqual(rateFor(1250, tiers, 60), { price: 1180, tier: tiers[0] });
  assert.equal(rateFor(1100, tiers, 60).price, 1100);
  assert.equal(rateFor(1100, tiers, 60).tier, null);
  assert.equal(modeRate(1500, 1400, 'wholesale'), 1400);
  assert.equal(modeRate(1500, 0, 'wholesale'), 1500);
  assert.equal(modeRate(1500, 1400, 'retail'), 1500);
});

test('a bulk rate breaks when the line quantity drops below it', () => {
  assert.equal(bulkBreak([{ name: 'Cement', note: 'Bulk rate 50+', quantity: 60 }]), null);
  assert.deepEqual(bulkBreak([{ name: 'Cement', note: 'x · Bulk rate 50+', quantity: 20 }]), { name: 'Cement', min: 50, quantity: 20 });
  assert.equal(bulkBreak([{ name: 'Pipe', quantity: 1 }]), null);
});

test('quotation totals: line discount, header discount, tax and charges', () => {
  assert.equal(lineTotal({ quantity: 10, unitPrice: 100, discount: 50 }), 950);
  assert.equal(lineTotal({ quantity: 1, unitPrice: 100, discount: 500 }), 0);
  const t = quoteTotals([{ quantity: 10, unitPrice: 100 }, { quantity: 2, unitPrice: 250, discount: 50 }], { discount: 100, taxPct: 10, delivery: 300, labour: 200, other: 0 });
  assert.deepEqual(t, { subtotal: 1450, disc: 100, tax: 135, charges: 500, total: 1985 });
  assert.equal(quoteTotals([{ quantity: 1, unitPrice: 100 }], { discount: 500 }).disc, 100);
});

test('quotation checks and the bill it becomes', () => {
  assert.deepEqual(quoteProblems('', [], {}), ['name', 'items']);
  assert.deepEqual(quoteProblems('Ali', [{ itemName: '', quantity: 0, unitPrice: 10 }], {}).sort(), ['itemName', 'quantity']);
  assert.ok(quoteProblems('Ali', [{ itemName: 'x', quantity: 1, unitPrice: 10 }], { discount: 50 }).includes('discount'));
  const plan = billPlan({ items: [{ productId: 'p1', quantity: 3, total: 900 }, { quantity: 1, total: 10 }], subtotal: 910, discount: 10, deliveryCharges: 100, laborCharges: 0, otherCharges: 50 });
  assert.equal(plan.total, 1050);
  assert.deepEqual(plan.charges.map((c) => c.type), ['DELIVERY', 'OTHER']);
  assert.equal(plan.items[0].priceOverride, 300);
  assert.equal(plan.missing, 1);
});

test('units, challan quantities and hand-over checks', () => {
  assert.equal(slipUnit('Sqft'), 'SQFT');
  assert.equal(slipUnit('thing'), 'PIECE');
  assert.equal(remainingToSend(100, 30), 70);
  assert.equal(remainingToSend(10, 12), 0);
  assert.equal(confirmProblem([{ itemId: 'a', ordered: 10, delivered: 10, damaged: 0 }]), null);
  assert.deepEqual(confirmProblem([{ itemId: 'a', ordered: 10, delivered: 9, damaged: 2 }]), { kind: 'over', itemId: 'a' });
  assert.deepEqual(confirmProblem([{ itemId: 'a', ordered: 10, delivered: 0, damaged: 0 }]), { kind: 'nothing' });
  assert.equal(deliveredPct(200, 50), 25);
  assert.equal(deliveredPct(0, 5), 0);
  assert.equal(deliveredPct(10, 30), 100);
});

test('reorder severity, rule checks and contractor credit', () => {
  assert.equal(severityOf(0, { minStock: 5, reorderPoint: 20 }), 'OUT_OF_STOCK');
  assert.equal(severityOf(4, { minStock: 5, reorderPoint: 20 }), 'CRITICAL');
  assert.equal(severityOf(15, { minStock: 5, reorderPoint: 20 }), 'LOW');
  assert.equal(severityOf(30, { minStock: 5, reorderPoint: 20 }), 'OK');
  assert.equal(ruleProblem({ reorderPoint: 0, minStock: 0, reorderQty: 5 }), 'point');
  assert.equal(ruleProblem({ reorderPoint: 10, minStock: 20, reorderQty: 5 }), 'min');
  assert.equal(ruleProblem({ reorderPoint: 10, minStock: 2, reorderQty: 0 }), 'qty');
  assert.equal(ruleProblem({ reorderPoint: 10, minStock: 2, reorderQty: 5 }), null);
  assert.deepEqual(sumAging([{ age0To30Days: 100, age31To60Days: 0, age61To90Days: 5, ageOver90Days: 0 }, { age0To30Days: 50.5, age31To60Days: 20, age61To90Days: 0, ageOver90Days: 9 }]), { d30: 150.5, d60: 20, d90: 5, over90: 9 });
  assert.equal(overLimit({ creditLimit: 1000, currentBalance: 1500 }), true);
  assert.equal(overLimit({ creditLimit: 0, currentBalance: 1500 }), false);
  assert.equal(limitUsed({ creditLimit: 1000, currentBalance: 250 }), 25);
  assert.equal(limitUsed({ creditLimit: 1000, currentBalance: 5000 }), 100);
});
