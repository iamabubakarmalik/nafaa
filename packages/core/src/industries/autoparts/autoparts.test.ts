import { test } from 'node:test';
import assert from 'node:assert/strict';
import { badYears, fits, isReady, jobDue, jobIsLate, labourLines, nextJobStep, papersDue, partFits, plate, stepOf, waLink, yearRange } from './index';

test('a job moves from received to working, ready and handed back', () => {
  assert.equal(stepOf('DRAFT'), 0);
  assert.equal(stepOf('WAITING_PARTS'), 1);
  assert.equal(stepOf('COMPLETED'), 2);
  assert.equal(stepOf('DELIVERED'), 3);
  assert.deepEqual(nextJobStep('DRAFT'), { to: 'IN_PROGRESS', step: 'start' });
  assert.deepEqual(nextJobStep('IN_PROGRESS'), { to: 'COMPLETED', step: 'finish' });
  assert.deepEqual(nextJobStep('QUALITY_CHECK'), { to: 'DELIVER', step: 'deliver' });
  assert.equal(nextJobStep('CANCELLED'), null);
  assert.equal(isReady('READY_FOR_TEST'), true);
});

test('what is due and when a job is late', () => {
  assert.equal(jobDue({ total: 5000, paidAmount: 1500 }), 3500);
  assert.equal(jobDue({ total: 100, paidAmount: 500 }), 0);
  const now = Date.parse('2026-11-03T12:00:00Z');
  assert.equal(jobIsLate({ status: 'IN_PROGRESS', promisedAt: '2026-11-03T08:00:00Z' }, now), true);
  assert.equal(jobIsLate({ status: 'COMPLETED', promisedAt: '2026-11-03T08:00:00Z' }, now), false);
  assert.equal(jobIsLate({ status: 'IN_PROGRESS', promisedAt: '2026-11-04T08:00:00Z' }, now), false);
  assert.equal(jobIsLate({ status: 'DELIVERED', promisedAt: '2026-11-01T08:00:00Z' }, now), false);
});

test('vehicle papers ending soon come first', () => {
  const now = Date.parse('2026-11-03T00:00:00Z');
  const rows = papersDue({ insuranceExpiry: '2026-11-20', tokenTaxExpiry: '2026-10-30', fitnessExpiry: '2027-06-01' }, 30, now);
  assert.deepEqual(rows.map((r) => r.kind), ['token', 'insurance']);
  assert.ok(rows[0].left < 0);
});

test('a part fits by company, model and years', () => {
  const corolla2016 = { makeId: 'toyota', modelId: 'corolla', year: 2016 };
  assert.equal(fits({ makeId: 'toyota' }, corolla2016), true);
  assert.equal(fits({ makeId: 'honda' }, corolla2016), false);
  assert.equal(fits({ makeId: 'toyota', modelId: 'yaris' }, corolla2016), false);
  assert.equal(fits({ makeId: 'toyota', modelId: 'corolla', yearFrom: 2017 }, corolla2016), false);
  assert.equal(fits({ makeId: 'toyota', modelId: 'corolla', yearFrom: 2014, yearTo: 2018 }, corolla2016), true);
  assert.equal(partFits({ universal: true, fitments: [{ makeId: 'honda' }] }, corolla2016), true);
  assert.equal(partFits({ fitments: [] }, corolla2016), true);
  assert.equal(partFits({ fitments: [{ makeId: 'honda' }] }, corolla2016), false);
});

test('year ranges and small helpers', () => {
  assert.deepEqual(yearRange({ yearFrom: 2010, yearTo: 2015 }), { kind: 'both', from: 2010, to: 2015 });
  assert.deepEqual(yearRange({ yearTo: 2015 }), { kind: 'to', to: 2015 });
  assert.equal(yearRange({}).kind, 'any');
  assert.equal(badYears(2020, 2015), true);
  assert.equal(plate('  lea   1234 '), 'LEA 1234');
  assert.equal(waLink('0300 1234567', 'hi a'), 'https://wa.me/923001234567?text=hi%20a');
  assert.equal(waLink('123', 'x'), undefined);
  assert.deepEqual(labourLines([{ description: ' Oil change ', amount: 800 }, { description: '', amount: 5 }]), [{ description: 'Oil change', hours: 1, ratePerHour: 800 }]);
});
