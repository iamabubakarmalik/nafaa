import { BadRequestException, Injectable, Logger, NotFoundException, OnModuleInit } from '@nestjs/common';
import { Integration, IntegrationStatus, Prisma } from '@prisma/client';
import { PrismaService } from '../../prisma/prisma.service';
import { AuthenticatedUser } from '../../modules/auth/interfaces/jwt-payload.interface';
import { ChannelCatalogService, LinkInput, RemoteProduct, RemoteVariant } from './channel-catalog.service';
import { autoImportAllowed, isNewItem, itemKey, newProductPicks, pickSureLinks, ScanResult, WatchState } from './catalog-watch';
import { WebsiteSetupService } from './website-setup.service';
import { WooCommerceService } from './woocommerce.service';
import { ShopifyService } from './shopify.service';
import { DarazService } from './daraz.service';
import { StockPushService } from './stock-push.service';
import { AUTO_SYNC_PRESET, isAutoSync, PriceFrom, PushContent, readPriceFrom, readPushContent, readWebsiteConfig, stockRule, WebsiteConfig } from './website-config';
import { allocate, channelShare, Claim, readStockRule, StockMode } from './stock-allocation';
import { CatalogJobsService, ChunkResult } from './catalog-jobs.service';
import { ChannelContentService, DARAZ_CONTENT_NOTE } from './channel-content.service';
import type { CatalogJob } from '@prisma/client';
import { channelPrice, PriceGuard, PriceRule, readPriceGuard, readPriceRule, samePrice } from './channel-price';
import { MatchIndex, MatchProduct, suggestAll, suspectLink, SuspectReason } from './product-matcher';
import { friendlySyncError, markLinks } from './link-sync';
import { mappingKey } from './mapping-key';
import { pausedMessage, pushPaused } from './commerce-controls';
import { backorderRule, owedUnits } from './backorder';
import { countOptedIn, readHold } from './stock-handover';

/** Channels whose products Nafaa links, prices and keeps in stock. */
export const PRODUCT_CHANNEL_TYPES = ['WOOCOMMERCE', 'SHOPIFY', 'DARAZ', 'CUSTOM_WEBSITE'] as const;
/** Channels Nafaa pushes stock and prices to. Custom websites and Indolj never get a push. */
const PUSH_TYPES = ['WOOCOMMERCE', 'SHOPIFY', 'DARAZ'] as const;

/**
 * How a channel works with products:
 *  - woocommerce / shopify / daraz: Nafaa reads its list, pushes stock and (optionally) prices.
 *  - indolj: a CUSTOM_WEBSITE with Indolj menu keys. Nafaa reads the menu for linking;
 *    prices are set in the Indolj panel and Indolj does not track stock.
 *  - website: a developer-built site. Nafaa cannot read it; it pulls stock and price
 *    (Nafaa price, no rule) from the website API, and links come from orders or CSV.
 */
export type ChannelMode = 'woocommerce' | 'shopify' | 'daraz' | 'indolj' | 'website';

export interface SuspectRow {
  mappingId: string; channelId: string; productId: string; variantId: string | null; name: string; variantName: string | null;
  externalTitle: string | null; externalSku: string | null; nafaaPrice: number; channelPrice: number | null; reasons: SuspectReason[];
}

export type GridFilter = 'all' | 'linked' | 'unlinked' | 'errors' | 'price' | 'out' | 'unlisted' | 'backorder' | 'hold' | 'untracked' | 'price-hold';
const GRID_FILTERS: GridFilter[] = ['all', 'linked', 'unlinked', 'errors', 'price', 'out', 'unlisted', 'backorder', 'hold', 'untracked', 'price-hold'];

/** Products picked on the grid: a list, or every product matching the grid's search and filter. */
export interface Selection {
  productIds?: string[];
  all?: boolean;
  search?: string;
  filter?: GridFilter;
  channelId?: string;
  categoryId?: string;
  brandId?: string;
}

/** Narrowing of the grid by the product's own fields. */
export interface GridScope { categoryId?: string; brandId?: string; productId?: string }

export type BulkAction = 'listed' | 'alloc' | 'price' | 'pricePercent' | 'compareAt' | 'push' | 'publish';

export interface SettingsBody {
  priceRule?: Partial<PriceRule>; pushPrice?: boolean; stockBuffer?: number; pushStock?: boolean; autoLink?: boolean; priceGuard?: Partial<PriceGuard>;
  stockMode?: StockMode; stockPercent?: number; stockFixed?: number; pushContent?: Partial<PushContent>;
  priceFrom?: PriceFrom; websitePriceTo?: 'PRODUCT' | 'CHANNEL'; autoImport?: boolean;
  contentFrom?: PriceFrom; autoPublish?: 'OFF' | 'MARKED' | 'ALL'; stockFromChannel?: boolean;
  /** "AUTO" = "Sab kuch khud sync (recommended)" (applied first; other fields then override). */
  preset?: 'AUTO';
}

const PRICE_SCAN_LIMIT = 50_000;

export interface Col {
  integration: Integration;
  cfg: WebsiteConfig;
  shopId: string | null;
  mode: ChannelMode;
}

const WEBSITE_LINKS_NOTE = 'Ye website apne products khud bhejti hai — order aane par ya CSV se jurte hain';

const isPush = (mode: ChannelMode) => mode === 'woocommerce' || mode === 'shopify' || mode === 'daraz';

/**
 * "Online products": every Nafaa product (and size) against every connected
 * channel. Linking, channel prices and stock pushes reuse the channel
 * services; this class only joins them into one view and one set of actions.
 */
@Injectable()
export class OnlineProductsService implements OnModuleInit {
  private readonly logger = new Logger(OnlineProductsService.name);

  constructor(
    private readonly prisma: PrismaService,
    private readonly setup: WebsiteSetupService,
    private readonly catalog: ChannelCatalogService,
    private readonly woo: WooCommerceService,
    private readonly shopify: ShopifyService,
    private readonly daraz: DarazService,
    private readonly push: StockPushService,
    private readonly jobs: CatalogJobsService,
    private readonly content: ChannelContentService,
  ) {}

  onModuleInit() {
    this.jobs.register('IMPORT_ALL', (job, chunk) => this.runImportChunk(job, chunk as string[]));
    this.jobs.register('LINK_ALL', (job, chunk) => this.runLinkChunk(job, chunk as LinkInput[]));
    this.jobs.register('PUSH', (job, chunk) => this.runPushChunk(job, chunk as string[]));
    this.jobs.register('PUBLISH', (job, chunk) => this.runPublishChunk(job, chunk as string[]));
  }

  // ═══════════════════════════════════════════════════════════
  // CHANNELS
  // ═══════════════════════════════════════════════════════════

  private async cols(tenantId: string): Promise<Col[]> {
    const list = await this.prisma.integration.findMany({
      where: { tenantId, type: { in: [...PRODUCT_CHANNEL_TYPES] }, apiKey: { not: null }, status: { not: IntegrationStatus.PENDING } },
      orderBy: { createdAt: 'asc' },
    });
    return list.map((integration) => this.col(integration));
  }

  col(integration: Integration): Col {
    const cfg = readWebsiteConfig(integration.config);
    return { integration, cfg, shopId: cfg.shopId ?? integration.shopId, mode: this.modeOf(integration) };
  }

  private modeOf(i: Integration): ChannelMode {
    switch (i.type) {
      case 'WOOCOMMERCE': return 'woocommerce';
      case 'SHOPIFY': return 'shopify';
      case 'DARAZ': return 'daraz';
      default: return this.catalog.kind(i) === 'indolj' ? 'indolj' : 'website';
    }
  }

  /** Price this link should have on the channel: rule and own price only where Nafaa pushes prices. */
  private wantPrice(c: Col, base: number, override?: number | null) {
    return isPush(c.mode) ? channelPrice(base, c.cfg.priceRule, override) : Math.round(base * 100) / 100;
  }

  /** Stock shown for the channel: after the buffer, or null where the channel has no stock (Indolj). */
  private shownStock(c: Col, stock: number | undefined) {
    if (c.mode === 'indolj' || !c.shopId) return null;
    return channelShare(Number(stock ?? 0), stockRule(c.cfg));
  }

  private async requireCol(tenantId: string, id: string): Promise<Col> {
    const integration = await this.setup.requireChannel(tenantId, id);
    if (!(PRODUCT_CHANNEL_TYPES as readonly string[]).includes(integration.type)) throw new NotFoundException('Ye channel products ke liye nahi');
    return this.col(integration);
  }

  /** Can Nafaa push to this channel right now? Custom websites and Indolj: never. */
  connected(i: Integration) {
    switch (i.type) {
      case 'WOOCOMMERCE': return this.woo.isConnected(i);
      case 'SHOPIFY': return this.shopify.isConnected(i);
      case 'DARAZ': return this.daraz.isConnected(i);
      default: return false;
    }
  }

  private live(c: Col) {
    const i = c.integration;
    if (!i.isActive || i.status !== IntegrationStatus.CONNECTED) return false;
    return isPush(c.mode) ? this.connected(i) : true;
  }

  private info(c: Col, shops: Map<string, string>) {
    const i = c.integration;
    return {
      id: i.id,
      type: i.type,
      name: i.displayName,
      siteUrl: c.cfg.siteUrl,
      platform: c.cfg.platform,
      mode: c.mode,
      /** Nafaa sends stock and prices ("Sync now", price rule). */
      canPush: isPush(c.mode),
      /** Nafaa can read the channel's product list (suggestions, import). */
      canFetch: c.mode !== 'website',
      /** The channel keeps stock (Indolj does not). */
      tracksStock: c.mode !== 'indolj',
      live: this.live(c),
      paused: !i.isActive,
      shopId: c.shopId,
      shopName: c.shopId ? shops.get(c.shopId) ?? null : null,
      pushPrice: isPush(c.mode) && c.cfg.pushPrice,
      /** "Qeemat kahan se badlegi?": NAFAA, WEBSITE, LATEST or NONE. */
      priceFrom: isPush(c.mode) ? c.cfg.priceFrom : 'NONE',
      /** New channel: the price source question is still open. */
      priceFromAsk: isPush(c.mode) && c.cfg.priceFromAsk,
      /** Where a website price lands in Nafaa without a price rule: PRODUCT or CHANNEL. */
      websitePriceTo: c.cfg.websitePriceTo,
      /** New channel products come into Nafaa by themselves. */
      autoImport: isPush(c.mode) && c.cfg.autoImport,
      /** Name, description, pictures: NAFAA, WEBSITE, LATEST or NONE. */
      contentFrom: isPush(c.mode) && c.mode !== 'daraz' ? c.cfg.contentFrom : 'NONE',
      /** New Nafaa products made on the channel: OFF, MARKED or ALL. */
      autoPublish: c.mode === 'woocommerce' || c.mode === 'shopify' ? c.cfg.autoPublish : 'OFF',
      /** Stock edited by hand on the channel is taken into Nafaa. */
      stockFromChannel: isPush(c.mode) && c.cfg.stockFromChannel,
      /** The merchant picked the sync settings (older channels: "Sync settings chunein"). */
      syncChosen: !isPush(c.mode) || c.cfg.syncChosen,
      /** All of "Sab kuch khud sync" is on. */
      autoSync: isPush(c.mode) && isAutoSync(c.cfg),
      priceRule: isPush(c.mode) ? c.cfg.priceRule : readPriceRule(undefined),
      /** Price safety guard (big jumps wait for the merchant). */
      priceGuard: c.cfg.priceGuard,
      stockBuffer: c.cfg.stockBuffer,
      stockMode: c.cfg.stockMode,
      stockPercent: c.cfg.stockPercent,
      stockFixed: c.cfg.stockFixed,
      pushContent: c.cfg.pushContent,
      /** Nafaa can make new products there ("Publish"). */
      canPublish: c.mode === 'woocommerce' || c.mode === 'shopify',
      /** Content push (title, images …) works there. */
      canContent: c.mode === 'woocommerce' || c.mode === 'shopify',
      contentNote: c.mode === 'daraz' ? DARAZ_CONTENT_NOTE : null,
      pushStock: isPush(c.mode) && c.cfg.pushStock,
      autoLink: c.mode !== 'website' && c.cfg.autoLink,
      priceSource: c.cfg.priceSource,
      lastSyncAt: i.lastSyncAt,
      lastSyncStatus: i.lastSyncStatus,
    };
  }

  async channels(user: AuthenticatedUser) {
    const cols = await this.cols(user.tenantId);
    const shops = await this.shopNames(user.tenantId);
    if (!cols.length) return { channels: [], sellable: 0 };
    const [counts, failed, simple, sizes] = await Promise.all([
      this.prisma.productChannelMapping.groupBy({ by: ['integrationId'], where: { integrationId: { in: cols.map((c) => c.integration.id) } }, _count: { _all: true } }),
      this.prisma.productChannelMapping.groupBy({ by: ['integrationId'], where: { integrationId: { in: cols.map((c) => c.integration.id) }, syncStatus: 'FAILED' }, _count: { _all: true } }),
      this.prisma.product.count({ where: { tenantId: user.tenantId, isActive: true, hasVariants: false } }),
      this.prisma.productVariant.count({ where: { isActive: true, product: { tenantId: user.tenantId, isActive: true, hasVariants: true } } }),
    ]);
    return {
      sellable: simple + sizes,
      channels: cols.map((c) => ({
        ...this.info(c, shops),
        linked: counts.find((x) => x.integrationId === c.integration.id)?._count._all ?? 0,
        failed: failed.find((x) => x.integrationId === c.integration.id)?._count._all ?? 0,
      })),
    };
  }

  private async shopNames(tenantId: string) {
    const shops = await this.prisma.shop.findMany({ where: { tenantId }, select: { id: true, name: true } });
    return new Map(shops.map((s) => [s.id, s.name]));
  }

  async saveSettings(user: AuthenticatedUser, channelId: string, body: SettingsBody) {
    const c = await this.requireCol(user.tenantId, channelId);
    const fresh = await this.prisma.integration.findUniqueOrThrow({ where: { id: c.integration.id }, select: { config: true } });
    const raw = ((fresh.config as any) ?? {}) as Record<string, unknown>;
    const next = { ...raw };
    if (c.mode === 'indolj') throw new BadRequestException('Indolj par Price Indolj panel se badlein; Stock wahan track nahi hota');
    // Price rule and price push only where Nafaa sends prices; a custom website only takes the stock buffer.
    if (isPush(c.mode) && body.priceRule !== undefined) next.priceRule = readPriceRule(body.priceRule);
    if (isPush(c.mode) && body.priceGuard !== undefined) next.priceGuard = readPriceGuard({ ...c.cfg.priceGuard, ...(body.priceGuard ?? {}) });
    // "Sab kuch khud sync": the preset first, then any field sent with it.
    if (isPush(c.mode) && body.preset === 'AUTO') {
      Object.assign(next, AUTO_SYNC_PRESET);
      // Name, description and pictures go with the content sync.
      next.pushContent = readPushContent({ ...c.cfg.pushContent, title: true, description: true, images: true });
      if (!c.shopId) next.autoImport = false;
      if (c.mode === 'daraz') { next.contentFrom = 'NONE'; next.autoPublish = 'OFF'; }
    }
    if (isPush(c.mode) && body.contentFrom !== undefined) {
      if (!['NAFAA', 'WEBSITE', 'LATEST', 'NONE'].includes(body.contentFrom)) throw new BadRequestException('Naam aur tasveerein kahan se badlein — sahi option chunein');
      next.contentFrom = c.mode === 'daraz' ? 'NONE' : body.contentFrom;
    }
    if (isPush(c.mode) && body.autoPublish !== undefined) {
      const v = ['OFF', 'MARKED', 'ALL'].includes(body.autoPublish) ? body.autoPublish : 'OFF';
      next.autoPublish = c.mode === 'daraz' ? 'OFF' : v;
      // "All new products": only products made from now on, never the existing catalog.
      if (v === 'ALL' && c.cfg.autoPublish !== 'ALL') next.autoPublishSince = new Date().toISOString();
    }
    if (isPush(c.mode) && body.stockFromChannel !== undefined) next.stockFromChannel = !!body.stockFromChannel;
    const syncKeys: Array<keyof SettingsBody> = ['preset', 'priceFrom', 'contentFrom', 'autoImport', 'autoPublish', 'stockFromChannel', 'pushPrice', 'pushStock'];
    if (isPush(c.mode) && syncKeys.some((k) => body[k] !== undefined)) next.syncChosen = true;
    if (isPush(c.mode) && body.priceFrom !== undefined) {
      if (!['NAFAA', 'WEBSITE', 'LATEST', 'NONE'].includes(body.priceFrom)) throw new BadRequestException('Price kahan se badlegi — sahi option chunein');
      next.priceFrom = body.priceFrom;
      next.priceFromAsk = false;
    } else if (isPush(c.mode) && body.pushPrice !== undefined) {
      // The older on/off switch maps onto the price source: on adds Nafaa as a sender, off removes it.
      const was = readPriceFrom(raw);
      next.priceFrom = body.pushPrice
        ? (was === 'WEBSITE' ? 'LATEST' : was === 'NONE' ? 'NAFAA' : was)
        : (was === 'LATEST' ? 'WEBSITE' : was === 'NAFAA' ? 'NONE' : was);
    }
    if (next.priceFrom !== undefined) next.pushPrice = next.priceFrom === 'NAFAA' || next.priceFrom === 'LATEST';
    if (isPush(c.mode) && body.websitePriceTo !== undefined) next.websitePriceTo = body.websitePriceTo === 'CHANNEL' ? 'CHANNEL' : 'PRODUCT';
    if (isPush(c.mode) && body.autoImport !== undefined) {
      if (body.autoImport && !c.shopId) throw new BadRequestException('Pehle channel ki branch chunein — naye products ka Stock usi branch me aayega');
      next.autoImport = !!body.autoImport;
    }
    // Auto import switched on: the watch reads the channel within five minutes (the baseline is kept).
    if (next.autoImport === true && !c.cfg.autoImport) next.catalogWatch = { ...((next.catalogWatch as any) ?? (raw.catalogWatch as any) ?? {}), scan: null };
    if (body.stockBuffer !== undefined) next.stockBuffer = Math.min(10_000, Math.max(0, Math.floor(Number(body.stockBuffer) || 0)));
    // Stock share and content fields: only where Nafaa pushes.
    if (isPush(c.mode) && (body.stockMode !== undefined || body.stockPercent !== undefined || body.stockFixed !== undefined)) {
      const r = readStockRule({ ...c.cfg, ...next, ...body });
      Object.assign(next, { stockMode: r.mode, stockPercent: r.percent, stockFixed: r.fixed });
    }
    if (isPush(c.mode) && body.pushContent) next.pushContent = readPushContent({ ...c.cfg.pushContent, ...body.pushContent });
    if (isPush(c.mode) && body.pushStock !== undefined) next.pushStock = !!body.pushStock;
    if (isPush(c.mode) && body.autoLink !== undefined) {
      next.autoLink = !!body.autoLink;
      // Switched on: the catalog watch picks the channel up within five minutes.
      if (next.autoLink && !c.cfg.autoLink) next.catalogWatch = { ...((raw.catalogWatch as any) ?? {}), scan: null };
    }
    const updated = await this.prisma.integration.update({ where: { id: c.integration.id }, data: { config: next as any } });
    // New prices / buffer go out in the background (a custom website reads them on its next pull).
    if (isPush(c.mode)) {
      const cfg = readWebsiteConfig(updated.config);
      // Product webhooks tell Nafaa about new products and channel price changes within seconds.
      if (cfg.autoImport || cfg.priceFrom !== 'NONE' || cfg.contentFrom !== 'NONE' || cfg.stockFromChannel) {
        this.background(() => this.installProductHooks(updated), `product hooks ${updated.displayName}`);
      }
      this.background(async () => {
        await this.push.pushPricesFor(updated);
        if (body.stockBuffer !== undefined || body.pushStock === true || body.stockMode !== undefined || body.stockPercent !== undefined || body.stockFixed !== undefined) await this.syncStock(updated);
      }, `settings ${updated.displayName}`);
    }
    return this.info(this.col(updated), await this.shopNames(user.tenantId));
  }

  // ═══════════════════════════════════════════════════════════
  // GRID
  // ═══════════════════════════════════════════════════════════

  private filterWhere(filter: GridFilter, cols: Col[]): Prisma.ProductWhereInput {
    const ids = cols.map((c) => c.integration.id);
    const shops = [...new Set(cols.map((c) => c.shopId).filter(Boolean))] as string[];
    switch (filter) {
      case 'linked':
        return { channelMappings: { some: { integrationId: { in: ids } } } };
      case 'unlinked':
        return {
          OR: ids.flatMap((id) => [
            { hasVariants: false, channelMappings: { none: { integrationId: id } } },
            { hasVariants: true, variants: { some: { isActive: true, channelMappings: { none: { integrationId: id } } } } },
          ]),
        };
      case 'errors':
        return {
          OR: [
            { channelMappings: { some: { integrationId: { in: ids }, syncStatus: 'FAILED' } } },
            { hasVariants: true, channelMappings: { some: { integrationId: { in: ids }, variantId: null } } },
          ],
        };
      case 'unlisted':
        return { channelMappings: { some: { integrationId: { in: ids }, listed: false } } };
      case 'hold':
        return { channelMappings: { some: { integrationId: { in: ids }, NOT: { stockHold: { equals: Prisma.DbNull } } } } };
      case 'price-hold':
        return { channelMappings: { some: { integrationId: { in: ids }, NOT: { priceHold: { equals: Prisma.DbNull } } } } };
      case 'untracked':
        return { channelMappings: { some: { integrationId: { in: ids }, tracksStock: false } } };
      case 'backorder':
        // Sell when out of stock is on (product, size or link), or customers are owed units.
        return {
          OR: [
            { backorder: true },
            { variants: { some: { isActive: true, backorder: true } } },
            { channelMappings: { some: { integrationId: { in: ids }, backorder: true } } },
            ...(shops.length ? [{ shopStocks: { some: { shopId: { in: shops }, stock: { lt: 0 } } } }] : []),
          ],
        };
      case 'out':
        if (!shops.length) return { id: { in: [] } };
        return {
          OR: [
            { hasVariants: false, shopStocks: { some: { shopId: { in: shops }, variantId: null, stock: { lte: 0 } } } },
            { hasVariants: false, shopStocks: { none: { shopId: { in: shops } } } },
            { hasVariants: true, shopStocks: { some: { shopId: { in: shops }, variantId: { not: null }, stock: { lte: 0 } } } },
          ],
        };
      default:
        return {};
    }
  }

  private searchWhere(search?: string): Prisma.ProductWhereInput {
    const q = search?.trim();
    if (!q) return {};
    return {
      OR: [
        { name: { contains: q, mode: 'insensitive' } },
        { sku: { equals: q, mode: 'insensitive' } },
        { barcode: { equals: q } },
        { variants: { some: { OR: [{ sku: { equals: q, mode: 'insensitive' } }, { barcode: { equals: q } }, { name: { contains: q, mode: 'insensitive' } }] } } },
        { channelMappings: { some: { OR: [{ externalSku: { equals: q, mode: 'insensitive' } }, { externalTitle: { contains: q, mode: 'insensitive' } }] } } },
      ],
    };
  }

  /** Product ids whose channel price differs from what the channel last showed. */
  private async priceDiffIds(cols: Col[]): Promise<Set<string>> {
    const out = new Set<string>();
    for (const c of cols) {
      const maps = await this.prisma.productChannelMapping.findMany({
        where: { integrationId: c.integration.id },
        select: { productId: true, variantId: true, priceOverride: true, externalData: true, product: { select: { price: true } }, variant: { select: { price: true } } },
        take: PRICE_SCAN_LIMIT,
      });
      const known = maps.filter((m) => knownPrice(m.externalData) !== null);
      if (!known.length) continue;
      const branch = await this.branchPrices(c.shopId, [...new Set(known.map((m) => m.productId))]);
      for (const m of known) {
        const base = branch.get(mappingKey(m.productId, m.variantId)) ?? Number(m.variantId ? m.variant?.price ?? m.product.price : m.product.price);
        if (!samePrice(this.wantPrice(c, base, m.priceOverride), knownPrice(m.externalData))) out.add(m.productId);
      }
    }
    return out;
  }

  private async branchPrices(shopId: string | null, productIds: string[]) {
    const map = new Map<string, number>();
    if (!shopId || !productIds.length) return map;
    for (let k = 0; k < productIds.length; k += 5000) {
      const rows = await this.prisma.shopStock.findMany({
        where: { shopId, productId: { in: productIds.slice(k, k + 5000) }, shopPrice: { not: null } },
        select: { productId: true, variantId: true, shopPrice: true },
      });
      for (const r of rows) map.set(mappingKey(r.productId, r.variantId), Number(r.shopPrice));
    }
    return map;
  }

  private scopeWhere(scope: GridScope = {}): Prisma.ProductWhereInput {
    return {
      ...(scope.categoryId ? { categoryId: scope.categoryId } : {}),
      ...(scope.brandId ? { brandId: scope.brandId } : {}),
      ...(scope.productId ? { id: scope.productId } : {}),
    };
  }

  private async gridWhere(tenantId: string, cols: Col[], search: string | undefined, filter: GridFilter, scope?: GridScope): Promise<Prisma.ProductWhereInput> {
    const where: Prisma.ProductWhereInput = { AND: [{ tenantId, isActive: true }, this.searchWhere(search), this.filterWhere(filter, cols), this.scopeWhere(scope)] };
    if (filter === 'price') (where.AND as Prisma.ProductWhereInput[]).push({ id: { in: [...(await this.priceDiffIds(cols))] } });
    return where;
  }

  async grid(user: AuthenticatedUser, q: { page?: number; limit?: number; search?: string; filter?: GridFilter; channelId?: string } & GridScope) {
    const all = await this.cols(user.tenantId);
    const cols = q.channelId ? all.filter((c) => c.integration.id === q.channelId) : all;
    const page = Math.max(1, Number(q.page) || 1);
    const limit = Math.min(100, Math.max(5, Number(q.limit) || 30));
    const filter: GridFilter = GRID_FILTERS.includes(q.filter as GridFilter) ? (q.filter as GridFilter) : 'all';
    const shops = await this.shopNames(user.tenantId);
    if (!cols.length) return { channels: [], items: [], total: 0, page, pages: 0, limit };

    const where = await this.gridWhere(user.tenantId, cols, q.search, filter, q);

    const ids = cols.map((c) => c.integration.id);
    const shopIds = [...new Set(cols.map((c) => c.shopId).filter(Boolean))] as string[];
    const [total, products] = await Promise.all([
      this.prisma.product.count({ where }),
      this.prisma.product.findMany({
        where,
        orderBy: [{ name: 'asc' }, { id: 'asc' }],
        skip: (page - 1) * limit,
        take: limit,
        select: {
          id: true, name: true, sku: true, barcode: true, price: true, hasVariants: true, backorder: true, backorderMax: true,
          images: { take: 1, orderBy: { sortOrder: 'asc' }, select: { url: true } },
          variants: { where: { isActive: true }, orderBy: { sortOrder: 'asc' }, select: { id: true, name: true, sku: true, price: true, imageUrl: true, backorder: true } },
          channelMappings: {
            where: { integrationId: { in: ids } },
            select: {
              id: true, integrationId: true, variantId: true, externalProductId: true, externalVariantId: true, externalSku: true, externalTitle: true,
              priceOverride: true, externalData: true, syncStatus: true, syncError: true, lastSyncedAt: true,
              listed: true, allocQty: true, compareAtPrice: true, lastPush: true, backorder: true, stockHold: true, tracksStock: true, priceHold: true,
            },
          },
          shopStocks: shopIds.length ? { where: { shopId: { in: shopIds } }, select: { shopId: true, variantId: true, stock: true, shopPrice: true } } : false,
        },
      }),
    ]);

    const items = products.map((p) => {
      const stocks = (p as any).shopStocks as Array<{ shopId: string; variantId: string | null; stock: number; shopPrice: number | null }> | undefined ?? [];
      const rowOf = (variantId: string | null, label: string | null, sku: string | null, price: number, variantBackorder: boolean | null = null) => {
        const cells: Record<string, unknown> = {};
        const linkOf = (c: Col) => p.channelMappings.find((x) => x.integrationId === c.integration.id && (x.variantId ?? null) === variantId);
        // Stock split per branch: the pushed channels drawing from it share its stock.
        const allocBy = new Map<string, ReturnType<typeof allocate>>();
        for (const shopId of new Set(cols.map((c) => c.shopId).filter(Boolean) as string[])) {
          const raw = Number(stocks.find((s) => s.shopId === shopId && (s.variantId ?? null) === variantId)?.stock ?? 0);
          const claims: Claim[] = cols.filter((c) => c.shopId === shopId && isPush(c.mode) && linkOf(c)).map((c) => {
            const m = linkOf(c)!;
            return { channelId: c.integration.id, rule: stockRule(c.cfg), allocQty: m.allocQty, listed: m.listed };
          });
          allocBy.set(shopId, allocate(raw, claims));
        }
        let scaled = false;
        for (const c of cols) {
          const ss = stocks.find((s) => s.shopId === c.shopId && (s.variantId ?? null) === variantId);
          const base = Number(ss?.shopPrice ?? price);
          const m = linkOf(c);
          const share = c.shopId ? allocBy.get(c.shopId) : undefined;
          if (m && share?.scaled && isPush(c.mode)) scaled = true;
          const stock = m && isPush(c.mode) && c.shopId ? share?.qty[c.integration.id] ?? 0 : this.shownStock(c, ss?.stock);
          const want = this.wantPrice(c, base, m?.priceOverride);
          if (!m) {
            cells[c.integration.id] = { linked: false, price: want, stock, nafaaStock: Number(ss?.stock ?? 0) };
            continue;
          }
          const seen = knownPrice(m.externalData);
          cells[c.integration.id] = {
            linked: true,
            mappingId: m.id,
            externalProductId: m.externalProductId,
            externalVariantId: m.externalVariantId,
            externalTitle: m.externalTitle,
            externalSku: m.externalSku,
            price: want,
            override: isPush(c.mode) ? m.priceOverride : null,
            channelPrice: seen,
            priceDiffers: seen !== null && !samePrice(want, seen),
            stock,
            nafaaStock: Number(ss?.stock ?? 0),
            listed: m.listed,
            // Sell when out of stock on this channel: own setting (null = product) and what is in force there.
            backorder: m.backorder,
            backorderOn: backorderRule(p, { backorder: variantBackorder }, m, c.integration.type).enabled === true,
            allocQty: isPush(c.mode) ? m.allocQty : null,
            compareAtPrice: isPush(c.mode) ? m.compareAtPrice : null,
            lastPush: isPush(c.mode) ? m.lastPush : null,
            // Waiting for the merchant to pick Nafaa or channel stock; nothing is pushed meanwhile.
            hold: isPush(c.mode) ? readHold(m.stockHold) : null,
            // The channel changed the price after Nafaa's last push: waiting for "kaunsi rakhein?".
            priceHold: isPush(c.mode) && m.priceHold ? m.priceHold : null,
            // false = the channel does not count this item's stock ("Channel ginti nahi karta").
            tracksStock: m.tracksStock,
            countOptIn: countOptedIn(m.externalData),
            // Nothing is pushed to a custom website or Indolj, so there is no sync status to show.
            status: isPush(c.mode) ? m.syncStatus : null,
            error: isPush(c.mode) && m.syncStatus === 'FAILED' ? m.syncError ?? 'Sync nahi hua' : null,
            lastSyncedAt: m.lastSyncedAt,
          };
        }
        const mainShop = cols.find((c) => c.shopId)?.shopId ?? null;
        const nafaaStock = mainShop ? Number(stocks.find((s) => s.shopId === mainShop && (s.variantId ?? null) === variantId)?.stock ?? 0) : null;
        // Units owed to customers across the channels' branches (stock below zero).
        const owed = [...new Set(cols.map((c) => c.shopId).filter(Boolean) as string[])]
          .reduce((t, shopId) => t + owedUnits(Number(stocks.find((s) => s.shopId === shopId && (s.variantId ?? null) === variantId)?.stock ?? 0)), 0);
        const backorder = backorderRule(p, { backorder: variantBackorder }).enabled === true;
        return { variantId, label, sku, price, cells, nafaaStock, scaled, backorder, owed };
      };
      const rows = p.hasVariants && p.variants.length
        ? p.variants.map((v) => rowOf(v.id, v.name, v.sku, Number(v.price ?? p.price), v.backorder))
        : [rowOf(null, null, p.sku, Number(p.price))];
      // A product with sizes linked without a size: shown as a problem to fix.
      const sizeLess: Record<string, string> = {};
      if (p.hasVariants) for (const m of p.channelMappings) if (!m.variantId) sizeLess[m.integrationId] = m.id;
      return {
        productId: p.id, name: p.name, sku: p.sku, image: p.images[0]?.url ?? null, hasVariants: p.hasVariants, price: Number(p.price),
        backorder: p.backorder, backorderMax: p.backorderMax,
        rows, sizeLess,
      };
    });

    return { channels: cols.map((c) => this.info(c, shops)), items, total, page, pages: Math.ceil(total / limit), limit };
  }

  async summary(user: AuthenticatedUser, channelId?: string, scope?: GridScope) {
    const all = await this.cols(user.tenantId);
    const cols = channelId ? all.filter((c) => c.integration.id === channelId) : all;
    if (!cols.length) return { all: 0, linked: 0, unlinked: 0, errors: 0, price: 0, out: 0, unlisted: 0, backorder: 0, hold: 0, untracked: 0 };
    const base: Prisma.ProductWhereInput = { tenantId: user.tenantId, isActive: true, ...this.scopeWhere(scope) };
    const count = (f: GridFilter) => this.prisma.product.count({ where: { AND: [base, this.filterWhere(f, cols)] } });
    const [allN, linked, unlinked, errors, out, unlisted, price, backorder] = await Promise.all([
      count('all'), count('linked'), count('unlinked'), count('errors'), count('out'), count('unlisted'),
      this.priceDiffIds(cols).then(async (ids) => (ids.size ? this.prisma.product.count({ where: { ...base, id: { in: [...ids] } } }) : 0)),
      count('backorder'),
    ]);
    const [hold, untracked] = await Promise.all([count('hold'), count('untracked')]);
    return { all: allN, linked, unlinked, errors, price, out, unlisted, backorder, hold, untracked };
  }

  // ═══════════════════════════════════════════════════════════
  // SUGGESTIONS (channel list → Nafaa)
  // ═══════════════════════════════════════════════════════════

  /**
   * Reads a channel's product list, remembers the price it shows on linked
   * items (for "Price farq" and drift re-sends), and matches the open items
   * against the Nafaa catalog. Used by the link screen and the catalog watch.
   */
  async scan(c: Col, refresh = false, only?: Set<string>): Promise<ScanResult> {
    const i = c.integration;
    let remote: RemoteProduct[] = [];
    let remoteError: string | null = null;
    let remoteFailure: unknown = null;
    try {
      remote = await this.catalog.remoteProducts(i, refresh);
      // A few products (product webhook): the rest of the list is not looked at.
      if (only) remote = remote.filter((p) => only.has(p.externalProductId));
    } catch (e) {
      remoteError = friendlySyncError(e);
      remoteFailure = e;
    }

    const mappings = await this.prisma.productChannelMapping.findMany({
      where: { integrationId: i.id, ...(only && { externalProductId: { in: [...only] } }) },
      select: { id: true, linkKey: true, externalProductId: true, externalVariantId: true, externalData: true, tracksStock: true },
    });
    const byVariant = new Map(mappings.filter((m) => m.externalVariantId).map((m) => [String(m.externalVariantId), m]));
    const byProduct = new Map(mappings.filter((m) => !m.externalVariantId && m.externalProductId).map((m) => [String(m.externalProductId), m]));
    const isLinked = (p: RemoteProduct, v: RemoteVariant) =>
      (v.externalVariantId ? byVariant.get(v.externalVariantId) : byProduct.get(p.externalProductId));

    // Remember what the channel shows as price, for "price differs" and the price source.
    const now = new Date().toISOString();
    // Price facts carry the time the list read started; a read older than what a link already knows is not applied.
    const readMs = this.catalog.readAt(i.id) ?? Date.now();
    const readIso = new Date(readMs).toISOString();
    const priceUpdates: Array<{ id: string; data: any; tracks?: boolean }> = [];
    const open: Array<{ p: RemoteProduct; v: RemoteVariant }> = [];
    let linked = 0;
    for (const p of remote) {
      for (const v of p.variants) {
        const m = isLinked(p, v);
        if (!m) { open.push({ p, v }); continue; }
        linked++;
        // Remember the channel price and stock (and whether the channel counts it) for "price differs", the push guard and recovery.
        const d = ((m.externalData as any) ?? {}) as Record<string, any>;
        const knownAt = Date.parse(String(d.channelPriceAt ?? ''));
        const priceMoved = v.price > 0 && Number(d.channelPrice) !== v.price && !(Number.isFinite(knownAt) && knownAt >= readMs);
        const stockKnownAt = Date.parse(String(d.channelStockAt ?? ''));
        const stockMoved = v.stock !== null && v.stock !== undefined && Number(d.channelStock) !== Number(v.stock) && !(Number.isFinite(stockKnownAt) && stockKnownAt >= readMs);
        const tracksMoved = v.tracked !== undefined && v.tracked !== null && m.tracksStock !== v.tracked;
        if (priceMoved || stockMoved || tracksMoved) {
          priceUpdates.push({
            id: m.id,
            data: {
              ...d,
              ...(priceMoved && { channelPrice: v.price, channelPriceAt: readIso }),
              ...(stockMoved && { channelStock: Number(v.stock), channelStockAt: readIso, ...(!d.firstChannelStock && { firstChannelStock: { qty: Number(v.stock), at: now } }) }),
            },
            ...(tracksMoved && { tracks: v.tracked as boolean }),
          });
        }
      }
    }
    for (const u of priceUpdates.slice(0, 5000)) {
      await this.prisma.productChannelMapping.update({ where: { id: u.id }, data: { externalData: u.data, ...(u.tracks !== undefined && { tracksStock: u.tracks }) } }).catch(() => null);
    }

    const products = open.length
      ? await this.prisma.product.findMany({
          where: { tenantId: i.tenantId, isActive: true },
          select: {
            id: true, name: true, sku: true, barcode: true, hasVariants: true, price: true,
            variants: { where: { isActive: true }, select: { id: true, name: true, size: true, color: true, sku: true, barcode: true, price: true } },
          },
        })
      : [];
    const index = new MatchIndex(products as unknown as MatchProduct[]);
    // Nafaa items already linked on this channel are never suggested again (all links, also outside a subset).
    const taken = new Set(only
      ? (await this.prisma.productChannelMapping.findMany({ where: { integrationId: i.id }, select: { linkKey: true } })).map((m) => m.linkKey)
      : mappings.map((m) => m.linkKey));
    const results = suggestAll(open.map(({ p, v }) => ({
      title: p.title, variantTitle: v.title, hasVariants: p.hasVariants, sku: v.sku, barcode: v.barcode, p, v,
    })), index, taken);
    return { at: now, remote, remoteError, remoteFailure, linked, open, results, products: new Map(products.map((p) => [p.id, p])), isLinked };
  }

  async suggestions(user: AuthenticatedUser, channelId: string, refresh = false) {
    const c = await this.requireCol(user.tenantId, channelId);
    // Indolj: its menu (sizes = prices[]) comes through the Indolj keys. A developer-built site cannot be read.
    if (c.mode === 'website') {
      return { canFetch: false, remoteError: WEBSITE_LINKS_NOTE, fetchedAt: null, stats: emptyStats(), sure: [], maybe: [], unmatched: [] };
    }
    if (!this.catalog.kind(c.integration)) {
      return { canFetch: false, remoteError: 'Channel jura nahi — pehle channel ka safha khol kar jorein', fetchedAt: null, stats: emptyStats(), sure: [], maybe: [], unmatched: [] };
    }
    const sc = await this.scan(c, refresh);
    const { remote, open, linked, isLinked } = sc;
    const view = (p: RemoteProduct, v: RemoteVariant) => ({
      externalProductId: p.externalProductId, externalVariantId: v.externalVariantId,
      title: p.title, variantTitle: p.hasVariants ? v.title : null, hasVariants: p.hasVariants,
      sku: v.sku, price: v.price, stock: v.stock, tracked: v.tracked ?? null, image: v.image ?? p.image,
    });
    const sure: any[] = [];
    const maybe: any[] = [];
    const unmatchedBy = new Map<string, { externalProductId: string; title: string; image: string | null; hasVariants: boolean; anyLinked: boolean; variants: any[] }>();
    for (const { item, match } of sc.results) {
      if (match) {
        const np = sc.products.get(match.productId)!;
        const nv = match.variantId ? np.variants.find((x) => x.id === match.variantId) : null;
        const row = {
          ...view(item.p, item.v),
          match: {
            productId: match.productId, variantId: match.variantId, kind: match.kind, score: match.score,
            name: np.name, variantName: nv?.name ?? null, sku: nv?.sku ?? np.sku, price: Number(nv?.price ?? np.price),
          },
        };
        (match.kind === 'sku' ? sure : maybe).push(row);
        continue;
      }
      const g = unmatchedBy.get(item.p.externalProductId) ?? {
        externalProductId: item.p.externalProductId, title: item.p.title, image: item.p.image, hasVariants: item.p.hasVariants,
        anyLinked: item.p.variants.some((v) => !!isLinked(item.p, v)), variants: [] as any[],
      };
      g.variants.push(view(item.p, item.v));
      unmatchedBy.set(item.p.externalProductId, g);
    }
    maybe.sort((a, b) => b.match.score - a.match.score);
    const unmatched = [...unmatchedBy.values()].map((g) => ({
      ...g,
      // Only a listing with nothing linked or suggested can be created in Nafaa as a whole.
      canImport: !g.anyLinked && g.variants.length === (remote.find((p) => p.externalProductId === g.externalProductId)?.variants.length ?? 0),
    }));

    return {
      canFetch: true,
      remoteError: sc.remoteError,
      fetchedAt: sc.at,
      stats: { products: remote.length, variants: linked + open.length, linked, sure: sure.length, maybe: maybe.length, unmatched: open.length - sure.length - maybe.length },
      sure,
      maybe,
      unmatched,
    };
  }

  /**
   * Links every "Pakka" (SKU/barcode) match of a scan and records it in the
   * channel activity. Shayad matches are never linked this way.
   */
  async linkSureFor(c: Col, sc: ScanResult, auto: boolean) {
    const links = pickSureLinks(sc.results);
    if (!links.length) return { saved: 0, errors: [] as string[] };
    const res = await this.catalog.saveLinksFor(c.integration, c.integration.tenantId, links);
    if (res.saved) {
      await this.prisma.syncLog.create({
        data: {
          integrationId: c.integration.id, tenantId: c.integration.tenantId, operation: 'PRODUCT_LINK', direction: 'INBOUND', status: 'SUCCESS',
          recordsSuccess: res.saved, recordsFailed: res.errors.length,
          details: { auto, how: 'sku', items: links.slice(0, 200).map((l) => l.externalTitle ?? l.externalSku ?? l.externalProductId) } as any,
          completedAt: new Date(),
        },
      }).catch(() => null);
      const productIds = [...new Set(links.map((l) => l.productId))];
      this.background(() => this.syncProducts(c.integration, productIds), `auto link ${c.integration.displayName}`);
    }
    return res;
  }

  /** "Sab pakke jod dein" from the Masle panel. */
  async linkSure(user: AuthenticatedUser, channelId: string) {
    const c = await this.requireCol(user.tenantId, channelId);
    if (c.mode === 'website') throw new BadRequestException(WEBSITE_LINKS_NOTE);
    const sc = await this.scan(c, false);
    if (sc.remoteError && !sc.remote.length) throw new BadRequestException(sc.remoteError);
    const res = await this.linkSureFor(c, sc, false);
    await this.patchWatch(c.integration.id, (w) => ({ ...w, scan: w.scan ? { ...w.scan, sure: 0 } : w.scan }));
    return res;
  }

  /** Removes links made without a size on products that have sizes (they bill "Available: 0"). */
  async fixSizeLess(user: AuthenticatedUser, channelId: string) {
    const c = await this.requireCol(user.tenantId, channelId);
    const res = await this.prisma.productChannelMapping.deleteMany({ where: { integrationId: c.integration.id, variantId: null, product: { hasVariants: true } } });
    this.catalog.forget(c.integration.id);
    return { removed: res.count };
  }

  /** Read-modify-write of the catalog watch state in the channel config. */
  async patchWatch(integrationId: string, fn: (w: any) => any) {
    const fresh = await this.prisma.integration.findUnique({ where: { id: integrationId }, select: { config: true } });
    const cfg = ((fresh?.config as any) ?? {}) as Record<string, any>;
    await this.prisma.integration.update({ where: { id: integrationId }, data: { config: { ...cfg, catalogWatch: fn(cfg.catalogWatch ?? {}) } as any } });
  }

  /** What needs attention, per channel, each with one fix. */
  async issues(user: AuthenticatedUser) {
    const cols = await this.cols(user.tenantId);
    if (!cols.length) return { issues: [] };
    const ids = cols.map((c) => c.integration.id);
    const [sizeLess, failed, why, held, priceHeld, jumpHeld, suspects] = await Promise.all([
      this.prisma.productChannelMapping.groupBy({ by: ['integrationId'], where: { integrationId: { in: ids }, variantId: null, product: { hasVariants: true } }, _count: { _all: true } }),
      this.prisma.productChannelMapping.groupBy({ by: ['integrationId'], where: { integrationId: { in: ids }, syncStatus: 'FAILED' }, _count: { _all: true } }),
      this.prisma.productChannelMapping.groupBy({ by: ['integrationId', 'syncError'], where: { integrationId: { in: ids }, syncStatus: 'FAILED' }, _count: { _all: true } }),
      this.prisma.productChannelMapping.groupBy({ by: ['integrationId'], where: { integrationId: { in: ids }, NOT: { stockHold: { equals: Prisma.DbNull } } }, _count: { _all: true } }),
      this.prisma.productChannelMapping.groupBy({ by: ['integrationId'], where: { integrationId: { in: ids }, NOT: { priceHold: { equals: Prisma.DbNull } } }, _count: { _all: true } }),
      this.prisma.productChannelMapping.groupBy({ by: ['integrationId'], where: { integrationId: { in: ids }, priceHold: { path: ['reason'], equals: 'big-jump' } }, _count: { _all: true } }),
      this.scanSuspects(user.tenantId).catch(() => [] as SuspectRow[]),
    ]);
    // Failed links per stored error text, so the screen can group them by cause.
    const reasonsOf = (id: string) => why.filter((r) => r.integrationId === id).map((r) => ({ error: r.syncError ?? null, count: r._count._all })).sort((a, b) => b.count - a.count);
    const n = (rows: Array<{ integrationId: string; _count: { _all: number } }>, id: string) => rows.find((r) => r.integrationId === id)?._count._all ?? 0;
    const issues: Array<{
      id: string; channelId: string; tone: 'danger' | 'warning' | 'info';
      kind: 'reconnect' | 'fix-size-less' | 'errors' | 'link-sure' | 'link' | 'stock-hold' | 'price-hold' | 'price-jump' | 'suspect-link' | 'new-products'; text: string; detail?: string | null; count?: number;
      reasons?: Array<{ error: string | null; count: number }>;
    }> = [];
    for (const c of cols) {
      const i = c.integration;
      if (!i.isActive) continue;
      const name = i.displayName;
      const watch = ((i.config as any)?.catalogWatch ?? {}) as any;
      if (isPush(c.mode) && (!this.connected(i) || i.status === IntegrationStatus.ERROR)) {
        issues.push({ id: `${i.id}:reconnect`, channelId: i.id, tone: 'danger', kind: 'reconnect', text: `${name} jura nahi — dobara jorein`, detail: (i.config as any)?.darazError ?? watch.scan?.error ?? null });
      }
      const bad = n(sizeLess, i.id);
      if (bad) issues.push({ id: `${i.id}:size`, channelId: i.id, tone: 'danger', kind: 'fix-size-less', count: bad, text: `${name}: ${bad} size wale ${bad === 1 ? 'product' : 'products'} bina size jure — theek karein` });
      const f = isPush(c.mode) ? n(failed, i.id) : 0;
      if (f) issues.push({ id: `${i.id}:errors`, channelId: i.id, tone: 'warning', kind: 'errors', count: f, reasons: reasonsOf(i.id), text: `${name}: ${f} ${f === 1 ? 'product' : 'products'} ka Stock/Price nahi ja raha` });
      const h = isPush(c.mode) ? n(held, i.id) : 0;
      if (h) issues.push({ id: `${i.id}:hold`, channelId: i.id, tone: 'warning', kind: 'stock-hold', count: h, text: `${name}: ${h} links par Stock milana baqi — Nafaa ya channel ka Stock chunein` });
      const pj = isPush(c.mode) ? n(jumpHeld, i.id) : 0;
      if (pj) issues.push({ id: `${i.id}:price-jump`, channelId: i.id, tone: 'warning', kind: 'price-jump', count: pj, text: `${name}: ${pj} links par qeemat bahut badal rahi hai — check karein` });
      const sus = suspects.filter((r) => r.channelId === i.id).length;
      if (sus) issues.push({ id: `${i.id}:suspect`, channelId: i.id, tone: 'warning', kind: 'suspect-link', count: sus, text: `${name}: ${sus} links shayad ghalat jure hain` });
      const ph = isPush(c.mode) ? Math.max(0, n(priceHeld, i.id) - pj) : 0;
      if (ph) issues.push({ id: `${i.id}:price-hold`, channelId: i.id, tone: 'warning', kind: 'price-hold', count: ph, text: `${name}: ${ph} links par website par qeemat badli — kaunsi rakhein?` });
      const sure = Number(watch.scan?.sure ?? 0);
      if (sure && c.mode !== 'website') issues.push({ id: `${i.id}:sure`, channelId: i.id, tone: 'info', kind: 'link-sure', count: sure, text: `${name}: ${sure} products jorna baqi — sab pakke jod dein` });
      // New channel products with no Nafaa match: "Sab laayein". Other new items wait to be linked.
      const importable = isPush(c.mode) ? Number(watch.scan?.newProducts ?? 0) : 0;
      if (importable) issues.push({ id: `${i.id}:new-products`, channelId: i.id, tone: 'info', kind: 'new-products', count: importable, text: `${name}: ${importable} naye products website par` });
      const fresh = Number(watch.scan?.newUnlinked ?? 0);
      if (fresh && !importable && c.mode !== 'website') issues.push({ id: `${i.id}:new`, channelId: i.id, tone: 'info', kind: 'link', count: fresh, text: `${name}: ${fresh} naye products Nafaa se jure nahi` });
    }
    return { issues };
  }

  // ═══════════════════════════════════════════════════════════
  // ACTIONS
  // ═══════════════════════════════════════════════════════════

  async link(user: AuthenticatedUser, channelId: string, links: LinkInput[]) {
    const c = await this.requireCol(user.tenantId, channelId);
    if (c.mode === 'website') throw new BadRequestException(WEBSITE_LINKS_NOTE);
    // saveLinksFor takes 500 at a time; every link is saved.
    const res = { saved: 0, held: 0, errors: [] as string[] };
    for (let k = 0; k < (links ?? []).length; k += 500) {
      const r = await this.catalog.saveLinksFor(c.integration, user.tenantId, links.slice(k, k + 500));
      res.saved += r.saved;
      res.held += r.held;
      res.errors.push(...r.errors);
    }
    if (res.saved) {
      const productIds = [...new Set((links ?? []).map((l) => l.productId))];
      this.background(() => this.syncProducts(c.integration, productIds), `link ${c.integration.displayName}`);
    }
    return res;
  }

  async importItems(user: AuthenticatedUser, channelId: string, externalProductIds: string[]) {
    const c = await this.requireCol(user.tenantId, channelId);
    if (c.mode === 'website') throw new BadRequestException(WEBSITE_LINKS_NOTE);
    if (!Array.isArray(externalProductIds) || !externalProductIds.length) throw new BadRequestException('Koi product nahi chuna');
    const ids = [...new Set(externalProductIds.map(String))];
    // Big picks run as a background job with progress.
    if (ids.length > 25) return this.jobs.start({ tenantId: user.tenantId, userId: user.id, kind: 'IMPORT_ALL', integrationId: c.integration.id, items: ids, params: { channelType: c.integration.type } });
    return this.catalog.importFor(c.integration, user.tenantId, ids);
  }

  /** Which Nafaa size each channel SKU of one product would link to. */
  async linkPlan(user: AuthenticatedUser, channelId: string, externalProductId: string, productId: string) {
    const c = await this.requireCol(user.tenantId, channelId);
    if (c.mode === 'website') throw new BadRequestException(WEBSITE_LINKS_NOTE);
    if (!externalProductId || !productId) throw new BadRequestException('Product chunein');
    return this.catalog.linkPlan(c.integration, user.tenantId, String(externalProductId), String(productId));
  }

  /** A channel product (every SKU, or the picked ones) into an existing Nafaa product; missing sizes are made. */
  async linkInto(user: AuthenticatedUser, channelId: string, body: { externalProductId?: string; productId?: string; variants?: Array<{ externalVariantId: string | null; variantId: string | null }>; confirm?: boolean }) {
    const c = await this.requireCol(user.tenantId, channelId);
    if (c.mode === 'website') throw new BadRequestException(WEBSITE_LINKS_NOTE);
    if (!body?.externalProductId || !body?.productId) throw new BadRequestException('Product chunein');
    const plan = Array.isArray(body.variants)
      ? body.variants.map((v) => ({ externalVariantId: v?.externalVariantId ? String(v.externalVariantId) : null, variantId: v?.variantId ? String(v.variantId) : null }))
      : null;
    const res = await this.catalog.importIntoFor(c.integration, user.tenantId, String(body.externalProductId), String(body.productId), plan, body.confirm === true);
    this.background(() => this.syncProducts(c.integration, [String(body.productId)]), `link into ${c.integration.displayName}`);
    return res;
  }

  private async mapping(tenantId: string, mappingId: string) {
    const m = await this.prisma.productChannelMapping.findFirst({
      where: { id: mappingId, integration: { tenantId, type: { in: [...PRODUCT_CHANNEL_TYPES] } } },
      include: { integration: true },
    });
    if (!m) throw new NotFoundException('Link nahi mila');
    return m;
  }

  async unlink(user: AuthenticatedUser, mappingId: string) {
    const m = await this.mapping(user.tenantId, mappingId);
    await this.prisma.productChannelMapping.delete({ where: { id: m.id } });
    this.catalog.forget(m.integrationId);
    this.suspectCache.delete(user.tenantId);
    return { success: true };
  }

  // ═══════════════════════════════════════════════════════════
  // "GHALAT LINK?" — links that look like two different items
  // ═══════════════════════════════════════════════════════════

  private readonly suspectCache = new Map<string, { at: number; rows: SuspectRow[] }>();

  /**
   * Existing links whose names share no meaningful word (and no SKU/barcode
   * match), or whose Nafaa and channel prices are more than 3x apart. A link
   * the merchant marked "Theek hai" is left out until its channel title
   * changes. Read only; cached for five minutes per business.
   */
  private async scanSuspects(tenantId: string): Promise<SuspectRow[]> {
    const hit = this.suspectCache.get(tenantId);
    if (hit && Date.now() - hit.at < 5 * 60_000) return hit.rows;
    const rows: SuspectRow[] = [];
    for (const c of (await this.cols(tenantId)).filter((x) => x.mode !== 'website' && x.integration.isActive)) {
      let cursor: string | undefined;
      for (;;) {
        const maps = await this.prisma.productChannelMapping.findMany({
          where: { integrationId: c.integration.id, externalProductId: { not: null } },
          select: {
            id: true, productId: true, variantId: true, externalTitle: true, externalSku: true, externalData: true, priceOverride: true,
            product: { select: { name: true, sku: true, barcode: true, price: true } }, variant: { select: { name: true, sku: true, barcode: true, price: true } },
          },
          orderBy: { id: 'asc' }, take: 2000, ...(cursor ? { skip: 1, cursor: { id: cursor } } : {}),
        });
        if (!maps.length) break;
        cursor = maps[maps.length - 1].id;
        for (const m of maps) {
          const d = ((m.externalData as any) ?? {}) as Record<string, any>;
          if (d.linkOk && d.linkOk.title === (m.externalTitle ?? null)) continue;
          // The channel's own price from before Nafaa first overwrote it, when known.
          const before = Number(d.channelPriceBefore?.price);
          const channel = before > 0 ? before : Number(d.channelPrice) || null;
          const nafaaPrice = this.wantPrice(c, Number(m.variant?.price ?? m.product.price), m.priceOverride);
          const reasons = suspectLink({
            remoteTitle: m.externalTitle, remoteCodes: [m.externalSku],
            nafaaName: [m.product.name, m.variant?.name].filter(Boolean).join(' '),
            nafaaCodes: [m.product.sku, m.product.barcode, m.variant?.sku, m.variant?.barcode],
            nafaaPrice, channelPrice: channel,
          });
          if (!reasons.length) continue;
          rows.push({
            mappingId: m.id, channelId: c.integration.id, productId: m.productId, variantId: m.variantId,
            name: m.product.name, variantName: m.variant?.name ?? null, externalTitle: m.externalTitle, externalSku: m.externalSku,
            nafaaPrice, channelPrice: channel, reasons,
          });
        }
        if (maps.length < 2000) break;
      }
    }
    this.suspectCache.set(tenantId, { at: Date.now(), rows });
    return rows;
  }

  async suspectLinks(user: AuthenticatedUser, channelId?: string) {
    const all = await this.scanSuspects(user.tenantId);
    const items = channelId ? all.filter((r) => r.channelId === channelId) : all;
    return { total: items.length, items: items.slice(0, 500) };
  }

  /** "Theek hai": the merchant checked these links; they are not flagged again until the channel title changes. */
  async markLinksOk(user: AuthenticatedUser, mappingIds: string[]) {
    this.setup.assertCanManage(user);
    const ids = [...new Set((mappingIds ?? []).map(String))].slice(0, 1000);
    if (!ids.length) throw new BadRequestException('Koi link nahi chuna');
    const maps = await this.prisma.productChannelMapping.findMany({
      where: { id: { in: ids }, integration: { tenantId: user.tenantId } },
      select: { id: true, externalTitle: true, externalData: true },
    });
    const at = new Date().toISOString();
    for (const m of maps) {
      await this.prisma.productChannelMapping.update({
        where: { id: m.id },
        data: { externalData: { ...((m.externalData as any) ?? {}), linkOk: { at, by: user.id, title: m.externalTitle ?? null } } as any },
      });
    }
    this.suspectCache.delete(user.tenantId);
    return { saved: maps.length };
  }

  async setPrice(user: AuthenticatedUser, mappingId: string, priceOverride: number | null) {
    const m = await this.mapping(user.tenantId, mappingId);
    if (this.modeOf(m.integration) === 'indolj') throw new BadRequestException('Indolj par Price Indolj panel se badlein');
    if (this.modeOf(m.integration) === 'website') throw new BadRequestException('Website ko Nafaa wali Price jati hai — product ki Price Nafaa me badlein');
    const value = priceOverride === null || priceOverride === undefined || (priceOverride as any) === '' ? null : Number(priceOverride);
    if (value !== null && (!Number.isFinite(value) || value <= 0 || value > 100_000_000)) throw new BadRequestException('Price sahi nahi');
    await this.prisma.productChannelMapping.update({ where: { id: m.id }, data: { priceOverride: value === null ? null : Math.round(value * 100) / 100 } });
    this.background(() => this.push.pushPricesFor(m.integration, { id: m.id }), `price ${m.integration.displayName}`);
    return { success: true, priceOverride: value };
  }

  /** "Sync now" for one channel: all stock, then prices that changed. */
  async syncChannel(user: AuthenticatedUser, channelId: string) {
    const c = await this.requireCol(user.tenantId, channelId);
    if (c.mode === 'indolj') throw new BadRequestException('Indolj par Stock track nahi hota aur Price Indolj panel se badalti hai — bhejne ko kuch nahi');
    if (c.mode === 'website') throw new BadRequestException('Website Stock aur Price khud Nafaa se leti hai — yahan se bhejne ki zaroorat nahi');
    if (!this.connected(c.integration)) throw new BadRequestException('Channel jura nahi — pehle channel ka safha khol kar jorein');
    if (await pushPaused(this.prisma, c.integration.type)) throw new BadRequestException(pausedMessage(c.integration.type));
    const out: { stock: unknown; prices: number; error: string | null; stockOff: boolean } = { stock: null, prices: 0, error: null, stockOff: !c.cfg.pushStock };
    try {
      out.stock = await this.syncStock(c.integration);
      out.prices = (await this.push.pushPricesFor(c.integration)).sent;
    } catch (e) {
      out.error = friendlySyncError(e);
    }
    return out;
  }

  /** "Sync now" for one product on every channel it is linked to. */
  async syncProduct(user: AuthenticatedUser, productId: string, opts: { content?: boolean } = {}) {
    const product = await this.prisma.product.findFirst({ where: { id: productId, tenantId: user.tenantId }, select: { id: true } });
    if (!product) throw new NotFoundException('Product nahi mila');
    const cols = await this.cols(user.tenantId);
    const results: Array<{ channelId: string; name: string; ok: boolean; error: string | null }> = [];
    // Only channels Nafaa pushes to; custom websites pull, Indolj keeps no stock.
    for (const c of cols.filter((x) => isPush(x.mode))) {
      const linked = await this.prisma.productChannelMapping.count({ where: { integrationId: c.integration.id, productId } });
      if (!linked) continue;
      try {
        if (!this.connected(c.integration)) throw new BadRequestException('Channel jura nahi');
        // "Retry" with content: title, images … and listed status go again too.
        if (opts.content) {
          const r = await this.content.push(c.integration, [productId]);
          if (r.errors.length) throw new BadRequestException(r.errors[0]);
        }
        await this.syncProducts(c.integration, [productId], true);
        results.push({ channelId: c.integration.id, name: c.integration.displayName, ok: true, error: null });
      } catch (e) {
        results.push({ channelId: c.integration.id, name: c.integration.displayName, ok: false, error: friendlySyncError(e) });
      }
    }
    return { results };
  }

  private async syncStock(i: Integration) {
    if (!this.connected(i)) return null;
    switch (i.type) {
      // Every link, page by page with a pause per platform, then the SKU listing pass.
      case 'WOOCOMMERCE': return this.woo.syncAllStock(i);
      case 'SHOPIFY': return this.shopify.syncAllStock(i);
      case 'DARAZ': return this.daraz.syncStock(i);
      default: return null;
    }
  }

  /** Stock and price for some products on one channel (after linking, or "Sync now"). */
  async syncProducts(i: Integration, productIds: string[], force = false) {
    if (!(PUSH_TYPES as readonly string[]).includes(i.type) || !this.connected(i) || !productIds.length) return;
    // Platform kill switch: the job or "Sync now" reports the pause instead of sending.
    if (await pushPaused(this.prisma, i.type)) throw new BadRequestException(pausedMessage(i.type));
    if (i.type === 'DARAZ') {
      await this.daraz.syncStock(i, { productIds });
    } else if (i.type === 'WOOCOMMERCE' || i.type === 'SHOPIFY') {
      const links = await this.prisma.productChannelMapping.findMany({
        where: { integrationId: i.id, productId: { in: productIds }, externalProductId: { not: null } },
        select: { externalProductId: true, externalVariantId: true },
      });
      const onlyLinks = links.map((l) => ({ externalProductId: String(l.externalProductId), externalVariantId: l.externalVariantId ? String(l.externalVariantId) : null }));
      if (onlyLinks.length) {
        if (i.type === 'WOOCOMMERCE') await this.woo.syncStock(i, { onlyLinks });
        else if (i.type === 'SHOPIFY') await this.shopify.syncStock(i, { onlyLinks });
      }
    }
    await this.push.pushPricesFor(i, { productId: { in: productIds } }, force);
  }

  // ═══════════════════════════════════════════════════════════
  // MASTER CATALOG — per-link control, bulk actions, background jobs
  // ═══════════════════════════════════════════════════════════

  /** Listed, own stock share, own price and sale price for one link. */
  async updateLink(user: AuthenticatedUser, mappingId: string, body: { listed?: boolean; allocQty?: number | null; priceOverride?: number | null; compareAtPrice?: number | null }) {
    const m = await this.mapping(user.tenantId, mappingId);
    if (!isPush(this.modeOf(m.integration))) throw new BadRequestException('Is channel ko Nafaa se kuch nahi jata — ye Stock aur Price khud leta hai');
    const data: Prisma.ProductChannelMappingUpdateInput = {};
    if (body.listed !== undefined) data.listed = !!body.listed;
    if (body.allocQty !== undefined) data.allocQty = cleanQty(body.allocQty);
    if (body.priceOverride !== undefined) data.priceOverride = cleanPrice(body.priceOverride);
    if (body.compareAtPrice !== undefined) data.compareAtPrice = cleanPrice(body.compareAtPrice);
    const saved = await this.prisma.productChannelMapping.update({
      where: { id: m.id }, data,
      select: { id: true, listed: true, allocQty: true, priceOverride: true, compareAtPrice: true },
    });
    this.background(async () => {
      if (body.listed !== undefined) await this.content.push(m.integration, [m.productId], { statusOnly: true });
      // A share change can move the other channels' shares too (scaled fixed shares).
      if (body.allocQty !== undefined || body.listed !== undefined) await this.pushEverywhere(user.tenantId, [m.productId], false);
      else await this.syncProducts(m.integration, [m.productId], true);
    }, `link ${m.integration.displayName}`);
    return { success: true, link: saved };
  }

  /** Product ids picked on the grid: the given list, or every product matching the grid's search/filter. */
  async selectionIds(user: AuthenticatedUser, sel: Selection | undefined): Promise<string[]> {
    if (sel?.all) {
      const all = await this.cols(user.tenantId);
      const cols = sel.channelId ? all.filter((c) => c.integration.id === sel.channelId) : all;
      if (!cols.length) return [];
      const filter: GridFilter = GRID_FILTERS.includes(sel.filter as GridFilter) ? (sel.filter as GridFilter) : 'all';
      const scope = { categoryId: sel.categoryId || undefined, brandId: sel.brandId || undefined };
      const rows = await this.prisma.product.findMany({ where: await this.gridWhere(user.tenantId, cols, sel.search, filter, scope), select: { id: true }, orderBy: { id: 'asc' } });
      return rows.map((r) => r.id);
    }
    const ids = [...new Set((sel?.productIds ?? []).map(String))];
    if (!ids.length) return [];
    const ok = await this.prisma.product.findMany({ where: { id: { in: ids }, tenantId: user.tenantId }, select: { id: true } });
    return ok.map((r) => r.id);
  }

  /**
   * One action on many products: listed on/off, stock share, own price, sale
   * price, push now, or publish to a channel. The database part is done at
   * once; the channel part runs as a background job with progress.
   */
  async bulk(user: AuthenticatedUser, body: { selection?: Selection; action?: BulkAction; channelId?: string | null; value?: unknown }) {
    const action = body?.action;
    if (!action || !['listed', 'alloc', 'price', 'pricePercent', 'compareAt', 'push', 'publish'].includes(action)) throw new BadRequestException('Kaam chunein');
    const ids = await this.selectionIds(user, body.selection);
    if (!ids.length) throw new BadRequestException('Koi product nahi chuna');
    const all = (await this.cols(user.tenantId)).filter((c) => isPush(c.mode));
    const targets = body.channelId ? all.filter((c) => c.integration.id === body.channelId) : all;
    if (!targets.length) throw new BadRequestException(body.channelId ? 'Ye channel Nafaa se Stock/Price nahi leta' : 'Koi channel nahi jahan Nafaa bhejta hai');
    const targetIds = targets.map((c) => c.integration.id);
    const single = targets.length === 1 ? targets[0] : null;

    if (action === 'publish') {
      if (!single || !(single.mode === 'shopify' || single.mode === 'woocommerce')) throw new BadRequestException('Naya product sirf Shopify ya WooCommerce par ban sakta hai — ek channel chunein');
      if (!this.connected(single.integration)) throw new BadRequestException('Channel jura nahi — pehle channel ka safha khol kar jorein');
      const linked = new Set<string>();
      for (let k = 0; k < ids.length; k += 5000) {
        const rows = await this.prisma.productChannelMapping.findMany({ where: { integrationId: single.integration.id, productId: { in: ids.slice(k, k + 5000) } }, select: { productId: true }, distinct: ['productId'] });
        for (const r of rows) linked.add(r.productId);
      }
      const fresh = ids.filter((id) => !linked.has(id));
      const res = await this.jobs.start({
        tenantId: user.tenantId, userId: user.id, kind: 'PUBLISH', integrationId: single.integration.id, items: fresh,
        params: { channelType: single.integration.type, listed: body.value !== false, skipped: ids.length - fresh.length },
      });
      return { updated: 0, skipped: ids.length - fresh.length, ...res };
    }

    let updated = 0;
    if (action === 'pricePercent') updated = await this.priceByPercent(targets, ids, Number(body.value));
    const data: Prisma.ProductChannelMappingUpdateManyMutationInput =
      action === 'listed' ? { listed: body.value !== false }
        : action === 'alloc' ? { allocQty: cleanQty(body.value as any) }
          : action === 'price' ? { priceOverride: cleanPrice(body.value as any) }
            : action === 'compareAt' ? { compareAtPrice: cleanPrice(body.value as any) }
              : {};
    if (action !== 'push' && action !== 'pricePercent') {
      for (let k = 0; k < ids.length; k += 5000) {
        const r = await this.prisma.productChannelMapping.updateMany({ where: { integrationId: { in: targetIds }, productId: { in: ids.slice(k, k + 5000) } }, data });
        updated += r.count;
      }
    }
    // Stock shares affect every channel on the branch, so those pushes go everywhere.
    const everywhere = action === 'alloc' || action === 'listed';
    const params = {
      channelIds: everywhere ? null : targetIds,
      channelType: everywhere ? null : single?.integration.type ?? null,
      content: action === 'push' && body.value !== 'stock',
      status: action === 'listed' || action === 'push',
      price: action === 'price' || action === 'pricePercent' || action === 'compareAt' || action === 'push',
      action,
    };
    const res = await this.jobs.start({ tenantId: user.tenantId, userId: user.id, kind: 'PUSH', integrationId: everywhere ? null : single?.integration.id ?? null, items: ids, params });
    return { updated, ...res };
  }

  /**
   * Own price on each picked link = the channel's rule price moved by a
   * percent (+10 = 10% more, -5 = 5% less). Links with the same new price
   * are written together.
   */
  private async priceByPercent(targets: Col[], ids: string[], pct: number): Promise<number> {
    if (!Number.isFinite(pct) || pct <= -90 || pct > 500 || pct === 0) throw new BadRequestException('Percent -90 se 500 ke darmiyan likhein');
    let updated = 0;
    for (const c of targets) {
      for (let k = 0; k < ids.length; k += 2000) {
        const chunk = ids.slice(k, k + 2000);
        const [maps, shopPrices] = await Promise.all([
          this.prisma.productChannelMapping.findMany({
            where: { integrationId: c.integration.id, productId: { in: chunk } },
            select: { id: true, productId: true, variantId: true, product: { select: { price: true } }, variant: { select: { price: true } } },
          }),
          this.branchPrices(c.shopId, chunk),
        ]);
        const byPrice = new Map<number, string[]>();
        for (const m of maps) {
          const base = shopPrices.get(mappingKey(m.productId, m.variantId)) ?? Number(m.variant?.price ?? m.product.price ?? 0);
          const rule = this.wantPrice(c, base, null);
          if (!(rule > 0)) continue;
          const next = Math.max(1, Math.round(rule * (1 + pct / 100)));
          byPrice.set(next, [...(byPrice.get(next) ?? []), m.id]);
        }
        for (const [price, mids] of byPrice) {
          const r = await this.prisma.productChannelMapping.updateMany({ where: { id: { in: mids } }, data: { priceOverride: price } });
          updated += r.count;
        }
      }
    }
    return updated;
  }

  /** "Sab le aayein": every channel item with no Nafaa match is made in Nafaa (with sizes) and linked. */
  async importAll(user: AuthenticatedUser, channelId: string) {
    const c = await this.requireCol(user.tenantId, channelId);
    if (c.mode === 'website') throw new BadRequestException(WEBSITE_LINKS_NOTE);
    const sc = await this.scan(c, true);
    if (sc.remoteError && !sc.remote.length) throw new BadRequestException(sc.remoteError);
    const open = new Map<string, number>();
    for (const { item, match } of sc.results) if (!match) open.set(item.p.externalProductId, (open.get(item.p.externalProductId) ?? 0) + 1);
    // Only listings with nothing linked or suggested; suggested ones are linked, not made twice.
    const ids = sc.remote.filter((p) => p.variants.length && open.get(p.externalProductId) === p.variants.length).map((p) => p.externalProductId);
    const sure = pickSureLinks(sc.results).length;
    this.catalog.holdCache(c.integration.id, 15 * 60_000);
    const res = await this.jobs.start({ tenantId: user.tenantId, userId: user.id, kind: 'IMPORT_ALL', integrationId: c.integration.id, items: ids, params: { channelType: c.integration.type } });
    return { ...res, sure, maybe: sc.results.filter((r) => r.match && r.match.kind !== 'sku').length };
  }

  /**
   * Channel products that are new since the catalog watch began and have no
   * Nafaa match (see newProductPicks). `announced` = ids a product webhook
   * reported as created.
   */
  newProductIds(sc: ScanResult, state: WatchState | null | undefined, announced: string[] = []) {
    const told = new Set(announced.map(String));
    return newProductPicks({
      remote: sc.remote,
      results: sc.results,
      isNew: (p, v) => isNewItem(state, itemKey(p, v), told.has(p.externalProductId)),
    });
  }

  /**
   * Brings channel products into Nafaa without a click ("Website ke naye
   * products khud Nafaa me laayein"): the same import as "Sab le aayein", so
   * stock comes in as opening stock, an existing Nafaa item waits on
   * "Stock milana baqi", and untracked items stay untracked. More than 25 go
   * as a background job (shown under Activity).
   */
  async autoImport(c: Col, externalProductIds: string[], how: 'watch' | 'webhook') {
    if (!autoImportAllowed(c.cfg, c.mode, c.shopId) || !externalProductIds.length) return { imported: 0, queued: 0 };
    const i = c.integration;
    const ids = [...new Set(externalProductIds.map(String))].slice(0, 2000);
    if (ids.length > 25) {
      this.catalog.holdCache(i.id, 15 * 60_000);
      const res = await this.jobs.start({ tenantId: i.tenantId, userId: null, kind: 'IMPORT_ALL', integrationId: i.id, items: ids, params: { channelType: i.type, auto: how } });
      return { imported: 0, queued: res.existing ? 0 : ids.length };
    }
    const res = await this.catalog.importFor(i, i.tenantId, ids);
    await this.prisma.syncLog.create({
      data: {
        integrationId: i.id, tenantId: i.tenantId, operation: 'PRODUCTS_IMPORT', direction: 'INBOUND', status: res.failed && !res.created && !res.linkedExisting ? 'FAILED' : 'SUCCESS',
        recordsSuccess: res.created + res.linkedExisting, recordsFailed: res.failed,
        details: { auto: how, created: res.created, linkedExisting: res.linkedExisting, held: res.held, untracked: res.untracked, errors: res.errors.slice(0, 10) } as any,
        completedAt: new Date(),
      },
    }).catch(() => null);
    return { imported: res.created + res.linkedExisting, queued: 0 };
  }

  /** "Sab laayein" from the Masle panel: every new channel product with no Nafaa match. */
  async importNew(user: AuthenticatedUser, channelId: string) {
    const c = await this.requireCol(user.tenantId, channelId);
    if (!isPush(c.mode)) throw new BadRequestException(WEBSITE_LINKS_NOTE);
    if (!c.shopId) throw new BadRequestException('Pehle channel ki branch chunein — naye products ka Stock usi branch me aayega');
    const sc = await this.scan(c, true);
    if (sc.remoteError && !sc.remote.length) throw new BadRequestException(sc.remoteError);
    const state = ((c.integration.config as any)?.catalogWatch?.state ?? null) as WatchState | null;
    const ids = this.newProductIds(sc, state);
    this.catalog.holdCache(c.integration.id, 15 * 60_000);
    const res = await this.jobs.start({ tenantId: user.tenantId, userId: user.id, kind: 'IMPORT_ALL', integrationId: c.integration.id, items: ids, params: { channelType: c.integration.type, auto: 'new' } });
    await this.patchWatch(c.integration.id, (w) => ({ ...w, scan: w.scan ? { ...w.scan, newProducts: 0 } : w.scan }));
    return { ...res, count: ids.length };
  }

  /** Product create/update webhooks on Shopify and WooCommerce (order webhooks are untouched). */
  async installProductHooks(i: Integration) {
    if (!this.connected(i)) return { ok: false, installed: 0 };
    const res = i.type === 'SHOPIFY' ? await this.shopify.installProductHooks(i)
      : i.type === 'WOOCOMMERCE' ? await this.woo.installProductHooks(i)
        : { ok: false, installed: 0, error: null as string | null };
    await this.patchWatch(i.id, (w) => ({ ...w, productHooks: { at: new Date().toISOString(), ok: res.ok, installed: res.installed, error: (res as any).error ?? null } }));
    return res;
  }

  /** "Sab pakke jorein" for any size of list: every SKU/barcode match, in the background. */
  async linkAll(user: AuthenticatedUser, channelId: string) {
    const c = await this.requireCol(user.tenantId, channelId);
    if (c.mode === 'website') throw new BadRequestException(WEBSITE_LINKS_NOTE);
    const sc = await this.scan(c, true);
    if (sc.remoteError && !sc.remote.length) throw new BadRequestException(sc.remoteError);
    const links = pickSureLinks(sc.results);
    const res = await this.jobs.start({ tenantId: user.tenantId, userId: user.id, kind: 'LINK_ALL', integrationId: c.integration.id, items: links, params: { channelType: c.integration.type } });
    await this.patchWatch(c.integration.id, (w) => ({ ...w, scan: w.scan ? { ...w.scan, sure: 0 } : w.scan }));
    return res;
  }

  jobsList(user: AuthenticatedUser) {
    return this.jobs.list(user.tenantId);
  }

  job(user: AuthenticatedUser, id: string) {
    return this.jobs.get(user.tenantId, id);
  }

  cancelJob(user: AuthenticatedUser, id: string) {
    return this.jobs.cancel(user.tenantId, id);
  }

  /** Stock and price of these products on every push channel they are linked to. */
  private async pushEverywhere(tenantId: string, productIds: string[], force: boolean) {
    for (const c of (await this.cols(tenantId)).filter((x) => isPush(x.mode) && this.connected(x.integration))) {
      await this.syncProducts(c.integration, productIds, force).catch((e) => this.logger.warn(`Push ${c.integration.displayName}: ${e?.message}`));
    }
  }

  private async jobChannel(job: CatalogJob) {
    if (!job.integrationId) throw new Error('Channel nahi mila');
    const i = await this.prisma.integration.findFirst({ where: { id: job.integrationId, tenantId: job.tenantId } });
    if (!i) throw new Error('Channel hata diya gaya');
    return i;
  }

  private async runImportChunk(job: CatalogJob, externalIds: string[]): Promise<ChunkResult> {
    const i = await this.jobChannel(job);
    this.catalog.holdCache(i.id, 15 * 60_000);
    // A restart can repeat a chunk: items linked meanwhile are skipped, not made twice.
    const linked = await this.prisma.productChannelMapping.findMany({ where: { integrationId: i.id, externalProductId: { in: externalIds } }, select: { externalProductId: true }, distinct: ['externalProductId'] });
    const skip = new Set(linked.map((l) => String(l.externalProductId)));
    const todo = externalIds.filter((id) => !skip.has(id));
    if (!todo.length) return { done: externalIds.length, failed: 0 };
    const res = await this.catalog.importFor(i, job.tenantId, todo);
    const failed = Math.min(todo.length, res.failed);
    return { done: externalIds.length - failed, failed, errors: res.errors };
  }

  private async runLinkChunk(job: CatalogJob, links: LinkInput[]): Promise<ChunkResult> {
    const i = await this.jobChannel(job);
    const res = await this.catalog.saveLinksFor(i, job.tenantId, links);
    if (res.saved) {
      const productIds = [...new Set(links.map((l) => l.productId))];
      this.background(() => this.syncProducts(i, productIds), `link all ${i.displayName}`);
    }
    return { done: res.saved, failed: links.length - res.saved, errors: res.errors };
  }

  private async runPushChunk(job: CatalogJob, productIds: string[]): Promise<ChunkResult> {
    const p = (job.params ?? {}) as { channelIds?: string[] | null; content?: boolean; status?: boolean; price?: boolean };
    const cols = (await this.cols(job.tenantId)).filter((c) => isPush(c.mode) && (!p.channelIds || p.channelIds.includes(c.integration.id)));
    const errors: string[] = [];
    const bad = new Set<string>();
    for (const c of cols) {
      const i = c.integration;
      const rows = await this.prisma.productChannelMapping.findMany({ where: { integrationId: i.id, productId: { in: productIds } }, select: { productId: true }, distinct: ['productId'] });
      const ids = rows.map((r) => r.productId);
      if (!ids.length) continue;
      if (!this.connected(i)) {
        errors.push(`${i.displayName}: channel jura nahi`);
        ids.forEach((id) => bad.add(id));
        continue;
      }
      try {
        if (p.content || p.status) {
          const r = await this.content.push(i, ids, { statusOnly: !p.content });
          if (r.errors.length) errors.push(...r.errors.map((e) => `${i.displayName} · ${e}`));
        }
        await this.syncProducts(i, ids, !!p.price);
      } catch (e) {
        errors.push(`${i.displayName}: ${friendlySyncError(e)}`);
        ids.forEach((id) => bad.add(id));
      }
    }
    return { done: productIds.length - bad.size, failed: bad.size, errors };
  }

  private async runPublishChunk(job: CatalogJob, productIds: string[]): Promise<ChunkResult> {
    const i = await this.jobChannel(job);
    const listed = (job.params as any)?.listed !== false;
    // Products linked since the job started (or by a repeated chunk) are not made again.
    const linked = await this.prisma.productChannelMapping.findMany({ where: { integrationId: i.id, productId: { in: productIds } }, select: { productId: true }, distinct: ['productId'] });
    const skip = new Set(linked.map((l) => l.productId));
    const todo = productIds.filter((id) => !skip.has(id));
    if (!todo.length) return { done: productIds.length, failed: 0 };
    const res = i.type === 'SHOPIFY' ? await this.shopify.exportFor(i, { productIds: todo, listed })
      : i.type === 'WOOCOMMERCE' ? await this.woo.exportFor(i, { productIds: todo, listed })
        : null;
    if (!res) throw new Error('Is channel par naya product nahi ban sakta');
    await markLinks(this.prisma, i.id, { productId: { in: todo } }, true, undefined, ['publish']);
    if (!listed) await this.prisma.productChannelMapping.updateMany({ where: { integrationId: i.id, productId: { in: todo } }, data: { listed: false } });
    this.catalog.forget(i.id);
    await this.syncProducts(i, todo).catch(() => null);
    return { done: productIds.length - res.failed, failed: res.failed, errors: res.errors };
  }

  private background(run: () => Promise<unknown>, what: string) {
    setTimeout(() => { run().catch((e) => this.logger.warn(`Online products ${what}: ${e?.message}`)); }, 0);
  }
}

/** Last price seen on the channel (from its list, or the last price Nafaa sent). */
function knownPrice(data: unknown): number | null {
  const d = (data ?? {}) as any;
  const n = Number(d.channelPrice ?? d.pushedPrice);
  return Number.isFinite(n) && n > 0 ? n : null;
}

/** A price from the UI: empty = none; otherwise a positive number. */
function cleanPrice(v: number | string | null | undefined): number | null {
  if (v === null || v === undefined || v === '') return null;
  const n = Number(v);
  if (!Number.isFinite(n) || n <= 0 || n > 100_000_000) throw new BadRequestException('Price sahi nahi');
  return Math.round(n * 100) / 100;
}

/** Units for a channel: empty = the channel rule; otherwise a whole number 0 or more. */
function cleanQty(v: number | string | null | undefined): number | null {
  if (v === null || v === undefined || v === '') return null;
  const n = Math.floor(Number(v));
  if (!Number.isFinite(n) || n < 0 || n > 1_000_000) throw new BadRequestException('Stock sahi nahi');
  return n;
}

function emptyStats() {
  return { products: 0, variants: 0, linked: 0, sure: 0, maybe: 0, unmatched: 0 };
}
