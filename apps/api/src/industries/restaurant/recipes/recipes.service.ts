import { BadRequestException, Injectable, NotFoundException } from '@nestjs/common';
import { PrismaService } from '../../../prisma/prisma.service';
import { AuthenticatedUser } from '../../../modules/auth/interfaces/jwt-payload.interface';
import { UpsertRecipeDto } from './dto/upsert-recipe.dto';
import { applyStockDelta } from '../../../common/shop-scope';
import { convertQty, round2, round3 } from './recipe-units';

/** One order line to cook. */
export interface CookLine {
  id: string;
  productId: string;
  quantity: number;
}

@Injectable()
export class RecipesService {
  constructor(private readonly prisma: PrismaService) {}

  private async computeCost(user: AuthenticatedUser, ingredients: UpsertRecipeDto['ingredients']) {
    const ids = [...new Set(ingredients.map((i) => i.ingredientProductId))];
    const products = await this.prisma.product.findMany({
      where: { id: { in: ids }, tenantId: user.tenantId },
      select: { id: true, costPrice: true, unit: true },
    });
    if (products.length !== ids.length) throw new NotFoundException('Ek ya zyada ingredient nahi mile');
    const byId = new Map(products.map((p) => [p.id, p]));

    let total = 0;
    const enriched = [] as any[];
    for (const ing of ingredients) {
      const product = byId.get(ing.ingredientProductId)!;
      // Cost is per unit of the stocked ingredient; the line may use a smaller unit.
      const costPer = ing.costPerUnit || product.costPrice || 0;
      const lineTotal = round2(costPer * convertQty(ing.quantity, ing.unit, product.unit));
      if (!ing.isOptional) total += lineTotal;
      enriched.push({ ...ing, costPerUnit: costPer, totalCost: lineTotal });
    }
    return { total: round2(total), enriched };
  }

  /** Keep the dish's cost price equal to its recipe cost per portion, so profit reports see food cost. */
  private async syncDishCost(menuItemId: string, total: number, yieldQuantity: number) {
    if (!(total > 0)) return;
    const item = await this.prisma.restaurantMenuItem.findUnique({ where: { id: menuItemId }, select: { productId: true } });
    if (!item) return;
    await this.prisma.product.update({
      where: { id: item.productId },
      data: { costPrice: round2(total / (yieldQuantity || 1)) },
    });
  }

  async upsert(user: AuthenticatedUser, dto: UpsertRecipeDto) {
    const menuItem = await this.prisma.restaurantMenuItem.findFirst({ where: { id: dto.menuItemId, tenantId: user.tenantId } });
    if (!menuItem) throw new NotFoundException('Menu item not found');
    if (!dto.ingredients?.length) throw new BadRequestException('At least one ingredient required');

    const { total, enriched } = await this.computeCost(user, dto.ingredients);
    const existing = await this.prisma.recipe.findUnique({ where: { menuItemId: dto.menuItemId } });

    if (existing) {
      await this.prisma.recipeIngredient.deleteMany({ where: { recipeId: existing.id } });
      const updated = await this.prisma.recipe.update({
        where: { menuItemId: dto.menuItemId },
        data: {
          yieldQuantity: dto.yieldQuantity ?? existing.yieldQuantity,
          yieldUnit: dto.yieldUnit ?? existing.yieldUnit,
          preparationSteps: dto.preparationSteps,
          cookingTime: dto.cookingTime,
          totalCost: total,
          ingredients: {
            create: enriched.map((e: any, idx: number) => ({
              ingredientProductId: e.ingredientProductId,
              quantity: e.quantity,
              unit: e.unit,
              costPerUnit: e.costPerUnit,
              totalCost: e.totalCost,
              isOptional: e.isOptional ?? false,
              notes: e.notes,
              displayOrder: e.displayOrder ?? idx,
            })),
          },
        },
        include: { ingredients: { include: { ingredient: true } } },
      });
      await this.syncDishCost(dto.menuItemId, total, updated.yieldQuantity);
      return updated;
    }
    const created = await this.prisma.recipe.create({
      data: {
        tenantId: user.tenantId,
        menuItemId: dto.menuItemId,
        yieldQuantity: dto.yieldQuantity ?? 1,
        yieldUnit: dto.yieldUnit ?? 'portion',
        preparationSteps: dto.preparationSteps,
        cookingTime: dto.cookingTime,
        totalCost: total,
        ingredients: {
          create: enriched.map((e: any, idx: number) => ({
            ingredientProductId: e.ingredientProductId,
            quantity: e.quantity,
            unit: e.unit,
            costPerUnit: e.costPerUnit,
            totalCost: e.totalCost,
            isOptional: e.isOptional ?? false,
            notes: e.notes,
            displayOrder: e.displayOrder ?? idx,
          })),
        },
      },
      include: { ingredients: { include: { ingredient: true } } },
    });
    await this.syncDishCost(dto.menuItemId, total, created.yieldQuantity);
    return created;
  }

  /**
   * Re-cost the recipes of the given dishes at today's ingredient rates and
   * keep each dish's cost price in step, so the bill's cost of goods follows
   * ingredient prices (chicken, oil) as they change between purchases.
   */
  async refreshDishCosts(tenantId: string, productIds: string[]) {
    if (!productIds.length) return;
    const recipes = await this.prisma.recipe.findMany({
      where: { tenantId, menuItem: { productId: { in: productIds } } },
      include: {
        ingredients: { include: { ingredient: { select: { costPrice: true, unit: true } } } },
        menuItem: { select: { productId: true, product: { select: { costPrice: true } } } },
      },
    });
    for (const r of recipes) {
      let total = 0;
      for (const ing of r.ingredients) {
        if (ing.isOptional) continue;
        const rate = ing.ingredient?.costPrice || ing.costPerUnit || 0;
        total += rate * convertQty(ing.quantity, ing.unit, ing.ingredient?.unit);
      }
      total = round2(total);
      if (!(total > 0)) continue;
      const perPlate = round2(total / (r.yieldQuantity || 1));
      if (Math.abs(perPlate - (r.menuItem.product?.costPrice ?? 0)) < 0.01 && Math.abs(total - r.totalCost) < 0.01) continue;
      await this.prisma.$transaction([
        this.prisma.recipe.update({ where: { id: r.id }, data: { totalCost: total } }),
        this.prisma.product.update({ where: { id: r.menuItem.productId }, data: { costPrice: perPlate } }),
      ]);
    }
  }

  async getByMenuItem(user: AuthenticatedUser, menuItemId: string) {
    return this.prisma.recipe.findFirst({
      where: { tenantId: user.tenantId, menuItemId },
      include: { ingredients: { include: { ingredient: true }, orderBy: { displayOrder: 'asc' } } },
    });
  }

  async remove(user: AuthenticatedUser, id: string) {
    const r = await this.prisma.recipe.findFirst({ where: { id, tenantId: user.tenantId } });
    if (!r) throw new NotFoundException('Recipe not found');
    return this.prisma.recipe.delete({ where: { id } });
  }

  /**
   * Take the ingredients of the given order lines out of the branch stock.
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
    const recipes = await this.prisma.recipe.findMany({
      where: { tenantId: user.tenantId, menuItem: { productId: { in: productIds } } },
      include: {
        ingredients: { include: { ingredient: { select: { id: true, name: true, unit: true } } } },
        menuItem: { select: { productId: true } },
      },
    });
    const byProduct = new Map(recipes.map((r) => [r.menuItem.productId, r]));
    const now = new Date();

    for (const line of lines) {
      const claimed = await this.prisma.restaurantOrderItem.updateMany({
        where: { id: line.id, cookingStartedAt: null },
        data: { cookingStartedAt: now },
      });
      if (!claimed.count) continue;
      const recipe = byProduct.get(line.productId);
      if (!recipe) continue;

      const factor = line.quantity / (recipe.yieldQuantity || 1);
      await this.prisma.$transaction(async (tx) => {
        for (const ing of recipe.ingredients) {
          if (ing.isOptional || !ing.ingredient) continue;
          const used = round3(convertQty(ing.quantity * factor, ing.unit, ing.ingredient.unit));
          if (!(used > 0)) continue;
          await applyStockDelta({
            tx,
            tenantId: user.tenantId,
            shopId,
            productId: ing.ingredientProductId,
            delta: -used,
            movementType: 'ADJUSTMENT_OUT',
            // Low-stock reads "Recipe:" movements as kitchen use.
            reference: `Recipe: ${orderNumber}`,
            note: `Kitchen use × ${line.quantity}`,
            userId: user.id,
          });
        }
      });
    }
  }

  /* ═══════════════════════════════════════════════════════════
     KITCHEN KI SAB SE AHEM REPORT
     ───────────────────────────────────────────────────────────
     Sawal ye nahi ke "kaunsa saamaan kam hai" — sawal ye hai ke
     "ab kaunsi dish nahi ban sakti".

     Rush me ye farq sab kuch hai. Grahak order deta hai, kitchen
     se awaz aati hai "khatam ho gaya", aur order wapas karna parta
     hai. Agar pehle hi pata ho ke biryani sirf 4 aur ban sakti hai,
     to menu se hata dein ya saamaan mangwa lein.

     Har recipe ke har ingredient ka stock dekh kar batate hain ke
     us dish ki kitni plate aur ban sakti hain, aur kaunsa ingredient
     rok raha hai.
     ═══════════════════════════════════════════════════════════ */
  async cookability(user: AuthenticatedUser) {
    const recipes = await this.prisma.recipe.findMany({
      where: { menuItem: { tenantId: user.tenantId } },
      include: {
        ingredients: {
          include: {
            ingredient: {
              select: { id: true, name: true, unit: true, stock: true, costPrice: true, lowStockAlert: true },
            },
          },
        },
        menuItem: {
          select: {
            id: true, isAvailable: true, prepTimeMinutes: true, totalOrdered: true,
            product: { select: { id: true, name: true, price: true, unit: true } },
          },
        },
      },
    });

    const rows = recipes.map((r) => {
      let canMake = Infinity;
      let blocker: { name: string; have: number; need: number; unit: string } | null = null;
      const missing: Array<{ name: string; have: number; need: number; unit: string }> = [];

      for (const ing of r.ingredients) {
        /* Jo cheez marzi ki hai us ke baghair bhi dish ban jati hai */
        if (ing.isOptional) continue;
        // Per plate, in the unit the ingredient is stocked in.
        const need = round3(convertQty((Number(ing.quantity) || 0) / (r.yieldQuantity || 1), ing.unit, ing.ingredient?.unit));
        if (need <= 0) continue;
        const have = Number(ing.ingredient?.stock ?? 0);
        const plates = Math.floor(have / need);
        if (plates < canMake) {
          canMake = plates;
          blocker = {
            name: ing.ingredient?.name ?? 'Saamaan',
            have, need, unit: ing.ingredient?.unit || ing.unit || '',
          };
        }
        if (plates <= 0) {
          missing.push({
            name: ing.ingredient?.name ?? 'Saamaan',
            have, need, unit: ing.ingredient?.unit || ing.unit || '',
          });
        }
      }

      const plates = Number.isFinite(canMake) ? canMake : null;
      const price = Number(r.menuItem?.product?.price ?? 0);
      const cost = Number(r.totalCost ?? 0);

      return {
        recipeId: r.id,
        menuItemId: r.menuItemId,
        productId: r.menuItem?.product?.id ?? null,
        name: r.menuItem?.product?.name ?? 'Dish',
        isAvailable: r.menuItem?.isAvailable ?? true,
        prepTimeMinutes: r.menuItem?.prepTimeMinutes ?? null,
        totalOrdered: r.menuItem?.totalOrdered ?? 0,
        price,
        cost,
        /* Food cost % — restaurant ki asal sehat ka paimana.
           30–35% aam hai; 45% se upar jaye to rate ya recipe me
           kuch theek karna parta hai. */
        foodCostPct: price > 0 ? (cost / price) * 100 : 0,
        profit: price - cost,
        /** Kitni plate aur ban sakti hain — null matlab recipe khali hai */
        canMake: plates,
        /** Jo ingredient sab se pehle rok raha hai */
        blocker,
        /** Jo bilkul khatam hain */
        missing,
        ingredientCount: r.ingredients.length,
      };
    });

    rows.sort((a, b) => (a.canMake ?? 9e9) - (b.canMake ?? 9e9));
    const withoutRecipe = await this.prisma.restaurantMenuItem.count({
      where: { tenantId: user.tenantId, recipe: { is: null } },
    });

    return {
      rows,
      /* Jo ab bilkul nahi ban sakti — menu se hata dein */
      outOfStock: rows.filter((r) => r.canMake === 0).length,
      /* 5 se kam plate bachi hain */
      running: rows.filter((r) => r.canMake !== null && r.canMake > 0 && r.canMake <= 5).length,
      /* Jin par recipe hi nahi bani — un ka food cost pata hi nahi */
      withoutRecipe,
    };
  }
}
