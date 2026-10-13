/**
 * Baking plans: what to bake on a business day (suggested from orders due
 * and the average sales of that weekday), the oven steps, and "made" with
 * its side effects — raw materials used by the recipe, finished goods into
 * branch stock and a freshness batch — all in one transaction. Reads follow
 * the branch being viewed and the shop's business day.
 */

import { BadRequestException, ConflictException, Injectable, NotFoundException } from '@nestjs/common';
import { BakeryCategory, Prisma, ProductionStatus } from '@prisma/client';
import { PrismaService } from '../../../prisma/prisma.service';
import { AuthenticatedUser } from '../../../modules/auth/interfaces/jwt-payload.interface';
import { TenantTimezoneService } from '../../../common/helpers/tenant-timezone.service';
import { ShopScope, applyStockDelta, assertShopAccess, resolveWriteShopId } from '../../../common/shop-scope';
import { CLOSED_ORDER, DAY_MS, SOLD_STATUSES, isDayKey, r2, r3, recipeOf, shopClock, syncBatchesWithStock, withNextNumber, writeShopId } from '../bakery-common';

export interface PlanItemInput {
  productId?: string;
  productName?: string;
  category?: string;
  cakeOrderId?: string;
  plannedQty: number;
  bakerId?: string;
  bakerName?: string;
  batchNumber?: string;
  ovenNumber?: string;
  notes?: string;
}

export interface CompleteItemInput {
  producedQty: number;
  failedQty?: number;
  qualityGrade?: string;
  qualityCheckBy?: string;
  qualityNotes?: string;
  /** Take the recipe's raw materials out of the store. */
  useIngredients?: boolean;
  /** Put the good pieces into the branch stock. */
  addToStock?: boolean;
  /** Hours the pieces stay fresh; a freshness batch is made when given. */
  freshHours?: number;
}

const WORKING: ProductionStatus[] = ['PLANNED', 'IN_PROGRESS', 'BAKING', 'COOLING', 'DECORATING', 'QUALITY_CHECK', 'ON_HOLD'];
/** Bulk-order steps where the goods still have to be made. */
const BULK_TO_MAKE = ['CONFIRMED', 'DEPOSIT_PAID', 'IN_PRODUCTION', 'BAKING', 'DECORATING', 'QUALITY_CHECK'] as const;
const COUNTED_CAKE = { notIn: [...CLOSED_ORDER, 'DRAFT', 'QUOTED'] as never[] };

const text = (v: unknown) => (typeof v === 'string' && v.trim() ? v.trim() : null);
const wholeQty = (v: unknown, label: string) => {
  const n = Math.round(Number(v));
  if (!Number.isFinite(n) || n <= 0) throw new BadRequestException(`${label} — quantity likhein`);
  return n;
};

@Injectable()
export class ProductionService {
  constructor(
    private readonly prisma: PrismaService,
    private readonly tz: TenantTimezoneService,
  ) {}

  /* ───────────────────────── plans ───────────────────────── */

  async createPlan(user: AuthenticatedUser, scope: ShopScope, dto: { planDate?: string; shift?: string; headBakerId?: string; notes?: string; shopId?: string; items?: PlanItemInput[] }) {
    if (!Array.isArray(dto?.items) || !dto.items.length) throw new BadRequestException('Kam se kam ek cheez daalein');
    const clock = await shopClock(this.tz, user.tenantId);
    const planDate = isDayKey(dto.planDate) ? clock.dayStart(dto.planDate) : dto.planDate && !Number.isNaN(new Date(dto.planDate).getTime()) ? new Date(dto.planDate) : new Date();
    const shopId = await writeShopId(this.prisma, user.tenantId, scope, dto.shopId);
    const items = await this.cleanItems(user.tenantId, dto.items);

    return withNextNumber(
      async (prefix) => (await this.prisma.bakeryProductionPlan.findFirst({
        where: { tenantId: user.tenantId, planNumber: { startsWith: prefix } }, orderBy: { planNumber: 'desc' }, select: { planNumber: true },
      }))?.planNumber,
      `PROD-${clock.year()}-`, 4,
      (planNumber) => this.prisma.bakeryProductionPlan.create({
        data: {
          tenantId: user.tenantId,
          shopId,
          planNumber,
          planDate,
          shift: text(dto.shift),
          headBakerId: text(dto.headBakerId),
          notes: text(dto.notes),
          totalItems: items.reduce((s, it) => s + it.plannedQty, 0),
          createdById: user.id,
          items: { create: items.map((it, idx) => ({ ...it, displayOrder: idx })) },
        },
        include: { items: { orderBy: { displayOrder: 'asc' } } },
      }),
    );
  }

  async listPlans(user: AuthenticatedUser, scope: ShopScope, params: { status?: string; from?: string; to?: string }) {
    const clock = await shopClock(this.tz, user.tenantId);
    const range = clock.range(params.from, params.to)
      ?? (params.from || params.to ? { ...(params.from && { gte: new Date(params.from) }), ...(params.to && { lte: new Date(params.to) }) } : undefined);
    return this.prisma.bakeryProductionPlan.findMany({
      where: {
        tenantId: user.tenantId,
        ...scope.whereLoose,
        ...(params.status && { status: params.status as ProductionStatus }),
        ...(range && { planDate: range }),
      },
      include: { items: { orderBy: { displayOrder: 'asc' } } },
      orderBy: { planDate: 'desc' },
      take: 200,
    });
  }

  /** Plans of the current business day in the shop's own timezone. */
  async today(user: AuthenticatedUser, scope: ShopScope) {
    const day = (await shopClock(this.tz, user.tenantId)).today();
    return this.prisma.bakeryProductionPlan.findMany({
      where: { tenantId: user.tenantId, ...scope.whereLoose, planDate: { gte: day.gte, lt: day.lt } },
      include: { items: { orderBy: { displayOrder: 'asc' } } },
      orderBy: { createdAt: 'desc' },
    });
  }

  async getPlan(user: AuthenticatedUser, id: string) {
    return this.mustPlan(user, id);
  }

  async updatePlan(user: AuthenticatedUser, id: string, dto: { planDate?: string; shift?: string; headBakerId?: string; notes?: string }) {
    const plan = await this.mustPlan(user, id);
    const clock = await shopClock(this.tz, user.tenantId);
    const planDate = dto?.planDate === undefined ? undefined
      : isDayKey(dto.planDate) ? clock.dayStart(dto.planDate)
        : Number.isNaN(new Date(dto.planDate).getTime()) ? undefined : new Date(dto.planDate);
    await this.prisma.bakeryProductionPlan.updateMany({
      where: { id: plan.id, tenantId: user.tenantId },
      data: {
        planDate,
        ...(dto?.shift !== undefined && { shift: text(dto.shift) }),
        ...(dto?.headBakerId !== undefined && { headBakerId: text(dto.headBakerId) }),
        ...(dto?.notes !== undefined && { notes: text(dto.notes) }),
      },
    });
    return this.mustPlan(user, id);
  }

  /** Adds lines to a plan that is not finished yet. */
  async addItems(user: AuthenticatedUser, planId: string, items: PlanItemInput[]) {
    const plan = await this.mustPlan(user, planId);
    if (plan.status === 'COMPLETED') throw new BadRequestException('Mukammal plan me cheez nahi daal sakte — naya plan banayein');
    if (!Array.isArray(items) || !items.length) throw new BadRequestException('Kam se kam ek cheez daalein');
    const clean = await this.cleanItems(user.tenantId, items);
    const start = plan.items.length;
    await this.prisma.$transaction([
      this.prisma.bakeryProductionItem.createMany({ data: clean.map((it, i) => ({ ...it, planId: plan.id, displayOrder: start + i })) }),
      this.prisma.bakeryProductionPlan.update({ where: { id: plan.id }, data: { totalItems: { increment: clean.reduce((s, it) => s + it.plannedQty, 0) } } }),
    ]);
    return this.mustPlan(user, planId);
  }

  /** Removes a line that was not started yet. */
  async removeItem(user: AuthenticatedUser, itemId: string) {
    const item = await this.mustItem(user, itemId);
    if (item.status !== 'PLANNED') throw new BadRequestException('Jo cheez oven me ja chuki ya ban chuki, woh plan se nahi hat sakti');
    await this.prisma.$transaction([
      this.prisma.bakeryProductionItem.deleteMany({ where: { id: item.id, status: 'PLANNED' } }),
      this.prisma.bakeryProductionPlan.update({ where: { id: item.planId }, data: { totalItems: { decrement: item.plannedQty } } }),
    ]);
    return this.mustPlan(user, item.planId);
  }

  async startPlan(user: AuthenticatedUser, id: string) {
    const plan = await this.mustPlan(user, id);
    if (plan.status !== 'PLANNED' && plan.status !== 'ON_HOLD') return plan;
    await this.prisma.bakeryProductionPlan.updateMany({
      where: { id, tenantId: user.tenantId, status: plan.status },
      data: { status: 'IN_PROGRESS', startedAt: plan.startedAt ?? new Date() },
    });
    return this.mustPlan(user, id);
  }

  async completePlan(user: AuthenticatedUser, id: string) {
    const plan = await this.mustPlan(user, id);
    if (plan.status === 'COMPLETED') return plan;
    await this.prisma.bakeryProductionPlan.updateMany({
      where: { id, tenantId: user.tenantId },
      data: {
        status: 'COMPLETED',
        completedAt: new Date(),
        completedItems: plan.items.filter((it) => it.status === 'COMPLETED').length,
        failedItems: plan.items.reduce((s, it) => s + it.failedQty, 0),
        totalCost: r2(plan.items.reduce((s, it) => s + it.totalCost, 0)),
      },
    });
    return this.mustPlan(user, id);
  }

  /* ───────────────────────── items ───────────────────────── */

  async updateItem(user: AuthenticatedUser, itemId: string, dto: Partial<PlanItemInput> & { status?: string }) {
    const item = await this.mustItem(user, itemId);
    const data: Prisma.BakeryProductionItemUpdateManyMutationInput = {};
    if (dto?.plannedQty !== undefined) {
      if (item.status === 'COMPLETED') throw new BadRequestException('Ban chuki cheez ki quantity nahi badalti');
      data.plannedQty = wholeQty(dto.plannedQty, item.productName);
    }
    for (const k of ['bakerId', 'bakerName', 'batchNumber', 'ovenNumber', 'notes'] as const) {
      if (dto?.[k] !== undefined) data[k] = text(dto[k]);
    }
    if (dto?.status === 'ON_HOLD' || (dto?.status === 'PLANNED' && item.status === 'ON_HOLD')) data.status = dto.status as ProductionStatus;
    await this.prisma.bakeryProductionItem.updateMany({ where: { id: item.id }, data });
    if (data.plannedQty !== undefined) {
      await this.prisma.bakeryProductionPlan.update({ where: { id: item.planId }, data: { totalItems: { increment: Number(data.plannedQty) - item.plannedQty } } });
    }
    return this.mustItem(user, itemId);
  }

  async startItemBaking(user: AuthenticatedUser, itemId: string, bakingTempC?: number, ovenNumber?: string) {
    const item = await this.mustItem(user, itemId);
    if (item.status === 'COMPLETED') throw new BadRequestException('Yeh cheez pehle hi ban chuki');
    await this.prisma.$transaction([
      this.prisma.bakeryProductionItem.updateMany({
        where: { id: item.id, status: { not: 'COMPLETED' } },
        data: {
          status: 'BAKING',
          bakingStartTime: new Date(),
          bakingTempC: bakingTempC != null && Number.isFinite(Number(bakingTempC)) ? Number(bakingTempC) : null,
          ovenNumber: text(ovenNumber) ?? item.ovenNumber,
        },
      }),
      this.prisma.bakeryProductionPlan.updateMany({ where: { id: item.planId, status: 'PLANNED' }, data: { status: 'IN_PROGRESS', startedAt: new Date() } }),
    ]);
    return this.mustItem(user, itemId);
  }

  /**
   * Records a finished line. The line is claimed first so a second click
   * cannot repeat the stock moves; everything else happens in the same
   * transaction and is undone together if any step fails.
   */
  async completeItem(user: AuthenticatedUser, scope: ShopScope, itemId: string, dto: CompleteItemInput) {
    const item = await this.mustItem(user, itemId);
    if (item.status === 'COMPLETED') throw new ConflictException('Yeh cheez pehle hi "ban gayi" darj ho chuki');
    const produced = Math.round(Number(dto?.producedQty));
    const failed = Math.max(Math.round(Number(dto?.failedQty) || 0), 0);
    if (!Number.isFinite(produced) || produced < 0) throw new BadRequestException('Kitne bane — quantity likhein');
    if (produced + failed <= 0) throw new BadRequestException('Kitne bane ya kitne kharab hue — kuch to likhein');

    const plan = item.plan;
    const product = item.productId
      ? await this.prisma.product.findFirst({ where: { id: item.productId, tenantId: user.tenantId }, select: { id: true, name: true, costPrice: true, hasVariants: true } })
      : null;
    const profile = product && dto.useIngredients
      ? await this.prisma.bakeryProductProfile.findFirst({ where: { productId: product.id, tenantId: user.tenantId }, select: { ingredients: true } })
      : null;
    const recipe = recipeOf(profile?.ingredients);
    const warnings: string[] = [];
    if (dto.useIngredients && !recipe) warnings.push('Is cheez ki recipe nahi bani — saamaan stock se nahi ghataya');
    if (dto.addToStock && product?.hasVariants) warnings.push('Is cheez ki qismein hain — stock khud nahi daala, Stock adjustment se daalein');

    const shopId = dto.addToStock && product && !product.hasVariants && produced > 0
      ? await resolveWriteShopId(this.prisma, user.tenantId, scope, plan.shopId)
      : null;
    if (shopId) assertShopAccess(user, shopId, 'Stock daalna');

    const end = new Date();
    const result = await this.prisma.$transaction(async (tx) => {
      const claimed = await tx.bakeryProductionItem.updateMany({ where: { id: item.id, status: { not: 'COMPLETED' } }, data: { status: 'COMPLETED' } });
      if (!claimed.count) throw new ConflictException('Yeh cheez pehle hi "ban gayi" darj ho chuki');

      let ingredientCost = 0;
      const used: Array<{ ingredientId: string; name: string; qty: number; unit: string; cost: number; short: number }> = [];
      if (recipe) {
        const factor = (produced + failed) / recipe.yieldQty;
        const stock = await tx.bakeryIngredient.findMany({
          where: { tenantId: user.tenantId, id: { in: recipe.lines.map((l) => l.ingredientId) } },
          select: { id: true, name: true, unit: true, currentStock: true, costPerUnit: true },
        });
        const byId = new Map(stock.map((s) => [s.id, s]));
        for (const line of recipe.lines) {
          const ing = byId.get(line.ingredientId);
          if (!ing) { warnings.push(`${line.name} ab saamaan me nahi — us ka hisaab nahi hua`); continue; }
          const qty = r3(line.qty * factor);
          const take = Math.min(qty, Math.max(ing.currentStock, 0));
          const cost = r2(qty * ing.costPerUnit);
          await tx.bakeryIngredient.update({ where: { id: ing.id }, data: { currentStock: { decrement: take }, totalConsumed: { increment: qty } } });
          await tx.bakeryIngredientTransaction.create({
            data: {
              tenantId: user.tenantId, ingredientId: ing.id, transactionType: 'CONSUMPTION', quantity: qty, unit: ing.unit,
              costPerUnit: ing.costPerUnit, totalCost: cost, productionItemId: item.id, batchNumber: item.batchNumber ?? plan.planNumber,
              notes: `Baking: ${item.productName} (${plan.planNumber})${take < qty ? ` — stock ${r3(qty - take)} ${ing.unit} kam tha` : ''}`,
              performedById: user.id,
            },
          });
          if (take < qty) warnings.push(`${ing.name} ${r3(qty - take)} ${ing.unit} kam tha — stock 0 ho gaya`);
          ingredientCost += cost;
          used.push({ ingredientId: ing.id, name: ing.name, qty, unit: ing.unit, cost, short: r3(qty - take) });
        }
      }

      // Cost of one good piece: the raw material used (failed pieces included) over what came out good.
      const unitCost = recipe && produced > 0 ? r2(ingredientCost / produced) : 0;
      const before = product && unitCost > 0
        ? await tx.product.findUnique({ where: { id: product.id }, select: { stock: true, costPrice: true } })
        : null;
      if (shopId && product) {
        await applyStockDelta({
          tx, tenantId: user.tenantId, shopId, productId: product.id, delta: produced,
          movementType: 'ADJUSTMENT_IN', reference: plan.planNumber, note: `Baking: ${item.productName}`,
          userId: user.id, unitCost: unitCost || product.costPrice,
        });
      }
      // Baked goods carry their recipe cost, so bills and profit see what a piece cost to make
      // (weighted with pieces already in stock). Without this a baked item sold at cost 0.
      if (product && before && (shopId || !(Number(before.costPrice) > 0))) {
        const oldQty = shopId ? Math.max(Number(before.stock) || 0, 0) : 0;
        const oldCost = Number(before.costPrice) || 0;
        const avg = oldQty > 0 && oldCost > 0 ? r2((oldQty * oldCost + produced * unitCost) / (oldQty + produced)) : unitCost;
        await tx.product.update({ where: { id: product.id }, data: { costPrice: avg } });
      }

      const hours = Number(dto.freshHours);
      if (item.productId && produced > 0 && Number.isFinite(hours) && hours > 0) {
        const best = new Date(end.getTime() + hours * 3_600_000);
        await tx.bakeryFreshnessLog.create({
          data: {
            tenantId: user.tenantId, shopId: plan.shopId ?? scope.shopId ?? null, productId: item.productId, productName: item.productName,
            batchNumber: item.batchNumber ?? plan.planNumber, productionDate: end, bestBefore: best, expiryDate: best,
            initialQty: produced, currentQty: produced,
          },
        });
      }

      await tx.bakeryProductionItem.update({
        where: { id: item.id },
        data: {
          producedQty: produced,
          failedQty: failed,
          bakingEndTime: end,
          bakingDurationMin: item.bakingStartTime ? Math.round((end.getTime() - item.bakingStartTime.getTime()) / 60000) : null,
          qualityGrade: text(dto.qualityGrade),
          qualityCheckBy: text(dto.qualityCheckBy),
          qualityNotes: text(dto.qualityNotes),
          ...(recipe && { totalCost: r2(ingredientCost), ingredientsUsed: used as unknown as Prisma.InputJsonValue }),
        },
      });
      await tx.bakeryProductionPlan.updateMany({ where: { id: plan.id, status: 'PLANNED' }, data: { status: 'IN_PROGRESS', startedAt: new Date() } });
      return tx.bakeryProductionItem.findUniqueOrThrow({ where: { id: item.id } });
    });

    return { ...result, warnings, stockAdded: shopId ? produced : 0 };
  }

  /* ───────────────────────── what to bake ───────────────────────── */

  /**
   * What to bake on a business day: orders due that day, the expected
   * counter sale (same weekday of the last four weeks, blended with the
   * recent daily average, trimmed when much of it went to waste), minus
   * fresh stock still good and what is already planned.
   */
  async suggest(user: AuthenticatedUser, scope: ShopScope, date?: string, days = 14) {
    // Fresh stock still good is read from batches; take counter sales off them first.
    await syncBatchesWithStock(this.prisma, user.tenantId, scope.whereLoose);
    const clock = await shopClock(this.tz, user.tenantId);
    const key = isDayKey(date) ? date : clock.keyOf(new Date());
    const span = Math.min(Math.max(Math.round(Number(days) || 14), 7), 60);
    const dayStart = clock.dayStart(key);
    const day = { gte: dayStart, lt: new Date(dayStart.getTime() + DAY_MS) };
    const histFrom = new Date(dayStart.getTime() - span * DAY_MS);
    const saleWhere = (gte: Date, lt: Date): Prisma.SaleItemWhereInput => ({
      productId: { not: null },
      sale: { tenantId: user.tenantId, status: { in: [...SOLD_STATUSES] }, soldAt: { gte, lt }, ...scope.where },
    });
    const weeks = [1, 2, 3, 4].map((w) => ({ gte: new Date(dayStart.getTime() - 7 * w * DAY_MS), lt: new Date(dayStart.getTime() - (7 * w - 1) * DAY_MS) }));

    const [recent, ...weekly] = await Promise.all([
      this.prisma.saleItem.groupBy({ by: ['productId'], where: saleWhere(histFrom, dayStart), _sum: { quantity: true } }),
      ...weeks.map((w) => this.prisma.saleItem.groupBy({ by: ['productId'], where: saleWhere(w.gte, w.lt), _sum: { quantity: true } })),
    ]);
    const [cakes, bulks, planned, fresh, wasteLogs, madeProducts, recipes, history] = await Promise.all([
      this.prisma.bakeryCakeOrder.findMany({
        where: { tenantId: user.tenantId, ...scope.whereLoose, status: COUNTED_CAKE, neededBy: day },
        select: { id: true, orderNumber: true, customerName: true, productId: true, productName: true, size: true, flavor: true, shape: true, neededBy: true, messageOnCake: true, status: true },
        orderBy: { neededBy: 'asc' },
      }),
      this.prisma.bakeryBulkOrder.findMany({
        where: { tenantId: user.tenantId, status: { in: [...BULK_TO_MAKE] }, eventDate: day },
        select: { id: true, orderNumber: true, organizationName: true, items: true, eventDate: true },
      }),
      this.prisma.bakeryProductionItem.findMany({
        where: { plan: { tenantId: user.tenantId, ...scope.whereLoose, planDate: day }, status: { not: 'FAILED' } },
        select: { productId: true, plannedQty: true, producedQty: true, status: true },
      }),
      this.prisma.bakeryFreshnessLog.findMany({
        where: { tenantId: user.tenantId, ...scope.whereLoose, status: { in: ['FRESH', 'DAY_OLD', 'NEAR_EXPIRY'] }, currentQty: { gt: 0 }, bestBefore: { gte: new Date(dayStart.getTime() + 12 * 3_600_000) } },
        select: { productId: true, currentQty: true },
      }),
      this.prisma.bakeryFreshnessLog.groupBy({
        by: ['productId'],
        where: { tenantId: user.tenantId, ...scope.whereLoose, productionDate: { gte: histFrom, lt: dayStart } },
        _sum: { initialQty: true, wastedQty: true },
      }),
      this.prisma.product.findMany({ where: { tenantId: user.tenantId, isActive: true, productType: 'MADE' }, select: { id: true } }),
      this.prisma.bakeryProductProfile.findMany({ where: { tenantId: user.tenantId, ingredients: { not: Prisma.DbNull } }, select: { productId: true, ingredients: true } }),
      this.prisma.bakeryProductionItem.findMany({
        where: { plan: { tenantId: user.tenantId, ...scope.whereLoose, planDate: { gte: new Date(dayStart.getTime() - 30 * DAY_MS), lt: dayStart } }, productId: { not: null } },
        select: { productId: true }, distinct: ['productId'],
      }),
    ]);

    const add = (m: Map<string, number>, id: string | null | undefined, q: number) => { if (id) m.set(id, (m.get(id) ?? 0) + q); };
    const soldRecent = new Map<string, number>();
    recent.forEach((r) => add(soldRecent, r.productId, Number(r._sum.quantity) || 0));
    const soldWeekday = new Map<string, number>();
    weekly.forEach((rows) => rows.forEach((r) => add(soldWeekday, r.productId, Number(r._sum.quantity) || 0)));
    const ordered = new Map<string, number>();
    const orderRefs = new Map<string, string[]>();
    const refer = (id: string, ref: string) => orderRefs.set(id, [...(orderRefs.get(id) ?? []), ref]);
    const customCakes: typeof cakes = [];
    for (const c of cakes) {
      if (c.productId) { add(ordered, c.productId, 1); refer(c.productId, c.orderNumber); } else customCakes.push(c);
    }
    for (const b of bulks) {
      const lines = Array.isArray(b.items) ? (b.items as Array<Record<string, unknown>>) : [];
      for (const l of lines) {
        const id = typeof l.productId === 'string' ? l.productId : null;
        const q = Number(l.qty ?? l.quantity) || 0;
        if (id && q > 0) { add(ordered, id, q); refer(id, b.orderNumber); }
      }
    }
    const plannedQty = new Map<string, number>();
    planned.forEach((p) => add(plannedQty, p.productId, p.status === 'COMPLETED' ? p.producedQty : p.plannedQty));
    const freshLeft = new Map<string, number>();
    fresh.forEach((f) => add(freshLeft, f.productId, f.currentQty));
    const waste = new Map(wasteLogs.map((w) => [w.productId, { made: Number(w._sum.initialQty) || 0, wasted: Number(w._sum.wastedQty) || 0 }]));

    const ids = new Set<string>([
      ...madeProducts.map((p) => p.id),
      ...recipes.filter((r) => recipeOf(r.ingredients)).map((r) => r.productId),
      ...history.map((h) => h.productId!).filter(Boolean),
      ...ordered.keys(),
      ...plannedQty.keys(),
    ]);
    let basis: 'made' | 'guess' = 'made';
    if (!ids.size) {
      basis = 'guess';
      [...soldRecent.entries()].sort((a, b) => b[1] - a[1]).slice(0, 20).forEach(([id]) => ids.add(id));
    }
    const products = ids.size
      ? await this.prisma.product.findMany({ where: { tenantId: user.tenantId, id: { in: [...ids] }, isActive: true }, select: { id: true, name: true, unit: true, stock: true, price: true } })
      : [];

    const rows = products.map((p) => {
      const avgDaily = (soldRecent.get(p.id) ?? 0) / span;
      const weekdayAvg = (soldWeekday.get(p.id) ?? 0) / weeks.length;
      const base = weekdayAvg > 0 ? weekdayAvg * 0.6 + avgDaily * 0.4 : avgDaily;
      const w = waste.get(p.id);
      const wasteRate = w && w.made > 0 ? w.wasted / w.made : 0;
      const expected = r2(wasteRate > 0.15 ? base * (1 - Math.min(wasteRate, 0.5) / 2) : base);
      const orders = ordered.get(p.id) ?? 0;
      const left = freshLeft.get(p.id) ?? 0;
      const already = plannedQty.get(p.id) ?? 0;
      return {
        productId: p.id, name: p.name, unit: p.unit, price: p.price, stock: r3(p.stock),
        avgDaily: r2(avgDaily), weekdayAvg: r2(weekdayAvg), expected, wasteRate: Math.round(wasteRate * 1000) / 10,
        orders, orderRefs: orderRefs.get(p.id) ?? [], freshLeft: left, planned: already,
        suggested: Math.max(Math.ceil(orders + expected - left - already), 0),
      };
    }).sort((a, b) => b.suggested - a.suggested || b.expected - a.expected || a.name.localeCompare(b.name));

    return {
      date: key,
      days: span,
      basis,
      rows,
      customCakes: customCakes.map((c) => ({ id: c.id, orderNumber: c.orderNumber, customerName: c.customerName, size: c.size, flavor: c.flavor, shape: c.shape, neededBy: c.neededBy, messageOnCake: c.messageOnCake, status: c.status })),
      bulkOrders: bulks.map((b) => ({ id: b.id, orderNumber: b.orderNumber, organizationName: b.organizationName, eventDate: b.eventDate })),
      totals: { suggested: rows.reduce((s, r) => s + r.suggested, 0), orders: rows.reduce((s, r) => s + r.orders, 0) + customCakes.length, planned: rows.reduce((s, r) => s + r.planned, 0) },
    };
  }

  /** Planned against made and failed for a period of plan days (last 30 days by default). */
  async insights(user: AuthenticatedUser, scope: ShopScope, from?: string, to?: string) {
    const clock = await shopClock(this.tz, user.tenantId);
    const todayKey = clock.keyOf(new Date());
    const range = clock.range(from, to) ?? { gte: new Date(clock.dayStart(todayKey).getTime() - 29 * DAY_MS), lt: clock.today().lt };
    const plans = await this.prisma.bakeryProductionPlan.findMany({
      where: { tenantId: user.tenantId, ...scope.whereLoose, planDate: { gte: range.gte, lt: range.lt } },
      select: { id: true, planDate: true, shift: true, status: true, items: { select: { productId: true, productName: true, plannedQty: true, producedQty: true, failedQty: true, status: true, totalCost: true, bakerName: true, bakingDurationMin: true } } },
      take: 2000,
    });

    type Agg = { planned: number; produced: number; failed: number };
    const zero = (): Agg => ({ planned: 0, produced: 0, failed: 0 });
    const into = (a: Agg, it: { plannedQty: number; producedQty: number; failedQty: number }) => { a.planned += it.plannedQty; a.produced += it.producedQty; a.failed += it.failedQty; };
    const total = zero();
    const byProduct = new Map<string, Agg & { name: string; productId: string | null; cost: number }>();
    const byDay = new Map<string, Agg>();
    const byShift = new Map<string, Agg>();
    const byBaker = new Map<string, Agg>();
    let cost = 0;
    let items = 0;
    let pending = 0;
    for (const p of plans) {
      const dayKey = clock.keyOf(p.planDate);
      for (const it of p.items) {
        items += 1;
        if (WORKING.includes(it.status)) pending += 1;
        into(total, it);
        cost += it.totalCost;
        const k = it.productId ?? `n:${it.productName}`;
        const prod = byProduct.get(k) ?? { ...zero(), name: it.productName, productId: it.productId, cost: 0 };
        into(prod, it); prod.cost = r2(prod.cost + it.totalCost);
        byProduct.set(k, prod);
        const d = byDay.get(dayKey) ?? zero(); into(d, it); byDay.set(dayKey, d);
        const s = byShift.get(p.shift || 'Bina shift') ?? zero(); into(s, it); byShift.set(p.shift || 'Bina shift', s);
        if (it.bakerName) { const b = byBaker.get(it.bakerName) ?? zero(); into(b, it); byBaker.set(it.bakerName, b); }
      }
    }
    const rate = (a: Agg) => (a.produced + a.failed > 0 ? Math.round((a.failed / (a.produced + a.failed)) * 1000) / 10 : 0);
    return {
      period: { from: clock.keyOf(range.gte), to: clock.keyOf(new Date(range.lt.getTime() - 1)) },
      totals: { plans: plans.length, items, pending, ...total, failRate: rate(total), cost: r2(cost), doneRate: total.planned > 0 ? Math.round((total.produced / total.planned) * 1000) / 10 : 0 },
      byProduct: [...byProduct.values()].map((a) => ({ ...a, failRate: rate(a) })).sort((a, b) => b.planned - a.planned),
      byDay: [...byDay.entries()].map(([key, a]) => ({ key, ...a })).sort((a, b) => a.key.localeCompare(b.key)),
      byShift: [...byShift.entries()].map(([key, a]) => ({ key, ...a, failRate: rate(a) })),
      byBaker: [...byBaker.entries()].map(([key, a]) => ({ key, ...a, failRate: rate(a) })).sort((a, b) => b.produced - a.produced),
    };
  }

  /* ───────────────────────── helpers ───────────────────────── */

  private async cleanItems(tenantId: string, items: PlanItemInput[]) {
    const productIds = [...new Set(items.map((it) => it.productId).filter((x): x is string => !!x))];
    const products = productIds.length
      ? await this.prisma.product.findMany({ where: { tenantId, id: { in: productIds } }, select: { id: true, name: true } })
      : [];
    const names = new Map(products.map((p) => [p.id, p.name]));
    const orderIds = [...new Set(items.map((it) => it.cakeOrderId).filter((x): x is string => !!x))];
    const orders = orderIds.length
      ? new Set((await this.prisma.bakeryCakeOrder.findMany({ where: { tenantId, id: { in: orderIds } }, select: { id: true } })).map((o) => o.id))
      : new Set<string>();
    return items.map((it) => {
      if (it.productId && !names.has(it.productId)) throw new NotFoundException('Plan ki ek cheez maal me nahi mili');
      const productName = text(it.productName) ?? (it.productId ? names.get(it.productId)! : null);
      if (!productName) throw new BadRequestException('Har cheez ka naam likhein');
      return {
        productId: it.productId || null,
        productName,
        category: it.category && (Object.values(BakeryCategory) as string[]).includes(it.category) ? (it.category as BakeryCategory) : null,
        cakeOrderId: it.cakeOrderId && orders.has(it.cakeOrderId) ? it.cakeOrderId : null,
        plannedQty: wholeQty(it.plannedQty, productName),
        bakerId: text(it.bakerId),
        bakerName: text(it.bakerName),
        batchNumber: text(it.batchNumber),
        ovenNumber: text(it.ovenNumber),
        notes: text(it.notes),
      };
    });
  }

  private async mustPlan(user: AuthenticatedUser, id: string) {
    const plan = await this.prisma.bakeryProductionPlan.findFirst({
      where: { id, tenantId: user.tenantId },
      include: { items: { orderBy: { displayOrder: 'asc' } } },
    });
    if (!plan) throw new NotFoundException('Plan nahi mila');
    return plan;
  }

  private async mustItem(user: AuthenticatedUser, itemId: string) {
    const item = await this.prisma.bakeryProductionItem.findFirst({
      where: { id: itemId, plan: { tenantId: user.tenantId } },
      include: { plan: { select: { id: true, planNumber: true, shopId: true, status: true } } },
    });
    if (!item) throw new NotFoundException('Plan ki cheez nahi mili');
    return item;
  }
}
