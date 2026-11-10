import { Injectable, Logger, OnModuleDestroy, OnModuleInit } from '@nestjs/common';
import { Cron } from '@nestjs/schedule';
import { Integration, IntegrationStatus, Prisma } from '@prisma/client';
import { PrismaService } from '../../prisma/prisma.service';
import { StockChanged, stockEvents } from '../../common/shop-scope/stock-events';
import { pushesPrice, readWebsiteConfig } from './website-config';
import { WooCommerceService } from './woocommerce.service';
import { ShopifyService } from './shopify.service';
import { DarazService } from './daraz.service';
import { agreedPrice, channelMoved, channelPrice, jumpDeclined, priceDecision, priceJump, PriceStep, samePrice } from './channel-price';
import { canPull, logPrice, logPriceBatch, pullPrice } from './price-sync';
import { PAGE_DELAY_MS, trackLinks } from './link-sync';
import { commerceControls, pushPaused } from './commerce-controls';
import { ChannelSyncService } from './channel-sync.service';

const DEBOUNCE_MS = 15_000;
/** Pehli dafa (server start) kitna pichhe dekhna hai */
const FIRST_LOOKBACK_MS = 3 * 60_000;
const MAX_PRODUCTS_PER_PUSH = 200;
const PRICE_PAGE = 500;

type PriceMap = {
  id: string; productId: string; externalProductId: string | null; externalVariantId: string | null; externalSku: string | null; externalTitle: string | null;
  externalData: unknown; variantId: string | null; priceOverride: number | null; compareAtPrice: number | null; priceHold: unknown;
  product: { price: number; hasVariants: boolean }; variant: { price: number } | null;
};

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
  private readonly contentWatermark = new Map<string, Date>();
  private readonly dirtyTenants = new Set<string>();
  private timer: NodeJS.Timeout | null = null;
  private running = false;
  private readonly onChanged = (e: StockChanged) => this.markDirty(e.tenantId);

  constructor(
    private readonly prisma: PrismaService,
    private readonly woo: WooCommerceService,
    private readonly shopify: ShopifyService,
    private readonly daraz: DarazService,
    private readonly sync: ChannelSyncService,
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
      // Platform kill switch (Admin > Online store > Controls): paused channel types are skipped.
      const paused = (await commerceControls(this.prisma)).killSwitch;
      for (const ch of channels) {
        if (paused[ch.type as keyof typeof paused]) continue;
        await this.pushChannel(ch).catch((e) => this.logger.warn(`Stock push ${ch.displayName}: ${e?.message}`));
        if (readWebsiteConfig(ch.config).priceFrom !== 'NONE') {
          await this.pushChannelPrices(ch).catch((e) => this.logger.warn(`Price push ${ch.displayName}: ${e?.message}`));
        }
        if (readWebsiteConfig(ch.config).contentFrom !== 'NONE') {
          await this.contentChanges(ch).catch((e) => this.logger.warn(`Content sync ${ch.displayName}: ${e?.message}`));
        }
      }
    } finally {
      this.running = false;
    }
  }

  /**
   * Price sync for products whose price may have changed (any price source but
   * NONE). Product.updatedAt also moves on every sale (stock cache), so the
   * last price sent is kept on the link and only a real difference is sent.
   */
  private async pushChannelPrices(ch: Integration) {
    if (!this.connected(ch)) return;
    const now = new Date();
    const since = this.priceWatermark.get(ch.id) ?? new Date(now.getTime() - FIRST_LOOKBACK_MS);
    this.priceWatermark.set(ch.id, new Date(now.getTime() - 30_000));
    await this.pushPricesFor(ch, { OR: [{ product: { updatedAt: { gt: since } } }, { variant: { updatedAt: { gt: since } } }] });
  }

  /** Name, description, pictures of products edited in Nafaa since the last pass (the content source decides). */
  private async contentChanges(ch: Integration) {
    if (!this.connected(ch)) return;
    const now = new Date();
    const since = this.contentWatermark.get(ch.id) ?? new Date(now.getTime() - FIRST_LOOKBACK_MS);
    this.contentWatermark.set(ch.id, new Date(now.getTime() - 30_000));
    const rows = await this.prisma.productChannelMapping.findMany({
      where: { integrationId: ch.id, product: { updatedAt: { gt: since } } },
      select: { productId: true }, distinct: ['productId'], take: 2000,
    });
    if (rows.length) await this.sync.nafaaChanged(ch, rows.map((r) => r.productId));
  }

  /**
   * Price sync for the links matching `where`, by the channel's price source
   * (`priceFrom`): sends Nafaa's price, takes the channel price into Nafaa, or
   * holds the link when the channel changed the price after Nafaa's last push
   * (never a silent revert). `force` ("Sync now") sends unchanged prices too,
   * but never over a channel change. `explicit` is a merchant decision on
   * these links (resolve, recovery): it sends even when the source is not Nafaa.
   */
  async pushPricesFor(ch: Integration, where: Prisma.ProductChannelMappingWhereInput = {}, force = false, opts: { explicit?: boolean } = {}) {
    const cfg = readWebsiteConfig(ch.config);
    const out = { sent: 0, pulled: 0, held: 0 };
    if (!this.connected(ch)) return out;
    if (cfg.priceFrom === 'NONE' && !opts.explicit) return out;
    const paused = await pushPaused(this.prisma, ch.type);
    const shopId = cfg.shopId ?? ch.shopId;
    let cursor: string | undefined;
    // Pages of 500 links; a rule change can touch every link of a big shop.
    for (;;) {
      const maps = await this.prisma.productChannelMapping.findMany({
        where: { ...where, integrationId: ch.id, externalProductId: { not: null } },
        select: {
          id: true, productId: true, externalProductId: true, externalVariantId: true, externalSku: true, externalTitle: true, externalData: true, variantId: true,
          priceOverride: true, compareAtPrice: true, priceHold: true,
          product: { select: { price: true, hasVariants: true } }, variant: { select: { price: true } },
        },
        orderBy: { id: 'asc' },
        take: PRICE_PAGE,
        ...(cursor ? { skip: 1, cursor: { id: cursor } } : {}),
      });
      if (!maps.length) break;
      cursor = maps[maps.length - 1].id;
      const r = await this.pricePage(ch, cfg, shopId, maps, force, paused, !!opts.explicit);
      out.sent += r.sent;
      out.pulled += r.pulled;
      out.held += r.held;
      if (maps.length < PRICE_PAGE) break;
    }
    if (out.pulled || out.held) this.logger.log(`Price sync ${ch.displayName}: ${out.sent} sent, ${out.pulled} taken in, ${out.held} waiting`);
    return out;
  }

  private async pricePage(ch: Integration, cfg: ReturnType<typeof readWebsiteConfig>, shopId: string | null, maps: PriceMap[], force: boolean, paused: boolean, explicit: boolean) {
    const branchPrices = shopId
      ? await this.prisma.shopStock.findMany({
          where: { shopId, productId: { in: [...new Set(maps.map((m) => m.productId))] }, shopPrice: { not: null } },
          select: { productId: true, variantId: true, shopPrice: true },
        })
      : [];
    const branchOf = (m: PriceMap) => {
      const b = branchPrices.find((x) => x.productId === m.productId && (x.variantId ?? null) === (m.variantId ?? null))?.shopPrice;
      return b === null || b === undefined ? null : Number(b);
    };
    const now = Date.now();
    const at = new Date(now).toISOString();
    const plan = maps.map((m) => {
      const branch = branchOf(m);
      const base = Number(branch ?? (m.variantId ? m.variant?.price ?? m.product.price : m.product.price));
      const price = channelPrice(base, cfg.priceRule, m.priceOverride);
      const d = ((m.externalData as any) ?? {}) as Record<string, any>;
      const held = !!m.priceHold;
      let { step, why } = explicit
        ? { step: (price > 0 ? 'push' : 'skip') as PriceStep, why: 'merchant' }
        : priceDecision({ from: cfg.priceFrom, want: price, data: d, now, force, held });
      // Sale price: sent while set; once removed, cleared on the channel one time.
      const compareAt = m.compareAtPrice && m.compareAtPrice > price ? m.compareAtPrice : d.pushedCompareAt ? null : undefined;
      const compareChanged = compareAt !== undefined && Number(d.pushedCompareAt ?? 0) !== Number(compareAt ?? 0);
      if (step === 'skip' && compareChanged && price > 0 && pushesPrice(cfg.priceFrom) && !held && !channelMoved(d)) { step = 'push'; why = 'sale-price'; }
      // Safety guard: a push that moves the channel price too far waits for the merchant
      // (a wrong link would otherwise put an unrelated price on the listing). A merchant's
      // own decision (explicit) goes through; a jump the merchant declined is not sent.
      const jump = step === 'push' && !explicit ? priceJump({ want: price, data: d, guard: cfg.priceGuard }) : null;
      if (jump) {
        if (jumpDeclined(d, price)) { step = 'skip'; why = 'jump-declined'; } else { step = 'hold'; why = 'big-jump'; }
      }
      if (step === 'push' && paused) step = 'skip';
      if (step === 'pull' && !canPull(m)) step = 'skip';
      return { m, d, price, compareAt, step, why, held, branch, jump };
    });

    const nafaaRecord = (d: Record<string, any>, price: number) => {
      // The time Nafaa's price took this value; unknown on older links (see nafaaSeenAt).
      if (d.nafaaPrice !== undefined && samePrice(Number(d.nafaaPrice), price)) return {};
      return { nafaaPrice: price, nafaaPriceAt: d.nafaaPrice === undefined ? null : at };
    };
    const logs: Parameters<typeof logPrice>[1] = [];
    const base = (m: PriceMap) => ({ tenantId: ch.tenantId, integrationId: ch.id, mappingId: m.id, productId: m.productId, variantId: m.variantId });

    // 1) Nafaa → channel
    const pushes = plan.filter((x) => x.step === 'push');
    if (pushes.length) {
      const items = pushes.map(({ m, price, compareAt }) => ({
        externalProductId: String(m.externalProductId), externalVariantId: m.externalVariantId ? String(m.externalVariantId) : null, externalSku: m.externalSku, price, compareAt,
      }));
      await trackLinks(this.prisma, ch.id, { id: { in: pushes.map(({ m }) => m.id) } }, async () => {
        if (ch.type === 'WOOCOMMERCE') await this.woo.pushPrices(ch, items);
        else if (ch.type === 'SHOPIFY') await this.shopify.pushPrices(ch, items);
        else if (ch.type === 'DARAZ') await this.daraz.pushPrices(ch, items);
      }, ['price']);
      for (const { m, d, price, compareAt, why } of pushes) {
        const seen = d.channelPrice === undefined || d.channelPrice === null ? null : Number(d.channelPrice);
        // A push over a price the channel had set keeps that price for recovery.
        const replaced = seen !== null && seen > 0 && !samePrice(seen, price) && channelMoved(d)
          ? { channelPriceBefore: { price: seen, at: d.channelPriceAt ?? null, by: at } } : {};
        await this.prisma.productChannelMapping.update({
          where: { id: m.id },
          data: {
            priceHold: Prisma.DbNull,
            externalData: {
              ...d, pushedPrice: price, pushedPriceAt: at, channelPrice: price, channelPriceAt: at, syncedPrice: price, syncedAt: at,
              pushedCompareAt: compareAt ?? null, driftPushes: 0, driftPushedAt: null, ...nafaaRecord(d, price), ...replaced,
            },
          },
        }).catch(() => null);
        if (why !== 'first' && why !== 'force' && why !== 'sale-price') {
          logs.push({ ...base(m), kind: 'PUSH', newPrice: price, oldPrice: seen, channelPrice: seen, note: `${cfg.priceFrom}:${why}` });
        }
      }
    }

    // 2) Channel → Nafaa
    const pulls = plan.filter((x) => x.step === 'pull');
    const pulledNames: string[] = [];
    for (const { m, d, price, why, branch } of pulls) {
      const seen = Number(d.channelPrice);
      const res = await pullPrice(this.prisma, ch, cfg, shopId, m, seen, branch).catch((e) => {
        this.logger.warn(`Price pull ${ch.displayName} ${m.id}: ${e?.message}`);
        return null;
      });
      if (!res) continue;
      await this.prisma.productChannelMapping.update({
        where: { id: m.id },
        data: { priceHold: Prisma.DbNull, externalData: { ...d, syncedPrice: seen, syncedAt: at, pulledPrice: seen, pulledAt: at, nafaaPrice: seen, nafaaPriceAt: at } },
      }).catch(() => null);
      logs.push({ ...base(m), kind: 'PULL', target: res.target, oldPrice: res.oldPrice ?? price, newPrice: seen, channelPrice: seen, note: `${cfg.priceFrom}:${why}` });
      if (pulledNames.length < 200) pulledNames.push(m.externalTitle ?? m.externalSku ?? m.productId);
    }

    // 3) Waiting for the merchant
    let held = 0;
    let jumps = 0;
    for (const { m, d, price, held: was, why, jump } of plan.filter((x) => x.step === 'hold')) {
      const seen = Number(d.channelPrice);
      const reason = why === 'big-jump' ? 'big-jump' : 'channel-changed';
      const hold = {
        since: was ? (m.priceHold as any)?.since ?? at : at, nafaaPrice: price, channelPrice: seen, agreedPrice: agreedPrice(d), channelPriceAt: d.channelPriceAt ?? null,
        reason, ...(jump && { jumpPct: jump.pct, firstPush: jump.first }),
      };
      const same = was && samePrice(Number((m.priceHold as any)?.channelPrice), seen) && samePrice(Number((m.priceHold as any)?.nafaaPrice), price)
        && ((m.priceHold as any)?.reason ?? 'channel-changed') === reason;
      if (same && !Object.keys(nafaaRecord(d, price)).length) continue;
      await this.prisma.productChannelMapping.update({ where: { id: m.id }, data: { priceHold: hold as any, externalData: { ...d, ...nafaaRecord(d, price) } } }).catch(() => null);
      if (!was || ((m.priceHold as any)?.reason ?? 'channel-changed') !== reason) {
        held++;
        if (reason === 'big-jump') jumps++;
        logs.push(reason === 'big-jump'
          ? { ...base(m), kind: 'HOLD', oldPrice: seen, newPrice: price, channelPrice: seen, note: `${cfg.priceFrom}:big-jump:${jump?.pct ?? ''}%` }
          : { ...base(m), kind: 'HOLD', oldPrice: agreedPrice(d), newPrice: seen, channelPrice: seen, note: `${cfg.priceFrom}:website-changed` });
      }
    }

    // 4) Agreement and bookkeeping without a send
    for (const { m, d, price, step, held: was } of plan) {
      if (step === 'agree') {
        await this.prisma.productChannelMapping.update({
          where: { id: m.id },
          data: { ...(was && { priceHold: Prisma.DbNull }), externalData: { ...d, syncedPrice: price, syncedAt: at, ...nafaaRecord(d, price) } },
        }).catch(() => null);
      } else if (step === 'skip' && Object.keys(nafaaRecord(d, price)).length && price > 0) {
        await this.prisma.productChannelMapping.update({ where: { id: m.id }, data: { externalData: { ...d, ...nafaaRecord(d, price) } } }).catch(() => null);
      }
    }

    await logPrice(this.prisma, logs);
    if (pulledNames.length) await logPriceBatch(this.prisma, ch, 'PRICE_PULL', pulledNames.length, { from: cfg.priceFrom, items: pulledNames });
    if (held) await logPriceBatch(this.prisma, ch, 'PRICE_HOLD', held, { from: cfg.priceFrom, ...(jumps && { bigJumps: jumps }) });
    return { sent: pushes.length, pulled: pulledNames.length, held };
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
    // Every changed row, in pages (a stock count can touch thousands at once).
    const productSet = new Set<string>();
    let cursor: string | undefined;
    for (;;) {
      const rows = await this.prisma.shopStock.findMany({
        where: { shopId, updatedAt: { gt: since, lte: now } },
        select: { id: true, productId: true },
        orderBy: { id: 'asc' },
        take: 5000,
        ...(cursor ? { skip: 1, cursor: { id: cursor } } : {}),
      });
      for (const r of rows) productSet.add(r.productId);
      if (rows.length < 5000) break;
      cursor = rows[rows.length - 1].id;
    }
    // 30s overlap: jo transaction abhi commit nahi hui thi woh agli dafa pakri jaye
    this.watermark.set(ch.id, new Date(now.getTime() - 30_000));
    if (!productSet.size) return;

    const productIds = [...productSet];
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

    // Links in pages of 200 (sizes can make many per product); SKU look-ups in pages of 30.
    const pages = Math.max(Math.ceil(onlyLinks.length / 200), Math.ceil(skus.length / 30));
    for (let k = 0; k < pages; k++) {
      if (k > 0) await new Promise((r) => setTimeout(r, PAGE_DELAY_MS[ch.type as keyof typeof PAGE_DELAY_MS] ?? 500));
      const opts = { onlySkus: skus.slice(k * 30, k * 30 + 30), onlyLinks: onlyLinks.slice(k * 200, k * 200 + 200) };
      if (!opts.onlySkus.length && !opts.onlyLinks.length) continue;
      if (ch.type === 'WOOCOMMERCE') await this.woo.syncStock(ch, opts);
      else if (ch.type === 'SHOPIFY') await this.shopify.syncStock(ch, opts);
    }
  }
}
