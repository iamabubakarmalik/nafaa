import { BadRequestException, Injectable, Logger, NotFoundException } from '@nestjs/common';
import { Integration, IntegrationStatus, Prisma } from '@prisma/client';
import { PrismaService } from '../../prisma/prisma.service';
import { AuthenticatedUser } from '../../modules/auth/interfaces/jwt-payload.interface';
import { ChannelCatalogService, LinkInput, RemoteProduct, RemoteVariant } from './channel-catalog.service';
import { pickSureLinks, ScanResult } from './catalog-watch';
import { WebsiteSetupService } from './website-setup.service';
import { WooCommerceService } from './woocommerce.service';
import { ShopifyService } from './shopify.service';
import { DarazService } from './daraz.service';
import { StockPushService } from './stock-push.service';
import { readWebsiteConfig, WebsiteConfig } from './website-config';
import { channelPrice, PriceRule, readPriceRule, samePrice } from './channel-price';
import { MatchIndex, MatchProduct, suggestAll } from './product-matcher';
import { friendlySyncError } from './link-sync';
import { mappingKey } from './mapping-key';

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

export type GridFilter = 'all' | 'linked' | 'unlinked' | 'errors' | 'price' | 'out';

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
export class OnlineProductsService {
  private readonly logger = new Logger(OnlineProductsService.name);

  constructor(
    private readonly prisma: PrismaService,
    private readonly setup: WebsiteSetupService,
    private readonly catalog: ChannelCatalogService,
    private readonly woo: WooCommerceService,
    private readonly shopify: ShopifyService,
    private readonly daraz: DarazService,
    private readonly push: StockPushService,
  ) {}

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
    return Math.max(0, Math.floor(Number(stock ?? 0)) - c.cfg.stockBuffer);
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
      priceRule: isPush(c.mode) ? c.cfg.priceRule : readPriceRule(undefined),
      stockBuffer: c.cfg.stockBuffer,
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

  async saveSettings(user: AuthenticatedUser, channelId: string, body: { priceRule?: Partial<PriceRule>; pushPrice?: boolean; stockBuffer?: number; pushStock?: boolean; autoLink?: boolean }) {
    const c = await this.requireCol(user.tenantId, channelId);
    const fresh = await this.prisma.integration.findUniqueOrThrow({ where: { id: c.integration.id }, select: { config: true } });
    const raw = ((fresh.config as any) ?? {}) as Record<string, unknown>;
    const next = { ...raw };
    if (c.mode === 'indolj') throw new BadRequestException('Indolj par Price Indolj panel se badlein; Stock wahan track nahi hota');
    // Price rule and price push only where Nafaa sends prices; a custom website only takes the stock buffer.
    if (isPush(c.mode) && body.priceRule !== undefined) next.priceRule = readPriceRule(body.priceRule);
    if (isPush(c.mode) && body.pushPrice !== undefined) next.pushPrice = !!body.pushPrice;
    if (body.stockBuffer !== undefined) next.stockBuffer = Math.min(10_000, Math.max(0, Math.floor(Number(body.stockBuffer) || 0)));
    if (isPush(c.mode) && body.pushStock !== undefined) next.pushStock = !!body.pushStock;
    if (isPush(c.mode) && body.autoLink !== undefined) {
      next.autoLink = !!body.autoLink;
      // Switched on: the catalog watch picks the channel up within five minutes.
      if (next.autoLink && !c.cfg.autoLink) next.catalogWatch = { ...((raw.catalogWatch as any) ?? {}), scan: null };
    }
    const updated = await this.prisma.integration.update({ where: { id: c.integration.id }, data: { config: next as any } });
    // New prices / buffer go out in the background (a custom website reads them on its next pull).
    if (isPush(c.mode)) {
      this.background(async () => {
        await this.push.pushPricesFor(updated);
        if (body.stockBuffer !== undefined || body.pushStock === true) await this.syncStock(updated);
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

  async grid(user: AuthenticatedUser, q: { page?: number; limit?: number; search?: string; filter?: GridFilter; channelId?: string }) {
    const all = await this.cols(user.tenantId);
    const cols = q.channelId ? all.filter((c) => c.integration.id === q.channelId) : all;
    const page = Math.max(1, Number(q.page) || 1);
    const limit = Math.min(100, Math.max(5, Number(q.limit) || 30));
    const filter: GridFilter = (['all', 'linked', 'unlinked', 'errors', 'price', 'out'] as const).includes(q.filter as GridFilter) ? (q.filter as GridFilter) : 'all';
    const shops = await this.shopNames(user.tenantId);
    if (!cols.length) return { channels: [], items: [], total: 0, page, pages: 0, limit };

    const where: Prisma.ProductWhereInput = { AND: [{ tenantId: user.tenantId, isActive: true }, this.searchWhere(q.search), this.filterWhere(filter, cols)] };
    if (filter === 'price') (where.AND as Prisma.ProductWhereInput[]).push({ id: { in: [...(await this.priceDiffIds(cols))] } });

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
          id: true, name: true, sku: true, barcode: true, price: true, hasVariants: true,
          images: { take: 1, orderBy: { sortOrder: 'asc' }, select: { url: true } },
          variants: { where: { isActive: true }, orderBy: { sortOrder: 'asc' }, select: { id: true, name: true, sku: true, price: true, imageUrl: true } },
          channelMappings: {
            where: { integrationId: { in: ids } },
            select: {
              id: true, integrationId: true, variantId: true, externalProductId: true, externalVariantId: true, externalSku: true, externalTitle: true,
              priceOverride: true, externalData: true, syncStatus: true, syncError: true, lastSyncedAt: true,
            },
          },
          shopStocks: shopIds.length ? { where: { shopId: { in: shopIds } }, select: { shopId: true, variantId: true, stock: true, shopPrice: true } } : false,
        },
      }),
    ]);

    const items = products.map((p) => {
      const stocks = (p as any).shopStocks as Array<{ shopId: string; variantId: string | null; stock: number; shopPrice: number | null }> | undefined ?? [];
      const rowOf = (variantId: string | null, label: string | null, sku: string | null, price: number) => {
        const cells: Record<string, unknown> = {};
        for (const c of cols) {
          const ss = stocks.find((s) => s.shopId === c.shopId && (s.variantId ?? null) === variantId);
          const base = Number(ss?.shopPrice ?? price);
          const stock = this.shownStock(c, ss?.stock);
          const m = p.channelMappings.find((x) => x.integrationId === c.integration.id && (x.variantId ?? null) === variantId);
          const want = this.wantPrice(c, base, m?.priceOverride);
          if (!m) {
            cells[c.integration.id] = { linked: false, price: want, stock, nafaaStock: Number(ss?.stock ?? 0) };
            continue;
          }
          const seen = knownPrice(m.externalData);
          cells[c.integration.id] = {
            linked: true,
            mappingId: m.id,
            externalTitle: m.externalTitle,
            externalSku: m.externalSku,
            price: want,
            override: isPush(c.mode) ? m.priceOverride : null,
            channelPrice: seen,
            priceDiffers: seen !== null && !samePrice(want, seen),
            stock,
            nafaaStock: Number(ss?.stock ?? 0),
            // Nothing is pushed to a custom website or Indolj, so there is no sync status to show.
            status: isPush(c.mode) ? m.syncStatus : null,
            error: isPush(c.mode) && m.syncStatus === 'FAILED' ? m.syncError ?? 'Sync nahi hua' : null,
            lastSyncedAt: m.lastSyncedAt,
          };
        }
        return { variantId, label, sku, price, cells };
      };
      const rows = p.hasVariants && p.variants.length
        ? p.variants.map((v) => rowOf(v.id, v.name, v.sku, Number(v.price ?? p.price)))
        : [rowOf(null, null, p.sku, Number(p.price))];
      // A product with sizes linked without a size: shown as a problem to fix.
      const sizeLess: Record<string, string> = {};
      if (p.hasVariants) for (const m of p.channelMappings) if (!m.variantId) sizeLess[m.integrationId] = m.id;
      return {
        productId: p.id, name: p.name, sku: p.sku, image: p.images[0]?.url ?? null, hasVariants: p.hasVariants, price: Number(p.price),
        rows, sizeLess,
      };
    });

    return { channels: cols.map((c) => this.info(c, shops)), items, total, page, pages: Math.ceil(total / limit), limit };
  }

  async summary(user: AuthenticatedUser, channelId?: string) {
    const all = await this.cols(user.tenantId);
    const cols = channelId ? all.filter((c) => c.integration.id === channelId) : all;
    if (!cols.length) return { all: 0, linked: 0, unlinked: 0, errors: 0, price: 0, out: 0 };
    const base: Prisma.ProductWhereInput = { tenantId: user.tenantId, isActive: true };
    const count = (f: GridFilter) => this.prisma.product.count({ where: { AND: [base, this.filterWhere(f, cols)] } });
    const [allN, linked, unlinked, errors, out, price] = await Promise.all([
      count('all'), count('linked'), count('unlinked'), count('errors'), count('out'),
      this.priceDiffIds(cols).then(async (ids) => (ids.size ? this.prisma.product.count({ where: { ...base, id: { in: [...ids] } } }) : 0)),
    ]);
    return { all: allN, linked, unlinked, errors, price, out };
  }

  // ═══════════════════════════════════════════════════════════
  // SUGGESTIONS (channel list → Nafaa)
  // ═══════════════════════════════════════════════════════════

  /**
   * Reads a channel's product list, remembers the price it shows on linked
   * items (for "Price farq" and drift re-sends), and matches the open items
   * against the Nafaa catalog. Used by the link screen and the catalog watch.
   */
  async scan(c: Col, refresh = false): Promise<ScanResult> {
    const i = c.integration;
    let remote: RemoteProduct[] = [];
    let remoteError: string | null = null;
    let remoteFailure: unknown = null;
    try {
      remote = await this.catalog.remoteProducts(i, refresh);
    } catch (e) {
      remoteError = friendlySyncError(e);
      remoteFailure = e;
    }

    const mappings = await this.prisma.productChannelMapping.findMany({
      where: { integrationId: i.id },
      select: { id: true, linkKey: true, externalProductId: true, externalVariantId: true, externalData: true },
    });
    const byVariant = new Map(mappings.filter((m) => m.externalVariantId).map((m) => [String(m.externalVariantId), m]));
    const byProduct = new Map(mappings.filter((m) => !m.externalVariantId && m.externalProductId).map((m) => [String(m.externalProductId), m]));
    const isLinked = (p: RemoteProduct, v: RemoteVariant) =>
      (v.externalVariantId ? byVariant.get(v.externalVariantId) : byProduct.get(p.externalProductId));

    // Remember what the channel shows as price, for "price differs".
    const now = new Date().toISOString();
    const priceUpdates: Array<{ id: string; data: any }> = [];
    const open: Array<{ p: RemoteProduct; v: RemoteVariant }> = [];
    let linked = 0;
    for (const p of remote) {
      for (const v of p.variants) {
        const m = isLinked(p, v);
        if (!m) { open.push({ p, v }); continue; }
        linked++;
        if (v.price > 0 && Number((m.externalData as any)?.channelPrice) !== v.price) {
          priceUpdates.push({ id: m.id, data: { ...((m.externalData as any) ?? {}), channelPrice: v.price, channelPriceAt: now } });
        }
      }
    }
    for (const u of priceUpdates.slice(0, 2000)) {
      await this.prisma.productChannelMapping.update({ where: { id: u.id }, data: { externalData: u.data } }).catch(() => null);
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
    const taken = new Set(mappings.map((m) => m.linkKey));
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
      sku: v.sku, price: v.price, stock: v.stock, image: v.image ?? p.image,
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
    const [sizeLess, failed] = await Promise.all([
      this.prisma.productChannelMapping.groupBy({ by: ['integrationId'], where: { integrationId: { in: ids }, variantId: null, product: { hasVariants: true } }, _count: { _all: true } }),
      this.prisma.productChannelMapping.groupBy({ by: ['integrationId'], where: { integrationId: { in: ids }, syncStatus: 'FAILED' }, _count: { _all: true } }),
    ]);
    const n = (rows: Array<{ integrationId: string; _count: { _all: number } }>, id: string) => rows.find((r) => r.integrationId === id)?._count._all ?? 0;
    const issues: Array<{ id: string; channelId: string; tone: 'danger' | 'warning' | 'info'; kind: 'reconnect' | 'fix-size-less' | 'errors' | 'link-sure' | 'link'; text: string; detail?: string | null; count?: number }> = [];
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
      if (f) issues.push({ id: `${i.id}:errors`, channelId: i.id, tone: 'warning', kind: 'errors', count: f, text: `${name}: ${f} ${f === 1 ? 'product' : 'products'} ka Stock/Price nahi ja raha` });
      const sure = Number(watch.scan?.sure ?? 0);
      if (sure && c.mode !== 'website') issues.push({ id: `${i.id}:sure`, channelId: i.id, tone: 'info', kind: 'link-sure', count: sure, text: `${name}: ${sure} products jorna baqi — sab pakke jod dein` });
      const fresh = Number(watch.scan?.newUnlinked ?? 0);
      if (fresh && c.mode !== 'website') issues.push({ id: `${i.id}:new`, channelId: i.id, tone: 'info', kind: 'link', count: fresh, text: `${name}: ${fresh} naye products Nafaa se jure nahi` });
    }
    return { issues };
  }

  // ═══════════════════════════════════════════════════════════
  // ACTIONS
  // ═══════════════════════════════════════════════════════════

  async link(user: AuthenticatedUser, channelId: string, links: LinkInput[]) {
    const c = await this.requireCol(user.tenantId, channelId);
    if (c.mode === 'website') throw new BadRequestException(WEBSITE_LINKS_NOTE);
    const res = await this.catalog.saveLinksFor(c.integration, user.tenantId, (links ?? []).slice(0, 1000));
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
    return this.catalog.importFor(c.integration, user.tenantId, externalProductIds.map(String).slice(0, 200));
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
    return { success: true };
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
  async syncProduct(user: AuthenticatedUser, productId: string) {
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

function emptyStats() {
  return { products: 0, variants: 0, linked: 0, sure: 0, maybe: 0, unmatched: 0 };
}
