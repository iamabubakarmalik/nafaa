import { test } from 'node:test';
import assert from 'node:assert/strict';
import { alterationNext, daysFrom, dueOf, exchangeDiff, flowIndex, gridVariants, layawayEach, sellable, splitVariantName, tailoringNext, whenOf } from './index';

test('stitching steps run in order and end at hand-over', () => {
  assert.deepEqual(tailoringNext('QUOTED'), { to: 'CONFIRMED', step: 'confirm' });
  assert.equal(tailoringNext('QUALITY_CHECK')?.to, 'READY');
  assert.equal(tailoringNext('READY')?.to, 'DELIVER');
  assert.equal(tailoringNext('DELIVERED'), null);
  assert.equal(flowIndex('EMBROIDERY'), 2);
  assert.equal(alterationNext('READY')?.to, 'DELIVER');
});

test('size grid skips existing variants and builds codes', () => {
  const v = gridVariants('ls2401', ['S', 'M'], [['Off white', '#f8f0e3'], ['Black', '#000']], ['S / Black']);
  assert.deepEqual(v.map((x) => x.name), ['S / Off white', 'M / Off white', 'M / Black']);
  assert.equal(v[0].barcode, 'LS2401SOW');
  assert.equal(v[2].sku, 'LS2401-M-B');
  assert.deepEqual(gridVariants('x', [], [], []), []);
  assert.deepEqual(splitVariantName('M / Red'), { size: 'M', color: 'Red' });
});

test('holds, instalments and exchange money', () => {
  assert.equal(sellable(10, 3), 7);
  assert.equal(sellable(2, 5), 0);
  assert.equal(layawayEach(10000, 2500, 3), 2500);
  assert.equal(layawayEach(10000, 0, 0), 0);
  assert.deepEqual(exchangeDiff([{ qty: 1, unitRefund: 1800 }, { qty: 2, unitRefund: 500.5 }], 3000), { credit: 2801, diff: 199 });
  assert.equal(dueOf({ total: 100, paidAmount: 130 }), 0);
});

test('dates count in the business day', () => {
  const now = Date.parse('2026-11-03T10:00:00Z');
  assert.equal(daysFrom('2026-11-03T18:00:00Z', now), 0);
  assert.equal(daysFrom('2026-11-03T19:30:00Z', now, 300), 1);
  assert.deepEqual(whenOf('2026-11-01T10:00:00Z', false, now), { kind: 'late', days: 2 });
});
