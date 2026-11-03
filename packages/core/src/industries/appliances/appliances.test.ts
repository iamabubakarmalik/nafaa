import { test } from 'node:test';
import assert from 'node:assert/strict';
import { addMonthsKey, amcProblems, categoryFromName, categoryRule, claimMoney, daysBetween, deliveryTotal, guarantorErrors, jobMoney, parseSerials, qistSchedule, soonestWarranty } from './index';

test('product type is guessed from the name and carries fitting flags', () => {
  assert.equal(categoryFromName('Haier 1.5 ton inverter AC'), 'AIR_CONDITIONER_INVERTER');
  assert.equal(categoryFromName('Dawlance fridge 9175'), 'REFRIGERATOR');
  assert.equal(categoryFromName('Pak fan ceiling fan'), 'FAN_CEILING');
  assert.equal(categoryFromName('wire'), null);
  assert.deepEqual(categoryRule('GEYSER_GAS'), { group: 'water', needsInstall: true, heavy: true });
  assert.equal(categoryRule('nothing').group, 'other');
});

test('job money: advance, taken now, khata and covered jobs', () => {
  assert.deepEqual(jobMoney({ charges: [3000, 500, 250], covered: false, advance: 1000, now: 1000 }), { total: 3750, owed: 2750, paid: 2000, tooMuch: false, left: 1750 });
  assert.equal(jobMoney({ charges: [1000], covered: false, advance: 0, now: 1500 }).tooMuch, true);
  assert.deepEqual(jobMoney({ charges: [1000], covered: true, advance: 0, now: 0 }), { total: 1000, owed: 0, paid: 0, tooMuch: false, left: 0 });
  assert.equal(deliveryTotal({ delivery: 1500, loading: '200', floor: 100 }), 1800);
});

test('month and day arithmetic stays inside the month', () => {
  assert.equal(addMonthsKey('2026-01-31', 1), '2026-02-28');
  assert.equal(addMonthsKey('2026-11-15', 12), '2027-11-15');
  assert.equal(addMonthsKey('2026-03-31', -1), '2026-02-28');
  assert.equal(daysBetween('2026-11-01', '2026-11-10'), 9);
  assert.equal(daysBetween('2026-11-10', '2026-11-01'), -9);
});

test('qist: equal instalments, the last one takes the rounding', () => {
  const s = qistSchedule(10000, 3, '2026-11-30');
  assert.equal(s.each, 3333.33);
  assert.deepEqual(s.rows.map((r) => r.due), ['2026-11-30', '2026-12-30', '2027-01-30']);
  assert.equal(s.rows[2].amount, 3333.34);
  assert.equal(Math.round(s.rows.reduce((a, r) => a + r.amount, 0) * 100) / 100, 10000);
  assert.equal(qistSchedule(500, 0, '2026-11-01').rows.length, 1);
});

test('claim money and guarantor checks', () => {
  assert.deepEqual(claimMoney({ claimedAmount: 10000, approvedAmount: 8000, receivedAmount: 3000 }), { pending: 5000, shortfall: 2000, recovery: 30 });
  assert.equal(claimMoney({ claimedAmount: 0, approvedAmount: 0, receivedAmount: 0 }).recovery, 0);
  assert.deepEqual(guarantorErrors({ name: 'A', phone: '', cnic: '35202-1234567-1' }), { name: 'name' });
  assert.deepEqual(guarantorErrors({ name: 'Ali', phone: '0300-1234567', cnic: '35202-1234567-1' }, '03001234567'), { phone: 'self' });
  assert.deepEqual(guarantorErrors({ name: 'Ali', phone: '123', cnic: '' }), { phone: 'phone', cnic: 'cnic' });
});

test('serials and warranty', () => {
  assert.deepEqual(parseSerials('ab123\nAB123, cd456  x'), ['AB123', 'CD456']);
  assert.deepEqual(soonestWarranty({ main: 200, compressor: 30, shop: null, motor: -5 }), { kind: 'compressor', days: 30 });
  assert.equal(soonestWarranty({ main: null }), null);
  assert.deepEqual(amcProblems({ product: '', value: 0, paid: 0, visits: 3 }), ['product', 'value']);
  assert.deepEqual(amcProblems({ product: 'AC', value: 5000, paid: 6000, visits: 3 }), ['paid']);
});
