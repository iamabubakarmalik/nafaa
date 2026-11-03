import { test } from 'node:test';
import assert from 'node:assert/strict';
import { cutMismatch, ftIn, noteDims, pieceNote, qtyInUnit, rateInUnit, readCarpetNote, realFt, rollCut, rollCutNote, splitFt, usedFromRoll } from './index';

test('feet and inches are formatted', () => {
  assert.equal(ftIn(10, 6), '10ft 6in');
  assert.equal(ftIn(12), '12ft');
  assert.equal(ftIn(11, 12), '12ft');
  assert.deepEqual(splitFt(10.5), { ft: 10, inch: 6 });
});

test('area turns into the product unit and back into a rate', () => {
  assert.equal(qtyInUnit('sqft', 9, 12), 108);
  assert.equal(qtyInUnit('sqyd', 9, 12), 12);
  assert.equal(qtyInUnit('sqm', 10, 10), 9.29);
  assert.equal(qtyInUnit('ft', 9, 12), 12);
  assert.equal(rateInUnit('sqyd', 50, 9), 450);
  assert.equal(rateInUnit('ft', 50, 9), 450);
});

test('bill notes round-trip the way the server reads them', () => {
  const n = rollCutNote('CR-1', 9, 0, 12, 6, true);
  assert.equal(n, 'Cut from CR-1: 9ft × 12ft 6in = 112.50 sqft');
  assert.deepEqual(readCarpetNote(n), { kind: 'roll', ref: 'CR-1', size: '9ft × 12ft 6in', sqft: 112.5, waste: false });
  assert.deepEqual(noteDims(n), { w: 9, l: realFt(12, 6) });
  assert.equal(readCarpetNote(rollCutNote('CR-1', 9, 0, 12, 0, false))?.waste, true);
  const p = readCarpetNote(pieceNote('CP-2', 4, 0, 6, 0));
  assert.equal(p?.kind, 'piece');
  assert.equal(p?.ref, 'CP-2');
  assert.equal(p?.size, '4ft × 6ft');
});

test('feet used from a roll add up and an edited quantity is caught', () => {
  const lines = [{ note: rollCutNote('CR-1', 9, 0, 10, 0, true) }, { note: rollCutNote('CR-1', 9, 0, 5, 0, true) }, { note: rollCutNote('CR-2', 9, 0, 7, 0, true) }];
  assert.equal(usedFromRoll(lines, 'CR-1'), 15);
  assert.equal(cutMismatch({ note: lines[0].note, baseUnit: 'sqft', baseQuantity: 90 }), null);
  assert.deepEqual(cutMismatch({ note: lines[0].note, baseUnit: 'sqft', baseQuantity: 80 }), { ref: 'CR-1', want: 90, have: 80 });
});

test('a roll cut gives total, strip and leftover, and flags problems', () => {
  const base = { rollWidth: 12, rollLeft: 50, width: 9, length: 10, perSqft: 40, unit: 'sqft', rateText: null };
  const r = rollCut(base);
  assert.deepEqual([r.area, r.qty, r.rate, r.total, r.strip, r.leftoverSqft, r.error], [90, 90, 40, 3600, 3, 30, null]);
  assert.equal(rollCut({ ...base, width: 13 }).error, 'widthTooBig');
  assert.equal(rollCut({ ...base, length: 51 }).error, 'lengthTooBig');
  assert.equal(rollCut({ ...base, perSqft: 0 }).error, 'rate');
  const own = rollCut({ ...base, perSqft: 0, rateText: 25 });
  assert.deepEqual([own.rate, own.total, own.error], [25, 2250, null]);
});
