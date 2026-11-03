import { test } from 'node:test';
import assert from 'node:assert/strict';
import {
  agesOf, ageShape, birthdayMessage, birthdayProblem, buildable, cellsNeeded, fitsAge, groupOfYears, isLive, packMoney, packProblems, reminderDue, toyErrors,
  youngWithSmallParts,
} from './index';

test('age text shape and groups', () => {
  assert.deepEqual(ageShape({ ageMinYears: 3, ageMaxYears: 5 }), { kind: 'range', min: 3, max: 5 });
  assert.deepEqual(ageShape({ ageMinYears: 6 }), { kind: 'min', min: 6 });
  assert.deepEqual(ageShape({ ageGroup: 'KIDS_5_8Y' }), { kind: 'group', group: 'KIDS_5_8Y' });
  assert.deepEqual(ageShape(null), { kind: 'none' });
  assert.deepEqual(agesOf({ ageGroup: 'KIDS_5_8Y', ageGroups: ['KIDS_5_8Y', 'KIDS_8_12Y'] }), ['KIDS_5_8Y', 'KIDS_8_12Y']);
  assert.equal(fitsAge({ ageGroup: 'ALL_AGES' }, 'TODDLER_1_2Y'), true);
  assert.equal(fitsAge({ ageGroup: 'KIDS_5_8Y' }, 'TODDLER_1_2Y'), false);
  assert.equal(groupOfYears(0.2), 'NEWBORN_0_6M');
  assert.equal(groupOfYears(4), 'PRESCHOOL_3_5Y');
  assert.equal(groupOfYears(14), 'TEEN_14_PLUS');
});

test('cells that are not in the box', () => {
  assert.equal(cellsNeeded({ requiresBatteries: true, batteriesIncluded: false, batteryType: 'AA', batteryQuantity: 2 }), '2 x AA');
  assert.equal(cellsNeeded({ requiresBatteries: true, batteriesIncluded: false }), 'cell');
  assert.equal(cellsNeeded({ requiresBatteries: true, batteriesIncluded: true, batteryType: 'AA' }), null);
  assert.equal(cellsNeeded({ requiresBatteries: false }), null);
});

test('toy editor checks', () => {
  assert.deepEqual(toyErrors({ ageMinYears: 3, ageMaxYears: 5 }), {});
  assert.equal(toyErrors({ ageMinYears: 5, ageMaxYears: 3 }).age, 'ageOrder');
  assert.equal(toyErrors({ ageMinYears: -1 }).age, 'ageNegative');
  assert.equal(toyErrors({ requiresBatteries: true, batteryQuantity: 0 }).cells, 'cells');
  assert.equal(toyErrors({ mrp: 500, price: 600 }).mrp, 'mrp');
  assert.equal(youngWithSmallParts({ ageMinYears: 2, chokingHazard: true }), true);
  assert.equal(youngWithSmallParts({ ageMinYears: 4, chokingHazard: true }), false);
});

test('gift pack money, stock and dates', () => {
  const m = packMoney([{ quantity: 2, unitPrice: 1000 }, { quantity: 1, unitPrice: 500 }], 2000);
  assert.deepEqual(m, { original: 2500, savings: 500, pct: 20, dearer: false });
  assert.equal(packMoney([{ quantity: 1, unitPrice: 100 }], 150).dearer, true);
  assert.equal(packMoney([], 100).pct, 0);
  assert.equal(buildable([{ quantity: 2, stock: 9 }, { quantity: 1, stock: 3 }]), 3);
  assert.equal(buildable([{ quantity: 2, stock: 1 }]), 0);
  assert.equal(buildable([]), 0);
  const now = new Date('2026-11-10T00:00:00Z').getTime();
  assert.equal(isLive({ isActive: true }, now), true);
  assert.equal(isLive({ isActive: true, validUntil: '2026-11-01T00:00:00Z' }, now), false);
  assert.equal(isLive({ isActive: true, validFrom: '2026-12-01T00:00:00Z' }, now), false);
  assert.equal(isLive({ isActive: false }, now), false);
});

test('gift pack problems come in form order', () => {
  const ok = { name: 'Eid box', price: 2000, lines: [{ quantity: 1 }, { quantity: 2 }] };
  assert.deepEqual(packProblems(ok), []);
  assert.deepEqual(packProblems({ ...ok, name: ' ', lines: [{ quantity: 1 }] }), ['name', 'twoToys']);
  assert.deepEqual(packProblems({ ...ok, lines: [{ quantity: 1.5 }, { quantity: 1, hasVariants: true }] }), ['qty', 'variant']);
  assert.deepEqual(packProblems({ ...ok, price: 0, validFrom: '2026-12-02', validUntil: '2026-12-01' }), ['price', 'dates']);
});

test('birthdays: window, form checks and message', () => {
  const now = new Date('2026-11-10T00:00:00Z').getTime();
  const r = { isActive: true, reminderDaysBefore: 7, computed: { daysUntilBirthday: 5 } };
  assert.equal(reminderDue(r, now), true);
  assert.equal(reminderDue({ ...r, lastReminderSent: '2026-11-01T00:00:00Z' }, now), false);
  assert.equal(reminderDue({ ...r, computed: { daysUntilBirthday: 20 } }, now), false);
  const d = { childName: 'Ayaan', birthDate: '2020-05-01', parentName: 'Imran', phone: '03001234567', reminderDays: 7 };
  assert.equal(birthdayProblem(d, '2026-11-10'), null);
  assert.equal(birthdayProblem({ ...d, birthDate: '2027-01-01' }, '2026-11-10'), 'future');
  assert.equal(birthdayProblem({ ...d, phone: '0300' }, '2026-11-10'), 'phone');
  assert.equal(birthdayProblem({ ...d, reminderDays: 90 }, '2026-11-10'), 'days');
  assert.match(birthdayMessage({ parent: 'Imran', child: 'Ayaan', days: 1, turningAge: 6, shop: 'Toy Zone' }, 'en'), /birthday is tomorrow — turning 6/);
  assert.match(birthdayMessage({ parent: 'Imran', child: 'Ayaan', days: 0, turningAge: 6 }, 'roman'), /ki saalgirah aaj hai/);
});
