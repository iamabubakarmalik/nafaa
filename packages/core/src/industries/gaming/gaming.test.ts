import { test } from 'node:test';
import assert from 'node:assert/strict';
import { clockText, liveBill, sessionTotal } from './index';

const MIN = 60_000;

test('the bill follows the minutes played at the hourly rate', () => {
  const b = liveBill({ startedAt: 0, totalPauseMinutes: 0, ratePerHour: 300 }, 90 * MIN);
  assert.equal(b.actualMinutes, 90);
  assert.equal(b.currentAmount, 450);
});

test('pauses are not billed, and a running pause counts too', () => {
  const closed = liveBill({ startedAt: 0, totalPauseMinutes: 20, ratePerHour: 600 }, 60 * MIN);
  assert.equal(closed.billableMinutes, 40);
  assert.equal(closed.currentAmount, 400);
  const open = liveBill({ startedAt: 0, totalPauseMinutes: 0, paused: true, pausedAt: 50 * MIN, ratePerHour: 600 }, 60 * MIN);
  assert.equal(open.pauseMinutes, 10);
  assert.equal(open.billableMinutes, 50);
});

test('the station minimum is billed for a short session', () => {
  assert.equal(liveBill({ startedAt: 0, totalPauseMinutes: 0, ratePerHour: 240, minimumMinutes: 15 }, 3 * MIN).currentAmount, 60);
});

test('session total with food and discount; discount above the bill is refused', () => {
  assert.deepEqual(sessionTotal({ billableMinutes: 45, ratePerHour: 400, food: 150, extra: 50, discount: 100 }), { base: 300, gross: 500, total: 400 });
  assert.equal(sessionTotal({ billableMinutes: 30, ratePerHour: 200, discount: 500 }), null);
});

test('clock text', () => {
  assert.equal(clockText(3909), '1:05:09');
  assert.equal(clockText(59), '0:00:59');
  assert.equal(clockText(-4), '0:00:00');
});
