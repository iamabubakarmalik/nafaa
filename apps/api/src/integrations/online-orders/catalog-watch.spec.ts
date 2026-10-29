import { alertDue, itemKey, pickSureLinks, watchStep } from './catalog-watch';
import { CatalogWatchService, scanEveryMs } from './catalog-watch.service';
import { forEachLinkPage } from './link-sync';
import { priceAction } from './channel-price';

const remote = (id: string, title: string, vid: string | null = null, sku: string | null = null) => ({
  p: { externalProductId: id, title, image: null, status: 'active', hasVariants: !!vid, variants: [] as any[] },
  v: { externalVariantId: vid, title: vid ? 'M' : 'Default', sku, barcode: null, price: 100, stock: 1, image: null },
});

describe('auto-link picks only sure matches', () => {
  it('links SKU matches, never name or similar-name ones', () => {
    const a = remote('1', 'Tea', null, 'TEA');
    const b = remote('2', 'Kurta', '21', null);
    const c = remote('3', 'Soap', null, null);
    const links = pickSureLinks([
      { item: a, match: { productId: 'pTea', variantId: null, kind: 'sku', score: 1 } },
      { item: b, match: { productId: 'pKurta', variantId: 'vM', kind: 'name', score: 0.92 } },
      { item: c, match: { productId: 'pSoap', variantId: null, kind: 'fuzzy', score: 0.7 } },
    ] as any);
    expect(links).toEqual([{ externalProductId: '1', externalVariantId: null, productId: 'pTea', variantId: null, externalTitle: 'Tea', externalImage: null, externalSku: 'TEA' }]);
  });
});

describe('watch state', () => {
  const t0 = Date.parse('2026-10-29T10:00:00Z');
  it('first run is the baseline: nothing counts as new', () => {
    const r = watchStep(null, ['a', 'b'], t0);
    expect(r.state).toEqual({ seen: ['a', 'b'], firstSeen: {} });
    expect(r.staleNew).toBe(0);
  });
  it('a new item unlinked for 24 h is reported; linked ones drop out', () => {
    const r1 = watchStep({ seen: ['a', 'b'], firstSeen: {} }, ['a', 'b', 'c', 'd'], t0);
    expect(Object.keys(r1.state.firstSeen)).toEqual(['c', 'd']);
    const r2 = watchStep(r1.state, ['a', 'c', 'd'], t0 + 23 * 3600_000);
    expect(r2.staleNew).toBe(0);
    const r3 = watchStep(r2.state, ['a', 'c'], t0 + 25 * 3600_000);
    expect(r3.staleNew).toBe(1);
    expect(r3.state.firstSeen).toEqual({ c: new Date(t0).toISOString() });
  });
  it('alerts at most once a day', () => {
    expect(alertDue(null, t0)).toBe(true);
    expect(alertDue(new Date(t0 - 3600_000).toISOString(), t0)).toBe(false);
    expect(alertDue(new Date(t0 - 25 * 3600_000).toISOString(), t0)).toBe(true);
  });
  it('big channel lists are read less often', () => {
    expect(scanEveryMs(50)).toBe(30 * 60_000);
    expect(scanEveryMs(800)).toBe(2 * 3600_000);
    expect(scanEveryMs(5000)).toBe(6 * 3600_000);
  });
  it('item keys are short and stable', () => {
    expect(itemKey({ externalProductId: '1' }, { externalVariantId: null })).toBe(itemKey({ externalProductId: '1' }, { externalVariantId: null }));
    expect(itemKey({ externalProductId: '1' }, { externalVariantId: '2' })).toHaveLength(10);
  });
});

describe('price drift', () => {
  const now = Date.parse('2026-10-29T10:00:00Z');
  it('new price is pushed; same price on the channel is skipped', () => {
    expect(priceAction({ pushedPrice: 100, channelPrice: 100 }, 120, now)).toBe('push');
    expect(priceAction({ pushedPrice: 120, channelPrice: 120 }, 120, now)).toBe('skip');
    expect(priceAction({}, 120, now)).toBe('push');
  });
  it('channel changed it: re-sent, then backs off 30 min, 1 h, 2 h …', () => {
    expect(priceAction({ pushedPrice: 120, channelPrice: 150 }, 120, now)).toBe('drift');
    const at = new Date(now - 20 * 60_000).toISOString();
    expect(priceAction({ pushedPrice: 120, channelPrice: 150, driftPushes: 0, driftPushedAt: at }, 120, now)).toBe('skip');
    expect(priceAction({ pushedPrice: 120, channelPrice: 150, driftPushes: 1, driftPushedAt: new Date(now - 50 * 60_000).toISOString() }, 120, now)).toBe('skip');
    expect(priceAction({ pushedPrice: 120, channelPrice: 150, driftPushes: 1, driftPushedAt: new Date(now - 61 * 60_000).toISOString() }, 120, now)).toBe('drift');
    expect(priceAction({ pushedPrice: 120, channelPrice: 150, driftPushes: 10, driftPushedAt: new Date(now - 23 * 3600_000).toISOString() }, 120, now)).toBe('skip');
  });
  it('"Sync now" forces it', () => {
    expect(priceAction({ pushedPrice: 120, channelPrice: 120 }, 120, now, true)).toBe('push');
  });
});

describe('paging through all links', () => {
  it('visits every link once, in pages, beyond the old 200 cap', async () => {
    const rows = Array.from({ length: 450 }, (_, k) => ({ id: `m${String(k).padStart(4, '0')}`, productId: `p${k}`, externalProductId: `${k}`, externalVariantId: null }));
    const prisma: any = {
      productChannelMapping: {
        findMany: async (q: any) => {
          const start = q.cursor ? rows.findIndex((r) => r.id === q.cursor.id) + (q.skip ?? 0) : 0;
          return rows.slice(start, start + q.take);
        },
      },
    };
    const seen: string[] = [];
    const pages = await forEachLinkPage(prisma, 'ch', 100, async (links) => { seen.push(...links.map((l) => l.externalProductId)); });
    expect(pages).toBe(5);
    expect(seen.length).toBe(450);
    expect(new Set(seen).size).toBe(450);
  });
});

describe('CatalogWatchService.runChannel', () => {
  function setup(opts: { autoLink: boolean; failed?: number }) {
    const ch: any = { id: 'ch1', tenantId: 't1', type: 'WOOCOMMERCE', status: 'CONNECTED', isActive: true, displayName: 'Store', config: { autoLink: opts.autoLink, pushPrice: false } };
    const sure = remote('1', 'Tea', null, 'TEA');
    const maybe = remote('2', 'Lux Soap', null, null);
    const scan: any = {
      at: 'now', remote: [], remoteError: null, remoteFailure: null, linked: 3,
      open: [sure, maybe],
      results: [
        { item: sure, match: { productId: 'pTea', variantId: null, kind: 'sku', score: 1 } },
        { item: maybe, match: { productId: 'pSoap', variantId: null, kind: 'name', score: 0.9 } },
      ],
    };
    const linked: any[] = [];
    let saved: any = null;
    const notes: any[] = [];
    const products: any = {
      col: () => ({ integration: ch, cfg: { autoLink: opts.autoLink, pushPrice: false }, mode: 'woocommerce' }),
      connected: () => true,
      scan: async () => scan,
      linkSureFor: async (_c: any, sc: any, auto: boolean) => { const l = pickSureLinks(sc.results); linked.push({ l, auto }); return { saved: l.length, errors: [] }; },
      patchWatch: async (_id: string, fn: any) => { saved = fn({}); },
    };
    const prisma: any = { productChannelMapping: { count: async () => opts.failed ?? 0 } };
    const push: any = { pushPricesFor: async () => ({ sent: 0 }) };
    const notifications: any = { create: async (n: any) => { notes.push(n); return n; } };
    return { ch, svc: new CatalogWatchService(prisma, products, push, notifications), linked, saved: () => saved, notes };
  }

  it('auto-link on: links the SKU match only and records it', async () => {
    const t = setup({ autoLink: true });
    await t.svc.runChannel(t.ch);
    expect(t.linked).toHaveLength(1);
    expect(t.linked[0].auto).toBe(true);
    expect(t.linked[0].l.map((x: any) => x.productId)).toEqual(['pTea']);
    expect(t.saved().scan).toMatchObject({ autoLinked: 1, sure: 0, open: 1 });
  });

  it('auto-link off (older channels): nothing linked, sure matches counted for the Masle panel', async () => {
    const t = setup({ autoLink: false });
    await t.svc.runChannel(t.ch);
    expect(t.linked).toHaveLength(0);
    expect(t.saved().scan).toMatchObject({ autoLinked: 0, sure: 1, open: 2 });
  });

  it('sync failures raise one alert that deep-links to the channel errors', async () => {
    const t = setup({ autoLink: false, failed: 3 });
    await t.svc.runChannel(t.ch);
    expect(t.notes).toHaveLength(1);
    expect(t.notes[0].link).toBe('/online-store/products?channel=ch1&filter=errors');
    expect(t.saved().alerts.sync).toBeTruthy();
  });
});
