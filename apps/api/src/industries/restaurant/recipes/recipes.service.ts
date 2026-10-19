import { BadRequestException, Injectable, NotFoundException } from '@nestjs/common';
import { Prisma } from '@prisma/client';
import { PrismaService } from '../../../prisma/prisma.service';
import { AuthenticatedUser } from '../../../modules/auth/interfaces/jwt-payload.interface';
import { UpsertRecipeDto } from './dto/upsert-recipe.dto';
import { applyStockDelta } from '../../../common/shop-scope';
import { startOfBusinessDayTz, subDaysTz } from '../../../common/helpers/business-time.helper';
import { TenantTimezoneService } from '../../../common/helpers/tenant-timezone.service';
import { convertQty, round2, round3, unitsCompatible, withWastage } from './recipe-units';
import { stockOf } from './branch-stock';
import { menuBranch, offAtBranch } from '../menu-items/branch-availability';

/** One order line to cook. */
export interface CookLine {
  id: string;
  productId: string;
  /** Size sold; its recipe factor scales the ingredients. */
  variantId?: string | null;
  quantity: number;
}

/** What holds a dish back: the ingredient that runs out first. */
export interface Shortage { name: string; have: number; need: number; unit: string }

/** A dish's plate cost at today's ingredient rates and how many plates the store can still make. */
export interface PlateFacts {
  recipeId: string;
  menuItemId: string;
  productId: string;
  /** Today's cost of one plate. */
  plateCost: number;
  /** Plates the stock still covers; null when every line is optional. */
  canMake: number | null;
  blocker: Shortage | null;
  missing: Shortage[];
  ingredientCount: number;
  /** Lines whose unit cannot be taken from the ingredient's stock unit. */
  unitProblems: string[];
}

const RECIPE_INCLUDE = {
  ingredients: { include: { ingredient: true }, orderBy: { displayOrder: 'asc' } },
  sizeFactors: { select: { id: true, variantId: true, factor: true, variant: { select: { name: true } } } },
} satisfies Prisma.RecipeInclude;

@Injectable()
export class RecipesService {
  constructor(private readonly prisma: PrismaService, private readonly clock: TenantTimezoneService) {}

  /**
   * Checks the lines and prices them at the ingredient's cost: units must fit
   * the stock unit, quantities must be positive, an ingredient appears once,
   * and a dish cannot be its own ingredient.
   */
  private async computeCost(user: AuthenticatedUser, dishProductId: string, ingredients: UpsertRecipeDto['ingredients']) {
    const ids = ingredients.map((i) => i.ingredientProductId);
    if (new Set(ids).size !== ids.length) throw new BadRequestException('Ek cheez recipe me do dafa hai — ek line me jor dein');
    if (ids.includes(dishProductId)) throw new BadRequestException('Dish khud apni recipe ka hissa nahi ho sakti');
    const products = await this.prisma.product.findMany({
      where: { id: { in: ids }, tenantId: user.tenantId },
      select: { id: true, name: true, costPrice: true, unit: true },
    });
    if (products.length !== new Set(ids).size) throw new NotFoundException('Ek ya zyada ingredient nahi mile');
    const byId = new Map(products.map((p) => [p.id, p]));

    let total = 0;
    const enriched = ingredients.map((ing, idx) => {
      const product = byId.get(ing.ingredientProductId)!;
      if (!(ing.quantity > 0)) throw new BadRequestException(`${product.name}: quantity 0 se zyada likhein`);
      const unit = ing.unit?.trim() || product.unit;
      if (!unitsCompatible(unit, product.unit)) {
        throw new BadRequestException(`${product.name} ka stock "${product.unit}" me hai — recipe me "${unit}" nahi chalega. ${product.unit} ya us ka hissa (g/kg, ml/litre, pcs/dozen) likhein.`);
      }
      // Cost is per unit of the stocked ingredient at today's rate; a typed
      // rate is used only while the ingredient has no cost of its own.
      const costPer = product.costPrice || ing.costPerUnit || 0;
      const wastagePercent = round2(ing.wastagePercent ?? 0);
      const lineTotal = round2(costPer * convertQty(withWastage(ing.quantity, wastagePercent), unit, product.unit));
      if (!ing.isOptional) total += lineTotal;
      return {
        ingredientProductId: ing.ingredientProductId,
        quantity: round3(ing.quantity),
        unit,
        wastagePercent,
        costPerUnit: costPer,
        totalCost: lineTotal,
        isOptional: ing.isOptional ?? false,
        notes: ing.notes?.trim() || null,
        displayOrder: ing.displayOrder ?? idx,
      };
    });
    return { total: round2(total), enriched };
  }

  /**
   * Keep the dish's cost price equal to its recipe cost per portion, so
   * profit reports see food cost. Once a recipe has size factors, every
   * size costs the plate times its factor (a size without one uses the
   * full recipe); a recipe without factors leaves the sizes' typed costs.
   */
  private async syncDishCost(
    tx: Prisma.TransactionClient, productId: string, total: number, yieldQuantity: number,
    sizeFactors: Array<{ variantId: string; factor: number }> = [],
  ) {
    if (!(total > 0)) return;
    const perPlate = round2(total / (yieldQuantity || 1));
    await tx.product.update({ where: { id: productId }, data: { costPrice: perPlate } });
    if (!sizeFactors.length) return;
    const sizes = await tx.productVariant.findMany({ where: { productId }, select: { id: true, costPrice: true } });
    for (const v of sizes) {
      const cost = round2(perPlate * (sizeFactors.find((f) => f.variantId === v.id)?.factor ?? 1));
      if (Math.abs(cost - v.costPrice) >= 0.01) await tx.productVariant.update({ where: { id: v.id }, data: { costPrice: cost } });
    }
  }

  /** Size factors must belong to the dish's own sizes, each once. */
  private async checkSizes(productId: string, sizeFactors: NonNullable<UpsertRecipeDto['sizeFactors']>) {
    const ids = sizeFactors.map((f) => f.variantId);
    if (new Set(ids).size !== ids.length) throw new BadRequestException('Ek size do dafa likha hai');
    if (!ids.length) return;
    const found = await this.prisma.productVariant.count({ where: { id: { in: ids }, productId } });
    if (found !== ids.length) throw new NotFoundException('Ek ya zyada size is dish ka nahi');
  }

  async upsert(user: AuthenticatedUser, dto: UpsertRecipeDto) {
    const menuItem = await this.prisma.restaurantMenuItem.findFirst({ where: { id: dto.menuItemId, tenantId: user.tenantId }, select: { id: true, productId: true } });
    if (!menuItem) throw new NotFoundException('Menu item nahi mila');
    if (!dto.ingredients?.length) throw new BadRequestException('Kam se kam ek cheez recipe me daalein');
    if (dto.yieldQuantity !== undefined && !(dto.yieldQuantity > 0)) throw new BadRequestException('Kitni plate banti hain — 0 se zyada likhein');

    const { total, enriched } = await this.computeCost(user, menuItem.productId, dto.ingredients);
    if (dto.sizeFactors) await this.checkSizes(menuItem.productId, dto.sizeFactors);
    const existing = await this.prisma.recipe.findUnique({ where: { menuItemId: dto.menuItemId }, include: { sizeFactors: true } });
    const yieldQuantity = dto.yieldQuantity ?? existing?.yieldQuantity ?? 1;

    return this.prisma.$transaction(async (tx) => {
      const base = {
        yieldQuantity,
        yieldUnit: dto.yieldUnit?.trim() || existing?.yieldUnit || 'portion',
        preparationSteps: dto.preparationSteps?.trim() || null,
        cookingTime: dto.cookingTime ?? null,
        totalCost: total,
      };
      let recipeId: string;
      if (existing) {
        await tx.recipeIngredient.deleteMany({ where: { recipeId: existing.id } });
        await tx.recipe.update({ where: { id: existing.id }, data: { ...base, ingredients: { create: enriched } } });
        recipeId = existing.id;
      } else {
        recipeId = (await tx.recipe.create({
          data: { ...base, tenantId: user.tenantId, menuItemId: dto.menuItemId, ingredients: { create: enriched } },
          select: { id: true },
        })).id;
      }
      // Sizes are replaced only when sent; an older screen leaves them as saved.
      if (dto.sizeFactors) {
        const keep = dto.sizeFactors.map((f) => f.variantId);
        await tx.recipeSizeFactor.deleteMany({ where: { recipeId, variantId: { notIn: keep } } });
        for (const f of dto.sizeFactors) {
          await tx.recipeSizeFactor.upsert({
            where: { recipeId_variantId: { recipeId, variantId: f.variantId } },
            update: { factor: f.factor },
            create: { tenantId: user.tenantId, recipeId, variantId: f.variantId, factor: f.factor },
          });
        }
      }
      const sizes = dto.sizeFactors ?? existing?.sizeFactors ?? [];
      await this.syncDishCost(tx, menuItem.productId, total, yieldQuantity, sizes);
      return tx.recipe.findUniqueOrThrow({ where: { id: recipeId }, include: RECIPE_INCLUDE });
    });
  }

  /**
   * Re-cost the recipes of the given dishes at today's ingredient rates and
   * keep each dish's cost price in step, so the bill's cost of goods follows
   * ingredient prices (chicken, oil) as they change between purchases.
   */
  async refreshDishCosts(tenantId: string, productIds?: string[]) {
    if (productIds && !productIds.length) return 0;
    let changed = 0;
    const recipes = await this.prisma.recipe.findMany({
      where: { tenantId, ...(productIds && { menuItem: { productId: { in: productIds } } }) },
      include: {
        ingredients: { include: { ingredient: { select: { costPrice: true, unit: true } } } },
        sizeFactors: { select: { variantId: true, factor: true } },
        menuItem: { select: { productId: true, product: { select: { costPrice: true, variants: { select: { id: true, costPrice: true } } } } } },
      },
    });
    for (const r of recipes) {
      let total = 0;
      for (const ing of r.ingredients) {
        if (ing.isOptional) continue;
        const rate = ing.ingredient?.costPrice || ing.costPerUnit || 0;
        total += rate * convertQty(withWastage(ing.quantity, ing.wastagePercent), ing.unit, ing.ingredient?.unit);
      }
      total = round2(total);
      if (!(total > 0)) continue;
      const perPlate = round2(total / (r.yieldQuantity || 1));
      const sizesStale = r.sizeFactors.length > 0 && (r.menuItem.product?.variants ?? []).some((v) =>
        Math.abs(round2(perPlate * (r.sizeFactors.find((f) => f.variantId === v.id)?.factor ?? 1)) - v.costPrice) >= 0.01);
      if (!sizesStale && Math.abs(perPlate - (r.menuItem.product?.costPrice ?? 0)) < 0.01 && Math.abs(total - r.totalCost) < 0.01) continue;
      await this.prisma.$transaction(async (tx) => {
        await tx.recipe.update({ where: { id: r.id }, data: { totalCost: total } });
        await this.syncDishCost(tx, r.menuItem.productId, total, r.yieldQuantity, r.sizeFactors);
      });
      changed += 1;
    }
    return changed;
  }

  async getByMenuItem(user: AuthenticatedUser, menuItemId: string) {
    return this.prisma.recipe.findFirst({
      where: { tenantId: user.tenantId, menuItemId },
      include: RECIPE_INCLUDE,
    });
  }

  async remove(user: AuthenticatedUser, id: string) {
    const r = await this.prisma.recipe.findFirst({ where: { id, tenantId: user.tenantId } });
    if (!r) throw new NotFoundException('Recipe nahi mili');
    return this.prisma.recipe.delete({ where: { id } });
  }

  /**
   * Take the ingredients of the given order lines out of the branch stock:
   * the dish's recipe (with wastage, times the size factor of the size sold)
   * and the raw material of each add-on picked (extra cheese).
   *
   * Each line is claimed through its `cookingStartedAt` stamp, so a line is
   * never deducted twice (kitchen marking COOKING, then the bill being paid).
   * Stock moves through `applyStockDelta`, which keeps ShopStock and
   * Product.stock in step. The kitchen is never blocked by stock counts, so
   * ingredients may go below zero.
   */
  async consumeForLines(user: AuthenticatedUser, shopId: string, lines: CookLine[], orderNumber: string) {
    if (!lines.length) return;
    const productIds = [...new Set(lines.map((l) => l.productId))];
    const [recipes, addOns] = await Promise.all([
      this.prisma.recipe.findMany({
        where: { tenantId: user.tenantId, menuItem: { productId: { in: productIds } } },
        include: {
          ingredients: { include: { ingredient: { select: { id: true, name: true, unit: true } } } },
          sizeFactors: { select: { variantId: true, factor: true } },
          menuItem: { select: { productId: true } },
        },
      }),
      this.prisma.restaurantOrderItemModifier.findMany({
        where: { orderItemId: { in: lines.map((l) => l.id) }, modifierOption: { ingredientProductId: { not: null } } },
        select: {
          orderItemId: true, quantity: true,
          modifierOption: { select: { name: true, ingredientProductId: true, ingredientQty: true, ingredientUnit: true, ingredient: { select: { unit: true } } } },
        },
      }),
    ]);
    const byProduct = new Map(recipes.map((r) => [r.menuItem.productId, r]));
    const now = new Date();

    for (const line of lines) {
      const claimed = await this.prisma.restaurantOrderItem.updateMany({
        where: { id: line.id, cookingStartedAt: null },
        data: { cookingStartedAt: now },
      });
      if (!claimed.count) continue;
      const recipe = byProduct.get(line.productId);
      const extras = addOns.filter((m) => m.orderItemId === line.id);

      const take: Array<{ productId: string; used: number; note: string }> = [];
      if (recipe) {
        // A size without a factor uses the full recipe.
        const size = line.variantId ? recipe.sizeFactors.find((f) => f.variantId === line.variantId)?.factor ?? 1 : 1;
        const factor = (line.quantity / (recipe.yieldQuantity || 1)) * size;
        for (const ing of recipe.ingredients) {
          if (ing.isOptional || !ing.ingredient) continue;
          take.push({
            productId: ing.ingredientProductId,
            used: round3(convertQty(withWastage(ing.quantity, ing.wastagePercent) * factor, ing.unit, ing.ingredient.unit)),
            note: `Kitchen use × ${line.quantity}`,
          });
        }
      }
      for (const m of extras) {
        const o = m.modifierOption;
        if (!o.ingredientProductId || !(Number(o.ingredientQty) > 0)) continue;
        take.push({
          productId: o.ingredientProductId,
          used: round3(convertQty(Number(o.ingredientQty) * m.quantity * line.quantity, o.ingredientUnit, o.ingredient?.unit)),
          note: `Add-on ${o.name} × ${m.quantity * line.quantity}`,
        });
      }

      await this.prisma.$transaction(async (tx) => {
        for (const t of take) {
          if (!(t.used > 0)) continue;
          await applyStockDelta({
            tx,
            tenantId: user.tenantId,
            shopId,
            productId: t.productId,
            delta: -t.used,
            movementType: 'ADJUSTMENT_OUT',
            // Low-stock reads "Recipe:" movements as kitchen use.
            reference: `Recipe: ${orderNumber}`,
            note: t.note,
            userId: user.id,
          });
        }
      });
    }
  }

  /**
   * Per dish: plate cost at today's ingredient rates and how many plates the
   * branch stock (or all branches) still covers, with the ingredient that
   * runs out first.
   */
  async plateFacts(tenantId: string, shopId: string | null): Promise<Map<string, PlateFacts>> {
    const recipes = await this.prisma.recipe.findMany({
      where: { tenantId },
      include: {
        ingredients: { include: { ingredient: { select: { id: true, name: true, unit: true, costPrice: true } } } },
        menuItem: { select: { id: true, productId: true } },
      },
    });
    const stock = await stockOf(this.prisma, tenantId, shopId, recipes.flatMap((r) => r.ingredients.map((i) => i.ingredientProductId)));

    const out = new Map<string, PlateFacts>();
    for (const r of recipes) {
      const portions = r.yieldQuantity || 1;
      let canMake = Infinity;
      let blocker: Shortage | null = null;
      const missing: Shortage[] = [];
      const unitProblems: string[] = [];
      let cost = 0;
      for (const ing of r.ingredients) {
        const stockUnit = ing.ingredient?.unit;
        const name = ing.ingredient?.name ?? 'Saamaan';
        if (!unitsCompatible(ing.unit, stockUnit)) unitProblems.push(name);
        // Per plate, in the unit the ingredient is stocked in.
        const need = round3(convertQty(withWastage(Number(ing.quantity) || 0, ing.wastagePercent) / portions, ing.unit, stockUnit));
        if (!ing.isOptional) cost += need * (ing.ingredient?.costPrice || ing.costPerUnit || 0);
        // An optional line does not stop the dish.
        if (ing.isOptional || need <= 0) continue;
        const have = stock.get(ing.ingredientProductId) ?? 0;
        const plates = Math.max(0, Math.floor(have / need));
        const row = { name, have: round3(have), need, unit: stockUnit || ing.unit || '' };
        if (plates < canMake) { canMake = plates; blocker = row; }
        if (plates <= 0) missing.push(row);
      }
      out.set(r.menuItem.productId, {
        recipeId: r.id,
        menuItemId: r.menuItemId,
        productId: r.menuItem.productId,
        plateCost: round2(cost),
        canMake: Number.isFinite(canMake) ? canMake : null,
        blocker,
        missing,
        ingredientCount: r.ingredients.length,
        unitProblems,
      });
    }
    return out;
  }

  /*
   * Which dish can still be made, and how many plates. In a rush the kitchen
   * calling "finished" means sending an order back; knowing that biryani has
   * four plates left lets the counter take it off the menu or buy stock first.
   */
  async cookability(user: AuthenticatedUser, shopId: string | null = null) {
    const [facts, off] = await Promise.all([
      this.plateFacts(user.tenantId, shopId),
      menuBranch(this.prisma, user.tenantId, shopId).then((b) => offAtBranch(this.prisma, user.tenantId, b)),
    ]);
    const items = await this.prisma.restaurantMenuItem.findMany({
      where: { tenantId: user.tenantId, productId: { in: [...facts.keys()] } },
      select: {
        id: true, isAvailable: true, prepTimeMinutes: true, totalOrdered: true,
        product: { select: { id: true, name: true, price: true, unit: true } },
      },
    });

    const rows = items.map((m) => {
      const f = facts.get(m.product.id)!;
      const price = Number(m.product.price ?? 0);
      const cost = f.plateCost;
      return {
        recipeId: f.recipeId,
        menuItemId: m.id,
        productId: m.product.id,
        name: m.product.name,
        /** On the menu and not "86" at this branch. */
        isAvailable: m.isAvailable && !off.has(m.id),
        offHere: m.isAvailable && off.has(m.id),
        offUntil: off.get(m.id) ?? null,
        prepTimeMinutes: m.prepTimeMinutes ?? null,
        totalOrdered: m.totalOrdered ?? 0,
        price,
        /** Cost of one plate at today's ingredient rates. */
        cost,
        // Food cost %: 30–35% is usual; above 45% the rate or the recipe needs a look.
        foodCostPct: price > 0 ? round2((cost / price) * 100) : 0,
        profit: round2(price - cost),
        canMake: f.canMake,
        blocker: f.blocker,
        missing: f.missing,
        ingredientCount: f.ingredientCount,
        unitProblems: f.unitProblems,
      };
    });

    rows.sort((a, b) => (a.canMake ?? 9e9) - (b.canMake ?? 9e9) || a.name.localeCompare(b.name));
    const withoutRecipe = await this.prisma.restaurantMenuItem.count({
      where: { tenantId: user.tenantId, recipe: { is: null }, product: { isActive: true, isRawMaterial: false } },
    });

    return {
      rows,
      outOfStock: rows.filter((r) => r.canMake === 0).length,
      running: rows.filter((r) => r.canMake !== null && r.canMake > 0 && r.canMake <= 5).length,
      withoutRecipe,
    };
  }

  /** Every recipe with its dish, for the recipes page. */
  async list(user: AuthenticatedUser) {
    return this.prisma.recipe.findMany({
      where: { tenantId: user.tenantId },
      include: {
        ...RECIPE_INCLUDE,
        menuItem: {
          select: {
            id: true, isAvailable: true, productId: true,
            product: { select: { id: true, name: true, price: true, isActive: true, category: { select: { id: true, name: true, color: true } }, images: { take: 1, orderBy: { sortOrder: 'asc' }, select: { url: true } } } },
          },
        },
      },
      orderBy: { updatedAt: 'desc' },
    });
  }

  /**
   * Raw material taken by recipes over the last `days` business days, next to
   * what was bought and what is left, so the owner can see where stock goes.
   */
  async usage(user: AuthenticatedUser, shopId: string | null, days: number) {
    const { tz, dayStartHour } = await this.clock.clock(user.tenantId);
    const since = subDaysTz(startOfBusinessDayTz(new Date(), tz, dayStartHour), Math.max(days, 1) - 1, tz);
    const shop = shopId ? { shopId } : {};

    const [used, bought] = await Promise.all([
      this.prisma.stockMovement.groupBy({
        by: ['productId'],
        where: { tenantId: user.tenantId, ...shop, type: 'ADJUSTMENT_OUT', reference: { startsWith: 'Recipe:' }, createdAt: { gte: since } },
        _sum: { quantity: true },
        _count: { _all: true },
      }),
      this.prisma.stockMovement.groupBy({
        by: ['productId'],
        where: { tenantId: user.tenantId, ...shop, type: 'PURCHASE_IN', createdAt: { gte: since } },
        _sum: { quantity: true },
      }),
    ]);
    const ids = [...new Set([...used.map((u) => u.productId), ...bought.map((b) => b.productId)])];
    const [products, stock] = await Promise.all([
      this.prisma.product.findMany({ where: { tenantId: user.tenantId, id: { in: ids } }, select: { id: true, name: true, unit: true, costPrice: true, lowStockAlert: true } }),
      stockOf(this.prisma, user.tenantId, shopId, ids),
    ]);
    const boughtBy = new Map(bought.map((b) => [b.productId, Math.abs(Number(b._sum.quantity ?? 0))]));
    const usedBy = new Map(used.map((u) => [u.productId, { qty: Math.abs(Number(u._sum.quantity ?? 0)), moves: u._count._all }]));

    const rows = products.map((p) => {
      const u = usedBy.get(p.id);
      const usedQty = round3(u?.qty ?? 0);
      const have = round3(stock.get(p.id) ?? 0);
      const perDay = usedQty / Math.max(days, 1);
      return {
        productId: p.id,
        name: p.name,
        unit: p.unit,
        used: usedQty,
        usedValue: round2(usedQty * (p.costPrice || 0)),
        bought: round3(boughtBy.get(p.id) ?? 0),
        stock: have,
        lowStockAlert: p.lowStockAlert,
        perDay: round3(perDay),
        daysLeft: perDay > 0 ? Math.max(0, Math.floor(have / perDay)) : null,
        moves: u?.moves ?? 0,
      };
    }).sort((a, b) => b.usedValue - a.usedValue || a.name.localeCompare(b.name));

    return {
      days,
      since,
      rows,
      totals: {
        usedValue: round2(rows.reduce((s, r) => s + r.usedValue, 0)),
        items: rows.filter((r) => r.used > 0).length,
        runningOut: rows.filter((r) => r.daysLeft !== null && r.daysLeft <= 2).length,
      },
    };
  }
}
