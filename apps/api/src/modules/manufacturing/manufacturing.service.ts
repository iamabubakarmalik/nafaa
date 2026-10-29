/**
 * Manufacturing for every industry: a recipe (bill of materials) per product
 * made in-house, production runs that turn raw materials into finished goods
 * at a worked-out cost, their reversal, and the production report.
 *
 * Restaurant recipes (kitchen use per dish) and bakery baking plans keep
 * their own flows; this module is the shared one any business can switch on
 * in Settings → Inventory.
 */

import { BadRequestException, Injectable, NotFoundException } from '@nestjs/common';
import { Prisma } from '@prisma/client';
import { PrismaService } from '../../prisma/prisma.service';
import { AuthenticatedUser } from '../auth/interfaces/jwt-payload.interface';
import { ShopScope, assertShopAccess, isServiceProduct, resolveWriteShopId } from '../../common/shop-scope';
import { TenantTimezoneService } from '../../common/helpers/tenant-timezone.service';
import { businessDayKey, safeDayStart } from '../../common/helpers/business-time.helper';
import { LIVE_SALE, reportRange, within } from '../reports/reports/report-range';
import { lineUnitOk, marginPct, r2, r4 } from './manufacturing-cost';
import { badUnitLines, costOf, loadRecipes, produceInTx, reverseInTx, type LoadedRecipe } from './production-engine';
import { ListRecipesDto, ListRunsDto, ProduceDto, ReportQueryDto, ReverseRunDto, SaveRecipeDto } from './dto/manufacturing.dto';

const DAY = 86_400_000;

@Injectable()
export class ManufacturingService {
  constructor(
    private readonly prisma: PrismaService,
    private readonly tz: TenantTimezoneService,
  ) {}

  /* ───────────── helpers ───────────── */

  /** Stock of each product in the branch being viewed, or across all branches. */
  private async stockMap(tenantId: string, scope: ShopScope, productIds: string[]): Promise<Map<string, number>> {
    const ids = [...new Set(productIds)];
    if (!ids.length) return new Map();
    if (scope.shopId) {
      const rows = await this.prisma.shopStock.findMany({
        where: { shopId: scope.shopId, productId: { in: ids }, variantId: null },
        select: { productId: true, stock: true },
      });
      const m = new Map(ids.map((id) => [id, 0]));
      for (const r of rows) m.set(r.productId, Number(r.stock) || 0);
      return m;
    }
    const rows = await this.prisma.product.findMany({ where: { tenantId, id: { in: ids } }, select: { id: true, stock: true } });
    return new Map(rows.map((r) => [r.id, Number(r.stock) || 0]));
  }

  /** A recipe as the pages show it: lines, cost per batch and unit, margins, and what the stock can make. */
  private view(l: LoadedRecipe, stock: Map<string, number>) {
    const r = l.recipe;
    const batch = costOf(l);
    const unitCost = batch.unitCost;
    const p = r.product;
    let canBatches = Number.POSITIVE_INFINITY;
    let limitedBy: string | null = null;
    const lines = r.lines.map((x, i) => {
      const packRate = x.unitId ? l.packRates.get(x.unitId) ?? null : null;
      const per = batch.lines[i]?.baseQty ?? 0;
      const have = stock.get(x.productId) ?? 0;
      const covers = per > 0 ? Math.max(0, have) / per : Number.POSITIVE_INFINITY;
      if (covers < canBatches) { canBatches = covers; limitedBy = x.product.name; }
      return {
        id: x.id, productId: x.productId, name: x.product.name, stockUnit: x.product.unit, isActive: x.product.isActive,
        quantity: x.quantity, unitName: x.unitName, unitId: x.unitId, packRate, notes: x.notes,
        /** Base units per batch, wastage included. */
        baseQty: per,
        unitCost: batch.lines[i]?.unitCost ?? 0,
        lineCost: batch.lines[i]?.total ?? 0,
        stock: r4(have),
        unitOk: lineUnitOk({ unitName: x.unitName, packRate, stockUnit: x.product.unit }),
      };
    });
    const batches = Number.isFinite(canBatches) ? Math.floor(canBatches * 1000) / 1000 : 0;
    return {
      id: r.id, productId: r.productId,
      product: {
        id: p.id, name: p.name, unit: p.unit, sku: p.sku, isActive: p.isActive, image: p.images[0]?.url ?? null, category: p.category?.name ?? null,
        price: p.price, wholesalePrice: p.wholesalePrice, creditPrice: p.creditPrice, costPrice: p.costPrice,
        stock: r4(stock.get(p.id) ?? 0), lowStockAlert: p.lowStockAlert,
      },
      yieldQty: r.yieldQty, wastagePercent: r.wastagePercent, packingCost: r.packingCost, labourCost: r.labourCost, overheadCost: r.overheadCost,
      makeOnSale: r.makeOnSale, isActive: r.isActive, notes: r.notes, updatedAt: r.updatedAt,
      lines,
      batchCost: batch.totalCost, materialCost: batch.materialCost, extraCost: batch.extraCost, unitCost,
      margins: {
        retail: marginPct(p.price, unitCost),
        wholesale: p.wholesalePrice ? marginPct(p.wholesalePrice, unitCost) : null,
        credit: p.creditPrice ? marginPct(p.creditPrice, unitCost) : null,
      },
      canMake: { batches, units: r4(Math.floor(batches * r.yieldQty * 1000) / 1000), limitedBy: lines.length ? limitedBy : null },
      badUnits: badUnitLines(l),
    };
  }

  /* ───────────── recipes ───────────── */

  async listRecipes(user: AuthenticatedUser, scope: ShopScope, q: ListRecipesDto = {}) {
    const search = q.search?.trim();
    const loaded = await loadRecipes(this.prisma, user.tenantId, search ? { product: { name: { contains: search, mode: 'insensitive' } } } : {});
    const stock = await this.stockMap(user.tenantId, scope, loaded.flatMap((l) => [l.recipe.productId, ...l.recipe.lines.map((x) => x.productId)]));
    return loaded.map((l) => this.view(l, stock));
  }

  async getRecipe(user: AuthenticatedUser, scope: ShopScope, productId: string) {
    const product = await this.prisma.product.findFirst({
      where: { id: productId, tenantId: user.tenantId },
      select: { id: true, name: true, unit: true, price: true, wholesalePrice: true, creditPrice: true, costPrice: true, hasVariants: true },
    });
    if (!product) throw new NotFoundException('Product nahi mila');
    const [l] = await loadRecipes(this.prisma, user.tenantId, { productId });
    if (!l) return { product, recipe: null };
    const stock = await this.stockMap(user.tenantId, scope, [productId, ...l.recipe.lines.map((x) => x.productId)]);
    return { product, recipe: this.view(l, stock) };
  }

  async saveRecipe(user: AuthenticatedUser, scope: ShopScope, productId: string, dto: SaveRecipeDto) {
    const product = await this.prisma.product.findFirst({
      where: { id: productId, tenantId: user.tenantId },
      select: { id: true, name: true, hasVariants: true, productType: true, unit: true, stock: true },
    });
    if (!product) throw new NotFoundException('Product nahi mila');
    if (product.hasVariants) throw new BadRequestException('Variants wale product ki Recipe abhi nahi banti — har variant alag product banayein');
    if (isServiceProduct(product)) throw new BadRequestException('Service ki Recipe nahi banti');

    const rawIds = [...new Set(dto.lines.map((l) => l.productId))];
    if (rawIds.includes(productId)) throw new BadRequestException('Product apni hi Recipe me raw item nahi ho sakta');
    const unitIds = [...new Set(dto.lines.map((l) => l.unitId).filter((x): x is string => !!x))];
    const [raws, units, loops] = await Promise.all([
      this.prisma.product.findMany({ where: { tenantId: user.tenantId, id: { in: rawIds } }, select: { id: true, name: true, unit: true, hasVariants: true } }),
      unitIds.length ? this.prisma.productUnit.findMany({ where: { tenantId: user.tenantId, id: { in: unitIds } }, select: { id: true, productId: true, unitName: true, conversionRate: true } }) : [],
      // A raw item that is itself made from this product would loop.
      this.prisma.productionRecipe.findMany({ where: { tenantId: user.tenantId, productId: { in: rawIds }, lines: { some: { productId } } }, select: { product: { select: { name: true } } } }),
    ]);
    if (raws.length !== rawIds.length) throw new NotFoundException('Ek raw item nahi mila');
    if (loops.length) throw new BadRequestException(`${loops[0].product.name} khud is product se banta hai — ulta chakkar nahi ban sakta`);
    const R = new Map(raws.map((x) => [x.id, x]));
    const U = new Map(units.map((x) => [x.id, x]));

    const lines = dto.lines.map((l, i) => {
      const raw = R.get(l.productId)!;
      if (raw.hasVariants) throw new BadRequestException(`${raw.name} ke variants hain — Recipe me bina variant wala raw item lein`);
      const unit = l.unitId ? U.get(l.unitId) : null;
      if (l.unitId && (!unit || unit.productId !== raw.id)) throw new BadRequestException(`${raw.name}: yeh packing is item ki nahi`);
      const unitName = unit?.unitName ?? (l.unitName?.trim() || raw.unit);
      if (!lineUnitOk({ unitName, packRate: unit ? Number(unit.conversionRate) || 1 : null, stockUnit: raw.unit })) {
        throw new BadRequestException(`${raw.name}: "${unitName}" se "${raw.unit}" nahi ban sakta — ${raw.unit} ya us jaisi unit lein`);
      }
      return { productId: raw.id, quantity: r4(l.quantity), unitName, unitId: unit?.id ?? null, sortOrder: i, notes: l.notes?.trim() || null };
    });

    const data = {
      yieldQty: r4(dto.yieldQty), wastagePercent: r2(dto.wastagePercent ?? 0),
      packingCost: r2(dto.packingCost ?? 0), labourCost: r2(dto.labourCost ?? 0), overheadCost: r2(dto.overheadCost ?? 0),
      makeOnSale: !!dto.makeOnSale, isActive: dto.isActive ?? true, notes: dto.notes?.trim() || null,
    };
    await this.prisma.$transaction(async (tx) => {
      const recipe = await tx.productionRecipe.upsert({
        where: { productId },
        create: { tenantId: user.tenantId, productId, createdById: user.id, ...data },
        update: data,
        select: { id: true },
      });
      await tx.productionRecipeLine.deleteMany({ where: { recipeId: recipe.id } });
      await tx.productionRecipeLine.createMany({ data: lines.map((l) => ({ ...l, recipeId: recipe.id })) });
    });

    // An item made when sold has no stock of its own: its cost follows the recipe.
    const saved = await this.getRecipe(user, scope, productId);
    if (data.makeOnSale && saved.recipe && saved.recipe.unitCost > 0 && Number(product.stock) <= 0) {
      await this.prisma.product.update({ where: { id: productId }, data: { costPrice: saved.recipe.unitCost } });
    }
    return saved;
  }

  async deleteRecipe(user: AuthenticatedUser, productId: string) {
    const r = await this.prisma.productionRecipe.findFirst({ where: { tenantId: user.tenantId, productId }, select: { id: true } });
    if (!r) throw new NotFoundException('Recipe nahi mili');
    // Production history keeps its own copy of what was used; the run just loses the link.
    await this.prisma.productionRecipe.delete({ where: { id: r.id } });
    return { ok: true };
  }

  /** Products made when sold, for the counter. Empty while manufacturing is switched off. */
  async makeOnSaleIds(user: AuthenticatedUser): Promise<string[]> {
    const s = await this.prisma.tenantSettings.findUnique({ where: { tenantId: user.tenantId }, select: { manufacturingEnabled: true } });
    if (!s?.manufacturingEnabled) return [];
    const rows = await this.prisma.productionRecipe.findMany({
      where: { tenantId: user.tenantId, makeOnSale: true, isActive: true, lines: { some: {} } },
      select: { productId: true },
    });
    return rows.map((r) => r.productId);
  }

  /* ───────────── production ───────────── */

  private async plan(user: AuthenticatedUser, items: ProduceDto['items']) {
    const ids = [...new Set(items.map((i) => i.productId))];
    if (ids.length !== items.length) throw new BadRequestException('Ek product do dafa list me hai — quantity jor dein');
    const loaded = await loadRecipes(this.prisma, user.tenantId, { productId: { in: ids } });
    const byProduct = new Map(loaded.map((l) => [l.recipe.productId, l]));
    return items.map((it) => {
      const l = byProduct.get(it.productId);
      if (!l) throw new BadRequestException('Is product ki Recipe nahi bani — pehle Recipe banayein');
      if (!l.recipe.isActive) throw new BadRequestException(`${l.recipe.product.name} ki Recipe band hai`);
      const quantity = it.quantity ?? (it.batches ? it.batches * l.recipe.yieldQty : 0);
      if (!(quantity > 0)) throw new BadRequestException(`${l.recipe.product.name}: kitna banana hai likhein`);
      return { item: it, loaded: l, quantity: r4(quantity) };
    });
  }

  /** What a production would take and cost, with shortages against the branch stock. */
  async preview(user: AuthenticatedUser, scope: ShopScope, dto: ProduceDto) {
    const shopId = await resolveWriteShopId(this.prisma, user.tenantId, scope, dto.shopId);
    const plan = await this.plan(user, dto.items);
    const rawIds = plan.flatMap((p) => p.loaded.recipe.lines.map((x) => x.productId));
    const [stock, settings] = await Promise.all([
      this.stockMap(user.tenantId, new ShopScope(shopId, false), rawIds),
      this.prisma.tenantSettings.findUnique({ where: { tenantId: user.tenantId }, select: { allowNegativeStock: true } }),
    ]);
    const need = new Map<string, { productId: string; name: string; unit: string; need: number; cost: number }>();
    const items = plan.map(({ loaded: l, quantity }) => {
      const c = costOf(l, quantity);
      c.lines.forEach((x, i) => {
        const line = l.recipe.lines[i];
        const row = need.get(x.productId) ?? { productId: x.productId, name: line.product.name, unit: line.product.unit, need: 0, cost: 0 };
        row.need = r4(row.need + x.baseQty);
        row.cost = r2(row.cost + x.total);
        need.set(x.productId, row);
      });
      const p = l.recipe.product;
      return {
        productId: p.id, name: p.name, unit: p.unit, quantity, batches: c.batches, yieldQty: l.recipe.yieldQty,
        materialCost: c.materialCost, extraCost: c.extraCost, totalCost: c.totalCost, unitCost: c.unitCost,
        price: p.price, margin: marginPct(p.price, c.unitCost), badUnits: badUnitLines(l),
      };
    });
    const materials = [...need.values()].map((m) => {
      const have = r4(stock.get(m.productId) ?? 0);
      return { ...m, have, short: r4(Math.max(0, m.need - Math.max(have, 0))) };
    });
    const shortCount = materials.filter((m) => m.short > 0).length;
    return {
      shopId, items, materials,
      totalCost: r2(items.reduce((s, i) => s + i.totalCost, 0)),
      shortCount, allowNegative: !!settings?.allowNegativeStock,
      canProduce: !items.some((i) => i.badUnits.length) && (shortCount === 0 || !!settings?.allowNegativeStock),
    };
  }

  async produce(user: AuthenticatedUser, scope: ShopScope, dto: ProduceDto, source: 'MANUAL' | 'AI' = 'MANUAL') {
    const shopId = await resolveWriteShopId(this.prisma, user.tenantId, scope, dto.shopId);
    assertShopAccess(user, shopId, 'Production');
    const plan = await this.plan(user, dto.items);
    const settings = await this.prisma.tenantSettings.findUnique({ where: { tenantId: user.tenantId }, select: { allowNegativeStock: true } });
    const runs = await this.prisma.$transaction(async (tx) => {
      const out = [];
      for (const p of plan) {
        out.push(await produceInTx(tx, {
          tenantId: user.tenantId, userId: user.id, shopId, loaded: p.loaded, quantity: p.quantity,
          allowNegative: !!settings?.allowNegativeStock, source,
          batchNumber: p.item.batchNumber ?? null, expiryDate: p.item.expiryDate ? new Date(p.item.expiryDate) : null, notes: dto.notes ?? null,
        }));
      }
      return out;
    }, { timeout: 30_000 });
    await this.prisma.activityLog.create({
      data: {
        tenantId: user.tenantId, userId: user.id, action: 'PRODUCTION_DONE', entityType: 'ProductionRun', entityId: runs[0]?.runId ?? null,
        description: `Production: ${plan.map((p) => `${p.loaded.recipe.product.name} × ${p.quantity}`).join(', ')}`,
        metadata: { runs: runs.map((r) => r.runNumber), shopId, source },
      },
    }).catch(() => null);
    return {
      shopId,
      runs: runs.map((r, i) => ({ id: r.runId, runNumber: r.runNumber, productId: plan[i].loaded.recipe.productId, name: plan[i].loaded.recipe.product.name, quantity: plan[i].quantity, unitCost: r.cost.unitCost, totalCost: r.cost.totalCost })),
    };
  }

  async reverse(user: AuthenticatedUser, id: string, dto: ReverseRunDto) {
    const run = await this.prisma.productionRun.findFirst({ where: { id, tenantId: user.tenantId }, select: { shopId: true } });
    if (!run) throw new NotFoundException('Production nahi mili');
    assertShopAccess(user, run.shopId, 'Production wapas');
    const done = await this.prisma.$transaction((tx) => reverseInTx(tx, { tenantId: user.tenantId, userId: user.id, runId: id, reason: dto.reason }), { timeout: 30_000 });
    await this.prisma.activityLog.create({
      data: {
        tenantId: user.tenantId, userId: user.id, action: 'PRODUCTION_REVERSED', entityType: 'ProductionRun', entityId: id,
        description: `Production ${done.runNumber} wapas ki${dto.reason?.trim() ? ` — ${dto.reason.trim()}` : ''}`,
      },
    }).catch(() => null);
    return this.getRun(user, id);
  }

  /* ───────────── history ───────────── */

  private async names(ids: Array<string | null | undefined>, model: 'user' | 'shop'): Promise<Map<string, string>> {
    const list = [...new Set(ids.filter((x): x is string => !!x))];
    if (!list.length) return new Map();
    if (model === 'user') {
      const rows = await this.prisma.user.findMany({ where: { id: { in: list } }, select: { id: true, fullName: true, email: true } });
      return new Map(rows.map((u) => [u.id, u.fullName || u.email]));
    }
    const rows = await this.prisma.shop.findMany({ where: { id: { in: list } }, select: { id: true, name: true } });
    return new Map(rows.map((s) => [s.id, s.name]));
  }

  async listRuns(user: AuthenticatedUser, scope: ShopScope, q: ListRunsDto = {}) {
    const rr = await reportRange(this.tz, user.tenantId, { from: q.from ?? 'all', to: q.to });
    const page = q.page ?? 1;
    const limit = q.limit ?? 30;
    const search = q.search?.trim();
    const where: Prisma.ProductionRunWhereInput = {
      tenantId: user.tenantId, ...scope.where, createdAt: within(rr),
      ...(q.productId && { productId: q.productId }),
      ...(q.status && q.status !== 'all' && { status: q.status }),
      ...(q.source && q.source !== 'all' && { source: q.source }),
      ...(search && { OR: [{ runNumber: { contains: search, mode: 'insensitive' } }, { product: { name: { contains: search, mode: 'insensitive' } } }, { reference: { contains: search, mode: 'insensitive' } }] }),
    };
    const [rows, total, sums] = await Promise.all([
      this.prisma.productionRun.findMany({
        where, orderBy: { createdAt: 'desc' }, skip: (page - 1) * limit, take: limit,
        include: { product: { select: { name: true, unit: true } }, _count: { select: { lines: true } } },
      }),
      this.prisma.productionRun.count({ where }),
      this.prisma.productionRun.aggregate({ where: { ...where, status: 'DONE' }, _sum: { totalCost: true, quantity: true }, _count: { _all: true } }),
    ]);
    const [users, shops] = await Promise.all([this.names(rows.map((r) => r.createdById), 'user'), this.names(rows.map((r) => r.shopId), 'shop')]);
    return {
      items: rows.map((r) => ({
        id: r.id, runNumber: r.runNumber, productId: r.productId, name: r.product.name, unit: r.product.unit,
        quantity: r.quantity, batches: r.batches, unitCost: r.unitCost, totalCost: r.totalCost, materialCost: r.materialCost, extraCost: r.extraCost,
        status: r.status, source: r.source, reference: r.reference, batchNumber: r.batchNumber, expiryDate: r.expiryDate,
        lines: r._count.lines, createdAt: r.createdAt, createdBy: r.createdById ? users.get(r.createdById) ?? null : null,
        shop: shops.get(r.shopId) ?? null, reversedAt: r.reversedAt,
      })),
      total, page, limit,
      totals: { runs: sums._count._all, totalCost: r2(Number(sums._sum.totalCost ?? 0)) },
    };
  }

  async getRun(user: AuthenticatedUser, id: string) {
    const r = await this.prisma.productionRun.findFirst({
      where: { id, tenantId: user.tenantId },
      include: {
        product: { select: { name: true, unit: true, price: true } },
        lines: { include: { product: { select: { name: true, unit: true } } } },
      },
    });
    if (!r) throw new NotFoundException('Production nahi mili');
    const [users, shops] = await Promise.all([this.names([r.createdById, r.reversedById], 'user'), this.names([r.shopId], 'shop')]);
    return {
      id: r.id, runNumber: r.runNumber, productId: r.productId, name: r.product.name, unit: r.product.unit, price: r.product.price,
      quantity: r.quantity, batches: r.batches, materialCost: r.materialCost, extraCost: r.extraCost, totalCost: r.totalCost, unitCost: r.unitCost,
      wastagePercent: r.wastagePercent, margin: marginPct(r.product.price, r.unitCost),
      status: r.status, source: r.source, reference: r.reference, notes: r.notes, batchNumber: r.batchNumber, expiryDate: r.expiryDate,
      createdAt: r.createdAt, createdBy: r.createdById ? users.get(r.createdById) ?? null : null, shop: shops.get(r.shopId) ?? null,
      reversedAt: r.reversedAt, reversedBy: r.reversedById ? users.get(r.reversedById) ?? null : null, reverseReason: r.reverseReason,
      lines: r.lines.map((l) => ({ productId: l.productId, name: l.product.name, unit: l.product.unit, quantity: l.quantity, unitCost: l.unitCost, totalCost: l.totalCost })),
    };
  }

  /* ───────────── dashboard and report ───────────── */

  /** Today's production, the recipes and the raw materials running short. */
  async summary(user: AuthenticatedUser, scope: ShopScope) {
    const { tz, dayStartHour } = await this.tz.clock(user.tenantId);
    const today = businessDayKey(new Date(), tz, safeDayStart(dayStartHour));
    const rr = await reportRange(this.tz, user.tenantId, { from: today, to: today });
    const [recipes, todayRuns] = await Promise.all([
      this.listRecipes(user, scope),
      this.prisma.productionRun.findMany({
        where: { tenantId: user.tenantId, ...scope.where, status: 'DONE', createdAt: within(rr) },
        select: { productId: true, quantity: true, totalCost: true, source: true, product: { select: { name: true, unit: true } } },
      }),
    ]);
    const made = new Map<string, { productId: string; name: string; unit: string; quantity: number; totalCost: number; runs: number }>();
    for (const r of todayRuns) {
      const m = made.get(r.productId) ?? { productId: r.productId, name: r.product.name, unit: r.product.unit, quantity: 0, totalCost: 0, runs: 0 };
      m.quantity = r4(m.quantity + r.quantity); m.totalCost = r2(m.totalCost + r.totalCost); m.runs++;
      made.set(r.productId, m);
    }
    // Raw materials of active recipes that are low or cannot cover one batch.
    const low = new Map<string, { productId: string; name: string; unit: string; stock: number; perBatch: number; usedIn: string[] }>();
    for (const rec of recipes.filter((x) => x.isActive)) {
      for (const l of rec.lines) {
        const row = low.get(l.productId) ?? { productId: l.productId, name: l.name, unit: l.stockUnit, stock: l.stock, perBatch: 0, usedIn: [] as string[] };
        row.perBatch = Math.max(row.perBatch, l.baseQty);
        row.usedIn.push(rec.product.name);
        low.set(l.productId, row);
      }
    }
    const lowRaw = [...low.values()].filter((x) => x.stock < x.perBatch).sort((a, b) => a.stock / (a.perBatch || 1) - b.stock / (b.perBatch || 1));
    return {
      today: { runs: todayRuns.length, quantity: r4(todayRuns.reduce((s, r) => s + r.quantity, 0)), totalCost: r2(todayRuns.reduce((s, r) => s + r.totalCost, 0)), items: [...made.values()] },
      recipes: { total: recipes.length, active: recipes.filter((r) => r.isActive).length, makeOnSale: recipes.filter((r) => r.makeOnSale).length },
      lowRaw,
      top: recipes.slice(0, 8),
    };
  }

  /**
   * Production report for a period: what was made, raw materials used, cost
   * per unit day by day, wastage, and how the made items sold (at the cost
   * set when they were made).
   */
  async report(user: AuthenticatedUser, scope: ShopScope, q: ReportQueryDto = {}) {
    const rr = await reportRange(this.tz, user.tenantId, { from: q.from, to: q.to });
    const where: Prisma.ProductionRunWhereInput = { tenantId: user.tenantId, ...scope.where, status: 'DONE', createdAt: within(rr) };
    const runs = await this.prisma.productionRun.findMany({
      where, orderBy: { createdAt: 'asc' },
      select: {
        id: true, productId: true, quantity: true, materialCost: true, extraCost: true, totalCost: true, unitCost: true, wastagePercent: true,
        source: true, createdAt: true, product: { select: { name: true, unit: true } },
      },
    });
    const runIds = runs.map((r) => r.id);
    const used = runIds.length
      ? await this.prisma.productionRunLine.groupBy({ by: ['productId'], where: { runId: { in: runIds } }, _sum: { quantity: true, totalCost: true } })
      : [];
    const rawNames = await this.prisma.product.findMany({ where: { id: { in: used.map((u) => u.productId) } }, select: { id: true, name: true, unit: true } });
    const RN = new Map(rawNames.map((x) => [x.id, x]));

    const byProduct = new Map<string, { productId: string; name: string; unit: string; quantity: number; totalCost: number; runs: number; wastageCost: number; madeOnSale: number }>();
    const days = new Map<string, { day: string; quantity: number; totalCost: number }>();
    const { tz, dayStartHour } = rr;
    let wastageCost = 0;
    for (const r of runs) {
      const w = Number(r.wastagePercent) || 0;
      const waste = w > 0 ? r.materialCost * (w / (100 + w)) : 0;
      wastageCost += waste;
      const p = byProduct.get(r.productId) ?? { productId: r.productId, name: r.product.name, unit: r.product.unit, quantity: 0, totalCost: 0, runs: 0, wastageCost: 0, madeOnSale: 0 };
      p.quantity = r4(p.quantity + r.quantity); p.totalCost = r2(p.totalCost + r.totalCost); p.runs++; p.wastageCost = r2(p.wastageCost + waste);
      if (r.source === 'SALE') p.madeOnSale = r4(p.madeOnSale + r.quantity);
      byProduct.set(r.productId, p);
      const key = businessDayKey(r.createdAt, tz, dayStartHour);
      const d = days.get(key) ?? { day: key, quantity: 0, totalCost: 0 };
      d.quantity = r4(d.quantity + r.quantity); d.totalCost = r2(d.totalCost + r.totalCost);
      days.set(key, d);
    }
    // Cost per unit over time for each product (one point per business day).
    const trend = new Map<string, Map<string, { q: number; c: number }>>();
    for (const r of runs) {
      const key = businessDayKey(r.createdAt, tz, dayStartHour);
      const m = trend.get(r.productId) ?? new Map();
      const pt = m.get(key) ?? { q: 0, c: 0 };
      pt.q += r.quantity; pt.c += r.totalCost;
      m.set(key, pt);
      trend.set(r.productId, m);
    }

    // How the made items sold in the period, at the cost on each bill line.
    const productIds = [...byProduct.keys()];
    const sold = productIds.length ? await this.prisma.saleItem.groupBy({
      by: ['productId'],
      where: {
        productId: { in: productIds },
        sale: { tenantId: user.tenantId, ...scope.where, status: { in: [...LIVE_SALE] }, createdAt: within(rr) },
      },
      _sum: { quantity: true, total: true },
    }) : [];
    const soldCost = productIds.length ? await this.prisma.$queryRaw<Array<{ productId: string; cost: number }>>`
      SELECT si."productId" AS "productId", COALESCE(SUM(si."costPrice" * si."quantity"), 0)::float AS cost
        FROM "SaleItem" si JOIN "Sale" s ON s."id" = si."saleId"
       WHERE si."productId" IN (${Prisma.join(productIds)})
         AND s."tenantId" = ${user.tenantId}
         ${scope.shopId ? Prisma.sql`AND s."shopId" = ${scope.shopId}` : Prisma.empty}
         AND s."status"::text IN ('COMPLETED', 'PARTIALLY_RETURNED', 'FULLY_RETURNED')
         ${rr.gte ? Prisma.sql`AND s."createdAt" >= ${rr.gte}` : Prisma.empty}
         AND s."createdAt" < ${rr.lt}
       GROUP BY si."productId"` : [];
    const SC = new Map(soldCost.map((x) => [x.productId, Number(x.cost) || 0]));

    const totalCost = r2(runs.reduce((s, r) => s + r.totalCost, 0));
    return {
      from: rr.fromKey, to: rr.toKey,
      totals: {
        runs: runs.length, quantity: r4(runs.reduce((s, r) => s + r.quantity, 0)), totalCost,
        materialCost: r2(runs.reduce((s, r) => s + r.materialCost, 0)), extraCost: r2(runs.reduce((s, r) => s + r.extraCost, 0)),
        wastageCost: r2(wastageCost),
      },
      products: [...byProduct.values()].map((p) => ({ ...p, avgUnitCost: p.quantity > 0 ? r4(p.totalCost / p.quantity) : 0 })).sort((a, b) => b.totalCost - a.totalCost),
      materials: used.map((u) => ({
        productId: u.productId, name: RN.get(u.productId)?.name ?? 'Item', unit: RN.get(u.productId)?.unit ?? '',
        quantity: r4(Number(u._sum.quantity ?? 0)), totalCost: r2(Number(u._sum.totalCost ?? 0)),
      })).sort((a, b) => b.totalCost - a.totalCost),
      days: [...days.values()].sort((a, b) => a.day.localeCompare(b.day)),
      costTrend: [...trend.entries()].map(([productId, m]) => ({
        productId, name: byProduct.get(productId)?.name ?? '',
        points: [...m.entries()].sort((a, b) => a[0].localeCompare(b[0])).map(([day, v]) => ({ day, unitCost: v.q > 0 ? r4(v.c / v.q) : 0 })),
      })),
      sales: sold.map((s) => {
        const revenue = r2(Number(s._sum.total ?? 0));
        const cost = r2(SC.get(s.productId!) ?? 0);
        return { productId: s.productId, name: byProduct.get(s.productId!)?.name ?? '', quantity: r4(Number(s._sum.quantity ?? 0)), revenue, cost, profit: r2(revenue - cost), margin: revenue > 0 ? Math.round(((revenue - cost) / revenue) * 1000) / 10 : null };
      }).sort((a, b) => b.revenue - a.revenue),
      spanDays: rr.gte ? Math.round((rr.lt.getTime() - rr.gte.getTime()) / DAY) : null,
    };
  }

}
