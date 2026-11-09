import { Injectable, Logger, OnModuleDestroy } from '@nestjs/common';
import { Integration, IntegrationStatus } from '@prisma/client';
import { PrismaService } from '../../prisma/prisma.service';
import { ChannelCatalogService } from './channel-catalog.service';
import { OnlineProductsService } from './online-products.service';
import { StockPushService } from './stock-push.service';
import { WatchState, pickSureLinks } from './catalog-watch';
import { readWebsiteConfig } from './website-config';
import { channelPriceUpdates, parseInventoryHook, parseProductHook, ProductHookEvent } from './product-hooks';
import { ChannelSyncService } from './channel-sync.service';

const DEBOUNCE_MS = 15_000;
const MAX_QUEUED = 500;

/**
 * Shopify products/create + products/update and WooCommerce product.created +
 * product.updated, received on the channel's order webhook URL:
 *  - a price change on a linked item is recorded on the link and the price
 *    source decides (take it in, hold it, or send Nafaa's price);
 *  - a product with no link is matched: SKU matches are linked (auto-link on),
 *    new products with no match are imported (auto-import on).
 * Events are batched per channel for 15 seconds. The catalog watch scan stays
 * the fallback for anything a webhook missed.
 */
@Injectable()
export class ProductEventsService implements OnModuleDestroy {
  private readonly logger = new Logger(ProductEventsService.name);
  private readonly queue = new Map<string, ProductHookEvent[]>();
  private readonly timers = new Map<string, NodeJS.Timeout>();

  constructor(
    private readonly prisma: PrismaService,
    private readonly catalog: ChannelCatalogService,
    private readonly products: OnlineProductsService,
    private readonly push: StockPushService,
    private readonly sync: ChannelSyncService,
  ) {}

  onModuleDestroy() {
    for (const t of this.timers.values()) clearTimeout(t);
  }

  private disabled() {
    return process.env.DISABLE_CATALOG_WATCH === '1';
  }

  /** Is this webhook topic a product event? */
  static isProductTopic(topic: string) {
    return /^products?[/.](create|created|update|updated)$/i.test(topic);
  }

  /** Shopify inventory_levels/update: stock edited by hand on the channel (checked after a settle time). */
  acceptInventory(integration: Integration, body: unknown) {
    if (this.disabled()) return { queued: false };
    const ev = parseInventoryHook(body, Date.now());
    return ev ? this.sync.acceptInventory(integration, ev) : { queued: false };
  }

  /** Takes the event and answers at once; the work runs after the batch window. */
  accept(integration: Integration, topic: string, body: unknown) {
    if (this.disabled()) return { queued: false };
    const ev = parseProductHook(integration.type, topic, body, Date.now());
    if (!ev) return { queued: false };
    const list = this.queue.get(integration.id) ?? [];
    if (list.length < MAX_QUEUED) list.push(ev);
    this.queue.set(integration.id, list);
    if (!this.timers.has(integration.id)) {
      this.timers.set(integration.id, setTimeout(() => {
        this.timers.delete(integration.id);
        this.flush(integration.id).catch((e) => this.logger.warn(`Product events ${integration.displayName}: ${e?.message}`));
      }, DEBOUNCE_MS));
    }
    return { queued: true };
  }

  async flush(integrationId: string) {
    const events = this.queue.get(integrationId) ?? [];
    this.queue.delete(integrationId);
    if (!events.length) return null;
    const i = await this.prisma.integration.findUnique({ where: { id: integrationId } });
    if (!i || !i.isActive || i.status !== IntegrationStatus.CONNECTED) return null;
    const cfg = readWebsiteConfig(i.config);
    const ids = [...new Set(events.map((e) => e.externalProductId))];

    // 1) Prices of linked items, straight from the webhook body.
    const maps = await this.prisma.productChannelMapping.findMany({
      where: { integrationId: i.id, externalProductId: { in: ids } },
      select: { id: true, externalProductId: true, externalVariantId: true, externalData: true },
    });
    const updates = channelPriceUpdates(maps, events);
    for (const u of updates) {
      await this.prisma.productChannelMapping.update({ where: { id: u.id }, data: { externalData: u.data as any } }).catch(() => null);
    }
    let prices = { sent: 0, pulled: 0, held: 0 };
    if (updates.length && cfg.priceFrom !== 'NONE') {
      prices = await this.push.pushPricesFor(i, { id: { in: updates.map((u) => u.id) } });
    }

    // 2) Name, description, pictures (by the content source), and Woo stock edited by hand (after a settle time).
    const content = await this.sync.channelChanged(i, events).catch((e) => {
      this.logger.warn(`Content sync ${i.displayName}: ${e?.message}`);
      return { pulled: 0, pushed: 0 };
    });
    if (i.type === 'WOOCOMMERCE' && cfg.stockFromChannel && events.some((e) => e.stocks.length)) {
      this.sync.wooStock(i, events).catch((e) => this.logger.warn(`Hand stock ${i.displayName}: ${e?.message}`));
    }

    // 3) Products with no link: link sure matches, bring in new ones.
    const linked = new Set(maps.map((m) => String(m.externalProductId)));
    const open = ids.filter((id) => !linked.has(id));
    let autoLinked = 0;
    let imported = 0;
    if (open.length && (cfg.autoLink || cfg.autoImport)) {
      const res = await this.openProducts(i, open, events.filter((e) => e.created).map((e) => e.externalProductId));
      autoLinked = res.linked;
      imported = res.imported;
    }
    return { events: events.length, priceUpdates: updates.length, ...prices, content, autoLinked, imported };
  }

  private async openProducts(i: Integration, ids: string[], created: string[]) {
    const c = this.products.col(i);
    if (c.mode !== 'shopify' && c.mode !== 'woocommerce') return { linked: 0, imported: 0 };
    await this.catalog.refreshSome(i, ids);
    const sc = await this.products.scan(c, false, new Set(ids));
    if (sc.remoteError && !sc.remote.length) return { linked: 0, imported: 0 };
    let linked = 0;
    if (c.cfg.autoLink && pickSureLinks(sc.results).length) linked = (await this.products.linkSureFor(c, sc, true)).saved;
    const state = ((i.config as any)?.catalogWatch?.state ?? null) as WatchState | null;
    const picks = this.products.newProductIds(sc, state, created);
    const res = picks.length ? await this.products.autoImport(c, picks, 'webhook') : { imported: 0, queued: 0 };
    return { linked, imported: res.imported + res.queued };
  }
}
