import { BadRequestException, Injectable, NotFoundException } from '@nestjs/common';
import { PrismaService } from '../../../prisma/prisma.service';
import { AuthenticatedUser } from '../../../modules/auth/interfaces/jwt-payload.interface';

@Injectable()
export class IngredientsService {
  constructor(private readonly prisma: PrismaService) {}

  async create(user: AuthenticatedUser, dto: any) {
    const dup = await this.prisma.bakeryIngredient.findFirst({ where: { tenantId: user.tenantId, name: dto.name } });
    if (dup) throw new BadRequestException(`Ingredient "${dto.name}" already exists`);
    return this.prisma.bakeryIngredient.create({
      data: {
        tenantId: user.tenantId,
        ...dto,
        lastPurchaseDate: dto.lastPurchaseDate ? new Date(dto.lastPurchaseDate) : null,
      },
    });
  }

  async list(user: AuthenticatedUser, params: { category?: string; lowStock?: boolean; critical?: boolean; search?: string; active?: boolean }) {
    const items = await this.prisma.bakeryIngredient.findMany({
      where: {
        tenantId: user.tenantId,
        ...(params.active !== undefined && { isActive: params.active }),
        ...(params.category && { category: params.category }),
        ...(params.critical !== undefined && { isCritical: params.critical }),
        ...(params.search && {
          OR: [
            { name: { contains: params.search, mode: 'insensitive' } },
            { code: { contains: params.search, mode: 'insensitive' } },
            { brand: { contains: params.search, mode: 'insensitive' } },
          ],
        }),
      },
      orderBy: [{ isCritical: 'desc' }, { name: 'asc' }],
      take: 300,
    });

    if (params.lowStock) {
      return items.filter((i) => i.currentStock <= i.minStock);
    }
    return items;
  }

  async getOne(user: AuthenticatedUser, id: string) {
    const i = await this.prisma.bakeryIngredient.findFirst({
      where: { id, tenantId: user.tenantId },
      include: { transactions: { orderBy: { createdAt: 'desc' }, take: 20 } },
    });
    if (!i) throw new NotFoundException('Ingredient not found');
    return i;
  }

  async update(user: AuthenticatedUser, id: string, dto: any) {
    const i = await this.prisma.bakeryIngredient.findFirst({ where: { id, tenantId: user.tenantId } });
    if (!i) throw new NotFoundException('Ingredient not found');
    return this.prisma.bakeryIngredient.update({
      where: { id },
      data: {
        ...dto,
        lastPurchaseDate: dto.lastPurchaseDate ? new Date(dto.lastPurchaseDate) : undefined,
      },
    });
  }

  async remove(user: AuthenticatedUser, id: string) {
    return this.prisma.bakeryIngredient.update({ where: { id }, data: { isActive: false } });
  }

  async recordPurchase(user: AuthenticatedUser, id: string, dto: { quantity: number; costPerUnit: number; vendorName?: string; notes?: string }) {
    const i = await this.prisma.bakeryIngredient.findFirst({ where: { id, tenantId: user.tenantId } });
    if (!i) throw new NotFoundException('Ingredient not found');

    const totalCost = dto.quantity * dto.costPerUnit;

    return this.prisma.$transaction(async (tx) => {
      await tx.bakeryIngredientTransaction.create({
        data: {
          tenantId: user.tenantId,
          ingredientId: id,
          transactionType: 'PURCHASE',
          quantity: dto.quantity,
          unit: i.unit,
          costPerUnit: dto.costPerUnit,
          totalCost,
          notes: dto.notes,
          performedById: user.id,
        },
      });

      return tx.bakeryIngredient.update({
        where: { id },
        data: {
          currentStock: i.currentStock + dto.quantity,
          totalPurchased: i.totalPurchased + dto.quantity,
          costPerUnit: dto.costPerUnit,
          lastPurchaseDate: new Date(),
          lastPurchasePrice: totalCost,
          lastVendorName: dto.vendorName,
        },
      });
    });
  }

  async recordConsumption(user: AuthenticatedUser, id: string, dto: { quantity: number; productionItemId?: string; cakeOrderId?: string; batchNumber?: string; notes?: string }) {
    const i = await this.prisma.bakeryIngredient.findFirst({ where: { id, tenantId: user.tenantId } });
    if (!i) throw new NotFoundException('Ingredient not found');
    if (i.currentStock < dto.quantity) throw new BadRequestException('Insufficient stock');

    return this.prisma.$transaction(async (tx) => {
      await tx.bakeryIngredientTransaction.create({
        data: {
          tenantId: user.tenantId,
          ingredientId: id,
          transactionType: 'CONSUMPTION',
          quantity: dto.quantity,
          unit: i.unit,
          costPerUnit: i.costPerUnit,
          totalCost: dto.quantity * i.costPerUnit,
          productionItemId: dto.productionItemId,
          cakeOrderId: dto.cakeOrderId,
          batchNumber: dto.batchNumber,
          notes: dto.notes,
          performedById: user.id,
        },
      });

      return tx.bakeryIngredient.update({
        where: { id },
        data: {
          currentStock: i.currentStock - dto.quantity,
          totalConsumed: i.totalConsumed + dto.quantity,
        },
      });
    });
  }

  async recordWaste(user: AuthenticatedUser, id: string, dto: { quantity: number; reason: string }) {
    const i = await this.prisma.bakeryIngredient.findFirst({ where: { id, tenantId: user.tenantId } });
    if (!i) throw new NotFoundException('Ingredient not found');

    return this.prisma.$transaction(async (tx) => {
      await tx.bakeryIngredientTransaction.create({
        data: {
          tenantId: user.tenantId,
          ingredientId: id,
          transactionType: 'WASTE',
          quantity: dto.quantity,
          unit: i.unit,
          costPerUnit: i.costPerUnit,
          totalCost: dto.quantity * i.costPerUnit,
          reason: dto.reason,
          performedById: user.id,
        },
      });

      return tx.bakeryIngredient.update({
        where: { id },
        data: {
          currentStock: Math.max(i.currentStock - dto.quantity, 0),
          totalWasted: i.totalWasted + dto.quantity,
        },
      });
    });
  }

  async adjustStock(user: AuthenticatedUser, id: string, dto: { newStock: number; reason: string }) {
    const i = await this.prisma.bakeryIngredient.findFirst({ where: { id, tenantId: user.tenantId } });
    if (!i) throw new NotFoundException('Ingredient not found');

    const diff = dto.newStock - i.currentStock;

    return this.prisma.$transaction(async (tx) => {
      await tx.bakeryIngredientTransaction.create({
        data: {
          tenantId: user.tenantId,
          ingredientId: id,
          transactionType: 'ADJUSTMENT',
          quantity: diff,
          unit: i.unit,
          costPerUnit: i.costPerUnit,
          reason: dto.reason,
          performedById: user.id,
        },
      });

      return tx.bakeryIngredient.update({
        where: { id },
        data: { currentStock: dto.newStock },
      });
    });
  }

  async transactions(user: AuthenticatedUser, id: string) {
    return this.prisma.bakeryIngredientTransaction.findMany({
      where: { tenantId: user.tenantId, ingredientId: id },
      orderBy: { createdAt: 'desc' },
      take: 100,
    });
  }

  async lowStockAlert(user: AuthenticatedUser) {
    const all = await this.prisma.bakeryIngredient.findMany({
      where: { tenantId: user.tenantId, isActive: true },
    });
    return all.filter((i) => i.currentStock <= i.minStock);
  }
}
