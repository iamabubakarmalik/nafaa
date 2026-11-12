/**
 * What a store shows: product cards and pages, collections with filters and
 * sorting, search, reviews and the sitemap. Prices, stock and backorder rules
 * always come from Nafaa (the store's branch); website-only fields (handle,
 * SEO, web description, badges) come from StoreProduct.
 */
import { Injectable, NotFoundException } from '@nestjs/common';
import { Prisma } from '@prisma/client';
import { PrismaService } from '../../prisma/prisma.service';
import { Availability, availability, backorderRoom, backorderRule } from '../online-orders/backorder';
import { StoreCtx } from './store-access.service';
import { defaultProductHandle, idPrefixOf } from './lib/handle';
import { htmlToText, looksLikeHtml, sanitizeHtml, textToHtml } from './lib/sanitize-html';
import { CollectionRules, readRules, ruleWhere } from './lib/collection-rules';
import { weightKg } from './lib/shipping';

export interface ProductCard {
  id: string; handle: string; title: string; url: string;
  image: { url: string; alt: string | null } | null; secondImage: string | null;
  price: number; compareAtPrice: number | null; priceMax: number; onSale: boolean; badges: string[];
  availability: Availability; leadTime: string | null;
  brand: string | null; category: string | null; rating: { average: number; count: number } | null;
  hasVariants: boolean; firstVariantId: string | null;
}

export interface ListQuery {
  q?: string; category?: string; brand?: string; tag?: string; size?: string; color?: string;
  minPrice?: string | number; maxPrice?: string | number; available?: string; sort?: string; page?: string | number; limit?: string | number;
}

/** Pricing and stock of one sellable line (product or product + variant). */
export interface LineInfo {
  productId: string; variantId: string | null; handle: string; title: string; variantTitle: string | null; image: string | null;
  sku: string | null; price: number; compareAtPrice: number | null; availability: Availability; maxQty: number; leadTime: string | null; weightKg: number;
}

const SORTS = ['featured', 'best_selling', 'newest', 'price_asc', 'price_desc', 'title_asc', 'title_desc', 'manual'] as const;
export type Sort = (typeof SORTS)[number];
const MAX_IDS = 5000;
const VIS_TTL = 30_000;
const RANK_TTL = 6 * 3_600_000;

const PRODUCT_SELECT = {
  id: true, name: true, sku: true, price: true, hasVariants: true, createdAt: true, updatedAt: true, isFeatured: true,
  backorder: true, backorderMax: true, backorderLeadDays: true, backorderNote: true, weight: true, weightUnit: true,
  description: true, shortDescription: true, metaTitle: true, metaDescription: true, stock: true, categoryId: true,
  brand: { select: { name: true } },
  category: { select: { id: true, name: true } },
  images: { orderBy: [{ isPrimary: 'desc' }, { sortOrder: 'asc' }], take: 12, select: { id: true, url: true, alt: true } },
  variants: { where: { isActive: true }, orderBy: [{ sortOrder: 'asc' }, { createdAt: 'asc' }], select: { id: true, name: true, sku: true, price: true, size: true, color: true, colorHex: true, imageUrl: true, backorder: true, stock: true, weight: true, unit: true } },
} satisfies Prisma.ProductSelect;
export type ProductRow = Prisma.ProductGetPayload<{ select: typeof PRODUCT_SELECT }>;

const n = (v: unknown) => Number(v ?? 0) || 0;
const leadText = (rule: { leadDays: number | null; note: string | null }) => rule.note ?? (rule.leadDays ? `Ships in ${rule.leadDays} days` : null);
/** Rating rows from ratingsFor's query → product id → { average, count }, one decimal. */
export function ratingMap(rows: Array<{ pid: string | null; avg: number | null; count: bigint | number }>): Map<string, { average: number; count: number }> {
  const out = new Map<string, { average: number; count: number }>();
  for (const r of rows) {
    const count = Number(r.count ?? 0);
    if (!r.pid || !count || r.avg === null || !Number.isFinite(Number(r.avg))) continue;
    out.set(r.pid, { average: Math.round(Number(r.avg) * 10) / 10, count });
  }
  return out;
}

const SIZE_ORDER = ['xxs', 'xs', 's', 'm', 'l', 'xl', 'xxl', '2xl', '3xl', '4xl', '5xl'];

@Injectable()
export class StoreCatalogService {
  private readonly visCache = new Map<string, { at: number; hidden: string[]; shown: string[] }>();
  private readonly rankCache = new Map<string, { at: number; rank: Map<string, number> }>();

  constructor(private readonly prisma: PrismaService) {}

  // ═══ visibility ═══

  private async visibility(storeId: string) {
    const hit = this.visCache.get(storeId);
    if (hit && Date.now() - hit.at < VIS_TTL) return hit;
    const rows = await this.prisma.storeProduct.findMany({ where: { storeId, visible: { not: null } }, select: { productId: true, visible: true } });
    const v = { at: Date.now(), hidden: rows.filter((r) => r.visible === false).map((r) => r.productId), shown: rows.filter((r) => r.visible === true).map((r) => r.productId) };
    this.visCache.set(storeId, v);
    if (this.visCache.size > 2000) this.visCache.clear();
    return v;
  }

  forget(storeId: string) {
    this.visCache.delete(storeId);
  }

  /** Products a store may show at all (before shopper filters). */
  async baseWhere(ctx: StoreCtx): Promise<Prisma.ProductWhereInput> {
    const vis = await this.visibility(ctx.store.id);
    const and: Prisma.ProductWhereInput[] = [
      { tenantId: ctx.tenantId, isActive: true, isRawMaterial: false },
      { OR: [{ price: { gt: 0 } }, { hasVariants: true, variants: { some: { isActive: true, price: { gt: 0 } } } }] },
    ];
    if (ctx.settings.catalogMode === 'CHOSEN') and.push({ id: { in: vis.shown } });
    else if (vis.hidden.length) and.push({ id: { notIn: vis.hidden } });
    if (!ctx.settings.showOutOfStock) and.push(this.inStockWhere(ctx));
    return { AND: and };
  }

  private inStockWhere(ctx: StoreCtx): Prisma.ProductWhereInput {
    const stocked: Prisma.ProductWhereInput = ctx.shopId ? { shopStocks: { some: { shopId: ctx.shopId, stock: { gt: 0 } } } } : { OR: [{ stock: { gt: 0 } }, { variants: { some: { isActive: true, stock: { gt: 0 } } } }] };
    return { OR: [stocked, { backorder: true }, { variants: { some: { isActive: true, backorder: true } } }] };
  }

  async isVisible(ctx: StoreCtx, productId: string) {
    return !!(await this.prisma.product.findFirst({ where: { AND: [await this.baseWhere(ctx), { id: productId }] }, select: { id: true } }));
  }

  // ═══ handles ═══

  async handlesFor(storeId: string, products: Array<{ id: string; name: string }>): Promise<Map<string, string>> {
    const rows = products.length ? await this.prisma.storeProduct.findMany({ where: { storeId, productId: { in: products.map((p) => p.id) } }, select: { productId: true, handle: true } }) : [];
    const saved = new Map(rows.map((r) => [r.productId, r.handle]));
    return new Map(products.map((p) => [p.id, saved.get(p.id) ?? defaultProductHandle(p.name, p.id)]));
  }

  /** Product id for a URL handle: a saved handle first, then the id suffix of a default handle. */
  async productIdByHandle(ctx: StoreCtx, handle: string): Promise<string | null> {
    const h = String(handle ?? '').toLowerCase().slice(0, 140);
    if (!/^[a-z0-9-]+$/.test(h)) return null;
    const saved = await this.prisma.storeProduct.findUnique({ where: { storeId_handle: { storeId: ctx.store.id, handle: h } }, select: { productId: true } });
    if (saved) return saved.productId;
    const prefix = idPrefixOf(h);
    if (!prefix) return null;
    const candidates = await this.prisma.product.findMany({ where: { tenantId: ctx.tenantId, id: { startsWith: prefix.slice(0, 8) } }, select: { id: true, name: true }, take: 5 });
    const own = await this.prisma.storeProduct.findMany({ where: { storeId: ctx.store.id, productId: { in: candidates.map((c) => c.id) } }, select: { productId: true } });
    const hasOwn = new Set(own.map((o) => o.productId));
    // A product with its own handle answers only to that handle.
    const p = candidates.find((c) => !hasOwn.has(c.id) && defaultProductHandle(c.name, c.id) === h) ?? candidates.find((c) => !hasOwn.has(c.id) && c.id.replace(/-/g, '').startsWith(prefix));
    return p?.id ?? null;
  }

  // ═══ cards ═══

  /** Cards for product ids, in the given order; ids the store cannot show are skipped. */
  async cards(ctx: StoreCtx, ids: string[], checkVisible = true): Promise<ProductCard[]> {
    if (!ids.length) return [];
    const where: Prisma.ProductWhereInput = checkVisible ? { AND: [await this.baseWhere(ctx), { id: { in: ids } }] } : { tenantId: ctx.tenantId, id: { in: ids } };
    const rows = await this.prisma.product.findMany({ where, select: PRODUCT_SELECT });
    const built = await this.build(ctx, rows);
    const byId = new Map(built.map((b) => [b.card.id, b.card]));
    return ids.map((id) => byId.get(id)).filter((c): c is ProductCard => !!c);
  }

  /**
   * Average stars and count per product from rated order reviews (the same
   * reviews the product page lists), for many products in one query. An
   * order counts once per product even when the product is on it twice.
   */
  async ratingsFor(tenantId: string, productIds: string[]): Promise<Map<string, { average: number; count: number }>> {
    const ids = [...new Set(productIds)].slice(0, 200);
    if (!ids.length) return new Map();
    const rows = await this.prisma.$queryRaw<Array<{ pid: string | null; avg: number | null; count: bigint }>>`
      SELECT it.pid, AVG(r.rating)::float AS avg, COUNT(*)::bigint AS count
      FROM online_reviews r
      JOIN channel_orders o ON o.id = r."channelOrderId"
      CROSS JOIN LATERAL (
        SELECT DISTINCT e->>'productId' AS pid
        FROM jsonb_array_elements(CASE WHEN jsonb_typeof(o.items) = 'array' THEN o.items ELSE '[]'::jsonb END) e
      ) it
      WHERE r."tenantId" = ${tenantId} AND r.rating IS NOT NULL AND it.pid IN (${Prisma.join(ids)})
      GROUP BY it.pid`;
    return ratingMap(rows);
  }

  private async build(ctx: StoreCtx, rows: ProductRow[], withRatings = true) {
    if (!rows.length) return [];
    const ids = rows.map((r) => r.id);
    const [web, stocks, ratings] = await Promise.all([
      this.prisma.storeProduct.findMany({ where: { storeId: ctx.store.id, productId: { in: ids } } }),
      ctx.shopId ? this.prisma.shopStock.findMany({ where: { shopId: ctx.shopId, productId: { in: ids } }, select: { productId: true, variantId: true, stock: true, shopPrice: true } }) : Promise.resolve([]),
      withRatings ? this.ratingsFor(ctx.tenantId, ids).catch(() => new Map<string, { average: number; count: number }>()) : Promise.resolve(new Map<string, { average: number; count: number }>()),
    ]);
    const webOf = new Map(web.map((w) => [w.productId, w]));
    const stockKey = (p: string, v: string | null) => `${p}:${v ?? '-'}`;
    const stockOf = new Map(stocks.map((s) => [stockKey(s.productId, s.variantId), s]));
    const newSince = Date.now() - 14 * 86_400_000;
    return rows.map((p) => {
      const w = webOf.get(p.id) ?? null;
      const handle = w?.handle ?? defaultProductHandle(p.name, p.id);
      const lines = this.lines(ctx, p, (vid) => stockOf.get(stockKey(p.id, vid)) ?? null);
      const sellable = lines.filter((l) => l.availability !== 'out_of_stock');
      const priced = sellable.length ? sellable : lines;
      const price = Math.min(...priced.map((l) => l.price));
      const priceMax = Math.max(...priced.map((l) => l.price));
      const compareAt = w?.compareAtPrice && w.compareAtPrice > price ? w.compareAtPrice : null;
      const avail: Availability = lines.some((l) => l.availability === 'in_stock') ? 'in_stock' : lines.some((l) => l.availability === 'backorder') ? 'backorder' : 'out_of_stock';
      const images = this.orderedImages(p, w?.imageOrder ?? []);
      const badges = [...(w?.badges ?? [])];
      if (compareAt) badges.push('Sale');
      if (avail === 'out_of_stock') badges.push('Sold out');
      else if (p.createdAt.getTime() > newSince) badges.push('New');
      const card: ProductCard = {
        id: p.id, handle, title: p.name, url: `/products/${handle}`,
        image: images[0] ? { url: images[0].url, alt: images[0].alt ?? p.name } : null,
        secondImage: images[1]?.url ?? null,
        price, compareAtPrice: compareAt, priceMax, onSale: !!compareAt, badges: [...new Set(badges)].slice(0, 4),
        availability: avail, leadTime: avail === 'backorder' ? lines.find((l) => l.availability === 'backorder')?.leadTime ?? null : null,
        brand: p.brand?.name ?? null, category: p.category?.name ?? null, rating: ratings.get(p.id) ?? null,
        hasVariants: p.hasVariants && p.variants.length > 0, firstVariantId: (sellable[0] ?? lines[0])?.variantId ?? null,
      };
      return { card, row: p, web: w, lines, images };
    });
  }

  private orderedImages(p: ProductRow, order: string[]) {
    const imgs = p.images.map((i) => ({ id: i.id, url: i.url, alt: i.alt }));
    if (!order.length) return imgs;
    const pos = new Map(order.map((id, i) => [id, i]));
    return [...imgs].sort((a, b) => (pos.get(a.id) ?? 999) - (pos.get(b.id) ?? 999));
  }

  /** Every sellable line of a product with price and availability at the store's branch. */
  private lines(ctx: StoreCtx, p: ProductRow, stockRow: (variantId: string | null) => { stock: number; shopPrice: number | null } | null) {
    const variants = p.hasVariants && p.variants.length ? p.variants : null;
    const make = (v: ProductRow['variants'][number] | null) => {
      const row = stockRow(v?.id ?? null);
      const stock = ctx.shopId ? n(row?.stock) : n(v ? v.stock : p.stock);
      const rule = backorderRule(p, v);
      const av = availability(Math.max(0, stock), rule, stock);
      const basePrice = v ? n(v.price) || n(p.price) : n(p.price);
      const price = row?.shopPrice && row.shopPrice > 0 ? row.shopPrice : basePrice;
      const room = av === 'backorder' ? backorderRoom(stock, rule) : Math.floor(stock);
      return {
        variantId: v?.id ?? null, variant: v, price,
        availability: av, stock,
        maxQty: av === 'out_of_stock' ? 0 : Math.max(1, Math.min(99, Number.isFinite(room) ? room : 99)),
        leadTime: av === 'backorder' ? leadText(rule) : null,
      };
    };
    return variants ? variants.map(make) : [make(null)];
  }

  // ═══ listing ═══

  async list(ctx: StoreCtx, q: ListQuery, scope: { collectionId?: string | null; defaultSort?: string; ids?: string[] } = {}) {
    const limit = Math.max(1, Math.min(48, Math.floor(n(q.limit) || 24)));
    const page = Math.max(1, Math.floor(n(q.page) || 1));
    const where = await this.shopperWhere(ctx, q, scope);
    let sort: Sort = (SORTS as readonly string[]).includes(String(q.sort)) ? (q.sort as Sort) : (SORTS as readonly string[]).includes(String(scope.defaultSort)) ? (scope.defaultSort as Sort) : 'featured';
    if (sort === 'manual' && !scope.collectionId) sort = 'featured';
    let ids: string[];
    let total: number;
    if (sort === 'manual' || sort === 'best_selling') {
      const all = await this.prisma.product.findMany({ where, select: { id: true, createdAt: true }, orderBy: { createdAt: 'desc' }, take: MAX_IDS });
      const rank = sort === 'manual' ? await this.manualRank(scope.collectionId!) : await this.bestSellerRank(ctx.tenantId);
      all.sort((a, b) => (rank.get(a.id) ?? 1e9) - (rank.get(b.id) ?? 1e9) || b.createdAt.getTime() - a.createdAt.getTime());
      total = all.length;
      ids = all.slice((page - 1) * limit, page * limit).map((r) => r.id);
    } else {
      const orderBy: Prisma.ProductOrderByWithRelationInput[] =
        sort === 'newest' ? [{ createdAt: 'desc' }]
          : sort === 'price_asc' ? [{ price: 'asc' }]
            : sort === 'price_desc' ? [{ price: 'desc' }]
              : sort === 'title_asc' ? [{ name: 'asc' }]
                : sort === 'title_desc' ? [{ name: 'desc' }]
                  : [{ isFeatured: 'desc' }, { createdAt: 'desc' }];
      const [rows, count] = await Promise.all([
        this.prisma.product.findMany({ where, select: { id: true }, orderBy: [...orderBy, { id: 'asc' }], skip: (page - 1) * limit, take: limit }),
        this.prisma.product.count({ where }),
      ]);
      ids = rows.map((r) => r.id);
      total = count;
    }
    const [items, facets] = await Promise.all([this.cards(ctx, ids, false), this.facets(ctx, await this.shopperWhere(ctx, { ...q, brand: undefined, size: undefined, color: undefined, category: undefined, minPrice: undefined, maxPrice: undefined }, scope))]);
    return { items, total, page, pages: Math.max(1, Math.ceil(total / limit)), limit, sort, facets };
  }

  private async shopperWhere(ctx: StoreCtx, q: ListQuery, scope: { collectionId?: string | null; ids?: string[] }): Promise<Prisma.ProductWhereInput> {
    const and: Prisma.ProductWhereInput[] = [await this.baseWhere(ctx)];
    if (scope.ids) and.push({ id: { in: scope.ids } });
    if (scope.collectionId) and.push(await this.collectionWhere(ctx, scope.collectionId));
    const text = String(q.q ?? '').trim().slice(0, 80);
    if (text) {
      const words = text.split(/\s+/).filter((w) => w.length > 0).slice(0, 5);
      and.push({ AND: words.map((w) => ({ OR: [{ name: { contains: w, mode: 'insensitive' } }, { sku: { contains: w, mode: 'insensitive' } }, { barcode: w }, { brand: { name: { contains: w, mode: 'insensitive' } } }, { category: { name: { contains: w, mode: 'insensitive' } } }] })) });
    }
    const list = (v: unknown) => String(v ?? '').split(',').map((s) => s.trim()).filter(Boolean).slice(0, 20);
    if (q.category) and.push({ categoryId: { in: list(q.category) } });
    if (q.brand) and.push({ brandId: { in: list(q.brand) } });
    if (q.tag) and.push({ tags: { some: { tagId: { in: list(q.tag) } } } });
    if (q.size) and.push({ variants: { some: { isActive: true, size: { in: list(q.size), mode: 'insensitive' } } } });
    if (q.color) and.push({ variants: { some: { isActive: true, color: { in: list(q.color), mode: 'insensitive' } } } });
    const min = Number(q.minPrice);
    const max = Number(q.maxPrice);
    if (q.minPrice !== undefined && q.minPrice !== '' && Number.isFinite(min)) and.push({ price: { gte: min } });
    if (q.maxPrice !== undefined && q.maxPrice !== '' && Number.isFinite(max)) and.push({ price: { lte: max } });
    if (q.available === '1' || q.available === 'true') and.push(this.inStockWhere(ctx));
    return { AND: and };
  }

  private async facets(ctx: StoreCtx, where: Prisma.ProductWhereInput) {
    const [brands, cats, sizes, colors, price] = await Promise.all([
      this.prisma.product.groupBy({ by: ['brandId'], where: { AND: [where, { brandId: { not: null } }] }, _count: { _all: true } }),
      this.prisma.product.groupBy({ by: ['categoryId'], where: { AND: [where, { categoryId: { not: null } }] }, _count: { _all: true } }),
      this.prisma.productVariant.groupBy({ by: ['size'], where: { isActive: true, size: { not: null }, product: where }, _count: { _all: true } }),
      this.prisma.productVariant.groupBy({ by: ['color'], where: { isActive: true, color: { not: null }, product: where }, _count: { _all: true } }),
      this.prisma.product.aggregate({ where, _min: { price: true }, _max: { price: true } }),
    ]);
    const [brandNames, catNames] = await Promise.all([
      this.prisma.brand.findMany({ where: { id: { in: brands.map((b) => b.brandId!).slice(0, 200) } }, select: { id: true, name: true } }),
      this.prisma.category.findMany({ where: { id: { in: cats.map((c) => c.categoryId!).slice(0, 200) } }, select: { id: true, name: true } }),
    ]);
    const label = (rows: Array<{ id: string; name: string }>) => new Map(rows.map((r) => [r.id, r.name]));
    const bl = label(brandNames);
    const cl = label(catNames);
    const sizeRank = (s: string) => {
      const i = SIZE_ORDER.indexOf(s.toLowerCase());
      return i >= 0 ? i : 100 + (Number(s) || 0);
    };
    return {
      brands: brands.filter((b) => bl.has(b.brandId!)).map((b) => ({ value: b.brandId!, label: bl.get(b.brandId!)!, count: b._count._all })).sort((a, b) => a.label.localeCompare(b.label)),
      categories: cats.filter((c) => cl.has(c.categoryId!)).map((c) => ({ value: c.categoryId!, label: cl.get(c.categoryId!)!, count: c._count._all })).sort((a, b) => a.label.localeCompare(b.label)),
      sizes: sizes.map((s) => ({ value: s.size!, label: s.size!, count: s._count._all })).sort((a, b) => sizeRank(a.value) - sizeRank(b.value) || a.value.localeCompare(b.value)).slice(0, 40),
      colors: colors.map((c) => ({ value: c.color!, label: c.color!, count: c._count._all })).sort((a, b) => b.count - a.count).slice(0, 40),
      price: { min: Math.floor(n(price._min.price)), max: Math.ceil(n(price._max.price)) },
    };
  }

  /** Sales rank (1 = best) of the shop's products over the last 90 days. */
  async bestSellerRank(tenantId: string): Promise<Map<string, number>> {
    const hit = this.rankCache.get(tenantId);
    if (hit && Date.now() - hit.at < RANK_TTL) return hit.rank;
    const rows = await this.prisma.saleItem.groupBy({
      by: ['productId'],
      where: { productId: { not: null }, sale: { tenantId, soldAt: { gte: new Date(Date.now() - 90 * 86_400_000) } } },
      _sum: { quantity: true },
      orderBy: { _sum: { quantity: 'desc' } },
      take: 1000,
    }).catch(() => []);
    const rank = new Map(rows.map((r, i) => [r.productId!, i + 1]));
    this.rankCache.set(tenantId, { at: Date.now(), rank });
    if (this.rankCache.size > 2000) this.rankCache.clear();
    return rank;
  }

  private async manualRank(collectionId: string) {
    const rows = await this.prisma.storeCollectionProduct.findMany({ where: { collectionId }, select: { productId: true, position: true } });
    return new Map(rows.map((r) => [r.productId, r.position]));
  }

  // ═══ collections ═══

  async collectionWhere(ctx: Pick<StoreCtx, 'shopId'>, collectionId: string): Promise<Prisma.ProductWhereInput> {
    const c = await this.prisma.storeCollection.findUnique({ where: { id: collectionId }, select: { kind: true, rules: true } });
    if (!c) return { id: { in: [] } };
    if (c.kind === 'AUTOMATIC') {
      const r = readRules(c.rules);
      return 'error' in r ? { id: { in: [] } } : ruleWhere(r as CollectionRules, ctx.shopId);
    }
    const rows = await this.prisma.storeCollectionProduct.findMany({ where: { collectionId }, select: { productId: true }, take: MAX_IDS });
    return { id: { in: rows.map((r) => r.productId) } };
  }

  async collections(ctx: StoreCtx) {
    const rows = await this.prisma.storeCollection.findMany({
      where: { storeId: ctx.store.id, isPublished: true, archivedAt: null },
      orderBy: [{ sortOrder: 'asc' }, { title: 'asc' }],
      take: 200,
    });
    const base = await this.baseWhere(ctx);
    const items = [];
    for (const c of rows) {
      const where: Prisma.ProductWhereInput = { AND: [base, await this.collectionWhere(ctx, c.id)] };
      const [count, first] = await Promise.all([
        this.prisma.product.count({ where }),
        c.imageUrl ? Promise.resolve(null) : this.prisma.product.findFirst({ where: { AND: [where, { images: { some: {} } }] }, select: { images: { orderBy: [{ isPrimary: 'desc' }, { sortOrder: 'asc' }], take: 1, select: { url: true } } }, orderBy: { createdAt: 'desc' } }),
      ]);
      items.push({ id: c.id, handle: c.handle, title: c.title, url: `/collections/${c.handle}`, image: c.imageUrl ?? first?.images[0]?.url ?? null, productCount: count });
    }
    return { items };
  }

  async collection(ctx: StoreCtx, handle: string, q: ListQuery, base: string) {
    const h = String(handle ?? '').toLowerCase();
    if (h === 'all') {
      const products = await this.list(ctx, q);
      return {
        collection: { id: 'all', handle: 'all', title: 'All products', url: '/collections/all', image: null, productCount: products.total, descriptionHtml: '', sort: 'featured', seo: { title: 'All products', description: `All products from ${ctx.store.name}`, canonical: `${base}/collections/all`, image: null } },
        products,
      };
    }
    const c = await this.prisma.storeCollection.findUnique({ where: { storeId_handle: { storeId: ctx.store.id, handle: h } } });
    if (!c || c.archivedAt || (!c.isPublished && !ctx.preview)) throw new NotFoundException('Collection not found');
    const products = await this.list(ctx, q, { collectionId: c.id, defaultSort: c.sort });
    const image = c.imageUrl ?? products.items[0]?.image?.url ?? null;
    return {
      collection: {
        id: c.id, handle: c.handle, title: c.title, url: `/collections/${c.handle}`, image, productCount: products.total, descriptionHtml: c.descriptionHtml, sort: c.sort,
        seo: { title: c.seoTitle || c.title, description: c.seoDescription || htmlToText(c.descriptionHtml, 160) || `${c.title} at ${ctx.store.name}`, canonical: `${base}/collections/${c.handle}`, image },
      },
      products,
    };
  }

  // ═══ product page ═══

  async product(ctx: StoreCtx, handle: string, base: string) {
    const id = await this.productIdByHandle(ctx, handle);
    if (!id) throw new NotFoundException('Product not found');
    const row = await this.prisma.product.findFirst({ where: { AND: [await this.baseWhere(ctx), { id }] }, select: PRODUCT_SELECT });
    if (!row) throw new NotFoundException('Product not found');
    const [built] = await this.build(ctx, [row]);
    const { card, web, lines, images } = built;
    const desc = web?.webDescription ? web.webDescription : row.description ? (looksLikeHtml(row.description) ? sanitizeHtml(row.description) : textToHtml(row.description)) : '';
    const variants = lines.map((l) => {
      const v = l.variant;
      const options: Record<string, string> = {};
      if (v?.size) options.Size = v.size;
      if (v?.color) options.Colour = v.color;
      if (v && !v.size && !v.color) options.Option = v.name;
      return {
        id: l.variantId, title: v?.name ?? 'Default', sku: v?.sku ?? row.sku, options, price: l.price,
        compareAtPrice: web?.compareAtPrice && web.compareAtPrice > l.price ? web.compareAtPrice : null,
        availability: l.availability, maxQty: l.maxQty, leadTime: l.leadTime, image: v?.imageUrl ?? null,
      };
    });
    const optionNames = [...new Set(variants.flatMap((v) => Object.keys(v.options)))];
    const options = optionNames.map((name) => ({
      name,
      values: [...new Map(lines.filter((l) => l.variant).map((l) => {
        const v = l.variant!;
        const value = name === 'Size' ? v.size : name === 'Colour' ? v.color : v.name;
        return [value, { value: value!, swatch: name === 'Colour' ? v.colorHex ?? null : null }] as const;
      }).filter(([k]) => !!k)).values()],
    }));
    const variantImages = new Map<string, string[]>();
    for (const l of lines) if (l.variant?.imageUrl) variantImages.set(l.variant.imageUrl, [...(variantImages.get(l.variant.imageUrl) ?? []), l.variantId!]);
    const allImages = [...images.map((i) => ({ id: i.id, url: i.url, alt: i.alt, variantIds: variantImages.get(i.url) ?? [] }))];
    for (const [url, vids] of variantImages) if (!allImages.some((i) => i.url === url)) allImages.push({ id: `v-${vids[0]}`, url, alt: row.name, variantIds: vids });

    const relatedIds = web?.relatedProductIds?.length ? web.relatedProductIds : [];
    let related = relatedIds.length ? await this.cards(ctx, relatedIds.slice(0, 12)) : [];
    if (related.length < 4 && row.categoryId) {
      const more = await this.prisma.product.findMany({ where: { AND: [await this.baseWhere(ctx), { categoryId: row.categoryId, id: { notIn: [row.id, ...related.map((r) => r.id)] } }] }, select: { id: true }, orderBy: { createdAt: 'desc' }, take: 8 - related.length });
      related = [...related, ...(await this.cards(ctx, more.map((m) => m.id), false))];
    }
    const url = `${base}${card.url}`;
    const seoDescription = web?.seoDescription || row.metaDescription || htmlToText(desc, 160) || `${row.name} at ${ctx.store.name}`;
    const tabs = Array.isArray(web?.tabs) ? (web!.tabs as Array<{ title: string; html: string }>) : [];
    const sizeChart = web?.sizeChart && typeof web.sizeChart === 'object' ? (web.sizeChart as { title: string; html: string }) : null;
    const breadcrumbs = [{ title: 'Home', url: '/' }, ...(row.category ? [{ title: row.category.name, url: '/collections/all' }] : []), { title: row.name, url: card.url }];
    return {
      ...card,
      description: desc,
      seo: { title: web?.seoTitle || row.metaTitle || row.name, description: seoDescription, canonical: url, image: card.image?.url ?? null },
      images: allImages,
      options,
      variants,
      tabs,
      sizeChart,
      related: related.slice(0, 8),
      breadcrumbs,
      jsonLd: this.productJsonLd(ctx, base, card, row, variants, seoDescription, allImages.map((i) => i.url), breadcrumbs),
      weight: row.weight ?? null,
      sku: row.sku,
      updatedAt: row.updatedAt.toISOString(),
    };
  }

  private productJsonLd(ctx: StoreCtx, base: string, card: ProductCard, row: ProductRow, variants: Array<{ id: string | null; sku: string | null; price: number; availability: Availability }>, description: string, images: string[], crumbs: Array<{ title: string; url: string }>) {
    const avail = (a: Availability) => (a === 'in_stock' ? 'https://schema.org/InStock' : a === 'backorder' ? 'https://schema.org/BackOrder' : 'https://schema.org/OutOfStock');
    const offers = variants.map((v) => ({
      '@type': 'Offer', price: v.price.toFixed(2), priceCurrency: 'PKR', availability: avail(v.availability), url: `${base}${card.url}${v.id ? `?variant=${v.id}` : ''}`,
      ...(v.sku && { sku: v.sku }), seller: { '@type': 'Organization', name: ctx.store.name },
    }));
    return {
      '@context': 'https://schema.org',
      '@graph': [
        {
          '@type': 'Product', name: row.name, description, image: images.slice(0, 8), url: `${base}${card.url}`,
          ...(row.sku && { sku: row.sku }), ...(row.brand && { brand: { '@type': 'Brand', name: row.brand.name } }),
          offers: offers.length === 1 ? offers[0] : { '@type': 'AggregateOffer', priceCurrency: 'PKR', lowPrice: card.price.toFixed(2), highPrice: card.priceMax.toFixed(2), offerCount: offers.length, offers },
        },
        { '@type': 'BreadcrumbList', itemListElement: crumbs.map((c, i) => ({ '@type': 'ListItem', position: i + 1, name: c.title, item: `${base}${c.url}` })) },
      ],
    };
  }

  /** Ratings from Nafaa order reviews of orders that contained this product. */
  async reviews(ctx: StoreCtx, handle: string, pageRaw: unknown) {
    const id = await this.productIdByHandle(ctx, handle);
    if (!id) throw new NotFoundException('Product not found');
    const page = Math.max(1, Math.floor(n(pageRaw) || 1));
    const size = 10;
    const match = JSON.stringify([{ productId: id }]);
    const [stats] = await this.prisma.$queryRaw<Array<{ avg: number | null; count: bigint }>>`
      SELECT AVG(r.rating)::float AS avg, COUNT(*)::bigint AS count
      FROM online_reviews r JOIN channel_orders o ON o.id = r."channelOrderId"
      WHERE r."tenantId" = ${ctx.tenantId} AND r.rating IS NOT NULL AND o.items @> ${match}::jsonb`;
    const rows = await this.prisma.$queryRaw<Array<{ rating: number; comment: string | null; name: string | null; at: Date }>>`
      SELECT r.rating, r.comment, r."customerName" AS name, r."ratedAt" AS at
      FROM online_reviews r JOIN channel_orders o ON o.id = r."channelOrderId"
      WHERE r."tenantId" = ${ctx.tenantId} AND r.rating IS NOT NULL AND o.items @> ${match}::jsonb
      ORDER BY r."ratedAt" DESC NULLS LAST LIMIT ${size} OFFSET ${(page - 1) * size}`;
    const count = Number(stats?.count ?? 0);
    const short = (name: string | null) => {
      const parts = String(name ?? '').trim().split(/\s+/).filter(Boolean);
      return parts.length ? `${parts[0]}${parts[1] ? ` ${parts[1][0]}.` : ''}` : 'Customer';
    };
    return {
      average: count ? Math.round(n(stats?.avg) * 10) / 10 : null,
      count,
      items: rows.map((r) => ({ name: short(r.name), rating: r.rating, comment: r.comment, date: (r.at ?? new Date()).toISOString(), verified: true as const })),
      page,
      pages: Math.max(1, Math.ceil(count / size)),
    };
  }

  /** Shop-wide rating for the store header / trust sections. */
  async ratingSummary(tenantId: string) {
    const agg = await this.prisma.onlineReview.aggregate({ where: { tenantId, rating: { not: null } }, _avg: { rating: true }, _count: { _all: true } });
    return { average: agg._count._all ? Math.round(n(agg._avg.rating) * 10) / 10 : null, count: agg._count._all };
  }

  // ═══ search ═══

  async suggest(ctx: StoreCtx, qRaw: string) {
    const q = String(qRaw ?? '').trim().slice(0, 60);
    if (q.length < 2) return { products: [], collections: [], pages: [], queries: [] };
    const where = await this.shopperWhere(ctx, { q }, {});
    const ids = await this.prisma.product.findMany({ where, select: { id: true }, orderBy: [{ isFeatured: 'desc' }, { name: 'asc' }], take: 6 });
    const [products, collections, pages] = await Promise.all([
      this.cards(ctx, ids.map((i) => i.id), false),
      this.prisma.storeCollection.findMany({ where: { storeId: ctx.store.id, isPublished: true, archivedAt: null, title: { contains: q, mode: 'insensitive' } }, take: 3, select: { id: true, handle: true, title: true, imageUrl: true } }),
      this.prisma.storePage.findMany({ where: { storeId: ctx.store.id, isPublished: true, archivedAt: null, title: { contains: q, mode: 'insensitive' } }, take: 3, select: { handle: true, title: true } }),
    ]);
    const queries = [...new Set(products.map((p) => p.category).filter(Boolean) as string[])].slice(0, 4);
    return {
      products,
      collections: collections.map((c) => ({ id: c.id, handle: c.handle, title: c.title, url: `/collections/${c.handle}`, image: c.imageUrl, productCount: 0 })),
      pages: pages.map((p) => ({ title: p.title, url: `/pages/${p.handle}` })),
      queries,
    };
  }

  // ═══ cart lines ═══

  /** Current price and stock for cart lines; lines the store cannot sell come back with availability out_of_stock and maxQty 0. */
  async lineInfo(ctx: StoreCtx, refs: Array<{ productId: string; variantId: string | null }>): Promise<Map<string, LineInfo>> {
    const out = new Map<string, LineInfo>();
    const ids = [...new Set(refs.map((r) => r.productId))].filter((x) => /^[\w-]{8,64}$/.test(x));
    if (!ids.length) return out;
    const rows = await this.prisma.product.findMany({ where: { AND: [await this.baseWhere(ctx), { id: { in: ids } }] }, select: PRODUCT_SELECT });
    const built = await this.build(ctx, rows, false);
    for (const b of built) {
      for (const l of b.lines) {
        const v = l.variant;
        out.set(`${b.row.id}:${l.variantId ?? '-'}`, {
          productId: b.row.id, variantId: l.variantId, handle: b.card.handle, title: b.row.name, variantTitle: v?.name ?? null,
          image: v?.imageUrl ?? b.card.image?.url ?? null, sku: v?.sku ?? b.row.sku ?? null, price: l.price,
          compareAtPrice: b.card.compareAtPrice, availability: l.availability, maxQty: l.maxQty, leadTime: l.leadTime,
          weightKg: weightKg(v?.weight ?? b.row.weight, v?.unit ?? b.row.weightUnit),
        });
      }
    }
    return out;
  }

  // ═══ sitemap ═══

  async sitemap(ctx: StoreCtx, base: string) {
    const where = await this.baseWhere(ctx);
    const products = await this.prisma.product.findMany({ where, select: { id: true, name: true, updatedAt: true, images: { orderBy: [{ isPrimary: 'desc' }, { sortOrder: 'asc' }], take: 1, select: { url: true } } }, orderBy: { updatedAt: 'desc' }, take: 20_000 });
    const handles = await this.handlesFor(ctx.store.id, products);
    const [collections, pages, posts] = await Promise.all([
      this.prisma.storeCollection.findMany({ where: { storeId: ctx.store.id, isPublished: true, archivedAt: null }, select: { handle: true, updatedAt: true } }),
      this.prisma.storePage.findMany({ where: { storeId: ctx.store.id, isPublished: true, archivedAt: null }, select: { handle: true, updatedAt: true } }),
      this.prisma.storeBlogPost.findMany({ where: { storeId: ctx.store.id, isPublished: true, archivedAt: null }, select: { blog: true, handle: true, updatedAt: true }, take: 5000 }),
    ]);
    return {
      base,
      products: products.map((p) => ({ url: `${base}/products/${handles.get(p.id)}`, updatedAt: p.updatedAt.toISOString(), image: p.images[0]?.url ?? null })),
      collections: [{ url: `${base}/collections/all`, updatedAt: new Date().toISOString() }, ...collections.map((c) => ({ url: `${base}/collections/${c.handle}`, updatedAt: c.updatedAt.toISOString() }))],
      pages: pages.map((p) => ({ url: `${base}/pages/${p.handle}`, updatedAt: p.updatedAt.toISOString() })),
      blogs: posts.map((p) => ({ url: `${base}/blogs/${p.blog}/${p.handle}`, updatedAt: p.updatedAt.toISOString() })),
    };
  }
}

