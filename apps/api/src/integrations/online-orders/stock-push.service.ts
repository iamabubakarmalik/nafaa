import { Injectable, Logger, OnModuleDestroy, OnModuleInit } from '@nestjs/common';
import { Cron } from '@nestjs/schedule';
import { Integration, IntegrationStatus, Prisma } from '@prisma/client';
import { PrismaService } from '../../prisma/prisma.service';
import { StockChanged, stockEvents } from '../../common/shop-scope/stock-events';
import { readWebsiteConfig } from './website-config';
import { WooCommerceService } from './woocommerce.service';
import { ShopifyService } from './shopify.service';
import { DarazService } from './daraz.service';
import { channelPrice, priceAction } from './channel-price';
import { PAGE_DELAY_MS, trackLinks } from './link-sync';

const DEBOUNCE_MS = 15_000;
/** Pehli dafa (server start) kitna pichhe dekhna hai */
const FIRST_LOOKBACK_MS = 3 * 60_000;
const MAX_PRODUCTS_PER_PUSH = 200;
const PRICE_PAGE = 500;

/**
 * POS par sale / purchase / adjustment → website ka stock FORAN (15 second
 * me), 15 minute ke poore sync ka intezar nahi. Do rastay:
 *  1) stock event (applyStockDelta) → 15s debounce → push
 *  2) har minute: ShopStock.updatedAt se jo badla (har code path pakarta hai,
 *     woh bhi jo applyStockDelta se nahi guzarte — jaise POS sale)
 * Sirf badle hue products bhejte hain; jo pehle se barabar ho woh skip.
 */
@Injectable()
export class StockPushService implements OnModuleInit, OnModuleDestroy {
  private readonly logger = new Logger(StockPushService.name);
  /** integrationId → aakhri dafa kab tak ka stock dekh liya */
  private readonly watermark = new Map<string, Date>();
  private readonly priceWatermark = new Map<string, Date>();
  private readonly dirtyTenants = new Set<string>();
  private timer: NodeJS.Timeout | null = null;
  private running = false;
  private readonly onChanged = (e: StockChanged) => this.markDirty(e.tenantId);

  constructor(
    private readonly prisma: PrismaService,
    private readonly woo: WooCommerceService,
    private readonly shopify: ShopifyService,
    private readonly daraz: DarazService,
  ) {}

  onModuleInit() {
    stockEvents.on('changed', this.onChanged);
  }

  onModuleDestroy() {
    stockEvents.off('changed', this.onChanged);
    if (this.timer) clearTimeout(this.timer);
  }

  private disabled() {
    return process.env.DISABLE_INSTANT_STOCK_PUSH === '1';
  }

  private markDirty(tenantId: string) {
    if (this.disabled()) return;
    this.dirtyTenants.add(tenantId);
    if (this.timer) return;
    this.timer = setTimeout(() => {
      this.timer = null;
      const tenants = [...this.dirtyTenants];
      this.dirtyTenants.clear();
      this.run(tenants).catch((e) => this.logger.warn(`Stock push: ${e?.message}`));
    }, DEBOUNCE_MS);
  }

  /** Har minute — jo event se chhoot gaya (POS sale jaise seedhe writes) */
  @Cron('15 * * * * *')
  async sweep() {
    if (this.disabled()) return;
    await this.run(null).catch((e) => this.logger.warn(`Stock push sweep: ${e?.message}`));
  }

  /** tenants = null → sab jure channels */
  async run(tenants: string[] | null) {
    if (this.running) {
      // Chal raha hai — thori der baad dobara
      for (const t of tenants ?? []) this.markDirty(t);
      return;
    }
    this.running = true;
    try {
      const channels = await this.prisma.integration.findMany({
        where: {
          type: { in: ['WOOCOMMERCE', 'SHOPIFY', 'DARAZ'] },
          isActive: true,
          status: IntegrationStatus.CONNECTED,
          ...(tenants ? { tenantId: { in: tenants } } : {}),
        },
      });
      for (const ch of channels) {
        await this.pushChannel(ch).catch((e) => this.logger.warn(`Stock push ${ch.displayName}: ${e?.message}`));
        if (readWebsiteConfig(ch.config).pushPrice) {
          await this.pushChannelPrices(ch).catch((e) => this.logger.warn(`Price push ${ch.displayName}: ${e?.message}`));
        }
      }
    } finally {
      this.running = false;
    }
  }

  /**
   * Nafaa price → channel (only when pushPrice is on). Product.updatedAt also
   * moves on every sale (stock cache), so the last price sent is kept on the
   * link and only a real difference is sent.
   */
  private async pushChannelPrices(ch: Integration) {
    if (!this.connected(ch)) return;
    const now = new Date();
    const since = this.priceWatermark.get(ch.id) ?? new Date(now.getTime() - FIRST_LOOKBACK_MS);
    this.priceWatermark.set(ch.id, new Date(now.getTime() - 30_000));
    await this.pushPricesFor(ch, { OR: [{ product: { updatedAt: { gt: since } } }, { variant: { updatedAt: { gt: since } } }] });
  }

  /**
   * Sends the channel price (link price, else the channel rule on the Nafaa
   * price) for the links matching `where` that differ from what was last sent.
   * `force` sends even when unchanged ("Sync now").
   */
  async pushPricesFor(ch: Integration, where: Prisma.ProductChannelMappingWhereInput = {}, force = false) {
    const cfg = readWebsiteConfig(ch.config);
    if (!cfg.pushPrice || !this.connected(ch)) return { sent: 0 };
    const shopId = cfg.shopId ?? ch.shopId;
    let sent = 0;
    let cursor: string | undefined;
    // Pages of 500 links; a rule change can touch every link of a big shop.
    for (let pageNo = 0; pageNo < 40; pageNo++) {
      const maps = await this.prisma.productChannelMapping.findMany({
        where: { ...where, integrationId: ch.id, externalProductId: { not: null } },
        select: {
          id: true, productId: true, externalProductId: true, externalVariantId: true, externalSku: true, externalData: true, variantId: true, priceOverride: true,
          product: { select: { price: true } }, variant: { select: { price: true } },
        },
        orderBy: { id: 'asc' },
        take: PRICE_PAGE,
        ...(cursor ? { skip: 1, cursor: { id: cursor } } : {}),
      });
      if (!maps.length) break;
      cursor = maps[maps.length - 1].id;
      sent += await this.pushPricePage(ch, cfg, shopId, maps, force);
      if (maps.length < PRICE_PAGE) break;
    }
    return { sent };
  }

  private async pushPricePage(ch: Integration, cfg: ReturnType<typeof readWebsiteConfig>, shopId: string | null, maps: Array<{
    id: string; productId: string; externalProductId: string | null; externalVariantId: string | null; externalSku: string | null; externalData: unknown;
    variantId: string | null; priceOverride: number | null; product: { price: number }; variant: { price: number } | null;
  }>, force: boolean) {
    const branchPrices = shopId
      ? await this.prisma.shopStock.findMany({
          where: { shopId, productId: { in: [...new Set(maps.map((m) => m.productId))] }, shopPrice: { not: null } },
          select: { productId: true, variantId: true, shopPrice: true },
        })
      : [];
    const nowMs = Date.now();
    const changed = maps
      .map((m) => {
        const branch = branchPrices.find((b) => b.productId === m.productId && (b.variantId ?? null) === (m.variantId ?? null))?.shopPrice;
        const base = Number(branch ?? (m.variantId ? m.variant?.price ?? m.product.price : m.product.price));
        const price = channelPrice(base, cfg.priceRule, m.priceOverride);
        return { m, price, action: priceAction(m.externalData as any, price, nowMs, force) };
      })
      .filter(({ action }) => action !== 'skip');
    if (!changed.length) return 0;

    const items = changed.map(({ m, price }) => ({
      externalProductId: String(m.externalProductId), externalVariantId: m.externalVariantId ? String(m.externalVariantId) : null, externalSku: m.externalSku, price,
    }));
    await trackLinks(this.prisma, ch.id, { id: { in: changed.map(({ m }) => m.id) } }, async () => {
      if (ch.type === 'WOOCOMMERCE') await this.woo.pushPrices(ch, items);
      else if (ch.type === 'SHOPIFY') await this.shopify.pushPrices(ch, items);
      else if (ch.type === 'DARAZ') await this.daraz.pushPrices(ch, items);
    });
    const at = new Date().toISOString();
    for (const { m, price, action } of changed) {
      const d = ((m.externalData as any) ?? {});
      // A drift re-send counts towards the backoff; a real price change starts it again.
      const drift = action === 'drift' ? { driftPushes: (Number(d.driftPushes) || 0) + 1, driftPushedAt: at } : { driftPushes: 0, driftPushedAt: null };
      await this.prisma.productChannelMapping.update({
        where: { id: m.id },
        data: { externalData: { ...d, pushedPrice: price, pushedPriceAt: at, channelPrice: price, channelPriceAt: at, ...drift } },
      }).catch(() => null);
    }
    return changed.length;
  }

  /** Only Woo, Shopify and Daraz get pushes; any other channel type (custom website, Indolj) never does. */
  private connected(ch: Integration) {
    switch (ch.type) {
      case 'WOOCOMMERCE': return this.woo.isConnected(ch);
      case 'SHOPIFY': return this.shopify.isConnected(ch);
      case 'DARAZ': return this.daraz.isConnected(ch);
      default: return false;
    }
  }

  private async pushChannel(ch: Integration) {
    const connected = this.connected(ch);
    if (!connected) return;
    const cfg = readWebsiteConfig(ch.config);
    const shopId = cfg.shopId ?? ch.shopId;
    if (!shopId || !cfg.pushStock) return;

    const now = new Date();
    const since = this.watermark.get(ch.id) ?? new Date(now.getTime() - FIRST_LOOKBACK_MS);
    const changed = await this.prisma.shopStock.findMany({
      where: { shopId, updatedAt: { gt: since, lte: now } },
      select: { productId: true, variantId: true },
      take: 2000,
    });
    // 30s overlap: jo transaction abhi commit nahi hui thi woh agli dafa pakri jaye
    this.watermark.set(ch.id, new Date(now.getTime() - 30_000));
    if (!changed.length) return;

    const productIds = [...new Set(changed.map((c) => c.productId))];
    // A big change (bulk import, stock count) goes out in pages of 200 products, with a pause per platform.
    for (let k = 0; k < productIds.length; k += MAX_PRODUCTS_PER_PUSH) {
      if (k > 0) await new Promise((r) => setTimeout(r, PAGE_DELAY_MS[ch.type as keyof typeof PAGE_DELAY_MS] ?? 500));
      await this.pushProducts(ch, productIds.slice(k, k + MAX_PRODUCTS_PER_PUSH));
    }
  }

  /** Stock for some changed products: linked items by link, the rest by SKU. */
  private async pushProducts(ch: Integration, productIds: string[]) {
    // Daraz: sirf SKU se jore hue products (ItemId + SkuId mapping me)
    if (ch.type === 'DARAZ') {
      await this.daraz.syncStock(ch, { productIds });
      return;
    }

    const [links, products] = await Promise.all([
      this.prisma.productChannelMapping.findMany({
        where: { integrationId: ch.id, productId: { in: productIds } },
        select: { externalProductId: true, externalVariantId: true, productId: true },
      }),
      this.prisma.product.findMany({
        where: { id: { in: productIds }, tenantId: ch.tenantId },
        select: { id: true, sku: true, variants: { select: { sku: true } } },
      }),
    ]);
    const linked = new Set(links.map((l) => l.productId));
    const skus = products
      .filter((p) => !linked.has(p.id))
      .flatMap((p) => [p.sku, ...p.variants.map((v) => v.sku)])
      .filter((s): s is string => !!s);
    const onlyLinks = links
      .filter((l) => l.externalProductId)
      .map((l) => ({ externalProductId: String(l.externalProductId), externalVariantId: l.externalVariantId ? String(l.externalVariantId) : null }));
    if (!skus.length && !onlyLinks.length) return;

    const opts = { onlySkus: skus.slice(0, 50), onlyLinks: onlyLinks.slice(0, 200) };
    if (ch.type === 'WOOCOMMERCE') await this.woo.syncStock(ch, opts);
    else if (ch.type === 'SHOPIFY') await this.shopify.syncStock(ch, opts);
  }
}
