import { Injectable, Logger, OnModuleDestroy, OnModuleInit } from '@nestjs/common';
import { Cron } from '@nestjs/schedule';
import { Integration, IntegrationStatus } from '@prisma/client';
import { PrismaService } from '../../prisma/prisma.service';
import { StockChanged, stockEvents } from '../../common/shop-scope/stock-events';
import { readWebsiteConfig } from './website-config';
import { WooCommerceService } from './woocommerce.service';
import { ShopifyService } from './shopify.service';

const DEBOUNCE_MS = 15_000;
/** Pehli dafa (server start) kitna pichhe dekhna hai */
const FIRST_LOOKBACK_MS = 3 * 60_000;
const MAX_PRODUCTS_PER_PUSH = 200;

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
          type: { in: ['WOOCOMMERCE', 'SHOPIFY'] },
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
   * Nafaa qeemat → website (sirf pushPrice chalu ho). Product.updatedAt har
   * sale par bhi badalta hai (stock cache) — is liye aakhri bheji qeemat
   * mapping me yaad rakhte hain aur sirf asal farq par bhejte hain.
   */
  private async pushChannelPrices(ch: Integration) {
    const connected = ch.type === 'WOOCOMMERCE' ? this.woo.isConnected(ch) : this.shopify.isConnected(ch);
    if (!connected) return;
    const now = new Date();
    const since = this.priceWatermark.get(ch.id) ?? new Date(now.getTime() - FIRST_LOOKBACK_MS);
    const maps = await this.prisma.productChannelMapping.findMany({
      where: {
        integrationId: ch.id,
        externalProductId: { not: null },
        OR: [{ product: { updatedAt: { gt: since } } }, { variant: { updatedAt: { gt: since } } }],
      },
      select: {
        id: true, externalProductId: true, externalVariantId: true, externalData: true, variantId: true,
        product: { select: { price: true } }, variant: { select: { price: true } },
      },
      take: 300,
    });
    this.priceWatermark.set(ch.id, new Date(now.getTime() - 30_000));
    const changed = maps
      .map((m) => ({ m, price: Number(m.variantId ? m.variant?.price ?? m.product.price : m.product.price) }))
      .filter(({ m, price }) => price > 0 && Number((m.externalData as any)?.pushedPrice) !== price);
    if (!changed.length) return;

    const items = changed.map(({ m, price }) => ({ externalProductId: String(m.externalProductId), externalVariantId: m.externalVariantId ? String(m.externalVariantId) : null, price }));
    if (ch.type === 'WOOCOMMERCE') await this.woo.pushPrices(ch, items);
    else await this.shopify.pushPrices(ch, items);
    for (const { m, price } of changed) {
      await this.prisma.productChannelMapping.update({
        where: { id: m.id },
        data: { externalData: { ...((m.externalData as any) ?? {}), pushedPrice: price, pushedPriceAt: now.toISOString() } },
      }).catch(() => null);
    }
  }

  private async pushChannel(ch: Integration) {
    const connected = ch.type === 'WOOCOMMERCE' ? this.woo.isConnected(ch) : this.shopify.isConnected(ch);
    if (!connected) return;
    const cfg = readWebsiteConfig(ch.config);
    const shopId = cfg.shopId ?? ch.shopId;
    if (!shopId) return;

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
    // Bahut zyada badla (bulk import / stock count) → 15 minute wala poora sync sambhal lega
    if (productIds.length > MAX_PRODUCTS_PER_PUSH) return;

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
    else await this.shopify.syncStock(ch, opts);
  }
}
