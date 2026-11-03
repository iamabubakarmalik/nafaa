import { test } from 'node:test';
import assert from 'node:assert/strict';
import {
  cnicOk, courseDays, daysLeft, drName, expiryBucket, expirySummary, formatCnic, genericName, needsRegister, outOfRange, parseRxNote, rxNote, saltKey, substitutesFor, suggestQty,
} from './index';

test('register note round trips and handles "Dr" prefixes', () => {
  const d = { doctorName: 'dr. Ahmed Raza', doctorRegNumber: '12345-P', patientName: 'Ali', patientCnic: '35202-1234567-1' };
  const note = rxNote(d);
  assert.equal(note, 'Rx · Dr. Ahmed Raza (PMDC 12345-P) · Mareez: Ali (CNIC 35202-1234567-1)');
  assert.deepEqual(parseRxNote(note), { ...d, doctorName: 'Ahmed Raza' });
  assert.equal(parseRxNote('plain note'), null);
  assert.equal(drName('Dr Sana'), 'Dr. Sana');
});

test('register classes and CNIC', () => {
  assert.equal(needsRegister({ scheduleClass: 'SCHEDULE_X' }), true);
  assert.equal(needsRegister({ scheduleClass: 'OTC', isNarcotic: true }), true);
  assert.equal(needsRegister({ scheduleClass: 'SCHEDULE_H' }), false);
  assert.equal(formatCnic('3520212345671'), '35202-1234567-1');
  assert.equal(cnicOk('35202-1234567'), false);
  assert.equal(cnicOk(''), true);
});

test('quantity from dose and course', () => {
  assert.equal(suggestQty('1-0-1', '7 din'), '14');
  assert.equal(suggestQty('1-1-1', '1 mahina'), '90');
  assert.equal(suggestQty('SOS', '7 din'), '');
  assert.equal(courseDays('10 din'), 10);
});

test('expiry buckets and value at risk', () => {
  const now = Date.parse('2026-01-01T00:00:00Z');
  const day = 86_400_000;
  const at = (n: number) => new Date(now + n * day).toISOString();
  assert.equal(daysLeft(at(10), now), 10);
  assert.equal(expiryBucket(-3), 'expired');
  assert.equal(expiryBucket(7), 'd7');
  assert.equal(expiryBucket(31), 'd90');
  const s = expirySummary([
    { quantity: 10, costPrice: 5, expiryDate: at(-2) }, { quantity: 4, costPrice: 10, expiryDate: at(20) },
    { quantity: 2, costPrice: 100, expiryDate: at(80) }, { quantity: 0, costPrice: 9, expiryDate: at(1) },
  ], now);
  assert.equal(s.expired.length, 1);
  assert.equal(s.month.length, 1);
  assert.equal(s.atRiskValue, 90);
  assert.equal(s.watch, 2);
});

test('substitutes share the exact salts, cheapest first, in stock only', () => {
  const key = saltKey(['b', 'a']);
  assert.equal(key, 'a|b');
  const item = { id: '1', price: 100, stock: 0, salts: key };
  const all = [
    { id: '2', price: 90, stock: 5, salts: key }, { id: '3', price: 60, stock: 1, salts: key },
    { id: '4', price: 50, stock: 0, salts: key }, { id: '5', price: 40, stock: 9, salts: 'a' },
  ];
  assert.deepEqual(substitutesFor(item, all).map((x) => x.id), ['3', '2']);
});

test('temperature limits and generic name', () => {
  assert.equal(outOfRange(9, 2, 8), true);
  assert.equal(outOfRange(5, 2, 8), false);
  assert.equal(outOfRange(-30, null, -15), false);
  assert.equal(genericName([{ name: 'Paracetamol', strength: '500mg' }, { name: 'Caffeine' }]), 'Paracetamol 500mg + Caffeine');
});
