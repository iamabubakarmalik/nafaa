import { BadRequestException, Injectable, NotFoundException } from '@nestjs/common';
import { PrismaService } from '../../../prisma/prisma.service';
import { AuthenticatedUser } from '../../../modules/auth/interfaces/jwt-payload.interface';
import { UpsertRecipeDto } from './dto/upsert-recipe.dto';

@Injectable()
export class RecipesService {
  constructor(private readonly prisma: PrismaService) {}

  private async computeCost(user: AuthenticatedUser, ingredients: UpsertRecipeDto['ingredients']) {
    let total = 0;
    const enriched = [] as any[];
    for (const ing of ingredients) {
      let costPer = ing.costPerUnit ?? 0;
      if (!costPer) {
        const product = await this.prisma.product.findFirst({ where: { id: ing.ingredientProductId, tenantId: user.tenantId } });
        costPer = product?.costPrice ?? 0;
      }
      const lineTotal = costPer * ing.quantity;
      total += lineTotal;
      enriched.push({ ...ing, costPerUnit: costPer, totalCost: lineTotal });
    }
    return { total, enriched };
  }

  async upsert(user: AuthenticatedUser, dto: UpsertRecipeDto) {
    const menuItem = await this.prisma.restaurantMenuItem.findFirst({ where: { id: dto.menuItemId, tenantId: user.tenantId } });
    if (!menuItem) throw new NotFoundException('Menu item not found');
    if (!dto.ingredients?.length) throw new BadRequestException('At least one ingredient required');

    const { total, enriched } = await this.computeCost(user, dto.ingredients);
    const existing = await this.prisma.recipe.findUnique({ where: { menuItemId: dto.menuItemId } });

    if (existing) {
      await this.prisma.recipeIngredient.deleteMany({ where: { recipeId: existing.id } });
      return this.prisma.recipe.update({
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
    }
    return this.prisma.recipe.create({
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
   * Called by orders service — deducts ingredient stock when a dish is prepared.
   */
  async deductIngredients(user: AuthenticatedUser, menuItemId: string, quantity: number) {
    const recipe = await this.prisma.recipe.findFirst({
      where: { tenantId: user.tenantId, menuItemId },
      include: { ingredients: true },
    });
    if (!recipe) return;

    const factor = quantity / (recipe.yieldQuantity || 1);
    for (const ing of recipe.ingredients) {
      if (ing.isOptional) continue;
      const usedQty = ing.quantity * factor;
      await this.prisma.product.update({
        where: { id: ing.ingredientProductId },
        data: { stock: { decrement: usedQty } },
      });
      await this.prisma.stockMovement.create({
        data: {
          tenantId: user.tenantId,
          productId: ing.ingredientProductId,
          type: 'ADJUSTMENT_OUT',
          quantity: -usedQty,
          balanceAfter: 0,
          reference: `Recipe: ${recipe.id}`,
          note: `Used in menu item ${menuItemId} × ${quantity}`,
        },
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
        const need = Number(ing.quantity) || 0;
        if (need <= 0) continue;
        const have = Number(ing.ingredient?.stock ?? 0);
        const plates = Math.floor(have / need);
        if (plates < canMake) {
          canMake = plates;
          blocker = {
            name: ing.ingredient?.name ?? 'Saamaan',
            have, need, unit: ing.unit || ing.ingredient?.unit || '',
          };
        }
        if (plates <= 0) {
          missing.push({
            name: ing.ingredient?.name ?? 'Saamaan',
            have, need, unit: ing.unit || ing.ingredient?.unit || '',
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

    return {
      rows,
      /* Jo ab bilkul nahi ban sakti — menu se hata dein */
      outOfStock: rows.filter((r) => r.canMake === 0).length,
      /* 5 se kam plate bachi hain */
      running: rows.filter((r) => r.canMake !== null && r.canMake > 0 && r.canMake <= 5).length,
      /* Jin par recipe hi nahi bani — un ka food cost pata hi nahi */
      withoutRecipe: 0,
    };
  }
}
