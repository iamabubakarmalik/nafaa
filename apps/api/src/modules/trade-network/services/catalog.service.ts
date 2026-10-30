/**
 * The buyer's view of a linked seller's goods: the catalog at the buyer's own
 * price list prices with the schemes that apply (worked out by the seller's
 * distribution pricing on the server), cart prices, "Stock kam hai"
 * suggestions from the buyer's own low stock, and the remembered match
 * between the seller's products and the buyer's own.
 *
 * Every read of seller data goes through an ACTIVE link where the caller is
 * the buyer, and is filtered by the seller's tenantId.
 */

import { BadRequestException, ForbiddenException, Injectable, NotFoundException } from '@nestjs/common';
import { Prisma } from '@prisma/client';
import { PrismaService } from '../../../prisma/prisma.service';
import type { AuthenticatedUser } from '../../auth/interfaces/jwt-payload.interface';
import { DistributionAccessService } from '../../distribution/distribution-access';
import { listPrice, priceOrder } from '../../distribution/helpers/pricing';
import { pricingFor } from '../../distribution/helpers/pricing-loader';
import { schemeCovers, schemeIsLive } from '../../distribution/helpers/scheme-resolver';
import { CartDto, CatalogQueryDto, ProductMapDto, ProductMapLineDto } from '../dto/trade.dto';
import { matchProducts, r2, r4, reorderQty, schemeLabel, type MatchedBy } from '../helpers/trade-rules';
import { businessCards, linkFor } from '../trade-network.support';

type Db = Prisma.TransactionClient;

@Injectable()
export class TradeCatalogService {
  constructor(private readonly prisma: PrismaService, private readonly access: DistributionAccessService) {}

  /** An ACTIVE link where the caller buys, with the seller able to sell now. */
  async buyingLink(user: AuthenticatedUser, linkId: string) {
    const link = await linkFor(this.prisma, user.tenantId, linkId, 'BUYER');
    if (link.status === 'PAUSED') throw new ForbiddenException('Supplier ne naye Order abhi rok rakhe hain');
    if (link.status !== 'ACTIVE' || !link.customerId) throw new ForbiddenException('Yeh supplier abhi jura hua nahi');
    const a = await this.access.read(link.sellerTenantId);
    if (!a.enabled || !a.planAllows) throw new ForbiddenException('Supplier ki taraf se Order abhi band hain');
    return link;
  }

  /* ───────────── catalog ───────────── */

  async catalog(user: AuthenticatedUser, linkId: string, q: CatalogQueryDto) {
    const link = await this.buyingLink(user, linkId);
    const seller = link.sellerTenantId;
    const page = q.page ?? 1;
    const limit = q.limit ?? 40;
    const profile = await this.prisma.tradeProfile.findUnique({ where: { tenantId: seller } });
    const customer = await this.prisma.customer.findFirst({ where: { id: link.customerId!, tenantId: seller }, select: { priceListId: true } });
    const settings = await this.prisma.distributionSettings.findUnique({ where: { tenantId: seller }, select: { defaultPriceListId: true } });
    const listId = customer?.priceListId ?? settings?.defaultPriceListId ?? null;

    const search = q.search?.trim();
    const where: Prisma.ProductWhereInput = {
      tenantId: seller, isActive: true, isRawMaterial: false,
      ...(q.categoryId && { categoryId: q.categoryId }),
      ...(search && {
        OR: [
          { name: { contains: search, mode: 'insensitive' } },
          { sku: { contains: search, mode: 'insensitive' } },
          { barcode: { contains: search } },
        ],
      }),
    };
    if (profile?.catalogScope === 'LISTED' && listId) {
      const listed = await this.prisma.priceListItem.findMany({ where: { priceListId: listId, tenantId: seller }, select: { productId: true }, distinct: ['productId'] });
      where.id = { in: listed.map((x) => x.productId) };
    }
    const [total, rows, categories] = await Promise.all([
      this.prisma.product.count({ where }),
      this.prisma.product.findMany({
        where, orderBy: { name: 'asc' }, skip: (page - 1) * limit, take: limit,
        select: {
          id: true, name: true, sku: true, barcode: true, unit: true, price: true, stock: true, categoryId: true, brandId: true,
          images: { select: { url: true, thumbnail: true }, orderBy: [{ isPrimary: 'desc' }, { sortOrder: 'asc' }], take: 1 },
        },
      }),
      this.prisma.category.findMany({ where: { tenantId: seller, isActive: true, products: { some: { isActive: true } } }, select: { id: true, name: true }, orderBy: { name: 'asc' }, take: 100 }),
    ]);

    const ids = rows.map((r) => r.id);
    const pricing = await pricingFor(this.prisma, seller, { customerId: link.customerId, productIds: ids });
    const now = new Date();
    const live = pricing.schemes.filter((s) => schemeIsLive(s, now));
    const brands = await this.prisma.brand.findMany({ where: { tenantId: seller, id: { in: rows.map((r) => r.brandId).filter((x): x is string => !!x) } }, select: { id: true, name: true } });
    const maps = await this.prisma.tradeProductMap.findMany({ where: { linkId: link.id, sellerProductId: { in: ids } } });
    const mine = await this.prisma.product.findMany({
      where: { tenantId: user.tenantId, id: { in: maps.map((m) => m.buyerProductId) } },
      select: { id: true, name: true, stock: true, lowStockAlert: true, unit: true },
    });

    const items = rows.map((p) => {
      const product = pricing.catalog.products.get(p.id);
      const units = pricing.catalog.unitsByProduct.get(p.id) ?? [];
      const packs = product
        ? [
          { unitId: null as string | null, unitName: p.unit || 'pcs', conversionRate: 1, price: listPrice({ product, unit: null, list: pricing.list, tier: pricing.tier }).price, retail: r2(p.price) },
          ...units.filter((u) => !u.variantId).map((u) => ({
            unitId: u.id, unitName: u.unitName, conversionRate: Number(u.conversionRate) || 1,
            price: listPrice({ product, unit: u, list: pricing.list, tier: pricing.tier }).price,
            retail: r2(Number(u.price) || p.price * (Number(u.conversionRate) || 1)),
          })),
        ]
        : [];
      const schemes = live
        .filter((s) => schemeCovers(s, { productId: p.id, brandId: p.brandId, categoryId: p.categoryId }, pricing.list?.id ?? null))
        .map((s) => ({ id: s.id, name: s.name, label: schemeLabel(s as never, p.unit || 'pcs'), minOrderValue: s.minOrderValue ?? null }));
      const map = maps.find((m) => m.sellerProductId === p.id && !m.sellerVariantId);
      const own = map ? mine.find((x) => x.id === map.buyerProductId) : undefined;
      return {
        productId: p.id, name: p.name, sku: p.sku, barcode: p.barcode, baseUnit: p.unit || 'pcs',
        imageUrl: p.images[0]?.thumbnail || p.images[0]?.url || null,
        brandName: brands.find((b) => b.id === p.brandId)?.name ?? null,
        categoryId: p.categoryId,
        inStock: Number(p.stock) > 0,
        packs, schemes,
        mine: own ? { productId: own.id, name: own.name, stock: own.stock, lowStockAlert: own.lowStockAlert, low: own.stock <= own.lowStockAlert } : null,
      };
    });
    const seller$ = (await businessCards(this.prisma, [seller])).get(seller) ?? null;
    return {
      link: { id: link.id, status: link.status },
      seller: seller$, minOrderValue: profile?.minOrderValue ?? null,
      priceListName: pricing.list?.name ?? null,
      total, page, limit, categories, items,
    };
  }

  /** Prices a cart as the seller's order desk would, saving nothing. */
  async preview(user: AuthenticatedUser, linkId: string, dto: CartDto) {
    const link = await this.buyingLink(user, linkId);
    return this.priceCart(link.sellerTenantId, link.customerId!, dto);
  }

  async priceCart(sellerTenantId: string, customerId: string, dto: CartDto) {
    const lines = dto.items.map((i) => ({ productId: i.productId, variantId: i.variantId || null, unitId: i.unitId || null, qty: i.qty }));
    const pricing = await pricingFor(this.prisma, sellerTenantId, { customerId, productIds: lines.map((l) => l.productId) });
    const priced = priceOrder(lines, pricing.catalog, { list: pricing.list, tier: pricing.tier, schemes: pricing.schemes, canOverride: false });
    const names = new Map([...pricing.catalog.products.values()].map((p) => [p.id, p.name]));
    return {
      lines: priced.lines.map((l) => ({
        index: l.index, productId: l.productId, variantId: l.variantId, unitId: l.unitId, unitName: l.unitName, conversionRate: l.conversionRate,
        name: names.get(l.productId) ?? null, qty: l.qty, baseQty: l.baseQty, price: l.price, gross: l.gross, schemeDiscount: l.schemeDiscount, total: l.total,
        schemeNote: l.schemeNote, freeBaseQty: l.freeBaseQty, freeProductName: l.freeProductId ? names.get(l.freeProductId) ?? null : null,
      })),
      subtotal: priced.subtotal, schemeDiscount: priced.schemeDiscount, total: priced.total, warnings: priced.warnings,
    };
  }

  /* ───────────── matching ───────────── */

  /** Seller products with their pack barcodes, for matching. */
  private async sellerMatchables(db: Db, sellerTenantId: string, productIds?: string[]) {
    const rows = await db.product.findMany({
      where: { tenantId: sellerTenantId, ...(productIds ? { id: { in: productIds } } : { isActive: true }) },
      select: { id: true, name: true, sku: true, barcode: true, unit: true, price: true, units: { select: { barcode: true, unitName: true, conversionRate: true } } },
      take: productIds ? undefined : 5000,
    });
    return rows.map((r) => ({ ...r, barcodes: r.units.map((u) => u.barcode) }));
  }

  private async buyerMatchables(db: Db, buyerTenantId: string) {
    const rows = await db.product.findMany({
      where: { tenantId: buyerTenantId, isActive: true },
      select: { id: true, name: true, sku: true, barcode: true, units: { select: { barcode: true } } },
      take: 20000,
    });
    return rows.map((r) => ({ ...r, barcodes: r.units.map((u) => u.barcode) }));
  }

  /**
   * Buyer product for each seller product: remembered matches first, then
   * barcode, SKU and name. New automatic matches are remembered.
   */
  async resolveMaps(db: Db, link: { id: string; buyerTenantId: string; sellerTenantId: string }, sellerKeys: Array<{ productId: string; variantId: string | null }>) {
    const keyOf = (p: string, v: string | null) => `${p}|${v ?? ''}`;
    const wanted = [...new Map(sellerKeys.map((k) => [keyOf(k.productId, k.variantId), k])).values()];
    const saved = await db.tradeProductMap.findMany({ where: { linkId: link.id, sellerProductId: { in: wanted.map((w) => w.productId) } } });
    const out = new Map<string, { buyerProductId: string; buyerVariantId: string | null; by: string }>();
    // Saved rows must still point at a live product of the buyer.
    const live = new Set((await db.product.findMany({ where: { tenantId: link.buyerTenantId, id: { in: saved.map((s) => s.buyerProductId) }, isActive: true }, select: { id: true } })).map((p) => p.id));
    for (const s of saved) if (live.has(s.buyerProductId)) out.set(keyOf(s.sellerProductId, s.sellerVariantId || null), { buyerProductId: s.buyerProductId, buyerVariantId: s.buyerVariantId, by: s.matchedBy });
    // Variants are matched by hand only; base products are matched automatically.
    const missing = wanted.filter((w) => !out.has(keyOf(w.productId, w.variantId)) && !w.variantId);
    if (missing.length) {
      const sellerRows = await this.sellerMatchables(db, link.sellerTenantId, missing.map((m) => m.productId));
      const found = matchProducts(sellerRows, await this.buyerMatchables(db, link.buyerTenantId));
      for (const [sellerProductId, hit] of found) {
        out.set(keyOf(sellerProductId, null), { buyerProductId: hit.buyerProductId, buyerVariantId: null, by: hit.by });
        await this.remember(db, link, sellerProductId, null, hit.buyerProductId, null, hit.by);
      }
    }
    return { get: (productId: string, variantId: string | null) => out.get(keyOf(productId, variantId)) ?? null };
  }

  private remember(db: Db, link: { id: string; buyerTenantId: string }, sellerProductId: string, sellerVariantId: string | null, buyerProductId: string, buyerVariantId: string | null, by: MatchedBy | 'MANUAL' | 'CREATED') {
    return db.tradeProductMap.upsert({
      where: { linkId_sellerProductId_sellerVariantId: { linkId: link.id, sellerProductId, sellerVariantId: sellerVariantId ?? '' } },
      create: { linkId: link.id, buyerTenantId: link.buyerTenantId, sellerProductId, sellerVariantId: sellerVariantId ?? '', buyerProductId, buyerVariantId, matchedBy: by },
      update: { buyerProductId, buyerVariantId, matchedBy: by },
    });
  }

  /**
   * Saves matches chosen by hand. `create` makes the buyer a new product
   * from the seller's (name, barcode, base unit, retail price as sale price).
   * Seller ids must be products the seller actually has.
   */
  async saveMaps(db: Db, link: { id: string; buyerTenantId: string; sellerTenantId: string }, maps: ProductMapLineDto[], costHints = new Map<string, number>()) {
    if (!maps.length) return 0;
    const sellerRows = await this.sellerMatchables(db, link.sellerTenantId, [...new Set(maps.map((m) => m.sellerProductId))]);
    const byId = new Map(sellerRows.map((r) => [r.id, r]));
    let saved = 0;
    for (const m of maps) {
      const s = byId.get(m.sellerProductId);
      if (!s) throw new BadRequestException('Supplier ka product nahi mila');
      if (m.sellerVariantId) {
        const v = await db.productVariant.findFirst({ where: { id: m.sellerVariantId, productId: s.id }, select: { id: true } });
        if (!v) throw new BadRequestException('Supplier ka variant nahi mila');
      }
      let buyerProductId = m.buyerProductId || null;
      let buyerVariantId = m.buyerVariantId || null;
      let by: 'MANUAL' | 'CREATED' = 'MANUAL';
      if (buyerProductId) {
        const own = await db.product.findFirst({ where: { id: buyerProductId, tenantId: link.buyerTenantId }, select: { id: true } });
        if (!own) throw new BadRequestException('Aap ka product nahi mila');
        if (buyerVariantId) {
          const v = await db.productVariant.findFirst({ where: { id: buyerVariantId, productId: own.id }, select: { id: true } });
          if (!v) throw new BadRequestException('Aap ka variant nahi mila');
        }
      } else if (m.create) {
        const barcodeTaken = s.barcode ? await db.product.findFirst({ where: { tenantId: link.buyerTenantId, barcode: s.barcode }, select: { id: true } }) : null;
        const created = await db.product.create({
          data: {
            tenantId: link.buyerTenantId, name: s.name, unit: s.unit || 'pcs', barcode: barcodeTaken ? null : s.barcode,
            price: r2(s.price), costPrice: r4(costHints.get(s.id) ?? 0), stock: 0, isActive: true,
          },
          select: { id: true },
        });
        buyerProductId = created.id;
        buyerVariantId = null;
        by = 'CREATED';
      } else {
        throw new BadRequestException(`${s.name}: apna product chunein ya naya banayein`);
      }
      await this.remember(db, link, s.id, m.sellerVariantId || null, buyerProductId, buyerVariantId, by);
      saved++;
    }
    return saved;
  }

  async listMaps(user: AuthenticatedUser, linkId: string) {
    const link = await linkFor(this.prisma, user.tenantId, linkId, 'BUYER');
    const maps = await this.prisma.tradeProductMap.findMany({ where: { linkId: link.id }, orderBy: { updatedAt: 'desc' }, take: 1000 });
    const [sellerRows, mine] = await Promise.all([
      this.prisma.product.findMany({ where: { tenantId: link.sellerTenantId, id: { in: maps.map((m) => m.sellerProductId) } }, select: { id: true, name: true, sku: true } }),
      this.prisma.product.findMany({ where: { tenantId: user.tenantId, id: { in: maps.map((m) => m.buyerProductId) } }, select: { id: true, name: true, sku: true } }),
    ]);
    return maps.map((m) => ({
      id: m.id, matchedBy: m.matchedBy, sellerVariantId: m.sellerVariantId || null, buyerVariantId: m.buyerVariantId,
      seller: sellerRows.find((x) => x.id === m.sellerProductId) ?? { id: m.sellerProductId, name: null, sku: null },
      mine: mine.find((x) => x.id === m.buyerProductId) ?? { id: m.buyerProductId, name: null, sku: null },
    }));
  }

  async putMaps(user: AuthenticatedUser, linkId: string, dto: ProductMapDto) {
    const link = await linkFor(this.prisma, user.tenantId, linkId, 'BUYER');
    const saved = await this.prisma.$transaction((tx) => this.saveMaps(tx, link, dto.maps), { timeout: 30_000 });
    return { saved };
  }

  /* ───────────── stock kam hai ───────────── */

  /** The buyer's low items that this seller sells, with a suggested quantity. */
  async suggestions(user: AuthenticatedUser, linkId: string) {
    const link = await this.buyingLink(user, linkId);
    const low = await this.prisma.$queryRaw<Array<{ id: string; name: string; stock: number; lowStockAlert: number; unit: string }>>`
      SELECT id, name, stock, "lowStockAlert", unit FROM "Product"
      WHERE "tenantId" = ${user.tenantId} AND "isActive" = true AND "isRawMaterial" = false AND stock <= "lowStockAlert"
      ORDER BY (stock - "lowStockAlert") ASC LIMIT 300`;
    if (!low.length) return { items: [] };

    // Remembered matches, then automatic matching against the seller's active products.
    const maps = await this.prisma.tradeProductMap.findMany({ where: { linkId: link.id, buyerProductId: { in: low.map((l) => l.id) }, sellerVariantId: '' } });
    const bySeller = new Map<string, string>(); // buyer product -> seller product
    for (const m of maps) bySeller.set(m.buyerProductId, m.sellerProductId);
    const unmatched = low.filter((l) => !bySeller.has(l.id));
    if (unmatched.length) {
      const sellerRows = await this.sellerMatchables(this.prisma, link.sellerTenantId);
      const buyerRows = await this.prisma.product.findMany({ where: { tenantId: user.tenantId, id: { in: unmatched.map((u) => u.id) } }, select: { id: true, name: true, sku: true, barcode: true, units: { select: { barcode: true } } } });
      // Match from the buyer's side: each low item against the seller's catalog.
      const found = matchProducts(buyerRows.map((b) => ({ ...b, barcodes: b.units.map((u) => u.barcode) })), sellerRows);
      for (const [buyerId, hit] of found) bySeller.set(buyerId, hit.buyerProductId);
    }
    const sellerIds = [...new Set([...bySeller.values()])];
    if (!sellerIds.length) return { items: [] };
    const pricing = await pricingFor(this.prisma, link.sellerTenantId, { customerId: link.customerId, productIds: sellerIds });
    const items = [];
    for (const l of low) {
      const sid = bySeller.get(l.id);
      const product = sid ? pricing.catalog.products.get(sid) : undefined;
      if (!sid || !product) continue;
      const pack = (pricing.catalog.unitsByProduct.get(sid) ?? []).filter((u) => !u.variantId).sort((a, b) => Number(b.conversionRate) - Number(a.conversionRate))[0];
      const q = reorderQty(l.stock, l.lowStockAlert, pack ? Number(pack.conversionRate) : null);
      const usePack = !!(pack && q.packs);
      items.push({
        mine: { productId: l.id, name: l.name, stock: l.stock, lowStockAlert: l.lowStockAlert, unit: l.unit },
        seller: { productId: sid, name: product.name, baseUnit: product.unit || 'pcs' },
        suggest: {
          unitId: usePack ? pack!.id : null, unitName: usePack ? pack!.unitName : product.unit || 'pcs',
          conversionRate: usePack ? Number(pack!.conversionRate) : 1, qty: usePack ? q.packs! : q.baseQty,
          price: listPrice({ product, unit: usePack ? pack! : null, list: pricing.list, tier: pricing.tier }).price,
        },
      });
    }
    return { items };
  }

  /** For the receiving screen: the buyer's own products to match against. */
  async myProducts(user: AuthenticatedUser, search?: string) {
    const s = search?.trim();
    if (!s) return [];
    return this.prisma.product.findMany({
      where: { tenantId: user.tenantId, isActive: true, OR: [{ name: { contains: s, mode: 'insensitive' } }, { sku: { contains: s, mode: 'insensitive' } }, { barcode: { contains: s } }] },
      select: { id: true, name: true, sku: true, barcode: true, unit: true, stock: true }, take: 20, orderBy: { name: 'asc' },
    });
  }

  ensureFound<T>(x: T | null | undefined, msg = 'Nahi mila'): T {
    if (!x) throw new NotFoundException(msg);
    return x;
  }
}
