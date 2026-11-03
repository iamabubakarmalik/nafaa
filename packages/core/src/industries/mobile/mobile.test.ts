import { test } from 'node:test';
import assert from 'node:assert/strict';
import { addMonths, formatCnic, imeiLineProblem, isLuhnValid, parseImeiPaste, planProgress, qistPlan, qistProblem, repairDue, shelfMismatch } from './index';

test('IMEI check digit', () => {
  assert.equal(isLuhnValid('356938035643809'), true);
  assert.equal(isLuhnValid('356938035643808'), false);
  assert.equal(isLuhnValid('12345'), false);
});

test('CNIC is formatted while typing', () => {
  assert.equal(formatCnic('3520212345671'), '35202-1234567-1');
  assert.equal(formatCnic('35202'), '35202');
  assert.equal(formatCnic('35202123'), '35202-123');
});

test('pasted IMEI lines', () => {
  assert.deepEqual(parseImeiPaste('356938035643809, 356938035643817\nabc\n356938035643825'), [['356938035643809', '356938035643817'], ['356938035643825']]);
});

test('IMEI line problems', () => {
  const ok = { imei1: '356938035643809' };
  assert.equal(imeiLineProblem([ok]), null);
  assert.deepEqual(imeiLineProblem([{ imei1: '123' }]), { code: 'imei1', line: 1 });
  assert.deepEqual(imeiLineProblem([{ ...ok, imei2: ok.imei1 }]), { code: 'same', line: 1 });
  assert.deepEqual(imeiLineProblem([ok, ok]), { code: 'twice', imei: ok.imei1 });
  assert.deepEqual(imeiLineProblem([ok], ['128GB']), { code: 'variant', line: 1 });
  assert.deepEqual(shelfMismatch([{ stock: 3, inStock: 3 }, { stock: 2.4, inStock: 3 }]).length, 1);
});

test('months clamp to the end of short months', () => {
  assert.equal(addMonths('2026-01-31', 1), '2026-02-28');
  assert.equal(addMonths('2026-01-31', 2), '2026-03-31');
  assert.equal(addMonths('2026-11-15', 3), '2027-02-15');
});

test('qist plan splits the udhaar', () => {
  const p = qistPlan(100000, 60000, 6, '2026-12-05');
  assert.equal(p.perInstallment, 10000);
  assert.equal(p.down, 40000);
  assert.deepEqual(p.dates.slice(0, 3), ['2026-12-05', '2027-01-05', '2027-02-05']);
  assert.equal(qistPlan(1000, 1000, 3, '2026-12-05').perInstallment, 333.33);
  assert.equal(qistProblem('', {}), 'start');
  assert.equal(qistProblem('2026-11-01', { today: '2026-11-03' }), 'past');
  assert.equal(qistProblem('2026-11-01', { billDay: '2026-11-02' }), 'before_bill');
  assert.equal(qistProblem('2026-12-01', { billDay: '2026-11-02', today: '2026-11-03' }), null);
});

test('repair due and plan progress', () => {
  assert.equal(repairDue({ totalCost: 5000, paidAmount: 1500 }), 3500);
  assert.equal(repairDue({ totalCost: 100, paidAmount: 500 }), 0);
  assert.equal(planProgress({ financedAmount: 1000, paidAmount: 250 }), 0.25);
  assert.equal(planProgress({ financedAmount: 0, paidAmount: 0 }), 0);
});

import { settleInstallments } from './index';
test('payment settles the oldest installments first', () => {
  const open = [{ amount: 1000, paidAmount: 0, n: 1 }, { amount: 1000, paidAmount: 200, n: 2 }, { amount: 1000, paidAmount: 0, n: 3 }];
  const r = settleInstallments(open, 1500);
  assert.deepEqual(r.map((x) => [x.i.n, x.take, x.full]), [[1, 1000, true], [2, 500, false]]);
  assert.equal(settleInstallments(open, 0).length, 0);
  assert.equal(settleInstallments(open, 99999).reduce((s, x) => s + x.take, 0), 2800);
});
