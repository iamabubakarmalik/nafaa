import { channelMoved, priceDecision, recoveryCandidate } from './channel-price';
import { autoImportAllowed, isNewItem, newProductPicks } from './catalog-watch';
import { dueNow } from './catalog-watch.service';
import { contentDecision, contentHash, handEditQty, isContentEcho, orderUnits } from './sync-rules';
import { channelPriceUpdates, parseInventoryHook, parseProductHook } from './product-hooks';
import { pullTarget } from './price-sync';
import { readWebsiteConfig } from './website-config';
import { NO_PRICE_RULE } from './channel-price';

const now = Date.parse('2026-11-09T12:00:00Z');
const ago = (min: number) => new Date(now - min * 60_000).toISOString();

describe('price source: settings', () => {
  it('older channels keep their behaviour: price push on = NAFAA, off = NONE', () => {
    expect(readWebsiteConfig({ pushPrice: true }).priceFrom).toBe('NAFAA');
    expect(readWebsiteConfig({}).priceFrom).toBe('NONE');
    expect(readWebsiteConfig({ priceFrom: 'WEBSITE', pushPrice: true }).pushPrice).toBe(false);
    expect(readWebsiteConfig({ priceFrom: 'LATEST' }).pushPrice).toBe(true);
  });
});

describe('price source: drift after push', () => {
  const pushed = { pushedPrice: 1200, pushedPriceAt: ago(120), nafaaPrice: 1200, nafaaPriceAt: ago(200) };
  it('a channel price read after the push is a channel change', () => {
    expect(channelMoved({ ...pushed, channelPrice: 1150, channelPriceAt: ago(10) })).toBe(true);
  });
  it('a read that started before the push (slow list racing a push) is not', () => {
    expect(channelMoved({ ...pushed, channelPrice: 1150, channelPriceAt: ago(130) })).toBe(false);
  });
  it('the channel showing the pushed price is not a change', () => {
    expect(channelMoved({ ...pushed, channelPrice: 1200, channelPriceAt: ago(10) })).toBe(false);
  });
  it('a pull is the new agreement: the same channel price later is not a change', () => {
    expect(channelMoved({ ...pushed, syncedPrice: 1150, syncedAt: ago(5), channelPrice: 1150, channelPriceAt: ago(10) })).toBe(false);
  });
});

describe('price source: decisions', () => {
  const base = { pushedPrice: 1200, pushedPriceAt: ago(120), nafaaPrice: 1200, nafaaPriceAt: ago(200) };
  const changedOnSite = { ...base, channelPrice: 1150, channelPriceAt: ago(10) };

  it('NAFAA: a website change is held, never silently reverted', () => {
    expect(priceDecision({ from: 'NAFAA', want: 1200, data: changedOnSite, now }).step).toBe('hold');
    // "Sync now" does not override it either.
    expect(priceDecision({ from: 'NAFAA', want: 1200, data: changedOnSite, now, force: true }).step).toBe('hold');
  });
  it('NAFAA: a Nafaa price changed after the website change goes out', () => {
    const d = { ...changedOnSite, nafaaPrice: 1200, nafaaPriceAt: ago(200) };
    expect(priceDecision({ from: 'NAFAA', want: 1250, data: d, now }).step).toBe('push');
  });
  it('NAFAA: older links without a recorded Nafaa time are held, not pushed', () => {
    const d = { pushedPrice: 1200, pushedPriceAt: ago(120), channelPrice: 1150, channelPriceAt: ago(10) };
    expect(priceDecision({ from: 'NAFAA', want: 1250, data: d, now }).step).toBe('hold');
  });
  it('NAFAA: a Nafaa change with no website change is pushed; nothing changed is skipped', () => {
    expect(priceDecision({ from: 'NAFAA', want: 1300, data: { ...base, channelPrice: 1200, channelPriceAt: ago(110) }, now }).step).toBe('push');
    expect(priceDecision({ from: 'NAFAA', want: 1200, data: { ...base, channelPrice: 1200, channelPriceAt: ago(110) }, now }).step).toBe('skip');
  });
  it('NAFAA: a held link whose website went back to the agreed price clears', () => {
    const d = { ...base, channelPrice: 1200, channelPriceAt: ago(1) };
    expect(priceDecision({ from: 'NAFAA', want: 1200, data: d, now, held: true }).step).toBe('agree');
  });
  it('WEBSITE: a website change is taken into Nafaa; a Nafaa-only change is not sent', () => {
    expect(priceDecision({ from: 'WEBSITE', want: 1200, data: changedOnSite, now }).step).toBe('pull');
    expect(priceDecision({ from: 'WEBSITE', want: 1300, data: { ...base, channelPrice: 1200, channelPriceAt: ago(110) }, now }).step).toBe('skip');
  });
  it('LATEST: the side that changed last wins', () => {
    expect(priceDecision({ from: 'LATEST', want: 1200, data: changedOnSite, now }).step).toBe('pull');
    const nafaaLater = { ...changedOnSite, nafaaPrice: 1200, nafaaPriceAt: ago(200) };
    expect(priceDecision({ from: 'LATEST', want: 1250, data: nafaaLater, now }).step).toBe('push');
    const siteLater = { ...base, nafaaPrice: 1250, nafaaPriceAt: ago(30), channelPrice: 1150, channelPriceAt: ago(10) };
    expect(priceDecision({ from: 'LATEST', want: 1250, data: siteLater, now }).step).toBe('pull');
  });
  it('NONE: nothing either way', () => {
    expect(priceDecision({ from: 'NONE', want: 1200, data: changedOnSite, now }).step).toBe('skip');
  });
  it('a pulled price lands on the link with a price rule, else on the product/size/branch', () => {
    const cfg = { priceRule: NO_PRICE_RULE, websitePriceTo: 'PRODUCT' as const };
    expect(pullTarget(cfg, { variantId: null, priceOverride: null }, false)).toBe('PRODUCT');
    expect(pullTarget(cfg, { variantId: 'v1', priceOverride: null }, false)).toBe('VARIANT');
    expect(pullTarget(cfg, { variantId: null, priceOverride: null }, true)).toBe('SHOP');
    expect(pullTarget({ ...cfg, priceRule: { mode: 'PERCENT', value: 10, rounding: 'NONE' } }, { variantId: null, priceOverride: null }, false)).toBe('CHANNEL');
    // FIXED 0 changes nothing, so it is not a rule (Kissan Mall's setting).
    expect(pullTarget({ ...cfg, priceRule: { mode: 'FIXED', value: 0, rounding: 'NONE' } }, { variantId: null, priceOverride: null }, false)).toBe('PRODUCT');
    expect(pullTarget({ ...cfg, websitePriceTo: 'CHANNEL' }, { variantId: null, priceOverride: null }, false)).toBe('CHANNEL');
  });
});

describe('never loop: our own push does not come back as a website change', () => {
  it('a product webhook carrying the state from before (or at) our push is ignored', () => {
    const maps = [{ id: 'm1', externalProductId: '10', externalVariantId: '20', externalData: { channelPrice: 1200, channelPriceAt: ago(5), pushedPrice: 1200 } }];
    const echo = parseProductHook('SHOPIFY', 'products/update', { id: 10, updated_at: ago(6), variants: [{ id: 20, price: '1150.00' }] }, now)!;
    expect(channelPriceUpdates(maps, [echo])).toEqual([]);
    const same = parseProductHook('SHOPIFY', 'products/update', { id: 10, updated_at: ago(4), variants: [{ id: 20, price: '1200.00' }] }, now)!;
    expect(channelPriceUpdates(maps, [same])).toEqual([]);
    const merchant = parseProductHook('SHOPIFY', 'products/update', { id: 10, updated_at: ago(1), variants: [{ id: 20, price: '1150.00' }] }, now)!;
    expect(channelPriceUpdates(maps, [merchant])).toEqual([{ id: 'm1', data: expect.objectContaining({ channelPrice: 1150, channelPriceAt: ago(1) }) }]);
  });
  it('after a pull, the next pass is quiet (agreed) and does not push back', () => {
    const d = { pushedPrice: 1200, pushedPriceAt: ago(120), syncedPrice: 1150, syncedAt: ago(1), channelPrice: 1150, channelPriceAt: ago(10), nafaaPrice: 1150, nafaaPriceAt: ago(1) };
    expect(priceDecision({ from: 'LATEST', want: 1150, data: d, now }).step).toBe('skip');
  });
  it('content Nafaa pushed comes back from the channel as an echo, not a change', () => {
    const s = { pushedTitle: 'Urea 50kg', pushedAt: ago(2) };
    expect(isContentEcho(s, { title: 'Urea 50kg', updatedAt: ago(1) })).toBe(true);
    expect(isContentEcho(s, { title: 'Urea 50 kg bag', updatedAt: ago(1) })).toBe(false);
    expect(isContentEcho(s, { title: 'Urea 50kg', updatedAt: new Date(now + 10 * 60_000).toISOString() })).toBe(false);
  });
  it('stock: the quantity Nafaa pushed coming back is not a hand edit', () => {
    expect(handEditQty({ seen: 10, seenAt: ago(1), pushed: 10, pushedAt: ago(2) })).toBeNull();
    expect(handEditQty({ seen: 7, seenAt: ago(3), pushed: 10, pushedAt: ago(2) })).toBeNull();
  });
});

describe('stock edited by hand: not our push, not an order', () => {
  it('a hand edit after the push is the difference', () => {
    expect(handEditQty({ seen: 15, seenAt: ago(1), pushed: 10, pushedAt: ago(5) })).toBe(5);
    expect(handEditQty({ seen: 6, seenAt: ago(1), pushed: 10, pushedAt: ago(5) })).toBe(-4);
  });
  it('an order on the channel is not a hand edit', () => {
    expect(handEditQty({ seen: 8, seenAt: ago(1), pushed: 10, pushedAt: ago(5), soldSince: 2 })).toBeNull();
  });
  it('an order and a hand edit together: only the hand part', () => {
    expect(handEditQty({ seen: 15, seenAt: ago(1), pushed: 10, pushedAt: ago(5), soldSince: 2 })).toBe(7);
  });
  it('a cancelled order restocked by the channel is not a hand edit', () => {
    expect(handEditQty({ seen: 12, seenAt: ago(1), pushed: 10, pushedAt: ago(5), cancelledSince: 2 })).toBeNull();
  });
  it('nothing is taken when Nafaa never sent a quantity', () => {
    expect(handEditQty({ seen: 12, seenAt: ago(1), pushed: null, pushedAt: null })).toBeNull();
  });
  it('order units match by channel variant, or by product for items without one', () => {
    const items = [{ externalProductId: '1', externalVariantId: '11', quantity: 2 }, { externalProductId: '2', quantity: 3 }, { externalProductId: '1', externalVariantId: '12', quantity: 5 }];
    expect(orderUnits(items, '1', '11')).toBe(2);
    expect(orderUnits(items, '2', null)).toBe(3);
  });
  it('Shopify inventory webhook body is read', () => {
    expect(parseInventoryHook({ inventory_item_id: 55, location_id: 9, available: 4, updated_at: ago(1) }, now)).toEqual({ inventoryItemId: '55', locationId: '9', available: 4, at: ago(1) });
    expect(parseInventoryHook({ inventory_item_id: 55 }, now)).toBeNull();
  });
});

describe('content sync', () => {
  const h = (t: string) => contentHash({ title: t, description: '', images: [] });
  it('the first time both sides are seen is a baseline, never a copy', () => {
    expect(contentDecision('LATEST', { nafaaSeen: h('A'), channelSeen: h('B') }).step).toBe('baseline');
  });
  it('by source: Nafaa pushes, Website pulls, Dono = later side', () => {
    const s = { nafaaSynced: h('A'), channelSynced: h('A2'), nafaaSeen: h('A'), channelSeen: h('B'), channelSeenAt: ago(1) };
    expect(contentDecision('WEBSITE', s).step).toBe('pull');
    expect(contentDecision('NAFAA', s).step).toBe('skip');
    expect(contentDecision('LATEST', s).step).toBe('pull');
    const both = { ...s, nafaaSeen: h('C'), nafaaSeenAt: ago(0.5) };
    expect(contentDecision('LATEST', both).step).toBe('push');
  });
  it('HTML formatting alone is not a change', () => {
    expect(contentHash({ title: 'X', description: '<p>Acha&nbsp;khaad</p>', images: [] })).toBe(contentHash({ title: 'X', description: 'Acha khaad', images: [] }));
  });
});

describe('auto import gating', () => {
  const remote = [
    { externalProductId: 'new', status: 'active', variants: [{ externalVariantId: 'n1' }] },
    { externalProductId: 'draft', status: 'draft', variants: [{ externalVariantId: 'd1' }] },
    { externalProductId: 'sku', status: 'active', variants: [{ externalVariantId: 's1' }] },
    { externalProductId: 'half', status: 'active', variants: [{ externalVariantId: 'h1' }, { externalVariantId: 'h2' }] },
    { externalProductId: 'old', status: 'active', variants: [{ externalVariantId: 'o1' }] },
  ];
  const r = (p: string, v: string, kind: string | null = null) => ({ item: { p: { externalProductId: p }, v: { externalVariantId: v } }, match: kind ? { kind } : null });
  const results = [r('new', 'n1'), r('draft', 'd1'), r('sku', 's1', 'sku'), r('half', 'h1'), r('old', 'o1')];
  it('only new, live, fully unlinked listings with no Nafaa match', () => {
    const picks = newProductPicks({ remote, results, isNew: (p) => p.externalProductId !== 'old' });
    expect(picks).toEqual(['new']);
  });
  it('items open on the first watch run are the baseline, not new', () => {
    const state = { seen: ['a', 'b'], firstSeen: { c: ago(10) } };
    expect(isNewItem(state, 'a')).toBe(false);
    expect(isNewItem(state, 'c')).toBe(true);
    expect(isNewItem(state, 'z')).toBe(true);
    expect(isNewItem(null, 'z')).toBe(false);
    expect(isNewItem(null, 'z', true)).toBe(true);
  });
  it('needs the setting, a pushing channel and a branch', () => {
    expect(autoImportAllowed({ autoImport: true }, 'shopify', 's1')).toBe(true);
    expect(autoImportAllowed({ autoImport: false }, 'shopify', 's1')).toBe(false);
    expect(autoImportAllowed({ autoImport: true }, 'website', 's1')).toBe(false);
    expect(autoImportAllowed({ autoImport: true }, 'shopify', null)).toBe(false);
  });
});

describe('catalog watch schedule', () => {
  it('a run that failed before recording a scan waits for the normal schedule', () => {
    expect(dueNow({ autoLink: true, catalogWatch: {} }, true, now)).toBe(true);
    expect(dueNow({ autoLink: true, catalogWatch: { lastRunAt: ago(10) } }, true, now)).toBe(false);
    expect(dueNow({ catalogWatch: { lastRunAt: ago(10), scan: { at: ago(10), items: 2000 } } }, false, now)).toBe(false);
    expect(dueNow({ catalogWatch: { scan: { at: ago(7 * 60), items: 2000 } } }, false, now)).toBe(true);
  });
});

describe('price recovery candidates', () => {
  it('a link Nafaa re-sent over a different website price is offered back', () => {
    const d = { pushedPrice: 1200, channelPrice: 1150, channelPriceAt: ago(30), driftPushes: 2, driftPushedAt: ago(60) };
    expect(recoveryCandidate(d)).toEqual({ channelPrice: 1150, nafaaPrice: 1200, at: ago(30) });
  });
  it('no drift push, or the website shows the pushed price: not a candidate', () => {
    expect(recoveryCandidate({ pushedPrice: 1200, channelPrice: 1150 })).toBeNull();
    expect(recoveryCandidate({ pushedPrice: 1200, channelPrice: 1200, driftPushes: 1, driftPushedAt: ago(60) })).toBeNull();
  });
  it('a push that replaced a website price keeps it for recovery', () => {
    const d = { pushedPrice: 1200, channelPrice: 1200, channelPriceBefore: { price: 1100, at: ago(90), by: ago(60) } };
    expect(recoveryCandidate(d)).toEqual({ channelPrice: 1100, nafaaPrice: 1200, at: ago(90) });
  });
  it('a link already decided after its last drift push is left out', () => {
    const d = { pushedPrice: 1200, channelPrice: 1150, driftPushes: 1, driftPushedAt: ago(60), priceRecovery: { at: ago(5), choice: 'nafaa' } };
    expect(recoveryCandidate(d)).toBeNull();
  });
});
