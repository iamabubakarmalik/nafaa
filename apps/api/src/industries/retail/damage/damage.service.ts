import { BadRequestException, Injectable, NotFoundException } from '@nestjs/common';
import { PrismaService } from '../../../prisma/prisma.service';
import { AuthenticatedUser } from '../../../modules/auth/interfaces/jwt-payload.interface';
import { CreateDamageDto } from './dto/create-damage.dto';

@Injectable()
export class DamageService {
  constructor(private readonly prisma: PrismaService) {}

  async create(user: AuthenticatedUser, dto: CreateDamageDto) {
    const product = await this.prisma.product.findFirst({
      where: { id: dto.productId, tenantId: user.tenantId },
    });
    if (!product) throw new NotFoundException('Product not found');

    // Calculate cost impact
    let unitCost = dto.unitCost ?? 0;
    if (!unitCost) {
      if (dto.variantId) {
        const variant = await this.prisma.productVariant.findUnique({
          where: { id: dto.variantId },
        });
        unitCost = variant?.costPrice ?? product.costPrice;
      } else {
        unitCost = product.costPrice;
      }
    }

    const costImpact = unitCost * dto.quantity;
    const salvageValue = dto.salvageValue ?? 0;
    const netLoss = Math.max(costImpact - salvageValue, 0);

    // Generate damage number
    const count = await this.prisma.damageLog.count({
      where: { tenantId: user.tenantId },
    });
    const year = new Date().getFullYear();
    const damageNumber = `DMG-${year}-${String(count + 1).padStart(4, '0')}`;

    return this.prisma.damageLog.create({
      data: {
        tenantId: user.tenantId,
        shopId: dto.shopId,
        productId: dto.productId,
        variantId: dto.variantId,
        batchId: dto.batchId,
        unitId: dto.unitId,
        reportedById: user.id,
        damageNumber,
        quantity: dto.quantity,
        unitCost,
        costImpact,
        salvageValue,
        netLoss,
        reason: dto.reason,
        reasonCode: dto.reasonCode ?? 'OTHER',
        photos: dto.photos ?? [],
        notes: dto.notes,
        supplierClaim: dto.supplierClaim ?? false,
        claimAmount: dto.claimAmount ?? 0,
        status: 'REPORTED',
      },
      include: {
        product: true,
        variant: true,
        batch: true,
      },
    });
  }

  async findAll(
    user: AuthenticatedUser,
    params: { status?: string; shopId?: string; reasonCode?: string; from?: string; to?: string },
  ) {
    return this.prisma.damageLog.findMany({
      where: {
        tenantId: user.tenantId,
        ...(params.status && { status: params.status as any }),
        ...(params.shopId && { shopId: params.shopId }),
        ...(params.reasonCode && { reasonCode: params.reasonCode as any }),
        ...(params.from || params.to
          ? {
              createdAt: {
                ...(params.from && { gte: new Date(params.from) }),
                ...(params.to && { lte: new Date(params.to) }),
              },
            }
          : {}),
      },
      include: {
        product: {
          include: { images: { where: { isPrimary: true }, take: 1 } },
        },
        variant: true,
        batch: true,
      },
      orderBy: { createdAt: 'desc' },
    });
  }

  async findOne(user: AuthenticatedUser, id: string) {
    const damage = await this.prisma.damageLog.findFirst({
      where: { id, tenantId: user.tenantId },
      include: {
        product: { include: { category: true, brand: true, images: true } },
        variant: true,
        batch: true,
      },
    });
    if (!damage) throw new NotFoundException('Damage log not found');
    return damage;
  }

  async approve(user: AuthenticatedUser, id: string, notes?: string) {
    const damage = await this.prisma.damageLog.findFirst({
      where: { id, tenantId: user.tenantId },
    });
    if (!damage) throw new NotFoundException('Damage log not found');
    if (damage.status !== 'REPORTED') {
      throw new BadRequestException(`Cannot approve — status is ${damage.status}`);
    }

    return this.prisma.$transaction(async (tx) => {
      // Adjust stock
      const stockAdjustment = await tx.stockAdjustment.create({
        data: {
          tenantId: user.tenantId,
          productId: damage.productId,
          variantId: damage.variantId,
          createdById: user.id,
          type: 'DAMAGE',
          quantity: -damage.quantity,
          reason: `Damage: ${damage.reason}`,
          note: `Damage log: ${damage.damageNumber}`,
        },
      });

      // Decrement product stock
      await tx.product.update({
        where: { id: damage.productId },
        data: { stock: { decrement: damage.quantity } },
      });

      if (damage.variantId) {
        await tx.productVariant.update({
          where: { id: damage.variantId },
          data: { stock: { decrement: damage.quantity } },
        });
      }

      if (damage.shopId) {
        const shopStock = await tx.shopStock.findFirst({
          where: {
            shopId: damage.shopId,
            productId: damage.productId,
            variantId: damage.variantId,
          },
        });
        if (shopStock) {
          await tx.shopStock.update({
            where: { id: shopStock.id },
            data: { stock: { decrement: damage.quantity } },
          });
        }
      }

      // Stock movement
      await tx.stockMovement.create({
        data: {
          tenantId: user.tenantId,
          productId: damage.productId,
          type: 'DAMAGE',
          quantity: -damage.quantity,
          balanceAfter: 0,
          reference: damage.damageNumber,
          note: damage.reason,
        },
      });

      return tx.damageLog.update({
        where: { id },
        data: {
          status: 'APPROVED',
          approvedById: user.id,
          approvedAt: new Date(),
          notes: notes ? `${damage.notes || ''}\n[Approved] ${notes}`.trim() : damage.notes,
        },
        include: { product: true, variant: true },
      });
    });
  }

  async reject(user: AuthenticatedUser, id: string, reason?: string) {
    const damage = await this.prisma.damageLog.findFirst({
      where: { id, tenantId: user.tenantId },
    });
    if (!damage) throw new NotFoundException('Damage log not found');
    if (damage.status !== 'REPORTED') {
      throw new BadRequestException(`Cannot reject — status is ${damage.status}`);
    }

    return this.prisma.damageLog.update({
      where: { id },
      data: {
        status: 'REJECTED',
        rejectedAt: new Date(),
        rejectionReason: reason,
      },
    });
  }

  async summary(user: AuthenticatedUser, params: { from?: string; to?: string }) {
    const where = {
      tenantId: user.tenantId,
      ...(params.from || params.to
        ? {
            createdAt: {
              ...(params.from && { gte: new Date(params.from) }),
              ...(params.to && { lte: new Date(params.to) }),
            },
          }
        : {}),
    };

    const [totalReported, totalApproved, byReason, totalLoss] = await Promise.all([
      this.prisma.damageLog.count({ where: { ...where, status: 'REPORTED' } }),
      this.prisma.damageLog.count({ where: { ...where, status: 'APPROVED' } }),
      this.prisma.damageLog.groupBy({
        by: ['reasonCode'],
        where,
        _sum: { netLoss: true, quantity: true },
        _count: { _all: true },
      }),
      this.prisma.damageLog.aggregate({
        where: { ...where, status: 'APPROVED' },
        _sum: { netLoss: true, costImpact: true, salvageValue: true },
      }),
    ]);

    return {
      totalReported,
      totalApproved,
      totalNetLoss: totalLoss._sum.netLoss ?? 0,
      totalCostImpact: totalLoss._sum.costImpact ?? 0,
      totalSalvageValue: totalLoss._sum.salvageValue ?? 0,
      byReason,
    };
  }
}
