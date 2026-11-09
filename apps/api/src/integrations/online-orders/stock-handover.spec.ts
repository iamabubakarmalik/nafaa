import { countOptedIn, handoverBlock, holdOnLink, pushedBefore, readHold, shopifyUntrackCalls, trackDecision, untrackCandidate } from './stock-handover';

describe('push guard (handoverBlock)', () => {
  it('blocks 0 on a link never pushed while the channel shows stock', () => {
    expect(handoverBlock({ want: 0, channelQty: 12, pushedBefore: false })).toBe('zero');
  });
  it('blocks a big drop (over 5 units and below half)', () => {
    expect(handoverBlock({ want: 3, channelQty: 40, pushedBefore: false })).toBe('drop');
  });
  it('lets a small drop through', () => {
    expect(handoverBlock({ want: 8, channelQty: 12, pushedBefore: false })).toBeNull();
    expect(handoverBlock({ want: 1, channelQty: 5, pushedBefore: false })).toBeNull();
  });
  it('lets a rise through', () => {
    expect(handoverBlock({ want: 50, channelQty: 12, pushedBefore: false })).toBeNull();
  });
  it('links pushed before keep working as they did', () => {
    expect(handoverBlock({ want: 0, channelQty: 12, pushedBefore: true })).toBeNull();
  });
  it('nothing to protect when the channel shows 0 or is unknown', () => {
    expect(handoverBlock({ want: 0, channelQty: 0, pushedBefore: false })).toBeNull();
    expect(handoverBlock({ want: 0, channelQty: null, pushedBefore: false })).toBeNull();
    expect(handoverBlock({ want: 0, channelQty: undefined, pushedBefore: false })).toBeNull();
  });
  it('a held link never pushes', () => {
    expect(handoverBlock({ want: 10, channelQty: 10, pushedBefore: true, held: true })).toBe('held');
  });
});

describe('hold on a new link (holdOnLink)', () => {
  const now = new Date('2026-11-09T10:00:00Z');
  it('starts held when Nafaa and channel differ', () => {
    expect(holdOnLink({ nafaaStock: 0, channelStock: 7, reason: 'import', now })).toEqual({ since: now.toISOString(), channelStock: 7, nafaaStock: 0, reason: 'import' });
  });
  it('starts normal when both are equal', () => {
    expect(holdOnLink({ nafaaStock: 7, channelStock: 7, reason: 'link', now })).toBeNull();
  });
  it('starts normal when the channel does not count stock or it is unknown', () => {
    expect(holdOnLink({ nafaaStock: 0, channelStock: 7, tracks: false, reason: 'link', now })).toBeNull();
    expect(holdOnLink({ nafaaStock: 3, channelStock: null, reason: 'link', now })).toBeNull();
  });
  it('treats negative channel stock as 0', () => {
    expect(holdOnLink({ nafaaStock: 0, channelStock: -2, reason: 'link', now })).toBeNull();
  });
});

describe('hold and push state helpers', () => {
  it('reads a stored hold', () => {
    expect(readHold({ since: 'x', channelStock: '4', nafaaStock: 1, reason: 'link' })).toEqual({ since: 'x', channelStock: 4, nafaaStock: 1, reason: 'link' });
    expect(readHold(null)).toBeNull();
    expect(readHold({})).toBeNull();
    expect(readHold({ since: 'x', channelStock: null, nafaaStock: 0, reason: 'odd' })?.reason).toBe('guard');
  });
  it('pushed before: lastPush, a recorded first push, or the merchant sent Nafaa stock', () => {
    expect(pushedBefore({ lastPush: null, externalData: null })).toBe(false);
    expect(pushedBefore({ lastPush: { at: 'x' } })).toBe(true);
    expect(pushedBefore({ lastPush: null, externalData: { firstStockPush: { from: 3, to: 3 } } })).toBe(true);
    expect(pushedBefore({ lastPush: null, externalData: { handoverAt: 'x' } })).toBe(true);
  });
});

describe('untracked items (trackDecision)', () => {
  it('never switches an untracked item to counted without an opt-in', () => {
    expect(trackDecision(false, false)).toBe('skip');
  });
  it('starts counting only after the merchant opted in', () => {
    expect(trackDecision(false, true)).toBe('start-count');
    expect(countOptedIn({ countOptInAt: '2026-11-09' })).toBe(true);
    expect(countOptedIn({})).toBe(false);
  });
  it('tracked or unknown items push as before', () => {
    expect(trackDecision(true, false)).toBe('push');
    expect(trackDecision(null, false)).toBe('push');
  });
});

describe('import fix (Shopify)', () => {
  it('builds one inventoryItemUpdate per item with tracked false', () => {
    const calls = shopifyUntrackCalls(['111', 'gid://shopify/InventoryItem/222', '111', '']);
    expect(calls).toHaveLength(2);
    expect(calls[0].variables).toEqual({ id: 'gid://shopify/InventoryItem/111', input: { tracked: false } });
    expect(calls[1].variables.id).toBe('gid://shopify/InventoryItem/222');
    expect(calls[0].query).toContain('inventoryItemUpdate(id: $id, input: $input)');
  });
  it('candidate: imported with 0 and now counted with nothing available', () => {
    expect(untrackCandidate({ importQty: 0, tracked: true, available: 0 })).toBe(true);
    expect(untrackCandidate({ importQty: 0, tracked: true, available: null })).toBe(true);
  });
  it('not a candidate when it has stock, is untracked already, or came in with stock', () => {
    expect(untrackCandidate({ importQty: 0, tracked: true, available: 4 })).toBe(false);
    expect(untrackCandidate({ importQty: 0, tracked: false, available: 0 })).toBe(false);
    expect(untrackCandidate({ importQty: 9, tracked: true, available: 0 })).toBe(false);
    expect(untrackCandidate({ importQty: null, tracked: true, available: 0 })).toBe(false);
  });
  it('a link known as untracked that got counted is a candidate', () => {
    expect(untrackCandidate({ importQty: null, tracked: true, available: 0, tracksStockOnLink: false })).toBe(true);
  });
});
