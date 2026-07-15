import { BadRequestException, Injectable, NotFoundException } from '@nestjs/common';
import { PrismaService } from '../../../../prisma/prisma.service';
import { AuthenticatedUser } from '../../../auth/interfaces/jwt-payload.interface';
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
}
