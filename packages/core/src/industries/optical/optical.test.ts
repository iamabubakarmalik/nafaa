import { test } from 'node:test';
import assert from 'node:assert/strict';
import {
  advanceChips, cleanPowerInput, daysFrom, deliveryLeft, emptyPower, eyeLine, fmtPower, frameSize, kindOf, labCostLooksWrong, nextOrderStep, orderStages,
  orderMessage, testBookedMessage, orderTotal, plusYear, powerErrors, powerOf, powerSummary, rxState, specErrors,
} from './index';

test('power is written the way a prescription reads', () => {
  assert.equal(fmtPower(-1.25), '-1.25');
  assert.equal(fmtPower(2), '+2.00');
  assert.equal(fmtPower(0), 'Plano');
  assert.equal(eyeLine({ rightSph: -1.25, rightCyl: -0.5, rightAxis: 180, rightAdd: 2 }, 'right'), '-1.25 / -0.50 × 180 · ADD +2.00');
  assert.equal(powerSummary({ rightSph: -1, leftSph: -1.5 }), 'R -1.00  ·  L -1.50');
  assert.equal(powerSummary({}), '');
});

test('power checks match the server limits', () => {
  assert.deepEqual(powerErrors({ rightSph: -1.25, leftSph: 0.5, pupilDistance: 62 }), {});
  assert.equal(powerErrors({ rightSph: -1.3 }).rightSph, 'sph');
  assert.equal(powerErrors({ leftSph: 31 }).leftSph, 'sph');
  assert.equal(powerErrors({ rightCyl: -0.5 }).rightAxis, 'axisNeeded');
  assert.equal(powerErrors({ rightCyl: -0.5, rightAxis: 181 }).rightAxis, 'axis');
  assert.equal(powerErrors({ rightAdd: 0.25 }).rightAdd, 'add');
  assert.equal(powerErrors({ pupilDistance: 90 }).pupilDistance, 'pd');
});

test('typed power turns into numbers and drops empty fields', () => {
  const d = { ...emptyPower(), rightSph: '-1.25', rightCyl: '-0.50', rightAxis: '179.6', leftSph: '-', pupilDistance: '62' };
  assert.deepEqual(powerOf(d), { rightSph: -1.25, rightCyl: -0.5, rightAxis: 180, pupilDistance: 62 });
  assert.equal(cleanPowerInput('rightSph', '--1.2.5x'), '-1.25');
  assert.equal(cleanPowerInput('rightAxis', '-18o'), '18');
});

test('order flow: lab for glasses, straight to ready for repairs', () => {
  assert.deepEqual(nextOrderStep('ORDERED', false), { to: 'SENT_TO_LAB', step: 'toLab' });
  assert.deepEqual(nextOrderStep('ORDERED', true), { to: 'READY', step: 'repaired' });
  assert.deepEqual(nextOrderStep('AT_LAB', false), { to: 'RECEIVED', step: 'fromLab' });
  assert.deepEqual(nextOrderStep('RECEIVED', false), { to: 'READY', step: 'fitted' });
  assert.equal(nextOrderStep('READY', false), null);
  assert.deepEqual(orderStages('READY', true).map((s) => s.done), [true, true, false]);
  assert.deepEqual(orderStages('RECEIVED', false).map((s) => s.done), [true, true, true, false, false]);
});

test('order money', () => {
  assert.equal(orderTotal({ framePrice: 3500, lensPrice: 2000, fittingCharge: 150.555 }), 5650.56);
  assert.equal(orderTotal({ framePrice: 3500, lensPrice: 2000, ownFrame: true }), 2000);
  assert.equal(deliveryLeft(5000, 3000), 2000);
  assert.equal(deliveryLeft(5000, 5200), 0);
  assert.deepEqual(advanceChips(5001), [2501, 5001]);
  assert.deepEqual(advanceChips(0), []);
  assert.equal(labCostLooksWrong(2500, 2000), true);
  assert.equal(labCostLooksWrong(0, 2000), false);
});

test('prescription expiry', () => {
  const now = new Date('2026-11-03T10:00:00Z');
  assert.equal(daysFrom('2026-11-10T07:00:00Z', now), 7);
  assert.equal(daysFrom('2026-11-02T12:00:00Z', now), -1);
  assert.equal(rxState({ isActive: true, expiryDate: '2026-12-01T12:00:00Z' }, now).state, 'soon');
  assert.equal(rxState({ isActive: true, expiryDate: '2027-06-01T12:00:00Z' }, now).state, 'ok');
  assert.equal(rxState({ isActive: true, expiryDate: '2026-10-01T12:00:00Z' }, now).state, 'expired');
  assert.equal(rxState({ isActive: false, expiryDate: '2027-06-01T12:00:00Z' }, now).state, 'inactive');
  assert.equal(rxState({ isActive: true }, now).state, 'open');
  assert.equal(plusYear('2026-11-03'), '2027-11-03');
  assert.equal(plusYear('2024-02-29'), '2025-03-01');
});

test('product kinds and specs', () => {
  assert.equal(kindOf('FRAME_FULL_RIM'), 'frame');
  assert.equal(kindOf('CONTACT_LENS_TORIC'), 'contact');
  assert.equal(kindOf('OTHER'), 'other');
  assert.equal(kindOf(null), null);
  assert.equal(frameSize(52, 18, 145), '52-18-145');
  assert.equal(frameSize(null, 18, 145), '');
  assert.equal(specErrors({ frameSizeMm: 52, bridgeSizeMm: 18, templeLengthMm: 145 }).size, undefined);
  assert.equal(specErrors({ frameSizeMm: 90 }).size, 'frameSize');
  assert.equal(specErrors({ warrantyMonths: 70 }).size, 'warranty');
  assert.equal(specErrors({ supportsMinSph: 2, supportsMaxSph: -2 }).range, 'sphRange');
});

test('whatsapp texts follow the shop language', () => {
  const o = { customer: 'Ali', number: 'LO-1', repair: false, ready: true, date: '5 Nov', due: 'Rs 500' };
  assert.match(orderMessage(o, 'en'), /your glasses are ready \(LO-1\)\. Balance: Rs 500/);
  assert.match(orderMessage(o, 'roman'), /chashma tayyar hai/);
  assert.match(orderMessage({ ...o, ready: false, due: null }, 'ur'), /5 Nov/);
  assert.match(orderMessage({ ...o, repair: true }, 'en'), /repaired/);
  assert.match(testBookedMessage({ customer: 'Ali', date: '5 Nov', slot: '11:00' }, 'roman'), /11:00 baje/);
});
