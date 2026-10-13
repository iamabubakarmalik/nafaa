/**
 * Raw materials (flour, sugar, butter): the store list, goods received with
 * the money paid or owed, use, waste and counted corrections, the movement
 * log, and recipe costing at today's rates. Stock changes are conditional
 * updates so two people cannot take the same stock twice.
 */

import { BadRequestException, ConflictException, Injectable, NotFoundException } from '@nestjs/common';
import { PaymentMethod, Prisma } from '@prisma/client';
import { PrismaService } from '../../../prisma/prisma.service';
import { AuthenticatedUser } from '../../../modules/auth/interfaces/jwt-payload.interface';
import { TenantTimezoneService } from '../../../common/helpers/tenant-timezone.service';
import { ShopScope } from '../../../common/shop-scope';
import { PurchasesService } from '../../../modules/purchasing/purchases/purchases.service';
import { DAY_MS, positive, r2, r3, recipeOf, shopClock } from '../bakery-common';

type Body = Record<string, unknown>;

const PAY_METHODS = new Set<string>(Object.values(PaymentMethod));

const TEXT_FIELDS = ['category', 'code', 'brand', 'unit', 'lastVendorName', 'storageMethod', 'countryOfOrigin', 'supplierName', 'supplierPhone', 'imageUrl', 'notes'] as const;
const NUMBER_FIELDS = ['minStock', 'maxStock', 'reorderLevel', 'costPerUnit', 'lastPurchasePrice'] as const;
const FLAG_FIELDS = ['requiresRefrigeration', 'isCritical', 'isOrganic', 'isImported'] as const;

/** Store fields a client may set; stock itself changes only through purchase, use, waste and count. */
function cleanFields(dto: Body): Prisma.BakeryIngredientUncheckedUpdateInput {
  const out: Prisma.BakeryIngredientUncheckedUpdateInput = {};
  for (const k of TEXT_FIELDS) {
    if (dto[k] === undefined) continue;
    const v = typeof dto[k] === 'string' ? (dto[k] as string).trim() : '';
    (out as Body)[k] = k === 'category' || k === 'unit' ? v || undefined : v || null;
  }
  for (const k of NUMBER_FIELDS) {
    if (dto[k] === undefined) continue;
    const n = dto[k] === null || dto[k] === '' ? null : Number(dto[k]);
    if (n !== null && (!Number.isFinite(n) || n < 0)) throw new BadRequestException('Rate aur had sahi number hon');
    (out as Body)[k] = k === 'minStock' || k === 'costPerUnit' ? n ?? 0 : n;
  }
  for (const k of FLAG_FIELDS) if (dto[k] !== undefined) (out as Body)[k] = !!dto[k];
  if (dto.shelfLifeDays !== undefined) {
    const n = dto.shelfLifeDays === null || dto.shelfLifeDays === '' ? null : Math.round(Number(dto.shelfLifeDays));
    out.shelfLifeDays = n !== null && Number.isFinite(n) && n >= 0 ? n : null;
  }
  if (dto.lastPurchaseDate !== undefined) {
    const d = dto.lastPurchaseDate ? new Date(String(dto.lastPurchaseDate)) : null;
    out.lastPurchaseDate = d && !Number.isNaN(d.getTime()) ? d : null;
  }
  return out;
}

@Injectable()
export class IngredientsService {
  constructor(
    private readonly prisma: PrismaService,
    private readonly tz: TenantTimezoneService,
    private readonly purchases: PurchasesService,
  ) {}

  async create(user: AuthenticatedUser, dto: Body) {
    const name = typeof dto?.name === 'string' ? dto.name.trim().replace(/\s+/g, ' ') : '';
    if (!name) throw new BadRequestException('Saamaan ka naam likhein');
    const dup = await this.prisma.bakeryIngredient.findFirst({ where: { tenantId: user.tenantId, name: { equals: name, mode: 'insensitive' } }, select: { id: true, isActive: true } });
    if (dup) throw new BadRequestException(dup.isActive ? `"${name}" pehle se saamaan me hai` : `"${name}" pehle hataya gaya tha — "Hataye hue" me se wapas layein`);
    const stock = dto.currentStock === undefined || dto.currentStock === '' ? 0 : Number(dto.currentStock);
    if (!Number.isFinite(stock) || stock < 0) throw new BadRequestException('Shuru ka stock sahi number ho');
    const fields = cleanFields(dto) as Prisma.BakeryIngredientUncheckedCreateInput;
    return this.prisma.bakeryIngredient.create({
      data: { ...fields, tenantId: user.tenantId, name, category: (fields.category as string) || 'GENERAL', unit: (fields.unit as string) || 'kg', currentStock: stock },
    });
  }

  async list(user: AuthenticatedUser, params: { category?: string; lowStock?: boolean; critical?: boolean; search?: string; active?: boolean }) {
    const s = params.search?.trim();
    const items = await this.prisma.bakeryIngredient.findMany({
      where: {
        tenantId: user.tenantId,
        ...(params.active !== undefined && { isActive: params.active }),
        ...(params.category && { category: params.category }),
        ...(params.critical !== undefined && { isCritical: params.critical }),
        ...(s && {
          OR: [
            { name: { contains: s, mode: 'insensitive' } },
            { code: { contains: s, mode: 'insensitive' } },
            { brand: { contains: s, mode: 'insensitive' } },
            { supplierName: { contains: s, mode: 'insensitive' } },
          ],
        }),
      },
      orderBy: [{ isCritical: 'desc' }, { name: 'asc' }],
      take: 1000,
    });
    if (params.lowStock) return items.filter((i) => i.currentStock <= (i.reorderLevel ?? i.minStock));
    return items;
  }

  async getOne(user: AuthenticatedUser, id: string) {
    const i = await this.prisma.bakeryIngredient.findFirst({
      where: { id, tenantId: user.tenantId },
      include: { transactions: { orderBy: { createdAt: 'desc' }, take: 20 } },
    });
    if (!i) throw new NotFoundException('Saamaan nahi mila');
    return i;
  }

  async update(user: AuthenticatedUser, id: string, dto: Body) {
    const current = await this.mustFind(user, id);
    const data = cleanFields(dto ?? {});
    if (typeof dto?.name === 'string') {
      const name = dto.name.trim().replace(/\s+/g, ' ');
      if (!name) throw new BadRequestException('Saamaan ka naam likhein');
      if (name.toLowerCase() !== current.name.toLowerCase()) {
        const dup = await this.prisma.bakeryIngredient.findFirst({ where: { tenantId: user.tenantId, name: { equals: name, mode: 'insensitive' }, id: { not: id } }, select: { id: true } });
        if (dup) throw new BadRequestException(`"${name}" pehle se saamaan me hai`);
      }
      data.name = name;
    }
    if (dto?.isActive !== undefined) data.isActive = !!dto.isActive;
    await this.prisma.bakeryIngredient.updateMany({ where: { id, tenantId: user.tenantId }, data: data as Prisma.BakeryIngredientUpdateManyMutationInput });
    return this.mustFind(user, id);
  }

  /** Hides a raw material; its history and recipes stay. */
  async remove(user: AuthenticatedUser, id: string) {
    await this.mustFind(user, id);
    await this.prisma.bakeryIngredient.updateMany({ where: { id, tenantId: user.tenantId }, data: { isActive: false } });
    return this.mustFind(user, id);
  }

  /**
   * Goods received: stock goes up and the money is recorded.
   *
   * Raw materials are not products, so this cannot be a Purchase. What was
   * paid now becomes a paid expense (the open cash shift counts cash ones);
   * what is owed goes on the supplier's account.
   */
  /**
   * Goods received from the quick "Saamaan aaya" form. It is booked as a
   * supplier bill (Purchase), the same as the full purchase screen, so the
   * cash paid shows in the drawer and day book as a purchase and the cost
   * reaches profit once, through the cost of what is baked and sold. (It used
   * to be written as an expense too, which counted raw material twice.)
   * Without a chosen supplier the bill goes to the vendor named on the form,
   * or to a single "Bazaar (naqd khareed)" supplier.
   */
  async recordPurchase(user: AuthenticatedUser, scope: ShopScope, id: string, dto: {
    quantity: number; costPerUnit: number;
    vendorName?: string; notes?: string;
    supplierId?: string;
    paymentMethod?: string;
    /** Paid now; the full amount when left out. */
    paidAmount?: number;
    shopId?: string;
  }) {
    await this.mustFind(user, id);
    const qty = positive(dto?.quantity, 'Kitna aaya — tadaad likhein');
    const rate = Number(dto?.costPerUnit) || 0;
    if (rate < 0) throw new BadRequestException('Rate sahi likhein');

    const totalCost = r2(qty * rate);
    const paid = dto.paidAmount === undefined || dto.paidAmount === null ? totalCost : r2(Math.max(Number(dto.paidAmount) || 0, 0));
    if (paid > totalCost + 0.005) throw new BadRequestException('Diya hua paisa kul rakam se zyada nahi ho sakta');
    const credit = r2(Math.max(totalCost - paid, 0));
    if (credit > 0 && !dto.supplierId) throw new BadRequestException('Udhaar par lena hai to supplier chunna zaroori hai');

    const vendor = dto.vendorName?.trim() || undefined;
    const supplierId = dto.supplierId
      ? (await this.prisma.supplier.findFirst({ where: { id: dto.supplierId, tenantId: user.tenantId }, select: { id: true } }))?.id
      : await this.cashSupplier(user.tenantId, vendor);
    if (!supplierId) throw new NotFoundException('Supplier nahi mila');

    const method = PAY_METHODS.has(String(dto.paymentMethod)) ? (dto.paymentMethod as PaymentMethod) : 'CASH';
    await this.purchases.create(user, scope, {
      supplierId,
      shopId: dto.shopId,
      paymentMethod: method,
      paidAmount: paid,
      notes: (dto.notes?.trim() || (vendor && dto.supplierId ? vendor : undefined))?.slice(0, 500),
      items: [{ ingredientId: id, quantity: qty, costPrice: rate }],
    });
    return this.prisma.bakeryIngredient.findUniqueOrThrow({ where: { id } });
  }

  /** Supplier for a cash buy with no supplier chosen: the named vendor, else one shared "bazaar" supplier. */
  private async cashSupplier(tenantId: string, vendor?: string) {
    const name = (vendor || 'Bazaar (naqd khareed)').slice(0, 100);
    const found = await this.prisma.supplier.findFirst({
      where: { tenantId, name: { equals: name, mode: 'insensitive' } },
      select: { id: true },
    });
    if (found) return found.id;
    const created = await this.prisma.supplier.create({ data: { tenantId, name }, select: { id: true } });
    return created.id;
  }

  async recordConsumption(user: AuthenticatedUser, id: string, dto: { quantity: number; productionItemId?: string; cakeOrderId?: string; batchNumber?: string; notes?: string }) {
    const i = await this.mustFind(user, id);
    const qty = positive(dto?.quantity, 'Kitna istemal hua — tadaad likhein');
    return this.prisma.$transaction(async (tx) => {
      const taken = await tx.bakeryIngredient.updateMany({
        where: { id, tenantId: user.tenantId, currentStock: { gte: qty - 0.0001 } },
        data: { currentStock: { decrement: qty }, totalConsumed: { increment: qty } },
      });
      if (!taken.count) throw new BadRequestException(`${i.name} itna stock me nahi`);
      await tx.bakeryIngredientTransaction.create({
        data: {
          tenantId: user.tenantId, ingredientId: id, transactionType: 'CONSUMPTION', quantity: qty, unit: i.unit,
          costPerUnit: i.costPerUnit, totalCost: r2(qty * i.costPerUnit), productionItemId: dto.productionItemId ?? null,
          cakeOrderId: dto.cakeOrderId ?? null, batchNumber: dto.batchNumber ?? null, notes: dto.notes?.trim() || null, performedById: user.id,
        },
      });
      return tx.bakeryIngredient.findUniqueOrThrow({ where: { id } });
    });
  }

  /** Wasted raw material. More than what is in stock only takes the stock to zero. */
  async recordWaste(user: AuthenticatedUser, id: string, dto: { quantity: number; reason: string }) {
    const i = await this.mustFind(user, id);
    const qty = positive(dto?.quantity, 'Kitna zaya hua — tadaad likhein');
    const reason = dto?.reason?.trim() || 'Kharab ho gaya';
    return this.prisma.$transaction(async (tx) => {
      const next = Math.max(r3(i.currentStock - qty), 0);
      const done = await tx.bakeryIngredient.updateMany({
        where: { id, tenantId: user.tenantId, currentStock: i.currentStock },
        data: { currentStock: next, totalWasted: { increment: qty } },
      });
      if (!done.count) throw new ConflictException('Stock abhi badla gaya — dobara koshish karein');
      await tx.bakeryIngredientTransaction.create({
        data: {
          tenantId: user.tenantId, ingredientId: id, transactionType: 'WASTE', quantity: qty, unit: i.unit,
          costPerUnit: i.costPerUnit, totalCost: r2(qty * i.costPerUnit), reason, performedById: user.id,
        },
      });
      return tx.bakeryIngredient.findUniqueOrThrow({ where: { id } });
    });
  }

  /** Sets the stock to what was counted, recording the difference with its reason. */
  async adjustStock(user: AuthenticatedUser, id: string, dto: { newStock: number; reason: string }) {
    const i = await this.mustFind(user, id);
    const next = Number(dto?.newStock);
    if (!Number.isFinite(next) || next < 0) throw new BadRequestException('Gin kar kitna nikla — sahi number likhein');
    const reason = dto?.reason?.trim();
    if (!reason) throw new BadRequestException('Farq ki wajah likhein');
    const diff = r3(next - i.currentStock);
    if (Math.abs(diff) < 0.0005) return i;
    return this.prisma.$transaction(async (tx) => {
      const done = await tx.bakeryIngredient.updateMany({ where: { id, tenantId: user.tenantId, currentStock: i.currentStock }, data: { currentStock: next } });
      if (!done.count) throw new ConflictException('Stock abhi badla gaya — dobara gin kar likhein');
      await tx.bakeryIngredientTransaction.create({
        data: {
          tenantId: user.tenantId, ingredientId: id, transactionType: 'ADJUSTMENT', quantity: diff, unit: i.unit,
          costPerUnit: i.costPerUnit, totalCost: r2(diff * i.costPerUnit), reason, performedById: user.id,
        },
      });
      return tx.bakeryIngredient.findUniqueOrThrow({ where: { id } });
    });
  }

  async transactions(user: AuthenticatedUser, id: string) {
    await this.mustFind(user, id);
    return this.prisma.bakeryIngredientTransaction.findMany({
      where: { tenantId: user.tenantId, ingredientId: id },
      orderBy: { createdAt: 'desc' },
      take: 100,
    });
  }

  async lowStockAlert(user: AuthenticatedUser) {
    const all = await this.prisma.bakeryIngredient.findMany({ where: { tenantId: user.tenantId, isActive: true } });
    return all.filter((i) => i.currentStock <= (i.reorderLevel ?? i.minStock));
  }

  /**
   * Every raw-material movement in a period of business days (last 30 days
   * by default) with money totals per kind, per day and per material.
   */
  async movements(user: AuthenticatedUser, from?: string, to?: string, type?: string) {
    const clock = await shopClock(this.tz, user.tenantId);
    const range = clock.range(from, to) ?? { gte: new Date(clock.today().gte.getTime() - 29 * DAY_MS), lt: clock.today().lt };
    const rows = await this.prisma.bakeryIngredientTransaction.findMany({
      where: { tenantId: user.tenantId, createdAt: { gte: range.gte, lt: range.lt }, ...(type && { transactionType: type }) },
      orderBy: { createdAt: 'desc' },
      take: 3000,
      select: {
        id: true, transactionType: true, quantity: true, unit: true, costPerUnit: true, totalCost: true, reason: true, notes: true,
        batchNumber: true, createdAt: true, ingredient: { select: { id: true, name: true, category: true } },
      },
    });
    const kinds = ['PURCHASE', 'CONSUMPTION', 'WASTE', 'ADJUSTMENT'] as const;
    const totals = Object.fromEntries(kinds.map((k) => [k, { count: 0, cost: 0 }])) as Record<(typeof kinds)[number], { count: number; cost: number }>;
    const byDay = new Map<string, Record<(typeof kinds)[number], number>>();
    const byIngredient = new Map<string, { id: string; name: string; used: number; wasted: number; bought: number; unit: string; cost: number }>();
    for (const r of rows) {
      const k = (kinds as readonly string[]).includes(r.transactionType) ? (r.transactionType as (typeof kinds)[number]) : null;
      const money = r2(Number(r.totalCost) || 0);
      if (k) { totals[k].count += 1; totals[k].cost = r2(totals[k].cost + money); }
      const day = clock.keyOf(r.createdAt);
      const d = byDay.get(day) ?? { PURCHASE: 0, CONSUMPTION: 0, WASTE: 0, ADJUSTMENT: 0 };
      if (k) d[k] = r2(d[k] + money);
      byDay.set(day, d);
      const g = byIngredient.get(r.ingredient.id) ?? { id: r.ingredient.id, name: r.ingredient.name, used: 0, wasted: 0, bought: 0, unit: r.unit, cost: 0 };
      if (k === 'CONSUMPTION') { g.used = r3(g.used + r.quantity); g.cost = r2(g.cost + money); }
      if (k === 'WASTE') g.wasted = r3(g.wasted + r.quantity);
      if (k === 'PURCHASE') g.bought = r3(g.bought + r.quantity);
      byIngredient.set(r.ingredient.id, g);
    }
    return {
      period: { from: clock.keyOf(range.gte), to: clock.keyOf(new Date(range.lt.getTime() - 1)) },
      rows: rows.slice(0, 300).map((r) => ({ ...r, cost: r2(Number(r.totalCost) || 0), totalCost: undefined })),
      totals,
      byDay: [...byDay.entries()].map(([key, v]) => ({ key, cost: v })).sort((a, b) => a.key.localeCompare(b.key)),
      byIngredient: [...byIngredient.values()].sort((a, b) => b.cost - a.cost),
    };
  }

  /**
   * Recipe costing: every product with a recipe, priced at today's raw
   * material rates, against its selling price and the cost written on the
   * product, with how many can be made from the store.
   */
  async recipes(user: AuthenticatedUser) {
    const profiles = await this.prisma.bakeryProductProfile.findMany({
      where: { tenantId: user.tenantId, ingredients: { not: Prisma.DbNull } },
      select: { productId: true, ingredients: true, updatedAt: true },
    });
    const withRecipe = profiles.map((p) => ({ ...p, recipe: recipeOf(p.ingredients) })).filter((p) => p.recipe);
    const productIds = withRecipe.map((p) => p.productId);
    const ingredientIds = [...new Set(withRecipe.flatMap((p) => p.recipe!.lines.map((l) => l.ingredientId)))];
    const [products, ingredients] = await Promise.all([
      productIds.length ? this.prisma.product.findMany({
        where: { tenantId: user.tenantId, id: { in: productIds } },
        select: { id: true, name: true, unit: true, price: true, costPrice: true, isActive: true, images: { where: { isPrimary: true }, take: 1, select: { url: true } } },
      }) : [],
      ingredientIds.length ? this.prisma.bakeryIngredient.findMany({
        where: { tenantId: user.tenantId, id: { in: ingredientIds } },
        select: { id: true, name: true, unit: true, costPerUnit: true, currentStock: true, isActive: true },
      }) : [],
    ]);
    const byProduct = new Map(products.map((p) => [p.id, p]));
    const byIngredient = new Map(ingredients.map((i) => [i.id, i]));
    const usedIn = new Map<string, number>();

    const rows = withRecipe.flatMap((p) => {
      const product = byProduct.get(p.productId);
      if (!product) return [];
      const recipe = p.recipe!;
      const lines = recipe.lines.map((l) => {
        usedIn.set(l.ingredientId, (usedIn.get(l.ingredientId) ?? 0) + 1);
        const now = byIngredient.get(l.ingredientId);
        const rate = now?.costPerUnit ?? l.costPerUnit;
        return {
          ingredientId: l.ingredientId, name: now?.name ?? l.name, qty: l.qty, unit: now?.unit ?? l.unit,
          stock: now ? r3(now.currentStock) : null, missing: !now || !now.isActive,
          batches: now && l.qty > 0 ? Math.floor(Math.max(now.currentStock, 0) / l.qty) : null,
          cost: { rate: r2(rate), savedRate: r2(l.costPerUnit), line: r2(l.qty * rate), changed: Math.abs(rate - l.costPerUnit) > Math.max(l.costPerUnit * 0.02, 0.01) },
        };
      });
      const batch = r2(lines.reduce((s, l) => s + l.cost.line, 0));
      const perUnit = r2(batch / recipe.yieldQty);
      const known = lines.filter((l) => l.batches !== null);
      const capacity = known.length === lines.length && lines.length ? Math.min(...known.map((l) => l.batches!)) : null;
      const limiting = capacity !== null ? lines.find((l) => l.batches === capacity)?.name ?? null : null;
      const margin = r2(product.price - perUnit);
      return [{
        productId: product.id, name: product.name, unit: product.unit, price: product.price, isActive: product.isActive,
        image: product.images[0]?.url ?? null, yieldQty: recipe.yieldQty, lines, updatedAt: p.updatedAt,
        canMake: capacity !== null ? capacity * recipe.yieldQty : null, limiting,
        ratesChanged: lines.filter((l) => l.cost.changed).length, missing: lines.filter((l) => l.missing).length,
        cost: { batch, perUnit, current: product.costPrice, diff: r2(perUnit - product.costPrice) },
        margin: { amount: margin, pct: product.price > 0 ? Math.round((margin / product.price) * 1000) / 10 : null },
      }];
    }).sort((a, b) => a.name.localeCompare(b.name));

    return {
      rows,
      usedIn: Object.fromEntries(usedIn),
      totals: {
        recipes: rows.length,
        lowMargin: rows.filter((r) => r.margin.pct !== null && r.margin.pct < 20).length,
        costOff: rows.filter((r) => r.cost.current > 0 ? Math.abs(r.cost.diff) / r.cost.current > 0.05 : r.cost.perUnit > 0).length,
        missing: rows.filter((r) => r.missing > 0).length,
      },
    };
  }

  private async mustFind(user: AuthenticatedUser, id: string) {
    const i = await this.prisma.bakeryIngredient.findFirst({ where: { id, tenantId: user.tenantId } });
    if (!i) throw new NotFoundException('Saamaan nahi mila');
    return i;
  }
}
