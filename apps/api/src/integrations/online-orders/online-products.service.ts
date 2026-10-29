import { BadRequestException, Injectable, Logger, NotFoundException } from '@nestjs/common';
import { Integration, IntegrationStatus, Prisma } from '@prisma/client';
import { PrismaService } from '../../prisma/prisma.service';
import { AuthenticatedUser } from '../../modules/auth/interfaces/jwt-payload.interface';
import { ChannelCatalogService, LinkInput, RemoteProduct } from './channel-catalog.service';
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
export const PRODUCT_CHANNEL_TYPES = ['WOOCOMMERCE', 'SHOPIFY', 'DARAZ'] as const;

export type GridFilter = 'all' | 'linked' | 'unlinked' | 'errors' | 'price' | 'out';

const PRICE_SCAN_LIMIT = 50_000;

interface Col {
  integration: Integration;
  cfg: WebsiteConfig;
  shopId: string | null;
}

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
    return list.map((integration) => {
      const cfg = readWebsiteConfig(integration.config);
      return { integration, cfg, shopId: cfg.shopId ?? integration.shopId };
    });
  }

  private async requireCol(tenantId: string, id: string): Promise<Col> {
    const integration = await this.setup.requireChannel(tenantId, id);
    if (!(PRODUCT_CHANNEL_TYPES as readonly string[]).includes(integration.type)) throw new NotFoundException('Ye channel products ke liye nahi');
    const cfg = readWebsiteConfig(integration.config);
    return { integration, cfg, shopId: cfg.shopId ?? integration.shopId };
  }

  private connected(i: Integration) {
    return i.type === 'WOOCOMMERCE' ? this.woo.isConnected(i) : i.type === 'SHOPIFY' ? this.shopify.isConnected(i) : this.daraz.isConnected(i);
  }

  private info(c: Col, shops: Map<string, string>) {
    const i = c.integration;
    return {
      id: i.id,
      type: i.type,
      name: i.displayName,
      siteUrl: c.cfg.siteUrl,
      live: i.isActive && i.status === IntegrationStatus.CONNECTED && this.connected(i),
      paused: !i.isActive,
      shopId: c.shopId,
      shopName: c.shopId ? shops.get(c.shopId) ?? null : null,
      pushPrice: c.cfg.pushPrice,
      priceRule: c.cfg.priceRule,
      stockBuffer: c.cfg.stockBuffer,
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

  async saveSettings(user: AuthenticatedUser, channelId: string, body: { priceRule?: Partial<PriceRule>; pushPrice?: boolean; stockBuffer?: number }) {
    const c = await this.requireCol(user.tenantId, channelId);
    const fresh = await this.prisma.integration.findUniqueOrThrow({ where: { id: c.integration.id }, select: { config: true } });
    const raw = ((fresh.config as any) ?? {}) as Record<string, unknown>;
    const next = { ...raw };
    if (body.priceRule !== undefined) next.priceRule = readPriceRule(body.priceRule);
    if (body.pushPrice !== undefined) next.pushPrice = !!body.pushPrice;
    if (body.stockBuffer !== undefined) next.stockBuffer = Math.min(10_000, Math.max(0, Math.floor(Number(body.stockBuffer) || 0)));
    const updated = await this.prisma.integration.update({ where: { id: c.integration.id }, data: { config: next as any } });
    // New prices / buffer go out in the background.
    this.background(async () => {
      await this.push.pushPricesFor(updated);
      if (body.stockBuffer !== undefined) await this.syncStock(updated);
    }, `settings ${updated.displayName}`);
    return this.info({ integration: updated, cfg: readWebsiteConfig(updated.config), shopId: readWebsiteConfig(updated.config).shopId ?? updated.shopId }, await this.shopNames(user.tenantId));
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
        if (!samePrice(channelPrice(base, c.cfg.priceRule, m.priceOverride), knownPrice(m.externalData))) out.add(m.productId);
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
          const stock = c.shopId ? Math.max(0, Math.floor(Number(ss?.stock ?? 0)) - c.cfg.stockBuffer) : null;
          const m = p.channelMappings.find((x) => x.integrationId === c.integration.id && (x.variantId ?? null) === variantId);
          const want = channelPrice(base, c.cfg.priceRule, m?.priceOverride);
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
            override: m.priceOverride,
            channelPrice: seen,
            priceDiffers: seen !== null && !samePrice(want, seen),
            stock,
            nafaaStock: Number(ss?.stock ?? 0),
            status: m.syncStatus,
            error: m.syncStatus === 'FAILED' ? m.syncError ?? 'Sync nahi hua' : null,
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

  async suggestions(user: AuthenticatedUser, channelId: string, refresh = false) {
    const c = await this.requireCol(user.tenantId, channelId);
    const i = c.integration;
    const kind = this.catalog.kind(i);
    if (!kind || kind === 'indolj') {
      return { canFetch: false, remoteError: 'Channel jura nahi — pehle channel ka safha khol kar jorein', fetchedAt: null, stats: emptyStats(), sure: [], maybe: [], unmatched: [] };
    }
    let remote: RemoteProduct[] = [];
    let remoteError: string | null = null;
    try {
      remote = await this.catalog.remoteProducts(i, refresh);
    } catch (e) {
      remoteError = friendlySyncError(e);
    }

    const mappings = await this.prisma.productChannelMapping.findMany({
      where: { integrationId: i.id },
      select: { id: true, linkKey: true, externalProductId: true, externalVariantId: true, externalData: true },
    });
    const byVariant = new Map(mappings.filter((m) => m.externalVariantId).map((m) => [String(m.externalVariantId), m]));
    const byProduct = new Map(mappings.filter((m) => !m.externalVariantId && m.externalProductId).map((m) => [String(m.externalProductId), m]));
    const isLinked = (p: RemoteProduct, v: RemoteProduct['variants'][number]) =>
      (v.externalVariantId ? byVariant.get(v.externalVariantId) : byProduct.get(p.externalProductId));

    // Remember what the channel shows as price, for "price differs".
    const now = new Date().toISOString();
    const priceUpdates: Array<{ id: string; data: any }> = [];
    const open: Array<{ p: RemoteProduct; v: RemoteProduct['variants'][number] }> = [];
    let linked = 0;
    for (const p of remote) {
      for (const v of p.variants) {
        const m = isLinked(p, v);
        if (!m) { open.push({ p, v }); continue; }
        linked++;
        if (v.price > 0 && knownPrice(m.externalData) !== v.price) {
          priceUpdates.push({ id: m.id, data: { ...((m.externalData as any) ?? {}), channelPrice: v.price, channelPriceAt: now } });
        }
      }
    }
    for (const u of priceUpdates.slice(0, 2000)) {
      await this.prisma.productChannelMapping.update({ where: { id: u.id }, data: { externalData: u.data } }).catch(() => null);
    }

    const products = await this.prisma.product.findMany({
      where: { tenantId: user.tenantId, isActive: true },
      select: {
        id: true, name: true, sku: true, barcode: true, hasVariants: true, price: true,
        variants: { where: { isActive: true }, select: { id: true, name: true, size: true, color: true, sku: true, barcode: true, price: true } },
      },
    });
    const index = new MatchIndex(products as unknown as MatchProduct[]);
    const taken = new Set(mappings.map((m) => m.linkKey));
    const results = suggestAll(open.map(({ p, v }) => ({
      title: p.title, variantTitle: v.title, hasVariants: p.hasVariants, sku: v.sku, barcode: v.barcode, p, v,
    })), index, taken);

    const byId = new Map(products.map((p) => [p.id, p]));
    const view = (p: RemoteProduct, v: RemoteProduct['variants'][number]) => ({
      externalProductId: p.externalProductId, externalVariantId: v.externalVariantId,
      title: p.title, variantTitle: p.hasVariants ? v.title : null, hasVariants: p.hasVariants,
      sku: v.sku, price: v.price, stock: v.stock, image: v.image ?? p.image,
    });
    const sure: any[] = [];
    const maybe: any[] = [];
    const unmatchedBy = new Map<string, { externalProductId: string; title: string; image: string | null; hasVariants: boolean; anyLinked: boolean; variants: any[] }>();
    for (const { item, match } of results) {
      if (match) {
        const np = byId.get(match.productId)!;
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
      remoteError,
      fetchedAt: now,
      stats: { products: remote.length, variants: linked + open.length, linked, sure: sure.length, maybe: maybe.length, unmatched: open.length - sure.length - maybe.length },
      sure,
      maybe,
      unmatched,
    };
  }

  // ═══════════════════════════════════════════════════════════
  // ACTIONS
  // ═══════════════════════════════════════════════════════════

  async link(user: AuthenticatedUser, channelId: string, links: LinkInput[]) {
    const c = await this.requireCol(user.tenantId, channelId);
    const res = await this.catalog.saveLinksFor(c.integration, user.tenantId, (links ?? []).slice(0, 1000));
    if (res.saved) {
      const productIds = [...new Set((links ?? []).map((l) => l.productId))];
      this.background(() => this.syncProducts(c.integration, productIds), `link ${c.integration.displayName}`);
    }
    return res;
  }

  async importItems(user: AuthenticatedUser, channelId: string, externalProductIds: string[]) {
    const c = await this.requireCol(user.tenantId, channelId);
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
    const value = priceOverride === null || priceOverride === undefined || (priceOverride as any) === '' ? null : Number(priceOverride);
    if (value !== null && (!Number.isFinite(value) || value <= 0 || value > 100_000_000)) throw new BadRequestException('Price sahi nahi');
    await this.prisma.productChannelMapping.update({ where: { id: m.id }, data: { priceOverride: value === null ? null : Math.round(value * 100) / 100 } });
    this.background(() => this.push.pushPricesFor(m.integration, { id: m.id }), `price ${m.integration.displayName}`);
    return { success: true, priceOverride: value };
  }

  /** "Sync now" for one channel: all stock, then prices that changed. */
  async syncChannel(user: AuthenticatedUser, channelId: string) {
    const c = await this.requireCol(user.tenantId, channelId);
    if (!this.connected(c.integration)) throw new BadRequestException('Channel jura nahi — pehle channel ka safha khol kar jorein');
    const out: { stock: unknown; prices: number; error: string | null } = { stock: null, prices: 0, error: null };
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
    for (const c of cols) {
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
    if (i.type === 'WOOCOMMERCE') return this.woo.syncStock(i);
    if (i.type === 'SHOPIFY') return this.shopify.syncStock(i);
    return this.daraz.syncStock(i);
  }

  /** Stock and price for some products on one channel (after linking, or "Sync now"). */
  private async syncProducts(i: Integration, productIds: string[], force = false) {
    if (!this.connected(i) || !productIds.length) return;
    if (i.type === 'DARAZ') {
      await this.daraz.syncStock(i, { productIds });
    } else {
      const links = await this.prisma.productChannelMapping.findMany({
        where: { integrationId: i.id, productId: { in: productIds }, externalProductId: { not: null } },
        select: { externalProductId: true, externalVariantId: true },
      });
      const onlyLinks = links.map((l) => ({ externalProductId: String(l.externalProductId), externalVariantId: l.externalVariantId ? String(l.externalVariantId) : null }));
      if (onlyLinks.length) {
        if (i.type === 'WOOCOMMERCE') await this.woo.syncStock(i, { onlyLinks });
        else await this.shopify.syncStock(i, { onlyLinks });
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
