import { test } from 'node:test';
import assert from 'node:assert/strict';
import { planCycle, planLineCover, planProducts, planSteps, adviceLines, agriRate, certState, cnicOk, creditUse, deriveAgriKind, formatCnic, lateBy, needsGovtReg, orderTotals } from './index';

test('kind comes from category and name words', () => {
  assert.equal(deriveAgriKind('Khaad', 'Urea 50kg'), 'FERTILIZER');
  assert.equal(deriveAgriKind(null, 'Sundi spray'), 'INSECTICIDE');
  assert.equal(deriveAgriKind('Beej', 'Gandum 2024'), 'SEEDS');
  assert.equal(deriveAgriKind('', ''), 'OTHER');
  assert.equal(needsGovtReg('SEEDS'), true);
  assert.equal(needsGovtReg('FARM_TOOLS'), false);
});

test('bags convert to kilos and back by pack size', () => {
  assert.equal(agriRate('bag', 'kg', { packSize: 50, packUnit: 'kg' }), 50);
  assert.equal(agriRate('kg', 'bag', { packSize: 50, packUnit: 'kg' }), 0.02);
  assert.equal(agriRate('ton', 'kg'), 1000);
  assert.equal(agriRate('bottle', 'ml', { packSize: 500, packUnit: 'ml' }), 500);
  assert.equal(agriRate('litre', 'ml'), 1000);
});

test('registration state warns 60 days before expiry', () => {
  const now = Date.parse('2026-11-01T00:00:00Z');
  assert.equal(certState(null, now).state, 'none');
  assert.equal(certState('2026-10-01', now).state, 'expired');
  assert.equal(certState('2026-12-15', now).state, 'soon');
  assert.equal(certState('2027-06-01', now).state, 'ok');
});

test('order totals, credit and lateness', () => {
  const t = orderTotals([{ quantity: 10, pricePerUnit: 100, discount: 50 }, { quantity: 2, pricePerUnit: 25 }], { bulkDiscount: 100, deliveryCharges: 200 });
  assert.deepEqual(t, { subtotal: 1000, total: 1100 });
  assert.deepEqual(creditUse(150, 100), { used: 1, over: true });
  assert.deepEqual(creditUse(50, 0), { used: 0, over: false });
  const now = Date.parse('2026-11-01T00:00:00Z');
  assert.equal(lateBy(0, '2026-06-01', 60, now), null);
  assert.equal(lateBy(500, '2026-08-02', 60, now), 31);
});

test('CNIC format and check', () => {
  assert.equal(formatCnic('3520212345671'), '35202-1234567-1');
  assert.equal(cnicOk(''), true);
  assert.equal(cnicOk('35202-123'), false);
});

test('a plan moves to this or the next cycle', () => {
  const plan = { sowingStart: '2025-11-01', sowingEnd: '2025-11-30', harvestStart: '2026-04-10' };
  const a = planCycle(plan, '2026-10-20');
  assert.equal(a.start, '2026-11-01');
  assert.equal(a.toSow, 12);
  assert.equal(a.soon, true);
  const b = planCycle(plan, '2026-11-15');
  assert.equal(b.now, true);
  assert.equal(b.harvest, '2027-04-10');
  const c = planCycle(plan, '2026-12-05');
  assert.equal(c.start, '2027-11-01');
  assert.equal(c.soon, false);
});

test('older rows with other shapes still read', () => {
  assert.deepEqual(planProducts(['Urea', { name: 'DAP', perAcre: '1.5', unit: 'bag' }]).map((p) => [p.name, p.perAcre]), [['Urea', 0], ['DAP', 1.5]]);
  assert.deepEqual(planSteps([{ day: 20, what: 'Pani' }, 'Beej', { day: 5, what: '' }]).map((s) => s.what), ['Beej', 'Pani']);
  assert.deepEqual(adviceLines('Spray karein'), ['Spray karein']);
  assert.deepEqual(adviceLines([{ text: 'a' }, 'b', {}]), ['a', 'b']);
  assert.equal(planLineCover(2, 9), 4);
  assert.equal(planLineCover(0, 9), null);
});
