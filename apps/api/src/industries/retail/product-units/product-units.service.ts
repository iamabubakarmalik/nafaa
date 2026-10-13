/**
 * Pack units (pack, box, carton, dozen, bag…) that sell or buy a product in
 * a multiple of its base unit. Every read and write is tenant checked; a
 * barcode is unique across products, variants, packs and combos; the base
 * unit always has rate 1; an empty price falls back to base price × rate.
 * Also the page data: products with their packs, bulk add and analytics.
 */

import { BadRequestException, ConflictException, Injectable, NotFoundException } from '@nestjs/common';
import { Prisma } from '@prisma/client';
import { PrismaService } from '../../../prisma/prisma.service';
import { AuthenticatedUser } from '../../../modules/auth/interfaces/jwt-payload.interface';
import { TenantTimezoneService } from '../../../common/helpers/tenant-timezone.service';
import { ShopScope } from '../../../common/shop-scope';
import { periodRange } from '../../../modules/inventory/taxonomy/taxonomy.helper';
import { freshInStoreEan } from '../../../modules/inventory/barcode-labels/barcode.helper';
import { KEPT_QTY, LINE_REVENUE, billMathCte, liveSaleSql } from '../../../common/helpers/business-math.helper';
import { assertCodeFree, findCodeClash } from './code-clash.helper';
import { BulkAddUnitDto, CreateProductUnitDto, UnitsAnalyticsDto, UnitsOverviewDto } from './dto/create-product-unit.dto';
import { UpdateProductUnitDto } from './dto/update-product-unit.dto';

const r2 = (n: number) => Math.round(n * 100) / 100;
const DAY = 86_400_000;

const UNIT_SELECT = {
  id: true, productId: true, variantId: true, unitName: true, unitLabel: true, conversionType: true, conversionRate: true,
  isBase: true, isDefault: true, price: true, costPrice: true, wholesalePrice: true, mrpPrice: true, barcode: true, sku: true,
  isActive: true, sortOrder: true, createdAt: true, updatedAt: true,
} satisfies Prisma.ProductUnitSelect;

type UnitRow = Prisma.ProductUnitGetPayload<{ select: typeof UNIT_SELECT }>;

/** What one pack should cost at the loose rate, and whether its price looks wrong. */
function check(u: Pick<UnitRow, 'conversionRate' | 'price' | 'costPrice' | 'isBase'>, basePrice: number) {
  const loose = r2(basePrice * (Number(u.conversionRate) || 1));
  const price = Number(u.price) || 0;
  const cost = Number(u.costPrice) || 0;
  const dearer = !u.isBase && loose > 0 && price > loose + 0.5;
  const loss = cost > 0 && price > 0 && price < cost;
  const saving = !u.isBase && loose > 0 ? r2(loose - price) : 0;
  return { loose, saving, dearer, loss };
}

@Injectable()
export class ProductUnitsService {
  constructor(
    private readonly prisma: PrismaService,
    private readonly tz: TenantTimezoneService,
  ) {}

  private async product(tenantId: string, productId: string, variantId?: string | null) {
    const product = await this.prisma.product.findFirst({
      where: { id: productId, tenantId },
      select: { id: true, name: true, unit: true, price: true, costPrice: true },
    });
    if (!product) throw new NotFoundException('Product nahi mila');
    if (!variantId) return { ...product, basePrice: Number(product.price) || 0, baseCost: Number(product.costPrice) || 0 };
    const variant = await this.prisma.productVariant.findFirst({ where: { id: variantId, productId }, select: { price: true, costPrice: true } });
    if (!variant) throw new BadRequestException('Is product ki ye type nahi mili');
    return { ...product, basePrice: Number(variant.price) || 0, baseCost: Number(variant.costPrice || product.costPrice) || 0 };
  }

  private async checkName(productId: string, variantId: string | null, unitName: string, exceptId?: string) {
    const dup = await this.prisma.productUnit.findFirst({
      where: { productId, variantId, unitName: { equals: unitName.trim(), mode: 'insensitive' }, ...(exceptId && { id: { not: exceptId } }) },
      select: { id: true },
    });
    if (dup) throw new ConflictException(`"${unitName.trim()}" is product me pehle se hai`);
  }

  async create(user: AuthenticatedUser, dto: CreateProductUnitDto) {
    const variantId = dto.variantId || null;
    const p = await this.product(user.tenantId, dto.productId, variantId);
    await this.checkName(p.id, variantId, dto.unitName);
    // Only the base unit may share its product's own code; a pack with that code
    // would take over the piece scan at the counter (packs are matched first).
    await assertCodeFree(this.prisma, user.tenantId, dto.barcode, dto.isBase ? { productId: p.id } : {});
    const rate = dto.isBase ? 1 : dto.conversionRate;

    return this.prisma.$transaction(async (tx) => {
      if (dto.isBase) await tx.productUnit.updateMany({ where: { tenantId: user.tenantId, productId: p.id, variantId, isBase: true }, data: { isBase: false } });
      if (dto.isDefault) await tx.productUnit.updateMany({ where: { tenantId: user.tenantId, productId: p.id, variantId, isDefault: true }, data: { isDefault: false } });
      return tx.productUnit.create({
        data: {
          ...dto,
          tenantId: user.tenantId,
          productId: p.id,
          variantId,
          conversionRate: rate,
          conversionType: dto.isBase ? 'BASE' : dto.conversionType,
          price: dto.price && dto.price > 0 ? dto.price : r2(p.basePrice * rate),
          costPrice: dto.costPrice && dto.costPrice > 0 ? dto.costPrice : r2(p.baseCost * rate),
        },
        select: UNIT_SELECT,
      });
    });
  }

  /**
   * All active units of the tenant, loaded once by the POS so a pack
   * barcode matches offline without a request per scan.
   */
  async findAll(user: AuthenticatedUser) {
    return this.prisma.productUnit.findMany({
      where: { tenantId: user.tenantId, isActive: true },
      select: {
        id: true, productId: true, variantId: true,
        unitName: true, unitLabel: true,
        conversionRate: true, isBase: true, isDefault: true,
        price: true, wholesalePrice: true, mrpPrice: true,
        barcode: true, sku: true, sortOrder: true,
      },
      orderBy: [{ productId: 'asc' }, { isBase: 'desc' }, { sortOrder: 'asc' }],
    });
  }

  async findByProduct(user: AuthenticatedUser, productId: string, variantId?: string) {
    return this.prisma.productUnit.findMany({
      where: { tenantId: user.tenantId, productId, variantId: variantId ?? null },
      orderBy: [{ isBase: 'desc' }, { sortOrder: 'asc' }],
    });
  }

  /**
   * Unit for a scanned code. SKU is matched too (many cartons carry only
   * the SKU) and case is ignored. The product comes along so the POS can
   * build the line without another request.
   */
  async findByBarcode(user: AuthenticatedUser, barcode: string) {
    const code = barcode.trim();
    if (!code) throw new NotFoundException('Barcode khaali hai');

    const unit = await this.prisma.productUnit.findFirst({
      where: {
        tenantId: user.tenantId,
        isActive: true,
        OR: [
          { barcode: { equals: code, mode: 'insensitive' } },
          { sku: { equals: code, mode: 'insensitive' } },
        ],
      },
      include: {
        product: {
          include: {
            category: true,
            brand: true,
            images: { where: { isPrimary: true }, take: 1 },
          },
        },
        variant: true,
      },
    });
    if (!unit) throw new NotFoundException(`Barcode ${code} kisi pack par nahi laga`);
    return unit;
  }

  /** Gives the unit its own in-store EAN-13 so pack labels can be printed. */
  async generateBarcode(user: AuthenticatedUser, id: string) {
    const unit = await this.prisma.productUnit.findFirst({ where: { id, tenantId: user.tenantId }, select: UNIT_SELECT });
    if (!unit) throw new NotFoundException('Unit nahi mila');
    if (unit.barcode) return unit;

    const taken = new Set<string>();
    for (let attempt = 0; attempt < 5; attempt++) {
      const code = await freshInStoreEan(this.prisma, user.tenantId, taken);
      if (await findCodeClash(this.prisma, user.tenantId, code)) continue;
      return this.prisma.productUnit.update({ where: { id }, data: { barcode: code }, select: UNIT_SELECT });
    }
    throw new BadRequestException('Barcode ban nahi saka — dobara koshish karein');
  }

  async update(user: AuthenticatedUser, id: string, dto: UpdateProductUnitDto) {
    const existing = await this.prisma.productUnit.findFirst({ where: { id, tenantId: user.tenantId } });
    if (!existing) throw new NotFoundException('Unit nahi mila');
    if (dto.productId && dto.productId !== existing.productId) throw new BadRequestException('Unit doosre product par nahi ja sakta');
    if (dto.variantId !== undefined && (dto.variantId || null) !== existing.variantId) throw new BadRequestException('Unit ki type nahi badal sakti');

    if (dto.unitName && dto.unitName.trim().toLowerCase() !== existing.unitName.trim().toLowerCase()) {
      await this.checkName(existing.productId, existing.variantId, dto.unitName, id);
    }
    const isBase = dto.isBase ?? existing.isBase;
    const code = dto.barcode !== undefined ? dto.barcode : existing.barcode;
    const codeChanged = !!dto.barcode && dto.barcode.toLowerCase() !== (existing.barcode ?? '').toLowerCase();
    if (code && (codeChanged || (existing.isBase && !isBase))) {
      await assertCodeFree(this.prisma, user.tenantId, code, isBase ? { unitId: id, productId: existing.productId } : { unitId: id });
    }

    const rate = isBase ? 1 : dto.conversionRate ?? existing.conversionRate;
    const needsBase = (dto.price !== undefined && !(dto.price > 0)) || (dto.costPrice !== undefined && !(dto.costPrice > 0));
    const p = needsBase ? await this.product(user.tenantId, existing.productId, existing.variantId) : null;
    const { productId: _p, variantId: _v, ...fields } = dto;

    return this.prisma.$transaction(async (tx) => {
      const scope = { tenantId: user.tenantId, productId: existing.productId, variantId: existing.variantId, id: { not: id } };
      if (dto.isBase && !existing.isBase) await tx.productUnit.updateMany({ where: { ...scope, isBase: true }, data: { isBase: false } });
      if (dto.isDefault && !existing.isDefault) await tx.productUnit.updateMany({ where: { ...scope, isDefault: true }, data: { isDefault: false } });
      return tx.productUnit.update({
        where: { id },
        data: {
          ...fields,
          conversionRate: rate,
          ...(isBase && { conversionType: 'BASE' as const }),
          ...(p && dto.price !== undefined && !(dto.price > 0) && { price: r2(p.basePrice * rate) }),
          ...(p && dto.costPrice !== undefined && !(dto.costPrice > 0) && { costPrice: r2(p.baseCost * rate) }),
        },
        select: UNIT_SELECT,
      });
    });
  }

  async remove(user: AuthenticatedUser, id: string) {
    const existing = await this.prisma.productUnit.findFirst({ where: { id, tenantId: user.tenantId } });
    if (!existing) throw new NotFoundException('Unit nahi mila');
    if (existing.isBase) throw new BadRequestException('Asal (base) unit nahi mit sakta');
    // A combo part on this pack would silently turn into one loose piece.
    const inCombo = await this.prisma.productComboItem.findFirst({ where: { unitId: id }, select: { combo: { select: { name: true } } } });
    if (inCombo) throw new BadRequestException(`Ye pack combo "${inCombo.combo.name}" me laga hai — pehle combo se hatayein ya pack band kar dein`);
    await this.prisma.productUnit.delete({ where: { id } });
    return { id };
  }

  /** Quantity in one unit expressed in another unit of the same product (2 dozen → 24 pieces). */
  async convertQuantity(user: AuthenticatedUser, fromUnitId: string, toUnitId: string, quantity: number): Promise<number> {
    const [fromUnit, toUnit] = await Promise.all([
      this.prisma.productUnit.findFirst({ where: { id: fromUnitId, tenantId: user.tenantId } }),
      this.prisma.productUnit.findFirst({ where: { id: toUnitId, tenantId: user.tenantId } }),
    ]);
    if (!fromUnit || !toUnit) throw new NotFoundException('Unit nahi mila');
    if (fromUnit.productId !== toUnit.productId) throw new BadRequestException('Dono units alag products ke hain');
    return (Number(quantity) * fromUnit.conversionRate) / (toUnit.conversionRate || 1);
  }

  /* ─── Page data ──────────────────────────────────────────── */

  /** Products with their packs, a page at a time, plus the overall counts. */
  async overview(user: AuthenticatedUser, scope: ShopScope, q: UnitsOverviewDto) {
    const tenantId = user.tenantId;
    const page = q.page ?? 1;
    const limit = q.limit ?? 30;
    const all = await this.prisma.productUnit.findMany({
      where: { tenantId, product: { isActive: true } },
      select: { ...UNIT_SELECT, product: { select: { price: true } }, variant: { select: { name: true, price: true } } },
    });

    const withIds = new Set<string>();
    const noBarcodeIds = new Set<string>();
    const issueIds = new Set<string>();
    let packs = 0;
    for (const u of all) {
      if (u.isBase) continue;
      packs++;
      withIds.add(u.productId);
      if (u.isActive && !u.barcode) noBarcodeIds.add(u.productId);
      const c = check(u, Number(u.variant?.price ?? u.product.price) || 0);
      if (u.isActive && (c.dearer || c.loss)) issueIds.add(u.productId);
    }

    const search = q.search?.trim();
    const pick = q.filter === 'with' ? withIds : q.filter === 'noBarcode' ? noBarcodeIds : q.filter === 'priceIssue' ? issueIds : null;
    const where: Prisma.ProductWhereInput = {
      tenantId,
      isActive: true,
      ...(pick && { id: { in: [...pick] } }),
      ...(q.filter === 'without' && { id: { notIn: [...withIds] } }),
      ...(q.categoryId && { categoryId: q.categoryId }),
      ...(search && {
        OR: [
          { name: { contains: search, mode: 'insensitive' } },
          { sku: { contains: search, mode: 'insensitive' } },
          { barcode: { equals: search, mode: 'insensitive' } },
          { units: { some: { barcode: { equals: search, mode: 'insensitive' } } } },
        ],
      }),
    };
    const [products, total, productCount] = await Promise.all([
      this.prisma.product.findMany({
        where,
        orderBy: { name: 'asc' },
        skip: (page - 1) * limit,
        take: limit,
        select: {
          id: true, name: true, sku: true, barcode: true, unit: true, price: true, costPrice: true, stock: true, hasVariants: true,
          category: { select: { id: true, name: true } },
          images: { where: { isPrimary: true }, take: 1, select: { url: true } },
          variants: { where: { isActive: true }, select: { id: true, name: true, price: true }, orderBy: { sortOrder: 'asc' } },
        },
      }),
      this.prisma.product.count({ where }),
      this.prisma.product.count({ where: { tenantId, isActive: true } }),
    ]);

    const branch = new Map<string, number>();
    if (scope.shopId && products.length) {
      const rows = await this.prisma.shopStock.groupBy({
        by: ['productId'],
        where: { tenantId, shopId: scope.shopId, productId: { in: products.map((p) => p.id) } },
        _sum: { stock: true },
      });
      for (const r of rows) branch.set(r.productId, Number(r._sum.stock ?? 0));
    }

    const unitsBy = new Map<string, typeof all>();
    for (const u of all) {
      const list = unitsBy.get(u.productId) ?? [];
      list.push(u);
      unitsBy.set(u.productId, list);
    }

    return {
      items: products.map((p) => {
        const stock = scope.shopId ? branch.get(p.id) ?? 0 : Number(p.stock) || 0;
        const units = (unitsBy.get(p.id) ?? [])
          .sort((a, b) => Number(b.isBase) - Number(a.isBase) || a.conversionRate - b.conversionRate || a.sortOrder - b.sortOrder)
          .map(({ product: _p, variant, ...u }) => ({
            ...u,
            variantName: variant?.name ?? null,
            ...check(u, Number(variant?.price ?? p.price) || 0),
            inStock: u.conversionRate > 0 ? Math.floor(stock / u.conversionRate + 1e-9) : 0,
          }));
        return { ...p, image: p.images[0]?.url ?? null, images: undefined, stock: r2(stock), units };
      }),
      total,
      page,
      pages: Math.max(1, Math.ceil(total / limit)),
      totals: {
        products: productCount,
        withPacks: withIds.size,
        packs,
        noBarcode: noBarcodeIds.size,
        priceIssues: issueIds.size,
        coverage: productCount > 0 ? r2((withIds.size / productCount) * 100) : 0,
      },
    };
  }

  /**
   * Adds one pack (e.g. carton = 24) to many products. The price is the
   * loose price × rate less an optional percent, rounded; cost is cost ×
   * rate. Products that already have the pack are skipped unless
   * `overwrite`, which updates rate and prices instead.
   */
  async bulkAdd(user: AuthenticatedUser, dto: BulkAddUnitDto) {
    const tenantId = user.tenantId;
    const ids = [...new Set(dto.productIds)];
    const products = await this.prisma.product.findMany({
      where: { tenantId, id: { in: ids } },
      select: { id: true, name: true, unit: true, price: true, costPrice: true, units: { where: { variantId: null }, select: { id: true, unitName: true, isBase: true } } },
    });
    if (products.length !== ids.length) throw new NotFoundException('Kuch products nahi mile');

    const name = dto.unitName.trim();
    const rate = dto.conversionRate;
    const off = (dto.discountPercent ?? 0) / 100;
    const step = dto.roundTo ?? 1;
    const priceOf = (base: number) => {
      const raw = base * rate * (1 - off);
      return raw > 0 ? Math.max(step, Math.round(raw / step) * step) : 0;
    };

    let created = 0;
    let updated = 0;
    const skipped: string[] = [];
    await this.prisma.$transaction(async (tx) => {
      for (const p of products) {
        if (name.toLowerCase() === (p.unit || '').toLowerCase()) { skipped.push(p.name); continue; }
        const same = p.units.find((u) => u.unitName.trim().toLowerCase() === name.toLowerCase());
        const data = {
          conversionRate: rate,
          conversionType: dto.conversionType,
          unitLabel: `${name} (${rate} ${p.unit || 'pcs'})`,
          price: priceOf(Number(p.price) || 0),
          costPrice: r2((Number(p.costPrice) || 0) * rate),
        };
        if (same) {
          if (!dto.overwrite || same.isBase) { skipped.push(p.name); continue; }
          await tx.productUnit.update({ where: { id: same.id }, data });
          updated++;
        } else {
          await tx.productUnit.create({ data: { ...data, tenantId, productId: p.id, unitName: name, isActive: true, sortOrder: p.units.length } });
          created++;
        }
      }
    }, { timeout: 60_000 });
    return { created, updated, skipped: skipped.length, skippedNames: skipped.slice(0, 20) };
  }

  /**
   * How packs are set up and used: coverage, pack names and types, price
   * problems, packs bought in purchases over the range and the best-selling
   * products that still have no pack. Sale lines are stored in base units
   * (the unit sold is not kept), so there is no sales-by-pack split.
   */
  async analytics(user: AuthenticatedUser, scope: ShopScope, q: UnitsAnalyticsDto) {
    const tenantId = user.tenantId;
    const range = await periodRange(this.tz, tenantId, q.from, q.to);
    const [units, productCount, bought] = await Promise.all([
      this.prisma.productUnit.findMany({
        where: { tenantId, isBase: false, product: { isActive: true } },
        select: { ...UNIT_SELECT, product: { select: { name: true, unit: true, price: true } }, variant: { select: { name: true, price: true } } },
      }),
      this.prisma.product.count({ where: { tenantId, isActive: true } }),
      this.prisma.purchaseItem.findMany({
        where: { productId: { not: null }, purchase: { tenantId, ...scope.where, status: { in: ['RECEIVED', 'PARTIAL'] }, purchasedAt: range } },
        select: { unitId: true, unitName: true, quantity: true, baseQuantity: true, conversionRate: true, total: true },
      }),
    ]);

    const withIds = new Set(units.map((u) => u.productId));
    const names = new Map<string, { name: string; count: number; rates: Map<number, number> }>();
    const types = new Map<string, number>();
    const issues: Array<{ productId: string; product: string; unit: string; rate: number; price: number; loose: number; cost: number; kind: 'dearer' | 'loss' }> = [];
    let noBarcode = 0;
    let defaults = 0;
    let inactive = 0;
    for (const u of units) {
      const key = u.unitName.trim().toLowerCase();
      const n = names.get(key) ?? { name: u.unitName.trim(), count: 0, rates: new Map<number, number>() };
      n.count++;
      n.rates.set(u.conversionRate, (n.rates.get(u.conversionRate) ?? 0) + 1);
      names.set(key, n);
      types.set(u.conversionType, (types.get(u.conversionType) ?? 0) + 1);
      if (!u.isActive) { inactive++; continue; }
      if (!u.barcode) noBarcode++;
      if (u.isDefault) defaults++;
      const c = check(u, Number(u.variant?.price ?? u.product.price) || 0);
      if (c.dearer || c.loss) {
        issues.push({
          productId: u.productId, product: u.variant ? `${u.product.name} (${u.variant.name})` : u.product.name, unit: u.unitName,
          rate: u.conversionRate, price: Number(u.price) || 0, loose: c.loose, cost: Number(u.costPrice) || 0, kind: c.loss ? 'loss' : 'dearer',
        });
      }
    }

    const byUnit = new Map<string, { name: string; lines: number; qty: number; baseQty: number; value: number }>();
    let packLines = 0;
    for (const b of bought) {
      const pack = !!b.unitId || (Number(b.conversionRate) || 1) !== 1;
      if (pack) packLines++;
      const key = pack ? b.unitName.trim().toLowerCase() : 'loose';
      const g = byUnit.get(key) ?? { name: pack ? b.unitName.trim() : 'Khula (base unit)', lines: 0, qty: 0, baseQty: 0, value: 0 };
      g.lines++; g.qty += Number(b.quantity) || 0; g.baseQty += Number(b.baseQuantity) || 0; g.value += Number(b.total) || 0;
      byUnit.set(key, g);
    }

    // Best sellers with no packs, net of bill discounts and returns, as in the reports.
    const where = liveSaleSql({ tenantId, shopId: scope.shopId ?? null }, range);
    const packed = withIds.size ? Prisma.sql`AND si."productId" NOT IN (${Prisma.join([...withIds])})` : Prisma.empty;
    const sold = await this.prisma.$queryRaw<Array<{ productId: string; qty: number; revenue: number }>>`
      WITH ${billMathCte(where)}
      SELECT si."productId" AS "productId",
        COALESCE(SUM(${KEPT_QTY}), 0)::float8 AS qty,
        COALESCE(SUM(${LINE_REVENUE}), 0)::float8 AS revenue
      FROM "SaleItem" si JOIN "Sale" s ON s.id = si."saleId" JOIN bm ON bm.id = s.id
      WHERE ${where} AND si."productId" IS NOT NULL ${packed}
      GROUP BY 1
      HAVING COALESCE(SUM(${KEPT_QTY}), 0) > 0
      ORDER BY qty DESC
      LIMIT 10`;
    const soldNames = sold.length
      ? await this.prisma.product.findMany({ where: { tenantId, id: { in: sold.map((s) => s.productId) } }, select: { id: true, name: true, unit: true } })
      : [];
    const nameOf = new Map(soldNames.map((p) => [p.id, p]));

    return {
      totals: {
        products: productCount,
        withPacks: withIds.size,
        coverage: productCount > 0 ? r2((withIds.size / productCount) * 100) : 0,
        packs: units.length,
        inactive,
        noBarcode,
        defaults,
        priceIssues: issues.length,
        packLines,
        purchaseLines: bought.length,
      },
      byName: [...names.values()]
        .map((n) => ({ name: n.name, count: n.count, commonRate: [...n.rates.entries()].sort((a, b) => b[1] - a[1])[0]?.[0] ?? 1 }))
        .sort((a, b) => b.count - a.count).slice(0, 12),
      byType: [...types.entries()].map(([type, count]) => ({ type, count })).sort((a, b) => b.count - a.count),
      issues: issues.sort((a, b) => Number(b.kind === 'loss') - Number(a.kind === 'loss') || Math.abs(b.price - b.loose) - Math.abs(a.price - a.loose)).slice(0, 15),
      bought: [...byUnit.values()].map((g) => ({ ...g, qty: r2(g.qty), baseQty: r2(g.baseQty), value: r2(g.value) })).sort((a, b) => b.value - a.value),
      topWithoutPacks: sold
        .filter((s) => nameOf.has(s.productId))
        .map((s) => ({ id: s.productId, name: nameOf.get(s.productId)!.name, unit: nameOf.get(s.productId)!.unit, qty: r2(Number(s.qty)), revenue: r2(Number(s.revenue)) })),
      days: Math.max(1, Math.round((range.lt.getTime() - range.gte.getTime()) / DAY)),
    };
  }
}
