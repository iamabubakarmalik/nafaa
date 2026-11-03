import { test } from 'node:test';
import assert from 'node:assert/strict';
import { heldAdvance, isApparel, isBall, isBat, isTeamLate, parseRoster, repairBill, salePct, teamLineRate, teamTotals } from './index';

test('team order totals: rate plus printing, discount and delivery', () => {
  const t = teamTotals([{ quantity: 11, unitPrice: 1500, printingPrice: 200 }, { quantity: 2, unitPrice: 800 }], 10, 500);
  assert.equal(t.subtotal, 11 * 1700 + 1600);
  assert.equal(t.discount, 2030);
  assert.equal(t.total, 20300 - 2030 + 500);
  assert.equal(t.pieces, 13);
  assert.equal(teamTotals([], 150, 0).total, 0);
});

test('printing list parser handles spaces, commas and missing numbers', () => {
  assert.deepEqual(parseRoster('Ali Raza 10 M\nUsman 7 L\nHamza, 18, XL\nCoach'), [
    { name: 'Ali Raza', number: '10', size: 'M' }, { name: 'Usman', number: '7', size: 'L' }, { name: 'Hamza', number: '18', size: 'XL' }, { name: 'Coach', number: '', size: '' },
  ]);
  assert.deepEqual(parseRoster('\n  \n'), []);
});

test('team rate applies at the team quantity and steps back, never over a hand rate', () => {
  const line = { unitPrice: 1000, basePrice: 1000, conversionRate: 1, baseQuantity: 11 };
  assert.equal(teamLineRate(line, { price: 800, min: 11 }), 800);
  assert.equal(teamLineRate({ ...line, baseQuantity: 5 }, { price: 800, min: 11 }), undefined);
  assert.equal(teamLineRate({ ...line, unitPrice: 800, baseQuantity: 5 }, { price: 800, min: 11 }), 1000);
  assert.equal(teamLineRate({ ...line, unitPrice: 900, baseQuantity: 5 }, { price: 800, min: 11 }), undefined);
  assert.equal(teamLineRate({ ...line, conversionRate: 12, basePrice: 12000, unitPrice: 12000, baseQuantity: 24 }, { price: 800, min: 11 }), 9600);
  assert.equal(teamLineRate(line, { price: 1200, min: 11 }), undefined);
  assert.equal(teamLineRate(line, { price: 800, min: 1 }), undefined);
});

test('repair bill uses the advance and never goes negative', () => {
  assert.deepEqual(repairBill(500, [{ quantity: 2, price: 150 }], 300), { partsTotal: 300, bill: 800, due: 500 });
  assert.equal(repairBill(100, [], 300).due, 0);
  assert.equal(heldAdvance(500, 200), 300);
});

test('late orders, sizes and sale percent', () => {
  assert.equal(isTeamLate({ status: 'READY', expectedDeliveryDate: '2026-11-01T00:00:00Z' }, '2026-11-03'), true);
  assert.equal(isTeamLate({ status: 'DELIVERED', expectedDeliveryDate: '2026-11-01' }, '2026-11-03'), false);
  assert.equal(isApparel('FOOTBALL_JERSEY'), true);
  assert.equal(isApparel('CRICKET_KIT_BAG'), false);
  assert.equal(isBat('CRICKET_BAT'), true);
  assert.equal(isBall('CRICKET_BALL'), true);
  assert.equal(salePct(2000, 1500), 25);
  assert.equal(salePct(1000, 1500), 0);
});
