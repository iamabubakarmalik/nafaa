import { DEFAULT_PRICE_GUARD, jumpDeclined, priceJump, readPriceGuard } from './channel-price';
import { StockPushService } from './stock-push.service';

const guard = DEFAULT_PRICE_GUARD;

describe('price guard: priceJump', () => {
  it('first push of the Kissan Mall sprayer links (Daraz 650/350/200 → fertilizer 390/200/120) is held', () => {
    expect(priceJump({ want: 390, data: { channelPrice: 650 }, guard })).toMatchObject({ first: true, current: 650, pct: -40 });
    expect(priceJump({ want: 200, data: { channelPrice: 350 }, guard })).toMatchObject({ first: true });
    expect(priceJump({ want: 120, data: { channelPrice: 200 }, guard })).toMatchObject({ first: true });
  });

  it('first push within 40% goes ahead', () => {
    expect(priceJump({ want: 600, data: { channelPrice: 650 }, guard })).toBeNull();
    expect(priceJump({ want: 800, data: { channelPrice: 650 }, guard })).toBeNull();
  });

  it('first push 40% or more above the channel price is held as well', () => {
    expect(priceJump({ want: 1000, data: { channelPrice: 650 }, guard })).toMatchObject({ first: true });
  });

  it('later pushes: held at 40% cheaper or 150% dearer, sent in between', () => {
    const agreed = { syncedPrice: 1000, syncedAt: '2026-11-01T00:00:00Z', channelPrice: 1000 };
    expect(priceJump({ want: 590, data: agreed, guard })).toMatchObject({ first: false, pct: -41 });
    expect(priceJump({ want: 650, data: agreed, guard })).toBeNull();
    expect(priceJump({ want: 2400, data: agreed, guard })).toBeNull();
    expect(priceJump({ want: 2600, data: agreed, guard })).toMatchObject({ first: false, pct: 160 });
  });

  it('no channel price read yet, guard off, or same price: nothing to hold', () => {
    expect(priceJump({ want: 390, data: {}, guard })).toBeNull();
    expect(priceJump({ want: 390, data: { channelPrice: 650 }, guard: { ...guard, on: false } })).toBeNull();
    expect(priceJump({ want: 650, data: { channelPrice: 650.4 }, guard })).toBeNull();
  });

  it('channel setting: limits read with safe defaults and bounds', () => {
    expect(readPriceGuard(undefined)).toEqual(DEFAULT_PRICE_GUARD);
    expect(readPriceGuard({ dropPct: 20, risePct: 'x', on: false })).toEqual({ on: false, dropPct: 20, risePct: 150, firstPct: 40 });
    expect(readPriceGuard({ dropPct: 120, firstPct: 1 })).toMatchObject({ dropPct: 95, firstPct: 5 });
  });

  it('a declined jump is remembered for the same Nafaa price only', () => {
    expect(jumpDeclined({ priceGuardDeclined: { nafaaPrice: 390 } }, 390)).toBe(true);
    expect(jumpDeclined({ priceGuardDeclined: { nafaaPrice: 390 } }, 420)).toBe(false);
    expect(jumpDeclined({}, 390)).toBe(false);
  });
});

describe('price guard in the shared price push (every channel and caller)', () => {
  function setup(type: 'DARAZ' | 'SHOPIFY' | 'WOOCOMMERCE', maps: any[]) {
    const sent: any[] = [];
    const updates: any[] = [];
    const ch = { id: 'ch1', tenantId: 't1', type, shopId: null, displayName: 'Kissan Mall', config: { priceFrom: 'NAFAA' } };
    const prisma: any = {
      shopStock: { findMany: async () => [] },
      productChannelMapping: {
        findMany: async () => maps,
        update: async (q: any) => { updates.push(q); return {}; },
        updateMany: async () => ({ count: 0 }),
      },
      channelSyncLog: { createMany: async () => ({}) },
      syncLog: { create: async () => ({}) },
    };
    const client = { isConnected: () => true, pushPrices: async (_i: any, items: any[]) => { sent.push(...items); } };
    const svc = new StockPushService(prisma, client as any, client as any, client as any, { nafaaChanged: async () => ({}) } as any);
    return { svc, ch: ch as any, sent, updates };
  }

  const sprayer = (id: string, sku: string, nafaa: number, daraz: number) => ({
    id, productId: 'dap', variantId: `v-${id}`, externalProductId: '123', externalVariantId: `sku-${id}`, externalSku: sku,
    externalTitle: `Knapsack Backpack Sprayer — ${sku}`, externalData: { channelPrice: daraz, channelPriceAt: '2026-11-01T00:00:00Z' },
    priceOverride: null, compareAtPrice: null, priceHold: null,
    product: { price: nafaa, hasVariants: true }, variant: { price: nafaa },
  });

  it.each(['DARAZ', 'SHOPIFY', 'WOOCOMMERCE'] as const)('%s: the fertilizer prices are not pushed to the sprayer; links wait with "big-jump"', async (type) => {
    const { svc, ch, sent, updates } = setup(type, [
      sprayer('a', 'T556925-Brown', 390, 650), sprayer('b', 'T556736-Brown', 200, 350), sprayer('c', 'T556391-Brown', 120, 200),
    ]);
    const res = await svc.pushPricesFor(ch);
    expect(sent).toEqual([]);
    expect(res).toMatchObject({ sent: 0, held: 3 });
    const holds = updates.filter((u) => u.data.priceHold);
    expect(holds.map((u) => u.data.priceHold.reason)).toEqual(['big-jump', 'big-jump', 'big-jump']);
    expect(holds[0].data.priceHold).toMatchObject({ nafaaPrice: 390, channelPrice: 650, jumpPct: -40, firstPush: true });
  });

  it('"Sync now" (force) does not get past the guard', async () => {
    const { svc, ch, sent } = setup('DARAZ', [sprayer('a', 'T556925-Brown', 390, 650)]);
    await svc.pushPricesFor(ch, {}, true);
    expect(sent).toEqual([]);
  });

  it('"Phir bhi bhejein" (explicit merchant decision) sends the price', async () => {
    const { svc, ch, sent } = setup('DARAZ', [{ ...sprayer('a', 'T556925-Brown', 390, 650), priceHold: { reason: 'big-jump' } }]);
    const res = await svc.pushPricesFor(ch, {}, true, { explicit: true });
    expect(res.sent).toBe(1);
    expect(sent[0]).toMatchObject({ price: 390, externalSku: 'T556925-Brown' });
  });

  it('"Nahi": the declined price is neither sent nor asked again', async () => {
    const m = sprayer('a', 'T556925-Brown', 390, 650);
    const { svc, ch, sent, updates } = setup('DARAZ', [{ ...m, externalData: { ...m.externalData, priceGuardDeclined: { nafaaPrice: 390 } } }]);
    const res = await svc.pushPricesFor(ch);
    expect(sent).toEqual([]);
    expect(res.held).toBe(0);
    expect(updates.some((u) => u.data.priceHold)).toBe(false);
  });

  it('a normal price change still goes out', async () => {
    const m = sprayer('a', 'T556925-Brown', 600, 650);
    const { svc, ch, sent } = setup('SHOPIFY', [m]);
    await svc.pushPricesFor(ch);
    expect(sent).toHaveLength(1);
    expect(sent[0].price).toBe(600);
  });
});
