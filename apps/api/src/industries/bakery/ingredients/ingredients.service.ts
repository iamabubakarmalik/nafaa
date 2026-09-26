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

  /**
   * Saamaan aaya — stock BHI barhta hai aur paisa BHI darj hota hai.
   *
   * Pehle ye sirf ingredient ka stock barhata tha. Na `Expense` banta
   * tha, na supplier ka khata chalta tha — yani 50,000 ka maida
   * khareedne par wo paisa kitaab se ghayab ho jata tha. Cash register
   * me nazar nahi aata, Money page me nahi, aur munafa ghalat nikalta.
   *
   * `Purchase` me nahi daal sakte: `PurchaseItem.productId` lazmi hai
   * aur Product se juda hai, jabke ingredient Product hai hi nahi. Is
   * liye paisa do raaston se jata hai:
   *
   *   • Jo abhi diya  → Expense (cash register khud ghata deta hai)
   *   • Jo udhaar hai  → supplier ka khata barh jata hai
   */
  async recordPurchase(user: AuthenticatedUser, id: string, dto: {
    quantity: number; costPerUnit: number;
    vendorName?: string; notes?: string;
    supplierId?: string;
    paymentMethod?: string;
    /** Kitna abhi diya — na bataya jaye to poora */
    paidAmount?: number;
    shopId?: string;
  }) {
    const i = await this.prisma.bakeryIngredient.findFirst({ where: { id, tenantId: user.tenantId } });
    if (!i) throw new NotFoundException('Ingredient not found');

    const qty = Number(dto.quantity) || 0;
    const rate = Number(dto.costPerUnit) || 0;
    if (qty <= 0) throw new BadRequestException('Kitna aaya — tadaad likhein');

    const totalCost = qty * rate;
    const paid = dto.paidAmount === undefined || dto.paidAmount === null
      ? totalCost
      : Math.max(Number(dto.paidAmount) || 0, 0);
    const credit = Math.max(totalCost - paid, 0);

    if (paid > totalCost) {
      throw new BadRequestException('Diya hua paisa kul rakam se zyada nahi ho sakta');
    }

    /* Udhaar ke liye supplier lazmi — warna baad me pata hi nahi
       chalega ke kis ko dena hai. */
    let supplier: { id: string; outstandingDue: number } | null = null;
    if (dto.supplierId) {
      const s = await this.prisma.supplier.findFirst({
        where: { id: dto.supplierId, tenantId: user.tenantId },
        select: { id: true, outstandingDue: true },
      });
      if (!s) throw new NotFoundException('Supplier nahi mila');
      supplier = s;
    }
    if (credit > 0 && !supplier) {
      throw new BadRequestException('Udhaar par lena hai to supplier chunna zaroori hai');
    }

    return this.prisma.$transaction(async (tx) => {
      await tx.bakeryIngredientTransaction.create({
        data: {
          tenantId: user.tenantId,
          ingredientId: id,
          transactionType: 'PURCHASE',
          quantity: qty,
          unit: i.unit,
          costPerUnit: rate,
          totalCost,
          notes: dto.notes,
          performedById: user.id,
        },
      });

      /* ── Jo abhi diya — kharch me ──
         Cash register `Expense` ko CASH wale paymentMethod par khud
         ghata deta hai, is liye alag se kuch karne ki zaroorat nahi.
         shopId zaroori hai: register usi dukaan ka kharch ginta hai. */
      if (paid > 0) {
        await tx.expense.create({
          data: {
            tenantId: user.tenantId,
            shopId: dto.shopId ?? undefined,
            createdById: user.id,
            expenseNumber: `EXP-${Date.now().toString().slice(-8)}`,
            title: `Saamaan: ${i.name}`,
            description: `${qty} ${i.unit} × ${rate}`
              + (dto.vendorName ? ` — ${dto.vendorName}` : '')
              + (credit > 0 ? ` (${credit} udhaar)` : ''),
            amount: paid,
            paymentMethod: (dto.paymentMethod as any) ?? 'CASH',
            status: 'PAID',
          },
        });
      }

      /* ── Jo udhaar raha — supplier ka khata ── */
      if (credit > 0 && supplier) {
        const balanceAfter = Number(supplier.outstandingDue) + credit;
        await tx.supplierLedger.create({
          data: {
            tenantId: user.tenantId,
            supplierId: supplier.id,
            createdById: user.id,
            shopId: dto.shopId ?? undefined,
            type: 'PURCHASE_CREDIT',
            amount: credit,
            balanceAfter,
            note: `Saamaan udhaar: ${i.name} — ${qty} ${i.unit}`,
          },
        });
        await tx.supplier.update({
          where: { id: supplier.id },
          data: { outstandingDue: balanceAfter, totalPurchased: { increment: totalCost } },
        });
      }

      return tx.bakeryIngredient.update({
        where: { id },
        data: {
          currentStock: i.currentStock + qty,
          totalPurchased: i.totalPurchased + qty,
          costPerUnit: rate,
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
