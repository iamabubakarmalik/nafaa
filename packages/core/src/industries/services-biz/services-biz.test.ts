import { test } from 'node:test';
import assert from 'node:assert/strict';
import { canBill, jobDue, jobTotal, nextStep, partsCharge, quoteTotal, techCommission } from './index';

const base = { visitCharge: 500, labourCharge: 2000, partsCharge: 1500, transportCharge: 200, emergencyCharge: 0, taxAmount: 0, discountAmount: 0 };

test('job total adds every charge and tax, takes discount, never below zero', () => {
  assert.equal(jobTotal(base), 4200);
  assert.equal(jobTotal({ ...base, taxAmount: 100, discountAmount: 300 }), 4000);
  assert.equal(jobTotal({ ...base, discountAmount: 99999 }), 0);
});

test('parts the customer brought or warranty covers are free', () => {
  assert.equal(partsCharge([{ quantity: 2, unitPrice: 300 }, { quantity: 1, unitPrice: 900, isCustomerSupplied: true }, { quantity: 1, unitPrice: 500, isUnderWarranty: true }]), 600);
});

test('due after advance and returns', () => {
  assert.equal(jobDue({ totalCharge: 4200, paidAmount: 1000 }), 3200);
  assert.equal(jobDue({ totalCharge: 4200, paidAmount: 1000 }, 500), 2700);
  assert.equal(jobDue({ totalCharge: 1000, paidAmount: 1500 }), 0);
});

test('quotation total from lines, tax and discount', () => {
  const lines = [{ kind: 'LABOUR', description: 'Wiring', quantity: 1, unitPrice: 3000 }, { kind: 'PART', description: 'Switch', quantity: 4, unitPrice: 250 }];
  assert.equal(quoteTotal(lines), 4000);
  assert.equal(quoteTotal(lines, 500, 200), 3700);
});

test('job steps run from booking to the bill', () => {
  assert.equal(nextStep('CONFIRMED')?.status, 'DISPATCHED');
  assert.equal(nextStep('ARRIVED')?.status, 'IN_PROGRESS');
  assert.equal(nextStep('IN_PROGRESS')?.status, 'QUALITY_CHECK');
  assert.equal(nextStep('QUALITY_CHECK'), null);
  assert.equal(canBill('QUALITY_CHECK'), true);
  assert.equal(canBill('IN_PROGRESS'), false);
});

test('technician commission', () => {
  assert.equal(techCommission(2500, { type: 'PERCENTAGE', pct: 20 }), 500);
  assert.equal(techCommission(2500, { type: 'FIXED', fixed: 300 }), 300);
  assert.equal(techCommission(2500, { type: 'BOTH', pct: 10, fixed: 100 }), 350);
  assert.equal(techCommission(2500, { type: 'NONE' }), 0);
});
