import assert from 'node:assert/strict';
import { test } from 'node:test';
import { change, monthRange, netProfitOf, sumStatements, unionCategories } from './index';
import type { PnlStatement } from './types';

const statement = (over: Partial<PnlStatement> = {}): PnlStatement => ({
  revenue: { gross: 1100, discount: 100, manualDiscount: 60, codeDiscount: 20, loyaltyDiscount: 20, serviceCharges: 0, sales: 1000, returns: 0, net: 1000, bills: 4, returnCount: 0, credit: 200, avgBill: 250 },
  cogs: { saved: 600, estimated: 0, returned: 0, total: 600, estimatedLines: 0, unknownLines: 0, unknownRevenue: 0 },
  grossProfit: 400, grossMargin: 40, profitSplit: null,
  expenses: { paid: 100, count: 1, categories: [{ id: 'a', name: 'Rent', color: '#000', amount: 100, count: 1 }], salaries: 0, salaryCount: 0, commission: 0, commissionCount: 0, total: 100 },
  writeOffs: { damage: 10, loss: 0, countedShort: 0, found: 5, net: 5, count: 1, stockLoss: 10, stockGain: 5 },
  otherIncome: { income: 50, incomeCount: 1, bookingKept: 0, bookingCount: 0, total: 50 },
  operatingProfit: 300, netProfit: 340, netMargin: 34,
  ...over,
});

test('change is null without a base and signed otherwise', () => {
  assert.equal(change(10, 0), null);
  assert.equal(change(null, 5), null);
  assert.equal(change(150, 100), 50);
  assert.equal(change(50, -100), 150);
});

test('monthRange caps the last day at today', () => {
  assert.deepEqual(monthRange('2026-10', '2026-11-03'), { from: '2026-10-01', to: '2026-10-31' });
  assert.deepEqual(monthRange('2026-11', '2026-11-03'), { from: '2026-11-01', to: '2026-11-03' });
});

test('net profit rule: gross - expenses - net stock loss + other income', () => {
  assert.equal(netProfitOf(statement()), 400 - 100 - 5 + 50);
  assert.equal(netProfitOf(statement({ grossProfit: null })), null);
});

test('sumStatements adds up and recomputes margins', () => {
  const sum = sumStatements([statement(), statement()]);
  assert.equal(sum.revenue.net, 2000);
  assert.equal(sum.revenue.avgBill, 250);
  assert.equal(sum.grossProfit, 800);
  assert.equal(sum.netProfit, 680);
  assert.equal(sum.netMargin, 34);
  assert.equal(sum.expenses.categories[0].amount, 200);
});

test('sumStatements keeps cost figures hidden when any column hides them', () => {
  const sum = sumStatements([statement(), statement({ grossProfit: null, netProfit: null, cogs: null, writeOffs: null })]);
  assert.equal(sum.grossProfit, null);
  assert.equal(sum.cogs, null);
});

test('unionCategories orders by amount', () => {
  const a = statement();
  const b = statement({ expenses: { ...a.expenses, categories: [{ id: 'b', name: 'Power', color: '#111', amount: 500, count: 2 }] } });
  assert.deepEqual(unionCategories([a, b]).map((c) => c.id), ['b', 'a']);
});
