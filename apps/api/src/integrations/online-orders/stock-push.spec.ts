import { StockPushService } from './stock-push.service';

function setup(opts: { changed: { productId: string; variantId: string | null }[]; links?: any[]; products?: any[]; pushPrice?: boolean; pushStock?: boolean; maps?: any[] }) {
  const pushed: any[] = [];
  const prices: any[] = [];
  const ch = { id: 'ch1', tenantId: 't1', type: 'WOOCOMMERCE', shopId: 's1', displayName: 'Store', config: { pushPrice: !!opts.pushPrice, ...(opts.pushStock === false ? { pushStock: false } : {}) } };
  const prisma: any = {
    integration: { findMany: async () => [ch] },
    shopStock: { findMany: async () => opts.changed },
    productChannelMapping: {
      findMany: async (q: any) => (q.where.productId ? opts.links ?? [] : opts.maps ?? []),
      update: async () => ({}),
      updateMany: async () => ({ count: 0 }),
    },
    product: { findMany: async () => opts.products ?? [] },
  };
  const woo: any = { isConnected: () => true, syncStock: async (_i: any, o: any) => { pushed.push(o); }, pushPrices: async (_i: any, items: any) => { prices.push(items); } };
  const shopify: any = { isConnected: () => true };
  const daraz: any = { isConnected: () => false };
  return { svc: new StockPushService(prisma, woo, shopify, daraz), pushed, prices };
}

describe('StockPushService', () => {
  it('jure product link se, baqi SKU se', async () => {
    const { svc, pushed } = setup({
      changed: [{ productId: 'p1', variantId: null }, { productId: 'p2', variantId: 'v2' }],
      links: [{ productId: 'p1', externalProductId: '101', externalVariantId: null }],
      products: [{ id: 'p1', sku: 'A', variants: [] }, { id: 'p2', sku: 'B', variants: [{ sku: 'B-RED' }] }],
    });
    await svc.run(null);
    expect(pushed.length).toBe(1);
    expect(pushed[0]).toEqual({ onlySkus: ['B', 'B-RED'], onlyLinks: [{ externalProductId: '101', externalVariantId: null }] });
  });

  it('kuch nahi badla → push nahi', async () => {
    const { svc, pushed } = setup({ changed: [] });
    await svc.run(null);
    expect(pushed.length).toBe(0);
  });

  it('200+ products changed: pushed in pages of 200, not skipped', async () => {
    const ids = Array.from({ length: 201 }, (_, i) => `p${i}`);
    const { svc, pushed } = setup({
      changed: ids.map((productId) => ({ productId, variantId: null })),
      products: ids.map((id) => ({ id, sku: `SKU-${id}`, variants: [] })),
    });
    await svc.run(null);
    expect(pushed.length).toBe(2);
    expect(pushed[1].onlySkus.length).toBeGreaterThan(0);
  });

  it('stock push off for the channel: nothing is sent', async () => {
    const { svc, pushed } = setup({ changed: [{ productId: 'p1', variantId: null }], products: [{ id: 'p1', sku: 'A', variants: [] }], pushStock: false });
    await svc.run(null);
    expect(pushed.length).toBe(0);
  });

  it('qeemat: sirf farq par, pehle wali barabar ho to nahi', async () => {
    const { svc, prices } = setup({
      changed: [], pushPrice: true,
      maps: [
        { id: 'm1', externalProductId: '101', externalVariantId: null, variantId: null, externalData: { pushedPrice: 500 }, product: { price: 500 }, variant: null },
        { id: 'm2', externalProductId: '102', externalVariantId: '9', variantId: 'v', externalData: {}, product: { price: 900 }, variant: { price: 950 } },
      ],
    });
    await svc.run(null);
    expect(prices.length).toBe(1);
    expect(prices[0]).toEqual([{ externalProductId: '102', externalVariantId: '9', price: 950 }]);
  });

  it('custom website / Indolj: no price push, no Woo/Shopify/Daraz call', async () => {
    const { svc, prices } = setup({
      changed: [], pushPrice: true,
      maps: [{ id: 'm1', externalProductId: '5', externalVariantId: null, variantId: null, externalData: {}, product: { price: 500 }, variant: null }],
    });
    const res = await svc.pushPricesFor({ id: 'w1', tenantId: 't1', type: 'CUSTOM_WEBSITE', shopId: 's1', displayName: 'Site', config: { pushPrice: true, indolj: { activationToken: 'x' } } } as any, {}, true);
    expect(res).toEqual({ sent: 0 });
    expect(prices.length).toBe(0);
  });
});
