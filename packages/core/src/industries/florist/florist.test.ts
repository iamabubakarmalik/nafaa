import { test } from 'node:test';
import assert from 'node:assert/strict';
import { blankDraft, categoryGroup, draftProblems, freshState, freshUntilDate, nextStatus, orderDue, toOrderBody, weddingDue } from './index';

test('order steps and money', () => {
  assert.equal(nextStatus('CONFIRMED'), 'IN_PREPARATION');
  assert.equal(nextStatus('OUT_FOR_DELIVERY'), null);
  assert.equal(orderDue({ totalAmount: 5000, advancePaid: 1500 }), 3500);
  assert.equal(weddingDue({ quotedAmount: 100000, advanceAmount: 120000 }), 0);
});

test('freshness follows the date', () => {
  assert.equal(freshState('2026-11-02', '2026-11-03'), 'wilted');
  assert.equal(freshState('2026-11-03', '2026-11-03'), 'today');
  assert.equal(freshState('2026-11-05', '2026-11-03'), 'soon');
  assert.equal(freshState('2026-11-20', '2026-11-03'), 'ok');
  assert.equal(freshUntilDate('2026-11-03', 5), '2026-11-08');
});

test('delivery draft needs recipient, phone and address; anonymous hides the sender', () => {
  const d = blankDraft('2026-11-03');
  assert.deepEqual(draftProblems(d, '2026-11-03'), ['recipient', 'phone', 'address']);
  const ok = { ...d, recipientName: 'Sara', recipientPhone: '0300 1234567', deliveryAddress: 'House 4', senderName: 'Ali', isAnonymous: true };
  assert.deepEqual(draftProblems(ok, '2026-11-03'), []);
  assert.equal(toOrderBody('s1', ok).senderName, undefined);
  assert.deepEqual(draftProblems({ ...d, orderType: 'WALK_IN' }, '2026-11-03'), []);
});

test('category groups', () => {
  assert.equal(categoryGroup('ROSE_RED'), 'stem');
  assert.equal(categoryGroup('BOUQUET_BIRTHDAY'), 'made');
  assert.equal(categoryGroup('WEDDING_GARLAND'), 'decor');
  assert.equal(categoryGroup('SUCCULENT'), 'plant');
  assert.equal(categoryGroup('TEDDY_BEAR'), 'gift');
});
