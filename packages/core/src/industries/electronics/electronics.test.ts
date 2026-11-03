import { test } from 'node:test';
import assert from 'node:assert/strict';
import { bundleSavings, bundlesMakeable, categoryTypeFromName, claimShopBore, claimStageKey, daysLeft, parseSerialLines, warrantyEnd, warrantyVerdict } from './index';

test('serial lines with imei and repeats', () => {
  const r = parseSerialLines('SN1, 111, 222, aa:bb\nSN2\nsn1\n\nSN3;333');
  assert.deepEqual(r.entries.map((e) => e.serialNumber), ['SN1', 'SN2', 'SN3']);
  assert.equal(r.repeated, 1);
  assert.equal(r.entries[0].imei2, '222');
  assert.equal(r.entries[0].macAddress, 'aa:bb');
  assert.equal(r.entries[2].imei, '333');
});

test('category from a product name', () => {
  assert.equal(categoryTypeFromName('Samsung LED 32 inch'), 'TV');
  assert.equal(categoryTypeFromName('Tempered glass for iPhone'), 'SCREEN_PROTECTOR');
  assert.equal(categoryTypeFromName('Dell Laptop i5'), 'LAPTOP');
  assert.equal(categoryTypeFromName('Laptop bag'), 'LAPTOP_ACCESSORY');
  assert.equal(categoryTypeFromName(''), 'OTHER');
});

test('warranty verdict and end date', () => {
  assert.equal(warrantyVerdict({ found: false }), 'unknown');
  assert.equal(warrantyVerdict({ found: true, serial: { status: 'IN_STOCK' } }), 'not_sold');
  assert.equal(warrantyVerdict({ found: true, serial: { status: 'SOLD' }, warranty: { isValid: true, endDate: 'x' } }), 'valid');
  assert.equal(warrantyVerdict({ found: true, serial: { status: 'SOLD' }, warranty: { isValid: false, endDate: '2025-01-01' } }), 'expired');
  assert.equal(warrantyVerdict({ found: true, serial: { status: 'SOLD' }, warranty: { isValid: false, endDate: null } }), 'none');
  assert.equal(warrantyEnd('2026-01-31T00:00:00.000Z', 1)?.slice(0, 10), '2026-02-28');
  assert.equal(warrantyEnd('2026-01-15T00:00:00.000Z', 12)?.slice(0, 10), '2027-01-15');
  assert.equal(warrantyEnd('2026-01-15T00:00:00.000Z', 0), null);
  assert.equal(daysLeft('2026-01-11T00:00:00.000Z', Date.parse('2026-01-01T00:00:00.000Z')), 10);
});

test('claim stage and cost', () => {
  assert.equal(claimStageKey({ status: 'ACTIVE', resolvedAt: '2026-01-01' }), 'resolved');
  assert.equal(claimStageKey({ status: 'VOID' }), 'cancelled');
  assert.equal(claimStageKey({ status: 'CLAIMED', sentToBrand: true }), 'brand');
  assert.equal(claimStageKey({ status: 'IN_REPAIR' }), 'repair');
  assert.equal(claimStageKey({ status: 'CLAIMED' }), 'new');
  assert.equal(claimShopBore({ repairCost: 5000, refundAmount: 0, paidByCustomer: 1000, paidByBrand: 2000 }), 2000);
});

test('bundle price and how many can be made', () => {
  const s = bundleSavings([{ quantity: 1, unitPrice: 1000 }, { quantity: 2, unitPrice: 250 }], 1200);
  assert.deepEqual(s, { original: 1500, savings: 300, pct: 20 });
  assert.equal(bundleSavings([{ quantity: 1, unitPrice: 100 }], 150).savings, 0);
  assert.equal(bundlesMakeable([{ quantity: 1, stock: 5 }, { quantity: 2, stock: 5 }]), 2);
  assert.equal(bundlesMakeable([]), 0);
});
